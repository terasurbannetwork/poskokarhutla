/* Darurat sekali ketuk (K90, D122-D125; TIKET LA-78) dan lokasi dari poster desa (K92, D131-D132; LA-83) di workerd (Miniflare) dengan D1 sungguhan.
   RENCANA-UJI §21 dan §23 bagian tautan. Jalankan: node --test tests/lapor/darurat_cepat.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN} from "../warga/_bnpb.mjs";
import "../../src/worker.js";

const uji = berantai();
const MESIN = {authorization: "Bearer mesin-rahasia"};
const U = await siapkan("uji-lapor-sekali", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB, n} = U;
const WA = "6281200000011", WA2 = "6281200000012", WA3 = "6281200000013";
const LOK = {lat: -6.6, lon: 106.8, akurasi: 12};
const cepat = (wa, b = {}, h = MESIN) => api("POST", "/api/lapor/darurat/cepat", {wa, ...b}, h);
const pesan = (wa, b) => api("POST", "/api/lapor/pesan", {wa, ...b}, MESIN);
const baris = async nomor => (await api("GET", "/api/lapor/meja", undefined, ADMIN)).j.baris.find(x => x.nomor === nomor);
let nomor;

uji("izin nomor uji", async () => {
  for (const wa of [WA, WA2, WA3]) assert.equal((await api("POST", "/api/lapor/izin", {wa}, MESIN)).s, 200);
});

uji("tanpa nomor ditolak, tanpa laporan", async () => {
  assert.equal((await api("POST", "/api/lapor/darurat/cepat", {lokasi: LOK})).s, 401);
  assert.equal(await n("lapor_tiket"), 0);
});

uji("satu ketukan: laporan darurat terkirim dengan titik, jenis kosong, korban belum tahu, nomor BPBD", async () => {
  const r = await cepat(WA, {lokasi: LOK});
  assert.equal(r.s, 200, r.t.slice(0, 300));
  assert.match(r.j.nomor, /^LA-\d{6}-\d{2}$/); nomor = r.j.nomor;
  assert.ok(r.j.bpbd && r.j.bpbd.nomor, "nomor BPBD atau cadangan 117 selalu ada (K88)");
  assert.ok(r.j.wilayah?.kab, "wilayah dari titik");
  assert.doesNotMatch(r.j.balasan, /undefined|null/);
  assert.equal(await n("lapor_tiket", `nomor = '${nomor}' AND status = 'baru'`), 1);
  assert.equal(await n("lapor_pdf", `nomor = '${nomor}'`), 1);
  const b = await baris(nomor);
  assert.deepEqual(b.darurat, {korban: "belum_tahu", cara: "sekali_ketuk"}, "pita darurat meja (K68) dan chip sekali ketuk");
  assert.equal(b.jenisId ?? null, null, "jenis belum didata, bukan tebakan");
  assert.ok(Object.values(b.dampak).every(v => v === null), "kosong bukan nol");
});

uji("ketukan kedua dari nomor yang sama dalam 30 menit ditolak", async () => {
  const r = await cepat(WA, {lokasi: LOK});
  assert.equal(r.s, 429); assert.match(r.j.galat, /112/);
  assert.equal(await n("lapor_tiket"), 1);
});

uji("titik di luar Indonesia dibuang, laporan tetap dibuat", async () => {
  const r = await cepat(WA2, {lokasi: {lat: 48.8, lon: 2.3, akurasi: 5}});
  assert.equal(r.s, 200, r.t.slice(0, 300)); assert.equal(r.j.wilayah, null);
  const s = await DB.prepare("SELECT lat, kerja FROM lapor_sesi WHERE nomor = ?").bind(r.j.nomor).first();
  assert.equal(s.lat, null); assert.equal(JSON.parse(s.kerja).isian.lokasi, undefined);
});

uji("lengkapi lewat Tambah kabar: mulai di jenis, lalu korban dan foto; jenis dan korban masuk laporan asal", async () => {
  let r = await api("POST", "/api/lapor/susulan", {wa: WA, nomor}, MESIN);
  assert.equal(r.s, 200, r.t.slice(0, 300)); assert.match(r.j.balasan, /Lengkapi laporan darurat/); assert.equal(r.j.minta, "jenis");
  const banjir = r.j.pilihan.findIndex(x => /^banjir$/i.test(x)) + 1; assert.ok(banjir > 0);
  r = await pesan(WA, {teks: String(banjir)}); assert.match(r.j.balasan, /korban/i);
  r = await pesan(WA, {teks: "1"}); assert.match(r.j.balasan, /Orang terjebak/);   // ya, ada korban: K97 tanya terjebak lalu butuh medis
  r = await pesan(WA, {teks: "3"}); assert.match(r.j.balasan, /pertolongan medis/i);
  r = await pesan(WA, {teks: "4"}); assert.equal(r.j.minta, "foto");
  r = await pesan(WA, {teks: "1"}); assert.equal(r.j.status, "ringkasan");   // lewati foto
  r = await pesan(WA, {teks: "1"}); assert.equal(r.s, 200, r.t.slice(0, 300)); assert.equal(r.j.nomor, nomor); assert.equal(r.j.susulan, 2);
  assert.match(r.j.balasan, /Ada korban: belum tahu menjadi ada/, "perubahan korban tercatat di versi");
  const b = await baris(nomor);
  assert.equal(b.jenisId, "banjir"); assert.equal(b.darurat.korban, "ya"); assert.equal(b.darurat.cara, "sekali_ketuk");
  assert.equal(await n("lapor_tiket"), 2, "tidak ada tiket ketiga");
});

uji("susulan laporan biasa tetap mengunci jenis (tidak berubah perilakunya)", async () => {
  const s = await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(nomor).first();
  assert.equal(JSON.parse(s.kerja).isian.jenis.nilai, "banjir");
  const r = await api("POST", "/api/lapor/susulan", {wa: WA, nomor}, MESIN);
  assert.equal(r.s, 200); assert.match(r.j.balasan, /Tambah kabar/, "jenis sudah ada: mode Ubah biasa");
  await pesan(WA, {teks: "batal"});
});

uji("pintu web nomor ketikan: 3 ketukan per IP per jam", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  const web = {"x-pb": "1"}, hasil = [];
  for (const wa of ["6281200000021", "6281200000022", "6281200000023", "6281200000024"]) hasil.push((await cepat(wa, {lokasi: LOK}, web)).s);
  assert.deepEqual(hasil, [200, 200, 200, 429]);
});

uji("satu nomor ketikan dari perangkat berganti: paling banyak 1 per 30 menit", async () => {
  await DB.prepare("DELETE FROM laju_bnpb WHERE aksi = 'lapor.sekali.ip'").run();
  const r = await cepat("6281200000021", {lokasi: LOK}, {"x-pb": "1"});   // tanpa kuki: perangkat baru, nomor sama dengan uji sebelumnya
  assert.equal(r.s, 429);
});

uji("kiriman tertunda dari antrean luring: jam ketukan jadi waktu kejadian, meja menandai tertunda dan pelapor belum dikenal", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  const t = Date.now() - 3 * 3600e3, r = await cepat("6281200000031", {lokasi: LOK, waktu_klien: t}, {"x-pb": "1"});
  assert.equal(r.s, 200, r.t.slice(0, 300));
  const s = JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(r.j.nomor).first()).kerja);
  assert.equal(s.isian.waktu.ms, t); assert.match(s.isian.waktu.nilai, /saat diketuk/);
  const b = await baris(r.j.nomor); assert.equal(b.darurat.tertunda, true); assert.equal(b.dikenal, false);
  const lama = await cepat("6281200000032", {lokasi: LOK, waktu_klien: Date.now() - 3 * 864e5}, {"x-pb": "1"});
  const s2 = JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(lama.j.nomor).first()).kerja);
  assert.ok(Date.now() - s2.isian.waktu.ms < 60e3, "jam perangkat lebih dari 24 jam lalu tidak dipercaya");
});

uji("lokasi dari poster desa: sumber poster tercatat dan tampil sebagai ketelitian", async () => {
  await DB.prepare("DELETE FROM laju_bnpb").run();
  let r = await pesan(WA3, {teks: "lapor"});
  for (const t of ["1", "1", "Uji Poster"]) r = await pesan(WA3, {teks: t});
  assert.equal(r.j.minta, "lokasi");
  const kode = JSON.parse((await DB.prepare("SELECT kerja FROM lapor_sesi WHERE nomor = ?").bind(nomor).first()).kerja).isian.lokasi.nilai.wilayah.kode;   // desa dari titik uji LOK
  assert.ok(kode, "ada desa uji di desa_cari.json");
  r = await pesan(WA3, {lokasi: {kode, poster: true}});
  assert.equal(r.s, 200, r.t.slice(0, 300));
  const s = await DB.prepare("SELECT kerja FROM lapor_sesi WHERE wa = ? ORDER BY dibuat DESC LIMIT 1").bind(WA3).first(), L = JSON.parse(s.kerja).isian.lokasi;
  assert.equal(L.asal.sumber, "poster"); assert.equal(L.nilai.ketelitian, "lokasi dari poster desa");
  assert.equal((await pesan(WA3, {lokasi: {kode: "12345", poster: true}})).s, 400, "kode asing ditolak");
});
