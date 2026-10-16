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
const rb = v => v >= 1e6 ? fmt(Math.round(v / 1e5) / 10) + " jt" : v >= 1e4 ? fmt(Math.round(v / 1e3)) + " rb" : v >= 1e3 ? fmt(Math.round(v / 100) / 10) + " rb" : fmt(Math.round(v));
