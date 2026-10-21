/* Kerusakan bangunan dan korban jiwa dari PGA: kurva kerapuhan lognormal per kelas bangunan (HAZUS-MH, FEMA 2003) + satu pengali
   median yang disetel ke kejadian nyata (data/kalibrasi_kerusakan.json, scripts/gempa/kalibrasi_kerusakan.mjs).
   GempaKerusakan.atur(kalibrasi)  ·  .sebaran(ctx, sk, r, jg, win)  ·  .taksir(sebaran, jg, m, jam)  ·  .dampak(ctx, sk)
   Hasil taksir = {rb, rs, rr, jiwa, rumah}, tiap angka [rendah, tengah, tinggi].
   Pita: PGA digeser +-tau antar-kejadian (guncangan sama untuk seluruh kecamatan); sebaran antar-kecamatan (phi) masuk ke beta kerapuhan
   (beta_eff = sqrt(beta^2 + phi^2)); ketidakpastian kerapuhan dan letalitas digabung di ruang log: sqrt(0,35^2 + faktor-galat-LOO^2).
   Angka parameter ditulis dari ingatan sumbernya (HAZUS pre-code, BSSA14, Zhao 2006 lewat OpenQuake): validasi-model wajib mencocokkan.
   Hasil model, belum divalidasi penuh. Bukan prakiraan. */
(function (g) {
  "use strict";
  var G = 980.665, RAD = Math.PI / 180;
  /* BSSA14 PGA: phi 0,695 (M <= 4,5) turun ke 0,495 (M >= 5,5); tau 0,398 turun ke 0,348. Zhao06 total 0,678 antarmuka / 0,684 slab (OpenQuake zhao_2006.py);
     tau antar-kejadian Zhao ASUMSI 0,40, phi = sisanya. */
  var ZHAO_TOTAL = { antarmuka: 0.678, intraslab: 0.684 }, ZHAO_TAU = 0.40;
  /* median PGA (g) batas ringan / sedang / berat / runtuh (Complete), beta lognormal; letal = peluang penghuni tewas bila Complete (HAZUS indoor casualty).
     tembokan = URML pre-code, kayu = W1 pre-code (HAZUS, PGA); beton = RM/C pre-code, nilai mendekati URML-W1 (kurang pasti). bagian = asumsi porsi stok (BPS: dinding tembok ~70%). */
  var KELAS = [
    { id: "tembokan", nama: "Tembok tanpa tulangan", bagian: 0.40, med: [0.13, 0.17, 0.26, 0.37], beta: 0.64, letal: 0.015 },
    { id: "beton", nama: "Beton bertulang dan tembok terkekang", bagian: 0.30, med: [0.15, 0.24, 0.40, 0.60], beta: 0.64, letal: 0.014 },
    { id: "kayu", nama: "Kayu, bambu, dan lainnya", bagian: 0.30, med: [0.18, 0.29, 0.51, 0.77], beta: 0.64, letal: 0.002 }
  ];
  var JIWA_PER_RUMAH = 3.9, SIGMA_STOK = 0.35;
  var KAL = { kalib: 1, faktorLoo: 1 };

  function atur(k) { if (k) { KAL.kalib = k.kalib; KAL.faktorLoo = k.faktor_loo; } return KAL; }

  function sigma(jenis, m) {
    if (jenis === "kerak") { var f = Math.max(0, Math.min(1, (5.5 - m) / 1)); return { tau: 0.348 + f * 0.05, phi: 0.495 + f * 0.2 }; }
    var tot = ZHAO_TOTAL[jenis] || ZHAO_TOTAL.intraslab; return { tau: ZHAO_TAU, phi: Math.sqrt(tot * tot - ZHAO_TAU * ZHAO_TAU) };
  }
  /* okupansi rumah menurut jam lokal (HAZUS: tinggal 99% pukul 2, 75% pukul 14, 94% pukul 17); tanpa jam = rata-rata 0,85 */
  function okupansi(jam) {
    if (jam == null) return 0.85;
    var h = ((jam % 24) + 24) % 24;
    return h < 6 ? 0.99 : h < 9 ? 0.9 : h < 16 ? 0.75 : h < 20 ? 0.94 : 0.99;
  }
  function jamLokal(isoUtc, lon) { var d = Date.parse(isoUtc); if (!isFinite(d)) return null; return ((new Date(d).getUTCHours() + new Date(d).getUTCMinutes() / 60) + (lon < 115 ? 7 : lon < 135 ? 8 : 9)) % 24; }

  function erf(x) { /* Abramowitz & Stegun 7.1.26, galat < 1,5e-7 */
    var s = x < 0 ? -1 : 1, t = 1 / (1 + 0.3275911 * Math.abs(x)); x = Math.abs(x);
    return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  }
  var cdf = function (z) { return 0.5 * (1 + erf(z / Math.SQRT2)); };

  /* peluang terlampaui tiap batas, dipecah RR (ringan), RS (sedang), RB (berat + runtuh). phi = sebaran guncangan antar-kecamatan,
     dilebur ke beta; kal = pengali median (tanpa argumen = hasil kalibrasi) */
  function rusak(pgaCms2, kelas, phi, kal) {
    var pg = pgaCms2 / G, k = typeof kelas === "string" ? KELAS.filter(function (x) { return x.id === kelas; })[0] : kelas;
    var gs = kal == null ? KAL.kalib : kal, be = Math.sqrt(k.beta * k.beta + (phi || 0) * (phi || 0));
    var e = k.med.map(function (m) { return pg > 0 ? cdf(Math.log(pg / (m * gs)) / be) : 0; });
    return { rr: e[0] - e[1], rs: e[1] - e[2], rb: e[2], runtuh: e[3] };
  }
  function pita(pg, jenis, m) { var t = sigma(jenis, m).tau; return [pg * Math.exp(-t), pg, pg * Math.exp(t)]; }

  /* kec = [{p, pg}] (pg = PGA tengah cm/s2). Tiga lajur PGA (p16/p50/p84 antar-kejadian) lalu dilebarkan di ruang log oleh ketidakpastian stok */
  function taksir(kec, jenis, m, jam, tengah) {
    var sg = sigma(jenis, m), occ = okupansi(jam), faktor = [Math.exp(-sg.tau), 1, Math.exp(sg.tau)];
    var mentah = ["rb", "rs", "rr", "jiwa"].reduce(function (o, n) { o[n] = [0, 0, 0]; return o; }, {}), rumahTot = 0;
    kec.forEach(function (c) {
      var rumah = c.p / JIWA_PER_RUMAH; rumahTot += rumah;
      faktor.forEach(function (f, n) {
        if (tengah && n !== 1) return; /* penyetelan kalibrasi hanya butuh lajur tengah */
        KELAS.forEach(function (k) {
          var r = rusak(c.pg * f, k, sg.phi), n0 = rumah * k.bagian;
          mentah.rb[n] += n0 * r.rb; mentah.rs[n] += n0 * r.rs; mentah.rr[n] += n0 * r.rr;
          mentah.jiwa[n] += n0 * r.runtuh * JIWA_PER_RUMAH * occ * k.letal;
        });
      });
    });
    var sf = Math.sqrt(SIGMA_STOK * SIGMA_STOK + Math.pow(Math.log(KAL.faktorLoo), 2)), out = { rumah: rumahTot, okupansi: occ, sigmaStok: sf };
    Object.keys(mentah).forEach(function (n) {
      var a = mentah[n], mid = a[1], lo = Math.min(a[0], a[1], a[2]), hi = Math.max(a[0], a[1], a[2]);
      if (!(mid > 0)) { out[n] = [0, 0, 0]; return; }
      var sl = lo > 0 ? Math.log(mid / lo) : 0, sh = Math.log(hi / mid);
      out[n] = [mid * Math.exp(-Math.sqrt(sl * sl + sf * sf)), mid, mid * Math.exp(Math.sqrt(sh * sh + sf * sf))];
    });
    return out;
  }

  var kmDua = function (la1, lo1, la2, lo2) { var x = (lo2 - lo1) * RAD * 6371 * Math.cos((la1 + la2) / 2 * RAD), y = (la2 - la1) * RAD * 6371; return Math.hypot(x, y); };
  /* PGA di pusat tiap kecamatan dalam jendela win (km) dari pusat sk; ctx = {M, Tsunami, model, vs30?, pusat, pend}; r = bidang patahan (Tsunami.rupture) */
  function sebaran(ctx, sk, r, jg, win) {
    var w = ctx.model.param.wells_coppersmith94, lw4 = Math.pow(10, w.a + w.b * sk.m) / 4, vs = ctx.vs30 || function () { return 400; }, out = [];
    for (var k in ctx.pusat) {
      var la = ctx.pusat[k][0], lo = ctx.pusat[k][1]; if (kmDua(sk.lat, sk.lon, la, lo) > win) continue;
      /* BSSA14 memakai Rjb ke proyeksi bidang; kedalaman pusat hanya masuk lewat Zhao (antarmuka, slab) dan tsunami: sengaja, bukan galat */
      var pg = ctx.M.pga(sk.m, ctx.Tsunami.jarakRupture(r, la, lo) + lw4, sk.dalam, jg, vs(la, lo)), v = ctx.M.pgaKeMmi(pg);
      if (v >= 2) out.push({ k: k, lat: la, lon: lo, pg: pg, v: v, p: ctx.pend[k] || 0, vs30: vs(la, lo) });
    }
    return out;
  }
  /* satu kejadian utuh, jalur yang sama dengan Sim.hitung: sk = {lat, lon, m, dalam, jenis, strike, jam?}; jg = kerak | antarmuka | intraslab.
     siap() menghitung PGA per kecamatan sekali (mahal); taksir(...) di atasnya murah dan boleh diulang dengan kalibrasi lain */
  function siap(ctx, sk, jg) {
    jg = jg || "kerak";
    var r = ctx.Tsunami.rupture({ lat: sk.lat, lon: sk.lon, m: sk.m, dalam: sk.dalam, jenis: sk.jenis, strike: sk.strike });
    var win = ctx.M.jendelaKm(sk.m, sk.dalam, jg) + Math.max(r.L, r.Wh) / 2;
    return { s: sebaran(ctx, sk, r, jg, win), jg: jg, m: sk.m, jam: sk.jam };
  }
  function dampak(ctx, sk, jg) { var q = siap(ctx, sk, jg); return taksir(q.s, q.jg, q.m, q.jam); }

  g.GempaKerusakan = { atur: atur, sigma: sigma, okupansi: okupansi, jamLokal: jamLokal, rusak: rusak, pita: pita, taksir: taksir, sebaran: sebaran, siap: siap, dampak: dampak, KELAS: KELAS, cdf: cdf, get kal() { return KAL; } };
})(typeof window !== "undefined" ? window : globalThis);
