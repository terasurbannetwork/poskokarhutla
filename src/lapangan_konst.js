/* Modul Pegawai dan Relawan Lapangan: SEMUA konstanta + fungsi murni (tanpa D1/R2/fetch).
   Rujukan: data/kajian-bnpb/lapangan/ALGORITMA.md §2-§5. Klien membaca salinannya lewat GET /api/petugas/konst, jadi angka tidak pernah berbeda.
   Yang bertanda (kalibrasi) disetel dari 200 pasang absen sah (KEPUTUSAN U1); ubah di sini saja dan catat di KEPUTUSAN-LAPANGAN.md. */

const MENIT = 60e3, JAM = 3600e3;

/* enum: DIJAGA CHECK di migrations/0095 dan diuji sama persis (tests/warga/lapangan_skema.test.mjs) */
export const JENIS_ORANG = ["pegawai", "relawan"];
export const STATUS_ORANG = ["aktif", "nonaktif"];
export const WAJAH_STATUS = ["belum", "terdaftar", "dihapus"];
export const STATUS_WA_ANTRE = ["antre", "dikirim", "gagal"];
export const ARAH = ["depan", "kiri", "kanan", "atas", "bawah"];
export const STATUS_ABSEN = ["lolos", "tinjau", "sah", "tolak"];
export const TANTANGAN = ["kedip", "toleh_kiri", "toleh_kanan"];
export const ALASAN_TINJAU = ["wajah_belum_daftar", "wajah_rendah", "wajah_berbeda", "tantangan_gagal", "hidup_rendah", "gps_curiga", "luar_radius", "jam_hp", "luring", "luring_lama", "sampel_acak", "jaringan_beda", "wajah_baru"];
export const JENIS_ABSEN = ["masuk", "pulang"];
export const PERAN_ANGGOTA = ["ketua", "anggota"];
export const JENIS_LABEL = ["api", "banjir"];
/* tahap C (0101): panggilan relawan lewat WA */
export const STATUS_PANGGIL = ["buka", "penuh", "tutup"];
export const STATUS_PENERIMA = ["antre", "terkirim", "gagal", "siap", "tidak", "penuh"];
export const RETENSI_FOTO_MS = 730 * 24 * JAM;   // LP-049: foto absen/logbook dihapus sesudah 2 tahun
/* isian kondisi lapangan logbook (ALGORITMA §7): enum + rentang bilangan bulat; dijaga validasi di src/lapangan.js */
export const KONDISI = {
  enum: {kondisi_api: ["menyala", "bara", "padam", "bukan_api"], akses: ["mobil", "motor", "jalan_kaki", "perahu"], hujan_lokal: ["tidak", "ringan", "lebat"]},
  angka: {tebal_gambut_cm: [0, 1500], jarak_air_m: [0, 10000], tinggi_genangan_cm: [0, 500]},
};
export const KONDISI_API = ["kondisi_api", "tebal_gambut_cm", "jarak_air_m", "akses"], KONDISI_BANJIR = ["tinggi_genangan_cm", "hujan_lokal"];
/* pilihan logbook: kunci = sumber kebenaran klien (public/petugas/logbook_murni.js); server menolak kunci di luar daftar */
export const KEGIATAN = ["patroli", "pemadaman", "pendinginan", "pemantauan", "evakuasi", "logistik", "koordinasi", "lainnya"];
export const KENDALA = ["akses_sulit", "air_jauh", "cuaca", "alat_rusak", "komunikasi", "keamanan", "lainnya"];
export const KEBUTUHAN = ["bbm", "selang_pompa", "makanan_air", "personel", "kesehatan", "transport", "lainnya"];
export const ALASAN_TOLAK = ["foto_ganda", "nonce_tidak_sah", "gps_ditolak"];

/* sudut kepala (derajat) per arah pendaftaran: [min, maks] untuk yaw dan pitch SETELAH dikali tanda perangkat */
export const SYARAT_SUDUT = {
  depan: {yaw: [-8, 8], pitch: [-8, 8]},
  kiri: {yaw: [-180, -22], pitch: [-12, 12]},
  kanan: {yaw: [22, 180], pitch: [-12, 12]},
  atas: {yaw: [-12, 12], pitch: [-180, -15]},
  bawah: {yaw: [-12, 12], pitch: [15, 180]},
};
/* sementara 1: tanda sebenarnya (kamera depan dicerminkan) diverifikasi di uji perangkat U-07; ubah ke -1 bila terbalik */
export const TANDA_YAW = 1, TANDA_PITCH = 1;

/* gerbang mutu per frame, dan keteguhan per arah */
export const MUTU = {skorDeteksiMin: 0.80, lebarMin: 0.30, lebarMaks: 0.75, tajamMin: 40, antispoofMin: 0.50, frameBerturut: 5, frameTerbaik: 3, batasArahDetik: 15};
export const TANTANGAN_BATAS_DETIK = 8, TANTANGAN_FRAME_DEPAN = 3;

/* ambang wajah (kalibrasi, U1) */
/* AMBANG_HIDUP (kalibrasi): skor_hidup = softmax MiniFASNet 0..1; nilai 0.50 sementara. Di bawahnya HANYA mengirim ke tinjau (hidup_rendah), tidak pernah menolak. Dikalibrasi ulang dari data HP nyata + uji foto cetak/layar (U-20). */
export const AMBANG_LOLOS = 0.60, AMBANG_TINJAU = 0.45, AMBANG_HIDUP = 0.50, AMBANG_DAFTAR = 0.45;

export const GPS = {sampel: 3, jedaMs: 1000};
export const RADIUS_BAWAAN_M = {lapangan: 2000, posko: 300};
export const TAMBAH_AKURASI_MAKS_M = 200;
export const BATAS_JAM_HP_DETIK = 300;
export const LURING = {mundurMs: 24 * JAM, majuMs: 5 * MENIT};
export const KECEPATAN_MUSTAHIL_KMJ = 900;
export const NONCE = {umurMs: 5 * MENIT, luringJumlah: 6, luringUmurMs: 36 * JAM};
/* absen luring yang diklaim lebih dari ini sebelum jam server masuk tinjauan (luring_lama); jaringan_beda = kode sama dari ip_hash lain dalam jendela ini; wajah_baru = jumlah absen berikutnya sesudah daftar ulang wajah */
export const LURING_LAMA_MS = 2 * JAM, JARINGAN_JENDELA_MS = 12 * JAM, WAJAH_BARU_ABSEN = 3;
/* sampel acak: sekian bagian absen yang lolos dipindah ke tinjauan supaya skor yang dihitung di HP tak bisa dipalsukan tanpa risiko. Hanya di server (tidak masuk KONST_PUBLIK);
   env.SAMPEL_TINJAU (0..1) menimpa untuk uji. */
export const SAMPEL_TINJAU = 0.10;
export const LABEL_TAMBAH_M = 200;   // label terverifikasi: foto <= radius tugas + ini

/* tanggal WIB (UTC+7) YYYY-MM-DD dari ms epoch, dan ms epoch awal hari WIB itu; logbook terkunci begitu tanggal WIB berganti (23.59 WIB) */
export const tanggalWIB = ms => new Date(ms + 7 * JAM).toISOString().slice(0, 10);
export const awalHariWIB = tgl => Date.parse(tgl + "T00:00:00Z") - 7 * JAM;
export const BATAS_FOTO_LOGBOOK = 6, DIM_VEKTOR_MAKS = 2048, DIM_VEKTOR_MIN = 16, JENDELA_TUGAS_MS = 12 * JAM;

/* persetujuan wajah: ganti VERSI bila teks berubah (orang yang sudah setuju diminta setuju lagi) */
export const VERSI_SETUJU = "2026-11-01";
export const TEKS_SETUJU = [
  "Untuk absen, kami mencocokkan wajahmu dengan data yang kamu daftarkan.",
  "Yang disimpan: lima vektor angka dari wajahmu (depan, kiri, kanan, atas, bawah) dan satu foto wajah depan sebagai acuan peninjau. Foto lima arah tidak disimpan.",
  "Untuk apa: hanya mencocokkan wajah saat absen masuk dan pulang. Tidak dibagikan ke pihak luar BNPB dan tidak dipakai untuk hal lain.",
  "Berapa lama: selama kamu aktif bertugas. Foto absen dan logbook disimpan 2 tahun sebagai bukti kegiatan, lalu dihapus.",
  "Cara hapus: tekan Cabut persetujuan di layar ini. Vektor dan foto acuanmu dihapus seketika. Kamu tetap bisa absen, tetapi tiap absenmu diperiksa petugas.",
].join("\n\n");   // paragraf dipisah baris kosong (permintaan layar)

/* isi publik untuk GET /api/petugas/konst: hanya yang dipakai layar (arah, sudut, mutu per frame, tantangan, sampel GPS). Ambang wajah, antispoof, radius, batas jam HP, luring, nonce
   dan kecepatan mustahil TETAP di server: membukanya memudahkan penyesuaian wajah/lokasi untuk menembus penilaian absen. */
const {antispoofMin: _a, ...MUTU_PUBLIK} = MUTU;
export const KONST_PUBLIK = {
  versi_setuju: VERSI_SETUJU, arah: ARAH, syarat_sudut: SYARAT_SUDUT, tanda_yaw: TANDA_YAW, tanda_pitch: TANDA_PITCH, mutu: MUTU_PUBLIK,
  tantangan: TANTANGAN, tantangan_batas_detik: TANTANGAN_BATAS_DETIK, tantangan_frame_depan: TANTANGAN_FRAME_DEPAN,
  gps: GPS, kegiatan: KEGIATAN, kendala: KENDALA, kebutuhan: KEBUTUHAN, kondisi: KONDISI,
};

/* ================================================================ fungsi murni */

/* sudut kepala cocok dengan syarat arah? yaw/pitch derajat mentah dari perangkat (dikali tanda perangkat di sini) */
export function sudutCocok(arah, yaw, pitch) {
  if (!Object.hasOwn(SYARAT_SUDUT, arah)) return false;
  const s = SYARAT_SUDUT[arah];
  const y = yaw * TANDA_YAW, p = pitch * TANDA_PITCH;
  return y >= s.yaw[0] && y <= s.yaw[1] && p >= s.pitch[0] && p <= s.pitch[1];
}

/* base64 Float32 little-endian -> Float32Array. Salinan ke buffer baru supaya selaras 4 byte. */
export function vektorDari(b64) {
  const b = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  if (!b.length || b.length % 4) throw new Error("vektor bukan kelipatan 4 byte");
  return new Float32Array(b.buffer);
}

/* kemiripan kosinus -1..1; masukan string base64 atau larik/Float32Array. Panjang beda = galat (versi model beda tidak dibandingkan). Vektor nol = 0. */
export function kosinus(a, b) {
  const x = typeof a === "string" ? vektorDari(a) : a, y = typeof b === "string" ? vektorDari(b) : b;
  if (x.length !== y.length) throw new Error("panjang vektor berbeda");
  let d = 0, nx = 0, ny = 0;
  for (let i = 0; i < x.length; i++) { d += x[i] * y[i]; nx += x[i] * x[i]; ny += y[i] * y[i]; }
  return nx && ny ? d / Math.sqrt(nx * ny) : 0;
}

/* jarak lingkaran besar, meter */
export function haversineM(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* dalam_radius bila jarak <= radius + min(akurasi, 200 m) */
export const dalamRadius = (jarakM, radiusM, akurasiM) => jarakM <= radiusM + Math.min(Math.max(akurasiM || 0, 0), TAMBAH_AKURASI_MAKS_M);

/* lompatan mustahil antarabsen orang yang sama: kecepatan > 900 km/jam. p dan k = {lat, lon, waktu (ms)}.
   Di bawah 1 km tidak pernah dihitung (derau GPS, bukan perpindahan). Selisih waktu minimal 1 detik supaya tidak membagi nol. */
export function lompatanMustahil(p, k) {
  const m = haversineM(p.lat, p.lon, k.lat, k.lon);
  if (m < 1000) return false;
  const jam = Math.max(Math.abs(k.waktu - p.waktu), 1000) / JAM;
  return m / 1000 / jam > KECEPATAN_MUSTAHIL_KMJ;
}

/* Keputusan status absen (ALGORITMA §5). Masukan:
   {fotoSudahDipakai, nonceSah, gpsDitolak, wajahTerdaftar, skorWajah, tantanganLolos, skorHidup, gpsCuriga, dalamRadius, jamHp, luring, luringLama, jaringanBeda, wajahBaru, sampelAcak}
   -> {status: 'tolak'|'lolos'|'tinjau', alasan: []}. tolak hanya untuk pelanggaran keras (ALASAN_TOLAK); skor rendah TIDAK PERNAH menolak (D3).
   Tanpa wajah terdaftar, skor/tantangan/hidup tidak bermakna dan dilewati. `luring` sendiri tidak memaksa tinjau (nonce luring yang tak sah sudah jatuh ke nonceSah=false). */
export function putusStatus(i) {
  const tolak = [];
  if (i.fotoSudahDipakai) tolak.push("foto_ganda");
  if (!i.nonceSah) tolak.push("nonce_tidak_sah");
  if (i.gpsDitolak) tolak.push("gps_ditolak");
  if (tolak.length) return {status: "tolak", alasan: tolak};
  const a = [];
  if (!i.wajahTerdaftar) a.push("wajah_belum_daftar");
  else {
    if (!(i.skorWajah >= AMBANG_LOLOS)) a.push(i.skorWajah >= AMBANG_TINJAU ? "wajah_rendah" : "wajah_berbeda");
    if (!i.tantanganLolos) a.push("tantangan_gagal");
    if (!(i.skorHidup >= AMBANG_HIDUP)) a.push("hidup_rendah");
  }
  if (i.gpsCuriga) a.push("gps_curiga");
  if (!i.dalamRadius) a.push("luar_radius");
  if (i.jamHp) a.push("jam_hp");
  if (i.luringLama) a.push("luring_lama");
  if (i.jaringanBeda) a.push("jaringan_beda");
  if (i.wajahBaru) a.push("wajah_baru");
  if (!a.length && i.sampelAcak) a.push("sampel_acak");   // hanya yang selainnya lolos: sampel acak tidak menggandakan alasan
  if (!a.length) return {status: "lolos", alasan: []};
  if (i.luring) a.push("luring");
  return {status: "tinjau", alasan: a};
}
