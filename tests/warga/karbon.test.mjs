/* Modul Karbon (src/karbon.js + migrasi 0051) di workerd (Miniflare) dengan D1 dan R2 lokal sungguhan, migrasi apa adanya.
   GFW Data API tiruan lewat outboundService (bentuk respons {data: [...]} seperti data-api.globalforestwatch.org), selain itu 599.
   Jalankan: node --test tests/warga/karbon.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync, existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

const uji = (nama, fn) => test(nama, fn);   // gerbang.test.mjs mencari uji("<nama>")
const ADMIN = {"x-admin-token": "rahasia-admin"};
const TABEL = ["karbon_proyek", "karbon_peringatan", "karbon_pihak", "karbon_kesepakatan", "karbon_buku", "karbon_laporan"];
const KINI = Date.parse("2026-10-22T23:48:00Z");   // menit cron karbon (src/worker.js)
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
/* ---- GFW tiruan ---- */
const panggilan = [];
const BARIS = {
  luas: [{ha: 180}],
  tutupan: [{ambang: 30, primer: true, ha: 100, atas: 5000, bawah: 1000, tanah: 2000}, {ambang: 75, primer: false, ha: 50, atas: 3000, bawah: 600, tanah: 900},
    {ambang: 10, primer: false, ha: 20, atas: 100, bawah: 20, tanah: 500}],
  tutupan_gambut: [{ambang: 30, ha: 80}, {ambang: 10, ha: 20}],
  hilang: [{th: 2015, primer: false, ha: 3, co2: 900}, {th: 2015, primer: true, ha: 2, co2: 700}, {th: 2020, primer: false, ha: 1, co2: 300}],
  hilang_gambut: [{th: 2015, ha: 3}],
  hilang_api: [{th: 2015, ha: 1.5}],
  tutupan2017: [{tutupan: 2001, ha: 100}, {tutupan: 2010, ha: 70}],
  kawasan: [{kawasan: "Limited Production Forest", ha: 100}, {kawasan: null, ha: 80}],
  hilang_pendorong: [{th: 2015, pendorong: 4, ha: 3, co2: 800}, {th: 2015, pendorong: null, ha: 2, co2: 800}, {th: 2020, pendorong: 1, ha: 1, co2: 300}],
  pendorong: [{kategori: 4, ha: 5}, {kategori: null, ha: 1}],
  serapan: [{serapan: 1234.567}],
  peringatan: [{lat: 0.5501, lon: 101.0501, tanggal: "2026-10-10", keyakinan: "high"}, {lat: 0.5502, lon: 101.0502, tanggal: "2026-10-10", keyakinan: "highest"},
    {lat: 0.5503, lon: 101.0501, tanggal: "2026-10-10", keyakinan: "nominal"}, {lat: 0.58, lon: 101.08, tanggal: "2026-10-12", keyakinan: "nominal"}],
};
/* nama kueri dikenali dari SQL persis di kontrak (public/karbon/gfw_kueri.json), jadi kueri yang diubah tanpa memperbarui uji ini gagal */
const KONTRAK = JSON.parse(readFileSync(path.join(AKAR, "public/karbon/gfw_kueri.json"), "utf8"));
const namaKueri = sql => Object.entries(KONTRAK.kueri).find(([, q]) => q.sql === sql.replace(/'\d{4}-\d{2}-\d{2}'/, "'{sejak}'"))?.[0] ?? null;
async function luar(req) {
  const u = new URL(req.url);
  if (u.host !== "data-api.globalforestwatch.org") return new Response("diblok", {status: 599});
  const b = await req.json(), n = namaKueri(b.sql);
  panggilan.push({jalur: u.pathname, kunci: req.headers.get("x-api-key"), nama: n, geom: b.geometry?.type});
  if (b.geometry?.coordinates?.[0]?.[0]?.[0]?.[0] >= 120) return new Response("galat rahasia GFW", {status: 500});   // proyek racun (poison pill)
  if (/\/v20261022\//.test(u.pathname)) return new Response("not found", {status: 404});   // versi harian hari ini belum terbit: mundur sehari
  return n ? Response.json({data: BARIS[n], status: "success"}) : new Response("sql asing", {status: 400});
}
let mf, DB, R2;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", cf: {country: "ID", colo: "CGK"}, d1Databases: {DB: "uji-karbon"}, r2Buckets: {MEDIA: "uji-karbon-r2"},
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SESI_KUNCI: "kunci-sesi-uji", GFW_API_KEY: "kunci-uji"},
    serviceBindings: {ASSETS: aset}, outboundService: luar, cache: false});
  DB = await mf.getD1Database("DB"); R2 = await mf.getR2Bucket("MEDIA");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());

const apiDi = async (host, m, u, body, h = {}, inst = mf) => {
  const r = await inst.dispatchFetch("https://" + host + u, {method: m, headers: {"content-type": "application/json", ...h}, body: body == null ? undefined : JSON.stringify(body), redirect: "manual"});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t, h: r.headers};
};
const api = (m, u, body, h) => apiDi("centurisk97.id", m, u, body, h);
const hitung = async t => (await DB.prepare(`SELECT count(*) n FROM ${t}`).first()).n;
const kotak = (x0, y0, x1, y1) => ({type: "Polygon", coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]});
const GEOM = kotak(101.0, 0.5, 101.1, 0.6);

uji("migrasi 0051 idempoten: dijalankan dua kali tanpa galat", async () => {
  await DB.batch(pecah(readFileSync(path.join(AKAR, "migrations/0051_karbon.sql"), "utf8")).map(s => DB.prepare(s)));
  for (const t of TABEL) assert.equal(await hitung(t), 0, t);
});

uji("karbon: semua rute tanpa masuk ditolak 403 dan tidak menulis apa pun", async () => {
  const rute = [...readFileSync(path.join(AKAR, "src/karbon.js"), "utf8").matchAll(/^\s*"((?:GET|POST) \/api\/karbon\/[\w\/:]+)":/gm)].map(x => x[1]);
  assert.ok(rute.length >= 16, `rute terbaca ${rute.length}`);
  const isi = {nama: "x", jenis: "pembeli", proyek_id: "0123456789abcdef", vintage: 2025, jumlah_t: 1, id: 1, status: "valid", diubah: 1};
  for (const r of rute) {
    const [m, j] = r.split(" "), u = j.replace(":id", "0123456789abcdef") + "?proyek=zz";
    for (const h of [{}, {"x-admin-token": "salah"}]) { const x = await api(m, u, m === "POST" ? isi : null, h); assert.equal(x.s, 403, `${r} ${JSON.stringify(h)}: ${x.t}`); }
  }
  for (const t of TABEL) assert.equal(await hitung(t), 0, `${t}: penolakan tidak boleh menulis`);
});

let PROYEK, PIHAK;
uji("karbon: CRUD proyek, pihak, kesepakatan, laporan; luas dihitung server", async () => {
  const p = await api("POST", "/api/karbon/proyek", {nama: "  PT Uji‮ Hutan ", prov: "14", tahap: "pemantauan", geom: GEOM, asumsi: {efektivitas: 0.8, buffer: 0.15, catatan: "a"}}, ADMIN);
  assert.equal(p.s, 201, p.t); PROYEK = p.j.id; assert.match(PROYEK, /^[0-9a-f]{16}$/);
  const g = await api("GET", `/api/karbon/proyek/${PROYEK}`, null, ADMIN);
  assert.equal(g.s, 200); assert.equal(g.h.get("cache-control"), "no-store");
  assert.equal(g.j.proyek.nama, "PT Uji Hutan", "NFC + karakter kontrol/bidi dibuang + trim");
  assert.deepEqual(g.j.proyek.geom, GEOM); assert.deepEqual(g.j.proyek.asumsi, {efektivitas: 0.8, buffer: 0.15, catatan: "a"});
  const r = 6378137, rad = x => x * Math.PI / 180, harap = r * r * rad(0.1) * (Math.sin(rad(0.6)) - Math.sin(rad(0.5))) / 1e4;
  assert.ok(Math.abs(g.j.proyek.luas_ha / harap - 1) < 0.005, `luas ${g.j.proyek.luas_ha} vs ${harap}`);
  const d = await api("GET", "/api/karbon/proyek", null, ADMIN);
  assert.equal(d.j.proyek.length, 1); assert.equal(d.j.proyek[0].geom, undefined, "daftar tanpa geom");
  assert.deepEqual((await api("GET", "/api/karbon/proyek?geom=1", null, ADMIN)).j.proyek[0].geom, GEOM);
  assert.equal((await api("GET", "/api/karbon/proyek/fedcba9876543210", null, ADMIN)).s, 404);

  const ph = await api("POST", "/api/karbon/pihak", {nama: "Pembeli A", jenis: "pembeli", negara: "SG"}, ADMIN); assert.equal(ph.s, 201, ph.t); PIHAK = ph.j.id;
  const k = await api("POST", "/api/karbon/kesepakatan", {pihak_id: PIHAK, proyek_id: PROYEK, arah: "jual", volume_t_th: 10000, harga_usd: 8.5, tenggat: "2026-11-30"}, ADMIN);
  assert.equal(k.s, 201, k.t);
  const kd = await api("GET", `/api/karbon/kesepakatan?proyek=${PROYEK}`, null, ADMIN);
  assert.equal(kd.j.kesepakatan.length, 1); assert.equal(kd.j.kesepakatan[0].tahap, "prospek", "bawaan tahap");
  assert.equal((await api("POST", "/api/karbon/kesepakatan", {pihak_id: "fedcba9876543210", arah: "jual"}, ADMIN)).s, 400, "pihak tak ada = 400 (FK)");

  const l = await api("POST", "/api/karbon/laporan", {proyek_id: PROYEK, periode_awal: "2026-01-01", periode_akhir: "2026-06-30", isi: {ringkas: "ok", hilang_ha: 3.2}}, ADMIN);
  assert.equal(l.s, 201, l.t);
  assert.deepEqual((await api("GET", `/api/karbon/laporan?id=${l.j.id}`, null, ADMIN)).j.laporan.isi, {ringkas: "ok", hilang_ha: 3.2});
  assert.equal((await api("GET", `/api/karbon/laporan?proyek=${PROYEK}`, null, ADMIN)).j.laporan[0].isi, undefined, "daftar tanpa isi");
  assert.equal((await api("POST", "/api/karbon/laporan", {proyek_id: PROYEK, periode_awal: "2026-06-30", periode_akhir: "2026-01-01", isi: {}}, ADMIN)).s, 400, "periode terbalik");
});

uji("karbon: penguncian optimistis, diubah basi = 409 dan tidak menimpa", async () => {
  const g = (await api("GET", `/api/karbon/pihak`, null, ADMIN)).j.pihak[0], dasar = g.diubah;
  await new Promise(r => setTimeout(r, 5));
  const a = await api("POST", "/api/karbon/pihak", {id: PIHAK, diubah: dasar, kontak: "a@b.c"}, ADMIN); assert.equal(a.s, 201, a.t);
  const b = await api("POST", "/api/karbon/pihak", {id: PIHAK, diubah: dasar, kontak: "jahat"}, ADMIN); assert.equal(b.s, 409, b.t);
  assert.equal((await DB.prepare("SELECT kontak FROM karbon_pihak WHERE id = ?").bind(PIHAK).first()).kontak, "a@b.c");
  assert.equal((await api("POST", "/api/karbon/pihak", {id: PIHAK, kontak: "x"}, ADMIN)).s, 400, "ubah tanpa diubah ditolak");
});

uji("karbon: isian salah DITOLAK 400 (geometri, enum, porsi) dan tidak tersimpan", async () => {
  const sebelum = await hitung("karbon_proyek");
  const cobaan = [[{nama: "a", geom: kotak(10, 0, 11, 1)}, "di luar Indonesia"], [{nama: "a", geom: {type: "Polygon", coordinates: [[[101, 0.5], [101.1, 0.5], [101.1, 0.6], [101, 0.6]]]}}, "cincin terbuka"],
    [{nama: "a", geom: {type: "Polygon", coordinates: [[[101, 0.5], [101.1, 0.5], [101, 0.5]]]}}, "cincin 3 titik"], [{nama: "a", geom: {type: "Point", coordinates: [101, 0.5]}}, "Point"],
    [{nama: "a", geom: {type: "Polygon", coordinates: [[[101, 0.5], ["x", 0.5], [101.1, 0.6], [101, 0.5]]]}}, "koordinat teks"],
    [{nama: "a", tahap: "terbang"}, "tahap asing"], [{nama: "a", asumsi: {buffer: 1.5}}, "porsi > 1"], [{nama: "a", asumsi: {kebocoran: -0.1}}, "porsi < 0"],
    [{nama: "a", prov: "99"}, "prov asing"], [{nama: ""}, "nama kosong"], [{nama: "x".repeat(201)}, "nama panjang"], [{nama: "a", asumsi: {"Kunci Aneh": 1}}, "kunci asumsi"]];
  for (const [b, kata] of cobaan) { const r = await api("POST", "/api/karbon/proyek", b, ADMIN); assert.equal(r.s, 400, `${kata}: ${r.t}`); }
  const banyak = Array.from({length: 50001}, (_, i) => [101 + i * 1e-7, 0.5]); banyak.push(banyak[0]);
  assert.equal((await api("POST", "/api/karbon/proyek", {nama: "a", geom: {type: "Polygon", coordinates: [banyak]}}, ADMIN)).s, 400, "> 50 rb titik");
  assert.equal(await hitung("karbon_proyek"), sebelum);
  assert.equal((await api("POST", "/api/karbon/pihak", {nama: "a", jenis: "penjahat"}, ADMIN)).s, 400, "jenis pihak asing");
  assert.equal((await api("POST", "/api/karbon/kesepakatan", {pihak_id: PIHAK, arah: "jual", tahap: "nikah"}, ADMIN)).s, 400, "tahap kesepakatan asing");
  assert.equal((await api("POST", "/api/karbon/kesepakatan", {pihak_id: PIHAK, arah: "jual", harga_usd: -1}, ADMIN)).s, 400, "harga negatif");
  assert.equal((await api("GET", "/api/karbon/buku?proyek=zz", null, ADMIN)).s, 400, "param id rusak");
  /* CHECK D1 menahan enum walau JS terlewati */
  await assert.rejects(DB.prepare("INSERT INTO karbon_pihak (id, nama, jenis, dibuat, diubah, oleh) VALUES ('0000000000000001', 'a', 'asing', 1, 1, 'x')").run(), /CHECK/);
});

uji("karbon: buku kredit menolak saldo/tersedia negatif dan UPDATE/DELETE (append-only)", async () => {
  const e = (jenis, jumlah_t, vintage = 2025, ekstra = {}) => api("POST", "/api/karbon/buku", {proyek_id: PROYEK, vintage, jenis, jumlah_t, ...ekstra}, ADMIN);
  const sr = (a, z) => ({serial_awal: a, serial_akhir: z});
  assert.equal((await e("terbit", 100, 2025, sr(1, 100))).s, 409, "terbit saat tahap pemantauan (belum verifikasi)");
  const pr = (await api("GET", `/api/karbon/proyek/${PROYEK}`, null, ADMIN)).j.proyek;
  assert.equal((await api("POST", "/api/karbon/proyek", {id: PROYEK, diubah: pr.diubah, tahap: "verifikasi"}, ADMIN)).s, 201);
  assert.equal((await e("alih", 1, 2025, {...sr(1, 1), pembeli: "x"})).s, 409, "alih sebelum terbit");
  assert.equal((await e("terbit", 100, 2025, sr(1, 100))).s, 201);
  assert.equal((await e("cadang", 30)).s, 201);
  assert.equal((await e("alih", 80, 2025, {...sr(1, 80), pembeli: "x"})).s, 409, "tersedia 70, alih 80");
  assert.equal((await e("lepas_cadang", 40)).s, 409, "lepas melebihi cadangan");
  assert.equal((await e("pensiun", 70, 2025, sr(1, 70))).s, 201);
  assert.equal((await e("cadang", 1)).s, 409, "tersedia 0");
  assert.equal((await e("terbit", 5, 2026, sr(1, 5))).s, 201, "vintage lain terpisah (serial boleh sama)");
  for (const [b, kata] of [[{jenis: "terbit", jumlah_t: 0}, "nol"], [{jenis: "terbit", jumlah_t: 1.5}, "pecahan"], [{jenis: "cetak", jumlah_t: 1}, "jenis asing"], [{jenis: "terbit", jumlah_t: 1, vintage: 1990}, "vintage"],
    [{jenis: "terbit", jumlah_t: 1e9 + 1, ...sr(1, 1e9 + 1)}, "jumlah > 1e9"], [{jenis: "terbit", jumlah_t: 5}, "terbit tanpa serial"], [{jenis: "terbit", jumlah_t: 5, ...sr(1, 6)}, "panjang rentang != jumlah"],
    [{jenis: "terbit", jumlah_t: 5, serial_awal: "A1", serial_akhir: "A5"}, "serial teks"], [{jenis: "terbit", jumlah_t: 5, serial_awal: 1}, "serial separuh"],
    [{jenis: "cadang", jumlah_t: 1, ...sr(1, 1)}, "serial pada cadang"], [{jenis: "alih", jumlah_t: 1, ...sr(1, 1)}, "alih tanpa kesepakatan/pembeli"]]) {
    const r = await api("POST", "/api/karbon/buku", {proyek_id: PROYEK, vintage: 2025, ...b}, ADMIN); assert.equal(r.s, 400, `${kata}: ${r.t}`);
  }
  const b = await api("GET", `/api/karbon/buku?proyek=${PROYEK}`, null, ADMIN);
  assert.equal(b.j.entri.length, 4);
  assert.deepEqual(b.j.saldo.map(x => [x.vintage, x.saldo, x.cadang, x.tersedia]), [[2025, 30, 30, 0], [2026, 5, 0, 5]]);
  await assert.rejects(DB.prepare("UPDATE karbon_buku SET jumlah_t = 999").run(), /append-only/);
  await assert.rejects(DB.prepare("DELETE FROM karbon_buku").run(), /append-only/);
  assert.equal(await hitung("karbon_buku"), 4);
  /* CHECK D1 menahan rentang salah walau JS terlewati */
  const sisip = (jumlah, a, z) => DB.prepare("INSERT INTO karbon_buku (proyek_id, vintage, jenis, jumlah_t, serial_awal, serial_akhir, waktu, oleh) VALUES (?, 2025, 'terbit', ?, ?, ?, 1, 'x')").bind(PROYEK, jumlah, a, z).run();
  await assert.rejects(sisip(5, 1, 9), /CHECK/); await assert.rejects(sisip(5, 1, null), /CHECK/); await assert.rejects(sisip(5, "a", "e"), /CHECK/); await assert.rejects(sisip(2e9, 1, 2e9), /CHECK/);
});

uji("karbon: serial tumpang tindih, terbit ganda, dan alih di luar rentang ditolak 409 dan tabel tidak berubah", async () => {
  const e = (jenis, jumlah_t, a, z, vintage = 2027, ekstra = {}) => api("POST", "/api/karbon/buku", {proyek_id: PROYEK, vintage, jenis, jumlah_t, serial_awal: a, serial_akhir: z, ...ekstra}, ADMIN);
  const tabelBuku = async () => JSON.stringify((await DB.prepare("SELECT * FROM karbon_buku ORDER BY id").all()).results);
  assert.equal((await e("terbit", 100, 5000000000, 5000000099)).s, 201, "serial besar tetap integer (CHECK typeof)");
  assert.equal((await e("terbit", 50, 5000000100, 5000000149)).s, 201, "bersebelahan boleh");
  const sebelum = await tabelBuku();
  for (const [jenis, n, a, z, kata] of [["terbit", 100, 5000000000, 5000000099, "terbit ganda persis"], ["terbit", 10, 5000000095, 5000000104, "tumpang tindih sebagian"], ["terbit", 20, 5000000090, 5000000109, "menimpa dua rentang"],
    ["alih", 10, 5000000150, 5000000159, "alih di luar rentang terbit (sesudah ujung)"], ["alih", 10, 4999999995, 5000000004, "alih menyeberangi awal rentang"], ["alih", 10, 5000000095, 5000000104, "alih menyeberangi dua terbitan bersebelahan"],
    ["pensiun", 5, 1, 5, "pensiun serial yang tak pernah terbit"], ["batal", 5, 9, 13, "batal di luar rentang"]]) {
    const r = await e(jenis, n, a, z, 2027, {pembeli: "p"}); assert.equal(r.s, 409, `${kata}: ${r.t}`); assert.match(r.j.galat || r.j.error || r.t, /serial|Serial/i, kata);
  }
  assert.equal(await tabelBuku(), sebelum, "penolakan tidak boleh mengubah buku");
  assert.equal((await e("alih", 30, 5000000010, 5000000039, 2027, {pembeli: "p"})).s, 201);
  const sesudah = await tabelBuku();
  for (const [jenis, a, z] of [["alih", 5000000039, 5000000048], ["pensiun", 5000000020, 5000000025], ["batal", 5000000000, 5000000010]]) {
    assert.equal((await e(jenis, z - a + 1, a, z, 2027, {pembeli: "p"})).s, 409, `${jenis} serial terpakai`);
  }
  assert.equal(await tabelBuku(), sesudah);
});

uji("karbon: dua alih serentak dari saldo yang sama: tepat satu 201", async () => {
  const e = (jenis, jumlah_t, a, z, ekstra = {}) => api("POST", "/api/karbon/buku", {proyek_id: PROYEK, vintage: 2028, jenis, jumlah_t, serial_awal: a, serial_akhir: z, ...ekstra}, ADMIN);
  assert.equal((await e("terbit", 100, 1, 100)).s, 201);
  assert.equal((await api("POST", "/api/karbon/buku", {proyek_id: PROYEK, vintage: 2028, jenis: "cadang", jumlah_t: 50}, ADMIN)).s, 201, "tersedia 50");
  const [a, b] = await Promise.all([e("alih", 30, 1, 30, {pembeli: "A"}), e("alih", 30, 31, 60, {pembeli: "B"})]);
  assert.deepEqual([a.s, b.s].sort(), [201, 409], `${a.t} | ${b.t}`);
  const n = (await DB.prepare("SELECT count(*) n FROM karbon_buku WHERE vintage = 2028 AND jenis = 'alih'").first()).n; assert.equal(n, 1);
});

uji("karbon: tarik statistik GFW menyusun stat §3.2 (hutan = ambang >= 30)", async () => {
  const kosong = await api("POST", "/api/karbon/proyek", {nama: "Tanpa geom"}, ADMIN);
  assert.equal((await api("POST", `/api/karbon/stat/${kosong.j.id}`, {}, ADMIN)).s, 400, "tanpa geometri");
  panggilan.length = 0;
  const r = await api("POST", `/api/karbon/stat/${PROYEK}`, {}, ADMIN); assert.equal(r.s, 200, r.t);
  assert.deepEqual(panggilan.map(p => p.nama).sort(), Object.keys(KONTRAK.kueri).filter(x => x !== "peringatan").sort()); assert.ok(panggilan.every(p => p.kunci === "kunci-uji" && p.geom === "MultiPolygon" && p.jalur.startsWith("/dataset/umd_tree_cover_density_2000/v1.8/")));
  const s = (await api("GET", `/api/karbon/proyek/${PROYEK}`, null, ADMIN)).j.proyek.stat;
  const nol = {ha: 0, co2_t: 0, ha_gambut: 0, ha_primer: 0}, hilang = {}, apiMap = {};
  for (let t = 2001; t <= 2025; t++) { hilang[t] = {...nol}; apiMap[t] = 0; }
  hilang[2015] = {ha: 5, co2_t: 1600, ha_gambut: 3, ha_primer: 2, pendorong: {4: {ha: 3, co2_t: 800}}}; hilang[2020] = {ha: 1, co2_t: 300, ha_gambut: 0, ha_primer: 0, pendorong: {1: {ha: 1, co2_t: 300}}}; apiMap[2015] = 1.5;
  assert.deepEqual({...s, diambil: null}, {id: PROYEK, versi: {tcl: "v1.13", tcd: "v1.8"}, tahun_data_akhir: 2025, diambil: null, luas_ha: 180, hutan2000_ha: 150, primer_ha: 100, gambut_ha: 100, gambut_hutan_ha: 80,
    stok_tC: {atas: 8000, bawah: 1600, tanah: 2900}, hilang, hilang_api: apiMap, tutupan2017: {2001: 100, 2010: 70}, kawasan: {"Limited Production Forest": 100}, pendorong: {4: 5}, serapan_co2_t: 1235});
  assert.match(s.diambil, /^\d{4}-\d{2}-\d{2}$/);
});

uji("karbon: cron menyisipkan peringatan GFW dan FIRMS sekali (jalan kedua tanpa ganda)", async () => {
  /* tahap identifikasi tidak dipantau walau bergeometri */
  await api("POST", "/api/karbon/proyek", {nama: "Belum studi", tahap: "identifikasi", geom: kotak(110, -1, 110.1, -0.9)}, ADMIN);
  /* FIRMS: di dalam; 556 m di luar tepi timur (jauh dari semua sudut, menguji jarak ke ruas); 2,2 km di luar */
  const isi = {kolom: ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib"], acuan: "2026-10-22T06:00:00.000Z", dibuat: "2026-10-22T06:15:00.000Z", wilayah: ["14|x"],
    baris: [[0.55, 101.05, 0, "N", 5, 2, 0, "10-22"], [0.55, 101.105, -1, "N", 3, 1, 0, "10-22"], [0.55, 101.12, -2, "N", 3, 1, 0, "10-22"]]};
  await DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(KINI - 3600e3, JSON.stringify(isi)).run();
  panggilan.length = 0;
  const w = await mf.getWorker();
  assert.equal((await w.scheduled({cron: "* * * * *", scheduledTime: KINI})).outcome, "ok");
  const gfw = panggilan.filter(p => p.nama === "peringatan");
  assert.deepEqual(gfw.map(p => p.jalur), ["/dataset/gfw_integrated_alerts/v20261022/query/json", "/dataset/gfw_integrated_alerts/v20261021/query/json"], "404 hari ini -> mundur sehari; hanya proyek tahap pantau");
  const r = (await api("GET", `/api/karbon/peringatan?proyek=${PROYEK}`, null, ADMIN)).j.peringatan;
  const g = r.filter(x => x.sumber === "gfw_terpadu").sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  assert.equal(g.length, 2, "3 piksel satu sel satu tanggal = 1 kejadian");
  assert.equal(g[0].keyakinan, "highest"); assert.equal(g[0].lat, 0.5502); assert.equal(g[0].lon, 101.05013);
  assert.ok(Math.abs(g[0].luas_ha - 3 * (11.132 ** 2) / 1e4) < 1e-3, `luas ${g[0].luas_ha}`);
  const f = r.filter(x => x.sumber === "firms").map(x => x.lon).sort();
  assert.deepEqual(f, [101.05, 101.105], "di dalam + 556 m dari ruas; 2,2 km dibuang");
  assert.ok(r.every(x => x.status === "baru"));
  const n = await hitung("karbon_peringatan");
  await w.scheduled({cron: "* * * * *", scheduledTime: KINI + 60e3 * 0});
  assert.equal(await hitung("karbon_peringatan"), n, "jalan kedua tidak menggandakan");
  assert.ok((await DB.prepare("SELECT pantau_terakhir FROM karbon_proyek WHERE id = ?").bind(PROYEK).first()).pantau_terakhir === KINI);
});

uji("karbon: cron: proyek yang GFW-nya 500 tidak menghalangi proyek berikutnya; pantau_terakhir tetap, pantau_galat terisi", async () => {
  const racun = await api("POST", "/api/karbon/proyek", {nama: "Racun", tahap: "studi", geom: kotak(120, -1, 120.1, -0.9)}, ADMIN); assert.equal(racun.s, 201, racun.t);
  const kini2 = KINI + 864e5, w = await mf.getWorker();
  assert.equal((await w.scheduled({cron: "* * * * *", scheduledTime: kini2})).outcome, "ok");
  const baris = id => DB.prepare("SELECT pantau_terakhir, pantau_galat FROM karbon_proyek WHERE id = ?").bind(id).first();
  const r = await baris(racun.j.id), b = await baris(PROYEK);
  assert.equal(r.pantau_terakhir, null, "gagal = tidak maju"); assert.match(r.pantau_galat, /GFW peringatan HTTP 500/); assert.ok(!/rahasia/.test(r.pantau_galat), "isi respons GFW tidak bocor ke baris");
  assert.equal(b.pantau_terakhir, kini2, "proyek lain tetap diproses"); assert.equal(b.pantau_galat, null);
  /* pulih: galat hilang begitu GFW sukses (geometri diganti ke luar zona racun) */
  const pr = (await api("GET", `/api/karbon/proyek/${racun.j.id}`, null, ADMIN)).j.proyek;
  assert.equal((await api("POST", "/api/karbon/proyek", {id: racun.j.id, diubah: pr.diubah, geom: kotak(110, -1, 110.1, -0.9)}, ADMIN)).s, 201);
  await w.scheduled({cron: "* * * * *", scheduledTime: kini2 + 864e5});
  assert.deepEqual(await baris(racun.j.id), {pantau_terakhir: kini2 + 864e5, pantau_galat: null});
});

uji("karbon: cron di luar menit 48 tidak menjalankan pemantauan karbon", async () => {
  const w = await mf.getWorker(), a = panggilan.length;
  await w.scheduled({cron: "* * * * *", scheduledTime: Date.parse("2026-10-24T23:47:00Z")});
  assert.equal(panggilan.filter(p => p.nama === "peringatan").length, panggilan.slice(0, a).filter(p => p.nama === "peringatan").length, "tak ada panggilan GFW baru");
});

uji("karbon: ubah status peringatan dengan kunci optimistis", async () => {
  const p = (await api("GET", "/api/karbon/peringatan?status=baru", null, ADMIN)).j.peringatan[0];
  assert.equal((await api("POST", "/api/karbon/peringatan", {id: p.id, diubah: p.diubah, status: "valid", catatan: "dicek drone"}, ADMIN)).s, 201);
  assert.equal((await api("POST", "/api/karbon/peringatan", {id: p.id, diubah: p.diubah, status: "palsu"}, ADMIN)).s, 409);
  assert.equal((await api("POST", "/api/karbon/peringatan", {id: p.id, diubah: p.diubah, status: "entah"}, ADMIN)).s, 400);
  assert.equal((await api("GET", "/api/karbon/peringatan?status=valid", null, ADMIN)).j.peringatan[0].catatan, "dicek drone");
});

uji("karbon: saring dari R2 (404 belum ada, 200 sesudah diunggah)", async () => {
  assert.equal((await api("GET", "/api/karbon/saring", null, ADMIN)).s, 404);
  await R2.put("karbon/saring.json", JSON.stringify({n: 1, baris: [{id: "k1"}]}));
  const r = await api("GET", "/api/karbon/saring", null, ADMIN); assert.equal(r.s, 200); assert.equal(r.j.n, 1);
  assert.equal(r.h.get("cache-control"), "private, no-store");
  assert.equal((await api("GET", "/api/karbon/saring_geom", null, ADMIN)).s, 404);
});

uji("halaman /karbon: centurisk97.id wajib masuk; alamat lain 404", async () => {
  const r = await mf.dispatchFetch("https://centurisk97.id/karbon", {redirect: "manual"});
  assert.equal(r.status, 303); assert.match(r.headers.get("location"), /^\/admin\/masuk\?ke=%2Fkarbon/);
  assert.equal((await mf.dispatchFetch("https://pantau.terasurban.com/karbon", {redirect: "manual"})).status, 404);
});

uji("karbon: gerbang host: alamat non-Centurisk menjawab 404 seragam walau token admin sah, tanpa menulis", async () => {
  const sebelum = {}; for (const t of TABEL) sebelum[t] = await hitung(t);
  for (const [m, u, b] of [["GET", "/api/karbon/proyek"], ["GET", "/api/karbon/buku"], ["POST", "/api/karbon/proyek", {nama: "x"}], ["POST", "/api/karbon/pihak", {nama: "x", jenis: "pembeli"}], ["POST", `/api/karbon/stat/${PROYEK}`, {}]]) {
    for (const h of ["pantau.terasurban.com", "contoh.com"]) {
      for (const hd of [ADMIN, {}]) { const x = await apiDi(h, m, u, b, hd); assert.equal(x.s, 404, `${h} ${m} ${u} ${JSON.stringify(hd)}: ${x.t}`); assert.equal(x.t, "Tidak ditemukan"); }
    }
  }
  for (const t of TABEL) assert.equal(await hitung(t), sebelum[t], t);
  assert.equal((await apiDi("localhost", "GET", "/api/karbon/proyek", null, ADMIN)).s, 200, "localhost tetap boleh");
  assert.equal((await apiDi("centurisk97.contoh.workers.dev", "GET", "/api/karbon/proyek", null, ADMIN)).s, 200, "*.workers.dev = situs Centurisk");
});

uji("karbon: KARBON_OLEH membatasi moderator (kosong = semua admin)", async () => {
  const id = createHash("sha256").update("rahasia-admin").digest("hex").slice(0, 12);
  const buat = oleh => new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    d1Databases: {DB: "uji-oleh"}, r2Buckets: {MEDIA: "uji-oleh-r2"}, bindings: {IP_SALT: "g", ADMIN_TOKEN: "rahasia-admin", SESI_KUNCI: "k", KARBON_OLEH: oleh}, serviceBindings: {ASSETS: aset}, outboundService: luar, cache: false});
  for (const [oleh, harap] of [[`000000000000, ${id}`, 200], ["000000000000,aaaaaaaaaaaa", 403], ["", 200]]) {
    const m = buat(oleh);
    try {
      const d = await m.getD1Database("DB"); await d.batch(pecah(migrasi()).map(q => d.prepare(q)));
      for (const [mt, u, b] of [["GET", "/api/karbon/pihak"], ["POST", "/api/karbon/pihak", {nama: "x", jenis: "pembeli"}]]) {
        const x = await apiDi("centurisk97.id", mt, u, b, ADMIN, m); assert.equal(x.s, mt === "GET" ? harap : harap === 200 ? 201 : 403, `KARBON_OLEH=${oleh} ${mt}: ${x.t}`);
      }
      if (harap === 403) assert.equal((await d.prepare("SELECT count(*) n FROM karbon_pihak").first()).n, 0, "ditolak = tidak menulis");
      assert.equal((await apiDi("centurisk97.id", "GET", "/api/karbon/pihak", null, {}, m)).s, 403, "tanpa token tetap 403");
    } finally { await m.dispose(); }
  }
});

uji("karbon: mass-assignment: kolom di luar daftar putih diabaikan, bukan disimpan", async () => {
  const r = await api("POST", "/api/karbon/proyek", {nama: "MA", tahap: "studi", oleh: "penyusup", dibuat: 1, diubah: 2, pantau_terakhir: 5, pantau_galat: "x", stat_diambil: 9, luas_ha: 99999, id: undefined}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const b = await DB.prepare("SELECT * FROM karbon_proyek WHERE id = ?").bind(r.j.id).first();
  assert.equal(b.oleh, createHash("sha256").update("rahasia-admin").digest("hex").slice(0, 12)); assert.ok(b.dibuat > 1e12 && b.diubah > 1e12);
  assert.equal(b.stat, null); assert.equal(b.pantau_terakhir, null); assert.equal(b.pantau_galat, null); assert.equal(b.stat_diambil, null); assert.equal(b.luas_ha, null, "luas hanya dari geometri");
  const u = await api("POST", "/api/karbon/proyek", {id: r.j.id, diubah: b.diubah, catatan: "ok", oleh: "penyusup", stat_diambil: 9, pantau_terakhir: 5, luas_ha: 7}, ADMIN); assert.equal(u.s, 201, u.t);
  const c = await DB.prepare("SELECT * FROM karbon_proyek WHERE id = ?").bind(r.j.id).first();
  assert.equal(c.catatan, "ok"); assert.notEqual(c.oleh, "penyusup"); assert.equal(c.stat, null); assert.equal(c.luas_ha, null);
});

uji("karbon: kebersihan isian: luas 0, lubang di luar, null ke kolom wajib, pesan galat DB generik; tak ada baris baru", async () => {
  const sebelum = {}; for (const t of TABEL) sebelum[t] = await hitung(t);
  const lurus = {type: "Polygon", coordinates: [[[101, 0.5], [101.1, 0.5], [101.2, 0.5], [101, 0.5]]]};
  const luar = {type: "Polygon", coordinates: [kotak(101, 0.5, 101.1, 0.6).coordinates[0], kotak(102, 0.5, 102.01, 0.51).coordinates[0]]};
  for (const [b, harap] of [[{nama: "L0", geom: lurus}, /luas/], [{nama: "Lb", geom: luar}, /lubang/]]) { const x = await api("POST", "/api/karbon/proyek", b, ADMIN); assert.equal(x.s, 400, x.t); assert.match(x.t, harap); }
  const dalamOK = {type: "Polygon", coordinates: [kotak(101, 0.5, 101.1, 0.6).coordinates[0], kotak(101.04, 0.54, 101.05, 0.55).coordinates[0]]};
  const ok = await api("POST", "/api/karbon/proyek", {nama: "Berlubang", geom: dalamOK}, ADMIN); assert.equal(ok.s, 201, ok.t);
  const p = (await api("GET", `/api/karbon/proyek/${ok.j.id}`, null, ADMIN)).j.proyek;
  assert.ok(p.luas_ha < 12360 && p.luas_ha > 12000, `lubang dikurangkan: ${p.luas_ha}`);
  for (const [k, v] of [["nama", null], ["tahap", null]]) { const x = await api("POST", "/api/karbon/proyek", {id: ok.j.id, diubah: p.diubah, [k]: v}, ADMIN); assert.equal(x.s, 400, `${k}=null: ${x.t}`); }
  const ph = (await api("GET", "/api/karbon/pihak", null, ADMIN)).j.pihak[0];
  assert.equal((await api("POST", "/api/karbon/pihak", {id: ph.id, diubah: ph.diubah, nama: null}, ADMIN)).s, 400);
  const lap = (await api("GET", "/api/karbon/laporan", null, ADMIN)).j.laporan[0];
  assert.equal((await api("POST", "/api/karbon/laporan", {id: lap.id, diubah: lap.diubah, isi: null}, ADMIN)).s, 400, "isi laporan wajib");
  /* CHECK D1 yang lolos JS (teks 'ab' vs aturan panjang prov = 2 dikecualikan JS lewat whitelist, jadi paksa lewat nilai lain): pesan tak memuat SQL */
  const pesan = await api("POST", "/api/karbon/proyek", {nama: "x", geom: {type: "Polygon", coordinates: [[[101, 0.5], [101.0000001, 0.5000001], [101.0000002, 0.5], [101, 0.5]]]}}, ADMIN);
  assert.ok(pesan.s === 400 && !/CHECK|constraint|SELECT|INSERT/i.test(pesan.t), pesan.t);
  /* baris baru yang sah tadi (Berlubang) satu-satunya tambahan */
  assert.equal(await hitung("karbon_proyek"), sebelum.karbon_proyek + 1);
  for (const t of TABEL.filter(x => x !== "karbon_proyek")) assert.equal(await hitung(t), sebelum[t], t);
});

uji("karbon: penolakan validasi pihak/kesepakatan/laporan/peringatan tidak menambah baris", async () => {
  const sebelum = {}; for (const t of TABEL) sebelum[t] = await hitung(t);
  const salah = [["/api/karbon/pihak", {nama: "a", jenis: "x"}], ["/api/karbon/pihak", {jenis: "pembeli"}], ["/api/karbon/pihak", {nama: "a", jenis: "pembeli", kontak: "k".repeat(301)}],
    ["/api/karbon/kesepakatan", {arah: "jual"}], ["/api/karbon/kesepakatan", {pihak_id: PIHAK, arah: "x"}], ["/api/karbon/kesepakatan", {pihak_id: "zz", arah: "jual"}], ["/api/karbon/kesepakatan", {pihak_id: PIHAK, arah: "jual", proyek_id: "fedcba9876543210"}],
    ["/api/karbon/kesepakatan", {pihak_id: PIHAK, arah: "jual", volume_t_th: 1e14}], ["/api/karbon/kesepakatan", {pihak_id: PIHAK, arah: "jual", tenggat: "2026-13-45"}],
    ["/api/karbon/laporan", {proyek_id: PROYEK, periode_awal: "2026-01-01", periode_akhir: "2026-02-01"}], ["/api/karbon/laporan", {proyek_id: "fedcba9876543210", periode_awal: "2026-01-01", periode_akhir: "2026-02-01", isi: {}}],
    ["/api/karbon/laporan", {proyek_id: PROYEK, periode_awal: "2026-01-01", periode_akhir: "2026-02-01", isi: [1]}], ["/api/karbon/laporan", {proyek_id: PROYEK, periode_awal: "2026-1-1", periode_akhir: "2026-02-01", isi: {}}],
    ["/api/karbon/peringatan", {id: 0, status: "valid", diubah: 1}], ["/api/karbon/peringatan", {id: 1, status: "valid"}], ["/api/karbon/peringatan", {id: 999999, status: "valid", diubah: 1}], ["/api/karbon/peringatan", {id: 1, status: "x", diubah: 1}]];
  for (const [u, b] of salah) { const x = await api("POST", u, b, ADMIN); assert.ok(x.s >= 400 && x.s < 500, `${u} ${JSON.stringify(b)}: ${x.s} ${x.t}`); }
  for (const t of TABEL) assert.equal(await hitung(t), sebelum[t], `${t}: penolakan tidak boleh menambah baris`);
});

const STAT = {id: "0123456789abcdef", versi: {tcl: "v1.11", tcd: "v202209"}, tahun_data_akhir: 2024, diambil: "2026-10-22", luas_ha: 1200.5, hutan2000_ha: 900, primer_ha: 400, gambut_ha: 10, gambut_hutan_ha: 5,
  stok_tC: {atas: 1000, bawah: 200, tanah: 3000}, hilang: {2001: {ha: 1.5, co2_t: 300, ha_gambut: 0, ha_primer: 0.5, pendorong: {"Hutan Tanaman": {ha: 1, co2_t: 200}}}, 2024: {ha: 0, co2_t: 0, ha_gambut: 0, ha_primer: 0}},
  hilang_api: {2001: 0.5}, tutupan2017: {"Hutan alam": 800.25}, kawasan: {"Hutan Lindung": 50}, pendorong: {"Hutan Tanaman": 10}, serapan_co2_t: 12345};

uji("karbon: stat opsional pada INSERT proyek disimpan; stat tak sah DITOLAK 400 dan tidak menulis; update tak bisa menyetel stat", async () => {
  const kini = Date.now(), p = await api("POST", "/api/karbon/proyek", {nama: "Dengan stat", stat: STAT}, ADMIN); assert.equal(p.s, 201, p.t);
  const g = (await api("GET", `/api/karbon/proyek/${p.j.id}`, null, ADMIN)).j.proyek;
  assert.deepEqual(g.stat, STAT); assert.ok(g.stat_diambil >= kini, "stat_diambil = waktu simpan");
  const sebelum = await hitung("karbon_proyek");
  const klon = f => { const s = structuredClone(STAT); f(s); return s; };
  const buruk = [[klon(s => { s.luas_ha = -1; }), "luas negatif"], [klon(s => { s.luas_ha = "9"; }), "luas teks"], [klon(s => { delete s.hutan2000_ha; }), "tanpa hutan2000"], [klon(s => { delete s.hilang; }), "tanpa hilang"],
    [klon(s => { s.tahun_data_akhir = 1999; }), "tahun < 2001"], [klon(s => { s.tahun_data_akhir = 2024.5; }), "tahun pecahan"], [klon(s => { s.tahun_data_akhir = 2101; }), "tahun > 2100"],
    [klon(s => { s.hilang[1999] = {ha: 1}; }), "kunci hilang di luar 2001..2100"], [klon(s => { s.hilang.abc = {ha: 1}; }), "kunci hilang bukan tahun"], [klon(s => { s.hilang[2001].ha = -2; }), "hilang negatif"],
    [klon(s => { s.hilang[2001].co2_t = "x"; }), "hilang teks"], [klon(s => { s.hilang[2001].aneh = 1; }), "kunci asing di hilang"], [klon(s => { s.aneh = 1; }), "kunci asing di puncak"],
    [klon(s => { s.pendorong.x = null; }), "peta nilai null"], [klon(s => { s.versi.tcl = 5; }), "versi bukan teks"], [klon(s => { s.kawasan = {x: 1e14}; }), "angka melampaui batas"],
    [klon(s => { s.hilang_api = {1990: 1}; }), "kunci hilang_api bukan tahun"], [[], "larik"], ["teks", "string"],
    [klon(s => { s.kawasan = Object.fromEntries(Array.from({length: 5000}, (_, i) => ["Kelas " + i, 123456789.123456])); }), "> 256 KB / terlalu banyak kunci"]];
  for (const [stat, kata] of buruk) { const r = await api("POST", "/api/karbon/proyek", {nama: "Buruk", stat}, ADMIN); assert.equal(r.s, 400, `${kata}: ${r.t}`); }
  const proto = await api("POST", "/api/karbon/proyek", {nama: "Buruk", stat: JSON.parse('{"luas_ha":1,"hutan2000_ha":1,"tahun_data_akhir":2024,"hilang":{"__proto__":{"ha":1}}}')}, ADMIN); assert.equal(proto.s, 400, "__proto__: " + proto.t);
  assert.equal(await hitung("karbon_proyek"), sebelum, "penolakan tidak boleh menulis");
  /* jalur pembaruan: stat ditolak, baris tidak berubah */
  const baris = async () => JSON.stringify(await DB.prepare("SELECT stat, stat_diambil, diubah, catatan FROM karbon_proyek WHERE id = ?").bind(p.j.id).first()), awal = await baris();
  for (const stat of [STAT, null, {luas_ha: 1}]) assert.equal((await api("POST", "/api/karbon/proyek", {id: p.j.id, diubah: g.diubah, stat, catatan: "x"}, ADMIN)).s, 400, "update + stat");
  assert.equal(await baris(), awal);
  assert.equal((await api("POST", "/api/karbon/proyek", {id: p.j.id, diubah: g.diubah, catatan: "ok"}, ADMIN)).s, 201, "update tanpa stat tetap jalan");
});

uji("karbon: GET buku memuat total per (proyek, vintage, jenis) dari SQL, sama dengan jumlah entri", async () => {
  const b = await api("GET", `/api/karbon/buku?proyek=${PROYEK}`, null, ADMIN); assert.equal(b.s, 200, b.t);
  const mentah = (await DB.prepare("SELECT vintage, jenis, sum(jumlah_t) n FROM karbon_buku WHERE proyek_id = ? GROUP BY vintage, jenis").bind(PROYEK).all()).results;
  assert.ok(b.j.total.length >= 4, "vintage 2025..2028");
  for (const t of b.j.total) {
    assert.equal(t.proyek_id, PROYEK);
    for (const j of ["terbit", "cadang", "lepas_cadang", "alih", "pensiun", "batal"]) assert.equal(t[j], mentah.find(m => m.vintage === t.vintage && m.jenis === j)?.n ?? 0, `${t.vintage} ${j}`);
    const s = b.j.saldo.find(x => x.vintage === t.vintage); assert.equal(s.saldo, t.terbit - t.alih - t.pensiun - t.batal, "selaras dengan saldo");
    assert.equal(s.cadang, t.cadang - t.lepas_cadang);
  }
  assert.deepEqual(b.j.total.find(x => x.vintage === 2025), {proyek_id: PROYEK, vintage: 2025, terbit: 100, cadang: 30, lepas_cadang: 0, alih: 0, pensiun: 70, batal: 0});
  assert.deepEqual((await api("GET", "/api/karbon/buku?proyek=fedcba9876543210", null, ADMIN)).j.total, []);
});
