/* SP-143/144: logika murni logistik: beli ulang, servis pompa dari jam, permintaan BBM, lini masa modul, panel pindah ke banjir. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
const L = await import("../../public/pipa/logistik.js");
const {hidraulika, BAWAAN} = await import("../../public/pipa/hitung.js");
const bersih = t => { assert.doesNotMatch(t, /[—·]/); assert.doesNotMatch(t, /terbukti/i); };

test("logistik beli ulang: jumlah = minimum dikurangi saldo hanya bila di bawah minimum; urut paling banyak dulu", () => {
  const baris = [{gudang: "A", kode_bom: "C-101", saldo: 1, satuan: "unit", min: 3}, {gudang: "A", kode_bom: "P-101", saldo: 5, satuan: "unit", min: 5}, {gudang: "B", kode_bom: "H-101", saldo: 0, satuan: "m", min: 100}, {gudang: "B", kode_bom: "X", saldo: 2, satuan: "unit", min: null}];
  assert.equal(L.jumlahBeli(baris[0]), 2); assert.equal(L.jumlahBeli(baris[1]), 0); assert.equal(L.jumlahBeli(baris[3]), 0);
  assert.deepEqual(L.daftarBeli(baris).map(b => [b.kode_bom, b.beli]), [["H-101", 100], ["C-101", 2]]);
  assert.equal(L.teksBeli(baris[0]), "beli ulang 2 unit");
});
test("logistik servis pompa: jam sejak servis lawan batas K1; tepat di batas = jatuh tempo; tanpa jam dilaporkan", () => {
  const d = {komponen: [{kit_id: "a", kit_kode: "SIPPA-001", kode_bom: "P-101"}, {kit_id: "b", kit_kode: "SIPPA-002", kode_bom: "P-101"}, {kit_id: "c", kit_kode: "SIPPA-003", kode_bom: "P-101"}, {kit_id: "d", kit_kode: "SIPPA-004", kode_bom: "P-101"}, {kit_id: "e", kit_kode: "SIPPA-005", kode_bom: "H-101"}],
    jam_sejak_servis: {a: L.BATAS_JAM_SERVIS, b: L.BATAS_JAM_SERVIS - 5, c: 10}};
  const r = L.servisPompa(d);
  assert.deepEqual(r.map(x => [x.kit_kode, x.status]), [["SIPPA-001", "jatuh_tempo"], ["SIPPA-002", "segera"], ["SIPPA-003", "aman"], ["SIPPA-004", "tanpa_jam"]]);
  assert.equal(r[0].sisa, 0); assert.equal(r[1].sisa, 5);
  const h = L.servisHtml(r); assert.match(h, /1 pompa jatuh tempo servis/); assert.match(h, /asumsi-kebijakan/); bersih(h);
  assert.match(L.servisHtml([]), /Belum ada kit/);
});
test("logistik permintaan BBM: liter dibulatkan ke atas dari bbm_l; teks memuat liter, lokasi, tanggal; tanpa hasil ditolak", () => {
  const nilai = {...BAWAAN, n_pompa: 2, jam: 10}, h = hidraulika(nilai);
  const r = L.permintaanBbm({h, nilai, lokasi: "Kompleks K1, Pulang Pisau", tanggal: Date.UTC(2026, 10, 2)});
  assert.equal(r.liter, Math.ceil(h.bbm_l - 1e-9)); assert.match(r.teks, new RegExp(`Jumlah diminta: ${r.liter.toLocaleString("id-ID")} liter`));
  assert.match(r.teks, /Kompleks K1, Pulang Pisau/); assert.match(r.teks, /2 November 2026/); assert.match(r.teks, /estimasi model/); bersih(r.teks);
  assert.match(L.permintaanBbm({h, nilai, tanggal: 1}).teks, /Lokasi: belum diisi/);
  assert.throws(() => L.permintaanBbm({h: {}, nilai, tanggal: 1}), /belum punya angka BBM/);
  assert.throws(() => L.permintaanBbm({h, nilai, tanggal: "x"}), /tanggal/);
});
test("logistik lini masa modul: segmen dari gerak, rencana terbuka diabaikan, hari per modul dijumlahkan", () => {
  const D = 864e5, t0 = Date.UTC(2026, 9, 1);
  const gerak = [{dari_status: "gudang", ke_status: "depot", waktu: t0}, {dari_status: "depot", ke_status: "gelar", waktu: t0 + 2 * D}, {dari_status: "gelar", ke_status: "banjir", waktu: t0 + 5 * D}, {dari_status: "banjir", ke_status: "gudang", waktu: t0 + 8 * D, rencana: 1, tiba: null}];
  const r = L.segmenModul(gerak, t0 + 10 * D);
  assert.deepEqual(r.segmen.map(s => [s.status, s.modul]), [["depot", "karhutla"], ["gelar", "karhutla"], ["banjir", "banjir"]]);
  assert.equal(r.total.karhutla, 5); assert.equal(r.total.banjir, 5);
  assert.deepEqual(L.segmenModul([], 1), {segmen: [], total: {}});
  const h = L.liniModulHtml(r); assert.match(h, /Karhutla 5 hari, Banjir 5 hari/); assert.match(h, /sampai sekarang/); bersih(h); assert.equal(L.liniModulHtml({segmen: [], total: {}}), "");
});
test("logistik musim banjir: November sampai April WIB, tepat 1 November 00.00 WIB sudah masuk", () => {
  assert.equal(L.dalamMusimBanjir(Date.UTC(2026, 9, 31, 16, 59)), false); assert.equal(L.dalamMusimBanjir(Date.UTC(2026, 9, 31, 17, 0)), true);
  assert.equal(L.dalamMusimBanjir(Date.UTC(2027, 3, 15)), true); assert.equal(L.dalamMusimBanjir(Date.UTC(2027, 4, 15)), false);
});
test("logistik tujuan banjir: kabupaten dengan kecamatan Siaga atau lebih pada hari terpilih; data lama berpil basi", () => {
  const st = {hari: ["2026-10-13", "2026-10-14"], kec: {"11|Aceh|A": {b: [0, 2]}, "11|Aceh|B": {b: [0, 3]}, "11|Gayo|C": {b: [1, 2]}, "62|Kapuas|D": {b: [2, 0]}}};
  const t = L.tujuanBanjir(st, Date.UTC(2026, 9, 14, 3));
  assert.deepEqual(t.tujuan.map(x => [x.kab, x.n_kec, x.tingkat]), [["Aceh", 2, 3], ["Gayo", 1, 2]]); assert.equal(t.basi, false);
  assert.equal(L.tujuanBanjir(st, Date.UTC(2026, 9, 28)).basi, true);
  assert.deepEqual(L.tujuanBanjir(null, Date.UTC(2026, 9, 28)), {tanggal: null, basi: true, tujuan: []});
});
test("logistik kit laik banjir dan panel: hanya gudang atau depot tanpa gerak terbuka, laik false dibuang; di luar musim hanya catatan", () => {
  const kits = [{id: "1", kode: "SIPPA-001", status: "gudang", jenis: "gambut"}, {id: "2", kode: "SIPPA-002", status: "gelar", jenis: "gambut"}, {id: "3", kode: "SIPPA-003", status: "depot", jenis: "pinjam_pilot"}, {id: "4", kode: "SIPPA-004", status: "depot", jenis: "banjir", gerak_buka: {ke_status: "banjir"}}, {id: "5", kode: "SIPPA-005", status: "depot", jenis: "banjir"}];
  const ok = L.kitLaikBanjir(kits, {"5": false});
  assert.deepEqual(ok.map(x => x.kit.id), ["1"]); assert.equal(ok[0].laik, null);
  const tujuan = L.tujuanBanjir({hari: ["2026-11-02"], kec: {"11|Aceh|A": {b: [2]}}}, Date.UTC(2026, 10, 2));
  const kini = Date.UTC(2026, 10, 2), h = L.panelBanjirHtml({kits: ok, tujuan, kini, peran: "W"});
  assert.match(h, /data-pindah-banjir="1"/); assert.match(h, /Aceh/); assert.match(h, /laik belum diperiksa/); bersih(h);
  assert.doesNotMatch(L.panelBanjirHtml({kits: ok, tujuan, kini, peran: "B"}), /data-pindah-banjir/);
  assert.match(L.panelBanjirHtml({kits: ok, tujuan, kini: Date.UTC(2026, 9, 28), peran: "W"}), /aktif mulai November/);
});
