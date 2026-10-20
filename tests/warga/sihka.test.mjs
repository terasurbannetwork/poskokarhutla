/* SIHKA (tinggi muka air sungai terukur) di Worker (src/sihka.js) di workerd (Miniflare): D1 lokal dengan migrasi apa adanya, sumber dijawab fixture
   nyata (tests/warga/fixtures/sihka_telemetry.json) lewat outboundService, TANPA jaringan. Jalankan: node --test tests/warga/sihka.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: sihka.js saling impor dengannya
import {SQL_BACA, SQL_DASAR, SQL_HAPUS_LAMA, SQL_HAPUS_BACA_POS} from "../../src/sihka.js";

const FIX = readFileSync(path.join(AKAR, "tests/warga/fixtures/sihka_telemetry.json"), "utf8");
const K = Date.parse("2026-10-19T09:23:00Z"), k = K / 1000, K2 = Date.parse("2026-10-19T20:23:00Z"), k2 = K2 / 1000;   // menit 23: jam biasa, lalu 20 UTC (harian)
// bacaan yang HARUS masuk menurut fixture (dihitung mandiri di JS, bukan oleh SQL yang diuji)
const harap = (() => { const s = new Set(); for (const o of JSON.parse(FIX)) if (o.type === "DUGA AIR") for (const r of o.raw)
  if (typeof r.value === "number" && r.timestamp) { const t = Date.parse(r.timestamp) / 1000; if (t > k - 6 * 3600 && t <= k + 600) s.add(o.id + "|" + t); } return s; })();

let mf, worker, DB;
let isiSumber = FIX, statusSumber = 200, panggilan = 0;   // kendali fixture
const luar = async req => {
  if (new URL(req.url).hostname !== "sihka.dev-tunnels.id") return new Response("diblok di uji", {status: 599});
  panggilan++; return new Response(statusSumber === 200 ? isiSumber : "gagal", {status: statusSumber});
};
const aset = async req => {
  const f = path.join(AKAR, "public", decodeURIComponent(new URL(req.url).pathname));
  return existsSync(f) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-sihka"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"}, serviceBindings: {ASSETS: aset}, outboundService: luar, cache: false});
  DB = await mf.getD1Database("DB"); worker = await mf.getWorker();
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());

let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
const tik = t => worker.scheduled({cron: "* * * * *", scheduledTime: new Date(t)});
const baris = async (sql, ...b) => (await DB.prepare(sql).bind(...b).all()).results;
const api = async () => { const r = await mf.dispatchFetch("http://sihka.lokal/api/banjir/sungai-ukur"); const teks = await r.text(); let x = null; try { x = JSON.parse(teks); } catch (e) {} return {status: r.status, j: x, h: r.headers}; };
const status = async () => Object.fromEntries((await api()).j.pos.map(p => [p.id, p.status]));
const jumlah = async () => (await baris("SELECT count(*) n FROM sihka_baca"))[0].n;

uji("migrasi 0016 sihka idempoten: dijalankan dua kali tidak galat", async () => {
  const sql = pecah(migrasi()).filter(s => /sihka_/.test(s));
  assert.equal(sql.length, 3);
  await DB.batch(sql.map(s => DB.prepare(s)));
});

uji("GET /api/banjir/sungai-ukur: belum pernah terisi = 503 jujur; POST 405", async () => {
  assert.equal((await api()).status, 503);
  const p = await mf.dispatchFetch("http://sihka.lokal/api/banjir/sungai-ukur", {method: "POST", body: "{}"});
  assert.equal(p.status, 405); assert.match(p.headers.get("allow"), /GET/);
});

uji("cron menit bukan 23 tidak menarik SIHKA sama sekali", async () => {
  panggilan = 0; await tik(K + 60e3);
  assert.equal(panggilan, 0); assert.equal(await jumlah(), 0);
});

uji("cron sihka tiap jam: hanya DUGA AIR, nilai numerik, <= 6 jam (dan tidak di masa depan) masuk sihka_baca; metadata terisi pertama kali", async () => {
  assert.ok(harap.size > 20, "fixture cukup ramai");
  await tik(K);
  const ada = new Set((await baris("SELECT pos, t FROM sihka_baca")).map(r => r.pos + "|" + r.t));
  assert.deepEqual([...ada].sort(), [...harap].sort());
  const s = (await baris("SELECT isi, dibuat FROM cuaca_sumber WHERE kunci = 'sihka'"))[0];
  assert.equal(s.dibuat, K); const isi = JSON.parse(s.isi);
  assert.equal(isi.baru, harap.size); assert.equal(isi.galat, null); assert.ok(isi.dibaca > 10000);
  const pos = await baris("SELECT * FROM sihka_pos"); assert.ok(pos.length >= 30);
  const c = pos.find(p => p.satuan === "cm"); assert.ok(c.nama && Math.abs(c.x) > 1e6 && c.tz && c.dilihat === k);
  assert.ok(pos.some(p => p.satuan === null), "satuan null dipertahankan");
});

uji("ulang dengan data sama = 0 tulis (rows_written dan perubahan)", async () => {
  const m = (await DB.prepare(SQL_BACA).bind(FIX, k).run()).meta;
  assert.equal(m.changes, 0); if ("rows_written" in m) assert.equal(m.rows_written, 0);
  await tik(K);   // putaran ulang di menit yang sama
  assert.equal(JSON.parse((await baris("SELECT isi FROM cuaca_sumber WHERE kunci = 'sihka'"))[0].isi).baru, 0);
  assert.equal(await jumlah(), harap.size);
});

uji("rute 200 sesudah terisi: teks status apa adanya, Cache-Control 10 menit, ringkasan dan isi pos", async () => {
  const r = await api();
  assert.equal(r.status, 200); assert.match(r.h.get("cache-control"), /public, max-age=600/); assert.equal(r.h.get("x-content-type-options"), "nosniff");
  assert.equal(r.j.dibuat, K); assert.equal(r.j.ok, K); assert.equal(r.j.sumber, "Kementerian PU, Ditjen SDA (SIHKA)");
  const ids = new Set((await baris("SELECT DISTINCT pos FROM sihka_baca")).map(x => x.pos));
  assert.equal(r.j.pos.length, ids.size);
  assert.equal(Object.values(r.j.ringkas).reduce((a, b) => a + b, 0), ids.size);
  for (const key of ["id", "nama", "x", "y", "satuan", "v", "t", "d3", "status", "hari"]) assert.ok(key in r.j.pos[0], key);
  assert.ok(r.j.pos.every(p => ["bukan_tinggi", "riwayat_kurang"].includes(p.status) && p.d3 === null), "tanpa riwayat: tak ada pembanding 3 jam, tak ada dasar");
});

uji("gagal-lunak: HTTP 500, halaman HTML, bukan daftar DUGA AIR, terlalu besar = bacaan dan stempel sehat lama utuh (status tetap dihitung ulang)", async () => {
  const sebelum = (await baris("SELECT dibuat FROM cuaca_sumber WHERE kunci = 'sihka'"))[0].dibuat;
  const varian = [[500, "x", /HTTP 500/], [200, "<html>Just a moment...</html>", /bukan daftar/], [200, '{"galat":"DUGA AIR"}', /bukan daftar/],
    [200, "[]", /bukan daftar/], [200, '["DUGA AIR"' + " ".repeat(2.1e6) + "]", /terlalu besar/]];
  for (const [kode, teks, re] of varian) {
    statusSumber = kode; isiSumber = teks;
    await tik(K + 7200e3 + 0);
    const s = (await baris("SELECT isi, dibuat FROM cuaca_sumber WHERE kunci = 'sihka'"))[0];
    assert.equal(s.dibuat, sebelum, "stempel sehat tidak maju"); assert.match(JSON.parse(s.isi).galat, re);
    assert.equal(await jumlah(), harap.size);
    assert.equal((await api()).j.ok, sebelum, "ok = tarikan sehat terakhir, tidak maju");
  }
  statusSumber = 200; isiSumber = FIX;
});

// ---- status dari seri sintetis (data fixture dibuang; sumber kini hanya berisi satu pos tanpa bacaan baru) ----
const KOSONG = JSON.stringify([{id: "S-x", name: "x", type: "DUGA AIR", tz: "Asia/Jakarta", raw: [], coordinate: "1,2"}]);
const LT = k - 600;   // bacaan terakhir 09:13
const dasar = (pos, o = {}) => DB.prepare("INSERT OR REPLACE INTO sihka_dasar (pos,n,d3_p50,d3_p99,v_p95,v_max,hari,dihitung) VALUES (?,?,?,?,?,?,?,?)")
  .bind(pos, o.n ?? 300, 1, o.p99 ?? 5, o.p95 ?? 1000, o.vmax ?? 1000, o.hari ?? 30, k);
const pos = (id, satuan) => DB.prepare("INSERT OR REPLACE INTO sihka_pos (pos,nama,x,y,satuan,dilihat) VALUES (?,?,?,?,?,?)").bind(id, id, 1, 2, satuan, k);
const baca = (id, t, v) => DB.prepare("INSERT INTO sihka_baca (pos,t,v) VALUES (?,?,?)").bind(id, t, v);
const seri = (id, nilai, akhir = LT, langkah = 3600) => nilai.map((v, i) => baca(id, akhir - (nilai.length - 1 - i) * langkah, v));
const NAIK = [100, 100, 100, 100, 110, 150];
const bersihSemua = () => DB.batch([DB.prepare("DELETE FROM sihka_baca"), DB.prepare("DELETE FROM sihka_pos"), DB.prepare("DELETE FROM sihka_dasar")]);
const kasus = {   // id: [satuan, nilai tertua->terbaru, opsi dasar, status diharapkan, akhir seri]
  "S-lama":  ["cm", [100, 101, 102, 103], {}, "lama", LT - 6 * 3600],
  "S-macet": ["cm", Array(12).fill(100), {}, "macet"],
  "S-kurang": ["cm", NAIK, {hari: 3}, "riwayat_kurang"],
  "S-kurang-n": ["cm", NAIK, {n: 99}, "riwayat_kurang"],
  "S-m3s": ["m3/s", NAIK, {}, "bukan_tinggi"],
  "S-mdpl": ["mdpl", NAIK, {}, "bukan_tinggi"],
  "S-naik":  ["cm", NAIK, {}, "naik_di_atas_biasa"],
  "S-lonjakan": ["cm", [100, 100, 100, 100, 170, 125], {}, "biasa"],   // naik 25 cm tapi sudah turun dari puncak: bukan naik
  "S-p99-nol": ["cm", NAIK, {p99: 0}, "biasa"],   // p99 = 0: ambang tak bermakna
  "S-n299": ["cm", NAIK, {n: 299}, "biasa"],   // sampel kenaikan kurang dari 300: tak boleh menuduh naik walau d3 besar
  "S-hari13": ["cm", NAIK, {hari: 13}, "biasa"],
  "S-null":  [null, [10, 10, 10, 10, 11, 12.5], {p99: 1, p95: 12}, "naik_di_atas_biasa"],   // satuan tak diketahui: v >= p95 dan d3 (2,5) >= 2 x p99
  "S-null-p95": [null, [10, 10, 10, 10, 11, 12.5], {p99: 1, p95: 99}, "biasa"],
  "S-null-2x": [null, [10, 10, 10, 10, 11, 12.5], {p99: 2, p95: 12}, "biasa"],
  "S-m-kecil": ["m", [1, 1, 1, 1, 1.05, 1.1], {p99: 0.05}, "biasa"],   // 0,1 m < 20 cm
  "S-m-naik": ["m", [1, 1, 1, 1, 1.2, 1.5], {p99: 0.05}, "naik_di_atas_biasa"],
  "S-cm-kecil": ["cm", [100, 100, 100, 100, 105, 110], {p99: 5}, "biasa"],   // 10 cm < 20 cm
  "S-tinggi30": ["cm", [10, 10, 10, 10, 11, 11], {p99: 50, vmax: 10.5, hari: 30}, "tertinggi"],
  "S-tinggi7": ["cm", [10, 10, 10, 10, 11, 11], {p99: 50, vmax: 10.5, hari: 7}, "biasa"],   // riwayat belum 30 hari
  "S-tie": ["cm", [10, 10, 10, 10, 11, 11], {p99: 50, vmax: 11, hari: 30}, "biasa"],   // v == rekor: bukan rekor baru
  "S-biasa": ["cm", [10, 10, 10, 10, 11, 10.5], {p99: 50}, "biasa"],
};
const hitung = nilai => nilai.reduce((a, [, , , st]) => (a[st] = (a[st] ?? 0) + 1, a), {});
uji("status: tiap status terpicu; lonjakan sesaat, p99=0, n<300, hari<14, lantai 20 cm, satuan null (p95 dan 2x p99), rekor (30 hari, tie) tertangani", async () => {
  await bersihSemua();
  const b = [];
  for (const [id, [sat, nilai, o, , akhir]] of Object.entries(kasus)) b.push(pos(id, sat), dasar(id, o), ...seri(id, nilai, akhir ?? LT));
  // data bolong: bacaan 2 jam lalu tidak ada (pembanding r2 hilang)
  b.push(pos("S-bolong", "cm"), dasar("S-bolong"), baca("S-bolong", LT, 150), baca("S-bolong", LT - 3600, 110), baca("S-bolong", LT - 3 * 3600, 100));
  await DB.batch(b);
  isiSumber = KOSONG; await tik(K);
  const r = await api(), st = await status();
  for (const [id, [, , , harapStatus]] of Object.entries(kasus)) assert.equal(st[id], harapStatus, id);
  assert.equal(st["S-bolong"], "data_bolong");
  const harapRingkas = hitung(Object.values(kasus)); harapRingkas.data_bolong = 1;
  assert.deepEqual(r.j.ringkas, harapRingkas);
  const naik = r.j.pos.find(p => p.id === "S-naik"); assert.equal(naik.d3, 50); assert.equal(naik.v, 150); assert.equal(naik.t, LT);
  assert.equal(r.j.pos.find(p => p.id === "S-m-naik").d3, 0.5);
  assert.equal(r.j.pos.find(p => p.id === "S-macet").d3, 0);
});

uji("sumber gagal: status tetap dihitung ulang (pos tua jadi lama), ok tidak maju, bacaan utuh", async () => {
  const sebelum = await jumlah(); statusSumber = 500;
  const nanti = K + 6 * 3600e3;   // 15:23 UTC; bacaan terakhir 09:13 sudah > 5 jam
  await tik(nanti); statusSumber = 200;
  const r = await api();
  assert.equal(r.j.dibuat, nanti); assert.equal(r.j.ok, K, "ok = tarikan sehat terakhir");
  assert.ok(r.j.pos.every(p => ["lama", "bukan_tinggi"].includes(p.status)), JSON.stringify(r.j.ringkas));
  assert.equal(r.j.pos.find(p => p.id === "S-naik").status, "lama");
  assert.equal(await jumlah(), sebelum);
  assert.match(JSON.parse((await baris("SELECT isi FROM cuaca_sumber WHERE kunci = 'sihka'"))[0].isi).galat, /HTTP 500/);
});

// PRNG tetap (mulberry32) supaya deret berlonjak dan persentilnya bisa dihitung ulang di JS
const prng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const peringkat = (urut, p) => urut[Math.max(1, Math.ceil(urut.length * p / 100)) - 1];   // nearest-rank
uji("dasar harian (20 UTC): persentil nearest-rank SQL = hitungan JS pada deret berlonjak; 24 jam terakhir tidak ikut; retensi 180 hari; pos > 30 hari dibuang", async () => {
  const rnd = prng(20261019), N = 220, akhir = k2 - 600;
  const nilai = Array.from({length: N}, (_, i) => Math.round((50 + i * 0.3 + rnd() * 4 + (i % 17 === 0 ? 40 : 0)) * 100) / 100);   // 199 nilai dalam jendela, lonjakan tiap 17 jam
  const waktu = nilai.map((_, i) => akhir - (N - 1 - i) * 3600);
  await bersihSemua();
  await DB.batch([pos("S-d", "cm"), ...seri("S-d", nilai, akhir),
    baca("S-d", k2 - 181 * 86400, 7), baca("S-d", k2 - 100 * 86400, 8),   // 181 hari: dibuang; 100 hari: tetap ada (di luar jendela dasar tapi dalam retensi)
    DB.prepare("INSERT INTO sihka_pos (pos,nama,dilihat) VALUES ('S-tua','tua',?)").bind(k2 - 31 * 86400), baca("S-tua", k2 - 40 * 86400, 5)]);
  isiSumber = FIX; panggilan = 0; await tik(K2);
  assert.equal(panggilan, 2, "tiap jam + tarikan harian sendiri");
  const dalam = waktu.map((t, i) => i).filter(i => waktu[i] > k2 - 90 * 86400 && waktu[i] <= k2 - 86400);
  const d3 = dalam.filter(i => i >= 3).map(i => nilai[i] - nilai[i - 3]).sort((a, b) => a - b);
  const v = dalam.map(i => nilai[i]).sort((a, b) => a - b);
  assert.ok(dalam.length < N && dalam.length > 150 && new Set(nilai).size > 150);
  const d = (await baris("SELECT * FROM sihka_dasar WHERE pos = 'S-d'"))[0];
  assert.equal(d.n, d3.length); assert.equal(d.d3_p50, peringkat(d3, 50)); assert.equal(d.d3_p99, peringkat(d3, 99));
  assert.equal(d.v_p95, peringkat(v, 95)); assert.equal(d.v_max, v[v.length - 1]);
  assert.ok(Math.abs(d.hari - (waktu[dalam.at(-1)] - waktu[dalam[0]]) / 86400) < 1e-9); assert.equal(d.dihitung, k2);
  assert.equal((await baris("SELECT count(*) n FROM sihka_baca WHERE pos = 'S-d' AND t = ?", k2 - 181 * 86400))[0].n, 0, "181 hari dibuang");
  assert.equal((await baris("SELECT count(*) n FROM sihka_baca WHERE pos = 'S-d' AND t = ?", k2 - 100 * 86400))[0].n, 1, "100 hari masih disimpan");
  assert.equal((await baris("SELECT count(*) n FROM sihka_pos WHERE pos = 'S-tua'"))[0].n, 0, "pos tak terlihat > 30 hari dibuang");
  assert.equal((await baris("SELECT count(*) n FROM sihka_baca WHERE pos = 'S-tua'"))[0].n, 0, "bacaan pos itu ikut dibuang (tanpa yatim)");
  assert.ok((await baris("SELECT count(*) n FROM sihka_pos"))[0].n >= 30, "metadata pos dari tarikan harian");
  const sd = (await api()).j.pos.find(p => p.id === "S-d"); assert.ok(sd && sd.status);
});

uji("dasar: pos dihitung ulang sekali per siklus 14 hari (bucket dari id), pos tanpa baris dasar langsung; anggaran baca dan hapus tanpa pindai penuh", async () => {
  await bersihSemua();
  const POS = 50, HARI = 30, kini = k2 + 100 * 86400;
  await DB.prepare(`WITH RECURSIVE p(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM p WHERE i<${POS}) INSERT INTO sihka_pos (pos,nama,x,y,satuan,dilihat) SELECT 'q'||printf('%08x', (i*2654435761)%4294967296),'n',1,2,'cm',${kini} FROM p`).run();
  await DB.prepare(`WITH RECURSIVE h(j) AS (SELECT 0 UNION ALL SELECT j+1 FROM h WHERE j<${HARI * 24 - 1}) INSERT INTO sihka_baca (pos,t,v) SELECT pos, ${kini} - 86400 - j*3600, 100 + (j*7)%23 FROM sihka_pos, h`).run();
  const jendela = POS * (HARI * 24 - 24);   // t <= kini - 86400 dikecualikan: 24 bacaan per pos terakhir
  const pertama = (await DB.prepare(SQL_DASAR).bind(kini).run()).meta;   // belum ada baris dasar: semua pos dihitung sekali
  assert.equal((await baris("SELECT count(*) n FROM sihka_dasar"))[0].n, POS);
  await DB.prepare("UPDATE sihka_dasar SET dihitung = 1, n = 9999").run();
  let baca_ = 0, hitung = new Set();
  for (let h = 1; h <= 14; h++) {   // satu siklus penuh: tiap pos tepat satu kali, tiap hari hanya sebagiannya
    const m = (await DB.prepare(SQL_DASAR).bind(kini + h * 86400).run()).meta; baca_ += m.rows_read;
    for (const r of await baris("SELECT pos FROM sihka_dasar WHERE n != 9999")) hitung.add(r.pos);
  }
  assert.equal(hitung.size, POS, "semua pos terhitung dalam satu siklus 14 hari");
  assert.ok(baca_ <= 24 * jendela, `satu siklus ${baca_} baris baca untuk ${jendela} baris jendela (+ ~20x per pos yang dihitung)`);
  assert.ok(pertama.rows_read / jendela > 5, "pembanding: dihitung semua sekaligus mahal (~20x)");
  assert.ok(baca_ / 14 <= 2 * jendela, `rata-rata per hari ${baca_ / 14} <= 2x baris jendela ${jendela}`);
  // hapus: seek per pos; baca ~ baris terhapus, bukan seluruh tabel
  const tua = kini - 86400 - 20 * 86400, dihapus = (await baris("SELECT count(*) n FROM sihka_baca WHERE t < ?", tua))[0].n;
  const h1 = (await DB.prepare(SQL_HAPUS_LAMA).bind(tua).run()).meta;
  assert.equal(h1.changes, dihapus); assert.ok(h1.rows_read <= 2 * dihapus + POS * 10, `hapus membaca ${h1.rows_read} untuk ${dihapus} baris`);
  const sisa = (await baris("SELECT count(*) n FROM sihka_baca"))[0].n;
  const h2 = (await DB.prepare(SQL_HAPUS_BACA_POS).bind(kini + 1).run()).meta;   // semua pos "tak terlihat": semua bacaannya
  assert.equal(h2.changes, sisa); assert.ok(h2.rows_read <= 2 * sisa + POS * 10);
});

uji("fixture jahat: 6000 raw, nama 1 MB, nilai 1e999, id angka/panjang, koordinat di luar Indonesia = dipotong atau ditolak; status tetap JSON sah", async () => {
  await bersihSemua();
  const raw = Array.from({length: 6000}, (_, i) => ({unit: "cm", merek: "M".repeat(20), value: i % 7, timestamp: new Date((k - 7000 + i) * 1000).toISOString()}));
  const o = (id, extra = {}) => ({id, name: "n", type: "DUGA AIR", tz: "Asia/Jakarta", raw: [{unit: "cm", value: 1, timestamp: new Date((k - 300) * 1000).toISOString()}], coordinate: "12467461.3,69792.5", ...extra});
  const daftar = [o("H-ok", {name: "N".repeat(1e6), raw, tz: "Z".repeat(200)}), o("H-inf", {raw: [{unit: "cm", value: "__INF__", timestamp: new Date((k - 300) * 1000).toISOString()}]}),
    o(12345), o("I".repeat(100)), o("H-luar", {coordinate: "0,0"}), o("H-luar2", {coordinate: "12467461.3,-9999999"}), o("H-tanpa", {coordinate: null})];
  isiSumber = JSON.stringify(daftar).replace('"__INF__"', "1e999"); assert.ok(isiSumber.length < 2e6);
  await tik(K);
  const ps = await baris("SELECT pos, length(nama) ln, length(tz) lz FROM sihka_pos");
  assert.deepEqual(ps.map(p => p.pos).sort(), ["H-inf", "H-ok"]);
  assert.equal(ps.find(p => p.pos === "H-ok").ln, 80); assert.equal(ps.find(p => p.pos === "H-ok").lz, 16);
  assert.equal((await baris("SELECT length(merek) l FROM sihka_pos WHERE pos = 'H-ok'"))[0].l, 16);
  const b = await baris("SELECT pos, count(*) n, max(abs(v)) mv FROM sihka_baca GROUP BY pos");
  assert.ok(b.every(x => x.mv < 1e5)); assert.ok(b.reduce((a, x) => a + x.n, 0) <= 5000, "LIMIT 5000");
  assert.ok(b.find(x => x.pos === "H-ok").n >= 1);
  const r = await api(); assert.equal(r.status, 200); assert.ok(r.j && Array.isArray(r.j.pos) && r.j.pos.length <= 1500);
  assert.ok(JSON.stringify(r.j).length < 5e5);
  isiSumber = FIX;
});

uji("badan > 2 MB tanpa content-length (stream) ditolak dan dibatalkan; data utuh", async () => {
  const sebelum = await jumlah(), t0 = (await baris("SELECT dibuat FROM cuaca_sumber WHERE kunci = 'sihka'"))[0].dibuat;
  isiSumber = new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode('["DUGA AIR"')); for (let i = 0; i < 25; i++) c.enqueue(new Uint8Array(100000).fill(32)); c.close(); }});
  await tik(K + 86400e3); isiSumber = FIX;
  assert.match(JSON.parse((await baris("SELECT isi FROM cuaca_sumber WHERE kunci = 'sihka'"))[0].isi).galat, /terlalu besar/);
  assert.equal((await baris("SELECT dibuat FROM cuaca_sumber WHERE kunci = 'sihka'"))[0].dibuat, t0); assert.equal(await jumlah(), sebelum);
});

uji("HEAD /api/banjir/sungai-ukur: status sama dengan GET, badan kosong, cache-control public max-age=600", async () => {
  const g = await mf.dispatchFetch("http://sihka.lokal/api/banjir/sungai-ukur"), h = await mf.dispatchFetch("http://sihka.lokal/api/banjir/sungai-ukur", {method: "HEAD"});
  assert.equal(h.status, g.status); assert.equal(await h.text(), ""); assert.match(h.headers.get("cache-control"), /public, max-age=600/);
});

uji("tabel hilang (migrasi belum jalan): GET 503 bukan 500, cron tidak melempar", async () => {
  await DB.batch([DB.prepare("DROP TABLE cuaca_sumber")]);
  assert.equal((await api()).status, 503);
  await tik(K2 + 3600e3);
});
