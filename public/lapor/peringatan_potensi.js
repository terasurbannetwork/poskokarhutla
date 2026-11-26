/* Mode Peringatan Alun-alun /lapor: tab Status, Dampak, Iklim (peta Alun-alun yang sama) dan Analisis, Lapisan, Ringkasan, Sumber, Rekomendasi (tampilan penuh di atas peta).
   KEPUTUSAN-POTENSI K7 (26 Nov 2026): isi /potensi dipindah ke sini; modul tab tetap /potensi/<tab>.js dengan pasang(ctx) yang mengembalikan { aktif(on) }.
   Alamat: /lapor/#peringatan/<tab>?b=bnj&h=1&kab=3501. INP: pil berubah sinkron, modul dan isi berat ditunda lewat nanti(). */
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
const BAHAYA = ["bnj", "bdg", "lsr", "gel", "kht", "kek", "cex"];
const HARI = ["ringkas", "0", "1", "2", "3"];
const KOTAK = [[94, -11.5], [141.5, 6.5]];
const CSS = ["/potensi/potensi.css?v=2", "/potensi/status.css?v=2", "/lapor/peringatan_potensi.css?v=5"];
const $ = (id) => document.getElementById(id);
const hp = matchMedia("(max-width:899px)");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const state = { tab: "status", b: "", h: "ringkas", kab: "" };
const fns = [], mods = new Map(); // mods: k -> { aktif } | null
let peta = null, aside = null, kini = "", dibangun = false, kamusLayer = [];

function baca() {
  const [u, q = ""] = location.hash.slice(1).split("?"), [m, t] = u.split("/"), p = new URLSearchParams(q);
  const b = (p.get("b") || "").toLowerCase(), h = p.get("h") || "ringkas", kab = p.get("kab") || "";
  return { ada: m === "peringatan", tab: TAB.some((x) => x.k === t) ? t : "status", b: BAHAYA.includes(b) ? b : "", h: HARI.includes(h) ? h : "ringkas", kab: /^\d{4}$/.test(kab) ? kab : "" };
}
function tulis(dorong) {
  const p = new URLSearchParams();
  if (state.b) p.set("b", state.b);
  if (state.h !== "ringkas") p.set("h", state.h);
  if (state.kab) p.set("kab", state.kab);
  const q = p.toString(), url = "#peringatan/" + state.tab + (q ? "?" + q : "");
  if (url !== location.hash) history[dorong ? "pushState" : "replaceState"](null, "", url);
}
const ubah = (patch) => { Object.assign(state, patch); tulis(false); };
const padPeta = () => hp.matches
  ? { top: 64, left: 16, right: 16, bottom: Math.min(aside.offsetHeight, $("petaAlun").clientHeight * 0.6) + 16 }
  : { top: 64, bottom: 56, right: 20, left: aside.offsetWidth + 40 };

function ctxTab(d) {
  return {
    tab: d.k, panel: $("pp-" + d.k), bawah: $("ppbw-" + d.k), state, ubah,
    petaBersama: () => Promise.resolve(peta), padPeta, kotakIndonesia: () => KOTAK, sesuaikan: () => {},
    pasangPeta(fn) { fns.push(fn); if (peta) fn(peta); },
  };
}
async function muat(d) {
  if (mods.has(d.k)) return;
  mods.set(d.k, null);
  try {
    const m = await import(`/potensi/${d.k}.js`);
    mods.set(d.k, m.pasang(ctxTab(d)) || null);
    if (kini === d.k) mods.get(d.k)?.aktif?.(true);
  } catch (e) {
    mods.delete(d.k);
    $("pp-" + d.k).innerHTML = '<p class="po-galat" role="alert">Bagian ini belum bisa dimuat. Muat ulang halaman untuk mencoba lagi.</p>';
    console.error(e);
  }
}
const tombol = (d) => `<button type="button" role="tab" data-tab="${d.k}" aria-selected="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.ik}</svg><span>${esc(d.n)}</span></button>`;

function pilih(k, dorong) {
  const d = TAB.find((x) => x.k === k);
  if (!d || k === kini) return;
  const lama = kini; kini = k; state.tab = k;
  // chrome urgent: pil, panel, mode terlihat; modul dan isi berat ditunda
  for (const b of $("ppTab").children) b.setAttribute("aria-selected", String(b.dataset.tab === k));
  $("ppTab").hidden = false; $("ppPanel").hidden = !d.peta; $("ppGunung").hidden = k !== "status";
  for (const s of $("ppPanel").children) s.hidden = s.id !== "pp-" + k;
  $("ppBaca").hidden = !!d.peta; $("ppBawah").hidden = !d.peta;
  for (const s of $("ppBaca").querySelectorAll(".po-pb")) s.hidden = s.id !== "pp-" + k;
  for (const s of $("ppBawah").children) s.hidden = s.id !== "ppbw-" + k;
  if (!d.peta) $("ppBaca").scrollTop = 0;
  tulis(dorong);
  nanti(async () => {
    if (lama) mods.get(lama)?.aktif?.(false);
    if (kini !== k) return;
    if (mods.has(k)) mods.get(k)?.aktif?.(true); else await muat(d);
  });
}

/** Tab Rekomendasi hanya untuk sesi staf: ada bila Worker menjawab 200 (bukan disembunyikan dengan CSS). */
async function tabStaf() {
  try { if (!(await fetch("/api/potensi/rekomendasi?bahaya=BNJ&status=2", { credentials: "same-origin" })).ok) return; } catch { return; }
  if (TAB.some((x) => x.k === "rekomendasi")) return;
  const d = { k: "rekomendasi", n: "Rekomendasi", ik: '<path d="M9 11l3 3 8-8M5 12v7h14v-5"/>' };
  TAB.push(d);
  const s = document.createElement("section");
  s.id = "pp-rekomendasi"; s.className = "po-pb"; s.hidden = true; s.setAttribute("role", "tabpanel");
  $("ppBaca").append(s); $("ppTab").insertAdjacentHTML("beforeend", tombol(d));
  $("ppTab").lastElementChild.setAttribute("aria-selected", String(kini === "rekomendasi"));
}

function bangun(kartuGunung) {
  dibangun = true;
  for (const h of CSS) document.head.append(Object.assign(document.createElement("link"), { rel: "stylesheet", href: h }));
  const isi = $("isiPeringatan"), arena = $("petaAlun");
  aside = isi.closest(".lp-alun-panel");
  const pil = Object.assign(document.createElement("div"), { id: "ppTab", className: "lp-alun-sumber pp-pil" });
  pil.setAttribute("role", "tablist"); pil.setAttribute("aria-label", "Bagian Peringatan");
  pil.innerHTML = TAB.map(tombol).join("");
  pil.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) pilih(b.dataset.tab, true); });
  const pt = TAB.filter((d) => d.peta), pb = TAB.filter((d) => !d.peta);
  const panel = Object.assign(document.createElement("div"), { id: "ppPanel", className: "pp-panel" });
  panel.innerHTML = pt.map((d) => `<section id="pp-${d.k}" class="po-pt" role="tabpanel" hidden></section>`).join("");
  const gunung = Object.assign(document.createElement("div"), { id: "ppGunung" }); gunung.append(kartuGunung());
  isi.replaceChildren(panel, gunung);
  const bawah = Object.assign(document.createElement("div"), { id: "ppBawah", className: "po-bawah pp-bawah" });
  bawah.setAttribute("role", "group"); bawah.setAttribute("aria-label", "Garis waktu dan legenda");
  bawah.innerHTML = pt.map((d) => `<div id="ppbw-${d.k}" class="po-bw" hidden></div>`).join("");
  const bc = Object.assign(document.createElement("div"), { id: "ppBaca", className: "po-baca pp-baca" });
  bc.innerHTML = '<button type="button" class="pp-balik">Kembali ke peta</button>' + pb.map((d) => `<section id="pp-${d.k}" class="po-pb" role="tabpanel" hidden></section>`).join("");
  bc.querySelector(".pp-balik").addEventListener("click", () => pilih("status", true));
  aside.before(bc); arena.append(bawah); $("atasAlun").append(pil);   // pil melayang di tengah atas peta seperti bilah tab Foundry (pemilik 26 Nov 2026)   // bc sebelum panel: panel (z sama) tetap di atas
  addEventListener("popstate", () => { const s = baca(); if (!s.ada || !kini) return; Object.assign(state, s, { tab: kini }); if (s.tab !== kini) pilih(s.tab, false); });
  (window.requestIdleCallback || ((f) => setTimeout(f, 800)))(tabStaf);
}

/** Dipanggil lapor.js saat mode Peringatan menyala. siap() = janji peta Alun-alun siap; kamus = id lapis Kejadian yang disembunyikan. */
export function buka({ ambilPeta, siap, kamus, kartuGunung, bahaya }) {
  if (!dibangun) bangun(kartuGunung);
  const s = baca();
  if (s.ada) Object.assign(state, s);
  if (bahaya) Object.assign(state, { tab: "status", b: bahaya, kab: "" });
  kamusLayer = kamus;
  const tab = state.tab; kini = "";
  pilih(TAB.some((x) => x.k === tab) ? tab : "status", false);
  siap().then((ok) => {
    if (!ok || !kini) return;
    peta = ambilPeta();
    for (const l of kamus) if (peta.getLayer(l)) peta.setLayoutProperty(l, "visibility", "none");
    for (const f of fns) f(peta);
    if (kini) mods.get(kini)?.aktif?.(true);
  });
}
/** Mode kembali ke Kejadian: lapis modul dimatikan, alamat dibersihkan. */
export function tutup() {
  if (kini) mods.get(kini)?.aktif?.(false);
  kini = ""; kamusLayer = [];
  $("ppBawah").hidden = $("ppBaca").hidden = $("ppTab").hidden = true;
  if (baca().ada) history.replaceState(null, "", location.pathname + location.search);
}
