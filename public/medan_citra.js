/* medan_citra.js: dua tombol Overlay di peta utama (pemilik 24 Nov 2026, "sekalian citra harian").
   - harian: citra satelit harian. Zoom < 9: VIIRS NOAA-20 true color lintasan siang terbaru (NASA GIBS, ±375 m, asap terlihat).
     Zoom >= 9: mozaik Sentinel-2 L2A 14 hari terakhir, adegan terbaru di atas (Planetary Computer, 10 m). Bisa berawan; tidak disaring awan
     supaya asap tetap tampil.
   - medan: medan 3D (AWS Terrain Tiles terrarium, sama dengan sim_3d.js), kemiringan 60 derajat, putar dengan klik kanan atau dua jari.
   Lapisan citra ditaruh di bawah lapisan data (sebelum lapisan geojson pertama) dan dipasang ulang sesudah ganti tema. */
(() => {
  const VIIRS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg";
  const PC = "https://planetarycomputer.microsoft.com/api/data/v1/mosaic";
  const DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
  const A = {harian: false, medan: false};

  /* searchid mozaik Sentinel-2 per hari, disimpan di sessionStorage supaya tidak mendaftar ulang tiap nyala */
  const s2 = async () => {
    const hari = new Date().toISOString().slice(0, 10), k = "s2cari:" + hari, ada = sessionStorage.getItem(k);
    if (ada) return ada;
    const dari = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const r = await fetch(PC + "/register", {method: "POST", headers: {"content-type": "application/json"},
      body: JSON.stringify({collections: ["sentinel-2-l2a"], datetime: `${dari}T00:00:00Z/${hari}T23:59:59Z`, sortby: [{field: "datetime", direction: "desc"}]})});
    if (!r.ok) throw new Error("Sentinel-2 " + r.status);
    const id = (await r.json()).searchid; sessionStorage.setItem(k, id); return id;
  };
  const bawahData = m => m.getStyle().layers.find(l => m.getSource(l.source)?.type === "geojson")?.id;

  async function nyalaHarian(m) {
    const di = bawahData(m);
    if (!m.getSource("harian-viirs")) m.addSource("harian-viirs", {type: "raster", tiles: [VIIRS], tileSize: 256, maxzoom: 9,
      attribution: '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA GIBS VIIRS</a>'});
    if (!m.getLayer("harian-viirs")) m.addLayer({id: "harian-viirs", type: "raster", source: "harian-viirs", maxzoom: 9, paint: {"raster-fade-duration": 0}}, di);
    let id; try { id = await s2(); } catch (e) { console.warn("medan_citra", e.message); return; }
    if (!A.harian) return;   /* dimatikan selagi menunggu */
    if (!m.getSource("harian-s2")) m.addSource("harian-s2", {type: "raster", tileSize: 256, minzoom: 8, maxzoom: 14,
      tiles: [`${PC}/${id}/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=sentinel-2-l2a&assets=visual&nodata=0`],
      attribution: '<a href="https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a" target="_blank" rel="noopener">Sentinel-2 (ESA, Planetary Computer)</a>'});
    if (!m.getLayer("harian-s2")) m.addLayer({id: "harian-s2", type: "raster", source: "harian-s2", minzoom: 9}, bawahData(m));
  }
  const padamHarian = m => ["harian-s2", "harian-viirs"].forEach(l => m.getLayer(l) && m.removeLayer(l));

  function nyalaMedan(m, terbang) {
    if (!m.getSource("medan-dem")) m.addSource("medan-dem", {type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 15,
      attribution: '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">AWS Terrain Tiles</a>'});
    if (!m.getLayer("medan-bayang")) m.addLayer({id: "medan-bayang", type: "hillshade", source: "medan-dem",
      paint: {"hillshade-exaggeration": .3, "hillshade-shadow-color": "rgba(0,0,0,.45)", "hillshade-highlight-color": "rgba(255,255,255,.15)"}}, bawahData(m));
    m.setTerrain({source: "medan-dem", exaggeration: 1.5});
    m.setSky?.({"sky-color": "#9cc3e2", "horizon-color": "#e4eef5", "fog-color": "#e4eef5", "sky-horizon-blend": .5, "horizon-fog-blend": .6, "fog-ground-blend": .85});
    m.dragRotate.enable(); m.touchZoomRotate.enableRotation(); m.touchPitch?.enable();
    if (terbang) m.easeTo({pitch: 60, zoom: Math.max(m.getZoom(), 5), duration: 900});
  }
  function padamMedan(m) {
    m.setTerrain(null);
    if (m.getLayer("medan-bayang")) m.removeLayer("medan-bayang");
    m.dragRotate.disable(); m.touchZoomRotate.disableRotation();
    m.easeTo({pitch: 0, bearing: 0, duration: 600});
  }

  let terpasang = null;
  const pasangUlang = m => { if (terpasang === m) return; terpasang = m;
    m.on("style.load", () => { if (A.harian) nyalaHarian(m); if (A.medan) nyalaMedan(m, false); }); };

  window.MedanCitra = {
    lapis(k, on, m) {
      if (!m) return; pasangUlang(m); A[k] = on;
      try {
        if (k === "harian") on ? nyalaHarian(m) : padamHarian(m);
        if (k === "medan") on ? nyalaMedan(m, true) : padamMedan(m);
      } catch (e) { console.warn("medan_citra", e.message); }
    }
  };
})();
