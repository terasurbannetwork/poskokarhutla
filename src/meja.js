/* Meja Kerja: satu mesin alur (formulir, status bertahap, rekap per wilayah) untuk kaji cepat, logistik, DSP, renkon, Destana + Rapor Kinerja BPBD.
   Spesifikasi per meja: src/meja_spek.js. Skema: migrations/0026_meja.sql. Rancangan: docs/bnpb/ARSITEKTUR.md.
   Akses: petugas BPBD berkode (header x-kode, per kabupaten + meja yang diizinkan) atau admin moderator ke atas (modOK). Dummy: Super Admin.
   Agregat (rekap admin, ringkas publik, rapor) dibaca dari tabel meja_ringkas, bukan memindai catatan. Tanda berbasis waktu (>24 jam dst.) berubah tanpa ada tulis,
   jadi tabel ini dibangun ulang per kelompok (meja, prov, kab, dummy) tiap tulis DAN seluruhnya tiap jam lewat segarkanRingkas() (cron) atau saat dibaca lewat 2 jam.
   ponytail: kelompok dibaca utuh dan dihitung di JS; satu kab x satu meja di atas puluhan ribu baris butuh Workers berbayar atau hitung bertahap. */
import {json, gagal, acak, cacheTepi, bacaBody} from "./worker.js";
import {modOK, superOK, RE_PROV, tx, wib, tglSah} from "./posko.js";
import {laju, kodeBaru, pemegangKode, halamanBnpbPublik} from "./bnpb.js";
import {halamanAdmin} from "./statistik.js";
import {halamanBnpb} from "./admin_halaman.js";
import {PROV} from "./alun.js";
import {waktuTanggapApi} from "./sla.js";
import {stafPeran, dalamWilayahStaf, wilayahStaf} from "./staf.js";
import {stmtPelapor, stmtHapusPelaporDummy, pengaduanById, bacaPelapor, stmtJejakPelapor, cariKejadianLogbook, kejadianLogbookById, kibLogbook, simpanTautanLogbook, batalTerima, stmtHapusKelengkapanGrup, stmtHapusKelengkapan, stmtSisipKelengkapan, bacaKelengkapan, stmtImporDampak, batchTulis, skemaMejaAda} from "./hak.js";
import {buatKejadian, lanjutEntri, periksaEntri} from "./logbook.js";
import {cariKab, bangunMuatan, luarJendela, tutupKab, tanggalWib} from "./meja_terima.js";
import {BAGIAN} from "../public/inti/kelengkapan.js";
import {MEJA, DAFTAR_MEJA, DAFTAR_PETUGAS, MEJA_RAPOR, PUSAT, EKSPOR_RISIKO, BENCANA, RAPOR, spekPublik, validasi, statusEfektif, tandaBahaya, teksBersih} from "./meja_spek.js";

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM, LAJU_TULIS = [[JAM, 120]], LAJU_PELAPOR = [[JAM, 30]], TTL_RINGKAS = 2 * JAM, MAKS_EKSPOR = 20000, MAKS_ISIAN = 16384, MAKS_IMPOR = 256 * 1024, MAKS_BARIS_IMPOR = 50, MAKS_KAB_IMPOR = 8, LAJU_IMPOR = [[JAM, 5]], LAJU_TERIMA = [[JAM, 60]],   /* impor: batas CPU 10 ms akun Free */ RE_ID = /^[0-9a-f]{16}$/;
/* Juklak 5/2025: identitas pelapor hanya untuk Inspektorat Utama dan Unit Layanan Pengaduan. Pemegangnya staf Inspektorat Utama (peran irtama, keputusan pemilik 10 Nov 2026, migrasi 0121); ulp disisakan bila kelak dipisah. */
export const PERAN_ULP = ["irtama", "ulp"];
/* meja Data kejadian dan dampak: staf Pusdalops/Koordalops menerima catatan terverifikasi ke Logbook dan membaca kelengkapan. Hanya meja dampak, hanya aksi terima (tidak mengisi, tidak mengubah isi). */
export const PERAN_PUSDALOPS = ["pusdalops", "koordalops"];

/* migrasi 0026 (atau 0022 untuk laju) belum jalan di produksi = 503, bukan 500 */
const aman = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "Meja Kerja belum diaktifkan (migrasi 0026 belum diterapkan)"); throw e; }
};
const MEJA_BELUM = () => gagal(503, "meja ini belum diaktifkan (migrasi belum diterapkan)");
const tolak = () => gagal(403, "akses ditolak: butuh kode petugas atau token admin");

/* ---------------------------------------------------------------- pelaku */
const adminSaja = async (env, req) => { const m = await modOK(env, req); return m ? {admin: true, oleh: "admin:" + m} : tolak(); };
async function pelaku(env, req) {
  if (!req.headers.get("x-kode")) {
    const m = await modOK(env, req); if (m) return {admin: true, oleh: "admin:" + m};
    const u = await stafPeran(env, req, PERAN_ULP);   // staf Irtama/ULP hanya untuk meja pengaduan (daftar, buat, muatBaris menjaga)
    if (u) return {admin: true, ulp: true, hanya: "pengaduan", oleh: u};
    const d = await stafPeran(env, req, PERAN_PUSDALOPS);   // staf Pusdalops: hanya meja dampak
    return d ? {admin: true, pusdalops: true, hanya: "dampak", oleh: d} : tolak();
  }
  const p = await pemegangKode(env, req, "meja", sha => env.DB.prepare("SELECT id, nama, prov, kab, meja FROM meja_petugas WHERE kode_sha = ? AND dicabut IS NULL").bind(sha).first());
  return p instanceof Response ? p : {petugas: {...p, meja: JSON.parse(p.meja)}, oleh: "petugas:" + p.id};
}
const semuaKunci = (o, boleh) => Object.keys(o).find(x => !boleh.includes(x));

/* ---------------------------------------------------------------- baris untuk klien */
/* gudang: saldo tinggal di kolom stok, digabung ke data supaya status efektif dan tanda memakai satu jalur */
const recOf = r => ({meja: r.meja, status: r.status, data: r.stok == null ? JSON.parse(r.data) : {...JSON.parse(r.data), stok: r.stok}, dibuat: r.dibuat, diubah: r.diubah});
/* oleh dan jejak mentah hanya untuk admin penuh (moderator/token); peran lain (petugas, ULP, staf Pusdalops) melihat label tetap */
const penuh = p => !!p.admin && !p.pusdalops && !p.ulp;
const labelOleh = o => (String(o ?? "").startsWith("petugas:") ? "Petugas" : "Admin");
function baris(r, kini, p, nama = {}) {
  const admin = !p.petugas, M = MEJA[r.meja], rec = recOf(r), data = rec.data;
  return {id: r.id, meja: r.meja, prov: r.prov, kab: r.kab, kec: r.kec, desa: r.desa, status: r.status, status_efektif: statusEfektif(r.meja, rec, kini),
    tanda: tandaBahaya(r.meja, rec, kini), data, dibuat: r.dibuat, diubah: r.diubah, dummy: r.dummy, oleh: penuh(p) ? r.oleh : labelOleh(r.oleh),
    ...(r.kaji_id ? {kaji_id: r.kaji_id} : {}), ...(data.gudang_asal && nama[data.gudang_asal] ? {gudang_asal_nama: nama[data.gudang_asal]} : {}),
    ...(M.kelengkapan ? {kelengkapan: M.kelengkapan(data, {kec: r.kec, desa: r.desa})} : {}),
    aksi: Object.entries(M.transisi[r.status] || {}).filter(([, peran]) => peran !== "sistem").map(([ke, peran]) => ({ke, peran, boleh: admin || peran === "petugas"})),
    ...(M.stokPeran ? {aksi_stok: Object.entries(M.stokPeran).map(([jenis, peran]) => ({jenis, peran, boleh: admin || peran === "petugas"}))} : {}),
    bisa_ubah: !!M.turunan || !!M.ubahBuka || r.status === M.awal};
}
const KOLOM = "id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, dummy, kaji_id, stok";
/* nama gudang untuk logistik yang memuat gudang_asal (satu kueri, id lewat json_each karena D1 membatasi 100 parameter) */
async function namaGudang(env, rows) {
  const ids = [...new Set(rows.filter(r => r.meja === "logistik").map(r => JSON.parse(r.data).gudang_asal).filter(Boolean))];
  if (!ids.length) return {};
  const q = await env.DB.prepare("SELECT id, json_extract(data, '$.gudang') g, json_extract(data, '$.barang') b FROM meja_catatan WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all();
  return Object.fromEntries(q.results.map(x => [x.id, x.g]));
}
const SELESAI_SEGARKAN = (env, meja, prov, kab, dummy, kini) => segarkanGrup(env, meja, prov, kab, dummy, kini).catch(() => {});   // gagal = basi sampai segarkan berikutnya

/* ---------------------------------------------------------------- catatan */
async function daftar(env, req, url, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const meja = url.searchParams.get("meja"); if (!Object.hasOwn(MEJA, meja || "")) return gagal(400, `meja harus salah satu dari ${DAFTAR_MEJA.join(", ")}`);
  if (p.hanya && p.hanya !== meja) return gagal(403, `peran ini hanya untuk meja ${MEJA[p.hanya].nama}`);
  const w = ["meja = ?"], a = [meja], status = url.searchParams.get("status");
  if (p.petugas) {
    /* pemilih kaji cepat untuk meja rehab: petugas rehab boleh membaca kaji cepat kabupatennya */
    const untukRehab = meja === "kaji_cepat" && url.searchParams.get("untuk") === "rehab" && p.petugas.meja.includes("rehab");
    if (!p.petugas.meja.includes(meja) && !untukRehab) return gagal(403, "meja ini tidak diizinkan untuk kodemu");
    w.push("prov = ?", "kab = ?", "dummy = 0"); a.push(p.petugas.prov, p.petugas.kab);
  } else {
    const prov = url.searchParams.get("prov"), kab = tx(url.searchParams.get("kab"), 60);
    if (prov) { if (!RE_PROV.test(prov)) return gagal(400, "prov harus 2 digit"); w.push("prov = ?"); a.push(prov); }
    if (kab) { w.push("kab = ?"); a.push(kab); }
    const ws = p.pusdalops ? wilayahStaf(req) : []; if (ws.length) { w.push(`prov IN (${ws.map(() => "?").join(",")})`); a.push(...ws); }   // staf berwilayah hanya melihat provinsinya
  }
  const mentah = (await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE ${w.join(" AND ")} ORDER BY diubah DESC LIMIT 2000`).bind(...a).all()).results, nama = await namaGudang(env, mentah);
  const semua = mentah.map(r => baris(r, kini, p, nama));
  const rows = status ? semua.filter(r => r.status_efektif === status || r.status === status) : semua;
  return json({meja, catatan: rows, status: MEJA[meja].turunan || MEJA[meja].status, dipotong: mentah.length >= 2000});
}
const wilayahTeks = (b, M) => {
  const kec = b.kec == null ? null : tx(b.kec, 60), desa = b.desa == null ? null : tx(b.desa, 80);
  if (kec === undefined || (kec != null && kec.length < 2)) return {galat: "kecamatan 2-60 huruf"};
  if (desa === undefined || (desa != null && desa.length < 2)) return {galat: "desa 2-80 huruf"};
  if (M.wilayah.desa && !desa) return {galat: `desa wajib untuk meja ${M.nama}`};
  if (M.wilayah.kec && !kec) return {galat: `kecamatan wajib untuk meja ${M.nama}`};
  return {kec, desa};
};
/* kiriman dari antrean luring: klien_id (kunci kirim ulang, opsional) dan waktu_klien (ms, waktu kejadian menurut perangkat).
   Waktu klien dipakai hanya bila masuk akal (<= 5 menit ke depan, <= 14 hari ke belakang); di luar itu waktu server. Waktu server menerima disimpan terpisah di meja_jejak.diterima. */
const RE_KLIEN = /^[A-Za-z0-9_-]{8,40}$/;
function luring(o, kini) {
  if (o.klien_id != null && (typeof o.klien_id !== "string" || !RE_KLIEN.test(o.klien_id))) return {galat: "klien_id 8-40 huruf/angka/garis"};
  const w = o.waktu_klien;
  if (w != null && !Number.isFinite(w)) return {galat: "waktu_klien harus angka (ms)"};
  return {klien: o.klien_id ?? null, waktu: w != null && w <= kini + 5 * MENIT && w >= kini - 14 * HARI ? Math.round(w) : kini};
}
const UNIK = {rehab: "kaji cepat atau kejadian ini sudah punya catatan rehab-rekon", gudang: "gudang dan barang itu sudah tercatat di kabupaten ini", pengungsi: "tempat pengungsian ini sudah dicatat pada tanggal itu", pengaduan: "nomor register sudah dipakai", risiko: "kode risiko itu sudah tercatat untuk unit dan tahun ini", dampak: "kejadian itu (jenis, tanggal, dan nama yang sama) sudah tercatat di kabupaten ini; ubah catatan yang ada, jangan buat baru"};
/* identitas pelapor: objek terpisah dari data. Tidak ada isian = anonim (Juklak 5/2025 BAB III huruf B angka 1). */
function cekPelapor(o) {
  if (o == null) return {v: null};
  if (typeof o !== "object" || Array.isArray(o)) return {galat: "pelapor harus objek"};
  const x = semuaKunci(o, ["nama", "alamat", "kontak", "pekerjaan"]); if (x) return {galat: `kolom pelapor "${x.slice(0, 40)}" tidak dikenal`};
  const v = {nama: tx(o.nama, 80), alamat: tx(o.alamat, 200), kontak: tx(o.kontak, 40), pekerjaan: tx(o.pekerjaan, 60)};
  if (Object.values(v).includes(undefined)) return {galat: "identitas pelapor: teks melebihi batas atau bukan teks"};
  return {v: Object.values(v).some(Boolean) ? v : null};
}
async function buat(env, req, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const b = await bacaBody(req, MAKS_ISIAN); if (b.galat) return gagal(b.status || 400, b.galat);
  const x = semuaKunci(b.o, ["meja", "prov", "kab", "kec", "desa", "data", "kaji_id", "klien_id", "waktu_klien", "pelapor"]); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  const lr = luring(b.o, kini); if (lr.galat) return gagal(400, lr.galat);
  if (lr.klien) { const u = await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE oleh IS ? AND klien_id = ?`).bind(p.oleh, lr.klien).first(); if (u) return json({catatan: baris(u, kini, p), ulang: true}); }
  if (!Object.hasOwn(MEJA, b.o.meja || "")) return gagal(400, `meja harus salah satu dari ${DAFTAR_MEJA.join(", ")}`);
  const M = MEJA[b.o.meja], kabB = b.o.kab == null ? null : tx(b.o.kab, 60);
  if (p.hanya && (p.pusdalops || p.hanya !== M.id)) return gagal(403, p.pusdalops ? "staf Pusdalops tidak mengisi Data kejadian dan dampak; ia hanya menerima catatan terverifikasi" : `peran ini hanya untuk meja ${MEJA[p.hanya].nama}`);
  /* identitas hanya ditulis pemegang peran yang berhak membacanya; moderator mencatat pengaduan tanpa identitas */
  const pl = cekPelapor(b.o.pelapor); if (pl.galat) return gagal(400, pl.galat);
  if (b.o.pelapor != null && M.id !== "pengaduan") return gagal(400, "pelapor hanya untuk meja Pengaduan masyarakat");
  if (pl.v && !p.ulp) return gagal(403, "identitas pelapor hanya boleh dicatat peran Irtama atau ULP");
  let prov, kab;
  if (p.petugas) {
    if (!p.petugas.meja.includes(M.id)) return gagal(403, "meja ini tidak diizinkan untuk kodemu");
    if ((b.o.prov != null && b.o.prov !== p.petugas.prov) || (kabB != null && kabB !== p.petugas.kab)) return gagal(403, "kamu hanya boleh mengisi untuk kabupatenmu sendiri");
    ({prov, kab} = p.petugas);
  } else if (M.pusat) {
    ({prov, kab} = PUSAT);
  } else {
    if (typeof b.o.prov !== "string" || !RE_PROV.test(b.o.prov)) return gagal(400, "prov harus kode 2 digit");
    if (!kabB || kabB.length < 2) return gagal(400, "kabupaten 2-60 huruf");
    prov = b.o.prov; kab = kabB;
  }
  let wl = wilayahTeks(b.o, M); if (wl.galat) return gagal(400, wl.galat);
  const v = validasi(M.id, b.o.data, null, kini); if (v.galat) return gagal(400, v.galat);
  /* rehab: kaji cepat induk OPSIONAL (0110, F0-3). Bila diisi: wajib masuk_jitupasna di kabupaten yang sama, wilayah (kec, desa) disalin darinya. */
  let kajiId = null;
  if (b.o.kaji_id != null) {
    if (!M.tautKaji) return gagal(400, "kaji_id hanya untuk meja Rehab-rekon");
    if (typeof b.o.kaji_id !== "string" || !RE_ID.test(b.o.kaji_id)) return gagal(400, "kaji_id: id catatan kaji cepat (16 hex)");
    const kj = await env.DB.prepare("SELECT meja, status, prov, kab, kec, desa, dummy FROM meja_catatan WHERE id = ?").bind(b.o.kaji_id).first();
    if (!kj || kj.meja !== "kaji_cepat" || kj.status !== "masuk_jitupasna" || kj.prov !== prov || kj.kab !== kab || kj.dummy) return gagal(400, "kaji_id harus catatan kaji cepat berstatus masuk_jitupasna di kabupaten ini");
    kajiId = b.o.kaji_id; wl = {kec: kj.kec, desa: kj.desa};
  }
  if (p.petugas) { const l = await laju(env, p.petugas.id, "meja.tulis", LAJU_TULIS, kini); if (l) return l; }
  const id = acak(8);
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id, kaji_id, stok, klien_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, M.id, prov, kab, wl.kec, wl.desa, JSON.stringify(v.data), M.awal, lr.waktu, lr.waktu, p.oleh, p.petugas?.id ?? null, kajiId, M.id === "gudang" ? v.data.stok_awal : null, lr.klien),
      env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh, diterima) VALUES (?, NULL, ?, ?, ?, ?)").bind(id, M.awal, lr.waktu, p.oleh, kini),
      ...(pl.v ? [stmtPelapor(env, id, pl.v, kini)] : []),
    ]);
  } catch (e) {
    if (/UNIQUE/i.test(String(e?.message || e))) {   // dua kiriman serentak dengan klien_id sama: yang kedua mengembalikan baris yang sudah ada
      if (lr.klien) { const u = await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE oleh IS ? AND klien_id = ?`).bind(p.oleh, lr.klien).first(); if (u) return json({catatan: baris(u, kini, p), ulang: true}); }
      if (UNIK[M.id]) return gagal(409, UNIK[M.id]);
    }
    if (/CHECK constraint failed/i.test(String(e?.message || e)) && !await skemaMejaAda(env, M.id)) return MEJA_BELUM();   // CHECK daftar meja di D1 belum memuat meja ini; CHECK validasi lain tetap galat
    throw e;
  }
  await SELESAI_SEGARKAN(env, M.id, prov, kab, 0, kini);
  return json({catatan: baris(await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first(), kini, p)}, 201);
}
/* permintaan logistik dari data terstruktur (Teruskan ke logistik di Alun-alun): validasi yang sama dengan rute buat (validasi + kolom meja Logistik). Mengembalikan {id} atau {galat}. */
export async function sisipLogistik(env, {prov, kab, data}, kini, oleh, dummy = 0) {
  const v = validasi("logistik", data, null, kini); if (v.galat) return {galat: v.galat};
  const M = MEJA.logistik, id = acak(8);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, dummy) VALUES (?, 'logistik', ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?)").bind(id, prov, kab, JSON.stringify(v.data), M.awal, kini, kini, oleh, dummy),
    env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh) VALUES (?, NULL, ?, ?, ?)").bind(id, M.awal, kini, oleh)]);
  await SELESAI_SEGARKAN(env, "logistik", prov, kab, dummy, kini);
  return {id};
}
/* petugas hanya melihat baris kabupaten + mejanya; selain itu dijawab 404 (tidak membocorkan bahwa id-nya ada) */
async function muatBaris(env, p, id, req) {
  const r = await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first();
  return r && (p.petugas ? (r.prov === p.petugas.prov && r.kab === p.petugas.kab && p.petugas.meja.includes(r.meja) && !r.dummy) : (!p.hanya || r.meja === p.hanya) && (!p.pusdalops || dalamWilayahStaf(req, [r.prov]))) ? r : null;   // staf berwilayah: di luar provinsinya = 404
}
/* identitas pelapor: hanya peran Irtama/ULP (moderator pun ditolak), tiap pembukaan tercatat di jejak tanpa isi identitasnya. */
async function bukaPelapor(env, req, id, kini) {
  const oleh = await stafPeran(env, req, PERAN_ULP); if (!oleh) return gagal(403, "identitas pelapor hanya untuk peran Irtama atau ULP");
  const l = await laju(env, oleh, "meja.pelapor", LAJU_PELAPOR, kini); if (l) return l;
  const c = await pengaduanById(env, id); if (!c) return gagal(404, "catatan pengaduan tidak ada");
  const v = await bacaPelapor(env, id);
  await stmtJejakPelapor(env, id, c.status, kini, oleh).run();
  return json({anonim: !v, pelapor: v ?? null});
}
async function rincian(env, req, id, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const r = await muatBaris(env, p, id, req); if (!r) return gagal(404, "catatan tidak ada");
  const jejak = (await env.DB.prepare("SELECT dari, ke, waktu, oleh, catatan FROM meja_jejak WHERE catatan_id = ? ORDER BY id").bind(id).all()).results;
  const transaksi = r.meja === "gudang" ? (await env.DB.prepare("SELECT jenis, delta, saldo, logistik_id, waktu, oleh, catatan FROM meja_stok WHERE gudang_id = ? ORDER BY id DESC LIMIT 100").bind(id).all()).results : undefined;
  return json({catatan: baris(r, kini, p, await namaGudang(env, [r])), jejak: penuh(p) ? jejak : jejak.map(j => ({...j, oleh: labelOleh(j.oleh)})),
    ...(transaksi ? {transaksi: penuh(p) ? transaksi : transaksi.map(t => ({...t, oleh: labelOleh(t.oleh)}))} : {})});
}
/* transaksi stok manual: masuk, keluar, koreksi. UPDATE stok = stok + delta dijaga CHECK stok >= 0 di D1 (jaring kedua di bawah cek 409 ini). */
async function ubahStok(env, p, r, o, cat, kini) {
  const M = MEJA[r.meja];
  if (r.meja !== "gudang") return gagal(409, "aksi stok hanya untuk meja Stok gudang");
  if (!Object.hasOwn(M.stokPeran, o.jenis ?? "")) return gagal(400, "jenis harus masuk, keluar, atau koreksi");
  if (M.stokPeran[o.jenis] === "admin" && p.petugas) return gagal(403, `${o.jenis} stok hanya boleh oleh admin`);
  const j = o.jumlah;
  if (!Number.isInteger(j) || Math.abs(j) > 1e7 || (o.jenis === "koreksi" ? j === 0 : j < 1)) return gagal(400, o.jenis === "koreksi" ? "jumlah koreksi bilangan bulat tidak nol (boleh negatif)" : "jumlah bilangan bulat 1 sampai 10.000.000");
  const delta = o.jenis === "keluar" ? -j : j;
  if (r.stok + delta < 0) return gagal(409, `stok tidak cukup: tersisa ${r.stok}`);
  if (p.petugas) { const l = await laju(env, p.petugas.id, "meja.tulis", LAJU_TULIS, kini); if (l) return l; }
  try {
    await env.DB.batch([
      env.DB.prepare("UPDATE meja_catatan SET stok = stok + ?, diubah = max(diubah, ?) WHERE id = ?").bind(delta, kini, r.id),
      env.DB.prepare("INSERT INTO meja_stok (gudang_id, jenis, delta, saldo, waktu, oleh, catatan, dummy) SELECT id, ?, ?, stok, ?, ?, ?, dummy FROM meja_catatan WHERE id = ? AND changes() > 0").bind(o.jenis, delta, kini, p.oleh, cat, r.id),
    ]);
  } catch (e) { if (/CHECK/i.test(String(e?.message || e))) return gagal(409, "stok tidak cukup (berubah bersamaan); muat ulang"); throw e; }
  await SELESAI_SEGARKAN(env, r.meja, r.prov, r.kab, r.dummy, kini);
  return json({catatan: baris(await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(r.id).first(), kini, p)});
}
async function ubah(env, req, id, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const b = await bacaBody(req, MAKS_ISIAN); if (b.galat) return gagal(b.status || 400, b.galat);
  const x = semuaKunci(b.o, ["aksi", "ke", "data", "kec", "desa", "catatan", "jenis", "jumlah", "klien_id", "waktu_klien", "yakin", "logbook_id"]); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  const lr = luring(b.o, kini); if (lr.galat) return gagal(400, lr.galat);
  if (!["status", "ubah", "stok"].includes(b.o.aksi)) return gagal(400, "aksi harus status, ubah, atau stok");
  const r = await muatBaris(env, p, id, req); if (!r) return gagal(404, "catatan tidak ada");
  if (p.pusdalops) {   // staf Pusdalops hanya menerima ke Logbook, di provinsi wilayahnya
    if (b.o.aksi !== "status" || MEJA[r.meja].transisi[r.status]?.[b.o.ke] !== "pusdalops") return gagal(403, "staf Pusdalops hanya boleh menerima catatan terverifikasi ke Logbook");
  }
  const ulang = async () => json({catatan: baris(await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first(), kini, p, await namaGudang(env, [r])), ulang: true});
  if (lr.klien && await env.DB.prepare("SELECT 1 FROM meja_jejak WHERE catatan_id = ? AND klien_id = ?").bind(id, lr.klien).first()) return ulang();   // kiriman ulang antrean luring: sudah tercatat
  const M = MEJA[r.meja], lama = JSON.parse(r.data), cat = b.o.catatan == null ? null : tx(b.o.catatan, 200);
  if (cat === undefined) return gagal(400, "catatan maksimal 200 huruf");
  if (cat && r.meja === "dampak") { const g = teksBersih(cat); if (g) return gagal(400, `catatan: ${g}`); }
  if (b.o.aksi === "stok") return ubahStok(env, p, r, b.o, cat, kini);
  let ke = r.status, data, kec = r.kec, desa = r.desa, gd = null, dAwal = 0, ubahAngka = "";
  if (b.o.aksi === "status") {
    ke = b.o.ke;
    const peran = typeof ke === "string" && Object.hasOwn(M.transisi[r.status] || {}, ke) ? M.transisi[r.status][ke] : null;
    if (!peran) return gagal(409, `transisi ${r.status} ke ${String(ke).slice(0, 30)} tidak sah untuk meja ${M.nama}`);
    if (peran === "sistem") return gagal(409, `transisi ${r.status} ke ${ke} hanya dilakukan sistem`);
    if (peran === "admin" && p.petugas) return gagal(403, `perpindahan ke ${ke} hanya boleh oleh admin`);
    if (peran === "pusdalops" && (p.petugas || p.ulp)) return gagal(403, `perpindahan ke ${ke} hanya boleh oleh moderator atau staf Pusdalops/Koordalops`);
    const v = validasi(M.id, b.o.data ?? {}, ke, kini, lama); if (v.galat) return gagal(400, v.galat);
    data = {...lama, ...v.data};
    const gg = M.gerbang?.(ke, data, {kec: r.kec, desa: r.desa}); if (gg) return gagal(400, gg);   // dampak: inti lengkap sebelum diverifikasi
    /* logistik dikirim dari gudang: stok gudang berkurang jumlah_kirim dalam batch yang sama */
    if (r.meja === "logistik" && ke === "dikirim" && data.gudang_asal) {
      gd = await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(data.gudang_asal).first();
      if (!gd || gd.meja !== "gudang" || gd.prov !== r.prov || gd.kab !== r.kab || gd.dummy !== r.dummy) return gagal(400, "gudang asal tidak ditemukan di kabupaten ini");
      const g = JSON.parse(gd.data);
      if (g.barang !== data.barang) return gagal(400, `gudang itu menyimpan ${g.barang}, bukan ${data.barang}`);
      if (!(data.jumlah_kirim > 0)) return gagal(400, "jumlah dikirim harus lebih dari 0 bila memakai gudang asal");
      if (gd.stok < data.jumlah_kirim) return gagal(409, `stok gudang tidak cukup: tersisa ${gd.stok} ${g.satuan}, dikirim ${data.jumlah_kirim}`);
    }
  } else {
    if (!M.turunan && !M.ubahBuka && r.status !== M.awal) return gagal(409, `isi hanya bisa diubah selama status ${M.awal}; pakai perpindahan status`);
    const v = validasi(M.id, b.o.data ?? {}, null, kini); if (v.galat) return gagal(400, v.galat);
    if (r.meja === "gudang" && ["gudang", "barang", "satuan"].some(k => v.data[k] !== lama[k])) return gagal(409, "nama gudang, barang, dan satuan tidak bisa diubah; buat catatan baru");
    const wl = wilayahTeks({kec: b.o.kec ?? r.kec, desa: b.o.desa ?? r.desa}, M); if (wl.galat) return gagal(400, wl.galat);
    data = v.data; ({kec, desa} = wl);
    for (const sk of M.sistem ?? []) if (lama[sk] != null) data[sk] = lama[sk];   // tautan Logbook tidak hilang saat isi diperbarui
    if (M.ubahBuka && r.status !== M.awal) ke = M.awal;   // isi berubah sesudah diverifikasi/diterima: verifikasi ulang, penerimaan berikutnya jadi pengkinian
    /* gudang: stok_awal menggerakkan saldo, jadi petugas tidak boleh; admin boleh dan selisih terhadap stok_awal lama menggeser saldo dan dicatat sebagai baris meja_stok koreksi (saldo bergeser relatif, bukan dihitung ulang) */
    if (r.meja === "gudang") {
      dAwal = data.stok_awal - lama.stok_awal;
      if (dAwal && p.petugas) return gagal(403, "stok awal gudang hanya boleh diubah admin; petugas memakai aksi stok (masuk/keluar)");
      ubahAngka = ["stok_awal", "ambang_min"].filter(k => data[k] !== lama[k]).map(k => `${k} ${lama[k]} ke ${data[k]}`).join("; ");
    }
  }
  if (p.petugas) { const l = await laju(env, p.petugas.id, "meja.tulis", LAJU_TULIS, kini); if (l) return l; }
  const terima = r.meja === "dampak" && ke === "masuk_logbook" && b.o.aksi === "status";
  if (terima) { const l = await laju(env, p.oleh, "meja.terima", LAJU_TERIMA, kini); if (l) return l; }
  let rencana; if (terima) { rencana = await siapkanTerima(env, req, r, data, b.o, kini); if (rencana instanceof Response) return rencana; }
  /* UPDATE bersyarat status lama (dua penulis serentak: yang kedua 409); jejak hanya masuk bila UPDATE mengubah baris; langkah gudang mengikuti rantai changes() */
  const gudangIsi = r.meja === "gudang" && b.o.aksi === "ubah";
  const st = [
    env.DB.prepare(`UPDATE meja_catatan SET status = ?, data = ?, kec = ?, desa = ?, diubah = ?${gudangIsi ? ", stok = stok + ?" : ""} WHERE id = ? AND status = ?`)
      .bind(ke, JSON.stringify(data), kec, desa, Math.max(lr.waktu, r.diubah), ...(gudangIsi ? [dAwal] : []), id, r.status),
    env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh, catatan, klien_id, diterima) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() > 0")
      .bind(id, r.status, ke, lr.waktu, p.oleh, b.o.aksi === "ubah" ? ((cat || "isi diubah") + (ubahAngka ? ` (${ubahAngka})` : "")).slice(0, 200) : cat, lr.klien, kini),
  ];
  if (gudangIsi && dAwal) st.push(env.DB.prepare("INSERT INTO meja_stok (gudang_id, jenis, delta, saldo, waktu, oleh, catatan, dummy) SELECT id, 'koreksi', ?, stok, ?, ?, ?, dummy FROM meja_catatan WHERE id = ? AND changes() > 0")
    .bind(dAwal, kini, p.oleh, `koreksi stok awal ${lama.stok_awal} ke ${lama.stok_awal + dAwal}`, id));
  if (gd) st.push(
    env.DB.prepare("UPDATE meja_catatan SET stok = stok - ?, diubah = max(diubah, ?) WHERE id = ? AND changes() > 0").bind(data.jumlah_kirim, kini, gd.id),
    env.DB.prepare("INSERT INTO meja_stok (gudang_id, jenis, delta, saldo, logistik_id, waktu, oleh, catatan, dummy) SELECT id, 'keluar', ?, stok, ?, ?, ?, ?, dummy FROM meja_catatan WHERE id = ? AND changes() > 0")
      .bind(-data.jumlah_kirim, id, kini, p.oleh, `dikirim untuk ${data.posko}`.slice(0, 200), gd.id));
  let u;
  try { [u] = await env.DB.batch(st); }
  catch (e) { if (lr.klien && /UNIQUE/i.test(String(e?.message || e))) return ulang(); if (/UNIQUE/i.test(String(e?.message || e)) && UNIK[r.meja]) return gagal(409, UNIK[r.meja]); if (/CHECK/i.test(String(e?.message || e))) return gagal(409, gd ? "stok gudang tidak cukup (berubah bersamaan); muat ulang" : "stok akhir tidak boleh minus"); throw e; }
  if (!u.meta.changes) return gagal(409, "status berubah di waktu yang sama; muat ulang lalu coba lagi");
  let logbook; if (terima) { logbook = await terimaKeLogbook(env, req, p, r, rencana, kini); if (logbook instanceof Response) { await SELESAI_SEGARKAN(env, r.meja, r.prov, r.kab, r.dummy, kini); return logbook; } }
  await SELESAI_SEGARKAN(env, r.meja, r.prov, r.kab, r.dummy, kini);
  if (gd) await SELESAI_SEGARKAN(env, "gudang", gd.prov, gd.kab, gd.dummy, kini);
  return json({catatan: baris(await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first(), kini, p, await namaGudang(env, [{meja: r.meja, data: JSON.stringify(data)}])), ...(logbook ? {logbook} : {})});
}

/* ---------------------------------------------------------------- terima ke Logbook (meja dampak; Juklak 7/2023, DATA-DAMPAK.md "Alur dan status") */
let WILAYAH = null;
async function daftarKab(env, req) {
  if (WILAYAH) return WILAYAH;
  const r = env.ASSETS ? await env.ASSETS.fetch(new Request(new URL("/data/bnpb/wilayah.json", req.url))) : null;
  return r?.ok ? (WILAYAH = (await r.json()).kab || []) : [];   // tanpa data wilayah: kejadian tetap diterima, tanpa KIB
}
const ringkasKandidat = k => ({id: k.id, kib: k.kib ?? null, mulai: k.mulai, status: k.status});
/* sebelum klaim: pasangkan kejadian Logbook dan uji muatan dengan validasi Logbook yang sama. Mengembalikan Response (tolak, catatan tetap diverifikasi) atau rencana. */
async function siapkanTerima(env, req, r, data, o, kini) {
  if (r.dummy) return gagal(409, "catatan contoh (dummy) tidak diterima ke Logbook; Logbook hanya memuat data nyata");
  const kab = cariKab(await daftarKab(env, req), r.prov, r.kab), nama = kab?.nama ?? tutupKab(r.kab);
  const m = bangunMuatan(data, {prov: r.prov, kab: nama, kec: r.kec, desa: r.desa, kini, yakin: o.yakin === true});
  const periksa = periksaEntri({...m.entri, kab_bps: kab?.kode}, kini); if (periksa.galat) return json({galat: `Logbook menolak isian: ${periksa.galat}`, wajar: periksa.wajar}, 400);
  let id = null, k = null;
  if (o.logbook_id == null && data.logbook_id) {   // tautan tersimpan dipakai hanya bila jenis, kabupaten, dan tanggal mulai masih cocok; kalau tidak, cari ulang seperti biasa
    const t = await kejadianLogbookById(env, data.logbook_id);
    if (t && t.jenis === data.jenis && t.prov === r.prov && t.kab === nama && tanggalWib(Date.parse(t.mulai)) === data.tanggal) { id = t.id; k = t; }
  }
  if (id) { /* tautan tersimpan sah */ }
  else if (o.logbook_id != null) {
    if (typeof o.logbook_id !== "string" || !RE_ID.test(o.logbook_id)) return gagal(400, "logbook_id: id kejadian Logbook (16 hex)");
    k = await kejadianLogbookById(env, o.logbook_id);
    if (!k || k.jenis !== data.jenis || k.prov !== r.prov || k.kab !== nama) return gagal(400, "logbook_id harus kejadian Logbook berjenis sama di kabupaten ini"); id = k.id;
  } else {
    const cocok = await cariKejadianLogbook(env, data.jenis, r.prov, nama, data.tanggal);
    if (cocok.length > 1) return json({galat: `ada ${cocok.length} kejadian Logbook dengan jenis, kabupaten, dan tanggal mulai yang sama; kirim logbook_id kejadian yang dimaksud`, kandidat: cocok.map(ringkasKandidat)}, 409);
    if (cocok.length) { k = cocok[0]; id = k.id; }
  }
  if (k && k.status !== "buka") return json({galat: "kejadian Logbook tujuan sudah ditutup; catatan tetap diverifikasi. Pilih kejadian lain (logbook_id) atau minta Pusdalops membuat kejadian baru", kandidat: [ringkasKandidat(k)]}, 409);
  if (!k) { const lj = luarJendela(data, kini); if (lj) return gagal(422, lj); }
  return {id, ...m, kab_bps: kab?.kode};
}
/* sesudah klaim: tulis ke Logbook lewat jalur yang sama dengan rute Logbook. Gagal = klaim dibatalkan (kembali diverifikasi) dan galatnya diteruskan apa adanya. */
async function terimaKeLogbook(env, req, p, r, rencana, kini) {
  let res;
  try { res = rencana.id ? await lanjutEntri(env, p.oleh, {...rencana.entri, kab_bps: rencana.kab_bps}, kini, rencana.id, p.pusdalops ? req : null)
    : await buatKejadian(env, p.oleh, {...rencana.kejadian, kab_bps: rencana.kab_bps, entri: rencana.entri}, kini, null); }
  catch (e) { await batalTerima(env, r.id, kini, p.oleh, "galat basis data Logbook"); throw e; }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) { await batalTerima(env, r.id, kini, p.oleh, String(j.galat || res.status)); return json({galat: `Logbook menolak: ${j.galat || res.status}; catatan kembali berstatus diverifikasi`, wajar: j.wajar}, res.status); }
  const logbookId = rencana.id ?? j.kejadian.id, kib = rencana.id ? await kibLogbook(env, logbookId) : j.kejadian.kib ?? null;
  let gagalTaut = false;
  try { await simpanTautanLogbook(env, r.id, logbookId, kib); } catch (e) { gagalTaut = true; }   // Logbook sudah tertulis: balas sukses; penerimaan berikutnya memasangkan lewat pencarian, tanpa menggandakan
  const peringatan = [kib ? "" : "KIB tidak dibuat: kode BPS kabupaten tidak ditemukan di data wilayah", gagalTaut ? "tautan ke Logbook belum tersimpan di catatan; penerimaan berikutnya akan memasangkan ulang lewat pencarian" : ""].filter(Boolean).join("; ");
  return {kejadian_id: logbookId, kib, kib_entri: j.entri?.kib ?? null, tindakan: rencana.id ? "tambah" : "buat", ...(peringatan ? {peringatan} : {})};
}

/* ---------------------------------------------------------------- agregat (tabel meja_ringkas; rekap admin, ringkas publik, rapor) */
const KOL_R = "SELECT meja, prov, kab, kec, desa, status, data, dibuat, diubah, stok, dummy FROM meja_catatan";
function kumpul(rows, kini, acc = {r: new Map(), b: new Map(), t: new Map(), k: new Map()}) {
  for (const r of rows) {
    const rec = {...recOf(r)}, M = MEJA[r.meja], se = statusEfektif(r.meja, rec, kini), kunci = [r.meja, r.prov, r.kab, se, r.dummy].join("\t");
    let a = acc.r.get(kunci); if (!a) acc.r.set(kunci, a = {meja: r.meja, prov: r.prov, kab: r.kab, status: se, dummy: r.dummy, n: 0, bahaya: 0, jumlah: Object.fromEntries(M.rekap.map(c => [c, 0])), terbaru: 0});
    const tanda = tandaBahaya(r.meja, rec, kini);
    a.n++; if (tanda.length) a.bahaya++; a.terbaru = Math.max(a.terbaru, r.diubah);
    if (M.kelengkapan) {   // agregat kelengkapan per kabupaten dari baris yang SUDAH dibaca (tanpa pemindaian tambahan)
      const h = M.kelengkapan(rec.data, {kec: r.kec, desa: r.desa}), kz = [r.prov, r.kab, r.dummy].join("\t");
      const z = acc.k.get(kz) ?? (acc.k.set(kz, {prov: r.prov, kab: r.kab, dummy: r.dummy, n: 0, persen: 0, inti: 0, belum: 0, kosong: {}, terbaru: 0}), acc.k.get(kz));
      z.n++; z.persen += h.persen; if (h.inti_lengkap) z.inti++; if (tanda.includes("belum_dimutakhirkan")) z.belum++; z.terbaru = Math.max(z.terbaru, r.diubah);
      for (const x of [...h.kurang_inti, ...h.kurang_rinci]) z.kosong[x.nama] = (z.kosong[x.nama] || 0) + 1;
    }
    /* rekapTerakhir (data harian): jumlah hanya dari catatan terbaru per tempat; tempat yang sudah tidak berjalan tidak dihitung */
    const T = M.rekapTerakhir, kt = T && [r.meja, r.prov, r.kab, r.dummy, String(rec.data[T.kunci]).toLowerCase()].join("\t"), lalu = T && acc.t.get(kt);
    if (!T || !lalu || lalu.tgl < rec.data[T.tanggal]) {
      if (lalu) for (const c of M.rekap) lalu.a.jumlah[c] -= lalu.d[c] || 0;
      const d = !T || T.status === se ? rec.data : {};
      if (T) acc.t.set(kt, {tgl: rec.data[T.tanggal], a, d});
      for (const c of M.rekap) a.jumlah[c] += d[c] || 0;
    }
    const bc =r.meja === "renkon" ? rec.data.bencana : r.meja === "kaji_cepat" ? rec.data.kejadian : null;
    if (bc) {
      const kb = [r.meja, bc, r.prov, r.kab, r.dummy].join("\t"); let x = acc.b.get(kb); if (!x) acc.b.set(kb, x = {meja: r.meja, bencana: bc, prov: r.prov, kab: r.kab, dummy: r.dummy, n: 0, berlaku: 0});
      x.n++; if (r.meja !== "renkon" || se !== "kedaluwarsa") x.berlaku++;
    }
  }
  return acc;
}
/* satu pernyataan per 200 baris: larik JSON lewat json_each (D1 membatasi 100 parameter per pernyataan) */
function sisip(acc, env) {
  const potong = (l, n) => Array.from({length: Math.ceil(l.length / n)}, (_, i) => l.slice(i * n, i * n + n)), out = [];
  for (const c of potong([...acc.r.values()].map(a => [a.meja, a.prov, a.kab, a.status, a.dummy, a.n, a.bahaya, JSON.stringify(a.jumlah), a.terbaru]), 200))
    out.push(env.DB.prepare("INSERT INTO meja_ringkas (meja, prov, kab, status, dummy, n, bahaya, jumlah, terbaru) SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'), json_extract(value, '$[4]'), json_extract(value, '$[5]'), json_extract(value, '$[6]'), json_extract(value, '$[7]'), json_extract(value, '$[8]') FROM json_each(?)").bind(JSON.stringify(c)));
  for (const c of potong([...acc.b.values()].map(a => [a.meja, a.bencana, a.prov, a.kab, a.dummy, a.n, a.berlaku]), 200))
    out.push(env.DB.prepare("INSERT INTO meja_ringkas_bencana (meja, bencana, prov, kab, dummy, n, berlaku) SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]'), json_extract(value, '$[3]'), json_extract(value, '$[4]'), json_extract(value, '$[5]'), json_extract(value, '$[6]') FROM json_each(?)").bind(JSON.stringify(c)));
  return out;
}
/* kelengkapan = langkah TERPISAH dari meja_ringkas: tabel meja_kelengkapan (0119) bisa belum ada di produksi; hanya galat itu yang ditelan, meja lama tetap diperbarui */
const sisipKl = (acc, env) => {
  const kl = [...acc.k.values()].map(z => [z.prov, z.kab, z.dummy, z.n, z.persen, z.inti, z.belum, JSON.stringify(Object.fromEntries(Object.entries(z.kosong).sort((x, y) => y[1] - x[1]).slice(0, 25))), z.terbaru]), out = [];
  for (let i = 0; i < kl.length; i += 100) out.push(stmtSisipKelengkapan(env, kl.slice(i, i + 100)));
  return out;
};
const tulisKl = async (env, stmts) => { try { await batchTulis(env, stmts); } catch (e) { if (!/no such table: meja_kelengkapan/i.test(String(e?.message || e))) throw e; } };
/* bangun ulang SATU kelompok (meja, prov, kab, dummy) dari catatan yang sudah tersimpan */
export async function segarkanGrup(env, meja, prov, kab, dummy, kini = Date.now()) {
  const rows = (await env.DB.prepare(`${KOL_R} WHERE meja = ? AND prov = ? AND kab = ? AND dummy = ?`).bind(meja, prov, kab, dummy).all()).results.map(r => ({...r, dummy}));
  const acc = kumpul(rows, kini);
  await env.DB.batch([env.DB.prepare("DELETE FROM meja_ringkas WHERE meja = ? AND prov = ? AND kab = ? AND dummy = ?").bind(meja, prov, kab, dummy),
    env.DB.prepare("DELETE FROM meja_ringkas_bencana WHERE meja = ? AND prov = ? AND kab = ? AND dummy = ?").bind(meja, prov, kab, dummy),
    ...sisip(acc, env)]);
  if (MEJA[meja].kelengkapan) await tulisKl(env, [stmtHapusKelengkapanGrup(env, prov, kab, dummy), ...sisipKl(acc, env)]);
}
/* bangun ulang SEMUA, membaca catatan bertahap (kunci id, 1000 per halaman), tanpa batas baris. Dipanggil cron tiap jam dan saat tabel basi.
   ponytail: tulis yang masuk di tengah pemindaian bisa tertimpa sampai tulis/segarkan berikutnya; paling lama satu jam. */
export async function segarkanRingkas(env, kini = Date.now()) {
  const acc = {r: new Map(), b: new Map(), t: new Map(), k: new Map()}; let akhir = "";
  for (;;) {
    const rows = (await env.DB.prepare(`SELECT id, meja, prov, kab, kec, desa, status, data, dibuat, diubah, stok, dummy FROM meja_catatan WHERE id > ? ORDER BY id LIMIT 1000`).bind(akhir).all()).results;
    kumpul(rows, kini, acc); if (rows.length < 1000) break; akhir = rows[rows.length - 1].id;
  }
  await env.DB.batch([env.DB.prepare("DELETE FROM meja_ringkas"), env.DB.prepare("DELETE FROM meja_ringkas_bencana"), ...sisip(acc, env),
    env.DB.prepare("INSERT INTO meja_ringkas_meta (kunci, nilai) VALUES ('dihitung', ?) ON CONFLICT (kunci) DO UPDATE SET nilai = excluded.nilai").bind(kini)]);
  await tulisKl(env, [stmtHapusKelengkapan(env), ...sisipKl(acc, env)]);
}
async function bacaRingkas(env, kini, ikut, tanpaBaris = false) {
  let m = await env.DB.prepare("SELECT nilai FROM meja_ringkas_meta WHERE kunci = 'dihitung'").first();
  if (!m || kini - m.nilai > TTL_RINGKAS) { await segarkanRingkas(env, kini); m = {nilai: kini}; }
  if (tanpaBaris) return {dihitung: m.nilai, rows: []};
  const dm = ikut ? "" : " WHERE dummy = 0";
  return {dihitung: m.nilai, rows: (await env.DB.prepare(`SELECT meja, prov, kab, status, dummy, n, bahaya, jumlah, terbaru FROM meja_ringkas${dm}`).all()).results};
}
/* per = "prov" (publik) atau "kab"; hanya angka, tanpa nama orang */
function agregat(rows, per) {
  const out = {};
  for (const r of rows) {
    const key = per === "prov" ? r.prov : r.prov + "|" + r.kab, a = ((out[r.meja] ??= {})[key] ??= {n: 0, status: {}, bahaya: 0, jumlah: {}, terbaru: 0});
    a.n += r.n; a.status[r.status] = (a.status[r.status] || 0) + r.n; a.bahaya += r.bahaya; a.terbaru = Math.max(a.terbaru, r.terbaru);
    for (const [c, v] of Object.entries(JSON.parse(r.jumlah))) a.jumlah[c] = (a.jumlah[c] || 0) + v;
  }
  return out;
}
async function rekap(env, req, url, kini) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  const ikut = url.searchParams.get("dummy") === "1", {dihitung, rows} = await bacaRingkas(env, kini, ikut);
  const petugasKab = (await env.DB.prepare(`SELECT DISTINCT prov, kab FROM meja_petugas WHERE dicabut IS NULL ${ikut ? "" : "AND dummy = 0"}`).all()).results;
  const kabAda = new Set([...rows.filter(r => r.prov !== PUSAT.prov).map(r => r.prov + "|" + r.kab), ...petugasKab.map(r => r.prov + "|" + r.kab)]);
  /* kabupaten tanpa renkon berlaku (belum kedaluwarsa) per bencana; bencana yang dihitung = yang pernah muncul di renkon atau kaji cepat */
  const bc = (await env.DB.prepare(`SELECT meja, bencana, prov, kab, sum(n) n, sum(berlaku) berlaku FROM meja_ringkas_bencana${ikut ? "" : " WHERE dummy = 0"} GROUP BY meja, bencana, prov, kab`).all()).results;
  const punya = new Set(bc.filter(r => r.meja === "renkon" && r.berlaku > 0).map(r => `${r.bencana}|${r.prov}|${r.kab}`));
  const bencana = BENCANA.filter(b => bc.some(r => r.bencana === b));
  return json({kini, dihitung, per_kab: agregat(rows, "kab"), tanpa_renkon: Object.fromEntries(bencana.map(b => [b, [...kabAda].filter(k => !punya.has(`${b}|${k}`)).sort()]))});
}
/* publik: angka per provinsi. Dummy hanya untuk admin ?dummy=1 (tanpa cache). */
async function ringkas(env, req, url, kini, ctx) {
  const ambil = async ikut => { const {dihitung, rows} = await bacaRingkas(env, kini, ikut); return json({dibuat: kini, dihitung, meja: agregat(rows.filter(r => MEJA[r.meja].publik !== false), "prov")}); };
  if (url.searchParams.get("dummy") === "1" && await modOK(env, req)) return ambil(true);
  return cacheTepi(new Request(new URL("/api/meja/ringkas", url), {method: "GET"}), ctx, 120, () => ambil(false));
}

/* ---------------------------------------------------------------- kelengkapan Data kejadian dan dampak per kabupaten/kota (admin dan staf Pusdalops) */
const LABEL_BUTIR = Object.fromEntries(MEJA.dampak.kolom.map(c => [c.nama, c.label]));
const labelButir = n => LABEL_BUTIR[n] ?? (n.startsWith("bagian_") ? `${BAGIAN[n.slice(7)]}: belum ada butir terisi` : n);
async function kelengkapanKab(env, req, url, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  if (p.petugas || p.ulp) return gagal(403, "kelengkapan per kabupaten hanya untuk admin dan staf Pusdalops");
  const ikut = url.searchParams.get("dummy") === "1" && !p.pusdalops, ws = p.pusdalops ? wilayahStaf(req) : [];
  const {dihitung} = await bacaRingkas(env, kini, ikut, true);   // memastikan agregat tidak lebih tua dari 2 jam
  let baca; try { baca = await bacaKelengkapan(env, ikut); } catch (e) { if (/no such table: meja_kelengkapan/i.test(String(e?.message || e))) return gagal(503, "Kelengkapan belum diaktifkan (migrasi 0119 belum diterapkan)"); throw e; }
  const kab = baca.filter(z => !ws.length || ws.includes(z.prov)).map(z => ({prov: z.prov, kab: z.kab, dummy: !!z.dummy, kejadian: z.n, persen: Math.round(z.persen_jumlah / z.n), inti_lengkap: z.inti_lengkap,
    belum_dimutakhirkan: z.belum, terbaru: z.terbaru, kosong: Object.entries(JSON.parse(z.kosong)).slice(0, 10).map(([nama, jumlah]) => ({nama, label: labelButir(nama), jumlah}))}))
    .sort((a, b) => a.persen - b.persen || a.prov.localeCompare(b.prov) || a.kab.localeCompare(b.kab));   // paling tidak lengkap dulu
  const n = kab.reduce((a, z) => a + z.kejadian, 0);
  return json({kini, dihitung, ringkas: {kabupaten: kab.length, kejadian: n, persen: n ? Math.round(kab.reduce((a, z) => a + z.persen * z.kejadian, 0) / n) : null}, kab});
}

/* ---------------------------------------------------------------- impor Data kejadian dan dampak (templat satu baris per kejadian; berkas dibaca di peramban) */
async function impor(env, req, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  if (p.hanya) return gagal(403, "peran ini tidak boleh mengimpor");
  if (p.petugas && !p.petugas.meja.includes("dampak")) return gagal(403, "meja ini tidak diizinkan untuk kodemu");
  const M = MEJA.dampak, b = await bacaBody(req, MAKS_IMPOR); if (b.galat) return gagal(b.status || 400, b.galat);
  const x = semuaKunci(b.o, ["baris"]); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  if (!Array.isArray(b.o.baris) || !b.o.baris.length || b.o.baris.length > MAKS_BARIS_IMPOR) return gagal(400, `baris harus larik 1 sampai ${MAKS_BARIS_IMPOR} isi`);
  const hasil = [], masuk = [], kabAda = new Map();
  b.o.baris.forEach((o, i) => {
    const salah = galat => hasil.push({baris: i + 1, status: "galat", galat});
    if (!o || typeof o !== "object" || Array.isArray(o)) return salah("baris harus objek");
    const k = semuaKunci(o, ["prov", "kab", "kec", "desa", "data"]); if (k) return salah(`kolom "${k.slice(0, 40)}" tidak dikenal`);
    const kabB = o.kab == null ? null : tx(o.kab, 60); let prov, kab;
    if (p.petugas) {
      if ((o.prov != null && o.prov !== p.petugas.prov) || (kabB != null && kabB !== p.petugas.kab)) return salah("kamu hanya boleh mengisi untuk kabupatenmu sendiri");
      ({prov, kab} = p.petugas);
    } else {
      if (typeof o.prov !== "string" || !RE_PROV.test(o.prov)) return salah("prov harus kode 2 digit");
      if (!kabB || kabB.length < 2) return salah("kabupaten 2-60 huruf");
      prov = o.prov; kab = kabB;
    }
    const wl = wilayahTeks(o, M); if (wl.galat) return salah(wl.galat);
    const v = validasi(M.id, o.data, null, kini); if (v.galat) return salah(v.galat);
    const json_ = JSON.stringify(v.data); if (json_.length > 20000) return salah("isian melebihi 20000 huruf (batas basis data)");   // galat per baris, bukan "ganda"
    kabAda.set(prov + "|" + kab, [prov, kab]);
    masuk.push({i, id: acak(8), prov, kab, kec: wl.kec, desa: wl.desa, data: json_, kini, oleh: p.oleh, petugas: p.petugas?.id ?? null});
  });
  if (kabAda.size > MAKS_KAB_IMPOR) return gagal(400, `satu impor paling banyak ${MAKS_KAB_IMPOR} kabupaten/kota (batas permintaan ke basis data); pecah berkasnya`);
  if (masuk.length) {
    if (!await skemaMejaAda(env, M.id)) return MEJA_BELUM();   // INSERT OR IGNORE akan menelan CHECK daftar meja sebagai "ganda": periksa skema dulu
    const l = await laju(env, p.oleh, "meja.impor", LAJU_IMPOR, kini); if (l) return l;   // petugas dan admin, per pelaku
    const res = await batchTulis(env, masuk.flatMap(m => stmtImporDampak(env, m)));
    masuk.forEach((m, j) => hasil.push(res[2 * j].meta.changes ? {baris: m.i + 1, status: "masuk", id: m.id} : {baris: m.i + 1, status: "ganda", galat: UNIK.dampak}));   // OR IGNORE: tabrakan indeks unik = ganda
    for (const [pv, kb] of kabAda.values()) await SELESAI_SEGARKAN(env, M.id, pv, kb, 0, kini);
  }
  hasil.sort((a, c) => a.baris - c.baris);
  const n = st => hasil.filter(h => h.status === st).length;
  return json({ringkas: {baris: hasil.length, masuk: n("masuk"), ganda: n("ganda"), galat: n("galat")}, hasil});
}

/* ---------------------------------------------------------------- rapor kinerja BPBD (indeks komposit, bobot sementara: RAPOR di meja_spek.js) */
const bulat = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
export function skorRespons(menit, dipanggil, direspons) {
  if (!dipanggil) return null;
  if (!direspons) return 0;
  const {respons_terbaik_menit: a, respons_terburuk_menit: z} = RAPOR;
  return bulat(100 * Math.min(1, Math.max(0, (z - menit) / (z - a))));
}
export function gabungSkor(k) {
  let s = 0, b = 0, n = 0;
  for (const [nama, bobot] of Object.entries(RAPOR.bobot)) if (k[nama] != null) { s += bobot * k[nama]; b += bobot; n++; }
  return {skor: b ? bulat(s / b) : null, komponen_ada: n};
}
async function hitungRapor(env, kini, ikut, admin) {
  const dm = ikut ? "" : " AND dummy = 0", K = new Map();
  const kab = (prov, nama) => { const key = prov + "|" + nama; if (!K.has(key)) K.set(key, {prov, kab: nama, dipanggil: 0, direspons: 0, medianMs: [], regu: 0, aktif: 0, laporan: 0, meja: {}, petugas: []}); return K.get(key); };
  const dari = kini - RAPOR.jendela_panggilan_hari * HARI;
  const [pg, md, rg, lp, pt, rr] = await Promise.all([
    env.DB.prepare(`SELECT prov, kab, count(*) d, count(direspons_pada) r FROM panggilan WHERE dipanggil_pada > ?${dm} GROUP BY prov, kab`).bind(dari).all(),
    /* median di SQL: hanya 1 atau 2 baris tengah per kabupaten yang kembali, tanpa batas baris */
    env.DB.prepare(`SELECT prov, kab, w FROM (SELECT prov, kab, direspons_pada - dipanggil_pada w, row_number() OVER (PARTITION BY prov, kab ORDER BY direspons_pada - dipanggil_pada) rn, count(*) OVER (PARTITION BY prov, kab) c
      FROM panggilan WHERE dipanggil_pada > ? AND direspons_pada IS NOT NULL${dm}) WHERE rn IN ((c + 1) / 2, (c + 2) / 2)`).bind(dari).all(),
    env.DB.prepare(`SELECT prov, kab, count(*) n FROM regu WHERE dicabut IS NULL${dm} GROUP BY prov, kab`).all(),
    env.DB.prepare(`SELECT prov, kab, count(*) n, count(DISTINCT regu_id) aktif FROM lapangan WHERE dibuat > ?${dm} AND id NOT IN (SELECT lapangan_id FROM lapangan_tahan WHERE putusan = 'tahan') GROUP BY prov, kab`).bind(kini - RAPOR.jendela_regu_hari * HARI).all(),
    env.DB.prepare(`SELECT prov, kab, nama FROM meja_petugas WHERE dicabut IS NULL${dm}`).all(),
    bacaRingkas(env, kini, ikut),
  ]);
  for (const r of pg.results) { const k = kab(r.prov, r.kab); k.dipanggil = r.d; k.direspons = r.r; }
  for (const r of md.results) kab(r.prov, r.kab).medianMs.push(r.w);
  for (const r of rg.results) kab(r.prov, r.kab).regu = r.n;
  for (const r of lp.results) { const k = kab(r.prov, r.kab); k.aktif = r.aktif; k.laporan = r.n; }
  for (const r of pt.results) kab(r.prov, r.kab).petugas.push(r.nama);
  for (const r of rr.rows) { if (!MEJA_RAPOR.includes(r.meja)) continue; const m = (kab(r.prov, r.kab).meja[r.meja] ??= {n: 0, bahaya: 0}); m.n += r.n; m.bahaya += r.bahaya; }
  const hasil = [...K.values()].map(k => {
    const med = k.medianMs.length ? k.medianMs.reduce((x, y) => x + y, 0) / k.medianMs.length / MENIT : null, respons = skorRespons(med, k.dipanggil, k.direspons);
    const keaktifan = k.regu ? bulat(100 * Math.min(k.aktif, k.regu) / k.regu) : null;
    const mj = Object.fromEntries(MEJA_RAPOR.filter(m => k.meja[m]).map(m => [m, {...k.meja[m], skor: bulat(100 * (k.meja[m].n - k.meja[m].bahaya) / k.meja[m].n)}]));
    const skorMeja = Object.values(mj).map(m => m.skor), kelengkapan = skorMeja.length ? bulat(skorMeja.reduce((a, b) => a + b, 0) / skorMeja.length) : null;
    const g = gabungSkor({respons, keaktifan, kelengkapan});
    return {prov: k.prov, kab: k.kab, respons: {dipanggil: k.dipanggil, direspons: k.direspons, median_menit: med == null ? null : bulat(med, 1), skor: respons},
      regu: {terdaftar: k.regu, aktif: Math.min(k.aktif, k.regu), laporan_7h: k.laporan, skor: keaktifan}, kelengkapan: {meja: mj, skor: kelengkapan},
      ...g, ...(admin ? {petugas: k.petugas} : {})};
  }).sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1) || a.prov.localeCompare(b.prov) || a.kab.localeCompare(b.kab));
  const prov = {};
  for (const k of hasil) { const p = (prov[k.prov] ??= {prov: k.prov, n_kab: 0, n_dengan_skor: 0, jumlah: 0}); p.n_kab++; if (k.skor != null) { p.n_dengan_skor++; p.jumlah += k.skor; } }
  return {dibuat: kini, label: "indeks komposit, bobot sementara", bobot: RAPOR.bobot, kab: hasil,
    prov: Object.values(prov).map(({jumlah, ...p}) => ({...p, skor: p.n_dengan_skor ? bulat(jumlah / p.n_dengan_skor) : null})).sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1)),
    lapor_warga: "belum dihitung: tabel laporan tidak punya kolom prov/kab",
    waktu_tanggap_api: await waktuTanggapApi(env, kini, ikut)};   // blok terpisah dari src/sla.js; TIDAK masuk gabungSkor/RAPOR.bobot
}
async function raporAdmin(env, req, url, kini) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  return json(await hitungRapor(env, kini, url.searchParams.get("dummy") === "1", true));
}
async function raporPublik(env, req, url, kini, ctx) {
  return cacheTepi(new Request(new URL("/api/meja/rapor/publik", url), {method: "GET"}), ctx, 300, async () => json(await hitungRapor(env, kini, false, false)));
}

/* ---------------------------------------------------------------- ekspor bergaya DIBI (admin) */
export const DIBI_KOLOM = ["id_kejadian", "jenis_bencana", "tanggal", "provinsi", "kabupaten", "kecamatan", "desa", "meninggal", "hilang", "luka", "mengungsi",
  "rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan", "fasilitas_pendidikan", "fasilitas_kesehatan", "fasilitas_ibadah", "sumber", "status_verifikasi"];
export const DIBI_JENIS = {banjir: "BANJIR", longsor: "TANAH LONGSOR", karhutla: "KEBAKARAN HUTAN DAN LAHAN", gempa: "GEMPA BUMI", tsunami: "TSUNAMI", gunungapi: "GUNUNG MELETUS",
  kekeringan: "KEKERINGAN", cuaca_ekstrem: "CUACA EKSTREM", rob: "BANJIR ROB", lainnya: "LAINNYA"};
const DIBI_STATUS = {dilaporkan: "belum diverifikasi", diverifikasi: "terverifikasi", masuk_jitupasna: "terverifikasi, masuk JITUPASNA"};
export const barisDibi = r => { const d = JSON.parse(r.data);
  return [r.id, DIBI_JENIS[d.kejadian] || String(d.kejadian).toUpperCase(), d.tanggal, PROV[r.prov] || r.prov, r.kab, r.kec ?? "", r.desa ?? "", d.meninggal, d.hilang, d.luka, d.mengungsi,
    d.rumah_rb, d.rumah_rs, d.rumah_rr, d.sekolah, d.faskes, d.ibadah, r.oleh?.startsWith("petugas:") ? "BPBD kab/kota (Meja Kerja)" : "Admin pusat (Meja Kerja)", DIBI_STATUS[r.status] || r.status]; };
/* sel teks yang diawali = + - @ (atau tab/CR) diberi apostrof supaya tidak dijalankan sebagai rumus; semua sel dikutip */
export const selCsv = v => { let t = String(v ?? ""); if (typeof v === "string" && /^\s*[=+\-@]|^[\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
async function ekspor(env, req, url, kini) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  const q = url.searchParams, fmt = q.get("format") ?? "csv", meja = q.get("meja") ?? "kaji_cepat", dari = q.get("dari"), sampai = q.get("sampai");
  if (fmt !== "csv" && fmt !== "json") return gagal(400, "format harus csv atau json");
  if (meja !== "kaji_cepat" && meja !== "risiko") return gagal(400, "ekspor tersedia untuk meja kaji_cepat (DIBI) dan risiko (Lampiran I Juklak 17/2025)");
  const lampiran = q.get("lampiran") ?? "2", F = Object.hasOwn(EKSPOR_RISIKO, lampiran) ? EKSPOR_RISIKO[lampiran] : null;
  if (meja === "risiko" && !F) return gagal(400, "lampiran harus 2, 3, atau 4");
  for (const [n, v] of [["dari", dari], ["sampai", sampai]]) if (v != null && !tglSah(v)) return gagal(400, `${n} harus YYYY-MM-DD`);
  if (dari && sampai && dari > sampai) return gagal(400, "dari tidak boleh sesudah sampai");
  const w = ["meja = ?"], a = [meja], kaji = meja === "kaji_cepat";
  if (q.get("dummy") !== "1") w.push("dummy = 0");
  if (kaji && dari) { w.push("json_extract(data, '$.tanggal') >= ?"); a.push(dari); }
  if (kaji && sampai) { w.push("json_extract(data, '$.tanggal') <= ?"); a.push(sampai); }
  const urut = kaji ? "json_extract(data, '$.tanggal')" : "lower(json_extract(data, '$.unit_pemilik')), json_extract(data, '$.tahun'), json_extract(data, '$.kode')";
  const rows = (await env.DB.prepare(`SELECT id, prov, kab, kec, desa, data, status, oleh FROM meja_catatan WHERE ${w.join(" AND ")} ORDER BY ${urut}, id LIMIT ${MAKS_EKSPOR + 1}`).bind(...a).all()).results;
  const dipotong = rows.length > MAKS_EKSPOR; if (dipotong) rows.pop();
  let isi, kolom = DIBI_KOLOM, nama = `dibi-${meja}-${wib(kini)}`;
  if (kaji) isi = rows.map(barisDibi);
  else {
    const d = rows.map(r => JSON.parse(r.data)).filter(F.saring ?? (() => true));
    if (F.urut) d.sort(F.urut);
    isi = d.map(F.isi); kolom = F.kolom; nama = `risiko-format${lampiran}-${wib(kini)}`;
  }
  if (fmt === "json") return json({kolom, baris: isi.map(r => Object.fromEntries(kolom.map((k, i) => [k, r[i]]))), dibuat: kini, dipotong}, 200, {"content-disposition": `attachment; filename="${nama}.json"`});
  return new Response("\ufeff" + [kolom, ...isi].map(r => r.map(selCsv).join(",")).join("\r\n"), {headers: {"content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${nama}.csv"`,
    "cache-control": "no-store", "x-content-type-options": "nosniff", ...(dipotong ? {"x-ekspor-dipotong": "1"} : {})}});
}

/* ---------------------------------------------------------------- petugas berkode */
async function daftarPetugas(env, req) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  return json({meja: DAFTAR_PETUGAS, petugas: (await env.DB.prepare(`SELECT t.id, t.nama, t.prov, t.kab, t.meja, t.dibuat, t.dicabut, t.dummy, (SELECT count(*) FROM meja_catatan c WHERE c.petugas_id = t.id) catatan
    FROM meja_petugas t ORDER BY t.dibuat DESC LIMIT 500`).all()).results.map(r => ({...r, meja: JSON.parse(r.meja)}))});
}
async function buatPetugas(env, req, url, kini) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const x = semuaKunci(b.o, ["nama", "prov", "kab", "meja"]); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  const nama = tx(b.o.nama, 80), kab = tx(b.o.kab, 60);
  if (!nama || nama.length < 2) return gagal(400, "nama 2-80 huruf");
  if (typeof b.o.prov !== "string" || !RE_PROV.test(b.o.prov)) return gagal(400, "prov harus kode 2 digit");
  if (!kab || kab.length < 2) return gagal(400, "kabupaten 2-60 huruf");
  const mj = b.o.meja;
  if (!Array.isArray(mj) || !mj.length || !mj.every(m => typeof m === "string" && DAFTAR_PETUGAS.includes(m)) || new Set(mj).size !== mj.length) return gagal(400, `meja: satu atau lebih dari ${DAFTAR_PETUGAS.join(", ")}, tanpa duplikat`);
  const id = acak(8), {kode, kode_sha} = await kodeBaru();
  try { await env.DB.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, nama, b.o.prov, kab, JSON.stringify(mj), kode_sha, kini, p.oleh).run(); }
  catch (e) { if (/CHECK constraint failed|meja petugas tidak sah/i.test(String(e?.message || e)) && mj.includes("dampak") && !await skemaMejaAda(env, "dampak")) return MEJA_BELUM(); throw e; }   // kode tayang sebelum migrasi
  /* kode tampil SEKALI, di fragmen (#k=) supaya tidak masuk log server */
  return json({petugas: {id, nama, prov: b.o.prov, kab, meja: mj, dibuat: kini, dicabut: null}, kode, tautan: `${url.origin}/meja#k=${kode}`}, 201);
}
async function cabutPetugas(env, req, id, kini) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi !== "cabut") return gagal(400, "aksi harus cabut");
  const r = await env.DB.prepare("UPDATE meja_petugas SET dicabut = ? WHERE id = ? AND dicabut IS NULL").bind(kini, id).run();
  if (r.meta.changes) return json({id, dicabut: kini});
  return await env.DB.prepare("SELECT 1 FROM meja_petugas WHERE id = ?").bind(id).first() ? gagal(409, "kode ini sudah dicabut") : gagal(404, "petugas tidak ada");
}

/* ---------------------------------------------------------------- dummy (DUMMY.md): seluruh rantai Meja Kerja + bahan rapor di tiga kabupaten contoh */
const PROV_D = "62", KAB_D = ["Kab. Contoh Meja A", "Kab. Contoh Meja B", "Kab. Contoh Meja C"];
const tglD = (kini, hariLalu) => wib(kini - hariLalu * HARI);
function barisDummy(kini, id) {
  const t = h => tglD(kini, h), R = [];   // [meja, kab, status, umurJam, data, kec, desa]
  const add = (meja, kab, status, umurJam, data, desa = null, kec = null, ekstra = {}) => R.push({meja, kab, status, umurJam, data, desa, kec, ...ekstra});
  const A = KAB_D[0], B = KAB_D[1], C = KAB_D[2];
  const kaji = (kej, rb, rs, rr, mati) => ({kejadian: kej, tanggal: t(3), rumah_rb: rb, rumah_rs: rs, rumah_rr: rr, sekolah: 1, faskes: 0, ibadah: 2, jalan_km: 3.5, jembatan: 1, meninggal: mati, hilang: 0, luka: 4, mengungsi: 120});
  add("kaji_cepat", A, "dilaporkan", 5, kaji("banjir", 12, 30, 55, 0), "Desa Contoh Satu");
  add("kaji_cepat", A, "dilaporkan", 100, kaji("banjir", 4, 9, 20, 1), "Desa Contoh Dua");   // > 72 jam: tanda bahaya
  add("kaji_cepat", A, "diverifikasi", 50, kaji("longsor", 8, 11, 6, 2), "Desa Contoh Tiga");
  add("kaji_cepat", B, "masuk_jitupasna", 200, kaji("banjir", 20, 40, 80, 3), "Desa Contoh Empat", null, {kunci: "kjB1"});
  /* delapan kaji cepat masuk_jitupasna di kab A: tiap satu menjadi induk satu catatan rehab-rekon */
  for (let i = 1; i <= 8; i++) add("kaji_cepat", A, "masuk_jitupasna", 600 + i, kaji("banjir", 3, 5, 8, 0), `Desa Rehab ${i}`, null, {kunci: "kjA" + i});
  /* gudang kab A dan B; stok akhir = stok awal + transaksi (masuk, koreksi, dan keluar yang lahir dari logistik dikirim di bawah) */
  const gd = (gudang, barang, satuan, awal, ambang) => ({gudang, barang, satuan, stok_awal: awal, ambang_min: ambang});
  add("gudang", A, "tercatat", 5000, gd("Gudang Contoh Utama", "selimut", "lembar", 400, 150), null, null, {kunci: "gdSelimut"});
  add("gudang", A, "tercatat", 5000, gd("Gudang Contoh Utama", "terpal", "lembar", 150, 100), null, null, {kunci: "gdTerpal"});   // 150 - 100 dikirim = 50, di bawah ambang
  add("gudang", A, "tercatat", 5000, gd("Gudang Contoh Utama", "beras", "kg", 1000, 200), null, null, {kunci: "gdBeras"});
  add("gudang", B, "tercatat", 5000, gd("Gudang Contoh Cadangan", "family_kit", "paket", 400, 100), null, null, {kunci: "gdFamily"});
  const lg = (barang, jml, satuan, extra = {}) => ({barang, jumlah_diminta: jml, satuan, posko: "Posko Contoh", kebutuhan_untuk: 300, ...extra});
  add("logistik", A, "diminta", 3, lg("beras", 500, "kg"));
  add("logistik", A, "diminta", 30, lg("air_mineral", 2000, "dus"));   // > 24 jam: tanda bahaya
  add("logistik", A, "disetujui", 20, lg("tenda", 40, "unit"));
  add("logistik", A, "dikirim", 40, lg("selimut", 300, "lembar", {jumlah_kirim: 300, tgl_kirim: t(1), armada: "Truk 2 unit", gudang_asal: id("gdSelimut")}));
  add("logistik", A, "diterima", 80, lg("terpal", 100, "lembar", {jumlah_kirim: 100, tgl_kirim: t(2), jumlah_terima: 100, penerima: "Kepala Posko Contoh", gudang_asal: id("gdTerpal")}));   // pas
  add("logistik", B, "diterima", 90, lg("family_kit", 150, "paket", {jumlah_kirim: 150, tgl_kirim: t(3), jumlah_terima: 140, penerima: "Kepala Posko Contoh", gudang_asal: id("gdFamily")}));   // kurang
  add("logistik", B, "diterima", 90, lg("masker", 1000, "buah", {jumlah_kirim: 1000, tgl_kirim: t(3), jumlah_terima: 1050, penerima: "Kepala Posko Contoh"}));   // lebih
  const ds = (extra = {}) => ({kejadian: "Banjir Contoh", nomor_permohonan: "DSP/CONTOH/" + (Object.keys(extra).length + 1), nilai_diajukan: 500000000, tgl_ajuan: t(60), ...extra});
  add("dsp", A, "diajukan", 20, ds());
  add("dsp", A, "disetujui", 100, ds({nilai_disetujui: 400000000, tgl_setuju: t(45)}));
  add("dsp", A, "cair", 960, ds({nilai_disetujui: 400000000, tgl_setuju: t(50), nilai_cair: 400000000, tgl_cair: t(40), tgl_status_berakhir: t(120)}));   // status darurat berakhir 120 hari lalu, belum SPJ (> 3 bulan): spj_terlambat
  add("dsp", B, "cair", 240, ds({nilai_disetujui: 300000000, tgl_setuju: t(15), nilai_cair: 300000000, tgl_cair: t(10)}));
  add("dsp", B, "spj", 150, ds({nilai_disetujui: 300000000, tgl_setuju: t(30), nilai_cair: 300000000, tgl_cair: t(20), realisasi: 280000000, tgl_spj: t(5)}));
  add("dsp", B, "selesai", 100, ds({nilai_disetujui: 250000000, tgl_setuju: t(60), nilai_cair: 250000000, tgl_cair: t(50), realisasi: 250000000, tgl_spj: t(30), tgl_selesai: t(2)}));
  add("dsp", C, "ditolak", 100, ds({alasan: "Dokumen pendukung belum lengkap"}));
  /* rehab-rekon: tiap status di kab A (satu 'usulan' macet 75 hari) dan satu di kab B */
  const rh = (jit, extra = {}) => ({rumah_rb: 3, rumah_rs: 5, rumah_rr: 8, tgl_jitupasna: t(jit), ...extra});
  add("rehab", A, "jitupasna", 100, rh(5), null, null, {kaji: "kjA1"});
  add("rehab", A, "usulan", 200, rh(30, {nilai_usulan: 800000000, tgl_usulan: t(10)}), null, null, {kaji: "kjA2"});
  add("rehab", A, "disetujui", 300, rh(60, {nilai_usulan: 800000000, tgl_usulan: t(40), nilai_disetujui: 700000000, tgl_setuju: t(20)}), null, null, {kaji: "kjA3"});
  add("rehab", A, "cair", 400, rh(70, {nilai_usulan: 800000000, tgl_usulan: t(50), nilai_disetujui: 700000000, tgl_setuju: t(30), nilai_cair: 650000000, tgl_cair: t(15)}), null, null, {kaji: "kjA4"});
  add("rehab", A, "dibangun", 500, rh(90, {nilai_usulan: 800000000, tgl_usulan: t(60), nilai_disetujui: 700000000, tgl_setuju: t(45), nilai_cair: 700000000, tgl_cair: t(30), rumah_dibangun: 9, tgl_bangun: t(8)}), null, null, {kaji: "kjA5"});
  add("rehab", A, "selesai", 700, rh(150, {nilai_usulan: 800000000, tgl_usulan: t(120), nilai_disetujui: 700000000, tgl_setuju: t(100), nilai_cair: 700000000, tgl_cair: t(80), rumah_dibangun: 16, tgl_bangun: t(50), tgl_selesai: t(3)}), null, null, {kaji: "kjA6"});
  add("rehab", A, "ditolak", 300, rh(40, {nilai_usulan: 900000000, tgl_usulan: t(30), alasan: "Data penerima belum lengkap"}), null, null, {kaji: "kjA7"});
  add("rehab", A, "usulan", 1800, rh(90, {nilai_usulan: 800000000, tgl_usulan: t(75)}), null, null, {kaji: "kjA8"});   // 75 hari di tahap usulan: macet
  add("rehab", B, "cair", 400, rh(70, {nilai_usulan: 800000000, tgl_usulan: t(50), nilai_disetujui: 700000000, tgl_setuju: t(30), nilai_cair: 600000000, tgl_cair: t(20)}), null, null, {kaji: "kjB1"});
  const rk = (bencana, sah, sampai, uji) => ({bencana, judul: "Renkon " + bencana + " Contoh", tgl_sah: t(sah), berlaku_sampai: wib(kini + sampai * HARI), ...(uji == null ? {} : {reviu_terakhir: t(uji)}), tautan: "https://contoh.invalid/renkon"});
  add("renkon", A, "tercatat", 5000, rk("banjir", 300, 400, 30));   // berlaku
  add("renkon", A, "tercatat", 5000, rk("karhutla", 300, 40, 30));   // segera_habis
  add("renkon", B, "tercatat", 5000, rk("banjir", 800, -10, 400));   // kedaluwarsa
  add("renkon", C, "tercatat", 5000, rk("gempa", 300, 500, null));   // perlu_reviu (tanpa reviu, sah 300 hari lalu)
  const dt = (kelas, keg) => ({kelas, tahun_dibentuk: 2018, ...(keg == null ? {} : {kegiatan_terakhir: t(keg)})});
  add("destana", A, "tercatat", 5000, dt("utama", 30), "Desa Tangguh Satu", "Kec. Contoh");   // aktif
  add("destana", B, "tercatat", 5000, dt("madya", 400), "Desa Tangguh Dua", "Kec. Contoh");   // pasif
  add("destana", C, "tercatat", 5000, dt("pratama", null), "Desa Tangguh Tiga", "Kec. Contoh");   // pasif
  /* transaksi stok di luar logistik: pasokan masuk dan koreksi hitung ulang (umur dalam jam) */
  /* pengungsi: dua tempat di kab A (satu berjalan beberapa hari, satu sudah ditutup) dan satu di kab B; kolom turunan lewat rumus spek yang sama */
  const urPeng = {bayi_l: 2, bayi_p: 3, balita_l: 4, balita_p: 5, anak_l: 8, anak_p: 9, remaja_l: 6, remaja_p: 6, dewasa_l: 30, dewasa_p: 32, lansia_l: 4, lansia_p: 5};
  const pgs = (nama, h, jiwaTambah, o = {}) => { const d = {tgl_data: t(h), nama_tempat: nama, jenis_tempat: "terkonsentrasi", tipe_tempat: "fasilitas_umum", kejadian: "banjir", pendataan_ke: 12 - h, tgl_buka: t(14), kk: 40, ...urPeng, dewasa_l: urPeng.dewasa_l + jiwaTambah,
    hamil_t1: 1, hamil_t2: 2, hamil_t3: 1, menyusui: 3, yatim_anak_l: 1, pisah_balita_p: 1, dis_kursi_roda: 1, dis_netra: 1, anak_kk: 0, perempuan_kk: 4, nikah_dini: 1, penyakit_bawaan: 2,
    keb_air: "ada", keb_pangan: "ada", keb_sandang: "ada", keb_kesehatan: "ada", keb_hunian: "ada", keb_pendidikan: "tidak", saran: "Tambah layanan pendidikan darurat", ...o}; return {...d, ...MEJA.pengungsi.hitung(d)}; };
  add("pengungsi", A, "tercatat", 58, pgs("Balai Contoh Satu", 2, 0), "Desa Contoh Satu", "Kec. Contoh");
  add("pengungsi", A, "tercatat", 34, pgs("Balai Contoh Satu", 1, 5), "Desa Contoh Satu", "Kec. Contoh");
  add("pengungsi", A, "tercatat", 10, pgs("Balai Contoh Satu", 0, 8, {keb_air: "tidak"}), "Desa Contoh Satu", "Kec. Contoh");
  add("pengungsi", A, "tercatat", 120, pgs("GOR Contoh", 4, 0, {tgl_tutup: t(3), keb_pendidikan: "ada"}), "Desa Contoh Dua", "Kec. Contoh");
  add("pengungsi", B, "tercatat", 20, pgs("Masjid Contoh", 1, 2, {jenis_tempat: "tidak_terkonsentrasi", tipe_tempat: "tempat_ibadah"}), "Desa Contoh Empat", "Kec. Contoh");
  /* pengaduan: tiap status, satu lewat tenggat, satu anonim; identitas contoh ke tabel meja_pelapor */
  const adu = (reg, h, o = {}) => ({nomor_register: "ULP/CONTOH/" + reg, kanal: "website", tgl_terima: t(h), perihal: "Pengaduan contoh " + reg, uraian: "Uraian contoh, bukan pengaduan sungguhan", unit_terlapor: "Unit Kerja Contoh", ...o});
  const pusat = o => ({...o, prov: PUSAT.prov}), kontak = n => ({pelapor: {nama: "[DUMMY] Pelapor " + n, alamat: "Alamat contoh", kontak: "0800000000" + n, pekerjaan: "Karyawan"}});
  const tl = {kategori: "tidak_berkadar_pengawasan", wewenang: "bnpb", hasil_telaah: "Telaah contoh", tgl_telaah: t(9)}, ter = {tujuan: "Inspektorat III", tgl_diteruskan: t(8)}, tin = {tindakan: "klarifikasi", tgl_tindak: t(5)};
  add("pengaduan", PUSAT.kab, "register", 20, adu(1, 1), null, null, pusat(kontak(1)));
  add("pengaduan", PUSAT.kab, "register", 1500, adu(2, 60), null, null, pusat({}));   // anonim, lewat tenggat
  add("pengaduan", PUSAT.kab, "telaah", 200, adu(3, 10, tl), null, null, pusat(kontak(3)));
  add("pengaduan", PUSAT.kab, "diteruskan", 240, adu(4, 10, {...tl, ...ter}), null, null, pusat(kontak(4)));
  add("pengaduan", PUSAT.kab, "tindak_lanjut", 300, adu(5, 12, {...tl, ...ter, ...tin}), null, null, pusat(kontak(5)));
  add("pengaduan", PUSAT.kab, "selesai", 400, adu(6, 12, {...tl, ...ter, ...tin, simpulan: "Selesai ditindaklanjuti", tgl_selesai: t(2)}), null, null, pusat(kontak(6)));
  add("pengaduan", PUSAT.kab, "ditolak", 200, adu(7, 10, {...tl, alasan: "Materi tidak memenuhi 5W"}), null, null, pusat(kontak(7)));
  /* klaster: tiap jenis dokumen; satu tanpa tautan untuk tanda bahaya */
  const th = new Date(kini).getUTCFullYear(), kl = (dokumen, judul, h, o = {}) => ({tingkat: "kabupaten_kota", dokumen, judul: judul + " Contoh", tahun: th, tgl_dokumen: t(h), tautan: "https://contoh.invalid/klaster", ...o});
  add("klaster", A, "tercatat", 3000, kl("sk_klaster", "SK Klaster Logistik", 120), null, null);
  add("klaster", A, "tercatat", 2800, kl("rencana_kerja", "Rencana Kerja", 110));
  add("klaster", A, "tercatat", 100, kl("laporan_triwulan", "Laporan Triwulan", 4, {triwulan: "3", ringkasan: "Laporan contoh triwulan tiga"}));
  add("klaster", B, "tercatat", 900, {...kl("laporan_tahunan", "Laporan Tahunan", 30), tautan: undefined});   // tanpa tautan: tanda bahaya
  /* risiko: satu di atas selera, satu dalam selera (selera 8) */
  const rs = (kode, kategori, res, o = {}) => ({unit_pemilik: "Unit Kerja Contoh", tahun: th, jenis_konteks: "program", nama_konteks: "Program Contoh", indikator: "Indikator Contoh", kode, pernyataan: "Pernyataan risiko contoh " + kode, kategori, dampak: "Dampak contoh", spip: "ketaatan", skor_kemungkinan: 4, skor_dampak: 4, level: 16, pengendalian: "ada", uraian_pengendalian: "Pengendalian contoh", memadai: "memadai", res_kemungkinan: 2, res_dampak: 3, res_level: res, selera: 8, ...o});
  add("risiko", PUSAT.kab, "tercatat", 800, rs("CTH.01", "kepatuhan", 6), null, null, pusat({}));
  add("risiko", PUSAT.kab, "tercatat", 800, rs("CTH.02", "operasional", 12, {memadai: "belum_memadai", res_level: 16, res_kemungkinan: 4, res_dampak: 4}), null, null, pusat({}));
  add("risiko", PUSAT.kab, "tercatat", 800, rs("CTH.03", "kecurangan", 16, {pengendalian: "belum_ada", uraian_pengendalian: undefined, memadai: undefined, res_kemungkinan: 4, res_dampak: 4}), null, null, pusat({}));
  /* dampak: tiap status dan tingkat kelengkapan. kurang = baru jenis dan nama; inti = inti lengkap (bagian lain "tidak ada"), rincian umur kosong; penuh = 100%. Angka masuk akal, rincian umur tidak melebihi total. */
  const sebar = (n, v) => Object.fromEntries(["anak", "dewasa", "lansia"].flatMap((u, i) => ["l", "p"].map((s, j) => [`${n}_${u}_${s}`, v[2 * i + j]])));
  const penuh = (o = {}) => ({jenis: "banjir", nama_kejadian: "Banjir Sungai Contoh", tanggal: t(2), jam: "03:30", bujur: 113.912345, lintang: -2.212345, penyebab: "Hujan lebat di hulu sungai selama dua hari",
    kronologis: "Air sungai meluap pukul 03.30 WIB dan menggenangi tiga desa. Warga mengungsi ke balai desa.", deskripsi: "Banjir luapan sungai dengan tinggi genangan 50 sampai 120 cm.", sumber: "Laporan BPBD kabupaten",
    kondisi_mutakhir: "Genangan surut di dua desa, satu desa masih tergenang", status_darurat: "tanggap", upaya: "Evakuasi warga, dapur umum, dan penyedotan air dengan pompa", dokumentasi: "https://contoh.invalid/dokumentasi", sebaran: "https://contoh.invalid/sebaran",
    keb_dana: "Dana siap pakai 200 juta rupiah", keb_sdm: "40 personel relawan", keb_sarpras: "Dua perahu karet", keb_logistik: "Beras 2 ton dan selimut 300 lembar", keb_peralatan: "Dua pompa air",
    meninggal: 1, hilang: 0, luka: 6, mengungsi: 420, terdampak: 1800, ...sebar("meninggal", [0, 0, 1, 0, 0, 0]), ...sebar("luka", [1, 1, 2, 1, 0, 1]), ...sebar("mengungsi", [60, 55, 120, 130, 25, 30]), ...sebar("terdampak", [250, 240, 520, 540, 120, 130]),
    sawah_ha: 12.5, lahan_ha: 3, kebun_ha: 4.25, hutan_ha: 0, kolam_ha: 1.2, kios_rb: 0, kios_rs: 2, kios_rr: 5, kios_terendam: 14, pabrik_rb: 0, pabrik_rs: 0, pabrik_rr: 0, pabrik_terendam: 1,
    rugi_sawah: 125, rugi_lahan: 20, rugi_kebun: 30, rugi_kolam: 12, rugi_kios: 340, rugi_pabrik: 150,
    air_unit: 2, listrik_unit: 1, telekom_unit: 0, irigasi_unit: 3, transportasi_unit: 0, spbu_unit: 0, jalan_km: 4.5, jembatan_rb: 0, jembatan_rs: 1, jembatan_rr: 2, rugi_air: 40, rugi_listrik: 60, rugi_irigasi: 180, rugi_jalan: 900, rugi_jembatan: 450,
    rumah_rb: 5, rumah_rs: 12, rumah_rr: 38, rumah_terendam: 640, rugi_rumah: 4200,
    ibadah_rb: 0, ibadah_rs: 1, ibadah_rr: 2, ibadah_terendam: 3, faskes_rb: 0, faskes_rs: 0, faskes_rr: 1, faskes_terendam: 1, sekolah_rb: 0, sekolah_rs: 1, sekolah_rr: 2, sekolah_terendam: 4, kantor_rb: 0, kantor_rs: 0, kantor_rr: 0, kantor_terendam: 1, pasar_rb: 0, pasar_rs: 0, pasar_rr: 0, pasar_terendam: 0,
    rugi_ibadah: 300, rugi_faskes: 150, rugi_sekolah: 700, rugi_kantor: 90, aset_barang: "Dua perahu karet dan satu pompa air milik BPBD", ...o});
  const inti = (o = {}) => ({jenis: "longsor", nama_kejadian: "Longsor Lereng Contoh", tanggal: t(1), jam: "21:10", bujur: 114.101234, lintang: -2.301234, penyebab: "Hujan deras pada lereng tanpa penahan", kronologis: "Tebing longsor malam hari menimpa dua rumah.", deskripsi: "Longsor lereng setinggi 8 meter menutup jalan desa.",
    sumber: "Kepala desa dan relawan", kondisi_mutakhir: "Jalan desa belum bisa dilalui", status_darurat: "belum_ditetapkan", upaya: "Pencarian korban dan pembersihan material", meninggal: 0, hilang: 0, luka: 2, mengungsi: 150, terdampak: 600,
    rumah_rb: 2, rumah_rs: 0, rumah_rr: 3, rumah_terendam: 0, nihil_kebutuhan: true, nihil_sosek: true, nihil_prasarana: true, nihil_layanan: true, nihil_aset: true, ...o});
  const kurang = (jenis, nama, o = {}) => ({jenis, nama_kejadian: nama, tanggal: t(1), penyebab: "Belum diketahui", meninggal: 0, rumah_rb: 2, ...o});
  add("dampak", A, "dilaporkan", 5, kurang("banjir", "Banjir Kampung Contoh"), "Desa Contoh Satu", "Kec. Contoh");
  add("dampak", A, "dilaporkan", 30, inti(), "Desa Contoh Dua", "Kec. Contoh");
  add("dampak", A, "diverifikasi", 50, inti({nama_kejadian: "Longsor Dusun Contoh", status_darurat: "tanggap"}), "Desa Contoh Tiga", "Kec. Contoh");   // darurat tanpa pembaruan lebih dari sehari: belum_dimutakhirkan
  add("dampak", A, "diverifikasi", 20, inti({nama_kejadian: "Banjir Bandang Contoh", jenis: "banjir"}), "Desa Contoh Empat", "Kec. Contoh");
  add("dampak", A, "masuk_logbook", 100, penuh({tgl_tuntas: t(1)}), "Desa Contoh Satu", "Kec. Contoh");
  add("dampak", B, "dilaporkan", 8, kurang("kekeringan", "Kekeringan Desa Contoh"), "Desa Contoh Lima", "Kec. Contoh");
  add("dampak", B, "masuk_logbook", 90, penuh({jenis: "cuaca", nama_kejadian: "Angin Kencang Contoh", tgl_tuntas: t(1)}), "Desa Contoh Empat", "Kec. Contoh");
  const stokLain = [{gudang: "gdSelimut", jenis: "masuk", jumlah: 100, umurJam: 100, catatan: "Pasokan dari gudang provinsi"}, {gudang: "gdBeras", jenis: "masuk", jumlah: 500, umurJam: 120, catatan: "Pasokan dari gudang provinsi"},
    {gudang: "gdBeras", jenis: "koreksi", jumlah: -20, umurJam: 60, catatan: "Koreksi hitung ulang"}];
  return {R, stokLain};
}
async function dummyIsi(env, kini, oleh) {
  if ((await env.DB.prepare("SELECT count(*) n FROM meja_catatan WHERE dummy = 1").first()).n) return gagal(409, "data dummy Meja Kerja sudah ada; hapus dulu dengan 🧹");
  const st = [], idPetugas = Array.from({length: 3}, () => acak(8)), ID = {}, id = n => (ID[n] ??= acak(8));
  const PT = [[KAB_D[0], DAFTAR_PETUGAS, 0], [KAB_D[1], ["kaji_cepat", "logistik", "dampak"], 0], [KAB_D[2], ["renkon"], 1]];
  PT.forEach(([kab, mj, cabut], i) => st.push(env.DB.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat, dicabut, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
    .bind(idPetugas[i], `[DUMMY] Petugas Contoh ${i + 1}`, PROV_D, kab, JSON.stringify(mj), "0".repeat(48) + acak(8), kini - 30 * HARI, cabut ? kini - HARI : null, oleh)));
  const {R: rows, stokLain} = barisDummy(kini, id); let nj = 0;
  const kunciId = Object.fromEntries(rows.filter(r => r.kunci).map(r => [r.kunci, id(r.kunci)])), desaKaji = Object.fromEntries(rows.filter(r => r.kunci?.startsWith("kj")).map(r => [r.kunci, r.desa]));
  const tx_ = [];   // transaksi stok: {gudang, jenis, delta, waktu, logistik, catatan}
  for (const r of rows) {
    const M = MEJA[r.meja], rid = r.kunci ? id(r.kunci) : acak(8), dibuat = kini - r.umurJam * JAM;
    /* jalur status sampai status sekarang (ditolak keluar dari jalurTolak); jejak tiap langkah 1 jam sesudah sebelumnya, tidak melewati kini */
    const jalur = M.turunan ? [M.awal] : r.status === "ditolak" ? [...M.jalurTolak, "ditolak"] : M.status.slice(0, M.status.indexOf(r.status) + 1);
    const waktu = i => Math.min(kini, dibuat + i * JAM), pi = PT.findIndex(x => x[0] === r.kab), pid = pi < 0 ? null : idPetugas[pi];   // meja pusat: tanpa petugas
    if (r.meja === "rehab") r.desa = desaKaji[r.kaji];
    if (r.meja === "logistik" && r.data.gudang_asal) tx_.push({gudang: r.data.gudang_asal, jenis: "keluar", delta: -r.data.jumlah_kirim, waktu: waktu(jalur.indexOf("dikirim")), logistik: rid, catatan: `dikirim untuk ${r.data.posko}`});
    r.id = rid; r.stok = r.meja === "gudang" ? r.data.stok_awal : null;
    st.push(env.DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id, dummy, kaji_id, stok) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)")
      .bind(rid, r.meja, r.prov ?? PROV_D, r.kab, r.kec, r.desa, JSON.stringify(r.data), r.status, dibuat, waktu(jalur.length - 1), pid ? "petugas:" + pid : oleh, pid, r.kaji ? kunciId[r.kaji] : null, r.stok));
    if (r.pelapor) st.push(stmtPelapor(env, rid, r.pelapor, dibuat, 1));
    jalur.forEach((s, i) => { nj++; st.push(env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh, catatan, dummy) VALUES (?, ?, ?, ?, ?, ?, 1)").bind(rid, i ? jalur[i - 1] : null, s, waktu(i), oleh, "[Contoh]")); });
  }
  for (const s of stokLain) tx_.push({gudang: kunciId[s.gudang], jenis: s.jenis, delta: s.jenis === "keluar" ? -s.jumlah : s.jumlah, waktu: kini - s.umurJam * JAM, catatan: s.catatan});
  /* saldo berjalan per gudang, urut waktu; stok akhir di kolom stok = saldo terakhir (satu rantai dengan logistik dikirim) */
  const saldo = Object.fromEntries(rows.filter(r => r.meja === "gudang").map(r => [r.id, r.stok]));
  tx_.sort((a, b) => a.waktu - b.waktu);
  for (const x of tx_) saldo[x.gudang] += x.delta;
  for (const [gid, v] of Object.entries(saldo)) st.push(env.DB.prepare("UPDATE meja_catatan SET stok = ? WHERE id = ?").bind(v, gid));
  const jalan = Object.fromEntries(rows.filter(r => r.meja === "gudang").map(r => [r.id, r.stok]));
  for (const x of tx_) { jalan[x.gudang] += x.delta; st.push(env.DB.prepare("INSERT INTO meja_stok (gudang_id, jenis, delta, saldo, logistik_id, waktu, oleh, catatan, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(x.gudang, x.jenis, x.delta, jalan[x.gudang], x.logistik ?? null, x.waktu, oleh, "[Contoh] " + x.catatan)); }
  /* bahan rapor di tabel Posko (dummy=1, diberi nama kabupaten contoh): regu, laporan regu 7 hari, panggilan dengan waktu respons nyata */
  const regu = KAB_D.slice(0, 2).flatMap((kab, i) => Array.from({length: i ? 2 : 3}, (_, j) => ({id: acak(8), kab, nama: `[DUMMY MEJA] Regu ${i ? "B" : "A"}${j + 1}`})));
  for (const g of regu) st.push(env.DB.prepare("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat, oleh, dummy) VALUES (?, ?, 'BPBD', ?, ?, ?, ?, ?, 1)").bind(g.id, g.nama, PROV_D, g.kab, "0".repeat(48) + acak(8), kini - 30 * HARI, oleh));
  const lap = [[0, 4], [1, 3], [3, 1]];   // [indeks regu, jumlah laporan]: regu A1, A2 aktif, A3 diam; regu B1 aktif, B2 diam
  let nl = 0;
  for (const [ri, n] of lap) for (let i = 0; i < n; i++) {
    const g = regu[ri], w = kini - (i * 20 + ri * 3 + 2) * JAM;
    st.push(env.DB.prepare("INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, akurasi, status, luas_ha, padam_ha, personel, prov, kab, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 20, 'bara', 10, 4, 6, ?, ?, 1)")
      .bind(acak(8), g.id, `mejadum${ri}-${i}-${acak(3)}`, wib(w), w, w, -2.2 - ri * 0.01, 113.9 + i * 0.01, PROV_D, g.kab)); nl++;
  }
  /* panggilan: A responsnya 10, 20, 40, 60 menit (median 30); B 90, 100, 110 menit + satu belum direspons */
  const pg = [[0, [10, 20, 40, 60, null]], [1, [90, 100, 110, null]]];
  let np = 0;
  for (const [ki, durasi] of pg) durasi.forEach((m, i) => {
    const dp = kini - (3 + i * 5) * JAM;
    st.push(env.DB.prepare(`INSERT INTO panggilan (id, tanggal, perusahaan_id, nama_pt, prov, kab, titik_n, terdeteksi, status, dipanggil_pada, batas, direspons_pada, saluran, oleh, dibuat, dummy)
      VALUES (?, ?, ?, ?, ?, ?, 2, ?, ?, ?, ?, ?, 'email', ?, ?, 1)`).bind(acak(8), wib(dp), `mejadum-${ki}-${i}`, `[DUMMY] PT Contoh Meja ${ki}${i}`, PROV_D, KAB_D[ki], dp - JAM, m == null ? "dipanggil" : "direspons",
      dp, dp + 2 * JAM, m == null ? null : dp + m * MENIT, oleh, kini)); np++;
  });
  await env.DB.batch(st);
  await segarkanRingkas(env, kini);
  return json({ok: true, petugas: PT.length, catatan: rows.length, jejak: nj, transaksi_stok: tx_.length, regu: regu.length, lapangan: nl, panggilan: np}, 201);
}
async function dummyHapus(env) {
  /* tabel Posko: hanya baris dummy di kabupaten contoh Meja Kerja (dummy Ruang Posko punya jalur hapusnya sendiri) */
  const kab = KAB_D.map(() => "?").join(","), di = `dummy = 1 AND prov = '${PROV_D}' AND kab IN (${kab})`;
  const n = async (t, w = "dummy = 1", ...a) => (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE ${w}`).bind(...a).first()).n;
  const hasil = {pelapor: await n("meja_pelapor"), petugas: await n("meja_petugas"), catatan: await n("meja_catatan"), jejak: await n("meja_jejak"), transaksi_stok: await n("meja_stok"),
    panggilan: await n("panggilan", di, ...KAB_D), lapangan: await n("lapangan", di, ...KAB_D), regu: await n("regu", di, ...KAB_D)};
  await env.DB.batch([
    stmtHapusPelaporDummy(env), env.DB.prepare("DELETE FROM meja_stok WHERE dummy = 1"), env.DB.prepare("DELETE FROM meja_ringkas WHERE dummy = 1"), env.DB.prepare("DELETE FROM meja_ringkas_bencana WHERE dummy = 1"), 
    env.DB.prepare("DELETE FROM meja_jejak WHERE dummy = 1"), env.DB.prepare("DELETE FROM meja_catatan WHERE dummy = 1"), env.DB.prepare("DELETE FROM meja_petugas WHERE dummy = 1"),
    env.DB.prepare(`DELETE FROM lapangan WHERE ${di}`).bind(...KAB_D), env.DB.prepare(`DELETE FROM panggilan WHERE ${di}`).bind(...KAB_D), env.DB.prepare(`DELETE FROM regu WHERE ${di}`).bind(...KAB_D),
  ]);
  await tulisKl(env, [stmtHapusKelengkapan(env, false)]);
  return json({ok: true, ...hasil});
}
async function dummy(env, req, kini) {
  const oleh = await superOK(env, req); if (!oleh) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") {
    try { return await dummyIsi(env, kini, "admin:" + oleh); }
    catch (e) { if (/CHECK constraint failed|meja petugas tidak sah/i.test(String(e?.message || e)) && !await skemaMejaAda(env, "dampak")) return MEJA_BELUM(); throw e; }   // dummy meja baru sebelum migrasi
  }
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* ---------------------------------------------------------------- rute */
const A = {
  "GET /meja": (env, req, url) => halamanBnpbPublik(env, url, "meja", {pribadi: true}),
  "GET /admin/meja": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("meja")),
  "GET /api/meja/spek": (env, req, url, kini, ctx) => cacheTepi(new Request(new URL("/api/meja/spek", url), {method: "GET"}), ctx, 300, async () => json(spekPublik())),
  "GET /api/meja/saya": async (env, req) => { const p = await pelaku(env, req); return p instanceof Response ? p : json(p.petugas ? {peran: "petugas", petugas: {nama: p.petugas.nama, prov: p.petugas.prov, kab: p.petugas.kab, meja: p.petugas.meja}} : {peran: p.ulp ? "ulp" : p.pusdalops ? "pusdalops" : "admin"}); },
  "GET /api/meja/pelapor/:id": (env, req, url, kini, ctx, id) => bukaPelapor(env, req, id, kini),
  "GET /api/meja/catatan": daftar,
  "POST /api/meja/catatan": (env, req, url, kini) => buat(env, req, kini),
  "GET /api/meja/catatan/:id": (env, req, url, kini, ctx, id) => rincian(env, req, id, kini),
  "POST /api/meja/catatan/:id": (env, req, url, kini, ctx, id) => ubah(env, req, id, kini),
  "GET /api/meja/rekap": rekap,
  "GET /api/meja/ringkas": ringkas,
  "GET /api/meja/ekspor": ekspor,
  "GET /api/meja/kelengkapan": kelengkapanKab,
  "POST /api/meja/impor": (env, req, url, kini) => impor(env, req, kini),
  "GET /api/meja/rapor": raporAdmin,
  "GET /api/meja/rapor/publik": raporPublik,
  "GET /api/meja/petugas": (env, req) => daftarPetugas(env, req),
  "POST /api/meja/petugas": (env, req, url, kini) => buatPetugas(env, req, url, kini),
  "POST /api/meja/petugas/:id": (env, req, url, kini, ctx, id) => cabutPetugas(env, req, id, kini),
  "POST /api/meja/dummy": (env, req, url, kini) => dummy(env, req, kini),
};
/* gerbang uji membaca kunci tabel ini; tiap rute dibungkus aman() (tabel belum ada = 503) */
export const RUTE_MEJA = Object.fromEntries(Object.entries(A).map(([k, f]) => [k, aman(f)]));
