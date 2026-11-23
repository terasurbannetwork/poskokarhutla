/* Fungsi murni cermin InaRISK (data/kajian-bnpb/inarisk/ALGORITMA.md). Tanpa DOM.
   Peramban: window.InariskHitung. Node: module.exports (tests/bnpb/inarisk_hitung.test.mjs). */
(function (g) {
  "use strict";
  const TAHUN_HV2021 = 2025;
  // ambang kelas per bahaya, salinan fungsi Ie di kode InaRISK v4 (IrbiPage)
  const RENDAH = {longsor: 6.67, gunungapi: 4};
  const TINGGI = {longsor: 15, gunungapi: 9};

  const bil = v => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

  function kelas(skor, kolom = "total", tahun = TAHUN_HV2021) {
    const r = bil(skor);
    if (r === null) return null;
    if (kolom === "total") {
      if (tahun >= TAHUN_HV2021) return r < 14.67 ? "Rendah" : r <= 176 ? "Sedang" : "Tinggi";
      return r < 13 ? "Rendah" : r > 144 ? "Tinggi" : "Sedang";
    }
    return r < (RENDAH[kolom] ?? 5.33) ? "Rendah" : r > (TINGGI[kolom] ?? 12) ? "Tinggi" : "Sedang";
  }

  function skor(data, pcode, tahun, kolom = "total") {
    const i = data.kolom.indexOf(kolom);
    const baris = data.nilai[pcode]?.[tahun];
    return i < 0 || !baris ? null : bil(baris[i]);
  }

  // kab ber-skor, menurun; seri dipecah kode naik. prov = 2 digit atau "" untuk nasional.
  function urut(data, tahun, kolom = "total", prov = "") {
    const out = [];
    for (const pcode of Object.keys(data.nilai)) {
      if (prov && !pcode.startsWith(prov)) continue;
      const s = skor(data, pcode, tahun, kolom);
      if (s !== null) out.push({pcode, skor: s});
    }
    return out.sort((a, b) => b.skor - a.skor || (a.pcode < b.pcode ? -1 : 1));
  }

  function peringkat(data, tahun, kolom = "total", prov = "") {
    const m = new Map();
    urut(data, tahun, kolom, prov).forEach((x, i) => m.set(x.pcode, i + 1));
    return m;
  }

  function ringkas(daftar, kolom = "total", tahun = TAHUN_HV2021) {
    if (!daftar.length) return {n: 0, rerata: null, tertinggi: null, terendah: null, nTinggi: 0};
    let jumlah = 0, nTinggi = 0;
    for (const x of daftar) { jumlah += x.skor; if (kelas(x.skor, kolom, tahun) === "Tinggi") nTinggi++; }
    return {n: daftar.length, rerata: jumlah / daftar.length, tertinggi: daftar[0], terendah: daftar[daftar.length - 1], nTinggi};
  }

  // skor pembanding baris tabel: 2025 total = pembanding API (SEB_60), selain itu tahun sebelumnya
  function sebelumnya(data, pcode, tahun, kolom = "total") {
    if (kolom === "total" && tahun >= TAHUN_HV2021) return bil(data.pembanding?.[pcode]);
    return skor(data, pcode, tahun - 1, kolom);
  }

  // lima tahun terakhir s.d. tahun, dikelompokkan per dasar kajian
  function tren(data, pcode, tahun, kolom = "total", n = 5) {
    const th = data.tahun.filter(t => t <= tahun).slice(-n);
    const grup = [];
    for (const t of th) {
      const baru = t >= TAHUN_HV2021;
      const titik = {tahun: t, skor: skor(data, pcode, t, kolom)};
      const akhir = grup[grup.length - 1];
      if (akhir && akhir.baru === baru) akhir.titik.push(titik); else grup.push({baru, titik: [titik]});
    }
    return grup;
  }

  function jiwaPersen(j, bencana) {
    const pend = bil(j?.penduduk);
    if (pend === null || !Array.isArray(j.terpapar)) return [];
    return bencana.map((b, i) => {
      const t = Math.min(pend, Math.max(0, Number(j.terpapar[i]) || 0));
      const persen = (t / pend) * 100;
      return {nama: b.nama, terpapar: t, persen, sisa: 100 - persen};
    });
  }

  function tingkatIkd(v, ambang = {rendah: 0.4, tinggi: 0.8}) {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    return v < ambang.rendah ? "Rendah" : v <= ambang.tinggi ? "Sedang" : "Tinggi";
  }

  const fmt2 = new Intl.NumberFormat("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const fmt0 = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0});
  const fmt1 = new Intl.NumberFormat("id-ID", {minimumFractionDigits: 0, maximumFractionDigits: 1});
  const angka2 = v => (typeof v === "number" && Number.isFinite(v) ? fmt2.format(v) : "–");
  const angka0 = v => (typeof v === "number" && Number.isFinite(v) ? fmt0.format(v) : "–");
  const persen1 = v => (typeof v === "number" && Number.isFinite(v) ? fmt1.format(v) + "%" : "–");

  const X = {TAHUN_HV2021, kelas, skor, urut, peringkat, ringkas, sebelumnya, tren, jiwaPersen, tingkatIkd, angka2, angka0, persen1};
  if (typeof module !== "undefined" && module.exports) module.exports = X; else g.InariskHitung = X;
})(globalThis);
