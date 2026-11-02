"use strict";
/* ================================================================ status 72 jam (deteksi Centurisk97, BUKAN peringatan resmi BMKG)
   Data: ../banjir/data/cuaca_{kec,gelombang,siklon,sarana,dampak}.json lewat S.kec/gel/sik/sar/dmp (cuaca.js muatTambahan). Berkas yang tak ada = bagian dibuang, tanpa galat.
   Semua lapisan baru hidup di peta.js lewat Status.pasang() dan Status.segarkan(); kontrol tambahan hanya dibuat bila datanya ada. */
const Status = (() => {
  const ID = {kec: "st-kec", gel: "st-gel", sar: "st-sar", sikG: "st-sik-garis", sikK: "st-sik-kerucut", sikT: "st-sik-titik"};
  const HS = () => S.kec?.ambang?.hs_m || [2.5, 4, 6];
  const k = () => { const i = kIdx(); return i >= 0 ? i : 0; };
  const ada = {kec: () => !!S.kec, gel: () => !!(S.gel && S.kec), sar: () => !!(S.sar && S.dmp), sik: () => !!S.sik};
  const warnaExpr = key => ["match", ["get", key], 3, warnaT(3), 2, warnaT(2), 1, warnaT(1), "#9aa4b2"];
  const tHs = v => v == null ? 0 : v / 10 >= HS()[2] ? 3 : v / 10 >= HS()[1] ? 2 : v / 10 >= HS()[0] ? 1 : 0;
  const pt = (lon, lat, p) => ({type: "Feature", geometry: {type: "Point", coordinates: [lon, lat]}, properties: p});
  const fc = f => ({type: "FeatureCollection", features: f});
  const kt = v => Math.round(v * 1.852);   /* knot ke km/jam */
  const nmKec = i => { const [p, kab, kec] = (S.kecKunci[i] || "").split("|"); return {p, kab, kec}; };
  const lihat = n => { const i = document.querySelector(`#lapis input[data-l="${n}"]`); return i ? i.checked : false; };

  /* ---------- geojson ---------- */
  const geoKec = () => { S.kecBaris ||= new Map(S.kec.kec.map(r => [r[0], r]));
    return fc(S.kec.kec.flatMap(r => { const p = S.kecPusat[r[0]]; return p ? [pt(p[1], p[0], {i: r[0], t0: r[1][0] || 0, t1: r[1][1] || 0, t2: r[1][2] || 0})] : []; })); };
  /* hs tertinggi (dm) dalam satu hari WIB dari deret per jam yang mulai di t0 (UTC) */
  const hsHari = (t, j) => { const a = Math.round((Date.parse(S.kec.hari[j] + "T00:00:00+07:00") - Date.parse(S.gel.t0)) / 36e5); let m = null;
    for (let h = Math.max(0, a); h < Math.min(t.length, a + 24); h++) if (t[h] != null && (m == null || t[h] > m)) m = t[h]; return m; };
  const geoGel = j => fc(S.gel.titik.flatMap((r, n) => { const m = hsHari(r[4], j); return m == null ? [] : [pt(r[1], r[0], {n, hs: m, t: tHs(m)})]; }));
  const geoSar = () => { const f = [];
    for (const r of S.dmp.pelabuhan || []) { const s = S.sar.pelabuhan[r[0]]; if (s) f.push(pt(s[2], s[1], {j: "pelabuhan", n: r[0], t0: r[1][0] || 0, t1: r[1][1] || 0, t2: r[1][2] || 0, x: r[2], g: r[3]})); }
    for (const r of S.dmp.bandara || []) { const s = S.sar.bandara[r[0]]; if (s) f.push(pt(s[3], s[2], {j: "bandara", n: r[0], t0: r[1][0] || 0, t1: r[1][1] || 0, t2: r[1][2] || 0, x: r[2], g: r[3]})); }
    return fc(f); };
  const geoSik = () => { const G = [], T = [], C = [];
    for (const s of S.sik.aktif) { const L = s.lintasan || [], ob = L.filter(x => x[4] === "amatan"), pr = L.filter(x => x[4] !== "amatan");
      const garis = (a, jenis) => a.length > 1 && G.push({type: "Feature", geometry: {type: "LineString", coordinates: a.map(x => [x[2], x[1]])}, properties: {id: s.id, jenis}});
      garis(ob, "amatan"); garis(ob.length ? [ob.at(-1), ...pr] : pr, "prakiraan");
      L.forEach((x, n) => { T.push(pt(x[2], x[1], {id: s.id, jenis: x[4], waktu: x[0], kt: x[3]}));
        const km = s.kerucut_km?.[n]; if (km > 0) C.push(pt(x[2], x[1], {r0: km * 1000 / (78271.52 * Math.cos(x[1] * Math.PI / 180))})); }); }
    return {G: fc(G), T: fc(T), C: fc(C)}; };

  /* ---------- peta ---------- */
  function pasang() {
    const bl = Peta.bawahLabel(), j = k();
    if (ada.kec()) {
      peta.addSource("st-kec", {type: "geojson", data: geoKec()});
      peta.addLayer({id: ID.kec, type: "circle", source: "st-kec", layout: {visibility: "none"}, filter: [">=", ["get", "t" + j], 1],
        paint: {"circle-color": warnaExpr("t" + j), "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.5, 8, 7, 11, 12], "circle-opacity": .85, "circle-stroke-color": "#fff", "circle-stroke-width": .8}});
    }
    if (ada.gel()) {
      peta.addSource("st-gel", {type: "geojson", data: geoGel(j)});
      peta.addLayer({id: ID.gel, type: "circle", source: "st-gel", layout: {visibility: "none"}, filter: [">=", ["get", "hs"], Math.round(HS()[0] * 5)],
        paint: {"circle-color": warnaExpr("t"), "circle-radius": ["interpolate", ["linear"], ["get", "hs"], 10, 3, 60, 9], "circle-opacity": .8, "circle-stroke-color": "#16405c", "circle-stroke-width": 1.2}});
    }
    if (ada.sar()) {
      peta.addSource("st-sar", {type: "geojson", data: geoSar()});
      peta.addLayer({id: ID.sar, type: "circle", source: "st-sar", layout: {visibility: "none"}, filter: [">=", ["get", "t" + j], 1],
        paint: {"circle-color": warnaExpr("t" + j), "circle-radius": 7, "circle-stroke-color": ["match", ["get", "j"], "bandara", "#0b2545", "#16405c"], "circle-stroke-width": 2.4}});
    }
    if (ada.sik()) {
      const g = geoSik();
      peta.addSource("st-sik-k", {type: "geojson", data: g.C}); peta.addSource("st-sik-g", {type: "geojson", data: g.G}); peta.addSource("st-sik-t", {type: "geojson", data: g.T});
      /* kerucut = lingkaran berjari-jari km tiap titik lintasan (px = km / meter per piksel di lintang itu); tumpang tindih sengaja tipis. ponytail: bukan gabungan poligon, upgrade bila perlu tepi mulus */
      peta.addLayer({id: ID.sikK, type: "circle", source: "st-sik-k", layout: {visibility: "none"}, paint: {"circle-pitch-scale": "map", "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 0, ["get", "r0"], 22, ["*", ["get", "r0"], 4194304]], "circle-color": "#7a1f2b", "circle-opacity": .09}});
      peta.addLayer({id: ID.sikG + "-p", type: "line", source: "st-sik-g", layout: {visibility: "none"}, filter: ["==", ["get", "jenis"], "prakiraan"], paint: {"line-color": "#7a1f2b", "line-width": 2.2, "line-dasharray": [2, 2]}});
      peta.addLayer({id: ID.sikG, type: "line", source: "st-sik-g", layout: {visibility: "none"}, filter: ["==", ["get", "jenis"], "amatan"], paint: {"line-color": "#7a1f2b", "line-width": 2.6}});
      peta.addLayer({id: ID.sikT, type: "circle", source: "st-sik-t", layout: {visibility: "none"}, paint: {"circle-radius": 4.5, "circle-color": ["match", ["get", "jenis"], "amatan", "#7a1f2b", "#fff"], "circle-stroke-color": "#7a1f2b", "circle-stroke-width": 2}});
    }
    segarkan();
  }
  /* hari terpilih berganti atau mode berganti: filter dan warna ikut kolom hari; kecuali kerucut siklon, tak ada data yang digambar ulang selain gelombang */
  function segarkan() {
    if (!peta?.getLayer) return; const j = k(), st = S.mode === "status", v = (id, on) => peta.getLayer(id) && peta.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    if (peta.getLayer(ID.kec)) { peta.setFilter(ID.kec, [">=", ["get", "t" + j], 1]); peta.setPaintProperty(ID.kec, "circle-color", warnaExpr("t" + j)); v(ID.kec, st && lihat("s-kec")); }
    if (peta.getLayer(ID.gel)) { peta.getSource("st-gel").setData(geoGel(j)); v(ID.gel, st && lihat("s-gel")); }
    if (peta.getLayer(ID.sar)) { peta.setFilter(ID.sar, [">=", ["get", "t" + j], 1]); peta.setPaintProperty(ID.sar, "circle-color", warnaExpr("t" + j)); v(ID.sar, st && lihat("s-sar")); }
    if (peta.getLayer(ID.sikT)) [ID.sikK, ID.sikG, ID.sikG + "-p", ID.sikT].forEach(id => v(id, lihat("s-sik")));
  }

  /* ---------- kontrol ---------- */
  const IKT = {"s-kec": ["Kecamatan 72 jam", "Kecamatan", "peringatan"], "s-gel": ["Titik gelombang", "Ombak", "ombak"], "s-sar": ["Pelabuhan dan bandara", "Sarana", "posko"], "s-sik": ["Siklon tropis", "Siklon", "angin"]};
  function kontrol() {
    if (ada.kec()) { $("#modePeta").insertAdjacentHTML("beforeend", '<button data-mp="status" aria-pressed="false">Status</button>'); }
    pilSiklon();
    const L = [["s-kec", ada.kec(), true], ["s-gel", ada.gel(), true], ["s-sar", ada.sar(), true], ["s-sik", ada.sik(), true]].filter(x => x[1]); if (!L.length) return;
    L.forEach(([n]) => { UBIN[n] = ["#7a3b0b", "#e58a45", IKT[n][2]]; UBIN_PENDEK[n] = IKT[n][1]; });
    $("#lapis").insertAdjacentHTML("beforeend", `<details open><summary>Status 72 jam</summary>${L.map(([n]) => `<label><input type="checkbox" data-l="${n}" checked> ${IKT[n][0]}</label>`).join("")}</details>`);
    $("#lapis").addEventListener("change", e => { if (e.target.closest('input[data-l^="s-"]')) { segarkan(); renderLegenda(); } });
  }
  /* pil siklon di atas peta: satu tombol per siklon aktif; klik terbang ke lintasannya dan buka laci */
  function pilSiklon() { if (!ada.sik()) return; const el = $("#pilSiklon"); if (!el) return;
    el.innerHTML = S.sik.aktif.map(c => `<button data-sk="${esc(c.id)}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 3a9 9 0 0 1 9 9M12 21a9 9 0 0 1-9-9"/></svg><b translate="no">${esc(c.nama || c.id)}</b>${c.angin_kt != null ? ` ${fmt(kt(c.angin_kt))} km/jam` : ""}</button>`).join("");
    el.onclick = e => { const b = e.target.closest("button[data-sk]"); if (!b) return; const c = S.sik.aktif.find(x => x.id === b.dataset.sk); if (!c?.lintasan?.length) return;
      S.pilih = null; renderCrumb(); const L = c.lintasan; peta.fitBounds([[Math.min(...L.map(x => x[2])), Math.min(...L.map(x => x[1]))], [Math.max(...L.map(x => x[2])), Math.max(...L.map(x => x[1]))]], {padding: kiriPad(), duration: 700, maxZoom: 6}); laciSik(c.id); }; }
  /* mode berganti: hari di luar 72 jam dimatikan, panel kiri ikut tab Status */
  function modeBerubah() {
    const st = S.mode === "status", bt = [...document.querySelectorAll("#hariSeg button")];
    bt.forEach(b => b.disabled = st && S.kec.hari.indexOf(S.pr.hari[+b.dataset.h]) < 0);
    if (st && kIdx() < 0) { const b = bt.find(x => !x.disabled); if (b) { S.hari = +b.dataset.h; bt.forEach(x => x.setAttribute("aria-pressed", x === b)); } }
    if (st && panelMode !== "st") { panelMode = "st"; renderPanel(); } else if (!st && panelMode === "st") { panelMode = "nc"; renderPanel(); }
  }

  /* ---------- panel kiri: ringkasan provinsi ---------- */
  function tabPanel() { return ada.kec() ? `<button data-m="st" aria-pressed="${panelMode === "st"}">Status <b>${fmt(Object.keys(S.kec.prov).filter(p => S.kec.prov[p].t[k()] > 0).length)}</b> provinsi</button>` : ""; }
  const urutProv = j => Object.entries(S.kec.prov).filter(([, o]) => o.t[j] > 0).sort((a, b) => b[1].t[j] - a[1].t[j] || b[1].n[j][2] - a[1].n[j][2] || b[1].n[j][1] - a[1].n[j][1] || b[1].n[j][0] - a[1].n[j][0]);
  const ringkasN = n => [[n[2], 3], [n[1], 2], [n[0], 1]].filter(x => x[0]).map(([c, t]) => `${fmt(c)} kecamatan ${namaT(t).toLowerCase()}`).join(", ");
  /* ---------- tabel bertingkat provinsi > kab/kota > kecamatan (seperti banjir), hari terpilih ---------- */
  S.stJalur = [];
  const GR = "grid-template-columns:18px minmax(0,2.2fr) 64px 66px 44px 58px";
  /* kab/kota diturunkan dari kunci pusat_kec ("prov|kab|kec"); angka dihitung dari baris kecamatan di atas ambang pada hari j */
  const agg = j => { const c = S.kecAgg ||= {}; if (c[j]) return c[j]; const P = new Map();
    for (const r of S.kec.kec) { const t = r[1][j] || 0; if (!t) continue; const n = nmKec(r[0]); const K = P.get(n.p) || P.set(n.p, new Map()).get(n.p);
      const o = K.get(n.kab) || K.set(n.kab, {t: 0, n: [0, 0, 0], mm: 0, g: 0, kec: []}).get(n.kab);
      o.t = Math.max(o.t, t); o.n[t - 1]++; o.mm = Math.max(o.mm, r[4][j] ?? 0); o.g = Math.max(o.g, r[5][j] ?? 0); o.kec.push(r); }
    return c[j] = P; };
  function barisData(J, j) {
    const P = agg(j);
    if (J.length === 0) return urutProv(j).map(([p, o]) => { const K = [...(P.get(p) || new Map()).values()];
      return {id: p, attr: "data-st", nama: namaProv(p), t: o.t[j], n: o.n[j], mm: K.reduce((m, x) => Math.max(m, x.mm), 0), g: K.reduce((m, x) => Math.max(m, x.g), 0)}; });
    if (J.length === 1) return [...(P.get(J[0]) || new Map())].map(([kab, o]) => ({id: kab, attr: "data-kb", nama: kab, t: o.t, n: o.n, mm: o.mm, g: o.g}))
      .sort((a, b) => b.t - a.t || b.n[2] - a.n[2] || b.n[1] - a.n[1] || b.n[0] - a.n[0] || a.nama.localeCompare(b.nama, "id"));
    return ((P.get(J[0]) || new Map()).get(J[1])?.kec || []).map(r => ({id: r[0], attr: "data-kc", nama: nmKec(r[0]).kec, t: r[1][j], n: null, mm: r[4][j] ?? 0, g: r[5][j] ?? 0}))
      .sort((a, b) => b.t - a.t || b.mm - a.mm || b.g - a.g || a.nama.localeCompare(b.nama, "id")); }
  const angka = (v, s) => v ? `${fmt(v)}${s ? " " + s : ""}` : "–";
  function barisPanel(q) { const j = k(), J = S.stJalur, lv = J.length;
    const R = barisData(J, j).filter(r => !q || r.nama.toLowerCase().includes(q));
    const kepala = `<div class="tb kepala" style="${GR}"><span></span><span>${["Provinsi", "Kabupaten / kota", "Kecamatan"][lv]}</span><span>Status</span><span title="Kecamatan di atas ambang Waspada">Kecamatan</span><span title="Hujan harian tertinggi">Hujan<br>mm</span><span title="Embusan tertinggi">Embusan<br>km/jam</span></div>`;
    const isi = R.map((r, i) => `<button class="tb" ${r.attr}="${esc(String(r.id))}" style="${GR}"><span class="rk">${i + 1}</span><span style="font-weight:600" translate="no">${esc(r.nama)}</span><span>${pilT(r.t)}</span><span>${r.n ? angka(r.n[0] + r.n[1] + r.n[2]) : "–"}</span><span>${angka(Math.round(r.mm))}</span><span>${angka(Math.round(r.g))}</span></button>`).join("");
    const ringkas = R.length ? `<p class="fnd" style="margin:2px 8px 6px">${fmt(R.length)} ${["provinsi", "kabupaten atau kota", "kecamatan"][lv]} di atas ambang Waspada ${kapan3(j)}${q ? ", sesuai pencarian" : ""}. Deteksi Centurisk97, bukan peringatan resmi BMKG.</p>` : "";
    return ringkas + (isi ? kepala + isi : `<p class="kosong">${q ? "Tidak ada yang cocok." : `Tidak ada ${["provinsi", "kabupaten atau kota", "kecamatan"][lv]} di atas ambang Waspada ${kapan3(j)}, menurut deteksi Centurisk97 dari prakiraan model.`}</p>`); }
  /* klik baris: provinsi atau kab/kota turun satu tingkat (peta terbang ke wilayahnya), kecamatan terbang dan buka laci */
  function klikBaris(b) {   /* jalur dan crumb urgen; peta, laci, dan tabel ditunda (INP) */
    let kerja;
    if (b.dataset.st != null) { const p = b.dataset.st; S.stJalur = [p];
      kerja = () => { const f = S.geo.features.find(x => x.properties.kode === p); f && peta.fitBounds(kotak([f]), {padding: kiriPad(), duration: 700, maxZoom: 8}); }; }
    else if (b.dataset.kb != null) { const p = S.stJalur[0], kb = b.dataset.kb; S.stJalur = [p, kb];
      kerja = () => { const P = S.kecKunci.flatMap((x, i) => { const [pp, kab] = x.split("|"); return pp === p && kab === kb && S.kecPusat[i] ? [S.kecPusat[i]] : []; });
        if (P.length) peta.fitBounds([[Math.min(...P.map(x => x[1])), Math.min(...P.map(x => x[0]))], [Math.max(...P.map(x => x[1])), Math.max(...P.map(x => x[0]))]], {padding: kiriPad(), duration: 700, maxZoom: 10}); }; }
    else { const i = +b.dataset.kc, c = S.kecPusat[i]; S.pilih = null;
      kerja = () => { if (c) peta.flyTo({center: [c[1], c[0]], zoom: 10, duration: 700}); laciKec(i); }; }
    renderCrumb(); nanti(() => { kerja(); renderPanel(); }); }
  function fokusProv(p) { const f = S.geo.features.find(x => x.properties.kode === p), o = S.kec.prov[p]; if (!f || !o) return;
    S.pilih = {jenis: "st", k: p}; renderCrumb(); peta.fitBounds(kotak([f]), {padding: kiriPad(), duration: 700, maxZoom: 8}); laciProv(p); }
  function laciProv(p) { const o = S.kec?.prov[p]; if (!o) return;
    Laci.buka("Status 72 jam", `<span translate="no">${esc(namaProv(p))}</span>`, `${pilT(Math.max(...o.t))} Deteksi Centurisk97`,
      `${kvs(...o.t.map((t, j) => kot(lbl3(j), pilT(t), "")))}${o.t.map((t, j) => t ? `<p class="fnd"><b>${lbl3(j)}</b>: ${ringkasN(o.n[j])}</p>` : "").join("")}
      <p class="fnd">Sumber: Deteksi Centurisk97 dari prakiraan model (Open-Meteo), bukan peringatan resmi BMKG. ${AMBANG_PIL()}. Diperbarui ${jamWIB(S.kec.dibuat)}.</p>`); }

  /* ---------- rincian kecamatan, gelombang, sarana, siklon ---------- */
  const rowKec = i => { const r = S.kecBaris?.get(i); return r; };
  /* bahaya yang memicu tingkat pada hari d: ambang hujan, embusan, gelombang, dan peluang hujan lebat dari cuaca_kec.json */
  const pemicu = (r, d) => { const A = S.kec.ambang, o = [], h = tingkat(r[4][d] ?? 0, A.hujan_mm), g = tingkat(r[5][d] ?? 0, A.angin_kmj), w = r[6]?.[d] != null ? tingkat(r[6][d] / 10, A.hs_m) : 0;
    if (h) o.push("hujan " + KELAS_HUJAN[h]); if (g) o.push("embusan " + KELAS_ANGIN[g]); if (w) o.push("gelombang " + ["tinggi", "sangat tinggi", "ekstrem"][w - 1]); if (A.p_siaga != null && (r[2][d] ?? 0) >= A.p_siaga) o.push("peluang hujan lebat tinggi"); return o; };
  function laciKec(i) { const r = rowKec(i), n = nmKec(i); if (!r) return; const j = k();
    const hari = r[1].map((t, d) => `<p class="fnd">${pilT(t)} <b>${lbl3(d)}</b>: hujan ${fmt(r[4][d] ?? 0)} mm (peluang 50 mm atau lebih ${fmt(r[2][d] ?? 0)}%, 100 mm atau lebih ${fmt(r[3][d] ?? 0)}%), embusan ${fmt(r[5][d] ?? 0)} km/jam${r[6]?.[d] != null ? `, gelombang ${fmt(r[6][d] / 10)} m` : ""}</p>`).join("");
    Laci.buka("Status 72 jam", `<span translate="no">${esc(n.kec)}</span>`, `${pilT(r[1][j])} <span translate="no">${esc(n.kab)}, ${esc(namaProv(n.p))}</span>`,
      `${kvs(kot("Hujan", fmt(r[4][j] ?? 0), "mm"), kot("Embusan", fmt(r[5][j] ?? 0), "km/jam"), kot("Peluang 50 mm", fmt(r[2][j] ?? 0) + "%", "atau lebih"), r[6]?.[j] != null ? kot("Gelombang", fmt(r[6][j] / 10), "m") : kot("Peluang 100 mm", fmt(r[3][j] ?? 0) + "%", "atau lebih"))}${pemicu(r, j).length ? `<p class="fnd">Pemicu ${kapan3(j)}: ${pemicu(r, j).join(", ")}</p>` : ""}${hari}
      <p class="fnd">Sumber: Deteksi Centurisk97 dari prakiraan model (Open-Meteo), bukan peringatan resmi BMKG. ${AMBANG_PIL()}. Diperbarui ${jamWIB(S.kec.dibuat)}.</p>`); }
  function tipKec(i) { const r = rowKec(i), n = nmKec(i), j = k(); if (!r) return "";
    return PI.kartuTip({judul: `<span translate="no">${esc(n.kec)}</span>`, sub: `<small>${esc(namaT(r[1][j]))}</small>`, stat: [["hujan", fmt(r[4][j] ?? 0) + " mm", "hujan", "#3f7fb8", r[4][j] >= AMB().hujan[0]], ["angin", fmt(r[5][j] ?? 0) + " km/jam", "embusan", "#2b8c86", r[5][j] >= AMB().angin_kmj[0]], ...(r[6]?.[j] != null ? [["ombak", fmt(r[6][j] / 10) + " m", "gelombang", "#16405c", r[6][j] / 10 >= HS()[0]]] : [])]}); }
  const sarInfo = p => p.j === "pelabuhan" ? {nama: S.sar.pelabuhan[p.n][0], prov: S.sar.pelabuhan[p.n][3], ket: S.sar.pelabuhan[p.n][4], v: fmt(p.x / 10) + " m", lb: "gelombang"} : {nama: S.sar.bandara[p.n][1], prov: S.sar.bandara[p.n][4], ket: S.sar.bandara[p.n][0], v: fmt(p.x) + " mm", lb: "hujan"};
  function tipSar(p) { const s = sarInfo(p), j = k(); return PI.kartuTip({judul: `<span translate="no">${esc(s.nama)}</span>`, sub: `<small>${esc(namaT(p["t" + j]))}</small>`, stat: [[p.j === "pelabuhan" ? "ombak" : "hujan", s.v, s.lb, "#16405c", p["t" + j] >= 2], ["angin", fmt(p.g) + " km/jam", "embusan", "#2b8c86", p.g >= AMB().angin_kmj[0]]]}); }
  function laciSar(p) { const s = sarInfo(p);
    Laci.buka(p.j === "pelabuhan" ? "Pelabuhan" : "Bandara", `<span translate="no">${esc(s.nama)}</span>`, `${pilT(p["t" + k()])} <span translate="no">${esc(namaProv(s.prov))}</span>`,
      `${kvs(kot(s.lb === "hujan" ? "Hujan" : "Gelombang", s.v.split(" ")[0], s.v.split(" ")[1]), kot("Embusan", fmt(p.g), "km/jam"))}
      ${[0, 1, 2].map(d => `<p class="fnd">${pilT(p["t" + d])} <b>${lbl3(d)}</b></p>`).join("")}<p class="fnd">Angka tertinggi dalam 72 jam. Sumber: Deteksi Centurisk97 dari prakiraan model; sarana dari data terbuka. Bukan peringatan resmi.</p>`); }
  function tipGel(p) { const r = S.gel.titik[p.n]; return PI.kartuTip({judul: `<span translate="no">${esc(r[3] || namaProv(r[2]))}</span>`, sub: `<small>${esc(namaT(p.t))}</small>`, stat: [["ombak", fmt(p.hs / 10) + " m", "gelombang tertinggi", "#16405c", p.t >= 2]]}); }
  function laciSik(id) { const s = S.sik.aktif.find(x => x.id === id); if (!s) return;
    Laci.buka("Siklon tropis", `<span translate="no">${esc(s.nama || s.id)}</span>`, `<span translate="no">${esc(s.kategori || "")}</span>`,
      `${kvs(s.angin_kt != null && kot("Angin", fmt(kt(s.angin_kt)), "km/jam"), s.tekanan_hpa != null && kot("Tekanan", fmt(s.tekanan_hpa), "hPa"))}
      ${s.jma ? `<p class="fnd">JMA: ${[s.jma.tekanan_hpa != null && `tekanan ${fmt(s.jma.tekanan_hpa)} hPa`, s.jma.angin_kt != null && `angin ${fmt(kt(s.jma.angin_kt))} km/jam`, s.jma.embusan_kt != null && `embusan ${fmt(kt(s.jma.embusan_kt))} km/jam`].filter(Boolean).join(", ")}. JTWC mengukur angin 1 menit, JMA 10 menit, jadi angkanya wajar berbeda.${s.jma.tautan ? ` <a href="${escUrl(s.jma.tautan)}" target="_blank" rel="noopener">Lihat JMA</a>` : ""}</p>` : ""}
      <p class="fnd">Sumber: <span translate="no">${esc(s.sumber || "")}</span>, dibuat ${jamWIB(S.sik.dibuat)}${s.tautan ? `. <a href="${escUrl(s.tautan)}" target="_blank" rel="noopener">Lihat sumber</a>` : ""}</p>`); }

  /* ---------- interaksi peta ---------- */
  const lapisAktif = () => [ID.sikT, ID.sar, ID.gel, ID.kec].filter(id => peta.getLayer(id) && peta.getLayoutProperty(id, "visibility") === "visible");
  function hover(e) { if (!PI) return false; const st = S.mode === "status", L = lapisAktif(); if (!L.length) return st;
    const f = peta.queryRenderedFeatures(e.point, {layers: L})[0]; peta.getCanvas().style.cursor = f ? "pointer" : "";
    if (!f) { if (st) PI.sembunyiTip(); return st; }
    const p = f.properties, h = f.layer.id === ID.kec ? tipKec(p.i) : f.layer.id === ID.sar ? tipSar(p) : f.layer.id === ID.gel ? tipGel(p)
      : PI.kartuTip({judul: `<span translate="no">${esc(S.sik.aktif.find(x => x.id === p.id)?.nama || p.id)}</span>`, sub: `<small>${p.jenis === "amatan" ? "posisi amatan" : "prakiraan"}</small>`, stat: [["angin", fmt(kt(p.kt)) + " km/jam", "angin", "#7a1f2b", true], ...(S.sik.aktif.find(x => x.id === p.id)?.jma?.angin_kt != null && p.jenis === "amatan" ? [["angin", fmt(kt(S.sik.aktif.find(x => x.id === p.id).jma.angin_kt)) + " km/jam", "angin JMA, 10 menit", "#6b7280"]] : [])]});
    PI.tampilTip(h, e.originalEvent); return true; }
  function klik(e) { const L = lapisAktif(); if (!L.length) return false; const f = peta.queryRenderedFeatures(e.point, {layers: L})[0]; if (!f) return false;
    const p = f.properties; S.pilih = null; renderCrumb();
    if (f.layer.id === ID.kec) laciKec(p.i); else if (f.layer.id === ID.sar) laciSar(p); else if (f.layer.id === ID.sikT) laciSik(p.id);
    else { const r = S.gel.titik[p.n]; Laci.buka("Gelombang", `<span translate="no">${esc(r[3] || namaProv(r[2]))}</span>`, `${pilT(p.t)} <span translate="no">${esc(namaProv(r[2]))}</span>`,
      `${kvs(kot("Tertinggi", fmt(p.hs / 10), "m"))}<p class="fnd">Tertinggi dalam sehari. Sumber: Open-Meteo Marine (model), bukan peringatan BMKG Maritim.</p>`); }
    return true; }

  /* ---------- legenda ---------- */
  function legenda() { let h = "";
    if (S.mode === "status" && ada.kec()) h += `<div class="lbl">Status 72 jam (deteksi Centurisk97, ${AMBANG_PIL().toLowerCase()})</div><div class="leg" style="margin:4px 0 8px">${[1, 2, 3].map(t => `<span><i class="sw" style="background:${warnaT(t)}"></i>${namaT(t)}</span>`).join("")}</div>`;
    if (lihat("s-sik") && ada.sik()) h += `<div class="lbl">Siklon tropis</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw" style="background:#7a1f2b"></i>Lintasan amatan</span><span><i class="sw" style="background:#fff;border:2px solid #7a1f2b"></i>Prakiraan</span></div>`;
    return h; }

  return {k, ada, pasang, segarkan, kontrol, modeBerubah, tabPanel, barisPanel, klikBaris, fokusProv, laciProv, hover, klik, legenda, urutProv, ringkasN};
})();
