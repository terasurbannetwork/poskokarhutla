"use strict";
/* Pembangun SVG grafik modul pesisir (string murni; tooltip lewat atribut data-tip yang dibaca inti/tip.js). Butuh format.js (fmt, esc) untuk esc/fmt di browser. */
const GrafikP = (() => {
  const E = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const F = n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
  const pendek = (t, L) => { t = String(t ?? ""); const n = Math.floor((L - 10) / 6.6); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
  /* batang mendatar: rows [{n, v, w, tip, txt}], v dalam skala bebas (nilai mutlak dipakai panjang batang) */
  function batangH(rows, {lebar = 640, label = 150, tengah = null} = {}) {
    const W = Math.max(300, lebar), L = W < 480 ? 96 : label, R = 74, rh = 26, m = Math.max(1e-9, ...rows.map(r => Math.abs(r.v)));
    return `<svg class="gp-svg" viewBox="0 0 ${W} ${rows.length * rh}" role="img">${tengah ? `<g data-tip="${E("<b>" + tengah.n + "</b><br>" + F(tengah.v) + " m/th")}"><line x1="${L + tengah.v / m * (W - L - R)}" x2="${L + tengah.v / m * (W - L - R)}" y1="0" y2="${rows.length * rh}" stroke="var(--ink2)" stroke-dasharray="4 3"/></g>` : ""}${rows.map((r, i) => { const y = i * rh, x = L + Math.abs(r.v) / m * (W - L - R), t = r.txt ?? F(r.v);
      return `<g data-tip="${E(r.tip || "")}"><text x="${L - 8}" y="${y + 17}" text-anchor="end" font-size="11.5" font-weight="600">${E(pendek(r.n, L))}</text><rect x="${L}" y="${y + 5}" width="${Math.max(2, x - L)}" height="${rh - 10}" rx="3" fill="${r.w}"/><text x="${x + 6}" y="${y + 17}" font-size="11.5" font-weight="700">${E(t)}</text><rect x="0" y="${y}" width="${W}" height="${rh}" fill="transparent"/></g>`; }).join("")}</svg>`; }
  /* batang menegak: cols [{n, v, w, tip, txt}]; garis = [{v, w, n}] garis ambang mendatar */
  function batangV(cols, {lebar = 640, tinggi = 190, garis = [], satuan = ""} = {}) {
    const W = Math.max(300, lebar), T = 20, B = tinggi - 26, m = Math.max(1e-9, ...cols.map(c => c.v), ...garis.map(g => g.v)) * 1.08, gap = (W - 20) / cols.length, bw = Math.min(46, gap * .7), Y = v => B - v / m * (B - T);
    return `<svg class="gp-svg" viewBox="0 0 ${W} ${tinggi}" role="img"><line x1="10" x2="${W - 10}" y1="${B}" y2="${B}" stroke="var(--line)"/>${garis.map(g => `<g><line x1="10" x2="${W - 10}" y1="${Y(g.v)}" y2="${Y(g.v)}" stroke="${g.w}" stroke-dasharray="4 3"/><text x="${W - 12}" y="${Y(g.v) - 3}" text-anchor="end" font-size="10.5" fill="${g.w}" font-weight="700">${E(g.n)}</text></g>`).join("")}`
      + cols.map((c, i) => { const x = 10 + gap * i + (gap - bw) / 2, h = Math.max(c.v > 0 ? 2 : 0, B - Y(c.v));
        return `<g data-tip="${E(c.tip || "")}"><rect x="${x}" y="${B - h}" width="${bw}" height="${h}" rx="3" fill="${c.w}"/><text x="${x + bw / 2}" y="${B - h - 4}" text-anchor="middle" font-size="11" font-weight="700">${E(c.txt ?? F(c.v))}</text><text x="${x + bw / 2}" y="${tinggi - 8}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${E(c.n)}</text><rect x="${10 + gap * i}" y="0" width="${gap}" height="${tinggi}" fill="transparent"/></g>`; }).join("") + `</svg>`; }
  /* garis banyak seri: seri [{n, w, titik: [{x, y}]}], x angka (tahun/jam), tip(x) -> teks kolom; kolom transparan per x menangkap hover */
  function garis(seri, {lebar = 640, tinggi = 230, tip = () => "", fx = x => x, satuan = "m", nol = true} = {}) {
    const W = Math.max(300, lebar), L = 46, R = 12, T = 12, B = tinggi - 24, X = seri.flatMap(s => s.titik.map(p => p.x)), Yv = seri.flatMap(s => s.titik.map(p => p.y));
    const x0 = Math.min(...X), x1 = Math.max(...X), y0 = Math.min(nol ? 0 : Infinity, ...Yv), y1 = Math.max(nol ? 0 : -Infinity, ...Yv), pad = (y1 - y0 || 1) * .08, a = y0 === 0 && Math.min(...Yv) >= 0 ? 0 : y0 - pad, b = y1 + pad;
    const sx = x => L + (x1 === x0 ? .5 : (x - x0) / (x1 - x0)) * (W - L - R), sy = y => T + (b - y) / (b - a) * (B - T), xs = [...new Set(X)].sort((p, q) => p - q);
    const h0 = (b - a) / 4, pw = Math.pow(10, Math.floor(Math.log10(h0))), st = [1, 2, 2.5, 5, 10].map(x => x * pw).find(x => x >= h0), skala = []; for (let v = Math.ceil(a / st) * st; v <= b; v += st) skala.push(Math.round(v / st) * st || 0);
    const tk = xs.filter((_, i) => i % Math.ceil(xs.length / 7) === 0);
    return `<svg class="gp-svg" viewBox="0 0 ${W} ${tinggi}" role="img">${skala.map(v => `<g><line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end" font-size="10.5" fill="var(--ink2)">${F(Math.round(v))}</text></g>`).join("")}`
      + (a < 0 && b > 0 ? `<line x1="${L}" x2="${W - R}" y1="${sy(0)}" y2="${sy(0)}" stroke="var(--ink2)" stroke-dasharray="3 3"/>` : "")
      + tk.map(x => `<text x="${sx(x)}" y="${tinggi - 6}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${E(fx(x))}</text>`).join("")
      + seri.map(s => `<polyline fill="none" stroke="${s.w}" stroke-width="2" stroke-linejoin="round" points="${s.titik.map(p => sx(p.x).toFixed(1) + "," + sy(p.y).toFixed(1)).join(" ")}"/>`).join("")
      + xs.map((x, i) => { const l = i ? (sx(xs[i - 1]) + sx(x)) / 2 : L, r = i < xs.length - 1 ? (sx(x) + sx(xs[i + 1])) / 2 : W - R;
          return `<rect x="${l}" y="${T}" width="${r - l}" height="${B - T}" fill="transparent" data-tip="${E(tip(x))}"/>`; }).join("") + `</svg>`; }
  /* batang mendatar bertumpuk: rows [{n, segs: [{v, w, tip}]}]; lebar tiap batang mengikuti jumlah terbesar */
  function tumpuk(rows, {lebar = 640, label = 130} = {}) {
    const W = Math.max(300, lebar), L = W < 480 ? 90 : label, R = 56, rh = 28, tot = r => r.segs.reduce((a, s) => a + s.v, 0), m = Math.max(1, ...rows.map(tot));
    return `<svg class="gp-svg" viewBox="0 0 ${W} ${rows.length * rh}" role="img">${rows.map((r, i) => { const y = i * rh; let x = L;
      return `<g><text x="${L - 8}" y="${y + 18}" text-anchor="end" font-size="11.5" font-weight="600">${E(pendek(r.n, L))}</text>${r.segs.map(s => { const w = s.v / m * (W - L - R), o = `<rect x="${x}" y="${y + 5}" width="${w}" height="${rh - 10}" fill="${s.w}" data-tip="${E(s.tip || "")}"/>`; x += w; return o; }).join("")}<text x="${x + 6}" y="${y + 18}" font-size="11.5" font-weight="700">${F(tot(r))}</text></g>`; }).join("")}</svg>`; }
  return {batangH, batangV, garis, tumpuk, F, E};
})();
if (typeof globalThis !== "undefined") globalThis.GrafikP = GrafikP;
