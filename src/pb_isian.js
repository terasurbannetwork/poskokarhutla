/* Paritas bencana: isian manual sarana dan fasilitas sasaran (F-2, F-7, F-4 staf). PB-10; data/kajian-bnpb/paritas-bencana/DESAIN-TEKNIS.md 2.3, 2.4, 5; KEAMANAN-PRIVASI.md 2, 6.
   Tulis = modOK (moderator) atau stafPeran pusdalops DAN provinsi dalam wilayah staf. BUKAN adminOK: akun gerbang tidak menulis. Akun instansi pemprov/pemkab/pemkot aktif (PB-11, Q3, Q19, Q30) lewat `penulis`.
   Pengisi dicatat "staf:<id>" / "admin:<hash12>", tanpa nama orang. SEMUA D1 lewat src/hak.js. Tidak menulis ke public/.
   Saklar `env.PB_REGISTRI` (JSON {id: {operasi, renlap: {sarana}}}) menimpa kemampuan registri; kosong = murni public/bencana.json (bentuk sementara sebelum registri menyalakan operasi, dipakai uji). */
import {json, gagal, bacaBody, adminOK, acak, bersihTeks, sha} from "./worker.js";
import {lajuIP} from "./bnpb.js";
import {modOK} from "./posko.js";
import {stafPeran, stafSesiSemua, pemirsaLihat, dalamWilayahStaf} from "./staf.js";
import {PERAN_BACA, dalamBbox} from "./operasi_udara.js";
import {teks, Galat, tolak} from "./operasi_isian.js";
import {SARANA, FASILITAS} from "./tugas_bencana.js";
import {PROV} from "./bangunan.js";
import {akunAktif} from "./instansi.js";
import {kodeKab} from "./kemitraan_akun.js";
import REGISTRY from "./bencana.generated.js";
import {pelakuPbTulis, pelakuPbBaca, pbTitikDaftar, pbTitikById, pbStmtTitikSisip, pbStmtTitikUbah, pbStmtTitikHapus, pbStmtLog, pbLogLaju, tanpaTabelPb, batchTulis, pbRenlapMinta, pbRenlapById, pbRenlapDaftar, pbRenlapGeser, pbRenlapLajuMinta, pbStmtHasil, pbKepatuhan} from "./hak.js";

export const PERAN_TULIS = ["pusdalops"];
const PERAN_SEMUA = ["pusdalops", "koordalops", "pimpinan"], BENCANA_UDARA = ["karhutla", "udara"];
const MAKS_LAJU = 60, JENDELA_LAJU = 10 * 60e3, STATUS = ["siap", "dipakai", "rusak", "tidak_tersedia"], RE_ID = /^[0-9a-f]{16}$/;
const MIGRASI = "fitur sarana dan fasilitas belum diaktifkan (migrasi 0130_paritas_operasi belum diterapkan)";
const pilih = (v, daftar, nama) => daftar.includes(v) ? v : tolak(`${nama} harus salah satu dari: ${daftar.join(", ")}`);
const bersih = (v, maks) => {
  const t = teks(v, maks).replace(/[<>]/g, ""), r = bersihTeks(t, maks);
  if (r.galat) tolak(r.galat);
  if (r.teks !== t) tolak("tanpa nomor telepon, NIK, atau tautan");   // pembersih worker menandai URL dan deret angka 9+ digit
  return t;
};   // tanpa kurung sudut: XSS dan penutup CDATA tidak pernah tersimpan; keluaran HTML tetap lewat esc()

/* kemampuan bencana yang boleh dioperasikan; null = tidak ada atau operasi belum menyala (404, bukan 400) */
function kemampuan(env, id) {
  const b = REGISTRY.bencana.find(x => x.id === id); if (!b) return null;
  let k = b.kemampuan ?? {};
  if (env.PB_REGISTRI) { try { const o = JSON.parse(env.PB_REGISTRI)[id]; if (o) k = {...k, ...o}; } catch (e) { /* saklar rusak = abaikan */ } }
  return k.operasi === true ? k : null;
}
const bencanaAktif = (env, id) => kemampuan(env, id) ?? tolak("bencana tidak dikenal atau operasinya belum menyala", 404);
const wilayah = o => {
  const prov = typeof o.prov === "string" && PROV.has(o.prov) ? o.prov : tolak("prov harus kode BPS 2 digit yang sah");
  const kab = o.kab == null || o.kab === "" ? "" : typeof o.kab === "string" && /^\d{4}$/.test(o.kab) && o.kab.startsWith(prov) ? o.kab : tolak("kab harus kode BPS 4 digit di dalam prov");
  return {prov, kab};
};

/* akun instansi pemprov/pemkab/pemkot AKTIF (Q3, Q30); selain itu null. Tingkat prov: prov = cakupan[0]; tingkat kab: prov dan kab akun. */
const JENIS_TULIS = ["pemprov", "pemkab", "pemkot"];
async function akunTulis(env, req) {
  const a = await akunAktif(env, req, Date.now());
  if (a instanceof Response || !JENIS_TULIS.includes(a.jenis) || a.dummy) return null;   // akun dummy pensiun (pemilik 11 Nov 2026)
  let prov = a.prov; if (a.tingkat === "prov") { try { prov = JSON.parse(a.cakupan)[0]; } catch (e) { prov = null; } }
  return prov ? {id: a.id, tingkat: a.tingkat, prov, kunci: a.tingkat === "kab" ? `${a.prov}|${a.kab}` : null} : null;
}
/* kunci_wilayah akun ("32|Kota Bandung") -> kab BPS 4 digit lewat public/data/kemitraan/kode.json (kunci_nama), BUKAN nama bebas. Tak terpetakan = null = ditolak.
   ponytail: kode.json dibangkitkan pipa-umum (scripts/kemitraan/kode.py); bila kab baru belum ada di sana akunnya tertolak sampai kode.json diperbarui. */
const PETA = new WeakMap();
async function kabDariKunci(env, req, kunci) {
  const kode = await kodeKab(env, new URL(req.url)); if (!kode) return null;
  let m = PETA.get(kode); if (!m) { m = new Map(Object.entries(kode).map(([k, v]) => [v.kunci_nama, k])); PETA.set(kode, m); }
  return m.get(kunci) ?? null;
}

/* hak tulis: {oleh} atau Response. Moderator, staf pusdalops (wilayah staf), akun instansi (prov akunnya; tingkat kab hanya kab hasil pemetaan; Q19: tanpa persetujuan, tercatat "instansi:<id>"). */
async function penulis(env, req, prov, kab = "") {
  const m = await modOK(env, req); if (m) return {oleh: "admin:" + m};
  const oleh = await stafPeran(env, req, PERAN_TULIS);   // staf dicek ulang tiap permintaan: peran dicabut = 403
  if (oleh) return dalamWilayahStaf(req, [prov]) ? {oleh} : gagal(403, "provinsi di luar wilayah akun Anda");
  const a = await akunTulis(env, req);
  if (!a) return gagal(403, TOLAK_TULIS);
  if (a.prov !== prov || (a.tingkat === "kab" && (!kab || kab !== await kabDariKunci(env, req, a.kunci)))) return gagal(403, "wilayah di luar wilayah akun Anda");
  return {oleh: "instansi:" + a.id};
}
const TOLAK_TULIS = "isian sarana dan fasilitas hanya untuk staf Pusdalops, moderator, atau akun instansi pemda aktif";
/* tamu ditolak SEBELUM body dibaca, bencana dicek, atau baris dicari (tak ada pembeda 400/404 bagi tamu); cek wilayah menyusul di penulis() */
const gerbangTulis = async (env, req) => !await modOK(env, req) && !await stafPeran(env, req, PERAN_TULIS) && !await akunTulis(env, req) ? gagal(403, TOLAK_TULIS) : null;
const rute = fn => async (env, req, url, kini) => {
  try { return await fn(env, req, url, kini); }
  catch (e) {
    if (e instanceof Galat) return gagal(e.status, e.pesan);
    if (tanpaTabelPb(e)) return gagal(503, MIGRASI);
    throw e;
  }
};
async function badan(env, req) {
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const b = await bacaBody(req, 32768); return b.galat ? gagal(b.status || 400, b.galat) : b.o;
}
// ponytail: baca lalu tulis, lonjakan paralel kecil; atomik bila perlu
const lajuOK = async (env, oleh, kini) => await pbLogLaju(env, pelakuPbTulis, oleh, kini - JENDELA_LAJU) + 1 <= MAKS_LAJU;
const lambat = () => gagal(429, `isian terlalu cepat: maksimal ${MAKS_LAJU} tulis per 10 menit per pengisi`);

/* isi titik dari badan; jenis harus cocok golongan dan, untuk sarana, termasuk renlap.sarana bencananya */
function titik(o, k, w) {
  const golongan = pilih(o.golongan, ["sarana", "fasilitas"], "golongan");
  const jenis = golongan === "sarana"
    ? pilih(o.jenis, SARANA.filter(j => (k.renlap?.sarana ?? []).includes(j)), "jenis sarana untuk bencana ini")
    : pilih(o.jenis, FASILITAS, "jenis fasilitas");
  const nama = bersih(o.nama, 80); if (!nama) tolak("nama tempat atau unit wajib (tanpa nama orang), maksimal 80 karakter");
  if (!dalamBbox(o.lat, o.lon)) tolak("koordinat harus lat dan lon di wilayah Indonesia");
  const kap = o.kapasitas;
  if (kap != null && kap !== "" && (!Number.isInteger(kap) || kap < 0 || kap > 1e6)) tolak("kapasitas harus bilangan bulat 0 sampai 1000000");
  return {golongan, jenis, nama, lat: o.lat, lon: o.lon, kapasitas: kap === "" ? null : kap ?? null, status: o.status == null ? "siap" : pilih(o.status, STATUS, "status"), catatan: bersih(o.catatan, 200) || null, ...w};
}

const simpan = rute(async (env, req, url, kini) => {
  const tamu = await gerbangTulis(env, req); if (tamu) return tamu;
  const o = await badan(env, req); if (o instanceof Response) return o;
  const bencana = typeof o.bencana === "string" ? o.bencana : "", k = bencanaAktif(env, bencana), w = wilayah(o);
  const p = await penulis(env, req, w.prov, w.kab); if (p instanceof Response) return p;
  const {oleh} = p, t = {...titik(o, k, w), bencana};
  if (o.id != null) {   // ubah: baris harus ada, aktif, dan di wilayah pemanggil (kepemilikan dicek pada BARIS, bukan pada badan)
    const id = typeof o.id === "string" && RE_ID.test(o.id) ? o.id : tolak("id harus 16 heks");
    const lama = await pbTitikById(env, pelakuPbBaca, id); if (!lama) return gagal(404, "titik tidak ditemukan");
    if (!oleh.startsWith("admin:") && (await penulis(env, req, lama.prov, lama.kab)) instanceof Response) return gagal(403, "titik ini di luar wilayah akun Anda");
    if (lama.dihapus != null) return gagal(409, "titik ini sudah dihapus");
    if (lama.bencana !== bencana || lama.prov !== w.prov || lama.kab !== w.kab) return gagal(400, "bencana dan wilayah titik tidak dapat dipindah; hapus lalu isi ulang");
    if (!await lajuOK(env, oleh, kini)) return lambat();
    const {dihapus, ...sebelum} = lama, {golongan, jenis, nama, lat, lon, kapasitas, status, catatan} = t;
    await batchTulis(env, [pbStmtTitikUbah(env, pelakuPbTulis, id, t, kini), pbStmtLog(env, pelakuPbTulis, kini, oleh, "pb_titik", id, "ubah", sebelum, {golongan, jenis, nama, lat, lon, kapasitas, status, catatan})]);
    return json({ok: true, id});
  }
  if (!await lajuOK(env, oleh, kini)) return lambat();
  t.id = acak(8);
  await batchTulis(env, [pbStmtTitikSisip(env, pelakuPbTulis, t, oleh, kini), pbStmtLog(env, pelakuPbTulis, kini, oleh, "pb_titik", t.id, "isi", null, t)]);
  return json({ok: true, id: t.id}, 201);
});

const hapus = rute(async (env, req, url, kini) => {
  const tamu = await gerbangTulis(env, req); if (tamu) return tamu;
  const o = await badan(env, req); if (o instanceof Response) return o;
  const id = typeof o.id === "string" && RE_ID.test(o.id) ? o.id : tolak("id harus 16 heks"), alasan = bersih(o.alasan, 300);
  if (alasan.length < 5) tolak("alasan hapus wajib, 5 sampai 300 karakter");
  const lama = await pbTitikById(env, pelakuPbBaca, id); if (!lama) return gagal(404, "titik tidak ditemukan");
  bencanaAktif(env, lama.bencana);
  const p = await penulis(env, req, lama.prov, lama.kab); if (p instanceof Response) return p;
  if (lama.dihapus != null) return gagal(409, "titik ini sudah dihapus");
  if (!await lajuOK(env, p.oleh, kini)) return lambat();
  const {dihapus, ...sebelum} = lama;
  await batchTulis(env, [pbStmtTitikHapus(env, pelakuPbTulis, id, kini), pbStmtLog(env, pelakuPbTulis, kini, p.oleh, "pb_titik", id, "hapus", sebelum, null, alasan)]);
  return json({ok: true});
});

/* gerbang baca bersama: akun gerbang/moderator, staf berperan (udara dan tmc hanya karhutla dan udara), pemirsa pusdalops; staf berwilayah hanya provinsinya.
   berkas = true: pemirsa tidak boleh (Q31 bawaan: pemirsa hanya daftar) */
async function izinBaca(env, req, bencana, prov, berkas = false) {
  const adm = await adminOK(env, req), s = adm ? null : await stafSesiSemua(env, req);
  if (s) {
    const peran = s.peran ?? [];
    if (!peran.some(r => PERAN_SEMUA.includes(r))) {
      if (!peran.some(r => PERAN_BACA.includes(r))) return gagal(403, "data sarana hanya untuk akun centurisk97, staf berperan, atau moderator");
      if (!BENCANA_UDARA.includes(bencana)) return gagal(403, "peran ini hanya membaca karhutla dan udara");
    }
    if (!dalamWilayahStaf(req, [prov])) return gagal(403, "provinsi di luar wilayah akun Anda");
  } else if (!adm && (berkas || !await pemirsaLihat(env, req))) return gagal(403, "data sarana hanya untuk akun centurisk97, staf berperan, atau moderator");
  return null;
}
const daftar = rute(async (env, req, url) => {
  const q = url.searchParams, bencana = q.get("bencana") ?? "";
  bencanaAktif(env, bencana);
  const w = wilayah({prov: q.get("prov"), kab: q.get("kab")}), golongan = q.get("golongan") ?? "", jenis = q.get("jenis") ?? "";
  if (golongan) pilih(golongan, ["sarana", "fasilitas"], "golongan");
  if (jenis) pilih(jenis, [...SARANA, ...FASILITAS], "jenis");
  const tolakBaca = await izinBaca(env, req, bencana, w.prov); if (tolakBaca) return tolakBaca;
  try { return json({tersedia: true, titik: await pbTitikDaftar(env, pelakuPbBaca, {...w, bencana, golongan, jenis})}); }
  catch (e) { if (tanpaTabelPb(e)) return json({tersedia: false, titik: []}); throw e; }
});


/* ======================================================================================================================================================
   PB-12 renlap generik (F-3; DESAIN-TEKNIS paritas-bencana 3.2, 4, 5; KEAMANAN-PRIVASI 2, 6). Metadata di D1 pb_renlap, berkas di R2 MEDIA operasi/renlap/<bencana>/<tanggal>/<prov>[-<kab>]/v<versi>/renlap.<fmt>.
   Status: diminta -> draf (callback mesin) | gagal; draf -> terbit -> selesai. Tidak ada jalan mundur dan tidak ada hapus.
   PB-14: sesudah baris `diminta` tercatat, `minta` memicu workflow renlap-pb.yml (workflow_dispatch, GITHUB_TOKEN); mesin membaca titik lewat GET /api/pb/titik/mesin dan memanggil
   /api/pb/renlap/selesai. Pemicu gagal tidak membatalkan baris; permintaan lebih dari 30 menit boleh diulang (jendela 409 habis). */
const FMT = {json: "application/json; charset=utf-8", pdf: "application/pdf", kml: "application/vnd.google-earth.kml+xml", gpx: "application/gpx+xml", txt: "text/plain; charset=utf-8"};
const MAKS_PDF = 15e6, MAKS_JSON = 2e6, MAKS_LAIN = 1e6, TAHAN_MINTA = 30 * 60e3, MAKS_MINTA_JAM = 6, BERLAKU_MS = 14 * 864e5, RE_TGL = /^\d{4}-\d{2}-\d{2}$/;
const hariWib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
const kunciR2 = (r, fmt) => `operasi/renlap/${r.bencana}/${r.tanggal}/${r.prov}${r.kab ? "-" + r.kab : ""}/v${r.versi}/renlap.${fmt}`;
async function hmacHex(kunci, pesan) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(kunci), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(pesan)))].map(x => x.toString(16).padStart(2, "0")).join("");
}
/* ringkas isi berkas untuk pesan HMAC: "fmt:sha256" urut abjad, dipisah koma; mesin menghitung sama (PB-14). Kosong = "". */
const ringkasBerkas = async isi => (await Promise.all(Object.keys(isi).sort().map(async f => `${f}:${typeof isi[f] === "string" ? await sha(isi[f]) : "-"}`))).join(",");
const RE_PRIBADI = /(?:^|[^\d])(?:\+62|62|0)8\d{8,11}(?!\d)|(?:^|[^\d.])\d{16}(?![\d.])/;   // nomor HP dan NIK 16 digit; koordinat berdesimal tidak kena
const samaTetap = (x, y) => { if (x.length !== y.length) return false; let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i); return d === 0; };
const idBody = o => typeof o.id === "string" && RE_ID.test(o.id) ? o.id : tolak("id harus 16 heks");

/* badan dispatch workflow renlap-pb.yml: semua nilai string (syarat GitHub) */
export const badanDispatch = (r, versi) => ({ref: "main", inputs: {renlap_id: r.id, bencana: r.bencana, prov: r.prov, kab: r.kab ?? "", tanggal: r.tanggal, versi: String(versi)}});
async function picuRenlap(env, r, versi) {
  if (!env.GITHUB_TOKEN) return {picu: false, pesan: "mesin belum disambungkan"};
  try {
    const x = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO || "terasurbannetwork/poskokarhutla"}/actions/workflows/renlap-pb.yml/dispatches`, {method: "POST", signal: AbortSignal.timeout(8000),
      headers: {authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "pb-renlap", "content-type": "application/json"},
      body: JSON.stringify(badanDispatch(r, versi))});
    x.body?.cancel().catch(() => {});
    if (x.status === 204) return {picu: true};
    console.error("pb renlap: dispatch ditolak HTTP", x.status);   // kode status hanya di log, tidak ke klien
    return {picu: false, pesan: "pemicu mesin gagal"};
  } catch { return {picu: false, pesan: "pemicu mesin tidak terjangkau"}; }
}

const minta = rute(async (env, req, url, kini) => {
  const tamu = await gerbangTulis(env, req); if (tamu) return tamu;
  const o = await badan(env, req); if (o instanceof Response) return o;
  const bencana = typeof o.bencana === "string" ? o.bencana : "", k = bencanaAktif(env, bencana);
  if (!k.renlap) return gagal(404, "renlap belum menyala untuk bencana ini");
  const w = wilayah(o);
  const tanggal = typeof o.tanggal === "string" && RE_TGL.test(o.tanggal) ? o.tanggal : tolak("tanggal harus YYYY-MM-DD");
  const hari = hariWib(kini);
  if (tanggal > hari || tanggal < hariWib(kini - 7 * 864e5) || isNaN(Date.parse(tanggal))) tolak("tanggal harus hari ini atau paling lama 7 hari ke belakang");
  const p = await penulis(env, req, w.prov, w.kab); if (p instanceof Response) return p;
  if (!await lajuOK(env, p.oleh, kini)) return lambat();
  // ponytail: baca-lalu-tulis, dua minta serentak bisa lolos satu di atas batas; satukan ke SQL minta bila itu berarti
  if (await pbRenlapLajuMinta(env, pelakuPbTulis, p.oleh, kini - 36e5) >= MAKS_MINTA_JAM) return gagal(429, `permintaan renlap maksimal ${MAKS_MINTA_JAM} per jam per pengisi`);
  const r = {id: acak(8), bencana, ...w, tanggal};
  let baru;
  try { baru = await pbRenlapMinta(env, pelakuPbTulis, r, p.oleh, kini, TAHAN_MINTA).run(); }
  catch (e) { if (/UNIQUE|CHECK/i.test(String(e?.message))) return gagal(409, "versi renlap bentrok atau penuh; coba lagi"); throw e; }
  if (!baru.meta.changes) return gagal(409, "renlap untuk wilayah dan tanggal ini sudah diminta dan masih diproses");
  const lama = await pbRenlapById(env, pelakuPbBaca, r.id);
  await batchTulis(env, [pbStmtLog(env, pelakuPbTulis, kini, p.oleh, "pb_renlap", r.id, "minta", null, {bencana, ...w, tanggal, versi: lama.versi})]);
  return json({id: r.id, versi: lama.versi, status: "diminta", ...await picuRenlap(env, r, lama.versi)}, 201);
});

/* callback mesin: tanpa sesi, hanya HMAC. HMAC dihitung SELALU (waktu konstan); id tak dikenal, tanda salah, dan waktu basi dijawab sama (403) */
const selesai = async (env, req, url, kini) => {
  try {
    if (!env.RENLAP_KUNCI) return gagal(503, "RENLAP_KUNCI belum dipasang");
    const b = await bacaBody(req, 2.2e6), o = b.o || {}, isi = o.berkas && typeof o.berkas === "object" && !Array.isArray(o.berkas) ? o.berkas : {};   // satu badan memuat berkas teks kecil (json maks 2 MB); PDF masuk R2 lewat mesin
    const kunci = (req.headers.get("x-renlap-kunci") || "").toLowerCase(), wt = req.headers.get("x-renlap-waktu") || "";
    const waktuOK = /^\d{9,12}$/.test(wt) && Math.abs(kini / 1000 - Number(wt)) <= 300;
    const sah = samaTetap(kunci, await hmacHex(env.RENLAP_KUNCI, `${typeof o.id === "string" ? o.id : ""}|${wt}|${typeof o.status === "string" ? o.status : ""}|${await ringkasBerkas(isi)}`));   // tanda tangan mengikat isi berkas
    const r = sah && waktuOK && typeof o.id === "string" && RE_ID.test(o.id) ? await pbRenlapById(env, pelakuPbBaca, o.id) : null;
    if (!r) return await lajuIP(env, req, "pb_renlap.gagal", [[36e5, 20]], kini) ?? gagal(403, "tanda tangan, waktu, atau id tidak berlaku");   // percobaan salah dibatasi per IP
    if (b.galat) return gagal(b.status || 400, b.galat);
    if (!["draf", "gagal"].includes(o.status)) return gagal(400, "status harus draf atau gagal");
    if (r.status !== "diminta") return gagal(409, "renlap sudah diproses; transisi mundur atau ulang ditolak");
    const f = {};
    if (o.status === "gagal") { f.galat = bersih(o.galat ?? "gagal tanpa keterangan", 200) || "gagal tanpa keterangan"; }
    else {
      if (o.jml_target != null) f.jml = Number.isInteger(o.jml_target) && o.jml_target >= 0 && o.jml_target <= 500 ? o.jml_target : tolak("jml_target harus 0 sampai 500");
      if (o.sha != null) f.sha = typeof o.sha === "string" && /^[0-9a-f]{64}$/.test(o.sha) ? o.sha : tolak("sha harus 64 heks");
      if (o.ukuran != null) f.ukuran = Number.isInteger(o.ukuran) && o.ukuran >= 0 && o.ukuran <= MAKS_PDF ? o.ukuran : tolak("ukuran di luar batas");
      if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
      for (const fmt of Object.keys(isi)) {   // kunci disusun server dari baris; tulis SEKALI, yang sudah ada tidak ditimpa
        if (!Object.hasOwn(FMT, fmt) || fmt === "pdf" || typeof isi[fmt] !== "string") tolak("berkas yang boleh dikirim: json, kml, gpx, txt (teks)");
        if (new TextEncoder().encode(isi[fmt]).length > (fmt === "json" ? MAKS_JSON : MAKS_LAIN)) return gagal(413, `berkas ${fmt} terlalu besar`);
        if (RE_PRIBADI.test(isi[fmt])) return gagal(422, `berkas ${fmt} memuat nomor telepon atau NIK; renlap tanpa data pribadi`);
      }
      for (const fmt of Object.keys(isi)) {
        if (!await env.MEDIA.put(kunciR2(r, fmt), isi[fmt], {onlyIf: {etagDoesNotMatch: "*"}, httpMetadata: {contentType: FMT[fmt]}, customMetadata: {dibuat: String(kini), oleh_kelas: "mesin"}})) return gagal(409, `berkas ${fmt} sudah ada dan tidak ditimpa`);
      }
      if (!await env.MEDIA.head(kunciR2(r, "json"))) return gagal(409, "renlap.json belum ada di R2");
    }
    if (!await pbRenlapGeser(env, pelakuPbTulis, r.id, "diminta", o.status, f, kini)) return gagal(409, "renlap sudah diproses");
    await batchTulis(env, [pbStmtLog(env, pelakuPbTulis, kini, "mesin", "pb_renlap", r.id, o.status === "gagal" ? "gagal" : "ubah", {status: "diminta"}, {status: o.status})]);
    return json({id: r.id, status: o.status});
  } catch (e) {
    if (e instanceof Galat) return gagal(e.status, e.pesan);
    if (tanpaTabelPb(e)) return gagal(503, MIGRASI);
    throw e;
  }
};

/* mesin membaca titik: tanpa sesi, HMAC(RENLAP_KUNCI, `titik|waktu|bencana|prov|kab`); kegagalan tanda tangan 403 seragam, sesudah 20 kegagalan per IP per jam 429; panggilan sah tidak dibatasi (baca saja, tanpa oleh, terikat wilayah). Kolom sama dengan GET staf */
const titikMesin = rute(async (env, req, url, kini) => {
  if (!env.RENLAP_KUNCI) return gagal(503, "RENLAP_KUNCI belum dipasang");
  const q = url.searchParams, [bencana, prov, kab] = ["bencana", "prov", "kab"].map(k => q.get(k) ?? "");
  const kunci = (req.headers.get("x-renlap-kunci") || "").toLowerCase(), wt = req.headers.get("x-renlap-waktu") || "";
  const sah = samaTetap(kunci, await hmacHex(env.RENLAP_KUNCI, `titik|${wt}|${bencana}|${prov}|${kab}`));
  if (!sah || !/^\d{9,12}$/.test(wt) || Math.abs(kini / 1000 - Number(wt)) > 300) return await lajuIP(env, req, "pb_renlap.gagal", [[36e5, 20]], kini) ?? gagal(403, "tanda tangan atau waktu tidak berlaku");
  bencanaAktif(env, bencana);
  const w = wilayah({prov, kab: kab || undefined});
  try { return json({titik: await pbTitikDaftar(env, pelakuPbBaca, {...w, bencana})}); }
  catch (e) { if (tanpaTabelPb(e)) return json({titik: []}); throw e; }
});

/* terbit: draf -> terbit (+14 hari, Q26); selesai-tandai: terbit -> selesai. Penulis wilayah baris, bukan wilayah badan */
const geser = (dari, ke, aksi) => rute(async (env, req, url, kini) => {
  const tamu = await gerbangTulis(env, req); if (tamu) return tamu;
  const o = await badan(env, req); if (o instanceof Response) return o;
  const id = idBody(o), r = await pbRenlapById(env, pelakuPbBaca, id); if (!r) return gagal(404, "renlap tidak ditemukan");
  bencanaAktif(env, r.bencana);
  const p = await penulis(env, req, r.prov, r.kab); if (p instanceof Response) return p;
  if (!await lajuOK(env, p.oleh, kini)) return lambat();
  if (!await pbRenlapGeser(env, pelakuPbTulis, id, dari, ke, {berlaku: ke === "terbit" ? kini + BERLAKU_MS : undefined}, kini)) return gagal(409, `hanya renlap berstatus ${dari} yang dapat menjadi ${ke}`);
  await batchTulis(env, [pbStmtLog(env, pelakuPbTulis, kini, p.oleh, "pb_renlap", id, aksi, {status: dari}, {status: ke})]);
  return json({id, status: ke});
});

const daftarRenlap = rute(async (env, req, url, kini) => {
  const q = url.searchParams, bencana = q.get("bencana") ?? "";
  bencanaAktif(env, bencana);
  const prov = q.get("prov") ?? "";
  if (prov) wilayah({prov});
  const sampai = q.get("sampai") ?? hariWib(kini), dari = q.get("dari") ?? hariWib(Date.parse(sampai) - 30 * 864e5);
  if (!RE_TGL.test(dari) || !RE_TGL.test(sampai) || isNaN(Date.parse(dari)) || isNaN(Date.parse(sampai))) tolak("dari dan sampai harus YYYY-MM-DD");
  if (Date.parse(sampai) - Date.parse(dari) > 92 * 864e5) tolak("rentang paling lama 92 hari");
  const t = await izinBaca(env, req, bencana, prov || "00"); if (t) return t;   // staf berwilayah wajib menyebut provinsinya
  try { return json({tersedia: true, renlap: (await pbRenlapDaftar(env, pelakuPbBaca, dari, sampai, bencana, prov))}); }
  catch (e) { if (tanpaTabelPb(e)) return json({tersedia: false, renlap: []}); throw e; }
});

const berkas = rute(async (env, req, url) => {
  const q = url.searchParams, id = q.get("id") ?? "", fmt = q.get("fmt") ?? "";
  if (!RE_ID.test(id)) tolak("id harus 16 heks");
  if (!Object.hasOwn(FMT, fmt)) tolak(`fmt harus salah satu dari: ${Object.keys(FMT).join(", ")}`);
  const r = await pbRenlapById(env, pelakuPbBaca, id); if (!r) return await izinBaca(env, req, "", "00", true) ?? gagal(404, "renlap tidak ditemukan");   // tamu: 403 seragam, ada atau tidak
  const t = await izinBaca(env, req, r.bencana, r.prov, true); if (t) return t;
  if (!["draf", "terbit", "selesai"].includes(r.status)) return gagal(409, "renlap belum siap");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersedia");
  const o = await env.MEDIA.get(kunciR2(r, fmt)); if (!o) return gagal(404, "berkas tidak ada");
  return new Response(o.body, {headers: {"content-type": FMT[fmt], "content-disposition": `attachment; filename="renlap-${r.bencana}-${r.tanggal}-v${r.versi}.${fmt}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox"}});
});

/* ======================================================================================================================================================
   PB-16 hasil tindakan dan kepatuhan (F-5). Hanya untuk renlap terbit/selesai; hak tulis = wilayah BARIS renlap; log memuat jumlah, bukan butir (batas 8 KB); tanpa nama orang. */
const ALASAN = ["akses_terputus", "cuaca", "sarana_kurang", "warga_menolak", "sudah_aman", "lokasi_salah", "lainnya"], HASIL = ["selesai", "sebagian", "belum", "eskalasi"];
function butir(x, maks) {
  if (!x || typeof x !== "object" || Array.isArray(x)) tolak("tiap butir harus objek");
  const target_no = Number.isInteger(x.target_no) && x.target_no >= 1 && x.target_no <= (maks ?? 500) ? x.target_no : tolak(`target_no harus bilangan bulat 1 sampai ${maks ?? 500}`);
  const d = x.didatangi === true || x.didatangi === 1 ? 1 : x.didatangi === false || x.didatangi === 0 ? 0 : x.didatangi == null ? null : tolak("didatangi harus true, false, atau kosong");
  if (x.alasan != null && d !== 0) tolak("alasan hanya untuk target yang tidak didatangi");
  return {target_no, didatangi: d, alasan: x.alasan == null ? null : pilih(x.alasan, ALASAN, "alasan"), hasil: x.hasil == null ? null : pilih(x.hasil, HASIL, "hasil"), catatan: bersih(x.catatan, 200) || null};
}
const hasil = rute(async (env, req, url, kini) => {
  const tamu = await gerbangTulis(env, req); if (tamu) return tamu;
  const o = await badan(env, req); if (o instanceof Response) return o;
  const id = idBody(o);
  if (!Array.isArray(o.butir) || !o.butir.length || o.butir.length > 100) tolak("butir harus daftar 1 sampai 100 isi");
  const r = await pbRenlapById(env, pelakuPbBaca, id); if (!r) return gagal(404, "renlap tidak ditemukan");
  bencanaAktif(env, r.bencana);
  const p = await penulis(env, req, r.prov, r.kab); if (p instanceof Response) return p;
  const bs = o.butir.map(x => butir(x, r.jml_target ?? 500));
  if (new Set(bs.map(x => x.target_no)).size !== bs.length) tolak("target_no kembar dalam satu permintaan");
  if (!["terbit", "selesai"].includes(r.status)) return gagal(409, "hasil hanya untuk renlap berstatus terbit atau selesai");
  if (!await lajuOK(env, p.oleh, kini)) return lambat();
  await batchTulis(env, [...bs.map(b => pbStmtHasil(env, pelakuPbTulis, id, b, p.oleh, kini)),
    pbStmtLog(env, pelakuPbTulis, kini, p.oleh, "pb_renlap_hasil", id, "isi", null, {butir: bs.length, didatangi: bs.filter(b => b.didatangi === 1).length})]);
  return json({ok: true, butir: bs.length});
});
const kepatuhan = rute(async (env, req, url, kini) => {
  const q = url.searchParams, bencana = q.get("bencana") ?? "";
  bencanaAktif(env, bencana);
  const prov = q.get("prov") ?? "";
  if (prov) wilayah({prov});
  const sampai = q.get("sampai") ?? hariWib(kini), dari = q.get("dari") ?? hariWib(Date.parse(sampai) - 30 * 864e5);
  if (!RE_TGL.test(dari) || !RE_TGL.test(sampai) || isNaN(Date.parse(dari)) || isNaN(Date.parse(sampai))) tolak("dari dan sampai harus YYYY-MM-DD");
  if (Date.parse(sampai) - Date.parse(dari) > 31 * 864e5) tolak("rentang paling lama 31 hari");
  const t = await izinBaca(env, req, bencana, prov || "00"); if (t) return t;
  try {
    const k = await pbKepatuhan(env, pelakuPbBaca, dari, sampai, bencana, prov), per_alasan = {};
    let didatangi = 0, baris = 0;
    for (const x of k.rinci) { baris += x.n; if (x.didatangi === 1) didatangi += x.n; else if (x.didatangi === 0) per_alasan[x.alasan ?? "tanpa_alasan"] = (per_alasan[x.alasan ?? "tanpa_alasan"] ?? 0) + x.n; }
    return json({tersedia: true, renlap: k.renlap, target: k.target, didatangi, belum_diisi: Math.max(0, k.target - baris), persen: k.target > 0 ? Math.round(1000 * didatangi / k.target) / 10 : null, per_alasan});
  } catch (e) { if (tanpaTabelPb(e)) return json({tersedia: false}); throw e; }
});

/* digabung ke RUTE di src/worker.js; nama jalur tanpa garis bawah (gerbang cakupan) */
export const RUTE_PB = {
  "GET /api/pb/titik": daftar,
  "POST /api/pb/titik": simpan,
  "POST /api/pb/titik/hapus": hapus,
  "GET /api/pb/titik/mesin": titikMesin,
  "GET /api/pb/renlap": daftarRenlap,
  "POST /api/pb/renlap": minta,
  "POST /api/pb/renlap/selesai": selesai,
  "POST /api/pb/renlap/terbit": geser("draf", "terbit", "terbit"),
  "POST /api/pb/renlap/selesai-tandai": geser("terbit", "selesai", "selesai"),
  "GET /api/pb/renlap/berkas": berkas,
  "POST /api/pb/hasil": hasil,
  "GET /api/pb/kepatuhan": kepatuhan,
};
