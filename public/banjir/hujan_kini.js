/* Lapisan "Sedang hujan": area peringatan nowcast BMKG yang SEDANG berlaku (mulai <= kini < selesai), dibaca langsung dari /api/cuaca/nowcast
   (Worker menarik RSS BMKG tiap 10 menit, src/nowcast.js), bukan peringatan.json harian. Hover = sejak kapan, sampai kapan (perkiraan BMKG),
   intensitas (teks event BMKG), curah hujan terukur pos terdekat (PosHujan, SIHKA, hanya Jawa) dan status banjir wilayah di bawah kursor (wil-fill).
   Tidak ada angka karangan: tanpa pos dalam 25 km = "–", tanpa status wilayah = baris itu tidak tampil. Skrip klasik sesudah peta.js dan eksperimen.js
   (global: peta, S, PosHujan, EksPA, LEVEL, WARNA_LV, esc, fmt, renderLegenda). Ubinnya <input data-l="hujankini"> di grup Cuaca; penangan change bawaan
   halaman tidak mengenal kunci ini, jadi ditangkap di fase capture seperti databaru.js. */
const HujanKini = (() => {
  const API = "/api/cuaca/nowcast", SEGAR_MS = 5 * 60e3, RADIUS_KM = 25, W = {petir: "#5f3dc4", lebat: "#1d4e89", sedang: "#3f7fb8", ringan: "#69a7e8"};
  let D = null, janji = null, PI = null, di = false;
  const nyala = () => !!document.querySelector('#lapis input[data-l="hujankini"]')?.checked;
  const kini = () => Date.now();
  /* hanya hujan, hanya yang sedang berjalan; peringatan tanpa poligon dilewati (tidak ditebak dari nama kecamatan) */
  const aktif = a => /hujan/i.test(a.event || "") && a.polygon?.length && Date.parse(a.mulai) <= kini() && Date.parse(a.selesai) > kini();
  const warna = ev => /petir/i.test(ev) ? W.petir : /sangat lebat|ekstrem|lebat/i.test(ev) ? W.lebat : /sedang/i.test(ev) ? W.sedang : W.ringan;
  const geo = () => ({type: "FeatureCollection", features: (D?.nowcast || []).filter(aktif).map(a => ({type: "Feature", geometry: {type: "MultiPolygon", coordinates: a.polygon.map(r => [r])}, properties: {id: a.id, w: warna(a.event)}}))});
  const muat = () => janji ||= fetch(API, {cache: "no-cache"}).then(r => r.ok ? r.json() : null).then(d => { D = Array.isArray(d?.nowcast) ? d : null; return D; }).catch(() => null).finally(() => { janji = null; });

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
    return KAKI(`Sumber: BMKG (nowcast), ${ph ? "SIHKA Kementerian PU, " : ""}prakiraan banjir Centurisk97`, PI.kartuTip({judul: esc(judul), sub: `<small class="tp-sub">${fmt(nKec)} kecamatan</small>`, stat})).replace("tp-gr tp-satu", "tp-gr tp-kisi");
  }

  async function pasang() {
    PI ||= await import("../inti/peta/lapis.js");
    await Promise.all([muat(), PosHujan.muat?.()]);   /* tiap kali dinyalakan: ambil ulang (respons Worker sudah di-cache tepi) */
    const g = geo(), s = peta.getSource("hujankini"); if (s) return s.setData(g);
    peta.addSource("hujankini", {type: "geojson", data: g, attribution: "Peringatan dini © BMKG"});
    const bawah = peta.getLayer("wil-line") ? "wil-line" : undefined;
    peta.addLayer({id: "hujankini-fill", type: "fill", source: "hujankini", paint: {"fill-color": ["get", "w"], "fill-opacity": .28}}, bawah);
    peta.addLayer({id: "hujankini-garis", type: "line", source: "hujankini", paint: {"line-color": ["get", "w"], "line-width": 1.6, "line-opacity": .9}}, bawah);
    if (pasang.ok) return; pasang.ok = true;   /* penangan per id lapisan bertahan lintas ganti gaya; dipasang sekali */
    peta.on("mousemove", "hujankini-fill", e => { if (!nyala()) return; const a = D?.nowcast.find(x => x.id === e.features[0].properties.id); if (!a) return;
      di = true; peta.getCanvas().style.cursor = "pointer"; PI.tampilTip(kartu(a, e), e.originalEvent); });
    peta.on("mouseleave", "hujankini-fill", () => { di = false; peta.getCanvas().style.cursor = ""; PI.sembunyiTip(); });
  }
  async function tampil(on) {
    if (on) { try { await pasang(); } catch (e) { console.warn("hujankini", e); } }
    for (const l of ["hujankini-fill", "hujankini-garis"]) peta?.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none");
    if (!on) di = false; renderLegenda();
  }
  const jumlah = () => (D?.nowcast || []).filter(aktif).length;
  const legenda = () => !nyala() ? "" : `<div class="lbl" style="margin-top:8px">Sedang hujan (BMKG)</div><div class="leg" style="margin-top:4px">${[[W.petir, "Lebat, petir"], [W.lebat, "Lebat"], [W.sedang, "Sedang"], [W.ringan, "Ringan"]].map(([w, n]) => `<span><i class="sw" style="background:${w}"></i>${n}</span>`).join("")}${D ? `<span>${jumlah() ? `${fmt(jumlah())} area` : "Tidak ada area"}${Date.parse(D.terbit || D.dibuat) ? `, ${jamWib(Date.parse(D.terbit || D.dibuat))} WIB` : ""}</span>` : ""}</div>`;

  /* kunci ini tidak dikenal penangan bawaan halaman: tangkap lebih dulu (capture) */
  document.querySelector("#lapis")?.addEventListener("change", e => { const i = e.target.closest('input[data-l="hujankini"]'); if (!i) return; e.stopImmediatePropagation(); if (peta) nanti(() => tampil(i.checked)); }, true);
  /* data segar lagi tiap 5 menit selama lapisan menyala dan tab terlihat */
  setInterval(() => { if (!document.hidden && nyala() && peta?.getSource("hujankini")) muat().then(() => peta.getSource("hujankini")?.setData(geo())); }, SEGAR_MS);
  const _leg = renderLegenda; renderLegenda = function () { _leg(); document.querySelector("#legDet > div")?.insertAdjacentHTML("beforeend", legenda()); };
  /* lapisan menyala bawaan: pasang begitu peta siap, dan lagi sesudah ganti gaya peta (tema) */
  const tunggu = fn => typeof peta !== "undefined" && peta?.getLayer?.("wil-fill") ? fn() : setTimeout(() => tunggu(fn), 400);
  tunggu(() => { if (nyala()) tampil(true); peta.on("style.load", () => setTimeout(() => nyala() && tampil(true), 60)); });
  return {get di() { return di; }, tampil, kartu};
})();
