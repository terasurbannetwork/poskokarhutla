/* Peringkat perlakuan tanggap gempa (KI-40): tim SAR untuk bangunan runtuh, tenda dan air bersih untuk pengungsi. Fungsi murni, mesin peringkatnya public/inti/perlakuan.js.
   Masukan: hasil GempaKerusakan.taksir ({rb, rs, jiwa} masing-masing [rendah, tengah, tinggi], rumah). Keluaran: opsi diperingkat menurut orang-hari terbantu per Rp,
   front Pareto, kestabilan peringkat bila jumlah kerusakan dan produktivitas tim bergeser (undian bersama). SIMULASI, bukan prakiraan; tak ada angka kejadian nyata di sini.
   Angka satuan: yang bersumber ditandai bersumber:true; sisanya ASUMSI yang bisa diganti pemakai (param) dan selalu tampil berlabel "asumsi". */
(function (g) {
  "use strict";
  /* kebutuhan Sphere 2018 = salinan scripts/prediksi/aturan.json "sphere" (dasar Perka BNPB 7/2008, dipakai scripts/prediksi/terbit.py kebutuhan()); uji menjaga kesamaan */
  var SPHERE = { sumber: "Sphere Handbook 2018 (scripts/prediksi/aturan.json)", air_l: 15, hunian_m2: 3.5, jamban_per: 20, kkal: 2100 };
  var ASUMSI = {
    jiwa_per_rumah: { v: 3.9, label: "jiwa per rumah", sumber: "public/gempa/kerusakan.js JIWA_PER_RUMAH", bersumber: true },
    frak_rs_ungsi: { v: 0.5, label: "bagian rumah rusak sedang yang penghuninya mengungsi", sumber: "tanpa sumber, asumsi pemodel", bersumber: false },
    rasio_terjebak: { v: 2, label: "terjebak hidup per korban meninggal model", sumber: "tanpa sumber, asumsi pemodel", bersumber: false },
    hari_sar: { v: 3, label: "hari jendela pencarian (72 jam)", sumber: "acuan umum jendela SAR, asumsi", bersumber: false },
    kap_tim: { v: 1.5, label: "orang diselamatkan per tim SAR per hari", sumber: "tanpa sumber, ganti dengan data Basarnas/BPBD", bersumber: false },
    biaya_tim_hari: { v: 15e6, label: "Rp per tim SAR per hari", sumber: "tanpa sumber, ganti dengan data BNPB/Basarnas", bersumber: false },
    hari_ungsi: { v: 7, label: "hari mengungsi yang dilayani", sumber: "tanpa sumber, asumsi pemodel (gunung api memakai 3)", bersumber: false },
    biaya_orang_hari: { v: 50000, label: "Rp per jiwa per hari (makan, air, tenda)", sumber: "salinan public/gunungapi/sim_tanggap.js BAWAAN.biaya_orang_hari, juga ASUMSI", bersumber: false }
  };
  var TIM = [0, 5, 10, 20], COVER = [0, 0.25, 0.5, 1];
  var nilaiAsumsi = function (p) { var o = {}; Object.keys(ASUMSI).forEach(function (k) { o[k] = p && p[k] != null ? p[k] : ASUMSI[k].v; }); return o; };
  /* tiga angka [rendah, tengah, tinggi] dibaca di kuantil u (0..1): piecewise-linear lewat tengah */
  var baca = function (a, u) { return u < 0.5 ? a[0] + (a[1] - a[0]) * 2 * u : a[1] + (a[2] - a[1]) * (2 * u - 1); };

  function opsiDaftar() {
    var out = [];
    TIM.forEach(function (n) { COVER.forEach(function (c) {
      if (!n && !c) return;
      out.push({ nama: [n ? n + " tim SAR" : "", c ? "tenda dan air untuk " + Math.round(c * 100) + "% pengungsi" : ""].filter(Boolean).join(", ").replace(/^./, function (x) { return x.toUpperCase(); }), tim: n, cover: c });
    }); });
    return out;
  }
  /* satu opsi di satu undian u = [skala kerusakan 0..1, produktivitas tim 0..1]; dasar (tanpa tim, tanpa cakupan) = {selamat: 0, biaya: 0} */
  function hitung(K, P, o, u) {
    var rb = baca(K.rb, u[0]), rs = baca(K.rs, u[0]), mati = baca(K.jiwa, u[0]);
    var ungsi = P.jiwa_per_rumah * (rb + P.frak_rs_ungsi * rs), terjebak = mati * P.rasio_terjebak, prod = 0.5 + u[1];
    var selamatSar = Math.min(terjebak, o.tim * P.kap_tim * prod * P.hari_sar), terlayani = o.cover * ungsi;
    return { selamat: (selamatSar + terlayani) * P.hari_ungsi, biaya: o.tim * P.biaya_tim_hari * P.hari_sar + terlayani * P.hari_ungsi * P.biaya_orang_hari, ungsi: ungsi, terjebak: terjebak, sar: selamatSar };
  }
  function analisis(K, param, opsi) {
    var PK = g.Perlakuan; if (!PK) throw new Error("inti/perlakuan.js belum dimuat");
    var P = nilaiAsumsi(param), ops = opsiDaftar(), tengah = [0.5, 0.5], b = opsi || {};
    var dasar = { nama: "Tanpa perlakuan", selamat: 0, biaya: 0, tim: 0, cover: 0 };
    var baris = [dasar].concat(ops.map(function (o) { var r = hitung(K, P, o, tengah); return { nama: o.nama, tim: o.tim, cover: o.cover, selamat: r.selamat, biaya: r.biaya }; }));
    PK.tandaiPareto(baris);
    var par = PK.front(baris, dasar); par.forEach(function (x) { x.per_juta = x.biaya > 0 ? x.selamat / (x.biaya / 1e6) : null; });
    var stab = PK.kestabilan(ops, function (o, u) { return hitung(K, P, o, u); }, { biji: b.biji || 1, n: b.n || 200, dim: 2 });
    var t = hitung(K, P, { tim: 0, cover: 1 }, tengah);
    var kebutuhan = { mengungsi: t.ungsi, air_l_hari: t.ungsi * SPHERE.air_l, hunian_m2: t.ungsi * SPHERE.hunian_m2, jamban: Math.ceil(t.ungsi / SPHERE.jamban_per), terjebak: t.terjebak };
    return { dasar: dasar, pareto: par, semua: baris.length, stabilitas: stab, kebutuhan: kebutuhan, param: P };
  }
  g.GempaTanggap = { ASUMSI: ASUMSI, SPHERE: SPHERE, TIM: TIM, COVER: COVER, opsiDaftar: opsiDaftar, hitung: hitung, analisis: analisis, nilaiAsumsi: nilaiAsumsi };
})(typeof window !== "undefined" ? window : globalThis);
