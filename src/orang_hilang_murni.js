/* Orang hilang publik: fungsi murni (tanpa D1, tanpa jaringan, tanpa impor). Rancangan: data/kajian-bnpb/orang-hilang-publik/ALGORITMA.md bagian 1 sampai 6.
   Semua angka berlabel HIPOTESIS ada di KONSTANTA di bawah dan diubah hanya di sini (opsi OH_JENDELA_HARI dan OH_MASA_HARI lewat `batasi`, terkunci 1 sampai 365).
   Daftar putih bidang publik adalah himpunan kunci keluaran `profilPublik`: kolom lain di baris masukan tidak pernah tersalin (daftar putih, bukan daftar hitam). */

const HARI = 864e5, WIB = 7 * 36e5;

/* HIPOTESIS: belum diukur; Q4 (masa tayang), Q22 (jendela kejadian), JENDELA_TEMU_HARI, KANDIDAT_MAKS, kategori umur anak */
export const KONSTANTA = {MASA_TAYANG_HARI: 30, JENDELA_HARI: 30, JENDELA_TEMU_HARI: 21, KANDIDAT_MAKS: 5, KEJADIAN_MAKS: 8, SETUJU_VERSI: 1, TOLERANSI_UMUR: 5};
export const {MASA_TAYANG_HARI, JENDELA_HARI, JENDELA_TEMU_HARI, KANDIDAT_MAKS, KEJADIAN_MAKS, SETUJU_VERSI, TOLERANSI_UMUR} = KONSTANTA;
export const BATAS_HARI = [1, 365];
/* nilai opsi dari vars Worker: bilangan bulat dalam batas, selain itu bawaan (jendela tidak pernah 0 atau lebih dari 365) */
export const batasi = (nilai, bawaan, [lo, hi] = BATAS_HARI) => { const n = typeof nilai === "string" && /^\d{1,4}$/.test(nilai.trim()) ? Number(nilai) : nilai; return Number.isInteger(n) && n >= lo && n <= hi ? n : bawaan; };

export const STATUS = ["draf", "menunggu", "tayang", "turun"];
export const ALASAN_TURUN = ["ditolak", "dicabut", "kedaluwarsa", "dilaporkan", "petugas", "ditemukan", "tutup"];
export const KELAS = ["dewasa", "anak"];
export const LABEL = {
  kelas: {dewasa: "Dewasa", anak: "Anak"},
  status: {draf: "Draf", menunggu: "Menunggu tinjauan petugas", tayang: "Tampil di publik", turun: "Tidak tampil lagi"},
  alasan_turun: {ditolak: "Ditolak petugas", dicabut: "Persetujuan dicabut", kedaluwarsa: "Masa tayang berakhir", dilaporkan: "Dilaporkan beberapa pihak", petugas: "Diturunkan petugas", ditemukan: "Orang ditemukan", tutup: "Laporan ditutup"},
  kosong: "belum diketahui",
};
const KOSONG = LABEL.kosong;

/* ---- 1. kelas orang ---- */
const angka = u => { const n = typeof u === "number" ? u : /^\d{1,3}$/.test(String(u ?? "").trim()) ? Number(String(u).trim()) : NaN; return Number.isInteger(n) && n >= 0 && n <= 120 ? n : null; };
/* kosong, "Tidak tahu", di luar 0 sampai 120, atau kategori tanpa angka = anak sampai petugas memutuskan (D7). Kosong tidak pernah jadi 0. */
export const kelasUmur = (umur, kategori) => { const n = angka(umur); return n !== null && n >= 18 && !/balita|anak|remaja/i.test(String(kategori ?? "")) ? "dewasa" : "anak"; };

/* ---- 2. bidang publik ---- */
export const rentangUmur = u => { const n = angka(u); return n === null ? null : [Math.floor(n / 5) * 5, Math.floor(n / 5) * 5 + 4]; };
export const rentangTinggi = t => { const n = typeof t === "number" ? t : /^\d{2,3}$/.test(String(t ?? "").trim()) ? Number(String(t).trim()) : NaN; return Number.isInteger(n) && n >= 30 && n <= 260 ? [Math.floor(n / 10) * 10, Math.floor(n / 10) * 10 + 9] : null; };
export const teksRentang = r => r ? `${r[0]} sampai ${r[1]}` : KOSONG;
/* kategori anak: batas HIPOTESIS (balita 0 sampai 4, anak 5 sampai 12, remaja 13 sampai 17) */
export const kategoriAnak = u => { const n = angka(u); return n === null ? KOSONG : n <= 4 ? "balita" : n <= 12 ? "anak" : "remaja"; };
export const inisial = nama => Array.from(String(nama ?? "").split(/\s+/).filter(Boolean)).map(k => Array.from(k)[0].toLocaleUpperCase("id") + ".").join(" ");
export const tglWib = w => { if (typeof w === "string") return /^\d{4}-\d{2}-\d{2}/.test(w) ? w.slice(0, 10) : null; return Number.isFinite(w) ? new Date(w + WIB).toISOString().slice(0, 10) : null; };

export const BIDANG_PUBLIK = {
  dewasa: ["id", "nama", "panggilan", "foto", "umur", "kelamin", "tinggi", "pakaian", "ciri", "lokasi", "waktu", "kejadian"],
  anak: ["id", "nama", "panggilan", "umur", "pakaian", "lokasi", "waktu", "kejadian"],
};
const teks = v => { const t = String(v ?? "").trim(); return t || null; };
/* baris: kolom mentah apa pun (token, nama, panggilan, umur, kelamin, tinggi, pakaian, ciri, kec, kab_nama, waktu, kejadian {jenis, kab, mulai}, nomor_*, dst).
   pilihan: {foto: [url turunan terpilih dan lolos], ciri_ditinjau: bool}. Objek keluaran baru; hanya kunci BIDANG_PUBLIK[kelas]. */
export function profilPublik(baris, kelas, pilihan = {}) {
  const b = baris ?? {}, k = kelas === "dewasa" ? "dewasa" : "anak", kej = b.kejadian;
  const p = {id: teks(b.token), nama: k === "anak" ? inisial(b.nama) : teks(b.nama), panggilan: teks(b.panggilan),
    umur: k === "anak" ? kategoriAnak(b.umur) : teksRentang(rentangUmur(b.umur)), pakaian: teks(b.pakaian),
    lokasi: [teks(b.kec), teks(b.kab_nama)].filter(Boolean).join(", ") || KOSONG, waktu: tglWib(b.waktu) ?? KOSONG,
    kejadian: kej ? {jenis: teks(kej.jenis), kab: teks(kej.kab), mulai: tglWib(kej.mulai)} : null};
  if (k === "dewasa") Object.assign(p, {foto: (Array.isArray(pilihan.foto) ? pilihan.foto : []).filter(u => typeof u === "string").slice(0, 3),
    kelamin: teks(b.kelamin) ?? KOSONG, tinggi: teksRentang(rentangTinggi(b.tinggi)), ciri: pilihan.ciri_ditinjau ? teks(b.ciri) : null});
  return Object.fromEntries(BIDANG_PUBLIK[k].map(x => [x, p[x]]));
}

/* ---- 3. penyaring bencana ---- */
const kab4 = k => String(k ?? "").replace(/\D/g, "");
const AKTIF = ["terverifikasi", "tanggap", "transisi", "pemulihan"];   // fase Buku Besar yang masih berjalan; terdeteksi, dibatalkan, digabung tidak pernah ditawarkan
const TAK_TAMPIL = ["terdeteksi", "dibatalkan", "digabung"];
/* daftar: {id, jenis, kab4: [kode...], mulai: YYYY-MM-DD, fase}; jenisSah: daftar jenis bencana (JENIS_SAH siklus_kejadian.js), diberikan pemanggil supaya berkas ini murni */
export function kandidatKejadian(kab, laporanMs, daftar, jenisSah, jendela = JENDELA_HARI) {
  const k = kab4(kab), potong = tglWib(laporanMs - jendela * HARI);
  if (k.length !== 4 || !potong || !Array.isArray(daftar)) return [];
  return daftar.filter(x => (Array.isArray(x.kab4) ? x.kab4 : [x.kab4]).some(y => kab4(y) === k) && jenisSah.includes(x.jenis) && !TAK_TAMPIL.includes(x.fase) && (AKTIF.includes(x.fase) || x.mulai >= potong))
    .map(x => ({id: x.id, jenis: x.jenis, kab4: k, mulai: x.mulai, aktif: AKTIF.includes(x.fase)}))
    .sort((a, z) => z.aktif - a.aktif || (a.mulai < z.mulai ? 1 : a.mulai > z.mulai ? -1 : 0) || (a.id < z.id ? -1 : 1)).slice(0, KEJADIAN_MAKS);
}

/* ---- 4. status tayang ---- */
export const PINDAH = {draf: ["menunggu"], menunggu: ["tayang", "draf", "turun"], tayang: ["turun"], turun: ["menunggu"]};
/* turun ke menunggu hanya sesudah kedaluwarsa (pelapor menayangkan lagi); selain tabel ditolak */
export const bolehPindah = (dari, ke, alasanTurun = null) => (PINDAH[dari] ?? []).includes(ke) && (dari !== "turun" || alasanTurun === "kedaluwarsa");
export const waliSah = oh => oh?.setuju_wali === 1 && !!oh.wali_oleh && !!oh.wali_waktu;
/* kelayakan tayang: kejadian dipilih DAN dikonfirmasi petugas; anak juga butuh verifikasi wali oleh petugas */
export const layak = oh => !!(oh?.kejadian_id && oh.kejadian_oleh) && (oh.kelas !== "anak" || waliSah(oh));
export const turunOtomatis = statusCari => ["ditemukan_selamat", "ditemukan_meninggal", "tutup"].includes(statusCari);   // ke_sar dan buka tetap tayang (Q25)
export const persetujuanSah = oh => oh?.setuju_versi === SETUJU_VERSI && !oh.dicabut_waktu;
export const kedaluwarsa = (oh, kini, masa = MASA_TAYANG_HARI) => Number.isFinite(oh?.tayang_waktu) && oh.tayang_waktu + masa * HARI <= kini;

/* ---- 6. saran kandidat cocok (hilang lawan ditemukan), lapis 1; nama dan nomor tidak pernah dibaca ---- */
const jangkauan = u => u == null ? null : typeof u === "object" ? (angka(u.min) !== null && angka(u.maks) !== null ? [u.min, u.maks] : null) : angka(u) === null ? null : [angka(u), angka(u)];
const kataPakaian = t => new Set(String(t ?? "").toLowerCase().match(/[a-z]{3,}/g) ?? []);
/* hilang: {kab, waktu_terakhir (ms), kelamin, umur, pakaian}; temu: [{id, kab, waktu_temu (ms), kelamin, umur, pakaian}]; tetangga: kab -> daftar kab bertetangga (tabel wilayah) */
export function saranCocok(hilang, temu, tetangga = () => []) {
  const H = hilang ?? {}, kh = kab4(H.kab), jh = jangkauan(H.umur);
  return (Array.isArray(temu) ? temu : []).flatMap(T => {
    const kt = kab4(T.kab), hari = (T.waktu_temu - H.waktu_terakhir) / HARI;
    const alasan = {kab: !!kh && !!kt && (kh === kt || tetangga(kh).map(kab4).includes(kt)), waktu: hari >= 0 && hari <= JENDELA_TEMU_HARI,
      kelamin: !H.kelamin || !T.kelamin || H.kelamin === T.kelamin, umur: true, pakaian: null}, jt = jangkauan(T.umur);
    if (jh && jt) alasan.umur = jh[0] - TOLERANSI_UMUR <= jt[1] && jt[0] - TOLERANSI_UMUR <= jh[1];
    if (teks(H.pakaian) && teks(T.pakaian)) { const a = kataPakaian(H.pakaian), b = kataPakaian(T.pakaian); alasan.pakaian = [...a].some(x => b.has(x)); }   // hanya info, tidak pernah menggugurkan
    return alasan.kab && alasan.waktu && alasan.kelamin && alasan.umur ? [{id: T.id, alasan, hari: Math.floor(hari)}] : [];
  }).sort((a, z) => Object.values(z.alasan).filter(v => v === true).length - Object.values(a.alasan).filter(v => v === true).length);
}

/* ---- 7. baris oh_publik dari isian obrolan (OH-04) ----
   k = isian kirimCari mesin (nama_dicari, panggilan, cr {umur, kelamin, tinggi, pakaian}, kec, kab, kab_nama, waktu_ms, kejadian {id, jenis, kab4, mulai} atau {id: null}, setuju {versi, waktu}).
   Tiap nilai dijepit ke batas CHECK migrasi 0188: satu isian aneh tidak boleh menggagalkan batch laporan; di luar batas jadi null (kosong tidak pernah jadi 0). */
const jepit = (v, m) => { const t = String(v ?? "").trim(); return t ? t.slice(0, m) : null; };
const bulat = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi ? v : null;
export function barisOh(k, cariId, token) {
  const cr = k?.cr ?? {}, kej = k?.kejadian ?? {}, umur = bulat(cr.umur, 0, 120), mulai = typeof kej.mulai === "string" && /^\d{4}-\d{2}-\d{2}$/.test(kej.mulai) ? kej.mulai : null;
  const adaKej = typeof kej.id === "string" && kej.id.length === 16 && typeof kej.jenis === "string" && kej.jenis.length >= 3 && kej.jenis.length <= 24 && /^\d{4}$/.test(String(kej.kab4 ?? "")) && !!mulai;
  return {cari_id: cariId, token, kelas: kelasUmur(umur, null), nama: jepit(k?.nama_dicari, 80), panggilan: jepit(k?.panggilan, 40), umur,
    kelamin: cr.kelamin === "Laki-laki" || cr.kelamin === "Perempuan" ? cr.kelamin : null, tinggi: bulat(cr.tinggi, 30, 260), pakaian: jepit(cr.pakaian, 200),
    kec: jepit(k?.kec, 80), kab: /^\d{2}\.\d{2}$/.test(k?.kab ?? "") ? k.kab : null, kab_nama: jepit(k?.kab_nama, 80), waktu_terakhir: Number.isFinite(k?.waktu_ms) ? k.waktu_ms : null,
    kejadian_id: adaKej ? kej.id : null, kejadian_jenis: adaKej ? kej.jenis : null, kejadian_kab: adaKej ? String(kej.kab4) : null, kejadian_mulai: adaKej ? mulai : null,
    setuju_versi: Number.isInteger(k?.setuju?.versi) && k.setuju.versi >= 1 ? k.setuju.versi : null, setuju_waktu: Number.isFinite(k?.setuju?.waktu) ? k.setuju.waktu : null, status: "menunggu"};
}
