/* Menu Kemitraan dari registri Peta Situs (PS-07, KEPUTUSAN peta-situs D4, D8). Jalankan: node --test tests/kemitraan/menu.test.mjs
   Akibat gagal: halaman kampus tak terjangkau lewat klik, cadangan menunjuk halaman lama, atau halaman bertoken bocor ke menu. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {HALAMAN, menuUntuk} from "../../src/peta_situs.js";

const AKAR = new URL("../../", import.meta.url).pathname;
const baca = p => readFileSync(AKAR + p, "utf8");
const muat = () => { const w = {}; vm.runInNewContext(baca("public/kemitraan/menu.js"), {window: w}); return w.KM_MENU; };
const lewatJson = x => JSON.parse(JSON.stringify(x));   // objek konteks vm beda prototipe
const KAMPUS = HALAMAN.filter(e => e.pintu === "kampus" && e.akses !== "token" && !e.token);
const ruteKampus = KAMPUS.map(e => e.rute);
const HTML = ["public/kemitraan.html", "public/kemitraan/buku.html", "public/kemitraan/panduan.html", "public/kemitraan/daftar.html", "public/kemitraan/masuk.html"];

test("menu kampus: tanpa daftar tulisan tangan (PS-09); simpanan tab dan berkas publik jadi cadangan", () => {
  const js = baca("public/kemitraan/menu.js");
  assert.equal(muat().CADANGAN, undefined);
  assert.doesNotMatch(js, /CADANGAN|rute: "\/kemitraan\/buku"/, "butir kampus hanya dari API, berkas publik, atau simpanan");
  assert.match(js, /sessionStorage\.getItem\("km-menu"\)/);
  assert.match(js, /peta_situs_publik\.json/);
  assert.equal(muat().pilihButir([{pintu: "kampus", grup: [{butir: ["//x", "/\\evil.com", "javascript:x", "/a b"].map(rute => ({rute, nama: "x"}))}]}]), null, "rute tak aman dibuang");
  assert.match(js, /if \(!b\) \{ try \{ sessionStorage\.removeItem\("km-menu"\)/, "jawaban tanpa butir membuang simpanan");
  assert.match(js, /#keluar[^\n]*removeItem\("km-menu"\)/, "tombol Keluar membuang simpanan");
});

test("menu kampus: tiap halaman non-token kampus punya halaman yang memasang menu", () => {
  const jalur = r => r === "/kemitraan" ? "public/kemitraan.html" : `public${r}.html`;
  for (const r of ruteKampus) assert.ok(HTML.includes(jalur(r)), `${r} tidak ada di daftar HTML uji`);
  for (const f of HTML) { const h = baca(f);
    assert.match(h, /<nav id="kmMenu"[^>]*class="km-menu/, `${f} tanpa nav#kmMenu`);
    assert.match(h, /<script src="\/kemitraan\/menu\.js\?v=\d+" defer><\/script>/, `${f} tidak memuat menu.js`); }
});

test("menu kampus: jawaban API (sesi kemitraan dan admin) dipakai, pintu lain diabaikan", () => {
  const {pilihButir} = muat();
  for (const sesi of [{jenis: "kemitraan", peran: []}, {jenis: "admin", peran: []}]) {
    const api = lewatJson(menuUntuk(sesi, () => true, false).map(p => ({pintu: p.pintu, grup: p.grup.map(g => ({butir: g.butir.map(({rute, nama, ikon}) => ({rute, nama, ikon}))}))})));
    assert.deepEqual(lewatJson(pilihButir(api)).map(b => b.rute), ruteKampus, `sesi ${sesi.jenis}`);
  }
  assert.equal(pilihButir([{pintu: "publik", grup: [{butir: [{rute: "/", nama: "Karhutla"}]}]}]), null, "jawaban tamu tanpa pintu kampus harus jatuh ke berkas publik");
  assert.equal(pilihButir(null), null);
  assert.equal(pilihButir({galat: "x"}), null);
});

test("menu kampus: berkas publik dibaca tanpa halaman bertoken", () => {
  const {pilihButir} = muat();
  const pub = JSON.parse(baca("public/inti/peta_situs_publik.json"));
  const r = lewatJson(pilihButir(pub)).map(b => b.rute);
  assert.ok(r.length > 0, "peta_situs_publik.json tanpa butir pintu kampus");
  for (const x of r) assert.ok(ruteKampus.includes(x), `${x} bukan butir non-token kampus`);
  const palsu = {halaman: [{pintu: "kampus", rute: "/kemitraan", nama: "K"}, {pintu: "kampus", rute: "/kemitraan/saya", nama: "Saya", akses: "token"},
    {pintu: "kampus", rute: "/kemitraan/sertifikat/:id", nama: "Sertifikat"}, {pintu: "publik", rute: "/", nama: "Karhutla"}]};
  assert.deepEqual(lewatJson(pilihButir(palsu)).map(b => b.rute), ["/kemitraan"]);
});

test("menu kampus: jalur kini dinormalkan (.html, garis miring akhir)", () => {
  const {jalur} = muat();
  assert.equal(jalur("/kemitraan/buku.html"), "/kemitraan/buku");
  assert.equal(jalur("/kemitraan/"), "/kemitraan");
  assert.equal(jalur("/"), "/");
});
