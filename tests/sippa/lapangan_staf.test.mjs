/* Sisi staf fase 2 (keputusan 61; SP-124, SP-130, SP-131): suhu tanah, tekanan, peta lapangan, debit, kartu Lapangan, pinjam-pakai, berita acara, suku cadang.
   Fungsi murni dan pembangun HTML diuji tanpa DOM; rute dibaca dari src/sippa.js supaya kontrak yang diasumsikan klien tidak menyimpang diam-diam. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
const S = await import("../../public/pipa/lapangan_staf.js");
const LOG = await import("../../public/pipa/layar_log.js");
const server = readFileSync(new URL("../../src/sippa.js", import.meta.url), "utf8");
const KINI = Date.UTC(2026, 9, 28, 3, 0), JAM = 36e5, HARI = 864e5;
const teks = h => h.replace(/<[^>]*>/g, "");

test("kontrak rute: pinjam-kembali, pinjam, suku-cadang, lapangan, dan probe.csv ada di src/sippa.js dengan jalur yang dipakai klien", () => {
  for (const r of ["POST /api/sippa/pinjam-kembali/:id", "POST /api/sippa/pinjam", "GET /api/sippa/pinjam", "GET /api/sippa/suku-cadang", "GET /api/sippa/lapangan", "GET /api/sippa/probe.csv"]) assert.ok(server.includes(`"${r}"`), r);
  assert.equal(S.jalurPinjamKembali("0123456789abcdef"), "/api/sippa/pinjam-kembali/0123456789abcdef");
  for (const salah of ["../x", "0123", "0123456789ABCDEF", "0123456789abcdef/../a", ""]) assert.throws(() => S.jalurPinjamKembali(salah), /tidak sah/, salah);
  assert.equal(S.urlLapangan({kompleks: "K0001", jenis: ["jejak", "bor"], sejak: 5.4}), "/api/sippa/lapangan?kompleks_id=K0001&jenis=jejak%2Cbor&sejak=5");
});

test("uraiCsv: kutip ganda, koma dan baris baru di dalam sel, BOM, sel kosong = null, angka = angka, CRLF; keluaran kosong = larik kosong", () => {
  const r = S.uraiCsv('﻿id,petak_id,suhu_c,catatan\r\na1,L1,31.5,"koma, di dalam ""kutip"""\r\na2,,-4,"dua\nbaris"\r\n');
  assert.deepEqual(r, [{id: "a1", petak_id: "L1", suhu_c: 31.5, catatan: 'koma, di dalam "kutip"'}, {id: "a2", petak_id: null, suhu_c: -4, catatan: "dua\nbaris"}]);
  assert.deepEqual(S.uraiCsv(""), []); assert.deepEqual(S.uraiCsv("id,x\r\n"), []);
});

const P = (petak_id, tahap, kedalaman_cm, suhu_c, titik = "T1") => ({petak_id, tahap, kedalaman_cm, suhu_c, titik});
test("serieSuhu: rata-rata per petak, kedalaman, tahap; panas hanya bila ada titik STRICT di atas 40; 24j menjadi besok; tahap lain dan suhu bukan angka diabaikan; tanpa petak di urutan akhir", () => {
  const r = S.serieSuhu([P("L1", "sebelum", 30, 50), P("L1", "sebelum", 30, 30, "T2"), P("L1", "sesudah", 30, 40), P("L1", "24j", 30, 25), P("L1", "7h", 30, 99), P("L1", "sebelum", 10, 20), P(null, "sebelum", 10, 70), P("A1", "sebelum", 10, "x")]);
  assert.deepEqual(r.map(x => x.petak), ["L1", null], "A1 tanpa suhu angka tidak muncul, tanpa petak terakhir");
  const l1 = r[0], k30 = l1.seri.find(s => s.cm === 30);
  assert.deepEqual(l1.seri.map(s => s.cm), [10, 30]);
  assert.deepEqual([k30.nilai[0].rata, k30.nilai[0].maks, k30.nilai[0].panas, k30.nilai[0].n], [40, 50, true, 2], "rata-rata 40 tetapi satu titik 50 menandai panas");
  assert.equal(k30.nilai[1].panas, false, "tepat 40 tidak panas"); assert.equal(k30.nilai[2].rata, 25); assert.equal(l1.nPanas, 1); assert.equal(l1.maks, 50);
});

test("suhuHtml: satu grafik per petak dengan garis 40 °C, lingkaran panas bertanda kelas, petak di-escape, sumber berwaktu; tanpa data = kalimat kosong", () => {
  const h = S.suhuHtml([P("L<1>", "sebelum", 30, 55), P("L<1>", "sesudah", 30, 35), P("L<1>", "24j", 30, 31)], KINI);
  assert.doesNotMatch(h, /L<1>/); assert.match(h, /Petak L&lt;1&gt;/); assert.match(h, /class="sp-titik sp-seri-0 panas"/); assert.equal((h.match(/<svg/g) || []).length, 1);
  assert.match(h, /1 pengukuran di atas 40 °C/); assert.match(h, /Sumber: probe form lapangan/); assert.match(h, /ambang/);
  assert.match(S.suhuHtml([P("L1", "sebelum", 30, 30)], KINI), /tidak ada yang di atas 40 °C/);
  assert.match(S.suhuHtml([], KINI), /Belum ada pengukuran suhu/);
});

const T = (waktu, titik, bar, tugas_id = "T1") => ({jenis: "tekanan", tugas_id, waktu, data: {titik, bar}});
test("sesiTekanan: jeda lebih dari 2 jam atau tugas lain memulai sesi baru; tepat 2 jam masih satu sesi; lance di bawah 2 bar dihitung; bukan tekanan diabaikan", () => {
  const s = S.sesiTekanan([T(KINI, "lance", 1.5), T(KINI + 10 * 60000, "lance", 2.5), T(KINI + 10 * 60000 + 2 * JAM, "pompa", 3), T(KINI + 10 * 60000 + 4 * JAM + 1, "lance", 0.5), T(KINI, "pompa", 3, "T2"), {jenis: "sos", waktu: KINI, data: {}}]);
  assert.equal(s.length, 3); const t1 = s.filter(x => x.tugas_id === "T1");
  assert.deepEqual(t1.map(x => x.titik.length).sort(), [1, 3]); assert.equal(t1[0].lanceRendah, 1); assert.equal(t1[1].lanceRendah, 1);
});

test("tekananHtml: grafik per sesi dengan batas 2 bar, jam WIB di sumbu, lance rendah bertanda; kosong = kalimat", () => {
  const h = S.tekananHtml([T(KINI, "lance", 1.2), T(KINI + 600000, "lance", 2.6), T(KINI, "pompa", 7)], KINI);
  assert.equal((h.match(/<svg/g) || []).length, 1); assert.match(h, /Batas bawah lance 2 bar/); assert.match(h, /1 catatan lance di bawah 2 bar/); assert.match(h, /sp-titik sp-seri-2 panas/);
  assert.match(S.tekananHtml([], KINI), /Belum ada catatan tekanan/);
});

test("geoLapangan: jejak jadi LineString [bujur, lintang]; bor menurut tebal gambut (49 bukan gambut, 50 sampai 99 tembus, 100 cukup); SOS titik; butir rusak dibuang", () => {
  const g = S.geoLapangan([{id: "j", jenis: "jejak", data: {titik: [[-2.2, 113.9, 1], [-2.3, 114, 2]], moda: "perahu"}}, {id: "j2", jenis: "jejak", data: {titik: [[-2.2, 113.9, 1]], moda: "perahu"}},
    ...[49, 50, 99, 100].map((cm, i) => ({id: "b" + i, jenis: "bor", data: {lat: -2.2, lon: 113.9, kedalaman_cm: cm, petak_id: "L1"}})),
    {id: "s", jenis: "sos", waktu: KINI, data: {lat: -2.2, lon: 113.9}}, {id: "x", jenis: "bor", data: {kedalaman_cm: 80}}, {id: "y", jenis: "debit", data: {lat: 1, lon: 1}}]);
  assert.equal(g.type, "FeatureCollection"); assert.deepEqual(g.features[0].geometry.coordinates, [[113.9, -2.2], [114, -2.3]]);
  assert.deepEqual(g.features.filter(f => f.properties.jenis === "bor").map(f => f.properties.tingkat), ["bukan_gambut", "tembus", "tembus", "cukup"]);
  assert.equal(g.features.length, 6, "jejak 1 titik, bor tanpa koordinat, dan debit tidak masuk"); assert.deepEqual(S.geoLapangan([]).features, []);
});

test("lapisanLapangan: id sama dengan LAPISAN_LAP, mulai tersembunyi (sakelar setLayoutProperty), sumber 'lapangan', tanpa hex selain putih netral", () => {
  const l = S.lapisanLapangan();
  assert.deepEqual(l.map(x => x.id), S.LAPISAN_LAP); assert.ok(l.every(x => x.source === "lapangan" && (x.layout.visibility === "none")));
  const hex = (JSON.stringify(l).match(/#[0-9a-fA-F]{3,8}\b/g) || []).filter(h => !["#fff", "#000"].includes(h.toLowerCase())); assert.deepEqual(hex, []);
});

test("debitTerukur dan debitHtml: pakai debit_lps server atau hitung dari isian; terbaru dulu; cukup di 5 liter per detik ke atas; lima teratas dengan catatan sisa; kosong = string kosong", () => {
  const D = (id, waktu, data) => ({id, jenis: "debit", waktu, data: {lat: -2.2, lon: 113.9, ...data}});
  const butir = [D("a", KINI, {metode: "ember", volume_l: 20, detik: 8, debit_lps: 2.5}), D("b", KINI + 1, {metode: "pelampung", lebar_m: 2, dalam_m: 0.5, kecepatan_ms: 0.3}), D("c", KINI + 2, {metode: "ember"}), {jenis: "bor", data: {}}];
  const d = S.debitTerukur(butir); assert.deepEqual(d.map(x => [x.id, x.lps]), [["b", 255], ["a", 2.5]]);
  const h = S.debitHtml(butir); assert.match(h, /255 liter per detik/); assert.match(h, /cukup untuk satu kit/); assert.match(h, /kurang dari 5 liter per detik/);
  assert.equal(S.debitHtml([]), ""); assert.equal(S.debitHtml([{jenis: "bor", data: {}}]), "");
  const banyak = Array.from({length: 7}, (_, i) => D("x" + i, KINI + i, {metode: "ember", volume_l: 10, detik: 1}));
  assert.equal((S.debitHtml(banyak).match(/<li>/g) || []).length, 5); assert.match(S.debitHtml(banyak), /2 ukuran lebih lama tidak ditampilkan/);
});

test("awalHariWIB: 28 Okt 03.00 UTC (10.00 WIB) -> 27 Okt 17.00 UTC; tepat tengah malam WIB tetap hari itu", () => {
  assert.equal(S.awalHariWIB(KINI), Date.UTC(2026, 9, 27, 17, 0)); assert.equal(S.awalHariWIB(Date.UTC(2026, 9, 27, 17, 0)), Date.UTC(2026, 9, 27, 17, 0)); assert.equal(S.awalHariWIB(Date.UTC(2026, 9, 27, 16, 59, 59)), Date.UTC(2026, 9, 26, 17, 0));
});

test("kartuLapangan: tanpa SOS dan tanpa selesai hari ini = kosong (kartu tersembunyi); SOS di judul dan lebih dulu; butir kemarin tidak dihitung; pesan di-escape; lokasi tertaut", () => {
  const sos = (waktu, pesan) => ({id: "s" + waktu, jenis: "sos", kit_id: "k1", waktu, data: {lat: -2.2, lon: 113.9, ...(pesan ? {pesan} : {})}});
  const sel = waktu => ({id: "e" + waktu, jenis: "selesai", kit_id: "k1", waktu, data: {alat_kembali: ["P-101", "SF-101"], alat_hilang: ["C-101"], catatan: "ok"}});
  assert.equal(S.kartuLapangan([sos(KINI - 2 * HARI), sel(KINI - 2 * HARI)], KINI).kosong, true); assert.equal(S.kartuLapangan([], KINI).kosong, true);
  const k = S.kartuLapangan([sel(KINI - 1000), sos(KINI - 5000, "<b>ular</b>")], KINI, {k1: "SIPPA-001"});
  assert.match(teks(k.judul), /^1 SOS dari regu hari ini$/); assert.ok(k.isi.indexOf("SOS") < k.isi.indexOf("Selesai gelar"));
  assert.doesNotMatch(k.isi, /<b>ular/); assert.match(k.isi, /&lt;b&gt;ular/); assert.match(k.isi, /SIPPA-001/); assert.match(k.isi, /https:\/\/www\.google\.com\/maps\?q=-2\.2,113\.9/); assert.match(k.isi, /rel="noopener noreferrer"/);
  assert.match(k.isi, /2 alat kembali/); assert.match(k.isi, /1 hilang: C-101/);
  assert.match(teks(S.kartuLapangan([sel(KINI - 1000)], KINI).judul), /^1 regu melapor selesai gelar hari ini$/); assert.equal(S.kartuLapangan([sel(KINI)], KINI).ey, "Lapangan hari ini");
});

test("kehilanganDepot: per depot per musim jumlah kit, komponen kurang, rata-rata persen per kit; lokasi kosong = 'Lokasi belum dicatat'; musim tanpa jawaban dilewati", () => {
  const kit = (id, lokasi, komponen_kurang) => ({id, lokasi, komponen_kurang});
  const r = S.kehilanganDepot({karhutla: {kit: [kit("a", "Palangka Raya", 2), kit("b", "Palangka Raya", 0), kit("c", null, 1)], kehilangan: {per_kit: {a: 10, b: 0}}}, banjir: {kit: [kit("a", "Palangka Raya", 4)], kehilangan: {per_kit: {a: 20}}}, lain: null});
  assert.deepEqual(r.map(x => x.depot), ["Lokasi belum dicatat", "Palangka Raya"]);
  const pr = r[1].musim; assert.deepEqual(pr.karhutla, {kit: 2, kurang: 2, rata: 5}); assert.deepEqual(pr.banjir, {kit: 1, kurang: 4, rata: 20}); assert.equal(r[0].musim.karhutla.rata, null);
  const h = S.kehilanganDepotHtml(r, KINI); assert.match(h, /Palangka Raya/); assert.match(h, /rata-rata 5% per kit/); assert.equal(S.kehilanganDepotHtml([]), "");
});

const F_OK = {pemilik_asal: "BPBD Kapuas", penerima: "Manggala Agni Daops", mulai: "2026-10-30", selesai_rencana: "2026-11-20", kit_id: "0123456789abcdef", kode_bom: "", catatan: ""};
test("cekFormPinjam: isian sah tanpa galat; tiap aturan server (nama 2 sampai 80, kit atau kode, kode BOM, mulai, selesai sesudah mulai dan paling lama setahun) menolak dengan nama medan", () => {
  assert.deepEqual(S.cekFormPinjam(F_OK, KINI), {});
  assert.ok(S.cekFormPinjam({...F_OK, pemilik_asal: "B"}, KINI).pemilik_asal); assert.ok(S.cekFormPinjam({...F_OK, penerima: "x".repeat(81)}, KINI).penerima);
  assert.ok(S.cekFormPinjam({...F_OK, kit_id: "", kode_bom: ""}, KINI).kit_id); assert.deepEqual(S.cekFormPinjam({...F_OK, kit_id: "", kode_bom: "p-101, SF-101"}, KINI), {});
  assert.ok(S.cekFormPinjam({...F_OK, kode_bom: "pompa"}, KINI).kode_bom);
  assert.ok(S.cekFormPinjam({...F_OK, mulai: ""}, KINI).mulai); assert.ok(S.cekFormPinjam({...F_OK, mulai: "2026-09-01"}, KINI).mulai, "lebih dari 30 hari lalu"); assert.ok(S.cekFormPinjam({...F_OK, mulai: "2027-12-01", selesai_rencana: "2027-12-05"}, KINI).mulai);
  assert.ok(S.cekFormPinjam({...F_OK, selesai_rencana: "2026-10-30"}, KINI).selesai_rencana, "selesai sama dengan mulai ditolak"); assert.ok(S.cekFormPinjam({...F_OK, selesai_rencana: "2027-10-31"}, KINI).selesai_rencana, "lebih dari setahun");
  assert.deepEqual(S.cekFormPinjam({...F_OK, selesai_rencana: "2027-10-30"}, KINI), {}, "tepat 365 hari sah");
});

test("badanPinjam dan badanKembali: milidetik WIB, kode BOM huruf besar unik, prov hanya tanpa kit, catatan kosong dibuang; kondisi dipotong 200", () => {
  const b = S.badanPinjam({...F_OK, kit_id: "", kode_bom: "p-101 P-101,sf-101", catatan: "  ", prov: "62"});
  assert.deepEqual(b, {pemilik_asal: "BPBD Kapuas", penerima: "Manggala Agni Daops", mulai: Date.parse("2026-10-30T00:00:00+07:00"), selesai_rencana: Date.parse("2026-11-20T00:00:00+07:00"), kode_bom: ["P-101", "SF-101"], prov: "62"});
  const k = S.badanPinjam({...F_OK, prov: "62", catatan: "tanda tangan basah"}); assert.equal(k.kit_id, "0123456789abcdef"); assert.equal("prov" in k, false); assert.equal("kode_bom" in k, false); assert.equal(k.catatan, "tanda tangan basah");
  assert.deepEqual(S.badanKembali({kondisi: ""}, KINI), {waktu: KINI}); assert.equal(S.badanKembali({kondisi: "x".repeat(300)}, KINI).kondisi.length, 200);
});

const PINJAM = {id: "0123456789abcdef", nomor_ba: "BA-SIPPA-2026-0007", kit_id: "k1", kode_bom: ["P-101"], pemilik_asal: "BPBD <Kapuas>", penerima: "Daops", mulai: KINI - 5 * HARI, selesai_rencana: KINI + 5 * HARI, kembali: null, kondisi_kembali: null, catatan: null};
test("statusPinjam dan tabelPinjamHtml: berjalan, lewat jadwal, kembali; tombol Kembalikan hanya untuk peran tulis dan yang belum kembali; berita acara selalu; teks di-escape", () => {
  assert.equal(S.statusPinjam(PINJAM, KINI), "berjalan"); assert.equal(S.statusPinjam({...PINJAM, selesai_rencana: KINI - 1}, KINI), "lewat"); assert.equal(S.statusPinjam({...PINJAM, kembali: KINI}, KINI), "kembali");
  const w = S.tabelPinjamHtml([PINJAM, {...PINJAM, id: "fedcba9876543210", kembali: KINI, kondisi_kembali: "baik"}], {peran: "W", kini: KINI, namaKit: {k1: "SIPPA-001"}, per: KINI});
  assert.equal((w.match(/data-kembali=/g) || []).length, 1); assert.equal((w.match(/data-ba=/g) || []).length, 2); assert.doesNotMatch(w, /<Kapuas>/); assert.match(w, /BPBD &lt;Kapuas&gt;/); assert.match(w, /SIPPA-001, P-101/);
  assert.equal((S.tabelPinjamHtml([PINJAM], {peran: "B", kini: KINI}).match(/data-kembali=/g) || []).length, 0);
  assert.match(S.tabelPinjamHtml([], {peran: "W"}), /Belum ada pinjam-pakai/);
});

test("beritaAcaraHtml: nomor BA dari server, kepala BNPB sebagai teks, dua tanda tangan, tanpa gambar dan tanpa merek; data di-escape; kembali dan catatan muncul bila ada", () => {
  const h = S.beritaAcaraHtml({...PINJAM, catatan: "<i>rapi</i>", kembali: KINI, kondisi_kembali: "baik"}, {namaKit: {k1: "SIPPA-001"}, kini: KINI});
  assert.match(h, /BA-SIPPA-2026-0007/); assert.match(h, /Badan Nasional Penanggulangan Bencana/); assert.equal((h.match(/sp-ba-ttd"/g) || []).length, 2);
  assert.doesNotMatch(h, /<img|<svg|logo/i); assert.doesNotMatch(h, /Centurisk|Pantau/);
  assert.doesNotMatch(h, /<i>rapi/); assert.match(h, /&lt;i&gt;rapi/); assert.match(h, /Kit SIPPA-001/); assert.match(h, /Alat P-101/); assert.match(h, /Dikembalikan/); assert.match(h, /kondisi: baik/);
  assert.doesNotMatch(S.beritaAcaraHtml(PINJAM, {kini: KINI}), /Dikembalikan/);
});

test("sukuCadangHtml: terlama di atas, umur hari, kit dan temuan di-escape, tanpa data = kalimat; pilihanTugas: satu per tugas, terbaru dulu, paling banyak 30, koreksi tidak dihitung", () => {
  const h = S.sukuCadangHtml([{kit_kode: "SIPPA-002", kode_bom: "P-101", nama: "Pompa", sejak: KINI, umur_hari: 3, temuan: "<x>"}, {kit_kode: "SIPPA-001", kode_bom: "SF-101", nama: "Saringan", sejak: KINI, umur_hari: 40, temuan: null}], KINI);
  assert.ok(h.indexOf("SIPPA-001") < h.indexOf("SIPPA-002")); assert.match(h, /&lt;x&gt;/); assert.match(S.sukuCadangHtml([], KINI), /Tidak ada alat yang menunggu/);
  const log = [{id: "a", tugas_id: "T1", t_tiba: KINI - 5 * HARI, kit_kode: "SIPPA-001", nama_regu: "Alfa"}, {id: "b", tugas_id: "T1", t_tiba: KINI - 6 * HARI}, {id: "c", tugas_id: "T2", t_tiba: KINI, nama_regu: "Beta"}, {id: "d", tugas_id: null, t_tiba: KINI}, {id: "e", tugas_id: "T3", t_tiba: KINI - HARI, koreksi_dari: "c"}];
  const p = LOG.pilihanTugas(log); assert.deepEqual(p.map(x => x.id), ["T3", "T1"], "c dikoreksi e, d tanpa tugas, b duplikat T1"); assert.match(p[1].teks, /SIPPA-001, regu Alfa/);
  assert.equal(LOG.pilihanTugas(Array.from({length: 40}, (_, i) => ({id: "i" + i, tugas_id: "T" + i, t_tiba: i}))).length, 30);
});

test("teks layar fase 2: tanpa em dash, tanpa titik tengah, tanpa 'titik api', tanpa toFixed di berkas baru", () => {
  for (const n of ["lapangan_staf.js", "layar_lapangan.css"]) { const t = readFileSync(new URL(`../../public/pipa/${n}`, import.meta.url), "utf8"); assert.doesNotMatch(t, /—|·|titik api|toFixed/i, n); }
});

test("muatButir dan ambilTeks: rute belum ada atau galat = tidak ada butir (layar menyembunyikan bagian), pembatalan dilempar ulang; ambilTeks menolak kode bukan 2xx dengan statusnya", async () => {
  const dipanggil = [];
  assert.deepEqual(await S.muatButir(async u => { dipanggil.push(u); return {butir: [{id: "a"}]}; }, {tugas: "T1", jenis: "sos"}), [{id: "a"}]); assert.match(dipanggil[0], /tugas_id=T1&jenis=sos/);
  assert.deepEqual(await S.muatButir(async () => { throw Object.assign(new Error("tidak ada"), {status: 404}); }, {tugas: "T1"}), []);
  assert.deepEqual(await S.muatButir(async () => ({}), {tugas: "T1"}), []);
  await assert.rejects(S.muatButir(async () => { throw Object.assign(new Error("batal"), {name: "AbortError"}); }, {tugas: "T1"}), /batal/);
  const asli = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ok: true, text: async () => "id\r\n1\r\n"}); assert.equal(await S.ambilTeks("/x"), "id\r\n1\r\n");
    globalThis.fetch = async () => ({ok: false, status: 403}); await assert.rejects(S.ambilTeks("/x"), e => e.status === 403);
  } finally { globalThis.fetch = asli; }
});
