"use strict";
/* Kerangka halaman gunung api: util, state, tab, tema, muat data, bagikan. Format ($, fmt, esc, jamWIB, rb) dari inti/format.js. */
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };
const simpanLokal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const bacaLokal = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
async function muatJSON(u) { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }

/* Level resmi PVMBG apa adanya: nama dan angka romawi dari MAGMA. Warna sama dengan tingkat di public/bencana.json (abu untuk Normal: bukan pernyataan bebas bahaya). */
const LEVEL = {1: ["I", "Normal"], 2: ["II", "Waspada"], 3: ["III", "Siaga"], 4: ["IV", "Awas"]};
const WARNA_LV = {1: "#9aa4b2", 2: "#e0b400", 3: "#e8743b", 4: "#d64545"};
const FG_LV = {1: "#fff", 2: "#3b2e00", 3: "#fff", 4: "#fff"};
const IK_GN = '<path d="M3 20 9 9h6l6 11z"/><path d="M12 9V6M9.5 5l-1-2M14.5 5l1-2"/>';
/* label pil berwarna + ikon gunung (A3) */
const pilLv = (l, pendek = false) => `<span class="pl lvp" style="--w:${WARNA_LV[l]}"><svg viewBox="0 0 24 24" aria-hidden="true">${IK_GN}</svg>${pendek ? LEVEL[l][1] : `Level ${LEVEL[l][0]} ${LEVEL[l][1]}`}</span>`;
const tglJam = t => new Date(t).toLocaleString("id-ID", {...WIB, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "").replace(/\./g, ":") + " WIB";

const S = {st: null, level: 0, q: ""};   /* level 0 = semua */
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";

/* ================================================================ tab */
const TABS = [["peta", "Peta"], ["insight", "Insight"], ["metode", "Metode"], ["tentang", "Tentang"]];
const IK_TAB = {peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', insight: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  metode: '<path d="M4 5h16M4 12h16M4 19h10"/>', tentang: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
function bukaTab(id, dorong = true) {
  if (!TABS.some(t => t[0] === id)) id = "peta";
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.t === id ? "page" : "false"));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + id));
  /* tautan bersih tanpa tagar: /gunungapi/insight (worker mengarahkan jalur ini ke index.html) */
  if (dorong) history.replaceState(null, "", "/gunungapi/" + id);
  nanti(() => { if (id === "peta" && peta) peta.resize();
    if (id === "tentang") { const f = $("#tentangBingkai"); if (!f.src) { f.style.opacity = 0; f.src = "/tentang.html?tertanam=1"; } }
    ({insight: Insight, metode: Metode})[id]?.render(); });
}
{ $("#tabs").innerHTML = TABS.map(([k, n]) => `<button data-t="${k}" aria-current="${k === "peta" ? "page" : "false"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_TAB[k]}</svg>${n}</button>`).join("");
  const hd = $("header.top"), bg = $("#burger"), atur = v => { hd.classList.toggle("buka", v); bg.setAttribute("aria-expanded", v); };
  bg.onclick = e => { e.stopPropagation(); atur(!hd.classList.contains("buka")); };
  document.addEventListener("click", e => { if (hd.classList.contains("buka") && !e.target.closest("#tabs")) atur(false); });
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; bukaTab(b.dataset.t); atur(false); }); }

/* ================================================================ tema */
const temaAwal = bacaLokal("pb-tema", null); if (temaAwal) document.documentElement.dataset.theme = temaAwal;
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; simpanLokal("pb-tema", t); nanti(() => peta && peta.setStyle(DASAR(), {diff: false})); };
/* ================================================================ data */
async function muatData() {
  const st = await muatJSON("../data/gunungapi_status.json");
  if (!st.gunung?.length) throw new Error("data gunung api kosong");
  S.st = st; $("#upd").textContent = "Data " + jamWIB(st.dibuat);
  /* hitungan dari daftar, bukan dari tulisan pada berkas: satu sumber kebenaran */
  S.n = {1: 0, 2: 0, 3: 0, 4: 0}; st.gunung.forEach(g => S.n[g.level]++);
}
