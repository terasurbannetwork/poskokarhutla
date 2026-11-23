// PB-79b (F-40): tab Operasi gunung api (public/gunungapi/operasi.js). Keputusan tampil diuji murni lewat vm; sisanya gerbang statis.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const win = {}; win.window = win; vm.runInContext(baca("public/gunungapi/operasi.js"), vm.createContext({window: win, console}));
const G = win.GunungapiOperasi;
const dengan = (op, tab) => ({id: "gunungapi", kemampuan: {operasi: op, layar: {tab_operasi: tab}}});
test("tampil hanya bila registri menyala DAN rute boleh dibaca", () => {
  assert.equal(G.tampil({entri: dengan(true, true), status: 200}), true);
  assert.equal(G.tampil({entri: dengan(true, true), status: 403, galat: "di luar wilayah"}), true);
  assert.equal(G.tampil({entri: dengan(true, true), status: 401}), false);
  assert.equal(G.tampil({entri: dengan(true, true), status: 403, galat: "lain"}), false);
  for (const [op, tab] of [[false, true], [true, false], [false, false], [true, undefined]]) assert.equal(G.tampil({entri: dengan(op, tab), status: 200}), false);
  assert.equal(G.tampil({entri: null, status: 200}), false);
});
test("statis: tab tidak ada di nav awal, bukaTab menerima operasi hanya bila bagian ada, rute sama dengan komponen inti", () => {
  const app = baca("public/gunungapi/app.js"), html = baca("public/gunungapi/index.html"), kode = baca("public/gunungapi/operasi.js");
  assert.ok(!/\["operasi"\s*,/.test(app.match(/const TABS\s*=\s*\[([\s\S]*?)\];/)[1]), "operasi tidak boleh ada di TABS awal");
  assert.ok(!/id="p-operasi"|data-t="operasi"/.test(html));
  assert.ok(/#p-operasi/.test(app) && /GunungapiOperasi/.test(app));
  assert.ok(/kemampuan/.test(kode) && /tab_operasi/.test(kode) && /bencana: "gunungapi"/.test(kode));
  assert.ok(G.JALUR_PROBE("11").startsWith("/api/pb/titik?bencana=gunungapi"));
  assert.ok(!/·/.test(kode));
});
