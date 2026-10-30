/* SIPPA: cangkang klien /pipa (PRD §9.1, DS §3.1). Router History API, bilah konteks (Provinsi, Versi zona), navigasi tiga lebar, tema,
   muat malas modul layar. Kontrak tiap layar_<nama>.js: export async function pasang(akar, konteks) dan export function lepas().
   Tidak ada data di berkas ini: data hanya dari /api/sippa/* bersesi. Dimuat sebagai <script type="module"> oleh cangkang halamanSippa. */
import {ikon} from "./ikon.js";
import {memuat, kosong, galat, luring, menunggu, basi, waktu} from "./keadaan.js";
import {bolehDummy, pasangDummy, ambilPesan, layarDummy} from "./dummy.js";

const GRUP = [
  {k: "ringkas", n: "Ringkas", i: "layout-dashboard"},
  {kel: "Rencana", item: [{k: "peta", n: "Peta", i: "peta"}, {k: "kunjungan", n: "Kunjungan", i: "peta"}, {k: "hitung", n: "Hitung", i: "calculator"}, {k: "pemicu", n: "Pemicu", i: "siren"}, {k: "studio", n: "Studio", i: "sliders-horizontal"}, {k: "3d", n: "3D", i: "box"}]},
  {kel: "Operasi", item: [{k: "kit", n: "Kit", i: "warehouse"}, {k: "pelihara", n: "Pelihara", i: "wrench"}, {k: "air", n: "Air tanah", i: "cloud-check"}, {k: "log", n: "Log", i: "timer"}, {k: "ab", n: "A/B", i: "flask-conical"}, {k: "telemetri", n: "Telemetri", i: "activity"}]},
  {kel: "Keluaran", item: [{k: "laporan", n: "Laporan", i: "file-text"}, {k: "data", n: "Data", i: "database"}]},
];
const SEMUA = GRUP.flatMap(g => g.item || [g]);
/* aset = rincian /pipa/aset/:id (PRD §9.4.12): modul layar, bukan butir menu; judulnya ada di sini supaya tampil() menemukannya */
const RINCIAN = [{k: "aset", n: "Rincian aset"}, {k: "akses", n: "Akses"}];   // akses (jembatan): disembunyikan dari menu atas permintaan pemilik 27 Okt, rute tetap
export const LAYAR = [...SEMUA, ...RINCIAN].map(x => x.k);
const BAWAH = ["ringkas", "peta", "kit", "log"];
const href = k => k === "ringkas" ? "/pipa" : `/pipa/${k}`;
const VERSI_ZONA = [["k", "Konservatif"], ["o", "Optimistis"], ["v", "Terverifikasi"]];
const BASI_MS = 48 * 36e5;   // data harian lebih tua dari 48 jam = basi (PRD §9.2.1)
const GAGAL_LAYAR = "Layar tidak bisa ditampilkan. Coba lagi.";

/* /pipa -> ringkas; /pipa/<layar>; /pipa/kit/<id 16 heks>; /pipa/aset/<id 16 heks> (wajib id); selain itu null (404 sopan) */
export function cocokkanJalur(path) {
  const m = /^\/pipa(?:\/([^/]+))?(?:\/([^/]+))?\/?$/.exec(path);
  if (!m) return null;
  const [, a, b] = m;
  if (a === undefined) return {layar: "ringkas"};
  if (a === "ringkas" || !LAYAR.includes(a)) return null;
  const id = b !== undefined && /^[0-9a-f]{16}$/.test(b) ? b : null;
  if (b !== undefined) return (a === "kit" || a === "aset") && id ? {layar: a, id} : null;
  return a === "aset" ? null : {layar: a};
}

/* ---------- pemuat skrip inti (bila cangkang belum memuatnya) ---------- */
/* nanti.js WAJIB pertama: tunda() dan layar memanggil nanti() tanpa cadangan (INP.md kelas 5) */
export const INTI = [[() => typeof nanti, "/inti/nanti.js"], [() => typeof fmt, "/inti/format.js"], [() => typeof Wilayah, "/instansi_wilayah.js"], [() => typeof Kartu, "/inti/kartu.js"],
  [() => typeof paginasi, "/inti/tabel.js"], [() => typeof PilihCantik, "/inti/pilih.js"]];
const muatSkrip = src => new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => gagal(new Error(`Gagal memuat ${src}`)); document.head.append(s); });
export async function pastikanInti() { for (const [ada, src] of INTI) if (ada() === "undefined") await muatSkrip(src); }

/* ---------- penyimpanan per peramban: boleh kosong ---------- */
const simpan = (k, v) => { try { localStorage.setItem(k, v); } catch { /* penyimpanan diblokir: halaman tetap benar */ } };
const baca = k => { try { return localStorage.getItem(k); } catch { return null; } };

const el = (tag, kelas, atribut = {}) => { const e = document.createElement(tag); if (kelas) e.className = kelas; for (const [k, v] of Object.entries(atribut)) e.setAttribute(k, v); return e; };
const tunda = f => nanti(f);

function mulai(akar) {
  const q = new URLSearchParams(location.search);
  const konteks = {prov: q.get("prov") || baca("sp-prov") || "62", zona: VERSI_ZONA.some(([k]) => k === q.get("zona")) ? q.get("zona") : (baca("sp-zona") || "k"), id: null, per: null,
    setPer(ms) { this.per = ms; tulisPer(); }, pesan: t => { let p = isi.querySelector(".sp-pesan"); if (!p) { p = el("p", "ad-spanduk sp-pesan", {role: "status"}); isi.prepend(p); } p.textContent = t; },
    async ambil(url, sinyal) {
      let r;
      try { r = await fetch(url, {credentials: "same-origin", signal: sinyal, headers: {accept: "application/json"}}); }
      catch (e) { if (e.name === "AbortError") throw e; const g = new Error("Tidak bisa terhubung ke server."); g.status = 0; throw g; }
      if (!r.ok) { let m = ""; try { m = (await r.json()).galat || ""; } catch { /* badan bukan JSON */ } const g = new Error(m); g.status = r.status; throw g; }
      return r.json();
    },
    /* POST JSON -> {ok, status, j}; x-pb wajib untuk sesi staf. Galat jaringan = status 0, bukan lemparan. */
    async kirim(url, body) {
      try { const r = await fetch(url, {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body)}); return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
      catch { return {ok: false, status: 0, j: {}}; }
    }};

  /* kerangka */
  akar.replaceChildren();
  akar.className = (akar.className + " sp-cangkang").trim();
  const lompat = el("a", "sr", {href: "#sp-isi"}); lompat.textContent = "Lompat ke isi";
  const bilah = el("div", "sp-konteks", {role: "group", "aria-label": "Konteks"});
  const badan = el("div", "sp-badan");
  const rel = el("nav", "sp-rel", {"aria-label": "Menu SIPPA"});
  const isi = akar.closest("main") ? el("div", "sp-isi", {id: "sp-isi", tabindex: "-1"}) : el("main", "sp-isi", {id: "sp-isi", tabindex: "-1"});
  const bawah = el("nav", "sp-bawah", {"aria-label": "Menu utama"});
  const lain = el("div", "sp-lainnya", {id: "sp-lainnya", hidden: ""});
  const tautan = x => { const a = el("a", "", {href: href(x.k), "data-layar": x.k}); a.innerHTML = `${ikon(x.i)}<span>${esc(x.n)}</span>`; return a; };

  rel.append(tautan(GRUP[0]));
  GRUP.slice(1).forEach(g => {
    const h = el("h2", "ad-ey sp-rel-kel", {id: `sp-kel-${g.kel}`}); h.textContent = g.kel;
    const ul = el("ul", "", {"aria-labelledby": h.id});
    g.item.forEach(x => { const li = el("li"); li.append(tautan(x)); ul.append(li); });
    rel.append(h, ul);
  });
  BAWAH.map(k => SEMUA.find(x => x.k === k)).forEach(x => bawah.append(tautan(x)));
  const tLain = el("button", "sp-lain-tombol", {type: "button", "aria-expanded": "false", "aria-controls": "sp-lainnya"});
  tLain.innerHTML = `${ikon("menu")}<span>Lainnya</span>`;
  bawah.append(tLain);
  SEMUA.filter(x => !BAWAH.includes(x.k)).forEach(x => lain.append(tautan(x)));

  /* bilah konteks: Provinsi + Versi zona + batas data + pita luring */
  const sel = el("select", "", {"aria-label": "Provinsi"});
  const PROV = globalThis.Wilayah?.PROV || {"62": "Kalimantan Tengah"};
  for (const [kode, nama] of Object.entries(PROV)) { const o = el("option", "", {value: kode}); o.textContent = nama; if (kode === konteks.prov) o.selected = true; sel.append(o); }
  const seg = el("div", "ad-seg", {role: "radiogroup", "aria-label": "Versi zona"});
  VERSI_ZONA.forEach(([k, n]) => { const b = el("button", "", {type: "button", role: "radio", "aria-checked": String(k === konteks.zona), "data-zona": k, tabindex: k === konteks.zona ? "0" : "-1"}); b.textContent = n; seg.append(b); });
  /* waktu data dari layar (konteks.setPer), bukan konstanta; pil basi dari keadaan.js bila lebih tua dari 48 jam */
  const batas = el("span", "sp-data-per");
  const tulisPer = () => { batas.hidden = konteks.per == null; batas.replaceChildren(konteks.per == null ? "Data per –" : `Data per ${waktu(konteks.per)}`); if (konteks.per != null && Date.now() - konteks.per > BASI_MS) batas.append(" ", basi(konteks.per)); };
  tulisPer();
  const pita = el("div", "sp-pita");
  const info = el("div", "sp-pita sp-info", {role: "status"});   // hasil isi/hapus dummy: di bilah konteks supaya tidak terhapus saat layar dimuat
  bilah.append(sel, seg, batas, pita, info);
  const tulisInfo = t => info.replaceChildren(...(t ? [el("p", "ad-spanduk", t)] : []));

  badan.append(rel, isi);
  akar.append(lompat, bilah, badan, bawah, lain);
  try { if (typeof PilihCantik !== "undefined") { PilihCantik.hias(sel); if (document.querySelector("main")) PilihCantik.pasang(); } } catch { /* pemilih biasa tetap jalan */ }

  /* tema: tombol di header (.ad-top) milik cangkang */
  const tema = el("button", "sp-tema ad-tombol", {type: "button", "aria-label": "Ganti tema"});
  const terapkanTema = t => { document.documentElement.dataset.theme = t; tema.innerHTML = ikon(t === "dark" ? "sun" : "moon"); tema.setAttribute("aria-pressed", String(t === "dark")); };
  terapkanTema(baca("sp-tema") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  tema.addEventListener("click", () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; terapkanTema(t); simpan("sp-tema", t); });
  /* tombol dummy 🧪 🧹 (DS §3.19): Super Admin saja, di header kanan sebelum tema, sama di tiap layar */
  const kepala = document.querySelector(".ad-top") || bilah;
  if (bolehDummy(document.body?.dataset)) pasangDummy(kepala, {layar: () => layarDummy(cocokkanJalur(location.pathname)?.layar), kirim: (u, b) => konteks.kirim(u, b), pesan: tulisInfo});
  kepala.append(tema);

  /* luring */
  const tandaiLuring = () => pita.replaceChildren(...(navigator.onLine === false ? [luring(konteks.per)] : []));
  addEventListener("online", tandaiLuring); addEventListener("offline", tandaiLuring); tandaiLuring();

  /* router */
  let modul = null, giliran = 0;
  const tandaiAktif = k => document.querySelectorAll("[data-layar]").forEach(a => a.getAttribute("data-layar") === k ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  async function tampil() {
    const g = ++giliran;
    try { modul?.lepas?.(); } catch { /* layar lama boleh rusak saat dilepas */ }
    modul = null; konteks.setPer(null); tulisInfo("");
    const c = cocokkanJalur(location.pathname);
    if (!c) { tandaiAktif(null); isi.replaceChildren(kosong("Halaman tidak ada. Pilih layar dari menu SIPPA.")); return; }
    const x = [...SEMUA, ...RINCIAN].find(y => y.k === c.layar);
    tandaiAktif(c.layar); document.title = `${x.n} | SIPPA | Centurisk97`;
    isi.replaceChildren(memuat());
    let m;
    try { m = await import(`./layar_${c.layar}.js`); }
    catch (e) { if (g !== giliran) return; if (e instanceof SyntaxError) console.error(e); isi.replaceChildren(e instanceof SyntaxError ? galat(0, GAGAL_LAYAR, tampil) : menunggu(`Layar ${x.n} belum dirilis di versi ini`)); return; }
    if (g !== giliran) return;
    isi.replaceChildren(); modul = m; konteks.id = c.id ?? null;
    try { await m.pasang(isi, konteks); }
    catch (e) { if (g === giliran && e.name !== "AbortError") { if (e.status == null) console.error(e); isi.replaceChildren(galat(e.status ?? 0, e.status == null ? GAGAL_LAYAR : e.message, tampil)); } }
  }

  /* INP: aria-current pada tautan baru seketika, pushState, lalu muat layar sesudah satu frame tercat */
  akar.addEventListener("click", e => {
    const a = e.target.closest("a[data-layar]");
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); tutupLain();
    if (a.pathname === location.pathname) return;
    tandaiAktif(a.dataset.layar); history.pushState(null, "", a.pathname + location.search); tunda(tampil);
  });
  addEventListener("popstate", () => { tandaiAktif(cocokkanJalur(location.pathname)?.layar ?? null); tunda(tampil); });   // chrome urgen, layar sesudah satu frame

  /* Lainnya: lembar bawah, Esc dan klik luar menutup, fokus kembali ke tombol */
  function tutupLain(fokus) { if (lain.hidden) return; lain.hidden = true; tLain.setAttribute("aria-expanded", "false"); if (fokus) tLain.focus(); }
  tLain.addEventListener("click", () => { const buka = lain.hidden; lain.hidden = !buka; tLain.setAttribute("aria-expanded", String(buka)); if (buka) lain.querySelector("a")?.focus(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") tutupLain(true); });
  document.addEventListener("click", e => { if (!lain.hidden && !lain.contains(e.target) && !tLain.contains(e.target)) tutupLain(); });

  /* Provinsi dan Versi zona: chrome seketika, query ditulis replaceState, layar digambar ulang sesudah satu frame */
  const tulisQuery = () => { const u = new URL(location.href); u.searchParams.set("prov", konteks.prov); u.searchParams.set("zona", konteks.zona); history.replaceState(null, "", u); simpan("sp-prov", konteks.prov); simpan("sp-zona", konteks.zona); };
  sel.addEventListener("change", () => { konteks.prov = sel.value; tulisQuery(); tunda(tampil); });
  const pilihZona = b => { seg.querySelectorAll("button").forEach(x => { const on = x === b; x.setAttribute("aria-checked", String(on)); x.tabIndex = on ? 0 : -1; }); konteks.zona = b.dataset.zona; tulisQuery(); tunda(tampil); };
  seg.addEventListener("click", e => { const b = e.target.closest("button[data-zona]"); if (b && b.getAttribute("aria-checked") !== "true") pilihZona(b); });
  seg.addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const bs = [...seg.querySelectorAll("button")], i = bs.findIndex(x => x.getAttribute("aria-checked") === "true"), n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length];
    e.preventDefault(); n.focus(); pilihZona(n);
  });

  tampil();
  const sisa = ambilPesan(); if (sisa) tulisInfo(sisa);   // hasil isi atau hapus sebelum muat ulang, tampil sekali
}

/* masuk: hanya di halaman cangkang (ada #app), bukan saat diimpor uji Node */
if (typeof document !== "undefined" && document.getElementById("app")) {
  const akar = document.getElementById("app");
  pastikanInti().then(() => mulai(akar)).catch(e => { console.error(e); akar.replaceChildren(galat(0, "SIPPA tidak bisa dimuat. Coba lagi.", () => location.reload())); });
}
