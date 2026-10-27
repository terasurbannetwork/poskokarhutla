/* SP-092: uji fungsi pemeliharaan murni public/pipa/pelihara.js (RU §2.3 Pemeliharaan P1-P6, DT §5.10, PRD §6.10).
   Tanpa DB. Yang salah DITOLAK: awalan BOM tanpa kelas, enum skor beda dari CHECK 0056, laju keluar rentang, sumur zona kritis tanpa rekomendasi. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {KELAS, KELAS_BOM, KELAS_ASET, KRITIS, STOK_LAJU, kelasDari, skorKeKondisi, jadwal, laikGelar, stokMin, biayaTahun, cekAset, keCsv} from "../../public/pipa/pelihara.js";

const AKAR = new URL("../../", import.meta.url).pathname;
const HARI = 864e5, KINI = Date.UTC(2026, 9, 26, 3, 0, 0);
const lalu = h => KINI - h * HARI;

/* P1: awalan TEMPLAT_BOM dibaca dari teks src/sippa.js (B("KODE-101", ...)); tidak diekspor, jadi dipindai */
const awalanBom = () => [...new Set([...readFileSync(join(AKAR, "src/sippa.js"), "utf8").matchAll(/\bB\("([A-Z]{1,4})-\d+"/g)].map(m => m[1]))].sort();

test("P1 pelihara: tiap awalan TEMPLAT_BOM tepat satu kelas K1-K5", () => {
  const awalan = awalanBom();
  assert.ok(awalan.length >= 15, `pemindaian hanya menemukan ${awalan.length} awalan BOM di src/sippa.js`);
  const tanpa = awalan.filter(a => kelasDari(`${a}-101`) === null);
  assert.deepEqual(tanpa, [], `${tanpa.length} awalan BOM tanpa kelas: ${tanpa.join(", ")}`);
  for (const a of awalan) assert.match(kelasDari(`${a}-101`), /^K[1-5]$/, `awalan ${a}`);
});

test("P1 pelihara: kelasDari mencocokkan awalan utuh, GWT bukan G, ST dan SF bukan S, PB bukan P; yang liar null", () => {
  assert.equal(kelasDari("GWT-101"), "K4");
  assert.equal(kelasDari("G-101"), "K3");
  assert.equal(kelasDari("ST-101"), "K2");
  assert.equal(kelasDari("SF-101"), "K3");
  assert.equal(kelasDari("S-104"), "K5");
  assert.equal(kelasDari("PB-101"), "K1");
  assert.equal(kelasDari("ZZ-1"), null);
  assert.equal(kelasDari("tanpa-strip-angka"), null);
  assert.equal(kelasDari(null), null);
  assert.equal(kelasDari(""), null);
});

test("P1 pelihara: awalan baru tanpa kelas membuat uji merah dengan nama awalannya (penolakan)", () => {
  const tanpa = [...awalanBom(), "XYZ"].filter(a => kelasDari(`${a}-101`) === null);
  assert.deepEqual(tanpa, ["XYZ"]);
});

test("P1 pelihara: KELAS K1 sampai K10 tanpa K6 (koridor dicabut, keputusan 60), KELAS_BOM menunjuk kelas yang ada, KELAS_ASET menunjuk K7-K10, KRITIS K1-K3", () => {
  assert.deepEqual(Object.keys(KELAS), ["K1", "K2", "K3", "K4", "K5", "K7", "K8", "K9", "K10"]);
  for (const [a, k] of Object.entries(KELAS_BOM)) assert.ok(KELAS[k], `awalan ${a} menunjuk kelas ${k} yang tidak ada`);
  assert.deepEqual(Object.values(KELAS_ASET).sort(), ["K10", "K7", "K7", "K8", "K8", "K9"]);
  assert.deepEqual(KRITIS, ["K1", "K2", "K3"]);
  for (const [k, v] of Object.entries(KELAS)) {
    assert.ok(v.nama && v.pemelihara_t1 && v.pemelihara_t2, `${k} tanpa nama atau pemelihara`);
    assert.ok(Number.isFinite(v.laju_biaya) && v.laju_biaya >= 0 && v.laju_biaya < 1, `${k} laju ${v.laju_biaya}`);
  }
  assert.equal(KELAS.K8.laju_biaya, 0); assert.equal(KELAS.K10.laju_biaya, 0);   // bukan beban BNPB (PRD §6.10.7)
});

test("P1 pelihara: konstanta dikunci ke tabel tulis tangan DT §5.10 dan PRD §6.10 (mutasi angka harus merah)", () => {
  assert.deepEqual(KELAS_ASET, {sumur_bor: "K7", pompa_sumur: "K7", pipa_sementara: "K8", tandon_hidran: "K8", jembatan_darurat: "K9", jembatan_permanen: "K10"});
  const hari = {K1: {berkala: 30, servis: 180, tahunan: 365}, K2: {uji_tekanan: 365}, K3: {pra_musim: 180, tahunan: 365}, K4: {pra_musim: 180, tahunan: 365}, K5: {berkala: 180, tahunan: 365},
    K7: {berkala: 180, mutu_air: 180}, K8: {berkala: 7}, K9: {berkala: 30, tahunan: 365}, K10: {tahunan: 365}};
  const jam = {K1: {servis: 50, overhaul: 500}, K7: {servis: 250}}, laju = {K1: 0.08, K2: 0.06, K3: 0.05, K4: 0.08, K5: 0.10, K7: 0.03, K8: 0, K9: 0.02, K10: 0};
  const tiap = {K1: true, K2: true, K3: true, K4: true, K5: false, K7: false, K8: true, K9: true, K10: false};
  for (const k of Object.keys(hari)) {
    assert.deepEqual(KELAS[k].interval.hari, hari[k], `hari ${k}`);
    assert.deepEqual(KELAS[k].interval.jam, jam[k] ?? {}, `jam ${k}`);
    assert.equal(KELAS[k].laju_biaya, laju[k], `laju ${k}`);
    assert.equal(KELAS[k].interval.tiap_pakai, tiap[k], `tiap_pakai ${k}`);
  }
  assert.deepEqual(STOK_LAJU, {C: 0.1, SF: 2, P: 2, IMP: 0.25, I: 0.25, H: 0.1, T: 1, Q: 2});
});

/* P2 */
test("P2 jadwal: inspeksi 0, 166, 180, 200 hari lalu pada interval 180 hari memberi aman, segera, terlambat, terlambat; tanpa inspeksi belum_pernah", () => {
  const butir = {kelas: "K5"};   // K5: gas monitor dan tangki, interval 180 hari
  const st = h => jadwal(butir, lalu(h), null, KINI).status;
  assert.equal(st(0), "aman");
  assert.equal(st(165), "aman");
  assert.equal(st(166), "segera");     // tepat 14 hari sebelum jatuh tempo = segera
  assert.equal(st(180), "terlambat");  // tepat jatuh tempo = terlambat
  assert.equal(st(200), "terlambat");
  assert.equal(jadwal(butir, null, null, KINI).status, "belum_pernah");
  assert.equal(jadwal(butir, undefined, 10, KINI).jatuh_tempo, null);
  assert.equal(jadwal(butir, lalu(166), null, KINI).jatuh_tempo, lalu(166) + 180 * HARI);
  assert.ok(jadwal(butir, lalu(200), null, KINI).alasan.length > 5);
});

/* P3 */
test("P3 jadwal: pompa 49,9 jam aman dan 50,0 jam terlambat; batas jam menang atas batas hari", () => {
  const butir = {kelas: "K1"};
  const a = jadwal(butir, lalu(10), 49.9, KINI), b = jadwal(butir, lalu(10), 50, KINI);
  assert.equal(a.status, "aman");
  assert.equal(b.status, "terlambat");
  assert.match(b.alasan, /jam/);
  assert.ok(b.jatuh_tempo <= KINI, "jatuh tempo karena jam harus sudah lewat");
  assert.equal(jadwal(butir, lalu(10), null, KINI).status, "aman");
});

test("P3 jadwal: masukan mustahil ditolak (kelas liar, kini bukan angka)", () => {
  assert.throws(() => jadwal({kelas: "K99"}, lalu(1), null, KINI), /kelas/);
  assert.throws(() => jadwal({kelas: "K1"}, lalu(1), null, "besok"), /kini/);
  assert.throws(() => jadwal({kelas: "K1"}, lalu(1), -1, KINI), /jam/);
  assert.throws(() => jadwal({kelas: "K2", jenis: "servis"}, lalu(999), null, KINI), /jenis servis tidak ada di kelas K2/);
  assert.equal(jadwal({kelas: "K1", jenis: "servis"}, lalu(10), null, KINI).status, "aman");
  assert.throws(() => jadwal({kelas: "K1", jenis: "overhaul_palsu"}, null, null, KINI), /jenis/);   // divalidasi juga saat belum pernah diinspeksi
});

test("P3 jadwal: jenis overhaul memakai batas jam 500 (K1): 499 aman, 500 terlambat; jenis hanya di hari tanpa batas jam", () => {
  const o = {kelas: "K1", jenis: "overhaul"};
  assert.equal(jadwal(o, lalu(10), 499, KINI).status, "aman");
  const t = jadwal(o, lalu(10), 500, KINI);
  assert.equal(t.status, "terlambat"); assert.match(t.alasan, /500 jam/);
  assert.equal(jadwal(o, lalu(10), 60, KINI).status, "aman");   // 60 jam melewati batas servis 50 tetapi bukan overhaul
  assert.equal(jadwal({kelas: "K1", jenis: "tahunan"}, lalu(10), 900, KINI).status, "aman");   // tahunan hanya di hari
  assert.equal(jadwal({kelas: "K1", jenis: "tahunan"}, lalu(365), 0, KINI).status, "terlambat");
});

test("P3 jadwal: tanpa inspeksi tercatat, jam >= batas terlambat dan menggugurkan laikGelar; di bawah batas belum_pernah", () => {
  const t = jadwal({kelas: "K1"}, null, 900, KINI);
  assert.equal(t.status, "terlambat");
  assert.equal(laikGelar([], [t]).laik, false);
  assert.equal(jadwal({kelas: "K1"}, null, 50, KINI).status, "terlambat");
  assert.equal(jadwal({kelas: "K1"}, null, 49.9, KINI).status, "belum_pernah");
  assert.equal(jadwal({kelas: "K1"}, null, null, KINI).status, "belum_pernah");
  assert.equal(jadwal({kelas: "K5"}, null, 900, KINI).status, "belum_pernah");   // K5 tanpa batas jam
});

/* P4 */
test("P4 skorKeKondisi: skor 0-3 sama persis dengan enum CHECK sippa_komponen.kondisi di migrasi 0056", () => {
  const sql = readFileSync(join(AKAR, "migrations/0056_sippa_inti.sql"), "utf8");
  const m = /kondisi TEXT NOT NULL DEFAULT 'baik' CHECK \(kondisi IN \(([^)]*)\)\)/.exec(sql);
  assert.ok(m, "CHECK kondisi tidak ditemukan di 0056");
  const enumSql = [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]);
  assert.deepEqual([0, 1, 2, 3].map(skorKeKondisi), enumSql, `enum 0056 ${enumSql.join(",")} beda dari pemetaan skor`);
  for (const salah of [-1, 4, 1.5, "1", null, NaN]) assert.throws(() => skorKeKondisi(salah), /skor/, `skor ${salah} lolos`);
});

test("P4 laikGelar: komponen kritis rusak_berat atau butir K1 terlambat membuat kit tidak laik gelar; K4 rusak berat tetap laik", () => {
  const baik = [{kode_bom: "P-101", kondisi: "baik"}, {kode_bom: "H-101", kondisi: "rusak_ringan"}];
  assert.deepEqual(laikGelar(baik, [{kelas: "K1", status: "segera"}]), {laik: true, alasan: []});
  const k1 = laikGelar([{kode_bom: "P-101", kondisi: "rusak_berat"}], []);
  assert.equal(k1.laik, false); assert.match(k1.alasan[0], /P-101/);
  assert.equal(laikGelar([{kode_bom: "H-101", kondisi: "rusak_berat"}], []).laik, false);
  assert.equal(laikGelar([{kode_bom: "FT-101", kondisi: "rusak_berat"}], []).laik, true);   // K4 bukan kritis
  assert.equal(laikGelar([], [jadwal({kelas: "K1"}, lalu(999), null, KINI)]).laik, false);   // keluaran jadwal() sungguhan
  assert.equal(laikGelar([], [jadwal({kode_bom: "P-101"}, lalu(999), null, KINI)]).laik, false);
  const tlt = laikGelar(baik, [{kelas: "K1", status: "terlambat"}]);
  assert.equal(tlt.laik, false); assert.match(tlt.alasan[0], /terlambat/);
  assert.equal(laikGelar(baik, [{kelas: "K5", status: "terlambat"}]).laik, true);   // hanya K1 yang menggugurkan
  assert.equal(laikGelar([{kode_bom: "P-101", kondisi: "hilang"}], []).laik, false);
  assert.deepEqual(laikGelar([], []), {laik: true, alasan: []});
});

/* P5 */
test("P5 cekAset: sumur zona kritis tanpa rekomendasi_bg ditolak menyebut medannya; dengan rekomendasi dan zona aman lolos", () => {
  const g = cekAset("sumur_bor", {zona_konservasi: "kritis"});
  assert.equal(g.length, 1); assert.equal(g[0].medan, "rekomendasi_bg"); assert.match(g[0].pesan, /Badan Geologi/);
  assert.equal(cekAset("sumur_bor", {zona_konservasi: "rusak"})[0]?.medan, "rekomendasi_bg");
  assert.equal(cekAset("sumur_bor", {zona_konservasi: "kritis", rekomendasi_bg: ""})[0]?.medan, "rekomendasi_bg");
  assert.deepEqual(cekAset("sumur_bor", {zona_konservasi: "kritis", rekomendasi_bg: "BG-2026/114"}), []);
  assert.deepEqual(cekAset("sumur_bor", {zona_konservasi: "aman"}), []);
});

test("P5 cekAset: angka di luar rentang dan medan wajib atau liar ditolak per medan", () => {
  const medan = (k, a) => cekAset(k, a).map(x => x.medan);
  assert.deepEqual(medan("sumur_bor", {kedalaman_m: 501}), ["kedalaman_m"]);
  assert.deepEqual(medan("sumur_bor", {kedalaman_m: 500, debit_lps: 200}), []);
  assert.deepEqual(medan("sumur_bor", {kedalaman_m: -1}), ["kedalaman_m"]);
  assert.deepEqual(medan("sumur_bor", {debit_lps: 200.1}), ["debit_lps"]);
  assert.deepEqual(medan("sumur_bor", {kedalaman_m: "dalam"}), ["kedalaman_m"]);
  assert.deepEqual(medan("jembatan_darurat", {jenis: "bailey", bentang_m: 300}), []);
  assert.deepEqual(medan("jembatan_darurat", {jenis: "bailey", bentang_m: 300.5}), ["bentang_m"]);
  assert.deepEqual(medan("jembatan_darurat", {jenis: "gantung", bentang_m: 30}), ["jenis"]);
  assert.deepEqual(medan("jembatan_darurat", {jenis: "bailey"}), ["bentang_m"]);
  assert.deepEqual(medan("pompa_sumur", {}), ["kw"]);
  assert.deepEqual(medan("sumur_bor", {zona_konservasi: "aman", warna: "biru"}), ["warna"]);
  assert.deepEqual(medan("tidak_ada", {}), ["kelas"]);
  assert.deepEqual(medan("sumur_bor", null), ["atribut"]);
  assert.deepEqual(medan("sumur_bor", []), ["atribut"]);
});

/* P6 */
const H = (kode_bom, jumlah, harga) => ({kode_bom, jumlah, harga});
/* baris bertarif PRD §6.1 (rupiah; jumlah dan harga satuan dari tabel; baris tanpa angka dilewati). stub; ganti ke harga.csv saat SP-062 selesai */
const BARIS = [H("P-101", 2, 190.78e6), H("H-101", 1000, 275e3), H("H-201", 500, 165e3), H("I-101", 8, 4.2e6), H("M-101", 2, 25e6), H("C-101", 20, 2.4e6),
  H("ST-101", 2, 28e6), H("SF-101", 2, 19e6), H("V-101", 2, 13.5e6), H("FT-101", 2, 18e6), H("PT-101", 4, 8.5e6), H("T-101", 8, 12e6), H("U-102", 1, 25e6), H("Q-101", 1, 140e6)];
const item = BARIS.map(({kode_bom, jumlah}) => ({kode_bom, jumlah}));
const harga = Object.fromEntries(BARIS.map(b => [b.kode_bom, b.harga]));
const dalamRentang = r => { if (r < 0.05 || r > 0.08) throw new Error(`laju tertimbang ${(r * 100).toLocaleString("id-ID", {maximumFractionDigits: 2})}% di luar 5-8% CAPEX kit`); };

test("P6 biayaTahun: laju tertimbang kit gambut dalam 5-8% dan sama dengan hitung tangan; berlabel estimasi-model", () => {
  const k1 = 2 * 190.78e6, k2 = 275e3 * 1000 + 165e3 * 500 + 2 * 28e6, k3 = 8 * 4.2e6 + 2 * 25e6 + 20 * 2.4e6 + 2 * 19e6 + 2 * 13.5e6, k4 = 2 * 18e6 + 4 * 8.5e6 + 8 * 12e6 + 25e6, k5 = 140e6;
  const total = k1 + k2 + k3 + k4 + k5, biaya = k1 * 0.08 + k2 * 0.06 + k3 * 0.05 + k4 * 0.08 + k5 * 0.10;
  const r = biayaTahun(item, harga, {});
  assert.equal(r.keyakinan, "estimasi-model");
  assert.ok(Math.abs(r.total - biaya) < 1, `total ${r.total} bukan ${biaya}`);
  assert.ok(Math.abs(r.nilai - total) < 1);
  assert.ok(Math.abs(r.rata_tertimbang - biaya / total) < 1e-9);
  assert.doesNotThrow(() => dalamRentang(r.rata_tertimbang), `rata-rata tertimbang ${r.rata_tertimbang}`);
  assert.ok(Math.abs(r.per_kelas.K2.biaya - k2 * 0.06) < 1);
  assert.deepEqual(r.tanpa_harga, []);
});

test("P6 biayaTahun: laju K2 diubah ke 10% membuat uji rentang gagal dengan angka tertimbangnya", () => {
  const r = biayaTahun(item, harga, {laju: {K2: 0.10}});
  assert.ok(r.rata_tertimbang > 0.08, `rata-rata tertimbang ${r.rata_tertimbang} seharusnya melewati 8%`);
  assert.throws(() => dalamRentang(r.rata_tertimbang), /8,3\d?% di luar 5-8%/);
});

test("P6 biayaTahun: jam pompa dan sampel lab menambah total; baris tanpa harga dilaporkan, masukan negatif ditolak", () => {
  const dasar = biayaTahun(item, harga, {}).total;
  const r = biayaTahun([...item, {kode_bom: "H-301", jumlah: 4}], harga, {jam_pompa: 100, c_jam: 50000, n_lab: 3, c_lab: 400000});
  assert.ok(Math.abs(r.total - (dasar + 100 * 50000 + 3 * 400000)) < 1);
  assert.deepEqual(r.tanpa_harga, ["H-301"]);
  assert.throws(() => biayaTahun(item, harga, {jam_pompa: -1, c_jam: 1}), /jam_pompa/);
  assert.throws(() => biayaTahun([{kode_bom: "ZZ-1", jumlah: 1}], {"ZZ-1": 5}, {}), /kelas/);
  assert.throws(() => biayaTahun([{kode_bom: "P-101", jumlah: -2}], harga, {}), /jumlah/);
  for (const salah of ["x", -1, 1.5, NaN]) assert.throws(() => biayaTahun([{kode_bom: "P-101", jumlah: 1}], harga, {laju: {K1: salah}}), /laju K1/, `laju ${salah} lolos`);
  assert.throws(() => biayaTahun([{kelas: "K9", jumlah: -1}], {}, {}), /jumlah K9/);
});

test("P6 stokMin: gasket kopling 20 unit pada waktu tunggu 60 hari = 3 (hitung tangan 0,1 x 20 x 4/3 = 2,67)", () => {
  assert.equal(stokMin("C-101", 20, 60), 3);
  assert.equal(stokMin("C-101", 30, 60), 4);          // 0,1 x 30 x 4/3 = 4 tepat; jatuh tepat di bilangan bulat, tidak boleh naik
  assert.equal(stokMin("C-101", 20), 3);              // waktu tunggu bawaan 60 hari
  assert.equal(stokMin("I-101", 200, 18), 55);        // 0,25 x 200 x 1,1 = 55 tepat; mentah 55,00000000000001 jadi 56 tanpa pembulatan 9 desimal
  assert.equal(stokMin("IMP-101", 4, 60), 2);         // impeller 1 per 4 pompa: 0,25 x 4 x 4/3 = 1,33
  assert.equal(stokMin("C-101", 20, 0), 2);
  assert.equal(stokMin("C-101", 0, 60), 0);
  assert.equal(stokMin("P-101", 2, 60), 6);           // 2 servis per pompa: 2 x 2 x 4/3 = 5,33
  assert.throws(() => stokMin("ZZ-1", 5, 60), /laju/);
  assert.throws(() => stokMin("C-101", -1, 60), /satuan/);
  assert.ok(Object.keys(STOK_LAJU).length >= 5);
});

test("keCsv: satu baris per kelas K1-K10 tanpa em dash, deterministik, dan berkas CSV buku sama dengan keluaran modul", () => {
  const csv = keCsv();
  const baris = csv.trimEnd().split("\n");
  assert.equal(baris.length, 10, `${baris.length} baris, harus kepala + 9 kelas (K6 dicabut)`);
  assert.match(baris[0], /^kelas,nama,/);
  assert.equal(csv, keCsv());
  assert.ok(!/[—·]/.test(csv));
  assert.match(baris[1], /^K1,/);
  const berkas = join(AKAR, "data/kajian-bnpb/data/sippa/pelihara.csv");
  assert.ok(existsSync(berkas), "jalankan: node public/pipa/pelihara.js --csv");
  assert.equal(readFileSync(berkas, "utf8"), csv, "pelihara.csv basi; jalankan node public/pipa/pelihara.js --csv");
});

test("SippaPelihara: globalThis memuat semua fungsi ekspor", () => {
  for (const k of ["kelasDari", "skorKeKondisi", "jadwal", "laikGelar", "stokMin", "biayaTahun", "cekAset", "keCsv"]) assert.equal(typeof globalThis.SippaPelihara[k], "function", k);
});
