/* Siklus Bencana F4 (Jitupasna ke R3P Digital): rute Jitupasna, baris, hitung, harga, R3P, kegiatan, tanda setuju. Kontrak: data/kajian-bnpb/siklus/DESAIN-TEKNIS.md 3.3 dan 4; ALGORITMA F4; KEAMANAN-PRIVASI 4.
   TIDAK menyentuh env.DB: semua SQL ada di bagian Siklus src/hak.js. Tanpa NIK, tanpa registri per orang, tanpa tabel rumah rusak kedua (rekap = hitungan per tingkat dari rumah_rusak lewat hak.js).
   Harga satuan tanpa acuan resmi berlabel asumsi-kebijakan (U4, U8); nilai kosong "menunggu", bukan 0. Tanda setuju PM adalah tanda setuju internal (U7), tidak menggantikan dokumen resmi.
   ponytail: laju baris dihitung per 20 baris (maks 30 slot per jam = 600 baris), bukan per baris, supaya satu kiriman tidak menulis puluhan baris laju; indeks IKK/IHPB belum dipakai di rute (sumber BPS menunggu SK-073). */
import {json, gagal, acak} from "./worker.js";
import {tolak, teks, tglSah} from "./pusdalops_umum.js";
import * as H from "./hak.js";
import {NAMA_KAB4} from "./siklus_kab.js";
import {RE_KJ, nilaiKerusakan, nilaiKerugian, petaLimaSektor, tigaPenanda, stimulan, sisa90, persenRealisasi, macet, SEKTOR_R3P, MENUNGGU} from "./siklus_hitung.js";
import {bodi, masukan, ujiLaju, NO, parse, bersihNama, dalamBP, lihat, utkBP, kab4Sah, polos} from "./siklus_kejadian.js";
import {rekapTingkat} from "./rumah_rusak.js";
import {kemajuanPemulihan} from "./pemulihan.js";

const HARI = 864e5, MAKS_BARIS = 500, PER_KIRIM = 100, TINGKAT = ["rb", "rs", "rr", "hancur", "unit"];
const RE_SEKTOR = /^[a-z][a-z0-9_]{1,39}$/, RE_KLIEN = /^[A-Za-z0-9_-]{8,40}$/, RE_ID16 = /^[0-9a-f]{16}$/;
const tglWib = kini => new Date(kini + 7 * 36e5).toISOString().slice(0, 10);
const tglGeser = (t, n) => new Date(Date.parse(t + "T00:00:00Z") + n * HARI).toISOString().slice(0, 10);
const int = (v, nama, min, maks) => { if (!Number.isInteger(v) || v < min || v > maks) tolak(`${nama} harus bilangan bulat ${min}-${maks}`); return v; };
const num = (v, nama, min, maks) => { if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > maks) tolak(`${nama} harus angka ${min}-${maks}`); return v; };
const bersih = (v, nama, maks, min = 1) => { if (v == null || v === "") return null; const t = teks(v, nama, maks, min); const b = bersihNama(t, maks); if (b.length < min) tolak(`${nama} ${min}-${maks} karakter setelah dibersihkan`); return b; };   // kosong = null; pemanggil yang mewajibkan memakai ?? tolak(...)
const nilaiJp = r => ({...r, hitung: parse(r.hitung)});

/* Jitupasna yang boleh dilihat pemanggil, atau null (404 seragam: tidak ada, dummy bagi akun nyata, di luar lingkup BP) */
async function jpBoleh(c, id) {
  const r = await H.skJitupasnaById(c.env, c.h.pelaku, id);
  return lihat(c, r) && dalamBP(c, [r.kab4]) ? r : null;
}

/* ================================================================ baca */
async function daftarPulih(c) {
  const id = c.url.searchParams.get("kejadian_id");
  masukan(() => { if (typeof id !== "string" || !RE_KJ.test(id)) tolak("kejadian_id wajib ID kejadian KJ-..."); });
  const k = await H.skKejadianRingkas(c.env, c.h.pelaku, id);
  if (!lihat(c, k)) return NO();
  const baris = (await H.skJitupasnaDaftar(c.env, c.h.pelaku, id, c.h.dummyOk)).filter(r => dalamBP(c, [r.kab4]));
  if (c.h.tipe === "bp" && !baris.length && !dalamBP(c, [k.kab4])) return NO();
  return json({kejadian_id: id, baris: baris.map(r => utkBP(c, nilaiJp(r)))});
}

/* hitungan rumah rusak per tingkat untuk kabupaten Jitupasna, tanpa koordinat, foto, atau pelapor; jendela tanggal dari mulai kejadian */
async function rekapRumah(c, jp, kejadian) {
  const nama = NAMA_KAB4[jp.kab4]; if (!nama) return null;
  const dari = kejadian.mulai, sampai = tglGeser(dari, 120);
  const kec = await rekapTingkat(c.env, {prov: jp.prov, kab: nama, dari, sampai});
  const total = kec.reduce((a, r) => ({berat: a.berat + r.berat, sedang: a.sedang + r.sedang, ringan: a.ringan + r.ringan, total: a.total + r.total}), {berat: 0, sedang: 0, ringan: 0, total: 0});
  return {dari, sampai, total, kec, catatan: "hitungan laporan rumah rusak berstatus sah; berdampingan dengan isian Jitupasna, tidak dijumlah", yakin: "terverifikasi"};
}

/* kemajuan kegiatan R3P yang tertaut ke tabel pemulihan (F4.8); macet dibaca saat halaman dibuka dari kegiatan berjalan yang tak berubah lebih dari 60 hari */
async function kemajuan(c, kegiatan) {
  const ids = kegiatan.filter(k => k.tautan_jenis === "pemulihan").map(k => k.tautan_id);
  const pem = new Map((await kemajuanPemulihan(c.env, ids)).map(r => [r.id, r]));
  const hariIni = tglWib(c.kini);
  const masuk = kegiatan.map(k => { const p = pem.get(k.tautan_id); return {id: k.id, nilai: k.nilai_rp, target: p?.target ?? null, realisasi: p?.realisasi ?? null, satuan: p?.satuan ?? k.satuan}; });
  const r = persenRealisasi(masuk);
  return {total: r.total, yakin: r.yakin, kegiatan: kegiatan.map((k, i) => ({id: k.id, ...r.per[i], pemulihan: pem.get(k.tautan_id) ?? null, macet: k.status === "berjalan" && macet(tglWib(k.diubah), hariIni)}))};
}

async function detailPulih(c) {
  const jp = await jpBoleh(c, c.p.sid); if (!jp) return NO();
  const p = c.h.pelaku, kej = await H.skKejadianRingkas(c.env, p, jp.kejadian_id);
  const baris = await H.skBarisDaftar(c.env, p, jp.id), r3p = await H.skR3pDariJitupasna(c.env, p, jp.id);
  const kegiatan = r3p.length ? await H.skKegiatanDaftar(c.env, p, r3p[0].id) : [];
  return json({jitupasna: utkBP(c, nilaiJp(jp)), baris: baris.slice(0, MAKS_BARIS).map(b => utkBP(c, b)), baris_terpotong: baris.length > MAKS_BARIS,
    rekap_rumah_rusak: await rekapRumah(c, jp, kej), r3p: r3p.map(r => utkBP(c, r)), kegiatan: kegiatan.map(k => utkBP(c, k)), kemajuan: await kemajuan(c, kegiatan),
    catatan: "harga satuan berlabel asumsi-kebijakan; angka kosong menunggu"});
}

async function daftarHarga(c) {
  const q = c.url.searchParams, sektor = q.get("sektor"), tahun = q.get("tahun");
  masukan(() => { if (!RE_SEKTOR.test(sektor ?? "")) tolak("sektor wajib"); if (tahun != null && tahun !== "" && !/^\d{4}$/.test(tahun)) tolak("tahun harus 4 digit"); });
  return json({sektor, baris: await H.skHargaDaftar(c.env, c.h.pelaku, sektor, tahun ? +tahun : null, c.h.dummyOk)});
}

/* ================================================================ tulis Jitupasna */
async function pulihBaru(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => {
    if (typeof b.kejadian_id !== "string" || !RE_KJ.test(b.kejadian_id)) tolak("kejadian_id wajib ID kejadian KJ-...");
    return {kejadian_id: b.kejadian_id, kab4: kab4Sah(b.kab4), tim_sk: bersih(b.tim_sk, "tim_sk", 120, 1)};
  });
  const k = await H.skKejadianRingkas(c.env, p, v.kejadian_id); if (!lihat(c, k)) return NO();
  const kabs = await H.skKejadianKab(c.env, p, v.kejadian_id);
  if (!(kabs.length ? kabs : [k.kab4]).includes(v.kab4)) return gagal(400, "kab4 bukan kabupaten kejadian ini");
  if (k.fase !== "tanggap" && k.fase !== "transisi") return gagal(409, `Jitupasna dibuka saat kejadian tanggap atau transisi (sekarang ${k.fase})`);
  const dummy = k.dummy ? 1 : 0, lama = await H.skJitupasnaTerbaru(c.env, p, v.kejadian_id, v.kab4, dummy);
  if (lama && lama.status !== "final") return gagal(409, "sudah ada Jitupasna kabupaten ini yang belum final");
  const lj = await ujiLaju(c, "sk.pulih", 30); if (lj) return lj;
  const id = acak(8);
  await H.skBatch(c.env, p, [H.skStmtJitupasnaBaru(c.env, p, {id, kejadian_id: v.kejadian_id, prov: v.kab4.slice(0, 2), kab4: v.kab4, tim_sk: v.tim_sk, kini: c.kini, oleh: c.h.oleh, dummy}),
    H.skStmtJejak(c.env, p, c.h.oleh, "jitupasna", id, "buat", null, "dibuka", v.kab4, c.kini, dummy)]);
  return json({id}, 201);
}

function barisSah(o, i) {
  const n = `baris[${i}]`;
  if (!polos(o)) tolak(`${n} harus objek`);
  if (o.jenis !== "rusak" && o.jenis !== "rugi") tolak(`${n}.jenis harus rusak atau rugi`);
  if (typeof o.sektor !== "string" || !RE_SEKTOR.test(o.sektor)) tolak(`${n}.sektor harus huruf kecil, angka, garis bawah (2-40)`);
  if (typeof o.klien_id !== "string" || !RE_KLIEN.test(o.klien_id)) tolak(`${n}.klien_id wajib 8-40 karakter (huruf, angka, - dan _)`);
  const r = {jenis: o.jenis, sektor: o.sektor, klien_id: o.klien_id, asumsi: bersih(o.asumsi, `${n}.asumsi`, 300, 1)};
  if (o.jenis === "rusak") {
    if (!TINGKAT.includes(o.tingkat)) tolak(`${n}.tingkat harus ${TINGKAT.join(", ")}`);
    if ("komponen" in o || "arus_rp" in o || "bulan" in o) tolak(`${n}: komponen, arus_rp, bulan hanya untuk baris rugi`);
    return {...r, tingkat: o.tingkat, unit: num(o.unit, `${n}.unit`, 0, 1e7)};
  }
  if ("tingkat" in o || "unit" in o) tolak(`${n}: tingkat dan unit hanya untuk baris rusak`);
  if (typeof o.komponen !== "string" || !RE_SEKTOR.test(o.komponen)) tolak(`${n}.komponen harus huruf kecil, angka, garis bawah (2-40)`);
  return {...r, komponen: o.komponen, arus_rp: int(o.arus_rp, `${n}.arus_rp`, 0, 1e11), bulan: int(o.bulan, `${n}.bulan`, 1, 120)};
}

async function barisTulis(c) {
  const b = await bodi(c, 256 * 1024), p = c.h.pelaku;
  const v = masukan(() => { if (!Array.isArray(b.baris) || b.baris.length < 1 || b.baris.length > PER_KIRIM) tolak(`baris harus larik 1-${PER_KIRIM}`); return b.baris.map(barisSah); });
  const jp = await jpBoleh(c, c.p.sid); if (!jp) return NO();
  if (jp.status !== "dibuka" && jp.status !== "pengumpulan") return gagal(409, `baris hanya diterima saat dibuka atau pengumpulan (sekarang ${jp.status})`);
  if ((await H.skBarisHitung(c.env, p, jp.id)) + v.length > MAKS_BARIS) return gagal(409, `satu Jitupasna paling banyak ${MAKS_BARIS} baris`);
  for (let i = 0; i < Math.ceil(v.length / 20); i++) { const lj = await ujiLaju(c, "sk.baris", 30); if (lj) return lj; }
  const st = v.map(r => H.skStmtBaris(c.env, p, jp.id, {...r, id: acak(8)}, c.kini, c.h.oleh, jp.dummy));
  const res = await H.skBatch(c.env, p, [...st, H.skStmtJejak(c.env, p, c.h.oleh, "jitupasna", jp.id, "baris", null, null, `${v.length} dikirim`, c.kini, jp.dummy)]);
  const diterima = res.slice(0, st.length).reduce((a, x) => a + (x.meta.changes ? 1 : 0), 0);
  return json({diterima, duplikat: v.length - diterima});
}

/* Inti hitung, dipakai rute hitung DAN dummy (satu mesin, DT 9): baris = baris D1 Jitupasna; hargaRows = baris sk_harga berurut (kabupaten dulu, lalu nasional, terbaru dulu: yang pertama per sektor dan tingkat menang).
   Hasil: {hasil (JSON <= 3000 karakter, label asumsi-kebijakan), nilai: [[baris_id, harga_id, nilai_rp]]}. */
export function hitungJitupasna(baris, hargaRows, tahun, kini) {
  const sektor = [...new Set(baris.map(r => r.sektor))], harga = new Map();
  for (const h of hargaRows) { const k = h.sektor + "|" + h.tingkat; if (!harga.has(k)) harga.set(k, h); }
  const hf = (s, t) => harga.get(s + "|" + t)?.harga_rp ?? null;
  const rusak = baris.filter(r => r.jenis === "rusak"), rugi = baris.filter(r => r.jenis === "rugi");
  const ker = nilaiKerusakan(rusak, hf), kru = nilaiKerugian(rugi);
  const perSektor = {}; for (const s of sektor) { const a = ker.per[s]; perSektor[s] = a?.menunggu ? null : (a?.nilai ?? 0) + (kru.per[s] ?? 0); }
  const unitPerumahan = t => rusak.filter(r => r.sektor === "perumahan" && r.tingkat === t).reduce((a, r) => a + r.unit, 0);
  const stim = rusak.some(r => r.sektor === "perumahan") ? stimulan({rb: unitPerumahan("rb"), rs: unitPerumahan("rs"), rr: unitPerumahan("rr")}) : stimulan({});
  const hasil = {tahun_harga: tahun, dihitung: kini, yakin: "asumsi-kebijakan", indeks: MENUNGGU,
    kerusakan: {total: ker.total, menunggu: ker.menunggu, per: Object.fromEntries(Object.entries(ker.per).map(([s, a]) => [s, {nilai: a.nilai, menunggu: a.menunggu, monoton: a.monoton.ok, wajar: a.wajar}]))},
    kerugian: {total: kru.total, per: kru.per}, peta: petaLimaSektor(perSektor), penanda: tigaPenanda({kerusakan: ker, barisRugi: rugi, sektorTerisi: sektor}), stimulan: stim,
    total: ker.total == null ? null : ker.total + (kru.total ?? 0)};
  const nilai = baris.map(r => {
    const h = r.jenis === "rusak" ? harga.get(r.sektor + "|" + r.tingkat) : null;
    return [r.id, h?.id ?? null, r.jenis === "rugi" ? r.arus_rp * r.bulan : h ? Math.round(r.unit * h.harga_rp) : null];
  });
  return {hasil, nilai};
}

async function hitungTulis(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const tahun = masukan(() => int(b.tahun_harga, "tahun_harga", 2000, 2100));
  const jp = await jpBoleh(c, c.p.sid); if (!jp) return NO();
  if (jp.status !== "pengumpulan" && jp.status !== "dihitung") return gagal(409, `hitung hanya dari pengumpulan atau dihitung (sekarang ${jp.status})`);
  const baris = await H.skBarisDaftar(c.env, p, jp.id);
  if (!baris.length) return gagal(409, "belum ada baris untuk dihitung");
  const lj = await ujiLaju(c, "sk.hitung", 30); if (lj) return lj;
  const {hasil, nilai} = hitungJitupasna(baris, await H.skHargaCari(c.env, p, [...new Set(baris.map(r => r.sektor))], tahun, jp.kab4, jp.dummy), tahun, c.kini);
  const teksHasil = JSON.stringify(hasil);
  if (teksHasil.length > 3000) return gagal(413, "hasil hitung melebihi 3000 karakter; kurangi jumlah sektor");
  const res = await H.skBatch(c.env, p, [H.skStmtBarisNilai(c.env, p, jp.id, nilai), H.skStmtHitung(c.env, p, jp.id, tahun, teksHasil, c.kini),
    H.skStmtJejakJikaBerubah(c.env, p, c.h.oleh, "jitupasna", jp.id, "hitung", jp.status, "dihitung", `harga ${tahun}`, c.kini, jp.dummy)]);
  if (!res[1].meta.changes) return gagal(409, "status berubah oleh pengguna lain; muat ulang");
  return json({id: jp.id, status: "dihitung", hitung: hasil});
}

const GESER_JP = {pengumpulan: ["dibuka", "dihitung", "ditinjau"], ditinjau: ["dihitung"], final: ["ditinjau"]};   // ke: dari yang sah; dihitung hanya lewat rute hitung
async function statusJp(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => { if (!Object.hasOwn(GESER_JP, b.ke)) tolak("ke harus pengumpulan, ditinjau, atau final (dihitung lewat rute hitung)"); return {ke: b.ke, alasan: b.alasan == null || b.alasan === "" ? null : bersih(b.alasan, "alasan", 200, 3)}; });
  const jp = await jpBoleh(c, c.p.sid); if (!jp) return NO();
  if (!GESER_JP[v.ke].includes(jp.status)) return gagal(409, `status ${jp.status} tidak bisa menjadi ${v.ke}`);
  if (v.ke === "pengumpulan" && jp.status !== "dibuka" && !v.alasan) return gagal(400, "alasan wajib untuk mundur ke pengumpulan");
  const lj = await ujiLaju(c, "sk.pulihstatus", 60); if (lj) return lj;
  const res = await H.skBatch(c.env, p, [H.skStmtJitupasnaStatus(c.env, p, jp.id, jp.status, v.ke, c.kini), H.skStmtJejakJikaBerubah(c.env, p, c.h.oleh, "jitupasna", jp.id, "status", jp.status, v.ke, v.alasan, c.kini, jp.dummy)]);
  if (!res[0].meta.changes) return gagal(409, "status berubah oleh pengguna lain; muat ulang");
  return json({id: jp.id, status: v.ke});
}

async function hargaBaru(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => {
    if (typeof b.sektor !== "string" || !RE_SEKTOR.test(b.sektor)) tolak("sektor harus huruf kecil, angka, garis bawah (2-40)");
    if (!TINGKAT.includes(b.tingkat)) tolak(`tingkat harus ${TINGKAT.join(", ")}`);
    const dokumen = bersih(b.dokumen, "dokumen", 200, 3);
    if (dokumen == null) tolak("dokumen sumber harga (HSBGN atau Perka) wajib");
    return {sektor: b.sektor, tingkat: b.tingkat, satuan: bersih(b.satuan, "satuan", 20, 1) ?? tolak("satuan wajib"), harga_rp: int(b.harga_rp, "harga_rp", 1, 1e11), tahun: int(b.tahun, "tahun", 2000, 2100), kab4: b.kab4 == null || b.kab4 === "" ? null : kab4Sah(b.kab4), dokumen};
  });
  const lj = await ujiLaju(c, "sk.harga", 60); if (lj) return lj;
  const id = acak(8), dummy = c.h.dummy ? 1 : 0;
  await H.skBatch(c.env, p, [H.skStmtHargaBaru(c.env, p, {...v, id, kini: c.kini, oleh: c.h.oleh, dummy}), H.skStmtJejak(c.env, p, c.h.oleh, "harga", id, "buat", null, v.tingkat, v.sektor, c.kini, dummy)]);
  return json({id, yakin: "asumsi-kebijakan"}, 201);
}

/* ================================================================ R3P */
async function r3pBoleh(c, id) {
  const r = await H.skR3pById(c.env, c.h.pelaku, id); if (!lihat(c, r)) return null;
  const jp = await H.skJitupasnaById(c.env, c.h.pelaku, r.jitupasna_id);
  return jp && dalamBP(c, [jp.kab4]) ? {r, jp} : null;
}

async function r3pBaru(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const jpId = masukan(() => { if (typeof b.jitupasna_id !== "string" || !RE_ID16.test(b.jitupasna_id)) tolak("jitupasna_id wajib (16 heks)"); return b.jitupasna_id; });
  const jp = await jpBoleh(c, jpId); if (!jp) return NO();
  if (jp.status !== "final") return gagal(409, `R3P hanya dari Jitupasna final (sekarang ${jp.status})`);
  const lama = await H.skR3pDariJitupasna(c.env, p, jp.id);
  if (lama.length && lama[0].status === "draf") return gagal(409, "sudah ada draf R3P untuk Jitupasna ini");
  const lj = await ujiLaju(c, "sk.r3p", 30); if (lj) return lj;
  const id = acak(8);
  await H.skBatch(c.env, p, [H.skStmtR3pBaru(c.env, p, id, jp.id, c.kini, c.h.oleh), H.skStmtJejak(c.env, p, c.h.oleh, "r3p", id, "buat", null, "draf", jp.id, c.kini, jp.dummy)]);
  return json({id}, 201);
}

const LANGKAH_R3P = {diusulkan: "draf", ditetapkan_resmi: "disetujui_pm", berjalan: "ditetapkan_resmi", selesai: "berjalan"};   // ke: dari; disetujui_pm hanya lewat setuju
async function statusR3p(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => {
    if (b.ke === "disetujui_pm") tolak("disetujui_pm hanya lewat rute setuju oleh pimpinan");
    if (!Object.hasOwn(LANGKAH_R3P, b.ke)) tolak("ke harus diusulkan, ditetapkan_resmi, berjalan, atau selesai");
    if (b.ke !== "ditetapkan_resmi") return {ke: b.ke};
    if (!tglSah(b.tgl_keputusan)) tolak("tgl_keputusan wajib YYYY-MM-DD");
    return {ke: b.ke, no_keputusan: bersih(b.no_keputusan, "no_keputusan", 120, 1) ?? tolak("no_keputusan wajib"), tgl_keputusan: b.tgl_keputusan, penandatangan: bersih(b.penandatangan, "penandatangan", 120, 2)};
  });
  const rj = await r3pBoleh(c, c.p.sid); if (!rj) return NO();
  const {r} = rj;
  if (r.status !== LANGKAH_R3P[v.ke]) return gagal(409, `status ${r.status} tidak bisa menjadi ${v.ke}`);
  const lj = await ujiLaju(c, "sk.r3pstatus", 120); if (lj) return lj;
  const res = await H.skBatch(c.env, p, [H.skStmtR3pStatus(c.env, p, r.id, r.status, v.ke, v, c.kini), H.skStmtJejakJikaBerubah(c.env, p, c.h.oleh, "r3p", r.id, "status", r.status, v.ke, v.no_keputusan ?? null, c.kini, r.dummy)]);
  if (!res[0].meta.changes) return gagal(409, "status berubah oleh pengguna lain; muat ulang");
  return json({id: r.id, status: v.ke});
}

async function setuju(c) {
  const p = c.h.pelaku, rj = await r3pBoleh(c, c.p.sid); if (!rj) return NO();
  const {r} = rj;
  if (r.status !== "diusulkan") return gagal(409, `tanda setuju hanya dari diusulkan (sekarang ${r.status})`);
  if (r.oleh === c.h.oleh) return gagal(403, "pembuat draf tidak boleh memberi tanda setuju atas drafnya sendiri");
  const lj = await ujiLaju(c, "sk.setuju", 30); if (lj) return lj;
  const res = await H.skBatch(c.env, p, [H.skStmtR3pSetuju(c.env, p, r.id, c.h.oleh, c.kini), H.skStmtJejakJikaBerubah(c.env, p, c.h.oleh, "r3p", r.id, "setuju", "diusulkan", "disetujui_pm", "tanda setuju internal", c.kini, r.dummy)]);
  if (!res[0].meta.changes) return gagal(409, "status berubah oleh pengguna lain; muat ulang");
  return json({id: r.id, status: "disetujui_pm", label: "tanda setuju internal"});
}

async function kegiatanBaru(c) {
  const b = await bodi(c), p = c.h.pelaku;
  const v = masukan(() => {
    if (!SEKTOR_R3P.includes(b.sektor)) tolak(`sektor harus ${SEKTOR_R3P.join(", ")}`);
    const tj = b.tautan_jenis ?? null, ti = b.tautan_id ?? null;
    if ((tj == null) !== (ti == null)) tolak("tautan_jenis dan tautan_id harus diisi bersama");
    if (tj != null && (!["pemulihan", "meja_rehab"].includes(tj) || typeof ti !== "string" || !RE_ID16.test(ti))) tolak("tautan_jenis pemulihan atau meja_rehab dengan tautan_id 16 heks");
    return {sektor: b.sektor, nama: bersih(b.nama, "nama", 200, 3) ?? tolak("nama wajib"), target: b.target == null ? null : num(b.target, "target", 0, 1e9), satuan: bersih(b.satuan, "satuan", 20, 1),
      nilai_rp: b.nilai_rp == null ? null : int(b.nilai_rp, "nilai_rp", 0, 1e14), tautan_jenis: tj, tautan_id: ti};
  });
  const rj = await r3pBoleh(c, c.p.sid); if (!rj) return NO();
  const {r} = rj;
  if (r.status !== "draf" && r.status !== "diusulkan") return gagal(409, `kegiatan hanya ditambah saat draf atau diusulkan (sekarang ${r.status})`);
  if (v.tautan_jenis && !(await H.skTautanAda(c.env, v.tautan_jenis, v.tautan_id))) return gagal(404, "tautan_id tidak ada");
  const lj = await ujiLaju(c, "sk.kegiatan", 120); if (lj) return lj;
  const id = acak(8);
  const res = await H.skBatch(c.env, p, [H.skStmtKegiatanBaru(c.env, p, r.id, {...v, id}, c.kini, c.h.oleh, r.dummy), H.skStmtJejakJikaBerubah(c.env, p, c.h.oleh, "r3p", r.id, "kegiatan", null, v.sektor, v.nama.slice(0, 100), c.kini, r.dummy)]);
  if (!res[0].meta.changes) return gagal(409, "status berubah oleh pengguna lain; muat ulang");
  return json({id}, 201);
}

async function detailR3p(c) {
  const rj = await r3pBoleh(c, c.p.sid); if (!rj) return NO();
  const {r} = rj, kegiatan = await H.skKegiatanDaftar(c.env, c.h.pelaku, r.id);
  const catatan = r.status === "draf" || r.status === "diusulkan" || r.status === "disetujui_pm" ? "DRAF, bukan dokumen resmi" : "salinan data, dokumen resmi di luar sistem";
  return json({r3p: utkBP(c, r), label_setuju: r.disetujui_oleh ? "tanda setuju internal" : null, catatan, hari_tersisa_90: sisa90(r.tanggap_mulai, tglWib(c.kini)),
    kegiatan: kegiatan.map(k => utkBP(c, k)), kemajuan: await kemajuan(c, kegiatan)});
}

export const RUTE_SIKLUS_PULIH = {
  "GET /api/siklus/pulih": {izin: ["STAF", "BP"], f: daftarPulih},
  "GET /api/siklus/pulih/:sid": {izin: ["STAF", "BP"], f: detailPulih},
  "POST /api/siklus/pulih": {izin: ["KO"], f: pulihBaru},
  "POST /api/siklus/pulih/:sid/baris": {izin: ["PDKO", "BP"], f: barisTulis},
  "POST /api/siklus/pulih/:sid/hitung": {izin: ["PDKO"], f: hitungTulis},
  "POST /api/siklus/pulih/:sid/status": {izin: ["KO"], f: statusJp},
  "GET /api/siklus/harga": {izin: ["STAF"], f: daftarHarga},
  "POST /api/siklus/harga": {izin: ["PDKO"], f: hargaBaru},
  "POST /api/siklus/r3p": {izin: ["KO"], f: r3pBaru},
  "POST /api/siklus/r3p/:sid/status": {izin: ["KO"], f: statusR3p},
  "POST /api/siklus/r3p/:sid/kegiatan": {izin: ["KO"], f: kegiatanBaru},
  "GET /api/siklus/r3p/:sid": {izin: ["STAF", "BP"], f: detailR3p},
  "POST /api/siklus/r3p/:sid/setuju": {izin: ["PM"], f: setuju},
};
