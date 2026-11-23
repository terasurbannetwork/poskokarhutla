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
      const v = j.terpapar[i];
      if (typeof v !== "number" || !Number.isFinite(v)) return {nama: b.nama, terpapar: null, persen: null, sisa: null};   // kosong bukan nol
      const t = Math.min(pend, Math.max(0, v)), persen = (t / pend) * 100;
      return {nama: b.nama, terpapar: t, persen, sisa: 100 - persen};
    });
  }

  function tingkatIkd(v, ambang = {rendah: 0.4, tinggi: 0.8}) {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    return v < ambang.rendah ? "Rendah" : v <= ambang.tinggi ? "Sedang" : "Tinggi";
  }

  /* ===== simulasi kapasitas (ALGORITMA §10, KEPUTUSAN D11-D12) ===== */
  // bobot P1..P7 terukur dari 532 analisa IKD InaRISK (galat terbesar 0,0003); bukan angka resmi, diuji ulang di --cek
  const BOBOT_IKD = [0.06, 0.06, 0.075, 0.105, 0.21, 0.35, 0.14];
  const ikdDariP = P => P.reduce((s, v, i) => s + BOBOT_IKD[i] * (Number(v) || 0), 0);
  const kelasC = v => (typeof v !== "number" || !Number.isFinite(v)) ? null : v < 0.4 ? 1 : v <= 0.8 ? 2 : 3;
  /* rencana termurah: prioritas berbobot terbesar dulu, tiap P paling tinggi 1, sampai melewati ambang kelas berikut */
  function rencanaKapasitas(P, indeks = ikdDariP(P)) {
    const c = kelasC(indeks);
    if (c === null || c === 3 || !Array.isArray(P) || P.length !== 7 || P.some(v => typeof v !== "number")) return null;
    const ambang = c === 1 ? 0.4 : 0.8 + 1e-9;   // kelas 3 = di atas 0,80
    let sisa = ambang - indeks + 1e-6;
    const langkah = [];
    for (const i of [0, 1, 2, 3, 4, 5, 6].sort((a, b) => BOBOT_IKD[b] - BOBOT_IKD[a] || a - b)) {
      if (sisa <= 0) break;
      const ruang = 1 - P[i];
      if (ruang <= 0) continue;
      const naik = Math.min(ruang, sisa / BOBOT_IKD[i]);
      langkah.push({p: i + 1, dari: P[i], ke: P[i] + naik});
      sisa -= naik * BOBOT_IKD[i];
    }
    return {ambang: c === 1 ? 0.4 : 0.8, selisih: ambang - indeks, cLama: c, cBaru: sisa <= 1e-6 ? c + 1 : c, langkah};
  }

  /* ===== risiko besok (ALGORITMA §11, D13): waspada prakiraan tenggang 1 x kelas IRBI ===== */
  const PADANAN = {banjir: "banjir", longsor: "longsor", karhutla: "karlahut", asap: "karlahut", melaut: "abrasi", angin: "cuaca_ekstrem"};
  const URUT_KELAS = {Tinggi: 0, Sedang: 1, Rendah: 2};
  function risikoBesok(waspada, irbi, tahun = TAHUN_HV2021) {
    const per = new Map();
    for (const w of waspada || []) {
      if (w.tenggang !== 1 || !irbi.nilai[w.kab]) continue;
      const x = per.get(w.kab) || {pcode: w.kab, aturan: [], skorBahaya: null, jiwa: null};
      if (!x.aturan.some(a => a.aturan === w.aturan)) x.aturan.push({aturan: w.aturan, maka: w.maka, kolom: PADANAN[w.aturan] || null});
      const sb = PADANAN[w.aturan] ? skor(irbi, w.kab, tahun, PADANAN[w.aturan]) : null;
      if (sb !== null && (x.skorBahaya === null || sb > x.skorBahaya)) x.skorBahaya = sb;
      const j = w.dampak?.jiwa;
      if (typeof j === "number" && (x.jiwa === null || j > x.jiwa)) x.jiwa = j;
      per.set(w.kab, x);
    }
    return [...per.values()].map(x => { const s = skor(irbi, x.pcode, tahun); return {...x, skor: s, kelas: kelas(s, "total", tahun)}; })
      .sort((a, b) => (URUT_KELAS[a.kelas] ?? 3) - (URUT_KELAS[b.kelas] ?? 3) || (b.skorBahaya ?? -1) - (a.skorBahaya ?? -1) || (b.jiwa ?? -1) - (a.jiwa ?? -1) || (a.pcode < b.pcode ? -1 : 1));
  }

  const fmt2 = new Intl.NumberFormat("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const fmt0 = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0});
  const fmt1 = new Intl.NumberFormat("id-ID", {minimumFractionDigits: 0, maximumFractionDigits: 1});
  const angka2 = v => (typeof v === "number" && Number.isFinite(v) ? fmt2.format(v) : "–");
  const angka0 = v => (typeof v === "number" && Number.isFinite(v) ? fmt0.format(v) : "–");
  /* persen satu desimal; nilai kecil bukan nol tidak dibulatkan jadi 0% atau 100% */
  const persen1 = v => !(typeof v === "number" && Number.isFinite(v)) ? "–" : v > 0 && v < 0.05 ? "<0,1%" : v > 99.95 && v < 100 ? ">99,9%" : fmt1.format(v) + "%";

  const X = {TAHUN_HV2021, BOBOT_IKD, ikdDariP, kelasC, rencanaKapasitas, PADANAN, risikoBesok, kelas, skor, urut, peringkat, ringkas, sebelumnya, tren, jiwaPersen, tingkatIkd, angka2, angka0, persen1};
  if (typeof module !== "undefined" && module.exports) module.exports = X; else g.InariskHitung = X;
})(globalThis);
