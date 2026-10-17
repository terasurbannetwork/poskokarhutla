/* Timelapse: rangkai N hari citra harian NASA GIBS (VIIRS) jadi GIF animasi di peramban.
   gif.js 0.2.0 (MIT, disalin ke /vendor/gif/, hash sama dengan cdnjs) dimuat malas saat "Buat GIF" pertama; worker dilayani dari origin sendiri.
   Area = tampilan peta saat ini, atau Timelapse.buka({bbox: [barat, selatan, timur, utara], nama}). */
(() => {
  const LAP = {warna: ["VIIRS_NOAA20_CorrectedReflectance_TrueColor", "NASA GIBS / VIIRS NOAA-20"], swir: ["VIIRS_NOAA21_CorrectedReflectance_BandsM11-I2-I1", "NASA GIBS / VIIRS NOAA-21 (SWIR M11-I2-I1)"]};
  const MAXF = 30, bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  let el = null, area = null, mode = "warna", n = 14, gen = 0, url = null, aktif = null, pustaka = null;

  const mx = (lon, z) => (lon + 180) / 360 * 256 * 2 ** z;
  const my = (lat, z) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 256 * 2 ** z;
  const tgl = d => d.toISOString().slice(0, 10), pendek = t => `${+t.slice(8)} ${bulan[+t.slice(5, 7) - 1]} ${t.slice(0, 4)}`;

  /* zoom: cukup tajam untuk LEBAR piksel, maksimum Level9 GIBS, dan tidak lebih dari 16 ubin per frame */
  function rencana(b, LEBAR) {
    let z = Math.min(9, Math.max(1, Math.ceil(Math.log2(LEBAR / (Math.max(.01, b[2] - b[0]) / 360 * 256)))));
    const ubin = z => (Math.floor(mx(b[2], z) / 256) - Math.floor(mx(b[0], z) / 256) + 1) * (Math.floor(my(b[1], z) / 256) - Math.floor(my(b[3], z) / 256) + 1);
    while (z > 1 && ubin(z) > 16) z--;
    const x0 = mx(b[0], z), x1 = mx(b[2], z), y0 = my(b[3], z), y1 = my(b[1], z), w = x1 - x0, h = y1 - y0, k = Math.min(LEBAR / w, LEBAR / h, 4);
    return {z, x0, y0, w, h, W: Math.max(64, Math.round(w * k)), H: Math.max(64, Math.round(h * k))};
  }
  const muatGambar = u => new Promise(r => { const g = new Image(); g.crossOrigin = "anonymous"; g.onload = () => r(g); g.onerror = () => r(null); g.src = u; });

  async function frame(lap, t, P, lbl) {
    const c = document.createElement("canvas"); c.width = P.W; c.height = P.H; const g = c.getContext("2d");
    g.fillStyle = "#1b2430"; g.fillRect(0, 0, P.W, P.H); const k = P.W / P.w, N = 2 ** P.z, jobs = [];
    for (let ty = Math.floor(P.y0 / 256); ty <= Math.floor((P.y0 + P.h) / 256); ty++) for (let tx = Math.floor(P.x0 / 256); tx <= Math.floor((P.x0 + P.w) / 256); tx++) {
      if (ty < 0 || ty >= N) continue;
      jobs.push(muatGambar(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${lap}/default/${t}/GoogleMapsCompatible_Level9/${P.z}/${ty}/${((tx % N) + N) % N}.jpg`).then(im => im && g.drawImage(im, (tx * 256 - P.x0) * k, (ty * 256 - P.y0) * k, 256 * k + .5, 256 * k + .5))); }
    await Promise.all(jobs);
    g.font = "700 " + Math.round(P.W / 22) + "px system-ui,sans-serif"; const s = pendek(t), m = g.measureText(s).width, p = P.W / 60, fh = P.W / 22;
    g.fillStyle = "rgba(19,50,77,.82)"; g.fillRect(p, p, m + p * 2, fh + p * 1.4); g.fillStyle = "#fff"; g.textBaseline = "top"; g.fillText(s, p * 2, p * 1.7);
    g.font = "600 " + Math.round(P.W / 52) + "px system-ui,sans-serif"; const a = lbl, am = g.measureText(a).width;
    g.fillStyle = "rgba(19,50,77,.7)"; g.fillRect(p, P.H - p * 3.2, am + p * 2, P.W / 52 + p * 1.6); g.fillStyle = "#fff"; g.fillText(a, p * 2, P.H - p * 2.6);
    return c;
  }

  async function siapkanGif() {
    pustaka ||= new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = "/vendor/gif/gif.js"; s.onload = ok; s.onerror = () => { pustaka = null; s.remove(); gagal(new Error("gif.js")); }; document.head.appendChild(s); });
    await pustaka;
  }

  const set = (p, teks) => { el.querySelector(".tl-bar i").style.width = Math.round(p * 100) + "%"; if (teks != null) el.querySelector(".tl-s").textContent = teks; };
  /* satu proses = satu id; tutup() menaikkan gen sehingga proses lama berhenti diam-diam dan tak menyentuh tampilan proses baru */
  async function buat() {
    const id = ++gen, b = el.querySelector("[data-buat]"); b.disabled = true;
    const img = el.querySelector(".tl-i"), un = el.querySelector("[data-unduh]"); img.hidden = un.hidden = true; if (url) { URL.revokeObjectURL(url); url = null; }
    try {
      set(0, "Menyiapkan…"); await siapkanGif(); if (id !== gen) return;
      const [lap, atr] = LAP[mode], hari = Math.min(n, MAXF), P = rencana(area.bbox, hari > 14 ? 480 : 640);
      const gif = aktif = new GIF({workers: 2, quality: 10, width: P.W, height: P.H, workerScript: "/vendor/gif/gif.worker.js", repeat: 0});
      for (let i = hari; i >= 1; i--) { if (id !== gen) return;
        const t = tgl(new Date(Date.now() - i * 864e5)); set((hari - i) / hari * .5, `Mengunduh citra ${hari - i + 1}/${hari}…`);
        const c = await frame(lap, t, P, atr); if (id !== gen) return; gif.addFrame(c, {delay: 450, copy: true}); }
      if (hari) gif.frames[hari - 1].delay = 1400;   /* jeda di hari terakhir */
      const bl = await new Promise((ok, gagal) => { gif.on("progress", p => id === gen && set(.5 + p / 2, `Menyusun GIF ${Math.round(p * 100)}%`)); gif.on("finished", ok); gif.on("abort", () => gagal(new Error("batal"))); gif.render(); });
      if (id !== gen) return; url = URL.createObjectURL(bl);
      img.src = url; img.hidden = false; un.href = url; un.download = `timelapse-${mode}-${tgl(new Date())}.gif`; un.hidden = false; set(1, `${hari} hari, ${P.W}×${P.H} px`);
    } catch (e) { if (id === gen) { console.warn("timelapse", e); set(0, "Gagal membuat GIF. Coba lagi."); } }
    finally { if (id === gen) b.disabled = false; }
  }

  function bangun() {
    el = document.createElement("div"); el.id = "tl"; el.hidden = true; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Timelapse citra harian");
    el.innerHTML = `<div class="tl-k box"><div class="tl-h"><b>Timelapse citra harian</b><button type="button" data-x aria-label="Tutup">×</button></div>
      <div class="seg penuh" role="group" aria-label="Jenis citra" data-m><button type="button" data-v="warna" aria-pressed="true">Warna asli</button><button type="button" data-v="swir" aria-pressed="false">SWIR (api aktif)</button></div>
      <div class="seg penuh" role="group" aria-label="Jumlah hari" data-n><button type="button" data-v="7" aria-pressed="false">7 hari</button><button type="button" data-v="14" aria-pressed="true">14 hari</button><button type="button" data-v="30" aria-pressed="false">30 hari</button></div>
      <div class="tl-a"></div><div class="tl-bar"><i></i></div><div class="tl-s"></div><img class="tl-i" alt="Pratinjau timelapse" hidden>
      <div class="tl-b"><button type="button" class="btn pri" data-buat>Buat GIF</button><a class="btn" data-unduh hidden>Unduh GIF</a></div><div class="hs-atr tl-atr"></div></div>`;
    el.onclick = e => { const t = e.target; if (t === el || t.closest("[data-x]")) return tutup(); if (t.closest("[data-buat]")) return buat();
      const s = t.closest(".seg button"); if (!s) return; const g = s.parentNode; g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === s));
      if (g.hasAttribute("data-m")) mode = s.dataset.v; else n = +s.dataset.v; el.querySelector(".tl-atr").textContent = "Citra: " + LAP[mode][1]; };
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !el.hidden) tutup(); });
    document.body.appendChild(el);
  }
  function buka(o = {}) {
    if (!el) bangun();
    if (o.bbox) area = {bbox: o.bbox, nama: o.nama || "area terpilih"};
    else { const b = peta.getBounds(); area = {bbox: [b.getWest(), Math.max(-80, b.getSouth()), b.getEast(), Math.min(80, b.getNorth())], nama: "tampilan peta saat ini"}; }
    const f = x => x.toFixed(2).replace(".", ",");
    el.querySelector(".tl-a").textContent = `Area: ${area.nama} (${f(area.bbox[1])}°–${f(area.bbox[3])}° LS/LU, ${f(area.bbox[0])}°–${f(area.bbox[2])}° BT)`;
    el.querySelector(".tl-atr").textContent = "Citra: " + LAP[mode][1];
    el.querySelector(".tl-i").hidden = el.querySelector("[data-unduh]").hidden = true; el.querySelector("[data-buat]").disabled = false; set(0, ""); el.hidden = false; el.querySelector("[data-buat]").focus();
  }
  function tutup() { gen++; try { aktif?.abort(); } catch (e) {} el.hidden = true; if (url) { URL.revokeObjectURL(url); url = null; } }
  const t = document.getElementById("tlBuka"); if (t) t.onclick = () => buka();
  window.Timelapse = {buka, tutup};
})();
