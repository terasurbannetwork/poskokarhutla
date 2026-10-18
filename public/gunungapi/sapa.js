"use strict";
/* Pop-up "Situasi gunung api hari ini": mesin dan tata letak di public/inti/sapa.js (Sapa.daftar), sama dengan karhutla dan banjir.
   Sekali per hari WIB per peramban (kunci pb_sapa_gunungapi), muncul di /gunungapi dan /gunungapi/peta. Angka dari S.st (status PVMBG/MAGMA) yang sudah dimuat halaman.
   Skrip klasik, dimuat SESUDAH peta.js dan mulai.js. Global: S, Peta, Detail, bukaTab, esc, fmt, LEVEL, WARNA_LV, tglJam. */
(() => {
  const H = 36e5;
  Sapa.daftar("gunungapi", {
    ikon: {gunung: '<path d="M3 20 9 9h6l6 11z"/><path d="M12 9V6M9.5 5l-1-2M14.5 5l1-2"/>', erupsi: '<path d="M12 3v7M9 6l3-3 3 3M5 20h14l-3-7H8z"/>'},
    siap: () => !!(S.st?.gunung?.length && S.n),
    async hitung() {
      const tinggi = S.st.gunung.filter(g => g.level >= 2).sort((a, b) => b.level - a.level || a.nama.localeCompare(b.nama)); if (!tinggi.length) return null;
      const erupsi = (S.st.letusan || []).filter(x => Date.now() - Date.parse(x.waktu) <= 24 * H);
      const per = new Map(); erupsi.forEach(x => per.set(x.gunung, (per.get(x.gunung) || 0) + 1));
      const batas = new Date(Date.now() - 2 * 24 * H).toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"});   /* 72 jam = hari ini + 2 hari sebelumnya (perubahan hanya bertanggal) */
      const ubah = (S.st.perubahan || []).filter(p => p.tgl >= batas).sort((a, b) => b.tgl.localeCompare(a.tgl));
      let bandara = [];   /* abu_gunungapi.json opsional: tanpa berkas, bagian abu tidak tampil */
      try { const r = await fetch("/banjir/data/abu_gunungapi.json"); if (r.ok) { const a = await r.json(); bandara = (a.bandara_terdampak || []).filter(b => b.jam_tiba != null); } } catch (e) {}
      return {tinggi, erupsi, per: [...per].sort((a, b) => b[1] - a[1]).slice(0, 4), ubah, bandara};
    },
    html(h) {
      const n = S.n, g0 = S.st.gunung, lv = g => `Level ${LEVEL[g.level][0]} ${LEVEL[g.level][1]}`;
      const perhatian = h.per.map(([nm, c]) => { const g = g0.find(x => x.nama === nm); const e = h.erupsi.find(x => x.gunung === nm);
        const kol = Math.max(0, ...h.erupsi.filter(x => x.gunung === nm).map(x => x.tinggi_m || 0));
        return Sapa.kartu("erupsi", WARNA_LV[g?.level || 2], `Erupsi <span translate="no">${esc(nm)}</span>`, `<b>${fmt(c)}</b> erupsi dalam 24 jam${kol ? `, kolom abu tertinggi <b>${fmt(kol)}</b> m di atas puncak` : ""}, terakhir <span translate="no">${esc(tglJam(e.waktu))}</span>`); }).join("");
      const ubah = h.ubah.map(p => Sapa.kartu("jam", p.ke > p.dari ? "#b5412c" : "#2f7d4f", `<span translate="no">${esc(p.nama)}</span> ${p.ke > p.dari ? "naik" : "turun"} status`,
        `Dari Level ${LEVEL[p.dari][0]} ${LEVEL[p.dari][1]} ke <b>Level ${LEVEL[p.ke][0]} ${LEVEL[p.ke][1]}</b>, tercatat ${esc(tglPdk(p.tgl))}`)).join("");
      const abu = h.bandara.slice(0, 4).map(b => Sapa.kartu("asap", "#8a5a3c", `${esc(b.iata || b.icao)} ${esc(b.nama)}`,
        `Skenario bila <span translate="no">${esc(S.st.gunung.find(g => idGn(g.nama) === b.gunung)?.nama || b.gunung)}</span> meletus sekarang: abu di atas ambang penerbangan tiba sekitar <b>${fmt(b.jam_tiba)}</b> jam lagi. Skenario Pantau Bencana, bukan VAAC`)).join("");
      const siaga = h.tinggi.filter(g => g.level >= 3), daftar = (siaga.length ? siaga : h.tinggi).slice(0, 6);
      return Sapa.rangka({ikon: "gunung", eyebrow: "Situasi gunung api " + labelHari(S.st.dibuat),
        judul: `<b>${fmt(h.tinggi.length)}</b> gunung api berstatus Waspada ke atas dari ${fmt(g0.length)} yang dipantau`,
        chips: [["awas", `${fmt(n[4])} Awas · ${fmt(n[3])} Siaga`], ["erupsi", `${fmt(h.erupsi.length)} erupsi · 24 jam`], h.ubah.length && ["jam", `${fmt(h.ubah.length)} perubahan status · 72 jam`], h.bandara.length && ["asap", `skenario: ${fmt(h.bandara.length)} bandara di jalur abu`]],
        bagian: [
          ["Perubahan status 72 jam", "cs", ubah],
          [siaga.length ? "Gunung Siaga dan Awas" : "Gunung berstatus tertinggi", "ks", daftar.map((g, i) => Sapa.item(esc(g.nama), i + 1, esc(g.nama), esc(g.prov),
            `<em class="sp-p ${g.level >= 4 ? "merah" : g.level === 3 ? "oranye" : "prov"}">${lv(g)}</em>`, g.radius_km ? `<em class="sp-p prov">Radius ${fmt(g.radius_km)} km</em>` : (g.tinggi ? `<em class="sp-p prov">${fmt(g.tinggi)} m</em>` : ""))).join("")],
          perhatian && ["Erupsi 24 jam", "cs", perhatian],
          abu && ["Skenario abu ke bandara", "cs", abu],
          ["Laporan", "cs", Sapa.kartu("api", "#1d4e89", `<a href="/gunungapi/laporan.html" style="color:inherit;text-decoration:underline">Laporan harian gunung api</a>`, "Tren, sorotan, dan daftar erupsi")]],
        sumber: "PVMBG (MAGMA Indonesia)"});
    },
    saatKlik(e, d) { const b = e.target.closest("[data-k]"); if (!b) return; d.close(); const g = S.st.gunung.find(x => x.nama === b.dataset.k);
      bukaTab("peta"); if (g) nanti(() => { Peta.terbang(g); Detail.buka(g); }); return true; },
  });
})();
