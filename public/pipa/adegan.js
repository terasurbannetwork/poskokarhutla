/* SIPPA: adegan 3D /pipa/3d (PRD §9.6, DT §6.5). Pola public/sim_adegan.js: bagian atas = logika murni tanpa DOM dan tanpa WebGL (diekspor, diuji di Node),
   bagian bawah = runtime peramban yang memuat three dari vendor lokal hanya saat layar 3D dibuka (CSP script-src 'self').
   Semua angka dari hidraulika() di hitung.js; modul ini tidak punya rumus hidraulika sendiri. Ilustrasi, bukan model panas terkalibrasi. */
import {KONST, saranSarana} from "./hitung.js";

/* angka id-ID: fmt halaman bila ada, selain itu padanannya (uji Node) */
const tampil = n => typeof fmt === "function" ? fmt(n) : n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const adaAngka = x => typeof x === "number" && Number.isFinite(x);

/* ====================== 1. LOGIKA MURNI ====================== */

/* panjang lubang lance untuk front basah (m) dan porositas efektif: asumsi ilustrasi, bukan hasil bench G2 (PRD §9.6) */
export const LUBANG_M = 0.5;
export const POROSITAS = 0.5;

/* kelompok warna komponen menurut awalan kode BOM */
const KELOMPOK = {P: "pompa", ST: "hidrolik", SF: "hidrolik", V: "hidrolik", H: "hidrolik", M: "hidrolik", FT: "sensor", PT: "sensor", U: "sensor", I: "lance"};
export const kelompokKomponen = kode => KELOMPOK[/^[A-Z]+/.exec(kode)?.[0]] || "hidrolik";

/* spesifikasi titik kerja dan kriteria terima: teks antarmuka dari PRD §6.1, bukan data operasi */
export const INFO_KOMPONEN = {
  "ST-101": {nama: "Selang hisap, foot valve, strainer kasar 5 mm", jumlah: "2", titik: "NPSHA lebih besar dari NPSHR ditambah margin", yakin: "asumsi-kebijakan"},
  "P-101": {nama: "Pompa portabel kelas 1.500 L/min atau setara, bensin", jumlah: "2 (N+1 saat relay)", titik: "1.500 L/min pada 10 bar, 2.050 L/min pada 6 bar, 44 kW", terima: "FAT kurva Q-H sebelum bayar", yakin: "terverifikasi"},
  "P-102": {nama: "Pompa portabel kelas 1.500 L/min atau setara, bensin", jumlah: "2 (N+1 saat relay)", titik: "1.500 L/min pada 10 bar, 2.050 L/min pada 6 bar, 44 kW", terima: "FAT kurva Q-H sebelum bayar", yakin: "terverifikasi"},
  "SF-101": {nama: "Filter servis dan bypass", jumlah: "2", titik: "Mesh ditetapkan dari uji sumbat G2", terima: "Jangan memaksa 200 mesh sebelum uji", yakin: "asumsi-kebijakan"},
  "V-101": {nama: "Katup isolasi, cek, pelepas udara", jumlah: "2 set", titik: "Tutup lambat; relief diset di bawah 88% PN", yakin: "asumsi-kebijakan"},
  "FT-101": {nama: "Flowmeter totalizer", jumlah: "2", titik: "Akurasi 1 sampai 2 persen", yakin: "asumsi-kebijakan"},
  "PT-101": {nama: "Sensor tekanan hisap, buang, distal", jumlah: "4", titik: "0 sampai 16 atau 25 bar, 0,5% skala penuh", yakin: "asumsi-kebijakan"},
  "H-101": {nama: "Layflat DN100 bersertifikat, gulung 100 m", jumlah: "1.000 m (10 gulung)", titik: "Tekanan kerja minimal 12 bar, uji 1,5 kali", terima: "ID aktual dari datasheet, tidak diasumsikan 0,96 OD", yakin: "asumsi-kebijakan"},
  "M-101": {nama: "Manifold DN100 ke 4 x DN65, katup bola per outlet", jumlah: "2", titik: "PN16", yakin: "asumsi-kebijakan"},
  "H-201": {nama: "Layflat DN65", jumlah: "500 m (5 gulung)", titik: "Tekanan kerja minimal 16 bar", yakin: "asumsi-kebijakan"},
  "I-101": {nama: "Lance injeksi SS316, ball valve, ujung berlubang", jumlah: "8, ditambah 2 teleskopik di pilot 2027", titik: "15 sampai 40 L/min pada 2 sampai 4 bar", terima: "Diameter lubang dari bench G2, bukan sebelum uji", yakin: "asumsi-kebijakan"},
  "U-102": {nama: "Gateway LoRa atau satelit dan logger tepi", jumlah: "1", titik: "Pola JSON telemetri PRD §9.11", yakin: "asumsi-kebijakan"}
};

/* tahap rantai relay dari sumber ke lance: [kode, lebar (x), tinggi (y), dalam (z), z tengah]; satuan meter skala adegan */
const RANTAI = [
  ["ST-101", 2.4, 1, 1, 0], ["P-101", 1.8, 1.2, 1.2, -1.3], ["P-102", 1.8, 1.2, 1.2, 1.3], ["SF-101", 1.2, 1, 1, 0], ["V-101", 0.8, 0.8, 0.8, 0],
  ["FT-101", 1, 0.8, 0.8, 0], ["PT-101", 0.5, 0.8, 0.5, 0], ["H-101", 2, 1.6, 1.6, 0], ["H-201", 1.6, 1.2, 1.2, 0], ["M-101", 1.8, 0.9, 1.6, 0]
];
const CELAH = 0.6;

/* tataKomponen(nLance): larik {id, kode_bom, nama, x, y, z, lebar, tinggi, dalam}, pusat kotak; y = setengah tinggi (bertumpu di tanah).
   Dua pompa sejajar (z), gateway di sisi, lance berbaris di belakang manifold. Tidak ada dua kotak yang saling tumpuk (uji). */
export function tataKomponen(nLance = 8) {
  if (!Number.isInteger(nLance) || nLance < 1) throw new RangeError(`Jumlah lance harus bilangan bulat minimal 1, bukan ${nLance}`);
  const hasil = [], kotak = (kode, id, x, z, lebar, tinggi, dalam) => hasil.push({id, kode_bom: kode, nama: INFO_KOMPONEN[kode].nama, x, y: tinggi / 2, z, lebar, tinggi, dalam});
  let kursor = 0, ujungTahap = 0;
  for (let i = 0; i < RANTAI.length; i++) {
    const [kode, w, t, d, z] = RANTAI[i];
    const sejajar = kode === "P-102";   // pompa kedua berbagi tahap dengan pompa pertama
    if (!sejajar) kursor = ujungTahap + (i ? CELAH : 0);
    kotak(kode, kode, kursor + w / 2, z, w, t, d);
    ujungTahap = sejajar ? Math.max(ujungTahap, kursor + w) : kursor + w;
  }
  const xLance = ujungTahap + CELAH + 0.2, jarak = 0.9;
  for (let i = 0; i < nLance; i++) kotak("I-101", `I-101-${i + 1}`, xLance, (i - (nLance - 1) / 2) * jarak, 0.4, 1.8, 0.4);
  kotak("U-102", "U-102", 1.2, -4.2 - 0.3, 0.8, 0.6, 0.6);
  return hasil;
}

/* skala tekanan satu-satunya: sama untuk legenda, selang 3D, dan diagram SVG (DS §3.17); warna dari token CSS lewat kelas/--token */
export const SKALA_TEKANAN = [
  {kelas: 0, token: "--bad", kunci: "rendah"}, {kelas: 1, token: "--warn", kunci: "sedang"}, {kelas: 2, token: "--info", kunci: "baik"},
  {kelas: 3, token: "--ok", kunci: "tinggi"}, {kelas: 4, token: "--bad", kunci: "lewat"}
];
export const TEPI_BAR = [KONST.sisa_syarat, 4, 6];   // di bawah 2 bar = merah; sisanya per pita; di atas batas kerja = merah lagi

export function kelasTekanan(p, batas) {
  if (!adaAngka(p)) throw new RangeError(`Tekanan harus angka, bukan ${p}`);
  if (p < TEPI_BAR[0]) return 0;
  if (adaAngka(batas) && p > batas) return SKALA_TEKANAN.length - 1;
  return p < TEPI_BAR[1] ? 1 : p < TEPI_BAR[2] ? 2 : 3;
}

/* profilWarna(hasil): satu entri per segmen profil (50 m), tekanan persis dari hasil.profil; merah bila melewati batas kerja atau di bawah 2 bar */
export function profilWarna(hasil) {
  const pr = hasil.profil, batas = hasil.p_batas_bar, segmen = [];
  for (let i = 0; i < pr.length - 1; i++) {
    const a = pr[i], b = pr[i + 1], pMaks = Math.max(a.p_bar, b.p_bar), pMin = Math.min(a.p_bar, b.p_bar);
    const merah = pMaks > batas || pMin < KONST.sisa_syarat;
    segmen.push({x0: a.x_m, x1: b.x_m, p_awal: a.p_bar, p_akhir: b.p_bar, p_maks: pMaks, p_min: pMin, merah,
      kelas: pMin < KONST.sisa_syarat ? 0 : pMaks > batas ? SKALA_TEKANAN.length - 1 : kelasTekanan((a.p_bar + b.p_bar) / 2, batas)});
  }
  return segmen;
}

/* r(t) = akar(Q t / (pi h ne)): Q L/s (per lance), t detik, h panjang lubang m, ne porositas efektif; hasil meter. Ilustratif, bukan model panas. */
export function frontBasah(t_s, Q_ls, h_m, ne = POROSITAS) {
  if (!adaAngka(t_s) || t_s < 0) throw new RangeError(`Waktu harus angka tidak negatif, bukan ${t_s}`);
  if (!adaAngka(Q_ls) || Q_ls < 0) throw new RangeError(`Debit harus angka tidak negatif, bukan ${Q_ls}`);
  if (!adaAngka(h_m) || h_m <= 0) throw new RangeError(`Panjang lubang harus lebih dari 0 m, bukan ${h_m}`);
  if (!adaAngka(ne) || ne <= 0 || ne > 1) throw new RangeError(`Porositas efektif harus di antara 0 dan 1, bukan ${ne}`);
  return Math.sqrt((Q_ls / 1000) * t_s / (Math.PI * h_m * ne));
}

/* kedalaman lance 0 sampai batas keras KONST.dalam_maks_m; di atasnya ditolak dengan angkanya (keputusan 50) */
export function cekKedalaman(m) {
  if (!adaAngka(m) || m < 0) throw new RangeError(`Kedalaman harus angka tidak negatif, bukan ${m}`);
  if (m > KONST.dalam_maks_m) throw new RangeError(`Kedalaman ${tampil(m)} m melewati batas ${tampil(KONST.dalam_maks_m)} m; injeksi lebih dalam tidak termasuk SIPPA`);
  return m;
}

/* profil elevasi trase: tiga titik (air, tengah linear, kompleks) dari DSM berkanopi; null bila elevasi tidak lengkap */
export function profilTrase(kompleks, L_m) {
  if (!kompleks || !adaAngka(kompleks.elev_air_m) || !adaAngka(kompleks.elev_kompleks_m)) return null;
  const a = kompleks.elev_air_m, b = kompleks.elev_kompleks_m;
  return [{x_m: 0, z_m: a}, {x_m: L_m / 2, z_m: (a + b) / 2}, {x_m: L_m, z_m: b}];
}

/* dari baris kelayakan_kompleks: jarak air terdekat (kendala.json, jarak garis lurus) dikali liku trase 1,2, tanpa pembulatan baru: L_m diambil dari saranSarana().tautan_hitung, satu sumber dengan kalkulator; Δz = elevasi kompleks dikurangi elevasi air */
export function dariKompleks(k) {
  const lama = adaAngka(k?.air_km_lama), air = lama ? k.air_km_lama : k?.air_km_semua;
  if (!adaAngka(air)) return null;
  const dz = adaAngka(k.elev_air_m) && adaAngka(k.elev_kompleks_m) ? k.elev_kompleks_m - k.elev_air_m : null;
  return {air_km: air, L_m: saranSarana(k, lama ? "k" : "u", false).tautan_hitung.L_m, dz_m: dz};
}

/* kartu angka panel teks: sumber tunggal angka yang sama dengan kanvas; satuan dan banding sudah berupa angka/teks mentah, pembulatan urusan fmt di tampilan */
export function angkaPanel(h) {
  const keras = kode => h.gerbang.some(g => g.kode === kode && g.tingkat === "keras");
  return [
    {kunci: "p_pompa", label: "Tekanan pompa", nilai: h.p_pompa_bar, satuan: "bar", banding: h.p_batas_bar, bandingTeks: "batas kerja", lewat: h.p_pompa_bar > h.p_batas_bar, sumber: "dari TDH, hidraulika()"},
    {kunci: "p_ujung", label: "Tekanan di manifold", nilai: h.p_ujung_bar, satuan: "bar", banding: KONST.sisa_syarat, bandingTeks: "syarat minimal", lewat: h.p_ujung_bar < KONST.sisa_keras || keras("H-SISA"), sumber: "sisa di ujung, hidraulika()"},
    {kunci: "t_tiba", label: "Air tiba", nilai: h.t_tiba_menit, satuan: "menit", banding: null, bandingTeks: "volume isi dibagi debit", lewat: false, sumber: "volume selang dan debit, hidraulika()"},
    {kunci: "v", label: "Kecepatan air", nilai: h.v_ms, satuan: "m/s", banding: KONST.v_peringatan, bandingTeks: "peringatan di atas", lewat: false, sumber: "debit dibagi luas ID, hidraulika()"},
    {kunci: "tdh", label: "TDH", nilai: h.tdh_m, satuan: "m", banding: null, bandingTeks: "gesek, minor, elevasi, sisa, hisap", lewat: false, sumber: "Hazen-Williams, hidraulika()"},
    {kunci: "id", label: "Diameter dalam", nilai: h.id_mm, satuan: "mm", banding: null, bandingTeks: h.id_asumsi ? "0,96 x DN, asumsi sampai datasheet" : "dari datasheet", lewat: false, asumsi: !!h.id_asumsi, sumber: "datasheet atau asumsi, hidraulika()"},
    {kunci: "vonis", label: "Vonis", nilai: h.vonis, satuan: "", banding: null, bandingTeks: "gerbang kalkulator", lewat: h.vonis === "NO-GO", sumber: "gerbang H-*, hidraulika()"}
  ];
}

/* ====================== 1b. PARAMETER ADEGAN, KAMERA, WAKTU, LABEL (murni) ====================== */

export const SKALA_JALUR = 60;            // satuan adegan untuk panjang trase (satu sumber: panjang L_m dari kalkulator dipetakan ke sini)
export const SEGMEN_MAKS_ANIMASI = 30;    // injeksi disimulasikan 30 menit; satu detik layar = satu menit nyata pada kecepatan 1x
const ELEV_MAKS = 6;                      // tinggi adegan maksimum untuk beda elevasi, satuan adegan (tegak dilebihkan)
const SELISIH_DZ_M = 0.05;                // Δz di kontrol (dibulatkan 0,1 m) dianggap sama dengan profil kompleks bila selisihnya di bawah ini
const klem = (x, a, b) => Math.min(b, Math.max(a, x));
const halus = (a, b, x) => { const u = klem((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
export { halus };

/* trase di adegan: x dari panjang (L_m dipetakan ke SKALA_JALUR), tinggi dari profil elevasi kompleks (tiga titik) atau garis lurus dari Δz; tegak dilebihkan.
   Panjang trase SELALU hasil.profil.at(-1).x_m, angka yang sama dengan kalkulator. */
export function titikJalur(p, hasil, kompleks) {
  const L = hasil.profil.at(-1).x_m, k = kompleks;
  const tr = k && Math.abs(p.dz_m - (k.elev_kompleks_m - k.elev_air_m)) < SELISIH_DZ_M ? profilTrase(k, L) : null;
  const dzTotal = tr ? tr.at(-1).z_m - tr[0].z_m : p.dz_m;
  const esk = SKALA_JALUR / L, skalaY = Math.min(8, ELEV_MAKS / Math.max(Math.abs(dzTotal), 0.5));
  const tinggiDi = x_m => {
    const x = klem(x_m, 0, L);
    if (!tr) return (p.dz_m * x / L) * skalaY;
    const i = x <= tr[1].x_m ? 0 : 1, a = tr[i], b = tr[i + 1], u = (x - a.x_m) / (b.x_m - a.x_m || 1);
    return (a.z_m + (b.z_m - a.z_m) * u - tr[0].z_m) * skalaY;
  };
  return {L, esk, skalaY, lebihY: skalaY / esk, terKompleks: !!tr, dzTotal, tinggiDi, pos: x_m => [x_m * esk, tinggiDi(x_m), 0]};
}

/* penampang injeksi: kedalaman yang digambar (m) dan pusat bola basah (ujung lance dikurangi setengah panjang lubang) */
export const kedalamanPenampang = dalam_m => Math.max(2, Math.ceil(dalam_m + 1.5));
export const pusatBulb = dalam_m => Math.max(dalam_m - LUBANG_M / 2, 0.15);
export const JARAK_LANCE_M = 0.9;
/* tanda penggaris kedalaman tiap 0,5 m: dari 0 sampai kelipatan 0,5 m terdekat di atas kedalaman lance (minimal 1,5 m) */
export const tandaKedalaman = dalam_m => { const maks = Math.max(1.5, Math.ceil(dalam_m * 2 - 1e-9) / 2); return Array.from({length: Math.round(maks * 2) + 1}, (_, i) => i / 2); };
export const lebarPenampang = n => Math.max(6, (n - 1) * JARAK_LANCE_M + 2.4);

/* linimasa: rentang menit tiap adegan; susunan tidak punya linimasa (hanya gerak aliran) */
export function rentangWaktu(mode, h) {
  if (mode === "jalur") return {ada: true, maks: Math.ceil(h.t_tiba_menit) + 3, tiba: h.t_tiba_menit};
  if (mode === "injeksi") return {ada: true, maks: SEGMEN_MAKS_ANIMASI, tiba: null};
  return {ada: false, maks: 0, tiba: null};
}
/* bingkai diam (gerak dikurangi atau dijeda sebelum diputar): jalur terisi penuh, injeksi di menit ke-18 */
export const waktuStatis = (mode, r) => mode === "jalur" ? r.maks : mode === "injeksi" ? SEGMEN_MAKS_ANIMASI * 0.6 : 0;
/* satu langkah linimasa: maju dt detik layar x kecepatan menit per detik; tahan 3 menit di ujung lalu ulang dari nol */
export function majuWaktu(t, dt, kec, maks, jeda = 3) {
  const n = t + dt * kec;
  if (!(maks > 0)) return n % 3600;
  return n > maks + jeda ? 0 : n;
}
export const waktuTampil = (t, maks) => maks > 0 ? Math.min(t, maks) : t;
export const KECEPATAN = [0.5, 1, 2];

/* kamera tiap adegan: arah dari target ke kamera; jarak dipasang agar kotak pembatas muat di lebar dan tinggi kanvas */
export const KAMERA_MODE = {
  susunan: {arah: [0.14, 0.78, 1], batas: [0.35, 3], azimut: 0},
  jalur: {arah: [-0.28, 0.62, 1], batas: [0.25, 2.5], azimut: 0},
  injeksi: {arah: [0.1, 0.16, 1], batas: [0.3, 2.2], azimut: 1.15}
};
export function kameraMode(mode, bingkai, aspek, fovDeg) {
  const m = KAMERA_MODE[mode]; if (!m) throw new RangeError(`Adegan tidak dikenal: ${mode}`);
  const [cx, cy, cz] = bingkai.pusat, [hx, hy, hz] = bingkai.setengah;
  const n = Math.hypot(...m.arah), d = m.arah.map(v => v / n), f = d.map(v => -v);
  const r0 = [-f[2], 0, f[0]], rn = Math.hypot(...r0), r = r0.map(v => v / rn);
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const tv = Math.tan(fovDeg * Math.PI / 360), th = tv * aspek;
  let jarak = 0;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const c = [sx * hx, sy * hy, sz * hz], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], dalam = dot(c, d);
    jarak = Math.max(jarak, Math.abs(dot(c, r)) / th + dalam, Math.abs(dot(c, u)) / tv + dalam);
  }
  jarak *= 1.03;
  return {posisi: [cx + d[0] * jarak, cy + d[1] * jarak, cz + d[2] * jarak], target: [cx, cy, cz], jarak, minJarak: jarak * m.batas[0], maksJarak: jarak * m.batas[1], azimut: m.azimut};
}
export const easeKeluar = u => 1 - Math.pow(1 - klem(u, 0, 1), 3);

/* batang skala: panjang "bulat" (1, 2, 5 x 10^n meter) terbesar yang muat di pikselMaks */
export function batangSkala(meterPerPiksel, pikselMaks) {
  if (!(meterPerPiksel > 0) || !(pikselMaks > 0)) return null;
  const maksM = meterPerPiksel * pikselMaks, e = Math.pow(10, Math.floor(Math.log10(maksM)));
  for (const f of [5, 2, 1]) if (f * e <= maksM * (1 + 1e-12)) return {meter: f * e, piksel: f * e / meterPerPiksel};
  return null;
}
export const teksJarak = m => m >= 1000 ? `${tampil(m / 1000)} km` : `${tampil(m)} m`;

/* teks label melayang di kanvas: angka SAMA dengan panel (dari hasil hidraulika dan masukan), tanpa rumus baru */
export function labelAdegan(mode, h, p) {
  if (mode === "susunan") return [
    {id: "sumber", judul: "Sumber air", nilai: `${tampil(p.q_lpm)} L/min dihisap`},
    {id: "pompa", judul: "Pompa", nilai: `${tampil(h.p_pompa_bar)} bar`},
    {id: "selang", judul: `Selang layflat DN${tampil(p.dn_mm)}`, nilai: `${tampil(p.L_m)} m, ID ${tampil(h.id_mm)} mm`},
    {id: "manifold", judul: "Manifold", nilai: `${tampil(h.p_ujung_bar)} bar`},
    {id: "lance", judul: `${tampil(p.n_lance)} lance`, nilai: `${tampil(p.dalam_m)} m dalam`}
  ];
  if (mode === "jalur") return [
    {id: "sumber", judul: "Sumber air", nilai: `hisap ${tampil(p.q_lpm)} L/min`},
    {id: "pompa", judul: "Pompa", nilai: `${tampil(h.p_pompa_bar)} bar, TDH ${tampil(h.tdh_m)} m`},
    {id: "selang", judul: `Selang ${tampil(p.L_m)} m`, nilai: `${tampil(h.v_ms)} m/s, air tiba ${tampil(h.t_tiba_menit)} menit`},
    {id: "manifold", judul: "Manifold", nilai: `${tampil(h.p_ujung_bar)} bar`},
    {id: "panas", judul: "Titik panas", nilai: "ilustrasi"},
    ...(p.dz_m !== 0 ? [{id: "dz", judul: "Beda elevasi", nilai: `${tampil(p.dz_m)} m`}] : [])
  ];
  return [
    {id: "lance", judul: `Lance ${tampil(p.dalam_m)} m`, nilai: `${tampil(KONST.serap_lance_lpm)} L/min per lance`},
    {id: "bulb", judul: "Muka basah", nilai: ""},
    {id: "zona", judul: "Zona injeksi", nilai: `0 sampai ${tampil(p.dalam_m)} m`},
    {id: "air", judul: "Muka air (ilustrasi)", nilai: ""},
    {id: "bara", judul: "Bara (ilustrasi)", nilai: ""},
    ...tandaKedalaman(p.dalam_m).map((d, i) => ({id: `d${i}`, judul: `${tampil(d)} m`, nilai: ""}))
  ];
}

/* relief tanah deterministik, nilai di [-1, 1]: gelombang lembut, bukan data medan */
export const reliefTanah = (x, z) => 0.5 * Math.sin(x * 0.31 + 1.3) * Math.cos(z * 0.27) + 0.3 * Math.sin(x * 0.83 + z * 0.61 + 2) + 0.2 * Math.sin(z * 1.1 - x * 0.4 + 5);

/* lepas semua sumber daya GPU sebuah pohon objek; tekstur bertanda userData.simpan dipakai ulang dan dibebaskan pemiliknya */
export function bebaskan(obj) {
  const hitung = {geometri: 0, bahan: 0, tekstur: 0};
  obj.traverse(o => {
    if (o.geometry) { o.geometry.dispose(); hitung.geometri++; }
    for (const m of [].concat(o.material || [])) {
      if (m.map && !m.map.userData?.simpan) { m.map.dispose(); hitung.tekstur++; }
      m.dispose(); hitung.bahan++;
    }
  });
  return hitung;
}

/* ====================== 2. RUNTIME PERAMBAN ====================== */

const bacaToken = (el, t) => getComputedStyle(el).getPropertyValue(t).trim();

/* warna CSS apa pun (termasuk oklch token tema) ke 0xRRGGBB lewat kanvas 2D; gagal = abu-abu netral */
let cv2d = null;
function warnaHex(css) {
  cv2d ??= document.createElement("canvas").getContext("2d", {willReadFrequently: true});
  if (!css) return 0x8892a6;
  cv2d.canvas.width = cv2d.canvas.height = 1;
  cv2d.fillStyle = "#8892a6"; cv2d.fillStyle = css; cv2d.fillRect(0, 0, 1, 1);
  const d = cv2d.getImageData(0, 0, 1, 1).data;
  return (d[0] << 16) | (d[1] << 8) | d[2];
}
const adaWebGL = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };

/* ---- diagram SVG 2D (tanpa WebGL atau three gagal): logika murni yang sama ---- */
const f1 = n => Math.round(n * 100) / 100;
function svgSusunan(k) {
  const maksX = Math.max(...k.map(b => b.x + b.lebar / 2)), minZ = Math.min(...k.map(b => b.z - b.dalam / 2)), maksZ = Math.max(...k.map(b => b.z + b.dalam / 2));
  const S = 36, W = f1((maksX + 1) * S), H = f1((maksZ - minZ + 1.2) * S);
  const kotak = k.map(b => `<g class="sa-k-${kelompokKomponen(b.kode_bom)}"><rect x="${f1((b.x - b.lebar / 2 + 0.5) * S)}" y="${f1((b.z - b.dalam / 2 - minZ + 0.6) * S)}" width="${f1(b.lebar * S)}" height="${f1(b.dalam * S)}" rx="3"/><title>${b.kode_bom}: ${b.nama}</title></g>`).join("");
  const label = k.filter(b => b.kode_bom !== "I-101").map(b => `<text x="${f1((b.x + 0.5) * S)}" y="${f1((b.z - minZ + 0.6) * S + 4)}" text-anchor="middle">${b.kode_bom.replace(/-1(\d\d)$/, "-$1")}</text>`).join("");
  return `<svg class="sa-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Susunan kit dilihat dari atas: sumber air, pompa, filter, selang, manifold, dan lance">${kotak}${label}</svg>`;
}
function svgJalur(h) {
  const seg = profilWarna(h), W = 720, H = 200, L = 36, R = 12, T = 14, B = 28, x = m => L + (W - L - R) * m / h.profil.at(-1).x_m;
  const pMaks = Math.max(h.p_batas_bar, ...h.profil.map(p => p.p_bar)), y = p => T + (H - T - B) * (1 - Math.max(0, p) / pMaks);
  const garis = seg.map(s => `<line class="sa-k${s.kelas}" x1="${f1(x(s.x0))}" y1="${f1(y(s.p_awal))}" x2="${f1(x(s.x1))}" y2="${f1(y(s.p_akhir))}"/>`).join("");
  return `<svg class="sa-svg sa-svg-profil" viewBox="0 0 ${W} ${H}" role="img" aria-label="Profil tekanan sepanjang selang, dalam bar, dari pompa ke manifold"><line class="sa-sumbu" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="sa-batas" x1="${L}" x2="${W - R}" y1="${f1(y(h.p_batas_bar))}" y2="${f1(y(h.p_batas_bar))}"><title>Batas kerja ${tampil(h.p_batas_bar)} bar</title></line>${garis}<text class="sa-teks" x="${L - 6}" y="${f1(y(h.p_batas_bar)) + 4}" text-anchor="end">${tampil(h.p_batas_bar)}</text><text class="sa-teks" x="${L - 6}" y="${H - B + 4}" text-anchor="end">0</text><text class="sa-teks" x="${W - R}" y="${H - 8}" text-anchor="end">${tampil(h.profil.at(-1).x_m)} m</text></svg>`;
}
function svgInjeksi(p) {
  const maks = p.dalam_m < KONST.dalam_uji_m ? 2 : KONST.dalam_maks_m, S = 60, W = 360, H = f1(maks * S + 40), cx = W / 2, y0 = 20;
  const r = frontBasah(1800, KONST.serap_lance_lpm / 60, LUBANG_M), ypusat = y0 + Math.max(p.dalam_m, 0.3) * S;
  const skala = Array.from({length: Math.floor(maks) + 1}, (_, i) => `<line class="sa-sumbu" x1="40" x2="${W - 40}" y1="${y0 + i * S}" y2="${y0 + i * S}"/><text class="sa-teks" x="34" y="${y0 + i * S + 4}" text-anchor="end">${tampil(i)}</text>`).join("");
  return `<svg class="sa-svg sa-svg-injeksi" viewBox="0 0 ${W} ${H}" role="img" aria-label="Penampang gambut dengan lance sedalam ${tampil(p.dalam_m)} m dan front basah ilustratif"><rect class="sa-gambut" x="40" y="${y0}" width="${W - 80}" height="${f1(maks * S)}"/><rect class="sa-bara" x="40" y="${y0 + 0.3 * S}" width="${W - 80}" height="${0.2 * S}"/>${skala}<circle class="sa-front" cx="${cx}" cy="${f1(ypusat)}" r="${f1(r * S)}"/><line class="sa-lance" x1="${cx}" x2="${cx}" y1="4" y2="${f1(y0 + p.dalam_m * S)}"/></svg>`;
}

/* buatAdegan(wadah, {onPilih, onLabel, onWaktu}): memuat three malas, membuat kanvas dan lapis label di dalam wadah.
   Mengembalikan {webgl, atur(adegan, data), kamera(aksi), animasi(aktif), kecepatan(k), cari(menit), pilih(id), lepas()}.
   data = {hasil, p, kompleks}. Tanpa WebGL: SVG 2D dan webgl=false. */
export async function buatAdegan(wadah, {onPilih = () => {}, onLabel = () => {}, onWaktu = () => {}, animasiAwal = true} = {}) {
  let THREE = null, OrbitControls = null;
  if (adaWebGL()) {
    try {
      [THREE, {OrbitControls}] = await Promise.all([import("/vendor/three/three.module.min.js"), import("/vendor/three/addons/controls/OrbitControls.js")]);
    } catch (e) { console.error(e); THREE = null; }
  }
  let adegan = "susunan", data = null, mati = false, pilihId = null, animasiOn = animasiAwal, kec = 1;
  if (!THREE) return fallback();
  const T = THREE;

  const ponsel = matchMedia("(max-width: 767px)").matches;
  const reduksi = matchMedia("(prefers-reduced-motion: reduce)");
  if (reduksi.matches) animasiOn = false;
  const renderer = new T.WebGLRenderer({antialias: !ponsel, powerPreference: "default"});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, ponsel ? 1.5 : 2));   // anggaran kinerja DT §6.5
  let tanpaBayangan = ponsel, emaFrame = 0, nFrame = 0;   // bayangan dimatikan sendiri bila gambar terlalu lambat (GPU lemah atau perender perangkat lunak)
  renderer.shadowMap.enabled = !tanpaBayangan; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.toneMapping = T.NeutralToneMapping;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "sp-3d-kanvas-el";
  const lapis = document.createElement("div"); lapis.className = "sa-lapis"; lapis.setAttribute("aria-hidden", "true");
  const batang = document.createElement("div"); batang.className = "sa-skala"; batang.innerHTML = "<i></i><span></span>";
  const batangGaris = batang.querySelector("i"), batangTeks = batang.querySelector("span");
  wadah.replaceChildren(renderer.domElement, lapis, batang);

  const scene = new T.Scene(), kamera = new T.PerspectiveCamera(38, 1, 0.05, 2500);
  const hemi = new T.HemisphereLight(0xd6e4f2, 0x806f52, 1.25), matahari = new T.DirectionalLight(0xfff0d8, 3.1);
  matahari.castShadow = !tanpaBayangan; matahari.shadow.mapSize.set(ponsel ? 1024 : 2048, ponsel ? 1024 : 2048); matahari.shadow.bias = -0.0004; matahari.shadow.normalBias = 0.04;
  scene.add(hemi, matahari, matahari.target);
  const kontrol = new OrbitControls(kamera, renderer.domElement);
  kontrol.enableDamping = false; kontrol.maxPolarAngle = Math.PI * 0.485; kontrol.screenSpacePanning = true;

  /* langit bergradasi: kubah besar; warna menurut tema */
  const langitU = {hor: {value: new T.Color()}, atas: {value: new T.Color()}};
  const langit = new T.Mesh(new T.SphereGeometry(1800, 24, 12), new T.ShaderMaterial({side: T.BackSide, depthWrite: false, fog: false, uniforms: langitU,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: "uniform vec3 hor; uniform vec3 atas; varying vec3 vD; void main(){ float h = clamp(vD.y, 0., 1.); gl_FragColor = vec4(mix(hor, atas, pow(h, .6)), 1.); }"}));
  langit.renderOrder = -1; langit.frustumCulled = false; scene.add(langit);
  const gelap = () => document.documentElement.dataset.theme === "dark";
  const atasTema = () => {
    const g = gelap(), hor = new T.Color(g ? 0x3b4c68 : 0xdde2d6), atas = new T.Color(g ? 0x141f33 : 0x9bbbd9);
    langitU.hor.value.copy(hor); langitU.atas.value.copy(atas); scene.fog = new T.FogExp2(hor, 0.004);
    hemi.color.set(g ? 0x9fb4d6 : 0xd6e4f2); hemi.groundColor.set(g ? 0x6a5f4c : 0x806f52); hemi.intensity = g ? 1.5 : 1.25; matahari.intensity = g ? 2.6 : 3.1; matahari.color.set(g ? 0xffe9cc : 0xfff0d8);
  };

  let grup = null, warna = {}, rafId = 0, tSim = 0, tDet = 0, tTerakhir = 0, terlihat = true, pembaruan = null, bangunan = null, tween = null, mPerUnit = 1, lebarPx = 2, tinggiPx = 2, perluGambar = true, menitTerakhir = -1, skalaLama = "";
  const tangan = [], etiket = new Map(), jangkarAktif = [], tmpV = new T.Vector3();
  const dengar = (t, e, f, o) => { t.addEventListener(e, f, o); tangan.push(() => t.removeEventListener(e, f, o)); };

  const bacaWarna = () => {
    const w = {};
    for (const t of ["--bad", "--warn", "--info", "--ok", "--f2", "--ink", "--ink2", "--ink3", "--card", "--line", "--accent"]) w[t] = warnaHex(bacaToken(wadah, t));
    warna = w;
  };

  /* ---- tekstur prosedural (dipakai ulang antarbangunan, dibebaskan di lepas) ---- */
  const teks = {};
  const rng = seed => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const kanvasTekstur = (ukuran, gambar, ulang) => {
    const c = document.createElement("canvas"); c.width = c.height = ukuran; gambar(c.getContext("2d"), ukuran);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.userData.simpan = true;
    if (ulang) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(ulang[0], ulang[1]); t.anisotropy = 4; }
    return t;
  };
  const tekstur = nama => teks[nama] ??= ({
    gambut: () => kanvasTekstur(256, (g, n) => {
      const r = rng(7); g.fillStyle = "#d6d6d6"; g.fillRect(0, 0, n, n);
      for (let i = 0; i < 1400; i++) { const x = r() * n, y = r() * n, l = 6 + r() * 26, a = (r() - 0.5) * 0.5, v = 120 + r() * 135 | 0; g.strokeStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.4})`; g.lineWidth = 0.7 + r() * 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(40,30,20,${0.12 + r() * 0.25})`; g.fillRect(r() * n, r() * n, 1 + r() * 2.5, 1 + r() * 2); }
    }, [3, 1]),
    air: () => kanvasTekstur(256, (g, n) => {
      const r = rng(11); g.fillStyle = "#9a9a9a"; g.fillRect(0, 0, n, n);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.16})`; g.beginPath(); g.ellipse(r() * n, r() * n, 10 + r() * 34, 1.2 + r() * 2.4, 0, 0, 7); g.fill(); }
    }, [3, 2]),
    titik: () => kanvasTekstur(64, (g, n) => { const q = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); q.addColorStop(0, "rgba(255,255,255,1)"); q.addColorStop(0.45, "rgba(255,255,255,.85)"); q.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = q; g.fillRect(0, 0, n, n); }),
    asap: () => kanvasTekstur(64, (g, n) => { const q = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); q.addColorStop(0, "rgba(255,255,255,.55)"); q.addColorStop(0.6, "rgba(255,255,255,.2)"); q.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = q; g.fillRect(0, 0, n, n); })
  })[nama]();

  /* ---- bantu bangun geometri ---- */
  const mats = new Map();
  const std = (hex, o = {}) => new T.MeshStandardMaterial({color: hex, roughness: 0.7, metalness: 0.05, ...o});
  const mat = nama => {
    const d = {
      baja: [0xa9b1ba, {metalness: 0.75, roughness: 0.32}], bajaGelap: [0x4a525c, {metalness: 0.6, roughness: 0.45}], rangka: [0x2f353d, {roughness: 0.6, metalness: 0.4}],
      mesin: [0xc4402b, {roughness: 0.5}], mesinGelap: [0x2b2f36, {roughness: 0.55}], tangki: [0xe3b23c, {roughness: 0.45}], volute: [0x3f7fb8, {metalness: 0.5, roughness: 0.35}],
      kaca: [0x6fb1d6, {transparent: true, opacity: 0.42, roughness: 0.15, depthWrite: false}], selangHisap: [0x4a5963, {roughness: 0.8}], layflat: [0xd9742b, {roughness: 0.75}],
      layflatHijau: [0x4d8a4e, {roughness: 0.75}], roda: [0xc23a2c, {roughness: 0.5}], layar: [0x3ee08a, {emissiveIntensity: 1}], putih: [0xeceff2, {roughness: 0.55}],
      karet: [0x25282c, {roughness: 0.95}], lance: [0x8fa0ae, {metalness: 0.8, roughness: 0.3}], lubang: [0xd7b94d, {metalness: 0.7, roughness: 0.35}], panel: [0x23324a, {metalness: 0.4, roughness: 0.3}]
    }[nama];
    if (!mats.has(nama)) { const m = std(d[0], d[1]); if (nama === "layar") m.emissive = new T.Color(0x1d9b5c); mats.set(nama, m); }
    return mats.get(nama);
  };
  const taruh = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; return m; };
  const kotak = (w, h, d, mt, x = 0, y = 0, z = 0) => taruh(new T.Mesh(new T.BoxGeometry(w, h, d), mt), x, y, z);
  const sil = (r1, r2, h, mt, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 18) => taruh(new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg), mt), x, y, z, rx, ry, rz);
  const bola = (r, mt, x = 0, y = 0, z = 0) => taruh(new T.Mesh(new T.SphereGeometry(r, 18, 12), mt), x, y, z);
  const cincin = (R, r, mt, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => taruh(new T.Mesh(new T.TorusGeometry(R, r, 8, 20), mt), x, y, z, rx, ry, rz);
  const antara = (a, b, r, mt, seg = 12) => {   // silinder dari titik a ke titik b
    const d = b.clone().sub(a), l = d.length() || 1e-6, m = new T.Mesh(new T.CylinderGeometry(r, r, l, seg), mt);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.divideScalar(l)); m.castShadow = m.receiveShadow = true; return m;
  };
  const V = (x, y, z) => new T.Vector3(x, y, z);
  /* jalur siku antar-port: titik awal, siku di tengah x, titik akhir */
  const rutePipa = (a, b) => {
    const mx = (a.x + b.x) / 2;
    if (Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.z - b.z) < 1e-6) return [a, b];
    return [a, V(mx, a.y, a.z), V(mx, b.y, a.z), V(mx, b.y, b.z), b].filter((p, i, s) => !i || p.distanceTo(s[i - 1]) > 1e-6);
  };

  /* pembangun aliran: titik bulat bergerak sepanjang polilin, searah aliran (x naik) */
  function buatAliran(polilin, jarak, ukuran, hex, opasitas = 0.95) {
    const tabel = polilin.map(pts => { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1])); return {pts, cum, total: cum.at(-1) || 1e-6}; });
    const titik = []; tabel.forEach((t, k) => { const n = Math.max(2, Math.round(t.total / jarak)); for (let i = 0; i < n; i++) titik.push({k, f: i / n}); });
    const pos = new Float32Array(titik.length * 3), geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    const mt = new T.PointsMaterial({color: hex, size: ukuran, map: tekstur("titik"), transparent: true, opacity: opasitas, depthWrite: false, alphaTest: 0.02});
    const obj = new T.Points(geo, mt); obj.frustumCulled = false;
    const letak = (t, s, i) => {
      let lo = 0, hi = t.cum.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (t.cum[mid] <= s) lo = mid; else hi = mid; }
      const u = (s - t.cum[lo]) / ((t.cum[hi] - t.cum[lo]) || 1), a = t.pts[lo], b = t.pts[hi];
      pos[i] = a.x + (b.x - a.x) * u; pos[i + 1] = a.y + (b.y - a.y) * u; pos[i + 2] = a.z + (b.z - a.z) * u;
    };
    /* gerak: fase maju w (satuan jalur per detik x detik), muka = pecahan jalur utama (indeks 0) yang sudah terisi */
    const tulis = (w, kecJalan, muka = 1) => {
      titik.forEach((d, j) => { const t = tabel[d.k], m = d.k === 0 ? muka : 1, u = ((d.f + w * kecJalan / t.total) % 1 + 1) % 1; letak(t, u * m * t.total, j * 3); });
      geo.attributes.position.needsUpdate = true;
    };
    return {obj, tulis, tabel};
  }

  /* bidang tanah berwarna per-simpul */
  function tanahMesh({x0, x1, z0, z1, sx, sz, tinggi, warnaDi}) {
    const g = new T.PlaneGeometry(x1 - x0, z1 - z0, sx, sz); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + (x0 + x1) / 2, z = pos.getZ(i) + (z0 + z1) / 2, y = tinggi(x, z);
      pos.setXYZ(i, x, y, z); warnaDi(x, z, y, c); c.toArray(col, i * 3);
    }
    g.setAttribute("color", new T.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({vertexColors: true, roughness: 1, metalness: 0})); m.receiveShadow = true; return m;
  }
  const gKering = new T.Color(0x7d6846), gBasah = new T.Color(0x2f261b), gLumut = new T.Color(0x506232), gArang = new T.Color(0x1d1b19);
  const gambutWarna = (c, x, z, basah, arang = 0, lumutFaktor = 1) => {
    const n = reliefTanah(x * 1.7 + 3, z * 1.9), n2 = reliefTanah(x * 0.35, z * 0.4 + 9);
    c.copy(gKering).multiplyScalar(0.88 + n * 0.14); c.lerp(gBasah, klem(basah, 0, 1));
    const lumut = halus(0.1, 0.55, n2 + basah * 0.5) * 0.55 * lumutFaktor * (1 - arang); c.lerp(gLumut, lumut);
    c.lerp(gArang, klem(arang, 0, 1));
  };
  /* pepohonan di tepi: dua InstancedMesh (batang dan tajuk); posisi deterministik, di luar koridor kerja */
  function pepohonan(n, sebar, tinggiDi, skalaPohon, seed) {
    const r = rng(seed), batangI = new T.InstancedMesh(new T.CylinderGeometry(0.07, 0.11, 1, 6), std(0x5b4631, {roughness: 1}), n), tajuk = new T.InstancedMesh(new T.IcosahedronGeometry(0.62, 0), std(0xffffff, {roughness: 0.9, flatShading: true}), n);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), col = new T.Color();
    for (let i = 0; i < n; i++) {
      const [x, z] = sebar(r), y = tinggiDi(x, z), h = (1.8 + r() * 1.5) * skalaPohon;
      m4.compose(V(x, y + h / 2, z), q, V(skalaPohon, h, skalaPohon)); batangI.setMatrixAt(i, m4);
      m4.compose(V(x, y + h * 0.95, z), q.setFromEuler(new T.Euler(r(), r() * 6, r())), V(skalaPohon * (1.4 + r() * 0.8), skalaPohon * (1.3 + r() * 0.7), skalaPohon * (1.4 + r() * 0.8))); tajuk.setMatrixAt(i, m4);
      tajuk.setColorAt(i, col.setHSL(0.24 + r() * 0.07, 0.38, 0.2 + r() * 0.1));
      q.identity();
    }
    batangI.castShadow = tajuk.castShadow = true; batangI.receiveShadow = tajuk.receiveShadow = true;
    const g = new T.Group(); g.add(batangI, tajuk); return g;
  }
  /* bingkai tanah di luar petak rinci: empat potong kasar sampai jauh; tinggi dan warna memakai fungsi petak, tepi menyambung */
  const skirt = (tinggi, warnaDi, [X0, X1, Z0, Z1], sx) => {
    const F = 400, g = new T.Group();
    for (const [x0, x1, z0, z1, a, b] of [[X0 - F, X0, Z0 - F, Z1 + F, 10, 10], [X1, X1 + F, Z0 - F, Z1 + F, 10, 10], [X0, X1, Z1, Z1 + F, sx, 6], [X0, X1, Z0 - F, Z0, sx, 6]]) g.add(tanahMesh({x0, x1, z0, z1, sx: a, sz: b, tinggi, warnaDi}));
    return g;
  };
  const airPermukaan = (lebar, dalam, x, y, z) => {
    const m = new T.Mesh(new T.PlaneGeometry(lebar, dalam), new T.MeshStandardMaterial({color: gelap() ? 0x1f4f66 : 0x3a8099, map: tekstur("air"), transparent: true, opacity: 0.86, roughness: 0.12, metalness: 0.1}));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; return m;
  };
  const garisBantu = (titik, hex, buram = 1, putus = false) => {
    const g = new T.BufferGeometry().setFromPoints(titik), m = putus ? new T.LineDashedMaterial({color: hex, dashSize: 0.5, gapSize: 0.35, transparent: true, opacity: buram}) : new T.LineBasicMaterial({color: hex, transparent: true, opacity: buram});
    const l = new T.LineSegments(g, m); if (putus) l.computeLineDistances(); return l;
  };

  /* ---- model komponen ---- */
  /* pompa portabel pada kotak kanonik 1,8 x 1,2 x 1,2 (alas di y=0, tengah di 0): isap di sisi -x, buang di sisi +x */
  function modelPompa() {
    const g = new T.Group();
    g.add(kotak(1.8, 0.1, 1.2, mat("rangka"), 0, 0.05, 0));
    g.add(kotak(0.78, 0.56, 0.78, mat("mesin"), 0.42, 0.4, 0), kotak(0.8, 0.1, 0.8, mat("mesinGelap"), 0.42, 0.72, 0));
    g.add(sil(0.16, 0.16, 0.6, mat("tangki"), 0.44, 0.9, -0.32, Math.PI / 2, 0, 0));
    g.add(sil(0.05, 0.05, 0.28, mat("mesinGelap"), 0.66, 0.92, 0.28, 0, 0, 0), sil(0.07, 0.07, 0.05, mat("bajaGelap"), 0.66, 1.07, 0.28));
    g.add(kotak(0.16, 0.1, 0.2, mat("mesinGelap"), 0.86, 0.5, 0.3));   // tuas starter
    g.add(sil(0.36, 0.36, 0.34, mat("volute"), -0.42, 0.5, 0, 0, 0, Math.PI / 2, 28), sil(0.26, 0.26, 0.1, mat("baja"), -0.62, 0.5, 0, 0, 0, Math.PI / 2, 24));
    g.add(sil(0.15, 0.15, 0.36, mat("baja"), -0.78, 0.5, 0, 0, 0, Math.PI / 2), cincin(0.2, 0.035, mat("bajaGelap"), -0.9, 0.5, 0, 0, Math.PI / 2, 0));
    g.add(sil(0.12, 0.12, 0.62, mat("baja"), -0.42, 0.98, 0), bola(0.14, mat("baja"), -0.42, 1.3, 0), sil(0.12, 0.12, 1.28, mat("baja"), 0.22, 1.3, 0, 0, 0, Math.PI / 2));
    g.add(bola(0.14, mat("baja"), 0.86, 1.3, 0), sil(0.12, 0.12, 0.84, mat("baja"), 0.86, 0.88, 0), cincin(0.19, 0.035, mat("bajaGelap"), 0.9, 0.5, 0, Math.PI / 2, 0, 0));
    const tiang = mat("baja");
    for (const sx of [-0.86, 0.86]) for (const sz of [-0.56, 0.56]) g.add(sil(0.025, 0.025, 1.0, tiang, sx, 0.6, sz, 0, 0, 0, 8));
    for (const sz of [-0.56, 0.56]) g.add(sil(0.025, 0.025, 1.72, tiang, 0, 1.1, sz, 0, 0, Math.PI / 2, 8));
    for (const sx of [-0.86, 0.86]) g.add(sil(0.025, 0.025, 1.12, tiang, sx, 1.1, 0, Math.PI / 2, 0, 0, 8));
    const mano = sil(0.09, 0.09, 0.04, mat("putih"), -0.42, 1.52, 0, Math.PI / 2, 0, 0, 20); g.add(mano, sil(0.02, 0.02, 0.22, mat("baja"), -0.42, 1.42, 0));
    return g;
  }
  /* satu komponen BOM pada kotak b (x, z, lebar, tinggi, dalam dari tataKomponen); lokal: pusat kotak di (0, 0, 0) pada lantai */
  function modelKomponen(b) {
    const g = new T.Group(), w = b.lebar, kode = b.kode_bom;
    if (kode === "P-101" || kode === "P-102") g.add(modelPompa());
    else if (kode === "ST-101") {   // selang hisap miring ke air, foot valve dan strainer kasar di ujung
      g.add(antara(V(w / 2, 0.5, 0), V(-w / 2 + 0.15, -0.38, 0), 0.2, mat("selangHisap"), 14));
      for (let i = 0; i < 6; i++) { const u = 0.1 + i * 0.16; g.add(cincin(0.215, 0.025, mat("bajaGelap"), w / 2 - u * (w - 0.15), 0.5 - u * 0.88, 0, 0, Math.PI / 2, -0.4)); }
      g.add(sil(0.3, 0.3, 0.46, mat("lubang"), -w / 2 + 0.05, -0.42, 0, 0, 0, Math.PI / 2, 14), bola(0.18, mat("bajaGelap"), -w / 2 - 0.2, -0.42, 0));
    } else if (kode === "SF-101") {
      g.add(sil(0.42, 0.42, 0.62, mat("volute"), 0, 0.42, 0), sil(0.34, 0.34, 0.14, mat("baja"), 0, 0.8, 0), sil(0.07, 0.07, 0.2, mat("roda"), 0, 0.97, 0), sil(0.12, 0.12, 1.18, mat("baja"), 0, 0.5, 0, 0, 0, Math.PI / 2));
    } else if (kode === "V-101") {
      g.add(sil(0.11, 0.11, 0.8, mat("baja"), 0, 0.5, 0, 0, 0, Math.PI / 2), kotak(0.34, 0.34, 0.34, mat("bajaGelap"), 0, 0.5, 0), sil(0.04, 0.04, 0.3, mat("baja"), 0, 0.82, 0), cincin(0.17, 0.03, mat("roda"), 0, 0.99, 0, Math.PI / 2, 0, 0));
    } else if (kode === "FT-101") {
      g.add(sil(0.12, 0.12, 1.0, mat("baja"), 0, 0.5, 0, 0, 0, Math.PI / 2), sil(0.2, 0.2, 0.42, mat("bajaGelap"), 0, 0.5, 0, 0, 0, Math.PI / 2, 20), kotak(0.36, 0.26, 0.3, mat("putih"), 0, 0.88, 0), kotak(0.26, 0.14, 0.02, mat("layar"), 0, 0.89, 0.16));
    } else if (kode === "PT-101") {
      g.add(sil(0.1, 0.1, 0.5, mat("baja"), 0, 0.5, 0, 0, 0, Math.PI / 2), sil(0.05, 0.05, 0.22, mat("baja"), 0, 0.64, 0), sil(0.11, 0.11, 0.05, mat("putih"), 0, 0.8, 0, Math.PI / 2, 0, 0, 20), sil(0.015, 0.015, 0.3, mat("karet"), 0.12, 0.7, 0.1, 0.6, 0, 0.3, 6));
    } else if (kode === "H-101" || kode === "H-201") {   // gulungan selang layflat bersumbu x
      const r = kode === "H-101" ? 0.62 : 0.46, tengah = kode === "H-101" ? 0.8 : 0.6, hm = kode === "H-101" ? mat("layflat") : mat("layflatHijau");
      g.add(sil(r, r, w * 0.5, hm, 0, tengah, 0, 0, 0, Math.PI / 2, 30), sil(r * 1.28, r * 1.28, 0.07, mat("bajaGelap"), -w * 0.27, tengah, 0, 0, 0, Math.PI / 2, 30), sil(r * 1.28, r * 1.28, 0.07, mat("bajaGelap"), w * 0.27, tengah, 0, 0, 0, Math.PI / 2, 30));
      g.add(sil(r * 0.34, r * 0.34, w * 0.72, mat("baja"), 0, tengah, 0, 0, 0, Math.PI / 2, 14), kotak(0.12, tengah, 0.16, mat("rangka"), -w * 0.27, tengah / 2, 0), kotak(0.12, tengah, 0.16, mat("rangka"), w * 0.27, tengah / 2, 0));
    } else if (kode === "M-101") {
      g.add(sil(0.13, 0.13, 1.4, mat("baja"), -0.1, 0.45, 0, Math.PI / 2, 0, 0), sil(0.12, 0.12, 0.8, mat("baja"), -0.5, 0.45, 0, 0, 0, Math.PI / 2));
      for (const z of [-0.55, -0.18, 0.18, 0.55]) g.add(sil(0.07, 0.07, 0.75, mat("baja"), 0.28, 0.45, z, 0, 0, Math.PI / 2, 12), bola(0.1, mat("bajaGelap"), 0.4, 0.45, z), kotak(0.22, 0.04, 0.05, mat("roda"), 0.4, 0.57, z), cincin(0.09, 0.02, mat("bajaGelap"), 0.65, 0.45, z, 0, Math.PI / 2, 0));
      g.add(sil(0.05, 0.05, 0.14, mat("baja"), -0.1, 0.6, 0.62, 0, 0, 0, 8), sil(0.065, 0.065, 0.03, mat("putih"), -0.1, 0.69, 0.62, 0, 0, 0, 16));
    } else if (kode === "I-101") {
      g.add(sil(0.045, 0.045, 2.0, mat("lance"), 0, 0.5, 0, 0, 0, 0, 10), sil(0.0, 0.05, 0.16, mat("lance"), 0, -0.58, 0, 0, 0, 0, 10), sil(0.058, 0.058, 0.5, mat("lubang"), 0, -0.3, 0, 0, 0, 0, 10));
      g.add(bola(0.09, mat("bajaGelap"), 0, 1.15, 0), kotak(0.28, 0.035, 0.05, mat("roda"), 0.1, 1.22, 0), sil(0.04, 0.04, 0.2, mat("baja"), 0, 1.45, 0, 0, 0, 0, 8));
    } else if (kode === "U-102") {
      g.add(kotak(0.8, 0.6, 0.6, mat("putih"), 0, 0.3, 0), sil(0.02, 0.02, 1.4, mat("baja"), 0.28, 1.0, -0.2, 0, 0, 0, 8), bola(0.05, mat("roda"), 0.28, 1.7, -0.2));
      const panel = kotak(0.7, 0.03, 0.5, mat("panel"), -0.1, 1.0, 0.28); panel.rotation.x = -0.55; g.add(panel, sil(0.02, 0.02, 0.7, mat("baja"), -0.1, 0.65, 0.28, 0, 0, 0, 8));
    } else g.add(kotak(b.lebar, b.tinggi, b.dalam, mat("baja")));
    g.position.set(b.x, 0, b.z); g.userData.id = b.id; g.userData.kode = kode;
    return g;
  }
  const portY = {"ST-101": 0.5, "P-101": 0.5, "P-102": 0.5, "SF-101": 0.5, "V-101": 0.5, "FT-101": 0.5, "PT-101": 0.5, "H-101": 0.8, "H-201": 0.6, "M-101": 0.45};

  const jangkar = (id, x, y, z, rata = "atas") => { jangkarAktif.push({id, v: V(x, y, z), rata}); };

  /* ====================== ADEGAN 1: SUSUNAN KIT ====================== */
  function adegSusunan() {
    const k = tataKomponen(data.p.n_lance), g = new T.Group(), komp = [], rantai = k.filter(b => b.kode_bom !== "I-101" && b.kode_bom !== "U-102"), lance = k.filter(b => b.kode_bom === "I-101");
    const maksX = Math.max(...k.map(b => b.x + b.lebar / 2)), minZ = Math.min(...k.map(b => b.z - b.dalam / 2)), maksZ = Math.max(...k.map(b => b.z + b.dalam / 2));
    const lereng = x => -1.1 * halus(1.4, -0.9, x);
    const X0 = -9, X1 = maksX + 12, Z0 = Math.min(minZ, -5) - 9, Z1 = Math.max(maksZ, 5) + 9, tepi = (x, z) => halus(0, 6, Math.min(x - X0, X1 - x, z - Z0, Z1 - z));
    const tanahY = (x, z) => lereng(x) + (reliefTanah(x * 0.9, z * 0.9) * 0.1 * halus(-1, 3, x) + reliefTanah(x * 0.2 + 4, z * 0.2) * 0.1 * halus(-2, 6, Math.abs(z))) * tepi(x, z);
    const warnaS = (x, z, y, c) => gambutWarna(c, x, z, klem(0.75 - y * 0.8 - x * 0.04, 0, 0.95) * halus(4, -1, x) + 0.05);
    const tanah = tanahMesh({x0: X0, x1: X1, z0: Z0, z1: Z1, sx: 110, sz: 56, tinggi: tanahY, warnaDi: warnaS});
    g.add(tanah, skirt(x => lereng(x), warnaS, [X0, X1, Z0, Z1], 110), airPermukaan(600, 800, -300 + 0.3, -0.45, 0));
    // tanpa papan kerja: kit portabel digelar langsung di tanah gambut (keputusan 60, tanpa instalasi tetap)
    for (const b of k) { const m = modelKomponen(b); g.add(m); komp.push(m); }
    // pipa antar-port: air melewati rantai (pompa paralel), lalu menyebar ke lance
    const polilin = [], pipaMat = mat("kaca");
    const p = id => k.find(b => b.id === id), keluar = b => V(b.x + b.lebar / 2, portY[b.kode_bom] ?? 0.5, b.z), masuk = b => V(b.x - b.lebar / 2, portY[b.kode_bom] ?? 0.5, b.z);
    const rangkai = (a, b) => polilin.push(rutePipa(a, b));
    const st = p("ST-101"), p1 = p("P-101"), p2 = p("P-102"), sf = p("SF-101");
    rangkai(keluar(st), masuk(p1)); rangkai(keluar(st), masuk(p2)); rangkai(keluar(p1), masuk(sf)); rangkai(keluar(p2), masuk(sf));
    const urut = ["SF-101", "V-101", "FT-101", "PT-101", "H-101", "H-201", "M-101"].map(p);
    for (let i = 0; i < urut.length - 1; i++) rangkai(keluar(urut[i]), masuk(urut[i + 1]));
    const mf = p("M-101"), outlets = [-0.55, -0.18, 0.18, 0.55];
    lance.forEach((b, i) => {
      const o = outlets[Math.min(3, Math.floor(i * 4 / lance.length))], a = V(mf.x + 0.65, 0.45, mf.z + o);
      polilin.push([a, V(b.x - 0.6, 0.45, a.z), V(b.x - 0.6, 1.45, b.z), V(b.x, 1.45, b.z)].filter((q, j, s) => !j || q.distanceTo(s[j - 1]) > 1e-6));
    });
    for (const pl of polilin) for (let i = 0; i < pl.length - 1; i++) { g.add(antara(pl[i], pl[i + 1], 0.1, pipaMat, 10)); if (i) g.add(taruh(new T.Mesh(new T.SphereGeometry(0.1, 10, 8), pipaMat), pl[i].x, pl[i].y, pl[i].z)); }
    // aliran
    const aliran = buatAliran(polilin, 0.5, 0.16, 0xe8f7ff); g.add(aliran.obj);
    const kecAliran = 0.9 + data.hasil.v_ms * 0.55;
    // pepohonan tepi
    g.add(pepohonan(46, r => { const s = r() < 0.5 ? -1 : 1; return [1 + r() * (X1 - 3), s * (9 + r() * (Z1 - 9))]; }, tanahY, 0.6, 21));
    // jangkar label
    jangkar("sumber", st.x - 0.5, 0.3, 0, "kiri"); jangkar("pompa", p1.x, 1.95, (p1.z + p2.z) / 2); jangkar("selang", p("H-101").x, 1.75, 0);
    jangkar("manifold", mf.x, 0.3, 1.2, "bawah"); jangkar("lance", lance[0].x, 2.4, lance[0].z + (lance.at(-1).z - lance[0].z) / 2);
    // penanda terpilih: bingkai rusuk dan cincin di lantai
    const penanda = new T.Group(); penanda.visible = false; g.add(penanda);
    const pilihTanda = () => {
      const old = penanda.children.slice(); penanda.clear(); old.forEach(bebaskan);
      const b = k.find(x => x.id === pilihId); penanda.visible = !!b; if (!b) return;
      const samaKode = k.filter(x => x.kode_bom === b.kode_bom);
      for (const s of samaKode) {
        const tinggi = Math.max(s.tinggi, 1.4) + (s.kode_bom === "I-101" ? 0.6 : 0.1), e = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(s.lebar + 0.2, tinggi, s.dalam + 0.2)), new T.LineBasicMaterial({color: warna["--bad"], transparent: true, opacity: 0.95}));
        e.position.set(s.x, tinggi / 2 - 0.02, s.z);
        const dasar = new T.Mesh(new T.PlaneGeometry(s.lebar + 0.5, s.dalam + 0.5), new T.MeshBasicMaterial({color: warna["--bad"], transparent: true, opacity: 0.22, depthWrite: false})); dasar.rotation.x = -Math.PI / 2; dasar.position.set(s.x, 0.095, s.z);
        penanda.add(e, dasar);
      }
    };
    pilihTanda();
    const bing = {pusat: [(maksX - 0.6) / 2, 0.6, 0], setengah: [(maksX + 3.5) / 2, 1.5, Math.max(maksZ, 3) + 0.8]};
    onLabel("skala", "Tata letak ilustrasi, kotak komponen sesuai ukuran BOM");
    pembaruan = (menit, detik) => { aliran.tulis(detik, kecAliran); tekstur("air").offset.x = -detik * 0.012; };
    return {g, bing, mPerUnit: 1, komp, pilihTanda, tanahY};
  }

  /* ====================== ADEGAN 2: JALUR AIR ====================== */
  function adegJalur() {
    const {hasil, p, kompleks} = data, tj = titikJalur(p, hasil, kompleks), esk = tj.esk, Lx = SKALA_JALUR, g = new T.Group(), seg = profilWarna(hasil);
    const ik = 2.1, y0 = tj.tinggiDi(0), y1 = tj.tinggiDi(tj.L), KX = -12;
    const kanalX = z => KX + Math.sin(z * 0.23) * 1.3;
    const panas = [[Lx + 6.5, -4.2], [Lx + 8.5, 0.5], [Lx + 6, 4.6]];
    const bebas = (x, z) => halus(1.4, 4.2, Math.abs(z)) * halus(5, 13, Math.hypot(x - (Lx + 3), z * 0.8)) * halus(-6, 4, x);
    const X0 = -26, X1 = Lx + 22, Z0 = -34, Z1 = 34, tepi = (x, z) => halus(0, 8, Math.min(x - X0, X1 - x, z - Z0, Z1 - z));
    const dasar = (x, z) => {
      const b = tj.tinggiDi(klem(x / esk, 0, tj.L));
      return b - 1.6 * (1 - halus(2.2, 4.8, Math.abs(x - kanalX(z))));
    };
    const tanahY = (x, z) => dasar(x, z) + (reliefTanah(x * 0.55, z * 0.55) * 0.3 + reliefTanah(x * 0.17 + 2, z * 0.2) * 0.55) * bebas(x, z) * tepi(x, z);
    const warnaJ = (x, z, y, c) => {
      const dk = Math.abs(x - kanalX(z)), basah = Math.max(Math.exp(-dk / 5.5), halus(0.1, 0.6, reliefTanah(x * 0.13, z * 0.17 + 4)) * 0.35);
      let arang = 0; for (const [hx, hz] of panas) arang = Math.max(arang, Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / 6));
      gambutWarna(c, x, z, basah, arang, 1);
    };
    const tanah = tanahMesh({x0: X0, x1: X1, z0: Z0, z1: Z1, sx: 220, sz: 110, tinggi: tanahY, warnaDi: warnaJ});
    g.add(tanah, skirt(dasar, warnaJ, [X0, X1, Z0, Z1], 220), airPermukaan(16, 900, KX, y0 - 0.55, 0));
    g.add(pepohonan(130, r => { const x = X0 + 3 + r() * (X1 - X0 - 6), s = r() < 0.5 ? -1 : 1, z = s * (6.5 + r() * 10); return [Math.max(x, KX + 6), z]; }, tanahY, 1.3, 33));
    // stasiun pompa: dua pompa, selang hisap ke kanal, header buang
    const stasiun = new T.Group(); stasiun.position.set(-3.6, y0, 0); stasiun.scale.setScalar(ik); g.add(stasiun);
    for (const z of [-0.95, 0.95]) { const m = modelPompa(); m.position.z = z; stasiun.add(m); }
        for (const z of [-0.95, 0.95]) { const ujung = V(KX + 2.4, y0 - 0.75, z * ik * 0.6); g.add(antara(V(-3.6 - 0.9 * ik, y0 + 0.5 * ik, z * ik), ujung, 0.16 * ik / 1.6, mat("selangHisap"))); g.add(sil(0.3, 0.3, 0.5, mat("lubang"), ujung.x - 0.2, ujung.y - 0.05, ujung.z, 0, 0, Math.PI / 2, 12)); }
    const keluarPompa = z => V(-3.6 + 0.9 * ik, y0 + 0.5 * ik, z * ik);
    const rSelang = 0.3 + (p.dn_mm / 100) * 0.1, mSel = std(0xffffff, {roughness: 0.55, vertexColors: true});
    g.add(antara(keluarPompa(-0.95), V(-0.6, y0 + 0.5 * ik, 0), 0.2, mat("baja")), antara(keluarPompa(0.95), V(-0.6, y0 + 0.5 * ik, 0), 0.2, mat("baja")), antara(V(-0.6, y0 + 0.5 * ik, 0), V(0, y0 + rSelang, 0), 0.24, mat("baja")));
    // selang layflat: tabung halus mengikuti profil elevasi; warna per segmen 50 m = skala tekanan
    const titikS = [...seg.map(s => s.x0), seg.at(-1).x1];
    const kurva = new T.CatmullRomCurve3(titikS.map(xm => V(xm * esk, tj.tinggiDi(xm) + rSelang, 0)), false, "centripetal");
    const nSeg = seg.length, perSeg = 4, sel = new T.Mesh(new T.TubeGeometry(kurva, nSeg * perSeg, rSelang, 12, false), mSel);
    const cols = new Float32Array(sel.geometry.attributes.position.count * 3), palet = SKALA_TEKANAN.map(s => new T.Color(warna[s.token])), baris = 13;
    const kosongC = new T.Color(0x737a84), tmpC = new T.Color(), warnaCincin = (i, isi) => { const c = palet[seg[Math.min(nSeg - 1, Math.floor(i / perSeg))].kelas]; tmpC.copy(c); if (!isi) tmpC.lerp(kosongC, 0.72); for (let j = 0; j < baris; j++) tmpC.toArray(cols, (i * baris + j) * 3); };
    for (let i = 0; i <= nSeg * perSeg; i++) warnaCincin(i, true);
    let isiLama = nSeg * perSeg;   // cincin tabung sampai indeks ini berisi air (berwarna tekanan), sesudahnya selang masih kosong (abu-abu)
    sel.geometry.setAttribute("color", new T.BufferAttribute(cols, 3)); sel.castShadow = true; sel.receiveShadow = true; g.add(sel);
    // sambungan per 100 m (satu gulung) dan penanda merah berbentuk berbeda
    const nS = Math.max(0, Math.ceil(tj.L / 100) - 1);
    if (nS) {
      const im = new T.InstancedMesh(new T.TorusGeometry(rSelang * 1.18, rSelang * 0.26, 8, 16), mat("bajaGelap"), nS), m4 = new T.Matrix4(), qq = new T.Quaternion();
      for (let i = 0; i < nS; i++) { const xm = (i + 1) * 100, a = tj.pos(xm - 1), b = tj.pos(xm + 1), tg = V(b[0] - a[0], b[1] - a[1], 0).normalize(), q = qq.setFromUnitVectors(V(0, 0, 1), tg), pp = tj.pos(xm); m4.compose(V(pp[0], pp[1] + rSelang, 0), q, V(1, 1, 1)); im.setMatrixAt(i, m4); }
      im.castShadow = true; g.add(im);
    }
    const merah = []; seg.forEach((s, i) => { if (s.merah && !(i && seg[i - 1].merah)) { const m = tj.pos((s.x0 + s.x1) / 2); merah.push(V(m[0], m[1] + rSelang + 0.9, 0)); } });
    if (merah.length) { const pen = new T.InstancedMesh(new T.OctahedronGeometry(0.36), new T.MeshBasicMaterial({color: warna["--bad"]}), merah.length), m4 = new T.Matrix4(); merah.forEach((v, i) => { m4.makeTranslation(v.x, v.y, v.z); pen.setMatrixAt(i, m4); }); g.add(pen); }
    // manifold dan lance di ujung, sebar menurut n_lance
    const n = p.n_lance, sLn = Math.min(1.15, 11 / Math.max(n, 1)), xm = Lx + 1.0, lebarM = (n - 1) * sLn + 1.2, yM = y1 + 1.5;
    g.add(sil(0.2, 0.2, lebarM, mat("baja"), xm, yM, 0, Math.PI / 2, 0, 0, 14), sil(0.2, 0.2, 1.3, mat("baja"), xm - 0.65, yM, 0, 0, 0, Math.PI / 2, 14), antara(V(Lx, y1 + rSelang, 0), V(xm - 1.2, yM, 0), 0.24, mat("baja")));
    const halo = [], laju = [];
    for (let i = 0; i < n; i++) {
      const z = (i - (n - 1) / 2) * sLn;
      g.add(sil(0.07, 0.07, yM - y1 + 0.5, mat("lance"), xm, (yM + y1 - 0.5) / 2, z, 0, 0, 0, 8), sil(0.0, 0.1, 0.35, mat("lance"), xm, y1 - 0.65, z, 0, 0, 0, 8), bola(0.15, mat("bajaGelap"), xm, y1 + 0.5, z), kotak(0.4, 0.05, 0.07, mat("roda"), xm + 0.15, y1 + 0.62, z));
      const h = new T.Mesh(new T.CircleGeometry(1, 28), new T.MeshBasicMaterial({color: 0x1a3a4a, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2})); h.rotation.x = -Math.PI / 2; h.position.set(xm, y1 + 0.05, z); h.scale.setScalar(0.01); g.add(h); halo.push(h);
    }
    // titik panas: bara berpendar, asap naik
    const bara = [], asap = [];
    panas.forEach(([hx, hz], i) => {
      const d = new T.Mesh(new T.CircleGeometry(2.5 - i * 0.3, 24), new T.MeshBasicMaterial({color: 0xff6a1f, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3})); d.rotation.x = -Math.PI / 2; d.position.set(hx, tanahY(hx, hz) + 0.06, hz); g.add(d); bara.push(d);
      const ps = new Float32Array(26 * 3), gg = new T.BufferGeometry(); gg.setAttribute("position", new T.BufferAttribute(ps, 3));
      const as = new T.Points(gg, new T.PointsMaterial({color: gelap() ? 0x9aa2ad : 0x8d9096, size: 7, map: tekstur("asap"), transparent: true, opacity: 0.55, depthWrite: false})); as.frustumCulled = false; g.add(as); asap.push({ps, gg, as, hx, hz, y: tanahY(hx, hz)});
    });
    const faseA = Float32Array.from({length: 26}, () => Math.random());
    // garis acuan beda elevasi
    if (Math.abs(tj.dzTotal) > 1e-9) {
      const zr = 9, xr = Lx + 3;
      g.add(garisBantu([V(-1, y0 + 0.05, zr), V(xr, y0 + 0.05, zr)], warna["--ink2"], 0.65, true), garisBantu([V(xr, y0 + 0.05, zr), V(xr, y1 + 0.05, zr)], warna["--ink"], 0.9));
      jangkar("dz", xr, (y0 + y1) / 2 + 0.05, zr, "kanan");
    }
    // aliran searah selang; kepala air
    const pts = kurva.getSpacedPoints(360).map(q => q.clone().add(V(0, rSelang * 0.95, 0))), aliran = buatAliran([pts], 0.8, 0.95, 0xf3fbff), kepala = new T.Mesh(new T.SphereGeometry(rSelang * 1.7, 18, 12), new T.MeshBasicMaterial({color: 0xcff4ff})), cahayaK = new T.Mesh(new T.SphereGeometry(rSelang * 3.2, 18, 12), new T.MeshBasicMaterial({color: 0x7fd4ff, transparent: true, opacity: 0.28, depthWrite: false})); kepala.add(cahayaK); g.add(aliran.obj, kepala);
    const kecJalan = (0.18 + Math.min(hasil.v_ms, 4) * 0.05) * Lx, tiba = Math.max(hasil.t_tiba_menit, 0.1), rMaks = frontBasah(SEGMEN_MAKS_ANIMASI * 60, KONST.serap_lance_lpm / 60, LUBANG_M);
    jangkar("sumber", KX + 1, y0 + 0.4, 3); jangkar("pompa", -3.6, y0 + 1.5 * ik + 0.6, 0);
    const mid = tj.pos(tj.L * 0.5); jangkar("selang", mid[0], mid[1] + rSelang + 1.6, 0); jangkar("manifold", xm - 0.3, yM + 0.2, 0, "kiri"); jangkar("panas", Lx + 7.2, y1 + 3.2, 0);
    const bing = {pusat: [(Lx + 1) / 2 - 1.5, (Math.min(y0, y1) + Math.max(y0, y1)) / 2 + 1.2, 1], setengah: [(Lx + 27) / 2, Math.abs(y1 - y0) / 2 + 3.6, 10]};
    const noteY = tj.lebihY < 1 ? `Skala tegak diperkecil jadi ${tampil(Math.round(tj.lebihY * 100) / 100)} kali` : `Skala tegak dilebihkan ${tampil(Math.round(tj.lebihY))} kali`;
    onLabel("skala", `Panjang trase sesuai skala, ikon komponen diperbesar. ${noteY}`);
    pembaruan = (menit, detik) => {
      const muka = klem(menit / tiba, 0, 1), f = klem(frontBasah(Math.max(0, menit - tiba) * 60, KONST.serap_lance_lpm / 60, LUBANG_M) / rMaks, 0, 1);
      aliran.tulis(detik, kecJalan, muka);
      const iBaru = Math.floor(muka * nSeg * perSeg + 1e-9);
      if (iBaru !== isiLama) { const a = Math.min(iBaru, isiLama), b = Math.max(iBaru, isiLama); for (let i = a; i <= b; i++) warnaCincin(i, i <= iBaru); isiLama = iBaru; sel.geometry.attributes.color.needsUpdate = true; }
      const kp = kurva.getPointAt(muka); kepala.position.copy(kp); kepala.visible = muka < 1 && muka > 0.002;
      halo.forEach(h => { const r = 0.25 + f * 0.95; h.scale.setScalar(r); h.material.opacity = 0.2 + 0.4 * muka * (menit >= tiba ? 1 : 0); h.visible = menit >= tiba; });
      const api = 1 - f * 0.92, kedip = 0.85 + 0.15 * Math.sin(detik * 9);
      bara.forEach((d, i) => { d.material.opacity = api * kedip * 0.9; d.visible = api > 0.06; d.scale.setScalar(0.4 + 0.6 * api); });
      asap.forEach((a, i) => {
        for (let j = 0; j < 26; j++) { const u = (faseA[j] + detik * 0.07 * (1 + (j % 3) * 0.3)) % 1; a.ps[j * 3] = a.hx + Math.sin(j * 1.7 + u * 3) * (0.8 + u * 2.4); a.ps[j * 3 + 1] = a.y + 0.6 + u * 9; a.ps[j * 3 + 2] = a.hz + Math.cos(j * 2.3 + u * 2.6) * (0.8 + u * 1.8); }
        a.gg.attributes.position.needsUpdate = true; a.as.material.opacity = 0.55 * api; a.as.visible = api > 0.06;
      });
      tekstur("air").offset.x = -detik * 0.02;
      const l = menit >= tiba ? `t = ${tampil(Math.floor(menit))} menit, air sudah tiba (${tampil(tiba)} menit)` : `t = ${tampil(Math.floor(menit))} menit dari ${tampil(tiba)} menit sampai air tiba`;
      if (l !== labelLama) { labelLama = l; onLabel("anim", l); }
    };
    return {g, bing, mPerUnit: 1 / esk, komp: [], tanahY};
  }
  let labelLama = "";

  /* ====================== ADEGAN 3: INJEKSI (penampang) ====================== */
  function adegInjeksi() {
    const {p} = data, g = new T.Group(), n = p.n_lance, D = kedalamanPenampang(p.dalam_m), W = lebarPenampang(n), ZB = 3.2, pusatY = -pusatBulb(p.dalam_m);
    const Q = KONST.serap_lance_lpm / 60;
    // lapisan gambut: sisi depan (+z) terbuka menghadap kamera
    const lapisanDef = [[0, 0.35, 0xf0dfc0, "kering"], [0.35, 1.0, 0xd6c5a4, "lembap"], [1.0, D, 0x9aa7b5, "jenuh"]];
    const peta = tekstur("gambut"); peta.repeat.set(Math.max(2, W / 2.4), 1);
    lapisanDef.forEach(([a, b, hex]) => {
      const tinggi = b - a, boks = new T.Mesh(new T.BoxGeometry(W, tinggi, ZB), [0, 1, 2, 3, 4, 5].map(i => new T.MeshStandardMaterial({color: hex, map: i === 4 ? peta : null, roughness: 1})));
      boks.position.set(0, -(a + b) / 2, -ZB / 2); boks.castShadow = boks.receiveShadow = true; g.add(boks);
    });
    // permukaan: tutupan arang dan lumut tipis
    const atas = new T.Mesh(new T.PlaneGeometry(W, ZB, 1, 1), new T.MeshStandardMaterial({color: 0x4b4137, roughness: 1})); atas.rotation.x = -Math.PI / 2; atas.position.set(0, 0.004, -ZB / 2); atas.receiveShadow = true; g.add(atas);
    // zona bara: pita berpendar di 0,3 sampai 0,5 m
    const bara = new T.Mesh(new T.BoxGeometry(W + 0.02, 0.18, 0.04), new T.MeshBasicMaterial({color: 0xff7425, transparent: true, opacity: 0.95})); bara.position.set(0, -0.42, 0.02); g.add(bara);
    // muka air tanah
    const air = new T.Mesh(new T.PlaneGeometry(W, 0.03), new T.MeshBasicMaterial({color: 0x59b4e0, transparent: true, opacity: 0.95})); air.position.set(0, -1.0, 0.025); g.add(air);
    // zona injeksi 0 sampai dalam_m: pita tembus pandang di muka penampang
    if (p.dalam_m > 0) { const zona = new T.Mesh(new T.PlaneGeometry(W, p.dalam_m), new T.MeshBasicMaterial({color: warna["--info"], transparent: true, opacity: 0.1, depthWrite: false})); zona.position.set(0, -p.dalam_m / 2, 0.012); g.add(zona); }
    // penggaris kedalaman di tepi kiri: tanda tiap 0,5 m
    const xr = -W / 2 - 0.18, tiang = kotak(0.05, D, 0.05, mat("baja"), xr, -D / 2, 0.05); g.add(tiang);
    for (let d = 0; d <= D + 1e-9; d += 0.5) g.add(kotak(Math.abs(d % 1) < 1e-9 ? 0.4 : 0.22, 0.025, 0.05, mat("baja"), xr + (Math.abs(d % 1) < 1e-9 ? 0.18 : 0.09), -d, 0.05));
    // lance: batang di bidang potong, ujung berlubang 0,5 m, selang dan manifold di atas tanah
    const kolomX = i => (i - (n - 1) / 2) * JARAK_LANCE_M, yUjung = -p.dalam_m, yTop = 1.55;
    for (let i = 0; i < n; i++) {
      const x = kolomX(i), panjang = yTop - yUjung;
      g.add(sil(0.045, 0.045, panjang - LUBANG_M, mat("lance"), x, yTop - (panjang - LUBANG_M) / 2, 0, 0, 0, 0, 10), sil(0.058, 0.058, LUBANG_M, mat("lubang"), x, yUjung + LUBANG_M / 2, 0, 0, 0, 0, 10), sil(0, 0.058, 0.14, mat("lubang"), x, yUjung - 0.07, 0, 0, 0, 0, 10));
      for (let k = 0; k < 5; k++) g.add(sil(0.012, 0.012, 0.13, mat("karet"), x, yUjung + 0.08 + k * 0.1, 0.058, Math.PI / 2, 0, 0, 6));
      g.add(bola(0.1, mat("bajaGelap"), x, 0.75, 0), kotak(0.3, 0.035, 0.05, mat("roda"), x + 0.11, 0.84, 0));
      g.add(antara(V(x, yTop, 0), V(x, yTop + 0.25, 0), 0.05, mat("baja"), 8));
    }
    g.add(sil(0.09, 0.09, W - 0.6, mat("baja"), 0, yTop + 0.3, 0, 0, 0, Math.PI / 2, 14));
    g.add(sil(0.1, 0.1, 0.9, mat("baja"), -(W - 0.6) / 2 - 0.35, yTop + 0.3, 0, 0, 0, Math.PI / 2, 14));
    // bola basah: setengah bola di belakang bidang potong ditambah cakram penampang; dipotong di tanah dan dasar blok
    const klip = [new T.Plane(V(0, -1, 0), 0), new T.Plane(V(0, 1, 0), D)], basahMat = new T.MeshStandardMaterial({color: warna["--info"], transparent: true, opacity: 0.2, roughness: 0.2, metalness: 0, clippingPlanes: klip, depthWrite: false, side: T.DoubleSide});
    const capMat = new T.MeshBasicMaterial({color: warna["--info"], transparent: true, opacity: 0.42, clippingPlanes: klip, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4});
    renderer.localClippingEnabled = true;
    const bulbs = [];
    for (let i = 0; i < n; i++) {
      const grp = new T.Group(); grp.position.set(kolomX(i), pusatY, 0);
      const cap = new T.Mesh(new T.CircleGeometry(1, 40), capMat); cap.position.z = 0.008; grp.add(new T.Mesh(new T.SphereGeometry(1, 28, 16, 0, Math.PI), basahMat), cap);
      grp.scale.setScalar(0.01); g.add(grp); bulbs.push(grp);
    }
    // probe kelembapan: empat kedalaman, merah kering ke biru basah
    const probe = [0.1, 0.3, 0.5, 1.0].map(d => { const m = new T.Mesh(new T.SphereGeometry(0.07, 12, 8), new T.MeshBasicMaterial({color: 0xd84a3a})); m.position.set(kolomX(Math.floor((n - 1) / 2)) + JARAK_LANCE_M / 2, -d, 0.1); g.add(m); return m; });
    const merahC = new T.Color(0xd84a3a), biruC = new T.Color(0x3aa6e8);
    // asap dan bara tipis di atas tanah
    const nA = 70, ps = new Float32Array(nA * 3), gg = new T.BufferGeometry(); gg.setAttribute("position", new T.BufferAttribute(ps, 3));
    const as = new T.Points(gg, new T.PointsMaterial({color: gelap() ? 0x9aa2ad : 0x8d9096, size: 0.55, map: tekstur("asap"), transparent: true, opacity: 0.5, depthWrite: false})); as.frustumCulled = false; g.add(as);
    const fase = Float32Array.from({length: nA}, () => Math.random()), geser = Float32Array.from({length: nA}, () => Math.random() * 6.28);
    const rMaks = frontBasah(SEGMEN_MAKS_ANIMASI * 60, Q, LUBANG_M);
    jangkar("lance", kolomX(0), 1.2, 0.05); jangkar("zona", kolomX(1), -D, 0.05, "bawah"); tandaKedalaman(p.dalam_m).forEach((d, i) => jangkar(`d${i}`, -W / 2 - 0.3, -d, 0.05, "kiri")); jangkar("air", W / 2 + 0.25, -1.0, 0.05, "kanan"); jangkar("bara", W / 2 + 0.25, -0.42, 0.05, "kanan");
    jangkar("bulb", kolomX(Math.floor(n / 2)), pusatY - 0.3, 0.05, "bawah");
    const bing = {pusat: [0.55, (1.9 - D) / 2 - 0.1, -0.6], setengah: [W / 2 + 1.6, (D + 1.9) / 2, 1.8]};
    onLabel("skala", "");
    pembaruan = (menit, detik) => {
      const r = Math.max(frontBasah(menit * 60, Q, LUBANG_M), 1e-3), f = klem(r / rMaks, 0, 1);
      bulbs.forEach(b => b.scale.setScalar(r));
      for (const m of probe) { const d = Math.hypot(m.position.x - bulbs[Math.floor((n - 1) / 2)].position.x, m.position.y - pusatY, m.position.z); m.material.color.copy(d < r ? biruC : merahC); }
      bara.material.opacity = 0.95 - f * 0.55; bara.material.color.setHex(f > 0.6 ? 0xc7552a : 0xff7425);
      for (let j = 0; j < nA; j++) { const u = (fase[j] + detik * 0.1) % 1; ps[j * 3] = (fase[j] - 0.5) * (W - 0.6) + Math.sin(geser[j] + u * 3) * 0.3; ps[j * 3 + 1] = 0.1 + u * 2.2; ps[j * 3 + 2] = -0.5 - (fase[(j * 7) % nA]) * 1.6; }
      gg.attributes.position.needsUpdate = true; as.material.opacity = 0.5 * (1 - f * 0.85); as.visible = f < 0.95;
      const l = `t = ${tampil(Math.floor(menit))} menit, jari-jari muka basah ${tampil(Math.round(r * 10) / 10)} m per lance (ilustrasi)`; if (l !== labelLama) { labelLama = l; onLabel("anim", l); }
      const e = etiket.get("bulb"); if (e) { const s = `${tampil(Math.round(r * 10) / 10)} m, t = ${tampil(Math.floor(menit))} menit`; if (e.nilai.textContent !== s) e.nilai.textContent = s; }
    };
    return {g, bing, mPerUnit: 1, komp: [], tanahY: () => 0};
  }

  /* ---- label melayang dan batang skala ---- */
  function buatLabel(daftar) {
    for (const e of etiket.values()) e.el.remove(); etiket.clear();
    for (const d of daftar) {
      if (!jangkarAktif.some(j => j.id === d.id)) continue;
      const el = document.createElement("div"); const ja = jangkarAktif.find(j => j.id === d.id); el.className = `sa-etiket sa-e-${d.id} sa-r-${ja.rata}${/^d\d+$/.test(d.id) ? " sa-kecil" : ""}`; const judul = document.createElement("b"), nilai = document.createElement("span");
      judul.textContent = d.judul; nilai.textContent = d.nilai; el.append(judul, nilai); lapis.append(el); etiket.set(d.id, {el, judul, nilai, v: ja.v});
    }
  }
  function posisiLabel() {
    for (const e of etiket.values()) {
      tmpV.copy(e.v).project(kamera);
      const tampilkan = tmpV.z < 1 && tmpV.z > -1 && Math.abs(tmpV.x) < 1.05 && Math.abs(tmpV.y) < 1.05;
      if (tampilkan !== !e.el.hidden) e.el.hidden = !tampilkan;
      if (tampilkan) e.el.style.transform = `translate(${Math.round((tmpV.x * 0.5 + 0.5) * lebarPx)}px,${Math.round((-tmpV.y * 0.5 + 0.5) * tinggiPx)}px)`;
    }
    const dist = kamera.position.distanceTo(kontrol.target), pxPerUnit = tinggiPx / (2 * dist * Math.tan(kamera.fov * Math.PI / 360)), b = batangSkala(mPerUnit / pxPerUnit, Math.min(180, lebarPx * 0.3));
    if (b) { const kunci = `${b.meter}`; if (kunci !== skalaLama) { skalaLama = kunci; batangTeks.textContent = teksJarak(b.meter); } batangGaris.style.width = `${Math.round(b.piksel)}px`; }
  }

  /* ---- siklus gambar ---- */
  const minta = () => { if (!rafId && !mati) rafId = requestAnimationFrame(tik); };
  function tik(ts) {
    rafId = 0; if (mati) return;
    const mentah = tTerakhir ? ts - tTerakhir : 0, dt = Math.min(0.1, mentah / 1000); tTerakhir = ts;
    if (mentah && animasiOn && !tanpaBayangan && ++nFrame > 4) { emaFrame = emaFrame ? emaFrame * 0.85 + mentah * 0.15 : mentah; if (nFrame > 16 && emaFrame > 90) { tanpaBayangan = true; renderer.shadowMap.enabled = false; matahari.castShadow = false; bangun(false); } }
    let lanjut = false;
    if (tween) {
      const u = (ts - tween.t0) / tween.dur, e = easeKeluar(u);
      kamera.position.lerpVectors(tween.dariPos, tween.kePos, e); kontrol.target.lerpVectors(tween.dariTarget, tween.keTarget, e); kontrol.update();
      if (u >= 1) tween = null; else lanjut = true;
    }
    const r = bangunan?.rentang;
    if (animasiOn && terlihat && pembaruan) { tSim = majuWaktu(tSim, dt, kec, r?.maks || 0); tDet += dt * kec; lanjut = true; perluGambar = true; }
    if (pembaruan && perluGambar) {
      const m = waktuTampil(tSim, r?.maks || 0); pembaruan(m, tDet);
      const menitBulat = Math.floor(m); if (menitBulat !== menitTerakhir) { menitTerakhir = menitBulat; onWaktu(m, r?.maks || 0); }
    }
    perluGambar = false;
    renderer.render(scene, kamera); posisiLabel();
    if (lanjut) minta(); else tTerakhir = 0;
  }
  const ukur = () => {
    lebarPx = Math.max(2, wadah.clientWidth); tinggiPx = Math.max(2, wadah.clientHeight);
    renderer.setSize(lebarPx, tinggiPx, false); kamera.aspect = lebarPx / tinggiPx; kamera.updateProjectionMatrix(); perluGambar = true; minta();
  };
  const pengamat = new ResizeObserver(() => ukur()); pengamat.observe(wadah);
  const lihat = new IntersectionObserver(es => { terlihat = es[0].isIntersecting; if (terlihat) { tTerakhir = 0; minta(); } }); lihat.observe(wadah);
  dengar(kontrol, "change", () => { perluGambar = true; minta(); });
  const temaAmat = new MutationObserver(() => { atasTema(); bacaWarna(); bangun(false); });
  temaAmat.observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
  dengar(reduksi, "change", () => { animasiOn = !reduksi.matches && animasiOn; perluGambar = true; minta(); });

  /* ---- bangun ulang adegan ---- */
  function bangun(resetKamera) {
    if (mati || !data) return;
    if (grup) { scene.remove(grup); bebaskan(grup); grup = null; }
    for (const m of mats.values()) m.dispose(); mats.clear();
    jangkarAktif.length = 0; labelLama = ""; pembaruan = null; menitTerakhir = -1;
    const mulaiMode = bangunan?.mode !== adegan;
    let r;
    try { r = adegan === "susunan" ? adegSusunan() : adegan === "jalur" ? adegJalur() : adegInjeksi(); } catch (e) { console.error(e); return; }
    r.mode = adegan; r.rentang = rentangWaktu(adegan, data.hasil); bangunan = r; grup = r.g; scene.add(grup); mPerUnit = r.mPerUnit;
    if (mulaiMode) tSim = animasiOn ? 0 : waktuStatis(adegan, r.rentang); else tSim = Math.min(tSim, r.rentang.ada ? r.rentang.maks + 3 : 3600);
    buatLabel(labelAdegan(adegan, data.hasil, data.p));
    if (adegan === "susunan") onLabel("anim", "");
    const rr = r.bing, R = Math.hypot(...rr.setengah);
    matahari.position.set(rr.pusat[0] + R * 0.55, rr.pusat[1] + R * 0.9, rr.pusat[2] + R * 0.7); matahari.target.position.set(...rr.pusat); matahari.target.updateMatrixWorld();
    Object.assign(matahari.shadow.camera, {left: -R * 1.05, right: R * 1.05, top: R * 1.05, bottom: -R * 1.05, near: 0.5, far: R * 5}); matahari.shadow.camera.updateProjectionMatrix();
    scene.fog.density = 1.3 / (R * 9);
    if (resetKamera || !kamera.userData.sudah) { aturUlang(kamera.userData.sudah && !reduksi.matches); kamera.userData.sudah = true; }
    perluGambar = true; minta();
  }
  /* bingkai kamera menurut adegan; animasi = geser halus dari pose sekarang (dimatikan pada reduced motion) */
  function aturUlang(animasi = false) {
    if (!bangunan) return;
    const K = kameraMode(adegan, bangunan.bing, kamera.aspect, kamera.fov);
    kontrol.minDistance = K.minJarak; kontrol.maxDistance = K.maksJarak; kontrol.minAzimuthAngle = K.azimut ? -K.azimut : -Infinity; kontrol.maxAzimuthAngle = K.azimut || Infinity;
    kamera.near = Math.max(0.05, K.jarak / 400); kamera.far = Math.max(2000, K.jarak * 12); kamera.updateProjectionMatrix();
    const kePos = V(...K.posisi), keTarget = V(...K.target);
    if (animasi && !reduksi.matches) tween = {t0: performance.now(), dur: 650, dariPos: kamera.position.clone(), dariTarget: kontrol.target.clone(), kePos, keTarget};
    else { tween = null; kamera.position.copy(kePos); kontrol.target.copy(keTarget); kontrol.update(); }
    perluGambar = true; minta();
  }

  /* pilih komponen: klik tanpa geser (selisih di bawah 5 px) pada kanvas */
  const sinar = new T.Raycaster(), p2 = new T.Vector2();
  let turun = null;
  dengar(renderer.domElement, "pointerdown", e => { turun = [e.clientX, e.clientY]; });
  dengar(renderer.domElement, "pointerup", e => {
    if (!turun || adegan !== "susunan" || Math.hypot(e.clientX - turun[0], e.clientY - turun[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    p2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    sinar.setFromCamera(p2, kamera);
    const hit = sinar.intersectObjects(bangunan?.komp || [], true)[0];
    if (hit) { let o = hit.object; while (o && !o.userData.id) o = o.parent; if (o) onPilih(o.userData.id); }
  });

  atasTema(); bacaWarna(); ukur();
  return {
    webgl: true,
    atur(a, d) { const ganti = a !== adegan; adegan = a; data = d; bangun(ganti); },
    kamera(aksi) {
      if (aksi === "reset") return aturUlang(true);
      tween = null;
      const o = kamera.position.clone().sub(kontrol.target);
      if (aksi === "kiri" || aksi === "kanan") o.applyAxisAngle(V(0, 1, 0), aksi === "kiri" ? 0.3 : -0.3);
      else o.multiplyScalar(aksi === "dekat" ? 0.82 : 1.22);
      kamera.position.copy(kontrol.target).add(o); kontrol.update(); perluGambar = true; minta();
    },
    animasi(aktif) { animasiOn = aktif; tTerakhir = 0; perluGambar = true; minta(); },
    kecepatan(k) { kec = KECEPATAN.includes(k) ? k : 1; },
    cari(menit) { const r = bangunan?.rentang; if (!r?.ada) return; tSim = klem(menit, 0, r.maks); perluGambar = true; minta(); },
    pilih(id) { pilihId = id; bangunan?.pilihTanda?.(); perluGambar = true; minta(); },
    lepas() {
      mati = true; cancelAnimationFrame(rafId); pengamat.disconnect(); lihat.disconnect(); temaAmat.disconnect();
      tangan.forEach(f => f()); kontrol.dispose();
      if (grup) { scene.remove(grup); bebaskan(grup); grup = null; }
      for (const m of mats.values()) m.dispose(); mats.clear();
      bebaskan(langit); for (const t of Object.values(teks)) t.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); lapis.remove(); batang.remove();
    }
  };

  /* ---- tanpa WebGL ---- */
  function fallback() {
    const pita = document.createElement("p"); pita.className = "ad-spanduk"; pita.setAttribute("role", "status");
    pita.textContent = "Peramban ini tidak mendukung WebGL. Diagram 2D di bawah memuat angka yang sama.";
    const diagram = document.createElement("div"), isi = document.createElement("div"); diagram.className = "sa-diagram";
    diagram.append(pita, isi); wadah.replaceChildren(diagram);
    const gambar = () => {
      if (mati || !data) return;
      /* svg dibuat dari konstanta dan angka hasil hitung, bukan teks data bebas */
      isi.innerHTML = adegan === "susunan" ? svgSusunan(tataKomponen(data.p.n_lance)) : adegan === "jalur" ? svgJalur(data.hasil) : svgInjeksi(data.p);
      onLabel("anim", ""); onLabel("skala", "");
    };
    return {webgl: false, atur(a, d) { adegan = a; data = d; gambar(); }, kamera() {}, animasi() {}, kecepatan() {}, cari() {}, pilih(id) { pilihId = id; }, lepas() { mati = true; wadah.replaceChildren(); }};
  }
}
