/* Uji fungsi murni public/gunungapi/sim_lahar.js tanpa peramban: node scripts/gunungapi/uji_lahar.mjs
   DEM sintetis: kerucut + satu lembah terkarang ke timur + dataran 100 m di luar kerucut. */
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
  const r = Math.hypot(x - C, y - C); let z = Math.max(100, PUNCAK - 12 * r);
  if (x > C) z -= 40 * Math.exp(-(((y - C) / 5) ** 2)) * Math.min(1, (x - C) / 3); /* lembah ke timur, mulai dari bukaan kawah */
  return z;
});
const jalan = (V, hl, maxJalur = 1) => L.simulasi({dem: kerucut, n: N, m: N, z: Z, lat: LAT, pusat: [C, C], V, hl, maxJalur, proksimal: 0.5, ambangHulu: 0}); /* mekanik lahar saja: kerucut uji lereng 0,31 > batas, jadi zona proksimal dan ambang hulu dimatikan; jalur produksi diuji di bawah (kerucutCuram, opsi bawaan) */
const panjangPx = r => Math.max(...[...r.lahar.idx].map(i => i % N)) - C;

uji("jalur utama mengikuti lembah", () => {
  const r = jalan(1e6, 0.3), P = r.jalur[0].titik.filter(([x]) => x > C + 25 && x < C + 150);
  assert.ok(P.length > 10, "jalur utama harus lewat timur kawah, ada " + P.length + " titik");
  const sim = Math.max(...P.map(([, y]) => Math.abs(y - C)));
  assert.ok(sim <= 4, `jalur menyimpang ${sim} sel dari sumbu lembah (batas 4)`);
});
uji("lahar: luas planimetrik ~ B LAHARZ dan menyempit di lembah", () => {
  for (const V of [3e4, 1e5]) {
    const r = jalan(V, 0.3), {B} = L.laharz(V), luas = r.ringkas.lahar_km2 * 1e6;
    assert.ok(luas >= B * 0.8 && luas <= B * 1.0001, `V=${V}: luas ${Math.round(luas)} m2 di luar 0,8-1,0001 x B (${Math.round(B)}); luas dipotong tepat di B`);
    const lebar = new Map(); for (const i of r.lahar.idx) { const x = i % N; if (x > C + 30) lebar.set(x, (lebar.get(x) || 0) + 1); }
    assert.ok(Math.max(...lebar.values()) <= 30, `V=${V}: lahar melebar ${Math.max(...lebar.values())} sel pada satu kolom, harus tetap di lembah`);
    const ys = [...r.lahar.idx].filter(i => i % N > C + 30).map(i => Math.abs(((i / N) | 0) - C)); assert.ok(Math.max(...ys) <= 15, `lahar keluar lembah sejauh ${Math.max(...ys)} sel`);
  }
});
uji("penampang LAHARZ A = 0,05 V^(2/3) dipakai di jalur (A terukur ~ A)", () => {
  for (const V of [3e4, 1e5]) {
    const i = jalan(V, 0.3).info[0], A = L.laharz(V).A;
    assert.ok(Math.abs(i.A_m2 - A) < 1e-9, `V=${V}: A=${i.A_m2} bukan 0,05 V^(2/3)=${A}`);
    assert.ok(i.A_ukur_m2 > 0, `V=${V}: tak ada langkah penampang yang terukur`);
    assert.ok(Math.abs(i.A_ukur_m2 / A - 1) < 0.1, `V=${V}: penampang terukur rata-rata ${Math.round(i.A_ukur_m2)} m2 menyimpang >10% dari A=${Math.round(A)}`);
  }
});
uji("volume terjaga: luas total semua jalur ~ B(V), bukan jumlah B per bagian volume", () => {
  const V = 1e5, B = L.laharz(V).B, r = L.simulasi({dem: kerucut, n: N, m: N, z: Z, lat: LAT, pusat: [C + 2, C - 1], V, hl: 0.3, proksimal: 0.5, ambangHulu: 0}), luas = r.ringkas.lahar_km2 * 1e6;
  assert.ok(r.info.length > 1, "uji ini butuh lebih dari satu jalur, ada " + r.info.length);
  assert.ok(luas <= B * 1.0001, `luas total ${Math.round(luas)} m2 melebihi B(V)=${Math.round(B)} (rasio ${(luas / B).toFixed(4)}); pembagian volume menggelembungkan luas`);
  for (const i of r.info) assert.ok(i.lahar_km2 * 1e6 <= i.B_m2 * 1.0001, `jalur bobot ${i.bobot}: luas ${Math.round(i.lahar_km2 * 1e6)} m2 melebihi B jalur ${Math.round(i.B_m2)}`);
  const jumlahB = r.info.reduce((a, i) => a + i.B_m2, 0); assert.ok(Math.abs(jumlahB / B - 1) < 1e-9, `jumlah B per jalur ${jumlahB} != B(V) ${B}`);
});
const laut = jml(N, N, (x, y) => x > C + 120 ? 0 : kerucut[y * N + x]); /* sama dengan kerucut, tetapi pantai di x > C+120 */
uji("lahar berhenti sesuai volume: jarak(1e5) > jarak(3e4) > jarak(1e4), berhenti karena B, bukan tepi", () => {
  const Vs = [1e4, 3e4, 1e5], r = Vs.map(V => jalan(V, 0.3)), px = r.map(panjangPx);
  console.log("        jarak lahar (sel / km):", Vs.map((V, i) => `${V}: ${px[i]} / ${r[i].ringkas.lahar_km.toFixed(2)}`).join("  |  "));
  r.forEach((x, i) => assert.equal(x.info[0].berhenti, "B", `V=${Vs[i]}: berhenti oleh '${x.info[0].berhenti}', seharusnya 'B' (lembah cukup panjang)`));
  for (let i = 1; i < px.length; i++) assert.ok(px[i] > px[i - 1], `jarak tidak bertambah: V=${Vs[i]} (${px[i]} sel) <= V=${Vs[i - 1]} (${px[i - 1]} sel)`);
  assert.ok(px[2] < N - 1 - C - 10, `lahar 1e5 sampai tepi peta (${px[2]} sel)`);
  const rr = r[2], maks = Math.max(...rr.lahar.s); assert.ok(Math.abs(maks - rr.ringkas.lahar_km * 1000) < 100, "jarak depan lahar harus cocok dgn ringkasan");
  assert.ok(rr.lahar.s.every((v, i, s) => !i || s[i - 1] <= v), "sel lahar harus terurut menurut jarak (untuk animasi maju)");
});
uji("penyebab berhenti tercatat di info: B, tepi, laut", () => {
  const ada = new Set(["B", "tepi", "laut", "sink", "tak ada zona lahar"]);
  const opsi = dem => ({dem, n: N, m: N, z: Z, lat: LAT, pusat: [C, C], hl: 0.3, maxJalur: 1, proksimal: 0.5, ambangHulu: 0});
  const b = L.simulasi({...opsi(kerucut), V: 1e5}).info[0].berhenti, tepi = L.simulasi({...opsi(kerucut), V: 1e8}).info[0].berhenti, lt = L.simulasi({...opsi(laut), V: 1e8}).info[0].berhenti;
  assert.ok([b, tepi, lt].every(x => ada.has(x)), `penyebab di luar daftar: ${[b, tepi, lt]}`);
  assert.equal(b, "B", "volume kecil di lembah panjang harus berhenti karena B");
  assert.equal(tepi, "tepi", "volume sangat besar di lembah yang berakhir di tepi peta harus 'tepi'");
  assert.equal(lt, "laut", "volume sangat besar di lembah yang bermuara ke laut harus 'laut'");
});
uji("awan panas: H/L kecil lebih jauh, tidak melewati kerucut energi, ikut lembah", () => {
  const dx = L.mPerPx(LAT, Z);
  const jauh = {}; for (const hl of [0.2, 0.35]) { const r = jalan(1e5, hl); jauh[hl] = r.ringkas.pdc_km; assert.ok(r.pdc.idx.length > 0, `H/L ${hl}: tak ada sel awan panas`);
    assert.ok(r.ringkas.pdc_km * 1000 <= PUNCAK / hl + 2 * dx, `H/L ${hl}: jangkauan ${r.ringkas.pdc_km} km melewati H/L (${PUNCAK / hl / 1000} km)`);
    for (const i of r.pdc.idx) { const d = Math.hypot(i % N - C, ((i / N) | 0) - C) * dx; assert.ok((PUNCAK - kerucut[i]) / d >= hl - 1e-6, `sel ${i} di luar kerucut energi`); } }
  assert.ok(jauh[0.2] > jauh[0.35], `H/L 0,2 (${jauh[0.2]} km) harus lebih jauh dari 0,35 (${jauh[0.35]} km)`);
  const r = jalan(1e5, 0.2); const ys = [...r.pdc.idx].filter(i => i % N > C + 30).map(i => Math.abs(((i / N) | 0) - C)); assert.ok(!ys.length || Math.max(...ys) <= 12, "awan panas menyebar keluar lembah");
});
/* kelas bug "pita/kipas lurus": tebal tetap 15 m disapukan sepanjang garis kontur di lereng terbuka (hasil nyata Semeru: 11.157 sel awan panas, satu jalur) */
const tetangga4 = (set, i) => set.has(i - 1) || set.has(i + 1) || set.has(i - N) || set.has(i + N);
uji("awan panas: >= 80% sel di dalam lembah, tanpa kipas dan tanpa pola sel berselang", () => {
  const r = jalan(1e5, 0.2), sel = [...r.pdc.idx], himp = new Set(sel);
  const dalam = sel.filter(i => Math.abs(((i / N) | 0) - C) <= 10).length;
  assert.ok(sel.length > 50, "terlalu sedikit sel awan panas: " + sel.length);
  assert.ok(dalam / sel.length >= 0.8, `hanya ${(100 * dalam / sel.length).toFixed(0)}% sel awan panas dalam +-10 sel dari sumbu lembah (butuh >= 80%)`);
  const bertetangga = sel.filter(i => tetangga4(himp, i)).length;
  assert.ok(bertetangga / sel.length >= 0.95, `${sel.length - bertetangga} dari ${sel.length} sel awan panas terisolasi (tanpa tetangga 4-arah): pola garis berselang`);
});
uji("awan panas di lereng terbuka (tanpa lembah) hanya melebar secara kerucut, bukan menyapu garis kontur", () => {
  const polos = jml(N, N, (x, y) => Math.max(100, PUNCAK - 12 * Math.hypot(x - C, y - C)));
  const r = L.simulasi({dem: polos, n: N, m: N, z: Z, lat: LAT, pusat: [C, C], V: 1e5, hl: 0.2}), dx = L.mPerPx(LAT, Z);
  const batas = r.info.reduce((a, i) => a + 0.3 * (i.pdc_km * 1000 / dx) ** 2, 0) + 50 * r.info.length;
  assert.ok(r.pdc.idx.length > 0 && r.pdc.idx.length <= batas, `${r.pdc.idx.length} sel awan panas di lereng terbuka melebihi batas lidah ${Math.round(batas)} (menyapu kontur?)`);
});
uji("indeks sel <-> lon/lat konsisten: puncak = sel tertinggi dan pusat sel bolak-balik", () => {
  const r = jalan(1e5, 0.3), [px, py] = r.puncak, i = py * N + px; assert.equal(kerucut[i], kerucut.reduce((a, v) => Math.max(a, v), 0), "sel puncak bukan sel tertinggi");
  for (const idx of [...r.pdc.idx.slice(0, 50), ...r.lahar.idx.slice(0, 50)]) { const x = idx % N, y = (idx / N) | 0, [lon, lat] = L.pxKeLL(Z, 1000 + x + .5, 2000 + y + .5), [gx, gy] = L.llKePx(Z, lon, lat);
    assert.ok(Math.abs(gx - 1000 - x - .5) < 1e-6 && Math.abs(gy - 2000 - y - .5) < 1e-6, `sel ${x},${y} tidak bolak-balik: ${gx - 1000},${gy - 2000}`); }
});
/* ---- jalur PRODUKSI (opsi bawaan: proksimal H/L 0,2 dan ambang hulu 0,5 km2), bukan mekanik dengan zona dimatikan ---- */
/* kelas bug "lahar mulai di kawah": H/L di sel pertama jalur selalu ~0 (turunnya belum ada), jadi syarat "H/L <= batas" langsung terpenuhi */
const curam = jml(N, N, (x, y) => { const r = Math.hypot(x - C, y - C); let z = Math.max(100, PUNCAK - 12 * Math.min(r, 60) - 2 * Math.max(0, r - 60)); /* lereng 0,31 sampai r=60 sel, lalu 0,05; lembah dalam supaya aliran mengumpul */
  if (x > C) z -= 120 * Math.exp(-(((y - C) / 6) ** 2)) * Math.min(1, (x - C) / 3); return z; });
const produksi = (V, maxJalur = 5, dem = curam) => L.simulasi({dem, n: N, m: N, z: Z, lat: LAT, pusat: [C, C], V, hl: 0.3, maxJalur});
uji("produksi (bawaan): lahar mulai di awal_alur (> 0), bukan di kawah dan bukan menunggu zona proksimal", () => {
  const r = produksi(1e4, 1), dx = L.mPerPx(LAT, Z), [px, py] = r.puncak, i = r.info[0];
  assert.ok(i.awal_km > 0 && i.hulu_km > 0, `awal harus > 0: awal ${i.awal_km} km, hulu ${i.hulu_km} km`);
  assert.equal(i.proksimal_km, 0, "proksimal bawaan harus mati"); assert.ok(Math.abs(i.awal_km - i.hulu_km) < 1e-9, "awal harus = titik hulu alur");
  const dekat = [...r.lahar.idx].map(k => Math.hypot(k % N - px, ((k / N) | 0) - py)).sort((a, b) => a - b)[0];
  assert.ok(r.lahar.idx.length > 0 && dekat * dx / 1000 >= i.awal_lurus_km - 0.1, `sel lahar terdekat ${(dekat * dx / 1000).toFixed(2)} km < awal ${i.awal_lurus_km.toFixed(2)} km`);
  assert.ok(i.awal_lurus_km < 4.5, `awal ${i.awal_lurus_km.toFixed(1)} km harus di dalam zona proksimal H/L 0,2 (~4,9 km): lahar hujan mulai di lereng atas`);
});
uji("proksimal eksplisit (mode LAHARZ klasik, H/L 0,2): lahar mulai sesudah zona proksimal, tak ada sel di dekat kawah", () => {
  const r = L.simulasi({dem: curam, n: N, m: N, z: Z, lat: LAT, pusat: [C, C], V: 1e4, hl: 0.3, maxJalur: 1, proksimal: 0.2}), dx = L.mPerPx(LAT, Z), [px, py] = r.puncak, i = r.info[0];
  const dekat = [...r.lahar.idx].map(k => Math.hypot(k % N - px, ((k / N) | 0) - py)).sort((a, b) => a - b)[0];
  assert.ok(i.proksimal_km > 0 && i.awal_km >= i.proksimal_km - 1e-9, `awal ${i.awal_km} km harus >= batas proksimal ${i.proksimal_km} km`);
  assert.ok(dekat >= 120, `sel lahar terdekat ${dekat} sel; zona proksimal H/L 0,2 berakhir >= 120 sel`);
});
uji("produksi: luas lahar per jalur <= B jalur dan total <= B(V), volume terjaga (jumlah B = B(V)), mulai > 0", () => {
  const V = 1e4, B = L.laharz(V).B, r = produksi(V, 5);
  assert.ok(r.info.length > 1 && r.info.some(x => x.awal_km > 0), "butuh banyak jalur dan mulai > 0");
  for (const x of r.info) if (x.berhenti !== "tak ada zona lahar") assert.ok(x.lahar_km2 * 1e6 <= x.B_m2 * 1.0001, `jalur bobot ${x.bobot}: luas ${Math.round(x.lahar_km2 * 1e6)} > B jalur ${Math.round(x.B_m2)}`);
  const luas = r.ringkas.lahar_km2 * 1e6; assert.ok(luas <= B * 1.0001, `luas total ${Math.round(luas)} > B(V)=${Math.round(B)}`);
  const jumlahB = r.info.reduce((a, x) => a + (x.berhenti === "tak ada zona lahar" ? B * x.bobot : x.B_m2), 0); assert.ok(Math.abs(jumlahB / B - 1) < 1e-9, `jumlah B ${jumlahB} != B(V) ${B}`);
});
uji("produksi: jalur seluruhnya di zona proksimal -> berhenti 'tak ada zona lahar', bukan lahar nol diam-diam", () => {
  const r = L.simulasi({dem: kerucut, n: N, m: N, z: Z, lat: LAT, pusat: [C, C], V: 1e5, hl: 0.3, maxJalur: 1, proksimal: 0.2, ambangHulu: 0}), i = r.info[0]; /* kerucut: lereng 0,31 dan H/L > 0,2 sampai tepi peta */
  assert.equal(i.berhenti, "tak ada zona lahar", "berhenti seharusnya 'tak ada zona lahar', dapat " + i.berhenti);
  assert.equal(i.alasan_tak_ada, "proksimal", "alasan seharusnya 'proksimal', dapat '" + i.alasan_tak_ada + "'");
  assert.equal(r.lahar.idx.length, 0, "tak boleh ada sel lahar"); assert.equal(r.ringkas.lahar_km, 0);
});
uji("produksi: lembah yang tak pernah mengumpulkan ambang hulu -> 'tak ada zona lahar' beralasan 'hulu'", () => {
  const r = L.simulasi({dem: curam, n: N, m: N, z: Z, lat: LAT, pusat: [C, C], V: 1e4, hl: 0.3, maxJalur: 1, ambangHulu: 1e4}), i = r.info[0];
  assert.equal(i.berhenti, "tak ada zona lahar"); assert.equal(i.alasan_tak_ada, "hulu");
});
uji("zona proksimal batas H/L 0,3 mundur ke mekanik lama: tak ada sel lahar di lereng curam dekat kawah", () => {
  const r = L.simulasi({dem: kerucut, n: N, m: N, z: Z, lat: LAT, pusat: [C, C], V: 1e3, hl: 0.3, maxJalur: 1, proksimal: 0.3, ambangHulu: 0}); /* lereng 0,31 > 0,3 sampai dataran r=158 */
  const dx = L.mPerPx(LAT, Z), [px, py] = r.puncak; assert.ok(r.lahar.idx.length > 0, "volume kecil di dataran harus tetap menghasilkan lahar");
  const dekat = [...r.lahar.idx].map(i => Math.hypot(i % N - px, ((i / N) | 0) - py)).sort((a, b) => a - b)[0];
  assert.ok(dekat >= 150, `sel lahar terdekat ${dekat.toFixed(0)} sel (${(dekat * dx / 1000).toFixed(1)} km) dari puncak, padahal zona proksimal berakhir ~158 sel`);
});
uji("simulasi lima jalur selesai cepat dan tiap jalur berbobot", () => {
  const t0 = Date.now(), r = L.simulasi({dem: kerucut, n: N, m: N, z: Z, lat: LAT, pusat: [C + 2, C - 1], V: 1e6, hl: 0.3, proksimal: 0.5, ambangHulu: 0});
  assert.ok(Date.now() - t0 < 3000, "terlalu lama: " + (Date.now() - t0) + " ms");
  const w = r.info.reduce((a, i) => a + i.bobot, 0); assert.ok(Math.abs(w - 1) < 1e-9, "bobot volume harus berjumlah 1, dapat " + w);
  assert.ok(r.info[0].utama, "jalur pertama harus jalur dari dasar kawah");
});

console.log(process.exitCode ? "\nADA YANG GAGAL" : `\nsemua hijau (${lolos} uji)`);
