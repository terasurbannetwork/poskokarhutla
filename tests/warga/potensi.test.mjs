/* PH-07: rute Potensi Bencana Hidromet (src/potensi.js) di Miniflare: R2 sungguhan, ASSETS dari public/, BMKG di-stub lewat outboundService.
   RENCANA-UJI U6 (rekomendasi 401/403/200), U7 (BMKG: kode tidak sah 400, galat, antrean). */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, sha256} from "./_bnpb.mjs";
import "../../src/worker.js";
const {ringkasBmkg} = await import("../../src/potensi.js");   // worker.js dulu (RUTE_* disebar saat evaluasi, TDZ bila terbalik)

const panggilan = []; let mode = "ok";
const item = (dt, tp, t, ws, w) => ({local_datetime: dt, tp, t, ws, weather: w, weather_desc: "x", utc_datetime: dt});
const BMKG = {lokasi: {}, data: [{cuaca: [[item("2026-11-27 01:00:00", 1.5, 24, 5, 3), item("2026-11-27 04:00:00", 2, 28, 12, 61)], [item("2026-11-27 07:00:00", 0.5, 30, 8, 61), item("2026-11-28 01:00:00", null, null, null, null)]]}]};
const U = await siapkan("uji-potensi", {r2: true, luar: req => {
  const u = new URL(req.url);
  if (u.hostname !== "api.bmkg.go.id") return new Response("diblok di uji", {status: 599});
  panggilan.push(u.searchParams.get("adm4"));
  return mode === "ok" ? new Response(JSON.stringify(BMKG), {headers: {"content-type": "application/json"}}) : new Response("rahasia-internal", {status: 500});
}}), uji = berantai();
const R2 = await U.mf.getR2Bucket("MEDIA");
const ip = n => ({"cf-connecting-ip": `10.9.0.${n}`});

uji("ringkasBmkg: hujan dijumlah, suhu min/maks, angin maks, kode terbanyak; tanpa nilai = null bukan nol", () => {
  const r = ringkasBmkg(BMKG);
  assert.deepEqual(r[0], {tgl: "2026-11-27", hujan_mm: 4, t_min: 24, t_maks: 30, angin_maks_kmj: 12, kode_cuaca: 61});
  assert.deepEqual(r[1], {tgl: "2026-11-28", hujan_mm: null, t_min: null, t_maks: null, angin_maks_kmj: null, kode_cuaca: null});
  assert.equal(ringkasBmkg({data: [{cuaca: [[]]}]}), null);
});

uji("analisis: 404 sebelum terbit, 200 hanya kolom daftar izin dengan cache 300 s", async () => {
  const a = await U.api("GET", "/api/potensi/analisis", undefined, ip(1));
  assert.equal(a.s, 404); assert.ok(a.j.galat);
  await R2.put("dampak_peringatan/analisis.json", JSON.stringify({dibuat: "x", matriks: {BNJ: 1}, hujan: [1], rahasia: "bocor", desa_tinggi: [2], sumber: {a: 1}}));
  const r = await U.api("GET", "/api/potensi/analisis", undefined, ip(2));
  assert.equal(r.s, 200); assert.deepEqual(Object.keys(r.j).sort(), ["desa_tinggi", "dibuat", "hujan", "matriks", "sumber"]);
  assert.match(r.h.get("cache-control") || "", /public, max-age=300/);
});

const staf = async (id, peran) => {
  const tok = id.repeat(64).slice(0, 64);
  await U.DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, ?, ?, 'Pusdalops', ?, ?, ?, '[]', ?, ?, 0, 1, 'tes', 0)`).bind(id.repeat(16), "phuji" + id + "xx", "Staf " + id, "9300" + id + "000", id + "@b.id", "6281400000" + id.charCodeAt(0), JSON.stringify(peran), "a".repeat(32), "a".repeat(64)).run();
  await U.DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), id.repeat(16), Date.now() + 3600e3).run();
  return {cookie: "sesi_staf=" + tok, "x-pb": "1"};
};

uji("U6 rekomendasi: 401 tanpa sesi, 403 peran lain, 200 staf dan admin, 400 parameter tidak sah, no-store", async () => {
  const q = "/api/potensi/rekomendasi?bahaya=BNJ&status=3";
  assert.equal((await U.api("GET", q, undefined, ip(3))).s, 401);
  assert.equal((await U.api("GET", q, undefined, await staf("c", ["tmc"]))).s, 403);
  const ok = await U.api("GET", q, undefined, await staf("d", ["pusdalops"]));
  assert.equal(ok.s, 200); assert.match(ok.h.get("cache-control") || "", /no-store/);
  assert.equal(ok.j.fase, "respon"); assert.deepEqual(Object.keys(ok.j.pihak), ["pusat", "prov", "kab", "masy"]);
  for (const p of ["pusat", "prov", "kab", "masy"]) { assert.ok(ok.j.pihak[p].length > 0, p); for (const b of ok.j.pihak[p]) assert.ok(b.teks && b.rujukan && typeof b.generik === "boolean", JSON.stringify(b)); }
  assert.equal((await U.api("GET", q, undefined, ADMIN)).s, 200);
  for (const s of ["BNJ&status=4", "BNJ&status=x", "ZZZ&status=1", "BNJ"]) assert.equal((await U.api("GET", "/api/potensi/rekomendasi?bahaya=" + s, undefined, ADMIN)).s, 400, s);
});

uji("rekomendasi: fase mengikuti status; mitigasi tanpa butir masyarakat = [] (tidak dikarang)", async () => {
  const r = async (b, s) => (await U.api("GET", `/api/potensi/rekomendasi?bahaya=${b}&status=${s}`, undefined, ADMIN)).j;
  assert.equal((await r("LSR", 1)).fase, "siaga"); assert.equal((await r("KHT", 2)).fase, "respon");
  const m = await r("CEX", 0); assert.equal(m.fase, "mitigasi"); assert.deepEqual(m.pihak.masy, []);
  assert.ok(m.pihak.pusat.length > 0);
});

uji("U7 BMKG: kode kab tidak sah 400, kab tak dikenal 400, hal tidak sah 400; tanpa panggilan keluar", async () => {
  for (const k of ["", "11", "11011", "abcd", "1101/../x", "9999"]) assert.equal((await U.api("GET", "/api/bmkg/desa?kab=" + encodeURIComponent(k), undefined, ip(4))).s, 400, k);
  assert.equal((await U.api("GET", "/api/bmkg/desa?kab=1101&hal=0", undefined, ip(4))).s, 400);
  assert.equal(panggilan.length, 0);
});

uji("U7 BMKG: galat hulu dijawab {galat} tanpa isi mentah", async () => {
  mode = "rusak";
  const r = await U.api("GET", "/api/bmkg/desa?kab=1102", undefined, ip(8));
  assert.equal(r.s, 200); assert.ok(r.j.desa.some(x => x.galat === "data BMKG tidak tersedia"));
  assert.ok(!/rahasia-internal/.test(r.t));
  mode = "ok";
});

uji("U7 BMKG: halaman 50 desa diringkas, nama desa terisi, jatah per permintaan 25 -> antre 25 (jatah menit ke-50 habis di sini)", async () => {
  const r = await U.api("GET", "/api/bmkg/desa?kab=1101", undefined, ip(5));
  assert.equal(r.s, 200); assert.equal(r.j.desa.length, 50); assert.ok(r.j.total > 50);
  assert.match(r.h.get("cache-control") || "", /no-store/);
  const d = r.j.desa.find(x => x.hari); assert.ok(d.nama); assert.equal(d.hari[0].hujan_mm, 4);
  assert.equal(r.j.antre, 25); assert.equal(panggilan.length, 50);   // 25 dari tes galat + 25 ini = jatah 50 per menit terpakai
  assert.ok(r.j.desa.filter(x => x.antre).every(x => !x.hari && !x.galat));
});

uji("U7 BMKG: jatah 50 per menit habis -> semua antre, tanpa panggilan baru", async () => {
  const sebelum = panggilan.length;
  const r = await U.api("GET", "/api/bmkg/desa?kab=1101", undefined, ip(7));
  assert.equal(r.s, 200); assert.equal(r.j.antre, 50); assert.equal(panggilan.length, sebelum);
});
