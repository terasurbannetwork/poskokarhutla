/* Model guncangan (GMPE + GMICE) di peramban: kembaran scripts/gempa/guncangan.py, parameter dari data/model_guncangan.json.
   Pakai:  const M = GempaGuncangan.pasang(await (await fetch("/gempa/data/model_guncangan.json")).json());
           M.mmi(m, repiKm, dalamKm, jenis?)  ·  M.jendelaKm(m, dalamKm, jenis?)  ·  M.kecamatan({lat, lon, m, dalam, jenis?}, pusat)
   Kesetaraan dijaga scripts/gempa/uji_js_guncangan.py. Sitasi dan batas model ada di berkas JSON. Tanpa status tsunami. */
(function (g) {
  "use strict";
  var G = 980.665, R_BUMI = 6371.0088, VS30 = 400, JENIS = ["kerak", "antarmuka", "intraslab"];

  function pasang(model) {
    var P = model.param, vs0 = model.vs30_baku || VS30;

    function kelasZhao(v) { return v >= 600 ? "I" : v >= 300 ? "II" : v >= 200 ? "III" : "IV"; }
    function jarakSegmen(lat, lon, a, b) {
      var k = Math.cos(lat * Math.PI / 180), px = (a[0] - lon) * k, py = a[1] - lat, qx = (b[0] - lon) * k, qy = b[1] - lat;
      var dx = qx - px, dy = qy - py;
      var t = dx === 0 && dy === 0 ? 0 : Math.max(0, Math.min(1, -(px * dx + py * dy) / (dx * dx + dy * dy)));
      return Math.hypot(px + t * dx, py + t * dy) * Math.PI / 180 * R_BUMI;
    }
    function dekatPalung(lat, lon) {
      return P.palung.some(function (l) {
        for (var i = 0; i < l.length - 1; i++) if (jarakSegmen(lat, lon, l[i], l[i + 1]) <= P.radius_palung_km) return true;
        return false;
      });
    }
    /* >= 50 km intraslab; 15-50 km dan M >= 7: antarmuka bila <= 200 km dari palung subduksi, tanpa lat/lon error; selebihnya kerak */
    function tebakJenis(dalam, m, lat, lon) {
      if (dalam >= 50) return "intraslab";
      if (m != null && m >= 7 && dalam >= 15 && dalam < 50) {
        if (lat == null || lon == null) throw new Error("gempa dangkal M>=7 (15-50 km) butuh jenis eksplisit atau lat/lon");
        return dekatPalung(lat, lon) ? "antarmuka" : "kerak";
      }
      return "kerak";
    }
    function ekstrapolasi(v) { return !(P.mmi_valid_min <= v && v <= P.mmi_valid_maks); }
    function rjb(m, repi) { var w = P.wells_coppersmith94; return Math.max(0, repi - Math.pow(10, w.a + w.b * m) / 4); }

    function bssa(m, rj, vs30) {
      var c = P.bssa14_pga;
      function fefp(r0) {
        var fe = c.e0 + (m <= c.Mh ? c.e4 * (m - c.Mh) + c.e5 * Math.pow(m - c.Mh, 2) : c.e6 * (m - c.Mh));
        var r = Math.sqrt(r0 * r0 + c.h * c.h);
        return fe + (c.c1 + c.c2 * (m - 4.5)) * Math.log(r) + c.c3 * (r - 1);
      }
      var pgar = Math.exp(fefp(rj));
      var flin = c.clin * Math.log(Math.min(vs30, c.Vc) / c.Vref);
      var f2 = c.f4 * (Math.exp(c.f5 * (Math.min(vs30, 760) - 360)) - Math.exp(c.f5 * (760 - 360)));
      var fnl = c.f1 + f2 * Math.log((pgar + c.f3) / c.f3);
      return Math.exp(fefp(rj) + flin + fnl);
    }

    function zhao(m, x, h, jenis, vs30) {
      var c = P.zhao06_pga;
      m = Math.max(m, 0); if (jenis === "intraslab") m = Math.min(m, c.mag_maks_intraslab); h = Math.min(h, c.h_maks); /* klip hanya slab (OpenQuake SSlabNSHMP2014); antarmuka tanpa klip */
      var r = x + c.c * Math.exp(c.d * m);
      var ln = c.a * m + c.b * x - Math.log(r) + (h >= c.hc ? c.e * (h - c.hc) : 0) + c.C[kelasZhao(vs30)];
      if (jenis === "antarmuka") ln += c.SI + c.PI * (m - c.MCI) + c.QI * Math.pow(m - c.MCI, 2) + c.WI;
      else ln += c.SS + c.SSL * Math.log(x) + c.PS * (m - c.MCS) + c.QS * Math.pow(m - c.MCS, 2) + c.WS;
      return Math.exp(ln);
    }

    function pga(m, repi, dalam, jenis, vs30) {
      if (JENIS.indexOf(jenis) < 0) throw new Error("jenis harus salah satu dari " + JENIS.join(", "));
      var rj = rjb(m, repi);
      if (jenis === "kerak") return bssa(m, rj, vs30) * G;
      return zhao(m, Math.sqrt(rj * rj + dalam * dalam), dalam, jenis, vs30);
    }

    function pgaKeMmi(p) {
      var w = P.worden12_pga, lg = Math.log10(p);
      var mmi = lg <= w.t1 ? w.c1 + w.c2 * lg : w.c3 + w.c4 * lg;
      return Math.min(P.mmi_maks, Math.max(P.mmi_min, mmi));
    }

    function mmi(m, repi, dalam, jenis, vs30) {
      return pgaKeMmi(pga(m, repi, dalam, jenis || tebakJenis(dalam, m), vs30 == null ? vs0 : vs30));
    }

    function jendelaKm(m, dalam, jenis, vs30) {
      jenis = jenis || tebakJenis(dalam, m);
      var lo = 1, hi = P.jendela_maks_km;
      if (mmi(m, hi, dalam, jenis, vs30) >= P.ambang_jendela) return Math.floor(hi);
      for (var i = 0; i < 40; i++) {
        var mid = (lo + hi) / 2;
        if (mmi(m, mid, dalam, jenis, vs30) >= P.ambang_jendela) lo = mid; else hi = mid;
      }
      return Math.max(10, Math.ceil(hi / 10) * 10);
    }

    function jarakKm(la1, lo1, la2, lo2) {
      var p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180;
      var a = Math.pow(Math.sin((p2 - p1) / 2), 2) + Math.cos(p1) * Math.cos(p2) * Math.pow(Math.sin((lo2 - lo1) * Math.PI / 360), 2);
      return 2 * R_BUMI * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    /* pusat = {kunci: [lat, lon]} (public/banjir/data/pusat_kec.json); hasil hanya kecamatan di dalam jendelaKm */
    function kecamatan(gm, pusat, vs30) {
      var jenis = gm.jenis || tebakJenis(gm.dalam, gm.m, gm.lat, gm.lon), win = jendelaKm(gm.m, gm.dalam, jenis, vs30), out = {};
      for (var k in pusat) {
        var d = jarakKm(gm.lat, gm.lon, pusat[k][0], pusat[k][1]);
        if (d <= win) { var v = mmi(gm.m, d, gm.dalam, jenis, vs30); out[k] = { mmi: v, ekstrapolasi: ekstrapolasi(v) }; }
      }
      return out;
    }

    /* TAMBAHAN (fungsi murni, tidak mengubah angka di atas): fasilitas dari data/bukti.json ({fasilitas_kolom, fasilitas}) yang diperkirakan >= ambang MMI
       (baku VI) oleh gempa gm; hanya fasilitas di daftar bukti, bukan semua sekolah/RS. */
    function fasilitas(gm, bukti, ambang) {
      var c = bukti.fasilitas_kolom, it = c.indexOf("t"), inm = c.indexOf("nama"), ila = c.indexOf("lat"), ilo = c.indexOf("lon"), amb = ambang == null ? 6 : ambang;
      var jenis = gm.jenis || tebakJenis(gm.dalam, gm.m, gm.lat, gm.lon), win = jendelaKm(gm.m, gm.dalam, jenis, vs0), out = [];
      (bukti.fasilitas || []).forEach(function (r) {
        var d = jarakKm(gm.lat, gm.lon, r[ila], r[ilo]); if (d > win) return;
        var v = mmi(gm.m, d, gm.dalam, jenis, vs0); if (v >= amb) out.push({ t: r[it], nama: r[inm], mmi: v });
      });
      return out;
    }

    return { fasilitas: fasilitas, mmi: mmi, pga: function (m, r, d, j, v) { return pga(m, r, d, j || tebakJenis(d, m), v == null ? vs0 : v); },
             jendelaKm: function (m, d, j, v) { return jendelaKm(m, d, j, v == null ? vs0 : v); },
             kecamatan: function (gm, p, v) { return kecamatan(gm, p, v == null ? vs0 : v); }, tebakJenis: tebakJenis, ekstrapolasi: ekstrapolasi };
  }

  /* TAMBAHAN: penduduk per kelas MMI bulat (1..12). hasil = keluaran M.kecamatan(), pend = {kunci kecamatan: jiwa} (data/penduduk.json "kec").
     Kecamatan tanpa data penduduk dilewati dan dihitung di `tanpa`. */
  function paparan(hasil, pend) {
    var per = {}, total = 0, tanpa = 0;
    for (var k in hasil) {
      var j = pend[k]; if (!j) { tanpa++; continue; }
      var kls = Math.min(12, Math.max(1, Math.round(hasil[k].mmi))); per[kls] = (per[kls] || 0) + j; total += j;
    }
    return { per: per, total: total, tanpa: tanpa };
  }

  g.GempaGuncangan = { pasang: pasang, paparan: paparan };
})(typeof window !== "undefined" ? window : globalThis);
