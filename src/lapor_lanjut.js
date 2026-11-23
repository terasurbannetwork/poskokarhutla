/* Data lanjutan BPBD di Worker (paket data/kajian-bnpb/lapor-lanjutan/, tiket LJ-03; AGENTS 2.31). Spek dan hitungan murni di src/lapor_lanjut_spek.js,
   semua SQL di src/hak.js (bagian Data lanjutan BPBD, migrasi 0161).
   Pembukaan berkas (D1, D2): tiket LA- bertingkat bpbd yang wilayah laporannya sama dengan kab izin pelapor membuka satu berkas per (induk, kab); ketua
   mendapat tautan sekali pakai lewat antrean lj_kabar. Hak (D20): token tautan ditukar kuki HttpOnly per orang (lapor_data, jalur /api/lapor/data);
   staf BNPB dan akun lembaga lewat hakMeja (src/lapor_ai.js). Data pribadi: tim melihat utuh, staf tersamar sampai Tampilkan (Q6), akun lembaga kab
   tersamar, provinsi hanya rekap (Q15). Tiap buka, tampil, dan unduh tercatat di lj_akses (D22). Jawaban privat: cache-control private no-store. */
import {json, bacaBody, sha, acak} from "./worker.js";
import {lajuIP} from "./bnpb.js";
import {hakMeja} from "./lapor_ai.js";
import {modAtauStaf} from "./staf.js";
import {bakuKab, dalamWilayah} from "./lapor_meja_hak.js";
import {tglWib} from "./lapor_tampil.js";
import {rekap} from "./lapor_lanjut_spek.js";
import * as H from "./hak.js";

const JAM = 3600e3, HARI = 864e5, UMUR_TOKEN = 30 * HARI;   // Q11: 30 hari
const HDR = {"cache-control": "private, no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer"};
const kirim = (kode, isi, tambah = {}) => json(isi, kode, {...HDR, ...tambah});
const galat = (kode, pesan) => kirim(kode, {galat: pesan});
const P = H.pelakuLpPelapor, STAF = H.pelakuLpStaf, TIM = H.pelakuLjTim;
const RE_TOKEN = /^[0-9a-f]{32}$/, RE_KUKI = /(?:^|;\s*)lapor_data=([0-9a-f]{64})(?:;|$)/, RE_ID = /^[0-9a-f]{16}$/;
const tabelBelum = e => /no such table/i.test(String(e?.message));
const kukiData = (k, umurDetik) => `lapor_data=${k}; Max-Age=${umurDetik}; Path=/api/lapor/data; HttpOnly; Secure; SameSite=Lax`;

/* ---------- penyamaran untuk staf dan akun lembaga (Q6, Q15): murni ---------- */
const samarTeks = s => { const t = String(s); return t.length <= 1 ? "*" : t[0] + "*".repeat(Math.min(t.length - 1, 8)); };
const samarAngka = s => { const t = String(s); return t === "tidak_ada" ? t : "*".repeat(Math.max(t.length - 4, 0)) + t.slice(-4); };
export function samarPribadi(p) {
  if (!p) return null;
  const o = {};
  for (const [k, v] of Object.entries(p)) o[k] = /^(hp|kontak_hp|nik|nik_kk)$/.test(k) ? samarAngka(v) : /^(nama|kk|pemilik|kontak_nama)$/.test(k) ? samarTeks(v) : "(disembunyikan)";
  return o;
}
export const samarWa = wa => String(wa).slice(0, 4) + "*****" + String(wa).slice(-3);
/* kab izin (kode "31.75" atau nama "Kab. Bogor") sama dengan wilayah laporan (kode wilayah, bukan isian pelapor; D95 induk) */
export const kabSama = (izinKab, w) => !!izinKab && !!w?.kabKode && (/^\d{2}\.\d{2}$/.test(izinKab) ? izinKab === w.kabKode : !!w.kab && bakuKab(izinKab) === bakuKab(w.kab));

/* ---------- pembukaan berkas (dipanggil sesudah tiket terkirim, src/lapor_ai.js pesan()). Idempoten: UNIQUE (induk, kab). ---------- */
export async function bukaBerkas(env, nomor, kini, origin) {
  const s = await H.lpSesiNomor(env, P, nomor); if (!s?.terkirim) return {buka: false, sebab: "belum_terkirim"};
  let kerja; try { kerja = JSON.parse(s.kerja); } catch { return {buka: false, sebab: "sesi_rusak"}; }
  if (kerja.tingkat !== "bpbd" || kerja.susulanDari) return {buka: false, sebab: "bukan_bpbd"};
  const izin = await H.lpIzin(env, P, s.wa), w = kerja.isian?.lokasi?.nilai?.wilayah;
  if (izin?.peran !== "bpbd") return {buka: false, sebab: "izin"};
  if (!kabSama(izin.kab, w)) return {buka: false, sebab: "luar_kab"};   // D1: BPBD yang melapor di luar kab izinnya tidak mendapat berkas
  const induk = (await H.ljIndukKelompok(env, P, nomor).catch(e => { if (tabelBelum(e)) return null; throw e; })) || nomor;
  const ada = await H.ljBerkasDari(env, P, induk, w.kabKode); if (ada) return {buka: false, sebab: "sudah_ada", berkas: ada.id};
  const id = acak(8), t = acak(16), teks = `Laporan awal ${nomor} sudah kami terima. Terima kasih.\n`
    + `Sekarang Anda bisa mendata rumah, prasarana, pengungsi, dan korban satu per satu lewat tautan ini: ${origin}/lapor/data/?t=${t}\n`
    + "Tautan ini khusus untuk Anda dan berlaku 30 hari. Jangan dibagikan. Anggota tim bisa ditambah dari menu Tim.";
  const r = await H.ljBatch(env, P, [H.ljStmtBerkasBaru(env, P, {id, induk, kab: w.kabKode, isian: JSON.stringify({kab_nama: w.kab ?? null})}, kini),
    H.ljStmtTimBaru(env, P, id, s.wa, "ketua", await sha(t), kini + UMUR_TOKEN, "sistem", kini, true),
    H.ljStmtKabar(env, P, s.wa, "pembuka", teks, kini, true)]);
  return r[0].meta.changes ? {buka: true, berkas: id} : {buka: false, sebab: "sudah_ada"};   // balapan dua tiket: INSERT OR IGNORE kalah, ketua dan pesan tidak ditulis
}

/* hak staf dan lembaga (Q15, matriks KEAMANAN-PRIVASI): BNPB hanya admin dan staf Pusdalops; Koordalops dan staf lain tidak, walau meja Lapor menerimanya.
   Akun lembaga pemda lewat hakMeja seperti meja. Hasil seperti hakMeja: {c, oleh}, {tolak}, atau null. */
async function hakData(env, req, kini) {
  const h = await hakMeja(env, req, kini);
  if (!h || h.tolak || h.c.jenis !== "bnpb") return h;
  return await modAtauStaf(env, req, ["pusdalops"]) ? h : null;
}
const BACA = [[JAM, 300]], TAMPIL = [[JAM, 60]];   // per IP: baca berkas dan daftar menulis lj_akses; Tampilkan membuka data pribadi utuh

/* ---------- identitas tim dari kuki ---------- */
async function timDari(env, req, kini) {
  const k = RE_KUKI.exec(req.headers.get("cookie") || "")?.[1]; if (!k) return null;
  const t = await H.ljTimToken(env, TIM, await sha(k));
  return t && !t.dicabut && t.kedaluwarsa > kini ? t : null;
}

/* POST /api/lapor/data/masuk {t}: token tautan sekali pakai ditukar kuki per orang */
async function masuk(env, req, url, kini) {
  if (req.headers.get("x-pb") !== "1") return galat(403, "kiriman web wajib membawa header x-pb: 1");
  const lj = await lajuIP(env, req, "lapor.data.masuk", [[JAM, 30]], kini); if (lj) return lj;
  const b = await bacaBody(req, 512); if (b.galat) return galat(b.status || 400, b.galat);
  const t = b.o?.t; if (typeof t !== "string" || !RE_TOKEN.test(t)) return galat(400, "Tautan tidak sah.");
  const lama = await sha(t), baris = await H.ljTimToken(env, TIM, lama);
  if (!baris || baris.dicabut || baris.kedaluwarsa <= kini) return galat(403, "Tautan ini sudah dipakai, sudah tidak berlaku, atau aksesnya dicabut. Minta tautan baru ke ketua tim.");
  const k = acak(32), kd = kini + UMUR_TOKEN;
  const r = await H.ljBatch(env, TIM, [H.ljStmtTukarToken(env, TIM, lama, await sha(k), kd), H.ljStmtAkses(env, TIM, baris.berkas, null, "buka", `tim:${baris.wa}`, kini, true)]);
  if (!r[0].meta.changes) return galat(403, "Tautan ini sudah dipakai. Minta tautan baru ke ketua tim.");
  return kirim(200, {berkas: baris.berkas, peran: baris.peran}, {"set-cookie": kukiData(k, UMUR_TOKEN / 1000)});
}

/* bentuk berkas: tim = utuh; staf BNPB = pribadi tersamar; akun lembaga kab = tersamar; provinsi = rekap saja (Q15) */
async function bentukBerkas(env, b, tingkat, kini) {
  const p = tingkat === "tim" ? TIM : STAF, objek = (await H.ljObjek(env, p, b.id)).map(o => ({...o, data: JSON.parse(o.data), pribadi: o.pribadi ? JSON.parse(o.pribadi) : null}));
  let isian = {}; try { isian = JSON.parse(b.isian); } catch {}
  const r = rekap(objek, {nihil: new Set(Array.isArray(isian.nihil) ? isian.nihil : []), tgl: tglWib(kini)});
  const berkas = {id: b.id, induk: b.induk, kab: b.kab, kejadian_id: b.kejadian_id, status: b.status, isian, ditutup: b.ditutup, diubah: b.diubah};
  if (tingkat === "rekap") return {berkas, rekap: r};
  const tim = (await H.ljTim(env, p, b.id)).map(x => ({wa: tingkat === "tim" ? x.wa : samarWa(x.wa), nama: x.nama, peran: x.peran, aktif: !x.dicabut}));
  return {berkas, rekap: r, tim, objek: objek.map(o => ({id: o.id, jenis: o.jenis, urut: o.urut, data: o.data, pribadi: tingkat === "tim" ? o.pribadi : samarPribadi(o.pribadi),
    titik_id: o.titik_id, desa: o.desa, lat: o.lat, lon: o.lon, status: o.status, rev: o.rev, diubah: o.diubah}))};
}
/* akun lembaga (Q15): kab lewat dalamWilayah yang sama dengan meja (kode atau nama baku; nama kab disimpan sistem di isian.kab_nama saat berkas dibuka),
   provinsi hanya rekap kab di provinsinya; di luar wilayah = null */
const namaKab = b => { try { return JSON.parse(b.isian)?.kab_nama ?? null; } catch { return null; } };
const lingkupLembaga = (c, b) => c.jenis === "bnpb" ? "staf"
  : !dalamWilayah(c, {provKode: b.kab.slice(0, 2), kabKode: b.kab, kab: namaKab(b)}) ? null : c.tingkat === "prov" ? "rekap" : "lembaga";

/* GET /api/lapor/data/berkas[?id=]: kuki tim membuka berkasnya; staf dan akun lembaga dengan ?id= */
async function berkasGet(env, req, url, kini) {
  const lj = await lajuIP(env, req, "lapor.data.baca", BACA, kini); if (lj) return lj;
  const tim = await timDari(env, req, kini);
  const id = url.searchParams.get("id");
  if (tim && (!id || id === tim.berkas)) {
    const b = await H.ljBerkas(env, TIM, tim.berkas); if (!b) return galat(404, "Berkas tidak ditemukan.");
    await H.ljStmtAkses(env, TIM, b.id, null, "buka", `tim:${tim.wa}`, kini).run();
    return kirim(200, {...await bentukBerkas(env, b, "tim", kini), saya: {wa: tim.wa, peran: tim.peran}});
  }
  const h = await hakData(env, req, kini); if (h?.tolak) return h.tolak;
  if (!h) return galat(401, "Buka tautan dari WhatsApp, atau masuk sebagai staf atau akun lembaga.");
  if (!RE_ID.test(id || "")) return galat(400, "Berkas tidak sah.");
  const b = await H.ljBerkas(env, STAF, id); if (!b) return galat(404, "Berkas tidak ditemukan.");
  const lingkup = lingkupLembaga(h.c, b); if (!lingkup) return galat(404, "Berkas tidak ditemukan.");   // di luar wilayah: sama dengan tidak ada
  await H.ljStmtAkses(env, STAF, b.id, null, "buka", String(h.oleh).slice(0, 200), kini).run();
  return kirim(200, {...await bentukBerkas(env, b, lingkup === "rekap" ? "rekap" : "staf", kini), akun: {jenis: h.c.jenis, label: h.c.label}});
}

/* GET /api/lapor/data/daftar: staf BNPB semua berkas, akun lembaga hanya wilayahnya; jumlah objek per jenis, tanpa data pribadi */
async function daftarGet(env, req, url, kini) {
  const lj = await lajuIP(env, req, "lapor.data.baca", BACA, kini); if (lj) return lj;
  const h = await hakData(env, req, kini); if (h?.tolak) return h.tolak;
  if (!h) return galat(401, "Masuk sebagai staf atau akun lembaga.");
  const semua = (await H.ljBerkasDaftar(env, STAF)).filter(b => lingkupLembaga(h.c, b));
  const n = {}; for (const r of await H.ljHitungJenis(env, STAF, semua.map(b => b.id))) (n[r.berkas] ||= {})[r.jenis] = r.n;
  return kirim(200, {akun: {jenis: h.c.jenis, label: h.c.label}, berkas: semua.map(b => ({id: b.id, induk: b.induk, kab: b.kab, kejadian_id: b.kejadian_id, status: b.status, diubah: b.diubah, objek: n[b.id] || {}}))});
}

/* POST /api/lapor/data/tampil {objek}: data pribadi utuh satu objek, hanya staf BNPB, tercatat (Q6, D22) */
async function tampilPost(env, req, url, kini) {
  const lj = await lajuIP(env, req, "lapor.data.tampil", TAMPIL, kini); if (lj) return lj;
  const h = await hakData(env, req, kini); if (h?.tolak) return h.tolak;
  if (!h || h.c.jenis !== "bnpb") return galat(403, "Hanya staf BNPB yang bisa menampilkan data pribadi.");
  const b = await bacaBody(req, 512); if (b.galat) return galat(b.status || 400, b.galat);
  const id = b.o?.objek; if (!RE_ID.test(id || "")) return galat(400, "Objek tidak sah.");
  const o = await H.ljObjekSatu(env, STAF, id); if (!o) return galat(404, "Objek tidak ditemukan.");
  await H.ljStmtAkses(env, STAF, o.berkas, o.id, "tampil_pribadi", String(h.oleh).slice(0, 200), kini).run();
  return kirim(200, {objek: o.id, pribadi: o.pribadi ? JSON.parse(o.pribadi) : null});
}

/* migrasi 0161 belum diterapkan: 503 jelas, bukan 500 */
const jaga = f => async (env, req, url, kini = Date.now()) => {
  try { return await f(env, req, url, kini); } catch (e) { if (tabelBelum(e)) return galat(503, "Data lanjutan belum aktif (migrasi 0161 belum diterapkan)."); throw e; }
};
export const RUTE_LAPOR_DATA = Object.fromEntries(Object.entries({
  "POST /api/lapor/data/masuk": masuk,
  "GET /api/lapor/data/berkas": berkasGet,
  "GET /api/lapor/data/daftar": daftarGet,
  "POST /api/lapor/data/tampil": tampilPost,
}).map(([k, f]) => [k, jaga(f)]));
