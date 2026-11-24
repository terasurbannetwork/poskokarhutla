// KI-15: kesetaraan Python-JS ber-seed + kontrol negatif untuk tiga pasangan yang rumusnya hidup di dua bahasa.
//   1. Udara: titik potong PM2,5 (scripts/udara/alat.py, kualitas.py, public/udara/murni.js)
//   2. Karhutla: watak cluster (scripts/data/watak_kluster.py lawan public/riwayat_sel.js `analisa`)
//   3. Banjir: aturan status (scripts/banjir/status.py, BEKU: hanya dibaca, lawan public/banjir/sim.js)
// Bila pasangan nyata beda, uji ditandai `todo` berikut kasusnya (pemilik berkas yang membetulkan); uji TIDAK dilonggarkan.
import {test} from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {AKAR, lcg, setara, ringkas} from "../../scripts/umum/setara.mjs";

const baca = p => readFileSync(`${AKAR}/${p}`, "utf8");
const bulat = x => Math.floor(x + .5);
const pilih = (r, a) => a[Math.floor(r() * a.length)];
// Uji lulus bila tak ada selisih; bila ada, tandai todo supaya pipeline tidak merah palsu tetapi temuannya tetap terbaca.
const uji = (nama, res) => test(nama, res.beda.length ? {todo: `SELISIH NYATA: ${ringkas(res)}`} : {}, () => assert.equal(res.beda.length, 0, ringkas(res)));
const kontrol = (nama, res) => test(`kontrol negatif: ${nama}`, () => assert.ok(res.beda.length > 0, "salinan JS yang sengaja digeser TIDAK terdeteksi: pembanding buta"));

// ---------------------------------------------------------------- 1. udara
const Murni = (() => { const ctx = vm.createContext({window: {}}); vm.runInContext(baca("public/udara/murni.js"), ctx); return ctx.window.Murni; })();
{
  const r = lcg(20261125), kasus = [];
  for (const b of [0, 15.5, 55.4, 150.4, 250.4]) for (const d of [-0.1, -0.05, -1e-9, 0, 1e-9, 0.05, 0.1]) if (b + d >= 0) kasus.push(+(b + d).toFixed(9));   // alat.status menolak negatif (ValueError), jadi di luar domain bersama
  kasus.push(1000, 1e6);
  while (kasus.length < 500) kasus.push(+(r() ** 2 * 400).toFixed(r() < .5 ? 1 : 3));
  const py = `sys.path.insert(0, ${JSON.stringify(AKAR + "/scripts/udara")})\nimport alat, kualitas\ndef f(v):\n    return [alat.status(v), kualitas.kategori(v)]\n`;
  const res = setara({kasus, kode: py, js: v => [Murni.statusDari(v), Murni.katPM(v)]});
  uji("udara: alat.status = murni.statusDari dan kualitas.kategori = murni.katPM pada 500 nilai PM2,5 (termasuk batas)", res);
  test("udara: tiga tempat DISENGAJA beda skala (4 status vs 5 kategori), status = kategori - 1 (min 0)", () => {
    const bad = kasus.filter(v => Murni.ST.indexOf(Murni.statusDari(v)) !== Math.max(0, Murni.katPM(v) - 1));
    assert.deepEqual(bad, [], `batas status dan kategori tidak konsisten di ${bad.length} nilai`);
  });
  kontrol("udara (POTONG 55,4 -> 55,5)", setara({kasus, kode: py, js: v => [Murni.ST[[55.5, 150.4, 250.4].filter(b => v > b).length], Murni.katPM(v)]}));
}

// ---------------------------------------------------------------- 2. karhutla: watak cluster
const muatRiwayat = ganti => {
  const ctx = vm.createContext({window: {}});
  let kode = baca("public/riwayat_sel.js");
  if (ganti) { assert.ok(kode.includes(ganti[0]), `jangkar ${ganti[0]} hilang dari riwayat_sel.js`); kode = kode.replace(ganti[0], ganti[1]); }
  vm.runInContext(kode, ctx);
  return ctx.window.RiwayatSel;
};
const RS = muatRiwayat(), RS_geser = muatRiwayat(["TAHUN_AKTIF = 10", "TAHUN_AKTIF = 11"]);
{
  const r = lcg(1125), ri = (a, b) => a + Math.floor(r() * (b - a + 1)), kasus = [];
  const harian = () => { const doy = ri(150, 330), d = new Date(Date.UTC(2026, 0, doy)); return d.toISOString().slice(0, 10); };
  for (let i = 0; i < 400; i++) {
    const y = Array.from({length: 15}, () => pilih(r, [0, 0, 1, 9, 10, 11, ri(0, 40), ri(0, 400)]));
    const nr = ri(0, 12), rr = Array.from({length: nr}, () => ri(1, 60)).sort((a, b) => a - b);
    const rec = {y, yd: y.map(v => Math.floor(v * r())), m: Array.from({length: 12}, () => ri(0, 50)), r: rr, nm: ri(0, 80)};
    if (r() < .8) rec.s = [ri(150, 250), ri(251, 360)];
    const thm0 = r() < .5 ? 2003 : null;
    if (thm0) rec.ym = Array.from({length: 24}, () => pilih(r, [0, 2, 3, 4, ri(0, 30)]));
    const hari = pilih(r, [null, 0, 1, ri(1, 40), rr.length ? pilih(r, rr) : 5]);
    kasus.push({rec, th0: 2012, thm0, sd: harian(), n7: pilih(r, [0, ri(1, 60), ri(0, 3000)]), hari});
  }
  // rata-rata tahunan tepat x,5 (pembulatan setengah ke atas) dan batas tahun aktif
  kasus.push({rec: {y: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0], yd: new Array(15).fill(0), m: new Array(12).fill(1), r: [2, 4, 6], nm: 0, s: [200, 300]}, th0: 2012, thm0: null, sd: "2026-10-12", n7: 10, hari: 3});
  const doy = iso => Math.round((Date.parse(iso) - Date.UTC(+iso.slice(0, 4), 0, 1)) / 864e5) + 1;
  const py = `sys.path.insert(0, ${JSON.stringify(AKAR + "/scripts/data")})\nimport watak_kluster as W\ndef f(c):\n    w = W.watak(c['rec'], c['th0'], c['sd'], c['n7'], c['hari'], c['thm0'], True)\n    return {k: w[k] for k in ('a', 'n', 'rs', 'md', 'sisa', 'lg', 'akhir')}\n`;
  const js = RS_ => c => {
    const a = RS_.analisa(structuredClone(c.rec), {th0: c.th0, sd: c.sd, thm0: c.thm0}, {hari: c.hari, wt: {n7: c.n7}}, null);
    const tahun = +c.sd.slice(0, 4);
    return {a: a.aktif, n: a.penuh, rs: a.rs ?? null, md: a.lama ? bulat(a.lama.median) : null, sisa: a.lama?.sisa ?? null,
      lg: a.saran.some(s => /Lokasi langganan/.test(s)),
      akhir: a.sisaMusim === undefined ? null : new Date(Date.UTC(tahun, 0, 1) + (a.sisaMusim + doy(c.sd) - 1) * 864e5).toISOString().slice(0, 10)};
  };
  uji("karhutla: watak_kluster.watak = riwayat_sel.analisa (a, n, rs, md, sisa, lg, akhir) pada 401 kasus", setara({kasus, kode: py, js: js(RS)}));
  kontrol("karhutla (TAHUN_AKTIF 10 -> 11)", setara({kasus, kode: py, js: js(RS_geser)}));
}

// ---------------------------------------------------------------- 3. banjir: status.py (beku, hanya dibaca) lawan sim.js
const ambilAturan = ganti => {   // sim.js menyentuh DOM saat dimuat: ambil hanya blok aturan (GESER .. levelLongsor)
  const s = baca("public/banjir/sim.js"), a = s.indexOf("const GESER"), b = s.indexOf("const puncak3");
  assert.ok(a > 0 && b > a, "jangkar `const GESER` / `const puncak3` hilang dari public/banjir/sim.js");
  let blok = s.slice(a, b);
  if (ganti) { assert.ok(blok.includes(ganti[0]), `jangkar ${ganti[0]} hilang`); blok = blok.replace(ganti[0], ganti[1]); }
  return new Function(`${blok}\nreturn {levelBanjir, levelLongsor};`)();
};
const SIM = ambilAturan(), SIM_geser = ambilAturan(["AMBANG_B = [40, 80, 120]", "AMBANG_B = [40.1, 80, 120]"]);
{
  const r = lcg(777), kasus = [];
  const H3 = [0, 29.9, 30, 39.9, 40, 40.1, 59.9, 60, 79.9, 80, 89.9, 90, 119.9, 120, 200];
  const BH = [0, .32, .33, .34, .65, .66, .67, 1], RK = [null, 0, 1, 2, 3], IM = [null, 0, 19.9, 20, 29.9, 30, 40], CP = [null, 0, 2499, 2500, 3000];
  const P3 = [null, 0, .49, .5, 1], A7 = [0, 24.9, 25, 149, 150, 200], SM = [null, .44, .45, .46];
  for (const h of H3) for (const b of BH) kasus.push({h3: h, bh: b, rk: pilih(r, RK), im: pilih(r, IM), cape: pilih(r, CP), p3: pilih(r, P3), a7: pilih(r, A7), sm: pilih(r, SM)});
  for (const h of H3) for (const rk of RK) kasus.push({h3: h, bh: pilih(r, BH), rk, im: null, cape: null, p3: null, a7: 0, sm: null});
  for (const im of IM) for (const cp of CP) for (const p3 of P3) kasus.push({h3: pilih(r, H3), bh: pilih(r, BH), rk: pilih(r, RK), im, cape: cp, p3, a7: pilih(r, A7), sm: pilih(r, SM)});
  for (const a7 of A7) for (const sm of SM) for (const b of BH) kasus.push({h3: pilih(r, H3), bh: b, rk: null, im: pilih(r, IM), cape: null, p3: null, a7, sm});
  while (kasus.length < 1500) kasus.push({h3: +(r() * 160).toFixed(1), bh: +r().toFixed(2), rk: pilih(r, RK), im: pilih(r, IM), cape: pilih(r, CP), p3: pilih(r, P3), a7: +(r() * 220).toFixed(1), sm: pilih(r, SM)});
  const py = `sys.path.insert(0, ${JSON.stringify(AKAR + "/scripts/banjir")})\nimport status as S\ndef f(c):\n    return [S.level_banjir(c['h3'], c['bh'], c['rk'], c['im'], c['cape'], c['p3']), S.level_longsor(c['h3'], c['a7'], c['bh'], c['sm'], c['im'])]\n`;
  const js = M => c => [M.levelBanjir(c.h3, c.bh, c.rk, c.im, c.cape, c.p3), M.levelLongsor(c.h3, c.a7, c.bh, c.sm, c.im)];
  uji(`banjir: status.level_banjir/level_longsor = sim.js levelBanjir/levelLongsor pada ${kasus.length} kasus (batas ambang, bahaya, RK, I, C, P3, A7, sm)`, setara({kasus, kode: py, js: js(SIM)}));
  kontrol("banjir (AMBANG_B waspada 40 -> 40,1)", setara({kasus, kode: py, js: js(SIM_geser)}));
}
