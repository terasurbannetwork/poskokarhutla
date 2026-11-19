/* Lapor Bencana BNPB di Worker (data/kajian-bnpb/lapor-ai, tiket LA-05, LA-06, LA-10; AGENTS 2.30). Port dari scripts/lapor/lokal.mjs, acuan perilaku yang disetujui pemilik.
   Mesin percakapan murni = src/lapor_mesin.js (kode memegang alur, model hanya mengurai berkutipan); bentuk jawaban = src/lapor_tampil.js; info daerah = src/lapor_info.js.
   Semua SQL di src/hak.js (bagian Lapor, migrasi 0155). Foto dan dokumen di R2 MEDIA, kunci lapor/foto/<id>.jpg dan lapor/dok/<nomor>.<versi>.<pdf|docx>.
   Penjaga: (a) mesin Mac mini, Bearer WA_MESIN, membawa body.wa (gateway WA); (b) pelapor web: sesi Satu Pintu Masuk (nomor dari sesi) + x-pb: 1 pada POST;
   keduanya hanya untuk nomor di lapor_izin selama masa uji (KEPUTUSAN K2); (c) meja: admin/moderator atau staf pusdalops/koordalops (Q12) + x-pb. Tautan lacak, foto, unduhan: token 32 heks turunan HMAC
   nomor tiket (hanya sha256-nya disimpan). Jawaban privat: cache-control private no-store, x-robots-tag noindex. */
import {json, bacaBody, bacaBytes, sha, hex, acak, ipHash, cacheTepi} from "./worker.js";
import {laju, lajuIP} from "./bnpb.js";
import {modOK} from "./posko.js";
import {modAtauStaf} from "./staf.js";
import {sesiMasuk} from "./masuk_sesi.js";
import {bersihMedia} from "./media_bersih.js";
import {putaran, lengkap, T, waktuLapor} from "./lapor_mesin.js";
import {JENIS} from "./lapor_spek.js";
import {buatModel} from "./lapor_model.js";
import {buatWilayah} from "./lapor_wilayah.js";
import {buatInfo} from "./lapor_info.js";
import {STATUS, PINDAH, TAMPIL_ALUN, nomorWa, tglWib, keluaran, lanjutan, sesiTampil, jawabStatus, bahanDokumen, lacakTampil, ringkasSesi, barisMeja, barisAlun, mejaRinciTampil, labelJenis, pelakuLabel} from "./lapor_tampil.js";
import * as H from "./hak.js";

const MENIT = 60e3, HARI = 864e5, JAM = 3600e3, VERSI = 1, MAKS_TERKIRIM_HARI = 5, MAKS_FOTO = 10;
const BATAS_PESAN = [[MENIT, 20], [JAM, 60], [HARI, 120]], BATAS_IP_JAM = [[JAM, 300]];   // per nomor; per alamat IP /64 hanya pintu web
const SELESAI = new Set(["terkirim", "batal", "kedaluwarsa"]);
const HDR = {"cache-control": "private, no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer"};
const kirim = (kode, isi) => json(isi, kode, HDR);
const galat = (kode, pesan, tambah = {}) => kirim(kode, {galat: pesan, ...tambah});
const RE_NOMOR = /^LA-\d{6}-\d{2,3}$/, RE_TOKEN = /^[0-9a-f]{32}$/, RE_KODE_DESA = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/;
const BATAS_KIRIM_TEKS = `*Batas laporan harian*\nSatu nomor paling banyak ${MAKS_TERKIRIM_HARI} laporan dalam sehari. Coba lagi besok, atau hubungi 112 bila darurat.`;
const angka = v => typeof v === "number" && Number.isFinite(v);   // null, "" dan teks tidak pernah lolos jadi 0
const titikSah = (lat, lon) => angka(lat) && angka(lon) && lat >= -12 && lat <= 7 && lon >= 94 && lon <= 142;
const adaIdentitas = req => req.headers.has("authorization") || /(?:^|;\s*)sesi_masuk=/.test(req.headers.get("cookie") || "");   // dicek sebelum membaca badan besar
const lajuPublik = (env, req, aksi, maks, kini) => req.headers.get("authorization") ? null : lajuIP(env, req, aksi, [[JAM, maks]], kini);   // mesin Mac mini tidak dibatasi per IP
const P = H.pelakuLpPelapor, PUBLIK = H.pelakuLpPublik, STAF = H.pelakuLpStaf, MESIN = H.pelakuLpMesin;

/* ---------------- penjaga ---------------- */
async function mesinSah(env, req) {
  const t = /^Bearer (.+)$/.exec(req.headers.get("authorization") || "")?.[1];
  return !!(env.WA_MESIN && t && await sha(t) === await sha(env.WA_MESIN));
}
/* pemilik nomor: mesin (nomor dari body/kueri) atau sesi /masuk (nomor dari sesi). Mengembalikan {wa, saluran, izin} atau Response penolakan. */
async function pelapor(env, req, url, body) {
  let wa, saluran;
  if (req.headers.get("authorization")) {
    if (!await mesinSah(env, req)) return galat(403, "kunci mesin salah");
    wa = nomorWa(body?.wa ?? url.searchParams.get("wa")); saluran = "wa";
    if (!wa) return galat(400, "Nomor WhatsApp tidak sah.");
  } else {
    let s = null; try { s = await sesiMasuk(env, req); } catch (e) { if (!/no such table/i.test(String(e?.message))) throw e; }
    if (!s) return galat(401, "Masuk dulu dengan nomor WhatsApp Anda.");
    if (req.method === "POST" && req.headers.get("x-pb") !== "1") return galat(403, "kiriman bersesi wajib membawa header x-pb: 1");
    wa = s.wa; saluran = "web";
  }
  const izin = await H.lpIzin(env, P, wa);
  if (!izin) return galat(403, "Nomor ini belum diizinkan memakai layanan lapor (masa uji).");
  return {wa, saluran, izin};
}
/* staf meja: admin/moderator (bukan akun gerbang) atau staf pusdalops/koordalops; POST bersesi staf wajib x-pb (diperiksa stafSesiSemua) */
async function stafMeja(env, req) {
  const oleh = await modAtauStaf(env, req, ["pusdalops", "koordalops"]);
  return oleh ? (String(oleh).startsWith("staf:") ? oleh : `admin:${oleh}`) : null;
}
const tolakStaf = () => galat(403, "perlu masuk sebagai admin atau staf Pusdalops/Koordalops");

/* kuota pesan (pemilik 19 Nov 2026): lewat batas = 429 berisi balasan sopan; laporan yang sedang diisi tetap tersimpan di D1. Batas nomor dan IP dibaca sebelum baris laju ditulis. */
async function kuota(env, req, {wa, saluran}, kini, aksi = "lapor.pesan") {
  const daftar = aksi === "lapor.pesan" ? [{kunci: wa, aksi, batas: BATAS_PESAN}] : [{kunci: wa, aksi, batas: [[JAM, 30]]}];
  if (aksi === "lapor.pesan" && saluran === "web") daftar.push({kunci: await ipHash(env, req), aksi: "lapor.ip", batas: BATAS_IP_JAM});
  const r = await H.lpKuota(env, P, daftar, kini);
  if (!r) return null;
  if (aksi !== "lapor.pesan") return json({galat: "Terlalu sering. Coba lagi nanti.", sisaDetik: r.sisa}, 429, {...HDR, "retry-after": String(r.sisa)});
  const d = new Date(kini + r.sisa * 1000 + 7 * JAM), pukul = `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`;
  const balasan = `Kuota pesan untuk nomor ini habis untuk satu jam ini. Laporan Anda tersimpan; lanjutkan lagi pukul ${pukul} WIB. Bila ada nyawa terancam, telepon 112.`;
  return json({galat: balasan, sisaDetik: r.sisa, balasan, teksWa: balasan}, 429, {...HDR, "retry-after": String(r.sisa)});
}

/* ---------------- token lacak: HMAC nomor, hanya sha256-nya di D1 ---------------- */
async function tokenLacak(env, nomor) {   // kunci turunan berlabel domain "lapor-lacak|": SESI_KUNCI mentah tidak pernah menandatangani langsung; SESI_KUNCI kosong dicegah oleh jaga()
  const enc = new TextEncoder(), hmac = k => crypto.subtle.importKey("raw", k, {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  const turunan = await crypto.subtle.sign("HMAC", await hmac(enc.encode(env.SESI_KUNCI)), enc.encode("lapor-lacak|"));
  return hex(await crypto.subtle.sign("HMAC", await hmac(turunan), enc.encode(nomor))).slice(0, 32);
}

/* ---------------- data publik via ASSETS ---------------- */
let WIL, INFO;
const muatAset = env => async jalur => { const r = await env.ASSETS.fetch(new Request("https://aset.lokal" + jalur)); if (!r.ok) { r.body?.cancel(); throw new Error(`aset ${jalur} ${r.status}`); } return r.json(); };
const wilayahDari = env => WIL ||= buatWilayah(muatAset(env));
const infoDari = env => INFO ||= buatInfo({muat: muatAset(env), wilayah: wilayahDari(env)});
const modelDari = env => buatModel({kunci: env.ANTHROPIC_API_KEY, model: env.LAPOR_MODEL || undefined, catat: u => console.log(`lapor model ${u.model} masuk ${u.masuk} keluar ${u.keluar} cache ${u.cache ?? 0} ${u.henti}`)});   // tanpa kunci = null = pertanyaan templat

/* ---------------- memuat sesi ---------------- */
const dariBaris = r => { const s = JSON.parse(r.kerja); s.id = r.id; s.wa = r.wa; if (r.nomor) { s.nomor = r.nomor; s.terkirim = r.terkirim; } return s; };
async function lengkapi(env, p, row) {   // sesi + tiket + balasan + pelapor (untuk lacak, meja, dokumen)
  const s = dariBaris(row), [tiket, riwayat, balasan, pel] = await Promise.all([H.lpTiket(env, p, s.nomor), H.lpRiwayat(env, p, s.nomor), H.lpBalasan(env, p, s.nomor), H.lpPelapor(env, p, s.wa)]);
  s.tiket = {status: tiket?.status || "baru", riwayat}; s.balasan = balasan;
  return {s, pel: pel || {}};
}
const provDari = s => s.isian.lokasi?.nilai?.wilayah?.provKode;

/* ---------------- satu putaran percakapan (POST /pesan, dan foto) ---------------- */
function naikBpbd(pel, izin) {   // D19: klaim BPBD jadi bpbd bila nomor dikonfirmasi pemilik/admin lewat lapor_izin
  if (pel?.peran === "bpbd_klaim" && izin?.peran === "bpbd") { pel.peran = "bpbd"; if (izin.kab && !pel.kab) pel.kab = izin.kab; return true; }
  return false;
}
async function putar(env, ctx, url, {wa, saluran, izin}, pesan, kini) {
  const baris = await H.lpSesiAktif(env, P, wa), lama = baris ? dariBaris(baris) : null;
  const pel = (await H.lpPelapor(env, P, wa)) || null;
  naikBpbd(pel, izin);
  const kirimIsh = /^(1|kirim)$/i.test(String(pesan.teks || "").trim()) || pesan.pilih?.[0] === 1;
  if (lama?.status === "ringkasan" && kirimIsh && await H.lpHitungTerkirim(env, P, wa, kini - HARI) >= MAKS_TERKIRIM_HARI) return {batas: true};   // sebelum model dipanggil
  const awal = lama?.transkrip?.length ?? 0, lanjut = !!lama && !SELESAI.has(lama.status);   // putaran menambah ke objek yang sama: panjang awal dicatat sebelumnya
  const h = await putaran({sesi: lama, pelapor: pel, model: modelDari(env), wilayah: wilayahDari(env), pesan: {...pesan, wa, saluran}, kini});
  if (naikBpbd(h.pelapor, izin)) h.sesi.tingkat = "bpbd";
  // lanjut dihitung sebelum putaran: putaran mengubah objek lama di tempat. Sesi selesai diganti sesi baru, selebihnya baris yang sama
  h.sesi.id = lanjut ? lama.id : `${kini.toString(36)}${acak(3)}`;
  h.sesi.wa = wa;
  return {h, baris, lama, lanjut, pel, awal};
}
async function simpanPutaran(env, url, {wa, saluran}, {h, baris, lama, lanjut, pel, awal}, kini, tambahStmt = []) {
  const s = h.sesi, pesanBaru = s.transkrip.slice(lanjut ? awal : 0), g = [], tambahan = {};
  let nomor = null, tokenSha = null, ringkas = null, token = null;
  if (h.kirim) {   // nomor tiket, token lacak, PDF dan Word (ALGORITMA A6, A8)
    if (await H.lpHitungTerkirim(env, P, wa, kini - HARI) >= MAKS_TERKIRIM_HARI) return {batas: true, teks: BATAS_KIRIM_TEKS};
    const tgl = tglWib(kini), n = await H.lpNomorBerikut(env, P, tgl);
    nomor = `LA-${tgl.slice(8, 10)}${tgl.slice(5, 7)}${tgl.slice(2, 4)}-${String(n).padStart(2, "0")}`;
    token = await tokenLacak(env, nomor); tokenSha = await sha(token);
    s.nomor = nomor;
    h.inti = h.balasan = T.terkirim(h.pelapor.nama, nomor);
    const akhir = s.transkrip.at(-1); if (akhir?.dari === "bot") akhir.teks = h.inti;   // transkrip memuat nomor sebenarnya, bukan "(nomor menyusul)"
    ringkas = JSON.stringify(ringkasSesi(s));
    if (ringkas.length > 4000) ringkas = JSON.stringify({lengkap: lengkap(s), foto: (s.foto || []).length});   // CHECK kolom: ringkasan tidak boleh memutus penyimpanan
    const q = `?t=${token}`;
    Object.assign(tambahan, {nomor, lacak: `/lapor/lacak.html${q}`, foto: s.foto?.[0] ? `/api/lapor/foto/${s.foto[0].id}${q}` : null, unduhan: [
      {label: "Lacak laporan", url: `/lapor/lacak.html${q}`, lacak: true},
      {label: "Unduh PDF", url: `/api/lapor/unduh/${nomor}.pdf${q}`}, {label: "Unduh Word", url: `/api/lapor/unduh/${nomor}.docx${q}`}]});
    g.push(H.lpStmtTiketBaru(env, P, nomor, s.id, kini, true), H.lpStmtRiwayat(env, P, nomor, null, "baru", null, "Sistem", kini, true), H.lpStmtPdfAntre(env, P, nomor, VERSI, kini, true));
  }
  const w = s.isian.lokasi?.nilai, baru = {id: s.id, wa, status: s.status, tingkat: s.tingkat, jenis: s.isian.jenis?.nilai ?? null, kab: w?.wilayah?.kabKode ?? null,
    lat: w?.lat ?? null, lon: w?.lon ?? null, kerja: JSON.stringify(s), nomor, token_sha: tokenSha, terkirim: nomor ? s.terkirim : null, ringkas};
  for (const t of pesanBaru) g.push(H.lpStmtPesan(env, P, s.id, t.dari, saluran === "wa" ? "wa" : "web", t.teks, t.waktu, true));
  const p = h.pelapor;
  if (p?.nama && (!pel || pel.nama !== p.nama || pel.peran !== p.peran || pel.kab !== (p.kab ?? null) || pel.jabatan !== (p.jabatan ?? null))) g.push(H.lpStmtPelapor(env, P, wa, p, kini, true));
  g.push(...tambahStmt);
  // satu batch: pembaruan sesi (rev dijaga) lebih dulu, sisanya hanya menulis bila pembaruan itu mengubah baris (changes() > 0): tidak ada sesi bernomor tanpa tiket
  const r = await H.lpBatch(env, P, [lanjut ? H.lpStmtSesiUbah(env, P, baru, baris.rev, kini) : H.lpStmtSesiBaru(env, P, baru, kini), ...g]);
  if (!r[0].meta.changes) return {bentrok: true};
  return {tambahan, token};
}
const teksWaDari = (h, tambahan, token, url) => h.kirim ? `${h.inti}\n\nLacak laporan: ${url.origin}/lapor/lacak.html?t=${token}` : h.balasan;

async function pesan(env, req, url, kini, ctx) {
  if (!adaIdentitas(req)) return galat(401, "Masuk dulu dengan nomor WhatsApp Anda.");
  const b = await bacaBody(req, 16384); if (b.galat) return galat(b.status || 400, b.galat);
  const o = b.o, id = await pelapor(env, req, url, o); if (id instanceof Response) return id;
  const {wa} = id;
  const teks = typeof o.teks === "string" ? o.teks.slice(0, 2000) : "";
  const batas = await kuota(env, req, id, kini);
  if (batas) return batas;
  if (/^(cek\s+)?status(\s+laporan)?$/i.test(teks.trim())) return statusLaporan(env, wa);
  let lokasi = null;
  if (o.lokasi && typeof o.lokasi === "object") {
    const L = o.lokasi;
    if (L.kode != null) { // dipilih dari pencarian desa
      if (typeof L.kode !== "string" || !RE_KODE_DESA.test(L.kode)) return galat(400, "Kode desa tidak sah.");
      const c = await wilayahDari(env).pusat(L.kode);
      if (!c) return galat(400, "Desa tidak ditemukan.");
      lokasi = {lat: c.lat, lon: c.lon, sumber: "cari", wilayah: c.wilayah};
    } else {
      if (!titikSah(L.lat, L.lon)) return galat(400, "Lokasi di luar Indonesia atau tidak sah.");
      lokasi = {lat: L.lat, lon: L.lon, sumber: typeof L.sumber === "string" ? L.sumber.slice(0, 20) : "perangkat", ...(angka(L.akurasi) && L.akurasi >= 0 ? {akurasi: L.akurasi} : {})};
    }
  }
  const sesiPesan = {teks, lokasi, form: o.form && typeof o.form === "object" && !Array.isArray(o.form) ? o.form : null,
    pilih: Array.isArray(o.pilih) ? o.pilih.slice(0, 20).map(Number).filter(Number.isInteger) : null, lain: typeof o.lain === "string" ? o.lain.slice(0, 120) : null, kembali: o.kembali === true};
  // ponytail: saluran bawaan = jalur masuk (mesin = wa, sesi = web); mesin boleh meneruskan saluran "web" hanya bila gateway web memintanya
  const saluran = id.saluran === "web" ? "web" : o.saluran === "web" ? "web" : "wa";
  const r = await putar(env, ctx, url, {...id, saluran}, sesiPesan, kini);
  if (r.batas) return kirim(200, {balasan: BATAS_KIRIM_TEKS, teksWa: BATAS_KIRIM_TEKS, status: "ringkasan"});
  const s = await simpanPutaran(env, url, {wa, saluran}, r, kini);
  if (s.bentrok) return galat(409, "Pesan lain dari nomor ini sedang diproses. Coba kirim ulang.");
  if (s.batas) return kirim(200, {balasan: s.teks, teksWa: s.teks, status: r.lama?.status || null});
  return kirim(200, {...keluaran(r.h, r.h.sesi), ...s.tambahan, teksWa: teksWaDari(r.h, s.tambahan, s.token, url), pelapor: r.h.pelapor ? {nama: r.h.pelapor.nama, peran: r.h.pelapor.peran} : null});
}

/* cek status laporan milik nomor ini */
async function statusLaporan(env, wa) {
  const baris = await H.lpSesiMilik(env, P, wa), milik = [];
  for (const b of baris) { const s = JSON.parse(b.kerja); milik.push({nomor: b.nomor, token: await tokenLacak(env, b.nomor), jenisLabel: labelJenis(s.isian.jenis?.nilai), terkirim: b.terkirim, provKode: provDari(s), status: b.tiket}); }
  const j = jawabStatus(milik), a = await H.lpSesiAktif(env, P, wa), aktif = a ? dariBaris(a) : null;
  const lanjut = aktif && !["terkirim", "batal"].includes(aktif.status) ? aktif : null;
  return kirim(200, {...j, teksWa: j.balasan, ...(lanjut ? lanjutan(lanjut) : {})});
}

/* ---------------- sesi, lokasi sekitar, info ---------------- */
async function sesiGet(env, req, url) {
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const baris = await H.lpSesiAktif(env, P, id.wa);
  return kirim(200, sesiTampil(baris ? dariBaris(baris) : null));
}
async function cariGet(env, req, url, kini) {
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const lj = await lajuPublik(env, req, "lapor.cari", 300, kini); if (lj) return lj;
  const dalam = url.searchParams.get("dalam") || "";
  return kirim(200, {hasil: await wilayahDari(env).cariNama(String(url.searchParams.get("q") || "").slice(0, 80), /^\d{2}\.\d{2}(\.\d{2})?$/.test(dalam) ? dalam : "")});
}
const kueri = url => Object.fromEntries([...url.searchParams].map(([k, v]) => [k, v.slice(0, 80)]));
async function sekitarGet(env, req, url, kini, ctx) {
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const lj = await lajuPublik(env, req, "lapor.sekitar", 120, kini); if (lj) return lj;
  const baris = await H.lpSesiAktif(env, P, id.wa), s = baris ? dariBaris(baris) : null;
  const [kode, isi] = await infoDari(env).sekitar(kueri(url), s?.isian?.lokasi?.nilai, ctx);
  return kirim(kode, isi);
}
const infoGet = nama => async (env, req, url, kini) => {
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const lj = await lajuPublik(env, req, `lapor.${nama}`, 120, kini); if (lj) return lj;
  const [kode, isi] = await infoDari(env)[nama](kueri(url));
  return kirim(kode, isi);
};
async function kotakGet(env, req, url) {
  const id = await pelapor(env, req, url); if (id instanceof Response) return id;
  const sejak = Number(url.searchParams.get("sejak") || 0);
  return kirim(200, {pesan: (await H.lpKabarWeb(env, P, id.wa, Number.isFinite(sejak) ? sejak : 0)).map(k => ({nomor: k.nomor, teks: k.teks, waktu: k.waktu, ...(k.jenis === "status" ? {status: true} : {})}))});
}
async function nilaiPost(env, req, url, kini) {
  if (!adaIdentitas(req)) return galat(401, "Masuk dulu dengan nomor WhatsApp Anda.");
  const b = await bacaBody(req, 1024); if (b.galat) return galat(b.status || 400, b.galat);
  const id = await pelapor(env, req, url, b.o); if (id instanceof Response) return id;
  const lj = await kuota(env, req, id, kini, "lapor.nilai"); if (lj) return lj;
  const n = b.o.nilai, baris = RE_NOMOR.test(b.o.nomor || "") ? await H.lpSesiNomor(env, P, b.o.nomor) : null;
  if (!baris || baris.wa !== id.wa || !angka(n) || !Number.isInteger(n) || n < 1 || n > 5) return galat(400, "Nilai tidak sah.");
  const s = dariBaris(baris); s.nilai = {nilai: n, waktu: kini};
  if (!await H.lpSesiUbah(env, P, {id: s.id, status: s.status, tingkat: s.tingkat, jenis: s.isian.jenis?.nilai, kab: s.isian.lokasi?.nilai?.wilayah?.kabKode, lat: s.isian.lokasi?.nilai?.lat, lon: s.isian.lokasi?.nilai?.lon, kerja: JSON.stringify(s)}, baris.rev, kini))
    return galat(409, "Coba lagi.");
  return kirim(200, {ok: true});
}

/* ---------------- foto (KEPUTUSAN K5, D11): GPS perangkat <= 1 km dan <= 10 menit; EXIF <= 5 km dan <= 48 jam; WA: lokasi yang dibagikan ---------------- */
const b64 = (s, maks) => { const t = String(s || "").replace(/^data:image\/jpeg;base64,/, ""); if (t.length > maks) return null; try { return Uint8Array.from(atob(t), c => c.charCodeAt(0)); } catch { return null; } };
const kmDua = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return 6371 * Math.hypot(x, y); };
async function fotoPost(env, req, url, kini, ctx) {
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  if (!adaIdentitas(req)) return galat(401, "Masuk dulu dengan nomor WhatsApp Anda.");   // sebelum membaca badan sampai 7 MB
  const bb = await bacaBytes(req, 7e6); if (bb.galat) return galat(bb.status || 400, bb.galat);
  let o; try { o = JSON.parse(new TextDecoder().decode(bb.b) || "{}"); } catch { return galat(400, "body bukan JSON"); }
  if (!o || typeof o !== "object") return galat(400, "body harus objek JSON");
  const id = await pelapor(env, req, url, o); if (id instanceof Response) return id;
  const {wa, saluran} = id, mesin = saluran === "wa";
  const batas = await kuota(env, req, id, kini); if (batas) return batas;
  const mentah = b64(o.data, mesin ? 6.9e6 : 3.5e6);
  if (!mentah || mentah.length < 1000 || mentah.length > (mesin ? 5 : 2.5) * 1048576 || mentah[0] !== 0xff || mentah[1] !== 0xd8) return galat(400, `Foto harus JPEG, paling besar ${mesin ? 5 : "2,5"} MB.`);
  const bersih = bersihMedia("image/jpeg", mentah);   // buang metadata (EXIF) sebelum disimpan
  if (!bersih) return galat(400, "Struktur foto tidak sah atau rusak.");
  const baris = await H.lpSesiAktif(env, P, wa), lama = baris ? dariBaris(baris) : null;
  if (!lama || lama.status !== "foto") return galat(409, "Foto belum diperlukan sekarang. Lanjutkan pertanyaan laporan dulu.", {teksWa: "*Foto belum diperlukan*\nLanjutkan jawaban pertanyaan laporan dulu; foto diminta di akhir."});
  if ((lama.foto || []).length >= MAKS_FOTO) return galat(400, `Paling banyak ${MAKS_FOTO} foto per laporan.`);
  let meta, waktuAmbil, sumberWaktu;
  if (mesin) {   // gateway WA: jam pesan dan lokasi yang dibagikan (bila ada); nilai tidak sah dibuang, bukan disimpan
    const w = o.waktu, L = o.lokasi && typeof o.lokasi === "object" && titikSah(o.lokasi.lat, o.lokasi.lon) ? {lat: o.lokasi.lat, lon: o.lokasi.lon} : null;
    waktuAmbil = angka(w) && w > kini - 48 * JAM && w <= kini + 5 * MENIT ? w : kini; sumberWaktu = waktuAmbil === kini ? "waktu unggah" : "waktu pesan WhatsApp";
    meta = L ? {lencana: "wa", lencanaTeks: "Lokasi dibagikan lewat WhatsApp", lat: L.lat, lon: L.lon} : {lencana: "tanpa", lencanaTeks: "Tanpa lokasi"};
  } else {
    const g = o.gps && typeof o.gps === "object" ? o.gps : null, x = o.exif && typeof o.exif === "object" ? o.exif : null;
    const gpsSah = !!g && titikSah(g.lat, g.lon) && angka(g.akurasi) && g.akurasi >= 0 && g.akurasi <= 1000 && angka(g.waktu) && Math.abs(kini - g.waktu) <= 10 * MENIT;
    const xLok = x && titikSah(x.lat, x.lon) ? {lat: x.lat, lon: x.lon} : null, xWaktu = x && angka(x.waktu) && x.waktu <= kini + 5 * MENIT ? x.waktu : null;   // EXIF tidak sah dibuang
    if (xWaktu && kini - xWaktu > 48 * JAM) return galat(400, "Foto diambil lebih dari 48 jam lalu. Kirim foto terbaru dari lokasi.");
    if (gpsSah && xLok && kmDua(g.lat, g.lon, xLok.lat, xLok.lon) > 5) return galat(400, "Lokasi di foto lebih dari 5 km dari posisi Anda sekarang. Kirim foto yang diambil di lokasi ini.");
    meta = gpsSah ? {lencana: "gps", lencanaTeks: "Lokasi GPS perangkat", lat: g.lat, lon: g.lon, akurasi: g.akurasi}
      : xLok ? {lencana: "exif", lencanaTeks: "Lokasi dari data foto", lat: xLok.lat, lon: xLok.lon} : {lencana: "tanpa", lencanaTeks: "Tanpa lokasi"};
    waktuAmbil = xWaktu || kini; sumberWaktu = xWaktu ? "waktu EXIF foto" : gpsSah ? "waktu GPS perangkat" : "waktu unggah";
  }
  const fid = acak(8), kunci = `lapor/foto/${fid}.jpg`;
  const info = {id: fid, ...meta, waktuAmbil, sumberWaktu, waktuTerima: kini};
  const pel = (await H.lpPelapor(env, P, wa)) || null; naikBpbd(pel, id.izin);
  const awal = lama.transkrip.length;
  const h = await putaran({sesi: lama, pelapor: pel, model: null, wilayah: wilayahDari(env), pesan: {wa, saluran, foto: info}, kini});
  h.sesi.id = lama.id; h.sesi.wa = wa;
  if (!h.sesi.foto?.some(f => f.id === fid)) return galat(409, "Foto belum diperlukan sekarang.");
  await env.MEDIA.put(kunci, bersih, {httpMetadata: {contentType: "image/jpeg"}});
  try {
    const s = await simpanPutaran(env, url, {wa, saluran}, {h, baris, lama, lanjut: true, pel, awal}, kini,
      [H.lpStmtFoto(env, P, {id: fid, sesi: lama.id, kunci, lat: meta.lat, lon: meta.lon, akurasi: meta.akurasi, waktuAmbil, waktuTerima: kini, lencana: meta.lencana, pintu: mesin ? "wa" : "web"}, true)]);
    if (s.bentrok) { await env.MEDIA.delete(kunci); return galat(409, "Pesan lain dari nomor ini sedang diproses. Coba kirim ulang."); }
  } catch (e) { await env.MEDIA.delete(kunci).catch(() => {}); throw e; }
  const prov = provDari(h.sesi);
  return kirim(200, {...keluaran(h, h.sesi), teksWa: h.balasan, fotoBaru: {id: fid, lencana: meta.lencana, lencanaTeks: meta.lencanaTeks, lat: meta.lat ?? null, lon: meta.lon ?? null, akurasi: meta.akurasi ?? null,
    waktuTeks: waktuLapor(waktuAmbil, prov), sumberWaktu, ke: h.sesi.foto.length, maks: MAKS_FOTO}});
}
/* berkas foto: pemegang token lacak, pelapornya (sesi atau mesin), atau staf meja */
async function fotoGet(env, req, url, kini, ctx, id) {
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  const lj = await lajuPublik(env, req, "lapor.fotoget", 600, kini); if (lj) return lj;
  const f = await H.lpFotoById(env, PUBLIK, id); if (!f) return galat(404, "tidak ada");
  const t = url.searchParams.get("t") || "";
  let ok = RE_TOKEN.test(t) && f.token_sha && await sha(t) === f.token_sha;
  if (!ok) ok = !!await stafMeja(env, req);
  if (!ok && req.headers.get("authorization")) ok = await mesinSah(env, req);
  if (!ok && req.headers.has("cookie")) { try { ok = (await sesiMasuk(env, req))?.wa === f.wa; } catch {} }
  if (!ok) return galat(404, "tidak ada");
  const o = await env.MEDIA.get(f.kunci_r2); if (!o) return galat(404, "tidak ada");
  return new Response(o.body, {headers: {"content-type": "image/jpeg", "cache-control": "private, no-store", "x-robots-tag": "noindex", "x-content-type-options": "nosniff"}});
}

/* ---------------- lacak dan unduhan ---------------- */
async function lacak(env, req, url, kini) {
  const lj = await lajuPublik(env, req, "lapor.lacak", 300, kini); if (lj) return lj;
  const t = url.searchParams.get("t") || "";
  const baris = RE_TOKEN.test(t) ? await H.lpSesiToken(env, PUBLIK, await sha(t)) : null;
  if (!baris) return galat(404, "Laporan tidak ditemukan.");
  const {s, pel} = await lengkapi(env, PUBLIK, baris);
  return kirim(200, lacakTampil(s, pel, t));
}
async function unduh(env, req, url, kini, ctx, x) {
  const lj = await lajuPublik(env, req, "lapor.unduh", 120, kini); if (lj) return lj;
  let nama = ""; try { nama = decodeURIComponent(x); } catch { return galat(404, "tidak ada"); }
  const m = /^(LA-\d{6}-\d{2,3})\.(pdf|docx)$/.exec(nama);
  const baris = m ? await H.lpSesiNomor(env, PUBLIK, m[1]) : null, t = url.searchParams.get("t") || "";
  if (!baris || !(RE_TOKEN.test(t) && baris.token_sha && await sha(t) === baris.token_sha) && !await stafMeja(env, req)) return galat(404, "tidak ada");
  const o = env.MEDIA ? await env.MEDIA.get(`lapor/dok/${m[1]}.${VERSI}.${m[2]}`) : null;
  if (!o) return new Response("Dokumen sedang dibuat. Coba lagi beberapa detik lagi.", {status: 202, headers: {"content-type": "text/plain; charset=utf-8", ...HDR}});
  return new Response(o.body, {headers: {"content-type": m[2] === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "content-disposition": `attachment; filename="Laporan ${m[1]}.${m[2]}"`, "x-content-type-options": "nosniff", ...HDR}});
}

/* ---------------- izin uji (K2): mesin atas perintah pemilik, atau admin ---------------- */
async function izinGet(env, req) {
  if (!await mesinSah(env, req)) return galat(403, "perlu kunci mesin");
  return kirim(200, {wa: await H.lpIzinDaftar(env, MESIN)});
}
async function izinPost(env, req, url, kini) {
  const mesin = await mesinSah(env, req), admin = mesin ? null : await modOK(env, req);
  if (!mesin && !admin) return galat(403, "perlu kunci mesin atau admin");
  const b = await bacaBody(req, 1024); if (b.galat) return galat(b.status || 400, b.galat);
  const wa = nomorWa(b.o.wa); if (!wa) return galat(400, "Nomor WhatsApp tidak sah.");
  const p = mesin ? MESIN : STAF;
  if (b.o.cabut === true) { await H.lpIzinCabut(env, p, wa); return kirim(200, {ok: true, wa, cabut: true}); }
  if (b.o.peran != null && b.o.peran !== "bpbd") return galat(400, "peran hanya boleh bpbd");
  const kab = typeof b.o.kab === "string" && b.o.kab.trim() ? b.o.kab.trim().slice(0, 120) : null;
  await H.lpIzinSimpan(env, p, wa, b.o.peran ?? null, kab, mesin ? "mesin" : `admin:${String(admin).slice(0, 12)}`, kini);
  return kirim(200, {ok: true, wa, peran: b.o.peran ?? null, kab});
}

/* ---------------- antrean PDF dan kabar untuk mesin Mac mini ---------------- */
async function pdfAntre(env, req, url, kini) {
  if (!await mesinSah(env, req)) return galat(403, "perlu kunci mesin");
  const antre = [];
  for (const r of await H.lpPdfAmbil(env, MESIN, kini)) {
    try {   // satu sesi rusak tidak memacetkan antrean; yang gagal diambil lagi sesudah 5 menit, maksimal 3 percobaan
      const baris = await H.lpSesiNomor(env, MESIN, r.nomor); if (!baris) continue;
      const {s, pel} = await lengkapi(env, MESIN, baris), t = await tokenLacak(env, s.nomor);
      antre.push({nomor: r.nomor, versi: r.versi, bahan: bahanDokumen(s, pel, f => `${url.origin}/api/lapor/foto/${f.id}?t=${t}`)});   // mesin mengunduh foto lewat url bertoken
    } catch (e) { console.error("lapor pdf antre", r.nomor, e?.message); }
  }
  return kirim(200, {antre});
}
async function pdfPost(env, req, url, kini, ctx, x) {
  if (!await mesinSah(env, req)) return galat(403, "perlu kunci mesin");
  if (!env.MEDIA) return galat(503, "Penyimpanan belum aktif.");
  const m = /^(LA-\d{6}-\d{2,3})\/(\d{1,3})$/.exec(x), jenis = url.searchParams.get("jenis") || "pdf";
  if (!m || !["pdf", "docx"].includes(jenis)) return galat(400, "nomor, versi, atau jenis tidak sah");
  const versi = Number(m[2]), ada = await H.lpPdfAda(env, MESIN, m[1], versi);
  if (!ada) return galat(404, "tidak ada antrean untuk nomor dan versi itu");
  const b = await bacaBytes(req, 15 * 1048576); if (b.galat) return galat(b.status || 400, b.galat);
  const pdf = jenis === "pdf" ? b.b[0] === 0x25 && b.b[1] === 0x50 && b.b[2] === 0x44 && b.b[3] === 0x46 : b.b[0] === 0x50 && b.b[1] === 0x4b;   // %PDF, atau PK (zip docx)
  if (b.b.length < 100 || !pdf) return galat(400, `badan bukan berkas ${jenis}`);
  await env.MEDIA.put(`lapor/dok/${m[1]}.${versi}.${jenis}`, b.b, {httpMetadata: {contentType: jenis === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}});
  if (jenis === "pdf") {
    await H.lpPdfStatus(env, MESIN, m[1], versi, "jadi", kini);
    if (ada.status !== "jadi") {   // kabar ke pelapor hanya sekali per versi
      const baris = await H.lpSesiNomor(env, MESIN, m[1]);
      if (baris) await H.lpBatch(env, MESIN, [H.lpStmtKabar(env, MESIN, baris.wa, m[1], "pdf", `PDF laporan ${m[1]} sudah jadi.`, `${url.origin}/api/lapor/unduh/${m[1]}.pdf?t=${await tokenLacak(env, m[1])}`, kini)]);
    }
  }
  return kirim(201, {ok: true, nomor: m[1], versi, jenis});
}
async function kabarGet(env, req) {
  if (!await mesinSah(env, req)) return galat(403, "perlu kunci mesin");
  return kirim(200, {kabar: await H.lpKabarAntre(env, MESIN)});
}
async function kabarTerkirim(env, req, url, kini, ctx, x) {
  if (!await mesinSah(env, req)) return galat(403, "perlu kunci mesin");
  const m = /^(\d{1,12})\/terkirim$/.exec(x); if (!m) return galat(404, "rute lapor tidak ada");
  const n = await H.lpKabarTerkirim(env, MESIN, Number(m[1]), kini);
  return n ? kirim(200, {ok: true}) : galat(404, "kabar tidak ada atau sudah ditandai");
}

/* ---------------- meja staf (K7, D20, D22) ---------------- */
async function mejaDaftar(env, req, url) {
  if (!await stafMeja(env, req)) return tolakStaf();
  const q = url.searchParams, f = {dari: q.has("dari") ? Number(q.get("dari")) : NaN, sampai: q.has("sampai") ? Number(q.get("sampai")) : NaN,
    jenis: /^[a-z_]{1,40}$/.test(q.get("jenis") || "") ? q.get("jenis") : null, status: Object.hasOwn(STATUS, q.get("status") || "") ? q.get("status") : null, kab: /^\d{2}(\.\d{2})?$/.test(q.get("kab") || "") ? q.get("kab") : null};
  return kirim(200, {baris: (await H.lpMejaDaftar(env, STAF, f)).map(barisMeja)});
}
async function mejaRinci(env, nomor) {   // hanya baca: GET tidak pernah menulis
  const baris = await H.lpSesiNomor(env, STAF, nomor); if (!baris) return galat(404, "Laporan tidak ditemukan.");
  const {s, pel} = await lengkapi(env, STAF, baris);
  return kirim(200, mejaRinciTampil(s, pel, await tokenLacak(env, nomor)));
}
async function mejaUbah(env, req, nomor, aksi, kini) {
  const oleh = await stafMeja(env, req); if (!oleh) return tolakStaf();
  const b = await bacaBody(req, 4096); if (b.galat) return galat(b.status || 400, b.galat);
  const baris = await H.lpSesiNomor(env, STAF, nomor); if (!baris) return galat(404, "Laporan tidak ditemukan.");
  const batas = await laju(env, String(oleh).slice(0, 60), "lapor.meja", [[JAM, 120]], kini); if (batas) return batas;
  const t = await H.lpTiket(env, STAF, nomor); if (!t) return galat(404, "Tiket laporan tidak ditemukan.");
  const catatan = String(b.o.catatan || b.o.teks || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000);
  if (aksi === "lihat") {   // petugas membuka laporan baru = "Sudah dilihat petugas" (POST, bukan GET)
    if (t.status === "baru") await H.lpBatch(env, STAF, [H.lpStmtTiketPindah(env, STAF, nomor, "baru", "dilihat", kini), H.lpStmtRiwayatJikaBerubah(env, STAF, nomor, "baru", "dilihat", null, oleh, kini)]);
  } else if (aksi === "balas") {
    if (catatan.length < 2) return galat(400, "Balasan kosong.");
    const stmts = [H.lpStmtBalasan(env, STAF, nomor, catatan, oleh, kini), H.lpStmtKabar(env, STAF, baris.wa, nomor, "balasan", catatan, null, kini)];
    if (t.status === "baru" || t.status === "dilihat") stmts.push(H.lpStmtTiketPindah(env, STAF, nomor, t.status, "ditelaah", kini), H.lpStmtRiwayatJikaBerubah(env, STAF, nomor, t.status, "ditelaah", null, oleh, kini));
    await H.lpBatch(env, STAF, stmts);
  } else {
    const ke = b.o.ke;
    if (!PINDAH[t.status]?.includes(ke)) return galat(409, "Perpindahan status tidak sah.");
    if (["selesai", "tidak_valid"].includes(t.status) && !catatan) return galat(400, "Membuka kembali wajib dengan catatan.");
    const r = await H.lpBatch(env, STAF, [H.lpStmtTiketPindah(env, STAF, nomor, t.status, ke, kini), H.lpStmtRiwayatJikaBerubah(env, STAF, nomor, t.status, ke, catatan || null, oleh, kini),
      H.lpStmtKabarJikaBerubah(env, STAF, baris.wa, nomor, "status", `Status laporan ${nomor}: ${STATUS[ke]}.${catatan ? ` ${catatan}` : ""}`, kini)]);
    if (!r[0].meta.changes) return galat(409, "Status laporan baru saja berubah. Muat ulang.");   // balapan dua staf
  }
  return mejaRinci(env, nomor);
}
async function mejaGet(env, req, url, kini, ctx, x) {
  const oleh = await stafMeja(env, req); if (!oleh) return tolakStaf();
  if (!RE_NOMOR.test(x)) return galat(404, "rute lapor tidak ada");
  return mejaRinci(env, x);
}
async function mejaPost(env, req, url, kini, ctx, x) {
  const m = /^(LA-\d{6}-\d{2,3})\/(balas|status|lihat)$/.exec(x);
  return m ? mejaUbah(env, req, m[1], m[2], kini) : galat(404, "rute lapor tidak ada");
}

/* ---------------- Alun-alun warga (K30, Q14): hanya ditindaklanjuti atau selesai; tanpa nama, nomor WA, foto, kronologi, nomor tiket ---------------- */
const alun = (env, req, url, kini, ctx) => cacheTepi(req, ctx, 60, () => alunBuat(env, req, url, kini));   // agregat tanpa data pribadi: cache tepi 60 detik
async function alunBuat(env, req, url, kini) {
  const batas = await lajuIP(env, req, "lapor.alun", [[JAM, 120]], kini); if (batas) return batas;
  const q = url.searchParams, prov = /^\d{2}$/.test(q.get("prov") || "") ? q.get("prov") : null, jenis = /^[a-z_]{1,40}$/.test(q.get("jenis") || "") ? q.get("jenis") : null;
  const baris = (await H.lpAlunBaris(env, PUBLIK, prov, jenis)).filter(r => TAMPIL_ALUN.has(r.status)).map(barisAlun)
    .sort((a, b) => b.ms - a.ms).slice(0, 100).map(async r => { const {ms, id, ...x} = r; return {id: (await sha(id)).slice(0, 10), ...x}; });
  const hasil = await Promise.all(baris);
  return kirim(200, {baris: hasil, jumlah: hasil.length});
}

const jaga = f => (env, ...a) => env.SESI_KUNCI ? f(env, ...a) : galat(503, "server belum dikonfigurasi (SESI_KUNCI)");   // token lacak butuh kunci rahasia; tanpa itu tidak ada jalur yang jalan
const RUTE = {
  "POST /api/lapor/pesan": pesan,
  "POST /api/lapor/foto": fotoPost,
  "GET /api/lapor/foto/:id": fotoGet,
  "GET /api/lapor/sesi": sesiGet,
  "GET /api/lapor/cari": cariGet,
  "GET /api/lapor/sekitar": sekitarGet,
  "GET /api/lapor/penting": infoGet("penting"),
  "GET /api/lapor/daerah": infoGet("daerah"),
  "GET /api/lapor/kotak": kotakGet,
  "POST /api/lapor/nilai": nilaiPost,
  "GET /api/lapor/lacak": lacak,
  "GET /api/lapor/unduh/:x": unduh,
  "GET /api/lapor/alun": alun,
  "GET /api/lapor/izin": izinGet,
  "POST /api/lapor/izin": izinPost,
  "GET /api/lapor/pdf/antre": pdfAntre,
  "POST /api/lapor/pdf/:x": pdfPost,
  "GET /api/lapor/kabar": kabarGet,
  "POST /api/lapor/kabar/:x": kabarTerkirim,
  "GET /api/lapor/meja": mejaDaftar,
  "GET /api/lapor/meja/:x": mejaGet,
  "POST /api/lapor/meja/:x": mejaPost,
};
export const RUTE_LAPOR = Object.fromEntries(Object.entries(RUTE).map(([k, f]) => [k, jaga(f)]));
