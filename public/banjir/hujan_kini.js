/* Lapisan "Sedang hujan": area peringatan nowcast BMKG yang SEDANG berlaku (mulai <= kini < selesai), dibaca langsung dari /api/cuaca/nowcast
   (Worker menarik RSS BMKG tiap 10 menit, src/nowcast.js), bukan peringatan.json harian. Hover = sejak kapan, sampai kapan (perkiraan BMKG),
   intensitas (teks event BMKG), curah hujan terukur pos terdekat (PosHujan, SIHKA, hanya Jawa) dan status banjir wilayah di bawah kursor (wil-fill).
   Tidak ada angka karangan: tanpa pos dalam 25 km = "–", tanpa status wilayah = baris itu tidak tampil. Skrip klasik sesudah peta.js dan eksperimen.js
   (global: peta, S, PosHujan, EksPA, LEVEL, WARNA_LV, esc, fmt, renderLegenda). Ubinnya <input data-l="hujankini"> di grup Cuaca; penangan change bawaan
   halaman tidak mengenal kunci ini, jadi ditangkap di fase capture seperti databaru.js. */
const HujanKini = (() => {
  const API = "/api/cuaca/nowcast", SEGAR_MS = 5 * 60e3, RADIUS_KM = 25, W = {petir: "#1c7ed6", lebat: "#339af0", sedang: "#74c0fc", ringan: "#a5d8ff"};   // biru muda semua (pemilik 27 Okt: jangan ungu)
  let D = null, janji = null, PI = null, di = false, tAmbil = 0, pj = null, rafH = 0, eH = null;
  const nyala = () => !!document.querySelector('#lapis input[data-l="hujankini"]')?.checked;
  const kini = () => Date.now();
  /* hanya hujan, hanya yang sedang berjalan; peringatan tanpa poligon dilewati (tidak ditebak dari nama kecamatan) */
  const aktif = a => /hujan/i.test(a.event || "") && a.polygon?.length && Date.parse(a.mulai) <= kini() && Date.parse(a.selesai) > kini();
  const warna = ev => /petir/i.test(ev) ? W.petir : /sangat lebat|ekstrem|lebat/i.test(ev) ? W.lebat : /sedang/i.test(ev) ? W.sedang : W.ringan;
  const geo = () => ({type: "FeatureCollection", features: (D?.nowcast || []).filter(aktif).map(a => ({type: "Feature", geometry: {type: "MultiPolygon", coordinates: a.polygon.map(r => [r])}, properties: {id: a.id, w: warna(a.event)}}))});
  const muat = () => janji ||= fetch(API, {cache: "no-cache"}).then(r => r.ok ? r.json() : null).then(d => { D = Array.isArray(d?.nowcast) ? d : null; tAmbil = kini(); return D; }).catch(() => null).finally(() => { janji = null; });

  const jamWib = ms => new Date(ms).toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).replace(":", ".");
  const durasi = ms => { const m = Math.max(0, Math.round(ms / 60e3)), j = Math.floor(m / 60), s = m % 60; return j ? `${j} jam${s ? ` ${s} menit` : ""}` : `${m} menit`; };
  const km = (a, b) => { const r = Math.PI / 180, x = (b[0] - a[0]) * r * Math.cos((a[1] + b[1]) / 2 * r), y = (b[1] - a[1]) * r; return Math.hypot(x, y) * 6371; };
  /* pos hujan terdekat yang datanya masih segar (EksPA.redupHujan = lama/macet/> 6 jam) */
  const posDekat = ll => { let b = null, d = RADIUS_KM; for (const p of PosHujan.D?.pos || []) { if (typeof p.lon !== "number" || EksPA.redupHujan(p, kini() / 1000)) continue; const k = km(ll, [p.lon, p.lat]); if (k <= d) { d = k; b = p; } } return b && {p: b, km: d}; };
  /* status banjir dari wil-fill di bawah kursor: kecamatan = levelnya, kab/prov = level tertinggi yang punya kecamatan */
  const statusWil = pt => { const f = peta.getLayer("wil-fill") && peta.queryRenderedFeatures(pt, {layers: ["wil-fill"]})[0]; if (!f) return null; const p = f.properties, kp = String(p.kunci || "").split("|");
    if (kp.length === 3 && p.lv != null) return {lv: +p.lv, teks: LEVEL[p.lv], ket: "status banjir kecamatan"};
    const n = S.ag?.[p.kunci]?.n; if (!n) return null; const lv = [3, 2, 1].find(i => n[i] > 0) ?? 0;
    return {lv, teks: LEVEL[lv], ket: lv ? `${fmt(n[lv])} kecamatan ${LEVEL[lv].toLowerCase()}` : "status banjir"}; };

  function kartu(a, e) {
    const m = Date.parse(a.mulai), s = Date.parse(a.selesai), ev = String(a.event || "Hujan"), int = ev.replace(/^hujan\s*/i, "").replace(/\s*(dan|disertai)\s*petir/i, "") || "Hujan";
    const ph = posDekat([e.lngLat.lng, e.lngLat.lat]), st = statusWil(e.point);
    const stat = [["hujan", int, /petir/i.test(ev) ? "intensitas, disertai petir" : "intensitas", warna(ev), /lebat|ekstrem/i.test(ev)],
      ["peta", jamWib(m), `mulai, ${durasi(kini() - m)} lalu`, "#3f7fb8"],
      ["bel", jamWib(s), `selesai, ${durasi(s - kini())} lagi`, "#3f7fb8"],
      ["debit", ph ? EksPA.mmTeks(ph.p.mm_1jam ?? 0) + " mm" : "–", ph ? `1 jam, pos ${fmt(Math.round(ph.km))} km` : "tanpa pos hujan dekat", "#1d4e89"],
      ...(st ? [["perisai", st.teks, esc(st.ket), WARNA_LV[st.lv], st.lv >= 2]] : [])];
    const nKec = a.wilayah.split(",").filter(x => x.trim()).length, judul = ev.charAt(0) + ev.slice(1).toLowerCase();
    return PI.kartuTip({judul: esc(judul), sub: `<small class="tp-sub">${fmt(nKec)} kecamatan</small>`, stat}).replace("tp-gr tp-satu", "tp-gr tp-kisi");
  }

  async function pasang(paksa) {
    PI ||= await import("../inti/peta/lapis.js");
    await Promise.all([!paksa && D && kini() - tAmbil < SEGAR_MS ? D : muat(), PosHujan.muat?.()]);   /* ganti tema tidak mengambil ulang data segar; menyalakan dari ubin selalu mengambil ulang */
    const g = geo(), s = peta.getSource("hujankini"); if (s) return s.setData(g);
    peta.addSource("hujankini", {type: "geojson", data: g, attribution: "Peringatan dini © BMKG"});
    const bawah = peta.getLayer("wil-line") ? "wil-line" : undefined;
    peta.addLayer({id: "hujankini-fill", type: "fill", source: "hujankini", paint: {"fill-color": ["get", "w"], "fill-opacity": .28}}, bawah);
    peta.addLayer({id: "hujankini-garis", type: "line", source: "hujankini", paint: {"line-color": ["get", "w"], "line-width": 1.6, "line-opacity": .9}}, bawah);
    if (pasang.ok) return; pasang.ok = true;   /* penangan per id lapisan bertahan lintas ganti gaya; dipasang sekali */
    /* kartu digambar paling banyak sekali per frame, seperti hover wilayah */
    peta.on("mousemove", "hujankini-fill", e => { if (!nyala()) return; di = true; peta.getCanvas().style.cursor = "pointer"; eH = {id: e.features[0].properties.id, point: e.point, lngLat: e.lngLat, originalEvent: e.originalEvent};   /* MapLibre menghapus e.features sesudah handler: salin sekarang */
      rafH ||= requestAnimationFrame(() => { rafH = 0; const x = eH; if (!di || !x) return; const a = D?.nowcast.find(n => n.id === x.id); if (a) PI.tampilTip(kartu(a, x), x.originalEvent); }); });
    peta.on("mouseleave", "hujankini-fill", () => { di = false; eH = null; peta.getCanvas().style.cursor = ""; PI.sembunyiTip(); });
  }
  async function tampil(on, paksa) {
    if (on) { try { await (pj ||= pasang(paksa).finally(() => { pj = null; })); } catch (e) { console.warn("hujankini", e); } }   /* dua panggilan beruntun berbagi satu pasang */
    for (const l of ["hujankini-fill", "hujankini-garis"]) peta?.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none");
    if (on) bangunRintik(); else { di = false; hentiRintik(); } renderLegenda();
  }
  /* Animasi rintik di dalam area yang sedang hujan, mulai zoom 9 (pemilik 28 Okt). Satu kanvas di atas peta, tak menangkap klik.
     Poligon diproyeksikan ulang hanya sesudah peta berhenti bergerak (moveend); selama digeser/di-zoom kanvas dikosongkan dan loop berhenti, jadi geser peta tetap ringan.
     Kepadatan menurut intensitas BMKG; petir = kilat redup sesekali. Mati bila tab tersembunyi atau perangkat minta gerak dikurangi. */
  const ZOOM_RINTIK = 9, KELAS = [[/sangat lebat|ekstrem/i, 3.5e-3], [/lebat/i, 2.5e-3], [/sedang/i, 1.4e-3], [/./, 7e-4]];
  const kurang = matchMedia("(prefers-reduced-motion: reduce)");
  let cv = null, grup = [], rafR = 0, tR = 0;
  const bolehRintik = () => nyala() && peta.getZoom() >= ZOOM_RINTIK && !document.hidden && !kurang.matches;
  function hentiRintik() { cancelAnimationFrame(rafR); rafR = 0; cv?.getContext("2d").clearRect(0, 0, cv.width, cv.height); }
  function bangunRintik() {
    hentiRintik(); grup = [];
    if (!bolehRintik()) return;
    const box = peta.getCanvas(), w = box.clientWidth, h = box.clientHeight, dpr = devicePixelRatio || 1;
    if (!cv) { cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true"); cv.style.cssText = "position:absolute;left:0;top:0;pointer-events:none"; box.after(cv); }
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + "px"; cv.style.height = h + "px"; }
    const kls = new Map();   /* satu Path2D per kelas intensitas (+ petir terpisah untuk kilat) */
    for (const a of (D?.nowcast || []).filter(aktif)) {
      const ev = String(a.event || ""), kd = KELAS.find(([re]) => re.test(ev))[1], kunci = kd + (/petir/i.test(ev) ? "p" : "");
      const g = kls.get(kunci) || {dens: kd, petir: kunci.endsWith("p"), path: new Path2D(), x0: w, y0: h, x1: 0, y1: 0};
      for (const r of a.polygon) r.forEach((c, i) => { const p = peta.project(c); g.path[i ? "lineTo" : "moveTo"](p.x, p.y); g.x0 = Math.min(g.x0, p.x); g.y0 = Math.min(g.y0, p.y); g.x1 = Math.max(g.x1, p.x); g.y1 = Math.max(g.y1, p.y); });
      kls.set(kunci, g);
    }
    for (const g of kls.values()) {
      g.x0 = Math.max(g.x0, 0); g.y0 = Math.max(g.y0, 0); g.x1 = Math.min(g.x1, w); g.y1 = Math.min(g.y1, h);
      const luas = (g.x1 - g.x0) * (g.y1 - g.y0); if (luas <= 0) continue;
      const n = Math.min(2500, Math.round(luas * g.dens));   // ponytail: plafon 2.500 rintik per kelas, cukup untuk layar penuh lebat
      g.tetes = Array.from({length: n}, () => ({x: g.x0 + Math.random() * (g.x1 - g.x0), y: g.y0 + Math.random() * (g.y1 - g.y0), v: 380 + Math.random() * 260, l: 11 + Math.random() * 9}));
      g.kilat = 0; grup.push(g);
    }
    if (grup.length) { tR = performance.now(); rafR = requestAnimationFrame(langkahRintik); }
  }
  function langkahRintik(t) {
    const dt = Math.min(.05, (t - tR) / 1000), ctx = cv.getContext("2d"), dpr = cv.width / cv.clientWidth; tR = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
    ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.strokeStyle = "rgba(22,80,165,.6)";   /* lebih panjang, tegak, dan biru dari partikel angin supaya tak tertukar */
    for (const g of grup) {
      ctx.save(); ctx.clip(g.path, "evenodd");
      if (g.petir) { if (g.kilat <= 0 && Math.random() < dt / 6) g.kilat = .18; if (g.kilat > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(.35, g.kilat * 2.4)})`; ctx.fill(g.path, "evenodd"); g.kilat -= dt; } }   /* rata-rata satu kilat per 6 detik */
      ctx.beginPath();
      for (const d of g.tetes) {
        d.y += d.v * dt; d.x += d.v * dt * .18;
        if (d.y > g.y1) { d.y = g.y0 - d.l; d.x = g.x0 + Math.random() * (g.x1 - g.x0); }
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * .18, d.y - d.l);
      }
      ctx.stroke(); ctx.restore();
    }
    rafR = requestAnimationFrame(langkahRintik);
  }
  const jumlah = () => (D?.nowcast || []).filter(aktif).length;
  const legenda = () => !nyala() ? "" : `<div class="lg-g"><div class="lbl" title="Area hujan yang sedang berjalan menurut peringatan dini nowcast BMKG; bukan prakiraan.">Sedang hujan (BMKG)</div><div class="leg">${[[W.petir, "Lebat, petir"], [W.lebat, "Lebat"], [W.sedang, "Sedang"], [W.ringan, "Ringan"]].map(([w, n]) => `<span><i class="sw" style="background:${w}"></i>${n}</span>`).join("")}${D ? `<span>${jumlah() ? `${fmt(jumlah())} area` : "Tidak ada area"}${Date.parse(D.terbit || D.dibuat) ? `, ${jamWib(Date.parse(D.terbit || D.dibuat))} WIB` : ""}</span>` : ""}</div></div>`;

  /* kunci ini tidak dikenal penangan bawaan halaman: tangkap lebih dulu (capture) */
  document.querySelector("#lapis")?.addEventListener("change", e => { const i = e.target.closest('input[data-l="hujankini"]'); if (!i) return; e.stopImmediatePropagation(); if (!peta) return; renderLegenda(); if (i.checked) nanti(() => tampil(true, true)); else tampil(false); }, true);   /* legenda dan sembunyi langsung; fetch dan addLayer ditunda */
  /* data segar lagi tiap 5 menit selama lapisan menyala dan tab terlihat */
  setInterval(() => { if (!document.hidden && nyala() && peta?.getSource("hujankini")) muat().then(() => { peta.getSource("hujankini")?.setData(geo()); bangunRintik(); }); }, SEGAR_MS);
  const _leg = renderLegenda; renderLegenda = function () { _leg(); document.querySelector("#legDet > div")?.insertAdjacentHTML("beforeend", legenda()); };
  /* lapisan menyala bawaan: pasang begitu peta siap, dan lagi sesudah ganti gaya peta (tema) */
  const tunggu = fn => typeof peta !== "undefined" && peta?.getLayer?.("wil-fill") ? fn() : setTimeout(() => tunggu(fn), 400);
  tunggu(() => { if (nyala()) tampil(true); peta.on("style.load", () => setTimeout(() => nyala() && tampil(true), 60));
    peta.on("movestart", hentiRintik); peta.on("moveend", bangunRintik); peta.on("resize", bangunRintik);   /* bukan idle: lapisan beranimasi lain membuat peta tak pernah idle */
    document.addEventListener("visibilitychange", () => document.hidden ? hentiRintik() : bangunRintik()); kurang.addEventListener?.("change", bangunRintik); });
  return {get di() { return di; }, tampil, kartu};
})();
