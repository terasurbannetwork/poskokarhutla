/* Uji skenario muka sungai HAND (public/banjir/sim_hand.js). Dimuat lewat vm bersama sim_genangan.js dan sim_tanggap.js persis seperti di
   peramban. Lembah V buatan dengan alur di kolom tengah, jadi HAND bisa dicek tangan; invarian, bukan potret angka. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const ctx = vm.createContext({});
for (const f of ["sim_genangan.js", "sim_tanggap.js", "sim_hand.js"]) vm.runInContext(fs.readFileSync(new URL(`../../public/banjir/${f}`, import.meta.url), "utf8"), ctx);
const SG = ctx.SimGenangan, ST = ctx.SimTanggap, SH = ctx.SimHand;

const nx = 21, ny = 30, c = 10, dx = 100, N = nx * ny;
/* lembah V: naik 1 m tiap sel menjauhi kolom tengah, turun 5 cm tiap baris ke selatan */
const z = Float64Array.from({length: N}, (_, k) => Math.abs(k % nx - c) + (ny - (k / nx | 0)) * .05);
const lembah = () => { const prep = SG.siapkanArea({nx, ny, dx, z}); return {prep, H: SH.hitung(prep, {nx, ny, dx}, SG, .5)}; };

test("HAND: alur tengah 0, tebing naik sesuai jarak ke alur", () => {
  const {H} = lembah();
  for (let j = 3; j < ny - 3; j++) {
    assert.equal(H.alur[j * nx + c], 1, `kolom tengah baris ${j} harus alur`);
    assert.equal(H.hand[j * nx + c], 0);
    for (const d of [1, 3, 6]) for (const s of [-1, 1]) { const h = H.hand[j * nx + c + s * d];
      assert.ok(Math.abs(h - d) < .2, `baris ${j} jarak ${d}: HAND ${h}, harus ~${d}`); }
  }
  assert.ok(H.nTak > 0 && H.nTak < N / 4, `sel tepi yang mengalir keluar kotak tanpa alur dilaporkan (${H.nTak})`);
});

test("air permanen (waduk) jadi alur: tebing di tepinya diukur dari permukaan air, bukan dari alur jauh", () => {
  const prep = SG.siapkanArea({nx, ny, dx, z}), air = new Uint8Array(N); air[15 * nx + 16] = 1; /* kolam di tebing timur, 6 m di atas alur */
  const H = SH.hitung(prep, {nx, ny, dx}, SG, .5, air);
  assert.equal(H.alur[15 * nx + 16], 1); assert.equal(H.hand[15 * nx + 16], 0);
  assert.ok(Math.abs(H.hand[15 * nx + 17] - 1) < .2, `sel hulu kolam: HAND ${H.hand[15 * nx + 17]}, harus ~1 (dari kolam)`);
});

test("muka air naik: luas, kedalaman, bangunan, jalan tak pernah berkurang; m = 0 kering", () => {
  const {prep, H} = lembah(), pop = {lo: new Float64Array(N).fill(1), hi: new Float64Array(N).fill(3)};
  const laju = ST.rasterJalan([{p: [[0, 15], [nx - 1, 15]], k: "tertiary"}], (lo, la) => [lo, la], nx, ny), bangunan = [0, .5, 2.2, 4.9, 9];
  let lalu = null;
  for (const m of [0, .5, 1, 2, 3, 5, 8, 10]) { const r = SH.ringkas(H.hand, prep.laut, m, dx, {pop, laju, bangunan});
    if (m === 0) assert.ok(r.luas === 0 && r.bangunan === 0 && r.jiwa[1] === 0, "muka air 0 tidak boleh menggenangi apa pun");
    if (lalu) for (const k of ["luas", "dalam", "bangunan", "jalanKm"]) assert.ok(r[k] >= lalu[k], `${k} turun dari ${lalu[k]} ke ${r[k]} saat muka air naik ke ${m}`);
    assert.ok(r.jiwa[0] <= r.jiwa[1]); lalu = r; }
  assert.equal(SH.ringkas(H.hand, prep.laut, 2.3, dx, {bangunan}).bangunan, 2, "bangunan HAND 0 dan 0,5 m tergenang >= 10 cm pada 2,3 m; 2,2 m baru 10 cm kurang sedikit");
  const d = SH.kedalaman(H.hand, prep.laut, 3);
  for (let k = 0; k < N; k++) { assert.ok(d[k] >= 0 && d[k] <= 3); if (H.hand[k] < 3) assert.ok(Math.abs(d[k] - (3 - H.hand[k])) < 1e-6); }
});

test("akses: genangan yang memotong kotak mengurung warga di seberang titik aman", () => {
  const {prep, H} = lembah(), pop = {lo: new Float64Array(N).fill(1), hi: new Float64Array(N).fill(1)}, laju = new Float32Array(N);
  const aman = [15 * nx + 2], base = {nx, ny, dx, laju, laut: prep.laut, aman, pop}; /* sekolah di tebing barat */
  const kering = SH.akses({...base, dalam: new Float32Array(N)}, ST);
  assert.equal(kering.nAman, 1); assert.equal(kering.terkurung[1], 0, "tanpa air semua orang terjangkau");
  /* muka air 2 m: alur tengah selebar 5 sel terendam >= 30 cm memisahkan tebing timur */
  /* baris tepi utara dan selatan tanpa HAND (mengalir keluar kotak) dianggap kering: salin baris sebelahnya supaya sabuk air utuh */
  const dalam = SH.kedalaman(H.hand, prep.laut, 2); dalam.copyWithin(0, nx, 2 * nx); dalam.copyWithin((ny - 1) * nx, (ny - 2) * nx, (ny - 1) * nx);
  const r = SH.akses({...base, dalam}, ST);
  let timur = 0; for (let k = 0; k < N; k++) { const i = k % nx; if (i > c + 1 && !(H.hand[k] < 2 - .3)) timur++; }
  assert.ok(r.terkurung[0] > 0, "tebing timur harus terkurung");
  assert.ok(r.terkurung[0] <= timur, `terkurung ${r.terkurung[0]} melebihi sel kering di timur ${timur}`);
  assert.ok(r.median != null && r.median > 0, "warga di barat punya waktu tempuh");
  /* muka air 0,5 m: hanya alur tengah >= 30 cm. Jalan melintang lembah di sel alur = jembatan, jadi tebing timur tersambung lagi */
  const jl = ST.rasterJalan([{p: [[0, 15], [nx - 1, 15]], k: "tertiary"}], (lo, la) => [lo, la], nx, ny), d5 = SH.kedalaman(H.hand, prep.laut, .5);
  d5.copyWithin(0, nx, 2 * nx); d5.copyWithin((ny - 1) * nx, (ny - 2) * nx, (ny - 1) * nx);
  const tanpa = SH.akses({...base, laju: jl, dalam: d5}, ST), jembatan = SH.akses({...base, laju: jl, dalam: d5, alur: H.alur}, ST);
  assert.ok(tanpa.terkurung[0] > 0 && jembatan.terkurung[0] === 0, `jembatan di alur harus menyambung tebing timur (${tanpa.terkurung[0]} lalu ${jembatan.terkurung[0]})`);
  const tenggelam = SH.akses({...base, dalam: new Float32Array(N).fill(1)}, ST);
  assert.equal(tenggelam.nAman, 0, "titik aman yang tergenang tidak dihitung");
});

test("kurva debit sintetis: saluran persegi cocok dengan rumus Manning, kurva naik, mukaDebit membalik kurva", () => {
  /* 5 sel lebar x 30 baris, semua HAND 0 dan mengalir ke sel tengah barisnya; sungai utama = kolom tengah, turun 0,1 m per baris */
  const w = 5, n = 30, dx = 50, N = w * n, H = {hand: new Float32Array(N), lepas: new Int32Array(N)}, utm = new Uint8Array(N), z = new Float64Array(N), laut = new Uint8Array(N);
  for (let k = 0; k < N; k++) { const j = k / w | 0; H.lepas[k] = j * w + 2; z[k] = (n - j) * .1; if (k % w === 2) utm[k] = 1; }
  const K = SH.kurva(H, laut, utm, z, dx), S = ((n - 1) * .1) / (n * dx), i = K.h.indexOf(2);
  const harap = 2 * w * dx * 2 ** (2 / 3) * Math.sqrt(S) / SH.ASUMSI.MANNING;
  assert.ok(Math.abs(K.q[i] - harap) / harap < 1e-6, `Q(2 m) ${K.q[i]}, rumus ${harap}`);
  for (let t = 1; t < K.q.length; t++) assert.ok(K.q[t] >= K.q[t - 1], "kurva tidak boleh turun");
  const m = SH.mukaDebit(K, harap); assert.ok(Math.abs(m.m - 2) < .01 && !m.lewat, `mukaDebit ${m.m}`);
  assert.equal(SH.mukaDebit(K, 0).m, 0); assert.equal(SH.mukaDebit(K, -5).m, 0, "debit di bawah kapasitas alur = tidak meluap");
  assert.ok(SH.mukaDebit(K, K.q.at(-1) * 2).lewat, "debit melebihi kurva ditandai lewat");
});

test("lembah V: sungai utama = kolom tengah, kurva dari HAND nyata naik tegas", () => {
  const {prep, H} = lembah(), k = 20 * nx + c, utm = SH.utama(prep.acc, H.alur, prep.laut, k);
  for (let j = 14; j < ny - 3; j++) assert.equal(utm[j * nx + c], 1, `baris ${j} kolom tengah harus sungai utama`); /* hulu (tangkapan < separuh) bukan sungai utama */
  assert.equal(utm[3 * nx + c], 0, "hulu jauh bukan sungai utama");
  for (let q = 0; q < N; q++) if (utm[q]) assert.equal(q % nx, c, "hanya kolom tengah");
  const K = SH.kurva(H, prep.laut, utm, prep.z, dx);
  assert.ok(K.nSel > N / 2 && K.S >= SH.ASUMSI.LERENG_MIN);
  assert.ok(K.q[10] > 0 && K.q[30] > K.q[10] && K.q[60] > K.q[30], "debit naik bersama muka air");
});
