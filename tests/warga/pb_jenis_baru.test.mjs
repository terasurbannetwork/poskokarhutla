/* PB-07: tugas longsor dan pesisir (src/tugas_bencana.js, tabel samping tugas_bencana_x migrasi 0130, src/hak.js tugasBencanaPer, src/operasi_lapangan.js teks per jenis).
   D1 sungguhan di workerd, migrasi apa adanya. Berkas masukan /data/tugas_<id>.json dijawab dari peta `BERKAS`.
   Jalankan: node --test tests/warga/pb_jenis_baru.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import "../../src/worker.js";
import {tugasBaruDariBerkas, bencanaPer, tutupKedaluwarsa, kecualiLain, KECUALI_LAIN, SARING_JENIS} from "../../src/instansi.js";
import {DAFTAR_BENCANA, bencanaId, labelBencana, bacaBencana, teksBencana} from "../../src/tugas_bencana.js";
import {siapkan, sha256} from "./_bnpb.mjs";
import {denganProfil, profilAktif} from "./_profil.mjs";

const HARI = 24 * 3600e3, T0 = Date.UTC(2026, 10, 15, 4, 7), BERKAS = new Map();
const aset = async req => { const b = BERKAS.get(new URL(req.url).pathname.split("/").pop()); return b === undefined ? new Response("tidak ada", {status: 404}) : new Response(JSON.stringify(b)); };
const berkas = (b, kompleks) => BERKAS.set(`tugas_${b}.json`, {dibuat: new Date(T0 - 300e3).toISOString(), bencana: b, kompleks});
const K = (lat, lon, id) => ({id, lat, lon, prov: "62", kab: "Seruyan", kec: "Seruyan Hilir", level: 3, n24: 1});

async function akun(U) {
  const id = randomBytes(8).toString("hex"), token = randomBytes(32).toString("hex"), kini = Date.now();
  await U.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, jabatan, unit, email, wa, surat, kartu, wajib_ganti, dibuat)
    VALUES (?, 'pbjenis', 'pemprov', 'prov', 'Pemprov Kalteng', '62||pbjenis', '["62"]', NULL, NULL, ?, ?, 'aktif', 'Budi', '198001012005011001', 'Kepala', 'BPBD', 'budi@x.go.id', '6281234567890', 1, 1, 0, ?)`)
    .bind(id, "g".repeat(32), "a".repeat(64), kini).run();
  await U.DB.prepare("INSERT INTO instansi_sesi (token_sha, akun_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(sha256(token), id, kini, kini + 30 * HARI).run();
  return denganProfil(U.DB, id, {cookie: `sesi_instansi=${token}`});   // akun BPBD: sesi profil (paket profil-bpbd)
}

test("longsor dan pesisir: dibuat dari berkas, tersimpan di tugas_bencana_x, dibaca tanpa kluster, teks per jenis", async () => {
  const U = await siapkan("uji-pb-jenis-baru", {asetKu: aset}), env = {DB: U.DB, ASSETS: {fetch: aset}}, h = await akun(U);
  berkas("longsor", [K(-2.5, 112, "L0001")]); berkas("pesisir", [K(-2.9, 111.5, "P0001")]);
  const r = await tugasBaruDariBerkas(env, T0);
  assert.deepEqual(r.bencana, {longsor: {baru: 1, digabung: 0}, pesisir: {baru: 1, digabung: 0}});
  assert.equal(await U.n("tugas_bencana"), 0, "tidak ada di tabel 0047");
  const x = (await U.DB.prepare("SELECT tugas_id, bencana FROM tugas_bencana_x ORDER BY bencana").all()).results;
  assert.deepEqual(x.map(v => v.bencana), ["longsor", "pesisir"]);
  const per = await bencanaPer(env, x.map(v => ({id: v.tugas_id})));
  for (const v of x) assert.equal(per.get(v.tugas_id), v.bencana);
  for (const v of x) {
    const p = await U.api("GET", `/api/ops/tugas/${v.tugas_id}`, undefined, h); assert.equal(p.s, 200, p.t);
    assert.equal(p.j.tugas.bencana, v.bencana); assert.equal(p.j.tugas.bencana_nama, labelBencana(v.bencana).nama);
    assert.equal(p.j.kluster, null, "tanpa kluster api"); assert.equal(p.j.angin, null);
    const aw = (await U.api("GET", `/api/ops/periode?tugas_id=${v.tugas_id}`, undefined, h)).j.awal;
    assert.equal(aw.sasaran, teksBencana(v.bencana).sasaran("Seruyan Hilir, Seruyan")); assert.equal(aw.cuaca, null);
    assert.ok(!/api/i.test(aw.sasaran + aw.keselamatan), "tanpa kosakata api");
    const li = (await U.api("GET", `/api/ops/linimasa/${v.tugas_id}`, undefined, h)).j.linimasa;
    assert.equal(li[0].ket, teksBencana(v.bencana).deteksi("Seruyan Hilir, Seruyan"));
  }
});

test("jenis tak dikenal tidak diam-diam menjadi karhutla; tabel menolak jenis liar", async () => {
  assert.equal(bencanaId(null), "karhutla"); assert.equal(bencanaId(undefined), "karhutla");
  for (const liar of ["tsunami", "Longsor", "__proto__", "toString"]) assert.equal(bencanaId(liar), "tidak_dikenal", liar);
  assert.equal(labelBencana("tsunami").nama, "Jenis tidak dikenal"); assert.ok(!DAFTAR_BENCANA.includes("tidak_dikenal"));
  assert.equal(bacaBencana("tsunami"), undefined); assert.equal(bacaBencana("tidak_dikenal"), undefined); assert.equal(bacaBencana("longsor"), "longsor");
  for (const b of ["karhutla", "tsunami", "x' OR '1", "tidak_dikenal"]) assert.throws(() => SARING_JENIS(b), /SARING_JENIS/);
  /* baris ganjil di hasil D1: bencanaPer tidak melempar dan tidak menjadikannya karhutla */
  const palsu = {DB: {batch: async () => [{results: [{tugas_id: "a", bencana: "tsunami"}, {tugas_id: "b", bencana: "banjir"}]}, {results: []}], prepare: () => ({bind: () => ({})})}};
  const per = await bencanaPer(palsu, [{id: "a"}, {id: "b"}]); assert.equal(per.get("a"), "tidak_dikenal"); assert.equal(per.get("b"), "banjir");
  const U = await siapkan("uji-pb-jenis-liar", {asetKu: aset});
  await U.DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES ('aaaaaaaaaaaaaaaa', '62', 'Seruyan', -2, 112, 3, 1, 1)").run();
  await assert.rejects(U.DB.prepare("INSERT INTO tugas_bencana_x (tugas_id, bencana) VALUES ('aaaaaaaaaaaaaaaa', 'tsunami')").run());
  await assert.rejects(U.DB.prepare("INSERT INTO tugas_bencana_x (tugas_id, bencana) VALUES ('aaaaaaaaaaaaaaaa', 'banjir')").run());
});

test("0130 belum diterapkan: pesan migrasi, karhutla dan jenis lama tetap terbaca", async () => {
  const U = await siapkan("uji-pb-jenis-tanpa0130", {asetKu: aset, sampai: "0130_"}), env = {DB: U.DB, ASSETS: {fetch: aset}};
  berkas("longsor", [K(-2.5, 112, "L0001")]);
  const r = await tugasBaruDariBerkas(env, T0);
  assert.match(r.bencana.longsor.lewat, /migrasi 0130 belum diterapkan/);
  assert.equal(await U.n("tugas_api"), 0, "tidak ada tugas longsor yang nyasar");
  await U.DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES ('bbbbbbbbbbbbbbbb', '62', 'Seruyan', -2, 112, 3, 1, 1), ('cccccccccccccccc', '62', 'Seruyan', -2, 112, 3, 1, 1)").run();
  await U.DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES ('cccccccccccccccc', 'banjir')").run();
  const per = await bencanaPer(env, [{id: "bbbbbbbbbbbbbbbb"}, {id: "cccccccccccccccc"}]);
  assert.equal(per.get("cccccccccccccccc"), "banjir"); assert.equal(per.has("bbbbbbbbbbbbbbbb"), false, "tanpa baris = karhutla di pemanggil");
});

test("saringan: longsor bukan karhutla, muncul di saringan longsor, ditutup sesudah 72 jam; tanpa 0130 saringan lama jalan", async () => {
  const U = await siapkan("uji-pb-jenis-saring", {asetKu: aset}), env = {DB: U.DB, ASSETS: {fetch: aset}}, h = await akun(U);
  BERKAS.clear(); berkas("longsor", [K(-2.5, 112, "L0001")]); berkas("banjir", [K(-2.1, 112.3, "B0001")]);
  await tugasBaruDariBerkas(env, T0);
  await U.DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES ('abababababababab', '62', 'Seruyan', -2.9, 111.5, 3, ?, ?)").bind(T0, T0).run();
  const idJenis = async j => { const r = await U.api("GET", `/api/instansi/tugas?bencana=${j}`, undefined, h); assert.equal(r.s, 200, r.t); return r.j.tugas.map(t => t.id); };
  const L = (await U.DB.prepare("SELECT tugas_id FROM tugas_bencana_x").first()).tugas_id, B = (await U.DB.prepare("SELECT tugas_id FROM tugas_bencana").first()).tugas_id;
  const kh = await idJenis("karhutla"); assert.deepEqual(kh.filter(i => i === L || i === B), [], "longsor dan banjir tidak masuk karhutla"); assert.ok(kh.includes("abababababababab"));
  assert.deepEqual(await idJenis("longsor"), [L]);
  assert.deepEqual(await idJenis("pesisir"), []);
  assert.equal((await U.DB.prepare(`SELECT count(*) n FROM tugas_api t WHERE 1 ${KECUALI_LAIN}`).first()).n, 1);
  assert.deepEqual((await U.api("GET", "/api/instansi/tugas", undefined, h)).j.tugas.map(t => [t.id, t.bencana]).sort().map(x => x[1]).sort(), ["banjir", "karhutla", "longsor"]);
  /* 72 jam: sebelum jendela tetap buka, sesudahnya padam_dilaporkan (tidak menyentuh banjir dan karhutla) */
  await tutupKedaluwarsa(env, T0 + 71 * 3600e3);
  assert.equal((await U.DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(L).first()).status, "buka");
  const o = await tutupKedaluwarsa(env, T0 + 73 * 3600e3); assert.deepEqual(o.longsor, {ditutup: 1, terverifikasi: 0});
  const t = await U.DB.prepare("SELECT status, padam_verif FROM tugas_api WHERE id = ?").bind(L).first(); assert.deepEqual([t.status, t.padam_verif], ["padam", "padam_dilaporkan"]);
  assert.equal((await U.DB.prepare("SELECT status FROM tugas_api WHERE id = 'abababababababab'").first()).status, "buka");
  /* 0130 belum ada: saringan karhutla jatuh ke saringan 0047, banjir tetap tersaring */
  const V = await siapkan("uji-pb-jenis-saring-lama", {asetKu: aset, sampai: "0130_"});
  await V.DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES ('aaaaaaaaaaaaaaaa', '62', 'Seruyan', -2, 112, 3, 1, 1), ('bbbbbbbbbbbbbbbb', '62', 'Seruyan', -2, 112, 3, 1, 1)").run();
  await V.DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES ('bbbbbbbbbbbbbbbb', 'banjir')").run();
  const r = await kecualiLain(f => V.DB.prepare(`SELECT t.id FROM tugas_api t WHERE 1 ${f}`).all());
  assert.deepEqual(r.results.map(x => x.id), ["aaaaaaaaaaaaaaaa"]);
  const lama = await tutupKedaluwarsa({DB: V.DB}, T0 + 100 * 3600e3); assert.ok(!lama.lewat, "jenis x dilewati tanpa membatalkan jenis lain");
});

test("satu baris jenis liar di D1 tidak menjatuhkan daftar pantau dan tidak tampil sebagai karhutla", async () => {
  const U = await siapkan("uji-pb-jenis-liar-pantau", {asetKu: aset}), t0 = Date.now();
  for (const id of ["aaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbb"])
    await U.DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES (?, '62', 'Seruyan', -2, 112, 3, ?, ?)").bind(id, t0, t0).run();
  await U.DB.exec("PRAGMA ignore_check_constraints = ON");
  await U.DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES ('bbbbbbbbbbbbbbbb', 'tsunami')").run();
  await U.DB.exec("PRAGMA ignore_check_constraints = OFF");
  const r = await U.adm("GET", "/api/instansi/admin/pantau"); assert.equal(r.s, 200, r.t);
  const per = Object.fromEntries(Object.entries({karhutla: 0, tidak_dikenal: 0}).map(([k]) => [k, r.j.bencana.find(b => b.id === k)?.n ?? 0]));
  assert.deepEqual(per, {karhutla: 1, tidak_dikenal: 1});
});
