/* Lapisan satelit NASA (Eyes on the Earth / GIBS, tanpa kunci, CORS *), RENCANA-20-JAM.md §6. Satu modul untuk semua halaman:
   tiap peta memanggil NASA.pasang(peta, ["imerg", ...]) sesudah peta dibuat; modul ini menambah ubinnya ke panel Overlay (grup "Satelit NASA" atau grup halaman yang ditunjuk)
   (#lapis), dan ubinLapis halaman mengubah labelnya jadi ubin seperti lapisan lain. Waktu = "default" (citra terbaru di GIBS).
   Lapisan ditaruh di bawah lapisan data halaman (sebelum lapisan bersumber geojson pertama) supaya titik dan poligon tetap terlihat,
   dan dipasang ulang sesudah ganti tema (setStyle membuang lapisan). Diperiksa 17 Okt 2026: semua ubin 200 + CORS dari GIBS. Citra VIIRS dibuang atas permintaan pemilik (sudah ada ubin Satelit). */
(() => {
  const DASAR = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/";
  const L = {
    modis721: {nama: "Genangan air, MODIS 7-2-1", pendek: "Genangan", id: "MODIS_Terra_CorrectedReflectance_Bands721", tms: 9, ext: "jpg", op: 1},
    co: {nama: "Karbon monoksida AIRS (±5,5 km)", pendek: "CO", id: "AIRS_L3_Carbon_Monoxide_500hPa_Volume_Mixing_Ratio_Daily_Day", tms: 6, ext: "png", op: .75},
    imerg: {nama: "Hujan teramati GPM IMERG", pendek: "Hujan satelit", id: "IMERG_Precipitation_Rate", tms: 6, ext: "png", op: .8},
    smap: {nama: "Kelembapan tanah SMAP", pendek: "Tanah SMAP", id: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", tms: 6, ext: "png", op: .8},
    suhu: {nama: "Suhu udara permukaan AIRS", pendek: "Suhu", id: "AIRS_L3_Surface_Air_Temperature_Daily_Day", tms: 6, ext: "png", op: .75},
  };
  /* AOD asap dan EFFIS DC kekeringan gambut: definisinya HANYA di data/lapisan_tambahan.json (sumber tunggal, juga dipakai lapisan5.js karhutla); dibaca di sini saat diminta
     dan dimasukkan ke L. Kunci L -> kunci JSON. AOD: waktu "default" (citra terbaru); EFFIS (WMS, TIME = hari ini UTC, prakiraan ECMWF). */
  const TAMBAH = {aod: ["gibs_aod", "Asap satelit"], effis_dc: ["effis_dc", "Kekeringan gambut"]};
  let janji = null;
  const muatTambahan = () => janji ||= fetch("/data/lapisan_tambahan.json").then(r => r.json()).then(j => { const hari = new Date().toISOString().slice(0, 10);
    for (const [k, [kj, pendek]] of Object.entries(TAMBAH)) { const c = j.lapisan?.[kj]; if (c) L[k] = {nama: c.nama, pendek, tms: c.maxzoom, op: c.opasitas, tileSize: c.tileSize, tiles: c.tiles.map(t => t.replace("{tgl}", kj === "gibs_aod" ? "default" : hari)), atrib: c.atribusi, legenda: c.legenda.map(([w, n]) => [w, (kj === "effis_dc" ? n.replace(/\d+,\d+/g, x => Math.round(parseFloat(x.replace(",", ".")))) : n)]), ket: kj === "effis_dc" ? "prakiraan hari ini" : null}; } }).catch(() => {});
  const ATRIB = '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA EOSDIS GIBS</a>';
  const sumber = k => ({type: "raster", tileSize: L[k].tileSize || 256, maxzoom: L[k].tms, attribution: L[k].atrib || ATRIB,
    tiles: L[k].tiles || [`${DASAR}${L[k].id}/default/default/GoogleMapsCompatible_Level${L[k].tms}/{z}/{y}/{x}.${L[k].ext}`]});

  /* ids: ["co", ...] masuk grup "Satelit NASA"; ["co", "Cuaca & asap"] masuk grup Overlay halaman yang judulnya sama (sebaris dengan
     ubin sejenis, mis. AQI dan Hujan di karhutla). Label ubin memakai nama pendek, nama lengkap + sumber di tooltip. */
  async function pasang(peta, ids) {
    if ((ids || []).some(x => TAMBAH[Array.isArray(x) ? x[0] : x])) await muatTambahan();
    const daftar = (ids || []).map(x => Array.isArray(x) ? x : [x, null]).filter(([k]) => L[k]), aktif = new Set(), lapis = document.getElementById("lapis");
    if (!peta || !daftar.length || !lapis) return;
    const bawahData = () => peta.getStyle().layers.find(l => peta.getSource(l.source)?.type === "geojson")?.id;
    const nyala = k => {
      if (!peta.getSource("nasa-" + k)) peta.addSource("nasa-" + k, sumber(k));
      if (!peta.getLayer("nasa-" + k)) peta.addLayer({id: "nasa-" + k, type: "raster", source: "nasa-" + k, paint: {"raster-opacity": L[k].op}}, bawahData());
    };
    const padam = k => { if (peta.getLayer("nasa-" + k)) peta.removeLayer("nasa-" + k); };
    const grup = judul => {
      const ada = [...lapis.querySelectorAll("details")].find(d => d.querySelector(":scope > summary")?.textContent.trim() === judul);
      if (ada) return ada;
      const d = document.createElement("details"); d.open = true; d.innerHTML = `<summary>${judul}</summary>`; lapis.append(d); return d;
    };
    for (const [k, g] of daftar) {
      const l = document.createElement("label");
      l.dataset.tip = `<b>${L[k].nama}</b><br>${L[k].atrib || "NASA EOSDIS GIBS"}, ${L[k].ket || "citra terbaru"}`;
      l.innerHTML = `<input type="checkbox" data-l="nasa_${k}">${L[k].pendek || L[k].nama}`;
      grup(g || "Satelit NASA").append(l);
    }
    lapis.addEventListener("change", e => { const i = e.target.closest("input[data-l^='nasa_']"); if (!i) return;
      const k = i.dataset.l.slice(5); i.checked ? aktif.add(k) : aktif.delete(k);
      (window.nanti || requestAnimationFrame)(() => { try { i.checked ? nyala(k) : padam(k); legendaku(); } catch (er) { console.warn("nasa", er.message); } }); });
    /* legenda: dititipkan ke #legenda halaman tiap kali halaman menulis ulangnya (seperti konteks.js) */
    const legendaku = () => { const isi = document.querySelector("#legenda .lg-isi"); if (!isi) return; isi.querySelectorAll(".lg-nasa").forEach(x => x.remove());
      isi.insertAdjacentHTML("beforeend", [...aktif].filter(k => L[k].legenda && peta.getLayer("nasa-" + k)).map(k => `<div class="lg-g lg-nasa"><div class="lbl">${L[k].nama.replace(" · ", ", ")}</div><div class="leg">${L[k].legenda.map(([w, n]) => `<span><i class="sw" style="background:${w}"></i>${n.replace(" · ", ", ")}</span>`).join("")}</div></div>`).join("")); };
    const lg = document.getElementById("legenda"); if (lg) new MutationObserver(legendaku).observe(lg, {childList: true});
    peta.on("style.load", () => aktif.forEach(k => { try { nyala(k); } catch (er) {} }));
  }
  window.NASA = {pasang, LAPIS: L};
})();
