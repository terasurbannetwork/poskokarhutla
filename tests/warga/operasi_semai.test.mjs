/* Peluang semai awan (src/operasi_semai.js, migrations/0129_semai_target.sql) di workerd (Miniflare) dengan D1 dan R2 lokal sungguhan, migrasi apa adanya.
   Arsip R2 di bawah dibangun dari DESAIN-TEKNIS.md §3 (fixture uji), bukan dari putaran nyata.
   Jalankan: node --test tests/warga/operasi_semai.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)

const PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
const uji = berantai();
const U = await siapkan("uji-operasi-semai", {r2: true});
const {DB, api, n, mf} = U;
const R2 = await mf.getR2Bucket("MEDIA");
const kini = Date.now(), wibStr = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
const hari = wibStr(kini), besok = wibStr(kini + 864e5), kemarin = wibStr(kini - 864e5);
const iso = t => new Date(t).toISOString();
const P1 = "2026111400", P2 = "2026111412";
const zona = (put, h, o = {}) => ({id: `${put}-${h}`, huruf: h, lat: -1.4, lon: 115.3, skor: 0.74, langkah: 30, jendela: [iso(kini + 6 * 3600e3), iso(kini + 9 * 3600e3)], zona_waktu: "WIB",
  alasan: ["awan_teramati", "cape_cukup"], base: {id: "PKY"}, tanda: [], ...o});
const arsip = (put, zs) => R2.put(`operasi/semai/arsip/${put}.json`, JSON.stringify({dibuat: iso(kini), putaran: {init: "x"}, zona: zs}));
await arsip(P1, [zona(P1, "A"), zona(P1, "B", {jendela: [iso(kini - 5 * 3600e3), iso(kini - 2 * 3600e3)]}), zona(P1, "C", {tanda: ["di_luar_jelajah"]}), zona(P1, "D", {lat: -1.2})]);
await arsip(P2, ["A", "B", "C", "D", "E"].map(h => zona(P2, h)));
await R2.put("operasi/semai/semai.json", '{"zona":[]}'); await R2.put("operasi/semai/awan_12.png", "PNGFAKE"); await R2.put("operasi/semai/semai_lain.json", "x");
let nipN = 0, ipN = 0;
const bikin = async (nama, peran) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19960${++nipN}0012005`, unit: "Pusdalops BNPB", email: `sm${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `192.0.2.${++ipN}`}); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie}, hp: {cookie, ...PB}};
};
const pos = (b, h) => api("POST", "/api/operasi/semai/target", b, h);
const sah = {zona_id: `${P1}-A`, putaran: P1, base_id: "PKY", tanggal: hari};
let pusdalops, tmc, udara, id1;

uji("migrasi 0129 dijalankan dua kali tanpa galat", async () => {
  for (const s of pecah(readFileSync(path.join(AKAR, "migrations/0129_semai_target.sql"), "utf8"))) await DB.prepare(s).run();
  assert.equal(await n("op_semai_target"), 0);
  await assert.rejects(DB.prepare("INSERT INTO op_semai_target (id,zona_id,putaran,base_id,tanggal,lat,lon,mulai,selesai,skor,alasan_json,oleh,dibuat) VALUES ('x','z','p','PKY','t',50,115,'a','b',0.5,'[]','o','d')").run(), "CHECK lat di luar wilayah ditolak D1");
});

uji("hak tulis: tamu, pembaca saja, dan akun gerbang 403", async () => {
  pusdalops = await bikin("Pusdalops Semai", ["pusdalops"]); tmc = await bikin("TMC Semai", ["tmc"]); udara = await bikin("Udara Semai", ["udara"]);
  for (const [nama, h] of [["tamu", {}], ["pembaca udara", udara.hp], ["gerbang", GERBANG]]) assert.equal((await pos(sah, h)).s, 403, nama);
  assert.equal(await n("op_semai_target"), 0);
});

uji("pusdalops zona sah: 201, lat/lon/skor/jendela dari arsip bukan dari badan", async () => {
  const r = await pos({...sah, lat: 1, lon: 100, skor: 0.01, mulai: "x", catatan: "  uji\u0000 semai  "}, pusdalops.hp); assert.equal(r.s, 201, r.t); id1 = r.j.id;
  assert.match(id1, /^[0-9a-f-]{36}$/);
  const b = await DB.prepare("SELECT * FROM op_semai_target WHERE id = ?").bind(id1).first();
  assert.deepEqual([b.lat, b.lon, b.skor], [-1.4, 115.3, 0.74]);
  assert.equal(b.mulai, iso(kini + 6 * 3600e3)); assert.deepEqual(JSON.parse(b.alasan_json), ["awan_teramati", "cape_cukup"]);
  assert.equal(b.catatan, "uji semai"); assert.match(b.oleh, /^staf:/); assert.equal(b.terhapus, null);
});

uji("moderator ADMIN_TOKEN dan peran tmc boleh menulis", async () => {
  assert.equal((await pos({...sah, zona_id: `${P1}-D`}, MOD2)).s, 201);
  assert.equal((await pos({...sah, zona_id: `${P1}-D`, base_id: "PLM"}, tmc.hp)).s, 201);
});

uji("validasi: zona 404, putaran beda 400, jendela lewat 400, luar jelajah 400, tanggal, catatan, base, pola", async () => {
  const p = (b, h = pusdalops.hp) => pos({...sah, ...b}, h);
  assert.equal((await p({zona_id: `${P1}-E`})).s, 404, "zona tidak ada di arsip");
  assert.equal((await p({zona_id: "2026111999-A", putaran: "2026111999"})).s, 404, "arsip putaran tidak ada");
  assert.equal((await p({putaran: P2})).s, 400, "putaran tidak cocok awal zona_id");
  assert.equal((await p({zona_id: `${P1}-B`, base_id: "PLM"})).s, 400, "jendela sudah lewat");
  assert.equal((await p({zona_id: `${P1}-C`, base_id: "PLM"})).s, 400, "di luar jelajah");
  assert.equal((await p({tanggal: kemarin, base_id: "PLM"})).s, 400, "kemarin");
  assert.equal((await p({tanggal: "2099-01-01", base_id: "PLM"})).s, 400, "terlalu jauh");
  assert.equal((await p({base_id: "XXX"})).s, 400, "base tidak ada");
  assert.equal((await p({catatan: "x".repeat(501), base_id: "PLM"})).s, 400, "catatan 501");
  assert.equal((await p({zona_id: "abc-A"})).s, 400, "pola zona_id");
  assert.equal((await p({zona_id: `${P1}-F`})).s, 400, "huruf luar A-E");
  assert.equal((await p({tanggal: besok, base_id: "PLM"})).s, 201, "besok boleh");
});

uji("duplikat aktif 409; hapus lunak butuh alasan; hapus lalu isi ulang 201", async () => {
  assert.equal((await pos(sah, pusdalops.hp)).s, 409);
  const h = (b, hd = pusdalops.hp) => api("POST", "/api/operasi/semai/target/hapus", b, hd);
  assert.equal((await h({id: id1})).s, 400); assert.equal((await h({id: id1, alasan: "abc"})).s, 400); assert.equal((await h({id: id1, alasan: "x".repeat(301)})).s, 400);
  assert.equal((await h({id: id1, alasan: "salah pilih zona"}, udara.hp)).s, 403);
  assert.equal((await h({id: id1, alasan: "salah pilih zona"})).s, 200);
  assert.equal((await h({id: id1, alasan: "salah pilih zona"})).s, 404, "hapus kedua");
  const b = await DB.prepare("SELECT terhapus, alasan_hapus FROM op_semai_target WHERE id = ?").bind(id1).first(); assert.ok(b.terhapus); assert.equal(b.alasan_hapus, "salah pilih zona");
  assert.equal((await pos(sah, pusdalops.hp)).s, 201, "indeks unik hanya baris aktif");
});

uji("GET target: pembaca 200 tanpa baris terhapus, tamu 403, tanggal ketat", async () => {
  assert.equal((await api("GET", `/api/operasi/semai/target?tanggal=${hari}`, undefined, {})).s, 403);
  const r = await api("GET", `/api/operasi/semai/target?tanggal=${hari}`, undefined, udara.h); assert.equal(r.s, 200, r.t);
  assert.ok(r.j.length >= 3 && r.j.every(x => x.tanggal === hari) && !r.j.some(x => x.id === id1) && r.j.every(x => !("terhapus" in x)));
  assert.equal((await api("GET", "/api/operasi/semai/target?tanggal=bukan", undefined, MOD2)).s, 400);
});

uji("berkas: pembaca 200 dengan tipe dan cache benar; tamu 403; di luar daftar 404", async () => {
  assert.equal((await api("GET", "/api/operasi/semai/berkas/semai.json", undefined, {})).s, 403);
  const j = await api("GET", "/api/operasi/semai/berkas/semai.json", undefined, udara.h); assert.equal(j.s, 200); assert.match(j.h.get("content-type"), /application\/json/); assert.equal(j.h.get("cache-control"), "private, max-age=600");
  const p = await api("GET", "/api/operasi/semai/berkas/awan_12.png", undefined, MOD2); assert.equal(p.s, 200); assert.equal(p.h.get("content-type"), "image/png"); assert.equal(p.t, "PNGFAKE");
  assert.equal((await api("GET", `/api/operasi/semai/berkas/arsip/${P1}.json`, undefined, udara.h)).s, 200);
  for (const x of ["semai_lain.json", "awan_13.png", "awan_39.png", "asap_12.png", "arsip/abc.json", "%2e%2e%2fx", "..%2fx", "arsip%2f..%2fsemai.json"])
    assert.equal((await api("GET", "/api/operasi/semai/berkas/" + x, undefined, MOD2)).s, 404, x);
  assert.equal((await api("GET", "/api/operasi/semai/berkas/../x", undefined, MOD2)).s, 404);
});

uji("batas 30 per hari per akun: ke-31 429, baris terhapus ikut dihitung", async () => {
  const w = await bikin("Pusdalops Laju", ["pusdalops"]), bases = (await DB.prepare("SELECT id FROM op_base ORDER BY id").all()).results.map(x => x.id), ids = [];
  const kombo = []; for (const h of ["A", "B", "C", "D", "E"]) for (const b of bases) kombo.push([h, b]);
  for (const [h, b] of kombo.slice(0, 30)) { const r = await pos({zona_id: `${P2}-${h}`, putaran: P2, base_id: b, tanggal: hari}, w.hp); assert.equal(r.s, 201, r.t); ids.push(r.j.id); }
  const [h, b] = kombo[30], tambahan = {zona_id: `${P2}-${h}`, putaran: P2, base_id: b, tanggal: hari};
  assert.equal((await pos(tambahan, w.hp)).s, 429);
  assert.equal((await api("POST", "/api/operasi/semai/target/hapus", {id: ids[0], alasan: "uji hitung hapus"}, w.hp)).s, 200);
  assert.equal((await pos(tambahan, w.hp)).s, 429, "baris terhapus tetap dihitung");
  assert.equal((await pos(tambahan, pusdalops.hp)).s, 201, "akun lain tidak terkena");
});
