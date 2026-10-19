import test from "node:test";
import assert from "node:assert/strict";
await import("../../public/udara/murni.js");   /* skrip klasik: memasang globalThis.Murni */
const M = globalThis.Murni;

test("statusDari: titik potong P.14/2020 inklusif di batas atas", () => {
  assert.equal(M.statusDari(55.4), "normal"); assert.equal(M.statusDari(55.5), "waspada");
  assert.equal(M.statusDari(150.4), "waspada"); assert.equal(M.statusDari(150.5), "siaga");
  assert.equal(M.statusDari(250.4), "siaga"); assert.equal(M.statusDari(250.5), "awas");
});
test("rata24: jendela terpotong di awal dan abaikan null", () => {
  assert.equal(M.rata24([10, 20, 30], 2), 20);
  const pm = Array.from({length: 48}, (_, i) => i < 24 ? 0 : 100);
  assert.equal(M.rata24(pm, 47), 100); assert.equal(M.rata24(pm, 23), 0);
  assert.equal(M.rata24([null, 40], 1), 40);
});
test("terburuk: kota dengan r24 tertinggi di hari itu", () => {
  const k = [{nama: "A", r24: [10, 90]}, {nama: "B", r24: [50, 20]}, {nama: "C"}];
  assert.equal(M.terburuk(k, 0).nama, "B"); assert.equal(M.terburuk(k, 1).nama, "A"); assert.equal(M.terburuk([{nama: "C"}], 0), null);
});
test("banding: naik/turun/sama dengan toleransi, null bila tak ada pembanding", () => {
  assert.deepEqual(M.banding(120, 100), {arah: "naik", persen: 20});
  assert.deepEqual(M.banding(80, 100), {arah: "turun", persen: 20});
  assert.equal(M.banding(102, 100).arah, "sama");
  assert.equal(M.banding(50, 0), null); assert.equal(M.banding(50, null), null);
});
test("indeksJam: jam terakhir yang belum lewat", () => {
  const j = ["2026-10-18T00:00Z", "2026-10-18T01:00Z", "2026-10-18T02:00Z"];
  assert.equal(M.indeksJam(j, Date.parse("2026-10-18T01:30Z")), 1); assert.equal(M.indeksJam(j, Date.parse("2026-10-17T00:00Z")), 0);
});
test("hitungStatus dan statusHari: pakai st bila ada, jatuh ke r24", () => {
  const k = [{st: ["awas"]}, {r24: [100]}, {r24: [10]}];
  assert.deepEqual(M.hitungStatus(k, 0), {normal: 1, waspada: 1, siaga: 0, awas: 1});
});
test("normBagian: jumlah lebar 100, urut turun, buang nol", () => {
  const b = M.normBagian([{persen: 20}, {persen: 0}, {persen: 60}, {persen: 40}]);
  assert.equal(b.length, 3); assert.equal(b[0].persen, 60); assert.ok(Math.abs(b.reduce((a, x) => a + x.lebar, 0) - 100) < 1e-9);
});
test("garisLintasan: hanya lapis terpilih, koordinat tanpa jam", () => {
  const l = {kompleks: [{id: "K1", jalur: [{lapis: "850hPa", t: [[100, -2, 0], [101, -2.5, 3]]}, {lapis: "10m", t: [[1, 1, 0], [2, 2, 3]]}]}]};
  const g = M.garisLintasan(l, "850hPa"); assert.equal(g.features.length, 1); assert.deepEqual(g.features[0].geometry.coordinates, [[100, -2], [101, -2.5]]);
  assert.deepEqual(M.lapisAda(l).sort(), ["10m", "850hPa"]); assert.equal(M.garisLintasan(null, "10m").features.length, 0);
});
test("format Indonesia: persen dan desimal bertanda koma, null jadi tanda hubung", () => {
  assert.equal(M.persen(0.71), "71%"); assert.equal(M.persen(null), "–"); assert.equal(M.desimal(null), "–");
  assert.ok(!/—/.test(M.ST.join(""))); assert.match(M.desimal(1.5, 1), /^1[,.]5$/);
});

test("satukan: prakiraan 514 kab -> ringkasan jiwa per kategori, prov, kab (satu jalur data)", () => {
  const jam = Array.from({length: 48}, (_, i) => new Date(Date.UTC(2026, 9, 19, 7 + i)).toISOString().slice(0, 16) + "Z");
  const pm = (a, b) => jam.map((_, i) => i < 10 ? a : b);   /* 07 UTC = 14 WIB: hari WIB 19 Okt = jam ke-0..9 */
  const prak = {hari: ["2026-10-19", "2026-10-20"], jam, dibuat: "x", kota: [
    {kode: "a", nama: "Kab. A", prov: "1", jiwa: 100, r24: [200, 10], pm: pm(300, 10)},
    {kode: "b", nama: "Kab. B", prov: "1", jiwa: 300, r24: [10, 60], pm: pm(10, 70)},
    {kode: "c", nama: "Kab. C", prov: "2", jiwa: 0, r24: [999, 999], pm: pm(999, 999)}]};   /* tanpa jiwa: dilewati */
  const {uk, mk} = M.satukan(prak);
  assert.deepEqual(uk.nasional[0].jiwa, [300, 0, 0, 100, 0]); assert.equal(Math.round(uk.nasional[0].rata), 58);
  assert.deepEqual(uk.nasional[1].jiwa, [100, 0, 300, 0, 0]);
  assert.deepEqual(uk.prov["1"][0].slice(0, 5), [300, 0, 0, 100, 0]); assert.equal(uk.prov["1"][0][6], 300); assert.equal(uk.prov["2"], undefined);
  assert.equal(uk.kab[0][0][1], "Kab. A"); assert.deepEqual(uk.kab[0][0], ["1", "Kab. A", 200, 300, 100, 100]); assert.equal(uk.kab[1][0][5], 300);
  assert.equal(mk.a[1], 10);
});

test("satukan: puncak per jam tak di bawah r24 (hari ini hanya jam tersisa) dan null tanpa jam", () => {
  const jam = Array.from({length: 4}, (_, i) => new Date(Date.UTC(2026, 9, 19, 7 + i)).toISOString().slice(0, 16) + "Z");   /* semua hari WIB 19 Okt */
  const prak = {hari: ["2026-10-19", "2026-10-20"], jam, dibuat: "x", kota: [{kode: "a", nama: "A", prov: "1", jiwa: 10, r24: [35, 20], pm: [17, 17, 17, 17]}]};
  const {uk, mk} = M.satukan(prak);
  assert.equal(mk.a[0], 35); assert.equal(mk.a[1], null); assert.equal(uk.prov["1"][0][6], 35); assert.equal(uk.kab[1][0][3], null);
});
