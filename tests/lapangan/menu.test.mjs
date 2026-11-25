import test from "node:test";
import assert from "node:assert/strict";
import {pasangMenu, butirPetugas, bacaSimpan} from "../../public/petugas/menu.js";

const PETA = [
  {pintu: "publik", nama: "Publik", beranda: "/", grup: [{id: "umum", nama: "Umum", butir: [{rute: "/", nama: "Peta", ikon: "pin"}]}]},
  {pintu: "petugas", nama: "Petugas lapangan", beranda: "/petugas", grup: [{id: "lapangan", nama: "Lapangan", butir: [
    {rute: "/petugas", nama: "Pegawai dan relawan lapangan", ikon: "personel", grup: "lapangan"},
    {rute: "/petugas/panel", nama: "Panel lapangan", ikon: "grafik", grup: "lapangan"},
    {rute: "/lapangan", nama: "Lapor lapangan", ikon: "pin", grup: "lapangan"},
    {rute: "/uji-lapangan", nama: "Uji lapangan karhutla", ikon: "daftar", grup: "lapangan"},
    {rute: "/kemitraan/sertifikat/:id", nama: "Pola", ikon: "simpan"},
    {rute: "//jahat.example", nama: "Luar", ikon: "pin"},
    {rute: "javascript:alert(1)", nama: "Skrip", ikon: "pin"}]}]}];
const jawab = (data, ok = true, status = ok ? 200 : 500) => async () => ({ok, status, json: async () => data});
const rute = h => [...h.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
const gudang = (awal = {}) => { const m = new Map(Object.entries(awal)); return {m, getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)}; };
const SEMUA = ["/petugas", "/petugas/panel", "/lapangan", "/uji-lapangan"];

test("menu: tanpa daftar tulisan tangan (PS-09); jawaban API digambar dan disimpan di HP", async () => {
  const el = {innerHTML: ""}, g = gudang();
  let panggil = 0;
  const janji = pasangMenu(el, {kini: "/petugas/", simpan: g, ambil: async (u, o) => { panggil++; assert.equal(u, "/api/peta-situs"); assert.equal(o.credentials, "same-origin"); return jawab(PETA)(); }});
  assert.equal(el.innerHTML, "", "tanpa simpanan: tidak ada menu karangan sebelum API menjawab");
  await janji;
  assert.equal(panggil, 1);
  assert.deepEqual(rute(el.innerHTML), SEMUA);
  assert.match(el.innerHTML, /href="\/petugas" aria-current="page"/);
  assert.doesNotMatch(el.innerHTML, /[A-Z]{4,}|·/);
  assert.deepEqual(bacaSimpan(g).map(b => b[0]), SEMUA);
});

test("menu: luring atau galat server memakai simpanan; tanpa simpanan satu pesan polos + beranda", async () => {
  const awal = {"pt-menu": JSON.stringify(SEMUA.map(r => [r, r, "daftar"]))};
  for (const ambil of [async () => { throw new TypeError("Failed to fetch"); }, jawab({}, false)]) {
    const el = {innerHTML: ""};
    await pasangMenu(el, {kini: "/petugas", ambil, simpan: gudang(awal)});
    assert.deepEqual(rute(el.innerHTML), SEMUA);
    const kosong = {innerHTML: ""};
    await pasangMenu(kosong, {kini: "/petugas", ambil, simpan: gudang()});
    assert.deepEqual(rute(kosong.innerHTML), ["/petugas"]);
    assert.match(kosong.innerHTML, /Menu belum bisa dimuat\. Muat ulang halaman\./);
  }
});

test("menu: jawaban 200 tanpa pintu petugas atau bukan larik: simpanan dibuang, pesan polos + beranda", async () => {
  const awal = {"pt-menu": JSON.stringify(SEMUA.map(r => [r, r, "daftar"]))};
  for (const ambil of [jawab([PETA[0]]), jawab("bukan larik")]) {
    const el = {innerHTML: ""}, g = gudang(awal);
    await pasangMenu(el, {kini: "/petugas", ambil, simpan: g});
    assert.deepEqual(rute(el.innerHTML), ["/petugas"]);
    assert.equal(bacaSimpan(g), null);
  }
});

test("menu: jawaban sama dengan simpanan tidak menggambar ulang; 401 menghapus simpanan", async () => {
  const g = gudang();
  await pasangMenu({innerHTML: ""}, {kini: "/petugas", ambil: jawab(PETA), simpan: g});
  let tulis = 0; const el = {get innerHTML() { return this.h || ""; }, set innerHTML(v) { tulis++; this.h = v; }};
  await pasangMenu(el, {kini: "/petugas", ambil: jawab(PETA), simpan: g});
  assert.equal(tulis, 1, "hanya gambar awal dari simpanan");
  await pasangMenu({innerHTML: ""}, {kini: "/petugas", ambil: jawab({galat: "sesi"}, false, 401), simpan: g});
  assert.equal(bacaSimpan(g), null);
});

test("menu: jawaban 200 tanpa pintu petugas dan tombol Keluar membuang simpanan (privasi)", async () => {
  const g = gudang();
  await pasangMenu({innerHTML: ""}, {kini: "/petugas", ambil: jawab(PETA), simpan: g});
  await pasangMenu({innerHTML: ""}, {kini: "/petugas", ambil: jawab([PETA[0]]), simpan: g});
  assert.equal(bacaSimpan(g), null, "200 tanpa pintu petugas");
  await pasangMenu({innerHTML: ""}, {kini: "/petugas", ambil: jawab(PETA), simpan: g});
  await pasangMenu({innerHTML: ""}, {kini: "/petugas", ambil: jawab({}, false, 503), simpan: g});
  assert.ok(bacaSimpan(g), "5xx: simpanan tetap (luring)");
  const dengar = {}, lama = globalThis.document;
  globalThis.document = {addEventListener: (t, f) => { dengar[t] = f; }};
  try {
    await pasangMenu({innerHTML: ""}, {kini: "/petugas", ambil: async () => { throw new TypeError("luring"); }, simpan: g});
    dengar.click({target: {closest: q => q.includes("#keluar") ? {} : null}});
  } finally { globalThis.document = lama; }
  assert.equal(bacaSimpan(g), null, "klik Keluar");
});

test("menu: simpanan rusak atau tak aman dibuang; butir tak aman dibuang; nama di-escape", async () => {
  assert.equal(bacaSimpan(gudang({"pt-menu": "{bukan json"})), null);
  assert.equal(bacaSimpan(gudang({"pt-menu": JSON.stringify([["javascript:alert(1)", "x", "daftar"], ["//x", "y", "daftar"], ["/a", "z", "__proto__"]])})), null);
  for (const r of ["//x", "/\\evil.com", "javascript:x", "/a:b"]) {
    assert.equal(butirPetugas([{pintu: "petugas", grup: [{butir: [{rute: r, nama: "a"}]}]}]), null, r);
    assert.equal(bacaSimpan(gudang({"pt-menu": JSON.stringify([[r, "a", "daftar"]])})), null, "simpanan " + r);
  }
  const b = butirPetugas([{pintu: "petugas", grup: [{butir: [{rute: "/petugas", nama: "<b>", ikon: "__proto__"}]}]}]);
  assert.deepEqual(b, [["/petugas", "<b>", "daftar"]]);
  const el = {innerHTML: ""};
  await pasangMenu(el, {kini: "/x", ambil: jawab([{pintu: "petugas", grup: [{butir: [{rute: "/petugas", nama: "<b>"}]}]}]), simpan: gudang()});
  assert.match(el.innerHTML, /&lt;b&gt;/);
});
