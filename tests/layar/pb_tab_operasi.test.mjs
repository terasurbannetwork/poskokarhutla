// PB-77: tab Operasi gempa (public/gempa/operasi.js). Keputusan tampil diuji murni lewat vm; sisanya gerbang statis.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const win = {}; win.window = win; vm.runInContext(baca("public/gempa/operasi.js"), vm.createContext({window: win, console}));
const G = win.GempaOperasi;
const nyala = {id: "gempa", kemampuan: {operasi: true, layar: {tab_operasi: true}}};
const dengan = (op, tab) => ({id: "gempa", kemampuan: {operasi: op, layar: {tab_operasi: tab}}});

test("tamu (401 atau 403 biasa) tersembunyi", () => {
  assert.equal(G.tampil({entri: nyala, status: 401}), false);
  assert.equal(G.tampil({entri: nyala, status: 403, galat: "data sarana hanya untuk akun centurisk97, staf berperan, atau moderator"}), false);
  assert.equal(G.tampil({entri: nyala, status: 500}), false);
  assert.equal(G.tampil({}), false);
});
test("200 dan registri menyala = tampil; 403 di luar wilayah = sesi sah, tampil", () => {
  assert.equal(G.tampil({entri: nyala, status: 200}), true);
  assert.equal(G.tampil({entri: nyala, status: 403, galat: "provinsi di luar wilayah akun Anda"}), true);
});
test("registri mati = tersembunyi walau rute boleh dibaca", () => {
  for (const [op, tab] of [[false, true], [true, false], [false, false], [true, undefined]]) assert.equal(G.tampil({entri: dengan(op, tab), status: 200}), false);
  assert.equal(G.tampil({entri: null, status: 200}), false);
});
test("statis: tab tidak ada di nav awal, registri disebut, rute sama dengan komponen inti", () => {
  const tab = baca("public/gempa/tab.js"), html = baca("public/gempa/index.html"), kode = baca("public/gempa/operasi.js");
  assert.ok(!/\["operasi"\s*,/.test(tab.match(/const TABS\s*=\s*\[([\s\S]*?)\];/)[1]), "operasi tidak boleh ada di TABS awal");
  assert.ok(!/id="p-operasi"|data-t="operasi"/.test(html), "index.html tidak memuat tab operasi");
  assert.ok(/kemampuan/.test(kode) && /tab_operasi/.test(kode));
  assert.ok(baca("public/inti/pb_titik.js").includes("/api/pb/titik") && G.JALUR_PROBE("31").startsWith("/api/pb/titik?bencana=gempa"));
  assert.ok(!/·/.test(kode));
});
