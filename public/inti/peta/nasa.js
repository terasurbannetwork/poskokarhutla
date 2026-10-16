/* Lapisan satelit NASA (Eyes on the Earth / GIBS, tanpa kunci, CORS *), RENCANA-20-JAM.md §6. Satu modul untuk semua halaman:
   tiap peta memanggil NASA.pasang(peta, ["viirs", ...]) sesudah peta dibuat; modul ini menambah grup "Satelit NASA" ke panel Overlay
   (#lapis), dan ubinLapis halaman mengubah labelnya jadi ubin seperti lapisan lain. Waktu = "default" (citra terbaru di GIBS).
   Lapisan ditaruh di bawah lapisan data halaman (sebelum lapisan bersumber geojson pertama) supaya titik dan poligon tetap terlihat,
   dan dipasang ulang sesudah ganti tema (setStyle membuang lapisan). Diperiksa 17 Okt 2026: semua ubin 200 + CORS dari GIBS. */
(() => {
  const DASAR = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/";
  const L = {
    viirs: {nama: "Citra satelit kemarin (VIIRS)", id: "VIIRS_SNPP_CorrectedReflectance_TrueColor", tms: 9, ext: "jpg", op: 1},
    modis721: {nama: "Genangan air, MODIS 7-2-1", id: "MODIS_Terra_CorrectedReflectance_Bands721", tms: 9, ext: "jpg", op: 1},
    co: {nama: "Karbon monoksida AIRS (±5,5 km)", id: "AIRS_L3_Carbon_Monoxide_500hPa_Volume_Mixing_Ratio_Daily_Day", tms: 6, ext: "png", op: .75},
    imerg: {nama: "Hujan teramati GPM IMERG", id: "IMERG_Precipitation_Rate", tms: 6, ext: "png", op: .8},
    smap: {nama: "Kelembapan tanah SMAP", id: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", tms: 6, ext: "png", op: .8},
    suhu: {nama: "Suhu udara permukaan AIRS", id: "AIRS_L3_Surface_Air_Temperature_Daily_Day", tms: 6, ext: "png", op: .75},
  };
  const ATRIB = '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA EOSDIS GIBS</a>';
  const sumber = k => ({type: "raster", tileSize: 256, maxzoom: L[k].tms, attribution: ATRIB,
    tiles: [`${DASAR}${L[k].id}/default/default/GoogleMapsCompatible_Level${L[k].tms}/{z}/{y}/{x}.${L[k].ext}`]});

  function pasang(peta, ids) {
    const daftar = (ids || []).filter(k => L[k]), aktif = new Set(), lapis = document.getElementById("lapis");
    if (!peta || !daftar.length || !lapis) return;
    const bawahData = () => peta.getStyle().layers.find(l => peta.getSource(l.source)?.type === "geojson")?.id;
    const nyala = k => {
      if (!peta.getSource("nasa-" + k)) peta.addSource("nasa-" + k, sumber(k));
      if (!peta.getLayer("nasa-" + k)) peta.addLayer({id: "nasa-" + k, type: "raster", source: "nasa-" + k, paint: {"raster-opacity": L[k].op}}, bawahData());
    };
    const padam = k => { if (peta.getLayer("nasa-" + k)) peta.removeLayer("nasa-" + k); };
    const d = document.createElement("details"); d.open = true;
    d.innerHTML = `<summary>Satelit NASA</summary>` + daftar.map(k => `<label><input type="checkbox" data-l="nasa_${k}">${L[k].nama}</label>`).join("");
    lapis.append(d);
    d.addEventListener("change", e => { const i = e.target.closest("input[data-l^='nasa_']"); if (!i) return;
      const k = i.dataset.l.slice(5); i.checked ? aktif.add(k) : aktif.delete(k);
      requestAnimationFrame(() => { try { i.checked ? nyala(k) : padam(k); } catch (er) { console.warn("nasa", er.message); } }); });
    peta.on("style.load", () => aktif.forEach(k => { try { nyala(k); } catch (er) {} }));
  }
  window.NASA = {pasang, LAPIS: L};
})();
