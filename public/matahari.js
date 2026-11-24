/* matahari.js: cahaya matahari di peta utama (ilustrasi). Posisi matahari dari jam sekarang di pusat peta menentukan
   siang, senja, atau malam: kecerahan citra satelit dan warna cahaya api dan asap 3D (Api3D), diredam kabut PM2,5
   bila angkanya diberikan lewat Matahari.pm. Peta utama datar tanpa medan dan tanpa kemiringan, jadi langit dan
   hillshade tidak dipasang di sini.

   Port dari sun.ts dan map/lighting.ts (Pantau Karhutla), lisensi MIT:
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

   Perubahan dari aslinya: JS biasa; hanya bagian yang dipakai peta datar (tanpa langit dan hillshade);
   pembulatan 1/50 dipertahankan supaya perubahan kecil tidak menyetel properti cat apa pun. */
(() => {
  "use strict";
  const KUNCI = "matahari";
  const rad = Math.PI / 180;
  const mulus = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* koordinat matahari USNO, galat sekitar 1 derajat */
  function posisi(tMs, lat, lon) {
    const d = tMs / 86400000 - 10957.5;
    const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
    const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
    const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24;
    const H = (gmst * 15 + lon) * rad - ra, phi = lat * rad;
    return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) / rad;   /* tinggi matahari, derajat */
  }

  /* keadaan cahaya: day 0 malam .. 1 siang; sun = warna sinar ke tanah lewat kabut; fireGain = api tampak lebih terang malam hari */
  function cahaya(tMs, lat, lon, pm25) {
    const altDeg = posisi(tMs, lat, lon);
    const day = mulus(-6, 8, altDeg), golden = (1 - mulus(3, 20, altDeg)) * mulus(-6, 0, altDeg);
    const tau = 4e-6 * Math.max(0, pm25) * 1500;
    const m = 1 / Math.max(Math.sin(Math.max(altDeg, 2) * rad), 0.05);
    const trans = [610, 550, 465].map(l => Math.exp(-tau * Math.pow(l / 550, -1.8) * m));
    const hangat = [1.0, 0.85 - 0.25 * golden, 0.7 - 0.45 * golden];
    return {day, golden, altDeg, sun: hangat.map((w, i) => w * trans[i] * day), fireGain: 0.75 + 0.75 * (1 - day), basemap: 0.35 + 0.65 * day};
  }

  const langkah = v => Math.round(v * 50) / 50;   /* kelipatan 1/50 */
  let terakhir = "", t = 0;

  const Matahari = {
    on: false,
    /* diganti pemanggil bila ada waktu lain (mis. penggeser jam) dan bila ada PM2,5 di pusat peta */
    waktu: () => Date.now(),
    pm: () => 0,
    cahaya,
    terap() {
      if (!this.on || typeof peta === "undefined" || !peta) return;
      const c = peta.getCenter(), r = cahaya(this.waktu(), c.lat, c.lng, this.pm(c.lng, c.lat));
      const day = langkah(r.day), basemap = langkah(r.basemap), sun = r.sun.map(langkah), gain = langkah(r.fireGain);
      const kunci = [day, basemap, sun.join(), gain].join("|");
      if (kunci === terakhir) return;   /* tidak ada yang berubah: tanpa setPaintProperty dan tanpa gambar ulang */
      terakhir = kunci;
      if (peta.getLayer("satelit")) peta.setPaintProperty("satelit", "raster-brightness-max", basemap);
      window.Api3D?.lap?.setLighting(sun, day, gain);
    },
    paksa() { terakhir = ""; this.terap(); },   /* dipanggil Api3D sesudah lapisannya dipasang */
    /* kembali ke tampilan semula */
    reset() {
      terakhir = "";
      if (typeof peta !== "undefined" && peta?.getLayer("satelit")) peta.setPaintProperty("satelit", "raster-brightness-max", 1);
      window.Api3D?.lap?.setLighting([0.9, 0.8, 0.7], 1, 1);
    },
    lapis(nyala) {
      localStorage.setItem(KUNCI, nyala ? "1" : "0"); this.on = nyala;
      /* kotak centang sudah berubah; kerja peta menyusul */
      const kerja = () => nyala ? this.terap() : this.reset();
      typeof nanti === "function" ? nanti(kerja) : setTimeout(kerja, 120);
    },
    mulai() {
      const kotak = document.querySelector('#lapis input[data-l="matahari"]');
      this.on = localStorage.getItem(KUNCI) === "1"; if (kotak) kotak.checked = this.on;
      const tunda = () => { clearTimeout(t); t = setTimeout(() => this.terap(), 300); };
      peta.on("moveend", tunda);
      peta.on("style.load", () => { terakhir = ""; tunda(); });
      setInterval(() => { if (!document.hidden) this.terap(); }, 5 * 6e4);
      this.terap();
    },
  };
  window.Matahari = Matahari;
  const tunggu = setInterval(() => { if (typeof peta !== "undefined" && peta && peta.getSource?.("titik")) { clearInterval(tunggu); Matahari.mulai(); } }, 500);
})();
