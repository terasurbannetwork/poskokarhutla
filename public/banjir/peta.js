"use strict";
/* ================================================================ peta */
let peta = null;
/* turun tanah dari literatur (hipotesis, kutipan): dimuat sekali untuk kartu rob */
let SUBS_LIT = null; fetch("data/subsiden_literatur.json").then(r => r.ok ? r.json() : null).then(j => SUBS_LIT = j).catch(() => {});
const subsKota = kab => /Jakarta/.test(kab) ? "jakarta" : /Semarang|Demak/.test(kab) ? "semarang" : /Pekalongan/.test(kab) ? "pekalongan" : /Medan/.test(kab) ? "medan" : null;
const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
/* ruang peta yang terlihat diukur dari panel kiri, panel kanan, dan garis waktu (bukan angka tetap), seperti padRuang karhutla */
const BB_ID = [[94.8, -11.2], [141.2, 6.2]];
const kiriPad = () => { if (innerWidth <= 900) return {top: 60, bottom: innerHeight * .45, left: 16, right: 16};
  const r = s => document.querySelector(s)?.getBoundingClientRect(), pn = r(".panel"), tl = r(".tools"), lg = r("#dok"), pt = r("#p-peta");
  return {top: 56, left: (pn?.width || 440) + 30, right: (tl?.width || 280) + 30, bottom: Math.min(160, Math.max(30, pt && lg ? pt.bottom - lg.top + 16 : 150))}; }; /* dok banjir lebih tinggi (baris skala hujan): batasi supaya kamera awal sama dengan karhutla */
/* gambar lapisan peta: dimuat sekali dari modul inti (ubin Overlay, kartu hover) */
let PI = null, LG = null, legBuka = innerWidth > 900;
const UBIN = {wilayah: ["#f4c48a", "#d4572f", "peta"], sungai: ["#16405c", "#4fa3c4", "sungai"], rob: ["#1f5f5b", "#5fb3a9", "ombak"], posko: ["#0b2545", "#3b6fb0", "posko"],
  pos: ["#16405c", "#4fa3c4", "sungai"], hujanukur: ["#1d4e89", "#69a7e8", "hujan"], peluang: ["#3a0c78", "#a882de", "hujan"], hujan: ["#1d4e89", "#69a7e8", "hujan"], h3: ["#2a3f8f", "#8a7fe0", "hujan"], satelit: ["#13324d", "#4d8a5e", "satelit"],
  kejadian: ["#7a1f12", "#e58a45", "peringatan"], bmkg: ["#7a3b0b", "#f2b544", "peringatan"], angin: ["#1f5f8b", "#5fc0c9", "angin"]};
const UBIN_PENDEK = {wilayah: "Status", sungai: "Sungai", pos: "Pos air", hujanukur: "Pos hujan", peluang: "Peluang hujan", rob: "Rob", kejadian: "Wilayah Siaga", posko: "Posko", hujan: "Hujan", h3: "Hujan 3 hari", satelit: "Satelit", bmkg: "BMKG", angin: "Angin"};
const kotak = fitur => PI.kotak(fitur);   /* inti/peta/lapis.js */
/* "Hari ini" hanya bila tanggal itu memang hari ini (WIB); status.json bisa tertinggal sehari */
const hariWIB = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
const labelHari = t => t === hariWIB() ? "Hari ini" : tglPendek(t);
/* prakiraan 3 hari + peluang (prakiraan72.json, status.py): level deterministik d0..d3, peluang jalur hujan dari ansambel ECMWF, rob terpisah.
   Jendela peluang = hari status (hari ke-0, ke-0..1, ke-0..2), bukan jam: H3 sudah memuat hujan kemarin. */
const Pra72 = {
  d: null, p: null, KURANG: "<10%",
  muat() { return this.p ||= muatJSON("data/prakiraan72.json").then(d => this.d = d).catch(() => null); },
  kec(k) { return this.d?.kec?.[k] || null; },
  /* label jendela: "<tanggal hari 0>", "s.d. <tanggal hari 1>", "s.d. <tanggal hari 2>" */
  jendela() { const h = this.d?.hari || []; return h.slice(0, 3).map((t, i) => (i ? "s.d. " : "") + (i ? tglPendek(t) : labelHari(t))); },
  /* peluang % mencapai >= Siaga (indeks 1) untuk hari h; null = tak ada (kecamatan tak tercatat atau tanpa ansambel) */
  siaga(k, b = S.b, h = S.hari) { return this.kec(k)?.[b === "b" ? "pb" : "pl"]?.[h]?.[1] ?? null; },
  /* peluang bulat; kecamatan tak tercatat di berkas = di bawah 10% */
  pct: v => v == null ? "–" : fmt(Math.round(v)) + "%",
  teks(k) { return this.d?.anggota == null ? "" : this.kec(k) ? this.pct(this.siaga(k)) : this.KURANG; },
  /* isi lipatan prakiraan satu kecamatan */
  isi(k) {
    const D = this.d; if (!D) return "";
    if (D.anggota == null) return `<p class="fnd">Peluang belum tersedia: ansambel ECMWF belum jalan hari ini. Status per hari di atas tetap dari model utama.</p>`;
    const r = this.kec(k) || {b: [0, 0, 0, 0], l: [0, 0, 0, 0]}, ada = D.anggota != null, tak = !this.kec(k), K = esc(this.KURANG);
    const pc = v => tak ? K : this.pct(v);
    const sel = (lv, p) => `${pill(lv || 0)}${ada ? ` <small>${pc(p)}</small>` : ""}`;
    const baris = D.hari.map((t, h) => `<tr><td><b>${labelHari(t)}</b></td><td>${sel(r.b[h], r.pb?.[h]?.[1])}</td><td>${sel(r.l[h], r.pl?.[h]?.[1])}</td></tr>`).join("");
    const J = this.jendela(), seq = q => J.map((j, i) => `${j} <b>${pc(r[q]?.[i]?.[1])}</b>`).join(", ");
    const hz = ada ? `<p class="fnd">Peluang Siaga banjir ${seq("hb")}; longsor ${seq("hl")}.</p>` : `<p class="fnd">Peluang tidak tersedia (ansambel ECMWF belum terambil hari ini).</p>`;
    return `<table class="tb3"><thead><tr><th>Hari</th><th>Banjir${ada ? " · peluang Siaga" : ""}</th><th>Longsor${ada ? " · peluang Siaga" : ""}</th></tr></thead><tbody>${baris}</tbody></table>${hz}
      <p class="fnd">Peluang jalur hujan saja: porsi dari ${fmt(D.anggota || 0)} anggota ansambel ECMWF yang membuat hujan 3 hari melewati ambang Siaga. Sungai dan intensitas per jam tidak ikut, jadi status yang naik lewat jalur itu tidak tercermin di peluang. Peluang belum diuji balik; kalibrasinya belum diketahui. Titik ansambel mewakili kotak 1°.</p>`; },
  /* rob dipisah dari banjir: tinggi pasang prakiraan vs ambang lokasi, validasi DIBI-nya sendiri */
  rob(k) {
    const R = this.d?.rob?.kec?.[k]; if (!R) return ""; const V = this.d.rob.validasi, v = V?.persentil, n = V?.kejadian_diuji, t = this.d.hari;
    const uji = v && n ? `Uji balik rob: ${fmt(Math.round(v.pod * n))} dari ${fmt(n)} kejadian DIBI tertangkap (selisih sampai 1 hari), ${fmt(Math.round(v.pod_hari_sama * n))} dari ${fmt(n)} pada hari yang sama; ${fmt(Math.round(v.far * 100))}% peringatannya tanpa kejadian tercatat. Sampelnya kecil dan ambangnya dihitung dari data yang sama (dalam sampel), jadi angka ini cenderung optimistis.` : "Rob belum diuji balik.";
    return `<table class="tb3"><thead><tr><th>Hari</th><th class="n">Pasang maks</th><th class="n">Ambang p95</th><th class="n">Status rob</th></tr></thead><tbody>${t.map((d, h) => `<tr><td><b>${labelHari(d)}</b></td><td class="n num">${R.h[h] == null ? "–" : f2(R.h[h]) + " m"}</td><td class="n num">${f2(R.p95)} m</td><td class="n">${R.lv[h] == null ? "–" : pill(R.lv[h])}</td></tr>`).join("")}</tbody></table>
      <p class="fnd">${uji} Status rob tidak dicampur ke status banjir.</p>`; },
};
const Peta = {
  async init() {
    document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="../inti/peta/lapis.css"><link rel="stylesheet" href="../inti/peta/legenda.css">');
    PI = await import("../inti/peta/lapis.js").catch(() => null);
    PI?.ubinLapis($("#lapis"), {katalog: UBIN, pendek: UBIN_PENDEK});
    LG = await import("../inti/peta/legenda.js").catch(() => null);
    /* lebar panel kiri/kanan -> --lp/--tw di #p-peta (seperti lebarPanel karhutla); dok legenda berdiri di antaranya */
    const lebar = () => { const w = $(".panel")?.getBoundingClientRect().width, t = $(".tools")?.getBoundingClientRect().width, p = $("#p-peta");
      if (w) p.style.setProperty("--lp", w + "px"); if (t) p.style.setProperty("--tw", t + "px"); };
    const ro = new ResizeObserver(lebar); ro.observe($(".panel")); ro.observe($(".tools")); lebar();
    peta = new maplibregl.Map({container: "peta", style: DASAR(), center: [118, -2.4], zoom: 4.1, minZoom: 3, maxZoom: 15, attributionControl: {compact: true}, dragRotate: false, pitchWithRotate: false});
    peta.once("load", () => window.NASA?.pasang(peta, ["imerg", "modis721"]));   /* lapisan satelit NASA GIBS, inti/peta/nasa.js */
    peta.touchZoomRotate.disableRotation();
    import("../inti/peta/konteks.js").then(m => m.pasang(peta, "banjir")).catch(() => 0);   /* lapisan konteks (penduduk, sekolah, faskes, jalan) dari registry, inti/peta/konteks.js */
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    peta.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-right");
    peta.on("style.load", () => this.pasang());
    await new Promise(r => peta.isStyleLoaded() ? r() : peta.once("style.load", r));
    peta.fitBounds(BB_ID, {padding: kiriPad(), duration: 0});
    nanti(() => Pra72.muat().then(() => { if (S.jalur.length >= 2) renderDaftar(); })); },
  lihat(k) { const i = document.querySelector(`#lapis input[data-l="${k}"]`); return i ? i.checked : false; },
  bawahLabel() { const l = peta.getStyle().layers.find(l => l.type === "symbol"); return l && l.id; },
  pasang() {
    if (peta.getSource("wil")) return;
    const bl = this.bawahLabel();
    peta.addSource("wil", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id"});
    peta.addLayer({id: "wil-fill", type: "fill", source: "wil", layout: {visibility: this.lihat("wilayah") ? "visible" : "none"},
      paint: {"fill-color": ["match", ["get", "lv"], 3, WARNA_LV[3], 2, WARNA_LV[2], 1, WARNA_LV[1], "rgba(0,0,0,0)"],
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, ["case", ["boolean", ["feature-state", "hover"], false], .75, .45], 13, ["case", ["boolean", ["feature-state", "hover"], false], .4, .15]]}}, bl);
    peta.addLayer({id: "wil-line", type: "line", source: "wil", paint: {"line-color": gelap() ? "#9fb3d1" : "#1d4e89", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.4, .6], "line-opacity": .7}});
    peta.addSource("prov", {type: "geojson", data: S.geo.prov});
    peta.addLayer({id: "prov-line", type: "line", source: "prov", paint: {"line-color": gelap() ? "#c9d6ea" : "#0b2545", "line-width": 1.1, "line-opacity": .55}});
    this.aturWilayah(false); this.interaksi();
    /* lapisan lain dipasang malas, satu per giliran, supaya klik pertama tidak tertahan; satelit hanya bila dinyalakan */
    ["hujan", "sungai", "rob"].forEach(k => nanti(() => this.pasangLapis(k)));
    nanti(() => this.lihat("satelit") && this.pasangLapis("satelit"));
    nanti(() => Posko.lapis()); nanti(() => KejAktif.lapis()); nanti(() => PosUkur.mulai()); nanti(() => PosHujan.mulai()); nanti(() => Eksp.mulai()); },
  pasangLapis(k) {
    if (!peta.getSource("wil") || peta.getLayer(k)) return;
    const vis = on => ({visibility: on ? "visible" : "none"});
    if (k === "satelit") { peta.addSource("satelit", {type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Esri"});
      peta.addLayer({id: "satelit", type: "raster", source: "satelit", layout: vis(this.lihat("satelit"))}, peta.getLayer("hujan") ? "hujan" : "wil-fill"); }
    else if (k === "hujan") { const g = this.gambarHujan();
      peta.addSource("hujan", {type: "image", url: g.url, coordinates: g.kor});
      peta.addLayer({id: "hujan", type: "raster", source: "hujan", layout: vis(this.lihat("hujan") || this.lihat("h3")), paint: {"raster-opacity": ["interpolate", ["linear"], ["zoom"], 10, .75, 13, .15], "raster-resampling": "linear", "raster-fade-duration": 0}}, "wil-fill"); }
    else if (k === "sungai") {
      peta.addSource("sungai", {type: "geojson", data: this.geoSungai()});
      peta.addLayer({id: "sungai", type: "circle", source: "sungai", layout: {...vis(this.lihat("sungai")), "circle-sort-key": ["get", "k"]},
        filter: S.mode === "sungai" ? null : [">=", ["get", "k"], 0],
        paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["match", ["get", "k"], 0, 2.5, -1, 2, 5], 9, ["match", ["get", "k"], 0, 6, -1, 5, 11]],
          "circle-color": ["match", ["get", "k"], 3, WARNA_LV[3], 2, WARNA_LV[2], 1, WARNA_LV[1], -1, "#9aa8b8", "#3f7fb8"], "circle-stroke-color": "#fff", "circle-stroke-width": ["match", ["get", "k"], 0, .8, 1.8],
          "circle-opacity": ["match", ["get", "k"], 0, .65, 1]}}); }
    else if (k === "rob" && S.rob) { peta.addSource("rob", {type: "geojson", data: this.geoRob()});
      peta.addLayer({id: "rob", type: "symbol", source: "rob", layout: {...vis(this.lihat("rob")), "text-field": "▲", "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 4, ["match", ["get", "k"], 0, 9, 15], 9, ["match", ["get", "k"], 0, 16, 24]], "text-allow-overlap": true, "symbol-sort-key": ["get", "k"]},
        paint: {"text-color": ["match", ["get", "k"], 3, WARNA_LV[3], 2, WARNA_LV[2], 1, WARNA_LV[1], "#2b8c86"], "text-halo-color": "#fff", "text-halo-width": 1.4}}); }
    renderLegenda(); },
  /* lapisan dicentang DAN benar-benar tergambar pada zoom ini (minzoom/maxzoom lapisan); untuk legenda */
  terlihat(k, id = k) { if (!this.lihat(k)) return false; const l = peta?.getLayer(id), z = peta?.getZoom() ?? 0; return !l || (z >= (l.minzoom ?? 0) && z <= (l.maxzoom ?? 24)); },
  /* titik pantai: level rob pada hari aktif (indeks hari rob.json disejajarkan dengan tanggal) */
  geoRob() { const j = S.rob.hari.indexOf(S.st.hari[S.hari]);
    return {type: "FeatureCollection", features: S.rob.titik.map((t, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [t.lon, t.lat]}, properties: {i, k: j < 0 ? 0 : t.lv[j] || 0}}))}; },
  geoSungai() { return {type: "FeatureCollection", features: S.sungai.titik.map((t, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [t.lon, t.lat]},
    properties: {i, k: this.kelasHariSungai(t)}}))}; },
  /* kelas sungai pada hari aktif: debit rata-rata ansambel hari itu dibanding Q2/Q5/Q20 */
  kelasHariSungai(t) { if (t.q2 == null) return -1; const j = S.sungai.hari.indexOf(S.st.hari[S.hari]), q = j < 0 ? t.puncak : Math.max(t.q[j] ?? 0, 0);
    return q >= t.q20 ? 3 : q >= t.q5 ? 2 : q >= t.q2 ? 1 : 0; },
  /* hujan sebagai gambar 1 piksel per sel; MapLibre menghaluskan antarsel (gaya Windy) */
  gambarHujan() {
    const H = S.hujan, sel = H.sel, x0 = 94.5, x1 = 141.5, y0 = -11.5, y1 = 6.5, w = Math.round((x1 - x0) / sel), h = Math.round((y1 - y0) / sel);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h);
    const iH = H.hari.indexOf(S.st.hari[S.hari]), pakaiH3 = this.lihat("h3") && !this.lihat("hujan");
    for (const g of H.grid) { const v = pakaiH3 ? g.h3 : g.h[iH]; if (v == null) continue;
      const cx = Math.floor((g.lon - x0) / sel), cy = Math.floor((y1 - g.lat) / sel); if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      const c = gradasi(ST_HUJAN, pakaiH3 ? v / 2 : v), o = (cy * w + cx) * 4; img.data.set(c, o); }
    ctx.putImageData(img, 0, 0);
    return {url: cv.toDataURL(), kor: [[x0, y1], [x1, y1], [x1, y0], [x0, y0]]}; },
  segarkan() {
    if (!peta?.getSource("wil")) return;
    if (peta.getSource("hujan")) { const g = this.gambarHujan(); peta.getSource("hujan").updateImage({url: g.url, coordinates: g.kor}); }
    peta.getSource("sungai")?.setData(this.geoSungai()); peta.getSource("rob")?.setData(this.geoRob()); this.aturWilayah(false); },
  async aturWilayah(terbang = true) {
    const j = S.jalur; let fc;
    if (j.length === 0) fc = S.geo.prov;
    else if (j.length === 1) fc = S.geo.kab[j[0]] ||= await muatJSON(`../geo/kabupaten/${j[0]}.json`);
    else { const kec = S.geo.kec[j[0]] ||= await muatJSON(`../geo/kecamatan/${j[0]}.json`); fc = {type: "FeatureCollection", features: kec.features.filter(f => f.properties.kab === j[1])}; }
    const ag = agregat(); let id = 0;
    S.fiturWil = fc.features.map(f => { const p = f.properties, kunci = j.length === 0 ? p.kode : j.length === 1 ? j[0] + "|" + p.kab : j[0] + "|" + j[1] + "|" + p.kec;
      return {type: "Feature", geometry: f.geometry, properties: {id: ++id, kunci, nama: j.length === 0 ? namaProv(p.kode) : j.length === 1 ? p.kab : p.kec, lv: ag[kunci]?.lv || 0}}; });
    S.ag = ag;
    if (peta.getSource("wil")) peta.getSource("wil").setData({type: "FeatureCollection", features: S.fiturWil});
    Eksp.reset(); Eksp.terapkan();
    if (terbang) peta.fitBounds(j.length && S.fiturWil.length ? kotak(S.fiturWil) : BB_ID, {padding: kiriPad(), duration: 700, maxZoom: 11});
    renderCrumb(); renderDaftar(); },
  /* kartu hover satu baris berikon: wilayah (jumlah kecamatan per status, atau status + hujan di kecamatan), titik sungai, titik pantai */
  kartuWilayah(f) { const p = f.properties, kp = p.kunci.split("|"), n = S.ag[p.kunci]?.n || [0, 0, 0, 0], W = WARNA_LV;
    let stat; if (kp.length < 3) stat = [["peringatan", n[3], "awas", W[3], n[3] > 0], ["bel", n[2], "siaga", W[2]], ["mata", n[1], "waspada", W[1]]];
    else { const c = selDekat(...pusat(p.kunci)); stat = [["perisai", LEVEL[p.lv], "status", W[p.lv], p.lv >= 2], ["hujan", c ? fmt(Math.round(c.h3)) + " mm" : "–", "hujan 3 hari", "#3f7fb8"],
      ...(Pra72.d?.anggota != null ? [["bel", esc(Pra72.teks(p.kunci)), "peluang siaga", W[2]]] : [])]; }
    return PI.kartuTip({judul: esc(p.nama), kepala: kp.length < 3 ? lambang(kp[0], kp[1]) : "", stat}); },
  kartuSungai(i, k) { const t = S.sungai.titik[i], W = WARNA_LV; if (!t) return "";
    return PI.kartuTip({judul: esc(t.kec), kepala: lambang(t.prov, t.kab), stat: [["sungai", k < 0 ? "–" : LEVEL[k], "status", k < 0 ? "#9aa8b8" : W[k], k >= 2], ["debit", fmt(Math.round(t.puncak)) + " m³/s", "puncak 7 hari", "#3f7fb8"],
      ...(t.q2 ? [["rasio", f2(t.puncak / t.q2) + "×", "dari banjir 2 th", "#3f7fb8"]] : [])]}); },
  kartuRob(i, k) { const t = S.rob.titik[i], j = S.rob.hari.indexOf(S.st.hari[S.hari]), h = j < 0 ? null : t.h[j]; if (!t) return "";
    return PI.kartuTip({judul: esc(t.kec || t.kab), kepala: lambang(t.prov, t.kab), stat: [["ombak", LEVEL[k], "status", k ? WARNA_LV[k] : "#2b8c86", k >= 2], ["debit", h == null ? "–" : f2(h) + " m", "muka laut", "#2b8c86"],
      ...(() => { const sb = SUBS_LIT?.kota?.[subsKota(t.kab || "")]?.sumber?.[0]; return sb && sb.maks_cm_thn ? [["rasio", "sampai " + fmt(sb.maks_cm_thn) + " cm/th", "turun tanah, literatur (hipotesis)", "#b8782f"]] : []; })()]}); },
  interaksi() {
    if (this._ia) return; this._ia = true;
    let hov = null, diTitik = false; const tip = () => PI?.sembunyiTip();
    /* titik sungai dan rob di atas wilayah: kartunya menang bila kursor di titik */
    for (const [id, kartu] of [["sungai", "kartuSungai"], ["rob", "kartuRob"]]) {
      peta.on("mousemove", id, e => { diTitik = true; peta.getCanvas().style.cursor = "pointer"; const f = e.features[0]; PI?.tampilTip(this[kartu](f.properties.i, f.properties.k), e.originalEvent); });
      peta.on("mouseleave", id, () => { diTitik = false; peta.getCanvas().style.cursor = ""; tip(); }); }
    peta.on("mousemove", "wil-fill", e => { peta.getCanvas().style.cursor = "pointer"; const f = e.features[0];
      if (hov !== f.id) { if (hov !== null) peta.setFeatureState({source: "wil", id: hov}, {hover: false}); hov = f.id; peta.setFeatureState({source: "wil", id: hov}, {hover: true}); }
      if (!diTitik && !this.diKej && S.mode !== "riwayat" && PI) PI.tampilTip(this.kartuWilayah(f), e.originalEvent); });
    peta.on("mouseleave", "wil-fill", () => { peta.getCanvas().style.cursor = ""; if (hov !== null) peta.setFeatureState({source: "wil", id: hov}, {hover: false}); hov = null; if (!diTitik && S.mode !== "riwayat") tip(); });
    /* zoom keluar sendiri: tingkat wilayah ikut naik (kecamatan -> kabupaten -> provinsi -> Indonesia) tanpa menerbangkan peta */
    peta.on("zoomend", e => { if (!e.originalEvent) return; const z = peta.getZoom(), n = S.jalur.length, ke = n >= 1 && z < 5.2 ? 0 : n >= 2 && z < 6.8 ? 1 : n; if (ke === n) return;
      S.jalur = S.jalur.slice(0, ke); nanti(() => Peta.aturWilayah(false)); });
    /* legenda hanya lapisan yang terlihat: dihitung ulang saat zoom melewati ambang minzoom/maxzoom salah satu lapisan */
    const AMBANG = () => ["wil-fill", "sungai", "rob", "hujan", "satelit"].flatMap(id => { const l = peta.getLayer(id); return l ? [l.minzoom, l.maxzoom].filter(z => z > 0 && z < 24) : []; }), tingkat = () => AMBANG().filter(a => peta.getZoom() >= a).length; let t0 = tingkat();
    peta.on("zoomend", () => { const t = tingkat(); if (t !== t0) { t0 = t; renderLegenda(); } });
    peta.on("click", e => {
      const kj = KejAktif.hit(e.point); if (kj) return KejAktif.buka(kj);   /* pin kejadian menang; poligonnya sesudah posko/rob/sungai/riwayat */
      const pk = peta.getLayer("posko") && peta.queryRenderedFeatures(e.point, {layers: ["posko"]});
      if (pk && pk.length) return Posko.popup(pk[0].properties.id, pk[0].geometry.coordinates.slice());
      const ps = PosUkur.hit(e.point); if (ps) return PosUkur.buka(ps);
      const ph_ = PosHujan.hit(e.point); if (ph_) return PosHujan.buka(ph_);
      const pt_ = PosUkur.hitPasut(e.point); if (pt_) return PosUkur.bukaPasut(pt_);   /* pos tinggi air: kartu ringan langsung, grafik menyusul */
      const rb_ = peta.getLayer("rob") && peta.queryRenderedFeatures(e.point, {layers: ["rob"]});
      if (rb_ && rb_.length) return Rob.titik(rb_[0].properties.i);
      const s = peta.getLayer("sungai") && peta.queryRenderedFeatures(e.point, {layers: ["sungai"]});
      if (s && s.length) return Analisa.sungai(s[0].properties.i);
      const gb = S.mode === "riwayat" && peta.getLayer("riw-bubble") && peta.queryRenderedFeatures(e.point, {layers: ["riw-bubble"]});
      if (gb && gb.length) return Riwayat.buka(gb[0].properties.kunci);
      const kp = KejAktif.hit(e.point, true); if (kp) return KejAktif.buka(kp);
      const w = peta.queryRenderedFeatures(e.point, {layers: ["wil-fill"]});
      if (!w.length) return;
      const k = w[0].properties.kunci;
      if (S.mode === "riwayat" && S.jalur.length >= 2) return Riwayat.buka(k);
      if (S.jalur.length >= 2) return Analisa.wilayah(k);
      turun(k); }); },
};
function turun(kunci) { S.jalur = kunci.split("|"); nanti(() => Peta.aturWilayah()); }
function naik(n) { S.jalur = S.jalur.slice(0, n); nanti(() => Peta.aturWilayah()); }

/* ---------- panel ---------- */
function renderCrumb() {
  const j = S.jalur, b = [`<button data-n="0">Indonesia</button>`];
  if (j[0]) b.push(`<button data-n="1">${esc(namaProv(j[0]))}</button>`);
  if (j[1]) b.push(`<button data-n="2">${esc(j[1])}</button>`);
  /* seperti karhutla: tombol Rincian membuka laci wilayah yang sedang dibuka */
  if (j[0]) b.push(`<button class="cr-rinci" data-rinci title="Rincian ${esc(j[1] || namaProv(j[0]))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>Rincian</button>`);
  $("#crumb").innerHTML = b.join(""); }
$("#crumb").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.rinci != null) return Analisa.wilayah(S.jalur.join("|")); naik(+b.dataset.n); });
const pill = l => l == null ? `<span class="pill" style="background:var(--surface);color:var(--ink2)">belum ada ambang</span>` : `<span class="pill l${l}">${LEVEL[l]}</span>`;
function renderDaftar() {
  if (S.panel === "posko") return renderDaftarPosko();
  if (S.mode === "riwayat" && Riwayat.R) return Riwayat.daftar();
  const j = S.jalur, g = "grid-template-columns:20px minmax(0,2.6fr) minmax(46px,.8fr) minmax(44px,.7fr) minmax(76px,1.1fr)";
  /* provinsi dan kabupaten: tabel arsip harian (wilayah.js); tanpa data pipeline jatuh ke tabel lama di bawah */
  if (j.length < 2 && S.mode !== "riwayat") { const w = Wilayah.html(j); if (w) { $("#rows").innerHTML = w; return terapkanUrut(); } }
  const item = [...new Map((S.fiturWil || []).map(f => [f.properties.kunci, f.properties])).values()].map(p => {
    const a = S.ag[p.kunci], c = j.length >= 2 ? selDekat(...pusat(p.kunci)) : null;
    return {kunci: p.kunci, nama: p.nama, lv: a?.lv || 0, n: a ? a.n[3] * 1e6 + a.n[2] * 1e3 + a.n[1] : 0, awas: a?.n[3] || 0, siaga: a?.n[2] || 0, h3: S.st.kec[p.kunci]?.h3 ?? c?.h3, ps: j.length >= 2 ? Pra72.siaga(p.kunci) : null}; })
    .sort((a, b) => b.lv - a.lv || b.n - a.n || a.nama.localeCompare(b.nama));
  const kepala = `<div class="tb kepala" style="${g}"><span></span><span>${["Provinsi", "Kabupaten / kota", "Kecamatan"][Math.min(j.length, 2)]}</span><span class="n">${j.length >= 2 ? "Hujan 3h" : "Awas"}</span><span class="n">${j.length >= 2 ? (Pra72.d?.anggota != null ? "Peluang" : "") : "Siaga"}</span><span style="text-align:right">Status</span></div>`;
  $("#rows").innerHTML = (RINGKAS_TAMPIL ? ringkasHari() : "") + kepala + (item.map((i, n) => `<button class="tb" data-k="${esc(i.kunci)}" style="${g}"><span class="rk">${n + 1}</span><span style="font-weight:600">${esc(i.nama)}</span>
    <span class="n" data-sort="${j.length >= 2 ? (i.h3 ?? -1) : i.awas}">${j.length >= 2 ? (i.h3 != null ? fmt(Math.round(i.h3)) + " mm" : "–") : i.awas ? `<b style="color:var(--bad)">${fmt(i.awas)}</b>` : "–"}</span><span class="n" data-sort="${j.length >= 2 ? (i.ps ?? -1) : i.siaga}">${j.length >= 2 ? (Pra72.d?.anggota != null ? esc(Pra72.teks(i.kunci)) : "") : i.siaga ? fmt(i.siaga) : "–"}</span>
    <span style="text-align:right">${pill(i.lv)}</span></button>`).join("") || `<div class="kosong">Tidak ada wilayah.</div>`);
  terapkanUrut();
}
/* kepala tabel panel bisa diurut (klik kolom; klik lagi = balik arah), seperti karhutla; pilihan diingat per mode panel */
S.urut = {};
function tandaiUrut() { /* panah kepala kolom: urgen */
  const kp = $("#rows").querySelector(".tb.kepala"); if (!kp) return;
  const u = S.urut[S.mode === "riwayat" ? "riw" : "wil"];
  [...kp.children].forEach((c, i) => { if (i < 1) return; c.dataset.s = i; c.classList.toggle("urut", u?.i === i); c.dataset.arah = u?.i === i ? u.d : ""; }); }
function terapkanUrut() {
  const box = $("#rows"), u = S.urut[S.mode === "riwayat" ? "riw" : "wil"]; tandaiUrut();
  if (!u || !box.querySelector(".tb.kepala")) return;
  const nilai = b => { const c = b.children[u.i]; if (!c) return -1e15; if (c.dataset.sort != null) return +c.dataset.sort; const p = c.querySelector(".pill"); if (p) return +(p.className.match(/\bl(\d)/) || [0, 0])[1];
    const t = c.textContent.trim(), n = t.replace(/\/.*/, "").replace(/\./g, "").replace(",", ".");
    return t === "" || t === "–" ? -1e15 : u.i === 1 || isNaN(+n) ? t : +n; };
  const rows = [...box.querySelectorAll("button.tb")].map(b => ({b, v: nilai(b)})), fr = document.createDocumentFragment();
  rows.sort((a, b) => u.d * (typeof a.v === "string" || typeof b.v === "string" ? String(a.v).localeCompare(String(b.v), "id") : a.v - b.v));
  rows.forEach(({b}, n) => { const rk = b.querySelector(".rk"); if (rk) rk.textContent = n + 1; fr.appendChild(b); });
  rows[0]?.b.parentElement.appendChild(fr);
}
const RINGKAS_TAMPIL = false; /* kotak angka "Banjir · Sel, 13 Okt · kecamatan" di atas tabel: tidak ada di karhutla, disembunyikan (paritas); true untuk memulihkan */
/* ringkas: jumlah kecamatan per level di wilayah aktif untuk hari aktif */
function ringkasHari() {
  const pre = S.jalur.join("|"), n = [0, 0, 0, 0];
  for (const [k, v] of Object.entries(S.st.kec)) if (!pre || k.startsWith(pre + "|") || k === pre) n[v[S.b]?.[S.hari] || 0]++;
  return `<div class="ringkas"><div class="lbl">${NAMA_B[S.b] === "banjir" ? "Banjir" : "Longsor"} · ${tglPendek(S.st.hari[S.hari])} · kecamatan</div>
    <div class="kv" style="grid-template-columns:repeat(3,1fr)">${[3, 2, 1].map(l => `<div><b style="color:${WARNA_LV[l]}">${fmt(n[l])}</b><span>${LEVEL[l]}</span></div>`).join("")}</div></div>`; }
function pusat(kunci) { const f = S.fiturWil?.find(f => f.properties.kunci === kunci); if (!f) return [0, 0]; const b = kotak([f]); return [(b[0][1] + b[1][1]) / 2, (b[0][0] + b[1][0]) / 2]; }
$("#rows").addEventListener("click", e => { const kol = e.target.closest(".kepala span[data-s]");
  if (kol) { const k = S.mode === "riwayat" ? "riw" : "wil", i = +kol.dataset.s, u = S.urut[k]; S.urut[k] = {i, d: u?.i === i ? -u.d : i === 1 ? 1 : -1}; tandaiUrut(); return nanti(terapkanUrut); }
  const rw = e.target.closest("[data-riw]"); if (rw) return Riwayat.buka(rw.dataset.riw); const b = e.target.closest(".tb:not(.kepala)"); if (!b) return; S.jalur.length >= 2 ? Analisa.wilayah(b.dataset.k) : turun(b.dataset.k); });
/* seg "Posko" di panel disembunyikan (A24, ledger fitur-disembunyikan); sisa satu pilihan "Wilayah" tak berguna, jadi seluruh seg ikut hidden */
$("#panelMode").hidden = true; document.querySelector('#panelMode [data-m="posko"]').hidden = true;
$("#handle").onclick = () => $("#panel").classList.toggle("min");
$("#bahayaSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.b = b.dataset.b;
  $("#bahayaSeg").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); nanti(() => { Peta.aturWilayah(false); renderLegenda(); }); });

/* ---------- hari & mode ---------- */
/* "Kam, 15": tombol hari muat 4 kolom di kartu kanan (karhutla: "Sel, 13") */
const tglSingkat = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric"});
function renderHari() {
  $("#hariSeg").innerHTML = `<div class="seg penuh" style="box-shadow:none">${S.st.hari.map((t, i) => `<button data-i="${i}" aria-pressed="${S.hari === i}">${i ? tglSingkat(t) : "Hari ini"}</button>`).join("")}</div>`; }
$("#hariSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.hari = +b.dataset.i;
  $("#hariSeg").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); nanti(() => Peta.segarkan()); });
const setLapis = (k, on) => { const i = document.querySelector(`#lapis input[data-l="${k}"]`); if (i && i.checked !== on) { i.checked = on; i.dispatchEvent(new Event("change", {bubbles: true})); } };
$("#modePeta").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.mode = b.dataset.mp;
  $("#modePeta").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
  nanti(() => {
    if (peta.getLayer("sungai")) peta.setFilter("sungai", S.mode === "sungai" ? null : [">=", ["get", "k"], 0]);
    setLapis("wilayah", S.mode === "status" || S.mode === "riwayat"); setLapis("hujan", S.mode === "hujan"); setLapis("h3", false); setLapis("sungai", S.mode === "sungai"); setLapis("rob", S.mode === "rob");  /* Status = wilayah + Wilayah Siaga saja; peta penuh dibilang jelek (pemilik, 27 Okt 2026) */
    if (S.mode === "riwayat") Riwayat.pasang(); else Riwayat.lepas();
    Posko.tampil(S.mode !== "riwayat");
    renderLegenda();
  }); });
$("#lapis").addEventListener("change", e => { const i = e.target.closest("input"); if (!i || !peta) return;
  const k = i.dataset.l, map = {pos: [], hujanukur: [], peluang: [], kejadian: [], posko: ["posko", "posko-lbl"], wilayah: ["wil-fill"], sungai: ["sungai"], rob: ["rob"], satelit: ["satelit"]}[k];
  if (k === "hujan" || k === "h3") nanti(() => { Peta.pasangLapis("hujan"); if (!peta.getLayer("hujan")) return; const on = Peta.lihat("hujan") || Peta.lihat("h3"); peta.setLayoutProperty("hujan", "visibility", on ? "visible" : "none");
    const g = Peta.gambarHujan(); peta.getSource("hujan").updateImage({url: g.url, coordinates: g.kor}); renderLegenda(); });
  else { if (["sungai", "rob", "satelit"].includes(k)) Peta.pasangLapis(k); map.forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", i.checked ? "visible" : "none")); }
  if (k === "kejadian") KejAktif.tampil(i.checked);
  if (k === "pos") PosUkur.tampil(i.checked);
  if (k === "hujanukur") PosHujan.tampil(i.checked);
  if (k === "peluang") Eksp.tampil(i.checked);
  renderLegenda(); });
$("#lapisBtn").onclick = () => $("#lapis").classList.toggle("buka");
function renderLegenda() {
  const hj = Peta.terlihat("hujan") || Peta.terlihat("h3"), T = k => Peta.terlihat(k);
  $("#legenda").innerHTML = `<details ${legBuka ? "open" : ""} id="legDet"><summary class="lbl">Legenda <span>▾</span></summary><div class="lg-isi">
    ${S.mode === "riwayat" ? Riwayat.legenda() :
    T("wilayah") ? `<div class="lbl">Status ${NAMA_B[S.b]} per wilayah</div><div class="leg" style="margin:4px 0 8px">${[3, 2, 1].map(l => `<span><i class="sw" style="background:${WARNA_LV[l]}"></i>${LEVEL[l]}</span>`).join("")}</div>` : ""}
    ${T("kejadian") && KejAktif.K?.length ? `<div class="lbl">Wilayah Siaga (prakiraan)</div><div class="leg" style="margin:4px 0 8px">${[3, 2].map(l => `<span><i class="sw dot" style="background:${WARNA_LV[l]}"></i>${LEVEL[l]}</span>`).join("")}</div>` : ""}
    ${T("sungai") ? `<div class="lbl">Debit sungai (GloFAS)</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw dot" style="background:#3f7fb8"></i>di bawah banjir 2 tahunan</span>${[1, 2, 3].map(l => `<span><i class="sw dot" style="background:${WARNA_LV[l]}"></i>≥ banjir ${[0, 2, 5, 20][l]} tahunan</span>`).join("")}</div>` : ""}
    ${T("rob") && S.rob ? `<div class="lbl">Pasang laut (rob)</div><div class="leg" style="margin:4px 0 8px"><span><b style="color:#2b8c86">▲</b> normal</span>${[1, 2, 3].map(l => `<span><b style="color:${WARNA_LV[l]}">▲</b> ${["", "≥ persentil 95", "≥ persentil 99", "di atas rekor"][l]}</span>`).join("")}</div>` : ""}
    ${hj ? `<div class="lbl">${Peta.lihat("h3") && !Peta.lihat("hujan") ? "Hujan 3 hari puncak" : "Hujan harian"} (model Open-Meteo, mm)</div><div class="legscale">${[3, 12, 35, 75, 125, 200].map(v => `<i style="background:rgb(${gradasi(ST_HUJAN, v).slice(0, 3).join(",")})"></i>`).join("")}</div>
      <div class="legnum">${(Peta.lihat("h3") && !Peta.lihat("hujan") ? [5, 25, 70, 150, 250, 400] : [1, 20, 50, 100, 150, 250]).map(v => `<span>${v}</span>`).join("")}</div>` : ""}${PosUkur.legenda()}${Eksp.legenda()}${typeof Posko !== "undefined" ? Posko.legenda() : ""}</div></details>`;
  LG?.susunLegenda($("#legenda"), {saatBuka: o => legBuka = o}); }

/* Riwayat (mode peta) dan Tren ada di skrip kedua: lihat 'riwayat & tren' */
/* ================================================================ popup analisa */
const lipat = (judul, isi, buka = true) => `<details class="lipat" ${buka ? "open" : ""}><summary>${judul}</summary><div class="isi">${isi}</div></details>`;
const kot = (l, v, s) => `<div class="kpi"><span class="lbl">${l}</span><b>${v}</b><small>${s}</small></div>`;
const km = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
/* grafik batang hujan 10 hari (3 lalu + 7 prakiraan), garis ambang 50 & 100 mm */
function grafikHujan(c) {
  const H = S.hujan, W = 660, B = 130, m = Math.max(110, ...c.h), gap = W / c.h.length, iH = H.hari.indexOf(H.hari_ini);
  let g = [50, 100].map(v => `<line x1="0" x2="${W}" y1="${B - v / m * 110}" y2="${B - v / m * 110}" stroke="currentColor" stroke-dasharray="4 3" opacity=".35"/><text x="${W}" y="${B - v / m * 110 - 4}" text-anchor="end" font-size="10" opacity=".6">${v} mm</text>`).join("");
  c.h.forEach((v, j) => { const h = (v || 0) / m * 110, lalu = j < iH;
    g += `<rect x="${j * gap + gap * .15}" y="${B - h}" width="${gap * .7}" height="${Math.max(1, h)}" rx="3" fill="rgb(${gradasi(ST_HUJAN, Math.max(v, 8)).slice(0, 3).join(",")})" opacity="${lalu ? .55 : 1}" data-tip="<b>${tglPendek(H.hari[j])}</b>${lalu ? " · teramati" : " · prakiraan"}<br>${fmt(v)} mm (${kelasHujan(v)})${c.p?.[j] != null ? `<br>peluang hujan ${c.p[j]}%` : ""}"/>
      <text x="${j * gap + gap / 2}" y="${B - h - 4}" text-anchor="middle" font-size="10.5" font-weight="700">${v >= 1 ? fmt(Math.round(v)) : ""}</text>
      <text x="${j * gap + gap / 2}" y="${B + 14}" text-anchor="middle" font-size="10" opacity="${j === iH ? 1 : .65}" font-weight="${j === iH ? 800 : 400}">${j === iH ? "Hari ini" : H.hari[j].slice(8) + "/" + H.hari[j].slice(5, 7)}</text>`; });
  return `<svg viewBox="0 -12 ${W} ${B + 22}" width="100%" role="img" aria-label="Hujan harian">${g}</svg>`; }
/* hidrograf sungai: debit ansambel rata-rata dan maksimum vs Q2/Q5/Q20 */
function grafikSungai(t) {
  const hr = S.sungai.hari, W = 660, B = 140, ada = t.q2 != null, qMax = Math.max(...t.qmax.map(x => x || 0), ...t.q.map(x => x || 0)) || 1,
    /* skala mengikuti debit; ambang yang jauh di atas cukup disebut, supaya kurva tidak gepeng di dasar */
    m = ada && t.q2 <= qMax * 2.5 ? Math.max(qMax, t.q20 <= qMax * 2.5 ? t.q20 : t.q5 <= qMax * 2.5 ? t.q5 : t.q2) * 1.12 : qMax * 1.25, X = j => j / (hr.length - 1) * (W - 40) + 20, Y = v => B - v / m * 120;
  /* label ambang di kiri-kanan bergantian supaya tidak bertumpuk */
  let g = ada ? [[t.q2, 1], [t.q5, 2], [t.q20, 3]].filter(([q]) => q <= m).map(([q, l], i) => `<line x1="20" x2="${W - 20}" y1="${Y(q)}" y2="${Y(q)}" stroke="${WARNA_LV[l]}" stroke-dasharray="5 3"/><text x="${i % 2 ? 24 : W - 20}" y="${Y(q) - 4}" text-anchor="${i % 2 ? "start" : "end"}" font-size="10.5" font-weight="700" style="fill:${WARNA_LV[l]}">banjir ${[0, 2, 5, 20][l]} tahunan · ${fmt(Math.round(q))} m³/s</text>`).join("")
    : `<text x="${W / 2}" y="14" text-anchor="middle" font-size="11" opacity=".7">Ambang banjir titik ini belum dihitung (diisi bertahap tiap hari)</text>`;
  if (ada && t.q2 > m) g += `<text x="${W / 2}" y="2" text-anchor="middle" font-size="11" font-weight="700" style="fill:${WARNA_LV[1]}">Ambang banjir 2 tahunan ${fmt(Math.round(t.q2))} m³/s jauh di atas debit saat ini (${Math.round(qMax / t.q2 * 100)}%)</text>`;
  g += [0, .5, 1].map(f => `<text x="16" y="${Y(m * f) + 4}" text-anchor="end" font-size="9.5" opacity=".55">${rb(m * f)}</text>`).join("");
  g += `<path d="${t.qmax.map((v, j) => (j ? "L" : "M") + X(j) + "," + Y(v || 0)).join("")} ${t.q.map((v, j) => "L" + X(hr.length - 1 - j) + "," + Y(t.q[hr.length - 1 - j] || 0)).join("")}Z" fill="#3f7fb8" opacity=".15"/>`;
  g += `<path d="${t.q.map((v, j) => (j ? "L" : "M") + X(j) + "," + Y(v || 0)).join("")}" fill="none" stroke="#3f7fb8" stroke-width="2.5"/>`;
  g += t.q.map((v, j) => `<circle cx="${X(j)}" cy="${Y(v || 0)}" r="3.5" fill="#3f7fb8" data-tip="<b>${tglPendek(hr[j])}</b><br>debit ${fmt(Math.round(v))} m³/s (maks ansambel ${fmt(Math.round(t.qmax[j]))})"/><text x="${X(j)}" y="${B + 14}" text-anchor="middle" font-size="10" opacity=".65">${hr[j].slice(8)}/${hr[j].slice(5, 7)}</text>`).join("");
  return `<svg viewBox="0 -8 ${W} ${B + 22}" width="100%" role="img" aria-label="Debit sungai">${g}</svg>`; }
const Analisa = {
  /* laci rincian di kanan (seperti Laci karhutla); di tab lain jatuh ke dialog tengah. kepala = lambang + <div><h3>nama</h3><p>jenis · induk</p></div> */
  buka(html, kepala) {
    const el = $("#laci"), diPeta = !!document.querySelector("#p-peta.on");
    if (!diPeta || !el) { const d = $("#dlg"); d.innerHTML = `<div class="dh">${kepala}<button aria-label="Tutup" data-tutup>×</button></div><div class="db">${html}</div>`;
      d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = e => this.klik(e, () => d.close()); d.showModal(); return; }
    const m = kepala.match(/^(.*?)<div><h3[^>]*>(.*?)<\/h3><p>(.*?)<\/p><\/div>$/s) || [0, "", kepala, ""], [ey, ...sisa] = m[3].split(" · ");
    el.innerHTML = `<div class="hd">${m[1]}<div class="hd-isi"><span class="hd-ey">${ey || "Rincian"}</span><h2 id="dlgJudul" title="${m[2].replace(/<[^>]+>/g, "")}">${m[2]}</h2>${sisa.length ? `<div class="hd-meta"><span>${sisa.join(" · ")}</span></div>` : ""}</div>
      <div class="hd-aksi"><button class="tutup ik-btn" aria-label="Tutup" title="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
      <div class="bd" style="display:grid;gap:10px">${html}</div>`;
    if (el._tarik) el.appendChild(el._tarik);
    el.classList.add("on"); el.querySelector(".tutup").onclick = () => el.classList.remove("on");
    el.onclick = e => this.klik(e); },
  klik(e, sebelum) { const s = e.target.closest("[data-sg]"); if (s) { sebelum?.(); return this.sungai(+s.dataset.sg); } const w = e.target.closest("[data-wil]"); if (w) { sebelum?.(); return this.wilayah(w.dataset.wil); } },
  wilayah(kunci) {
    const p = kunci.split("|"), jenis = ["prov", "kab", "kec"][p.length - 1], f = S.fiturWil?.find(x => x.properties.kunci === kunci);
    const [lat, lon] = f ? pusat(kunci) : [0, 0], c = selDekat(lat, lon), v = S.st.kec[kunci], ag = agregat(S.b, 0);
    const lvH = h => jenis === "kec" ? (v?.[S.b]?.[h] || 0) : (agregat(S.b, h)[kunci]?.lv || 0);
    const sg = S.sungai.titik.map((t, i) => ({...t, i, d: km(lat, lon, t.lat, t.lon)})).filter(t => t.d <= (jenis === "prov" ? 400 : jenis === "kab" ? 80 : 30)).sort((a, b) => b.kelas - a.kelas || a.d - b.d).slice(0, 6);
    const bh = S.bahaya[kunci], kj = S.kejadian, jn = S.b === "b" ? "banjir" : "longsor";
    const riw = jenis === "prov" ? kj?.prov?.[p[0]]?.[jn] : jenis === "kab" ? Object.fromEntries(Object.entries(kj?.kab?.[kunci]?.[jn] || {}).map(([t, n]) => [t, {kejadian: n}])) : null;
    const thR = riw ? Object.keys(riw).sort() : [], mR = Math.max(1, ...thR.map(t => riw[t].kejadian || 0));
    const nama = jenis === "prov" ? namaProv(p[0]) : p.at(-1), sub = {prov: "Provinsi", kab: "Kabupaten/kota · " + namaProv(p[0]), kec: "Kecamatan · " + p[1] + " · " + namaProv(p[0])}[jenis];
    const kepala = `${jenis === "prov" ? lambang(p[0]) : lambang(p[0], p[1])}<div><h3 id="dlgJudul">${esc(nama)}</h3><p>${esc(sub)}</p></div>`;
    const isi = `<div class="grid g4">${S.st.hari.map((t, h) => kot(h ? tglPendek(t) : "Hari ini", `<span style="color:${WARNA_LV[lvH(h)]}">${LEVEL[lvH(h)]}</span>`, NAMA_B[S.b])).join("")}</div>
      ${jenis === "kec" && Pra72.d ? lipat("Prakiraan 3 hari dan peluang", Pra72.isi(kunci)) + (Pra72.rob(kunci) ? lipat("Rob (status terpisah)", Pra72.rob(kunci), false) : "") : ""}
      ${jenis !== "kec" && ag[kunci] ? `<p class="fnd">Hari ini: ${[3, 2, 1].map(l => `${fmt(ag[kunci].n[l])} kecamatan ${LEVEL[l].toLowerCase()}`).join(" · ")}.</p>` : ""}
      ${c ? lipat("Hujan 10 hari · 3 hari teramati + 7 hari prakiraan", `${grafikHujan(c)}<div class="grid g4">${kot("Puncak 3 hari", fmt(Math.round(c.h3)) + " mm", kelasHujan(c.h3 / 3) + " rata-rata")}${kot("Hujan 7 hari lalu", fmt(Math.round(c.a7)) + " mm", c.a7 >= 150 ? "tanah jenuh" : c.a7 >= 70 ? "tanah basah" : "tanah relatif kering")}${kot("Hari hujan lebat", fmt(c.h.filter((x, j) => j >= S.hujan.hari.indexOf(S.hujan.hari_ini) && x >= 50).length), "≥ 50 mm, 7 hari")}${kot("Hembusan maks", fmt(Math.round(Math.max(...(c.g || [0])))) + " km/jam", "7 hari")}</div>
        <p class="fnd">Sel 0,25° terdekat (${f2(c.lat)}, ${f2(c.lon)}). Garis putus = 50 mm (lebat) dan 100 mm (sangat lebat), skala BMKG.</p>`) : ""}
      ${sg.length ? lipat("Sungai terdekat (GloFAS)", `<table class="tb3"><thead><tr><th>Titik sungai</th><th class="n">Puncak 7 hari</th><th class="n">Q2</th><th class="n">Jarak</th><th class="n">Status</th></tr></thead><tbody>${sg.map(t => `<tr data-sg="${t.i}" style="cursor:pointer"><td><b>${esc(t.kec)}</b><small>${esc(t.kab)}</small></td><td class="n num">${fmt(Math.round(t.puncak))} m³/s</td><td class="n num">${fmt(Math.round(t.q2))}</td><td class="n num">${fmt(Math.round(t.d))} km</td><td class="n">${pill(t.kelas)}</td></tr>`).join("")}</tbody></table><p class="fnd">Klik baris untuk hidrograf. Q2 = debit banjir 2 tahunan dari data 1997–2025.</p>`) : ""}
      ${bh ? lipat("Indeks bahaya InaRISK (0–1)", `<table class="tb2"><tbody>${[["banjir", "Banjir"], ["bandang", "Banjir bandang"], ["longsor", "Tanah longsor"], ["kering", "Kekeringan"], ["gelombang", "Gelombang ekstrem & abrasi"]].filter(([k]) => bh[k] != null).map(([k, n]) => `<tr><td>${n}</td><td class="n">${fmt(Math.round(bh[k] * 100) / 100)} · ${bh[k] >= .66 ? "tinggi" : bh[k] >= .33 ? "sedang" : "rendah"}</td></tr>`).join("")}</tbody></table><p class="fnd">Sampel raster InaRISK BNPB di titik tengah kecamatan.</p>`) : ""}
      ${thR.length ? lipat(`Kejadian ${NAMA_B[S.b]} tercatat BNPB`, `<svg viewBox="0 0 ${thR.length * 26} 90" width="100%" role="img" aria-label="Kejadian per tahun">${thR.map((t, j) => { const n = riw[t].kejadian || 0, h = n / mR * 64;
          return `<rect x="${j * 26 + 3}" y="${72 - h}" width="20" height="${Math.max(1, h)}" rx="3" fill="#3f7fb8" data-tip="<b>${t}</b><br>${fmt(n)} kejadian${riw[t].meninggal != null ? `<br>${fmt(riw[t].meninggal)} meninggal · ${rb(riw[t].terdampak || 0)} terdampak` : ""}"/><text x="${j * 26 + 13}" y="${68 - h}" text-anchor="middle" font-size="9.5">${n || ""}</text><text x="${j * 26 + 13}" y="86" text-anchor="middle" font-size="9" opacity=".6">${t.slice(2)}</text>`; }).join("")}</svg>
        <p class="fnd">Total ${fmt(thR.reduce((a, t) => a + (riw[t].kejadian || 0), 0))} kejadian, ${thR[0]}–${thR.at(-1)}. Sumber: BNPB (data.bnpb.go.id).</p>`, false) : ""}
      ${lipat("Tindakan yang disarankan", `<ul style="margin:0;padding-left:18px;font-size:12.5px">${AKSI[S.b][Math.max(...S.st.hari.map((_, h) => lvH(h)))].map(a => `<li>${esc(a)}</li>`).join("")}</ul>`)}
      <p class="fnd">Data ${jamWIB(S.meta.dibuat)}</p>`;
    this.buka(isi, kepala); },
  sungai(i) {
    const t = S.sungai.titik[i]; if (!t) return;
    const isi = `<div class="grid g4">${kot("Status", `<span style="color:${t.kelas ? WARNA_LV[t.kelas] : "inherit"}">${LEVEL[t.kelas]}</span>`, "puncak 7 hari")}${kot("Debit puncak", fmt(Math.round(t.puncak)) + " m³/s", "rata-rata ansambel")}${kot("Q2", t.q2 ? fmt(Math.round(t.q2)) : "–", "m³/s · banjir 2 tahunan")}${kot("Puncak ÷ Q2", t.q2 ? f2(t.puncak / t.q2) + "×" : "–", !t.q2 ? "ambang belum ada" : t.puncak >= t.q2 ? "di atas ambang" : "di bawah ambang")}</div>
      ${lipat("Hidrograf 10 hari", `${grafikSungai(t)}<p class="fnd">Garis biru = debit rata-rata ansambel GloFAS; pita = sampai maksimum ansambel. Garis putus = ambang periode ulang dari debit maksimum tiap tahun 1997–2025 (distribusi Gumbel). Angka kiri = m³/s.</p>`)}
      <p class="fnd">GloFAS memodelkan sungai besar pada kisi ± 5 km; sungai kecil dan banjir lokal (drainase kota, rob) tidak tertangkap. Koordinat ${f3(t.lat)}, ${f3(t.lon)}.</p>`;
    this.buka(isi, `<div><h3 id="dlgJudul">Sungai di ${esc(t.kec)}</h3><p>${esc(t.kab)} · ${esc(namaProv(t.prov))}</p></div>`); },
};

/* ================================================================ prakiraan per provinsi */
const Prakiraan = {
  render() {
    const pv = Object.keys(S.meta.provinsi).sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    const baris = pv.map(k => { const lv = S.st.hari.map((_, h) => agregat(S.b, h)[k]); const sel = S.hujan.grid.filter(g => g.prov === k);
      return {k, lv, h3: Math.max(0, ...sel.map(g => g.h3 || 0)), n: lv[0]?.n || [0, 0, 0, 0], skor: Math.max(...lv.map(a => a?.lv || 0)) * 1e6 + (lv[0]?.n[3] || 0) * 1e3 + (lv[0]?.n[2] || 0)}; }).sort((a, b) => b.skor - a.skor || b.h3 - a.h3);
    $("#prakiraan").innerHTML = `<div class="head"><div><h2>Prakiraan ${NAMA_B[S.b]} 4 hari · 38 provinsi</h2><p>Status tertinggi kecamatan di tiap provinsi per hari.</p></div>
      <div class="seg" id="pkB">${[["b", "Banjir"], ["l", "Longsor"]].map(([v, n]) => `<button data-b="${v}" aria-pressed="${S.b === v}">${n}</button>`).join("")}</div></div>
      <div class="tw"><table><thead><tr><th>Provinsi</th>${S.st.hari.map((t, h) => `<th>${h ? tglPendek(t) : "Hari ini"}</th>`).join("")}<th class="n">Awas hari ini</th><th class="n">Siaga hari ini</th><th class="n">Hujan 3 hari maks</th></tr></thead><tbody>
      ${baris.map(r => `<tr data-k="${r.k}" style="cursor:pointer"><td><b>${esc(namaProv(r.k))}</b></td>${r.lv.map(a => `<td>${a ? pill(a.lv) : `<span style="color:var(--ink2);font-size:12px">Normal</span>`}</td>`).join("")}
        <td class="n num">${r.n[3] ? `<b style="color:var(--bad)">${fmt(r.n[3])}</b>` : "–"}</td><td class="n num">${r.n[2] ? fmt(r.n[2]) : "–"}</td><td class="n num">${fmt(Math.round(r.h3))} mm</td></tr>`).join("")}</tbody></table></div>
      <p class="fnd" style="margin-top:8px">Klik provinsi untuk membukanya di peta. Hujan 3 hari maks = sel 0,25° terbasah di provinsi itu.</p>`;
    $("#pkB").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.b = b.dataset.b; $("#bahayaSeg").querySelector(`[data-b="${S.b}"]`).click(); nanti(() => this.render()); };
    $("#prakiraan").querySelector("tbody").onclick = e => { const tr = e.target.closest("[data-k]"); if (tr) { bukaTab("peta"); turun(tr.dataset.k); } }; },
};

/* ================================================================ riwayat & tren (setara Tren + Riwayat Posko Karhutla)
   Indeks risiko historis per bahaya dari data/riwayat.json (scripts/banjir/riwayat.py). Riwayat BNPB/DIBI dicatat per
   kabupaten/kota; skor kecamatan = skor kabupaten x (0,4 + 0,6 x bahaya InaRISK kecamatan). Rumus lengkap di bawah tab Tren. */
const KELAS_R = ["Rendah", "Sedang", "Tinggi", "Sangat tinggi"];
const NAMA_J = {banjir: "banjir", longsor: "tanah longsor", rob: "banjir rob"};
const DAS = i => BLN[Math.floor(i / 3)] + " " + ["awal", "tengah", "akhir"][i % 3];
const dasKini = () => { const t = new Date(Date.now() + 7 * 36e5); return t.getUTCMonth() * 3 + Math.min(2, Math.floor((t.getUTCDate() - 1) / 10)); };
/* satu warna, makin pekat makin sering: terbaca sama di tema terang dan gelap */
const warnaMusim = v => v < .05 ? "var(--surface)" : `color-mix(in oklch, #2f6fb8 ${Math.round(18 + v * 82)}%, transparent)`;
const sumA = a => a.reduce((x, y) => x + y, 0), f2 = x => (Math.round(x * 100) / 100).toFixed(2).replace(".", ","), f3 = x => (Math.round(x * 1000) / 1000).toFixed(3).replace(".", ",");
function bukaDlg(kepala, isi, klik) {
  const d = $("#dlg"); d.innerHTML = `<div class="dh">${kepala}<button aria-label="Tutup" data-tutup>×</button></div><div class="db">${isi}</div>`;
  d.querySelector("[data-tutup]").onclick = () => d.close();
  d.onclick = e => { if (e.target === d) return d.close(); klik && klik(e, d); };
  if (!d.open) d.showModal(); d.querySelector(".db").scrollTop = 0; }

const Riwayat = {
  R: null, grid: {}, gambar: {}, aktif: false, _titik: new Map(),
  jenisPeta() { return S.b === "l" ? "longsor" : "banjir"; },
  async muat() {
    if (this.R) return this.R;
    const [R, pk, ps] = await Promise.all([muatJSON("data/riwayat.json"), muatJSON("data/pusat_kec.json").catch(() => ({})), muatJSON("data/posko.json").catch(() => null)]);
    S.pusatKec = pk; S.posko = ps;
    if (!S.kejadian) S.kejadian = await muatJSON("data/kejadian.json").catch(() => null);
    return this.R = R; },
  /* satu wilayah -> catatan riwayat; kecamatan meminjam riwayat kabupatennya (BNPB/DIBI tidak mencatat kecamatan) */
  rec(kunci, j) {
    const J = this.R?.jenis[j]; if (!J) return null;
    const p = kunci.split("|"), t = ["prov", "kab", "kec"][p.length - 1], nama = t === "prov" ? namaProv(p[0]) : p.at(-1);
    if (t === "kec") { const k = J.kec[kunci], kb = J.kab[p[0] + "|" + p[1]]; if (!k || !kb) return null;
      return {...kb, kunci, tingkat: t, nama, prov: p[0], kab: p[1], skor: k[0], lv: k[1], kelas: KELAS_R[k[1]], skorKab: kb.skor, lvKab: kb.lv, hKec: S.bahaya[kunci]?.[J.lapis] ?? 0, j}; }
    const r = (t === "prov" ? J.prov : J.kab)[kunci]; if (!r) return null;
    return {...r, kunci, tingkat: t, nama, prov: p[0], kab: p[1], kelas: KELAS_R[r.lv], j}; },
  semua(j, t) { const J = this.R.jenis[j]; return Object.keys(t === "prov" ? J.prov : t === "kab" ? J.kab : J.kec).map(k => this.rec(k, j)); },
  /* titik wakil wilayah: titik tengah kecamatan; kab/prov = kecamatan yang paling dekat ke rata-rata titik kecamatannya (selalu di darat) */
  titik(kunci) {
    const P = S.pusatKec || {}; if (P[kunci]) return P[kunci]; if (this._titik.has(kunci)) return this._titik.get(kunci);
    const ks = Object.keys(P).filter(k => k.startsWith(kunci + "|")); let best = null;
    if (ks.length) { const m = [0, 1].map(i => sumA(ks.map(k => P[k][i])) / ks.length); let d = 1e9;
      for (const k of ks) { const x = (P[k][0] - m[0]) ** 2 + (P[k][1] - m[1]) ** 2; if (x < d) { d = x; best = P[k]; } } }
    this._titik.set(kunci, best); return best; },
  /* permukaan perkiraan tahun berkejadian per sel 0,1 derajat (gaya Windy): muda = jarang, tua = hampir tiap tahun */
  ST: [[0, [150, 190, 220, 0]], [.06, [150, 195, 225, 110]], [.2, [110, 170, 215, 165]], [.4, [70, 130, 195, 195]], [.6, [45, 95, 170, 215]], [.8, [45, 65, 140, 230]], [1, [70, 40, 105, 242]]],
  async raster() {
    const j = this.jenisPeta(), G = this.grid[j] ||= await muatJSON(j === "banjir" ? "data/riwayat_grid.json" : `data/riwayat_grid_${j}.json`);
    if (!this.gambar[j]) { const cv = document.createElement("canvas"); cv.width = G.w; cv.height = G.h; const ctx = cv.getContext("2d"), img = ctx.createImageData(G.w, G.h);
      for (const [ix, iy, f] of G.sel_data) { if (!f) continue; const c = gradasi(this.ST, f / G.tahun), o = (iy * G.w + ix) * 4; img.data.set([c[0], c[1], c[2], c[3]], o); }
      ctx.putImageData(img, 0, 0);
      const cv2 = document.createElement("canvas"); cv2.width = G.w * 2; cv2.height = G.h * 2; const c2 = cv2.getContext("2d"); c2.filter = "blur(1.2px)"; c2.drawImage(cv, 0, 0, cv2.width, cv2.height);
      this.gambar[j] = {url: cv2.toDataURL(), kor: [[G.x0, G.y1], [G.x0 + G.w * G.sel, G.y1], [G.x0 + G.w * G.sel, G.y1 - G.h * G.sel], [G.x0, G.y1 - G.h * G.sel]]}; }
    const g = this.gambar[j]; if (S.mode !== "riwayat") return;
    if (!peta.getSource("riwayat")) { peta.addSource("riwayat", {type: "image", url: g.url, coordinates: g.kor});
      peta.addLayer({id: "riwayat", type: "raster", source: "riwayat", paint: {"raster-opacity": .8, "raster-resampling": "linear", "raster-fade-duration": 0}}, "wil-line"); }
    else peta.getSource("riwayat").updateImage({url: g.url, coordinates: g.kor});
    peta.setLayoutProperty("riwayat", "visibility", "visible"); },
  baca(lng, lat) { const G = this.grid[this.jenisPeta()]; if (!G) return null; const ix = Math.floor((lng - G.x0) / G.sel), iy = Math.floor((G.y1 - lat) / G.sel);
    G._idx ||= new Map(G.sel_data.map(d => [d[0] + "," + d[1], d])); return G._idx.get(ix + "," + iy) || [ix, iy, 0, 0]; },
  async pasang() {
    try { await this.muat(); } catch (e) { return toast("Data riwayat belum tersedia"); }
    if (S.mode !== "riwayat") return;
    this.aktif = true; this._rj = null;
    if (!this._sl) { this._sl = true; peta.on("style.load", () => { if (S.mode === "riwayat") { this._ev = false; nanti(() => this.pasang()); } }); }
    peta.setPaintProperty("wil-fill", "fill-color", ["match", ["get", "rlv"], 3, WARNA_LV[3], 2, WARNA_LV[2], 1, WARNA_LV[1], 0, WARNA_LV[0], "rgba(0,0,0,0)"]);
    peta.setPaintProperty("wil-fill", "fill-opacity", ["case", ["boolean", ["feature-state", "hover"], false], .18, .06]);
    renderDaftar(); renderLegenda(); },
  lepas() {
    if (!this.aktif || !peta?.getLayer("wil-fill")) return; this.aktif = false;
    peta.setPaintProperty("wil-fill", "fill-color", ["match", ["get", "lv"], 3, WARNA_LV[3], 2, WARNA_LV[2], 1, WARNA_LV[1], "rgba(0,0,0,0)"]);
    peta.setPaintProperty("wil-fill", "fill-opacity", ["case", ["boolean", ["feature-state", "hover"], false], .75, .45]);
    if (peta.getLayer("riwayat")) peta.setLayoutProperty("riwayat", "visibility", "none");
    this.tampilLabel(false); $("#tip").classList.remove("on"); Peta.aturWilayah(false); },
  /* gelembung skor (gaya Windy): lingkaran warna kelas berisi skor; nama saat zoom >= 5,2; rincian saat hover; klik = analisa */
  label() {
    if (!peta || !this.R || !S.fiturWil || S.mode !== "riwayat") return;
    const j = this.jenisPeta(), n = this.R.jenis[j].tahun_cakup.length;
    if (this._rj !== j) { this._rj = j; this.raster().catch(() => {}); }
    const uniq = [...new Map(S.fiturWil.map(x => [x.properties.kunci, x])).values()];
    const f = uniq.map(x => { const r = this.rec(x.properties.kunci, j), c = r && this.titik(r.kunci); if (!r || !c) return null;
      return {type: "Feature", geometry: {type: "Point", coordinates: [c[1], c[0]]}, properties: {kunci: r.kunci, nama: r.nama, s: r.skor, lv: r.lv, tahun: r.tahun, th: n, total: r.total, kelas: r.kelas, puncak: r.puncak || "–", kec: r.tingkat === "kec" ? r.kab : ""}}; }).filter(Boolean);
    peta.getSource("wil").setData({type: "FeatureCollection", features: S.fiturWil.map(x => ({...x, properties: {...x.properties, rlv: this.rec(x.properties.kunci, j)?.lv ?? -1}}))});
    const data = {type: "FeatureCollection", features: f}, W = WARNA_LV;
    if (!peta.getSource("riw-lbl")) { peta.addSource("riw-lbl", {type: "geojson", data});
      peta.addLayer({id: "riw-bubble", type: "circle", source: "riw-lbl", layout: {"circle-sort-key": ["get", "s"]},
        paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["interpolate", ["linear"], ["get", "s"], 0, 9, 100, 15], 8, ["interpolate", ["linear"], ["get", "s"], 0, 13, 100, 20]],
          "circle-color": ["match", ["get", "lv"], 3, W[3], 2, W[2], 1, W[1], W[0]], "circle-stroke-color": "#fff", "circle-stroke-width": 2, "circle-opacity": .95}});
      peta.addLayer({id: "riw-angka", type: "symbol", source: "riw-lbl", layout: {"text-field": ["to-string", ["get", "s"]], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10.5, 8, 13], "text-font": ["Noto Sans Bold"], "text-allow-overlap": true, "symbol-sort-key": ["-", 100, ["get", "s"]]},
        paint: {"text-color": "#fff"}});
      peta.addLayer({id: "riw-nama", type: "symbol", source: "riw-lbl", minzoom: 5.2, layout: {"text-field": ["get", "nama"], "text-size": 11, "text-offset": [0, 1.7], "text-anchor": "top", "text-font": ["Noto Sans Bold"], "text-optional": true},
        paint: {"text-color": gelap() ? "#ffffff" : "#0b2545", "text-halo-color": gelap() ? "#0b1424" : "#ffffff", "text-halo-width": 1.6}}); }
    else peta.getSource("riw-lbl").setData(data);
    if (!this._ev) { this._ev = true; const tip = $("#tip"), taruh = e => { tip.classList.add("on"); tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.originalEvent.clientX + 14) + "px"; tip.style.top = Math.max(8, e.originalEvent.clientY - tip.offsetHeight - 12) + "px"; };
      peta.on("mousemove", "riw-bubble", e => { const p = e.features[0].properties; peta.getCanvas().style.cursor = "pointer"; this._diGelembung = true;
        tip.innerHTML = `<b>${esc(p.nama)}</b><br>Skor risiko <b>${p.s}</b> · ${esc(p.kelas)}<br>${p.kec ? "Riwayat Kab. " + esc(p.kec) + ": " : ""}berkejadian ${p.tahun} dari ${p.th} tahun<br>${fmt(p.total)} kejadian ${NAMA_J[this.jenisPeta()]} · puncak ${esc(p.puncak)}<br><small>klik untuk analisa</small>`; taruh(e); });
      peta.on("mouseleave", "riw-bubble", () => { this._diGelembung = false; peta.getCanvas().style.cursor = ""; tip.classList.remove("on"); });
      /* angka sel di bawah kursor */
      peta.on("mousemove", e => { if (S.mode !== "riwayat" || this._diGelembung) return; const G = this.grid[this.jenisPeta()], d = this.baca(e.lngLat.lng, e.lngLat.lat); if (!d) return;
        tip.innerHTML = d[2] ? `<b>± ${fmt(d[2])} dari ${G.tahun} tahun berkejadian</b><br>rata-rata ${fmt(d[3])} kejadian ${NAMA_J[this.jenisPeta()]} per tahun<br><small>sel ± 11 km · perkiraan dari kejadian kab/kota ${this.R.jenis[this.jenisPeta()].tahun_cakup[0]}–${this.R.jenis[this.jenisPeta()].tahun_cakup.at(-1)}</small>` : "Tidak ada kejadian tercatat di sini"; taruh(e); });
      peta.on("mouseout", () => tip.classList.remove("on")); }
    this.tampilLabel(true); },
  tampilLabel(on) { ["riw-bubble", "riw-angka", "riw-nama"].forEach(l => peta?.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none")); },
  /* panel kiri saat mode Riwayat: wilayah di tingkat ini menurut skor; klik = analisa */
  daftar() {
    const j = this.jenisPeta(), J = this.R.jenis[j], n = J.tahun_cakup.length, pv = S.jalur[0], o = pv && this.R.musim[j]?.[pv], g = "grid-template-columns:20px minmax(0,1fr) 40px 52px 96px";
    const item = [...new Set((S.fiturWil || []).map(f => f.properties.kunci))].map(k => this.rec(k, j) || {kunci: k, nama: S.fiturWil.find(f => f.properties.kunci === k).properties.nama, skor: -1}).sort((a, b) => b.skor - a.skor);
    const musim = o ? `<div style="padding:10px 10px 4px;font-size:12.5px"><div class="lbl">Periode rawan ${NAMA_J[j]} · ${esc(namaProv(pv))}</div>
      <div>Tahun La Niña <b>${Tren.siaga(o.p_la_nina)}</b> · tahun biasa <b>${Tren.siaga(o.p_biasa)}</b> · puncak <b>${DAS(o.puncak)}</b></div></div>` : "";
    $("#rows").innerHTML = musim + `<div class="tb kepala" style="${g}"><span></span><span>${["Provinsi", "Kabupaten / kota", "Kecamatan"][Math.min(S.jalur.length, 2)]}</span><span class="n">Skor</span><span class="n">Tahun</span><span style="text-align:right">Risiko</span></div>`
      + (item.map((r, i) => `<button class="tb" data-riw="${esc(r.kunci)}" style="${g}" title="${r.skor >= 0 ? `Berkejadian ${r.tahun} dari ${n} tahun, ${fmt(r.total)} kejadian ${J.tahun_cakup[0]}–${J.tahun_cakup.at(-1)}${r.tingkat === "kec" ? " (riwayat kab/kota)" : ""}` : "Belum ada kejadian tercatat"}">
        <span class="rk">${i + 1}</span><span style="font-weight:600">${esc(r.nama)}</span><span class="n" style="font-weight:700">${r.skor >= 0 ? r.skor : "–"}</span>
        <span class="n">${r.skor >= 0 ? r.tahun + "/" + n : "–"}</span><span style="text-align:right">${r.skor >= 0 ? `<span class="pill l${r.lv}">${r.kelas}</span>` : ""}</span></button>`).join("") || `<div class="kosong">Tidak ada wilayah di tingkat ini.</div>`);
    terapkanUrut(); this.label(); },
  legenda() {
    const j = this.jenisPeta(), J = this.R?.jenis[j]; if (!J) return `<div class="lbl">Memuat riwayat…</div>`;
    const n = J.tahun_cakup.length;
    return `<div class="lbl">Tahun berkejadian ${NAMA_J[j]} ${J.tahun_cakup[0]}–${J.tahun_cakup.at(-1)} (per sel ± 11 km)</div>
      <div class="legscale">${[.1, .25, .4, .55, .75, 1].map(v => `<i style="background:rgb(${gradasi(this.ST, v).slice(0, 3).join(",")})"></i>`).join("")}</div>
      <div class="legnum">${[.1, .25, .4, .55, .75, 1].map(v => `<span>${Math.round(v * n)}</span>`).join("")}</div>
      <div class="lbl" style="margin-top:8px">Skor risiko riwayat (lingkaran)</div><div class="leg" style="margin:4px 0 6px">${[3, 2, 1, 0].map(l => `<span><i class="sw dot" style="background:${WARNA_LV[l]}"></i>${KELAS_R[l]}</span>`).join("")}</div>
      <div class="leg" style="margin:0 0 6px"><span>Kejadian dicatat BNPB per kab/kota lalu dibagi ke kecamatan menurut bahaya InaRISK. Arahkan kursor untuk angka; klik lingkaran untuk analisa.</span></div>`; },
  buka(kunci) { const r = this.R && this.rec(kunci, this.jenisPeta()); if (r) Tren.rinci(r, true); else toast("Belum ada riwayat kejadian untuk wilayah ini"); },
};
