/* sim_armada.js — tab "Drones" dan "Resources" di Simulasi (tampilan ala FireTrace).
   Didaftarkan ke cangkang window.SimFT (sim_3d.js). SEMUA gerak dan angka dihitung dari hasil Sim (H.T jam tiba per sel, H.W cuaca,
   H.desa, H.tahan, K.air, K.desa, Sim.sumberRegu, Sim.op.L), deterministik: posisi = fungsi murni dari (t, detik putar).
   Insiden dan armadanya SIMULASI; visual ini TIDAK mengubah luas api (itu tetap hasil skenario yang dilihat).
   Asumsi (bukan data) semuanya di objek A di bawah, bernama dan satu tempat. */
(() => {
"use strict";
const RAD = Math.PI / 180;
const A = {
  NB: 72,                    /* tepi api dibagi 72 sektor 5° dari titik pusat; bentuk bintang, bukan cekungan asli */
  /* drone */
  TERBANG_MENIT: 72,         /* baterai 100% -> 20% lalu diganti di pangkalan */
  BAT_HABIS_MENIT: 90,       /* laju habis linier: 100%/90 menit (20% tersisa pada menit ke-72) */
  GANTI_MENIT: 8,            /* waktu tukar baterai di pangkalan */
  TRANSIT_MENIT: 4,          /* pangkalan -> stasiun, dan sebaliknya */
  OFS_MENIT: 13,             /* geser siklus antar drone supaya tidak ganti baterai serentak */
  PANGKALAN_M: 3000,         /* pangkalan drone: lawan angin dari pusat api (diperluas bila api tumbuh ke arahnya) */
  V_TEPI: 15, V_ORBIT: 18, V_SURVEI: 20, V_RELAI: 6,   /* m/s */
  R_KEPALA: 500, R_SAYAP: 400, R_DESA: 700, R_RELAI: 120,   /* jari-jari orbit (m) */
  SINYAL0: -48, SINYAL_D0_KM: .25, SINYAL_DEKADE: 22,  /* dBm = -48 - 22 log10(1 + jarak/0,25 km) */
  FOV: 42, VIEW_MIN_SEL: 5,  /* sudut pandang kamera; jendela termal minimal 5 sel setengah lebar (resolusi dibatasi kisi) */
  T_AKTIF_MAX: 1000, T_AKTIF_MIN: 600, /* °C: sel baru menyala 1000, satu jam kemudian 600 */
  TAU_DINGIN: 3, TAU_GAMBUT: 12,       /* jam: peluruhan eksponensial bara menuju suhu udara (gambut menyimpan panas lebih lama) */
  AMBANG_DETEKSI: 650,       /* °C */
  /* sumber daya: salinan nilai sim_perlakuan.js (PKA) dan index.html (KELOK, LAJU_DARAT); ganti bersama bila di sana berubah */
  MOB: 1, KELOK: 1.4, LAJU_DARAT: 40, MOB_HELI: 2, LAJU_HELI: 180, ISI_SIRAM: .06, L_MPA: 100, LAJU_MPA: 15,
  MOB_AT: 2, LAJU_AT: 300,   /* pesawat sayap tetap: asumsi sendiri */
  KAP_HELI: 3000, KAP_AT: 3000, KAP_WT: 5000,  /* liter: bucket heli 2-4 ribu (sim_perlakuan), Air Tractor AT-802 ~3.100 */
  DZ_MOB: 6, DZ_LAJU: 20, DZ_M_JAM: 500,       /* dozer: mobilisasi jam, km/jam, m garis/jam */
  PANGKALAN_UDARA_SIM_KM: 40, DAIR_SIM_KM: 5,  /* dipakai hanya bila data pangkalan udara / air OSM tidak ada */
  TERBANG_AWAL: 6, TERBANG_AKHIR: 17.5, ZONA: 7, /* pesawat terbang siang saja, jam lokal WIB */
  HEAD_GUARD: 60, GESER: 30, /* garis tidak dibangun di kepala api: geser ke sayap; antar regu digeser 30° */
  PANJANG_AT: 400, PANJANG_HELI: 120, JEJAK_JAM: 48, /* panjang jatuhan (m) dan lama jejak memudar */
  KOLOM: 4, PERSONEL_REGU: 15, PERS_UDARA: 2
};
const DR = [
  {kode: "FT-01", nama: "Elang", misi: "Pemetaan keliling", st: "Memetakan", tipe: "tepi", v: A.V_TEPI, alt: 600, jenis: "Sayap tetap VTOL", tugas: "Terbang menyusuri tepi api terkini, memetakan satu putaran penuh"},
  {kode: "FT-02", nama: "Alap", misi: "Jaga kepala api", st: "Orbit kepala api", tipe: "kepala", v: A.V_ORBIT, alt: 180, jenis: "Multirotor", tugas: "Mengorbit titik terjauh api searah angin"},
  {kode: "FT-03", nama: "Walet", misi: "Jaga sayap & loncatan", st: "Orbit sayap", tipe: "sayap", v: A.V_ORBIT, alt: 200, jenis: "Multirotor", tugas: "Memantau sayap api dan percikan yang meloncat"},
  {kode: "FT-04", nama: "Camar", misi: "Lindungi permukiman", st: "Patroli", tipe: "desa", v: A.V_ORBIT, alt: 230, jenis: "Multirotor", tugas: "Mengorbit desa terdekat dengan api"},
  {kode: "FT-05", nama: "Pipit", misi: "Survei titik panas", st: "Survei", tipe: "survei", v: A.V_SURVEI, alt: 480, jenis: "Sayap tetap", tugas: "Menyisir area terbakar bolak-balik mencari titik panas"},
  {kode: "FT-06", nama: "Kenari", misi: "Relai komunikasi", st: "Relai", tipe: "relai", v: A.V_RELAI, alt: 250, jenis: "Quadcopter", tugas: "Diam tinggi di antara pangkalan dan api sebagai relai radio"}
];
const SIKLUS = A.TERBANG_MENIT + A.GANTI_MENIT;

/* ============ inti hitung (murni, tanpa DOM) ============ */
const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, f) => a + (b - a) * f;
const brg = (dx, dy) => (Math.atan2(dx, dy) / RAD + 360) % 360;
const hh = t => Math.max(0, Math.min(72, Math.floor(t + 1e-9)));
const geo = K => K._sfg || (K._sfg = (() => {
  const kx = 111320 * Math.cos((K.y0 + K.y1) / 2 * RAD), ky = 110574;
  return {n: K.n, d: K.d, kx, ky, ll: (x, y) => [K.x0 + x / kx, K.y0 + y / ky], xy: (lo, la) => [(lo - K.x0) * kx, (la - K.y0) * ky]};
})());
const CA = new WeakMap();
const api = H => { let a = CA.get(H); if (!a) { const T = H.T, ord = []; for (let k = 0; k < T.length; k++) if (T[k] <= 72) ord.push(k); ord.sort((p, q) => T[p] - T[q]); CA.set(H, a = {ord, per: new Map()}); } return a; };
const wx = (H, h, k) => H.W?.[k]?.[Math.min(h, H.W[k].length - 1)];

/* tepi api pada jam bulat h: pusat, kepala/sayap (ekstrem searah & tegak lurus angin), poligon bintang 72 sektor */
function peri(K, H, h) {
  const a = api(H); let P = a.per.get(h); if (P) return P;
  const {n, d} = geo(K), T = H.T, ord = a.ord, NB = A.NB; let m = 0; while (m < ord.length && T[ord[m]] <= h) m++;
  let sx = 0, sy = 0; if (!m) { for (const k of K.benih) { sx += k % n; sy += (k / n) | 0; } m = K.benih.length || 1; sx /= m; sy /= m; } else { for (let q = 0; q < m; q++) { const k = ord[q]; sx += k % n; sy += (k / n) | 0; } sx /= m; sy /= m; }
  const cx = (sx + .5) * d, cy = (sy + .5) * d, bw = ((wx(H, h, "wd") ?? 90) + 180) % 360, ux = Math.sin(bw * RAD), uy = Math.cos(bw * RAD);
  const rad = new Float64Array(NB); let pH = -Infinity, pR = -Infinity, pL = -Infinity, pB = Infinity, bH = [cx, cy], fL = [cx, cy], fR = [cx, cy];
  const cells = m && ord.length && T[ord[0]] <= h ? ord.slice(0, m) : K.benih;
  for (const k of cells) { const x = ((k % n) + .5) * d - cx, y = (((k / n) | 0) + .5) * d - cy, r = Math.hypot(x, y), b = Math.floor(brg(x, y) / (360 / NB)) % NB;
    if (r + d * .7 > rad[b]) rad[b] = r + d * .7;
    const u = x * ux + y * uy, v = -x * uy + y * ux;
    if (u > pH) { pH = u; bH = [cx + x, cy + y]; } if (u < pB) pB = u; if (v > pL) { pL = v; fL = [cx + x, cy + y]; } if (-v > pR) { pR = -v; fR = [cx + x, cy + y]; } }
  const set = []; for (let i = 0; i < NB; i++) if (rad[i] > 0) set.push(i);
  if (!set.length) rad.fill(d * .7); else for (let i = 0; i < NB; i++) if (!(rad[i] > 0)) { let p = 1, q = 1; while (!(rad[(i - p + NB * 4) % NB] > 0)) p++; while (!(rad[(i + q) % NB] > 0)) q++; rad[i] = lerp(rad[(i - p + NB * 4) % NB], rad[(i + q) % NB], p / (p + q)); }
  const v = [], cum = [0]; for (let i = 0; i < NB; i++) { const b = (i + .5) * 360 / NB * RAD; v.push([cx + rad[i] * Math.sin(b), cy + rad[i] * Math.cos(b)]); }
  for (let i = 0; i < NB; i++) cum.push(cum[i] + Math.hypot(v[(i + 1) % NB][0] - v[i][0], v[(i + 1) % NB][1] - v[i][1]));
  P = {h, m, cx, cy, bw, ux, uy, rad, v, cum, len: cum[NB], head: bH, flL: fL, flR: fR, ext: {a0: -pR, a1: pL, b0: pB, b1: pH}};
  a.per.set(h, P); return P;
}
function at(P, s) {
  const L = P.len; s = ((s % L) + L) % L; let i = 0; while (i < A.NB - 1 && P.cum[i + 1] <= s) i++;
  const f = (s - P.cum[i]) / ((P.cum[i + 1] - P.cum[i]) || 1), p = P.v[i], q = P.v[(i + 1) % A.NB]; return [lerp(p[0], q[0], f), lerp(p[1], q[1], f)];
}
function arcB(P, b) { let f = b / (360 / A.NB) - .5; if (f < 0) f += A.NB; const i = Math.floor(f) % A.NB, fr = f - Math.floor(f); return P.cum[i] + fr * (P.cum[i + 1] - P.cum[i]); }
function seg(P, s0, L) {
  L = Math.min(L, .98 * P.len); const len = P.len; s0 = ((s0 % len) + len) % len; const out = [at(P, s0)];
  for (let lap = 0; lap < 2; lap++) for (let i = 0; i < A.NB; i++) { const pos = P.cum[i] + lap * len; if (pos > s0 + 1e-6 && pos < s0 + L - 1e-6) out.push(P.v[i]); }
  out.push(at(P, s0 + L)); return out;
}
const plen = p => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; };

/* suhu sel pada jam t (°C): menyala 1000->600 selama 1 jam, lalu dingin eksponensial menuju suhu udara; belum terbakar = suhu udara */
const jit = k => ((Math.imul(k, 2654435761) >>> 0) % 1000 / 1000 - .5) * 3;
function suhu(K, H, k, t) {
  const tc = wx(H, hh(t), "tc") ?? 30, Tk = H.T[k];
  if (!(Tk <= t)) return tc + jit(k);
  const a = t - Tk; if (a < 1) return A.T_AKTIF_MAX - (A.T_AKTIF_MAX - A.T_AKTIF_MIN) * a;
  return tc + (A.T_AKTIF_MIN - tc) * Math.exp(-(a - 1) / (K.gb?.[k] ? A.TAU_GAMBUT : A.TAU_DINGIN)) + jit(k) * .5;
}

/* pangkalan drone, di luar api, lawan angin */
function pangkalan(K, H) {
  const a = api(H); if (a.base) return a.base;
  const P0 = peri(K, H, 0), P72 = peri(K, H, 72), bf = (wx(H, 0, "wd") ?? 90) * RAD;
  const dist = Math.max(A.PANGKALAN_M, P72.rad[Math.floor(((bf / RAD) % 360) / (360 / A.NB)) % A.NB] + Math.hypot(P72.cx - P0.cx, P72.cy - P0.cy) + 1000);
  return a.base = [P0.cx + dist * Math.sin(bf), P0.cy + dist * Math.cos(bf)];
}
function desaJaga(K, H) {
  const a = api(H); if (a.desa !== undefined) return a.desa;
  const g = geo(K); let d = H.desa?.[0]; if (!d) { const P0 = peri(K, H, 0); let best = Infinity; for (const x of K.desa || []) { const [px, py] = g.xy(x.lon, x.lat), e = Math.hypot(px - P0.cx, py - P0.cy); if (e < best) { best = e; d = x; } } }
  return a.desa = d ? {...d, xy: g.xy(d.lon, d.lat)} : null;
}
const orbit = (c, r, v, tau, ph) => { const an = ph + v / r * tau; return [c[0] + r * Math.sin(an), c[1] + r * Math.cos(an), c[0], c[1]]; };
function jalurDrone(i, K, H, t, tau) {
  const c = DR[i], P = peri(K, H, hh(t));
  switch (c.tipe) {
    case "tepi": { const p = at(P, c.v * tau), q = at(P, c.v * (tau + 25)); return [p[0], p[1], q[0], q[1]]; }
    case "kepala": return orbit([P.head[0] + 150 * P.ux, P.head[1] + 150 * P.uy], A.R_KEPALA, c.v, tau, 0);
    case "sayap": return orbit(P.flL, A.R_SAYAP, c.v, tau, 1.3);
    case "desa": { const d = desaJaga(K, H); return orbit(d ? d.xy : [P.cx + P.ux * 3000, P.cy + P.uy * 3000], A.R_DESA, c.v, tau, 2.1); }
    case "relai": { const B = pangkalan(K, H), r = [lerp(B[0], P.cx, .55), lerp(B[1], P.cy, .55)]; return orbit(r, A.R_RELAI, c.v, tau, 0).slice(0, 2).concat([P.cx, P.cy]); }
    default: { /* survei: lawnmower 4 baris, bolak-balik, sumbu searah/tegak lurus angin */
      const e = P.ext, w = Math.max(e.a1 - e.a0, geo(K).d * 2), b0 = e.b0, db = Math.max(e.b1 - e.b0, geo(K).d * 2), R = 4, a0 = e.a0, a1 = a0 + w, y = r => b0 + (r + .5) / R * db;
      const q = [[a0, y(0)], [a1, y(0)], [a1, y(1)], [a0, y(1)], [a0, y(2)], [a1, y(2)], [a1, y(3)], [a0, y(3)]];
      const xy = ([a, b]) => [P.cx - a * P.uy + b * P.ux, P.cy + a * P.ux + b * P.uy], pts = q.map(xy), Lq = plen(pts);
      const ping = s => { const m = ((s % (2 * Lq)) + 2 * Lq) % (2 * Lq); let z = m < Lq ? m : 2 * Lq - m, j = 1; while (j < pts.length - 1 && z > plen(pts.slice(0, j + 1))) j++;
        const s0 = plen(pts.slice(0, j)), l = plen(pts.slice(j - 1, j + 1)) || 1, f = Math.max(0, Math.min(1, (z - s0) / l)); return [lerp(pts[j - 1][0], pts[j][0], f), lerp(pts[j - 1][1], pts[j][1], f)]; };
      const p = ping(c.v * tau), q2 = ping(c.v * (tau + 12)); return [p[0], p[1], q2[0], q2[1]];
    }
  }
}
/* posisi drone i pada jam t dan detik putar sec: fungsi murni, tanpa keadaan */
function dronePos(K, H, i, t, sec = 0) {
  const c = DR[i], tau = t * 3600 + sec, cy = (((t * 60 + sec / 60 + i * A.OFS_MENIT) % SIKLUS) + SIKLUS) % SIKLUS, B = pangkalan(K, H), j = jalurDrone(i, K, H, t, tau);
  const udara = cy < A.TERBANG_MENIT; let f = 1;
  if (!udara) f = 0; else if (cy < A.TRANSIT_MENIT) f = sm(cy / A.TRANSIT_MENIT); else if (cy > A.TERBANG_MENIT - A.TRANSIT_MENIT) f = sm((A.TERBANG_MENIT - cy) / A.TRANSIT_MENIT);
  const x = lerp(B[0], j[0], f), y = lerp(B[1], j[1], f), alt = f * (c.alt + 12 * Math.sin(tau / 9 + i));
  const dh = Math.hypot(j[2] - x, j[3] - y), pitch = -Math.max(15, Math.min(90, Math.atan2(alt, Math.max(1, dh)) / RAD));
  const st = !udara ? "Ganti baterai" : cy < A.TRANSIT_MENIT ? "Lepas landas" : cy > A.TERBANG_MENIT - A.TRANSIT_MENIT ? "Kembali" : c.st;
  return {x, y, alt, tx: lerp(B[0], j[2], f), ty: lerp(B[1], j[3], f), udara, st, menit: udara ? cy : 0, pitch,
    bat: udara ? 100 - cy * 100 / A.BAT_HABIS_MENIT : 20 + (cy - A.TERBANG_MENIT) / A.GANTI_MENIT * 80};
}
function gerakDrone(K, H, i, t, sec) {
  const p = dronePos(K, H, i, t, sec), q = dronePos(K, H, i, t, sec + 1), dx = q.x - p.x, dy = q.y - p.y;
  const B = pangkalan(K, H), R = dronePos(K, H, 5, t, sec), rl = i === 5 ? B : [R.x, R.y], dk = Math.hypot(p.x - rl[0], p.y - rl[1]) / 1000;
  return {...p, kmj: Math.hypot(dx, dy) * 3.6, arah: brg(dx, dy), dbm: A.SINYAL0 - A.SINYAL_DEKADE * Math.log10(1 + dk / A.SINYAL_D0_KM), gim: brg(p.tx - p.x, p.ty - p.y)};
}
/* pandangan kamera: jendela di sekitar target; suhu maks dari sel di dalamnya */
function pandang(K, H, t, p, zoom = 1) {
  const {n, d} = geo(K), hw = Math.max(A.VIEW_MIN_SEL * d, p.alt * Math.tan(A.FOV / 2 * RAD)) / zoom, c0 = Math.max(0, Math.floor((p.tx - hw) / d)), c1 = Math.min(n - 1, Math.floor((p.tx + hw) / d)), r0 = Math.max(0, Math.floor((p.ty - hw) / d)), r1 = Math.min(n - 1, Math.floor((p.ty + hw) / d));
  let mx = -Infinity, km = -1; for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) { const k = j * n + i, s = suhu(K, H, k, t); if (s > mx) { mx = s; km = k; } }
  return {hw, maks: mx, k: km};
}
/* deteksi: per jam bulat, sel menyala terpanas di pandangan tiap drone yang mengudara; sel yang sama dicatat sekali */
function deteksi(K, H) {
  const a = api(H); if (a.det) return a.det; const out = [], lihat = new Set(), g = geo(K), n = g.n;
  for (let h = 0; h <= 72; h++) for (let i = 0; i < DR.length; i++) { const p = dronePos(K, H, i, h, 0); if (!p.udara) continue;
    const v = pandang(K, H, h, p); if (v.k < 0 || v.maks < A.AMBANG_DETEKSI || lihat.has(v.k)) continue; lihat.add(v.k);
    const ll = g.ll(((v.k % n) + .5) * g.d, (((v.k / n) | 0) + .5) * g.d); out.push({h, i, suhu: v.maks, k: v.k, lon: ll[0], lat: ll[1]}); }
  return a.det = out;
}

/* ============ sumber daya ============ */
const jarakKm = (a1, o1, a2, o2) => { const h = Math.sin((a2 - a1) * RAD / 2) ** 2 + Math.cos(a1 * RAD) * Math.cos(a2 * RAD) * Math.sin((o2 - o1) * RAD / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const pad = n => String(n).padStart(2, "0");
function sumberAir(K, P0) {
  const {n, d} = geo(K); let best = Infinity, bk = -1;
  if (K.air) for (let k = 0; k < K.air.length; k++) if (K.air[k]) { const e = Math.hypot(((k % n) + .5) * d - P0.cx, (((k / n) | 0) + .5) * d - P0.cy); if (e < best) { best = e; bk = k; } }
  if (bk >= 0) return {xy: [((bk % n) + .5) * d, (((bk / n) | 0) + .5) * d], km: best / 1000, sim: false};
  return {xy: [P0.cx - P0.uy * A.DAIR_SIM_KM * 1000, P0.cy + P0.ux * A.DAIR_SIM_KM * 1000], km: A.DAIR_SIM_KM, sim: true};
}
function susun(ctx) {
  const {Sim, K, H} = ctx, g = geo(K), P0 = peri(K, H, 0), L = Sim?.op?.L || 150, sr = Sim?.sumberRegu || {}, U = [];
  const km0 = o => Math.hypot(o[0] - P0.cx, o[1] - P0.cy) / 1000, regu = typeof reguPosko === "function" ? reguPosko : () => 1;
  let nE = 0, nC = 0; const addE = (ln, o, rg, nyata, sumber) => { const dk = km0(o); U.push({kode: "E-" + pad(++nE), jenis: "E", grup: "darat", ln, nyata, sumber, o, tMob: A.MOB, T0: A.MOB + dk * A.KELOK / A.LAJU_DARAT, regu: rg, pers: rg * A.PERSONEL_REGU, P: rg * L, v: A.LAJU_DARAT, jarak: dk, ket: `${rg} regu darat`}); };
  if (sr.ps) addE("Regu posko " + (sr.ps.id || ""), g.xy(sr.ps.lon, sr.ps.lat), regu(sr.ps), true, "posko");
  if (sr.dk) addE(sr.dk.nama || "Regu Daops", g.xy(sr.dk.lon, sr.dk.lat), sr.dk.regu || 1, true, "Daops");
  if (!nE) addE("Regu simulasi", [P0.cx - P0.ux * 20000, P0.cy - P0.uy * 20000], 2, false, "simulasi");
  const e1 = U[0]; U.push({kode: "WT-01", jenis: "WT", grup: "darat", ln: "Mobil tangki air", nyata: false, sumber: "simulasi", o: e1.o, tMob: e1.tMob, T0: e1.T0, pers: 2, kap: A.KAP_WT, ikut: e1.kode, v: A.LAJU_DARAT, ket: `${A.KAP_WT} L, mendukung ${e1.kode}`});
  /* MPA desa terdekat (data desa OSM), asumsi tiba dari sim_perlakuan */
  let ds = null, bd = Infinity; for (const x of K.desa || []) { const o = g.xy(x.lon, x.lat), e = Math.hypot(o[0] - P0.cx, o[1] - P0.cy); if (e < bd) { bd = e; ds = {...x, o}; } }
  if (ds && bd / 1000 <= 25) U.push({kode: "C-" + pad(++nC), jenis: "C", grup: "kru", ln: "MPA desa " + ds.nama, nyata: true, sumber: "data desa", o: ds.o, tMob: 0, T0: .5 + bd / 1000 * A.KELOK / A.LAJU_MPA, regu: 1, pers: A.PERSONEL_REGU, P: A.L_MPA, v: A.LAJU_MPA, jarak: bd / 1000, ket: "1 regu warga"});
  U.push({kode: "DZ-01", jenis: "DZ", grup: "kru", ln: "Dozer pembuka sekat", nyata: false, sumber: "simulasi", o: e1.o, tMob: A.MOB, T0: A.DZ_MOB + e1.jarak * A.KELOK / A.DZ_LAJU, regu: 1, pers: 2, P: A.DZ_M_JAM, v: A.DZ_LAJU, jarak: e1.jarak, ket: `${A.DZ_M_JAM} m/jam`});
  /* udara: pangkalan dari kandidat sim_perlakuan (Sim.pk.C) atau berkas udara (Lapis.cache.udara), cadangan simulasi */
  const pks = (Sim?.pk?.C || []).filter(c => c.jenis === "heli" && c.pangkalan).map(c => c.pangkalan);
  const ud = typeof Lapis !== "undefined" ? Lapis.cache?.udara : null, fl = ctx.Sim?.f?.properties;
  const bandara = pks.length ? pks.slice(0, 2) : ud?.heli && fl ? ud.heli.map(h => ({...h, d: jarakKm(fl.lat, fl.lon, h.lat, h.lon)})).filter(h => h.d <= 500).sort((a, b) => a.d - b.d).slice(0, 2) : [];
  const simB = {nama: "pangkalan simulasi", sim: true, o: [P0.cx - P0.ux * A.PANGKALAN_UDARA_SIM_KM * 1000, P0.cy - P0.uy * A.PANGKALAN_UDARA_SIM_KM * 1000]};
  const pang = (bandara.length ? bandara : [simB]).map(b => b.o ? b : {...b, o: g.xy(b.lon, b.lat)}), air = sumberAir(K, P0), kmF = o => Math.hypot(o[0] - P0.cx, o[1] - P0.cy) / 1000;
  const tcOf = (src, v) => Math.max(.08, 2 * Math.max(.5, kmF(src)) / v + A.ISI_SIRAM);
  U.push({kode: "AT-01", jenis: "AT", grup: "udara", ln: "Air Tractor AT-802", nyata: false, sumber: "simulasi", base: pang[0].o, src: pang[0].o, tMob: A.MOB_AT, T0: A.MOB_AT, kap: A.KAP_AT, v: A.LAJU_AT, pers: A.PERS_UDARA, Tc: tcOf(pang[0].o, A.LAJU_AT), isi: "retardan", air: false, ket: `pesawat retardan, isi ulang di ${pang[0].nama}`, idx: 0});
  pang.slice(0, 2).forEach((b, q) => U.push({kode: "H-" + pad(q + 1), jenis: "H", grup: "udara", ln: "Heli " + (b.icao ? b.icao + " " : "") + b.nama, nyata: !b.sim, sumber: b.sim ? "simulasi" : "pangkalan udara", base: b.o, src: air.xy, tMob: A.MOB_HELI, T0: A.MOB_HELI + kmF(b.o) / A.LAJU_HELI, kap: A.KAP_HELI, v: A.LAJU_HELI, pers: A.PERS_UDARA, Tc: tcOf(air.xy, A.LAJU_HELI), isi: air.sim ? "air (asumsi " + air.km + " km)" : "air (" + (Math.round(air.km * 10) / 10).toLocaleString("id-ID") + " km)", air: true, ket: `heli bucket ${A.KAP_HELI} L`, idx: q + 1}));
  return U;
}
/* jendela terbang siang (jam sim) yang berpotongan dengan [T0, 72] */
function jendela(mulai, T0) {
  const h0 = (mulai.getUTCHours() + mulai.getUTCMinutes() / 60 + A.ZONA) % 24, out = []; let acc = 0;
  for (let day = -1; day < 5; day++) { const a = Math.max(T0, A.TERBANG_AWAL - h0 + 24 * day), b = Math.min(72, A.TERBANG_AKHIR - h0 + 24 * day); if (b > a) { out.push({a, b, acc}); acc += b - a; } }
  return out;
}
const opAcc = (u, t) => { let s = 0; for (const w of u.W) s += t >= w.b ? w.b - w.a : t > w.a ? t - w.a : 0; return s; };
function siapUdara(K, H, u, mulai) {
  if (u.ev) return; u.W = jendela(mulai, u.T0); u.ev = []; let acc = 0, next = .5 * u.Tc;
  for (const w of u.W) { const av = w.b - w.a; while (next <= acc + av + 1e-12) { const tj = w.a + (next - acc), k = u.ev.length, P = peri(K, H, hh(tj)), th = P.bw + (((k * 47 + u.idx * 31) % 101) - 50) * 2, s0 = arcB(P, ((th % 360) + 360) % 360), Lp = u.jenis === "AT" ? A.PANJANG_AT : A.PANJANG_HELI;
      const pts = seg(P, s0, Lp), mid = at(P, s0 + Math.min(Lp, .98 * P.len) / 2); u.ev.push({tj, x: mid[0], y: mid[1], pts, vol: u.kap}); next += u.Tc; } acc += av; }
}
const volumeSd = (u, t) => { let c = 0; for (const e of u.ev || []) if (e.tj <= t) c++; return c * u.kap; };
const udaraKe = (u, t) => u.ev.filter(e => e.tj <= t).length;
function jangkar(P, u, rank) {
  const b0 = brg(u.o[0] - P.cx, u.o[1] - P.cy); let rel = ((b0 - P.bw + 540) % 360) - 180; if (Math.abs(rel) < A.HEAD_GUARD) rel = rel >= 0 ? 90 : -90;
  const sign = rel >= 0 ? 1 : -1; return {s0: arcB(P, (((P.bw + rel + sign * rank * A.GESER) % 360) + 360) % 360), sign};
}
const garisPts = (P, j, Lg) => j.sign > 0 ? seg(P, j.s0, Lg) : seg(P, j.s0 - Lg, Lg).reverse();
/* keadaan unit pada jam t: posisi (m), status, garis (darat), muatan (udara) */
function unitKe(K, H, U, u, t) {
  if (u.jenis === "WT") { const e = U.find(x => x.kode === u.ikut), s = unitKe(K, H, U, e, t); return {...s, x: s.x + 60, y: s.y + 40, st: t < u.tMob ? "Siaga" : t < u.T0 ? "Menuju " + u.ikut : "Mendukung " + u.ikut, L: 0, pts: null}; }
  if (u.grup === "udara") {
    if (t < u.tMob) return {x: u.base[0], y: u.base[1], st: "Siaga", alt: 0, load: 0};
    if (t < u.T0) { const f = (t - u.tMob) / (u.T0 - u.tMob); return {x: lerp(u.base[0], u.src[0], f), y: lerp(u.base[1], u.src[1], f), st: "Menuju", alt: 150, load: 0}; }
    const ac = opAcc(u, t), on = u.W.some(w => t >= w.a && t < w.b); if (!on) return {x: u.base[0], y: u.base[1], st: "Siaga", alt: 0, load: 0};
    const q = ac / u.Tc, k = Math.floor(q), ph = q - k, e = u.ev[Math.min(k, u.ev.length - 1)] || {x: peri(K, H, hh(t)).cx, y: peri(K, H, hh(t)).cy}, hi = u.jenis === "AT" ? 120 : 70, lo = u.jenis === "AT" ? 50 : 30;
    const f = ph < .5 ? ph / .5 : (ph - .5) / .5, a = ph < .5 ? u.src : [e.x, e.y], b = ph < .5 ? [e.x, e.y] : u.src;
    const st = ph < .06 || ph > .94 ? "Isi " + (u.jenis === "AT" ? "retardan" : "air") : ph < .5 ? "Menuju siram" : ph < .56 ? "Siram" : "Kembali isi";
    return {x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), st, alt: lo + hi * Math.abs(Math.sin(2 * Math.PI * ph)), load: ph < .06 ? u.kap * ph / .06 : ph < .5 ? u.kap : ph < .56 ? u.kap * (1 - (ph - .5) / .06) : 0};
  }
  const rank = U.filter(x => x.P).indexOf(u);
  if (t < u.tMob) return {x: u.o[0], y: u.o[1], st: "Siaga", L: 0};
  if (t < u.T0) { const P0 = peri(K, H, hh(u.T0)), a = at(P0, jangkar(P0, u, rank).s0), f = (t - u.tMob) / (u.T0 - u.tMob); return {x: lerp(u.o[0], a[0], f), y: lerp(u.o[1], a[1], f), st: "Menuju", L: 0}; }
  const P = peri(K, H, hh(t)), raw = u.P * (t - u.T0), Lg = Math.min(raw, .98 * P.len), pts = garisPts(P, jangkar(P, u, rank), Lg), tip = pts[pts.length - 1];
  return {x: tip[0], y: tip[1], st: (H.tahan != null && t >= H.tahan) || raw >= .98 * P.len ? "Pendinginan" : u.jenis === "DZ" ? "Membuka sekat" : "Membangun garis", L: Lg, pts};
}
const gerakUnit = (K, H, U, u, t) => { const e = .01, p = unitKe(K, H, U, u, Math.max(0, t - e)), q = unitKe(K, H, U, u, Math.min(72, t + e)), dx = q.x - p.x, dy = q.y - p.y; return {kmj: Math.hypot(dx, dy) / ((Math.min(72, t + e) - Math.max(0, t - e)) * 3600) * 3.6, arah: brg(dx, dy)}; };
/* deret kumulatif untuk 3 grafik bawah (jam bulat 0..72) */
function deret(K, H, U) {
  const a = api(H); if (a.der) return a.der; const vol = [], gar = [], per = [];
  for (let h = 0; h <= 72; h++) { vol.push(U.reduce((s, u) => s + (u.ev ? volumeSd(u, h) : 0), 0));
    const P = peri(K, H, h); gar.push(U.reduce((s, u) => s + (u.P && h > u.T0 ? Math.min(u.P * (h - u.T0), .98 * P.len) : 0), 0) / 1000);
    per.push(U.reduce((s, u) => s + (h >= u.tMob ? u.pers : 0), 0)); }
  return a.der = {vol, gar, per};
}
const log = (U, t) => U.filter(u => u.ev).flatMap(u => u.ev.filter(e => e.tj <= t).map(e => ({...e, u}))).sort((a, b) => b.tj - a.tj);

/* ============ pengungkit ke DOM (dipakai dua tab) ============ */
const IK = d => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IKN = {
  drone: IK('<circle cx="12" cy="12" r="2"/><circle cx="5" cy="5" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/>'),
  sayap: IK('<path d="M2 14l9-2V4l2 0v8l9 2v2l-9-1v4l3 2v1H8v-1l3-2v-4l-9 1z"/>'),
  heli: IK('<path d="M3 5h18M12 5v4"/><path d="M5 12a5 4 0 0 1 5-4h5a4 4 0 0 1 4 4v2H8a3 3 0 0 1-3-2z"/><path d="M8 17l-1 3M16 17l1 3M3 19h18"/>'),
  at: IK('<path d="M2 14l9-2V4l2 0v8l9 2v2l-9-1v4l3 2v1H8v-1l3-2v-4l-9 1z"/>'),
  engine: IK('<path d="M3 16V9h11v7M14 11h4l3 3v2H3"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>'),
  tangki: IK('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  kru: IK('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6M16 11a3 3 0 0 0 0-6M18 14c2 .8 3 3 3 5"/>'),
  dozer: IK('<path d="M4 17h14l2-5h-5V8H8v4H4zM2 20h18"/><path d="M20 10l2 8"/>'),
  x: IK('<path d="M6 6l12 12M18 6L6 18"/>'), plus: IK('<path d="M12 5v14M5 12h14"/>'), min: IK('<path d="M5 12h14"/>'),
  penuh: IK('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'), kamera: IK('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>')
};
const IKJ = {E: IKN.engine, WT: IKN.tangki, C: IKN.kru, DZ: IKN.dozer, H: IKN.heli, AT: IKN.at};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const n0 = v => Math.round(v).toLocaleString("id-ID");
const n1 = v => (Math.round(v * 10) / 10).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const wibJam = (mulai, t) => { const d = new Date(mulai.getTime() + t * 36e5 + A.ZONA * 36e5); return `${pad(d.getUTCHours())}.${pad(d.getUTCMinutes())}`; };
const wibTgl = (mulai, t) => { const d = new Date(mulai.getTime() + t * 36e5 + A.ZONA * 36e5); return `${d.getUTCDate()} ${BLN[d.getUTCMonth()]} ${pad(d.getUTCHours())}.${pad(d.getUTCMinutes())} WIB`; };
const koor = (lat, lon) => { const f = v => Math.abs(v).toLocaleString("id-ID", {minimumFractionDigits: 3, maximumFractionDigits: 3}); return `${f(lat)}° ${lat < 0 ? "LS" : "LU"}, ${f(lon)}° BT`; };
const ARAH8 = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"], arah8 = b => ARAH8[Math.round(b / 45) % 8];
const mmss = mnt => { const s = Math.round(mnt * 60); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`; };

/* palet termal (LUT 256) */
const PAL = {ironbow: [[0, [0, 0, 20]], [.18, [40, 10, 110]], [.38, [120, 15, 140]], [.55, [200, 40, 90]], [.72, [240, 110, 30]], [.88, [255, 210, 60]], [1, [255, 255, 230]]], white: [[0, [10, 10, 10]], [1, [255, 255, 255]]]};
const LUT = {}; for (const nm in PAL) { const l = new Uint8Array(256 * 3), s = PAL[nm]; for (let i = 0; i < 256; i++) { const f = i / 255; let q = 1; while (q < s.length - 1 && s[q][0] < f) q++; const a = s[q - 1], b = s[q], z = (f - a[0]) / ((b[0] - a[0]) || 1); for (let c = 0; c < 3; c++) l[i * 3 + c] = lerp(a[1][c], b[1][c], Math.max(0, Math.min(1, z))); } LUT[nm] = l; }
const norm = (T, lo) => Math.pow(Math.max(0, Math.min(1, (T - lo) / (A.T_AKTIF_MAX - lo))), .45);
/* gambar jendela termal di canvas w x h; kembalikan suhu maks. Putar supaya atas layar = arah kamera. */
function gambarIR(cv, K, H, t, p, pan, arah, pal, zoom) {
  const {n, d} = geo(K), w = cv.width, hgt = cv.height, ctx = cv.getContext("2d"), img = ctx.createImageData(w, hgt), px = img.data, lut = LUT[pal], tc = wx(H, hh(t), "tc") ?? 30, lo = tc - 8;
  const hw = pan.hw, R = hw * 1.5, c0 = Math.max(0, Math.floor((p.tx - R) / d) - 1), c1 = Math.min(n - 1, Math.floor((p.tx + R) / d) + 1), r0 = Math.max(0, Math.floor((p.ty - R) / d) - 1), r1 = Math.min(n - 1, Math.floor((p.ty + R) / d) + 1);
  const gw = c1 - c0 + 1, gh = r1 - r0 + 1, G = new Float32Array(gw * gh); for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) G[j * gw + i] = suhu(K, H, (r0 + j) * n + c0 + i, t);
  const ca = Math.cos(arah * RAD), sa = Math.sin(arah * RAD), asp = w / hgt;
  for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
    const sx = (x / (w - 1) * 2 - 1) * asp, sy = 1 - y / (hgt - 1) * 2, e = p.tx + hw * (sx * ca + sy * sa), no = p.ty + hw * (-sx * sa + sy * ca);
    const fx = Math.max(0, Math.min(gw - 1.001, e / d - .5 - c0)), fy = Math.max(0, Math.min(gh - 1.001, no / d - .5 - r0)), i = Math.floor(fx), j = Math.floor(fy), ax = fx - i, ay = fy - j, o = j * gw + i;
    const T = lerp(lerp(G[o], G[o + 1], ax), lerp(G[o + gw], G[o + gw + 1], ax), ay), q = Math.round(norm(T, lo) * 255) * 3, z = (y * w + x) * 4; px[z] = lut[q]; px[z + 1] = lut[q + 1]; px[z + 2] = lut[q + 2]; px[z + 3] = 255; }
  ctx.putImageData(img, 0, 0);
}
function kanvasApi(K, H, t, cv) {
  const n = K.n; if (cv.width !== n) cv.width = cv.height = n; const c = cv.getContext("2d"), img = c.createImageData(n, n), px = img.data, T = H.T;
  for (let k = 0; k < T.length; k++) { const v = T[k]; if (!(v <= t)) continue; const a = t - v, o = ((n - 1 - ((k / n) | 0)) * n + k % n) * 4;
    if (a < 1) { px[o] = 255; px[o + 1] = 120 + 110 * a; px[o + 2] = 30 + 60 * a; px[o + 3] = 235; } else { px[o] = 40; px[o + 1] = 26; px[o + 2] = 20; px[o + 3] = 150; } }
  c.putImageData(img, 0, 0);
}

/* ============ keadaan UI bersama ============ */
const koorKisi = K => [[K.x0, K.y1], [K.x1, K.y1], [K.x1, K.y0], [K.x0, K.y0]];
const kosong = () => ({type: "FeatureCollection", features: []});
const feat = (g, pr) => ({type: "Feature", geometry: g, properties: pr || {}});
function pastikanSumber(m, id, def) { if (!m.getSource(id)) m.addSource(id, {type: "geojson", data: kosong()}); return m.getSource(id); }
function pastikanLapis(m, def, sebelum) { if (!m.getLayer(def.id)) m.addLayer(def, sebelum && m.getLayer(sebelum) ? sebelum : undefined); }
function bersihPeta(m, lapis, sumber) { if (!m) return; for (const l of lapis) if (m.getLayer(l)) m.removeLayer(l); for (const s of sumber) if (m.getSource(s)) m.removeSource(s); }
const nodeDari = h => { const t = document.createElement("div"); t.innerHTML = h.trim(); return t.firstElementChild; };
function chart(judul, ket, seri, o) { /* seri: [{a: [..], w: warna, tebal}]; o: {x0,x1 label, ymin, ymax, fmt, kursor 0..1} */
  const W = 230, Hh = 92, pl = 30, pr = 8, pt = 6, pb = 16, ymax = o.ymax ?? Math.max(1, ...seri.flatMap(s => s.a)), ymin = o.ymin ?? 0, X = i => pl + i / Math.max(1, seri[0].a.length - 1) * (W - pl - pr), Y = v => pt + (1 - (v - ymin) / ((ymax - ymin) || 1)) * (Hh - pt - pb);
  const path = a => a.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  const u = seri[seri.length - 1], ut = o.kursor != null ? Math.round(o.kursor * (u.a.length - 1)) : u.a.length - 1;
  return `<figure class="sf-fig"><div class="sf-fh"><span class="sf-pill">${judul}</span><em>${ket || ""}</em></div><svg viewBox="0 0 ${W} ${Hh}" class="sf-g" role="img" aria-label="${judul}">
    ${[0, 1].map(f => `<line x1="${pl}" x2="${W - pr}" y1="${Y(ymin + (ymax - ymin) * f)}" y2="${Y(ymin + (ymax - ymin) * f)}"/><text x="${pl - 3}" y="${Y(ymin + (ymax - ymin) * f) + 3}" text-anchor="end">${o.fmt ? o.fmt(ymin + (ymax - ymin) * f) : n0(ymin + (ymax - ymin) * f)}</text>`).join("")}
    <text x="${pl}" y="${Hh - 3}">${o.x0}</text><text x="${W - pr}" y="${Hh - 3}" text-anchor="end">${o.x1}</text>
    ${o.isi ? `<path d="${path(u.a)}L${X(u.a.length - 1)},${Y(ymin)}L${X(0)},${Y(ymin)}Z" fill="${u.w}" opacity=".15"/>` : ""}
    ${seri.map(s => `<path d="${path(s.a)}" fill="none" stroke="${s.w}" stroke-width="${s.tebal || 1.6}" ${s.redup ? 'opacity=".45"' : ""}/>`).join("")}
    <circle cx="${X(ut)}" cy="${Y(u.a[ut])}" r="3" fill="${u.w}"/>${o.kursor != null ? `<line class="k" x1="${X(ut)}" x2="${X(ut)}" y1="${pt}" y2="${Hh - pb}"/>` : ""}</svg></figure>`;
}

/* ============ TAB DRONES ============ */
const D = {sel: 0, mode: "IR", pal: "ironbow", zoom: 1, full: false, pip: null, eo: null, t: 0, last: 0, panel: 0, raf: 0, mk: [], ctx: null, detTampil: ""};
function dTutup(ctx) {
  D.on = false; cancelAnimationFrame(D.raf); D.mk.forEach(m => m.remove()); D.mk = []; dEoMati();
  bersihPeta(D.ctx?.peta, ["sf-d-fill", "sf-d-line", "sf-d-jejak"], ["sf-d"]);
  D.root?.remove(); D.bawah?.remove(); D.pip?.remove(); D.root = D.bawah = D.pip = null; D.ctx = null;
}
function dEoMati() { if (D.eo) { try { D.eo.remove(); } catch (e) { /* peta sudah hilang */ } D.eo = null; } }
function dBuka(ctx) {
  D.ctx = ctx; D.on = true; D.t = ctx.t || 0;
  D.root = nodeDari(`<div class="sf-kn" id="sfDrKn"></div>`); ctx.el.kanan.append(D.root);
  D.bawah = nodeDari(`<div class="sf-bw sf-bw-d"><div class="sf-gr" id="sfDrGr"></div><div class="sf-det"><div class="sf-fh"><span class="sf-pill">Deteksi</span><em id="sfDetN"></em></div><div id="sfDet" class="sf-dl"></div></div></div>`); ctx.el.bawah.append(D.bawah);
  D.pip = nodeDari(`<div class="sf-pip" id="sfPip"><div class="sf-vid"><div class="sf-eo" id="sfEo"></div><canvas class="sf-ir" id="sfIr" width="224" height="150"></canvas><div class="sf-hud" id="sfHud"></div></div>
    <div class="sf-bar"><b id="sfPipN"></b><span class="sf-seg"><button type="button" data-a="eo">EO</button><button type="button" data-a="ir">IR</button></span><button type="button" class="sf-chip" data-a="pal"></button><span class="sf-fill"></span>
    <button type="button" class="sf-ib" data-a="zm" aria-label="Perkecil zoom">${IKN.min}</button><span id="sfZm">1,0×</span><button type="button" class="sf-ib" data-a="zp" aria-label="Perbesar zoom">${IKN.plus}</button><button type="button" class="sf-ib" data-a="full" aria-label="Layar penuh">${IKN.penuh}</button><button type="button" class="sf-ib" data-a="tutup" aria-label="Tutup kamera">${IKN.x}</button></div></div>`);
  ctx.el.peta.append(D.pip);
  D.pip.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a;
    if (a === "eo" || a === "ir") { D.mode = a.toUpperCase(); if (D.mode === "IR") dEoMati(); } else if (a === "pal") D.pal = D.pal === "ironbow" ? "white" : "ironbow";
    else if (a === "zp") D.zoom = Math.min(8, D.zoom * 1.5); else if (a === "zm") D.zoom = Math.max(1, D.zoom / 1.5);
    else if (a === "full") { D.full = !D.full; D.pip.classList.toggle("pen", D.full); D.eo?.resize(); } else if (a === "tutup") D.pip.hidden = true;
    D.last = 0; });
  D.root.addEventListener("click", e => { const r = e.target.closest("[data-i]"); if (r) { D.sel = +r.dataset.i; D.pip.hidden = false; D.last = 0; D.panel = 0; }
    const b = e.target.closest("[data-a]"); if (!b) return; if (b.dataset.a === "kamera") { D.pip.hidden = false; D.full = true; D.pip.classList.add("pen"); D.eo?.resize(); } else if (b.dataset.a === "termal") { D.mode = "IR"; dEoMati(); D.pip.hidden = false; }
    D.last = 0; D.panel = 0; });
  D.mk = DR.map((c, i) => { const el = nodeDari(`<button type="button" class="sf-pl sf-pl-d">${IKN.drone}<span></span></button>`); el.addEventListener("click", ev => { ev.stopPropagation(); D.sel = i; D.pip.hidden = false; D.last = 0; D.panel = 0; });
    return new maplibregl.Marker({element: el, anchor: "left", offset: [10, 0]}).setLngLat([ctx.K.x0, ctx.K.y0]).addTo(ctx.peta); });
  D.last = 0; D.panel = 0; D.raf = requestAnimationFrame(dLoop);
}
function dLoop(ts) {
  if (!D.on) return; D.raf = requestAnimationFrame(dLoop); if (ts - D.last < 100) return; D.last = ts;
  const ctx = D.ctx, H = ctx.H, K = ctx.K; if (!H || !K) return; const t = D.t, sec = ts / 1000, g = geo(K), m = ctx.peta, sel = D.sel;
  const ps = DR.map((_, i) => gerakDrone(K, H, i, t, sec)), p = ps[sel], pan = pandang(K, H, t, p, D.zoom);
  /* peta: pill drone + jejak/jangkauan drone terpilih; 1 setData per tick */
  ps.forEach((q, i) => { const ll = g.ll(q.x, q.y); D.mk[i].setLngLat(ll); const s = D.mk[i].getElement(), tx = `${DR[i].kode} ${n0(q.alt)} m`; if (s.dataset.t !== tx) { s.dataset.t = tx; s.lastChild.textContent = tx; } s.classList.toggle("on", i === sel); s.classList.toggle("ground", !q.udara); });
  pastikanSumber(m, "sf-d"); pastikanLapis(m, {id: "sf-d-fill", type: "fill", source: "sf-d", filter: ["==", ["geometry-type"], "Polygon"], paint: {"fill-color": "#ffd24a", "fill-opacity": .16, "fill-outline-color": "#ffd24a"}});
  pastikanLapis(m, {id: "sf-d-jejak", type: "line", source: "sf-d", filter: ["==", ["geometry-type"], "LineString"], paint: {"line-color": "#ffffff", "line-width": 2, "line-opacity": .8, "line-dasharray": [2, 2]}});
  const jej = []; for (let q = 40; q >= 0; q -= 2) { const z = dronePos(K, H, sel, t, sec - q); jej.push(g.ll(z.x, z.y)); }
  const c = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([a, b]) => g.ll(p.tx + a * pan.hw, p.ty + b * pan.hw));
  m.getSource("sf-d").setData({type: "FeatureCollection", features: [feat({type: "Polygon", coordinates: [c]}), feat({type: "LineString", coordinates: jej})]});
  /* kamera PIP (<= 10 fps) */
  const pip = D.pip; if (!pip.hidden) {
    const ir = pip.querySelector("#sfIr"), eoEl = pip.querySelector("#sfEo"), tgt = g.ll(p.tx, p.ty), jr = Math.max(60, Math.hypot(p.tx - p.x, p.ty - p.y));
    ir.style.display = D.mode === "IR" ? "" : "none"; eoEl.style.display = D.mode === "EO" ? "" : "none";
    if (D.mode === "IR") gambarIR(ir, K, H, t, p, pan, p.gim, D.pal, D.zoom);
    else dEo(ctx, p, tgt, jr, H, t);
    pip.querySelectorAll(".sf-seg button").forEach(b => b.classList.toggle("on", b.dataset.a.toUpperCase() === D.mode)); pip.querySelector("[data-a=pal]").textContent = D.mode === "IR" ? (D.pal === "ironbow" ? "Ironbow" : "White-hot") : "Citra";
    pip.querySelector("#sfZm").textContent = n1(D.zoom) + "×"; pip.querySelector("#sfPipN").textContent = `${DR[sel].kode} ${DR[sel].nama}`;
    const lat = tgt[1], lon = tgt[0], rng = Math.hypot(p.tx - p.x, p.ty - p.y, p.alt);
    pip.querySelector("#sfHud").innerHTML = `<div class="tl"><i class="rec"></i>REC ${mmss(p.menit)}<br>${DR[sel].kode}<br>${D.mode === "IR" ? "IR · " + (D.pal === "ironbow" ? "IRONBOW" : "WHITE-HOT") : "EO · CITRA"}</div>
      <div class="tr">${wibTgl(ctx.mulai, t + sec / 3600)}<br>${esc(DR[sel].misi.toUpperCase())}</div>${compas(p.gim)}<div class="ch"></div>
      <div class="bl">ALT ${n0(p.alt)} M AGL<br>GS ${n0(p.kmj)} KM/J<br>HDG ${n0(p.arah)}°</div>
      <div class="br">BAT ${n0(p.bat)}%<br>LNK ${n0(p.dbm)} DBM<br>ZOOM ${n1(D.zoom)}× · ${A.FOV}° FOV</div>
      <div class="bc">SPI ${koor(lat, lon)}<br>RNG ${n0(rng)} M · ${D.mode === "IR" ? "MAKS " + n0(pan.maks) + " °C" : "EO"}</div>`;
  }
  D.panel -= 1; if (D.panel <= 0) { D.panel = 5; dPanel(ctx, ps, sec); }
}
function compas(b) {
  let s = ""; for (let a = Math.ceil((b - 45) / 10) * 10; a <= b + 45; a += 10) { const x = 150 + (a - b) * 3.3, m30 = (((a % 360) + 360) % 360) % 30 === 0; s += `<line x1="${x}" x2="${x}" y1="${m30 ? 2 : 6}" y2="12"/>${m30 ? `<text x="${x}" y="23" text-anchor="middle">${(((a % 360) + 360) % 360)}</text>` : ""}`; }
  return `<svg class="cp" viewBox="0 0 300 26"><path d="M150 14l-4 6h8z" fill="#fff"/>${s}</svg>`;
}
function dEo(ctx, p, tgt, jr, H, t) {
  const el = D.pip.querySelector("#sfEo");
  if (!D.eo) {
    D.eo = new maplibregl.Map({container: el, interactive: false, attributionControl: false, maxPitch: 85, pitch: 70, center: tgt, zoom: 15,
      style: {version: 8, sources: {es: {type: "raster", tileSize: 256, maxzoom: 18, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"]}}, layers: [{id: "es", type: "raster", source: "es"}]}});
    D.eo._cv = document.createElement("canvas"); D.eo._jam = -1;
    D.eo.on("load", () => { D.eo._ok = true; D.eo.addSource("fire", {type: "image", url: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", coordinates: koorKisi(ctx.K)}); D.eo.addLayer({id: "fire", type: "raster", source: "fire", paint: {"raster-resampling": "nearest", "raster-fade-duration": 0}}); });
  }
  const e = D.eo, z = Math.max(12, Math.min(18.2, 16.8 - Math.log2(jr / 300) + Math.log2(D.zoom)));
  e.jumpTo({center: tgt, bearing: p.gim, pitch: 70, zoom: z});
  const jam = Math.floor(t * 4) / 4; if (e._ok && e._jam !== jam + "|" + (e._hh !== H)) { e._jam = jam + "|" + (e._hh !== H); e._hh = H; kanvasApi(ctx.K, H, t, e._cv); e.getSource("fire")?.updateImage({url: e._cv.toDataURL(), coordinates: koorKisi(ctx.K)}); }
}
function dPanel(ctx, ps, sec) {
  const {K, H} = ctx, t = D.t, sel = D.sel, p = ps[sel], c = DR[sel], g = geo(K), ll = g.ll(p.x, p.y), udara = ps.filter(q => q.udara).length;
  D.root.innerHTML = `<div class="sf-hd"><b>Armada drone</b><span class="sf-ket">${udara} dari ${DR.length} mengudara</span><span class="sf-sim">SIMULASI</span></div>
    <div class="sf-list">${ps.map((q, i) => `<button type="button" class="sf-row${i === sel ? " on" : ""}" data-i="${i}"><i class="ik">${DR[i].jenis.startsWith("Sayap") ? IKN.sayap : IKN.drone}</i><span class="nm"><b>${DR[i].kode} ${DR[i].nama}</b><small>${DR[i].misi}</small></span>
      <span class="st"><em class="${q.udara ? "" : "off"}">${q.st}</em><small>${n0(q.alt)} m</small></span><span class="bt"><i style="--b:${Math.round(q.bat)}%"></i><small>${n0(q.bat)}%</small></span></button>`).join("")}</div>
    <div class="sf-card"><div class="sf-hd"><b>${c.kode} ${c.nama}</b><span class="sf-pillb">${p.st}</span></div>
      <div class="sf-grid"><div><small>Ketinggian</small><b>${n0(p.alt)}</b><small>m di atas tanah</small></div><div><small>Kecepatan</small><b>${n0(p.kmj)}</b><small>km/jam</small></div><div><small>Arah</small><b>${n0(p.arah)}°</b><small>${arah8(p.arah)}</small></div>
        <div><small>Baterai</small><b>${n0(p.bat)}%</b><small>± ${n0(Math.max(0, (p.bat - 20) / 100 * A.BAT_HABIS_MENIT))} menit sampai ganti</small></div><div><small>Sinyal</small><b>${n0(p.dbm)}</b><small>dBm</small></div><div><small>Waktu terbang</small><b>${mmss(p.menit)}</b><small>sortie ini</small></div></div>
      <dl class="sf-dl"><dt>Pesawat</dt><dd>${c.jenis}</dd><dt>Misi</dt><dd><b>${c.misi}</b></dd><dt>Tugas</dt><dd>${c.tugas}</dd><dt>Sensor</dt><dd>EO/IR, zoom hingga 8×</dd><dt>Posisi</dt><dd>${koor(ll[1], ll[0])}</dd><dt>Gimbal</dt><dd>${n0(p.gim)}° · ${n0(p.pitch)}° · ${n1(D.zoom)}×</dd></dl>
      <div class="sf-btn"><button type="button" class="sf-b pri" data-a="kamera">${IKN.penuh}Kamera penuh</button><button type="button" class="sf-b" data-a="termal">Termal</button></div></div>`;
  /* grafik 60 detik terakhir drone terpilih (dihitung dari fungsi posisi, bukan buffer) */
  const sec0 = sec, S = Array.from({length: 61}, (_, q) => sec0 - 60 + q), mine = S.map(s => dronePos(K, H, sel, t, s));
  const alt = mine.map(q => q.alt), bat = mine.map(q => q.bat), tm = S.map((s, q) => mine[q].udara ? pandang(K, H, t, mine[q], D.zoom).maks : wx(H, hh(t), "tc") ?? 30);
  const lain = DR.map((_, i) => i === sel ? null : {a: S.map(s => dronePos(K, H, i, t, s).alt), w: "#8a96aa", tebal: 1, redup: true}).filter(Boolean);
  D.bawah.querySelector("#sfDrGr").innerHTML = chart("Ketinggian (m)", `${c.kode} · ${n0(p.alt)} m`, [...lain, {a: alt, w: "#e5603f", tebal: 2}], {ymin: 0, ymax: 800, x0: "−60 d", x1: "kini"})
    + chart("Suhu maks di pandangan (°C)", `${n0(pandang(K, H, t, p, D.zoom).maks)} °C`, [{a: tm, w: "#e5603f", tebal: 2}], {ymin: 0, ymax: 1000, x0: "−60 d", x1: "kini", isi: 1})
    + chart("Baterai (%)", `${c.kode} · ${n0(p.bat)}%`, [{a: bat, w: "#e5603f", tebal: 2}], {ymin: 0, ymax: 100, x0: "−60 d", x1: "kini", isi: 1});
  const det = deteksi(K, H).filter(x => x.h <= t).reverse(); D.bawah.querySelector("#sfDetN").textContent = String(det.length);
  const kt = det.slice(0, 20).map(x => `${x.i}|${x.k}`).join(); if (kt !== D.detTampil) { D.detTampil = kt; D.bawah.querySelector("#sfDet").innerHTML = det.slice(0, 20).map(x => `<div class="sf-dr"><i></i><span><b>Titik panas · ${n0(x.suhu)} °C</b><small>${DR[x.i].kode} · ${koor(x.lat, x.lon)}</small></span><time>${wibJam(ctx.mulai, x.h)}</time></div>`).join("") || `<p class="sf-nol">Belum ada titik panas terdeteksi sampai jam ini.</p>`; }
}
const TAB_D = {id: "drones", nama: "Drones", ikon: IKN.drone,
  lencana: ctx => { if (!ctx?.H || !ctx.K) return null; let q = 0; for (let i = 0; i < DR.length; i++) if (dronePos(ctx.K, ctx.H, i, ctx.t || 0, 0).udara) q++; return q; },
  buka: dBuka, tutup: dTutup, waktu(t, ctx) { D.t = t; D.last = 0; },
  hasilBaru(ctx) { D.ctx = ctx; D.detTampil = ""; D.last = 0; D.panel = 0; D.eo && (D.eo._jam = -1); }};

/* ============ TAB RESOURCES ============ */
const R = {on: false, sel: null, follow: null, U: null, ctx: null, mk: new Map(), raf: 0, t: 0, kotor: true, cacheH: null};
function rUnits(ctx) {
  if (R.U && R.cacheH === ctx.H && R.sim === ctx.Sim?.k) return R.U;
  const U = susun(ctx); for (const u of U) if (u.grup === "udara") siapUdara(ctx.K, ctx.H, u, ctx.mulai);
  R.cacheH = ctx.H; R.sim = ctx.Sim?.k; return R.U = U;
}
function rTutup() {
  R.on = false; cancelAnimationFrame(R.raf); R.follow = null; R.mk.forEach(m => m.remove()); R.mk.clear(); R.U = null;
  bersihPeta(R.ctx?.peta, ["sf-r-jejak", "sf-r-garis-bg", "sf-r-garis"], ["sf-r"]); R.root?.remove(); R.bawah?.remove(); R.kartu?.remove(); R.root = R.bawah = R.kartu = null; R.ctx = null;
}
function rBuka(ctx) {
  R.ctx = ctx; R.on = true; R.t = ctx.t || 0; R.U = null; R.follow = null;
  R.root = nodeDari(`<div class="sf-kn" id="sfRsKn"></div>`); ctx.el.kanan.append(R.root);
  R.bawah = nodeDari(`<div class="sf-bw sf-bw-r"><div class="sf-gr" id="sfRsGr"></div><div class="sf-det"><div class="sf-fh"><span class="sf-pill">Log operasi udara</span><em id="sfLogN"></em></div><div id="sfLog" class="sf-dl"></div></div></div>`); ctx.el.bawah.append(R.bawah);
  R.kartu = nodeDari(`<div class="sf-kartu" id="sfKartu" hidden></div>`); ctx.el.peta.append(R.kartu);
  const pilih = e => { const r = e.target.closest("[data-u]"); if (r) { R.sel = r.dataset.u; R.follow = r.dataset.u; R.kotor = true; rDraw(); } const b = e.target.closest("[data-a=lepas]"); if (b) { R.follow = null; R.kartu.hidden = true; } };
  R.root.addEventListener("click", pilih); R.kartu.addEventListener("click", pilih);
  ctx.peta.on("dragstart", rDrag); R.drag = rDrag; R.kotor = true; rDraw();
}
function rDrag(e) { if (e.originalEvent) { R.follow = null; if (R.kartu) R.kartu.hidden = true; } }
function rJadwal() { if (!R.raf) R.raf = requestAnimationFrame(() => { R.raf = 0; if (R.on) rDraw(); }); }
function rDraw() {
  const ctx = R.ctx; if (!ctx || !R.on) return; const {K, H, peta: m} = ctx; if (!H || !K) return; const t = R.t, g = geo(K), U = rUnits(ctx), ST = U.map(u => unitKe(K, H, U, u, t));
  /* peta: pill unit (DOM) + garis kendali + jejak jatuhan; 2 setData total per frame */
  U.forEach((u, i) => { let mk = R.mk.get(u.kode); if (!mk) { const el = nodeDari(`<button type="button" class="sf-pl" data-u="${u.kode}">${IKJ[u.jenis]}<span></span></button>`); el.addEventListener("click", ev => { ev.stopPropagation(); R.sel = u.kode; R.follow = u.kode; R.kotor = true; rDraw(); });
    mk = new maplibregl.Marker({element: el, anchor: "left", offset: [10, 0]}).setLngLat(g.ll(ST[i].x, ST[i].y)).addTo(m); R.mk.set(u.kode, mk); }
    mk.setLngLat(g.ll(ST[i].x, ST[i].y)); const el = mk.getElement(), tx = `${u.kode} ${ST[i].st}`; if (el.dataset.t !== tx) { el.dataset.t = tx; el.lastChild.textContent = tx; el.dataset.s = ST[i].st.split(" ")[0]; } el.classList.toggle("on", R.sel === u.kode); });
  pastikanSumber(m, "sf-r");
  pastikanLapis(m, {id: "sf-r-jejak", type: "line", source: "sf-r", filter: ["==", ["get", "k"], "jejak"], paint: {"line-color": ["get", "w"], "line-width": 5, "line-opacity": ["get", "o"]}, layout: {"line-cap": "round"}});
  pastikanLapis(m, {id: "sf-r-garis-bg", type: "line", source: "sf-r", filter: ["==", ["get", "k"], "garis"], paint: {"line-color": "#0b1424", "line-width": 6, "line-opacity": .55}, layout: {"line-cap": "round", "line-join": "round"}});
  pastikanLapis(m, {id: "sf-r-garis", type: "line", source: "sf-r", filter: ["==", ["get", "k"], "garis"], paint: {"line-color": "#ffe14a", "line-width": 3}, layout: {"line-cap": "round", "line-join": "round"}});
  const fs = []; U.forEach((u, i) => { if (ST[i].pts && ST[i].pts.length > 1 && ST[i].L > 0) fs.push(feat({type: "LineString", coordinates: ST[i].pts.map(([x, y]) => g.ll(x, y))}, {k: "garis"})); });
  for (const u of U) for (const e of u.ev || []) { if (e.tj > t) break; const um = t - e.tj; if (um > A.JEJAK_JAM) continue; fs.push(feat({type: "LineString", coordinates: e.pts.map(([x, y]) => g.ll(x, y))}, {k: "jejak", w: u.jenis === "AT" ? "#e5483b" : "#4f8fc4", o: Math.max(.08, 1 - um / A.JEJAK_JAM)})); }
  m.getSource("sf-r").setData({type: "FeatureCollection", features: fs});
  /* kamera ikut */
  const fu = R.follow && U.find(u => u.kode === R.follow);
  if (fu) { const q = ST[U.indexOf(fu)], gk = gerakUnit(K, H, U, fu, t), ll = g.ll(q.x, q.y); m.easeTo({center: ll, bearing: gk.kmj > 1 ? gk.arah : m.getBearing(), pitch: 65, zoom: fu.grup === "udara" ? 14.5 : 15.5, duration: 0}); }
  if (R.kotor) { R.kotor = false; rPanel(ctx, U, ST); } rKartu(ctx, U, ST); rBawah(ctx, U);
}
function rPanel(ctx, U, ST) {
  const {K, H} = ctx, t = R.t, aktif = ST.filter(s => s.st !== "Siaga").length, udara = U.filter(u => u.grup === "udara"), naik = udara.filter((u, i) => ST[U.indexOf(u)].st !== "Siaga").length;
  const vol = U.reduce((s, u) => s + (u.ev ? volumeSd(u, t) : 0), 0), gar = U.reduce((s, u, i) => s + (ST[i].L || 0), 0), per = U.reduce((s, u) => s + (t >= u.tMob ? u.pers : 0), 0), gp = [["udara", "Pesawat"], ["darat", "Engine & tangki"], ["kru", "Kru & dozer"]];
  const baris = (u, i) => `<button type="button" class="sf-row sf-ru${R.sel === u.kode ? " on" : ""}" data-u="${u.kode}"><i class="ik">${IKJ[u.jenis]}</i><span class="nm"><b>${u.kode} ${esc(u.ln)}</b><small><i class="sd" data-s="${ST[i].st.split(" ")[0]}"></i>${ST[i].st}${u.nyata ? "" : " · simulasi"}</small></span><span class="st"><small>${u.kap ? n0(u.kap) + " L" : n0(u.pers) + " pers."}</small></span></button>`;
  R.root.innerHTML = `<div class="sf-hd"><b>Sumber daya</b><span class="sf-ket">${U.length} unit · ${aktif} aktif</span><span class="sf-sim">SIMULASI</span></div>
    <div class="sf-ring"><div><b>${naik}/${udara.length}</b><small>pesawat mengudara</small></div><div><b>${vol >= 1e4 ? n0(vol / 1e3) + " rb" : n0(vol)}</b><small>L air/retardan</small></div><div><b>${n1(gar / 1000)}</b><small>km garis</small></div><div><b>${n0(per)}</b><small>personel</small></div></div>
    ${gp.map(([k, jd]) => `<div class="sf-gt">${jd}</div>${U.map((u, i) => u.grup === k ? baris(u, i) : "").join("")}`).join("")}
    <div class="sf-card"><div class="sf-hd"><b>Operasi</b><span class="sf-ket">${aktif ? "operasi berjalan" : "belum ada unit tiba"}</span></div>
      <p class="sf-p">Klik pesawat, engine, kru, atau dozer untuk mengikutinya di peta. Jatuhan retardan (merah) dan air (biru) meninggalkan jejak di tepi api yang memudar dalam ${A.JEJAK_JAM / 24} hari.</p>
      <p class="sf-p">Pesawat terbang siang saja (${String(A.TERBANG_AWAL).replace(".", ",")}–${String(A.TERBANG_AKHIR).replace(".", ",")} WIB). Garis kendali per regu = ${n0(ctx.Sim?.op?.L || 150)} m/jam seperti model serangan awal. Luas api di peta mengikuti skenario <b>${esc(H.s?.n || "yang dilihat")}</b>; tab ini menampilkan operasinya, tidak mengubah hasilnya.</p></div>`;
}
function rKartu(ctx, U, ST) {
  const u = U.find(x => x.kode === R.sel), k = R.kartu; if (!u) { k.hidden = true; return; } if (!R.follow) { k.hidden = true; return; } const i = U.indexOf(u), s = ST[i], gk = gerakUnit(ctx.K, ctx.H, U, u, R.t);
  k.hidden = false; const udara = u.grup === "udara", muat = u.kap && udara ? Math.round(s.load / u.kap * 100) : null;
  k.innerHTML = `<div class="hd"><b>${u.kode} ${esc(u.ln)}</b><span class="sf-pillb">${s.st}</span><button type="button" class="sf-ib" data-a="lepas" aria-label="Lepas kamera">${IKN.x}</button></div>
    <div class="vl"><div><b>${n0(gk.kmj)}</b><small>km/jam</small></div>${udara ? `<div><b>${n0(s.alt || 0)}</b><small>m AGL</small></div>` : `<div><b>${n0(s.L || 0)}</b><small>m garis</small></div>`}<div><b>${n0(gk.arah)}°</b><small>${arah8(gk.arah)}</small></div>
      ${muat != null ? `<div class="mt"><small>Muatan ${u.isi ? "(" + (u.jenis === "AT" ? "retardan" : "air") + ")" : ""}</small><i><u style="width:${muat}%"></u></i><b>${n0(s.load)} / ${n0(u.kap)} L</b></div>` : `<div class="mt"><small>${esc(u.ket || "")}</small></div>`}
      <button type="button" class="sf-b pri" data-a="lepas">Lepas</button></div>`;
}
function rBawah(ctx, U) {
  const {K, H} = ctx, t = R.t, d = deret(K, H, U), lg = log(U, t), x = t / 72;
  R.bawah.querySelector("#sfRsGr").innerHTML = chart("Air/retardan dijatuhkan (L)", `${n0(d.vol[Math.min(72, Math.round(t))])} L`, [{a: d.vol, w: "#e5483b", tebal: 2}], {x0: "jam 0", x1: "jam 72", isi: 1, kursor: x, fmt: v => v >= 1e3 ? n0(v / 1e3) + " rb" : n0(v)})
    + chart("Garis kendali dibangun (km)", `${n1(d.gar[Math.min(72, Math.round(t))])} km`, [{a: d.gar, w: "#8a7a3a", tebal: 2}], {x0: "jam 0", x1: "jam 72", isi: 1, kursor: x, fmt: v => n1(v)})
    + chart("Personel ditugaskan", `${n0(d.per[Math.min(72, Math.round(t))])} orang`, [{a: d.per, w: "#5a9e74", tebal: 2}], {x0: "jam 0", x1: "jam 72", isi: 1, kursor: x});
  R.bawah.querySelector("#sfLogN").textContent = String(lg.length); const g = geo(K), kt = lg.slice(0, 14).map(e => e.u.kode + e.tj).join();
  if (kt !== R.logT) { R.logT = kt; R.bawah.querySelector("#sfLog").innerHTML = lg.slice(0, 14).map(e => { const ll = g.ll(e.x, e.y); return `<div class="sf-dr"><i class="${e.u.jenis === "AT" ? "mr" : "bl"}"></i><span><b>${e.u.kode} · ${n0(e.vol)} L ${e.u.jenis === "AT" ? "retardan" : "air"}</b><small>${koor(ll[1], ll[0])}</small></span><time>${wibJam(ctx.mulai, e.tj)}</time></div>`; }).join("") || `<p class="sf-nol">Belum ada siraman sampai jam ini.</p>`; }
}
const TAB_R = {id: "resources", nama: "Resources", ikon: IKN.engine,
  lencana: ctx => { if (!ctx?.H || !ctx.K) return null; const U = rUnits({...ctx, t: ctx.t}); let q = 0; for (const u of U) if (unitKe(ctx.K, ctx.H, U, u, ctx.t || 0).st !== "Siaga") q++; return q; },
  buka: rBuka, tutup: rTutup, waktu(t) { R.t = t; R.kotor = true; if (R.on) rJadwal(); },
  hasilBaru(ctx) { R.ctx = ctx; R.U = null; R.kotor = true; R.logT = ""; if (R.on) rJadwal(); }};

/* ============ pendaftaran ke cangkang (bisa belum ada saat dimuat) ============ */
let done = false;
function coba() { if (done) return true; if (!window.SimFT?.daftar) return false; done = true; window.SimFT.daftar(TAB_D); window.SimFT.daftar(TAB_R); return true; }
window.SimArmada = {inti: {A, DR, geo, peri, at, seg, plen, suhu, dronePos, gerakDrone, pandang, deteksi, susun, siapUdara, unitKe, volumeSd, deret, jendela, pangkalan, gambarIR, LUT, norm}};
if (typeof document !== "undefined" && !coba()) {
  let n = 0; const ulang = () => { if (coba() || ++n > 600) return; requestAnimationFrame(ulang); };
  document.addEventListener("DOMContentLoaded", coba); window.addEventListener("load", coba); requestAnimationFrame(ulang); setTimeout(coba, 1500); setTimeout(coba, 4000);
}
})();
