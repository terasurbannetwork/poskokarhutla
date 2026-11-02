"use strict";
/* tebang.js: lapisan "Alert pembukaan tajuk" (GFW integrated alerts) + kartu per kabupaten. Data data/alert_tebang.json, dibaca apa adanya.
   PANTAUAN, bukan prediksi: model prediksinya TIDAK LOLOS uji (angkanya dibaca dari JSON, model.semua_kotak).
   Skrip klasik, dimuat sesudah skrip utama (peta, muatJSON, nanti, tampilTip, kartuTip, esc, $ terbaca). Data diambil HANYA saat kotak dinyalakan. */
(() => {
  const nf = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0}), nf2 = new Intl.NumberFormat("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  /* tanpa presisi palsu: alert bukan ukuran luas pasti, jadi dibulatkan (ratusan di atas 10 ribu, puluhan di atas 100) */
  const ha = v => !Number.isFinite(v) ? "–" : nf.format(v >= 1e4 ? Math.round(v / 100) * 100 : v > 100 ? Math.round(v / 10) * 10 : Math.round(v));
  const pct = v => !Number.isFinite(v) ? "–" : v > 0 && v < .005 ? "<1%" : Math.round(v * 100) + "%";
  const m2 = v => Number.isFinite(v) ? nf2.format(v) : "–";
  /* lewat toLocaleDateString("id-ID"): i18n.js menambalnya jadi en-GB saat EN, jadi bulan ikut bahasa */
  const tgl = s => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ""); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}) : "–"; };
  const WARNA = ["#f6d9a8", "#f0b46c", "#e5853f", "#c9503a", "#8c2a22"], BATAS = [500, 1500, 3000, 6000];   /* ha90 per ubin 1 derajat */
  const kelas = h => BATAS.filter(b => h >= b).length;
  const poligon = d => ({type: "FeatureCollection", features: d.sel.map(([la, lo, h]) => ({type: "Feature", properties: {h, k: kelas(h)},
    geometry: {type: "Polygon", coordinates: [[[lo - .5, la - .5], [lo + .5, la - .5], [lo + .5, la + .5], [lo - .5, la + .5], [lo - .5, la - .5]]]}}))});
  const KON = [["sawit", "sawit"], ["hti", "HTI"], ["hph", "HPH"], ["tambang", "tambang"]];
  const konsesi = k => KON.map(([j, n]) => `${n} ${pct(k.konsesi?.[j])}`).join(", ");
  /* pernyataan model dari JSON, tak diketik tangan */
  const modelTeks = d => { const m = d.model?.semua_kotak, v = d.model?.vonis; if (!m || !v) return "";
    const ci = m.selisih_ci95, adaCi = Array.isArray(ci) && ci.length === 2 && ci.every(Number.isFinite),
      selang = adaCi ? `, interval 95% ${m2(ci[0])} s.d. ${m2(ci[1])} ${ci[0] <= 0 && ci[1] >= 0 ? "mencakup" : "tidak mencakup"} nol` : "",
      lolos = /^LOLOS/.test(v);
    return `Model prediksi dari alert ini ${esc(v)} uji (AUC ${m2(m.auc_penuh)} vs ${m2(m.auc_dasar)} pembanding; selisih ${m2(m.selisih)}${selang}; selisih = AUC model dikurangi pembanding, negatif = model di bawah pembanding)${lolos ? "." : ", jadi ini data pantauan, bukan prediksi."}`; };
  const kartu = (d, n = 10) => { const top = [...d.kabupaten].sort((a, b) => b.ha90 - a.ha90).slice(0, n), t = d.jendela.tinggi_hari, s = d.jendela.semua_hari;
    return `<details open class="tb-det"><summary><b>Alert pembukaan tajuk</b> <small>pantauan s.d. ${tgl(d.gfw?.sampai)}</small></summary>
      <div class="tb-isi"><p class="tb-ket">Nasional ${ha(d.nasional.ha90)} ha dalam ${t} hari (keyakinan tinggi), ${ha(d.nasional.ha30)} ha dalam ${s} hari (semua keyakinan). Kabupaten terbesar:</p>
      <table class="tb-tbl"><thead><tr><th>Kabupaten</th><th>ha ${t} hari (keyakinan tinggi)</th><th>ha ${s} hari (semua keyakinan)</th><th>Gambut</th><th>Dalam konsesi</th></tr></thead><tbody>${top.map(k =>
        `<tr><td>${esc(k.kab)}</td><td>${ha(k.ha90)}</td><td>${ha(k.ha30)}</td><td>${pct(k.gambut)}</td><td>${konsesi(k)}</td></tr>`).join("")}</tbody></table>
      <p class="tb-leg">${WARNA.map((w, i) => `<span><i style="background:${w}"></i>${i ? ha(BATAS[i - 1]) + "+" : "&lt; " + ha(BATAS[0])}</span>`).join("")} ha per ubin 1°</p>
      <p class="tb-cat">${esc(modelTeks(d))} Alert menandai pembukaan tajuk, bukan api. Pangsa gambut dan konsesi dari ${t} hari terakhir, bisa tumpang tindih. Gambut dari PRIMS 1:250.000, Kaltim belum lengkap. Sumber: Global Forest Watch, alert terintegrasi UMD GLAD-L/S2 dan WUR RADD; gambut PRIMS/BBSDLP; konsesi peta sawit, HTI, HPH, tambang 2014-2026; data s.d. ${tgl(d.gfw?.sampai)}.</p></div></details>`; };
  window.AlertTebang = {ha, pct, tgl, kelas, poligon, kartu, modelTeks};
  if (typeof document === "undefined" || typeof peta === "undefined") return;

  let janji = null, data = null, gen = 0;
  const ambil = () => janji ||= muatJSON("data/alert_tebang.json").then(d => data = d).catch(e => { janji = null; throw e; });
  const wadah = () => $("#tebangKartu") || $("#dok").insertAdjacentElement("beforeend", Object.assign(document.createElement("div"), {id: "tebangKartu", className: "box tb-box", hidden: true}));
  const pasang = d => { if (peta.getSource("tebang")) return;
    peta.addSource("tebang", {type: "geojson", data: poligon(d)});
    peta.addLayer({id: "tebang", type: "fill", source: "tebang", paint: {"fill-color": ["step", ["get", "h"], WARNA[0], BATAS[0], WARNA[1], BATAS[1], WARNA[2], BATAS[2], WARNA[3], BATAS[3], WARNA[4]], "fill-opacity": .55, "fill-outline-color": "rgba(80,40,20,.35)"}}, peta.getLayer("wil-line") ? "wil-line" : undefined);
    peta.on("click", "tebang", e => { const p = e.features[0].properties;
      tampilTip(kartuTip({judul: "Alert pembukaan tajuk", daftar: [[`${ha(+p.h)} ha`, `${data.jendela.tinggi_hari} hari, ubin 1°`]], kaki: `Sumber: Global Forest Watch, s.d. ${tgl(data.gfw?.sampai)}. Pantauan, bukan prediksi.`}), e.originalEvent); });
    peta.on("mouseenter", "tebang", () => peta.getCanvas().style.cursor = "pointer"); peta.on("mouseleave", "tebang", () => peta.getCanvas().style.cursor = ""); };
  const nyala = async on => { const id = ++gen, w = wadah(); w.hidden = !on;
    if (!on) { peta.getLayer("tebang") && peta.setLayoutProperty("tebang", "visibility", "none"); return; }
    try { const d = await ambil(); if (id !== gen) return; pasang(d); peta.setLayoutProperty("tebang", "visibility", "visible"); w.innerHTML = kartu(d); }
    catch (e) { if (id === gen) w.innerHTML = `<p class="tb-cat">Data alert belum bisa dimuat.</p>`; } };
  const sisip = () => { const L = $("#lapis"); if (!L || L.querySelector('[data-l="tebang"]')) return;
    const lahan = [...L.querySelectorAll("details")].find(d => d.querySelector("summary")?.textContent.trim() === "Lahan");
    (lahan || L).insertAdjacentHTML("beforeend", `<label><input type="checkbox" data-l="tebang"> Alert pembukaan tajuk (GFW)</label>`);
    /* penangan sendiri di input; stopPropagation supaya penangan #lapis (Lapis.pasang) tak ikut jalan. Kerja ditunda lewat nanti() (INP). */
    L.querySelector('[data-l="tebang"]').addEventListener("change", e => { e.stopPropagation(); const on = e.target.checked; nanti(() => nyala(on)); }); };
  sisip();
})();
