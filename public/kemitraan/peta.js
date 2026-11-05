/* Kemitraan Kampus, komponen peta SVG .km-peta-wil (KM-B07, DS §5.7). Tanpa MapLibre; pola proyeksi dari public/bnpb/risiko.js:61 (hitungPeta/jalur).
   KM.peta(el, {geo, kelas, titik, arsir, sorot, kunci, label, judul}) menggambar kab/kec/prov dari fitur GeoJSON (public/geo/*).
   Bagian murni (proyeksi, jalur, html) diekspor untuk uji node (tests/kemitraan/peta.test.mjs); tooltip lewat [data-tt] yang ditangani daerah.js (KM.tipData, #kmTip). */
(() => {
  "use strict";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const SISI = 1000, PAD = 8;
  let nomor = 0;
  const r1 = n => Math.round(n * 10) / 10;   // koordinat SVG satu desimal (bukan angka tampilan, jadi bukan fmt())

  /* proyeksi equirectangular; lebar dikoreksi cos(lintang tengah). Pojok bbox (barat, utara) -> (PAD, PAD); (timur, selatan) -> (W-PAD, H-PAD) */
  function proyeksi(fs, {sisi = SISI, pad = PAD} = {}) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const lihat = c => { for (const p of c) typeof p[0] === "number" ? (x0 = Math.min(x0, p[0]), x1 = Math.max(x1, p[0]), y0 = Math.min(y0, p[1]), y1 = Math.max(y1, p[1])) : lihat(p); };
    fs.forEach(f => f?.geometry?.coordinates && lihat(f.geometry.coordinates));
    if (!Number.isFinite(x0)) return null;
    const k = Math.cos((y0 + y1) / 2 * Math.PI / 180), W = (x1 - x0) * k, H = y1 - y0, s = sisi / (Math.max(W, H) || 1);
    return {k, s, pad, x0: x0 - pad / s / k, y1: y1 + pad / s, W: W * s + 2 * pad, H: H * s + 2 * pad, bbox: [x0, y0, x1, y1]};
  }
  const xy = (P, lon, lat) => [(lon - P.x0) * P.k * P.s, (P.y1 - lat) * P.s];
  /* satu path d per fitur; setiap cincin ditutup Z, dan fill-rule evenodd (CSS) membuat lubang tampak */
  const jalur = (g, P) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates).map(poli => poli.map(r =>
    "M" + r.map(p => { const [x, y] = xy(P, p[0], p[1]); return r1(x) + " " + r1(y); }).join("L") + "Z").join("")).join("");

  const kunciAwal = (f, i) => f.properties?.id ?? f.properties?.kec ?? f.properties?.kab ?? i;
  /* opsi: geo = array fitur; kelas = {kunci: 0..3}; titik = [{lat, lon, jenis: "kampus"|"desa", nama}]; arsir = [kunci] (celah); sorot = kunci;
     label(f, kelas) -> teks tooltip; kunci(f, i) -> kunci fitur. Mengembalikan string SVG, atau "" bila geo kosong */
  function html({geo, kelas = {}, titik = [], arsir = [], sorot = null, kunci = kunciAwal, label, judul = "Peta wilayah"} = {}) {
    const P = proyeksi(geo || []);
    if (!P) return "";
    const pola = "km-pola-" + (++nomor), ars = new Set(arsir.map(String)), tt = (f, kl) => label ? label(f, kl) : (f.properties?.kec || f.properties?.kab || "");
    const dasar = [], celah = [];
    geo.forEach((f, i) => {
      const kn = kunci(f, i), kl = kelas[kn], d = jalur(f.geometry, P), t = tt(f, kl);
      dasar.push(`<path class="${kl == null ? "kn" : "k" + kl}${sorot != null && String(sorot) === String(kn) ? " pilih" : ""}" d="${d}"${t ? ` data-tt="${esc(t)}"` : ""}/>`);
      if (ars.has(String(kn))) celah.push(`<path class="km-celah" fill="url(#${pola})" d="${d}"/>`);
    });
    const pts = titik.filter(p => p.lat != null && p.lon != null && Number.isFinite(+p.lat) && Number.isFinite(+p.lon)).map(p => { const [x, y] = xy(P, +p.lon, +p.lat), desa = p.jenis === "desa";
      return `<circle class="km-titik-${desa ? "desa" : "kampus"}" r="${desa ? 4 : 6}" cx="${r1(x)}" cy="${r1(y)}"${p.nama ? ` data-tt="${esc(p.nama)}"` : ""}/>`; });
    return `<svg class="km-peta-wil" viewBox="0 0 ${Math.round(P.W)} ${Math.round(P.H)}" role="img" aria-label="${esc(judul)}"><defs><pattern id="${pola}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" class="km-garis-celah"/></pattern></defs>${dasar.join("")}${celah.join("")}${pts.join("")}</svg>`;
  }

  const pub = {proyeksi, xy, jalur, html};
  if (typeof module !== "undefined" && module.exports) module.exports = pub;
  if (typeof window !== "undefined" && window.KM) window.KM.peta = (el, opsi) => { el.innerHTML = html(opsi); return el.firstElementChild; };
})();
