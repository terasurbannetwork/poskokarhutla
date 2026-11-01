/* Fungsi murni penyusun dokumen Pusdalops (public/bnpb/dokumen_pusdalops.js): hari 07.00-07.00 WIB, shift, minggu Kamis-Kamis, baru vs pengkinian, ambang menonjol.
   Jalan: node --test tests/bnpb/dokumen_pusdalops.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../public/bnpb/dokumen_pusdalops.js";
globalThis.Wilayah = {PROV: {14: "Riau", 16: "Sumatera Selatan", 33: "Jawa Tengah"}};   // peramban memuat wilayah.js; di sini cukup nama provinsi
const D = globalThis.DokumenPusdalops, WIB = (tgl, jam, mnt = 0) => Date.parse(`${tgl}T00:00:00Z`) + ((jam - 7) * 60 + mnt) * 6e4;   // jam dinding WIB -> ms
const ent = (kid, waktu, o = {}) => ({kejadian_id: kid, waktu, jenis: "banjir", prov: "33", kab: "Cilacap", kec: "Kroya", desa: "X", status: "buka", dummy: false, ...o});

test("hari laporan 07.00-07.00 WIB: 06.59 masuk hari sebelumnya, 07.00 hari itu", () => {
  assert.equal(D.hariLaporan(WIB("2026-10-30", 6, 59)), "2026-10-29");
  assert.equal(D.hariLaporan(WIB("2026-10-30", 7)), "2026-10-30");
  assert.equal(D.hariLaporan(WIB("2026-10-30", 23, 59)), "2026-10-30");
  assert.equal(D.hariLaporan(WIB("2026-10-31", 0)), "2026-10-30");
});

test("shift: 07-15, 15-21, 21-07 tanpa celah; batas kiri-tutup", () => {
  const s = (j, m = 0) => D.shiftDari(WIB("2026-10-30", j, m));
  assert.deepEqual([s(6, 59), s(7), s(14, 59), s(15), s(20, 59), s(21), s(23), s(0), s(6, 30)].map(Number), [3, 1, 1, 2, 2, 3, 3, 3, 3].map(Number));
  const [d1, s1] = D.bataShift("2026-10-30", 1), [d3, s3] = D.bataShift("2026-10-30", 3);
  assert.equal(d1, WIB("2026-10-30", 7)); assert.equal(s1, WIB("2026-10-30", 15)); assert.equal(d3, WIB("2026-10-30", 21)); assert.equal(s3, WIB("2026-10-31", 7));
});

test("minggu: Kamis 18.00 WIB s.d. Kamis 18.00 WIB", () => {
  // 29 Okt 2026 = Kamis
  assert.equal(new Date(Date.parse("2026-10-29T00:00:00Z")).getUTCDay(), 4);
  assert.equal(D.akhirKamis(WIB("2026-10-29", 18)), WIB("2026-10-29", 18), "tepat 18.00 = penutup");
  assert.equal(D.akhirKamis(WIB("2026-10-29", 17, 59)), WIB("2026-10-22", 18));
  assert.equal(D.akhirKamis(WIB("2026-11-01", 10)), WIB("2026-10-29", 18));
  assert.equal(D.akhirDariTgl("2026-10-29"), WIB("2026-10-29", 18));
  assert.equal(D.akhirDariTgl("2026-10-30"), null);
  const p = D.periodeMinggu(WIB("2026-10-29", 18));
  assert.equal(p.dari, WIB("2026-10-22", 18)); assert.equal(p.sampai - p.dari, 7 * 864e5);
  assert.deepEqual(D.hariUntuk(p.dari, p.sampai), ["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"]);
});

test("baru vs pengkinian per hari: entri pertama di hari itu = baru, sesudahnya pengkinian; satu kejadian dihitung sekali", () => {
  const e = [ent("a", WIB("2026-10-27", 9)), ent("a", WIB("2026-10-27", 12)),            // a: baru 27, 2 entri
    ent("a", WIB("2026-10-28", 10)),                                                       // a: pengkinian 28
    ent("b", WIB("2026-10-28", 8)), ent("b", WIB("2026-10-28", 22)),                      // b: baru 28
    ent("c", WIB("2026-10-28", 23), {jenis: "karhutla"})];                                  // c: baru 28
  const h27 = D.hariData(e, "2026-10-27"), h28 = D.hariData(e, "2026-10-28");
  assert.deepEqual([h27.total, h27.baru, h27.pengkinian], [1, 1, 0]);
  assert.deepEqual([h28.total, h28.baru, h28.pengkinian], [3, 2, 1]);
  assert.equal(h28.baru + h28.pengkinian, h28.total);
  const b = D.bast(e, "2026-10-27", 2);
  assert.deepEqual([b.total, b.baru, b.pengkinian], [4, 3, 1]);
});

test("entri 06.59 WIB masuk hari laporan kemarin; entri 07.00 hari berikutnya jadi pengkinian", () => {
  const e = [ent("a", WIB("2026-10-27", 10)), ent("a", WIB("2026-10-28", 6, 59)), ent("a", WIB("2026-10-28", 7))];
  assert.deepEqual([D.hariData(e, "2026-10-27").total, D.hariData(e, "2026-10-27").baru], [1, 1]);
  assert.deepEqual([D.hariData(e, "2026-10-28").total, D.hariData(e, "2026-10-28").pengkinian], [1, 1]);
});

test("ambang menonjol sama dengan scripts/wa/panduan_resmi.json", () => {
  const kunci = {101: "banjir", 102: "longsor", 103: "gelombang_pasang", 104: "cuaca", 105: "kekeringan", 106: "karhutla", 107: "gempabumi", 108: "tsunami", 109: "gunungapi"};
  const js = JSON.parse(readFileSync(new URL("../../scripts/wa/panduan_resmi.json", import.meta.url), "utf8")), a = {};
  for (const j of js.jenis) if (kunci[j.kode]) { const {hal, ...m} = j.menonjol; a[kunci[j.kode]] = {}; for (const [k, v] of Object.entries(m)) a[kunci[j.kode]][k === "orang" ? "orang" : k] = v; }
  assert.deepEqual(D.AMBANG, a);
});

test("menonjol: banjir lewat ambang KK/jiwa/korban, di bawahnya tidak; karhutla 2 ha; gempa ada dampak; jenis tanpa kriteria tidak", () => {
  const m = (jenis, d) => D.menonjol(jenis, d).ya;
  assert.equal(m("banjir", {mengungsi_kk: 49, mengungsi_jiwa: 199}), false);
  assert.equal(m("banjir", {mengungsi_kk: 50}), true);
  assert.equal(m("banjir", {mengungsi_jiwa: 200}), true);
  assert.equal(m("banjir", {md: 0, hilang: 1}), true);
  assert.equal(m("banjir", {luas_ha: 10}), true);
  assert.equal(m("longsor", {rumah_rb: 4, rumah_rs: 3, rumah_rr: 3}), true);
  assert.equal(m("longsor", {rumah_rr: 9, mengungsi_kk: 9}), false);
  assert.equal(m("kekeringan", {md: 0, hilang: 3}), false);
  assert.equal(m("kekeringan", {md: 1}), true);
  assert.equal(m("karhutla", {luas_ha: 1.9}), false); assert.equal(m("karhutla", {luas_ha: 2}), true);
  assert.equal(m("gempabumi", {}), false); assert.equal(m("gempabumi", {rumah_rr: 1}), true);
  assert.equal(m("kebakaran_permukiman", {md: 9, mengungsi_jiwa: 999}), false);
  assert.equal(m("banjir", null), false);
});

test("Laporan Menonjol: kelompok per provinsi, jumlah otomatis, pilihan manual, teks WA tanpa titik tengah", () => {
  const e = [ent("a", WIB("2026-10-27", 9), {mengungsi_kk: 60, mengungsi_jiwa: 210, md: 1}), ent("b", WIB("2026-10-27", 10), {jenis: "karhutla", prov: "14", kab: "Rokan Hilir", luas_ha: 35.5, desa: null, kec: "Bangko"}),
    ent("c", WIB("2026-10-27", 11), {jenis: "kebakaran_permukiman", md: 2}), ent("d", WIB("2026-10-27", 12), {mengungsi_kk: 3})];
  const h = D.hariData(e, "2026-10-27");
  assert.equal(h.total, 4); assert.deepEqual(h.daftar.map(v => v.id).sort(), ["a", "b"]);
  const t = D.teksMenonjol(h, false);
  assert.match(t, /sejumlah 2\b/); assert.match(t, /pukul 07\.00 WIB s\.d\. 28 Oktober 2026/);
  assert.match(t, /\*Riau\*\n- Karhutla, Kec\. Bangko, Rokan Hilir: 36 ha terbakar/);
  assert.match(t, /1 meninggal, 210 jiwa \(60 KK\) mengungsi/);
  assert.ok(t.indexOf("*Riau*") < t.indexOf("*Jawa Tengah*"), "urut kode provinsi");
  assert.ok(!t.includes("·")); assert.match(t, /\n\nSumber: logbook Pusdalops \(input piket\), diambil pukul \d\d\.\d\d WIB, \d+ \w+ \d{4}$/);
  const hm = D.hariData(e, "2026-10-27", new Set(["c"]));
  assert.equal(hm.daftar.length, 3); assert.deepEqual(hm.daftar.find(v => v.id === "c").alasan, ["dipilih manual"]);
  assert.match(D.teksMenonjol(D.hariData([], "2026-10-27"), false), /sejumlah 0\b[\s\S]*Tidak ada kejadian/);
  assert.match(D.teksMenonjol(h, true), /^\[DATA DUMMY/);
});

test("Laporan Shift: kejadian per shift, baru/pengkinian per shift, tuntas dari status kejadian", () => {
  const e = [ent("a", WIB("2026-10-27", 8)), ent("a", WIB("2026-10-27", 16)), ent("a", WIB("2026-10-27", 22)), ent("b", WIB("2026-10-27", 22, 30), {status: "tutup"}), ent("b", WIB("2026-10-28", 6, 59), {status: "tutup"})];
  const s = D.shift(e, "2026-10-27");
  assert.deepEqual(s.shift.map(x => [x.baru, x.pengkinian, x.daftar.length]), [[1, 0, 1], [0, 1, 1], [1, 1, 2]]);
  assert.equal(s.shift[2].tuntas, 1);
  assert.equal(s.shift[2].jam, "21.00 s.d. 07.00 WIB");
  assert.equal(s.shift.reduce((a, x) => a + x.daftar.length, 0), 4, "satu kejadian bisa muncul di beberapa shift");
  assert.match(D.teksShift(s, false, WIB("2026-10-28", 8, 5)), /Sumber: logbook Pusdalops \(input piket\), diambil pukul 08\.05 WIB, 28 Oktober 2026$/);
  assert.match(D.teksShift(s, false), /\*Shift 3 \(21\.00 s\.d\. 07\.00 WIB\)\*: 2 kejadian \(1 baru, 1 pengkinian\)/);
});

test("Rekap Mingguan: jendela Kamis-Kamis, per jenis dan provinsi, luas karhutla dari entri terakhir tiap kejadian", () => {
  const e = [ent("x", WIB("2026-10-21", 17, 59), {jenis: "karhutla", luas_ha: 999}),                                  // sebelum jendela
    ent("k1", WIB("2026-10-23", 9), {jenis: "karhutla", prov: "14", luas_ha: 10}), ent("k1", WIB("2026-10-27", 9), {jenis: "karhutla", prov: "14", luas_ha: 30.4}),
    ent("k2", WIB("2026-10-24", 9), {jenis: "karhutla", prov: "14", luas_ha: 4}), ent("k3", WIB("2026-10-25", 9), {jenis: "karhutla", prov: "16", luas_ha: null}),
    ent("b1", WIB("2026-10-26", 9)), ent("b1", WIB("2026-10-29", 17, 59)), ent("z", WIB("2026-10-29", 18), {jenis: "banjir"})];                  // z: tepat 18.00 = jendela berikut
  const m = D.mingguan(e, WIB("2026-10-29", 18));
  assert.equal(m.total, 4); assert.deepEqual([m.baru, m.pengkinian], [4, 0].map((v, i) => i ? 0 : 4));
  assert.deepEqual(m.perJenis.map(o => [o.kunci, o.total]), [["karhutla", 3], ["banjir", 1]]);
  assert.deepEqual(m.luas.map(o => [o.prov, o.kejadian, Math.round(o.ha * 10) / 10, o.tanpaLuas]), [["14", 2, 34.4, 0], ["16", 1, 0, 1]]);
  assert.ok(Math.abs(m.luasTotal - 34.4) < 1e-9); assert.equal(m.adaKib, false);
  const t = D.teksMingguan(m, false);
  assert.match(t, /Periode 22 Oktober 2026 pukul 18\.00 WIB s\.d\. 29 Oktober 2026 pukul 18\.00 WIB/); assert.match(t, /Riau: 34 ha dari 2 kejadian/); assert.match(t, /Banjir: 1 kejadian/); assert.match(t, /Riau: 2 kejadian/); assert.match(t, /perkiraan dari entri piket/); assert.match(t, /Sumber: logbook Pusdalops/);
  assert.equal(D.mingguan([ent("q", WIB("2026-10-25", 9), {kib: "3301-101"})], WIB("2026-10-29", 18)).adaKib, true);
});

test("format Indonesia dan nomor surat", () => {
  assert.equal(D.fmt(1234567), "1.234.567"); assert.equal(D.fmt(35.5), "35,5"); assert.equal(D.fmt(null), "–");
  assert.equal(D.nomorSurat("NNN/PTEO/PO.02/BB/2026", "102"), "102/PTEO/PO.02/BB/2026");
  assert.equal(D.nomorSurat("NNN/PTEO/PO.02/BB/2026", "7"), "007/PTEO/PO.02/BB/2026");
  assert.equal(D.nomorSurat("NNN/PTEO/PO.02/BB/2026", ""), "___/PTEO/PO.02/BB/2026");
  assert.equal(D.nomorSurat("tanpa pola", "5"), "tanpa pola");
  const b = D.bast([], "2026-10-27", 3);
  assert.match(D.teksBast(b, "102/PTEO/PO.02/BB/2026", false), /Nomor 102[\s\S]*27 Oktober 2026: 0 kejadian \(0 baru, 0 pengkinian\), 0 menonjol[\s\S]*Jumlah: 0 kejadian[\s\S]*Sumber: logbook Pusdalops/);
});
