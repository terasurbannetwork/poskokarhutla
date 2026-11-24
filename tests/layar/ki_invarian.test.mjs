// KI-44: invarian fisik tiga mesin simulasi. Bukan potret angka: sifat yang harus benar selamanya.
//   1. Karhutla (public/index.html: tabelLaju, sebar): laju >= 0, naik bila angin naik / bahan kering, elips memanjang, waktu tiba tak turun ke luar.
//   2. Longsor (public/banjir/sim_longsor.js, lereng tak-hingga): FS turun bila kejenuhan atau lereng naik; peluang FS<1 naik searah.
//   3. Genangan (public/banjir/sim_genangan.js, BEKU J4: hanya dimuat): massa kekal, kedalaman tak negatif.
// Bila invarian gagal di kode nyata, uji MERAH dan pemilik berkas membetulkan mesinnya; uji tidak dilonggarkan.
import {test} from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const baca = p => readFileSync(`${AKAR}${p}`, "utf8");
// berkas public/ berformat CommonJS tetapi package.json bertipe module: muat lewat vm dengan `module` buatan
const muat = p => { const module = {exports: {}}; vm.runInNewContext(baca(p), {module, Math, Float64Array, Float32Array, Uint8Array, Uint16Array, Uint32Array, Int32Array, Number, Error, Object, Array}, {filename: p}); assert.ok(Object.keys(module.exports).length, `${p} tidak mengekspor apa pun`); return module.exports; };
// pelanggaran invarian = merah; temuan tidak ditampung sebagai todo (gerbang tidak boleh dilonggarkan)
const cek = (nama, fn) => test(nama, fn);

// ---------------------------------------------------------------- 1. karhutla
const html = baca("public/index.html"), a = html.indexOf("const CURING"), b = html.indexOf("const BBF = new WeakMap");
assert.ok(a > 0 && b > a, "jangkar `const CURING` / `const BBF` hilang dari public/index.html: mesin sebaran pindah, perbarui uji KI-44");
const M = new Function(`${html.slice(a, b)}\nreturn {BAHAN, FUEL, NF, idB, tabelLaju, sebar};`)();
const JAM = 73, seri = v => new Array(JAM).fill(v);
const W = (ws, F, wd = 270, bahan = "rumput") => ({ws: seri(ws), F: seri(F), wd: seri(wd), utama: M.idB(bahan)});
const kepala = (tab, f) => tab[(0 * M.NF + f) * 16 + 0];   // arah 0 = (+1,0); wd 270 = angin dari barat, api ke timur
const flank = (tab, f) => Math.max(tab[f * 16 + 2], tab[f * 16 + 6]);
const ANGIN = [0, 1, 2, 4, 6, 8, 12, 16, 24, 32, 40, 45, 60, 80], FFMC = [60, 70, 80, 85, 88, 90, 92, 94, 96, 98, 100];

cek("karhutla: laju tiap arah/jam/bahan >= 0 dan terhingga (semua bahan, angin 0-80, FFMC 60-100, BUI 0 dan 60)", () => {
  for (const bui of [0, 60]) for (const ws of ANGIN) for (const F of FFMC) { const tab = M.tabelLaju(W(ws, F), bui);
    for (let i = 0; i < tab.length; i++) assert.ok(tab[i] >= 0 && Number.isFinite(tab[i]), `laju ${tab[i]} di indeks ${i} (angin ${ws}, FFMC ${F}, BUI ${bui}): laju negatif/NaN`); }
});
cek("karhutla: laju kepala api naik (tak turun) bila angin naik, FFMC dan BUI tetap, tiap bahan", () => {
  for (const bahan of Object.keys(M.BAHAN)) for (const F of [80, 90, 96]) for (const bui of [0, 40]) { let lalu = -1;
    for (const ws of ANGIN) { const v = kepala(M.tabelLaju(W(ws, F, 270, bahan), bui), M.idB(bahan));
      assert.ok(v >= lalu - 1e-9, `${bahan} FFMC ${F} BUI ${bui}: angin ${ws} km/j memberi ${v} < ${lalu} pada angin lebih pelan`); lalu = v; } }
});
cek("karhutla: laju kepala api naik (tak turun) bila kadar air bahan turun (FFMC naik), angin tetap", () => {
  for (const bahan of Object.keys(M.BAHAN)) for (const ws of [2, 10, 25]) { let lalu = -1;
    for (const F of FFMC) { const v = kepala(M.tabelLaju(W(ws, F, 270, bahan), 30), M.idB(bahan));
      assert.ok(v >= lalu - 1e-9, `${bahan} angin ${ws}: FFMC ${F} memberi ${v} < ${lalu} pada FFMC lebih rendah (bahan lebih kering melaju lebih pelan)`); lalu = v; } }
});
cek("karhutla: elips memanjang (kepala >= samping; p/l >= 1) dan arah kepala = arah angin, tiap bahan dan angin", () => {
  for (const bahan of Object.keys(M.BAHAN)) for (const ws of ANGIN.slice(1)) { const tab = M.tabelLaju(W(ws, 92, 270, bahan), 30), f = M.idB(bahan);
    assert.ok(kepala(tab, f) >= flank(tab, f) - 1e-9, `${bahan} angin ${ws}: kepala ${kepala(tab, f)} < samping ${flank(tab, f)} (p/l < 1)`);
    for (let q = 0; q < 16; q++) assert.ok(kepala(tab, f) >= tab[f * 16 + q] - 1e-9, `${bahan} angin ${ws}: arah ${q} lebih cepat dari arah angin`); }
});
{ // waktu tiba: kisi seragam, angin konstan, satu benih di tengah
  const n = 41, d = 30, c = 20 * n + 20;
  const kisi = (ws, bahan = "rumput") => { const tab = M.tabelLaju(W(ws, 92, 270, bahan), 30), fuel = new Uint8Array(n * n).fill(M.idB(bahan));
    return M.sebar({n, d, benih: [c], gb: new Uint8Array(n * n)}, tab, fuel, new Array(72).fill(0), {mult: 1, tMax: 72}); };
  for (const ws of [0, 5, 15]) cek(`karhutla: sebar (angin ${ws}): benih t=0, t >= 0, tiap sel terbakar punya tetangga yang lebih awal, sinar dari benih tak turun`, () => {
    const {T} = kisi(ws); assert.equal(T[c], 0, "benih harus t=0");
    let hingga = 0; for (let k = 0; k < n * n; k++) { if (!Number.isFinite(T[k])) continue; hingga++; assert.ok(T[k] >= 0, `T[${k}]=${T[k]} negatif`);
      if (k === c) continue; const i = k % n, j = (k / n) | 0; let adaPendahulu = false;
      for (let di = -2; di <= 2 && !adaPendahulu; di++) for (let dj = -2; dj <= 2; dj++) { if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue; if (T[jj * n + ii] <= T[k]) { adaPendahulu = true; break; } }
      assert.ok(adaPendahulu, `sel ${k} (t=${T[k]}) tak punya tetangga yang lebih awal: waktu tiba tidak merambat dari benih`); }
    assert.ok(hingga > 20, `hanya ${hingga} sel terbakar: uji tak bermakna (api tak menyebar dalam 72 jam)`);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { let lalu = 0;
      for (let s = 1; s <= 20; s++) { const t = T[(20 + dj * s) * n + 20 + di * s]; if (!Number.isFinite(t)) break; assert.ok(t >= lalu - 1e-9, `sinar (${di},${dj}) langkah ${s}: t=${t} < ${lalu} (waktu tiba turun ke luar)`); lalu = t; } } });
  cek("karhutla: angin kuat membuat api tiba lebih cepat di hilir (timur) daripada di hulu (barat)", () => {
    const {T} = kisi(15), hilir = T[20 * n + 30], hulu = T[20 * n + 10]; assert.ok(hilir < hulu, `hilir ${hilir} jam >= hulu ${hulu} jam`); });
}

// ---------------------------------------------------------------- 2. longsor
const L = muat("public/banjir/sim_longsor.js"), AS = L.ASUMSI;
// FS tepat untuk satu (c', phi): rumus dokumen di kepala sim_longsor.js (Hammond dkk. 1992), bukan salinan kode peluang()
const FS = (beta, m, c = 5, phi = 30) => { const b = beta * Math.PI / 180; return (c + (AS.GS - m * AS.GW) * AS.TEBAL * Math.cos(b) ** 2 * Math.tan(phi * Math.PI / 180)) / (AS.GS * AS.TEBAL * Math.sin(b) * Math.cos(b)); };
const LERENG = Array.from({length: 45}, (_, i) => i + 1), MM = Array.from({length: 21}, (_, i) => i / 20);
cek("longsor: FS turun bila kejenuhan m naik (semua lereng 1-45, kohesi dan sudut gesek sepanjang rentang ASUMSI)", () => {
  for (const c of [AS.C[0], AS.C[1]]) for (const phi of [AS.PHI[0], AS.PHI[1]]) for (const be of LERENG) { let lalu = Infinity;
    for (const m of MM) { const f = FS(be, m, c, phi); assert.ok(Number.isFinite(f), `FS ${f} tak terhingga/NaN (lereng ${be}, m ${m})`); assert.ok(f <= lalu + 1e-12, `lereng ${be} c ${c} phi ${phi}: FS ${f} naik saat m naik ke ${m} (sebelumnya ${lalu})`); lalu = f; } }
});
cek("longsor: FS turun bila lereng naik (1-45 derajat, rentang ASUMSI)", () => {
  for (const m of MM) for (const c of AS.C) for (const phi of AS.PHI) { let lalu = Infinity; for (const be of LERENG) { const f = FS(be, m, c, phi); assert.ok(f <= lalu + 1e-12, `m ${m} c ${c} phi ${phi}: FS ${f} naik saat lereng naik ke ${be} (sebelumnya ${lalu})`); lalu = f; } }
});
cek("longsor: peluang(beta, m) = bagian ruang (c', phi) dengan FS<1 ada di [0,1], naik bila m naik, naik bila lereng naik (sampai BETA_MAKS)", () => {
  for (const be of LERENG) { let lalu = -1; for (const m of MM) { const p = L.peluang(be, m); assert.ok(p >= 0 && p <= 1 && Number.isFinite(p), `peluang ${p} di luar [0,1] (lereng ${be}, m ${m})`); assert.ok(p >= lalu - 1e-12, `lereng ${be}: peluang ${p} turun saat m naik ke ${m} (sebelumnya ${lalu})`); lalu = p; } }
  for (const m of MM) { let lalu = -1; for (const be of LERENG) { const p = L.peluang(be, m); assert.ok(p >= lalu - 1e-12, `m ${m}: peluang ${p} turun saat lereng naik ke ${be} (sebelumnya ${lalu})`); lalu = p; } }
  assert.equal(L.peluang(0, 1), 0, "bidang datar tidak boleh longsor");
});
cek("longsor: kejenuhan m di [0,1] dan naik bila hujan anteseden atau resapan naik; tolak masukan negatif/NaN", () => {
  for (const basah of [false, true]) for (const r of [0, 20, 100]) { let lalu = -1; for (const a7 of [0, 10, 25, 50, 100, 200, 400, 1000]) { const m = L.kejenuhan(a7, r, basah); assert.ok(m >= 0 && m <= 1, `m ${m} di luar [0,1]`); assert.ok(m >= lalu - 1e-12, `a7 ${a7}: m ${m} turun (sebelumnya ${lalu})`); lalu = m; } }
  for (const a7 of [0, 30, 150]) { let lalu = -1; for (const r of [0, 5, 20, 80, 300]) { const m = L.kejenuhan(a7, r); assert.ok(m >= lalu - 1e-12, `resapan ${r}: m ${m} turun`); lalu = m; } }
  assert.throws(() => L.kejenuhan(-1, 0), /negatif/); assert.throws(() => L.peluang(10, NaN), /bukan angka/); assert.throws(() => L.peluang(10, 1.2), /di luar/);
});

// ---------------------------------------------------------------- 3. genangan (BEKU, hanya dimuat)
const G = muat("public/banjir/sim_genangan.js");
const mangkuk = n => { const z = new Float64Array(n * n), t = (n - 1) / 2; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) z[j * n + i] = 10 + 0.002 * Math.hypot(i - t, j - t) ** 2; return z; };
const dinding = n => { const t = new Uint8Array(n * n); for (let i = 0; i < n; i++) t[i] = t[(n - 1) * n + i] = t[i * n] = t[i * n + n - 1] = 1; return t; };
const cekDalam = (h, nama) => { assert.ok(h.kedalaman.every(v => Number.isFinite(v) && v >= 0), `${nama}: ada kedalaman negatif/NaN`); assert.ok(h.hmaks.every(v => v >= 0 && Number.isFinite(v)), `${nama}: hmaks negatif/NaN`); };
cek("genangan: kolam tertutup (dinding tutup), hujan lalu kering: volume tersimpan = hujan masuk (massa kekal), keluar = 0, kedalaman >= 0", () => {
  const n = 14, J = 12, hujan = new Float64Array(J); hujan[0] = 40; hujan[1] = 25;
  const h = G.jalankan({nx: n, ny: n, dx: 30, z: mangkuk(n), tutup: dinding(n), hujan, jam: J}); cekDalam(h, "kolam");
  const e = h.neraca, hujanM3 = 65 / 1000 * 30 * 30 * (n - 2) ** 2;
  assert.ok(Math.abs(e.hujan - hujanM3) / hujanM3 < 1e-9, `volume hujan neraca ${e.hujan} != ${hujanM3} m3 (hujan diterima mesin salah)`);
  assert.equal(e.keluar, 0, `kolam tertutup melepas ${e.keluar} m3`);
  assert.ok(Math.abs(e.simpan - e.hujan) / e.hujan < 1e-6, `air tersimpan ${e.simpan} != hujan ${e.hujan} m3: massa bocor atau tercipta`);
  assert.ok(e.galat < 1e-6, `galat neraca ${e.galat}`);
});
cek("genangan: tepi terbuka dengan hujan: masuk = tersimpan + keluar (galat neraca < 1e-6) dan kedalaman >= 0, di kisi miring dan mangkuk", () => {
  const n = 16, N = n * n, J = 24, hujan = new Float64Array(J).map((_, t) => t < 6 ? 30 : 0), miring = new Float64Array(N);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) miring[j * n + i] = 20 - 0.01 * i - 0.005 * j;
  for (const [nama, z] of [["miring", miring], ["mangkuk", mangkuk(n)]]) { const h = G.jalankan({nx: n, ny: n, dx: 30, z, hujan, jam: J}); cekDalam(h, nama);
    const e = h.neraca; assert.ok(e.hujan > 0, `${nama}: hujan tak tercatat`); assert.ok(e.galat < 1e-6, `${nama}: galat neraca ${e.galat} (masuk ${e.masuk}, keluar ${e.keluar}, simpan ${e.simpan})`);
    assert.ok(Math.abs(e.masuk - e.keluar - e.simpan) <= 1e-6 * e.masuk, `${nama}: masuk-keluar != simpan`); }
});
cek("genangan: aliran sungai masuk dengan tepi tertutup: air tersimpan = debit x waktu; tanpa masukan sama sekali tak ada air", () => {
  const n = 14, J = 6, q = new Float64Array(J + 1).fill(2), kosong = G.jalankan({nx: n, ny: n, dx: 30, z: mangkuk(n), tutup: dinding(n), jam: J});
  assert.ok(kosong.kedalaman.every(v => v === 0) && kosong.neraca.simpan === 0, "tanpa hujan/masukan muncul air");
  const h = G.jalankan({nx: n, ny: n, dx: 30, z: mangkuk(n), tutup: dinding(n), masuk: [{k: 7 * n + 7, q}], jam: J}); cekDalam(h, "sungai");
  const ekspektasi = 2 * J * 3600; assert.ok(Math.abs(h.neraca.simpan - ekspektasi) / ekspektasi < 1e-6, `tersimpan ${h.neraca.simpan} != ${ekspektasi} m3`);
});
