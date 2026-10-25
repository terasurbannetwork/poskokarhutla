"use strict";
/* sim_tanggap.js: lapis tanggap dan peringkat perlakuan untuk simulasi genangan, murni (tanpa DOM). Dipakai sebagai <script> (window.SimTanggap),
   importScripts, dan vm di tests/banjir/sim_tanggap.test.mjs.
   Tanggap: pangkalan (BPBD, Basarnas, pos dari unit_respons.json) menuju sasaran (sel berpenduduk yang tergenang), waktu tempuh dihitung
   Dijkstra 8-tetangga di kisi simulasi dengan kecepatan per sel pada jam itu: jalan OSM yang tidak tergenang (kecepatan per kelas jalan),
   darat di luar jalan jalan kaki, genangan 30-50 cm diarungi, >= 50 cm pakai perahu karet. Pengungsian ke titik aman (sekolah/faskes OSM
   yang tak pernah tergenang; bila tak ada, tanah tinggi DEM).
   Perlakuan: kandidat dibuat dari hasil dasar, tiap kandidat dijalankan lewat mesin yang sama oleh pemanggil, diperingkat menurut jiwa terpapar
   yang berkurang dan biaya Rp. Angka tanpa sumber kuat (kapasitas perahu, biaya, efektivitas peringatan) = ASUMSI, tampil sebagai rentang. */
(function (akar) {
const salah = m => { throw new Error("SimTanggap: " + m); };
/* km/jam per kelas jalan; sama dengan public/data/akses.json _meta.laju_kmj (kelas OpenMapTiles: minor ~ unclassified, service = track kota) */
const LAJU_JALAN = {motorway: 50, trunk: 50, primary: 50, secondary: 40, tertiary: 30, minor: 25, unclassified: 25, residential: 25, service: 20, track: 15, path: 4};
const ASUMSI = {
  AMBANG_JALAN: 0.3,    /* m; kendaraan umum tak lewat bila air >= 30 cm (asumsi; mobil biasa mati mesin sekitar 30 cm) */
  AMBANG_PERAHU: 0.5,   /* m; di atas ini perahu karet jalan, di bawahnya berjalan kaki mengarungi (asumsi) */
  V_KAKI: 3, V_ARUNG: 1.5, V_PERAHU: 10, /* km/jam: jalan kaki di tanah kering, mengarungi, perahu karet bermesin (asumsi) */
  PASANG_PERAHU: 0.25,  /* jam; menurunkan perahu dan berangkat (asumsi) */
  LAJU_LUAR: 40, KELOK: 1.4, /* dari pangkalan di luar kotak sampai tepi kotak: sama dengan posko.json (laju 40 km/jam, kelok 1,4) */
  PERAHU: {basarnas: 4, bpbd: 2, pos: 1}, /* perahu karet per pangkalan (asumsi, bukan inventaris) */
  KAPASITAS: 10,        /* jiwa per perahu karet (asumsi; perahu karet SAR 8-12 orang) */
  JENDELA: 12,          /* jam sejak berangkat yang dihitung untuk jumlah jiwa terangkut */
  JIWA_RUMAH: 3.9,      /* jiwa per rumah (asumsi, rata-rata nasional BPS SP2020) */
  MOBILISASI: 2,        /* jam dari peringatan sampai warga mulai bergerak pada evakuasi dini (asumsi) */
  PATUH: [0.4, 0.8],    /* bagian warga yang benar-benar mengungsi bila diperingatkan: rentang asumsi */
};
/* biaya Rp per perlakuan 72 jam: ASUMSI rentang (belum dari HSPK/harga satuan resmi) */
const TANGGUL_R = 500; /* m, jari-jari busur tanggul */
const BIAYA = {
  tanggulPerM: [150e3, 350e3], /* Rp per meter pada tinggi 1 m; naik dengan kuadrat tinggi (karung pasir/tanggul tanah darurat) */
  pompaUnit: [25e6, 50e6],     /* Rp per unit 0,25 m3/dtk, sewa + BBM + operator 72 jam */
  pintu: [2e6, 5e6],           /* Rp, petugas dan alat penggerak */
  evakuasiJiwa: [150e3, 450e3],/* Rp per jiwa untuk 3 hari (makan, tenda, angkut) */
};

/* ---------- jalan ke kisi ---------- */
/* garis [{p: [[lon,lat],...], k: kelas}] -> Float32Array km/jam per sel (0 = bukan jalan); sel yang dilalui beberapa kelas = terbaik */
function rasterJalan(garis, keSel, nx, ny) {
  const v = new Float32Array(nx * ny);
  for (const g of garis) { const laju = LAJU_JALAN[g.k]; if (!laju) continue; const p = g.p.map(([lo, la]) => keSel(lo, la));
    for (let s = 1; s < p.length; s++) { const [x0, y0] = p[s - 1], [x1, y1] = p[s], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (let q = 0; q <= n; q++) { const i = Math.round(x0 + (x1 - x0) * q / n), j = Math.round(y0 + (y1 - y0) * q / n); if (i >= 0 && j >= 0 && i < nx && j < ny && laju > v[j * nx + i]) v[j * nx + i] = laju; } } }
  return v;
}
/* kecepatan per sel pada satu jam. dalam = kedalaman jam itu (Float32Array N). mode "terpadu" = jalan + jalan kaki + arung + perahu; "darat" = jalan saja */
function kecepatan(laju, dalam, laut, mode = "terpadu") {
  const N = laju.length, v = new Float32Array(N), air = new Uint8Array(N);
  for (let k = 0; k < N; k++) { if (laut[k]) continue; const d = dalam[k];
    if (laju[k] > 0 && d < ASUMSI.AMBANG_JALAN) v[k] = laju[k];
    else if (mode === "darat") continue;
    else if (d < ASUMSI.AMBANG_JALAN) v[k] = ASUMSI.V_KAKI;
    else if (d < ASUMSI.AMBANG_PERAHU) v[k] = ASUMSI.V_ARUNG;
    else { v[k] = ASUMSI.V_PERAHU; air[k] = 1; } }
  return {v, air};
}
/* waktu tempuh (jam) dari sumber [{k, t}] ke semua sel; Dijkstra 8-tetangga, biaya = jarak / rata-rata kecepatan kedua sel,
   + PASANG_PERAHU saat masuk air dari darat. Sel v = 0 tak bisa dilewati. Infinity = tak terjangkau */
function waktuTempuh(nx, ny, dx, v, air, sumber) {
  const N = nx * ny, T = new Float64Array(N).fill(Infinity), H = [], dorong = (t, k) => { let c = H.length; H.push([t, k]); while (c > 0) { const p = (c - 1) >> 1; if (H[p][0] <= t) break; H[c] = H[p]; c = p; } H[c] = [t, k]; };
  const ambil = () => { const top = H[0], x = H.pop(); if (H.length) { let c = 0; for (;;) { let a = 2 * c + 1; if (a >= H.length) break; if (a + 1 < H.length && H[a + 1][0] < H[a][0]) a++; if (H[a][0] >= x[0]) break; H[c] = H[a]; c = a; } H[c] = x; } return top; };
  for (const s of sumber) { if (!(s.k >= 0 && s.k < N) || !(v[s.k] > 0)) continue; if (s.t < T[s.k]) { T[s.k] = s.t; dorong(s.t, s.k); } }
  while (H.length) { const [t, c] = ambil(); if (t > T[c]) continue; const ci = c % nx, cj = (c / nx) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
      const n = j * nx + i; if (!(v[n] > 0)) continue; const jar = dx * (di && dj ? Math.SQRT2 : 1) / 1000, tt = t + jar / ((v[c] + v[n]) / 2) + (air[n] && !air[c] ? ASUMSI.PASANG_PERAHU : 0);
      if (tt < T[n]) { T[n] = tt; dorong(tt, n); } } }
  return T;
}

/* ---------- analisis tanggap ---------- */
const kmDatar = (la1, lo1, la2, lo2) => { const r = Math.PI / 180, x = (lo2 - lo1) * r * Math.cos((la1 + la2) / 2 * r); return 6371 * Math.hypot(x, (la2 - la1) * r); };
const median = (xs, w) => { /* median berbobot; xs [[nilai, bobot]] */ const a = xs.filter(x => Number.isFinite(x[0])).sort((p, q) => p[0] - q[0]), tot = a.reduce((s, x) => s + x[1], 0); let c = 0; for (const [x, b] of a) { c += b; if (c >= tot * (w ?? .5)) return x; } return Infinity; };
/* ctx: {nx, ny, dx, laut, laju (rasterJalan), kedalaman (Float32Array N*(J+1)), hmaks, z, jam J, pop {lo, hi}, keSel(lon,lat)->[i,j], dariSel(i,j)->[lon,lat],
          unit [{nama, jenis, lat, lon}], poi [{nama, jenis, lat, lon}], pusat {lat, lon}}
   Kembali {ada: false, alasan} bila tak ada sasaran. */
function analisisTanggap(ctx) {
  const {nx, ny, dx, laut, laju, kedalaman, hmaks, z, J} = ctx, N = nx * ny, popLo = ctx.pop.lo, popHi = ctx.pop.hi, mid = k => (popLo[k] + popHi[k]) / 2;
  const slice = t => kedalaman.subarray(t * N, (t + 1) * N);
  /* jam: mulai = pertama kali ada sel berpenduduk >= 30 cm; puncak = jam dengan jiwa terpapar terbanyak */
  const jiwaT = t => { const d = slice(t); let s = 0; for (let k = 0; k < N; k++) if (d[k] >= ASUMSI.AMBANG_JALAN) s += mid(k); return s; };
  let tp = 0, mx = -1, tm = -1; for (let t = 0; t <= J; t++) { const j = jiwaT(t); if (j > mx) { mx = j; tp = t; } if (tm < 0 && j > 0) tm = t; }
  if (!(mx > 0)) return {ada: false, alasan: "Tidak ada permukiman yang tergenang 30 cm atau lebih."};
  const jamSnap = [...new Set([tm, tp])], saatnya = jamSnap.map(t => {
    const d = slice(t), {v, air} = kecepatan(laju, d, laut), sasaran = []; let jiwa = 0, jiwaLo = 0, jiwaHi = 0, cx = 0, cy = 0;
    for (let k = 0; k < N; k++) if (d[k] >= ASUMSI.AMBANG_JALAN && mid(k) > 0) { sasaran.push(k); jiwa += mid(k); jiwaLo += popLo[k]; jiwaHi += popHi[k]; cx += (k % nx) * mid(k); cy += ((k / nx) | 0) * mid(k); }
    /* titik pusat sasaran dipetakan ke sel sasaran terdekat */
    cx /= jiwa; cy /= jiwa; let kp = sasaran[0], bd = Infinity; for (const k of sasaran) { const e = ((k % nx) - cx) ** 2 + (((k / nx) | 0) - cy) ** 2; if (e < bd) { bd = e; kp = k; } }
    /* titik aman: tak pernah tergenang >= 5 cm, bukan laut; poi dulu, lalu tanah tinggi */
    const aman = []; for (const p of ctx.poi || []) { const [fi, fj] = ctx.keSel(p.lon, p.lat), i = Math.round(fi), j = Math.round(fj); if (i < 0 || j < 0 || i >= nx || j >= ny) continue; const k = j * nx + i; if (!laut[k] && hmaks[k] < .05 && v[k] > 0) aman.push({k, nama: p.nama, jenis: p.jenis}); }
    if (!aman.length) { const kering = []; for (let k = 0; k < N; k++) if (!laut[k] && hmaks[k] < .01 && v[k] > 0) kering.push(k); kering.sort((a, b) => z[b] - z[a]);
      const atas = kering.slice(0, Math.max(1, Math.floor(kering.length * .2))), pi = kp % nx, pj = (kp / nx) | 0; atas.sort((a, b) => ((a % nx) - pi) ** 2 + (((a / nx) | 0) - pj) ** 2 - (((b % nx) - pi) ** 2 + (((b / nx) | 0) - pj) ** 2));
      for (const k of atas.slice(0, 3)) aman.push({k, nama: "Tanah tinggi terdekat (DEM)", jenis: "dem"}); }
    const Ta = aman.length ? waktuTempuh(nx, ny, dx, v, air, aman.map(a => ({k: a.k, t: 0}))) : null;
    const evak = Ta ? median(sasaran.map(k => [Ta[k], mid(k)])) : Infinity, evak90 = Ta ? median(sasaran.map(k => [Ta[k], mid(k)]), .9) : Infinity;
    let terdekat = null; if (Ta) { let bt = Infinity; aman.forEach(a => { const tt = waktuTempuh(nx, ny, dx, v, air, [{k: a.k, t: 0}])[kp]; if (tt < bt) { bt = tt; terdekat = {...a, jam: tt}; } }); }
    /* unit: sumber = sel jalan terdekat bila di dalam kotak, atau sel jalan tepi kotak terdekat bila di luar */
    const unit = (ctx.unit || []).map(u => {
      const [fi, fj] = ctx.keSel(u.lon, u.lat), i = Math.round(fi), j = Math.round(fj), dalam = i >= 0 && j >= 0 && i < nx && j < ny; let sumber = null, luar = 0;
      if (dalam) { let b = Infinity, kb = -1; for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const a = i + di, c = j + dj; if (a < 0 || c < 0 || a >= nx || c >= ny) continue; const k = c * nx + a; if (v[k] > 0 && !air[k] && laju[k] > 0 && di * di + dj * dj < b) { b = di * di + dj * dj; kb = k; } } sumber = kb >= 0 ? [{k: kb, t: 0}] : [{k: j * nx + i, t: 0}]; }
      else { const tepi = [], cad = []; for (let k = 0; k < N; k++) { const a = k % nx, c = (k / nx) | 0; if ((a <= 1 || c <= 1 || a >= nx - 2 || c >= ny - 2) && v[k] > 0 && !air[k]) (laju[k] > 0 ? tepi : cad).push(k); }
        /* tanpa jalan di tepi (jaringan jalan tak termuat atau terendam): masuk lewat sel tepi kering mana pun, jalan kaki */
        if (!tepi.length) tepi.push(...cad); if (!tepi.length) return {...u, tiba: Infinity, alasan: "tak ada jalan yang lewat ke kotak"};
        tepi.sort((p, q) => { const [lp, bp] = ctx.dariSel(p % nx, (p / nx) | 0).reverse(), [lq, bq] = ctx.dariSel(q % nx, (q / nx) | 0).reverse(); return kmDatar(u.lat, u.lon, lp, bp) - kmDatar(u.lat, u.lon, lq, bq); });
        const [la, lo] = ctx.dariSel(tepi[0] % nx, (tepi[0] / nx) | 0).reverse(); luar = kmDatar(u.lat, u.lon, la, lo) * ASUMSI.KELOK; sumber = [{k: tepi[0], t: luar / ASUMSI.LAJU_LUAR}]; }
      const T = waktuTempuh(nx, ny, dx, v, air, sumber), tiba = T[kp], sasaranT = sasaran.map(k => [T[k], mid(k)]);
      return {...u, luarKm: luar, tiba, jam3: sasaranT.filter(x => x[0] <= 3).reduce((s, x) => s + x[1], 0) / jiwa, jam6: sasaranT.filter(x => x[0] <= 6).reduce((s, x) => s + x[1], 0) / jiwa, T}; });
    /* kapasitas angkut: tiap perahu pulang-pergi sasaran -> titik aman; hanya unit yang tiba */
    const pp = terdekat && Number.isFinite(terdekat.jam) ? 2 * terdekat.jam + ASUMSI.PASANG_PERAHU : Infinity;
    let angkut = 0; for (const u of unit) { const perahu = ASUMSI.PERAHU[u.jenis] ?? 1, trip = Number.isFinite(u.tiba) && Number.isFinite(pp) ? Math.max(0, Math.floor((ASUMSI.JENDELA - u.tiba) / pp)) : 0; u.angkut = perahu * ASUMSI.KAPASITAS * trip; angkut += u.angkut; }
    return {jam: t, sasaran: sasaran.length, jiwa: [jiwaLo, jiwaHi], jiwaMid: jiwa, unit: unit.map(({T, ...r}) => r), aman: terdekat, evak, evak90, angkut, bagian: Math.min(1, angkut / jiwa), pusat: ctx.dariSel(kp % nx, (kp / nx) | 0)};
  });
  return {ada: true, snapshot: saatnya, mulai: tm, puncak: tp};
}

/* ---------- perlakuan ---------- */
/* jiwa dalam sel dengan air maks >= ambang. pop = {lo, hi}; kembali [lo, hi] */
function jiwaTerpapar(hmaks, pop, ambang = .5) { let lo = 0, hi = 0; for (let k = 0; k < hmaks.length; k++) if (hmaks[k] >= ambang) { lo += pop.lo[k]; hi += pop.hi[k]; } return [lo, hi]; }
/* kandidat dibuat dari hasil dasar. ctx: {nx, ny, dx, hmaks, pop, laut, z, sungaiK (sel masuknya sungai atau -1), adaLaut}
   Kembali {kandidat: [{id, nama, jenis, ket, biaya [lo, hi], tanggul: [{garis (koordinat sel), tinggi, panjang}], pompa: [{k, q}], pintu}], pusat: [i, j]} */
function kandidatPerlakuan(ctx) {
  const {nx, ny, dx, hmaks, pop, laut, z} = ctx, N = nx * ny; let sw = 0, ci = 0, cj = 0;
  for (let k = 0; k < N; k++) if (hmaks[k] >= .5 && !laut[k]) { const w = (pop.lo[k] + pop.hi[k]) / 2; sw += w; ci += (k % nx) * w; cj += ((k / nx) | 0) * w; }
  if (!(sw > 0)) return {kandidat: [], alasan: "Tidak ada permukiman yang tergenang 50 cm atau lebih: tak ada yang perlu dilindungi."};
  ci /= sw; cj /= sw;
  /* arah sumber air: ke sel masuk sungai bila ada, kalau tidak ke arah tanah paling tinggi dalam radius 12 sel */
  let ang; if (ctx.sungaiK >= 0) ang = Math.atan2((ctx.sungaiK / nx | 0) - cj, ctx.sungaiK % nx - ci);
  else { let b = -Infinity; ang = 0; for (let a = 0; a < 8; a++) { const th = a * Math.PI / 4; let s = 0, n = 0; for (let r = 4; r <= 12; r += 2) { const i = Math.round(ci + Math.cos(th) * r), j = Math.round(cj + Math.sin(th) * r); if (i >= 0 && j >= 0 && i < nx && j < ny && !laut[j * nx + i]) { s += z[j * nx + i]; n++; } } if (n && s / n > b) { b = s / n; ang = th; } } }
  const R = Math.max(1.5, TANGGUL_R / dx), arc = []; /* radius fisik tetap 500 m (bukan jumlah sel): panjang dan biaya tak ikut resolusi */ for (let d = -70; d <= 70; d += 10) { const th = ang + d * Math.PI / 180; arc.push([ci + Math.cos(th) * R, cj + Math.sin(th) * R]); }
  const panjang = R * dx * (140 * Math.PI / 180), kasar = dx > 100, tg = tinggi => ({garis: arc, tinggi, panjang});
  /* pompa di sel berpenduduk terdalam dalam radius 6 sel dari pusat */
  let kp = -1, bs = -1; for (let j = Math.max(0, Math.floor(cj - 6)); j <= Math.min(ny - 1, Math.ceil(cj + 6)); j++) for (let i = Math.max(0, Math.floor(ci - 6)); i <= Math.min(nx - 1, Math.ceil(ci + 6)); i++) { const k = j * nx + i; if (laut[k]) continue; const s = hmaks[k] * (1 + (pop.lo[k] + pop.hi[k]) / 2); if (s > bs) { bs = s; kp = k; } }
  const rp = x => x.map(v => Math.round(v)), tgBiaya = t => rp(BIAYA.tanggulPerM.map(c => c * t * t * panjang)), pmBiaya = q => rp(BIAYA.pompaUnit.map(c => c * q / .25));
  const kandidat = [
    {id: "tanggul1", nama: "Tanggul darurat 1 m", jenis: "tanggul", ket: `busur ${Math.round(panjang)} m di sisi datangnya air`, biaya: tgBiaya(1), tanggul: [tg(1)], pompa: [], pintu: false},
    {id: "tanggul2", nama: "Tanggul darurat 2 m", jenis: "tanggul", ket: `busur ${Math.round(panjang)} m di sisi datangnya air`, biaya: tgBiaya(2), tanggul: [tg(2)], pompa: [], pintu: false},
    {id: "pompa05", nama: "Pompa mobile 0,5 m³/dtk", jenis: "pompa", ket: "di sel berpenduduk terdalam", biaya: pmBiaya(.5), tanggul: [], pompa: [{k: kp, q: .5}], pintu: false},
    {id: "pompa15", nama: "Pompa mobile 1,5 m³/dtk", jenis: "pompa", ket: "di sel berpenduduk terdalam", biaya: pmBiaya(1.5), tanggul: [], pompa: [{k: kp, q: 1.5}], pintu: false},
    {id: "paket", nama: "Tanggul 2 m + pompa 1,5 m³/dtk", jenis: "paket", ket: "tanggul melindungi, pompa membuang air yang terkurung", biaya: [0, 1].map(i => tgBiaya(2)[i] + pmBiaya(1.5)[i]), tanggul: [tg(2)], pompa: [{k: kp, q: 1.5}], pintu: false}];
  if (ctx.adaLaut) kandidat.push({id: "pintu", nama: "Pintu air ditutup 72 jam penuh", jenis: "pintu", ket: "menahan pasang, tapi hujan di balik pintu juga tak bisa keluar lewat muara (tanpa jadwal per jam)", biaya: BIAYA.pintu.slice(), tanggul: [], pompa: [], pintu: true});
  return {kandidat, pusat: [ci, cj], panjang, kasar, catatan: kasar ? `Sel ${Math.round(dx)} m jauh lebih kasar dari tanggul (lebar beberapa meter): tanggul dihitung sebagai dinding setinggi n meter selebar satu sel, jadi efeknya perkiraan kasar.` : ""};
}
/* evakuasi dini: warga di sel yang akhirnya tergenang >= 50 cm selamat bila peringatan + mobilisasi + perjalanan ke titik aman < jam air tiba 30 cm.
   tiba[k] = jam pertama air >= 30 cm (Infinity bila tak pernah); ke[k] = jam perjalanan ke titik aman (waktuTempuh dari titik aman). Kembali {jiwa [lo, hi], diungsikan [lo, hi], sel} */
function evakuasiDini(hmaks, pop, tiba, ke, mobilisasi = ASUMSI.MOBILISASI, patuh = ASUMSI.PATUH) {
  let lo = 0, hi = 0, jl = 0, jh = 0, sel = 0;
  for (let k = 0; k < hmaks.length; k++) if (hmaks[k] >= .5) { lo += pop.lo[k]; hi += pop.hi[k]; if (Number.isFinite(ke[k]) && tiba[k] - mobilisasi >= ke[k]) { jl += pop.lo[k] * patuh[0]; jh += pop.hi[k] * patuh[1]; sel++; } }
  return {jiwa: [lo, hi], diungsikan: [jl, jh], sel};
}
/* peringkat: tiap hasil {id, nama, biaya [lo, hi], berat: [lo, hi] jiwa terpapar >= 50 cm sesudah perlakuan}. dasar = [lo, hi] tanpa perlakuan.
   Urut menurun menurut jiwa terselamatkan (tengah rentang); biaya per jiwa = tengah biaya / tengah jiwa. Tanpa manfaat (<= 0) tidak diberi biaya per jiwa. */
function peringkat(dasar, hasil) {
  const mid = r => (r[0] + r[1]) / 2;
  return hasil.map(h => { const sel = h.selamat || [Math.max(0, dasar[0] - h.berat[0]), Math.max(0, dasar[1] - h.berat[1])], s = mid(sel), b = mid(h.biaya);
    return {...h, selamat: sel, rumah: [sel[0] / ASUMSI.JIWA_RUMAH, sel[1] / ASUMSI.JIWA_RUMAH], rpPerJiwa: s > 0 ? b / s : null}; })
    .sort((a, b) => mid(b.selamat) - mid(a.selamat) || mid(a.biaya) - mid(b.biaya));
}
/* kejadian paling genting hari ini = titik awal simulasi. kej = kejadian_aktif_awal.kejadian (urut skor), st = status.json kec {kunci: {b: [4 level], h3}}.
   Kejadian aktif dulu (skor tertinggi, kecamatan terparah di dalamnya); tanpa kejadian: kecamatan dengan level banjir tertinggi lalu hujan 3 hari terbesar */
function pilihAwal(kej, st) {
  const nilai = k => { const s = st?.[k]; return s ? [Math.max(...s.b), s.h3 || 0] : [-1, 0]; }, lebih = (a, b) => { const x = nilai(a), y = nilai(b); return x[0] - y[0] || x[1] - y[1]; };
  const top = (kej || []).filter(e => e.kec?.length).sort((a, b) => (b.skor || 0) - (a.skor || 0))[0];
  if (top) return {k: top.kec.slice().sort((a, b) => lebih(b, a))[0], kode: top.kode, sejak: top.sejak, sumber: "kejadian", level: top.level_tertinggi};
  const ks = Object.keys(st || {}).filter(k => nilai(k)[0] > 0).sort((a, b) => lebih(b, a)); return ks.length ? {k: ks[0], sumber: "status", level: nilai(ks[0])[0]} : null;
}
const API = {pilihAwal, LAJU_JALAN, ASUMSI, BIAYA, rasterJalan, kecepatan, waktuTempuh, analisisTanggap, jiwaTerpapar, kandidatPerlakuan, evakuasiDini, peringkat};
if (typeof module !== "undefined" && module.exports) module.exports = API; else akar.SimTanggap = API;
})(typeof self !== "undefined" ? self : globalThis);
