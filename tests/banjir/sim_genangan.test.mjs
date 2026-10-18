/* Uji fisik mesin genangan & longsor (public/banjir/sim_genangan.js, sim_longsor.js). Berkas dimuat persis seperti di peramban
   (skrip klasik) lewat vm, jadi yang diuji adalah kode yang tayang. Kisi kecil supaya cepat; invarian, bukan potret angka. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const ctx = vm.createContext({});
for (const f of ["sim_genangan.js", "sim_longsor.js"]) vm.runInContext(fs.readFileSync(new URL(`../../public/banjir/${f}`, import.meta.url), "utf8"), ctx);
const SG = ctx.SimGenangan, SL = ctx.SimLongsor;

/* acak berbenih supaya ulang-jalan identik */
const acak = (s = 7) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const tepiSemua = (nx, ny) => SG.benihTepi(nx, ny);
const jam = (J, f) => Float64Array.from({length: J}, (_, t) => f(t));
const total = (r, laut) => { let v = 0; for (let k = 0; k < r.nx * r.ny; k++) if (!laut || !laut[k]) v += r.kedalaman[r.jam * r.nx * r.ny + k] * r.dx * r.dx; return v; };

test("kekekalan massa: hujan + sungai + laut + pompa, galat < 1%", () => {
  const nx = 24, ny = 20, r = acak(3), z = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = i < 3 ? -2 : (i - 3) * .15 + 2 * r() + Math.sin(j) * .5; /* laut di barat */
  const laut = SG.topengLaut(z, nx, ny), J = 12;
  assert.ok(laut.some(v => v) && !laut[nx * 5 + 10], "topeng laut harus berisi kolom barat saja");
  const hasil = SG.jalankan({nx, ny, dx: 30, z, laut, muka: SG.pasang([1.2], 1, 12.42).slice(0, J + 1), jam: J,
    hujan: jam(J, t => t < 4 ? 40 : 0), masuk: [{k: 10 * nx + 20, q: Float64Array.from({length: J + 1}, (_, t) => 5 + t)}], pompa: [{k: 8 * nx + 12, q: .2, mulai: 2}]});
  const n = hasil.neraca;
  assert.ok(n.hujan > 0 && n.sungai > 0 && n.lautMasuk > 0 && n.pompa > 0, `semua jalur harus aktif: ${JSON.stringify(n)}`);
  assert.ok(n.galat < .01, `galat neraca ${(n.galat * 100).toFixed(4)}% >= 1%`);
  assert.ok(Math.abs(total(hasil, laut) - n.simpan) / n.simpan < 1e-5, "genangan jam terakhir harus sama dengan simpanan neraca");
  for (const x of hasil.kedalaman) assert.ok(x >= 0 && Number.isFinite(x), `kedalaman negatif/tak hingga: ${x}`);
});

test("mangkuk tertutup terisi rata ke elevasi analitik dan tetap stabil 48 jam (n kecil)", () => {
  const n = 21, dx = 10, a = .02, z = new Float64Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) z[j * n + i] = a * ((i - 10) ** 2 + (j - 10) ** 2) * dx * dx / 100;
  const P = 60, J = 48, V = P / 1000 * n * n * dx * dx;
  /* pembanding: tepi terbuka bawaan membuang sebagian; uji utamanya tepi ditutup cincin dinding */
  const r = SG.jalankan({nx: n, ny: n, dx, z, jam: J, hujan: jam(J, t => t === 0 ? P : 0), manning: .03});
  const tutup = new Uint8Array(n * n); for (let k = 0; k < n * n; k++) { const i = k % n, j = (k / n) | 0; if (!i || !j || i === n - 1 || j === n - 1) tutup[k] = 1; }
  const r2 = SG.jalankan({nx: n, ny: n, dx, z, tutup, jam: J, hujan: jam(J, t => t === 0 ? P : 0), manning: .03});
  assert.ok(r.neraca.tepi > 0, "tepi terbuka harus membuang air (pembanding)");
  assert.ok(r2.neraca.tepi === 0, "tepi tertutup tidak boleh membuang air");
  /* air hujan di sel dinding tetap di sana; yang masuk mangkuk = volume di sel bukan dinding */
  const Vm = V * (1 - tutup.reduce((s, x) => s + x, 0) / (n * n));
  let lo = 0, hi = 50; for (let q = 0; q < 80; q++) { const L = (lo + hi) / 2; let v = 0; for (let k = 0; k < n * n; k++) if (!tutup[k]) v += Math.max(0, L - z[k]) * dx * dx; v > Vm ? hi = L : lo = L; }
  const L = (lo + hi) / 2, o = J * n * n;
  for (let k = 0; k < n * n; k++) { if (tutup[k]) continue; const h = r2.kedalaman[o + k];
    if (h > .02) assert.ok(Math.abs(z[k] + h - L) < .002, `muka air sel ${k} = ${(z[k] + h).toFixed(4)} m, analitik ${L.toFixed(4)} m`);
    if (z[k] > L + .02) assert.ok(h < .005, `sel ${k} di atas muka analitik masih basah ${h}`); }
});

test("Priority-Flood: DEM tanpa cekungan, tidak pernah menurunkan, lereng mulus tak berubah", () => {
  const nx = 30, ny = 25, r = acak(11), z = new Float64Array(nx * ny);
  for (let k = 0; k < z.length; k++) z[k] = 10 * r();
  const b = tepiSemua(nx, ny), f = SG.isiCekungan(z, nx, ny, b);
  for (let k = 0; k < z.length; k++) {
    assert.ok(f[k] >= z[k], `sel ${k} diturunkan`);
    if (b[k]) continue; const i = k % nx, j = (k / nx) | 0; let ada = false;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if ((di || dj) && ii >= 0 && jj >= 0 && ii < nx && jj < ny && f[jj * nx + ii] < f[k]) ada = true; }
    assert.ok(ada, `sel ${k} masih cekungan (tak ada tetangga lebih rendah)`); }
  const ramp = Float64Array.from({length: nx * ny}, (_, k) => (k % nx) * 2 + ((k / nx) | 0)), fr = SG.isiCekungan(ramp, nx, ny, b);
  assert.ok(ramp.every((v, k) => fr[k] === v), "lereng tanpa cekungan tidak boleh diubah");
  /* lubang yang hanya bocor lewat sudut: terbuka bagi 8-tetangga, perangkap bagi 4-tetangga (mesin aliran) */
  const p = new Float64Array(25).fill(10); p[12] = 0; p[6] = -1; p[0] = -2; const b5 = tepiSemua(5, 5);
  assert.equal(SG.isiCekungan(p, 5, 5, b5)[12], 0, "8-tetangga: bocor diagonal, tidak diisi");
  assert.ok(SG.isiCekungan(p, 5, 5, b5, 1e-5, 4)[12] >= 10, "4-tetangga: harus diisi sampai ambang 10 m");
  const cap = SG.batasiCekungan(p, SG.isiCekungan(p, 5, 5, b5, 1e-5, 4), .5);
  assert.ok(Math.abs(cap[12] - 9.5) < 1e-3 && cap[0] === -2, `batas cekungan 0,5 m: ${cap[12]}`);
  const arah = SG.arahD8(f, nx, ny, b), acc = SG.akumulasi(f, arah);
  const keluar = [...b].reduce((s, x, k) => s + (x ? acc[k] : 0), 0);
  assert.equal(keluar, nx * ny, "semua sel harus mengalir ke keluaran (akumulasi di benih = jumlah sel)");
});

test("tanggul menahan air; tanpa tanggul air menyeberang", () => {
  const nx = 24, ny = 8, z = new Float64Array(nx * ny), tutup = new Uint8Array(nx * ny);
  for (let k = 0; k < z.length; k++) { const i = k % nx, j = (k / nx) | 0; z[k] = 1 - i * .01; if (!j || j === ny - 1 || !i || i === nx - 1) tutup[k] = 1; }
  const J = 10, cfg = {nx, ny, dx: 20, tutup, jam: J, masuk: [{k: 4 * nx + 2, q: new Float64Array(J + 1).fill(2)}]};
  const tg = SG.garisSel([[12, 0], [12, ny - 1]], nx, ny), zt = SG.naikkan(z, tg, 5);
  const tanpa = SG.jalankan({...cfg, z}), dengan = SG.jalankan({...cfg, z: zt});
  const hilir = r => { let v = 0; for (let k = 0; k < nx * ny; k++) if (k % nx > 12) v += r.kedalaman[J * nx * ny + k]; return v; };
  assert.ok(hilir(tanpa) > .1, `tanpa tanggul air harus sampai hilir (${hilir(tanpa)})`);
  assert.equal(hilir(dengan), 0, "dengan tanggul 5 m, hilir harus kering persis");
  assert.ok(dengan.neraca.galat < 1e-6, "neraca tanggul");
});

test("pompa mengurangi volume persis laju x waktu", () => {
  /* sel 30 m: sumur pompa tidak sempat kering (sel 10 m dengan 0,05 m3/dtk sempat kering sesaat dan pompa berhenti, itu benar) */
  const n = 12, dx = 30, z = new Float64Array(n * n), tutup = new Uint8Array(n * n);
  for (let k = 0; k < n * n; k++) { const i = k % n, j = (k / n) | 0; if (!i || !j || i === n - 1 || j === n - 1) tutup[k] = 1; }
  const J = 12, q = .05, cfg = {nx: n, ny: n, dx, z, tutup, jam: J, hujan: jam(J, t => t === 0 ? 800 : 0)};
  const a = SG.jalankan(cfg), b = SG.jalankan({...cfg, pompa: [{k: 5 * n + 5, q, mulai: 2}]}), harap = q * (J - 2) * 3600;
  assert.ok(Math.abs(b.neraca.pompa - harap) / harap < 1e-9, `dipompa ${b.neraca.pompa} m3, harap ${harap} m3`);
  assert.ok(Math.abs(b.neraca.pompaMinta - harap) / harap < 1e-9, "permintaan pompa = laju x waktu");
  assert.ok(Math.abs((a.neraca.simpan - b.neraca.simpan) - harap) / harap < 1e-6, "selisih simpanan harus = laju x waktu");
  const kering = SG.jalankan({...cfg, hujan: jam(J, () => 0), pompa: [{k: 5 * n + 5, q, mulai: 0}]});
  assert.equal(kering.neraca.pompa, 0, "pompa di sel kering tidak boleh membuat air negatif");
  assert.ok(kering.neraca.pompaMinta > 0, "permintaan tetap tercatat supaya layar bisa melapor pompa kering");
});

test("pintu air tertutup menahan pasang masuk", () => {
  const nx = 16, ny = 6, z = new Float64Array(nx * ny);
  for (let k = 0; k < z.length; k++) z[k] = k % nx < 3 ? -3 : .3;
  const laut = SG.topengLaut(z, nx, ny), J = 6, muka = new Float64Array(J + 1).fill(1), cfg = {nx, ny, dx: 20, z, laut, muka, jam: J};
  const buka = SG.jalankan(cfg), tutup = new Uint8Array(nx * ny); for (let k = 0; k < z.length; k++) if (laut[k]) tutup[k] = 1;
  const tut = SG.jalankan({...cfg, tutup});
  assert.ok(buka.neraca.lautMasuk > 0 && buka.luas[J] > 0, "pasang 1 m harus menggenangi daratan 0,3 m");
  assert.equal(tut.neraca.lautMasuk, 0, "pintu tertutup: tidak ada air laut masuk");
});

test("hietograf & SCS-CN: jumlah terjaga, limpasan <= hujan, CN naik = limpasan naik", () => {
  const h = SG.hietograf([{p: 120, jam: 5, imax: 50}, {p: 0}, {p: 7.5, jam: 30, imax: 1}]);
  assert.equal(h.length, 72); const s = d => h.slice(d * 24, d * 24 + 24).reduce((a, x) => a + x, 0);
  assert.ok(Math.abs(s(0) - 120) < 1e-9 && s(1) === 0 && Math.abs(s(2) - 7.5) < 1e-9, "jumlah harian harus persis");
  assert.equal(Math.max(...h.slice(0, 24)), 50, "jam puncak = imax");
  const L70 = SG.limpasan(h, 70), L90 = SG.limpasan(h, 90), Q = L => L.efektif.reduce((a, x) => a + x, 0);
  assert.ok(Q(L70) < Q(L90) && Q(L90) <= 127.5 && L70.efektif.every(x => x >= 0), "limpasan tidak sesuai");
  assert.ok(Math.abs(L90.resap[72] + Q(L90) - 127.5) < 1e-9, "resapan + limpasan = hujan");
  assert.ok(SG.cnAMC(80, 3) > 80 && SG.cnAMC(80, 1) < 80, "AMC III basah, AMC I kering");
});

test("longsor monoton terhadap hujan (kejenuhan) dan kemiringan; datar = 0", () => {
  assert.equal(SL.peluang(0, 1), 0);
  for (let b = 0; b <= 45; b += 2.5) for (let m = 0; m < 1; m += .1) {
    assert.ok(SL.peluang(b, m + .1 > 1 ? 1 : m + .1) >= SL.peluang(b, m) - 1e-12, `tidak monoton kejenuhan di ${b} derajat, m ${m}`);
    assert.ok(SL.peluang(b + 2.5, m) >= SL.peluang(b, m) - 1e-12, `tidak monoton lereng di ${b} derajat, m ${m}`); }
  assert.ok(SL.peluang(40, 1) > .5 && SL.peluang(15, 1) === 0, `nilai ujung tak masuk akal: ${SL.peluang(40, 1)}, ${SL.peluang(15, 1)}`);
  let m0 = 0; for (const r of [0, 20, 60, 150, 400]) { const m = SL.kejenuhan(.25, r); assert.ok(m >= m0 && m <= 1); m0 = m; }
  const n = 10, z = Float64Array.from({length: n * n}, (_, k) => (k % n) * 10), lr = SL.lereng(z, n, n, 10);
  assert.ok(Math.abs(lr[55] - 45) < 1e-6, `lereng 1:1 harus 45 derajat, dapat ${lr[55]}`);
});

test("DEM siap mesin: lubang yang hanya bocor diagonal tidak menjadi perangkap air", () => {
  /* lubang 8 m di tengah, satu-satunya jalan keluar lewat sudut diagonal ke tepi rendah. Dengan Priority-Flood 8-tetangga lubang
     ini dianggap mengalir dan air tertahan 8 m selamanya; siapkanDEM (4-tetangga) membatasinya 0,5 m */
  const n = 7, z = new Float64Array(n * n).fill(10), c = 3 * n + 3; z[c] = 2; z[2 * n + 2] = 1; z[n + 1] = 0; z[0] = -1;
  const b = tepiSemua(n, n), zs = SG.siapkanDEM(z, n, n, b);
  assert.ok(Math.abs(zs[c] - (10 - SG.ASUMSI.CEKUNGAN_MAKS)) < 1e-3, `dasar lubang ${zs[c]} m, harus ${10 - SG.ASUMSI.CEKUNGAN_MAKS} m`);
  const J = 6; /* tepi terbuka bawaan; hujan 100 mm jam pertama */
  const r = SG.jalankan({nx: n, ny: n, dx: 30, z: zs, jam: J, hujan: jam(J, t => t === 0 ? 100 : 0)});
  /* invarian: muka air di lubang tidak di atas ambang luap 10 m lebih dari lapisan aliran tipis (1 cm); tanpa perbaikan muka
     air tertahan di ~10 m dengan dasar 2 m (kedalaman 8 m) */
  const muka = zs[c] + r.kedalaman[J * n * n + c];
  assert.ok(muka <= 10.01, `muka air di lubang ${muka.toFixed(4)} m di atas ambang luap 10 m`);
  assert.ok(r.kedalaman[J * n * n + c] < 1, `air di lubang ${r.kedalaman[J * n * n + c]} m: lubang menjadi perangkap`);
  const r8 = SG.jalankan({nx: n, ny: n, dx: 30, z: SG.batasiCekungan(z, SG.isiCekungan(z, n, n, b), .5), jam: J, hujan: jam(J, t => t === 0 ? 100 : 0)});
  assert.ok(r8.kedalaman[J * n * n + c] > 1, "pembanding 8-tetangga harus menampakkan perangkap (uji ini bermakna)");
});

test("longsor: tanpa hujan di lereng 30 derajat indeks 0; kejenuhan dihitung di atas kapasitas lapang", () => {
  const a = SL.ASUMSI, m0 = SL.kejenuhan(a.THETA0, 0);
  assert.equal(m0, 0, `tanah pada kapasitas lapang tanpa hujan harus m = 0, dapat ${m0}`);
  assert.equal(SL.peluang(30, m0), 0, `hujan 0 mm di lereng 30 derajat harus 0, dapat ${SL.peluang(30, m0)}`);
  assert.equal(SL.kejenuhan(.1, 50), 0, "tanah kering + 50 mm belum melewati kapasitas lapang");
  const isi = (a.PORI - a.THETA_FC) * a.TEBAL * 1000; /* mm untuk jenuh penuh dari kapasitas lapang */
  assert.ok(Math.abs(SL.kejenuhan(a.THETA_FC, isi) - 1) < 1e-12 && Math.abs(SL.kejenuhan(a.THETA_FC, isi / 2) - .5) < 1e-12, "kejenuhan linier terhadap resapan");
});

test("sungai: debit besar tetap stabil dan tak bergantung alfa (CFL memuat suntikan)", () => {
  const nx = 20, ny = 12, z = new Float64Array(nx * ny);
  for (let k = 0; k < z.length; k++) z[k] = (k % nx) * .05 + Math.abs(((k / nx) | 0) - 6) * .3;
  const J = 6, q = new Float64Array(J + 1).fill(400), cfg = {nx, ny, dx: 50, z, jam: J, masuk: [{k: 6 * nx + 18, q}]};
  const a = SG.jalankan(cfg), b = SG.jalankan({...cfg, alfa: .35});
  for (const r of [a, b]) { assert.ok(r.neraca.galat < 1e-9, `galat ${r.neraca.galat}`); assert.ok(r.hmaks.every(Number.isFinite), "kedalaman tak hingga"); }
  const ma = Math.max(...a.hmaks), mb = Math.max(...b.hmaks), la = a.luas[J], lb = b.luas[J];
  assert.ok(Math.abs(ma - mb) / mb < .1, `kedalaman maks alfa 0,7 ${ma.toFixed(2)} m vs alfa 0,35 ${mb.toFixed(2)} m beda > 10 %`);
  assert.ok(Math.abs(la - lb) / lb < .1, `luas jam 6 beda > 10 %: ${la} vs ${lb}`);
});

test("pintu tertutup tidak menampung hujan; sel sudut tidak membuang dua kali", () => {
  const n = 6, z = new Float64Array(n * n), tutup = new Uint8Array(n * n); tutup[0] = 1;
  const r = SG.jalankan({nx: n, ny: n, dx: 10, z, tutup, jam: 2, hujan: new Float64Array([50, 0])});
  assert.equal(r.kedalaman[2 * n * n], 0, "sel pintu tertutup harus kering");
  assert.ok(Math.abs(r.neraca.hujan - .05 * 100 * (n * n - 1)) < 1e-6, `hujan hanya di ${n * n - 1} sel: ${r.neraca.hujan}`);
  /* sel sudut dan sel tepi biasa, masing-masing terkurung dinding (pintu tertutup) di dalam: hanya keluar lewat tepi kisi.
     Bila sudut dihitung dua kali ia kosong dua kali lebih cepat */
  const w = new Uint8Array(n * n).fill(1), sd = n * n - 1, tp = (n - 1) * n + 2; w[sd] = 0; w[tp] = 0;
  const s = SG.jalankan({nx: n, ny: n, dx: 10, z, tutup: w, jam: 2, hujan: new Float64Array([100, 0]), manning: .3});
  const kd = s.kedalaman.subarray(2 * n * n);
  assert.ok(kd[tp] > .001 && Math.abs(kd[sd] - kd[tp]) / kd[tp] < .02, `sudut ${kd[sd]} m vs tepi ${kd[tp]} m: sudut dihitung dua kali`);
});

test("masukan rusak ditolak", () => {
  const z = new Float64Array(16), ok = {nx: 4, ny: 4, dx: 10, z, jam: 2};
  const tolak = (cfg, pola) => assert.throws(() => SG.jalankan(cfg), pola);
  tolak({...ok, z: new Float64Array(15)}, /panjang DEM/);
  tolak({...ok, z: Float64Array.from(z, (_, k) => k === 3 ? NaN : 0)}, /bukan angka/);
  tolak({...ok, dx: 0}, /dx/);
  tolak({...ok, nx: 2, ny: 8}, /ukuran kisi/);
  tolak({...ok, hujan: new Float64Array([1, -1])}, /negatif/);
  tolak({...ok, pompa: [{k: 99, q: 1}]}, /di luar kisi/);
  tolak({...ok, pompa: [{k: 5, q: -1}]}, /negatif/);
  tolak({...ok, laut: Uint8Array.from(z, (_, k) => k === 0)}, /muka laut/);
  tolak({...ok, masuk: [{k: 5, q: new Float64Array(1)}]}, /tidak lengkap/);
  assert.throws(() => SG.limpasan(new Float64Array(3), 120), /CN/);
  assert.throws(() => SG.hietograf([{p: -5}]), /negatif/);
  assert.throws(() => SG.rencanaKisi(95, 110, 5000, 100), /lintang/);
  assert.throws(() => SG.rencanaKisi(-6, 106, 100, 100), /sisi/);
  assert.throws(() => SG.naikkan(z, new Uint8Array(16), -1), /negatif/);
  assert.throws(() => SL.peluang(30, 1.5), /jangkauan/);
  assert.throws(() => SL.kejenuhan(.3, -1), /negatif/);
});

test("kisi DEM: sudut dan sel saling balik", () => {
  const K = SG.rencanaKisi(-6.2, 106.8, 6000, 120);
  assert.ok(K.zoom >= 10 && K.zoom <= 13 && Math.abs(K.dx - 50) < 1e-9);
  const [i, j] = SG.keSel(K, 106.8, -6.2); assert.ok(Math.abs(i - 59.5) < 1e-6 && Math.abs(j - 59.5) < 1e-6, `pusat ${i},${j}`);
  const [lo, la] = SG.dariSel(K, 10, 20), [i2, j2] = SG.keSel(K, lo, la); assert.ok(Math.abs(i2 - 10) < 1e-6 && Math.abs(j2 - 20) < 1e-6);
  const d = Math.abs(K.sudut[1][0] - K.sudut[0][0]) * 111320 * Math.cos(6.2 * Math.PI / 180); assert.ok(Math.abs(d - 6000) / 6000 < .01, `lebar ${d} m`);
});
