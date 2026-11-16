/* inti/banding.js (PB-81.1, F-41, D15, D16): SATU mesin banding citra (peta dibelah dua, geser pembatas) untuk semua bencana selain karhutla
   (karhutla tetap memakai public/banding.js sampai PB-80). Dua peta MapLibre tambahan (kiri A, kanan B) ditumpuk di atas peta halaman,
   dibuat malas saat pertama dibuka; kamera ketiga peta disinkronkan. Digerbangi kemampuan.layar.citra di /bencana.json.
   Sumber citra HANYA NASA GIBS (harian, tanpa kunci) dan Esri World Imagery sebagai dasar; label tiap sisi menyebut sumber dan tanggal citra.
   D16: mesin tidak menawarkan tanggal sebelum awal data lapisan (`dari`) atau sesudah kemarin.

   Adaptor: {id: "gunungapi",
             peta: () => peta MapLibre halaman,
             wadah: () => elemen penampung peta (#p-peta),
             host: () => elemen perkakas peta (.tools), tempat dua tombol (banding, timelapse) ditaruh,
             lapisan: [{k, nama, pendek, lap: "NamaGIBS" | tgl => "NamaGIBS", fmt, lv, mz, atr, dari, dasar}]}   // lapisan pertama = citra warna asli
   BandingInti.pasang(adaptor); BandingInti.buka()/tutup(). Pembatas digeser lewat requestAnimationFrame (satu tulis CSS per frame). */
(() => {
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const iso = ms => new Date(ms).toISOString().slice(0, 10);
const kemarin = (kini = Date.now()) => iso(kini - 864e5);
const hariLalu = (n, kini = Date.now()) => iso(kini - n * 864e5);
const tglPendek = t => `${+t.slice(8)} ${BLN[+t.slice(5, 7) - 1]} ${t.slice(0, 4)}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const tunda = f => requestAnimationFrame(() => setTimeout(f, 0));

/* ---------- model murni (diuji di tests/layar/pb_citra.test.mjs) ---------- */
const izinReg = (daftar, id) => id !== "karhutla" && (daftar || []).find(b => b.id === id)?.kemampuan?.layar?.citra === true;
const namaGibs = (L, tgl) => typeof L.lap === "function" ? L.lap(tgl) : L.lap;
const urlGibs = (L, tgl) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${namaGibs(L, tgl)}/default/${tgl}/GoogleMapsCompatible_Level${L.lv}/{z}/{y}/{x}.${L.fmt}`;
/* tanggal sah dipilih: sesudah awal data lapisan dan paling lambat kemarin (D16) */
const tglSah = (L, t, kini = Date.now()) => /^\d{4}-\d\d-\d\d$/.test(t) && t <= kemarin(kini) && (!L.dari || t >= L.dari);
const tglKlem = (L, t, kini = Date.now()) => { const k = kemarin(kini); return t > k ? k : L.dari && t < L.dari ? L.dari : t; };
/* label sisi: [angka besar, sumber dan tanggal citra] */
function label(s, byk) {
  if (s.j === "utama") return ["Kini", "Peta utama"];
  if (s.j === "esri") return ["Kini", "Esri, Maxar, Earthstar (tanpa tanggal)"];
  const L = byk[s.j]; return L ? [s.tgl.slice(0, 4), `NASA GIBS, ${L.pendek || L.nama}, ${tglPendek(s.tgl)}`] : ["", ""];
}
/* usulan pasangan sisi: kiri dan kanan */
function preset(lapisan, kini = Date.now()) {
  const p = lapisan[0], k = kemarin(kini), a = tglKlem(p, hariLalu(8, kini), kini);
  const r = [["Kemarin dan 7 hari sebelumnya", "Citra warna asli, dua tanggal", [{j: p.k, tgl: a}, {j: p.k, tgl: k}]],
    ["Peta utama dan citra kemarin", "Peta halaman di kiri, citra warna asli di kanan", [{j: "utama"}, {j: p.k, tgl: k}]]];
  for (const L of lapisan.slice(1)) r.push([`Citra dan ${L.pendek || L.nama}`, `Warna asli dan ${L.nama}, tanggal sama`, [{j: p.k, tgl: tglKlem(L, k, kini)}, {j: L.k, tgl: tglKlem(L, k, kini)}]]);
  return r;
}
/* gaya MapLibre satu sisi */
function gaya(s, byk) {
  const src = {}, lay = [{id: "bg", type: "background", paint: {"background-color": "#1b2430"}}];
  const esri = () => { src.esri = {type: "raster", tiles: [ESRI], tileSize: 256, maxzoom: 18, attribution: "Citra © Esri, Maxar, Earthstar"}; lay.push({id: "esri", type: "raster", source: "esri"}); };
  if (s.j === "esri") esri();
  else if (byk[s.j]) { const L = byk[s.j]; if (L.dasar) esri();
    src.gibs = {type: "raster", tiles: [urlGibs(L, s.tgl)], tileSize: 256, minzoom: 1, maxzoom: L.mz, attribution: "Citra: NASA GIBS, " + L.atr + ", " + tglPendek(s.tgl)};
    lay.push({id: "gibs", type: "raster", source: "gibs", paint: {"raster-fade-duration": 0}}); }
  return {version: 8, sources: src, layers: lay};
}

/* ---------- tampilan ---------- */
let REG = null;
const registri = () => REG ||= typeof fetch === "function" ? fetch("/bencana.json").then(r => r.ok ? r.json() : Promise.reject(new Error("registri " + r.status))).then(j => j.bencana || [], () => []) : Promise.resolve([]);
let A = null, IZIN = false, BYK = {}, terbuka = false, membuka = false, dibuat = false, p = 50, rafP = 0, kunci = false, tombol = null, sisi = [], PRE = [];
const el = {}, maps = [null, null], terpasang = [null, null];
const peta = () => A.peta();

function baris() { const h = A.host(); if (!h) return null; let b = h.querySelector(".ct-baris"); if (!b) { b = document.createElement("div"); b.className = "ct-baris"; h.appendChild(b); } return b; }
function pasangTombol() {
  const b = baris(); if (!b || document.getElementById("ctBdBuka")) return;
  b.insertAdjacentHTML("afterbegin", `<button class="ct-tbl" id="ctBdBuka" type="button" aria-pressed="false" aria-label="Banding peta, bandingkan dua citra satelit" title="Banding citra"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M8 10l-2 2 2 2M16 10l2 2-2 2"/></svg></button>`);
  tombol = document.getElementById("ctBdBuka"); tombol.onclick = () => terbuka ? tutup() : buka();
}

function atur(v) { p = Math.max(0, Math.min(100, v)); if (rafP) return;
  rafP = requestAnimationFrame(() => { rafP = 0; el.root.style.setProperty("--p", p + "%"); el.gar.setAttribute("aria-valuenow", Math.round(p)); }); }
function bangunPembatas() {
  const g = el.gar; let r = null;
  g.onpointerdown = e => { r = el.root.getBoundingClientRect(); g.setPointerCapture(e.pointerId); el.root.classList.add("geser"); e.preventDefault(); };
  g.onpointermove = e => { if (r) atur((e.clientX - r.left) / r.width * 100); };
  g.onpointerup = g.onpointercancel = () => { r = null; el.root.classList.remove("geser"); };
  g.onkeydown = e => { const d = {ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100}[e.key]; if (d != null) { atur(p + d); e.preventDefault(); } };
}

/* kamera: ketiga peta saling ikut, tanpa umpan balik; peta halaman yang tertutup cukup disamakan sekali di moveend */
const sembunyi = m => m === maps[0] && sisi[0].j === "utama";
function ikut(sumber) { for (const ev of ["move", "moveend"]) sumber.on(ev, () => { if (kunci || !terbuka) return; kunci = true;
  const c = {center: sumber.getCenter(), zoom: sumber.getZoom()};
  [peta(), ...maps].forEach(m => m && m !== sumber && !sembunyi(m) && (m !== peta() || ev === "moveend" || sisi[0].j === "utama") && m.jumpTo(c)); kunci = false; }); }

const kunciGaya = s => [s.j, s.tgl].join("|");
function etiket(i) {
  const s = sisi[i], [a, b] = label(s, BYK); el.sisi[i].hidden = s.j === "utama"; el.atr.hidden = sisi[0].j !== "utama";
  el.chip[i].innerHTML = `<b>${esc(a)}</b><span>${esc(b)}</span>`; el.chip[i].title = b; }
function muatGaya(i) {
  const s = sisi[i], m = maps[i]; if (!m || s.j === "utama") return;
  if (terpasang[i] !== kunciGaya(s)) { terpasang[i] = kunciGaya(s); m.setStyle(gaya(s, BYK), {diff: false}); }
  requestAnimationFrame(() => { m.resize(); m.jumpTo({center: peta().getCenter(), zoom: peta().getZoom()}); }); }

function popover(i) {
  const s = sisi[i], po = el.po[i];
  if (!po.hidden && po.dataset.buka) { po.hidden = true; delete po.dataset.buka; el.chip[i].setAttribute("aria-expanded", "false"); return; }
  el.po[1 - i].hidden = true; delete el.po[1 - i].dataset.buka;
  const L = BYK[s.j], jenis = [...(i === 0 ? [["utama", "Peta utama"]] : []), ...A.lapisan.map(x => [x.k, x.nama]), ["esri", "Citra resolusi tinggi Esri"]];
  po.innerHTML = jenis.map(([k, n]) => `<button type="button" data-j="${esc(k)}" aria-pressed="${k === s.j}">${esc(n)}</button>`).join("")
    + (L ? `<label class="ct-in">Tanggal<input type="date" min="${L.dari || "2000-02-24"}" max="${kemarin()}" value="${s.tgl}"></label>` : "");
  po.hidden = false; po.dataset.buka = 1; el.chip[i].setAttribute("aria-expanded", "true");
}
function ganti(i, n) { sisi[i] = {...sisi[i], ...n}; etiket(i); tunda(() => muatGaya(i)); }
function aturSumber(i, po) {
  po.onclick = e => { const b = e.target.closest("button[data-j]"); if (!b) return; const j = b.dataset.j, s = sisi[i], L = BYK[j];
    sisi[i] = L ? {j, tgl: tglKlem(L, s.tgl || kemarin())} : {j}; delete po.dataset.buka; popover(i);
    etiket(i); tunda(() => muatGaya(i)); };
  po.oninput = e => { const t = e.target; clearTimeout(po._t);
    if (t.type === "date") po._t = setTimeout(() => BYK[sisi[i].j] && tglSah(BYK[sisi[i].j], t.value) && ganti(i, {tgl: t.value}), 150); };
}

function kerangka() {
  const root = el.root = document.createElement("div"); root.id = "ctBd"; root.hidden = true;
  root.innerHTML = `<div class="ct-s ct-a"><div class="ct-m"></div></div><div class="ct-s ct-b"><div class="ct-m"></div></div>
    <div class="ct-gar" role="slider" tabindex="0" aria-label="Pembatas banding, geser kiri atau kanan" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><i></i><span aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 7-5 5 5 5M15 7l5 5-5 5"/></svg></span></div>
    <div class="ct-chip ct-ka"><button type="button" aria-haspopup="true" aria-expanded="false" aria-label="Sumber kiri"></button><div class="ct-po" hidden></div></div>
    <div class="ct-chip ct-ki"><button type="button" aria-haspopup="true" aria-expanded="false" aria-label="Sumber kanan"></button><div class="ct-po" hidden></div></div>
    <div class="ct-bar"></div><div class="ct-atr" hidden>© OpenFreeMap © OpenMapTiles Data dari OpenStreetMap</div>`;
  A.wadah().appendChild(root);
  el.gar = root.querySelector(".ct-gar"); el.sisi = [...root.querySelectorAll(".ct-s")]; el.atr = root.querySelector(".ct-atr");
  el.chip = [...root.querySelectorAll(".ct-chip > button")]; el.po = [...root.querySelectorAll(".ct-po")];
  el.chip.forEach((b, i) => { b.onclick = () => popover(i); aturSumber(i, el.po[i]); });
  const bar = root.querySelector(".ct-bar");
  bar.innerHTML = PRE.map(([n, t], k) => `<button type="button" data-k="${k}" title="${esc(t)}">${esc(n)}</button>`).join("")
    + `<button type="button" class="ct-x" aria-label="Tutup banding" title="Tutup banding"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>Tutup</button>`;
  bar.onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.classList.contains("ct-x")) return tutup();
    const [a, c] = PRE[b.dataset.k][2]; sisi[0] = {...a}; sisi[1] = {...c}; atur(50); etiket(0); etiket(1); tunda(() => { muatGaya(0); muatGaya(1); }); };
  bangunPembatas();
}
/* dua peta dibuat sesudah kerangka tampil (tunda), supaya klik pertama tidak membeku */
function buatPeta() {
  const root = el.root; terpasang[0] = kunciGaya(sisi[0]); terpasang[1] = kunciGaya(sisi[1]);
  [0, 1].forEach(i => { const m = maps[i] = new maplibregl.Map({container: root.querySelectorAll(".ct-m")[i], style: sisi[i].j === "utama" ? {version: 8, sources: {}, layers: []} : gaya(sisi[i], BYK),
    center: peta().getCenter(), zoom: peta().getZoom(), minZoom: 3, maxZoom: 15, attributionControl: false, dragRotate: false, pitchWithRotate: false});
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.AttributionControl({compact: true}), i ? "bottom-right" : "bottom-left");
    if (i) m.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    ikut(m); });
  ikut(peta()); dibuat = true;
}
async function buka() {
  if (!IZIN || terbuka || membuka) return; membuka = true; tombol.setAttribute("aria-pressed", "true");
  if (!el.root) kerangka();
  el.root.hidden = false; A.wadah().classList.add("ct-banding"); etiket(0); etiket(1); el.gar.focus({preventScroll: true});
  if (!dibuat) { await new Promise(r => tunda(r)); buatPeta(); }
  terbuka = true; membuka = false; tunda(() => { muatGaya(0); muatGaya(1); });
}
function tutup() {
  if (!terbuka) return; terbuka = false; el.root.hidden = true; el.po.forEach(x => x.hidden = true);
  A.wadah().classList.remove("ct-banding"); tombol.setAttribute("aria-pressed", "false"); tombol.focus({preventScroll: true});
  requestAnimationFrame(() => peta().resize());
}

function pasang(a) {
  A = a; BYK = Object.fromEntries(a.lapisan.map(L => [L.k, L])); PRE = preset(a.lapisan); sisi = PRE[0][2].map(x => ({...x}));
  registri().then(d => { if (!izinReg(d, a.id)) return; IZIN = true; pasangTombol(); });
  return a;
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && terbuka) tutup(); });
window.BandingInti = {pasang, buka, tutup, diizinkan: () => IZIN, registri, model: {izinReg, urlGibs, tglSah, tglKlem, label, preset, gaya, kemarin, hariLalu, tglPendek}};
})();
