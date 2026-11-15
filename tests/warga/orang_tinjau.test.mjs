/* Layar tinjau pasangan KP-23 (src/orang_tinjau.js, migrasi 0138 + 0139) di workerd (Miniflare) dengan D1 sungguhan. Jalankan: node --test tests/warga/orang_tinjau.test.mjs */
import assert from "node:assert/strict";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {siapkan, berantai, ADMIN, GERBANG, MOD2} from "./_bnpb.mjs";

const uji = berantai(), {DB, api, adm, n} = await siapkan("uji-orang-tinjau");
const hex = c => c.repeat(16), NIP_O = "198001012005011001", WA_O = "6281200000001";
const orang = (id, nip, wa, unit, jabatan) => DB.prepare("INSERT INTO orang (id, jenis, nama, nip, wa, unit, jabatan, dibuat, diubah) VALUES (?, 'pegawai', ?, ?, ?, ?, ?, 1, 1)").bind(id, "Nama " + id.slice(0, 2), nip, wa, unit, jabatan).run();
const tinjau = (id, akun, kand, alasan = "bentrok") => DB.prepare("INSERT INTO orang_tinjau (id, akun_tabel, akun_id, kandidat, alasan, dibuat) VALUES (?, 'staf', ?, ?, ?, ?)").bind(id, akun, JSON.stringify(kand), alasan, Date.now()).run();
let akunId;

uji("KP-23 tanpa admin: tamu dan akun gerbang situs ditolak di GET dan POST", async () => {
  for (const h of [{}, GERBANG, MOD2]) {   // moderator biasa juga 403: Super Admin saja
    assert.equal((await api("GET", "/api/orang/tinjau", undefined, h)).s, 403);
    assert.equal((await api("POST", "/api/orang/tinjau", {id: hex("t"), keputusan: "tolak"}, h)).s, 403);
  }
});

uji("KP-23 daftar hanya memuat data tersamar", async () => {
  const b = await adm("POST", "/api/staf/admin/buat", {nama: "Akun Uji", nip: "197901012005011009", unit: "Pusdalops BNPB", email: "uji1@bnpb.go.id", wa: "081234567789", peran: ["pusdalops"], wilayah: []}); assert.equal(b.s, 201, b.t);
  akunId = (await DB.prepare("SELECT id FROM staf WHERE email = 'uji1@bnpb.go.id'").first()).id;
  await orang(hex("a"), NIP_O, WA_O, "Pusdalops", "Analis"); await orang(hex("b"), "198502022010012002", "6281200000002", "Pusdatin", "Operator");
  await tinjau(hex("t"), akunId, [hex("a"), hex("b")]);
  const g = await adm("GET", "/api/orang/tinjau"); assert.equal(g.s, 200, g.t);
  assert.equal(g.j.total, 1); const r = g.j.tinjau[0];
  assert.deepEqual([r.akun_tabel, r.akun_id, r.alasan], ["staf", akunId, "bentrok"]);
  assert.equal(r.akun.wa, "6281*****789"); assert.equal(r.akun.nip, "**************1009");
  assert.deepEqual(r.kandidat.map(o => [o.id, o.unit, o.jabatan]), [[hex("a"), "Pusdalops", "Analis"], [hex("b"), "Pusdatin", "Operator"]]);
  for (const bocor of [NIP_O, WA_O, "081234567789", "6281234567789", "197901012005011009", "Nama "]) assert.ok(!g.t.includes(bocor), `bocor: ${bocor}`);
  assert.ok(!/"nama"/.test(g.t));
});

uji("KP-23 pasang menulis orang_akun, menutup baris, dan mencatat jejak", async () => {
  assert.equal((await adm("POST", "/api/orang/tinjau", {id: hex("t"), keputusan: "pasang", orang_id: hex("z")})).s, 400, "bukan kandidat");
  assert.equal((await adm("POST", "/api/orang/tinjau", {id: hex("t"), keputusan: "pasang"})).s, 400, "tanpa orang_id");
  assert.equal(await n("orang_akun"), 0);
  const p = await adm("POST", "/api/orang/tinjau", {id: hex("t"), keputusan: "pasang", orang_id: hex("b")}); assert.equal(p.s, 200, p.t);
  const oa = await DB.prepare("SELECT tabel, akun_id, orang_id, cara FROM orang_akun").first();
  assert.deepEqual({...oa}, {tabel: "staf", akun_id: akunId, orang_id: hex("b"), cara: "admin"});
  const t = await DB.prepare("SELECT keputusan, diputus, pemutus FROM orang_tinjau WHERE id = ?").bind(hex("t")).first();
  assert.equal(t.keputusan, "pasang"); assert.ok(t.diputus > 0); assert.match(t.pemutus, /^admin:[0-9a-f]{12}$/);
  assert.equal(await n("pantau_jejak", `obyek = 'orang_tinjau:${hex("t")}' AND aksi = 'pasang' AND ke = '${hex("b")}'`), 1);
  assert.equal((await adm("GET", "/api/orang/tinjau")).j.total, 0, "baris yang diputus keluar dari antrean");
});

uji("KP-23 keputusan ganda ditolak 409 dan tidak mengubah apa pun", async () => {
  assert.equal((await adm("POST", "/api/orang/tinjau", {id: hex("t"), keputusan: "tolak"})).s, 409);
  assert.equal((await adm("POST", "/api/orang/tinjau", {id: hex("t"), keputusan: "pasang", orang_id: hex("a")})).s, 409);
  assert.equal(await n("orang_akun"), 1); assert.equal(await n("pantau_jejak", "aksi IN ('pasang', 'tolak')"), 1);
  assert.equal((await adm("POST", "/api/orang/tinjau", {id: hex("q"), keputusan: "tolak"})).s, 404);
});

uji("KP-23 tolak menutup tanpa memasangkan; masukan tak sah ditolak", async () => {
  await tinjau(hex("u"), hex("9"), [hex("a")], "nip_tidak_baku");
  assert.equal((await adm("POST", "/api/orang/tinjau", {id: hex("u"), keputusan: "tolak", orang_id: hex("a")})).s, 400);
  assert.equal((await adm("POST", "/api/orang/tinjau", {id: hex("u"), keputusan: "mungkin"})).s, 400);
  assert.equal((await adm("POST", "/api/orang/tinjau", {id: "pendek", keputusan: "tolak"})).s, 400);
  assert.equal((await adm("POST", "/api/orang/tinjau", {id: hex("u"), keputusan: "tolak", ekstra: 1})).s, 400);
  const r = await adm("POST", "/api/orang/tinjau", {id: hex("u"), keputusan: "tolak"}); assert.equal(r.s, 200, r.t);
  assert.equal((await DB.prepare("SELECT keputusan FROM orang_tinjau WHERE id = ?").bind(hex("u")).first()).keputusan, "tolak");
  assert.equal(await n("orang_akun"), 1, "tidak ada pasangan baru"); assert.equal(await n("pantau_jejak", "aksi = 'tolak'"), 1);
});

uji("KP-23 antrean 60 baris terbagi dua halaman", async () => {
  for (let i = 0; i < 60; i++) await tinjau(`x${String(i).padStart(15, "0")}`, `y${String(i).padStart(15, "0")}`, [], "nip_tidak_baku");
  const a = await adm("GET", "/api/orang/tinjau"); assert.equal(a.j.total, 60); assert.equal(a.j.tinjau.length, 50); assert.equal(a.j.berikut, 50);
  assert.equal(a.j.tinjau[0].akun, null, "akun tak ada di tabel: tetap ditampilkan tanpa data");
  const b = await adm("GET", "/api/orang/tinjau?dari=50"); assert.equal(b.j.tinjau.length, 10); assert.equal(b.j.berikut, null);
});

uji("KP-23 akun yang sudah berpasangan: 409 dan baris tinjau tetap terbuka; kalah balapan tidak menulis orang_akun", async () => {
  const ak = hex("8"); await tinjau(hex("v"), ak, [hex("a")]);
  await DB.prepare("INSERT INTO orang_akun (tabel, akun_id, orang_id, cara, dibuat) VALUES ('staf', ?, ?, 'nip', 1)").bind(ak, hex("b")).run();   // sudah berpasangan ke b
  const r = await adm("POST", "/api/orang/tinjau", {id: hex("v"), keputusan: "pasang", orang_id: hex("a")}); assert.equal(r.s, 409, r.t);
  assert.equal((await DB.prepare("SELECT keputusan FROM orang_tinjau WHERE id = ?").bind(hex("v")).first()).keputusan, null);
  assert.equal((await DB.prepare("SELECT orang_id FROM orang_akun WHERE akun_id = ?").bind(ak).first()).orang_id, hex("b"));
  // baris diputus sebelum batch jalan (sama dengan kalah balapan): tidak ada orang_akun dan jejak baru
  await DB.prepare("UPDATE orang_tinjau SET keputusan = 'tolak', diputus = 1, pemutus = 'lain' WHERE id = ?").bind(hex("v")).run();
  const jej = await n("pantau_jejak");
  assert.equal((await adm("POST", "/api/orang/tinjau", {id: hex("v"), keputusan: "pasang", orang_id: hex("a")})).s, 409);
  assert.equal(await n("orang_akun"), 2); assert.equal(await n("pantau_jejak"), jej);
});

uji("KP-23 penyamaran nilai pendek menutup seluruhnya", async () => {
  const {samarWa, samarNip} = await import("../../src/orang_tinjau.js");
  assert.equal(samarWa("62812"), "*****"); assert.equal(samarNip("12345678"), "********"); assert.equal(samarWa("6281234567789"), "6281*****789");
});
