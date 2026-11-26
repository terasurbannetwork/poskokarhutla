/* Maskot Lapor Bencana: "Sigap", petugas BNPB versi chibi (pemilik 19 Nov 2026: telur bulat "jelek banget sumpah").
   Prinsip karakter yang dipakai: siluet terbaca dari jauh (helm + seragam = petugas), proporsi chibi kepala hampir sebesar badan,
   palet sempit (navy, oranye, kulit, putih), wajah ekspresif (mata besar dua titik cahaya, alis, mulut terbuka), logo BNPB sekali di helm,
   satu gestur jelas (melambai) dan satu properti (HP = melapor). Volume lewat gradien lembut, bukan garis tepi.
   Warna lewat kelas .sg-* di lapor.css (token tema). Gerak lewat CSS (.mk): apung, kedip, lambai; mati saat prefers-reduced-motion.
   Pakai: maskot("sapa") -> string SVG. */
let n = 0;
/* ===== Rig & gerak (pemilik 25 Nov 2026: "kaku... muka dan semua badannya bisa gerak, ada mimik mukanya").
   Satu tabel MIMIK jadi sumber CSS dan pose; kontroler tunggal (satu pointermove, satu rAF) menempel otomatis ke tiap svg.mk.sg. ===== */
// alis [kiriY, kiriRot, kananY, kananRot]; l = kelopak [kiri,kanan]; a = busur mata tertutup; ms = skala mata; pp = skala pipi
export const MIMIK = {
  sapa: {mu: "sapa", k: [0, 0, 0, 0], l: [0, 0], a: [0, 0], ms: 1, pp: 1},
  semangat: {mu: "semangat", k: [-3, -4, -3, 4], l: [0, 0], a: [0, 0], ms: 1.04, pp: 1.2},
  senang: {mu: "senang", k: [-2, -3, -2, 3], l: [.12, .12], a: [0, 0], ms: 1, pp: 1.2},
  senyum: {mu: "senyum", k: [0, 0, 0, 0], l: [.15, .15], a: [0, 0], ms: 1, pp: 1.1},
  tertawa: {mu: "senang", k: [-3, -4, -3, 4], l: [1, 1], a: [1, 1], ms: 1, pp: 1.35},
  kaget: {mu: "kaget", k: [-7, 0, -7, 0], l: [0, 0], a: [0, 0], ms: 1.12, pp: .8},
  berpikir: {mu: "pikir", k: [2, 8, -6, -12], l: [.25, .05], a: [0, 0], ms: 1, pp: .9},
  prihatin: {mu: "sedih", k: [1, -16, 1, 16], l: [.2, .2], a: [0, 0], ms: 1, pp: .7},
  wink: {mu: "sapa", k: [0, 0, -3, 0], l: [0, 1], a: [0, 1], ms: 1, pp: 1.15}};
export const DASAR = {sapa: "sapa", semangat: "semangat", senang: "senang", sedih: "prihatin"};
const AKSI = {lihat: 3, hp: 2, miring: 2, rentang: 1, lambai: 1, wink: .7, gelembung: 2};
const BUKAN_SEDIH = ["rentang", "lambai", "wink"]; // pose sedih tetap prihatin: tanpa tawa, lambai, kedip sebelah
export const REAKSI = {umum: ["lompat", "lambai", "wink", "kaget"], sedih: ["angguk", "kaget"]};
function pilih(daftar, rnd) { let t = rnd * daftar.reduce((s, [, w]) => s + w, 0); for (const [a, w] of daftar) if ((t -= w) < 0) return a; return daftar[daftar.length - 1][0]; }
export function pilihAksi(pose, rnd, {kurang = false, gelembung = false} = {}) {
  if (kurang) return null;
  return pilih(Object.entries(AKSI).filter(([a]) => (gelembung || a !== "gelembung") && !(pose === "sedih" && BUKAN_SEDIH.includes(a))), rnd);
}
export function pilihReaksi(pose, rnd) { const r = pose === "sedih" ? REAKSI.sedih : REAKSI.umum; return r[Math.min(r.length - 1, Math.floor(rnd * r.length))]; }
// arah pandang iris (satuan SVG), jenuh halus di `skala` piksel layar, maksimum `maks`
export function arahPandang(dx, dy, skala = 200, maks = 4) {
  const v = Math.hypot(dx, dy); if (!v) return {x: 0, y: 0};
  const f = Math.min(1, v / skala) * maks; return {x: dx / v * f, y: dy / v * f};
}
const ORIGIN = {gb: "120 262", ba: "120 236", nf: "120 236", kb: "120 150", kt: "120 156", kp: "120 156", kaki: "120 262", mata: "120 112", pp: "120 130",
  lk: "84 172", rk: "162 178", a1: "95 86", a2: "145 86", l1: "98 96", l2: "142 96", hm: "120 90", ant: "68 186", fitur: "120 110"};
export function gaya() {
  const px = o => o.split(" ").map(v => v + "px").join(" ");
  let c = Object.entries(ORIGIN).map(([k, o]) => `.mk .mk-${k}{transform-box:view-box;transform-origin:${px(o)}}`).join("");
  for (const [k, v] of Object.entries(MIMIK)) {
    const [a, b, d, e] = v.k;
    c += `.mk[data-mimik="${k}"]{--k1y:${a};--k1r:${b};--k2y:${d};--k2r:${e};--l1:${v.l[0]};--l2:${v.l[1]};--q1:${v.a[0]};--q2:${v.a[1]};--ms:${v.ms};--pp:${v.pp}}`
      + `.mk[data-mimik="${k}"] .mk-mu-${v.mu}{opacity:1}`;
  }
  return c + `.mk .mk-mu,.mk .mk-q{opacity:0;transition:opacity .14s}.mk .mk-q1{opacity:var(--q1,0)}.mk .mk-q2{opacity:var(--q2,0)}
.mk .mk-a1{transform:translateY(calc(var(--k1y,0)*1px)) rotate(calc(var(--k1r,0)*1deg));transition:transform .3s cubic-bezier(.3,1.5,.5,1)}
.mk .mk-a2{transform:translateY(calc(var(--k2y,0)*1px)) rotate(calc(var(--k2r,0)*1deg));transition:transform .3s cubic-bezier(.3,1.5,.5,1)}
.mk .mk-l1{transform:scaleY(var(--l1,0));transition:transform .09s}.mk .mk-l2{transform:scaleY(var(--l2,0));transition:transform .09s}
.mk.mk-kd .mk-l1,.mk.mk-kd .mk-l2{transform:scaleY(1)}
.mk[data-mimik] .mk-mata{animation:none;transform:scale(var(--ms,1));transition:transform .18s}
.mk .mk-pp{transform:scale(var(--pp,1));opacity:calc(var(--pp,1)*.7);transition:transform .3s,opacity .3s}
.mk .mk-lk,.mk .mk-rk,.mk .mk-kt{transition:transform .4s cubic-bezier(.3,1.3,.5,1)}
.mk-a-hp .mk-lk{transform:rotate(-38deg) translateY(-8px)}.mk-a-hp .mk-kt{transform:translateY(2px) rotate(-3deg)}
.mk-a-miring .mk-kt{transform:rotate(7deg) translateX(2px)}
.mk-a-rentang .mk-rk{transform:rotate(-40deg)}.mk-a-rentang .mk-lk{transform:rotate(18deg)}.mk-a-rentang .mk-kt{transform:translateY(-2px) rotate(-4deg)}.mk-a-rentang .mk-nf{transform:scaleY(1.04)}
.mk.mk-jeda .mk-nf,.mk.mk-jeda .mk-kb,.mk.mk-jeda .mk-ba,.mk.mk-jeda .mk-kaki,.mk.mk-jeda .mk-tubuh,.mk.mk-jeda .mk-bayang,.mk.mk-jeda .mk-lambai,.mk.mk-jeda .mk-kepala{animation-play-state:paused}
@media (prefers-reduced-motion:no-preference){
.mk .mk-nf{animation:mk-nafas 3.4s ease-in-out infinite}.mk .mk-kb{animation:mk-kb 3.4s ease-in-out infinite}
.mk .mk-ba{animation:mk-geser 9s ease-in-out infinite}.mk .mk-kaki{animation:mk-geserk 9s ease-in-out infinite}
.mk.mk-a-lompat .mk-gb{animation:mk-lompat .7s ease-out}.mk.mk-a-kaget .mk-gb{animation:mk-kaget .5s ease-out}.mk.mk-a-geli .mk-gb{animation:mk-geli .3s ease-in-out 2}
.mk.mk-a-lambai .mk-rk{animation:mk-lb 1s ease-in-out}img.lp-logo-pantau.mk-logo-pop{animation:mk-logo .6s ease-out}}
.mk .mk-vol{pointer-events:none}
@media (prefers-reduced-motion:reduce){.mk *{transition:none!important}}
@keyframes mk-nafas{50%{transform:scaleY(1.015)}}@keyframes mk-kb{50%{transform:translateY(-1px)}}
@keyframes mk-geser{50%{transform:rotate(.8deg) translateX(1px)}}@keyframes mk-geserk{50%{transform:skewX(-1.5deg)}}
@keyframes mk-lompat{0%{transform:none}18%{transform:translateY(2px) scale(1.1,.88)}45%{transform:translateY(-22px) scale(.93,1.11)}72%{transform:scale(1.08,.92)}86%{transform:scale(.98,1.03)}}
@keyframes mk-kaget{30%{transform:translateY(-8px) scale(.96,1.05)}}@keyframes mk-geli{25%{transform:rotate(-2deg)}75%{transform:rotate(2deg)}}
@keyframes mk-lb{12%{transform:rotate(8deg)}30%{transform:rotate(-26deg)}50%{transform:rotate(8deg)}70%{transform:rotate(-20deg)}85%{transform:rotate(4deg)}}@keyframes mk-logo{14%{transform:scale(.92) rotate(-6deg)}55%{transform:scale(1.12) rotate(120deg)}80%{transform:scale(.98) rotate(-10deg)}}`;
}
/* ---- kontroler (hanya di peramban) ---- */
const D = typeof document !== "undefined" ? document : null;
const kurang = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const daftar = new Map();
let pt = null, raf = 0, tp = 0, nLihat = 0, io;
const kick = () => { if (!raf && nLihat && !D.hidden) raf = requestAnimationFrame(putar); };
function kls(m, c, ms) { m.el.classList.add(c); clearTimeout(m[c]); m[c] = setTimeout(() => m.el.classList.remove(c), ms); m.sibuk = performance.now() + ms; }
function pulih(m) { m.el.dataset.mimik = m.hover && m.pose !== "sedih" ? "senang" : DASAR[m.pose] || "sapa"; }
function mimik(m, nama, ms) { m.el.dataset.mimik = nama; clearTimeout(m.tm); if (ms) m.tm = setTimeout(() => pulih(m), j(ms)); }
function fokus(m, x, y, ms) { m.fokus = {x, y}; clearTimeout(m.tf); m.tf = setTimeout(() => { m.fokus = null; kick(); }, j(ms)); kick(); }
const j = ms => ms * (.8 + Math.random() * .4); // durasi acak +-20%
const kedip = m => kls(m, "mk-kd", j(135));
function kedipAcak(m) { // lapisan dasar: selalu jalan, 3-7 dtk, ~20% kedip ganda
  clearTimeout(m.tk); if (!m.lihat || D.hidden) return;
  m.tk = setTimeout(() => { if (m.el.isConnected && m.lihat && !D.hidden) { kedip(m); if (Math.random() < .2) setTimeout(() => kedip(m), 280); } kedipAcak(m); }, 3000 + Math.random() * 4000);
}
const pegas = (s, t) => { s.v = (s.v + (t - s.x) * .2) * .7; s.x += s.v; return Math.abs(s.v) > .01 || Math.abs(t - s.x) > .01; };
function putar() {
  raf = 0; let lagi = false; const k = kurang() ? 1 : .22, segar = pt && performance.now() - pt.t < 2500;
  for (const m of daftar.values()) {
    if (!m.lihat || !m.ir) continue;
    if (m.kotor) { m.rect = m.el.getBoundingClientRect(); m.kotor = false; }
    let t = m.fokus || {x: 0, y: 0};
    if (segar && !m.fokus) { const r = m.rect; t = arahPandang(pt.x - (r.left + r.width / 2), pt.y - (r.top + r.height * .39), Math.max(r.width, 140) * 1.6); }
    if (Math.hypot(t.x - m.tx, t.y - m.ty) > 3.5 && m.gx !== undefined) kedip(m); // sakade: kedip saat pandangan melompat jauh
    m.tx = t.x; m.ty = t.y;
    m.gx += (t.x - m.gx) * .2 * k; m.gy += (t.y - m.gy) * .2 * k;      // mata memimpin
    m.hx += (m.gx - m.hx) * .12 * k;                                   // kepala menyusul
    if (k === 1) { m.gx = t.x; m.gy = t.y; m.hx = t.x; }
    const h = m.hx / 4, a = pegas(m.hm, -h * 3), b = pegas(m.an, h * 3), c = Math.abs(t.x - m.gx) > .03 || Math.abs(t.y - m.gy) > .03 || Math.abs(m.gx - m.hx) > .03;
    if (c || a || b) lagi = true; else { m.gx = t.x; m.gy = t.y; m.hx = t.x; }
    m.ir.style.transform = `translate(${m.gx.toFixed(2)}px,${m.gy.toFixed(2)}px)`;
    m.kp.style.transform = `translate(${(h * 1.5).toFixed(2)}px,0) rotate(${(h * 4).toFixed(2)}deg)`;
    m.ft.style.transform = `translate(${(h * 2).toFixed(2)}px,${(m.gy * .3).toFixed(2)}px)`;   // paralaks: fitur wajah bergeser lebih jauh
    m.hmEl.style.transform = `translate(${(-h * .8).toFixed(2)}px,0) rotate(${m.hm.x.toFixed(2)}deg)`; // helm sedikit menunda
    m.anEl.style.transform = `rotate(${m.an.x.toFixed(2)}deg)`;
  }
  if (lagi) kick();
}
function aksi(m, a) {
  if (a === "kedip") kedip(m);
  else if (a === "kedip2") { kedip(m); setTimeout(() => kedip(m), 230); }
  else if (a === "lihat") fokus(m, (Math.random() < .5 ? -1 : 1) * 3.5, (Math.random() - .5) * 3, 1100);
  else if (a === "hp") { fokus(m, -3, 3.5, 1600); kls(m, "mk-a-hp", 1700); }
  else if (a === "miring") { fokus(m, 3, -3, 1600); kls(m, "mk-a-miring", 1700); if (m.pose !== "sedih") mimik(m, "berpikir", 1700); }
  else if (a === "rentang") kls(m, "mk-a-rentang", 1500);
  else if (a === "lambai") kls(m, "mk-a-lambai", 1500);
  else if (a === "wink") mimik(m, "wink", 900);
  else if (a === "gelembung") {
    const r = m.el.getBoundingClientRect(); let b = null, d = 1e9;
    for (const e of D.querySelectorAll(".lp-hg-gelembung")) { const q = e.getBoundingClientRect(), v = Math.hypot(q.left + q.width / 2 - r.left - r.width / 2, q.top + q.height / 2 - r.top - r.height / 2); if (v < d) { d = v; b = q; } }
    if (b) { const g = arahPandang(b.left + b.width / 2 - r.left - r.width / 2, b.top + b.height / 2 - r.top - r.height * .39, 300); fokus(m, g.x, g.y, 1500); }
  }
}
/* lirikan sendiri (pemilik 26 Nov 2026: "matanya lihat ke depan terus"): tanpa kursor (HP) mata tetap melirik kiri, kanan, atas, bawah tiap 1-3 dtk */
function lirik(m) {
  clearTimeout(m.tl); if (!m.lihat || D.hidden || kurang()) return;
  m.tl = setTimeout(() => {
    const segar = pt && performance.now() - pt.t < 2500;
    if (m.el.isConnected && m.lihat && !segar && m.sibuk < performance.now()) {
      if (Math.random() < .3) fokus(m, 0, 0, 900);
      else fokus(m, (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 2), (Math.random() - .55) * 5, 700 + Math.random() * 1100);
    }
    lirik(m);
  }, 1200 + Math.random() * 1800);
}
function jadwal(m) {
  clearTimeout(m.ti); if (!m.lihat || D.hidden || kurang()) return;
  m.ti = setTimeout(() => {
    if (!m.el.isConnected) { daftar.delete(m.el); io.unobserve(m.el); if (m.lihat) nLihat--; return; }
    if (m.lihat && !D.hidden && m.sibuk < performance.now()) { const o = {kurang: kurang(), gelembung: !!D.querySelector(".lp-hg-gelembung")}; let a = pilihAksi(m.pose, Math.random(), o); if (a === m.ak) a = pilihAksi(m.pose, Math.random(), o); m.ak = a; aksi(m, a); }
    jadwal(m);
  }, 2200 + Math.random() * 3000);
}
function pasang(el) {
  if (daftar.has(el)) return;
  const m = {el, pose: el.dataset.pose || "sapa", gx: 0, gy: 0, hx: 0, tx: 0, ty: 0, hm: {x: 0, v: 0}, an: {x: 0, v: 0}, ft: el.querySelector(".mk-fitur"), hmEl: el.querySelector(".mk-hm"), anEl: el.querySelector(".mk-ant"), ir: el.querySelector(".mk-ir"), kp: el.querySelector(".mk-kp"), kotor: true, tap: [], sibuk: 0, tenang: 0, lihat: false};
  daftar.set(el, m); io.observe(el);
}
function reaksi(m) {
  const t = performance.now(), sedih = m.pose === "sedih"; m.tap = m.tap.filter(x => t - x < 1300); m.tap.push(t);
  if (m.tenang > t) return;
  if (m.tap.length >= 5) { m.tap = []; m.tenang = t + 2500; if (sedih) mimik(m, "prihatin"); else { mimik(m, "tertawa", 1500); if (!kurang()) kls(m, "mk-a-geli", 600); } return; }
  if (m.sibuk > t) return;
  let r = pilihReaksi(m.pose, Math.random()); if (r === m.rk) r = pilihReaksi(m.pose, Math.random()); m.rk = r; const ada = !kurang();
  if (r === "lompat") { mimik(m, "tertawa", 1100); ada && kls(m, "mk-a-lompat", 700); }
  else if (r === "lambai") { mimik(m, "senang", 1500); ada && kls(m, "mk-a-lambai", 1500); }
  else if (r === "wink") mimik(m, "wink", 1000);
  else if (r === "kaget") { mimik(m, "kaget", 900); ada && kls(m, "mk-a-kaget", 500); }
  else if (r === "angguk") ada && kls(m, "mk-a-hp", 600);
}
if (D) {
  const gaya$ = () => { if (!D.getElementById("mk-gaya")) { const s = D.createElement("style"); s.id = "mk-gaya"; s.textContent = gaya(); D.head.appendChild(s); } };
  gaya$();
  io = new IntersectionObserver(es => {
    for (const e of es) { const m = daftar.get(e.target); if (!m) continue; const v = e.isIntersecting; if (v === m.lihat) continue;
      m.lihat = v; nLihat += v ? 1 : -1; m.kotor = true; e.target.classList.toggle("mk-jeda", !v); v ? (jadwal(m), kedipAcak(m), lirik(m)) : (clearTimeout(m.ti), clearTimeout(m.tk), clearTimeout(m.tl)); }
  });
  const cari = r => { if (r.nodeType !== 1) return; if (r.matches(".mk.sg")) pasang(r); for (const e of r.querySelectorAll(".mk.sg")) pasang(e); };
  const mulai = () => { cari(D.body); new MutationObserver(ms => { for (const x of ms) x.addedNodes.forEach(cari); }).observe(D.body, {childList: true, subtree: true}); };
  D.body ? mulai() : D.addEventListener("DOMContentLoaded", mulai);
  const kotor = () => { for (const m of daftar.values()) m.kotor = true; kick(); };
  addEventListener("resize", kotor, {passive: true}); addEventListener("scroll", kotor, {passive: true, capture: true});
  const gerak = e => {
    if (e.pointerType === "touch") { for (const m of daftar.values()) if (m.lihat) { const r = m.el.getBoundingClientRect(), g = arahPandang(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height * .39, Math.max(r.width, 140) * 1.6); fokus(m, g.x, g.y, 1500); } return; }
    pt = {x: e.clientX, y: e.clientY, t: performance.now()}; kick(); clearTimeout(tp); tp = setTimeout(kick, 2600); };
  D.addEventListener("pointermove", gerak, {passive: true}); D.addEventListener("pointerdown", gerak, {passive: true});
  const dari = e => { const s = e.target.closest && e.target.closest(".mk.sg"); return s && daftar.get(s); };
  D.addEventListener("pointerover", e => { const m = dari(e); if (m && e.pointerType !== "touch" && !m.el.contains(e.relatedTarget)) { m.hover = true; pulih(m); } });
  D.addEventListener("pointerout", e => { const m = dari(e); if (m && m.hover && !m.el.contains(e.relatedTarget)) { m.hover = false; pulih(m); } });
  D.addEventListener("focusin", e => { const m = dari(e); if (m) { m.hover = true; pulih(m); } });
  D.addEventListener("focusout", e => { const m = dari(e); if (m) { m.hover = false; pulih(m); } });
  D.addEventListener("click", e => {
    const m = dari(e); if (m) return reaksi(m);
    const l = e.target.closest && e.target.closest("img.lp-logo-pantau"); // kosmetik; tidak menahan tautan induk
    if (l && !kurang() && !l.classList.contains("mk-logo-pop")) { l.classList.add("mk-logo-pop"); setTimeout(() => l.classList.remove("mk-logo-pop"), 650); }
  }, {passive: true});
  D.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("mk")) { const m = daftar.get(e.target); if (m) reaksi(m); } });
  D.addEventListener("visibilitychange", () => { for (const m of daftar.values()) D.hidden ? (clearTimeout(m.ti), clearTimeout(m.tk), clearTimeout(m.tl)) : (jadwal(m), kedipAcak(m), lirik(m)); kick(); });
}
const ALIS_K = "M86 88c5-4 12-5 18-3", ALIS_R = "M136 85c6-2 13-1 18 3", BUSUR = ["M89 113q9-10 18 0", "M133 113q9-10 18 0"];
const G = "stroke-width=\"4\" stroke-linecap=\"round\" fill=\"none\"";
const MULUT = {
  sapa: '<path d="M106 128c4 12 24 12 28 0Z" class="sg-mulut"/><path d="M112 134c4 4 12 4 16 0" class="sg-lidah" stroke-width="4" stroke-linecap="round" fill="none"/>',
  semangat: '<path d="M104 126c4 15 28 15 32 0Z" class="sg-mulut"/><path d="M111 134c5 5 13 5 18 0" class="sg-lidah" stroke-width="4" stroke-linecap="round" fill="none"/>',
  senang: '<path d="M102 125c5 18 31 18 36 0Z" class="sg-mulut"/><path d="M110 135c6 6 14 6 20 0" class="sg-lidah" stroke-width="4" stroke-linecap="round" fill="none"/>',
  sedih: `<path d="M108 136c6-7 18-7 24 0" class="sg-alis" ${G}/>`,
  senyum: `<path d="M106 129c6 8 22 8 28 0" class="sg-alis" ${G}/>`,
  kaget: '<ellipse cx="120" cy="135" rx="6" ry="8" class="sg-mulut"/>',
  pikir: `<path d="M110 134c5-2 9 1 13-1s6-1 8-2" class="sg-alis" ${G}/>`};
/* aksi: maskot memegang papan berikon sesuai yang sedang dijelaskan, geraknya beda per aksi (pemilik 25 Nov 2026: "kalo lapor kejadian tindakannya mungkin berbeda").
   Ikon dari sprite halaman (#i-*), jadi hanya dipakai di halaman yang memuat sprite itu. */
const PAPAN = {darurat: "i-sirene", lapor: "i-kirim", status: "i-status", pasang: "i-unduh", peringatan: "i-sirene", hilang: "i-cari",
  info: "i-lokasi", edukasi: "i-daftar", penting: "i-telepon", bahasa: "i-bahasa", laporan: "i-pesan"};

/* lengan kanan per aksi (pemilik 25 Nov 2026: "jangan cuma menghadap ke depan, ngapain kek dia"): tiap aksi punya gestur dan benda sendiri.
   Bahu kanan di (162,178). k = isian kulit. */
const TANGAN = (x, y, k, r = 10) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .9}" fill="${k}" class="sg-o"/>`;
const DEPAN = (k, benda) => `<g class="mk-aksi">
      <path d="M162 178c12 8 10 24-8 28" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>${benda}${TANGAN(150, 206, k)}</g>`;
const LENGAN = {
  // mengetik laporan di HP, pesawat kertas terbang dari layar
  lapor: k => DEPAN(k, `<g class="mk-benda"><rect x="128" y="168" width="30" height="46" rx="6" class="sg-hp"/><rect x="132" y="174" width="22" height="32" rx="2" class="sg-hp-layar"/>
      <path d="M136 182h14M136 188h10M136 194h12" class="sg-hp-teks" stroke-width="2" stroke-linecap="round"/></g>
      <path d="M176 150l18-9-6 19-4-6Z" class="sg-pesawat mk-terbang"/>`),
  // memeriksa papan klip, centang tergambar
  status: k => DEPAN(k, `<g class="mk-benda"><rect x="122" y="166" width="40" height="50" rx="5" class="sg-klip"/><rect x="127" y="172" width="30" height="40" rx="2" class="sg-kertas"/>
      <rect x="134" y="162" width="16" height="8" rx="2" class="sg-klip-jepit"/><path d="M131 182h10M131 192h16M131 202h12" class="sg-hp-teks" stroke-width="2" stroke-linecap="round"/>
      <path d="M144 182l3 3 6-7" class="sg-centang mk-gores" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`),
  // membaca buku panduan, halaman bergerak
  edukasi: k => DEPAN(k, `<g class="mk-benda"><path d="M118 176q16-6 26 2v40q-10-8-26-2Z" class="sg-buku"/><path d="M170 176q-16-6-26 2v40q10-8 26-2Z" class="sg-buku"/>
      <path d="M144 178v40" class="sg-buku-tengah" stroke-width="2"/><path d="M123 186q9-3 16 1M123 194q9-3 16 1M149 187q8-4 16-1M149 195q8-4 16-1" class="sg-hp-teks" stroke-width="1.8" fill="none"/>
      <path d="M144 178q12-8 24-2v40q-12-6-24 2Z" class="sg-buku-halaman mk-balik"/></g>`),
  // memegang HP, panah unduh masuk ke layar
  pasang: k => DEPAN(k, `<g class="mk-benda"><rect x="128" y="168" width="30" height="46" rx="6" class="sg-hp"/><rect x="132" y="174" width="22" height="32" rx="2" class="sg-hp-layar"/>
      <path d="M143 178v14M137 186l6 6 6-6M137 198h12" class="sg-unduh mk-turun" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`),
  // menelepon: gagang di telinga, gelombang suara
  penting: k => `<g class="mk-aksi"><path d="M162 178c16-6 20-30 12-58" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <rect x="166" y="92" width="14" height="34" rx="6" class="sg-hp" transform="rotate(14 173 109)"/>${TANGAN(175, 118, k)}
      <path d="M190 96q6 6 0 14M198 90q10 12 0 26" class="sg-gelombang mk-denyar" stroke-width="3" stroke-linecap="round" fill="none"/></g>`,
  // mencari: kaca pembesar di depan mata, menyapu kiri kanan
  hilang: k => `<g class="mk-aksi mk-sapu"><path d="M162 178c18-4 26-24 26-46" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <path d="M186 128l-8-16" class="sg-gagang" stroke-width="7" stroke-linecap="round"/><circle cx="172" cy="100" r="17" class="sg-lensa"/><circle cx="172" cy="100" r="17" class="sg-lensa-tepi" stroke-width="5" fill="none"/>
      ${TANGAN(188, 132, k)}</g>`,
  // menunjuk ke atas: pin lokasi memantul
  info: k => `<g class="mk-aksi"><path d="M162 178c18-4 28-22 30-48" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>${TANGAN(192, 128, k)}
      <path d="M192 120v-18" class="sg-telunjuk" stroke="${k}" stroke-width="7" stroke-linecap="round"/>
      <g class="mk-pantul"><path d="M206 56c-9 0-15 7-15 15 0 10 15 23 15 23s15-13 15-23c0-8-6-15-15-15Z" class="sg-pin"/><circle cx="206" cy="71" r="5" class="sg-kertas"/></g></g>`,
  // membunyikan lonceng peringatan
  peringatan: k => `<g class="mk-aksi"><path d="M162 178c18-4 30-22 32-46" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <g class="mk-goyang"><path d="M194 92c-11 0-17 9-17 19v10l-5 7h44l-5-7v-10c0-10-6-19-17-19Z" class="sg-lonceng"/><circle cx="194" cy="132" r="4" class="sg-lonceng"/>
      <path d="M170 92q-6 8 0 16M218 92q6 8 0 16" class="sg-gelombang mk-denyar" stroke-width="3" stroke-linecap="round" fill="none"/></g>${TANGAN(194, 134, k)}</g>`,
  // darurat: HT diangkat, lampu sirene berkedip di tangan
  darurat: k => `<g class="mk-aksi"><path d="M162 178c18-4 30-22 32-46" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <path d="M180 120h28v10h-28Z" class="sg-sirene-alas"/><path d="M184 120c0-14 20-14 20 0Z" class="sg-sirene mk-kelip"/>
      <path d="M176 104l-6-6M194 96v-8M212 104l6-6" class="sg-sirene-sinar mk-kelip" stroke-width="3" stroke-linecap="round"/>${TANGAN(194, 134, k)}</g>`,
  // bahasa: gelembung bicara bergantian
  bahasa: k => `<g class="mk-aksi"><path d="M162 178c18-4 28-20 30-40" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>${TANGAN(192, 136, k)}
      <g class="mk-ucap1"><rect x="176" y="70" width="40" height="26" rx="10" class="sg-gelembung"/><path d="M184 80h24M184 87h14" class="sg-hp-teks" stroke-width="2.4" stroke-linecap="round"/></g>
      <g class="mk-ucap2"><rect x="186" y="96" width="34" height="22" rx="9" class="sg-gelembung dua"/><path d="M193 105h20" class="sg-hp-teks" stroke-width="2.4" stroke-linecap="round"/></g></g>`,
};
LENGAN.laporan = LENGAN.status;
export function maskotSvg(pose = "sapa", judul = "", aksi = "") {   // gambar vektor lama; cadangan dan uji rig
  const i = `sg${++n}`, u = x => `url(#${i}${x})`, ao = (x, y, rx, ry, o = .4) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${u("bayang")}" opacity="${o}"/>`;
  const rim = (d, o = .4, w = 2.5) => `<path d="${d}" style="stroke:var(--on-head)" opacity="${o}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
  const lengan = LENGAN[aksi]?.(u("kulit")) || "", ik = PAPAN[aksi];
  const st = (o, c) => `<stop offset="${o}" style="stop-color:${c}"/>`;
  const vol = (b, o = 1) => `${b} fill="${u("vol")}"${o < 1 ? ` opacity="${o}"` : ""} class="mk-vol"/>`;   // bayangan bola: terang kiri atas, gelap kanan bawah (pemilik 26 Nov 2026: "harusnya 3D")
  return `<svg class="mk sg" data-pose="${pose}" data-mimik="${DASAR[pose] || "sapa"}"${ik ? ` data-aksi="${aksi}"` : ""} viewBox="0 0 240 280" ${judul ? `role="img" aria-label="${judul}"` : 'aria-hidden="true"'}>
  <defs>
    <radialGradient id="${i}kulit" cx=".38" cy=".3" r=".8"><stop offset="0" class="sg-g-kulit-a" stop-color="#fde4cf"/><stop offset="1" class="sg-g-kulit-b" stop-color="#f6c79f"/></radialGradient>
    <linearGradient id="${i}helm" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" class="sg-g-helm-a" stop-color="#f39a4e"/><stop offset="1" class="sg-g-helm-b" stop-color="#e0662f"/></linearGradient>
    <linearGradient id="${i}baju" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" class="sg-g-baju-a" stop-color="#2c4a7a"/><stop offset="1" class="sg-g-baju-b" stop-color="#13254a"/></linearGradient>
    <radialGradient id="${i}bayang" cx=".5" cy=".5" r=".5"><stop offset="0" class="sg-g-bayang-a" stop-color="#13254a" stop-opacity=".35"/><stop offset="1" class="sg-g-bayang-b" stop-color="#13254a" stop-opacity="0"/></radialGradient>
    <linearGradient id="${i}iris" x1="0" y1="0" x2="0" y2="1">${st(0, "color-mix(in oklab,var(--brand2) 60%,var(--head-bg))")}${st(1, "color-mix(in oklab,var(--brand2) 45%,var(--on-head))")}</linearGradient>
    <linearGradient id="${i}kilap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--on-head);stop-opacity:.75"/><stop offset="1" style="stop-color:var(--on-head);stop-opacity:0"/></linearGradient>
    <radialGradient id="${i}vol" cx=".34" cy=".26" r=".9"><stop offset="0" style="stop-color:var(--on-head);stop-opacity:.32"/><stop offset=".5" style="stop-color:var(--on-head);stop-opacity:0"/><stop offset="1" style="stop-color:var(--head-bg);stop-opacity:.4"/></radialGradient>
    <clipPath id="${i}cl"><ellipse cx="98" cy="110" rx="10.5" ry="13"/><ellipse cx="142" cy="110" rx="10.5" ry="13"/></clipPath>
  </defs>
  <ellipse cx="120" cy="268" rx="66" ry="8" fill="${u("bayang")}" class="mk-bayang"/>
  <g class="mk-tubuh"><g class="mk-gb">
    <g class="mk-kaki">
      <rect x="96" y="226" width="20" height="30" rx="8" class="sg-celana"/><rect x="124" y="226" width="20" height="30" rx="8" class="sg-celana"/>
      <path d="M96 242h20M124 242h20" class="sg-celana-garis" stroke-width="2.5"/>${ao(120, 242, 6, 16, .55)}
      <path d="M86 264c0-11 8-16 18-16h13v18H89c-2 0-3-1-3-2Zm68 0c0-11-8-16-18-16h-13v18h28c2 0 3-1 3-2Z" class="sg-sepatu"/>
      <path d="M88 266h28M124 266h28" class="sg-sol" stroke-width="3" stroke-linecap="round"/>
      <path d="M94 254c4-3 10-3 14-1M146 254c-4-3-10-3-14-1" style="stroke:var(--on-head)" opacity=".3" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </g>
    <g class="mk-ba">
    <g class="mk-lk"><path d="M84 172c-10 10-12 26-8 40" class="sg-lengan" stroke-width="18" stroke-linecap="round" fill="none"/></g>
    <g class="mk-nf">
      <path d="M76 186c0-18 18-30 44-30s44 12 44 30v34c0 10-8 16-18 16H94c-10 0-18-6-18-16Z" fill="${u("baju")}"/>
      <path d="M86 168c8-6 20-10 34-10s26 4 34 10l-3 62H89Z" class="sg-rompi"/>${vol('<path d="M76 186c0-18 18-30 44-30s44 12 44 30v34c0 10-8 16-18 16H94c-10 0-18-6-18-16Z"')}
      ${ao(150, 200, 16, 34, .35)}${ao(90, 196, 8, 24, .45)}${ao(150, 196, 8, 24, .45)}
      <path d="M120 162v66" class="sg-ritsleting" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M89 196h62M88 216h64" class="sg-reflektor" stroke-width="5"/>
      <rect x="94" y="202" width="17" height="11" rx="3" class="sg-saku"/><rect x="129" y="202" width="17" height="11" rx="3" class="sg-saku"/>
      <rect x="87" y="226" width="66" height="7" rx="3" class="sg-sabuk"/><rect x="115" y="225" width="10" height="9" rx="2" class="sg-gesper"/>
      <circle cx="137" cy="181" r="9.5" class="sg-lencana"/><image href="/lapor/lambang-bnpb.png" x="129" y="173" width="16" height="16" class="sg-lambang-dada"/>
      <path d="M104 158l16 14 16-14" class="sg-kerah" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
      ${ao(120, 160, 36, 9, .55)}${rim("M164 190v28", .35)}${rim("M92 168c8-6 18-9 28-9", .25, 2)}
    </g>
    <g class="mk-lk">
      <g class="sg-ht" transform="rotate(-8 74 200)">
        <g class="mk-ant"><path d="M68 186V160" class="sg-ht-antena" stroke-width="4" stroke-linecap="round"/></g>
        <rect x="62" y="184" width="24" height="40" rx="7" class="sg-o sg-ht-badan"/>
        <rect x="66" y="190" width="16" height="10" rx="2" class="sg-ht-layar"/>
        <path d="M67 206h14M67 211h14M67 216h14" class="sg-ht-kisi" stroke-width="2" stroke-linecap="round"/>
        <circle cx="80" cy="183" r="3" class="sg-ht-tombol"/>${rim("M84 190v26", .35, 2)}
      </g>
      <rect x="61" y="206" width="24" height="19" rx="9" fill="${u("kulit")}" class="sg-o"/>
      <path d="M66 212h14M66 218h14" class="sg-ruas" stroke-width="1.8" stroke-linecap="round"/>
      <ellipse cx="82" cy="207" rx="4.5" ry="4" fill="${u("kulit")}" class="sg-o"/>
    </g>
    <g class="mk-rk">${lengan || `<g class="mk-lambai">
      <path d="M162 178c18-4 30-20 34-42" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <path d="M185 145l22 4" class="sg-manset" stroke-width="9" stroke-linecap="round"/>
      <g class="sg-tangan-tepi"><path d="M189.5 126Q187 119 185.5 112M194.5 123Q193.5 115 193 107M199.5 123Q200.5 115 201.5 108M204 126Q206 120 208 114M187.5 135Q183 131 180 127" stroke-width="9" stroke-linecap="round"/><ellipse cx="196.5" cy="133" rx="10.5" ry="11.5" stroke-width="3.5"/></g>
      <path d="M189.5 126Q187 119 185.5 112M194.5 123Q193.5 115 193 107M199.5 123Q200.5 115 201.5 108M204 126Q206 120 208 114M187.5 135Q183 131 180 127" stroke="${u("kulit")}" stroke-width="5.6" stroke-linecap="round" fill="none"/>
      <ellipse cx="196.5" cy="133" rx="10.5" ry="11.5" fill="${u("kulit")}"/>${ao(200, 139, 7, 6, .3)}
    </g>`}</g>
    <g class="mk-kt"><g class="mk-kp"><g class="mk-kb"><g class="mk-kepala">
      <circle cx="69" cy="106" r="10" fill="${u("kulit")}" class="sg-o"/><circle cx="171" cy="106" r="10" fill="${u("kulit")}" class="sg-o"/>
      <path d="M66 106h5M169 106h5" class="sg-ruas" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="120" cy="102" rx="54" ry="55" fill="${u("kulit")}"/>${vol('<ellipse cx="120" cy="102" rx="54" ry="55"', .55)}
      ${ao(158, 112, 15, 40, .3)}${rim("M171 94c2 10 1 22-4 32", .45)}
      <path d="M68 104c3-6 9-9 15-8 2 5 7 7 12 5 4-6 12-8 18-4 4 4 10 5 14 1 6-5 15-4 19 2 5 2 10 1 14-3 6 0 10 3 12 7l-2-14H70Z" class="sg-rambut"/>
      ${ao(120, 98, 48, 7, .5)}
      <g class="mk-fitur">
        <g class="mk-mata">
          <ellipse cx="98" cy="110" rx="10.5" ry="13" class="sg-mata"/><ellipse cx="142" cy="110" rx="10.5" ry="13" class="sg-mata"/>
          <g clip-path="${u("cl")}"><g class="mk-ir">
            <ellipse cx="98" cy="114" rx="7.5" ry="8.5" class="sg-iris" style="fill:${u("iris")}"/><ellipse cx="142" cy="114" rx="7.5" ry="8.5" class="sg-iris" style="fill:${u("iris")}"/>
            <circle cx="102" cy="104" r="4.2" class="sg-binar"/><circle cx="146" cy="104" r="4.2" class="sg-binar"/>
            <circle cx="94.5" cy="118" r="2" class="sg-binar"/><circle cx="138.5" cy="118" r="2" class="sg-binar"/>
          </g></g>
          <ellipse cx="98" cy="99" rx="9" ry="3.5" fill="${u("bayang")}" opacity=".6"/><ellipse cx="142" cy="99" rx="9" ry="3.5" fill="${u("bayang")}" opacity=".6"/>
          <ellipse cx="98" cy="110" rx="11.2" ry="13.7" fill="${u("kulit")}" class="mk-kl mk-l1"/><ellipse cx="142" cy="110" rx="11.2" ry="13.7" fill="${u("kulit")}" class="mk-kl mk-l2"/>
          <path d="${BUSUR[0]}" class="sg-alis mk-q mk-q1" ${G}/><path d="${BUSUR[1]}" class="sg-alis mk-q mk-q2" ${G}/>
        </g>
        <path d="${ALIS_K}" class="sg-alis mk-a1" ${G}/><path d="${ALIS_R}" class="sg-alis mk-a2" ${G}/>
        <path d="M117 121c2 2.5 4 2.5 6 0" class="sg-hidung" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <g class="mk-pp"><ellipse cx="80" cy="130" rx="9" ry="5.5" class="sg-pipi"/><ellipse cx="160" cy="130" rx="9" ry="5.5" class="sg-pipi"/></g>
        ${Object.entries(MULUT).map(([k, v]) => `<g class="mk-mu mk-mu-${k}">${v}</g>`).join("")}
      </g>
      <g class="mk-hm">
        <path d="M63 86c0-37 25-63 57-63s57 26 57 63Z" fill="${u("helm")}"/>${vol('<path d="M63 86c0-37 25-63 57-63s57 26 57 63Z"')}
        ${ao(150, 62, 26, 28, .35)}
        <path d="M111 25c4-2 14-2 18 0l2 60h-22Z" class="sg-helm-gigir"/>
        <circle cx="120" cy="58" r="17" class="sg-lencana"/><image href="/lapor/lambang-bnpb.png" x="105" y="43" width="30" height="30" class="sg-lambang"/>
        <path d="M53 86c0-5 4-8 9-8h116c5 0 9 3 9 8s-4 8-9 8H62c-5 0-9-3-9-8Z" class="sg-helm-tepi"/>
        <path d="M70 70c4-22 20-38 42-42" stroke="${u("kilap")}" stroke-width="9" stroke-linecap="round" fill="none"/>
        <path d="M78 50c6-11 15-18 26-21" class="sg-helm-kilau" stroke-width="4" stroke-linecap="round" fill="none"/>
        <circle cx="84" cy="46" r="3.5" style="fill:var(--on-head)" opacity=".85"/>${rim("M166 54c6 8 10 18 11 32", .4)}
      </g>
    </g></g></g></g>
    </g>
  </g></g>
</svg>`;
}

/* ===== Sigap render 3D (pemilik 26 Nov 2026: "harusnya 3D", enam render dari pemilik, lambang BNPB ditempel di helm).
   Gambar satu foto utuh per pose, jadi geraknya dari luar badan: napas, melayang (mk-tubuh di lapor.css), miring, lompat saat diketuk,
   dan ganti pose bergilir dengan pudar halus bila tidak sedang menjelaskan aksi tertentu. Bingkai tetap svg.mk.sg 240x280 supaya ukuran di semua layar sama. */
const FOTO = "/lapor/sigap/";
export const POSE_FOTO = {sapa: "lambai", semangat: "lambai", senang: "lambai", sedih: "pikir", berpikir: "pikir"};
export const AKSI_FOTO = {lapor: "hp", pasang: "hp", status: "hp", laporan: "hp", edukasi: "baca", penting: "ht", darurat: "ht", peringatan: "ht", hilang: "pikir", info: "tunjuk", bahasa: "tunjuk"};
export const GILIR = ["lambai", "tunjuk", "hp", "baca", "pikir"];   // tanpa "ht": wajah tegang hanya untuk darurat
export function fotoUntuk(pose = "sapa", aksi = "") { return AKSI_FOTO[aksi] || POSE_FOTO[pose] || "lambai"; }
export function maskot(pose = "sapa", judul = "", aksi = "") {
  const f = fotoUntuk(pose, aksi), gilir = !AKSI_FOTO[aksi] && pose !== "sedih" && pose !== "berpikir";
  const img = (k, o) => `<image href="${FOTO}${k}.webp" x="-22" y="-6" width="284" height="284" class="mk-ft"${o ? "" : ' opacity="0"'} preserveAspectRatio="xMidYMax meet"/>`;
  return `<svg class="mk sg mk-foto" data-pose="${pose}" data-foto="${f}"${gilir ? ' data-gilir="1"' : ""} viewBox="0 0 240 280" ${judul ? `role="img" aria-label="${judul}"` : 'aria-hidden="true"'}>
  <ellipse cx="120" cy="272" rx="62" ry="7" class="mk-bayang mk-ft-bayang"/>
  <g class="mk-tubuh"><g class="mk-gb"><g class="mk-ftn">${img(f, true)}${gilir ? img(f, false) : ""}</g></g></g></svg>`;
}
export function gayaFoto() {
  return `.mk-foto .mk-ft-bayang{fill:var(--head-bg);opacity:.28}
.mk-foto .mk-ft{transition:opacity .45s ease}
.mk-foto .mk-ftn{transform-box:view-box;transform-origin:120px 272px}
@media (prefers-reduced-motion:no-preference){
.mk-foto .mk-ftn{animation:mk-ft-napas 3.2s ease-in-out infinite}
.mk-foto.mk-a-miring .mk-gb{transform:rotate(4deg);transition:transform .5s cubic-bezier(.3,1.4,.5,1)}
.mk-foto.mk-a-angguk .mk-gb{animation:mk-ft-angguk .7s ease-in-out}}
@keyframes mk-ft-napas{50%{transform:scale(1.012,.988)}}
@keyframes mk-ft-angguk{30%{transform:translateY(4px) scale(1.03,.97)}60%{transform:translateY(-3px)}}`;
}
/* ganti pose bergilir: dua <image> bertumpuk, yang baru dipudarkan masuk */
function gantiFoto(svg, k) {
  const [a, b] = svg.querySelectorAll(".mk-ft"); if (!b || svg.dataset.foto === k) return;
  const kini = a.getAttribute("opacity") === "0" ? b : a, baru = kini === a ? b : a;
  baru.setAttribute("href", FOTO + k + ".webp"); baru.setAttribute("opacity", "1"); kini.setAttribute("opacity", "0"); svg.dataset.foto = k;
}
if (D) {
  if (!D.getElementById("mk-gaya-foto")) { const s = D.createElement("style"); s.id = "mk-gaya-foto"; s.textContent = gayaFoto(); D.head.appendChild(s); }
  for (const k of GILIR) { const l = D.createElement("link"); l.rel = "prefetch"; l.as = "image"; l.href = FOTO + k + ".webp"; D.head.appendChild(l); }
  setInterval(() => {   // satu pewaktu untuk semua maskot foto; berhenti saat tab tersembunyi atau gerak dikurangi
    if (D.hidden || kurang()) return;
    for (const svg of D.querySelectorAll("svg.mk-foto")) {
      const r = svg.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight || Math.random() < .45) continue;
      const x = Math.random();
      if (svg.dataset.gilir && x < .5) { const p = GILIR.filter(k => k !== svg.dataset.foto); gantiFoto(svg, p[Math.floor(Math.random() * p.length)]); }
      else { const c = x < .75 ? "mk-a-miring" : "mk-a-angguk"; svg.classList.add(c); setTimeout(() => svg.classList.remove(c), 1400); }
    }
  }, 2600);
}
