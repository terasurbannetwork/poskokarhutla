/* KP-24 GET /api/orang/:id/jejak (K9): worker utuh di Miniflare + D1 sungguhan. node --test tests/warga/orang_jejak.test.mjs */
import assert from "node:assert/strict";
import "../../src/worker.js";
import {siapkan, berantai, sha256, ADMIN} from "./_bnpb.mjs";

const U = await siapkan("uji-orang-jejak"), uji = berantai(), {DB, api} = U;
const JAM = 3600e3, hari = ms => new Date(ms + 7 * JAM).toISOString().slice(0, 10);
const kini = Date.now(), H0 = hari(kini), H1 = hari(kini - 86400e3);
const BUDI = "b1".repeat(8), CICI = "c1".repeat(8), STAF = "5a".repeat(8), AKUN = "a9".repeat(8), TUGAS = "d1".repeat(8), TA = "e1".repeat(8);
const KODE = {b: "b".repeat(26), c: "c".repeat(26)}, TOK = "f".repeat(64);
const P = (j, h = {}) => api("GET", j, undefined, h), RAHASIA = "RAHASIA-ISI-LOGBOOK";

uji("setup: dua orang, tugas, absen, logbook, staf terpetakan, akun instansi dengan isian", async () => {
  for (const [id, k, nama] of [[BUDI, "b", "Budi"], [CICI, "c", "Cici"]])
    await DB.prepare("INSERT INTO orang (id, jenis, nama, prov, kab, status, kode_sha, wajah_status, dibuat, diubah, dummy) VALUES (?, 'pegawai', ?, '62', 'Seruyan', 'aktif', ?, 'belum', 1, 1, 0)").bind(id, nama, sha256(KODE[k])).run();
  await DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, dibuat_oleh, dibuat, dummy) VALUES (?, 'Patroli', 'banjir', -2.5, 112.9, 2000, ?, ?, 'uji', 1, 0)").bind(TUGAS, kini - 9e8, kini + 9e8).run();
  const absen = (id, jenis, tanggal, n, status = "lolos") => DB.prepare("INSERT INTO lp_absen (id, orang_id, tugas_id, jenis, tanggal, waktu, lat, lon, foto_key, foto_sha256, status) VALUES (?, ?, ?, ?, ?, ?, -2.5, 112.9, 'lapangan/x.jpg', ?, ?)").bind(id, BUDI, TUGAS, jenis, tanggal, kini, sha256("f" + n), status);
  await DB.batch([absen("a1".repeat(8), "masuk", H0, 1), absen("a2".repeat(8), "pulang", H0, 2), absen("a3".repeat(8), "masuk", H1, 3), absen("a4".repeat(8), "masuk", H1, 4, "tolak"),
    DB.prepare("INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, uraian, waktu, diubah) VALUES (?, ?, ?, ?, 'Patroli', ?, ?, ?)").bind("l1".repeat(8), BUDI, TUGAS, H0, RAHASIA, kini, kini)]);
  await DB.prepare("INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy) VALUES (?, 'stafjejak1', 'Staf Budi', '9100b0001', 'Pusdalops', 'b@b.id', '628120000001', '[\"pusdalops\"]', '[]', ?, ?, 0, 1, 'tes', 0)").bind(STAF, "a".repeat(32), "a".repeat(64)).run();
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(TOK), STAF, kini + JAM).run();
  await DB.prepare("INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy) VALUES (?, 'jejakakun1', 'pemkab', 'kab', 'BPBD Uji', ?, '[\"62\"]', '62', 'Seruyan', ?, ?, 'aktif', 'Budi', '198001012005011001', 'Kalak', 'BPBD', 'b@c.go.id', '628123456789', 1, 1, 1, 1, 0, 1, 0)").bind(AKUN, "k" + AKUN, "c".repeat(32), "0".repeat(64)).run();
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, dummy) VALUES (?, '62', 'Seruyan', 'Kec', -2.5, 112.9, 3, 5, 10, ?, ?, 'buka', 0)").bind(TA, kini, kini).run();
  await DB.prepare("INSERT INTO tugas_isian (id, tugas_id, akun_id, klien_id, langkah, dibuat, status_api, tindakan) VALUES (?, ?, ?, 'klien-jejak-1', 'tindakan', ?, 'menyala', ?)").bind("i1".repeat(8), TA, AKUN, kini, RAHASIA).run();
  for (const [t, a] of [["staf", STAF], ["instansi_akun", AKUN]]) await DB.prepare("INSERT INTO orang_akun (tabel, akun_id, orang_id, cara, dibuat) VALUES (?, ?, ?, 'admin', 1)").bind(t, a, BUDI).run();
});

const ringkas = j => j.baris.map(x => `${x.tanggal} ${x.jenis} ${x.n}`);
uji("orangnya sendiri (kode petugas) melihat hitungan per hari, absen ditolak tak dihitung, isian instansi ikut", async () => {
  const r = await P(`/api/orang/${BUDI}/jejak`, {"x-kode": KODE.b}); assert.equal(r.s, 200, r.t);
  assert.deepEqual(ringkas(r.j).sort(), [`${H0} absen 2`, `${H0} logbook 1`, `${H0} tugas 1`, `${H1} absen 1`].sort());
  assert.equal(r.j.baris[0].tanggal, H0, "terbaru dulu");
});
uji("sesi staf yang dipetakan ke orang itu melihat; staf lain atau tanpa sesi tidak", async () => {
  assert.equal((await P(`/api/orang/${BUDI}/jejak`, {cookie: "sesi_staf=" + TOK})).s, 200);
  assert.equal((await P(`/api/orang/${CICI}/jejak`, {cookie: "sesi_staf=" + TOK})).s, 404, "staf terpetakan ke Budi, bukan Cici");
  assert.equal((await P(`/api/orang/${BUDI}/jejak`)).s, 404);
});
uji("orang lain 404 sama persis dengan orang tak ada; kode regu dan kode salah juga", async () => {
  const lain = await P(`/api/orang/${BUDI}/jejak`, {"x-kode": KODE.c}), nol = await P(`/api/orang/${"0".repeat(16)}/jejak`, {"x-kode": KODE.c});
  assert.equal(lain.s, 404); assert.equal(nol.s, 404); assert.equal(lain.t, nol.t);
  assert.equal((await P(`/api/orang/${BUDI}/jejak`, {"x-kode": "z".repeat(26)})).s, 404);
  assert.equal((await P(`/api/orang/${BUDI}/jejak`, {"x-kode-regu": KODE.b})).s, 404);
});
uji("admin melihat; admin pada orang tak ada 404", async () => {
  assert.equal((await P(`/api/orang/${BUDI}/jejak`, ADMIN)).s, 200);
  assert.equal((await P(`/api/orang/${"0".repeat(16)}/jejak`, ADMIN)).s, 404);
});
uji("tiap baca yang berhasil tercatat di pantau_jejak; yang ditolak tidak", async () => {
  const log = async () => (await DB.prepare("SELECT oleh, aksi, obyek, catatan FROM pantau_jejak WHERE obyek = ? ORDER BY id").bind("orang:" + BUDI).all()).results;
  const awal = (await log()).length; assert.equal(awal, 3, "petugas, staf, admin");
  await P(`/api/orang/${BUDI}/jejak`, {"x-kode": KODE.c}); assert.equal((await log()).length, awal);
  const l = await log(); assert.deepEqual(l.map(x => x.oleh.split(":")[0]), ["orang", "staf", "admin"]);
  assert.ok(l.every(x => x.aksi === "jejak_baca" && x.catatan === null));
});
uji("rentang: 31 hari boleh, 32 hari 400, terbalik 400, format salah 400", async () => {
  const dari = n => hari(kini - n * 86400e3), q = (a, b) => P(`/api/orang/${BUDI}/jejak?dari=${a}&sampai=${b}`, ADMIN);
  assert.equal((await q(dari(30), H0)).s, 200); assert.equal((await q(dari(31), H0)).s, 400);
  assert.equal((await q(H0, dari(1))).s, 400); assert.equal((await q("2026-02-30", H0)).s, 400); assert.equal((await q("kemarin", H0)).s, 400);
});
uji("isi tidak bocor: tanpa teks, vektor, foto, atau kunci selain tanggal, jenis, n", async () => {
  const r = await P(`/api/orang/${BUDI}/jejak`, ADMIN);
  assert.ok(!r.t.includes(RAHASIA) && !/foto|vektor|uraian|tindakan/.test(r.t));
  assert.ok(r.j.baris.every(x => Object.keys(x).sort().join() === "jenis,n,tanggal"));
});
