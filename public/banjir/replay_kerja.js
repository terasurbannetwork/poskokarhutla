"use strict";
/* replay_kerja.js: Web Worker. (1) 'muat': unduh maret2025.bin.gz, buka gzip, bongkar bagian bertipe, dekode delta sel-major
   (sama dengan dekodeDelta di scripts/banjir/replay.mjs) menjadi jam-major Uint16 jam[(s-1)*M + m] = cm sel indeks[m] pada jam s.
   Worker menyimpan salinannya; utas utama dapat salinan sendiri. (2) 'gambar': isi RGBA SC kali lebih halus dari kisi:
   kedalaman diinterpolasi bilinear antar pusat sel, ambang 2 cm membentuk tepi halus, cincin tepi 1-2 px mengikuti landai
   kedalaman. Buffer RGBA ditransfer bolak-balik (tanpa alokasi per bingkai). */
const TIPE = {Int16: Int16Array, Uint8: Uint8Array, Uint16: Uint16Array, Uint32: Uint32Array};
const N = 400, SC = 4, W = N * SC, AMBANG = 2;
let IX = null, JAM = null, M = 0, J = 0;
const D = new Float32Array((N + 2) * (N + 2)); /* berbingkai nol: indeks (j+1)*(N+2)+(i+1) */
async function baca(url, ukuran) {
  const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status} untuk ${url}`);
  const rd = r.body.pipeThrough(new DecompressionStream("gzip")).getReader();
  let buf = new Uint8Array(ukuran || 1 << 24), n = 0;
  for (;;) { const {done, value} = await rd.read(); if (done) break;
    if (n + value.length > buf.length) { const b2 = new Uint8Array(Math.max(buf.length * 2, n + value.length)); b2.set(buf.subarray(0, n)); buf = b2; }
    buf.set(value, n); n += value.length; if (ukuran) self.postMessage({p: Math.min(.95, n / ukuran)}); }
  return buf.subarray(0, n);
}
/* warna isian: #3b8fe0 makin pekat dan gelap makin dalam (alfa 95 di 2 cm, 235 di 200 cm ke atas) */
const WR = new Uint32Array(1024);
for (let d = 0; d < 1024; d++) { const f = Math.min(1, Math.max(0, (d - 2) / 198)), g = Math.min(1, Math.max(0, (d - 200) / 400)),
  r = 59 * (1 - g) + 14 * g, gr = 143 * (1 - g) + 60 * g, b = 224 * (1 - g) + 140 * g, a = 95 + 140 * f; WR[d] = ((Math.round(a) << 24) | (Math.round(b) << 16) | (Math.round(gr) << 8) | Math.round(r)) >>> 0; }
const RING = ((235 << 24) | (255 << 16) | (240 << 8) | 222) >>> 0;
function gambar(s, buf) {
  const t0 = performance.now(), px = new Uint32Array(buf); px.fill(0); D.fill(0);
  if (s >= 1) { const b = (s - 1) * M, W2 = N + 2; for (let m = 0; m < M; m++) { const c = IX[m]; D[(((c / N) | 0) + 1) * W2 + (c % N) + 1] = JAM[b + m]; }
    for (let cy = -1; cy < N; cy++) for (let cx = -1; cx < N; cx++) {
      const k = (cy + 1) * W2 + cx + 1, a = D[k], bb = D[k + 1], c = D[k + W2], d = D[k + W2 + 1];
      if (a < AMBANG && bb < AMBANG && c < AMBANG && d < AMBANG) continue;
      const gx = Math.max(Math.abs(bb - a), Math.abs(d - c)) / SC, gy = Math.max(Math.abs(c - a), Math.abs(d - bb)) / SC, gr = Math.hypot(gx, gy) * 1.5 + .35;
      for (let py = 0; py < SC; py++) { const Y = cy * SC + 2 + py; if (Y < 0 || Y >= W) continue; const fy = (Y + .5) / SC - .5 - cy,
          v0 = a + (c - a) * fy, v1 = bb + (d - bb) * fy;
        for (let pxx = 0; pxx < SC; pxx++) { const X = cx * SC + 2 + pxx; if (X < 0 || X >= W) continue;
          const v = v0 + (v1 - v0) * ((X + .5) / SC - .5 - cx); if (v < AMBANG) continue;
          px[Y * W + X] = v - AMBANG < gr ? RING : WR[v > 1023 ? 1023 : v | 0]; } } } }
  return performance.now() - t0;
}
self.onmessage = async e => {
  const q = e.data;
  if (q.gambar) { if (!JAM) return self.postMessage({gambar: true, s: q.s, buf: q.buf, dt: 0}, [q.buf]); const dt = gambar(q.s, q.buf); self.postMessage({gambar: true, s: q.s, buf: q.buf, dt}, [q.buf]); return; }
  try {
    const {url, bagian, jam, ukuran} = q, mentah = await baca(url, ukuran), B = {};
    for (const t of bagian) { const T = TIPE[t.tipe], by = t.jumlah * T.BYTES_PER_ELEMENT;
      B[t.nama] = new T(mentah.buffer.slice(mentah.byteOffset + t.offset, mentah.byteOffset + t.offset + by)); }
    M = B.indeks.length; J = jam; const d = B.dalam_delta_cm, o = new Uint16Array(M * J);
    if (d.length !== M * J) throw new Error(`delta ${d.length} != ${M} x ${J}`);
    for (let m = 0; m < M; m++) { let p = 0, k = m * J; for (let s = 0; s < J; s++) { p += d[k + s]; o[s * M + m] = p; } }
    IX = B.indeks.slice(); JAM = o.slice();
    self.postMessage({selesai: {indeks: B.indeks, jam: o, hmaks: B.hmaks_cm, jamHmaks: B.jam_hmaks, dem: B.dem_dm, gedung: B.gedung}, M, J, W},
      [B.indeks.buffer, o.buffer, B.hmaks_cm.buffer, B.jam_hmaks.buffer, B.dem_dm.buffer, B.gedung.buffer]);
  } catch (err) { self.postMessage({galat: String(err && err.message || err)}); }
};
