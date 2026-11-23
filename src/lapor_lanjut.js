/* Data lanjutan BPBD di Worker (paket data/kajian-bnpb/lapor-lanjutan/, tiket LJ-03; AGENTS 2.31). Spek dan hitungan murni di src/lapor_lanjut_spek.js,
   semua SQL di src/hak.js (bagian Data lanjutan BPBD, migrasi 0161).
   Pembukaan berkas (D1, D2): tiket LA- bertingkat bpbd yang wilayah laporannya sama dengan kab izin pelapor membuka satu berkas per (induk, kab); ketua
   mendapat tautan sekali pakai lewat antrean lj_kabar. Hak (D20): token tautan ditukar kuki HttpOnly per orang (lapor_data, jalur /api/lapor/data);
   staf BNPB dan akun lembaga lewat hakMeja (src/lapor_ai.js). Data pribadi: tim melihat utuh, staf tersamar sampai Tampilkan (Q6), akun lembaga kab
   tersamar, provinsi hanya rekap (Q15). Tiap buka, tampil, dan unduh tercatat di lj_akses (D22). Jawaban privat: cache-control private no-store. */
import {json, bacaBody, bacaBytes, sha, acak} from "./worker.js";
import {bersihMedia} from "./media_bersih.js";
import {lajuIP} from "./bnpb.js";
import {hakMeja} from "./lapor_ai.js";
import {modAtauStaf} from "./staf.js";
import {bakuKab, dalamWilayah} from "./lapor_meja_hak.js";
import {tglWib} from "./lapor_tampil.js";
import {rekap, validasi, penanda, kurangFoto, fotoWajib, titikObjek, wajahBoleh, JENIS_WAJAH, TANPA_LOKASI, DEWASA, METRIK_NIHIL, metrikAda, validasiIsianBerkas} from "./lapor_lanjut_spek.js";
import {NAMA_KAB4} from "./siklus_kab.js";
import {teksBersih} from "./meja_spek.js";
import {kodeTp, jarakM, BOX, DEKAT_M} from "./pengungsian_titik.js";
import {putaranData, perintahData, balasanTersimpan, kunciFotoDraf, fotoMasuk, titikWa, samarPribadi, perintahStatus, balasanStatus, perintahNihil, namaMetrik, BASI_MS} from "./lapor_lanjut_mesin.js";
import * as H from "./hak.js";

const JAM = 3600e3, HARI = 864e5, UMUR_TOKEN = 30 * HARI;   // Q11: 30 hari
const HDR = {"cache-control": "private, no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer"};
const kirim = (kode, isi, tambah = {}) => json(isi, kode, {...HDR, ...tambah});
const galat = (kode, pesan) => kirim(kode, {galat: pesan});
const P = H.pelakuLpPelapor, STAF = H.pelakuLpStaf, TIM = H.pelakuLjTim;
const RE_TOKEN = /^[0-9a-f]{32}$/, RE_KUKI = /(?:^|;\s*)lapor_data=([0-9a-f]{64})(?:;|$)/, RE_ID = /^[0-9a-f]{16}$/;
const tabelBelum = e => /no such table/i.test(String(e?.message));
/* sidik isian pribadi di lj_jejak: HMAC berkunci rahasia Worker, bukan SHA-256 polos, supaya HP dan NIK tidak bisa ditebak dari sidiknya (tinjauan keamanan LJ-04) */
async function sidikPribadi(env, s) {
  if (!s || !env.SESI_KUNCI) return null;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("lj-pribadi:" + env.SESI_KUNCI), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");
}
const kukiData = (k, umurDetik) => `lapor_data=${k}; Max-Age=${umurDetik}; Path=/api/lapor/data; HttpOnly; Secure; SameSite=Lax`;

/* ---------- penyamaran untuk staf dan akun lembaga (Q6, Q15): murni ---------- */
export {samarPribadi};
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
  if (tingkat === "rekap") return {berkas: {...berkas, isian: {nihil: isian.nihil ?? [], status_darurat: isian.status_darurat ?? null}}, rekap: r};   // akun provinsi: tanpa posko (nomor), SK, upaya, personel (Q15)
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

/* ---------- LJ-04: simpan objek (rumah dan prasarana), batal, foto ---------- */
const JENIS_RUTE = new Set(["rumah", "prasarana", "titik", "jiwa", "korban", "usaha", "kebutuhan"]);
const MAKS_WAJAH = 2, MAKS_TITIK = 30, RE_TP = /^TP-[A-Z2-7]{8}$/;
const MAKS_FOTO_OBJEK = 10, RE_KLIEN = /^[0-9A-Za-z_-]{8,64}$/, MENIT = 60e3;
const angka = v => typeof v === "number" && Number.isFinite(v);
const titikSah = (lat, lon) => angka(lat) && angka(lon) && lat >= -11.5 && lat <= 6.5 && lon >= 94.5 && lon <= 141.5;   // = CHECK lj_objek dan lj_media
const kmDua = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return 6371 * Math.hypot(x, y); };
const timTulis = async (env, req, kini) => {   // tim yang boleh menulis: kuki sah, x-pb, berkas masih terbuka
  if (req.headers.get("x-pb") !== "1") return galat(403, "kiriman web wajib membawa header x-pb: 1");
  const tim = await timDari(env, req, kini); if (!tim) return galat(401, "Buka tautan dari WhatsApp dulu.");
  const b = await H.ljBerkas(env, TIM, tim.berkas); if (!b) return galat(404, "Berkas tidak ditemukan.");
  if (b.status !== "terbuka") return galat(409, "Berkas ini sudah ditutup. Data tidak bisa diubah.");
  return {tim, b, oleh: `tim:${tim.wa}`};
};
const objekKeluar = (o, media, semua, waktuKejadian) => {
  const x = {...o, data: typeof o.data === "string" ? JSON.parse(o.data) : o.data, pribadi: typeof o.pribadi === "string" ? JSON.parse(o.pribadi) : o.pribadi};
  delete x.klien_id;
  return {...x, media: media.map(m => ({id: m.id, jenis: m.jenis, lencana: m.lencana, lat: m.lat, lon: m.lon})),
    penanda: penanda(x, {objek: semua, media, waktuKejadian}), kurang_foto: kurangFoto(x.jenis, x.data, media)};
};
async function objekLengkap(env, b, id) {
  const o = await H.ljObjekId(env, TIM, id), media = await H.ljMedia(env, TIM, id);
  const semua = (await H.ljObjek(env, TIM, b.id)).map(x => ({...x, data: JSON.parse(x.data), pribadi: x.pribadi ? JSON.parse(x.pribadi) : null}));
  const induk = await H.lpSesiNomor(env, P, b.induk);
  return objekKeluar(o, media, semua, induk?.terkirim ?? null);
}

/* LJ-06: aturan antarobjek titik pengungsian dan jiwa (D6). Keluaran {tolak} atau {titik_id, tpBaru?, tpUbah?}; tulis register TP ikut batch objek.
   Register yang dibuat berkas ini bertanda pembuat "lapor_lanjut:<berkas>"; hanya baris itu yang disinkronkan saat titik diubah. */
async function kaitan(env, t, jenis, v, o, lama, manual) {
  if (jenis === "kebutuhan" && v.data.titik == null) return {};   // tanpa tempat pengungsian: desa wajib (spek), tidak ada kaitan
  const semua = (await H.ljObjek(env, TIM, t.b.id)).filter(x => x.status === "aktif").map(x => ({...x, data: JSON.parse(x.data)}));
  const pembuat = `lapor_lanjut:${t.b.id}`;
  if (jenis === "kebutuhan") {   // LJ-08: tempat pengungsian harus titik aktif di berkas ini; titik berkas lain sama dengan tidak ada (404). Dijaga lagi di SQL (syaratTitik).
    if (!semua.some(x => x.jenis === "titik" && x.titik_id === v.data.titik)) return {tolak: tolak(404, "Tempat pengungsian itu tidak ditemukan di berkas ini.", {isian: ["titik"]})};
    return {titik_id: v.data.titik, syaratTitik: v.data.titik};
  }
  if (jenis === "jiwa") {
    const d = v.data, titikSendiri = semua.filter(x => x.jenis === "titik").map(x => x.titik_id);
    if (!titikSendiri.includes(d.titik)) return {tolak: tolak(400, "Tempat pengungsian itu bukan titik di berkas ini. Isi data tempat pengungsian dulu.", {isian: ["titik"]})};
    if (d.kk !== "diri" && !semua.some(x => x.jenis === "jiwa" && x.id === d.kk && x.data.kk === "diri" && x.data.titik === d.titik && x.id !== lama?.id)) return {tolak: tolak(400, "Kepala keluarga harus \"diri\" atau pengungsi yang berstatus kepala keluarga di tempat pengungsian yang sama.", {isian: ["kk"]})};
    if (lama && JSON.parse(lama.data).kk === "diri" && d.kk !== "diri" && semua.some(x => x.jenis === "jiwa" && x.id !== lama.id && x.data.kk === lama.id)) return {tolak: tolak(409, "Masih ada anggota keluarga yang merujuk orang ini sebagai kepala keluarga. Ubah dulu kepala keluarga mereka.")};
    return {titik_id: d.titik, syaratTitik: d.titik};
  }
  for (const f of ["nama", "desa"]) { const g = teksBersih(v.data[f]); if (g) return {tolak: tolak(400, `${f}: ${g}`, {isian: [f]})}; }   // S2: aturan yang sama dengan register meja
  const d = v.data, reg = {nama: d.nama, desa: d.desa, jenis_tempat: d.jenis_tempat, buka: d.tgl_buka, pembuat};
  if (lama) return {titik_id: lama.titik_id, ...(lama.titik_id && {tpUbah: {id: lama.titik_id, ...reg}})};
  const kab4 = t.b.kab4 || (/^\d{2}\.\d{2}$/.test(t.b.kab) ? t.b.kab.replace(".", "") : null);
  if (!kab4 || !Object.hasOwn(NAMA_KAB4, kab4)) return {tolak: tolak(409, "Kabupaten atau kota berkas ini belum dikenali sistem, jadi tempat pengungsian belum bisa didaftarkan. Hubungi staf BNPB.")};
  if (semua.filter(x => x.jenis === "titik").length >= MAKS_TITIK) return {tolak: tolak(409, `Satu berkas paling banyak ${MAKS_TITIK} tempat pengungsian. Batalkan yang salah, atau hubungi staf BNPB bila memang lebih banyak.`)};   // S3
  const tp = o.isian?.tp;
  if (tp != null) {   // tautkan ke TP register yang sudah ada: kab sama dan belum tutup
    if (typeof tp !== "string" || !RE_TP.test(tp)) return {tolak: tolak(400, "Kode tempat pengungsian tidak sah.", {isian: ["tp"]})};
    const r = await H.ljTpById(env, TIM, tp);
    if (!r || r.kab4 !== kab4) return {tolak: tolak(404, "Tempat pengungsian itu tidak ditemukan di kabupaten atau kota berkas ini.")};   // kab lain sama dengan tidak ada
    if (r.tutup) return {tolak: tolak(409, "Tempat pengungsian itu sudah ditutup.")};
    if (semua.some(x => x.jenis === "titik" && x.titik_id === tp)) return {tolak: tolak(409, "Tempat pengungsian itu sudah tercatat di berkas ini.")};
    return {titik_id: tp};
  }
  if (manual && o.paksa !== true) {   // titik baru di dekat TP terbuka: pilih tautkan, kecuali pengguna memaksa
    const dekat = (await H.ljTpSekitar(env, TIM, kab4, o.lat, o.lon, BOX)).map(x => ({id: x.id, nama: x.nama, jarak_m: Math.round(jarakM(o.lat, o.lon, x.lat, x.lon))})).filter(x => x.jarak_m < DEKAT_M).sort((a, b) => a.jarak_m - b.jarak_m);
    if (dekat.length) return {tolak: tolak(409, "Ada tempat pengungsian terbuka kurang dari 200 m dari titik ini. Tautkan ke tempat itu, atau kirim ulang dengan paksa bila memang tempat yang berbeda.", {dekat})};
  }
  const id = kodeTp();
  return {titik_id: id, tpBaru: {id, kab4, lat: manual ? o.lat : null, lon: manual ? o.lon : null, kejadian_id: t.b.kejadian_id ?? null, ...reg}};
}

/* simpan atau ubah satu objek; dipakai pintu web (objekPost) dan pintu WA (LJ-05) supaya validasi, pribadi terpisah, jejak, dan rev satu jalur.
   t = {tim: {wa, peran}, b: berkas, oleh}; o = {jenis | id+rev, isian, lat?, lon?, klien_id?}. Keluaran {kode, isi} (isi = badan JSON jawaban). */
const tolak = (kode, pesan, tambah = {}) => ({kode, isi: {galat: pesan, ...tambah}});
const TEKS_BEBAS = {korban: ["terakhir_lokasi", "dirawat", "tempat", "desa"], usaha: ["desa"], kebutuhan: ["desa", "satuan", "bantuan_dari", "bantuan_apa"]};
async function simpanObjek(env, t, o, kini) {
  const ubah = o.id != null;
  let lama = null;
  if (ubah) {
    if (!RE_ID.test(String(o.id)) || !Number.isInteger(o.rev)) return tolak(400, "Objek atau rev tidak sah.");
    lama = await H.ljObjekId(env, TIM, o.id);
    if (!lama || lama.berkas !== t.b.id) return tolak(404, "Objek tidak ditemukan.");
    if (lama.status !== "aktif") return tolak(409, "Objek ini sudah dibatalkan.");
    if (t.tim.peran !== "ketua" && lama.oleh !== t.oleh) return tolak(403, "Anggota hanya bisa mengubah data yang diisinya sendiri. Minta ketua tim untuk mengubahnya.");
  } else if (o.klien_id != null) {   // antrean luring (atau kirim ulang WA) mengirim ulang: kembalikan objek yang sama
    if (!RE_KLIEN.test(String(o.klien_id))) return tolak(400, "klien_id tidak sah.");
    const ada = await H.ljObjekKlien(env, TIM, o.klien_id);
    if (ada) return ada.berkas === t.b.id ? {kode: 200, isi: {objek: await objekLengkap(env, t.b, ada.id), ulang: true}} : tolak(409, "Kirim ulang dengan klien_id baru.");
  }
  const jenis = ubah ? lama.jenis : o.jenis;
  if (!JENIS_RUTE.has(jenis)) return tolak(400, "Jenis objek ini belum bisa disimpan.");
  const v = validasi(jenis, o.isian && typeof o.isian === "object" ? o.isian : {});
  if (v.galat.length) return tolak(400, "Isian belum lengkap atau tidak sah.", {isian: v.galat});
  for (const f of TEKS_BEBAS[jenis] || []) {   // teks bebas terbaca staf dan lembaga: tanpa nomor atau data pribadi
    const x = v.data[f]; if (x == null) continue;
    if (/\d[\d\s.-]{8,}\d/.test(x)) return tolak(400, "Jangan tulis nomor HP atau NIK di sini.", {isian: [f]});
    const g = teksBersih(x); if (g) return tolak(400, `${f}: ${g}`, {isian: [f]});
  }
  const manual = !TANPA_LOKASI.has(jenis) && (o.lat != null || o.lon != null);   // jiwa, korban, kebutuhan tidak punya titik sendiri: lokasi orang tidak disimpan (korban hanya teks terakhir_lokasi)
  if (manual && !titikSah(o.lat, o.lon)) return tolak(400, "Titik di luar Indonesia atau tidak sah.");
  const kait = jenis === "titik" || jenis === "jiwa" || jenis === "kebutuhan" ? await kaitan(env, t, jenis, v, o, lama, manual) : {};
  if (kait.tolak) return kait.tolak;
  const data = JSON.stringify(v.data), pribadi = Object.keys(v.pribadi).length ? JSON.stringify(v.pribadi) : null;
  if (data.length > 4000 || (pribadi?.length ?? 0) > 2000) return tolak(400, "Isian terlalu panjang.");
  const baris = {id: ubah ? lama.id : acak(8), berkas: t.b.id, jenis, data, pribadi, titik_id: kait.titik_id ?? null, syaratTitik: kait.syaratTitik ?? null, desa: v.data.desa ?? null,
    lat: manual ? o.lat : ubah ? lama.lat : null, lon: manual ? o.lon : ubah ? lama.lon : null, klien_id: o.klien_id ?? null, oleh: t.oleh};
  const jejak = {berkas: t.b.id, objek: baris.id, aksi: ubah ? "ubah" : "tambah", sebelum: ubah ? lama.data : null, sesudah: data, pribadi_sidik: await sidikPribadi(env, pribadi), oleh: t.oleh};
  /* S1 dan LJ-07: jiwa yang kini di bawah 18 tahun atau menolak difoto, dan korban yang tidak lagi hilang dicari (ditemukan, meninggal), kehilangan wajahnya
     (baris dan R2); syarat dicek saat isian berubah, bukan hanya saat foto masuk */
  const hapusWajah = ubah && JENIS_WAJAH.has(jenis) && !wajahBoleh(jenis, v.data), kunciWajah = hapusWajah ? await H.ljWajahKunci(env, TIM, lama.id) : [];
  /* LJ-08 (D15, ALGORITMA 4): objek untuk metrik bertanda nihil mencabut tandanya, di batch yang sama dan tercatat. Daftar nihil dibaca dari berkas awal request;
     SQL hanya mencabut yang memang masih bertanda dan hanya bila objeknya benar tersimpan. */
  let nihilAda = []; try { nihilAda = JSON.parse(t.b.isian).nihil || []; } catch {}
  const cabut = nihilAda.length ? [...metrikAda([{jenis, data: v.data, status: "aktif"}])].filter(m => nihilAda.includes(m)) : [];
  let r;
  for (let coba = 0; ; coba++) {   // urut berikutnya diambil di SQL; dua simpan serentak bisa bentrok UNIQUE, ulang sekali
    try {   // objek dulu (r[0] penentu 409), jejak dijaga changes(), lalu register TP dijaga jejak: rev kalah = register tidak tersentuh
      r = await H.ljBatch(env, TIM, [ubah ? H.ljStmtObjekUbah(env, TIM, baris, o.rev, kini) : H.ljStmtObjekBaru(env, TIM, baris, kini), H.ljStmtJejak(env, TIM, jejak, kini, true),
        ...(kait.tpBaru ? [H.ljStmtTpBaru(env, TIM, kait.tpBaru, kini)] : []), ...(kait.tpUbah ? [H.ljStmtTpUbah(env, TIM, kait.tpUbah)] : []),
        ...(hapusWajah ? [H.ljStmtWajahHapus(env, TIM, baris.id), H.ljStmtJejak(env, TIM, {berkas: t.b.id, objek: baris.id, aksi: "hapus_wajah", oleh: t.oleh}, kini, true)] : []),
        ...(cabut.length ? [H.ljStmtNihilCabut(env, TIM, t.b.id, cabut, baris.id, kini), H.ljStmtJejak(env, TIM, {berkas: t.b.id, objek: baris.id, aksi: "nihil_cabut_otomatis", sesudah: JSON.stringify({metrik: cabut}), oleh: t.oleh}, kini, true)] : [])]); break;   // selalu ikut batch: foto yang masuk sesudah kunciWajah dibaca tetap terhapus (jejak hanya bila ada baris terhapus)
    }
    catch (e) {
      const m = String(e?.message);
      if (!ubah && /UNIQUE.*klien_id/i.test(m)) {   // kiriman ulang yang balapan dengan kiriman pertama: tetap idempoten
        const ada = await H.ljObjekKlien(env, TIM, o.klien_id);
        return ada?.berkas === t.b.id ? {kode: 200, isi: {objek: await objekLengkap(env, t.b, ada.id), ulang: true}} : tolak(409, "Kirim ulang dengan klien_id baru.");
      }
      if (/length\(isian\)/.test(m)) return tolak(400, "Isian berkas terlalu panjang.");   // pencabutan nihil menulis lj_berkas.isian (CHECK <= 6000)
      if (ubah || coba || !/UNIQUE/i.test(m)) throw e;
    }
  }
  if (!r[0].meta.changes) return tolak(409, "Data ini sudah diubah orang lain, atau tempat pengungsiannya baru saja dibatalkan. Muat ulang lalu coba lagi.");
  if (kunciWajah.length && env.MEDIA) await env.MEDIA.delete(kunciWajah).catch(() => {});
  return {kode: ubah ? 200 : 201, isi: {objek: await objekLengkap(env, t.b, baris.id), ...(cabut.length && {nihil_dicabut: cabut})}};
}
/* POST /api/lapor/data/objek {jenis, isian, lat?, lon?, klien_id?} baru, atau {id, rev, isian, ...} ubah */
async function objekPost(env, req, url, kini) {
  const lj = await lajuIP(env, req, "lapor.data.tulis", [[JAM, 600]], kini); if (lj) return lj;
  const t = await timTulis(env, req, kini); if (t instanceof Response) return t;
  const bb = await bacaBody(req, 16384); if (bb.galat) return galat(bb.status || 400, bb.galat);
  if (bb.o?.jenis === "titik" && bb.o.id == null) { const l2 = await lajuIP(env, req, "lapor.data.titik", [[JAM, 30]], kini); if (l2) return l2; }   // S3: titik baru dibatasi
  const r = await simpanObjek(env, t, bb.o || {}, kini);
  return kirim(r.kode, r.isi);
}

const tutupTp = (lama, kini) => { const hari = tglWib(kini), buka = JSON.parse(lama.data).tgl_buka; return buka && buka > hari ? buka : hari; };
/* POST /api/lapor/data/batal {objek, rev, alasan}: ketua membatalkan objek mana pun, anggota hanya objek isiannya (KEAMANAN-PRIVASI) */
async function batalPost(env, req, url, kini) {
  const lj = await lajuIP(env, req, "lapor.data.tulis", [[JAM, 600]], kini); if (lj) return lj;
  const t = await timTulis(env, req, kini); if (t instanceof Response) return t;
  const bb = await bacaBody(req, 2048); if (bb.galat) return galat(bb.status || 400, bb.galat);
  const o = bb.o || {}, alasan = typeof o.alasan === "string" ? o.alasan.trim().replace(/\s+/g, " ") : "";
  if (!RE_ID.test(String(o.objek)) || !Number.isInteger(o.rev)) return galat(400, "Objek atau rev tidak sah.");
  if (alasan.length < 5 || alasan.length > 300) return galat(400, "Tulis alasan pembatalan, 5 sampai 300 huruf.");
  if (/\d[\d\s.-]{8,}\d/.test(alasan)) return galat(400, "Alasan tidak boleh memuat nomor HP atau NIK. Tulis alasannya saja.");   // alasan tersimpan terbaca di lj_jejak
  const lama = await H.ljObjekId(env, TIM, o.objek);
  if (!lama || lama.berkas !== t.b.id) return galat(404, "Objek tidak ditemukan.");
  if (t.tim.peran !== "ketua" && lama.oleh !== t.oleh) return galat(403, "Anggota hanya bisa membatalkan data yang diisinya sendiri.");
  if (lama.jenis === "titik" || lama.jenis === "jiwa") {   // LJ-06: titik berpengungsi dan KK yang dirujuk tidak bisa dibatalkan dulu
    const aktif = (await H.ljObjek(env, TIM, t.b.id)).filter(x => x.status === "aktif" && x.jenis === "jiwa" && x.id !== lama.id).map(x => JSON.parse(x.data));
    if (lama.jenis === "titik" && aktif.some(d => d.titik === lama.titik_id)) return galat(409, "Masih ada pengungsi di tempat ini. Batalkan atau pindahkan pengungsinya dulu.");
    if (lama.jenis === "titik" && bacaIsian(t.b).posko?.titik === lama.titik_id) return galat(409, "Titik ini masih dipakai sebagai posko. Ganti posko dulu.");
    if (lama.jenis === "titik" && (await H.ljObjek(env, TIM, t.b.id)).some(x => x.status === "aktif" && x.jenis === "kebutuhan" && JSON.parse(x.data).titik === lama.titik_id)) return galat(409, "Masih ada kebutuhan yang dicatat untuk tempat ini. Batalkan atau pindahkan kebutuhannya dulu.");
    if (lama.jenis === "jiwa" && aktif.some(d => d.kk === lama.id)) return galat(409, "Masih ada anggota keluarga yang merujuk orang ini sebagai kepala keluarga. Ubah dulu kepala keluarga mereka.");
  }
  const wajahKunci = lama.jenis === "jiwa" || lama.jenis === "korban" ? await H.ljWajahKunci(env, TIM, lama.id) : [];   // data orang dibatalkan: foto wajahnya ikut dibuang
  const r = await H.ljBatch(env, TIM, [H.ljStmtObjekBatal(env, TIM, lama.id, t.b.id, o.rev, kini, lama.jenis === "titik" ? lama.titik_id : null),
    H.ljStmtJejak(env, TIM, {berkas: t.b.id, objek: lama.id, aksi: "batal", sesudah: JSON.stringify({alasan}), oleh: t.oleh}, kini, true),
    ...(lama.jenis === "titik" && lama.titik_id ? [H.ljStmtTpTutup(env, TIM, lama.titik_id, tutupTp(lama, kini), `lapor_lanjut:${t.b.id}`)] : []),
    ...(lama.jenis === "jiwa" || lama.jenis === "korban" ? [H.ljStmtWajahHapus(env, TIM, lama.id), H.ljStmtJejak(env, TIM, {berkas: t.b.id, objek: lama.id, aksi: "hapus_wajah", oleh: t.oleh}, kini, true)] : [])]);   // R2: TP buatan berkas ini ditutup; tautan milik pihak lain tidak disentuh
  if (!r[0].meta.changes) return galat(409, "Data ini sudah diubah atau dibatalkan. Muat ulang lalu coba lagi.");
  if (wajahKunci.length && env.MEDIA) await env.MEDIA.delete(wajahKunci).catch(() => {});
  return kirim(200, {objek: lama.id, status: "batal"});
}

/* POST /api/lapor/data/foto {objek, data: base64 JPEG, gps?, exif?}: foto kamera, EXIF dibuang sebelum disimpan; foto lama tidak ditolak, diberi penanda */
async function fotoPost(env, req, url, kini) {
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  const lj = await lajuIP(env, req, "lapor.data.foto", [[JAM, 200]], kini); if (lj) return lj;
  const t = await timTulis(env, req, kini); if (t instanceof Response) return t;
  const bb = await bacaBytes(req, 3.6e6); if (bb.galat) return galat(bb.status || 400, bb.galat);
  let o; try { o = JSON.parse(new TextDecoder().decode(bb.b) || "{}"); } catch { return galat(400, "body bukan JSON"); }
  if (!RE_ID.test(String(o?.objek))) return galat(400, "Objek tidak sah.");
  const wajah = o.jenis === "wajah";   // LJ-06: pengungsi hanya foto wajah (dewasa, tidak menolak); LJ-07: korban hanya foto wajah (hilang, masih dicari); objek lain hanya foto biasa
  if (o.jenis != null && o.jenis !== "foto" && !wajah) return galat(400, "Jenis foto tidak sah.");   // sebelum membaca objek: isian salah tidak membocorkan ada tidaknya objek
  const ob = await H.ljObjekId(env, TIM, o.objek);
  if (!ob || ob.berkas !== t.b.id || ob.status !== "aktif") return galat(404, "Objek tidak ditemukan.");
  if (t.tim.peran !== "ketua" && ob.oleh !== t.oleh) return galat(403, "Anggota hanya bisa menambah foto ke data yang diisinya sendiri. Minta ketua tim untuk menambahkannya.");
  if (wajah !== JENIS_WAJAH.has(ob.jenis)) return galat(400, wajah ? "Foto wajah hanya untuk pengungsi dan korban hilang." : "Pengungsi dan korban hanya menerima foto wajah, kirim dengan jenis \"wajah\".");
  if (!wajah && fotoWajib(ob.jenis).foto === 0) return galat(400, "Jenis data ini tidak dilampiri foto.");   // kebutuhan (LJ-08)
  if (wajah) {
    const d = JSON.parse(ob.data);
    if (ob.jenis === "korban") { if (!wajahBoleh("korban", d)) return galat(400, "Foto hanya diterima untuk korban yang masih dicari. Korban yang sudah ditemukan, meninggal, atau luka tidak dilampiri foto."); }
    else if (!(d.umur >= DEWASA)) return galat(400, "Foto wajah tidak diminta untuk anak di bawah 18 tahun.");
    else if (d.menolak_foto) return galat(400, "Pengungsi ini menolak difoto.");
  }
  let mentah = null; try { const s = String(o.data || "").replace(/^data:image\/jpeg;base64,/, ""); if (s.length <= 3.5e6) mentah = Uint8Array.from(atob(s), c => c.charCodeAt(0)); } catch {}
  if (!mentah || mentah.length < 1000 || mentah.length > 2.5 * 1048576 || mentah[0] !== 0xff || mentah[1] !== 0xd8) return galat(400, "Foto harus JPEG, paling besar 2,5 MB.");
  const bersih = bersihMedia("image/jpeg", mentah); if (!bersih) return galat(400, "Struktur foto tidak sah atau rusak.");
  const g = o.gps && typeof o.gps === "object" ? o.gps : null, x = o.exif && typeof o.exif === "object" ? o.exif : null;
  if (x && x.kamera === false && ob.jenis !== "korban") return galat(400, "Foto harus diambil langsung dengan kamera ponsel. Tangkapan layar atau gambar hasil sunting tidak diterima.");
  const gpsSah = !!g && titikSah(g.lat, g.lon) && angka(g.akurasi) && g.akurasi >= 0 && g.akurasi <= 1000 && angka(g.waktu) && Math.abs(kini - g.waktu) <= 10 * MENIT;
  const xLok = x && titikSah(x.lat, x.lon) ? {lat: x.lat, lon: x.lon} : null, xWaktu = x && angka(x.waktu) && x.waktu <= kini + 5 * MENIT ? x.waktu : null;
  if (!wajah && gpsSah && xLok && kmDua(g.lat, g.lon, xLok.lat, xLok.lon) > 5) return galat(400, "Lokasi di foto lebih dari 5 km dari posisi Anda sekarang. Kirim foto yang diambil di lokasi ini.");
  const meta = wajah ? {lencana: "tanpa"} : gpsSah ? {lencana: "gps", lat: g.lat, lon: g.lon, akurasi: g.akurasi} : xLok ? {lencana: "exif", ...xLok} : {lencana: "tanpa"};   // wajah tanpa lokasi
  const r = await simpanFoto(env, t, ob, bersih, meta, xWaktu, "web", kini, wajah ? "wajah" : "foto");
  return kirim(r.kode, r.isi);
}
/* satu foto bersih ke R2 dan lj_media (batas 10 per objek atomik), titik objek diisi dari foto bila belum ada; dipakai pintu web dan WA */
async function simpanFoto(env, t, ob, bersih, meta, waktuAmbil, pintu, kini, jenis = "foto") {
  const id = acak(8), maks = jenis === "wajah" ? MAKS_WAJAH : MAKS_FOTO_OBJEK, kunci = jenis === "wajah" ? `lapor/data/${t.b.id}/wajah/${id}.jpg` : `lapor/data/${t.b.id}/${ob.id}/${id}.jpg`;
  await env.MEDIA.put(kunci, bersih, {httpMetadata: {contentType: "image/jpeg"}});
  try {
    const titik = meta.lat != null ? titikObjek({lat: ob.lat, lon: ob.lon}, [meta]) : null;
    const r = await H.ljBatch(env, TIM, [H.ljStmtMediaBaru(env, TIM, {id, objek: ob.id, kunci_r2: kunci, jenis, ...meta, waktu_ambil: waktuAmbil, waktu_terima: kini, pintu, oleh: t.oleh}, maks),
      ...(titik && ob.lat == null ? [H.ljStmtObjekTitik(env, TIM, ob.id, titik.lat, titik.lon, kini, true)] : []),
      H.ljStmtJejak(env, TIM, {berkas: t.b.id, objek: ob.id, aksi: "foto", sesudah: JSON.stringify({media: id, jenis, lencana: meta.lencana}), oleh: t.oleh}, kini, true)]);
    if (!r[0].meta.changes) {
      await env.MEDIA.delete(kunci).catch(() => {});
      const skrg = await H.ljObjekId(env, TIM, ob.id);   // penuh, objek batal, atau syarat wajah gugur sesudah pemeriksaan awal (balapan dengan ubah status)
      if (!skrg || skrg.status !== "aktif") return tolak(409, "Data ini sudah dibatalkan. Foto tidak disimpan.");
      if (jenis === "wajah" && !wajahBoleh(skrg.jenis, JSON.parse(skrg.data))) return tolak(409, "Foto tidak disimpan: status atau persetujuan data ini sudah berubah, jadi foto tidak diterima lagi.");
      return tolak(400, `Paling banyak ${maks} foto${jenis === "wajah" ? " wajah" : ""} per objek.`);
    }
  } catch (e) { await env.MEDIA.delete(kunci).catch(() => {}); throw e; }
  return {kode: 201, isi: {objek: await objekLengkap(env, t.b, ob.id), foto: id}};
}

/* GET /api/lapor/data/media?id=: tim berkasnya; staf Pusdalops; akun lembaga kab hanya foto (bukan wajah); provinsi tidak. Tercatat. */
async function mediaGet(env, req, url, kini) {
  const lj = await lajuIP(env, req, "lapor.data.baca", BACA, kini); if (lj) return lj;
  const id = url.searchParams.get("id"); if (!RE_ID.test(id || "")) return galat(400, "Media tidak sah.");
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  const m = await H.ljMediaSatu(env, STAF, id); if (!m) return galat(404, "Media tidak ditemukan.");   // semua jalan gagal di bawah memberi 404 yang sama: ada tidaknya media tak terbaca tamu
  const tim = await timDari(env, req, kini);
  let oleh = null;
  if (tim && tim.berkas === m.berkas) oleh = `tim:${tim.wa}`;
  else {
    const h = await hakData(env, req, kini); if (h?.tolak) return galat(404, "Media tidak ditemukan.");   // 403 hakMeja akan membedakan media ada dan tidak ada
    const b = h && await H.ljBerkas(env, STAF, m.berkas), lingkup = b && lingkupLembaga(h.c, b);
    if (lingkup === "staf" || (lingkup === "lembaga" && m.jenis === "foto")) oleh = String(h.oleh).slice(0, 200);
  }
  if (!oleh) return galat(404, "Media tidak ditemukan.");
  const r2 = await env.MEDIA.get(m.kunci_r2); if (!r2) return galat(404, "Media tidak ditemukan.");
  await H.ljStmtAkses(env, STAF, m.berkas, m.objek, "media", oleh, kini).run();
  return new Response(r2.body, {headers: {...HDR, "content-type": "image/jpeg", "x-content-type-options": "nosniff", "content-disposition": "inline"}});
}

/* ---------- LJ-08: isian berkas (ketua) dan nihil per metrik (tim) ---------- */
const bacaIsian = b => { try { return JSON.parse(b.isian) || {}; } catch { return {}; } };
const pendek = (x, n = 120) => String(x).slice(0, n);
/* POST /api/lapor/data/isian {isian: {status_darurat?, sk_nomor?, sk_tanggal?, posko?: {nama, titik, nomor}, upaya?, personel?}}: hanya ketua; null atau "" menghapus butir.
   Digabung ke lj_berkas.isian dengan json_patch dalam SATU UPDATE (atomik: dua simpan serentak tidak saling hapus, nihil dan kab_nama tidak tersentuh). */
async function isianPost(env, req, url, kini) {
  const lj = await lajuIP(env, req, "lapor.data.tulis", [[JAM, 600]], kini); if (lj) return lj;
  const t = await timTulis(env, req, kini); if (t instanceof Response) return t;
  if (t.tim.peran !== "ketua") return galat(403, "Hanya ketua tim yang bisa mengisi data penanganan berkas ini.");
  const bb = await bacaBody(req, 4096); if (bb.galat) return galat(bb.status || 400, bb.galat);
  const lama = bacaIsian(t.b), v = validasiIsianBerkas(bb.o?.isian, {tglIni: tglWib(kini), namaPoskoAda: !!lama.posko?.nama});
  if (v.galat.length) return galat400(v.galat);
  if (!Object.keys(v.data).length) return galat(400, "Tidak ada isian yang dikirim.");
  for (const [f, x] of [["sk_nomor", v.data.sk_nomor], ["upaya", v.data.upaya], ["posko.nama", v.data.posko?.nama]]) {   // teks bebas terbaca staf dan lembaga: tanpa nomor atau data pribadi
    if (x == null) continue;
    if (f !== "sk_nomor" && /\d[\d\s.-]{8,}\d/.test(x)) return galat400([f], "Jangan tulis nomor HP atau NIK di sini.");
    const g = teksBersih(x); if (g) return galat400([f], `${f}: ${g}`);
  }
  const titik = v.data.posko?.titik;
  if (titik && !(await H.ljObjek(env, TIM, t.b.id)).some(x => x.status === "aktif" && x.jenis === "titik" && x.titik_id === titik)) return kirim(404, {galat: "Tempat pengungsian itu tidak ditemukan di berkas ini.", isian: ["posko.titik"]});
  if (JSON.stringify({...lama, ...v.data}).length > 5500) return galat(400, "Isian berkas terlalu panjang. Persingkat uraian upaya.");
  const patch = JSON.stringify(v.data), oleh = t.oleh;
  const sebelum = JSON.stringify(Object.fromEntries(Object.keys(v.data).map(k => [k, lama[k] ?? null])));
  let r;
  try { r = await H.ljBatch(env, TIM, [H.ljStmtIsian(env, TIM, t.b.id, patch, kini, titik ?? null), H.ljStmtJejak(env, TIM, {berkas: t.b.id, aksi: "isian", sebelum, sesudah: patch, oleh}, kini, true)]); }
  catch (e) { if (/CHECK/i.test(String(e?.message))) return galat(400, "Isian berkas terlalu panjang. Persingkat uraian upaya."); throw e; }
  if (!r[0].meta.changes) {
    if ((await H.ljBerkas(env, TIM, t.b.id))?.status === "terbuka") return kirim(404, {galat: "Tempat pengungsian itu tidak ditemukan di berkas ini.", isian: ["posko.titik"]});   // titik dibatalkan di antara cek dan tulis
    return galat(409, "Berkas ini sudah ditutup. Data tidak bisa diubah.");
  }
  return kirim(200, {isian: bacaIsian(await H.ljBerkas(env, TIM, t.b.id))});
}
const galat400 = (nama, pesan = "Isian belum lengkap atau tidak sah.") => kirim(400, {galat: pesan, isian: nama});
/* tandai atau cabut nihil satu metrik (D15). Dipakai pintu web dan WA. Keluaran {kode, isi}. Metrik yang sudah punya objek aktif tidak bisa ditandai (409): nihil
   hanya untuk "memang tidak ada"; yang ada datanya, datanya yang bicara. ponytail: pemeriksaan ini baca-lalu-tulis; objek yang masuk di antaranya tetap menang
   di rekap (jumlah objek lebih dulu dari nihil) dan nihilnya dicabut simpan objek berikutnya. */
async function setNihil(env, t, metrik, nihil, kini) {
  if (typeof nihil !== "boolean") return tolak(400, "Tulis nihil: true untuk menandai, false untuk mencabut.");
  if (typeof metrik !== "string" || !METRIK_NIHIL.has(metrik)) return tolak(400, "Nama metrik tidak dikenal.");
  if (nihil) {
    const semua = (await H.ljObjek(env, TIM, t.b.id)).filter(x => x.status === "aktif").map(x => ({...x, data: JSON.parse(x.data)}));
    if (metrikAda(semua).has(metrik)) return tolak(409, `Untuk ${namaMetrik(metrik)} sudah ada data di berkas ini, jadi tidak bisa ditandai nihil. Batalkan datanya dulu bila memang tidak ada.`);
  }
  let r;
  try { r = await H.ljBatch(env, TIM, [H.ljStmtNihil(env, TIM, t.b.id, metrik, nihil, kini),
    H.ljStmtJejak(env, TIM, {berkas: t.b.id, aksi: nihil ? "nihil_tandai" : "nihil_cabut", sesudah: JSON.stringify({metrik}), oleh: t.oleh}, kini, true)]); }
  catch (e) { if (/length\(isian\)/.test(String(e?.message))) return tolak(400, "Isian berkas terlalu panjang."); throw e; }
  const b = await H.ljBerkas(env, TIM, t.b.id);
  return {kode: 200, isi: {metrik, nihil, berubah: r[0].meta.changes > 0, daftar: bacaIsian(b).nihil || []}};
}
/* POST /api/lapor/data/nihil {metrik, nihil: true|false}: ketua dan anggota */
async function nihilPost(env, req, url, kini) {
  const lj = await lajuIP(env, req, "lapor.data.tulis", [[JAM, 600]], kini); if (lj) return lj;
  const t = await timTulis(env, req, kini); if (t instanceof Response) return t;
  const bb = await bacaBody(req, 512); if (bb.galat) return galat(bb.status || 400, bb.galat);
  const r = await setNihil(env, t, bb.o?.metrik, bb.o?.nihil, kini);
  return kirim(r.kode, r.isi);
}
/* WA: "nihil <metrik>" dan "cabut nihil <metrik>"; teks balasan polos */
async function nihilWa(env, t, u, kini) {
  const r = await setNihil(env, t, u.metrik, u.nihil, kini), n = namaMetrik(u.metrik);
  if (r.kode >= 400) return r.isi.galat;
  if (u.nihil) return r.isi.berubah ? `Dicatat: ${n} ditandai nihil (tidak ada). Di rekap angkanya 0. Bila nanti ada datanya, tanda ini hilang sendiri.` : `${n} sudah ditandai nihil. Tidak ada yang diubah.`;
  return r.isi.berubah ? `Tanda nihil untuk ${n} dicabut. Angkanya kembali "belum didata" sampai ada datanya.` : `${n} tidak sedang ditandai nihil. Tidak ada yang diubah.`;
}

/* ---------- LJ-05: pintu WA tahap 2 (D9, D11, D24). Dipanggil src/lapor_ai.js pada jalur mesin (Bearer WA_MESIN) SEBELUM daftar izin Lapor: nomor yang
   punya baris lj_tim aktif (dicabut null, berkas terbuka) dan punya draf lj_sesi atau mengetik perintah tahap 2 ditangani di sini; selain itu null = lanjut ke
   alur Lapor biasa (nomor anggota tanpa lapor_izin tetap 403 di sana: izin anggota hanya berlaku untuk jalur berkas, D11). Mesin murni: src/lapor_lanjut_mesin.js.
   ponytail: bila satu nomor aktif di beberapa berkas, yang dipakai berkas terbaru; pilih berkas lewat pesan menyusul bila terbukti perlu. ---------- */
const jawabWa = (balasan, tambah = {}) => kirim(200, {balasan, teksWa: balasan, status: "data_lanjutan", ...tambah});
const galatWa = (kode, pesan) => kirim(kode, {galat: pesan, balasan: pesan, teksWa: pesan, status: "data_lanjutan"});
const RE_LAPOR = /^\s*lapor\s*$/i;
async function bersihDraf(env, berkas, k) {   // foto draf di R2 ikut dibuang bersama draf
  const kunci = (k?.foto || []).map(f => kunciFotoDraf(berkas, f.i));
  if (kunci.length && env.MEDIA) await env.MEDIA.delete(kunci).catch(() => {});
}
/* baca draf anggota; draf rusak, basi (24 jam), atau milik berkas lain dibuang. Keluaran {tim, sesi, k} atau null bila bukan anggota aktif */
async function bacaDraf(env, wa, kini) {
  const tim = await H.ljTimAktif(env, TIM, wa); if (!tim) return null;
  let sesi = await H.ljSesi(env, TIM, wa), k = null, pindah = false;
  if (sesi) {
    try { k = JSON.parse(sesi.keadaan); } catch {}
    pindah = !!k?.isian && Object.keys(k.isian).length > 0 && sesi.berkas !== tim.berkas;
    if (!k || kini - sesi.diubah > BASI_MS || sesi.berkas !== tim.berkas) { await bersihDraf(env, sesi.berkas, k); await H.ljSesiHapus(env, TIM, wa); sesi = k = null; }
  }
  return {tim, sesi, k, pindah};
}
/* draf -> objek lewat simpanObjek yang sama dengan web; foto draf dipindah ke kunci akhir dan lj_media pintu wa. Keluaran {urut, kurang} atau {galat} */
async function simpanDariDraf(env, t, d, kini) {
  const r = await simpanObjek(env, t, {jenis: d.jenis, isian: d.isian, lat: d.lat, lon: d.lon, klien_id: `${d.klien}-${t.tim.wa}`, ...(d.paksa && {paksa: true})}, kini);
  if (r.kode >= 400) return {galat: r.isi.isian ? `Butir ${r.isi.isian.join(", ")} belum sah. Ketik *ubah* diikuti nama butirnya.` : r.isi.galat, dekat: r.isi.dekat};
  const ob = r.isi.objek;
  const wajah = JENIS_WAJAH.has(d.jenis), boleh = !wajah || wajahBoleh(d.jenis, ob.data);   // S1: persetujuan dan status dicek lagi di titik simpan akhir
  for (const f of d.foto) {
    const kunci = kunciFotoDraf(t.b.id, f.i);
    if (!boleh) { if (env.MEDIA) await env.MEDIA.delete(kunci).catch(() => {}); continue; }   // anak atau menolak: foto draf dibuang, tidak pernah jadi lj_media
    const x = env.MEDIA ? await env.MEDIA.get(kunci) : null; if (!x) continue;   // kiriman ulang: foto sudah dipindah
    const meta = !wajah && f.la != null ? {lencana: "wa", lat: f.la, lon: f.lo} : {lencana: "tanpa"};
    try { await simpanFoto(env, t, await H.ljObjekId(env, TIM, ob.id), new Uint8Array(await x.arrayBuffer()), meta, f.w ?? null, "wa", kini, wajah ? "wajah" : "foto"); }
    finally { await env.MEDIA.delete(kunci).catch(() => {}); }
  }
  const akhir = d.foto.length ? (await objekLengkap(env, t.b, ob.id)) : ob;
  return {urut: ob.urut, kurang: akhir.kurang_foto?.foto ?? 0};
}
/* daftar titik dan kepala keluarga berkas untuk mesin WA (LJ-06): pilihan bernomor, nama KK hanya dibaca tim berkas itu sendiri */
async function konteksWa(env, berkas) {
  const aktif = (await H.ljObjek(env, TIM, berkas)).filter(x => x.status === "aktif").map(x => ({...x, data: JSON.parse(x.data)}));
  return {titik: aktif.filter(x => x.jenis === "titik" && x.titik_id).map(x => ({id: x.titik_id, nama: x.data.nama})),
    kk: aktif.filter(x => x.jenis === "jiwa" && x.data.kk === "diri").map(x => ({id: x.id, nama: (x.pribadi ? JSON.parse(x.pribadi).nama : null) || "tanpa nama", titik: x.data.titik}))};
}
/* LJ-07: "ubah hilang <nomor> ditemukan hidup|ditemukan meninggal|dicari". Nomor = urut korban di berkas. Jalan lewat simpanObjek yang sama dengan web (rev terbaru,
   anggota hanya objek isiannya, riwayat di lj_jejak, foto semasa hidup dihapus bila tidak lagi dicari). Keluaran: teks balasan. */
async function ubahPencarian(env, t, u, kini) {
  const lama = await H.ljObjekUrut(env, TIM, t.b.id, "korban", u.nomor);
  if (!lama) return `Korban nomor ${u.nomor} tidak ada di berkas ini. Periksa nomornya di pesan Tersimpan saat korban dicatat.`;
  const data = JSON.parse(lama.data), pribadi = lama.pribadi ? JSON.parse(lama.pribadi) : {}, nama = pribadi.nama || "tanpa nama";
  if (data.status !== "hilang") return `Korban nomor ${u.nomor} (${nama}) tidak tercatat hilang, jadi status pencarian tidak diubah.`;
  if (data.pencarian === u.pencarian) return `Korban nomor ${u.nomor} (${nama}) sudah berstatus ${balasanStatus(u.pencarian)}. Tidak ada yang diubah.`;
  const ada = (await H.ljWajahKunci(env, TIM, lama.id)).length;
  const r = await simpanObjek(env, t, {id: lama.id, rev: lama.rev, isian: {...data, ...pribadi, pencarian: u.pencarian}}, kini);
  if (r.kode >= 400) return r.isi.galat || "Perubahan belum bisa disimpan. Coba lagi.";
  return `Dicatat: korban nomor ${u.nomor} (${nama}) ${balasanStatus(u.pencarian)}.`
    + (u.pencarian === "ditemukan_meninggal" ? " Turut berduka cita." : "") + (ada && u.pencarian !== "dicari" ? "\nFoto semasa hidup yang dilampirkan sudah dihapus dari berkas." : "")
    + "\nPerubahan ini tercatat di riwayat berkas dan masuk ke rekap.";
}
export async function pesanTim(env, wa, o, kini = Date.now()) {
  const teks = typeof o?.teks === "string" ? o.teks : "";
  try {
    const d = await bacaDraf(env, wa, kini); if (!d) return null;
    const {tim, sesi, k, pindah} = d;
    if (k && RE_LAPOR.test(teks)) { await bersihDraf(env, tim.berkas, k); await H.ljSesiHapus(env, TIM, wa); return null; }   // keluar dari mode data ke alur laporan biasa
    const u = k?.tahap === "isi" ? null : perintahStatus(teks);   // saat butir sedang ditanyakan, teks itu jawaban, bukan perintah
    if (u) {   // tidak menyentuh draf yang sedang diisi
      if (u.bantuan) return jawabWa(u.bantuan);
      const b = await H.ljBerkas(env, TIM, tim.berkas);
      if (!b || b.status !== "terbuka") return jawabWa("Berkas ini sudah ditutup. Data tidak bisa diubah.");
      return jawabWa(await ubahPencarian(env, {tim, b, oleh: `tim:${wa}`}, u, kini));
    }
    const nh = k?.tahap === "isi" ? null : perintahNihil(teks);   // LJ-08: tidak menyentuh draf yang sedang diisi
    if (nh) {
      if (nh.bantuan) return jawabWa(nh.bantuan);
      const b = await H.ljBerkas(env, TIM, tim.berkas);
      if (!b || b.status !== "terbuka") return jawabWa("Berkas ini sudah ditutup. Data tidak bisa diubah.");
      return jawabWa(await nihilWa(env, {tim, b, oleh: `tim:${wa}`}, nh, kini));
    }
    if (!k && !perintahData(teks)) return null;
    const r = putaranData({keadaan: k, pesan: {teks, lokasi: o.lokasi}, kini, konteks: await konteksWa(env, tim.berkas)});
    let balasan = r.balasan;
    if (r.keadaan?.buang?.length) { await bersihDraf(env, tim.berkas, {foto: r.keadaan.buang.map(i => ({i}))}); delete r.keadaan.buang; }   // wajah draf yang tak boleh lagi (umur atau menolak berubah)
    if (r.simpan) {
      const b = await H.ljBerkas(env, TIM, tim.berkas);
      if (!b || b.status !== "terbuka") return jawabWa("Berkas ini sudah ditutup. Data tidak bisa diubah.");
      const h = await simpanDariDraf(env, {tim, b, oleh: `tim:${wa}`}, r.simpan, kini);
      if (h.dekat?.length && k) {   // titik baru dekat TP terbuka: *simpan* sekali lagi = memang tempat berbeda (paksa)
        await H.ljSesiUbah(env, TIM, wa, JSON.stringify({...k, paksa: true}), sesi.diubah, Math.max(kini, sesi.diubah + 1));
        return jawabWa(`Ada tempat pengungsian terbuka kurang dari 200 m dari titik ini: ${h.dekat.map(x => `${x.nama} (${x.jarak_m} m)`).join(", ")}.\nBila ini memang tempat yang berbeda, ketik *simpan* sekali lagi. Bila sama, ketik *batal* lalu tautkan lewat tautan data di web.`);
      }
      if (h.galat) return jawabWa(`${h.galat}\n\nIsian Anda masih ada. Ketik *simpan* untuk mencoba lagi, atau *batal*.`);
      balasan = balasanTersimpan(r.simpan.jenis, h.urut) + (h.kurang ? `\nFoto masih kurang ${h.kurang}; tambahkan lewat tautan data di web.` : "");
      await H.ljSesiBaru(env, TIM, wa, tim.berkas, JSON.stringify(r.keadaan), kini);   // keadaan sesudah simpan tanpa isian pribadi
    } else if (!r.keadaan) {
      if (sesi) await H.ljSesiHapus(env, TIM, wa);
      await bersihDraf(env, tim.berkas, k);
    } else if (sesi) {
      if (!await H.ljSesiUbah(env, TIM, wa, JSON.stringify(r.keadaan), sesi.diubah, Math.max(kini, sesi.diubah + 1))) return galatWa(409, "Pesan lain dari nomor ini sedang diproses. Coba kirim ulang.");
    } else await H.ljSesiBaru(env, TIM, wa, tim.berkas, JSON.stringify(r.keadaan), kini);
    return jawabWa(pindah ? `Isian yang belum disimpan dari berkas sebelumnya dibuang karena Anda sekarang terdaftar di berkas baru.\n\n${balasan}` : balasan);
  } catch (e) { if (tabelBelum(e)) return perintahData(teks) ? galatWa(503, "Data lanjutan belum aktif (migrasi 0165 belum diterapkan).") : null; throw e; }
}
const jpegWa = d => {
  try { const s = String(d || "").replace(/^data:image\/jpeg;base64,/, ""); if (s.length > 6.9e6) return null; const m = Uint8Array.from(atob(s), c => c.charCodeAt(0)); return m.length >= 1000 && m.length <= 5 * 1048576 && m[0] === 0xff && m[1] === 0xd8 ? m : null; } catch { return null; }
};
export async function fotoTim(env, wa, o, kini = Date.now()) {
  try {
    const d = await bacaDraf(env, wa, kini); if (!d?.k) return null;   // tanpa draf data: foto biasa alur Lapor
    if (!env.MEDIA) return galatWa(503, "Penyimpanan foto belum aktif.");
    const mentah = jpegWa(o.data); if (!mentah) return galatWa(400, "Foto harus JPEG, paling besar 5 MB.");
    const bersih = bersihMedia("image/jpeg", mentah); if (!bersih) return galatWa(400, "Struktur foto tidak sah atau rusak.");   // EXIF dibuang
    const L = titikWa(o.lokasi), id = acak(8), w = angka(o.waktu) && o.waktu > kini - 48 * JAM && o.waktu <= kini + 5 * MENIT ? o.waktu : kini;
    const m = fotoMasuk(d.k, {i: id, w, ...(L || {})}, d.k.jenis === "jiwa" ? await konteksWa(env, d.tim.berkas) : undefined);
    if (m.ditolak) return galatWa(409, m.balasan);
    const kunci = kunciFotoDraf(d.tim.berkas, id);
    await env.MEDIA.put(kunci, bersih, {httpMetadata: {contentType: "image/jpeg"}});
    if (!await H.ljSesiUbah(env, TIM, wa, JSON.stringify(m.keadaan), d.sesi.diubah, Math.max(kini, d.sesi.diubah + 1))) { await env.MEDIA.delete(kunci).catch(() => {}); return galatWa(409, "Pesan lain dari nomor ini sedang diproses. Coba kirim ulang."); }
    return jawabWa(m.balasan);
  } catch (e) { if (tabelBelum(e)) return null; throw e; }
}
/* cron bersih-bersih (dipanggil bersihkanLapor): draf lebih tua dari 24 jam dibuang bersama foto drafnya, paling banyak 100 per putaran */
export async function bersihSesiLanjut(env, kini = Date.now()) {
  try {
    const basi = await H.ljSesiBasi(env, H.pelakuLpCron, kini - BASI_MS);
    for (const r of basi) { let k = null; try { k = JSON.parse(r.keadaan); } catch {} await bersihDraf(env, r.berkas, k); await H.ljSesiHapus(env, H.pelakuLpCron, r.wa, kini - BASI_MS); }
    return basi.length;
  } catch (e) { if (tabelBelum(e)) return 0; throw e; }
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
  "POST /api/lapor/data/objek": objekPost,
  "POST /api/lapor/data/batal": batalPost,
  "POST /api/lapor/data/isian": isianPost,
  "POST /api/lapor/data/nihil": nihilPost,
  "POST /api/lapor/data/foto": fotoPost,
  "GET /api/lapor/data/media": mediaGet,
}).map(([k, f]) => [k, jaga(f)]));
