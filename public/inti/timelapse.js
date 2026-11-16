/* inti/timelapse.js (PB-81.1, F-41, D15, D16): SATU mesin timelapse untuk semua bencana selain karhutla (karhutla tetap memakai public/timelapse.js sampai PB-80).
   Merangkai N hari citra harian NASA GIBS jadi GIF animasi di peramban. gif.js 0.2.0 (MIT, /vendor/gif/) dimuat malas saat "Buat GIF" pertama;
   worker dilayani dari origin sendiri. Area = tampilan peta saat ini, atau TimelapseInti.buka({bbox: [barat, selatan, timur, utara], nama}).
   Digerbangi kemampuan.layar.citra di /bencana.json. Tiap frame memuat tanggal citra dan sumber (NASA GIBS) di kanvas; hari tanpa citra tampil kosong.

   Adaptor (sama dengan banding): {id, peta: () => peta MapLibre, host: () => elemen perkakas peta,
                                   lapisan: [{k, nama, pendek, lap, fmt, lv, mz, atr}]}   // lapisan pertama = warna asli */
(() => {
const MAXF = 30, BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const tgl = ms => new Date(ms).toISOString().slice(0, 10), pendek = t => `${+t.slice(8)} ${BLN[+t.slice(5, 7) - 1]} ${t.slice(0, 4)}`;

/* ---------- model murni (diuji di tests/layar/pb_citra.test.mjs) ---------- */
const izinReg = (daftar, id) => id !== "karhutla" && (daftar || []).find(b => b.id === id)?.kemampuan?.layar?.citra === true;
const mx = (lon, z) => (lon + 180) / 360 * 256 * 2 ** z;
const my = (lat, z) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 256 * 2 ** z;
const namaGibs = (L, t) => typeof L.lap === "function" ? L.lap(t) : L.lap;
const urlUbin = (L, t, z, y, x) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${namaGibs(L, t)}/default/${t}/GoogleMapsCompatible_Level${L.lv}/${z}/${y}/${x}.${L.fmt}`;
/* hari frame: N hari terakhir sampai kemarin, tertua dulu (tanggal citra, UTC) */
const hariFrame = (n, kini = Date.now()) => Array.from({length: Math.min(n, MAXF)}, (_, k) => tgl(kini - (Math.min(n, MAXF) - k) * 864e5));
/* zoom: cukup tajam untuk LEBAR piksel, maksimum level lapisan, dan tidak lebih dari 16 ubin per frame */
function rencana(b, LEBAR, mz = 9) {
  let z = Math.min(mz, Math.max(1, Math.ceil(Math.log2(LEBAR / (Math.max(.01, b[2] - b[0]) / 360 * 256)))));
  const ubin = z => (Math.floor(mx(b[2], z) / 256) - Math.floor(mx(b[0], z) / 256) + 1) * (Math.floor(my(b[1], z) / 256) - Math.floor(my(b[3], z) / 256) + 1);
  while (z > 1 && ubin(z) > 16) z--;
  const x0 = mx(b[0], z), x1 = mx(b[2], z), y0 = my(b[3], z), y1 = my(b[1], z), w = x1 - x0, h = y1 - y0, k = Math.min(LEBAR / w, LEBAR / h, 4);
  return {z, x0, y0, w, h, W: Math.max(64, Math.round(w * k)), H: Math.max(64, Math.round(h * k))};
}

/* ---------- tampilan ---------- */
let REG = null;
const registri = () => REG ||= typeof fetch === "function" ? fetch("/bencana.json").then(r => r.ok ? r.json() : Promise.reject(new Error("registri " + r.status))).then(j => j.bencana || [], () => []) : Promise.resolve([]);
let A = null, IZIN = false, BYK = {}, el = null, area = null, mode = null, n = 14, gen = 0, url = null, aktif = null, pustaka = null, tombol = null;
const muatGambar = u => new Promise(r => { const g = new Image(); g.crossOrigin = "anonymous"; g.onload = () => r(g); g.onerror = () => r(null); g.src = u; });

async function frame(L, t, P, lbl) {
  const c = document.createElement("canvas"); c.width = P.W; c.height = P.H; const g = c.getContext("2d");
  g.fillStyle = "#1b2430"; g.fillRect(0, 0, P.W, P.H); const k = P.W / P.w, N = 2 ** P.z, jobs = [];
  for (let ty = Math.floor(P.y0 / 256); ty <= Math.floor((P.y0 + P.h) / 256); ty++) for (let tx = Math.floor(P.x0 / 256); tx <= Math.floor((P.x0 + P.w) / 256); tx++) {
    if (ty < 0 || ty >= N) continue;
    jobs.push(muatGambar(urlUbin(L, t, P.z, ty, ((tx % N) + N) % N)).then(im => im && g.drawImage(im, (tx * 256 - P.x0) * k, (ty * 256 - P.y0) * k, 256 * k + .5, 256 * k + .5))); }
  await Promise.all(jobs);
  g.font = "700 " + Math.round(P.W / 22) + "px system-ui,sans-serif"; const s = pendek(t), m = g.measureText(s).width, p = P.W / 60, fh = P.W / 22;
  g.fillStyle = "rgba(19,50,77,.82)"; g.fillRect(p, p, m + p * 2, fh + p * 1.4); g.fillStyle = "#fff"; g.textBaseline = "top"; g.fillText(s, p * 2, p * 1.7);
  g.font = "600 " + Math.round(P.W / 52) + "px system-ui,sans-serif"; const am = g.measureText(lbl).width;
  g.fillStyle = "rgba(19,50,77,.7)"; g.fillRect(p, P.H - p * 3.2, am + p * 2, P.W / 52 + p * 1.6); g.fillStyle = "#fff"; g.fillText(lbl, p * 2, P.H - p * 2.6);
  return c;
}
async function siapkanGif() {
  pustaka ||= new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = "/vendor/gif/gif.js"; s.onload = ok; s.onerror = () => { pustaka = null; s.remove(); gagal(new Error("gif.js")); }; document.head.appendChild(s); });
  await pustaka;
}
const set = (p, teks) => { el.querySelector(".ctt-bar i").style.width = Math.round(p * 100) + "%"; if (teks != null) el.querySelector(".ctt-s").textContent = teks; };
const atribusi = () => "Citra: NASA GIBS, " + BYK[mode].atr + ", satu citra per hari (tanggal pengamatan, UTC)";
/* satu proses = satu id; tutup() menaikkan gen sehingga proses lama berhenti diam-diam dan tak menyentuh tampilan proses baru */
async function buat() {
  const id = ++gen, b = el.querySelector("[data-buat]"); b.disabled = true;
  const img = el.querySelector(".ctt-i"), un = el.querySelector("[data-unduh]"); img.hidden = un.hidden = true; if (url) { URL.revokeObjectURL(url); url = null; }
  try {
    set(0, "Menyiapkan..."); await siapkanGif(); if (id !== gen) return;
    const L = BYK[mode], hari = hariFrame(n), P = rencana(area.bbox, hari.length > 14 ? 480 : 640, L.mz);
    const gif = aktif = new GIF({workers: 2, quality: 10, width: P.W, height: P.H, workerScript: "/vendor/gif/gif.worker.js", repeat: 0});
    for (let i = 0; i < hari.length; i++) { if (id !== gen) return;
      set(i / hari.length * .5, `Mengunduh citra ${i + 1}/${hari.length}...`);
      const c = await frame(L, hari[i], P, "NASA GIBS, " + (L.pendek || L.nama)); if (id !== gen) return; gif.addFrame(c, {delay: 450, copy: true}); }
    if (hari.length) gif.frames[hari.length - 1].delay = 1400;   /* jeda di hari terakhir */
    const bl = await new Promise((ok, gagal) => { gif.on("progress", p => id === gen && set(.5 + p / 2, `Menyusun GIF ${Math.round(p * 100)}%`)); gif.on("finished", ok); gif.on("abort", () => gagal(new Error("batal"))); gif.render(); });
    if (id !== gen) return; url = URL.createObjectURL(bl);
    img.src = url; img.hidden = false; un.href = url; un.download = `timelapse-${A.id}-${mode}-${tgl(Date.now())}.gif`; un.hidden = false; set(1, `${hari.length} hari, ${P.W}x${P.H} px`);
  } catch (e) { if (id === gen) { console.warn("timelapse", e); set(0, "Gagal membuat GIF. Coba lagi."); } }
  finally { if (id === gen) b.disabled = false; }
}

const IKON = {x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  main: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/></svg>',
  unduh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>'};
function bangun() {
  el = document.createElement("div"); el.id = "ctTl"; el.hidden = true; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Timelapse citra harian");
  el.innerHTML = `<div class="ctt-k box"><div class="ctt-h"><b>Timelapse citra harian</b><button type="button" data-x aria-label="Tutup" title="Tutup">${IKON.x}</button></div>
    <div class="seg penuh" role="group" aria-label="Jenis citra" data-m>${A.lapisan.map((L, i) => `<button type="button" data-v="${esc(L.k)}" aria-pressed="${i === 0}">${esc(L.pendek || L.nama)}</button>`).join("")}</div>
    <div class="seg penuh" role="group" aria-label="Jumlah hari" data-n><button type="button" data-v="7" aria-pressed="false">7 hari</button><button type="button" data-v="14" aria-pressed="true">14 hari</button><button type="button" data-v="30" aria-pressed="false">30 hari</button></div>
    <div class="ctt-a"></div><div class="ctt-bar"><i></i></div><div class="ctt-s"></div><img class="ctt-i" alt="Pratinjau timelapse" hidden>
    <div class="ctt-b"><button type="button" class="btn pri" data-buat>${IKON.main}Buat GIF</button><a class="btn" data-unduh hidden>${IKON.unduh}Unduh GIF</a></div><div class="ctt-atr"></div></div>`;
  el.onclick = e => { const t = e.target; if (t === el || t.closest("[data-x]")) return tutup(); if (t.closest("[data-buat]")) return buat();
    const s = t.closest(".seg button"); if (!s) return; const g = s.parentNode; g.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === s));
    if (g.hasAttribute("data-m")) mode = s.dataset.v; else n = +s.dataset.v; el.querySelector(".ctt-atr").textContent = atribusi(); };
  document.addEventListener("keydown", e => { if (e.key === "Escape" && el && !el.hidden) tutup(); });
  document.body.appendChild(el);
}
function buka(o = {}) {
  if (!IZIN) return; if (!el) bangun();
  if (o.bbox) area = {bbox: o.bbox, nama: o.nama || "area terpilih"};
  else { const b = A.peta().getBounds(); area = {bbox: [b.getWest(), Math.max(-80, b.getSouth()), b.getEast(), Math.min(80, b.getNorth())], nama: "tampilan peta saat ini"}; }
  const f = x => x.toFixed(2).replace(".", ",");
  el.querySelector(".ctt-a").textContent = `Area: ${area.nama} (${f(area.bbox[1])} sampai ${f(area.bbox[3])} LS/LU, ${f(area.bbox[0])} sampai ${f(area.bbox[2])} BT)`;
  el.querySelector(".ctt-atr").textContent = atribusi();
  el.querySelector(".ctt-i").hidden = el.querySelector("[data-unduh]").hidden = true; el.querySelector("[data-buat]").disabled = false; set(0, ""); el.hidden = false; el.querySelector("[data-buat]").focus();
}
function tutup() { gen++; try { aktif?.abort(); } catch (e) {} if (el) el.hidden = true; if (url) { URL.revokeObjectURL(url); url = null; } }

function baris() { const h = A.host(); if (!h) return null; let b = h.querySelector(".ct-baris"); if (!b) { b = document.createElement("div"); b.className = "ct-baris"; h.appendChild(b); } return b; }
function pasangTombol() {
  const b = baris(); if (!b || document.getElementById("ctTlBuka")) return;
  b.insertAdjacentHTML("beforeend", `<button class="ct-tbl" id="ctTlBuka" type="button" aria-label="Timelapse citra harian area ini (GIF)" title="Timelapse citra"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/></svg></button>`);
  tombol = document.getElementById("ctTlBuka"); tombol.onclick = () => buka();
}
function pasang(a) {
  A = a; BYK = Object.fromEntries(a.lapisan.map(L => [L.k, L])); mode = a.lapisan[0].k;
  registri().then(d => { if (!izinReg(d, a.id)) return; IZIN = true; pasangTombol(); });
  return a;
}
window.TimelapseInti = {pasang, buka, tutup, diizinkan: () => IZIN, registri, model: {izinReg, urlUbin, hariFrame, rencana, MAXF}};
})();
