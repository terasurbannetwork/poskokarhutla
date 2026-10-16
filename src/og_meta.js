/* Pratinjau tautan per rute: menimpa og:*, twitter:*, dan canonical di HTML yang sudah lewat Worker (layaniHTML),
   dari public/data/og/meta.json (ditulis scripts/og/buat.py tiap jalan titik.yml). Halaman tanpa blok <!-- og --> tidak berubah.
   /k/K0001 -> keterangan kompleks + gambar provinsinya; /sim/K0001 -> simulasi; ?wil=62 -> provinsi; /peta dan tab lain -> og:url sendiri;
   "/" dan "/banjir/" -> angka terbaru (tanpa menunggu HTML dicap ulang). Gagal memuat meta.json = HTML apa adanya. */
import REGISTRY from "./bencana.generated.js";
import {hidup, akar, dasar, tabRute} from "./bencana.js";
/* nama tab untuk judul; tab yang belum terdaftar jatuh ke id berhuruf kapital. Himpunan tab yang dikenal datang dari registry (tabRute). */
const LABEL = {peta: "Peta", insight: "Insight", berita: "Berita", tren: "Tren", kompleks: "Kompleks", posko: "Posko", dampak: "Dampak", metode: "Metode",
  operasi: "Operasi", sarana: "Sarana", keputusan: "Keputusan", prioritas: "Prioritas", informasi: "Informasi", ringkasan: "Ringkasan", sim: "Simulasi"};
const label = t => LABEL[t] || t[0].toUpperCase() + t.slice(1);

/* Profil pratinjau satu bencana: baris meta.json bila ada, kalau tidak turunan registry (og.judul + sumber), supaya tiap modul punya pratinjau sendiri tanpa menunggu generator OG. */
const profil = (b, M) => M.halaman[b.rute] || {judul: b.og?.judul || `${b.nama} · Pantau Bencana`, desk: `Pantau ${b.nama.toLowerCase()} di seluruh Indonesia.${b.bagikan?.sumber ? " Sumber: " + b.bagikan.sumber + "." : ""}`, gambar: M.gambar?.umum ? "umum" : M.halaman["/"].gambar};   // tanpa baris sendiri: gambar netral, bukan gambar karhutla

/* murni: jalur + meta.json (+ registry) -> {judul, desk, gambar, url} atau null (tidak diubah) */
export function metaRute(url, M, B = REGISTRY) {
  if (!M?.halaman?.["/"]) return null;
  const S = M.situs, p = url.pathname.replace(/\/+$/, "") || "/", dasarH = M.halaman["/"], gbr = g => `${S}/data/og/${g}.png?v=${M.v}`, bs = hidup(B);
  for (const b of bs) if (!akar(b) && (p === dasar(b) || p === dasar(b) + "/index.html")) { const h = profil(b, M); return {judul: h.judul, desk: h.desk, gambar: gbr(h.gambar), url: S + b.rute}; }
  for (const b of bs) {   // /k/K0001, /sim/K0001 (akar) atau /<id>/k/<KODE>: awalan kode dari kejadian.awalan
    const aw = b.kejadian?.awalan, k = aw && (akar(b) || !b.warisan) && p.match(new RegExp(`^${akar(b) ? "" : dasar(b)}/(k|sim)/(${aw}\\d+)$`));
    if (!k) continue;
    const [d, prov] = [].concat(M.kompleks?.[k[2]] || []), sim = k[1] === "sim", g = prov && M.prov?.[prov] ? "prov-" + prov : "ringkasan", api = aw === "K";
    return {judul: `${sim ? (api ? "Simulasi penjalaran api" : "Simulasi " + b.kejadian.nama.toLowerCase()) : b.kejadian.nama} ${k[2]} · Pantau Bencana`,
      desk: d ? `${d}.${api ? " " + (sim ? "Simulasi penjalaran api 72 jam dan pilihan pemadaman." : "Lokasi, cuaca, akses regu, dan rekomendasi pemadaman di peta.") : ""}` : dasarH.desk,
      gambar: gbr(g), url: S + p};
  }
  const wil = (url.searchParams.get("wil") || "").slice(0, 2);
  if (/^\d{2}$/.test(wil) && M.nama?.[wil]) {
    const pv = M.prov?.[wil];
    return {judul: pv ? pv.judul : `${M.nama[wil]} · Pantau Bencana`, desk: pv ? pv.desk : dasarH.desk, gambar: gbr(pv ? pv.gambar : "ringkasan"), url: `${S}${p === "/" ? "/" : p}?wil=${wil}`};
  }
  const h = M.halaman[p === "/index.html" ? "/" : p];
  if (h) return {judul: h.judul, desk: h.desk, gambar: gbr(h.gambar), url: S + (p === "/index.html" ? "/" : p)};
  for (const b of bs) {
    const pre = akar(b) ? "" : dasar(b), t = p.startsWith(pre + "/") ? p.slice(pre.length + 1) : "";
    if (t && tabRute(b).includes(t)) { const h = akar(b) ? dasarH : profil(b, M); return {judul: `${label(t)} · Pantau Bencana ${b.nama}`, desk: h.desk, gambar: gbr(h.gambar), url: S + p}; }
  }
  return null;
}

let CACHE = null;
async function muat(env, asal) {
  if (CACHE && Date.now() - CACHE.t < 10 * 60e3) return CACHE.M;
  let M = null;
  try { const r = await env.ASSETS.fetch(new Request(new URL("/data/og/meta.json", asal))); if (r.ok) M = await r.json(); } catch (e) {}
  CACHE = {t: Date.now(), M};
  return M;
}

/* dipanggil dari layaniHTML: res = respons aset HTML */
export async function terapkanOg(env, url, res, tetap = null) {
  if (!res.ok || !(res.headers.get("content-type") || "").includes("html")) return res;
  const m = tetap || metaRute(url, await muat(env, url));
  if (!m) return res;
  const isi = v => ({element: el => el.setAttribute("content", v)});
  return new HTMLRewriter()
    .on('meta[property="og:title"]', isi(m.judul)).on('meta[name="twitter:title"]', isi(m.judul))
    .on('meta[property="og:description"]', isi(m.desk)).on('meta[name="twitter:description"]', isi(m.desk)).on('meta[property="og:image:alt"]', isi(m.desk.slice(0, 200)))
    .on('meta[property="og:image"]', isi(m.gambar)).on('meta[name="twitter:image"]', isi(m.gambar))
    .on('meta[property="og:url"]', isi(m.url)).on('link[rel="canonical"]', {element: el => el.setAttribute("href", m.url)})
    .transform(res);
}
