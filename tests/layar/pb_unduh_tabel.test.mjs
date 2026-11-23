// PB-70 (F-34): mesin ekspor tabel bersama public/inti/unduh_tabel.js + adaptor karhutla public/unduh_tabel.js.
// Bukti "karhutla tidak berubah": mesin lama (commit a5f28d77d) dimuat lewat vm, lalu keluarannya dibandingkan dengan mesin baru
// pada fixture yang sama. Pustaka xlsx/docx/jspdf TIDAK dimuat (CDN); diganti perekam panggilan, jadi yang dibandingkan adalah
// semua baris, kolom, dan perintah yang dikirim ke pustaka, bukan byte berkas.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm"; import {execFileSync} from "node:child_process";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const LAMA_COMMIT = "a5f28d77d";
let lamaSrc = null;
try { lamaSrc = execFileSync("git", ["show", `${LAMA_COMMIT}:public/unduh_tabel.js`], {cwd: new URL("../../", import.meta.url), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 24}); } catch { /* tanpa riwayat git: uji banding dilewati */ }
const lewati = lamaSrc ? false : "riwayat git commit a5f28d77d tidak ada";

/* ---- perekam: stub pustaka yang mencatat semua panggilan ---- */
function perekam(log, nama = "") {
  const f = function () {};
  return new Proxy(f, {
    get: (_, p) => { if (p === "then") return undefined; if (p === Symbol.toPrimitive) return () => nama; if (p === "toJSON") return () => nama; if (p === "internal") return {pageSize: {getWidth: () => 595}};
      if (p === "lastAutoTable") return {finalY: 200}; if (typeof p === "symbol") return undefined; return perekam(log, nama + "." + p); },
    set: (_, p, v) => { log.push(["set", nama + "." + p, v]); return true; },
    apply: (_, __, a) => { log.push(["panggil", nama, JSON.parse(JSON.stringify(a, (k, v) => typeof v === "function" ? "[fn]" : v))]); return nama.endsWith(".output") ? "BLOB" : perekam(log, nama + "()"); },
    construct: (_, a) => { log.push(["baru", nama, JSON.parse(JSON.stringify(a, (k, v) => typeof v === "function" ? "[fn]" : v))]); return perekam(log, "baru:" + nama); }});
}
function duniaXlsx(log) {
  const X = {utils: {book_new: () => ({lembar: []}), aoa_to_sheet: aoa => ({aoa, "!cols": null}), book_append_sheet: (wb, ws, n) => log.push(["lembar", n, ws.aoa, ws["!cols"], Object.keys(ws).filter(k => k[0] !== "!")])}, write: () => new Uint8Array(1)};
  return X;
}
function dunia(log) {
  const win = {}; win.window = win;
  const cv = {getContext: () => perekam(log, "ctx"), toBlob: cb => cb(new Blob(["x"])), set width(v) { log.push(["cv.width", v]); }, set height(v) { log.push(["cv.height", v]); }};
  const dok = {body: {classList: {add() {}, remove() {}}}, head: {append() {}}, addEventListener() {}, querySelector: () => null, createElement: t => t === "canvas" ? cv : {}};
  const unduh = []; win.unduhBlob = (b, n) => unduh.push([b, n]);
  win.XLSX = duniaXlsx(log);
  win.docx = perekam(log, "docx"); win.docx.Packer = {toBlob: d => { log.push(["packer", JSON.parse(JSON.stringify(d))]); return new Blob(["d"]); }};
  win.jspdf = {jsPDF: function () { const d = perekam(log, "pdf"); return d; }}; win.jspdf.jsPDF.API = {autoTable() {}};
  return {win, dok, unduh, ctx: {window: win, document: dok, Blob, console, setTimeout, Number, Math, Date, Intl}};
}
const stabil = x => JSON.parse(JSON.stringify(x));

/* ---- fixture model: tabel panel Real Time (bentuk sama dengan keluaran bacaTabel) ---- */
const L = {judul: "Laporan Situasi Karhutla", iso: "2026-11-16", tanggal: "Senin, 16 November 2026, 10:00 WIB", sumber: "Sumber: NASA FIRMS, Copernicus CAMS, BMKG",
  tabel: [
    {nama: "Hotspot", hari: "15 NOV", ket: "", kolom: ["Provinsi", "Hotspot", "Naik", "Tingkat"], baris: [["Riau", "1.234", "12,5", "Siaga"], ["Jambi", "98", "–", "Waspada"]], total: ["Nasional", "1.332", "–", ""]},
    {nama: "Luas terbakar", hari: "", ket: "Periode: 7 hari terakhir", kolom: ["Provinsi", "Luas (ha)"], baris: [["Riau", "3.100,5"], ["Kalimantan Barat", "42"]], total: null},
    {nama: "Belum padam", hari: "16 NOV", ket: "", kolom: ["Provinsi", "Titik"], baris: [["Sumatera Selatan", "7"]], total: ["Nasional", "7"]}]};

test("model: angka id-ID jadi number, teks tetap teks; baris memuat total; judul tabel", () => {
  const M = (() => { const d = dunia([]); vm.runInContext(baca("public/inti/unduh_tabel.js"), vm.createContext(d.ctx)); return d.win.UnduhTabel.model; })();
  assert.equal(M.angka("1.234"), 1234); assert.equal(M.angka("12,5"), 12.5); assert.equal(M.angka("3.100,5"), 3100.5); assert.equal(M.angka("–"), "–"); assert.equal(M.angka("Riau"), "Riau");
  assert.equal(M.baris(L.tabel[0]).length, 3); assert.equal(M.baris(L.tabel[1]).length, 2);
  assert.equal(M.judulTabel(L.tabel[1]), "Luas terbakar, 7 hari terakhir"); assert.equal(M.judulTabel(L.tabel[0]), "Hotspot, data 15 NOV");
  const lb = M.lembar(L); assert.deepEqual(stabil(lb.map(l => l.nama)), ["Ringkasan", "Hotspot", "Luas terbakar", "Belum padam"]);
  assert.deepEqual(stabil(lb[1].aoa[3]), ["Riau", 1234, 12.5, "Siaga"]);
  assert.deepEqual(stabil(M.bentukPdf(L.tabel[1])), {head: [["Provinsi", "Luas (ha)"]], body: L.tabel[1].baris});
});
test("nama berkas: karhutla tetap laporan-karhutla-<tanggal>; bencana lain <bencana>-<tabel>-<tanggal>", () => {
  const d = dunia([]); vm.runInContext(baca("public/inti/unduh_tabel.js"), vm.createContext(d.ctx)); const M = d.win.UnduhTabel.model;
  assert.equal(M.namaBerkas({id: "karhutla", berkas: "laporan-karhutla"}, L, "xlsx"), "laporan-karhutla-2026-11-16.xlsx");
  assert.equal(M.namaBerkas({id: "gempa"}, {...L, namaTabel: "provinsi"}, "pdf"), "gempa-provinsi-2026-11-16.pdf");
  assert.equal(M.namaBerkas({id: "gempa"}, L, "png"), "gempa-laporan-2026-11-16.png");
});

/* ---- banding dengan mesin lama ---- */
function muatLama(log) {
  const d = dunia(log);
  d.ctx.S = {}; d.ctx.UKUR = {}; d.ctx.renderDaftar = () => {}; d.ctx.muatJSON = async () => null; d.ctx.toast = () => {};
  const src = lamaSrc.replace('if (document.querySelector(".tr-sw")', "window.__lama = {xlsx, docx, pdf, png, bacaTabel, angka, baris, cap};\nif (document.querySelector(\".tr-sw\")");
  assert.notEqual(src, lamaSrc, "titik sisip tidak ketemu");
  vm.runInContext(src, vm.createContext(d.ctx)); return d;
}
function muatBaru(log) {
  const d = dunia(log); d.ctx.S = {}; d.ctx.UKUR = {}; d.ctx.renderDaftar = () => {}; d.ctx.muatJSON = async () => null; d.ctx.toast = () => {};
  const k = vm.createContext(d.ctx); vm.runInContext(baca("public/inti/unduh_tabel.js"), k); vm.runInContext(baca("public/unduh_tabel.js"), k); return d;
}
for (const f of ["xlsx", "docx", "pdf", "png"]) {
  test(`keluaran ${f}: perintah ke pustaka sama dengan mesin lama`, {skip: lewati}, async () => {
    const a = [], b = [], lama = muatLama(a), baru = muatBaru(b);
    await lama.win.__lama[f](stabil(L)); await baru.win.UnduhTabel.format[f](stabil(L));
    assert.ok(a.length > 0, "perekam kosong"); assert.deepEqual(stabil(b), stabil(a));
  });
}

/* ---- adaptor karhutla: DOM palsu kecil yang mewakili markup #rows ---- */
const el = (teksIsi, kelas = {}, anak = []) => ({textContent: teksIsi, children: anak, querySelector: s => kelas[s] || null});
const baris = (...sel) => el("", {}, [el("ikon"), ...sel.map((t, i) => i === 1 ? el(t, {".pill": el(t)}) : el(t, {".nm-pjg": el(t + "")}))]);
function rowsPalsu() {
  const kepala = baris("Provinsi", "Hotspot", "Naik"), b1 = baris("  Riau\n", "1.234", "12,5"), b2 = baris("Jambi", "98", "–"), tot = baris("Nasional", "1.332", "–");
  return {querySelector: s => s === ".tb.kepala" ? kepala : s === ".tr-hari b" ? {textContent: " 15  nov "} : s === ".tb-total" ? tot : null,
    querySelectorAll: () => [b1, b2], parentElement: {scrollTop: 0}};
}
test("adaptor karhutla: bacaTabel menghasilkan {nama, hari, ket, kolom, baris, total} sama dengan kode lama", {skip: lewati}, () => {
  const a = [], b = [], lama = muatLama(a), baru = muatBaru(b), box = rowsPalsu();
  lama.dok.querySelector = baru.dok.querySelector = s => s === "#rows" ? box : null;
  const tl = lama.win.__lama.bacaTabel("Hotspot", ""), tb = baru.win.UnduhTabelKarhutla.bacaTabel("Hotspot", "");
  assert.deepEqual(stabil(tb), stabil(tl));
  assert.deepEqual(stabil(tb), {nama: "Hotspot", hari: "15 NOV", ket: "", kolom: ["Provinsi", "Hotspot", "Naik"], baris: [["Riau", "1.234", "12,5"], ["Jambi", "98", "–"]], total: ["Nasional", "1.332", "–"]});
});
test("adaptor terpasang di mesin: id karhutla, label tombol, nama berkas lama; mesin lama tidak ada lagi di berkas adaptor", () => {
  const d = muatBaru([]); const T = d.win.UnduhTabel;
  assert.match(T.tombol(), /data-unduh[^>]*aria-label="Unduh laporan empat tabel"/);
  const ad = baca("public/unduh_tabel.js");
  assert.doesNotMatch(ad, /XLSX|jspdf|docx|aoa_to_sheet|autoTable|toBlob|createElement\("canvas"\)/, "pembuat berkas hanya di inti (D15)");
});
test("gerbang statis mesin: tanpa pemisah titik tengah, tanpa warna literal, tanpa inline berbahaya, dan index memuat inti sebelum adaptor", () => {
  const js = baca("public/inti/unduh_tabel.js");
  assert.doesNotMatch(js, /["'`][^"'`\n]*[ ]·[ ][^"'`\n]*["'`]/);
  const h = baca("public/index.html"), i = h.indexOf('src="/inti/unduh_tabel.js"'), j = h.indexOf('src="unduh_tabel.js"');
  assert.ok(i > 0 && j > i, "urutan skrip"); assert.ok(h.indexOf('src="/inti/unduh.js"') < i);
});
test("registri: unduh_tabel hanya boleh menyala di bencana yang punya adaptor (karhutla: public/unduh_tabel.js; lainnya: public/<id>/unduh.js)", () => {
  const r = JSON.parse(baca("public/bencana.json")); const daftar = Array.isArray(r) ? r : (r.bencana || Object.values(r));
  for (const b of daftar) if (b && b.kemampuan && b.kemampuan.layar && b.kemampuan.layar.unduh_tabel === true)
    assert.ok(b.id === "karhutla" ? fs.existsSync(new URL("../../public/unduh_tabel.js", import.meta.url)) : fs.existsSync(new URL(`../../public/${b.id}/unduh.js`, import.meta.url)) && /UnduhTabel|unduhTabel|unduh_tabel/.test(baca(`public/${b.id}/unduh.js`)), b.id + " menyala tanpa adaptor");
});
