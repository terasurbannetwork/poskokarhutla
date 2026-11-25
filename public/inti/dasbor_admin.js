/* Model A untuk halaman admin (sistem desain dashboard, pemilik 11 Nov 2026): deretan tombol halaman .ad-sub jadi panel seksi kiri
   berkelompok, judul halaman jadi kepala navy. Hanya menyusun ulang tautan yang sudah dirender Worker (src/admin_halaman.js subNav, satu grup registri
   src/peta_situs.js); tanpa daftar tautan tulisan tangan (peta-situs PS-09). Tidak ada tautan baru. Gaya di public/inti/dasbor.css (.db-a, .db-nav). Tanpa gaya inline (CSP). */
(() => {
  "use strict";
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  function pasang() {
    const main = document.querySelector("main.ad-wrap"), sub = main?.querySelector("nav.ad-sub");
    if (!main || !sub || main.classList.contains("db-a")) return;
    const tautan = [...sub.querySelectorAll("a[href]")];
    if (!tautan.length) return;   // tanpa tautan: nav bawaan Worker tetap tampil, panel tidak dibangun
    const pisah = a => { const t = a.textContent.trim(), m = /^(\S+)\s+(.*)$/u.exec(t); return m && !/[A-Za-z0-9]/.test(m[1]) ? [m[1], m[2]] : ["", t]; };
    const tombol = a => { const [ik, nama] = pisah(a), b = el("a", "db-nav-b"); b.href = a.getAttribute("href");
      if (a.getAttribute("aria-current")) b.setAttribute("aria-current", "true");
      b.append(el("i", "db-nav-ik db-emoji", ik), el("span", "db-nav-t", nama)); return b; };
    const isi = el("nav", "db-nav-isi");   // satu grup registri (subNav), judulnya = aria-label nav Worker; urutan = urutan registri
    isi.append(el("p", "db-nav-sub", sub.getAttribute("aria-label") || "Halaman"), ...tautan.map(tombol));
    const nav = el("aside", "db-nav db-nav-admin"); nav.setAttribute("aria-label", "Halaman ruang kerja");
    const id = el("div", "db-nav-id"); id.append(el("b", null, "Ruang kerja"), el("small", null, "Centurisk97, admin"));
    nav.append(id, isi);
    const kanan = el("div", "db-kanan"); kanan.append(...[...main.childNodes].filter(n => n !== sub));
    sub.hidden = true; main.classList.add("db-a"); main.append(nav, kanan, sub);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang); else pasang();
})();
