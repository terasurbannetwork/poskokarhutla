"use strict";
/* kebakaran_permukiman.js: lapisan "Kebakaran permukiman" per kabupaten/kota (kotak centang data-l="permukiman").
   Data: data/logbook_riwayat.json (Logbook Pusdalops BNPB), dibaca apa adanya; hanya tahun 2014-2020 (liputan penuh) yang dihitung.
   Dimuat sesudah peta_kab.js. Skrip klasik: peta, Peta, S, muatJSON, renderLegenda, tampilTip, kartuTip, nanti, toast, $, esc, fmt, namaProv terbaca dari skrip utama. */
(() => {
  const TH = [2014, 2015, 2016, 2017, 2018, 2019, 2020], WARNA = "#c9503a", JENIS = "kebakaran_permukiman";
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  let _h = {}, D = null, janji = null, on = false, gen = 0, hov = null, pop = null, kls = {b: [], w: []}, ev = null;
  const f1 = n => fmt(Math.round(n * 10) / 10);
  const ambil = () => janji ||= (async () => {
    const j = await muatJSON("data/logbook_riwayat.json"), KB = {};
    for (const [k, v] of Object.entries(j.kab)) {
      const t = TH.map(y => v.tahun?.[y]?.[JENIS] || 0), tot = t.reduce((a, b) => a + b, 0); if (!tot) continue;
      const b = v.bulan_penuh?.[JENIS] || [], mx = Math.max(0, ...b);
      KB[k] = {t, tot, rata: tot / TH.length, bln: mx ? BLN[b.indexOf(mx)] : ""};
    }
    const prov = [...new Set(Object.keys(KB).map(k => k.split("|")[0]))];
    const fcs = await Promise.all(prov.map(async p => S.geo.kab[p] ||= await muatJSON(`geo/kabupaten/${p}.json`)));
    const features = prov.flatMap((p, i) => fcs[i].features.map(f => ({type: "Feature", geometry: f.geometry, properties: {kunci: p + "|" + f.properties.kab, nama: f.properties.kab, prov: p}})));
    const punya = new Set(features.map(f => f.properties.kunci));
    return D = {KB: Object.fromEntries(Object.entries(KB).filter(([k]) => punya.has(k))), fc: {type: "FeatureCollection", features}};
  })().catch(e => { janji = null; throw e; });

  const ada = () => !!(peta && peta.getLayer("kp-fill"));
  const tampil = v => ["kp-fill", "kp-line"].forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", v ? "visible" : "none"));
  function pasang() {
    if (!D || !peta || peta.getSource("kp")) return;
    const bawah = Peta.lapisAwal(); hov = null;
    peta.addSource("kp", {type: "geojson", data: D.fc, promoteId: "kunci"});
    peta.addLayer({id: "kp-fill", type: "fill", source: "kp", paint: {"fill-color": ["to-color", ["coalesce", ["feature-state", "c"], "rgba(0,0,0,0)"]], "fill-opacity": .85}}, bawah);
    peta.addLayer({id: "kp-line", type: "line", source: "kp", paint: {"line-color": "#8fa0b5", "line-opacity": .85, "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.2, .6]}}, bawah);
    ikat();
  }
  /* lima kelas bertahap dari rata-rata per tahun; batas membulat supaya legenda mudah dibaca */
  function gambar() {
    if (!on || !D || !ada()) return;
    pop?.remove();
    const maks = Math.max(0, ...Object.values(D.KB).map(x => x.rata)), langkah = [.04, .12, .3, .6].map(p => Math.max(1, Math.round(maks * p)));
    const b = [...new Set(langkah)].filter((v, i, a) => !i || v > a[i - 1]), w = [0, 1, 2, 3, 4].slice(0, b.length + 1).map(i => `rgba(201,80,58,${.25 + .15 * i})`);
    kls = {b, w, maks};
    for (const [k, x] of Object.entries(D.KB)) peta.setFeatureState({source: "kp", id: k}, {c: w[b.filter(v => x.rata > v).length]});
    renderLegenda();
  }
  function isi(p) {
    const x = D.KB[p.kunci]; if (!x) return "";
    const mk = Math.max(1, ...x.t), bar = x.t.map((n, i) => `<span style="flex:1;text-align:center" data-tip="<b>${TH[i]}</b>${fmt(n)} kejadian"><i style="display:block;height:${Math.max(2, Math.round(n / mk * 28))}px;background:${WARNA};border-radius:2px 2px 0 0;margin-top:${28 - Math.max(2, Math.round(n / mk * 28))}px"></i><small style="font-size:9px">${String(TH[i]).slice(2)}</small></span>`).join("");
    return kartuTip({judul: esc(p.nama), sub: `<small class="tp-sub">${esc(namaProv(p.prov))}</small>`,
      stat: [["api", fmt(x.tot), "kejadian 2014-2020", WARNA, false], ["kal", f1(x.rata), "rata-rata per tahun", WARNA, false]],
      daftar: x.bln ? [[esc(x.bln), "bulan tersibuk"]] : [],
      tren: `<div style="display:flex;gap:3px;align-items:flex-end;padding:6px 2px 0">${bar}</div>`,
      kaki: "Logbook Pusdalops BNPB 2014-2020"});
  }
  function ikat() {
    const tip = $("#tip");
    if (ev) { peta.off("mousemove", "kp-fill", ev.m); peta.off("mouseleave", "kp-fill", ev.l); }
    ev = {
      m: e => { const f = e.features[0];
        if (hov !== f.id) { if (hov !== null) peta.setFeatureState({source: "kp", id: hov}, {hover: false}); hov = f.id; peta.setFeatureState({source: "kp", id: hov}, {hover: true}); }
        if (tip._kl != null || tip._pf || peta._tipHw || peta._tipUdara) return;
        if (pop && pop._k === f.id) { tip.classList.remove("on"); return; }
        peta.getCanvas().style.cursor = "pointer"; { const t = $("#tip"); if (hov === f.id && t._kpk === f.id && t.classList.contains("on")) { t.style.left = Math.min(innerWidth - t.offsetWidth - 8, e.originalEvent.clientX + 14) + "px"; t.style.top = Math.max(8, e.originalEvent.clientY - t.offsetHeight - 12) + "px"; } else { tampilTip(_h[f.id] ||= isi(f.properties), e.originalEvent); t._kpk = f.id; } } },
      l: () => { if (hov !== null) peta.setFeatureState({source: "kp", id: hov}, {hover: false}); hov = null; tip._kpk = null; peta.getCanvas().style.cursor = ""; tip.classList.remove("on"); }};
    peta.on("mousemove", "kp-fill", ev.m); peta.on("mouseleave", "kp-fill", ev.l);
  }
  function klik(e) {
    if (!on || !D || !ada() || peta.getLayoutProperty("kp-fill", "visibility") === "none") return false;
    if (e._kp) return true;
    const f = peta.queryRenderedFeatures(e.point, {layers: ["kp-fill"]})[0]; if (!f) return false;
    e._kp = 1; $("#tip").classList.remove("on");
    pop = new maplibregl.Popup({closeButton: false, maxWidth: "300px"}).setLngLat(e.lngLat).setHTML(`<div class="tip kartu on" style="position:static;opacity:1;transform:none">${isi(f.properties)}</div>`).addTo(peta);
    const p0 = pop; p0._k = f.properties.kunci; p0.on("close", () => { if (pop === p0) pop = null; });
    return true;
  }
  const _leg = renderLegenda;
  renderLegenda = function () { _leg(); const box = document.querySelector("#legDet > div"); if (!box || !on || !D || !kls.w.length || !ada()) return;
    const {b, w} = kls, pecah = k => k === 0 ? `≤ ${fmt(b[0])}` : k === b.length ? `> ${fmt(b[k - 1])}` : `${fmt(b[k - 1] + 1)} sampai ${fmt(b[k])}`;
    box.insertAdjacentHTML("beforeend", `<div class="lg-g"><div class="lbl">Kebakaran permukiman (kejadian per tahun)</div><div class="leg">${w.map((c, k) => `<span><i class="sw" style="background:${c}"></i>${pecah(k)}</span>`).join("")}`
      + `<span class="kab-wkt"><span>Logbook Pusdalops BNPB 2014–2020. Hanya 2014–2020 yang dipakai. 2022 baru 272 hari tercatat dan hanya memuat 121 kejadian, jauh di bawah tahun sebelumnya; kemungkinan cara pencatatannya berubah.</span></span></div></div>`); };

  async function terapkan() {
    const id = ++gen;
    if (!on) { pop?.remove(); if (ada()) tampil(false); renderLegenda(); return; }
    try { await ambil(); } catch (e) { console.warn("kebakaran permukiman", e); if (id !== gen) return;
      toast("Peta kebakaran permukiman gagal dimuat"); const i = $('#lapis input[data-l="permukiman"]'); if (i) i.checked = false; on = false; return; }
    if (id !== gen) return;
    await new Promise(nanti); if (id !== gen) return;
    pasang(); nanti(() => { if (id === gen) { tampil(true); gambar(); } });
  }
  function hubungkan() {
    const L = $("#lapis"); if (!L) return;
    L.addEventListener("change", e => { const i = e.target.closest("input"); if (!i) return;
      if (i.dataset.l === "permukiman") { e.stopImmediatePropagation();
        if (i.checked) L.querySelectorAll('input[data-l^="kab"]:checked').forEach(x => { x.checked = false; x.dispatchEvent(new Event("change", {bubbles: true})); });   /* dua pilihan warna kabupaten di satu peta tidak terbaca */
        on = i.checked; nanti(terapkan); return; }
      if (on && i.dataset.l?.startsWith("kab") && i.checked) { const m = $('#lapis input[data-l="permukiman"]'); m.checked = false; on = false; nanti(terapkan); } }, true);
    const tunggu = () => { if (!peta) return setTimeout(tunggu, 300); peta.on("style.load", () => setTimeout(() => { if (on && D) { pasang(); tampil(true); gambar(); } }, 60)); };
    tunggu();
  }
  window.KebPermukiman = {klik};
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", hubungkan) : hubungkan();
})();
