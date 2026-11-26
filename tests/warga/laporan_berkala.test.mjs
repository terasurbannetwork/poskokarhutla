/* LB-07 Laporan Berkala (src/laporan_berkala.js, src/hak.js bagian Laporan Berkala, migrasi 0178 dan 0179) di workerd (Miniflare) dengan D1 dan R2 sungguhan.
   Dibuktikan (data/kajian-bnpb/laporan-berkala/RENCANA-UJI.md bagian 4): I1 migrasi dua kali, I1b CHECK, I2/I2b/I3/I9b trigger beku, I4 dan I5 hak (K4, Q22),
   I6 draf bentrok 409, I7 dua Bekukan bersamaan, I8 422 {kurang}, I9 parameter jahat 400, I9c sidik beku, I9d host, I9e cache-control, I11 salinan beku, I12 jejak;
   plus segel jenis 'berkala' (0179) ikut batch Bekukan dan halaman verifikasi menghitung ulang sidiknya.
   Jalankan: node --test tests/warga/laporan_berkala.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import "../../src/worker.js";   // dahulu: impor sirkular
import {siapkan, berantai, sha256, ADMIN} from "./_bnpb.mjs";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

const uji = berantai();
const {DB, mf} = await siapkan("uji-laporan-berkala", {r2: true});
const R2 = await mf.getR2Bucket("MEDIA");
const M = f => readFileSync(path.join(AKAR, "migrations", f), "utf8");
const ASAL = "http://localhost";
const api = async (metode, j, body, h = {}, asal = ASAL) => {
  const r = await mf.dispatchFetch(asal + j, {method: metode, headers: {origin: asal, ...(body !== undefined ? {"content-type": "application/json"} : {}), ...h}, body: body === undefined ? undefined : JSON.stringify(body)});
  const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {}
  return {s: r.status, j: x, t, h: r.headers};
};
const n = async (t, w = "1") => (await DB.prepare(`SELECT count(*) n FROM ${t} WHERE ${w}`).first()).n;

const P = "bulanan", K = "2026-10", Q = `periode=${P}&kode=${K}`;
const ANGKA = JSON.stringify({v: 1, periode: P, kode: K, rentang: ["2026-10-01", "2026-10-31"], sumber: {dibi: {tarik: "2026-11-11", status: "ok"}}, bab1: {alam: {kejadian: 0}}});
const LENGKAP = {pembuka: "Kalimat pembuka uji.", temuan_ringkas: [{pil: "data", judul: "", kalimat: "temuan uji", sumber: "sumber uji"}], dukungan: [{langkah: "langkah uji"}]};
await R2.put(`berkala/${P}/${K}/angka/terbaru.json`, ANGKA);
await R2.put("dalops/banjir.json", JSON.stringify({rahasia: "dalops"}));   // objek lain di bucket bersama: tidak boleh terbaca lewat rute ini

/* staf peran pusdalops dan pemirsa bertab pusdalops (pola tests/warga/pb_papan_sk.test.mjs) */
const tokStaf = "7".repeat(64);
await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
  VALUES (?, 'lbrstaf', 'Staf', '940001', 'Pusdalops', 'lbr@b.id', '628140000001', '["pusdalops"]', '[]', ?, ?, 0, 1, 'tes', 0)`).bind("lb" + "0".repeat(14), "b".repeat(32), "a".repeat(64)).run();
await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tokStaf), "lb" + "0".repeat(14), Date.now() + 3600e3).run();
const STAF = {cookie: "sesi_staf=" + tokStaf};
const buat = await api("POST", "/api/pemirsa/admin/buat", {nama: "Pemirsa Berkala", tab: ["pusdalops"]}, ADMIN, "http://bnpb.lokal");
assert.equal(buat.s, 201, buat.t);
const masuk = await mf.dispatchFetch("https://centurisk97.id/admin/masuk", {method: "POST", redirect: "manual", headers: {"content-type": "application/x-www-form-urlencoded", origin: "https://centurisk97.id"},
  body: new URLSearchParams({email: buat.j.username, sandi: buat.j.sandi}).toString()});
const PEMIRSA = {cookie: masuk.headers.getSetCookie().find(c => c.startsWith("sesi_pemirsa=")).split(";")[0]};

const baris = (periode, kode, versi, kunci) => DB.prepare("INSERT INTO laporan_berkala (periode, kode, versi, isian, angka_kunci, angka_sha256, diubah, oleh) VALUES (?1, ?2, ?3, '{}', ?4, ?5, 1, 'uji')")
  .bind(periode, kode, versi, kunci ?? `berkala/${periode}/${kode}/angka/terbaru.json`, "0".repeat(64)).run();

uji("I1 migrasi 0178 dan 0179 dijalankan dua kali: idempoten, segel dan segel_cabut utuh, FK cabut tetap ke segel", async () => {
  await DB.prepare("INSERT INTO segel (kode, jenis, rujukan, dasar, versi, sidik, judul, periode, penerbit, terbit) VALUES ('CCCCCCCCC1', 'lk', '2026-11-01#0', '2026-11-01', 0, ?1, 'Uji', '2026-11-01', 'BNPB', 1)").bind("c".repeat(64)).run();
  await DB.prepare("INSERT INTO segel_cabut (kode, alasan, oleh, waktu) VALUES ('CCCCCCCCC1', 'alasan uji cabut', 'moderator', 2)").run();
  for (let i = 0; i < 2; i++) await DB.batch(pecah(M("0178_laporan_berkala.sql") + "\n" + M("0179_segel_berkala.sql")).map(s => DB.prepare(s)));
  assert.equal(await n("segel", "kode = 'CCCCCCCCC1'"), 1);
  assert.equal(await n("segel_cabut", "kode = 'CCCCCCCCC1'"), 1);
  await assert.rejects(DB.prepare("INSERT INTO segel_cabut (kode, alasan, oleh, waktu) VALUES ('ZZZZZZZZZ9', 'tanpa induk', 'x', 1)").run(), /FOREIGN KEY/);
  await assert.rejects(DB.prepare("INSERT INTO segel (kode, jenis, rujukan, dasar, versi, sidik, judul, periode, penerbit, terbit) VALUES ('CCCCCCCCC2', 'xx', 'r', 'r', 0, ?1, 'Uji', '2026', 'BNPB', 1)").bind("c".repeat(64)).run(), /CHECK/);
  /* skema SQLite memori sama: indeks segel kembali, salinan terbuang */
  const db = new DatabaseSync(":memory:"); for (const s of pecah(migrasi())) db.exec(s);
  const nama = db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'segel%'").all().map(r => r.name).sort();
  assert.deepEqual(nama, ["segel", "segel_cabut", "segel_dasar", "segel_terbit"]);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_list(segel_cabut)").all().map(r => r.table), ["segel"]);
});

uji("0179 terputus per pernyataan: jalan ulang lolos atau gagal keras 'already exists', isi segel dan cabut utuh", () => {
  const dasar = migrasi().split(M("0179_segel_berkala.sql")).join(""), st = pecah(M("0179_segel_berkala.sql"));
  assert.equal(st.length, 12);
  for (let k = 0; k <= st.length; k++) {
    const db = new DatabaseSync(":memory:"); db.exec("PRAGMA foreign_keys = ON"); for (const x of pecah(dasar)) db.exec(x);
    db.exec(`INSERT INTO segel (kode, jenis, rujukan, dasar, versi, sidik, judul, periode, penerbit, terbit) VALUES ('DDDDDDDDD1', 'lk', '2026-11-02#0', '2026-11-02', 0, '${"d".repeat(64)}', 'Uji', '2026-11-02', 'BNPB', 1)`);
    db.exec("INSERT INTO segel_cabut (kode, alasan, oleh, waktu) VALUES ('DDDDDDDDD1', 'alasan uji cabut', 'moderator', 2)");
    for (const x of st.slice(0, k)) db.exec(x);   // terputus sesudah k pernyataan
    let galat = null; try { for (const x of st) db.exec(x); } catch (e) { galat = e; }
    if (galat) assert.match(String(galat.message), /already exists/, `k=${k}`);
    const ada = t => db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
    const cari = (tabel, ...cad) => [tabel, ...cad].some(t => ada(t) && db.prepare(`SELECT count(*) n FROM ${t} WHERE kode = 'DDDDDDDDD1'`).get().n === 1);
    assert.ok(cari("segel", "segel_cad"), `k=${k}: baris segel hilang`);
    assert.ok(cari("segel_cabut", "segel_cabut_cad"), `k=${k}: baris segel_cabut hilang`);
    if (!galat) assert.ok(!ada("segel_cad") && !ada("segel_cabut_cad") && ada("segel") && ada("segel_cabut"), `k=${k}: jalan ulang sukses meninggalkan salinan`);
  }
});

uji("I1b CHECK menolak bulan 13, tanggal 2026-02-30 dan hari 00, minggu 54, dan angka_kunci periode atau kode lain", async () => {
  for (const [p, k, kunci] of [["bulanan", "2026-13"], ["harian", "2026-02-30"], ["harian", "2026-01-00"], ["harian", "2026-01-32"], ["mingguan", "2026-W54"], ["semesteran", "2026"],
    ["bulanan", "2026-09", "berkala/bulanan/2026-10/angka/terbaru.json"], ["bulanan", "2026-09", "berkala/harian/2026-09/angka/terbaru.json"], ["bulanan", "2026-09", "berkala/bulanan/2026-09/../../dalops"]])
    await assert.rejects(baris(p, k, 0, kunci), /CHECK/, `${p} ${k} ${kunci}`);
  await baris("harian", "2026-02-28", 0);   // pembanding sah
  await DB.prepare("DELETE FROM laporan_berkala WHERE periode = 'harian'").run();
});

uji("I2, I2b, I3, I9b trigger: versi beku tidak bisa diubah, dihapus, ditimpa; draf tidak bisa ganti periode, kode, versi", async () => {
  await baris("tahunan", "2024", 0); await baris("tahunan", "2024", 1);
  await assert.rejects(DB.prepare("UPDATE laporan_berkala SET isian = 'x' WHERE periode = 'tahunan' AND versi = 1").run(), /versi beku tidak bisa diubah/);
  await assert.rejects(DB.prepare("DELETE FROM laporan_berkala WHERE periode = 'tahunan' AND versi = 1").run(), /versi beku tidak bisa dihapus/);
  await assert.rejects(DB.prepare("INSERT OR REPLACE INTO laporan_berkala (periode, kode, versi, isian, angka_kunci, angka_sha256, diubah, oleh) VALUES ('tahunan', '2024', 1, '{}', 'berkala/tahunan/2024/x', ?1, 9, 'jahat')").bind("1".repeat(64)).run(), /ditimpa/);
  await assert.rejects(DB.prepare("UPDATE laporan_berkala SET kode = '2023' WHERE periode = 'tahunan' AND versi = 0").run(), /versi beku tidak bisa diubah/);
  await assert.rejects(DB.prepare("UPDATE laporan_berkala SET versi = 5 WHERE periode = 'tahunan' AND versi = 0").run(), /versi beku tidak bisa diubah/);
  await DB.prepare("UPDATE laporan_berkala SET isian = '{\"a\":1}' WHERE periode = 'tahunan' AND versi = 0").run();   // draf tetap bisa disunting
  await DB.prepare("DELETE FROM laporan_berkala WHERE periode = 'tahunan' AND versi = 0").run();
  assert.equal(await n("laporan_berkala", "periode = 'tahunan' AND versi = 1"), 1);
});

uji("jejak append-only: UPDATE dan DELETE laporan_berkala_jejak ditolak trigger", async () => {
  await DB.prepare("INSERT INTO laporan_berkala_jejak (periode, kode, versi, aksi, oleh, waktu) VALUES ('tahunan', '2024', 1, 'buka', 'uji', 1)").run();
  await assert.rejects(DB.prepare("UPDATE laporan_berkala_jejak SET oleh = 'lain' WHERE periode = 'tahunan'").run(), /jejak laporan berkala tidak boleh diubah/);
  await assert.rejects(DB.prepare("DELETE FROM laporan_berkala_jejak WHERE periode = 'tahunan'").run(), /jejak laporan berkala tidak boleh dihapus/);
  assert.equal(await n("laporan_berkala_jejak", "periode = 'tahunan'"), 1);
});

uji("I4 dan I5 hak: tanpa masuk 403; staf dan pemirsa membaca tanpa kolom oleh, menulis 403; admin menyimpan draf", async () => {
  assert.equal((await api("GET", `/api/laporan-berkala?${Q}`)).s, 403);
  assert.equal((await api("GET", `/api/laporan-berkala/angka?${Q}`)).s, 403);
  assert.equal((await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {}})).s, 403);
  for (const h of [STAF, PEMIRSA]) {
    assert.equal((await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {}}, h)).s, 403);
    assert.equal((await api("POST", "/api/laporan-berkala/bekukan", {periode: P, kode: K, diubah: 1}, h)).s, 403);
  }
  const s = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {pembuka: "awal"}, tarik: "terbaru", diubah: null}, ADMIN);
  assert.equal(s.s, 201, s.t); assert.equal(s.j.versi, 0);
  for (const h of [STAF, PEMIRSA]) {
    const r = await api("GET", `/api/laporan-berkala?${Q}`, undefined, h);
    assert.equal(r.s, 200, r.t); assert.equal(r.j.isian.pembuka, "awal"); assert.equal(r.j.tarik, "terbaru"); assert.ok(!("oleh" in r.j));
    const d = await api("GET", `/api/laporan-berkala?daftar=1&periode=${P}`, undefined, h);
    assert.equal(d.s, 200, d.t); assert.ok(d.j.daftar.length >= 1); assert.ok(d.j.daftar.every(x => !("oleh" in x)));
    const a = await api("GET", `/api/laporan-berkala/angka?${Q}`, undefined, h);
    assert.equal(a.s, 200, a.t); assert.equal(a.t, ANGKA);
  }
  assert.ok("oleh" in (await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN)).j);
});

uji("I6 dua simpan draf dengan diubah sama: yang kedua 409; tanpa diubah ke draf yang ada juga 409", async () => {
  const a = await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN), d = a.j.diubah;
  const r1 = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {pembuka: "satu"}, diubah: d}, ADMIN);
  assert.equal(r1.s, 201, r1.t);
  const r2 = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {pembuka: "dua"}, diubah: d}, ADMIN);
  assert.equal(r2.s, 409);
  assert.equal((await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {pembuka: "tiga"}}, ADMIN)).s, 409);
  assert.equal((await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN)).j.isian.pembuka, "satu");
});

uji("ukuran dan isi: isian di atas 96 KB 413, kunci isian aneh 400, tarik yang belum ada 422", async () => {
  const d = (await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN)).j.diubah;
  const besar = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {a: Array(60).fill("x".repeat(1800))}, diubah: d}, ADMIN);
  assert.equal(besar.s, 413, besar.t);
  assert.equal((await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {"Bukan-Kunci": 1}, diubah: d}, ADMIN)).s, 400);
  const t = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {}, tarik: "2026-11-20", diubah: d}, ADMIN);
  assert.equal(t.s, 422); assert.match(t.j.galat, /belum ada/);
});

uji("Bekukan menolak berkas angka yang berubah sejak draf disimpan (409), tanpa versi beku dan tanpa objek beku", async () => {
  const d = (await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN)).j.diubah;
  const s = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: LENGKAP, diubah: d}, ADMIN); assert.equal(s.s, 201, s.t);
  await R2.put(`berkala/${P}/${K}/angka/terbaru.json`, ANGKA.replace('"kejadian":0', '"kejadian":0,"x":1'));   // rakit.py menimpa terbaru.json
  const b = await api("POST", "/api/laporan-berkala/bekukan", {periode: P, kode: K, diubah: s.j.diubah}, ADMIN);
  assert.equal(b.s, 409); assert.equal(b.j.galat, "Berkas angka berubah sejak draf disimpan. Simpan ulang dulu.");
  assert.equal(await n("laporan_berkala", `periode = '${P}' AND versi > 0`), 0);
  assert.equal(await R2.get(`berkala/${P}/${K}/beku/v1.json`), null);
  await R2.put(`berkala/${P}/${K}/angka/terbaru.json`, ANGKA);
  const u = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {pembuka: "satu"}, diubah: s.j.diubah}, ADMIN); assert.equal(u.s, 201, u.t);
});

uji("objek beku/v<N> asing berisi beda (Bekukan lain sedang jalan): 409 dan objek itu tidak ditimpa", async () => {
  const d = (await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN)).j.diubah;
  const s = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: LENGKAP, diubah: d}, ADMIN); assert.equal(s.s, 201, s.t);
  await R2.put(`berkala/${P}/${K}/beku/v1.json`, "{\"lain\":1}");
  const b = await api("POST", "/api/laporan-berkala/bekukan", {periode: P, kode: K, diubah: s.j.diubah}, ADMIN);
  assert.equal(b.s, 409, b.t);
  assert.equal(await (await R2.get(`berkala/${P}/${K}/beku/v1.json`)).text(), "{\"lain\":1}");
  await R2.delete(`berkala/${P}/${K}/beku/v1.json`);
  const u = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {pembuka: "satu"}, diubah: s.j.diubah}, ADMIN); assert.equal(u.s, 201, u.t);
});

uji("I8 Bekukan dengan isian belum lengkap: 422 dengan daftar kekurangan dari server", async () => {
  const d = (await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN)).j.diubah;
  const r = await api("POST", "/api/laporan-berkala/bekukan", {periode: P, kode: K, diubah: d}, ADMIN);
  assert.equal(r.s, 422, r.t);
  assert.ok(r.j.kurang.includes("Ringkasan Eksekutif: temuan utama"), r.t);
  assert.ok(r.j.kurang.includes("Bab 7.2: dukungan yang dimohon"), r.t);
  assert.equal(await n("laporan_berkala", `periode = '${P}' AND versi > 0`), 0);
});

let SEGEL = null;
uji("I7 dua Bekukan bersamaan: tepat satu versi baru, bersegel, draf dibuang", async () => {
  const d0 = (await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN)).j.diubah;
  const s = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: LENGKAP, diubah: d0}, ADMIN); assert.equal(s.s, 201, s.t);
  const kirim = () => api("POST", "/api/laporan-berkala/bekukan", {periode: P, kode: K, diubah: s.j.diubah}, ADMIN);
  const hasil = await Promise.all([kirim(), kirim()]), st = hasil.map(r => r.s).sort();
  assert.deepEqual(st, [201, 409], hasil.map(r => r.t).join(" | "));
  const menang = hasil.find(r => r.s === 201);
  assert.equal(menang.j.versi, 1); assert.equal(menang.j.angka_sha256, sha256(ANGKA)); assert.match(menang.j.segel, /^[0-9A-HJKMNP-TV-Z]{10}$/);
  SEGEL = menang.j.segel;
  assert.equal(await n("laporan_berkala", `periode = '${P}' AND kode = '${K}' AND versi > 0`), 1);
  assert.equal(await n("laporan_berkala", `periode = '${P}' AND kode = '${K}' AND versi = 0`), 0);
  assert.equal(await n("segel", `jenis = 'berkala' AND rujukan = '${P}/${K}#1' AND dasar = '${P}/${K}' AND periode = '${K}'`), 1);
  assert.equal(await (await R2.get(`berkala/${P}/${K}/beku/v1.json`)).text(), ANGKA);
  const g = await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN);
  assert.equal(g.j.versi, 1); assert.equal(g.j.versi_beku, 1); assert.equal(g.j.tarik, null); assert.deepEqual(g.j.isian, LENGKAP);
});

uji("segel berkala: verifikasi berlaku, judul periode, isian tidak bocor", async () => {
  const v = await api("GET", "/api/verifikasi/" + SEGEL, undefined, {"cf-connecting-ip": "10.9.9.9"});
  assert.equal(v.s, 200, v.t); assert.equal(v.j.status, "berlaku"); assert.equal(v.j.jenis, "berkala"); assert.equal(v.j.judul, "Laporan Bulanan Oktober 2026");
  assert.equal(v.j.sidik12, sha256(sha256(ANGKA) + "\n" + JSON.stringify(LENGKAP)).slice(0, 12));
  assert.ok(!/Kalimat pembuka|temuan uji/.test(v.t), "isian bocor ke halaman verifikasi");
});

uji("I11 sesudah Bekukan berkas angka terbaru dihapus: versi beku tetap terbuka dari salinan beku/v1", async () => {
  await R2.delete(`berkala/${P}/${K}/angka/terbaru.json`);
  const a = await api("GET", `/api/laporan-berkala/angka?${Q}&versi=1`, undefined, STAF);
  assert.equal(a.s, 200, a.t); assert.equal(a.t, ANGKA);
  assert.equal((await api("GET", `/api/laporan-berkala/angka?${Q}`, undefined, STAF)).t, ANGKA);   // tanpa versi = versi beku terakhir (tidak ada draf)
  assert.equal((await api("GET", `/api/laporan-berkala/angka?${Q}&tarik=terbaru`, undefined, STAF)).s, 404);
  await R2.put(`berkala/${P}/${K}/angka/terbaru.json`, ANGKA);
});

uji("draf baru dari versi beku: simpan dengan diubah versi beku membuat draf, Bekukan lagi = versi 2", async () => {
  const g = await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN);
  const s = await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {...LENGKAP, pembuka: "Ralat."}, tarik: "terbaru", diubah: g.j.diubah}, ADMIN);
  assert.equal(s.s, 201, s.t);
  const b = await api("POST", "/api/laporan-berkala/bekukan", {periode: P, kode: K, diubah: s.j.diubah}, ADMIN);
  assert.equal(b.s, 201, b.t); assert.equal(b.j.versi, 2);
  const v = await api("GET", "/api/verifikasi/" + SEGEL, undefined, {"cf-connecting-ip": "10.9.9.8"});
  assert.equal(v.j.status, "lebih_baru");
});

uji("I9c objek beku/v1.json diubah di R2: baca versi 1 gagal dengan pesan sidik, verifikasi Tidak cocok", async () => {
  await R2.put(`berkala/${P}/${K}/beku/v1.json`, ANGKA.replace('"kejadian":0', '"kejadian":7'));
  const a = await api("GET", `/api/laporan-berkala/angka?${Q}&versi=1`, undefined, ADMIN);
  assert.equal(a.s, 500); assert.equal(a.j.galat, "berkas angka versi ini berubah");
  assert.equal((await api("GET", "/api/verifikasi/" + SEGEL, undefined, {"cf-connecting-ip": "10.9.9.7"})).j.status, "tidak_cocok");
  assert.equal((await api("GET", `/api/laporan-berkala/angka?${Q}&versi=2`, undefined, ADMIN)).s, 200);
});

uji("I9 parameter jahat: 400, tidak ada objek di luar berkala/<periode>/<kode>/ yang terbaca", async () => {
  for (const q of [`${Q}&tarik=../../dalops/banjir`, `${Q}&tarik=..%2F..%2Fdalops%2Fbanjir`, "periode=semesteran&kode=2026", "periode=bulanan&kode=2026-1x", "periode=mingguan&kode=2026-W54",
    "periode=mingguan&kode=2025-W53", "periode=harian&kode=2026-02-30", `periode=bulanan&kode=2099-01`, `${Q}&versi=abc`, `${Q}&versi=1&tarik=terbaru`]) {
    const r = await api("GET", `/api/laporan-berkala/angka?${q}`, undefined, ADMIN);
    assert.equal(r.s, 400, q); assert.ok(!/dalops/.test(r.t), q);
  }
  assert.equal((await api("GET", `/api/laporan-berkala?daftar=1&periode=semesteran`, undefined, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/laporan-berkala", {periode: P, kode: K, isian: {}, tarik: "../x"}, ADMIN)).s, 400);
});

uji("I9d host selain Centurisk97 dan localhost: 404", async () => {
  assert.equal((await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN, "http://contoh.lain")).s, 404);
  assert.equal((await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN, "https://centurisk97.id")).s, 200);
});

uji("I9e jawaban rute private, no-store, termasuk galat dan angka", async () => {
  for (const r of [await api("GET", `/api/laporan-berkala?${Q}`, undefined, ADMIN), await api("GET", `/api/laporan-berkala/angka?${Q}`, undefined, ADMIN),
    await api("GET", `/api/laporan-berkala?${Q}`), await api("GET", "/api/laporan-berkala/angka?periode=x&kode=1", undefined, ADMIN),
    await api("POST", "/api/laporan-berkala/cetak", {periode: P, kode: K, versi: 2}, ADMIN)])
    assert.equal(r.h.get("cache-control"), "private, no-store");
});

uji("I12 buka, simpan, bekukan, cetak: tiap aksi satu baris jejak", async () => {
  const kode = "2026-09", q = `periode=${P}&kode=${kode}`, j = aksi => n("laporan_berkala_jejak", `periode = '${P}' AND kode = '${kode}' AND aksi = '${aksi}'`);
  await R2.put(`berkala/${P}/${kode}/angka/terbaru.json`, ANGKA.replace(/2026-10/g, kode));
  const s = await api("POST", "/api/laporan-berkala", {periode: P, kode, isian: LENGKAP}, ADMIN); assert.equal(s.s, 201, s.t);
  assert.equal(await j("simpan"), 1);
  assert.equal((await api("GET", `/api/laporan-berkala?${q}`, undefined, STAF)).s, 200);
  assert.equal(await j("buka"), 1);
  assert.equal((await api("POST", "/api/laporan-berkala/bekukan", {periode: P, kode, diubah: s.j.diubah}, ADMIN)).s, 201);
  assert.equal(await j("bekukan"), 1);
  const c = await api("POST", "/api/laporan-berkala/cetak", {periode: P, kode, versi: 1}, PEMIRSA);
  assert.equal(c.s, 201, c.t);
  assert.equal(await j("cetak"), 1);
  assert.equal((await api("POST", "/api/laporan-berkala/cetak", {periode: P, kode, versi: 9}, ADMIN)).s, 404);
  assert.equal(await j("cetak"), 1);
});

uji("jejak buka dibatasi 600 per jam per pelaku: lewat batas data tetap 200, jejak tidak bertambah", async () => {
  const kode = "2026-09", q = `periode=${P}&kode=${kode}`, j = () => n("laporan_berkala_jejak", `periode = '${P}' AND kode = '${kode}' AND aksi = 'buka'`);
  const oleh = "staf:lb" + "0".repeat(14), sebelum = await j();
  await DB.batch(Array.from({length: 600}, (_, i) => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?1, 'berkala.buka', ?2)").bind(oleh, Date.now() - i)));
  const r = await api("GET", `/api/laporan-berkala?${q}`, undefined, STAF);
  assert.equal(r.s, 200, r.t); assert.equal(r.j.versi, 1);
  assert.equal(await j(), sebelum);
  assert.equal((await api("GET", `/api/laporan-berkala?${q}`, undefined, ADMIN)).s, 200);
  assert.equal(await j(), sebelum + 1);   // pelaku lain tetap tercatat
});

uji("kode tayang sebelum migrasi: tanpa 0178 = 503, tanpa 0179 Bekukan = 503 tanpa versi beku setengah jadi", async () => {
  const A = await siapkan("uji-laporan-berkala-tanpa0178", {r2: true, sampai: "0178_"});
  const r = await A.mf.dispatchFetch(`${ASAL}/api/laporan-berkala?${Q}`, {headers: ADMIN});
  assert.equal(r.status, 503); assert.doesNotMatch(await r.text(), /laporan_berkala|0178/);
  const B = await siapkan("uji-laporan-berkala-tanpa0179", {r2: true, sampai: "0179_"}), R = await B.mf.getR2Bucket("MEDIA");
  await R.put(`berkala/${P}/${K}/angka/terbaru.json`, ANGKA);
  const kirim = async (j, b) => { const x = await B.mf.dispatchFetch(ASAL + j, {method: "POST", headers: {...ADMIN, origin: ASAL, "content-type": "application/json"}, body: JSON.stringify(b)}); return {s: x.status, j: await x.json()}; };
  const s = await kirim("/api/laporan-berkala", {periode: P, kode: K, isian: LENGKAP}); assert.equal(s.s, 201);
  const b = await kirim("/api/laporan-berkala/bekukan", {periode: P, kode: K, diubah: s.j.diubah});
  assert.equal(b.s, 503, JSON.stringify(b.j));
  assert.equal((await B.DB.prepare("SELECT count(*) n FROM laporan_berkala WHERE versi > 0").first()).n, 0);
  assert.equal((await B.DB.prepare("SELECT count(*) n FROM laporan_berkala WHERE versi = 0").first()).n, 1);
});

/* ---------------------------------------------------------------- LB-08 foto dokumentasi (Q7, RENCANA-UJI I10) */
const seg = (m, isi) => [0xff, m, (isi.length + 2) >> 8, (isi.length + 2) & 255, ...isi];
const huruf = t => [...new TextEncoder().encode(t)];
const jpeg = (n, ekstra = []) => new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...huruf("JFIF"), 0, 1, 1, 0, 0, 0, 0, 1, 0, 0]), ...ekstra,
  ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]), ...Array(40).fill(n), 0xff, 0xd9]);
const unggah = async (periode, kode, b, {kredit = "Dok. BNPB", media, izin, h = ADMIN} = {}) => {
  const q = new URLSearchParams({periode, kode, ...(kredit != null ? {kredit} : {}), ...(media ? {media: "1"} : {}), ...(izin ? {izin: "1"} : {})});
  const r = await mf.dispatchFetch(`${ASAL}/api/laporan-berkala/foto?${q}`, {method: "POST", headers: {origin: ASAL, "content-type": "image/jpeg", ...h}, body: b});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t, h: r.headers};
};
const isiR2 = async k => { const o = await R2.get(k); return o ? new Uint8Array(await o.arrayBuffer()) : null; };
const jmlFoto = async (p, k) => (await R2.list({prefix: `berkala/${p}/${k}/foto/`})).objects.length;

uji("I10 unggah foto: teks bernama .jpg, JPEG ber-APP1 Exif, PNG ditolak; EXIF/IPTC tidak tersimpan", async () => {
  const k = "2026-08";
  const teksJpg = new TextEncoder().encode("ini teks biasa bernama foto.jpg");
  const exif = jpeg(3, seg(0xe1, [...huruf("Exif"), 0, 0, ...huruf("MM"), 0, 42, ...huruf("GPS-RAHASIA")]));
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(40).fill(0)]);
  for (const b of [teksJpg, exif, png]) assert.equal((await unggah(P, k, b)).s, 400);
  assert.equal(await jmlFoto(P, k), 0);
  /* IPTC (APP13) dan XMP (APP1 non-Exif) lolos pemeriksa Exif tetapi dibuang bersihMedia sebelum disimpan */
  const ber = jpeg(4, [...seg(0xed, huruf("Photoshop 3.0 IPTC-RAHASIA")), ...seg(0xe1, huruf("http://ns.adobe.com/xap/1.0/ XMP-RAHASIA"))]);
  const r = await unggah(P, k, ber); assert.equal(r.s, 201, r.t);
  assert.equal(r.h.get("cache-control"), "private, no-store");
  const simpan = await isiR2(`berkala/${P}/${k}/foto/${r.j.id}.jpg`);
  assert.ok(simpan); assert.equal(sha256(simpan), r.j.id);
  assert.ok(!/RAHASIA|Exif/.test(new TextDecoder("latin1").decode(simpan)), "metadata ikut tersimpan");
  assert.equal(await n("laporan_berkala_jejak", `periode = '${P}' AND kode = '${k}' AND aksi = 'foto'`), 1);
  const g = await mf.dispatchFetch(`${ASAL}/api/laporan-berkala/foto?periode=${P}&kode=${k}&id=${r.j.id}`, {headers: STAF});
  assert.equal(g.status, 200); assert.equal(g.headers.get("content-type"), "image/jpeg"); assert.equal(g.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(new Uint8Array(await g.arrayBuffer()), simpan);
});

uji("LB-08 kredit dan izin: kredit kosong ditolak, foto media tanpa centang izin ditolak, harian tanpa foto, pemirsa dan staf tidak bisa unggah, batas jumlah", async () => {
  const k = "2026-06";
  assert.equal((await unggah(P, k, jpeg(5), {kredit: "  "})).s, 400);
  assert.equal((await unggah(P, k, jpeg(5), {kredit: null})).s, 400);
  assert.equal((await unggah(P, k, jpeg(5), {kredit: "Kompas", media: true})).s, 400);
  assert.equal((await unggah("harian", "2026-10-01", jpeg(5))).s, 400);
  assert.equal((await unggah(P, k, jpeg(5), {h: PEMIRSA})).s, 403);
  assert.equal((await unggah(P, k, jpeg(5), {h: STAF})).s, 403);
  assert.equal((await unggah(P, k, jpeg(5), {h: {}})).s, 403);
  assert.equal(await jmlFoto(P, k), 0);
  assert.equal((await unggah(P, k, jpeg(5), {kredit: "Kompas", media: true, izin: true})).s, 201);
  /* mingguan paling banyak 4 (PRD); unggah ulang foto yang sama tidak menambah */
  const m = "2026-W40";
  for (let i = 0; i < 4; i++) assert.equal((await unggah("mingguan", m, jpeg(10 + i))).s, 201);
  assert.equal((await unggah("mingguan", m, jpeg(10))).s, 201);
  assert.equal((await unggah("mingguan", m, jpeg(20))).s, 409);
  assert.equal(await jmlFoto("mingguan", m), 4);
  /* draf dengan foto media tanpa izin: simpan boleh, Bekukan 422 menyebutnya (ALGORITMA 10) */
  await R2.put(`berkala/${P}/${k}/angka/terbaru.json`, ANGKA.replace(/2026-10/g, k));
  const id = sha256(jpeg(5));
  const s = await api("POST", "/api/laporan-berkala", {periode: P, kode: k, isian: {...LENGKAP, foto: [{bab: "bab2", id, ket: "Uji", kredit: "Kompas", media: true}]}}, ADMIN);
  assert.equal(s.s, 201, s.t);
  const b = await api("POST", "/api/laporan-berkala/bekukan", {periode: P, kode: k, diubah: s.j.diubah}, ADMIN);
  assert.equal(b.s, 422); assert.ok(b.j.kurang.includes("Dokumentasi: foto media tanpa tanda izin"), b.t);
  assert.equal((await api("POST", "/api/laporan-berkala", {periode: P, kode: k, isian: {...LENGKAP, foto: [{bab: "bab2", id: "../x"}]}, diubah: s.j.diubah}, ADMIN)).s, 400);
});

uji("LB-08 foto beku tetap terbaca walau foto draf dihapus; foto belum terunggah 422; sidik beku dicek", async () => {
  const k = "2026-07", q = `periode=${P}&kode=${k}`, f = jpeg(30), id = sha256(f);
  await R2.put(`berkala/${P}/${k}/angka/terbaru.json`, ANGKA.replace(/2026-10/g, k));
  const hilang = "e".repeat(64);
  const s0 = await api("POST", "/api/laporan-berkala", {periode: P, kode: k, isian: {...LENGKAP, foto: [{bab: "bab2", id: hilang, ket: "Belum", kredit: "Dok. BNPB"}]}}, ADMIN);
  const b0 = await api("POST", "/api/laporan-berkala/bekukan", {periode: P, kode: k, diubah: s0.j.diubah}, ADMIN);
  assert.equal(b0.s, 422); assert.ok(b0.j.kurang.some(x => /belum terunggah/.test(x)), b0.t);
  assert.equal((await unggah(P, k, f)).j.id, id);
  const s = await api("POST", "/api/laporan-berkala", {periode: P, kode: k, isian: {...LENGKAP, foto: [{bab: "bab2", id, ket: "Posko", kredit: "Dok. BNPB"}]}, diubah: s0.j.diubah}, ADMIN);
  assert.equal(s.s, 201, s.t);
  const b = await api("POST", "/api/laporan-berkala/bekukan", {periode: P, kode: k, diubah: s.j.diubah}, ADMIN);
  assert.equal(b.s, 201, b.t);
  assert.deepEqual(await isiR2(`berkala/${P}/${k}/beku/v1/foto/${id}.jpg`), f);
  const h = await api("POST", "/api/laporan-berkala/foto/hapus", {periode: P, kode: k, id}, ADMIN); assert.equal(h.s, 200, h.t);
  assert.equal((await api("POST", "/api/laporan-berkala/foto/hapus", {periode: P, kode: k, id}, PEMIRSA)).s, 403);
  assert.equal(await isiR2(`berkala/${P}/${k}/foto/${id}.jpg`), null);
  for (const [qq, hh] of [[`${q}&id=${id}&versi=1`, STAF], [`${q}&id=${id}&versi=1`, PEMIRSA], [`${q}&id=${id}`, ADMIN]]) {
    const g = await mf.dispatchFetch(`${ASAL}/api/laporan-berkala/foto?${qq}`, {headers: hh});
    assert.equal(g.status, 200, qq); assert.deepEqual(new Uint8Array(await g.arrayBuffer()), f);
  }
  for (const qq of [`${q}&id=../../dalops`, `${q}&id=${id}&versi=x`, `periode=bulanan&kode=2099-01&id=${id}`])
    assert.equal((await api("GET", `/api/laporan-berkala/foto?${qq}`, undefined, ADMIN)).s, 400, qq);
  assert.equal((await api("GET", `/api/laporan-berkala/foto?${q}&id=${id}&versi=1`)).s, 403);
  assert.equal((await api("GET", `/api/laporan-berkala/foto?${q}&id=${hilang}&versi=1`, undefined, ADMIN)).s, 404);
  /* objek beku diubah di R2: dibaca 500, tidak dijawab isi palsunya */
  await R2.put(`berkala/${P}/${k}/beku/v1/foto/${id}.jpg`, jpeg(31));
  const t = await api("GET", `/api/laporan-berkala/foto?${q}&id=${id}&versi=1`, undefined, ADMIN);
  assert.equal(t.s, 500); assert.equal(t.j.galat, "foto versi ini berubah");
});
