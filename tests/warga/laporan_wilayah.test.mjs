/* C5: wilayah (prov, kab) Lapor Warga. Worker di workerd (Miniflare) + D1 lokal sungguhan; poligon dari public/ seperti uji lain.
   Jalankan: node --test tests/warga/laporan_wilayah.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, readdirSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, pecah} from "./_bantu.mjs";

const H = "a".repeat(64), JAM = 3600e3, KINI = Date.now();
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const opsi = nama => ({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
  d1Databases: {DB: nama}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"}, serviceBindings: {ASSETS: aset}, cache: false});
const sqlMigrasi = (ok) => readdirSync(path.join(AKAR, "migrations")).filter(f => f.endsWith(".sql") && ok(f)).sort().map(f => readFileSync(path.join(AKAR, "migrations", f), "utf8")).join("\n");
const terapkan = (DB, sql) => DB.batch(pecah(sql).map(s => DB.prepare(s)));

let mf, DB;
before(async () => { mf = new Miniflare(opsi("uji-lw")); DB = await mf.getD1Database("DB"); await terapkan(DB, sqlMigrasi(() => true)); });
after(() => mf?.dispose());

let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
let ipN = 0;
const panggil = async (metode, jalur, body) => {
  const r = await mf.dispatchFetch("http://warga.lokal" + jalur, {method: metode, headers: {"cf-connecting-ip": `10.7.0.${++ipN}`, "content-type": "application/json"}, body: body && JSON.stringify(body)});
  const teks = await r.text(); let j = null; try { j = JSON.parse(teks); } catch (e) {}
  return {status: r.status, j, teks};
};
const lapor = o => panggil("POST", "/api/warga", {bahaya: "umum", jenis: "listrik", sub: "padam", ...o});
const wil = id => DB.prepare("SELECT prov, kab, sumber FROM laporan_wilayah WHERE laporan_id = ?").bind(id).first();
const tunggu = async (id) => { for (let i = 0; i < 50; i++) { const w = await wil(id); if (w) return w; await new Promise(r => setTimeout(r, 100)); } return null; };
const sisip = (id, lat, lon, dibuat = KINI) => DB.prepare(`INSERT INTO laporan (id, jenis, sub, bahaya, lat, lon, dibuat, kedaluwarsa, ip_hash, token_hash)
  VALUES (?, 'listrik', 'padam', 'umum', ?, ?, ?, ?, '${H}', '${H}')`).bind(id, lat, lon, dibuat, dibuat + 24 * JAM).run();

uji("migrasi 0027 laporan_wilayah di atas 0001-0026 berisi data: idempoten, laporan lama utuh", async () => {
  const m2 = new Miniflare(opsi("uji-lw-lama"));
  try {
    const D = await m2.getD1Database("DB");
    await terapkan(D, sqlMigrasi(f => f < "0027"));
    await D.prepare(`INSERT INTO laporan (id, jenis, sub, bahaya, lat, lon, dibuat, kedaluwarsa, ip_hash, token_hash) VALUES ('lama0001', 'listrik', 'padam', 'umum', -2.5, 113.9, ?, ?, '${H}', '${H}')`).bind(KINI, KINI + JAM).run();
    const baru = sqlMigrasi(f => f.startsWith("0027_"));
    assert.ok(baru.length > 0, "0027_*.sql tidak ada");
    await terapkan(D, baru); await terapkan(D, baru);
    assert.equal((await D.prepare("SELECT count(*) n FROM laporan").first()).n, 1, "laporan lama harus utuh");
    assert.equal((await D.prepare("SELECT count(*) n FROM laporan_wilayah").first()).n, 0, "migrasi tidak mengisi baris");
  } finally { await m2.dispose(); }
});

uji("laporan baru di Kalimantan Tengah mendapat prov 62 dan kab, tampil di properties publik", async () => {
  const r = await lapor({lat: -2.5, lon: 113.9}); assert.equal(r.status, 201, r.teks);
  const w = await tunggu(r.j.id); assert.ok(w, "baris wilayah tidak muncul");
  assert.equal(w.prov, "62"); assert.ok(w.kab && w.kab.length >= 2, `kab = ${w.kab}`); assert.equal(w.sumber, "masuk");
  const d = await panggil("GET", "/api/warga?jam=24"), f = d.j.features.find(x => x.id === r.j.id);
  assert.equal(f.properties.prov, "62"); assert.equal(f.properties.kab, w.kab);
  assert.equal((await panggil("GET", `/api/warga/${r.j.id}`)).j.properties.prov, "62");
});

uji("filter prov=NN menyaring; format salah 400; prov kosong hasil FeatureCollection kosong", async () => {
  const r = await lapor({lat: -7.8, lon: 110.4}); assert.equal(r.status, 201, r.teks);   // DIY / Jawa Tengah
  const w = await tunggu(r.j.id); assert.ok(w && /^\d{2}$/.test(w.prov));
  const t = await panggil("GET", "/api/warga?jam=24&prov=62");
  assert.ok(t.j.features.length >= 1 && t.j.features.every(f => f.properties.prov === "62"), "semua fitur harus prov 62");
  assert.ok(!t.j.features.some(f => f.id === r.j.id), "laporan Jawa tidak boleh ikut prov=62");
  assert.ok((await panggil("GET", `/api/warga?jam=24&prov=${w.prov}`)).j.features.some(f => f.id === r.j.id));
  for (const salah of ["6", "620", "ab", "62'", ""]) assert.equal((await panggil("GET", "/api/warga?prov=" + encodeURIComponent(salah))).status, 400, `prov='${salah}'`);
  assert.deepEqual((await panggil("GET", "/api/warga?jam=24&prov=99")).j.features, []);
});

uji("laporan di laut tidak membuat baris wilayah (bukan galat); isi-mundur menandainya tak_ada sekali saja", async () => {
  const r = await lapor({lat: -10.9, lon: 95.0}); assert.equal(r.status, 201, r.teks);
  await new Promise(r => setTimeout(r, 500));
  assert.equal(await wil(r.j.id), null, "laut tidak boleh punya baris");
  await (await mf.getWorker()).scheduled({cron: "17 * * * *"});
  const w = await wil(r.j.id); assert.deepEqual({...w}, {prov: null, kab: null, sumber: "tak_ada"});
});

uji("isi mundur: paling banyak 50 per panggilan, menyelesaikan laporan lama bertahap lewat cron menit 17", async () => {
  await DB.prepare("DELETE FROM laporan_wilayah").run();
  const n0 = (await DB.prepare("SELECT count(*) n FROM laporan").first()).n;
  for (let i = 0; i < 60; i++) await sisip(`lama${String(i).padStart(4, "0")}x`, -2.5 - i * 0.001, 113.9, KINI - i * 1000);
  const w = await mf.getWorker(), hitung = async () => (await DB.prepare("SELECT count(*) n FROM laporan_wilayah").first()).n;
  await w.scheduled({cron: "17 * * * *"});
  assert.equal(await hitung(), 50, "panggilan pertama harus tepat 50");
  await w.scheduled({cron: "17 * * * *"});
  assert.equal(await hitung(), n0 + 60, "panggilan kedua menuntaskan sisa");
  const a = await DB.prepare("SELECT prov, sumber FROM laporan_wilayah WHERE laporan_id = 'lama0000x'").first();
  assert.deepEqual({...a}, {prov: "62", sumber: "mundur"});
  await w.scheduled({cron: "17 * * * *"});
  assert.equal(await hitung(), n0 + 60, "panggilan ketiga tidak menambah apa pun");
});

uji("CHECK laporan_wilayah menolak prov liar; baris ikut terhapus bersama laporan", async () => {
  await sisip("cekprov01", -2.5, 113.9);
  for (const prov of ["6", "620", "ab", "6a", "62'", "٦٢", "*1"])
    await assert.rejects(DB.prepare("INSERT INTO laporan_wilayah (laporan_id, prov, kab, sumber) VALUES ('cekprov01', ?, 'X', 'masuk')").bind(prov).run(), /CHECK|constraint/i, `prov '${prov}' lolos`);
  await assert.rejects(DB.prepare("INSERT INTO laporan_wilayah (laporan_id, prov, sumber) VALUES ('cekprov01', '62', 'liar')").run(), /CHECK|constraint/i);
  await assert.rejects(DB.prepare("INSERT INTO laporan_wilayah (laporan_id, prov, sumber) VALUES ('tidakada1', '62', 'masuk')").run(), /FOREIGN|constraint/i, "laporan yatim");
  await DB.prepare("INSERT INTO laporan_wilayah (laporan_id, prov, kab, sumber) VALUES ('cekprov01', '62', 'Kab. X', 'masuk')").run();
  await DB.prepare("DELETE FROM laporan WHERE id = 'cekprov01'").run();
  assert.equal(await wil("cekprov01"), null, "ON DELETE CASCADE");
});

uji("cron isi wilayah: tanpa laporan tanpa wilayah tidak menulis apa pun", async () => {
  const w = await mf.getWorker(), n = async () => (await DB.prepare("SELECT count(*) n FROM laporan_wilayah").first()).n;
  const sebelum = await n(); await w.scheduled({cron: "17 * * * *"}); assert.equal(await n(), sebelum);
});

uji("worker terbit sebelum migrasi 0027: tanpa tabel laporan_wilayah Lapor Warga tetap 200 (prov/kab null), bukan 500", async () => {
  const id = "c0ffee00c0ffee01"; await sisip(id, -2.2, 113.9);
  await DB.prepare("DROP TABLE laporan_wilayah").run();
  try {
    const d = await panggil("GET", "/api/warga");
    assert.equal(d.status, 200, d.teks.slice(0, 120));
    const f = d.j.features.find(x => x.id === id); assert.ok(f); assert.equal(f.properties.prov, null);
    assert.equal((await panggil("GET", "/api/warga/" + id)).status, 200);
    assert.equal((await panggil("GET", "/api/warga?prov=62")).status, 200);
  } finally { await terapkan(DB, sqlMigrasi(f => f.startsWith("0027"))); }
});
