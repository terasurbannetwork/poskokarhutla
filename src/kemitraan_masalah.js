/* Kemitraan Kampus: bank masalah, kunjungan pendataan, jawaban, koreksi profil (KM-C03). Skema: migrations/0081 (km_masalah, km_kunjungan, km_jawaban, km_koreksi) + km_jejak (0080).
   Rancangan: data/kajian-bnpb/kampus/DESAIN-TEKNIS.md §4.3, ALUR.md §2.3-§2.5, ALGORITMA.md §3.4-§3.5, KEAMANAN-PRIVASI.md §1 (baris Masalah, Jawaban+koreksi), RENCANA-UJI.md §2.4.
   - Hak: GET masalah ST/PM/KK/BP(kabnya); POST masalah ST/BP(kabnya); ambil/status/saran-gabung/kunjungan/koreksi-putus ST; jawaban dan koreksi: ST atau BP yang kodenya ada di `tim` kunjungan itu.
   - ALUR_MASALAH = trigger km_masalah_alur (0081): dicek di sini supaya jawabannya 409 yang jelas; trigger tetap penjaga terakhir. Tiap ubah menulis km_jejak.
   - Ambil masalah otomatis membekukan `bukti` dari public/data/kemitraan/daerah/<kab4>.json lewat env.ASSETS. Jawaban ber-auto_id mengambilnya sendiri bila belum diambil.
   - Jawaban idempoten per (kunjungan, klien_id) lewat ON CONFLICT DO NOTHING; seluruh larik divalidasi dulu, satu yang salah = seluruh kiriman ditolak (antrean luring tidak menelan setengah).
   - Konfirmasi: jawaban ya/sebagian pada pertanyaan berarah `konfirmasi` (pertanyaan.json) memajukan masalah `ditelaah` ke `tervalidasi` saat kunjungan selesai (ALUR §2.5.3).
   ponytail: lampiran masalah (<= 3 berkas, F-M4) dan kontak PIC belum ada (tak ada kolom/rute di DT); saran gabung memindai <= 500 masalah sekategori, pakai indeks bila lebih. */
import {json, gagal, acak, bacaBody, bersihTeks} from "./worker.js";
import {tx, num, tglSah} from "./posko.js";
import {laju, kodeBaru} from "./bnpb.js";
import {hakKm} from "./kemitraan.js";
import {jejak, kodeKab, izin, halaman} from "./kemitraan_akun.js";
import {skorBpbd, tokenTeks, jaccard} from "./kemitraan_hitung.js";

const JAM = 3600e3, HARI = 24 * JAM, TIM_UMUR = 14 * HARI, MAKS_BARIS = 2000;
const RE_ID = /^[0-9a-f]{16}$/, RE_KAB = /^\d{4}$/, RE_AUTO = /^auto-(\d{4})-([a-z_]+)-(A[1-9]|A10)$/, RE_KLIEN = /^[A-Za-z0-9._:-]{8,40}$/;
const BAHAYA = ["banjir", "longsor", "gempa", "tsunami", "gunungapi", "kekeringan", "karhutla", "cuaca_ekstrem", "abrasi_rob", "udara", "multi"];
const ASPEK = Array.from({length: 10}, (_, i) => "A" + (i + 1));
const STATUS = ["diajukan", "ditelaah", "tervalidasi", "digabung", "ditolak", "dicocokkan", "diambil", "berjalan", "selesai"];
const KELAS = ["P1", "P2", "P3"], SUMBER = ["otomatis", "bpbd", "unit", "lapangan"];
const KEBUTUHAN = ["kajian", "data_peta", "model_peringatan", "teknologi_tepat_guna", "pelatihan", "pendampingan_dokumen", "tenaga"];   // F-M4: tujuh pilihan
const NARASUMBER = ["bpbd", "bappeda", "pu", "dinkes", "dinsos", "kades", "warga", "usaha"], PILIHAN = ["ya", "sebagian", "tidak"];
const KE_ST = ["ditelaah", "tervalidasi", "ditolak", "digabung"];   // dicocokkan (KM-C08), diambil/berjalan/selesai (alur riset/pendampingan) bukan urusan rute ini
/* sama persis dengan trigger km_masalah_alur (migrations/0081); uji paritas mencoba semua 81 pasangan ke D1 */
export const ALUR_MASALAH = new Set(["diajukan>ditelaah", "diajukan>tervalidasi", "diajukan>ditolak", "diajukan>digabung", "ditelaah>tervalidasi", "ditelaah>ditolak", "ditelaah>digabung",
  "tervalidasi>dicocokkan", "dicocokkan>diambil", "tervalidasi>diambil", "diambil>berjalan", "berjalan>selesai", "ditolak>ditelaah"]);
const ALUR_KUNJUNGAN = new Set(["rencana>berjalan", "rencana>batal", "berjalan>selesai", "berjalan>batal"]);
const urai = s => { try { return JSON.parse(s); } catch (e) { return null; } };
const KOLOM_M = "id, kab4, prov, bahaya, aspek, sumber, auto_id, judul, uraian, dampak, kebutuhan, pernah, bukti, lampiran, nilai, skor, kelas, status, induk_id, pengaju, alasan, dibuat, diubah";
const staf = h => h.peran === "ST" || h.peran === "SA";
/* pengaju (pengenal pemegang kode/akun) hanya untuk staf */
const bentukM = (r, h) => { const o = {...r, kebutuhan: urai(r.kebutuhan), bukti: urai(r.bukti), lampiran: urai(r.lampiran), nilai: urai(r.nilai)}; if (!staf(h)) delete o.pengaju; return o; };
/* teks bebas dari pengguna: tx (NFC, tanpa kontrol, panjang) lalu bersihTeks Lapor Warga (buang tautan dan nomor HP, tolak kata kasar dan spam). {t} (null bila kosong) atau {galat} */
const bersihOpsi = (v, maks) => {
  const t = tx(v, maks); if (t === undefined) return {galat: `maksimal ${maks} karakter`};
  if (t === null) return {t: null};
  const r = bersihTeks(t, maks); return r.galat ? {galat: r.galat} : {t: r.teks || null};
};
const lj = (env, h, aksi, maks, kini) => laju(env, h.oleh, aksi, [[JAM, maks]], kini);
const oleh80 = h => h.oleh.slice(0, 80);

/* ---------------- aset statis (profil daerah, pertanyaan) ---------------- */
async function aset(env, url, jalur) {
  const r = env.ASSETS ? await env.ASSETS.fetch(new Request(new URL(jalur, url))) : null;
  if (!r?.ok) { r?.body?.cancel(); return null; }
  try { return await r.json(); } catch (e) { return null; }
}
const profilDaerah = (env, url, kab4) => aset(env, url, `/data/kemitraan/daerah/${kab4}.json`);
let PERTANYAAN = null;   // {semua, konfirmasi}: id templat di public/data/kemitraan/pertanyaan.json (semua yang bertulis `teks`) dan yang berarah `konfirmasi`
async function idPertanyaan(env, url) {
  if (PERTANYAAN) return PERTANYAAN;
  const p = await aset(env, url, "/data/kemitraan/pertanyaan.json"); if (!p) return null;
  const semua = new Set(), konfirmasi = new Set(), jalan = x => {
    if (Array.isArray(x)) x.forEach(jalan);
    else if (x && typeof x === "object") { if (typeof x.id === "string" && typeof x.teks === "string") { semua.add(x.id); if (x.arah === "konfirmasi") konfirmasi.add(x.id); } Object.values(x).forEach(jalan); }
  };
  jalan(p);
  return PERTANYAAN = {semua, konfirmasi};
}
const idKonfirmasi = async (env, url) => (await idPertanyaan(env, url))?.konfirmasi ?? null;

/* ================================================================ masalah */
async function daftarMasalah(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "PM", "KK"]); if (x) return x;   // KP §1 baris Masalah: BP hanya T (tulis) kabnya, tidak B
  const q = url.searchParams, w = ["dummy = 0"], p = [], f =(nama, kolom, ok) => {
    const v = q.get(nama); if (v === null) return null;
    if (!ok(v)) return gagal(400, `${nama} tidak sah`);
    w.push(`${kolom} = ?`); p.push(v); return null;
  };
  const salah = f("status", "status", v => STATUS.includes(v)) || f("b", "bahaya", v => BAHAYA.includes(v)) || f("a", "aspek", v => ASPEK.includes(v)) || f("kelas", "kelas", v => KELAS.includes(v)) || f("sumber", "sumber", v => SUMBER.includes(v)) || f("prov", "prov", v => /^\d{2}$/.test(v));
  if (salah) return salah;
  const kab = q.get("kab4");
  if (kab !== null && !RE_KAB.test(kab)) return gagal(400, "kab4 harus 4 digit");
  if (kab !== null) { w.push("kab4 = ?"); p.push(kab); }
  const {per, off, hal, r: rh} = halaman(url); if (rh) return rh;
  const lm = await lj(env, h, "kemitraan.baca", 300, kini); if (lm) return lm;
  const rs = await env.DB.prepare(`SELECT ${KOLOM_M} FROM km_masalah WHERE ${w.join(" AND ")} ORDER BY kelas IS NULL, kelas, skor IS NULL, skor DESC, dibuat DESC LIMIT ? OFFSET ?`).bind(...p, per, off).all();
  /* count(*) hanya bila perlu: halaman pertama yang tidak penuh sudah memuat semuanya */
  const total = hal === 1 && rs.results.length < per ? rs.results.length : (await env.DB.prepare(`SELECT count(*) n FROM km_masalah WHERE ${w.join(" AND ")}`).bind(...p).first()).n;
  return json({masalah: rs.results.map(r => bentukM(r, h)), total, hal, per});
}

async function ajukanMasalah(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "BP"]); if (x) return x;
  if (h.peran === "BP" && h.jenis !== "bpbd") return gagal(403, "kode tim pendataan hanya untuk mengisi jawaban dan koreksi kunjungannya");   // KP §1 + keputusan pengulas: tim_pendataan tidak mengajukan masalah
  const l = await lj(env, h, "kemitraan.masalah", 60, kini); if (l) return l;   // laju SEBELUM membaca body (hingga 64 KB)
  const b = await bacaBody(req, 65536); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, kab4 = h.peran === "BP" ? o.kab4 ?? h.kab4 : o.kab4;
  if (h.peran === "BP" && kab4 !== h.kab4) return gagal(403, "BPBD hanya boleh mengajukan masalah untuk kabupaten/kota sendiri");
  if (typeof kab4 !== "string" || !RE_KAB.test(kab4)) return gagal(400, "kab4 harus 4 digit kode kabupaten/kota");
  if (typeof o.bahaya !== "string" || !BAHAYA.includes(o.bahaya)) return gagal(400, `bahaya harus salah satu dari ${BAHAYA.join(", ")}`);
  if (typeof o.aspek !== "string" || !ASPEK.includes(o.aspek)) return gagal(400, "aspek harus A1 sampai A10");
  const bj = bersihOpsi(o.judul, 120), bu = bersihOpsi(o.uraian, 2000), dampak = bersihOpsi(o.dampak, 1000), pernah = bersihOpsi(o.pernah, 1000), keb = o.kebutuhan ?? null;
  if (bj.galat) return gagal(400, "judul: " + bj.galat);
  if (bu.galat) return gagal(400, "uraian: " + bu.galat);
  if (dampak.galat) return gagal(400, "dampak: " + dampak.galat);
  if (pernah.galat) return gagal(400, "yang pernah dicoba: " + pernah.galat);
  const judul = bj.t, uraian = bu.t;   // sesudah dibersihkan (nomor HP/tautan dibuang), batas bawah dicek lagi
  if (!judul || judul.length < 5) return gagal(400, "judul 5-120 karakter");
  if (!uraian || uraian.length < 50) return gagal(400, "uraian 50-2000 karakter");
  if (keb !== null && !(Array.isArray(keb) && keb.length <= KEBUTUHAN.length && keb.every(k => KEBUTUHAN.includes(k)) && new Set(keb).size === keb.length)) return gagal(400, `kebutuhan: pilih dari ${KEBUTUHAN.join(", ")}`);
  const sumber = h.peran === "BP" ? "bpbd" : o.sumber ?? "unit";
  if (sumber !== "unit" && sumber !== "lapangan" && sumber !== "bpbd") return gagal(400, "sumber harus unit atau lapangan");
  const kode = await kodeKab(env, url); if (!kode) return gagal(503, "daftar wilayah belum tersedia");
  if (!kode[kab4]) return gagal(400, "kab4 tidak dikenal");
  const id = acak(8);
  await env.DB.batch([env.DB.prepare(`INSERT INTO km_masalah (id, kab4, prov, bahaya, aspek, sumber, judul, uraian, dampak, kebutuhan, pernah, status, pengaju, dibuat, diubah) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'diajukan', ?, ?, ?)`)
      .bind(id, kab4, String(kode[kab4].prov).padStart(2, "0"), o.bahaya, o.aspek, sumber, judul, uraian, dampak.t, keb && JSON.stringify(keb), pernah.t, oleh80(h), kini, kini),
    jejak(env, "km_masalah", id, "ajukan", h.oleh, kini, {ke: "diajukan"})]);
  return json({ok: true, id, status: "diajukan"}, 201);
}

/* masalah otomatis -> baris km_masalah `ditelaah`, bukti dibekukan dari JSON hari itu. {id, baru} atau {s, galat} */
/* null bila autoId sudah diambil atau ada di profil daerah; selain itu {s, galat} (dipakai sebelum menulis apa pun) */
async function periksaAuto(env, url, autoId) {
  if (await env.DB.prepare("SELECT 1 FROM km_masalah WHERE auto_id = ? AND dummy = 0").bind(autoId).first()) return null;
  const m = RE_AUTO.exec(autoId); if (!m) return {s: 400, galat: "auto_id tidak sah"};
  const p = await profilDaerah(env, url, m[1]); if (!p) return {s: 404, galat: "profil daerah itu tidak ada"};
  return (p.masalah || []).some(z => z.auto_id === autoId) ? null : {s: 404, galat: "masalah otomatis itu tidak ada di profil daerah"};
}
async function ambilAuto(env, url, autoId, oleh, kini) {
  const cari = () => env.DB.prepare("SELECT id FROM km_masalah WHERE auto_id = ? AND dummy = 0").bind(autoId).first();
  const ada = await cari(); if (ada) return {id: ada.id, baru: false};
  const m = RE_AUTO.exec(autoId); if (!m) return {s: 400, galat: "auto_id tidak sah"};
  const p = await profilDaerah(env, url, m[1]); if (!p) return {s: 404, galat: "profil daerah itu tidak ada"};
  const a = (p.masalah || []).find(z => z.auto_id === autoId); if (!a) return {s: 404, galat: "masalah otomatis itu tidak ada di profil daerah"};
  const id = acak(8);
  try {
    await env.DB.batch([env.DB.prepare(`INSERT INTO km_masalah (id, kab4, prov, bahaya, aspek, sumber, auto_id, judul, bukti, skor, kelas, status, pengaju, dibuat, diubah) VALUES (?, ?, ?, ?, ?, 'otomatis', ?, ?, ?, ?, ?, 'ditelaah', ?, ?, ?)`)
        .bind(id, m[1], String(p.prov ?? m[1].slice(0, 2)).padStart(2, "0"), a.B, a.A, autoId, a.judul, a.bukti ? JSON.stringify(a.bukti) : null, a.skor ?? null, a.kelas ?? null, String(oleh).slice(0, 80), kini, kini),
      jejak(env, "km_masalah", id, "ambil", oleh, kini, {ke: "ditelaah", catatan: autoId})]);
  } catch (e) {
    if (!/UNIQUE/i.test(String(e?.message))) throw e;
    const t = await cari(); if (t) return {id: t.id, baru: false};
    throw e;
  }
  return {id, baru: true};
}
async function ambilMasalah(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST"]); if (x) return x;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.auto_id !== "string" || !RE_AUTO.test(b.o.auto_id)) return gagal(400, "auto_id tidak sah (contoh auto-6211-banjir-A1)");
  const l = await lj(env, h, "kemitraan.masalah", 60, kini); if (l) return l;
  const r = await ambilAuto(env, url, b.o.auto_id, h.oleh, kini);
  return r.galat ? gagal(r.s, r.galat) : r.baru ? json({ok: true, id: r.id, status: "ditelaah"}, 201) : gagal(409, "masalah otomatis itu sudah diambil");
}

function cekNilai(n) {
  if (!n || typeof n !== "object" || Array.isArray(n) || Object.keys(n).sort().join() !== "C,J,R,U") return null;
  return ["U", "C", "R", "J"].every(k => Number.isInteger(n[k]) && n[k] >= 0 && n[k] <= 3) ? {U: n.U, C: n.C, R: n.R, J: n.J} : null;
}
async function statusMasalah(env, req, url, kini, ctx, p) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST"]); if (x) return x;
  const l = await lj(env, h, "kemitraan.status", 300, kini); if (l) return l;   // laju SEBELUM SELECT dan pembacaan profil daerah
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, ke = o.ke;
  if (typeof ke !== "string" || !KE_ST.includes(ke)) return gagal(400, `ke harus salah satu dari ${KE_ST.join(", ")}`);
  const alasan = tx(o.alasan, 500);
  if (alasan === undefined) return gagal(400, "alasan maksimal 500 karakter");
  if (ke === "ditolak" && (!alasan || alasan.length < 5)) return gagal(400, "alasan penolakan wajib (5-500 karakter)");
  if (o.nilai != null && ke !== "tervalidasi") return gagal(400, "nilai U, C, R, J hanya dikirim saat tervalidasi");
  const nilai = ke === "tervalidasi" ? cekNilai(o.nilai) : null;
  if (ke === "tervalidasi" && !nilai) return gagal(400, "nilai wajib: objek {U, C, R, J}, tiap bilangan bulat 0-3");
  if (ke === "digabung" && (typeof o.induk_id !== "string" || !RE_ID.test(o.induk_id))) return gagal(400, "induk_id wajib (16 hex) untuk penggabungan");
  if (ke !== "digabung" && o.induk_id != null) return gagal(400, "induk_id hanya untuk penggabungan");
  const m = await env.DB.prepare("SELECT id, kab4, bahaya, aspek, status FROM km_masalah WHERE id = ? AND dummy = 0").bind(p.id).first();
  if (!m) return gagal(404, "masalah tidak ditemukan");
  if (!ALUR_MASALAH.has(`${m.status}>${ke}`)) return gagal(409, `status ${m.status} tidak bisa langsung menjadi ${ke}`);
  if (ke === "digabung") {
    if (o.induk_id === m.id) return gagal(400, "masalah tidak bisa digabung ke dirinya sendiri");
    const i = await env.DB.prepare("SELECT bahaya, aspek, status FROM km_masalah WHERE id = ? AND dummy = 0").bind(o.induk_id).first();
    if (!i) return gagal(404, "induk tidak ditemukan");
    if (i.bahaya !== m.bahaya || i.aspek !== m.aspek) return gagal(409, "induk harus sekategori (bahaya dan aspek sama)");
    if (i.status === "digabung" || i.status === "ditolak") return gagal(409, `induk berstatus ${i.status}`);
  }
  let skor = null, kelas = null;
  if (nilai) {
    let auto = null, HK = {};
    if (m.bahaya !== "multi") {
      const pr = await profilDaerah(env, url, m.kab4); if (!pr) return gagal(503, "profil daerah belum tersedia, skor belum bisa dihitung");
      const e = pr.masalah_skor?.[m.bahaya]; auto = e?.skor ?? null; HK = {H: e?.H ?? null, K: e?.K ?? null};
    }
    ({skor, kelas} = skorBpbd(nilai, auto, HK));
  }
  let u;
  try {
    [u] = await env.DB.batch([env.DB.prepare("UPDATE km_masalah SET status = ?, nilai = COALESCE(?, nilai), skor = COALESCE(?, skor), kelas = COALESCE(?, kelas), induk_id = COALESCE(?, induk_id), alasan = COALESCE(?, alasan), diubah = ? WHERE id = ? AND status = ?")
        .bind(ke, nilai && JSON.stringify(nilai), skor, kelas, o.induk_id ?? null, alasan, kini, m.id, m.status),
      jejak(env, "km_masalah", m.id, "status", h.oleh, kini, {dari: m.status, ke, catatan: alasan, jikaUbah: true})]);
  } catch (e) { if (/km_masalah_alur/.test(String(e?.message))) return gagal(409, "transisi status tidak sah"); throw e; }
  if (!u.meta.changes) return gagal(409, "status masalah sudah berubah; muat ulang");
  return json({ok: true, id: m.id, status: ke, skor, kelas});
}

/* saran penggabungan: sekategori (bahaya, aspek), Jaccard token judul+uraian >= 0.5 (ALG §3.5), induk yang disarankan = skor tertinggi */
async function saranGabung(env, req, url, kini, ctx, p) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST"]); if (x) return x;
  const m = await env.DB.prepare("SELECT id, bahaya, aspek, judul, uraian FROM km_masalah WHERE id = ? AND dummy = 0").bind(p.id).first();
  if (!m) return gagal(404, "masalah tidak ditemukan");
  const l = await lj(env, h, "kemitraan.baca", 300, kini); if (l) return l;
  const t = tokenTeks(`${m.judul} ${m.uraian ?? ""}`);
  const rs = await env.DB.prepare("SELECT id, kab4, judul, uraian, skor, kelas, status FROM km_masalah WHERE bahaya = ? AND aspek = ? AND id <> ? AND status NOT IN ('digabung', 'ditolak') AND dummy = 0 LIMIT 500").bind(m.bahaya, m.aspek, m.id).all();
  const saran = rs.results.map(r => ({id: r.id, kab4: r.kab4, judul: r.judul, skor: r.skor, kelas: r.kelas, status: r.status, jaccard: jaccard(t, tokenTeks(`${r.judul} ${r.uraian ?? ""}`))}))
    .filter(r => r.jaccard >= 0.5).sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1) || b.jaccard - a.jaccard).slice(0, 10);
  return json({saran});
}

/* ================================================================ kunjungan */
const timBP = (k, h) => h.peran === "BP" && h.kab4 === k.kab4 && (urai(k.tim) || []).some(t => t.kode_id === h.kode_id);
const bentukK = (k, h) => ({id: k.id, kab4: k.kab4, tanggal: k.tanggal, tim: (urai(k.tim) || []).map(t => staf(h) ? t : {nama: t.nama}), narasumber: urai(k.narasumber), status: k.status, dibuat: k.dibuat, diubah: k.diubah});
async function buatKunjungan(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST"]); if (x) return x;
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (typeof o.kab4 !== "string" || !RE_KAB.test(o.kab4)) return gagal(400, "kab4 harus 4 digit kode kabupaten/kota");
  if (typeof o.tanggal !== "string" || !tglSah(o.tanggal)) return gagal(400, "tanggal harus YYYY-MM-DD yang sah");
  if (!Array.isArray(o.narasumber) || !o.narasumber.length || !o.narasumber.every(n => NARASUMBER.includes(n)) || new Set(o.narasumber).size !== o.narasumber.length) return gagal(400, `narasumber: pilih 1 atau lebih dari ${NARASUMBER.join(", ")}`);
  if (!Array.isArray(o.tim) || o.tim.length < 1 || o.tim.length > 12) return gagal(400, "tim 1-12 orang");
  const tim = [];
  for (const t of o.tim) {
    const nama = t && typeof t === "object" ? tx(t.nama, 80) : null;
    if (!nama || nama.length < 2) return gagal(400, "nama anggota tim 2-80 karakter");
    tim.push({nama, lapangan: t.lapangan === true});
  }
  const kode = await kodeKab(env, url); if (!kode) return gagal(503, "daftar wilayah belum tersedia");
  if (!kode[o.kab4]) return gagal(400, "kab4 tidak dikenal");
  const l = await lj(env, h, "kemitraan.kunjungan", 60, kini); if (l) return l;
  const id = acak(8), stmt = [], keluar = [];
  for (const t of tim) {   // anggota non-staf: kode tim_pendataan 14 hari, hanya sha di D1, kode tampil sekali
    if (!t.lapangan) { t.kode_id = null; continue; }
    const k = await kodeBaru(), kid = acak(8); t.kode_id = kid;
    stmt.push(env.DB.prepare("INSERT INTO km_bpbd_kode (id, kode_sha, kab4, prov, nama, jenis, berlaku, dibuat, oleh) VALUES (?, ?, ?, ?, ?, 'tim_pendataan', ?, ?, ?)").bind(kid, k.kode_sha, o.kab4, String(kode[o.kab4].prov).padStart(2, "0"), t.nama, kini + TIM_UMUR, kini, oleh80(h)));
    stmt.push(jejak(env, "km_bpbd_kode", kid, "terbit", h.oleh, kini, {ke: o.kab4, catatan: "tim_pendataan kunjungan " + id}));
    keluar.push({nama: t.nama, kode: k.kode, tautan: `${url.origin}/kemitraan/saya#k=${k.kode}`, berlaku: kini + TIM_UMUR});
  }
  await env.DB.batch([env.DB.prepare("INSERT INTO km_kunjungan (id, kab4, tanggal, tim, narasumber, status, dibuat, diubah, oleh) VALUES (?, ?, ?, ?, ?, 'rencana', ?, ?, ?)")
      .bind(id, o.kab4, o.tanggal, JSON.stringify(tim.map(t => ({nama: t.nama, kode_id: t.kode_id}))), JSON.stringify(o.narasumber), kini, kini, oleh80(h)),
    jejak(env, "km_kunjungan", id, "rencana", h.oleh, kini, {ke: "rencana"}), ...stmt]);
  return json({ok: true, id, status: "rencana", tim_kode: keluar}, 201);
}
async function daftarKunjungan(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "PM", "BP"]); if (x) return x;
  const q = url.searchParams, kab = q.get("kab4"), st = q.get("status");
  if (kab !== null && !RE_KAB.test(kab)) return gagal(400, "kab4 harus 4 digit");
  if (st !== null && !["rencana", "berjalan", "selesai", "batal"].includes(st)) return gagal(400, "status tidak sah");
  if (h.peran === "BP" && kab !== null && kab !== h.kab4) return gagal(403, "kode ini hanya berlaku untuk kabupaten/kota sendiri");
  const k = h.peran === "BP" ? h.kab4 : kab, w = ["dummy = 0"], p = [];
  if (k) { w.push("kab4 = ?"); p.push(k); }
  if (st) { w.push("status = ?"); p.push(st); }
  if (h.peran === "BP") { w.push("EXISTS (SELECT 1 FROM json_each(km_kunjungan.tim) t WHERE json_extract(t.value, '$.kode_id') = ?)"); p.push(h.kode_id); }   // BP: hanya kunjungan yang timnya memuat kodenya, disaring SEBELUM LIMIT
  const {per, off, hal, r: rh} = halaman(url); if (rh) return rh;
  const l = await lj(env, h, "kemitraan.baca", 300, kini); if (l) return l;
  const rs = await env.DB.prepare(`SELECT id, kab4, tanggal, tim, narasumber, status, dibuat, diubah FROM km_kunjungan WHERE ${w.join(" AND ")} ORDER BY tanggal DESC, dibuat DESC LIMIT ? OFFSET ?`).bind(...p, per, off).all();
  const total = hal === 1 && rs.results.length < per ? rs.results.length : (await env.DB.prepare(`SELECT count(*) n FROM km_kunjungan WHERE ${w.join(" AND ")}`).bind(...p).first()).n;
  return json({kunjungan: rs.results.map(r => bentukK(r, h)), total, hal, per});
}
async function statusKunjungan(env, req, url, kini, ctx, p) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST"]); if (x) return x;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  if (!["berjalan", "selesai", "batal"].includes(b.o.ke)) return gagal(400, "ke harus berjalan, selesai, atau batal");
  const k = await env.DB.prepare("SELECT id, status FROM km_kunjungan WHERE id = ? AND dummy = 0").bind(p.id).first();
  if (!k) return gagal(404, "kunjungan tidak ditemukan");
  if (!ALUR_KUNJUNGAN.has(`${k.status}>${b.o.ke}`)) return gagal(409, `kunjungan ${k.status} tidak bisa menjadi ${b.o.ke}`);
  const l = await lj(env, h, "kemitraan.kunjungan", 60, kini); if (l) return l;
  const [u] = await env.DB.batch([env.DB.prepare("UPDATE km_kunjungan SET status = ?, diubah = ? WHERE id = ? AND status = ?").bind(b.o.ke, kini, k.id, k.status),
    jejak(env, "km_kunjungan", k.id, "status", h.oleh, kini, {dari: k.status, ke: b.o.ke, jikaUbah: true})]);
  if (!u.meta.changes) return gagal(409, "status kunjungan sudah berubah; muat ulang");
  const naik = b.o.ke === "selesai" ? await konfirmasi(env, url, k.id, h.oleh, kini) : [];
  return json({ok: true, id: k.id, status: b.o.ke, tervalidasi: naik});
}
/* ALUR §2.5.3: masalah `ditelaah` yang dijawab ya/sebagian pada pertanyaan konfirmasi di kunjungan ini -> `tervalidasi` */
async function konfirmasi(env, url, kunjId, oleh, kini) {
  const ids = await idKonfirmasi(env, url); if (!ids) return [];
  const rs = await env.DB.prepare("SELECT DISTINCT j.masalah_id, j.templat_id FROM km_jawaban j JOIN km_masalah m ON m.id = j.masalah_id WHERE j.kunjungan_id = ? AND j.pilihan IN ('ya', 'sebagian') AND m.status = 'ditelaah' AND m.dummy = 0").bind(kunjId).all();
  const naik = [...new Set(rs.results.filter(r => ids.has(r.templat_id)).map(r => r.masalah_id))], hasil = [];
  for (const id of naik) {
    const [u] = await env.DB.batch([env.DB.prepare("UPDATE km_masalah SET status = 'tervalidasi', diubah = ? WHERE id = ? AND status = 'ditelaah'").bind(kini, id),
      jejak(env, "km_masalah", id, "status", oleh, kini, {dari: "ditelaah", ke: "tervalidasi", catatan: "konfirmasi kunjungan " + kunjId, jikaUbah: true})]);
    if (u.meta.changes) hasil.push(id);
  }
  return hasil;
}

/* ================================================================ jawaban */
function cekJawaban(j, bp, templat) {
  if (!j || typeof j !== "object" || Array.isArray(j)) return "tiap jawaban harus objek";
  if (typeof j.klien_id !== "string" || !RE_KLIEN.test(j.klien_id)) return "klien_id 8-40 karakter (huruf, angka, . _ : -)";
  if (typeof j.narasumber !== "string" || !NARASUMBER.includes(j.narasumber)) return `narasumber harus salah satu dari ${NARASUMBER.join(", ")}`;
  if (typeof j.templat_id !== "string" || !templat.has(j.templat_id)) return "templat_id bukan pertanyaan resmi (pertanyaan.json)";
  if (j.masalah_id != null && !(typeof j.masalah_id === "string" && RE_ID.test(j.masalah_id))) return "masalah_id harus 16 hex";
  if (j.auto_id != null && bp) return "auto_id hanya boleh dikirim staf BNPB (mengambil masalah otomatis bukan hak BPBD)";
  if (j.auto_id != null && !(typeof j.auto_id === "string" && RE_AUTO.test(j.auto_id))) return "auto_id tidak sah";
  if (j.pilihan != null && !PILIHAN.includes(j.pilihan)) return "pilihan harus ya, sebagian, atau tidak";
  const bt = bersihOpsi(j.teks, 3000); if (bt.galat) return "teks: " + bt.galat;
  const teks = bt.t, angka = j.angka == null ? null : typeof j.angka === "number" && Number.isFinite(j.angka) ? j.angka : NaN, w = j.waktu_klien == null ? null : num(j.waktu_klien, 0, 4e12, true);
  if (Number.isNaN(angka)) return "angka harus bilangan";
  if (Number.isNaN(w)) return "waktu_klien harus bilangan bulat ms";
  if (j.pilihan == null && teks == null && angka == null) return "jawaban kosong: isi pilihan, teks, atau angka";
  return {...j, teks, angka, waktu_klien: w};
}
async function kirimJawaban(env, req, url, kini, ctx, p) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "BP"]); if (x) return x;
  const k = await env.DB.prepare("SELECT id, kab4, tim, status FROM km_kunjungan WHERE id = ? AND dummy = 0").bind(p.id).first();
  if (!k || (h.peran === "BP" && !timBP(k, h))) return gagal(h.peran === "BP" ? 403 : 404, h.peran === "BP" ? "kodemu bukan anggota tim kunjungan ini" : "kunjungan tidak ditemukan");
  const l = await lj(env, h, "kemitraan.jawaban", 300, kini); if (l) return l;   // laju SEBELUM membaca body (kiriman besar)
  const b = await bacaBody(req, 262144); if (b.galat) return gagal(b.status || 400, b.galat);
  const arr = b.o.jawaban;
  if (!Array.isArray(arr) || !arr.length || arr.length > 100) return gagal(400, "jawaban: larik 1-100 butir");
  const templat = await idPertanyaan(env, url); if (!templat) return gagal(503, "daftar pertanyaan belum tersedia");
  const v = [];
  for (const [i, j] of arr.entries()) { const c = cekJawaban(j, h.peran === "BP", templat.semua); if (typeof c === "string") return gagal(400, `jawaban ke-${i + 1}: ${c}`); v.push(c); }
  if (k.status !== "berjalan" && k.status !== "selesai") return gagal(409, `kunjungan berstatus ${k.status}; jawaban hanya diterima saat berjalan atau selesai`);
  /* tambahan batas per BARIS: 2000 jawaban/jam per pemegang (300 permintaan x 100 butir terlalu longgar); tiap butir dicatat satu baris laju */
  const pakai = (await env.DB.prepare("SELECT count(*) n FROM laju_bnpb WHERE kunci = ? AND aksi = 'kemitraan.jawaban_baris' AND waktu > ?").bind(h.oleh, kini - JAM).first()).n;
  if (pakai + v.length > MAKS_BARIS) return gagal(429, `batas jawaban: ${MAKS_BARIS} butir per jam sudah tercapai`, {"retry-after": "3600"});
  /* masalah rujukan: harus sekabupaten dengan kunjungan; auto_id diambil bila belum */
  const idM = [...new Set(v.map(j => j.masalah_id).filter(Boolean))];
  const ada = idM.length ? (await env.DB.prepare(`SELECT id, kab4, auto_id FROM km_masalah WHERE dummy = 0 AND id IN (${idM.map(() => "?").join(",")})`).bind(...idM).all()).results : [];
  for (const j of v) if (j.masalah_id) {
    const m = ada.find(a => a.id === j.masalah_id);
    if (!m || m.kab4 !== k.kab4) return gagal(400, `masalah_id ${j.masalah_id} tidak ada di kabupaten/kota kunjungan ini`);
    if (j.auto_id && j.auto_id !== m.auto_id) return gagal(400, "auto_id tidak cocok dengan masalah_id");
  }
  for (const a of new Set(v.filter(j => j.auto_id && !j.masalah_id).map(j => j.auto_id))) if (RE_AUTO.exec(a)[1] !== k.kab4) return gagal(400, `auto_id ${a} bukan milik kabupaten/kota kunjungan ini`);
  const autos = [...new Set(v.filter(j => j.auto_id && !j.masalah_id).map(j => j.auto_id))], peta = {};
  for (const a of autos) { const r = await periksaAuto(env, url, a); if (r) return gagal(r.s === 404 ? 400 : r.s, `${a}: ${r.galat}`); }   // rujukan di dalam kiriman yang salah = 400   // SEMUA divalidasi sebelum ada yang ditulis
  await env.DB.batch(v.map(() => env.DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'kemitraan.jawaban_baris', ?)").bind(h.oleh, kini)));   // kuota baris dipakai hanya oleh kiriman yang lolos validasi
  for (const a of autos) { const r = await ambilAuto(env, url, a, h.oleh, kini); if (r.galat) return gagal(r.s, `${a}: ${r.galat}`); peta[a] = r.id; }
  const rs = await env.DB.batch(v.map(j => env.DB.prepare(`INSERT INTO km_jawaban (id, kunjungan_id, klien_id, narasumber, templat_id, masalah_id, auto_id, pilihan, teks, angka, dibuat, waktu_klien, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (kunjungan_id, klien_id) DO NOTHING`).bind(acak(8), k.id, j.klien_id, j.narasumber, j.templat_id, j.masalah_id ?? (j.auto_id ? peta[j.auto_id] : null), j.auto_id ?? null, j.pilihan ?? null, j.teks, j.angka, kini, j.waktu_klien, oleh80(h))));
  const diterima = rs.reduce((n, r) => n + r.meta.changes, 0), duplikat = v.length - diterima;
  if (diterima) await jejak(env, "km_kunjungan", k.id, "jawaban", h.oleh, kini, {catatan: `diterima ${diterima}, duplikat ${duplikat}`}).run();   // ponytail: di luar batch jawaban (jumlahnya baru diketahui sesudahnya); jawaban tersimpan walau jejak ini gagal
  /* konfirmasi hanya lewat staf; jawaban BP yang terlambat tersimpan tetapi tidak mengubah status masalah */
  const naik = k.status === "selesai" && diterima && h.peran !== "BP" ? await konfirmasi(env, url, k.id, h.oleh, kini) : [];
  return json({diterima, duplikat, tervalidasi: naik});
}

/* ================================================================ koreksi angka profil */
const RE_JALUR = /^[A-Za-z0-9_.\[\]-]{3,80}$/;
async function ajukanKoreksi(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "BP"]); if (x) return x;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (o.kunjungan_id != null && !(typeof o.kunjungan_id === "string" && RE_ID.test(o.kunjungan_id))) return gagal(400, "kunjungan_id harus 16 hex");
  if (h.peran === "BP" && o.kunjungan_id == null) return gagal(400, "kunjungan_id wajib: koreksi BPBD hanya lewat kunjungan timnya");
  let k = null;
  if (o.kunjungan_id) {
    k = await env.DB.prepare("SELECT id, kab4, tim, status FROM km_kunjungan WHERE id = ? AND dummy = 0").bind(o.kunjungan_id).first();
    if (h.peran === "BP" ? !k || !timBP(k, h) : !k) return gagal(h.peran === "BP" ? 403 : 404, h.peran === "BP" ? "kodemu bukan anggota tim kunjungan ini" : "kunjungan tidak ditemukan");
    if (k.status !== "berjalan" && k.status !== "selesai") return gagal(409, `kunjungan berstatus ${k.status}`);
  }
  const kab4 = k ? k.kab4 : o.kab4;
  if (typeof kab4 !== "string" || !RE_KAB.test(kab4)) return gagal(400, "kab4 harus 4 digit kode kabupaten/kota");
  if (k && o.kab4 != null && o.kab4 !== k.kab4) return gagal(400, "kab4 tidak sama dengan kabupaten/kota kunjungan");
  const bl = bersihOpsi(o.lama, 200), bb = bersihOpsi(o.baru, 200), bs = bersihOpsi(o.sumber, 200);   // buang nomor HP/tautan seperti teks warga; batas diperiksa pada nilai yang sudah bersih
  if (typeof o.jalur !== "string" || !RE_JALUR.test(o.jalur)) return gagal(400, "jalur 3-80 karakter (huruf, angka, . _ [ ] -)");
  if (bl.galat) return gagal(400, "angka lama: " + bl.galat);
  if (bb.galat) return gagal(400, "angka baru: " + bb.galat);
  if (bs.galat) return gagal(400, "sumber: " + bs.galat);
  const lama = bl.t, baru = bb.t, sumber = bs.t;
  if (!baru) return gagal(400, "angka baru wajib (1-200 karakter)");
  if (!sumber || sumber.length < 3) return gagal(400, "sumber koreksi wajib (3-200 karakter)");
  const kode = await kodeKab(env, url); if (!kode) return gagal(503, "daftar wilayah belum tersedia");
  if (!kode[kab4]) return gagal(400, "kab4 tidak dikenal");
  const l = await lj(env, h, "kemitraan.koreksi", 60, kini); if (l) return l;
  const id = acak(8);
  await env.DB.batch([env.DB.prepare("INSERT INTO km_koreksi (id, kab4, kunjungan_id, jalur, lama, baru, sumber, status, dibuat, diubah, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, 'menunggu', ?, ?, ?)").bind(id, kab4, o.kunjungan_id ?? null, o.jalur, lama, baru, sumber, kini, kini, oleh80(h)),
    jejak(env, "km_koreksi", id, "ajukan", h.oleh, kini, {ke: "menunggu"})]);
  return json({ok: true, id, status: "menunggu"}, 201);
}
async function putusKoreksi(env, req, url, kini, ctx, p) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST"]); if (x) return x;
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const ke = { terima: "diterima", tolak: "ditolak" }[b.o.aksi];
  if (!ke) return gagal(400, "aksi harus terima atau tolak");
  const l = await lj(env, h, "kemitraan.status", 300, kini); if (l) return l;
  const [u] = await env.DB.batch([env.DB.prepare("UPDATE km_koreksi SET status = ?, diubah = ? WHERE id = ? AND status = 'menunggu' AND dummy = 0").bind(ke, kini, p.id),
    jejak(env, "km_koreksi", p.id, "putus", h.oleh, kini, {dari: "menunggu", ke, jikaUbah: true})]);
  if (u.meta.changes) return json({ok: true, id: p.id, status: ke});
  return (await env.DB.prepare("SELECT 1 FROM km_koreksi WHERE id = ? AND dummy = 0").bind(p.id).first()) ? gagal(409, "koreksi sudah diputuskan") : gagal(404, "koreksi tidak ditemukan");
}
async function daftarKoreksi(env, req, url, kini) {
  const h = await hakKm(env, req, kini), x = izin(h, ["SA", "ST", "PM", "BP"]); if (x) return x;
  const q = url.searchParams, kab = q.get("kab4"), st = q.get("status");
  if (kab !== null && !RE_KAB.test(kab)) return gagal(400, "kab4 harus 4 digit");
  if (st !== null && !["menunggu", "diterima", "ditolak"].includes(st)) return gagal(400, "status tidak sah");
  if (h.peran === "BP" && kab !== null && kab !== h.kab4) return gagal(403, "kode ini hanya berlaku untuk kabupaten/kota sendiri");
  const k = h.peran === "BP" ? h.kab4 : kab, w = ["dummy = 0"], p = [];
  if (k) { w.push("kab4 = ?"); p.push(k); }
  if (st) { w.push("status = ?"); p.push(st); }
  if (h.peran === "BP") { w.push("kunjungan_id IN (SELECT id FROM km_kunjungan WHERE dummy = 0 AND EXISTS (SELECT 1 FROM json_each(km_kunjungan.tim) t WHERE json_extract(t.value, '$.kode_id') = ?))"); p.push(h.kode_id); }   // KP §1: BP T "kunjungannya", bukan seluruh kabupaten
  const {per, off, hal, r: rh} = halaman(url); if (rh) return rh;
  const l = await lj(env, h, "kemitraan.baca", 300, kini); if (l) return l;
  const rs = await env.DB.prepare(`SELECT id, kab4, kunjungan_id, jalur, lama, baru, sumber, status, dibuat, diubah FROM km_koreksi WHERE ${w.join(" AND ")} ORDER BY dibuat DESC LIMIT ? OFFSET ?`).bind(...p, per, off).all();
  return json({koreksi: rs.results, hal, per});
}

export function ruteMasalah() {
  return {
    "GET /api/kemitraan/masalah": daftarMasalah,
    "POST /api/kemitraan/masalah": ajukanMasalah,
    "POST /api/kemitraan/masalah/ambil": ambilMasalah,
    "POST /api/kemitraan/masalah/:id/status": statusMasalah,
    "GET /api/kemitraan/masalah/:id/saran-gabung": saranGabung,
    "GET /api/kemitraan/kunjungan": daftarKunjungan,
    "POST /api/kemitraan/kunjungan": buatKunjungan,
    "POST /api/kemitraan/kunjungan/:id/status": statusKunjungan,
    "POST /api/kemitraan/kunjungan/:id/jawaban": kirimJawaban,
    "GET /api/kemitraan/koreksi": daftarKoreksi,
    "POST /api/kemitraan/koreksi": ajukanKoreksi,
    "POST /api/kemitraan/koreksi/:id": putusKoreksi,
  };
}
