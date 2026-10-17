"use strict";
/* ================================================================ peta gempa
   Rangka mengikuti banjir/peta.js (padding terukur, ubin Overlay inti, kartu hover inti, legenda inti); isi (lingkaran gempa, riwayat, grid, InaRISK, lempeng) khusus gempa. */
let peta = null, PI = null, LG = null, legBuka = innerWidth > 900;
const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];
const kiriPad = () => { const r = s => document.querySelector(s)?.getBoundingClientRect(), pt = r("#p-peta"), pn = r(".panel"), tl = r(".tools"), gw = r("#garisWaktu");
  if (innerWidth <= 900) return {top: Math.max(60, gw?.width && pt ? gw.bottom - pt.top + 12 : 60), bottom: (pn?.height || innerHeight * .46) + 16, left: 16, right: 16};
  const kiri = (pn?.width || 400) + 30, kanan = (tl?.width || 250) + 30, sisa = Math.max(0, kiri + kanan - (pt?.width || innerWidth) + 160), k = sisa ? Math.max(0, 1 - sisa / (kiri + kanan)) : 1;
  return {top: 56, left: kiri * k, right: kanan * k, bottom: 90}; };
function kotak(titik) { let a = [180, 90, -180, -90];
  const jalan = c => { if (typeof c[0] === "number") { a[0] = Math.min(a[0], c[0]); a[1] = Math.min(a[1], c[1]); a[2] = Math.max(a[2], c[0]); a[3] = Math.max(a[3], c[1]); } else c.forEach(jalan); };
  titik.forEach(f => jalan(f.geometry.coordinates)); return [[a[0], a[1]], [a[2], a[3]]]; }

/* katalog ubin Overlay (inti/peta/lapis.js); ikon yang belum ada di inti ditambahkan ke objek IKON-nya dari sini (adaptor, inti tidak disentuh) */
const IKON_GEMPA = {
  gempa: '<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.5"/>',
  dalam: '<path d="M12 3v14M6 12l6 6 6-6"/>',
  jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  getar: '<path d="M2 12h4l2-5 3 10 3-12 2 7h6"/>',
  kisi: '<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>',
  lempeng: '<path d="M3 17l4-6 4 4 4-8 6 10"/>',
};
const UBIN = {wilayah: ["#f4c48a", "#d4572f", "peta"], gempa: ["#7a3b0b", "#e8743b", "gempa"], riwayat: ["#4a3b6b", "#a58bd6", "jam"], kekerapan: ["#8a3b2b", "#f0b35a", "kisi"],
  bahaya: ["#0b2545", "#3b6fb0", "perisai"], lempeng: ["#5a4a3a", "#c9a26b", "lempeng"], sesar: ["#3b1f1f", "#d9534f", "lempeng"], satelit: ["#13324d", "#4d8a5e", "satelit"]};
const UBIN_PENDEK = {wilayah: "Wilayah", gempa: "Terkini", riwayat: "Sejak 1900", kekerapan: "Kekerapan", bahaya: "InaRISK", lempeng: "Lempeng", sesar: "Sesar", satelit: "Satelit"};
/* urutan tumpukan lapisan, bawah ke atas */
const URUT = ["satelit", "kekerapan", "prov-fill", "prov-line", "bahaya", "lempeng", "sesar", "riwayat", "gempa", "pilih"];
const LAPIS_PETA = {wilayah: ["prov-fill"], gempa: ["gempa"], riwayat: ["riwayat"], kekerapan: ["kekerapan"], bahaya: ["bahaya"], lempeng: ["lempeng"], sesar: ["sesar"], satelit: ["satelit"]};
const WARNA_WIL = ["rgba(0,0,0,0)", "#fbe3c0", "#f4b97a", "#e6803f", "#c9503a"], BATAS_WIL = [1, 5, 20, 50];
const RAMP_GRID = [[0.04, [253, 231, 160, 150]], [0.12, [248, 190, 95, 185]], [0.4, [238, 133, 58, 215]], [1, [212, 71, 47, 235]], [2.5, [143, 29, 43, 250]]];
const RAMP_BAHAYA = [[0, "#ffe9a8"], [.25, "#f9c25b"], [.5, "#ee8a3a"], [.75, "#d4472f"], [1, "#8f1d2b"]];
const ramp = (st, v) => { if (v <= st[0][0]) return st[0][1]; for (let k = 1; k < st.length; k++) if (v <= st[k][0]) { const [a, ca] = st[k - 1], [b, cb] = st[k], t = (v - a) / (b - a); return ca.map((c, j) => Math.round(c + (cb[j] - c) * t)); } return st[st.length - 1][1]; };
const RM = z => ["interpolate", ["linear"], ["get", "m"], 2, 3 * z, 4, 5 * z, 5, 8 * z, 6, 13 * z, 7, 20 * z, 8, 30 * z];
const radius = z => ["interpolate", ["linear"], ["zoom"], 3, RM(.8 * z), 9, RM(1.5 * z)];
const warnaDalam = ["match", ["get", "d"], 0, KELAS_DALAM[0][1], 1, KELAS_DALAM[1][1], 2, KELAS_DALAM[2][1], WARNA_DALAM_NA];
const jamPendek = iso => jamWIB(iso).replace(" WIB", "");

/* ---------- keadaan ---------- */
const S = {gempa: [], dibuat: null, rentang: bacaLokal("gempa-rentang", 72), jalur: [], urut: {k: "n", turun: true}, hal: 0, geo: null, nama: {}, atr: {}, tersedia: false, pilih: null};
const namaProv = k => k === "-" ? "Perairan" : S.nama[k] ?? k;
const dalamRentang = () => { const t0 = Date.now() - S.rentang * 36e5; return S.gempa.filter(g => g.t >= t0); };
function agregat(daftar) { const o = {};
  for (const g of daftar) { const k = g.prov || "-", a = o[k] ||= {n: 0, m: 0, mmi: 0}; a.n++; a.m = Math.max(a.m, g.m); if (g.mmi_maks) a.mmi++; } return o; }

const Peta = {
  async init() {
    document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="../inti/peta/lapis.css"><link rel="stylesheet" href="../inti/peta/legenda.css">');
    PI = await import("../inti/peta/lapis.js").catch(() => null);
    if (PI) Object.assign(PI.IKON, IKON_GEMPA);
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
  /* lapisan masuk tepat di bawah lapisan berikutnya menurut URUT, dan di bawah label peta dasar */
  taruh(lap) { const j = URUT.indexOf(lap.id), atas = URUT.slice(j + 1).find(id => peta.getLayer(id));
    peta.addLayer(lap, atas || (["satelit", "kekerapan", "prov-fill", "prov-line", "bahaya"].includes(lap.id) ? this.bawahLabel() : undefined)); },
  vis: on => ({visibility: on ? "visible" : "none"}),
  pasang() {
    if (peta.getSource("prov")) return;
    if (S.geo) { peta.addSource("prov", {type: "geojson", data: S.geo, promoteId: "kode"});
      const n = ["coalesce", ["feature-state", "n"], 0], hov = ["boolean", ["feature-state", "hover"], false];
      this.taruh({id: "prov-fill", type: "fill", source: "prov", layout: this.vis(this.lihat("wilayah")),
        paint: {"fill-color": ["step", n, WARNA_WIL[0], BATAS_WIL[0], WARNA_WIL[1], BATAS_WIL[1], WARNA_WIL[2], BATAS_WIL[2], WARNA_WIL[3], BATAS_WIL[3], WARNA_WIL[4]], "fill-opacity": ["case", hov, .8, .55]}});
      this.taruh({id: "prov-line", type: "line", source: "prov", paint: {"line-color": gelap() ? "#c9d6ea" : "#0b2545", "line-width": ["case", hov, 2, 1], "line-opacity": .5}}); }
    peta.addSource("gempa", {type: "geojson", data: this.geoGempa()});
    this.taruh({id: "gempa", type: "circle", source: "gempa", layout: {...this.vis(this.lihat("gempa")), "circle-sort-key": ["-", 0, ["get", "m"]]},
      paint: {"circle-radius": radius(1), "circle-color": warnaDalam, "circle-opacity": ["interpolate", ["linear"], ["get", "u"], 0, .95, 24, .85, 72, .6, 168, .4],
        "circle-stroke-color": "#fff", "circle-stroke-width": 1, "circle-stroke-opacity": .9}});
    peta.addSource("pilih", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    this.taruh({id: "pilih", type: "circle", source: "pilih", paint: {"circle-radius": 24, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": gelap() ? "#fff" : "#0b2545", "circle-stroke-width": 3}});
    this.aturWilayah(); this.interaksi();
    /* lapisan lain malas: dimuat saat dinyalakan, bukan saat buka halaman */
    ["lempeng", "sesar", "riwayat", "kekerapan", "bahaya", "satelit"].forEach(k => this.lihat(k) && nanti(() => this.pasangLapis(k)));
    renderLegenda(); },
  geoGempa() { const kini = Date.now(), t0 = kini - S.rentang * 36e5;
    return {type: "FeatureCollection", features: S.gempa.map((g, i) => g.t < t0 ? null : ({type: "Feature", geometry: {type: "Point", coordinates: [g.lon, g.lat]},
      properties: {i, m: g.m, d: kelasDalam(g.dalam), u: (kini - g.t) / 36e5}})).filter(Boolean)}; },
  async pasangLapis(k) {
    if (!peta?.getSource("gempa") || peta.getLayer(k)) return;
    const vis = this.vis(this.lihat(k));
    try {
      if (k === "satelit") { peta.addSource("satelit", {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Esri"});
        this.taruh({id: "satelit", type: "raster", source: "satelit", layout: vis}); }
      else if (k === "lempeng") { const d = S.lempeng ||= await muatJSON("data/batas_lempeng.geojson"); if (peta.getLayer(k)) return;
        peta.addSource("lempeng", {type: "geojson", data: d});
        this.taruh({id: "lempeng", type: "line", source: "lempeng", layout: vis, paint: {"line-color": "#b5523b", "line-width": 1.6, "line-dasharray": [3, 2], "line-opacity": .85}}); }
      else if (k === "sesar") { const d = S.sesar ||= await muatJSON("data/sesar.geojson"); if (peta.getLayer(k)) return;
        S.atr.sesar = d.atribusi; peta.addSource("sesar", {type: "geojson", data: d});
        this.taruh({id: "sesar", type: "line", source: "sesar", layout: vis, paint: {"line-color": "#8f1d2b", "line-width": 1.4, "line-opacity": .9}}); renderLegenda(); }
      else if (k === "riwayat") { const d = S.riwayat ||= await muatJSON("data/riwayat_m5.json"); if (peta.getLayer(k)) return;
        peta.addSource("riwayat", {type: "geojson", data: {type: "FeatureCollection", features: d.baris.map((b, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [b[2], b[1]]}, properties: {i, m: b[4], d: kelasDalam(b[3])}}))}});
        this.taruh({id: "riwayat", type: "circle", source: "riwayat", layout: {...vis, "circle-sort-key": ["-", 0, ["get", "m"]]}, paint: {"circle-radius": radius(.6), "circle-color": warnaDalam, "circle-opacity": .5}}); }
      else if (k === "kekerapan") { const d = S.grid ||= await muatJSON("data/riwayat_grid.json"); if (peta.getLayer(k)) return;
        const cv = document.createElement("canvas"); cv.width = d.w; cv.height = d.h; const ctx = cv.getContext("2d"), img = ctx.createImageData(d.w, d.h);
        for (const [x, y, , r] of d.sel_data) img.data.set(ramp(RAMP_GRID, r), (y * d.w + x) * 4);
        ctx.putImageData(img, 0, 0); const x1 = d.x0 + d.w * d.sel, y0 = d.y1 - d.h * d.sel;
        peta.addSource("kekerapan", {type: "image", url: cv.toDataURL(), coordinates: [[d.x0, d.y1], [x1, d.y1], [x1, y0], [d.x0, y0]]});
        this.taruh({id: "kekerapan", type: "raster", source: "kekerapan", layout: vis, paint: {"raster-opacity": .85, "raster-resampling": "linear", "raster-fade-duration": 0}}); }
      else if (k === "bahaya") { const [d, pusat] = S.bahaya ||= await Promise.all([muatJSON("data/inarisk_gempa.json"), muatJSON("../banjir/data/pusat_kec.json")]); if (peta.getLayer(k)) return;
        const fit = []; for (const [kk, v] of Object.entries(d.nilai)) { const c = pusat[kk]; if (c) fit.push({type: "Feature", geometry: {type: "Point", coordinates: [c[1], c[0]]}, properties: {v, kk}}); }
        peta.addSource("bahaya", {type: "geojson", data: {type: "FeatureCollection", features: fit}});
        this.taruh({id: "bahaya", type: "circle", source: "bahaya", layout: {...vis, "circle-sort-key": ["get", "v"]},
          paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.6, 6, 3.5, 9, 8], "circle-opacity": .8, "circle-color": ["interpolate", ["linear"], ["get", "v"], ...RAMP_BAHAYA.flat()]}}); }
    } catch (e) { toast("Lapisan belum bisa dimuat"); const i = document.querySelector(`#lapis input[data-l="${k}"]`); if (i) i.checked = false; }
    renderLegenda(); },
  segarkan() {
    if (!peta?.getSource("gempa")) return;
    peta.getSource("gempa").setData(this.geoGempa()); this.aturWilayah(); },
  /* warna provinsi menurut jumlah gempa di jendela waktu; hover/klik ada di interaksi() */
  aturWilayah() { if (!S.geo || !peta.getSource("prov")) return; const ag = agregat(dalamRentang());
    S.geo.features.forEach(f => peta.setFeatureState({source: "prov", id: f.properties.kode}, {n: ag[f.properties.kode]?.n || 0})); },
  terbang(k) { if (k === "-" || !S.geo) { const d = dalamRentang().filter(g => !g.prov); if (!d.length) return; const b = kotak(d.map(g => ({geometry: {coordinates: [g.lon, g.lat]}}))); return peta.fitBounds(b, {padding: kiriPad(), duration: 700, maxZoom: 7}); }
    const f = S.geo.features.find(f => f.properties.kode === k); if (f) peta.fitBounds(kotak([f]), {padding: kiriPad(), duration: 700, maxZoom: 8}); },
  pilih(g) { S.pilih = g.id; peta.getSource("pilih")?.setData({type: "FeatureCollection", features: [{type: "Feature", geometry: {type: "Point", coordinates: [g.lon, g.lat]}, properties: {}}]});
    peta.flyTo({center: [g.lon, g.lat], zoom: Math.max(peta.getZoom(), 6.5), duration: 700}); Laci.buka(g); },
  kartuGempa(g) { const ts = g.tsunami?.kode >= 1 ? TSUNAMI[g.tsunami.kode] : null, kd = kelasDalam(g.dalam);
    return PI.kartuTip({judul: esc(wilayahPendek(g.wilayah)), stat: [
      ...(ts ? [["peringatan", ts[0], "BMKG", ts[1], true]] : []),
      ["gempa", mTulis(g.m), "kekuatan", warnaM(g.m), g.m >= 6], ["dalam", g.dalam == null ? "–" : fmt(g.dalam) + " km", "kedalaman", kd < 0 ? WARNA_DALAM_NA : KELAS_DALAM[kd][1]],
      ["jam", jamPendek(g.waktu), "WIB", "#3f7fb8"], ...(g.mmi_maks ? [["getar", ROMAWI[g.mmi_maks], "dirasakan", "#c9503a"]] : [])]}); },
  kartuRiwayat(b) { const kd = kelasDalam(b[3]); return PI.kartuTip({judul: "Gempa " + b[0].slice(0, 4), stat: [["gempa", mTulis(b[4]), "kekuatan", warnaM(b[4]), b[4] >= 7],
    ["dalam", b[3] ? fmt(b[3]) + " km" : "–", "kedalaman", kd < 0 ? WARNA_DALAM_NA : KELAS_DALAM[kd][1]]]}); },
  kartuProv(k) { const a = agregat(dalamRentang())[k]; return PI.kartuTip({judul: esc(namaProv(k)), stat: a ? [["gempa", a.n, "gempa", "#d4572f"], ["getar", mTulis(a.m), "terbesar", warnaM(a.m), a.m >= 6]] : [["gempa", 0, "gempa", "#9aa8b8"]]}); },
  interaksi() {
    if (this._ia) return; this._ia = true;
    let hov = null, diTitik = 0; const tip = () => PI?.sembunyiTip(), kursor = v => peta.getCanvas().style.cursor = v;
    const titik = (id, kartu) => { peta.on("mousemove", id, e => { diTitik = id; kursor("pointer"); PI?.tampilTip(kartu(e.features[0].properties.i), e.originalEvent); });
      peta.on("mouseleave", id, () => { diTitik = 0; kursor(""); tip(); }); };
    titik("gempa", i => this.kartuGempa(S.gempa[i])); titik("riwayat", i => this.kartuRiwayat(S.riwayat.baris[i]));
    peta.on("mousemove", "prov-fill", e => { kursor("pointer"); const f = e.features[0];
      if (hov !== f.id) { if (hov !== null) peta.setFeatureState({source: "prov", id: hov}, {hover: false}); hov = f.id; peta.setFeatureState({source: "prov", id: hov}, {hover: true}); }
      if (!diTitik && PI) PI.tampilTip(this.kartuProv(f.properties.kode), e.originalEvent); });
    peta.on("mouseleave", "prov-fill", () => { kursor(""); if (hov !== null) peta.setFeatureState({source: "prov", id: hov}, {hover: false}); hov = null; if (!diTitik) tip(); });
    /* zoom keluar sendiri: tingkat wilayah ikut naik tanpa menerbangkan peta */
    peta.on("zoomend", e => { if (!e.originalEvent || !S.jalur.length || peta.getZoom() >= 4.8) return; S.jalur = []; nanti(() => { renderCrumb(); renderDaftar(); }); });
    /* klik berprioritas: gempa, lalu provinsi */
    peta.on("click", e => {
      const gm = peta.queryRenderedFeatures(e.point, {layers: ["gempa"]});
      if (gm.length) return this.pilih(S.gempa[gm[0].properties.i]);
      if (peta.getLayer("riwayat") && peta.queryRenderedFeatures(e.point, {layers: ["riwayat"]}).length) return;
      const w = peta.getLayer("prov-fill") && peta.queryRenderedFeatures(e.point, {layers: ["prov-fill"]});
      if (w?.length) turun(w[0].properties.kode); });
  },
};
function turun(k) { S.jalur = [k]; S.hal = 0; S.urut = {k: "t", turun: true}; Peta.terbang(k); renderCrumb(); renderDaftar(); }
function naik(n) { S.jalur = S.jalur.slice(0, n); S.hal = 0; S.urut = {k: "n", turun: true}; if (!n) peta.fitBounds(BB_ID, {padding: kiriPad(), duration: 700}); renderCrumb(); renderDaftar(); }

/* ---------- panel ---------- */
function renderCrumb() {
  const j = S.jalur, b = [`<button data-n="0">Indonesia</button>`];
  if (j[0]) b.push(`<button data-n="1">${esc(namaProv(j[0]))}</button>`);
  $("#crumb").innerHTML = b.join(""); }
$("#crumb").addEventListener("click", e => { const b = e.target.closest("button"); if (b) naik(+b.dataset.n); });
function renderDaftar() {
  const box = $("#rows"), d = dalamRentang(), j = S.jalur, u = S.urut, arah = u.turun ? -1 : 1;
  if (!d.length) { box.innerHTML = `<div class="kosong">${S.tersedia ? `Tidak ada gempa ${S.rentang * 36e5 > Date.now() - ARSIP ? "sejak " + KG.tgl(ARSIP) : "dalam " + (S.rentang === 168 ? "7 hari" : S.rentang + " jam") + " terakhir"}.` : "Data gempa belum tersedia."}</div>`; return; }
  const kepala = (g, kol) => `<div class="tb kepala" style="grid-template-columns:${g}"><span></span>${kol.map(([k, n, c]) => `<span class="${[c, k && u.k === k ? "urut" : ""].join(" ").trim()}"${k ? ` data-s="${k}"` : ""}${k && u.k === k ? ` data-arah="${u.turun ? 0 : 1}"` : ""}>${n}</span>`).join("")}</div>`;
  if (!j.length) {
    const G = "20px minmax(0,2fr) minmax(46px,.7fr) minmax(72px,1fr) minmax(64px,1fr)", ag = agregat(d);
    const baris = Object.entries(ag).map(([k, a]) => ({k, nama: namaProv(k), ...a})).sort((a, b) => arah * ((u.k === "nama" ? a.nama.localeCompare(b.nama) : a[u.k] - b[u.k]) || b.n - a.n || a.nama.localeCompare(b.nama)));
    box.innerHTML = kepala(G, [["nama", "Provinsi"], ["n", "Gempa", "n"], ["mmi", "Dirasakan", "n"], ["m", "Terbesar"]]) +
      baris.map((p, i) => `<button class="tb" data-k="${esc(p.k)}" style="grid-template-columns:${G}"><span class="rk">${i + 1}</span><span class="kom"><b>${esc(p.nama)}</b></span><span class="n"><b>${fmt(p.n)}</b></span><span class="n">${p.mmi ? fmt(p.mmi) : "–"}</span><span>${pilM(p.m)}</span></button>`).join("");
    return; }
  const G = "20px minmax(0,2.4fr) minmax(70px,.9fr) minmax(80px,1.2fr)", per = 20;
  const isi = d.filter(g => (g.prov || "-") === j[0]).sort((a, b) => arah * (u.k === "m" ? a.m - b.m : a.t - b.t) || b.t - a.t);
  S.hal = Math.min(S.hal, Math.max(0, Math.ceil(isi.length / per) - 1));
  box.innerHTML = kepala(G, [[null, "Lokasi"], ["m", "Kekuatan"], ["t", "Waktu"]]) +
    isi.slice(S.hal * per, S.hal * per + per).map((g, i) => `<button class="tb" data-g="${esc(g.id)}" style="grid-template-columns:${G}"><span class="rk">${S.hal * per + i + 1}</span><span class="kom">${esc(wilayahPendek(g.wilayah))}</span><span>${pilM(g.m)}</span><span class="n">${esc(jamPendek(g.waktu))}</span></button>`).join("") +
    paginasi(S.hal, isi.length, per, "gempa"); }
$("#rows").addEventListener("click", e => {
  const h = e.target.closest("[data-h]"); if (h) { S.hal = +h.dataset.h; return renderDaftar(); }
  const s = e.target.closest("[data-s]"); if (s) { const k = s.dataset.s; S.urut = {k, turun: S.urut.k === k ? !S.urut.turun : k !== "nama"}; S.hal = 0; return renderDaftar(); }
  const p = e.target.closest("[data-k]"); if (p) return turun(p.dataset.k);
  const g = e.target.closest("[data-g]"); if (g) { const q = S.gempa.find(x => x.id === g.dataset.g); if (q) Peta.pilih(q); } });
$("#handle").onclick = () => $("#panel").classList.toggle("min");

/* ---------- jendela waktu ---------- */
const RENTANG = [[24, "24 jam"], [72, "72 jam"], [168, "7 hari"]];
function renderRentang() { $("#rentang").innerHTML = RENTANG.map(([v, n]) => `<button data-v="${v}" aria-pressed="${S.rentang === v}">${n}</button>`).join(""); }
$("#rentang").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.rentang = +b.dataset.v; simpanLokal("gempa-rentang", S.rentang); S.hal = 0;
  $("#rentang").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); nanti(() => { Peta.segarkan(); renderDaftar(); renderPita(); renderLegenda(); }); });

/* ---------- pita status tsunami resmi BMKG: hanya bila BMKG menyatakan berpotensi tsunami (kode 1 sampai 3) dalam 24 jam; tanpa pernyataan = tidak tampil, tidak ditafsir aman ---------- */
function renderPita() {
  const el = $("#pita"), t0 = Date.now() - 24 * 36e5, a = S.gempa.filter(g => g.t >= t0 && g.tsunami?.kode >= 1).sort((x, y) => y.tsunami.kode - x.tsunami.kode || y.t - x.t)[0];
  el.hidden = !a; if (!a) return;
  const [nama, w] = TSUNAMI[a.tsunami.kode];
  el.style.setProperty("--w", w);
  el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/></svg>
    <b>BMKG: ${nama}</b><span>${mTulis(a.m)} · ${esc(wilayahPendek(a.wilayah))} · ${esc(waktuGempa(a.waktu))}</span>`;
  el.onclick = () => Peta.pilih(a); }

/* ---------- Overlay ---------- */
const setLapis = (k, on) => { const i = document.querySelector(`#lapis input[data-l="${k}"]`); if (i && i.checked !== on) { i.checked = on; i.dispatchEvent(new Event("change", {bubbles: true})); } };
$("#lapis").addEventListener("change", e => { const i = e.target.closest("input"); if (!i || !peta) return; const k = i.dataset.l;
  Promise.resolve(["lempeng", "sesar", "riwayat", "kekerapan", "bahaya", "satelit"].includes(k) ? Peta.pasangLapis(k) : 0).then(() => { (LAPIS_PETA[k] || []).forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", i.checked ? "visible" : "none")); renderLegenda(); }); });
$("#lapisBtn").onclick = () => $("#lapis").classList.toggle("buka");
$("#lapisLipat").onclick = e => { const b = e.currentTarget, det = document.querySelectorAll("#lapis details"), tutup = [...det].some(d => d.open); det.forEach(d => d.open = !tutup); b.classList.toggle("tutup", tutup); };

/* ---------- legenda: hanya lapisan yang sedang terlihat ---------- */
const SUMBER = {gempa: ["Gempa terkini", "BMKG, USGS", "Katalog gempa hidup: BMKG (data.bmkg.go.id) dan USGS (earthquake.usgs.gov), domain publik."], riwayat: ["Gempa sejak 1900", "USGS", () => S.atr.usgs],
  kekerapan: ["Kekerapan", "USGS", () => S.atr.usgs], bahaya: ["Indeks bahaya", "InaRISK, BNPB", () => S.atr.bahaya], lempeng: ["Batas lempeng", "PB2002, Bird (2003), ODC-By", () => S.atr.lempeng],
  sesar: ["Sesar aktif", "GEM, EOS, CC BY-SA", () => S.atr.sesar]};
function renderLegenda() {
  const T = k => Peta.lihat(k);
  const dia = {3: 8, 5: 14, 7: 26}, skala = (st, f) => `<div class="legscale">${st.map(v => `<i style="background:${f(v)}"></i>`).join("")}</div>`;
  const sumber = ["gempa", "riwayat", "kekerapan", "bahaya", "lempeng", "sesar"].filter(T).map(k => { const [n, s, p] = SUMBER[k], tip = typeof p === "function" ? p() : p;
    return `<span${tip ? ` data-tip="${esc("<b>" + n + "</b><br>" + tip)}"` : ""}>${n}: ${esc(s)}</span>`; }).join("");
  $("#legenda").innerHTML = `<details ${legBuka ? "open" : ""} id="legDet"><summary class="lbl">Legenda <span>▾</span></summary><div class="lg-isi">
    ${T("gempa") || T("riwayat") ? `<div class="lbl">Kekuatan</div><div class="leg" style="margin:4px 0 8px">${[3, 5, 7].map(m => `<span style="display:flex;align-items:center"><span class="bulat-slot"><i class="sw dot bulat" style="width:${dia[m]}px;height:${dia[m]}px;margin:0;background:#9aa8b8"></i></span>${mTulis(m)}</span>`).join("")}</div>
      <div class="lbl">Kedalaman</div><div class="leg" style="margin:4px 0 8px">${KELAS_DALAM.map(([n, w, r]) => `<span><i class="sw dot" style="background:${w}"></i>${n}, ${r}</span>`).join("")}</div>` : ""}
    ${T("wilayah") ? `<div class="lbl">Gempa per provinsi</div>${skala(WARNA_WIL.slice(1), c => c)}<div class="legnum">${BATAS_WIL.map((v, i) => `<span>${v}${i === BATAS_WIL.length - 1 ? "+" : ""}</span>`).join("")}</div>` : ""}
    ${T("kekerapan") ? `<div class="lbl">Kejadian per tahun</div>${skala(RAMP_GRID.map(r => r[0]), v => `rgb(${ramp(RAMP_GRID, v).slice(0, 3).join(",")})`)}<div class="legnum">${RAMP_GRID.map(r => `<span>${fmt(r[0])}</span>`).join("")}</div>` : ""}
    ${T("bahaya") ? `<div class="lbl">Indeks bahaya gempa</div>${skala(RAMP_BAHAYA.map(r => r[0]), v => RAMP_BAHAYA.find(r => r[0] === v)[1])}<div class="legnum">${RAMP_BAHAYA.map(r => `<span>${fmt(r[0])}</span>`).join("")}</div>` : ""}
    ${T("lempeng") ? `<div class="lbl">Batas lempeng</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw" style="height:0;border-top:3px dashed #b5523b;border-radius:0;background:none;vertical-align:3px"></i>pertemuan lempeng</span></div>` : ""}
    ${T("sesar") ? `<div class="lbl">Sesar aktif</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw" style="height:0;border-top:3px solid #8f1d2b;border-radius:0;background:none;vertical-align:3px"></i>sesar aktif</span></div>` : ""}
    <div class="lbl">Sumber</div><div class="leg lg-sumber">${sumber}</div></div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: o => legBuka = o}); }
