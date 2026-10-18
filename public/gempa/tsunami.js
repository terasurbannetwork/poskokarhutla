/* Tsunami skenario di peramban: waktu tiba (gelombang panjang c = sqrt(g h)), tinggi indikatif empiris, dan stepper persamaan
   air dangkal linear untuk animasi. Grid = data/batimetri.{bin,json} (ETOPO 2022, 3 menit busur, scripts/gempa/batimetri.py).
   Pakai:  const grid = await Tsunami.muat();
           Tsunami.layak({lat, lon, m, dalam, jenis?})                       -> bool
           Tsunami.waktuTiba(grid, lat, lon, m, {dalam, jenis, strike, dip, maksMenit, pusat}) -> {menit, pantai, perKab, rupture} | null
           const s = Tsunami.swe(grid, {lat, lon, m, dalam, jenis, strike, dip}, {radiusKm}); s.langkah(n); s.eta; s.t
   Ini SIMULASI, bukan peringatan: status tsunami resmi hanya dari BMKG. Persamaan, parameter, dan batas model: tab Metode.
   Invarian fisik dijaga scripts/gempa/uji_js_tsunami.py (jalan lewat node). */
(function (g) {
  "use strict";
  var KALIBRASI = 0.85, GRAV = 9.81, RB = 6371008.8, RAD = Math.PI / 180, MU = 3e10;
  var DIP = { subduksi: 15, naik: 35, turun: 60, geser: 90 };
  /* Kj: porsi angkatan dasar laut menurut mekanisme. Sesar geser nyaris tidak mengangkat dasar laut (rake ~0). */
  var KJ = { subduksi: 1, naik: 1, turun: 1, geser: 0.2 };
  var TANDA = { subduksi: 1, naik: 1, turun: -1, geser: 1 };

  function jenisDasar(j) {
    j = String(j || "subduksi");
    if (/geser/.test(j)) return "geser";
    if (/turun|normal/.test(j)) return "turun";
    if (/naik|kerak|reverse/.test(j)) return "naik";
    return "subduksi"; /* antarmuka, intraslab, subduksi */
  }

  /* panjang & lebar rupture (km). Antarmuka: Strasser dkk. 2010; kerak: Wells & Coppersmith 1994 per mekanisme. */
  function ukuran(m, jenis) {
    var j = jenisDasar(jenis), p = {
      subduksi: [-2.477, 0.585, -0.882, 0.351], geser: [-2.57, 0.62, -0.76, 0.27],
      naik: [-2.42, 0.58, -1.61, 0.41], turun: [-1.88, 0.50, -1.14, 0.35] }[j];
    var L = Math.pow(10, p[0] + p[1] * m), W = Math.pow(10, p[2] + p[3] * m);
    var dip = DIP[j];
    /* lebar dibatasi ketebalan seismogenik: kerak 20 km, antarmuka 50 km tegak */
    W = Math.min(W, (j === "subduksi" ? 50 : 20) / Math.sin(dip * RAD));
    return { L: L, W: W };
  }

  /* faktor kedalaman pusat (heuristik): gempa makin dalam makin kecil angkatan dasar lautnya.
     Subduksi penuh <= 30 km, nol >= 70 km; kerak penuh <= 20 km, nol >= 40 km; linear di antaranya. */
  function faktorDalam(dalam, jenis) {
    var b = jenisDasar(jenis) === "subduksi" ? [30, 70] : [20, 40], d = dalam == null ? 10 : dalam;
    return d <= b[0] ? 1 : d >= b[1] ? 0 : 1 - (d - b[0]) / (b[1] - b[0]);
  }
  /* bidang patahan seragam: M0 = mu A D -> slip D; angkatan awal = D sin(dip) Kj kd (tanda negatif untuk sesar turun) */
  function rupture(e) {
    var j = jenisDasar(e.jenis), uk = ukuran(e.m, j), dip = e.dip != null ? e.dip : DIP[j];
    var M0 = Math.pow(10, 1.5 * e.m + 9.1), D = M0 / (MU * uk.L * uk.W * 1e6);
    var Wh = Math.max(2, uk.W * Math.cos(dip * RAD)), L = uk.L;
    if (e.strike == null) { L = Wh = Math.sqrt(uk.L * Wh); } /* tanpa arah: persegi berluas sama */
    return { lat: e.lat, lon: e.lon, m: e.m, jenis: j, dip: dip, strike: e.strike == null ? 0 : e.strike, L: L, W: uk.W, Wh: Wh,
             M0: M0, slip: D, kd: faktorDalam(e.dalam, j), angkat: TANDA[j] * D * Math.sin(dip * RAD) * KJ[j] * faktorDalam(e.dalam, j), kj: KJ[j] };
  }

  /* koordinat lokal km terhadap pusat rupture: u sepanjang strike, v tegak lurus */
  function lokal(r, lat, lon) {
    var x = (lon - r.lon) * RAD * RB / 1000 * Math.cos(r.lat * RAD), y = (lat - r.lat) * RAD * RB / 1000;
    var s = r.strike * RAD;
    return [x * Math.sin(s) + y * Math.cos(s), x * Math.cos(s) - y * Math.sin(s)];
  }
  function jarakRupture(r, lat, lon) {
    var p = lokal(r, lat, lon), du = Math.max(0, Math.abs(p[0]) - r.L / 2), dv = Math.max(0, Math.abs(p[1]) - r.Wh / 2);
    return Math.hypot(du, dv);
  }

  /* ---------- grid ---------- */
  function dariBuffer(meta, buf) {
    var z = new Int16Array(buf);
    if (z.length !== meta.nx * meta.ny) throw new Error("batimetri: " + z.length + " sel, harap " + meta.nx * meta.ny);
    return { lon0: meta.lon0, lat0: meta.lat0, d: meta.d, nx: meta.nx, ny: meta.ny, z: z, meta: meta };
  }
  var janji = null;
  function muat(dasar) {
    dasar = dasar || "/gempa/data/";
    return janji || (janji = Promise.all([fetch(dasar + "batimetri.json").then(function (r) { return r.json(); }),
      fetch(dasar + "batimetri.bin").then(function (r) { if (!r.ok) throw new Error("batimetri.bin " + r.status); return r.arrayBuffer(); })])
      .then(function (a) { return (T.grid = dariBuffer(a[0], a[1])); }, function (e) { janji = null; throw e; }));
  }
  function sel(G, lat, lon) {
    var j = Math.round((lat - G.lat0) / G.d), i = Math.round((lon - G.lon0) / G.d);
    return j < 0 || i < 0 || j >= G.ny || i >= G.nx ? -1 : j * G.nx + i;
  }
  function nilai(G, lat, lon) { var k = sel(G, lat, lon); return k < 0 ? null : G.z[k]; }
  var cepat = function (h) { return Math.sqrt(GRAV * Math.max(h, 1)); };

  /* sel di dalam jejak rupture (atau <= tambahKm darinya); fn(k, j, i) */
  function tiapSelRupture(G, r, tambahKm, fn) {
    var rad = (Math.hypot(r.L, r.Wh) / 2 + tambahKm) / 111.19, kc = Math.max(0.2, Math.cos(r.lat * RAD));
    var j0 = Math.max(0, Math.floor((r.lat - rad - G.lat0) / G.d)), j1 = Math.min(G.ny - 1, Math.ceil((r.lat + rad - G.lat0) / G.d));
    var i0 = Math.max(0, Math.floor((r.lon - rad / kc - G.lon0) / G.d)), i1 = Math.min(G.nx - 1, Math.ceil((r.lon + rad / kc - G.lon0) / G.d));
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++)
      if (jarakRupture(r, G.lat0 + j * G.d, G.lon0 + i * G.d) <= tambahKm) fn(j * G.nx + i, j, i);
  }

  /* layak dihitung tsunaminya: M >= 6,5, faktor kedalaman > 0 (subduksi < 70 km, kerak < 40 km; tanpa jenis = subduksi),
     dan jejak bidang patahan <= 20 km dari sel laut. Tanpa grid termuat, syarat laut dilewati. e = objek gempa {lat, lon, m, dalam, jenis?}. */
  function layak(e, G) {
    G = G || T.grid;
    if (!e || !(e.m >= 6.5) || !(e.dalam == null || e.dalam < 100) || faktorDalam(e.dalam, e.jenis) <= 0) return false;
    if (!G) return true;
    var ada = false, r = rupture(e);
    tiapSelRupture(G, r, 20, function (k) { if (G.z[k] < 0) ada = true; });
    return ada;
  }

  /* tinggi indikatif di pantai (m). Abe 1995: log Hr = Mw - log R - 5,55; R >= R0, log R0 = 0,5 Mw - 2,25; Hm = 2 Hr.
     Koreksi Green terhadap kedalaman sel pantai (rujukan 50 m), dibatasi 0,7-1,5 (heuristik). Rentang = 0,5 Hr .. 2 Hr. kd = faktorDalam. */
  function tinggi(m, rKm, hPantai, jenis, kd) {
    var R0 = Math.pow(10, 0.5 * m - 2.25), R = Math.max(rKm, R0);
    var hr = Math.pow(10, m - Math.log10(R) - 5.55) * Math.min(1.5, Math.max(0.7, Math.pow(50 / Math.max(hPantai, 1), 0.25))) * KJ[jenisDasar(jenis)] * (kd == null ? 1 : kd);
    return { m: hr, lo: 0.5 * hr, hi: 2 * hr };
  }

  /* heap biner min dengan hapus malas */
  function Heap(n) { this.k = new Float64Array(n); this.v = new Int32Array(n); this.n = 0; }
  Heap.prototype.push = function (key, val) {
    if (this.n === this.k.length) { var k2 = new Float64Array(this.n * 2), v2 = new Int32Array(this.n * 2); k2.set(this.k); v2.set(this.v); this.k = k2; this.v = v2; }
    var i = this.n++, K = this.k, V = this.v;
    while (i > 0) { var p = (i - 1) >> 1; if (K[p] <= key) break; K[i] = K[p]; V[i] = V[p]; i = p; }
    K[i] = key; V[i] = val;
  };
  Heap.prototype.pop = function () {
    var K = this.k, V = this.v, top = V[0]; this.topK = K[0];
    var n = --this.n, key = K[n], val = V[n], i = 0;
    while (true) { var c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && K[c + 1] < K[c]) c++; if (K[c] >= key) break; K[i] = K[c]; V[i] = V[c]; i = c; }
    K[i] = key; V[i] = val; return top;
  };

  /* 16 tetangga; tiap langkah hanya sah bila sel yang dilewati juga laut (tidak menembus tanjung satu sel) */
  var LANGKAH = [[0, 1, []], [0, -1, []], [1, 0, []], [-1, 0, []],
    [1, 1, [[0, 1], [1, 0]]], [1, -1, [[0, -1], [1, 0]]], [-1, 1, [[0, 1], [-1, 0]]], [-1, -1, [[0, -1], [-1, 0]]],
    [1, 2, [[0, 1], [1, 1]]], [2, 1, [[1, 0], [1, 1]]], [-1, 2, [[0, 1], [-1, 1]]], [-2, 1, [[-1, 0], [-1, 1]]],
    [1, -2, [[0, -1], [1, -1]]], [2, -1, [[1, 0], [1, -1]]], [-1, -2, [[0, -1], [-1, -1]]], [-2, -1, [[-1, 0], [-1, -1]]]];

  /* waktu tempuh (detik) dari jejak rupture ke tiap sel laut: Dijkstra 16 tetangga, biaya tepi = jarak x rata-rata 1/c.
     jalur (km) = panjang lintasan tercepat lewat laut, dipakai sebagai R tinggi indikatif (pantai di balik selat/pulau lebih jauh) */
  function waktuTempuh(G, r, maksDetik, jalur) {
    var nx = G.nx, ny = G.ny, N = nx * ny, z = G.z, t = new Float64Array(N).fill(Infinity), slow = new Float32Array(N), sudah = new Uint8Array(N);
    for (var k = 0; k < N; k++) slow[k] = z[k] < 0 ? 1 / cepat(-z[k]) : 0;
    var dy = G.d * RAD * RB, dxj = new Float64Array(ny);
    for (var j = 0; j < ny; j++) dxj[j] = G.d * RAD * RB * Math.cos((G.lat0 + j * G.d) * RAD);
    var H = new Heap(1 << 16), benih = 0;
    tiapSelRupture(G, r, 0.6 * G.d * 111.19, function (k) { if (z[k] < 0) { t[k] = 0; H.push(0, k); benih++; } });
    if (!benih) { /* pusat di darat dekat pantai: benih = sel laut <= 20 km dari jejak, waktu = jarak / c lokal */
      tiapSelRupture(G, r, 20, function (k, jj, ii) { if (z[k] < 0) { var dk = jarakRupture(r, G.lat0 + jj * G.d, G.lon0 + ii * G.d), tt = dk * 1000 * slow[k]; if (tt < t[k]) { t[k] = tt; if (jalur) jalur[k] = dk; H.push(tt, k); } } });
    }
    while (H.n) {
      var c = H.pop(), tc = H.topK;
      if (sudah[c] || tc > t[c]) continue;
      sudah[c] = 1; if (tc > maksDetik) break;
      var cj = (c / nx) | 0, ci = c - cj * nx;
      for (var a = 0; a < 16; a++) {
        var L = LANGKAH[a], nj = cj + L[0], ni = ci + L[1];
        if (nj < 0 || nj >= ny || ni < 0 || ni >= nx) continue;
        var q = nj * nx + ni; if (z[q] >= 0 || sudah[q]) continue;
        var lewat = L[2], ok = true;
        for (var b = 0; b < lewat.length; b++) { var w = (cj + lewat[b][0]) * nx + ci + lewat[b][1]; if (z[w] >= 0) { ok = false; break; } }
        if (!ok) continue;
        var dx = 0.5 * (dxj[cj] + dxj[nj]) * L[1], d = Math.sqrt(dx * dx + dy * L[0] * dy * L[0]);
        var tn = tc + d * 0.5 * (slow[c] + slow[q]);
        if (tn < t[q]) { t[q] = tn; if (jalur) jalur[q] = jalur[c] + d / 1000; H.push(tn, q); }
      }
    }
    return t;
  }

  /* pusat = {"prov|kab|kec": [lat, lon]} -> fungsi (lat, lon) -> kunci kecamatan terdekat <= batasKm */
  function pencariKec(pusat, batasKm) {
    var ember = {}, B = 0.5;
    for (var k in pusat) { var p = pusat[k], e = Math.floor(p[0] / B) + "," + Math.floor(p[1] / B); (ember[e] || (ember[e] = [])).push(k); }
    return function (lat, lon) {
      var best = null, bd = batasKm, a = Math.floor(lat / B), b = Math.floor(lon / B);
      for (var u = -1; u <= 1; u++) for (var v = -1; v <= 1; v++) {
        var l = ember[(a + u) + "," + (b + v)]; if (!l) continue;
        for (var i = 0; i < l.length; i++) { var p = pusat[l[i]], d = Math.hypot((p[0] - lat) * 111.19, (p[1] - lon) * 111.19 * Math.cos(lat * RAD)); if (d < bd) { bd = d; best = l[i]; } }
      }
      return best;
    };
  }

  function waktuTiba(G, lat, lon, m, opsi) {
    opsi = opsi || {};
    var e = { lat: lat, lon: lon, m: m, dalam: opsi.dalam, jenis: opsi.jenis, strike: opsi.strike, dip: opsi.dip };
    if (!layak(e, G)) return null;
    var r = rupture(e), jalur = new Float32Array(G.nx * G.ny), t = waktuTempuh(G, r, (opsi.maksMenit || 180) * 60, jalur), nx = G.nx, ny = G.ny, z = G.z;
    var menit = new Float32Array(t.length);
    /* kalibrasi 0,85: lintasan tercepat sel-ke-sel tiba 3-5 menit lebih lambat daripada stepper SWE di pantai Jawa
       (uji_js_tsunami.py butir 7); dikali 0,85 supaya tidak memihak "sempat". opsi.kalibrasi = false untuk waktu mentah. */
    var kal = opsi.kalibrasi === false ? 1 : KALIBRASI;
    for (var k = 0; k < t.length; k++) menit[k] = t[k] / 60 * kal;
    var cari = opsi.pusat ? pencariKec(opsi.pusat, 40) : null, pantai = [], kab = {};
    for (var j = 1; j < ny - 1; j++) for (var i = 1; i < nx - 1; i++) {
      var c = j * nx + i; if (z[c] >= 0 || !(menit[c] <= (opsi.maksMenit || 180))) continue;
      if (z[c + 1] < 0 && z[c - 1] < 0 && z[c + nx] < 0 && z[c - nx] < 0) continue; /* bukan sel pantai */
      var la = G.lat0 + j * G.d, lo = G.lon0 + i * G.d, h = tinggi(m, Math.max(jarakRupture(r, la, lo), jalur[c]), -z[c], r.jenis, r.kd);
      var p = { lat: +la.toFixed(3), lon: +lo.toFixed(3), menit: Math.round(menit[c] * 10) / 10, tinggi_m: Math.round(h.m * 10) / 10, tinggi_lo: Math.round(h.lo * 10) / 10, tinggi_hi: Math.round(h.hi * 10) / 10 };
      if (cari) { var kk = cari(la, lo); if (kk) { var s = kk.split("|"); p.kab = s[1]; p.prov = s[0]; p.kec = s[2];
        var a = kab[s[0] + "|" + s[1]]; if (!a) a = kab[s[0] + "|" + s[1]] = { prov: s[0], kab: s[1], menit: Infinity, tinggi_m: 0, tinggi_lo: 0, tinggi_hi: 0, lat: la, lon: lo, n: 0 };
        a.n++; if (p.menit < a.menit) { a.menit = p.menit; a.lat = p.lat; a.lon = p.lon; a.kec = s[2]; }
        if (p.tinggi_m > a.tinggi_m) { a.tinggi_m = p.tinggi_m; a.tinggi_lo = p.tinggi_lo; a.tinggi_hi = p.tinggi_hi; } } }
      pantai.push(p);
    }
    var perKab = Object.keys(kab).map(function (k) { return kab[k]; }).sort(function (a, b) { return a.menit - b.menit; });
    return { menit: menit, pantai: pantai, perKab: perKab, rupture: r };
  }

  /* garis lurus a->b tidak melewati laut (sampel tiap 0,4 sel; sel pertama diabaikan karena titik awal pesisir) */
  function lewatDarat(G, la0, lo0, la1, lo1) {
    var n = Math.ceil(Math.hypot(la1 - la0, lo1 - lo0) / (0.4 * G.d));
    for (var s = 1; s <= n; s++) { var f = s / n, la = la0 + f * (la1 - la0), lo = lo0 + f * (lo1 - lo0);
      if (Math.hypot(la - la0, lo - lo0) < G.d) continue; var k = sel(G, la, lo); if (k < 0 || G.z[k] < 0) return false; }
    return true;
  }
  /* sel tanah >= minElev terdekat (jarak lurus) yang garisnya tidak melewati laut, cincin melebar sampai maksKm. Untuk jalur evakuasi. */
  function tempatTinggi(G, lat, lon, minElev, maksKm) {
    minElev = minElev == null ? 20 : minElev; maksKm = maksKm || 30;
    var j0 = Math.round((lat - G.lat0) / G.d), i0 = Math.round((lon - G.lon0) / G.d), kc = Math.cos(lat * RAD), best = null, bd = Infinity;
    var maksR = Math.ceil(maksKm / (G.d * 111.19 * kc));
    for (var rr = 0; rr <= maksR; rr++) {
      if (best && rr * G.d * 111.19 * kc > bd) break;
      for (var dj = -rr; dj <= rr; dj++) for (var di = -rr; di <= rr; di++) {
        if (Math.max(Math.abs(dj), Math.abs(di)) !== rr) continue;
        var j = j0 + dj, i = i0 + di; if (j < 0 || i < 0 || j >= G.ny || i >= G.nx || G.z[j * G.nx + i] < minElev) continue;
        var la = G.lat0 + j * G.d, lo = G.lon0 + i * G.d, d = Math.hypot((la - lat) * 111.19, (lo - lon) * 111.19 * kc);
        if (d < bd && lewatDarat(G, lat, lon, la, lo)) { bd = d; best = { lat: la, lon: lo, km: d, elev: G.z[j * G.nx + i] }; }
      }
    }
    return best && best.km <= maksKm ? best : null;
  }

  /* ---------- persamaan air dangkal linear, grid Arakawa C, skema maju-mundur (fluks dari muka air lama, lalu muka air dari fluks baru) ----------
     eta_t + (1/A) div(Q) = 0 ; Q_t + g h grad(eta) = 0 ; Q = h u. Volume hingga di bola: luas sel A_j = dx_j dy.
     Pantai = dinding (fluks 0) di sisi sel darat (kontur 0 m). Batas subgrid = dinding + spons penyerap selebar SPONS sel. */
  function swe(G, e, opsi) {
    opsi = opsi || {};
    var r = e.angkat != null ? e : rupture(e), radKm = opsi.radiusKm || 1200, kc = Math.cos(r.lat * RAD);
    var ext = (radKm + Math.hypot(r.L, r.Wh) / 2) / 111.19;
    var J0 = Math.max(0, Math.floor((r.lat - ext - G.lat0) / G.d)), J1 = Math.min(G.ny - 1, Math.ceil((r.lat + ext - G.lat0) / G.d));
    var I0 = Math.max(0, Math.floor((r.lon - ext / kc - G.lon0) / G.d)), I1 = Math.min(G.nx - 1, Math.ceil((r.lon + ext / kc - G.lon0) / G.d));
    if (opsi.kotak) { J0 = opsi.kotak[0]; J1 = opsi.kotak[1]; I0 = opsi.kotak[2]; I1 = opsi.kotak[3]; }
    var nx = I1 - I0 + 1, ny = J1 - J0 + 1, N = nx * ny;
    var h = new Float32Array(N), eta = new Float32Array(N), maks = new Float32Array(N), M = new Float32Array((nx + 1) * ny), Nf = new Float32Array(nx * (ny + 1));
    var hM = new Float32Array((nx + 1) * ny), hN = new Float32Array(nx * (ny + 1)), sp = new Float32Array(N).fill(1);
    var dy = G.d * RAD * RB, dx = new Float64Array(ny), dxf = new Float64Array(ny + 1), hmax = 1;
    for (var j = 0; j < ny; j++) dx[j] = G.d * RAD * RB * Math.cos((G.lat0 + (J0 + j) * G.d) * RAD);
    for (j = 0; j <= ny; j++) dxf[j] = G.d * RAD * RB * Math.cos((G.lat0 + (J0 + j - 0.5) * G.d) * RAD);
    for (j = 0; j < ny; j++) for (var i = 0; i < nx; i++) { var zz = G.z[(J0 + j) * G.nx + I0 + i]; if (zz < 0) { h[j * nx + i] = Math.max(-zz, 1); if (-zz > hmax) hmax = -zz; } }
    /* kedalaman di muka sel: rata-rata dua sel laut; 0 (tertutup) bila salah satu darat atau di tepi subgrid */
    for (j = 0; j < ny; j++) for (i = 1; i < nx; i++) { var a = h[j * nx + i - 1], b = h[j * nx + i]; hM[j * (nx + 1) + i] = a && b ? 0.5 * (a + b) : 0; }
    for (j = 1; j < ny; j++) for (i = 0; i < nx; i++) { a = h[(j - 1) * nx + i]; b = h[j * nx + i]; hN[j * nx + i] = a && b ? 0.5 * (a + b) : 0; }
    var SP = opsi.spons == null ? 12 : opsi.spons;
    if (SP) for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var tepi = Math.min(i, j, nx - 1 - i, ny - 1 - j); if (tepi < SP) sp[j * nx + i] = 1 - 0.12 * Math.pow((SP - tepi) / SP, 2); }
    var dxmin = Math.min(dy, dx[0], dx[ny - 1]), dt = (opsi.cfl || 0.7) * dxmin / Math.sqrt(2 * GRAV * hmax);
    /* perpindahan awal: angkatan seragam di jejak rupture (sel laut), tepi dihaluskan 2x kotak 3x3 */
    if (!opsi.tanpaSumber) {
      var tmp = new Float32Array(N);
      for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) if (jarakRupture(r, G.lat0 + (J0 + j) * G.d, G.lon0 + (I0 + i) * G.d) <= 0) tmp[j * nx + i] = r.angkat;
      for (var ul = 0; ul < 2; ul++) { var o = new Float32Array(N);
        for (j = 1; j < ny - 1; j++) for (i = 1; i < nx - 1; i++) { var s = 0; for (var u = -1; u <= 1; u++) for (var v = -1; v <= 1; v++) s += tmp[(j + u) * nx + i + v]; o[j * nx + i] = s / 9; }
        tmp = o; }
      for (var k = 0; k < N; k++) if (h[k]) eta[k] = tmp[k];
    }
    var S = { nx: nx, ny: ny, I0: I0, J0: J0, h: h, eta: eta, maks: maks, M: M, N: Nf, dt: dt, t: 0, rupture: r,
      kotak: [G.lon0 + (I0 - 0.5) * G.d, G.lat0 + (J0 - 0.5) * G.d, G.lon0 + (I1 + 0.5) * G.d, G.lat0 + (J1 + 0.5) * G.d],
      langkah: function (n) {
        var gdt = GRAV * dt;
        for (var s = 0; s < (n || 1); s++) {
          for (var j = 0; j < ny; j++) { var gx = gdt / dx[j], b = j * (nx + 1), c = j * nx;
            for (var i = 1; i < nx; i++) { var hf = hM[b + i]; if (hf) M[b + i] -= gx * hf * (eta[c + i] - eta[c + i - 1]); } }
          var gy = gdt / dy;
          for (j = 1; j < ny; j++) { c = j * nx;
            for (i = 0; i < nx; i++) { hf = hN[c + i]; if (hf) Nf[c + i] -= gy * hf * (eta[c + i] - eta[c - nx + i]); } }
          for (j = 0; j < ny; j++) { var A = dt / (dx[j] * dy), b2 = j * (nx + 1), c2 = j * nx, f0 = dxf[j], f1 = dxf[j + 1];
            for (i = 0; i < nx; i++) { var k = c2 + i; if (!h[k]) continue;
              var e2 = eta[k] - A * ((M[b2 + i + 1] - M[b2 + i]) * dy + Nf[k + nx] * f1 - Nf[k] * f0);
              if (SP && sp[k] < 1) { e2 *= sp[k]; M[b2 + i] *= sp[k]; Nf[k] *= sp[k]; }
              eta[k] = e2; if (e2 > maks[k]) maks[k] = e2; } }
          S.t += dt;
        }
      },
      /* volume (m3) = jumlah eta x luas sel laut */
      /* titik simpan untuk geser waktu mundur tanpa menghitung ulang dari awal */
      simpan: function () { return { t: S.t, eta: eta.slice(), M: M.slice(), N: Nf.slice(), maks: maks.slice() }; },
      pulih: function (c) { eta.set(c.eta); M.set(c.M); Nf.set(c.N); maks.set(c.maks); S.t = c.t; },
      massa: function () { var m = 0; for (var j = 0; j < ny; j++) { var A = dx[j] * dy; for (var i = 0; i < nx; i++) { var k = j * nx + i; if (h[k]) m += eta[k] * A; } } return m; },
      luas: function (j) { return dx[j] * dy; } };
    return S;
  }

  var T = { muat: muat, dariBuffer: dariBuffer, layak: layak, waktuTiba: waktuTiba, tinggi: tinggi, ukuran: ukuran, rupture: rupture,
            jarakRupture: jarakRupture, faktorDalam: faktorDalam, lewatDarat: lewatDarat, lokal: lokal, nilai: nilai, sel: sel, cepat: cepat, tempatTinggi: tempatTinggi, swe: swe,
            pencariKec: pencariKec, jenisDasar: jenisDasar, grid: null };
  g.Tsunami = T;
})(typeof window !== "undefined" ? window : globalThis);
