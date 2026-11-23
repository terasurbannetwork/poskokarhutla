/* Paritas bencana PB-27 (src/pb_isian.js GET dan POST /api/pb/tindakan, src/hak.js pbTindakan*, migrations/0131) di workerd (Miniflare) dengan D1 sungguhan.
   Dibuktikan: hak (tamu, gerbang, koordalops, udara 403; pemirsa dan gerbang boleh baca), butir hanya dari daftar tindakanUntuk, peringatan harus aktif (lama dan peringatan_x),
   pelaksana enum (bukan nama), upsert menimpa satu baris, batas bawaan Q20, wilayah staf, laju, log tanpa nama, kueri baca SEARCH, tanpa 0131 = 503/tersedia:false.
   Jalankan: node --test tests/warga/pb_tindakan.test.mjs */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import "../../src/worker.js";   // dahulu: impor sirkular
import {siapkan, berantai, MOD2, GERBANG, ADMIN, sha256} from "./_bnpb.mjs";
import {migrasi} from "./_bantu.mjs";
import {PB_SQL_TINDAKAN} from "../../src/hak.js";
import {batasBawaan} from "../../src/pb_isian.js";
import {tindakanUntuk} from "../../public/ews_tindakan.js";
import {denganProfil, profilAktif} from "./_profil.mjs";

const uji = berantai();
const {DB, mf, api, n} = await siapkan("uji-pb-tindakan");
const TOK = {pus: "1".repeat(64), jabar: "2".repeat(64), udara: "3".repeat(64), koord: "4".repeat(64)};
const PERAN = {pus: '["pusdalops"]', jabar: '["pusdalops"]', udara: '["udara"]', koord: '["koordalops"]'}, WIL = {pus: "[]", jabar: '["32"]', udara: "[]", koord: "[]"};
let i = 0;
for (const k of Object.keys(TOK)) {
  i++; const id = String(i).repeat(2) + k.padEnd(14, "0");
  await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, ?, ?, 'Pusdalops', ?, ?, ?, ?, ?, ?, 0, 1, 'tes', 0)`).bind(id, "tdkuji" + k, "Staf " + k, "94000" + i, `${k}@b.id`, "6281400000" + i, PERAN[k], WIL[k], "a".repeat(32), "a".repeat(64)).run();
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(TOK[k]), id, Date.now() + 3600e3).run();
}
const H = k => ({cookie: "sesi_staf=" + TOK[k], "x-pb": "1"});
const kini = Date.now();
const per = (kunci, jenis, tingkat, prov, tabel = "peringatan", hingga = kini + 36e5) => DB.prepare(`INSERT INTO ${tabel} (kunci, jenis, tingkat, prov, judul, sumber, dibuat, berlaku_hingga) VALUES (?, ?, ?, ?, 'uji', 'BMKG', ?, ?)`).bind(kunci, jenis, tingkat, prov, kini - 1000, hingga).run();
await per("banjir:uji:1", "banjir", "Siaga", "32");
await per("banjir:uji:lalu", "banjir", "Siaga", "32", "peringatan", kini - 1);   // kedaluwarsa
await per("banjir:uji:nasional", "banjir", "Awas", null);
await per("pesisir:uji:1", "pesisir", "Siaga", "32", "peringatan_x");           // jenis belum punya daftar tindakan
await per("rob:uji:1", "rob", "Waspada", "32", "peringatan_x");                  // tabel samping, jenis ada daftarnya
await DB.prepare("INSERT INTO peringatan (kunci, jenis, tingkat, prov, kab, judul, sumber, dibuat, berlaku_hingga) VALUES ('banjir:uji:kab', 'banjir', 'Siaga', '32', 'Kota Bandung', 'uji', 'BMKG', ?, ?)").bind(kini - 1000, kini + 36e5).run();
await DB.prepare("INSERT INTO peringatan (kunci, jenis, tingkat, prov, kab, judul, sumber, dibuat, berlaku_hingga) VALUES ('banjir:uji:ngarang', 'banjir', 'Siaga', '32', 'Kabupaten Ngarang', 'uji', 'BMKG', ?, ?)").bind(kini - 1000, kini + 36e5).run();
let u = 0;
async function akun(jenis, tingkat, prov, kab) {
  const id = String(++u).padStart(16, "0"), tok = String(u).padStart(64, "a");
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, ?, ?, ?, 'Wilayah uji', ?, ?, ?, ?, ?, ?, 'aktif', 'Petugas Uji', '19800101', 'Kasi', 'BPBD', ?, ?, 1, 1, 0, 1)`)
    .bind(id, "tdkakun" + u, jenis, tingkat, kab ? `${prov}|${kab}` : prov, JSON.stringify([prov]), tingkat === "kab" ? prov : null, kab, "g".repeat(32), "0".repeat(64), `t${u}@b.id`, "62813100000" + u).run();
  await DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id, Date.now() + 3600e3).run();
  return {...(await denganProfil(DB, id, {cookie: "sesi_instansi=" + tok})), "x-pb": "1", origin: "http://bnpb.lokal"};   // akun BPBD: sesi profil (paket profil-bpbd)
}
const BANJIR2 = tindakanUntuk("banjir", 2);
const pos = (b, h = MOD2) => api("POST", "/api/pb/tindakan", b, h);
const dapat = (q, h = MOD2) => api("GET", "/api/pb/tindakan?" + q, undefined, h);
const P = (o = {}) => ({peringatan: "banjir:uji:1", butir: 0, selesai: true, pelaksana: "bpbd", ...o});

uji("hak tulis: tamu, akun gerbang, koordalops, udara 403 sebelum body; staf wilayah lain 403", async () => {
  for (const h of [{}, GERBANG, H("koord"), H("udara")]) { assert.equal((await pos("bukan json", h)).s, 403); assert.equal((await pos(P(), h)).s, 403); }
  assert.equal((await pos(P({peringatan: "banjir:uji:nasional"}), H("jabar"))).s, 403);   // peringatan nasional, staf wilayah 32
  assert.equal(await n("pb_tindakan"), 0);
});

uji("butir hanya dari daftar, peringatan harus aktif dan punya daftar, pelaksana enum", async () => {
  assert.equal((await pos(P({peringatan: "tidak:ada"}))).s, 404);
  assert.equal((await pos(P({peringatan: "banjir:uji:lalu"}))).s, 404);
  assert.equal((await pos(P({peringatan: "pesisir:uji:1"}))).s, 404);
  for (const o of [{butir: BANJIR2.length}, {butir: -1}, {butir: "0"}, {butir: 1.5}, {butir: 31}, {selesai: "ya"}, {selesai: 1}, {pelaksana: "Budi Santoso"}, {pelaksana: "constructor"}, {batas: "besok"}, {batas: kini + 40 * 864e5}, {batas: 1}, {peringatan: ""}, {peringatan: 5}])
    assert.equal((await pos(P(o))).s, 400, JSON.stringify(o));
  assert.equal(await n("pb_tindakan"), 0);
});

uji("upsert: baris pertama 201 dengan batas bawaan Q20 (Siaga 12 jam), kedua menimpa 200, log tanpa nama", async () => {
  const a = await pos(P()); assert.equal(a.s, 201, a.t);
  assert.ok(Math.abs(a.j.batas - (Date.now() + 12 * 36e5)) < 60e3);
  const b = await pos(P({selesai: false, pelaksana: "regu"})); assert.equal(b.s, 200); assert.equal(b.j.batas, a.j.batas);   // batas lama dipertahankan
  assert.equal(await n("pb_tindakan"), 1);
  const r = await DB.prepare("SELECT selesai, pelaksana, oleh FROM pb_tindakan").first(); assert.deepEqual([r.selesai, r.pelaksana], [0, "regu"]); assert.match(r.oleh, /^admin:/);
  const l = (await DB.prepare("SELECT oleh, aksi, kunci FROM pb_log WHERE tabel = 'pb_tindakan' ORDER BY id").all()).results;
  assert.deepEqual(l.map(x => x.aksi), ["isi", "ubah"]); assert.ok(l.every(x => x.kunci.length <= 80));
  const c = await pos(P({butir: 1, batas: kini + 36e5, pelaksana: null}), H("pus")); assert.equal(c.s, 201, c.t); assert.equal(c.j.batas, kini + 36e5);
  assert.match((await DB.prepare("SELECT oleh FROM pb_tindakan WHERE butir = 1").first()).oleh, /^staf:/);
  const d = await pos(P({peringatan: "rob:uji:1"})); assert.equal(d.s, 201, d.t);   // peringatan_x
});

uji("baca: daftar butir dari kamus digabung keadaan; pemirsa, gerbang, staf boleh; udara dan tamu 403; tanpa kolom oleh", async () => {
  const g = await dapat("peringatan=banjir:uji:1"); assert.equal(g.s, 200, g.t);
  assert.equal(g.j.tersedia, true); assert.deepEqual(g.j.butir.map(x => x.teks), BANJIR2);
  assert.equal(g.j.butir[0].selesai, false); assert.equal(g.j.butir[0].pelaksana, "regu"); assert.equal(g.j.butir[1].selesai, true);
  assert.equal(g.j.butir[2].waktu, null); assert.ok(!/admin:|staf:|"oleh"/.test(g.t));
  assert.equal((await dapat("peringatan=banjir:uji:1", GERBANG)).s, 200);
  assert.equal((await dapat("peringatan=banjir:uji:1", H("koord"))).s, 200);
  assert.equal((await dapat("peringatan=banjir:uji:1", H("jabar"))).s, 200);
  assert.equal((await dapat("peringatan=banjir:uji:nasional", H("jabar"))).s, 403);
  for (const h of [{}, H("udara")]) assert.equal((await dapat("peringatan=banjir:uji:1", h)).s, 403);
  assert.equal((await dapat("peringatan=tidak:ada")).s, 404); assert.equal((await dapat("")).s, 400);
});

uji("batas laju 60 tulis per 10 menit per pengisi", async () => {
  await DB.prepare("DELETE FROM pb_log").run();
  const w = Date.now();
  await DB.batch(Array.from({length: 60}, () => DB.prepare("INSERT INTO pb_log (waktu, oleh, tabel, kunci, aksi) VALUES (?, 'staf:" + "2".repeat(2) + "jabar" + "0".repeat(9) + "', 'pb_tindakan', 'x', 'isi')").bind(w)));
  const r = await pos(P({butir: 2}), H("jabar")); assert.equal(r.s, 429, r.t);
});

uji("kueri tindakan SEARCH, bukan SCAN", () => {
  const db = new DatabaseSync(":memory:"); db.exec(migrasi());
  for (const sql of [PB_SQL_TINDAKAN.daftar, PB_SQL_TINDAKAN.satu, PB_SQL_TINDAKAN.upsert]) {
    const p = db.prepare("EXPLAIN QUERY PLAN " + sql.replace(/\?\d/g, "?")).all().map(r => r.detail).filter(d => /^SCAN pb_/.test(d));
    assert.deepEqual(p, [], sql.slice(0, 60));
  }
});

uji("tanpa migrasi 0131: tulis 503, baca tersedia:false", async () => {
  const U = await siapkan("uji-pb-tindakan-lama", {sampai: "0131_"});
  await U.DB.prepare("INSERT INTO peringatan (kunci, jenis, tingkat, prov, judul, sumber, dibuat, berlaku_hingga) VALUES ('banjir:uji:1','banjir','Siaga','32','uji','BMKG',?,?)").bind(kini - 1000, kini + 36e5).run();
  assert.equal((await U.api("POST", "/api/pb/tindakan", P(), MOD2)).s, 503);
  const d = await U.api("GET", "/api/pb/tindakan?peringatan=banjir:uji:1", undefined, MOD2); assert.equal(d.s, 200); assert.equal(d.j.tersedia, false);
});

uji("instansi: kab hanya kab-nya (baca dan tulis), kab lain di prov sama 403, prov menulis, kab tak terpetakan 403", async () => {
  const kota = await akun("pemkot", "kab", "32", "Kota Bandung"), kabLain = await akun("pemkab", "kab", "32", "Bandung"), prov = await akun("pemprov", "prov", "32", null), tanpaPeta = await akun("pemkab", "kab", "32", "Kabupaten Ngarang");
  assert.equal((await pos(P({peringatan: "banjir:uji:kab"}), kota)).s, 201);
  assert.equal((await dapat("peringatan=banjir:uji:kab", kota)).s, 200);
  assert.equal((await pos(P({peringatan: "banjir:uji:kab"}), kabLain)).s, 403);
  assert.equal((await dapat("peringatan=banjir:uji:kab", kabLain)).s, 403);
  assert.equal((await pos(P({peringatan: "banjir:uji:1"}), kota)).s, 403);   // peringatan tanpa kab: instansi kab ditolak
  assert.equal((await dapat("peringatan=banjir:uji:1", kota)).s, 403);
  assert.equal((await pos(P({peringatan: "banjir:uji:kab", butir: 1}), prov)).s, 201);
  assert.equal((await dapat("peringatan=banjir:uji:kab", prov)).s, 200);
  assert.equal((await pos(P({peringatan: "banjir:uji:nasional"}), prov)).s, 403);   // prov tanpa wilayah
  assert.equal((await pos(P({peringatan: "banjir:uji:ngarang"}), tanpaPeta)).s, 403);   // nama kab tak terpetakan: fail-closed
});

uji("pemirsa hanya membaca: POST 403, GET 200", async () => {
  const buat = await api("POST", "/api/pemirsa/admin/buat", {nama: "Dir Dalops", tab: ["pusdalops"]}, ADMIN); assert.equal(buat.s, 201, buat.t);
  const m = await mf.dispatchFetch("https://centurisk97.id/admin/masuk", {method: "POST", redirect: "manual", headers: {"content-type": "application/x-www-form-urlencoded", origin: "https://centurisk97.id"}, body: new URLSearchParams({email: buat.j.username, sandi: buat.j.sandi}).toString()});
  const PEMIRSA = {cookie: m.headers.getSetCookie().find(c => c.startsWith("sesi_pemirsa=")).split(";")[0]};
  assert.equal((await pos(P(), PEMIRSA)).s, 403);
  assert.equal((await dapat("peringatan=banjir:uji:1", PEMIRSA)).s, 200);
});

uji("POST tanpa pelaksana mempertahankan yang lama; \"\" menghapus; tingkat tak dikenal tanpa batas, bukan NaN", async () => {
  assert.equal((await pos(P({butir: 2, pelaksana: "warga"}))).s, 201);
  const a = await pos({peringatan: "banjir:uji:1", butir: 2, selesai: true}); assert.equal(a.s, 200); assert.equal(a.j.pelaksana, "warga");
  assert.equal((await DB.prepare("SELECT pelaksana FROM pb_tindakan WHERE peringatan = 'banjir:uji:1' AND butir = 2").first()).pelaksana, "warga");
  assert.equal((await pos(P({butir: 2, pelaksana: ""}))).j.pelaksana, null);
  assert.equal(batasBawaan(undefined, kini), null); assert.equal(batasBawaan(9, kini), null); assert.equal(batasBawaan(3, kini), kini + 2 * 36e5);
});
