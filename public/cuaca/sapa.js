"use strict";
/* Pop-up "Situasi cuaca ekstrem hari ini": mesin dan tata letak di public/inti/sapa.js (Sapa.daftar), sama dengan karhutla dan banjir.
   Sekali per hari WIB per peramban (kunci pb_sapa_cuaca), muncul di /cuaca dan /cuaca/peta. Angka dari S (prakiraan, nowcast, gelombang) yang sudah dimuat halaman.
   Skrip klasik, dimuat SESUDAH peta.js dan mulai.js. Global: S, Insight, Peta, bukaTab, esc, fmt, namaProv, warnaHujan, warnaAngin, sevWarna, GEL, KELAS_HUJAN, tingkat, AMB. */
(() => {
  Sapa.daftar("cuaca", {
    ikon: {hujan: '<path d="M7 14a4 4 0 0 1-.5-8A6 6 0 0 1 18 5a4 4 0 0 1-1 9"/><path d="M8 17v3M12 16v4M16 17v3"/>', angin: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
      ombak: '<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2M2 18c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2"/>'},
    siap: () => !!(S.pr && S.meta && typeof Insight !== "undefined"),
    hitung() {
      const h = Insight.maksHari(S.h0, 3), a = Insight.maksHari(S.h0, 4); if (!h.r) return null;
      const P = {}; for (const r of S.pr.sel) { const p = P[r[2]] ||= {k: r[2], hujan: 0, angin: 0, nc: 0}; p.hujan = Math.max(p.hujan, r[3][S.h0] || 0); p.angin = Math.max(p.angin, r[4][S.h0] || 0); }
      S.nc.forEach(x => x.prov.forEach(k => { if (P[k]) P[k].nc += x.n; }));
      const prov = Object.values(P).filter(p => p.hujan >= AMB().hujan[0] || p.angin >= AMB().angin_kmj[0] || p.nc).sort((x, y) => y.hujan - x.hujan || y.nc - x.nc).slice(0, 5);
      return {h, a, prov, nc: S.nc.map((x, i) => ({...x, i})).sort((x, y) => y.n - x.n).slice(0, 4), gl: [...S.gl].sort((x, y) => y.lv - x.lv || y.total - x.total)};
    },
    html(h) {
      const prov = namaProv, mm = v => fmt(Math.round(v)), kec = S.nc.reduce((s, x) => s + x.n, 0);
      const perhatian = [h.gl.length && Sapa.kartu("ombak", GEL[h.gl[0].lv - 1][3], "Gelombang tinggi", `<b>${fmt(h.gl.length)}</b> provinsi dalam peringatan BMKG Maritim; tertinggi: <span translate="no">${esc(prov(h.gl[0].prov))} (${GEL[h.gl[0].lv - 1][1].toLowerCase()})</span>`),
        ...S.nc.filter(x => x.severity === "Severe" || x.severity === "Extreme").slice(0, 2).map(x => Sapa.kartu("awas", sevWarna(x.severity), "Peringatan BMKG", `<span translate="no">${esc(x.headline || x.event)}</span>`))].filter(Boolean).join("");
      return Sapa.rangka({ikon: "hujan", eyebrow: "Situasi cuaca ekstrem hari ini",
        judul: h.h.v >= AMB().hujan[0] ? `Hujan ${KELAS_HUJAN[tingkat(h.h.v, AMB().hujan)]} <b>${mm(h.h.v)} mm</b> diprakirakan di <span translate="no">${esc(prov(h.h.r[2]))}</span> hari ini`
          : `Hujan terlebat hari ini <b>${mm(h.h.v)} mm</b> <span translate="no">(${esc(prov(h.h.r[2]))})</span>, belum mencapai kelas lebat`,
        chips: [["angin", `embusan terkuat ${mm(h.a.v)} km/jam`], S.nc.length && ["awas", `${fmt(S.nc.length)} nowcast · ${fmt(kec)} kecamatan`]],
        bagian: [
          h.prov.length && ["Provinsi perlu perhatian", "ps", h.prov.map(p => Sapa.provBaris(esc(prov(p.k)), [Sapa.pil(`${mm(p.hujan)} mm`, p.hujan >= 100 ? "merah" : p.hujan >= 50 ? "oranye" : "prov", "hujan"),
            Sapa.pil(`${mm(p.angin)} km/jam`, p.angin >= 72 ? "oranye" : "prov", "angin"), ...(p.nc ? [Sapa.pil(`${fmt(p.nc)} kecamatan nowcast`, "oranye")] : [])])).join("")],
          h.nc.length && ["Peringatan nowcast terluas", "ks", h.nc.map((x, i) => Sapa.item(x.i, i + 1, esc(x.event), esc((x.headline || "").replace(/^.* di /, "")), `<em class="sp-p ${x.severity === "Severe" || x.severity === "Extreme" ? "merah" : "oranye"}" translate="no">${esc(x.severity)}</em>`, `<em class="sp-p prov">${fmt(x.n)} kecamatan</em>`)).join("")],
          perhatian && ["Perlu perhatian", "cs", perhatian]],
        sumber: "Open-Meteo, ECMWF, BMKG"});
    },
    saatKlik(e, d) { const b = e.target.closest("[data-k]"); if (!b) return; d.close(); bukaTab("peta"); nanti(() => Peta.fokus("nc", +b.dataset.k)); return true; },
  });
})();
