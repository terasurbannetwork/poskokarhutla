/* Form Bahan Laporan Harian (/bnpb/bahan): public/bnpb/bahan_spek.js + src/wa_form.js.
   Tiga penjaga, semuanya menjalankan kode asli tanpa mock:
   1. teks hasil susun() diurai ulang oleh pengurai Python generator (wa_harian.py, wa_operasi.py) dan harus kembali ke isian;
   2. Worker + D1 sungguhan (Miniflare): POST /api/wa/form masuk wa_masuk, dikenali /api/wa/masuk, dan dipilih bot (otomatis.mjs ambilBahan);
   3. validasi menolak isian yang akan merusak pengurai. */
import {test, before, after} from "node:test";
const uji = test;   // gerbang cakupan (tests/warga/gerbang.test.mjs) mencari uji("<nama>")
import assert from "node:assert/strict";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";
import {PROV as PROV_SRC} from "../../src/alun.js";
import {susun, dariLogbook, PROV, terbilang, ribu, kategoriPm} from "../../public/bnpb/bahan_spek.js";
import {ambilBahan} from "../../scripts/wa/otomatis.mjs";

const T = "2026-11-03";
const ISI = {
  rekap_koordalops_24: {sampai: T, laporan: 26, kejadian: [
    {jenis: "banjir", prov: "11", kab: "Aceh Selatan", mengungsi_jiwa: 1205, mengungsi_kk: 358, rumah_rb: 10, rumah_rs: 26, rumah_rr: 337, status_darurat: "Tanggap Darurat TMT 30/10/2026 s.d. 12/11/2026", kondisi: "Air masih menggenang di Trumon.\nPendataan berlanjut."},
    {jenis: "cuaca", prov: "12", kab: "Dairi", baru: true, md: 1, luka: 1, rumah_rb: 1, kondisi: "Lokasi terdampak masih dalam penanganan"},
    {jenis: "kebakaran_permukiman", prov: "19", kab: "Kota Pangkal Pinang", baru: true},
    {jenis: "longsor", prov: "51", kab: "Kab. Badung", baru: true, hilang: 2},
    {jenis: "gempabumi", prov: "53", kab: "Kota Kupang", md: 156, luka: 1620, mengungsi_jiwa: 27193, rumah_rb: 6016, rumah_rs: 15291, rumah_rr: 31428, status_darurat: "Transisi Darurat ke Pemulihan TMT 27/09/2026 s.d. 27/12/2026"},
    {jenis: "karhutla", prov: "72", kab: "Parigi Moutong", baru: true, luas_ha: 1110.25, kondisi: "Lahan masih terbakar di beberapa titik"},
    {jenis: "karhutla", prov: "74", kab: "Kolaka Timur", baru: true, luas_ha: 8.5, kondisi: "Api sudah berhasil dipadamkan"}]},
  bmkg_pagi: {tanggal: T, jam: "06.00", pm: [["PANGKALANBUN", 252.8], ["TALANG BETUTU PALEMBANG", 89.5], ["KOTA JAMBI", 84.2], ["MUSI 2 PALEMBANG", 64.3], ["PESAWARAN", 64], ["BANJARBARU", 58.7], ["KEMAYORAN", 49.6]].map(([stasiun, nilai]) => ({stasiun, nilai})),
    periode: {mulai: "2026-10-31", selesai: T}, hujan: ["11", "12", "14", "19"], lebat: ["13"], angin: ["13", "62"]},
  pvmbg_pagi: {tanggal: T, jam: "06.00", level: {awas: 0, siaga: 2, waspada: 23, normal: 43}, gunung: [
    {nama: "Merapi", level: "Siaga", visual: ["Teramati 6 kali guguran lava."], gempa: [{jumlah: 15, jenis: "Guguran", rincian: "amplitudo 2-13 mm"}, {jumlah: 4, jenis: "Vulkanik Dangkal", rincian: "amplitudo 5-69 mm"}], rekom: ["Potensi bahaya sejauh maksimal 7 km.", "Lontaran material radius 3 km dari puncak."]},
    {nama: "Gn. Anak Krakatau", level: "Siaga", visual: ["Tertutup kabut."], gempa: [{jumlah: 1, jenis: "Tremor Menerus", rincian: "amplitudo 10-40 mm"}], rekom: ["Tidak memasuki radius 5 km."]}]},
  satgas: {tanggal_laporan: "2026-11-02", tanggal_kegiatan: "2026-11-01", personel: [{prov: "61", jumlah: 14458}, {prov: "62", jumlah: 16387}, {prov: "15", jumlah: 5984}],
    armada: [{prov: "62", patroli: 3, wb: 8}, {prov: "64", ikn: true, wb: 1}, {prov: "35", wb: 1}, {prov: "93", patroli: 1}],
    omc: [{prov: "62", sortie: 6, nacl: 6800, dryice: 2500, sasaran: ["Katingan", "Kotawaringin Timur", "Kapuas"], hujan: {intensitas: "ringan hingga sedang"}, hujan_lokasi: ["Kotawaringin Barat", "Sukamara"]}, {prov: "15", sortie: 0}],
    pemilik: {BNPB: 20, TNI: 6}},
};
const teks = Object.fromEntries(Object.entries(ISI).map(([k, v]) => { const r = susun(k, v); assert.ok(!r.galat, `${k}: ${r.galat}`); return [k, r.teks]; }));

test("spek: PROV sama dengan src/alun.js, format angka dan kategori", () => {
  assert.deepEqual(PROV, {...PROV_SRC});
  assert.equal(terbilang(26), "dua puluh enam"); assert.equal(terbilang(118), "seratus delapan belas"); assert.equal(terbilang(1620), "seribu enam ratus dua puluh");
  assert.equal(ribu(27193), "27.193"); assert.equal(ribu(8.5), "8,5"); assert.equal(ribu(1110.25), "1.110,25");
  assert.deepEqual([15, 49.6, 58.7, 200, 252.8].map(kategoriPm), ["Baik", "Sedang", "Tidak Sehat", "Sangat Tidak Sehat", "Berbahaya"]);
});

test("pengurai Python generator membaca balik teks form", () => {
  const py = String.raw`
import json, sys, datetime as dt
sys.path.insert(0, sys.argv[1]); import wa_harian as H, wa_operasi as O
t = json.load(sys.stdin); d = lambda o: o.isoformat() if isinstance(o, dt.date) else sorted(o) if isinstance(o, set) else str(o)
print(json.dumps({'k': H.koordalops(t['rekap_koordalops_24']), 'bh': H.bmkg(t['bmkg_pagi']), 'bo': O.bmkg(t['bmkg_pagi']), 'p': H.pvmbg(t['pvmbg_pagi']), 'o': O.operasi(t['satgas'])}, default=d))`;
  const r = JSON.parse(execFileSync("python3", ["-c", py, path.join(AKAR, "data/laporan-bnpb/generator")], {input: JSON.stringify(teks), encoding: "utf8"}));
  const k = r.k;
  assert.equal(k.mulai, "2026-11-02 07.00"); assert.equal(k.sampai, "2026-11-03 07.00"); assert.equal(k.laporan, 26); assert.equal(k.menonjol, 7);
  const kej = Object.fromEntries(k.kejadian.map(x => [x.lokasi, x]));
  assert.deepEqual(Object.keys(kej), ["Aceh Selatan", "Dairi", "Kota Pangkal Pinang", "Badung", "Kota Kupang", "Parigi Moutong", "Kolaka Timur"]);
  assert.deepEqual(kej["Aceh Selatan"].angka, {mengungsi: 1205, rumah: 373});   // KK pengungsi tidak boleh terbaca sebagai KK terdampak
  assert.equal(kej["Aceh Selatan"].status, "belum"); assert.equal(kej["Aceh Selatan"].baru, false); assert.equal(kej["Aceh Selatan"].prov, "11");
  assert.deepEqual(kej.Dairi.angka, {meninggal: 1, rumah: 1}); assert.equal(kej.Dairi.jenis, "cuaca"); assert.equal(kej.Dairi.baru, true);
  assert.equal(kej["Kota Pangkal Pinang"].jenis, "kebakaran_permukiman"); assert.equal(kej["Kota Pangkal Pinang"].prov, "19");   // 11 Nov 2026: jenis sendiri, bukan lagi "lainnya" (= Kebakaran TPA di deck)
  assert.deepEqual(kej.Badung.angka, {hilang: 2}); assert.equal(kej.Badung.jenis, "longsor");
  assert.deepEqual(kej["Kota Kupang"].angka, {meninggal: 156, mengungsi: 27193, rumah: 52735, transisi_sd: "2026-12-27"});
  assert.deepEqual([kej["Parigi Moutong"].angka.ha, kej["Parigi Moutong"].status, kej["Kolaka Timur"].angka.ha, kej["Kolaka Timur"].status], [1110.25, "berjalan", 8.5, "selesai"]);
  assert.equal(kej["Parigi Moutong"].jenis, "karhutla");

  assert.equal(r.bh.jam, "Selasa, 03 November 2026 pukul 06.00 WIB");
  assert.deepEqual(r.bh.pm.map(x => x[1]), [252.8, 89.5, 84.2, 64.3, 64, 58.7, 49.6]);
  assert.deepEqual(r.bh.hujan, ["Aceh", "Sumatera Utara", "Riau", "Kepulauan Bangka Belitung"]); assert.deepEqual(r.bh.angin, ["Sumatera Barat", "Kalimantan Tengah"]);
  assert.deepEqual(r.bo.hujan, ["11", "12", "14", "19"]); assert.deepEqual(r.bo.lebat, ["13"]); assert.deepEqual(r.bo.angin, ["13", "62"]);
  assert.equal(r.bo.periode, "31 Okt–3 Nov"); assert.equal(r.bo.pm["18"][0], 64); assert.equal(r.bo.pm["62"][1], "berbahaya");

  assert.deepEqual(r.p.level, {Awas: 0, Siaga: 2, Waspada: 23, Normal: 43});
  const [m, a] = r.p.gunung;
  assert.deepEqual([m.nama, m.level, m.urai, m.radius, m.sektor, m.visual, m.rekom.length], ["Gn. Merapi", "Siaga", [[15, "guguran"], [4, "vulkanik dangkal"]], 3, 7, ["Teramati 6 kali guguran lava."], 2]);
  assert.deepEqual([a.nama, a.urai, a.radius], ["Gn. Anak Krakatau", [[1, "tremor menerus"]], 5]);

  const o = r.o;
  assert.equal(o.tanggal, "2026-11-01"); assert.equal(o.tanggal_laporan, "2026-11-02");
  assert.deepEqual(o.personel, {"Kalimantan Barat": 14458, "Kalimantan Tengah": 16387, Jambi: 5984});
  assert.deepEqual(o.armada, {"Kalimantan Tengah": [3, 8], "Papua Selatan": [1, 0], "Kalimantan Timur/IKN": [0, 1], "Jawa Timur": [0, 1]});
  const kt = o.omc["Kalimantan Tengah"];
  assert.deepEqual([kt.sortie, kt.nacl, kt.dryice, kt.sasaran, kt.hujan.intensitas, kt.hujan.lokasi], [6, 6800, 2500, "Katingan, Kotawaringin Timur, Kapuas", "ringan hingga sedang", "Kotawaringin Barat dan Sukamara"]);
  assert.deepEqual([o.omc.Jambi.sortie, o.omc.Jambi.hujan], [0, null]);
  assert.deepEqual(o.pemilik, {BNPB: 20, TNI: 6});
});

test("BMKG tanpa hujan, lebat, dan angin tetap terbaca (baris tidak ditulis)", () => {
  const r = susun("bmkg_pagi", {...ISI.bmkg_pagi, hujan: [], lebat: [], angin: [], periode: {mulai: "2026-11-02", selesai: "2026-11-05"}});
  const py = "import sys, json; sys.path.insert(0, sys.argv[1]); import wa_operasi as O, wa_harian as H; b = O.bmkg(sys.stdin.read()); print(json.dumps([sorted(b['hujan']), sorted(b['lebat']), sorted(b['angin']), b['periode']]))";
  assert.deepEqual(JSON.parse(execFileSync("python3", ["-c", py, path.join(AKAR, "data/laporan-bnpb/generator")], {input: r.teks, encoding: "utf8"})), [[], [], [], "2–5 Nov"]);
});

test("validasi menolak isian yang merusak pengurai", () => {
  const g = (k, ubah) => susun(k, ubah(structuredClone(ISI[k]))).galat;
  assert.match(susun("lain", {}).galat, /kunci/);
  assert.match(g("bmkg_pagi", o => (o.pm = o.pm.slice(0, 4), o)), /5-15/);
  assert.match(g("bmkg_pagi", o => (o.pm[0].stasiun = "1 PANGKALANBUN", o)), /stasiun/);
  assert.match(g("bmkg_pagi", o => (o.jam = "19.00", o)), /jam/);
  assert.match(g("bmkg_pagi", o => (o.hujan = ["11", "11"], o)), /dobel/);
  assert.match(g("pvmbg_pagi", o => (o.level.siaga = 3, o)), /Siaga/);
  assert.match(g("pvmbg_pagi", o => (o.gunung[0].gempa[0].rincian = "", o)), /rincian/);
  assert.match(g("rekap_koordalops_24", o => (o.laporan = 3, o)), /lebih kecil/);
  assert.match(g("rekap_koordalops_24", o => (o.kejadian[0].jenis = "meteor", o)), /jenis/);
  assert.match(g("rekap_koordalops_24", o => (o.kejadian[0].md = -1, o)), /md/);
  assert.match(g("satgas", o => (o.omc[0].sasaran = [], o)), /sasaran/);
  assert.match(g("satgas", o => (o.tanggal_kegiatan = "2026-10-20", o)), /kegiatan/);
  assert.match(g("rekap_koordalops_24", o => (o.kejadian[0].kondisi = "hubungi 0812-3456-7890", o)), /nomor HP/);
  assert.match(g("rekap_koordalops_24", o => (o.kejadian[0].kondisi = "korban NIK 3374012345678901", o)), /NIK/);
  assert.ok(!g("pvmbg_pagi", o => (o.gunung[0].rekom[0] = "Pos Pengamatan (0254) 651449 di Pasauran.", o)));   // nomor kantor tetap boleh
  /* markah WA dan baris baru di teks bebas dibuang, bukan memecah pengurai */
  const r = susun("rekap_koordalops_24", {...ISI.rekap_koordalops_24, kejadian: [{jenis: "banjir", prov: "11", kab: "Aceh Barat", kondisi: "*A. Prov. Riau*\n2. sisa"}]});
  assert.ok(!r.galat); assert.match(r.teks, /Kondisi Mutakhir: A\. Prov\. Riau 2\. sisa\n/);
});

test("dariLogbook: entri terakhir per kejadian, SK provinsi didahulukan, dummy dibuang", () => {
  const e = (id, waktu, o) => ({kejadian_id: id, waktu, jenis: "banjir", prov: "11", kab: "Aceh Barat", kejadian_mulai: "2026-10-30", ...o});
  const d = dariLogbook([e("a", 1, {md: 1, catatan: "lama"}), e("a", 2, {md: 3, catatan: "baru"}), e("b", 1, {prov: "33", kab: "Kota Semarang", jenis: "longsor", kejadian_mulai: "2026-11-02T09:00", kib: "3374LS20261102"}),
    e("c", 1, {dummy: true})], [{kejadian_id: "a", tingkat: "tanggap", wilayah: "kab", tmt_mulai: "2026-10-30", tmt_selesai: "2026-11-05"},
    {kejadian_id: "a", tingkat: "siaga", wilayah: "prov", tmt_mulai: "2026-10-01", tmt_selesai: null, perpanjangan_ke: 1}], T);
  assert.equal(d.laporan, 2);
  assert.deepEqual(d.kejadian.map(x => [x.prov, x.md, x.kondisi, x.baru, x.status_darurat, x.detail]), [
    ["11", 3, "baru", false, "Perpanjangan Siaga Darurat Provinsi TMT 01/10/2026", "Logbook Pusdalops"],
    ["33", null, "", true, "", "Logbook Pusdalops, KIB 3374LS20261102"]]);
  assert.ok(!susun("rekap_koordalops_24", d).galat);
});

/* ---------------- Worker + D1 ---------------- */
const sha = s => createHash("sha256").update(s).digest("hex");
const TOK = "e".repeat(64), TOK_LUAR = "f".repeat(64), TOK_DUMMY = "a".repeat(64), TOK_WIL = "b".repeat(64), MESIN = "kunci-mesin-uji";
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-wa-form"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: sha("rahasia-admin").slice(0, 12), WA_MESIN: MESIN},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  for (const [id, un, tok, peran, wil, dm] of [["f1f1f1f1f1f1f1f1", "pusdalopsf", TOK, '["pusdalops"]', "[]", 0], ["f2f2f2f2f2f2f2f2", "kampusf", TOK_LUAR, '["kemitraan"]', "[]", 0],
    ["f3f3f3f3f3f3f3f3", "dummyf", TOK_DUMMY, '["pusdalops"]', "[]", 1], ["f4f4f4f4f4f4f4f4", "kalbarf", TOK_WIL, '["koordalops"]', '["61"]', 0]])
    await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, ?, 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', ?)`).bind(id, un, "Nama " + un, "2000" + id.slice(1, 2) + "000", un + "@b.id", "6281200000" + id.slice(1, 2), peran, wil, dm),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(tok), id, Date.now() + 3600e3)]);
});
after(() => mf?.dispose());

const HOST = "http://wa-form.lokal", orig = {origin: HOST};
const STAF = {cookie: "sesi_staf=" + TOK, "x-pb": "1", ...orig}, LUAR = {cookie: "sesi_staf=" + TOK_LUAR, "x-pb": "1", ...orig};
const call = async (m, j, h, b) => { const r = await mf.dispatchFetch(HOST + j, {method: m, headers: {"content-type": "application/json", ...h}, body: b === undefined ? undefined : JSON.stringify(b)}); return {status: r.status, j: await r.json()}; };
const hariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);

uji("rute: staf saja, isian salah 400, isian sah masuk wa_masuk dan dipilih bot", async () => {
  const tgl = hariIni(), isi = {...ISI.bmkg_pagi, tanggal: tgl};
  assert.equal((await call("POST", "/api/wa/form", orig, {kunci: "bmkg_pagi", isi})).status, 403);
  assert.equal((await call("POST", "/api/wa/form", LUAR, {kunci: "bmkg_pagi", isi})).status, 403);
  assert.equal((await call("GET", "/api/wa/form/terakhir?kunci=bmkg_pagi", LUAR)).status, 403);
  /* produk nasional: akun dummy dan staf berwilayah ditolak walau perannya benar */
  for (const tok of [TOK_DUMMY, TOK_WIL]) assert.equal((await call("POST", "/api/wa/form", {...STAF, cookie: "sesi_staf=" + tok}, {kunci: "bmkg_pagi", isi})).status, 403);
  const frasa = await call("POST", "/api/wa/form", STAF, {kunci: "rekap_koordalops_24", isi: {...ISI.rekap_koordalops_24, sampai: tgl, kejadian: [{jenis: "banjir", prov: "11", kab: "Aceh Barat", kondisi: "lihat laporan karhutla kemarin"}]}});
  assert.equal(frasa.status, 400); assert.match(frasa.j.galat, /frasa/);
  const salah = await call("POST", "/api/wa/form", STAF, {kunci: "bmkg_pagi", isi: {...isi, pm: []}});
  assert.equal(salah.status, 400); assert.match(salah.j.galat, /PM2\.5/);
  assert.equal((await call("POST", "/api/wa/form", STAF, {kunci: "bmkg_pagi", isi: {...isi, tanggal: "2026-01-01"}})).status, 400);   // di luar 14 hari

  const ok = await call("POST", "/api/wa/form", STAF, {kunci: "bmkg_pagi", isi});
  assert.equal(ok.status, 200, JSON.stringify(ok.j)); assert.equal(ok.j.tanggal, tgl);
  const baris = await DB.prepare("SELECT dari, nama, tanggal, jenis, teks FROM wa_masuk WHERE id = ?").bind(ok.j.id).first();
  assert.deepEqual([baris.dari, baris.nama, baris.tanggal], ["form", "staf:f1f1f1f1f1f1f1f1", tgl]); assert.equal(baris.teks, ok.j.teks);

  const t = await call("GET", "/api/wa/form/terakhir?kunci=bmkg_pagi", STAF);
  assert.equal(t.status, 200); assert.equal(t.j.oleh, undefined); assert.deepEqual(t.j.isi.hujan, isi.hujan);
  const ulang = await call("POST", "/api/wa/form", STAF, {kunci: "bmkg_pagi", isi});   // klik dua kali: baris lama, bukan baris baru
  assert.deepEqual([ulang.status, ulang.j.id, ulang.j.ulang], [200, ok.j.id, true]);
  assert.equal((await call("GET", "/api/wa/form", STAF)).status, 405);
  assert.equal((await call("POST", "/api/wa/form", {...STAF, origin: "https://jahat.contoh"}, {kunci: "bmkg_pagi", isi})).status, 403);
  assert.equal((await call("GET", "/api/wa/form/terakhir?kunci=x", STAF)).status, 400);

  /* kotak masuk mengenali jenis + tanggal isinya, dan bot memilihnya untuk laporan harian */
  const m = await call("GET", `/api/wa/masuk?tanggal=${tgl}`, {authorization: "Bearer " + MESIN});
  assert.deepEqual(m.j.pesan.map(x => [x.kunci, x.tanggal_isi]), [["bmkg_pagi", tgl]]);
  const kop = await call("POST", "/api/wa/form", STAF, {kunci: "rekap_koordalops_24", isi: {...ISI.rekap_koordalops_24, sampai: tgl}});
  assert.equal(kop.status, 200, JSON.stringify(kop.j));
  const b = await ambilBahan({env: {WORKER_URL: HOST, WA_MESIN: MESIN}, dep: {fetch: (u, o) => mf.dispatchFetch(u, o)}, tanggal: tgl});
  const {terpilih, teks: tk} = await b.pilihSesuai({butuh: ["rekap_koordalops_24", "bmkg_pagi"]});
  assert.deepEqual(Object.keys(terpilih).sort(), ["bmkg_pagi", "rekap_koordalops_24"]);
  assert.equal(tk.bmkg_pagi, ok.j.teks); assert.equal(tk.rekap_koordalops_24, kop.j.teks);
});
