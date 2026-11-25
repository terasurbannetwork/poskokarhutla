/* Komentar warga di kartu Alun-alun (src/lapor_komen.js, migrasi 0175, tiket LA-85; KEPUTUSAN-LAPOR-AI K95, D136-D140) di workerd dengan D1 sungguhan.
   Jalankan: node --test tests/lapor/komen.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, sha256} from "../warga/_bnpb.mjs";
import {bersihKomen} from "../../src/lapor_komen.js";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)

const uji = berantai();
const U = await siapkan("uji-lapor-komen"), {api, DB, n} = U;
const PB = {"x-pb": "1"}, WA = "6281200000011", KINI = Date.now();
const tulis = (kartu, b, h = PB) => api("POST", `/api/lapor/komen/${kartu}`, b, h);
/* dua laporan langsung di D1: satu ditindaklanjuti (tampil di Alun-alun), satu baru (tidak tampil) */
async function laporan(id, nomor, status) {
  const ringkas = JSON.stringify({wilayah: {desa: "Cibeber", kec: "Cibeber", kab: "Kab. Cianjur", prov: "Jawa Barat", provKode: "32"}, dampak: {rumah: 2}});
  await DB.batch([
    DB.prepare("INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, nomor, terkirim, kerja, ringkas, dibuat, diubah) VALUES (?1, '6281299999999', 'terkirim', 'warga', 'longsor', '32.03', ?2, ?3, '{}', ?4, ?3, ?3)").bind(id, nomor, KINI - 3600e3, ringkas),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?1, ?2, ?3, ?4)").bind(nomor, id, status, KINI)]);
}
let kartu, kartuBaru, komenId;

uji("komentar Alun-alun: baca publik", async () => {
  await laporan("sesi-tampil-01", "LA-251125-01", "ditindaklanjuti"); await laporan("sesi-baru-02", "LA-251125-02", "baru");
  const a = await api("GET", "/api/lapor/alun"); assert.equal(a.s, 200); assert.equal(a.j.jumlah, 1, a.t.slice(0, 300));
  kartu = a.j.baris[0].id; kartuBaru = sha256("sesi-baru-02").slice(0, 10);
  assert.equal(kartu, sha256("sesi-tampil-01").slice(0, 10), "id kartu = sha laporan jangkar");
  const g = await api("GET", `/api/lapor/komen/${kartu}`); assert.equal(g.s, 200); assert.deepEqual(g.j.komen, []);
  assert.equal((await api("GET", "/api/lapor/komen/bukan-kartu")).s, 404);
});

uji("komentar Alun-alun: tulis", async () => {
  assert.equal((await tulis(kartu, {teks: "Air sudah surut"})).s, 401, "tanpa nomor");
  assert.equal((await tulis(kartu, {wa: WA, teks: "Air sudah surut"}, {})).s, 403, "nomor ketikan tanpa x-pb");
  assert.equal((await tulis(kartu, {wa: WA, teks: "dasar goblok semua"})).s, 400, "kata kasar ditolak");
  assert.equal((await tulis(kartu, {wa: WA, teks: {isi: "objek"}})).s, 400, "teks bukan string ditolak");
  assert.equal((await tulis(kartuBaru, {wa: WA, teks: "Ada 3 rumah rusak di sini"})).s, 404, "laporan yang tidak tampil di Alun-alun");
  assert.equal(await n("lp_komen"), 0, "penolakan tidak menulis");
  const isi = "3 rumah rusak di RT 02/RW 05 no 12, hubungi 0812 3456 7890 atau budi@contoh.com";
  const r = await tulis(kartu, {wa: WA, teks: isi}); assert.equal(r.s, 200, r.t);
  komenId = r.j.komen.id; assert.match(komenId, /^[0-9a-f]{16}$/);
  for (const bocor of ["0812", "RT 02", "RW 05", "no 12", "budi@", WA]) assert.ok(!r.t.includes(bocor), `jawaban memuat ${bocor}: ${r.t}`);
  assert.match(r.j.komen.teks, /^3 rumah rusak di \[RT\/RW dihapus\] \[nomor rumah dihapus\], hubungi \[nomor dihapus\] atau \[email dihapus\]$/);
  const g = await api("GET", `/api/lapor/komen/${kartu}`); assert.equal(g.j.komen.length, 1); assert.equal(g.j.komen[0].teks, r.j.komen.teks);
  assert.ok(!g.t.includes(WA) && !g.t.includes("sesi-tampil"), "nomor penulis dan id laporan tidak keluar ke publik");
  const b = await DB.prepare("SELECT kartu, sesi, wa, status FROM lp_komen WHERE id = ?").bind(komenId).first();
  assert.deepEqual(b, {kartu, sesi: "sesi-tampil-01", wa: WA, status: "tampil"});
  /* batas 10 per nomor per jam (D140): yang ke-11 ditolak */
  for (let i = 2; i <= 10; i++) assert.equal((await tulis(kartu, {wa: WA, teks: `Kabar ke-${i}`})).s, 200);
  assert.equal((await tulis(kartu, {wa: WA, teks: "Kabar ke-11"})).s, 429);
  /* CHECK migrasi menolak isian liar langsung di D1 */
  await assert.rejects(DB.prepare("INSERT INTO lp_komen (id, kartu, sesi, wa, teks, status, dibuat) VALUES ('aaaaaaaaaaaaaaaa', ?1, 'sesi-tampil-01', ?2, 'oke', 'hilang', 1)").bind(kartu, WA).run(), /CHECK/);
  await assert.rejects(DB.prepare("INSERT INTO lp_komen_usul (komen, kolom, nilai, kutipan, dibuat) VALUES (?1, 'harta', 3, '3 rumah', 1)").bind(komenId).run(), /CHECK/);
  await assert.rejects(DB.prepare("INSERT INTO lp_komen_usul (komen, kolom, nilai, kutipan, dibuat) VALUES (?1, 'rumah', -1, '3 rumah', 1)").bind(komenId).run(), /CHECK/);
});

uji("komentar Alun-alun: laporkan", async () => {
  const adu = (wa, ip) => api("POST", `/api/lapor/komen/${komenId}/laporkan`, {wa}, {...PB, "cf-connecting-ip": ip});
  assert.equal((await adu(WA, "10.0.0.9")).s, 400, "penulis tidak bisa mengadu komentarnya sendiri");
  assert.equal((await adu("6281200000021", "10.0.0.1")).j.baru, true);
  assert.equal((await adu("6281200000021", "10.0.0.1")).j.baru, false, "pengadu sama dihitung sekali");
  assert.equal((await adu("6281200000024", "10.0.0.1")).j.baru, false, "nomor ketikan lain dari IP yang sama tidak menambah suara");
  assert.equal((await adu("6281200000022", "10.0.0.2")).s, 200);
  assert.equal((await DB.prepare("SELECT status, aduan FROM lp_komen WHERE id = ?").bind(komenId).first()).status, "tampil", "dua aduan belum menyembunyikan");
  assert.equal((await adu("6281200000023", "10.0.0.3")).s, 200);
  assert.deepEqual({...await DB.prepare("SELECT status, aduan FROM lp_komen WHERE id = ?").bind(komenId).first()}, {status: "dilaporkan", aduan: 3});
  const g = await api("GET", `/api/lapor/komen/${kartu}`); assert.ok(!g.j.komen.some(k => k.id === komenId), "komentar dilaporkan tidak tampil publik");
  assert.equal((await api("POST", `/api/lapor/komen/${"0".repeat(16)}/laporkan`, {wa: WA}, PB)).s, 404);
});

uji("komentar Alun-alun: saringan murni", () => {
  assert.equal(bersihKomen("x").galat, "Komentar masih kosong.");
  assert.equal(bersihKomen("Jalan desa tertutup longsor").teks, "Jalan desa tertutup longsor", "teks biasa tidak diubah");
  assert.equal(bersihKomen("jalan desa tertutup, air 1 meter sejak 14.30").teks, "jalan desa tertutup, air 1 meter sejak 14.30");
  /* format yang lolos saringan lama (ulasan keamanan LA-85): nomor dan alamat tidak boleh tersisa */
  for (const [isi, sisa] of [["0812 - 3456 - 7890", /\d{4}/], ["0812/3456/7890", /\d{4}/], ["0812_3456_7890", /\d{4}/], ["0812  3456  7890", /\d{4}/],
    ["０８１２３４５６７８９０", /[0-9０-９]{4}/], ["0812­3456⁠7890", /\d{4}/], ["+62 812-3456-7890", /\d{4}/],
    ["rumah di rt-05 rw-03", /\d/], ["R.T. 05", /\d/], ["Rukun Tetangga 5", /\d/], ["di Jl Melati 12", /Melati|12/], ["blok C3 gang mawar", /C3/],
    ["di Jalan Melati Indah no 4", /Melati|4/], ["hubungi @budi_123", /budi/], ["linktr.ee/abc", /abc/], ["budi (at) gmail dot com", /budi|gmail/]]) {
    const r = bersihKomen(`Kabar: ${isi}`); assert.ok(r.teks && !sisa.test(r.teks), `masih tersisa: ${JSON.stringify(isi)} -> ${JSON.stringify(r)}`);
  }
  assert.ok(bersihKomen("a".repeat(501)).galat, "lebih dari 500 huruf ditolak");
  const panjang = "RT 1 ".repeat(100); assert.equal(panjang.length, 500);
  assert.match(bersihKomen(panjang).galat || "", /terlalu panjang/, "teks yang memanjang sesudah penggantian ditolak, bukan dibiarkan gagal di CHECK D1");
});

/* LA-86 (D138): model tiruan lewat jaringan luar workerd; kode yang memutuskan angka mana yang lolos */
const keModel = [];
const luarModel = async req => {
  if (new URL(req.url).hostname !== "api.anthropic.com") return new Response("diblok di uji", {status: 599});
  const b = await req.json(), isi = b.messages?.[0]?.content || ""; keModel.push({isi, skema: b.output_config?.format?.schema});
  if (/gagal/.test(isi)) return new Response("galat model", {status: 500});
  const angka = [
    {kolom: "mengungsi", nilai: 40, kutipan: "40 warga mengungsi"},   // berkutipan, angka ada: lolos
    {kolom: "rumah", nilai: 12, kutipan: "12 rumah rusak"},           // kutipan tidak ada di komentar: dibuang
    {kolom: "luka", nilai: 7, kutipan: "luka ringan"},                // angka tidak ada di kutipan: dibuang
    {kolom: "harta", nilai: 3, kutipan: "40 warga mengungsi"},        // kolom di luar daftar: dibuang
    {kolom: "meninggal", nilai: 0, kutipan: "tidak ada korban jiwa"}, // nol dengan kata ingkar: lolos
    {kolom: "mengungsi", nilai: 41, kutipan: "40 warga mengungsi"}];  // kolom kedua kali: dibuang
  return new Response(JSON.stringify({model: "palsu", stop_reason: "end_turn", usage: {}, content: [{type: "text", text: JSON.stringify({angka})}]}), {headers: {"content-type": "application/json"}});
};

uji("komentar Alun-alun: angka dari model jadi usulan berkutipan, kartu tidak berubah", async () => {
  const M = await siapkan("uji-lapor-komen-model", {ikat: {ANTHROPIC_API_KEY: "kunci-uji"}, luar: luarModel});
  const ringkas = JSON.stringify({wilayah: {desa: "Cibeber", kec: "Cibeber", kab: "Kab. Cianjur", prov: "Jawa Barat", provKode: "32"}, dampak: {rumah: 2}});
  await M.DB.batch([
    M.DB.prepare("INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, nomor, terkirim, kerja, ringkas, dibuat, diubah) VALUES ('sesi-model-01', '6281299999999', 'terkirim', 'warga', 'longsor', '32.03', 'LA-251125-09', ?1, '{}', ?2, ?1, ?1)").bind(KINI - 3600e3, ringkas),
    M.DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES ('LA-251125-09', 'sesi-model-01', 'ditindaklanjuti', ?1)").bind(KINI)]);
  const k = sha256("sesi-model-01").slice(0, 10), sebelum = (await M.api("GET", "/api/lapor/alun")).t;
  const tulisM = teks => M.api("POST", `/api/lapor/komen/${k}`, {wa: WA, teks}, PB);
  const tunggu = async (id, n) => { for (let i = 0; i < 40; i++) { const r = (await M.DB.prepare("SELECT kolom, nilai, kutipan, status FROM lp_komen_usul WHERE komen = ? ORDER BY kolom DESC").bind(id).all()).results; if (r.length >= n) return r; await new Promise(s => setTimeout(s, 50)); } return []; };

  assert.equal((await tulisM("Jalan desa masih tertutup lumpur")).s, 200); assert.equal(keModel.length, 0, "komentar tanpa angka tidak memanggil model");
  const r = await tulisM("Sekarang 40 warga mengungsi ke balai desa, luka ringan beberapa, tidak ada korban jiwa. Hubungi 0812 3456 7890");
  assert.equal(r.s, 200, r.t);
  assert.deepEqual((await tunggu(r.j.komen.id, 2)).map(x => ({...x})), [
    {kolom: "meninggal", nilai: 0, kutipan: "tidak ada korban jiwa", status: "usul"},
    {kolom: "mengungsi", nilai: 40, kutipan: "40 warga mengungsi", status: "usul"}], "hanya angka berkutipan yang angkanya ada di kutipan");
  assert.equal(keModel.length, 1); assert.match(keModel[0].isi, /^<komentar_warga>\n/); assert.ok(!keModel[0].isi.includes("0812"), "ke model hanya teks yang sudah disaring");
  assert.deepEqual(keModel[0].skema.properties.angka.items.properties.kolom.enum, ["meninggal", "hilang", "luka", "mengungsi", "rumah", "terendam"]);
  assert.equal((await M.api("GET", "/api/lapor/alun")).t, sebelum, "usulan tidak mengubah kartu Alun-alun");
  assert.equal((await M.DB.prepare("SELECT ringkas FROM lapor_sesi WHERE id = 'sesi-model-01'").first()).ringkas, ringkas, "laporan jangkar tidak berubah");

  const g = await tulisM("model gagal, 5 rumah terendam"); assert.equal(g.s, 200, "galat model tidak menggagalkan komentar");
  await new Promise(s => setTimeout(s, 300));
  assert.equal(await M.n("lp_komen_usul"), 2, "galat model tidak menulis usulan");
  assert.ok(await M.DB.prepare("SELECT 1 FROM lp_komen WHERE id = ?").bind(g.j.komen.id).first(), "komentar tetap tersimpan");
  const H = await import("../../src/hak.js");
  assert.throws(() => H.kmUsulTambah({DB: M.DB}, H.pelakuLpPublik, "x", [], KINI), "jalur publik tidak bisa menulis usulan");
});

uji("komentar Alun-alun: validasi angka murni", async () => {
  const {validasiKomen, uraiKomen} = await import("../../src/lapor_komen.js");
  const teks = "Air setinggi 1 meter, 3 rumah terendam dan dua orang hilang";
  assert.deepEqual(validasiKomen({angka: [{kolom: "terendam", nilai: 3, kutipan: "3 rumah terendam"}, {kolom: "hilang", nilai: 2, kutipan: "dua orang hilang"},
    {kolom: "rumah", nilai: -3, kutipan: "3 rumah"}, {kolom: "rumah", nilai: 3.5, kutipan: "3 rumah"}, {kolom: "rumah", nilai: 4, kutipan: "3 rumah"}]}, teks).map(x => `${x.kolom}=${x.nilai}`),
    ["terendam=3", "hilang=2"], "negatif, pecahan, dan angka yang tidak ada di kutipan dibuang");
  /* ulasan keamanan LA-86: angka sah di kolom yang salah, dan nol dari kata ingkar milik kolom lain, ditolak */
  const t2 = "12 rumah rusak berat, tidak ada yang meninggal. 40 orang mengungsi";
  assert.deepEqual(validasiKomen({angka: [{kolom: "hilang", nilai: 0, kutipan: "12 rumah rusak berat, tidak ada yang meninggal"}, {kolom: "meninggal", nilai: 12, kutipan: "12 rumah rusak berat"},
    {kolom: "luka", nilai: 40, kutipan: "40 orang mengungsi"}, {kolom: "rumah", nilai: 12, kutipan: "12 rumah rusak berat"}, {kolom: "meninggal", nilai: 0, kutipan: "tidak ada yang meninggal"}]}, t2)
    .map(x => `${x.kolom}=${x.nilai}`), ["rumah=12", "meninggal=0"]);
  assert.deepEqual(validasiKomen(null, teks), []); assert.deepEqual(validasiKomen({angka: "bukan daftar"}, teks), []);
  assert.deepEqual(await uraiKomen(null, teks), [], "tanpa kunci model: tanpa usulan");
  let dipanggil = 0; assert.deepEqual(await uraiKomen(async () => { dipanggil++; return {angka: []}; }, "jalan tertutup"), []); assert.equal(dipanggil, 0, "tanpa angka model tidak dipanggil");
});
