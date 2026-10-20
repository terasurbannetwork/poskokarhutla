"use strict";
/* Pembulatan angka perkiraan dan label tanggal, dipakai app.js (index.html) dan simulasi.html. Butuh ../inti/format.js (fmt, WIB) lebih dulu. */
/* tunda pekerjaan berat sampai sesudah paint (dipakai app.js dan sim.js; satu definisi) */
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
/* tanggal data: "hari ini" hanya bila tanggal data = hari WIB sekarang, selain itu "per 16 Okt" */
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const hariWIB = t => new Date(t).toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"});
const tglPdk = t => { const [, m, d] = hariWIB(t).split("-"); return `${+d} ${BLN[+m - 1]}`; };
const labelHari = t => hariWIB(t) === hariWIB(Date.now()) ? "hari ini" : "per " + tglPdk(t);
/* angka perkiraan: penduduk WorldPop 1 km tidak ditulis sampai satuan; jangkauan abu ke 5 km, waktu tempuh ke 5 menit */
const jiwaAngka = v => { if (v == null || isNaN(v)) return "–"; if (v <= 0) return "0"; if (v < 100) return "kurang dari 100"; if (v < 1000) return fmt(Math.round(v / 100) * 100);
  if (v < 1e4) return fmt(Math.round(v / 100) / 10) + " ribu"; if (v < 1e6) return fmt(Math.round(v / 1000)) + " ribu"; return fmt(Math.round(v / 1e5) / 10) + " juta"; };
const jiwaTxt = v => { const a = jiwaAngka(v); return /^\d/.test(a) && a !== "0" ? "±" + a : a; };
/* teks pil untuk semua yang berasal dari abu.py: skenario "jika meletus sekarang" (erupsi diandaikan), bukan prakiraan letusan atau advisory VAAC */
const TXT_SKEN = "skenario jika meletus sekarang, bukan prakiraan";
const km5 = v => fmt(Math.max(5, Math.round(v / 5) * 5));
const mnt5 = v => v < 5 ? "kurang dari 5 menit" : fmt(Math.round(v / 5) * 5) + " menit";
/* peluang kebetulan sebagai "a dari b" (pecahan sederhana terdekat) */
const dariB = p => { if (p < .1) return "kurang dari 1 dari 10"; for (const b of [2, 3, 4, 5, 10]) { const a = Math.round(p * b); if (a >= 1 && Math.abs(a / b - p) < .05) return a + " dari " + b; } return fmt(Math.round(p * 100)) + " dari 100"; };
