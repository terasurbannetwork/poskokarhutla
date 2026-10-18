"use strict";
/* sim_layar.js: layar simulasi cuaca 72 jam. Data: /banjir/data/cuaca_{medan,gelombang,siklon,sarana}.json (kontrak sesi cuaca).
   Hujan dan embusan = sumber canvas MapLibre (kena proyeksi peta), angin = partikel di canvas sendiri, gelombang/siklon/sarana = GeoJSON.
   Semua yang berat jalan di rAF; klik hanya mengubah state lalu menjadwalkan satu gambar ulang. Tanpa data = keadaan kosong, tidak ada karangan. */
(() => {
  const SC = window.SimCuaca, DATA = "/banjir/data/";
  const bacaLokal = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const temaAwal = bacaLokal("pb-tema", null); if (temaAwal) document.documentElement.dataset.theme = temaAwal;
  const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
  const DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
  const muatJson = u => fetch(u, {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null);
  const f1 = n => fmt(Math.round(n * 10) / 10), f0 = n => fmt(Math.round(n));
  const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const wib = ms => new Date(ms + 7 * 36e5); /* getUTC* pada hasil ini = jam dinding WIB */
  const pad = n => String(n).padStart(2, "0");
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const teksWaktu = ms => { const d = wib(ms); return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BLN[d.getUTCMonth()]} · ${pad(d.getUTCHours())}.${pad(d.getUTCMinutes())} WIB`; };
  const rgb = k => `rgb(${k[1]},${k[2]},${k[3]})`;

  const S = {M: null, G: null, K: null, A: null, t: 0, main: false, laju: 3, hidup: new Set(["hujan", "angin", "sel"]), tiga: false, fr: null, jam0: 0, n: 72};
  const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
  const med = () => S.Msk || S.M; /* medan yang dipakai: skenario bila ada, prakiraan bila tidak */
  let peta = null, popup = null, sudah = false, gambarT = -1, rAFmenunggu = false;

  /* ---------------------------------------------------------------- panel */
  const LAPIS = [
    ["hujan", "Hujan", "#4a90d9", () => !!S.M], ["angin", "Angin", "#7d8ca3", () => !!S.M], ["sel", "Sel badai", "#7a5ad0", () => !!S.M], ["embus", "Embusan", "#e58a45", () => !!S.M],
    ["gelombang", "Gelombang", "#2aa7b8", () => !!S.G?.titik?.length], ["siklon", "Siklon", "#c9503a", () => !!S.K?.aktif?.length], ["sarana", "Pelabuhan dan bandara", "#5b6b86", () => !!S.A],
  ];
  function panel() {
    const isi = $("#isi");
    if (!S.M && !S.G) { isi.innerHTML = `<div class="sc-kosong"><b>Medan prakiraan belum tersedia.</b><br>Angka simulasi belum bisa ditampilkan.</div>`; return; }
    const t0 = S.jam0, hari = [];
    for (let h = 0; h < S.n; h++) { const d = wib(t0 + h * 36e5); if (h === 0 || d.getUTCHours() === 0) hari.push([h, `${HARI[d.getUTCDay()]} ${d.getUTCDate()}`]); }
    isi.innerHTML = `<div class="sc-tab" id="sTab" role="group" aria-label="Isi panel"><button type="button" data-t="waktu" aria-pressed="true">Waktu</button><button type="button" data-t="skenario" aria-pressed="false">Skenario</button><button type="button" data-t="dampak" aria-pressed="false">Dampak</button></div>
      <div id="t-waktu">
      <div class="sc-jam" id="jam"></div>
      <div class="sc-bar"><button class="sc-main" id="main" aria-label="Putar atau jeda"></button><input id="geser" type="range" min="0" max="${S.n - 1}" step="0.25" value="0" aria-label="Jam prakiraan"></div>
      <div class="sc-hari" id="hari">${hari.slice(0, 3).map(([h, n]) => `<button type="button" data-h="${h}" aria-pressed="false">${n}</button>`).join("")}</div>
      <div class="sc-hari" id="laju" style="grid-template-columns:repeat(3,1fr)">${[[1, "1 jam/dtk"], [3, "3 jam/dtk"], [6, "6 jam/dtk"]].map(([v, n]) => `<button type="button" data-v="${v}" aria-pressed="${v === S.laju}">${n}</button>`).join("")}</div>
      <div class="sc-cip" id="cip">${LAPIS.filter(l => l[3]()).map(([id, n, w]) => `<button type="button" data-l="${id}" style="--w:${w}" aria-pressed="${S.hidup.has(id)}"><i></i>${n}</button>`).join("")}
        <button type="button" id="b3d" style="--w:#5b6b86" aria-pressed="false"><i></i>Tampilan 3D</button></div>
      <p class="sc-kal" id="kv"></p>
      <p class="sc-sumber" id="sumber"></p></div><div id="t-skenario" hidden></div><div id="t-dampak" hidden></div>`;
    $("#main").innerHTML = ikon(false);
    $("#main").onclick = () => { S.main = !S.main; if (S.main && S.t >= S.n - 1) S.t = 0; $("#main").innerHTML = ikon(S.main); jadwal(); };
    $("#geser").oninput = e => { S.t = +e.target.value; S.main = false; $("#main").innerHTML = ikon(false); jadwal(); };
    $("#hari").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.t = +b.dataset.h; jadwal(); };
    $("#laju").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.laju = +b.dataset.v; [...$("#laju").children].forEach(x => x.setAttribute("aria-pressed", x === b)); };
    $("#cip").onclick = e => { const b = e.target.closest("button"); if (!b) return;
      if (b.id === "b3d") { S.tiga = !S.tiga; b.setAttribute("aria-pressed", S.tiga); tigaD(); return; }
      const id = b.dataset.l; S.hidup.has(id) ? S.hidup.delete(id) : S.hidup.add(id); b.setAttribute("aria-pressed", S.hidup.has(id)); nanti(() => { tampakLapis(); legenda(); jadwal(true); }); };
    $("#sumber").innerHTML = ringkasSumber();
  }
  const berhenti = () => { S.main = false; const b = $("#main"); if (b) b.innerHTML = ikon(false); };
  const ikon = main => main ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>`;
  function ringkasSumber() {
    const s = [], m = S.M, dibuat = m?.dibuat || S.G?.dibuat;
    s.push(`Prakiraan model${m?.sumber ? " (" + esc(m.sumber) + ")" : ""}${dibuat ? ", dibuat " + esc(jamWIB(dibuat)) : ""}. Ini bukan peringatan resmi; status resmi ada di BMKG.`);
    if (S.K && !S.K.aktif?.length) s.push(`Tidak ada siklon aktif pada data yang masuk${S.K.dibuat ? " " + esc(jamWIB(S.K.dibuat)) : ""}.`);
    return s.join(" ");
  }

  /* ---------------------------------------------------------------- legenda */
  function legenda() {
    const sw = (k, tek) => `<span><i class="sw" style="background:${rgb(k)}"></i>${tek}</span>`, h = SC.RAMP_HUJAN, e = SC.RAMP_EMBUS, g = SC.RAMP_HS, p = [];
    if (S.hidup.has("hujan") && S.M) p.push(`<div><div class="lbl">Hujan (mm/jam)</div><div class="leg row">${h.map((k, i) => sw(k, h[i + 1] ? `${f0(k[0] < 1 ? 0.1 : k[0])}–${f0(h[i + 1][0])}`.replace("0–", "0,1–") : `≥ ${f0(k[0])}`)).join("")}</div></div>`);
    if (S.hidup.has("embus") && S.M) p.push(`<div><div class="lbl">Embusan (km/jam)</div><div class="leg row">${e.map((k, i) => sw(k, e[i + 1] ? `${f0(k[0])}–${f0(e[i + 1][0])}` : `≥ ${f0(k[0])}`)).join("")}</div></div>`);
    if (S.hidup.has("gelombang") && S.G) p.push(`<div><div class="lbl">Tinggi gelombang (m)</div><div class="leg row">${g.map((k, i) => sw(k, g[i + 1] ? `${fmt(k[0])}–${fmt(g[i + 1][0])}` : `≥ ${fmt(k[0])}`)).join("")}</div></div>`);
    if (S.hidup.has("angin") && S.M) p.push(`<div><div class="lbl">Angin</div><div class="leg row"><span>Garis bergerak mengikuti arah dan kecepatan angin</span></div></div>`);
    if (S.hidup.has("sel") && S.M) p.push(`<div><div class="lbl">Sel badai (hujan, mm/jam)</div><div class="leg row"><span><i class="sw" style="background:#7a5ad0"></i>mulai batas</span><span><i class="sw" style="background:#c0409a"></i>≥ 20</span><span><i class="sw" style="background:#d8283c"></i>≥ 50</span><span>tinggi kolom hanya skala tampilan</span></div></div>`);
    if (window.SimSk?.K.sik.on) p.push(`<div><div class="lbl">Siklon skenario (cincin angin)</div><div class="leg row"><span><i class="sw" style="background:none;border:2px solid #e3b94e"></i>34 knot</span><span><i class="sw" style="background:none;border:2px solid #e58a45"></i>50 knot</span><span><i class="sw" style="background:none;border:2px solid #c9503a"></i>64 knot</span></div></div>`);
    if (S.hidup.has("siklon") && S.K?.aktif?.length) p.push(`<div><div class="lbl">Siklon</div><div class="leg row"><span><i class="sw" style="background:#c9503a"></i>jejak amatan</span><span><i class="sw" style="background:none;border:2px dashed #c9503a"></i>prakiraan</span></div></div>`);
    if (S.hidup.has("sarana") && S.A) p.push(`<div><div class="lbl">Sarana</div><div class="leg row"><span><i class="sw dot" style="background:#5b6b86"></i>pelabuhan</span><span><i class="sw dot" style="background:#e3b94e"></i>bandara</span></div></div>`);
    $("#legenda").innerHTML = `<div class="sc-lg">${p.join("")}</div>`;
    $("#dok").style.display = p.length ? "" : "none";
  }

  /* ---------------------------------------------------------------- peta */
  const cvHujan = document.createElement("canvas"), cvEmbus = document.createElement("canvas");
  let ctxH, ctxE, piksH, piksE, dimC = null;
  function siapCanvas() {
    const m = S.M; if (!m || dimC) return;
    const sk = 6, W = (m.nx - 1) * sk + 1, H = (m.ny - 1) * sk + 1; dimC = {sk, W, H};
    for (const c of [cvHujan, cvEmbus]) { c.width = W; c.height = H; }
    ctxH = cvHujan.getContext("2d"); ctxE = cvEmbus.getContext("2d"); piksH = ctxH.createImageData(W, H); piksE = ctxE.createImageData(W, H);
  }
  const sudut = () => { const m = S.M, la = m.lat0 + (m.ny - 1) * m.d, lo = m.lon0 + (m.nx - 1) * m.d; return [[m.lon0, la], [lo, la], [lo, m.lat0], [m.lon0, m.lat0]]; };

  function pasang() { /* dipanggil tiap style.load (ganti tema menghapus semua lapisan) */
    if (peta.getLayer("bayang")) return;
    const m = peta, atas = (m.getStyle().layers.find(l => l.type === "symbol") || {}).id;
    for (const id of ["dem", "dem3d"]) if (!m.getSource(id)) m.addSource(id, {type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 12}); /* dua sumber: peringatan MapLibre bila bayang dan 3D berbagi satu */
    m.addLayer({id: "bayang", type: "hillshade", source: "dem", paint: {"hillshade-exaggeration": .25, "hillshade-shadow-color": gelap() ? "#000" : "#3a4a5e", "hillshade-highlight-color": gelap() ? "#556" : "#fff"}}, atas);
    if (S.M) {
      siapCanvas();
      for (const [id, cv] of [["hujan", cvHujan], ["embus", cvEmbus]]) {
        m.addSource("c-" + id, {type: "canvas", canvas: cv, coordinates: sudut(), animate: false});
        m.addLayer({id: "c-" + id, type: "raster", source: "c-" + id, paint: {"raster-opacity": 1, "raster-fade-duration": 0, "raster-resampling": "linear"}}, atas);
      }
    }
    if (S.G?.titik?.length) {
      m.addSource("gel", {type: "geojson", data: {type: "FeatureCollection", features: []}});
      const wr = ["step", ["get", "hs"], rgb(SC.RAMP_HS[0]), 1.25, rgb(SC.RAMP_HS[1]), 2.5, rgb(SC.RAMP_HS[2]), 4, rgb(SC.RAMP_HS[3]), 6, rgb(SC.RAMP_HS[4])];
      m.addLayer({id: "gel", type: "circle", source: "gel", paint: {"circle-color": wr, "circle-opacity": .9, "circle-stroke-width": 1.5, "circle-stroke-color": gelap() ? "#0b1220" : "#fff",
        "circle-radius": ["interpolate", ["linear"], ["get", "hs"], 0, 4, 2.5, 8, 6, 14]}});
      m.addLayer({id: "gel-d", type: "circle", source: "gel", paint: {"circle-color": "rgba(0,0,0,0)", "circle-stroke-color": wr, "circle-stroke-width": 1.6, "circle-radius": 8, "circle-stroke-opacity": 0}});
      m.addLayer({id: "gel-t", type: "symbol", source: "gel", minzoom: 5, layout: {"text-field": ["get", "lbl"], "text-size": 11, "text-font": ["Noto Sans Bold"], "text-offset": [0, 1.7], "text-allow-overlap": false},
        paint: {"text-color": gelap() ? "#e8eef8" : "#10213d", "text-halo-color": gelap() ? "#0b1220" : "#fff", "text-halo-width": 1.4}});
    }
    if (S.K?.aktif?.length) siklonLapis();
    if (S.A) {
      const fitur = [...(S.A.pelabuhan || []).map(([nama, la, lo, prov]) => ({type: "Feature", geometry: {type: "Point", coordinates: [lo, la]}, properties: {nama, prov, j: "Pelabuhan"}})),
        ...(S.A.bandara || []).map(([kode, nama, la, lo, prov]) => ({type: "Feature", geometry: {type: "Point", coordinates: [lo, la]}, properties: {nama: `${nama} (${kode})`, prov, j: "Bandara"}}))];
      m.addSource("sar", {type: "geojson", data: {type: "FeatureCollection", features: fitur}});
      m.addLayer({id: "sar", type: "circle", source: "sar", minzoom: 4.5, paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4.5, 3, 9, 6], "circle-color": ["match", ["get", "j"], "Bandara", "#e3b94e", "#5b6b86"], "circle-stroke-width": 1.5, "circle-stroke-color": gelap() ? "#0b1220" : "#fff"}});
    }
    window.SimSk?.pasang(m); tampakLapis(); sudah = true; $("#muat").classList.add("hilang"); gambarT = -1; jadwal(true); /* siap begitu gaya terpasang; tile yang lambat tidak menahan layar */
  }
  function tampakLapis() {
    const vis = (id, on) => { if (peta.getLayer(id)) peta.setLayoutProperty(id, "visibility", on ? "visible" : "none"); }, h = S.hidup;
    vis("c-hujan", h.has("hujan")); vis("c-embus", h.has("embus")); vis("gel", h.has("gelombang")); vis("gel-d", h.has("gelombang")); vis("gel-t", h.has("gelombang")); vis("sar", h.has("sarana"));
    for (const id of ["sik-kerucut", "sik-garis", "sik-ramal", "sik-kini", "sik-t"]) vis(id, h.has("siklon"));
    window.SimSk?.tampak(); cvAngin.style.display = h.has("angin") && S.M ? "" : "none";
    if (!h.has("angin")) cx.clearRect(0, 0, cvAngin.width, cvAngin.height);
  }

  /* siklon: jejak, kerucut, dan posisi pada jam yang dipilih (interpolasi linear antar titik lintasan; di luar rentang waktu tidak digambar) */
  function siklonLapis() {
    const m = peta, ak = S.K.aktif, gar = [], ram = [], ker = [], tit = [];
    S.KL = ak.map(c => ({nama: c.nama, L: (c.lintasan || []).map(p => [Date.parse(p[0]), ...p.slice(1)]).filter(p => !isNaN(p[0])).sort((a, b) => a[0] - b[0])})); /* urut sekali, bukan tiap bingkai */
    for (const c of ak) { const L = c.lintasan || [], am = L.filter(p => p[4] === "amatan"), pr = L.filter(p => p[4] !== "amatan");
      if (am.length > 1) gar.push({type: "Feature", geometry: {type: "LineString", coordinates: am.map(p => [p[2], p[1]])}, properties: {}});
      const sam = am.length ? [am[am.length - 1], ...pr] : pr;
      if (sam.length > 1) ram.push({type: "Feature", geometry: {type: "LineString", coordinates: sam.map(p => [p[2], p[1]])}, properties: {}});
      if (Array.isArray(c.kerucut_km) && c.kerucut_km.length === L.length) L.forEach((p, i) => { if (c.kerucut_km[i] > 0) ker.push({type: "Feature", geometry: {type: "Polygon", coordinates: [SC.lingkaran(p[1], p[2], c.kerucut_km[i])]}, properties: {}}); });
      L.forEach(p => tit.push({type: "Feature", geometry: {type: "Point", coordinates: [p[2], p[1]]}, properties: {kt: p[3], jenis: p[4], nama: c.nama}})); }
    for (const [id, f] of [["sik-kerucut", ker], ["sik-garis", gar], ["sik-ramal", ram]]) m.addSource(id, {type: "geojson", data: {type: "FeatureCollection", features: f}});
    m.addSource("sik-kini", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    m.addLayer({id: "sik-kerucut", type: "fill", source: "sik-kerucut", paint: {"fill-color": "#c9503a", "fill-opacity": .1}});
    m.addLayer({id: "sik-garis", type: "line", source: "sik-garis", paint: {"line-color": "#c9503a", "line-width": 3}});
    m.addLayer({id: "sik-ramal", type: "line", source: "sik-ramal", paint: {"line-color": "#c9503a", "line-width": 2.5, "line-dasharray": [2, 2]}});
    m.addLayer({id: "sik-kini", type: "circle", source: "sik-kini", paint: {"circle-radius": 9, "circle-color": "#c9503a", "circle-stroke-width": 3, "circle-stroke-color": "#fff"}});
    m.addLayer({id: "sik-t", type: "symbol", source: "sik-kini", layout: {"text-field": ["get", "lbl"], "text-size": 12, "text-font": ["Noto Sans Bold"], "text-offset": [0, 1.9]},
      paint: {"text-color": gelap() ? "#ffd1c8" : "#8a2a1a", "text-halo-color": gelap() ? "#0b1220" : "#fff", "text-halo-width": 1.5}});
  }
  let sikJam = -1;
  function siklonKini() {
    const o = peta.getSource("sik-kini"); if (!o) return;
    const kk = Math.round(S.t * 2); if (kk === sikJam) return; sikJam = kk; /* kunci setengah jam */
    const ms = S.jam0 + S.t * 36e5, f = [];
    for (const {nama, L} of S.KL || []) {
      if (L.length < 2 || ms < L[0][0] || ms > L[L.length - 1][0]) continue;
      let i = 0; while (i < L.length - 2 && L[i + 1][0] < ms) i++;
      const a = L[i], b = L[i + 1], w = (ms - a[0]) / (b[0] - a[0] || 1), mix = (x, y) => x + (y - x) * w;
      f.push({type: "Feature", geometry: {type: "Point", coordinates: [mix(a[2], b[2]), mix(a[1], b[1])]}, properties: {lbl: `${nama} · ${f0(mix(a[3], b[3]))} knot`}}); }
    o.setData({type: "FeatureCollection", features: f});
  }
  let gelJam = -1;
  function gelombangKini() { /* hanya saat jam bulat berubah (atau dipaksa): 296 titik ditulis ulang */
    const o = peta.getSource("gel"); if (!o) return;
    const i = Math.max(0, Math.min(S.n - 1, Math.round(S.t))), ft = [];
    if (i === gelJam) return; gelJam = i;
    S.G.titik.forEach((p, k) => { let hs;
      if (S.HS) { hs = S.HS[k][i]; if (isNaN(hs)) return; }
      else { if (p[4]?.[i] == null) return; hs = p[4][i] / 10; }
      ft.push({type: "Feature", geometry: {type: "Point", coordinates: [p[1], p[0]]}, properties: {hs, lbl: f1(hs) + " m", nama: p[3] || "", prov: p[2] || "", maks: (p[6] ?? 0) / 10, k}}); });
    o.setData({type: "FeatureCollection", features: ft});
  }
  /* ---------------------------------------------------------------- gambar per jadwal (sekali per frame) */
  function jadwal(paksa) { if (paksa) { gambarT = -1; gelJam = -1; kvJam = -1; sikJam = -1; } if (rAFmenunggu) return; rAFmenunggu = true; requestAnimationFrame(gambar); }
  let terakhir = 0, kvJam = -1;
  function gambar(now) {
    rAFmenunggu = false; if (!sudah) return;
    const dt = Math.min(.1, (now - (terakhir || now)) / 1000); terakhir = now;
    if (S.main) { S.t += dt * S.laju; if (S.t >= S.n - 1) { S.t = S.n - 1; S.main = false; const b = $("#main"); if (b) b.innerHTML = ikon(false); } }
    if (Math.abs(S.t - gambarT) >= .05 || gambarT < 0) { gambarT = S.t; bingkaiBaru(); }
    if (S.main) { rAFmenunggu = true; requestAnimationFrame(gambar); } else terakhir = 0;
  }
  function bingkaiBaru() {
    const jam = $("#jam"); if (!jam) return;
    jam.textContent = teksWaktu(S.jam0 + S.t * 36e5); $("#geser").value = S.t;
    [...$("#hari").children].forEach(b => b.setAttribute("aria-pressed", S.t >= +b.dataset.h && S.t < +b.dataset.h + 24));
    if (S.M) {
      S.fr = SC.bingkai(med(), S.t, S.fr);
      if (S.hidup.has("hujan")) { SC.lukis(S.M, S.fr.r, SC.TAB_HUJAN, dimC.sk, piksH.data); ctxH.putImageData(piksH, 0, 0); kesegar("c-hujan"); }
      if (S.hidup.has("embus")) { SC.lukis(S.M, S.fr.g, SC.TAB_EMBUS, dimC.sk, piksE.data); ctxE.putImageData(piksE, 0, 0); kesegar("c-embus"); }
      const jb = Math.max(0, Math.min(S.n - 1, Math.round(S.t)));
      if (jb !== kvJam) { kvJam = jb; /* ringkasan teks hanya saat jam bulat berubah */
        const r = SC.ringkas(S.fr), gm = S.G?.titik?.length ? Math.max(...S.G.titik.map((p, k) => S.HS ? (isNaN(S.HS[k][jb]) ? 0 : S.HS[k][jb]) : (p[4]?.[jb] ?? 0) / 10)) : null;
        $("#kv").textContent = `Pada jam ke-${jb} (${teksWaktu(S.jam0 + jb * 36e5)}) hujan tertinggi ${f1(r.hujan)} mm/jam, embusan ${f0(r.embus)} km/jam${gm != null ? `, gelombang ${f1(gm)} m${S.vorAda ? " (perkiraan atas)" : ""}` : ""}.`; }
    }
    if (S.G) gelombangKini();
    if (S.K?.aktif?.length) siklonKini();
    window.SimSk?.bingkai(S.t); window.SimGraf?.garis();
  }
  function kesegar(id) { const s = peta.getSource(id); if (s) { s.play(); s.pause(); } }

  /* ---------------------------------------------------------------- partikel angin */
  const cvAngin = document.createElement("canvas"); cvAngin.className = "sc-angin"; const cx = cvAngin.getContext("2d");
  const NP = innerWidth < 700 ? 1200 : 3000, P = new Float32Array(NP * 3); /* lon, lat, umur */
  function ukur() { const r = $("#peta").getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cvAngin.width = r.width * d; cvAngin.height = r.height * d; cx.setTransform(d, 0, 0, d, 0, 0); }
  let LB = null, bergerak = false; /* kotak kelahiran partikel: dihitung sekali per bingkai */
  function kotakLahir() { const m = S.M, b = peta.getBounds(); LB = [Math.max(m.lon0, b.getWest()), Math.min(m.lon0 + (m.nx - 1) * m.d, b.getEast()), Math.max(m.lat0, b.getSouth()), Math.min(m.lat0 + (m.ny - 1) * m.d, b.getNorth())]; }
  function lahir(i) {
    const [lo0, lo1, la0, la1] = LB;
    if (lo1 <= lo0 || la1 <= la0) { P[i * 3 + 2] = 1e9; return; }
    P[i * 3] = lo0 + Math.random() * (lo1 - lo0); P[i * 3 + 1] = la0 + Math.random() * (la1 - la0); P[i * 3 + 2] = Math.random() * 90;
  }
  let tAngin = 0;
  let tDen = 0;
  function anginFrame(now) {
    requestAnimationFrame(anginFrame);
    if (sudah && S.G && S.hidup.has("gelombang") && now - tDen > 100 && !bergerak && peta.getLayer("gel-d")) { /* denyut: hanya sifat cat yang diubah (tanpa membangun ulang data), ukuran cincin ikut tinggi gelombang */
      tDen = now; const ph = (now / 1900) % 1, hs = ["get", "hs"];
      peta.setPaintProperty("gel-d", "circle-radius", ["+", ["+", 5, ["*", hs, 2]], ["*", ["+", 4, ["*", hs, 5]], ph]]); peta.setPaintProperty("gel-d", "circle-stroke-opacity", .85 * (1 - ph)); }
    if (!S.M || !S.fr || !S.hidup.has("angin") || !sudah || bergerak) { tAngin = 0; return; }
    kotakLahir(); const dt = Math.min(2.5, (now - (tAngin || now)) / 16.7); tAngin = now;
    const sk = .0047 * Math.pow(2, 4.5 - peta.getZoom()) * dt, W = cvAngin.clientWidth, H = cvAngin.clientHeight;
    cx.globalCompositeOperation = "destination-out"; cx.fillStyle = "rgba(0,0,0,.1)"; cx.fillRect(0, 0, W, H);
    cx.globalCompositeOperation = "source-over"; cx.lineWidth = 1; cx.strokeStyle = gelap() ? "rgba(235,242,255,.85)" : "rgba(16,33,61,.7)"; cx.beginPath();
    const m = S.M, fr = S.fr;
    for (let i = 0; i < NP; i++) {
      let lo = P[i * 3], la = P[i * 3 + 1];
      let u = P[i * 3 + 2] > 100 ? null : SC.cuplik(m, fr.u, lo, la), v = u == null ? null : SC.cuplik(m, fr.v, lo, la);
      if (u == null || v == null) { lahir(i); continue; }
      if (S.vorAt) { const w = S.vorAt(lo, la, S.t); if (w) { u += w[0]; v += w[1]; } }
      const a = peta.project([lo, la]), nl = lo + u * sk / Math.cos(la * Math.PI / 180), nb = la + v * sk, b = peta.project([nl, nb]);
      cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); P[i * 3] = nl; P[i * 3 + 1] = nb; P[i * 3 + 2]++;
    }
    cx.stroke();
  }

  /* ---------------------------------------------------------------- 3D, klik */
  function tigaD() {
    if (S.tiga) { if (!peta.getSource("dem3d")) return; peta.setTerrain({source: "dem3d", exaggeration: 1.6}); peta.easeTo({pitch: 55, duration: 700}); }
    else { peta.setTerrain(null); peta.easeTo({pitch: 0, bearing: 0, duration: 500}); }
  }
  function klik(e) {
    const hit = peta.queryRenderedFeatures(e.point, {layers: ["gel", "sar"].filter(i => peta.getLayer(i))})[0], p = hit ? hit.properties : null, ll = e.lngLat;
    window.SimSk?.setSasaran([ll.lng, ll.lat]);
    if (!window.SimGraf) return;
    if (p && hit.layer.id === "gel") SimGraf.pilih({lat: hit.geometry.coordinates[1], lon: hit.geometry.coordinates[0], nama: p.nama || "Perairan " + (p.prov || ""), jenis: "Gelombang"});
    else if (p) { const i = window.SimSk?.sites().findIndex(s => s.nama === p.nama && Math.abs(s.lat - hit.geometry.coordinates[1]) < 1e-4); SimGraf.pilih({lat: hit.geometry.coordinates[1], lon: hit.geometry.coordinates[0], nama: p.nama, jenis: p.j, idx: i >= 0 ? i : undefined}); }
    else SimGraf.pilih({lat: ll.lat, lon: ll.lng, nama: `${f1(ll.lat)}, ${f1(ll.lng)}`, jenis: "Titik di peta"});
  }

  window.SimCtx = {nanti, legenda, S, SC, peta: () => peta, jadwal, f0, f1, teksWaktu, gelap, berhenti, siap: () => sudah};
  /* ---------------------------------------------------------------- mulai */
  (async () => {
    $("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("pb-tema", JSON.stringify(t)); } catch (e) {}
      if (peta) { peta.setStyle(DASAR(), {diff: false}); peta.once("style.load", pasang); } };
    const [m, g, k, a] = await Promise.all(["medan", "gelombang", "siklon", "sarana"].map(n => muatJson(`${DATA}cuaca_${n}.json`)));
    if (m) { const salah = SC.periksa(m); if (salah) { console.warn("cuaca_medan.json ditolak:", salah); } else S.M = m; }
    S.G = g?.titik?.length ? g : null; S.K = k; S.A = a;
    const ref = S.M || S.G; if (ref) { S.n = ref.n || 72; S.jam0 = Date.parse(ref.t0); if (isNaN(S.jam0)) { S.M = S.G = null; } }
    /* mulai di jam sekarang bila masuk rentang */
    if (S.M || S.G) { const h = (Date.now() - S.jam0) / 36e5; S.t = h > 0 && h < S.n - 1 ? Math.floor(h) : 0; }
    S.data = true; document.dispatchEvent(new Event("sim-data"));
    panel(); legenda(); if (!S.M && !S.G) $("#muat").classList.add("hilang");
    peta = new maplibregl.Map({container: "peta", style: DASAR(), center: [118, -2.4], zoom: window.innerWidth < 700 ? 3.2 : 4.1, minZoom: 3, maxZoom: 11, maxPitch: 70, attributionControl: {compact: true}, dragRotate: false});
    peta.getContainer().appendChild(cvAngin); ukur();
    peta.once("style.load", pasang);
    peta.on("load", () => { sudah = true; $("#muat").classList.add("hilang"); jadwal(true); });
    peta.on("resize", ukur); peta.on("movestart", () => { bergerak = true; cx.clearRect(0, 0, cvAngin.clientWidth, cvAngin.clientHeight); }); peta.on("moveend", () => { bergerak = false; });
    peta.on("click", klik);
    peta.on("mouseenter", "gel", () => peta.getCanvas().style.cursor = "pointer"); peta.on("mouseleave", "gel", () => peta.getCanvas().style.cursor = "");
    for (let i = 0; i < NP; i++) P[i * 3 + 2] = 1e9;
    requestAnimationFrame(anginFrame);
    setTimeout(() => $("#muat").classList.add("hilang"), 8000); /* jaring pengaman bila gaya peta tak merespons */
  })();
})();
