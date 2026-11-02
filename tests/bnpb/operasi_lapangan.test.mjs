/* Fungsi murni layar /bnpb/operasi-lapangan (public/bnpb/operasi_lapangan_hitung.js). Jalan: node --test tests/bnpb/operasi_lapangan.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../public/bnpb/operasi_lapangan_hitung.js";
const O = globalThis.OperasiLapangan;
const T = (registrasi, status, lat, lon, jam_utc = null, extra = {}) => ({registrasi, status, lat, lon, jam_utc, ...extra});
const DATA = {tanggal: "2026-11-02",
  base: [{id: "PNK"}, {id: "KTG"}],
  armada: [{registrasi: "PK-FPA", base_id: "PNK", status: "siap", sumber: "wa"}, {registrasi: "VH-L6T", base_id: "PNK", status: "tidak_siap"}, {registrasi: "VN-8416", base_id: "KTG", status: null}, {registrasi: "H-3217", base_id: "PNK", status: "operasi"}],
  temuan: [T("PK-FPA", "fs", -3, 114), T("PK-FPA", "clear", -3.5, 114.5), T("H-3217", "berasap_tipis", -0.1, 109.5), T("VN-8416", "fs", -2.8, 110.6, Date.parse("2026-11-02T06:00:00Z"), {luas_klaim_ha: 8})],
  gerak: [{registrasi: "VH-L6T", jenis: "berangkat", jam_utc: Date.parse("2026-11-02T02:05:00Z"), lat: -3.01, lon: 114.01, rujukan: "PK-FPA"}, {registrasi: "PK-FPA", jenis: "rencana", jam_utc: null}, {registrasi: "H-3217", jenis: "berangkat", jam_utc: Date.parse("2026-11-02T08:00:00Z")}]};

test("kelompok temuan per status dan warna status", () => {
  const k = O.kelompokTemuan(DATA.temuan); assert.deepEqual([k.fs.length, k.berasap.length, k.berasap_tipis.length, k.clear.length], [2, 0, 1, 1]);
  assert.equal(O.kelasTemuan("fs"), "ol-t-api"); assert.equal(O.kelasTemuan("berasap_tipis"), "ol-t-tipis"); assert.equal(O.kelasTemuan("clear"), "ol-t-clear");
  assert.equal(O.STATUS_TEMUAN.fs.bentuk, "segitiga"); assert.equal(O.STATUS_TEMUAN.clear.bentuk, "lingkaran");
  assert.equal(O.kelasArmada("tidak_siap"), "ol-s-tidak"); assert.equal(O.kelasArmada(null), "ol-s-belum"); assert.equal(O.namaArmada(undefined), "Belum ada laporan");
});
test("ringkasan: siap vs tidak siap vs belum lapor, sortie berangkat", () => {
  const r = O.ringkas(DATA); assert.deepEqual([r.siap, r.tidak, r.belum, r.armada, r.sortie, r.temuanTotal], [2, 1, 1, 4, 2, 4]);
});
test("segmen: tanpa jam masuk pagi, 12.00 WIB memisahkan pagi dan siang", () => {
  assert.equal(O.segmenJam(null), "pagi"); assert.equal(O.segmenJam(Date.parse("2026-11-02T04:59:00Z")), "pagi"); assert.equal(O.segmenJam(Date.parse("2026-11-02T05:00:00Z")), "siang");
  const p = O.saringSegmen(DATA, "pagi"), s = O.saringSegmen(DATA, "siang");
  assert.equal(p.gerak.length + s.gerak.length, DATA.gerak.length); assert.equal(p.temuan.length + s.temuan.length, DATA.temuan.length); assert.equal(O.saringSegmen(DATA, "nilai"), DATA);
});
test("data per base: armada, gerak, dan temuan oleh armada base itu", () => {
  const b = O.dataBase(DATA, "PNK"); assert.equal(b.armada.length, 3); assert.equal(b.temuan.length, 3); assert.equal(b.gerak.length, 3);
  assert.equal(O.dataBase(DATA, "KTG").temuan.length, 1);
});
test("garis rujukan: WB berkoordinat ke temuan patroli terdekat bukan clear; tanpa kecocokan tidak ada garis", () => {
  const g = O.garisRujukan(DATA); assert.equal(g.length, 1); assert.deepEqual(g[0].dari, [114, -3]); assert.deepEqual(g[0].ke, [114.01, -3.01]);
  assert.equal(O.garisRujukan({...DATA, gerak: [{...DATA.gerak[0], rujukan: "XX-000"}]}).length, 0);
});
test("angka dan tanggal gaya Indonesia, klaim pilot berlabel", () => {
  assert.equal(O.fmt(1234.5), "1.234,5"); assert.equal(O.fmt(null), "–"); assert.equal(O.tanggalIndo("2026-11-02"), "2 November 2026");
  assert.equal(O.klaimTeks({luas_klaim_ha: 0.2}), "klaim pilot ±0,2 ha"); assert.equal(O.klaimTeks({}), "");
  assert.equal(O.jamWIB(Date.parse("2026-11-02T01:28:00Z")), "08:28 WIB"); assert.equal(O.hariIniWIB(Date.parse("2026-11-01T18:00:00Z")), "2026-11-02");
});
test("cincin jelajah: jarak titik ke pusat sama dengan jari-jari", () => {
  const c = O.cincin(0, 110, 60, 8); assert.equal(c.length, 9); const [lo, la] = c[2]; assert.ok(Math.abs(Math.hypot(lo - 110, la) * 60 - 60) < 1, "kira-kira 60 mil laut");
});
test("halaman tanpa skrip/gaya inline dan tanpa tanda pemisah titik tengah", () => {
  const html = readFileSync(new URL("../../public/bnpb/operasi_lapangan.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)/); assert.doesNotMatch(html, /\sstyle=|\son\w+=/);
  for (const f of ["operasi_lapangan.js", "operasi_lapangan_hitung.js", "operasi_lapangan.css"]) assert.doesNotMatch(readFileSync(new URL("../../public/bnpb/" + f, import.meta.url), "utf8"), /·/, f);
  assert.doesNotMatch(readFileSync(new URL("../../public/bnpb/operasi_lapangan.js", import.meta.url), "utf8"), /innerHTML/);
});

/* ---------- segmen Nilai ---------- */
const M = (nilai, n, jumlah, extra = {}) => ({nilai, n, jumlah, ...extra});
test("nilai: persen gaya Indonesia, pembilang dan n selalu tampil", () => {
  const t = O.tampilMetrik("M1", M(13 / 22, 22, 13)); assert.deepEqual([t.kosong, t.angka, t.rincian], [false, "59,1%", "13 dari 22 temuan"]);
  assert.equal(O.tampilMetrik("M2", M(0.5, 1200, 600)).rincian, "600 dari 1.200 target renlap"); assert.equal(O.persen(0), "0%"); assert.equal(O.persen(1), "100%");
});
test("nilai: M7 dalam menit dengan tanpa respons; M4 menyebut yang belum bisa dinilai", () => {
  const t = O.tampilMetrik("M7", M(42.5, 8, 8, {satuan: "menit (median)", tanpa_respons: 2})); assert.deepEqual([t.angka, t.rincian], ["42,5 menit", "median dari 8 temuan berasap, 2 tanpa respons"]);
  assert.match(O.tampilMetrik("M4", M(0.8, 10, 8, {tak_dinilai: 3})).rincian, /8 dari 10 temuan clear, 3 belum bisa dinilai/);
});
test("nilai: metrik null tidak pernah jadi 0", () => {
  assert.deepEqual(O.tampilMetrik("M1", M(null, 2, 1, {catatan: "data kurang"})), {kosong: true, pesan: "Data kurang (n=2)", rincian: ""});
  assert.equal(O.tampilMetrik("M5", M(null, 0, 0, {alasan: "data belum tersedia"})).pesan, "Data belum tersedia");
  const t = O.tampilMetrik("M4", M(null, 0, 0, {alasan: "jendela 48 jam titik panas belum tertutup data", tak_dinilai: 4})); assert.equal(t.kosong, true); assert.equal(t.angka, undefined);
  const t7 = O.tampilMetrik("M7", M(null, 3, 3, {catatan: "data kurang", tanpa_respons: 1})); assert.deepEqual([t7.pesan, t7.rincian], ["Data kurang (n=3)", "1 tanpa respons"]);
  assert.equal(O.tampilMetrik("M1", undefined).kosong, true);
});
test("nilai: urutan kunci menurut banyak data lalu abjad; sorotan hanya bila beda dan >= 2 sel", () => {
  const peta = {B: {M1: M(0.9, 10, 9), M3: M(0.5, 10, 5)}, A: {M1: M(0.4, 10, 4), M3: M(0.5, 10, 5)}, C: {M1: M(null, 1, 0, {catatan: "data kurang"})}};
  assert.deepEqual(O.urutKunci(peta), ["A", "B", "C"]);
  assert.deepEqual(O.sorotKolom("M1", peta, ["A", "B", "C"]), {B: "baik", A: "buruk"}); assert.deepEqual(O.sorotKolom("M3", peta, ["A", "B"]), {});
  const r = {B: {M3: M(0.1, 9, 1)}, A: {M3: M(0.6, 9, 5)}}; assert.deepEqual(O.sorotKolom("M3", r, ["A", "B"]), {B: "baik", A: "buruk"});   // M3 rendah = baik
  assert.deepEqual(O.sorotKolom("M5", {A: {M5: M(1, 9, 9)}, B: {M5: M(2, 9, 9)}}, ["A", "B"]), {});
  const tb = O.tabelNilai(peta, ["A", "C"]); assert.equal(tb[0].sel[0].teks, "40%"); assert.equal(tb[1].sel[0].teks, "–"); assert.equal(tb[1].sel[0].n, 1); assert.equal(tb[0].sel.length, O.KODE_TABEL.length);
});
test("nilai: saring pesawat menurut base", () => {
  const ar = [{registrasi: "X", base_id: "PNK"}, {registrasi: "Y", base_id: "KTG"}], pt = {X: {}, Y: {}, Z: {}};
  assert.equal(O.registrasiBase(ar, null), null); assert.deepEqual(Object.keys(O.saringPeta(pt, O.registrasiBase(ar, "PNK"))), ["X"]); assert.equal(O.saringPeta(pt, null), pt);
});
test("nilai: rentang bawaan 7 hari WIB dan maks 31 hari", () => {
  const b = O.rentangBawaan(Date.parse("2026-11-02T10:00:00Z")); assert.deepEqual(b, {dari: "2026-10-27", sampai: "2026-11-02"});
  assert.deepEqual(O.klampRentang("2026-10-01", "2026-11-02", "dari"), {dari: "2026-10-01", sampai: "2026-10-31"});
  assert.deepEqual(O.klampRentang("2026-10-01", "2026-11-02", "sampai"), {dari: "2026-10-03", sampai: "2026-11-02"});
  assert.deepEqual(O.klampRentang("2026-11-05", "2026-11-02", "dari"), {dari: "2026-11-05", sampai: "2026-11-05"});
  assert.deepEqual(O.klampRentang("2026-11-05", "2026-11-02", "sampai"), {dari: "2026-11-02", sampai: "2026-11-02"});
});
