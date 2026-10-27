/* SP-094: logika murni dan HTML layar Pemeliharaan /pipa/pelihara (PRD §9.4.9, DS §4.15, RU §2.3 P7). Tanpa DOM dan tanpa DB:
   jaringan hanya kontrak DT (GET /api/sippa/pelihara, POST /api/sippa/inspeksi, POST /api/sippa/stok) lewat data tiruan.
   Yang salah DITOLAK: jenis yang tak sah untuk kelas, mutu air tanpa E. coli, stok nol, teks data tanpa escape. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

/* global klasik public/inti: dimuat dari berkas nyata, bukan ditiru */
(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");

const P = await import("../../public/pipa/layar_pelihara.js");
const {KELAS, stokMin, skorKeKondisi} = await import("../../public/pipa/pelihara.js");

const HARI = 864e5, KINI = Date.UTC(2026, 9, 26, 3, 0, 0);   // 26 Okt 2026
const lalu = h => KINI - h * HARI;
const sumber = () => readFileSync(new URL("../../src/sippa.js", import.meta.url), "utf8");
const id = s => s.padEnd(16, "0");
const dekat = (a, b, pesan) => assert.ok(Math.abs(a - b) < 1e-3, `${pesan}: ${a} bukan ${b}`);

/* data tiruan bentuk GET /api/sippa/pelihara (DT §4.3). Kit A sehat; kit B pompa rusak berat; kit C pompa 60 jam sejak servis. */
const komp = (i, kit_id, kit_kode, kode_bom, nama, kondisi = "baik") => ({id: id(i), kit_id: id(kit_id), kit_kode, kit_status: "gudang", kode_bom, nama, kondisi, dicek: null});
const insp = (sasaran_jenis, i, jenis, skor, waktu) => ({sasaran_jenis, sasaran_id: id(i), jenis, skor, waktu});
const NAMA_BERBAHAYA = "APD <img src=x onerror=alert(1)>";
const data = () => ({
  komponen: [
    komp("a1", "aa", "SIPPA-901", "P-101", "Pompa portabel"),
    komp("a2", "aa", "SIPPA-901", "C-101", "Kopling Storz"),
    komp("a3", "aa", "SIPPA-901", "Q-101", NAMA_BERBAHAYA),
    komp("b1", "bb", "SIPPA-902", "P-101", "Pompa portabel", "rusak_berat"),
    komp("b2", "bb", "SIPPA-902", "Q-101", "APD", "rusak_berat"),
    komp("c1", "cc", "SIPPA-903", "P-101", "Pompa portabel"),
    komp("z1", "cc", "SIPPA-903", "ZZ-101", "Awalan tanpa kelas"),
  ],
  aset: [
    {id: id("s1"), kode: "AS-9001", kelas: "sumur_bor", nama: "Sumur Kasongan", status: "berfungsi", pemelihara: "BPBD Katingan", prov: "62", kab: "Katingan", kit_id: null, rencana_ganti: null, keyakinan: "terverifikasi"},
    {id: id("s2"), kode: "AS-9002", kelas: "jembatan_darurat", nama: "Bailey Sebangau", status: "berfungsi", pemelihara: null, prov: "62", kab: "Pulang Pisau", kit_id: null, rencana_ganti: null, keyakinan: "resmi"},
  ],
  inspeksi_terakhir: [
    insp("komponen", "a2", "pra_musim", 0, lalu(10)),   // K3 interval 180 hari: aman
    insp("komponen", "a3", "berkala", 0, lalu(170)),    // K5 interval 180 hari: jatuh tempo 10 hari lagi = segera
    insp("komponen", "b1", "pra_gelar", 2, lalu(5)),    // K1 interval terkecil 30 hari: aman
    insp("komponen", "c1", "servis", 0, lalu(5)),       // 60 jam >= batas 50: terlambat
    insp("aset", "s1", "mutu_air", 0, lalu(200)),       // K7 interval 180 hari: terlambat 20 hari
  ],
  jam_sejak_servis: {[id("cc")]: 60, [id("aa")]: 10, [id("bb")]: 3},
  stok: [
    {gudang: "Gudang YonTP Palangka Raya", kode_bom: "C-101", saldo: 5, satuan: "unit"},
    {gudang: "Gudang YonTP Palangka Raya", kode_bom: "SF-101", saldo: 9, satuan: "unit"},
    {gudang: "Gudang YonTP Palangka Raya", kode_bom: "ST-101", saldo: 1, satuan: "unit"},
    {gudang: "Gudang Lain", kode_bom: "C-101", saldo: 1, satuan: "unit"},
  ],
  n_kit_per_gudang: {"Gudang YonTP Palangka Raya": 2},
  per: KINI,
});
const per = rows => Object.fromEntries(rows.map(r => [r.id, r]));

/* ---------- jadwal ---------- */
test("susunJadwal: delapan butir (awalan tanpa kelas dilewati), empat status, urut terlambat, segera, belum pernah, aman", () => {
  const rows = P.susunJadwal(data(), KINI);
  assert.equal(rows.length, 8, "7 komponen dikurangi ZZ-101, ditambah 2 aset");
  assert.deepEqual(rows.map(r => r.status), ["terlambat", "terlambat", "segera", "belum_pernah", "belum_pernah", "belum_pernah", "aman", "aman"]);
  assert.deepEqual(rows.slice(0, 2).map(r => r.id), [id("s1"), id("c1")], "yang paling lama lewat jatuh tempo dulu");
});

test("susunJadwal: status tiap butir sama dengan jadwal() murni; batas jam menang atas batas hari; tanpa jam dan tanpa inspeksi = belum pernah", () => {
  const r = per(P.susunJadwal(data(), KINI));
  assert.equal(r[id("c1")].status, "terlambat"); assert.match(r[id("c1")].alasan, /60 jam sejak servis, batas 50 jam/);
  assert.equal(r[id("a1")].status, "belum_pernah", "10 jam di bawah batas 50 dan tanpa inspeksi");
  assert.equal(r[id("a3")].status, "segera"); assert.equal(r[id("a2")].status, "aman");
  assert.equal(r[id("s1")].status, "terlambat"); assert.equal(r[id("s2")].status, "belum_pernah");
  assert.equal(r[id("a3")].jatuh_tempo, lalu(170) + 180 * HARI);
});

test("susunJadwal: skor dan waktu inspeksi terakhir dibawa ke baris; kelas, kit, pemelihara terisi; aset tanpa pemelihara memakai pemelihara tingkat 1 kelasnya", () => {
  const r = per(P.susunJadwal(data(), KINI));
  assert.equal(r[id("b1")].skor, 2); assert.equal(r[id("b1")].terakhir, lalu(5));
  assert.equal(r[id("a1")].skor, null); assert.equal(r[id("a1")].terakhir, null);
  assert.equal(r[id("c1")].kelas, "K1"); assert.equal(r[id("c1")].lokasi, "SIPPA-903"); assert.equal(r[id("c1")].kit_id, id("cc"));
  assert.equal(r[id("s1")].pemelihara, "BPBD Katingan");
  assert.equal(r[id("s2")].pemelihara, KELAS.K9.pemelihara_t1);
  assert.equal(r[id("s1")].lokasi, "Katingan");
});

test("susunJadwal: inspeksi terbaru menang bila satu butir punya dua jenis inspeksi; data kosong menghasilkan larik kosong", () => {
  const d = data(); d.inspeksi_terakhir.push(insp("komponen", "a2", "tahunan", 1, lalu(2)));
  assert.equal(per(P.susunJadwal(d, KINI))[id("a2")].skor, 1);
  assert.deepEqual(P.susunJadwal({komponen: [], aset: [], inspeksi_terakhir: [], jam_sejak_servis: {}, stok: []}, KINI), []);
});

/* ---------- peringatan laik gelar, stok, judul ---------- */
test("kitTidakLaik: komponen K1 rusak berat dan pompa terlambat membuat kit tidak laik; APD rusak berat dan kit sehat tidak", () => {
  const d = data(), laik = P.kitTidakLaik(d, P.susunJadwal(d, KINI));
  assert.deepEqual(laik.map(k => k.kit_kode), ["SIPPA-902", "SIPPA-903"]);
  assert.match(laik[0].alasan[0], /komponen P-101 rusak berat \(kelas K1\)/);
  assert.deepEqual(laik[1].alasan, ["pemeliharaan pompa (K1) terlambat"]);
  assert.equal(laik[0].kit_id, id("bb"));
  assert.equal(laik.some(k => k.kit_kode === "SIPPA-901"), false);
});

test("SATUAN_KIT dan barisStok: minimum = stokMin(kode, kit x satuan per kit); di bawah minimum hanya bila saldo < minimum; tanpa laju atau tanpa kit = tanpa minimum", () => {
  const b = P.barisStok(data()), c = b.find(x => x.kode_bom === "C-101" && x.gudang.includes("YonTP")), sf = b.find(x => x.kode_bom === "SF-101");
  assert.equal(c.min, stokMin("C-101", 2 * P.SATUAN_KIT["C-101"], 60)); assert.equal(c.min, 6); assert.equal(c.bawah, true);
  assert.equal(sf.min, 11); assert.equal(sf.bawah, true);
  assert.equal(b.find(x => x.kode_bom === "ST-101").min, null); assert.equal(b.find(x => x.kode_bom === "ST-101").bawah, false);
  assert.equal(b.find(x => x.gudang === "Gudang Lain").min, null, "gudang tanpa kit tercatat tidak punya minimum");
  const pas = data(); pas.stok[0].saldo = 6;
  assert.equal(P.barisStok(pas).find(x => x.kode_bom === "C-101" && x.gudang.includes("YonTP")).bawah, false, "saldo sama dengan minimum bukan di bawah");
  for (const k of Object.keys(P.SATUAN_KIT)) assert.ok(Number.isFinite(stokMin(k, P.SATUAN_KIT[k])), `SATUAN_KIT ${k} harus punya laju pakai di STOK_LAJU`);
});

test("ringkasan dan kalimatJudul: hitungan per status, kit tidak laik, suku cadang; kalimat sama dengan PRD §9.4.9", () => {
  const d = data(), rows = P.susunJadwal(d, KINI), r = P.ringkasan(rows, P.kitTidakLaik(d, rows), P.barisStok(d));
  assert.deepEqual(r, {terlambat: 2, segera: 1, aman: 2, belum_pernah: 3, tidakLaik: 2, stokBawah: 2, total: 8});
  assert.equal(P.kalimatJudul(r), "2 butir terlambat, 2 kit tidak laik gelar, 2 suku cadang di bawah minimum");
  assert.equal(P.kalimatJudul({terlambat: 12, tidakLaik: 3, stokBawah: 2}), "12 butir terlambat, 3 kit tidak laik gelar, 2 suku cadang di bawah minimum");
  assert.equal(P.kalimatJudul({terlambat: 0, tidakLaik: 0, stokBawah: 0, total: 5}), "Tidak ada butir terlambat, tidak ada kit tidak laik gelar, stok di atas minimum");
  assert.equal(P.kalimatJudul({terlambat: 0, tidakLaik: 0, stokBawah: 0, total: 0}), "Belum ada butir pemeliharaan tercatat");
  assert.equal(P.kalimatJudul({terlambat: 1, tidakLaik: 0, stokBawah: 0, total: 3}), "1 butir terlambat");
});

/* ---------- penyaring dan kalender ---------- */
test("saring: kelas dan status; kelas kosong = semua; status kosong = tidak ada baris", () => {
  const rows = P.susunJadwal(data(), KINI), semua = new Set(P.STATUS_JADWAL);
  assert.equal(P.saring(rows, {kelas: null, status: semua}).length, 8);
  assert.deepEqual(P.saring(rows, {kelas: "K1", status: semua}).map(r => r.id).sort(), [id("a1"), id("b1"), id("c1")]);
  assert.deepEqual(P.saring(rows, {kelas: null, status: new Set(["terlambat"])}).map(r => r.id), [id("s1"), id("c1")]);
  assert.equal(P.saring(rows, {kelas: null, status: new Set()}).length, 0);
});

test("hitungChip: jumlah per status dan per kelas dihitung dari baris yang lolos penyaring lain", () => {
  const rows = P.susunJadwal(data(), KINI), semua = new Set(P.STATUS_JADWAL);
  const c = P.hitungChip(rows, {kelas: "K1", status: semua});
  assert.deepEqual(c.status, {terlambat: 1, segera: 0, aman: 1, belum_pernah: 1}, "status dihitung di kelas K1");
  assert.equal(c.kelas.K1, 3); assert.equal(c.kelas.K5, 2); assert.equal(c.kelas.K10, 0); assert.equal(c.kelas.semua, 8);
  assert.equal(P.hitungChip(rows, {kelas: null, status: new Set(["terlambat"])}).kelas.K1, 1, "kelas dihitung di status terpilih");
});

test("kalender: dua belas bulan mulai bulan ini, pita musim karhutla Mei-Okt dan banjir Nov-Apr, butir lewat dihitung terpisah", () => {
  const k = P.kalender(P.susunJadwal(data(), KINI), KINI);
  assert.equal(k.bulan.length, 12);
  assert.deepEqual([k.bulan[0].nama, k.bulan[0].tahun, k.bulan[11].nama, k.bulan[11].tahun], ["Okt", 2026, "Sep", 2027]);
  assert.deepEqual(k.bulan.map(b => b.musim), ["karhutla", "banjir", "banjir", "banjir", "banjir", "banjir", "banjir", "karhutla", "karhutla", "karhutla", "karhutla", "karhutla"]);
  assert.equal(k.lewat, 2, "s1 dan c1 sudah lewat jatuh tempo");
  assert.deepEqual(k.bulan.map(b => b.n), [0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], "a3 dan b1 jatuh tempo November, a2 April; butir tanpa jatuh tempo tidak masuk");
});

/* ---------- biaya ---------- */
test("biayaKelas: tanpa harga dan jumlah = menunggu, laju tertulis per kelas; dengan harga = biayaTahun dengan laju kelas", () => {
  const d = data(), b0 = P.biayaKelas(d);
  assert.equal(b0.total, null); assert.equal(b0.keyakinan, "asumsi-kebijakan");
  assert.equal(b0.kelas.length, 9);   // K6 koridor dicabut (keputusan 60)
  assert.equal(b0.kelas.find(x => x.kelas === "K1").laju, KELAS.K1.laju_biaya); assert.equal(b0.kelas.find(x => x.kelas === "K1").biaya, null);
  assert.equal(b0.kelas.find(x => x.kelas === "K8").laju, 0, "K8 bukan beban BNPB");
  const dh = {...d, harga: {"P-101": 100e6, "C-101": 1e6}};
  dh.komponen = dh.komponen.map(c => ({...c, jumlah: c.kode_bom === "C-101" ? 20 : 1}));
  const b1 = P.biayaKelas(dh);
  dekat(b1.kelas.find(x => x.kelas === "K1").biaya, 3 * 100e6 * KELAS.K1.laju_biaya, "K1");
  dekat(b1.kelas.find(x => x.kelas === "K3").biaya, 20 * 1e6 * KELAS.K3.laju_biaya, "K3");
  dekat(b1.total, b1.kelas.reduce((s, x) => s + (x.biaya ?? 0), 0), "total");
});

/* ---------- jenis inspeksi dan form staf ---------- */
test("jenisUntuk: dibatasi daftar jenis server (JENIS_INSPEKSI di src/sippa.js); K7 punya mutu_air, K2 uji_tekanan, K1 servis dan pra/pasca gelar", () => {
  const m = /JENIS_INSPEKSI = \[([^\]]*)\]/.exec(sumber()); assert.ok(m, "JENIS_INSPEKSI tidak ditemukan di src/sippa.js");
  const server = [...m[1].matchAll(/"([a-z_]+)"/g)].map(x => x[1]);
  for (const k of Object.keys(KELAS)) { const j = P.jenisUntuk(k); assert.ok(j.length >= 1, `kelas ${k} tanpa jenis`); for (const x of j) assert.ok(server.includes(x), `${k}: jenis ${x} ditolak server`); }
  assert.ok(P.jenisUntuk("K7").includes("mutu_air")); assert.ok(P.jenisUntuk("K2").includes("uji_tekanan"));
  for (const x of ["servis", "pra_gelar", "pasca_gelar"]) assert.ok(P.jenisUntuk("K1").includes(x), x);
  assert.equal(P.jenisUntuk("K5").includes("pra_gelar"), false, "K5 tidak diperiksa tiap pakai");
  assert.deepEqual(P.jenisUntuk("K99"), []);
});

const ROW_KOMP = () => P.susunJadwal(data(), KINI).find(r => r.id === id("c1")), ROW_ASET = () => P.susunJadwal(data(), KINI).find(r => r.id === id("s1"));
test("cekInspeksiStaf: yang salah ditolak per medan (skor, jenis tak sah, jam hanya K1, mutu air tanpa E. coli, tekanan, temuan panjang)", () => {
  const ok = {jenis: "servis", skor: 0, jam_operasi: 12, tindakan: "tidak_ada"};
  assert.deepEqual(P.cekInspeksiStaf(ROW_KOMP(), ok), []);
  const m = (r, f) => P.cekInspeksiStaf(r, f).map(g => g.medan);
  assert.deepEqual(m(ROW_KOMP(), {...ok, skor: undefined}), ["skor"]);
  assert.deepEqual(m(ROW_KOMP(), {...ok, skor: 4}), ["skor"]); assert.deepEqual(m(ROW_KOMP(), {...ok, skor: 1.5}), ["skor"]);
  assert.deepEqual(m(ROW_KOMP(), {...ok, jenis: "mutu_air"}), ["jenis"], "mutu air bukan untuk pompa");
  assert.deepEqual(m(ROW_KOMP(), {...ok, jam_operasi: -1}), ["jam_operasi"]);
  assert.deepEqual(m(ROW_KOMP(), {...ok, tindakan: "bakar"}), ["tindakan"]);
  assert.deepEqual(m(ROW_KOMP(), {...ok, temuan: "x".repeat(1001)}), ["temuan"]);
  const mutu = {jenis: "mutu_air", skor: 0, tindakan: "tidak_ada"};
  assert.deepEqual(m(ROW_ASET(), mutu), ["e_coli_cfu"]); assert.deepEqual(m(ROW_ASET(), {...mutu, e_coli_cfu: -1}), ["e_coli_cfu"]);
  assert.deepEqual(P.cekInspeksiStaf(ROW_ASET(), {...mutu, e_coli_cfu: 0}), [], "nol CFU sah");
  assert.deepEqual(m(ROW_ASET(), {...mutu, e_coli_cfu: 3, jam_operasi: 5}), ["jam_operasi"], "jam operasi hanya kelas K1");
  assert.deepEqual(m({...ROW_KOMP(), kelas: "K2"}, {jenis: "uji_tekanan", skor: 0}), ["tekanan_bar"]);
});

test("badanInspeksi: komponen membawa kit_id, aset tidak; hasil mutu air dan tekanan; medan kosong dan liar dibuang; kata skor dari skorKeKondisi", () => {
  const b = P.badanInspeksi(ROW_KOMP(), {jenis: "servis", skor: "0", jam_operasi: "12,5", temuan: "  oli diganti ", tindakan: "perbaiki", liar: "x"});
  assert.deepEqual(b, {sasaran_jenis: "komponen", sasaran_id: id("c1"), kit_id: id("cc"), jenis: "servis", skor: 0, jam_operasi: 12.5, temuan: "oli diganti", tindakan: "perbaiki"});
  const a = P.badanInspeksi(ROW_ASET(), {jenis: "mutu_air", skor: 2, e_coli_cfu: "3", tindakan: "uji_ulang"});
  assert.deepEqual(a, {sasaran_jenis: "aset", sasaran_id: id("s1"), jenis: "mutu_air", skor: 2, tindakan: "uji_ulang", hasil: {e_coli_cfu: 3}});
  assert.equal(P.badanInspeksi(ROW_KOMP(), {jenis: "uji_tekanan", skor: 0, tekanan_bar: "9,5"}).hasil.tekanan_bar, 9.5);
  assert.equal(P.badanInspeksi(ROW_KOMP(), {jenis: "servis", skor: 0}).tindakan, "tidak_ada");
  assert.deepEqual(P.SKOR_KATA, ["Baik", "Rusak ringan", "Rusak berat", "Hilang atau afkir"]);
  P.SKOR_KATA.forEach((_, i) => assert.ok(skorKeKondisi(i)));
});

test("cekStok dan badanStok: delta bukan nol, kode bentuk P-101, gudang dan nama wajib, satuan dan alasan dari daftar; badan tanpa medan liar", () => {
  const ok = {gudang: "Gudang YonTP", kode_bom: "C-101", nama: "Kopling Storz", delta: "-2", satuan: "unit", alasan: "pakai"};
  assert.deepEqual(P.cekStok(ok), []);
  const m = f => P.cekStok({...ok, ...f}).map(g => g.medan);
  assert.deepEqual(m({delta: "0"}), ["delta"]); assert.deepEqual(m({delta: "abc"}), ["delta"]); assert.deepEqual(m({delta: "100001"}), ["delta"]);
  assert.deepEqual(m({kode_bom: "kopling"}), ["kode_bom"]); assert.deepEqual(m({gudang: "ab"}), ["gudang"]); assert.deepEqual(m({nama: ""}), ["nama"]);
  assert.deepEqual(m({satuan: "ton"}), ["satuan"]); assert.deepEqual(m({alasan: "curi"}), ["alasan"]);
  assert.deepEqual(P.badanStok({...ok, delta: "-2,5", liar: 1}), {gudang: "Gudang YonTP", kode_bom: "C-101", nama: "Kopling Storz", delta: -2.5, satuan: "unit", alasan: "pakai"});
});

/* ---------- HTML ---------- */
test("tabelJadwalHtml: tiap status tampil sebagai TEKS (bukan warna saja), nama data di-escape, tombol Catat inspeksi hanya peran tulis", () => {
  const rows = P.susunJadwal(data(), KINI), h = P.tabelJadwalHtml(rows, {peran: "W", kini: KINI, per: KINI});
  for (const t of ["Terlambat", "Segera", "Aman", "Belum pernah"]) assert.ok(h.includes(`>${t}</span>`), `pil ${t} tanpa teks`);
  assert.equal((h.match(/data-catat=/g) || []).length, 8, "satu tombol per butir untuk staf tulis");
  assert.ok(!h.includes("<img src=x"), "nama data tidak di-escape"); assert.ok(h.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.equal(P.tabelJadwalHtml(rows, {peran: "B", kini: KINI, per: KINI}).includes("data-catat="), false, "peran baca tanpa tombol catat");
  assert.match(h, /Sumber: SIPPA D1/); assert.ok(h.includes("lewat 20 hari"), "keterangan lewat jatuh tempo");
  assert.ok(h.includes('data-label="Status"'), "kartu HP butuh data-label");
  assert.equal(P.tabelJadwalHtml([], {peran: "W", kini: KINI, per: KINI}).includes("<table"), false);
  assert.match(P.tabelJadwalHtml([], {peran: "W", kini: KINI, per: KINI}), /Tidak ada butir/);
});

test("isiKartuHtml: kalimat judul, pil asumsi-kebijakan, kit tidak laik gelar berpil teks dengan alasan dan tautan kit", () => {
  const d = data(), rows = P.susunJadwal(d, KINI), laik = P.kitTidakLaik(d, rows), r = P.ringkasan(rows, laik, P.barisStok(d));
  const h = P.isiKartuHtml(r, laik);
  assert.ok(h.includes("2 butir terlambat, 2 kit tidak laik gelar, 2 suku cadang di bawah minimum"));
  assert.ok(h.includes(">asumsi-kebijakan</span>"), "pil asumsi");
  assert.equal((h.match(/>tidak laik gelar</g) || []).length, 2); assert.ok(h.includes("/pipa/kit/" + id("bb")));
  assert.ok(!P.isiKartuHtml(r, []).includes("tidak laik gelar</span>"));
});

test("kalenderHtml, stokHtml, biayaHtml: pita musim bertulisan, pil di bawah minimum, biaya berpil asumsi-kebijakan dan menunggu bila tanpa harga", () => {
  const d = data(), rows = P.susunJadwal(d, KINI);
  const kal = P.kalenderHtml(P.kalender(rows, KINI));
  assert.ok(kal.includes("Karhutla") && kal.includes("Banjir"), "pita musim memakai kata, bukan warna saja"); assert.ok(kal.includes("2 butir sudah lewat jatuh tempo"));
  const st = P.stokHtml(P.barisStok(d), "W");
  assert.equal((st.match(/>di bawah minimum</g) || []).length, 2); assert.ok(st.includes("data-stok"), "tombol Catat stok untuk staf tulis");
  assert.equal(P.stokHtml(P.barisStok(d), "B").includes("data-stok"), false);
  const bi = P.biayaHtml(P.biayaKelas(d));
  assert.ok(bi.includes(">asumsi-kebijakan</span>")); assert.ok(bi.includes("Menunggu")); assert.ok(bi.includes("8%"), "laju K1 tertulis");
  assert.ok(bi.includes("PRD §6.10.7"), "rumus disebut");
});

test("kontrolHtml: chip kelas tunggal (Semua menyala bila tanpa kelas) dan chip status ganda dengan jumlah; status mati tidak menyala", () => {
  const rows = P.susunJadwal(data(), KINI), semua = new Set(P.STATUS_JADWAL);
  const h = P.kontrolHtml(P.hitungChip(rows, {kelas: null, status: semua}), {kelas: null, status: semua});
  assert.ok(h.includes('data-kelas="semua" aria-pressed="true"')); assert.ok(h.includes('data-kelas="K1" aria-pressed="false"'));
  assert.equal((h.match(/data-kelas="/g) || []).length, 10, "Semua + sembilan kelas (K6 dicabut)"); assert.equal((h.match(/data-status="/g) || []).length, 4);
  for (const t of ["Terlambat", "Segera", "Aman", "Belum pernah"]) assert.ok(h.includes(`${t} <span class="num jml">`), t);
  const k1 = P.kontrolHtml(P.hitungChip(rows, {kelas: "K1", status: new Set(["terlambat"])}), {kelas: "K1", status: new Set(["terlambat"])});
  assert.ok(k1.includes('data-kelas="K1" aria-pressed="true"')); assert.ok(k1.includes('data-kelas="semua" aria-pressed="false"'));
  assert.ok(k1.includes('data-status="aman" aria-pressed="false"')); assert.ok(k1.includes('data-status="terlambat" aria-pressed="true"'));
});

test("HTML layar tanpa em dash, titik tengah, toFixed, dan kata terbukti; kode layar tanpa toFixed", () => {
  const d = data(), rows = P.susunJadwal(d, KINI), laik = P.kitTidakLaik(d, rows);
  const semua = [P.tabelJadwalHtml(rows, {peran: "W", kini: KINI, per: KINI}), P.isiKartuHtml(P.ringkasan(rows, laik, P.barisStok(d)), laik), P.kalenderHtml(P.kalender(rows, KINI)), P.stokHtml(P.barisStok(d), "W"), P.biayaHtml(P.biayaKelas(d)),
    P.formInspeksiHtml(ROW_KOMP()), P.formInspeksiHtml(ROW_ASET()), P.formStokHtml(["Gudang A"])].join("\n");
  assert.doesNotMatch(semua, /[—·]/); assert.doesNotMatch(semua, /terbukti/i); assert.doesNotMatch(semua, /toFixed/);
  const kod = readFileSync(new URL("../../public/pipa/layar_pelihara.js", import.meta.url), "utf8");
  assert.doesNotMatch(kod, /toFixed\(/); assert.doesNotMatch(kod, /[—·]/);
});

test("formInspeksiHtml dan formStokHtml: segmen skor berlabel kata, jam operasi hanya K1, E. coli hanya untuk mutu air, jenis dari kelas, gudang dari daftar", () => {
  const k1 = P.formInspeksiHtml(ROW_KOMP()), a = P.formInspeksiHtml(ROW_ASET());
  for (const t of P.SKOR_KATA) assert.ok(k1.includes(t), t);
  assert.ok(k1.includes('name="jam_operasi"')); assert.equal(a.includes('name="jam_operasi"'), false);
  assert.ok(a.includes('name="e_coli_cfu"')); assert.ok(a.includes('value="mutu_air"')); assert.equal(k1.includes('value="mutu_air"'), false);
  assert.equal(k1.includes('name="tekanan_bar"'), false, "tekanan hanya untuk kelas K2");
  const k2 = P.formInspeksiHtml({...ROW_KOMP(), kelas: "K2"}); assert.ok(k2.includes('name="tekanan_bar"'));
  const s = P.formStokHtml(["Gudang A", "Gudang <b>B</b>"]); assert.ok(s.includes('value="Gudang A"')); assert.ok(s.includes("Gudang &lt;b&gt;B&lt;/b&gt;"));
});
