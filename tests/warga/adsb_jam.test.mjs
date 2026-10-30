/* Panen ADS-B per jam (migrasi 0079, src/adsb.js): worker utuh di workerd, D1 sungguhan; adsb.fi disuntik lewat outboundService.
   Dibuktikan: migrasi idempoten + CHECK; scheduled() menit 46 menulis, menit lain tidak; saring/gabung (heli dulu, batas 500); 429 menghentikan panen;
   kill switch; ringkasan harian WIB; pangkas 90 hari hanya jam 05 UTC.
   Jalankan: node --test tests/warga/adsb_jam.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai} from "./_bnpb.mjs";
import {saring, gabung, panenAdsb, ringkasHarian, bersihkanAdsb, LINGKARAN, BATAS_BARIS} from "../../src/adsb.js";

const JAM = 3600e3, HARI = 24 * JAM, uji = berantai();
const SQL = readFileSync(path.join(AKAR, "migrations/0085_adsb_posisi.sql"), "utf8");
const hex = n => n.toString(16).padStart(6, "0");
const pesawat = (n, o = {}) => ({hex: hex(n), lat: -2, lon: 114, alt_baro: 3000, gs: 100, t: "C172", flight: "PKABC ", ...o});
let permintaan = [], respons = () => ({ac: []});
const luar = req => {
  const u = new URL(req.url); permintaan.push(u.pathname);
  if (u.hostname !== "opendata.adsb.fi") return new Response("diblok", {status: 599});
  const r = respons(u.pathname, permintaan.filter(p => p.includes("/api/v3/")).length);
  return r instanceof Response ? r : new Response(JSON.stringify(r));
};
const T = await siapkan("uji-adsb", {luar});
const n = async (w = "1") => (await T.DB.prepare(`SELECT count(*) n FROM adsb_posisi WHERE ${w}`).first()).n;
const kosong = () => T.DB.prepare("DELETE FROM adsb_posisi").run();
const jalan = async (t) => { permintaan = []; await (await T.mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: t}); };
const T46 = Date.UTC(2026, 9, 29, 12, 46), JEDA0 = {jeda: 0};

uji("adsb: migrasi 0079 idempoten, CHECK heli, kunci (hex, menit) WITHOUT ROWID + indeks menit", async () => {
  for (let i = 0; i < 2; i++) await T.DB.batch(pecah(SQL).map(s => T.DB.prepare(s)));
  const sk = (await T.DB.prepare("SELECT name, sql FROM sqlite_master WHERE name LIKE 'adsb_%' ORDER BY name").all()).results;
  assert.deepEqual(sk.map(x => x.name), ["adsb_posisi", "adsb_posisi_menit"]);
  assert.match(sk[0].sql, /WITHOUT ROWID/);
  const ins = (h, m, heli = 0) => T.DB.prepare("INSERT INTO adsb_posisi (hex, menit, wilayah, lat, lon, heli) VALUES (?,?,'x',0,0,?)").bind(h, m, heli).run();
  await assert.rejects(ins("aaaaaa", 1, 2), /CHECK/);
  await ins("aaaaaa", 1); await assert.rejects(ins("aaaaaa", 1), /UNIQUE|PRIMARY/); await ins("aaaaaa", 2);
  await kosong();
});

uji("adsb: saring membuang penerbangan tinggi, hex cacat, tanpa posisi; helikopter (A7 atau tipe) selalu lolos; ground = 0 kaki", () => {
  const r = saring([pesawat(1), pesawat(2, {alt_baro: 35000}), pesawat(3, {alt_baro: 35000, category: "A7"}), pesawat(4, {t: "R44", alt_baro: 20000}),
    pesawat(5, {alt_baro: "ground"}), {hex: "zz", lat: 1, lon: 1}, {hex: hex(6)}, pesawat(7, {alt_baro: undefined})], "kalteng");
  assert.deepEqual(r.map(p => p.hex), [hex(1), hex(3), hex(4), hex(5), hex(7)]);
  assert.deepEqual(r.map(p => p.heli), [0, 1, 1, 0, 0]);
  assert.equal(r[3].alt, 0); assert.equal(r[0].flight, "PKABC"); assert.equal(r[4].alt, null);
});

uji("adsb: gabung satu baris per hex (heli menang), helikopter dulu, maksimum 500", () => {
  const banyak = Array.from({length: 700}, (_, i) => pesawat(i + 100));
  const heliAkhir = pesawat(5000, {category: "A7"});
  const g = gabung([saring(banyak, "a"), [{...saring([pesawat(100)], "b")[0], heli: 1, wilayah: "b"}], [{...saring([heliAkhir], "c")[0]}]]);
  assert.equal(g.length, BATAS_BARIS);
  assert.deepEqual(g.slice(0, 2).map(p => p.heli), [1, 1], "heli di depan");
  assert.equal(new Set(g.map(p => p.hex)).size, g.length);
  assert.equal(g.find(p => p.hex === hex(100)).wilayah, "b", "versi heli menimpa");
});

uji("adsb: scheduled menit 46 memanggil 7 lingkaran berurutan dan menulis; menit lain tidak menyentuh adsb.fi", async () => {
  respons = (p) => ({ac: [pesawat(1, {lat: -2}), pesawat(parseInt(p.length), {category: "A7", t: "H145"})]});
  await jalan(T46 - 60e3);
  assert.equal(permintaan.filter(p => p.includes("/api/v3/")).length, 0, "menit 45 sunyi");
  await jalan(T46);
  const hit = permintaan.filter(p => p.includes("/api/v3/"));
  assert.equal(hit.length, LINGKARAN.length, "7 lingkaran");
  assert.ok(hit[0].includes("/lat/-0.5/lon/102/dist/250") && hit[6].includes("/lat/-7.5/lon/139.5/dist/250"));
  assert.ok(await n() >= 2 && await n("heli = 1") >= 1);
  assert.equal(await n(`menit = ${Math.floor(T46 / JAM) * JAM}`), await n(), "menit dibulatkan ke jam");
  const sebelum = await n(); await jalan(T46 + 5e3); assert.equal(await n(), sebelum, "ulang di jam sama idempoten");
}, 30000);

uji("adsb: 429 menghentikan panen (tanpa permintaan berikutnya), yang sudah terkumpul tetap tersimpan", async () => {
  await kosong();
  respons = (p, i) => i === 3 ? new Response("lambat", {status: 429}) : {ac: [pesawat(i)]};
  await jalan(T46 + JAM);
  assert.equal(permintaan.filter(p => p.includes("/api/v3/")).length, 3);
  assert.equal(await n(), 2);
}, 30000);

uji("adsb: kill switch env.ADSB=mati dan 5xx/jaringan tidak menggagalkan putaran", async () => {
  await kosong();
  assert.deepEqual(await panenAdsb({DB: T.DB, ADSB: "mati"}, T46), {lewat: "mati"});
  const asli = globalThis.fetch; let r;
  globalThis.fetch = async (u) => { permintaan.push(String(u)); return new Response("x", {status: 500}); };   // panenAdsb dipanggil langsung dari node, bukan lewat workerd
  try { r = await panenAdsb({DB: T.DB}, T46, JEDA0); } finally { globalThis.fetch = asli; }
  assert.equal(r.baris, 0); assert.equal(r.galat.length, LINGKARAN.length); assert.equal(await n(), 0);
});

uji("adsb: ringkasHarian per tanggal WIB: jam hadir, n_jam, wilayah, heli", async () => {
  await kosong();
  const jamUtc = h => Date.UTC(2026, 9, 29, h);   // 17 UTC = 00 WIB 30 Okt
  const ins = (h, m, w, heli = 0) => T.DB.prepare("INSERT INTO adsb_posisi (hex, menit, wilayah, lat, lon, heli, tipe) VALUES (?,?,?,0,0,?, 'H145')").bind(h, m, w, heli).run();
  await ins("aaaaaa", jamUtc(1), "kalteng", 1); await ins("aaaaaa", jamUtc(2), "kalteng", 1); await ins("bbbbbb", jamUtc(16), "kalbar");   // 16 UTC = 23 WIB 29 Okt
  await ins("bbbbbb", jamUtc(17), "kalbar");   // 00 WIB 30 Okt: hari lain
  const r = await ringkasHarian({DB: T.DB}, "2026-10-29");
  assert.deepEqual(r.map(x => [x.hex, x.wilayah, x.n_jam, x.jam, x.heli]), [["aaaaaa", "kalteng", 2, [8, 9], 1], ["bbbbbb", "kalbar", 1, [23], 0]]);
  assert.deepEqual((await ringkasHarian({DB: T.DB}, "2026-10-30")).map(x => x.jam), [[0]]);
});

uji("adsb: pangkas 90 hari hanya jam 05 UTC (jam lain dilewati; paksa jalan)", async () => {
  await kosong();
  const kini = Date.UTC(2026, 9, 29, 5, 17);
  const ins = (h, m) => T.DB.prepare("INSERT INTO adsb_posisi (hex, menit, wilayah, lat, lon) VALUES (?,?,'x',0,0)").bind(h, m).run();
  await ins("aaaaaa", kini - 91 * HARI); await ins("bbbbbb", kini - 89 * HARI);
  assert.deepEqual(await bersihkanAdsb({DB: T.DB}, kini - 5 * JAM), {lewat: "bukan jamnya"}); assert.equal(await n(), 2);
  assert.deepEqual(await bersihkanAdsb({DB: T.DB}, kini), {dihapus: 1}); assert.equal(await n(), 1);
});
