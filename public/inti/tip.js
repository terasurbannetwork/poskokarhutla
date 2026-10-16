"use strict";
/* Tooltip bersama (public/inti): #tip, wadahTip, rapikanTip, pasangTip (handler [data-tip]). Butuh format.js ($, esc).
   Tip.polaSatu: ekspresi reguler "angka + satuan" untuk tooltip satu-baris yang diubah jadi label pil; diisi halaman (bawaan: mati). */
const Tip = {polaSatu: null};
/* dialog modal ada di lapisan teratas: tooltip harus ikut masuk ke dialog yang sedang terbuka supaya terlihat */
const wadahTip = () => { const t = $("#tip"), w = document.querySelector("dialog[open]") || document.body; if (t.parentNode !== w) w.appendChild(t); return t; };
/* tooltip bersama untuk semua grafik [data-tip] */
/* data-tip teks bebas → kepala + baris rapi: "label: nilai" jadi dua kolom, baris yang diawali angka jadi angka besar */
function rapikanTip(h, polaSatu = Tip.polaSatu) {
  if (h.includes("<div")) return h;
  const m = h.match(/^<b>(.*?)<\/b>(.*?)(?:<br>|$)([\s\S]*)$/); if (!m) return h;
  const sub = m[2].replace(/^\s*·\s*/, "").trim(), baris = m[3].split(/<br>/).map(x => x.trim()).filter(Boolean);
  /* satu angka saja (cocok dengan Tip.polaSatu, diatur halaman): judul dan angka sebaris, angka jadi label pil */
  const n1 = baris.length === 1 && polaSatu && baris[0].match(polaSatu);
  if (n1) return `<div class="tp2-h tp2-1 tp2-only"><b>${m[1]}</b><span class="tp2-pil">${n1[1]}</span></div>`;
  /* satu pasangan "label: nilai" saja: nilai jadi angka besar, label di bawahnya */
  const k1 = baris.length === 1 && baris[0].match(/^([^:<]{1,40}):\s*(.+)$/);
  const subH = sub ? (/el ni[ñn]o/i.test(sub) ? `<span class="tp2-en">${sub}</span>` : `<small>${sub}</small>`) : "";
  if (k1) return `<div class="tp2-h tp2-hr"><b>${m[1]}</b>${subH}</div><div class="tp2-n tp2-c"><b>${k1[2]}</b><span>${k1[1]}</span></div>`;
  if (!baris.length) return `<div class="tp2-h tp2-hr tp2-only"><b>${m[1]}</b>${subH}</div>`;
  let o = `<div class="tp2-h"><b>${m[1]}</b>${subH}</div>`, kv = "";
  baris.forEach((b, i) => { const k = b.match(/^([^:<]{1,40}):\s*(.+)$/), n = b.match(/^([\d.,−+-]+(?:\s?(?:rb|jt|%|×))?)\s+(.+)$/);
    if (k) kv += `<span>${k[1]}</span><b${/^\s*▲/.test(k[2]) ? ' class="naik"' : /^\s*▼/.test(k[2]) ? ' class="turun"' : ""}>${k[2]}</b>`;
    else { if (kv) { o += `<div class="tp2-kv">${kv}</div>`; kv = ""; }
      o += n && i === 0 ? `<div class="tp2-n"><b>${n[1]}</b><span>${n[2]}</span></div>` : `<div class="tp2-t">${b}</div>`; } });
  if (kv) o += `<div class="tp2-kv">${kv}</div>`;
  return o;
}
function pasangTip() { const t = $("#tip");
  document.addEventListener("pointerover", e => { const x = e.target.closest?.("[data-tip]"); if (!x) return t.classList.remove("on"); wadahTip(); t.innerHTML = rapikanTip(x.dataset.tip.replace(/<br>\s*klik untuk[^<]*/gi, "")); t.classList.remove("kartu"); t.classList.add("on"); });
  document.addEventListener("pointermove", e => { if (!t.classList.contains("on")) return; const w = t.offsetWidth, hh = t.offsetHeight;
    t.style.left = Math.min(innerWidth - w - 8, e.clientX + 14) + "px"; t.style.top = Math.max(8, e.clientY - hh - 12) + "px"; });
  document.addEventListener("scroll", () => t.classList.remove("on"), true); }
