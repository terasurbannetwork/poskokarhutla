"use strict";
/* Pop-up "Situasi gunung api hari ini": mesin dan tata letak di public/inti/sapa.js (Sapa.daftar), sama dengan karhutla dan banjir.
   Sekali per hari WIB per peramban (kunci pb_sapa_gunungapi), muncul di /gunungapi dan /gunungapi/peta. Angka dari S.st (status PVMBG/MAGMA) yang sudah dimuat halaman.
   Skrip klasik, dimuat SESUDAH peta.js dan mulai.js. Global: S, Peta, Detail, bukaTab, esc, fmt, LEVEL, WARNA_LV, tglJam. */
(() => {
  const H = 36e5;
  Sapa.daftar("gunungapi", {
    ikon: {gunung: '<path d="M3 20 9 9h6l6 11z"/><path d="M12 9V6M9.5 5l-1-2M14.5 5l1-2"/>', erupsi: '<path d="M12 3v7M9 6l3-3 3 3M5 20h14l-3-7H8z"/>'},
    siap: () => !!(S.st?.gunung?.length && S.n),
    hitung() {
      const tinggi = S.st.gunung.filter(g => g.level >= 2).sort((a, b) => b.level - a.level || a.nama.localeCompare(b.nama)); if (!tinggi.length) return null;
      const erupsi = (S.st.letusan || []).filter(x => Date.now() - Date.parse(x.waktu) <= 24 * H);
      const per = new Map(); erupsi.forEach(x => per.set(x.gunung, (per.get(x.gunung) || 0) + 1));
      return {tinggi, erupsi, per: [...per].sort((a, b) => b[1] - a[1]).slice(0, 4)};
    },
    html(h) {
      const n = S.n, g0 = S.st.gunung;
      const perhatian = h.per.map(([nm, c]) => { const g = g0.find(x => x.nama === nm); const e = h.erupsi.find(x => x.gunung === nm);
        return Sapa.kartu("erupsi", WARNA_LV[g?.level || 2], `Erupsi <span translate="no">${esc(nm)}</span>`, `<b>${fmt(c)}</b> erupsi dalam 24 jam, terakhir <span translate="no">${esc(tglJam(e.waktu))}</span>`); }).join("");
      return Sapa.rangka({ikon: "gunung", eyebrow: "Situasi gunung api hari ini",
        judul: `<b>${fmt(h.tinggi.length)}</b> gunung api berstatus Waspada ke atas dari ${fmt(g0.length)} yang dipantau`,
        chips: [["awas", `${fmt(n[4])} Awas · ${fmt(n[3])} Siaga`], ["erupsi", `${fmt(h.erupsi.length)} erupsi · 24 jam`]],
        bagian: [
          ["Gunung berstatus tertinggi", "ks", h.tinggi.slice(0, 4).map((g, i) => Sapa.item(esc(g.nama), i + 1, esc(g.nama), esc(g.prov),
            `<em class="sp-p ${g.level >= 4 ? "merah" : g.level === 3 ? "oranye" : "prov"}">Level ${LEVEL[g.level][0]} ${LEVEL[g.level][1]}</em>`, g.tinggi ? `<em class="sp-p prov">${fmt(g.tinggi)} m</em>` : "")).join("")],
          perhatian && ["Perlu perhatian", "cs", perhatian]],
        sumber: "PVMBG (MAGMA Indonesia)"});
    },
    saatKlik(e, d) { const b = e.target.closest("[data-k]"); if (!b) return; d.close(); const g = S.st.gunung.find(x => x.nama === b.dataset.k);
      bukaTab("peta"); if (g) nanti(() => { Peta.terbang(g); Detail.buka(g); }); return true; },
  });
})();
