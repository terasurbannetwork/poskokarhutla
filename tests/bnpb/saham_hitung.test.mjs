/* Uji fungsi murni /bnpb/saham: format angka Indonesia, pemetaan galat, pengurai deret/tabel/info. node --test tests/bnpb/saham_hitung.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import * as H from "../../public/bnpb/saham_hitung.js";
import {CONTOH} from "../../public/bnpb/saham_contoh.js";

test("angka format Indonesia", () => {
  assert.equal(H.angka(1234567.891), "1.234.567,89");
  assert.equal(H.angka(6475, 0), "6.475");
  assert.equal(H.angka(-12.5), "-12,50");
  assert.equal(H.angka(-0.001, 2), "0,00");
  assert.equal(H.angka(null), "–"); assert.equal(H.angka("abc"), "–");
  assert.equal(H.persen(4.32), "4,32%"); assert.equal(H.persen(undefined), "–");
});
test("petaGalat", () => {
  assert.equal(H.petaGalat({ok: false, kode: "akses_belum_dibuka"}, 403).jenis, "belum");
  assert.match(H.petaGalat({kode: "akses_belum_dibuka"}, 403).pesan, /belum dibuka penyedia \(Stellar Data\)/);
  assert.equal(H.petaGalat({kode: "masukan_salah", pesan: "q kosong"}, 400).pesan, "q kosong");
  assert.equal(H.petaGalat({kode: "penyedia_galat"}, 502).jenis, "salah");
  assert.equal(H.petaGalat({}, 0).jenis, "jaringan");
  assert.equal(H.petaGalat({}, 401).jenis, "salah");
});
test("uraiDeret: tiga bentuk, bersarang, tak dikenal", () => {
  assert.equal(H.uraiDeret([1, 2, 3]).length, 3);
  assert.deepEqual(H.uraiDeret({a: {b: [[1700000000, 5], [1700000100, 6]]}}).map(x => x.v), [5, 6]);
  assert.equal(H.uraiDeret(CONTOH.grafik).length, 30);
  assert.equal(H.uraiDeret({x: "abc", y: [{a: 1}, {a: 2}]}), null);
  assert.equal(H.uraiDeret(null), null);
});
test("titikGaris: dalam kotak, null bila kurang dari 2 titik, datar tidak NaN", () => {
  const p = H.titikGaris(H.uraiDeret(CONTOH.grafik)).split(" ").map(s => s.split(",").map(Number));
  assert.ok(p.every(([x, y]) => x >= 0 && x <= 640 && y >= 0 && y <= 200));
  assert.equal(H.titikGaris([{t: 1, v: 1}]), null);
  assert.ok(!H.titikGaris([{t: 1, v: 5}, {t: 2, v: 5}]).includes("NaN"));
});
test("ringkasInfo dan uraiTabel", () => {
  const r = H.ringkasInfo(CONTOH.info);
  assert.deepEqual(r.sorot.map(s => s.nama), ["Harga terakhir", "Perubahan", "Perubahan (%)", "Volume"]);
  assert.equal(r.sorot[0].nilai, "Rp 6.475"); assert.equal(r.sorot[1].nilai, "+Rp 75,00"); assert.equal(r.sorot[2].nilai, "+1,17%"); assert.equal(r.sorot[3].nilai, "48.210.500 lembar");
  assert.ok(!r.lain.some(x => /change/.test(x.nama)));
  assert.ok(r.lain.some(x => x.nama === "sektor" && x.nilai === "Keuangan"));
  assert.deepEqual(H.ringkasInfo("x"), {sorot: [], lain: []});
  const t = H.uraiTabel({data: CONTOH.transaksi}); assert.equal(t.baris.length, 50); assert.equal(t.kolom.length, 4); assert.ok(t.kolom.includes("harga (Rp)"));
  assert.equal(H.uraiTabel({a: 1}), null);
  assert.equal(H.uraiTabel(Array.from({length: 80}, (_, i) => ({a: i}))).baris.length, 50);
});
test("tglId, labelSkala, rupiah", () => {
  assert.equal(H.tglId("2026-11-19"), "19 Nov 2026"); assert.equal(H.tglId("abc"), "abc"); assert.equal(H.tglId(null), "–");
  assert.equal(H.rupiah(6475), "Rp 6.475"); assert.equal(H.rupiah(null), "–");
  const l = H.labelSkala(H.uraiDeret(CONTOH.grafik)); assert.equal(l.length, 2); assert.match(l[1], /Nov 2026/);
  assert.equal(H.labelSkala([{t: 0, v: 1}, {t: 1, v: 2}]), null);
});

test("bentuk nyata hasil rute (Stockbit dinormalkan Worker, 4 Nov 2026) terurai layar", () => {
  const info = H.ringkasInfo({nama: "Bank Central Asia Tbk.", kode: "BBCA", harga: 4920, perubahan: 80, perubahan_persen: 1.65, volume: 191269500, sebelumnya: 4840, bid_harga: 4910, status_pasar: "open"});
  assert.deepEqual(info.sorot.map(x => x.nama + "=" + x.nilai), ["Harga terakhir=Rp 4.920", "Perubahan=+Rp 80,00", "Perubahan (%)=+1,65%", "Volume=191.269.500 lembar"]);
  assert.ok(info.lain.some(x => x.nama === "tutup sebelumnya (Rp)" && x.nilai === "4.840"));
  assert.ok(!info.lain.some(x => /perubahan/.test(x.nama)), "persen tidak dobel di daftar lain");
  const t = H.uraiTabel({tanggal: "2026-11-04", pasar_buka: true, baris: [{waktu: "14:35:23", sisi: "Beli", harga: 4920, lot: 20, nilai: 9840000, papan: "RG"}]});
  assert.deepEqual(t.kolom, ["waktu", "sisi", "harga (Rp)", "lot", "nilai (Rp)", "papan"]); assert.deepEqual(t.baris[0], ["14:35:23", "Beli", "4.920", "20", "9.840.000", "RG"]);
  const d = H.uraiDeret({dari: "2026-11-03", deret: [{t: "2026-11-03T09:00:00+07:00", harga: 5025}, {t: "2026-11-03T09:01:00+07:00", harga: 5050}]});
  assert.deepEqual(d.map(x => x.v), [5025, 5050]); assert.equal(d[1].t - d[0].t, 60e3);
  assert.deepEqual(H.labelSkala(d), ["09:00 WIB", "09:01 WIB"]);
});

/* ---- analisa konsesi x saham ---- */
import {KONSESI, grafikSintetis} from "../../public/bnpb/saham_contoh.js";
const minggu = (i) => new Date(Date.UTC(2026, 0, 5) + i * 7 * 864e5).toISOString().slice(0, 10);
const deretDari = (hs) => hs.map((h, i) => ({t: `${minggu(i)}T16:00:00+07:00`, harga: h}));

test("hargaMingguan: penutupan terakhir per Senin WIB, urut, masukan buruk", () => {
  const d = [{t: "2026-01-07T09:00:00+07:00", harga: 100}, {t: "2026-01-09T16:00:00+07:00", harga: 110}, {t: "2026-01-12T09:00:00+07:00", harga: 120},
    {t: "2026-01-04T23:30:00+07:00", harga: 90}];   // Minggu WIB -> minggu 29 Des
  assert.deepEqual(H.hargaMingguan(d), [{minggu: "2025-12-29", harga: 90}, {minggu: "2026-01-05", harga: 110}, {minggu: "2026-01-12", harga: 120}]);
  assert.equal(H.seninWib(Date.parse("2026-01-04T17:30:00Z")), "2026-01-05");   // 00:30 WIB Senin
  assert.deepEqual(H.hargaMingguan([]), []); assert.deepEqual(H.hargaMingguan(null), []);
  assert.deepEqual(H.hargaMingguan([{t: "bukan", harga: 1}, {t: "2026-01-05", harga: "x"}]), []);
  assert.equal(H.hargaMingguan(grafikSintetis("AAAA").deret).length >= 50, true);
});
test("spearman: monoton, terbalik, seri, tanpa ragam", () => {
  assert.equal(H.spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.equal(H.spearman([1, 2, 3, 4], [9, 7, 5, 1]), -1);
  assert.equal(H.spearman([1, 1, 1], [1, 2, 3]), null);
  assert.equal(H.spearman([1, 2], [1, 2]), null);
  assert.ok(Math.abs(H.spearman([1, 2, 2, 4], [1, 3, 2, 4]) - 0.9486832980505138) < 1e-9);
});
test("persentil: interpolasi linear", () => { assert.equal(H.persentil([1, 2, 3, 4, 5], 0.8), 4.2); assert.equal(H.persentil([], 0.8), null); });
test("rapatkanTitik: mengisi minggu kosong dengan 0 dan menjumlah minggu ganda", () => {
  const r = H.rapatkanTitik([{minggu: "2026-01-05", titik: 3}, {minggu: "2026-01-19", titik: 2}, {minggu: "2026-01-21", titik: 1}]);
  assert.deepEqual(r.map(x => x.titik), [3, 0, 3]);
});
test("analisa: korelasi dan studi peristiwa dari deret rancangan (n besar)", () => {
  // titik minggu t naik -> return minggu t+1 naik: harga[t+1] = harga[t] * (1 + titik[t]/100)
  const n = 40, titik = Array.from({length: n}, (_, i) => ({minggu: minggu(i), titik: (i * 7) % 23}));
  const hs = [100]; for (let i = 0; i < n; i++) hs.push(hs[i] * (1 + titik[i].titik / 100));
  const hm = H.hargaMingguan(deretDari(hs)), a = H.analisa(titik, hm);
  assert.equal(a.n, n - 2); assert.ok(a.rho > 0.95);   // minggu pertama/terakhir dibuang
  assert.ok(a.peristiwa.n >= 8 && a.peristiwa.h1.selisih > 0 && a.peristiwa.h1.n === a.peristiwa.n);
  assert.match(a.narasi[0], /Korelasi Spearman antara titik minggu ini.*hubungan kuat searah/);
  assert.match(a.narasi.join(" "), /belum diuji signifikansi/);
  assert.equal(a.narasi.at(-1), "Keterkaitan, bukan sebab; titik panas di konsesi bukan bukti pelanggaran.");
  assert.doesNotMatch(a.narasi[0], /\d\.\d{3}|\d,\d{3}\b/);   // maksimal 2 desimal
});
test("analisa: n kecil jujur (tidak menyimpulkan), kalimat wajib tetap ada", () => {
  const titik = Array.from({length: 5}, (_, i) => ({minggu: minggu(i), titik: i + 1}));
  const a = H.analisa(titik, H.hargaMingguan(deretDari([100, 101, 103, 102, 105, 110])));
  assert.equal(a.n, 3);
  assert.match(a.narasi[0], /sampel terlalu kecil untuk disimpulkan/); assert.doesNotMatch(a.narasi[0], /lemah|sedang|kuat/);
  assert.match(a.narasi[1], /sampel terlalu kecil untuk disimpulkan/);
  assert.equal(a.narasi.at(-1), H.KALIMAT_WAJIB);
});
test("analisa: deret harga kosong dan titik kosong tidak melempar", () => {
  const a = H.analisa([{minggu: minggu(0), titik: 4}, {minggu: minggu(1), titik: 0}], []);
  assert.equal(a.punyaHarga, false); assert.equal(a.rho, null); assert.match(a.narasi[0], /Harga saham belum tersedia/); assert.equal(a.narasi.at(-1), H.KALIMAT_WAJIB);
  const b = H.analisa([], H.hargaMingguan(deretDari([1, 2, 3])));
  assert.equal(b.n, 0); assert.equal(b.peristiwa.n, 0); assert.equal(b.narasi.at(-1), H.KALIMAT_WAJIB);
  assert.doesNotThrow(() => H.analisa(undefined, undefined));
});
test("analisa: harga tanpa titik (semua nol) tidak mengarang lonjakan", () => {
  const titik = Array.from({length: 12}, (_, i) => ({minggu: minggu(i), titik: 0}));
  const a = H.analisa(titik, H.hargaMingguan(deretDari(Array.from({length: 13}, (_, i) => 100 + i))));
  assert.equal(a.rho, null); assert.equal(a.peristiwa.n, 0); assert.equal(a.narasi.at(-1), H.KALIMAT_WAJIB);
});
test("gabungMingguan, hargaInfo, adaDiIdx", () => {
  const g = H.gabungMingguan([{minggu: minggu(0), titik: 2}, {minggu: minggu(2), titik: 1}], [{minggu: minggu(1), harga: 50}]);
  assert.deepEqual(g.map(x => x.harga), [null, 50, null]);
  assert.deepEqual(H.hargaInfo({harga: 6475, perubahan_persen: -1.2}), {harga: 6475, persen: -1.2});
  assert.deepEqual(H.hargaInfo(null), {harga: null, persen: null});
  assert.equal(H.persenTanda(1.25), "+1,3%"); assert.equal(H.persenTanda(null), "–");
  assert.equal(H.adaDiIdx("IDX"), true); assert.equal(H.adaDiIdx("SGX"), false);
});
test("contoh konsesi: semua bagian terisi, satu emiten n kecil, satu di luar IDX", () => {
  assert.equal(KONSESI.emiten.length, 5); assert.ok(KONSESI.grup_tanpa_emiten.length >= 1);
  assert.ok(KONSESI.emiten.some(e => e.mingguan.length < 8) && KONSESI.emiten.some(e => !H.adaDiIdx(e.bursa)));
  const e = KONSESI.emiten[0], a = H.analisa(e.mingguan, H.hargaMingguan(grafikSintetis(e.kode).deret));
  assert.ok(a.n >= 30 && a.rho !== null);
});

test("analisa T2: harga turun sebelum jendela titik tidak menghasilkan selisih; minggu lonjakan keluar dari dasar", () => {
  const titik = Array.from({length: 40}, (_, i) => ({minggu: minggu(20 + i), titik: (i * 7) % 23}));
  const hs = [...Array.from({length: 20}, (_, i) => 1000 - i * 30), ...Array(42).fill(400)];   // jatuh dulu, lalu datar di seluruh jendela
  const a = H.analisa(titik, H.hargaMingguan(deretDari(hs)));
  assert.ok(a.peristiwa.h1 && Math.abs(a.peristiwa.h1.selisih) < 1e-9 && Math.abs(a.peristiwa.h4.selisih) < 1e-9);
  assert.equal(a.n, 38);   // minggu pertama dan terakhir (parsial) dibuang
  assert.ok(!a.peristiwa.minggu.includes(minggu(20)) && !a.peristiwa.minggu.includes(minggu(59)));
  assert.match(a.narasi.join(" "), /ex-post/); assert.match(a.narasi.join(" "), /belum disesuaikan IHSG atau musim; minggu lonjakan berurutan tumpang tindih/);
});
test("analisa S3: n < 20 tanpa kata lemah/sedang/kuat; n >= 20 menyebut belum diuji signifikansi", () => {
  const mk = n => Array.from({length: n}, (_, i) => ({minggu: minggu(i), titik: (i * 7) % 23}));
  const hs = n => H.hargaMingguan(deretDari(Array.from({length: n + 2}, (_, i) => 100 + ((i * 5) % 9))));
  const kecil = H.analisa(mk(15), hs(15)); assert.ok(kecil.n < 20); assert.doesNotMatch(kecil.narasi[0], /lemah|sedang|kuat/); assert.match(kecil.narasi[0], /sampel terlalu kecil/);
  const besar = H.analisa(mk(40), hs(40)); assert.match(besar.narasi[0], /belum diuji signifikansi/);
});
test("contoh konsesi: ada hubungan, grup berbagi deret", () => {
  assert.ok(KONSESI.emiten.every(e => ["langsung", "induk", "rantai_pasok"].includes(e.hubungan)));
  const g = KONSESI.emiten.filter(e => e.grup === "Grup Contoh Satu"); assert.equal(g.length, 2); assert.deepEqual(g[0].mingguan, g[1].mingguan);
});
