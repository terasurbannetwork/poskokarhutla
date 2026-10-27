"use strict";
/* Empat overlay tambahan di peta /banjir, SEMUA mati sampai diklik: pompa dan pintu air, riwayat genangan satelit (GFM),
   warga terdampak listrik padam (hipotesis), penurunan tanah di bawah rob. Data dimuat malas saat pertama dinyalakan.
   Bagian murni (LEm) diuji di tests/banjir/lapis_ekstra.test.mjs; bagian peta memakai peta/S/nanti/muatJSON/Analisa/esc dari skrip lain. */
globalThis.LEm = (() => {
  const fmt = n => n == null || !isFinite(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
  /* "31|Kota Administrasi Jakarta Utara|Tanjung Priok" -> "Kota Administrasi Jakarta Utara|Tanjung Priok" (kunci berkas genangan) */
  const kunciKec = k => String(k).split("|").slice(1).join("|");
  const nama = k => String(k).split("|").pop();
  /* 1) pompa: jumlah per kecamatan, dan kecamatan Siaga/Awas (level >= 2) pada hari h yang punya atau tak punya pompa */
  const pompaPerKec = pompa => { const m = {}; for (const p of pompa || []) m[p[3]] = (m[p[3]] || 0) + 1; return m; };
  const ringkasPompa = (pompa, stKec, b, hari, awalan = "31|") => {
    const n = pompaPerKec(pompa), siaga = [];
    for (const [k, v] of Object.entries(stKec || {})) { if (!k.startsWith(awalan)) continue;
      const lv = v?.[b]?.[hari] || 0; if (lv >= 2) siaga.push({k: kunciKec(k), nama: nama(k), lv, pompa: n[kunciKec(k)] || 0}); }
    siaga.sort((a, c) => c.lv - a.lv || a.pompa - c.pompa);
    return {siaga, tanpaPompa: siaga.filter(x => !x.pompa), denganPompa: siaga.filter(x => x.pompa), pompaDiSiaga: siaga.reduce((s, x) => s + x.pompa, 0), total: (pompa || []).length};
  };
  /* 2) GFM: kali tergenang = jumlah TANGGAL (WIB) berbeda dengan tergenang_km2 > 0; luas terbesar dan tanggalnya; porsi tertutup mask */
  const ringkasGfm = d => { const out = {};
    for (const items of Object.values(d?.kejadian || {})) for (const it of items) for (const [k, v] of Object.entries(it.kec || {})) {
      const o = out[k] ||= {kali: 0, tanggal: [], luasMaks: 0, tglMaks: null, lintasan: 0, mask: 0, luas: v.luas_km2};
      o.lintasan++; o.mask += v.luas_km2 ? v.mask_km2 / v.luas_km2 : 0;
      const t = (it.wib || "").slice(0, 10);
      if (v.tergenang_km2 > 0 && t) { if (!o.tanggal.includes(t)) o.tanggal.push(t); if (v.tergenang_km2 > o.luasMaks) { o.luasMaks = v.tergenang_km2; o.tglMaks = t; } } }
    for (const o of Object.values(out)) { o.kali = o.tanggal.length; o.tanggal.sort(); o.maskPct = o.lintasan ? Math.round(o.mask / o.lintasan * 100) : null; delete o.mask; }
    return out; };
  const GFM_WARNA = ["#eaf1f8", "#bcd6ee", "#6aa6d8", "#1f64a8"];   /* 0 kali, 1, 2, 3 atau lebih: makin pekat makin sering */
  const kelasGfm = n => n == null || !(n > 0) ? 0 : n >= 3 ? 3 : n;
  const warnaGfm = n => GFM_WARNA[kelasGfm(n)];
  /* 3) listrik padam: angka dari berkas validasi apa adanya; selama metode.hipotesis, SELALU berpil hipotesis */
  const ribu = n => n == null || !isFinite(n) ? "–" : n < 1000 ? "kurang dari 1 ribu" : `±${fmt(Math.round(n / 1000))} ribu`;
  const wargaPadam = (k, metode) => { const r = k?.ringkas || {};
    return {gelap: r.pernah_gelap?.jiwa ?? null, masihGelap: r.masih_gelap?.jiwa ?? null, redup: r.masih_redup?.jiwa ?? null, pulih: r.pulih?.jiwa ?? null,
      kecDinilai: r.kec_dinilai ?? null, hariPasca: r.hari_pasca ?? null, hipotesis: metode?.hipotesis !== false}; };
  const warnaPadam = s => s === "gelap" ? "#1b1b2f" : s === "redup" ? "#e0a21a" : "#9aa6b2";
  /* 4) penurunan tanah: titik per kota (BUKAN kontur: sumber hanya angka kota). nilai gambar = maksimum yang dikutip; tanpa angka = dilewati */
  const KOTA_XY = {jakarta: [106.88, -6.12, "Jakarta Utara"], semarang: [110.42, -6.97, "Semarang"], pekalongan: [109.67, -6.89, "Pekalongan"], surabaya: [112.75, -7.25, "Surabaya"], medan: [98.67, 3.59, "Medan"], cirebon: [108.56, -6.71, "Cirebon"]};
  const subsidenTitik = s => { const f = [];
    for (const [id, k] of Object.entries(s?.kota || {})) { const xy = KOTA_XY[id]; if (!xy) continue;
      const a = (k.sumber || []).map(x => x.maks_cm_thn).filter(v => v != null && isFinite(v)); if (!a.length) continue;
      f.push({type: "Feature", geometry: {type: "Point", coordinates: [xy[0], xy[1]]}, properties: {id, kota: xy[2], maks: Math.max(...a), teks: "sampai " + fmt(Math.max(...a))}}); }
    return {type: "FeatureCollection", features: f}; };
  const SUB_WARNA = [[5, "#f3d9a4"], [10, "#ee9b4b"], [20, "#d4551f"], [1e9, "#8a1c0c"]];
  const warnaSub = v => SUB_WARNA.find(([b]) => v < b)[1];
  return {fmt, kunciKec, nama, pompaPerKec, ringkasPompa, ringkasGfm, GFM_WARNA, kelasGfm, warnaGfm, ribu, wargaPadam, warnaPadam, KOTA_XY, subsidenTitik, SUB_WARNA, warnaSub};
})();

/* ---------- bagian peta ---------- */
const LapisEkstra = {
  /* semua mati bawaan (pemilik 27 Okt 2026: overlay, harus diklik baru muncul) */
  DAFTAR: [["pompa", "Pompa dan pintu air (Jakarta)"], ["gfm", "Riwayat genangan satelit (Jakarta)"], ["padam", "Listrik padam, warga terdampak"], ["subsiden", "Penurunan tanah di bawah rob"]],
  D: {}, P: {}, nyala: {}, tp: [],
  menu() { const kotak = $("#lapis"); if (!kotak || $("#ekstraMenu")) return;
    const d = document.createElement("details"); d.id = "ekstraMenu"; d.open = true;
    d.innerHTML = `<summary>Data tambahan</summary>${this.DAFTAR.map(([k, n]) => `<label><input type="checkbox" data-l="${k}"> ${n}</label>`).join("")}`;
    kotak.appendChild(d); },
  muat(k, u) { return this.P[k] ||= muatJSON(u).then(x => this.D[k] = x).catch(() => { delete this.P[k]; return null; }); },
  kec() { return this.P.kec ||= muatJSON("../geo/kecamatan/31.json").then(g => { g.features.forEach(f => f.properties.k = f.properties.kab + "|" + f.properties.kec); return this.D.kec = g; }).catch(() => { delete this.P.kec; return null; }); },
  ubah(k, on) { if (!this.ID[k]) return; this.nyala[k] = on; this.kartu().hidden = !Object.values(this.nyala).some(Boolean); this.isiKartu();
    const ada = this.ID[k]?.some(l => peta?.getLayer(l));
    if (ada) { this.ID[k].forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none")); }
    else if (on) nanti(() => this.pasang(k)); },
  ID: {pompa: ["ekstra-tp", "ekstra-pompa", "ekstra-pompa-h"], gfm: ["ekstra-gfm", "ekstra-gfm-garis"], padam: ["ekstra-padam"], subsiden: ["ekstra-sub", "ekstra-sub-angka"]},
  vis: k => LapisEkstra.nyala[k] ? "visible" : "none",
  async pasang(k) { if (!peta) return;
    const bawah = peta.getLayer("wil-line") ? "wil-line" : undefined, gl = gelap(), ink = gl ? "#fff" : "#0b2545", halo = gl ? "#0b1424" : "#fff";
    if (k === "pompa") { const [p, g] = await Promise.all([this.muat("pompa", "data/genangan/pompa.json"), this.kec()]); if (!p || !g || peta.getLayer("ekstra-pompa")) return this.isiKartu();
      const f = a => ({type: "FeatureCollection", features: a.map(x => ({type: "Feature", geometry: {type: "Point", coordinates: [x[0], x[1]]}, properties: {nama: x[2], kec: x[3], ket: x[4]}}))});
      if (!peta.getSource("ekstra-kec")) peta.addSource("ekstra-kec", {type: "geojson", data: g}); peta.addSource("ekstra-pompa", {type: "geojson", data: f(p.pompa)});
      peta.addLayer({id: "ekstra-tp", type: "line", source: "ekstra-kec", layout: {visibility: this.vis("pompa")}, paint: {"line-color": "#d4151b", "line-width": 3, "line-dasharray": [2, 1]}, filter: ["in", ["get", "k"], ["literal", [""]]]}, bawah);
      const lay = (id, src, w) => peta.addLayer({id, type: "circle", source: src, layout: {visibility: this.vis("pompa")}, paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 13, 9], "circle-color": w, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5}});
      lay("ekstra-pompa", "ekstra-pompa", "#0b5fb0");
      peta.addLayer({id: "ekstra-pompa-h", type: "symbol", source: "ekstra-pompa", minzoom: 10, layout: {visibility: this.vis("pompa"), "text-field": "P", "text-font": ["Noto Sans Bold"], "text-size": 11, "text-allow-overlap": true}, paint: {"text-color": "#fff"}});
      if (p.pintu?.length) { peta.addSource("ekstra-pintu", {type: "geojson", data: f(p.pintu)}); lay("ekstra-pintu", "ekstra-pintu", "#e0791a"); this.ID.pompa.push("ekstra-pintu"); }
      this.sorotTP(); this.isiKartu(); }
    if (k === "gfm") { const [d, g] = await Promise.all([this.muat("gfm", "data/genangan/gfm_kec.json"), this.kec()]); if (!d || !g || peta.getLayer("ekstra-gfm")) return this.isiKartu();
      this.gfm = LEm.ringkasGfm(d); if (!peta.getSource("ekstra-kec")) peta.addSource("ekstra-kec", {type: "geojson", data: g});
      const e = ["match", ["get", "k"]]; for (const [kk, o] of Object.entries(this.gfm)) e.push(kk, LEm.warnaGfm(o.kali)); e.push("rgba(0,0,0,0)");
      peta.addLayer({id: "ekstra-gfm", type: "fill", source: "ekstra-kec", layout: {visibility: this.vis("gfm")}, paint: {"fill-color": Object.keys(this.gfm).length ? e : "rgba(0,0,0,0)", "fill-opacity": .75}}, bawah);
      peta.addLayer({id: "ekstra-gfm-garis", type: "line", source: "ekstra-kec", layout: {visibility: this.vis("gfm")}, paint: {"line-color": "#1f64a8", "line-width": .8, "line-opacity": .6}}, bawah);
      this.isiKartu(); }
    if (k === "padam") { const [v, pk] = await Promise.all([this.muat("padam", "data/lampu_malam_validasi.json"), this.muat("pusat", "data/pusat_kec.json")]); if (!v || !pk || peta.getLayer("ekstra-padam")) return this.isiKartu();
      const kej = v.kejadian?.[0], fs = (kej?.kec || []).filter(x => pk[x.k]).map(x => ({type: "Feature", geometry: {type: "Point", coordinates: [pk[x.k][1], pk[x.k][0]]}, properties: {k: x.k, s: x.status, w: LEm.warnaPadam(x.status), jiwa: x.jiwa}}));
      peta.addSource("ekstra-padam", {type: "geojson", data: {type: "FeatureCollection", features: fs}});
      peta.addLayer({id: "ekstra-padam", type: "circle", source: "ekstra-padam", layout: {visibility: this.vis("padam")}, paint: {"circle-radius": ["interpolate", ["linear"], ["get", "jiwa"], 5000, 7, 100000, 18], "circle-color": ["get", "w"], "circle-opacity": .85, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5}});
      this.isiKartu(); }
    if (k === "subsiden") { const s = await this.muat("subsiden", "data/subsiden_literatur.json"); if (!s || peta.getLayer("ekstra-sub")) return this.isiKartu();
      peta.addSource("ekstra-sub", {type: "geojson", data: LEm.subsidenTitik(s)});
      const W = LEm.SUB_WARNA, w = ["step", ["get", "maks"], W[0][1], ...W.slice(1).flatMap((x, i) => [W[i][0], x[1]])];
      const bef = peta.getLayer("rob") ? "rob" : undefined;
      peta.addLayer({id: "ekstra-sub", type: "circle", source: "ekstra-sub", layout: {visibility: this.vis("subsiden")}, paint: {"circle-radius": ["interpolate", ["linear"], ["get", "maks"], 5, 8, 28, 20], "circle-color": w, "circle-opacity": .8, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5}}, bef);
      peta.addLayer({id: "ekstra-sub-angka", type: "symbol", source: "ekstra-sub", layout: {visibility: this.vis("subsiden"), "text-field": ["concat", ["get", "kota"], "\n", ["get", "teks"], " cm/thn"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-offset": [0, 2.1], "text-optional": true}, paint: {"text-color": ink, "text-halo-color": halo, "text-halo-width": 1.6}}, bef);
      this.isiKartu(); }
    if (!this._klik) { this._klik = true; for (const l of ["ekstra-gfm", "ekstra-pompa", "ekstra-padam", "ekstra-sub"]) { peta.on("mouseenter", l, () => peta.getCanvas().style.cursor = "pointer"); peta.on("mouseleave", l, () => peta.getCanvas().style.cursor = ""); } }
  },
  /* kecamatan Siaga/Awas tanpa pompa diberi garis merah putus-putus */
  sorotTP() { if (!peta?.getLayer("ekstra-tp")) return; const r = LEm.ringkasPompa(this.D.pompa?.pompa, S.st?.kec, S.b, S.hari); this.tp = r.tanpaPompa;
    peta.setFilter("ekstra-tp", ["in", ["get", "k"], ["literal", r.tanpaPompa.length ? r.tanpaPompa.map(x => x.k) : [""]]]); },
  /* dipanggil peta.on("click") sebelum poligon wilayah; true bila ditangani */
  klik(e) { if (!peta) return false;
    const q = id => this.nyala[{"ekstra-pompa": "pompa", "ekstra-gfm": "gfm", "ekstra-padam": "padam", "ekstra-sub": "subsiden"}[id]] && peta.getLayer(id) && peta.queryRenderedFeatures(e.point, {layers: [id]})[0];
    const a = q("ekstra-pompa") || (peta.getLayer("ekstra-pintu") && this.nyala.pompa && peta.queryRenderedFeatures(e.point, {layers: ["ekstra-pintu"]})[0]);
    if (a) { const p = a.properties, pintu = a.layer.id === "ekstra-pintu"; Analisa.buka(`<table class="tb2"><tbody><tr><td>Kecamatan</td><td class="n">${esc(LEm.nama(p.kec))}</td></tr>${p.ket ? `<tr><td>Keterangan OSM</td><td class="n">${esc(p.ket)}</td></tr>` : ""}</tbody></table><p class="fnd">Titik dari OpenStreetMap. Kapasitas hanya bila tercatat, status menyala atau rusak tidak diketahui.</p>`, `<div><h3 id="dlgJudul">${esc(p.nama || (pintu ? "Pintu air" : "Rumah pompa"))}</h3><p>${pintu ? "Pintu air" : "Rumah pompa"}</p></div>`); return true; }
    const sb = q("ekstra-sub"); if (sb) { this.kartuSub(sb.properties.id); return true; }
    const pd = q("ekstra-padam"); if (pd) { const x = pd.properties; Analisa.buka(`<p class="fnd">${esc(LEm.nama(x.k))}: ${LEm.fmt(x.jiwa)} penduduk (WorldPop), status malam ${esc(x.s)}.</p>${this.catatPadam()}`, `<div><h3 id="dlgJudul">${esc(LEm.nama(x.k))}</h3><p>Listrik padam, hipotesis</p></div>`); return true; }
    const g = this.nyala.gfm && peta.getLayer("ekstra-gfm") && peta.queryRenderedFeatures(e.point, {layers: ["ekstra-gfm"]})[0];
    if (g) { this.kartuGfm(g.properties.k); return true; }
    return false; },
  kartuGfm(k) { const o = this.gfm?.[k], tg = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"});
    const isi = !o ? `<p class="fnd">Tidak ada lintasan satelit yang menutup kecamatan ini pada kejadian yang dipanen.</p>` : `<div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:34px;line-height:1;color:#1f64a8">${o.kali}</b><span style="font-size:15px">kali tergenang terdeteksi satelit</span></div>
      <table class="tb2"><tbody><tr><td>Luas tergenang terbesar</td><td class="n">${o.kali ? `${LEm.fmt(o.luasMaks)} km², ${tg(o.tglMaks)}` : "tidak ada"}</td></tr>${o.kali ? `<tr><td>Tanggal</td><td class="n">${o.tanggal.map(tg).join(", ")}</td></tr>` : ""}<tr><td>Lintasan satelit yang menutup</td><td class="n">${o.lintasan}</td></tr><tr><td>Bagian wilayah yang tak dilaporkan GFM</td><td class="n">sekitar ${o.maskPct}%</td></tr></tbody></table>`;
    Analisa.buka(isi + this.batasGfm(), `<div><h3 id="dlgJudul">${esc(LEm.nama(k))}</h3><p>Riwayat genangan satelit</p></div>`); },
  batasGfm: () => `<p class="fnd">Sumber: Copernicus GFM, radar Sentinel-1. Satelit lewat tiap beberapa hari, jadi genangan yang surut dalam sehari bisa terlewat. Di kota padat radar sering tak melapor (bangunan), sehingga angka ini batas bawah. Hanya kejadian terpilih 2017 sampai 2025 yang dipanen, bukan semua hari sejak 2015.</p>`,
  catatPadam() { const m = this.D.padam?.metode?.catatan; return `<span class="pill" style="background:#7a4fbf;color:#fff">Hipotesis</span><p class="fnd">${esc(m || "Ambang gelap dan redup belum tervalidasi.")}</p>`; },
  kartuSub(id) { const k = this.D.subsiden?.kota?.[id]; if (!k) return;
    Analisa.buka(`<span class="pill" style="background:#7a4fbf;color:#fff">Dari literatur, bukan pengukuran kami</span>${k.sumber.map(s => `<p class="fnd"><b>${esc(s.kutipan)}</b>, ${esc(s.periode)}, ${esc(s.metode)}. ${esc(s.ringkas)}</p>`).join("")}<p class="fnd">Rentang tidak sebanding antarkota: periode dan metode berbeda. Titik ini letak kota perkiraan, bukan lokasi alat.</p>`,
      `<div><h3 id="dlgJudul">${esc(k.kota)}</h3><p>Penurunan tanah</p></div>`); },
  kartu() { let k = $("#ekstraKartu"); if (k) return k; k = document.createElement("div"); k.id = "ekstraKartu"; k.className = "box"; k.hidden = true; ($("#eksKartu") || $("#lapis")).after(k); return k; },
  isiKartu() { const k = this.kartu(), n = this.nyala, h = [], pil = (t, w = "#7a4fbf") => `<span class="pill" style="background:${w};color:#fff">${t}</span>`;
    if (n.pompa) { const p = this.D.pompa; if (!p) h.push(`<div class="lbl">Pompa dan pintu air</div><small>Memuat...</small>`); else { const r = LEm.ringkasPompa(p.pompa, S.st?.kec, S.b, S.hari); this.tp = r.tanpaPompa;
      h.push(`<div class="lbl">Pompa dan pintu air, DKI Jakarta (pilot)</div><div style="font-size:22px;font-weight:700;color:var(--ink)">${LEm.fmt(r.total)} rumah pompa</div>
        <small>${r.siaga.length ? `${r.siaga.length} kecamatan Jakarta Siaga atau Awas hari ini: ${r.denganPompa.length} punya pompa (${LEm.fmt(r.pompaDiSiaga)} unit), ${r.tanpaPompa.length} tanpa pompa tercatat.` : "Tidak ada kecamatan Jakarta Siaga atau Awas pada hari ini."}</small>
        ${r.tanpaPompa.length ? `<small style="display:block;margin-top:4px;color:#d4151b"><b>Siaga tanpa pompa:</b> ${r.tanpaPompa.map(x => esc(x.nama)).join(", ")}</small>` : ""}
        <small style="display:block;margin-top:4px">${p.pintu_terpanen ? `${LEm.fmt(p.pintu.length)} pintu air` : "Pintu air belum berhasil dipanen dari OpenStreetMap, jadi belum tampil."} Titik dari OSM, kapasitas dan status menyala tidak diketahui.</small>`); } }
    if (n.gfm) h.push(`<div class="lbl">Riwayat genangan satelit, DKI Jakarta (pilot)</div><div class="legscale">${LEm.GFM_WARNA.map(w => `<i style="background:${w}"></i>`).join("")}</div><div class="legnum"><span>0</span><span>1 kali</span><span>2 kali</span><span>3+</span></div><small>Makin pekat makin sering tergenang. Klik kecamatan untuk rinciannya. Radar Sentinel-1 lewat tiap beberapa hari, genangan singkat bisa terlewat.</small>`);
    if (n.padam) { const v = this.D.padam, kj = v?.kejadian?.[0], w = LEm.wargaPadam(kj, v?.metode);
      h.push(`<div class="lbl">Listrik padam, warga terdampak</div>${!kj ? "<small>Memuat...</small>" : `${w.hipotesis ? pil("Hipotesis") : ""}<div style="font-size:22px;font-weight:700;margin-top:4px">${LEm.ribu(w.redup)} warga di kecamatan yang masih redup</div>
        <small>Hanya satu kejadian divalidasi: ${esc(kj.nama)}, ${esc(kj.waktu.slice(0, 10))} (gempa, bukan banjir), bukan data harian. ${LEm.fmt(w.kecDinilai)} kecamatan dinilai, ${LEm.ribu(w.masihGelap)} warga masih gelap. Kesimpulan berkas validasi: jalur tanpa token belum layak terbit, perlu VNP46A2 asli (EARTHDATA_TOKEN).</small>`}`); }
    if (n.subsiden) h.push(`<div class="lbl">Penurunan tanah (cm per tahun)</div>${pil("Dari literatur")}<div class="legscale" style="margin-top:6px">${LEm.SUB_WARNA.map(([, c]) => `<i style="background:${c}"></i>`).join("")}</div><div class="legnum"><span>&lt;5</span><span>5</span><span>10</span><span>20+</span></div><small>Titik per kota, angka tertinggi yang dikutip, bukan kontur: sumbernya tidak punya peta sebaran. Klik titik untuk sumber tiap angka.</small>`);
    k.innerHTML = h.join('<hr style="border:0;border-top:1px solid var(--line,#0002);margin:8px 0">'); },
  legenda() { const n = this.nyala, h = [];
    if (n.pompa) h.push(`<div class="lbl">Pompa dan pintu air (Jakarta)</div><div><span style="color:#0b5fb0">●</span> rumah pompa, <span style="color:#e0791a">●</span> pintu air, garis merah putus-putus: Siaga tanpa pompa</div>`);
    if (n.gfm) h.push(`<div class="lbl">Genangan satelit, jumlah kejadian (Jakarta)</div><div class="legscale">${LEm.GFM_WARNA.map(w => `<i style="background:${w}"></i>`).join("")}</div><div class="legnum"><span>0</span><span>1</span><span>2</span><span>3+</span></div>`);
    if (n.padam) h.push(`<div class="lbl">Listrik padam (hipotesis, satu kejadian)</div><div><span style="color:#1b1b2f">●</span> gelap, <span style="color:#e0a21a">●</span> redup, <span style="color:#9aa6b2">●</span> normal</div>`);
    if (n.subsiden) h.push(`<div class="lbl">Penurunan tanah, cm per tahun (literatur)</div><div class="legscale">${LEm.SUB_WARNA.map(([, c]) => `<i style="background:${c}"></i>`).join("")}</div>`);
    return h.join(""); },
  mulai() { this.menu(); $("#hariSeg")?.addEventListener("click", () => nanti(() => { if (this.nyala.pompa) { this.sorotTP(); this.isiKartu(); } })); },
};
typeof document !== "undefined" && typeof $ === "function" && LapisEkstra.mulai();
