"use strict";
/* Peta gunung api: segitiga berwarna level PVMBG, cincin radius rekomendasi, daftar kiri, legenda dok bawah, pop-up detail. */
let peta = null, PI = null, LG = null, legBuka = innerWidth > 900;
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];
const UBIN = {gunung: ["#7a2e1d", "#e58a45", "peringatan"], radius: ["#7a3b0b", "#f2b544", "perisai"], nama: ["#1f3a5f", "#6d8fc0", "mata"], satelit: ["#13324d", "#4d8a5e", "satelit"],
  abu: ["#4b4038", "#a39382", "angin"], bandara: ["#1f3a5f", "#6d8fc0", "pesawat"], krb: ["#7a2e1d", "#e8743b", "krb"], rute: ["#14532d", "#4ade80", "rute"], sekolah: ["#1e3a8a", "#60a5fa", "sekolah"], tambang: ["#5b3a1a", "#c08a4f", "tambang"]};
const UBIN_PENDEK = {gunung: "Gunung", radius: "Radius", nama: "Nama", satelit: "Satelit", abu: "Abu", bandara: "Bandara", krb: "KRB", rute: "Evakuasi", sekolah: "Sekolah", tambang: "Tambang"};
/* ikon garis tambahan untuk ubin Overlay (IKON inti/peta/lapis.js tak punya pesawat dll.; objeknya bisa ditambah dari sini) */
const IKON_BARU = {pesawat: '<path d="M2 14l8-2.5V5.5a2 2 0 0 1 4 0v6.5l8 2.5v2.5l-8-2v4l2.5 1.5V22L12 21l-4.5 1v-1.5L10 19v-4l-8 2z"/>', krb: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  rute: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h5a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h5"/>', sekolah: '<path d="M3 10l9-5 9 5-9 5z"/><path d="M7 12v5c3 2 7 2 10 0v-5"/>', tambang: '<path d="M4 20 9 11l3 5 3-4 5 8z"/>'};
const KEL = ["abu", "bandara", "krb", "rute", "sekolah", "tambang"];   /* lapisan baru, dimuat malas: sumbernya dari berkas turunan, bukan status */
S.jamAbu = 24;
const kiriPad = () => { if (innerWidth <= 900) return {top: 60, bottom: innerHeight * .45, left: 16, right: 16};
  const r = s => document.querySelector(s)?.getBoundingClientRect(), pn = r(".panel"), tl = r(".tools"), lg = r("#dok"), pt = r("#p-peta");
  return {top: 56, left: (pn?.width || 440) + 30, right: (tl?.width || 280) + 30, bottom: Math.max(30, pt && lg ? pt.bottom - lg.top + 16 : 150)}; };

/* lingkaran radius sebagai poligon (64 titik), tanpa pustaka */
function cincin(lat, lon, rKm, n = 64) {
  const dLat = rKm / 111.2, dLon = rKm / (111.2 * Math.cos(lat * Math.PI / 180)), k = [];
  for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI; k.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]); }
  return k; }
const urut = (a, b) => b.level - a.level || a.nama.localeCompare(b.nama);
const letusanDari = nama => (S.st.letusan || []).filter(e => e.gunung === nama);
const saring = () => { const q = S.q.trim().toLowerCase(); return S.st.gunung.filter(g => (!S.level || g.level === S.level) && (!q || (g.nama + " " + g.prov).toLowerCase().includes(q))).sort(urut); };

const Peta = {
  async init() {
    document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="../inti/peta/lapis.css"><link rel="stylesheet" href="../inti/peta/legenda.css">');
    PI = await import("../inti/peta/lapis.js").catch(() => null);
    if (PI?.IKON) Object.assign(PI.IKON, IKON_BARU);
    PI?.ubinLapis($("#lapis"), {katalog: UBIN, pendek: UBIN_PENDEK});
    LG = await import("../inti/peta/legenda.js").catch(() => null);
    const lebar = () => { const w = $(".panel")?.getBoundingClientRect().width, t = $(".tools")?.getBoundingClientRect().width, p = $("#p-peta");
      if (w) p.style.setProperty("--lp", w + "px"); if (t) p.style.setProperty("--tw", t + "px"); };
    const ro = new ResizeObserver(lebar); ro.observe($(".panel")); ro.observe($(".tools")); lebar();
    peta = new maplibregl.Map({container: "peta", style: DASAR(), center: [118, -2.4], zoom: 4.1, minZoom: 3, maxZoom: 15, attributionControl: {compact: true}, dragRotate: false, pitchWithRotate: false});
    peta.touchZoomRotate.disableRotation();
    import("../inti/peta/konteks.js").then(m => m.pasang(peta, "gunungapi", {lewati: ["sekolah", "fasilitas"]})).catch(() => 0);   /* lapisan konteks (penduduk, sekolah, faskes, jalan) dari registry, inti/peta/konteks.js */
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    peta.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-right");
    peta.on("style.load", () => this.pasang());
    await new Promise(r => peta.isStyleLoaded() ? r() : peta.once("style.load", r));
    /* pandangan awal desktop disamakan dengan karhutla (panel 440, tools 280, dok bawah ~163); dok gunung api lebih pendek, jadi angkanya dipaku, bukan diukur */
    peta.fitBounds(BB_ID, {padding: innerWidth <= 900 ? kiriPad() : {top: 56, left: 470, right: 310, bottom: 163}, duration: 0}); },
  lihat(k) { const i = document.querySelector(`#lapis input[data-l="${k}"]`); return i ? i.checked : false; },
  geoTitik() { return {type: "FeatureCollection", features: saring().map(g => ({type: "Feature", geometry: {type: "Point", coordinates: [g.lon, g.lat]}, properties: {nama: g.nama, lv: g.level}}))}; },
  geoRadius() { return {type: "FeatureCollection", features: saring().filter(g => g.radius_km).map(g => ({type: "Feature", geometry: {type: "Polygon", coordinates: [cincin(g.lat, g.lon, g.radius_km)]}, properties: {nama: g.nama, lv: g.level}}))}; },
  pasang() {
    if (peta.getSource("titik")) return;
    const vis = k => ({visibility: this.lihat(k) ? "visible" : "none"}), warna = ["match", ["get", "lv"], 4, WARNA_LV[4], 3, WARNA_LV[3], 2, WARNA_LV[2], WARNA_LV[1]];
    const sebelum = peta.getStyle().layers.find(l => l.type === "symbol")?.id;
    peta.addSource("radius", {type: "geojson", data: this.geoRadius()});
    peta.addLayer({id: "radius-isi", type: "fill", source: "radius", layout: vis("radius"), paint: {"fill-color": warna, "fill-opacity": .14}}, sebelum);
    peta.addLayer({id: "radius-garis", type: "line", source: "radius", layout: vis("radius"), paint: {"line-color": warna, "line-width": 2, "line-dasharray": [2, 1.5]}}, sebelum);
    peta.addSource("titik", {type: "geojson", data: this.geoTitik()});
    const ukuran = ["interpolate", ["linear"], ["zoom"], 3, ["match", ["get", "lv"], 1, 9, 12], 9, ["match", ["get", "lv"], 1, 16, 24]];
    peta.addLayer({id: "titik", type: "symbol", source: "titik", layout: {...vis("gunung"), "text-field": "▲", "text-font": ["Noto Sans Bold"], "text-size": ukuran, "text-allow-overlap": true, "symbol-sort-key": ["get", "lv"]},
      paint: {"text-color": warna, "text-halo-color": gelap() ? "#0b1220" : "#fff", "text-halo-width": 1.6}});
    peta.addLayer({id: "nama", type: "symbol", source: "titik", minzoom: 5, layout: {...vis("nama"), "text-field": ["get", "nama"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1.3], "text-anchor": "top", "text-optional": true},
      paint: {"text-color": gelap() ? "#e6edf7" : "#1b2740", "text-halo-color": gelap() ? "#0b1220" : "#fff", "text-halo-width": 1.4}});
    if (this.lihat("satelit")) this.satelit();
    KEL.forEach(k => { if (this.lihat(k)) nanti(() => Lapis.tambah(k)); });
    this.interaksi(); renderLegenda(); },
  satelit() {
    if (peta.getSource("satelit")) return;
    peta.addSource("satelit", {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Esri"});
    peta.addLayer({id: "satelit", type: "raster", source: "satelit", layout: {visibility: this.lihat("satelit") ? "visible" : "none"}}, peta.getLayer("radius-isi") ? "radius-isi" : undefined); },
  segarkan() { peta?.getSource("titik")?.setData(this.geoTitik()); peta?.getSource("radius")?.setData(this.geoRadius()); renderDaftar(); },
  kartu(g) { const stat = [["perisai", `Level ${LEVEL[g.level][0]}`, LEVEL[g.level][1], WARNA_LV[g.level], g.level >= 3]];
    if (g.radius_km) stat.push(["peringatan", fmt(g.radius_km) + " km", "radius rekomendasi", WARNA_LV[g.level]]);
    return PI.kartuTip({judul: esc(g.nama), sub: `<small>${esc(g.prov)}</small>`, stat}); },
  interaksi() {
    if (this._ia) return; this._ia = true;
    const cari = nama => S.st.gunung.find(g => g.nama === nama);
    peta.on("mousemove", "titik", sekaliFrame(e => { peta.getCanvas().style.cursor = "pointer"; const g = cari(e.features[0].properties.nama); g && PI?.tampilTip(this.kartu(g), e.originalEvent); }));
    peta.on("mouseleave", "titik", () => { peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); });
    peta.on("click", "titik", e => { const g = cari(e.features[0].properties.nama); g && Detail.buka(g); });
    /* sentuh: tanpa hover, ketuk langsung membuka detail (di atas) */
    $("#lapisBtn").onclick = () => $("#lapis").classList.toggle("buka");   /* tombol Overlay di layar sempit tak punya penangan (ditemukan 19 Okt 2026) */
    document.querySelector("#lapis").addEventListener("change", e => { const k = e.target.dataset.l; if (!k) return;
      if (k === "satelit") this.satelit();
      const ids = {gunung: ["titik"], radius: ["radius-isi", "radius-garis"], nama: ["nama"], satelit: ["satelit"]}[k] || [];
      ids.forEach(id => peta.getLayer(id) && peta.setLayoutProperty(id, "visibility", e.target.checked ? "visible" : "none"));
      if (KEL.includes(k)) nanti(() => Lapis.nyala(k, e.target.checked)); else renderLegenda(); });
  },
  terbang(g) { peta.flyTo({center: [g.lon, g.lat], zoom: Math.max(peta.getZoom(), g.radius_km ? 9 : 8), duration: 700}); },
};

/* ---------- lapisan paparan dan abu (dimuat malas) ---------- */
const JAM_ABU = [6, 12, 24, 48, 72];
const W_ABU = "#8a7a6b", W_SEK = "#3b82f6", W_FAS = "#e11d6b", W_TAMB = "#8a5a2b", W_RUTE = "#2fb36a", W_KENA = "#d64545", W_BAND = "#6d7b91";
const LAPIS_ID = {abu: ["abu-isi", "abu-garis"], bandara: ["bandara-titik", "bandara-l"], krb: ["krb-isi", "krb-garis"], rute: ["rute-garis"], sekolah: ["sekolah-titik"], tambang: ["tambang-titik"]};
const URUT_LAPIS = ["krb", "abu", "rute", "tambang", "sekolah", "bandara"];   /* dasar -> atas; semuanya di bawah segitiga gunung */
/* hover: kartu tip dihitung sekali per frame, bukan tiap gerak tetikus */
const sekaliFrame = fn => { let raf = 0, ev; return e => { ev = e; if (raf) return; raf = requestAnimationFrame(() => { raf = 0; fn(ev); }); }; };
const FC = f => ({type: "FeatureCollection", features: f});
const dalamZona = x => x.zona && WARNA_ZONA[x.zona];
const Lapis = {
  p: {}, ia: {}, info: null,
  sudah: k => !!peta?.getSource(k),
  /* jejak abu berambang pada jam S.jamAbu: poligon kosong = di bawah ambang penerbangan 2 mg/m3, BUKAN tanpa abu */
  abuGeo(a) {
    const f = [];
    for (const ga of a.gunung) { const j = ga.jejak.find(x => x.jam === S.jamAbu); if (!jejakOk(j)) continue;
      const r = j.poligon.slice(); const [x0, y0] = r[0], [x1, y1] = r.at(-1); if (x0 !== x1 || y0 !== y1) r.push(r[0]);
      f.push({type: "Feature", geometry: {type: "Polygon", coordinates: [r]}, properties: {id: ga.id, nama: ga.nama, jam: j.jam, km: j.jangkau_km, arah: j.arah_deg}}); }
    const mk = f.reduce((m, x) => !m || x.properties.km > m.km ? x.properties : m, null);
    this.info = {n: f.length, maks: mk}; return FC(f); },
  async geo(k) {
    if (k === "abu") { const a = await Data.abu(); return a && this.abuGeo(a); }
    if (k === "bandara") { const [b, a] = await Promise.all([Data.bandara(), Data.abu()]); if (!b?.length) return null;
      const kena = new Map((a?.bandara_terdampak || []).map(x => [x.icao, x]));
      return FC(b.map(x => { const t = kena.get(x.icao); return {type: "Feature", geometry: {type: "Point", coordinates: [x.lon, x.lat]}, properties: {icao: x.icao, iata: x.iata || x.icao, nama: x.nama, kena: t ? 1 : 0, jam: t?.jam_tiba ?? null, gn: t?.gunung || ""}}; })); }
    if (k === "krb" || k === "rute") { const [G, P] = await Promise.all([Data.geo(), k === "rute" ? Data.pap() : null]); if (!G) return null; const f = [];
      /* gunung yang rutenya hanya dari desa KRB I (tak ada desa III/II): rute cadangan */
      const cadangan = new Set((P?.gunung || []).filter(g => g.evakuasi?.length && !g.evakuasi.some(e => ["III", "II"].includes(e.zona_desa))).map(g => g.id));
      for (const [id, v] of Object.entries(G)) {
        if (k === "krb") for (const z of ["I", "II", "III"]) { if (v.zona?.[z]) f.push({type: "Feature", geometry: v.zona[z], properties: {id, zona: z}}); }
        else if (v.rute?.length) f.push({type: "Feature", geometry: {type: "MultiLineString", coordinates: v.rute}, properties: {id, cad: cadangan.has(id) ? 1 : 0}}); }
      return f.length ? FC(f) : null; }
    const P = await Data.pap(); if (!P) return null; const f = [];
    for (const g of P.gunung) {
      if (k === "sekolah") { for (const [jn, L] of [["sekolah", g.sekolah], ["faskes", g.faskes]]) for (const x of L || []) if (dalamZona(x)) f.push({type: "Feature", geometry: {type: "Point", coordinates: [x.lon, x.lat]}, properties: {nama: x.nama, jenis: jn, zona: x.zona, km: x.km, gn: g.nama}}); }
      else for (const x of g.tambang || []) if (dalamZona(x)) f.push({type: "Feature", geometry: {type: "Point", coordinates: [x.lon, x.lat]}, properties: {nama: x.nama, kom: x.komoditas || "", zona: x.zona, gn: g.nama}}); }
    return f.length ? FC(f) : null; },
  /* layer pertama yang sudah ada di atas k dalam urutan tumpukan; kalau belum ada, tepat di bawah segitiga gunung */
  batas(k) { for (const n of URUT_LAPIS.slice(URUT_LAPIS.indexOf(k) + 1)) { const id = LAPIS_ID[n].find(i => peta.getLayer(i)); if (id) return id; } return peta.getLayer("titik") ? "titik" : undefined; },
  tambah(k) {
    if (this.sudah(k)) return Promise.resolve(true);
    return this.p[k] ||= (async () => { try {
      const gj = await this.geo(k); if (!gj || !peta) return false; if (this.sudah(k)) return true;
      const vis = {visibility: Peta.lihat(k) ? "visible" : "none"}, b = this.batas(k), gelapIni = gelap();
      peta.addSource(k, {type: "geojson", data: gj});
      const L = {
        abu: [{id: "abu-isi", type: "fill", paint: {"fill-color": W_ABU, "fill-opacity": .38}}, {id: "abu-garis", type: "line", paint: {"line-color": gelapIni ? "#d6c7b5" : "#5c4f43", "line-width": 1.6, "line-dasharray": [3, 2]}}],
        krb: [{id: "krb-isi", type: "fill", paint: {"fill-color": ["match", ["get", "zona"], "III", WARNA_ZONA.III, "II", WARNA_ZONA.II, WARNA_ZONA.I], "fill-opacity": ["match", ["get", "zona"], "III", .34, "II", .26, .18]}},
          {id: "krb-garis", type: "line", paint: {"line-color": ["match", ["get", "zona"], "III", WARNA_ZONA.III, "II", WARNA_ZONA.II, WARNA_ZONA.I], "line-width": .8, "line-opacity": .8}}],
        rute: [{id: "rute-garis", type: "line", layout: {"line-cap": "round", "line-join": "round"}, paint: {"line-color": W_RUTE, "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1, 12, 3], "line-opacity": .9}}],
        sekolah: [{id: "sekolah-titik", type: "circle", minzoom: 7, paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 2.5, 13, 5], "circle-color": ["match", ["get", "jenis"], "faskes", W_FAS, W_SEK], "circle-stroke-color": "#fff", "circle-stroke-width": 1}}],
        tambang: [{id: "tambang-titik", type: "circle", minzoom: 7, paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 3, 13, 6], "circle-color": W_TAMB, "circle-stroke-color": "#fff", "circle-stroke-width": 1.2}}],
        bandara: [{id: "bandara-titik", type: "circle", paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["case", ["==", ["get", "kena"], 1], 7, 2.5], 9, ["case", ["==", ["get", "kena"], 1], 8, 5]], "circle-color": ["case", ["==", ["get", "kena"], 1], W_KENA, W_BAND], "circle-stroke-color": "#fff", "circle-stroke-width": 1.4}},
          {id: "bandara-l", type: "symbol", layout: {"text-field": ["step", ["zoom"], ["case", ["==", ["get", "kena"], 1], ["get", "iata"], ""], 7, ["get", "iata"]], "text-font": ["Noto Sans Bold"], "text-size": 10.5, "text-offset": [0, 1.2], "text-anchor": "top", "text-optional": true},
            paint: {"text-color": gelapIni ? "#e6edf7" : "#1b2740", "text-halo-color": gelapIni ? "#0b1220" : "#fff", "text-halo-width": 1.3}}],
      }[k];
      L.forEach(l => peta.addLayer({source: k, ...l, layout: {...vis, ...(l.layout || {})}}, b));
      this.pasangIa(k); if (k === "abu" || k === "bandara") renderLegenda(); return true;
    } catch (e) { console.error("lapisan " + k, e); return false; } finally { delete this.p[k]; } })(); },
  async nyala(k, on) { if (on && !this.sudah(k)) await this.tambah(k);
    LAPIS_ID[k].forEach(id => peta.getLayer(id) && peta.setLayoutProperty(id, "visibility", on ? "visible" : "none")); renderLegenda(); },
  async setJam(j) { S.jamAbu = j; const a = await Data.abu(); if (a) peta.getSource("abu")?.setData(this.abuGeo(a)); renderLegenda(); },
  /* kartu hover satu baris berikon + klik; didaftarkan sekali per lapisan (pendengar terikat id lapisan dan ikut bertahan walau gaya diganti) */
  pasangIa(k) {
    if (this.ia[k]) return; this.ia[k] = 1;
    const T = {
      "abu-isi": p => ({judul: `<span translate="no">${esc(p.nama)}</span>`, sub: `<small>Skenario jam ke-${fmt(p.jam)}, bukan prakiraan</small>`, stat: [["angin", km5(p.km) + " km", "jangkauan"], ["mata", arahMata(p.arah), "ke arah"]]}),
      "bandara-titik": p => ({judul: `<span translate="no">${esc(p.nama)}</span>`, sub: `<small>${esc(p.iata)} · ${esc(p.icao)}</small>`, stat: p.kena ? [["bel", "jam ke-" + fmt(p.jam), "abu tiba (skenario)", W_KENA, true]] : []}),
      "sekolah-titik": p => ({judul: `<span translate="no">${esc(p.nama)}</span>`, sub: `<small>${p.jenis === "faskes" ? "Fasilitas kesehatan" : "Sekolah"} · KRB ${esc(p.zona)} · ${esc(p.gn)}</small>`, stat: p.km != null ? [["peringatan", fmt(p.km) + " km", "dari kawah"]] : []}),
      "rute-garis": p => ({judul: "Rute evakuasi", sub: `<small>${p.cad ? "dari desa KRB I terdekat (cadangan)" : "dari desa KRB III dan II"}</small>`, stat: []}),
      "tambang-titik": p => ({judul: `<span translate="no">${esc(p.nama)}</span>`, sub: `<small>${esc(p.kom)} · KRB ${esc(p.zona)} · ${esc(p.gn)}</small>`, stat: []}),
    };
    for (const [id, f] of Object.entries(T)) { if (!LAPIS_ID[k].includes(id)) continue;
      peta.on("mousemove", id, sekaliFrame(e => { const pr = e.features?.[0]?.properties; if (!pr) return; peta.getCanvas().style.cursor = "pointer"; PI?.tampilTip(PI.kartuTip(f(pr)), e.originalEvent); }));
      peta.on("mouseleave", id, () => { peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); }); }
    if (k === "abu") peta.on("click", "abu-isi", e => { const g = S.st.gunung.find(x => idGn(x.nama) === e.features?.[0]?.properties?.id); g && Detail.buka(g); });
  },
};

/* ---------- daftar kiri ---------- */
function renderLevelSeg() {
  const op = [[0, "Semua"], [4, "Awas"], [3, "Siaga"], [2, "Waspada"], [1, "Normal"]].filter(([l]) => !l || S.n[l]);
  $("#levelSeg").innerHTML = op.map(([l, n]) => `<button data-l="${l}" aria-pressed="${S.level === l}">${n}${l ? ` <b class="num">${S.n[l]}</b>` : ""}</button>`).join(""); }
/* tabel standar panel kiri (kepala gelap, kolom bisa diurut): sama dengan daftar provinsi karhutla dan wilayah kekeringan */
const KOL = {nm: g => g.nama, pv: g => g.prov, rd: g => g.radius_km ?? -1, lv: g => g.level * 1e3 + (g.radius_km || 0)};
const urutDaftar = L => { const {k, d} = S.urut, f = KOL[k]; return [...L].sort((a, b) => { const x = f(a), y = f(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * d || a.nama.localeCompare(b.nama); }); };
function renderDaftar() {
  const L = urutDaftar(saring()), gr = "grid-template-columns:20px minmax(0,1fr) minmax(0,.8fr) 44px 92px", u = k => S.urut.k === k ? " urut" : "";
  const kepala = `<div class="tb kepala" style="${gr}"><span></span><span data-s="nm" class="${u("nm")}">Gunung</span><span data-s="pv" class="${u("pv")}">Provinsi</span><span class="n ${u("rd")}" data-s="rd">Radius</span><span data-s="lv" class="${u("lv")}" style="text-align:right">Status</span></div>`;
  $("#rows").innerHTML = L.length ? kepala + L.map((g, i) => `<button class="tb" role="listitem" data-n="${esc(g.nama)}" style="${gr}"><span class="rk">${i + 1}</span><span style="font-weight:600" translate="no">${esc(g.nama)}</span>
    <span style="justify-self:stretch;text-align:left!important;color:var(--ink2)" title="${esc(g.prov)}">${esc(g.prov)}</span><span class="n">${g.radius_km ? fmt(g.radius_km) + " km" : "–"}</span><span style="text-align:right">${pilLv(g.level, true)}</span></button>`).join("")
    : `<div class="kosong">Tidak ada gunung yang cocok.</div>`; }
$("#rows").addEventListener("click", e => {
  const kol = e.target.closest(".kepala span[data-s]"); if (kol) { const k = kol.dataset.s; S.urut = {k, d: S.urut.k === k ? -S.urut.d : k === "lv" ? -1 : 1}; return nanti(renderDaftar); }
  const b = e.target.closest("[data-n]"); if (!b) return; const g = S.st.gunung.find(x => x.nama === b.dataset.n); if (g) { Peta.terbang(g); Detail.buka(g); } });
$("#levelSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.level = +b.dataset.l; renderLevelSeg(); nanti(() => Peta.segarkan()); });
$("#cari").addEventListener("input", e => { S.q = e.target.value; nanti(() => Peta.segarkan()); });

/* ---------- legenda dok ---------- */
const sw = (w, bulat) => `<i class="sw" style="background:${w}${bulat ? ";border-radius:50%" : ""}"></i>`;
function legendaBaru() {
  const L = k => Peta.lihat(k); let h = "";
  if (L("abu")) { const f = Lapis.info, j = S.jamAbu;
    const ket = !f ? "memuat…" : f.n ? `${fmt(f.n)} gunung: awan di atas ambang menjangkau sampai ${km5(f.maks.km)} km ke arah ${arahMata(f.maks.arah)}` : `Di bawah ambang penerbangan 2 mg/m³ pada jam ke-${fmt(j)}, bukan berarti tanpa abu`;
    h += `<div class="lbl">Jejak abu 2 mg/m³ <span class="pl" style="--w:${W_ABU}">${TXT_SKEN}</span></div>
      <div class="seg penuh" role="group" aria-label="Jam sejak erupsi" id="jamSeg" style="box-shadow:none;margin:4px 0">${JAM_ABU.map(x => `<button data-jam="${x}" aria-pressed="${x === j}">${x} jam</button>`).join("")}</div>
      <div class="leg" style="margin:4px 0 8px"><span>${sw(W_ABU)}${ket}</span></div>`; }
  if (L("bandara")) h += `<div class="lbl">Bandara</div><div class="leg" style="margin:4px 0 8px"><span>${sw(W_KENA, 1)}di jalur abu</span><span>${sw(W_BAND, 1)}lainnya</span></div>`;
  if (L("krb")) h += `<div class="lbl">Zona KRB PVMBG</div><div class="leg" style="margin:4px 0 8px">${["III", "II", "I"].map(z => `<span>${sw(WARNA_ZONA[z])}KRB ${z}</span>`).join("")}</div>`;
  const lain = [L("rute") && `<span>${sw(W_RUTE)}rute evakuasi</span>`, L("sekolah") && `<span>${sw(W_SEK, 1)}sekolah</span><span>${sw(W_FAS, 1)}faskes</span>`, L("tambang") && `<span>${sw(W_TAMB, 1)}izin tambang</span>`].filter(Boolean);
  if (lain.length) h += `<div class="lbl">Paparan</div><div class="leg" style="margin:4px 0 8px">${lain.join("")}</div>`;
  return h; }
function renderLegenda() {
  const ada = l => S.n[l] > 0;
  $("#legenda").innerHTML = `<details ${legBuka ? "open" : ""} id="legDet"><summary class="lbl">Legenda <span>▾</span></summary><div class="lg-isi">
    ${Peta.lihat("gunung") ? `<div class="lbl">Level resmi PVMBG</div><div class="leg" style="margin:4px 0 8px">${[4, 3, 2, 1].filter(ada).map(l => `<span><b style="color:${WARNA_LV[l]}">▲</b> Level ${LEVEL[l][0]} ${LEVEL[l][1]} · ${S.n[l]}</span>`).join("")}</div>` : ""}
    ${Peta.lihat("radius") ? `<div class="lbl">Radius rekomendasi</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw ring"></i>lingkaran putus-putus</span></div>` : ""}${legendaBaru()}</div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: o => legBuka = o}); }
$("#legenda").addEventListener("click", e => { const b = e.target.closest("[data-jam]"); if (!b || +b.dataset.jam === S.jamAbu) return;
  b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); nanti(() => Lapis.setJam(+b.dataset.jam)); });

/* ---------- pop-up detail (laci gunung) ---------- */
const tglPendek = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {...WIB, day: "numeric", month: "short", year: "numeric"});
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const lipat = (judul, isi) => `<details class="lipat" open><summary>${judul}</summary><div class="isi">${isi}</div></details>`;
const Detail = {
  buka(g) {
    const ev = letusanDari(g.nama).slice(0, 3), kv = (v, l) => !v ? "" : `<div><b>${v}</b><span>${l}</span></div>`;
    const kot = [kv(g.radius_km && fmt(g.radius_km) + " km", "radius"), kv(g.sektor_km && fmt(g.sektor_km) + " km", "jarak sektor"), kv(g.penduduk_radius > 0 ? jiwaTxt(g.penduduk_radius) : null, "jiwa dalam radius (perkiraan WorldPop 1 km)"), kv(g.tinggi > 0 && fmt(g.tinggi) + " m", "tinggi puncak")].join("");
    $("#dlg").innerHTML = `<div class="dh"><div><h3 id="dlgJudul">${esc(g.nama)}</h3><p>${esc(g.prov)}</p><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${pilLv(g.level)}<span id="dlgKode"></span></div></div><button type="button" aria-label="Tutup" data-tutup>×</button></div>
      <div class="db">${kot ? `<div class="kv gn-kv">${kot}</div>` : ""}
      ${g.rekomendasi ? `<details class="lipat" open><summary>Rekomendasi PVMBG</summary><div class="isi"><p class="rek-teks" translate="no" lang="id">${esc(g.rekomendasi)}</p><p class="rek-sumber">${g.periode ? `<span translate="no" lang="id">${esc(g.periode)}</span> · ` : ""}MAGMA Indonesia</p></div></details>` : ""}
      ${this.sKontak(g.kontak)}
      ${ev.length ? `<details class="lipat" open><summary>Erupsi terbaru</summary><div class="isi"><ul class="ev">${ev.map(x => `<li><b>${tglJam(x.waktu)}</b>${x.tinggi_m ? ` <span class="pl" style="--w:#b5523b">kolom abu ${fmt(x.tinggi_m)} m</span>` : ""}<br><span translate="no" lang="id">${esc(x.ket)}</span></li>`).join("")}</ul></div></details>` : ""}
      <div id="dlgLanjut"></div>
      <div class="dk"><button class="btn" type="button" data-sim><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg> Simulasi</button>
      <a class="btn sec" href="${escUrl(g.laporan)}" target="_blank" rel="noopener noreferrer">Laporan lengkap di MAGMA</a>
      <button class="btn sec" type="button" data-bagi aria-label="Bagikan" title="Bagikan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.7 7.4-4.3M8.3 13.3l7.4 4.3"/></svg></button></div></div>`;
    const d = $("#dlg"); d._g = g; d.querySelector("[data-tutup]").onclick = () => d.close();
    d.querySelector("[data-sim]").onclick = () => { d.close(); bukaTab("simulasi", true, idGn(g.nama)); };
    d.querySelector("[data-bagi]").onclick = () => Bagikan.bagi({...Bagikan.konteks("gunung", g), lainnya: () => Bagikan.buka()});
    d.onclick = e => { if (e.target === d) d.close(); };
    d.onclose = () => { if (location.pathname.startsWith("/gunungapi/k/")) history.replaceState(null, "", "/gunungapi/peta"); };   /* tautan kejadian hanya selama laci terbuka */
    if (!d.open) d.showModal();
    this.kode(g); this.lanjut(g);
  },
  /* kode kejadian V (pil); hanya gunung Waspada ke atas punya kode. Bila laci dibuka dari tautan /gunungapi/k/..., tautan mengikuti gunung yang sedang terbuka */
  async kode(g) {
    const d = $("#dlg"); await Kejadian.muat(); const v = Kejadian.kode(g), el = d.querySelector("#dlgKode"); if (!el || d._g !== g) return;
    if (v) el.innerHTML = `<span class="pl" style="--w:#5b6575" translate="no">${esc(v)}</span>`;
    if (location.pathname.startsWith("/gunungapi/k/")) history.replaceState(null, "", v ? "/gunungapi/k/" + v : "/gunungapi/peta"); },
  /* kontak resmi hanya dari yang tertulis di teks rekomendasi PVMBG (magma.py urai_kontak); tak ada daftar pos terstruktur, jadi gunung tanpa teks kontak tak punya bagian ini (A18) */
  sKontak(k) {
    if (!k) return "";
    const tel = n => `<a href="tel:+62${n.replace(/\D/g, "").replace(/^0/, "")}" translate="no">${esc(n)}</a>`, li = [];
    if (k.pos) li.push(`<li><b translate="no">${esc(k.pos.nama)}</b>${k.pos.di ? ` <span translate="no">(${esc(k.pos.di)})</span>` : ""}<br>${(k.pos.telp || []).map(tel).join(", ")}</li>`);
    if (k.pusat) li.push(`<li><b>Pusat Vulkanologi dan Mitigasi Bencana Geologi</b> <span translate="no">(Bandung)</span><br>${tel(k.pusat)}</li>`);
    return li.length ? lipat("Kontak resmi", `<ul class="ev">${li.join("")}</ul><p class="rek-sumber">Sumber: teks rekomendasi PVMBG di MAGMA Indonesia</p>`) : ""; },
  /* bagian yang bergantung pada berkas turunan diisi sesudah dialog tampil (klik tidak menunggu jaringan); bagian tanpa data dibuang */
  async lanjut(g) {
    const id = idGn(g.nama), [abu, pg] = await Promise.all([Data.abu(), Data.pg(id)]), d = $("#dlg"), el = d.querySelector("#dlgLanjut"); if (!el || d._g !== g) return;
    nanti(() => { if (d._g === g) el.innerHTML = [this.sAbu(abu?.gunung?.find(x => x.id === id)), this.sPaparan(pg), this.sEvak(pg), this.sCitra(pg)].join(""); }); },
  /* satu kalimat berangka; jejak kosong = di bawah ambang penerbangan, bukan tanpa abu */
  sAbu(ga) {
    if (!ga?.jejak) return "";
    const J = ga.jejak_maks !== undefined ? ga.jejak_maks : ga.jejak.filter(jejakOk).sort((a, b) => b.jangkau_km - a.jangkau_km)[0], B = (ga.bandara || []).filter(b => b.jam_tiba != null).sort((a, b) => a.jam_tiba - b.jam_tiba);
    const awan = J ? `awan abu di atas ambang penerbangan 2 mg/m³ menjangkau sampai ${Kartu.hl(km5(J.jangkau_km) + " km")} ke arah ${arahMata(J.arah_deg)}, terjauh pada jam ke-${fmt(J.jam)}` : `abu tetap ${Kartu.hl("di bawah ambang penerbangan 2 mg/m³")} selama 72 jam, bukan berarti tanpa abu`;
    const band = B.length ? `bandara di jalurnya: ${B.slice(0, 3).map(b => `<span translate="no">${esc(b.nama)}</span> (${esc(b.iata || b.icao)}) tiba jam ke-${Kartu.hl(fmt(b.jam_tiba))}`).join(", ")}` : J ? "tidak ada bandara di jalurnya" : "";
    return lipat("Skenario abu 72 jam", `<p><span class="pl" style="--w:${W_ABU}">${TXT_SKEN}</span></p><p class="dl-kal">Bila meletus sekarang dengan kolom ${fmt(ga.kolom_m / 1000)} km di atas puncak, ${awan}${band ? "; " + band : ""}.</p>
      <p class="rek-sumber">Tinggi kolom: ${esc(ga.kolom_sumber || "asumsi")} · angin ECMWF IFS lewat Open-Meteo</p>`); },
  sPaparan(pg) {
    if (!pg) return "";
    const Z = ["III", "II", "I"].map(z => [z, pg.zona?.[z]]).filter(([, v]) => v && (v.penduduk || v.sekolah || v.faskes || v.desa || v.tambang)), C = pg.cincin || [];
    if (!Z.length && !C.some(c => c.penduduk > 0)) return "";
    const tb = Z.length ? `<div class="tw"><table><thead><tr><th>Zona</th><th class="n">Jiwa</th><th class="n">Desa</th><th class="n">Sekolah</th><th class="n">Faskes</th><th class="n">Izin tambang</th></tr></thead><tbody>${Z.map(([z, v]) => `<tr><td>${pilZona(z)}</td><td class="n">${jiwaTxt(v.penduduk)}</td><td class="n">${fmt(v.desa)}</td><td class="n">${fmt(v.sekolah)}</td><td class="n">${fmt(v.faskes)}</td><td class="n">${fmt(v.tambang)}</td></tr>`).join("")}</tbody></table></div>` : "";
    const kv = C.some(c => c.penduduk > 0) ? `<div class="kv gn-kv">${C.map(c => `<div><b>${jiwaTxt(c.penduduk)}</b><span>jiwa dalam ${fmt(c.km)} km</span></div>`).join("")}</div>` : "";
    return lipat("Paparan per zona KRB", `${tb}${kv}<p class="rek-sumber">${pg.zona_sumber && pg.zona_sumber !== "KRB PVMBG" ? `Zona: ${esc(pg.zona_sumber)} · ` : ""}Perkiraan WorldPop 1 km. Sumber: KRB PVMBG 2018, WorldPop, OpenStreetMap, WIUP ESDM</p>`); },
  sEvak(pg) {
    const r = evakRingkas(pg);
    if (!r) { const I = (pg?.evakuasi || []).filter(e => e.zona_desa === "I"); return I.length ? lipat("Evakuasi", `<p class="dl-kal">Tidak ada desa KRB III atau II yang tersambung ke jalan; rute cadangan dihitung dari ${Kartu.hl(fmt(I.length) + " desa KRB I")} terdekat dan tidak dirata-ratakan.</p>`) : ""; }
    const E = evakZona(pg), tl = evakTerlama(pg), tk = new Map();
    E.forEach(e => e.titik_kumpul && tk.set(e.titik_kumpul, (tk.get(e.titik_kumpul) || 0) + 1));
    const titik = [...tk].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
    return lipat("Evakuasi", `<p class="dl-kal">${Kartu.hl(fmt(r.n) + " desa")} di KRB III dan II punya rute evakuasi lewat jalan raya; ${r.label || "waktu tempuh arus bebas"} median ${Kartu.hl(mnt5(r.median_menit))}, terlama ${Kartu.hl(mnt5(r.maks_menit))}${tl ? ` dari <span translate="no">${esc(tl.desa)}</span>` : ""}.</p>
      <p class="rek-sumber">Tanpa antrean evakuasi massal${titik.length ? ` · Titik kumpul: <span translate="no" lang="id">${titik.map(esc).join(", ")}</span>` : ""}</p>`); },
  sCitra(pg) {
    const c = pg?.citra || [], sb = c.find(x => x.fase === "sebelum"), ss = sb && c.find(x => x.fase === "sesudah" && x.tgl > sb.tgl); if (!sb || !ss) return "";
    const fig = (x, n, w) => `<figure><img src="${esc(x.berkas)}" alt="Citra Sentinel-2 ${esc(n)} ${esc(tglPendek(x.tgl))}" loading="lazy" decoding="async"><figcaption><span class="pl" style="--w:${w}">${n}</span> ${tglPendek(x.tgl)}</figcaption></figure>`;
    return lipat("Citra satelit sebelum dan sesudah", `<div class="cit">${fig(sb, "Sebelum", "#6b7a90")}${fig(ss, "Sesudah", "#b5523b")}</div>
      <p class="rek-sumber"><span translate="no" lang="id">${esc(String(sb.keterangan || "").split(":")[0])}</span> · Sumber: Sentinel-2, Copernicus/ESA</p>`); },
};
