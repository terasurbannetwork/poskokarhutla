"use strict";
/* Pop-up "Situasi kekeringan hari ini": mesin dan tata letak di public/inti/sapa.js (Sapa.daftar), sama dengan karhutla dan banjir.
   Sekali per hari WIB per peramban (kunci pb_sapa_kekeringan), muncul di /kekeringan dan /kekeringan/peta. Angka dari S.meta dan S.wil yang sudah dimuat halaman.
   Skrip klasik, dimuat SESUDAH peta.js dan mulai.js. Global: S, Peta, Analisa, bukaTab, esc, fmt, rb, namaProv, tepat, LEVEL, WARNA_LV. */
(() => {
  Sapa.daftar("kekeringan", {
    ikon: {hth: '<path d="M12 3v18M7 8c2 0 4 1 5 3M17 8c-2 0-4 1-5 3"/><path d="M5 20h14"/>', laporan: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', kering: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', musim: '<path d="M12 3v18M5 8c3 0 5 2 7 5M19 8c-3 0-5 2-7 5"/>'},
    siap: () => !!(S.meta && S.wil),
    hitung() {
      const N = S.meta.nasional; if (!N.kab_n[1]) return null;
      const prov = Object.entries(S.wil.prov).map(([k, v]) => ({k, n: tepat(v.kab_n).reverse(), jiwa: v.jiwa[2]})).filter(x => x.n[0] || x.n[1])
        .sort((a, b) => b.n[0] - a.n[0] || b.n[1] - a.n[1] || b.jiwa - a.jiwa).slice(0, 5);
      const kab = Object.entries(S.wil.kab).filter(([, v]) => v.lv >= 2).map(([k, v]) => ({k, ...v})).sort((a, b) => b.lv - a.lv || b.jiwa[2] - a.jiwa[2]).slice(0, 4);
      /* HTH terpanjang (kab + hari), perubahan pekan ini (jiwa HTH 31 hari atau lebih sekarang vs 7 hari lalu), peluang kering bulan depan: semua dibuang bila datanya tak ada */
      const H = S.hth, T = H?.terpanjang, kT = T && (H.kab[T.kab] ? T.kab : Object.keys(H.kab).find(k => H.kab[k].kode === T.kab));   /* medan terpanjang dari pipeline (seri -> penduduk terbanyak); cadangan: maks lalu jiwa */
      const hk = kT ? [kT, {maks: T.hari}, Math.max(0, (T.n_seri || 1) - 1)] : H && Object.entries(H.kab).filter(([, v]) => v.maks > 0).sort((a, b) => b[1].maks - a[1].maks || b[1].j31 - a[1].j31)[0];
      const sr = H?.nasional?.seri?.j31, minggu = sr && sr.length > 7 ? {kini: sr.at(-1), lalu: sr.at(-8)} : null;
      const P = prakAda(S.prak?.nasional) ? S.prak.nasional : null;
      return {N, tp: tepat(N.kab_n).reverse(), prov, kab, enso: S.meta.enso, hk, hmaks: H?.nasional?.maks, hj31: H?.nasional?.j31, minggu, P};
    },
    html(h) {
      const e = h.enso, perhatian = e && /El Ni|La Ni/i.test(e.status) && Sapa.kartu("musim", "#c9503a", `<span translate="no">${esc(e.status)}</span> berlangsung`, `Peluang bertahan <b>${fmt(e.peluang)}%</b>; <span translate="no">hingga ${esc(e.hingga)}${e.iod ? `, ${esc(e.iod)}` : ""}</span>`);
      const hk = h.hk && h.hk[1], mg = h.minggu, P = h.P, bs = BASELINE_PRAK("pk1", 0), pk = P && P.lead[0]?.pk1;
      const hthKartu = hk && Sapa.kartu("hth", "#c9503a", "Hari tanpa hujan", `Terpanjang <b>${fmt(hk.maks)} hari</b> di <span translate="no">${esc(h.hk[0].split("|")[1])}</span>${h.hk[2] ? ` dan ${fmt(h.hk[2])} kabupaten/kota lain` : ""}, ${namaProv(h.hk[0].split("|")[0]) ? esc(namaProv(h.hk[0].split("|")[0])) : ""}; <b>${jt(h.hj31)} jiwa</b> tinggal di wilayah HTH 31 hari atau lebih`);
      const dm = mg && mg.kini - mg.lalu, pekan = mg && Sapa.kartu("kering", dm > 0 ? "#c9503a" : "#2f7d4f", "Perubahan pekan ini", dm === 0 ? `Jiwa di wilayah HTH 31 hari atau lebih tetap <b>${jt(mg.kini)}</b> sejak 7 hari lalu` : `Jiwa di wilayah HTH 31 hari atau lebih <b>${dm > 0 ? "naik" : "turun"} ${jt(Math.abs(dm))} jiwa</b> sejak 7 hari lalu, kini ${jt(mg.kini)}`);
      const depan = pk != null && Sapa.kartu("musim", "#1d4e89", `Prakiraan bulan depan <span translate="no">(${esc(BELUM_UJI.toLowerCase())})</span>`, `Peluang SPI-3 ≤ −1 rerata <b>${fmt(Math.round(pk))}%</b>${bs != null ? ` (baseline ${fmt(Math.round(bs))}%)` : ""}; <b>${jt(P.jiwa_pk1_50?.[0] || 0)} jiwa</b> tinggal di wilayah berpeluang 50% atau lebih`);
      const lap = Sapa.kartu("laporan", "#1d4e89", "Laporan harian", `<a href="/kekeringan/laporan.html" style="color:inherit;text-decoration:underline">Buka laporan harian kekeringan</a>`);
      return Sapa.rangka({ikon: "kering", eyebrow: "Situasi kekeringan hari ini",
        judul: `<b>${fmt(h.N.kab_n[1])}</b> kabupaten/kota berstatus Siaga atau Awas kekeringan`,
        chips: [["awas", `${fmt(h.tp[0])} Awas · ${fmt(h.tp[1])} Siaga`], ["kering", `${jt(h.N.jiwa[2])} jiwa di kecamatan Awas`], ["musim", `Hujan SPI ${spiBulan()}`]],
        bagian: [
          h.prov.length && ["Provinsi perlu perhatian", "ps", h.prov.map(o => Sapa.provBaris(esc(namaProv(o.k)), [o.n[0] ? Sapa.pil(`${fmt(o.n[0])} kab/kota Awas`, "merah", "kering") : "", o.n[1] ? Sapa.pil(`${fmt(o.n[1])} Siaga`, "oranye") : "", o.jiwa ? Sapa.pil(`${jt(o.jiwa)} jiwa`, "prov") : ""].filter(Boolean))).join("")],
          h.kab.length && ["Kabupaten/kota status tertinggi", "ks", h.kab.map((x, i) => { const p = x.k.split("|");
            return Sapa.item(esc(x.k), i + 1, esc(p[1]), esc(namaProv(p[0])), `<em class="sp-p ${x.lv === 3 ? "merah" : "oranye"}">${LEVEL[x.lv]}</em>`, `<em class="sp-p prov">${rb(x.jiwa[2])} jiwa</em>`); }).join("")],
          (hthKartu || pekan || depan || perhatian) && ["Perlu perhatian", "cs", [hthKartu, pekan, depan, perhatian, lap].filter(Boolean).join("")]],
        sumber: "Deteksi Centurisk97"});
    },
    saatKlik(e, d) { const b = e.target.closest("[data-k]"); if (!b) return; d.close(); const k = b.dataset.k; S.jalur = [k.split("|")[0]]; bukaTab("peta"); Peta.aturWilayah().then(() => Analisa.wilayah(k)); return true; },
  });
})();
