/* bagi.js — bagikan sekali ketuk, mandiri (tanpa S/peta), dipakai semua halaman.
   Ponsel (pointer kasar + Web Share): lembar bagikan bawaan perangkat. Desktop: lembar ringkas WhatsApp, Telegram, X,
   Facebook, LinkedIn, Threads, Email, Salin tautan, Kode QR, Unduh gambar. Tiap tautan diberi utm_source=<kanal>&utm_medium=share
   (&utm_campaign=<konteks>) agar jejak.js menghitung kunjungan dari bagikan.
   API: Bagi.buka({judul, teks, url, kampanye, gambar?: () => Promise<Blob>, lainnya?: () => void, lembar?: true})
   Tanpa JS halaman: <button data-bagikan="tentang" data-teks="…" data-teks-en="…" data-url="/tentang">Bagikan</button>.
   Hitungan: Jejak.catat("bagikan", "kanal <nama>"); dimensi "bagikan" sudah ada di daftar PERISTIWA server
   (dimensi baru "share" akan ditolak 400 seluruh kirimannya, jadi sengaja tidak dipakai). Hanya bila persetujuan analitik diberi. */
(() => {
"use strict";
if (window.Bagi) return;
const D = document, W = window, e = encodeURIComponent;
const en = () => /^en/i.test(String(W.BAHASA || D.documentElement.lang || ""));
const TX = {
  id: {judul: "Bagikan", tutup: "Tutup", salin: "Salin tautan", disalin: "Tautan disalin", qr: "Kode QR", unduhQr: "Unduh QR", gambar: "Gambar", gambarL: "Unduh gambar ringkasan", gambarBagi: "Bagikan gambar ringkasan", siapkan: "Menyiapkan gambar…", gagalGbr: "Gambar gagal dibuat", lainnya: "Lainnya", lainnyaL: "Templat gambar lain & ekspor data", aplikasi: "Bagikan lewat aplikasi…",
    pindai: "Pindai untuk membuka tautan ini", email: "Email"},
  en: {judul: "Share", tutup: "Close", salin: "Copy link", disalin: "Link copied", qr: "QR code", unduhQr: "Download QR", gambar: "Image", gambarL: "Download summary image", gambarBagi: "Share summary image", siapkan: "Preparing image…", gagalGbr: "Could not create image", lainnya: "More", lainnyaL: "More image templates & data exports", aplikasi: "Share via app…",
    pindai: "Scan to open this link", email: "Email"},
};
const t = k => (en() ? TX.en : TX.id)[k];
const ponsel = () => !!navigator.share && W.matchMedia?.("(pointer:coarse)").matches;
const catat = k => { try { if (!W.Persetujuan || W.Persetujuan.analitik()) W.Jejak?.catat?.("bagikan", "kanal " + k); } catch (_) {} };   // Jejak hanya ada setelah persetujuan analitik

/* tautan bersih + UTM; utm lama dibuang supaya tautan yang dibagikan ulang tidak menumpuk */
function utm(url, sumber, kampanye) {
  const u = new URL(url || location.href, location.href);
  [...u.searchParams.keys()].filter(k => /^utm_|^fbclid$|^gclid$/.test(k)).forEach(k => u.searchParams.delete(k));
  u.hash = ""; u.searchParams.set("utm_source", sumber); u.searchParams.set("utm_medium", "share");
  if (kampanye) u.searchParams.set("utm_campaign", kampanye);
  return u.toString();
}
/* potong di batas kata; X: teks <= 220 karakter (tautan dihitung terpisah oleh X sebagai 23) */
const potong = (s, n) => { s = String(s).replace(/\s+/g, " ").trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, Math.max(c.lastIndexOf(" "), n * .6 | 0)).replace(/[\s,.;:–-]+$/, "") + "…"; };

/* [kunci, nama, warna ikon, path ikon 24×24, (url, teks, judul) => href]; warna "" = mengikuti warna tinta (X, Threads) */
const KANAL = [
  ["whatsapp", "WhatsApp", "#25D366", "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z",
    (u, x) => `https://wa.me/?text=${e(x + " " + u)}`],
  ["telegram", "Telegram", "#229ED9", "M21.9 4.3 18.7 19c-.2 1-.9 1.3-1.8.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9-4.7-1.5c-1-.3-1-1 .2-1.5l18.5-7.1c.9-.3 1.6.2 1.5 1.7Z",
    (u, x) => `https://t.me/share/url?url=${e(u)}&text=${e(x)}`],
  ["x", "X", "", "M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.9L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z",
    (u, x) => `https://x.com/intent/tweet?text=${e(potong(x, 220))}&url=${e(u)}`],
  ["facebook", "Facebook", "#1877F2", "M14 22v-8h2.7l.4-3.2H14v-2c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.8V14h2.8v8H14Z",
    u => `https://www.facebook.com/sharer/sharer.php?u=${e(u)}`],
  ["linkedin", "LinkedIn", "#0A66C2", "M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2ZM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Zm1.8 13.1H3.5V9h3.6v11.5Z",
    u => `https://www.linkedin.com/sharing/share-offsite/?url=${e(u)}`],
  ["threads", "Threads", "", "M12.2 22h-.1c-3 0-5.3-1-6.8-2.9C3.9 17.4 3.2 15 3.2 12s.7-5.4 2.1-7.1C6.8 3 9.1 2 12.1 2h.1c2.3 0 4.2.6 5.6 1.8 1.3 1.1 2.3 2.7 2.8 4.6l-1.7.5c-.9-3.3-3.2-5-6.8-5-2.4 0-4.2.8-5.3 2.2-1.1 1.4-1.6 3.4-1.7 5.9 0 2.5.6 4.5 1.7 5.9 1.2 1.5 3 2.2 5.3 2.2 2.1 0 3.6-.5 4.8-1.7 1.4-1.4 1.4-3.1.9-4.1-.3-.6-.7-1.1-1.3-1.5-.1 1.1-.5 2-1.1 2.7-.8 1-2 1.6-3.5 1.7-1.1.1-2.2-.2-3-.7-1-.6-1.5-1.6-1.6-2.7-.1-2.1 1.6-3.7 4.3-3.8 1 0 1.9 0 2.7.1-.1-.6-.3-1.1-.6-1.5-.4-.5-1.1-.8-2-.8-.8 0-1.8.2-2.4 1.2L8.9 8c.8-1.3 2.2-2 3.9-2h.1c2.9 0 4.6 1.8 4.8 4.9l.3.1c1.3.6 2.3 1.6 2.8 2.7.8 1.6.8 4.3-1.3 6.4-1.6 1.6-3.6 2.3-6.3 2.4Zm.9-9.4h-.6c-1.6.1-2.6.8-2.5 1.9.1 1.2 1.3 1.7 2.4 1.6 1.1-.1 2.4-.5 2.6-3.3-.6-.1-1.2-.2-1.9-.2Z",
    (u, x) => `https://www.threads.net/intent/post?text=${e(x + " " + u)}`],
  ["email", "Email", "#5b6b82", "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm.8 2v.3l8.2 5.4 8.2-5.4V7H3.8Zm16.4 2.6-7.7 5.1a1 1 0 0 1-1 0L3.8 9.6V17h16.4V9.6Z",
    (u, x, j) => `mailto:?subject=${e(j)}&body=${e(x + "\n\n" + u)}`],
];
const IKON = {
  salin: "M9 4h9a2 2 0 0 1 2 2v11h-2V6H9V4Zm-3 4h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Zm0 2v10h9V10H6Z",
  qr: "M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm8-2h2v2h-2v-2Zm2 2h2v2h-2v-2Zm2-2h4v2h-4v-2Zm-4 4h2v4h-2v-4Zm4 0h2v2h-2v-2Zm2 2h2v2h-2v-2Zm-4 2h2v2h-2v-2Z",
  gambar: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v10.6l3.3-3.3a1 1 0 0 1 1.4 0l2.3 2.3 4.3-4.3a1 1 0 0 1 1.4 0l2.3 2.3V5H5Zm3.5 1.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z",
  lainnya: "M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z",
};
const svg = p => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="${p}"/></svg>`;

const CSS_URL = (D.currentScript?.src || location.origin + "/bagi.js").replace(/bagi\.js(\?.*)?$/, "bagi.css");   // berkas terpisah: aman untuk CSP tanpa unsafe-inline (/statistik)
if (!D.getElementById("bsCss")) { const l = D.createElement("link"); l.id = "bsCss"; l.rel = "stylesheet"; l.href = CSS_URL; D.head.appendChild(l); }   // sejak awal: tombol .bs-sel di halaman ikut bergaya

/* ---------------------------------------------------------------- QR (mode byte, koreksi M, versi 1–40), ringkasan dari
   algoritma Nayuki (MIT): Reed–Solomon GF(256), pola fungsi, zigzag, pilih masker penalti terkecil (aturan 1, 2, 4). */
const QR = {
  ECC: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  BLK: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  raw(v) { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = (v / 7 | 0) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; },
  mul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; },
  /* matriks boolean [y][x] */
  buat(teks) {
    const data = [...new TextEncoder().encode(teks)];
    let v = 1, cap;
    for (; v <= 40; v++) { cap = (this.raw(v) >>> 3) - this.ECC[v] * this.BLK[v]; if (4 + (v < 10 ? 8 : 16) + data.length * 8 <= cap * 8) break; }
    if (v > 40) throw new Error("teks terlalu panjang untuk QR");
    const bb = [], put = (x, n) => { for (let i = n - 1; i >= 0; i--) bb.push(x >>> i & 1); };
    put(4, 4); put(data.length, v < 10 ? 8 : 16); data.forEach(b => put(b, 8));
    put(0, Math.min(4, cap * 8 - bb.length)); put(0, (8 - bb.length % 8) % 8);
    for (let p = 0xEC; bb.length < cap * 8; p ^= 0xEC ^ 0x11) put(p, 8);
    const dc = []; for (let i = 0; i < bb.length; i += 8) dc.push(bb.slice(i, i + 8).reduce((a, b) => a << 1 | b, 0));
    /* ECC per blok lalu selang-seling */
    const nb = this.BLK[v], el = this.ECC[v], raw = this.raw(v) >>> 3, nPendek = nb - raw % nb, lp = raw / nb | 0;
    const dv = Array(el).fill(0); dv[el - 1] = 1; let akar = 1;
    for (let i = 0; i < el; i++) { for (let j = 0; j < el; j++) { dv[j] = this.mul(dv[j], akar); if (j + 1 < el) dv[j] ^= dv[j + 1]; } akar = this.mul(akar, 2); }
    const blok = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const d = dc.slice(k, k += lp - el + (i < nPendek ? 0 : 1)), r = Array(el).fill(0);
      for (const b of d) { const f = b ^ r.shift(); r.push(0); dv.forEach((c, j) => r[j] ^= this.mul(c, f)); }
      if (i < nPendek) d.push(0); blok.push(d.concat(r));
    }
    const kw = []; for (let i = 0; i < blok[0].length; i++) blok.forEach((b, j) => { if (i !== lp - el || j >= nPendek) kw.push(b[i]); });
    /* pola fungsi */
    const n = v * 4 + 17, M = [...Array(n)].map(() => Array(n).fill(false)), F = [...Array(n)].map(() => Array(n).fill(false));
    const set = (x, y, b) => { M[y][x] = !!b; F[y][x] = true; };
    for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, d !== 2 && d !== 4); }
    const al = []; if (v > 1) { const na = (v / 7 | 0) + 2, st = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2; al.push(6); for (let p = n - 7; al.length < na; p -= st) al.splice(1, 0, p); }
    al.forEach((a, i) => al.forEach((b, j) => { if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
    const format = m => { const d = m; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const bits = ((d << 10) | r) ^ 0x5412, bit = i => (bits >>> i) & 1; /* M = 00 */
      for (let i = 0; i <= 5; i++) set(8, i, bit(i)); set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(i)); for (let i = 8; i < 15; i++) set(8, n - 15 + i, bit(i)); set(8, n - 8, 1); };
    format(0);
    if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const bits = v << 12 | r;
      for (let i = 0; i < 18; i++) { const b = (bits >>> i) & 1, a = n - 11 + i % 3, c = i / 3 | 0; set(a, c, b); set(c, a, b); } }
    /* data zigzag */
    let i = 0;
    for (let ka = n - 1; ka >= 1; ka -= 2) { if (ka === 6) ka = 5;
      for (let vt = 0; vt < n; vt++) for (let j = 0; j < 2; j++) { const x = ka - j, y = ((ka + 1) & 2) === 0 ? n - 1 - vt : vt;
        if (!F[y][x] && i < kw.length * 8) { M[y][x] = ((kw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; } } }
    /* masker */
    const MS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => ((x / 3 | 0) + (y / 2 | 0)) % 2 === 0,
      (x, y) => x * y % 2 + x * y % 3 === 0, (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
    const terap = m => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!F[y][x] && MS[m](x, y)) M[y][x] = !M[y][x]; };
    const penalti = () => { let p = 0, gelap = 0;
      for (let a = 0; a < n; a++) { let rx = 1, ry = 1;
        for (let b = 1; b < n; b++) {
          if (M[a][b] === M[a][b - 1]) { rx++; if (rx === 5) p += 3; else if (rx > 5) p++; } else rx = 1;
          if (M[b][a] === M[b - 1][a]) { ry++; if (ry === 5) p += 3; else if (ry > 5) p++; } else ry = 1; } }
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { if (M[y][x]) gelap++; if (x && y && M[y][x] === M[y][x - 1] && M[y][x] === M[y - 1][x] && M[y][x] === M[y - 1][x - 1]) p += 3; }
      return p + 10 * Math.floor(Math.abs(gelap * 20 - n * n * 10) / (n * n)); };
    let best = 0, min = Infinity;
    for (let m = 0; m < 8; m++) { terap(m); format(m); const p = penalti(); if (p < min) { min = p; best = m; } terap(m); }
    terap(best); format(best);
    return M;
  },
  kanvas(teks, skala = 8) {
    const M = this.buat(teks), n = M.length, q = 4, c = D.createElement("canvas"); c.width = c.height = (n + q * 2) * skala;
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#0b2545";
    M.forEach((r, y) => r.forEach((b, i) => b && x.fillRect((i + q) * skala, (y + q) * skala, skala, skala)));
    return c;
  },
};

/* ---------------------------------------------------------------- lembar */
let dlg, ctx = null, gbr = null;
function lembar() {
  if (dlg) return dlg;
  dlg = D.createElement("dialog"); dlg.className = "bs"; dlg.id = "bsDlg"; dlg.setAttribute("aria-labelledby", "bsJudul"); dlg.setAttribute("aria-describedby", "bsTeks");
  D.body.appendChild(dlg);
  dlg.addEventListener("click", ev => {
    if (ev.target === dlg || ev.target.closest("[data-bs-tutup]")) return dlg.close();
    const a = ev.target.closest("[data-kanal]"); if (a) { catat(a.dataset.kanal); return; }
    const b = ev.target.closest("[data-bs]"); if (!b) return;
    ({salin, qr, gambar, lainnya, asli, unduhQr}[b.dataset.bs])?.(b);
  });
  return dlg;
}
const st = m => { const p = dlg?.querySelector(".bs-st"); if (p) p.textContent = m; if (typeof W.toast === "function") try { W.toast(m); } catch (_) {} };
function isi() {
  const j = ctx.judul || D.title, x = ctx.teks || "", u = s => utm(ctx.url, s, ctx.kampanye);
  dlg.innerHTML = `<div class="bs-hd"><div><h2 id="bsJudul">${t("judul")}</h2><p id="bsTeks"></p></div><button type="button" data-bs-tutup aria-label="${t("tutup")}">×</button></div>
    <div class="bs-bd">
      ${navigator.share ? `<button type="button" class="bs-asli" data-bs="asli">${t("aplikasi")}</button>` : ""}
      <div class="bs-grid" role="group" aria-label="${t("judul")}">
        ${KANAL.map(([k, n, w, p, f]) => `<a class="bs-k" data-kanal="${k}" href="${esc(f(u(k), x, j))}" ${k === "email" ? "" : 'target="_blank" rel="noopener noreferrer"'} style="${w ? "--w:" + w : ""}" aria-label="${k === "email" ? t("email") : n}"><i>${svg(p)}</i><span>${k === "email" ? t("email") : n}</span></a>`).join("")}
        <button type="button" class="bs-k" data-bs="salin" style="--w:#5b6b82"><i>${svg(IKON.salin)}</i><span>${t("salin")}</span></button>
        <button type="button" class="bs-k" data-bs="qr" aria-expanded="false" aria-controls="bsQr" style="--w:#5b6b82"><i>${svg(IKON.qr)}</i><span>${t("qr")}</span></button>
        ${ctx.gambar ? `<button type="button" class="bs-k" data-bs="gambar" style="--w:#b4693a" aria-label="${t(ponsel() ? "gambarBagi" : "gambarL")}" title="${t(ponsel() ? "gambarBagi" : "gambarL")}"><i>${svg(IKON.gambar)}</i><span>${t("gambar")}</span></button>` : ""}
        ${ctx.lainnya ? `<button type="button" class="bs-k" data-bs="lainnya" style="--w:#5b6b82" aria-label="${t("lainnyaL")}" title="${t("lainnyaL")}"><i>${svg(IKON.lainnya)}</i><span>${t("lainnya")}</span></button>` : ""}
      </div>
      <div class="bs-url"><input id="bsUrl" readonly aria-label="${t("salin")}"></div>
      <div class="bs-qr" id="bsQr" hidden><canvas width="1" height="1" role="img" aria-label="${t("qr")}"></canvas><p>${t("pindai")}</p><button type="button" data-bs="unduhQr">${t("unduhQr")}</button></div>
      <p class="bs-st" role="status" aria-live="polite"></p>
    </div>`;
  dlg.querySelector("#bsTeks").textContent = x;
  dlg.querySelector("#bsUrl").value = u("salin");
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));

async function salin() {
  const u = utm(ctx.url, "salin", ctx.kampanye);
  try { await navigator.clipboard.writeText(u); }
  catch (_) { const a = dlg.querySelector("#bsUrl"); a.value = u; a.select(); D.execCommand("copy"); }
  catat("salin"); st(t("disalin"));
}
function qr(b) {
  const p = dlg.querySelector("#bsQr"), buka = p.hidden; p.hidden = !buka; b.setAttribute("aria-expanded", buka);
  if (!buka) return;
  const c = QR.kanvas(utm(ctx.url, "qr", ctx.kampanye)); c.setAttribute("role", "img"); c.setAttribute("aria-label", t("qr"));
  p.querySelector("canvas").replaceWith(c); catat("qr");
}
function unduhQr() { const c = dlg.querySelector("#bsQr canvas"); c.toBlob(b => simpan(b, `qr-${ctx.kampanye || "centurisk97"}.png`)); }
function simpan(blob, nama) { const a = D.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nama; D.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
async function gambar(b) {
  b.setAttribute("aria-busy", "true"); st(t("siapkan"));
  try {
    const blob = await gbr; if (!blob) throw new Error("kosong");
    const nama = `centurisk97-${ctx.kampanye || "ringkasan"}-${new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10)}.png`, f = new File([blob], nama, {type: "image/png"});
    if (ponsel() && navigator.canShare?.({files: [f]})) {
      try { await navigator.share({files: [f], text: ctx.teks + " " + utm(ctx.url, "gambar", ctx.kampanye)}); catat("gambar-perangkat"); st(""); return; }
      catch (er) { if (er.name === "AbortError") { st(""); return; } }
    }
    simpan(blob, nama); catat("gambar"); st("");
  } catch (er) { console.warn("bagi gambar", er); st(t("gagalGbr")); }
  finally { b.removeAttribute("aria-busy"); }
}
function lainnya() { dlg.close(); ctx.lainnya(); }
async function asli() {
  try { await navigator.share({title: ctx.judul || D.title, text: ctx.teks, url: utm(ctx.url, "perangkat", ctx.kampanye)}); catat("perangkat"); dlg.close(); }
  catch (_) {}
}

function buka(c) {
  ctx = {...c, url: c.url || location.href}; gbr = null;
  if (!c.lembar && ponsel()) {
    navigator.share({title: ctx.judul || D.title, text: ctx.teks, url: utm(ctx.url, "perangkat", ctx.kampanye)}).then(() => catat("perangkat"))
      .catch(er => { if (er.name !== "AbortError") bukaLembar(); });
    return;
  }
  bukaLembar();
}
function bukaLembar() {
  lembar(); isi();
  if (ctx.gambar) { gbr = Promise.resolve().then(ctx.gambar).catch(er => { console.warn("bagi gambar", er); return null; }); }   // disiapkan saat lembar terbuka
  if (!dlg.open) dlg.showModal();
}

/* tombol tanpa JS halaman: [data-bagikan] */
D.addEventListener("click", ev => {
  const b = ev.target.closest?.("[data-bagikan]"); if (!b || b.closest("#bsDlg")) return;
  ev.preventDefault();
  const md = D.querySelector('meta[name="description"]')?.content || "";
  buka({judul: b.dataset.judul || D.title, teks: (en() && b.dataset.teksEn) || b.dataset.teks || md, url: b.dataset.url ? new URL(b.dataset.url, location.href).href : location.href, kampanye: b.dataset.bagikan || "halaman"});
});

W.Bagi = {buka, utm, potong, en, QR, ponsel, ikon: () => svg("M18 8a3 3 0 1 0-2.8-4L8.9 7.3a3 3 0 1 0 0 5.4l6.3 3.3a3 3 0 1 0 .9-1.8l-6.3-3.3a3 3 0 0 0 0-1.8l6.3-3.3A3 3 0 0 0 18 8Z")};
})();
