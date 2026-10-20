/* Uji tutupan lahan per sel (public/banjir/sim_lahan.js) dan pemakaiannya di mesin genangan (CN per sel, Manning per sel).
   Berkas dimuat seperti di peramban (vm). Ubin PNG disuntik palsu: tanpa jaringan. Invarian, bukan potret angka. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const ctx = vm.createContext({URL, AbortSignal});
for (const f of ["sim_genangan.js", "sim_lahan.js"]) vm.runInContext(fs.readFileSync(new URL(`../../public/banjir/${f}`, import.meta.url), "utf8"), ctx);
const SG = ctx.SimGenangan, SLh = ctx.SimLahan;
const RGB = {pohon: [0, 100, 0], bangun: [250, 0, 0], air: [0, 100, 200]};
/* ubin 256x256 satu warna, atau separuh kiri/kanan */
const ubin = (kiri, kanan = kiri) => { const d = new Uint8ClampedArray(256 * 256 * 4); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const c = x < 128 ? kiri : kanan, o = (y * 256 + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = c[3] ?? 255; } return d; };
const kisi = () => SG.rencanaKisi(-2.7, 106.0, 3000, 30);

test("palet WorldCover: warna persis -> kelas, transparan -> 0, item 3 derajat sesuai penamaan ESA", () => {
  assert.equal(SLh.kelasDariRGB(250, 0, 0), 50); assert.equal(SLh.kelasDariRGB(0, 100, 0), 10); assert.equal(SLh.kelasDariRGB(0, 100, 200), 80);
  assert.equal(SLh.kelasDariRGB(250, 0, 0, 0), 0, "piksel transparan bukan kelas apa pun");
  assert.equal(SLh.kelasDariRGB(250, 3, 2), 50, "warna hampir sama (antialias) ke kelas terdekat");
  assert.equal(SLh.itemId(-2.7, 106), "ESA_WorldCover_10m_2021_v200_S03E105"); assert.equal(SLh.itemId(3.9, 96.7), "ESA_WorldCover_10m_2021_v200_N03E096");
  for (const [k, v] of Object.entries(SLh.KELAS)) assert.ok(v[1] > 30 && v[1] <= 100 && v[2] > 0 && v[3] >= 0, `kelas ${k}: CN/n/bobot di luar rentang sah`);
});

test("kisiLahan: CN dan n per sel = nilai kelas; separuh bangun separuh air ada di antara keduanya; ubin kosong ditolak", async () => {
  const K = kisi(), N = K.nx * K.ny;
  const pohon = await SLh.kisiLahan(K, async () => ubin(RGB.pohon));
  assert.ok(pohon, "semua pohon harus berhasil"); assert.ok(Math.abs(pohon.cn[5] - 73) < 1e-4 && Math.abs(pohon.n[5] - .12) < 1e-6, `pohon CN ${pohon.cn[5]} n ${pohon.n[5]}`);
  assert.equal(pohon.dom[0], 10); assert.ok(Math.abs(pohon.proporsi[10] - 1) < 1e-9);
  const campur = await SLh.kisiLahan(K, async () => ubin(RGB.bangun, RGB.air)), cn = Array.from(campur.cn);
  assert.ok(cn.every(v => v >= 89.99 && v <= 100.01), "CN campuran harus di antara bangun (90) dan air (100)"); assert.ok(cn.some(v => v > 90.5), "harus ada sel yang menyentuh separuh air");
  assert.ok(campur.bangun.some(v => v > 0) && Array.from(campur.bangun).every(v => v >= 0 && v <= 1));
  const kosong = await SLh.kisiLahan(K, async () => null, {cn: 80, n: .06});
  assert.equal(kosong, null, "semua sel tanpa data (> 50 %) harus ditolak, bukan diisi diam-diam");
  let cacah = 0; const separuh = await SLh.kisiLahan(K, async () => { if (++cacah % 2) return ubin(RGB.pohon); throw new Error("jaringan putus"); });
  assert.equal(separuh, null, "lebih dari 30 % ubin gagal harus ditolak");
  assert.equal(N, pohon.cn.length);
});

test("sebarPenduduk: total terjaga, laut nol, sel terbangun menerima lebih banyak", () => {
  const laut = Uint8Array.from([0, 0, 0, 1]), bobot = Float32Array.from([1, .02, .02, 0]), {lo, hi} = SLh.sebarPenduduk([100, 300], bobot, laut);
  assert.ok(Math.abs(lo.reduce((a, b) => a + b) - 100) < 1e-9 && Math.abs(hi.reduce((a, b) => a + b) - 300) < 1e-9, "jumlah sel harus = total kotak");
  assert.equal(lo[3], 0); assert.ok(lo[0] > 10 * lo[1], "sel terbangun harus jauh lebih padat dari hutan");
  const rata = SLh.sebarPenduduk([90, 90], null, Uint8Array.from([0, 0, 0])); assert.ok(Math.abs(rata.lo[0] - 30) < 1e-9, "tanpa lahan = rata");
});

test("mesin: Manning per sel seragam = angka tunggal (identik); hujanKelas seragam = hujan global; neraca massa terjaga dengan CN beragam", () => {
  const nx = 20, ny = 16, z = new Float64Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = 5 + (nx - i) * .08 + (j % 4) * .05;
  const J = 12, hu = Float64Array.from({length: J}, (_, t) => t < 4 ? 30 : 0), L = SG.limpasan(hu, 80, 2), dasar = {nx, ny, dx: 40, z, jam: J, hujan: L.efektif};
  const a = SG.jalankan({...dasar, manning: .06}), b = SG.jalankan({...dasar, manning: new Float64Array(nx * ny).fill(.06)});
  assert.deepEqual(Array.from(a.hmaks), Array.from(b.hmaks), "n seragam lewat larik harus persis sama dengan angka");
  const seragam = SG.limpasanSel(hu, new Float32Array(nx * ny).fill(80), 2), c = SG.jalankan({...dasar, hujan: undefined, hujanKelas: seragam.seri, kelas: seragam.kelas});
  assert.ok(Math.abs(c.neraca.hujan - a.neraca.hujan) / a.neraca.hujan < 1e-9, "CN seragam via kelas harus sama dengan hujan global");
  const cn = new Float32Array(nx * ny); for (let k = 0; k < cn.length; k++) cn[k] = (k % nx) < 10 ? 98 : 60;
  const m = SG.limpasanSel(hu, cn, 2), d = SG.jalankan({...dasar, hujan: undefined, hujanKelas: m.seri, kelas: m.kelas});
  assert.ok(d.neraca.galat < .01, `galat neraca ${d.neraca.galat}`); assert.equal(m.seri.length, 2, "dua CN unik = dua seri");
  const lo = SG.limpasan(hu, 60, 2).efektif.reduce((x, y) => x + y), hi = SG.limpasan(hu, 98, 2).efektif.reduce((x, y) => x + y);
  assert.ok(hi > lo, "CN 98 harus melimpas lebih banyak dari CN 60");
  assert.ok(Math.abs(d.neraca.hujan / (nx * ny * 40 * 40) * 1000 - (lo + hi) / 2) < 1e-6, "hujan efektif total = rata-rata dua kelas (separuh sel masing-masing)");
  assert.throws(() => SG.jalankan({...dasar, manning: new Float64Array(3)}), /manning/);
  assert.throws(() => SG.jalankan({...dasar, hujan: undefined, hujanKelas: m.seri, kelas: new Uint8Array(nx * ny).fill(9)}), /kelas/);
});
