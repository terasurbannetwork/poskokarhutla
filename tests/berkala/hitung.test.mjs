/* Uji layar murni Laporan Berkala (RENCANA-UJI 2): modul public/laporan_berkala_hitung.js dan berkas cetak, tanpa peramban.
   L1 format, L2/L4/L4b kelengkapan, L7 gelar, L8 tanpa kapital, L10 beda versi. L9, L11, L12 diuji di Chrome (cetak_layar.test.mjs). */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as H from "../../public/laporan_berkala_hitung.js";

const akar = new URL("../../", import.meta.url);
const baca = p => readFileSync(new URL(p, akar), "utf8");
const angka = JSON.parse(baca("tests/berkala/fixtures/angka_bulanan.json"));
const salin = o => JSON.parse(JSON.stringify(o));

test("L1 format angka Indonesia; kosong tidak pernah jadi 0", () => {
  assert.equal(H.angka(183316), "183.316");
  assert.equal(H.persen(68.5), "68,5%");
  assert.equal(H.luas(854069.4), "854.069");
  assert.equal(H.angka(5.4, 1), "5,4");
  for (const v of [null, undefined, NaN]) { assert.equal(H.angka(v), "tidak diketahui"); assert.equal(H.persen(v), "tidak diketahui"); assert.equal(H.luas(v), "tidak diketahui"); }
  assert.equal(H.angka(0), "0");
  assert.equal(H.tanggal("2026-10-06"), "6 Oktober 2026");
  assert.equal(H.tanggal("2026-10"), "Oktober 2026");
  assert.equal(H.banding({arah: "turun", kini: 324, lalu: 386, persen: 16.1}), "turun 16,1%");
  assert.equal(H.banding({arah: "baru", kini: 3, lalu: 0, persen: null}), "baru");
  assert.equal(H.banding({arah: "tetap 0", kini: 0, lalu: 0, persen: null}), "tetap 0");
  assert.equal(H.banding({arah: "naik", kini: 3, lalu: null, persen: null}), "tidak bisa dibandingkan", "lalu tidak diketahui tidak pernah 'baru'");
});

test("L7 gelar Kepala BNPB satu konstanta, dipakai halaman cetak", () => {
  assert.equal(H.KEPALA_BNPB, "Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)");
  assert.ok(!/Kristomei/.test(baca("public/laporan_berkala.js")), "gelar ditulis ulang di laporan_berkala.js; pakai H.KEPALA_BNPB");
});

test("L8 tanpa text-transform uppercase dan tanpa titik tengah di berkas cetak", () => {
  const css = baca("public/laporan_berkala_cetak.css").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(css, /text-transform\s*:\s*uppercase/i);
  for (const f of ["public/laporan_berkala.js", "public/laporan_berkala_hitung.js", "public/laporan_berkala_cetak.css"]) assert.ok(!baca(f).includes("·"), `${f} memakai titik tengah`);
});

test("L2 kalimat pembuka kosong menahan Bekukan dan menyebut Ringkasan Eksekutif", () => {
  const k = H.kelengkapan(angka, {});
  assert.ok(k.some(x => /^Ringkasan Eksekutif: kalimat pembuka/.test(x)), k.join("; "));
  assert.ok(k.includes("Bab 7.2: dukungan yang dimohon"));
  assert.ok(k.includes("Bab 2 Karhutla: action plan"), "bab dengan kejadian tanpa action plan menahan");
});

test("L4 bab tanpa kejadian dan action plan kosong tidak menahan; isian lengkap lolos", () => {
  const a = salin(angka);
  for (const j of ["gempa", "erupsi"]) a.bab1.jenis[j].kejadian = 0;
  const ap = {sudah: "x", sedang: "", akan: ""};
  const isian = {pembuka: "Pembuka.", temuan_ringkas: [{pil: "data", kalimat: "x"}], dukungan: [{langkah: "x"}], action: {bab1: ap, bab2: ap, bab3: ap, bab4: ap}};
  assert.deepEqual(H.kelengkapan(a, isian), []);
  assert.ok(H.kelengkapan(angka, isian).includes("Bab 5 Geologi: action plan"), "fixture asli punya gempa, jadi bab 5 tetap wajib");
  assert.deepEqual(H.kelengkapan(a, {...isian, foto: [{kredit: "BNPB"}, {kredit: "Media", media: true, izin: true}]}), []);
  assert.deepEqual(H.kelengkapan(a, {...isian, foto: [{kredit: ""}, {kredit: "x", media: true}]}), ["Dokumentasi: foto tanpa kredit", "Dokumentasi: foto media tanpa tanda izin"]);
  const gagal = salin(a); gagal.sumber.dibi.status = "sebagian";
  assert.deepEqual(H.kelengkapan(gagal, isian), ["Sumber DIBI belum lengkap"]);
});

test("L4b kelengkapan per periode: harian tanpa dukungan tidak menahan, bulanan menahan", () => {
  const isian = {pembuka: "x", temuan_ringkas: [{}]};
  const kosongAngka = {sumber: {dibi: {status: "ok"}}};
  assert.ok(!H.kelengkapan(kosongAngka, isian, "harian").includes("Bab 7.2: dukungan yang dimohon"));
  assert.ok(H.kelengkapan(kosongAngka, isian, "bulanan").includes("Bab 7.2: dukungan yang dimohon"));
});

test("L10 beda versi: hanya jalur yang berubah, urut perubahan relatif", () => {
  const baru = salin(angka);
  baru.bab1.alam.kejadian = 61;            // 58 -> 61, 5,2%
  baru.bab2.hot = 83226;                   // 41613 -> 83226, 100%
  baru.sumber.dibi.tarik = "2026-11-24";   // teks berubah
  baru.dirakit = "2026-11-26T03:10:00Z";   // diabaikan
  const b = H.beda(angka, baru);
  assert.deepEqual(b.map(x => x.jalur), ["sumber.dibi.tarik", "bab2.hot", "bab1.alam.kejadian"]);
  assert.equal(b[1].lama, 41613); assert.equal(b[1].baru, 83226); assert.equal(b[1].relatif, 1);
  assert.deepEqual(H.beda(angka, salin(angka)), []);
  assert.equal(H.ratakan({a: [{b: 1}], s: "x".repeat(81)})["a[0].b"], 1);
  assert.ok(!("s" in H.ratakan({s: "x".repeat(81)})), "teks panjang tidak dibandingkan");
});
