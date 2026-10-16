"use strict";
/* Pop-up "Situasi gempa hari ini": mesin dan tata letak di public/inti/sapa.js (Sapa.daftar), sama dengan karhutla dan banjir.
   Sekali per hari WIB per peramban (kunci pb_sapa_gempa), muncul di /gempa dan /gempa/peta. Angka dari S.gempa (7 hari, D1 hidup) yang sudah dimuat peta.
   Skrip klasik, dimuat SESUDAH peta.js dan mulai.js. Global: S, Peta, bukaTab, esc, fmt, mTulis, warnaM, pilM, wilayahPendek, waktuGempa, TSUNAMI, ROMAWI. */
(() => {
  const H = 36e5;
  const rom = v => ROMAWI[Math.min(12, Math.max(1, Math.round(v)))];
  Sapa.daftar("gempa", {
    ikon: {gempa: '<path d="M2 12h4l2-6 4 12 3-9 2 3h5"/>', dirasa: '<circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"/>'},
    siap: () => S.tersedia && S.gempa.length > 0,
    hitung() {
      const kini = Date.now(), A = S.gempa.filter(g => g.m >= 5); if (!A.length) return null;
      const d1 = A.filter(g => kini - g.t <= 24 * H), d0 = A.filter(g => kini - g.t > 24 * H && kini - g.t <= 48 * H);
      const prov = {}; A.forEach(g => { const o = prov[g.prov || "-"] ||= {k: g.prov || "-", n: 0, m: 0, mmi: 0}; o.n++; o.m = Math.max(o.m, g.m); o.mmi = Math.max(o.mmi, g.mmi_maks || 0); });
      return {d1, d0, kuat: [...A].sort((a, b) => b.m - a.m || b.t - a.t), rasa: S.gempa.filter(g => kini - g.t <= 24 * H && g.mmi_maks > 0),
        prov: Object.values(prov).sort((a, b) => b.n - a.n || b.m - a.m).slice(0, 5), tsu: S.gempa.filter(g => kini - g.t <= 72 * H && (g.tsunami?.kode ?? 0) >= 1).sort((a, b) => b.t - a.t)};
    },
    html(h) {
      const selisih = h.d1.length - h.d0.length, arah = selisih > 0 ? `<b class="naik">▲ ${fmt(selisih)}</b> dari sehari sebelumnya` : selisih < 0 ? `<b class="turun">▼ ${fmt(-selisih)}</b> dari sehari sebelumnya` : "sama dengan sehari sebelumnya";
      const nm = k => k === "-" ? "Perairan lepas" : S.nama[k] || k, g0 = h.kuat[0];
      const perhatian = [...h.tsu.slice(0, 2).map(g => Sapa.kartu("awas", TSUNAMI[g.tsunami.kode][1], TSUNAMI[g.tsunami.kode][0] + " (BMKG)", `<span translate="no">${mTulis(g.m)} ${esc(wilayahPendek(g.wilayah))}, ${esc(waktuGempa(g.waktu))}</span>`)),
        h.rasa.length && (() => { const t = [...h.rasa].sort((a, b) => b.mmi_maks - a.mmi_maks || b.m - a.m)[0];
          return Sapa.kartu("dirasa", "#d4802f", "Dirasakan warga", `<b>${fmt(h.rasa.length)}</b> gempa dalam 24 jam; terkuat: <span translate="no">MMI ${rom(t.mmi_maks)} · ${esc(wilayahPendek(t.wilayah))}</span>`); })()].filter(Boolean).join("");
      return Sapa.rangka({ikon: "gempa", eyebrow: "Situasi gempa hari ini",
        judul: `<b>${fmt(h.d1.length)}</b> gempa M 5+ dalam 24 jam, ${arah}`,
        chips: [["gempa", `terkuat 7 hari ${mTulis(g0.m)}`], ["dirasa", `${fmt(h.rasa.length)} dirasakan warga`]],
        bagian: [
          h.prov.length && ["Provinsi diguncang 7 hari", "ps", h.prov.map(o => Sapa.provBaris(esc(nm(o.k)), [Sapa.pil(`${fmt(o.n)} gempa M 5+`, "oranye", "gempa"), Sapa.pil(`terkuat ${mTulis(o.m)}`, "prov")])).join("")],
          ["Gempa terkuat 7 hari", "ks", h.kuat.slice(0, 4).map((g, i) => Sapa.item(esc(g.id), i + 1, esc(wilayahPendek(g.wilayah)), esc(waktuGempa(g.waktu)),
            `<em class="sp-p ${g.m >= 7 ? "merah" : "oranye"}">${mTulis(g.m)}</em>`, g.mmi_maks > 0 ? `<em class="sp-p prov">MMI ${rom(g.mmi_maks)}</em>` : "")).join("")],
          perhatian && ["Perlu perhatian", "cs", perhatian]],
        sumber: "BMKG, USGS"});
    },
    saatKlik(e, d) { const b = e.target.closest("[data-k]"); if (!b) return;
      d.close(); const g = S.gempa.find(x => x.id === b.dataset.k); bukaTab("peta"); if (g) nanti(() => Peta.pilih(g)); return true; },
  });
})();
