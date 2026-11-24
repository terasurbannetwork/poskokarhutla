/* Keterpaduan KP-03: GET /api/siklus/ingest/modul. T1 (auth, jendela, 500 + lanjut, ms kembar), T2 (tanpa nama/WA/PIC/isi), pemetaan jenis, rencana kueri.
   worker.js utuh di Miniflare + D1 sungguhan. Jalankan: node --test tests/warga/kejadian_tautan.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, id16} from "./_siklus.mjs";
import {KT_SQL} from "../../src/hak.js";

const U = await mulai("uji-kejadian-tautan");
const {DB, api} = U;
const TOK = {authorization: "Bearer token-pipa-uji"};
const DS = "dari=2026-06-01&sampai=2026-06-30";
const GET = (q, h = TOK) => api("GET", "/api/siklus/ingest/modul?" + q, undefined, h);
const ms = t => Date.parse(t + "+07:00");   // WIB
const T = ms("2026-06-10T03:00:00");
const jalan = (sql, ...b) => DB.prepare(sql).bind(...b).run();

const logbook = (o = {}) => jalan("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, terakhir, dibuat, diubah, dummy) VALUES (?,?,?,?,?,?,?,?,?)",
  o.id ?? id16(), o.jenis ?? "banjir", "32", o.kab ?? "Bogor", o.mulai ?? "2026-06-10", T, o.dibuat ?? T, T, o.dummy ?? 0);
const tugasApi = (o = {}) => jalan("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi, dummy) VALUES (?,?,?,?,?,?,?,?,?)", o.id ?? id16(), "14", o.kab ?? "Rokan Hilir", 1, 101, 3, o.dibuat ?? T, T, o.dummy ?? 0);
let nKit = 0;
const kit = (jenis) => { const id = id16(); return jalan("INSERT INTO sippa_kit (id, kode, jenis, status, dibuat, diubah) VALUES (?,?,?,?,?,?)", id, "SIPPA-" + String(++nKit).padStart(3, "0"), jenis, "gudang", T, T).then(() => id); };
const sippaTugas = (o = {}) => jalan("INSERT INTO sippa_tugas (id, kit_id, kode_sha, nama_regu, unsur, prov, kab, mulai, berakhir, oleh, dummy) VALUES (?,?,?,?,?,?,?,?,?,?,0)",
  o.id, o.kit ?? null, id16().repeat(4), "Regu RAHASIA", "bpbd", "16", "Ogan Komering Ilir", o.mulai ?? T, (o.mulai ?? T) + 864e5, "oleh-uji");
const logGelar = (tugas, jenis) => jalan("INSERT INTO sippa_log_gelar (id, tugas_id, jenis, waktu_klien, diterima, oleh) VALUES (?,?,?,?,?,?)", id16(), tugas, jenis, T, T, "tugas:uji");
const lpTugas = (o = {}) => jalan("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, dibuat, dummy) VALUES (?,?,?,?,?,?,?,?,?,0)", o.id ?? id16(), "Judul RAHASIA", o.bencana ?? "banjir", -6.5123, 106.8349, 500, o.mulai ?? T, T + 1e6, T);
const gempa = (o = {}) => jalan("INSERT INTO gempa_kejadian (kode, utama_id, lat, lon, mulai, akhir, m, aktif_hingga) VALUES (?,?,?,?,?,?,?,?)", o.kode, "b:utama-" + o.kode, -7.1, 107.2, o.mulai ?? T, T, 5.1, T);
const operasi = async (dummy = 0) => { const id = id16(); await jalan("INSERT INTO lapsus_operasi (id, nama, jenis, mulai, dibuat, diubah, dummy) VALUES (?,?,?,?,?,?,?)", id, "Operasi RAHASIA", "gempa bumi", "2026-06-10", T, T, dummy); return id; };
const lapsus = (op, kej, dibuat = T) => jalan("INSERT INTO lapsus_kejadian (operasi_id, kejadian_id, prov, dibuat) VALUES (?,?,?,?)", op, kej, "32", dibuat);

uji("T1: tanpa Bearer 401, Bearer salah 401, sumber/jendela/lanjut tidak sah 400", async () => {
  assert.equal((await GET(`sumber=logbook_d1&${DS}`, {})).s, 401);
  assert.equal((await GET(`sumber=logbook_d1&${DS}`, {authorization: "Bearer salah"})).s, 401);
  assert.equal((await GET(DS)).s, 400, "tanpa sumber");
  assert.equal((await GET(`sumber=orang&${DS}`)).s, 400, "sumber tak dikenal");
  assert.equal((await GET("sumber=logbook_d1&dari=2026-01-01&sampai=2026-06-30")).s, 400, "rentang > 120 hari");
  assert.equal((await GET("sumber=logbook_d1&dari=2026-01-01&sampai=2026-04-30")).s, 200, "tepat 119 hari boleh");
  assert.equal((await GET("sumber=logbook_d1&dari=2026-06-30&sampai=2026-06-01")).s, 400, "dari > sampai");
  assert.equal((await GET(`sumber=logbook_d1&${DS}&lanjut=ngawur`)).s, 400);
});

uji("T1: hanya baris dalam jendela WIB (sampai inklusif sehari penuh), baris dummy tidak keluar", async () => {
  const dalam = [id16(), id16(), id16()];
  await logbook({id: dalam[0], dibuat: ms("2026-06-01T00:00:00")});
  await logbook({id: dalam[1], dibuat: ms("2026-06-30T23:59:59")});
  await logbook({id: dalam[2], dibuat: T});
  await logbook({dibuat: ms("2026-05-31T23:59:59")});
  await logbook({dibuat: ms("2026-07-01T00:00:00")});
  await logbook({dibuat: T, dummy: 1});
  const r = await GET(`sumber=logbook_d1&${DS}`); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.baris.map(x => x.kode).sort(), [...dalam].sort());
  assert.equal(r.j.lanjut, null);
  assert.equal(r.j.baris.find(x => x.kode === dalam[1]).mulai, "2026-06-10", "mulai logbook = kolom mulai");
});

uji("T1: paling banyak 500 per halaman, lanjut memuat sisanya, dua baris semilidetik di batas halaman keduanya terkirim", async () => {
  const M = await mulai("uji-kejadian-tautan-hal"), ids = [];
  const st = [];
  for (let i = 0; i < 503; i++) { const id = id16(); ids.push(id); st.push(M.DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, terakhir, dibuat, diubah) VALUES (?,?,?,?,?,?,?,?)").bind(id, "banjir", "32", "Bogor", "2026-06-10", T, T + Math.floor((i + 1) / 2), T)); }
  await M.DB.batch(st);   // baris 499 dan 500 punya dibuat sama: tepat di batas halaman
  const g = q => M.api("GET", "/api/siklus/ingest/modul?" + q, undefined, TOK);
  const h1 = await g(`sumber=logbook_d1&${DS}`); assert.equal(h1.s, 200, h1.t);
  assert.equal(h1.j.baris.length, 500); assert.ok(h1.j.lanjut);
  const h2 = await g(`sumber=logbook_d1&${DS}&lanjut=${encodeURIComponent(h1.j.lanjut)}`); assert.equal(h2.s, 200, h2.t);
  assert.equal(h2.j.baris.length, 3); assert.equal(h2.j.lanjut, null);
  assert.deepEqual([...h1.j.baris, ...h2.j.baris].map(x => x.kode).sort(), [...ids].sort(), "tidak ada yang terlewat atau ganda");
});

uji("pemetaan jenis: logbook gempabumi->gempa, gelombang_pasang->gelombang, kecelakaan/wabah dibuang", async () => {
  const M = await mulai("uji-kejadian-tautan-jenis"); const di = Object.fromEntries;
  const ids = {};
  for (const j of ["gempabumi", "gelombang_pasang", "karhutla", "kecelakaan", "wabah", "lainnya"]) { ids[j] = id16(); await M.DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, terakhir, dibuat, diubah) VALUES (?,?,?,?,?,?,?,?)").bind(ids[j], j, "32", "Bogor", "2026-06-10", T, T, T).run(); }
  const r = await M.api("GET", "/api/siklus/ingest/modul?sumber=logbook_d1&" + DS, undefined, TOK);
  assert.deepEqual(di(r.j.baris.map(x => [x.kode, x.jenis])), {[ids.gempabumi]: "gempa", [ids.gelombang_pasang]: "gelombang", [ids.karhutla]: "karhutla"});
});

uji("tugas_api: bawaan karhutla, tugas_bencana dipakai, jenis di luar JENIS_SAH (udara) dibuang", async () => {
  const M = await mulai("uji-kejadian-tautan-api"), a = id16(), b = id16(), c = id16(), d = id16();
  const ins = id => M.DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES (?,?,?,?,?,?,?,?)").bind(id, "14", "Rokan Hilir", 1, 101, 3, T, T);
  await M.DB.batch([ins(a), ins(b), ins(c), ins(d), M.DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES (?, 'banjir')").bind(b), M.DB.prepare("INSERT INTO tugas_bencana (tugas_id, bencana) VALUES (?, 'udara')").bind(c),
    M.DB.prepare("UPDATE tugas_api SET dummy = 1 WHERE id = ?").bind(d)]);
  const r = await M.api("GET", "/api/siklus/ingest/modul?sumber=tugas_api&" + DS, undefined, TOK);
  assert.deepEqual(Object.fromEntries(r.j.baris.map(x => [x.kode, x.jenis])), {[a]: "karhutla", [b]: "banjir"});
  assert.equal(r.j.baris[0].mulai, "2026-06-10"); assert.equal(r.j.baris[0].kab, "Rokan Hilir"); assert.equal(r.j.baris[0].prov, "14");
});

uji("sippa: kit banjir -> banjir, lain -> karhutla, hanya log latihan dibuang; lapangan, gempa_d1 dan lapsus", async () => {
  const kb = await kit("banjir"), kg = await kit("gambut"), [a, b, c, d] = [id16(), id16(), id16(), id16()];
  await sippaTugas({id: a, kit: kb}); await sippaTugas({id: b, kit: kg}); await sippaTugas({id: c}); await sippaTugas({id: d, kit: kg});
  await logGelar(d, "latihan"); await logGelar(c, "latihan"); await logGelar(c, "karhutla");
  const s = await GET(`sumber=sippa&${DS}`); assert.equal(s.s, 200, s.t);
  assert.deepEqual(Object.fromEntries(s.j.baris.map(x => [x.kode, x.jenis])), {[a]: "banjir", [b]: "karhutla", [c]: "karhutla"}, "d (hanya latihan) dibuang");
  const l1 = id16(), l2 = id16(); await lpTugas({id: l1, bencana: "banjir"}); await lpTugas({id: l2, bencana: "lainnya"});
  const l = await GET(`sumber=lapangan&${DS}`); assert.deepEqual(l.j.baris.map(x => x.kode), [l1]); assert.equal(l.j.baris[0].lat, -6.512); assert.equal(l.j.baris[0].lon, 106.835, "dibulatkan 3 desimal"); assert.equal(l.j.baris[0].kab, undefined, "tanpa kab: lat/lon");
  await gempa({kode: "G2026A1"});
  const g = await GET(`sumber=gempa_d1&${DS}`); assert.deepEqual(g.j.baris.map(x => [x.kode, x.jenis, x.utama_id, x.mulai]), [["G2026A1", "gempa", "b:utama-G2026A1", "2026-06-10"]]);
  const op = await operasi(), opD = await operasi(1), k1 = id16(), k2 = id16(), k3 = id16();
  await logbook({id: k1, jenis: "gempabumi"}); await logbook({id: k2, jenis: "banjir", dummy: 1}); await logbook({id: k3, jenis: "wabah"});
  await lapsus(op, k1); await lapsus(op, k2); await lapsus(op, k3); await lapsus(opD, k1);
  const p = await GET(`sumber=lapsus&${DS}`); assert.deepEqual(p.j.baris.map(x => [x.kode, x.jenis, x.kab]).sort(), [[`${op}:${k1}`, "gempa", "Bogor"]], "operasi dummy, logbook dummy, dan jenis di luar JENIS_SAH dibuang");
});

uji("T2: tak satu pun item memuat kolom nama, WA, PIC, atau isi laporan (data sendiri, penanda di kolom sensitif)", async () => {
  const M = await mulai("uji-kejadian-tautan-t2"), MK = ["PENANDA-NAMA", "PENANDA-WA", "PENANDA-PIC", "PENANDA-ISI"], ids = {};
  const x = async (sql, ...b) => M.DB.prepare(sql).bind(...b).run();
  for (const n of ["a", "b", "c", "d", "e"]) ids[n] = id16();
  await x("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi, rekomendasi, akses) VALUES (?,?,?,?,?,?,?,?,?,?)", ids.a, "14", "Rokan Hilir", 1, 101, 3, T, T, '"PENANDA-ISI"', '"PENANDA-ISI"');
  await x("INSERT INTO logbook_kejadian (id, jenis, prov, kab, desa, mulai, terakhir, dibuat, diubah, dibuat_oleh) VALUES (?,?,?,?,?,?,?,?,?,?)", ids.b, "banjir", "32", "Bogor", "PENANDA-NAMA", "2026-06-10", T, T, T, "PENANDA-PIC");
  await x("INSERT INTO sippa_tugas (id, kode_sha, nama_regu, unsur, prov, kab, mulai, berakhir, oleh) VALUES (?,?,?,?,?,?,?,?,?)", ids.c, id16().repeat(4), "PENANDA-NAMA", "bpbd", "16", "OKI", T, T + 1e3, "PENANDA-PIC");
  await x("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, wilayah_teks, mulai, selesai, dibuat, dibuat_oleh) VALUES (?,?,?,?,?,?,?,?,?,?,?)", ids.d, "PENANDA-NAMA", "banjir", -6.5, 106.8, 500, "PENANDA-ISI", T, T + 1e6, T, "PENANDA-PIC");
  await x("INSERT INTO gempa_kejadian (kode, utama_id, lat, lon, mulai, akhir, m, nama, aktif_hingga) VALUES (?,?,?,?,?,?,?,?,?)", "G2026Z9", "b:u", -7.1, 107.2, T, T, 5, "PENANDA-ISI", T);
  const op = id16(); await x("INSERT INTO lapsus_operasi (id, nama, jenis, mulai, dibuat, diubah) VALUES (?,?,?,?,?,?)", op, "PENANDA-NAMA", "gempa bumi", "2026-06-10", T, T);
  await x("INSERT INTO lapsus_kejadian (operasi_id, kejadian_id, prov, dibuat) VALUES (?,?,?,?)", op, ids.b, "32", T);
  const BOLEH = new Set(["sumber", "kode", "jenis", "prov", "kab", "lat", "lon", "mulai", "utama_id"]);
  for (const sumber of ["tugas_api", "logbook_d1", "sippa", "lapangan", "gempa_d1", "lapsus"]) {
    const r = await M.api("GET", `/api/siklus/ingest/modul?sumber=${sumber}&${DS}`, undefined, TOK); assert.equal(r.s, 200, r.t); assert.ok(r.j.baris.length, sumber + " kosong");
    for (const b of r.j.baris) for (const k of Object.keys(b)) assert.ok(BOLEH.has(k), `${sumber}: kolom ${k} tidak boleh keluar`);
    for (const m of MK) assert.ok(!r.t.includes(m), `${sumber} membocorkan ${m}`);
  }
});

uji("lanjut: tiap sumber memuat 501 baris semilidetik (cid terpanjang) dan halaman kedua memuat sisanya tanpa celah", async () => {
  const M = await mulai("uji-kejadian-tautan-semua"), op = id16();
  await M.DB.prepare("INSERT INTO lapsus_operasi (id, nama, jenis, mulai, dibuat, diubah) VALUES (?,?,?,?,?,?)").bind(op, "Operasi", "gempa bumi", "2026-06-10", T, T).run();
  const buat = {
    tugas_api: i => [M.DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES (?,?,?,?,?,?,?,?)").bind(i, "14", "Rokan Hilir", 1, 101, 3, T, T), i],
    logbook_d1: i => [M.DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, terakhir, dibuat, diubah) VALUES (?,?,?,?,?,?,?,?)").bind(i, "banjir", "32", "Bogor", "2026-06-10", T, T, T), i],
    sippa: i => [M.DB.prepare("INSERT INTO sippa_tugas (id, kode_sha, nama_regu, unsur, prov, kab, mulai, berakhir, oleh) VALUES (?,?,?,?,?,?,?,?,?)").bind(i, i.repeat(4), "Regu", "bpbd", "16", "OKI", T, T + 1e3, "oleh"), i],
    lapangan: i => [M.DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, dibuat) VALUES (?,?,?,?,?,?,?,?,?)").bind(i, "Judul", "banjir", -6.5, 106.8, 500, T, T + 1e6, T), i],
    gempa_d1: (i, n) => { const k = "G2026" + String(n).padStart(4, "0"); return [M.DB.prepare("INSERT INTO gempa_kejadian (kode, utama_id, lat, lon, mulai, akhir, m, aktif_hingga) VALUES (?,?,?,?,?,?,?,?)").bind(k, "u" + n, -7.1, 107.2, T, T, 5, T), k]; },
  };
  for (const [sumber, f] of Object.entries({...buat, lapsus: null})) {
    const st = [], ids = [];
    for (let n = 0; n < 501; n++) { if (f) { const [s, kode] = f(id16(), n); st.push(s); ids.push(kode); } }
    if (sumber === "lapsus") { st.length = 0; ids.length = 0; for (let n = 0; n < 501; n++) { const k = id16(); st.push(M.DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, terakhir, dibuat, diubah) VALUES (?,?,?,?,?,?,?,?)").bind(k, "banjir", "32", "Bogor", "2026-06-10", T, 1, T), M.DB.prepare("INSERT INTO lapsus_kejadian (operasi_id, kejadian_id, prov, dibuat) VALUES (?,?,?,?)").bind(op, k, "32", T)); ids.push(`${op}:${k}`); } }
    await M.DB.batch(st);
    const g = l => M.api("GET", `/api/siklus/ingest/modul?sumber=${sumber}&${DS}` + (l ? "&lanjut=" + encodeURIComponent(l) : ""), undefined, TOK);
    const h1 = await g(); assert.equal(h1.s, 200, h1.t); assert.equal(h1.j.baris.length, 500, sumber); assert.ok(h1.j.lanjut, sumber);
    const h2 = await g(h1.j.lanjut); assert.equal(h2.s, 200, sumber + " " + h2.t); assert.equal(h2.j.lanjut, null);
    assert.deepEqual([...h1.j.baris, ...h2.j.baris].map(x => x.kode).sort(), [...ids].sort(), sumber + ": ada baris terlewat atau ganda");
  }
});

uji("rencana kueri: tiap sumber dilayani indeks kursornya, tanpa SCAN tabel utama", async () => {
  const INDEKS = {tugas_api: "tugas_api_dibuat", logbook_d1: "logbook_kejadian_dibuat", sippa: "sippa_tugas_mulai", lapangan: "lp_tugas_mulai", gempa_d1: "gempa_kejadian_mulai", lapsus: "lapsus_kejadian_dibuat", lapor_ai: "lapor_sesi_terkirim"};
  for (const [s, [sql]] of Object.entries(KT_SQL)) {
    const rencana = (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(0, 9e12, 0, "", 501).all()).results.map(r => r.detail).join("\n");
    assert.match(rencana, new RegExp(`SEARCH \\w+ USING (COVERING )?INDEX ${INDEKS[s]}`), `${s}:\n${rencana}`);
    assert.doesNotMatch(rencana, /SCAN (t|l|k|logbook_kejadian|tugas_api|sippa_tugas|lp_tugas|gempa_kejadian|lapsus_kejadian|lapor_sesi)\b(?! USING)/, `${s} memindai penuh:\n${rencana}`);
  }
});
