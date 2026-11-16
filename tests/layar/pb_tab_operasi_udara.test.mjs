// PB-85 (F-40): tab Operasi udara (public/udara/operasi.js). Keputusan tampil diuji murni lewat vm; sisanya gerbang statis.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const win = {}; win.window = win; vm.runInContext(baca("public/udara/operasi.js"), vm.createContext({window: win, console}));
const U = win.UdaraOperasi;
const dengan = (op, tab) => ({id: "udara", kemampuan: {operasi: op, layar: {tab_operasi: tab}}});
test("tampil hanya bila registri menyala DAN rute boleh dibaca", () => {
  assert.equal(U.tampil({entri: dengan(true, true), status: 200}), true);
  assert.equal(U.tampil({entri: dengan(true, true), status: 403, galat: "di luar wilayah"}), true);
  assert.equal(U.tampil({entri: dengan(true, true), status: 401}), false);
  assert.equal(U.tampil({entri: dengan(true, true), status: 403, galat: "lain"}), false);
  for (const [op, tab] of [[false, true], [true, false], [false, false], [true, undefined]]) assert.equal(U.tampil({entri: dengan(op, tab), status: 200}), false);
  assert.equal(U.tampil({entri: null, status: 200}), false);
});
test("pasang: registri mati = tanpa probe; tamu (401) = tanpa efek tampak", async () => {
  const dipanggil = []; const ambil = (reg, st) => async u => { dipanggil.push(u); return u === "/bencana.json" ? {ok: true, json: async () => ({bencana: [reg]})} : {status: st, json: async () => ({})}; };
  assert.equal(await win.UdaraOperasi.pasang(ambil(dengan(true, false), 200)), false); assert.deepEqual(dipanggil, ["/bencana.json"], "registri mati: hanya baca registri");
});
test("statis: tab tidak ada di nav awal, bukaTab menerima operasi hanya bila bagian ada, isiTab menjaga tombol, rute sama dengan komponen inti", () => {
  const app = baca("public/udara/app.js"), html = baca("public/udara/index.html"), kode = baca("public/udara/operasi.js"), mulai = baca("public/udara/mulai.js");
  assert.ok(!/\["operasi"\s*,/.test(app.match(/const TABS\s*=\s*\[([\s\S]*?)\];/)[1]), "operasi tidak boleh ada di TABS awal");
  assert.ok(!/id="p-operasi"|data-t="operasi"/.test(html));
  assert.ok(/#p-operasi/.test(app) && /UdaraOperasi/.test(app) && /T\.push\(\["operasi"/.test(app));
  assert.ok(/UdaraOperasi\?\.pasang/.test(mulai) && /operasi\.js/.test(mulai));
  assert.ok(/kemampuan/.test(kode) && /tab_operasi/.test(kode) && /bencana: "udara"/.test(kode) && /isiTab/.test(kode));
  assert.ok(U.JALUR_PROBE("11").startsWith("/api/pb/titik?bencana=udara")); assert.ok(!/·/.test(kode));
});
