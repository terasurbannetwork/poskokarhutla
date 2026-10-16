"use strict";
/* Pop-up "Situasi kekeringan hari ini": mesin dan tata letak di public/inti/sapa.js (Sapa.daftar), sama dengan karhutla dan banjir.
   Sekali per hari WIB per peramban (kunci pb_sapa_kekeringan), muncul di /kekeringan dan /kekeringan/peta. Angka dari S.meta dan S.wil yang sudah dimuat halaman.
   Skrip klasik, dimuat SESUDAH peta.js dan mulai.js. Global: S, Peta, Analisa, bukaTab, esc, fmt, rb, namaProv, tepat, LEVEL, WARNA_LV. */
(() => {
  Sapa.daftar("kekeringan", {
    ikon: {kering: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', musim: '<path d="M12 3v18M5 8c3 0 5 2 7 5M19 8c-3 0-5 2-7 5"/>'},
    siap: () => !!(S.meta && S.wil),
    hitung() {
      const N = S.meta.nasional; if (!N.kab_n[1]) return null;
      const prov = Object.entries(S.wil.prov).map(([k, v]) => ({k, n: tepat(v.kab_n).reverse(), jiwa: v.jiwa[2]})).filter(x => x.n[0] || x.n[1])
        .sort((a, b) => b.n[0] - a.n[0] || b.n[1] - a.n[1] || b.jiwa - a.jiwa).slice(0, 5);
      const kab = Object.entries(S.wil.kab).filter(([, v]) => v.lv >= 2).map(([k, v]) => ({k, ...v})).sort((a, b) => b.lv - a.lv || b.jiwa[2] - a.jiwa[2]).slice(0, 4);
      return {N, tp: tepat(N.kab_n).reverse(), prov, kab, enso: S.meta.enso};
    },
    html(h) {
      const e = h.enso, perhatian = e && /El Ni|La Ni/i.test(e.status) && Sapa.kartu("musim", "#c9503a", `<span translate="no">${esc(e.status)}</span> berlangsung`, `Peluang bertahan <b>${fmt(e.peluang)}%</b>; <span translate="no">hingga ${esc(e.hingga)}${e.iod ? `, ${esc(e.iod)}` : ""}</span>`);
      return Sapa.rangka({ikon: "kering", eyebrow: "Situasi kekeringan hari ini",
        judul: `<b>${fmt(h.N.kab_n[1])}</b> kabupaten/kota berstatus Siaga atau Awas kekeringan`,
        chips: [["awas", `${fmt(h.tp[0])} Awas · ${fmt(h.tp[1])} Siaga`], ["kering", `${rb(h.N.jiwa[2])} jiwa di kecamatan Awas`], ["musim", `Hujan SPI ${spiBulan()}`]],
        bagian: [
          h.prov.length && ["Provinsi perlu perhatian", "ps", h.prov.map(o => Sapa.provBaris(esc(namaProv(o.k)), [o.n[0] ? Sapa.pil(`${fmt(o.n[0])} kab/kota Awas`, "merah", "kering") : "", o.n[1] ? Sapa.pil(`${fmt(o.n[1])} Siaga`, "oranye") : "", o.jiwa ? Sapa.pil(`${rb(o.jiwa)} jiwa`, "prov") : ""].filter(Boolean))).join("")],
          h.kab.length && ["Kabupaten/kota status tertinggi", "ks", h.kab.map((x, i) => { const p = x.k.split("|");
            return Sapa.item(esc(x.k), i + 1, esc(p[1]), esc(namaProv(p[0])), `<em class="sp-p ${x.lv === 3 ? "merah" : "oranye"}">${LEVEL[x.lv]}</em>`, `<em class="sp-p prov">${rb(x.jiwa[2])} jiwa</em>`); }).join("")],
          perhatian && ["Perlu perhatian", "cs", perhatian]],
        sumber: "Deteksi Pantau Bencana"});
    },
    saatKlik(e, d) { const b = e.target.closest("[data-k]"); if (!b) return; d.close(); const k = b.dataset.k; S.jalur = [k.split("|")[0]]; bukaTab("peta"); Peta.aturWilayah().then(() => Analisa.wilayah(k)); return true; },
  });
})();
