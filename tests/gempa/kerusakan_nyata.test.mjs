import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const muat = (...berkas) => { const c = {console, Math, JSON}; vm.createContext(c); for (const b of berkas) vm.runInContext(fs.readFileSync(b, "utf8"), c); return c; };
const baca = b => JSON.parse(fs.readFileSync(b, "utf8"));
const C = muat("public/gempa/tsunami.js", "public/gempa/guncangan.js", "public/gempa/kerusakan.js"), K = C.GempaKerusakan, GG = C.GempaGuncangan;
const KAL = baca("public/gempa/data/kalibrasi_kerusakan.json");

test("sigma: BSSA14 tau 0,348 phi 0,495 (M 6); Zhao06 total 0,678 antarmuka dan 0,684 slab; okupansi malam > siang", () => {
  const b = K.sigma("kerak", 6);
  assert.ok(Math.abs(b.tau - 0.348) < 1e-9 && Math.abs(b.phi - 0.495) < 1e-9, JSON.stringify(b));
  for (const [j, tot] of [["antarmuka", 0.678], ["intraslab", 0.684]]) { const s = K.sigma(j, 8); assert.ok(Math.abs(Math.hypot(s.tau, s.phi) - tot) < 1e-9, j); }
  assert.ok(K.okupansi(2) > K.okupansi(14) && K.okupansi(null) > K.okupansi(14));
  assert.ok(Math.abs(K.jamLokal("2018-08-05T12:46:00Z", 116.4) - 20.77) < 0.01, "19.46 WITA = 20.77 jam bila salah offset"); // 12.77 UTC + 8
});

test("taksir: rentang rendah < tengah < tinggi, tidak lebih sempit dari ketidakpastian stok, nol tanpa guncangan", () => {
  K.atur({kalib: 2, faktor_loo: 2});
  const h = K.taksir([{p: 50000, pg: 300}, {p: 20000, pg: 60}], "kerak", 6.5, 3);
  for (const n of ["rb", "rs", "rr", "jiwa"]) assert.ok(h[n][0] < h[n][1] && h[n][1] < h[n][2], `${n}: ${h[n]}`);
  assert.ok(Math.log(h.jiwa[2] / h.jiwa[1]) >= h.sigmaStok - 1e-9, "pita lebih sempit dari ketidakpastian stok");
  assert.ok(h.rb[1] < h.rumah);
  assert.deepEqual(Array.from(K.taksir([{p: 1000, pg: 0}], "kerak", 6, 3).jiwa), [0, 0, 0]);
});

test("kejadian nyata: model terkalibrasi memutar kejadian kerak dan meleset dalam faktor LOO tersimpan; tanpa kalibrasi jauh lebih buruk", () => {
  const model = baca("public/gempa/data/model_guncangan.json"), meta = baca("public/gempa/data/vs30.json");
  const ctx = {M: GG.pasang(model), Tsunami: C.Tsunami, model, vs30: GG.vs30Grid(meta, new Uint8Array(fs.readFileSync("public/gempa/data/vs30.bin")), 400),
    pusat: baca("public/banjir/data/pusat_kec.json"), pend: baca("public/data/penduduk.json").kec};
  assert.ok(KAL.kejadian.length >= 6, "kalibrasi butuh sedikitnya 6 kejadian");
  const siap = KAL.kejadian.map(ev => ({ev, q: K.siap(ctx, ev)}));
  const jiwa = (q, kal) => { K.atur({kalib: kal, faktor_loo: KAL.faktor_loo}); return K.taksir(q.s, q.jg, q.m, q.jam, true).jiwa[1]; };
  const rms = kal => Math.sqrt(siap.reduce((a, {ev, q}) => a + Math.log(jiwa(q, kal) / ev.jiwa) ** 2, 0) / siap.length);
  const rmsKal = rms(KAL.kalib), rmsLama = rms(1);
  assert.ok(rmsKal <= Math.log(KAL.faktor_loo), `galat dalam-sampel ${Math.exp(rmsKal).toFixed(2)}x harus <= faktor LOO ${KAL.faktor_loo}`);
  assert.ok(rmsLama > rmsKal + 0.5, `tanpa kalibrasi (${Math.exp(rmsLama).toFixed(2)}x) harus jauh lebih buruk dari terkalibrasi (${Math.exp(rmsKal).toFixed(2)}x)`);
  for (const {ev, q} of siap) {
    const m = jiwa(q, KAL.kalib), r = m / ev.jiwa;
    assert.ok(r <= KAL.faktor_loo ** 2 && r >= KAL.faktor_loo ** -2, `${ev.id}: pengamatan ${ev.jiwa}, model ${Math.round(m)} (${r.toFixed(2)}x), di luar faktor LOO kuadrat ${(KAL.faktor_loo ** 2).toFixed(1)}`);
    assert.ok(Math.abs(m - ev.model) / ev.model < 0.02, `${ev.id}: berkas kalibrasi basi (${Math.round(m)} lawan ${ev.model}); jalankan scripts/gempa/kalibrasi_kerusakan.mjs`);
  }
  const rmsLoo = Math.sqrt(KAL.kejadian.reduce((a, ev) => a + Math.log(ev.model_loo / ev.jiwa) ** 2, 0) / KAL.kejadian.length);
  assert.ok(Math.abs(Math.exp(rmsLoo) - KAL.faktor_loo) / KAL.faktor_loo < 0.01, "faktor_loo tidak cocok dengan galat leave-one-out per kejadian");
});
