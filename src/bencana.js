/* Turunan registry bencana (public/bencana.json via src/bencana.generated.js): rute, jalur OG, sumber status, halaman statistik, sitemap.
   Semua fungsi murni dan menerima registry B (bawaan = registry nyata), supaya uji bisa memberinya salinan.
   "mati" tidak melahirkan apa pun; "aktif" masuk sitemap; "uji" punya rute tetapi tidak masuk sitemap. */
import REGISTRY from "./bencana.generated.js";

/* tab karhutla lama yang dilayani di akar walau tidak ada di `tab` registry (tautan lama tetap hidup) */
export const TAB_LAMA = ["keputusan", "prioritas", "sarana", "operasi"];
export const HAL_TETAP = ["warga", "tentang", "privasi", "statistik"];

export const hidup = (B = REGISTRY) => B.bencana.filter(b => b.status !== "mati");
export const akar = b => b.rute === "/";
export const dasar = b => b.rute.replace(/\/$/, "");
/* Tab yang dilayani sebagai jalur: bencana akar (karhutla) dan bencana lain (tab + kunci alias lama, mis. banjir/simulasi).
   Kejadian (k/B0001) bencana warisan tetap tidak dilayani. */
export const tabRute = b => akar(b) ? [...new Set([...b.tab, ...TAB_LAMA])] : [...new Set([...b.tab, ...Object.keys(b.alias || {})])];
/* alternasi jalur kejadian: k/K0001 dan sim/K0001 (awalan dari registry) */
export const jalurKejadian = b => b.kejadian?.awalan && (akar(b) || !b.warisan) ? [`k/${b.kejadian.awalan}\\d+`, `sim/${b.kejadian.awalan}\\d+`] : [];

function polaHalaman(b) {
  const alt = [...tabRute(b), ...jalurKejadian(b)];
  return alt.length ? new RegExp(`^${dasar(b)}/(${alt.join("|")})/?$`) : null;
}

/* [pola, berkas aset, kunci statistik] untuk HTML_RUTE */
export function ruteBencana(B = REGISTRY) {
  const out = [];
  for (const b of hidup(B)) {
    const p = polaHalaman(b);
    if (akar(b)) out.push([/^\/(index\.html)?$/, "/index.html", "/"], ...(p ? [[p, "/index.html", null]] : []));
    else out.push([new RegExp(`^${dasar(b)}(/|/index\\.html)?$`), `${dasar(b)}/index.html`, b.rute], ...(p ? [[p, `${dasar(b)}/index.html`, null]] : []));
  }
  return out;
}

export const sumberStatus = (B = REGISTRY) => hidup(B).flatMap(b => b.sumber_status || []);
export const halStatistik = (B = REGISTRY) => [...hidup(B).map(b => b.id), ...HAL_TETAP];

/* /sitemap.xml: asal = https://domain dari request. Tab tersembunyi tidak masuk. */
export function sitemap(asal, B = REGISTRY) {
  const j = new Set(["/"]);
  for (const b of B.bencana.filter(b => b.status === "aktif")) {
    j.add(b.rute);
    for (const t of tabRute(b)) if (b.tab.includes(t) && !(b.tab_sembunyi || []).includes(t)) j.add(akar(b) ? `/${t}` : `${dasar(b)}/${t}`);
  }
  j.add("/tentang"); j.add("/privasi");
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...j].map(p => `<url><loc>${esc(asal + p)}</loc></url>`).join("\n")}\n</urlset>\n`;
}
