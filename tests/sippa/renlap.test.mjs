/* SP-140: Renlap sisi layar: validasi pilihan (maks 10), pilih banyak, daftar status, tautan HP sekali tampil, fragmen halaman HP dan CSP ketat. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
const R = await import("../../public/pipa/renlap.js");
const baca = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const ID = "0123456789abcdef";

test("cekRenlap: 1 sampai 10 kompleks unik berkode K angka", () => {
  assert.deepEqual(R.cekRenlap(["K1"]), []); assert.deepEqual(R.cekRenlap(Array.from({length: 10}, (_, i) => `K${i}`)), []);
  assert.match(R.cekRenlap([])[0].alasan, /sedikitnya satu/); assert.match(R.cekRenlap(Array.from({length: 11}, (_, i) => `K${i}`))[0].alasan, /Paling banyak 10/);
  assert.match(R.cekRenlap(["X1"])[0].alasan, /diawali K/); assert.deepEqual(R.cekRenlap(["K1", "K1"]), []);
  assert.deepEqual(R.badanRenlap(["K1", "K1", "K2"]), {kompleks_ids: ["K1", "K2"]});
});
test("ubahPilihan: ke-11 ditolak tanpa membuang pilihan, hapus selalu boleh", () => {
  let s = new Set(); for (let i = 0; i < 10; i++) s = R.ubahPilihan(s, `K${i}`, true).set;
  const r = R.ubahPilihan(s, "K99", true); assert.equal(r.penuh, true); assert.equal(r.set.size, 10); assert.equal(R.ubahPilihan(s, "K3", true).penuh, false);
  assert.equal(R.ubahPilihan(s, "K3", false).set.size, 9);
});
test("tautanHp dan bacaFragmen: hanya jalur /renlap sendiri; tautan luar dan skrip dibuang; fragmen diperiksa", () => {
  assert.equal(R.tautanHp({hp: `/renlap#t=abcdef0123456789abcdef01&id=${ID}`}, "https://x.id"), `https://x.id/renlap#t=abcdef0123456789abcdef01&id=${ID}`);
  assert.equal(R.tautanHp({tautan_hp: "https://evil.example/x#t=1"}), null); assert.equal(R.tautanHp({hp: "javascript:alert(1)"}), null); assert.equal(R.tautanHp({}), null);
  assert.deepEqual(R.bacaFragmen(`#t=abcdef0123456789abcdef01&id=${ID}`), {token: "abcdef0123456789abcdef01", id: ID});
  assert.deepEqual(R.bacaFragmen("#t=zz&id=1"), {token: null, id: null}); assert.deepEqual(R.bacaFragmen(""), {token: null, id: null});
});
test("daftarRenlapHtml: status, unduh PDF dan salin tautan HP hanya untuk siap; pesan antre tampil apa adanya", () => {
  const h = R.daftarRenlapHtml([{id: ID, kompleks_ids: ["K1", "K2"], prov: "62", status: "siap", oleh: "andi", waktu: 1, hp: `/renlap#t=abcdef0123456789abcdef01&id=${ID}`},
    {id: "1111111111111111", kompleks_ids: ["K3"], status: "antre", galat: "mesin belum disambungkan", oleh: "budi"}, {id: "2222222222222222", kompleks_ids: ["K4"], status: "gagal", galat: "peta gagal"}], {origin: "https://x.id"});
  assert.match(h, new RegExp(`/api/sippa/renlap/${ID}/pdf`)); assert.match(h, /data-salin-renlap="https:\/\/x\.id\/renlap#t=/); assert.match(h, /mesin belum disambungkan/); assert.match(h, />Antre</); assert.match(h, />Gagal</);
  assert.equal((h.match(/Unduh PDF/g) || []).length, 1); assert.doesNotMatch(h, /[—·]/);
  assert.match(R.daftarRenlapHtml([]), /Belum ada renlap/); assert.throws(() => R.jalurPdfRenlap("../x"));
});
test("hasilBuatHtml: tautan HP, tombol salin, dan peringatan simpan sekarang tampil seketika; tanpa tautan dijelaskan", () => {
  const h = R.hasilBuatHtml({renlap: {status: "antre"}, hp: `/renlap#t=abcdef0123456789abcdef01&id=${ID}`, pesan: "mesin belum disambungkan"}, "https://x.id");
  assert.match(h, /Simpan sekarang/); assert.match(h, /data-salin-renlap/); assert.match(h, /mesin belum disambungkan/); assert.match(h, /Antre/); assert.match(R.hasilBuatHtml({renlap: {}}), /tidak mengirim tautan/);
});
test("koordinat: titik desimal tetap lima angka, bukan format Indonesia", () => {
  assert.equal(R.teksKoordinat(-2.123456, 113.9), "-2.12346, 113.90000"); assert.match(R.tautanKoordinat(-2.1, 113.9), /query=-2\.10000,113\.90000$/);
});
test("halaman HP /renlap: CSP ketat (tanpa gaya sebaris, tanpa skrip sebaris), header token, tanpa innerHTML dan tanpa hex di CSS", () => {
  const html = baca("public/renlap.html"), js = baca("public/renlap.js"), css = baca("public/renlap.css");
  assert.doesNotMatch(html, /\sstyle=|<style|<script(?![^>]*\ssrc=)/); assert.match(html, /name="robots" content="noindex/); assert.match(html, /src="\/renlap\.js"/);
  assert.match(js, /x-renlap-token/); assert.match(js, /\/api\/renlap\/data\?id=/); assert.doesNotMatch(js, /innerHTML|\.style\b|eval\(|openfreemap|maplibre/);
  assert.match(js, /409/); assert.match(js, /429/); assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  for (const t of [html, js, css, baca("public/pipa/renlap.js")]) { assert.doesNotMatch(t, /[—·]/); assert.doesNotMatch(t, /titik api/i); }
});
