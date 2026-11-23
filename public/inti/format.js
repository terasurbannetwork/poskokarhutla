"use strict";
/* Format dasar bersama semua halaman bencana (public/inti). Skrip klasik: const di sini jadi global lexical,
   dipakai inline index.html, modul bersama, dan modul lain. Dimuat SESUDAH i18n.js (yang menambal toLocaleString). */
const $ = s => document.querySelector(s);
const fmt = n => (n == null || isNaN(n)) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* href dari data pihak ketiga (RSS berita, media, kredit foto): hanya http(s), selain itu (javascript:, data:, …) jadi "#" */
const escUrl = u => { const s = String(u ?? "").trim(); return /^https?:\/\//i.test(s) ? esc(s) : "#"; };
const WIB = {timeZone: "Asia/Jakarta"};
const jamWIB = d => new Date(d).toLocaleString("id-ID", {...WIB, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
/* jam data di kepala halaman (.stat .upd), pola karhutla (index.html): "Data " dan " WIB" dalam .pjg yang disembunyikan gaya.css di <=1500 px,
   jadi kepala sempit hanya memuat "16 Nov 10.19". Hasil HTML; isi hanya dari jamWIB, tanpa teks luar. */
const jamData = d => `<span class="pjg">Data </span>${jamWIB(d).replace(" WIB", '<span class="pjg"> WIB</span>')}`;
const rb = v => v == null ? "–" : v >= 1e6 ? fmt(Math.round(v / 1e5) / 10) + " jt" : v >= 1e4 ? fmt(Math.round(v / 1e3)) + " rb" : v >= 1e3 ? fmt(Math.round(v / 100) / 10) + " rb" : fmt(Math.round(v));
/* SATU formatter durasi untuk semua layar: "45 menit", "6 jam 24 menit", "1 hari 10 jam" (nilai mutlak, minimal 1 menit; satuan nol dibuang). */
fmt.durasi = ms => {
  const m = Math.max(1, Math.round(Math.abs(Number(ms) || 0) / 6e4)), j = Math.floor(m / 60), d = Math.floor(j / 24);
  return d ? `${d} hari${j % 24 ? ` ${j % 24} jam` : ""}` : j ? `${j} jam${m % 60 ? ` ${m % 60} menit` : ""}` : `${m} menit`;
};
