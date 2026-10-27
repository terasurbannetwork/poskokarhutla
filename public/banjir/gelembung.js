"use strict";
/* Gelembung angka di peta /banjir, seperti cluster karhutla: zoom nasional (di bawah 6,5) satu gelembung per provinsi, zoom masuk (6,5 sampai 9) satu per kabupaten/kota,
   di atasnya pin dan poligon kecamatan seperti biasa. Angka utama = jumlah kecamatan berstatus Siaga atau Awas pada bahaya dan hari terpilih (S.st.kec); warna = status tertinggi wilayah itu.
   Klik gelembung atau provinsi: kartu kecil berlambang dengan tombol Zoom dan Rincian. Hover provinsi: kartu ringkas empat angka + grafik batang "7 hari terakhir" dari arsip harian data/hari/<tgl>.json.
   Arsip harian hanya memuat status per kabupaten/kota (bukan kecamatan), jadi batang = jumlah kabupaten/kota Siaga atau Awas per hari; hanya hari yang ada yang digambar.
   Bagian murni (agregWil, pusatGeom, seriProv, tren, ZOOM) diuji di tests/banjir/gelembung.test.mjs; bagian peta memakai S, peta, PI, Peta, Wilayah, PosAir, PosUkur, Analisa, lambang, turun, nanti, fmt, esc, WARNA_LV, LEVEL dari skrip lain (dimuat SESUDAH peta.js). */
(akar => {
  const ZOOM = {provMaks: 6.5, kabMin: 6.5, kabMaks: 9};
  const NAMA_ST = {aman: 0, normal: 0, waspada: 1, siaga: 2, awas: 3};
  const stNum = s => s == null ? null : typeof s === "number" ? s : NAMA_ST[String(s).toLowerCase()] ?? null;

  /* titik tengah poligon terbesar (berat luas) dari Polygon atau MultiPolygon: kepulauan tidak jatuh ke laut seperti pusat kotak */
  function pusatGeom(g) {
    const pl = g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : []; let best = null, luasMaks = -1;
    for (const p of pl) { const r = p[0]; let a = 0, cx = 0, cy = 0;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f; }
      if (Math.abs(a) > luasMaks && a) { luasMaks = Math.abs(a); best = [cx / (3 * a), cy / (3 * a)]; } }
    return best; }
  /* jumlah kecamatan per status untuk provinsi dan kabupaten: {kunci: {n: [aman, waspada, siaga, awas], lv, s: siaga+awas}} */
  function agregWil(kec, b, h) {
    const o = {};
    for (const [k, v] of Object.entries(kec || {})) { const l = v?.[b]?.[h] || 0; if (!l) continue; const [p, kb] = k.split("|");
      for (const key of kb ? [p, p + "|" + kb] : [p]) { const a = o[key] ||= {lv: 0, n: [0, 0, 0, 0], s: 0}; a.lv = Math.max(a.lv, l); a.n[l]++; if (l >= 2) a.s++; } }
    return o; }
  /* pusat kabupaten = rata-rata pusat kecamatannya ({"prov|kab|kec": [lat, lon]}) */
  function pusatKab(pusat) {
    const a = {};
    for (const [k, c] of Object.entries(pusat || {})) { const [p, kb] = k.split("|"); if (!kb) continue; const o = a[p + "|" + kb] ||= [0, 0, 0]; o[0] += c[0]; o[1] += c[1]; o[2]++; }
    return Object.fromEntries(Object.entries(a).map(([k, [la, lo, n]]) => [k, [lo / n, la / n]])); }
  /* hari yang dipakai grafik: sampai 7 hari terakhir dari daftar tanggal berarsip, urut naik */
  const hariAkhir = (ada, maks = 7) => { const u = [...new Set(ada)].sort(); if (!u.length) return []; const t = new Date(u.at(-1) + "T00:00:00Z").getTime() - (maks - 1) * 864e5;
    return u.filter(d => new Date(d + "T00:00:00Z").getTime() >= t); };
  /* seri satu provinsi: [{hari, n}] jumlah kabupaten/kota Siaga atau Awas per hari berarsip; hari tanpa provinsi itu dilewati */
  function seriProv(docs, kode) {
    return [...docs].sort((a, b) => a.hari < b.hari ? -1 : 1).flatMap(d => { const p = (d.provinsi || []).find(x => x.kode === kode); if (!p) return [];
      return [{hari: d.hari, n: (p.kab || []).filter(k => (stNum(k.status) ?? 0) >= 2).length}]; }); }
  /* persen perubahan tiap hari terhadap hari sebelumnya: angka bulat, "baru" bila sebelumnya 0 lalu naik, null bila datar di nol, undefined di hari pertama */
  const persenHarian = v => v.map((x, i) => i === 0 ? null : v[i - 1] > 0 ? Math.round((x - v[i - 1]) / v[i - 1] * 100) : x > 0 ? "baru" : null);
  /* 3 hari terakhir dibanding 3 sebelumnya (rata-rata; hari yang ada saja). Perlu minimal 4 hari; null bila pembanding 0 */
  function tren(v) {
    if (v.length < 4) return null; const a = v.slice(-3), b = v.slice(-6, -3), rata = x => x.reduce((s, y) => s + y, 0) / x.length, ra = rata(a), rb = rata(b);
    if (rb === 0) return ra === 0 ? {d: 0, arah: 0} : null; const d = Math.round((ra - rb) / rb * 100); return {d, arah: d < 0 ? -1 : d > 0 ? 1 : 0}; }
  const vonisTeks = t => t == null ? null : t.arah < 0 ? `MEMBAIK -${-t.d}%` : t.arah > 0 ? `MEMBURUK +${t.d}%` : "STABIL";

  /* perisai nomor rute basemap OpenFreeMap (kotak berangka "1"): lapisan symbol transportation_name berikon road_/shield atau yang teksnya ref tanpa name; label nama jalan tetap */
  const perisai = l => l?.type === "symbol" && l["source-layer"] === "transportation_name" && (/shield/i.test(l.id) || /shield|road_/i.test(JSON.stringify(l.layout?.["icon-image"] ?? ""))
    || (t => t.includes('"ref"') && !t.includes('"name'))(JSON.stringify(l.layout?.["text-field"] ?? "")));
  const API = {perisai, ZOOM, stNum, pusatGeom, agregWil, pusatKab, hariAkhir, seriProv, persenHarian, tren, vonisTeks};
  if (typeof document === "undefined") { akar.Gelembung = API; return; }

  /* ================= bagian peta ================= */
  const KAB = "gel-kab", PROV = "gel-prov", LAYER = [PROV, PROV + "-n", KAB, KAB + "-n"];
  const WARNA_TREN = {"-1": "#2b8c86", "0": "#8a94a6", "1": "#c9503a"};
  const G = {docs: [], versi: 0, pusatProv: new Map(), titikKab: null, cache: new Map(), _p: null};

  function fitur() {
    const j = S.jalur, ag = G.ag || {}, f = [];
    if (!S.geo.prov || j.length >= 2) return f;
    const tambah = (t, kunci, nama, c) => { const a = ag[kunci]; if (!a || !a.s || !c) return; const n = a.s;
      f.push({type: "Feature", geometry: {type: "Point", coordinates: c}, properties: {t, kunci, nama, n, lbl: fmt(n), lv: a.n[3] ? 3 : 2}}); };
    if (j.length === 0) for (const p of S.geo.prov.features) { const k = p.properties.kode; if (!G.pusatProv.has(k)) G.pusatProv.set(k, pusatGeom(p.geometry)); tambah("p", k, namaProv(k), G.pusatProv.get(k)); }
    if (G.titikKab) for (const [k, c] of Object.entries(G.titikKab)) if (!j.length || k.startsWith(j[0] + "|")) tambah("k", k, k.split("|")[1], c);
    return f; }

  const berat = n => ["interpolate", ["linear"], ["get", "n"], 1, n[0], 20, n[1], 200, n[2]];
  const warna = ["match", ["get", "lv"], 3, WARNA_LV[3], WARNA_LV[2]];
  function pasang() {
    if (peta.getSource("gel")) return;
    document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="gelembung.css">');
    peta.addSource("gel", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    for (const [id, t, mn, mk, r] of [[PROV, "p", 0, ZOOM.provMaks, [12, 18, 28]], [KAB, "k", ZOOM.kabMin, ZOOM.kabMaks, [10, 14, 22]]]) {
      peta.addLayer({id, type: "circle", source: "gel", minzoom: mn, maxzoom: mk, filter: ["==", ["get", "t"], t], layout: {"circle-sort-key": ["-", 0, ["get", "n"]]},
        paint: {"circle-radius": berat(r), "circle-color": warna, "circle-stroke-color": "#fff", "circle-stroke-width": 2.2, "circle-opacity": .92}});
      peta.addLayer({id: id + "-n", type: "symbol", source: "gel", minzoom: mn, maxzoom: mk, filter: ["==", ["get", "t"], t],
        layout: {"text-field": ["get", "lbl"], "text-size": 12.5, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true, "text-ignore-placement": true}, paint: {"text-color": "#fff"}}); }
    for (const id of [PROV, KAB]) {
      peta.on("mouseenter", id, () => { peta.getCanvas().style.cursor = "pointer"; });
      peta.on("mousemove", id, e => { const k = e.features[0].properties.kunci; G.di = true; G.minta(() => G.hover(k), e.originalEvent); });
      peta.on("mouseleave", id, () => { peta.getCanvas().style.cursor = ""; G.di = false; G._p = null; PI?.sembunyiTip(); }); }
    nanti(() => G.muatArsip()); nanti(() => G.muatPusat()); }

  Object.assign(G, API, {
    /* data gelembung mengikuti hari, bahaya, jalur; sembunyi di mode Riwayat atau saat lapis Status mati */
    segarkan() {
      if (!peta?.getSource("wil") || !S.st) return; pasang();
      G.ag = agregWil(S.st.kec, S.b, S.hari); const on = S.mode === "status" && Peta.lihat("wilayah"), f = on ? fitur() : [];
      peta.getSource("gel").setData({type: "FeatureCollection", features: f}); this.ada = f.length > 0; this.cache.clear();
      for (const l of LAYER) peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none");
      renderLegenda(); },
    muatPusat() { if (this.titikKab) return; muatJSON("data/pusat_kec.json").then(d => { this.kec = d; this.titikKab = pusatKab(d);  this.segarkan(); }).catch(() => {}); },
    async muatArsip() {
      const idx = await muatJSON("data/hari/indeks.json").catch(() => null); if (!idx?.hari?.length) return;
      this.docs = (await Promise.all(hariAkhir(idx.hari).map(t => muatJSON(`data/hari/${t}.json`).catch(() => null)))).filter(Boolean); this.versi++; this.cache.clear(); },
    /* hover lewat rAF: gerak mouse hanya menaruh permintaan terbaru; digambar sekali per frame */
    minta(fn, ev) { const baru = !this._p; this._p = {fn, ev}; if (!baru) return;
      requestAnimationFrame(() => { const p = this._p; this._p = null; if (p && PI) PI.tampilTip(p.fn(), p.ev); }); },
    /* pos tinggi air provinsi dari agregat PosUkur.agg (dipetakan peta.js); null selama belum siap atau tanpa pos */
    pos(kode) { const r = PosUkur.agg?.(kode); if (!r || !r.total) return null; return {naik: r["Siaga 3"] + r["Siaga 2"] + r["Siaga 1"], total: r.total, mati: r.mati}; },
    grafik(kode) {
      const s = seriProv(this.docs, kode); if (s.length < 2) return "";
      const v = s.map(x => x.n), N = v.length, W = 260, H = 46, m = Math.max(1, ...v), bw = W / N, ps = persenHarian(v), t = tren(v), vt = vonisTeks(t), pf = N <= 7 ? 9.5 : 8;
      const tg = d => new Date(d + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});
      const bar = (x, i) => { const w = ps[i] === "baru" || ps[i] > 0 ? "#c9503a" : ps[i] < 0 ? "#2b8c86" : "#8a94a6", y = H - x / m * (H - 14);
        return `<rect x="${i * bw + .5}" y="${y}" width="${Math.max(1, bw - 1.5)}" height="${Math.max(.8, x / m * (H - 14))}" rx="1.5" fill="#e58a45"/><text x="${(i + .5) * bw}" y="${y - 3}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--ink2)">${x}</text>`
          + (ps[i] == null ? "" : `<text x="${(i + .5) * bw}" y="${H + 9}" text-anchor="middle" font-size="${pf}" font-weight="800" fill="${w}">${ps[i] === "baru" ? "baru" : ps[i] > 0 ? "▲" + ps[i] + "%" : ps[i] < 0 ? "▼" + -ps[i] + "%" : "0%"}</text>`); };
      return `<div class="tp-tr"><div class="tp-tr-h"><span>7 hari terakhir</span>${vt ? `<span class="tp-pl" style="background:${WARNA_TREN[t.arah]}">${vt}</span>` : ""}</div>
        <svg viewBox="0 0 ${W} ${H + 12}" width="100%" aria-hidden="true">${v.map(bar).join("")}</svg>
        <div class="tp-tr-x"><span>${tg(s[0].hari)}</span><span>kabupaten/kota Siaga atau Awas</span><span>${tg(s.at(-1).hari)}</span></div></div>`; },
    /* kartu hover: dihitung sekali per wilayah, hari, bahaya, dan versi data (cache), bukan tiap gerak mouse */
    hover(kunci) {
      const ck = `${kunci}|${S.b}|${S.hari}|${this.versi}|${PosUkur.D ? 1 : 0}${PosUkur._agg?.size || 0}`, c = this.cache.get(ck); if (c) return c;
      const p = kunci.split("|"), prov = p.length === 1, a = this.ag?.[kunci], n = a ? a.s : 0, W = WARNA_LV, F = Wilayah.W?.file;
      const baris = prov ? F?.provinsi?.find(x => x.kode === kunci) : F?.provinsi?.find(x => x.kode === p[0])?.kab?.find(x => x.kode === kunci);
      const ps = prov ? this.pos(kunci) : null, rob = baris?.rob;
      const stat = [["bel", fmt(n), "kec. Siaga atau Awas", n ? W[a.n[3] ? 3 : 2] : "#8a94a6", n > 0], ["peringatan", baris?.kejadian_aktif == null ? "–" : fmt(baris.kejadian_aktif), "Wilayah Siaga", W[2]],
        ["hujan", baris?.hujan3_mm == null ? "–" : fmt(Math.round(baris.hujan3_mm)) + " mm", "hujan 3 hari", "#3f7fb8"],
        ps ? ["sungai", fmt(ps.naik), `pos Siaga${ps.mati ? `, ${fmt(ps.mati)} tak kirim` : ""}`, ps.naik ? WARNA_LV[2] : "#3f7fb8", ps.naik > 0] : ["ombak", rob == null ? "–" : fmt(rob), "titik rob", "#2b8c86"]];
      const h = PI.kartuTip({judul: esc(prov ? namaProv(kunci) : p[1]), kepala: lambang(p[0], prov ? null : p[1]), stat}) + (prov ? this.grafik(kunci) : "");
      this.cache.set(ck, h); return h; },
    /* klik: kartu kecil berlambang di titik tengah wilayah */
    kartu(kunci, ll) {
      const p = kunci.split("|"), prov = p.length === 1, a = this.ag?.[kunci], n = a ? a.s : 0, nama = prov ? namaProv(kunci) : p[1]; PI?.sembunyiTip(); this.tutup();
      const ik = d => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
      const pop = this._pop = new maplibregl.Popup({closeButton: true, maxWidth: "260px", className: "gel-pop"}).setLngLat(ll).setHTML(`<div class="gel-kartu"><div class="gel-hd">${lambang(p[0], prov ? null : p[1])}<div><small>${prov ? "Provinsi" : "Kabupaten/kota"}</small><b>${esc(nama)}</b></div></div>
        <p class="gel-n"><b style="color:${n ? WARNA_LV[a.n[3] ? 3 : 2] : "inherit"}">${fmt(n)}</b> kecamatan Siaga atau Awas</p>
        <div class="gel-aksi"><button class="btn" data-g="zoom">${ik('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>')}Zoom</button><button class="btn sec" data-g="rinci">${ik('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>')}Rincian</button></div></div>`).addTo(peta);
      pop.getElement().addEventListener("click", e => { const b = e.target.closest("[data-g]"); if (!b) return; pop.remove();
        if (b.dataset.g === "zoom") nanti(() => turun(kunci));
        else nanti(() => { const g = prov && S.geo.prov.features.find(x => x.properties.kode === kunci)?.geometry; return prov && PosUkur.menyala() && PosUkur.D ? PosUkur.provinsi(kunci, g) : Analisa.wilayah(kunci); }); }); },
    tutup() { this._pop?.remove(); this._pop = null; },
    /* dipanggil peta.on("click") sebelum poligon: hanya gelembung yang membuka kartu Zoom/Rincian; klik provinsi (poligon) tetap membuka laci pos langsung (keputusan pemilik, peta.js); true bila ditangani */
    klik(e) {
      const h = peta.getLayer(PROV) && peta.queryRenderedFeatures(e.point, {layers: [PROV, KAB].filter(l => peta.getLayer(l))});
      if (h?.length) { const k = h[0].properties.kunci; this.kartu(k, h[0].geometry.coordinates.slice()); return true; }
      return false; },
    legenda() {
      if (!this.ada || S.mode !== "status" || !Peta.lihat("wilayah")) return "";
      return `<div class="lbl" title="Angka = kecamatan berstatus Siaga atau Awas, warna = status tertinggi di wilayah itu. Provinsi di zoom nasional, kabupaten/kota saat diperbesar.">Gelembung angka</div><div class="leg">${[3, 2].map(l => `<span><i class="sw dot" style="background:${WARNA_LV[l]}"></i>${LEVEL[l]}</span>`).join("")}</div>`; },
  });
  akar.Gelembung = G;
})(typeof self !== "undefined" ? self : globalThis);
