/* Uji koreksi tinjauan validasi-model atas simulasi genangan (20 Okt 2026): SCS-CN per hari + ambang AMC baku, perlakuan lewat mesin nyata pada sel 240 m,
   radius tanggul fisik tetap, pita ensemble memakai m3[e0] plus kepekaan AMC. Berkas dimuat seperti di peramban (vm); mesin sungguhan, kisi kecil. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

function muat() {
  const ctx = vm.createContext({console, $: () => null, nanti: f => setTimeout(f, 0), toast() {}, esc: x => x, tglPendek: x => x, km: () => 99,
    fmt: n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1}), F2: n => Number(n).toFixed(2), WIB: {timeZone: "Asia/Jakarta"},
    S: {hujan: {hari: ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"], hari_ini: "2026-10-13", grid: [{lat: -6.875, lon: 106.875, h: [0, 120, 40, 10, 0], jam: [6, 6, 6, 6, 6], imax: [0, 30, 10, 3, 0], sm: [.3, .3, .3, .3, .3], a7: 10}]},
      sungai: {hari: [], titik: []}, rob: null, geo: {kec: {}}}, Simulasi: {kec: {}, dasar: {}, kode: "32"}});
  ctx.window = ctx;
  for (const f of ["sim_genangan.js", "sim_lahan.js", "sim_tanggap.js", "sim_longsor.js", "sim_tampak.js"]) vm.runInContext(fs.readFileSync(new URL(`../../public/banjir/${f}`, import.meta.url), "utf8"), ctx);
  return ctx;
}
const jumlah = a => Array.from(a).reduce((x, y) => x + y, 0);

test("SCS-CN per hari: ambang AMC SCS baku, tidak melebih-lebihkan kumulatif 72 jam, geser kelas searah", () => {
  const SG = muat().SimGenangan, kel = SG.kelasAMC5;
  assert.equal(kel(35.5), 1); assert.equal(kel(35.6), 2); assert.equal(kel(53.3), 2); assert.equal(kel(53.4), 3, "batas SCS baku 35,6 dan 53,3 mm per 5 hari");
  const hu = new Float64Array(72); hu[15] = 150; hu[39] = 80; hu[63] = 60;
  const kum = jumlah(SG.limpasan(hu, 73, 2).efektif), h = SG.limpasanHarian(hu, 73, 0), tot = jumlah(h.efektif);
  assert.ok(kum > 195 && kum < 205, `kumulatif CN 73 harus ~201 mm: ${kum}`); assert.ok(tot < kum * .7, `per hari (${tot} mm) harus jauh di bawah kumulatif (${kum} mm)`);
  assert.deepEqual(Array.from(h.amc), [1, 3, 3], "hari 1 kering (tanpa anteseden), hari 2-3 basah sesudah 150 mm");
  const manual = [[150, 1], [80, 3], [60, 3]].reduce((s, [p, a]) => s + SG.limpasan(Float64Array.of(p), 73, a).efektif[0], 0); assert.ok(Math.abs(tot - manual) < 1e-9, "jumlah harian = jumlah SCS tiap hari dengan AMC-nya");
  assert.ok(Math.abs(h.resap[72] - (290 - tot)) < 1e-9, "resapan kumulatif = hujan - limpasan");
  const kering = jumlah(SG.limpasanHarian(hu, 73, 0, {geser: -1}).efektif), basah = jumlah(SG.limpasanHarian(hu, 73, 0, {geser: 1}).efektif);
  assert.ok(kering <= tot && tot <= basah && kering < basah, `kepekaan AMC searah: ${kering} <= ${tot} <= ${basah}`);
  const sel = SG.limpasanHarian(hu, Float32Array.from([73, 73, 90]), 0, {darat: Uint8Array.of(1, 1, 1)}); assert.equal(sel.seri.length, 2); assert.ok(Math.abs(sel.efektif[15] - (SG.limpasan(Float64Array.of(150), 73, 1).efektif[0] * 2 + SG.limpasan(Float64Array.of(150), 90, 1).efektif[0]) / 3) < 1e-6);
});

function bowl(c, dx) {
  const SG = c.SimGenangan, T = c.SimTampak.T, nx = 24, ny = 24, N = nx * ny, z = new Float64Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = 2 + .5 * Math.hypot(i - 12, j - 12); /* mangkuk curam: air terkumpul di tengah */
  T.titik = {lat: -6.9, lon: 106.9, nama: "t", kab: "k"}; T.dem = {nx, ny, dx, z, lat: -6.9, lon: 106.9, sisi: nx * dx}; T.prep = {laut: new Uint8Array(N), acc: new Float64Array(N), nLaut: 0, z};
  T.sk = "ekstrem"; T.op.ekstrem = 300; return {SG, T, nx, ny, N, pop: {lo: new Float64Array(N).fill(1), hi: new Float64Array(N).fill(3)}};
}

test("perlakuan lewat mesin nyata, sel 240 m: pompa mengurangi air dan jiwa terpapar, tanggul mengubah hasil; panjang busur tanggul tetap 500 m di semua resolusi", () => {
  const c = muat(), {SG, T, nx, ny, pop} = bowl(c, 240), U = c.SimTampak._uji, ST = c.SimTanggap, X = U.susun();
  const lari = spec => SG.jalankan(U.cfgDari(X, false, spec)), R0 = lari(null), dasar = ST.jiwaTerpapar(R0.hmaks, pop, .5);
  assert.ok(R0.neraca.galat < .01, `galat neraca ${R0.neraca.galat}`); assert.ok(dasar[1] > 0, `mangkuk 300 mm harus menggenang >= 50 cm: ${dasar}`);
  const ks = ST.kandidatPerlakuan({nx, ny, dx: 240, hmaks: R0.hmaks, pop, laut: T.prep.laut, z: T.prep.z, sungaiK: -1, adaLaut: false});
  assert.ok(ks.kasar && /kasar/.test(ks.catatan), "sel 240 m harus ditandai terlalu kasar untuk tanggul");
  const by = Object.fromEntries(ks.kandidat.map(k => [k.id, k])), pompa = lari(by.pompa15), tg = lari(by.tanggul2), paket = lari(by.paket);
  assert.ok(pompa.neraca.pompa > 0, "pompa harus membuang air"); assert.ok(ST.jiwaTerpapar(pompa.hmaks, pop, .5)[1] <= dasar[1] + 1e-9, "pompa tak boleh menambah jiwa terpapar");
  assert.ok(Math.max(...pompa.luas) <= Math.max(...R0.luas) + 1e-6, "pompa tak boleh memperluas genangan puncak");
  assert.ok(Array.from(tg.hmaks).some((v, k) => Math.abs(v - R0.hmaks[k]) > 1e-3), "tanggul harus mengubah kedalaman di suatu sel (efek ada)");
  assert.ok(Array.from(paket.hmaks).some((v, k) => Math.abs(v - R0.hmaks[k]) > 1e-3));
  const k60 = ST.kandidatPerlakuan({nx, ny, dx: 60, hmaks: R0.hmaks, pop, laut: T.prep.laut, z: T.prep.z, sungaiK: -1, adaLaut: false});
  assert.ok(Math.abs(k60.panjang - ks.panjang) < 1, `panjang busur harus sama (radius fisik 500 m): ${k60.panjang} vs ${ks.panjang}`); assert.ok(!k60.kasar && k60.catatan === "");
  assert.ok(Math.abs(ks.panjang - 500 * 140 * Math.PI / 180) < 1);
});

test("pita(): memakai m3 yang mulai di hari ini (e0, bukan m3[0]); P10 <= P50 <= P90; kepekaan AMC searah; jarak titik ansambel tercatat", async () => {
  const c = muat(), {SG, T} = bowl(c, 60), U = c.SimTampak._uji;
  T.sk = "dasar"; c.Simulasi.ens = {hari: ["2026-10-12", "2026-10-13", "2026-10-14"], grid: [{lat: -6.875, lon: 106.875, m3: [Array(51).fill(900), Array.from({length: 51}, (_, i) => 45 + i * 3), Array(51).fill(1)]}]};
  const X = U.susun(); assert.equal(X.M.ens.e0, 1, "hari_ini adalah hari ke-1 ansambel ini");
  T.hasil = {dasar: SG.jalankan(U.cfgDari(X, false)), X}; T.nJalan = 1; T.demKunci = "k";
  await U.pita(); const p = T.pita; assert.ok(p, "pita harus terisi");
  assert.deepEqual(Array.from(p.mm), [60, 120, 180], "persentil dari m3[e0] = 20..220: P10 60, P50 120, P90 180; m3[0] = 900 tidak boleh terpakai");
  assert.ok(p.ha[0] <= p.ha[1] + 1e-9 && p.ha[1] <= p.ha[2] + 1e-9, `luas harus naik dengan hujan: ${p.ha}`); assert.ok(p.ha[2] > p.ha[0], "pita tak boleh nol lebar pada hujan 60 vs 180 mm");
  assert.ok(p.amc[0] <= p.ha[1] + 1e-9 && p.ha[1] <= p.amc[1] + 1e-9, `AMC kering <= normal <= basah: ${p.amc[0]} ${p.ha[1]} ${p.amc[1]}`); assert.equal(p.jarak, 99);
});
