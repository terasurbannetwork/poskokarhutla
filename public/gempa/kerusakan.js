/* Kerusakan bangunan dan korban jiwa dari PGA: kurva kerapuhan lognormal per kelas bangunan (gaya HAZUS-MH, FEMA 2003).
   GempaKerusakan.sigmaLn(jenis)  ·  .rusak(pgaCms2, kelas, geser?)  ·  .hitung(kec, opsi?)
   kec = [{p: penduduk, pga: [p16, p50, p84] dalam cm/s2}]. Hasil = {rb, rs, rr, jiwa}, masing-masing [rendah, tengah, tinggi].
   PARAMETER INDIKATIF: median kerapuhan dan angka kematian diambil dari rentang HAZUS dan literatur kerusakan Padang 2009 / Lombok 2018
   tanpa salinan digital makalah, BELUM dikalibrasi ke data kerusakan Indonesia. validasi-model wajib mencocokkan ke sumbernya.
   Hasil model, belum divalidasi. Bukan prakiraan. */
(function (g) {
  "use strict";
  var G = 980.665;
  /* sigma ln PGA total GMPE: BSSA14 (M >= 5,5: sqrt(0,495^2 + 0,348^2) = 0,61); Zhao06 antarmuka/slab ~0,72 */
  var SIGMA = { kerak: 0.61, antarmuka: 0.72, intraslab: 0.72 };
  /* median PGA (g) untuk batas kerusakan ringan / sedang / berat / runtuh; beta = sebaran lognormal;
     letal = peluang penghuni tewas bila bangunannya mencapai batas runtuh (sudah memuat porsi yang benar-benar ambruk, HAZUS ~15%). bagian = porsi stok rumah (asumsi dari Statistik Perumahan BPS: dinding tembok sekitar 70%). */
  var KELAS = [
    { id: "tembokan", nama: "Tembok tanpa tulangan", bagian: 0.40, med: [0.10, 0.19, 0.34, 0.55], beta: 0.65, letal: 0.025 },
    { id: "beton", nama: "Beton bertulang dan tembok terkekang", bagian: 0.30, med: [0.15, 0.28, 0.50, 0.80], beta: 0.65, letal: 0.04 },
    { id: "kayu", nama: "Kayu, bambu, dan lainnya", bagian: 0.30, med: [0.25, 0.50, 0.90, 1.40], beta: 0.70, letal: 0.005 }
  ];
  var JIWA_PER_RUMAH = 3.9, OKUPANSI = 0.8, GESER_MED = 1.3, GESER_LETAL = 2;

  function erf(x) { /* Abramowitz & Stegun 7.1.26, galat < 1,5e-7 */
    var s = x < 0 ? -1 : 1, t = 1 / (1 + 0.3275911 * Math.abs(x)); x = Math.abs(x);
    return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  }
  var cdf = function (z) { return 0.5 * (1 + erf(z / Math.SQRT2)); };
  function sigmaLn(jenis) { return SIGMA[jenis] || SIGMA.kerak; }

  /* peluang terlampaui tiap batas, lalu pecah jadi RR (ringan), RS (sedang), RB (berat + runtuh); geser = pengali median (1 = tengah) */
  function rusak(pgaCms2, kelas, geser) {
    var pg = pgaCms2 / G, k = typeof kelas === "string" ? KELAS.filter(function (x) { return x.id === kelas; })[0] : kelas, gs = geser || 1;
    var e = k.med.map(function (m) { return pg > 0 ? cdf(Math.log(pg / (m * gs)) / k.beta) : 0; });
    return { rr: e[0] - e[1], rs: e[1] - e[2], rb: e[2], runtuh: e[3] };
  }

  /* tiga lajur: rendah (PGA p16, bangunan 1,3x lebih kuat, letal setengah), tengah, tinggi (PGA p84, 1,3x lebih lemah, letal dua kali) */
  function hitung(kec) {
    var lajur = [{ i: 0, g: GESER_MED, l: 1 / GESER_LETAL }, { i: 1, g: 1, l: 1 }, { i: 2, g: 1 / GESER_MED, l: GESER_LETAL }];
    var out = { rb: [0, 0, 0], rs: [0, 0, 0], rr: [0, 0, 0], jiwa: [0, 0, 0], rumah: 0 };
    kec.forEach(function (c) {
      var rumah = c.p / JIWA_PER_RUMAH; out.rumah += rumah;
      lajur.forEach(function (L, n) {
        KELAS.forEach(function (k) {
          var r = rusak(c.pga[L.i], k, L.g), n0 = rumah * k.bagian;
          out.rb[n] += n0 * r.rb; out.rs[n] += n0 * r.rs; out.rr[n] += n0 * r.rr;
          out.jiwa[n] += n0 * r.runtuh * JIWA_PER_RUMAH * OKUPANSI * Math.min(1, k.letal * L.l);
        });
      });
    });
    return out;
  }

  g.GempaKerusakan = { sigmaLn: sigmaLn, rusak: rusak, hitung: hitung, KELAS: KELAS, cdf: cdf };
})(typeof window !== "undefined" ? window : globalThis);
