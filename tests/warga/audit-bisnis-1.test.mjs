/* Audit logika bisnis, putaran 1: sembilan celah di penugasan, operasi lapangan, laporan BNPB, sitrep, rumah rusak, dan tugas api.
   Semuanya di workerd (Miniflare) dengan D1 + R2 lokal sungguhan dan migrasi apa adanya (TEST.md: tanpa mock klien DB).
   Jalankan: node --test tests/warga/audit-bisnis-1.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus), urutan yang sama dengan produksi
import {buatTugas, tautkanLaporanRegu} from "../../src/instansi.js";

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, uji = berantai();
let TUGAS = null, HILANG = null;   // fixture tugas_kompleks.json; HILANG = jalur aset yang dibuat 404 (masukan sitrep gagal)
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === "/data/tugas_kompleks.json") return TUGAS == null ? new Response("tidak ada", {status: 404}) : Response.json(TUGAS);
  if (p === HILANG) return new Response("tidak ada", {status: 404});
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const U = await siapkan("uji-audit-bisnis-1", {r2: true, asetKu: aset, skrip: "tests/warga/_rumah_rusak_worker.mjs"});
const {DB, api, n} = U, worker = await U.mf.getWorker(), R2 = await U.mf.getR2Bucket("MEDIA");
let ipN = 0; const ipBaru = () => ({"cf-connecting-ip": `198.51.100.${++ipN % 250}`});
const id16 = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
const SANDI = "SandiUji23456789";
async function akun(username, kab = "Kab Satu") {
  const garam = "g".repeat(32), id = id16();
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, 'pemkab', 'kab', ?, ?, '["62"]', '62', ?, ?, ?, 'aktif', 'Budi Uji', '198001012005011001', 'Kalak', 'BPBD', 'budi@uji.go.id', '628123456789', 1, 1, 1, 1, 0, 1, 0)`)
    .bind(id, username, `Pemerintah ${kab}`, `uji|${username}`, kab, garam, sha256(garam + SANDI)).run();
  const r = await api("POST", "/api/instansi/masuk", {username, sandi: SANDI}, {...PB, ...ipBaru()}); assert.equal(r.s, 200, r.t);
  const kue = r.h.get("set-cookie").split(",")[0].split(";")[0];
  return {id, h: {cookie: kue, ...PB}};
}
async function tugas(kab, {lat = -2.2, lon = 113.9, status = "buka", konfirmasi = Date.now() - JAM, dibuat = Date.now() - JAM} = {}) {
  const id = id16();
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status, konfirmasi_pada, isian_terakhir, dummy) VALUES (?, '62', ?, 'Kec Uji', ?, ?, 3, 10, 50, ?, ?, ?, ?, ?, 0)")
    .bind(id, kab, lat, lon, dibuat, dibuat, status, konfirmasi, konfirmasi).run();
  return id;
}
const lacak = (jalur, token) => api("GET", "/api/lacak/" + jalur, undefined, {"x-lacak": token, ...ipBaru()});
let A, B;

uji("1. akun instansi dicabut: tautan lacak penugasannya mati (410) dan penugasan aktif jadi dicabut; akun lain tidak terganggu", async () => {
  A = await akun("auditsatu"); B = await akun("auditdua");
  const tA = await tugas("Kab Satu"), mk = async (a, tid) => { const r = await api("POST", `/api/instansi/penugasan/${tid}`, {nama: "Hendra", peran: "driver", wa: "0812 3456 7001", orang: 2}, {...a.h, ...ipBaru()}); assert.equal(r.s, 201, r.t); return r.j; };
  const pa = await mk(A, tA), pb = await mk(B, tA);
  assert.equal((await lacak("info", pa.token)).s, 200); assert.equal((await lacak("info", pb.token)).s, 200);
  const c = await api("POST", `/api/instansi/admin/akun/${A.id}`, {aksi: "cabut", alasan: "Pindah tugas"}, ADMIN); assert.equal(c.s, 200, c.t);
  const m = await lacak("info", pa.token); assert.equal(m.s, 410); assert.equal(m.j.alasan, "dicabut");
  assert.equal((await DB.prepare("SELECT status FROM penugasan WHERE id = ?").bind(pa.id).first()).status, "dicabut");
  assert.equal((await DB.prepare("SELECT status FROM penugasan WHERE id = ?").bind(pb.id).first()).status, "aktif", "penugasan akun lain utuh");
  assert.equal((await lacak("info", pb.token)).s, 200);
  /* jaring kedua: akun dicabut lewat SQL langsung (penugasan masih 'aktif') tetap tidak bisa melacak */
  await DB.prepare("UPDATE instansi_akun SET status = 'dicabut' WHERE id = ?").bind(B.id).run();
  assert.equal((await lacak("info", pb.token)).s, 410);
});

uji("2. terbit ulang penugasan yang sudah selesai ditolak 409 dan riwayat waktunya utuh", async () => {
  const C = await akun("auditempat"), tid = await tugas("Kab Satu");
  const p = (await api("POST", `/api/instansi/penugasan/${tid}`, {nama: "Hendra", peran: "driver", orang: 1}, {...C.h, ...ipBaru()})).j;
  const t0 = Date.now() - 3 * 60e3;
  await DB.prepare("UPDATE penugasan SET status = 'selesai', dibuka_pada = ?1, berangkat_pada = ?1, tiba_pada = ?1, selesai_pada = ?1 WHERE id = ?2").bind(t0, p.id).run();
  const u = await api("POST", `/api/instansi/terbit_penugasan/${p.id}`, {}, {...C.h, ...ipBaru()}); assert.equal(u.s, 409, u.t); assert.match(u.j.galat, /sudah selesai/);
  const b = await DB.prepare("SELECT status, dibuka_pada, berangkat_pada, tiba_pada, selesai_pada, token_sha FROM penugasan WHERE id = ?").bind(p.id).first();
  assert.deepEqual([b.status, b.dibuka_pada, b.berangkat_pada, b.tiba_pada, b.selesai_pada], ["selesai", t0, t0, t0, t0]); assert.equal(b.token_sha, sha256(p.token), "token lama tidak diganti");
});

uji("3. teruskan ke Meja logistik: dua klik serentak = satu baris Meja; sisip gagal mengembalikan klaim; status ikut tersalin ke Meja; ditolak tidak sesudah diteruskan", async () => {
  const tid = await tugas("Kab Satu");
  const mk = async () => { const r = await api("POST", "/api/ops/permintaan", {tugas_id: tid, jenis: "logistik", barang: "air_mineral", jumlah: 20, satuan: "dus", lat: -2.2, lon: 113.9}, {...A.h, ...ipBaru()}); return r; };
  const C = await akun("auditops"); A = C;   // A (dicabut) tidak lagi dipakai
  const L = await mk(); assert.equal(L.s, 201, L.t); const id = L.j.permintaan.id;
  const awal = await n("meja_catatan", "meja = 'logistik'");
  /* sisip gagal (trigger): galat 500, klaim dikembalikan, tidak ada baris Meja */
  await DB.prepare("CREATE TRIGGER uji_tolak_meja BEFORE INSERT ON meja_catatan BEGIN SELECT RAISE(ABORT, 'uji sisip gagal'); END").run();
  const gagal = await api("POST", `/api/ops/permintaan/${id}`, {aksi: "teruskan"}, ADMIN); assert.equal(gagal.s, 500);
  await DB.prepare("DROP TRIGGER uji_tolak_meja").run();
  assert.equal((await DB.prepare("SELECT meja_id FROM ops_permintaan WHERE id = ?").bind(id).first()).meja_id, null, "klaim dikembalikan");
  assert.equal(await n("meja_catatan", "meja = 'logistik'"), awal);
  /* serentak */
  const [x, y] = await Promise.all([api("POST", `/api/ops/permintaan/${id}`, {aksi: "teruskan"}, ADMIN), api("POST", `/api/ops/permintaan/${id}`, {aksi: "teruskan"}, MOD2)]);
  assert.deepEqual([x.s, y.s].sort(), [200, 409], `${x.t} / ${y.t}`);
  assert.equal(await n("meja_catatan", "meja = 'logistik'"), awal + 1, "tepat satu baris Meja");
  const mid = (await DB.prepare("SELECT meja_id FROM ops_permintaan WHERE id = ?").bind(id).first()).meja_id; assert.match(mid, /^[0-9a-f]{16}$/);
  /* status ikut tersalin; ditolak sesudah diteruskan ditolak */
  assert.equal((await api("POST", `/api/ops/permintaan/${id}`, {aksi: "status", ke: "ditolak", catatan: "batal"}, ADMIN)).s, 409);
  assert.equal((await api("POST", `/api/ops/permintaan/${id}`, {aksi: "status", ke: "disetujui"}, ADMIN)).s, 200);
  assert.equal((await DB.prepare("SELECT status FROM meja_catatan WHERE id = ?").bind(mid).first()).status, "disetujui");
  assert.deepEqual((await DB.prepare("SELECT dari, ke FROM meja_jejak WHERE catatan_id = ? ORDER BY id").bind(mid).all()).results.map(r => [r.dari, r.ke]), [[null, "diminta"], ["diminta", "disetujui"]]);
});

uji("4. laporan BNPB: simpan dengan diubah basi = 409 dan isi server utuh; baris baru lewat; baris sudah ada tanpa diubah = 409", async () => {
  const isi = {laporan_masuk: 10}, dasar = {jenis: "harian", tanggal: "2026-10-20"};
  const baru = await api("POST", "/api/laporan-bnpb", {...dasar, isi}, ADMIN); assert.equal(baru.s, 201, baru.t);
  assert.equal((await api("POST", "/api/laporan-bnpb", {...dasar, isi: {laporan_masuk: 99}}, MOD2)).s, 409, "tanpa diubah pada baris yang sudah ada");
  const muat = (await api("GET", "/api/laporan-bnpb?jenis=harian&tanggal=2026-10-20", undefined, ADMIN)).j;
  const a = await api("POST", "/api/laporan-bnpb", {...dasar, isi: {laporan_masuk: 20}, diubah: muat.diubah}, ADMIN); assert.equal(a.s, 201, a.t);
  const b = await api("POST", "/api/laporan-bnpb", {...dasar, isi: {laporan_masuk: 30}, diubah: muat.diubah}, MOD2);   // pemuat yang sama, sudah basi
  assert.equal(b.s, 409); assert.match(b.j.galat, /diubah petugas lain/);
  assert.equal((await api("GET", "/api/laporan-bnpb?jenis=harian&tanggal=2026-10-20", undefined, ADMIN)).j.isi.laporan_masuk, 20, "tidak ditimpa");
  assert.equal((await api("POST", "/api/laporan-bnpb", {...dasar, isi, diubah: "x"}, ADMIN)).s, 400);
});

uji("5. sitrep: masukan wajib gagal = arsip tidak ditulis (cron berikutnya mengulang); semua terbaca = ditulis sekali", async () => {
  const kini = Date.parse("2026-10-19T00:05:00Z"), kunci = "sitrep/2026-10-19.json.gz";
  HILANG = "/data/kekeringan_laporan.json";
  await worker.scheduled({cron: "* * * * *", scheduledTime: new Date(kini)});
  assert.equal(await R2.head(kunci), null, "tidak ada arsip timpang");
  HILANG = null;
  await worker.scheduled({cron: "* * * * *", scheduledTime: new Date(kini + 30 * 60e3)});
  assert.ok(await R2.head(kunci), "cron kedua menulis arsip utuh");
});

uji("6. rumah rusak: rumah yang sama (~10 m, tanggal sama) satu laporan dari siapa pun; tanggal lain boleh", async () => {
  const p = {bencana: "gempa", tingkat: "berat", lat: -2.3, lon: 113.9}, kirim = (b, h) => api("POST", "/api/rumah-rusak", b, h);
  assert.equal((await kirim(p, ADMIN)).s, 201);
  assert.equal((await kirim({...p, lat: p.lat + 0.00005}, MOD2)).s, 409, "pelapor lain, rumah sama");
  assert.equal((await kirim({...p, tingkat: "ringan"}, MOD2)).s, 409, "tingkat lain, rumah sama");
  const kemarin = new Date(Date.now() + 7 * JAM - HARI).toISOString().slice(0, 10);
  assert.equal((await kirim({...p, tanggal: kemarin}, MOD2)).s, 201, "tanggal kejadian lain");
});

uji("7. hotspot di dekat tugas bukan_api yang dikonfirmasi <= 14 hari tidak melahirkan tugas baru dan tidak membuka kembali; yang lebih lama melahirkan", async () => {
  const kini = Date.now(), K = (id, lat, o = {}) => ({id, lat, lon: 112.0, prov: "62", kab: "Kab Tujuh", kec: "Kec Uji", level: 2, n24: 5, jam_sejak: 1, luas: 30, konsesi: [], ...o});
  const tb = await tugas("Kab Tujuh", {lat: -2.5, lon: 112.0, status: "bukan_api", konfirmasi: kini - 3 * HARI, dibuat: kini - 4 * HARI});
  await DB.prepare("UPDATE tugas_api SET terakhir_terdeteksi = ? WHERE id = ?").bind(kini - 3 * HARI, tb).run();
  TUGAS = {dibuat: new Date(kini - 10 * 60e3).toISOString(), kompleks: [K("K9001", -2.505)]};
  const env = {DB, ASSETS: {fetch: aset}}, jml = () => n("tugas_api", "kab = 'Kab Tujuh'");
  const h = await buatTugas(env, kini); assert.equal(h.baru, 0, JSON.stringify(h)); assert.equal(await jml(), 1);
  const t = await DB.prepare("SELECT status, terakhir_terdeteksi, n24, level FROM tugas_api WHERE id = ?").bind(tb).first();
  assert.equal(t.status, "bukan_api", "tidak dibuka kembali"); assert.ok(t.terakhir_terdeteksi > kini - HARI, "terakhir_terdeteksi naik"); assert.deepEqual([t.n24, t.level], [10, 3], "angka lain tak diubah");
  /* konfirmasi 20 hari lalu: di luar jendela, tugas baru */
  await DB.prepare("UPDATE tugas_api SET konfirmasi_pada = ? WHERE id = ?").bind(kini - 20 * HARI, tb).run();
  assert.equal((await buatTugas(env, kini)).baru, 1); assert.equal(await jml(), 2);
  TUGAS = null;
});

uji("8. laporan regu kedua yang menjadikan tugas padam_dilaporkan melepas alat yang dikerahkan ke tugas itu", async () => {
  const kini = Date.now(), tid = await tugas("Kab Delapan", {lat: -2.6, lon: 112.1}), C = await akun("auditgudang", "Kab Delapan"), gid = id16(), aid = id16();
  await DB.prepare("INSERT INTO gudang (id, akun_id, nama, jenis, prov, kab, lat, lon, dibuat, diubah) VALUES (?, ?, 'Posko Uji', 'posko', '62', 'Kab Delapan', -2.6, 112.1, 1, 1)").bind(gid, C.id).run();
  await DB.prepare("INSERT INTO alat (id, gudang_id, kategori, jumlah, status, dikerahkan_ke_tugas, dibuat, diubah) VALUES (?, ?, 'pompa', 1, 'dikerahkan', ?, 1, 1)").bind(aid, gid, tid).run();
  await DB.prepare("INSERT INTO tugas_lapangan (tugas_id, lapangan_id, jarak_km, status, dibuat, regu_id, dipercaya) VALUES (?, ?, 0.1, 'padam', ?, 'regu-satu', 1)").bind(tid, id16(), kini - JAM).run();
  const l = {id: id16(), prov: "62", kab: "Kab Delapan", lat: -2.6, lon: 112.1, status: "padam", waktu: kini - 1000, regu_id: "regu-dua", dipercaya: true};
  const h = await tautkanLaporanRegu({DB}, l, kini); assert.equal(h.efek, "padam_dilaporkan", JSON.stringify(h));
  const a = await DB.prepare("SELECT status, dikerahkan_ke_tugas FROM alat WHERE id = ?").bind(aid).first(); assert.deepEqual([a.status, a.dikerahkan_ke_tugas], ["siap", null]);
  assert.equal((await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(tid).first()).status, "padam");
});
