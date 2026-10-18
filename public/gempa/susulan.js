/* Peluang gempa susulan (Reasenberg-Jones + keragaman a, pola Page dkk. 2016) di peramban: kembaran scripts/gempa/susulan.py.
   Pakai:  await Susulan.muat();  Susulan.peluang(mUtama, tMulaiHari, durasiHari, mMin) -> {p, n, lo, hi}
           Susulan.sesuaikan(mUtama, [{t_hari, m}], tKiniHari) -> param baru (posterior a satu urutan)
   Tampilkan hanya target yang Susulan.terbit[target] === true; rentang lo/hi hanya bila mUtama <= Susulan.rentangMaksMu.
   sesuaikan() memakai penyesuaian hanya bila model terbit_sesuaikan === true (atau argumen aktif eksplisit). Kesetaraan dijaga scripts/gempa/uji_js_susulan.py. */
(function (g) {
  "use strict";
  var T0 = 0.04, NZ = 81, Z10 = 1.2815515655446004, SIMPUL = [], BOBOT = [];
  (function () {
    var s = 0, i, w = [];
    for (i = 0; i < NZ; i++) { SIMPUL.push(-4 + 8 * i / (NZ - 1)); w.push(Math.exp(-SIMPUL[i] * SIMPUL[i] / 2)); }
    for (i = 0; i < NZ; i++) s += w[i];
    for (i = 0; i < NZ; i++) BOBOT.push(w[i] / s);
  })();

  function angka(x) { return typeof x === "number" && isFinite(x); }
  function cek(P) {
    if (!P) throw new Error("param susulan belum dimuat (panggil Susulan.muat)");
    ["a", "b", "p", "c", "mc", "sa", "alfa", "m_ref"].forEach(function (k) {
      if (!angka(P[k])) throw new Error("param " + k + " harus angka hingga");
    });
    if (P.b <= 0 || P.c <= 0 || P.sa < 0 || P.p < 0.3 || P.p > 3 || P.alfa < 0 || P.alfa > 3) throw new Error("param di luar rentang fisik");
  }
  function integral(t1, t2, p, c) {
    if (t2 <= t1) return 0;
    if (Math.abs(p - 1) < 1e-9) return Math.log((t2 + c) / (t1 + c));
    return (Math.pow(t2 + c, 1 - p) - Math.pow(t1 + c, 1 - p)) / (1 - p);
  }
  function produktif(P, mu, mmin) { return Math.pow(10, P.b * (mu - mmin) + (P.alfa - P.b) * (mu - P.m_ref)); }

  function peluang(mUtama, tMulai, durasi, mMin, P) {
    P = P || S.param; cek(P);
    if (![mUtama, tMulai, durasi, mMin].every(angka)) throw new Error("argumen peluang harus angka hingga");
    if (tMulai < 0 || durasi < 0) throw new Error("tMulai dan durasi tidak boleh negatif");
    var K = produktif(P, mUtama, mMin) * integral(tMulai, tMulai + durasi, P.p, P.c), pr = 0, n = 0;
    for (var i = 0; i < NZ; i++) {
      var lam = Math.pow(10, P.a + P.sa * SIMPUL[i]) * K;
      pr += BOBOT[i] * (1 - Math.exp(-lam)); n += BOBOT[i] * lam;
    }
    return { p: pr, n: n, lo: 1 - Math.exp(-Math.pow(10, P.a - Z10 * P.sa) * K), hi: 1 - Math.exp(-Math.pow(10, P.a + Z10 * P.sa) * K) };
  }

  /* aktif bawaan = model_susulan.json terbit_sesuaikan (bila dimuat); false -> param generik tak berubah, hanya n_amat */
  function sesuaikan(mUtama, susulan, tKini, P, aktif) {
    P = P || S.param; cek(P);
    if (aktif == null) aktif = S.model ? S.model.terbit_sesuaikan === true : true;
    if (!angka(tKini) || tKini < 0) throw new Error("tKini harus angka >= 0");
    if (!Array.isArray(susulan)) throw new Error("susulan harus daftar {t_hari, m}");
    var n = 0, i;
    susulan.forEach(function (s) {
      if (!s || !angka(s.t_hari) || !angka(s.m)) throw new Error("susulan tak sah");
      if (s.m >= P.mc - 1e-9 && s.t_hari >= T0 && s.t_hari <= tKini) n++;
    });
    var out = Object.assign({}, P);
    if (tKini <= T0) { out.n_amat = 0; return out; }
    if (!aktif) { out.n_amat = n; return out; }
    var K = produktif(P, mUtama, P.mc) * integral(T0, tKini, P.p, P.c), lw = [], mx = -Infinity;
    for (i = 0; i < NZ; i++) {
      var lam = Math.pow(10, P.a + P.sa * SIMPUL[i]) * K;
      lw.push(Math.log(BOBOT[i]) + n * Math.log(lam) - lam); if (lw[i] > mx) mx = lw[i];
    }
    var s = 0, m = 0, v = 0;
    for (i = 0; i < NZ; i++) { lw[i] = Math.exp(lw[i] - mx); s += lw[i]; m += lw[i] * (P.a + P.sa * SIMPUL[i]); }
    m /= s;
    for (i = 0; i < NZ; i++) v += lw[i] * Math.pow(P.a + P.sa * SIMPUL[i] - m, 2);
    out.a = m; out.sa = Math.sqrt(Math.max(0, v / s)); out.n_amat = n;
    return out;
  }

  var S = {
    param: null, terbit: null, model: null, rentangMaksMu: null,
    muat: function (url) {
      return fetch(url || "/gempa/data/model_susulan.json").then(function (r) {
        if (!r.ok) throw new Error("model_susulan.json HTTP " + r.status);
        return r.json();
      }).then(function (m) { cek(m.param); S.model = m; S.param = m.param; S.terbit = m.terbit_target || {};
        S.rentangMaksMu = m.rentang_maks_mu; return S; /* di atas rentangMaksMu: tampilkan p saja, tanpa lo/hi */ });
    },
    peluang: peluang, sesuaikan: sesuaikan
  };
  g.Susulan = S;
})(typeof window !== "undefined" ? window : globalThis);
