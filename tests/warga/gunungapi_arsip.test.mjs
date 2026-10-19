/* Arsip CAP BMKG permanen (src/nowcast.js, cuaca_arsip) dan pemantauan level gunung api MAGMA (src/gunungapi.js) di workerd (Miniflare):
   D1 lokal, migrasi apa adanya, BMKG/MAGMA dijawab fixture RESPONS NYATA (tests/warga/fixtures: RSS, CAP, tingkat-aktivitas, diambil 19 Okt 2026)
   lewat outboundService, TANPA jaringan. Jalankan: node --test tests/warga/gunungapi_arsip.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: nowcast.js/gunungapi.js saling impor dengannya
import {uraiTingkat} from "../../src/gunungapi.js";
import {ringkasArsip, uraiCAP, kunciArsip, bacaBatas} from "../../src/nowcast.js";

const FIX = f => readFileSync(path.join(AKAR, "tests/warga/fixtures", f), "utf8");
const CAP = FIX("bmkg_cap_nowcast.xml"), RSS0 = FIX("bmkg_nowcast_rss.xml"), MAGMA = FIX("magma_tingkat_aktivitas.html");
const ID_CAP = "2.49.0.1.360.0.2026.10.19.11.64.006", URL_CAP = "https://www.bmkg.go.id/alerts/nowcast/id/CKT20261019006_alert.xml";
const RSS_KOSONG = RSS0.replace(/<item>[\s\S]*<\/item>/g, "");
const RSS_SATU = RSS_KOSONG.replace("</channel>", `<item><title>t</title><link>${URL_CAP}</link></item></channel>`);
const JAM = 3600e3, T_CAP = Date.parse("2026-10-19T12:00:00Z");   // CAP berlaku sampai 2026-10-19T12:55Z

/* level naik/turun: pindahkan satu baris gunung antar kelompok level pada HTML nyata */
const BARIS = /<tr>\s*<td>\s*[^<]+? - [^<]*<a href="[^"]+"[\s\S]*?<\/tr>/;
const PEMBUKA = '<a href="" class="tx-inverse tx-14 tx-medium d-block">Level ';
function pindah(html, dari, ke) {
  const bagian = html.split(PEMBUKA), i = bagian.findIndex(b => b.startsWith(dari + " (")), j = bagian.findIndex(b => b.startsWith(ke + " ("));
  const baris = bagian[i].match(BARIS)[0], nama = baris.match(/<td>\s*([^<]+?) - /)[1];
  bagian[i] = bagian[i].replace(baris, ""); bagian[j] = bagian[j].replace(BARIS, m => baris + m);
  return {html: bagian.join(PEMBUKA), nama};
}

let mf, worker, DB, rssIsi = RSS_KOSONG, magmaIsi = MAGMA, magmaStatus = 200, unduhan = [];
const luar = async req => {
  const u = new URL(req.url); unduhan.push(u.hostname + u.pathname);
  if (u.hostname === "magma.esdm.go.id") return magmaStatus === 200 ? new Response(magmaIsi) : new Response("gagal", {status: magmaStatus});
  if (u.hostname !== "www.bmkg.go.id") return new Response("diblok di uji", {status: 599});
  if (u.pathname === "/alerts/nowcast/id") return new Response(rssIsi);
  return u.pathname.endsWith("CKT20261019006_alert.xml") ? new Response(CAP) : new Response("tidak ada", {status: 404});
};
const aset = async req => {
  const f = path.join(AKAR, "public", decodeURIComponent(new URL(req.url).pathname));
  return existsSync(f) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const berkasMigrasi = readdirSync(path.join(AKAR, "migrations")).filter(f => f.endsWith(".sql")).sort();
const sqlMigrasi = f => pecah(readFileSync(path.join(AKAR, "migrations", f), "utf8"));
const B21 = berkasMigrasi.find(f => f.startsWith("0021_"));
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-arsip"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"}, serviceBindings: {ASSETS: aset}, outboundService: luar, cache: false});
  DB = await mf.getD1Database("DB"); worker = await mf.getWorker();
});
after(() => mf?.dispose());

let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
const tik = t => worker.scheduled({cron: "* * * * *", scheduledTime: new Date(t)});
const baris = async (sql, ...b) => (await DB.prepare(sql).bind(...b).all()).results;
const api = async (j, init) => { const r = await mf.dispatchFetch("http://arsip.lokal" + j, init); const teks = await r.text(); let x = null; try { x = JSON.parse(teks); } catch (e) {} return {status: r.status, j: x, h: r.headers}; };

test("uraiTingkat: fixture MAGMA nyata -> 69 gunung, level 1-3, tautan laporan tanpa tanda tangan; halaman tantangan = kosong", () => {
  const g = uraiTingkat(MAGMA);
  assert.ok(g.length >= 40, `hanya ${g.length}`);
  assert.deepEqual([...new Set(g.map(x => x.level))].sort(), [1, 2, 3]);
  assert.ok(g.every(x => x.nama && !/[<>&]/.test(x.nama + x.prov) && (x.laporan === null || /^https:\/\/magma\.esdm\.go\.id\/v1\/gunung-api\/laporan\/\d+$/.test(x.laporan))));
  assert.equal(g.find(x => x.nama === "Anak Krakatau").prov, "Lampung");
  assert.deepEqual(uraiTingkat("<html>Just a moment...</html>"), []);
});

test("kunciArsip: urutan/encoding beda dengan nilai sama = satu kunci; nilai tak lolos pola tidak masuk kunci", () => {
  const k = q => kunciArsip(new URL("http://x/api/cuaca/arsip?" + q));
  assert.equal(k("dari=2026-10-19&sampai=2026-10-20"), "?dari=2026-10-19&sampai=2026-10-20");
  assert.equal(k("sampai=2026-10-20&dari=2026%2D10%2D19"), k("dari=2026-10-19&sampai=2026-10-20"));
  assert.equal(k("dari=zzz&x=1"), "");
});

test("uraiTingkat: <td> + 1 MB spasi tanpa <a tidak membuat regex macet (< 200 ms)", () => {
  const t = performance.now();
  assert.deepEqual(uraiTingkat('<a href="" class="tx-inverse tx-14 tx-medium d-block">Level II (x)' + "<td>" + " ".repeat(1e6) + "<td>" + " ".repeat(1e6)), []);
  assert.ok(performance.now() - t < 200, `${performance.now() - t} ms`);
});

test("bacaBatas: content-length besar ditolak tanpa membaca; stream tanpa content-length dihentikan saat lewat batas; teks wajar utuh", async () => {
  await assert.rejects(bacaBatas(new Response("x", {headers: {"content-length": "999"}}), 10), /terlalu besar/);
  let ditarik = 0;
  const alir = new ReadableStream({pull(c) { ditarik++; c.enqueue(new Uint8Array(1000)); if (ditarik > 1000) c.close(); }});
  await assert.rejects(bacaBatas(new Response(alir), 5000), /terlalu besar/);
  assert.ok(ditarik < 20, `stream dibaca ${ditarik}x`);
  assert.equal(await bacaBatas(new Response("héllo"), 100), "héllo");
});

test("bersih membuang karakter bidi dan zero-width", async () => {
  const {bersih} = await import("../../src/nowcast.js");
  assert.equal(bersih("a\u202eb\u200bc\u2066d", 50), "abcd");
});

test("ringkasArsip: poligon disederhanakan (<= 8 cincin x <= 12 titik), bbox dari titik ASLI", () => {
  const c = uraiCAP(CAP), r = ringkasArsip(c.p, ["64"]);
  const asli = c.p.polygon.flat(), poli = JSON.parse(r.poligon), bbox = JSON.parse(r.bbox);
  assert.ok(poli.length === Math.min(8, c.p.polygon.length) && poli.every(ring => ring.length <= 12 && ring.length >= 3), JSON.stringify(poli.map(x => x.length)));
  assert.deepEqual(bbox, [Math.min(...asli.map(p => p[0])), Math.min(...asli.map(p => p[1])), Math.max(...asli.map(p => p[0])), Math.max(...asli.map(p => p[1]))]);
  assert.equal(r.prov, "64"); assert.equal(r.tingkat, "Moderate");
});

uji("migrasi 0021 di atas 0001-0020 berisi data: data lama utuh; dijalankan dua kali idempoten", async () => {
  assert.ok(B21, "migrations/0021_*.sql ada");
  for (const f of berkasMigrasi.filter(f => f < B21)) await DB.batch(sqlMigrasi(f).map(s => DB.prepare(s)));
  await DB.batch([DB.prepare("INSERT INTO cuaca_nowcast (id, url, selesai, isi, dibuat) VALUES ('LAMA1', 'https://www.bmkg.go.id/alerts/nowcast/id/LAMA1_alert.xml', ?, '{}', 1)").bind(T_CAP + JAM),
    DB.prepare("INSERT INTO cuaca_sumber (kunci, isi, dibuat) VALUES ('nowcast', '{}', 1)")]);
  const sql = sqlMigrasi(B21).map(s => DB.prepare(s));
  await DB.batch(sql); await DB.batch(sql);
  assert.equal((await baris("SELECT count(*) n FROM cuaca_nowcast"))[0].n, 1); assert.equal((await baris("SELECT dibuat FROM cuaca_sumber WHERE kunci='nowcast'"))[0].dibuat, 1);
  const tabel = (await baris("SELECT name FROM sqlite_master WHERE type='table'")).map(r => r.name);
  for (const t of ["cuaca_arsip", "gunungapi_level", "gunungapi_ubah"]) assert.ok(tabel.includes(t), t);
  await DB.prepare("DELETE FROM cuaca_nowcast").run();
});

uji("CAP baru: aktif di cuaca_nowcast DAN langsung di cuaca_arsip dengan bbox, poligon sederhana, wilayah, pertama_dilihat", async () => {
  rssIsi = RSS_SATU; await tik(T_CAP);
  assert.equal((await baris("SELECT count(*) n FROM cuaca_nowcast"))[0].n, 1);
  const a = await baris("SELECT * FROM cuaca_arsip");
  assert.equal(a.length, 1); assert.equal(a[0].id, ID_CAP); assert.equal(a[0].event, "Hujan Lebat dan Petir"); assert.equal(a[0].tingkat, "Moderate");
  assert.equal(a[0].mulai, Date.parse("2026-10-19T18:57:00+08:00")); assert.equal(a[0].selesai, Date.parse("2026-10-19T20:55:00+08:00"));
  assert.match(a[0].wilayah, /GUNUNG TABUR/); assert.equal(a[0].pertama_dilihat, T_CAP);
  assert.ok(JSON.parse(a[0].poligon).every(r => r.length <= 12)); assert.equal(JSON.parse(a[0].bbox).length, 4);
  assert.ok(a[0].poligon.length < 3000, `arsip harus ringkas: ${a[0].poligon.length} B`);
});

uji("putaran ulang tidak menggandakan arsip; pertama_dilihat tidak bergeser", async () => {
  await tik(T_CAP + 600e3);
  const a = await baris("SELECT pertama_dilihat FROM cuaca_arsip"); assert.equal(a.length, 1); assert.equal(a[0].pertama_dilihat, T_CAP);
});

uji("pembersihan 6 jam: baris aktif HILANG, arsip TETAP", async () => {
  rssIsi = RSS_KOSONG; await tik(Date.parse("2026-10-19T12:55:00Z") + 6 * JAM + 300e3);
  assert.equal((await baris("SELECT count(*) n FROM cuaca_nowcast"))[0].n, 0, "baris aktif dibersihkan seperti semula");
  assert.equal((await baris("SELECT count(*) n FROM cuaca_arsip WHERE id = ?", ID_CAP))[0].n, 1, "arsip permanen");
});

uji("CAP yang hanya ada di cuaca_nowcast (sebelum 0021) diarsipkan sebelum dihapus", async () => {
  const p = uraiCAP(CAP).p, isi = JSON.stringify({...p, id: "SEBELUM-0021", prov: ["64"], url: "u"});
  await DB.prepare("INSERT INTO cuaca_nowcast (id, url, selesai, isi, dibuat) VALUES ('SEBELUM-0021', 'u', ?, ?, 4242)").bind(Date.parse("2026-10-19T12:55:00Z"), isi).run();
  await tik(Date.parse("2026-10-19T12:55:00Z") + 7 * JAM + 300e3);   // kelipatan 10 menit: nowcast jalan
  assert.equal((await baris("SELECT count(*) n FROM cuaca_nowcast"))[0].n, 0);
  const a = await baris("SELECT prov, pertama_dilihat FROM cuaca_arsip WHERE id = 'SEBELUM-0021'"); assert.equal(a.length, 1); assert.equal(a[0].prov, "64"); assert.equal(a[0].pertama_dilihat, 4242);
});

uji("GET /api/cuaca/arsip sah: rentang menurut waktu mulai, bentuk JSON, cache 300 dtk, HEAD tanpa badan", async () => {
  const r = await api("/api/cuaca/arsip?dari=2026-10-19&sampai=2026-10-19");
  assert.equal(r.status, 200); assert.match(r.h.get("cache-control"), /public, max-age=300/);
  assert.deepEqual([r.j.dari, r.j.sampai, r.j.terpotong], ["2026-10-19", "2026-10-19", false]);
  const a = r.j.arsip.find(x => x.id === ID_CAP);
  assert.ok(a); for (const k of ["id", "event", "tingkat", "mulai", "selesai", "bbox", "poligon", "wilayah", "prov", "pertama_dilihat"]) assert.ok(k in a, k);
  assert.equal(a.mulai, "2026-10-19T10:57:00.000Z"); assert.ok(a.prov.includes("64") && a.prov.every(k => /^\d+$/.test(k)), JSON.stringify(a.prov)); assert.equal(a.poligon.length, 8, "maks 8 cincin dari 9 asli");
  assert.deepEqual((await api("/api/cuaca/arsip?dari=2026-10-20&sampai=2026-10-21")).j.arsip, []);
  assert.equal((await api("/api/cuaca/arsip")).status, 200, "tanpa parameter = 7 hari terakhir");
  const h = await mf.dispatchFetch("http://arsip.lokal/api/cuaca/arsip?dari=2026-10-19&sampai=2026-10-19", {method: "HEAD"}); assert.equal(h.status, 200); assert.equal(await h.text(), "");
});

uji("GET /api/cuaca/arsip tak sah DITOLAK 400: tanggal ngawur, dari > sampai, rentang > 62 hari, sebelum 2020, parameter asing; POST 405", async () => {
  for (const q of ["dari=abc", "dari=2026-13-01", "dari=2026-02-30", "sampai=2026-10-19T00:00", "dari=2026-10-20&sampai=2026-10-19", "dari=2026-01-01&sampai=2026-10-19",
    "dari=2019-12-31&sampai=2020-01-02", "dari=2026-10-19&x=1", "dari=2026-10-19&dari=2026-10-18", "sampai=2026-10-19&sampai=2026-10-19", "dari=", "sampai=2026-10-19&dari=' OR 1=1"]) {
    const r = await api("/api/cuaca/arsip?" + q); assert.equal(r.status, 400, q); assert.ok(r.j.galat, q);
  }
  assert.equal((await api("/api/cuaca/arsip?dari=2026-08-19&sampai=2026-10-19")).status, 200, "tepat 62 hari lolos");
  assert.equal((await mf.dispatchFetch("http://arsip.lokal/api/cuaca/arsip", {method: "POST", body: "{}"})).status, 405);
});

uji("batas baris: lebih dari 1000 CAP dalam rentang = terpotong:true dengan tepat 1000 baris", async () => {
  const t = Date.parse("2026-09-05T00:00:00Z");
  await DB.batch(Array.from({length: 1001}, (_, i) => DB.prepare("INSERT INTO cuaca_arsip (id, event, tingkat, mulai, selesai, wilayah, prov, pertama_dilihat) VALUES (?, 'E', 'Minor', ?, ?, 'W', '', ?)").bind("BANYAK" + String(i).padStart(4, "0"), t + i * 1000, t + JAM, t)));
  const r = await api("/api/cuaca/arsip?dari=2026-09-05&sampai=2026-09-05");
  assert.equal(r.j.arsip.length, 1000); assert.equal(r.j.terpotong, true); assert.equal(r.j.arsip[0].bbox, null); assert.deepEqual(r.j.arsip[0].prov, []);
});

uji("arsip gagal (tabel hilang) tidak menjatuhkan nowcast aktif; API arsip 503 bukan 500", async () => {
  await DB.prepare("ALTER TABLE cuaca_arsip RENAME TO cuaca_arsip_x").run();
  rssIsi = RSS_SATU; await tik(T_CAP + 1200e3);   // CAP masih berlaku pada saat ini
  assert.equal((await baris("SELECT count(*) n FROM cuaca_nowcast WHERE id = ?", ID_CAP))[0].n, 1, "nowcast tetap tersimpan");
  assert.equal((await api("/api/cuaca/arsip?dari=2026-10-19&sampai=2026-10-19")).status, 503);
  await DB.prepare("ALTER TABLE cuaca_arsip_x RENAME TO cuaca_arsip").run(); await DB.prepare("DELETE FROM cuaca_nowcast").run();
});

/* ---- MAGMA ---- */
const T = Math.floor((Date.now() - 7 * 60e3) / 1800e3) * 1800e3 + 7 * 60e3;   // menit % 30 == 7 terakhir yang tidak di masa depan
const magma = () => unduhan.filter(u => u.startsWith("magma.esdm.go.id"));

uji("menit bukan 7/37: MAGMA tidak disentuh sama sekali", async () => {
  unduhan = []; await tik(T + 3 * 60e3); await tik(T - 7 * 60e3);
  assert.deepEqual(magma(), []);
  assert.equal((await api("/api/gunungapi/terbaru")).j.dibuat, null, "sebelum putaran: dibuat null, gunung kosong"); 
});

uji("putaran pertama: SATU permintaan MAGMA, level tersimpan, kemunculan pertama BUKAN peristiwa; API bentuk JSON + cache 60 dtk", async () => {
  unduhan = []; await tik(T);
  assert.equal(magma().length, 1, "satu permintaan per putaran");
  const n = uraiTingkat(MAGMA).length;
  assert.equal((await baris("SELECT count(*) n FROM gunungapi_level"))[0].n, n);
  assert.equal((await baris("SELECT count(*) n FROM gunungapi_ubah"))[0].n, 0);
  const r = await api("/api/gunungapi/terbaru");
  assert.equal(r.status, 200); assert.match(r.h.get("cache-control"), /public, max-age=60/);
  assert.equal(r.j.gunung.length, n); assert.equal(r.j.basi, false); assert.ok(r.j.umur_menit >= 0 && r.j.umur_menit < 40); assert.deepEqual(r.j.perubahan, []);
  assert.deepEqual(Object.keys(r.j.gunung[0]).sort(), ["diubah", "laporan", "level", "nama", "prov"]);
  assert.ok(r.j.gunung[0].level >= r.j.gunung.at(-1).level, "level tertinggi dulu");
});

let nama;
uji("level sama putaran berikutnya: tidak ada tulis ulang (diubah tetap), tidak ada peristiwa", async () => {
  const sebelum = await baris("SELECT nama, diubah FROM gunungapi_level ORDER BY nama"); await tik(T + 1800e3);
  assert.deepEqual(await baris("SELECT nama, diubah FROM gunungapi_level ORDER BY nama"), sebelum); assert.equal((await baris("SELECT count(*) n FROM gunungapi_ubah"))[0].n, 0);
});

uji("kenaikan level (II -> III) tercatat sebagai peristiwa naik=1, level terkini berubah, kemunculan di /terbaru", async () => {
  const p = pindah(MAGMA, "II", "III"); magmaIsi = p.html; nama = p.nama;
  await tik(T + 2 * 1800e3);
  const u = await baris("SELECT nama, dari, ke, naik, waktu FROM gunungapi_ubah");
  assert.deepEqual(u.map(x => [x.nama, x.dari, x.ke, x.naik]), [[nama, 2, 3, 1]]);
  assert.equal((await baris("SELECT level, diubah FROM gunungapi_level WHERE nama = ?", nama))[0].level, 3);
  const r = (await api("/api/gunungapi/terbaru")).j;
  assert.equal(r.gunung.find(g => g.nama === nama).level, 3); assert.deepEqual(r.perubahan.map(x => [x.nama, x.dari, x.ke, x.naik]), [[nama, 2, 3, true]]);
});

uji("pagar kenaikan massal: > 10 kenaikan sekaligus = tidak ada peristiwa/level tertulis, galat dicatat", async () => {
  const sebelum = await baris("SELECT nama, level FROM gunungapi_level ORDER BY nama"), u = (await baris("SELECT count(*) n FROM gunungapi_ubah"))[0].n;
  let h = MAGMA; for (let i = 0; i < 12; i++) h = pindah(h, "I", "III").html;
  magmaIsi = h; await tik(T + 3 * 1800e3);
  assert.deepEqual(await baris("SELECT nama, level FROM gunungapi_level ORDER BY nama"), sebelum); assert.equal((await baris("SELECT count(*) n FROM gunungapi_ubah"))[0].n, u);
  assert.match(JSON.parse((await baris("SELECT isi FROM cuaca_sumber WHERE kunci='gunungapi_galat'"))[0].isi).pesan, /12 kenaikan/);
  magmaIsi = pindah(MAGMA, "II", "III").html;
});

uji("MAGMA gagal (500, halaman tantangan, terlalu sedikit gunung): data lama UTUH, stempel sehat tidak maju, galat dicatat", async () => {
  const n = (await baris("SELECT count(*) n FROM gunungapi_level"))[0].n, sehat = (await baris("SELECT dibuat FROM cuaca_sumber WHERE kunci='gunungapi'"))[0].dibuat;
  for (const [st, isi] of [[500, ""], [200, "<html>Just a moment...</html>"], [200, MAGMA.split(PEMBUKA).slice(0, 3).join(PEMBUKA)]]) {
    magmaStatus = st; magmaIsi = isi; await tik(T + 3 * 1800e3);
    assert.equal((await baris("SELECT count(*) n FROM gunungapi_level"))[0].n, n, `${st} ${isi.slice(0, 12)}`);
    assert.equal((await baris("SELECT level FROM gunungapi_level WHERE nama = ?", nama))[0].level, 3);
    assert.equal((await baris("SELECT dibuat FROM cuaca_sumber WHERE kunci='gunungapi'"))[0].dibuat, sehat);
  }
  assert.equal((await baris("SELECT count(*) n FROM cuaca_sumber WHERE kunci='gunungapi_galat'"))[0].n, 1);
  magmaStatus = 200;
  const r = (await api("/api/gunungapi/terbaru")).j; assert.equal(r.gunung.length, n); assert.equal(r.gunung.find(g => g.nama === nama).level, 3);
});

uji("umur ditandai: stempel sehat > 90 menit = basi:true dengan umur_menit; data tetap ikut", async () => {
  await DB.prepare("UPDATE cuaca_sumber SET dibuat = ? WHERE kunci = 'gunungapi'").bind(Date.now() - 3 * JAM).run();
  const r = (await api("/api/gunungapi/terbaru")).j; assert.equal(r.basi, true); assert.ok(r.umur_menit >= 179); assert.ok(r.gunung.length > 40);
});

uji("penurunan level (III -> II) tercatat naik=0; riwayat > 90 hari dibuang oleh putaran", async () => {
  magmaIsi = MAGMA; await DB.prepare("INSERT INTO gunungapi_ubah (nama, dari, ke, naik, waktu) VALUES ('Tua', 1, 2, 1, ?)").bind(T - 91 * 86400e3).run();
  await tik(T + 4 * 1800e3);
  const u = await baris("SELECT nama, dari, ke, naik FROM gunungapi_ubah ORDER BY id");
  assert.deepEqual(u.map(x => [x.nama, x.dari, x.ke, x.naik]), [[nama, 2, 3, 1], [nama, 3, 2, 0]], "peristiwa 'Tua' terbuang");
  assert.equal((await api("/api/gunungapi/terbaru")).j.basi, false);
});

uji("CHECK skema: level 5 dan naik=2 ditolak", async () => {
  await assert.rejects(DB.prepare("INSERT INTO gunungapi_level (nama, prov, level, diubah) VALUES ('X', 'P', 5, 1)").run());
  await assert.rejects(DB.prepare("INSERT INTO gunungapi_ubah (nama, dari, ke, naik, waktu) VALUES ('X', 1, 2, 2, 1)").run());
});

uji("POST 405; tabel hilang = 503 bukan 500 dan cron tidak melempar", async () => {
  assert.equal((await mf.dispatchFetch("http://arsip.lokal/api/gunungapi/terbaru", {method: "POST", body: "{}"})).status, 405);
  await DB.prepare("ALTER TABLE gunungapi_level RENAME TO gunungapi_level_x").run();
  assert.equal((await api("/api/gunungapi/terbaru")).status, 503); await tik(T + 5 * 1800e3);
  await DB.prepare("ALTER TABLE gunungapi_level_x RENAME TO gunungapi_level").run();
});
