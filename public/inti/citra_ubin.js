/* Citra satelit Esri sebagai <image> di dalam SVG cetak (renlap_cetak.js, renlap_omc.js): proyeksi Web Mercator piksel global
   (sama dengan scripts/operasi/renlap_pdf.gpx) dan bingkai w x h berpusat (la, lo) dengan fungsi proyeksi P(lat, lon). */
(() => {
  "use strict";
  const TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const rad = d => d * Math.PI / 180;
  const gpx = (la, lo, z) => { const n = 256 * 2 ** z, s = Math.sin(rad(Math.max(-85, Math.min(85, la)))); return [(lo + 180) / 360 * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]; };
  function bingkai(la, lo, z, w, h) {
    const [cx, cy] = gpx(la, lo, z), x0 = cx - w / 2, y0 = cy - h / 2, img = [];
    for (let x = Math.floor(x0 / 256); x <= Math.floor((x0 + w) / 256); x++) for (let y = Math.floor(y0 / 256); y <= Math.floor((y0 + h) / 256); y++)
      img.push(`<image href="${TILE.replace("{z}", z).replace("{y}", y).replace("{x}", x)}" x="${(x * 256 - x0).toFixed(1)}" y="${(y * 256 - y0).toFixed(1)}" width="256.6" height="256.6"/>`);
    return {P: (a, b) => { const [px, py] = gpx(a, b, z); return [px - x0, py - y0]; }, img: img.join("")};
  }
  window.CitraUbin = {gpx, bingkai};
})();
