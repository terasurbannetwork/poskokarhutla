import test from "node:test";
import assert from "node:assert/strict";
import {pasangMenu, butirPetugas, CADANGAN} from "../../public/petugas/menu.js";

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
const jawab = (data, ok = true) => async () => ({ok, json: async () => data});
const rute = h => [...h.matchAll(/href="([^"]+)"/g)].map(m => m[1]);

test("menu: cadangan tergambar seketika, lalu diganti pintu petugas dari API (panel ikut bila Worker meloloskannya)", async () => {
  const el = {innerHTML: ""};
  let panggil = 0;
  const janji = pasangMenu(el, {kini: "/petugas/", ambil: async (u, o) => { panggil++; assert.equal(u, "/api/peta-situs"); assert.equal(o.credentials, "same-origin"); return jawab(PETA)(); }});
  assert.deepEqual(rute(el.innerHTML), CADANGAN.map(c => c[0]));
  await janji;
  assert.equal(panggil, 1);
  assert.deepEqual(rute(el.innerHTML), ["/petugas", "/petugas/panel", "/lapangan", "/uji-lapangan"]);
  assert.match(el.innerHTML, /href="\/petugas" aria-current="page"/);
  assert.doesNotMatch(el.innerHTML, /[A-Z]{4,}|·/);
});

test("menu: luring, galat HTTP, atau sesi tanpa pintu petugas tetap memakai cadangan", async () => {
  for (const ambil of [async () => { throw new TypeError("Failed to fetch"); }, jawab({}, false), jawab([PETA[0]]), jawab("bukan larik")]) {
    const el = {innerHTML: ""};
    await pasangMenu(el, {kini: "/petugas", ambil});
    assert.deepEqual(rute(el.innerHTML), CADANGAN.map(c => c[0]));
  }
});

test("menu: halaman panel menandai dirinya di cadangan; butir tak aman dibuang; nama di-escape", async () => {
  const el = {innerHTML: ""};
  await pasangMenu(el, {kini: "/petugas/panel", ambil: async () => { throw new Error("luring"); }});
  assert.match(el.innerHTML, /href="\/petugas\/panel" aria-current="page"/);
  assert.equal(butirPetugas([{pintu: "petugas", grup: [{butir: [{rute: "//x", nama: "a"}]}]}]), null);
  const b = butirPetugas([{pintu: "petugas", grup: [{butir: [{rute: "/petugas", nama: "<b>", ikon: "__proto__"}]}]}]);
  assert.deepEqual(b, [["/petugas", "<b>", "daftar"]]);
  await pasangMenu(el, {kini: "/x", ambil: jawab([{pintu: "petugas", grup: [{butir: [{rute: "/petugas", nama: "<b>"}]}]}])});
  assert.match(el.innerHTML, /&lt;b&gt;/);
});
