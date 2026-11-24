/* GS-10: penggeser sebelum/sesudah bersama (public/inti/geser.js); bukti.js memakainya, tanpa peramban. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const baca = b => readFileSync(new URL(b, import.meta.url), "utf8");
const win = {}; new Function("window", baca("../../public/inti/geser.js"))(win);
const {Geser} = win;

const elemen = (extra = {}) => { const o = {style: {}, attrs: {}, ls: {}, hidden: true, classList: {set: new Set(), add(k) { this.set.add(k); }},
  setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.ls[t] = f; }, ...extra}; return o; };
const rakit = (nilai = "50", gambar = {}) => {
  const input = elemen({value: nilai}), a = elemen(), g = elemen(), gagal = elemen();
  const imgs = [elemen(gambar), elemen(gambar)];
  const w = elemen({querySelector: s => ({input, ".geser-a": a, ".geser-garis": g, ".geser-gagal": gagal})[s], querySelectorAll: () => imgs});
  return {w, input, a, g, gagal, imgs};
};

test("posisi dari nilai input: awal dan sesudah input", () => {
  const {w, input, a, g} = rakit("50"); Geser.pasang(w);
  assert.equal(a.style.clipPath, "inset(0 50% 0 0)"); assert.equal(g.style.left, "50%");
  input.value = "20"; input.ls.input();
  assert.equal(a.style.clipPath, "inset(0 80% 0 0)"); assert.equal(g.style.left, "20%");
});

test("aria-valuetext ikut nilai", () => {
  const {w, input} = rakit("50"); Geser.pasang(w);
  assert.equal(input.attrs["aria-valuetext"], "Sebelum 50 persen, sesudah 50 persen");
  input.value = "30"; input.ls.input();
  assert.equal(input.attrs["aria-valuetext"], "Sebelum 30 persen, sesudah 70 persen");
});

test("html: label sudut, alt, input range berlabel, tanggal di-escape", () => {
  const h = Geser.html({sebelum: {src: "a.png", tgl: "1 Mei 2025"}, sesudah: {src: "b.png", tgl: "<x>"}});
  assert.match(h, /geser-lb-a">Sebelum 1 Mei 2025</); assert.match(h, /geser-lb-b">Sesudah &lt;x&gt;</);
  assert.match(h, /type="range" min="0" max="100" value="50" aria-label="Geser sebelum dan sesudah"/);
  assert.match(h, /class="geser-b" src="b\.png"/); assert.match(h, /class="geser-a" src="a\.png"/);
});

test("gambar gagal muat: kelas gagal dan pesan tampil", () => {
  const {w, gagal, imgs} = rakit("50"); Geser.pasang(w);
  assert.equal(gagal.hidden, true); imgs[0].ls.error();
  assert.ok(w.classList.set.has("gagal")); assert.equal(gagal.hidden, false);
  const r = rakit("50", {complete: true, naturalWidth: 0, getAttribute: () => "x.png"}); Geser.pasang(r.w);
  assert.equal(r.gagal.hidden, false, "gambar yang sudah gagal sebelum dipasang");
});

test("bukti.js memakai komponen inti, tanpa geserCitra sendiri", () => {
  const js = baca("../../public/banjir/bukti.js"), css = baca("../../public/banjir/bukti.css");
  assert.doesNotMatch(js, /function geserCitra|bk-geser|bk-sebelum/); assert.match(js, /Geser\.html\(/); assert.match(js, /Geser\.pasang\(/);
  assert.doesNotMatch(css, /bk-geser|bk-garis|bk-lb/);
  assert.match(baca("../../public/banjir/laporan-das.html"), /inti\/geser\.css[\s\S]*inti\/geser\.js[\s\S]*banjir\/bukti\.js/);
});

test("geser.css tanpa literal warna", () => {
  assert.doesNotMatch(baca("../../public/inti/geser.css"), /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i);
});
