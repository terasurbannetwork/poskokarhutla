/* Uji integrasi logbook Pusdalops + sensor lapangan (src/logbook.js, src/sensor.js, migrasi 0088/0089, pendeteksi logbookLanjutan di src/pengingat.js):
   Worker + D1 sungguhan di Miniflare, migrasi apa adanya. Tanda tangan sensor dihitung ulang dengan node:crypto (bukan fungsi Worker). */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync} from "node:fs";
import {createHash, createHmac} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";
import {buatPengingat} from "../../src/pengingat.js";

const uji = test;
const sha = s => createHash("sha256").update(s).digest("hex");
const TOK = "c".repeat(64), TOK_LUAR = "d".repeat(64), INDUK = "induk-uji-sensor", FP = "ab".repeat(8);
const HARI = 864e5;
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-logbook"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SENSOR_KUNCI_INDUK: INDUK, SUPER_ADMIN: sha("rahasia-admin").slice(0, 12)},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  for (const [id, un, tok, peran] of [["s1s1s1s1s1s1s1s1", "pusdalopsa", TOK, '["pusdalops"]'], ["s2s2s2s2s2s2s2s2", "kampusa", TOK_LUAR, '["kemitraan"]']])
    await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, un, "Nama " + un, "2000" + id.slice(1, 2) + "000", un + "@b.id", "62812000000" + id.slice(1, 2) + "0", peran),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(tok), id, Date.now() + 3600e3)]);
});
after(() => mf?.dispose());

const orig = {origin: "http://logbook.lokal"}, ADMIN = {"x-admin-token": "rahasia-admin", ...orig};
const STAF = {cookie: "sesi_staf=" + TOK, "x-pb": "1", ...orig}, LUAR = {cookie: "sesi_staf=" + TOK_LUAR, "x-pb": "1", ...orig};
const call = async (m, j, h = STAF, b) => { const r = await mf.dispatchFetch("http://logbook.lokal" + j, {method: m, headers: {"content-type": "application/json", ...h}, body: b === undefined ? undefined : JSON.stringify(b)}); return {status: r.status, cc: r.headers.get("cache-control"), j: await r.json().catch(() => null)}; };
const KAB = "33|Banjarnegara", hariIni = () => new Date().toISOString().slice(0, 10);
const baru = {jenis: "longsor", kab: KAB, kec: "Pandanarum", desa: "Tulis", lat: -7.3, lon: 109.7, mulai: hariIni(), md: 2, hilang: 5, luka: 3, mengungsi_jiwa: 120, mengungsi_kk: 40, rumah_rb: 4, kendala: ["akses", "sinyal"], kebutuhan: ["tenda", "makanan"], catatan: "akses jalan putus", sumber_instansi: "BPBD Banjarnegara"};
const n = async t => (await DB.prepare(`SELECT count(*) n FROM ${t}`).first()).n;

uji("logbook: tanpa sesi atau peran salah 403 di semua rute", async () => {
  const id = "0123456789abcdef";
  for (const h of [orig, LUAR]) for (const [m, j, b] of [["POST", "/api/logbook/kejadian", baru], ["POST", `/api/logbook/kejadian/${id}/entri`, {md: 1}], ["POST", `/api/logbook/kejadian/${id}/tutup`, {}],
    ["GET", "/api/logbook/buka?kab=" + encodeURIComponent(KAB)], ["GET", "/api/logbook/hari?tgl=" + hariIni()], ["GET", "/api/sensor/status"]])
    assert.equal((await call(m, j, h, b)).status, 403, `${m} ${j}`);
  assert.equal(await n("logbook_kejadian"), 0);
});

uji("logbook: buat kejadian dengan entri pertama, input salah 400 dan tidak tersimpan", async () => {
  for (const x of [{jenis: "nyasar"}, {kab: "Banjarnegara"}, {kab: "99|Banjarnegara"}, {kab: "33|"}, {kab: "33|a|b"}, {kab: "constructor|Cilacap"}, {kab: "__proto__|Cilacap"}, {kab: "toString|Cilacap"}, {kab: "3x|Cilacap"}, {prov_kode: "constructor", kab: "Cilacap", kab_kode: undefined}, {lat: 50}, {lon: null}, {mulai: "kemarin"}, {mulai: "2020-01-01"}, {kec: "x".repeat(61)}, {desa: "a\u0000b"},
    {md: -1}, {md: 1.5}, {md: "2"}, {md: 5001}, {luas_ha: 3e6 + 1}, {rumah_rb: 1e9}, {kendala: ["akses", "akses"]}, {kendala: ["terbang"]}, {kebutuhan: "tenda"}, {kebutuhan: ["akses"]}, {catatan: "c".repeat(1001)},
    {mengungsi_kk: 500}, {waktu: Date.now() + 3600e3}, {waktu: "bukan"}])
    assert.equal((await call("POST", "/api/logbook/kejadian", STAF, {...baru, ...x})).status, 400, JSON.stringify(x).slice(0, 50));
  assert.equal(await n("logbook_kejadian"), 0); assert.equal(await n("logbook_entri"), 0);
  const a = await call("POST", "/api/logbook/kejadian", STAF, {...baru, oleh: "penyusup"}); assert.equal(a.status, 201, JSON.stringify(a.j));
  assert.deepEqual([a.j.kejadian.prov, a.j.kejadian.kab, a.j.kejadian.status], ["33", "Banjarnegara", "buka"]);
  assert.deepEqual(a.j.entri.kendala, ["akses", "sinyal"]); assert.equal(a.j.entri.md, 2); assert.equal(a.j.entri.rumah_rs, null);
  assert.equal(a.j.entri.oleh, undefined, "id pelaku tidak keluar di respons");
  assert.equal((await DB.prepare("SELECT oleh FROM logbook_entri").first()).oleh, "staf:s1s1s1s1s1s1s1s1");
  assert.equal(await n("logbook_kejadian"), 1); assert.equal(await n("logbook_entri"), 1);
  const b = await call("POST", "/api/logbook/kejadian", ADMIN, {...baru, kab: undefined, wilayah: "33|Cilacap", entri: {md: 1, yakin: false}, md: 99}); assert.equal(b.status, 201, JSON.stringify(b.j));
  assert.equal(b.j.entri.md, 1, "entri bersarang dipakai bila ada"); assert.equal(b.j.kejadian.kab, "Cilacap");
  /* bentuk form staf (public/bnpb/logbook.js badan()): nama provinsi, prov_kode, kab = nama, kab_kode = "prov|nama", mulai ISO penuh, null untuk yang kosong */
  const f = await call("POST", "/api/logbook/kejadian", STAF, {jenis: "banjir", prov: "Jawa Tengah", prov_kode: "33", kab: "Kebumen", kab_kode: "33|Kebumen", kec: null, desa: null, mulai: new Date().toISOString(), lat: null, lon: null, md: 1, kendala: [], kebutuhan: [], catatan: null, sumber_instansi: null, yakin: false});
  assert.equal(f.status, 201, JSON.stringify(f.j)); assert.deepEqual([f.j.kejadian.prov, f.j.kejadian.kab], ["33", "Kebumen"]);
  assert.equal((await call("POST", "/api/logbook/kejadian", STAF, {jenis: "banjir", prov_kode: "33", kab: "Kebumen", mulai: hariIni()})).status, 201, "prov_kode + nama kab tanpa kab_kode");
});

uji("logbook: entri lanjutan menimpa nilai terkini, batas wajar dan yakin", async () => {
  const k = (await call("POST", "/api/logbook/kejadian", STAF, {...baru, kab: "33|Magelang"})).j.kejadian.id;
  const e2 = await call("POST", `/api/logbook/kejadian/${k}/entri`, STAF, {md: 5, hilang: 2, luka: 9, mengungsi_jiwa: 300, kendala: ["logistik"], kebutuhan: [], catatan: "pembaruan"});
  assert.equal(e2.status, 201, JSON.stringify(e2.j)); assert.equal(e2.j.entri.md, 5, "menimpa, bukan 2+5");
  const buka = (await call("GET", "/api/logbook/buka?kab=" + encodeURIComponent("33|Magelang"))).j.kejadian[0];
  assert.equal(buka.id, k); assert.equal(buka.entri_terkini.md, 5); assert.equal(buka.entri_terkini.hilang, 2); assert.equal(buka.entri_terkini.rumah_rb, null, "yang tidak dikirim = tidak dilaporkan, tidak terbawa");
  assert.deepEqual(buka.entri_terkini.kendala, ["logistik"]);
  assert.equal((await DB.prepare("SELECT count(*) n FROM logbook_entri WHERE kejadian_id = ?").bind(k).first()).n, 2);
  const wajar = await call("POST", `/api/logbook/kejadian/${k}/entri`, STAF, {md: 6000}); assert.equal(wajar.status, 400); assert.equal(wajar.j.wajar, "md");
  assert.equal((await call("POST", `/api/logbook/kejadian/${k}/entri`, STAF, {md: 6000, yakin: true})).status, 201);
  assert.equal((await call("POST", `/api/logbook/kejadian/${k}/entri`, STAF, {md: 2e8, yakin: true})).status, 400, "batas mutlak tidak bisa ditembus yakin");
  assert.equal((await call("POST", "/api/logbook/kejadian/ffffffffffffffff/entri", STAF, {md: 1})).status, 404);
});

uji("logbook: buka per kab, laporan harian 07.00-07.00 WIB, tutup", async () => {
  const k = (await call("POST", "/api/logbook/kejadian", STAF, {...baru, kab: "33|Temanggung", waktu: undefined})).j.kejadian.id;
  const gerbang = new Date(); gerbang.setUTCHours(0, 0, 0, 0);   // 07.00 WIB hari ini
  const tgl = d => new Date(d).toISOString().slice(0, 10), T = gerbang.getTime();
  for (const [ms, md] of [[T - 3600e3, 11], [T + 3600e3, 12]]) await DB.prepare("INSERT INTO logbook_entri (id, kejadian_id, waktu, md, dibuat) VALUES (?, ?, ?, ?, ?)").bind(sha("e" + ms).slice(0, 16), k, ms, md, ms).run();
  const h = await call("GET", "/api/logbook/hari?tgl=" + tgl(T)); assert.equal(h.status, 200); assert.match(h.cc, /no-store/);
  assert.deepEqual([h.j.dari, h.j.sampai], [T, T + HARI]);
  assert.deepEqual(h.j.entri.filter(e => e.kejadian_id === k).map(e => e.md).sort((a, b) => a - b), [2, 12], "periode dimulai 07.00 WIB tanggal itu; entri pukul 06.00 WIB masuk tanggal sebelumnya");
  assert.deepEqual((await call("GET", "/api/logbook/hari?tgl=" + tgl(T - HARI))).j.entri.filter(e => e.kejadian_id === k).map(e => e.md), [11]);
  for (const t of ["", "2026-13-01", "2026-02-30", "kemarin"]) assert.equal((await call("GET", "/api/logbook/hari?tgl=" + t)).status, 400, t);
  assert.equal((await call("GET", "/api/logbook/buka?kab=Temanggung")).status, 400, "tanpa prov ditolak");
  assert.equal((await call("GET", "/api/logbook/buka?kab=Temanggung&prov=33")).j.kejadian.length, 1);
  assert.equal((await call("GET", "/api/logbook/buka?kab=" + encodeURIComponent("33|Wonosobo"))).j.kejadian.length, 0);
  assert.equal((await call("POST", `/api/logbook/kejadian/${k}/tutup`, STAF, {})).status, 200);
  assert.equal((await call("POST", `/api/logbook/kejadian/${k}/tutup`, STAF, {})).status, 409);
  assert.equal((await call("POST", `/api/logbook/kejadian/${k}/entri`, STAF, {md: 1})).status, 409);
  assert.equal((await call("GET", "/api/logbook/buka?kab=" + encodeURIComponent("33|Temanggung"))).j.kejadian.length, 0, "yang ditutup tidak muncul");
  assert.equal((await call("POST", "/api/logbook/kejadian/ffffffffffffffff/tutup", STAF, {})).status, 404);
});

uji("logbook: pengingat 24 dan 72 jam tanpa entri baru, hilang bila entri masuk", async () => {
  const k = (await call("POST", "/api/logbook/kejadian", STAF, {...baru, kab: "33|Cilacap"})).j.kejadian.id, kini = Date.now(), env = {DB, ASSETS: {fetch: async () => new Response("", {status: 404})}};
  const daftar = async () => (await DB.prepare("SELECT keadaan, judul, status FROM pengingat WHERE jenis = 'logbook_lanjutan' AND sumber_id = ?").bind(k).all()).results;
  const tua = j => DB.prepare("UPDATE logbook_kejadian SET terakhir = ? WHERE id = ?").bind(kini - j * 3600e3, k).run();
  await buatPengingat(env, kini, {hanya: ["logbook_lanjutan"]}); assert.equal((await daftar()).length, 0, "baru dibuat: belum ada");
  await tua(30); await buatPengingat(env, kini, {hanya: ["logbook_lanjutan"]});
  let d = await daftar(); assert.equal(d.length, 1); assert.match(d[0].keadaan, /^h1:/); assert.match(d[0].judul, /24 jam/);
  await buatPengingat(env, kini, {hanya: ["logbook_lanjutan"]}); assert.equal((await daftar()).length, 1, "ulang = tetap satu");
  await tua(80); await buatPengingat(env, kini, {hanya: ["logbook_lanjutan"]});
  d = await daftar(); assert.equal(d.length, 1); assert.match(d[0].keadaan, /^h3:/); assert.match(d[0].judul, /72 jam/);
  assert.equal((await call("POST", `/api/logbook/kejadian/${k}/entri`, STAF, {md: 3})).status, 201);
  await buatPengingat(env, kini, {hanya: ["logbook_lanjutan"]}); assert.equal((await daftar()).length, 0, "entri baru menghapus pengingat basi");
  await tua(100); await call("POST", `/api/logbook/kejadian/${k}/tutup`, STAF, {});
  await buatPengingat(env, kini, {hanya: ["logbook_lanjutan"]}); assert.equal((await daftar()).length, 0, "kejadian ditutup: tidak diingatkan");
});

uji("migrasi 0088: pengingat dibangun ulang tanpa kehilangan baris, bisa diulang", async () => {
  await DB.prepare(`INSERT INTO pengingat (id, jenis, sumber_id, keadaan, tanggal, judul, dibuat) VALUES ('0000000000000001', 'bantuan_terbuka', '1111111111111111', 'terbuka', '2026-11-01', 'Contoh lama', 1)`).run();
  const sebelum = await n("pengingat");
  await DB.batch(pecah(readFileSync(path.join(AKAR, "migrations/0088_logbook.sql"), "utf8")).map(s => DB.prepare(s)));   // migrasi diulang
  assert.equal(await n("pengingat"), sebelum);
  assert.equal((await DB.prepare("SELECT judul FROM pengingat WHERE id = '0000000000000001'").first()).judul, "Contoh lama");
  await assert.rejects(DB.prepare(`INSERT INTO pengingat (id, jenis, sumber_id, keadaan, tanggal, judul, dibuat) VALUES ('0000000000000002', 'jenis_nyasar', '1111111111111111', 'x', '2026-11-01', 'abc', 1)`).run());
  assert.equal((await DB.prepare("SELECT count(*) n FROM sqlite_master WHERE name = 'pengingat_cad'").first()).n, 0);
});

/* ---------------- sensor ---------------- */
const kunciHex = id => createHmac("sha256", INDUK).update(id).digest("hex");
const ALAT = "tma-001";
const kirim = async (badan, {kunci = kunciHex(ALAT), tanda, mentah} = {}) => {
  const teks = mentah ?? JSON.stringify(badan), t = tanda ?? createHmac("sha256", kunci).update(teks).digest("hex");
  const r = await mf.dispatchFetch("http://logbook.lokal/api/sensor/baca", {method: "POST", headers: {"content-type": "application/json", "x-sensor-tanda": t}, body: teks});
  return {status: r.status, j: await r.json().catch(() => null)};
};
const bacaan = (x = {}) => ({alat: ALAT, waktu: Date.now(), nilai: {tma_cm: 120}, baterai: 87, rssi: -90, ...x});
async function semai() {
  await DB.prepare("DELETE FROM laju_bnpb").run(); await DB.prepare("DELETE FROM sensor_lapor").run(); await DB.prepare("DELETE FROM sensor_baca").run(); await DB.prepare("DELETE FROM sensor_alat").run();
  await DB.prepare("INSERT INTO sensor_alat (id, jenis, kab, desa, lat, lon, ambang, kunci_hash, aktif, dibuat) VALUES (?, 'tma', '33|Banjarnegara', 'Tulis', -7.3, 109.7, ?, ?, 1, 1)")
    .bind(ALAT, JSON.stringify({tma_cm: {waspada: 200, siaga: 300, awas: 400}}), FP).run();
  await DB.prepare("INSERT INTO sensor_alat (id, jenis, kunci_hash, aktif, dibuat) VALUES ('mati-001', 'hujan', ?, 0, 1)").bind(FP).run();
  await DB.prepare("INSERT INTO sensor_alat (id, jenis, kab, kunci_hash, aktif, dibuat) VALUES ('GW-01', 'gateway', '33|Banjarnegara', ?, 1, 1)").bind(FP).run();
  await DB.prepare("DELETE FROM pengingat WHERE jenis IN ('sensor_ambang', 'sensor_lapor')").run();
}

uji("sensor: batas per IP berlaku sebelum pencarian alat, juga untuk tanda salah", async () => {
  await semai();
  assert.equal((await kirim(bacaan(), {kunci: "salah"})).status, 401);
  const ip = (await DB.prepare("SELECT kunci FROM laju_bnpb WHERE aksi = 'sensor_ip'").first()).kunci;
  await DB.batch(Array.from({length: 300}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'sensor_ip', ?)").bind(ip, Date.now())));
  assert.equal((await kirim(bacaan(), {kunci: "salah"})).status, 429); assert.equal((await kirim(bacaan())).status, 429, "IP penuh: bahkan kiriman sah ditahan");
  assert.equal(await n("sensor_baca"), 0);
});

uji("sensor: tanda tangan benar menyimpan bacaan, duplikat tidak menggandakan", async () => {
  await semai(); const b = bacaan();
  const a = await kirim(b); assert.equal(a.status, 200, JSON.stringify(a.j)); assert.deepEqual(a.j, {ok: true, tingkat: null});
  assert.equal((await DB.prepare("SELECT diterima FROM sensor_baca").first()).diterima > 0, true);
  assert.equal(await n("sensor_baca"), 1);
  const r = await kirim(b); assert.equal(r.status, 200); assert.equal(r.j.duplikat, true); assert.equal(await n("sensor_baca"), 1);
  assert.equal((await kirim(bacaan({waktu: new Date().toISOString()}), {})).status, 200, "waktu ISO diterima");
  const row = await DB.prepare("SELECT nilai, baterai, rssi FROM sensor_baca WHERE waktu = ?").bind(b.waktu).first(); assert.deepEqual([JSON.parse(row.nilai), row.baterai, row.rssi], [{tma_cm: 120}, 87, -90]);
  assert.equal((await kirim(b, {tanda: "sha256=" + createHmac("sha256", kunciHex(ALAT)).update(JSON.stringify(b)).digest("hex").toUpperCase()})).status, 200, "awalan sha256= dan huruf besar diterima");
});

uji("sensor: tanda salah, alat tak dikenal, badan diubah ditolak 401 tanpa tulis", async () => {
  await semai(); const b = bacaan();
  for (const [nama, opsi, badan] of [["kunci lain", {kunci: "salah"}, b], ["tanda ngawur", {tanda: "zz"}, b], ["tanda kosong", {tanda: ""}, b], ["alat tak dikenal", {kunci: kunciHex("nyata-999")}, bacaan({alat: "nyata-999"})],
    ["id alat tak sah", {}, bacaan({alat: "../x"})], ["kunci alat lain", {kunci: kunciHex("mati-001")}, b]])
    assert.equal((await kirim(badan, opsi)).status, 401, nama);
  const asli = JSON.stringify(b), tanda = createHmac("sha256", kunciHex(ALAT)).update(asli).digest("hex");
  assert.equal((await kirim(null, {mentah: asli.replace("120", "999"), tanda})).status, 401, "badan diubah setelah ditandatangani");
  assert.equal((await kirim(null, {mentah: "{bukan json", tanda: "a".repeat(64)})).status, 401, "bukan JSON = 401, tanpa oracle format");
  assert.equal(await n("sensor_baca"), 0);
});

uji("sensor: alat nonaktif 403, waktu menyimpang dan nilai buruk 400", async () => {
  await semai();
  assert.equal((await kirim(bacaan({alat: "mati-001"}), {kunci: kunciHex("mati-001")})).status, 403);
  const jauh = await kirim(bacaan({waktu: Date.now() - 11 * 60e3})); assert.equal(jauh.status, 400); assert.ok(jauh.j.kini > 0, "server menyebut jamnya agar alat bisa menyetel");
  assert.equal((await kirim(bacaan({waktu: Date.now() + 11 * 60e3}))).status, 400);
  assert.equal((await kirim(bacaan({waktu: "bukan"}))).status, 400);
  for (const x of [{nilai: {}}, {nilai: []}, {nilai: {tma_cm: "1"}}, {nilai: {"Besar": 1}}, {nilai: {a: 1e10}}, {baterai: 101}, {rssi: 5}, {baterai: "penuh"}])
    assert.equal((await kirim(bacaan(x))).status, 400, JSON.stringify(x));
  assert.equal((await kirim(bacaan({waktu: Date.now() - 9 * 60e3}))).status, 200, "9 menit masih diterima");
  assert.equal(await n("sensor_baca"), 1);
});

uji("sensor: batas laju per alat 429 tanpa menulis", async () => {
  await semai(); const t0 = Date.now();
  for (let i = 0; i < 30; i++) assert.equal((await kirim(bacaan({waktu: t0 - i}))).status, 200, "bacaan " + i);
  assert.equal((await kirim(bacaan({waktu: t0 + 1}))).status, 429);
  assert.equal(await n("sensor_baca"), 30);
  await semai(); const b = bacaan();
  for (let i = 0; i < 30; i++) assert.equal((await kirim(b)).status, 200, "duplikat " + i);
  assert.equal((await kirim(b)).status, 429, "kiriman duplikat bertanda sah ikut dihitung");
  assert.equal(await n("sensor_baca"), 1);
});

uji("sensor: ambang terlewati menulis pengingat sekali per tingkat per hari, bukan peringatan publik", async () => {
  await semai(); const lihat = async () => (await DB.prepare("SELECT keadaan, judul, status, prov, kab FROM pengingat WHERE jenis = 'sensor_ambang' ORDER BY keadaan").all()).results;
  const peringatanAwal = await n("peringatan");
  assert.equal((await kirim(bacaan({nilai: {tma_cm: 199}}))).j.tingkat, null); assert.equal((await lihat()).length, 0);
  assert.equal((await kirim(bacaan({waktu: Date.now() - 1000, nilai: {tma_cm: 250}}))).j.tingkat, "waspada");
  assert.equal((await kirim(bacaan({waktu: Date.now() - 2000, nilai: {tma_cm: 260}}))).j.tingkat, "waspada");
  let l = await lihat(); assert.equal(l.length, 1, "waspada kedua di hari yang sama tidak menggandakan"); assert.match(l[0].keadaan, /^waspada:\d{4}-\d\d-\d\d$/); assert.equal(l[0].kab, "Banjarnegara"); assert.equal(l[0].status, "baru");
  assert.match(l[0].judul, /tma-001/);
  assert.equal((await kirim(bacaan({waktu: Date.now() - 3000, nilai: {tma_cm: 450}}))).j.tingkat, "awas");
  l = await lihat(); assert.deepEqual(l.map(x => x.keadaan.split(":")[0]), ["awas", "waspada"]);
  assert.equal(await n("peringatan"), peringatanAwal, "bacaan sensor belum terverifikasi: tidak masuk peringatan publik");
});

uji("sensor: status hanya untuk staf, memuat bacaan terakhir dan umur, tanpa kunci", async () => {
  await semai(); await kirim(bacaan({waktu: Date.now() - 1000, nilai: {tma_cm: 310}}));
  assert.equal((await call("GET", "/api/sensor/status", orig)).status, 403);
  const s = await call("GET", "/api/sensor/status", STAF); assert.equal(s.status, 200); assert.match(s.cc, /no-store/);
  const a = s.j.alat.find(x => x.id === ALAT), m = s.j.alat.find(x => x.id === "mati-001");
  assert.deepEqual(a.nilai, {tma_cm: 310}); assert.equal(a.tingkat, "siaga"); assert.ok(a.umur_detik >= 0 && a.umur_detik < 60); assert.equal(a.basi, false); assert.equal(a.aktif, true);
  assert.equal(m.nilai, null); assert.equal(m.basi, true); assert.equal(m.aktif, false);
  assert.ok(!JSON.stringify(s.j).includes(kunciHex(ALAT)) && !JSON.stringify(s.j).includes(FP), "kunci/sidik jari tidak keluar"); assert.ok(!("kunci_hash" in a));
  assert.equal((await call("GET", "/api/sensor/status", ADMIN)).status, 200);
});

uji("sensor: vektor acuan gateway (penanda.py) cocok dengan verifier Worker dan kunci turunan", async () => {
  const {tandaSah} = await import("../../src/sensor.js");
  const badan = Buffer.from('{"alat":"TMA-UJI-01","waktu":"2026-11-01T03:04:05Z","nilai":{"tinggi_cm":123.4},"baterai":3.98,"rssi":-97}');
  assert.equal(await tandaSah("kunci-uji-0123456789abcdef", badan, "b1060823fee36760d80b898de09155a46d3edde02eef7212418c118d0a942e7b"), true, "vektor tests/sensor/test_tanda.py");
  assert.equal(await tandaSah("kunci-uji-0123456789abcdef", Buffer.from(badan.toString().replace("123.4", "123.5")), "b1060823fee36760d80b898de09155a46d3edde02eef7212418c118d0a942e7b"), false);
  await semai(); await DB.prepare("INSERT INTO sensor_alat (id, jenis, kunci_hash, aktif, dibuat) VALUES ('TMA-UJI-01', 'tma', ?, 1, 1)").bind(FP).run();
  const r = await kirim(null, {mentah: badan.toString(), tanda: createHmac("sha256", kunciHex("TMA-UJI-01")).update(badan).digest("hex")});
  assert.equal(r.status, 400, "tanda sah (lolos 401) tetapi waktu 2026-11-01T03:04:05Z jauh dari kini"); assert.ok(r.j.kini > 0);
  assert.equal((await kirim(null, {mentah: badan.toString(), tanda: createHmac("sha256", "kunci-uji-0123456789abcdef").update(badan).digest("hex")})).status, 401, "kunci bukan turunan induk ditolak");
});

uji("sensor: nilai null (sensor rusak) tersimpan tanpa dinilai ambang, tidak dipaksa nol", async () => {
  await semai();
  const r = await kirim(bacaan({nilai: {tma_cm: null}})); assert.equal(r.status, 200); assert.equal(r.j.tingkat, null);
  assert.deepEqual(JSON.parse((await DB.prepare("SELECT nilai FROM sensor_baca").first()).nilai), {tma_cm: null});
  assert.equal((await DB.prepare("SELECT count(*) n FROM pengingat WHERE jenis = 'sensor_ambang'").first()).n, 0);
  assert.equal((await kirim(bacaan({waktu: Date.now() - 1000, nilai: {tma_cm: null, curah: 450}}))).j.tingkat, null, "kunci tanpa ambang diabaikan");
  assert.equal((await call("GET", "/api/sensor/status", STAF)).j.alat.find(x => x.id === ALAT).tingkat, null);
});

uji("sensor: waktu_asli bacaan tertunda disimpan sebagai waktu ukur, batas 24 jam, dedupe per waktu ukur", async () => {
  await semai(); const asli = Date.now() - 5 * 3600e3;
  const a = await kirim(bacaan({waktu: Date.now(), waktu_asli: new Date(asli).toISOString()})); assert.equal(a.status, 200, JSON.stringify(a.j));
  assert.equal((await DB.prepare("SELECT waktu FROM sensor_baca").first()).waktu, Math.round(asli / 1000) * 1000 === asli ? asli : Math.round(new Date(asli).getTime()));
  assert.equal((await kirim(bacaan({waktu: Date.now(), waktu_asli: new Date(asli).toISOString()}))).j.duplikat, true);
  assert.equal((await kirim(bacaan({waktu_asli: Date.now() - 25 * 3600e3}))).status, 400);
  assert.equal((await kirim(bacaan({waktu_asli: Date.now() + 3600e3}))).status, 400);
  assert.equal((await kirim(bacaan({waktu_asli: "bukan"}))).status, 400);
  assert.equal(await n("sensor_baca"), 1);
});

const kirimLapor = async (badan, kunci = kunciHex("GW-01")) => {
  const teks = JSON.stringify(badan), r = await mf.dispatchFetch("http://logbook.lokal/api/sensor/lapor", {method: "POST", headers: {"content-type": "application/json", "x-sensor-tanda": createHmac("sha256", kunci).update(teks).digest("hex")}, body: teks});
  return {status: r.status, j: await r.json().catch(() => null)};
};
const lapor = (x = {}) => ({alat: "GW-01", waktu: Date.now(), pengirim_node: "!a1b2c3d4", teks: "Longsor di RT 03, 2 rumah tertimbun, jalan putus", ...x});

uji("sensor: lapor dari gateway tersimpan, masuk antrean pengingat, kontrol dibuang, dedupe", async () => {
  await semai(); const b = lapor({teks: "Longsor\u0000 di RT 03\n\tjalan putus\u202e"});
  const a = await kirimLapor(b); assert.equal(a.status, 200, JSON.stringify(a.j));
  const row = await DB.prepare("SELECT teks, pengirim_node FROM sensor_lapor").first(); assert.equal(row.teks, "Longsor  di RT 03 jalan putus".replace("  ", " ")); assert.equal(row.pengirim_node, "!a1b2c3d4");
  const p = (await DB.prepare("SELECT judul, rincian, kab, status FROM pengingat WHERE jenis = 'sensor_lapor'").all()).results;
  assert.equal(p.length, 1); assert.match(p[0].judul, /Laporan desa via radio mesh/); assert.equal(p[0].kab, "Banjarnegara"); assert.equal(p[0].status, "baru");
  assert.equal((await kirimLapor(b)).j.duplikat, true); assert.equal(await n("sensor_lapor"), 1);
  assert.equal((await kirimLapor({...b, teks: "Teks lain di waktu dan node yang sama"})).j.duplikat, undefined, "teks beda = laporan beda");
  assert.equal(await n("sensor_lapor"), 2);
  assert.equal((await DB.prepare("SELECT count(*) n FROM pengingat WHERE jenis = 'sensor_lapor'").first()).n, 2);
});

uji("sensor: lapor ditolak bila tanda salah, bukan gateway, nonaktif, input buruk, atau melewati laju", async () => {
  await semai();
  assert.equal((await kirimLapor(lapor(), "salah")).status, 401);
  assert.equal((await kirimLapor(lapor({alat: ALAT}), kunciHex(ALAT))).status, 403, "alat sensor biasa tidak boleh melapor");
  assert.equal((await kirim(bacaan({alat: "GW-01"}), {kunci: kunciHex("GW-01")})).status, 403, "gateway tidak mengirim bacaan");
  await DB.prepare("UPDATE sensor_alat SET aktif = 0 WHERE id = 'GW-01'").run(); assert.equal((await kirimLapor(lapor())).status, 403);
  await DB.prepare("UPDATE sensor_alat SET aktif = 1 WHERE id = 'GW-01'").run();
  assert.equal((await kirimLapor(lapor({waktu: Date.now() - 11 * 60e3}))).status, 400);
  for (const x of [{teks: ""}, {teks: "   "}, {teks: "x".repeat(501)}, {teks: 5}, {pengirim_node: ""}, {pengirim_node: "a b"}, {pengirim_node: "n".repeat(41)}])
    assert.equal((await kirimLapor(lapor(x))).status, 400, JSON.stringify(x).slice(0, 40));
  assert.equal(await n("sensor_lapor"), 0);
  await DB.prepare("DELETE FROM laju_bnpb").run();   // kiriman bertanda sah yang ditolak di atas ikut terhitung
  for (let i = 0; i < 30; i++) assert.equal((await kirimLapor(lapor({pengirim_node: "n" + i}))).status, 200);
  assert.equal((await kirimLapor(lapor({pengirim_node: "nlebih"}))).status, 429); assert.equal(await n("sensor_lapor"), 30);
});

uji("logbook: dummy hanya Super Admin, isi lengkap semua kolom dan ember, 409 bila ada, hapus bersih", async () => {
  const dum = (h, aksi) => call("POST", "/api/logbook/dummy", h, {aksi});
  const asli = await n("logbook_kejadian"), entriAsli = await n("logbook_entri");
  for (const h of [orig, LUAR, STAF]) assert.equal((await dum(h, "isi")).status, 403);
  assert.equal((await dum(ADMIN, "nyasar")).status, 400);
  const a = await dum(ADMIN, "isi"); assert.equal(a.status, 201, JSON.stringify(a.j));
  assert.equal((await dum(ADMIN, "isi")).status, 409, "gerbang menghitung baris dummy yang masih hidup");
  assert.equal(await n("logbook_kejadian"), asli + a.j.kejadian); assert.equal(await n("logbook_entri"), entriAsli + a.j.entri);
  const kej = (await DB.prepare("SELECT status, jenis FROM logbook_kejadian WHERE dummy = 1").all()).results;
  assert.ok(kej.some(k => k.status === "buka") && kej.some(k => k.status === "tutup"), "tiap ember status terisi");
  const ent = (await DB.prepare("SELECT e.* FROM logbook_entri e JOIN logbook_kejadian k ON k.id = e.kejadian_id WHERE k.dummy = 1").all()).results;
  for (const kol of ["md", "hilang", "luka", "mengungsi_jiwa", "mengungsi_kk", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam", "luas_ha"]) assert.ok(ent.some(e => e[kol] > 0), kol + " berangka di minimal satu entri dummy");
  assert.ok(ent.every(e => e.mengungsi_kk == null || e.mengungsi_kk <= e.mengungsi_jiwa));
  assert.ok(ent.some(e => JSON.parse(e.kendala).length) && ent.some(e => JSON.parse(e.kebutuhan).length));
  const sekarang = Date.now(), tgl = new Date(sekarang - 7 * 3600e3).toISOString().slice(0, 10);
  const h = await call("GET", "/api/logbook/hari?tgl=" + new Date(sekarang).toISOString().slice(0, 10)); assert.ok(h.j.entri.some(e => e.dummy === true), "entri dummy muncul di periode berjalan");
  assert.ok(tgl);
  const env = {DB, ASSETS: {fetch: async () => new Response("", {status: 404})}};
  await buatPengingat(env, Date.now(), {hanya: ["logbook_lanjutan"]});
  assert.equal((await DB.prepare("SELECT count(*) n FROM pengingat WHERE jenis = 'logbook_lanjutan' AND dummy = 0 AND sumber_id IN (SELECT id FROM logbook_kejadian WHERE dummy = 1)").first()).n, 0, "pengingat nyata tidak memuat kejadian dummy");
  await buatPengingat(env, Date.now(), {dummy: 1, hanya: ["logbook_lanjutan"]});
  assert.equal((await DB.prepare("SELECT count(*) n FROM pengingat WHERE jenis = 'logbook_lanjutan' AND dummy = 1").first()).n, 1, "kejadian dummy yang macet 30 jam jadi pengingat dummy");
  const x = await dum(ADMIN, "hapus"); assert.equal(x.status, 200);
  assert.equal(await n("logbook_kejadian"), asli); assert.equal(await n("logbook_entri"), entriAsli);
  assert.equal((await DB.prepare("SELECT count(*) n FROM pengingat WHERE jenis = 'logbook_lanjutan' AND sumber_id NOT IN (SELECT id FROM logbook_kejadian)").first()).n, 1 - 1 + (await DB.prepare("SELECT count(*) n FROM pengingat WHERE jenis = 'logbook_lanjutan' AND dummy = 1").first()).n, "pengingat dummy tersisa hanya yang dibuat tombol pengingat");
  assert.equal((await dum(ADMIN, "isi")).status, 201, "isi lagi sesudah hapus");
  await dum(ADMIN, "hapus");
});

uji("logbook: tulis dibatasi 120 per pelaku per jam, pelaku lain tidak terganggu", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  await DB.batch(Array.from({length: 120}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES ('lb:staf:s1s1s1s1s1s1s1s1', 'logbook_tulis', ?)").bind(Date.now())));
  const a = await call("POST", "/api/logbook/kejadian", STAF, baru); assert.equal(a.status, 429);
  assert.equal((await call("POST", "/api/logbook/kejadian/ffffffffffffffff/tutup", STAF, {})).status, 429);
  assert.equal((await call("POST", "/api/logbook/kejadian", ADMIN, baru)).status, 201, "pelaku lain tetap boleh");
  await DB.prepare("DELETE FROM laju_bnpb").run();
});
