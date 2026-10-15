/* Pratinjau tautan per rute: menimpa og:*, twitter:*, dan canonical di HTML yang sudah lewat Worker (layaniHTML),
   dari public/data/og/meta.json (ditulis scripts/og/buat.py tiap jalan titik.yml). Halaman tanpa blok <!-- og --> tidak berubah.
   /k/K0001 -> keterangan kompleks + gambar provinsinya; /sim/K0001 -> simulasi; ?wil=62 -> provinsi; /peta dan tab lain -> og:url sendiri;
   "/" dan "/banjir/" -> angka terbaru (tanpa menunggu HTML dicap ulang). Gagal memuat meta.json = HTML apa adanya. */
const TAB = {peta: "Peta", insight: "Insight", berita: "Berita", tren: "Tren", kompleks: "Kompleks", posko: "Posko", dampak: "Dampak", metode: "Metode",
  operasi: "Operasi", sarana: "Sarana", keputusan: "Keputusan", prioritas: "Prioritas", informasi: "Informasi", ringkasan: "Ringkasan", sim: "Simulasi"};

/* murni: jalur + meta.json -> {judul, desk, gambar, url} atau null (tidak diubah) */
export function metaRute(url, M) {
  if (!M?.halaman?.["/"]) return null;
  const S = M.situs, p = url.pathname.replace(/\/+$/, "") || "/", dasar = M.halaman["/"], gbr = g => `${S}/data/og/${g}.png?v=${M.v}`;
  if (p === "/banjir" || p === "/banjir/index.html") { const h = M.halaman["/banjir/"]; return h && {judul: h.judul, desk: h.desk, gambar: gbr(h.gambar), url: S + "/banjir/"}; }
  const k = p.match(/^\/(k|sim)\/(K\d+)$/);
  if (k) {
    const [d, prov] = [].concat(M.kompleks?.[k[2]] || []), sim = k[1] === "sim", g = prov && M.prov?.[prov] ? "prov-" + prov : "ringkasan";
    return {judul: `${sim ? "Simulasi penjalaran api" : "Kompleks api"} ${k[2]} · Pantau Bencana`,
      desk: d ? `${d}. ${sim ? "Simulasi penjalaran api 72 jam dan pilihan pemadaman." : "Lokasi, cuaca, akses regu, dan rekomendasi pemadaman di peta."}` : dasar.desk,
      gambar: gbr(g), url: S + p};
  }
  const wil = (url.searchParams.get("wil") || "").slice(0, 2);
  if (/^\d{2}$/.test(wil) && M.nama?.[wil]) {
    const pv = M.prov?.[wil];
    return {judul: pv ? pv.judul : `${M.nama[wil]} · Pantau Bencana`, desk: pv ? pv.desk : dasar.desk, gambar: gbr(pv ? pv.gambar : "ringkasan"), url: `${S}${p === "/" ? "/" : p}?wil=${wil}`};
  }
  const h = M.halaman[p === "/index.html" ? "/" : p];
  if (h) return {judul: h.judul, desk: h.desk, gambar: gbr(h.gambar), url: S + (p === "/index.html" ? "/" : p)};
  const t = TAB[p.slice(1)];
  return t ? {judul: `${t} · Pantau Bencana Karhutla`, desk: dasar.desk, gambar: gbr(dasar.gambar), url: S + p} : null;
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
