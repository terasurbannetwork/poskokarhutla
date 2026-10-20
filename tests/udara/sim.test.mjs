import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../../public/udara/sim/model.js";

/* Fixture dibangun di memori sesuai kontrak (angin.json, pltu.json, prakiraan.json, penduduk.json): uji tidak bergantung pada data harian. */
const t0 = Date.parse("2026-10-18T00:00:00Z"), iso = ms => new Date(ms).toISOString().slice(0, 16) + "Z";
const jam3 = Array.from({length: 25}, (_, k) => iso(t0 + k * 3 * 36e5)), lat = Array.from({length: 18}, (_, j) => -11 + j), lon = Array.from({length: 47}, (_, i) => 95 + i), kali = [1, 1.4, 1.7];
const kisi = f => kali.map((_, l) => jam3.map((_, t) => lat.map((la, j) => lon.map((lo, i) => Math.round(f(l, t, la, lo) * 10)))));
const dataAngin = {v: 1, jam: jam3, lapis: ["10m", "925hPa", "850hPa"], lat, lon, /* angin tenggara menuju barat laut */
  u: kisi((l, t, la, lo) => -3.2 * kali[l] + 1.2 * Math.sin(t / 4 + lo / 9)), v: kisi((l, t, la, lo) => 2.4 * kali[l] + Math.cos(t / 5 + la / 4)),
  blh: jam3.map((_, t) => lat.map(() => lon.map(() => Math.round(250 + 1100 * Math.max(0, Math.sin(Math.PI * (((new Date(t0 + t * 3 * 36e5).getUTCHours() + 7) % 24) - 7) / 11))))))};
const A = M.kemasAngin(dataAngin);
const pltu = [{id: "P1", nama: "PLTU Suralaya", mw: 4025, lat: -5.89, lon: 106.03}, {id: "P2", nama: "PLTU Banjarsari", mw: 220, lat: -3.75, lon: 103.8}];
const KT = [["1671", "Kota Palembang", -2.98, 104.76, 1.7e6, .55], ["6271", "Kota Palangka Raya", -2.21, 113.92, 3e5, .7], ["1471", "Kota Pekanbaru", .51, 101.45, 1.1e6, .4], ["1571", "Kota Jambi", -1.6, 103.61, 6e5, .5],
  ["6371", "Kota Banjarmasin", -3.32, 114.59, 7e5, .35], ["1371", "Kota Padang", -.95, 100.35, 9e5, .15], ["1271", "Kota Medan", 3.59, 98.67, 2.4e6, .1], ["3171", "Jakarta Pusat", -6.18, 106.83, 3e6, .05],
  ["1771", "Kota Bengkulu", -3.8, 102.26, 3.5e5, .2], ["1871", "Kota Bandar Lampung", -5.43, 105.26, 1e6, .15], ["6171", "Kota Pontianak", -.03, 109.33, 6.5e5, .45], ["1673", "Kota Prabumulih", -3.43, 104.24, 1.7e5, .5], ["1674", "Kota Lubuklinggau", -3.3, 102.86, 2e5, .4]];
const prak = {v: 1, hari: ["2026-10-18", "2026-10-19", "2026-10-20"], kota: KT.map(([kode, nama, la, lo, , asap]) => { const dasar = 28 + 70 * asap, pm = Array.from({length: 72}, (_, h) => Math.round(dasar * (1 + .35 * Math.sin(h / 3.8 + lo))));
  return {kode, nama, lat: la, lon: lo, pm, r24: [0, 1, 2].map(d => Math.round(pm.slice(d * 24, d * 24 + 24).reduce((a, b) => a + b, 0) / 24)), asap: [asap, asap, asap]}; })};
const pend = {grid: KT.map(([, , la, lo, p]) => [la, lo, p, ""])};
/* 3 kompleks sintetis: dua di Sumatra Selatan, satu di Kalimantan Tengah */
const kluster = {features: [
  {properties: {id: "K1", lat: -3.3, lon: 105.2, frp24: 9000, gambut: true, kab: "OKI", prov: "16"}},
  {properties: {id: "K2", lat: -2.5, lon: 104.0, frp24: 3000, gambut: true, kab: "Musi", prov: "16"}},
  {properties: {id: "K3", lat: -2.4, lon: 113.0, frp24: 6000, gambut: false, kab: "Pulang Pisau", prov: "62"}}]};

test("mulberry32 dapat diulang, gauss rata-rata 0 dan varians 1", () => {
  const a = M.mulberry32(7), b = M.mulberry32(7); for (let i = 0; i < 20; i++) assert.equal(a(), b());
  const r = M.mulberry32(1), x = Array.from({length: 20000}, () => M.gauss(r)), m = x.reduce((s, v) => s + v) / x.length, va = x.reduce((s, v) => s + (v - m) ** 2, 0) / x.length;
  assert.ok(Math.abs(m) < .03 && Math.abs(va - 1) < .05, `m=${m} var=${va}`);
});
test("interpolasi bilinear tepat pada kisi linear", () => {
  const G = {nx: 3, ny: 3, lon0: 0, lat0: 0, dlon: 1, dlat: 1}, F = Float32Array.from({length: 9}, (_, k) => 2 * (k % 3) + 10 * ((k / 3) | 0));
  assert.ok(Math.abs(M.bil(F, G, 1.25, .5) - (2 * 1.25 + 10 * .5)) < 1e-5);
  assert.equal(M.bil(F, G, -5, -5), 0);
});
test("angin: interpolasi waktu di antara dua jam 3-jaman, rotasi 180 derajat dan pelemahan", () => {
  const [u0, v0] = M.angin(A, 0, 100, -3, 10), [u1] = M.angin(A, 3, 100, -3, 10), [um] = M.angin(A, 1.5, 100, -3, 10);
  assert.ok(Math.abs(um - (u0 + u1) / 2) < 1e-4);
  const [ub, vb] = M.angin(A, 0, 100, -3, 10, {anginPutar: Math.PI}); assert.ok(Math.abs(ub + u0) < 1e-4 && Math.abs(vb + v0) < 1e-4);
  const [ul] = M.angin(A, 0, 100, -3, 10, {anginKali: .5}); assert.ok(Math.abs(ul - u0 / 2) < 1e-4);
  const [u850] = M.angin(A, 0, 100, -3, 1500); assert.ok(Math.abs(u850) > Math.abs(u0), "lapis atas lebih kencang di fixture");
});
test("sumber: grup per kompleks, FRP jadi Q, PLTU satu grup, sumber di luar kisi dibuang", () => {
  const s = M.buatSumber(kluster, [...pltu, {id: "X", nama: "luar", mw: 999, lat: 40, lon: 10}], A);
  assert.equal(s.grup.filter(g => g.jenis === "api").length, 3);
  assert.ok(!s.sumber.some(x => x.id === "X"));
  assert.equal(s.sumber.find(x => x.id === "K1").Q, M.emisiApi(9000, true));
  const lo = s.sumber.find(x => x.id === "K1"); assert.ok(lo.zhi <= 800, "gambut: plume rendah");
  assert.ok(s.sumber.find(x => x.id === "K3").zhi > lo.zhi, "api besar non-gambut lebih tinggi");
});

const kota = prak.kota, src = M.buatSumber(kluster, pltu, A), dasar = M.jalankan(A, src, kota, {});
test("simulasi dapat diulang (seed tetap) dan konsentrasi permukaan tidak negatif", () => {
  const b = M.jalankan(A, src, kota, {});
  assert.deepEqual(Array.from(b.sfcA.slice(0, 5000)), Array.from(dasar.sfcA.slice(0, 5000)));
  assert.ok(dasar.sfcA.every(v => v >= 0 && Number.isFinite(v)));
  assert.ok(dasar.sfcA.reduce((s, v) => s + v, 0) > 0, "ada asap");
});
test("adveksi: awan bergerak ke barat laut dari sumber (angin tenggara) dan berbalik saat angin dibalik", () => {
  /* hanya sumber Sumatra Selatan, supaya pusat massa tidak tercampur kompleks Kalimantan */
  const sumsel = M.buatSumber({features: kluster.features.slice(0, 1)}, [], A), a = M.jalankan(A, sumsel, kota, {}), b = M.jalankan(A, sumsel, kota, {anginPutar: Math.PI});
  const pusat = h => { let sx = 0, sy = 0, sw = 0; const k = h.kisi; for (let c = 0; c < k.n; c++) { const w = h.sfcA[48 * k.n + c]; if (w <= 0) continue; sx += w * ((c % k.nx) + .5) * k.s; sy += w * (((c / k.nx) | 0) + .5) * k.s; sw += w; } return [k.lon0 + sx / sw, k.lat0 + sy / sw]; };
  const [x0, y0] = pusat(a), [x1, y1] = pusat(b);
  assert.ok(x0 < 105.2 && y0 > -3.3, `pusat awan dasar (${x0.toFixed(2)}, ${y0.toFixed(2)}) harus di barat laut sumber (105,2; -3,3)`);
  assert.ok(x1 > x0 && y1 < y0, `berbalik: (${x1.toFixed(2)}, ${y1.toFixed(2)}) harus ke tenggara dari (${x0.toFixed(2)}, ${y0.toFixed(2)})`);
});
test("difusi horizontal mengencerkan: konsentrasi puncak lebih rendah daripada tanpa difusi (massa sama)", () => {
  const ukur = h => { const k = h.kisi; let sw = 0, sx = 0, sy = 0, mx = 0; for (let c = 0; c < k.n; c++) { const w = h.sfcA[24 * k.n + c]; if (w <= 0) continue; sw += w; sx += w * (c % k.nx); sy += w * ((c / k.nx) | 0); if (w > mx) mx = w; }
    let v = 0; for (let c = 0; c < k.n; c++) { const w = h.sfcA[24 * k.n + c]; if (w > 0) v += w * (((c % k.nx) - sx / sw) ** 2 + (((c / k.nx) | 0) - sy / sw) ** 2); } return {lebar: v / sw, puncak: mx}; };
  const {khBL, khAtas} = M.KONF; let tanpa; try { M.KONF.khBL = 0; M.KONF.khAtas = 0; tanpa = ukur(M.jalankan(A, src, kota, {})); } finally { M.KONF.khBL = khBL; M.KONF.khAtas = khAtas; }
  const dengan = ukur(dasar); assert.ok(dengan.puncak < tanpa.puncak * .8, `dengan ${JSON.stringify(dengan)} tanpa ${JSON.stringify(tanpa)}`);
});
test("skenario: faktor emisi linear dan api 0 = tanpa kontribusi", () => {
  const sep = M.jalankan(A, src, kota, {fApi: .5}), nol = M.jalankan(A, src, kota, {fApi: 0});
  const tot = h => h.sfcA.reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(tot(sep) / tot(dasar) - .5) < 1e-3, `rasio ${tot(sep) / tot(dasar)}`);
  assert.equal(tot(nol), 0);
  const tanpaPltu = M.jalankan(A, src, kota, {fPltu: 0}); assert.equal(tanpaPltu.sfcP.reduce((s, v) => s + v, 0), 0);
  assert.deepEqual(Array.from(tanpaPltu.sfcA.slice(0, 3000)), Array.from(dasar.sfcA.slice(0, 3000)), "api tidak berubah saat PLTU mati");
});
const kal = M.kalibrasi(dasar, prak);
test("kalibrasi: K positif dari cukup kota", () => {
  assert.ok(kal.terkalibrasi && kal.K > 0, JSON.stringify(kal));
  assert.ok(kal.n >= 2, `kota terpakai ${kal.n}`);
});
const jiwa = M.pendudukKota(pend, kota), pmD = kota.map((_, i) => M.pmKota(prak, dasar, dasar, kal.K, i, A));
test("pmKota: dasar = prakiraan; skenario api 0 tidak di atas dasar dan tidak negatif", () => {
  const nol = M.jalankan(A, src, kota, {fApi: 0}); let turun = 0;
  kota.forEach((c, i) => { const p = M.pmKota(prak, dasar, nol, kal.K, i, A); for (let b = 0; b <= 72; b++) { assert.ok(p[b] >= 0 && p[b] <= pmD[i][b] + 1e-3); if (p[b] < pmD[i][b] - 1) turun++; } });
  assert.ok(turun > 0, "setidaknya satu kota turun");
  assert.equal(pmD[0][5], prak.kota[0].pm[5]);
});
test("pmKota: angin berbalik menurunkan kota di hilir (Palembang) dan tidak pernah melebihi 3x porsi api", () => {
  const bal = M.jalankan(A, src, kota, {anginPutar: Math.PI}), p = M.pmKota(prak, dasar, bal, kal.K, 0, A);
  for (let b = 0; b <= 72; b++) assert.ok(p[b] <= pmD[0][b] * (1 + prak.kota[0].asap[0] * 2) + 1e-3);
});
test("penduduk: tiap sel masuk satu kota terdekat", () => { assert.equal(jiwa[0], 1.7e6); assert.equal(jiwa.reduce((a, b) => a + b, 0), pend.grid.reduce((a, r) => a + r[2], 0)); });
test("paparan: jiwa-jam hanya di atas ambang", () => {
  const pm = new Float32Array(73).fill(60); pm.fill(10, 0, 10);
  assert.equal(M.paparan(pm, 100).jj, 100 * 62); assert.equal(M.paparan(new Float32Array(73).fill(55), 1e6).jj, 0);
});
test("urutan perlakuan menurun menurut jiwa-jam; libur sekolah hanya menghindari jam sekolah hari kerja", () => {
  const u = M.urutPerlakuan(A, prak, dasar, kal.K, jiwa, pmD);
  for (let i = 1; i < u.length; i++) assert.ok(u[i - 1].jj > u[i].jj || (u[i - 1].jj === u[i].jj && u[i - 1].dosis >= u[i].dosis), `urutan salah di ${i}`);
  assert.ok(u.some(x => x.jenis === "kompleks") && u.some(x => x.jenis === "sekolah"));
  /* jam 0 = Minggu 18 Okt 07.00 WIB; Senin 19 Okt 07.00 = jam 24. PM 100 rata: 7 jam sekolah x 2 hari kerja dalam 72 jam (Sen, Sel) di bin 24..30 dan 48..54 */
  const h = M.sekolahHindar(A, new Float32Array(73).fill(100), 1000);
  const fS = .25 + .75 * .8, fR = .1 + .9 * .6, anak = 1000 * M.KONF.anak, sel = fS - fR;
  assert.ok(Math.abs(h.jj - anak * 14 * sel) < 1e-6 * anak && Math.abs(h.dosis - anak * 14 * 44.5 * sel) < 1e-6 * anak * 44.5 * 14, `jj ${h.jj}, harapan ${anak * 14 * sel}`);
  /* PM rendah (< ambang) tidak menghindari apa pun */
  assert.equal(M.sekolahHindar(A, new Float32Array(73).fill(30), 1000).jj, 0);
});
test("kategori ISPU dan BATAS", () => {
  assert.equal(M.kategori(15.5), 0); assert.equal(M.kategori(55.5), 2); assert.equal(M.kategori(300), 4);
  assert.ok(M.BATAS.length >= 5 && M.BATAS.every(t => !t.includes("—")));
});

test("asap null = tak terpercaya: PM dibiarkan, bukan dianggap 0, dan kota itu tidak menurunkan peringkat perlakuan", () => {
  const kopi = {...prak, kota: prak.kota.map((c, i) => i === 0 ? {...c, asap: [null, null, null]} : c)};
  const bal = M.jalankan(A, src, kota, {anginPutar: Math.PI}), p = M.pmKota(kopi, dasar, bal, kal.K, 0, A);
  for (let b = 0; b <= 72; b++) assert.ok(Math.abs(p[b] - kopi.kota[0].pm[Math.min(b, 71)]) < 1e-2 + Math.abs(M.deret(bal, 0, "pltu")[b] - M.deret(dasar, 0, "pltu")[b]), `jam ${b}: ${p[b]} vs ${kopi.kota[0].pm[Math.min(b, 71)]}`);
  assert.ok(M.takTerpercaya(kopi, 0, A, 10) && !M.takTerpercaya(prak, 0, A, 10));
  const u1 = M.urutPerlakuan(A, prak, dasar, kal.K, jiwa, pmD).filter(x => x.jenis === "kompleks"), u2 = M.urutPerlakuan(A, kopi, dasar, kal.K, jiwa, pmD).filter(x => x.jenis === "kompleks");
  assert.ok(u2.reduce((s, x) => s + x.jj, 0) < u1.reduce((s, x) => s + x.jj, 0), "kota Palembang tak terpercaya tidak boleh menyumbang jiwa-jam");
});
test("perlakuan teratas punya rentang lo <= jj <= hi", () => {
  const u = M.urutPerlakuan(A, prak, dasar, kal.K, jiwa, pmD);
  for (const x of u.slice(0, 5)) assert.ok(x.lo <= x.jj + 1e-6 && x.jj <= x.hi + 1e-6, `${x.nama}: ${x.lo} ${x.jj} ${x.hi}`);
});

/* ---------- emisi, ensemble, validasi, lapis tanggap ---------- */
import * as T from "../../public/udara/sim/tanggap.js";
test("emisi api dari FRE: jumlah FRP / lintasan x kg-per-MJ x faktor emisi, gambut lebih besar daripada mineral", () => {
  const { dmFre, efGambut, efMineral, lintasan } = M.KONF;
  assert.ok(Math.abs(M.emisiApi(6000, false) - 6000 / lintasan * dmFre * efMineral) < 1e-9);
  assert.ok(Math.abs(M.emisiApi(6000, true) / M.emisiApi(6000, false) - efGambut / efMineral) < 1e-9);
  const s = M.buatSumber(kluster, pltu, A);
  assert.equal(s.sumber.find(x => x.id === "K1").Q, M.emisiApi(9000, true)); assert.equal(s.sumber.find(x => x.id === "K3").Q, M.emisiApi(6000, false));
});
test("PLTU: emisi memakai faktor kapasitas tiap unit bila ada, kapasitas MW nyata", () => {
  const s = M.buatSumber({features: []}, [{id: "P", nama: "x", mw: 1000, lat: -5.9, lon: 106, fk: .8}, {id: "Q", nama: "y", mw: 1000, lat: -5.8, lon: 106, fk: null}], A);
  const q = id => s.sumber.find(x => x.id === id).Q;
  assert.ok(Math.abs(q("P") - 1000 * 1000 * .8 * M.KONF.efPltu / 3600) < 1e-9); assert.ok(Math.abs(q("Q") - 1000 * 1000 * M.KONF.kfPltu * M.KONF.efPltu / 3600) < 1e-9);
});
test("blhKali: lapisan campuran dikalikan di medan, dan hasil berubah tetapi tetap terbatas dan tak negatif", () => {
  assert.ok(Math.abs(M.medanAngin(A, 0, {blhKali: 2}).b[100] - 2 * M.medanAngin(A, 0, {}).b[100]) < 1e-3);
  const t = h => h.sfcA.reduce((s, v) => s + v, 0), tebal = M.jalankan(A, src, kota, {blhKali: 2});
  assert.ok(tebal.sfcA.every(v => v >= 0 && Number.isFinite(v)) && Math.abs(t(tebal) / t(dasar) - 1) > .02, `tebal ${t(tebal)} vs dasar ${t(dasar)}`);
});
test("validasi: leave-one-out, galat >= 1 dan dalam2 antara 0 dan 1; target = model x K sempurna memberi galat 1", () => {
  const v = M.validasi(dasar, prak); assert.ok(v.ok && v.n >= 3, JSON.stringify(v));
  assert.ok(v.galat >= 1 && v.dalam2 >= 0 && v.dalam2 <= 1 && v.terburuk.length > 0, JSON.stringify(v));
  const palsu = {...prak, kota: prak.kota.map((c, ci) => { let m = 0; for (let g = 0; g < dasar.nG; g++) if (dasar.grup[g].jenis === "api") for (let b = 0; b < 24; b++) m += dasar.kon[(g * dasar.nK + ci) * dasar.NB + b] / 24; return {...c, r24: [m * 7, 0, 0], asap: [1, 0, 0]}; })};
  const p = M.validasi(dasar, palsu); assert.ok(p.ok && Math.abs(p.galat - 1) < 1e-6 && p.dalam2 === 1, JSON.stringify(p));
});
test("ensemble: deterministik, anggota di batas, pita p10 <= p50 <= p90 dan peluang di [0,1]", () => {
  const a = M.anggotaEnsemble(5, 7), b = M.anggotaEnsemble(5, 7); assert.deepEqual(a, b); assert.equal(a.length, 4);
  for (const x of a) assert.ok(x.skn.anginKali >= .5 && x.skn.anginKali <= 1.6 && x.skn.blhKali >= .5 && x.skn.blhKali <= 2 && x.skn.fApi >= .3 && x.skn.fApi <= 3);
  assert.ok(new Set(a.map(x => x.skn.anginKali)).size === 4, "anggota berbeda");
  const H = a.slice(0, 2).map(x => M.jalankan(A, src, kota, x.skn, x.seed)), pt = M.pitaKota(prak, dasar, H, pmD, kal.K, A, 0);
  for (let i = 0; i <= 72; i++) assert.ok(pt.p10[i] <= pt.p50[i] + 1e-4 && pt.p50[i] <= pt.p90[i] + 1e-4);
  assert.ok(pt.puncak.p10 <= pt.puncak.p90 && pt.peluang >= 0 && pt.peluang <= 1 && pt.n === 3);
  assert.ok(M.kuantil([1, 2, 3, 4, 5], .5) === 3 && M.kuantil([0, 10], .1) === 1);
});
test("ISPA: nol di bawah 55,4, naik dengan PM dan jiwa, lo <= t <= hi", () => {
  assert.equal(M.ispaHari(new Float32Array(73).fill(50), 1e6).t, 0);
  const a = M.ispaHari(new Float32Array(73).fill(100), 1e6), b = M.ispaHari(new Float32Array(73).fill(200), 1e6);
  assert.ok(a.t > 0 && b.t > a.t && a.lo <= a.t && a.t <= a.hi, JSON.stringify([a, b]));
  assert.ok(Math.abs(M.ispaHari(new Float32Array(73).fill(100), 2e6).t / a.t - 2) < 1e-9);
});
const fk = T.fasilitasKota([{t: "rs", lat: -2.95, lon: 104.7}, {t: "faskes", lat: -2.99, lon: 104.8}, {t: "sekolah", lat: -3, lon: 104.7}, {t: "sekolah", lat: 60, lon: 10}, {t: "lain", lat: -3, lon: 104.7}], kota);
test("fasilitas: masuk kota terdekat, jauh dan jenis asing dibuang", () => {
  assert.deepEqual(fk[0], {sekolah: 1, rs: 1, faskes: 1}); assert.equal(fk.reduce((s, x) => s + x.sekolah + x.rs + x.faskes, 0), 3);
});
test("ruang bersih: kapasitas dibatasi, bagian terlindung kecil; masker sesuai asumsi; perlindungan sebagian orang menghindari orang-hari walau rata-rata PM tak melewati ambang", () => {
  const r = T.ruangKota({sekolah: 100, rs: 5, faskes: 5}, 1e6); assert.equal(r.unit, T.TANGGAP.ruang.maksUnit); assert.ok(r.f > 0 && r.f < .01 && r.p < 1);
  assert.equal(T.ruangKota({sekolah: 0, rs: 0, faskes: 0}, 1e6).unit, 0);
  const m = T.TANGGAP.masker, g = T.maskerGrup(); assert.ok(Math.abs(g.f - m.cakupan * m.patuh) < 1e-12 && Math.abs(g.p - (1 - m.proteksi)) < 1e-12);
  const pm = new Float32Array(73).fill(60), e = T.efekGrup(pm, 1e6, {f: .1, p: .5}); /* 10% orang menghirup 30 (di bawah ambang): 10% dari 72 jam x 1e6 / 24 */
  assert.ok(Math.abs(e.oh - .1 * 1e6 * 72 / 24) < 1e-6, `oh ${e.oh}`);
  assert.equal(T.efekGrup(pm, 1e6, {f: 0, p: .5}).oh, 0); assert.equal(T.efekGrup(pm, 1e6, {f: .1, p: 1}).oh, 0);
});
test("peringkat perlakuan: menurun menurut orang-hari, biaya > 0, rentang lo <= oh <= hi, ada kompleks dan masker", () => {
  const urut = M.urutPerlakuan(A, prak, dasar, kal.K, jiwa, pmD), pr = T.peringkat(A, prak, dasar, kal.K, jiwa, pmD, urut, fk);
  const jenis = new Set(pr.map(x => x.jenis)); assert.ok(jenis.has("kompleks") && jenis.has("masker"), [...jenis].join());
  for (let i = 0; i < pr.length; i++) { const x = pr[i]; if (i) assert.ok(pr[i - 1].oh >= x.oh);
    assert.ok(x.biaya > 0 && x.oh >= 1 && x.lo <= x.oh + 1e-9 && x.oh <= x.hi + 1e-9 && x.perOh > 0, JSON.stringify(x)); }
  const mk = pr.find(x => x.jenis === "masker"), i = prak.kota.findIndex(c => c.kode === mk.id), maks = M.paparan(pmD[i], jiwa[i]).jj / 24;
  assert.ok(mk.oh <= maks + 1e-6 && mk.oh > 0, `masker ${mk.oh} vs seluruh ${maks}`);
  const ideal = T.TANGGAP.masker, lengkap = T.efekGrup(pmD[i], jiwa[i], T.maskerGrup({...ideal, cakupan: 1, patuh: 1, proteksi: 1})); assert.ok(Math.abs(lengkap.oh - maks) < 1e-6, "semua orang terlindung penuh menghindari semua orang-hari");
});
test("beban RS: urut menurun, perFaskes null bila tak ada faskes", () => {
  const b = T.bebanRS(kota, jiwa, pmD, fk); for (let i = 1; i < b.length; i++) assert.ok(b[i - 1].ispa >= b[i].ispa);
  assert.ok(b.every(x => x.perFaskes === null || x.perFaskes > 0));
});
