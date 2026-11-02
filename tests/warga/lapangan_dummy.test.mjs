/* Dummy modul Lapangan tahap B (U-16, ~/.claude/DUMMY.md): POST /api/petugas/dummy mengisi tugas, absen di tiap ember status (lolos, tinjau, sah, tolak, luring), logbook, foto, dan label,
   sehingga tiap kartu panel bukan nol. Hapus membersihkan semuanya (tabel dan berkas R2) tanpa menyentuh data asli. Worker utuh di Miniflare + D1 + R2. */
import assert from "node:assert/strict";
import "../../src/worker.js";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";

const U = await siapkan("uji-lapangan-dummy", {r2: true}), uji = berantai(), DB = U.DB;
const PB = {"x-pb": "1"}, K = kode => ({"x-kode": kode});
const A = (m, j, b, h = ADMIN) => U.api(m, j, b, {...h, ...PB});
const TABEL = ["lp_tugas", "lp_anggota", "lp_absen", "lp_logbook", "lp_logbook_foto", "lapangan_label"];
const hitungR2 = async () => (await (await U.mf.getR2Bucket("MEDIA")).list({prefix: "lapangan/"})).objects.length;
let KODE;

uji("dummy: hanya Super Admin dan x-pb; mengisi tugas, tiap ember status absen, logbook, foto, label", async () => {
  for (const h of [{}, MOD2, GERBANG]) assert.equal((await A("POST", "/api/petugas/dummy", {}, h)).s, 403, JSON.stringify(h));
  assert.equal((await U.api("POST", "/api/petugas/dummy", {}, ADMIN)).s, 403, "tanpa x-pb");
  for (const t of TABEL) assert.equal(await U.n(t), 0, t);
  const r = await A("POST", "/api/petugas/dummy", {}); assert.equal(r.s, 201, r.t); KODE = r.j.kode;
  for (const t of TABEL) assert.ok(await U.n(t, "1") > 0, `${t} terisi`);
  for (const t of ["lp_tugas", "lp_absen", "lp_logbook", "lp_logbook_foto", "lapangan_label"]) assert.equal(await U.n(t, "dummy = 0"), 0, `${t}: semua baris bertanda dummy`);
  for (const s of ["lolos", "tinjau", "sah", "tolak"]) assert.ok(await U.n("lp_absen", `status = '${s}'`) >= 1, "ember " + s);
  assert.ok(await U.n("lp_absen", "luring = 1") >= 1, "ember luring");
  for (const j of ["api", "banjir"]) assert.ok(await U.n("lapangan_label", `jenis = '${j}'`) >= 1, "label " + j);
  assert.ok(await U.n("lp_logbook", "terkunci = 1") >= 1 && await U.n("lp_logbook", "terkunci = 0") >= 1, "logbook terkunci dan terbuka");
  assert.equal(await hitungR2(), await U.n("lp_absen") + await U.n("lp_logbook_foto"), "tiap foto dummy ada di R2");
  /* isi ulang tidak menggandakan */
  const lagi = await A("POST", "/api/petugas/dummy", {}); assert.equal(lagi.s, 201); KODE = lagi.j.kode;
  assert.equal(await U.n("lp_tugas"), 1); assert.equal(await U.n("lp_absen"), 6); assert.equal(await hitungR2(), 8, "berkas R2 lama dibuang sebelum yang baru");
});

uji("dummy: tiap kartu panel bukan nol (hadir, belum absen, belum logbook, tinjau, titik) dan antrean tinjauan berisi", async () => {
  const r = await A("GET", "/api/petugas/panel/ringkas", undefined, ADMIN); assert.equal(r.s, 200, r.t);
  for (const k of ["hadir", "belum_absen", "belum_logbook", "tinjau"]) assert.ok(r.j[k] > 0, `${k} = ${r.j[k]}`);
  assert.ok(r.j.titik.length > 0 && r.j.titik.every(x => Number.isFinite(x.lat) && x.nama && x.tugas));
  const t = await A("GET", "/api/petugas/panel/tinjau", undefined, ADMIN); assert.ok(t.j.total >= 1 && t.j.baris[0].foto_url);
  const tg = await A("GET", "/api/petugas/panel/tugas?aktif=1", undefined, ADMIN); assert.equal(tg.j.baris.length, 1); assert.equal(tg.j.baris[0].anggota.length, 3);
  /* foto dummy bisa dibuka peninjau (kartu tidak berisi gambar rusak) */
  const f = await U.mf.dispatchFetch("http://bnpb.lokal" + t.j.baris[0].foto_url, {headers: ADMIN}); assert.equal(f.status, 200); assert.equal(f.headers.get("content-type"), "image/jpeg"); await f.arrayBuffer();
});

uji("dummy: petugas dummy melihat tugas dan absen hari ini; riwayat memuat ember lama; vektor tidak keluar", async () => {
  const s = await U.api("GET", "/api/petugas/saya", undefined, K(KODE)); assert.equal(s.s, 200, s.t);
  assert.equal(s.j.tugas.length, 1); assert.equal(s.j.hari_ini.absen_masuk.status, "lolos"); assert.ok(s.j.hari_ini.logbook?.id);
  const r = await U.api("GET", "/api/petugas/riwayat", undefined, K(KODE)); assert.equal(r.s, 200);
  assert.deepEqual([...new Set(r.j.absen.map(x => x.status))].sort(), ["lolos", "sah"]); assert.ok(r.j.logbook.length >= 1);
  assert.ok(!/AACAPw|"vektor"/.test(s.t + r.t));
});

uji("hapus dummy: semua tabel dan berkas R2 dummy bersih, data asli tidak tersentuh", async () => {
  /* data asli: satu tugas + satu orang dan absen yang bukan dummy harus selamat */
  await DB.batch([DB.prepare("INSERT INTO orang (id, jenis, nama, prov, status, kode_sha, wajah_status, dibuat, diubah, dummy) VALUES ('aaaaaaaaaaaaaaaa', 'pegawai', 'Asli Nyata', '62', 'aktif', ?, 'belum', 1, 1, 0)").bind("a".repeat(64)),
    DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, dibuat, dummy) VALUES ('bbbbbbbbbbbbbbbb', 'Tugas asli', 'banjir', -2, 114, 500, 1000, 2000, 1, 0)")]);
  await (await U.mf.getR2Bucket("MEDIA")).put("lapangan/absen/asli.jpg", new Uint8Array([0xff, 0xd8, 0xff]));
  const h = await A("DELETE", "/api/petugas/dummy"); assert.equal(h.s, 200); assert.equal(h.j.n, 3);
  for (const t of ["lp_absen", "lp_logbook", "lp_logbook_foto", "lapangan_label", "lp_anggota"]) assert.equal(await U.n(t), 0, t);
  assert.equal(await U.n("lp_tugas"), 1); assert.equal(await U.n("orang"), 1); assert.equal(await hitungR2(), 1, "hanya berkas asli yang tersisa");
  assert.equal((await A("DELETE", "/api/petugas/dummy")).j.n, 0);
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(KODE))).s, 401);
});
