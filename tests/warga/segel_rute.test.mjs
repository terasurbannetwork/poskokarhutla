/* SG-04 GET /api/verifikasi/<kode> (src/segel.js, src/hak.js bagian Segel) di workerd (Miniflare) dengan D1 dan R2 sungguhan.
   Dibuktikan (data/kajian-bnpb/segel-dokumen/RENCANA-UJI.md): T6 jawaban sampul tanpa isi dan bertanda noindex, T7 kode tidak ada dan salah format
   sama-sama 404 berbadan sama, T8 isi lk_snapshot diubah = Tidak cocok, T11 pencarian ke-61 dalam 10 menit = 429, T13 dicabut langsung terbaca
   tanpa cache; plus Ada versi lebih baru, dokumen PB dari R2, dan kueri lewat indeks.
   Jalankan: node --test tests/warga/segel_rute.test.mjs */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import "../../src/worker.js";   // dahulu: impor sirkular
import {siapkan, berantai, sha256} from "./_bnpb.mjs";
import {migrasi} from "./_bantu.mjs";
import {SEGEL_SQL} from "../../src/hak.js";

const uji = berantai();
const {DB, mf, api} = await siapkan("uji-segel-rute", {r2: true});
const R2 = await mf.getR2Bucket("MEDIA");
let ip = 0;
const IP = () => ({"cf-connecting-ip": `10.${++ip}.0.1`});   // tiap uji IP sendiri supaya batas laju tidak saling ganggu
const buka = (kode, h = IP()) => api("GET", "/api/verifikasi/" + kode, undefined, h);

const ISI0 = JSON.stringify({tanggal: "2026-11-20", hotspot: 41, prov: [{kode: "14", n: 17}]});
const ISI1 = JSON.stringify({tanggal: "2026-11-20", hotspot: 43, prov: [{kode: "14", n: 19}]});
const segel = (kode, o) => DB.prepare(`INSERT INTO segel (kode, jenis, rujukan, dasar, versi, sidik, sidik_berkas, judul, wilayah, periode, penerbit, terbit)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8, ?9, 'Pusdalops BNPB', ?10)`).bind(kode, o.jenis, o.rujukan, o.dasar, o.versi, o.sidik, o.judul ?? "Laporan Penanganan Karhutla", o.wilayah ?? null, o.periode, o.terbit ?? 1).run();
for (const [r, isi] of [[0, ISI0], [1, ISI1]])
  await DB.prepare("INSERT INTO lk_snapshot (tanggal_laporan, ralat, hash, isi, alasan, oleh, waktu, dummy) VALUES ('2026-11-20', ?1, ?2, ?3, ?4, 'uji', 1, 0)").bind(r, sha256(isi), isi, r ? "ralat angka" : null).run();
await segel("AAAAAAAAA0", {jenis: "lk", rujukan: "2026-11-20#0", dasar: "2026-11-20", versi: 0, sidik: sha256(ISI0), periode: "2026-11-20"});
await segel("AAAAAAAAA1", {jenis: "lk", rujukan: "2026-11-20#1", dasar: "2026-11-20", versi: 1, sidik: sha256(ISI1), periode: "2026-11-20", terbit: 2});

uji("T6 kode sah: 200, data sampul saja, sidik 12 huruf, noindex, no-store; ralat lama = Ada versi lebih baru", async () => {
  const r = await buka("aaaaa-aaaa1");   // huruf kecil dan tanda hubung dinormalkan
  assert.equal(r.s, 200);
  assert.equal(r.j.status, "berlaku");
  assert.equal(r.j.sidik12, sha256(ISI1).slice(0, 12));
  for (const k of ["isi", "sidik", "rujukan", "dasar", "alasan", "oleh"]) assert.ok(!(k in r.j), `kunci ${k} bocor`);
  assert.ok(!/hotspot|"n"|43|19/.test(r.t), "angka isi bocor");
  assert.match(r.h.get("x-robots-tag"), /noindex/);
  assert.equal(r.h.get("cache-control"), "no-store");
  const lama = await buka("AAAAAAAAA0");
  assert.equal(lama.j.status, "lebih_baru");
  assert.equal(lama.j.terbaru, "AAAAAAAAA1");
  assert.equal(lama.j.label, "Ada versi lebih baru");
});

uji("T7 kode tidak ada, salah format, % rusak: 404 dengan badan sama", async () => {
  const a = await buka("ZZZZZZZZZZ"), b = await buka("bukan-kode"), c = await buka("%E0%A4%A"), d = await buka("ABCDEFGHJU");
  for (const r of [a, b, c, d]) { assert.equal(r.s, 404); assert.equal(r.t, a.t); assert.match(r.h.get("x-robots-tag"), /noindex/); }
});

uji("T8 isi lk_snapshot diubah langsung (trigger dihapus): Tidak cocok tanpa cache", async () => {
  assert.equal((await buka("AAAAAAAAA1")).j.status, "berlaku");
  await DB.exec("DROP TRIGGER IF EXISTS lk_snapshot_tetap_ubah");
  await DB.prepare("UPDATE lk_snapshot SET isi = ?1 WHERE tanggal_laporan = '2026-11-20' AND ralat = 1").bind(ISI1.replace("43", "430")).run();
  const r = await buka("AAAAAAAAA1");
  assert.equal(r.s, 200);
  assert.equal(r.j.status, "tidak_cocok");
  assert.equal(r.j.label, "Tidak cocok");
  await DB.prepare("UPDATE lk_snapshot SET isi = ?1 WHERE tanggal_laporan = '2026-11-20' AND ralat = 1").bind(ISI1).run();
  assert.equal((await buka("AAAAAAAAA1")).j.status, "berlaku");
});

uji("T13 dicabut lalu dibuka segera: Dicabut, tanggal cabut ada, alasan tidak, no-store", async () => {
  await DB.prepare("INSERT INTO segel_cabut (kode, alasan, oleh, waktu) VALUES ('AAAAAAAAA1', 'salah angka provinsi', 'moderator', 99)").run();
  const r = await buka("AAAAAAAAA1");
  assert.equal(r.j.status, "dicabut");
  assert.equal(r.j.dicabut, 99);
  assert.ok(!/salah angka|moderator/.test(r.t));
  assert.equal(r.h.get("cache-control"), "no-store");
});

uji("dokumen PB beku: sidik dihitung ulang dari objek R2; objek berubah = Tidak cocok", async () => {
  const d = {id: "b".repeat(16), jenis: "sitrep", bencana: "banjir", prov: "32", kab: "", periode: "2026-11-15", versi: 1};
  const isi = JSON.stringify({judul: "Sitrep banjir", hari: 3});
  await DB.prepare("INSERT INTO pb_dokumen (id, jenis, bencana, prov, kab, periode, versi, status, sha, oleh, dibuat, dibekukan) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'beku', ?8, 'uji', 1, 2)")
    .bind(d.id, d.jenis, d.bencana, d.prov, d.kab, d.periode, d.versi, sha256(isi)).run();
  const kunci = `dokumen/${d.jenis}/${d.bencana}/${d.periode}/${d.prov}/v${d.versi}.json`;
  await R2.put(kunci, isi);
  await segel("BBBBBBBBB1", {jenis: "pb", rujukan: d.id, dasar: "sitrep/banjir/32/2026-11-15", versi: 1, sidik: sha256(isi), periode: "2026-11-15", judul: "Sitrep banjir"});
  assert.equal((await buka("BBBBBBBBB1")).j.status, "berlaku");
  await R2.put(kunci, isi.replace("3", "4"));
  assert.equal((await buka("BBBBBBBBB1")).j.status, "tidak_cocok");
});

uji("T11 pencarian ke-61 dari IP sama dalam 10 menit: 429; IP lain tetap lolos", async () => {
  const h = IP();
  for (let i = 0; i < 60; i++) assert.equal((await buka(i % 2 ? "AAAAAAAAA0" : "bukan", h)).s === 429, false, `ke-${i + 1} sudah 429`);
  const r = await buka("AAAAAAAAA0", h);
  assert.equal(r.s, 429);
  assert.match(r.j.galat, /Terlalu banyak pemeriksaan/);
  assert.ok(Number(r.h.get("retry-after")) > 0);
  assert.equal((await buka("AAAAAAAAA0")).s, 200);
});

uji("metode lain 405 allow GET dan noindex; tanpa IP_SALT 503 noindex", async () => {
  for (const m of ["POST", "PUT"]) {
    const r = await api(m, "/api/verifikasi/AAAAAAAAA0", m === "POST" ? {} : "x", IP());
    assert.equal(r.s, 405); assert.equal(r.h.get("allow"), "GET"); assert.match(r.h.get("x-robots-tag"), /noindex/);
  }
  const tanpa = await siapkan("uji-segel-tanpa-garam", {ikat: {IP_SALT: ""}});
  const r = await tanpa.api("GET", "/api/verifikasi/AAAAAAAAA0", undefined, IP());
  assert.equal(r.s, 503); assert.match(r.h.get("x-robots-tag"), /noindex/);
});

uji("kueri cari, daftar, cabut lewat indeks (SEARCH, bukan SCAN)", () => {
  const db = new DatabaseSync(":memory:"); db.exec(migrasi());
  for (const k of ["ada", "cari", "daftar", "cabut"]) {
    const rencana = db.prepare("EXPLAIN QUERY PLAN " + SEGEL_SQL[k]).all().map(r => r.detail);
    assert.ok(!rencana.some(d => /^SCAN (segel|segel_cabut)\b/.test(d)), `${k}: ${rencana.join(" | ")}`);
  }
});
