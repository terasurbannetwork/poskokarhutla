// PB-86 (F-40): tab Operasi pesisir (public/pesisir/operasi.js). Keputusan tampil diuji murni lewat vm; sisanya gerbang statis.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const win = {}; win.window = win; vm.runInContext(baca("public/pesisir/operasi.js"), vm.createContext({window: win, console}));
const G = win.PesisirOperasi;
const dengan = (op, tab) => ({id: "pesisir", kemampuan: {operasi: op, layar: {tab_operasi: tab}}});
test("tampil hanya bila registri menyala DAN rute boleh dibaca", () => {
  assert.equal(G.tampil({entri: dengan(true, true), status: 200}), true);
  assert.equal(G.tampil({entri: dengan(true, true), status: 403, galat: "di luar wilayah"}), true);
  assert.equal(G.tampil({entri: dengan(true, true), status: 401}), false);
  assert.equal(G.tampil({entri: dengan(true, true), status: 403, galat: "lain"}), false);
  for (const [op, tab] of [[false, true], [true, false], [false, false], [true, undefined]]) assert.equal(G.tampil({entri: dengan(op, tab), status: 200}), false);
  assert.equal(G.tampil({entri: null, status: 200}), false);
});
test("pasang: registri mati = tidak ada probe ke rute operasi", async () => {
  const panggil = []; const w = {}; w.window = w; vm.runInContext(baca("public/pesisir/operasi.js"), vm.createContext({window: w, console, document: {}}));
  const ya = await w.PesisirOperasi.pasang(async u => { panggil.push(u); return {ok: true, status: 200, json: async () => ({bencana: [dengan(true, false)]})}; });
  assert.equal(ya, false); assert.deepEqual(panggil, ["/bencana.json"]);
});
test("statis: tab tidak ada di nav awal, bukaTab menerima operasi hanya bila bagian ada, rute sama dengan komponen inti", () => {
  const app = baca("public/pesisir/pesisir.js"), html = baca("public/pesisir/index.html"), kode = baca("public/pesisir/operasi.js");
  assert.ok(!/\["operasi"\s*,/.test(app.match(/const TABS\s*=\s*\[([\s\S]*?)\];/)[1]), "operasi tidak boleh ada di TABS awal");
  assert.ok(!/id="p-operasi"|data-t="operasi"/.test(html));
  assert.ok(/#p-operasi/.test(app) && /PesisirOperasi/.test(app));
  assert.ok(/kemampuan/.test(kode) && /tab_operasi/.test(kode) && /bencana: "pesisir"/.test(kode));
  assert.ok(G.JALUR_PROBE("11").startsWith("/api/pb/titik?bencana=pesisir"));
  assert.ok(!/·/.test(kode) && !/gunung/i.test(kode));
});
