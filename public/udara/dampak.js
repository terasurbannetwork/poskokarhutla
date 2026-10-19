"use strict";
/* ================================================================ dampak */
/* Tab Dampak kualitas udara: rupa sama dengan Dampak karhutla dan banjir (pintasan bagian di kiri, pita bagian berwarna, kartu bergaya Insight, gaya dk-* dari public/inti/dampak.css).
   Data: /udara/data/rentan.json (scripts/udara/rentan.py, dari prakiraan.json): balita, lansia, ISPA, sekolah, bandara. SEMUA angka perkiraan model CAMS (belum dikoreksi ke alat ukur): tiap kartu membawa pil model, jiwa ditulis "sekitar".
   Bagian tanpa data dibuang (A18). Korban dan kerugian historis tidak ada: BNPB tidak mencatat kualitas udara sebagai jenis bencana. Rupiah tidak ditampilkan. */
const Dampak = (() => {
  const W = {merah: "#c9503a", ungu: "#5f6fb0", teal: "#2b8c86"};
  const IKON = {rent: "M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 22v-6a6 6 0 0 1 12 0v6", ispa: "M12 3v18M7 8c-3 2-3 8 0 10M17 8c3 2 3 8 0 10", skz: "M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 3 9 3 12 0v-5", bnd: "M2 16l9-3V6a1.5 1.5 0 0 1 3 0v7l8 3v2l-8-1.5V20l2 1.5V23l-3.5-1L10 23v-1.5l2-1.5v-4.5L2 18z"};
  const BAG = {rent: ["Balita dan lansia", W.merah], ispa: ["Kasus ISPA", W.teal], skz: ["Sekolah berisiko", W.ungu], bnd: ["Jarak pandang bandara", "#1f5f8b"]};
  const st = {};
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const nmP = k => namaProv(k);
  const SM = "Sumber: Copernicus CAMS lewat Open-Meteo";
  /* kartu: pita bagian + kartu Insight dengan pil = nama bagian dan pil model */
  const bag = (id, judul, isi, catatan, ctl = "") => { const [nm, w] = BAG[id];
    return `<section class="dk-bag" id="dk-${id}" data-bag="${id}"><header class="dk-sh" style="--w:${w}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[id]}"/></svg><h2>${nm}</h2></header>${Kartu.ex(judul, "", "", isi, catatan, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${nm}</span>${PIL_MODEL}`)}</section>`; };
  /* batang horizontal berlabel pil: rows [{n, v, tip}] */
  function hbar(rows, w) {
    const Wd = Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44 - (($("#dampak")?.clientWidth || 0) >= 1100 ? 224 : 0))), L = Wd < 500 ? 100 : 160, rh = 26, R = 80, m = Math.max(1, ...rows.map(r => r.v)), X = v => L + v / m * (Wd - L - R);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img">${rows.map((r, i) => { const y = i * rh, t = r.txt ?? fmt(r.v);
      return `<g><text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${w}" data-tip="${r.tip || ""}"/>${Kartu.pil(X(r.v) + 5, y + 3, t, w, "#fff", 11)[0]}</g>`; }).join("")}</svg>`; }
  /* ---- prakiraan rentan (rentan.json): balita, lansia, ISPA, sekolah, bandara. Angka perkiraan model; asumsi + sumber ada di Metode ---- */
  const R = () => S.ren, ri = () => Math.min(st.rh || 0, (R()?.hari.length || 1) - 1);
  const segR = () => R().hari.length > 1 ? `<div class="seg" role="group">${R().hari.map((t, h) => `<button data-dks="rh" data-v="${h}" aria-pressed="${ri() === h}">${tglPendek(t)}</button>`).join("")}</div>` : "";
  const barisR = (f) => Object.entries(R().prov || {}).map(([k, o]) => ({k, o, v: f(o)})).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 12);
  const ket = "Sumber: perkiraan model CAMS, belum dikoreksi ke alat ukur; WorldPop, BPS";
  function kartuRentan() { if (!R() || !R().nasional) return "";
    const h = ri(), n = R().nasional, tg = "pada " + tglPendek(R().hari[h]), out = [], ctl = segR(), ms = h2 => (n.ispa?.[h2]) ;
    if (n.balita?.[h] != null) { const rows = barisR(o => (o.balita?.[h] || 0) + (o.lansia?.[h] || 0)).map(x => ({n: nmP(x.k), v: x.v, txt: rb(x.v), tip: `<b>${esc(nmP(x.k))}</b><br>Balita: sekitar ${fmt(x.o.balita?.[h] || 0)}<br>Lansia: sekitar ${fmt(x.o.lansia?.[h] || 0)}`}));
      out.push(bag("rent", `${Kartu.hl("sekitar " + jt(n.balita[h]))} balita dan ${Kartu.hl("sekitar " + jt(n.lansia[h]))} lansia berada di wilayah berudara tidak sehat ${tg}`, hbar(rows, W.merah), ket, ctl)); }
    if (ms(h)) { const rows = barisR(o => o.ispa?.[h]?.t || 0).map(x => ({n: nmP(x.k), v: x.v, txt: fmt(Math.round(x.v)), tip: `<b>${esc(nmP(x.k))}</b><br>Tambahan kasus ISPA per hari: ${fmt(Math.round(x.v))} (${fmt(Math.round(x.o.ispa[h].lo))} sampai ${fmt(Math.round(x.o.ispa[h].hi))})`}));
      out.push(bag("ispa", `Tambahan sekitar ${Kartu.hl(fmt(Math.round(ms(h).t)) + " kasus ISPA")} per hari ${tg} (${fmt(Math.round(ms(h).lo))} sampai ${fmt(Math.round(ms(h).hi))})`, hbar(rows, W.teal), ket, ctl)); }
    if (R().sekolah?.length) { const s = R().sekolah;
      out.push(bag("skz", `${Kartu.hl(fmt(s.length) + " sekolah")} berada di zona tidak sehat besok`, `<div id="skzTab">${skzTabel()}</div><div id="skzPeta" class="dk-peta"></div>`, "Sumber: Dapodik/EMIS; zona dari prakiraan model CAMS, belum dikoreksi ke alat ukur")); }
    if (R().bandara?.length) { const b = [...R().bandara].sort((x, y) => x.vis_km - y.vis_km);
      out.push(bag("bnd", `Jarak pandang ${Kartu.hl(esc(b[0].nama))} sekarang ${Kartu.hl(fmt(b[0].vis_km) + " km")}, terendah di antara ${fmt(b.length)} bandara`, `<div id="bndTab">${bndTabel()}</div>`, `Sumber: NOAA METAR; prakiraan jarak pandang dari model${R().bandara.some(x => x.prakiraan_teruji === true) || R().prakiraan_km_teruji === true ? "" : ", belum diuji terhadap METAR"}`)); }
    return out.join(""); }
  const kotaNama = k => (kotaByKode(k)?.nama) || k;
  function skzTabel() { const kol = [{k: "nama", n: "Sekolah", v: r => r.nama, h: r => `<b translate="no">${esc(r.nama)}</b>`}, {k: "kota", n: "Kota", v: r => kotaNama(r.kode_kota), h: r => `<span translate="no">${esc(kotaNama(r.kode_kota))}</span>`}, {k: "st", n: "Status", v: r => Murni.rank(r.st), h: r => pilSt(r.st)}];
    return Insight.tabel("skz", kol, R().sekolah, r => "", 10, "sekolah", r => Murni.rank(r.st)); }
  function bndTabel() { const kol = [{k: "nama", n: "Bandara", v: r => r.nama, h: r => `<b translate="no">${esc(r.nama)}</b> <small>${esc(r.icao)}</small>`},
      {k: "vis", n: "Sekarang", num: 1, v: r => r.vis_km, h: r => fmt(r.vis_km) + " km"},
      ...R().hari.map((t, h) => ({k: "p" + h, n: tglPendek(t), num: 1, v: r => r.prakiraan_km?.[h] ?? 99, h: r => r.prakiraan_km?.[h] != null ? fmt(r.prakiraan_km[h]) + " km" : "–"})),
      {k: "pm", n: "PM2,5 besok", num: 1, v: r => r.pm?.[1] ?? 0, h: r => r.pm?.[1] != null ? fmt(r.pm[1]) + " µg/m³" : "–"}];
    return Insight.tabel("bnd", kol, R().bandara, r => "", 10, "bandara", r => -r.vis_km); }
  function ulangTabel(id, fn, box) { box.innerHTML = fn(); const th = box.querySelector("thead"); if (th) pengurutKepala(Insight.T[id], th, () => ulangTabel(id, fn, box)); }
  let petaSek = null;
  function petaSekolah() { const el = $("#skzPeta"); if (!el || !R()?.sekolah?.length || typeof maplibregl === "undefined") return; petaSek?.remove();
    const m = petaSek = new maplibregl.Map({container: el, style: DASAR(), center: [118, -2.4], zoom: 3.2, attributionControl: {compact: true}, dragRotate: false});
    m.on("load", () => { m.addSource("s", {type: "geojson", data: {type: "FeatureCollection", features: R().sekolah.map(r => ({type: "Feature", geometry: {type: "Point", coordinates: [r.lon, r.lat]}, properties: {s: r.st, n: r.nama}}))}});
      m.addLayer({id: "s", type: "circle", source: "s", paint: {"circle-radius": 4.5, "circle-color": ["match", ["get", "s"], "awas", Murni.ST_WARNA.awas, "siaga", Murni.ST_WARNA.siaga, Murni.ST_WARNA.waspada], "circle-stroke-color": "#fff", "circle-stroke-width": 1}});
      const xs = R().sekolah.map(r => r.lon), ys = R().sekolah.map(r => r.lat); m.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], {padding: 30, maxZoom: 9, duration: 0}); }); }
  async function render() {
    const el = $("#dampak"); if (!el) return;
    if (!el._dk) { el._dk = 1;
      el.addEventListener("click", e => {
        const pg = e.target.closest("#skzTab .pgn-b[data-h], #bndTab .pgn-b[data-h]"); if (pg) { if (pg.disabled) return; const bx = pg.closest("#skzTab, #bndTab"), id = bx.id === "skzTab" ? "skz" : "bnd"; Insight.T[id].hal = +pg.dataset.h; return ulangTabel(id, id === "skz" ? skzTabel : bndTabel, bx); }
        const s = e.target.closest("[data-dks]"); if (s) { st[s.dataset.dks] = s.dataset.v; const peta0 = el.querySelector("#skzPeta"); el.querySelector("#dkIsi").innerHTML = isiSemua();   /* peta sekolah tidak bergantung hari: dipindah, bukan dibuat ulang */
          if (peta0 && petaSek) { el.querySelector("#skzPeta")?.replaceWith(peta0); pasangTabel(false); } else pasangTabel(); return; }
        const nav = e.target.closest("[data-ke]"); if (nav) el.querySelector("#dk-" + nav.dataset.ke)?.scrollIntoView({behavior: "smooth", block: "start"}); });
      let rf = 0; document.addEventListener("scroll", () => { if (rf) return; rf = requestAnimationFrame(() => { rf = 0; let a = ""; el.querySelectorAll(".dk-bag").forEach(b => { if (b.getBoundingClientRect().top <= 140) a = b.dataset.bag; });
        el.querySelectorAll(".dk-nav button").forEach(b => b.classList.toggle("on", b.dataset.ke === a)); }); }, {capture: true, passive: true}); }
    const isi = isiSemua(); if (!isi) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; }
    const ada = Object.keys(BAG).filter(k => isi.includes(`id="dk-${k}"`));
    el.innerHTML = `<div class="dk-lay"><nav class="dk-nav" aria-label="Bagian dampak">${ada.map(k => `<button data-ke="${k}" style="--w:${BAG[k][1]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[k]}"/></svg>${BAG[k][0]}</button>`).join("")}</nav><div id="dkIsi">${isi}</div></div>`; pasangTabel(); }
  const isiSemua = () => kartuRentan();
  function pasangTabel(baru = true) { const e1 = $("#skzTab"), e2 = $("#bndTab"); if (e1) ulangTabel("skz", skzTabel, e1); if (e2) ulangTabel("bnd", bndTabel, e2); if (baru) petaSekolah(); }
  return {render};
})();
