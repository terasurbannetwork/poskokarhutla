/* angin_partikel.js: partikel angin kanvas 2D untuk lapisan Angin di peta utama. Mengganti Angin.mulai/henti milik
   index.html; medan angin tetap Angin.bangun/Angin.di (data FWI harian, tidak dihitung ulang di sini).
   1800 partikel (900 di ponsel), jejak pendek, istirahat selama peta digeser atau tab tersembunyi, memudar di zoom
   tinggi karena kisi angin hanya 0,5 derajat, piksel kanvas maksimal 2.

   Port dari windParticles.ts (Pantau Karhutla), lisensi MIT:
   Copyright (c) 2026 Pantau Karhutla
   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
   documentation files (the "Software"), to deal in the Software without restriction, including without limitation
   the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
   to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above
   copyright notice and this permission notice shall be included in all copies or substantial portions of the
   Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
   LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
   SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
   OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
   DEALINGS IN THE SOFTWARE.

   Perubahan dari aslinya: medan angin dari Angin.di (kisi FWI), satu jalur goresan per bingkai, warna goresan
   mengikuti dasar peta gelap atau citra satelit, berhenti saat tab tersembunyi. */
(() => {
  "use strict";
  const UMUR = 90;          /* bingkai */
  const LAJU = 0.1;         /* piksel layar per bingkai per m/s (visual, bukan fisik) */
  const MUDAR_DARI = 8, MUDAR_KE = 10;   /* kisi 0,5 derajat: di zoom ini seluruh layar ada di satu-dua sel */

  const A = {
    cv: null, ctx: null, p: [], raf: 0, nyala: false, gerak: false, alfa: 1,
    jumlah: () => innerWidth > 900 ? 1800 : 900,
    baru(b = peta.getBounds()) {
      return {lon: b.getWest() + Math.random() * (b.getEast() - b.getWest()), lat: b.getSouth() + Math.random() * (b.getNorth() - b.getSouth()), umur: Math.random() * UMUR | 0};
    },
    isi() { if (this.alfa === 0) { this.p = []; return; } const b = peta.getBounds(); this.p = Array.from({length: this.jumlah()}, () => this.baru(b)); },
    pudar() {
      this.alfa = Math.min(1, Math.max(0, (MUDAR_KE - peta.getZoom()) / (MUDAR_KE - MUDAR_DARI)));
      this.cv.style.opacity = String(this.alfa);
      if (this.alfa > 0) this.jalan();
    },
    ukur() {
      const r = Math.min(devicePixelRatio || 1, 2), c = peta.getCanvas();
      this.cv.width = c.clientWidth * r; this.cv.height = c.clientHeight * r;
      this.cv.style.width = c.clientWidth + "px"; this.cv.style.height = c.clientHeight + "px";
      this.ctx.setTransform(r, 0, 0, r, 0, 0);
    },
    pasangKait() {
      this.cv = document.createElement("canvas"); this.cv.className = "angin";
      document.getElementById("peta").appendChild(this.cv); this.ctx = this.cv.getContext("2d");
      peta.on("movestart", () => { this.gerak = true; this.ctx.clearRect(0, 0, this.cv.width, this.cv.height); });
      peta.on("moveend", () => { this.gerak = false; this.pudar(); if (this.nyala) this.isi(); });
      peta.on("zoomend", () => this.pudar());
      peta.on("resize", () => this.ukur());
      document.addEventListener("visibilitychange", () => { document.hidden ? this.berhenti() : this.nyala && this.jalan(); });
    },
    mulai() {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return Lapis.pasang("panah");   /* gerak dikurangi: panah diam */
      if (!this.cv) this.pasangKait();
      this.ukur(); Angin.bangun(); this.isi(); this.pudar();
      this.cv.style.display = "block"; this.nyala = true; this.jalan();
    },
    henti() {
      this.nyala = false; this.berhenti();
      if (this.cv) { this.cv.style.display = "none"; this.ctx.clearRect(0, 0, this.cv.width, this.cv.height); }
    },
    jalan() { if (!this.raf && this.nyala && !document.hidden) this.raf = requestAnimationFrame(this.bingkai); },
    berhenti() { cancelAnimationFrame(this.raf); this.raf = 0; },
    bingkai: () => {
      const s = A; s.raf = 0; if (!s.nyala || document.hidden) return;
      if (s.alfa === 0) return;   /* tanpa bingkai selama sepenuhnya pudar; pudar() menyalakan lagi */
      s.raf = requestAnimationFrame(s.bingkai);
      if (s.gerak || !Angin.medan) return;
      const c = s.ctx, W = s.cv.width, H = s.cv.height;
      /* bingkai lama dipudarkan: meninggalkan jejak pendek */
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "destination-in"; c.fillStyle = "rgba(0,0,0,0.9)"; c.fillRect(0, 0, W, H); c.restore();
      c.globalCompositeOperation = "source-over"; c.lineWidth = 1.1;
      c.strokeStyle = (gelap() || Peta.lihat("satelit")) ? "rgba(255,255,255,0.6)" : "rgba(11,37,69,0.55)";
      c.beginPath();
      const dpp = 360 / (512 * 2 ** peta.getZoom()), r = Math.min(devicePixelRatio || 1, 2), lw = W / r, lh = H / r;
      for (const q of s.p) {
        const w = Angin.di(q.lon, q.lat);
        if (!w || ++q.umur > UMUR) { Object.assign(q, s.baru(), {umur: 0, x: undefined, y: undefined}); continue; }
        q.lon += w[0] * LAJU * dpp / Math.cos(q.lat * Math.PI / 180); q.lat += w[1] * LAJU * dpp;
        const t = peta.project([q.lon, q.lat]);   /* peta utama datar tanpa medan: project murah */
        if (q.x !== undefined) { c.moveTo(q.x, q.y); c.lineTo(t.x, t.y); }
        q.x = t.x; q.y = t.y;
        if (t.x < -50 || t.y < -50 || t.x > lw + 50 || t.y > lh + 50) Object.assign(q, s.baru(), {umur: 0, x: undefined, y: undefined});
      }
      c.stroke();
    },
  };
  window.AnginPartikel = A;
  /* Angin dibuat index.html; ambil alih mulai/henti (bangun tetap milik index.html) */
  const ambil = () => {
    if (typeof Angin === "undefined") return false;
    Angin.mulai = () => A.mulai(); Angin.henti = () => A.henti();
    if (Angin.jalan) { Angin.jalan = false; if (Angin.cv) Angin.cv.style.display = "none"; A.mulai(); }   /* sudah sempat menyala dengan versi lama */
    return true;
  };
  if (!ambil()) { const t = setInterval(() => ambil() && clearInterval(t), 100); }
})();
