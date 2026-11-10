/* kelompokBase (public/operasi_laporan.js): armada dikelompokkan per base, urut nama, tanpa data base di akhir. Jalankan: node --test tests/layar/operasi_base.test.mjs */
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync, existsSync} from "node:fs";
import vm from "node:vm";

const win = {};
vm.runInNewContext(readFileSync(new URL("../../public/operasi_laporan.js", import.meta.url), "utf8"), {window: win, document: {querySelector: () => null}, localStorage: {}});

test("alasan renlap jadi label terbaca, medan mentah tidak tampil", () => {
  const f = x => JSON.parse(JSON.stringify(win.OperasiLaporan.alasanRenlap(x)));
  assert.deepEqual(f({teks: "tanpa titik baru; gambut; permukiman 0.9 km", titik_baru: 0, ffmc_basi: true}), ["Tanpa titik baru", "Gambut", "Permukiman 0,9 km"]);
  assert.deepEqual(f({titik_baru: 0, ffmc_basi: true}), []);
  assert.deepEqual(f(["a; b", {ket: "c"}]), ["A", "B", "C"]);
});

test("armada dikelompokkan per base, urut nama, tanpa base di akhir", () => {
  const base = [{id: "b2", nama: "Pekanbaru / Sultan Syarif"}, {id: "b1", nama: "Banjarmasin / Syamsudin"}];
  /* JSON round-trip: array dari vm beda realm, deepStrictEqual menolaknya */
  const g = JSON.parse(JSON.stringify(win.OperasiLaporan.kelompokBase([{registrasi: "RA-2", base_id: "b2"}, {registrasi: "ZZ", base_id: "x"}, {registrasi: "N1", base_id: "b1"}, {registrasi: "RA-1", base_id: "b2"}, {registrasi: "Q"}], base)));
  assert.deepEqual(g.map(x => x.nama), ["Banjarmasin", "Pekanbaru", "Base belum tercatat"]);
  assert.deepEqual(g[1].regs, ["RA-1", "RA-2"]);
  assert.deepEqual(g[2].regs, ["Q", "ZZ"]);
});

test("foto dokumentasi per tanggal terbaru dulu, lalu per base, tanpa base di akhir", () => {
  const base = [{id: "b2", nama: "Pekanbaru / Sultan Syarif"}, {id: "b1", nama: "Ketapang / Rahadi"}];
  const g = JSON.parse(JSON.stringify(win.OperasiLaporan.kelompokFoto([{tanggal: "2026-11-08", base: "b1", url: "a"}, {tanggal: "2026-11-09", base: "x", url: "b"}, {tanggal: "2026-11-09", base: "b2", url: "c"}, {tanggal: "2026-11-09", base: "b1", url: "d"}, {tanggal: "2026-11-09", base: "b1", url: "e"}], base)));
  assert.deepEqual(g.map(h => [h.tanggal, h.n]), [["2026-11-09", 4], ["2026-11-08", 1]]);
  assert.deepEqual(g[0].base.map(b => [b.nama, b.foto.length]), [["Ketapang", 2], ["Pekanbaru", 1], ["Base belum tercatat", 1]]);
  assert.deepEqual(g[0].base[0].foto.map(f => f.url), ["d", "e"]);
});

test("tabel operator: kolom base berjumlah armada dan Grand total di baris pertama", () => {
  const win2 = {OpsUdara: {kontrak: () => [{jam_operasi_menit: 120}], persen: v => Math.round(v * 100) + "%"}};
  vm.runInNewContext(readFileSync(new URL("../../public/operasi_laporan.js", import.meta.url), "utf8"), {window: win2, document: {querySelector: () => null}, localStorage: {}, fmt: v => String(v), esc: v => String(v)});
  const html = win2.OperasiLaporan.kartuOperator({
    peta: {base: [{id: "b1", nama: "Palembang / SMB II"}, {id: "b2", nama: "Pontianak"}], armada: [{registrasi: "A", operator: "PT X", base_id: "b1"}, {registrasi: "B", operator: "PT X", base_id: "b1"}, {registrasi: "C", operator: "PT Y", base_id: "b2"}, {registrasi: "D"}]},
    mon: {kpi: {armada: {A: {hari_siap: 4, hari_terbang: 6, utilisasi: 0.75, sortie: 3, aksi_wb: 2, padam: 1, dinilai: 2}, C: {hari_siap: 10, hari_terbang: 5, utilisasi: 0.5, sortie: 1, aksi_wb: 2, padam: 1, dinilai: 2}}}}});
  assert.match(html, /Base \(jumlah armada\)/);
  assert.match(html, /Palembang \(2\)/);
  assert.match(html, /Base belum tercatat \(1\)/);
  const baris = html.split("<tr").slice(2).map(b => [...b.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(m => m[1].replace(/<[^>]+>/g, "")));
  assert.equal(baris[0][0], "Grand total");
  assert.deepEqual(baris[0].slice(1, 8), ["2 base", "4", "14", "11", "57%", "4", "4"]);
  assert.equal(baris[1][5], "75%", "terbang 6 hari, siap 4 hari: 3 hari siap yang terbang, bukan 150%");
});

test("foto tipe: pemetaan tipe nyata ke berkas yang ada, foto asli menang, tipe asing tanpa foto", () => {
  const sumber = readFileSync(new URL("../../public/operasi_peta.js", import.meta.url), "utf8");
  const potong = sumber.slice(sumber.indexOf("const FOTO = new Set"), sumber.indexOf("const imgAr"));
  const c = {encodeURIComponent}; vm.runInNewContext(potong + ";this.fotoAr = fotoAr;", c);
  const tipe = t => c.fotoAr({registrasi: "X", tipe: t})?.src?.match(/tipe\/(\w+)\.webp/)?.[1];
  for (const [t, f] of [["CASA NC-212", "casa212"], ["CN-295", "cn295"], ["Hercules C-130H", "c130"], ["Cessna Grand Caravan 208B", "c208"], ["C208B-EX", "c208"], ["BELL 206", "bell206"], ["Bell 505", "bell505"], ["MI-172", "mi8"], ["MI 8 AMT", "mi8"], ["Kamov KA-32", "ka32"], ["KAMOV KA32A0", "ka32"], ["Sikorsky UH-60L Black Hawk", "uh60"], ["Sikorsky S-61N", "s61"], ["NAS-332 Super Puma", "as332"], ["AS350B3e", "as350"], ["SA330J Puma", "sa330"]]) {
    assert.equal(tipe(t), f, t);
    assert.ok(existsSync(new URL(`../../public/img/armada/tipe/${f}.webp`, import.meta.url)), f);
  }
  assert.equal(c.fotoAr({registrasi: "PK-RTY", tipe: "AS 365 N2"}).src, "/img/armada/PK-RTY.webp");
  assert.equal(c.fotoAr({registrasi: "X", tipe: "TRUSH S2R T34"}), null);
  assert.ok(!/foto contoh/i.test(sumber));
});

test("kartu OMC resmi BMKG: hanya yang aktif hari ini, karhutla dulu; tanpa data = kosong", () => {
  const w = {}, o = JSON.parse(readFileSync(new URL("../../public/udara/data/omc_bmkg.json", import.meta.url), "utf8"));
  vm.runInNewContext(readFileSync(new URL("../../public/operasi_laporan.js", import.meta.url), "utf8"), {window: w, document: {querySelector: () => null}, localStorage: {}, fmt: v => String(v), esc: v => String(v), Date: class extends Date { constructor(...a) { a.length ? super(...a) : super("2026-11-10T05:00:00Z"); } static now() { return Date.parse("2026-11-10T05:00:00Z"); } }});
  assert.equal(w.OperasiLaporan.kartuOmcResmi({}), "");
  const h = w.OperasiLaporan.kartuOmcResmi({omcBmkg: o});
  assert.match(h, /OMC resmi BMKG aktif/);
  assert.match(h, /Kalimantan Tengah/);
  assert.ok(h.indexOf("Kalimantan Tengah") < h.indexOf("DKI Jakarta"), "karhutla di atas");
});
