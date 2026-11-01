/* Logbook Pusdalops (kontrak L1: docs/superpowers/specs/2026-11-01-logbook-pusdalops-design.md; migrasi 0088).
   Satu kejadian = banyak entri; angka dampak di entri = nilai TERKINI (entri lanjutan menimpa, tidak menjumlah; null = tidak dilaporkan).
   Semua rute: stafOK(pusdalops|koordalops|pimpinan) PERTAMA, sebelum body/D1. Wilayah = kunci "prov|nama" (prov 2 angka), sama dengan public/data/logbook_riwayat.json.
   Pengingat lanjutan (24/72 jam tanpa entri baru) dibuat src/pengingat.js lewat pendeteksi `logbookLanjutan` memakai logbook_kejadian.terakhir (indeks status, terakhir). */
import {json, gagal, acak, bacaBody} from "./worker.js";
import {stafOK} from "./staf.js";
import {superOK} from "./posko.js";
import {laju} from "./bnpb.js";
import {PROV} from "./alun.js";

const PERAN = ["pusdalops", "koordalops", "pimpinan"], HARI = 864e5, MENIT = 6e4, MAKS_BODY = 8192, MAKS_HARI = 1000;
export const JENIS = ["banjir", "cuaca", "kebakaran_permukiman", "karhutla", "longsor", "gempabumi", "gunungapi", "kekeringan", "kecelakaan", "konflik_sosial", "lainnya"];
export const KENDALA = ["akses", "logistik", "sinyal", "air", "personel", "alat_berat", "gambut", "cuaca", "data", "dana", "malam", "sosial", "listrik", "angin"];
export const KEBUTUHAN = ["makanan", "tenda", "sandang", "air_bersih", "obat", "perahu", "material", "alat_berat", "pompa", "dana"];
/* batas wajar seperti BATAS_WAJAR di scripts/umum/laphar_arsip.py; di atasnya ditolak kecuali yakin:true. KERAS = batas mutlak, yakin pun tak menolong. */
export const BATAS_WAJAR = {md: 5000, hilang: 5000, luka: 50000, mengungsi_jiwa: 2e6, mengungsi_kk: 1e6, rumah_rb: 5e5, rumah_rs: 5e5, rumah_rr: 5e5, rumah_terendam: 1e6, luas_ha: 3e6};
const KERAS = 1e8, ANGKA = Object.keys(BATAS_WAJAR), RE_TGL = /^\d{4}-\d\d-\d\d$/, KONTROL = /[\u0000-\u001f\u007f​-‏‪-‮﻿]/;
const KOLOM_ENTRI = ["id", "kejadian_id", "waktu", ...ANGKA, "kendala", "kebutuhan", "catatan", "sumber_instansi", "oleh", "dibuat"];
const tabelBelum = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "logbook belum diaktifkan (migrasi 0088_logbook belum diterapkan)"); throw e; }
};

const teks = (v, maks, min = 0) => v == null || v === "" ? (min ? undefined : null) : typeof v === "string" && !KONTROL.test(v) && v.trim().length >= min && v.trim().length <= maks ? v.trim() : undefined;
const waktuMs = (v, kini) => {   // epoch ms atau ISO; null = sekarang
  if (v == null) return kini;
  const t = typeof v === "number" ? v : typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isFinite(t) && t <= kini + 5 * MENIT && t >= kini - 14 * HARI ? Math.round(t) : undefined;
};
function wilayah(o) {   // kab_kode "prov|nama" (bentuk form staf), atau kab/wilayah berkunci "prov|nama", atau prov_kode/prov (2 angka) + kab (nama)
  const k = [o.kab_kode, o.kab, o.wilayah].find(x => typeof x === "string" && x.includes("|"));
  const [prov, kab, ...sisa] = k ? k.split("|") : [o.prov_kode ?? o.prov, o.kab];
  const nama = typeof kab === "string" ? teks(kab, 60, 2) : null;
  return !sisa.length && typeof prov === "string" && /^\d{2}$/.test(prov) && Object.hasOwn(PROV, prov) && nama ? {prov, kab: nama} : null;
}
function daftarKode(v, sah, nama) {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > sah.length || new Set(v).size !== v.length || v.some(x => !sah.includes(x))) return `${nama} harus larik kode unik dari: ${sah.join(", ")}`;
  return v;
}
/* validasi bagian entri; kembalikan {e} atau {galat} */
export function periksaEntri(o, kini) {
  const e = {};
  for (const k of ANGKA) {
    const v = o[k];
    if (v == null || v === "") { e[k] = null; continue; }
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || (k !== "luas_ha" && !Number.isInteger(v))) return {galat: `${k} harus ${k === "luas_ha" ? "angka" : "bilangan bulat"} >= 0`};
    if (v > KERAS) return {galat: `${k} melewati batas mutlak ${KERAS}`};
    if (v > BATAS_WAJAR[k] && o.yakin !== true) return {galat: `${k}=${v} melewati batas wajar ${BATAS_WAJAR[k]}; periksa lagi atau kirim yakin: true`, status: 400, wajar: k};
    e[k] = v;
  }
  if (e.mengungsi_kk != null && e.mengungsi_jiwa != null && e.mengungsi_kk > e.mengungsi_jiwa && o.yakin !== true) return {galat: "mengungsi_kk lebih besar dari mengungsi_jiwa; periksa lagi atau kirim yakin: true", wajar: "mengungsi_kk"};
  for (const [k, sah] of [["kendala", KENDALA], ["kebutuhan", KEBUTUHAN]]) { const d = daftarKode(o[k], sah, k); if (typeof d === "string") return {galat: d}; e[k] = d; }
  e.catatan = teks(o.catatan, 1000); e.sumber_instansi = teks(o.sumber_instansi, 80);
  if (e.catatan === undefined) return {galat: "catatan maksimal 1000 karakter tanpa karakter kontrol"};
  if (e.sumber_instansi === undefined) return {galat: "sumber_instansi maksimal 80 karakter tanpa karakter kontrol"};
  const w = waktuMs(o.waktu, kini); if (w === undefined) return {galat: "waktu harus epoch ms atau ISO, tidak lebih dari 5 menit ke depan dan 14 hari ke belakang"};
  e.waktu = w; return {e};
}
const stmtEntri = (env, kejadian, e, oleh, kini, eid = acak(8)) => env.DB.prepare(`INSERT INTO logbook_entri (${KOLOM_ENTRI}) VALUES (${KOLOM_ENTRI.map(() => "?")})`)
  .bind(eid, kejadian, e.waktu, ...ANGKA.map(k => e[k]), JSON.stringify(e.kendala), JSON.stringify(e.kebutuhan), e.catatan, e.sumber_instansi, oleh, kini);
const keluarEntri = r => ({...r, kendala: JSON.parse(r.kendala), kebutuhan: JSON.parse(r.kebutuhan), ...("dummy" in r ? {dummy: !!r.dummy} : {})});
const keluarKej = k => ({...k, dummy: !!k.dummy});
const KOL_KEJ = "id, jenis, prov, kab, kec, desa, lat, lon, mulai, status, terakhir, dibuat, diubah, dummy";
const KOL_ENT = ["id", "kejadian_id", "waktu", ...ANGKA, "kendala", "kebutuhan", "catatan", "sumber_instansi", "dibuat"].join(", ");
const BATAS_TULIS = [[3600e3, 120]];   // tulis logbook per pelaku per jam
const lajuTulis = (env, oleh, kini) => laju(env, "lb:" + oleh, "logbook_tulis", BATAS_TULIS, kini);
const pintu = async (env, req) => { const oleh = await stafOK(env, req, PERAN); return oleh ? String(oleh).slice(0, 64) : null; };
const baca = async req => { const b = await bacaBody(req, MAKS_BODY); return b.galat ? {r: gagal(b.status || 400, b.galat)} : {o: b.o}; };

async function buat(env, req, kini) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const b = await baca(req); if (b.r) return b.r;
  const o = b.o, w = wilayah(o);
  if (!JENIS.includes(o.jenis)) return gagal(400, `jenis harus salah satu: ${JENIS.join(", ")}`);
  if (!w) return gagal(400, 'kab harus kunci wilayah "prov|nama" (prov 2 angka dikenal)');
  const kec = teks(o.kec, 60), desa = teks(o.desa, 60);
  if (kec === undefined || desa === undefined) return gagal(400, "kec/desa maksimal 60 karakter tanpa karakter kontrol");
  const ada = o.lat != null || o.lon != null;
  if (ada && (typeof o.lat !== "number" || typeof o.lon !== "number" || !(o.lat >= -11.5 && o.lat <= 6.5) || !(o.lon >= 94 && o.lon <= 142))) return gagal(400, "lat dan lon wajib berpasangan di dalam Indonesia");
  const mt = typeof o.mulai === "string" && /^\d{4}-\d\d-\d\d/.test(o.mulai) ? Date.parse(o.mulai) : NaN;
  if (!Number.isFinite(mt) || mt > kini + HARI || mt < kini - 400 * HARI) return gagal(400, "mulai harus tanggal ISO (YYYY-MM-DD atau waktu lengkap), tidak lebih dari 1 hari ke depan dan 400 hari ke belakang");
  const p = periksaEntri(typeof o.entri === "object" && o.entri && !Array.isArray(o.entri) ? {yakin: o.yakin, ...o.entri} : o, kini); if (p.galat) return json({galat: p.galat, wajar: p.wajar}, 400);
  const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
  const id = acak(8);
  await env.DB.batch([env.DB.prepare(`INSERT INTO logbook_kejadian (id, jenis, prov, kab, kec, desa, lat, lon, mulai, status, terakhir, dibuat, diubah, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'buka', ?, ?, ?, ?)`)
    .bind(id, o.jenis, w.prov, w.kab, kec, desa, ada ? o.lat : null, ada ? o.lon : null, new Date(mt).toISOString(), kini, kini, kini, oleh), stmtEntri(env, id, p.e, oleh, kini)]);
  return json({kejadian: keluarKej(await env.DB.prepare(`SELECT ${KOL_KEJ} FROM logbook_kejadian WHERE id = ?`).bind(id).first()), entri: keluarEntri(await env.DB.prepare(`SELECT ${KOL_ENT} FROM logbook_entri WHERE kejadian_id = ?`).bind(id).first())}, 201);
}
async function lanjut(env, req, kini, id) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const b = await baca(req); if (b.r) return b.r;
  const k = await env.DB.prepare("SELECT id, status FROM logbook_kejadian WHERE id = ?").bind(id).first();
  if (!k) return gagal(404, "kejadian tidak ada");
  if (k.status !== "buka") return gagal(409, "kejadian sudah ditutup");
  const p = periksaEntri(b.o, kini); if (p.galat) return json({galat: p.galat, wajar: p.wajar}, 400);
  const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
  const eid = acak(8);
  await env.DB.batch([stmtEntri(env, id, p.e, oleh, kini, eid), env.DB.prepare("UPDATE logbook_kejadian SET terakhir = ?, diubah = ? WHERE id = ?").bind(kini, kini, id)]);
  return json({entri: keluarEntri(await env.DB.prepare(`SELECT ${KOL_ENT} FROM logbook_entri WHERE id = ?`).bind(eid).first())}, 201);
}
async function tutup(env, req, kini, id) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
  const r = await env.DB.prepare("UPDATE logbook_kejadian SET status = 'tutup', diubah = ? WHERE id = ? AND status = 'buka'").bind(kini, id).run();
  if (r.meta.changes) return json({ok: true, id, status: "tutup"});
  return (await env.DB.prepare("SELECT 1 x FROM logbook_kejadian WHERE id = ?").bind(id).first()) ? gagal(409, "kejadian sudah ditutup") : gagal(404, "kejadian tidak ada");
}
/* kejadian buka di kab dalam 14 hari terakhir (mulai ATAU entri terakhir), lengkap dengan entri terkini untuk mengisi form lanjutan */
async function buka(env, req, url, kini) {
  if (!await pintu(env, req)) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const q = url.searchParams.get("kab") ?? "", w = wilayah(q.includes("|") ? {kab: q} : {prov: url.searchParams.get("prov"), kab: q});
  if (!w) return gagal(400, 'kab wajib kunci wilayah "prov|nama" (atau kab + prov)');
  const kej = (await env.DB.prepare(`SELECT ${KOL_KEJ} FROM logbook_kejadian WHERE prov = ? AND kab = ? AND status = 'buka' AND terakhir >= ? ORDER BY terakhir DESC LIMIT 50`).bind(w.prov, w.kab, kini - 14 * HARI).all()).results;
  if (!kej.length) return json({kejadian: []}, 200, {"cache-control": "no-store"});
  const ent = (await env.DB.prepare(`SELECT ${KOL_ENT} FROM logbook_entri e WHERE e.kejadian_id IN (SELECT value FROM json_each(?)) AND e.rowid = (SELECT x.rowid FROM logbook_entri x WHERE x.kejadian_id = e.kejadian_id ORDER BY x.waktu DESC, x.rowid DESC LIMIT 1)`)
    .bind(JSON.stringify(kej.map(k => k.id))).all()).results;
  const per = new Map(ent.map(e => [e.kejadian_id, keluarEntri(e)]));
  return json({kejadian: kej.map(k => ({...keluarKej(k), entri_terkini: per.get(k.id) ?? null}))}, 200, {"cache-control": "no-store"});
}
/* periode 07.00-07.00 WIB yang DIMULAI pada tanggal T: dari T 07.00 WIB (= T 00.00 UTC) sampai T+1 07.00 WIB, kiri-tutup kanan-buka. Entri pukul 00.00-07.00 WIB masuk tanggal sebelumnya;
   periode yang memuat "sekarang" = tanggal WIB dari (sekarang - 7 jam). Laporan harian pagi hari T+1 memakai tgl=T. */
async function hari(env, req, url) {
  if (!await pintu(env, req)) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const tgl = url.searchParams.get("tgl") ?? "", t = RE_TGL.test(tgl) ? Date.parse(tgl + "T00:00:00Z") : NaN;
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== tgl) return gagal(400, "tgl harus YYYY-MM-DD yang sah");
  const dari = t, sampai = t + HARI;
  const rows = (await env.DB.prepare(`SELECT ${KOL_ENT.split(", ").map(c => "e." + c)}, k.jenis, k.prov, k.kab, k.kec, k.desa, k.status, k.dummy FROM logbook_entri e JOIN logbook_kejadian k ON k.id = e.kejadian_id
    WHERE e.waktu >= ? AND e.waktu < ? ORDER BY e.waktu LIMIT ${MAKS_HARI + 1}`).bind(dari, sampai).all()).results;
  return json({tgl, dari, sampai, terpotong: rows.length > MAKS_HARI, entri: rows.slice(0, MAKS_HARI).map(keluarEntri)}, 200, {"cache-control": "no-store"});
}

/* ---------------- dummy (DUMMY.md): Super Admin saja; baris dummy=1 bertanda jelas, dihapus bersih oleh aksi hapus ---------------- */
const CONTOH = [   // [jenis, kab, kec, desa, status, [[menit lalu, dampak...]]] — angka dari rantai nyata: entri lanjutan menimpa, mengungsi_kk <= mengungsi_jiwa
  ["longsor", "33|Banjarnegara", "Pandanarum", "Tulis", "buka", [[300, {md: 1, hilang: 4, luka: 3, mengungsi_jiwa: 120, mengungsi_kk: 38, rumah_rb: 3, rumah_rs: 2, rumah_rr: 5, kendala: ["akses", "sinyal"], kebutuhan: ["tenda", "makanan"]}],
    [60, {md: 2, hilang: 2, luka: 6, mengungsi_jiwa: 210, mengungsi_kk: 66, rumah_rb: 5, rumah_rs: 4, rumah_rr: 9, kendala: ["akses", "alat_berat"], kebutuhan: ["tenda", "makanan", "alat_berat"]}]]],
  ["banjir", "33|Cilacap", "Kroya", "Pucung Kidul", "buka", [[30 * 60, {mengungsi_jiwa: 800, mengungsi_kk: 250, rumah_terendam: 310, rumah_rr: 12, kendala: ["listrik", "logistik"], kebutuhan: ["perahu", "air_bersih", "obat"]}]]],
  ["karhutla", "14|Rokan Hilir", "Bangko", "Bagan Batu", "buka", [[200, {luas_ha: 35.5, kendala: ["gambut", "air", "angin"], kebutuhan: ["pompa", "air_bersih"]}], [45, {luas_ha: 48.2, kendala: ["gambut", "air", "malam"], kebutuhan: ["pompa"]}]]],
  ["kebakaran_permukiman", "33|Magelang", "Mertoyudan", "Danurejo", "tutup", [[500, {md: 0, luka: 2, mengungsi_jiwa: 40, mengungsi_kk: 12, rumah_rb: 4, rumah_rs: 1, kendala: ["sosial"], kebutuhan: ["sandang", "makanan"]}], [90, {md: 0, luka: 2, mengungsi_jiwa: 40, mengungsi_kk: 12, rumah_rb: 4, rumah_rs: 1, kendala: [], kebutuhan: ["sandang"]}]]]];
async function dummyRute(env, req, kini) {
  if (!await superOK(env, req)) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await baca(req); if (b.r) return b.r;
  if (b.o.aksi === "hapus") {
    const [e, k, p] = await env.DB.batch([env.DB.prepare("DELETE FROM logbook_entri WHERE kejadian_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)"),
      env.DB.prepare("DELETE FROM pengingat WHERE jenis = 'logbook_lanjutan' AND sumber_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)"), env.DB.prepare("DELETE FROM logbook_kejadian WHERE dummy = 1")]);
    return json({ok: true, kejadian: p.meta.changes, entri: e.meta.changes});
  }
  if (b.o.aksi !== "isi") return gagal(400, "aksi harus isi/hapus");
  if ((await env.DB.prepare("SELECT count(*) n FROM logbook_kejadian WHERE dummy = 1").first()).n) return gagal(409, "data dummy logbook sudah ada; hapus dulu dengan 🧹");
  const st = [];
  for (const [jenis, kunci, kec, desa, status, entri] of CONTOH) {
    const [prov, kab] = kunci.split("|"), id = acak(8), awal = kini - entri[0][0] * 6e4;
    st.push(env.DB.prepare(`INSERT INTO logbook_kejadian (id, jenis, prov, kab, kec, desa, mulai, status, terakhir, dibuat, diubah, dibuat_oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dummy', 1)`)
      .bind(id, jenis, prov, kab, kec, desa, new Date(awal).toISOString(), status, kini - entri.at(-1)[0] * 6e4, awal, kini));
    for (const [menit, d] of entri) st.push(stmtEntri(env, id, {...Object.fromEntries(ANGKA.map(k => [k, d[k] ?? null])), kendala: d.kendala, kebutuhan: d.kebutuhan, catatan: "Data dummy untuk menilai layar", sumber_instansi: "Dummy", waktu: kini - menit * 6e4}, "dummy", kini));
  }
  await env.DB.batch(st);
  return json({ok: true, kejadian: CONTOH.length, entri: CONTOH.reduce((a, c) => a + c[5].length, 0)}, 201);
}

/* Turunan internal (R2 MEDIA, dibuat scripts/data/logbook_internal.py): daftar putih nama -> kunci tetap, masukan mentah tak pernah jadi kunci R2 */
const TURUNAN = new Set(["rapor_bpbd", "rekomendasi"]);
async function turunan(env, req, kini, nama) {
  const oleh = await pintu(env, req); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  if (!TURUNAN.has(nama)) return gagal(404, "tidak ditemukan");
  const lj = await laju(env, "lb:" + oleh, "logbook_baca", [[3600e3, 120]], kini); if (lj) return lj;
  if (!env.MEDIA) return gagal(503, "penyimpanan belum tersambung");
  const o = await env.MEDIA.get(`internal/pusdalops-logbook/turunan/${nama}.json`); if (!o) return gagal(404, "tidak ditemukan");
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, max-age=300", "x-content-type-options": "nosniff"}});
}

const T = tabelBelum;
export const RUTE_LOGBOOK = {
  "POST /api/logbook/kejadian": T((env, req, url, kini) => buat(env, req, kini)),
  "POST /api/logbook/kejadian/:id/entri": T((env, req, url, kini, ctx, id) => lanjut(env, req, kini, id)),
  "POST /api/logbook/kejadian/:id/tutup": T((env, req, url, kini, ctx, id) => tutup(env, req, kini, id)),
  "GET /api/logbook/buka": T((env, req, url, kini) => buka(env, req, url, kini)),
  "GET /api/logbook/hari": T((env, req, url) => hari(env, req, url)),
  "GET /api/logbook/turunan/:nama": (env, req, url, kini, ctx, nama) => turunan(env, req, kini, nama),
  "POST /api/logbook/dummy": T((env, req, url, kini) => dummyRute(env, req, kini)),
};
