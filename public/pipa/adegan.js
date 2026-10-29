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

/* ====================== 2. RUNTIME PERAMBAN ====================== */

const SELISIH_DZ_M = 0.05;      // Δz di kontrol (dibulatkan 0,1 m) dianggap sama dengan profil kompleks bila selisihnya di bawah ini
const LEBAR_JALUR = 40;       // satuan adegan untuk panjang trase
const SEGMEN_MAKS_ANIMASI = 30;   // satu detik layar = satu menit nyata: simulasi 30 menit lalu ulang
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

/* buatAdegan(wadah, {onPilih}): memuat three malas, membuat kanvas di dalam wadah. Mengembalikan
   {webgl, atur(adegan, data), kamera(aksi), animasi(aktif), pilih(id), lepas()}. data = {hasil, p, kompleks}. Tanpa WebGL: SVG 2D dan webgl=false. */
export async function buatAdegan(wadah, {onPilih = () => {}, onLabel = () => {}, animasiAwal = true} = {}) {
  let THREE = null, OrbitControls = null;
  if (adaWebGL()) {
    try {
      [THREE, {OrbitControls}] = await Promise.all([import("/vendor/three/three.module.min.js"), import("/vendor/three/addons/controls/OrbitControls.js")]);
    } catch (e) { console.error(e); THREE = null; }
  }
  let adegan = "susunan", data = null, mati = false, pilihId = null, animasiOn = animasiAwal;
  if (!THREE) return fallback();

  const ponsel = matchMedia("(max-width: 767px)").matches;
  const renderer = new THREE.WebGLRenderer({antialias: !ponsel, alpha: true, powerPreference: "low-power"});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));   // anggaran kinerja DT §6.5
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "sp-3d-kanvas-el";
  wadah.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene(), kamera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const matahari = new THREE.DirectionalLight(0xffffff, 1.8); matahari.position.set(12, 24, 14); scene.add(matahari);
  const kontrol = new OrbitControls(kamera, renderer.domElement);
  kontrol.enableDamping = false; kontrol.maxPolarAngle = Math.PI * 0.49; kontrol.screenSpacePanning = true;

  let grup = null, warna = {}, rafId = 0, tAnim = 0, tTerakhir = 0, terlihat = true, pembaruan = null, labelLama = "";
  const tangan = [];
  const dengar = (t, e, f, o) => { t.addEventListener(e, f, o); tangan.push(() => t.removeEventListener(e, f, o)); };
  const reduksi = matchMedia("(prefers-reduced-motion: reduce)");
  if (reduksi.matches) animasiOn = false;

  const bacaWarna = () => {
    const w = {};
    for (const t of ["--bad", "--warn", "--info", "--ok", "--f2", "--ink", "--ink2", "--ink3", "--card", "--line", "--accent"]) w[t] = warnaHex(bacaToken(wadah, t));
    warna = w;
  };

  /* satu render per perubahan; loop rAF hanya hidup selama animasi aktif dan kanvas terlihat */
  const minta = () => { if (!rafId && !mati) rafId = requestAnimationFrame(tik); };
  function tik(ts) {
    rafId = 0; if (mati) return;
    const dt = tTerakhir ? Math.min(0.1, (ts - tTerakhir) / 1000) : 0; tTerakhir = ts;
    let lanjut = false;
    if (pembaruan && animasiOn && terlihat) { tAnim += dt; lanjut = pembaruan(tAnim); }
    renderer.render(scene, kamera);
    if (lanjut) minta(); else tTerakhir = 0;
  }
  const ukur = () => {
    const w = Math.max(2, wadah.clientWidth), h = Math.max(2, wadah.clientHeight);
    renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix(); minta();
  };
  const pengamat = new ResizeObserver(() => ukur()); pengamat.observe(wadah);
  const lihat = new IntersectionObserver(es => { terlihat = es[0].isIntersecting; if (terlihat) { tTerakhir = 0; minta(); } }); lihat.observe(wadah);
  dengar(kontrol, "change", minta);
  const temaAmat = new MutationObserver(() => { bacaWarna(); bangun(); });
  temaAmat.observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
  dengar(reduksi, "change", () => { animasiOn = !reduksi.matches; pembaruan && (tAnim = 0); minta(); });

  /* ---- pembangun geometri ---- */
  const bebaskan = obj => obj.traverse(o => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); }
    o.dispose?.();
  });
  const satuKotak = () => new THREE.BoxGeometry(1, 1, 1);
  const bahan = (hex, buram = 1) => new THREE.MeshLambertMaterial({color: hex, transparent: buram < 1, opacity: buram, depthWrite: buram >= 1});

  function tepiKotak(daftar) {   // satu LineSegments untuk semua tepi kotak (satu draw call)
    const v = [], c = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    const sisi = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (const b of daftar) for (const [i, j] of sisi) for (const q of [c[i], c[j]]) v.push(b.x + q[0] * b.lebar / 2, b.y + q[1] * b.tinggi / 2, b.z + q[2] * b.dalam / 2);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({color: warna["--ink2"], transparent: true, opacity: 0.55}));
  }
  const hexKelompok = k => ({pompa: warna["--info"], hidrolik: warna["--accent"], sensor: warna["--warn"], lance: warna["--ok"]})[k];

  function adegSusunan() {
    const k = tataKomponen(data.p.n_lance), g = new THREE.Group();
    const im = new THREE.InstancedMesh(satuKotak(), bahan(0xffffff), k.length), m4 = new THREE.Matrix4(), col = new THREE.Color();
    k.forEach((b, i) => { m4.compose(new THREE.Vector3(b.x, b.y, b.z), new THREE.Quaternion(), new THREE.Vector3(b.lebar, b.tinggi, b.dalam)); im.setMatrixAt(i, m4); im.setColorAt(i, col.setHex(b.id === pilihId ? warna["--bad"] : hexKelompok(kelompokKomponen(b.kode_bom)))); });
    im.userData.komponen = k; g.add(im, tepiKotak(k));
    const lebar = Math.max(...k.map(b => b.x + b.lebar / 2)) + 2, tanah = new THREE.GridHelper(Math.max(lebar + 8, 20), 20, warna["--line"], warna["--line"]);
    tanah.position.set(lebar / 2 - 1, 0, 0); tanah.userData.abaikan = true; g.add(tanah);
    pembaruan = null; onLabel("anim", ""); onLabel("skala", "");
    return {g};
  }

  /* titik trase di adegan: x dari panjang, y dari profil elevasi kompleks (tiga titik) atau garis lurus dari Δz; tegak dilebihkan */
  function titikTrase() {
    const {p, kompleks, hasil} = data, L = hasil.profil.at(-1).x_m, k = kompleks;
    const tr = k && Math.abs(p.dz_m - (k.elev_kompleks_m - k.elev_air_m)) < SELISIH_DZ_M ? profilTrase(k, L) : null;
    const dzTotal = tr ? tr.at(-1).z_m - tr[0].z_m : p.dz_m;
    const esk = LEBAR_JALUR / L, skalaY = Math.min(8, 6 / Math.max(Math.abs(dzTotal), 0.5));
    const tinggiDi = x_m => {
      if (!tr) return (p.dz_m * x_m / L) * skalaY;
      const i = x_m <= tr[1].x_m ? 0 : 1, a = tr[i], b = tr[i + 1], u = (x_m - a.x_m) / (b.x_m - a.x_m || 1);
      return (a.z_m + (b.z_m - a.z_m) * u - tr[0].z_m) * skalaY;
    };
    return {L, esk, tinggiDi, lebihY: skalaY / esk, pos: x_m => new THREE.Vector3(x_m * esk, tinggiDi(x_m), 0), terKompleks: !!tr};
  }
  function adegJalur() {
    const {hasil} = data, seg = profilWarna(hasil), t = titikTrase(), g = new THREE.Group();
    const palet = SKALA_TEKANAN.map(s => warna[s.token]);
    const ims = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 8, 1, true), bahan(0xffffff), seg.length);
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), atas = new THREE.Vector3(0, 1, 0), merah = [];
    seg.forEach((s, i) => {
      const a = t.pos(s.x0), b = t.pos(s.x1), arah = b.clone().sub(a), len = arah.length() || 1e-6;
      m4.compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(atas, arah.normalize()), new THREE.Vector3(1, len, 1));
      ims.setMatrixAt(i, m4); ims.setColorAt(i, col.setHex(palet[s.kelas]));
      if (s.merah && !(i && seg[i - 1].merah)) merah.push(a.clone().add(b).multiplyScalar(0.5));
    });
    g.add(ims);
    if (merah.length) {   // penanda merah di atas segmen yang melewati batas (bukan hanya warna: bentuk berbeda)
      const pen = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.34), bahan(warna["--bad"]), merah.length);
      merah.forEach((v, i) => { m4.makeTranslation(v.x, v.y + 0.7, v.z); pen.setMatrixAt(i, m4); });
      g.add(pen);
    }
    const kolam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 2.6), bahan(warna["--info"], 0.85)); kolam.position.copy(t.pos(0)).add(new THREE.Vector3(-1.4, -0.4, 0));
    const manifold = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.6), bahan(warna["--ok"])); manifold.position.copy(t.pos(t.L)).add(new THREE.Vector3(0.9, 0, 0));
    g.add(kolam, manifold);
    const tanahY = Math.min(0, ...seg.map(s => t.tinggiDi(s.x0)), t.tinggiDi(t.L)) - 1.2;
    const tanah = new THREE.Mesh(new THREE.PlaneGeometry(LEBAR_JALUR + 8, 8), bahan(warna["--line"], 0.35)); tanah.rotation.x = -Math.PI / 2; tanah.position.set(LEBAR_JALUR / 2, tanahY, 0); tanah.userData.abaikan = true; g.add(tanah);
    /* partikel: kecepatan sebanding v; muncul hanya di muka air yang sudah tiba (1 detik layar = 1 menit nyata) */
    const n = ponsel ? 400 : 1600, pos = new Float32Array(n * 3), fase = Float32Array.from({length: n}, () => Math.random());
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const titik = new THREE.Points(geo, new THREE.PointsMaterial({color: 0xffffff, size: 0.34, transparent: true, opacity: 0.9, depthWrite: false}));
    titik.frustumCulled = false; g.add(titik);
    const kec = hasil.v_ms * 0.05, tiba = Math.max(hasil.t_tiba_menit, 0.1);
    const tulis = (muka, w) => {
      for (let i = 0; i < n; i++) {
        const s = ((fase[i] + kec * w) % 1) * muka, v = t.pos(s * t.L);
        pos[i * 3] = v.x; pos[i * 3 + 1] = v.y + 0.02; pos[i * 3 + 2] = (fase[(i * 7) % n] - 0.5) * 0.18;
      }
      geo.attributes.position.needsUpdate = true;
    };
    const teks = (menit, tibaOk) => { const l = tibaOk ? `Air tiba pada ${tampil(tiba)} menit` : `t = ${tampil(Math.floor(menit))} menit dari ${tampil(tiba)} menit sampai air tiba`; if (l !== labelLama) { labelLama = l; onLabel("anim", l); } };
    tulis(1, 0); teks(0, true);   // posisi awal statis: seluruh jalur terisi (kondisi animasi mati, juga untuk reduced motion)
    pembaruan = w => {
      const menit = w % (tiba + 3), muka = Math.min(1, menit / tiba);
      tulis(muka, w); teks(menit, muka >= 1); return true;
    };
    onLabel("skala", t.lebihY < 1 ? `Skala tegak diperkecil jadi ${tampil(Math.round(t.lebihY * 100) / 100)} kali` : `Skala tegak dilebihkan ${tampil(Math.round(t.lebihY))} kali`);
    return {g};
  }
  function adegInjeksi() {
    const {p} = data, maks = p.dalam_m < KONST.dalam_uji_m ? 2 : KONST.dalam_maks_m, g = new THREE.Group(), lebar = 4;
    const gambut = new THREE.Mesh(new THREE.BoxGeometry(lebar, maks, 3), bahan(warna["--ink3"], 0.35)); gambut.position.y = -maks / 2; g.add(gambut);
    const bara = new THREE.Mesh(new THREE.BoxGeometry(lebar, 0.2, 3), new THREE.MeshBasicMaterial({color: warna["--f2"]})); bara.position.y = -0.4; g.add(bara);
    const air = new THREE.Mesh(new THREE.PlaneGeometry(lebar, 3), bahan(warna["--info"], 0.28)); air.rotation.x = -Math.PI / 2; air.position.y = -0.8; air.userData.abaikan = true; g.add(air);
    const garis = [], tepiTanah = (y) => garis.push(-lebar / 2, y, 1.51, lebar / 2, y, 1.51);   // garis tiap 1 m di muka penampang
    for (let d = 0; d <= maks; d++) tepiTanah(-d);
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(garis, 3));
    g.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({color: warna["--ink"], transparent: true, opacity: 0.5})));
    const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, p.dalam_m + 1.4, 12), bahan(warna["--ok"])); lance.position.y = (1.4 - p.dalam_m) / 2; g.add(lance);
    const pusatY = -Math.max(p.dalam_m, 0.3);
    const front = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), bahan(warna["--info"], 0.45)); front.position.y = pusatY; g.add(front);
    const probe = [0.1, 0.3, 0.5, 1.0].map(d => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({color: warna["--bad"]})); m.position.set(0.35, -d, 0.2); g.add(m); return m; });
    const Q = KONST.serap_lance_lpm / 60, merah = new THREE.Color(warna["--bad"]), biru = new THREE.Color(warna["--info"]);
    const terapkan = menit => {
      const r = Math.max(frontBasah(menit * 60, Q, LUBANG_M), 1e-3); front.scale.setScalar(r);
      for (const m of probe) { const d = Math.hypot(m.position.x, m.position.y - pusatY, m.position.z); m.material.color.copy(d < r ? biru : merah); }
      const l = `t = ${tampil(Math.floor(menit))} menit, jari-jari front ${tampil(Math.round(r * 10) / 10)} m per lance (ilustrasi)`; if (l !== labelLama) { labelLama = l; onLabel("anim", l); }
    };
    terapkan(SEGMEN_MAKS_ANIMASI * 0.6);
    pembaruan = w => { terapkan(Math.min(w % (SEGMEN_MAKS_ANIMASI + 3), SEGMEN_MAKS_ANIMASI)); return true; };
    onLabel("skala", "");
    return {g};
  }

  function bangun(resetKamera = false) {
    if (mati || !data) return;
    if (grup) { scene.remove(grup); bebaskan(grup); }
    labelLama = ""; tAnim = 0;
    const r = adegan === "susunan" ? adegSusunan() : adegan === "jalur" ? adegJalur() : adegInjeksi();
    grup = r.g; scene.add(grup);
    if (resetKamera || !kamera.userData.sudah) { aturUlang(); kamera.userData.sudah = true; }
    minta();
  }
  /* bingkai kamera dari bola pembatas isi adegan (tanpa tanah dan bidang bantu), muat di lebar maupun tinggi kanvas */
  function aturUlang() {
    if (!grup) return;
    const kotak = new THREE.Box3();
    for (const c of grup.children) if (!c.userData.abaikan) kotak.expandByObject(c);
    const bola = kotak.getBoundingSphere(new THREE.Sphere()), vf = THREE.MathUtils.degToRad(kamera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * kamera.aspect);
    const jarak = bola.radius / Math.sin(Math.min(vf, hf) / 2) * 1.08;
    kontrol.target.copy(bola.center);
    kamera.position.copy(bola.center).add(new THREE.Vector3(0.42, 0.5, 1).normalize().multiplyScalar(jarak * 0.88));
    kamera.near = Math.max(0.05, jarak / 200); kamera.far = jarak * 8; kamera.updateProjectionMatrix();
    kontrol.update(); minta();
  }

  /* pilih komponen: klik tanpa geser (selisih di bawah 5 px) pada kanvas */
  const sinar = new THREE.Raycaster(), p2 = new THREE.Vector2();
  let turun = null;
  dengar(renderer.domElement, "pointerdown", e => { turun = [e.clientX, e.clientY]; });
  dengar(renderer.domElement, "pointerup", e => {
    if (!turun || adegan !== "susunan" || Math.hypot(e.clientX - turun[0], e.clientY - turun[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    p2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    sinar.setFromCamera(p2, kamera);
    const im = grup?.children.find(c => c.isInstancedMesh), hit = im && sinar.intersectObject(im)[0];
    if (hit) onPilih(im.userData.komponen[hit.instanceId].id);
  });

  bacaWarna(); ukur();
  return {
    webgl: true,
    atur(a, d) { const ganti = a !== adegan; adegan = a; data = d; bangun(ganti); },
    kamera(aksi) {
      if (aksi === "reset") return aturUlang();
      const o = kamera.position.clone().sub(kontrol.target);
      if (aksi === "kiri" || aksi === "kanan") o.applyAxisAngle(new THREE.Vector3(0, 1, 0), aksi === "kiri" ? 0.3 : -0.3);
      else o.multiplyScalar(aksi === "dekat" ? 0.82 : 1.22);
      kamera.position.copy(kontrol.target).add(o); kontrol.update(); minta();
    },
    animasi(aktif) { animasiOn = aktif; tTerakhir = 0; if (aktif && pembaruan) tAnim = 0; minta(); },
    pilih(id) { pilihId = id; if (adegan === "susunan") bangun(); },
    lepas() {
      mati = true; cancelAnimationFrame(rafId); pengamat.disconnect(); lihat.disconnect(); temaAmat.disconnect();
      tangan.forEach(f => f()); kontrol.dispose();
      if (grup) { scene.remove(grup); bebaskan(grup); grup = null; }
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    }
  };

  /* ---- tanpa WebGL ---- */
  function fallback() {
    const pita = document.createElement("p"); pita.className = "ad-spanduk"; pita.setAttribute("role", "status");
    pita.textContent = "Peramban ini tidak mendukung WebGL. Diagram 2D di bawah memuat angka yang sama.";
    const diagram = document.createElement("div"); diagram.className = "sa-diagram";
    wadah.replaceChildren(pita, diagram);
    const gambar = () => {
      if (mati || !data) return;
      /* svg dibuat dari konstanta dan angka hasil hitung, bukan teks data bebas */
      diagram.innerHTML = adegan === "susunan" ? svgSusunan(tataKomponen(data.p.n_lance)) : adegan === "jalur" ? svgJalur(data.hasil) : svgInjeksi(data.p);
      onLabel("anim", ""); onLabel("skala", "");
    };
    return {webgl: false, atur(a, d) { adegan = a; data = d; gambar(); }, kamera() {}, animasi() {}, pilih(id) { pilihId = id; }, lepas() { mati = true; wadah.replaceChildren(); }};
  }
}
