"use strict";
/* Alat kecil halaman (adaptor): inti/format.js hanya memberi $, fmt, esc, jamWIB; yang di bawah ini masih tinggal inline di banjir/index.html
   dan karhutla. Pindah ke inti/ bila ketiganya mau berbagi. */
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };
const simpanLokal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const bacaLokal = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
async function muatJSON(u) { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
{ const t = bacaLokal("pb-tema", null); if (t) document.documentElement.dataset.theme = t; }
