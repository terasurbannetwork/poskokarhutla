/* Siklus Bencana: cangkang layaniSk dan bagian Siklus src/hak.js. UJ-KP-01, 02, 04, 05, 08, 10 (RENCANA-UJI) bagian cangkang; matriks tabel sk_* sel demi sel.
   worker.js utuh di Miniflare + D1 sungguhan. Jalankan: node --test tests/warga/siklus_peran.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, PB, ADMIN, kjAcak} from "./_siklus.mjs";
import * as H from "../../src/hak.js";
import {RUTE_SIKLUS as RK} from "../../src/siklus_kejadian.js";
import {RUTE_SIKLUS_PAPARAN} from "../../src/siklus_paparan.js";
import {RUTE_SIKLUS_KAJI} from "../../src/siklus_kaji.js";
import {RUTE_SIKLUS_PULIH} from "../../src/siklus_pulih.js";
import {RUTE_SIKLUS_DUMMY} from "../../src/siklus_dummy.js";
const RUTE_SIKLUS = {...RK, ...RUTE_SIKLUS_PAPARAN, ...RUTE_SIKLUS_KAJI, ...RUTE_SIKLUS_PULIH, ...RUTE_SIKLUS_DUMMY};

const U = await mulai("uji-sk-peran");
const {DB, api, GET, POST, n} = U;
const [PD, KO, PM, UDARA] = [await U.staf("Pd Uji", ["pusdalops"]), await U.staf("Ko Uji", ["koordalops"]), await U.staf("Pm Uji", ["pimpinan"]), await U.staf("Udara Uji", ["udara"])];
const BP = await U.bp(), {SA, MOD, TAMU} = U;

/* ---------- matriks rute x aktor (KEAMANAN 1): tiap sel peran salah DITOLAK, tiap peran sah lolos gerbang ---------- */
const ID = "KJ-2026-9A2WGN3G", SID = "0123456789abcdef";
const SEMUA = {PD, KO, PM, SA, MOD, BP, TAMU};
const RUTE = [   // [kunci, jalur uji, aktor yang BOLEH]
  ["GET /api/siklus/kejadian", "/kejadian", "PD KO PM SA MOD BP"],
  ["GET /api/siklus/kejadian/arsip", "/kejadian/arsip?tahun=2020&prov=32", "PD KO PM SA MOD BP"],
  ["GET /api/siklus/kejadian/:id", `/kejadian/${ID}`, "PD KO PM SA MOD BP"],
  ["POST /api/siklus/kejadian", "/kejadian", "PD KO SA"],
  ["POST /api/siklus/kejadian/:id/promosi", `/kejadian/${ID}/promosi`, "PD KO SA"],
  ["POST /api/siklus/kejadian/:id/fase", `/kejadian/${ID}/fase`, "PD KO SA"],
  ["POST /api/siklus/kejadian/:id/publik", `/kejadian/${ID}/publik`, "KO SA"],
  ["POST /api/siklus/kejadian/:id/gabung", `/kejadian/${ID}/gabung`, "KO SA"],
  ["POST /api/siklus/kejadian/:id/koreksi", `/kejadian/${ID}/koreksi`, "KO SA"],
  ["GET /api/siklus/antrean", "/antrean", "PD KO SA"],
  ["POST /api/siklus/antrean/:sid", `/antrean/${SID}`, "PD KO SA"],
  ["GET /api/siklus/jejak", `/jejak?id=${ID}`, "PD KO PM SA MOD"],
  ["GET /api/siklus/paparan/ringkas", "/paparan/ringkas?prov=32", "PD KO PM SA MOD"],
  ["GET /api/siklus/paparan/kab", "/paparan/kab?kab4=3201", "PD KO PM SA MOD BP"],
  ["GET /api/siklus/fasilitas", "/fasilitas?kab4=3201", "PD KO PM SA BP"],
  ["GET /api/siklus/paparan/rinci", "/paparan/rinci?kab4=3201", "PD KO SA BP"],
  ["GET /api/siklus/kaji", `/kaji?kejadian_id=${ID}`, "PD KO PM SA MOD BP"],
  ["GET /api/siklus/kaji/:sid", `/kaji/${SID}`, "PD KO PM SA MOD BP"],
  ["POST /api/siklus/kaji/:sid/status", `/kaji/${SID}/status`, "PD KO SA"],
  ["GET /api/siklus/pulih", `/pulih?kejadian_id=${ID}`, "PD KO PM SA MOD BP"],
  ["GET /api/siklus/pulih/:sid", `/pulih/${SID}`, "PD KO PM SA MOD BP"],
  ["POST /api/siklus/pulih", "/pulih", "KO SA"],
  ["POST /api/siklus/pulih/:sid/baris", `/pulih/${SID}/baris`, "PD KO SA BP"],
  ["POST /api/siklus/pulih/:sid/hitung", `/pulih/${SID}/hitung`, "PD KO SA"],
  ["POST /api/siklus/pulih/:sid/status", `/pulih/${SID}/status`, "KO SA"],
  ["GET /api/siklus/harga", "/harga?sektor=perumahan", "PD KO PM SA MOD"],
  ["POST /api/siklus/harga", "/harga", "PD KO SA"],
  ["POST /api/siklus/r3p", "/r3p", "KO SA"],
  ["POST /api/siklus/r3p/:sid/status", `/r3p/${SID}/status`, "KO SA"],
  ["POST /api/siklus/r3p/:sid/kegiatan", `/r3p/${SID}/kegiatan`, "KO SA"],
  ["GET /api/siklus/r3p/:sid", `/r3p/${SID}`, "PD KO PM SA MOD BP"],
  ["POST /api/siklus/r3p/:sid/setuju", `/r3p/${SID}/setuju`, "PM"],
  ["GET /api/siklus/saya", "/saya", "PD KO PM SA MOD"],
  ["POST /api/siklus/dummy", "/dummy", "SA"],
];
uji("matriks: semua rute berkunci peran ada di tabel, dan tabel tidak punya rute yang tak diuji", () => {
  const dikenal = new Set(RUTE.map(r => r[0])), tabel = Object.entries(RUTE_SIKLUS).filter(([, d]) => !d.izin.includes("tamu") && !d.izin.includes("sistem")).map(([k]) => k);
  assert.deepEqual([...dikenal].sort(), tabel.sort());
});
for (const [kunci, jalur, ok] of RUTE) uji(`UJ-KP-01: ${kunci}: peran salah ditolak, peran sah lolos gerbang`, async () => {
  const [metode] = kunci.split(" "), boleh = new Set(ok.split(" "));
  const sebelum = await n("sk_jejak", "aksi != 'baca_rinci'");   // pembacaan rinci yang sah memang mencatat; yang ditolak tidak
  for (const [nama, a] of Object.entries(SEMUA)) {
    const r = metode === "GET" ? await GET(a, jalur) : await POST(a, jalur, {});
    if (boleh.has(nama)) assert.ok(![401, 403].includes(r.s), `${nama} ${kunci} harus lolos gerbang peran, dapat ${r.s} ${r.t}`);
    else assert.equal(r.s, nama === "TAMU" ? 401 : 403, `${nama} ${kunci}: tamu 401, peran salah 403 (dapat ${r.s} ${r.t})`);
  }
  assert.equal(await n("sk_jejak", "aksi != 'baca_rinci'"), sebelum, "penolakan tidak menulis jejak");
});
uji("UJ-KP-01: staf berperan di luar pusdalops/koordalops/pimpinan ditolak 403; tamu 401 (rute staf), BP lewat /api/siklus ditolak 401", async () => {
  assert.equal((await GET(UDARA, "/kejadian")).s, 403);
  assert.equal((await GET(TAMU, "/kejadian")).s, 401);
  assert.equal((await api("GET", "/api/siklus/kejadian", undefined, BP.h)).s, 401, "cookie BP berpath /api/instansi; jalur staf tidak mengenalnya");
});

uji("rute tidak ada 404, metode lain 405 (jalur ada), id tak berformat KJ- 404", async () => {
  assert.equal((await GET(PD, "/tidak-ada")).s, 404);
  const r = await api("POST", "/api/siklus/antrean", {}, PD.hp); assert.equal(r.s, 405); assert.match(r.h.get("allow"), /GET/);
  assert.equal((await GET(PD, "/kejadian/abc")).s, 404);
  assert.equal((await GET(PD, "/kejadian/KJ-2026-9A2WGN3I")).s, 404, "alfabet Crockford tanpa I");
  assert.equal((await api("PATCH", "/api/siklus/kejadian", {}, PD.hp)).s, 405, "jalur ada, metode PATCH tidak ada");
  assert.equal((await api("PATCH", "/api/siklus/tidak-ada", {}, PD.hp)).s, 404);
});

uji("UJ-KP-04: POST tanpa x-pb: 1 ditolak 403 dan tidak menulis", async () => {
  const sebelum = await n("sk_kejadian");
  const r = await api("POST", "/api/siklus/kejadian", {jenis: "banjir", nama: "Banjir uji", kab4: "3201", mulai: "2026-03-02"}, {cookie: KO.h.cookie, origin: "http://bnpb.lokal"});
  assert.equal(r.s, 403); assert.match(r.t, /x-pb/);
  assert.equal(await n("sk_kejadian"), sebelum);
});
uji("UJ-KP-05: Origin lain atau kosong tanpa Sec-Fetch-Site same-origin ditolak 403 (tolakOrigin)", async () => {
  const badan = {jenis: "banjir", nama: "Banjir uji", kab4: "3201", mulai: "2026-03-02"};
  for (const origin of ["https://jahat.example", "null"]) {
    const r = await api("POST", "/api/siklus/kejadian", badan, {cookie: KO.h.cookie, "x-pb": "1", origin}); assert.equal(r.s, 403, origin);
  }
  const r2 = await U.mf.dispatchFetch("http://bnpb.lokal/api/siklus/kejadian", {method: "POST", headers: {cookie: KO.h.cookie, "x-pb": "1", "content-type": "application/json"}, body: JSON.stringify(badan)});
  assert.equal(r2.status, 403, "Origin kosong tanpa Sec-Fetch-Site"); await r2.text();
  assert.equal(await n("sk_kejadian"), 0);
});

uji("gerbang peran lebih dulu dari D1: tamu pada rute staf ditolak sebelum menyentuh tabel (tabel sk_* dihapus tidak mengubah jawaban 401)", async () => {
  const S = await (await import("./_siklus.mjs")).mulai("uji-sk-503");
  await S.DB.prepare("DROP TABLE sk_jejak").run(); await S.DB.prepare("DROP TABLE sk_kejadian_sumber").run(); await S.DB.prepare("DROP TABLE sk_kejadian_alias").run(); await S.DB.prepare("DROP TABLE sk_kejadian_kab").run(); await S.DB.prepare("DROP TABLE sk_kejadian").run();
  assert.equal((await S.GET(S.TAMU, "/kejadian")).s, 401);
  const ko = await S.staf("Ko", ["koordalops"]);
  const r = await S.GET(ko, "/kejadian"); assert.equal(r.s, 503, "sk_* belum ada = 503 jelas"); assert.doesNotMatch(r.t, /0120|migrasi/i, "503 tanpa nama migrasi");
  assert.equal((await S.GET(S.TAMU, `/publik/kejadian/${ID}`)).s, 503);
});

uji("jawaban staf private, no-store; SIKLUS_MATI=1 memberi 503 untuk semua jalur", async () => {
  const r = await GET(PD, "/kejadian"); assert.equal(r.s, 200); assert.match(r.h.get("cache-control"), /private, no-store/); assert.match(r.h.get("vary") || "", /cookie/i);
  const M = await (await import("./_siklus.mjs")).mulai("uji-sk-mati", {ikat: {SIKLUS_MATI: "1"}});
  for (const j of ["/api/siklus/kejadian", "/siklus", "/siklus/siklus.js", `/api/siklus/publik/kejadian/${ID}`, "/api/instansi/siklus/kejadian", "/api/siklus/ingest/jendela"]) assert.equal((await M.api("GET", j, undefined, ADMIN)).s, 503, j);
});

/* ---------- bagian Siklus src/hak.js ---------- */
const PELAKU = {sistem: H.pelakuSistem, sk_staf: H.pelakuSkStaf, sk_instansi: H.pelakuSkInstansi, admin: H.pelakuAdmin};
const AKSI = ["baca", "tambah", "ubah", "hapus"];
uji("MATRIKS sk_*: tiap sel (tabel x pelaku x aksi) sama dengan KEAMANAN; hapus hanya admin; instansi tidak menulis kejadian", () => {
  assert.deepEqual(Object.keys(H.MATRIKS_SK).sort(), ["sk_harga", "sk_jejak", "sk_jitupasna", "sk_jitupasna_baris", "sk_kaji", "sk_kejadian", "sk_kejadian_alias", "sk_kejadian_kab", "sk_kejadian_sumber", "sk_r3p", "sk_r3p_kegiatan"]);
  for (const t of Object.keys(H.MATRIKS_SK)) {
    assert.ok(H.MATRIKS[t], `${t} tidak masuk MATRIKS`);
    for (const [nama, p] of Object.entries(PELAKU)) for (const a of AKSI) assert.equal(H.boleh(p, t, a), !!H.MATRIKS_SK[t][nama]?.includes(a), `${t}.${a} oleh ${nama}`);
    for (const nama of ["sistem", "sk_staf", "sk_instansi"]) assert.equal(H.boleh(PELAKU[nama], t, "hapus"), false, `${t}.hapus oleh ${nama}`);
  }
  for (const t of Object.keys(H.MATRIKS_SK).filter(t => t !== "sk_jejak" && t !== "sk_jitupasna_baris")) for (const a of ["tambah", "ubah", "hapus"]) assert.equal(H.boleh(H.pelakuSkInstansi, t, a), false, `BP ${a} ${t}`);
  assert.equal(H.boleh(H.pelakuSkInstansi, "sk_jejak", "tambah"), true, "BP boleh mencatat jejak (baca rinci, G3)");
  assert.equal(H.boleh(H.pelakuSkInstansi, "sk_jitupasna_baris", "tambah"), true, "BP mengisi baris Jitupasna wilayahnya (G3)");
  assert.equal(H.boleh(H.pelakuSistem, "sk_kejadian", "ubah"), false, "ingest tidak mengubah kejadian");
});
uji("SK-060 UJ-KP-01: matriks sk_kaji: BP hanya baca; staf mengubah status tetapi tidak menambah; sistem menambah tetapi tidak mengubah; hanya admin menghapus", () => {
  assert.deepEqual(H.MATRIKS_SK.sk_kaji, {sistem: ["baca", "tambah"], sk_staf: ["baca", "ubah"], sk_instansi: ["baca"], admin: ["baca", "tambah", "ubah", "hapus"]});
  for (const a of ["tambah", "ubah", "hapus"]) assert.equal(H.boleh(H.pelakuSkInstansi, "sk_kaji", a), false, `BP ${a} sk_kaji`);
  assert.equal(H.boleh(H.pelakuSkStaf, "sk_kaji", "tambah"), false); assert.equal(H.boleh(H.pelakuSistem, "sk_kaji", "ubah"), false);
});
uji("SK-060 UJ-KP-03: kaji, PM baca saja (status 403) dan BP luar lingkup 404 di kedua awalan; WG 401", async () => {
  const k = await U.kej(KO, {nama: "Gempa peran", jenis: "gempa"}), BP2 = await U.bp({kab: "Garut"});
  const w = await api("POST", "/api/siklus/ingest/kaji", {kejadian_id: k, model: "gempa", masukan: {a: 1}, ringkas: {rentang: [1, 2]}}, {authorization: "Bearer token-pipa-uji"}); assert.equal(w.s, 201, w.t);
  for (const a of [PD, KO, PM, SA, MOD, BP]) assert.equal((await GET(a, `/kaji/${w.j.id}`)).s, 200, a.via);
  assert.equal((await POST(PM, `/kaji/${w.j.id}/status`, {ke: "diperiksa"})).s, 403);
  assert.equal((await POST(BP, `/kaji/${w.j.id}/status`, {ke: "diperiksa"})).s, 403);
  assert.equal((await POST(PD, `/kaji/${w.j.id}/status`, {ke: "diperiksa"})).s, 200);
  const luar = await GET(BP2, `/kaji/${w.j.id}`), nol = await GET(BP2, "/kaji/0123456789abcdef"); assert.equal(luar.s, 404); assert.equal(luar.t, nol.t);
  assert.equal((await GET(BP2, `/kaji?kejadian_id=${k}`)).s, 404);
  assert.equal((await GET(TAMU, `/kaji/${w.j.id}`)).s, 401); assert.equal((await POST(TAMU, `/kaji/${w.j.id}/status`, {ke: "diperiksa"})).s, 401);
  assert.equal((await api("GET", `/api/instansi/siklus/kaji/${w.j.id}`, undefined, BP.h)).s, 200, "awalan instansi"); assert.equal((await api("GET", `/api/siklus/kaji/${w.j.id}`, undefined, BP.h)).s, 401, "BP di awalan staf");
});

uji("SK-067 UJ-KP-01: matriks G3: BP hanya membaca Jitupasna, R3P, kegiatan dan menambah baris; harga tak terbuka bagi BP; staf tidak menghapus; hanya admin menghapus", () => {
  for (const t of ["sk_jitupasna", "sk_r3p", "sk_r3p_kegiatan", "sk_harga", "sk_jitupasna_baris"]) { assert.equal(H.boleh(H.pelakuSkStaf, t, "hapus"), false, `staf hapus ${t}`); assert.equal(H.boleh(H.pelakuAdmin, t, "hapus"), true); assert.equal(H.boleh(H.pelakuSistem, t, "tambah"), false, `ingest tidak menulis ${t}`); }
  for (const t of ["sk_jitupasna", "sk_r3p", "sk_r3p_kegiatan"]) for (const a of ["tambah", "ubah", "hapus"]) assert.equal(H.boleh(H.pelakuSkInstansi, t, a), false, `BP ${a} ${t}`);
  assert.deepEqual(["baca", "tambah"].map(a => H.boleh(H.pelakuSkInstansi, "sk_jitupasna_baris", a)), [true, true]); assert.equal(H.boleh(H.pelakuSkInstansi, "sk_jitupasna_baris", "ubah"), false, "BP tidak membekukan nilai");
  assert.equal(H.boleh(H.pelakuSkInstansi, "sk_harga", "baca"), false);
  assert.throws(() => H.skStmtR3pSetuju({DB}, H.pelakuSkInstansi, "0123456789abcdef", "instansi:x", 1), e => e.status === 403, "BP tidak memberi tanda setuju");
  assert.throws(() => H.skStmtHargaBaru({DB}, H.pelakuSistem, {id: "0123456789abcdef", kini: 1}), e => e.status === 403);
});
uji("pembangun pernyataan tulis menolak pelaku tanpa hak (403) sebelum menyentuh D1", () => {
  const env = {DB};
  assert.throws(() => H.skStmtFase(env, H.pelakuSkInstansi, ID, "tanggap", 1), e => e instanceof H.Galat && e.status === 403);
  assert.throws(() => H.skStmtKejadianBaru(env, H.pelakuSkInstansi, {id: ID}), e => e.status === 403);
  assert.throws(() => H.skStmtAlias(env, H.pelakuSistem, ID, ID, "x", 1, "x"), e => e.status === 403);
  assert.throws(() => H.skStmtFase(env, H.pelakuSistem, ID, "tanggap", 1), e => e.status === 403);
  assert.throws(() => H.skStmtAntrean(env, H.pelakuSkInstansi, SID, "ditolak", null, null, 1), e => e.status === 403);
  assert.ok(H.skStmtFase(env, H.pelakuSkStaf, ID, "tanggap", 1));
});
uji("UJ-KP-08: skBatch menolak batch tanpa baris sk_jejak (INV-4) dan tidak menulis apa pun; dengan jejak lolos", async () => {
  const p = H.pelakuSkStaf, env = {DB: DB}, id = kjAcak(), kini = Date.now(), baru = () => H.skStmtKejadianBaru(env, p, {id, jenis: "banjir", nama: "Uji jejak", kab4: "3201", prov: "32", mulai: "2026-03-02", asal: "manual", kini, oleh: "staf:uji"});
  assert.throws(() => H.skBatch(env, p, [baru()]), e => e instanceof H.Galat && /sk_jejak/.test(e.message));
  assert.equal(await n("sk_kejadian", `id = '${id}'`), 0);
  await H.skBatch(env, p, [baru(), H.skStmtJejak(env, p, "staf:uji", "kejadian", id, "buat", null, "terdeteksi", null, kini)]);
  assert.equal(await n("sk_kejadian", `id = '${id}'`), 1); assert.equal(await n("sk_jejak", `obyek_id = '${id}'`), 1);
  const palsu = DB.prepare("INSERT INTO sk_jejak (waktu, oleh, obyek, obyek_id, aksi) VALUES (1, 'x', 'kejadian', 'x1', 'palsu')");   // jejak tulis tangan bukan dari skStmtJejak
  assert.throws(() => H.skBatch(env, p, [baru(), palsu]), e => e.status === 500);
});
uji("src/siklus*.js tidak menyentuh D1 (SQL sk_* hanya di hak.js)", async () => {
  const {readFileSync} = await import("node:fs"), {AKAR} = await import("./_bantu.mjs"), path = await import("node:path");
  for (const f of ["siklus.js", "siklus_kejadian.js", "siklus_kaji.js", "siklus_pulih.js", "siklus_kab.js", "siklus_hitung.js"]) assert.doesNotMatch(readFileSync(path.join(AKAR, "src", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""), /env\s*\.\s*DB|\.prepare\s*\(|\.batch\s*\(/, f);
});

/* ---------- paparan (SK-038): UJ-F2-07, UJ-KP-02, UJ-KP-03 ---------- */
const R2 = await U.mf.getR2Bucket("MEDIA");
const RINCI = {v: 1, rahasia: "isi-rinci-3201"};
await R2.put("siklus/saji/paparan/rinci/3201.json", JSON.stringify(RINCI));
await R2.put("siklus/saji/_dummy/paparan/rinci/3201.json", JSON.stringify({v: 1, dummy: true, rahasia: "contoh-rinci"}));
uji("UJ-KP-02: rinci tanpa sesi ditolak sebelum R2 (isi tak bocor), tamu tidak bisa membedakan berkas ada atau tidak", async () => {
  const ada = await GET(TAMU, "/paparan/rinci?kab4=3201"), tidak = await GET(TAMU, "/paparan/rinci?kab4=3301");
  assert.equal(ada.s, 401); assert.equal(ada.t, tidak.t); assert.doesNotMatch(ada.t, /rahasia/);
  assert.equal((await GET(PM, "/paparan/rinci?kab4=3201")).s, 403, "PM tidak membaca rinci");
  assert.equal((await GET(PM, "/fasilitas?kab4=3201")).s, 404, "PM fasilitas lolos gerbang (berkas belum ada)");
});
uji("UJ-F2-07: rinci dicatat baca_rinci di sk_jejak; berkas dialirkan apa adanya; BP luar lingkup 404 seragam; kab4 salah 400", async () => {
  const sebelum = await n("sk_jejak", "aksi = 'baca_rinci'");
  const r = await GET(PD, "/paparan/rinci?kab4=3201"); assert.equal(r.s, 200); assert.deepEqual(r.j, RINCI); assert.match(r.h.get("cache-control"), /no-store/);
  assert.equal(await n("sk_jejak", "aksi = 'baca_rinci' AND obyek_id = '3201'"), sebelum + 1);
  assert.equal((await GET(BP, "/paparan/rinci?kab4=3201")).s, 200, "BP Bogor, wilayahnya");
  assert.equal(await n("sk_jejak", "aksi = 'baca_rinci'"), sebelum + 2);
  const luar = await GET(BP, "/paparan/rinci?kab4=3301"), takAda = await GET(BP, "/paparan/rinci?kab4=3201&x=1&contoh=");
  assert.equal(luar.s, 404); assert.equal(await n("sk_jejak", "aksi = 'baca_rinci'"), sebelum + 2, "penolakan tidak menulis jejak");
  assert.equal((await GET(PD, "/paparan/rinci?kab4=12")).s, 400); assert.equal((await GET(PD, "/paparan/ringkas?prov=99")).s, 400);
  assert.equal((await GET(PD, "/paparan/rinci?kab4=3301")).s, 404, "berkas belum dibangun"); void takAda;
});
uji("UJ-F2-07: rinci 300 per jam lalu 429", async () => {
  const B2 = await U.bp(); const kini = Date.now();
  await DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) SELECT ?, 'sk.rinci', ? FROM json_each(?)").bind("sk:instansi:" + B2.id, kini, JSON.stringify(Array.from({length: 300}, (_, i) => i))).run();
  assert.equal((await GET(B2, "/paparan/rinci?kab4=3201")).s, 429);
});
uji("contoh=1: hanya SA dan hanya dari _dummy/, tidak dicampur; bentuk lain 400; tidak dicatat sebagai baca_rinci", async () => {
  const sebelum = await n("sk_jejak", "aksi = 'baca_rinci'");
  for (const a of [PD, KO, BP]) assert.equal((await GET(a, "/paparan/rinci?kab4=3201&contoh=1")).s, 403);
  const r = await GET(SA, "/paparan/rinci?kab4=3201&contoh=1"); assert.equal(r.s, 200); assert.equal(r.j.rahasia, "contoh-rinci");
  assert.equal((await GET(SA, "/paparan/rinci?kab4=3301&contoh=1")).s, 404, "tidak jatuh ke data nyata");
  assert.equal((await GET(SA, "/paparan/rinci?kab4=3201&contoh=2")).s, 400);
  assert.equal(await n("sk_jejak", "aksi = 'baca_rinci'"), sebelum);
});
uji("paparan ringkas, kab, fasilitas: berkas dialirkan apa adanya, masukan salah 400, BP luar lingkup 404, PM fasilitas baca", async () => {
  await R2.put("siklus/saji/paparan/32.json", '{"v":1,"p":"ringkas"}'); await R2.put("siklus/saji/paparan/kab/3201.json", '{"v":1,"p":"kab"}'); await R2.put("siklus/saji/fasilitas/3201.json", '{"v":1,"p":"fas"}');
  assert.deepEqual((await GET(PM, "/paparan/ringkas?prov=32")).j, {v: 1, p: "ringkas"});
  assert.deepEqual((await GET(BP, "/paparan/kab?kab4=3201")).j, {v: 1, p: "kab"});
  assert.deepEqual((await GET(PM, "/fasilitas?kab4=3201")).j, {v: 1, p: "fas"});
  assert.equal((await GET(BP, "/paparan/ringkas?prov=32")).s, 403, "BP tidak membaca ringkasan provinsi");
  for (const j of ["/paparan/ringkas?prov=zz", "/paparan/kab?kab4=abc", "/fasilitas"]) assert.equal((await GET(SA, j)).s, 400, j);
  assert.equal((await GET(BP, "/paparan/kab?kab4=3301")).s, 404); assert.equal((await GET(BP, "/fasilitas?kab4=3301")).s, 404);
});
uji("arsip tanpa_wilayah=1: staf saja (BP 403), dialirkan dari <tahun>/tanpa_wilayah.json, tidak bisa dipromosikan", async () => {
  await R2.put("siklus/saji/kejadian/arsip/2021/tanpa_wilayah.json", '{"v":1,"kolom":["id","jenis","mulai"],"baris":[["KJ-2021-AAAAAAAA","banjir","2021-01-02"]]}');
  const r = await GET(PD, "/kejadian/arsip?tahun=2021&tanpa_wilayah=1"); assert.equal(r.s, 200); assert.equal(r.j.baris[0][0], "KJ-2021-AAAAAAAA");
  assert.equal((await GET(BP, "/kejadian/arsip?tahun=2021&tanpa_wilayah=1")).s, 403);
  assert.equal((await GET(TAMU, "/kejadian/arsip?tahun=2021&tanpa_wilayah=1")).s, 401);
  assert.equal((await GET(PD, "/kejadian/arsip?tahun=2022&tanpa_wilayah=1")).s, 404);
  assert.notEqual((await POST(KO, "/kejadian/KJ-2021-AAAAAAAA/promosi", {tahun: 2021, kab4: "3201"})).s, 201, "baris tanpa wilayah tidak terpromosi");
  assert.equal(await n("sk_kejadian", "id = 'KJ-2021-AAAAAAAA'"), 0);
});
