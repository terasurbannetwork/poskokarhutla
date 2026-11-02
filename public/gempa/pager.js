/* Perkiraan korban jiwa model empiris USGS PAGER (koefisien resmi Indonesia), kembaran scripts/gempa/pager.py (uji_js_pager.py).
   jiwa = sum_MMI penduduk(MMI) * Phi(ln(MMI/13,248768)/0,150846), MMI bulat 4..10. Pita kali/bagi 4. Kelas PAGER: hijau <1, kuning 1-99, oranye 100-999, merah >=1000.
   Sumber: usgs/pager fatality.xml v2.2 ccode ID (Jaiswal & Wald 2010). Tidak menghitung korban tsunami atau likuefaksi.
   Pakai: GempaPager.hitung(per)  per = {kelasMMI: penduduk} dari GempaGuncangan.paparan(). */
(function (g) {
  "use strict";
  var THETA = 13.248768, BETA = 0.150846, PITA = 4, KELAS = [[1000, "merah"], [100, "oranye"], [1, "kuning"], [0, "hijau"]];
  /* erfc Chebyshev (Numerical Recipes), galat relatif < 1,2e-7 */
  function erfc(x) {
    var z = Math.abs(x), t = 2 / (2 + z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function phi(x) { return 0.5 * erfc(-x / Math.SQRT2); }
  function kelas(j) { for (var i = 0; i < KELAS.length; i++) if (j >= KELAS[i][0]) return KELAS[i][1]; }
  function hitung(per) {
    var j = 0;
    for (var k in per) { var m = Math.min(10, +k); if (m >= 4 && per[k] > 0) j += per[k] * phi(Math.log(m / THETA) / BETA); }
    return { jiwa: j, bawah: j / PITA, atas: j * PITA, kelas: kelas(j) };
  }
  /* dua angka signifikan untuk tampil; kelas untuk tampil harus dari angka ini agar angka dan kelas tidak bertentangan */
  function bulat2(v) { if (v < 1) return v; var d = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1)); return Math.round(v / d) * d; }
  g.GempaPager = { hitung: hitung, bulat2: bulat2, kelas: kelas, THETA: THETA, BETA: BETA };
})(typeof window !== "undefined" ? window : globalThis);
