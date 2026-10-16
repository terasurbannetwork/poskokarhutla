"use strict";
/* Inti halaman /udara/: util, kategori ISPU, state, tab, tema, muat data. $, fmt, esc, jamWIB, rb ada di inti/format.js. */
const tglPendek = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"});
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };
const simpanLokal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const bacaLokal = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
async function muatJSON(u) { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }
const gradasi = (st, v) => { for (let k = 1; k < st.length; k++) if (v <= st[k][0]) { const [a, ca] = st[k - 1], [b, cb] = st[k], t = (v - a) / (b - a);
  return ca.map((c, j) => Math.round(c + (cb[j] - c) * t)); } return st[st.length - 1][1]; };

/* ================================================================ kategori
   Titik potong PM2,5 rata-rata 24 jam Permen LHK P.14/2020 (sama dengan scripts/udara/kualitas.py BATAS); nama dan warna dari public/bencana.json. */
const BATAS = [15.5, 55.4, 150.4, 250.4];
const KAT = [{n: "Baik", w: "#5a9e74", fg: "#fff", r: "0 sampai 15,5"}, {n: "Sedang", w: "#e3b94e", fg: "#3b2e00", r: "15,6 sampai 55,4"},
  {n: "Tidak sehat", w: "#e8743b", fg: "#fff", r: "55,5 sampai 150,4"}, {n: "Sangat tidak sehat", w: "#d64545", fg: "#fff", r: "150,5 sampai 250,4"}, {n: "Berbahaya", w: "#8a2be2", fg: "#fff", r: "di atas 250,4"}];
const kat = v => BATAS.reduce((n, b) => n + (v > b), 0);
const pilKat = c => `<span class="kt" style="--c:${KAT[c].w};--f:${KAT[c].fg}">${KAT[c].n}</span>`;
const jiwa = v => rb(v) + " jiwa";
/* gradasi warna peta PM2,5 (µg/m³ -> rgba): hijau samar sampai ungu pekat, titik beloknya batas kategori */
const ST_PM = [[0, [90, 158, 116, 0]], [15.5, [90, 158, 116, 85]], [35, [227, 185, 78, 150]], [55.4, [232, 116, 59, 185]], [150, [214, 69, 69, 210]], [250, [138, 43, 226, 225]], [500, [80, 15, 140, 235]]];
/* jarak pandang METAR (m): ICAO kabut < 1000 m, kabut tipis/asap tipis < 5000 m */
const JP = [{n: "Jernih (8 km atau lebih)", w: "#5a9e74", min: 8000}, {n: "Agak berkabut (5 sampai 8 km)", w: "#e3b94e", min: 5000}, {n: "Berkabut atau berasap (1,5 sampai 5 km)", w: "#e8743b", min: 1500}, {n: "Sangat pekat (di bawah 1,5 km)", w: "#d64545", min: 0}];
const kelasJP = v => JP.findIndex(j => v >= j.min);
const WX = {FU: "asap", HZ: "kabut asap kering (haze)", BR: "kabut tipis", FG: "kabut", DU: "debu"};
const wxNama = w => (w || "").split(/\s+/).map(t => WX[t.replace(/^[+-]|^VC/, "")]).filter(Boolean).join(", ");
const MAKS_JAM_METAR = 12;   /* laporan METAR lebih tua dari ini dibuang (A18), bukan ditampilkan basi */

/* ================================================================ state */
const S = {uk: null, asap: null, metar: [], geo: null, hari: 0, sel: null, rw: null, bbProv: {}, maksJam: MAKS_JAM_METAR};
const namaProv = k => S.uk?.nama_prov?.[k] ?? k;
/* indeks sel asap: "lat,lon" -> baris; rata/maks per hari */
const sel = (la, lo) => S.sel.get((Math.floor(la) + .5) + "," + (Math.floor(lo) + .5));
const ROW = {maks: 2, rata: 6, pm10: 7};

/* ================================================================ tab */
const TABS = [["peta", "Peta"], ["insight", "Insight"], ["metode", "Metode"]];
const IK_TAB = {peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', insight: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', metode: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
function bukaTab(id, dorong = true) {
  if (!TABS.some(t => t[0] === id)) id = "peta";
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.t === id ? "page" : "false"));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + id));
  if (dorong) history.replaceState(null, "", "/udara/" + id);   /* tautan bersih tanpa tagar; worker melayani index.html untuk jalur ini */
  nanti(() => { if (id === "peta" && peta) peta.resize(); ({insight: Insight, metode: Metode})[id]?.render(); });
}
{ const tb = ([k, n]) => `<button data-t="${k}" aria-current="${k === "peta" ? "page" : "false"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_TAB[k]}</svg>${n}</button>`;
  $("#tabs").innerHTML = TABS.map(tb).join("");
  const hd = $("header.top"), bg = $("#burger"), atur = v => { hd.classList.toggle("buka", v); bg.setAttribute("aria-expanded", v); };
  bg.onclick = e => { e.stopPropagation(); atur(!hd.classList.contains("buka")); };
  document.addEventListener("click", e => { if (hd.classList.contains("buka") && !e.target.closest("#tabs")) atur(false); });
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; bukaTab(b.dataset.t); atur(false); }); }
const temaAwal = bacaLokal("pb-tema", null); if (temaAwal) document.documentElement.dataset.theme = temaAwal;
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; simpanLokal("pb-tema", t); nanti(() => peta && peta.setStyle(DASAR(), {diff: false})); };
/* ================================================================ data */
async function muatData() {
  const [uk, asap, geo] = await Promise.all([muatJSON("../data/udara_kualitas.json"), muatJSON("../data/asap.json"), muatJSON("../geo/provinsi.json")]);
  Object.assign(S, {uk, asap, geo});
  S.sel = new Map(asap.grid.map(r => [r[0] + "," + r[1], r]));
  /* METAR dan riwayat boleh tidak ada: kartu dan lapisannya dibuang */
  S.metar = await muatJSON("../data/metar.json").catch(() => []);
  S.rw = await muatJSON("../data/udara_kualitas_riwayat.json").catch(() => null);
  $("#upd").textContent = "Data " + jamWIB(uk.dibuat);
}
/* stasiun METAR segar (laporan <= maksJam jam, jarak pandang terbaca) */
const metarSegar = () => S.metar.filter(m => m.vis_m != null && (Date.now() - new Date(m.waktu)) / 36e5 <= S.maksJam);
