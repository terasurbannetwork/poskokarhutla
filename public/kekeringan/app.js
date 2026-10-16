"use strict";
/* Halaman Kekeringan: keadaan bersama, tab, pemuatan data. Mesin kartu/tip/tabel dari public/inti; data dari scripts/kekeringan/status.py
   (public/data/kekeringan_{meta,grid,wilayah,tren}.json). Semua angka berlabel "Deteksi Pantau Bencana": BMKG hanya menerbitkan peta gambar. */
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };
const simpanLokal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const bacaLokal = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
async function muatJSON(u) { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }
/* dua desimal lewat toLocaleString supaya i18n.js menukar koma jadi titik di EN */
const F2 = x => Number(x).toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2}).replace("-", "−");   /* minus U+2212, sama dengan sumbu dan legenda */
/* judul dan teks bagikan: ribu/juta ditulis penuh, bukan rb/jt (pola jt() di banjir/dampak.js) */
const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
const F1 = x => Number(x).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAS = i => BLN[Math.floor(i / 3)] + " " + ["I", "II", "III"][i % 3];
const bulanPanjang = ym => { const [y, m] = ym.split("-"); return BLN[m - 1] + " " + y; };
const BLN_PENUH = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
/* bulan SPI ("Agustus 2026"): SPI tertinggal ~6 minggu dari hari ini, jadi selalu disebut di samping angkanya */
const spiBulan = () => { const b = S.meta?.spi?.bulan; return b ? BLN_PENUH[b.slice(5) - 1] + " " + b.slice(0, 4) : ""; };
/* kategori SPI menurut WMO/McKee; Waspada/Siaga/Awas hanya untuk status gabungan */
const katSpi = s => s == null ? "" : s <= -2 ? "Kering ekstrem (curah hujan)" : s <= -1.5 ? "Sangat kering" : s <= -1 ? "Agak kering" : s < 1 ? "Normal" : "Basah";
const tglPendek = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});

/* Tingkat mengikuti istilah BNPB/BPBD; "Awas" di halaman ini disebut Awas (bukan "kering ekstrem": itu kategori SPI) */
const LEVEL = ["Normal", "Waspada", "Siaga", "Awas"], WARNA_LV = ["#5a9e74", "#e3b94e", "#e58a45", "#c9503a"], FG_LV = ["#fff", "#3b2e00", "#fff", "#fff"];
const NAVY = "oklch(25.5% .075 256)", MERAH = "#c9503a", JINGGA = "#e58a45", KUNING = "#e3b94e", BIRU = "#4f8fc4";
const S = {meta: null, grid: null, wil: null, tren: null, iklim: null, geo: {prov: null, kab: {}}, jalur: [], mode: "status", fiturWil: []};
const namaProv = k => S.meta?.provinsi?.[k] ?? k;
/* jumlah wilayah per tingkat TEPAT (kab_n di berkas kumulatif: >= waspada, >= siaga, >= awas) */
const tepat = n => [n[0] - n[1], n[1] - n[2], n[2]];   /* [waspada, siaga, awas] */
const pill = l => `<span class="pill l${l}">${LEVEL[l]}</span>`;

const TABS = [["peta", "Peta"], ["insight", "Insight"], ["tren", "Tren"], ["tentang", "Tentang"], ["metode", "Metode"]];
const TAB_SEMBUNYI = new Set(["metode"]);   /* ada, tapi tidak di menu (A24); Berita/Dampak/Foto menunggu isinya (A18) */
const IK_TAB = {peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', insight: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', tren: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  tentang: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
const halamanAda = id => !!$("#p-" + id);
function bukaTab(id, dorong = true) {
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.t === id ? "page" : "false"));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + id));
  if (dorong) history.replaceState(null, "", "/kekeringan/" + id);   /* tautan bersih tanpa tagar; worker mengarahkan jalur ini ke index.html */
  nanti(() => { if (id === "peta" && peta) peta.resize();
    if (id === "tentang") { const f = $("#tentangBingkai"); if (!f.src) { f.style.opacity = 0; f.src = "/tentang.html?tertanam=1"; } }
    ({insight: Insight, tren: Tren, metode: Metode})[id]?.render(); });
}
{ const tb = ([k, n]) => `<button data-t="${k}" aria-current="${k === "peta" ? "page" : "false"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_TAB[k] || ""}</svg>${n}</button>`;
  $("#tabs").innerHTML = TABS.filter(t => !TAB_SEMBUNYI.has(t[0])).map(tb).join("");
  const hd = $("header.top"), bg = $("#burger"), atur = v => { hd.classList.toggle("buka", v); bg.setAttribute("aria-expanded", v); };
  bg.onclick = e => { e.stopPropagation(); atur(!hd.classList.contains("buka")); };
  document.addEventListener("click", e => { if (hd.classList.contains("buka") && !e.target.closest("#tabs")) atur(false); });
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; bukaTab(b.dataset.t); atur(false); }); }
const temaAwal = bacaLokal("pb-tema", null); if (temaAwal) document.documentElement.dataset.theme = temaAwal;
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; simpanLokal("pb-tema", t); nanti(() => peta && peta.setStyle(DASAR(), {diff: false})); };

/* ---------- data */
async function muatData() {
  const [meta, grid, wil, tren, prov] = await Promise.all([muatJSON("../data/kekeringan_meta.json"), muatJSON("../data/kekeringan_grid.json"), muatJSON("../data/kekeringan_wilayah.json"),
    muatJSON("../data/kekeringan_tren.json").catch(() => null), muatJSON("../geo/provinsi.json")]);
  Object.assign(S, {meta, grid, wil, tren}); S.geo.prov = prov;
  muatJSON("../data/iklim.json").then(d => { S.iklim = d; if ($("#p-insight").classList.contains("on")) Insight.render(); }).catch(() => {});
  $("#upd").textContent = "Data " + jamWIB(meta.dibuat);
}
