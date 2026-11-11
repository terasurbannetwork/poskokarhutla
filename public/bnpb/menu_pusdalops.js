/* Menu atas bersama halaman Pusdalops: Pantau, Logbook, Laporan, Operasi, Perencanaan, Kontak, plus deretan sub-halaman per grup.
   Satu sumber supaya kepala halaman sama persis di semua halaman; yang berganti hanya isi di bawahnya (permintaan pemilik 3 Nov 2026).
   Dipasang ke <header class="ad-top"> yang sudah ada: label .ad-sep dibuang, menu disisipkan sesudah logo. Ikon garis disalin dari
   public/bnpb/wilayah.js supaya berkas ini mandiri (halaman Kontak tidak memuat wilayah.js). Tanpa gaya inline (CSP). */
(() => {
  "use strict";
  /* lapisan sistem desain dashboard (data/kajian-bnpb/dashboard/DESIGN-SYSTEM.md) untuk semua halaman Pusdalops */
  if (!document.querySelector('link[href^="/inti/dasbor.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/inti/dasbor.css?v=4"; document.head.append(l); }
  const IKON = {"banjir": "M3 17c2 0 2-2 4.5-2S10 17 12 17s2.5-2 4.5-2S19 17 21 17|M3 21c2 0 2-2 4.5-2S10 21 12 21s2.5-2 4.5-2S19 21 21 21|M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.500 2-5 5-9z", "daftar": "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", "simpan": "M5 3h11l3 3v15H5z|M8 3v6h7V3M8 21v-7h8v7", "personel": "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0", "pin": "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z|M12 12a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z", "peringatan": "M12 3l9 16H3z|M12 10v4M12 17v.5", "kalender": "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4", "sinyal": "M4 20l.01 0M8 16a5.500 5.500 0 0 1 8 0M5 12.500a10 10 0 0 1 14 0|M3 3l18 18", "meja": "M9 3h6v3H9z|M6 5h12v16H6z|M9 11h6M9 15h4", "grafik": "M3 3v18h18|M7 15l4-4 3 3 5-6", "awan": "M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.600-1.500A3.500 3.500 0 0 1 17 18z"};
  /* 6 grup di navbar (pemilik 11 Nov 2026: 13 butir dirampingkan); tetap tanpa daftar turun (pemilik 4 Nov 2026): grup berisi lebih dari
     satu halaman menampilkan deretan sub-halaman di bawah kepala. Rute lama tetap; tautan grup membuka halaman pertamanya. */
  const GRUP = [
    ["Pantau", "banjir", [["/bnpb/dalops", "Pantau kejadian", "banjir"], ["/admin/pantau", "Meja Pantau", "meja"]]],
    ["Logbook", "daftar", [["/bnpb/logbook", "Logbook", "daftar"]]],
    ["Laporan", "simpan", [["/bnpb/bahan", "Bahan laporan", "daftar"], ["/admin/laporan-karhutla", "Laporan Karhutla", "simpan"], ["/laporan-bnpb", "Laporan Koordalops", "simpan"], ["/bnpb/dokumen", "Dokumen", "simpan"]]],
    ["Operasi", "personel", [["/bnpb/operasi", "Operasi", "personel"], ["/?operasi", "Operasi lapangan", "pin"], ["/admin/omc", "Sortie OMC", "awan"]]],
    ["Perencanaan", "kalender", [["/bnpb/perencanaan", "Perencanaan", "kalender"], ["/bnpb/siaga", "Siaga", "peringatan"]]],
    ["Kontak", "sinyal", [["/daftar-kontak", "Kontak", "sinyal"]]]];
  const MENU = GRUP.flatMap(g => g[2]);
  const NS = "http://www.w3.org/2000/svg";
  const ikon = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const kepala = document.querySelector("header.ad-top");
  if (!kepala || kepala.querySelector(".mp-menu")) return;
  kepala.querySelector(".ad-sep")?.remove();
  const kini = location.pathname.replace(/\/$/, "").replace(/\.html$/, "");
  const nav = document.createElement("nav");
  nav.className = "mp-menu"; nav.setAttribute("aria-label", "Halaman Pusdalops");
  const tautan = (href, teks, ik, kini_) => { const a = document.createElement("a"); a.href = href; a.append(ikon(ik), teks);
    if (kini_) a.setAttribute("aria-current", "page"); return a; };
  const grup = GRUP.find(g => g[2].some(m => m[0] === kini));
  nav.append(...GRUP.map(g => tautan(g[2][0][0], g[0], g[1], g === grup)));
  if (grup && grup[2].length > 1) {   // deretan sub-halaman: penuh ujung ke ujung, dibagi rata, berikon
    const sub = document.createElement("nav");
    sub.className = "mp-sub"; sub.setAttribute("aria-label", grup[0]);
    sub.append(...grup[2].map(([href, teks, ik]) => tautan(href, teks, ik, href === kini)));
    kepala.after(sub);
  }
  /* halaman admin di menu ini (Meja Pantau, Laporan Karhutla, Sortie OMC): nav admin bawaannya diganti menu ini; tombol Keluar tetap */
  if (MENU.some(m => m[0] === kini)) kepala.querySelector("nav:not(.mp-menu)")?.remove();
  (kepala.querySelector(".ad-logo") || kepala.firstChild).after(nav);
})();
