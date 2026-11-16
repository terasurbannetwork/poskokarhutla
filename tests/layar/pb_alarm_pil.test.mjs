// PB-68.7 (K13): kartu penuh untuk jenis yang sama dengan halaman, pil untuk jenis lain, halaman tanpa jenis tunggal = perilaku lama.
import test from "node:test"; import assert from "node:assert/strict"; import vm from "node:vm"; import fs from "node:fs";
const src = fs.readFileSync(new URL("../../public/inti/alarm.js", import.meta.url), "utf8");
const win = {}; const ctx = vm.createContext({window: win, document: {head: {insertAdjacentHTML() {}}, addEventListener() {}, visibilityState: "hidden", hidden: true}, localStorage: {getItem: () => null, setItem() {}},
  setTimeout: () => 0, setInterval: () => 0, clearTimeout() {}, Intl, Date, JSON, Math, Set, WeakMap, Object, Array, String, Number, encodeURIComponent, location: {pathname: "/", origin: "http://x"}});
vm.runInContext(src, ctx);
const {jenisHalaman, modeTampil, kelompokPil} = win.AlarmMode;
test("jenis sama dengan halaman: kartu penuh", () => {
  assert.equal(modeTampil("banjir", "/banjir/"), "kartu"); assert.equal(modeTampil("karhutla", "/"), "kartu"); assert.equal(modeTampil("karhutla", "/index.html"), "kartu");
  assert.equal(modeTampil("tsunami", "/gempa/"), "kartu"); assert.equal(modeTampil("gempa", "/gempa/simulasi"), "kartu"); assert.equal(modeTampil("longsor", "/banjir/longsor/"), "kartu");
});
test("jenis lain: pil", () => {
  assert.equal(modeTampil("banjir", "/gempa/"), "pil"); assert.equal(modeTampil("banjir", "/cuaca/"), "pil"); assert.equal(modeTampil("gempa", "/"), "pil");
  assert.equal(modeTampil("banjir", "/banjir/longsor/"), "pil"); assert.equal(modeTampil("longsor", "/banjir/"), "pil");
  assert.equal(modeTampil("karhutla", "/gunungapi/"), "pil");
});
test("halaman tanpa jenis tunggal: perilaku lama (kartu)", () => {
  for (const j of ["/semua/", "/peringatan", "/command-center", "/admin/masuk", "/tentang"]) { assert.equal(jenisHalaman(j), null, j); assert.equal(modeTampil("banjir", j), "kartu", j); }
});
test("pengelompokan: satu pil per jenis, urut tingkat, hitung, label", () => {
  const b = (kunci, jenis, tingkat, dibuat = 1) => ({kunci, jenis, tingkat, dibuat});
  const l = [b("a", "banjir", "Siaga", 5), b("b", "pesisir", "Waspada"), b("c", "banjir", "Awas", 2), b("d", "banjir", "Siaga", 9), b("e", "pesisir", "Waspada"), b("f", "pesisir", "Waspada")];
  const k = kelompokPil(l), J = v => JSON.parse(JSON.stringify(v));   // array lintas realm vm
  assert.equal(k.length, 2);
  assert.deepEqual(J(k.map(x => x.label)), ["Banjir: 1 Awas, 2 Siaga", "Pesisir: 3 Waspada"]);
  assert.deepEqual(J(k.map(x => x.tertinggi)), ["Awas", "Waspada"]);
  assert.deepEqual(J(k[0].items.map(x => x.kunci)), ["c", "d", "a"]);   // tertinggi dulu, lalu terbaru
  assert.equal(k[0].jumlah, 3);
  assert.deepEqual(kelompokPil(l.filter(x => x.kunci !== "c"))[0].label, "Banjir: 2 Siaga");   // setelah alarm tertinggi dibuka, jumlah berkurang
  assert.equal(kelompokPil([]).length, 0);
});
