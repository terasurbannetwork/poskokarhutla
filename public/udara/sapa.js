"use strict";
/* Pop-up "Situasi kualitas udara hari ini": mesin dan tata letak di public/inti/sapa.js (Sapa.daftar), sama dengan karhutla dan banjir.
   Sekali per hari WIB per peramban (kunci pb_sapa_udara), muncul di /udara dan /udara/peta. Angka perkiraan model CAMS (bukan ISPU resmi) dari S.uk yang sudah dimuat halaman.
   Skrip klasik, dimuat SESUDAH peta.js dan mulai.js. Global: S, Peta, bukaTab, esc, fmt, namaProv, jiwa, metarSegar, kelasJP, JP. */
(() => {
  const ts = p => p[2] + p[3] + p[4];
  Sapa.daftar("udara", {
    ikon: {udara: '<path d="M4 14h11a3 3 0 1 0-3-3M3 18h14a3 3 0 1 1-3 3M6 10h4"/>', kabut: '<path d="M4 9h16M6 13h12M4 17h16"/>'},
    siap: () => !!(S.uk && S.asap && S.sel),
    hitung() {
      const n0 = S.uk.nasional[0].jiwa, n1 = S.uk.nasional[1]?.jiwa; if (!ts(n0)) return null;
      const prov = Object.entries(S.uk.prov).map(([k, hs]) => ({k, p: hs[0], t: ts(hs[0])})).filter(x => x.t > 0).sort((a, b) => b.t - a.t).slice(0, 5);
      const kab = (S.uk.kab[0] || []).filter(r => r[5] > 0).sort((a, b) => b[5] - a[5]).slice(0, 4);
      return {n0, besok: n1 ? ts(n1) : null, prov, kab, kabut: metarSegar().filter(m => kelasJP(m.vis_m) >= 2).sort((a, b) => a.vis_m - b.vis_m)};
    },
    html(h) {
      const sekarang = ts(h.n0), selisih = h.besok == null ? 0 : h.besok - sekarang;
      const arah = h.besok == null ? "" : selisih > 0 ? `, <b class="naik">▲ ${jiwa(selisih)}</b> besok` : selisih < 0 ? `, <b class="turun">▼ ${jiwa(-selisih)}</b> besok` : ", sama besok";
      const perhatian = h.kabut.length && Sapa.kartu("kabut", JP[kelasJP(h.kabut[0].vis_m)].w, "Jarak pandang rendah", `<b>${fmt(h.kabut.length)}</b> bandara melaporkan jarak pandang di bawah 5 km; terendah: <span translate="no">${fmt(h.kabut[0].vis_m)} m, ${esc(h.kabut[0].nama)}</span>`);
      return Sapa.rangka({ikon: "udara", eyebrow: "Situasi kualitas udara hari ini",
        judul: `<b>${jiwa(sekarang)}</b> terpapar udara tidak sehat${arah}`,
        chips: [["awas", `${rb(h.n0[3] + h.n0[4])} jiwa sangat tidak sehat atau berbahaya`], ["udara", `PM2,5 rata-rata ${fmt(Math.round(S.uk.nasional[0].rata))} µg/m³`]],
        bagian: [
          h.prov.length && ["Provinsi perlu perhatian", "ps", h.prov.map(o => Sapa.provBaris(esc(namaProv(o.k)), [Sapa.pil(jiwa(o.t), o.p[3] + o.p[4] ? "merah" : "oranye", "udara"), Sapa.pil(`PM2,5 ${fmt(Math.round(o.p[5]))} µg/m³`, "prov")])).join("")],
          h.kab.length && ["Kabupaten/kota paling terpapar", "ks", h.kab.map((r, i) => Sapa.item(esc(r[0]), i + 1, esc(r[1]), esc(namaProv(r[0])), `<em class="sp-p merah">${jiwa(r[5])}</em>`, `<em class="sp-p prov">${fmt(Math.round(r[3]))} µg/m³</em>`)).join("")],
          perhatian && ["Perlu perhatian", "cs", perhatian]],
        sumber: "Copernicus CAMS via Open-Meteo, METAR; perkiraan model, bukan ISPU resmi"});
    },
    saatKlik(e, d) { const b = e.target.closest("[data-k]"); if (!b) return; d.close(); bukaTab("peta"); nanti(() => Peta.pilihProv(b.dataset.k)); return true; },
  });
})();
