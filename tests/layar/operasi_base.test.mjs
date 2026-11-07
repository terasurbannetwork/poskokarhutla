/* kelompokBase (public/operasi_laporan.js): armada dikelompokkan per base, urut nama, tanpa data base di akhir. Jalankan: node --test tests/layar/operasi_base.test.mjs */
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const win = {};
vm.runInNewContext(readFileSync(new URL("../../public/operasi_laporan.js", import.meta.url), "utf8"), {window: win, document: {querySelector: () => null}, localStorage: {}});

test("armada dikelompokkan per base, urut nama, tanpa base di akhir", () => {
  const base = [{id: "b2", nama: "Pekanbaru / Sultan Syarif"}, {id: "b1", nama: "Banjarmasin / Syamsudin"}];
  /* JSON round-trip: array dari vm beda realm, deepStrictEqual menolaknya */
  const g = JSON.parse(JSON.stringify(win.OperasiLaporan.kelompokBase([{registrasi: "RA-2", base_id: "b2"}, {registrasi: "ZZ", base_id: "x"}, {registrasi: "N1", base_id: "b1"}, {registrasi: "RA-1", base_id: "b2"}, {registrasi: "Q"}], base)));
  assert.deepEqual(g.map(x => x.nama), ["Banjarmasin", "Pekanbaru", "Base belum tercatat"]);
  assert.deepEqual(g[1].regs, ["RA-1", "RA-2"]);
  assert.deepEqual(g[2].regs, ["Q", "ZZ"]);
});
