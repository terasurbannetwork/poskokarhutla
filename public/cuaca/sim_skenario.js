"use strict";
/* sim_skenario.js: sel badai 3D, skenario (siklon lebih dekat, intensitas naik, sistem lebih lambat), dampak ke pelabuhan dan bandara,
   dan perlakuan. Dimuat sesudah sim_layar.js (window.SimCtx). Semua perhitungan kecil dan jalan di timer/rAF, tidak di handler klik.
   Prakiraan nyata tetap dasar: skenario hanya mengubah medan secara terbuka (rumus di kartu Asumsi), tidak ada angka karangan. */
(() => {
  const C = window.SimCtx; if (!C) return;
  const S = C.S, SC = C.SC, f0 = C.f0, f1 = C.f1, RAD = Math.PI / 180, KMD = 111.32;
  const K = {pa: 0, ph: 0, kec: 100, ambang: 10, sik: {on: false, jarak: 150, kt: 80, rm: 40}, perl: {pel: false, ban: false, nel: new Set(), depan: 3},
    tab: "waktu", gen: 0, vor: null, jalur: [], sasaran: null, namaProv: {}, sites: [], tiRisiko: null};
  const WARNA = ["#5a9e74", "#e3b94e", "#c9503a"], NAMA = ["Buka", "Terganggu", "Tutup"];
  const IK = {sel: '<path d="M7 18a5 5 0 1 1 1.2-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/><path d="M12 12v6M9 21l1-3M15 21l-1-3"/>', siklon: '<path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M12 10C12 5 8 3 4 4M12 14c0 5 4 7 8 6M10 12C5 12 3 8 4 4M14 12c5 0 7 4 6 8"/>',
    naik: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', lambat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', kapal: '<path d="M3 17l2 3h14l2-3zM12 3v10M12 5l6 6h-6"/>',
    pesawat: '<path d="M21 15l-8-4V5a1.5 1.5 0 0 0-3 0v6l-8 4v2l8-1.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-3.5l8 1.5z"/>', nelayan: '<path d="M3 18c3 0 3 2 6 2s3-2 6-2 3 2 6 2M5 14l7-10 7 10z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>', atur: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>', buku: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'};
  const ik = d => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const kartu = (i, judul, kalimat, isi) => `<section class="sc-k"><h3><span class="sc-ik">${ik(IK[i])}</span>${judul}</h3>${kalimat ? `<p>${kalimat}</p>` : ""}${isi || ""}</section>`;
  const geser = (id, lbl, min, max, step, v, sat) => `<label class="sc-gs"><span>${lbl}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"><b id="${id}V">${fmt(v)}${sat}</b></label>`;
  const jamTeks = h => C.teksWaktu(S.jam0 + h * 36e5).replace(" WIB", "");
  const npel = () => S.A?.pelabuhan?.length || 0;

  /* ---------------------------------------------------------------- bahan tetap: sarana dan titik gelombang */
  function siapSarana() {
    const sites = [], titik = S.G?.titik || [];
    for (const [nama, la, lo, prov, jenis] of S.A?.pelabuhan || []) sites.push({j: "p", nama, lat: la, lon: lo, prov, jenis});
    for (const [kode, nama, la, lo, prov] of S.A?.bandara || []) sites.push({j: "b", nama: `${nama} (${kode})`, lat: la, lon: lo, prov});
    for (const s of sites) { let b = -1, bd = 150; titik.forEach((p, i) => { if (Math.abs(p[0] - s.lat) < 1.5 && Math.abs(p[1] - s.lon) < 1.5) { const d = SC.jarak(s.lat, s.lon, p[0], p[1]); if (d < bd) { bd = d; b = i; } } }); s.ti = b; }
    K.sites = sites;
  }

  /* ---------------------------------------------------------------- siklon */
  function trackDasar() {
    const c = S.K?.aktif?.[0];
    if (c) { const pts = (c.lintasan || []).map(p => ({ms: Date.parse(p[0]), lat: p[1], lon: p[2], kt: p[3]})).filter(p => !isNaN(p.ms)).sort((a, b) => a.ms - b.ms);
      if (pts.length > 1) return {pts, nama: c.nama, nyata: true}; }
    return null;
  }
  const dihitungPada = (pts, ms) => { if (ms < pts[0].ms || ms > pts[pts.length - 1].ms) return null; let i = 0; while (i < pts.length - 2 && pts[i + 1].ms < ms) i++;
    const a = pts[i], b = pts[i + 1], w = (ms - a.ms) / (b.ms - a.ms || 1), m = k => a[k] + (b[k] - a[k]) * w; return {lat: m("lat"), lon: m("lon"), kt: m("kt")}; };
  /* geser seluruh lintasan ke arah pelabuhan terdekat sampai titik terdekatnya X km (hanya jam di dalam 72 jam prakiraan) */
  function geserTrack(pts, X) {
    const t0 = S.jam0, t1 = S.jam0 + (S.n - 1) * 36e5; let d0 = 1e9, pa = null, pc = null;
    for (let ms = Math.max(t0, pts[0].ms); ms <= Math.min(t1, pts[pts.length - 1].ms); ms += 36e5) {
      const p = dihitungPada(pts, ms); if (!p) continue;
      for (const s of K.sites) { if (s.j !== "p") continue; if (Math.abs(s.lat - p.lat) > d0 / KMD) continue; const d = SC.jarak(p.lat, p.lon, s.lat, s.lon); if (d < d0) { d0 = d; pa = p; pc = s; } } }
    if (!pa || d0 <= X) return pts.map(p => ({...p}));
    const k = (d0 - X) / d0, dla = (pc.lat - pa.lat) * k, dlo = (pc.lon - pa.lon) * k;
    return pts.map(p => ({...p, lat: p.lat + dla, lon: p.lon + dlo}));
  }
  function bangunSiklon() {
    K.vor = null; K.mh = NaN;
    if (!K.sik.on) return;
    const d = trackDasar();
    if (d) { K.vor = {pts: geserTrack(d.pts, K.sik.jarak), asli: d.pts, nama: d.nama, nyata: true}; }
    else { /* tidak ada siklon aktif: pengandaian lurus ke barat 20 km/jam, melintasi sasaran pada jam 45 dengan selisih ke selatan sebesar jarak yang dipilih */
      const sa = K.sasaran || (C.peta() ? (g => [g.lng, g.lat])(C.peta().getCenter()) : [118, -2.4]), lat = sa[1] - K.sik.jarak / KMD, pts = [];
      for (let h = 0; h <= S.n; h += 6) pts.push({ms: S.jam0 + h * 36e5, lat, lon: sa[0] + (900 - 20 * h) / (KMD * Math.cos(lat * RAD)), kt: K.sik.kt});
      K.vor = {pts, nama: "Siklon pengandaian", nyata: false}; }
  }
  const pusat = h => K.vor ? dihitungPada(K.vor.pts, S.jam0 + h * 36e5) : null;
  const vmaks = p => p.kt * SC.KT;
  /* satu jam yang sama dipakai ribuan kali per bingkai (partikel, kanvas): posisi disimpan sekali */
  function memo(h) { if (K.mh !== h) { K.mh = h; const p = pusat(h); K.mm = p ? {p, vp: vmaks(p), a: K.vor.asli ? dihitungPada(K.vor.asli, S.jam0 + h * 36e5) : null} : null; if (K.mm?.a) K.mm.va = vmaks(K.mm.a); } return K.mm; }
  /* vektor angin yang DITAMBAHKAN ke angin prakiraan di (lon, lat) pada jam h, atau null.
     Siklon nyata: hanya selisih Holland(lintasan geser) - Holland(lintasan asli), sebab kisi sudah memuat siklon di tempat aslinya. Pengandaian: penuh. */
  function vorAt(lon, lat, h) { const m = memo(h); if (!m) return null; const a = m.a;
    return SC.anginSelisih(lat, lon, K.sik.rm, m.p.lat, m.p.lon, m.vp, a ? a.lat : null, a ? a.lon : 0, a ? m.va : 0); }
  S.vorAt = vorAt;

  /* ---------------------------------------------------------------- medan skenario */
  function bingkaiSemua(M) { const o = []; for (let h = 0; h < S.n; h++) o.push(SC.bingkai(M, h)); return o; }
  function medanSkenario() {
    const M = S.M, pa = 1 + K.pa / 100, ph = 1 + K.ph / 100, kw = K.kec / 100;
    if (!K.pa && !K.ph && K.kec === 100) return null;
    const o = {...M, u: [], v: [], r: [], g: []};
    for (let h = 0; h < M.n; h++) { const fr = SC.bingkai(M, h * kw);
      o.u.push(Float32Array.from(fr.u, x => x * pa * 10)); o.v.push(Float32Array.from(fr.v, x => x * pa * 10)); o.r.push(Float32Array.from(fr.r, x => x * ph * 10)); o.g.push(Float32Array.from(fr.g, x => x * pa)); }
    return o;
  }
  function hsBase(p, tt) { const a = p[4], c = Math.max(0, Math.min(a.length - 1, tt)), i = Math.floor(c), j = Math.min(a.length - 1, i + 1), f = c - i; return a[i] == null ? null : a[j] == null ? a[i] / 10 : (a[i] * (1 - f) + a[j] * f) / 10; }

  /* ---------------------------------------------------------------- satu perhitungan penuh */
  const hitung = (M, F, skenario) => { /* M = medan (geometri), F = bingkai per jam; skenario = {pa, kw, vor} atau null */
    const titik = S.G?.titik || [], n = S.n, HS = [], WK = [];
    const pa = skenario ? 1 + K.pa / 100 : 1, kw = skenario ? K.kec / 100 : 1;
    titik.forEach(p => { const hs = new Float32Array(n), wk = new Float32Array(n);
      for (let h = 0; h < n; h++) { const b = hsBase(p, h * kw); let x = b == null ? NaN : b * pa * pa;
        let u = SC.cuplik(M, F[h].u, p[1], p[0]), v = SC.cuplik(M, F[h].v, p[1], p[0]);
        if (u == null) { u = v = NaN; } else if (skenario) { const w = vorAt(p[1], p[0], h); if (w) { u += w[0]; v += w[1]; const pm = SC.hsPenuh(Math.hypot(u, v)); /* dari angin total */ if (!(x >= pm)) x = pm; } }
        hs[h] = x; wk[h] = Math.hypot(u, v) / SC.KT; }
      HS.push(hs); WK.push(wk); });
    const st = K.sites.map(s => { const a = new Int8Array(n).fill(-1), g = new Float32Array(n), r = new Float32Array(n), kt = new Float32Array(n);
      for (let h = 0; h < n; h++) {
        let uu = SC.cuplik(M, F[h].u, s.lon, s.lat), vv = SC.cuplik(M, F[h].v, s.lon, s.lat), gg = SC.cuplik(M, F[h].g, s.lon, s.lat), rr = SC.cuplik(M, F[h].r, s.lon, s.lat);
        if (uu != null && skenario) { const w = vorAt(s.lon, s.lat, h); if (w) { uu += w[0]; vv += w[1]; gg = Math.max(gg, Math.hypot(uu, vv) * 3.6); } }
        const hs = s.ti >= 0 && !isNaN(HS[s.ti][h]) ? HS[s.ti][h] : null, ktt = uu == null ? null : Math.hypot(uu, vv) / SC.KT;
        g[h] = gg ?? 0; r[h] = rr ?? 0; kt[h] = ktt ?? 0;
        if (s.j === "p") { if (hs != null || ktt != null) a[h] = SC.statusPelabuhan(hs, ktt); }
        else if (uu != null) a[h] = SC.statusBandara(gg, rr); }
      return {a, g, r, kt}; });
    return {HS, WK, st};
  };

  /* ---------------------------------------------------------------- sel badai */
  function deteksiSel(F) {
    const M = S.M, per = F.map(fr => SC.sel(M, fr.r, K.ambang));
    return SC.lacak(per, 150);
  }

  /* ---------------------------------------------------------------- pembaruan menyeluruh */
  let rencana = 0;
  function mintaHitung(segera) { clearTimeout(rencana); rencana = setTimeout(() => requestAnimationFrame(proses), segera ? 0 : 140); }
  function proses() { /* dipecah per rAF supaya tiap potong < 1 bingkai; putaran lama dibatalkan oleh yang baru */
    const M0 = S.M; if (!M0) return; const id = ++K.gen; let ms = 0, i = 0;
    const langkah = [
      () => { if (!K.F0) { K.F0 = bingkaiSemua(M0); K.dasar = hitung(M0, K.F0, null); } },
      () => { bangunSiklon(); S.vorAda = !!K.vor; K.Mn = medanSkenario(); K.F1 = K.Mn ? bingkaiSemua(K.Mn) : K.F0; },
      () => { K.skn = (K.Mn || K.vor) ? hitung(K.Mn || M0, K.F1, true) : K.dasar; S.Msk = K.Mn; S.fr = null; S.HS = K.skn.HS; }, /* medan, HS, dan bingkai berganti bersamaan */
      () => { K.jalur = deteksiSel(K.F1); },
      () => { gambarStatis(); K.kotor = true; if (K.tab === "dampak") panelDampak(); C.jadwal(true); if (window.SimGraf) SimGraf.segar(); mulaiPutar(); document.dispatchEvent(new Event("sim-hitung")); }];
    const maju = () => { if (id !== K.gen) return; const t = performance.now(); langkah[i++](); ms += performance.now() - t; S.msHitung = Math.round(ms); if (i < langkah.length) requestAnimationFrame(maju); };
    maju();
  }
  const adaSkenario = () => !!(K.pa || K.ph || K.kec !== 100 || K.sik.on);

  /* ---------------------------------------------------------------- lapisan peta */
  let peta = null;
  const kosong = () => ({type: "FeatureCollection", features: []});
  const sumber = (id, d) => { if (!peta.getSource(id)) peta.addSource(id, {type: "geojson", data: d || kosong()}); return peta.getSource(id); };
  function pasang(m) {
    peta = m; if (!S.M || m.getLayer("sk-kolom")) return;
    const atas = (m.getStyle().layers.find(l => l.type === "symbol") || {}).id;
    sumber("sk-sel"); sumber("sk-jalur"); sumber("sk-track"); sumber("sk-cincin"); sumber("sk-lengan"); sumber("sk-pusat");
    const cv = K.cv ||= document.createElement("canvas"); cv.width = cv.height = PX; K.cx = cv.getContext("2d"); K.img = K.cx.createImageData(PX, PX);
    const kot = [[0, 1], [1, 1], [1, 0], [0, 0]];
    if (!peta.getSource("sk-angin")) peta.addSource("sk-angin", {type: "canvas", canvas: cv, coordinates: kot, animate: false});
    peta.addLayer({id: "sk-angin", type: "raster", source: "sk-angin", paint: {"raster-opacity": .9, "raster-fade-duration": 0, "raster-resampling": "linear"}}, atas);
    const warnaPk = ["step", ["get", "pk"], "#7a5ad0", 20, "#c0409a", 50, "#d8283c"];
    peta.addLayer({id: "sk-jalur", type: "line", source: "sk-jalur", paint: {"line-color": "#7a5ad0", "line-width": 1.6, "line-opacity": .8, "line-dasharray": [2, 1.5]}});
    for (const [id, k, o] of [["sk-kolom", 0, .4], ["sk-inti", 1, .85]]) peta.addLayer({id, type: "fill-extrusion", source: "sk-sel", filter: ["==", ["get", "k"], k], paint: {"fill-extrusion-color": warnaPk, "fill-extrusion-height": ["get", "h"], "fill-extrusion-base": ["get", "b"], "fill-extrusion-opacity": o, "fill-extrusion-vertical-gradient": true}});
    peta.addLayer({id: "sk-track", type: "line", source: "sk-track", paint: {"line-color": "#e07a1f", "line-width": 3, "line-dasharray": [1.5, 1.5]}});
    peta.addLayer({id: "sk-cincin", type: "line", source: "sk-cincin", paint: {"line-color": ["match", ["get", "kt"], 64, "#c9503a", 50, "#e58a45", "#e3b94e"], "line-width": 1.6, "line-opacity": .9}});
    peta.addLayer({id: "sk-lengan", type: "line", source: "sk-lengan", paint: {"line-color": "#ffffff", "line-width": 3, "line-opacity": .85, "line-blur": 1}});
    peta.addLayer({id: "sk-pusat", type: "circle", source: "sk-pusat", paint: {"circle-radius": 7, "circle-color": "#e07a1f", "circle-stroke-width": 3, "circle-stroke-color": "#fff"}});
    peta.addLayer({id: "sk-pusat-t", type: "symbol", source: "sk-pusat", layout: {"text-field": ["get", "lbl"], "text-size": 12, "text-font": ["Noto Sans Bold"], "text-offset": [0, 1.9]},
      paint: {"text-color": C.gelap() ? "#ffd9b5" : "#8a4a0a", "text-halo-color": C.gelap() ? "#0b1220" : "#fff", "text-halo-width": 1.5}});
    tampak(); gambarStatis(); C.jadwal(true);
  }
  function tampak() {
    if (!peta?.getLayer("sk-kolom")) return;
    const sel = S.hidup.has("sel"), sk = S.hidup.has("siklon") || K.sik.on, v = (id, on) => peta.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    v("sk-kolom", sel); v("sk-inti", sel); v("sk-jalur", sel); for (const id of ["sk-track", "sk-cincin", "sk-lengan", "sk-pusat", "sk-pusat-t", "sk-angin"]) v(id, K.sik.on);
  }
  function gambarStatis() {
    if (!peta?.getSource("sk-jalur")) return;
    peta.getSource("sk-jalur").setData({type: "FeatureCollection", features: K.jalur.filter(j => j.pts.length > 1).map(j => ({type: "Feature", geometry: {type: "LineString", coordinates: j.pts.map(p => [p.lon, p.lat])}, properties: {}}))});
    peta.getSource("sk-track").setData(K.vor ? {type: "FeatureCollection", features: [{type: "Feature", geometry: {type: "LineString", coordinates: K.vor.pts.map(p => [p.lon, p.lat])}, properties: {}}]} : kosong());
    tampak();
  }

  /* dipanggil layar tiap bingkai (jam pecahan t) */
  function bingkai(t) {
    if (!peta?.getSource("sk-sel")) return;
    const mpp = 156543 * Math.cos(15 * RAD) / Math.pow(2, peta.getZoom()), fit = [];
    if (S.hidup.has("sel")) for (const j of K.jalur) { const p = SC.jalurPada(j, t); if (!p) continue;
      const r = Math.max(Math.sqrt(p.luas / Math.PI), 11 * mpp / 1000), tinggi = Math.max(p.pk, 1) / 10 * 34 * mpp, ring = rr => [SC.lingkaran(p.lat, p.lon, rr, 20)];
      fit.push({type: "Feature", geometry: {type: "Polygon", coordinates: ring(r)}, properties: {pk: p.pk, h: tinggi, b: 0, k: 0}},
        {type: "Feature", geometry: {type: "Polygon", coordinates: ring(r * .55)}, properties: {pk: p.pk, h: tinggi * 1.4, b: tinggi, k: 1}}); }
    if (!S.hidup.has("sel")) { if (K.selKosong) { siklonBingkai(t); return; } K.selKosong = true; } else K.selKosong = false; /* lapisan mati dan kosong sudah terkirim: lewati */
    peta.getSource("sk-sel").setData({type: "FeatureCollection", features: fit});
    siklonBingkai(t);
  }
  const PX = 48; /* kanvas angin siklon kecil; MapLibre menghaluskan */
  function siklonBingkai(t) {
    if (!K.vor || !peta.getSource("sk-pusat")) return;
    const p = pusat(t); if (!p) { if (K.tampil !== false) { for (const id of ["sk-pusat", "sk-cincin", "sk-lengan"]) peta.getSource(id).setData(kosong()); K.cx.clearRect(0, 0, PX, PX); const s = peta.getSource("sk-angin"); s.play(); s.pause(); K.tampil = false; K.kunci = ""; } return; }
    K.tampil = true; K.pt = p;
    const vm = vmaks(p), rm = K.sik.rm, kunci = `${Math.round(p.lat * 10)},${Math.round(p.lon * 10)},${Math.round(vm)},${rm},${K.sik.jarak}`;
    if (kunci === K.kunci) return; K.kunci = kunci; /* posisi, kekuatan, dan radius sama dengan bingkai lalu: tidak digambar ulang */
    peta.getSource("sk-pusat").setData({type: "FeatureCollection", features: [{type: "Feature", geometry: {type: "Point", coordinates: [p.lon, p.lat]}, properties: {lbl: `${K.vor.nama} · ${f0(p.kt)} knot`}}]});
    const ring = [];
    for (const kt of [34, 50, 64]) { const r = SC.radiusAngin(kt * SC.KT, vm, rm); if (r) ring.push({type: "Feature", geometry: {type: "LineString", coordinates: SC.lingkaran(p.lat, p.lon, r, 48)}, properties: {kt}}); }
    peta.getSource("sk-cincin").setData({type: "FeatureCollection", features: ring});
    /* kotak 10 derajat di sekitar pusat; yang digambar angin yang ditambahkan ke kisi (selisih untuk siklon nyata) */
    const sisi = 5, la0 = p.lat - sisi, la1 = p.lat + sisi, lo0 = p.lon - sisi, lo1 = p.lon + sisi, im = K.img.data, T = SC.TAB_EMBUS, f = 255 / T.vmaks;
    for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
      const la = la1 - (y + .5) / PX * 2 * sisi, lo = lo0 + (x + .5) / PX * 2 * sisi, w = vorAt(lo, la, t), v = w ? Math.hypot(w[0], w[1]) * 3.6 : 0, o = (y * PX + x) * 4;
      if (v < T.min) { im[o + 3] = 0; continue; }
      const e = Math.min(1, Math.min(x, PX - 1 - x, y, PX - 1 - y) / 7), k = (v >= T.vmaks ? 255 : Math.round(v * f)) * 4; /* pinggir memudar */
      im[o] = T.t[k]; im[o + 1] = T.t[k + 1]; im[o + 2] = T.t[k + 2]; im[o + 3] = Math.round(T.t[k + 3] * e); }
    K.cx.putImageData(K.img, 0, 0);
    const s = peta.getSource("sk-angin"); s.setCoordinates([[lo0, la1], [lo1, la1], [lo1, la0], [lo0, la0]]); s.play(); s.pause();
  }
  /* lengan spiral berputar ~15 kali per detik; loop berhenti sendiri bila siklon mati atau tab tersembunyi */
  function mulaiPutar() { if (K.putarJalan || !K.sik.on || document.hidden) return; K.putarJalan = true; requestAnimationFrame(putar); }
  function putar(now) {
    if (!K.sik.on || !K.vor || document.hidden) { K.putarJalan = false; return; }
    if (K.tampil && peta?.getSource("sk-lengan")) {
      const p = K.pt, sg = p.lat >= 0 ? 1 : -1, ph = now / 1000 * .9 * sg, rr = SC.radiusAngin(34 * SC.KT, vmaks(p), K.sik.rm) || K.sik.rm * 4, fit = [];
      for (let a = 0; a < 3; a++) { const c = []; for (let i = 0; i <= 28; i++) { const q = i / 28, ang = ph + a * 2 * Math.PI / 3 + sg * q * 2.4, r = rr * (.12 + .88 * q), la = p.lat + Math.sin(ang) * r / KMD, lo = p.lon + Math.cos(ang) * r / (KMD * Math.cos(p.lat * RAD)); c.push([lo, la]); }
        fit.push({type: "Feature", geometry: {type: "LineString", coordinates: c}, properties: {}}); }
      peta.getSource("sk-lengan").setData({type: "FeatureCollection", features: fit});
    }
    setTimeout(() => requestAnimationFrame(putar), 66);
  }
  document.addEventListener("visibilitychange", mulaiPutar);

  /* ---------------------------------------------------------------- panel Skenario */
  function panelSkenario() {
    const k = K.sik, nyata = !!trackDasar(), d = trackDasar(), sasar = K.sasaran ? `${f1(K.sasaran[1])}, ${f1(K.sasaran[0])}` : "pusat peta";
    $("#t-skenario").innerHTML = kartu("sel", "Sel badai", `Hujan lebat dari model kisi 1,5 derajat; kotak ungu di peta adalah penandanya, bukan radar.`,
        geser("skA", "Batas hujan sel", 5, 30, 1, K.ambang, " mm/jam")) +
      kartu("siklon", "Siklon melintas lebih dekat", nyata ? `${esc(d.nama)} digeser ke arah pelabuhan terdekat sampai jaraknya segini.` : `Tidak ada siklon aktif, jadi ini siklon pengandaian yang melintasi sasaran ${sasar} (klik peta untuk mengganti).`,
        `<button type="button" class="sc-sw" id="skS" aria-pressed="${k.on}">${k.on ? "Menyala" : "Nyalakan"}</button>` +
        (k.on ? geser("skJ", "Jarak terdekat ke pantai", 30, 600, 10, k.jarak, " km") + (nyata ? "" : geser("skV", "Angin maksimum", 40, 140, 5, k.kt, " knot")) + geser("skR", "Radius angin maksimum", 20, 80, 5, k.rm, " km") : "")) +
      kartu("naik", "Intensitas naik", "Angin dan hujan dikali dari prakiraan, gelombang ikut naik.",
        geser("skP", "Angin", 0, 100, 5, K.pa, "%") + geser("skH", "Hujan", 0, 100, 5, K.ph, "%")) +
      kartu("lambat", "Sistem lebih lambat", "Cuaca bergerak lebih pelan, jadi hujan dan angin bertahan lebih lama.", geser("skL", "Kecepatan sistem", 50, 100, 5, K.kec, "%")) +
      `<button type="button" class="sc-reset" id="skReset">Kembali ke prakiraan</button>`;
    const baca = (id, fn, sat) => { const e = $("#" + id); if (!e) return; e.oninput = () => { fn(+e.value); $("#" + id + "V").textContent = fmt(+e.value) + sat; mintaHitung(); }; };
    baca("skA", v => K.ambang = v, " mm/jam"); baca("skJ", v => k.jarak = v, " km"); baca("skV", v => k.kt = v, " knot"); baca("skR", v => k.rm = v, " km");
    baca("skP", v => K.pa = v, "%"); baca("skH", v => K.ph = v, "%"); baca("skL", v => K.kec = v, "%");
    $("#skS").onclick = () => { k.on = !k.on; panelSkenario(); C.legenda(); mintaHitung(true); };
    $("#skReset").onclick = () => { K.pa = K.ph = 0; K.kec = 100; k.on = false; panelSkenario(); C.legenda(); mintaHitung(true); };
  }

  /* ---------------------------------------------------------------- Dampak */
  const peringkat = (j, st) => { const o = []; K.sites.forEach((s, i) => { if (s.j !== j) return; const a = st[i].a, r = SC.ringkasStatus(a); if (r.lama) o.push({s, i, r, mx: r.tLama ? 2 : 1}); });
    return o.sort((x, y) => y.r.tLama - x.r.tLama || y.r.lama - x.r.lama); };
  const hitStat = (j, st) => { let n = 0, g = 0, t = 0, jg = 0, jt = 0; K.sites.forEach((s, i) => { if (s.j !== j) return; const a = st[i].a; if (a.every(v => v < 0)) return; n++;
      const r = SC.ringkasStatus(a); if (r.lama) g++; if (r.tLama) t++; a.forEach(v => { if (v === 1) jg++; else if (v === 2) jt++; }); }); return {n, g, t, jg, jt}; };
  function tabel(daftar, j) {
    if (!daftar.length) return "";
    return `<table class="sc-tb"><thead><tr><th>${j === "p" ? "Pelabuhan" : "Bandara"}</th><th>Status</th><th>Mulai</th><th class="n">Jam</th></tr></thead><tbody>${daftar.slice(0, 8).map(x => `<tr data-i="${x.i}" tabindex="0"><td>${esc(x.s.nama)}<small>${esc(K.namaProv[x.s.prov] || "")}</small></td>
      <td><span class="sc-pil" style="--w:${WARNA[x.mx]}">${NAMA[x.mx]}</span></td><td>${jamTeks(x.mx === 2 ? x.r.tMulai : x.r.mulai)}</td><td class="n">${fmt(x.mx === 2 ? x.r.tLama : x.r.lama)}</td></tr>`).join("")}</tbody></table>`;
  }
  function perlakuanHasil(sk) {
    const P = K.perl, dp = P.depan, st = sk.st, o = {};
    const sarana = j => { let berisikoT0 = 0, berisikoG0 = 0, tutup = 0, ada = 0; K.sites.forEach((s, i) => { if (s.j !== j) return; const a = st[i].a; if (a.every(v => v < 0)) return; ada++;
        const c = SC.jamTutup(Int8Array.from(a, v => Math.max(v, 0)), dp); a.forEach((v, h) => { if (v === 2) berisikoT0++; else if (v === 1) berisikoG0++; if (c[h]) tutup++; }); }); return {berisikoT0, berisikoG0, tutup, ada}; };
    o.p = sarana("p"); o.b = sarana("b");
    /* nelayan: jam-perairan = satu titik gelombang selama satu jam; berisiko bila ambang perahu nelayan terlampaui */
    let tanpa = 0, dgnTerpapar = 0, lindung = 0, hilang = 0; const titik = S.G?.titik || [];
    titik.forEach((p, ti) => { const r = Int8Array.from(sk.HS[ti], (hs, h) => SC.berisikoNelayan(isNaN(hs) ? null : hs, sk.WK[ti][h]) ? 1 : 0), pilih = P.nel.has(p[2]), c = SC.jamTutup(r, dp);
      r.forEach((v, h) => { if (v) { tanpa++; if (pilih) lindung++; else dgnTerpapar++; } else if (pilih && c[h]) hilang++; }); });
    o.n = {tanpa, dgnTerpapar, lindung, hilang};
    return o;
  }
  function risikoProv(sk) { const m = new Map(); (S.G?.titik || []).forEach((p, ti) => { let n = 0; sk.HS[ti].forEach((hs, h) => { if (SC.berisikoNelayan(isNaN(hs) ? null : hs, sk.WK[ti][h])) n++; }); if (n) m.set(p[2], (m.get(p[2]) || 0) + n); });
    return [...m].sort((a, b) => b[1] - a[1]); }
  const baris = (nama, a, b) => `<tr><td>${nama}</td><td class="n">${fmt(a)}</td><td class="n"><b>${fmt(b)}</b></td></tr>`;
  function barisPerl() { const pr = perlakuanHasil(K.skn), pc = K.perl;
    return baris("Jam pelabuhan beroperasi saat Tutup", pr.p.berisikoT0, pc.pel ? 0 : pr.p.berisikoT0) + baris("Jam pelabuhan beroperasi saat Terganggu", pr.p.berisikoG0, pc.pel ? 0 : pr.p.berisikoG0) + baris("Jam pelabuhan ditutup", 0, pc.pel ? pr.p.tutup : 0) +
      baris("Jam bandara beroperasi saat Tutup", pr.b.berisikoT0, pc.ban ? 0 : pr.b.berisikoT0) + baris("Jam bandara beroperasi saat Terganggu", pr.b.berisikoG0, pc.ban ? 0 : pr.b.berisikoG0) + baris("Jam penerbangan ditunda", 0, pc.ban ? pr.b.tutup : 0) +
      baris("Jam perairan berisiko untuk nelayan", pr.n.tanpa, pr.n.dgnTerpapar) + baris("Jam nelayan terlindungi di darat", 0, pr.n.lindung) + baris("Jam melaut yang hilang", 0, pr.n.hilang); }
  /* hanya isi tabel yang ditulis ulang; chip dan penggeser tidak dibangun lagi */
  function segarTabel() { const e = $("#pBd"); if (e) e.innerHTML = barisPerl(); }
  function panelDampak() {
    K.kotor = false;
    const sk = K.skn, d0 = K.dasar, ada = adaSkenario();
    const P = hitStat("p", sk.st), B = hitStat("b", sk.st), P0 = hitStat("p", d0.st), B0 = hitStat("b", d0.st);
    const pb = (a, a0, kata) => `${fmt(a.g)} dari ${fmt(a.n)} ${kata} terganggu dan ${fmt(a.t)} tutup dalam 72 jam${ada ? ` (prakiraan: ${fmt(a0.g)} dan ${fmt(a0.t)})` : ""}.`;
    const pc = K.perl, rp = risikoProv(sk), chip = (id, n, ik2, on) => `<button type="button" class="sc-sw" id="${id}" aria-pressed="${on}">${ik(IK[ik2])}${n}</button>`;
    const kosongP = !npel() && !S.A?.bandara?.length;
    $("#t-dampak").innerHTML = kosongP ? `<div class="sc-kosong"><b>Data pelabuhan dan bandara belum tersedia.</b></div>` :
      kartu("kapal", "Pelabuhan", pb(P, P0, "pelabuhan"), tabel(peringkat("p", sk.st), "p")) +
      kartu("pesawat", "Bandara", pb(B, B0, "bandara"), tabel(peringkat("b", sk.st), "b")) +
      kartu("atur", "Perlakuan", "Pilih tindakan, lalu bandingkan jam berisiko dan jam layanan yang hilang.",
        `<div class="sc-cip3">${chip("pTp", "Tutup pelabuhan", "kapal", pc.pel)}${chip("pTb", "Tunda penerbangan", "pesawat", pc.ban)}</div>
         ${geser("pD", "Mulai lebih awal", 0, 12, 1, pc.depan, " jam")}
         <div class="sc-lbl">Nelayan ke darat, per provinsi</div><div class="sc-cip3 sc-prov">${rp.slice(0, 10).map(([k, n]) => `<button type="button" data-k="${k}" aria-pressed="${pc.nel.has(k)}">${esc(K.namaProv[k] || k)}<small>${fmt(n)} jam</small></button>`).join("") || "<span class='sc-kosong'>Tidak ada perairan berisiko.</span>"}</div>
         <table class="sc-tb sc-bd"><thead><tr><th></th><th class="n">Tanpa</th><th class="n">Dengan</th></tr></thead><tbody id="pBd">${barisPerl()}</tbody></table>
         <p class="sc-cat">Satu jam perairan adalah satu titik gelombang selama satu jam. Jumlah penumpang, penerbangan, dan kerugian rupiah tidak dihitung karena berkas tidak memuat datanya.</p>`) +
      kartu("buku", "Asumsi", "", asumsi()) +
      kartu("info", "Batas model", `Ini prakiraan nyata yang digerakkan; sel badai hanya penanda hujan lebat dari model kisi 1,5 derajat, bukan radar, dan skenario adalah pengandaian. <a href="/cuaca/metode">Baca Metode</a>`);
    const el = $("#t-dampak");
    el.onclick = e => { const tr = e.target.closest("tr[data-i]"); if (tr) { const s = K.sites[+tr.dataset.i]; if (window.SimGraf) SimGraf.pilih({lat: s.lat, lon: s.lon, nama: s.nama, jenis: s.j === "p" ? "Pelabuhan" : "Bandara", idx: +tr.dataset.i}); C.peta().flyTo({center: [s.lon, s.lat], zoom: Math.max(C.peta().getZoom(), 6), duration: 700}); return; }
      const b = e.target.closest("button"); if (!b) return;
      if (b.id === "pTp") { pc.pel = !pc.pel; b.setAttribute("aria-pressed", pc.pel); } else if (b.id === "pTb") { pc.ban = !pc.ban; b.setAttribute("aria-pressed", pc.ban); }
      else if (b.dataset.k) { pc.nel.has(b.dataset.k) ? pc.nel.delete(b.dataset.k) : pc.nel.add(b.dataset.k); b.setAttribute("aria-pressed", pc.nel.has(b.dataset.k)); } else return;
      C.nanti(segarTabel); };
    const d = $("#pD"); if (d) d.oninput = () => { pc.depan = +d.value; $("#pDV").textContent = fmt(+d.value) + " jam"; clearTimeout(K.tD); K.tD = setTimeout(() => C.nanti(segarTabel), 140); };
  }
  function asumsi() {
    const P = SC.PELABUHAN, B = SC.BANDARA, N = SC.NELAYAN;
    return `<details class="sc-asumsi"><summary>Lihat asumsi</summary><ul>
      <li>Angin siklon dihitung dengan profil Holland dan ditambahkan ke angin prakiraan. Untuk siklon yang sudah ada di prakiraan, yang ditambahkan hanya selisih antara lintasan yang digeser dan lintasan aslinya, supaya siklon tidak terhitung dua kali. Rumusnya ada di <a href="/cuaca/metode#simulasi">Metode</a>.</li>
      <li>Radius angin maksimum tidak ada di berkas, jadi kamu yang mengatur. Siklon dianggap tidak melemah di darat, dan menggeser lintasan hanya mendekatkannya ke pantai.</li>
      <li>Gelombang di bawah siklon adalah perkiraan atas: laut dianggap sudah berkembang penuh oleh angin total, tanpa batas jarak dan lama angin bertiup, lalu dipakai bila lebih tinggi dari prakiraan. Angin yang naik N persen menaikkan tinggi gelombang lebih dari N persen.</li>
      <li>Sistem lebih lambat: nilai pada jam tertentu diambil dari jam yang lebih awal di prakiraan, jadi ujung prakiraan tidak terpakai.</li>
      <li>Ambang berikut adalah hipotesis kami, belum disetel ke kejadian nyata, dan bukan kriteria resmi. Cara memetakannya ke Buka, Terganggu, dan Tutup juga asumsi kami.</li>
      <li>Pelabuhan: Terganggu bila gelombang ≥ ${fmt(P.terganggu.hs)} m atau angin ≥ ${P.terganggu.kt} knot, Tutup bila gelombang ≥ ${fmt(P.tutup.hs)} m atau angin ≥ ${P.tutup.kt} knot.</li>
      <li>Bandara: Terganggu bila embusan ≥ ${B.terganggu.g} km/jam atau hujan ≥ ${B.terganggu.r} mm/jam, Tutup bila embusan ≥ ${B.tutup.g} km/jam. Embusan dipakai utuh karena arah landasan tidak ada di berkas.</li>
      <li>Nelayan: berisiko bila gelombang ≥ ${fmt(N.hs)} m atau angin ≥ ${N.kt} knot. Perlakuan menarik nelayan ke darat selama jam berisiko ditambah jam mulai lebih awal.</li>
      <li>Embusan di bawah siklon: yang lebih besar antara embusan prakiraan dan angin tetap siklon, tanpa faktor embusan.</li>
      <li>Siklon skenario baru ada sejak titik pertama lintasan, jadi dampaknya muncul mendadak pada jam itu. Tinggi kolom sel badai di peta hanya skala tampilan.</li></ul></details>`;
  }

  /* ---------------------------------------------------------------- tab panel kiri */
  function render() { if (S.M && !$("#skA")) panelSkenario(); }
  function tab(k) { K.tab = k; document.querySelectorAll("#sTab button").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === k)); for (const x of ["waktu", "skenario", "dampak", "model"]) { const e = $("#t-" + x); if (e) e.hidden = x !== k; } if (k === "dampak" && K.kotor) C.nanti(panelDampak); document.dispatchEvent(new CustomEvent("sim-tab", {detail: k})); }

  /* ---------------------------------------------------------------- seri satu titik untuk grafik */
  function seri(lat, lon, ti, idx) {
    const n = S.n, M = S.M, vorAda = !!K.vor, out = {n, r: [], g: [], kt: [], hs: [], r0: [], g0: [], hs0: [], st: null, st0: null};
    const dari = (F, sk, hasil) => { const r = [], g = [], kt = [];
      for (let h = 0; h < n; h++) { const fr = F[h]; let u = SC.cuplik(M, fr.u, lon, lat), v = SC.cuplik(M, fr.v, lon, lat), gg = SC.cuplik(M, fr.g, lon, lat), rr = SC.cuplik(M, fr.r, lon, lat);
        if (u == null) { r.push(null); g.push(null); kt.push(null); continue; }
        if (sk) { const w = vorAt(lon, lat, h); if (w) { u += w[0]; v += w[1]; gg = Math.max(gg, Math.hypot(u, v) * 3.6); } }
        r.push(rr); g.push(gg); kt.push(Math.hypot(u, v) / SC.KT); }
      return {r, g, kt}; };
    const a = dari(K.F1 || K.F0, true), b = dari(K.F0, false);
    out.r = a.r; out.g = a.g; out.kt = a.kt; out.r0 = b.r; out.g0 = b.g;
    if (ti >= 0 && K.skn) { out.hs = Array.from(K.skn.HS[ti], x => isNaN(x) ? null : x); out.hs0 = Array.from(K.dasar.HS[ti], x => isNaN(x) ? null : x); }
    if (idx != null && K.skn) { out.st = Array.from(K.skn.st[idx].a); out.st0 = Array.from(K.dasar.st[idx].a); }
    return out;
  }
  const terdekatTitik = (lat, lon) => { let b = -1, bd = 150; (S.G?.titik || []).forEach((p, i) => { if (Math.abs(p[0] - lat) < 1.5 && Math.abs(p[1] - lon) < 1.5) { const d = SC.jarak(lat, lon, p[0], p[1]); if (d < bd) { bd = d; b = i; } } }); return b; };

  /* ---------------------------------------------------------------- mulai */
  window.SimSk = {K, kartu, IK, ik, pasang, bingkai, tampak, tab, seri, terdekatTitik, adaSkenario, setSasaran: ll => { K.sasaran = ll; if (K.sik.on && !trackDasar()) { panelSkenario(); mintaHitung(true); } }, sites: () => K.sites};
  (async () => {
    const meta = await fetch("/banjir/data/cuaca_meta.json").then(r => r.ok ? r.json() : null).catch(() => null); K.namaProv = meta?.prov || {};
    await new Promise(r => S.data ? r() : document.addEventListener("sim-data", r, {once: true})); await new Promise(r => requestAnimationFrame(r));
    if (!S.M) { const t = $("#sTab"); if (t) t.style.display = "none"; return; }
    siapSarana(); render(); proses(); tab("waktu"); if (C.siap() && C.peta().isStyleLoaded()) pasang(C.peta());
    $("#sTab").onclick = e => { const b = e.target.closest("button"); if (b) tab(b.dataset.t); };
  })();
})();
