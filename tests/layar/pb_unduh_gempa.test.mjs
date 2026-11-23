// PB-71 (F-34): adaptor gempa public/gempa/unduh.js + gerbang registri di mesin public/inti/unduh_tabel.js.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));

/* DOM palsu: elemen dengan textContent, children, querySelector(All) menurut tabel selektor */
const el = (t, o = {}) => ({textContent: t, children: o.anak || [], querySelector: s => (o.q || {})[s] || null, querySelectorAll: s => (o.qa || {})[s] || []});
const sel = (...t) => el("", {anak: [el("rank"), ...t.map(x => el(x))]});
const html = (kolom, baris) => el("", {q: {}, qa: {"thead th": kolom.map(x => el(x)), "tbody tr": baris.map(r => el("", {anak: r.map(x => el(x))}))}});

function dunia({daftar, fetchGagal = false, S, rows, ekstra = {}} = {}) {
  const win = {}; win.window = win; const dengar = {};
  const dok = {body: {classList: {add() {}, remove() {}}}, head: {append() {}}, addEventListener: (n, f) => { (dengar[n] ||= []).push(f); }, dispatchEvent: e => { (dengar[e.type] || []).forEach(f => f(e)); return true; },
    querySelector: s => ({"#rows": rows, ...ekstra})[s] || null};
  const ctx = {window: win, document: dok, console, setTimeout, Date, Intl, Promise, S: S || {rentang: 72, jalur: []}, Kejadian: {st: {hal: 1}},
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o?.detail; } }, renderDaftar: () => { ctx.digambar = (ctx.digambar || 0) + 1; }};
  if (daftar !== undefined || fetchGagal) ctx.fetch = async () => fetchGagal ? {ok: false, status: 500} : {ok: true, json: async () => ({bencana: daftar})};
  const k = vm.createContext(ctx); vm.runInContext(baca("public/inti/unduh_tabel.js"), k); return {win, ctx, k};
}
const tunggu = () => new Promise(r => setTimeout(r, 5));
const reg = (id, ok) => ({id, bagikan: {sumber: "BMKG, USGS"}, kemampuan: {layar: {unduh_tabel: ok}}});

test("gerbang registri: id dengan unduh_tabel false tidak memasang tombol; true memasang dan memberi tahu adaptor", async () => {
  const d = dunia({daftar: [reg("gempa", false), reg("banjir", true)]}); const T = d.win.UnduhTabel;
  T.tema({id: "gempa", kumpul: async () => ({})}); await tunggu(); assert.equal(T.tombol(), ""); assert.equal(T.diizinkan(), false);
  const e = dunia({daftar: [reg("gempa", true)]}); let dengar = 0; e.win.UnduhTabel; e.k.document.addEventListener("unduh-tabel-siap", () => dengar++);
  e.win.UnduhTabel.tema({id: "gempa", kumpul: async () => ({})}); assert.equal(e.win.UnduhTabel.tombol(), ""); await tunggu();
  assert.match(e.win.UnduhTabel.tombol(), /data-unduh/); assert.equal(dengar, 1);
});
test("gerbang registri: registri gagal dimuat atau id tak terdaftar = tidak dipasang; karhutla tetap tampil", async () => {
  for (const o of [{fetchGagal: true}, {daftar: []}, {}]) {
    const d = dunia(o), T = d.win.UnduhTabel; T.tema({id: "gempa", kumpul: async () => ({})}); await tunggu(); assert.equal(T.tombol(), "", JSON.stringify(o));
    const k = dunia(o).win.UnduhTabel; k.tema({id: "karhutla", kumpul: async () => ({})}); assert.match(k.tombol(), /data-unduh/); await tunggu(); assert.match(k.tombol(), /data-unduh/);
  }
  const d = dunia({daftar: [reg("karhutla", false)]}); d.win.UnduhTabel.tema({id: "karhutla", kumpul: async () => ({})}); await tunggu(); assert.match(d.win.UnduhTabel.tombol(), /data-unduh/);
});
test("adaptor gempa: tiga tabel dibaca dari yang tampil; yang belum dirender dilewati", async () => {
  const rows = el("", {q: {".tb.kepala": sel("Provinsi", "Gempa", "Dirasakan", "Terbesar")}, qa: {"button.tb[data-k]": [sel(" Aceh ", "12", "3", "M 5,1"), sel("Papua", "7", "–", "M 6,0")]}});
  const ekstra = {"#kejadian table": html(["Kode ↓", "Gempa utama"], [["G0016", "Maluku"]]), "#inaTabel table": html(["Waktu", "Kekuatan"], [["10.00", "5,0"]]),
    "#katalog .ina-seg [aria-pressed=true]": el("Dirasakan")};
  const d = dunia({daftar: [reg("gempa", true)], rows, ekstra, S: {rentang: 72, jalur: []}}); vm.runInContext(baca("public/gempa/unduh.js"), d.k);
  const L = await d.win.UnduhTabelGempa.kumpul();
  assert.deepEqual(stabil(L.tabel.map(t => t.nama)), ["Provinsi", "Kejadian", "Katalog BMKG"]);
  assert.deepEqual(stabil(L.tabel[0]), {nama: "Provinsi", ket: "Periode: 72 jam", kolom: ["Provinsi", "Gempa", "Dirasakan", "Terbesar"], baris: [["Aceh", "12", "3", "M 5,1"], ["Papua", "7", "–", "M 6,0"]]});
  assert.deepEqual(stabil(L.tabel[1].kolom), ["Kode", "Gempa utama"]); assert.equal(L.tabel[1].ket, "Halaman 2, seperti tampil di layar"); assert.equal(L.tabel[2].ket, "Dirasakan");
  assert.equal(L.sumber, "Sumber: BMKG, USGS"); assert.equal(L.namaTabel, "laporan"); assert.match(L.iso, /^\d{4}-\d\d-\d\d$/);
  // hanya provinsi tampil: nama berkas memuat nama tabel
  const e = dunia({daftar: [reg("gempa", true)], rows, S: {rentang: 168, jalur: []}}); vm.runInContext(baca("public/gempa/unduh.js"), e.k);
  const M = await e.win.UnduhTabelGempa.kumpul(); assert.equal(M.tabel.length, 1); assert.equal(M.tabel[0].ket, "Periode: 7 hari");
  assert.equal(e.win.UnduhTabel.model.namaBerkas({id: "gempa"}, M, "xlsx"), `gempa-provinsi-${M.iso}.xlsx`);
  // di dalam provinsi (jalur terisi) tabel provinsi tidak ada
  const f = dunia({daftar: [reg("gempa", true)], rows, S: {rentang: 24, jalur: ["ID-AC"]}}); vm.runInContext(baca("public/gempa/unduh.js"), f.k);
  assert.equal((await f.win.UnduhTabelGempa.kumpul()).tabel.length, 0);
});
test("adaptor gempa: S.tanggal terisi = keterangan Tanggal dan nama berkas memakai tanggal itu", async () => {
  const rows = el("", {q: {".tb.kepala": sel("Provinsi", "Gempa")}, qa: {"button.tb[data-k]": [sel("Aceh", "12")]}});
  const d = dunia({daftar: [reg("gempa", true)], rows, S: {rentang: 72, jalur: [], tanggal: "2026-11-15"}}); vm.runInContext(baca("public/gempa/unduh.js"), d.k);
  const L = await d.win.UnduhTabelGempa.kumpul(); assert.equal(L.tabel[0].ket, "Tanggal: 15 Nov 2026"); assert.equal(L.iso, "2026-11-15");
  assert.equal(d.win.UnduhTabel.model.namaBerkas({id: "gempa"}, L, "xlsx"), "gempa-provinsi-2026-11-15.xlsx");
});
test("adaptor gempa menggambar ulang daftar saat registri siap; peta.js memasang tombol hanya lewat UnduhTabel.tombol()", async () => {
  const d = dunia({daftar: [reg("gempa", true)]}); vm.runInContext(baca("public/gempa/unduh.js"), d.k); await tunggu(); assert.equal(d.ctx.digambar, 1);
  const peta = baca("public/gempa/peta.js"); assert.match(peta, /UnduhTabel\?\.tombol\(\)/);
  const ad = baca("public/gempa/unduh.js"); assert.doesNotMatch(ad, /XLSX|jspdf|docx|aoa_to_sheet|autoTable|toBlob/); assert.doesNotMatch(ad, / · /);
});
