/* Jeda per sensor (M, N, N20, N21) di /api/status: perbaruiTitik menulis `terakhir_sensor` ke isi putaran, periksaStatus membaca lewat json_extract (tanpa JSON.parse
   isi putaran), tanpa ambang, ikut status_riwayat sebagai jeda_sensor_<kode>, dan N ditandai {berhenti: true} sejak 1 Nov 2026 13:00 UTC (produk S-NPP dihentikan NASA).
   Contoh nyata 27 Okt 2026: lintasan siang S-NPP 10.32-13.57 WIB baru tiba di FIRMS 18.48 WIB; jeda_satelit (deteksi terbaru semua sensor) menyembunyikannya.
   Worker utuh di workerd, D1 lokal sungguhan; jam putaran dan jam status disuntik (kini) supaya batas 1 Nov teruji tanpa menunggu tanggalnya.
   Jalankan: node --test tests/warga/jeda_sensor.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {periksaStatus} from "../../src/worker.js";   // worker.js SEBELUM modul yang saling mengimpor (RUTE_* dispread saat evaluasi)
import {perbaruiTitik, jedaSensor, SNPP_BERHENTI} from "../../src/titik.js";
import {catatRiwayatStatus} from "../../src/sla.js";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";

const JAM = 3600e3, MENIT = 60e3, uji = berantai();
const KEP_V = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
const KEP_M = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight";
const KINI_A = Date.UTC(2026, 9, 27, 11, 48), KINI_B = KINI_A + 3 * JAM;   // 27 Okt 2026 18.48 WIB, lalu putaran berikutnya
const SEBELUM = Date.UTC(2026, 10, 1, 12, 59), SESUDAH = Date.UTC(2026, 10, 1, 13, 0);

const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const ENV = DB => ({DB, ASSETS: {fetch: aset}, FIRMS_MAP_KEY: "kunci-uji"});
/* baris CSV: [jam UTC "HH:MM", lat, lon]; tanggal 27 Okt 2026 */
const csv = (kep, sat, baris) => [kep, ...baris.map(([hm, lat, lon]) => `${lat},${lon},330,0.4,0.4,2026-10-27,${hm.replace(":", "")},${sat},VIIRS,${kep === KEP_M ? 60 : "n"},2.0NRT,290,10,D`)].join("\n");
const iso = (hm, hari = 27) => new Date(Date.UTC(2026, 9, hari, ...hm.split(":").map(Number))).toISOString();
const diminta = [];   // sensor FIRMS yang diminta stub, berurutan
const stub = async (peta, fn) => {   // peta: sensor FIRMS -> teks CSV | {status, teks}
  const asli = globalThis.fetch;
  globalThis.fetch = async u => { const s = String(u).split("/")[7], v = peta[s]; diminta.push(s); if (v instanceof Error) throw v; return typeof v === "string" ? new Response(v) : new Response(v?.teks ?? "", {status: v?.status ?? 500}); };
  try { return await fn(); } finally { globalThis.fetch = asli; }
};
const T = await siapkan("uji-jeda-sensor");   // satu worker + D1 untuk seluruh berkas (uji berantai); wajib di luar test() supaya after(dispose) berlaku di akhir berkas
const putaran = async (DB) => JSON.parse((await DB.prepare("SELECT isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first()).isi);

/* putaran A, contoh 27 Okt: N 10.32-13.57 WIB = 03:32-06:55 UTC (dipakai 06:55 supaya pembulatan tidak jatuh di .x5), M 09:40, N20 08:20 darat + 08:50 di laut, N21 09:10 */
const CSV_A = {
  VIIRS_SNPP_NRT: csv(KEP_V, "N", [["03:32", -2.1, 113.5], ["06:55", -2.2, 113.6]]),
  MODIS_NRT: csv(KEP_M, "Terra", [["09:40", -2.3, 113.7]]),
  VIIRS_NOAA20_NRT: csv(KEP_V, "N20", [["08:20", -2.4, 113.8], ["08:50", -5.5, 108.0]]),   // 08:50 di Laut Jawa: tetap bukti sensor sudah tiba di FIRMS
  VIIRS_NOAA21_NRT: csv(KEP_V, "N21", [["09:10", -2.5, 113.9]]),
};

uji("perbaruiTitik menulis terakhir_sensor: deteksi terbaru tiap sensor (urutan M, N, N20, N21), termasuk titik di laut", async () => {
  await stub(CSV_A, () => perbaruiTitik(ENV(T.DB), KINI_A));
  const isi = await putaran(T.DB);
  assert.deepEqual(isi.terakhir_sensor, {M: iso("09:40"), N: iso("06:55"), N20: iso("08:50"), N21: iso("09:10")});
  assert.deepEqual(Object.keys(isi.terakhir_sensor), ["M", "N", "N20", "N21"]);
  assert.equal(isi.baris.length, 5, "lima titik darat; titik di laut dibuang dari baris tetapi tetap dihitung di terakhir_sensor");
});

uji("periksaStatus: sumber.jeda_sensor = dibuat putaran - deteksi terbaru, dibulatkan 0,1; tanpa ambang dan tanpa memengaruhi ok/basi", async () => {
  const env = ENV(T.DB), url = new URL("http://aset.lokal/");
  const h = await periksaStatus(env, url, SEBELUM);   // jam status mundur: N belum berhenti
  assert.deepEqual(h.sumber.jeda_sensor, {
    M: {terakhir: iso("09:40"), umur_jam: 2.1},        // 11:48 - 09:40 = 128 mnt
    N: {terakhir: iso("06:55"), umur_jam: 4.9},        // 293 mnt: kasus 27 Okt (13.57 WIB tiba 18.48 WIB)
    N20: {terakhir: iso("08:50"), umur_jam: 3},        // 178 mnt
    N21: {terakhir: iso("09:10"), umur_jam: 2.6}});    // 158 mnt
  assert.ok(!("ambang_jam" in h.sumber.jeda_sensor.N) && !h.basi.includes("jeda_sensor") && !("jeda_sensor" in h.uji), "tanpa ambang: tidak pernah masuk basi/uji");
  /* ok/basi sama persis dengan ada atau tidaknya putaran */
  const tanpa = await periksaStatus({...env, DB: {prepare: q => /titik_terbaru/.test(q) ? {first: async () => { throw new Error("no such table: titik_terbaru"); }} : T.DB.prepare(q)}}, url, SEBELUM);
  assert.ok(!("jeda_sensor" in tanpa.sumber), "tabel titik_terbaru hilang: tidak ada angka, tidak melempar");
  assert.equal(tanpa.ok, h.ok); assert.deepEqual(tanpa.basi, h.basi);
});

uji("periksaStatus dipanggil dengan jam sebelum/sesudah 1 Nov 2026 13:00 UTC: N jadi {berhenti: true}, sensor lain tetap berumur", async () => {
  const env = ENV(T.DB), url = new URL("http://aset.lokal/");
  assert.equal(SNPP_BERHENTI, Date.UTC(2026, 10, 1, 13), "S-NPP berhenti 1 Nov 2026 13:00 UTC");
  assert.equal((await periksaStatus(env, url, SEBELUM)).sumber.jeda_sensor.N.umur_jam, 4.9, "12:59 UTC: masih berumur");
  const s = await periksaStatus(env, url, SESUDAH);
  assert.deepEqual(s.sumber.jeda_sensor.N, {berhenti: true}, "13:00 UTC: berhenti, bukan umur yang terus membesar");
  assert.equal(s.sumber.jeda_sensor.M.umur_jam, 2.1); assert.equal(s.sumber.jeda_sensor.N20.umur_jam, 3); assert.equal(s.sumber.jeda_sensor.N21.umur_jam, 2.6);
  const jauh = await periksaStatus(env, url, Date.UTC(2027, 2, 1));
  assert.deepEqual(jauh.sumber.jeda_sensor.N, {berhenti: true}); assert.ok(!jauh.basi.includes("jeda_sensor"), "berhenti bukan alarm");
});

uji("sensor hilang: putaran berikutnya tanpa N20 (galat) dan N21 (kosong) -> hanya M dan N yang punya terakhir; yang hilang {terakhir: null, umur_jam: null}", async () => {
  const env = ENV(T.DB), url = new URL("http://aset.lokal/");
  const B = {...CSV_A, VIIRS_SNPP_NRT: csv(KEP_V, "N", [["06:55", -2.2, 113.6], ["10:30", -2.25, 113.65]]), MODIS_NRT: csv(KEP_M, "Aqua", [["11:00", -2.3, 113.7]]),
    VIIRS_NOAA20_NRT: {status: 200, teks: "Invalid MAP_KEY."}, VIIRS_NOAA21_NRT: KEP_V};
  const h = await stub(B, () => perbaruiTitik(env, KINI_B));
  assert.ok(h.galat.some(g => g.includes("VIIRS_NOAA20_NRT")), "galat N20 dicatat");
  assert.deepEqual((await putaran(T.DB)).terakhir_sensor, {M: iso("11:00"), N: iso("10:30")}, "sensor tanpa deteksi tidak ditulis (bukan tanggal palsu)");
  const s = (await periksaStatus(env, url, SEBELUM)).sumber.jeda_sensor;
  assert.deepEqual(s, {M: {terakhir: iso("11:00"), umur_jam: 3.8}, N: {terakhir: iso("10:30"), umur_jam: 4.3}, N20: {terakhir: null, umur_jam: null, galat: true}, N21: {terakhir: null, umur_jam: null}});   // N20 gagal ditarik (galat: true); N21 berhasil tetapi kosong (tanpa penanda)
  /* semua sensor kosong: putaran sah dengan terakhir_sensor {} -> keempatnya null (bukan hilang diam-diam) */
  await stub({VIIRS_SNPP_NRT: KEP_V, MODIS_NRT: KEP_M, VIIRS_NOAA20_NRT: KEP_V, VIIRS_NOAA21_NRT: KEP_V}, () => perbaruiTitik(env, KINI_B + JAM));
  assert.deepEqual((await putaran(T.DB)).terakhir_sensor, {});
  assert.deepEqual(Object.values((await periksaStatus(env, url, SEBELUM)).sumber.jeda_sensor).map(v => v.umur_jam), [null, null, null, null]);
});

uji("putaran lama (tanpa terakhir_sensor) dan tabel kosong: jeda_sensor tidak ada, bukan 'semua hilang'", async () => {
  const env = ENV(T.DB), url = new URL("http://aset.lokal/");
  await T.DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(KINI_B + 2 * JAM, JSON.stringify({baris: [], galat: []})).run();
  assert.ok(!("jeda_sensor" in (await periksaStatus(env, url, SEBELUM)).sumber), "putaran terbaru ditulis sebelum perubahan ini");
  await T.DB.prepare("DELETE FROM titik_terbaru").run();
  assert.ok(!("jeda_sensor" in (await periksaStatus(env, url, SEBELUM)).sumber), "belum ada putaran");
});

uji("jedaSensor murni: masukan rusak -> null, dibuat sebelum deteksi dijepit 0, teks JSON dan objek sama", () => {
  const dibuat = Date.UTC(2026, 9, 27, 12), t = {M: new Date(dibuat - 2.04 * JAM).toISOString()};
  assert.equal(jedaSensor(null, dibuat, dibuat), null); assert.equal(jedaSensor("bukan json", dibuat, dibuat), null); assert.equal(jedaSensor([], dibuat, dibuat), null); assert.equal(jedaSensor("[]", dibuat, dibuat), null);
  assert.equal(jedaSensor(t, NaN, dibuat), null);
  assert.deepEqual(jedaSensor(JSON.stringify(t), dibuat, dibuat), jedaSensor(t, dibuat, dibuat));
  assert.equal(jedaSensor(t, dibuat, dibuat).M.umur_jam, 2);
  assert.equal(jedaSensor({M: new Date(dibuat + 20 * MENIT).toISOString()}, dibuat, dibuat).M.umur_jam, 0, "deteksi 20 menit di depan putaran (toleransi jam satelit) tidak boleh negatif");
  assert.deepEqual(jedaSensor({M: 5, N: "bukan tanggal"}, dibuat, dibuat).M, {terakhir: null, umur_jam: null}, "nilai bukan teks tanggal = tidak ada");
});

uji("isi putaran besar (~1,7 MB) tetap terbaca di /api/status lewat json_extract D1", async () => {
  const dibuat = KINI_B + 4 * JAM, ts = {M: new Date(dibuat - 3 * JAM).toISOString(), N20: new Date(dibuat - 8 * JAM).toISOString()};
  const isi = JSON.stringify({baris: Array.from({length: 36500}, (_, i) => [-2 - i / 1e4, 113.5, -1.25, "N20", 12.3, 1, 0, "10-27"]), terakhir_sensor: ts});
  assert.ok(isi.length > 1.5e6 && isi.length < 2e6, `ukuran ${isi.length}`);
  await T.DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(dibuat, isi).run();
  const r = await T.api("GET", "/api/status");
  assert.deepEqual(r.j.sumber.jeda_sensor.M, {terakhir: ts.M, umur_jam: 3}, r.t.slice(0, 400));
  assert.equal(r.j.sumber.jeda_sensor.N20.umur_jam, 8);
  assert.equal(r.j.sumber.jeda_sensor.N21.umur_jam, null);
  await T.DB.prepare("DELETE FROM titik_terbaru WHERE dibuat = ?").bind(dibuat).run();
});

uji("riwayat: jeda_sensor ditulis per sensor ke status_riwayat (jeda_sensor_<kode>), sensor tanpa umur/berhenti tidak ditulis, /api/sla memberi nama", async () => {
  const env = ENV(T.DB), url = new URL("http://aset.lokal/"), kini = Date.now();
  await stub(CSV_A, () => perbaruiTitik(env, KINI_A));   // putaran A lagi (id terbaru)
  const sumber = async k => (await T.DB.prepare("SELECT sumber, umur_menit, batas_menit, segar FROM status_riwayat WHERE slot = ? AND sumber LIKE 'jeda_sensor%' ORDER BY sumber").bind(Math.floor(k / JAM)).all()).results;
  /* sebelum 1 Nov: empat baris; umur dalam menit (dari umur_jam yang sudah dibulatkan 0,1 jam: 2,1 jam = 126 menit), tanpa batas (tanpa ambang), segar */
  const h = await periksaStatus(env, url, SEBELUM);
  await catatRiwayatStatus(env, h, SEBELUM);
  assert.deepEqual(await sumber(SEBELUM), [
    {sumber: "jeda_sensor_M", umur_menit: 126, batas_menit: null, segar: 1}, {sumber: "jeda_sensor_N", umur_menit: 294, batas_menit: null, segar: 1},
    {sumber: "jeda_sensor_N20", umur_menit: 180, batas_menit: null, segar: 1}, {sumber: "jeda_sensor_N21", umur_menit: 156, batas_menit: null, segar: 1}]);
  assert.equal((await T.DB.prepare("SELECT count(*) n FROM status_riwayat WHERE sumber = 'jeda_sensor'").first()).n, 0, "objek bersarang tidak ditulis sebagai satu sumber tanpa umur");
  /* sesudah 1 Nov: N berhenti, tidak ada baris */
  await catatRiwayatStatus(env, await periksaStatus(env, url, SESUDAH), SESUDAH);
  assert.deepEqual((await sumber(SESUDAH)).map(r => r.sumber), ["jeda_sensor_M", "jeda_sensor_N20", "jeda_sensor_N21"]);
  /* /api/sla (jam sungguhan): riwayat sekarang diberi nama terbaca, persentil dari umur_menit */
  await catatRiwayatStatus(env, await periksaStatus(env, url, kini), kini);
  const sla = await T.api("GET", "/api/sla?hari=1", undefined, ADMIN), per = Object.fromEntries(sla.j.sumber.map(s => [s.id, s]));
  assert.equal(sla.s, 200, sla.t);
  assert.equal(per.jeda_sensor_M.nama, "Jeda sensor MODIS (M) sampai putaran titik"); assert.equal(per.jeda_sensor_M.umur_p50, 126); assert.equal(per.jeda_sensor_M.batas_menit, null);
  assert.equal(per.jeda_sensor_N20.nama, "Jeda sensor NOAA-20 (N20) sampai putaran titik"); assert.equal(per.jeda_sensor_N21.nama, "Jeda sensor NOAA-21 (N21) sampai putaran titik");
  if (per.jeda_sensor_N) { assert.equal(per.jeda_sensor_N.nama, "Jeda sensor S-NPP (N) sampai putaran titik"); assert.equal(per.jeda_sensor_N.umur_p50, 294); }   // jam sungguhan >= 1 Nov 13:00 UTC: N berhenti dan tak ada baris baru
  else assert.ok(kini >= SNPP_BERHENTI, "N hanya boleh tidak ada sesudah berhenti");
  assert.ok(Object.values(per).filter(s => s.id.startsWith("jeda_sensor")).every(s => s.gangguan.length === 0 && s.segar_pct === 100), "tanpa ambang: tidak pernah gangguan");
});

uji("perbaruiTitik tidak meminta VIIRS_SNPP_NRT lagi sejak 1 Nov 2026 13:00 UTC: 4 sensor sebelum batas, 3 sesudahnya, tanpa galat percuma", async () => {
  const env = ENV(T.DB), tiga = {...CSV_A}; delete tiga.VIIRS_SNPP_NRT;
  diminta.length = 0; const sebelum = await stub(CSV_A, () => perbaruiTitik(env, SEBELUM));
  assert.deepEqual([...diminta].sort(), ["MODIS_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "VIIRS_SNPP_NRT"], "sebelum batas: empat sensor"); assert.deepEqual(sebelum.galat, []);
  diminta.length = 0; const sesudah = await stub(tiga, () => perbaruiTitik(env, SESUDAH));   // peta tanpa SNPP: kalau tetap diminta, hasilnya HTTP 500 = galat
  assert.deepEqual([...diminta].sort(), ["MODIS_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"], "sesudah batas: tiga sensor, tanpa VIIRS_SNPP_NRT");
  assert.deepEqual(sesudah.galat, [], "tidak ada galat percuma");
  const isi = await putaran(T.DB); assert.deepEqual(isi.galat, []); assert.ok(!("N" in isi.terakhir_sensor), "N tidak punya deteksi sesudah berhenti");   // CSV 27 Okt di luar jendela 24 jam 1 Nov: sensor lain kosong, bukan galat
});

uji("jedaSensor murni: galat putaran (larik atau teks JSON) menandai galat: true hanya untuk sensor yang gagal; N berhenti tetap {berhenti: true}", () => {
  const dibuat = Date.UTC(2026, 9, 27, 12), t = {M: new Date(dibuat - JAM).toISOString()}, g = ["VIIRS_NOAA21_NRT: HTTP 500", "VIIRS_NOAA20_NRT: bukan CSV FIRMS: Invalid MAP_KEY.", "MODIS_NRT: ***"];
  for (const m of [g, JSON.stringify(g)]) {
    const j = jedaSensor(t, dibuat, dibuat, m);
    assert.deepEqual(j.M, {terakhir: t.M, umur_jam: 1, galat: true}, "sensor punya deteksi lama tetapi putaran ini gagal: kedua keterangan ada");
    assert.deepEqual(j.N, {terakhir: null, umur_jam: null}); assert.deepEqual(j.N20, {terakhir: null, umur_jam: null, galat: true}); assert.deepEqual(j.N21, {terakhir: null, umur_jam: null, galat: true});
  }
  for (const m of [undefined, null, [], "[]", "bukan json", "{}", [5, null, "SENSOR_ASING: x"]]) assert.ok(SENSOR_TANPA_GALAT(jedaSensor(t, dibuat, dibuat, m)), `galat ${JSON.stringify(m)}: tanpa penanda`);
  assert.deepEqual(jedaSensor(t, dibuat, SNPP_BERHENTI, ["VIIRS_SNPP_NRT: HTTP 500"]).N, {berhenti: true});
});
const SENSOR_TANPA_GALAT = j => Object.values(j).every(v => !("galat" in v));

uji("/api/status: sensor yang gagal ditarik pada putaran terakhir diberi galat: true lewat json_extract isi.galat", async () => {
  const env = ENV(T.DB), B = {...CSV_A, VIIRS_NOAA20_NRT: {status: 503, teks: ""}, VIIRS_NOAA21_NRT: KEP_V};
  await stub(B, () => perbaruiTitik(env, KINI_B + 5 * JAM));
  const r = await T.api("GET", "/api/status"), j = r.j.sumber.jeda_sensor;
  assert.deepEqual(j.N20, {terakhir: null, umur_jam: null, galat: true}, r.t.slice(0, 600));
  assert.deepEqual(j.N21, {terakhir: null, umur_jam: null}, "kosong, bukan gagal: tanpa galat");
  assert.ok(!("galat" in j.M) && j.M.umur_jam != null);
  assert.ok(!r.j.basi.includes("jeda_sensor"), "tidak memengaruhi basi/503");
});

uji("galat perbaruiTitik tidak membocorkan FIRMS_MAP_KEY: diganti *** lalu dipotong 80 karakter (e.message, badan FIRMS, dan hasil)", async () => {
  const KUNCI = "kunci-rahasia-uji-0123456789", env = {...ENV(T.DB), FIRMS_MAP_KEY: KUNCI};
  const B = {...CSV_A,
    VIIRS_NOAA20_NRT: {status: 200, teks: `Invalid MAP_KEY ${KUNCI} untuk akun ini, hubungi pemilik kunci ${KUNCI} dan jangan dibagikan ke siapa pun juga`},   // badan FIRMS memantulkan kunci
    VIIRS_NOAA21_NRT: new Error(`gagal https://firms/csv/${KUNCI}/VIIRS_NOAA21_NRT`),   // e.message memuat URL
    MODIS_NRT: {status: 502, teks: ""}};
  const h = await stub(B, () => perbaruiTitik(env, KINI_B + 6 * JAM));
  const mentah = await T.api("GET", "/api/titik");
  for (const teks of [JSON.stringify(h), mentah.t, JSON.stringify((await putaran(T.DB)).galat)]) assert.ok(!teks.includes(KUNCI) && !teks.includes("0123456789"), "kunci tidak boleh muncul di galat");
  assert.equal(h.galat.length, 3); assert.ok(h.galat.every(g => g.length <= 80), `galat dipotong 80: ${h.galat.map(g => g.length)}`);
  assert.ok(h.galat.some(g => g.startsWith("VIIRS_NOAA20_NRT: bukan CSV FIRMS: Invalid MAP_KEY ***")), "kunci di badan FIRMS menjadi ***");
  assert.ok(h.galat.some(g => g === "VIIRS_NOAA21_NRT: gagal https://firms/csv/***/VIIRS_NOAA21_NRT"), "kunci di e.message menjadi ***");
  assert.ok(h.galat.includes("MODIS_NRT: HTTP 502"), "galat tanpa kunci tidak diubah");
  /* kunci yang melintasi batas 80 karakter: diganti dulu baru dipotong, bukan sebaliknya */
  const panjang = "A".repeat(60), h2 = await stub({...CSV_A, VIIRS_NOAA20_NRT: {status: 200, teks: `${panjang}${KUNCI}`}}, () => perbaruiTitik(env, KINI_B + 7 * JAM));
  const g2 = h2.galat.find(g => g.startsWith("VIIRS_NOAA20_NRT")); assert.ok(g2.length <= 80 && !g2.includes("kunci-rahasia"), g2);
});
