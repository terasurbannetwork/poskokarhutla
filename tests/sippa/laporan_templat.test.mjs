/* SP-044: empat templat laporan sisa (kejadian, mingguan, musim, skenario), penyaring bahan (dummy dan wilayah), dan jalur bahan dari jawaban API.
   Aturan isi PRD §9.10 dijaga untuk semua lima templat: sumber dan waktu di tiap angka, tanpa kata terlarang, nama berkas, kaki, hanya logo BNPB. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const muat = (p, ekspor) => (0, eval)(readFileSync(new URL(`../../public/inti/${p}`, import.meta.url), "utf8").replace(/^"use strict";?/, "") + `;${ekspor}`);
muat("format.js", "globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;"); muat("tabel.js", "globalThis.paginasi=paginasi;");

const baca = p => readFileSync(new URL(`../../${p}`, import.meta.url));
function muatJsPDF() { const exp = {}, m = {exports: exp}; new Function("exports", "module", baca("public/vendor/jspdf/jspdf.umd.min.js").toString("utf8")).call(globalThis, exp, m); return exp.jsPDF; }
const T = await import("../../public/pipa/laporan_templat.js"), M = await import("../../public/pipa/layar_laporan.js"), {isiLaporan} = await import("../../public/pipa/laporan_isi.js");
const P = await import("../../public/pipa/laporan_pdf.js");
const J = 3600e3, HARI = 24 * J, PER = Date.parse("2026-12-14T10:30:00+07:00"), SEJAK = Date.parse("2026-12-07T00:00:00+07:00"), T0 = Date.parse("2026-12-08T01:00:00+07:00");
const RENTANG = {dari: "2026-12-07", sampai: "2026-12-14"};
const log = (id, o = {}) => ({id, jenis: "karhutla", prov: "62", kit_id: "k1", kit_kode: "SIPPA-001", tugas_id: "t1", kelas_medan: "I", petak_id: "P1", t_tiba: T0, t_mulai_gelar: T0 + J, t_air_mengalir: T0 + 4 * J, t_selesai: T0 + 9 * J, t_bongkar_selesai: T0 + 11 * J,
  jam_pompa: 6, bbm_l: 30, air_m3: 100, banjir_m3: 0, panjang_m: 800, n_orang: 6, kab: "Pulang Pisau", dummy: 0, ...o});
const teksSemua = o => typeof o === "string" ? [o] : o && typeof o === "object" ? Object.values(o).flatMap(teksSemua) : [];
const OPSI = {per: PER, prov: "62", provNama: "Kalimantan Tengah", rentang: {dari: SEJAK, sampai: PER}};

/* bahan lengkap untuk kelima templat */
const KIT = (id, kode, prov = "62") => ({kit: {id, kode, prov, dummy: 0}, komponen: [{id: id + "c1", kit_id: id, kode_bom: "P-101", kondisi: "baik", dummy: 0}, {id: id + "c2", kit_id: id, kode_bom: "H-101", kondisi: "hilang", dummy: 0}],
  gerak: [{id: id + "g1", kit_id: id, dari_status: "gudang", ke_status: "gelar", alasan: "gelar", waktu: T0, kab: "Pulang Pisau", dummy: 0}], tugas: [{id: "t1", kit_id: id, nama_regu: "Regu Alfa", prov, kab: "Pulang Pisau", mulai: T0, berakhir: null, dicabut: null, dummy: 0}], bbm: []});
const API = {log: [log("a"), log("b", {jenis: "banjir", banjir_m3: 240, t_tiba: T0 + HARI}), log("c", {jenis: "latihan", t_tiba: T0 + 2 * HARI})], probe: [{log_id: "a", petak_id: "P1", titik: 1, tahap: "sebelum", kedalaman_cm: 10, suhu_c: 60}, {log_id: "a", petak_id: "P1", titik: 1, tahap: "24j", kedalaman_cm: 10, suhu_c: 35}],
  kit: [KIT("k1", "SIPPA-001")], alarm: [{id: "al1", kit_id: "k1", kit_kode: "SIPPA-001", prov: "62", kode: "dry_run", tag: "PT-102", nilai: 0.4, mulai: T0 + 3 * J, ditutup: null, dummy: 0}],
  ab: {petak: [], unggah: []}, skenario: [{id: "s1", nama: "Skenario A", ringkas: {vonis: "KONDISIONAL", capex: 5230000000, tco: 8960000000, keras: 0}, dummy: 0}], prov: "62", rentang: RENTANG};
const bahan = (jenis, tambah = {}) => M.bahanTemplat(jenis, {...API, sesiId: "a", ...tambah});
const lap = (jenis, tambah) => T.isiTemplat(jenis, bahan(jenis, tambah), OPSI);

/* ---------- aturan isi untuk ke-4 templat baru ---------- */
test("jenis laporan: lima jenis aktif di layar, isiTemplat menolak jenis liar dan per hilang, kejadian tanpa sesi ditolak", () => {
  assert.deepEqual(M.JENIS_AKTIF, ["pilot", "kejadian", "mingguan", "musim", "skenario"]);
  assert.throws(() => T.isiTemplat("pilot", {}, OPSI), /tidak dikenal/); assert.throws(() => T.isiTemplat("mingguan", {}, {}), /per wajib/); assert.throws(() => T.isiTemplat("kejadian", {}, OPSI), /satu sesi gelar/);
  assert.deepEqual(M.cekForm({jenis: "mingguan", ...RENTANG}), []); assert.equal(M.cekForm({jenis: "x", ...RENTANG})[0].medan, "jenis"); assert.equal(M.cekForm({jenis: "musim", dari: "", sampai: ""}).length, 2);
});
test("PRD 9.10: nama berkas sippa-<jenis>-<prov>-<YYYYMMDD>.pdf, kaki persis, hanya logo BNPB, tanda tangan", () => {
  for (const j of T.JENIS_TEMPLAT) {
    const l = lap(j); assert.equal(l.nama_berkas, `sippa-${j}-62-20261214.pdf`, j);
    assert.equal(l.kaki, `Dibuat otomatis dari data SIPPA per ${jamWIB(PER)}. Bukan dokumen resmi sebelum ditandatangani pejabat berwenang.`);
    assert.deepEqual(l.aset, ["/img/lembaga/sumber-bnpb.png"]); assert.equal(l.tanda_tangan.length, 5);
  }
  assert.equal(T.isiTemplat("mingguan", bahan("mingguan"), {per: PER}).nama_berkas, "sippa-mingguan-nasional-20261214.pdf");
});
test("L1: tiap angka, tabel, dan paragraf berangka di keempat templat membawa sumber dan waktu; tanpa kata terlarang; data kosong tidak jadi nol palsu", () => {
  const kosongan = {log: [], probe: [], gerak: [], alarm: [], tugas: [], komponen: [], bbm: [], ab: [], skenario: [], gerbang: [], pelajaran: []};
  for (const j of T.JENIS_TEMPLAT) for (const d of [bahan(j), j === "kejadian" ? null : kosongan]) {
    if (!d) continue; const l = T.isiTemplat(j, d, OPSI), cacat = [];
    l.blok.forEach((b, i) => { const wajib = b.tipe === "angka" || b.tipe === "tabel" || (b.tipe === "paragraf" && /\d/.test(b.teks)); if (wajib && !(typeof b.sumber === "string" && b.sumber.length > 5 && typeof b.waktu === "string" && b.waktu.length > 3)) cacat.push(`${j} blok ${i} ${b.tipe} tanpa sumber atau waktu`); });
    assert.deepEqual(cacat, []);
    for (const t of teksSemua(l)) { assert.doesNotMatch(t, /terbukti/i, t); assert.doesNotMatch(t, /[—·]/, t); assert.doesNotMatch(t, /titik api/i, t); assert.doesNotMatch(t, /undefined|NaN|null/, t); assert.doesNotMatch(t, /100%/, t); }
  }
});
test("pil keyakinan di tiap templat memakai kelas yang dikenal perender (terverifikasi, hipotesis, asumsi-kebijakan)", () => {
  for (const j of T.JENIS_TEMPLAT) for (const b of lap(j).blok.filter(x => x.tipe === "pil" || x.tipe === "angka")) assert.ok(["terverifikasi", "hipotesis", "asumsi-kebijakan", "estimasi-model", "resmi", "menunggu"].includes(b.kelas ?? b.keyakinan), `${j}: ${b.kelas ?? b.keyakinan}`);
});

/* ---------- kejadian ---------- */
test("kejadian: lokasi, kit, regu, garis waktu enam tahap berselang, angka sesi, probe milik sesi itu saja, tanpa CO2 palsu bila jenis BBM tak tercatat", () => {
  const l = lap("kejadian"), tabel = l.blok.filter(b => b.tipe === "tabel");
  assert.equal(l.blok.find(b => b.tipe === "paragraf").teks.startsWith("Kejadian di Pulang Pisau,"), true);
  const lokasi = tabel[0].baris; assert.deepEqual(lokasi.find(r => r[0] === "Kit"), ["Kit", "SIPPA-001"]); assert.deepEqual(lokasi.find(r => r[0] === "Regu"), ["Regu", "Regu Alfa"]);
  const waktu = tabel[1].baris; assert.equal(waktu.length, 6); assert.equal(waktu[3][1], "–", "mulai injeksi tak tercatat = strip"); assert.equal(waktu[2][2], "3 jam", "air mengalir 3 jam sesudah mulai gelar");
  const co2 = tabel[2].baris.find(r => r[0] === "CO2 dari BBM"); assert.equal(co2[1], "–"); assert.ok(teksSemua(l).some(t => /CO2 BBM tidak dihitung/.test(t)));
  assert.equal(tabel.find(t => t.judul.startsWith("Probe")).baris[0][0], "P1");
  const dgn = T.isiTemplat("kejadian", {...bahan("kejadian"), log: {...log("a"), bbm_jenis: "solar"}}, OPSI); assert.equal(dgn.blok.filter(b => b.tipe === "tabel")[2].baris.find(r => r[0] === "CO2 dari BBM")[1], "80,4", "30 L x 2,68");
  assert.deepEqual(bahan("kejadian", {sesiId: "tidak-ada"}).log, null);
  const lain = bahan("kejadian", {probe: [...API.probe, {log_id: "b", petak_id: "P9", titik: 1, tahap: "sebelum", kedalaman_cm: 10, suhu_c: 99}]}); assert.ok(lain.probe.every(p => p.petak_id === "P1"), "probe sesi lain tidak ikut");
});

/* ---------- mingguan ---------- */
test("mingguan: gerak kit, pemakaian per kit dan kabupaten, BBM, kehilangan 1 dari 2, alarm, tugas aktif sama dengan data", () => {
  const l = lap("mingguan"), tabel = j => l.blok.find(b => b.tipe === "tabel" && b.judul.startsWith(j));
  assert.equal(tabel("Gerak kit").baris[0][4], "Gelar");
  const pakai = tabel("Pemakaian per kit").baris[0]; assert.deepEqual(pakai.slice(0, 2), ["SIPPA-001", "Pulang Pisau"]); assert.equal(pakai[2], "3", "tiga sesi (karhutla, banjir, latihan)"); assert.equal(pakai[3], "18", "jam pompa 6 x 3"); assert.equal(pakai[4], "240");
  assert.deepEqual(tabel("Kehilangan").baris[0], ["SIPPA-001", "2", "1", "50%"]);
  assert.equal(tabel("Alarm").baris[0][3], "Pompa kering"); assert.equal(tabel("Alarm").baris[0][5], "masih aktif");
  assert.equal(tabel("Tugas aktif").baris[0][0], "Regu Alfa");
  assert.deepEqual(T.ringkasPerKit([log("a"), log("b", {kab: null, tugas_id: "tx"})], []).map(p => p.kab), ["Pulang Pisau", "tidak tercatat"]);
  assert.equal(T.tugasAktif([{id: 1, mulai: 5, berakhir: null}, {id: 2, mulai: 5, berakhir: 6}, {id: 3, mulai: 5, dicabut: 9}, {id: 4, mulai: 50}], 10).map(t => t.id).join(), "1");
});

/* ---------- musim ---------- */
test("musim: kelas medan dengan p50 dan p90 dan n kecil, latihan G6 terpisah dari sesi nyata, pemakaian ganda U9, kehilangan U8, status G0 sampai G6", () => {
  const l = lap("musim", {gerbang: [{kode: "G0", status: "lulus"}], pelajaran: "Selang kopling perlu cadangan"}), tabel = j => l.blok.find(b => b.tipe === "tabel" && b.judul.startsWith(j));
  const kls = tabel("Gelar per kelas").baris; assert.equal(kls.length, 1, "latihan tidak masuk hitungan kelas"); assert.equal(kls[0][5], "n kecil");
  assert.deepEqual(T.pemakaianGanda([log("a"), log("b", {jenis: "banjir", banjir_m3: 10})]).ganda, ["SIPPA-001"]); assert.deepEqual(T.pemakaianGanda([log("a"), log("c", {jenis: "latihan"})]).ganda, []);
  assert.ok(teksSemua(l).some(t => /Kit yang dipakai di karhutla dan banjir/.test(t))); assert.ok(teksSemua(l).some(t => /1 sesi latihan tercatat/.test(t)));
  assert.equal(tabel("Status gerbang").baris.length, 7); assert.equal(tabel("Status gerbang").baris[0][1], "lulus"); assert.equal(tabel("Status gerbang").baris[6][1], "belum dinilai");
  assert.ok(l.blok.some(b => b.tipe === "paragraf" && b.teks === "Selang kopling perlu cadangan"));
  assert.ok(l.blok.some(b => b.tipe === "pil" && b.teks === "hipotesis"), "bagian A/B berpil hipotesis");
  const p = T.perKelas([log("a"), log("b", {t_air_mengalir: T0 + 8 * J}), log("c", {kelas_medan: "II"})]); assert.deepEqual(p.map(x => [x.kelas, x.sesi, x.n]), [["I", 2, 2], ["II", 1, 1]]);
});
test("musim: ringkasan A/B per lengan dari petak nyata; baris dummy tidak ikut; pilot tampil 'tidak divonis'", () => {
  const petak = (l, i, o = {}) => ({petak_id: `${l}${i}`, aoi: "KTG", prov: "62", lengan: l, tanggal_perlakuan: "2026-12-20", luas_m2: 4000, regu_hari: 4, biaya_rp: 1e6, dingin_72j: 1, nyala_30h: 0, unggah_id: "u", ...o});
  const ab = {petak: [...Array.from({length: 3}, (_, i) => petak("konvensional", i)), ...Array.from({length: 3}, (_, i) => petak("lance", i)), petak("lance", 9, {dummy: 1}), petak("lance", 8, {prov: "61"})], unggah: [{id: "u", status: "draf"}]};
  const d = bahan("musim", {ab}), lance = d.ab.find(x => x.nama === "Lance"); assert.equal(lance.n, 3, "dummy dan provinsi lain keluar"); assert.equal(lance.keterangan, "hipotesis");
});

/* ---------- skenario ---------- */
test("skenario: matriks banding dari ringkas tersimpan, NPV dan BCR menyatakan manfaat bawaan 0, batas alat G22 dan G23 persis dari batas.js, dummy tidak ikut", async () => {
  const {BATAS_ALAT} = await import("../../public/pipa/batas.js"), l = lap("skenario");
  const m = l.blok.find(b => b.tipe === "tabel" && b.judul.startsWith("Matriks")); assert.deepEqual(m.baris[0], ["Skenario A", "KONDISIONAL", "5.230.000.000", "8.960.000.000", "0"]);
  assert.ok(l.blok.some(b => b.tipe === "paragraf" && /Manfaat bawaan 0/.test(b.teks)));
  for (const t of BATAS_ALAT) assert.ok(l.blok.some(b => b.tipe === "paragraf" && b.teks === t), t.slice(0, 40));
  assert.ok(!JSON.stringify(l.blok).includes('"GO"'), "tidak ada vonis GO");
  const d = M.bahanTemplat("skenario", {...API, skenario: [...API.skenario, {id: "s2", nama: "Dummy B", ringkas: {}, dummy: 1}]}); assert.deepEqual(d.skenario.map(s => s.nama), ["Skenario A"]);
  assert.ok(T.isiTemplat("skenario", {skenario: []}, OPSI).blok.some(b => b.tipe === "paragraf" && /Belum ada skenario dipilih/.test(b.teks)));
});

/* ---------- penjaga: dummy dan wilayah tidak bocor ke laporan mingguan dan pilot (kegagalan tinjauan SP-044) ---------- */
const DUMMY = {log: [log("a"), log("d", {dummy: 1, kit_kode: "SIPPA-903", tugas_id: "td"})], probe: [{log_id: "d", petak_id: "PD", titik: 1, tahap: "sebelum", suhu_c: 99, dummy: 1}, {log_id: "a", petak_id: "P1", titik: 1, tahap: "sebelum", suhu_c: 60}, {log_id: null, tugas_id: "td", petak_id: "PZ", titik: 1, tahap: "sebelum", suhu_c: 98}],
  kit: [KIT("k1", "SIPPA-001"), {...KIT("k9", "SIPPA-903"), kit: {id: "k9", kode: "SIPPA-903", prov: "62", dummy: 1}}], alarm: [{id: "ad", kit_id: "k9", kit_kode: "SIPPA-903", prov: "62", kode: "diam", mulai: T0, dummy: 1}], prov: "62", rentang: RENTANG};
test("mingguan: baris dummy (log, gerak, tugas, komponen, alarm, probe) tidak pernah masuk laporan nyata", () => {
  const l = T.isiTemplat("mingguan", M.bahanTemplat("mingguan", DUMMY), OPSI), teks = teksSemua(l).join("\n");
  assert.doesNotMatch(teks, /SIPPA-903|PD\b|dummy/i); assert.match(teks, /SIPPA-001/);
  const b = M.bahanTemplat("mingguan", {...DUMMY, kit: [...DUMMY.kit.slice(0, 1), {...KIT("k9", "SIPPA-903"), kit: {id: "k9", kode: "SIPPA-903", prov: "62", dummy: 0}, gerak: [{id: "gd", kit_id: "k9", dari_status: "gudang", ke_status: "gelar", alasan: "gelar", waktu: T0, dummy: 1}], komponen: [{id: "cd", kit_id: "k9", kode_bom: "P-101", kondisi: "hilang", dummy: 1}]}]});
  assert.equal(b.gerak.filter(g => g.id === "gd").length, 0); assert.equal(b.komponen.filter(c => c.id === "cd").length, 0);
});
test("pilot: probe dummy dan probe anak log dummy tidak ikut; komponen dummy tidak dihitung dalam kembali berfungsi", () => {
  const b = M.bahanPilot({log: DUMMY.log, probe: DUMMY.probe, kit: [{komponen: [{kode_bom: "A", kondisi: "baik", dummy: 0}, {kode_bom: "B", kondisi: "hilang", dummy: 1}]}], kendala: "", prov: "62", rentang: RENTANG});
  assert.deepEqual(b.log.map(l => l.id), ["a"]); assert.ok(b.probe.every(p => p.suhu_c < 90), "probe dummy bocor"); assert.deepEqual(b.probe.map(p => p.petak_id), ["P1"], "probe log dummy, probe dummy, dan probe anak tugas log dummy semuanya keluar");
  assert.deepEqual(b.komponen_kembali, [{kode_bom: "A", kondisi: "baik"}]);
});
test("wilayah: log provinsi lain dan log tanpa provinsi tanpa kit berprovinsi sama tidak masuk laporan provinsi; log tanpa provinsi milik kit provinsi itu masuk", () => {
  const rows = [log("a"), log("lain", {prov: "61"}), log("nol", {prov: null, kit_prov: null}), log("kit", {prov: null, kit_prov: "62"}), log("kit-lain", {prov: null, kit_prov: "61"})];
  assert.deepEqual(M.bahanPilot({log: rows, probe: [], kit: [], kendala: "", prov: "62", rentang: RENTANG}).log.map(l => l.id), ["a", "kit"]);
  assert.deepEqual(T.saringBahan({log: rows}, {prov: "62"}).log.map(l => l.id), ["a", "kit"]);
  assert.equal(T.saringBahan({log: rows}, {}).log.length, 5, "tanpa provinsi (nasional) semua wilayah");
  const w = M.bahanTemplat("mingguan", {...API, kit: [KIT("k1", "SIPPA-001"), KIT("k2", "SIPPA-LAIN", "61")], alarm: [...API.alarm, {id: "al2", kit_id: "k2", kit_kode: "SIPPA-LAIN", prov: "61", kode: "diam", mulai: T0, dummy: 0}]});
  assert.ok(!JSON.stringify(w).includes("SIPPA-LAIN"), "kit dan alarm provinsi lain bocor");
});
test("saringBahan: jendela waktu, log berpenerus koreksi, alarm di luar rentang, dan anak log terbuang", () => {
  const d = T.saringBahan({log: [log("a"), log("a2", {koreksi_dari: "a"}), log("lama", {t_tiba: SEJAK - 3 * HARI})], probe: [{log_id: "a", suhu_c: 1}, {log_id: "lama", suhu_c: 2}, {log_id: "a2", suhu_c: 3}],
    alarm: [{id: 1, kit_id: "k1", prov: "62", mulai: PER + HARI}, {id: 2, kit_id: "k1", prov: "62", mulai: T0, ditutup: T0 + J}, {id: 3, kit_id: "k1", prov: "62", mulai: SEJAK - 5 * HARI, ditutup: SEJAK - 4 * HARI}], kit: [{id: "k1", prov: "62"}]}, {prov: "62", sejak: SEJAK, sampai: PER});
  assert.deepEqual(d.log.map(l => l.id), ["a2"]); assert.deepEqual(d.probe.map(p => p.suhu_c), [3]); assert.deepEqual(d.alarm.map(a => a.id), [2]);
});
test("bahanTemplat tidak mengubah masukan dan teks data (nama regu, kab) di laporan tetap teks polos untuk perender HTML", () => {
  const salin = JSON.stringify(API); bahan("mingguan"); assert.equal(JSON.stringify(API), salin);
  const kit = KIT("k1", "SIPPA-001"); kit.tugas[0].nama_regu = "<img src=x onerror=1>";
  const l = T.isiTemplat("mingguan", M.bahanTemplat("mingguan", {...API, kit: [kit]}), OPSI), h = P.pratinjauHtml(l);
  assert.doesNotMatch(h, /<img/); assert.ok(teksSemua(l).some(t => t.includes("<img src=x onerror=1>")), "blok membawa teks apa adanya; pelolosan di perender HTML");
});
test("pdf: keempat templat menjadi PDF sungguhan (berawalan %PDF-) lewat perender yang sama dengan pilot", async () => {
  for (const j of T.JENIS_TEMPLAT) {
    const l = lap(j), pdf = await P.buatPdf(l, {jsPDF: muatJsPDF(), roboto: {}, logo: null});
    assert.equal(Buffer.from(pdf.byte.slice(0, 5)).toString(), "%PDF-", j); assert.ok(pdf.halaman >= 1, j); assert.equal(pdf.nama, `sippa-${j}-62-20261214.pdf`);
  }
});
test("berkas laporan_templat.js: tanpa toFixed, kata terlarang, Date.now, atau DOM", () => {
  const t = readFileSync(new URL("../../public/pipa/laporan_templat.js", import.meta.url), "utf8");
  assert.doesNotMatch(t, /toFixed\(|Date\.now|document\.|innerHTML/); assert.doesNotMatch(t, /[—·]/); assert.doesNotMatch(t, /terbukti/i);
});
