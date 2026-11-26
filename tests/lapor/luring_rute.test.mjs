/* Lapor tanpa sinyal LR-06 dan LR-09 di Worker sungguhan (workerd lewat Miniflare, D1 dan R2, migrasi apa adanya).
   putarUlang dari public/lapor/luring.js (klien asli) memutar butir luring ke /api/lapor/pesan dan /api/lapor/foto lewat pintu web bersesi /masuk.
   Yang dijaga: waktu simpan HP hanya keterangan (darurat.luring di meja), tidak pernah waktu kejadian; pita darurat mati sesudah 2 jam (Q3);
   foto luring dinilai terhadap waktu simpan (Q1), foto tua ditolak sendiri dan laporan tetap terkirim. Jalankan: node --test tests/lapor/luring_rute.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "../warga/_bnpb.mjs";
import {JPEG_SAH} from "../warga/_bantu.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor

const uji = berantai();
const MESIN = {authorization: "Bearer mesin-rahasia"};
const U = await siapkan("uji-lapor-luring", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, mf} = U;
const ORI = "http://bnpb.lokal", MENIT = 6e4, JAM = 60 * MENIT;
const GPS = {lat: -6.6, lon: 106.8, akurasi: 12};
const JPEG = "data:image/jpeg;base64," + Buffer.from(JPEG_SAH).toString("base64");

// peramban tiruan secukupnya untuk luring.js; fetch relatif diteruskan ke Worker dengan kuki sesi /masuk
const simpanan = new Map(); let kuki = null;
Object.assign(globalThis, {
  localStorage: {getItem: k => simpanan.get(k) ?? null, setItem: (k, v) => simpanan.set(k, String(v)), removeItem: k => simpanan.delete(k)},
  document: {getElementById: () => null, body: {prepend() {}}},
  window: {PbAntre: {saluran: () => ({daftar: async () => []}), dengar() {}}},
});
globalThis.addEventListener ??= () => {}; globalThis.dispatchEvent ??= () => true;
Object.defineProperty(globalThis, "navigator", {value: {onLine: true}, configurable: true});
const fetchAsli = globalThis.fetch;
globalThis.fetch = (u, o = {}) => typeof u === "string" && u.startsWith("/")
  ? mf.dispatchFetch(ORI + u, {method: o.method, headers: {...o.headers, origin: ORI, cookie: kuki}, body: o.body}) : fetchAsli(u, o);
const {putarUlang} = await import("../../public/lapor/luring.js");

async function pelapor(wa, i) {   // nomor berizin, profil tersimpan, sesi /masuk aktif
  const tok = String(i).repeat(64).slice(0, 64), kini = Date.now(); kuki = `sesi_masuk=${tok}`;
  assert.equal((await api("POST", "/api/lapor/izin", {wa}, MESIN)).s, 200);
  await DB.batch([DB.prepare("INSERT INTO lapor_pelapor (wa, nama, peran, dibuat, diubah) VALUES (?, 'Uji Luring', 'warga', ?, ?)").bind(wa, kini, kini),
    DB.prepare(`INSERT INTO mk_akun (id, wa, status, dibuat) VALUES ('akunluringuji00${i}', ?, 'aktif', ?)`).bind(wa, kini),
    DB.prepare(`INSERT INTO mk_sesi (token_sha, mk_id, kode_pada, dibuat, habis) VALUES (?, 'akunluringuji00${i}', ?, ?, ?)`).bind(sha256(tok), kini, kini, kini + JAM)]);
  simpanan.set("lapor-wa", JSON.stringify(wa));
}
const baris = async nomor => (await api("GET", "/api/lapor/meja", undefined, ADMIN)).j.baris.find(x => x.nomor === nomor);
const kerja = async nomor => JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(nomor).first()).kerja);

uji("butir luring 3 jam: terkirim, meja menampilkan dari luring dan terlambat (tanpa pita), waktu kejadian = jam terima", async () => {
  await pelapor("6281200000061", 1);
  const w = Date.now() - 3 * JAM, r = await putarUlang({jenis: "Banjir", korban: "tidak", ...GPS, waktu_klien: w});
  assert.equal(r.s, 200, JSON.stringify(r.j)); assert.match(r.j.nomor, /^LA-\d{6}-\d{2}$/);
  const b = await baris(r.j.nomor);
  assert.deepEqual(b.darurat, {korban: "tidak", luring: {simpan: w}, terlambat: true});
  const s = await kerja(r.j.nomor);
  assert.ok(s.isian.waktu.ms > w + 2 * JAM, "waktu simpan HP tidak jadi waktu kejadian");
});

uji("butir luring 20 menit dengan dua foto: foto sah berlencana GPS luring, foto tua ditolak, pita darurat tetap", async () => {
  await pelapor("6281200000062", 2);
  const w = Date.now() - 20 * MENIT;
  const sah = {data: JPEG, exif: {kamera: true, waktu: w - MENIT}, gps: {...GPS, waktu: w - MENIT}};
  const tua = {data: JPEG, exif: {kamera: true, waktu: w - 30 * MENIT}, gps: {...GPS, waktu: w - 30 * MENIT}};
  const r = await putarUlang({jenis: "Banjir", korban: "ya", ...GPS, waktu_klien: w, foto: [sah, tua]});
  assert.equal(r.s, 200, JSON.stringify(r.j));
  const b = await baris(r.j.nomor);
  assert.deepEqual(b.darurat, {korban: "ya", luring: {simpan: w}}, "tidak terlambat: pita darurat menyala");
  assert.equal(b.foto, 1, "foto tua ditolak sendiri");
  const s = await kerja(r.j.nomor);
  assert.equal(s.foto[0].lencana, "gps", "GPS 20 menit lalu sah terhadap waktu simpan (Q1)");
  assert.match(s.foto[0].lencanaTeks, /dikirim dari luring, jam HP belum diverifikasi/);
});

uji("foto berGPS 20 menit lalu tanpa tanda luring tidak dapat lencana GPS (aturan biasa tetap)", async () => {
  await pelapor("6281200000063", 3);
  let r = await api("POST", "/api/lapor/pesan", {teks: "darurat"}, {origin: ORI, cookie: kuki, "x-pb": "1"});
  for (let i = 0; i < 12 && r.j.minta !== "foto"; i++) {
    const j = r.j, body = j.minta === "lokasi" ? {lokasi: {...GPS, sumber: "gps"}} : {teks: "1"};
    r = await api("POST", "/api/lapor/pesan", body, {origin: ORI, cookie: kuki, "x-pb": "1"});
  }
  assert.equal(r.j.minta, "foto");
  const f = await api("POST", "/api/lapor/foto", {data: JPEG, exif: {kamera: true, waktu: Date.now() - 20 * MENIT}, gps: {...GPS, waktu: Date.now() - 20 * MENIT}}, {origin: ORI, cookie: kuki, "x-pb": "1"});
  assert.equal(f.s, 200, f.t.slice(0, 300));
  assert.equal(f.j.fotoBaru.lencana, "tanpa"); assert.doesNotMatch(f.j.fotoBaru.lencanaTeks, /luring/);
});

/* temuan pemeriksa keamanan 26 Nov 2026: tunda diukur dengan dua jam HP (kirim - simpan), bukan jam server - jam HP */
async function denganJamHp(geser, f) { const asli = Date.now; Date.now = () => asli() + geser; try { return await f(); } finally { Date.now = asli; } }

uji("jam HP mundur 3 jam, disimpan 1 menit sebelum kirim: tidak terlambat, pita darurat menyala", async () => {
  await pelapor("6281200000064", 4);
  const w = Date.now() - 3 * JAM - MENIT;
  const r = await denganJamHp(-3 * JAM, () => putarUlang({jenis: "Banjir", korban: "tidak", ...GPS, waktu_klien: w}));
  assert.equal(r.s, 200, JSON.stringify(r.j));
  assert.deepEqual((await baris(r.j.nomor)).darurat, {korban: "tidak", luring: {simpan: w}});
});

uji("tunda 3 jam sungguhan dengan jam HP benar: terlambat", async () => {
  await pelapor("6281200000065", 5);
  const w = Date.now() - 3 * JAM, r = await putarUlang({jenis: "Banjir", korban: "tidak", ...GPS, waktu_klien: w});
  assert.equal(r.s, 200, JSON.stringify(r.j));
  assert.equal((await baris(r.j.nomor)).darurat.terlambat, true);
});
