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
  const TAMBAH = {aod: ["gibs_aod", "Asap satelit"], effis_dc: ["effis_dc", "Kekeringan gambut"], plkemenhut: ["plkemenhut", "Tutupan lahan 2025 (Kemenhut)"]};

  /* Klip ke Indonesia (permintaan pemilik 9 Nov 2026: overlay tidak mewarnai negara tetangga; peta dasar dan label tetap utuh, jadi DATA yang dipotong).
     Satu fungsi bersama, juga dipakai gfw() di lapisan5.js: NASA.klip(tiles) membungkus templat URL ubin raster menjadi "indo://{z}/{x}/{y}/<url asli>";
     protokol MapLibre `indo` mengambil ubin asli, memotongnya dengan batas Indonesia (data/geo/batas_indonesia.json, dibangun scripts/geo/bangun_batas_indonesia.py)
     di kanvas lepas-layar, dan mengembalikan PNG. Ubin di luar kotak Indonesia = PNG transparan tanpa fetch. Hanya MapLibre >= 4 dan peladen ber-CORS;
     geoportal Kemenhut dilewati (datanya sudah Indonesia saja, CORS-nya hanya untuk satu origin). Galat apa pun = ubin asli (batas gagal) atau kosong (fetch gagal), tanpa log.
     ponytail: koordinat batas dihitung dalam piksel ubin tanpa pra-potong, di zoom tinggi simpul jauh bisa meleset ~1 px; tambah pra-potong bila terlihat. */
  const PNG0 = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), c => c.charCodeAt(0)).buffer;
  let janjiBatas = null;
  const batas = () => janjiBatas ||= fetch("/data/geo/batas_indonesia.json").then(r => r.json()).then(j => j.cincin.map(v => { let x = v[0], y = v[1]; const p = [[x / j.skala, y / j.skala]];
    for (let i = 2; i < v.length; i += 2) { x += v[i]; y += v[i + 1]; p.push([x / j.skala, y / j.skala]); }
    return {p, x0: Math.min(...p.map(a => a[0])), x1: Math.max(...p.map(a => a[0])), y0: Math.min(...p.map(a => a[1])), y1: Math.max(...p.map(a => a[1]))}; }))
    .catch(e => { janjiBatas = null; throw e; });
  /* titik (lon, lat) di dalam Indonesia? B = hasil await NASA.batas() */
  const dalam = (B, lon, lat) => B.some(r => { if (lon < r.x0 || lon > r.x1 || lat < r.y0 || lat > r.y1) return false; let c = false;
    for (let i = 0, p = r.p; i < p.length; i++) { const [a, b] = p[i], [u, v] = p[i ? i - 1 : p.length - 1]; if ((b > lat) !== (v > lat) && lon < (u - a) * (lat - b) / (v - b) + a) c = !c; }
    return c; });
  /* bentuk ubin: bujur/lintang tepi z/x/y (Web Mercator) dan proyeksi ke piksel ubin */
  const ubinKotak = (z, x, y) => { const n = 2 ** z, la = t => Math.atan(Math.sinh(Math.PI * (1 - 2 * t / n))) * 180 / Math.PI; return {n, x0: x / n * 360 - 180, x1: (x + 1) / n * 360 - 180, y0: la(y + 1), y1: la(y)}; };
  const jalurCache = new Map();
  const jalur = (z, x, y, S, rs, n) => { const k = `${z}/${x}/${y}/${S}`; let P = jalurCache.get(k); if (P) return P; P = new Path2D();
    for (const r of rs) r.p.forEach(([lo, la], i) => { const s = Math.sin(la * Math.PI / 180), px = ((lo + 180) / 360 * n - x) * S, py = (.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n * S - y * S; i ? P.lineTo(px, py) : P.moveTo(px, py); }), P.closePath();
    if (jalurCache.size > 300) jalurCache.delete(jalurCache.keys().next().value); jalurCache.set(k, P); return P; };
  const penanganIndo = async (prm, ac) => {
    const m = /^indo:\/\/(\d+)\/(\d+)\/(\d+)\/(.+)$/.exec(prm.url); if (!m) return {data: PNG0};
    const [z, x, y] = [+m[1], +m[2], +m[3]]; let buf;
    try {
      const B = await batas(), K = ubinKotak(z, x, y), rs = B.filter(r => r.x1 >= K.x0 && r.x0 <= K.x1 && r.y1 >= K.y0 && r.y0 <= K.y1);
      if (!rs.length) return {data: PNG0};
      const res = await fetch(m[4], {signal: ac?.signal}); if (!res.ok) return {data: PNG0};
      buf = await res.arrayBuffer();
      const bm = await createImageBitmap(new Blob([buf])), W = bm.width, H = bm.height, c = new OffscreenCanvas(W, H), g = c.getContext("2d"), mk = new OffscreenCanvas(W, H), gm = mk.getContext("2d");
      const P = jalur(z, x, y, W, rs, K.n); gm.fillStyle = gm.strokeStyle = "#000"; gm.lineWidth = 2; gm.lineJoin = "round"; gm.fill(P); gm.stroke(P);   /* garis tepi menutup celah antarprovinsi */
      g.drawImage(bm, 0, 0); bm.close?.(); g.globalCompositeOperation = "destination-in"; g.drawImage(mk, 0, 0);
      return {data: await (await c.convertToBlob({type: "image/png"})).arrayBuffer()};
    } catch (e) { if (ac?.signal?.aborted) throw e; return {data: buf || PNG0}; }
  };
  let protokol = null;
  const klip = tiles => { if (protokol == null) { try { protokol = +(window.maplibregl?.version || "0").split(".")[0] >= 4 && typeof OffscreenCanvas !== "undefined" && typeof Path2D !== "undefined"; if (protokol) maplibregl.addProtocol("indo", penanganIndo); } catch (e) { protokol = false; } }
    return protokol ? tiles.map(t => /^https:/.test(t) && !/geoportal\.planologi/.test(t) ? `indo://{z}/{x}/{y}/${t}` : t) : tiles; };
  let janji = null;
  const muatTambahan = () => janji ||= fetch("/data/lapisan_tambahan.json").then(r => r.json()).then(j => { const hari = new Date().toISOString().slice(0, 10);
    for (const [k, [kj, pendek]] of Object.entries(TAMBAH)) { const c = j.lapisan?.[kj]; if (c) L[k] = {nama: kj === "plkemenhut" ? pendek : c.nama, pendek, minzoom: c.minzoom, tms: c.maxzoom, op: c.opasitas, tileSize: c.tileSize, tiles: c.tiles.map(t => t.replace("{tgl}", kj === "gibs_aod" ? "default" : hari)), atrib: c.atribusi, legenda: c.legenda.map(([w, n]) => [w, (kj === "effis_dc" ? n.replace(/\d+,\d+/g, x => Math.round(parseFloat(x.replace(",", ".")))) : n)]), ket: kj === "effis_dc" ? "prakiraan hari ini" : kj === "plkemenhut" ? "tampil mulai zoom " + c.minzoom + ", server lambat" : null}; } }).catch(() => {});
  const ATRIB = '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA EOSDIS GIBS</a>';
  const sumber = k => ({type: "raster", tileSize: L[k].tileSize || 256, minzoom: L[k].minzoom || 0, maxzoom: L[k].tms, attribution: L[k].atrib || ATRIB,
    tiles: klip(L[k].tiles || [`${DASAR}${L[k].id}/default/default/GoogleMapsCompatible_Level${L[k].tms}/{z}/{y}/{x}.${L[k].ext}`])});

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
      (window.nanti || (f => requestAnimationFrame(() => requestAnimationFrame(f))))(() => { try { i.checked ? nyala(k) : padam(k); legendaku(); } catch (er) { console.warn("nasa", er.message); } }); });
    /* legenda: dititipkan ke #legenda halaman tiap kali halaman menulis ulangnya (seperti konteks.js) */
    const legendaku = () => { const isi = document.querySelector("#legenda .lg-isi"); if (!isi) return; isi.querySelectorAll(".lg-nasa").forEach(x => x.remove());
      isi.insertAdjacentHTML("beforeend", [...aktif].filter(k => L[k].legenda && peta.getLayer("nasa-" + k)).map(k => `<div class="lg-g lg-nasa"><div class="lbl">${L[k].nama.replace(" · ", ", ")}</div><div class="leg">${L[k].legenda.map(([w, n]) => `<span><i class="sw" style="background:${w}"></i>${n.replace(" · ", ", ")}</span>`).join("")}</div></div>`).join("")); };
    const lg = document.getElementById("legenda"); if (lg) new MutationObserver(legendaku).observe(lg, {childList: true});
    peta.on("style.load", () => aktif.forEach(k => { try { nyala(k); } catch (er) {} }));
  }
  window.NASA = {pasang, LAPIS: L, klip, batas, dalam};
})();
