/* Arsip sitrep harian (src/sitrep.js, C10) di workerd (Miniflare) dengan D1 + R2 lokal sungguhan: cron menulis sekali per hari, isi memuat tiap masukan,
   tanpa data pribadi, rute arsip sah/liar/tidak ada, daftar urut, halaman /sitrep?tgl= ber-CSP. */
import assert from "node:assert/strict";
import {gunzipSync} from "node:zlib";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";

const U = await siapkan("uji-sitrep", {r2: true}), uji = berantai();
const worker = await U.mf.getWorker(), R2 = await U.mf.getR2Bucket("MEDIA");
const WIB = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);
const KINI = Date.parse("2026-10-19T00:05:00Z"), TGL = "2026-10-19";   // 07.05 WIB
const tik = t => worker.scheduled({cron: "* * * * *", scheduledTime: new Date(t)});
const baca = async tgl => { const o = await R2.get(`sitrep/${tgl}.json.gz`); return o && JSON.parse(gunzipSync(Buffer.from(await o.arrayBuffer())).toString()); };
const ASET = ["/bencana.json", "/data/meta.json", "/data/laporan.json", "/banjir/data/laporan.json", "/gempa/data/laporan.json", "/banjir/data/cuaca_laporan.json",
  "/udara/data/laporan.json", "/data/kekeringan_laporan.json", "/banjir/data/gunungapi_status.json"];
const API = ["/api/warga?jam=24", "/api/relawan/ringkas", "/api/meja/ringkas", "/api/alun?jenis=butuh_bantuan"];
const WA = "081234567890", EMEL = "rahasia.pelapor@contoh.id";

uji("sitrep arsip: seed data pribadi (laporan warga + kontak, relawan) lalu cron 07 WIB menulis arsip SEKALI per hari", async () => {
  const w = await U.api("POST", "/api/warga", {jenis: "minta", sub: "makanan", jumlah: 40, teks: "Butuh nasi untuk 40 orang", kontak: WA, lat: -2.2, lon: 113.9}, {"cf-connecting-ip": "10.7.0.1"});
  assert.equal(w.s, 201, w.t);
  const r = await U.api("POST", "/api/relawan/daftar", {nama: "Budi Rahasia", wa: "081277700001", email: EMEL, prov: "62", kab: "Pulang Pisau", jalur: "umum", keahlian: ["medis"], sertifikat: "BTCLS",
    hari_per_minggu: 3, maks_hari: 30, luar_provinsi: false, gol_darah: "O+", darurat_nama: "Ibu Budi", darurat_wa: "081399900002", setuju: true}, {"cf-connecting-ip": "10.7.0.2"});
  assert.equal(r.s, 201, r.t); U.kodeRelawan = r.j?.kode;
  await U.DB.prepare("INSERT INTO neraca_harian (tgl, prov, kab, sumber, fs, luas_ha, padam_ha, sisa_ha, personel, diubah) VALUES (?, '62', 'Pulang Pisau', 'regu', 3, 10, 4, 6, 12, ?)").bind(TGL, KINI).run();
  assert.equal(await R2.head(`sitrep/${TGL}.json.gz`), null);
  await tik(KINI);
  const a = await baca(TGL); assert.ok(a, "arsip harus ada sesudah cron 00:05 UTC");
  assert.equal(a.v, 1); assert.equal(a.tgl, TGL); assert.equal(a.dibuat, KINI);
  const o1 = await R2.head(`sitrep/${TGL}.json.gz`);
  await tik(KINI + 30 * 60e3);   // 00:35 UTC = cron ulang: sudah ada -> tidak ditulis ulang
  const o2 = await R2.head(`sitrep/${TGL}.json.gz`);
  assert.equal(o2.etag, o1.etag, "hari yang sudah ada tidak boleh ditulis ulang");
  assert.equal((await R2.list({prefix: "sitrep/"})).objects.length, 1);
  U.ukuran = o1.size;
});

uji("sitrep arsip: cron di luar jam 00 UTC tidak menulis arsip", async () => {
  await tik(Date.parse("2026-10-20T13:05:00Z")); await tik(Date.parse("2026-10-20T00:20:00Z"));
  assert.equal(await R2.head("sitrep/2026-10-20.json.gz"), null);
});

uji("sitrep arsip: isi memuat tiap masukan sitrep (aset, API, neraca provinsi berdata)", async () => {
  const a = await baca(TGL);
  for (const j of [...ASET, ...API, "/api/neraca?prov=62"]) assert.ok(j in a.masukan, `masukan hilang dari arsip: ${j}`);
  assert.equal(a.masukan["/bencana.json"].bencana.length > 3, true);
  assert.equal(a.masukan["/api/neraca?prov=62"].total.fs, 3);
  assert.ok(!("/api/neraca?prov=33" in a.masukan), "neraca hanya untuk provinsi yang punya data");
  assert.equal(Array.isArray(a.masukan["/api/warga?jam=24"].features), true);
  assert.equal(a.masukan["/api/warga?jam=24"].features.length, 1);
});

uji("sitrep arsip: TIDAK ada data pribadi (wa, email, kode, hash, token) di arsip", async () => {
  const o = await R2.get(`sitrep/${TGL}.json.gz`), t = gunzipSync(Buffer.from(await o.arrayBuffer())).toString();
  for (const s of [WA, "081277700001", "081399900002", EMEL, "Budi Rahasia", "Ibu Budi", "kode_sha", "ip_hash", "\"token\"", "\"wa\"", "\"email\"", "darurat_wa", "darurat_nama"]) assert.ok(!t.includes(s), `arsip memuat ${s}`);
  /* status gunung api memuat nomor telepon pos pengamatan PVMBG (kontak lembaga publik di sumbernya, bukan pribadi): dikecualikan dari pindai nomor HP */
  const a = JSON.parse(t); delete a.masukan["/banjir/data/gunungapi_status.json"]; const u = JSON.stringify(a);
  const hp = /(?<![\d.\-])(?:\+62|62|0)8\d{8,11}(?![\d.])/.exec(u), em = /[\w.+-]+@[\w-]+\.[\w.]+/.exec(t);   // ok(!...) supaya galat tidak mencetak 600 KB
  assert.ok(!hp, "ada nomor HP di arsip: " + (hp && u.slice(hp.index - 40, hp.index + 20))); assert.ok(!em, "ada alamat email di arsip: " + em?.[0]);
  assert.ok(!/\b[0-9a-f]{26}\b/.test(t) && !/x-kode/i.test(t) && !(U.kodeRelawan && t.includes(U.kodeRelawan)), "ada kode pribadi (26 hex) di arsip");   // "kode" biasa = kode wilayah BPS
});

uji("GET /api/sitrep/arsip sah: 200 JSON gzip, cache 1 hari, isi sama dengan arsip", async () => {
  const r = await U.mf.dispatchFetch(`http://bnpb.lokal/api/sitrep/arsip?tgl=${TGL}`, {headers: {"accept-encoding": "gzip"}});
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-encoding"), null, "tidak ada content-encoding manual (gzip ganda)");
  const j = await r.json();   // klien biasa: harus bisa di-parse langsung
  assert.equal(j.tgl, TGL); assert.ok("/bencana.json" in j.masukan);
  assert.match(r.headers.get("cache-control"), /max-age=86400/);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
});

uji("GET /api/sitrep/arsip: tgl liar 400, tidak ada 404, masa depan 400", async () => {
  for (const q of ["", "?tgl=", "?tgl=2026-13-40", "?tgl=2026-02-30", "?tgl=abc", "?tgl=../../x", "?tgl=2026-10-19%00", "?tgl=2026-10-19&tgl=x", `?tgl=${WIB(Date.now() + 5 * 864e5)}`]) {
    const r = await U.api("GET", "/api/sitrep/arsip" + q); assert.equal(r.s, q === "?tgl=2026-10-19&tgl=x" ? 200 : 400, `${q} -> ${r.s}`);
  }
  assert.equal((await U.api("GET", "/api/sitrep/arsip?tgl=2026-10-01")).s, 404);
  assert.equal((await U.api("POST", `/api/sitrep/arsip?tgl=${TGL}`, {})).s, 405);
});

uji("GET /api/sitrep/arsip/daftar: urut terbaru dulu, hanya 60 hari terakhir", async () => {
  for (const t of ["2026-10-17", "2026-10-18"]) await R2.put(`sitrep/${t}.json.gz`, "x");
  await R2.put("sitrep/2020-01-01.json.gz", "x"); await R2.put("sitrep/bukan-tanggal.txt", "x");   // terlalu lama dan sampah: tidak ikut
  const r = await U.api("GET", "/api/sitrep/arsip/daftar");
  assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.tgl, ["2026-10-19", "2026-10-18", "2026-10-17"]);
});

uji("halaman /sitrep?tgl= : 200 dengan CSP ketat tanpa skrip/gaya inline, kontrol tanggal ada", async () => {
  const r = await U.api("GET", `/sitrep?tgl=${TGL}`);
  assert.equal(r.s, 200); assert.match(r.h.get("content-security-policy"), /script-src 'self'/);
  assert.match(r.t, /id="tgl"/);
  assert.doesNotMatch(r.t, /<script(?![^>]*\bsrc=)[^>]*>|\son[a-z]+=|<style|style="/i);
  const js = readFileSync(path.join(AKAR, "public/bnpb/sitrep.js"), "utf8");
  assert.match(js, /ARSIP \? Promise\.resolve\(ARSIP\.masukan\[u\]/, "satu pintu ambil() harus membaca arsip bila ada");
});

uji("keamanan 2: arsip menyimpan laporan warga hanya sebagai jenis/benar/salah (tanpa teks, id, koordinat)", async () => {
  const w = await U.api("POST", "/api/warga", {jenis: "minta", sub: "makanan", jumlah: 7, teks: "TEKS-WARGA-RAHASIA di Jalan Mawar", lat: -2.23456, lon: 113.98765}, {"cf-connecting-ip": "10.7.0.9"});
  assert.equal(w.s, 201, w.t);
  await R2.delete(`sitrep/${TGL}.json.gz`); await tik(KINI);
  const a = await baca(TGL), f = a.masukan["/api/warga?jam=24"].features;
  assert.equal(f.length, 2);
  for (const x of f) { assert.deepEqual(Object.keys(x.properties).sort(), ["benar", "jenis", "salah"]); assert.equal(x.geometry, null); }
  const t = JSON.stringify(a); assert.ok(!t.includes("TEKS-WARGA-RAHASIA") && !t.includes("-2.23") && !t.includes("113.98"));
});

uji("keamanan 2: cron menit 17 menghapus arsip > 400 hari, maks 50 per panggilan, yang baru dan yang bukan arsip tetap", async () => {
  const lama = Array.from({length: 55}, (_, i) => `sitrep/${new Date(Date.parse("2023-01-01") + i * 864e5).toISOString().slice(0, 10)}.json.gz`);
  for (const k of lama) await R2.put(k, "x");
  await R2.put("sitrep/2025-12-01.json.gz", "x");   // 323 hari: tetap
  const sisaLama = async () => (await R2.list({prefix: "sitrep/", limit: 1000})).objects.map(o => o.key).filter(k => k < "sitrep/2025-09-01" && k.endsWith(".json.gz")).length;
  const sebelum = await sisaLama();
  assert.ok(sebelum >= 55, "sebelum: " + sebelum);
  await tik(Date.parse("2026-10-20T13:17:00Z"));
  assert.equal(await sisaLama(), sebelum - 50, "tepat 50 terhapus per panggilan");
  await tik(Date.parse("2026-10-20T14:17:00Z"));
  assert.equal(await sisaLama(), 0);
  assert.ok(await R2.head("sitrep/2025-12-01.json.gz") && await R2.head(`sitrep/${TGL}.json.gz`) && await R2.head("sitrep/bukan-tanggal.txt"));
});

uji("keamanan 2: POST /api/sitrep/arsip/hapus hanya moderator, tgl sah, 404 bila tidak ada, arsip hilang dan tidak bisa dibaca lagi", async () => {
  const h = (b, hd) => U.api("POST", "/api/sitrep/arsip/hapus", b, hd);
  await R2.put("sitrep/2026-10-10.json.gz", "x");
  assert.equal((await h({tgl: "2026-10-10"})).s, 403); assert.equal((await h({tgl: "2026-10-10"}, GERBANG)).s, 403, "akun gerbang situs bukan moderator");
  for (const b of [{}, {tgl: "2026-02-30"}, {tgl: "../x"}, {tgl: 20261010}, {tgl: "2026-10-10\0"}]) assert.equal((await h(b, ADMIN)).s, 400, JSON.stringify(b));
  assert.equal((await h({tgl: "2026-10-11"}, ADMIN)).s, 404);
  const ok = await h({tgl: "2026-10-10"}, MOD2); assert.equal(ok.s, 200, ok.t);
  assert.equal(await R2.head("sitrep/2026-10-10.json.gz"), null);
  assert.equal((await U.api("GET", "/api/sitrep/arsip?tgl=2026-10-10")).s, 404);
  assert.equal((await U.api("GET", "/api/sitrep/arsip/hapus")).s, 405);
});
