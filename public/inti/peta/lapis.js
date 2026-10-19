"use strict";
/* Peta bersama (public/inti/peta): ubin Overlay bergaya Windy dan kartu hover satu baris berikon.
   Modul ES, dimuat lewat import() (banjir/peta.js); gayanya inti/peta/lapis.css.
   Polanya diambil dari karhutla (index.html: ubinLapis, kartuTip); karhutla belum memakainya, dipindah belakangan. */
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));

export const IKON = {
  peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  hujan: '<path d="M7 14a4 4 0 0 1-.5-8A6 6 0 0 1 18 5a4 4 0 0 1-1 9"/><path d="M8 17v3M12 16v4M16 17v3"/>',
  sungai: '<path d="M3 8c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 14c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 20c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/>',
  ombak: '<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2M2 18c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2M7 6c1.5-2 3-2 4.5 0"/>',
  satelit: '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M3 3l5 5M16 16l5 5M9 12H3M21 12h-6M12 9V3M12 21v-6"/>',
  posko: '<path d="M4 20V9l8-5 8 5v11H4Z"/><path d="M10 20v-6h4v6"/>',
  peringatan: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  angin: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  bel: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  mata: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  perisai: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  debit: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  rasio: '<path d="M5 19 19 5M7 8.5v.5M17 15v.5"/>',
  orang: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6M15 14.5c3 0 6 2 6 5.5"/>',
  gedung: '<path d="M4 21V5l8-2v18M12 9l8 2v10M8 8v.5M8 12v.5M8 16v.5M16 14v.5M16 18v.5"/>',
  jalan: '<path d="M8 3 4 21M16 3l4 18M12 5v3M12 11v3M12 17v3"/>',
};
/* warna ubin lapisan konteks (inti/peta/konteks.js); sama dengan Overlay karhutla */
const KONTEKS = {kt_penduduk: ["#5f2b5f", "#e58ab0", "orang"], kt_fasilitas: ["#3b3b8a", "#9b8de0", "gedung"], kt_jalan: ["#4b5563", "#c7ccd4", "jalan"]};
const ik = (k, w) => `<i class="tp-ik"${w ? ` style="background:${w}1f;color:${w}"` : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IKON[k] || IKON.peta}</svg></i>`;
const angka = n => typeof n === "number" ? n.toLocaleString("id-ID") : n;

/* kartu hover: kepala (lambang + nama) lalu SATU baris statistik berikon; stat = [ikon, nilai, label, warna, bahaya] */
export const kartuTip = ({judul, kepala = "", sub = "", stat = []}) => `<div class="tp-hd">${kepala}<span class="tp-nm"><b>${judul}</b>${sub}</span></div>` +
  (stat.length ? `<div class="tp-bd"><div class="tp-gr tp-satu">${stat.map(([k, v, l, w, bahaya]) => `<div class="tp-st${bahaya ? " bahaya" : ""}">${ik(k, w)}<span><b>${angka(v)}</b><small>${l}</small></span></div>`).join("")}</div></div>` : "");

export function tampilTip(html, ev) {
  const t = document.getElementById("tip"), w = document.querySelector("dialog[open]") || document.body; if (!t) return;
  if (t.parentNode !== w) w.appendChild(t);
  if (t._html !== html) { t._html = html; t.innerHTML = html; }
  t.classList.add("kartu", "on");
  t.style.left = Math.min(innerWidth - t.offsetWidth - 8, ev.clientX + 14) + "px"; t.style.top = Math.max(8, ev.clientY - t.offsetHeight - 12) + "px";
}
export const sembunyiTip = () => { const t = document.getElementById("tip"); if (t) { t.classList.remove("on"); t._html = null; } };
/* kotak pembatas [[barat, selatan], [timur, utara]] dari deretan fitur GeoJSON, untuk fitBounds */
export function kotak(fitur) {
  let a = [180, 90, -180, -90];
  const jalan = c => { if (typeof c[0] === "number") { a[0] = Math.min(a[0], c[0]); a[1] = Math.min(a[1], c[1]); a[2] = Math.max(a[2], c[0]); a[3] = Math.max(a[3], c[1]); } else c.forEach(jalan); };
  fitur.forEach(f => jalan(f.geometry.coordinates)); return [[a[0], a[1]], [a[2], a[3]]]; }

/* ubin Overlay: tiap <label><input data-l> di dalam <details> jadi ubin ikon; satu baris (kisi 5 kolom) per kategori.
   katalog: {kunci: [warnaA, warnaB, ikon]}; pendek: {kunci: nama pendek}; nama lengkap pindah ke tooltip. */
export function ubinLapis(L, {katalog = {}, pendek = {}} = {}) {
  if (!L) return;
  const jalan = () => L.querySelectorAll("details").forEach(d => { const ls = [...d.children].filter(x => x.tagName === "LABEL"); if (!ls.length) return;
    let gr = d.querySelector(":scope > .ub-gr"); if (!gr) { gr = document.createElement("div"); gr.className = "ub-gr"; d.append(gr); }
    ls.forEach(l => { const i = l.querySelector("input"), [a, b, k] = katalog[i?.dataset.l] || KONTEKS[i?.dataset.l] || ["#5f6fb0", "#a9b6e6", "peta"], t = l.textContent.trim(), pn = pendek[i?.dataset.l] || t;
      l.className = "ubin"; l.textContent = ""; l.append(i);
      l.insertAdjacentHTML("beforeend", `<i class="ub-th" style="--a:${a};--b:${b}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IKON[k] || IKON.peta}</svg></i><span>${esc(pn)}</span>`);
      if (pn !== t) l.dataset.tip = `<b>${esc(t)}</b>`; gr.append(l); }); });
  jalan(); new MutationObserver(jalan).observe(L, {childList: true, subtree: true});
}
