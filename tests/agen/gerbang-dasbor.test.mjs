/* Gerbang sistem desain dashboard (data/kajian-bnpb/dashboard/, KEPUTUSAN-DASHBOARD D1-D26, pemilik 11 Nov 2026).
   1. Tiap layar dashboard memuat lapisan bersama public/inti/dasbor.css (langsung, lewat kepala admin, atau lewat menu Pusdalops).
   2. Layar yang sudah model A punya panel seksi kiri dan kepala halaman gelap.
   3. dasbor.css tidak memasang latar gelap selain token navy untuk kepala tabel dan kepala halaman (D4, D5).
   4. Tanpa kaki "Sumber:" di kartu (AGENTS 3.5) dan tanpa huruf kapital dipaksa di dasbor.css.
   Layar baru yang dirombak masuk daftar LAYAR / MODEL_A di sini. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const baca = p => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const LAYAR = ["public/bnpb/kinerja.html", "public/bnpb/sitrep.html", "public/bnpb/rapor-sumber.html", "public/bnpb/silang.html",
  "public/logpal/index.html", "public/siklus/index.html", "public/petugas/panel.html", "public/kemitraan.html", "public/prediksi/index.html"];
const MODEL_A = {"public/bnpb/sitrep.html": ["sr-nav", "sr-a"], "public/operasi_laporan.js": ["ops-nav", "ops-judul"],
  "public/bnpb/silang.html": ["/inti/dasbor.js", "isi-rapor"], "public/bnpb/silang.js": ["DasborA?.pasang"],
  "public/prediksi/prediksi.js": ["db-nav-isi", "db-l1"]};

test("tiap layar dashboard memuat dasbor.css", () => {
  for (const f of LAYAR) assert.match(baca(f), /\/inti\/dasbor\.css/, `${f}: lapisan dasbor.css tidak dimuat`);
  assert.match(baca("src/admin_halaman.js"), /\/inti\/dasbor\.css/, "kepala halaman admin tidak memuat dasbor.css");
  assert.match(baca("src/admin_halaman.js"), /\/inti\/dasbor_admin\.js/, "kepala halaman admin tidak memuat panel kiri model A (dasbor_admin.js)");
  assert.match(baca("public/bnpb/menu_pusdalops.js"), /\/inti\/dasbor\.css/, "menu Pusdalops tidak menyisipkan dasbor.css");
});

test("layar model A punya panel seksi kiri dan kepala halaman", () => {
  for (const [f, kelas] of Object.entries(MODEL_A)) for (const k of kelas) assert.ok(baca(f).includes(k), `${f}: ${k} hilang (model A)`);
});

test("dasbor.css: tanpa latar gelap lain, tanpa huruf kapital dipaksa", () => {
  const css = baca("public/inti/dasbor.css").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, sel, isi] = m, bg = /background(?:-color)?\s*:\s*([^;!]+)/.exec(isi)?.[1] || "";
    if (/var\(--db-navy\)|#0b2545/.test(bg)) assert.ok(/thead|\.ad-tabel|h1|\.ad-judul|aria-current|>i\b/.test(sel), `latar navy di luar kepala tabel/halaman: ${sel.trim()}`);
    assert.ok(!/text-transform\s*:\s*uppercase/.test(isi), `huruf kapital dipaksa: ${sel.trim()}`);
  }
});

test("tanpa kaki sumber di kartu Sitrep", () => {
  assert.ok(!/class:\s*"bn-label sr-sumber"/.test(baca("public/bnpb/sitrep.js")), "kaki 'Sumber:' muncul lagi di kartu Sitrep");
});
