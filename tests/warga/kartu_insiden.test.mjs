/* Tugas api per versi berkas + ID insiden + Kartu Api (src/instansi.js tugasBaruDariBerkas/buatTugasIsi/pasKartu, migrations/0041_tugas_kartu.sql)
   di workerd (Miniflare) dengan D1 sungguhan dan migrasi apa adanya. Jalankan: node --test tests/warga/kartu_insiden.test.mjs */
import {test, before, after} from "node:test";
const uji = test;
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: instansi.js dan worker.js saling impor
import {buatTugas, tugasBaruDariBerkas, pasKartu} from "../../src/instansi.js";

const JAM = 3600e3, MENIT = 60e3;
const T0 = Date.UTC(2026, 9, 22, 4, 7);   // menit 7, BUKAN menit 18
let BERKAS = null, ambil = 0;
const aset = async () => { ambil++; return BERKAS == null ? new Response("tidak ada", {status: 404}) : Response.json(BERKAS); };
let mf, DB, env;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    d1Databases: {DB: "uji-kartu"}, r2Buckets: {MEDIA: "uji-kartu"}, bindings: {IP_SALT: "g", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: "x", SESI_KUNCI: "k"},
    serviceBindings: {ASSETS: aset}, cache: false, cf: {country: "ID", colo: "CGK"}});
  DB = await mf.getD1Database("DB"); env = {DB, ASSETS: {fetch: async () => aset()}};
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(async () => { await mf?.dispose(); });
const K = (id, lat, lon, o = {}) => ({id, lat, lon, prov: "62", kab: "Seruyan", kec: "Seruyan Hilir", level: 3, n24: 5, jam_sejak: 2, luas: 30, konsesi: [], ...o});
const berkas = (waktu, kompleks) => { BERKAS = {dibuat: new Date(waktu).toISOString(), kompleks}; };
const bersih = () => DB.batch([DB.prepare("DELETE FROM tugas_api"), DB.prepare("DELETE FROM tugas_meta")]);
const jumlah = async () => (await DB.prepare("SELECT count(*) n FROM tugas_api").first()).n;

uji("0041: migrasi idempoten, kartu ditolak bila bukan JSON atau > 3000 huruf", async () => {
  for (const s of pecah(readFileSync(path.join(AKAR, "migrations/0041_tugas_kartu.sql"), "utf8"))) await DB.prepare(s).run();
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi) VALUES ('aaaaaaaaaaaaaaaa', '62', 'Seruyan', -2, 112, 3, 1, 1)").run();
  await assert.rejects(DB.prepare("INSERT INTO tugas_kartu (tugas_id, kartu, diperbarui) VALUES ('aaaaaaaaaaaaaaaa', 'bukan json', 1)").run());
  await assert.rejects(DB.prepare("INSERT INTO tugas_kartu (tugas_id, kartu, diperbarui) VALUES ('aaaaaaaaaaaaaaaa', ?, 1)").bind(JSON.stringify({x: "a".repeat(3000)})).run());
  await DB.prepare("DELETE FROM tugas_api").run();
});

uji("0.3: versi sama diproses sekali; versi baru diproses di menit mana pun; tanpa jam kelipatan 3 menit 18", async () => {
  await bersih(); berkas(T0 - 10 * MENIT, [K("K1", -2.5, 112)]);
  assert.deepEqual(await tugasBaruDariBerkas(env, T0), {baru: 1, digabung: 0});
  assert.equal(await jumlah(), 1);
  assert.deepEqual(await tugasBaruDariBerkas(env, T0 + MENIT), {lewat: "versi sama"});
  await DB.prepare("DELETE FROM tugas_api").run();   // bila diproses lagi, tugas akan dibuat ulang
  assert.equal((await tugasBaruDariBerkas(env, T0 + 2 * MENIT)).lewat, "versi sama"); assert.equal(await jumlah(), 0, "versi sama tidak diproses dua kali");
  berkas(T0 + 3 * MENIT - 5 * MENIT, [K("K1", -2.5, 112)]);   // versi baru, menit 10 UTC
  assert.deepEqual(await tugasBaruDariBerkas(env, T0 + 3 * MENIT), {baru: 1, digabung: 0}); assert.equal(await jumlah(), 1);
  const dummy = []; berkas(T0 + 4 * MENIT, dummy); BERKAS.kompleks = [K("K1", -2.5, 112)];
  assert.equal((await tugasBaruDariBerkas(env, T0 + 4 * MENIT)).digabung, 1, "versi lain lagi, menit 11 UTC jam 4");
  BERKAS = null; assert.equal((await tugasBaruDariBerkas(env, T0 + 5 * MENIT)).lewat, "tugas_kompleks.json belum ada");
});

uji("0.3: pengintaian murah, berkas basi ditandai supaya tidak diurai tiap menit; gagal tulis tidak menandai", async () => {
  await bersih(); berkas(T0 - 7 * JAM, [K("K1", -2.5, 112)]);
  assert.match((await tugasBaruDariBerkas(env, T0)).lewat, /lebih dari 6 jam/); assert.equal(await jumlah(), 0);
  assert.equal((await tugasBaruDariBerkas(env, T0 + MENIT)).lewat, "versi sama");
  /* tanpa tabel meta (0041 belum diterapkan): perilaku lama, hanya di menit 18 jam kelipatan 3 */
  await bersih(); await DB.prepare("ALTER TABLE tugas_meta RENAME TO tugas_meta_x").run();
  try {
    berkas(Date.UTC(2026, 9, 22, 3, 10), [K("K1", -2.5, 112)]);
    assert.equal((await tugasBaruDariBerkas(env, Date.UTC(2026, 9, 22, 3, 17))).lewat, "versi sama"); assert.equal(await jumlah(), 0);
    assert.deepEqual(await tugasBaruDariBerkas(env, Date.UTC(2026, 9, 22, 3, 18)), {baru: 1, digabung: 0});
  } finally { await DB.prepare("ALTER TABLE tugas_meta_x RENAME TO tugas_meta").run(); }
});

uji("0.4: otomatis=false tanpa tugas lama tidak membuat tugas; dengan tugas lama memperbarui; tanpa kunci = perilaku lama", async () => {
  await bersih(); berkas(T0 - 5 * MENIT, [K("K1", -2.5, 112, {otomatis: false})]);
  assert.deepEqual(await buatTugas(env, T0), {baru: 0, digabung: 0, pantau: 1}); assert.equal(await jumlah(), 0);
  berkas(T0 - 4 * MENIT, [K("K1", -2.5, 112, {otomatis: true, n24: 5})]); await buatTugas(env, T0); assert.equal(await jumlah(), 1);
  berkas(T0 - 3 * MENIT, [K("K1", -2.5, 112, {otomatis: false, n24: 40})]);
  assert.deepEqual(await buatTugas(env, T0), {baru: 0, digabung: 1}); assert.equal(await jumlah(), 1);
  assert.equal((await DB.prepare("SELECT n24 FROM tugas_api").first()).n24, 40, "tugas buka yang cocok tetap diperbarui");
  await bersih(); berkas(T0 - 5 * MENIT, [K("K1", -2.5, 112)]);   // kunci otomatis tak ada
  assert.deepEqual(await buatTugas(env, T0), {baru: 1, digabung: 0});
});

uji("1.1: insiden sama = tugas sama walau kompleks pindah > 2 km; insiden berbeda berjauhan = tugas lain; cadangan jarak 2 km", async () => {
  await bersih(); berkas(T0 - 5 * MENIT, [K("K1", -2.5, 112, {insiden: "62-261022-007"})]);
  await buatTugas(env, T0);
  berkas(T0 - 4 * MENIT, [K("K9", -2.5, 112.1, {insiden: "62-261022-007"})]);   // ~11 km
  assert.deepEqual(await buatTugas(env, T0), {baru: 0, digabung: 1}); assert.equal(await jumlah(), 1);
  berkas(T0 - 3 * MENIT, [K("K2", -2.9, 112.5, {insiden: "62-261022-008"})]);
  assert.deepEqual(await buatTugas(env, T0), {baru: 1, digabung: 0}); assert.equal(await jumlah(), 2);
  berkas(T0 - 2 * MENIT, [K("K3", -2.5, 112.009)]);   // tanpa insiden, ~1 km dari tugas pertama (tanpa front lokasi tetap 112.0): cadangan jarak
  assert.deepEqual(await buatTugas(env, T0), {baru: 0, digabung: 1});
  const r = await DB.prepare("SELECT insiden FROM tugas_kartu ORDER BY insiden").all(); assert.deepEqual(r.results.map(x => x.insiden), ["62-261022-007", "62-261022-008"]);
});

uji("0.5: lokasi tugas ikut front terbaru selama buka; tidak bergeser setelah padam; front tak sah diabaikan", async () => {
  await bersih(); berkas(T0 - 5 * MENIT, [K("K1", -2.5, 112, {insiden: "62-261022-001", front: {lat: -2.51, lon: 112.01, waktu: "x", sensor: "VIIRS", radius_m: 375}})]);
  await buatTugas(env, T0);
  const lok = async () => { const t = await DB.prepare("SELECT lat, lon, status FROM tugas_api").first(); return [t.lat, t.lon, t.status]; };
  assert.deepEqual(await lok(), [-2.51, 112.01, "buka"], "tugas baru dibuat di front");
  berkas(T0 - 4 * MENIT, [K("K1", -2.5, 112, {insiden: "62-261022-001", front: {lat: -2.6, lon: 112.2, waktu: "y", sensor: "VIIRS", radius_m: 375}})]);
  await buatTugas(env, T0); assert.deepEqual(await lok(), [-2.6, 112.2, "buka"]);
  berkas(T0 - 3 * MENIT, [K("K1", -2.5, 112, {insiden: "62-261022-001", front: {lat: 99, lon: 112.9}})]);
  await buatTugas(env, T0); assert.deepEqual(await lok(), [-2.6, 112.2, "buka"], "front di luar Indonesia diabaikan");
  await DB.prepare("UPDATE tugas_api SET status = 'padam'").run();
  berkas(T0 - 2 * MENIT, [K("K1", -2.5, 112, {insiden: "62-261022-001", front: {lat: -2.7, lon: 112.3}})]);
  await buatTugas(env, T0); assert.equal((await lok())[0], -2.6, "tugas padam tidak bergeser");
});

uji("kartu: kunci kontrak tersimpan, diperbarui tiap putaran, konsesi ikut; API admin mengembalikan kartu terurai", async () => {
  await bersih();
  const isi = {insiden: "62-261022-007", front: {lat: -2.5, lon: 112, waktu: "2026-10-22T03:00:00Z", sensor: "VIIRS", radius_m: 375}, masuk: {lat: -2.49, lon: 112.01, jarak_km: 1.2, jenis: "jalan"},
    radius_m: 375, luas_aktif: {ha: 12, min: 8, maks: 20}, luas_koreksi: {ha: 40, min: 30, maks: 60, faktor: 3.3, dasar: "rekonsiliasi"}, tren: {n24: 9, n24_kemarin: 4, arah: "tumbuh"},
    konsesi: [{jenis: "HTI", nama: "PT Uji", pemegang: "PT Uji Lestari"}], syarat: ["konsesi", "tumbuh"]};
  berkas(T0 - 5 * MENIT, [K("K1", -2.5, 112, {...isi, otomatis: true})]);
  await buatTugas(env, T0);
  const id = (await DB.prepare("SELECT id FROM tugas_api").first()).id;
  const baris = await DB.prepare("SELECT insiden, kartu FROM tugas_kartu WHERE tugas_id = ?").bind(id).first();
  assert.equal(baris.insiden, "62-261022-007"); assert.deepEqual(JSON.parse(baris.kartu), isi);
  berkas(T0 - 4 * MENIT, [K("K1", -2.5, 112, {...isi, tren: {n24: 12, n24_kemarin: 9, arah: "tumbuh"}})]);
  await buatTugas(env, T0); assert.equal(JSON.parse((await DB.prepare("SELECT kartu FROM tugas_kartu").first()).kartu).tren.n24, 12);
  const r = await mf.dispatchFetch(`http://instansi.lokal/api/instansi/admin/tugas/${id}`, {headers: {"x-admin-token": "rahasia-admin"}}), j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j)); assert.equal(j.tugas.kartu.tren.n24, 12); assert.deepEqual(j.tugas.kartu.konsesi, isi.konsesi); assert.equal(j.tugas.kartu.insiden, "62-261022-007");
  /* tugas tanpa kartu: kartu null, bukan galat */
  await DB.prepare("DELETE FROM tugas_kartu").run();
  const r2 = await (await mf.dispatchFetch(`http://instansi.lokal/api/instansi/admin/tugas/${id}`, {headers: {"x-admin-token": "rahasia-admin"}})).json(); assert.equal(r2.tugas.kartu, null);
});

uji("kartu kepanjangan dipotong berurutan dan tetap JSON sah <= 3000; tugas dihapus = kartu ikut hilang", async () => {
  const besar = {insiden: "62-261022-009", front: {lat: -2.5, lon: 112}, tren: {n24: 1}, syarat: ["konsesi"], konsesi: [1, 2, 3].map(i => ({jenis: "HTI", nama: "N".repeat(1100), pemegang: "P" + i}))};
  const s = pasKartu(besar); assert.ok(s.length <= 3000, String(s.length)); const o = JSON.parse(s);
  assert.equal(o.insiden, "62-261022-009"); assert.deepEqual(o.tren, {n24: 1}); assert.ok(o.konsesi.length < 3, "konsesi dipotong dari belakang dulu");
  const gila = pasKartu({insiden: "62-261022-009", front: {x: "z".repeat(5000)}, tren: {n24: 1}}); assert.ok(gila === null || (gila.length <= 3000 && JSON.parse(gila).insiden === "62-261022-009"));
  assert.equal(pasKartu(null), null); assert.equal(pasKartu({tak_dikenal: 1}), null); assert.equal(pasKartu([]), null);
  /* lewat jalur nyata: berkas dengan kartu raksasa tidak menggagalkan D1 CHECK */
  await bersih(); berkas(T0 - 5 * MENIT, [K("K1", -2.5, 112, {...besar})]);
  assert.deepEqual(await buatTugas(env, T0), {baru: 1, digabung: 0});
  assert.ok(JSON.parse((await DB.prepare("SELECT kartu FROM tugas_kartu").first()).kartu).insiden);
  await DB.prepare("DELETE FROM tugas_api").run(); assert.equal((await DB.prepare("SELECT count(*) n FROM tugas_kartu").first()).n, 0, "ON DELETE CASCADE");
});

uji("tanpa kunci baru dan tanpa tabel 0041: perilaku lama (jarak 2 km), tidak ada galat", async () => {
  await bersih(); await DB.batch([DB.prepare("ALTER TABLE tugas_kartu RENAME TO tugas_kartu_x")]);
  try {
    berkas(T0 - 5 * MENIT, [K("K1", -2.5, 112, {insiden: "62-261022-007", front: {lat: -2.5, lon: 112.001}})]);
    assert.deepEqual(await buatTugas(env, T0), {baru: 1, digabung: 0});
    berkas(T0 - 4 * MENIT, [K("K2", -2.5, 112.005)]); assert.deepEqual(await buatTugas(env, T0), {baru: 0, digabung: 1});
  } finally { await DB.prepare("ALTER TABLE tugas_kartu_x RENAME TO tugas_kartu").run(); }
});

uji("0.3: versi sama tidak mengurai berkas (CPU 10 ms): hanya awal berkas dibaca lalu body dibatalkan", async () => {
  await bersih(); berkas(T0 - 5 * MENIT, [K("K1", -2.5, 112)]);
  let urai = 0;
  const envC = {DB, ASSETS: {fetch: async () => { const r = Response.json(BERKAS), j = r.json.bind(r); r.json = () => { urai++; return j(); }; return r; }}};
  await tugasBaruDariBerkas(envC, T0); assert.equal(urai, 1, "versi baru diurai sekali");
  for (let i = 1; i <= 5; i++) assert.equal((await tugasBaruDariBerkas(envC, T0 + i * MENIT)).lewat, "versi sama");
  assert.equal(urai, 1, "versi sama tidak pernah diurai");
});

uji("berkas rusak atau dibuat tak terurai diurai sekali saja per versi, tidak tiap menit", async () => {
  await bersih(); let urai = 0;
  const bikin = teks => ({DB, ASSETS: {fetch: async () => { const r = new Response(teks); const j = r.json.bind(r); r.json = () => { urai++; return j(); }; return r; }}});
  const rusak = bikin('{"dibuat":"2026-10-22T03:00:00Z","kompleks":[{'), tak = bikin('{"dibuat":"bukan-tanggal","kompleks":[]}');
  for (let i = 0; i < 5; i++) await tugasBaruDariBerkas(rusak, T0 + i * MENIT);
  assert.equal(urai, 1, "rusak: diurai sekali");
  urai = 0; for (let i = 0; i < 5; i++) await tugasBaruDariBerkas(tak, T0 + i * MENIT);
  assert.equal(urai, 1, "dibuat tak terurai: diurai sekali");
  assert.equal(await jumlah(), 0);
});

uji("pasKartu membuang koordinat di luar bbox dan angka negatif atau tak hingga", () => {
  const o = JSON.parse(pasKartu({insiden: "62-261022-007", front: {lat: 99, lon: 112}, masuk: {lat: -2.5, lon: 500, jarak_km: 1}, radius_m: -5, luas_aktif: {ha: -1, min: 1, maks: 2},
    luas_koreksi: {ha: 10, min: 5, maks: 20}, tren: {n24: Infinity}}));
  assert.deepEqual(Object.keys(o).sort(), ["insiden", "luas_koreksi"]);
  const n = JSON.parse(pasKartu({insiden: "62-261022-007", masuk: null, front: {lat: -2.5, lon: 112}})); assert.equal(n.masuk, null); assert.deepEqual(n.front, {lat: -2.5, lon: 112});
});
