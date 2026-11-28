/* Prakiraan lawan kejadian di Dalops (data/kajian-bnpb/prediksi-kejadian/, PK-1..PK-3): pasangkan(), ubin(), prediksi.json -> bentuk status lama,
   level lampau dari lalu.json. Fungsi murni di public/bnpb/dalops_hitung.js, level sel dari public/prediksi/besok_inti.js (satu aturan, D1).
   Jalan: node --test tests/bnpb/dalops_prakiraan.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
globalThis.window = globalThis;
await import("../../public/prediksi/besok_inti.js");
await import("../../public/bnpb/dalops_hitung.js");
const H = globalThis.DalopsHitung, LS = globalThis.Besok.levelSel;
const HARI_INI = "2026-11-26";
const kab = (id, lv) => [id, lv];
const K = (mulai, kabIds, o = {}) => ({id: "k" + mulai + kabIds, mulai, terakhir: mulai, surut: false, kab: kabIds, ...o});
const L = (kabId, tanggal, o = {}) => ({tiket: "LA-" + kabId + tanggal, kab: kabId, tanggal, tingkat: "warga", status: "baru", periksa: null, ...o});
const kotak = (r, id) => r.find(b => b.id === id)?.kotak;

test("pasangkan: empat kotak, jendela satu hari ke dua arah, tanpa kotak salah alarm", () => {
  const T = "2026-11-20";
  const r = H.pasangkan({T, hariIni: HARI_INI, level: {1: 2, 2: 3, 3: 0, 4: 1, 5: 2, 6: 2, 7: 0},
    kejadian: [K("2026-11-19", ["1"]), K("2026-11-21", ["3"]), K("2026-11-22", ["6"]), K("2026-11-18", ["7"])], laporan: [L("2", "2026-11-20")]});
  assert.equal(kotak(r, "1"), "kena", "diprakirakan Siaga dan kejadian mulai sehari sebelum T");
  assert.equal(kotak(r, "2"), "kena", "laporan warga juga bukti terjadi");
  assert.equal(kotak(r, "3"), "luput", "tidak diprakirakan, kejadian sehari sesudah T");
  assert.equal(kotak(r, "4"), "tenang", "level 1 Waspada tidak dihitung diprakirakan");
  assert.equal(kotak(r, "5"), "belum", "diprakirakan, tanpa laporan");
  assert.equal(kotak(r, "6"), "belum", "kejadian dua hari sesudah T di luar jendela");
  assert.equal(kotak(r, "7"), "tenang", "kejadian dua hari sebelum T di luar jendela");
  assert.deepEqual(new Set(r.map(b => b.kotak)), new Set(["kena", "luput", "tenang", "belum"]));
});

test("pasangkan: kejadian lama yang belum surut hanya tanda berlangsung, tidak mengubah kotak; surut sebelum T tidak ikut", () => {
  const T = "2026-11-20";
  const r = H.pasangkan({T, hariIni: HARI_INI, level: {1: 2, 2: 0, 3: 2},
    kejadian: [K("2026-11-10", ["1"], {terakhir: "2026-11-19"}), K("2026-11-10", ["2"], {surut: true, terakhir: "2026-11-12"}), K("2026-11-10", ["3"], {surut: true, terakhir: "2026-11-21"})]});
  assert.equal(kotak(r, "1"), "belum"); assert.equal(r.find(b => b.id === "1").berlangsung.length, 1);
  assert.equal(r.find(b => b.id === "2").berlangsung.length, 0, "sudah surut sebelum T");
  assert.equal(r.find(b => b.id === "3").berlangsung.length, 1, "masih berlangsung pada T");
});

test("pasangkan: laporan tidak_valid dibuang; belum diperiksa tetap dihitung; kab tanpa prakiraan tidak masuk kotak mana pun", () => {
  const T = "2026-11-20";
  const r = H.pasangkan({T, hariIni: HARI_INI, level: {1: 2, 2: 2, 3: null, 4: 0}, laporan: [L("1", T, {periksa: "tidak_valid"}), L("2", T, {periksa: null}), L("3", T), L("4", T, {status: "tidak_valid"})]});
  assert.equal(kotak(r, "1"), "belum", "tidak_valid bukan bukti"); assert.equal(kotak(r, "2"), "kena");
  assert.equal(r.find(b => b.id === "3"), undefined, "tanpa prakiraan (null) tidak jadi nol"); assert.equal(kotak(r, "4"), "tenang");
});

test("pasangkan: matang sesudah 3 hari; sebelum itu Belum ada laporan = menunggu laporan", () => {
  const level = {1: 3};
  assert.equal(H.pasangkan({T: "2026-11-24", hariIni: HARI_INI, level})[0].menunggu, true, "2 hari lalu belum matang");
  assert.equal(H.pasangkan({T: "2026-11-23", hariIni: HARI_INI, level})[0].menunggu, false, "tepat 3 hari = matang");
  assert.equal(H.pasangkan({T: "2026-11-24", hariIni: HARI_INI, level: {1: 3}, laporan: [L("1", "2026-11-24")]})[0].menunggu, false, "Kena tidak menunggu");
});

test("ubin: jumlah kab per kotak, tanpa persen atau skor", () => {
  const u = H.ubin(H.pasangkan({T: "2026-11-24", hariIni: HARI_INI, level: {1: 2, 2: 3, 3: 0, 4: 0}, kejadian: [K("2026-11-24", ["1", "3"])]}));
  assert.deepEqual(u, {kena: 1, luput: 1, belum: 1, tenang: 1, menunggu: true});
});

test("tglWIB: epoch ms ke tanggal WIB (17.00 UTC sudah hari berikutnya)", () => {
  assert.equal(H.tglWIB(Date.parse("2026-11-20T16:59:00Z")), "2026-11-20");
  assert.equal(H.tglWIB(Date.parse("2026-11-20T17:00:00Z")), "2026-11-21");
});

/* ---- golden: banjir dan longsor dari prediksi.json sama dengan dari status lama (PB-03: banjir tidak boleh mundur) ---- */
const pred = {kode: {BNJ: {kol: ["lv", "ps"], hari: ["2026-11-27", "2026-11-28", "2026-11-29"]}, LSR: {kol: ["lv", "ps"]}, HJN: {kol: ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "m"]},
    GEL: {kol: ["hs", "lv"]}, ROB: {kol: ["lewat", "sel"]}, ASP: {kol: ["pm", "kat"]}, API: {kol: ["p", "d"]}, CEX: {kol: ["emb", "lv"]}},
  kab: [{id: "1101", geo: "11|Aceh Selatan", BNJ: [[3, 0.3], [2, 0.2], [0, 0.1]], LSR: [[1, 0], [2, 0], [2, 0]], HJN: [[0.9, 0, 0, 20, 1, 1, 1, 1], [0.9, 0, 0, 55, 1, 1, 1, 1], [0.9, 0, 0, 10, 1, 1, 1, 1]], ASP: [[2, 1], null, [0, 0]], API: [[0.9, 1], [0.1, 0], null], CEX: [[10, 2], [10, 0], [10, 0]]},
    {id: "1102", geo: "11|Aceh Tenggara", BNJ: [[0, 0], null, [1, 0]], LSR: [[0, 0], [0, 0], [0, 0]]}]};
const lama = {hari: ["2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"], kec: {"11|Aceh Selatan|A": {b: [0, 3, 1, 0], l: [0, 1, 2, 2]}, "11|Aceh Selatan|B": {b: [0, 1, 2, 0], l: [0, 0, 0, 1]}, "11|Aceh Tenggara|C": {b: [0, 0, 0, 1], l: [0, 0, 0, 0]}}};
test("golden: level banjir dan longsor per kab dari prediksi.json = maks kecamatan status lama untuk hari yang sama", () => {
  const baru = H.statusKab(H.statusDariPrediksi(pred, LS), "b"), baruL = H.statusKab(H.statusDariPrediksi(pred, LS), "l"), tua = H.statusKab(lama, "b"), tuaL = H.statusKab(lama, "l");
  assert.deepEqual(baru["11|Aceh Selatan"].b, tua["11|Aceh Selatan"].b.slice(1), "banjir Aceh Selatan H+1..H+3");
  assert.deepEqual(baruL["11|Aceh Selatan"].b, tuaL["11|Aceh Selatan"].b.slice(1), "longsor");
  assert.deepEqual(baru["11|Aceh Tenggara"].b, [0, null, 1], "hari tanpa data = null, bukan 0");
  assert.deepEqual(H.statusDariPrediksi(pred, LS).hari, ["2026-11-27", "2026-11-28", "2026-11-29"]);
});

test("prediksi.json lewat bentuk lama: siaga, hujan 24 jam, jenis lain (cuaca, udara, karhutla, gelombang) dan kab tanpa data", () => {
  const st = H.statusDariPrediksi(pred, LS), sk = H.statusKab(st, "b");
  assert.deepEqual(sk["11|Aceh Selatan"].h3d, [20, 55, 10]); assert.equal(sk["11|Aceh Selatan"].h3, 85);
  assert.equal(sk["11|Aceh Tenggara"].h3, null, "hujan tak lengkap: tanpa jumlah");
  assert.deepEqual(H.siaga(sk, new Set(), 2).map(x => [x.nama, x.maks]), [["Aceh Selatan", 3]], "Aceh Tenggara maksimum 1 tidak Siaga");
  assert.deepEqual(H.statusKab(st, "u")["11|Aceh Selatan"].b, [1, null, 0], "udara dari ASP kat (indeks 1 baris)");
  assert.deepEqual(H.statusKab(st, "k")["11|Aceh Selatan"].b, [3, 0, null], "karhutla dari API p (>= 0,8 = Awas)");
  assert.deepEqual(H.statusKab(st, "g")["11|Aceh Selatan"].b, [null, null, null], "gelombang tanpa data pesisir = kosong, bukan Normal");
  assert.deepEqual(H.siaga(H.statusKab(st, "g"), new Set(), 1), []);
  assert.equal(H.siaga(sk, new Set(), 2).every(x => Number.isFinite(x.maks)), true, "tanpa NaN dari hari kosong");
});

test("mitigasi dari status per kab tanpa kecamatan: langkah tanpa nama tempat, tanpa kata undefined", () => {
  const m = H.mitigasi(H.statusDariPrediksi(pred, LS), null, [], "2026-11-26"), awas = m.grup.find(g => g.kunci === "awas");
  assert.match(awas.baris[0].langkah, /^Siapkan posko dan evakuasi di wilayah rawan; pantau lereng di wilayah rawan$/);
  assert.doesNotMatch(JSON.stringify(m), /undefined|null/);
});

test("level lampau dari lalu.json: satu aturan level dengan /prediksi; gelombang = maks(GEL, ROB); kab tanpa nilai tidak ikut", () => {
  const lalu = {hari: {"2026-11-25": {BNJ: {kol: ["lv", "ps"], kab: {1101: [3, 0.2], 1102: [0, 0]}}, GEL: {kol: ["hs", "lv"], kab: {1101: [2.5, 2]}}, ROB: {kol: ["lewat", "sel"], kab: {1101: [1, 0.3], 1102: [null, null]}}}}};
  assert.deepEqual(H.levelTanggal("banjir", lalu, "2026-11-25", LS), {1101: 3, 1102: 0});
  assert.deepEqual(H.levelTanggal("gelombang", lalu, "2026-11-25", LS), {1101: 2});
  assert.deepEqual(H.levelTanggal("udara", lalu, "2026-11-25", LS), {}, "kode tak ada di lalu = tidak ada prakiraan");
  assert.deepEqual(H.levelTanggal("banjir", lalu, "2026-11-01", LS), {}, "tanggal tak tersimpan");
});

test("berkas nyata: prediksi.json dan lalu.json masuk bentuk Dalops tanpa NaN, kunci kab cocok dengan geo", { skip: !existsSync("public/prediksi/data/lalu.json") }, () => {
  const p = JSON.parse(readFileSync("public/prediksi/data/prediksi.json", "utf8")), l = JSON.parse(readFileSync("public/prediksi/data/lalu.json", "utf8"));
  const sk = H.statusKab(H.statusDariPrediksi(p, LS), "b");
  assert.ok(Object.keys(sk).length >= 500);
  for (const x of Object.values(sk)) { assert.equal(x.b.length, 3); assert.ok(x.b.every(v => v == null || (v >= 0 && v <= 3))); }
  const ids = new Set(p.kab.map(k => k.id)), T = Object.keys(l.hari).sort().at(-1), lv = H.levelTanggal("banjir", l, T, LS);
  assert.ok(Object.keys(lv).length > 400 && Object.keys(lv).every(id => ids.has(id)), "id kab lalu.json = id prediksi.json");
});

test("layar: modul dimuat html, tanpa warna literal, tanpa kata aman atau salah alarm, tanpa kalimat temuan, status.json tidak dibaca lagi (K4)", () => {
  const html = readFileSync("public/bnpb/dalops.html", "utf8"), js = readFileSync("public/bnpb/dalops_prakiraan.js", "utf8").replace(/\/\*[\s\S]*?\*\//g, ""), css = readFileSync("public/bnpb/dalops_prakiraan.css", "utf8");
  const urut = ["/prediksi/besok_inti.js?v=1", "/bnpb/dalops_hitung.js", "/bnpb/dalops_prakiraan.js", "/bnpb/dalops_karhutla.js", "/bnpb/dalops.js"].map(f => html.indexOf(f));
  assert.ok(urut.every((v, i) => v > 0 && (!i || v > urut[i - 1])), "urutan skrip: level sel, hitung, modul, karhutla, dalops");
  assert.match(html, /dalops_prakiraan\.css/);
  assert.doesNotMatch(js + css, /#[0-9a-f]{3,8}\b|\baman\b|salah alarm|·|text-transform|\bhl\(|Sumber: /i);
  assert.doesNotMatch(readFileSync("public/bnpb/dalops.js", "utf8").replace(/\/\*[\s\S]*?\*\//g, ""), /banjir\/data\/status\.json/, "Dalops tidak membaca status.json lagi");
  assert.match(js, /U\.bagian\("pk-" \+ jenis, "peringatan", "Prakiraan dan kejadian"/, "kepala kartu = nama seksi berikon");
});

test("pesanSiaga: hari tanpa prakiraan tertulis tidak ada prakiraan, bukan Normal", () => {
  const t = H.pesanSiaga({nama: "X", b: [2, null, 0], h3d: []}, ["2026-11-27", "2026-11-28", "2026-11-29"]);
  assert.match(t, /28 November 2026: tidak ada prakiraan/); assert.match(t, /29 November 2026: Normal/);
});
