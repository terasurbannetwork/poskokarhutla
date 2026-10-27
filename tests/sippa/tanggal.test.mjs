/* Pemilih tanggal berlabel id-ID (public/pipa/tanggal.js): input date telanjang menampilkan mm/dd/yyyy, jadi tombol yang tampil. */
import test from "node:test";
import assert from "node:assert/strict";
import {labelTanggal, tanggalHtml} from "../../public/pipa/tanggal.js";

test("labelTanggal: ISO jadi teks id-ID tanpa nol di depan; kosong dan tanggal tidak nyata jadi 'Pilih tanggal'", () => {
  assert.equal(labelTanggal("2026-09-01"), "1 Sep 2026");
  assert.equal(labelTanggal("2026-10-26"), "26 Okt 2026");
  assert.equal(labelTanggal("2026-08-17"), "17 Agu 2026");
  for (const x of ["", null, undefined, "2026-02-30", "26/10/2026", "10/26/2026", "2026-13-01"]) assert.equal(labelTanggal(x), "Pilih tanggal", String(x));
});

test("tanggalHtml: tombol bertulis id-ID, aria-label memuat nama dan tanggal, input tersembunyi menyimpan ISO untuk form", () => {
  const h = tanggalHtml({nama: "dari", label: "Dari", nilai: "2026-09-01"});
  assert.match(h, /<button type="button" class="sp-tgl-btn" data-tgl-tombol data-label="Dari" aria-label="Dari: 1 Sep 2026"><b>1 Sep 2026<\/b><\/button>/);
  assert.match(h, /<input type="date" class="sp-tgl-in" tabindex="-1" aria-hidden="true" name="dari" value="2026-09-01">/);
  assert.doesNotMatch(h.replace(/<input[^>]*>/, ""), /\d{4}-\d{2}-\d{2}|mm\/dd/, "ISO mentah tidak tampil di luar input");
});

test("tanggalHtml: tanpa nilai tampil 'Pilih tanggal'; nilai buruk dan label berbahaya tidak lolos ke atribut", () => {
  const h = tanggalHtml({nama: "x", label: 'A"><img>', nilai: '2026-01-01" onfocus="x', atribut: 'data-tgl="sampai"'});
  assert.match(h, /<b>Pilih tanggal<\/b>/); assert.doesNotMatch(h, /onfocus|<img>/); assert.match(h, /data-tgl="sampai"/); assert.doesNotMatch(h, /value=/);
});
