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
import {rekap, validasi, penanda, kurangFoto, titikObjek} from "./lapor_lanjut_spek.js";
import {putaranData, perintahData, balasanTersimpan, kunciFotoDraf, fotoMasuk, samarPribadi, BASI_MS, MAKS_FOTO_DRAF} from "./lapor_lanjut_mesin.js";
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

/* ---------- LJ-04: simpan objek (rumah dan prasarana), batal, foto ---------- */
const JENIS_RUTE = new Set(["rumah", "prasarana"]);   // jiwa dan titik di LJ-06, korban di LJ-07, usaha dan kebutuhan di LJ-08: butuh pemeriksaan tambahan
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

/* simpan atau ubah satu objek; dipakai pintu web (objekPost) dan pintu WA (LJ-05) supaya validasi, pribadi terpisah, jejak, dan rev satu jalur.
   t = {tim: {wa, peran}, b: berkas, oleh}; o = {jenis | id+rev, isian, lat?, lon?, klien_id?}. Keluaran {kode, isi} (isi = badan JSON jawaban). */
const tolak = (kode, pesan, tambah = {}) => ({kode, isi: {galat: pesan, ...tambah}});
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
  const manual = o.lat != null || o.lon != null;
  if (manual && !titikSah(o.lat, o.lon)) return tolak(400, "Titik di luar Indonesia atau tidak sah.");
  const data = JSON.stringify(v.data), pribadi = Object.keys(v.pribadi).length ? JSON.stringify(v.pribadi) : null;
  if (data.length > 4000 || (pribadi?.length ?? 0) > 2000) return tolak(400, "Isian terlalu panjang.");
  const baris = {id: ubah ? lama.id : acak(8), berkas: t.b.id, jenis, data, pribadi, desa: v.data.desa ?? null,
    lat: manual ? o.lat : ubah ? lama.lat : null, lon: manual ? o.lon : ubah ? lama.lon : null, klien_id: o.klien_id ?? null, oleh: t.oleh};
  const jejak = {berkas: t.b.id, objek: baris.id, aksi: ubah ? "ubah" : "tambah", sebelum: ubah ? lama.data : null, sesudah: data, pribadi_sidik: await sidikPribadi(env, pribadi), oleh: t.oleh};
  let r;
  for (let coba = 0; ; coba++) {   // urut berikutnya diambil di SQL; dua simpan serentak bisa bentrok UNIQUE, ulang sekali
    try { r = await H.ljBatch(env, TIM, [ubah ? H.ljStmtObjekUbah(env, TIM, baris, o.rev, kini) : H.ljStmtObjekBaru(env, TIM, baris, kini), H.ljStmtJejak(env, TIM, jejak, kini, true)]); break; }
    catch (e) {
      const m = String(e?.message);
      if (!ubah && /UNIQUE.*klien_id/i.test(m)) {   // kiriman ulang yang balapan dengan kiriman pertama: tetap idempoten
        const ada = await H.ljObjekKlien(env, TIM, o.klien_id);
        return ada?.berkas === t.b.id ? {kode: 200, isi: {objek: await objekLengkap(env, t.b, ada.id), ulang: true}} : tolak(409, "Kirim ulang dengan klien_id baru.");
      }
      if (ubah || coba || !/UNIQUE/i.test(m)) throw e;
    }
  }
  if (!r[0].meta.changes) return tolak(409, "Data ini sudah diubah orang lain. Muat ulang lalu coba lagi.");
  return {kode: ubah ? 200 : 201, isi: {objek: await objekLengkap(env, t.b, baris.id)}};
}
/* POST /api/lapor/data/objek {jenis, isian, lat?, lon?, klien_id?} baru, atau {id, rev, isian, ...} ubah */
async function objekPost(env, req, url, kini) {
  const lj = await lajuIP(env, req, "lapor.data.tulis", [[JAM, 600]], kini); if (lj) return lj;
  const t = await timTulis(env, req, kini); if (t instanceof Response) return t;
  const bb = await bacaBody(req, 16384); if (bb.galat) return galat(bb.status || 400, bb.galat);
  const r = await simpanObjek(env, t, bb.o || {}, kini);
  return kirim(r.kode, r.isi);
}

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
  const r = await H.ljBatch(env, TIM, [H.ljStmtObjekBatal(env, TIM, lama.id, t.b.id, o.rev, kini),
    H.ljStmtJejak(env, TIM, {berkas: t.b.id, objek: lama.id, aksi: "batal", sesudah: JSON.stringify({alasan}), oleh: t.oleh}, kini, true)]);
  if (!r[0].meta.changes) return galat(409, "Data ini sudah diubah atau dibatalkan. Muat ulang lalu coba lagi.");
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
  const ob = await H.ljObjekId(env, TIM, o.objek);
  if (!ob || ob.berkas !== t.b.id || ob.status !== "aktif") return galat(404, "Objek tidak ditemukan.");
  let mentah = null; try { const s = String(o.data || "").replace(/^data:image\/jpeg;base64,/, ""); if (s.length <= 3.5e6) mentah = Uint8Array.from(atob(s), c => c.charCodeAt(0)); } catch {}
  if (!mentah || mentah.length < 1000 || mentah.length > 2.5 * 1048576 || mentah[0] !== 0xff || mentah[1] !== 0xd8) return galat(400, "Foto harus JPEG, paling besar 2,5 MB.");
  const bersih = bersihMedia("image/jpeg", mentah); if (!bersih) return galat(400, "Struktur foto tidak sah atau rusak.");
  const g = o.gps && typeof o.gps === "object" ? o.gps : null, x = o.exif && typeof o.exif === "object" ? o.exif : null;
  if (x && x.kamera === false) return galat(400, "Foto harus diambil langsung dengan kamera ponsel. Tangkapan layar atau gambar hasil sunting tidak diterima.");
  const gpsSah = !!g && titikSah(g.lat, g.lon) && angka(g.akurasi) && g.akurasi >= 0 && g.akurasi <= 1000 && angka(g.waktu) && Math.abs(kini - g.waktu) <= 10 * MENIT;
  const xLok = x && titikSah(x.lat, x.lon) ? {lat: x.lat, lon: x.lon} : null, xWaktu = x && angka(x.waktu) && x.waktu <= kini + 5 * MENIT ? x.waktu : null;
  if (gpsSah && xLok && kmDua(g.lat, g.lon, xLok.lat, xLok.lon) > 5) return galat(400, "Lokasi di foto lebih dari 5 km dari posisi Anda sekarang. Kirim foto yang diambil di lokasi ini.");
  const meta = gpsSah ? {lencana: "gps", lat: g.lat, lon: g.lon, akurasi: g.akurasi} : xLok ? {lencana: "exif", ...xLok} : {lencana: "tanpa"};
  const r = await simpanFoto(env, t, ob, bersih, meta, xWaktu, "web", kini);
  return kirim(r.kode, r.isi);
}
/* satu foto bersih ke R2 dan lj_media (batas 10 per objek atomik), titik objek diisi dari foto bila belum ada; dipakai pintu web dan WA */
async function simpanFoto(env, t, ob, bersih, meta, waktuAmbil, pintu, kini) {
  const id = acak(8), kunci = `lapor/data/${t.b.id}/${ob.id}/${id}.jpg`;
  await env.MEDIA.put(kunci, bersih, {httpMetadata: {contentType: "image/jpeg"}});
  try {
    const titik = meta.lat != null ? titikObjek({lat: ob.lat, lon: ob.lon}, [meta]) : null;
    const r = await H.ljBatch(env, TIM, [H.ljStmtMediaBaru(env, TIM, {id, objek: ob.id, kunci_r2: kunci, jenis: "foto", ...meta, waktu_ambil: waktuAmbil, waktu_terima: kini, pintu, oleh: t.oleh}, MAKS_FOTO_OBJEK),
      ...(titik && ob.lat == null ? [H.ljStmtObjekTitik(env, TIM, ob.id, titik.lat, titik.lon, kini, true)] : []),
      H.ljStmtJejak(env, TIM, {berkas: t.b.id, objek: ob.id, aksi: "foto", sesudah: JSON.stringify({media: id, lencana: meta.lencana}), oleh: t.oleh}, kini, true)]);
    if (!r[0].meta.changes) { await env.MEDIA.delete(kunci).catch(() => {}); return tolak(400, `Paling banyak ${MAKS_FOTO_OBJEK} foto per objek.`); }
  } catch (e) { await env.MEDIA.delete(kunci).catch(() => {}); throw e; }
  return {kode: 201, isi: {objek: await objekLengkap(env, t.b, ob.id), foto: id}};
}

/* GET /api/lapor/data/media?id=: tim berkasnya; staf Pusdalops; akun lembaga kab hanya foto (bukan wajah); provinsi tidak. Tercatat. */
async function mediaGet(env, req, url, kini) {
  const lj = await lajuIP(env, req, "lapor.data.baca", BACA, kini); if (lj) return lj;
  const id = url.searchParams.get("id"); if (!RE_ID.test(id || "")) return galat(400, "Media tidak sah.");
  if (!env.MEDIA) return galat(503, "Penyimpanan foto belum aktif.");
  const m = await H.ljMediaSatu(env, STAF, id); if (!m) return galat(404, "Media tidak ditemukan.");
  const tim = await timDari(env, req, kini);
  let oleh = null;
  if (tim && tim.berkas === m.berkas) oleh = `tim:${tim.wa}`;
  else {
    const h = await hakData(env, req, kini); if (h?.tolak) return h.tolak;
    const b = h && await H.ljBerkas(env, STAF, m.berkas), lingkup = b && lingkupLembaga(h.c, b);
    if (lingkup === "staf" || (lingkup === "lembaga" && m.jenis === "foto")) oleh = String(h.oleh).slice(0, 200);
  }
  if (!oleh) return galat(404, "Media tidak ditemukan.");
  const r2 = await env.MEDIA.get(m.kunci_r2); if (!r2) return galat(404, "Media tidak ditemukan.");
  await H.ljStmtAkses(env, STAF, m.berkas, m.objek, "media", oleh, kini).run();
  return new Response(r2.body, {headers: {...HDR, "content-type": "image/jpeg", "x-content-type-options": "nosniff", "content-disposition": "inline"}});
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
  "POST /api/lapor/data/foto": fotoPost,
  "GET /api/lapor/data/media": mediaGet,
}).map(([k, f]) => [k, jaga(f)]));
