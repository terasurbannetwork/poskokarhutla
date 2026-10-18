/* Model sebaran abu Lagrangian sederhana: port JS yang SETARA dengan scripts/gunungapi/abu.py (jalankan, jejak, endapan).
   Konstanta, urutan pemanggilan RNG, dan rumus harus tetap sama dengan Python; dibuktikan scripts/gunungapi/uji_setara.mjs.
   Ini SKENARIO (erupsi diandaikan terjadi pada t=0), bukan peramalan letusan. Penjelasan model: docstring abu.py. */
(function (akar) {
  'use strict';
  var R = 6371000, KH = 1000, A = 4, K = 5, NB = 100;
  var KELAS = [[0.40, 0.008], [0.30, 0.07], [0.20, 0.5], [0.10, 1.5]];
  var DEG = Math.PI / 180;
  var MIN_SEL = 5, SEL = 0.1, AMBANG = 2.0, TEBAL = 2000, RHO = 2500;  // ambang beban kolom (docstring abu.py): 2 mg/m3 x tebal 2 km, sel 0,1 derajat, MER Mastin dkk. 2009

  function mulberry32(seed) {
    var a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function tabel() {
    var d = [], c = [], a = 0, i, s;
    for (i = 0; i < NB; i++) { s = (i + 0.5) / NB; d.push(Math.pow((1 - s) * Math.exp(A * (s - 1)), K)); a += d[i]; c.push(a); }
    return { d: d, c: c };
  }
  function suzukiS(u, T) {
    var tgt = u * T.c[NB - 1], j, prev;
    for (j = 0; j < NB; j++) if (T.c[j] >= tgt) { prev = j ? T.c[j - 1] : 0; return (j + (tgt - prev) / T.d[j]) / NB; }
    return 1;
  }

  function profil(angin, ts) {
    var L = angin.lapis, n = L[0].u.length, h = ts / 3600, i, f, j, k, out = [];
    if (h >= n - 1) { i = n - 1; f = 0; } else { i = Math.floor(h); f = h - i; }
    j = Math.min(i + 1, n - 1);
    for (k = 0; k < L.length; k++) out.push([L[k].z_m[i] * (1 - f) + L[k].z_m[j] * f, L[k].u[i] * (1 - f) + L[k].u[j] * f, L[k].v[i] * (1 - f) + L[k].v[j] * f]);
    out.sort(function (a, b) { return a[0] - b[0]; });
    return out;
  }
  function anginDi(p, z, o) {
    var k, w, z0, z1;
    if (z <= p[0][0]) { o[0] = p[0][1]; o[1] = p[0][2]; return; }
    if (z >= p[p.length - 1][0]) { o[0] = p[p.length - 1][1]; o[1] = p[p.length - 1][2]; return; }
    for (k = 0; k < p.length - 1; k++) {
      z0 = p[k][0]; z1 = p[k + 1][0];
      if (z < z1) { w = (z - z0) / (z1 - z0); o[0] = p[k][1] * (1 - w) + p[k + 1][1] * w; o[1] = p[k][2] * (1 - w) + p[k + 1][2] * w; return; }
    }
    o[0] = p[p.length - 1][1]; o[1] = p[p.length - 1][2];
  }

  function merKgS(kolom) { return RHO * Math.pow(Math.max(kolom, 0) / 1000 / 2, 1 / 0.241); }

  /* Cuplikan lon/lat disimpan Float64Array (bukan Float32): sel kisi 0,1 derajat harus sama persis dengan Python; Float32 membalik sel untuk partikel dekat batas.
     jalankan({lat, lon, puncak_m, kolom_m, durasi_jam=3, angin, jam=72, n=2000, seed=1, dt_menit=15, kh=1000})
     -> {jam:[0..J], snap:[{jam, lon, lat, z (Float64Array), aktif, darat (Uint8Array)}], lepas:[jam lepas tiap partikel], vent} */
  function jalankan(o) {
    var jam = o.jam == null ? 72 : o.jam, n = o.n || 2000, dtm = o.dt_menit || 15, kh = o.kh == null ? KH : o.kh;
    var durasi = o.durasi_jam == null ? 3 : o.durasi_jam, seed = o.seed == null ? 1 : o.seed;
    if (60 % dtm) throw new Error('dt_menit harus pembagi 60');
    var dts = dtm * 60, spj = 60 / dtm, rng = mulberry32(seed), T = tabel(), kRel = Math.max(1, Math.round(durasi * 3600 / dts));
    var rel = new Int32Array(n), z = new Float64Array(n), vt = new Float64Array(n), px = new Float64Array(n), py = new Float64Array(n), st = new Uint8Array(n);
    var i, u, acc, c, step, nxt = 0, sig = Math.sqrt(2 * kh * dts), snaps = [], lepas = [], jamL = [], p, w = [0, 0], r, a, dx, dy, py0, s, h;
    for (i = 0; i < n; i++) {
      rel[i] = Math.floor(i * kRel / n);
      z[i] = o.puncak_m + suzukiS(rng(), T) * o.kolom_m;
      u = rng(); acc = 0; vt[i] = KELAS[KELAS.length - 1][1];
      for (c = 0; c < KELAS.length; c++) { acc += KELAS[c][0]; if (u < acc) { vt[i] = KELAS[c][1]; break; } }
      px[i] = o.lon; py[i] = o.lat; lepas.push(rel[i] * dts / 3600);
    }
    for (step = 0; step <= jam * spj; step++) {
      while (nxt < n && rel[nxt] === step) { st[nxt] = 1; nxt++; }
      if (step % spj === 0) {
        s = { jam: step / spj, lon: new Float64Array(px), lat: new Float64Array(py), z: new Float64Array(z), aktif: new Uint8Array(n), darat: new Uint8Array(n) };
        for (i = 0; i < n; i++) { s.aktif[i] = st[i] === 1 ? 1 : 0; s.darat[i] = st[i] === 2 ? 1 : 0; }
        snaps.push(s); jamL.push(s.jam);
      }
      if (step === jam * spj) break;
      p = profil(o.angin, step * dts + dts / 2);
      for (i = 0; i < n; i++) {
        if (st[i] !== 1) continue;
        anginDi(p, z[i], w);
        r = Math.sqrt(-2 * Math.log(1 - rng())); a = 2 * Math.PI * rng();
        dx = w[0] * dts + sig * r * Math.cos(a); dy = w[1] * dts + sig * r * Math.sin(a);
        py0 = py[i];
        py[i] = py0 + dy / R / DEG;
        px[i] += dx / (R * Math.cos(py0 * DEG)) / DEG;
        z[i] -= vt[i] * dts;
        if (z[i] <= 0) { z[i] = 0; st[i] = 2; }
      }
    }
    return { jam: jamL, snap: snaps, lepas: lepas, vent: { lat: o.lat, lon: o.lon }, massa_kg: merKgS(o.kolom_m) * durasi * 3600, n: n };
  }

  function proyeksi(v) { var ky = DEG * R / 1000; return [ky * Math.cos(v.lat * DEG), ky]; }

  function selubung(pts) {
    var p = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }), q = [], i;
    for (i = 0; i < p.length; i++) if (!i || p[i][0] !== p[i - 1][0] || p[i][1] !== p[i - 1][1]) q.push(p[i]);
    if (q.length < 3) return q;
    function sil(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [];
    for (i = 0; i < q.length; i++) { while (lo.length >= 2 && sil(lo[lo.length - 2], lo[lo.length - 1], q[i]) <= 0) lo.pop(); lo.push(q[i]); }
    for (i = q.length - 1; i >= 0; i--) { while (up.length >= 2 && sil(up[up.length - 2], up[up.length - 1], q[i]) <= 0) up.pop(); up.push(q[i]); }
    lo.pop(); up.pop();
    return lo.concat(up);
  }

  function snapJam(hasil, jam) {
    for (var i = 0; i < hasil.snap.length; i++) if (hasil.snap[i].jam === jam) return hasil.snap[i];
    throw new Error('jam ' + jam + ' tidak ada');
  }

  /* selBerambang(hasil, jam, maksZ) -> [[i, j, jumlah]] sel kisi 0,1 derajat yang bebannya >= 2 mg/m3 x 2 km (lihat abu.py sel_berambang) */
  function selBerambang(hasil, jam, maksZ) {
    var s = snapJam(hasil, jam), w = hasil.massa_kg / hasil.n, cnt = new Map(), i, key, e, out = [], sisi = DEG * R, luas;
    for (i = 0; i < s.lon.length; i++) {
      if (s.aktif[i] && (maksZ == null || s.z[i] <= maksZ)) {
        key = Math.floor(s.lon[i] / SEL) + ',' + Math.floor(s.lat[i] / SEL) ;
        e = cnt.get(key);
        if (e) e[2]++; else cnt.set(key, [Math.floor(s.lon[i] / SEL), Math.floor(s.lat[i] / SEL), 1]);
      }
    }
    cnt.forEach(function (c) {
      luas = SEL * SEL * sisi * sisi * Math.cos((c[1] + 0.5) * SEL * DEG);
      if (c[2] * w >= AMBANG * 1e-6 * TEBAL * luas) out.push(c);
    });
    return out;
  }

  /* jejak(hasil, jam) -> {poligon:[[lon,lat]], arah_deg, jangkau_km, sel_n}; BERAMBANG, nilai mentah (tanpa pembulatan) */
  function jejak(hasil, jam) {
    var sel = selBerambang(hasil, jam), v = hasil.vent, kk = proyeksi(v), kx = kk[0], ky = kk[1], pts = [], tot = 0, mx = 0, my = 0, jmax = 0, i, a, b, x, y, c;
    if (sel.length < MIN_SEL) return { poligon: [], arah_deg: null, jangkau_km: 0, sel_n: sel.length, di_bawah_ambang: true };
    for (i = 0; i < sel.length; i++) {
      c = sel[i];
      for (a = 0; a < 2; a++) for (b = 0; b < 2; b++) pts.push([((c[0] + a) * SEL - v.lon) * kx, ((c[1] + b) * SEL - v.lat) * ky]);
      x = ((c[0] + 0.5) * SEL - v.lon) * kx; y = ((c[1] + 0.5) * SEL - v.lat) * ky;
      tot += c[2]; mx += c[2] * x; my += c[2] * y; jmax = Math.max(jmax, Math.hypot(x, y));
    }
    return { poligon: selubung(pts).map(function (q) { return [v.lon + q[0] / kx, v.lat + q[1] / ky]; }), arah_deg: (Math.atan2(mx / tot, my / tot) / DEG + 360) % 360, jangkau_km: jmax, sel_n: sel.length, di_bawah_ambang: false };
  }

  /* jejakMaks(hasil) -> {jam, jangkau_km, arah_deg, sel_n} jejak berambang sah terjauh atas semua jam, atau null (seri: jam paling awal) */
  function jejakMaks(hasil) {
    var best = null, i, k;
    for (i = 0; i < hasil.jam.length; i++) {
      k = jejak(hasil, hasil.jam[i]);
      if (!k.di_bawah_ambang && (best === null || k.jangkau_km > best.jangkau_km)) best = { jam: hasil.jam[i], jangkau_km: k.jangkau_km, arah_deg: k.arah_deg, sel_n: k.sel_n };
    }
    return best;
  }

  /* jejakTipis(hasil, jam) -> sebaran MENTAH tanpa ambang (persentil 90 jarak), untuk animasi; bukan area dampak */
  function jejakTipis(hasil, jam) {
    var s = null, i, v = hasil.vent, kk = proyeksi(v), kx = kk[0], ky = kk[1], xy = [], d, thr, kept = [], mx = 0, my = 0, hull;
    for (i = 0; i < hasil.snap.length; i++) if (hasil.snap[i].jam === jam) s = hasil.snap[i];
    if (!s) throw new Error('jam ' + jam + ' tidak ada');
    for (i = 0; i < s.lon.length; i++) if (s.aktif[i]) xy.push([(s.lon[i] - v.lon) * kx, (s.lat[i] - v.lat) * ky]);
    if (!xy.length) return { poligon: [], arah_deg: null, jangkau_km: 0 };
    d = xy.map(function (q) { return Math.hypot(q[0], q[1]); }).sort(function (a, b) { return a - b; });
    thr = d[Math.floor(0.9 * (d.length - 1))];
    for (i = 0; i < xy.length; i++) if (Math.hypot(xy[i][0], xy[i][1]) <= thr) { kept.push(xy[i]); mx += xy[i][0]; my += xy[i][1]; }
    mx /= kept.length; my /= kept.length;
    hull = selubung(kept);
    return { poligon: hull.map(function (q) { return [v.lon + q[0] / kx, v.lat + q[1] / ky]; }), arah_deg: (Math.atan2(mx, my) / DEG + 360) % 360, jangkau_km: thr };
  }

  /* endapan(hasil, {titik:[{lat,lon}], radius_km=2}) -> massa relatif 0..1 tiap titik (partikel mendarat dalam radius, dinormalkan ke terbanyak) */
  function endapan(hasil, o) {
    var s = hasil.snap[hasil.snap.length - 1], kk = proyeksi(hasil.vent), kx = kk[0], ky = kk[1], rad = o.radius_km == null ? 2 : o.radius_km, jml = [], m = 0, t, i, cx, cy, k;
    for (t = 0; t < o.titik.length; t++) {
      cx = o.titik[t].lon * kx; cy = o.titik[t].lat * ky; k = 0;
      for (i = 0; i < s.lon.length; i++) if (s.darat[i] && Math.hypot(s.lon[i] * kx - cx, s.lat[i] * ky - cy) <= rad) k++;
      jml.push(k); if (k > m) m = k;
    }
    return jml.map(function (x) { return m ? x / m : 0; });
  }

  var API = { jalankan: jalankan, jejak: jejak, jejakTipis: jejakTipis, jejakMaks: jejakMaks, selBerambang: selBerambang, merKgS: merKgS, endapan: endapan, mulberry32: mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  akar.AbuModel = API;
})(typeof window !== 'undefined' ? window : globalThis);
