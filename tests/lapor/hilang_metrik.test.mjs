/* OH-18 metrik petugas orang hilang: GET /api/lapor/meja/hilang/metrik, worker.js utuh di Miniflare + D1 sungguhan.
   Kosong atau tabel belum ada = null (bukan 0); wilayah lain tidak terhitung; tanpa angka tingkat keberhasilan. Jalankan: node --test tests/lapor/hilang_metrik.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN} from "../warga/_bnpb.mjs";
import {profilAktif} from "../warga/_profil.mjs";
import "../../src/worker.js";

const uji = berantai(), HARI = 864e5, JAM = 36e5, kini = Date.now();
const U = await siapkan("uji-oh-metrik", {ikat: {OH_PUBLIK: "1"}}), {api, DB} = U;
const LAMA = await siapkan("uji-oh-metrik-lama", {sampai: "0188_"});   // produksi sebelum migrasi 0188
const bpbd = async (nu, kab) => { const id = String(nu).padStart(16, "0");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat) VALUES (?, ?, 'pemkab', 'kab', 'Wilayah uji', ?, ?, '32', ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, ?)`)
    .bind(id, "ohmetrik" + nu, `32|${kab}`, JSON.stringify(["32"]), kab, "g".repeat(32), "0".repeat(64), `ohk${nu}@b.id`, "62812004" + String(nu).padStart(4, "0"), kini).run();
  return {cookie: (await profilAktif(DB, id)).cookie, origin: "http://bnpb.lokal", "x-pb": "1"}; };
let seq = 0;
const profil = (kab, status, {umurJam = 1, alasan = null, tayang = null} = {}) => { const i = ++seq, id = String(i).padStart(16, "0"), tok = "c".repeat(32 - String(i).length) + i;
  return DB.prepare("INSERT INTO oh_publik (cari_id, token, kelas, kab, status, alasan_turun, tayang_waktu, dibuat) VALUES (?, ?, 'dewasa', ?, ?, ?, ?, ?)").bind(id, tok, kab, status, alasan, tayang, kini - umurJam * JAM).run().then(() => tok); };
const infoBaris = (tok, jenis, status = "baru") => DB.prepare("INSERT INTO oh_info (id, jenis, sasaran_token, status, dibuat) VALUES (?, ?, ?, ?, ?)").bind(String(++seq).padStart(16, "0"), jenis, tok, status, kini).run();
const metrik = (h = ADMIN, a = api) => a("GET", "/api/lapor/meja/hilang/metrik", undefined, h);
const KOSONG = {antrean: null, tayang_aktif: null, turun: null, info_terbuka: null}, NOL = {antrean: {jumlah: 0, tertua_jam: null, median_jam: null}, tayang_aktif: 0, turun: {}, info_terbuka: {}};

uji("OH-18 metrik: tabel ada tapi kosong menjawab 0 (dihitung nol); umur tetap null", async () => {
  const r = await metrik(); assert.equal(r.s, 200, r.t); assert.deepEqual({...r.j, akun: undefined}, {...NOL, akun: undefined});
});
uji("OH-18 metrik: produksi tanpa migrasi 0188 menjawab belum terukur (null), bukan galat", async () => {
  const r = await metrik(ADMIN, LAMA.api); assert.equal(r.s, 200, r.t); assert.equal(r.j.antrean, null); assert.equal(r.j.tayang_aktif, null); assert.equal(r.j.turun, null); assert.equal(r.j.info_terbuka, null);
});
uji("OH-18 metrik: antrean, umur tertua dan median, tayang aktif, turun per alasan, info terbuka per jenis; wilayah lain tidak terhitung", async () => {
  for (const u of [2, 10, 50]) await profil("32.03", "menunggu", {umurJam: u}); await profil("32.03", "draf"); await profil("32.04", "menunggu", {umurJam: 900});
  const t1 = await profil("32.03", "tayang", {tayang: kini - HARI}); await profil("32.03", "tayang", {tayang: kini - 200 * HARI}); await profil("32.04", "tayang", {tayang: kini - HARI});   // yang kedua lewat masa tayang
  await profil("32.03", "turun", {alasan: "ditolak"}); await profil("32.03", "turun", {alasan: "ditolak"}); await profil("32.03", "turun", {alasan: "dicabut"}); await profil("32.04", "turun", {alasan: "tutup"});
  await infoBaris(t1, "informasi"); await infoBaris(t1, "informasi"); await infoBaris(t1, "cabut"); await infoBaris(t1, "foto", "selesai");
  const lain = await profil("32.04", "tayang", {tayang: kini - HARI}); await infoBaris(lain, "laporkan");
  const a = await metrik(); assert.equal(a.s, 200, a.t);
  assert.deepEqual(a.j.antrean, {jumlah: 4, tertua_jam: 900, median_jam: 10}, "BNPB melihat semua wilayah");
  assert.equal(a.j.tayang_aktif, 3); assert.deepEqual(a.j.turun, {ditolak: 2, dicabut: 1, tutup: 1}); assert.deepEqual(a.j.info_terbuka, {informasi: 2, cabut: 1, laporkan: 1});
  const m = await metrik(await bpbd(1, "32.03")); assert.equal(m.s, 200, m.t);
  assert.deepEqual(m.j.antrean, {jumlah: 3, tertua_jam: 50, median_jam: 10}, "BPBD hanya wilayahnya"); assert.equal(m.j.tayang_aktif, 1, "tayang lewat masa tidak terhitung");
  assert.deepEqual(m.j.turun, {ditolak: 2, dicabut: 1}); assert.deepEqual(m.j.info_terbuka, {informasi: 2, cabut: 1});
  assert.ok(!/berhasil|keberhasilan|persen/i.test(JSON.stringify(a.j)), "tanpa angka tingkat keberhasilan");
  const kos = await metrik(await bpbd(2, "32.99")); assert.deepEqual({...kos.j, akun: undefined}, {...NOL, akun: undefined}, "wilayah tanpa data: dihitung 0");
});
uji("OH-18 metrik: jumlah antrean dari count, bukan sampel terpotong (5010 baris di kab lain)", async () => {
  const st = DB.prepare("INSERT INTO oh_publik (cari_id, token, kelas, kab, status, dibuat) VALUES (?, ?, 'dewasa', '32.77', 'menunggu', ?)"); const b = [];
  for (let i = 0; i < 5010; i++) { const k = 900000 + i; b.push(st.bind(String(k).padStart(16, "0"), String(k).padStart(32, "a"), kini - (i + 1) * JAM)); }
  for (let i = 0; i < b.length; i += 500) await DB.batch(b.slice(i, i + 500));
  const r = await metrik(await bpbd(3, "32.77")); assert.equal(r.j.antrean.jumlah, 5010); assert.equal(r.j.antrean.tertua_jam, 5010); assert.equal(r.j.antrean.median_jam, 2505);
});
uji("OH-18 metrik: tamu ditolak", async () => { assert.equal((await api("GET", "/api/lapor/meja/hilang/metrik", undefined, {})).s, 403); });
