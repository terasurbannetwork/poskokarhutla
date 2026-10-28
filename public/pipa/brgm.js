/* SIPPA: lapisan BRGM dan air asin di layar Peta (SP-110, SP-108; keputusan 52 dan 61). Fungsi murni tanpa DOM, tanpa warna hex (hex peta ada di layar_peta.js).
   Data brgm_pembasahan (~3,6 MB) hanya dimuat saat sakelar lapisan dinyalakan dan disaring ke kotak provinsi aktif. Letak menurut BRGM, kondisi tidak diketahui.
   Butuh global public/inti: fmt, esc. */

/* simbol dibedakan oleh bentuk dan huruf, bukan warna saja (keputusan 52) */
export const JENIS_BRGM = {
  sekat_kanal: {nama: "Sekat kanal", huruf: "S", bentuk: "kotak"},
  sumur_bor: {nama: "Sumur bor", huruf: "B", bentuk: "segitiga"},
  lain: {nama: "Lainnya", huruf: "L", bentuk: "lingkaran"},
};
export const LAPISAN_BRGM = ["brgm-titik"];
export const MARGIN_KOTAK = 0.3;   // derajat, sama dengan kotak pembatas di pipeline BRGM
const KET_BRGM = "Letak menurut BRGM (PRIMS), belum diverifikasi lapangan; kondisi sekat dan sumur tidak diketahui";

/* kotak [barat, selatan, timur, utara] dari semua kompleks provinsi aktif; null bila kosong */
export function kotakProv(daftar, margin = MARGIN_KOTAK) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const k of daftar || []) { if (k.lon == null || k.lat == null) continue; w = Math.min(w, k.lon); e = Math.max(e, k.lon); s = Math.min(s, k.lat); n = Math.max(n, k.lat); }
  return Number.isFinite(w) ? [w - margin, s - margin, e + margin, n + margin] : null;
}

/* kolom ["lon","lat","jenis","status"] + baris -> titik GeoJSON di dalam kotak; jenis asing jatuh ke "lain", status selain rencana = "ada" */
export function geoBrgm(d, kotak) {
  const i = Object.fromEntries(((d && d.kolom) || []).map((n, x) => [n, x])), fitur = [];
  for (const r of (d && Array.isArray(d.baris) ? d.baris : [])) {
    const lon = r[i.lon], lat = r[i.lat];
    if (typeof lon !== "number" || typeof lat !== "number") continue;
    if (kotak && (lon < kotak[0] || lon > kotak[2] || lat < kotak[1] || lat > kotak[3])) continue;
    fitur.push({type: "Feature", geometry: {type: "Point", coordinates: [lon, lat]}, properties: {jenis: Object.hasOwn(JENIS_BRGM, r[i.jenis]) ? r[i.jenis] : "lain", st: r[i.status] === "rencana" ? "rencana" : "ada"}});
  }
  return {type: "FeatureCollection", features: fitur};
}

export const namaGambarBrgm = (jenis, st) => `brgm-${jenis}-${st}`;
export function lapisanBrgm() {
  return [{id: "brgm-titik", type: "symbol", source: "brgm", minzoom: 7, layout: {visibility: "none", "icon-image": ["concat", "brgm-", ["get", "jenis"], "-", ["get", "st"]], "icon-size": 0.7, "icon-allow-overlap": true, "icon-ignore-placement": true}}];
}

/* penanda HTML 14 px yang sama bentuknya dengan penanda peta; warna lewat kelas CSS */
export function ikonBrgmSvg(jenis, rencana = false) {
  const b = {kotak: `<rect class="sp-brgm-b" x="2" y="2" width="10" height="10"/>`, segitiga: `<path class="sp-brgm-b" d="M7 1.5 13 12.5H1Z"/>`, lingkaran: `<circle class="sp-brgm-b" cx="7" cy="7" r="5.5"/>`}[JENIS_BRGM[jenis]?.bentuk];
  return `<svg class="sp-brgm${rencana ? " rencana" : ""}" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">${b}</svg>`;
}
export function legendaBrgmHtml() {
  const baris = Object.entries(JENIS_BRGM).map(([j, m]) => `<li>${ikonBrgmSvg(j)}<b>${m.huruf}</b>${esc(m.nama)}, ${esc(m.bentuk)}</li>`).join("");
  return `<b class="sp-leg-judul">Sekat kanal dan sumur bor BRGM</b><ul class="sp-leg-ukuran sp-leg-brgm">${baris}<li>${ikonBrgmSvg("sumur_bor", true)}isi kosong = sumur bor rencana, belum terbangun</li></ul>`;
}

const pil = (teks, kelas, judul) => `<span class="sp-yakin ${kelas}" title="${esc(judul)}">${esc(teks)}</span>`;

/* brgm_3km {sekat_kanal, sumur_bor, sumur_rencana, lain}: null = belum dihitung, bukan 0 */
export function brgmTeks(k) {
  const b = k && k.brgm_3km;
  if (!b) return "belum dihitung";
  const bagian = [["sekat_kanal", "sekat kanal"], ["sumur_bor", "sumur bor"], ["sumur_rencana", "sumur bor rencana"], ["lain", "lainnya"]].filter(([x]) => b[x] > 0).map(([x, n]) => `${fmt(b[x])} ${n}`);
  return bagian.length ? `${bagian.join(", ")} dalam 3 km` : "tidak ada dalam 3 km";
}
export const brgmBaris = k => `${esc(brgmTeks(k))} ${k && k.brgm_3km ? pil("Resmi, letak BRGM", "resmi", KET_BRGM) : ""}`.trim();

/* air asin (SP-108): zona dan saran sarana tetap memakai air tawar; air asin hanya darurat */
export const PENJELASAN_ASIN = "Garam merusak pompa dan masuk ke gambut dan sumur warga; bilas pompa dengan air tawar.";
const JENIS_ASIN = {laut: "laut", payau: "payau"};
export function airAsinTeks(k) {
  if (!k || k.air_asin == null) return {html: "belum dihitung", asin: false};
  const jenis = JENIS_ASIN[k.air_asin_jenis];
  if (!jenis) return {html: "tidak ada air asin dalam 16 km", asin: false};
  const km = `${esc(jenis)} ${esc(fmt(k.air_asin_km))} km`;
  if (!k.air_asin) return {html: `${km}, air tawar lebih dekat`, asin: false};
  return {html: `${pil("air asin, darurat saja", "asumsi-kebijakan", PENJELASAN_ASIN)} air asin terdekat ${km}, lebih dekat daripada air tawar. ${esc(PENJELASAN_ASIN)} Saran sarana tetap memakai air tawar.`, asin: true};
}
