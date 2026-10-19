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
const WARNA_HTH = ["#9ccfae", "#d9e2d0", "#e3b94e", "#e58a45", "#c9503a", "#8e2a1f"];   /* kelas BMKG: sangat pendek ... ekstrem (batas dari kekeringan_hth.json) */
const WARNA_PRAK = [[10, "#9ccfae"], [20, "#d9e2d0"], [35, "#e3b94e"], [50, "#e58a45"], [70, "#c9503a"], [101, "#8e2a1f"]];
const WARNA_PADI = [[0, "#9ccfae"], [9, "#e3b94e"], [24, "#e58a45"], [1e3, "#c9503a"]];   /* selisih terhadap Normal (poin) pada satu besaran, bukan nilai mentah */
const warnaBatas = (t, v) => v == null ? "" : t.find(([b]) => v <= b)[1];
const klsHth = h => { const b = S.hth.batas_kelas; let i = 0; while (i < b.length && h > b[i]) i++; return i; };
const warnaHth = h => h > 0 ? WARNA_HTH[klsHth(h)] : "";
const KELAS_HTH = () => S.hth.kelas || ["Sangat pendek", "Pendek", "Menengah", "Panjang", "Sangat panjang", "Ekstrem"];
/* sel kisi -> titik SEAS5 2 derajat tempat ia berada (anak: "lat,lon" -> indeks titik) */
const titikPrak = r => { const i = S.prak?.anak?.[r[0] + "," + r[1]]; return i == null ? null : S.prak.titik[i]; };
const pkSel = r => { const t = titikPrak(r), l = t?.[2]?.[S.bln]; return l ? l[3] : null; };
/* padi per wilayah: kab langsung; provinsi = rerata kab tertimbang penduduk (kekeringan_prakiraan.total, cadangan bobot 1) */
const PADI_F = ["turun25", "turun_med", "gagal", "turun_normal", "turun25_normal", "selisih"];
const padiWil = kunci => { const P = S.padi?.kab; if (!P) return null; if (kunci.includes("|")) return P[kunci] || null;
  if (!S._padiProv) { const a = {};
    for (const [k, v] of Object.entries(P)) { const w = S.prak?.kab?.[k]?.total || 1, o = a[v.prov || k.split("|")[0]] ||= {};
      for (const f of PADI_F) if (v[f] != null) { const q = o[f] ||= {s: 0, w: 0}; q.s += v[f] * w; q.w += w; } }
    S._padiProv = Object.fromEntries(Object.entries(a).map(([k, o]) => [k, Object.fromEntries(Object.entries(o).map(([f, q]) => [f, q.s / q.w]))])); }
  return S._padiProv[kunci] || null; };
const warnaTangga = (k, v) => v == null ? "" : TANGGA[k].find(([b]) => v <= b)[1];
/* kolom grid: lat, lon, prov, pct0, pct1, dc, spi3, lv, spi6, mm3 */
const nilaiMode = (r, m) => m === "tanah" ? (r[4] ?? r[3]) : m === "spi" ? r[6] : m === "dc" ? r[5] : null;
const warnaSel = (r, m) => m === "status" ? (r[7] ? WARNA_LV[r[7]] : "") : warnaTangga(m, nilaiMode(r, m));
const MODE = [["status", "Status"], ["hth", "HTH"], ["prakiraan", "Prakiraan"], ["padi", "Padi"], ["spi", "Hujan"], ["tanah", "Tanah"], ["dc", "Kode DC"]];
const MODE_WIL = m => m === "status" || m === "padi";   /* mode yang mewarnai poligon wilayah; sisanya kisi */
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
    peta.once("load", () => window.NASA?.pasang(peta, ["smap", "suhu"]));   /* lapisan satelit NASA GIBS, inti/peta/nasa.js */
    peta.touchZoomRotate.disableRotation();
    import("../inti/peta/konteks.js").then(m => m.pasang(peta, "kekeringan")).catch(() => 0);   /* lapisan konteks (penduduk, sekolah, faskes, jalan) dari registry, inti/peta/konteks.js */
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    peta.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-right");
    peta.on("style.load", () => this.pasang());
    await new Promise(r => peta.isStyleLoaded() ? r() : peta.once("style.load", r));
    peta.fitBounds(BB_ID, {padding: innerWidth <= 900 ? kiriPad() : {top: 56, left: 470, right: 310, bottom: 163}, duration: 0}); },   /* pandangan awal desktop = karhutla (dok bawah ~163); dipaku karena dok belum tersusun saat fit */
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
      paint: {"fill-color": ["case", ["!=", ["get", "c"], ""], ["get", "c"], ["match", ["get", "lv"], 3, WARNA_LV[3], 2, WARNA_LV[2], 1, WARNA_LV[1], "rgba(0,0,0,0)"]],
        "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], .75, .45]}}, bl);
    peta.addLayer({id: "wil-line", type: "line", source: "wil", paint: {"line-color": gelap() ? "#9fb3d1" : "#1d4e89", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.4, .6], "line-opacity": .7}});
    peta.addSource("prov", {type: "geojson", data: S.geo.prov});
    peta.addLayer({id: "prov-line", type: "line", source: "prov", paint: {"line-color": gelap() ? "#c9d6ea" : "#0b2545", "line-width": 1.1, "line-opacity": .55}});
    this.aturWilayah(false); this.interaksi();
    nanti(() => this.lihat("satelit") && this.pasangSatelit());
    ["embung", "gambut"].forEach(k => this.lihat(k) && this.lapisanSumber(k)); },   /* gaya dimuat ulang (tema): lapisan sumber air dipasang lagi bila masih dicentang */
  /* lapisan "Sumber air dan lahan": embung = lingkaran per kabupaten (jumlah objek OSM, titik = rata-rata kecamatan, BUKAN lokasi tampungan); gambut = kompleks konsesi berlahan gambut di sel Siaga/Awas (kekeringan_bukti.json) */
  async lapisanSumber(k) {
    if (!peta.getSource(k)) {
      let fc;
      if (k === "embung") {
        S.embung ||= await muatJSON("data/embung.json").catch(() => null); const E = S.embung; if (!E?.pusat) return false;
        fc = {type: "FeatureCollection", features: Object.entries(E.kab).filter(([kb]) => E.pusat[kb]).map(([kb, n]) => ({type: "Feature", geometry: {type: "Point", coordinates: [E.pusat[kb][1], E.pusat[kb][0]]}, properties: {kunci: kb, n}}))};
      } else {
        const L = S.bukti?.gambut?.daftar; if (!L?.length) return false;
        fc = {type: "FeatureCollection", features: L.map(d => ({type: "Feature", geometry: {type: "Point", coordinates: [d.lon, d.lat]}, properties: {prov: d.prov, lv: d.lv, dc: d.dc, g: d.gambut, titik: d.titik}}))};
      }
      if (peta.getSource(k)) return true;   /* dua pemanggil bersamaan: yang kedua tiba terlambat */
      peta.addSource(k, {type: "geojson", data: fc});
      peta.addLayer({id: k + "-c", type: "circle", source: k, layout: this.vis(this.lihat(k)), paint: k === "embung"
        ? {"circle-color": "#1d6fa5", "circle-opacity": .55, "circle-stroke-color": "#fff", "circle-stroke-width": .8, "circle-radius": ["min", 18, ["+", 2.5, ["*", 2.2, ["sqrt", ["get", "n"]]]]]}
        : {"circle-color": "#7a4a2c", "circle-opacity": .85, "circle-stroke-color": "#fff", "circle-stroke-width": 1, "circle-radius": 5}});
      if (!(this._ik ||= {})[k]) { this._ik[k] = 1;
        peta.on("mousemove", k + "-c", e => { peta.getCanvas().style.cursor = "pointer"; const p = e.features[0].properties;
          if (PI) PI.tampilTip(k === "embung"
            ? PI.kartuTip({judul: esc(p.kunci.split("|")[1]), sub: `<small>${esc(namaProv(p.kunci.split("|")[0]))}</small>`, stat: [["debit", fmt(p.n) + " objek", "embung, waduk, bendungan OSM di kabupaten (kasar, tidak lengkap)", "#1d6fa5"]]})
            : PI.kartuTip({judul: "Konsesi berlahan gambut", sub: `<small>${esc(namaProv(p.prov))}</small>`, stat: [["perisai", LEVEL[p.lv], "status sel", WARNA_LV[p.lv], p.lv >= 3], ...(p.dc != null ? [["debit", fmt(Math.round(p.dc)), "kode DC", "#7a4a2c"]] : [])]}), e.originalEvent); });
        peta.on("mouseleave", k + "-c", () => { peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); }); }
    }
    return true; },
  pasangSatelit() {
    if (peta.getLayer("satelit")) return;
    peta.addSource("satelit", {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Esri"});
    peta.addLayer({id: "satelit", type: "raster", source: "satelit", layout: this.vis(this.lihat("satelit"))}, "grid-fill"); },
  /* sel 0,5 derajat sebagai kotak; sel tanpa nilai pada mode ini diberi warna "" dan disaring (data kosong dibuang, A18) */
  baris() { const m = S.mode; return m === "hth" && S.hth ? S.hth.sel : S.grid.grid; },
  warnaBaris(r, m) { return m === "hth" ? warnaHth(r[2]) : m === "prakiraan" ? warnaBatas(WARNA_PRAK, pkSel(r)) : warnaSel(r, m); },
  geoGrid() { const h = (S.grid.sel || .5) / 2, m = S.mode, B = this._baris = this.baris();
    return {type: "FeatureCollection", features: B.map((r, i) => ({type: "Feature", geometry: {type: "Polygon", coordinates: [[[r[1] - h, r[0] - h], [r[1] + h, r[0] - h], [r[1] + h, r[0] + h], [r[1] - h, r[0] + h], [r[1] - h, r[0] - h]]]},
      properties: {i, c: this.warnaBaris(r, m)}}))}; },
  segarkan() { if (!peta?.getSource("grid")) return; peta.getSource("grid").setData(this.geoGrid()); },
  async aturWilayah(terbang = true) {
    const j = S.jalur; let fc;
    if (j.length === 0) fc = S.geo.prov;
    else fc = S.geo.kab[j[0]] ||= await muatJSON(`../geo/kabupaten/${j[0]}.json`);
    let id = 0;
    S.fiturWil = fc.features.map(f => { const p = f.properties, kunci = j.length === 0 ? p.kode : j[0] + "|" + p.kab, a = j.length === 0 ? S.wil.prov[kunci] : S.wil.kab[kunci];
      return {type: "Feature", geometry: f.geometry, properties: {id: ++id, kunci, nama: j.length === 0 ? namaProv(p.kode) : p.kab, lv: a?.lv || 0, c: S.mode === "padi" ? (padiBanding(padiWil(kunci)) ? warnaBatas(WARNA_PADI, Math.round(padiBanding(padiWil(kunci)).d)) : "rgba(0,0,0,0)") : ""}}; });
    if (peta.getSource("wil")) peta.getSource("wil").setData({type: "FeatureCollection", features: S.fiturWil});
    if (terbang) peta.fitBounds(j.length && S.fiturWil.length ? kotak(S.fiturWil) : BB_ID, {padding: kiriPad(), duration: 700, maxZoom: 9});
    renderCrumb(); renderDaftar(); },
  /* kartu hover satu baris berikon (inti/peta/lapis.js); stat tanpa nilai dibuang */
  kartuWilayah(f) { const p = f.properties, a = (S.jalur.length ? S.wil.kab : S.wil.prov)[p.kunci], W = WARNA_LV, pd = S.mode === "padi" && padiWil(p.kunci);
    if (pd) { const bd = padiBanding(pd); return PI.kartuTip({judul: esc(p.nama), kepala: S.jalur.length ? lambang(S.jalur[0], p.nama) : lambang(p.kunci), stat: bd ? [["debit", fmt(Math.round(bd.v)) + "%", `${PADI_BESARAN(bd.j)} (normal ${fmt(Math.round(bd.n))}%, ${poinTxt(bd.d)})`, "#c9503a", bd.d >= 10]] : [["debit", fmt(Math.round(pd.turun_med)) + "%", "penurunan hasil median", "#c9503a"]]}); }
    const stat = [["perisai", LEVEL[p.lv], "status", W[p.lv], p.lv >= 2], ...(a ? [["mata", rb(a.jiwa[0]), "jiwa kering", "#c9a24b"], ...(a.spi3 != null ? [["hujan", F2(a.spi3), `SPI ${spiBulan()} · ${katSpi(a.spi3)}`, "#3f7fb8"]] : []), ...(a.mm3 != null ? [["hujan", fmt(a.mm3) + " mm", "hujan 3 bulan", "#3f7fb8"]] : [])] : [])];
    return PI.kartuTip({judul: esc(p.nama), kepala: S.jalur.length ? lambang(S.jalur[0], p.nama) : lambang(p.kunci), stat}); },
  kartuHth(r) { const k = KELAS_HTH()[r[3]] || "";
    return PI.kartuTip({judul: "Hari tanpa hujan", sub: `<small>${F2(Math.abs(r[0]))}° ${r[0] < 0 ? "LS" : "LU"}, ${F2(r[1])}° BT</small>`, stat: [["hujan", fmt(r[2]) + " hari", k.toLowerCase(), warnaHth(r[2]) || "#9ccfae", r[3] >= 4]]}); },
  kartuPrak(r) { const t = titikPrak(r), ls = t?.[2] || [], bl = BLN_PRAK();
    return PI.kartuTip({judul: "Prakiraan SEAS5", sub: `<small>${BELUM_UJI.toLowerCase()}</small>`, stat: ls.map((l, i) => ["hujan", fmt(l[3]) + "%", `${bl[i] || ""} SPI-3 ≤ −1${BASELINE_PRAK("pk1", i) != null ? " · " + selisihTxt(l[3], BASELINE_PRAK("pk1", i)) : ""}`, warnaBatas(WARNA_PRAK, l[3]) , i === S.bln && l[3] >= 50])}); },
  kartuSel(r) { if (S.mode === "hth") return this.kartuHth(r); if (S.mode === "prakiraan") return this.kartuPrak(r);
    const W = WARNA_LV, lv = r[7] || 0, tanah = r[4] ?? r[3];
    return PI.kartuTip({judul: esc(namaProv(r[2])), sub: `<small>${F2(Math.abs(r[0]))}° ${r[0] < 0 ? "LS" : "LU"}, ${F2(r[1])}° BT</small>`, stat: [["perisai", LEVEL[lv], "status", W[lv], lv >= 2],
      ...(r[6] != null ? [["hujan", F2(r[6]), `SPI ${spiBulan()} · ${katSpi(r[6])}`, "#3f7fb8"]] : []), ...(r[9] != null ? [["hujan", fmt(r[9]) + " mm", "hujan 3 bulan", "#3f7fb8"]] : []), ...(tanah != null ? [["rasio", fmt(tanah), "persentil tanah", "#8a6d4e"]] : []), ...(r[5] != null ? [["debit", fmt(Math.round(r[5])), "kode DC", "#c9a24b"]] : [])]}); },
  interaksi() {
    if (this._ia) return; this._ia = true;
    let hov = null, hovG = null; const tip = () => PI?.sembunyiTip();
    peta.on("mousemove", "wil-fill", e => { peta.getCanvas().style.cursor = "pointer"; const f = e.features[0];
      if (hov !== f.id) { if (hov !== null) peta.setFeatureState({source: "wil", id: hov}, {hover: false}); hov = f.id; peta.setFeatureState({source: "wil", id: hov}, {hover: true}); }
      if (PI) PI.tampilTip(this.kartuWilayah(f), e.originalEvent); });
    peta.on("mouseleave", "wil-fill", () => { peta.getCanvas().style.cursor = ""; if (hov !== null) peta.setFeatureState({source: "wil", id: hov}, {hover: false}); hov = null; tip(); });
    peta.on("mousemove", "grid-fill", e => { const f = e.features[0];
      if (hovG !== f.id) { if (hovG !== null) peta.setFeatureState({source: "grid", id: hovG}, {hover: false}); hovG = f.id; peta.setFeatureState({source: "grid", id: hovG}, {hover: true}); }
      if (PI) PI.tampilTip(this.kartuSel(this._baris[f.id]), e.originalEvent); });
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
  /* kepala bisa diurut (seperti karhutla); tanpa pilihan = tingkat lalu jiwa. SPI paling kering = paling negatif */
  const U = S.urut, K = {nm: i => i.nama, spi: i => i.a.spi3 ?? 99, jiwa: i => i.a.jiwa[0], lv: i => i.a.lv};
  if (U) item.sort((a, b) => { const x = K[U.k](a), y = K[U.k](b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * U.d || a.nama.localeCompare(b.nama); });
  const u = k => U?.k === k ? ' class="urut"' + (U.d > 0 ? ' data-arah="1"' : "") : "";
  const n = tepat(j.length ? S.wil.prov[j[0]]?.kab_n || [0, 0, 0] : S.meta.nasional.kab_n);
  const pn = t => `<span class="pill" style="background:oklch(25.5% .075 256);color:#fff">${t}</span>`;   /* pil netral: bulan SPI dan ambang belum teruji (A17) */
  const ringkas = `<div class="ringkas"><div class="lbl">Kabupaten/kota</div><div class="kv">${[2, 1, 0].map(i => `<div><b style="color:${WARNA_LV[i + 1]}">${fmt(n[i])}</b><span>${LEVEL[i + 1]}</span></div>`).join("")}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${S.meta.spi ? pn("SPI " + spiBulan()) : ""}${pn(AMBANG_PIL())}</div></div>`;
  const kepala = `<div class="tb kepala" style="${g}"><span></span><span data-s="nm"${u("nm")}>${j.length ? "Kabupaten / kota" : "Provinsi"}</span><span class="n" data-s="spi"${u("spi")}>SPI</span><span class="n" data-s="jiwa"${u("jiwa")}>Jiwa</span><span data-s="lv"${u("lv")} style="text-align:right">Status</span></div>`;
  $("#rows").innerHTML = ringkas + kepala + (item.map((i, k) => `<button class="tb" data-k="${esc(i.kunci)}" style="${g}"><span class="rk">${k + 1}</span><span style="font-weight:600" translate="no">${esc(i.nama)}</span>
    <span class="n">${i.a.spi3 != null ? F2(i.a.spi3) : "–"}</span><span class="n">${i.a.jiwa[0] ? rb(i.a.jiwa[0]) : "–"}</span>
    <span style="text-align:right">${i.a.lv ? pill(i.a.lv) : `<span style="color:var(--ink2);font-size:11.5px">Normal</span>`}</span></button>`).join("") || `<div class="kosong">Tidak ada wilayah.</div>`);
}
$("#rows").addEventListener("click", e => { const kol = e.target.closest(".kepala span[data-s]");
  if (kol) { const k = kol.dataset.s; S.urut = {k, d: S.urut?.k === k ? -S.urut.d : k === "nm" || k === "spi" ? 1 : -1};
    document.querySelectorAll("#rows .kepala span[data-s]").forEach(x => { const on = x.dataset.s === k; x.classList.toggle("urut", on); if (on && S.urut.d > 0) x.dataset.arah = "1"; else delete x.dataset.arah; });   /* tanda urut langsung, daftar menyusul sesudah frame */
    return nanti(renderDaftar); }
  const b = e.target.closest(".tb:not(.kepala)"); if (!b) return; S.jalur.length >= 1 ? Analisa.wilayah(b.dataset.k) : turun(b.dataset.k); });
$("#handle").onclick = () => $("#panel").classList.toggle("min");

/* ---------- cari: provinsi dan kabupaten yang berstatus */
$("#cari").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase(), h = $("#hasil"); if (q.length < 2) { h.hidden = true; return; }
  const idx = [...Object.entries(S.meta.provinsi).map(([k, n]) => ({k, n, j: "Provinsi"})), ...Object.keys(S.wil.kab).map(k => { const p = k.split("|"); return {k, n: p[1], j: "Kab. · " + namaProv(p[0])}; })];
  const hs = idx.filter(i => i.n.toLowerCase().includes(q)).slice(0, 12);
  h.innerHTML = hs.length ? hs.map(i => `<button data-k="${esc(i.k)}">${esc(i.n)}<br><small>${esc(i.j)}</small></button>`).join("") : `<div class="kosong" style="padding:12px">Tidak ditemukan.</div>`; h.hidden = false; });
$("#hasil").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $("#hasil").hidden = true; $("#cari").value = ""; const p = b.dataset.k.split("|");
  if (p.length === 2) { S.jalur = [p[0]]; nanti(() => Peta.aturWilayah().then(() => Analisa.wilayah(b.dataset.k))); } else turun(b.dataset.k); });

/* ---------- mode & overlay */
function renderMode() {
  /* mode tanpa satu sel pun bernilai dibuang (A18); tanah muncul sendiri begitu klimatologinya cukup */
  const ada = m => m === "status" || (m === "hth" ? !!S.hth?.sel?.length : m === "prakiraan" ? !!S.prak : m === "padi" ? !!S.padi : S.grid.grid.some(r => nilaiMode(r, m) != null));
  $("#modePeta").innerHTML = MODE.filter(([m]) => ada(m)).map(([m, n]) => `<button data-mp="${m}" aria-pressed="${S.mode === m}">${n}</button>`).join("");
  if (!$("#blnPeta")) $("#modePeta").insertAdjacentHTML("afterend", '<div class="seg penuh" id="blnPeta" role="group" aria-label="Bulan prakiraan" hidden></div>'); blnPeta(); }
function blnPeta() { const e = $("#blnPeta"); if (!e) return; const on = S.mode === "prakiraan" && S.prak; e.hidden = !on; if (!on) return;
  e.innerHTML = BLN_PRAK().map((b, i) => `<button data-b="${i}" aria-pressed="${S.bln === i}">${b}</button>`).join(""); }
const setLapis = (k, on) => { const i = document.querySelector(`#lapis input[data-l="${k}"]`); if (i && i.checked !== on) { i.checked = on; i.dispatchEvent(new Event("change", {bubbles: true})); } };
$("#modePeta").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const lama = S.mode; S.mode = b.dataset.mp;
  $("#modePeta").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
  setLapis("wilayah", MODE_WIL(S.mode)); setLapis("grid", !MODE_WIL(S.mode)); blnPeta();
  nanti(() => { Peta.segarkan(); if (lama === "padi" || S.mode === "padi") Peta.aturWilayah(false); renderLegenda(); }); });   /* poligon hanya digambar ulang bila warna padi masuk/keluar */
document.addEventListener("click", e => { const b = e.target.closest("#blnPeta button"); if (!b) return; S.bln = +b.dataset.b; blnPeta(); nanti(() => { Peta.segarkan(); renderLegenda(); }); });
$("#lapis").addEventListener("change", e => { const i = e.target.closest("input"); if (!i || !peta) return;
  const k = i.dataset.l, id = {wilayah: ["wil-fill"], grid: ["grid-fill"], satelit: ["satelit"], embung: ["embung-c"], gambut: ["gambut-c"]}[k];
  if (k === "satelit") Peta.pasangSatelit();
  (i.checked && (k === "embung" || k === "gambut") ? Peta.lapisanSumber(k) : Promise.resolve()).then(() => {
    id.forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", i.checked ? "visible" : "none"));
    renderLegenda(); }); });
$("#lapisBtn").onclick = () => $("#lapis").classList.toggle("buka");

/* ---------- legenda */
const skalaW = (warna, label) => `<div class="legscale">${warna.map(w => `<i style="background:${w}"></i>`).join("")}</div><div class="legnum">${label.map(v => `<span>${v}</span>`).join("")}</div>`;
const skala = (k, nilai, label) => `<div class="legscale">${nilai.map(v => `<i style="background:${warnaTangga(k, v)}"></i>`).join("")}</div><div class="legnum">${label.map(v => `<span>${v}</span>`).join("")}</div>`;
function renderLegenda() {
  const m = S.mode, M = S.meta, grid = Peta.lihat("grid") && m !== "status", wil = Peta.lihat("wilayah");
  const sw = (w, t) => `<span><i class="sw" style="background:${w}"></i>${t}</span>`;
  $("#legenda").innerHTML = `<details ${legBuka ? "open" : ""} id="legDet"><summary class="lbl">Legenda <span>▾</span></summary><div class="lg-isi">
    ${wil && m === "padi" ? `<div class="lbl">Padi tadah hujan: ${PADI_BESARAN(padiJenis())} dibanding normal (selisih poin)</div>${skalaW(WARNA_PADI.map(x => x[1]), ["≤ 0", "1–9", "10–24", "≥ 25"])}<div class="lbl" style="margin-top:2px">Tanam mengikuti onset hujan (asumsi), tanpa irigasi, tanpa data sawah</div>` : ""}
    ${m === "hth" && Peta.lihat("grid") && S.hth ? (() => { const b = S.hth.batas_kelas, lb = [`1–${b[0]}`, ...b.slice(1).map((x, i) => `${b[i] + 1}–${x}`), `> ${b.at(-1)}`];
      return `<div class="lbl">Hari tanpa hujan (hujan &lt; ${fmt(S.hth.ambang_mm)} mm), kelas BMKG</div>${skalaW(WARNA_HTH, lb)}`; })() : ""}
    ${Peta.lihat("grid") && m === "prakiraan" ? `<div class="lbl">Peluang SPI-3 ≤ −1, ${esc(BLN_PRAK()[S.bln] || "")} (%)</div>${skalaW(WARNA_PRAK.map(x => x[1]), ["≤ 10", "11–20", "21–35", "36–50", "51–70", "> 70"])}
      <div class="leg" style="margin:4px 0 8px"><span><i class="sw" style="background:#0b2545"></i>${BELUM_UJI}, ECMWF SEAS5; ${esc(BIAS_BULAN()[S.bln] || BIAS_TXT())}</span>${BASELINE_PRAK("pk1", S.bln) != null ? `<span>Baseline klimatologi ${fmt(Math.round(BASELINE_PRAK("pk1", S.bln)))}%</span>` : ""}</div>` : ""}
    ${wil && m !== "padi" ? `<div class="lbl">Status kekeringan per wilayah</div><div class="leg" style="margin:4px 0 8px">${[3, 2, 1].map(l => sw(WARNA_LV[l], LEVEL[l])).join("")}</div>` : ""}
    ${Peta.lihat("grid") && m === "status" ? `<div class="lbl">Status kisi 0,5°</div><div class="leg" style="margin:4px 0 8px">${[3, 2, 1].map(l => sw(WARNA_LV[l], LEVEL[l])).join("")}</div>` : ""}
    ${grid && m === "spi" ? `<div class="lbl">Indeks hujan 3 bulan (SPI-3${M.spi ? ", " + spiBulan() : ""})</div>${skala("spi", [-3, -1.75, -1.25, -.75, 0, .75, 1.25, 2], ["−2", "−1,5", "−1", "−0,5", "+0,5", "+1", "+1,5", "> 1,5"])}` : ""}
    ${grid && m === "tanah" ? `<div class="lbl">Kelembapan tanah 7–28 cm (persentil, ${fmt(M.tanah.sel)} sel)</div>${skala("tanah", [3, 8, 15, 30, 50, 70, 90, 99], ["5", "10", "20", "40", "60", "80", "95", "> 95"])}` : ""}
    ${grid && m === "dc" ? `<div class="lbl">Kode kekeringan (DC)</div><div class="leg" style="margin:4px 0 8px">${[[50, "< 80 rendah"], [150, "80 sedang"], [250, "190 tinggi"], [350, "300 sangat tinggi"], [500, "≥ 425 ekstrem"]].map(([v, t]) => sw(warnaTangga("dc", v), t)).join("")}</div>` : ""}
    ${Peta.lihat("embung") && S.embung ? `<div class="lbl">Embung, waduk, bendungan (OpenStreetMap)</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw" style="background:#1d6fa5"></i>lingkaran = jumlah objek per kabupaten, ${fmt(S.embung.total)} objek se-Indonesia; kasar, tidak lengkap</span></div>` : ""}
    ${Peta.lihat("gambut") && S.bukti?.gambut?.daftar?.length ? `<div class="lbl">Konsesi berlahan gambut di sel Siaga atau Awas</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw" style="background:#7a4a2c"></i>${fmt(S.bukti.gambut.daftar.length)} kompleks teratas (menurut DC) dari ${fmt(S.bukti.gambut.n_kering)}, tanpa nama perusahaan; indikator kasar per sel 0,5°</span></div>` : ""}
    <div class="lbl" style="margin-top:2px">Deteksi Pantau Bencana</div></div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: o => legBuka = o}); }

/* ================================================================ popup wilayah */
const kot = (l, v, s) => `<div class="kpi"><span class="lbl">${l}</span><b>${v}</b><small>${s}</small></div>`;
const Analisa = {
  buka(html, kepala) { const d = $("#dlg"); d.innerHTML = `<div class="dh">${kepala}<button aria-label="Tutup" data-tutup>×</button></div><div class="db">${html}</div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = e => { if (e.target === d) d.close(); }; d.showModal(); },
  wilayah(kunci) {
    const p = kunci.split("|"), kab = p.length === 2, a = (kab ? S.wil.kab : S.wil.prov)[kunci] || (kab && (S.hth?.kab?.[kunci] || S.prak?.kab?.[kunci]) ? {lv: 0, jiwa: [0, 0, 0], total: (S.hth?.kab?.[kunci] || S.prak?.kab?.[kunci]).total || 0} : null); if (!a) return;   /* kabupaten tanpa status tetap punya HTH, prakiraan, padi */
    const nama = kab ? p[1] : namaProv(p[0]), sub = kab ? "Kabupaten/kota · " + namaProv(p[0]) : "Provinsi", sp = S.meta.spi;
    const kepala = `${kab ? lambang(p[0], p[1]) : lambang(p[0])}<div><h3 id="dlgJudul">${esc(nama)}</h3><p>${esc(sub)}</p></div>`;
    const dasar = `<div class="grid g4">${kot("Status", `<span style="color:${WARNA_LV[a.lv]}">${LEVEL[a.lv]}</span>`, ["tidak kering", "kering", "kering parah", "kering berat"][a.lv])}
      ${kot("Jiwa di wilayah kering", rb(a.jiwa[0]), `dari ${rb(a.total)} jiwa`)}${kot("Jiwa Awas", a.jiwa[2] ? rb(a.jiwa[2]) : "–", "di kecamatan Awas")}
      ${a.spi3 != null ? kot("SPI " + spiBulan(), F2(a.spi3), katSpi(a.spi3)) : ""}${a.mm3 != null ? kot("Hujan 3 bulan", fmt(a.mm3) + " mm", sp ? "sampai " + spiBulan() : "") : ""}${a.pct != null ? kot("Tanah", fmt(a.pct), "persentil") : ""}${a.dc != null ? kot("Kode DC", fmt(a.dc), "rata-rata tertimbang") : ""}
      ${!kab ? kot("Kabupaten/kota", `${fmt(a.kab_n[0])}`, `${fmt(a.kab_n[2])} Awas`) : ""}</div>
      <p class="fnd">Deteksi Pantau Bencana</p>`;
    const isi = `<div id="skBlok"></div>` + dasar + this.blokLain(kunci, kab);
    this.buka(isi, kepala); this.isiSK(kunci, kab); },
  /* blok HTH, prakiraan SEAS5, padi, IRBI: tiap blok dibuang bila datanya tidak ada */
  blokLain(kunci, kab) {
    const blk = (j, isi) => `<section class="bk"><h4>${j}</h4>${isi}</section>`, out = [];
    const H = S.hth && (kab ? S.hth.kab : S.hth.prov)[kunci];
    if (H && H.maks > 0) out.push(blk("Hari tanpa hujan", `<div class="grid g4">${kot("HTH terpanjang", fmt(H.maks) + " hari", (KELAS_HTH()[klsHth(H.maks)] || "").toLowerCase())}${kot("Jiwa HTH 31 hari atau lebih", rb(H.j31), `${fmt(Math.round(H.j31 / (H.total || 1) * 100))}% penduduk`)}${kot("Jiwa HTH 61 hari atau lebih", rb(H.j61), "")}</div><p class="fnd">Hujan di bawah ${fmt(S.hth.ambang_mm)} mm dihitung tanpa hujan; model Open-Meteo, bukan pos BMKG</p>`));
    const P = S.prak && (kab ? S.prak.kab : S.prak.prov)[kunci];
    if (prakAda(P)) out.push(blk(`Prakiraan 3 bulan <em class="sp-p oranye">${BELUM_UJI}</em>`, `<div class="bk-t">${P.lead.map((l, i) => { const bs = BASELINE_PRAK("pk1", i);
      return `<div><b>${esc(BLN_PRAK()[i] || "")}</b><span>${fmt(Math.round(l.pk1))}% SPI-3 ≤ −1${bs != null ? ` <small>(${selisihTxt(l.pk1, bs)} dari baseline ${fmt(Math.round(bs))}%)</small>` : ""}</span><span>${fmt(Math.round(l.pk15))}% ≤ −1,5 · ${fmt(Math.round(l.pk2))}% ≤ −2</span><span>median SPI-3 ${F2(l.spi3)}</span></div>`; }).join("")}</div>
      <p class="fnd">ECMWF SEAS5, 51 anggota; ${esc(BIAS_TXT())}${P.p31 != null ? ` · peluang HTH 31 hari atau lebih ${fmt(Math.round(P.p31))}%, 61 hari ${fmt(Math.round(P.p61))}%` : ""}</p>`));
    const D = padiWil(kunci);
    if (D) { const bd = padiBanding(D);
      out.push(blk("Padi tadah hujan", `<div class="grid g4">${kab ? kot("Peluang gagal panen", fmt(D.gagal) + "%", "hasil turun 50% atau lebih") : ""}${bd ? kot(PADI_BESARAN(bd.j)[0].toUpperCase() + PADI_BESARAN(bd.j).slice(1), fmt(Math.round(bd.v)) + "%", `normal ${fmt(Math.round(bd.n))}% (${poinTxt(bd.d)})`) : kot("Penurunan hasil median", fmt(Math.round(D.turun_med)) + "%", "")}${bd?.j === "median" ? kot("Peluang hasil turun 25% atau lebih", fmt(Math.round(D.turun25)) + "%", D.fase_terberat ? "fase terberat: " + esc(D.fase_terberat) : "") : kot("Penurunan hasil median", fmt(Math.round(D.turun_med)) + "%", D.fase_terberat ? "fase terberat: " + esc(D.fase_terberat) : "")}</div><p class="fnd">Indikator cekaman air, bukan data puso; tanam ${D.tanam ? esc(tglPendek(D.tanam)) + " (asumsi)" : "mengikuti onset hujan (asumsi)"}, tanpa irigasi, tanpa data sawah</p>`)); }
    const I = kab && irbiKab(kunci);
    if (I) out.push(blk("Indeks risiko kekeringan BNPB", `<div class="grid g4">${kot("IRBI 2025", fmt(I.v25), I.tinggi ? "sepertiga teratas" : "di bawah sepertiga teratas")}${kot("Arah 2022–24 dari 2015–17", esc(I.arah), "skala 2025 beda metode")}</div>`));
    return out.join(""); },
  /* SK status darurat BNPB: teks lembaga lewat textContent, bukan innerHTML */
  isiSK(kunci, kab) {
    const w = $("#skBlok"); if (!w || !S.resmi) return;
    const L = kab ? skKab(kunci) : (skPer().prov[kunci] || []), nKab = kab ? 0 : Object.keys(skPer().kab).filter(k => k.startsWith(kunci + "|")).length;
    if (!L.length && !nKab) return;
    const el = (t, kls, tx) => { const e = document.createElement(t); if (kls) e.className = kls; if (tx != null) e.textContent = tx; return e; };
    const sec = el("section", "bk sk"), h = el("h4", "", "Status resmi BNPB"); const pil = el("em", "sp-p merah", S.resmi.n_aktif ? `${fmt(S.resmi.n_aktif)} SK berlaku` : "Tidak ada SK berlaku sekarang"); h.append(" ", pil); sec.append(h);
    for (const s of L) { const r = el("div", "sk-r"); r.append(el("b", "", s.status), el("span", "", s.jenis), el("span", "", `${tglPendek(s.mulai)} ${s.mulai.slice(0, 4)} sampai ${tglPendek(s.akhir)} ${s.akhir.slice(0, 4)}`), el("small", "", "SK " + s.nomor));
      if (/^https:\/\/drive\.google\.com\//.test(s.surat || "")) { const a = el("a", "", "Surat SK"); a.href = s.surat; a.target = "_blank"; a.rel = "noopener noreferrer"; r.append(a); } sec.append(r); }
    if (nKab) sec.append(el("p", "fnd", `${fmt(nKab)} kabupaten/kota di provinsi ini punya SK status darurat BNPB ${S.resmi.tahun_data} (riwayat)`));
    sec.append(el("p", "fnd", `Riwayat SK ${S.resmi.tahun_data} yang menyebut kekeringan; bukan status berlaku. ${S.resmi.sumber || ""}`)); w.append(sec); },
};
