"use strict";
/* alat_gambar_geo.js: geometri murni alat gambar wilayah (tanpa DOM), diuji node --test (tests/gambar).
   Paket data/kajian-bnpb/alat-gambar/ (ALGORITMA.md). Luas hasil bernama "luas wilayah digambar": bukan luas terbakar.
   null = tak terukur, bukan nol. */
(function (g) {
const BUFFER_MIN_KM = 1, BUFFER_MAX_KM = 50, MAKS_SIMPUL = 200, MAKS_KAB = 12;
const PETAK = 0.003375, R_BUMI_KM = 6371.0088;   /* PETAK = AngkaKawasan.G (derajat lintang; bujur diskalakan cos lintang) */
const RAD = Math.PI / 180;
const PIKSEL_HA = Math.round((PETAK * R_BUMI_KM * RAD) ** 2 * 1e4) / 100;   /* luas satu sel ~ 14,08 ha (sisi 0,375 km), bukan 14,0625 tetap */
/* sel sama dengan AngkaKawasan.selUnik: titik dan sel sebanding */
const selKunci = (lat, lon) => Math.round(lat / PETAK) + "," + Math.round(lon * Math.cos(lat * RAD) / PETAK);

/* ---------- luas ---------- */
/* luas poligon di bola (km2): |jumlah selisih bujur x (sin lintang_i + sin lintang_j)| / 2 x R2 */
function luasKm2(simpul) {
  let s = 0;
  for (let i = 0; i < simpul.length; i++) {
    const [lo1, la1] = simpul[i], [lo2, la2] = simpul[(i + 1) % simpul.length];
    s += (lo2 - lo1) * RAD * (Math.sin(la1 * RAD) + Math.sin(la2 * RAD));
  }
  return Math.abs(s) / 2 * R_BUMI_KM * R_BUMI_KM;
}
/* dua angka bermakna di atas 100 km2, selain itu satu desimal; tanpa presisi palsu */
function bulatLuas(km2) {
  if (km2 >= 100) { const d = Math.pow(10, Math.floor(Math.log10(km2)) - 1); return Math.round(km2 / d) * d; }
  return Math.round(km2 * 10) / 10;
}

/* ---------- bentuk ---------- */
function tujuan([lon, lat], arahDeg, km) {
  const d = km / R_BUMI_KM, b = arahDeg * RAD, la1 = lat * RAD, lo1 = lon * RAD;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
  const lo2 = lo1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return [lo2 / RAD, la2 / RAD];
}
function lingkaran(pusat, rKm, n = 72) { return Array.from({length: n}, (_, i) => tujuan(pusat, i * 360 / n, rKm)); }
function jarakKm([lo1, la1], [lo2, la2]) {
  const a = Math.sin((la2 - la1) * RAD / 2) ** 2 + Math.cos(la1 * RAD) * Math.cos(la2 * RAD) * Math.sin((lo2 - lo1) * RAD / 2) ** 2;
  return 2 * R_BUMI_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
/* jarak titik ke ruas pada bidang lokal ekuidistan di sekitar titik (km) */
function jarakKeRuas(p, a, b) {
  const k = Math.cos(p[1] * RAD), m = R_BUMI_KM * RAD;
  const ax = (a[0] - p[0]) * k * m, ay = (a[1] - p[1]) * m, bx = (b[0] - p[0]) * k * m, by = (b[1] - p[1]) * m;
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}
/* tanpa alokasi; bila batas diberikan, berhenti begitu sudah <= batas */
function jarakKeGaris(p, garis, batas) {
  if (garis.length === 1) return jarakKm(p, garis[0]);
  let m = Infinity;
  for (let i = 1; i < garis.length; i++) { const d = jarakKeRuas(p, garis[i - 1], garis[i]); if (d < m) { m = d; if (batas != null && m <= batas) return m; } }
  return m;
}

/* ---------- penolakan masukan (T8, T9) ---------- */
function silang(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function menyilangDiri(s) {
  const n = s.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;   /* ruas pertama dan terakhir bertetangga di poligon tertutup */
    if (silang(s[i], s[(i + 1) % n], s[j], s[(j + 1) % n])) return true;
  }
  return false;
}
/* -> null bila sah, kalau tidak teks pesan (bahasa polos) */
function tolak(gambar) {
  const {bentuk, simpul = [], r_km} = gambar;
  if (simpul.length > MAKS_SIMPUL) return `Gambar punya lebih dari ${MAKS_SIMPUL} titik sudut. Sederhanakan dulu.`;
  if (bentuk === "poligon") {
    if (simpul.length < 3) return "Poligon butuh sedikitnya tiga titik sudut.";
    if (menyilangDiri(simpul)) return "Garis poligon saling memotong. Gambar ulang tanpa garis yang bersilangan.";
  } else if (bentuk === "kotak") {
    if (simpul.length < 2) return "Kotak butuh dua sudut.";
    if (simpul[0][0] === simpul[1][0] || simpul[0][1] === simpul[1][1]) return "Kedua sudut kotak sejajar. Pilih sudut yang berseberangan.";
  } else if (bentuk === "buffer") {
    if (!simpul.length) return "Klik peta untuk menaruh titik atau garis.";
    if (!(r_km >= BUFFER_MIN_KM && r_km <= BUFFER_MAX_KM)) return `Jari-jari harus ${BUFFER_MIN_KM} sampai ${BUFFER_MAX_KM} km.`;
  } else return "Bentuk tidak dikenal.";
  return null;
}

/* ---------- titik dalam gambar ---------- */
function dalamPoligon(lon, lat, poli) {
  let masuk = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i], [xj, yj] = poli[j];
    /* titik pada tepi dianggap di dalam (T3) */
    if ((lon - xi) * (yj - yi) === (lat - yi) * (xj - xi) && lon >= Math.min(xi, xj) && lon <= Math.max(xi, xj) && lat >= Math.min(yi, yj) && lat <= Math.max(yi, yj)) return true;
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) masuk = !masuk;
  }
  return masuk;
}
/* -> {bb:[barat,selatan,timur,utara], dalam(lon,lat), poligon:[[lon,lat]...] untuk luas dan gambar, luas_km2} atau null bila ditolak */
function penguji(gambar) {
  if (tolak(gambar)) return null;
  const {bentuk, simpul, r_km} = gambar;
  let poli, dalam, bb;
  const kotakBb = pts => [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
  if (bentuk === "buffer") {
    const garis = simpul.length > 50 ? simpul.filter((_, i) => i % Math.ceil(simpul.length / 50) === 0 || i === simpul.length - 1) : simpul;
    const lat0 = Math.max(...garis.map(p => Math.abs(p[1])));
    const e = r_km / (R_BUMI_KM * RAD), eLo = e / Math.max(0.05, Math.cos(Math.min(85, lat0 + e) * RAD));
    const b0 = kotakBb(garis); bb = [b0[0] - eLo, b0[1] - e, b0[2] + eLo, b0[3] + e];
    dalam = (lo, la) => jarakKeGaris([lo, la], garis, r_km) <= r_km;
    poli = garis.length === 1 ? lingkaran(garis[0], r_km) : null;
    /* kapsul: luas tidak dihitung di sini (mahal); minta lewat uji.luasA(N, batal) yang menyerahkan kendali ke peramban */
    const u = {bb, dalam, poligon: poli, garis, r_km, luas_km2: poli ? luasKm2(poli) : null};
    if (!poli) u.luasA = (N, batal) => luasKapsulA(garis, bb, dalam, N, batal);
    return u;
  }
  poli = bentuk === "kotak" ? (([a, b]) => [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]])(simpul) : simpul;
  bb = kotakBb(poli);
  return {bb, dalam: (lo, la) => lo >= bb[0] && lo <= bb[2] && la >= bb[1] && la <= bb[3] && dalamPoligon(lo, la, poli), poligon: poli, luas_km2: luasKm2(poli)};
}
/* ponytail: kapsul = luas dari sampling grid N x N (tanpa pustaka gabungan poligon); N=48 untuk sementara saat slider digeser, N=160 (galat < 1%) sesudah berhenti.
   Menyerahkan kendali tiap 50 ms; batal() true -> null. Ganti dengan gabungan poligon bila perlu presisi lebih. */
async function luasKapsulA(garis, bb, dalam, N = 160, batal) {
  const dLo = (bb[2] - bb[0]) / N, dLa = (bb[3] - bb[1]) / N;
  let s = 0, t = performance.now() + 50;
  for (let i = 0; i < N; i++) {
    if (batal?.()) return null;
    const la = bb[1] + (i + 0.5) * dLa;
    let n = 0;
    for (let j = 0; j < N; j++) if (dalam(bb[0] + (j + 0.5) * dLo, la)) n++;
    s += n * dLo * RAD * (Math.sin((la + dLa / 2) * RAD) - Math.sin((la - dLa / 2) * RAD));
    if (performance.now() >= t) { await yieldUtama(); if (batal?.()) return null; t = performance.now() + 50; }
  }
  return s * R_BUMI_KM * R_BUMI_KM;
}
/* bidang-bidang untuk menggambar buffer garis: lingkaran di tiap simpul + persegi panjang di tiap ruas */
function bidangKapsul(garis, r) {
  const out = garis.map(p => lingkaran(p, r, 48));
  for (let i = 1; i < garis.length; i++) {
    const a = garis[i - 1], b = garis[i], k = Math.cos(a[1] * RAD) || 1;
    const t = Math.atan2((b[0] - a[0]) * k, b[1] - a[1]) / RAD;
    out.push([tujuan(a, t - 90, r), tujuan(b, t - 90, r), tujuan(b, t + 90, r), tujuan(a, t + 90, r)]);
  }
  return out;
}

/* ---------- hitungan titik ---------- */
const wibJam = (acuanMs, jam) => { const j = (((acuanMs / 36e5 + jam + 7) % 24) + 24) % 24; return Math.floor(j); };
const malam = jamWib => jamWib >= 18 || jamWib < 6;
const yieldUtama = () => (typeof scheduler !== "undefined" && scheduler.yield) ? scheduler.yield() : new Promise(r => setTimeout(r, 0));

/* baris = [lat, lon, jam, sensor, frp, keyakinan, wilayah, "MM-DD"]; opsi {horizon (jam: 24|72|168), acuanMs, dihitung(baris) opsional}.
   baris null -> null (data belum termuat, bukan 0). Tanpa dihitung: lokasi unik = kunci hari + petak PETAK (T4, T5).
   Semua angka dihitung dari lokasi unik itu. Menyerahkan kendali ke peramban tiap 50 ms (INP). */
async function hitungTitik(baris, uji, opsi) {   /* opsi.batal() true -> {dibatalkan: true}; tanpa opsi.dihitung hasil berlabel definisi "petak" (bukan angka utama peta) */
  if (!baris || !uji) return null;
  const {horizon, acuanMs, dihitung} = opsi, [b0, b1, b2, b3] = uji.bb, dalam = uji.dalam, awal = new Set(), sel = new Set();
  let unik = 0, frpJml = 0, frpMaks = null, frpTanpa = 0, siang = 0, mlm = 0, batas = performance.now() + 50;
  for (let i = 0; i < baris.length; i++) {
    if ((i & 2047) === 0 && opsi.batal?.()) return {dibatalkan: true};
    const r = baris[i], lat = r[0], lon = r[1];
    if (lon < b0 || lon > b2 || lat < b1 || lat > b3 || r[2] < -horizon) continue;
    if (!dalam(lon, lat)) continue;
    const kp = selKunci(lat, lon);
    if (dihitung) { if (!dihitung(r)) continue; }
    else { const k = r[7] + "|" + kp; if (awal.has(k)) continue; awal.add(k); }
    unik++; sel.add(kp);
    if (r[4] == null) frpTanpa++; else { frpJml += r[4]; if (frpMaks == null || r[4] > frpMaks) frpMaks = r[4]; }
    if (malam(wibJam(acuanMs, r[2]))) mlm++; else siang++;
    if (performance.now() >= batas) { await yieldUtama(); if (opsi.batal?.()) return {dibatalkan: true}; batas = performance.now() + 50; }
  }
  return {definisi: dihitung ? "utama" : "petak", titik_unik: unik, frp_jumlah: unik - frpTanpa ? Math.round(frpJml * 10) / 10 : null, frp_maks: frpMaks, frp_tanpa: frpTanpa,
    siang, malam: mlm, sel: sel.size, jejak_ha: Math.round(sel.size * PIKSEL_HA * 100) / 100, piksel_ha: PIKSEL_HA};
}

/* ---------- tolak saat simpul ditambah (poligon): ruas baru tidak boleh memotong ruas lain ---------- */
function silangBaru(simpul, p, tutup = false) {
  const n = simpul.length; if (n < 2) return false;
  const a = simpul[n - 1];
  if (p) for (let i = 0; i + 1 < n - 1; i++) if (silang(a, p, simpul[i], simpul[i + 1])) return true;
  if (tutup) for (let i = 1; i + 1 < n - 1; i++) if (silang(a, simpul[0], simpul[i], simpul[i + 1])) return true;
  return false;
}

/* ---------- irisan gambar dengan bidang administrasi ---------- */
const cincin = geom => geom.type === "Polygon" ? [geom.coordinates[0]] : geom.coordinates.map(p => p[0]);   /* ponytail: lubang diabaikan */
const bbMemo = new WeakMap();
const bbCincin = r => { let m = bbMemo.get(r); if (m) return m; let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of r) { if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; } return bbMemo.set(r, m = [a, b, c, d]), m; };
const bbTumpang = (p, q) => p[0] <= q[2] && p[2] >= q[0] && p[1] <= q[3] && p[3] >= q[1];
function titikGaris(garis, r) {   /* titik sepanjang garis, jarak antar titik <= r/2 km */
  const out = [garis[0]];
  for (let i = 1; i < garis.length; i++) { const k = Math.max(1, Math.ceil(jarakKm(garis[i - 1], garis[i]) / (r / 2)));
    for (let j = 1; j <= k; j++) out.push([garis[i - 1][0] + (garis[i][0] - garis[i - 1][0]) * j / k, garis[i - 1][1] + (garis[i][1] - garis[i - 1][1]) * j / k]); }
  return out;
}
function irisanCincin(ring, uji) {
  if (!bbTumpang(bbCincin(ring), uji.bb)) return false;
  for (const p of ring) if (uji.dalam(p[0], p[1])) return true;
  if (uji.poligon) {
    for (const q of uji.poligon) if (dalamPoligon(q[0], q[1], ring)) return true;
    const P = uji.poligon;
    for (let i = 0; i < ring.length - 1; i++) for (let j = 0; j < P.length; j++) if (silang(ring[i], ring[i + 1], P[j], P[(j + 1) % P.length])) return true;
    return false;
  }
  for (const q of titikGaris(uji.garis, uji.r_km)) if (dalamPoligon(q[0], q[1], ring)) return true;
  for (let i = 0; i < ring.length - 1; i++) { const k = Math.ceil(Math.hypot(ring[i + 1][0] - ring[i][0], ring[i + 1][1] - ring[i][1]) / 0.005);
    for (let j = 1; j < k; j++) if (uji.dalam(ring[i][0] + (ring[i + 1][0] - ring[i][0]) * j / k, ring[i][1] + (ring[i + 1][1] - ring[i][1]) * j / k)) return true; }
  return false;
}
const irisan = (geom, uji) => cincin(geom).some(r => irisanCincin(r, uji));
const bbGeom = geom => cincin(geom).map(bbCincin).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);

/* nama kabupaten di desa_cari.json kadang beda ejaan dengan geo/kabupaten; cocokkan huruf-angka saja, plus tiga pengecualian */
const nm = s => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const NAMA_LAIN = {"12.77": "Kota Padang Sidempuan", "71.09": "Kepulauan Siau Tagulandang Biaro", "73.10": "Pangkajene Kepulauan"};
/* muat(url) -> janji JSON (disuntik: peramban fetch, uji data kecil). Hasil: {n_kab, terlalu_luas?, desa:[{kd,nama,kec}], kec:[{kec,kab,pend|null}], pend (jumlah kecamatan yang diketahui)|null} */
/* fitur yang beririsan; menyerahkan kendali tiap 40 fitur */
async function saring(fitur, uji) { const out = []; for (let i = 0; i < fitur.length; i++) { if (irisan(fitur[i].geometry, uji)) out.push(fitur[i]); if (i % 40 === 39) await yieldUtama(); } return out; }
const dcMemo = new WeakMap();
const dcPeta = dc => { let m = dcMemo.get(dc); if (!m) dcMemo.set(dc, m = {kode: new Map(Object.entries(dc.kab).map(([c, n]) => [c.slice(0, 2) + "|" + nm(NAMA_LAIN[c] || n), c])), info: new Map(dc.baris.map(([kd, n, kc]) => [kd, [n, kc]]))}); return m; };
async function wilayah(uji, muat, maksKab = MAKS_KAB) {
  const prov = await muat("geo/provinsi.json"), kab = [];
  for (const f of prov.features) {
    if (!bbTumpang(bbGeom(f.geometry), uji.bb)) continue;
    const p = f.properties.kode, fc = await muat(`geo/kabupaten/${p}.json`);
    for (const k of await saring(fc.features, uji)) kab.push({p, nama: k.properties.kab});
  }
  if (kab.length > maksKab) return {n_kab: kab.length, terlalu_luas: true};
  if (!kab.length) return {n_kab: 0, desa: null, kec: null, pend: null};
  const {kode, info} = dcPeta(await muat("data/desa_cari.json")), desa = [];
  for (const k of kab) {
    const c = kode.get(k.p + "|" + nm(k.nama)); if (!c) continue;
    try { const fc = await muat(`geo/desa/${c}.json`); for (const d of await saring(fc.features, uji)) { const i = info.get(d.properties.kd); desa.push({kd: d.properties.kd, nama: i?.[0] || null, kec: i?.[1] || null, kab: k.nama}); } } catch (e) { return {n_kab: kab.length, desa: null, kec: null, pend: null}; }
  }
  const pk = await muat("data/penduduk.json"), kec = [];
  for (const p of new Set(kab.map(k => k.p))) {
    const fc = await muat(`geo/kecamatan/${p}.json`);
    for (const k of await saring(fc.features, uji)) { const v = pk.kec[`${p}|${k.properties.kab}|${k.properties.kec}`]; kec.push({kec: k.properties.kec, kab: k.properties.kab, pend: v ?? null}); }
  }
  const diketahui = kec.filter(k => k.pend != null);
  return {n_kab: kab.length, desa, kec, pend: diketahui.length ? diketahui.reduce((a, k) => a + k.pend, 0) : null, pend_lengkap: diketahui.length === kec.length};
}

/* insiden yang pusatnya di dalam gambar dan punya luas dNBR (luas_citra.json apa adanya, tidak dijumlah, tidak dihitung ulang); tanpa luas = tidak muncul */
function insidenDalam(insiden, luasCitra, uji) {
  const out = [];
  for (const r of Object.values(insiden?.insiden || {})) {
    const c = luasCitra?.[r.id]; if (!c || c.luas_ha == null || !r.pusat) continue;
    if (uji.dalam(r.pusat[1], r.pusat[0])) out.push({id: r.id, nama: [r.kec, r.kab].filter(Boolean).join(", ") || r.id, luas_ha: c.luas_ha, cakupan_pct: c.cakupan_pct ?? null});
  }
  return out.sort((a, b) => b.luas_ha - a.luas_ha);
}

g.AlatGambarGeo = {BUFFER_MIN_KM, BUFFER_MAX_KM, MAKS_SIMPUL, MAKS_KAB, PETAK, PIKSEL_HA, R_BUMI_KM, selKunci,
  luasKm2, bulatLuas, tujuan, lingkaran, jarakKm, jarakKeGaris, menyilangDiri, tolak, dalamPoligon, penguji, bidangKapsul, wibJam, malam, hitungTitik, silangBaru, irisan, wilayah, insidenDalam};
})(typeof window !== "undefined" ? window : globalThis);
