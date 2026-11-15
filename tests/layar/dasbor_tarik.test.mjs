// PB-02: pegangan tarik panel kiri model A (public/inti/dasbor.js tarik(), dasbor.css .db-tarik). DOM tiruan lewat vm, tanpa dependensi.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");

class E {
  constructor(tag) { this.tag = tag; this.kids = []; this.className = ""; this.attrs = {}; this.ls = {}; this.offsetWidth = 284;
    this.style = Object.freeze({setProperty() {}}); const s = this;   // gaya inline selain setProperty = galat (mode ketat)
    this.classList = {add: k => { if (!s.classList.contains(k)) s.className = (s.className + " " + k).trim(); }, remove: k => { s.className = s.className.split(" ").filter(x => x && x !== k).join(" "); },
      contains: k => s.className.split(" ").includes(k)}; }
  get childNodes() { return this.kids; }
  append(...n) { this.kids.push(...n); } prepend(...n) { this.kids.unshift(...n); } before() {} replaceChildren(...n) { this.kids = n; }
  setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, f) { (this.ls[t] ||= []).push(f); }
  querySelector(s) { return s === ":scope>.db-tarik" ? this.kids.find(k => k.classList?.contains("db-tarik")) || null : null; }
  querySelectorAll() { return []; }
  set textContent(v) { this.kids = []; } get textContent() { return ""; }
}
function dunia({simpan = {}, galat = false} = {}) {
  const main = new E("main"); main.classList.add("bn-wrap"); const w = {}, html = new E("html"), log = [], rafs = [];
  main.style = Object.freeze({setProperty: (k, v) => log.push([k, v])});
  const doc = {createElement: t => new E(t), createElementNS: (_, t) => new E(t), createTextNode: () => new E("#t"), documentElement: html, body: new E("body"),
    readyState: "complete", currentScript: null, querySelector: s => (s === "main.bn-wrap" ? main : null), querySelectorAll: s => (s === ".db-a" && main.classList.contains("db-a") ? [main] : [])};
  const ls = galat ? {getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }} : {getItem: k => simpan[k] ?? null, setItem: (k, v) => { simpan[k] = v; }};
  const fn = {}, ctx = vm.createContext({window: w, document: doc, localStorage: ls, console, Math, String, Array, Object,
    IntersectionObserver: class { observe() {} disconnect() {} }, MutationObserver: class { observe() {} },
    requestAnimationFrame: f => rafs.push(f), cancelAnimationFrame: () => {}, setTimeout, clearTimeout,
    addEventListener: (t, f) => (fn[t] ||= []).push(f), removeEventListener: (t, f) => { fn[t] = (fn[t] || []).filter(x => x !== f); }});
  vm.runInContext(baca("public/inti/dasbor.js"), ctx);
  const nav = () => main.kids.find(k => k.classList.contains("db-nav"));
  const gerak = (x) => { for (const f of fn.pointermove || []) f({clientX: x}); while (rafs.length) rafs.shift()(); };
  const pegang = a => a.kids.find(k => k.classList.contains("db-tarik"));
  return {w, log, simpan, nav, pegang, fn, gerak, main};
}
const lebar = d => d.log.filter(l => l[0] === "--db-w").map(l => l[1]).at(-1);

test("pasang: satu pegangan; dua kali pasang tidak menggandakan", () => {
  const d = dunia(); d.w.DasborA.pasang({nama: "x"}); d.w.DasborA.pasang({nama: "x"});
  assert.equal(d.nav().kids.filter(k => k.classList.contains("db-tarik")).length, 1);
  d.w.DasborA.pasang.call(null); // main sudah db-a: tidak ada tambahan
  assert.equal(d.nav().kids.filter(k => k.classList.contains("db-tarik")).length, 1);
});
test("tarik: jepit 200-320, simpan, baca ulang", () => {
  const s = {}, d = dunia({simpan: s}); d.w.DasborA.pasang({}); const tk = d.pegang(d.nav());
  tk.ls.pointerdown[0]({preventDefault() {}, clientX: 300});   // offsetWidth 284
  d.gerak(300 + 500); assert.equal(lebar(d), "320px");
  d.gerak(300 - 500); assert.equal(lebar(d), "200px");
  d.gerak(300 + 36); for (const f of [...d.fn.pointerup]) f(); assert.equal(s.db_nav_lebar, "320");
  const d2 = dunia({simpan: s}); d2.w.DasborA.pasang({}); assert.equal(lebar(d2), "320px");
  const d3 = dunia({simpan: {db_nav_lebar: "9999"}}); d3.w.DasborA.pasang({}); assert.equal(lebar(d3), "320px");
  const d4 = dunia({simpan: {db_nav_lebar: "50"}}); d4.w.DasborA.pasang({}); assert.equal(lebar(d4), "200px");
});
test("localStorage melempar galat: tidak rusak, lebar tetap bawaan", () => {
  const d = dunia({galat: true}); d.w.DasborA.pasang({}); assert.equal(lebar(d), undefined);
  const tk = d.pegang(d.nav()); tk.ls.pointerdown[0]({preventDefault() {}, clientX: 0}); d.gerak(20);
  for (const f of [...d.fn.pointerup]) f();   // setItem melempar, tetap lolos
  tk.ls.keydown[0]({key: "ArrowRight", preventDefault() {}});
});
test("papan tombol: panah geser 16 px, tetap dalam jepitan", () => {
  const d = dunia(), simpan = d.simpan; d.w.DasborA.pasang({}); const tk = d.pegang(d.nav()), nav = d.nav(), tekan = key => tk.ls.keydown[0]({key, preventDefault() {}});
  assert.equal(tk.tabIndex, 0); assert.equal(tk.attrs.role, "separator");
  tekan("ArrowRight"); assert.equal(lebar(d), "300px");
  nav.offsetWidth = 300; tekan("ArrowLeft"); assert.equal(lebar(d), "284px");
  nav.offsetWidth = 316; tekan("ArrowRight"); assert.equal(lebar(d), "320px"); assert.equal(simpan.db_nav_lebar, "320");
  nav.offsetWidth = 204; tekan("ArrowLeft"); assert.equal(lebar(d), "200px");
});
test("CSS: pegangan hilang di bawah 900 px dan saat cetak; lebar lewat variabel; tanpa gaya inline selain variabel", () => {
  const css = baca("public/inti/dasbor.css");
  assert.match(css, /\.db-a\{[^}]*grid-template-columns:var\(--db-w,284px\) minmax\(0,1fr\)/);
  assert.match(css, /@media \(max-width:900px\)\{\.db-tarik\{display:none\}\}/);
  assert.match(css, /@media print\{\.db-tarik\{display:none\}/);
  const js = baca("public/inti/dasbor.js").match(/function tarik[\s\S]*?\n  \}\n/)[0];
  assert.ok(!/\.style\.(?!setProperty)|cssText|setAttribute\("style"/.test(js), "tarik() menulis gaya inline");
});
test("aria: valuemin/max tetap, valuenow mengikuti nilai terjepit; setPointerCapture boleh tidak ada", () => {
  const d = dunia(); d.w.DasborA.pasang({}); const tk = d.pegang(d.nav());
  assert.equal(tk.attrs["aria-valuemin"], "200"); assert.equal(tk.attrs["aria-valuemax"], "320"); assert.equal(tk.attrs["aria-valuenow"], "284");
  tk.ls.pointerdown[0]({preventDefault() {}, clientX: 0, pointerId: 1});   // tanpa setPointerCapture: tidak melempar
  d.gerak(900); assert.equal(tk.attrs["aria-valuenow"], "320");
  d.gerak(-900); assert.equal(tk.attrs["aria-valuenow"], "200");
  const d2 = dunia({simpan: {db_nav_lebar: "250"}}); d2.w.DasborA.pasang({}); assert.equal(d2.pegang(d2.nav()).attrs["aria-valuenow"], "250");
});
