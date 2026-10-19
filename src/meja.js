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
import {MEJA, DAFTAR_MEJA, BENCANA, RAPOR, spekPublik, validasi, statusEfektif, tandaBahaya} from "./meja_spek.js";

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM, LAJU_TULIS = [[JAM, 120]], TTL_RINGKAS = 2 * JAM, MAKS_EKSPOR = 20000, RE_ID = /^[0-9a-f]{16}$/;

/* migrasi 0026 (atau 0022 untuk laju) belum jalan di produksi = 503, bukan 500 */
const aman = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "Meja Kerja belum diaktifkan (migrasi 0026 belum diterapkan)"); throw e; }
};
const tolak = () => gagal(403, "akses ditolak: butuh kode petugas atau token admin");

/* ---------------------------------------------------------------- pelaku */
const adminSaja = async (env, req) => { const m = await modOK(env, req); return m ? {admin: true, oleh: "admin:" + m} : tolak(); };
async function pelaku(env, req) {
  if (!req.headers.get("x-kode")) return adminSaja(env, req);
  const p = await pemegangKode(env, req, "meja", sha => env.DB.prepare("SELECT id, nama, prov, kab, meja FROM meja_petugas WHERE kode_sha = ? AND dicabut IS NULL").bind(sha).first());
  return p instanceof Response ? p : {petugas: {...p, meja: JSON.parse(p.meja)}, oleh: "petugas:" + p.id};
}
const semuaKunci = (o, boleh) => Object.keys(o).find(x => !boleh.includes(x));

/* ---------------------------------------------------------------- baris untuk klien */
/* gudang: saldo tinggal di kolom stok, digabung ke data supaya status efektif dan tanda memakai satu jalur */
const recOf = r => ({meja: r.meja, status: r.status, data: r.stok == null ? JSON.parse(r.data) : {...JSON.parse(r.data), stok: r.stok}, dibuat: r.dibuat, diubah: r.diubah});
function baris(r, kini, admin, nama = {}) {
  const M = MEJA[r.meja], rec = recOf(r), data = rec.data;
  return {id: r.id, meja: r.meja, prov: r.prov, kab: r.kab, kec: r.kec, desa: r.desa, status: r.status, status_efektif: statusEfektif(r.meja, rec, kini),
    tanda: tandaBahaya(r.meja, rec, kini), data, dibuat: r.dibuat, diubah: r.diubah, dummy: r.dummy, ...(admin ? {oleh: r.oleh} : {}),
    ...(r.kaji_id ? {kaji_id: r.kaji_id} : {}), ...(data.gudang_asal && nama[data.gudang_asal] ? {gudang_asal_nama: nama[data.gudang_asal]} : {}),
    aksi: Object.entries(M.transisi[r.status] || {}).map(([ke, peran]) => ({ke, peran, boleh: admin || peran === "petugas"})),
    ...(M.stokPeran ? {aksi_stok: Object.entries(M.stokPeran).map(([jenis, peran]) => ({jenis, peran, boleh: admin || peran === "petugas"}))} : {}),
    bisa_ubah: !!M.turunan || r.status === M.awal};
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
  }
  const mentah = (await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE ${w.join(" AND ")} ORDER BY diubah DESC LIMIT 2000`).bind(...a).all()).results, nama = await namaGudang(env, mentah);
  const semua = mentah.map(r => baris(r, kini, !p.petugas, nama));
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
const UNIK = {rehab: "kaji cepat ini sudah punya catatan rehab-rekon", gudang: "gudang dan barang itu sudah tercatat di kabupaten ini"};
async function buat(env, req, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const x = semuaKunci(b.o, ["meja", "prov", "kab", "kec", "desa", "data", "kaji_id", "klien_id", "waktu_klien"]); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  const lr = luring(b.o, kini); if (lr.galat) return gagal(400, lr.galat);
  if (lr.klien) { const u = await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE oleh IS ? AND klien_id = ?`).bind(p.oleh, lr.klien).first(); if (u) return json({catatan: baris(u, kini, !p.petugas), ulang: true}); }
  if (!Object.hasOwn(MEJA, b.o.meja || "")) return gagal(400, `meja harus salah satu dari ${DAFTAR_MEJA.join(", ")}`);
  const M = MEJA[b.o.meja], kabB = b.o.kab == null ? null : tx(b.o.kab, 60);
  let prov, kab;
  if (p.petugas) {
    if (!p.petugas.meja.includes(M.id)) return gagal(403, "meja ini tidak diizinkan untuk kodemu");
    if ((b.o.prov != null && b.o.prov !== p.petugas.prov) || (kabB != null && kabB !== p.petugas.kab)) return gagal(403, "kamu hanya boleh mengisi untuk kabupatenmu sendiri");
    ({prov, kab} = p.petugas);
  } else {
    if (typeof b.o.prov !== "string" || !RE_PROV.test(b.o.prov)) return gagal(400, "prov harus kode 2 digit");
    if (!kabB || kabB.length < 2) return gagal(400, "kabupaten 2-60 huruf");
    prov = b.o.prov; kab = kabB;
  }
  let wl = wilayahTeks(b.o, M); if (wl.galat) return gagal(400, wl.galat);
  const v = validasi(M.id, b.o.data, null, kini); if (v.galat) return gagal(400, v.galat);
  /* rehab: wajib tertaut ke kaji cepat masuk_jitupasna di kabupaten yang sama; wilayah (kec, desa) disalin dari kaji cepat itu */
  let kajiId = null;
  if (M.tautKaji) {
    if (typeof b.o.kaji_id !== "string" || !RE_ID.test(b.o.kaji_id)) return gagal(400, "kaji_id wajib: id catatan kaji cepat (16 hex)");
    const kj = await env.DB.prepare("SELECT meja, status, prov, kab, kec, desa, dummy FROM meja_catatan WHERE id = ?").bind(b.o.kaji_id).first();
    if (!kj || kj.meja !== "kaji_cepat" || kj.status !== "masuk_jitupasna" || kj.prov !== prov || kj.kab !== kab || kj.dummy) return gagal(400, "kaji_id harus catatan kaji cepat berstatus masuk_jitupasna di kabupaten ini");
    kajiId = b.o.kaji_id; wl = {kec: kj.kec, desa: kj.desa};
  } else if (b.o.kaji_id != null) return gagal(400, "kaji_id hanya untuk meja Rehab-rekon");
  if (p.petugas) { const l = await laju(env, p.petugas.id, "meja.tulis", LAJU_TULIS, kini); if (l) return l; }
  const id = acak(8);
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id, kaji_id, stok, klien_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, M.id, prov, kab, wl.kec, wl.desa, JSON.stringify(v.data), M.awal, lr.waktu, lr.waktu, p.oleh, p.petugas?.id ?? null, kajiId, M.id === "gudang" ? v.data.stok_awal : null, lr.klien),
      env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh, diterima) VALUES (?, NULL, ?, ?, ?, ?)").bind(id, M.awal, lr.waktu, p.oleh, kini),
    ]);
  } catch (e) {
    if (/UNIQUE/i.test(String(e?.message || e))) {   // dua kiriman serentak dengan klien_id sama: yang kedua mengembalikan baris yang sudah ada
      if (lr.klien) { const u = await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE oleh IS ? AND klien_id = ?`).bind(p.oleh, lr.klien).first(); if (u) return json({catatan: baris(u, kini, !p.petugas), ulang: true}); }
      if (UNIK[M.id]) return gagal(409, UNIK[M.id]);
    }
    throw e;
  }
  await SELESAI_SEGARKAN(env, M.id, prov, kab, 0, kini);
  return json({catatan: baris(await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first(), kini, !p.petugas)}, 201);
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
async function muatBaris(env, p, id) {
  const r = await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first();
  return r && (!p.petugas || (r.prov === p.petugas.prov && r.kab === p.petugas.kab && p.petugas.meja.includes(r.meja) && !r.dummy)) ? r : null;
}
async function rincian(env, req, id, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const r = await muatBaris(env, p, id); if (!r) return gagal(404, "catatan tidak ada");
  const jejak = (await env.DB.prepare("SELECT dari, ke, waktu, oleh, catatan FROM meja_jejak WHERE catatan_id = ? ORDER BY id").bind(id).all()).results;
  const transaksi = r.meja === "gudang" ? (await env.DB.prepare("SELECT jenis, delta, saldo, logistik_id, waktu, oleh, catatan FROM meja_stok WHERE gudang_id = ? ORDER BY id DESC LIMIT 100").bind(id).all()).results : undefined;
  return json({catatan: baris(r, kini, !p.petugas, await namaGudang(env, [r])), jejak: p.petugas ? jejak.map(({oleh, ...j}) => j) : jejak,
    ...(transaksi ? {transaksi: p.petugas ? transaksi.map(({oleh, ...t}) => t) : transaksi} : {})});
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
  return json({catatan: baris(await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(r.id).first(), kini, !p.petugas)});
}
async function ubah(env, req, id, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const x = semuaKunci(b.o, ["aksi", "ke", "data", "kec", "desa", "catatan", "jenis", "jumlah", "klien_id", "waktu_klien"]); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  const lr = luring(b.o, kini); if (lr.galat) return gagal(400, lr.galat);
  if (!["status", "ubah", "stok"].includes(b.o.aksi)) return gagal(400, "aksi harus status, ubah, atau stok");
  const r = await muatBaris(env, p, id); if (!r) return gagal(404, "catatan tidak ada");
  const ulang = async () => json({catatan: baris(await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first(), kini, !p.petugas, await namaGudang(env, [r])), ulang: true});
  if (lr.klien && await env.DB.prepare("SELECT 1 FROM meja_jejak WHERE catatan_id = ? AND klien_id = ?").bind(id, lr.klien).first()) return ulang();   // kiriman ulang antrean luring: sudah tercatat
  const M = MEJA[r.meja], lama = JSON.parse(r.data), cat = b.o.catatan == null ? null : tx(b.o.catatan, 200);
  if (cat === undefined) return gagal(400, "catatan maksimal 200 huruf");
  if (b.o.aksi === "stok") return ubahStok(env, p, r, b.o, cat, kini);
  let ke = r.status, data, kec = r.kec, desa = r.desa, gd = null, dAwal = 0, ubahAngka = "";
  if (b.o.aksi === "status") {
    ke = b.o.ke;
    const peran = typeof ke === "string" && Object.hasOwn(M.transisi[r.status] || {}, ke) ? M.transisi[r.status][ke] : null;
    if (!peran) return gagal(409, `transisi ${r.status} ke ${String(ke).slice(0, 30)} tidak sah untuk meja ${M.nama}`);
    if (peran === "admin" && p.petugas) return gagal(403, `perpindahan ke ${ke} hanya boleh oleh admin`);
    const v = validasi(M.id, b.o.data ?? {}, ke, kini, lama); if (v.galat) return gagal(400, v.galat);
    data = {...lama, ...v.data};
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
    if (!M.turunan && r.status !== M.awal) return gagal(409, `isi hanya bisa diubah selama status ${M.awal}; pakai perpindahan status`);
    const v = validasi(M.id, b.o.data ?? {}, null, kini); if (v.galat) return gagal(400, v.galat);
    if (r.meja === "gudang" && ["gudang", "barang", "satuan"].some(k => v.data[k] !== lama[k])) return gagal(409, "nama gudang, barang, dan satuan tidak bisa diubah; buat catatan baru");
    const wl = wilayahTeks({kec: b.o.kec ?? r.kec, desa: b.o.desa ?? r.desa}, M); if (wl.galat) return gagal(400, wl.galat);
    data = v.data; ({kec, desa} = wl);
    /* gudang: stok_awal menggerakkan saldo, jadi petugas tidak boleh; admin boleh dan selisih terhadap stok_awal lama menggeser saldo dan dicatat sebagai baris meja_stok koreksi (saldo bergeser relatif, bukan dihitung ulang) */
    if (r.meja === "gudang") {
      dAwal = data.stok_awal - lama.stok_awal;
      if (dAwal && p.petugas) return gagal(403, "stok awal gudang hanya boleh diubah admin; petugas memakai aksi stok (masuk/keluar)");
      ubahAngka = ["stok_awal", "ambang_min"].filter(k => data[k] !== lama[k]).map(k => `${k} ${lama[k]} ke ${data[k]}`).join("; ");
    }
  }
  if (p.petugas) { const l = await laju(env, p.petugas.id, "meja.tulis", LAJU_TULIS, kini); if (l) return l; }
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
  catch (e) { if (lr.klien && /UNIQUE/i.test(String(e?.message || e))) return ulang(); if (/CHECK/i.test(String(e?.message || e))) return gagal(409, gd ? "stok gudang tidak cukup (berubah bersamaan); muat ulang" : "stok akhir tidak boleh minus"); throw e; }
  if (!u.meta.changes) return gagal(409, "status berubah di waktu yang sama; muat ulang lalu coba lagi");
  await SELESAI_SEGARKAN(env, r.meja, r.prov, r.kab, r.dummy, kini);
  if (gd) await SELESAI_SEGARKAN(env, "gudang", gd.prov, gd.kab, gd.dummy, kini);
  return json({catatan: baris(await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first(), kini, !p.petugas, await namaGudang(env, [{meja: r.meja, data: JSON.stringify(data)}]))});
}

/* ---------------------------------------------------------------- agregat (tabel meja_ringkas; rekap admin, ringkas publik, rapor) */
const KOL_R = "SELECT meja, prov, kab, status, data, dibuat, diubah, stok, dummy FROM meja_catatan";
function kumpul(rows, kini, acc = {r: new Map(), b: new Map()}) {
  for (const r of rows) {
    const rec = {...recOf(r)}, M = MEJA[r.meja], se = statusEfektif(r.meja, rec, kini), kunci = [r.meja, r.prov, r.kab, se, r.dummy].join("\t");
    let a = acc.r.get(kunci); if (!a) acc.r.set(kunci, a = {meja: r.meja, prov: r.prov, kab: r.kab, status: se, dummy: r.dummy, n: 0, bahaya: 0, jumlah: Object.fromEntries(M.rekap.map(c => [c, 0])), terbaru: 0});
    a.n++; if (tandaBahaya(r.meja, rec, kini).length) a.bahaya++; a.terbaru = Math.max(a.terbaru, r.diubah);
    for (const c of M.rekap) a.jumlah[c] += rec.data[c] || 0;
    const bc = r.meja === "renkon" ? rec.data.bencana : r.meja === "kaji_cepat" ? rec.data.kejadian : null;
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
/* bangun ulang SATU kelompok (meja, prov, kab, dummy) dari catatan yang sudah tersimpan */
export async function segarkanGrup(env, meja, prov, kab, dummy, kini = Date.now()) {
  const rows = (await env.DB.prepare(`${KOL_R} WHERE meja = ? AND prov = ? AND kab = ? AND dummy = ?`).bind(meja, prov, kab, dummy).all()).results.map(r => ({...r, dummy}));
  await env.DB.batch([env.DB.prepare("DELETE FROM meja_ringkas WHERE meja = ? AND prov = ? AND kab = ? AND dummy = ?").bind(meja, prov, kab, dummy),
    env.DB.prepare("DELETE FROM meja_ringkas_bencana WHERE meja = ? AND prov = ? AND kab = ? AND dummy = ?").bind(meja, prov, kab, dummy), ...sisip(kumpul(rows, kini), env)]);
}
/* bangun ulang SEMUA, membaca catatan bertahap (kunci id, 1000 per halaman), tanpa batas baris. Dipanggil cron tiap jam dan saat tabel basi.
   ponytail: tulis yang masuk di tengah pemindaian bisa tertimpa sampai tulis/segarkan berikutnya; paling lama satu jam. */
export async function segarkanRingkas(env, kini = Date.now()) {
  const acc = {r: new Map(), b: new Map()}; let akhir = "";
  for (;;) {
    const rows = (await env.DB.prepare(`SELECT id, meja, prov, kab, status, data, dibuat, diubah, stok, dummy FROM meja_catatan WHERE id > ? ORDER BY id LIMIT 1000`).bind(akhir).all()).results;
    kumpul(rows, kini, acc); if (rows.length < 1000) break; akhir = rows[rows.length - 1].id;
  }
  await env.DB.batch([env.DB.prepare("DELETE FROM meja_ringkas"), env.DB.prepare("DELETE FROM meja_ringkas_bencana"), ...sisip(acc, env),
    env.DB.prepare("INSERT INTO meja_ringkas_meta (kunci, nilai) VALUES ('dihitung', ?) ON CONFLICT (kunci) DO UPDATE SET nilai = excluded.nilai").bind(kini)]);
}
async function bacaRingkas(env, kini, ikut) {
  let m = await env.DB.prepare("SELECT nilai FROM meja_ringkas_meta WHERE kunci = 'dihitung'").first();
  if (!m || kini - m.nilai > TTL_RINGKAS) { await segarkanRingkas(env, kini); m = {nilai: kini}; }
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
  const kabAda = new Set([...rows.map(r => r.prov + "|" + r.kab), ...petugasKab.map(r => r.prov + "|" + r.kab)]);
  /* kabupaten tanpa renkon berlaku (belum kedaluwarsa) per bencana; bencana yang dihitung = yang pernah muncul di renkon atau kaji cepat */
  const bc = (await env.DB.prepare(`SELECT meja, bencana, prov, kab, sum(n) n, sum(berlaku) berlaku FROM meja_ringkas_bencana${ikut ? "" : " WHERE dummy = 0"} GROUP BY meja, bencana, prov, kab`).all()).results;
  const punya = new Set(bc.filter(r => r.meja === "renkon" && r.berlaku > 0).map(r => `${r.bencana}|${r.prov}|${r.kab}`));
  const bencana = BENCANA.filter(b => bc.some(r => r.bencana === b));
  return json({kini, dihitung, per_kab: agregat(rows, "kab"), tanpa_renkon: Object.fromEntries(bencana.map(b => [b, [...kabAda].filter(k => !punya.has(`${b}|${k}`)).sort()]))});
}
/* publik: angka per provinsi. Dummy hanya untuk admin ?dummy=1 (tanpa cache). */
async function ringkas(env, req, url, kini, ctx) {
  const ambil = async ikut => { const {dihitung, rows} = await bacaRingkas(env, kini, ikut); return json({dibuat: kini, dihitung, meja: agregat(rows, "prov")}); };
  if (url.searchParams.get("dummy") === "1" && await modOK(env, req)) return ambil(true);
  return cacheTepi(new Request(new URL("/api/meja/ringkas", url), {method: "GET"}), ctx, 120, () => ambil(false));
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
  for (const r of rr.rows) { const m = (kab(r.prov, r.kab).meja[r.meja] ??= {n: 0, bahaya: 0}); m.n += r.n; m.bahaya += r.bahaya; }
  const hasil = [...K.values()].map(k => {
    const med = k.medianMs.length ? k.medianMs.reduce((x, y) => x + y, 0) / k.medianMs.length / MENIT : null, respons = skorRespons(med, k.dipanggil, k.direspons);
    const keaktifan = k.regu ? bulat(100 * Math.min(k.aktif, k.regu) / k.regu) : null;
    const mj = Object.fromEntries(DAFTAR_MEJA.filter(m => k.meja[m]).map(m => [m, {...k.meja[m], skor: bulat(100 * (k.meja[m].n - k.meja[m].bahaya) / k.meja[m].n)}]));
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
    lapor_warga: "belum dihitung: tabel laporan tidak punya kolom prov/kab"};
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
  if (meja !== "kaji_cepat") return gagal(400, "ekspor DIBI baru tersedia untuk meja kaji_cepat");
  for (const [n, v] of [["dari", dari], ["sampai", sampai]]) if (v != null && !tglSah(v)) return gagal(400, `${n} harus YYYY-MM-DD`);
  if (dari && sampai && dari > sampai) return gagal(400, "dari tidak boleh sesudah sampai");
  const w = ["meja = 'kaji_cepat'"], a = [];
  if (q.get("dummy") !== "1") w.push("dummy = 0");
  if (dari) { w.push("json_extract(data, '$.tanggal') >= ?"); a.push(dari); }
  if (sampai) { w.push("json_extract(data, '$.tanggal') <= ?"); a.push(sampai); }
  const rows = (await env.DB.prepare(`SELECT id, prov, kab, kec, desa, data, status, oleh FROM meja_catatan WHERE ${w.join(" AND ")} ORDER BY json_extract(data, '$.tanggal'), id LIMIT ${MAKS_EKSPOR + 1}`).bind(...a).all()).results;
  const dipotong = rows.length > MAKS_EKSPOR; if (dipotong) rows.pop();
  const isi = rows.map(barisDibi), nama = `dibi-${meja}-${wib(kini)}`;
  if (fmt === "json") return json({kolom: DIBI_KOLOM, baris: isi.map(r => Object.fromEntries(DIBI_KOLOM.map((k, i) => [k, r[i]]))), dibuat: kini, dipotong}, 200, {"content-disposition": `attachment; filename="${nama}.json"`});
  return new Response("\ufeff" + [DIBI_KOLOM, ...isi].map(r => r.map(selCsv).join(",")).join("\r\n"), {headers: {"content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${nama}.csv"`,
    "cache-control": "no-store", "x-content-type-options": "nosniff", ...(dipotong ? {"x-ekspor-dipotong": "1"} : {})}});
}

/* ---------------------------------------------------------------- petugas berkode */
async function daftarPetugas(env, req) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  return json({meja: DAFTAR_MEJA, petugas: (await env.DB.prepare(`SELECT t.id, t.nama, t.prov, t.kab, t.meja, t.dibuat, t.dicabut, t.dummy, (SELECT count(*) FROM meja_catatan c WHERE c.petugas_id = t.id) catatan
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
  if (!Array.isArray(mj) || !mj.length || !mj.every(m => typeof m === "string" && DAFTAR_MEJA.includes(m)) || new Set(mj).size !== mj.length) return gagal(400, `meja: satu atau lebih dari ${DAFTAR_MEJA.join(", ")}, tanpa duplikat`);
  const id = acak(8), {kode, kode_sha} = await kodeBaru();
  await env.DB.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, nama, b.o.prov, kab, JSON.stringify(mj), kode_sha, kini, p.oleh).run();
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
  add("dsp", A, "cair", 960, ds({nilai_disetujui: 400000000, tgl_setuju: t(50), nilai_cair: 400000000, tgl_cair: t(40)}));   // 40 hari belum SPJ: tanda bahaya
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
  const rk = (bencana, sah, sampai, uji) => ({bencana, judul: "Renkon " + bencana + " Contoh", tgl_sah: t(sah), berlaku_sampai: wib(kini + sampai * HARI), ...(uji == null ? {} : {uji_terakhir: t(uji)}), tautan: "https://contoh.invalid/renkon"});
  add("renkon", A, "tercatat", 5000, rk("banjir", 300, 400, 30));   // berlaku
  add("renkon", A, "tercatat", 5000, rk("karhutla", 300, 40, 30));   // segera_habis
  add("renkon", B, "tercatat", 5000, rk("banjir", 800, -10, 400));   // kedaluwarsa
  add("renkon", C, "tercatat", 5000, rk("gempa", 100, 500, null));   // belum_diuji
  const dt = (kelas, keg) => ({kelas, tahun_dibentuk: 2018, indikator: ["tim_siaga", "peta_risiko", "jalur_evakuasi"], ...(keg == null ? {} : {kegiatan_terakhir: t(keg)})});
  add("destana", A, "tercatat", 5000, dt("utama", 30), "Desa Tangguh Satu", "Kec. Contoh");   // aktif
  add("destana", B, "tercatat", 5000, dt("madya", 400), "Desa Tangguh Dua", "Kec. Contoh");   // pasif
  add("destana", C, "tercatat", 5000, dt("pratama", null), "Desa Tangguh Tiga", "Kec. Contoh");   // pasif
  /* transaksi stok di luar logistik: pasokan masuk dan koreksi hitung ulang (umur dalam jam) */
  const stokLain = [{gudang: "gdSelimut", jenis: "masuk", jumlah: 100, umurJam: 100, catatan: "Pasokan dari gudang provinsi"}, {gudang: "gdBeras", jenis: "masuk", jumlah: 500, umurJam: 120, catatan: "Pasokan dari gudang provinsi"},
    {gudang: "gdBeras", jenis: "koreksi", jumlah: -20, umurJam: 60, catatan: "Koreksi hitung ulang"}];
  return {R, stokLain};
}
async function dummyIsi(env, kini, oleh) {
  if ((await env.DB.prepare("SELECT count(*) n FROM meja_catatan WHERE dummy = 1").first()).n) return gagal(409, "data dummy Meja Kerja sudah ada; hapus dulu dengan 🧹");
  const st = [], idPetugas = Array.from({length: 3}, () => acak(8)), ID = {}, id = n => (ID[n] ??= acak(8));
  const PT = [[KAB_D[0], DAFTAR_MEJA, 0], [KAB_D[1], ["kaji_cepat", "logistik"], 0], [KAB_D[2], ["renkon"], 1]];
  PT.forEach(([kab, mj, cabut], i) => st.push(env.DB.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat, dicabut, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
    .bind(idPetugas[i], `[DUMMY] Petugas Contoh ${i + 1}`, PROV_D, kab, JSON.stringify(mj), "0".repeat(48) + acak(8), kini - 30 * HARI, cabut ? kini - HARI : null, oleh)));
  const {R: rows, stokLain} = barisDummy(kini, id); let nj = 0;
  const kunciId = Object.fromEntries(rows.filter(r => r.kunci).map(r => [r.kunci, id(r.kunci)])), desaKaji = Object.fromEntries(rows.filter(r => r.kunci?.startsWith("kj")).map(r => [r.kunci, r.desa]));
  const tx_ = [];   // transaksi stok: {gudang, jenis, delta, waktu, logistik, catatan}
  for (const r of rows) {
    const M = MEJA[r.meja], rid = r.kunci ? id(r.kunci) : acak(8), dibuat = kini - r.umurJam * JAM;
    /* jalur status sampai status sekarang (ditolak keluar dari jalurTolak); jejak tiap langkah 1 jam sesudah sebelumnya, tidak melewati kini */
    const jalur = M.turunan ? [M.awal] : r.status === "ditolak" ? [...M.jalurTolak, "ditolak"] : M.status.slice(0, M.status.indexOf(r.status) + 1);
    const waktu = i => Math.min(kini, dibuat + i * JAM), pi = PT.findIndex(x => x[0] === r.kab);
    if (r.meja === "rehab") r.desa = desaKaji[r.kaji];
    if (r.meja === "logistik" && r.data.gudang_asal) tx_.push({gudang: r.data.gudang_asal, jenis: "keluar", delta: -r.data.jumlah_kirim, waktu: waktu(jalur.indexOf("dikirim")), logistik: rid, catatan: `dikirim untuk ${r.data.posko}`});
    r.id = rid; r.stok = r.meja === "gudang" ? r.data.stok_awal : null;
    st.push(env.DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id, dummy, kaji_id, stok) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)")
      .bind(rid, r.meja, PROV_D, r.kab, r.kec, r.desa, JSON.stringify(r.data), r.status, dibuat, waktu(jalur.length - 1), "petugas:" + idPetugas[pi], idPetugas[pi], r.kaji ? kunciId[r.kaji] : null, r.stok));
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
  const hasil = {petugas: await n("meja_petugas"), catatan: await n("meja_catatan"), jejak: await n("meja_jejak"), transaksi_stok: await n("meja_stok"),
    panggilan: await n("panggilan", di, ...KAB_D), lapangan: await n("lapangan", di, ...KAB_D), regu: await n("regu", di, ...KAB_D)};
  await env.DB.batch([
    env.DB.prepare("DELETE FROM meja_stok WHERE dummy = 1"), env.DB.prepare("DELETE FROM meja_ringkas WHERE dummy = 1"), env.DB.prepare("DELETE FROM meja_ringkas_bencana WHERE dummy = 1"),
    env.DB.prepare("DELETE FROM meja_jejak WHERE dummy = 1"), env.DB.prepare("DELETE FROM meja_catatan WHERE dummy = 1"), env.DB.prepare("DELETE FROM meja_petugas WHERE dummy = 1"),
    env.DB.prepare(`DELETE FROM lapangan WHERE ${di}`).bind(...KAB_D), env.DB.prepare(`DELETE FROM panggilan WHERE ${di}`).bind(...KAB_D), env.DB.prepare(`DELETE FROM regu WHERE ${di}`).bind(...KAB_D),
  ]);
  return json({ok: true, ...hasil});
}
async function dummy(env, req, kini) {
  const oleh = await superOK(env, req); if (!oleh) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, kini, "admin:" + oleh);
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* ---------------------------------------------------------------- rute */
const A = {
  "GET /meja": (env, req, url) => halamanBnpbPublik(env, url, "meja", {pribadi: true}),
  "GET /admin/meja": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("meja")),
  "GET /api/meja/spek": (env, req, url, kini, ctx) => cacheTepi(new Request(new URL("/api/meja/spek", url), {method: "GET"}), ctx, 300, async () => json(spekPublik())),
  "GET /api/meja/saya": async (env, req) => { const p = await pelaku(env, req); return p instanceof Response ? p : json(p.petugas ? {peran: "petugas", petugas: {nama: p.petugas.nama, prov: p.petugas.prov, kab: p.petugas.kab, meja: p.petugas.meja}} : {peran: "admin"}); },
  "GET /api/meja/catatan": daftar,
  "POST /api/meja/catatan": (env, req, url, kini) => buat(env, req, kini),
  "GET /api/meja/catatan/:id": (env, req, url, kini, ctx, id) => rincian(env, req, id, kini),
  "POST /api/meja/catatan/:id": (env, req, url, kini, ctx, id) => ubah(env, req, id, kini),
  "GET /api/meja/rekap": rekap,
  "GET /api/meja/ringkas": ringkas,
  "GET /api/meja/ekspor": ekspor,
  "GET /api/meja/rapor": raporAdmin,
  "GET /api/meja/rapor/publik": raporPublik,
  "GET /api/meja/petugas": (env, req) => daftarPetugas(env, req),
  "POST /api/meja/petugas": (env, req, url, kini) => buatPetugas(env, req, url, kini),
  "POST /api/meja/petugas/:id": (env, req, url, kini, ctx, id) => cabutPetugas(env, req, id, kini),
  "POST /api/meja/dummy": (env, req, url, kini) => dummy(env, req, kini),
};
/* gerbang uji membaca kunci tabel ini; tiap rute dibungkus aman() (tabel belum ada = 503) */
export const RUTE_MEJA = Object.fromEntries(Object.entries(A).map(([k, f]) => [k, aman(f)]));
