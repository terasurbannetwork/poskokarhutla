/* Bahasa EN / ID tanpa menulis ulang modul: UI tetap ditulis dalam bahasa Indonesia, lalu di mode EN tiap simpul teks dan atribut
   (title, aria-label, placeholder, alt, data-tip) diterjemahkan sesudah dirender lewat MutationObserver.
   - Kamus i18n/en.json dimuat HANYA saat EN aktif: {kamus: {"teks ID": "EN"}, pola: [["^regex$", "ganti $1"], ...]}.
   - Angka di dalam teks diganti {0},{1},… sebelum dicari, jadi "123 titik panas" dan "4.567 titik panas" memakai satu entri.
   - Format angka/tanggal: toLocaleString("id-ID") jadi "en-GB" (1,234.5 dan 14 Oct 21:20) saat EN — semua fmt/jamWIB ikut.
   - Isi buatan pengguna/pihak ketiga dilewati: [data-no-i18n], [translate=no], teks Lapor Warga. Tautan eksternal (judul berita/video)
     hanya diganti dari data/berita_en.json (terjemahan mesin per judul, dibuat scripts/data/berita.py), tidak lewat kamus.
   Pengamat bekerja di microtask (sebelum cat): tidak ada kilatan teks Indonesia dan tidak ada baca-tata-letak, jadi tidak ada layout thrash.
   Dimuat paling awal di <head> (sinkron) supaya tambalan locale berlaku sebelum modul lain berjalan. */
(() => {
  "use strict";
  const KUNCI = "pb-bahasa", src = document.currentScript?.src || location.href;
  const baca = () => { try { return localStorage.getItem(KUNCI); } catch (e) { return null; } };
  const simpan = v => { try { localStorage.setItem(KUNCI, v); } catch (e) {} };
  const sah = v => v === "en" || v === "id" ? v : null;
  const prm = sah(new URLSearchParams(location.search).get("lang"));
  if (prm) simpan(prm);
  let B = prm || sah(baca()) || (/^en\b/i.test(navigator.language || "") ? "en" : "id");
  document.documentElement.lang = B;

  /* ---------- angka & tanggal: id-ID -> en-GB saat EN (en-GB = 1,234.5 seperti en-US, tetapi jam 24 dan "14 Oct" seperti id) */
  const lok = l => B === "en" && (l === "id-ID" || l === "id") ? "en-GB" : l;
  for (const [P, fs] of [[Number.prototype, ["toLocaleString"]], [Date.prototype, ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"]]])
    for (const f of fs) { const asli = P[f]; P[f] = function (l, o) { return asli.call(this, lok(l), o); }; }
  for (const k of ["NumberFormat", "DateTimeFormat"]) { const A = Intl[k];
    const W = function (l, o) { return new A(lok(l), o); }; W.prototype = A.prototype; W.supportedLocalesOf = A.supportedLocalesOf; Intl[k] = W; }

  /* ---------- penerjemah */
  let KAMUS = null, POLA = [], CACHE = new Map(), JUDUL = {};
  const HILANG = new Map();   // teks yang belum ada padanannya (dibaca scripts/i18n/kumpul.mjs)
  /* token angka: "Rp1,2 T", "12,3 rb", "45%", "2.345" (setelah tambalan locale, angka EN berformat 1,234.5) */
  const ANGKA = /(?:Rp\s?)?[−-]?\d[\d.,]*(?:\s?%)?(?:\s(?:rb|jt|M|T)(?![\w]))?/g;
  const SKALA = {rb: ["k", " thousand"], jt: ["M", " million"], M: [" bn", " billion"], T: [" tn", " trillion"]};
  const angkaEN = t => { const rp = /^Rp\s?/.test(t), m = t.replace(/^Rp\s?/, "").match(/^(.*?)(?:\s(rb|jt|M|T))?$/), s = m[2];
    if (!rp && (s === "M" || s === "T")) return t;   // "5 M" tanpa Rp bisa berarti meter: biarkan
    return (rp ? "IDR " : "") + desimal(m[1]) + (s ? SKALA[s][rp ? 1 : 0] : ""); };
  /* angka yang diketik di teks sumber berformat Indonesia ("1,5 km", "1.234,5"): koma + 1–2 angka di ujung tidak pernah dihasilkan en-GB, jadi aman ditukar */
  const desimal = x => x.replace(/^([−-]?)(\d{1,3}(?:\.\d{3})*|\d+),(\d{1,2})(?!\d)/, (_, sg, bul, pec) => sg + Number(bul.replace(/\./g, "")).toLocaleString("en-GB") + "." + pec);
  /* token bisa membawa koma/titik penutup ("119," dari "di 119, mengecil"); bila terjemahan sudah memuat tanda yang sama, jangan digandakan */
  const isi = (tpl, tok) => tpl.replace(/\{(\d+)\}([.,]?)/g, (_, i, nx) => { if (tok[i] == null) return nx; let v = angkaEN(tok[i]);
    if (nx && v.endsWith(nx)) v = v.slice(0, -1); return v + nx; });
  const kapital = s => s.charAt(0).toUpperCase() + s.slice(1);

  function cari(t) {
    let v = KAMUS[t]; if (v != null) return v;
    const tok = []; const kunci = t.replace(ANGKA, m => (tok.push(m), "{" + (tok.length - 1) + "}"));
    if (tok.length && (v = KAMUS[kunci]) != null) return isi(v, tok);
    if (tok.length && !/\p{L}{2}/u.test(kunci.replace(/\{\d+\}/g, ""))) return isi(kunci, tok);   // hanya angka ("14,6 jt", "Rp3 M"): satuannya saja yang diganti
    for (const [re, ganti] of POLA) { const m = t.match(re); if (!m) continue;
      const r = ganti.replace(/\$(\d)/g, (_, i) => m[i] == null ? "" : terj(m[i], false)); if (r !== t) return r; }
    /* huruf besar/kecil: "Titik panas" vs "titik panas", "TITIK PANAS" */
    const kc = t.charAt(0).toLowerCase() + t.slice(1);
    if (kc !== t && (v = KAMUS[kc] ?? (tok.length ? KAMUS[kunci.charAt(0).toLowerCase() + kunci.slice(1)] : null)) != null) return kapital(tok.length ? isi(v, tok) : v);
    if (t.length > 1 && t === t.toUpperCase() && /[A-Z]{3}/.test(t)) { const k2 = kapital(t.toLowerCase()); if (k2 !== t) { const r = terj(k2, false); if (r !== k2) return r.toUpperCase(); } }
    /* tanda baca ujung: "Sumber:" -> "Source:", "· Data" , "(perkiraan)" */
    const m = t.match(/^([·•(\[–—:\s]*)(.*?)([:.,;·•)\]–—\s…]*)$/s);
    if (m && (m[1] || m[3]) && m[2]) { const r = terj(m[2], false); if (r !== m[2]) return m[1] + r + m[3]; }
    return null;
  }
  /* teks utuh -> terjemahan, spasi depan/belakang dipertahankan; tanpa padanan = apa adanya (dicatat di HILANG) */
  function terj(s, catat = true) {
    if (B !== "en" || !KAMUS || typeof s !== "string") return s;
    const t = s.trim().replace(/\s+/g, " "); if (!t || !/\p{L}{2}/u.test(t)) return s;   // spasi/baris baru di dalam teks HTML tidak bermakna
    let r = CACHE.get(t);
    if (r === undefined) { r = cari(t); CACHE.set(t, r); }
    if (r == null) { if (catat && !HILANG.has(t)) HILANG.set(t, location.pathname); return s; }
    return s.match(/^\s*/)[0] + r + s.match(/\s*$/)[0];
  }

  /* ---------- DOM: simpul teks + atribut; asli disimpan supaya kembali ke ID tanpa muat ulang */
  const LEWATI = "script,style,noscript,code,pre,textarea,[data-no-i18n],[translate=no],.maplibregl-ctrl-attrib,.lw-teks,.lw-k-teks";
  const ATR = ["title", "aria-label", "placeholder", "alt", "data-tip"];
  const ASLI = new WeakMap(), ASLI_ATR = new WeakMap(), TIP = new Map();
  const LUAR = "a[href^='http'][target=_blank]";
  const dilewati = el => !el || el.closest?.(LEWATI);
  function teks(n) {
    const v = n.data, r = ASLI.get(n); if (r && v === r[1]) return;
    const t = n.parentElement?.closest(LUAR) ? (B === "en" && JUDUL[v.trim()]) || v : terj(v);
    if (t !== v) { n.data = t; ASLI.set(n, [v, t]); }
  }
  const tipHTML = h => { let r = TIP.get(h); if (r == null) { const tp = document.createElement("template"); tp.innerHTML = h; jalan(tp.content); r = tp.innerHTML; TIP.set(h, r); } return r; };
  function atribut(el, a) {
    const v = el.getAttribute(a); if (v == null || el.closest(LUAR)) return;
    let rec = ASLI_ATR.get(el); if (rec?.[a] && rec[a][1] === v) return;
    const t = a === "data-tip" ? (/[<&]/.test(v) ? tipHTML(v) : terj(v)) : terj(v);
    if (t !== v) { el.setAttribute(a, t); if (!rec) ASLI_ATR.set(el, rec = {}); rec[a] = [v, t]; }
  }
  const SARING = {acceptNode: n => n.nodeType === 1 && n.matches(LEWATI) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT};
  function jalan(root) {
    if (root.nodeType === 3) { if (!dilewati(root.parentElement)) teks(root); return; }
    if (root.nodeType === 1) { if (dilewati(root)) return; for (const a of ATR) atribut(root, a); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, SARING);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeType === 3) teks(n); else for (const a of ATR) if (n.hasAttribute(a)) atribut(n, a);
  }
  function pulihkan(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) { const r = ASLI.get(n); if (r && n.data === r[1]) n.data = r[0]; ASLI.delete(n); continue; }
      const rec = ASLI_ATR.get(n); if (!rec) continue;
      for (const a in rec) if (n.getAttribute(a) === rec[a][1]) n.setAttribute(a, rec[a][0]); ASLI_ATR.delete(n);
    }
  }
  const OPSI = {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATR};
  const pengamat = new MutationObserver(rs => {
    pengamat.disconnect();   // tulisan kita sendiri tidak memicu pengamat lagi
    try {
      for (const r of rs) {
        if (r.type === "childList") { for (const n of r.addedNodes) if (n.isConnected) jalan(n); }
        else if (r.type === "characterData") { if (!dilewati(r.target.parentElement)) teks(r.target); }
        else if (!dilewati(r.target)) atribut(r.target, r.attributeName);
      }
    } finally { pengamat.observe(document.documentElement, OPSI); }
  });
  const terjemahSemua = () => { pengamat.disconnect(); jalan(document.documentElement); pengamat.observe(document.documentElement, OPSI); };

  /* ---------- kamus: hanya diambil saat EN */
  let janji = null;
  /* judul berita terjemahan mesin: gagal = judul tetap bahasa Indonesia */
  const muatJudul = () => fetch(new URL("data/berita_en.json", src), {cache: "no-cache"}).then(r => r.ok ? r.json() : {}).then(d => { JUDUL = d; }, () => {});
  const muatKamus = () => janji ||= Promise.all([fetch(new URL("i18n/en.json?v=2", src)).then(r => r.ok ? r.json() : Promise.reject(r.status)), muatJudul()]).then(([d]) => {
    KAMUS = d.kamus || {}; POLA = (d.pola || []).map(([re, g]) => [new RegExp(re, "su"), g]); CACHE = new Map(); TIP.clear();
  }).catch(e => { janji = null; KAMUS = KAMUS || {}; console.warn("i18n/en.json", e); });

  /* ---------- kanvas (gambar bagikan): teks yang digambar ikut diterjemahkan saat EN */
  for (const f of ["fillText", "strokeText", "measureText"]) { const P = CanvasRenderingContext2D.prototype, asli = P[f];
    P[f] = function (t, ...a) { return asli.call(this, B === "en" && KAMUS ? terj(String(t)) : t, ...a); }; }

  /* ---------- MapLibre: kontrol bawaan (Zoom in, Map, "Use ⌘ + scroll…") ditulis dalam bahasa Indonesia seperti UI lain;
     di mode EN penerjemah DOM mengembalikannya lewat kamus, jadi bolak-balik ID/EN tanpa muat ulang tetap satu bahasa.
     maplibre-gl dimuat sesudah berkas ini: kelas Map dibungkus saat pustaka memasang window.maplibregl. */
  const LOK_PETA = {"Map.Title": "Peta", "NavigationControl.ZoomIn": "Perbesar", "NavigationControl.ZoomOut": "Perkecil", "NavigationControl.ResetBearing": "Arahkan ke utara",
    "FullscreenControl.Enter": "Layar penuh", "FullscreenControl.Exit": "Keluar dari layar penuh", "GeolocateControl.FindMyLocation": "Cari lokasi saya",
    "GeolocateControl.LocationNotAvailable": "Lokasi tidak tersedia", "AttributionControl.ToggleAttribution": "Buka/tutup atribusi", "AttributionControl.MapFeedback": "Masukan peta",
    "LogoControl.Title": "Logo MapLibre", "Marker.Title": "Penanda peta", "Popup.Close": "Tutup popup", "CooperativeGesturesHandler.WindowsHelpText": "Gunakan Ctrl + gulir untuk memperbesar peta",
    "CooperativeGesturesHandler.MacHelpText": "Gunakan ⌘ + gulir untuk memperbesar peta", "CooperativeGesturesHandler.MobileHelpText": "Gunakan dua jari untuk menggeser peta"};
  let mlg;
  try { Object.defineProperty(window, "maplibregl", {configurable: true, get: () => mlg, set: v => {
    if (v?.Map && !v.Map.__bhs) try { const A = v.Map, W = class extends A { constructor(o) { super({...o, locale: {...LOK_PETA, ...o?.locale}}); } }; W.__bhs = 1; v.Map = W; } catch (e) {}
    mlg = v; }}); } catch (e) {}

  /* ---------- URL: ?lang=en ikut di tiap replaceState/pushState (bukaTab menulis ulang path) */
  const urlBahasa = u => { const x = new URL(u ?? location.href, location.href);
    if (B === "en") x.searchParams.set("lang", "en"); else x.searchParams.delete("lang"); return x.pathname + x.search + x.hash; };
  for (const f of ["replaceState", "pushState"]) { const asli = history[f].bind(history);
    history[f] = (st, j, u) => asli(st, j, u == null ? u : urlBahasa(u)); }

  /* ---------- tombol EN / ID */
  const gaya = document.createElement("style");
  /* toggle pil teks ID / EN tanpa bendera (pemilik, 15 Okt 2026) */
  gaya.textContent = `.bhs{display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:rgb(255 255 255 / .14);box-shadow:inset 0 0 0 1px rgb(255 255 255 / .28);font:700 12px/1 Inter,system-ui,sans-serif;color:inherit;margin-right:6px;white-space:nowrap}
.bhs button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;opacity:.75;transition:background .15s,opacity .15s}
.bhs button:hover{opacity:1}
.bhs button[aria-pressed=true]{background:#fff;color:#0b2545;opacity:1}
.bhs button:focus-visible{outline:2px solid currentColor;outline-offset:2px;border-radius:3px}
.bhs.lepas{position:fixed;top:10px;right:12px;z-index:60;background:var(--card,#fff);color:var(--ink,#14213d);padding:4px 10px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.12)}
@media (max-width:640px){.bhs{font-size:11.5px;gap:2px;margin-right:0}}
html[data-i18n-muat] body>header,html[data-i18n-muat] main{opacity:0}`;
  document.head.appendChild(gaya);
  function pasangTombol() {
    if (document.querySelector(".bhs")) return segarTombol();
    const el = document.createElement("div"); el.className = "bhs"; el.setAttribute("role", "group"); el.setAttribute("aria-label", "Language / Bahasa"); el.translate = false;
    el.innerHTML = `<button type="button" data-b="id" lang="id" title="Bahasa Indonesia">ID</button><button type="button" data-b="en" lang="en" title="English">EN</button>`;
    const wadah = document.querySelector("header .stat") || document.querySelector("header.top, body > header");
    if (wadah) wadah.prepend(el); else { el.classList.add("lepas"); document.body.appendChild(el); }
    el.addEventListener("click", e => { const b = e.target.closest("button"); if (b) ganti(b.dataset.b); });
    segarTombol();
  }
  /* bahasa diganti di dokumen lain (iframe Tentang, tab lain): ikut tanpa muat ulang */
  addEventListener("storage", e => { if (e.key === KUNCI) ganti(e.newValue); });
  const segarTombol = () => document.querySelectorAll(".bhs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.b === B)));

  async function ganti(b) {
    if (!sah(b) || b === B) return;
    B = b; simpan(b); document.documentElement.lang = b; segarTombol();
    try { history.replaceState(history.state, "", location.href); } catch (e) {}
    if (b === "en") { await muatKamus(); if (B !== "en") return; terjemahSemua(); }
    else { pengamat.disconnect(); pulihkan(document.documentElement); }
    /* render ulang tab aktif supaya angka/tanggal ikut format bahasa baru */
    const tab = document.querySelector(".page.on")?.id?.replace(/^p-/, "");
    if (tab && typeof window.bukaTab === "function") try { window.bukaTab(tab, false); } catch (e) { console.warn("bukaTab", e); }
    dispatchEvent(new CustomEvent("bahasa", {detail: b}));
  }

  /* API untuk modul lain dan crawler */
  Object.defineProperty(window, "BAHASA", {get: () => B, configurable: true});
  window.T = s => terj(s);
  window.T.ganti = ganti;
  window.T.hilang = HILANG;
  window.T.kunci = t => { let i = 0; return t.replace(ANGKA, () => "{" + i++ + "}"); };
  window.T.siap = () => B === "en" ? muatKamus() : Promise.resolve();

  if (B === "en") {
    document.documentElement.setAttribute("data-i18n-muat", "");
    const buka = () => document.documentElement.removeAttribute("data-i18n-muat");
    setTimeout(buka, 1500);   // kamus lambat/gagal: tampilkan saja dalam bahasa Indonesia
    muatKamus().then(() => { if (document.body) terjemahSemua(); else document.addEventListener("DOMContentLoaded", terjemahSemua, {once: true}); }).finally(buka);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasangTombol, {once: true}); else pasangTombol();
})();
