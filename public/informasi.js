/* informasi.js — tab "Informasi": Lapor Warga (warga bantu warga). Satu berkas untuk tiga tempat (data-halaman):
   karhutla (public/index.html), banjir (public/banjir/index.html), warga (public/warga/index.html, layar penuh).
   Skrip klasik, dimuat SETELAH skrip utama halaman. Hanya butuh maplibregl global; katalog jenis diambil dengan import()
   dari informasi_jenis.js (sumber yang sama dengan worker). API: /api/warga (src/worker.js). Tidak mengubah index.html selain
   tag + kait yang dipasang scripts/warga/splice_informasi.py. */
(() => {
  const SKRIP = document.currentScript, HAL = SKRIP?.dataset.halaman || "karhutla";
  const AKAR = new URL(".", SKRIP?.src || location.href).href;          // folder public/
  const API = "/api/warga", JAM = 36e5;
  const RENTANG = [[6, "6j", "6 jam"], [24, "24j", "24 jam"], [72, "3h", "3 hari"], [168, "7h", "7 hari"]];
  const BAHAYA_AWAL = {karhutla: "karhutla", banjir: "banjir"}[HAL] || new URLSearchParams(location.search).get("bahaya") || "umum";
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const baca = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const tulis = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const kecil = () => innerWidth < 700;
  const lalu = t => { const m = Math.max(0, (Date.now() - t) / 6e4); return m < 1 ? "baru saja" : m < 60 ? `${Math.floor(m)} mnt lalu` : m < 48 * 60 ? `${Math.floor(m / 60)} jam lalu` : `${Math.floor(m / 1440)} hari lalu`; };
  const jamWIB = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  const pastel = (hex, p = .72) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(v => Math.round(v + (255 - v) * p)); return `rgb(${c})`; };

  let K = null, peta = null, akar = null, siap = false, konfig = {turnstile: null}, pusatKec = null, dataMentah = [], terpilih = null, posisiSaya = null, autoPitch = true;
  const S = {
    bahaya: baca("lw-bahaya-" + HAL, BAHAYA_AWAL),
    jam: (() => { const j = +new URLSearchParams(location.search).get("jam"); return RENTANG.some(r => r[0] === j) ? j : baca("lw-jam", 24); })(),
    mati: new Set(baca("lw-mati", [])),            // jenis yang disembunyikan di filter
    token: baca("lw-token", {}),                   // id -> token pelapor (untuk "tandai selesai")
  };

  /* ---------------- ikon ---------------- */
  const UI = {
    lokasi: "M12 2v3M12 19v3M2 12h3M19 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
    muat: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
    cari: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
    bantu: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01",
    tambah: "M12 5v14M5 12h14", tutup: "M6 6l12 12M18 6L6 18", ringkas: "M4 19V9M10 19V5M16 19v-7M22 19H2",
    pusat: "M12 2v4M12 18v4M2 12h4M18 12h4M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", panah: "M5 12h14M13 6l6 6-6 6",
    logo: "M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11zM8.5 10.5l2.5 2.5 4.5-4.5",
  };
  const svg = (d, s = 20, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const warnaJ = j => K.WARNA[K.JENIS[j].sub[Object.keys(K.JENIS[j].sub)[0]][1]];
  const WARNA_CHIP = {minta: "#b5475f", tawar: "#4f8fc4", sinyal: "#5a9e74", listrik: "#e3b94e", bbm: "#e58a45", elpiji: "#2b8c86", info: "#8b93a3"};
  const chip = (j, s = 18) => { const w = WARNA_CHIP[j] || warnaJ(j); return `<span class="lw-chip" style="background:${pastel(w, .6)};border-color:${w}">${svg(K.IKON[K.JENIS[j].ikon], s, 2.2)}</span>`; };

  function gambarPenanda(warna, ikon, coret) {
    const r = 2, c = document.createElement("canvas"); c.width = c.height = 40 * r; const g = c.getContext("2d"); g.scale(r, r);
    g.beginPath(); g.arc(20, 20, 16.5, 0, 7); g.fillStyle = "rgba(255,255,255,.95)"; g.fill();
    g.beginPath(); g.arc(20, 20, 14.5, 0, 7); g.fillStyle = pastel(warna); g.fill(); g.lineWidth = 2.6; g.strokeStyle = warna; g.stroke();
    g.save(); g.translate(11, 11); g.scale(.75, .75); g.lineWidth = 2.4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#1f2533";
    g.stroke(new Path2D(K.IKON[ikon])); if (coret) { g.strokeStyle = warna; g.lineWidth = 3; g.stroke(new Path2D(K.IKON.coret)); } g.restore();
    return {width: c.width, height: c.height, data: g.getImageData(0, 0, c.width, c.height).data};
  }

  /* ---------------- wilayah (pusat kecamatan terdekat) ---------------- */
  async function muatKec() {
    if (pusatKec) return pusatKec;
    const d = await (await fetch(AKAR + "banjir/data/pusat_kec.json")).json(), grid = new Map(), daftar = [];
    for (const [k, [la, lo]] of Object.entries(d)) { const g = Math.floor(la * 2) + "," + Math.floor(lo * 2); (grid.get(g) || grid.set(g, []).get(g)).push([la, lo, k]); daftar.push([la, lo, k]); }
    return pusatKec = {grid, daftar};
  }
  function wilayahDari(lat, lon) {
    if (!pusatKec) return null; let best = null, bd = 1e9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const k of pusatKec.grid.get((Math.floor(lat * 2) + a) + "," + (Math.floor(lon * 2) + b)) || []) {
      const d = (k[0] - lat) ** 2 + ((k[1] - lon) * Math.cos(lat * Math.PI / 180)) ** 2; if (d < bd) { bd = d; best = k[2]; } }
    if (!best) return null; const [, kab, kec] = best.split("|"); return {kab, kec, kunci: best};
  }

  /* ---------------- kerangka DOM ---------------- */
  function kerangka() {
    akar.innerHTML = `
      <div class="lw-peta" id="lwPeta" role="application" aria-label="Peta laporan warga"></div>
      <div class="lw-judul"><span class="lw-logo">${svg(UI.logo, 18, 2.2)}</span><b>Lapor Warga</b><span class="lw-sub">Warga Bantu Warga</span>
        <label class="lw-bahaya"><span class="sr">Jenis bencana</span><select id="lwBahaya">${Object.entries(K.BAHAYA).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label></div>
      <div class="lw-kiri" id="lwKiri" role="toolbar" aria-label="Saring jenis laporan"></div>
      <div class="lw-kanan" role="toolbar" aria-label="Alat peta">
        <button class="lw-bulat" id="lwBantu" aria-label="Bantuan dan keterangan" title="Bantuan">${svg(UI.bantu)}</button>
        <button class="lw-bulat lw-gelap" id="lwJam" aria-label="Rentang waktu" title="Rentang waktu laporan"></button>
        <button class="lw-bulat" id="lwLokasi" aria-label="Lokasi saya" title="Lokasi saya">${svg(UI.lokasi)}</button>
        <button class="lw-bulat" id="lwCariB" aria-label="Cari kecamatan" title="Cari kecamatan">${svg(UI.cari)}</button>
        <button class="lw-bulat" id="lwRingkas" aria-label="Ringkasan wilayah" title="Ringkasan per wilayah">${svg(UI.ringkas)}</button>
        <button class="lw-bulat" id="lwMuat" aria-label="Muat ulang laporan" title="Muat ulang">${svg(UI.muat)}</button>
      </div>
      <div class="lw-cari" id="lwCari" hidden><input id="lwCariI" list="lwKecL" placeholder="Ketik nama kecamatan / kabupaten" aria-label="Cari kecamatan"><datalist id="lwKecL"></datalist></div>
      <div class="lw-dial" id="lwDial" hidden><p>Tambahkan di peta:</p><div id="lwDialL"></div></div>
      <button class="lw-fab" id="lwFab" aria-label="Tambah laporan" aria-expanded="false">${svg(UI.tambah, 26, 2.4)}</button>
      <div class="lw-kartu" id="lwKartu" hidden></div>
      <aside class="lw-panel" id="lwPanel" hidden role="dialog" aria-modal="false" aria-label="Rincian"></aside>
      <div class="lw-bidik" id="lwBidik" hidden><div class="lw-silang"></div><div class="lw-bidik-bar"><span>Geser peta, titik tengah = lokasi laporan</span><button class="lw-btn" id="lwBidikBatal">Batal</button><button class="lw-btn lw-utama" id="lwBidikOK">Pakai titik ini</button></div></div>
      <div class="lw-status" id="lwStatus" aria-live="polite"></div>
      <div class="lw-toast" id="lwToast" role="status"></div>`;
    $("#lwBahaya", akar).value = S.bahaya;
    $("#lwBahaya", akar).onchange = e => { S.bahaya = e.target.value; tulis("lw-bahaya-" + HAL, S.bahaya); renderKiri(); terapkan(); if (!$("#lwPanel").hidden && $("#lwPanel").dataset.mode === "ringkas") ringkasan(); };
    $("#lwFab").onclick = () => dial(!$("#lwDial").hidden ? false : true);
    $("#lwJam").onclick = () => { const i = RENTANG.findIndex(r => r[0] === S.jam); S.jam = RENTANG[(i + 1) % RENTANG.length][0]; tulis("lw-jam", S.jam); aturURL({jam: S.jam}); renderJam(); muat(); };
    $("#lwLokasi").onclick = () => lokasiSaya(true);
    $("#lwMuat").onclick = () => muat(true);
    $("#lwBantu").onclick = bantuan;
    $("#lwRingkas").onclick = () => ($("#lwPanel").dataset.mode === "ringkas" && !$("#lwPanel").hidden) ? tutupPanel() : ringkasan();
    $("#lwCariB").onclick = async () => { const c = $("#lwCari"); c.hidden = !c.hidden; if (c.hidden) return; $("#lwCariI").focus();
      const P = await muatKec(); if (!$("#lwKecL").children.length) $("#lwKecL").innerHTML = P.daftar.map(([, , k]) => { const [, kab, kec] = k.split("|"); return `<option value="${esc(kec)}, ${esc(kab)}">`; }).join(""); };
    $("#lwCariI").onchange = e => { const [kec, kab] = e.target.value.split(", "); const x = pusatKec?.daftar.find(([, , k]) => k.endsWith("|" + kab + "|" + kec));
      if (x) { peta.flyTo({center: [x[1], x[0]], zoom: 12.5}); $("#lwCari").hidden = true; e.target.value = ""; } };
    $("#lwBidikBatal").onclick = () => bidik(false);
    akar.addEventListener("keydown", e => { if (e.key === "Escape") { if (!$("#lwDial").hidden) dial(false); else if (!$("#lwPanel").hidden) tutupPanel(); else tutupKartu(); } });
    renderKiri(); renderJam();
  }
  const renderJam = () => { const r = RENTANG.find(x => x[0] === S.jam); $("#lwJam").textContent = r[1]; $("#lwJam").title = "Laporan " + r[2] + " terakhir (klik untuk ganti)"; };
  function renderKiri() {
    const js = K.jenisUntuk(S.bahaya);
    $("#lwKiri").innerHTML = `<button class="lw-kotak lw-semua" data-semua aria-label="Tampilkan atau sembunyikan semua jenis" title="Semua jenis">Semua</button>` +
      js.map(j => `<button class="lw-kotak" data-j="${j}" aria-pressed="${!S.mati.has(j)}" aria-label="${esc(K.JENIS[j].nama)}" title="${esc(K.JENIS[j].nama)}">${chip(j, 17)}</button>`).join("");
    $("#lwKiri").onclick = e => { const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.semua != null) { const semuaMati = js.every(j => S.mati.has(j)); js.forEach(j => semuaMati ? S.mati.delete(j) : S.mati.add(j)); }
      else S.mati.has(b.dataset.j) ? S.mati.delete(b.dataset.j) : S.mati.add(b.dataset.j);
      tulis("lw-mati", [...S.mati]); renderKiri(); terapkan(); };
  }
  const toast = (t, ms = 3200) => { const el = $("#lwToast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("on"), ms); };
  function aturURL(o) { const u = new URL(location.href); for (const [k, v] of Object.entries(o)) v == null ? u.searchParams.delete(k) : u.searchParams.set(k, v); history.replaceState(history.state, "", u); }

  /* ---------------- peta ---------------- */
  const GAYA = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/liberty";
  function buatPeta() {
    peta = new maplibregl.Map({container: "lwPeta", style: GAYA(), center: [118, -2.4], zoom: 4.2, minZoom: 3, maxZoom: 19, maxPitch: 60, attributionControl: {compact: true}});
    peta.addControl(new maplibregl.NavigationControl({visualizePitch: true}), "top-right");
    peta.on("styleimagemissing", e => { const [, j, s] = e.id.split("|"); const J = K?.JENIS[j]; if (!J || !J.sub[s] || peta.hasImage(e.id)) return;
      peta.addImage(e.id, gambarPenanda(K.WARNA[J.sub[s][1]], J.ikon, J.sub[s][2]), {pixelRatio: 2}); });
    peta.on("style.load", lapisan);
    peta.on("moveend", () => { clearTimeout(buatPeta._t); buatPeta._t = setTimeout(muat, 350); });
    peta.on("pitchstart", e => { if (e.originalEvent) autoPitch = false; });
    peta.on("zoomend", () => { const z = peta.getZoom();
      if (autoPitch && z >= 16 && peta.getPitch() < 5) peta.easeTo({pitch: 45, duration: 600});
      else if (z < 13 && peta.getPitch() > 0) { peta.easeTo({pitch: 0, bearing: 0, duration: 400}); autoPitch = true; } });
    peta.on("click", "lw-klaster", e => { const f = e.features[0]; peta.getSource("warga").getClusterExpansionZoom(f.properties.cluster_id).then(z => peta.easeTo({center: f.geometry.coordinates, zoom: z + .2})); });
    peta.on("click", "lw-titik", e => pilih(e.features[0].properties.id));
    peta.on("click", e => { if (!peta.queryRenderedFeatures(e.point, {layers: ["lw-titik", "lw-klaster"]}).length) tutupKartu(); });
    for (const l of ["lw-titik", "lw-klaster"]) { peta.on("mouseenter", l, () => peta.getCanvas().style.cursor = "pointer"); peta.on("mouseleave", l, () => peta.getCanvas().style.cursor = ""); }
    new MutationObserver(() => { const g = GAYA(); if (peta.__gaya !== g) { peta.__gaya = g; siap = false; peta.setStyle(g, {diff: false}); } }).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
    peta.__gaya = GAYA();
  }
  function lapisan() {
    const simbol = peta.getStyle().layers.find(l => l.type === "symbol")?.id;
    if (peta.getLayer("building-3d")) {           // liberty: gedung 3D sudah ada, buat abu-abu terang dan mulai z15
      peta.setLayerZoomRange("building-3d", 15, 24); peta.setPaintProperty("building-3d", "fill-extrusion-color", "#dcdcdc"); peta.setPaintProperty("building-3d", "fill-extrusion-opacity", .8);
    } else if (peta.getSource("openmaptiles")) {
      peta.addLayer({id: "lw-gedung", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", minzoom: 15,
        paint: {"fill-extrusion-color": gelap() ? "#3a4252" : "#dcdcdc", "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": .8}}, simbol);
    }
    peta.addSource("warga", {type: "geojson", data: geo(), cluster: true, clusterRadius: 44, clusterMaxZoom: 13, promoteId: "id"});
    peta.addSource("saya", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    peta.addLayer({id: "lw-saya", type: "circle", source: "saya", paint: {"circle-radius": 7, "circle-color": "#3f7fb8", "circle-stroke-color": "#fff", "circle-stroke-width": 3}});
    peta.addLayer({id: "lw-klaster", type: "circle", source: "warga", filter: ["has", "point_count"],
      paint: {"circle-color": "#1f2a44", "circle-radius": ["step", ["get", "point_count"], 16, 10, 19, 50, 23, 200, 27], "circle-stroke-color": "rgba(255,255,255,.9)", "circle-stroke-width": 2}});
    peta.addLayer({id: "lw-klaster-n", type: "symbol", source: "warga", filter: ["has", "point_count"],
      layout: {"text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true}, paint: {"text-color": "#fff"}});
    peta.addLayer({id: "lw-pilih", type: "circle", source: "warga", filter: ["==", ["get", "id"], ""],
      paint: {"circle-radius": 21, "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 4, "circle-stroke-color": gelap() ? "#fff" : "#141b2d"}});
    peta.addLayer({id: "lw-titik", type: "symbol", source: "warga", filter: ["!", ["has", "point_count"]],
      layout: {"icon-image": ["concat", "w|", ["get", "jenis"], "|", ["get", "sub"]], "icon-allow-overlap": true, "icon-size": ["interpolate", ["linear"], ["zoom"], 4, .8, 12, 1]},
      paint: {"icon-opacity": ["case", ["get", "pudar"], .5, 1]}});
    if (terpilih) peta.setFilter("lw-pilih", ["==", ["get", "id"], terpilih]);
    if (posisiSaya) peta.getSource("saya").setData(titikSaya());
    siap = true;
  }
  const titikSaya = () => ({type: "FeatureCollection", features: posisiSaya ? [{type: "Feature", geometry: {type: "Point", coordinates: [posisiSaya.lon, posisiSaya.lat]}, properties: {}}] : []});

  /* ---------------- data ---------------- */
  const tampil = f => K.JENIS[f.properties.jenis] && K.jenisUntuk(S.bahaya).includes(f.properties.jenis) && !S.mati.has(f.properties.jenis);
  function geo() {
    const kini = Date.now();
    return {type: "FeatureCollection", features: dataMentah.filter(tampil).map(f => {
      const J = K.JENIS[f.properties.jenis], p = f.properties;
      return {...f, properties: {id: p.id, jenis: p.jenis, sub: p.sub, pudar: !J.bantuan && kini - p.dibuat > J.umur * JAM / 2}}; })};
  }
  const terapkan = () => { if (siap) peta.getSource("warga")?.setData(geo()); };
  async function muat(tegas) {
    if (!peta) return;
    const b = peta.getBounds(), pad = .25, w = b.getWest(), e = b.getEast(), s = b.getSouth(), n = b.getNorth(), dx = (e - w) * pad, dy = (n - s) * pad;
    const bbox = [w - dx, s - dy, e + dx, n + dy].map(v => v.toFixed(3)).join(",");
    const kunci = bbox + "|" + S.jam; if (!tegas && kunci === muat._k && Date.now() - muat._t < 60e3) return; muat._k = kunci; muat._t = Date.now();
    try {
      const r = await fetch(`${API}?jam=${S.jam}&bbox=${bbox}`); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).galat || r.status);
      const d = await r.json(); dataMentah = d.features; terapkan();
      $("#lwStatus").textContent = d.features.length ? "" : "Belum ada laporan di area ini dalam " + RENTANG.find(x => x[0] === S.jam)[2] + " terakhir.";
      if (d.terpotong) toast("Terlalu banyak laporan di area ini; perbesar peta untuk melihat semuanya.");
      if (!$("#lwPanel").hidden && $("#lwPanel").dataset.mode === "ringkas") ringkasan();
    } catch (e) { $("#lwStatus").textContent = "Layanan laporan belum tersedia (" + e.message + ")."; }
  }
  const kirimAPI = async (jalur, body) => { const r = await fetch(API + jalur, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body || {})});
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.galat || "galat " + r.status); return j; };

  /* ---------------- pilih penanda: kartu ringkas -> panel rincian ---------------- */
  const judulF = p => `${esc(K.JENIS[p.jenis].nama)} · ${esc(K.JENIS[p.jenis].sub[p.sub][0])}`;
  function pilih(id) {
    const f = dataMentah.find(x => x.id === id); if (!f) return;
    terpilih = id; peta.setFilter("lw-pilih", ["==", ["get", "id"], id]);
    const p = f.properties, w = K.WARNA[K.JENIS[p.jenis].sub[p.sub][1]];
    const isi = `<div class="lw-k-kepala"><span class="lw-titikw" style="background:${w}"></span><b>${judulF(p)}</b></div>
      <div class="lw-k-waktu">${lalu(p.dibuat)}${p.titik_panas ? ` · <span class="lw-lencana">Terkonfirmasi satelit</span>` : ""}</div>
      ${p.teks ? `<p class="lw-k-teks">${esc(p.teks)}</p>` : ""}<hr><button class="lw-tautan" data-lengkap>Lihat selengkapnya ${svg(UI.panah, 15)}</button>`;
    if (kecil()) {
      tutupKartu(); pilih._pop = new maplibregl.Popup({closeButton: true, maxWidth: "260px", offset: 18, className: "lw-pop"}).setLngLat(f.geometry.coordinates).setHTML(isi).addTo(peta);
      pilih._pop.getElement().querySelector("[data-lengkap]").onclick = () => rincian(id);
      pilih._pop.on("close", () => { if (terpilih === id) { terpilih = null; peta.setFilter("lw-pilih", ["==", ["get", "id"], ""]); } });
    } else {
      const k = $("#lwKartu"); k.hidden = false;
      k.innerHTML = `<div class="lw-k-ikon">${chip(p.jenis, 22)}</div><div class="lw-k-isi">${isi}</div>
        <div class="lw-k-aksi"><button class="lw-ikonb" data-pusat aria-label="Pusatkan peta" title="Pusatkan">${svg(UI.pusat, 18)}</button><button class="lw-ikonb" data-tutup aria-label="Tutup" title="Tutup">${svg(UI.tutup, 18)}</button></div>`;
      k.querySelector("[data-lengkap]").onclick = () => rincian(id);
      k.querySelector("[data-pusat]").onclick = () => peta.easeTo({center: f.geometry.coordinates, zoom: Math.max(peta.getZoom(), 14)});
      k.querySelector("[data-tutup]").onclick = tutupKartu;
    }
    aturURL({laporan: id});
  }
  function tutupKartu() { $("#lwKartu").hidden = true; pilih._pop?.remove(); pilih._pop = null; if (terpilih && $("#lwPanel").hidden) { terpilih = null; if (siap) peta.setFilter("lw-pilih", ["==", ["get", "id"], ""]); aturURL({laporan: null}); } }
  function bukaPanel(mode, html) { const p = $("#lwPanel"); p.dataset.mode = mode; p.innerHTML = `<button class="lw-ikonb lw-p-tutup" aria-label="Tutup panel">${svg(UI.tutup, 18)}</button>` + html; p.hidden = false; p.querySelector(".lw-p-tutup").onclick = tutupPanel; p.scrollTop = 0; }
  function tutupPanel() { $("#lwPanel").hidden = true; if ($("#lwPanel").dataset.mode === "rinci") { terpilih = null; if (siap) peta.setFilter("lw-pilih", ["==", ["get", "id"], ""]); aturURL({laporan: null}); } }

  async function rincian(id) {
    $("#lwKartu").hidden = true; pilih._pop?.remove();
    bukaPanel("rinci", `<div class="lw-muat">Memuat…</div>`);
    let f; try { const r = await fetch(`${API}/${id}`); if (!r.ok) throw new Error((await r.json()).galat); f = await r.json(); }
    catch (e) { bukaPanel("rinci", `<p class="lw-galat">Laporan tidak bisa dibuka: ${esc(e.message)}</p>`); return; }
    terpilih = id; if (siap) peta.setFilter("lw-pilih", ["==", ["get", "id"], id]); aturURL({laporan: id});
    await muatKec().catch(() => {});
    const p = f.properties, J = K.JENIS[p.jenis], [lon, lat] = f.geometry.coordinates, w = wilayahDari(lat, lon), kls = J.sub[p.sub][1];
    const isian = Object.entries(p.detail || {}).map(([k, v]) => { const s = J.isian?.[k]; if (!s) return "";
      const nilai = s.tipe === "ya" ? (v ? "Ya" : "Tidak") : s.tipe === "multi" ? v.map(x => s.nilai[x] || x).join(", ") : s.nilai[v] || v; return `<div><dt>${esc(s.label)}</dt><dd>${esc(nilai)}</dd></div>`; }).join("");
    const dur = p.durasi_buruk != null ? Math.round(p.durasi_buruk / JAM) : null;
    const kata = {listrik: "padam", sinyal: "tanpa sinyal", bbm: "habis", elpiji: "habis"}[p.jenis] || "terganggu";
    const durTeks = dur != null ? `<div class="lw-durasi">${p.sub === "hidup" ? "Akhirnya hidup" : `Kini “${esc(J.sub[p.sub][0])}”`} setelah ${kata} <b>${dur} jam</b>${dur >= 48 ? ` (${(dur / 24).toFixed(1).replace(".", ",")} hari)` : ""}</div>` : "";
    const lanjut = J.lanjut && !p.digantikan ? `<div class="lw-blok"><h4>Perbarui status di titik ini</h4><div class="lw-pil">${Object.entries(J.sub).filter(([s]) => s !== p.sub).map(([s, [n, k]]) =>
      `<button class="lw-btn" data-lanjut="${s}"><span class="lw-titikw" style="background:${K.WARNA[k]}"></span>${s === "hidup" ? "Sudah hidup" : esc(n)}</button>`).join("")}<button class="lw-btn" data-lanjut="${p.sub}">Masih ${esc(J.sub[p.sub][0].toLowerCase())}</button></div></div>` : "";
    const laciL = p.laci ? (HAL === "karhutla" ? `<a href="/k/${esc(p.laci)}" data-laci="${esc(p.laci)}">lihat kompleks ${esc(p.laci)}</a>` : `<a href="${AKAR}#k/${esc(p.laci)}">lihat kompleks ${esc(p.laci)}</a>`) : "";
    bukaPanel("rinci", `
      <div class="lw-p-kepala">${chip(p.jenis, 24)}<div><h3>${judulF(p)}</h3><p>${lalu(p.dibuat)} · ${jamWIB(p.dibuat)}${w ? ` · Kec. ${esc(w.kec)}, ${esc(w.kab)}` : ""}</p></div></div>
      ${p.kedaluwarsa_lewat ? `<p class="lw-catatan">Laporan ini sudah kedaluwarsa (lebih dari ${J.umur} jam).</p>` : ""}
      ${p.digantikan ? `<p class="lw-catatan">Sudah ada status yang lebih baru di titik ini. <button class="lw-tautan" data-buka="${p.digantikan}">Buka yang terbaru</button></p>` : ""}
      ${durTeks}
      ${p.titik_panas ? `<div class="lw-satelit"><b>Terkonfirmasi satelit</b> — ada titik panas ≤ 2 km dalam 24 jam terakhir. ${laciL}</div>` : p.jenis === "api" ? `<p class="lw-catatan">Belum ada titik panas satelit ≤ 2 km (awan/asap bisa menutupi). Laporan warga tetap penting.</p>` : ""}
      ${p.teks ? `<p class="lw-teks">${esc(p.teks)}</p>` : ""}
      ${isian || p.jumlah ? `<dl class="lw-dl">${isian}${p.jumlah ? `<div><dt>${esc(J.jumlah)}</dt><dd>${p.jumlah.toLocaleString("id-ID")}</dd></div>` : ""}</dl>` : ""}
      ${p.jenis === "satwa" ? `<p class="lw-catatan">Lokasi dibulatkan ±1 km untuk melindungi satwa. Jangan mendekat; laporkan ke BKSDA setempat.</p>` : ""}
      <div class="lw-blok"><h4>Apakah laporan ini masih benar?</h4><div class="lw-pil">
        <button class="lw-btn lw-ya" data-suara="benar">Masih benar <b>${p.benar}</b></button><button class="lw-btn" data-suara="salah">Sudah tidak <b>${p.salah}</b></button></div></div>
      ${lanjut}
      ${J.bantuan && p.kontak ? `<div class="lw-blok"><h4>Kontak pelapor</h4><p class="lw-kecil">Nomor hanya ditampilkan bila diminta, dibatasi per orang, dan dihapus otomatis 72 jam setelah laporan dibuat.</p><div id="lwKontak"><button class="lw-btn lw-utama" data-kontak>Tampilkan kontak WhatsApp</button></div></div>` : ""}
      ${S.token[p.id] && J.bantuan ? `<div class="lw-blok"><button class="lw-btn" data-selesai>Tandai sudah terpenuhi / selesai</button></div>` : ""}
      ${p.riwayat?.length ? `<div class="lw-blok"><h4>Riwayat di titik ini</h4><ol class="lw-riwayat">${p.riwayat.map(r => `<li><span class="lw-titikw" style="background:${K.WARNA[J.sub[r.sub]?.[1]] || "#999"}"></span>${esc(J.sub[r.sub]?.[0] || r.sub)} · ${lalu(r.dibuat)}${r.teks ? ` — ${esc(r.teks)}` : ""}</li>`).join("")}</ol></div>` : ""}
      <div class="lw-blok lw-bawah"><button class="lw-tautan" data-bagikan>Salin tautan laporan</button>
        <details class="lw-aduan"><summary>Laporkan penyalahgunaan</summary><div class="lw-pil">${[["spam", "Spam / iklan"], ["palsu", "Info palsu"], ["kasar", "Kasar / SARA"], ["pribadi", "Data pribadi"], ["lainnya", "Lainnya"]].map(([k, n]) => `<button class="lw-btn" data-aduan="${k}">${n}</button>`).join("")}</div></details></div>`);
    const P = $("#lwPanel");
    P.querySelectorAll("[data-suara]").forEach(b => b.onclick = async () => { try { const r = await kirimAPI(`/${id}/konfirmasi`, {nilai: b.dataset.suara});
      P.querySelector('[data-suara="benar"] b').textContent = r.benar; P.querySelector('[data-suara="salah"] b').textContent = r.salah; toast("Terima kasih, konfirmasi tercatat."); } catch (e) { toast(e.message); } });
    P.querySelectorAll("[data-aduan]").forEach(b => b.onclick = async () => { try { const r = await kirimAPI(`/${id}/lapor`, {nilai: b.dataset.aduan}); toast(r.disembunyikan ? "Laporan disembunyikan untuk ditinjau." : "Aduan tercatat. Terima kasih."); if (r.disembunyikan) { tutupPanel(); muat(true); } } catch (e) { toast(e.message); } });
    P.querySelectorAll("[data-lanjut]").forEach(b => b.onclick = () => formulir(p.jenis, {induk: id, sub: b.dataset.lanjut, lat, lon}));
    P.querySelector("[data-buka]")?.addEventListener("click", e => rincian(e.target.dataset.buka));
    P.querySelector("[data-laci]")?.addEventListener("click", e => { if (window.Laci?.buka && window.bukaTab) { e.preventDefault(); window.bukaTab("peta"); window.Laci.buka(e.target.dataset.laci); } });
    P.querySelector("[data-kontak]")?.addEventListener("click", async () => { try { const r = await kirimAPI(`/${id}/kontak`);
      $("#lwKontak").innerHTML = `<a class="lw-btn lw-utama" href="${esc(r.tautan)}" target="_blank" rel="noopener">Buka WhatsApp +${esc(r.wa)}</a>`; } catch (e) { toast(e.message); } });
    P.querySelector("[data-selesai]")?.addEventListener("click", async () => { try { await kirimAPI(`/${id}/selesai`, {token: S.token[id]}); delete S.token[id]; tulis("lw-token", S.token); toast("Ditandai selesai. Terima kasih!"); tutupPanel(); muat(true); } catch (e) { toast(e.message); } });
    P.querySelector("[data-bagikan]").onclick = async () => { const u = new URL(location.href); u.searchParams.set("laporan", id); u.searchParams.set("jam", S.jam);
      try { await navigator.clipboard.writeText(u.href); toast("Tautan disalin."); } catch (e) { prompt("Salin tautan:", u.href); } };
    if (!dataMentah.some(x => x.id === id)) peta.easeTo({center: [lon, lat], zoom: Math.max(peta.getZoom(), 13)});
  }

  /* ---------------- tambah laporan ---------------- */
  function dial(buka) {
    $("#lwDial").hidden = !buka; $("#lwFab").setAttribute("aria-expanded", buka); $("#lwFab").classList.toggle("buka", buka);
    $("#lwFab").innerHTML = svg(buka ? UI.tutup : UI.tambah, 26, 2.4); $("#lwFab").setAttribute("aria-label", buka ? "Tutup menu tambah" : "Tambah laporan");
    if (!buka) return;
    const inti = ["minta", "tawar", "sinyal", "listrik", "bbm", "elpiji", "info"], nama = {minta: "Minta Bantuan", tawar: "Tawaran Bantuan", sinyal: "Jaringan", listrik: "Listrik", bbm: "BBM", elpiji: "LPG", info: "Pesan"};
    const lain = K.jenisUntuk(S.bahaya).filter(j => !inti.includes(j));
    $("#lwDialL").innerHTML = [...inti, ...lain].map(j => `<button class="lw-pilihan" data-j="${j}"><span>${esc(nama[j] || K.JENIS[j].nama)}</span>${chip(j, 18)}</button>`).join("");
    $("#lwDialL").onclick = e => { const b = e.target.closest("button"); if (b) { dial(false); formulir(b.dataset.j); } };
    $("#lwDialL button")?.focus();
  }
  function bidik(on, lanjut) {
    $("#lwBidik").hidden = !on; $("#lwPanel").classList.toggle("lw-sembunyi", on);
    if (on) $("#lwBidikOK").onclick = () => { const c = peta.getCenter(); bidik(false); lanjut(c.lat, c.lng); };
  }
  async function lokasiSaya(terbang) {
    return new Promise(ok => {
      if (!navigator.geolocation) { toast("Perangkat tidak memberi lokasi."); return ok(null); }
      navigator.geolocation.getCurrentPosition(p => { posisiSaya = {lat: p.coords.latitude, lon: p.coords.longitude}; if (siap) peta.getSource("saya").setData(titikSaya());
        if (terbang) peta.flyTo({center: [posisiSaya.lon, posisiSaya.lat], zoom: Math.max(peta.getZoom(), 14)}); ok(posisiSaya); },
        e => { toast("Lokasi tidak bisa dibaca: " + (e.code === 1 ? "izin ditolak" : "sinyal GPS lemah") + ". Pilih titik di peta."); ok(null); }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 60000});
    });
  }
  async function formulir(jenis, awal = {}) {
    const J = K.JENIS[jenis]; await muatKec().catch(() => {});
    const c = peta.getCenter(); let lok = awal.lat != null ? {lat: awal.lat, lon: awal.lon} : posisiSaya ? {...posisiSaya} : {lat: c.lat, lon: c.lng};
    const bahayaBoleh = J.bahaya || Object.keys(K.BAHAYA), bahaya = bahayaBoleh.includes(S.bahaya) ? S.bahaya : bahayaBoleh[0];
    const pilihan = (nama, nilai, tipe, wajib) => `<div class="lw-pil" role="${tipe === "radio" ? "radiogroup" : "group"}">${Object.entries(nilai).map(([k, n]) =>
      `<label class="lw-opsi"><input type="${tipe}" name="${nama}" value="${esc(k)}" ${wajib && tipe === "radio" ? "required" : ""} ${awal[nama] === k ? "checked" : ""}><span>${esc(Array.isArray(n) ? n[0] : n)}</span></label>`).join("")}</div>`;
    bukaPanel("form", `<form class="lw-form" id="lwForm" novalidate>
      <div class="lw-p-kepala">${chip(jenis, 24)}<div><h3>${awal.induk ? "Perbarui status: " : ""}${esc(J.nama)}</h3><p>${awal.induk ? "Status baru di titik yang sama" : "Laporan baru"}</p></div></div>
      <label class="lw-medan">Bencana<select name="bahaya" ${bahayaBoleh.length === 1 ? "disabled" : ""}>${bahayaBoleh.map(b => `<option value="${b}" ${b === bahaya ? "selected" : ""}>${K.BAHAYA[b]}</option>`).join("")}</select></label>
      <fieldset><legend>Kondisi <span class="lw-wajib">wajib</span></legend>${pilihan("sub", J.sub, "radio", true)}</fieldset>
      ${Object.entries(J.isian || {}).map(([k, s]) => `<fieldset><legend>${esc(s.label)}${s.wajib ? ' <span class="lw-wajib">wajib</span>' : ""}</legend>${s.tipe === "ya" ? `<label class="lw-opsi"><input type="checkbox" name="${k}"><span>Ya</span></label>` : pilihan(k, s.nilai, s.tipe === "multi" ? "checkbox" : "radio", s.wajib)}</fieldset>`).join("")}
      ${J.jumlah ? `<label class="lw-medan">${esc(J.jumlah)}<input type="number" name="jumlah" min="1" max="100000" inputmode="numeric"></label>` : ""}
      <label class="lw-medan">${jenis === "info" ? 'Pesan <span class="lw-wajib">wajib</span>' : "Keterangan (opsional)"}<textarea name="teks" maxlength="280" rows="3" placeholder="${jenis === "info" ? "Tulis informasi untuk warga sekitar" : "Contoh: padam sejak subuh, satu RT"}"></textarea><small class="lw-hitung">0/280 · tautan dan nomor HP otomatis dihapus</small></label>
      ${J.bantuan ? `<label class="lw-medan">Nomor WhatsApp (opsional)<input type="tel" name="kontak" placeholder="0812xxxxxxx" autocomplete="tel"><small>Nomor ini <b>bisa dilihat penolong</b> yang menekan "Tampilkan kontak" (dibatasi per orang) dan dihapus otomatis setelah 72 jam. Jangan tulis nomor di kolom keterangan.</small></label>` : ""}
      ${J.bulat ? `<p class="lw-catatan">Lokasi satwa dibulatkan ±1 km. Laporkan juga ke BKSDA setempat; jangan mendekati satwa.</p>` : ""}
      ${awal.induk ? "" : `<fieldset><legend>Lokasi</legend><p class="lw-lok" id="lwLok"></p><div class="lw-pil"><button type="button" class="lw-btn" id="lwPakaiSaya">${svg(UI.lokasi, 16)} Lokasi saya</button><button type="button" class="lw-btn" id="lwPilihPeta">Pilih di peta</button></div></fieldset>`}
      <div id="lwTs"></div>
      <p class="lw-galat" id="lwGalat" role="alert"></p>
      <div class="lw-pil lw-kirim"><button type="button" class="lw-btn" id="lwBatal">Batal</button><button type="submit" class="lw-btn lw-utama">Kirim laporan</button></div>
      <p class="lw-kecil">Tanpa akun. Laporan tampil untuk publik; status hilang otomatis setelah ${J.umur < 168 ? J.umur + " jam" : "7 hari atau saat ditandai selesai"}. Jangan unggah data pribadi orang lain.</p>
      <p class="lw-kecil">Pemberitahuan privasi (UU PDP No. 27/2022): lokasi, isi laporan, dan nomor WhatsApp (bila diisi) diproses hanya untuk menghubungkan warga yang butuh dan yang bisa membantu. Nomor dihapus otomatis setelah 72 jam atau saat laporan ditandai selesai; alamat IP tidak disimpan, hanya sidik acaknya (hash bergaram, paling lama 14 hari) untuk mencegah spam. <a href="${AKAR}privasi.html" target="_blank" rel="noopener">Rincian & permintaan hapus</a></p></form>`);
    const F = $("#lwForm");
    const tulisLok = () => { const w = wilayahDari(lok.lat, lok.lon), el = $("#lwLok"); if (el) el.textContent = `${lok.lat.toFixed(5)}, ${lok.lon.toFixed(5)}${w ? ` · Kec. ${w.kec}, ${w.kab}` : ""}`; };
    tulisLok();
    F.teks.oninput = () => F.querySelector(".lw-hitung").textContent = `${F.teks.value.length}/280 · tautan dan nomor HP otomatis dihapus`;
    $("#lwBatal").onclick = tutupPanel;
    $("#lwPakaiSaya")?.addEventListener("click", async () => { const p = await lokasiSaya(true); if (p) { lok = {...p}; tulisLok(); } });
    $("#lwPilihPeta")?.addEventListener("click", () => { peta.easeTo({center: [lok.lon, lok.lat], zoom: Math.max(peta.getZoom(), 15)}); bidik(true, (la, lo) => { lok = {lat: la, lon: lo}; tulisLok(); }); });
    let ts = null;
    if (konfig.turnstile) muatTurnstile().then(() => { ts = turnstile.render("#lwTs", {sitekey: konfig.turnstile, language: "id"}); }).catch(() => {});
    F.onsubmit = async e => {
      e.preventDefault(); const g = $("#lwGalat"); g.textContent = "";
      const fd = new FormData(F), o = {jenis, sub: fd.get("sub"), bahaya: F.bahaya.value, lat: lok.lat, lon: lok.lon, teks: fd.get("teks") || "", detail: {}};
      if (!o.sub) { g.textContent = "Pilih kondisi dulu."; return; }
      for (const [k, s] of Object.entries(J.isian || {})) { if (s.tipe === "multi") { const v = fd.getAll(k); if (v.length) o.detail[k] = v; } else if (s.tipe === "ya") { if (F[k].checked) o.detail[k] = true; } else if (fd.get(k)) o.detail[k] = fd.get(k); }
      for (const [k, s] of Object.entries(J.isian || {})) if (s.wajib && !(k in o.detail)) { g.textContent = `Isi "${s.label}" dulu.`; return; }
      if (J.jumlah && fd.get("jumlah")) o.jumlah = Number(fd.get("jumlah"));
      if (J.bantuan && fd.get("kontak")) o.kontak = fd.get("kontak");
      if (awal.induk) o.induk = awal.induk;
      if (ts != null) o.turnstile = turnstile.getResponse(ts);
      const tombol = F.querySelector('[type="submit"]'); tombol.disabled = true; tombol.textContent = "Mengirim…";
      try {
        const r = await kirimAPI("", o);
        S.token[r.id] = r.token; tulis("lw-token", S.token);
        toast(r.durasi_buruk != null ? `Terkirim. Tercatat ${Math.round(r.durasi_buruk / JAM)} jam ${jenis === "listrik" ? "padam" : "terganggu"} di titik ini.` : r.titik_panas ? "Terkirim. Ada titik panas satelit di dekat laporan Anda." : "Laporan terkirim. Terima kasih!", 4500);
        tutupPanel(); muat._k = null; await muat(true); if (S.mati.has(jenis)) { S.mati.delete(jenis); renderKiri(); terapkan(); }
        rincian(r.id);
      } catch (err) { g.textContent = err.message; if (ts != null) turnstile.reset(ts); }
      finally { tombol.disabled = false; tombol.textContent = "Kirim laporan"; }
    };
    F.querySelector('input[name="sub"]:checked, input[name="sub"]')?.focus();
  }
  const muatTurnstile = () => muatTurnstile._p ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.onload = ok; s.onerror = no; document.head.appendChild(s); });

  /* ---------------- ringkasan per wilayah ---------------- */
  async function ringkasan() {
    await muatKec().catch(() => {});
    const per = new Map(), lv = $("#lwPanel").dataset.tingkat || "kab";
    const KOLOM = [["padam", "Listrik padam", p => p.jenis === "listrik" && p.sub === "padam"], ["sinyal", "Tanpa sinyal", p => p.jenis === "sinyal" && p.sub === "tidak_ada"],
      ["bbm", "BBM/LPG habis", p => (p.jenis === "bbm" || p.jenis === "elpiji") && p.sub === "habis"], ["bantu", "Butuh bantuan", p => (p.jenis === "minta" || p.jenis === "evakuasi" && p.sub === "perlu")]];
    if (S.bahaya === "karhutla") KOLOM.push(["api", "Api (satelit/belum)", p => p.jenis === "api"], ["pandang", "Pandang < 500 m", p => p.jenis === "udara" && (p.sub === "p100" || p.sub === "p500")],
      ["sehat", "Masker/oksigen", p => p.jenis === "sehat" && (p.sub === "masker" || p.sub === "oksigen")], ["air", "Sumber air berair", p => p.jenis === "air_padam" && p.detail?.status === "ada"]);
    if (S.bahaya === "banjir") KOLOM.push(["banjir", "Banjir ≥ pinggang", p => p.jenis === "banjir" && ["pinggang", "dada", "atap"].includes(p.sub)]);
    if (S.bahaya === "longsor") KOLOM.push(["longsor", "Longsor", p => p.jenis === "longsor"]);
    if (S.bahaya === "rob") KOLOM.push(["rob", "Rob", p => p.jenis === "rob"]);
    for (const f of dataMentah) {
      const p = f.properties, [lon, lat] = f.geometry.coordinates, w = wilayahDari(lat, lon); if (!w) continue;
      const kunci = lv === "kab" ? w.kab : `${w.kec}, ${w.kab}`, r = per.get(kunci) || per.set(kunci, {n: 0, sat: 0, ids: []}).get(kunci);
      for (const [k, , uji] of KOLOM) if (uji(p)) { r[k] = (r[k] || 0) + 1; r.n++; if (k === "api" && p.titik_panas) r.sat++; r.ids.push(f.id); }
    }
    const baris = [...per.entries()].filter(([, r]) => r.n).sort((a, b) => b[1].n - a[1].n).slice(0, 25);
    const tot = Object.fromEntries(KOLOM.map(([k]) => [k, baris.reduce((a, [, r]) => a + (r[k] || 0), 0)]));
    bukaPanel("ringkas", `<div class="lw-p-kepala"><div><h3>Ringkasan ${lv === "kab" ? "kabupaten/kota" : "kecamatan"}</h3><p>Laporan aktif di area peta, ${RENTANG.find(x => x[0] === S.jam)[2]} terakhir · ${K.BAHAYA[S.bahaya]}</p></div></div>
      <div class="lw-pil" role="group" aria-label="Tingkat wilayah"><button class="lw-btn" data-lv="kab" aria-pressed="${lv === "kab"}">Kab/Kota</button><button class="lw-btn" data-lv="kec" aria-pressed="${lv === "kec"}">Kecamatan</button></div>
      <div class="lw-angka">${KOLOM.map(([k, n]) => `<div><b>${k === "api" ? `${tot.api}` : tot[k]}</b><span>${n}</span></div>`).join("")}</div>
      ${baris.length ? `<div class="lw-tabel"><table><thead><tr><th>Wilayah</th>${KOLOM.map(([, n]) => `<th>${n}</th>`).join("")}</tr></thead><tbody>${baris.map(([nama, r]) =>
        `<tr data-ids="${r.ids.join(",")}" tabindex="0"><th>${esc(nama)}</th>${KOLOM.map(([k]) => `<td>${k === "api" && r.api ? `${r.sat}/${r.api - r.sat}` : r[k] || ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
        : `<p class="lw-kecil">Belum ada laporan yang dihitung di area ini.</p>`}
      <p class="lw-kecil">Wilayah ditentukan dari pusat kecamatan terdekat (perkiraan). Api: terkonfirmasi satelit / belum.</p>`);
    const P = $("#lwPanel"); P.dataset.tingkat = lv;
    P.querySelectorAll("[data-lv]").forEach(b => b.onclick = () => { P.dataset.tingkat = b.dataset.lv; ringkasan(); });
    P.querySelectorAll("tr[data-ids]").forEach(tr => { const go = () => { const ids = new Set(tr.dataset.ids.split(",")), b = new maplibregl.LngLatBounds();
      dataMentah.filter(f => ids.has(f.id)).forEach(f => b.extend(f.geometry.coordinates)); if (!b.isEmpty()) peta.fitBounds(b, {padding: 80, maxZoom: 14}); };
      tr.onclick = go; tr.onkeydown = e => { if (e.key === "Enter") go(); }; });
  }

  function bantuan() {
    bukaPanel("bantu", `<div class="lw-p-kepala"><div><h3>Lapor Warga</h3><p>Warga bantu warga saat bencana</p></div></div>
      <p>Tandai kondisi di sekitar Anda supaya tetangga, relawan, dan posko tahu: listrik, sinyal, BBM/LPG, kebutuhan bantuan, dan kondisi bencana.</p>
      <h4>Warna penanda</h4><ul class="lw-legenda">${[["buruk", "Mati / habis / parah"], ["sedang", "Terbatas / genset / lemah"], ["baik", "Normal / hidup / lancar"], ["minta", "Minta bantuan"], ["tawar", "Tawaran bantuan"], ["info", "Pesan"]].map(([k, n]) =>
        `<li><span class="lw-titikw" style="background:${pastel(K.WARNA[k], .5)};border:2px solid ${K.WARNA[k]}"></span>${n}</li>`).join("")}</ul>
      <h4>Jenis laporan</h4><ul class="lw-legenda">${K.jenisUntuk(S.bahaya).map(j => `<li>${chip(j, 15)}${esc(K.JENIS[j].nama)} <small>· berlaku ${K.JENIS[j].bantuan ? "s.d. selesai/7 hari" : K.JENIS[j].umur >= 168 ? "7 hari" : K.JENIS[j].umur + " jam"}</small></li>`).join("")}</ul>
      <h4>Aturan</h4><ul><li>Tanpa akun. Satu perangkat paling banyak 10 laporan per jam.</li><li>Status memudar setelah separuh masa berlakunya lalu hilang otomatis.</li>
      <li>Tautan dan nomor HP di keterangan dihapus otomatis. Nomor WhatsApp hanya untuk permintaan/tawaran bantuan, ditampilkan bila diminta, dihapus setelah 72 jam.</li>
      <li>Laporan yang diadukan 3 orang disembunyikan untuk ditinjau.</li><li>Foto belum didukung (risiko moderasi).</li>
      <li>Keadaan darurat jiwa: hubungi 112. Laporan warga tidak menggantikan laporan resmi ke BPBD/posko.</li>
      <li>Data pribadi diproses sesuai UU PDP No. 27/2022: <a href="${AKAR}privasi.html" target="_blank" rel="noopener">pemberitahuan privasi</a>.</li></ul>`);
  }

  /* ---------------- masuk ---------------- */
  async function mulai() {
    K = (await import(AKAR + "informasi_jenis.js")).default;
    akar = document.getElementById("informasi"); akar.classList.add("lw");
    kerangka(); buatPeta();
    fetch(API + "/konfig").then(r => r.ok ? r.json() : null).then(k => { if (k) konfig = k; }).catch(() => {});
    peta.once("style.load", () => {   // tidak menunggu semua ubin dasar: data warga lebih penting
      const id = new URLSearchParams(location.search).get("laporan");
      if (id && /^[0-9a-f]{16}$/.test(id)) rincian(id); else muat(true);
    });
    setInterval(() => { if (!document.hidden && akar.offsetParent) muat(true); }, 120e3);
  }
  let mulaiP = null;
  window.Informasi = {get peta() { return peta; }, render() { if (!mulaiP) mulaiP = mulai().catch(e => { console.error(e); const el = document.getElementById("informasi"); if (el) el.innerHTML = `<p class="lw-galat" style="padding:20px">Lapor Warga gagal dimuat: ${esc(e.message)}</p>`; });
    else mulaiP.then(() => peta?.resize()); }};
  if (document.getElementById("p-informasi")?.classList.contains("on")) window.Informasi.render();
})();
