/* Uji fungsi murni public/gunungapi/sim_lahar.js tanpa peramban: node scripts/gunungapi/uji_lahar.mjs
   DEM sintetis: kerucut + satu lembah terkarang ke timur + dataran 30 m di luar kerucut. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
/* package.json "type":"module" membuat require() memperlakukan .js sebagai ESM; skrip peramban ini dijalankan sebagai CommonJS lewat Function */
const mod = {exports: {}};
new Function("module", readFileSync(new URL("../../public/gunungapi/sim_lahar.js", import.meta.url), "utf8"))(mod);
const L = mod.exports;

let lolos = 0;
const uji = (nama, fn) => { try { fn(); lolos++; console.log("  ok  ", nama); } catch (e) { console.error("  GAGAL", nama, "\n       ", e.message); process.exitCode = 1; } };

/* ---- 1. dekode terrarium: R*256 + G + B/256 - 32768 ---- */
uji("dekode terrarium dari piksel", () => {
  assert.equal(L.dekode(128, 0, 0), 0, "piksel (128,0,0) harus 0 m");
  assert.equal(L.dekode(129, 1, 128), 257.5, "piksel (129,1,128) harus 257,5 m");
  assert.equal(L.dekode(127, 255, 0), -1, "piksel (127,255,0) harus -1 m");
  const rgba = new Uint8ClampedArray([128, 0, 0, 255, 135, 170, 0, 255]); /* 135*256+170-32768 = 1962 */
  const e = L.elevasi(rgba, 2);
  assert.deepEqual([...e], [0, 1962], "elevasi() harus mengikuti rumus per piksel");
});
uji("koordinat ubin bolak-balik", () => {
  const [gx, gy] = L.llKePx(12, 112.92, -8.108), [lon, lat] = L.pxKeLL(12, gx, gy);
  assert.ok(Math.abs(lon - 112.92) < 1e-9 && Math.abs(lat + 8.108) < 1e-9, `balik ke ${lon}, ${lat}`);
  assert.ok(Math.abs(L.mPerPx(0, 12) - 38.2185) < 0.01, "piksel z12 di ekuator ~38,22 m");
});

/* ---- 2. isi sink & D8 ---- */
const jml = (n, m, f) => { const d = new Float32Array(n * m); for (let y = 0; y < m; y++) for (let x = 0; x < n; x++) d[y * n + x] = f(x, y); return d; };
const tanpaCekungan = (z, n, m, dir) => { for (let y = 1; y < m - 1; y++) for (let x = 1; x < n - 1; x++) { const i = y * n + x; if (z[i] > 0.5 && dir[i] < 0) return `sel (${x},${y}) z=${z[i]} tidak mengalir ke mana pun`; } return null; };
uji("isi sink: cekungan tertutup terisi dan semua sel mengalir ke muara", () => {
  const n = 80, m = 80, dem = jml(n, m, (x, y) => 500 - 3 * x - Math.hypot(x - 40, y - 40) * 0 - (Math.hypot(x - 40, y - 40) < 8 ? 80 : 0)); /* lereng ke barat + lubang di tengah */
  const z = L.isiSink(dem, n, m), dir = L.arahD8(z, n, m);
  assert.ok(z[40 * n + 40] > dem[40 * n + 40] + 40, `lubang harus terisi: ${dem[40 * n + 40]} -> ${z[40 * n + 40]}`);
  assert.equal(tanpaCekungan(z, n, m, dir), null);
  const P = L.alur(dir, 40 * n + 40, n * m);
  const akhir = P[P.length - 1], x = akhir % n, y = (akhir / n) | 0;
  assert.ok(P.length < n * m && (x === 0 || y === 0 || x === n - 1 || y === m - 1), `jalur dari lubang harus berakhir di tepi, berakhir di (${x},${y}) dgn ${P.length} langkah`);
});
uji("isi sink: mangkuk berbibir tinggi dan dataran rata tidak membuat putaran tanpa akhir", () => {
  const n = 60, m = 60, mangkuk = jml(n, m, (x, y) => { const r = Math.hypot(x - 30, y - 30); return r < 20 ? 100 + r * 4 - 200 * (r < 5 ? 1 : 0) : 300 - r; });
  const rata = jml(n, m, () => 100);
  for (const [nama, dem] of [["mangkuk", mangkuk], ["rata", rata]]) {
    const t0 = Date.now(), z = L.isiSink(dem, n, m), dir = L.arahD8(z, n, m), P = L.alur(dir, 30 * n + 30, n * m);
    assert.ok(Date.now() - t0 < 2000, nama + " terlalu lama");
    assert.ok(P.length < n * m, `${nama}: jalur ${P.length} langkah menembus batas ${n * m}`);
    assert.equal(tanpaCekungan(z, n, m, dir), null, nama);
  }
  /* penjaga panjang: dir sengaja berputar harus tetap berhenti */
  const putar = new Int32Array(4); putar[0] = 1; putar[1] = 0;
  assert.equal(L.alur(putar, 0, 50).length, 50, "alur() wajib berhenti di batas panjang walau dir berputar");
});

/* ---- 3. kerucut + lembah ---- */
const N = 401, C = 200, LAT = 0, Z = 12, PUNCAK = 2000;
const kerucut = jml(N, N, (x, y) => {
  const r = Math.hypot(x - C, y - C); let z = Math.max(30, PUNCAK - 12 * r);
  if (x > C) z -= 80 * Math.exp(-(((y - C) / 3) ** 2)) * Math.min(1, (x - C) / 3); /* lembah ke timur, mulai dari bukaan kawah */
  return z;
});
const jalan = (V, hl, maxJalur = 1) => L.simulasi({dem: kerucut, n: N, m: N, z: Z, lat: LAT, pusat: [C, C], V, hl, maxJalur});
const panjangPx = r => Math.max(...[...r.lahar.idx].map(i => i % N)) - C;

uji("jalur utama mengikuti lembah", () => {
  const r = jalan(1e6, 0.3), P = r.jalur[0].titik.filter(([x]) => x > C + 25 && x < C + 150);
  assert.ok(P.length > 10, "jalur utama harus lewat timur kawah, ada " + P.length + " titik");
  const sim = Math.max(...P.map(([, y]) => Math.abs(y - C)));
  assert.ok(sim <= 4, `jalur menyimpang ${sim} sel dari sumbu lembah (batas 4)`);
});
uji("lahar: luas planimetrik ~ B LAHARZ dan menyempit di lembah", () => {
  for (const V of [1e5, 3e5]) {
    const r = jalan(V, 0.3), {B} = L.laharz(V), luas = r.ringkas.lahar_km2 * 1e6;
    assert.ok(luas >= B * 0.8 && luas <= B * 1.3, `V=${V}: luas ${Math.round(luas)} m2 di luar 0,8-1,3 x B (${Math.round(B)})`);
    const lebar = new Map(); for (const i of r.lahar.idx) { const x = i % N; if (x > C + 30) lebar.set(x, (lebar.get(x) || 0) + 1); }
    assert.ok(Math.max(...lebar.values()) <= 30, `V=${V}: lahar melebar ${Math.max(...lebar.values())} sel pada satu kolom, harus tetap di lembah`);
    const ys = [...r.lahar.idx].filter(i => i % N > C + 30).map(i => Math.abs(((i / N) | 0) - C)); assert.ok(Math.max(...ys) <= 15, `lahar keluar lembah sejauh ${Math.max(...ys)} sel`);
  }
});
uji("lahar berhenti di dataran sesuai volume: volume besar lebih jauh, tidak melewati batas peta", () => {
  const a = panjangPx(jalan(1e5, 0.3)), b = panjangPx(jalan(3e5, 0.3));
  assert.ok(b > a, `3e5 m3 (${b} sel) harus lebih jauh dari 1e5 m3 (${a} sel)`);
  assert.ok(b < N - 6 - C, `lahar 3e5 sampai tepi peta (${b} sel), uji tak memisahkan 'berhenti' dari 'habis peta'`);
  const r = jalan(3e5, 0.3), maks = Math.max(...r.lahar.s); assert.ok(Math.abs(maks - r.ringkas.lahar_km * 1000) < 1e-3 * 1e3 + 100, "jarak depan lahar harus cocok dgn ringkasan");
  const urut = r.lahar.s.every((v, i, s) => !i || s[i - 1] <= v); assert.ok(urut, "sel lahar harus terurut menurut jarak (untuk animasi maju)");
});
uji("awan panas: H/L kecil lebih jauh, tidak melewati kerucut energi, ikut lembah", () => {
  const dx = L.mPerPx(LAT, Z);
  const jauh = {}; for (const hl of [0.2, 0.35]) { const r = jalan(1e5, hl); jauh[hl] = r.ringkas.pdc_km; assert.ok(r.pdc.idx.length > 0, `H/L ${hl}: tak ada sel awan panas`);
    assert.ok(r.ringkas.pdc_km * 1000 <= PUNCAK / hl + 2 * dx, `H/L ${hl}: jangkauan ${r.ringkas.pdc_km} km melewati H/L (${PUNCAK / hl / 1000} km)`);
    for (const i of r.pdc.idx) { const d = Math.hypot(i % N - C, ((i / N) | 0) - C) * dx; assert.ok((PUNCAK - kerucut[i]) / d >= hl - 1e-6, `sel ${i} di luar kerucut energi`); } }
  assert.ok(jauh[0.2] > jauh[0.35], `H/L 0,2 (${jauh[0.2]} km) harus lebih jauh dari 0,35 (${jauh[0.35]} km)`);
  const r = jalan(1e5, 0.2); const ys = [...r.pdc.idx].filter(i => i % N > C + 30).map(i => Math.abs(((i / N) | 0) - C)); assert.ok(!ys.length || Math.max(...ys) <= 12, "awan panas menyebar keluar lembah");
});
uji("simulasi lima jalur selesai cepat dan tiap jalur berbobot", () => {
  const t0 = Date.now(), r = L.simulasi({dem: kerucut, n: N, m: N, z: Z, lat: LAT, pusat: [C + 2, C - 1], V: 1e6, hl: 0.3});
  assert.ok(Date.now() - t0 < 3000, "terlalu lama: " + (Date.now() - t0) + " ms");
  const w = r.info.reduce((a, i) => a + i.bobot, 0); assert.ok(Math.abs(w - 1) < 1e-9, "bobot volume harus berjumlah 1, dapat " + w);
  assert.ok(r.info[0].utama, "jalur pertama harus jalur dari dasar kawah");
});

console.log(process.exitCode ? "\nADA YANG GAGAL" : `\nsemua hijau (${lolos} uji)`);
