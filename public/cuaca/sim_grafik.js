"use strict";
/* sim_grafik.js: kartu grafik 72 jam untuk satu titik (klik peta, pelabuhan, atau bandara): hujan, embusan, gelombang.
   Garis putus = prakiraan tanpa skenario (hanya tampil bila skenario aktif). Klik atau geser di grafik memindahkan waktu. */
(() => {
  const C = window.SimCtx; if (!C) return;
  const S = C.S, f0 = C.f0, f1 = C.f1;
  const G = {pil: null, seri: null}, WARNA = ["#5a9e74", "#e3b94e", "#c9503a"], NAMA = ["Buka", "Terganggu", "Tutup"];
  const gelap = () => C.gelap();
  const DEF = [
    ["r", "r0", "Hujan", "mm/jam", "#3f7fb8", 1, 10, ""],
    ["g", "g0", "Embusan", "km/jam", "#d0702f", 40, 54, ""],
    ["hs", "hs0", "Gelombang", "m", "#1f8f9e", 1, 2.5, ""],
  ];
  function pasangEl() {
    if ($("#grafik")) return;
    const a = document.createElement("aside"); a.className = "card simgraf"; a.id = "grafik"; a.setAttribute("aria-label", "Grafik 72 jam"); a.hidden = true;
    a.innerHTML = `<div class="sg-hd"><div><h2 id="sgJudul"></h2><span class="sc-pil" id="sgJenis"></span></div><button type="button" class="sg-x" id="sgX" aria-label="Tutup grafik"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <div id="sgStatus"></div><div id="sgIsi"></div><p class="sc-cat" id="sgCat"></p>`;
    document.querySelector("main .page").appendChild(a); new ResizeObserver(es => { const w = Math.round(es[0].contentRect.width); if (w && w !== G.w) { G.w = w; garis(); } }).observe(a);
    $("#sgX").onclick = () => { G.pil = null; a.hidden = true; const p = C.peta(); p?.getLayer("sg-titik") && p.setLayoutProperty("sg-titik", "visibility", "none"); };
    a.addEventListener("pointerdown", e => { const cv = e.target.closest("canvas"); if (!cv) return; const mv = ev => { const r = cv.getBoundingClientRect(), x = Math.max(0, Math.min(1, (ev.clientX - r.left - 30) / (r.width - 38))); S.main = false; C.berhenti(); S.t = Math.round(x * (S.n - 1) * 4) / 4; C.jadwal(true); };
      mv(e); cv.setPointerCapture(e.pointerId); cv.onpointermove = mv; cv.onpointerup = () => { cv.onpointermove = null; }; });
  }
  function titikPeta() {
    const p = C.peta(); if (!p) return;
    if (!p.getSource("sg-titik")) p.addSource("sg-titik", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    if (!p.getLayer("sg-titik")) p.addLayer({id: "sg-titik", type: "circle", source: "sg-titik", paint: {"circle-radius": 8, "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 3, "circle-stroke-color": "#e07a1f"}});
    p.setLayoutProperty("sg-titik", "visibility", "visible"); p.getSource("sg-titik").setData({type: "Feature", geometry: {type: "Point", coordinates: [G.pil.lon, G.pil.lat]}, properties: {}});
  }
  function pilih(pil) {
    pasangEl(); G.pil = pil; $("#grafik").hidden = false; titikPeta();
    $("#sgJudul").textContent = pil.nama; const j = $("#sgJenis"); j.textContent = pil.jenis; j.style.setProperty("--w", "#5b6b86");
    segar();
  }
  function segar() {
    if (!G.pil || !window.SimSk) return;
    const pl = G.pil, ti = window.SimSk.terdekatTitik(pl.lat, pl.lon); G.seri = window.SimSk.seri(pl.lat, pl.lon, ti, pl.idx);
    const s = G.seri, ada = window.SimSk.adaSkenario(), rows = DEF.filter(d => s[d[0]] && s[d[0]].some(v => v != null));
    $("#sgStatus").innerHTML = s.st ? `<div class="sg-st" aria-label="Status per jam">${s.st.map((v, h) => `<i style="background:${v < 0 ? "var(--line)" : WARNA[v]}" title="${esc(NAMA[Math.max(v, 0)])}"></i>`).join("")}</div><div class="sg-lg">${[0, 1, 2].map(i => `<span><i style="background:${WARNA[i]}"></i>${NAMA[i]}</span>`).join("")}</div>` : "";
    $("#sgIsi").innerHTML = rows.length ? rows.map(d => `<div class="sg-b"><div class="sg-t"><b>${d[2]}${d[0] === "hs" && window.SimSk?.K.vor ? " (perkiraan atas)" : ""}</b><span>${d[3]}</span><em id="sgN-${d[0]}"></em></div><canvas data-k="${d[0]}"></canvas></div>`).join("") : `<div class="sc-kosong">Titik ini di luar medan prakiraan.</div>`;
    $("#sgCat").textContent = ada ? "Garis putus adalah prakiraan tanpa skenario." : (ti < 0 ? "Tidak ada titik gelombang dalam 150 km." : "");
    garis();
  }
  function garis() {
    if (!G.pil || !G.seri) return;
    const dpr = Math.min(2, devicePixelRatio || 1), s = G.seri, ada = window.SimSk.adaSkenario(), ink = gelap() ? "#e8eef8" : "#10213d", ink2 = gelap() ? "#9fb0c8" : "#52627d", grid = gelap() ? "rgba(255,255,255,.1)" : "rgba(16,33,61,.1)";
    const teks = [];
    document.querySelectorAll("#sgIsi canvas").forEach(cv => {
      const d = DEF.find(x => x[0] === cv.dataset.k), w = G.w, h = 96; if (!w) return;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = h * dpr; }
      const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
      const A = s[d[0]], A0 = s[d[1]], L = 30, R = 8, T = 6, B = 18, n = s.n, X = i => L + (w - L - R) * i / (n - 1);
      let mx = d[5]; for (const a of [A, ada ? A0 : []]) for (const v of a) if (v != null && v > mx) mx = v; mx = Math.max(mx, d[6] * 1.05); const Y = v => T + (h - T - B) * (1 - v / mx);
      c.font = "10px Inter, sans-serif"; c.fillStyle = ink2; c.strokeStyle = grid; c.lineWidth = 1; c.textAlign = "right";
      for (const v of [0, mx / 2, mx]) { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(w - R, Y(v)); c.stroke(); c.fillText(fmt(Math.round(v * 10) / 10), L - 4, Y(v) + 3); }
      c.textAlign = "center"; for (let i = 0; i < n; i += 12) { const dt = new Date(S.jam0 + i * 36e5 + 7 * 36e5); c.fillText(String(dt.getUTCHours()).padStart(2, "0") + ".00", X(i), h - 4); }
      c.strokeStyle = "#c9503a"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(L, Y(d[6])); c.lineTo(w - R, Y(d[6])); c.stroke(); c.setLineDash([]);
      const jalur = (a, col, dash, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.setLineDash(dash); c.beginPath(); let mulai = true; a.forEach((v, i) => { if (v == null) { mulai = true; return; } mulai ? c.moveTo(X(i), Y(v)) : c.lineTo(X(i), Y(v)); mulai = false; }); c.stroke(); c.setLineDash([]); };
      if (ada) jalur(A0, ink2, [4, 3], 1.3);
      if (d[0] === "r") { c.fillStyle = d[4]; A.forEach((v, i) => { if (v) c.fillRect(X(i) - 1.5, Y(v), 3, Y(0) - Y(v)); }); } else jalur(A, d[4], [], 2);
      const t = Math.max(0, Math.min(n - 1, S.t)); c.strokeStyle = ink; c.lineWidth = 1.2; c.beginPath(); c.moveTo(X(t), T); c.lineTo(X(t), h - B); c.stroke();
      teks.push([d[0], A[Math.round(t)], d[3]]);
    });
    for (const [k, v, sat] of teks) { const e = $("#sgN-" + k); if (e) e.textContent = v == null ? "" : fmt(Math.round(v * 10) / 10) + " " + sat; } /* tulis teks sesudah semua kanvas */
  }
  window.SimGraf = {pilih, segar, garis};
})();
