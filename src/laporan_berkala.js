/* Laporan Berkala (/laporan-bnpb?jenis=berkala): draf isian staf, berkas angka, Bekukan, cetak, jejak (paket data/kajian-bnpb/laporan-berkala/, LB-07).
   DESAIN-TEKNIS 3 dan 4, KEAMANAN-PRIVASI 2 dan 4. Skema migrations/0178_laporan_berkala.sql; SQL di src/hak.js bagian Laporan Berkala.
   Hak (K4, Q22): admin menulis; admin, staf peran apa pun, dan pemirsa bertab pusdalops membaca; tanpa masuk 403; tidak ada versi publik.
   Berkas angka ditulis scripts/berkala/rakit.py ke R2 berkala/<periode>/<kode>/angka/<tarik>.json; kunci R2 SELALU dibentuk server dari parameter
   yang lolos pola, tidak pernah diterima dari klien. Versi beku menyalin berkas angka ke beku/v<N>.json dan sidiknya diperiksa tiap dibaca (ADR-4).
   Bekukan ikut menyegel (batchBersegel, jenis 'berkala', migrasi 0179). Kelengkapan dihitung modul yang sama dengan layar (ADR-5). */
import {json, gagal, adminOK, bacaBody, sha, situsCenturisk} from "./worker.js";
import {laju} from "./bnpb.js";
import {stafPeran, pemirsaLihat} from "./staf.js";
import {pemirsaSesi} from "./pemirsa.js";
import {bersihIsi} from "./laporan_bnpb.js";
import {batchBersegel, isiBerkala} from "./segel.js";
import {lbrDaftar, lbrBaris, lbrJejak, lbrSimpan, lbrStmtBeku, stmtSegelBerkala} from "./hak.js";
import {kodeSah, selesai, kelengkapan, judulPeriode} from "../public/laporan_berkala_hitung.js";

export const PERIODE = ["harian", "mingguan", "bulanan", "tahunan"];
export const MAKS_ISI = 98304;   // sama dengan CHECK 0178 dan MAKS_ISI src/laporan_bnpb.js
/* K4 "Semuanya": semua peran staf kecuali yang hanya membuka Direktori (stafSesiSemua tetap menolak staf direktori-saja lewat daftar ini) */
export const PERAN_BACA = ["verifikator", "pusdalops", "analis_konsesi", "udara", "tmc", "koordalops", "pimpinan", "kemitraan", "operator_cc", "irtama", "unit"];
const JAM = 36e5, BATAS_TULIS = [[JAM, 120]], BATAS_CETAK = [[JAM, 60]], BATAS_BUKA = [[JAM, 600]];   // angka laju rancangan agent (dokumen paket tidak menyebutnya): cukup untuk satu tim yang menyunting sepanjang hari
const NS = {"cache-control": "private, no-store"};
const ok = (d, s = 200) => json(d, s, NS), tolak = (s, m, h = {}) => gagal(s, m, {...NS, ...h});
const RE_TARIK = /^(terbaru|\d{4}-\d{2}-\d{2})$/;
const hariIni = kini => new Date(kini + 7 * JAM).toISOString().slice(0, 10);   // WIB
const kunciAngka = (p, k, tarik) => `berkala/${p}/${k}/angka/${tarik}.json`;
const kunciBeku = (p, k, v) => `berkala/${p}/${k}/beku/v${v}.json`;
const tarikDari = kunci => kunci.match(/\/angka\/([^/]+)\.json$/)?.[1] ?? null;
/* laju_bnpb per pelaku; jawaban 429 tetap private, no-store (I9e) */
const batasi = async (env, oleh, aksi, batas, kini) => {
  const g = await laju(env, String(oleh).slice(0, 64), aksi, batas, kini);
  return g && tolak(429, (await g.json()).galat, {"retry-after": g.headers.get("retry-after")});
};
const belumMigrasi = e => /no such table: laporan_berkala/i.test(String(e?.message || e));

/* periode + kode sah dan periodenya sudah selesai (H13), atau Response 400 */
function pk(periode, kode, kini) {
  if (!PERIODE.includes(periode)) return tolak(400, "periode harus harian, mingguan, bulanan, atau tahunan");
  if (typeof kode !== "string" || !kodeSah(periode, kode)) return tolak(400, "kode periode tidak sah");
  if (!selesai(periode, kode, hariIni(kini))) return tolak(400, "periode ini belum selesai");
  return {periode, kode};
}
const versiDari = v => v == null || v === "" ? null : /^\d{1,6}$/.test(String(v)) ? Number(v) : NaN;

/* {oleh, admin} atau null. Admin dulu (oleh = prefiks hash kredensial), lalu staf, lalu pemirsa (GET saja, daftar izin src/staf.js) */
async function pembaca(env, req, kini) {
  const a = await adminOK(env, req, kini); if (a) return {oleh: a, admin: true};
  const s = await stafPeran(env, req, PERAN_BACA); if (s) return {oleh: s, admin: false};
  const p = await pemirsaLihat(env, req); return p ? {oleh: "pemirsa:" + p.id, admin: false} : null;
}

/* host dan galat bersama: rute hanya di situs Centurisk97 dan localhost (I9d); migrasi belum diterapkan = 503 tanpa nama tabel */
const jaga = f => async (env, req, url, kini) => {
  if (!situsCenturisk(url.hostname) && url.hostname !== "localhost") return new Response("Tidak ditemukan", {status: 404, headers: NS});
  try { return await f(env, req, url, kini); }
  catch (e) { if (belumMigrasi(e)) return tolak(503, "penyimpanan Laporan Berkala belum disiapkan"); throw e; }
};

/* GET /api/laporan-berkala?daftar=1&periode= | ?periode=&kode=[&versi=] */
async function baca(env, req, url, kini) {
  const p = await pembaca(env, req, kini); if (!p) return tolak(403, "perlu masuk situs");
  const q = url.searchParams, periode = q.get("periode");
  if (q.get("daftar") === "1") {
    if (!PERIODE.includes(periode)) return tolak(400, "periode harus harian, mingguan, bulanan, atau tahunan");
    const d = await lbrDaftar(env, periode);
    return ok({periode, daftar: p.admin ? d : d.map(({oleh, ...r}) => r)});
  }
  const x = pk(periode, q.get("kode"), kini); if (x instanceof Response) return x;
  const v = versiDari(q.get("versi")); if (Number.isNaN(v)) return tolak(400, "versi harus bilangan");
  const r = await lbrBaris(env, x.periode, x.kode, v);
  if (!r) return tolak(404, "belum ada isian untuk periode itu");
  /* jejak buka dibatasi per pelaku: lewat batas, data tetap dijawab tetapi jejak tidak ditulis (kuota tulis D1, bukan penolakan baca) */
  if (!await laju(env, String(p.oleh).slice(0, 64), "berkala.buka", BATAS_BUKA, kini)) await lbrJejak(env, x.periode, x.kode, r.versi, "buka", p.oleh, kini);
  return ok({...x, versi: r.versi, versi_beku: r.beku || 0, isian: JSON.parse(r.isian), diubah: r.diubah, tarik: r.versi === 0 ? tarikDari(r.angka_kunci) : null, ...(p.admin ? {oleh: r.oleh} : {})});
}

/* GET /api/laporan-berkala/angka?periode=&kode=[&versi=N|&tarik=terbaru|YYYY-MM-DD]
   Tanpa versi dan tarik: berkas yang dipakai baris yang akan dibuka GET di atas (draf, lalu versi beku terakhir), bila belum ada baris: terbaru. */
async function angka(env, req, url, kini) {
  if (!await pembaca(env, req, kini)) return tolak(403, "perlu masuk situs");
  const q = url.searchParams, x = pk(q.get("periode"), q.get("kode"), kini); if (x instanceof Response) return x;
  const v = versiDari(q.get("versi")), tarik = q.get("tarik");
  if (Number.isNaN(v)) return tolak(400, "versi harus bilangan");
  if (tarik != null && (v != null || !RE_TARIK.test(tarik))) return tolak(400, "tarik harus terbaru atau YYYY-MM-DD, tanpa versi");
  if (!env.MEDIA) return tolak(503, "penyimpanan berkas belum disiapkan");
  const r = tarik == null ? await lbrBaris(env, x.periode, x.kode, v) : null;
  if (v != null && !r) return tolak(404, "versi itu tidak ada");
  const kunci = r ? r.angka_kunci : kunciAngka(x.periode, x.kode, tarik ?? "terbaru");
  const o = await env.MEDIA.get(kunci); if (!o) return tolak(404, "berkas angka belum ada");
  const teks = await o.text();
  if (r?.versi > 0 && await sha(teks) !== r.angka_sha256) {
    console.error(JSON.stringify({berkala: "sidik_beda", periode: x.periode, kode: x.kode, versi: r.versi}));
    return tolak(500, "berkas angka versi ini berubah");
  }
  return new Response(teks, {headers: {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", ...NS}});
}

/* POST /api/laporan-berkala {periode, kode, isian, tarik, diubah}: simpan draf (versi 0), penguncian optimistis lewat diubah */
async function simpan(env, req, url, kini) {
  const oleh = await adminOK(env, req, kini); if (!oleh) return tolak(403, "simpan draf hanya untuk admin");
  const b = await bacaBody(req, MAKS_ISI + 1024); if (b.galat) return tolak(b.status || 400, b.galat);
  const x = pk(b.o.periode, b.o.kode, kini); if (x instanceof Response) return x;
  const {isian, diubah: dasar} = b.o, tarik = b.o.tarik ?? "terbaru";
  if (!isian || typeof isian !== "object" || Array.isArray(isian)) return tolak(400, "isian harus objek");
  if (typeof tarik !== "string" || !RE_TARIK.test(tarik)) return tolak(400, "tarik harus terbaru atau YYYY-MM-DD");
  if (dasar != null && !Number.isSafeInteger(dasar)) return tolak(400, "diubah harus angka waktu dari muatan terakhir");
  let bersih; try { bersih = JSON.stringify(bersihIsi(isian)); } catch (e) { return tolak(400, e.message); }
  if (bersih.length > MAKS_ISI) return tolak(413, `isian lebih dari ${MAKS_ISI / 1024} KB`);
  if (!env.MEDIA) return tolak(503, "penyimpanan berkas belum disiapkan");
  const g = await batasi(env, oleh, "berkala.simpan", BATAS_TULIS, kini); if (g) return g;
  const kunci = kunciAngka(x.periode, x.kode, tarik), o = await env.MEDIA.get(kunci);
  if (!o) return tolak(422, `berkas angka tarik ${tarik} belum ada di server`);
  const tersimpan = await lbrSimpan(env, {...x, isian: bersih, angka_kunci: kunci, angka_sha256: await sha(await o.text()), oleh, dasar}, kini);
  if (!tersimpan) return tolak(409, "Draf ini baru diubah petugas lain. Muat ulang dulu.");
  return ok({ok: true, ...x, versi: 0, diubah: kini, ukuran: bersih.length}, 201);
}

/* POST /api/laporan-berkala/bekukan {periode, kode, diubah}: kelengkapan dihitung ulang di server dari draf tersimpan (bukan dari klien), 422 {kurang} */
async function bekukan(env, req, url, kini) {
  const oleh = await adminOK(env, req, kini); if (!oleh) return tolak(403, "Bekukan hanya untuk admin");
  const b = await bacaBody(req, 1024); if (b.galat) return tolak(b.status || 400, b.galat);
  const x = pk(b.o.periode, b.o.kode, kini); if (x instanceof Response) return x;
  const dasar = b.o.diubah; if (!Number.isSafeInteger(dasar)) return tolak(400, "diubah harus angka waktu draf yang dimuat");
  if (!env.MEDIA) return tolak(503, "penyimpanan berkas belum disiapkan");
  const g = await batasi(env, oleh, "berkala.bekukan", BATAS_TULIS, kini); if (g) return g;
  const r = await lbrBaris(env, x.periode, x.kode, 0);
  if (!r) return tolak(409, "belum ada draf tersimpan untuk dibekukan");
  if (r.diubah !== dasar) return tolak(409, "Draf ini baru diubah petugas lain. Muat ulang dulu.");
  const o = await env.MEDIA.get(r.angka_kunci), teks = o ? await o.text() : null, shaAngka = teks == null ? null : await sha(teks);
  /* yang dibekukan harus berkas angka yang sama dengan saat draf disimpan (rakit.py bisa menimpa terbaru.json sesudahnya) */
  if (teks != null && shaAngka !== r.angka_sha256) return tolak(409, "Berkas angka berubah sejak draf disimpan. Simpan ulang dulu.");
  let A = null; try { A = teks && JSON.parse(teks); } catch (e) { /* berkas rusak = dianggap belum ada */ }
  const kurang = A ? kelengkapan(A, JSON.parse(r.isian), x.periode) : ["Berkas angka belum ada"];
  if (kurang.length) return json({galat: "isian belum lengkap", kurang}, 422, NS);
  const versi = (r.beku || 0) + 1, kunci = kunciBeku(x.periode, x.kode, versi);
  /* objek beku/v<N> ditulis DULU dan hanya bila belum ada (onlyIf etag "*"), jadi Bekukan yang kalah tidak pernah menimpa objek pemenang.
     Sudah ada dengan isi sama = sisa percobaan sebelumnya, dipakai. Isi beda = Bekukan lain sedang berjalan: 409.
     Bekukan yang gagal di D1 membuang objek yang ia tulis sendiri, jadi tidak ada sisa yang mengunci versi itu. */
  const tulis = await env.MEDIA.put(kunci, teks, {httpMetadata: {contentType: "application/json"}, onlyIf: {etagDoesNotMatch: "*"}});
  if (!tulis) {
    const ada = await env.MEDIA.get(kunci);
    if (!ada || await sha(await ada.text()) !== shaAngka) return tolak(409, "versi ini sedang dibekukan petugas lain. Muat ulang dulu.");
  }
  /* buang hanya objek tulisan sendiri, dan hanya bila tidak ada baris beku yang menunjuknya (pemenang bersamaan bisa memakai ulang objek yang sama) */
  const buang = async () => { if (tulis && !await lbrBaris(env, x.periode, x.kode, versi)) await env.MEDIA.delete(kunci); };
  const d = {...x, versi, angka_kunci: kunci, angka_sha256: shaAngka, oleh, dasar};
  const sampul = {jenis: "berkala", rujukan: `${x.periode}/${x.kode}#${versi}`, versi, sidik: await sha(isiBerkala(shaAngka, r.isian)), judul: judulPeriode(x.periode, x.kode),
    periode: x.kode, penerbit: "BNPB", terbit: kini, lbr: {periode: x.periode, kode: x.kode, versi, angka_sha256: shaAngka}};
  let hasil;
  try { hasil = await batchBersegel(env, lbrStmtBeku(env, d, kini), sampul, 0, {stmt: stmtSegelBerkala}); }
  catch (e) {
    await buang();
    const m = String(e?.message || e);
    if (/versi beku tidak bisa ditimpa|UNIQUE|PRIMARY KEY/i.test(m)) return tolak(409, "versi ini baru saja dibekukan petugas lain. Muat ulang dulu.");
    if (/CHECK constraint failed/i.test(m) && /jenis/i.test(m)) return tolak(503, "penyimpanan segel belum disiapkan");   // 0179 belum diterapkan
    throw e;
  }
  if (!(hasil.r[0].meta.changes > 0)) { await buang(); return tolak(409, "Draf ini baru diubah atau dibekukan petugas lain. Muat ulang dulu."); }
  return ok({ok: true, ...x, versi, angka_sha256: shaAngka, diubah: kini, segel: hasil.kode}, 201);
}

/* POST /api/laporan-berkala/cetak {periode, kode, versi}: hanya jejak 'cetak'. Pemirsa bertab pusdalops ikut (matriks KEAMANAN-PRIVASI 2), walau POST */
async function cetak(env, req, url, kini) {
  let p = await pembaca(env, req, kini);
  if (!p) { const s = await pemirsaSesi(env, req, kini); if (s?.tab.includes("pusdalops")) p = {oleh: "pemirsa:" + s.id}; }
  if (!p) return tolak(403, "perlu masuk situs");
  const b = await bacaBody(req, 1024); if (b.galat) return tolak(b.status || 400, b.galat);
  const x = pk(b.o.periode, b.o.kode, kini); if (x instanceof Response) return x;
  const v = b.o.versi; if (!Number.isSafeInteger(v) || v < 0) return tolak(400, "versi harus bilangan");
  const g = await batasi(env, p.oleh, "berkala.cetak", BATAS_CETAK, kini); if (g) return g;
  if (!await lbrBaris(env, x.periode, x.kode, v)) return tolak(404, "versi itu tidak ada");
  await lbrJejak(env, x.periode, x.kode, v, "cetak", p.oleh, kini);
  return ok({ok: true}, 201);
}

export const RUTE_LAPORAN_BERKALA = {
  "GET /api/laporan-berkala": jaga(baca),
  "GET /api/laporan-berkala/angka": jaga(angka),
  "POST /api/laporan-berkala": jaga(simpan),
  "POST /api/laporan-berkala/bekukan": jaga(bekukan),
  "POST /api/laporan-berkala/cetak": jaga(cetak),
};
