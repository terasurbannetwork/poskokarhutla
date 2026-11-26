/* /potensi: cangkang. Pil tab tengah; SATU MapLibre dipakai tab peta (ganti tab = ganti lapis, peta tidak dimuat ulang); tab baca membuka wadah halaman.
   Modul tab: /potensi/<tab>.js dengan pasang(ctx); boleh mengembalikan { aktif(on) } untuk menyalakan/mematikan lapisnya.
   ctx = { tab, panel, bawah, state, ubah(patch), petaBersama(), pasangPeta(fn), padPeta(), kotakIndonesia() }.
   Alamat: #status?b=bnj&h=ringkas&kab=3501 (tab, bahaya, hari, kab). INP: pil berubah sinkron, modul dan isi berat ditunda. */
import { muatMapLibre } from "/inti/maplibre.js";
import { nanti } from "/potensi/umum.js";

const TAB = [
  { k: "status", n: "Status", peta: 1, ik: '<path d="M12 3 3 8v1h18V8zM5 11v6M10 11v6M14 11v6M19 11v6M3 20h18"/>' },
  { k: "dampak", n: "Dampak", peta: 1, ik: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 11a3 3 0 1 0 0-6M17 14c2.5.4 4 2.4 4 5"/>' },
  { k: "iklim", n: "Iklim", peta: 1, ik: '<path d="M7 18a5 5 0 1 1 1.2-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/>' },
  { k: "analisis", n: "Analisis", ik: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },
  { k: "lapisan", n: "Lapisan", ik: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>' },
  { k: "ringkasan", n: "Ringkasan", ik: '<path d="M6 3h9l4 4v14H6zM9 12h7M9 16h7"/>' },
  { k: "sumber", n: "Sumber", ik: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>' },
];
const BAHAYA = ["bnj", "bdg", "lsr", "gel", "kht", "kek", "cex"]; // kode status prakiraan, huruf kecil
const HARI = ["ringkas", "0", "1", "2", "3"];
const BAWAH = [94, -11.5, 141.5, 6.5];
const STADIA = [0, 0.46, 0.86]; // lembar bawah: tertutup, setengah, tinggi
const $ = (id) => document.getElementById(id);
const hp = matchMedia("(max-width:768px)");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ---------- alamat ---------- */
function baca() {
  const [t, q = ""] = location.hash.slice(1).split("?"), p = new URLSearchParams(q);
  const b = (p.get("b") || "").toLowerCase(), h = p.get("h") || "ringkas", kab = p.get("kab") || "";
  return { tab: TAB.some((x) => x.k === t) || t === "rekomendasi" ? t : "status", b: BAHAYA.includes(b) ? b : "", h: HARI.includes(h) ? h : "ringkas", kab: /^\d{4}$/.test(kab) ? kab : "" };
}
const state = baca();
function tulis(dorong) {
  const p = new URLSearchParams();
  if (state.b) p.set("b", state.b);
  if (state.h !== "ringkas") p.set("h", state.h);
  if (state.kab) p.set("kab", state.kab);
  const q = p.toString(), url = "#" + state.tab + (q ? "?" + q : "");
  if (url !== location.hash) history[dorong ? "pushState" : "replaceState"](null, "", url);
}

/* ---------- peta bersama ---------- */
const fns = [];
let peta = null, petaP = null, siap = false, stadia = 1;
const gelap = () => { const t = document.documentElement.dataset.theme; return t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme:dark)").matches); };
const gaya = () => "https://tiles.openfreemap.org/styles/" + (gelap() ? "dark" : "positron");
const kotakIndonesia = () => [[BAWAH[0], BAWAH[1]], [BAWAH[2], BAWAH[3]]];
function padPeta() {
  const st = $("po-stage"), p = $("po-panel");
  if (hp.matches) return { top: 64, left: 16, right: 16, bottom: Math.min(p.offsetHeight, st.clientHeight * 0.6) + 16 };
  return { top: 64, bottom: 56, right: 20, left: st.dataset.panel === "buka" ? p.offsetWidth + 28 : 20 };
}
const sesuaikan = () => peta?.easeTo({ padding: padPeta(), duration: 300 });
/** Dibuat malas saat tab peta pertama dibuka (wadah harus terlihat). Null bila pustaka atau gaya gagal. */
function petaBersama() {
  return (petaP ??= (async () => {
    try { await muatMapLibre(); } catch { return null; }
    peta = new maplibregl.Map({ container: "po-kanvas", style: gaya(), bounds: kotakIndonesia(), fitBoundsOptions: { padding: padPeta() }, minZoom: 3, maxZoom: 13, dragRotate: false, pitchWithRotate: false, attributionControl: false });
    peta.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "© OpenStreetMap (ODbL)" }), "bottom-right");
    peta.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    peta.on("style.load", () => { siap = true; for (const f of fns) f(peta); });
    let g0 = gelap();
    new MutationObserver(() => { const g = gelap(); if (g !== g0) { g0 = g; peta.setStyle(gaya(), { diff: false }); } }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return peta;
  })());
}
/** Daftarkan pemasang lapis; dipanggil tiap gaya dasar dimuat (termasuk saat tema berganti), langsung bila sudah termuat. */
function pasangPeta(fn) { fns.push(fn); if (siap && peta) fn(peta); }

/* ---------- panel kiri (desktop) dan lembar bawah (HP) ---------- */
function aturPanel(buka) {
  $("po-stage").dataset.panel = buka ? "buka" : "tutup";
  const b = $("po-tgl"), k = buka ? "Tutup panel" : "Buka panel";
  b.setAttribute("aria-expanded", String(buka)); b.setAttribute("aria-label", k); b.title = k;
  $("po-panel").inert = !buka;
  sesuaikan();
}
function aturLembar(i) {
  stadia = i;
  const st = $("po-stage");
  $("po-panel").style.height = (i === 0 ? 64 : Math.round(st.clientHeight * STADIA[i])) + "px";
  st.dataset.lembar = String(i);
  sesuaikan();
}
function pasangPanel() {
  const p = $("po-panel"), grip = $("po-grip");
  $("po-tgl").addEventListener("click", () => aturPanel($("po-stage").dataset.panel !== "buka"));
  let y0 = null, h0 = 0, seret = false;
  grip.addEventListener("pointerdown", (e) => { y0 = e.clientY; h0 = p.offsetHeight; seret = false; grip.setPointerCapture(e.pointerId); });
  grip.addEventListener("pointermove", (e) => {
    if (y0 == null) return;
    const d = y0 - e.clientY; if (Math.abs(d) > 4) seret = true;
    if (seret) p.style.height = Math.min(Math.max(64, h0 + d), $("po-stage").clientHeight * 0.9) + "px";
  });
  grip.addEventListener("pointerup", () => {
    if (y0 == null) return; y0 = null;
    if (!seret) return;
    const st = $("po-stage").clientHeight, h = p.offsetHeight, ukur = [64, st * STADIA[1], st * STADIA[2]];
    aturLembar(ukur.reduce((b, v, i) => (Math.abs(v - h) < Math.abs(ukur[b] - h) ? i : b), 0));
  });
  grip.addEventListener("click", () => { if (seret) { seret = false; return; } aturLembar((stadia + 1) % 3); });
  grip.addEventListener("keydown", (e) => { const s = { ArrowUp: 1, ArrowDown: -1 }[e.key]; if (s) { e.preventDefault(); aturLembar(Math.min(2, Math.max(0, stadia + s))); } });
  const sinkron = () => { // di lembar bawah, garis waktu dan legenda ikut di dalam panel
    const b = $("po-bawah");
    if (hp.matches) $("po-pnl-isi").prepend(b); else $("po-stage").append(b);
    if (hp.matches) { p.inert = false; aturLembar(stadia); } else { p.style.height = ""; $("po-stage").dataset.lembar = ""; aturPanel($("po-stage").dataset.panel !== "tutup"); }
  };
  hp.addEventListener("change", sinkron);
  sinkron();
}

/* ---------- tab ---------- */
const siapModul = new Map(); // k -> { aktif } | null
let kini = "";
const info = (k) => TAB.find((x) => x.k === k);
const tombol = (d) => `<button type="button" role="tab" id="tab-${d.k}" data-tab="${d.k}" aria-selected="false" aria-controls="p-${d.k}" tabindex="-1"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.ik}</svg><span>${esc(d.n)}</span></button>`;

function ctxTab(d) {
  const panel = $("p-" + d.k);
  return { tab: d.k, panel, bawah: $("bw-" + d.k), state, ubah, petaBersama, pasangPeta, padPeta, kotakIndonesia, sesuaikan };
}
function ubah(patch) { Object.assign(state, patch); tulis(false); }

async function muatModul(d) {
  if (siapModul.has(d.k)) return;
  siapModul.set(d.k, null);
  try {
    const m = await import(`/potensi/${d.k}.js`);
    siapModul.set(d.k, m.pasang(ctxTab(d)) || null);
    if (kini === d.k) siapModul.get(d.k)?.aktif?.(true);
  } catch (e) {
    siapModul.delete(d.k);
    $("p-" + d.k).innerHTML = '<p class="po-galat" role="alert">Bagian ini belum bisa dimuat. Muat ulang halaman untuk mencoba lagi.</p>';
    console.error(e);
  }
}

function buka(k, dorong) {
  const d = info(k);
  if (!d || k === kini) return;
  const lama = kini; kini = k; state.tab = k;
  // chrome urgent: pil, mode, panel terlihat; sisanya ditunda
  for (const b of $("po-tab").children) { const on = b.dataset.tab === k; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; }
  const app = $("po-app"), adaPeta = !!d.peta;
  app.dataset.mode = adaPeta ? "peta" : "baca";
  $("po-stage").hidden = !adaPeta; $("po-baca").hidden = adaPeta;
  for (const s of document.querySelectorAll("#po-pnl-isi>.po-pt, #po-baca>.po-pb")) s.hidden = s.id !== "p-" + k;
  for (const s of document.querySelectorAll("#po-bawah>.po-bw")) s.hidden = s.id !== "bw-" + k;
  $("po-pnl-j").textContent = d.n;
  document.title = d.n + ", Potensi bencana hidrometeorologi, Centurisk97";
  tulis(dorong);
  if (!adaPeta) app.scrollTop = 0;
  nanti(async () => {
    if (adaPeta) petaBersama().then(() => { peta?.resize(); sesuaikan(); }); // modul tidak menunggu peta; ia memakai pasangPeta
    if (lama) siapModul.get(lama)?.aktif?.(false);
    if (kini !== k) return;
    if (siapModul.has(k)) siapModul.get(k)?.aktif?.(true); else await muatModul(d);
  });
}

function pasangPil() {
  const pil = $("po-tab");
  pil.innerHTML = TAB.map(tombol).join("");
  pil.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) buka(b.dataset.tab, true); });
  pil.addEventListener("keydown", (e) => {
    const bs = [...pil.querySelectorAll("[role=tab]")], i = bs.indexOf(document.activeElement);
    const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: bs.length - 1 }[e.key];
    if (i < 0 || j == null) return;
    e.preventDefault(); const b = bs[(j + bs.length) % bs.length]; b.focus(); b.click();
  });
}

/** Tab Rekomendasi hanya untuk sesi staf: ada bila Worker menjawab 200 (bukan disembunyikan dengan CSS). */
async function tabStaf() {
  try {
    const r = await fetch("/api/potensi/rekomendasi?bahaya=BNJ&status=2", { credentials: "same-origin" });
    if (!r.ok) return;
  } catch { return; }
  const d = { k: "rekomendasi", n: "Rekomendasi", ik: '<path d="M9 11l3 3 8-8M5 12v7h14v-5"/>' };
  TAB.push(d);
  const s = document.createElement("section");
  s.id = "p-rekomendasi"; s.className = "po-pb"; s.hidden = true; s.setAttribute("role", "tabpanel"); s.setAttribute("aria-labelledby", "tab-rekomendasi");
  $("po-baca").append(s);
  $("po-tab").insertAdjacentHTML("beforeend", tombol(d));
  if (state.tab === "rekomendasi") { kini = ""; buka("rekomendasi", false); }
}

pasangPil();
pasangPanel();
if (state.tab === "rekomendasi") state.tab = "status"; // sebelum sesi staf terbukti
buka(state.tab, false);
addEventListener("popstate", () => { const s = baca(); Object.assign(state, s, { tab: kini }); if (s.tab !== kini && info(s.tab)) buka(s.tab, false); });
(window.requestIdleCallback || ((f) => setTimeout(f, 800)))(tabStaf);
