/* Alat bersama layar /karbon: status, panggilan API (atau data contoh ?contoh=1), format angka id-ID, pembuat elemen
   tanpa innerHTML, pil, tabel, peta. Semua teks data masuk lewat textContent (h()/s()), tidak pernah innerHTML. */
import {gabungAsumsi} from "./akuntansi.js";

export const CONTOH = new URLSearchParams(location.search).has("contoh");
export const S = {
  asumsi: gabungAsumsi({}), frl: null, masuk: true,
  saring: null, saringGalat: null, geom: null, skor: new Map(),
  proyek: [], detail: new Map(), peringatan: [], pihak: [], kesepakatan: [], buku: {entri: [], saldo: [], total: []},
};

/* ---------- format angka & tanggal (id-ID: titik ribuan, koma desimal) ---------- */
const NF = {};
export const ang = (v, d = 0) => v == null || v === "" || !Number.isFinite(+v) ? "–"
  : (NF[d] ||= new Intl.NumberFormat("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d})).format(+v);
export const pct = (v, d = 1) => v == null || !Number.isFinite(+v) ? "–" : ang(v * 100, d) + "%";
/* satuan tunggal: emisi dan kredit dalam tCO2e, stok per hektare dalam tCO2e/ha */
export const T = "tCO2e", T_HA = "tCO2e/ha";
const minus = t => t.replace(/^-/, "−");
/* uang untuk kartu KPI: USD dalam juta, Rupiah dalam miliar (1 desimal), dikonversi dengan kurs asumsi; tabel membulatkan ke ribuan */
export const uangKpi = (v, mata = "USD", kurs = 1) => v == null || !Number.isFinite(+v) ? "–" : mata === "Rp" ? minus(ang(v * kurs / 1e9, 1)) + " miliar" : minus(ang(v / 1e6, 1)) + " juta";
export const ribuan = v => v == null || !Number.isFinite(+v) ? "–" : minus(ang(Math.round(v / 1000) * 1000));
const DF = new Intl.DateTimeFormat("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta"});
export const tgl = v => { if (v == null || v === "") return "–"; const d = new Date(typeof v === "string" && v.length === 10 ? v + "T12:00:00+07:00" : v); return isNaN(d) ? String(v) : DF.format(d); };
export const hariIni = () => new Date().toLocaleDateString("sv-SE", {timeZone: "Asia/Jakarta"});
export const selisihHari = iso => Math.round((Date.parse(iso + "T00:00:00+07:00") - Date.parse(hariIni() + "T00:00:00+07:00")) / 864e5);
export const json = v => { if (v == null || v === "") return null; if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return null; } };

/* ---------- elemen ---------- */
const PROP = new Set(["value", "checked", "selected", "disabled", "hidden", "open", "type"]);
function pasangAtr(el, a) {
  for (const [k, v] of Object.entries(a || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.setAttribute("class", v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "data") Object.assign(el.dataset, v);
    else if (PROP.has(k) && !(el instanceof SVGElement)) el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
}
const anak = kids => kids.flat(Infinity).filter(x => x != null && x !== false).map(x => x instanceof Node ? x : String(x));
export function h(tag, a, ...kids) { const el = document.createElement(tag); pasangAtr(el, a); el.append(...anak(kids)); return el; }
export function s(tag, a, ...kids) { const el = document.createElementNS("http://www.w3.org/2000/svg", tag); pasangAtr(el, a); el.append(...anak(kids)); return el; }
export const ganti = (el, ...kids) => { el.replaceChildren(...anak(kids)); return el; };

/* judul bagian + paling banyak satu kalimat */
export const judul = (t, kal, ...aksi) => h("div", {class: "kb-jd"}, h("div", null, h("h2", null, t), kal && h("p", null, kal)), aksi.length ? h("div", {class: "kb-aksi"}, aksi) : null);
export const tombol = (t, on, kelas = "") => h("button", {type: "button", class: "kb-btn " + kelas, onclick: on}, t);
export const pil = (t, jenis) => h("span", {class: "kb-pil", "data-j": jenis || t}, t);
export const kpi = (label, nilai, sat) => h("div", {class: "kb-kpi"}, h("b", null, label), h("span", null, nilai, sat ? h("small", null, " " + sat) : null));
export const kosong = t => h("div", {class: "kosong"}, t);
/* uang: satuan rata kiri, angka rata kanan (tabel.css .rp) */
export const uang = (v, sat = "USD", d = 0) => h("span", {class: "rp"}, h("i", null, sat), h("span", null, ang(v, d)));

/* tabel: kol = [{t: judul, n: angka?, f: baris => isi, kelas}] */
export function tabel(kol, baris, o = {}) {
  const th = kol.map(k => h("th", {class: (k.n ? "n " : "") + (k.kelas || ""), scope: "col"}, k.t));
  const tr = baris.map(r => h("tr", {class: o.klik ? "klik" : null, tabindex: o.klik ? "0" : null, data: o.data?.(r),
    onclick: o.klik ? () => o.klik(r) : null, onkeydown: o.klik ? e => { if (e.key === "Enter") o.klik(r); } : null},
  kol.map(k => h("td", {class: (k.n ? "n num " : "") + (k.kelas || "")}, k.f(r)))));
  return h("div", {class: "tw kb-tw"}, h("table", null, h("thead", null, h("tr", null, th)), h("tbody", null, tr),
    o.kaki ? h("tfoot", null, h("tr", null, kol.map((k, i) => h("td", {class: k.n ? "n num" : ""}, o.kaki(k, i) ?? "")))) : null));
}

/* pilihan full-width (.seg.penuh): pilihan = [[nilai, label]] */
export function segmen(pilihan, nilai, ubah, label) {
  const g = h("div", {class: "seg penuh", role: "group", "aria-label": label});
  for (const [v, t] of pilihan) g.append(h("button", {type: "button", "aria-pressed": String(v === nilai), onclick: e => {
    g.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
    nanti(() => ubah(v)); }}, t));
  return g;
}
export const pilihan = (opsi, nilai, a = {}) => h("select", a, opsi.map(([v, t]) => h("option", {value: v, selected: String(v) === String(nilai ?? "")}, t)));
/* hias select yang baru masuk DOM dengan PilihCantik (public/inti/pilih.js) */
export const hias = akar => { if (typeof PilihCantik !== "undefined") akar.querySelectorAll("select:not([data-cantik])").forEach(x => PilihCantik.hias(x)); };

export const nanti = fn => window.nanti ? window.nanti(fn) : setTimeout(fn, 0);
export const tunda = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const jeda = () => globalThis.scheduler?.yield ? scheduler.yield() : new Promise(r => setTimeout(r, 0));

let tTimer;
export function kabar(t) { const el = document.getElementById("kbToast"); el.textContent = t; el.classList.add("on"); clearTimeout(tTimer); tTimer = setTimeout(() => el.classList.remove("on"), 4200); }

/* ---------- API ---------- */
export async function api(u, o = {}) {
  if (CONTOH) return contoh(u, o);
  const r = await fetch(u, {credentials: "same-origin", ...o, headers: o.body ? {"content-type": "application/json"} : undefined});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) belumMasuk();
    throw Object.assign(new Error(j.galat || j.error || "HTTP " + r.status), {status: r.status, isi: j});
  }
  return j;
}
export const kirim = (u, isi) => api(u, {method: "POST", body: JSON.stringify(isi)});
export const daftar = (j, k) => Array.isArray(j) ? j : j?.[k] || j?.baris || j?.data || [];
export function pesanGalat(e, apa = "menyimpan") {
  if (e.status === 409) return `Gagal ${apa}: ${e.isi?.galat || "data ini baru diubah orang lain"}. Muat ulang halaman dulu.`;
  if (e.status === 401 || e.status === 403) return `Gagal ${apa}: sesi masuk habis. Masuk lagi lewat /admin/masuk di tab baru.`;
  return `Gagal ${apa}: ${e.message}`;
}
function belumMasuk() {
  if (!S.masuk) return; S.masuk = false;
  const b = document.getElementById("kbMasuk"); b.hidden = false;
}

/* data contoh (?contoh=1): public/karbon/contoh.json, disimpan di memori; POST mengubah memori saja */
let DB, pDB;
async function contoh(u, o) {
  DB = await (pDB ||= fetch("/karbon/contoh.json").then(r => r.json()));
  await new Promise(r => setTimeout(r, 150));
  const url = new URL(u, location.origin), [kol, id] = url.pathname.replace(/^\/api\/karbon\//, "").split("/");
  const tolak = (st, galat) => { throw Object.assign(new Error(galat), {status: st, isi: {galat}}); };
  if (kol === "saring" || kol === "saring_geom") return DB[kol];
  if (!o.method || o.method === "GET") {
    if (kol === "proyek" && id) return {proyek: DB.proyek.find(p => p.id === id) || tolak(404, "tidak ada")};
    if (kol === "buku") return {entri: DB.buku, saldo: saldoContoh(), total: totalContoh()};
    return {[kol]: DB[kol]};
  }
  const isi = JSON.parse(o.body || "{}"), kini = Date.now();
  if (kol === "stat") {
    const p = DB.proyek.find(x => x.id === id), r = DB.saring.baris.find(x => x.id === p.konsesi_id) || DB.saring.baris[2];
    await new Promise(ok => setTimeout(ok, 1200));
    Object.assign(p, {stat: JSON.stringify(r), stat_diambil: kini, diubah: kini}); return {ok: true, stat: r, stat_diambil: kini, diubah: kini};
  }
  if (kol === "buku") {
    const saldo = saldoContoh([...DB.buku, isi]).find(x => x.proyek_id === isi.proyek_id && x.vintage === isi.vintage);
    if (saldo && (saldo.saldo < 0 || saldo.tersedia < 0)) tolak(409, `saldo tersedia tidak cukup (tersedia ${ang(saldo.tersedia + isi.jumlah_t)} ${T})`);
    DB.buku.push({...isi, id: DB.buku.length + 1, waktu: kini, oleh: "contoh"}); return {ok: true};
  }
  const L = DB[kol], lama = isi.id && L.find(x => String(x.id) === String(isi.id));
  if (lama) { if (isi.diubah != null && isi.diubah !== lama.diubah) tolak(409, "data ini baru diubah orang lain"); Object.assign(lama, isi, {diubah: kini}); return {ok: true, id: lama.id, diubah: kini}; }
  const baru = {...isi, id: Math.random().toString(16).slice(2, 10).padEnd(16, "0"), dibuat: kini, diubah: kini, oleh: "contoh"};
  if (kol === "proyek") Object.assign(baru, {geom: JSON.stringify(isi.geom ?? null), asumsi: JSON.stringify(isi.asumsi ?? null), stat: JSON.stringify(isi.stat ?? null)});
  L.push(baru); return {ok: true, id: baru.id, diubah: kini};
}
/* bentuk sama dengan GET /api/karbon/buku `total`: jumlah per jenis tiap (proyek, vintage) */
function totalContoh(E = DB.buku) {
  const m = new Map();
  for (const e of E) {
    const k = e.proyek_id + "|" + e.vintage, x = m.get(k) || {proyek_id: e.proyek_id, vintage: e.vintage, terbit: 0, cadang: 0, lepas_cadang: 0, alih: 0, pensiun: 0, batal: 0};
    x[e.jenis] += e.jumlah_t; m.set(k, x);
  }
  return [...m.values()];
}
function saldoContoh(E = DB.buku) {
  /* bentuk sama dengan GET /api/karbon/buku: saldo, cadang bersih, tersedia */
  return totalContoh(E).map(x => { const saldo = x.terbit - x.alih - x.pensiun - x.batal, cadang = x.cadang - x.lepas_cadang;
    return {proyek_id: x.proyek_id, vintage: x.vintage, saldo, cadang, tersedia: saldo - cadang}; });
}

/* ---------- peta (MapLibre vendor, dimuat saat pertama dibutuhkan) ---------- */
let pML;
export const muatPeta = () => pML ||= new Promise((ok, no) => {
  if (window.maplibregl) return ok();
  const sc = h("script", {src: "/vendor/maplibre/maplibre-gl.js?v=4.7.1"}); sc.onload = ok; sc.onerror = () => { pML = null; no(new Error("peta gagal dimuat")); }; document.head.append(sc);
});
const gelap = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
/* trackResize:false: peta di panel tersembunyi tidak memicu ResizeObserver sinkron saat panel dibuka lagi (INP). Pemanggil memanggil
   m.resize() lewat nanti() sesudah panel tampil; ubah ukuran jendela ditangani satu pendengar untuk semua peta yang masih ada. */
const PETA = new Set();
/* resize hanya bila ukuran wadah berbeda dari kanvas: resize() menggambar ulang seluruh peta (mahal untuk ribuan poligon) */
export function ukurUlang(m) {
  const w = m?.getContainer(), k = m?.getCanvas();
  if (w?.isConnected && w.clientWidth && (Math.abs(w.clientWidth - k.clientWidth) > 1 || Math.abs(w.clientHeight - k.clientHeight) > 1)) m.resize();
}
addEventListener("resize", tunda(() => { for (const m of PETA) { if (!m.getContainer().isConnected) PETA.delete(m); else ukurUlang(m); } }, 150));
export async function petaBaru(el) {
  await muatPeta();
  const m = new maplibregl.Map({container: el, style: gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron",
    center: [117, -1.5], zoom: 3.6, attributionControl: {compact: true}, trackResize: false, cooperativeGestures: matchMedia("(pointer: coarse)").matches});
  PETA.add(m);
  m.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
  await new Promise(r => m.isStyleLoaded() ? r() : m.once("style.load", r));
  return m;
}
export function batas(geo) {
  const b = [180, 90, -180, -90], jalan = c => typeof c[0] === "number" ? (b[0] = Math.min(b[0], c[0]), b[1] = Math.min(b[1], c[1]), b[2] = Math.max(b[2], c[0]), b[3] = Math.max(b[3], c[1])) : c.forEach(jalan);
  (geo.type === "FeatureCollection" ? geo.features.map(f => f.geometry) : geo.type === "Feature" ? [geo.geometry] : [geo]).forEach(g => g && jalan(g.coordinates));
  return b[0] <= b[2] ? [[b[0], b[1]], [b[2], b[3]]] : null;
}
/* skala navy (terang ke gelap) untuk choropleth */
export const NAVY = ["#c9d7ea", "#93b0d6", "#5b86bd", "#2f5c97", "#0b2545"];

/* ---------- XLSX (xlsx-js-style, CDN yang sama dengan bagikan.js/dokumen.js) dan PDF (vendor jspdf) ---------- */
const LIB = {xlsx: "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js", pdf: "/vendor/jspdf/jspdf.umd.min.js"};
const pLib = {};
export const muatLib = k => pLib[k] ||= new Promise((ok, no) => { const sc = h("script", {src: LIB[k]}); sc.onload = ok; sc.onerror = () => { delete pLib[k]; no(new Error("pustaka gagal dimuat")); }; document.head.append(sc); });
/* lembar = [{nama, kepala: [..], baris: [[..]]}] */
export async function keXlsx(lembar, nama) {
  await muatLib("xlsx"); const X = window.XLSX, wb = X.utils.book_new();
  for (const l of lembar) {
    const ws = X.utils.aoa_to_sheet([l.kepala, ...l.baris.map(r => r.map(v => v == null || (typeof v === "number" && !isFinite(v)) ? "" : v))]);
    l.kepala.forEach((_, c) => { const a = ws[X.utils.encode_cell({r: 0, c})]; if (a) a.s = {font: {bold: true, color: {rgb: "FFFFFF"}}, fill: {fgColor: {rgb: "0B2545"}}}; });
    l.baris.forEach((r, i) => r.forEach((v, c) => { const a = typeof v === "number" && ws[X.utils.encode_cell({r: i + 1, c})]; if (a) a.z = Number.isInteger(v) ? "#,##0" : "#,##0.00"; }));
    ws["!cols"] = l.kepala.map(k => ({wch: Math.max(12, String(k).length + 2)}));
    X.utils.book_append_sheet(wb, ws, l.nama.slice(0, 31));
  }
  window.unduhBlob(new Blob([X.write(wb, {bookType: "xlsx", type: "array", compression: true})], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), nama);
}
