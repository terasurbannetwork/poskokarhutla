/* Agregat Lapor Bencana (src/lapor_agregat.js, KEPUTUSAN-LAPOR-AI D91): minggu ISO WIB, sel kecil, median. node --test tests/lapor/agregat.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {agregat, mingguIso, keCsv} from "../../src/lapor_agregat.js";

test("minggu ISO memakai tanggal WIB", () => {
  assert.equal(mingguIso(Date.UTC(2026, 10, 19, 3)), "2026-W47");
  assert.equal(mingguIso(Date.UTC(2026, 0, 4, 18)), "2026-W02", "Minggu 4 Jan pukul 01.00 WIB = Senin 5 Jan, minggu 2");
  assert.equal(mingguIso(Date.UTC(2027, 0, 1, 0)), "2026-W53");
});

test("sel terbuka mulai 3 pelapor berbeda; median menit hanya dari laporan berwaktu kejadian", () => {
  const t = Date.UTC(2026, 10, 18, 3), l = (wa, menit, x = {}) => ({provKode: "31", prov: "DKI", kabKode: "31.75", kab: "Jaktim", jenis: "Banjir", kejadian: t, terkirim: t + menit * 6e4, wa, fotoSah: false, status: "baru", ...x});
  const dua = agregat([l("a", 10), l("b", 20), l("a", 30)]);
  assert.equal(dua[0].laporan, "<3"); assert.equal(dua[0].pelapor, "<3");
  const tiga = agregat([l("a", 10), l("b", 20), l("c", 40, {fotoSah: true, status: "tidak_valid"}), l("c", 5, {kejadian: null})]);
  assert.deepEqual([tiga[0].laporan, tiga[0].pelapor, tiga[0].berfoto_sah, tiga[0].tidak_valid, tiga[0].median_menit_lapor], [4, 3, 1, 1, 20]);
  assert.equal(agregat([{...l("a", 1), kabKode: null}]).length, 0, "tanpa kab tidak dihitung");
  assert.ok(keCsv(tiga).split("\n")[1].includes(",4,3,1,1,20,belum tersedia"));
});
