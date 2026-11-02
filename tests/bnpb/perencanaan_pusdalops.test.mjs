/* Fungsi murni halaman Perencanaan (public/bnpb/perencanaan_pusdalops.js) terhadap tiga JSON nyata di public/data/bnpb.
   Jalan: node --test tests/bnpb/perencanaan_pusdalops.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../public/bnpb/perencanaan_pusdalops.js";
const P = globalThis.PerencanaanPusdalops, baca = n => JSON.parse(readFileSync(new URL(`../../public/data/bnpb/${n}.json`, import.meta.url), "utf8"));
const kab = baca("kab_prioritas"), kal = baca("kalender_operasi"), stok = baca("stok_prapemusim");

test("format Indonesia: ribuan titik, desimal koma, persen bulat, tanggal singkat", () => {
  assert.equal(P.fmt(1234567.891, 1), "1.234.567,9"); assert.equal(P.fmt(1234.567, 3), "1.234,567"); assert.equal(P.fmt(2.4), "2,4"); assert.equal(P.fmt(null), "–");
  assert.equal(P.persen(82.5), "83%"); assert.equal(P.persen(null), "–"); assert.equal(P.bulat(3365), "3.365");
  assert.equal(P.tglIndo("2026-10-12T05:00:00+00:00"), "12 Okt 2026"); assert.equal(P.tglIndo("2026-11-01T11:44:52+00:00"), "1 Nov 2026");
});

test("daftar kab: 51 menurut peringkat; mode alam memakai prioritas_bencana_alam dan memasangkan rincian", () => {
  const s = P.daftarKab(kab, "semua"); assert.equal(s.length, kab.n_kab_prioritas); assert.equal(s.length, 51);
  assert.deepEqual(s.map(r => r.peringkat), s.map((_, i) => i + 1)); assert.ok(s.every(r => r.rinci && r.rinci.kab === r.kab));
  const a = P.daftarKab(kab, "alam"); assert.equal(a.length, kab.prioritas_bencana_alam.length);
  assert.ok(a.every((r, i) => i === 0 || a[i - 1].peringkat <= r.peringkat)); assert.ok(a.some(r => r.rinci === null) || a.length === 51);
  assert.ok(s.some(r => r.dominanNonAlam), "ada kab dominan non-bencana-alam");
});

test("pasangan berantai: urut menurut n pemicu, BUKAN lift", () => {
  const rinci = kab.kab.find(k => k.berantai.length >= 3), p = P.pasangan(rinci.berantai);
  assert.ok(p.every((x, i) => i === 0 || p[i - 1].n >= x.n));
  const sintetis = P.pasangan([{pasangan: "a>b", n: 10, k: 5, laju: .5, lift: 9, ci95: [1.1, 9], ci_tanpa_koreksi_di_atas_1: true}, {pasangan: "c>d", n: 50, k: 9, laju: .2, lift: 1.1, ci95: [.8, 1.5], ci_tanpa_koreksi_di_atas_1: false}]);
  assert.deepEqual(sintetis.map(x => x.nama), ["C lalu d", "A lalu b"]); assert.equal(sintetis[1].selang, "1,1 s.d. 9"); assert.equal(sintetis[0].diAtas1, false);
});

test("kalender: persiapan hanya bila persiapan_logistik_dipakai bukan null dan entri tidak pudar", () => {
  const jenis = P.jenisKalender(kal); assert.ok(jenis.includes("banjir") && jenis.includes("karhutla"));
  let diperiksa = 0, pudar = 0;
  for (const j of jenis) for (const r of P.barisKalender(kal, j)) {
    const e = kal.provinsi[r.kode].jenis[j], ada = r.sel.some(c => c.s === "persiapan"); diperiksa++;
    assert.equal(r.sel.length, 12);
    if (e.keyakinan === "rendah" || e.tidak_musiman) { pudar++; assert.equal(r.pudar, true); assert.equal(r.siap, null); assert.equal(ada, false, `${r.nama} ${j}`); assert.equal(r.sumber, null); }
    else if (e.persiapan_logistik_dipakai == null) assert.equal(ada, false);
    else assert.equal(r.siap, e.persiapan_logistik_dipakai);
  }
  assert.ok(diperiksa >= 100 && pudar > 0);
  const jb = P.barisKalender(kal, "banjir").find(r => r.kode === "32"); assert.equal(jb.keyakinan, "tinggi"); assert.equal(jb.sel[1].s, "puncak"); assert.equal(jb.sel[9].s, "persiapan"); assert.equal(jb.sumber, "laporan");
});

test("stok: ekstrapolasi 'tidak andal' bila cakupan rendah; selang Wilson dan persen bulat", () => {
  let tidakAndal = 0, terbatas = 0;
  for (const j of P.jenisStok(stok)) for (const r of P.barisStok(stok, j)) {
    const kat = P.kategoriStok(r.grup, r.tidakAndal); tidakAndal += r.tidakAndal ? 1 : 0; terbatas += r.tidakAndal ? 0 : 1;
    if (r.tidakAndal) assert.ok(kat.every(c => c.ekstrapolasi === null)); else assert.ok(r.cakupan >= 10, "terbatas hanya bila cakupan >= 10%");
    for (const c of kat) assert.match(c.selang, /^\d+% s\.d\. \d+%$/);
  }
  assert.ok(tidakAndal > 0 && terbatas > 0);
  assert.ok(P.barisStok(stok, "banjir").length >= 10);
});
