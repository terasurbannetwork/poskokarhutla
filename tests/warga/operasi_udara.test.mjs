/* Operasi Lapangan OP-1 (src/operasi_udara.js, migrations/0103_operasi_lapangan.sql) di workerd (Miniflare) dengan D1 sungguhan, migrasi apa adanya.
   Dibuktikan: migrasi idempoten, seed 9 base dan 55 armada, CHECK/UNIQUE menahan, hak peta (tamu, akun gerbang, peran lain ditolak; staf berperan dan moderator boleh),
   staf nyata tanpa dummy, dummy hanya Super Admin dan hapus tidak menyentuh baris nyata, tanggal ketat, 503 tanpa 0103.
   Jalankan: node --test tests/warga/operasi_udara.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)

const PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
const uji = berantai();
const U = await siapkan("uji-operasi");
const {DB, api, n} = U;
let ipN = 0, nipN = 0;
const bikin = async (nama, peran) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19960${++nipN}0012005`, unit: "Pusdalops BNPB", email: `op${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `192.0.2.${++ipN}`}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie}, hp: {cookie, ...PB}};
};
const peta = (h, q = "?tanggal=2026-11-02") => api("GET", "/api/operasi/peta" + q, undefined, h);
const dummy = (h, aksi) => api("POST", "/api/operasi/dummy", {aksi}, h);
const sisip = (t, o) => { const k = Object.keys(o); return DB.prepare(`INSERT INTO ${t} (${k.join(", ")}) VALUES (${k.map(() => "?").join(", ")})`).bind(...Object.values(o)).run(); };

uji("migrasi 0103 idempoten; seed 9 base dan 55 armada; CHECK dan UNIQUE menahan", async () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0103_operasi_lapangan.sql"), "utf8");
  for (const s of pecah(sql)) await DB.prepare(s).run();   // diulang di atas skema yang sudah ada
  assert.equal(await n("op_base"), 9); assert.equal(await n("op_armada"), 55); assert.equal(await n("op_armada", "dummy = 0"), 55);
  assert.equal(await n("op_armada", "peran = 'omc'"), 13); assert.equal(await n("op_armada", "bucket_liter = 4000"), 2);
  const pnk = await DB.prepare("SELECT * FROM op_base WHERE id = 'PNK'").first(); assert.deepEqual([pnk.icao, pnk.prov, pnk.vor_kode, pnk.lat], ["WIOO", "61", "PNK", -0.152258]);
  assert.equal((await DB.prepare("SELECT vor_kode FROM op_base WHERE id = 'KTG'").first()).vor_kode, null);
  assert.equal(await n("op_armada", "base_id NOT IN (SELECT id FROM op_base)"), 0, "tiap armada menunjuk base yang ada");
  const arm = {registrasi: "PK-UJI", tipe: "X", peran: "wb", pemilik: "bnpb_sewa"};
  await sisip("op_armada", arm);
  for (const [nama, o] of [["peran liar", {peran: "tempur"}], ["pemilik liar", {pemilik: "swasta"}], ["dummy 2", {dummy: 2}]]) await assert.rejects(sisip("op_armada", {...arm, registrasi: "PK-UJ2", ...o}), nama);
  await assert.rejects(sisip("op_base", {id: "XXX", nama: "x", prov: "61", lat: 40, lon: 109}), "lat di luar Indonesia");
  await assert.rejects(sisip("op_armada_status", {tanggal: "2026-11-02", registrasi: "PK-UJI", status: "terbang"}), "status liar");
  await assert.rejects(sisip("op_armada_status", {tanggal: "2/11/2026", registrasi: "PK-UJI", status: "siap"}), "tanggal rusak");
  await sisip("op_armada_status", {tanggal: "2026-11-02", registrasi: "PK-UJI", status: "siap"});
  await assert.rejects(sisip("op_armada_status", {tanggal: "2026-11-02", registrasi: "PK-UJI", status: "siaga"}), "PK tanggal+registrasi");
  const t = {tanggal: "2026-10-01", registrasi: "PK-UJI", lat: -1, lon: 110, status: "fs"};
  await sisip("op_temuan", t);
  await assert.rejects(sisip("op_temuan", t), /UNIQUE/i, "pesan pelaksanaan tidak menggandakan");
  await assert.rejects(sisip("op_temuan", {...t, lat: -2, status: "api"}), "status temuan liar");
  await assert.rejects(sisip("op_temuan", {...t, lat: 30}), "lat di luar Indonesia");
  await assert.rejects(sisip("op_gerak", {tanggal: "2026-10-01", registrasi: "PK-UJI", jenis: "mendarat"}), "jenis gerak liar");
  await assert.rejects(sisip("op_renlap", {id: "r1", tanggal: "2026-10-01", versi: "siang", base_id: "PNK", dibuat: 1}), "versi liar");
  await assert.rejects(sisip("op_renlap", {id: "r1", tanggal: "2026-10-01", versi: "malam", base_id: "PNK", dibuat: 1, isi_json: "{bukan"}), "isi_json harus JSON");
  await assert.rejects(sisip("op_target", {id: "t1", renlap_id: "tidak-ada", urut: 1, jenis: "patroli", lat: -1, lon: 110}), /FOREIGN KEY/i);
  await DB.prepare("DELETE FROM op_temuan WHERE registrasi = 'PK-UJI'").run(); await DB.prepare("DELETE FROM op_armada_status").run(); await DB.prepare("DELETE FROM op_armada WHERE registrasi = 'PK-UJI'").run();
});

let tmc, pimpinan, tanpaPeran;
uji("GET /api/operasi/peta: tamu dan staf tanpa peran ditolak sebelum validasi; staf berperan, moderator, dan akun centurisk97 (gerbang) 200; tanggal ketat", async () => {
  tmc = await bikin("Staf Udara", ["udara"]); pimpinan = await bikin("Pimpinan Op", ["pimpinan"]); tanpaPeran = await bikin("Kemitraan Op", ["kemitraan"]);
  for (const [nama, h] of [["tamu", {}], ["staf peran lain", tanpaPeran.h]]) {
    assert.equal((await peta(h)).s, 403, nama);
    assert.equal((await peta(h, "?tanggal=bukan")).s, 403, `${nama}: auth sebelum validasi param`);
  }
  assert.equal((await peta({cookie: tmc.h.cookie, origin: "x"}, "")).s, 200, "GET tidak butuh x-pb");
  for (const h of [tmc.h, pimpinan.h, MOD2, ADMIN, GERBANG]) { const r = await peta(h); assert.equal(r.s, 200, r.t); assert.equal(r.j.tanggal, "2026-11-02"); assert.equal(r.j.base.length, 9); assert.equal(r.j.armada.length, 55); }
  assert.match(r2(await peta(tmc.h, "")).tanggal, /^\d{4}-\d\d-\d\d$/, "bawaan hari ini WIB");
  for (const q of ["?tanggal=2026-02-30", "?tanggal=2026-13-01", "?tanggal=20261102", "?tanggal=", "?tanggal=2026-11-02'--"]) assert.equal((await peta(tmc.h, q)).s, 400, q);
  const tb = r2(await peta(tmc.h)).armada.filter(a => a.base_id === null).map(a => a.registrasi).sort(); assert.deepEqual(tb, ["N61AA", "PK-SCH"], "armada tanpa base tetap keluar di peta");
  assert.equal((await peta(tmc.h)).h.get("cache-control"), "no-store", "respons per pengguna tidak di-cache");
});
const r2 = r => { assert.equal(r.s, 200); return r.j; };

uji("armada membawa status hari itu; renlap membawa target; baris nyata terlihat staf", async () => {
  await sisip("op_armada_status", {tanggal: "2026-11-03", registrasi: "H-3217", status: "siaga", alasan: "cuaca", sumber: "uji"});
  await sisip("op_renlap", {id: "rl1", tanggal: "2026-11-03", versi: "malam", base_id: "PNK", dibuat: 1, isi_json: '{"a":1}'});
  await sisip("op_target", {id: "tg1", renlap_id: "rl1", urut: 1, jenis: "patroli", lat: -0.1, lon: 109.5, skor: 0.8, alasan_json: '["fs"]'});
  const j = r2(await peta(tmc.h, "?tanggal=2026-11-03"));
  const a = j.armada.find(x => x.registrasi === "H-3217"); assert.deepEqual([a.status, a.alasan], ["siaga", "cuaca"]);
  assert.equal(j.armada.find(x => x.registrasi === "PK-FPA").status, null);
  assert.deepEqual([j.renlap.length, j.renlap[0].isi, j.renlap[0].target.length, j.renlap[0].target[0].alasan], [1, {a: 1}, 1, ["fs"]]);
  assert.equal(r2(await peta(tmc.h, "?tanggal=2026-11-02")).renlap.length, 0, "tanggal lain kosong");
  await sisip("op_temuan", {tanggal: "2026-11-02", registrasi: "PK-NYATA", lat: -1, lon: 110, status: "clear"});
  assert.equal(r2(await peta(tmc.h)).temuan.length, 1);
});

uji("dummy: hanya Super Admin; isi 14 temuan dan 4 gerak; staf nyata tidak melihatnya, admin melihat; hapus hanya baris dummy", async () => {
  for (const [nama, h] of [["moderator biasa", MOD2], ["akun gerbang", GERBANG], ["staf", tmc.hp], ["tamu", {}]]) assert.equal((await dummy(h, "isi")).s, 403, nama);
  assert.equal((await dummy(ADMIN, "bakar")).s, 400);
  const r = await dummy(ADMIN, "isi"); assert.equal(r.s, 201, r.t); assert.deepEqual([r.j.temuan, r.j.gerak], [14, 4]);
  assert.equal((await dummy(ADMIN, "isi")).s, 409, "dua kali ditolak");
  assert.equal(await n("op_temuan", "dummy = 1"), 14);
  const u = r2(await peta(tmc.h)); assert.deepEqual([u.temuan.length, u.gerak.length], [1, 0], "staf nyata tanpa dummy");
  const ad = r2(await peta(ADMIN)); assert.deepEqual([ad.temuan.length, ad.gerak.length], [15, 4]);
  assert.equal(ad.temuan.find(t => t.lokasi === "Air Hitam Besar").umur_klaim_hari, 22);
  assert.equal(ad.gerak.find(g => g.registrasi === "VH-L6T").jam_utc, Date.parse("2026-11-02T02:05:00Z"));
  assert.ok(!JSON.stringify(ad).match(/kru|pic\b/i), "tanpa nama kru");
  assert.equal((await dummy(MOD2, "hapus")).s, 403);
  const h = await dummy(ADMIN, "hapus"); assert.equal(h.s, 200); assert.deepEqual([h.j.temuan, h.j.gerak], [14, 4]);
  assert.equal(await n("op_temuan", "dummy = 1"), 0); assert.equal(await n("op_temuan", "dummy = 0"), 1, "baris nyata tidak tersentuh"); assert.equal(await n("op_armada"), 55);
  assert.equal((await dummy(ADMIN, "isi")).s, 201, "isi lagi sesudah hapus"); await dummy(ADMIN, "hapus");
});

uji("503 sopan bila 0103 belum diterapkan; auth tetap lebih dulu", async () => {
  const V = await siapkan("uji-operasi-503");
  for (const t of ["op_target", "op_renlap", "op_temuan", "op_gerak", "op_armada_status", "op_armada", "op_base"]) await V.DB.prepare(`DROP TABLE ${t}`).run();
  for (const [met, j, b] of [["GET", "/api/operasi/peta?tanggal=2026-11-02"], ["POST", "/api/operasi/dummy", {aksi: "isi"}], ["POST", "/api/operasi/dummy", {aksi: "hapus"}]]) {
    const r = await V.api(met, j, b, ADMIN); assert.equal(r.s, 503, `${met} ${j}: ${r.t.slice(0, 100)}`); assert.match(r.j.galat, /0103/);
  }
  assert.equal((await V.api("GET", "/api/operasi/peta", undefined, {})).s, 403, "tamu tetap 403, bukan bocor 503");
});
