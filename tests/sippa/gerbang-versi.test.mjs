/* Gerbang versi aset /pipa/lapangan: lapangan.js dimuat ber-?v= (cache-first di sw-lapangan.js), jadi isi berubah tanpa ?v= naik berarti
   ponsel regu memakai berkas basi selamanya. antre.js, formulir.js, ikon.js dimuat tanpa ?v= (stale-while-revalidate) dan ikut kunci lapangan.js.
   Fixture fixtures/versi-aset.json mencatat sha256 per ?v= yang sudah dirilis; isi satu ?v= tidak boleh berubah. */
import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";

const baca = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const sha = p => createHash("sha256").update(readFileSync(new URL(`../../${p}`, import.meta.url))).digest("hex");
const JS = ["lapangan.js", "antre.js", "formulir.js", "ikon.js"], CSS = ["pipa.css"];

/* murni: kembalikan daftar pelanggaran (kosong = lolos). catatan = fixture, kini = {vJs, vCss, sw, js:{berkas:sha}, css:{berkas:sha}} */
export function periksa(catatan, kini) {
  const g = [];
  const cek = (kelompok, v, sha256, ekstra) => {
    const lama = catatan[kelompok][v];
    if (!lama) return g.push(`${kelompok}: ?v=${v} belum tercatat di fixtures/versi-aset.json. Berkas berubah sejak rilis terakhir; tambahkan entri "${v}" dengan sha256 ${JSON.stringify(sha256)}${ekstra}`);
    for (const [b, h] of Object.entries(sha256)) if (lama.sha256[b] !== h) g.push(`${b} berubah (sha256 ${h.slice(0, 12)} bukan ${String(lama.sha256[b]).slice(0, 12)}) tetapi ?v=${v} tetap: naikkan ?v= di src/admin_halaman.js lalu catat entri baru`);
    if (kelompok === "js" && lama.sw !== kini.sw) g.push(`VERSI sw-lapangan.js = ${kini.sw}, fixture mencatat ${lama.sw} untuk ?v=${v}: perubahan skema cache SW harus ikut menaikkan ?v=`);
  };
  cek("js", kini.vJs, kini.js, `, sw ${kini.sw}`); cek("css", kini.vCss, kini.css, "");
  return g;
}

function keadaanKini() {
  const html = baca("src/admin_halaman.js");
  const v = nama => { const m = html.match(new RegExp(`/pipa/${nama.replace(".", "\\.")}\\?v=(\\d+)`)); assert.ok(m, `${nama} tidak ditemukan ber-?v= di src/admin_halaman.js`); return m[1]; };
  const sw = baca("public/sw-lapangan.js").match(/const VERSI = (\d+)/);
  assert.ok(sw, "VERSI tidak ditemukan di public/sw-lapangan.js");
  return {vJs: v("lapangan.js"), vCss: v("pipa.css"), sw: Number(sw[1]),
    js: Object.fromEntries(JS.map(b => [b, sha(`public/pipa/${b}`)])), css: Object.fromEntries(CSS.map(b => [b, sha(`public/pipa/${b}`)]))};
}

test("gerbang versi: aset /pipa/lapangan sama dengan potret ?v= yang tercatat (berubah wajib naik ?v=)", () => {
  const catatan = JSON.parse(baca("tests/sippa/fixtures/versi-aset.json")), kini = keadaanKini();
  assert.deepEqual(periksa(catatan, kini), [], `?v= js=${kini.vJs} css=${kini.vCss} VERSI sw=${kini.sw}`);
});

test("penolakan: satu berkas berubah di ?v= yang sama ditolak dengan angkanya; ?v= naik tanpa entri juga ditolak; VERSI SW bergeser ditolak", () => {
  const dasar = {js: {"1": {sw: 3, sha256: {"lapangan.js": "aaaaaaaaaaaaaaaa", "antre.js": "bbbbbbbbbbbbbbbb"}}}, css: {"1": {sha256: {"pipa.css": "cccccccccccccccc"}}}};
  const kini = {vJs: "1", vCss: "1", sw: 3, js: {"lapangan.js": "aaaaaaaaaaaaaaaa", "antre.js": "bbbbbbbbbbbbbbbb"}, css: {"pipa.css": "cccccccccccccccc"}};
  assert.deepEqual(periksa(dasar, kini), [], "keadaan sama lolos");
  const ubah = periksa(dasar, {...kini, js: {...kini.js, "antre.js": "dddddddddddddddd"}});
  assert.equal(ubah.length, 1); assert.match(ubah[0], /antre\.js berubah.*dddddddddddd bukan bbbbbbbbbbbb.*\?v=1 tetap/);
  assert.match(periksa(dasar, {...kini, css: {"pipa.css": "eeeeeeeeeeeeeeee"}})[0], /pipa\.css berubah/);
  assert.match(periksa(dasar, {...kini, vJs: "2"})[0], /\?v=2 belum tercatat/);
  assert.match(periksa(dasar, {...kini, sw: 4})[0], /VERSI sw-lapangan\.js = 4, fixture mencatat 3/);
});
