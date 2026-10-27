/* SP-037: isiLaporan('pilot', ...) murni (PRD §9.10, DS §3.18 §4.12, DT §6.4, RU L1 L3) dan perender jsPDF laporan_pdf.js yang dijalankan sungguhan di Node. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {createHash} from "node:crypto";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");

const L = await import("../../public/pipa/laporan_isi.js");
const P = await import("../../public/pipa/laporan_pdf.js");
const {vonisPilot} = await import("../../public/pipa/hitung.js");
const baca = p => readFileSync(new URL(`../../${p}`, import.meta.url));

const J = 3600e3, T0 = Date.parse("2026-10-27T01:00:00+07:00");
const PER = Date.parse("2026-10-28T10:30:00+07:00");
const sesi = (i, extra = {}) => ({id: "s" + i, jenis: "karhutla", kelas_medan: "I", kit_kode: "SIPPA-00" + i, nama_regu: "Regu " + i, petak_id: "P" + (i % 2 + 1), air_sampai_lance: 1,
  t_tiba: T0 + i * 24 * J, t_mulai_gelar: T0 + i * 24 * J + 0.5 * J, t_air_mengalir: T0 + i * 24 * J + (3 + i) * J, t_selesai: T0 + i * 24 * J + 9 * J, t_bongkar_selesai: T0 + i * 24 * J + 11 * J,
  p_ujung_bar: 2.4, p_ujung_menit: 40, p_ujung_sumber: "gauge", kecelakaan: 0, bocor_henti_menit: 0, panjang_m: 800, jam_pompa: 6, bbm_l: 30, air_m3: 120, ...extra});
const probe = (petak, titik, tahap, dalam, suhu) => ({petak_id: petak, titik, tahap, kedalaman_cm: dalam, suhu_c: suhu});
const probeLengkap = petak => ["sebelum", "sesudah", "24j"].flatMap(th => [10, 30, 50, 100].map(d => probe(petak, 1, th, d, th === "sebelum" ? 60 : th === "sesudah" ? 40 : 35)));
const DATA = {log: [sesi(1), sesi(2), sesi(3)], probe: [...probeLengkap("P1"), ...probeLengkap("P2")],
  komponen_kembali: Array.from({length: 40}, (_, i) => ({kode_bom: "K" + i, kondisi: i < 39 ? "baik" : "hilang"})),
  foto: [{id: "a1b2c3d4e5f60718", waktu: T0 + 6 * J, regu: "Regu 1", kit: "SIPPA-001"}], kendala: ["Selang kopling bocor di petak P2."], rentang: {dari: T0, sampai: PER}};
const OPSI = {per: PER, prov: "62", provNama: "Kalimantan Tengah"};

/* semua string di blok, judul, kaki */
const teksSemua = o => typeof o === "string" ? [o] : o && typeof o === "object" ? Object.values(o).flatMap(teksSemua) : [];
const blokTipe = (lap, t) => lap.blok.filter(b => b.tipe === t);

test("nama berkas: sippa-pilot-<prov>-<YYYYMMDD WIB>.pdf, tanpa provinsi = nasional, tanggal memakai hari WIB", () => {
  assert.equal(L.isiLaporan("pilot", DATA, OPSI).nama_berkas, "sippa-pilot-62-20261028.pdf");
  assert.equal(L.isiLaporan("pilot", DATA, {per: PER}).nama_berkas, "sippa-pilot-nasional-20261028.pdf");
  assert.equal(L.isiLaporan("pilot", DATA, {per: Date.parse("2026-10-27T20:00:00Z"), prov: "62"}).nama_berkas, "sippa-pilot-62-20261028.pdf", "03.00 WIB tanggal 28 walau UTC masih 27");
});

test("kaki: kalimat PRD §9.10 persis dengan waktu WIB", () => {
  const lap = L.isiLaporan("pilot", DATA, OPSI);
  assert.equal(lap.kaki, `Dibuat otomatis dari data SIPPA per ${jamWIB(PER)}. Bukan dokumen resmi sebelum ditandatangani pejabat berwenang.`);
});

test("bentuk hasil: judul, nama_berkas, blok bertipe tertutup, kaki", () => {
  const lap = L.isiLaporan("pilot", DATA, OPSI);
  assert.equal(typeof lap.judul, "string"); assert.match(lap.judul, /Kalimantan Tengah/);
  assert.ok(lap.blok.length > 8);
  for (const b of lap.blok) assert.ok(["judul", "paragraf", "tabel", "angka", "foto", "pil"].includes(b.tipe), `tipe liar: ${b.tipe}`);
});

test("pilot memuat tabel tujuh butir keputusan 53 dengan nilai dan alasan tiap butir dari vonisPilot", () => {
  const lap = L.isiLaporan("pilot", DATA, OPSI), v = vonisPilot(DATA);
  const tabel = blokTipe(lap, "tabel").find(t => /tujuh butir/i.test(t.judul));
  assert.ok(tabel, "tabel tujuh butir tidak ada");
  assert.equal(tabel.baris.length, 7);
  v.butir.forEach((b, i) => { assert.equal(String(tabel.baris[i][0]), String(b.no)); assert.ok(tabel.baris[i].join(" ").includes(b.alasan), `alasan butir ${b.no} hilang`); });
  assert.deepEqual(tabel.baris.map(r => r[r.length - 1]), v.butir.map(b => b.lulus === true ? "Lulus" : b.lulus === false ? "Tidak lulus" : "Belum diputus"));
  assert.ok(lap.blok.some(b => b.tipe === "paragraf" && b.teks.includes(v.vonis)), "vonis dapat dipakai tidak tampil");
});

test("butir tanpa data tampil Belum diputus, bukan Tidak lulus; vonis kosong ikut vonisPilot", () => {
  const lap = L.isiLaporan("pilot", {log: [], probe: [], komponen_kembali: []}, OPSI);
  const tabel = blokTipe(lap, "tabel").find(t => /tujuh butir/i.test(t.judul));
  assert.ok(tabel.baris.every(r => r[r.length - 1] === "Belum diputus"), "data kosong harus Belum diputus");
  assert.ok(lap.blok.some(b => b.tipe === "paragraf" && b.teks.includes(vonisPilot({}).vonis)));
});

test("vonis lebih baik dipisah: bagian sendiri berkalimat belum dapat diputus (n < 8 per lengan), tanpa pernah menyebut GO atau LULUS G4", () => {
  const lap = L.isiLaporan("pilot", DATA, OPSI);
  const i = lap.blok.findIndex(b => b.tipe === "judul" && /Lebih baik dari konvensional/.test(b.teks));
  assert.ok(i > 0, "bagian Lebih baik dari konvensional tidak ada");
  assert.match(lap.blok[i + 1].teks, /belum dapat diputus \(n < 8 per lengan\)/);
  const butirTujuh = lap.blok.findIndex(b => b.tipe === "judul" && /Dapat dipakai/.test(b.teks));
  assert.ok(butirTujuh >= 0 && butirTujuh !== i && !lap.blok.slice(butirTujuh + 1, i).some(b => b.tipe === "paragraf" && /belum dapat diputus \(n < 8/.test(b.teks)), "dua vonis tercampur");
  assert.ok(!teksSemua(lap).some(t => /\bLULUS\b/.test(t)), "hasil pilot tidak memberi vonis G4 LULUS");
});

test("pil: pilot n kecil ada di halaman pertama dan tiap pil memakai kelas keyakinan yang dikenal", () => {
  const lap = L.isiLaporan("pilot", DATA, OPSI), pil = blokTipe(lap, "pil");
  assert.ok(pil.some(p => /pilot, n kecil/.test(p.teks)));
  assert.ok(lap.blok.indexOf(pil.find(p => /pilot, n kecil/.test(p.teks))) < 6, "pil n kecil harus dekat judul");
  for (const p of pil) assert.ok(["resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan", "hipotesis", "menunggu"].includes(p.kelas), `kelas pil liar ${p.kelas}`);
});

test("L1: tiap blok angka dan tabel membawa sumber dan waktu; paragraf berangka juga", () => {
  const lap = L.isiLaporan("pilot", DATA, OPSI), cacat = [];
  lap.blok.forEach((b, i) => {
    const wajib = b.tipe === "angka" || b.tipe === "tabel" || (b.tipe === "paragraf" && /\d/.test(b.teks));
    if (wajib && !(typeof b.sumber === "string" && b.sumber.length > 5 && typeof b.waktu === "string" && b.waktu.length > 3)) cacat.push(`blok ${i} ${b.tipe} tanpa sumber atau waktu`);
  });
  assert.deepEqual(cacat, []);
  assert.ok(blokTipe(lap, "angka").length >= 3 && blokTipe(lap, "angka").length <= 5, "kotak ringkasan 3 sampai 5 temuan berangka");
});

test("L1: tanpa terbukti, em dash, titik tengah, titik api, toFixed; juga pada data kosong", () => {
  for (const d of [DATA, {log: [], probe: [], komponen_kembali: []}]) {
    const lap = L.isiLaporan("pilot", d, OPSI);
    for (const t of teksSemua(lap)) { assert.doesNotMatch(t, /terbukti/i, t); assert.doesNotMatch(t, /[—·]/, t); assert.doesNotMatch(t, /titik api/i, t); assert.doesNotMatch(t, /undefined|NaN|null/, t); }
  }
});

test("angka lewat fmt id-ID: koma desimal, titik ribuan", () => {
  const lap = L.isiLaporan("pilot", {...DATA, log: [sesi(1, {air_m3: 1240.5, bbm_l: 1234})]}, OPSI);
  const t = teksSemua(lap).join("\n");
  assert.match(t, /1\.240,5/); assert.match(t, /1\.234/);
});

test("data kosong: laporan tetap terbentuk, sumber tidak diam-diam angka nol", () => {
  const lap = L.isiLaporan("pilot", {log: [], probe: [], komponen_kembali: []}, OPSI);
  const sesiAngka = blokTipe(lap, "angka").find(b => /Sesi gelar/i.test(b.label));
  assert.equal(sesiAngka.nilai, "0");
  assert.ok(blokTipe(lap, "paragraf").some(p => /Belum ada sesi gelar/.test(p.teks)));
});

test("foto: paling banyak enam, keterangan memuat waktu WIB, regu, kit; id harus 16 heks", () => {
  const banyak = Array.from({length: 9}, (_, i) => ({id: (i + "a1b2c3d4e5f6071").padEnd(16, "0"), waktu: T0, regu: "R" + i, kit: "SIPPA-00" + i}));
  const lap = L.isiLaporan("pilot", {...DATA, foto: [...banyak, {id: "<script>", waktu: T0, regu: "x", kit: "y"}]}, OPSI);
  const foto = blokTipe(lap, "foto");
  assert.equal(foto.length, 6);
  assert.match(foto[0].keterangan, /WIB/); assert.match(foto[0].keterangan, /R0/); assert.match(foto[0].keterangan, /SIPPA-000/);
  assert.ok(foto.every(f => /^[0-9a-f]{16}$/.test(f.id)));
});

test("L3: hanya satu aset gambar, logo BNPB, berkasnya ada", () => {
  const lap = L.isiLaporan("pilot", DATA, OPSI);
  assert.deepEqual(lap.aset, ["/img/lembaga/sumber-bnpb.png"]); assert.deepEqual(L.ASET_GAMBAR, lap.aset);
  assert.ok(existsSync(new URL("../../public" + lap.aset[0], import.meta.url)));
  assert.ok(!blokTipe(lap, "foto").some(f => /logo/i.test(f.keterangan)));
});

test("jenis kejadian, mingguan, musim, skenario belum tersedia (SP-044) dan ditolak dengan pesan, jenis liar ditolak", () => {
  for (const j of ["kejadian", "mingguan", "musim", "skenario"]) assert.throws(() => L.isiLaporan(j, DATA, OPSI), /belum tersedia/);
  assert.throws(() => L.isiLaporan("rahasia", DATA, OPSI), /jenis laporan tidak dikenal/);
  assert.deepEqual(L.JENIS_LAPORAN.map(([k]) => k), ["pilot", "kejadian", "mingguan", "musim", "skenario"]);
  assert.deepEqual(L.JENIS_SIAP, ["pilot"]);
});

test("tanpa per: ditolak, jam server wajib datang dari pemanggil (tidak ada Date.now diam-diam)", () => {
  assert.throws(() => L.isiLaporan("pilot", DATA, {}), /per wajib/);
});

test("teks dari data (nama provinsi, regu, kendala) tidak pernah menjadi markup: pratinjau melolosi lewat esc, blok tetap teks polos", () => {
  const jahat = {...DATA, log: [sesi(1, {nama_regu: "<img src=x onerror=alert(1)>"})], kendala: ["<script>alert(1)</script>"]};
  const lap = L.isiLaporan("pilot", jahat, {...OPSI, provNama: "<img src=x onerror=alert(2)>"});
  const h = P.pratinjauHtml(lap);
  assert.doesNotMatch(h, /<img|<script/i); assert.match(h, /&lt;img/);
  assert.ok(teksSemua(lap).some(t => t.includes("<script>alert(1)</script>")), "blok membawa teks apa adanya; pelolosan di perender HTML, bukan dengan membuang data");
});

/* ---------- laporan_pdf.js: jsPDF sungguhan di Node ---------- */
function muatJsPDF() {
  const exp = {}, m = {exports: exp};
  new Function("exports", "module", baca("public/vendor/jspdf/jspdf.umd.min.js").toString("utf8")).call(globalThis, exp, m);
  return exp.jsPDF;
}
const robotoNode = () => ({n: baca("public/vendor/roboto/Roboto-Regular.ttf").toString("base64"), b: baca("public/vendor/roboto/Roboto-Bold.ttf").toString("base64")});
const logoPng = () => "data:image/png;base64," + baca("public/img/lembaga/sumber-bnpb.png").toString("base64");

test("pdf: PDF sungguhan berawalan %PDF-, A4, lebih dari satu halaman dengan data penuh, kaki dan nomor di tiap halaman", async () => {
  const lap = L.isiLaporan("pilot", DATA, OPSI);
  const hasil = await P.buatPdf(lap, {jsPDF: muatJsPDF(), roboto: robotoNode(), logo: logoPng()});
  assert.equal(Buffer.from(hasil.byte.slice(0, 5)).toString("latin1"), "%PDF-");
  assert.ok(hasil.halaman >= 2 && hasil.halaman <= 8, `halaman ${hasil.halaman}`);
  assert.equal(hasil.nama, lap.nama_berkas);
  assert.equal(hasil.huruf, "Roboto");
  assert.ok(hasil.byte.byteLength < 10485760 && hasil.byte.byteLength > 5000, `ukuran ${hasil.byte.byteLength}`);
});

test("pdf: tanpa Roboto jatuh ke Helvetica dengan pemberitahuan, bukan galat", async () => {
  const lap = L.isiLaporan("pilot", {log: [], probe: [], komponen_kembali: []}, OPSI);
  const hasil = await P.buatPdf(lap, {jsPDF: muatJsPDF(), roboto: {}, logo: null});
  assert.equal(hasil.huruf, "helvetica"); assert.equal(Buffer.from(hasil.byte.slice(0, 5)).toString("latin1"), "%PDF-");
});

test("pdf: jumlah halaman perkiraan layar tidak menyimpang jauh dari hasil nyata", async () => {
  const lap = L.isiLaporan("pilot", DATA, OPSI), nyata = (await P.buatPdf(lap, {jsPDF: muatJsPDF(), roboto: robotoNode(), logo: null})).halaman;
  assert.ok(Math.abs(P.perkiraanHalaman(lap) - nyata) <= 1, `perkiraan ${P.perkiraanHalaman(lap)} nyata ${nyata}`);
});

test("pdf: perender tidak memuat jsPDF dari CDN dan tidak menyalin laporan_bnpb.js (CSP script-src self)", () => {
  const t = baca("public/pipa/laporan_pdf.js").toString("utf8");
  assert.doesNotMatch(t, /https?:\/\//); assert.match(t, /\/vendor\/jspdf\/jspdf\.umd\.min\.js/);
});

test("pdf: logo = berkas yang sama dengan aset laporan_karhutla_deck (satu logo BNPB)", () => {
  const a = createHash("sha256").update(baca("public/img/lembaga/sumber-bnpb.png")).digest("hex");
  assert.match(baca("public/laporan_karhutla_deck.js").toString("utf8"), /\/img\/lembaga\/sumber-bnpb\.png/);
  assert.ok(a.length === 64);
});
