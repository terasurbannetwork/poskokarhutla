/* Ruang Unit BNPB: rute baca (RU-019) dan ketuk MB-7 (RU-033; tulis lewat modAtauStaf: akun gerbang 401, pemirsa dan operator_cc 403); data/kajian-bnpb/kedeputian/DESAIN-TEKNIS.md §1.4, §4.9, §9.4; KEAMANAN-PRIVASI.md §2.3, §3.2).
   Staf saja. Halaman: hak dulu, tamu 303 ke /admin/masuk?ke= (P-8) tanpa memeriksa kode atau berkas; sesi sah tanpa peran 403 polos (cegah pantulan);
   pemirsa ke tab pertamanya. Data: hak SEBELUM nama dan R2, gagal = 401 (tamu tidak tahu berkas ada); nama di luar DATA_UNIT 404 tanpa menyentuh R2.
   Tanpa D1 selain pemeriksaan sesi di stafOK/modAtauStaf (kuota, RU §7.2). /bnpb/unit* dikecualikan dari gerbang host (src/gerbang_halaman.js halamanTerkunci). */
import {json, gagal, catatHTML, bacaBody} from "./worker.js";
import {tx} from "./posko.js";
import {laju} from "./bnpb.js";
import {ketukTerbaru, ketukTambah, diklatTambah, diklatRingkas, aksesTambah} from "./hak.js";
import {uraiCsv} from "../public/inti/impor.js";
import {tglWIB, tglSah} from "./pusdalops_umum.js";
import {stafOK, stafPeran, modAtauStaf, stafSesiSemua} from "./staf.js";
import {pemirsaSesi} from "./pemirsa.js";
import {arahPemirsa} from "./gerbang_halaman.js";
import {halamanBnpbPublik} from "./bnpb.js";

export const P_UNIT_BACA = ["unit", "pimpinan", "koordalops", "pusdalops", "operator_cc"];
export const P_UNIT_TULIS = ["unit", "pimpinan", "koordalops", "pusdalops"];
export const KODE_UNIT = ["perb", "pspb", "spb", "pus", "pd", "ks", "mt", "kpod", "wil", "plp", "ojl", "rrx", "rrp", "rri", "rrs", "ren", "keu", "sdu", "huk", "irt", "dik", "jf"];
/* nama tetap R2 unit/<nama>.json; tiap nama wajib tercatat kelasnya di KEAMANAN-PRIVASI §3.2 di commit yang sama (tak tercatat = kelas T) */
export const DATA_UNIT = ["stok_penyangga", "pendampingan_ikd", "mitigasi_prioritas", "satu_data", "jdih_daerah", "pengadaan", "status_peraturan", "fasilitas_sosial", "kalender_gladi", "kompetensi", "kalender_monev", "rb", "ikk", "hibah_prioritas", "prepositioning", "rpbd", "usulan_rpbd", "dokumen_siaga", "usulan_dokumen_siaga", "peta_nspk", "kerugian", "sendai", "klaster_logistik", "neraca_rumah", "rugi_tani", "diklat_sasaran", "belanja_risiko", "amanat", "usulan_amanat", "rapor_darurat", "meja_wilayah", "akses_putus", "kib_cocok", "rapor_peringatan", "cakupan_ews", "evakuasi", "dana_bersama_katalog", "kampanye"];
export const DATA_UNIT_TERBATAS = ["pengadaan", "rapor_darurat"];   // kelas T: modAtauStaf, akun gerbang AKUN_SITUS* ditolak
const JAM = 3600e3, MAKS_BYTE = 8 * 1024 * 1024;
const H_DATA = {"cache-control": "private, max-age=300", vary: "cookie"};

const alihkan = ke => new Response(null, {status: 303, headers: {location: ke, "cache-control": "no-store"}});
const polos403 = () => new Response(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Ruang Unit, Centurisk97</title></head><body><p>Akunmu tidak punya akses Ruang Unit.</p></body></html>`,
  {status: 403, headers: {"content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", vary: "cookie", "x-content-type-options": "nosniff", "x-robots-tag": "noindex, nofollow"}});

async function halaman(env, req, url, ctx, berkas, kode) {
  if (!await stafOK(env, req, P_UNIT_BACA)) {
    const p = await pemirsaSesi(env, req);
    if (p) { const ke = arahPemirsa(p, url.pathname, url.search); return ke ? alihkan(ke) : polos403(); }
    if (await stafSesiSemua(env, req)) return polos403();
    return alihkan("/admin/masuk?ke=" + encodeURIComponent(url.pathname + url.search));
  }
  if (kode !== undefined && !KODE_UNIT.includes(kode)) return gagal(404, "unit tidak dikenal");
  catatHTML(env, req, kode ? "/bnpb/unit/" + kode : "/bnpb/unit", ctx);   // K5 PRD: hitungan buka per jalur unit
  const r = await halamanBnpbPublik(env, url, berkas, {pribadi: true});
  r.headers.set("cache-control", "private, no-store"); r.headers.append("vary", "cookie");
  return r;
}

async function indeks(env, req, url, kini) {
  if (!await stafOK(env, req, P_UNIT_BACA)) return gagal(401, "perlu masuk sebagai staf BNPB");
  if (!env.MEDIA) return json({galat: "penyimpanan belum tersedia", status: "tanpa_penyimpanan"}, 503);
  const o = await env.MEDIA.get("unit/indeks.json");
  if (!o?.size) { o?.body?.cancel().catch(() => {}); return json({galat: "indeks belum diunggah", status: "belum_ada"}, 404, H_DATA); }
  let isi; try { isi = await o.json(); } catch (e) { return gagal(500, "indeks rusak"); }
  const berkas = Array.isArray(isi?.berkas) ? isi.berkas : [];
  /* DT §9.4 butir 3: umur dari waktu unggah R2 (head kelas B, tanpa D1); hanya nama di DATA_UNIT, jalur tidak pernah dirakit dari isi indeks */
  isi.berkas = await Promise.all(berkas.map(async b => {
    if (!DATA_UNIT.includes(b?.nama)) return b;
    const h = await env.MEDIA.head(`unit/${b.nama}.json`).catch(() => null), t = h?.size ? h.uploaded.getTime() : null;
    return {...b, diunggah: t && new Date(t).toISOString(), basi: t == null ? null : typeof b.basi_jam === "number" && kini - t > b.basi_jam * JAM};
  }));
  return json(isi, 200, {...H_DATA, "cache-control": "private, no-store", "x-diperbarui": o.uploaded.toISOString()});
}

async function data(env, req, url, kini, ctx, nama) {
  const t = DATA_UNIT_TERBATAS.includes(nama);   // hak SEBELUM nama dan R2: nama tak dikenal pun 401 untuk yang tak berhak
  if (!await (t ? modAtauStaf : stafOK)(env, req, P_UNIT_BACA)) return gagal(401, "perlu masuk sebagai staf BNPB");
  if (!DATA_UNIT.includes(nama)) return json({galat: "data tidak dikenal", status: "tidak_dikenal"}, 404, H_DATA);
  if (!env.MEDIA) return json({galat: "penyimpanan belum tersedia", status: "tanpa_penyimpanan"}, 503);
  const o = await env.MEDIA.get(`unit/${nama}.json`);
  if (!o?.size) { o?.body?.cancel().catch(() => {}); return json({galat: `data ${nama} belum diunggah`, status: "belum_ada"}, 404, H_DATA); }   // 0 byte = unggahan gagal
  if (o.size > MAKS_BYTE) { console.error("unit data terlalu besar", nama, o.size); o.body?.cancel().catch(() => {}); return json({galat: `berkas ${o.size} byte, batas ${MAKS_BYTE}`, status: "terlalu_besar"}, 500); }
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", ...H_DATA, "x-content-type-options": "nosniff"}});
}

/* MB-7: keputusan staf atas usulan baris. Berkas usulan_<x> harus di DATA_UNIT; medan koreksi dari daftar putih per berkas (DT §6.2 untuk usulan_rpbd;
   usulan_dokumen_siaga belum punya daftar di dokumen: koreksi ditolak, terima dan tolak jalan). Kunci tak terdaftar = 400, tanpa penyimpanan. */
export const MEDAN_KOREKSI = {usulan_rpbd: ["status", "periode", "url"], usulan_dokumen_siaga: []};
const KEPUTUSAN = ["terima", "tolak", "koreksi"], RE_USULAN = /^[0-9a-f]{16}$/, RE_BERKAS = /^usulan_[a-z0-9_]{1,32}$/;
const berkasKetuk = b => RE_BERKAS.test(b || "") && DATA_UNIT.includes(b) ? b : null;

async function ketukBaca(env, req, url) {
  if (!await stafOK(env, req, P_UNIT_BACA)) return gagal(401, "perlu masuk sebagai staf BNPB");
  const berkas = berkasKetuk(url.searchParams.get("berkas"));
  if (!berkas) return gagal(400, "berkas harus salah satu usulan_* yang dikenal");
  const baris = (await ketukTerbaru(env, berkas)).map(({id, ...r}) => ({...r, koreksi: r.koreksi ? JSON.parse(r.koreksi) : null}));
  return json({berkas, keputusan: baris}, 200, {"cache-control": "private, no-store", vary: "cookie"});
}

/* hak tulis bersama: akun gerbang AKUN_SITUS* tidak lolos; hak SEBELUM body dan D1. Mengembalikan nama pelaku atau Response galat */
async function hakTulis(env, req, oleh) {   // oleh = hasil modAtauStaf di handler (gerbang-ruang-unit butir a membaca panggilan hak di handler itu sendiri)
  if (!oleh || String(oleh).startsWith("pemirsa:")) {   // pemirsa pimpinan lolos modAtauStaf tetapi hanya membaca
    const masuk = await stafPeran(env, req, P_UNIT_BACA) || await pemirsaSesi(env, req);
    return masuk ? gagal(403, "peranmu tidak boleh menulis di Ruang Unit") : gagal(401, "perlu masuk sebagai staf BNPB");
  }
  return String(oleh).slice(0, 40);
}

async function ketukTulis(env, req, url, kini) {
  const oleh = await hakTulis(env, req, await modAtauStaf(env, req, P_UNIT_TULIS)); if (oleh instanceof Response) return oleh;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, x = Object.keys(o).find(k => !["berkas", "usulan_id", "keputusan", "koreksi", "catatan"].includes(k)); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  const berkas = berkasKetuk(o.berkas); if (!berkas) return gagal(400, "berkas harus salah satu usulan_* yang dikenal");
  if (typeof o.usulan_id !== "string" || !RE_USULAN.test(o.usulan_id)) return gagal(400, "usulan_id harus 16 heks");
  if (!KEPUTUSAN.includes(o.keputusan)) return gagal(400, "keputusan harus terima, tolak, atau koreksi");
  const catatan = tx(o.catatan, 200); if (catatan === undefined) return gagal(400, "catatan maksimal 200 huruf");
  let koreksi = null;
  if (o.keputusan === "koreksi") {
    const k = o.koreksi; if (!k || typeof k !== "object" || Array.isArray(k) || !Object.keys(k).length) return gagal(400, "koreksi wajib berupa objek berisi medan");
    const daftar = MEDAN_KOREKSI[berkas] || [], luar = Object.keys(k).find(m => !daftar.includes(m)); if (luar) return gagal(400, `medan "${luar.slice(0, 40)}" tidak boleh dikoreksi di ${berkas}`);
    const bersih = {}; for (const m of Object.keys(k)) { const v = tx(k[m], 200); if (v === undefined || v === null) return gagal(400, `medan "${m}" harus teks 1-200 huruf`);
      if (m === "url" && !(/^https?:\/\//i.test(v) && URL.canParse(v))) return gagal(400, "url harus alamat http atau https");   // tanpa javascript: atau data: (tinjauan keamanan 26 Nov 2026)
      bersih[m] = v; }
    koreksi = JSON.stringify(bersih);
  } else if (o.koreksi != null) return gagal(400, "koreksi hanya untuk keputusan koreksi");
  const lj = await laju(env, oleh, "unit.ketuk", [[JAM, 300]], kini); if (lj) return lj;
  const baris = {berkas, usulan_id: o.usulan_id, keputusan: o.keputusan, koreksi, catatan, oleh, waktu: kini};
  await ketukTambah(env, baris);
  return json({berkas, usulan_id: baris.usulan_id, keputusan: baris.keputusan, koreksi: koreksi && JSON.parse(koreksi), catatan, waktu: kini}, 201);
}

/* RU-068 DIK-1: unggah CSV angkatan diklat (tanpa nama peserta). Badan JSON {csv}; semua baris sah atau tidak ada yang tersimpan. */
const MAKS_CSV = 256 * 1024, MAKS_BARIS = 2000, KOL_DIKLAT = ["program", "jenis", "tgl_mulai", "tgl_selesai", "prov", "kab", "n_peserta", "n_lulus", "penyelenggara"];
const JENIS_DIKLAT = ["teknis_dasar", "teknis_lanjutan", "teknis_kepemimpinan", "fungsional"];
const hex16 = async t => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))).slice(0, 8)].map(x => x.toString(16).padStart(2, "0")).join("");
const KONTROL = /[\u0000-\u001f\u007f]/, bulat = v => /^\d{1,5}$/.test(v) ? Number(v) : NaN;
function cekDiklat(r) {
  const t = k => (r[k] ?? "").trim();
  if (r.program === undefined) return "kolom kurang";
  for (const [k, a, b] of [["program", 3, 120], ["penyelenggara", 2, 80]]) if (t(k).length < a || t(k).length > b || KONTROL.test(t(k)) || /^[=+\-@]/.test(t(k))) return `${k} ${a}-${b} huruf, tanpa karakter kontrol, tidak diawali = + - @`;
  if (!JENIS_DIKLAT.includes(t("jenis"))) return "jenis harus " + JENIS_DIKLAT.join(", ");
  if (!tglSah(t("tgl_mulai")) || !tglSah(t("tgl_selesai"))) return "tanggal harus YYYY-MM-DD yang sah";
  if (t("tgl_selesai") < t("tgl_mulai")) return "tgl_selesai sebelum tgl_mulai";
  if (!/^\d{2}$/.test(t("prov"))) return "prov harus 2 angka";
  if (t("kab") && !(/^\d{4}$/.test(t("kab")) && t("kab").startsWith(t("prov")))) return "kab harus kosong atau 4 angka berawalan prov";
  const n = bulat(t("n_peserta")), l = bulat(t("n_lulus"));
  if (!(n >= 1 && n <= 5000)) return "n_peserta 1-5000"; if (!(l >= 0 && l <= n)) return "n_lulus 0 sampai n_peserta";
  return null;
}
async function diklatUnggah(env, req, url, kini) {
  const oleh = await hakTulis(env, req, await modAtauStaf(env, req, P_UNIT_TULIS)); if (oleh instanceof Response) return oleh;
  const b = await bacaBody(req, MAKS_CSV + 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const x = Object.keys(b.o).find(k => k !== "csv"); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  if (typeof b.o.csv !== "string" || !b.o.csv.trim()) return gagal(400, "csv wajib (teks CSV dengan baris kepala)");
  if (b.o.csv.length > MAKS_CSV) return gagal(413, `csv ${b.o.csv.length} karakter, maksimal ${MAKS_CSV}`);
  const [kepala = [], ...isi] = uraiCsv(b.o.csv), kol = kepala.map(k => k.trim().toLowerCase());
  const asing = kol.find(k => !KOL_DIKLAT.includes(k)); if (asing) return gagal(400, `kolom "${asing.slice(0, 40)}" tidak dikenal`);
  const hilang = KOL_DIKLAT.find(k => !kol.includes(k)); if (hilang) return gagal(400, `kolom "${hilang}" wajib ada`);
  if (!isi.length) return gagal(400, "csv tidak punya baris data");
  if (isi.length > MAKS_BARIS) return gagal(413, `${isi.length} baris; maksimal ${MAKS_BARIS}`);
  const galat = [], baris = [];
  for (let i = 0; i < isi.length; i++) {
    const r = Object.fromEntries(kol.map((k, j) => [k, isi[i][j] ?? ""])), g = cekDiklat(r);
    if (g) { if (galat.length < 50) galat.push({baris: i + 2, alasan: g}); else if (galat.length === 50) galat.push({baris: i + 2, alasan: "dan seterusnya"}); continue; }
    const v = Object.fromEntries(KOL_DIKLAT.map(k => [k, r[k].trim()])); v.kab ||= null; v.n_peserta = Number(v.n_peserta); v.n_lulus = Number(v.n_lulus);
    v.id = await hex16([v.program, v.tgl_mulai, v.prov, v.kab ?? ""].join("|")); baris.push(v);
  }
  if (galat.length) return json({galat: "ada baris yang tidak sah; tidak ada yang tersimpan", baris_gagal: galat}, 422);
  const lj = await laju(env, oleh, "unit.diklat", [[24 * JAM, 10]], kini); if (lj) return lj;
  return json(await diklatTambah(env, baris, kini, oleh), 201);
}
async function diklatRingkasRute(env, req, url, kini) {
  if (!await stafOK(env, req, P_UNIT_BACA)) return gagal(401, "perlu masuk sebagai staf BNPB");
  return json({kab: await diklatRingkas(env, tglWIB(kini - 5 * 365.25 * 24 * JAM))}, 200, {"cache-control": "private, no-store", vary: "cookie"});
}

/* RU-083 RRI-1: status titik akses. titik_id harus ada di R2 unit/akses_putus.json ({titik: [{id}]} atau larik); tgl tidak lewat hari ini WIB. Hanya ditambah. */
async function aksesTulis(env, req, url, kini) {
  const oleh = await hakTulis(env, req, await modAtauStaf(env, req, P_UNIT_TULIS)); if (oleh instanceof Response) return oleh;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, x = Object.keys(o).find(k => !["titik_id", "tgl", "status", "catatan"].includes(k)); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  if (typeof o.titik_id !== "string" || !RE_USULAN.test(o.titik_id)) return gagal(400, "titik_id harus 16 heks");
  if (!tglSah(o.tgl)) return gagal(400, "tgl harus YYYY-MM-DD yang sah"); if (o.tgl > tglWIB(kini)) return gagal(400, "tgl tidak boleh di masa depan");
  if (!["putus", "darurat", "pulih"].includes(o.status)) return gagal(400, "status harus putus, darurat, atau pulih");
  const catatan = tx(o.catatan, 200); if (catatan === undefined) return gagal(400, "catatan maksimal 200 huruf");
  const lj = await laju(env, oleh, "unit.akses", [[JAM, 120]], kini); if (lj) return lj;
  if (!env.MEDIA) return json({galat: "penyimpanan belum tersedia", status: "tanpa_penyimpanan"}, 503);
  const r = await env.MEDIA.get("unit/akses_putus.json");
  if (!r?.size) { r?.body?.cancel().catch(() => {}); return json({galat: "daftar titik akses belum diunggah", status: "belum_ada"}, 404); }
  if (r.size > MAKS_BYTE) { r.body?.cancel().catch(() => {}); return gagal(500, "daftar titik terlalu besar"); }
  let d; try { d = await r.json(); } catch (e) { return gagal(500, "daftar titik rusak"); }
  if (!(Array.isArray(d) ? d : d?.titik ?? []).some(t => t?.id === o.titik_id)) return gagal(400, "titik_id tidak ada di daftar akses putus");
  try { await aksesTambah(env, {titik_id: o.titik_id, tgl: o.tgl, status: o.status, catatan, oleh, waktu: kini}); }
  catch (e) { if (/tidak boleh ditimpa|UNIQUE/i.test(String(e?.message || e))) return gagal(409, "status itu untuk titik dan tanggal itu sudah tercatat"); throw e; }
  return json({titik_id: o.titik_id, tgl: o.tgl, status: o.status, catatan, waktu: kini}, 201);
}

/* router src/worker.js: /bnpb/unit/:kode ([a-z]{2,4}) dan /api/unit/data/:nama ([a-z0-9_]{1,40}) diteruskan sebagai argumen ke-6 */
export const RUTE_UNIT = {
  "GET /bnpb/unit": (env, req, url, kini, ctx) => halaman(env, req, url, ctx, "unit/index"),
  "GET /bnpb/unit/:kode": (env, req, url, kini, ctx, kode) => halaman(env, req, url, ctx, "unit/unit", kode),
  "GET /api/unit/indeks": (env, req, url, kini) => indeks(env, req, url, kini),
  "GET /api/unit/data/:nama": data,
  "GET /api/unit/ketuk": (env, req, url) => ketukBaca(env, req, url),
  "POST /api/unit/ketuk": (env, req, url, kini) => ketukTulis(env, req, url, kini),
  "POST /api/unit/diklat/unggah": diklatUnggah,
  "GET /api/unit/diklat/ringkas": diklatRingkasRute,
  "POST /api/unit/akses": aksesTulis,
};
