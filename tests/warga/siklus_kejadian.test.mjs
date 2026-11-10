/* Siklus Bencana F1: rute baca, tulis, antrean (SK-020, SK-021). UJ-F1-08, 12, 14 dan bagian rute UJ-F1-15; UJ-KP-03, 07, 08, 11. worker.js utuh di Miniflare + D1 + R2 sungguhan.
   Jalankan: node --test tests/warga/siklus_kejadian.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, kjAcak, id16} from "./_siklus.mjs";
import {idKejadian, kunciPendiri} from "../../src/siklus_hitung.js";

const U = await mulai("uji-sk-kejadian");
const {DB, GET, POST, n, kej, mf} = U;
const PD = await U.staf("Pd Uji", ["pusdalops"]), KO = await U.staf("Ko Uji", ["koordalops"]), PM = await U.staf("Pm Uji", ["pimpinan"]), {SA, MOD, TAMU} = U;
const BP = await U.bp(), BPPROV = await U.bp({jenis: "pemprov", tingkat: "prov", cakupan: '["33"]', prov: "33", kab: null, wilayah: "BPBD Provinsi Jateng"});
const sumber = (o = {}) => DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, status, jenis, kab4, mulai, kejadian_id, kandidat, dampak, diambil, dibuat, diubah) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1)")
  .bind(o.id ?? id16(), o.sumber ?? "dibi", o.kode ?? "k" + id16(), o.status ?? "terpasang", o.jenis ?? "banjir", ("kab4" in o ? o.kab4 : "3201"), o.mulai ?? "2026-03-02", o.kejadian_id ?? null, o.kandidat ? JSON.stringify(o.kandidat) : null, o.dampak ? JSON.stringify(o.dampak) : null).run();
const baris = async (sql, ...b) => (await DB.prepare(sql).bind(...b).all()).results;
const satu = async (sql, ...b) => (await DB.prepare(sql).bind(...b).first());
const arsip = (tahun, nama, isi) => U.mf.getR2Bucket("MEDIA").then(b => b.put(`siklus/saji/kejadian/arsip/${tahun}/${nama}.json`, typeof isi === "string" ? isi : JSON.stringify(isi)));

/* ================================================================ tulis dasar */
uji("POST kejadian: id deterministik dari hash kunci pendiri (vektor acuan), jejak satu batch, tabrakan menghash ulang", async () => {
  const sebelumJejak = await n("sk_jejak");
  const r = await POST(KO, "/kejadian", {jenis: "banjir", nama: "Banjir Bogor Maret", kab4: "3201", mulai: "2026-03-02"}); assert.equal(r.s, 201, r.t);
  assert.equal(r.j.id, "KJ-2026-9A2WGN3G"); assert.equal(r.j.id, await idKejadian(kunciPendiri("banjir", "3201", "2026-03-02")));
  const b = await satu("SELECT * FROM sk_kejadian WHERE id = ?", r.j.id);
  assert.equal(b.fase, "terdeteksi"); assert.equal(b.prov, "32"); assert.equal(b.asal, "manual"); assert.equal(b.dummy, 0); assert.equal(b.publik, 0); assert.match(b.oleh, /^staf:/);
  assert.deepEqual((await baris("SELECT kab4 FROM sk_kejadian_kab WHERE kejadian_id = ?", r.j.id)).map(x => x.kab4), ["3201"]);
  assert.equal(await n("sk_jejak", `obyek_id = '${r.j.id}' AND aksi = 'buat'`), 1); assert.equal(await n("sk_jejak"), sebelumJejak + 1);
  const dua = await POST(KO, "/kejadian", {jenis: "banjir", nama: "Banjir Bogor lain", kab4: "3201", mulai: "2026-03-02"}); assert.equal(dua.s, 409, "serupa: kandidat 3 hari, kab4 sama");
  assert.equal(dua.j.kandidat[0].id, r.j.id);
  const tiga = await POST(KO, "/kejadian", {jenis: "banjir", nama: "Banjir Bogor lain", kab4: "3201", mulai: "2026-03-02", paksa: true}); assert.equal(tiga.s, 201); assert.equal(tiga.j.id, "KJ-2026-8N57ZZ0Y", "tabrakan = hash kunci|2");
  const gab = await POST(KO, "/kejadian", {jenis: "banjir+longsor", nama: "Banjir dan longsor", kab4: "3201", mulai: "2026-03-02", paksa: true}); assert.equal(gab.j.id, "KJ-2026-MT5Z0ZVT");
  assert.equal((await POST(PD, "/kejadian", {jenis: "gempa", nama: "Gempa uji", mulai: "2026-03-02"})).s, 201, "tanpa kab4 sah (wilayah belum terpetakan)");
});
uji("POST kejadian: masukan liar ditolak 400 tanpa menulis (jenis, kab4, tanggal, nama, koordinat)", async () => {
  const sebelum = await n("sk_kejadian"), dasar = {jenis: "banjir", nama: "Banjir uji", kab4: "3202", mulai: "2026-04-01", paksa: true};
  for (const [k, v] of [["jenis", "tidak_ada"], ["jenis", "longsor+banjir"], ["jenis", "banjir+banjir"], ["jenis", 7], ["jenis", "x".repeat(40)], ["kab4", "9999"], ["kab4", "32"], ["kab4", 3202], ["mulai", "2026-13-01"], ["mulai", "2026-04-01T00:00"], ["mulai", "2010-01-01"], ["mulai", "2099-01-01"],
    ["nama", "ab"], ["nama", "x".repeat(161)], ["nama", "hubungi 081234567890"], ["nama", "kontak a@b.id"], ["nama", "Banjir‮"], ["nama", 5], ["pusat", {lat: 50, lon: 106}], ["pusat", {lat: -6}], ["paksa", "ya"]])
    assert.equal((await POST(KO, "/kejadian", {...dasar, [k]: v})).s, 400, `${k}=${JSON.stringify(v).slice(0, 30)}`);
  assert.equal((await U.api("POST", "/api/siklus/kejadian", "{bukan json", KO.hp)).s, 400);
  assert.equal((await U.api("POST", "/api/siklus/kejadian", {...dasar, nama: "x".repeat(20000)}, KO.hp)).s, 413);
  assert.equal(await n("sk_kejadian"), sebelum);
});

/* ================================================================ fase, publik */
uji("fase: PD hanya terdeteksi ke terverifikasi/dibatalkan; KO semua langkah sah; transisi tak sah 409; alasan wajib; syarat tanggal", async () => {
  const id = await kej(KO, {nama: "Banjir fase", kab4: "3216", mulai: "2026-04-01"});
  const F = (a, ke, ekstra = {}) => POST(a, `/kejadian/${id}/fase`, {ke, ...ekstra});
  assert.equal((await F(PD, "tanggap")).s, 409, "melompat");
  assert.equal((await F(PD, "terdeteksi")).s, 409, "fase sama");
  assert.equal((await F(PD, "digabung")).s, 400, "digabung hanya lewat gabung");
  assert.equal((await F(PD, "ngawur")).s, 400);
  assert.equal((await F(PD, "terverifikasi")).s, 200);
  assert.equal((await F(PD, "tanggap", {tanggap_mulai: "2026-04-01"})).s, 403, "PD tidak boleh ke tanggap");
  assert.equal((await F(PM, "tanggap")).s, 403, "PM tidak menulis");
  assert.equal((await F(KO, "tanggap")).s, 400, "tanggap_mulai wajib");
  assert.equal((await F(KO, "tanggap", {tanggap_mulai: "2026-02-30"})).s, 400);
  assert.equal((await F(KO, "tanggap", {tanggap_mulai: "2026-04-01"})).s, 200);
  assert.equal((await F(KO, "transisi")).s, 400, "tanggap_akhir wajib");
  assert.equal((await F(KO, "transisi", {tanggap_akhir: "2026-03-30"})).s, 400, "akhir sebelum mulai");
  assert.equal((await F(KO, "transisi", {tanggap_akhir: "2026-04-10"})).s, 200);
  assert.equal((await F(KO, "tanggap")).s, 400, "mundur tanpa alasan");
  assert.equal((await F(KO, "tanggap", {alasan: "Perpanjangan masa tanggap"})).s, 200);
  assert.equal((await F(KO, "dibatalkan", {alasan: "x"})).s, 400, "alasan terlalu pendek atau dibatalkan dari fase lanjut");
  const r = await satu("SELECT fase, tanggap_mulai, tanggap_akhir FROM sk_kejadian WHERE id = ?", id); assert.deepEqual({...r}, {fase: "tanggap", tanggap_mulai: "2026-04-01", tanggap_akhir: "2026-04-10"});
  const j = await baris("SELECT aksi, dari, ke, catatan FROM sk_jejak WHERE obyek_id = ? AND aksi = 'fase' ORDER BY id", id);
  assert.deepEqual(j.map(x => `${x.dari}>${x.ke}`), ["terdeteksi>terverifikasi", "terverifikasi>tanggap", "tanggap>transisi", "transisi>tanggap"]);
  const b = await kej(PD, {nama: "Salah deteksi", kab4: "3216", mulai: "2026-04-05"});
  assert.equal((await POST(PD, `/kejadian/${b}/fase`, {ke: "dibatalkan"})).s, 400, "alasan wajib untuk dibatalkan");
  assert.equal((await POST(PD, `/kejadian/${b}/fase`, {ke: "dibatalkan", alasan: "Salah deteksi sensor"})).s, 200);
  assert.equal((await POST(KO, `/kejadian/${b}/fase`, {ke: "terdeteksi", alasan: "hidupkan lagi"})).s, 409, "dibatalkan tidak keluar");
  const tw = await kej(KO, {jenis: "gempa", nama: "Gempa tanpa wilayah", mulai: "2026-04-06", kab4: null});
  assert.equal((await POST(PD, `/kejadian/${tw}/fase`, {ke: "terverifikasi"})).s, 400, "verifikasi butuh kabupaten");
  assert.equal((await POST(KO, `/kejadian/KJ-2026-ZZZZZZZZ/fase`, {ke: "terverifikasi"})).s, 404);
});
uji("UJ-F1-08: publik turun ke 0 dalam batch fase yang sama saat fase kembali ke terdeteksi atau dibatalkan; publik hanya KO, ringkasan 20-600 tanpa telepon", async () => {
  const id = await kej(KO, {nama: "Banjir publik", kab4: "3201", mulai: "2026-05-01"});
  const P = (a, b) => POST(a, `/kejadian/${id}/publik`, b);
  assert.equal((await P(KO, {publik: true, ringkasan: "Banjir di Bogor, warga mengungsi ke balai desa."})).s, 409, "terdeteksi tidak boleh publik");
  assert.equal((await POST(PD, `/kejadian/${id}/fase`, {ke: "terverifikasi"})).s, 200);
  assert.equal((await P(PD, {publik: true, ringkasan: "Banjir di Bogor, warga mengungsi ke balai desa."})).s, 403, "PD tidak mempublikasikan");
  for (const ringkasan of [undefined, "pendek", "Hubungi 081234567890 untuk info banjir di Bogor.", "Info banjir Bogor di a@b.id untuk warga.", "x".repeat(601), 5]) assert.equal((await P(KO, {publik: true, ringkasan})).s, 400, String(ringkasan).slice(0, 20));
  assert.equal((await P(KO, {publik: "ya", ringkasan: "Banjir di Bogor, warga mengungsi ke balai desa."})).s, 400);
  assert.equal((await P(KO, {publik: true, ringkasan: "Banjir di Bogor, warga mengungsi ke balai desa."})).s, 200);
  assert.equal((await satu("SELECT publik FROM sk_kejadian WHERE id = ?", id)).publik, 1);
  assert.equal((await POST(KO, `/kejadian/${id}/fase`, {ke: "terdeteksi", alasan: "Verifikasi dicabut"})).s, 200);
  const r = await satu("SELECT fase, publik, ringkasan_publik FROM sk_kejadian WHERE id = ?", id); assert.equal(r.fase, "terdeteksi"); assert.equal(r.publik, 0, "publik turun dalam batch yang sama"); assert.ok(r.ringkasan_publik);
  assert.equal((await P(KO, {publik: false})).s, 200, "tarik publik tanpa ringkasan");
});

/* ================================================================ publik (UJ-F1-14) */
uji("UJ-F1-14: publik/kejadian/:id hanya publik=1 dan dummy=0; tidak ada, belum publik, digabung, dan dummy memberi 404 yang sama byte demi byte; header tembolok", async () => {
  const id = await kej(KO, {nama: "Banjir untuk publik", kab4: "3201", mulai: "2026-06-01"});
  await POST(KO, `/kejadian/${id}/fase`, {ke: "terverifikasi"});
  const tidak = await GET(TAMU, `/publik/kejadian/${id}`); assert.equal(tidak.s, 404, "publik=0");
  await POST(KO, `/kejadian/${id}/publik`, {publik: true, ringkasan: "Banjir di Kabupaten Bogor, ketinggian air mulai surut."});
  const ok = await GET(TAMU, `/publik/kejadian/${id}`); assert.equal(ok.s, 200, ok.t);
  assert.deepEqual(Object.keys(ok.j).sort(), ["diperbarui", "fase", "id", "jenis", "mulai", "ringkasan", "wilayah", "yakin"]);
  assert.equal(ok.j.wilayah, "Bogor, Jawa Barat"); assert.equal(ok.j.fase, "terverifikasi"); assert.match(ok.h.get("cache-control"), /s-maxage=300/); assert.match(ok.h.get("cache-control"), /max-age=60/); assert.equal(ok.h.get("x-content-type-options"), "nosniff");
  assert.doesNotMatch(ok.t, /oleh|staf:|nomor_induk|dummy|ip_hash/);
  /* dummy, digabung, tidak ada */
  const dum = kjAcak(), kini = Date.now();
  await DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, prov, mulai, fase, fase_diubah, asal, publik, ringkasan_publik, dibuat, diubah, oleh, dummy) VALUES (?, 'banjir', 'Kejadian dummy', '3201', '32', '2026-06-02', 'tanggap', ?, 'manual', 1, 'Ringkasan dummy yang panjangnya cukup.', ?, ?, 'x', 1)").bind(dum, kini, kini, kini).run();
  const seragam = [tidak, await GET(TAMU, `/publik/kejadian/${kjAcak()}`), await GET(TAMU, `/publik/kejadian/${dum}`)];
  for (const r of seragam) { assert.equal(r.s, 404); assert.equal(r.t, tidak.t, "badan 404 sama persis"); assert.equal(r.h.get("cache-control"), tidak.h.get("cache-control")); }
  const sib = await kej(KO, {nama: "Banjir untuk publik dua", kab4: "3201", mulai: "2026-06-01", paksa: true});
  await POST(KO, `/kejadian/${sib}/fase`, {ke: "terverifikasi"});
  assert.equal((await POST(KO, `/kejadian/${id}/gabung`, {ke: sib})).s, 200);
  const hasil = await satu("SELECT id, fase, publik FROM sk_kejadian WHERE fase = 'digabung' AND id IN (?, ?)", id, sib);
  assert.equal(hasil.publik, 0, "digabung menurunkan publik"); const g = await GET(TAMU, `/publik/kejadian/${hasil.id}`); assert.equal(g.s, 404); assert.equal(g.t, tidak.t);
  assert.equal((await GET(TAMU, "/publik/kejadian/KJ-2026-9A2WGN3I")).t, tidak.t, "id tak berformat memberi 404 yang sama");
});

/* ================================================================ baca: daftar, detail, BP */
uji("daftar: rentang > 366 hari 400, penanda halaman tanpa baris hilang atau ganda, saringan, tanpa digabung, dummy tersembunyi untuk staf nyata", async () => {
  for (let i = 0; i < 5; i++) await kej(KO, {nama: "Banjir halaman " + i, kab4: "3301", mulai: `2025-07-0${i + 1}`, jenis: "banjir"});
  const dum = kjAcak(); await DB.prepare("INSERT INTO sk_kejadian (id, jenis, nama, kab4, prov, mulai, fase, fase_diubah, asal, dibuat, diubah, oleh, dummy) VALUES (?, 'banjir', 'Banjir dummy', '3301', '33', '2025-07-03', 'terdeteksi', 1, 'manual', 1, 1, 'x', 1)").bind(dum).run();
  const dasar = "dari=2025-07-01&sampai=2025-07-31&kab4=3301";
  assert.equal((await GET(PD, `/kejadian?dari=2024-01-01&sampai=2025-07-31`)).s, 400, "lebih dari 366 hari");
  assert.equal((await GET(PD, `/kejadian?dari=2025-07-31&sampai=2025-07-01`)).s, 400);
  assert.equal((await GET(PD, `/kejadian?${dasar}&batas=0`)).s, 400); assert.equal((await GET(PD, `/kejadian?${dasar}&batas=101`)).s, 400);
  assert.equal((await GET(PD, `/kejadian?${dasar}&sesudah=ngawur`)).s, 400); assert.equal((await GET(PD, `/kejadian?${dasar}&jenis=ngawur`)).s, 400); assert.equal((await GET(PD, "/kejadian?dari=2025-07-01&sampai=2025-07-31&kab4=0000")).s, 400);
  const semua = []; let sesudah = "", halaman = 0;
  do { const r = await GET(PD, `/kejadian?${dasar}&batas=2${sesudah}`); assert.equal(r.s, 200, r.t); semua.push(...r.j.baris); sesudah = r.j.berikut ? `&sesudah=${encodeURIComponent(r.j.berikut)}` : ""; halaman++; } while (sesudah && halaman < 10);
  assert.equal(halaman, 3); assert.equal(semua.length, 5, "5 baris nyata, dummy tidak ikut"); assert.equal(new Set(semua.map(x => x.id)).size, 5);
  assert.deepEqual(semua.map(x => x.mulai), ["2025-07-05", "2025-07-04", "2025-07-03", "2025-07-02", "2025-07-01"]);
  assert.ok(!semua.some(x => x.id === dum));
  assert.ok((await GET(SA, `/kejadian?${dasar}`)).j.baris.some(x => x.id === dum), "Super Admin melihat dummy");
  assert.equal((await GET(PD, `/kejadian?${dasar}&fase=tanggap`)).j.baris.length, 0);
  assert.equal((await GET(PD, `/kejadian?dari=2025-07-01&sampai=2025-07-31&prov=33&jenis=banjir`)).j.baris.length, 5);
  assert.equal((await GET(PM, `/kejadian?${dasar}`)).s, 200); assert.equal((await GET(MOD, `/kejadian?${dasar}`)).s, 200);
  assert.equal((await GET(PD, "/kejadian")).s, 200, "tanpa parameter: 30 hari terakhir");
});
uji("detail: kejadian + kab + sumber berdampingan + selisih dari server (tanpa total) + jejak; alias mengarah ke penyintas; id tak ada 404", async () => {
  const id = await kej(KO, {nama: "Banjir detail", kab4: "3201", mulai: "2026-07-10"});
  await sumber({sumber: "dibi", kode: "d1" + id16(), kejadian_id: id, mulai: "2026-07-10", dampak: {meninggal: {n: 12, y: "resmi", t: "2026"}, luka: {n: 4, y: "resmi", t: "2026"}}});
  await sumber({sumber: "logbook", kode: "l1" + id16(), kejadian_id: id, mulai: "2026-07-10", dampak: {meninggal: {n: 15, y: "terverifikasi", t: "2026"}}});
  const r = await GET(PD, `/kejadian/${id}`); assert.equal(r.s, 200, r.t);
  assert.equal(r.j.kejadian.id, id); assert.deepEqual(r.j.kab, ["3201"]); assert.equal(r.j.sumber.length, 2); assert.equal(r.j.wilayah, "Bogor, Jawa Barat");
  const m = r.j.selisih.find(x => x.metrik === "meninggal"); assert.equal(m.n, 2); assert.equal(m.selisih, 3); assert.deepEqual(m.arah, {maks: "logbook", min: "dibi"}); assert.equal(m.persen, 20);
  assert.equal(r.j.selisih.find(x => x.metrik === "luka").selisih, null);
  assert.ok(!/"total"|jumlah_gabungan/.test(r.t), "tanpa kolom total");
  assert.ok(r.j.jejak.length >= 1); assert.deepEqual(r.j.kaji_ids, []); assert.equal((await GET(PD, `/kejadian/${kjAcak()}`)).s, 404);
  assert.equal((await GET(PD, `/kejadian/${id}?tahun=2019&kab4=3201`)).s, 200, "ada di D1: arsip diabaikan");
});
uji("UJ-KP-03: BP hanya kabupaten/provinsinya; di luar lingkup dan tidak ada memberi 404 yang sama byte demi byte (daftar, detail, arsip)", async () => {
  const dalam = await kej(KO, {nama: "Banjir Bogor BP", kab4: "3201", mulai: "2026-08-01"}), tetangga = await kej(KO, {nama: "Banjir Bekasi BP", kab4: "3216", mulai: "2026-08-01"}), jateng = await kej(KO, {nama: "Banjir Cilacap BP", kab4: "3301", mulai: "2026-08-01"});
  const tanpa = await kej(KO, {nama: "Gempa tanpa wilayah BP", jenis: "gempa", kab4: null, mulai: "2026-08-01"});
  const q = "dari=2026-08-01&sampai=2026-08-01";
  const ids = r => r.j.baris.map(x => x.id);
  const l = await GET(BP, `/kejadian?${q}`); assert.equal(l.s, 200, l.t); assert.deepEqual(ids(l), [dalam]); assert.ok(l.j.baris.every(x => !("oleh" in x)), "BP tanpa kolom oleh");
  assert.deepEqual(ids(await GET(BPPROV, `/kejadian?${q}`)), [jateng]); assert.ok(!ids(await GET(BP, `/kejadian?${q}`)).includes(tanpa));
  assert.equal((await GET(BP, `/kejadian?${q}&kab4=3216`)).s, 404);
  assert.equal((await GET(BP, `/kejadian/${dalam}`)).s, 200); assert.equal((await GET(BPPROV, `/kejadian/${jateng}`)).s, 200);
  const tak = await GET(BP, `/kejadian/${kjAcak()}`), luar = await GET(BP, `/kejadian/${tetangga}`), luar2 = await GET(BP, `/kejadian/${tanpa}`), luar3 = await GET(BPPROV, `/kejadian/${dalam}`);
  for (const r of [tak, luar, luar2, luar3]) { assert.equal(r.s, 404); assert.equal(r.t, tak.t, "badan 404 sama persis"); }
  const bpj = await GET(BP, `/kejadian/${dalam}`); assert.ok(bpj.j.jejak.every(x => !("oleh" in x)) && !("oleh" in bpj.j.kejadian));
  /* arsip: BP hanya berkas k<kab4> kabupatennya */
  await arsip(2020, "k3201", {v: 1, kolom: ["id", "jenis", "kab4", "mulai"], baris: []}); await arsip(2020, "k3216", {v: 1, kolom: ["id"], baris: []});
  assert.equal((await GET(BP, "/kejadian/arsip?tahun=2020&kab4=3201")).s, 200);
  const a1 = await GET(BP, "/kejadian/arsip?tahun=2020&kab4=3216"), a2 = await GET(BP, "/kejadian/arsip?tahun=2020&kab4=3301"); assert.equal(a1.s, 404); assert.equal(a1.t, a2.t);
  assert.equal((await GET(BP, "/kejadian/arsip?tahun=2020")).s, 400, "BP wajib kab4");
  const mutasi = await POST(BP, "/kejadian", {jenis: "banjir", nama: "Banjir BP", kab4: "3201", mulai: "2026-08-02"}); assert.equal(mutasi.s, 403);
  assert.equal(await n("sk_kejadian", "nama = 'Banjir BP'"), 0);
});

/* ================================================================ arsip R2 (UJ-F1-12) */
uji("UJ-F1-12: arsip dialirkan apa adanya; GET :id mencari D1 dulu lalu R2 hanya bila tahun dan kab4 ada; promosi satu kali; id tidak di berkas 404; berkas > 128 KB tidak di-parse", async () => {
  const idA = "KJ-2019-7K3M9Q2A", idB = "KJ-2019-8K3M9Q2B", idTW = "KJ-2019-9K3M9Q2C";
  const isi = {v: 1, jenis: "kejadian_arsip", tahun: 2019, beku: true, kolom: ["id", "jenis", "kab4", "mulai", "akhir", "nama", "sumber", "dampak"],
    baris: [[idA, "banjir", "3201", "2019-02-12", null, "Banjir <b>Bogor</b>‮ Februari", ["dibi", "logbook"], {dibi: {meninggal: {n: 2, y: "resmi", t: "2019"}}}], [idB, "tidak_dikenal", "3201", "2019-02-13", null, "Jenis liar", ["dibi"], {}], [idTW, "banjir", null, "2019-02-14", null, "Tanpa wilayah", ["dibi"], {}]]};
  await arsip(2019, "k3201", isi); await arsip(2019, "32", {v: 1, tahun: 2019, baris: [["x"]]});
  const s = await GET(PD, "/kejadian/arsip?tahun=2019&prov=32"); assert.equal(s.s, 200); assert.deepEqual(s.j.baris, [["x"]]); assert.match(s.h.get("content-type"), /json/);
  assert.equal((await GET(PD, "/kejadian/arsip?tahun=2019&kab4=3201")).j.kolom[0], "id");
  assert.equal((await GET(PD, "/kejadian/arsip?tahun=2018&prov=32")).s, 404, "belum dibangun");
  for (const q of ["", "tahun=2019", "tahun=1999&prov=32", "tahun=2019&prov=3", "tahun=2019&prov=32x", "prov=32"]) assert.equal((await GET(PD, "/kejadian/arsip?" + q)).s, 400, q);
  /* detail dari arsip: tanpa tahun/kab4 404; dengan keduanya baca saja berlabel arsip */
  assert.equal((await GET(PD, `/kejadian/${idA}`)).s, 404);
  const d = await GET(PD, `/kejadian/${idA}?tahun=2019&kab4=3201`); assert.equal(d.s, 200, d.t); assert.equal(d.j.arsip, true); assert.equal(d.j.kejadian.id, idA); assert.equal(d.j.kejadian.dampak.dibi.meninggal.n, 2);
  assert.equal((await GET(PD, `/kejadian/KJ-2019-AAAAAAAA?tahun=2019&kab4=3201`)).s, 404);
  assert.equal(await n("sk_kejadian", `id = '${idA}'`), 0, "membaca arsip tidak menulis D1");
  /* promosi */
  const P = (a, id, b) => POST(a, `/kejadian/${id}/promosi`, b);
  assert.equal((await P(KO, idA, {kab4: "3201"})).s, 400); assert.equal((await P(KO, idA, {tahun: 2019})).s, 400); assert.equal((await P(KO, idA, {tahun: "2019", kab4: "3201"})).s, 400); assert.equal((await P(KO, idA, {tahun: 2019, kab4: "9999"})).s, 400);
  assert.equal((await P(KO, "KJ-2019-AAAAAAAA", {tahun: 2019, kab4: "3201"})).s, 404, "id tidak di berkas itu");
  assert.equal((await P(KO, idA, {tahun: 2019, kab4: "3216"})).s, 404, "berkas kab4 lain belum ada");
  assert.equal((await P(KO, idTW, {tahun: 2019, kab4: "3201"})).s, 400, "baris tanpa wilayah tidak bisa dipromosikan");
  assert.equal((await P(KO, idB, {tahun: 2019, kab4: "3201"})).s, 400, "jenis arsip tak dikenal");
  const p1 = await P(KO, idA, {tahun: 2019, kab4: "3201"}); assert.equal(p1.s, 201, p1.t); assert.equal(p1.j.id, idA);
  const b = await satu("SELECT * FROM sk_kejadian WHERE id = ?", idA); assert.equal(b.asal, "promosi"); assert.equal(b.arsip_tahun, 2019); assert.equal(b.fase, "terdeteksi"); assert.equal(b.prov, "32"); assert.equal(b.mulai, "2019-02-12");
  assert.ok(!/[<>‮]/.test(b.nama), "nama arsip dibersihkan"); assert.deepEqual((await baris("SELECT kab4 FROM sk_kejadian_kab WHERE kejadian_id = ?", idA)).map(x => x.kab4), ["3201"]);
  const p2 = await P(KO, idA, {tahun: 2019, kab4: "3201"}); assert.equal(p2.s, 200); assert.equal(p2.j.sudah_ada, true);
  assert.equal(await n("sk_kejadian", `id = '${idA}'`), 1); assert.equal(await n("sk_jejak", `obyek_id = '${idA}' AND aksi = 'promosi'`), 1);
  assert.equal((await GET(PD, `/kejadian/${idA}`)).j.kejadian.asal, "promosi", "sesudah promosi dibaca dari D1");
  /* berkas besar: tidak di-parse */
  await arsip(2018, "k3201", "x".repeat(200 * 1024));
  const besar = await GET(PD, `/kejadian/KJ-2018-AAAAAAAA?tahun=2018&kab4=3201`); assert.equal(besar.s, 413);
  assert.equal((await P(KO, "KJ-2018-AAAAAAAA", {tahun: 2018, kab4: "3201"})).s, 413);
  await arsip(2017, "k3201", "{rusak"); assert.equal((await GET(PD, `/kejadian/KJ-2017-AAAAAAAA?tahun=2017&kab4=3201`)).s, 502);
});

/* ================================================================ gabung, koreksi, antrean */
uji("UJ-F1-08: gabung: penyintas = mulai lebih awal; alias B->A->C; kab dan sumber pindah dengan asal_id; fase berbeda 409; tidak ada rute pecah", async () => {
  const mk = async (nama, mulai, kab4) => kej(KO, {nama, mulai, kab4, jenis: "longsor"});
  const A = await mk("Longsor A", "2026-09-02", "3201"), B = await mk("Longsor B", "2026-09-05", "3216"), C = await mk("Longsor C", "2026-09-01", "3301");
  await sumber({kode: "sb" + id16(), kejadian_id: B, mulai: "2026-09-05", kab4: "3216", jenis: "longsor"});
  assert.equal((await POST(KO, `/kejadian/${A}/gabung`, {ke: A})).s, 400, "dengan dirinya sendiri");
  assert.equal((await POST(KO, `/kejadian/${A}/gabung`, {ke: "bukan"})).s, 400);
  assert.equal((await POST(KO, `/kejadian/${A}/gabung`, {ke: kjAcak()})).s, 404);
  await POST(KO, `/kejadian/${C}/fase`, {ke: "terverifikasi"});
  assert.equal((await POST(KO, `/kejadian/${A}/gabung`, {ke: C})).s, 409, "fase berbeda");
  const r = await POST(KO, `/kejadian/${B}/gabung`, {ke: A}); assert.equal(r.s, 200, r.t); assert.deepEqual(r.j, {digabung: B, ke: A});
  const b = await satu("SELECT fase, ke, publik FROM sk_kejadian WHERE id = ?", B); assert.deepEqual({...b}, {fase: "digabung", ke: A, publik: 0});
  assert.deepEqual((await baris("SELECT kab4 FROM sk_kejadian_kab WHERE kejadian_id = ? ORDER BY kab4", A)).map(x => x.kab4), ["3201", "3216"], "kab penyintas = gabungan");
  const sb = await satu("SELECT kejadian_id, asal_id FROM sk_kejadian_sumber WHERE jenis = 'longsor' AND mulai = '2026-09-05'"); assert.deepEqual({...sb}, {kejadian_id: A, asal_id: B});
  assert.deepEqual({...(await satu("SELECT alias_id, ke_id FROM sk_kejadian_alias WHERE alias_id = ?", B))}, {alias_id: B, ke_id: A});
  assert.equal(await n("sk_jejak", `obyek_id = '${B}' AND aksi = 'gabung'`), 1);
  const dalam = (await GET(PD, "/kejadian?dari=2026-09-01&sampai=2026-09-30&jenis=longsor")).j.baris.map(x => x.id); assert.ok(!dalam.includes(B) && dalam.includes(A) && dalam.includes(C), "digabung tidak ada di daftar");
  await POST(KO, `/kejadian/${A}/fase`, {ke: "terverifikasi"});
  assert.equal((await POST(KO, `/kejadian/${B}/gabung`, {ke: C})).s, 409, "B sudah digabung");
  const r2 = await POST(KO, `/kejadian/${A}/gabung`, {ke: C}); assert.equal(r2.s, 200, r2.t); assert.deepEqual(r2.j, {digabung: A, ke: C}, "C mulai 09-01 lebih awal, jadi penyintas");
  assert.deepEqual((await GET(PD, `/kejadian/${B}`)).j, {alias_ke: C}, "B->A->C");
  assert.deepEqual((await GET(PD, `/kejadian/${A}`)).j, {alias_ke: C});
  assert.equal((await satu("SELECT asal_id FROM sk_kejadian_sumber WHERE jenis = 'longsor' AND mulai = '2026-09-05'")).asal_id, A, "asal_id = kejadian sebelum baris dipindah");
  assert.equal((await GET(BP, `/kejadian/${B}`)).j.alias_ke, C, "kab A dan B ikut tergabung ke C, jadi Bogor masuk lingkup C");
  const BPLAIN = await U.bp({jenis: "pemprov", tingkat: "prov", cakupan: '["15"]', prov: "15", kab: null, wilayah: "BPBD Provinsi Jambi"});
  assert.equal((await GET(BPLAIN, `/kejadian/${B}`)).s, 404, "alias ke kejadian di luar lingkup BP = 404");
  assert.equal((await POST(KO, `/kejadian/${C}/pecah`, {})).s, 404, "tidak ada rute pecah"); assert.equal((await POST(PD, `/kejadian/${C}/gabung`, {ke: B})).s, 403);
});
uji("UJ-F1-08: koreksi manual memindahkan satu baris sumber ke KJ- lain atau baru dan menulis sk_jejak (asal_id terisi); fase berbeda dan ke digabung 409", async () => {
  const A = await kej(KO, {nama: "Koreksi A", mulai: "2026-10-02", kab4: "3201", jenis: "cuaca"}), X = await kej(KO, {nama: "Koreksi X", mulai: "2026-10-20", kab4: "3201", jenis: "cuaca"});
  const s1 = id16(), s2 = id16(), s3 = id16();
  await sumber({id: s1, kode: "c1" + id16(), kejadian_id: A, mulai: "2026-10-02", jenis: "cuaca"}); await sumber({id: s2, kode: "c2" + id16(), kejadian_id: A, mulai: "2026-10-03", jenis: "cuaca"}); await sumber({id: s3, kode: "c3" + id16(), kejadian_id: A, mulai: "2026-10-04", jenis: "cuaca", kab4: null});
  const K = (a, id, b) => POST(a, `/kejadian/${id}/koreksi`, b);
  assert.equal((await K(PD, A, {sid: s1, ke: X})).s, 403);
  for (const b of [{}, {sid: "zz", ke: X}, {sid: s1, ke: "salah"}, {sid: s1}]) assert.equal((await K(KO, A, b)).s, 400);
  assert.equal((await K(KO, A, {sid: id16(), ke: X})).s, 404); assert.equal((await K(KO, X, {sid: s1, ke: A})).s, 404, "baris bukan milik kejadian ini");
  assert.equal((await K(KO, A, {sid: s3, ke: "baru"})).s, 400, "tanpa wilayah tidak jadi kejadian baru");
  assert.equal((await K(KO, A, {sid: s1, ke: A})).s, 400);
  await POST(KO, `/kejadian/${X}/fase`, {ke: "terverifikasi"});
  assert.equal((await K(KO, A, {sid: s1, ke: X})).s, 409, "fase berbeda");
  await POST(KO, `/kejadian/${A}/fase`, {ke: "terverifikasi"});
  const ok = await K(KO, A, {sid: s1, ke: X}); assert.equal(ok.s, 200, ok.t); assert.deepEqual({...(await satu("SELECT kejadian_id, asal_id FROM sk_kejadian_sumber WHERE id = ?", s1))}, {kejadian_id: X, asal_id: A});
  const baru = await K(KO, A, {sid: s2, ke: "baru"}); assert.equal(baru.s, 200, baru.t);
  assert.equal(baru.j.ke, await idKejadian(kunciPendiri("cuaca", "3201", "2026-10-03")), "id baru dari F1.2 atas jenis|kab4|mulai baris itu");
  const nb = await satu("SELECT fase, asal, kab4, jenis FROM sk_kejadian WHERE id = ?", baru.j.ke); assert.deepEqual({...nb}, {fase: "terdeteksi", asal: "manual", kab4: "3201", jenis: "cuaca"});
  assert.equal(await n("sk_jejak", `obyek = 'sumber' AND aksi = 'koreksi' AND obyek_id IN ('${s1}', '${s2}')`), 2);
  assert.equal((await K(KO, A, {sid: s1, ke: X})).s, 404, "baris sudah pindah; id lama tidak memilikinya lagi");
  const dig = await kej(KO, {nama: "Koreksi digabung", mulai: "2026-10-25", kab4: "3201", jenis: "cuaca"}); await POST(KO, `/kejadian/${dig}/fase`, {ke: "terverifikasi"});
  assert.equal((await POST(KO, `/kejadian/${dig}/gabung`, {ke: X})).j.digabung, dig, "X mulai lebih awal, jadi penyintas");
  assert.equal((await K(KO, X, {sid: s1, ke: dig})).s, 409, "kejadian tujuan sudah digabung");
});
uji("antrean: daftar ambigu/tanpa_wilayah dengan kandidat; keputusan pilih kandidat, baru, tolak; di luar kandidat 409; sudah diputuskan 409", async () => {
  const A = await kej(KO, {nama: "Kandidat A", mulai: "2025-11-02", kab4: "3201", jenis: "kekeringan"}), B = await kej(KO, {nama: "Kandidat B", mulai: "2025-11-05", kab4: "3201", jenis: "kekeringan"}), Lain = await kej(KO, {nama: "Bukan kandidat", mulai: "2025-11-20", kab4: "3201", jenis: "kekeringan"});
  const a1 = id16(), a2 = id16(), a3 = id16(), a4 = id16(), tw = id16();
  await sumber({id: a1, status: "ambigu", kejadian_id: null, kandidat: [A, B], mulai: "2025-11-03", jenis: "kekeringan", kode: "q1" + id16()});
  await sumber({id: a2, status: "ambigu", kandidat: [A, B], mulai: "2025-11-03", jenis: "kekeringan", kode: "q2" + id16()}); await sumber({id: a3, status: "ambigu", kandidat: [A, B], mulai: "2025-11-03", jenis: "kekeringan", kode: "q3" + id16()});
  await sumber({id: a4, status: "ambigu", kandidat: [A, B], mulai: "2025-11-03", jenis: "kekeringan", kode: "q4" + id16()}); await sumber({id: tw, status: "tanpa_wilayah", kab4: null, mulai: "2025-11-04", jenis: "kekeringan", kode: "q5" + id16()});
  const l = await GET(PD, "/antrean"); assert.equal(l.s, 200); const mine = l.j.baris.filter(x => [a1, a2, a3, a4, tw].includes(x.id)); assert.equal(mine.length, 5); assert.deepEqual(mine.find(x => x.id === a1).kandidat, [A, B]);
  assert.deepEqual((await GET(PD, "/antrean?status=tanpa_wilayah")).j.baris.filter(x => x.id === tw).length, 1); assert.equal((await GET(PD, "/antrean?status=ditolak")).s, 400);
  const Q = (a, sid, b) => POST(a, `/antrean/${sid}`, b);
  assert.equal((await Q(PM, a1, {pilih: A})).s, 403); assert.equal((await Q(KO, a1, {})).s, 400, "pilih wajib"); assert.equal((await Q(KO, a1, {pilih: "bukan"})).s, 400); assert.equal((await Q(KO, a1, {pilih: A, kab4: "9999"})).s, 400);
  assert.equal((await Q(KO, a1, {pilih: Lain})).s, 409, "di luar kandidat"); assert.equal((await Q(KO, tw, {pilih: A})).s, 409, "tanpa_wilayah tidak punya kandidat"); assert.equal((await Q(KO, id16(), {pilih: A})).s, 404);
  const ok = await Q(KO, a1, {pilih: A}); assert.equal(ok.s, 200, ok.t); assert.deepEqual({...(await satu("SELECT status, kejadian_id, kandidat FROM sk_kejadian_sumber WHERE id = ?", a1))}, {status: "terpasang", kejadian_id: A, kandidat: null});
  assert.equal((await Q(KO, a1, {pilih: B})).s, 409, "sudah diputuskan");
  assert.equal((await Q(PD, a2, {pilih: null})).s, 200); assert.deepEqual({...(await satu("SELECT status, kejadian_id FROM sk_kejadian_sumber WHERE id = ?", a2))}, {status: "ditolak", kejadian_id: null});
  const baru = await Q(KO, a3, {pilih: "baru"}); assert.equal(baru.s, 200, baru.t); assert.equal((await satu("SELECT kab4 FROM sk_kejadian WHERE id = ?", baru.j.kejadian_id)).kab4, "3201");
  assert.equal((await Q(KO, tw, {pilih: "baru"})).s, 400, "kab4 wajib"); const bt = await Q(KO, tw, {pilih: "baru", kab4: "3216"}); assert.equal(bt.s, 200, bt.t); assert.deepEqual({...(await satu("SELECT status, kab4 FROM sk_kejadian_sumber WHERE id = ?", tw))}, {status: "terpasang", kab4: "3216"});
  assert.equal(await n("sk_jejak", `obyek = 'sumber' AND aksi = 'antrean' AND obyek_id IN ('${a1}', '${a2}', '${a3}', '${tw}')`), 4);
  const dig = await kej(KO, {nama: "Kandidat digabung", mulai: "2025-11-06", kab4: "3201", jenis: "kekeringan"}); await POST(KO, `/kejadian/${dig}/fase`, {ke: "dibatalkan", alasan: "salah"}).catch(() => {});
  await POST(PD, `/kejadian/${dig}/fase`, {ke: "dibatalkan", alasan: "Salah deteksi"}); const a5 = id16(); await sumber({id: a5, status: "ambigu", kandidat: [dig], mulai: "2025-11-06", jenis: "kekeringan", kode: "q9" + id16()});
  assert.equal((await Q(KO, a5, {pilih: dig})).s, 409, "kandidat dibatalkan");
});

/* ================================================================ laju, jejak */
uji("UJ-KP-11: batas laju tulis memberi 429 + retry-after; GET tidak menulis laju_bnpb; jejak GET hanya staf", async () => {
  const sebelum = await n("laju_bnpb"); await GET(PD, "/kejadian"); await GET(PD, "/antrean"); await GET(TAMU, `/publik/kejadian/${kjAcak()}`); assert.equal(await n("laju_bnpb"), sebelum, "GET tidak menulis laju");
  const L = await U.staf("Ko Laju", ["koordalops"]), oleh = (await satu("SELECT id FROM staf WHERE nama = 'Ko Laju'")).id, kini = Date.now();
  await DB.batch(Array.from({length: 30}, () => DB.prepare("INSERT INTO laju_bnpb (kunci, aksi, waktu) VALUES (?, 'sk.gabung', ?)").bind("sk:staf:" + oleh, kini)));
  const A = await kej(L, {nama: "Laju A", mulai: "2025-12-01", kab4: "3201", jenis: "tsunami"}), B = await kej(L, {nama: "Laju B", mulai: "2025-12-02", kab4: "3201", jenis: "tsunami"});
  const r = await POST(L, `/kejadian/${A}/gabung`, {ke: B}); assert.equal(r.s, 429, r.t); assert.ok(Number(r.h.get("retry-after")) > 0);
  assert.equal(await n("sk_kejadian", "fase = 'digabung' AND jenis = 'tsunami'"), 0);
  const j = await GET(PD, `/jejak?id=${A}`); assert.equal(j.s, 200); assert.ok(j.j.jejak.some(x => x.aksi === "buat")); assert.equal((await GET(PD, "/jejak")).s, 400);
});
