/* Fungsi MURNI layar /bnpb/operasi-lapangan (OP-3): pengelompokan temuan, warna status, ringkasan, garis rujukan. Tanpa DOM, tanpa fetch.
   Dimuat peramban (window.OperasiLapangan) dan node untuk uji (tests/bnpb/operasi_lapangan.test.mjs). Data dari GET /api/operasi/peta (src/operasi_udara.js). */
(g => {
  "use strict";
  const JAM = 36e5, WIB = 7 * JAM;
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const fmt = n => n == null || Number.isNaN(Number(n)) ? "–" : (Math.round(Number(n) * 10) / 10).toString().replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const tanggalIndo = t => { const [y, m, d] = String(t).split("-").map(Number); return `${d} ${BLN[m - 1]} ${y}`; };
  const hariIniWIB = (kini = Date.now()) => new Date(kini + WIB).toISOString().slice(0, 10);
  const jamWIB = ms => ms == null ? "–" : new Date(ms + WIB).toISOString().slice(11, 16) + " WIB";

  /* temuan: bentuk penanda + kelas warna (warna sebenarnya di CSS) */
  const STATUS_TEMUAN = {fs: {nama: "FS berasap", bentuk: "segitiga", kelas: "ol-t-api"}, berasap: {nama: "Berasap", bentuk: "segitiga", kelas: "ol-t-api"},
    berasap_tipis: {nama: "Berasap tipis", bentuk: "segitiga", kelas: "ol-t-tipis"}, clear: {nama: "Clear", bentuk: "lingkaran", kelas: "ol-t-clear"}};
  const URUT_TEMUAN = ["fs", "berasap", "berasap_tipis", "clear"];
  const STATUS_ARMADA = {siap: {nama: "Siap", kelas: "ol-s-siap", siap: true}, operasi: {nama: "Beroperasi", kelas: "ol-s-operasi", siap: true},
    siaga: {nama: "Siaga", kelas: "ol-s-siaga", siap: true}, tidak_siap: {nama: "Tidak siap", kelas: "ol-s-tidak", siap: false}};
  const kelasTemuan = s => (STATUS_TEMUAN[s] || {kelas: "ol-t-clear"}).kelas;
  const kelasArmada = s => (STATUS_ARMADA[s] || {kelas: "ol-s-belum"}).kelas;
  const namaArmada = s => (STATUS_ARMADA[s] || {nama: "Belum ada laporan"}).nama;

  const kelompokTemuan = temuan => { const k = {fs: [], berasap: [], berasap_tipis: [], clear: []}; for (const t of temuan || []) (k[t.status] || (k[t.status] = [])).push(t); return k; };

  /* segmen waktu: pagi = sebelum 12.00 WIB, siang = sesudahnya; tanpa jam tercatat masuk pagi (laporan pagi) agar tidak terhitung dua kali */
  const segmenJam = ms => ms == null ? "pagi" : ((ms + WIB) % (24 * JAM)) < 12 * JAM ? "pagi" : "siang";
  const saringSegmen = (data, segmen) => segmen === "pagi" || segmen === "siang"
    ? {...data, gerak: (data.gerak || []).filter(x => segmenJam(x.jam_utc) === segmen), temuan: (data.temuan || []).filter(x => segmenJam(x.jam_utc) === segmen)} : data;

  const ringkas = data => {
    const k = kelompokTemuan(data.temuan), ar = data.armada || [];
    const siap = ar.filter(a => STATUS_ARMADA[a.status]?.siap).length, tidak = ar.filter(a => a.status === "tidak_siap").length;
    return {temuan: Object.fromEntries(URUT_TEMUAN.map(s => [s, k[s].length])), temuanTotal: (data.temuan || []).length, armada: ar.length, siap, tidak, belum: ar.length - siap - tidak,
      sortie: (data.gerak || []).filter(x => x.jenis === "berangkat").length};
  };
  const sumberTeks = (data, apa) => apa === "armada" ? ((data.armada || []).some(a => a.sumber === "wa") ? "laporan WA satgas udara" : "data awal armada, belum ada laporan WA hari ini")
    : "laporan WA satgas udara";

  /* per base: armada, gerak, temuan oleh armada base itu */
  const dataBase = (data, baseId) => { const ar = (data.armada || []).filter(a => a.base_id === baseId), reg = new Set(ar.map(a => a.registrasi));
    return {armada: ar, gerak: (data.gerak || []).filter(x => reg.has(x.registrasi)), temuan: (data.temuan || []).filter(x => reg.has(x.registrasi))}; };
  const jarak2 = (a, b) => (a.lat - b.lat) ** 2 + (a.lon - b.lon) ** 2;
  /* garis rujukan: gerak WB berkoordinat yang `rujukan`-nya = registrasi patroli, ditarik ke temuan patroli itu yang terdekat (bukan clear diutamakan) */
  const garisRujukan = data => { const out = [];
    for (const x of data.gerak || []) { if (x.lat == null || x.lon == null || !x.rujukan) continue;
      const cocok = (data.temuan || []).filter(t => t.registrasi === x.rujukan); if (!cocok.length) continue;
      const api = cocok.filter(t => t.status !== "clear"), pool = api.length ? api : cocok, t = pool.reduce((a, b) => jarak2(a, x) <= jarak2(b, x) ? a : b);
      out.push({dari: [t.lon, t.lat], ke: [x.lon, x.lat], patroli: x.rujukan, wb: x.registrasi}); }
    return out; };
  /* cincin jelajah: poligon lingkaran bumi (jari-jari mil laut) */
  const cincin = (lat, lon, nm, n = 64) => { const r = nm * 1852, R = 6371008.8, d = r / R, la = lat * Math.PI / 180, lo = lon * Math.PI / 180, ring = [];
    for (let i = 0; i <= n; i++) { const b = 2 * Math.PI * i / n, la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b)),
      lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2)); ring.push([lo2 * 180 / Math.PI, la2 * 180 / Math.PI]); }
    return ring; };
  const klaimTeks = t => t.luas_klaim_ha != null ? `klaim pilot ±${fmt(t.luas_klaim_ha)} ha` : "";
  const SEGMEN = [["renlap", "Renlap malam", "malam"], ["pagi", "Pagi", "cuaca"], ["siang", "Siang", "kekeringan"], ["nilai", "Nilai", "ok"]];

  g.OperasiLapangan = {fmt, tanggalIndo, hariIniWIB, jamWIB, STATUS_TEMUAN, URUT_TEMUAN, STATUS_ARMADA, kelasTemuan, kelasArmada, namaArmada, kelompokTemuan,
    segmenJam, saringSegmen, ringkas, sumberTeks, dataBase, garisRujukan, cincin, klaimTeks, SEGMEN};
})(typeof window !== "undefined" ? window : globalThis);
