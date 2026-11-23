// Uji fungsi murni cermin InaRISK (data/kajian-bnpb/inarisk/ALGORITMA.md, RENCANA-UJI.md).
// Angka acuan = layar InaRISK v4 23 Nov 2026: nasional 147,95; 169 kab Tinggi; Langkat 231,47 peringkat 39 (2024: 160);
// Halmahera Selatan peringkat 1 (2024: 13).
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";

await import("../../public/bnpb/inarisk_hitung.js");   // skrip klasik: memasang globalThis.InariskHitung
const H = globalThis.InariskHitung;
const BERKAS = new URL("../../public/data/inarisk/irbi.json", import.meta.url);

test("kelas memakai ambang InaRISK per dasar dan per bahaya", () => {
  assert.equal(H.kelas(176, "total", 2025), "Sedang");
  assert.equal(H.kelas(176.01, "total", 2025), "Tinggi");
  assert.equal(H.kelas(14.66, "total", 2025), "Rendah");
  assert.equal(H.kelas(144, "total", 2024), "Sedang");
  assert.equal(H.kelas(144.01, "total", 2024), "Tinggi");
  assert.equal(H.kelas(15, "longsor"), "Sedang");
  assert.equal(H.kelas(15.1, "longsor"), "Tinggi");
  assert.equal(H.kelas(9.5, "gunungapi"), "Tinggi");
  assert.equal(H.kelas(5, "banjir"), "Rendah");
  assert.equal(H.kelas(null), null);
  assert.equal(H.kelas(0), null, "skor 0 = tanpa skor, bukan Rendah");
});

test("data mini: peringkat, seri, tren dua dasar, sebelumnya", () => {
  const d = {kolom: ["total", "banjir"], tahun: [2021, 2022, 2023, 2024, 2025],
    nilai: {"1101": {2024: [100, 12], 2025: [200, 36]}, "1102": {2024: [150, 8], 2025: [200, 24]}, "1201": {2025: [50, null]}},
    pembanding: {"1101": 180}};
  assert.deepEqual(H.urut(d, 2025).map(x => x.pcode), ["1101", "1102", "1201"], "seri dipecah kode naik");
  assert.equal(H.peringkat(d, 2025, "total", "12").get("1201"), 1);
  assert.equal(H.sebelumnya(d, "1101", 2025), 180);
  assert.equal(H.sebelumnya(d, "1101", 2025, "banjir"), 12);
  const t = H.tren(d, "1101", 2025);
  assert.deepEqual(t.map(g => g.baru), [false, true]);
  assert.equal(t[0].titik.length, 4);
  assert.equal(t[0].titik[0].skor, null, "tahun tanpa skor tetap null, bukan 0");
  assert.equal(H.skor(d, "1201", 2025, "banjir"), null);
});

test("jiwa terpapar dibatasi penduduk; penduduk kosong = bagian kosong", () => {
  const r = H.jiwaPersen({penduduk: 1000, terpapar: [500, 2000, null]}, [{nama: "A"}, {nama: "B"}, {nama: "C"}]);
  assert.deepEqual(r.map(x => x.persen), [50, 100, null], "terpapar kosong tetap kosong, bukan 0");
  assert.equal(H.persen1(0.0425), "<0,1%");
  assert.equal(H.persen1(99.9575), ">99,9%");
  assert.equal(H.persen1(0), "0%");
  assert.equal(H.persen1(100), "100%");
  assert.deepEqual(H.jiwaPersen({penduduk: 0, terpapar: [1]}, [{nama: "A"}]), []);
});

test("tingkat IKD dan format Indonesia", () => {
  assert.equal(H.tingkatIkd(0.29955), "Rendah");
  assert.equal(H.tingkatIkd(0.8), "Sedang");
  assert.equal(H.tingkatIkd(0.98), "Tinggi");
  assert.equal(H.tingkatIkd(null), null);
  assert.equal(H.angka2(231.473980778204), "231,47");
  assert.equal(H.angka0(1057605), "1.057.605");
  assert.equal(H.angka2(null), "–");
});

test("cermin nyata cocok dengan layar InaRISK", {skip: !existsSync(BERKAS) && "public/data/inarisk/irbi.json belum ditarik"}, () => {
  const d = JSON.parse(readFileSync(BERKAS, "utf8"));
  const daftar = H.urut(d, 2025);
  const r = H.ringkas(daftar, "total", 2025);
  assert.equal(r.n, 514);
  assert.equal(H.angka2(r.rerata), "147,95");
  assert.equal(r.nTinggi, 169);
  const statusTinggi = Object.values(d.status).filter(s => s === "Tinggi").length;
  assert.equal(statusTinggi, r.nTinggi, "kelas hitungan = kolom status API");
  const p25 = H.peringkat(d, 2025), p24 = H.peringkat(d, 2024);
  assert.equal(H.angka2(H.skor(d, "1205", 2025)), "231,47");
  assert.equal(p25.get("1205"), 39);
  assert.equal(p24.get("1205"), 160);
  assert.equal(p25.get("8204"), 1);
  assert.equal(p24.get("8204"), 13);
});

test("rumus IKD dari P1-P7 dan rencana kapasitas termurah", () => {
  const P = [0.435, 0.7000000009999999, 0.3466666666, 0.24, 0.2, 0.315, 0.2];   // Langkat 2025, indeks InaRISK 0,29955
  assert.ok(Math.abs(H.ikdDariP(P) - 0.29955) < 0.001);
  const r = H.rencanaKapasitas(P);
  assert.equal(r.cLama, 1); assert.equal(r.cBaru, 2); assert.equal(r.ambang, 0.4);
  assert.equal(r.langkah[0].p, 6, "P6 berbobot terbesar dinaikkan dulu");
  const Pbaru = [...P]; for (const l of r.langkah) Pbaru[l.p - 1] = l.ke;
  assert.ok(H.ikdDariP(Pbaru) >= 0.4, "rencana benar-benar melewati ambang");
  assert.equal(H.rencanaKapasitas([1, 1, 1, 1, 1, 1, 1]), null, "kelas 3 tidak perlu rencana");
  assert.equal(H.kelasC(0.8), 2); assert.equal(H.kelasC(0.81), 3);
  const hampir = H.rencanaKapasitas([0.39, 0.39, 0.39, 0.39, 0.39, 0.39, 0.39]);
  assert.equal(hampir.langkah.length, 1); assert.ok(hampir.langkah[0].ke < 0.45);
});

test("risiko besok: kelas IRBI Tinggi di atas, aturan padanan, hanya tenggang 1", () => {
  const irbi = {kolom: ["total", "banjir", "karlahut"], tahun: [2025], nilai: {"1101": {2025: [200, 36, 4]}, "1102": {2025: [100, 12, 30]}, "1103": {2025: [300, 1, 1]}}};
  const w = [{kab: "1102", tenggang: 1, aturan: "asap", maka: "Masker", dampak: {jiwa: 900}}, {kab: "1101", tenggang: 1, aturan: "banjir", maka: "Waspada banjir", dampak: {jiwa: 10}},
    {kab: "1103", tenggang: 2, aturan: "banjir", maka: "x", dampak: {jiwa: 1}}, {kab: "1101", tenggang: 1, aturan: "banjir", maka: "Waspada banjir", dampak: {jiwa: 20}}];
  const r = H.risikoBesok(w, irbi);
  assert.deepEqual(r.map(x => x.pcode), ["1101", "1102"]);
  assert.equal(r[0].kelas, "Tinggi"); assert.equal(r[0].skorBahaya, 36); assert.equal(r[0].jiwa, 20); assert.equal(r[0].aturan.length, 1);
  assert.equal(r[1].skorBahaya, 30, "asap dipadankan ke karhutla");
});
