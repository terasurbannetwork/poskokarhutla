/* Siklus Bencana: perkakas bersama semua layar (DS 1, 2). Modul ES; format.js, nanti.js, tip.js, pilih.js dimuat lebih dulu sebagai skrip klasik.
   Tidak ada markup mentah di seluruh /siklus: DOM dibangun lewat h() (teks selalu textContent), jadi data tak pernah menjadi markup.
   Tidak ada formatter angka kedua: fmt, rb, jamWIB datang dari /inti/format.js. null = tidak ada data, tidak pernah ditulis 0 atau tanda hubung. */
import {selisihAntarsumber} from "./hitung.js";

const G = globalThis, NS = "http://www.w3.org/2000/svg";
export {selisihAntarsumber};
/* esc, fmt, rb, jamWIB, PilihCantik adalah const global dari skrip klasik: dipakai dengan nama telanjang dan TIDAK dideklarasikan ulang di modul ini. */
export const F = {esc: s => esc(s), fmt: n => fmt(n), rb: n => rb(n), jamWIB: n => jamWIB(n), durasi: ms => fmt.durasi(ms)};

/* ---------- DOM ---------- */
export function h(tag, atr, ...anak) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(atr || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v; else e.setAttribute(k, v === true ? "" : String(v));
  }
  e.append(...anak.flat(Infinity).filter(x => x != null && x !== false));
  return e;
}
const IKON = {
  perisai: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4", centang: "M5 12l5 5 9-10", gelombang: "M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0",
  timbangan: "M12 4v16M6 20h12M5 8h14M5 8l-2 6a3 3 0 0 0 4 0zM19 8l-2 6a3 3 0 0 0 4 0z", tanya: "M12 3l10 18H2zM12 10v5M12 18v.01",
  jampasir: "M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9", mata: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  sirene: "M7 18v-6a5 5 0 0 1 10 0v6M4 18h16M12 3v2", panah: "M5 12h14M13 6l6 6-6 6", mundur: "M19 12H5M11 6l-6 6 6 6", palu: "M14 4l6 6-3 3-6-6zM12 9l-8 8 3 3 8-8",
  bendera: "M5 21V4M5 4h12l-2 4 2 4H5", silang: "M6 6l12 12M18 6L6 18", tautan: "M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1",
  semua: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", banjir: "M12 3s-6 6.500-6 11a6 6 0 0 0 12 0c0-4.500-6-11-6-11z", gempa: "M2 13h4l2-5 3 10 3-12 2 7h6",
  api: "M12 3c2 4 6 6 6 11a6 6 0 0 1-12 0c0-2.500 1.200-4 3-6 .3 2 1.200 3 2.500 3.500C11 9 11.200 6 12 3z", gunung: "M3 20l7-13 3 5 2-3 6 11z", cuaca: "M7 18a5 5 0 1 1 1-9.900A6 6 0 0 1 19 10a4 4 0 0 1-1 8z",
  lain: "M5 12h.01M12 12h.01M19 12h.01", labu: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.500 15h9", sapu: "M15 3l-4 9M9 12l-5 8 7 1 6-3-2-8zM9 17l-1 3M13 16l-.5 4",
  cari: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5", kembali: "M15 6l-6 6 6 6", bangunan: "M4 21V8l8-5 8 5v13M9 21v-6h6v6", peta: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15",
  tambah: "M12 5v14M5 12h14", gabung: "M6 4v6a4 4 0 0 0 4 4h4M18 4v6a4 4 0 0 1-4 4M12 14v7", terbit: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  tiga: "M4 6h16M4 12h16M4 18h16", jiwa: "M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 20c0-4 3-6 7-6s7 2 7 6", segitiga: "M12 4l9 16H3z", bolak: "M7 7h13M7 7l3-3M7 7l3 3M17 17H4M17 17l-3-3M17 17l-3 3",
};
export function ik(nama, ukuran = 14) {
  const s = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({viewBox: "0 0 24 24", width: ukuran, height: ukuran, fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true"})) s.setAttribute(k, v);
  for (const d of (IKON[nama] || IKON.lain).split(/(?=M)/)) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); }
  return s;
}
export const hl = t => h("span", {class: "hl"}, t);

/* ---------- kamus, format, tooltip ---------- */
export const K = await (async () => { try { const r = await fetch("/siklus/data/kamus.json"); if (r.ok) return await r.json(); } catch (e) { /* kamus kosong: kata mentah tampil */ } return {}; })();
const nama = (peta, k, awal) => peta?.[k] ?? awal ?? String(k ?? "").replaceAll("_", " ");
export const namaProv = k => nama(K.provinsi, k, k), namaKab = k => nama(K.kab, k, k), namaJenis = k => String(k ?? "").split("+").map(j => K.jenis?.[j]?.[0] ?? j.replaceAll("_", " ")).join(" dan ");
export const namaSumber = k => nama(K.sumber, k, String(k).toUpperCase()), namaMetrik = k => nama(K.metrik, k, String(k).replaceAll("_", " ").replace(/^./, c => c.toUpperCase()));
export const wilayah = kab4 => kab4 ? `${namaKab(kab4)}, ${namaProv(String(kab4).slice(0, 2))}` : null;
export const angka = n => n == null || !Number.isFinite(Number(n)) ? null : fmt(n);
export const tgl = t => /^\d{4}-\d\d-\d\d/.test(t ?? "") ? new Date(t.slice(0, 10) + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}) : null;
export const wib = ms => Number.isFinite(Number(ms)) ? jamWIB(Number(ms)) : null;
export const tglWib = (kini = Date.now()) => new Date(kini + 7 * 36e5).toISOString().slice(0, 10);
export const geser = (t, n) => new Date(Date.parse(t + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
/* isi data-tip: judul tebal, lalu baris "label: nilai"; semua dilolos-HTML karena tip.js memasangnya sebagai markup */
export const tip = (judul, ...baris) => `<b>${esc(judul)}</b>` + baris.filter(Boolean).map(([k, v]) => `<br>${esc(k)}: ${esc(v)}`).join("");

/* ---------- pil keyakinan dan fase ---------- */
export function judulPil(y, isi = {}) {
  const k = K.label?.[y]; if (!k) return "";
  return k.title.replace(/\{(\w+)\}/g, (_, n) => isi[n] ?? "belum tertulis").replace(/\s+,/g, ",");
}
/* satu pil per angka atau blok; y di luar enam nilai menjadi menunggu (tidak pernah angka tanpa label) */
export function pil(y, isi = {}, saran = "") {
  const yy = K.label?.[y] ? y : "menunggu", k = K.label?.[yy] ?? {kata: yy, ikon: "jampasir"};
  return h("span", {class: "sk-pil", "data-y": yy, title: saran || judulPil(yy, isi)}, ik(k.ikon, 12), k.kata);
}
export function fase(f) {
  const x = K.fase?.[f] ?? [String(f ?? "tidak ada"), "mata", ""];
  return h("span", {class: "sk-fase", "data-f": f, title: x[2]}, ik(x[1], 14), x[0]);
}
/* sel angka: nilai + pil, atau "tidak ada" + pil menunggu; tidak pernah 0 pengganti */
export function nilai(n, y, isi = {}) {
  const a = angka(n);
  return a == null ? [h("span", {}, "tidak ada"), " ", pil("menunggu", isi)] : [h("span", {class: "num"}, a), " ", pil(y, isi)];
}

/* ---------- kartu standar dan keadaan ---------- */
export function kartu({ey, judul, kanan, isi, id}) {
  return h("section", {class: "ex ex-std", id},
    h("header", {class: "ex-hd"}, h("span", {class: "ex-ey"}, ey), h("div", {class: "ex-jd"}, h("h3", {}, judul), kanan || null)),
    h("div", {class: "ex-bd"}, isi));
}
/* wadah kelompok isi di dalam kartu (memori bagian-dalam-kartu): putih, bergaris, judul kecil kapital */
export const wadah = (judul, ...isi) => h("div", {class: "sk-blok"}, judul ? h("h4", {}, judul) : null, ...isi);
export const para = t => h("p", {class: "sk-para"}, t);
const TEKS = {kosong: "Belum ada data pada rentang ini", galat: "Data belum bisa dimuat. Coba lagi sebentar lagi", sesi: "Masuk lagi untuk melanjutkan", menunggu: "Menunggu masukan"};
export function kead(k, {teks, aksi, ulang} = {}) {
  const e = h("div", {class: "sk-kead", "data-k": k, role: k === "galat" ? "alert" : "status"});
  if (k === "memuat") { e.setAttribute("aria-busy", "true"); e.setAttribute("aria-label", "Memuat"); e.append(h("span"), h("span"), h("span")); return e; }
  e.append(h("p", {}, teks ?? TEKS[k] ?? ""));
  if (k === "sesi") e.append(h("a", {href: "/admin/masuk?ke=" + encodeURIComponent(location.pathname), "data-aksi": "utama"}, "Masuk"));
  else if (k === "galat" && ulang) { const b = h("button", {type: "button", "data-aksi": "biasa"}, "Ulangi"); b.addEventListener("click", ulang); e.append(b); }
  else if (aksi) { const b = h("button", {type: "button", "data-aksi": "biasa"}, aksi.label); b.addEventListener("click", aksi.fn); e.append(b); }
  return e;
}
/* hasil api() yang gagal menjadi keadaan layar; 404 dengan kosong:true menjadi keadaan kosong */
export function kead_dari(r, ulang, kosong) {
  if (r.status === 401) return kead("sesi");
  if (r.status === 403) return kead("galat", {teks: r.j?.galat || "Peran kamu belum berhak membuka bagian ini"});
  if (r.status === 404 && kosong) return kead("kosong", {teks: kosong});
  if (r.status === 503) return kead("galat", {teks: r.j?.galat || TEKS.galat, ulang});
  return kead("galat", {ulang});
}
export const kosongkan = e => { e.replaceChildren(); return e; };
export function toast(t) {
  const e = document.getElementById("toast"); if (!e) return;
  e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), 4200);
}

/* ---------- kontrol bersama: chrome urgent, isi berat lewat nanti() (INP.md, DS 2.10) ---------- */
export function seg(opsi, sekarang, pilih, label) {
  const w = h("div", {class: "seg penuh", role: "group", "aria-label": label});
  for (const [v, t, i] of opsi) w.append(h("button", {type: "button", "data-v": v, "aria-pressed": String(v === sekarang), title: t}, i ? ik(i, 14) : null, h("span", {}, t)));
  w.addEventListener("click", e => {
    const b = e.target.closest("button[data-v]"); if (!b || b.getAttribute("aria-pressed") === "true") return;
    for (const x of w.children) x.setAttribute("aria-pressed", String(x === b));   // chrome urgent
    G.nanti(() => pilih(b.dataset.v));                                              // isi berat sesudah satu frame tercat
  });
  return w;
}
/* <select> yang dihias PilihCantik (main select otomatis). multi: nilai berupa larik, kosong = semua */
export function pilihan(opsi, sekarang, pilih, label, multi = false) {
  const s = h("select", {"aria-label": label, multiple: multi || null});
  for (const [v, t] of opsi) s.append(h("option", {value: v, selected: multi ? ([].concat(sekarang)).includes(v) : v === sekarang}, t));
  s.addEventListener("change", () => G.nanti(() => pilih(multi ? PilihCantik.nilai(s) : s.value)));
  return s;
}
export function tombol(label, aksi, fn, ikon, judul) {
  const b = h("button", {type: "button", "data-aksi": aksi, title: judul || label, "aria-label": judul || label}, ikon ? ik(ikon, 14) : null, label ? h("span", {}, label) : null);
  b.addEventListener("click", fn); return b;
}
/* penjaga respons lambat: hanya permintaan terbaru yang boleh menggambar */
export function penjaga() { let n = 0; return {baru: () => ++n, terbaru: x => x === n}; }

/* ---------- jaringan ---------- */
export async function api(jalur, {metode = "GET", badan} = {}) {
  const o = {method: metode, headers: {"x-pb": "1", accept: "application/json"}, credentials: "same-origin"};
  if (badan !== undefined) { o.body = JSON.stringify(badan); o.headers["content-type"] = "application/json"; }
  let r; try { r = await fetch(jalur, o); } catch (e) { return {ok: false, status: 0, j: null}; }
  let j = null; try { j = await r.json(); } catch (e) { /* badan bukan JSON */ }
  return {ok: r.ok, status: r.status, j};
}
/* peran untuk mengatur tombol (server tetap menegakkan): sesi staf lewat /api/staf/saya, admin lewat /api/akademisi/saya.
   Moderator biasa = baca saja; Super Admin = semua, termasuk dummy. */
let peranBuf = null;
export function peran() {
  return peranBuf ??= (async () => {
    const s = await api("/api/staf/saya");
    if (s.ok) { const p = s.j?.staf?.peran ?? []; return {sa: false, pd: p.includes("pusdalops") || p.includes("koordalops"), ko: p.includes("koordalops"), pm: p.includes("pimpinan")}; }
    const a = await api("/api/akademisi/saya");
    if (a.ok) { const sa = a.j?.super === true; return {sa, pd: sa, ko: sa, pm: false}; }
    return {sa: false, pd: false, ko: false, pm: false};
  })();
}

/* ---------- dialog isian: kolom {nama,label,jenis:teks|area|tgl|pilih,wajib,opsi,nilai,maks}; hasil {nama: nilai} atau null bila batal ---------- */
export function tanya({judul, teks, kolom = [], ya = "Simpan", bahaya = false}) {
  return new Promise(ok => {
    const d = h("dialog", {class: "dlg"}), f = h("form", {method: "dialog", class: "db"}), isian = {};
    for (const k of kolom) {
      const x = k.jenis === "area" ? h("textarea", {rows: 4, maxlength: k.maks || 600}) : k.jenis === "pilih" ? h("select", {}, (k.opsi || []).map(([v, t]) => h("option", {value: v}, t)))
        : h("input", {type: k.jenis === "tgl" ? "date" : "text", maxlength: k.maks || 200});
      x.name = k.nama; x.required = !!k.wajib; if (k.nilai != null) x.value = k.nilai; isian[k.nama] = x;
      f.append(h("label", {class: "fld"}, h("span", {}, k.label), x));
    }
    const batal = tombol("Batal", "biasa", () => d.close("batal")), simpan = h("button", {type: "submit", "data-aksi": bahaya ? "bahaya" : "utama"}, ya);
    f.append(h("div", {class: "sk-aksi"}, batal, simpan));
    d.append(h("div", {class: "dh"}, h("div", {}, h("h3", {}, judul), teks ? h("p", {}, teks) : null)), f);
    f.addEventListener("submit", () => { d.returnValue = "ya"; });
    d.addEventListener("close", () => { const v = d.returnValue === "ya" ? Object.fromEntries(Object.entries(isian).map(([n, x]) => [n, x.value.trim()])) : null; d.remove(); ok(v); });
    document.body.append(d); d.showModal(); (Object.values(isian)[0] || batal).focus();
  });
}

/* ---------- cangkang: tema, tip, pilihan cantik, router ---------- */
try { const t = localStorage.getItem("pb-tema"); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* penyimpanan diblokir */ }
const LAYAR = [
  [/^\/siklus\/paparan$/, () => import("./paparan.js"), "paparan"],
  [/^\/siklus\/kaji(\/[0-9a-f]{16})?$/, () => import("./kaji.js"), "kaji"],
  [/^\/siklus\/pulih(\/[0-9a-f]{16})?$/, () => import("./pulih.js"), "pulih"],
  [/^\/siklus\/renkon(\/[0-9a-f]{16})?$/, () => import("./renkon.js"), "renkon"],
  [/^\/siklus\/gladi(\/[0-9a-f]{16})?$/, () => import("./gladi.js"), "renkon"],   // halaman dummy renkon mengisi renkon dan gladi
  [/^\/siklus\/masa-depan$/, () => import("./masadepan.js"), "masadepan"],
  [/^\/siklus\/registri$/, () => import("./registri.js"), "pintu"],
  [/^\/siklus$/, () => import("./pintu.js"), "pintu"],
  [/^\/siklus\/kejadian(\/.*)?$/, () => import("./kejadian.js"), "kejadian"],
];
async function mulai() {
  const isi = document.getElementById("sk"); if (!isi) return;
  G.pasangTip?.(); PilihCantik.pasang();
  document.getElementById("tema")?.addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t;
    try { localStorage.setItem("pb-tema", t); } catch (e) { /* abaikan */ }
  });
  const jalur = location.pathname.replace(/\/+$/, "") || "/siklus", cocok = LAYAR.find(([re]) => re.test(jalur));
  const sk = G.SK = {periode: () => null, halaman: cocok?.[2] ?? "kejadian"};
  if (!cocok) { isi.replaceChildren(kartu({ey: "Siklus", judul: ["Layar ini ", hl("belum dibuka")], isi: [kead("kosong", {teks: "Layar ini belum tersedia. Buka daftar kejadian.", aksi: {label: "Buka kejadian", fn: () => { location.href = "/siklus/kejadian"; }}})]})); }
  else { try { await (await cocok[1]()).buka(isi, sk); } catch (e) { console.error("siklus", e); isi.replaceChildren(kartu({ey: "Siklus", judul: ["Layar ", hl("belum bisa dimuat")], isi: [kead("galat", {ulang: () => location.reload()})]})); } }
  peran().then(async p => { /* tombol dummy 🧪/🧹 disembunyikan atas permintaan pemilik 11 Nov 2026 (semua proyek); pulihkan: ganti `false && p.sa` jadi `p.sa` */ if (false && p.sa) (await import("./dummy.js")).pasangDummy(sk); });
}
if (typeof document !== "undefined" && document.getElementById("sk")) mulai();
