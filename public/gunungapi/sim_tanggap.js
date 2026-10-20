/* sim_tanggap.js: lapis tanggap simulasi gunung api. Fungsi murni tanpa DOM: jalan di peramban (window.Tanggap), di Worker (importScripts), dan di node (tests/gunungapi).
   Isi: gunung bawaan dari status MAGMA, graf jalan berbobot menit, evakuasi dengan kapasitas (kendaraan mandiri + armada), peringkat perlakuan, masker, bandara.
   Semua angka satuan (kapasitas, biaya, persen kendaraan pribadi) adalah ASUMSI yang bisa diganti lewat opsi; tidak ada yang dikalibrasi ke kejadian nyata. */
(function (root, buat) {
  const T = buat();
  if (typeof module === "object" && module.exports) module.exports = T; else root.Tanggap = T;
})(typeof self !== "undefined" ? self : globalThis, function () {
"use strict";
const BAWAAN = {
  mandiri: 0.6,            /* bagian warga yang mengungsi dengan kendaraan sendiri (ASUMSI) */
  orang_per_kend: 3.5,     /* orang per kendaraan pribadi (motor dan mobil, ASUMSI) */
  kap_jalan: 600,          /* kendaraan per jam yang bisa keluar lewat satu titik kumpul: jalan desa dua lajur (ASUMSI, di bawah 1.800 smp/jam/lajur HCM karena jalan gunung) */
  siaga_jam: 0.5,          /* jeda sejak perintah sampai kendaraan pertama berangkat (ASUMSI) */
  kap_armada: 40,          /* orang per truk/bus (ASUMSI) */
  muat_menit: 10,          /* waktu naik-turun per rit (ASUMSI) */
  hari_ungsi: 3,           /* lama mengungsi dasar (hari) */
  biaya_orang_hari: 50000, /* Rp per jiwa per hari (makan, air, tenda; ASUMSI, ganti dengan data BPBD) */
  biaya_armada_hari: 2500000, /* Rp per kendaraan armada per hari (sewa + BBM + sopir; ASUMSI) */
  masker_per_orang_hari: 2, masker_hari_ekstra: 2, biaya_masker: 3500,
};
const R_BUMI = 6371;
const jarakKm = (a, b, c, d) => { const r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r, h = Math.sin(y / 2) ** 2 + Math.cos(b * r) * Math.cos(d * r) * Math.sin(x / 2) ** 2; return 2 * R_BUMI * Math.asin(Math.sqrt(h)); };
const slug = n => String(n).toLowerCase().replace(/[^\p{L}\p{N} -]/gu, "").split(/\s+/).filter(Boolean).join("-");

/* ---------- gunung bawaan: level tertinggi hari ini; seri -> erupsi terbaru di MAGMA; seri lagi -> penduduk radius terbanyak ---------- */
function gunungBawaan(st) {
  const G = st?.gunung || []; if (!G.length) return null;
  const terbaru = {}; for (const e of st.letusan || []) { const w = Date.parse(e.waktu); if (w > (terbaru[slug(e.gunung)] ?? 0)) terbaru[slug(e.gunung)] = w; }
  return G.slice().sort((a, b) => b.level - a.level || (terbaru[slug(b.nama)] ?? 0) - (terbaru[slug(a.nama)] ?? 0) || (b.penduduk_radius || 0) - (a.penduduk_radius || 0))[0];
}

/* ---------- graf jalan berbobot MENIT. rute = [[ [lon,lat]... ]], kec[ri] = km/jam ruas itu (dari menit tempuh paparan per kelas jalan OSM) ---------- */
function bangunGraf(rute, kec, tujuan, titikDesa, kecAwal = 25) {
  const kunci = p => Math.round(p[0] * 1e4) + "," + Math.round(p[1] * 1e4), id = new Map(), pos = [], adj = [];
  const simpul = p => { const k = kunci(p); let i = id.get(k); if (i == null) { i = pos.length; id.set(k, i); pos.push(p); adj.push([]); } return i; };
  rute.forEach((c, ri) => { const v = kec[ri] > 0 ? kec[ri] : kecAwal; for (let q = 1; q < c.length; q++) { const a = simpul(c[q - 1]), b = simpul(c[q]), km = jarakKm(c[q - 1][0], c[q - 1][1], c[q][0], c[q][1]); adj[a].push([b, km / v * 60, ri, km]); adj[b].push([a, km / v * 60, ri, km]); } });
  const dekat = p => { let b = -1, bd = 3; for (let i = 0; i < pos.length; i++) { const d = jarakKm(p[0], p[1], pos[i][0], pos[i][1]); if (d < bd) { bd = d; b = i; } } return b < 0 ? null : [b, bd]; };
  return {pos, adj, tujuan: tujuan.map(dekat).filter(Boolean), dn: titikDesa.map(dekat), d0: null};
}
/* Dijkstra multi-sumber dari semua titik kumpul; mengembalikan menit ke titik kumpul terdekat. Ruas di tutupSet dilewati. */
function dijkstra(G, tutupSet) {
  const d = new Float64Array(G.pos.length).fill(Infinity), h = [], prev = new Int32Array(G.pos.length).fill(-1), pri = new Int32Array(G.pos.length).fill(-1), pw = new Float64Array(G.pos.length);
  const dorong = x => { h.push(x); let c = h.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (h[p][0] <= x[0]) break; h[c] = h[p]; c = p; } h[c] = x; };
  const ambil = () => { const t = h[0], x = h.pop(); if (h.length) { let c = 0; for (;;) { let a = 2 * c + 1; if (a >= h.length) break; if (a + 1 < h.length && h[a + 1][0] < h[a][0]) a++; if (h[a][0] >= x[0]) break; h[c] = h[a]; c = a; } h[c] = x; } return t; };
  for (const [i] of G.tujuan) { d[i] = 0; dorong([0, i]); }
  while (h.length) { const [du, u] = ambil(); if (du > d[u]) continue; for (const [v, w, ri] of G.adj[u]) { if (tutupSet.has(ri)) continue; if (du + w < d[v]) { d[v] = du + w; prev[v] = u; pri[v] = ri; pw[v] = w; dorong([d[v], v]); } } }
  d.prev = prev; d.pri = pri; d.pw = pw; return d;
}
/* ruas di jalur terpendek dari simpul n ke titik kumpul yang tersentuh bahaya: [[menit dari simpul, jam bahaya sampai di ruas]]; bahayaRuas[ri] = jam atau null */
function ruasBahaya(d, n, bahayaRuas) {
  const out = []; let v = n, off = 0;
  while (d.prev[v] >= 0 && out.length < 500) { off += d.pw[v]; const th = bahayaRuas[d.pri[v]]; if (th != null) out.push([off, th]); v = d.prev[v]; }
  return out;
}
/* kecepatan efektif tiap rute (km/jam) dari entri evakuasi paparan (km dan menit sudah memakai kecepatan per kelas jalan OSM): cocokkan ujung rute dengan "ke" */
function kecepatanRute(rute, evakuasi) {
  const k = p => Math.round(p[0] * 1e4) + "," + Math.round(p[1] * 1e4), per = new Map();
  for (const e of evakuasi || []) if (e.ke && e.km > 0 && e.menit > 0) per.set(k(e.dari) + ">" + k(e.ke), e.km / e.menit * 60);
  return rute.map(c => per.get(k(c[0]) + ">" + k(c[c.length - 1])) ?? 0);
}
const median = a => { const s = a.filter(x => x > 0).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };

/* ---------- paparan penduduk per piksel WorldPop ----------
   piksel [[lat, lon, jiwa]] (pusat piksel, jarak sx derajat), sel [[lat, lon, t]] = sel DEM yang kena (t = jam bahaya tiba), luasSelKm2 = luas satu sel DEM.
   frak = bagian luas piksel yang tersapu (penduduk dianggap merata di piksel: pembobot luas, bukan biner titik); t = bahaya paling awal di piksel. */
function paparPiksel(piksel, sx, sel, luasSelKm2) {
  if (!piksel.length) return [];
  const r0 = piksel[0], kunci = (la, lo) => Math.round((la - r0[0]) / sx) + "," + Math.round((lo - r0[1]) / sx), id = new Map(), n = new Float64Array(piksel.length), t = new Float64Array(piksel.length).fill(Infinity);
  piksel.forEach((p, i) => id.set(kunci(p[0], p[1]), i));
  for (const [la, lo, tt] of sel) { const i = id.get(kunci(la, lo)); if (i != null) { n[i]++; if (tt < t[i]) t[i] = tt; } }
  return piksel.map((p, i) => ({frak: Math.min(1, n[i] * luasSelKm2 / (sx * 111.32 * Math.cos(p[0] * Math.PI / 180) * sx * 110.57)), t: isFinite(t[i]) ? t[i] : null}));
}
const jiwaDalamRadius = (piksel, lat, lon, km) => piksel.reduce((a, p) => a + (jarakKm(lon, lat, p[1], p[0]) <= km ? p[2] : 0), 0);

/* ---------- evakuasi dengan kapasitas ----------
   o.desa = unit penduduk (piksel): [{jiwa, frak (bagian terpapar, bawaan 1), tempuh_menit, titik, bahaya_jam|null, titik_bahaya_jam|null, ruas: [[menit, jam]]}];
   o.mulai_jam: jam perintah relatif erupsi (negatif = sebelum); o.dalam: indeks unit yang diungsikan; o.armada: {n}.
   Aman = TIBA di titik kumpul sebelum bahaya sampai di unitnya, di titik kumpul, atau di ruas yang dilalui. "Terpapar" = jiwa x frak di unit yang dilanda awan panas/lahar. */
function evakuasi(o) {
  const P = {...BAWAAN, ...o.param}, D = o.desa, n = D.length, dalam = o.dalam instanceof Set ? o.dalam : new Set(o.dalam);
  const mulai = o.mulai_jam + P.siaga_jam, hit = i => D[i].bahaya_jam != null, fr = i => D[i].frak ?? 1;
  /* batas waktu aman unit: bahaya di unit, di titik kumpul, atau ruas jalannya yang dilalui lebih dulu */
  const lim = i => { const d = D[i]; let b = Math.min(d.bahaya_jam ?? Infinity, d.titik_bahaya_jam ?? Infinity); for (const [m, th] of d.ruas || []) if (mulai + m / 60 >= th) b = -Infinity; return b; };
  const selamat = new Float64Array(n), per = D.map(() => ({mandiri: 0, armada: 0, tiba_jam: null}));
  /* kendaraan pribadi: antrean FIFO per titik kumpul; selesai = max(tiba tanpa antre, titik kosong) + kendaraan / kapasitas */
  const grup = new Map(); for (const i of dalam) { const k = D[i].titik ?? "-"; (grup.get(k) || grup.set(k, []).get(k)).push(i); }
  let selesai = mulai;
  for (const idx of grup.values()) { idx.sort((a, b) => D[a].tempuh_menit - D[b].tempuh_menit); let kosong = -Infinity;
    for (const i of idx) { const d = D[i]; if (!isFinite(d.tempuh_menit)) continue; /* terputus: tak ada jalan ke titik kumpul */
      const jiwa = d.jiwa * P.mandiri, kend = jiwa / P.orang_per_kend, awal = Math.max(mulai + d.tempuh_menit / 60, kosong), akhir = awal + kend / P.kap_jalan; kosong = akhir;
      per[i].tiba_jam = akhir; selesai = Math.max(selesai, akhir); const L = lim(i);
      const f = !hit(i) ? 1 : L >= akhir ? 1 : L <= awal ? 0 : (akhir > awal ? (L - awal) / (akhir - awal) : 0); selamat[i] += jiwa * f; per[i].mandiri = jiwa * f; } }
  /* armada: tiap kendaraan bolak-balik dari titik kumpul; unit paling cepat terkena dilayani dulu; truk yang tak sempat tiba di unit sebelum bahaya tidak diberangkatkan */
  const N = Math.max(0, Math.floor(o.armada?.n || 0));
  if (N > 0) { const sisa = D.map((d, i) => dalam.has(i) ? d.jiwa * (1 - P.mandiri) : 0), urut = [...dalam].sort((a, b) => (D[a].bahaya_jam ?? 1e9) - (D[b].bahaya_jam ?? 1e9));
    const bebas = new Float64Array(N).fill(mulai); let rit = 0;
    for (const i of urut) { const d = D[i]; if (!isFinite(d.tempuh_menit)) continue; const L = lim(i);
      while (sisa[i] > 0.5 && rit < 50000) { let k = 0; for (let q = 1; q < N; q++) if (bebas[q] < bebas[k]) k = q;
        const ta = bebas[k] + d.tempuh_menit / 60; if (hit(i) && ta > L) break;   /* tak sempat tiba di unit sebelum bahaya: berhenti, kendaraan tak terpakai */
        const bawa = Math.min(P.kap_armada, sisa[i]), tiba = ta + P.muat_menit / 60 + d.tempuh_menit / 60; bebas[k] = tiba; sisa[i] -= bawa; rit++;
        selesai = Math.max(selesai, tiba); selamat[i] += bawa; per[i].armada += bawa; } } }
  let terpapar0 = 0, terpapar1 = 0, diungsi = 0;
  for (let i = 0; i < n; i++) { if (dalam.has(i)) diungsi += D[i].jiwa; if (hit(i)) { const f = fr(i); terpapar0 += D[i].jiwa * f; terpapar1 += f * (D[i].jiwa - Math.min(D[i].jiwa, selamat[i])); } }
  const hari = P.hari_ungsi + Math.ceil(Math.max(0, -o.mulai_jam) / 24), hariArmada = Math.max(1, Math.ceil(Math.max(0, selesai - o.mulai_jam) / 24));
  const biaya = diungsi * hari * P.biaya_orang_hari + N * hariArmada * P.biaya_armada_hari;
  return {diungsi, terpapar0, terpapar1, terselamatkan: terpapar0 - terpapar1, selesai_jam: selesai, biaya, hari, per};
}

/* ---------- peringkat perlakuan: paket radius x mulai x armada, tiap paket dijalankan lewat model yang sama ----------
   Hasil: semua paket, dengan pareto = tak ada paket lain yang menyelamatkan >= dengan biaya <=; peka = jiwa terselamatkan turun > 20% bila kapasitas jalan separuh
   atau kendaraan pribadi 40% (asumsi dilonggarkan ke sisi buruk). Urutan tampil: pareto menurut biaya naik, bukan "paling banyak jiwa". */
function peringkat(dasar, desa, pilihan) {
  const baris = [], jalan = (nama, ubah) => { const o = {...dasar, ...ubah}, dalam = dalamRadius(desa, o.radius_km), r = evakuasi({...o, desa, dalam}); baris.push({nama, ubah, o, dalam, r, biaya: r.biaya, selamat: r.terselamatkan}); };
  jalan("Rencana saat ini", {});
  const nm = j => j < 0 ? `${-j} jam sebelum erupsi` : j === 0 ? "saat erupsi" : `${j} jam sesudah erupsi`, A0 = dasar.armada?.n || 0;
  for (const km of new Set([...pilihan.radius, dasar.radius_km])) for (const j of new Set([...pilihan.mulai, dasar.mulai_jam])) for (const a of new Set([...pilihan.armada, A0])) {
    const ka = km !== dasar.radius_km, kb = j !== dasar.mulai_jam, kc = a !== A0; if (!ka && !kb && !kc) continue;
    jalan([ka ? `Radius ${km} km` : "", kb ? `mulai ${nm(j)}` : "", kc ? `armada ${a}` : ""].filter(Boolean).join(", ").replace(/^./, c => c.toUpperCase()), {radius_km: km, mulai_jam: j, armada: {n: a}}); }
  const dr = baris[0];
  baris.forEach(b => { b.pareto = !baris.some(c => c !== b && c.selamat >= b.selamat && c.biaya <= b.biaya && (c.selamat > b.selamat || c.biaya < b.biaya)); b.tambah_selamat = b.selamat - dr.selamat; b.tambah_biaya = b.biaya - dr.biaya; });
  const sulit = [{kap_jalan: BAWAAN.kap_jalan / 2}, {mandiri: 0.4}];
  baris.forEach(b => { if (!b.pareto) return; const m = Math.min(b.selamat, ...sulit.map(p => evakuasi({...b.o, desa, dalam: b.dalam, param: {...b.o.param, ...p}}).terselamatkan)); b.peka = b.selamat > 0 && (b.selamat - m) / b.selamat > 0.2; });
  const par = baris.filter(b => b.pareto && b !== dr).sort((a, b) => a.biaya - b.biaya || b.selamat - a.selamat);
  /* manfaat marginal terhadap pareto sebelumnya (jiwa per Rp miliar) */
  par.forEach((b, i) => { const p = i ? par[i - 1] : dr, db = b.biaya - p.biaya, ds = b.selamat - p.selamat; b.per_miliar = db > 0 && ds > 0 ? ds / (db / 1e9) : null; });
  return {dasar: dr, pareto: par, semua: baris.length};
}
const dalamRadius = (desa, km) => new Set(desa.map((d, i) => d.km <= km ? i : -1).filter(i => i >= 0));

/* ---------- masker: desa dengan hujan abu relatif >= ambang ---------- */
function masker(desa, o = {}) {
  const P = {...BAWAAN, ...o}, hari = Math.ceil((o.durasi_jam || 6) / 24) + P.masker_hari_ekstra, ambang = o.ambang ?? 0.1;
  const baris = desa.map((d, i) => ({i, n: (d.abu ?? 0) >= ambang ? Math.round(d.jiwa * P.masker_per_orang_hari * hari) : 0})).filter(x => x.n > 0);
  const total = baris.reduce((a, x) => a + x.n, 0);
  return {baris, total, hari, biaya: total * P.biaya_masker};
}

/* ---------- bandara tertutup abu: jejak[jam] = poligon [[lon,lat]] di atas ambang penerbangan; kembali jam pertama tertutup per bandara ---------- */
function dalamPoligon(x, y, poli) { let in_ = false; for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) { const [xi, yi] = poli[i], [xj, yj] = poli[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) in_ = !in_; } return in_; }
function bandaraTutup(bandara, jejak) {
  const out = []; for (const b of bandara) { for (const [jam, poli] of jejak) if (poli?.length > 2 && dalamPoligon(b.lon, b.lat, poli)) { out.push({...b, jam}); break; } }
  return out.sort((a, b) => a.jam - b.jam);
}

return {BAWAAN, jarakKm, slug, gunungBawaan, bangunGraf, dijkstra, kecepatanRute, median, evakuasi, peringkat, dalamRadius, paparPiksel, jiwaDalamRadius, ruasBahaya, masker, dalamPoligon, bandaraTutup};
});
