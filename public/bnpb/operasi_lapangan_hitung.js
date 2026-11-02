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

  /* ---------- segmen Nilai: penyajian GET /api/operasi/nilai (src/operasi_nilai.js); tidak menghitung ulang angka ---------- */
  const KODE_NILAI = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11"];
  /* baik: arah yang bagus untuk sorotan tabel; pembilang: kata benda "13 dari 22 ..."; pendek: judul kolom tabel */
  const METRIK = {M1: {nama: "Ketepatan target", pendek: "Tepat target", ikon: "pin", baik: "tinggi", pembilang: "temuan"},
    M2: {nama: "Kepatuhan renlap", pendek: "Patuh renlap", ikon: "malam", baik: "tinggi", pembilang: "target renlap"},
    M3: {nama: "Temuan di luar renlap", pendek: "Temuan baru", ikon: "peringatan", baik: "rendah", pembilang: "temuan"},
    M4: {nama: "Padam bertahan", pendek: "Padam bertahan", ikon: "ok", baik: "tinggi", pembilang: "temuan clear"},
    M5: {nama: "Efisiensi water bombing", pendek: "Efisiensi WB", ikon: "lanjut", baik: null, pembilang: "sortie"},
    M6: {nama: "Utilisasi armada", pendek: "Utilisasi", ikon: "personel", baik: "tinggi", pembilang: "pesawat-hari"},
    M7: {nama: "Waktu respons", pendek: "Respons", ikon: "lanjut", baik: "rendah", pembilang: "temuan berasap"},
    M8: {nama: "Mutu laporan", pendek: "Mutu laporan", ikon: "ok", baik: null, pembilang: "laporan"},
    M9: {nama: "Hambatan cuaca", pendek: "Hambatan cuaca", ikon: "cuaca", baik: null, pembilang: "sortie"},
    M10: {nama: "Jarak sumber air", pendek: "Jarak air", ikon: "pin", baik: null, pembilang: "sortie"},
    M11: {nama: "Heli siaga tanpa tugas", pendek: "Heli menganggur", ikon: "senyap", baik: "rendah", pembilang: "armada-hari"}};
  const KODE_TABEL = KODE_NILAI.filter(k => METRIK[k].baik);   // kolom tabel hanya metrik yang punya arah baik/buruk
  const persen = f => fmt(Number(f) * 100) + "%";
  const awalBesar = t => t ? t[0].toUpperCase() + t.slice(1) : t;
  /* satu metrik -> {kosong, angka?, pesan?, rincian}. Null tidak pernah tampil sebagai 0; n dan pembilang selalu ikut bila ada. */
  const tampilMetrik = (kode, m) => {
    const meta = METRIK[kode] || {pembilang: ""};
    if (!m) return {kosong: true, pesan: "Data belum tersedia", rincian: ""};
    const n = Number(m.n) || 0, jum = Number(m.jumlah) || 0, ekor = [];
    if (kode === "M7" && m.tanpa_respons) ekor.push(`${fmt(m.tanpa_respons)} tanpa respons`);
    if (m.tak_dinilai) ekor.push(`${fmt(m.tak_dinilai)} belum bisa dinilai`);
    if (m.nilai == null) {
      const pesan = m.alasan ? awalBesar(m.alasan) : m.catatan === "data kurang" ? `Data kurang (n=${fmt(n)})` : "Data belum tersedia";
      return {kosong: true, pesan, rincian: ekor.join(", ")};
    }
    if (kode === "M7") return {kosong: false, angka: `${fmt(m.nilai)} menit`, rincian: [`median dari ${fmt(n)} ${meta.pembilang}`, ...ekor].join(", ")};
    return {kosong: false, angka: persen(m.nilai), rincian: [`${fmt(jum)} dari ${fmt(n)} ${meta.pembilang}`, ...ekor].join(", ")};
  };
  /* kunci diurutkan: paling banyak data (jumlah n semua metrik) dulu, lalu abjad */
  const urutKunci = peta => { const bobot = k => Object.values(peta[k] || {}).reduce((a, m) => a + (Number(m && m.n) || 0), 0);
    return Object.keys(peta || {}).sort((a, b) => bobot(b) - bobot(a) || a.localeCompare(b)); };
  /* sorotan sel per kolom: terbaik/terburuk hanya bila >= 2 sel bernilai dan nilainya berbeda */
  const sorotKolom = (kode, peta, kunci) => {
    const arah = METRIK[kode] && METRIK[kode].baik, isi = kunci.filter(k => peta[k] && peta[k][kode] && peta[k][kode].nilai != null).map(k => [k, peta[k][kode].nilai]), out = {};
    if (!arah || isi.length < 2) return out;
    const lo = Math.min(...isi.map(x => x[1])), hi = Math.max(...isi.map(x => x[1])); if (lo === hi) return out;
    for (const [k, v] of isi) { if (v === hi) out[k] = arah === "tinggi" ? "baik" : "buruk"; else if (v === lo) out[k] = arah === "tinggi" ? "buruk" : "baik"; }
    return out;
  };
  const tabelNilai = (peta, kunci) => { const sorot = Object.fromEntries(KODE_TABEL.map(k => [k, sorotKolom(k, peta, kunci)]));
    return kunci.map(k => ({kunci: k, sel: KODE_TABEL.map(kode => { const t = tampilMetrik(kode, peta[k] && peta[k][kode]);
      return {kode, teks: t.kosong ? "–" : t.angka, n: peta[k] && peta[k][kode] ? Number(peta[k][kode].n) || 0 : 0, rincian: t.kosong ? t.pesan : t.rincian, sorot: sorot[kode][k] || null}; })})); };
  /* pesawat yang masuk filter base (armada hari peta memuat base_id); tanpa filter semua */
  const registrasiBase = (armada, baseId) => !baseId ? null : new Set((armada || []).filter(a => a.base_id === baseId).map(a => a.registrasi));
  const saringPeta = (peta, set) => !set ? peta : Object.fromEntries(Object.entries(peta || {}).filter(([k]) => set.has(k)));
  const tglPlus = (t, hari) => new Date(Date.parse(t + "T00:00:00Z") + hari * 24 * JAM).toISOString().slice(0, 10);
  const MAKS_HARI = 31;
  const rentangBawaan = kini => { const sampai = hariIniWIB(kini); return {dari: tglPlus(sampai, -6), sampai}; };
  /* ubah = "dari" | "sampai": bagian yang digeser pengguna; yang lain mengikuti agar rentang sah dan <= 31 hari */
  const klampRentang = (dari, sampai, ubah) => { const sel = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / (24 * JAM));
    if (ubah === "dari") { if (sel(dari, sampai) < 0) sampai = dari; else if (sel(dari, sampai) > MAKS_HARI - 1) sampai = tglPlus(dari, MAKS_HARI - 1); }
    else { if (sel(dari, sampai) < 0) dari = sampai; else if (sel(dari, sampai) > MAKS_HARI - 1) dari = tglPlus(sampai, -(MAKS_HARI - 1)); }
    return {dari, sampai}; };

  g.OperasiLapangan = {fmt, tanggalIndo, hariIniWIB, jamWIB, STATUS_TEMUAN, URUT_TEMUAN, STATUS_ARMADA, kelasTemuan, kelasArmada, namaArmada, kelompokTemuan,
    KODE_NILAI, KODE_TABEL, METRIK, persen, tampilMetrik, urutKunci, sorotKolom, tabelNilai, registrasiBase, saringPeta, rentangBawaan, klampRentang, tglPlus,
    segmenJam, saringSegmen, ringkas, sumberTeks, dataBase, garisRujukan, cincin, klaimTeks, SEGMEN};
})(typeof window !== "undefined" ? window : globalThis);
