"use strict";
/* Peta gunung api: segitiga berwarna level PVMBG, cincin radius rekomendasi, daftar kiri, legenda dok bawah, pop-up detail. */
let peta = null, PI = null, LG = null, legBuka = innerWidth > 900;
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];
const UBIN = {gunung: ["#7a2e1d", "#e58a45", "peringatan"], radius: ["#7a3b0b", "#f2b544", "perisai"], nama: ["#1f3a5f", "#6d8fc0", "mata"], satelit: ["#13324d", "#4d8a5e", "satelit"],
  abu: ["#4b4038", "#a39382", "angin"], bandara: ["#1f3a5f", "#6d8fc0", "pesawat"], krb: ["#7a2e1d", "#e8743b", "krb"], rute: ["#14532d", "#4ade80", "rute"], sekolah: ["#1e3a8a", "#60a5fa", "sekolah"], tambang: ["#5b3a1a", "#c08a4f", "tambang"]};
const UBIN_PENDEK = {gunung: "Gunung", radius: "Radius", nama: "Nama", satelit: "Satelit", abu: "Abu", bandara: "Bandara", krb: "KRB", rute: "Evakuasi", sekolah: "Sekolah", tambang: "Tambang"};
/* ikon garis tambahan untuk ubin Overlay (IKON inti/peta/lapis.js tak punya pesawat dll.; objeknya bisa ditambah dari sini) */
const IKON_BARU = {pesawat: '<path d="M2 14l8-2.5V5.5a2 2 0 0 1 4 0v6.5l8 2.5v2.5l-8-2v4l2.5 1.5V22L12 21l-4.5 1v-1.5L10 19v-4l-8 2z"/>', krb: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  telepon: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>', rute: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h5a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h5"/>', sekolah: '<path d="M3 10l9-5 9 5-9 5z"/><path d="M7 12v5c3 2 7 2 10 0v-5"/>', tambang: '<path d="M4 20 9 11l3 5 3-4 5 8z"/>'};
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
/* tanggal pilihan (PB-79b, inti/pilih_tanggal.js lewat tanggal.js): gunung yang punya erupsi tercatat pada tanggal WIB itu (S.st.letusan). Level yang tampil tetap level terkini PVMBG. */
const tglWIB = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
const erupsiPadaTgl = iso => new Set((S.st.letusan || []).filter(e => tglWIB(Date.parse(e.waktu)) === iso).map(e => e.gunung));
const saring = () => { const q = S.q.trim().toLowerCase(), tg = S.tanggal ? erupsiPadaTgl(S.tanggal) : null;
  return S.st.gunung.filter(g => (!S.level || g.level === S.level) && (!tg || tg.has(g.nama)) && (!q || (g.nama + " " + g.prov).toLowerCase().includes(q))).sort(urut); };
/* ukuran kolom angka daftar (PB-79b, F-39; mesin segmen di inti/tabel.js, gerbang kemampuan.layar.ukuran_provinsi). Panel gunung api berisi daftar GUNUNG, bukan provinsi:
   ukuran memilih kolom angka dan urutannya dari data yang sudah dimuat (radius PVMBG, erupsi tercatat, tinggi puncak). Level tetap pernyataan resmi PVMBG, tanpa tafsir ulang. */
const KAT_UKURAN = [
  {slug: "radius", label: "Radius", kunci: "rd", judul: "Radius rekomendasi PVMBG (km)", sel: g => g.radius_km ? fmt(g.radius_km) + " km" : "–"},
  {slug: "erupsi", label: "Erupsi", kunci: "er", judul: "Erupsi tercatat pada jendela data", sel: g => S.st.letusan ? fmt(letusanDari(g.nama).length) : "–"},
  {slug: "tinggi", label: "Tinggi", kunci: "tg", judul: "Tinggi puncak (m di atas permukaan laut)", sel: g => g.tinggi ? fmt(g.tinggi) + " m" : "–"}];
const ukAktif = () => { const z = S.ukuranIzin || []; return z.length ? (z.find(u => u.slug === S.ukuran) || z[0]) : KAT_UKURAN[0]; };

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
    window.NASA?.pasang(peta, [["plkemenhut", "Tutupan lahan"]]);   /* tutupan lahan Kemenhut dari lapisan_tambahan.json, inti/peta/nasa.js */
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
    document.querySelector("#lapis").addEventListener("change", e => { const k = e.target.dataset.l; if (!k || k.startsWith("nasa_")) return;
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
      "bandara-titik": p => ({judul: `<span translate="no">${esc(p.nama)}</span>`, sub: `<small>${esc(p.iata)}, ${esc(p.icao)}</small>`, stat: p.kena ? [["bel", "jam ke-" + fmt(p.jam), "abu tiba (skenario)", W_KENA, true]] : []}),
      "sekolah-titik": p => ({judul: `<span translate="no">${esc(p.nama)}</span>`, sub: `<small>${p.jenis === "faskes" ? "Fasilitas kesehatan" : "Sekolah"}, KRB ${esc(p.zona)}, ${esc(p.gn)}</small>`, stat: p.km != null ? [["peringatan", fmt(p.km) + " km", "dari kawah"]] : []}),
      "rute-garis": p => ({judul: "Rute evakuasi", sub: `<small>${p.cad ? "dari desa KRB I terdekat (cadangan)" : "dari desa KRB III dan II"}</small>`, stat: []}),
      "tambang-titik": p => ({judul: `<span translate="no">${esc(p.nama)}</span>`, sub: `<small>${esc(p.kom)}, KRB ${esc(p.zona)}, ${esc(p.gn)}</small>`, stat: []}),
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
const KOL = {nm: g => g.nama, pv: g => g.prov, rd: g => g.radius_km ?? -1, er: g => letusanDari(g.nama).length, tg: g => g.tinggi ?? -1, lv: g => g.level * 1e3 + (g.radius_km || 0)};
const urutDaftar = L => { const {k, d} = S.urut, f = KOL[k]; return [...L].sort((a, b) => { const x = f(a), y = f(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * d || a.nama.localeCompare(b.nama); }); };
function renderDaftar() {
  const L = urutDaftar(saring()), gr = "grid-template-columns:20px minmax(0,1fr) minmax(0,.8fr) 56px 92px", u = k => S.urut.k === k ? " urut" : "", uk = ukAktif();
  const kepala = `<div class="tb kepala" style="${gr}"><span></span><span data-s="nm" class="${u("nm")}">Gunung</span><span data-s="pv" class="${u("pv")}">Provinsi</span><span class="n ${u(uk.kunci)}" data-s="${uk.kunci}" title="${esc(uk.judul)}">${uk.label}</span><span data-s="lv" class="${u("lv")}" style="text-align:right">Status</span></div>`;
  const seg = typeof segmenUkuran === "function" ? segmenUkuran(S.ukuranIzin, uk.slug) : "";   /* hanya bila registri menyalakan kemampuan.layar.ukuran_provinsi */
  const unduh = window.UnduhTabel?.tombol() || "";   /* hanya bila registri menyalakan kemampuan.layar.unduh_tabel */
  const atas = seg || unduh ? `<div class="gn-ukuran">${seg ? `<div class="gn-ukuran-seg">${seg}</div>` : ""}${unduh ? `<div class="gn-ukuran-ud">${unduh}</div>` : ""}</div>` : "";
  const ket = S.tanggal ? `<p class="gn-tglket">Gunung yang erupsi pada ${esc(+S.tanggal.slice(8) + " " + BLN[+S.tanggal.slice(5, 7) - 1] + " " + S.tanggal.slice(0, 4))}; level yang tampil adalah level terkini PVMBG.</p>` : "";
  const kosong = S.tanggal && !S.q.trim() && !S.level ? "Tidak ada erupsi tercatat pada tanggal itu." : "Tidak ada gunung yang cocok.";
  $("#rows").innerHTML = atas + ket + (L.length ? kepala + L.map((g, i) => `<button class="tb" role="listitem" data-n="${esc(g.nama)}" style="${gr}"><span class="rk">${i + 1}</span><span style="font-weight:600" translate="no">${esc(g.nama)}</span>
    <span style="justify-self:stretch;text-align:left!important;color:var(--ink2)" title="${esc(g.prov)}">${esc(g.prov)}</span><span class="n">${uk.sel(g)}</span><span style="text-align:right">${pilLv(g.level, true)}</span></button>`).join("")
    : `<div class="kosong">${kosong}</div>`); }
/* pilih ukuran (segmen): urut ikut ukuran */
function pilihUkuran(slug) { const u = KAT_UKURAN.find(x => x.slug === slug); if (!u || !(S.ukuranIzin || []).some(x => x.slug === slug)) return false;
  S.ukuran = slug; S.urut = {k: u.kunci, d: -1}; renderDaftar(); return true; }
$("#rows").addEventListener("click", e => {
  const uk = e.target.closest("[data-ukuran-k]"); if (uk) return void pilihUkuran(uk.dataset.ukuranK);
  const kol = e.target.closest(".kepala span[data-s]"); if (kol) { const k = kol.dataset.s; S.urut = {k, d: S.urut.k === k ? -S.urut.d : k === "lv" || k === "er" ? -1 : 1}; return nanti(renderDaftar); }
  const b = e.target.closest("[data-n]"); if (!b) return; const g = S.st.gunung.find(x => x.nama === b.dataset.n); if (g) { Peta.terbang(g); Detail.buka(g); } });
/* registri menyalakan segmen ukuran: daftar digambar ulang sekali bila ada ukuran yang dinyalakan */
if (typeof ukuranRegistri === "function") ukuranRegistri().then(d => { S.ukuranIzin = ukuranDiizinkan(d, "gunungapi", KAT_UKURAN); if (!S.ukuranIzin.length) return; S.ukuran = ukAktif().slug; if (S.st) renderDaftar(); });
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
    ${Peta.lihat("gunung") ? `<div class="lbl">Level resmi PVMBG</div><div class="leg" style="margin:4px 0 8px">${[4, 3, 2, 1].filter(ada).map(l => `<span><b style="color:${WARNA_LV[l]}">▲</b> Level ${LEVEL[l][0]} ${LEVEL[l][1]}, ${S.n[l]}</span>`).join("")}</div>` : ""}
    ${Peta.lihat("radius") ? `<div class="lbl">Radius rekomendasi</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw ring"></i>lingkaran putus-putus</span></div>` : ""}${legendaBaru()}</div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: o => legBuka = o}); }
$("#legenda").addEventListener("click", e => { const b = e.target.closest("[data-jam]"); if (!b || +b.dataset.jam === S.jamAbu) return;
  b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); nanti(() => Lapis.setJam(+b.dataset.jam)); });


/* ---------- laci gunung (samping, setara laci gempa) ---------- */
const tglPendek = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {...WIB, day: "numeric", month: "short", year: "numeric"});
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
/* laci rapi bersama (inti/peta/lapis.js lewat PI, gaya di inti/peta.css): tiap bagian details.lipat berkepala ikon; isinya kotak angka berikon, baris berikon,
   kartu .lc-sek berkepala .lc-h, tautan luar sebagai tombol, dan sumber kecil .lc-src sekali di akhir bagian. Cadangan polos bila modul belum termuat. */
const LC = () => PI || window.LaciInti || null;
const ikL = k => LC()?.ikonSvg?.(k) || "";
const lipat = (judul, isi, ikon = "", pil = "") => `<details class="lipat" open><summary>${ikon ? ikL(ikon) : ""}${judul}${pil}</summary><div class="isi lc-sek">${isi}</div></details>`;
const kotA = (l, v, s = "", ik = "") => LC()?.kotakAngka?.(l, v, s, ik) || `<div class="kpi kpi-t"><span class="lbl">${esc(l)}</span><b>${v}</b>${s ? `<small>${s}</small>` : ""}</div>`;
const brsL = (ikon, l, v, o) => LC()?.barisLaci?.(ikon, l, v, o) || `<div class="lc-lb"><span class="lc-lb-k">${esc(l)}</span><b>${v}</b></div>`;
const luarL = (href, teks) => LC()?.tautanLuar?.(href, teks) || `<a class="lc-luar" href="${esc(href)}" target="_blank" rel="noopener">${esc(teks)}</a>`;
const srcL = h => `<p class="fnd lc-src">${h}</p>`;
const kartuL = (ikon, judul, isi, kelas = "") => `<section class="lc-sek${kelas ? " " + kelas : ""}"><h4 class="lc-h">${ikon ? ikL(ikon) : ""}${judul}</h4>${isi}</section>`;
/* tampilan saja, data tidak diubah: "G. Ibu" jadi "Gunung Ibu"; desimal titik jadi koma (bukan pemisah ribuan tiga digit); rentang "a-b" jadi "a sampai b" (tanggal ISO dilewati) */
const BLN_PJG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const gUtuh = s => String(s).replace(/\bG\.\s+/g, "Gunung ");
const rapiAngka = s => String(s).replace(/(\d)\.(\d{1,2})(?!\d)/g, "$1,$2").replace(/\b\d{4}-\d{2}-\d{2}\b|(\d)\s*-\s*(\d)/g, (m, a, b) => a === undefined ? m : `${a} sampai ${b}`);
const rapiLap = s => String(s).replace(/(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => `${+d} ${BLN_PJG[+m - 1]} ${y}`).replace(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/, "$1.$2 sampai $3.$4");
/* teks PVMBG dengan angka dirapikan; teks asli tetap di title supaya bisa dicocokkan dengan MAGMA */
const teksPv = s => `<span translate="no" lang="id" title="${esc(s)}">${esc(rapiAngka(s))}</span>`;
/* rekomendasi PVMBG datang sebagai satu baris "1. ... 2. ..."; dipecah jadi butir bernomor. Butir larangan (radius, jarak km, larangan kegiatan) dipilih dari isinya dan langsung terlihat; sisanya dilipat dengan nomor aslinya. Tanpa butir larangan, dua butir pertama yang terlihat */
const butirRek = t => {
  const s = gUtuh(t), A = s.split(/\s*(?:^|\s)\d{1,2}\.\s+(?=[A-Z])/).map(x => x.trim()).filter(Boolean);
  if (A.length < 2) return `<p class="rek-teks" translate="no" lang="id">${esc(s)}</p>`;
  const awal = /^\s*1\.\s/.test(s) ? "" : A.shift();
  const N = A.map((x, i) => [i + 1, x]), larang = ([, x]) => /radius|\d\s*km\b|kilometer|tidak (melakukan|beraktivitas|mendekati|memasuki)|dilarang/i.test(x);
  let T = N.filter(larang); if (!T.length) T = N.slice(0, 2);
  const L = N.filter(b => !T.includes(b)), ol = B => `<ol class="gn-rek" translate="no" lang="id">${B.map(([n, x]) => `<li value="${n}">${esc(x)}</li>`).join("")}</ol>`;
  return `${awal ? `<p class="rek-teks" translate="no" lang="id">${esc(awal)}</p>` : ""}${ol(T)}${L.length ? `<details class="gn-cat"><summary>Tampilkan ${L.length} butir lainnya</summary>${ol(L)}</details>` : ""}`; };
const IK_BAGI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>';
/* ikon tombol tampilan laci: perbesar ke pop-up, dan kembali ke samping */
const IK_POP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
const IK_SAMPING = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>';
const Detail = {
  buka(g) {
    const evS = letusanDari(g.nama), ev = evS.slice(0, 3), LAP = "Laporan lengkap di MAGMA Indonesia";
    const kot = [g.radius_km ? kotA("Radius bahaya", fmt(g.radius_km) + " km", `dari kawah, rekomendasi <abbr title="Pusat Vulkanologi dan Mitigasi Bencana Geologi">PVMBG</abbr>`, "perisai") : "",
      g.sektor_km ? kotA("Jarak sektor", fmt(g.sektor_km) + " km", "perluasan di sektor tertentu", "peta") : "",
      g.penduduk_radius > 0 ? kotA("Penduduk", jiwaTxt(g.penduduk_radius), "jiwa dalam radius bahaya", "orang") : "",
      g.tinggi > 0 ? kotA("Tinggi puncak", fmt(g.tinggi) + " m", "di atas permukaan laut", "gunung") : ""].join("");
    const erupsi = ev.length ? lipat("Erupsi terbaru", `<ul class="ev">${ev.map(x => {
      const a = /amplitudo maksimum ([\d.,]+) mm/i.exec(x.ket || ""), du = /durasi ([\d.,]+) detik/i.exec(x.ket || "");
      return `<li class="gn-ev"><div class="gn-ev-k"><b>${tglJam(x.waktu)}</b>${x.tinggi_m ? `<span class="pl" style="--w:var(--bad)">Kolom abu ${fmt(x.tinggi_m)} m</span>` : ""}</div>${a || du ? `<div class="chip-wil">${a ? `<span>Amplitudo ${esc(rapiAngka(a[1]))} mm</span>` : ""}${du ? `<span>Durasi ${esc(rapiAngka(du[1]))} detik</span>` : ""}</div>` : ""}${x.ket ? `<details class="gn-cat"><summary>Teks laporan PVMBG</summary><p translate="no" lang="id">${esc(gUtuh(x.ket))}</p></details>` : ""}</li>`; }).join("")}</ul>
      ${srcL(`Sumber: MAGMA Indonesia (PVMBG). Menampilkan ${fmt(ev.length)} dari ${fmt(evS.length)} erupsi tercatat.`)}`, "api") : "";
    /* laci samping seperti gempa, cuaca, udara, dan karhutla (pemilik 23 Nov 2026: "kenapa gunung pas diklik malah popup? ga di sidebar?"), bukan dialog modal */
    $("#laci").innerHTML = `<div class="hd"><div class="hd-isi"><span class="hd-ey">Gunung api</span><h2 id="dlgJudul" translate="no" title="${esc(g.nama)}">${esc(g.nama)}</h2>
      <div class="hd-meta gn-prov"><span translate="no" title="${esc(g.prov)}">${ikL("pusat")}${esc(g.prov)}</span></div><div class="hd-meta gn-status">${pilLv(g.level)}<span id="dlgKode"></span></div></div>
      <div class="hd-aksi"><button type="button" class="ik-btn" data-pop aria-pressed="${!!this._pop}" aria-label="${this._pop ? "Tampilkan di samping" : "Buka sebagai pop-up"}" title="${this._pop ? "Tampilkan di samping" : "Buka sebagai pop-up"}">${this._pop ? IK_SAMPING : IK_POP}</button><button type="button" class="bagikan ik-btn" data-bagi aria-label="Bagikan" title="Bagikan">${IK_BAGI}</button><button type="button" class="tutup ik-btn" aria-label="Tutup" title="Tutup" data-tutup><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
      <div class="bd db" style="display:grid;gap:10px">${kot ? `<div class="grid gn-kv">${kot}</div>${g.penduduk_radius > 0 ? srcL("Penduduk: perkiraan WorldPop, kisi 1 km.") : ""}` : ""}
      ${g.rekomendasi ? lipat("Rekomendasi PVMBG", `${butirRek(g.rekomendasi)}${g.laporan ? luarL(g.laporan, LAP) : ""}${srcL(`Sumber: PVMBG lewat MAGMA Indonesia${g.periode ? `, <span translate="no" lang="id">${esc((p => /^laporan\b/i.test(p) ? "l" + p.slice(1) : "laporan " + p)(rapiLap(g.periode)))}</span>` : ""}.`)}`, "perisai") : ""}
      ${this.sVona(g)}
      ${this.sKontak(g.kontak)}
      ${erupsi}
      <div id="dlgLanjut"></div>
      ${!g.rekomendasi && g.laporan ? luarL(g.laporan, LAP) : ""}
      <button class="btn sec lc-sim" type="button" data-sim>${ikL("gunung")}Simulasikan erupsi</button></div>`;
    const d = $("#laci"); d._g = g; d.querySelector("[data-tutup]").onclick = () => this.tutup();
    d.querySelector("[data-sim]").onclick = () => { this.tutup(); bukaTab("simulasi", true, idGn(g.nama)); };
    d.querySelector("[data-bagi]").onclick = () => Bagikan.bagi({...Bagikan.konteks("gunung", g), lainnya: () => Bagikan.buka()});
    d.querySelector("[data-pop]").onclick = () => this.pop(!this._pop);
    d.classList.add("on"); d.querySelector(".bd")?.scrollTo?.(0, 0);
    this.kode(g); this.lanjut(g);
  },
  /* tutup laci; tautan kejadian /gunungapi/k/... hanya berlaku selama laci terbuka */
  /* tampilan pop-up opsional (pemilik 24 Nov 2026: "default sidebar, tapi ada pilihan untuk bisa view pop up"): elemen #laci yang sama dipindah ke dalam
     dialog #dlg, jadi isi, penangan, dan pengisian menyusul (kode, lanjut) tetap jalan; menutup pop-up = menutup rincian, tombol yang sama mengembalikan ke samping */
  _pop: false, _asal: null,
  pop(on) { const L = $("#laci"), D = $("#dlg"); if (!L || !D) return; this._asal ||= L.parentElement;
    const tombol = () => { const b = L.querySelector("[data-pop]"); if (!b) return; const t = on ? "Tampilkan di samping" : "Buka sebagai pop-up";
      b.setAttribute("aria-pressed", on); b.setAttribute("aria-label", t); b.title = t; b.innerHTML = on ? IK_SAMPING : IK_POP; };
    if (on) { this._pop = true; D.replaceChildren(L); D.classList.add("gn-pop-dlg"); tombol();
      D.onclick = e => { if (e.target === D) D.close(); };
      D.onclose = () => { if (this._pop) { this._pop = false; this._asal.append(L); D.classList.remove("gn-pop-dlg"); this.tutup(); } };
      if (!D.open) D.showModal(); }
    else { this._pop = false; this._asal.append(L); D.classList.remove("gn-pop-dlg"); D.onclose = null; if (D.open) D.close(); tombol(); L.classList.add("on"); } },
  tutup() { const d = $("#laci"); if (!d) return; if (this._pop) { this._pop = false; this._asal?.append(d); const D = $("#dlg"); D.classList.remove("gn-pop-dlg"); D.onclose = null; if (D.open) D.close(); } d.classList.remove("on"); d._g = null; if (location.pathname.startsWith("/gunungapi/k/")) history.replaceState(null, "", "/gunungapi/peta"); },
  /* kode kejadian V sebagai chip bersama .hd-ko; hanya gunung Waspada ke atas punya kode. Bila laci dibuka dari tautan /gunungapi/k/..., tautan mengikuti gunung yang sedang terbuka */
  async kode(g) {
    const d = $("#laci"); await Kejadian.muat(); const v = Kejadian.kode(g), el = d.querySelector("#dlgKode"); if (!el || d._g !== g) return;
    if (v) el.innerHTML = `<span class="hd-ko" translate="no" title="Nomor kejadian di Buku Besar Kejadian">Kejadian ${esc(v)}</span>`;
    if (location.pathname.startsWith("/gunungapi/k/")) history.replaceState(null, "", v ? "/gunungapi/k/" + v : "/gunungapi/peta"); },
  /* kontak resmi hanya dari yang tertulis di teks rekomendasi PVMBG (magma.py urai_kontak); tak ada daftar pos terstruktur, jadi gunung tanpa teks kontak tak punya bagian ini (A18).
     Nomor jadi tombol telepon bertumpuk rata kanan; nama pos di kiri, lokasinya kecil di bawah. */
  sKontak(k) {
    if (!k) return "";
    const tel = n => `<a class="gn-tel" href="tel:+62${n.replace(/\D/g, "").replace(/^0/, "")}" translate="no">${ikL("telepon")}${esc(n)}</a>`, li = [];
    const brs = (ik, nama, di, nilai) => `<div class="lc-lb"><span class="lc-lb-k">${ikL(ik)}<span class="gn-lb-n"><span translate="no">${esc(nama)}</span>${di ? `<small class="lc-sub" translate="no">${esc(di)}</small>` : ""}</span></span><b translate="no">${nilai}</b></div>`;
    if (k.pos) li.push(brs("posko", k.pos.nama, k.pos.di, (k.pos.telp || []).length ? `<span class="gn-tels">${k.pos.telp.map(tel).join("")}</span>` : "Tidak tertulis"));
    if (k.pusat) li.push(brs("gedung", "Pusat Vulkanologi dan Mitigasi Bencana Geologi", "Bandung", `<span class="gn-tels">${tel(k.pusat)}</span>`));
    return li.length ? lipat("Kontak resmi", `<div class="lc-lbs">${li.join("")}</div>${srcL("Sumber: rekomendasi PVMBG di MAGMA Indonesia.")}`, "posko") : ""; },
  /* bagian yang bergantung pada berkas turunan diisi sesudah dialog tampil (klik tidak menunggu jaringan); bagian tanpa data dibuang */
  async lanjut(g) {
    const id = idGn(g.nama), [abu, pg, mv, ped, har] = await Promise.all([Data.abu(), Data.pg(id), Data.mirova(), Data.ped(), Data.harian(g.kode)]), d = $("#laci"), el = d.querySelector("#dlgLanjut"); if (!el || d._g !== g) return;
    nanti(() => { if (d._g !== g) return;
      el.innerHTML = [this.sPantau(g, har), this.sArahan(g, pg, ped), this.sAbu(abu?.gunung?.find(x => x.id === id)), this.sTermal(mv, g.nama), this.sPaparan(pg), this.sEvak(pg), this.sCitra(pg)].join("");
      el.querySelectorAll("img[data-foto]").forEach(i => { const hapus = () => i.closest(".cit")?.remove(); i.addEventListener("error", hapus); if (i.complete && !i.naturalWidth) hapus(); }); }); },
  /* VONA terbaru gunung (MAGMA /v1/json/var): kode warna penerbangan, waktu terbit, tinggi kolom abu, arah bila ditulis. Gunung tanpa VONA dibuang. */
  sVona(g) {
    const v = g.vona; if (!v?.kode) return "";
    const tinggi = v.tinggi_m ? `${fmt(v.tinggi_m)} m di atas puncak${v.tinggi_dpl_m ? `<small class="lc-sub">${fmt(v.tinggi_dpl_m)} m di atas permukaan laut</small>` : ""}` : "Tidak dilaporkan";
    return lipat("Peringatan abu penerbangan (VONA)", `<div class="lc-lbs">${brsL("pesawat", "Kode warna penerbangan", pilVona(v))}${brsL("waktu", "Terbit", tglJam(v.terbit))}${brsL("gunung", "Tinggi kolom abu", tinggi)}${v.arah ? brsL("angin", "Arah sebaran abu", esc(v.arah)) : ""}</div>
      ${luarL(`https://magma.esdm.go.id/vona?code=${encodeURIComponent(g.kode || "")}`, `Buka VONA ${g.nama} di MAGMA`)}${srcL("Sumber: VONA PVMBG di MAGMA Indonesia. Kode warna penerbangan berbeda dari Level I sampai IV gunung api.")}`, "pesawat"); },
  /* laporan pengamatan terakhir dari catatan harian: foto visual (tetap di host PVMBG, tidak disalin), visual, klimatologi, jumlah gempa. Hilang bila catatan belum ada.
     Periode mengikuti teks laporan ("Laporan per 6 jam ..."), bawaan 24 jam. */
  sPantau(g, h) {
    if (!h) return "";
    const tg = new Date(h.tgl + "T12:00:00+07:00").toLocaleDateString("id-ID", {...WIB, day: "numeric", month: "long", year: "numeric"});
    const jam = (String(h.laporan || "").match(/per\s+(\d+)\s+jam/i) || [, "24"])[1];
    const foto = typeof h.foto === "string" && /^https:\/\/[a-z0-9.-]+\.esdm\.go\.id\//.test(h.foto) ? `<div class="cit sat"><figure><img data-foto src="${esc(h.foto)}" alt="Foto visual ${esc(g.nama)} laporan ${esc(tg)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"><figcaption>Foto visual ${esc(tg)}</figcaption></figure></div>` : "";
    const ada = x => x && !/^nihil\.?$/i.test(x.trim());
    const baris = [h.visual && ["Visual", h.visual, "mata"], ada(h.lainnya) && ["Keterangan lain", h.lainnya, "peringatan"], h.klimatologi && ["Cuaca", h.klimatologi, "hujan"]].filter(Boolean);
    const amat = baris.length ? kartuL("mata", "Visual dan cuaca", `<div class="gn-amat">${baris.map(([k, v, ik]) => `<div class="gn-amat-b"><span class="lc-lb-k">${ikL(ik)}${k}</span><p>${teksPv(v)}</p></div>`).join("")}</div>`) : "";
    const POLA = /^(\d+)\s+kali\s+(?:gempa\s+)?(.+?)(?:\s+dengan\s+(.+?))?\.?$/i;
    const gempa = (h.gempa || []).length ? kartuL("kuat", `Kegempaan ${jam} jam`, `<table class="tb2"><tbody>${h.gempa.map(x => { const m = String(x).trim().match(POLA);
      return m ? `<tr><td><span translate="no" lang="id">${esc(m[2])}</span>${m[3] ? `<small class="lc-sub">${teksPv(m[3])}</small>` : ""}</td><td class="n">${fmt(+m[1])} kali</td></tr>` : `<tr><td colspan="2">${teksPv(x)}</td></tr>`; }).join("")}</tbody></table>`) : "";
    if (!foto && !amat && !gempa) return "";
    const L = "https://magma.esdm.go.id/v1/gunung-api/";
    return lipat(`Laporan pengamatan ${jam} jam terakhir`, `${foto}${amat}${gempa}
      <div class="gn-luar">${luarL(L + "gallery", "Galeri foto")}${luarL(L + "live-seismogram", "Seismogram langsung")}</div>${srcL(`Sumber: PVMBG, MAGMA Indonesia. ${esc(rapiLap(h.laporan || "Laporan " + tg))}.`)}`, "mata"); },
  /* arahan Permen ESDM 15/2011 per KRB untuk level gunung ini, kalimat apa adanya dari data/pedoman_krb.json. Hanya zona KRB PVMBG; zona proksi tidak disebut KRB. Sistem tidak memerintah.
     Satu kartu per zona: pil zona di kepala, arahan sebagai isi utama, jiwa sebagai baris. */
  sArahan(g, pg, ped) {
    if (!ped || !pg || pg.zona_sumber !== "KRB PVMBG") return "";
    const Z = ["III", "II", "I"].filter(z => ped.krb?.[z]?.[g.level] && pg.zona?.[z]); if (!Z.length) return "";
    const kartu = z => `<section class="lc-sek gn-zona"><h4 class="lc-h" title="Kawasan Rawan Bencana ${z}">${pilZona(z)}</h4><p class="gn-arah" lang="id">${esc(ped.krb[z][g.level])}</p><div class="lc-lbs">${brsL("orang", "Penduduk di zona ini", jiwaTxt(pg.zona[z].penduduk) + " jiwa")}</div></section>`;
    return lipat("Arahan per Kawasan Rawan Bencana", `<div class="lc-lbs">${brsL("perisai", "Berlaku untuk", pilLv(g.level))}</div><div class="lc-lanjut">${Z.map(kartu).join("")}</div>
      <p class="fnd">Perintah mengungsi datang dari pemerintah daerah. Jarak larangan mengikuti rekomendasi terbaru gunung ini.</p>
      ${srcL(`Sumber: Peraturan Menteri ESDM Nomor 15 Tahun 2011, level per ${tglJam(S.st.dibuat)}. Jumlah jiwa adalah perkiraan WorldPop 1 km.`)}`, "peringatan"); },
  /* anomali termal satelit MIROVA (VRP, MW): pengamatan panas permukaan, BUKAN prakiraan letusan. Tanda "naik" hanya bila berkas menyatakan riwayat >= 14 hari (di_atas_latar bukan null). Gunung tanpa data dibuang (A18). */
  sTermal(mv, nama) {
    const m = mv && Object.values(mv.gunung || {}).find(x => x.gunung === nama); if (!m) return "";
    const v = m.vrp_mw, vt = v > 0 && v < .1 ? "kurang dari 0,1 MW" : v == null ? "–" : fmt(v) + " MW", ks = Object.keys(m.seri || {}).sort(), n = ks.length;
    const t0 = Date.parse(ks[0]), span = Math.max(1, (Date.parse(ks[n - 1]) - t0) / 864e5), rm = Math.max(...ks.map(k => m.seri[k])), mx = Math.max(1, rm);
    const xy = k => [((Date.parse(k) - t0) / 864e5 / span * 200).toFixed(1), (30 - m.seri[k] / mx * 28).toFixed(1)];
    /* titik = garis nol-panjang berujung bulat (vector-effect), tetap bundar walau svg diregangkan; nilai muncul saat kursor diarahkan */
    const titik = ks.map(k => { const [x, y] = xy(k); return `<path class="gn-tt" d="M${x} ${y}h0" stroke="currentColor" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"><title>${tglPendek(k.slice(0, 10))}: ${fmt(m.seri[k])} MW</title></path>`; }).join("");
    const spark = n >= 2 ? `<svg class="gn-spark" viewBox="0 0 200 32" width="100%" height="40" preserveAspectRatio="none" role="img" aria-label="Daya panas maksimum harian ${n} hari terakhir, puncak ${fmt(rm)} MW"><polyline points="${ks.map(k => xy(k).join(",")).join(" ")}" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>${titik}</svg><p class="fnd">Daya pancar panas (VRP, dalam megawatt) maksimum per hari selama ${fmt(n)} hari; skala tegak 0 sampai ${fmt(mx)} MW.</p>` : "";
    const status = m.di_atas_latar === true ? `<span class="pl" style="--w:var(--bad)">naik di atas latar</span>` : m.di_atas_latar === false ? "tidak naik" : `<span class="pl" style="--w:var(--ink2)">riwayat belum cukup</span>`;
    return lipat("Panas permukaan dari satelit (MIROVA)", `<div class="grid gn-kv">${kotA("Panas terbaru", vt, tglJam(m.waktu), "api")}${n >= 2 ? kotA("Puncak " + fmt(n) + " hari", fmt(rm) + " MW", "maksimum harian", "suhu") : ""}</div>${spark}
      <div class="lc-lbs">${brsL("waktu", "Dibanding kebiasaan gunung ini", status)}</div><p class="fnd">Tanda naik muncul bila daya panas dua hari terakhir melewati kebiasaan gunung ini; butuh minimal 14 hari data.</p>
      <p class="fnd">Pengamatan panas permukaan oleh satelit, bukan prakiraan letusan. Tutupan awan membuat nilai 0 belum tentu berarti tidak ada panas.</p>
      ${luarL("https://www.mirovaweb.it/NRT/latest.php", "MIROVA, Universitas Turin")}${srcL("Sumber: MIROVA, Universitas Turin, dari citra MODIS dan VIIRS NASA.")}`, "api"); },
  /* skenario abu 72 jam: kotak angka jangkauan, arah, tinggi kolom; bandara di jalur sebagai tabel. Jejak kosong = di bawah ambang penerbangan, bukan tanpa abu */
  sAbu(ga) {
    if (!ga?.jejak) return "";
    const J = ga.jejak_maks !== undefined ? ga.jejak_maks : ga.jejak.filter(jejakOk).sort((a, b) => b.jangkau_km - a.jangkau_km)[0], B = (ga.bandara || []).filter(b => b.jam_tiba != null).sort((a, b) => a.jam_tiba - b.jam_tiba);
    const kolom = kotA("Tinggi kolom", fmt(ga.kolom_m / 1000) + " km", "di atas puncak", "gunung");
    const atas = J ? `<div class="grid gn-kv">${kotA("Jangkauan abu", km5(J.jangkau_km) + " km", "di atas ambang penerbangan 2 mg/m³", "angin")}${kotA("Arah", arahMata(J.arah_deg), "terjauh pada jam ke-" + fmt(J.jam), "peta")}${kolom}</div>`
      : `<div class="lc-big"><div><b>Di bawah ambang</b><small>Abu tidak melewati ambang penerbangan 2 mg/m³ selama 72 jam; ini tidak berarti tidak ada abu.</small></div></div><div class="grid gn-kv">${kolom}</div>`;
    const band = B.length ? kartuL("pesawat", "Bandara di jalur abu", `<table class="tb2"><tbody>${B.slice(0, 3).map(b => `<tr><td><span translate="no">${esc(String(b.nama).replace(/ (International )?Airport$/, ""))}</span> (${esc(b.iata || b.icao)})</td><td class="n">jam ke-${fmt(b.jam_tiba)}</td></tr>`).join("")}</tbody></table>`)
      : J ? `<div class="lc-lbs">${brsL("pesawat", "Bandara di jalur abu", "Tidak ada")}</div>` : "";
    return lipat("Skenario abu 72 jam", `${atas}${band}<p class="fnd">${TXT_SKEN[0].toUpperCase() + TXT_SKEN.slice(1)}.</p>
      ${srcL(`Tinggi kolom: ${esc(ga.kolom_sumber || "asumsi")}. Angin: model cuaca Pusat Prakiraan Cuaca Eropa (ECMWF IFS) lewat Open-Meteo.`)}`, "angin"); },
  /* paparan per zona: bilah penduduk per KRB lalu satu tabel fasilitas berkolom zona; cincin jarak sebagai kotak angka berikon */
  sPaparan(pg) {
    if (!pg) return "";
    const Z = ["III", "II", "I"].map(z => [z, pg.zona?.[z]]).filter(([, v]) => v && (v.penduduk || v.sekolah || v.faskes || v.desa || v.tambang)), C = pg.cincin || [];
    if (!Z.length && !C.some(c => c.penduduk > 0)) return "";
    const sel = n => n ? `<td class="n">${fmt(n)}</td>` : `<td class="n nol">0</td>`;
    const brsT = (l, k) => `<tr><td>${l}</td>${Z.map(([, v]) => sel(v[k])).join("")}</tr>`;
    const bar = LC()?.kelasBar?.(Z.map(([z, v]) => ({label: "KRB " + z, nilai: v.penduduk || 0, teks: jiwaTxt(v.penduduk) + " jiwa", w: WARNA_ZONA[z], pil: true, terang: z === "I"}))) || "";
    const tb = Z.length ? kartuL("orang", "Penduduk dan fasilitas per zona", `${bar}<table class="tb2 gn-pap"><thead><tr><th></th>${Z.map(([z]) => `<th>${pilZona(z)}</th>`).join("")}</tr></thead><tbody><tr><td>Penduduk (jiwa)</td>${Z.map(([, v]) => v.penduduk ? `<td class="n">${jiwaTxt(v.penduduk)}</td>` : `<td class="n nol">0</td>`).join("")}</tr>${brsT("Desa", "desa")}${brsT("Sekolah", "sekolah")}${brsT("Fasilitas kesehatan", "faskes")}${brsT("Izin tambang", "tambang")}</tbody></table>`) : "";
    const kv = C.some(c => c.penduduk > 0) ? kartuL("peta", "Penduduk menurut jarak dari kawah", `<div class="grid gn-kv">${C.map(c => kotA(`Dalam ${fmt(c.km)} km`, jiwaTxt(c.penduduk), "jiwa dari kawah", "peta")).join("")}</div>`) : "";
    const zs = pg.zona_sumber && pg.zona_sumber !== "KRB PVMBG" ? `Zona: ${esc(pg.zona_sumber)}. ` : "";
    return lipat(Z.length ? "Paparan per Kawasan Rawan Bencana" : "Penduduk di sekitar kawah", `${tb}${kv}${srcL(`${zs}Jumlah penduduk adalah perkiraan WorldPop dengan grid 1 km. Sumber: ${Z.length ? "peta Kawasan Rawan Bencana PVMBG 2018, WorldPop, OpenStreetMap (desa, sekolah, fasilitas kesehatan), Wilayah Izin Usaha Pertambangan (WIUP) Kementerian ESDM" : "WorldPop"}.`)}`, "orang"); },
  sEvak(pg) {
    const r = evakRingkas(pg), SRC = "jaringan jalan dan titik kumpul OpenStreetMap, batas zona KRB PVMBG";
    if (!r) { const I = (pg?.evakuasi || []).filter(e => e.zona_desa === "I"); return I.length ? lipat("Evakuasi", `<div class="grid gn-kv">${kotA("Desa KRB I dengan rute cadangan", fmt(I.length), "desa terdekat ke kawah", "posko")}</div>
      <p class="fnd">Tidak ada desa di KRB III atau II yang tersambung ke jalan raya. Rute cadangan dihitung dari desa KRB I terdekat dan tidak dirata-ratakan.</p>${srcL(`Sumber: ${SRC}.`)}`, "jalan") : ""; }
    const E = evakZona(pg), tl = evakTerlama(pg), tk = new Map();
    E.forEach(e => e.titik_kumpul && tk.set(e.titik_kumpul, (tk.get(e.titik_kumpul) || 0) + 1));
    /* label teknis data (paparan.py) dipetakan untuk tampilan saja; nama yang sama sesudah dipetakan disatukan */
    const namaTk = s => /^jalan aman di luar zona$/i.test(s.trim()) ? "Jalan di luar zona bahaya (tanpa nama)" : /^(titik kumpul|evakuasi point|\d+)$/i.test(s.trim()) ? "Titik kumpul OpenStreetMap tanpa nama" : s;
    const titik = [...new Set([...tk].sort((a, b) => b[1] - a[1]).map(x => namaTk(x[0])))];
    return lipat("Evakuasi", `<div class="grid gn-kv">${kotA("Desa dengan rute", fmt(r.n), "di KRB III dan II", "posko")}${kotA("Waktu tempuh median", mnt5(r.median_menit), esc(/arus bebas/i.test(r.label || "arus bebas") ? "pada jalan lengang" : r.label), "waktu")}${kotA("Waktu tempuh terlama", mnt5(r.maks_menit), tl ? `dari <span translate="no">${esc(tl.desa)}</span>` : "", "jalan")}</div>
      ${titik.length ? kartuL("posko", "Titik kumpul tujuan rute", LC()?.chipWil?.(titik, {maks: 3}) || esc(titik.slice(0, 3).join(", "))) : ""}
      ${srcL(`Waktu tempuh dihitung pada jalan lengang, belum memperhitungkan antrean saat evakuasi massal. Sumber: ${SRC}.`)}`, "jalan"); },
  /* citra sebelum dan sesudah per kejadian (keterangan sebelum titik dua), pasangan terbaru di atas, sisanya dilipat */
  sCitra(pg) {
    const c = pg?.citra || [], kej = x => String(x?.keterangan || "").split(":")[0];
    const P = c.filter(x => x.fase === "sebelum").map(sb => [sb, c.find(x => x.fase === "sesudah" && x.tgl > sb.tgl && kej(x) === kej(sb))]).filter(([, ss]) => ss).sort((a, b) => String(b[1].tgl).localeCompare(String(a[1].tgl)));
    if (!P.length) return "";
    const fig = (x, n, w) => `<figure><img src="${esc(x.berkas)}" alt="Citra Sentinel-2 ${esc(n)} ${esc(tglPendek(x.tgl))}" loading="lazy" decoding="async"><figcaption><span class="pl" style="--w:${w}">${n}</span>${tglPendek(x.tgl)}</figcaption></figure>`;
    const kartu = ([sb, ss]) => kartuL("satelit", `<span translate="no" lang="id">${esc(kej(sb) || "Pasangan citra")}</span>`, `<div class="cit">${fig(sb, "Sebelum", "var(--ink2)")}${fig(ss, "Sesudah", "var(--bad)")}</div>`);
    return lipat("Citra satelit sebelum dan sesudah", `${kartu(P[0])}${P.length > 1 ? `<details class="gn-cat"><summary>${fmt(P.length - 1)} kejadian lain</summary><div class="lc-lanjut gn-cit-lain">${P.slice(1).map(kartu).join("")}</div></details>` : ""}
      ${srcL("Citra warna semu (inframerah gelombang pendek, inframerah dekat, merah): hutan tampak hijau tua, endapan segar dan tanah terbuka tampak terang keabu-biruan, awan tampak putih. Sumber: Copernicus Sentinel-2, Badan Antariksa Eropa (ESA).")}`, "satelit"); },
};
