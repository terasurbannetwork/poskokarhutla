"use strict";
/* ================================================================ peta
   Lapisan: PM2,5 CAMS (gambar 1 piksel per sel 1 derajat, dihaluskan peramban seperti hujan di banjir), titik jarak pandang METAR, citra satelit.
   Ubin Overlay, kartu hover, dan susunan legenda dari public/inti/peta. */
let peta = null, PI = null, LG = null, legBuka = innerWidth > 900;
const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];
const UBIN = {pm25: ["#3b6e5a", "#e8743b", "angin"], metar: ["#1f5f8b", "#9fb3d1", "mata"], satelit: ["#13324d", "#4d8a5e", "satelit"]};
const UBIN_PENDEK = {pm25: "PM2,5", metar: "Jarak pandang", satelit: "Satelit"};
const kiriPad = () => { if (innerWidth <= 900) return {top: 60, bottom: innerHeight * .45, left: 16, right: 16};
  const r = s => document.querySelector(s)?.getBoundingClientRect(), pn = r(".panel"), tl = r(".tools"), lg = r("#dok"), pt = r("#p-peta");
  return {top: 56, left: (pn?.width || 440) + 30, right: (tl?.width || 280) + 30, bottom: Math.min(160, Math.max(30, pt && lg ? pt.bottom - lg.top + 16 : 150))}; };
function kotak(fitur) { const a = [180, 90, -180, -90];
  const jalan = c => { if (typeof c[0] === "number") { a[0] = Math.min(a[0], c[0]); a[1] = Math.min(a[1], c[1]); a[2] = Math.max(a[2], c[0]); a[3] = Math.max(a[3], c[1]); } else c.forEach(jalan); };
  fitur.forEach(f => jalan(f.geometry.coordinates)); return [[a[0], a[1]], [a[2], a[3]]]; }

const Peta = {
  async init() {
    document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="../inti/peta/lapis.css"><link rel="stylesheet" href="../inti/peta/legenda.css">');
    PI = await import("../inti/peta/lapis.js").catch(() => null);
    PI?.ubinLapis($("#lapis"), {katalog: UBIN, pendek: UBIN_PENDEK});
    LG = await import("../inti/peta/legenda.js").catch(() => null);
    const lebar = () => { const w = $(".panel")?.getBoundingClientRect().width, t = $(".tools")?.getBoundingClientRect().width, p = $("#p-peta");
      if (w) p.style.setProperty("--lp", w + "px"); if (t) p.style.setProperty("--tw", t + "px"); };
    const ro = new ResizeObserver(lebar); ro.observe($(".panel")); ro.observe($(".tools")); lebar();
    peta = new maplibregl.Map({container: "peta", style: DASAR(), center: [118, -2.4], zoom: 4.1, minZoom: 3, maxZoom: 12, attributionControl: {compact: true}, dragRotate: false, pitchWithRotate: false});
    peta.once("load", () => window.NASA?.pasang(peta, ["co"]));   /* lapisan satelit NASA GIBS, inti/peta/nasa.js */
    peta.touchZoomRotate.disableRotation();
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    peta.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-right");
    peta.on("style.load", () => this.pasang());
    await new Promise(r => peta.isStyleLoaded() ? r() : peta.once("style.load", r));
    peta.fitBounds(BB_ID, {padding: kiriPad(), duration: 0}); },
  lihat(k) { const i = document.querySelector(`#lapis input[data-l="${k}"]`); return i ? i.checked : false; },
  bawahLabel() { const l = peta.getStyle().layers.find(l => l.type === "symbol"); return l && l.id; },
  pasang() {
    if (peta.getSource("pm")) return;
    const bl = this.bawahLabel(), vis = on => ({visibility: on ? "visible" : "none"});
    peta.addSource("satelit", {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Esri"});
    peta.addLayer({id: "satelit", type: "raster", source: "satelit", layout: vis(this.lihat("satelit"))}, bl);
    const g = this.gambarPM();
    peta.addSource("pm", {type: "image", url: g.url, coordinates: g.kor});
    peta.addLayer({id: "pm", type: "raster", source: "pm", layout: vis(this.lihat("pm25")), paint: {"raster-opacity": .8, "raster-resampling": "linear", "raster-fade-duration": 0}}, bl);
    peta.addSource("prov", {type: "geojson", data: S.geo, promoteId: "kode"});
    peta.addLayer({id: "prov-fill", type: "fill", source: "prov", paint: {"fill-color": "#000", "fill-opacity": 0.01}});
    peta.addLayer({id: "prov-line", type: "line", source: "prov", paint: {"line-color": gelap() ? "#c9d6ea" : "#0b2545", "line-width": ["case", ["boolean", ["feature-state", "pilih"], false], 3, 1], "line-opacity": ["case", ["boolean", ["feature-state", "pilih"], false], .95, .4]}});
    const m = this.geoMetar();
    peta.addSource("metar", {type: "geojson", data: m});
    peta.addLayer({id: "metar", type: "circle", source: "metar", layout: {...vis(this.lihat("metar")), "circle-sort-key": ["-", 0, ["get", "k"]]},
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 9, 11], "circle-color": ["match", ["get", "k"], 3, JP[3].w, 2, JP[2].w, 1, JP[1].w, JP[0].w], "circle-stroke-color": "#fff", "circle-stroke-width": 2}});
    if (S.pilih) peta.setFeatureState({source: "prov", id: S.pilih}, {pilih: true});
    this.interaksi(); },
  /* PM2,5 rata-rata 24 jam hari aktif sebagai gambar: satu piksel per sel, diperbesar 8x dengan penghalusan supaya tepi sel tidak kotak */
  gambarPM() {
    const rows = S.asap.grid, las = rows.map(r => r[0]), los = rows.map(r => r[1]), x0 = Math.min(...los) - .5, x1 = Math.max(...los) + .5, y0 = Math.min(...las) - .5, y1 = Math.max(...las) + .5;
    const w = Math.round(x1 - x0), h = Math.round(y1 - y0), cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h);
    for (const r of rows) { const v = r[ROW.rata][S.hari]; if (v == null) continue; const cx = Math.floor(r[1] - x0), cy = Math.floor(y1 - r[0]);
      if (cx >= 0 && cy >= 0 && cx < w && cy < h) img.data.set(gradasi(ST_PM, v), (cy * w + cx) * 4); }
    ctx.putImageData(img, 0, 0);
    const K = 8, bs = document.createElement("canvas"); bs.width = w * K; bs.height = h * K; const c2 = bs.getContext("2d"); c2.imageSmoothingEnabled = true; c2.imageSmoothingQuality = "high"; c2.drawImage(cv, 0, 0, bs.width, bs.height);
    return {url: bs.toDataURL(), kor: [[x0, y1], [x1, y1], [x1, y0], [x0, y0]]}; },
  geoMetar() { return {type: "FeatureCollection", features: metarSegar().map((m, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [m.lon, m.lat]}, properties: {i, k: kelasJP(m.vis_m)}}))}; },
  terlihat(k) { return this.lihat(k); },
  segarkan() { if (!peta?.getSource("pm")) return; const g = this.gambarPM(); peta.getSource("pm").updateImage({url: g.url, coordinates: g.kor}); peta.getSource("metar")?.setData(this.geoMetar()); },
  kartuSel(la, lo) { const r = sel(la, lo); if (!r) return ""; const v = r[ROW.rata][S.hari], mk = r[ROW.maks][S.hari]; if (v == null) return "";
    const c = kat(v);
    return PI.kartuTip({judul: `${KAT[c].n}`, stat: [["perisai", KAT[c].n, "kategori", KAT[c].w, c >= 2], ["debit", fmt(Math.round(v)) + " µg/m³", "rata-rata 24 jam", KAT[c].w], ["peringatan", fmt(Math.round(mk)) + " µg/m³", "puncak per jam", "#7d8ca3"]]}); },
  kartuMetar(i) { const m = metarSegar()[i]; if (!m) return ""; const k = kelasJP(m.vis_m), w = wxNama(m.wx);
    return PI.kartuTip({judul: esc(m.nama), sub: `<small>${esc(m.icao)}</small>`, stat: [["mata", m.vis_m >= 9999 ? "10 km atau lebih" : fmt(m.vis_m / 1000) + " km", "jarak pandang", JP[k].w, k >= 2], ...(w ? [["peringatan", w, "cuaca", "#e8743b"]] : [])]}); },
  pilihProv(kode, terbang = true) {
    if (S.pilih && peta?.getSource("prov")) peta.setFeatureState({source: "prov", id: S.pilih}, {pilih: false});
    S.pilih = kode || null;
    if (S.pilih && peta?.getSource("prov")) peta.setFeatureState({source: "prov", id: S.pilih}, {pilih: true});
    if (terbang && peta) { const f = S.geo.features.find(f => f.properties.kode === kode); peta.fitBounds(f ? kotak([f]) : BB_ID, {padding: kiriPad(), duration: 700, maxZoom: 8}); }
    renderDaftar(); renderCrumb(); kode ? this.laciProv(kode) : $("#laci").classList.remove("on"); },
  /* laci rincian di kanan (sama dengan laci karhutla dan banjir): PM2,5 per hari, jiwa per kategori, kabupaten/kota paling terpapar. Semua angka perkiraan model. */
  laciProv(kode) { const H = S.uk.prov[kode]; if (!H) return $("#laci").classList.remove("on");
    const p = H[S.hari], kab = (S.uk.kab[S.hari] || []).filter(r => r[0] === kode && r[5] > 0).slice(0, 5), hr = hariTampil();
    Laci.buka("Provinsi", `<span translate="no">${esc(namaProv(kode))}</span>`, PIL_MODEL,
      `<div class="grid g4">${hr.slice(0, 4).map(i => kot(labelHari(i), `<span style="color:${KAT[kat(H[i][5])].w}">${fmt(Math.round(H[i][5]))} µg/m³</span>`, KAT[kat(H[i][5])].n)).join("")}</div>
      <p class="fnd">Jiwa menurut kategori ${S.uk.hari[S.hari] === tglWIB(SEKARANG()) && S.hari === S.h0 ? "hari ini" : tglPendek(S.uk.hari[S.hari])}:</p>
      <div class="legd">${KAT.map((k, c) => p[c] ? `<span class="kt" style="--c:${k.w};--f:${k.fg}">${k.n} · ${jiwa(p[c])}</span>` : "").join(" ")}</div>
      ${kab.length ? `<p class="fnd">Kabupaten/kota paling terpapar:</p><div class="legd">${kab.map(r => `<span class="kt" style="--c:#3f4a5e;--f:#fff;text-transform:none" translate="no">${esc(r[1])} · ${fmt(Math.round(r[2]))} µg/m³</span>`).join(" ")}</div>` : ""}
      <p class="fnd">Sumber: Copernicus CAMS lewat Open-Meteo, WorldPop. Perkiraan model, belum dikoreksi ke alat ukur.</p><p class="fnd">Data ${jamWIB(S.uk.dibuat)}</p>`); },
  interaksi() {
    if (this._ia) return; this._ia = true; let diTitik = false;
    peta.on("mousemove", "metar", e => { diTitik = true; peta.getCanvas().style.cursor = "pointer"; PI?.tampilTip(this.kartuMetar(e.features[0].properties.i), e.originalEvent); });
    peta.on("mouseleave", "metar", () => { diTitik = false; peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); });
    peta.on("mousemove", e => { if (diTitik || !PI || !this.lihat("pm25")) return;
      const ada = peta.queryRenderedFeatures(e.point, {layers: ["prov-fill"]}).length; peta.getCanvas().style.cursor = ada ? "pointer" : "";
      const h = ada ? this.kartuSel(e.lngLat.lat, e.lngLat.lng) : ""; h ? PI.tampilTip(h, e.originalEvent) : PI.sembunyiTip(); });
    peta.getCanvas().addEventListener("mouseleave", () => PI?.sembunyiTip());
    peta.on("click", e => { const f = peta.queryRenderedFeatures(e.point, {layers: ["prov-fill"]})[0]; if (f) this.pilihProv(f.properties.kode); }); },
};

/* ---------- panel ---------- */
const kot = (l, v, s) => `<div class="kpi"><span class="lbl">${l}</span><b>${v}</b><small>${s}</small></div>`;
const Laci = {
  buka(ey, judul, meta, isi) { const el = $("#laci");
    el.innerHTML = `<div class="hd"><div class="hd-isi"><span class="hd-ey">${ey}</span><h2 id="dlgJudul" translate="no" title="${judul.replace(/<[^>]+>/g, "")}">${judul}</h2>${meta ? `<div class="hd-meta">${meta}</div>` : ""}</div>
      <div class="hd-aksi"><button class="tutup ik-btn" aria-label="Tutup" title="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div><div class="bd" style="display:grid;gap:10px">${isi}</div>`;
    el.classList.add("on"); el.querySelector(".tutup").onclick = () => Peta.pilihProv(null, false); },
};
/* crumb seperti karhutla/banjir: pil "Indonesia" di luar kartu; provinsi yang dibuka jadi pil kedua dengan tombol Rincian */
function renderCrumb() {
  $("#crumb").innerHTML = `<button data-n="0">Indonesia</button>` + (S.pilih ? `<button data-n="1" translate="no">${esc(namaProv(S.pilih))}</button><button class="cr-rinci" data-rinci title="Rincian"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>Rincian</button>` : ""); }
$("#crumb").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.rinci != null) return Peta.laciProv(S.pilih); if (b.dataset.n === "0") Peta.pilihProv(null); });
/* kolom Tren seperti karhutla: batang mini 7 hari terakhir + panah dan persen. Hari lampau dari riwayat (analisis CAMS), hari ini dari prakiraan; kurang dari 4 hari = kolom kosong (A18). */
const WARNA_TREN = {"-1": "#2b8c86", "0": "#8a94a6", "1": "#c9503a"};
function trenProv(k) {
  const rw = S.rw?.prov?.[k] || {}, ini = S.uk.hari[S.h0], v = [...Object.keys(rw).sort().filter(t => t < ini).map(t => rw[t][1]), S.uk.prov[k][S.h0][5]].slice(-7);
  if (v.length < 4) return null;
  const a = v.slice(-3).reduce((x, y) => x + y, 0) / 3, b = v.slice(0, -3).reduce((x, y) => x + y, 0) / (v.length - 3), d = b ? a / b - 1 : 0, arah = d > .1 ? 1 : d < -.1 ? -1 : 0, m = Math.max(1, ...v), bw = 40 / v.length;
  return {d, arah, html: `<span class="tr-c"><svg viewBox="0 0 40 16" width="30" height="14" aria-hidden="true">${v.map((x, i) => `<rect x="${i * bw + .3}" y="${16 - Math.max(.8, x / m * 15)}" width="${Math.max(.6, bw - .6)}" height="${Math.max(.8, x / m * 15)}" fill="${i >= v.length - 3 ? WARNA_TREN[arah] : "currentColor"}" opacity="${i >= v.length - 3 ? 1 : .35}"/>`).join("")}</svg><b style="color:${WARNA_TREN[arah]}">${arah > 0 ? "▲" : arah < 0 ? "▼" : "•"}${fmt(Math.abs(Math.round(d * 100)))}%</b></span>`}; }
function renderDaftar() {
  const q = ($("#cari").value || "").trim().toLowerCase();
  const item = Object.entries(S.uk.prov).map(([k, h]) => { const p = h[S.hari]; return {k, nama: namaProv(k), rata: p[5], ts: p[2] + p[3] + p[4], c: kat(p[5]), t: trenProv(k)}; })
    .filter(i => !q || i.nama.toLowerCase().includes(q)).sort((a, b) => b.rata - a.rata);
  $("#rows").innerHTML = `<div class="tb kepala"><span></span><span>Provinsi</span><span class="n" style="text-transform:none">µg/m³</span><span class="n">Jiwa</span><span class="n">Tren</span><span style="text-align:right">Kategori</span></div>`
    + (item.map((i, n) => `<button class="tb${i.k === S.pilih ? " dipilih" : ""}" data-k="${i.k}"><span class="rk">${n + 1}</span><span style="font-weight:600" translate="no">${esc(i.nama)}</span>
      <span class="n" data-sort="${i.rata}">${fmt(Math.round(i.rata))}</span><span class="n" data-sort="${i.ts}">${i.ts ? kr(i.ts) : "–"}</span><span class="n" data-sort="${i.t ? i.t.d : -1e15}">${i.t ? i.t.html : "–"}</span><span style="text-align:right" data-sort="${i.c}">${pilKat(i.c)}</span></button>`).join("") || `<div class="kosong">Tidak ditemukan.</div>`);
  terapkanUrut(); }
/* kepala tabel panel bisa diurut (klik kolom; klik lagi = balik arah), seperti karhutla; bawaan = PM2,5 tertinggi di atas */
S.urut = null;
function tandaiUrut() { const kp = $("#rows").querySelector(".tb.kepala"); if (!kp) return;
  [...kp.children].forEach((c, i) => { if (i < 1) return; c.dataset.s = i; c.classList.toggle("urut", S.urut?.i === i); c.dataset.arah = S.urut?.i === i ? S.urut.d : ""; }); }
function terapkanUrut() { const box = $("#rows"); tandaiUrut(); if (!S.urut || !box.querySelector(".tb.kepala")) return;
  const u = S.urut, nilai = b => { const c = b.children[u.i]; if (c.dataset.sort != null) return +c.dataset.sort; return c.textContent.trim(); };
  const rows = [...box.querySelectorAll("button.tb")].map(b => ({b, v: nilai(b)})), fr = document.createDocumentFragment();
  rows.sort((a, b) => u.d * (typeof a.v === "string" || typeof b.v === "string" ? String(a.v).localeCompare(String(b.v), "id") : a.v - b.v));
  rows.forEach(({b}, n) => { const rk = b.querySelector(".rk"); if (rk) rk.textContent = n + 1; fr.appendChild(b); });
  box.appendChild(fr); }   /* fr dulu: parentElement simpul di dalam fragmen null */
$("#rows").addEventListener("click", e => { const kol = e.target.closest(".kepala span[data-s]");
  if (kol) { const i = +kol.dataset.s, u = S.urut; S.urut = {i, d: u?.i === i ? -u.d : i === 1 ? 1 : -1}; tandaiUrut(); return nanti(terapkanUrut); }
  const b = e.target.closest(".tb:not(.kepala)"); if (b) Peta.pilihProv(b.dataset.k === S.pilih ? null : b.dataset.k, b.dataset.k !== S.pilih); });
$("#cari").addEventListener("input", renderDaftar);
$("#handle").onclick = () => $("#panel").classList.toggle("min");

/* ---------- hari, overlay, legenda ---------- */
const tglSingkat = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric"});
function renderHari() {
  $("#hariSeg").innerHTML = `<div class="seg penuh" style="box-shadow:none">${hariTampil().map(i => `<button data-i="${i}" aria-pressed="${S.hari === i}">${labelHari(i) === "Hari ini" ? "Hari ini" : tglSingkat(S.uk.hari[i])}</button>`).join("")}</div>`; }
$("#hariSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.hari = +b.dataset.i;
  $("#hariSeg").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); nanti(() => { Peta.segarkan(); renderDaftar(); if (S.pilih) Peta.laciProv(S.pilih); }); });
$("#lapis").addEventListener("change", e => { const i = e.target.closest("input"); if (!i || !peta) return; const k = i.dataset.l;
  const id = {pm25: "pm", metar: "metar", satelit: "satelit"}[k]; peta.getLayer(id) && peta.setLayoutProperty(id, "visibility", i.checked ? "visible" : "none");
  renderLegenda(); });
$("#lapisBtn").onclick = () => $("#lapis").classList.toggle("buka");
function renderLegenda() {
  const adaMetar = metarSegar().length > 0;   /* tanpa stasiun segar, keterangannya dibuang (A18) */
  $("#legenda").innerHTML = `<details ${legBuka ? "open" : ""} id="legDet"><summary class="lbl">Legenda <span>▾</span></summary><div class="lg-isi">
    ${Peta.terlihat("pm25") ? `<div class="lbl">PM2,5 rata-rata 24 jam <span style="text-transform:none">(µg/m³)</span></div><div class="leg" style="margin:4px 0 8px">${KAT.map(k => `<span><i class="sw" style="background:${k.w}"></i>${k.n} · ${k.r}</span>`).join("")}</div>` : ""}
    ${adaMetar && Peta.terlihat("metar") ? `<div class="lbl">Jarak pandang bandara (METAR)</div><div class="leg" style="margin:4px 0 8px">${JP.map(j => `<span><i class="sw dot" style="background:${j.w}"></i>${j.n}</span>`).join("")}</div>` : ""}
  </div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: v => legBuka = v}); }
