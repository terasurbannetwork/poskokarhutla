/* Rute halaman Docs Centurisk97: paket data/kajian-bnpb/docs-situs/ (DESAIN-TEKNIS bagian 3, tiket DC-03).
   Hanya cangkang HTML statis dari public/docs/ (keluaran scripts/docs/bangun.py); tanpa D1, R2, atau rute API.
   Struktur URL: /docs, /docs/<modul>, /docs/<modul>/<halaman> (panduan) dan /docs/pengembang, /docs/pengembang/<modul>,
   /docs/pengembang/<modul>/<halaman> (pengembang). Daftar halaman tidak dikodekan di sini: yang tertutup adalah POLA jalur
   (segmen [a-z0-9-]{1,48}, paling dalam 3 segmen, tanpa titik dan tanpa garis miring ganda); berkas yang tidak ada tetap 404 dari aset. */
const SEG = "[a-z0-9-]{1,48}";
const POLA = new RegExp(`^/docs(?:/${SEG}){0,3}/?$`);
const POLA_BERSIH = new RegExp(`^/docs(?:/${SEG}){0,3}$`);
/* alamat langsung berkas keluaran generator: /docs/index.html, /docs/<modul>/index.html, /docs/<modul>/<halaman>.html, /docs/pengembang/<modul>/<halaman>.html */
export const DOCS_HTML_LANGSUNG = new RegExp(`^/docs(?:/${SEG}){0,2}/${SEG}\\.html$`);

/* jalur bersih -> berkas aset: pengembang/ lebih dalam satu tingkat dari panduan; direktori memakai index.html, halaman daun memakai <nama>.html */
export function asetDocs(jalur) {
  const s = jalur.replace(/\/+$/, "").split("/").slice(2);   // segmen sesudah /docs
  if (!s.length) return "/docs/index.html";
  const daun = s[0] === "pengembang" ? 3 : 2;
  return s.length >= daun ? `/docs/${s.join("/")}.html` : `/docs/${s.join("/")}/index.html`;
}

/* satu entri bentuk HTML_RUTE: [pola jalur, berkas aset bawaan, jalur kanonik, fungsi jalur -> berkas aset]; worker memakai elemen ke-4 bila ada */
export function ruteDocs() {
  const e = [POLA, "/docs/index.html", "/docs", asetDocs];
  return [e];
}

/* jalur (tanpa garis miring penutup) milik Docs; selain itu (/docsx, /docs/../admin, /docs/BANJIR, /docs//x, lebih dari 3 segmen) bukan Docs */
export const jalurDocs = j => POLA_BERSIH.test(j);
