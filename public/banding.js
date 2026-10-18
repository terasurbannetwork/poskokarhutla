/* Banding: peta utama dibelah dua, geser pembatas untuk membandingkan dua sumber citra.
   Dua peta MapLibre tambahan (kiri A, kanan B) ditumpuk di atas peta utama, dibuat malas saat pertama dibuka.
   Kamera ketiga peta disinkronkan; titik panas & kompleks tetap di peta utama (pilihan kiri "Peta utama"). */
(() => {
  const GIBS = (lap, tgl, fmt = "jpg", lv = 9) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${lap}/default/${tgl}/GoogleMapsCompatible_Level${lv}/{z}/{y}/{x}.${fmt}`;
  const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const GFW = {hilang: "umd_tree_cover_loss", api: "umd_tree_cover_loss_from_fires"};
  const TH0 = 2001, TH1 = new Date().getUTCFullYear() - 1;   /* ponytail: GFW merilis tahunan; tahun rilis terakhir diperkirakan tahun berjalan - 1, bila rilis terlambat tahun itu ubin kosong (turunkan manual) */
  const hariKemarin = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tglPendek = t => `${+t.slice(8)} ${bulan[+t.slice(5, 7) - 1]} ${t.slice(0, 4)}`;
  /* sumber berpemilih tanggal: [lapisan GIBS, format, level matriks, zoom maks, atribusi]; HLS: PNG transparan, tidak ada tiap hari (jalur orbit) */
  const TGL = {
    sat: null,   /* VIIRS NOAA-20 (MODIS Terra sebelum 2018-03) */
    mt: ["MODIS_Terra_CorrectedReflectance_TrueColor", "jpg", 9, 9, "NASA GIBS / MODIS Terra"],
    ma: ["MODIS_Aqua_CorrectedReflectance_TrueColor", "jpg", 9, 9, "NASA GIBS / MODIS Aqua"],
    s2: ["HLS_S30_Nadir_BRDF_Adjusted_Reflectance", "png", 12, 12, "NASA GIBS / HLS Sentinel-2"],
    l8: ["HLS_L30_Nadir_BRDF_Adjusted_Reflectance", "png", 12, 12, "NASA GIBS / HLS Landsat 8/9"],
  };
  const NAMA = {sat: "Citra", mt: "MODIS Terra", ma: "MODIS Aqua", s2: "Sentinel-2 30 m", l8: "Landsat 30 m"};
  const hariLalu = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const JENIS = [["sat", "Citra satelit harian"], ["mt", "MODIS Terra harian"], ["ma", "MODIS Aqua harian"], ["s2", "Sentinel-2 30 m (HLS)"], ["l8", "Landsat 30 m (HLS)"], ["hilang", "Hutan hilang s.d. tahun"], ["api", "Hutan hilang akibat kebakaran s.d. tahun"], ["eox", "Komposit Sentinel-2 tahunan bebas awan"], ["esri", "Citra resolusi tinggi saat ini"], ["utama", "Peta utama (titik panas)"]];
  const yk = () => hariKemarin();
  const PRESET = [
    ["Citra 2019 vs 2026 (tanggal sama)", "Citra harian, tanggal kalender yang sama", () => [{j: "sat", tgl: "2019" + yk().slice(4)}, {j: "sat", tgl: yk()}]],
    [`Hutan hilang s.d. 2010 vs s.d. ${TH1}`, "Hutan hilang kumulatif sejak 2001", () => [{j: "hilang", th: 2010}, {j: "hilang", th: TH1}]],
    [`Hutan hilang akibat api s.d. 2015 vs s.d. ${TH1}`, "Hutan hilang akibat kebakaran kumulatif sejak 2001", () => [{j: "api", th: 2015}, {j: "api", th: TH1}]],
  ];
  let cfgGFW = null, terbuka = false, membuka = false, dibuat = false, p = 50, rafP = 0, kunci = false;
  const sisi = [{j: "sat", tgl: "2019" + yk().slice(4)}, {j: "sat", tgl: yk()}];
  const el = {}, maps = [null, null];

  const tiles = (j, th) => (cfgGFW?.lapisan[j === "api" ? "hilang_api" : "hilang"].tiles[0] || "")
    .replace(/umd_tree_cover_loss(_from_fires)?/, GFW[j]).replace(/start_year=\d+/, "start_year=" + TH0).replace(/end_year=\d+/, "end_year=" + th);
  function gaya(s) {
    const src = {}, lay = [{id: "bg", type: "background", paint: {"background-color": "#1b2430"}}];
    const esri = () => { src.esri = {type: "raster", tiles: [ESRI], tileSize: 256, maxzoom: 18, attribution: "Citra © Esri, Maxar, Earthstar"}; lay.push({id: "esri", type: "raster", source: "esri"}); };
    if (TGL[s.j]) { const [lap, fmt, lv, mz, at] = TGL[s.j];
      src.sat = {type: "raster", tiles: [GIBS(lap, s.tgl, fmt, lv)], tileSize: 256, minzoom: 1, maxzoom: mz, attribution: "Citra: " + at};
      lay.push({id: "sat", type: "raster", source: "sat", paint: {"raster-fade-duration": 0}}); }
    else if (s.j === "sat") { const lap = s.tgl < "2018-03-01" ? "MODIS_Terra_CorrectedReflectance_TrueColor" : "VIIRS_NOAA20_CorrectedReflectance_TrueColor";
      src.sat = {type: "raster", tiles: [GIBS(lap, s.tgl)], tileSize: 256, minzoom: 1, maxzoom: 9, attribution: "Citra: NASA GIBS / " + (lap[0] === "M" ? "MODIS Terra" : "VIIRS NOAA-20")};
      lay.push({id: "sat", type: "raster", source: "sat", paint: {"raster-fade-duration": 0}}); }
    else if (s.j === "eox") {   /* EOX s2cloudless: 2016 = CC BY 4.0 (lapisan tanpa tahun), 2017 CC BY 4.0, 2018+ CC BY-NC-SA 4.0 */
      src.eox = {type: "raster", tiles: [`https://tiles.maps.eox.at/wmts/1.0.0/${s.th === 2016 ? "s2cloudless_3857" : `s2cloudless-${s.th}_3857`}/default/g/{z}/{y}/{x}.jpg`], tileSize: 256, maxzoom: 13,
        attribution: `Sentinel-2 cloudless – <a href="https://s2maps.eu" target="_blank" rel="noopener">https://s2maps.eu</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data ${s.th === 2018 ? "2017 &amp; 2018" : s.th})`};
      lay.push({id: "eox", type: "raster", source: "eox", paint: {"raster-fade-duration": 0}}); }
    else if (s.j === "esri") esri();
    else { esri(); const c = cfgGFW.lapisan.hilang;
      src.gfw = {type: "raster", tiles: [tiles(s.j, s.th)], tileSize: 512, minzoom: 3, maxzoom: 12, attribution: c.atribusi};
      lay.push({id: "gfw", type: "raster", source: "gfw", paint: {"raster-opacity": .92, "raster-fade-duration": 0}}); }
    return {version: 8, sources: src, layers: lay};
  }
  const label = s => s.j in NAMA ? [s.tgl.slice(0, 4), NAMA[s.j] + " " + tglPendek(s.tgl)] : s.j === "esri" ? ["Kini", "Citra resolusi tinggi"] : s.j === "utama" ? ["Kini", "Peta utama"]
    : s.j === "eox" ? [s.th, "Sentinel-2 bebas awan"] : [s.th, (s.j === "api" ? "Hutan hilang akibat api" : "Hutan hilang") + " s.d. " + s.th];

  /* ---------- pembatas: satu tulis CSS per frame ---------- */
  function atur(v) { p = Math.max(0, Math.min(100, v)); if (rafP) return;
    rafP = requestAnimationFrame(() => { rafP = 0; el.root.style.setProperty("--p", p + "%"); el.gar.setAttribute("aria-valuenow", Math.round(p)); }); }
  function bangunPembatas() {
    const g = el.gar; let r = null;
    g.onpointerdown = e => { r = el.root.getBoundingClientRect(); g.setPointerCapture(e.pointerId); el.root.classList.add("geser"); e.preventDefault(); };
    g.onpointermove = e => { if (r) atur((e.clientX - r.left) / r.width * 100); };
    g.onpointerup = g.onpointercancel = () => { r = null; el.root.classList.remove("geser"); };
    g.onkeydown = e => { const d = {ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100}[e.key]; if (d != null) { atur(p + d); e.preventDefault(); } };
  }

  /* ---------- kamera: ketiga peta saling ikut, tanpa umpan balik ---------- */
  const sembunyi = m => m === maps[0] && sisi[0].j === "utama";
  /* saat move: hanya peta tambahan yang tampil (+ peta utama bila sisi kiri = "utama", karena itu yang terlihat);
     peta utama yang tertutup cukup disamakan sekali di moveend supaya lapisan Angin tidak membuat ulang partikel tiap frame */
  function ikut(sumber) { for (const ev of ["move", "moveend"]) sumber.on(ev, () => { if (kunci || !terbuka) return; kunci = true;
    const c = {center: sumber.getCenter(), zoom: sumber.getZoom()};
    [peta, ...maps].forEach(m => m && m !== sumber && !sembunyi(m) && (m !== peta || ev === "moveend" || sisi[0].j === "utama") && m.jumpTo(c)); kunci = false; }); }

  const kunciGaya = s => [s.j, s.tgl, s.th].join("|"), terpasang = [null, null];
  function etiket(i) {
    const s = sisi[i], [a, b] = label(s); el.sisi[i].hidden = s.j === "utama"; el.atr.hidden = sisi[0].j !== "utama";
    el.chip[i].innerHTML = `<b>${a}</b><span>${b}</span>`; }
  /* setStyle hanya bila gaya berubah; dipanggil lewat nanti() supaya klik tidak menunggu pembuatan gaya */
  function muatGaya(i) {
    const s = sisi[i], m = maps[i]; if (!m || s.j === "utama") return;
    if (terpasang[i] !== kunciGaya(s)) { terpasang[i] = kunciGaya(s); m.setStyle(gaya(s), {diff: false}); }
    requestAnimationFrame(() => { m.resize(); m.jumpTo({center: peta.getCenter(), zoom: peta.getZoom()}); }); }

  /* ---------- pemilih sumber ---------- */
  function popover(i) {
    const s = sisi[i], po = el.po[i];
    if (!po.hidden && po.dataset.buka) { po.hidden = true; delete po.dataset.buka; el.chip[i].setAttribute("aria-expanded", "false"); return; }
    el.po[1 - i].hidden = true; delete el.po[1 - i].dataset.buka;
    const th = s.th || TH1;
    po.innerHTML = JENIS.filter(([k]) => k !== "utama" || i === 0).map(([k, n]) => `<button type="button" data-j="${k}" aria-pressed="${k === s.j}">${n}</button>`).join("")
      + (s.j in NAMA ? `<label class="bd-in">Tanggal<input type="date" min="2000-02-24" max="${hariKemarin()}" value="${s.tgl}"></label>` : "")
      + (s.j === "hilang" || s.j === "api" || s.j === "eox" ? `<label class="bd-in">Tahun<input type="range" min="${s.j === "eox" ? 2016 : TH0}" max="${TH1}" value="${th}"><output>${th}</output></label>` : "");
    po.hidden = false; po.dataset.buka = 1; el.chip[i].setAttribute("aria-expanded", "true");
  }
  function ganti(i, n) { sisi[i] = {...sisi[i], ...n}; etiket(i); nanti(() => muatGaya(i)); }
  function aturSumber(i, po) {
    po.onclick = e => { const b = e.target.closest("button[data-j]"); if (!b) return; const j = b.dataset.j; const s = sisi[i];
      const n = j in NAMA ? {j, tgl: j === "s2" || j === "l8" ? (s.j === j ? s.tgl : hariLalu(10)) : s.tgl || (i ? yk() : "2019" + yk().slice(4))} : j === "hilang" || j === "api" || j === "eox" ? {j, th: s.th && (j !== "eox" || s.th >= 2016) ? s.th : (i ? TH1 : j === "eox" ? 2019 : TH0)} : {j};
      sisi[i] = {...s, ...n}; delete po.dataset.buka; popover(i);   /* popover & chip dulu, gaya menyusul */
      etiket(i); nanti(() => muatGaya(i)); };
    po.oninput = e => { const t = e.target; clearTimeout(po._t);
      if (t.type === "date") po._t = setTimeout(() => /^\d{4}-\d\d-\d\d$/.test(t.value) && t.value <= hariKemarin() && ganti(i, {tgl: t.value}), 150);
      else if (t.type === "range") { t.nextElementSibling.textContent = t.value; po._t = setTimeout(() => ganti(i, {th: +t.value}), 150); } };
  }

  /* ---------- membuka & menutup ---------- */
  async function kerangka() {
    cfgGFW = await fetch("data/lapisan_tambahan.json").then(r => r.json()).catch(() => null);
    if (!cfgGFW) { document.getElementById("bdBuka").title = "Data lapisan gagal dimuat"; return false; }
    const root = el.root = document.createElement("div"); root.id = "bd"; root.hidden = true;
    root.innerHTML = `<div class="bd-s bd-a"><div class="bd-m"></div></div><div class="bd-s bd-b"><div class="bd-m"></div></div>
      <div class="bd-gar" role="slider" tabindex="0" aria-label="Pembatas banding, geser kiri atau kanan" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><i></i><span aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 7-5 5 5 5M15 7l5 5-5 5"/></svg></span></div>
      <div class="bd-chip bd-ka"><button type="button" aria-haspopup="true" aria-expanded="false" aria-label="Sumber kiri"></button><div class="bd-po" hidden></div></div>
      <div class="bd-chip bd-ki"><button type="button" aria-haspopup="true" aria-expanded="false" aria-label="Sumber kanan"></button><div class="bd-po" hidden></div></div>
      <div class="bd-bar"></div><div class="bd-atr" hidden>© OpenFreeMap © OpenMapTiles Data dari OpenStreetMap</div>`;
    $("#p-peta").appendChild(root);
    el.gar = root.querySelector(".bd-gar"); el.sisi = [...root.querySelectorAll(".bd-s")]; el.atr = root.querySelector(".bd-atr");
    el.chip = [...root.querySelectorAll(".bd-chip > button")]; el.po = [...root.querySelectorAll(".bd-po")];
    el.chip.forEach((b, i) => { b.onclick = () => popover(i); aturSumber(i, el.po[i]); });
    const bar = root.querySelector(".bd-bar");
    bar.innerHTML = PRESET.map(([n, t], k) => `<button type="button" data-k="${k}" title="${t}">${n}</button>`).join("") + `<button type="button" class="bd-x" aria-label="Tutup banding" title="Tutup banding"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>Tutup</button>`;
    bar.onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.classList.contains("bd-x")) return tutup();
      const [a, c] = PRESET[b.dataset.k][2](); sisi[0] = a; sisi[1] = c; atur(50); etiket(0); etiket(1); nanti(() => { muatGaya(0); muatGaya(1); }); };
    bangunPembatas();
    return true;
  }
  /* dua peta dibuat sesudah kerangka tampil (nanti), supaya klik pertama tidak membeku */
  function buatPeta() {
    const root = el.root; terpasang[0] = kunciGaya(sisi[0]); terpasang[1] = kunciGaya(sisi[1]);
    [0, 1].forEach(i => { const m = maps[i] = new maplibregl.Map({container: root.querySelectorAll(".bd-m")[i], style: gaya(sisi[i]), center: peta.getCenter(), zoom: peta.getZoom(), minZoom: 3, maxZoom: 15,
      attributionControl: false, dragRotate: false, pitchWithRotate: false});
      m.touchZoomRotate.disableRotation();
      m.addControl(new maplibregl.AttributionControl({compact: true}), i ? "bottom-right" : "bottom-left");
      if (i) m.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
      ikut(m); });
    ikut(peta); dibuat = true;
  }
  async function buka() {
    if (terbuka || membuka) return; membuka = true;
    const tombol = $("#bdBuka"); tombol.setAttribute("aria-pressed", "true");
    if (!el.root && !(await kerangka())) { tombol.setAttribute("aria-pressed", "false"); membuka = false; return; }
    el.root.hidden = false; $("#p-peta").classList.add("banding"); etiket(0); etiket(1); el.gar.focus({preventScroll: true});
    if (!dibuat) { await new Promise(r => nanti(r)); buatPeta(); }
    terbuka = true; membuka = false;
    nanti(() => { muatGaya(0); muatGaya(1); });
  }
  function tutup() {
    if (!terbuka) return; terbuka = false; el.root.hidden = true; el.po.forEach(x => x.hidden = true);
    $("#p-peta").classList.remove("banding"); $("#bdBuka").setAttribute("aria-pressed", "false"); $("#bdBuka").focus({preventScroll: true});
    requestAnimationFrame(() => peta.resize());
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && terbuka) tutup(); });
  const t = document.getElementById("bdBuka"); if (t) t.onclick = () => terbuka ? tutup() : buka();
  window.Banding = {buka, tutup};
})();
