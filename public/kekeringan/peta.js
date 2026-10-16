"use strict";
/* ================================================================ peta */
let peta = null;
const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];
/* ruang peta yang terlihat diukur dari panel kiri/kanan dan dok legenda (bukan angka tetap), seperti padRuang karhutla */
const kiriPad = () => { if (innerWidth <= 900) return {top: 60, bottom: innerHeight * .45, left: 16, right: 16};
  const r = s => document.querySelector(s)?.getBoundingClientRect(), pn = r(".panel"), tl = r(".tools"), lg = r("#dok"), pt = r("#p-peta");
  return {top: 56, left: (pn?.width || 440) + 30, right: (tl?.width || 280) + 30, bottom: Math.max(30, pt && lg ? pt.bottom - lg.top + 16 : 150)}; };
function kotak(fitur) { let a = [180, 90, -180, -90];
  const jalan = c => { if (typeof c[0] === "number") { a[0] = Math.min(a[0], c[0]); a[1] = Math.min(a[1], c[1]); a[2] = Math.max(a[2], c[0]); a[3] = Math.max(a[3], c[1]); } else c.forEach(jalan); };
  fitur.forEach(f => jalan(f.geometry.coordinates)); return [[a[0], a[1]], [a[2], a[3]]]; }

/* ---------- warna per mode: tangga [batas atas, warna]; nilai pertama yang <= batas menang */
const TANGGA = {
  tanah: [[5, "#8e2a1f"], [10, "#c9503a"], [20, "#e58a45"], [40, "#e3b94e"], [60, "#d9e2d0"], [80, "#9ccfae"], [95, "#5aa6a0"], [101, "#2f7a8c"]],
  spi: [[-2, "#8e2a1f"], [-1.5, "#c9503a"], [-1, "#e58a45"], [-.5, "#e3b94e"], [.5, "#d9e2d0"], [1, "#9ccfae"], [1.5, "#5aa6a0"], [99, "#2f7a8c"]],
  dc: [[79.99, "#7fb685"], [189.99, "#e3d36a"], [299.99, "#e3b94e"], [424.99, "#e58a45"], [1e9, "#c9503a"]],
};
const warnaTangga = (k, v) => v == null ? "" : TANGGA[k].find(([b]) => v <= b)[1];
/* kolom grid: lat, lon, prov, pct0, pct1, dc, spi3, lv */
const nilaiMode = (r, m) => m === "tanah" ? (r[4] ?? r[3]) : m === "spi" ? r[6] : m === "dc" ? r[5] : null;
const warnaSel = (r, m) => m === "status" ? (r[7] ? WARNA_LV[r[7]] : "") : warnaTangga(m, nilaiMode(r, m));
const MODE = [["status", "Status"], ["spi", "Hujan"], ["tanah", "Tanah"], ["dc", "Kode DC"]];
const UBIN = {wilayah: ["#f4c48a", "#d4572f", "peta"], grid: ["#1d4e89", "#69a7e8", "hujan"], satelit: ["#13324d", "#4d8a5e", "satelit"]};
const UBIN_PENDEK = {wilayah: "Status", grid: "Kisi", satelit: "Satelit"};
let PI = null, LG = null, legBuka = innerWidth > 900, LAMBANG = {};
const lambang = (prov, kab) => { const f = kab ? LAMBANG[prov + "|" + kab] && `../lambang/kabkota/${LAMBANG[prov + "|" + kab]}.png` : prov && `../lambang/provinsi/${prov}.png`;
  return f ? `<img class="lambang" src="${f}" alt="" loading="lazy" onerror="this.remove()">` : ""; };

const Peta = {
  async init() {
    document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="../inti/peta/lapis.css"><link rel="stylesheet" href="../inti/peta/legenda.css">');
    muatJSON("../lambang/kabkota.json").then(d => LAMBANG = d).catch(() => {});
    PI = await import("../inti/peta/lapis.js").catch(() => null);
    PI?.ubinLapis($("#lapis"), {katalog: UBIN, pendek: UBIN_PENDEK});
    LG = await import("../inti/peta/legenda.js").catch(() => null);
    const lebar = () => { const w = $(".panel")?.getBoundingClientRect().width, t = $(".tools")?.getBoundingClientRect().width, p = $("#p-peta");
      if (w) p.style.setProperty("--lp", w + "px"); if (t) p.style.setProperty("--tw", t + "px"); };
    const ro = new ResizeObserver(lebar); ro.observe($(".panel")); ro.observe($(".tools")); lebar();
    peta = new maplibregl.Map({container: "peta", style: DASAR(), center: [118, -2.4], zoom: 4.1, minZoom: 3, maxZoom: 15, attributionControl: {compact: true}, dragRotate: false, pitchWithRotate: false});
    peta.touchZoomRotate.disableRotation();
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    peta.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-right");
    peta.on("style.load", () => this.pasang());
    await new Promise(r => peta.isStyleLoaded() ? r() : peta.once("style.load", r));
    peta.fitBounds(BB_ID, {padding: kiriPad(), duration: 0}); },
  lihat(k) { const i = document.querySelector(`#lapis input[data-l="${k}"]`); return i ? i.checked : false; },
  bawahLabel() { const l = peta.getStyle().layers.find(l => l.type === "symbol"); return l && l.id; },
  vis: on => ({visibility: on ? "visible" : "none"}),
  pasang() {
    if (peta.getSource("wil")) return;
    const bl = this.bawahLabel();
    peta.addSource("grid", {type: "geojson", data: this.geoGrid(), promoteId: "i"});
    peta.addLayer({id: "grid-fill", type: "fill", source: "grid", layout: this.vis(this.lihat("grid")), filter: ["!=", ["get", "c"], ""],
      paint: {"fill-color": ["get", "c"], "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], .9, .72]}}, bl);
    peta.addSource("wil", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id"});
    peta.addLayer({id: "wil-fill", type: "fill", source: "wil", layout: this.vis(this.lihat("wilayah")),
      paint: {"fill-color": ["match", ["get", "lv"], 3, WARNA_LV[3], 2, WARNA_LV[2], 1, WARNA_LV[1], "rgba(0,0,0,0)"],
        "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], .75, .45]}}, bl);
    peta.addLayer({id: "wil-line", type: "line", source: "wil", paint: {"line-color": gelap() ? "#9fb3d1" : "#1d4e89", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.4, .6], "line-opacity": .7}});
    peta.addSource("prov", {type: "geojson", data: S.geo.prov});
    peta.addLayer({id: "prov-line", type: "line", source: "prov", paint: {"line-color": gelap() ? "#c9d6ea" : "#0b2545", "line-width": 1.1, "line-opacity": .55}});
    this.aturWilayah(false); this.interaksi();
    nanti(() => this.lihat("satelit") && this.pasangSatelit()); },
  pasangSatelit() {
    if (peta.getLayer("satelit")) return;
    peta.addSource("satelit", {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Esri"});
    peta.addLayer({id: "satelit", type: "raster", source: "satelit", layout: this.vis(this.lihat("satelit"))}, "grid-fill"); },
  /* sel 0,5 derajat sebagai kotak; sel tanpa nilai pada mode ini diberi warna "" dan disaring (data kosong dibuang, A18) */
  geoGrid() { const h = (S.grid.sel || .5) / 2, m = S.mode;
    return {type: "FeatureCollection", features: S.grid.grid.map((r, i) => ({type: "Feature", geometry: {type: "Polygon", coordinates: [[[r[1] - h, r[0] - h], [r[1] + h, r[0] - h], [r[1] + h, r[0] + h], [r[1] - h, r[0] + h], [r[1] - h, r[0] - h]]]},
      properties: {i, c: warnaSel(r, m)}}))}; },
  segarkan() { if (!peta?.getSource("grid")) return; peta.getSource("grid").setData(this.geoGrid()); },
  async aturWilayah(terbang = true) {
    const j = S.jalur; let fc;
    if (j.length === 0) fc = S.geo.prov;
    else fc = S.geo.kab[j[0]] ||= await muatJSON(`../geo/kabupaten/${j[0]}.json`);
    let id = 0;
    S.fiturWil = fc.features.map(f => { const p = f.properties, kunci = j.length === 0 ? p.kode : j[0] + "|" + p.kab, a = j.length === 0 ? S.wil.prov[kunci] : S.wil.kab[kunci];
      return {type: "Feature", geometry: f.geometry, properties: {id: ++id, kunci, nama: j.length === 0 ? namaProv(p.kode) : p.kab, lv: a?.lv || 0}}; });
    if (peta.getSource("wil")) peta.getSource("wil").setData({type: "FeatureCollection", features: S.fiturWil});
    if (terbang) peta.fitBounds(j.length && S.fiturWil.length ? kotak(S.fiturWil) : BB_ID, {padding: kiriPad(), duration: 700, maxZoom: 9});
    renderCrumb(); renderDaftar(); },
  /* kartu hover satu baris berikon (inti/peta/lapis.js); stat tanpa nilai dibuang */
  kartuWilayah(f) { const p = f.properties, a = (S.jalur.length ? S.wil.kab : S.wil.prov)[p.kunci], W = WARNA_LV;
    const stat = [["perisai", LEVEL[p.lv], "status", W[p.lv], p.lv >= 2], ...(a ? [["mata", rb(a.jiwa[0]), "jiwa kering", "#c9a24b"], ...(a.spi3 != null ? [["hujan", F2(a.spi3), "SPI-3", "#3f7fb8"]] : [])] : [])];
    return PI.kartuTip({judul: esc(p.nama), kepala: S.jalur.length ? lambang(S.jalur[0], p.nama) : lambang(p.kunci), stat}); },
  kartuSel(r) { const W = WARNA_LV, lv = r[7] || 0, tanah = r[4] ?? r[3];
    return PI.kartuTip({judul: esc(namaProv(r[2])), sub: `<small>${F2(Math.abs(r[0]))}° ${r[0] < 0 ? "LS" : "LU"}, ${F2(r[1])}° BT</small>`, stat: [["perisai", LEVEL[lv], "status", W[lv], lv >= 2],
      ...(r[6] != null ? [["hujan", F2(r[6]), "SPI-3", "#3f7fb8"]] : []), ...(tanah != null ? [["rasio", fmt(tanah), "persentil tanah", "#8a6d4e"]] : []), ...(r[5] != null ? [["debit", fmt(Math.round(r[5])), "kode DC", "#c9a24b"]] : [])]}); },
  interaksi() {
    if (this._ia) return; this._ia = true;
    let hov = null, hovG = null; const tip = () => PI?.sembunyiTip();
    peta.on("mousemove", "wil-fill", e => { peta.getCanvas().style.cursor = "pointer"; const f = e.features[0];
      if (hov !== f.id) { if (hov !== null) peta.setFeatureState({source: "wil", id: hov}, {hover: false}); hov = f.id; peta.setFeatureState({source: "wil", id: hov}, {hover: true}); }
      if (PI) PI.tampilTip(this.kartuWilayah(f), e.originalEvent); });
    peta.on("mouseleave", "wil-fill", () => { peta.getCanvas().style.cursor = ""; if (hov !== null) peta.setFeatureState({source: "wil", id: hov}, {hover: false}); hov = null; tip(); });
    peta.on("mousemove", "grid-fill", e => { const f = e.features[0];
      if (hovG !== f.id) { if (hovG !== null) peta.setFeatureState({source: "grid", id: hovG}, {hover: false}); hovG = f.id; peta.setFeatureState({source: "grid", id: hovG}, {hover: true}); }
      if (PI) PI.tampilTip(this.kartuSel(S.grid.grid[f.id]), e.originalEvent); });
    peta.on("mouseleave", "grid-fill", () => { if (hovG !== null) peta.setFeatureState({source: "grid", id: hovG}, {hover: false}); hovG = null; tip(); });
    /* zoom keluar sendiri: kabupaten -> provinsi tanpa menerbangkan peta */
    peta.on("zoomend", e => { if (!e.originalEvent || S.jalur.length < 1 || peta.getZoom() >= 5.2) return; S.jalur = []; nanti(() => Peta.aturWilayah(false)); });
    peta.on("click", e => {
      if (!peta.getLayer("wil-fill") || peta.getLayoutProperty("wil-fill", "visibility") === "none") return;
      const w = peta.queryRenderedFeatures(e.point, {layers: ["wil-fill"]}); if (!w.length) return;
      const k = w[0].properties.kunci; S.jalur.length >= 1 ? Analisa.wilayah(k) : turun(k); }); },
};
function turun(kunci) { S.jalur = kunci.split("|").slice(0, 1); nanti(() => Peta.aturWilayah()); }
function naik(n) { S.jalur = S.jalur.slice(0, n); nanti(() => Peta.aturWilayah()); }

/* ---------- panel */
function renderCrumb() {
  const j = S.jalur, b = [`<button data-n="0">Indonesia</button>`];
  if (j[0]) b.push(`<span>›</span><button data-n="1">${esc(namaProv(j[0]))}</button>`);
  $("#crumb").innerHTML = b.join(""); }
$("#crumb").addEventListener("click", e => { const b = e.target.closest("button"); if (b) naik(+b.dataset.n); });
function renderDaftar() {
  const j = S.jalur, g = "grid-template-columns:20px minmax(0,1fr) 46px 54px 78px", T = j.length ? S.wil.kab : S.wil.prov;
  const item = [...new Map(S.fiturWil.map(f => [f.properties.kunci, f.properties])).values()].map(p => ({kunci: p.kunci, nama: p.nama, a: T[p.kunci]}))
    .filter(i => i.a).sort((a, b) => b.a.lv - a.a.lv || b.a.jiwa[0] - a.a.jiwa[0] || a.nama.localeCompare(b.nama));
  const n = tepat(j.length ? S.wil.prov[j[0]]?.kab_n || [0, 0, 0] : S.meta.nasional.kab_n);
  const ringkas = `<div class="ringkas"><div class="lbl">Kabupaten/kota</div><div class="kv">${[2, 1, 0].map(i => `<div><b style="color:${WARNA_LV[i + 1]}">${fmt(n[i])}</b><span>${LEVEL[i + 1]}</span></div>`).join("")}</div></div>`;
  const kepala = `<div class="tb kepala" style="${g}"><span></span><span>${j.length ? "Kabupaten / kota" : "Provinsi"}</span><span class="n">SPI-3</span><span class="n">Jiwa</span><span style="text-align:right">Status</span></div>`;
  $("#rows").innerHTML = ringkas + kepala + (item.map((i, k) => `<button class="tb" data-k="${esc(i.kunci)}" style="${g}"><span class="rk">${k + 1}</span><span style="font-weight:600" translate="no">${esc(i.nama)}</span>
    <span class="n">${i.a.spi3 != null ? F2(i.a.spi3) : "–"}</span><span class="n">${i.a.jiwa[0] ? rb(i.a.jiwa[0]) : "–"}</span>
    <span style="text-align:right">${i.a.lv ? pill(i.a.lv) : `<span style="color:var(--ink2);font-size:11.5px">Normal</span>`}</span></button>`).join("") || `<div class="kosong">Tidak ada wilayah.</div>`);
}
$("#rows").addEventListener("click", e => { const b = e.target.closest(".tb:not(.kepala)"); if (!b) return; S.jalur.length >= 1 ? Analisa.wilayah(b.dataset.k) : turun(b.dataset.k); });
$("#handle").onclick = () => $("#panel").classList.toggle("min");

/* ---------- cari: provinsi dan kabupaten yang berstatus */
$("#cari").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase(), h = $("#hasil"); if (q.length < 2) { h.hidden = true; return; }
  const idx = [...Object.entries(S.meta.provinsi).map(([k, n]) => ({k, n, j: "Provinsi"})), ...Object.keys(S.wil.kab).map(k => { const p = k.split("|"); return {k, n: p[1], j: "Kab. · " + namaProv(p[0])}; })];
  const hs = idx.filter(i => i.n.toLowerCase().includes(q)).slice(0, 12);
  h.innerHTML = hs.length ? hs.map(i => `<button data-k="${esc(i.k)}">${esc(i.n)}<br><small>${esc(i.j)}</small></button>`).join("") : `<div class="kosong" style="padding:12px">Tidak ditemukan.</div>`; h.hidden = false; });
$("#hasil").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $("#hasil").hidden = true; $("#cari").value = ""; const p = b.dataset.k.split("|");
  if (p.length === 2) { S.jalur = [p[0]]; Peta.aturWilayah().then(() => Analisa.wilayah(b.dataset.k)); } else turun(b.dataset.k); });

/* ---------- mode & overlay */
function renderMode() {
  /* mode tanpa satu sel pun bernilai dibuang (A18); tanah muncul sendiri begitu klimatologinya cukup */
  const ada = m => m === "status" || S.grid.grid.some(r => nilaiMode(r, m) != null);
  $("#modePeta").innerHTML = MODE.filter(([m]) => ada(m)).map(([m, n]) => `<button data-mp="${m}" aria-pressed="${S.mode === m}">${n}</button>`).join(""); }
const setLapis = (k, on) => { const i = document.querySelector(`#lapis input[data-l="${k}"]`); if (i && i.checked !== on) { i.checked = on; i.dispatchEvent(new Event("change", {bubbles: true})); } };
$("#modePeta").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.mode = b.dataset.mp;
  $("#modePeta").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
  setLapis("wilayah", S.mode === "status"); setLapis("grid", S.mode !== "status");
  nanti(() => { Peta.segarkan(); renderLegenda(); }); });
$("#lapis").addEventListener("change", e => { const i = e.target.closest("input"); if (!i || !peta) return;
  const k = i.dataset.l, id = {wilayah: ["wil-fill"], grid: ["grid-fill"], satelit: ["satelit"]}[k];
  if (k === "satelit") Peta.pasangSatelit();
  id.forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", i.checked ? "visible" : "none"));
  renderLegenda(); });
$("#lapisBtn").onclick = () => $("#lapis").classList.toggle("buka");

/* ---------- legenda */
const skala = (k, nilai, label) => `<div class="legscale">${nilai.map(v => `<i style="background:${warnaTangga(k, v)}"></i>`).join("")}</div><div class="legnum">${label.map(v => `<span>${v}</span>`).join("")}</div>`;
function renderLegenda() {
  const m = S.mode, M = S.meta, grid = Peta.lihat("grid") && m !== "status", wil = Peta.lihat("wilayah");
  const sw = (w, t) => `<span><i class="sw" style="background:${w}"></i>${t}</span>`;
  $("#legenda").innerHTML = `<details ${legBuka ? "open" : ""} id="legDet"><summary class="lbl">Legenda <span>▾</span></summary><div class="lg-isi">
    ${wil ? `<div class="lbl">Status kekeringan per wilayah</div><div class="leg" style="margin:4px 0 8px">${[3, 2, 1].map(l => sw(WARNA_LV[l], LEVEL[l] + " · " + ["", "kering", "kering parah", "kering ekstrem"][l])).join("")}</div>` : ""}
    ${Peta.lihat("grid") && m === "status" ? `<div class="lbl">Status kisi 0,5°</div><div class="leg" style="margin:4px 0 8px">${[3, 2, 1].map(l => sw(WARNA_LV[l], LEVEL[l])).join("")}</div>` : ""}
    ${grid && m === "spi" ? `<div class="lbl">Indeks hujan 3 bulan (SPI-3${M.spi ? ", sampai " + bulanPanjang(M.spi.bulan) : ""})</div>${skala("spi", [-3, -1.75, -1.25, -.75, 0, .75, 1.25, 2], ["−2", "−1,5", "−1", "−0,5", "+0,5", "+1", "+1,5", "> 1,5"])}` : ""}
    ${grid && m === "tanah" ? `<div class="lbl">Kelembapan tanah 7–28 cm (persentil, ${fmt(M.tanah.sel)} sel)</div>${skala("tanah", [3, 8, 15, 30, 50, 70, 90, 99], ["5", "10", "20", "40", "60", "80", "95", "> 95"])}` : ""}
    ${grid && m === "dc" ? `<div class="lbl">Kode kekeringan (DC)</div><div class="leg" style="margin:4px 0 8px">${[[50, "< 80 rendah"], [150, "80 sedang"], [250, "190 tinggi"], [350, "300 sangat tinggi"], [500, "≥ 425 ekstrem"]].map(([v, t]) => sw(warnaTangga("dc", v), t)).join("")}</div>` : ""}
    <div class="lbl" style="margin-top:2px">Deteksi Pantau Bencana</div></div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: o => legBuka = o}); }

/* ================================================================ popup wilayah */
const kot = (l, v, s) => `<div class="kpi"><span class="lbl">${l}</span><b>${v}</b><small>${s}</small></div>`;
const Analisa = {
  buka(html, kepala) { const d = $("#dlg"); d.innerHTML = `<div class="dh">${kepala}<button aria-label="Tutup" data-tutup>×</button></div><div class="db">${html}</div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = e => { if (e.target === d) d.close(); }; d.showModal(); },
  wilayah(kunci) {
    const p = kunci.split("|"), kab = p.length === 2, a = (kab ? S.wil.kab : S.wil.prov)[kunci]; if (!a) return;
    const nama = kab ? p[1] : namaProv(p[0]), sub = kab ? "Kabupaten/kota · " + namaProv(p[0]) : "Provinsi", sp = S.meta.spi;
    const kepala = `${kab ? lambang(p[0], p[1]) : lambang(p[0])}<div><h3 id="dlgJudul">${esc(nama)}</h3><p>${esc(sub)}</p></div>`;
    const isi = `<div class="grid g4">${kot("Status", `<span style="color:${WARNA_LV[a.lv]}">${LEVEL[a.lv]}</span>`, ["tidak kering", "kering", "kering parah", "kering ekstrem"][a.lv])}
      ${kot("Jiwa di wilayah kering", rb(a.jiwa[0]), `dari ${rb(a.total)} jiwa`)}${kot("Jiwa kering ekstrem", a.jiwa[2] ? rb(a.jiwa[2]) : "–", "di kecamatan awas")}
      ${a.spi3 != null ? kot("SPI-3", F2(a.spi3), sp ? "sampai " + bulanPanjang(sp.bulan) : "") : ""}${a.pct != null ? kot("Tanah", fmt(a.pct), "persentil") : ""}${a.dc != null ? kot("Kode DC", fmt(a.dc), "rata-rata tertimbang") : ""}
      ${!kab ? kot("Kabupaten/kota", `${fmt(a.kab_n[0])}`, `${fmt(a.kab_n[2])} kering ekstrem`) : ""}</div>
      <p class="fnd">Deteksi Pantau Bencana</p>`;
    this.buka(isi, kepala); },
};
