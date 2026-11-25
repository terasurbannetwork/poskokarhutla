/* Peta Situs PS-03: GET /api/peta-situs lewat Worker sungguhan (miniflare + D1 berisi migrasi). Sesi dibuat lewat sisipan D1 langsung.
   Tiap sesi diuji di host terkunci (centurisk97.id) dan tak terkunci; hasil = menuUntuk(sesi, bolehStaf, terkunci) persis (RENCANA-UJI U2).
   Jalankan: node --test tests/warga/peta_situs_api.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {createHash, randomBytes} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";
import {bolehStaf} from "../../src/admin_halaman.js";
import {HALAMAN, PINTU, menuUntuk} from "../../src/peta_situs.js";

const sha = s => createHash("sha256").update(s).digest("hex");
const TOKEN = new Set(HALAMAN.filter(e => e.akses === "token" || e.token).map(e => e.rute));
const tok = () => randomBytes(32).toString("hex");
let mf, DB;
const STAF = {pusdalops: ["pusdalops"], direktori: ["direktori"]}, K = {};
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-peta-situs-api"}, r2Buckets: ["MEDIA"],
    bindings: {IP_SALT: "garam-uji", SESI_KUNCI: "kunci-sesi-uji", ADMIN_TOKEN: "rahasia-admin"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  const kini = Date.now(), q = [];
  let n = 0;
  for (const [nama, peran] of Object.entries(STAF)) {
    const id = (nama + "0".repeat(16)).slice(0, 16), t = K[nama] = tok(); n++;
    q.push(DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, 'Nama uji', ?, 'Unit', ?, ?, ?, '[]', ?, ?, 0, 1, 'tes', 0)`).bind(id, "staf" + nama, "200010" + n, `s${n}@b.id`, "62812000003" + n, JSON.stringify(peran), "g".repeat(32), "a".repeat(64)),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(t), id, kini + 3600e3));
  }
  K.instansi = tok();
  q.push(DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES ('i1i1i1i1i1i1i1i1', 'poldapetasitus', 'polda', 'prov', 'Polda Uji', 'kw-petasitus', '["13"]', '13', NULL, ?, ?, 'aktif', 'Budi', '198001012005011001', 'Kepala', 'Ops', 'b@x.go.id', '6281234567891', 1, 1, 0, ?)`)
    .bind("g".repeat(32), "a".repeat(64), kini),
    DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, 'i1i1i1i1i1i1i1i1', ?, ?)").bind(sha(K.instansi), kini, kini + 3600e3));
  await DB.batch(q);
});
after(() => mf?.dispose());

const ambil = (host, h = {}, method = "GET") => mf.dispatchFetch(`https://${host}/api/peta-situs`, {method, headers: h});
const rute = m => m.flatMap(p => p.grup.flatMap(g => g.butir.map(e => e.rute)));
const SESI = [
  ["tamu", {}, null],
  ["admin", {"x-admin-token": "rahasia-admin"}, {jenis: "admin", peran: []}],
  ["staf pusdalops", () => ({cookie: "sesi_staf=" + K.pusdalops}), {jenis: "staf", peran: STAF.pusdalops}],
  ["staf direktori saja", () => ({cookie: "sesi_staf=" + K.direktori}), {jenis: "staf", peran: STAF.direktori}],
  ["instansi", () => ({cookie: "sesi_instansi=" + K.instansi}), {jenis: "instansi", peran: []}],
];

const uji = test;
uji("peta situs API: tiap sesi (tamu, admin, staf pusdalops, staf direktori saja, instansi) di host terkunci dan tak terkunci = menuUntuk, tanpa butir token, admin:true hanya untuk admin", async () => {
  for (const [nama, h, sesi] of SESI) for (const [host, terkunci] of [["centurisk97.id", true], ["t.lokal", false]]) {
    const r = await ambil(host, typeof h === "function" ? h() : h), m = await r.json();
    assert.equal(r.status, 200, `${nama} di ${host}`);
    assert.equal(r.headers.get("cache-control"), "private, no-store");
    assert.match(r.headers.get("vary") || "", /cookie/i);
    const penuh = menuUntuk(sesi, bolehStaf, terkunci), semua = m.flatMap(p => p.grup.flatMap(g => g.butir));
    assert.deepEqual(rute(m), rute(penuh), `${nama} di ${host}: butir sama dengan menuUntuk`);
    assert.deepEqual(m.map(p => [p.pintu, p.nama, p.beranda, p.grup.map(g => [g.id, g.nama])]), penuh.map(p => [p.pintu, p.nama, p.beranda, p.grup.map(g => [g.id, g.nama])]));
    for (const p of m) { assert.deepEqual(Object.keys(p).sort(), ["beranda", "grup", "nama", "pintu"]); for (const g of p.grup) assert.deepEqual(Object.keys(g).sort(), ["butir", "id", "nama"]); }
    for (const e of semua) assert.deepEqual(Object.keys(e).sort(), ["grup", "ikon", "induk", "nama", "rute"], `kunci butir ${e.rute}`);
    assert.deepEqual(rute(m).filter(x => TOKEN.has(x)), [], "rute bertoken tidak pernah tampil");
    const ADMIN = new Set(HALAMAN.filter(e => e.admin).map(e => e.rute));
    if (sesi?.jenis !== "admin") assert.deepEqual(rute(m).filter(x => ADMIN.has(x)), [], "butir admin bocor ke " + nama);
    const pintu = m.map(p => p.pintu);
    if (!sesi) assert.deepEqual(pintu, ["publik"]);
    if (sesi?.jenis === "admin") assert.deepEqual(pintu, Object.keys(PINTU));
    if (nama === "staf pusdalops") assert.ok(pintu.includes("staf") && rute(m).includes("/bnpb/dalops"));
    if (nama === "staf direktori saja") assert.deepEqual(rute(m.filter(p => p.pintu === "staf")), ["/direktori"]);
    if (nama === "instansi") assert.deepEqual(pintu, ["publik", "instansi"]);
  }
});

uji("peta situs API: HEAD tanpa badan, POST 405, sesi kedaluwarsa atau palsu = menu tamu", async () => {
  const h = await ambil("centurisk97.id", {"x-admin-token": "rahasia-admin"}, "HEAD");
  assert.equal(h.status, 200); assert.equal(await h.text(), ""); assert.equal(h.headers.get("cache-control"), "private, no-store");
  const p = await ambil("centurisk97.id", {origin: "https://centurisk97.id"}, "POST"); await p.text();
  assert.equal(p.status, 405);
  const palsu = await (await ambil("centurisk97.id", {cookie: `sesi_staf=${tok()}; sesi_instansi=${tok()}; sesi_kemitraan=${tok()}`})).json();
  assert.deepEqual(palsu.map(x => x.pintu), ["publik"]);
});

/* staf tanpa peran tidak bisa ada di D1 (CHECK json_array_length(peran) >= 1, migrasi 0152), jadi tidak pernah sampai ke rute; menuUntuk tetap hanya memberi pintu Publik */
uji("peta situs API: staf tanpa peran ditolak CHECK D1, dan menuUntuk untuknya hanya pintu Publik di kedua host", async () => {
  await assert.rejects(DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES ('kosong0000000000', 'stafkosong', 'Nama uji', '2000199', 'Unit', 'k0@b.id', '628120000399', '[]', '[]', ?, ?, 0, 1, 'tes', 0)`).bind("g".repeat(32), "a".repeat(64)).run(), /CHECK constraint failed/);
  for (const t of [true, false]) assert.deepEqual(menuUntuk({jenis: "staf", peran: []}, bolehStaf, t).map(p => p.pintu), ["publik"]);
});
