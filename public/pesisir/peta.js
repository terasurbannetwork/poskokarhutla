"use strict";
/* Peta Gelombang Pasang & Abrasi (MapLibre): garis pantai dan transek abrasi, titik rob, stasiun pasang surut, gelombang model, peringatan gelombang BMKG.
   Ubin Overlay, kartu hover, dan legenda dok dari ../inti/peta/ (dipakai bersama banjir dan cuaca). Klik membuka laci; isi berat lewat nanti(). */
let peta = null, PI = null, LG = null, legBuka = innerWidth > 900;
const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];
const kiriPad = () => { if (innerWidth <= 900) return {top: 60, bottom: innerHeight * .45, left: 16, right: 16};
  const r = s => document.querySelector(s)?.getBoundingClientRect(), pn = r(".panel"), tl = r(".tools"), lg = r("#dok"), pt = r("#p-peta");
  return {top: 56, left: (pn?.width || 440) + 30, right: (tl?.width || 280) + 30, bottom: Math.min(160, Math.max(30, pt && lg ? pt.bottom - lg.top + 16 : 150))}; };
const UBIN = {abrasi: ["#7a2a1b", "#e58a45", "ombak"], rob: ["#16405c", "#4fa3c4", "sungai"], pasut: ["#1d3b6b", "#6aa7e3", "debit"], ombak: ["#1d4c59", "#7ccbd0", "angin"], bmkg: ["#7a3b0b", "#f2b544", "peringatan"]};
const UBIN_PENDEK = {abrasi: "Abrasi", rob: "Rob", pasut: "Pasang", ombak: "Ombak", bmkg: "BMKG"};
const MODE_LAPIS = {abrasi: ["abrasi"], rob: ["rob"], pasang: ["pasut"], ombak: ["ombak", "bmkg"]};
const FC = f => ({type: "FeatureCollection", features: f});
const PT = (lon, lat, p) => ({type: "Feature", geometry: {type: "Point", coordinates: [lon, lat]}, properties: p});
const jarakKm = (a, b) => Math.hypot((a[0] - b[0]) * 111.3 * Math.cos(a[1] * Math.PI / 180), (a[1] - b[1]) * 111.3);

const Peta = {
  async init() {
    document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="../inti/peta/lapis.css"><link rel="stylesheet" href="../inti/peta/legenda.css">');
    PI = await import("../inti/peta/lapis.js").catch(() => null);
    const T = tersedia(), ada = {abrasi: T.abrasi, rob: T.rob, pasut: T.pasang, ombak: !!S.gel, bmkg: !!(S.glb.length && S.geo)};
    document.querySelectorAll("#lapis label").forEach(l => { const k = l.querySelector("input").dataset.l; if (!ada[k]) l.remove(); });
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
    this.mode(); const A = S.abr?.situs; peta.fitBounds(A && S.mode === "abrasi" ? this.kotakSitus() : BB_ID, {padding: kiriPad(), duration: 0}); },
  kotakSitus() { const b = S.abr.situs.map(s => s.bbox); return [[Math.min(...b.map(x => x[0])), Math.min(...b.map(x => x[1]))], [Math.max(...b.map(x => x[2])), Math.max(...b.map(x => x[3]))]]; },
  /* lapis ombak aktif hanya bila ada titik untuk hari terpilih */
  adaGel() { return !!S.gel && Pesisir.gelHari(S.gel, S.hari).length > 0; },
  lihat(k) { const i = document.querySelector(`#lapis input[data-l="${k}"]`); return i ? i.checked && (k !== "ombak" || this.adaGel()) : false; },
  bawahLabel() { const l = peta.getStyle().layers.find(l => l.type === "symbol"); return l && l.id; },
  /* data per sumber; dipanggil ulang saat hari berganti */
  geoRob() { const d = S.rob && Pesisir.idxHari(S.rob.hari, S.hari); return FC(d >= 0 ? S.rob.titik.map((t, i) => PT(t.lon, t.lat, {i, lv: t.lv[d] == null ? -1 : t.lv[d]})) : []); },
  geoPas() { return FC((S.pas?.stasiun || []).flatMap((s, i) => { const h = s.hari?.find(x => x[0] === S.hari); return h ? [PT(s.lon, s.lat, {i, k: kelasPasut(s, h[1])})] : []; })); },
  geoGel() { return FC(S.gel ? Pesisir.gelHari(S.gel, S.hari).map(x => PT(x.lon, x.lat, {i: S.gel.titik.indexOf(x.r), hs: x.hs, w: Pesisir.kelasGel(x.hs)[2]})) : []); },
  geoProv() { const lv = {}; S.glb.forEach(o => lv[o.prov] = o.lv);
    return S.geo ? FC(S.geo.features.filter(f => lv[f.properties.kode]).map(f => ({...f, properties: {kode: f.properties.kode, lv: lv[f.properties.kode]}}))) : FC([]); },
  /* titik = garis pantai terakhir tiap transek; garis tipis = transek dari garis dasar ke garis pantai terakhir (panjangnya = jarak garis pantai dari garis dasar) */
  geoAbrasi() { const T = S.abr?.transek || [], akhir = t => t.garis_terakhir || [t.lat, t.lon];
    return [FC(T.map((t, i) => PT(akhir(t)[1], akhir(t)[0], {i, k: t.kelas || "tidak nyata", y: t.keyakinan === "rendah" || !t.kelas ? .55 : 1}))),
      FC(T.filter(t => t.garis_terakhir && jarakKm([t.lon, t.lat], [t.garis_terakhir[1], t.garis_terakhir[0]]) > .03).map(t => ({type: "Feature", geometry: {type: "LineString", coordinates: [[t.lon, t.lat], [t.garis_terakhir[1], t.garis_terakhir[0]]]}, properties: {}})))]; },
  pasang() {
    if (peta.getSource("rob")) return;
    const vis = k => ({visibility: this.lihat(k) ? "visible" : "none"}), sb = this.bawahLabel(), [pAbr, gAbr] = this.geoAbrasi();
    const bulat = (id, src, warna, r, k) => peta.addLayer({id, type: "circle", source: src, layout: vis(k), paint: {"circle-radius": r, "circle-color": warna, "circle-stroke-color": "#fff", "circle-stroke-width": 1.2, "circle-opacity": ["coalesce", ["get", "y"], .92]}});
    peta.addSource("prov", {type: "geojson", data: this.geoProv()});
    peta.addLayer({id: "bmkg", type: "fill", source: "prov", layout: vis("bmkg"), paint: {"fill-color": ["match", ["get", "lv"], 1, "#3f7fb8", 2, "#5b4fb0", "#2a1f6b"], "fill-opacity": .38}}, sb);
    peta.addLayer({id: "bmkg-garis", type: "line", source: "prov", layout: vis("bmkg"), paint: {"line-color": ["match", ["get", "lv"], 1, "#3f7fb8", 2, "#5b4fb0", "#2a1f6b"], "line-width": 1.4}}, sb);
    peta.addSource("gar", {type: "geojson", data: gAbr}); peta.addSource("abr", {type: "geojson", data: pAbr});
    peta.addLayer({id: "garis", type: "line", source: "gar", layout: {...vis("abrasi"), "line-cap": "round"}, paint: {"line-color": "#1f4e79", "line-width": ["interpolate", ["linear"], ["zoom"], 8, .8, 13, 1.6], "line-opacity": .6}});
    bulat("abrasi", "abr", ["match", ["get", "k"], "abrasi", ABR.abrasi[1], "akresi", ABR.akresi[1], ABR["tidak nyata"][1]], ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9], "abrasi");
    peta.addSource("rob", {type: "geojson", data: this.geoRob()});
    bulat("rob", "rob", ["match", ["get", "lv"], 1, TINGKAT[1][1], 2, TINGKAT[2][1], 3, TINGKAT[3][1], 0, TINGKAT[0][1], "#cfd4da"], ["interpolate", ["linear"], ["zoom"], 4, 4, 10, 8], "rob");
    peta.addSource("pasut", {type: "geojson", data: this.geoPas()});
    bulat("pasut", "pasut", ["match", ["get", "k"], 0, PASUT[0][1], 1, PASUT[1][1], PASUT[2][1]], ["interpolate", ["linear"], ["zoom"], 4, 3.5, 10, 7], "pasut");
    peta.addSource("gel", {type: "geojson", data: this.geoGel()});
    bulat("ombak", "gel", ["get", "w"], ["interpolate", ["linear"], ["zoom"], 4, 3, 10, 6], "ombak");
    peta.addSource("pilih", {type: "geojson", data: FC([])});
    peta.addLayer({id: "pilih", type: "circle", source: "pilih", paint: {"circle-radius": 13, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#0b2545", "circle-stroke-width": 3}});
    this.pasangAksi(); renderLegenda(); },
  segarkan() { if (!peta?.getSource("rob")) return;
    peta.getSource("rob").setData(this.geoRob()); peta.getSource("pasut").setData(this.geoPas()); peta.getSource("gel").setData(this.geoGel()); renderLegenda(); },
  /* kartu hover satu baris berikon dari ../inti/peta/lapis.js */
  kartu(L, f) { const p = f.properties, i = +p.i;
    if (L === "abrasi") { const t = S.abr.transek[i], k = ABR[t.kelas || "tidak nyata"]; return PI.kartuTip({judul: `<span translate="no">${esc(t.desa || t.id)}</span>`, sub: `<small>${k[0]}</small>`, stat: [["ombak", t.laju == null ? "–" : m1(t.laju) + " m/th", "laju garis pantai", k[1], t.kelas === "abrasi"], ["perisai", t.keyakinan || "–", "keyakinan", "#3f7fb8"]]}); }
    if (L === "rob") { const t = S.rob.titik[i], d = Pesisir.idxHari(S.rob.hari, S.hari); return PI.kartuTip({judul: `<span translate="no">${esc(t.kec)}</span>`, sub: `<small>${TK(+p.lv)[0]}</small>`, stat: [["sungai", m1(t.h[d]) + " m", "muka laut maks", TK(+p.lv)[1], p.lv >= 2], ["rasio", m1(t.p95) + (t.p95 == null ? "" : " m"), "ambang Waspada", "#3f7fb8"]]}); }
    if (L === "pasut") { const s = S.pas.stasiun[i], h = s.hari.find(x => x[0] === S.hari); return PI.kartuTip({judul: `<span translate="no">${esc(s.nama)}</span>`, sub: `<small>${PASUT[p.k][0]}</small>`, stat: [["debit", fmt(h[1]) + " cm", "pasang tertinggi", PASUT[p.k][1], p.k === 0], ["mata", h[2] + " WIB", "puncak", "#3f7fb8"]]}); }
    if (L === "ombak") { const r = S.gel.titik[i]; return PI.kartuTip({judul: `<span translate="no">${esc(r[3] || namaProv(r[2]))}</span>`, sub: `<small>${Pesisir.kelasGel(+p.hs)[1]}</small>`, stat: [["ombak", m1(+p.hs) + " m", "gelombang model", Pesisir.kelasGel(+p.hs)[2], +p.hs >= 2.5]]}); }
    const o = S.glb.find(x => x.prov === p.kode); return PI.kartuTip({judul: `<span translate="no">${esc(namaProv(p.kode))}</span>`, stat: [["peringatan", ["Tinggi", "Sangat tinggi", "Ekstrem"][o.lv - 1], "gelombang BMKG", "#3f7fb8", o.lv >= 2], ["ombak", o.total, "perairan", "#3f7fb8"]]}); },
  /* satu query untuk semua lapis yang tampil (polygon BMKG ikut hanya bila dicentang); prioritas mengikuti urutan */
  atas(e) { const urut = ["abrasi", "rob", "pasut", "ombak", "bmkg"].filter(L => this.lihat(L) && peta.getLayer(L)); if (!urut.length) return null;
    const F = peta.queryRenderedFeatures(e.point, {layers: urut}); for (const L of urut) { const f = F.find(x => x.layer.id === L); if (f) return [L, f]; } return null; },
  pasangAksi() {
    if (this._aksi) return; this._aksi = true;
    /* satu pemrosesan per frame; fitur yang sama dengan sebelumnya memakai kartu tersimpan (tooltip hanya digeser) */
    let tunggu = null, kunci = null, html = null;
    peta.on("mousemove", e => { const dulu = tunggu; tunggu = e; if (dulu) return;
      requestAnimationFrame(() => { const ev = tunggu; tunggu = null; const a = this.atas(ev); peta.getCanvas().style.cursor = a ? "pointer" : "";
        if (!a || !PI) { kunci = html = null; return PI?.sembunyiTip(); }
        const k = a[0] + ":" + (a[1].properties.i ?? a[1].properties.kode) + ":" + S.hari; if (k !== kunci) { kunci = k; html = this.kartu(...a); }
        PI.tampilTip(html, ev.originalEvent); }); });
    peta.on("mouseout", () => { tunggu = null; kunci = html = null; PI?.sembunyiTip(); });
    peta.on("click", e => { const a = this.atas(e); if (!a) return; const [L, f] = a, p = f.properties, i = +p.i;
      PI?.sembunyiTip(); this.tandai(e.lngLat.lng, e.lngLat.lat);
      nanti(() => { if (L === "abrasi") Rinci.trans(i); else if (L === "rob") Rinci.rob(i); else if (L === "pasut") Rinci.pasut(i); else if (L === "ombak") Rinci.ombak(i); else Rinci.glb(p.kode); }); }); },
  tandai(lon, lat) { peta.getSource("pilih")?.setData(FC([PT(lon, lat, {})])); },
  lepas() { peta?.getSource("pilih")?.setData(FC([])); },
  terbang(lat, lon, z) { this.tandai(lon, lat); peta.flyTo({center: [lon, lat], zoom: Math.max(peta.getZoom(), z), padding: kiriPad(), duration: 700}); },
  kotak(b) { peta.fitBounds([[b[0], b[1]], [b[2], b[3]]], {padding: kiriPad(), duration: 700, maxZoom: 13}); },
  /* mode panel menentukan kelompok lapis yang tampil */
  mode() { const on = MODE_LAPIS[S.mode] || []; document.querySelectorAll("#lapis input[data-l]").forEach(i => i.checked = on.includes(i.dataset.l)); this.terapkan(); },
  terapkan() { if (!peta?.getSource("rob")) return nanti(renderLegenda);
    const m = {abrasi: ["garis", "abrasi"], rob: ["rob"], pasut: ["pasut"], ombak: ["ombak"], bmkg: ["bmkg", "bmkg-garis"]};
    for (const [k, ids] of Object.entries(m)) ids.forEach(id => peta.getLayer(id) && peta.setLayoutProperty(id, "visibility", this.lihat(k) ? "visible" : "none")); nanti(renderLegenda); }
};

/* ================================================================ legenda dok: hanya yang tergambar */
function renderLegenda() {
  const T = k => Peta.lihat(k), sw = (w, n, dot = 1) => `<span><i class="sw${dot ? " dot" : ""}" style="background:${w}"></i>${n}</span>`, tg = tglSgk(S.hari), gbl = (j, h) => `<div class="lbl">${j}</div><div class="leg" style="margin:4px 0 8px">${h}</div>`;
  const psAda = new Set((S.pas?.stasiun || []).flatMap(s => { const h = s.hari?.find(x => x[0] === S.hari); return h ? [kelasPasut(s, h[1])] : []; })), rob = S.rob && Pesisir.robHari(S.rob, S.hari), kl = S.gel ? Pesisir.gelHari(S.gel, S.hari) : [];
  $("#legenda").innerHTML = `<details ${legBuka ? "open" : ""} id="legDet"><summary class="lbl">Legenda <span>▾</span></summary><div class="lg-isi">
    ${T("abrasi") && S.abr ? gbl("Laju garis pantai (transek tiap 1 km)", Object.values(ABR).map(([n, w]) => sw(w, n)).join("") + `<span><i class="sw" style="background:#1f4e79;height:3px;vertical-align:3px"></i>Transek: garis dasar ke garis pantai terakhir</span>`) + `<div class="leg"><span>Titik = garis pantai terakhir; pudar = keyakinan rendah</span></div>` : ""}
    ${T("rob") && rob ? gbl(`Status rob ${tg}`, TINGKAT.map(([n, w], k) => rob.cacah[k] ? sw(w, n) : "").join("") + (rob.L.length > rob.ada.length ? sw("#cfd4da", "Tanpa ambang") : "")) : T("rob") ? gbl("Status rob", `<span>Data tidak mencakup ${tg}</span>`) : ""}
    ${T("pasut") && psAda.size ? gbl(`Pasang tertinggi ${tg}`, PASUT.map(([n, w], k) => psAda.has(k) ? sw(w, n) : "").join("")) : ""}
    ${T("ombak") && kl.length ? gbl(`Gelombang model ${tg}`, Pesisir.KELAS_GEL.filter(c => kl.some(x => Pesisir.kelasGel(x.hs) === c)).map(c => sw(c[2], c[1] + (c[0] ? ` (${String(c[0]).replace(".", ",")} m atau lebih)` : ""))).join("")) : ""}
    ${T("bmkg") && S.glb.length ? gbl("Peringatan gelombang BMKG", [["Tinggi", "#3f7fb8", 1], ["Sangat tinggi", "#5b4fb0", 2], ["Ekstrem", "#2a1f6b", 3]].filter(c => S.glb.some(o => o.lv === c[2])).map(c => sw(c[1], c[0], 0)).join("")) : ""}
    </div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: o => legBuka = o}); }
$("#lapis").addEventListener("change", e => { if (e.target.closest("input[data-l]") && peta) Peta.terapkan(); });
