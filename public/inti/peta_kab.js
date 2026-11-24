"use strict";
/* inti/peta_kab.js (PB-81.3, F-41, D15, D16): SATU mesin lapisan choropleth "per kab/kota" untuk semua bencana selain karhutla
   (karhutla tetap memakai public/peta_kab.js). Sumber angka = seri `kab` di berkas laporan harian bencana itu (kontrak
   docs/multi-bencana/LAPORAN-HARIAN.md, mesin inti/laporan.js): satu sumber dengan laporan harian, tidak dihitung ulang selain
   penjumlahan per periode menurut `agregat` metrik (jumlah, maks, rerata; sama dengan gabung() di laporan.js).
   Geometri: /geo/kabupaten/<kodeprov>.json (properti `kab` = nama, dicocokkan dengan nama di seri kab dalam provinsi yang sama).
   Kab tanpa angka = abu-abu "tidak ada data", bukan nol. Data dan geometri dimuat SATU KALI saat lapisan pertama dinyalakan.
   Digerbangi kemampuan.layar.peta_kab di /bencana.json; tanpa kunci menyala tidak ada kontrol dan tidak ada unduhan.

   Adaptor: {id: "gempa",
             url: "/gempa/data/laporan.json",
             peta: () => peta MapLibre halaman (boleh belum ada saat pasang),
             host: () => #lapis (kotak Overlay; mesin menambah satu grup "Per kab/kota"),
             legenda: () => #legenda (kartu legenda mesin disisipkan sebelum elemen ini),
             hipotesis: kunciMetrik => teks pil ("" = tanpa pil)}   // opsional
   PetaKabInti.pasang(adaptor). Warna kelas diturunkan dari token tema (--surface ke --f3/--info/--brand2); kerja berat lewat nanti(). */
(() => {
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const ada = v => typeof v === "number" && isFinite(v);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const tgl = iso => `${+iso.slice(8, 10)} ${BLN[+iso.slice(5, 7) - 1]}`;
const tglTh = iso => `${tgl(iso)} ${iso.slice(0, 4)}`;

/* ---------- model murni (diuji di tests/layar/pb_peta_kab.test.mjs) ---------- */
const izinReg = (daftar, id) => id !== "karhutla" && (daftar || []).find(b => b.id === id)?.kemampuan?.layar?.peta_kab === true;
/* sama dengan gabung() di inti/laporan.js: hari tanpa angka dilewati; semua kosong = null */
function gabung(m, a) { const v = (a || []).filter(ada); if (!v.length) return null; const j = v.reduce((x, y) => x + y, 0);
  return m.agregat === "maks" ? Math.max(...v) : m.agregat === "rerata" ? j / v.length : j; }
/* periode yang bisa dipilih: berakhir di hari terakhir yang lengkap (hari_lengkap), hanya yang hari datanya cukup (D16) */
function opsiPeriode(D) {
  const n = (D.hari || []).length; if (!n) return [];
  let e = D.hari.indexOf(D.hari_lengkap); if (e < 0) e = n - 1;
  const o = [{k: "1", i0: e, i1: e, label: "Hari terakhir"}];
  if (e >= 6) o.push({k: "7", i0: e - 6, i1: e, label: "7 hari"});
  if (e >= 29) o.push({k: "30", i0: e - 29, i1: e, label: "30 hari"});
  return o;
}
const kunciKab = (prov, nama) => `${prov}|${nama}`;
/* nilai per kab untuk satu metrik dan periode: {kunci: angka|null}; kab tanpa angka satu pun di periode = null (bukan 0) */
function nilaiKab(D, m, i0, i1) {
  const o = {}; for (const k of D.kab || []) o[kunciKab(k.prov, k.nama)] = gabung(m, Array.isArray(k[m.k]) ? k[m.k].slice(i0, i1 + 1) : []); return o;
}
const dua = v => Number(Number(v).toPrecision(2));
/* batas atas kelas bernilai positif: kuartil dari nilai positif, dibulatkan dua angka penting, tanpa duplikat; nol punya kelas sendiri */
function batas(nilai) {
  const p = nilai.filter(v => ada(v) && v > 0).sort((a, b) => a - b); if (!p.length) return [];
  const q = f => p[Math.min(p.length - 1, Math.floor(f * p.length))];
  const b = []; for (const f of [.25, .5, .75]) { const x = dua(q(f)); if (x > 0 && (!b.length || x > b[b.length - 1])) b.push(x); }
  while (b.length && b[b.length - 1] >= p[p.length - 1]) b.pop();   /* kelas teratas tidak boleh kosong */
  return b;
}
/* kelas: -1 = tidak ada data, 0 = nol, 1.. = positif menurut batas */
function kelas(b, v) { if (!ada(v)) return -1; if (v <= 0) return 0; let k = 1; for (const x of b) if (v > x) k++; return k; }
const jumlahKelas = b => b.length + 2;
/* takaran warna (0 sampai 1) tiap kelas dari yang terang ke pekat; kelas nol hampir polos */
const takaran = n => Array.from({length: n}, (_, j) => j === 0 ? .08 : n <= 2 ? 1 : .25 + .75 * (j - 1) / (n - 2));
const arahToken = m => m.arah === "naik_baik" ? "--info" : m.arah === "netral" ? "--brand2" : "--f3";
const kataAgregat = m => m.agregat === "maks" ? "tertinggi" : m.agregat === "rerata" ? "rata-rata per hari" : "jumlah";
function angka(v, m, perlu) { const d = m.desimal | 0; return ada(v) ? v.toLocaleString("id-ID", {minimumFractionDigits: 0, maximumFractionDigits: Math.max(d, perlu && !Number.isInteger(v) && Math.abs(v) < 10 ? 1 : 0)}) : "–"; }
const labelPeriode = (D, p) => p.i0 === p.i1 ? tglTh(D.hari[p.i1]) : `${tgl(D.hari[p.i0])} sampai ${tglTh(D.hari[p.i1])}`;
/* tulisan batas di bawah legenda: 0, lalu batas atas tiap kelas, lalu "lebih dari" batas terakhir */
function labelBatas(b, m) { const t = ["0"]; b.forEach(x => t.push("≤ " + angka(x, m, true))); if (b.length) t.push("> " + angka(b[b.length - 1], m, true)); else t.push("> 0"); return t; }

/* ---------- warna dari token tema ---------- */
let kanvas = null;
function rgb(css) {
  try { kanvas ||= document.createElement("canvas").getContext("2d", {willReadFrequently: true}); kanvas.canvas.width = kanvas.canvas.height = 1;
    kanvas.clearRect(0, 0, 1, 1); kanvas.fillStyle = "#000"; kanvas.fillStyle = css; kanvas.fillRect(0, 0, 1, 1); const d = kanvas.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; } catch (e) { return null; }
}
const token = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const campur = (a, b, t) => `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(",")})`;
function warnaKelas(m, n) {
  const dasar = rgb(token("--surface")), tujuan = rgb(token(arahToken(m)));
  if (!dasar || !tujuan) return takaran(n).map(() => token(arahToken(m)));
  return takaran(n).map(t => campur(dasar, tujuan, t));
}
const warnaNA = () => { const a = rgb(token("--ink2")), b = rgb(token("--surface")); return a && b ? campur(b, a, .35) : token("--ink2"); };

/* ---------- tampilan ---------- */
let REG = null;
const registri = () => REG ||= typeof fetch === "function" ? fetch("/bencana.json").then(r => r.ok ? r.json() : Promise.reject(new Error("registri " + r.status))).then(j => j.bencana || [], () => []) : Promise.resolve([]);
const tunda = f => typeof nanti === "function" ? nanti(f) : setTimeout(f, 0);
let A = null, D = null, janji = null, FC = null, hidup = false, st = {m: null, p: "7"}, gen = 0, el = {}, hov = null, tipEl = null, KAB = {}, KLS = null;

const ambil = () => janji ||= (async () => {
  const r = await fetch(A.url); if (!r.ok) throw new Error("laporan " + r.status);
  const j = await r.json(); if (!Array.isArray(j.hari) || !Array.isArray(j.metrik) || !Array.isArray(j.kab)) throw new Error("laporan tanpa seri kab");
  const prov = [...new Set(j.kab.map(k => k.prov))];
  const fcs = await Promise.all(prov.map(async p => { const g = await fetch(`/geo/kabupaten/${p}.json`); if (!g.ok) throw new Error("geo " + p); return g.json(); }));
  const features = prov.flatMap((p, i) => fcs[i].features.map(f => ({type: "Feature", geometry: f.geometry, properties: {kunci: kunciKab(p, f.properties.kab), nama: f.properties.kab, prov: p}})));
  D = j; FC = {type: "FeatureCollection", features}; return j;
})().catch(e => { janji = null; throw e; });

const metrikAktif = () => D.metrik.find(m => m.k === st.m) || D.metrik.find(m => m.utama) || D.metrik[0];
/* bawaan 7 hari: satu hari terakhir sering kosong untuk bencana jarang (gempa); bila data kurang dari 7 hari, jatuh ke opsi pertama */
const periodeAktif = () => { const o = opsiPeriode(D); return o.find(x => x.k === st.p) || o[0]; };

function bangunKontrol() {
  const host = A.host(); if (!host || el.grup) return;
  /* grup <details> + ubin seperti grup Overlay lain. Ubin sudah berada di dalam .ub-gr, jadi ubinLapis (inti/peta/lapis.js)
     yang hanya mengubah <label> anak langsung <details> tidak menyentuhnya; input tanpa data-l agar penangan #lapis halaman tidak membacanya */
  const g = document.createElement("details"); g.className = "pk-grup"; g.open = true;
  g.innerHTML = `<summary>Per kab/kota</summary><div class="ub-gr"><label class="ubin" data-tip="<b>Laporan harian per kab/kota</b>"><input type="checkbox" id="pkNyala">`
    + `<i class="ub-th" style="--a:#7a2e3a;--b:#e0866a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5l5-2 6 2 5-2v16l-5 2-6-2-5 2z"/><path d="M9 3v16M15 5v16"/></svg></i>`
    + `<span>Laporan harian</span></label></div><div class="pk-kontrol" id="pkKontrol" hidden></div>`;
  host.appendChild(g); el.grup = g; el.nyala = g.querySelector("#pkNyala"); el.kontrol = g.querySelector("#pkKontrol");
  /* kontrol milik mesin: perubahan tidak boleh sampai ke penangan #lapis halaman (yang membaca data-l) */
  g.addEventListener("change", e => { e.stopPropagation(); const t = e.target;
    if (t === el.nyala) return nyalakan(t.checked);
    if (t.matches("select[data-pk]")) { st.m = t.value; tunda(gambar); } });
  g.addEventListener("click", e => { const b = e.target.closest("button[data-pp]"); if (!b || !D) return; e.stopPropagation();
    st.p = b.dataset.pp; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); tunda(gambar); });
}
function isiKontrol() {
  const ms = D.metrik, po = opsiPeriode(D), m = metrikAktif(), p = periodeAktif();
  el.kontrol.innerHTML = `<label class="pk-baris"><span>Metrik</span><select data-pk aria-label="Metrik peta per kab/kota">${ms.map(x => `<option value="${esc(x.k)}"${x.k === m.k ? " selected" : ""}>${esc(x.label)}</option>`).join("")}</select></label>`
    + `<div class="seg penuh" role="group" aria-label="Periode peta per kab/kota">${po.map(x => `<button type="button" data-pp="${x.k}" aria-pressed="${x.k === p.k}">${esc(x.label)}</button>`).join("")}</div>`;
  el.kontrol.hidden = false;
}

function legenda() {
  if (el.leg) return el.leg;
  const ref = A.legenda && A.legenda(); if (!ref) return null;
  const k = document.createElement("div"); k.className = "box pk-leg"; k.id = "pkLegenda"; k.hidden = true; k.setAttribute("aria-label", "Legenda peta per kab/kota");
  ref.parentNode.insertBefore(k, ref); return el.leg = k;
}
function gambarLegenda(m, p, b, w) {
  const k = legenda(); if (!k) return; const hip = A.hipotesis ? A.hipotesis(m.k) : "";
  const lb = labelBatas(b, m);
  k.innerHTML = `<div class="lbl">${esc(m.label)}, ${esc(kataAgregat(m))} per kab/kota${hip ? ` <span class="pk-pil">Hipotesis</span>` : ""}</div>`
    + `<div class="legscale">${w.map(c => `<i style="background:${c}"></i>`).join("")}</div><div class="legnum">${lb.map(t => `<span>${esc(t)}</span>`).join("")}</div>`
    + `<div class="pk-na"><i style="background:${KLS.na}"></i>Tidak ada data</div>`
    + `<div class="pk-ket">${esc(labelPeriode(D, p))}, satuan ${esc(m.satuan || "")}. Sumber: laporan harian ${esc((D.sumber || []).map(s => s.nama).filter(Boolean).join(", ") || D.judul || "")}.${hip ? " " + esc(hip) + "." : ""}</div>`;
  k.hidden = false;
}

/* ---------- peta ---------- */
const petaSiap = () => new Promise(res => { const P = A.peta && A.peta(); if (!P) return res(null);
  if (P.isStyleLoaded()) return res(P); const f = () => { if (P.isStyleLoaded()) { P.off("idle", f); res(P); } }; P.on("idle", f); });
function pasangLapisan(P) {
  if (!FC || P.getSource("pkab")) return;
  const bawah = P.getStyle().layers.find(l => l.type === "symbol")?.id;
  P.addSource("pkab", {type: "geojson", data: FC, promoteId: "kunci"});
  P.addLayer({id: "pkab-fill", type: "fill", source: "pkab", paint: {"fill-color": ["to-color", ["coalesce", ["feature-state", "c"], "rgba(0,0,0,0)"]], "fill-opacity": .82}}, bawah);
  P.addLayer({id: "pkab-line", type: "line", source: "pkab", paint: {"line-color": ["to-color", ["coalesce", ["feature-state", "g"], "rgba(0,0,0,0)"]], "line-opacity": .8, "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.2, .6]}}, bawah);
  ikat(P);
}
function gambar() {
  if (!hidup || !D) return; const P = A.peta && A.peta(); if (!P || !P.getLayer("pkab-fill")) return;
  const ini = ++gen, m = metrikAktif(), p = periodeAktif(); KAB = nilaiKab(D, m, p.i0, p.i1);
  const b = batas(Object.values(KAB)), n = jumlahKelas(b), w = warnaKelas(m, n), na = warnaNA(), garis = token("--ink2");
  KLS = {m, p, b, w, na};
  const fs = FC.features; let i = 0;
  (function potong() {   /* satu paket kecil per frame: peta tidak membeku saat ganti metrik */
    if (ini !== gen) return;
    for (const stop = Math.min(fs.length, i + 150); i < stop; i++) { const k = fs[i].properties.kunci, v = KAB[k];
      P.setFeatureState({source: "pkab", id: k}, {c: ada(v) ? w[Math.max(0, kelas(b, v))] : na, g: garis}); }
    if (i < fs.length) requestAnimationFrame(potong);
  })();
  gambarLegenda(m, p, b, w);
}
async function nyalakan(on) {
  const P0 = A.peta && A.peta(); hidup = on; gen++;
  if (!on) { P0 && ["pkab-fill", "pkab-line"].forEach(l => P0.getLayer(l) && P0.setLayoutProperty(l, "visibility", "none")); if (el.leg) el.leg.hidden = true; tip(null); return; }
  try {
    await ambil(); if (!hidup) return;
    if (!el.kontrol.innerHTML) isiKontrol();
    const P = await petaSiap(); if (!P || !hidup) return;
    if (!P._pkStyle) { P._pkStyle = true; P.on("style.load", () => { if (hidup) { pasangLapisan(P); tunda(gambar); } }); }
    pasangLapisan(P); ["pkab-fill", "pkab-line"].forEach(l => P.getLayer(l) && P.setLayoutProperty(l, "visibility", "visible"));
    tunda(gambar);
  } catch (e) { hidup = false; el.nyala.checked = false; el.kontrol.hidden = false; el.kontrol.innerHTML = `<small class="pk-gagal">Peta per kab/kota belum bisa dimuat.</small>`; }
}

/* ---------- tooltip kab ---------- */
function isiTip(f) {
  const p = f.properties, m = KLS.m, v = KAB[p.kunci], hip = A.hipotesis ? A.hipotesis(m.k) : "";
  const prov = D.prov && Object.hasOwn(D.prov, p.prov) ? D.prov[p.prov].nama : p.prov;
  const sumber = (D.sumber || []).map(s => s.nama).filter(Boolean).join(", ");
  return `<b class="pk-tn">${esc(p.nama)}</b><small>${esc(prov)}</small>`
    + (ada(v) ? `<div class="pk-tv"><b>${esc(angka(v, m))}</b> ${esc(m.satuan || "")}</div><small>${esc(m.label)}, ${esc(kataAgregat(m))}</small>` : `<div class="pk-tv">Tidak ada data</div><small>${esc(m.label)}</small>`)
    + `<small>${esc(labelPeriode(D, KLS.p))}</small><small>Sumber: ${esc(sumber)}</small>${hip ? `<small class="pk-pil">Hipotesis</small>` : ""}`;
}
function tip(f, e) {
  if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "pk-tip"; tipEl.setAttribute("role", "tooltip"); tipEl.hidden = true; document.body.appendChild(tipEl); }
  if (!f) { tipEl.hidden = true; return; }
  tipEl.innerHTML = isiTip(f); tipEl.hidden = false;
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight, x = e.clientX + 14, y = e.clientY + 14;
  tipEl.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + "px"; tipEl.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + "px";
}
function ikat(P) {
  if (P._pkIkat) return; P._pkIkat = true;
  const hover = id => { if (hov === id) return; if (hov !== null) P.setFeatureState({source: "pkab", id: hov}, {hover: false}); hov = id; if (id !== null) P.setFeatureState({source: "pkab", id}, {hover: true}); };
  P.on("mousemove", "pkab-fill", e => { if (!hidup || !KLS) return; const f = e.features[0]; if (!f) return;
    hover(f.id); const t = document.getElementById("tip"); if (t && t.classList.contains("on")) return tip(null);   /* kartu hover halaman (titik, penanda) didahulukan */
    P.getCanvas().style.cursor = "pointer"; tip(f, e.originalEvent); });
  P.on("mouseleave", "pkab-fill", () => { hover(null); P.getCanvas().style.cursor = ""; tip(null); });
  P.on("click", "pkab-fill", e => { if (!hidup || !KLS || !e.features[0]) return; tip(e.features[0], e.originalEvent); });   /* sentuh layar: tooltip menetap sampai geser */
  P.on("movestart", () => tip(null));
}

function pasang(a) {
  A = a; D = null; janji = null; hidup = false; el = {}; KLS = null;
  if (typeof document !== "undefined" && !document.getElementById("pkCss")) document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" id="pkCss" href="/inti/peta_kab.css">');
  registri().then(d => { if (!izinReg(d, a.id)) return; bangunKontrol(); });
  return a;
}

window.PetaKabInti = {pasang, registri, model: {izinReg, gabung, opsiPeriode, kunciKab, nilaiKab, batas, kelas, jumlahKelas, takaran, labelBatas, labelPeriode, kataAgregat, arahToken, angka}};
})();
