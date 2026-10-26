/* Pendataan Satu Data BNPB, Fase 1: SPEK BERSAMA peramban dan Worker. Modul ES murni, tanpa DOM dan tanpa D1.
   Peramban: import * as S from "/bnpb/pendataan_spek.js". Worker: import dari ../public/bnpb/pendataan_spek.js.
   Rancangan: docs/bnpb/PENDATAAN.md. Daftar UNIT, JENIS, dan STATUS di sini HARUS sama dengan CHECK di migrations/0060_pendataan.sql (dijaga tests/warga/pendataan.test.mjs).

   Aturan pemilik (26 Okt 2026):
   - Tiap pilihan (pilih dan banyak) SELALU punya "Lainnya" dan kolom isian manualnya (<kunci>_lain), wajib diisi bila Lainnya dipilih.
   - Satu akun boleh mengisi BANYAK isian data dan BANYAK isian aplikasi; isian "umum" (kebutuhan dan kendala) satu per akun.
   - Nilai pilihan disimpan sebagai LABEL apa adanya supaya ekspor CSV terbaca tanpa kamus. */

export const LAINNYA = "Lainnya";

/* sasaran monitoring: hanya unit BNPB ini (pemilik, 26 Okt). Akun di luar daftar memilih "lainnya" dan menulis unitnya. */
export const UNIT = {
  pusdatin: "Pusdatin",
  dalops: "Direktorat Dalops",
  pdw1: "Direktorat Wilayah 1",
  pdw2: "Direktorat Wilayah 2",
  pdw3: "Direktorat Wilayah 3",
  rrp: "Direktorat RRP",
  rri: "Direktorat RRI",
  rrs: "Direktorat RRS",
  logistik: "Direktorat Pengelolaan Logistik",
  jaringan_logistik: "Direktorat Optimasi Jaringan Logistik",
  lainnya: LAINNYA,
};
export const UNIT_SASARAN = Object.keys(UNIT).filter(k => k !== "lainnya");
export const JENIS = ["data", "aplikasi", "umum"];
export const JUDUL_JENIS = {data: "Data dan dokumen", aplikasi: "Aplikasi", umum: "Kebutuhan dan kendala"};
export const STATUS_ISIAN = ["draf", "terkirim"];
export const STATUS_AKUN = ["menunggu", "aktif", "ditolak", "dicabut"];

const NAMA_UNIT = UNIT_SASARAN.map(k => UNIT[k]);
const KL = ["BMKG", "Kementerian Kehutanan", "Kementerian Lingkungan Hidup", "BRIN", "Kemenko Polkam", "Kementerian Dalam Negeri", "Kementerian Sosial", "Kementerian Kesehatan",
  "Kementerian PU", "Kementerian PPN/Bappenas", "Kementerian Keuangan", "BIG", "BPS", "Basarnas", "TNI", "Polri", "Pemerintah daerah", "BPBD"];
const BENCANA = ["Semua bencana", "Banjir", "Tanah longsor", "Kebakaran hutan dan lahan", "Gempa bumi", "Tsunami", "Erupsi gunung api", "Cuaca ekstrem", "Kekeringan", "Abrasi dan gelombang ekstrem"];
const AKSES_DATA = ["API", "Ekspor berkas (Excel, CSV)", "Dasbor web", "Salin manual", "Tidak bisa diakses unit lain"];

/* Satu kolom: {k, label, tipe, wajib?, opsi?, maks?, syarat?, bantu?}
   tipe: teks (≤ maks, bawaan 200), panjang (≤ maks, bawaan 2000), pilih (satu opsi), banyak (satu atau lebih opsi), angka (bulat, min..maks), jam (HH:MM), url (http/https).
   syarat: {k, sama?: [...], bukan?: [...]} = kolom hanya berlaku (dan wajibnya hanya berlaku) bila kolom k memenuhi; di luar syarat nilainya dibuang.
   Kolom pilih/banyak otomatis menerima LAINNYA, ditambah kolom teks <k>_lain (wajib bila LAINNYA dipilih, dibuang bila tidak). */
export const KOLOM = {
  data: [
    {k: "nama", label: "Nama data, dokumen, atau laporan", tipe: "teks", wajib: true, maks: 200},
    {k: "isi", label: "Isinya apa saja", tipe: "panjang", wajib: true, bantu: "Kolom atau angka utama, misalnya jumlah korban, rumah rusak, luas terbakar"},
    {k: "jenis_data", label: "Jenis data", tipe: "banyak", wajib: true, opsi: ["Kejadian bencana", "Dampak dan korban", "Logistik dan bantuan", "Keuangan dan anggaran", "Sumber daya (personel, peralatan)",
      "Spasial atau peta", "Rehabilitasi dan rekonstruksi", "Peringatan dini", "Regulasi dan kebijakan", "Laporan kegiatan"]},
    {k: "bencana", label: "Jenis bencana", tipe: "banyak", wajib: true, opsi: BENCANA},
    {k: "frekuensi", label: "Dibuat tiap", tipe: "pilih", wajib: true, opsi: ["Harian", "Mingguan", "Bulanan", "Triwulanan", "Tahunan", "Insidental tiap bencana"]},
    {k: "jam_siap", label: "Biasanya siap jam", tipe: "jam", syarat: {k: "frekuensi", sama: ["Harian"]}},
    {k: "bentuk", label: "Bentuk keluaran", tipe: "banyak", wajib: true, opsi: ["Pesan WA", "Excel atau CSV", "PDF", "Word", "PowerPoint", "Aplikasi atau web", "API", "Peta atau GIS", "Kertas"]},
    {k: "pembuat", label: "Dibuat oleh (jabatan)", tipe: "teks", wajib: true, maks: 160},
    {k: "dilaporkan_ke", label: "Dilaporkan ke", tipe: "banyak", wajib: true, opsi: ["Kepala BNPB", "Sestama", "Deputi", "Direktur", "Unit lain di BNPB", "K/L lain", "BPBD", "Presiden atau KSP", "Publik"]},
    {k: "disimpan_di", label: "Disimpan di (database atau aplikasi)", tipe: "teks", maks: 200},
    {k: "cara_akses", label: "Cara unit lain mengambil datanya", tipe: "banyak", wajib: true, opsi: AKSES_DATA},
    {k: "butuh_unit", label: "Butuh masukan dari direktorat BNPB", tipe: "banyak", opsi: ["Tidak butuh", ...NAMA_UNIT]},
    {k: "butuh_unit_data", label: "Data yang dibutuhkan dari direktorat itu", tipe: "panjang", maks: 1000, syarat: {k: "butuh_unit", bukan: ["Tidak butuh"]}},
    {k: "butuh_kl", label: "Butuh masukan dari K/L", tipe: "banyak", opsi: ["Tidak butuh", ...KL]},
    {k: "butuh_kl_data", label: "Data yang dibutuhkan dari K/L itu", tipe: "panjang", maks: 1000, syarat: {k: "butuh_kl", bukan: ["Tidak butuh"]}},
    {k: "cakupan", label: "Cakupan wilayah terkecil", tipe: "pilih", wajib: true, opsi: ["Nasional", "Provinsi", "Kabupaten/kota", "Kecamatan", "Desa/kelurahan", "Titik koordinat"]},
    {k: "kode_wilayah", label: "Memakai kode wilayah resmi (Kemendagri/BPS)", tipe: "pilih", opsi: ["Ya", "Tidak", "Tidak tahu"]},
    {k: "satuan", label: "Satuan utama", tipe: "teks", maks: 160, bantu: "Misalnya jiwa, unit rumah, hektare, rupiah"},
    {k: "metode", label: "Cara menghitung", tipe: "panjang", maks: 1000},
    {k: "keyakinan", label: "Sumber angka", tipe: "pilih", wajib: true, opsi: ["Resmi terverifikasi", "Laporan BPBD", "Estimasi pusat", "Satelit atau penginderaan jauh", "Berita atau media sosial"]},
    {k: "akses", label: "Boleh dibuka untuk", tipe: "pilih", wajib: true, opsi: ["Terbuka untuk publik", "Terbatas internal BNPB dan K/L", "Tertutup, unit pemilik dan pimpinan"]},
    {k: "berbagi", label: "Kesiapan berbagi", tipe: "banyak", wajib: true, opsi: ["Siap lewat API", "Siap ekspor berkala", "Siap manual", "Perlu surat atau nota dinas", "Perlu persetujuan pimpinan"]},
    {k: "penyetuju", label: "Pejabat yang menyetujui berbagi", tipe: "teks", maks: 160},
    {k: "dipakai_di", label: "Dipakai di laporan", tipe: "banyak", opsi: ["Laporan harian bencana", "Laporan karhutla", "Lampiran laporan", "Dasbor pimpinan", "Paparan pimpinan", "Belum dipakai"]},
    {k: "sejak", label: "Tersedia sejak tahun", tipe: "angka", min: 1990, maks: 2026},
    {k: "ketersediaan", label: "Ketersediaan saat ini", tipe: "pilih", wajib: true, opsi: ["Ada dan rutin", "Ada sebagian", "Belum ada"]},
    {k: "alasan", label: "Alasan belum lengkap", tipe: "panjang", wajib: true, maks: 1000, syarat: {k: "ketersediaan", bukan: ["Ada dan rutin"]}},
    {k: "perkiraan", label: "Perkiraan kapan tersedia", tipe: "teks", maks: 160, syarat: {k: "ketersediaan", bukan: ["Ada dan rutin"]}},
    {k: "kesulitan", label: "Kesulitan selama ini", tipe: "banyak", opsi: ["Tidak ada", "Harus bersurat", "Data belum dirilis daerah", "SDM kurang", "Format tidak seragam", "Akses K/L sulit",
      "Standar hitung berbeda", "Data sering terlambat", "Tidak ada anggaran", "Jaringan atau perangkat terbatas"]},
    {k: "kesulitan_cerita", label: "Ceritakan kesulitannya", tipe: "panjang", maks: 2000, syarat: {k: "kesulitan", bukan: ["Tidak ada"]}},
  ],
  aplikasi: [
    {k: "nama", label: "Nama aplikasi", tipe: "teks", wajib: true, maks: 160},
    {k: "alamat", label: "Alamat web", tipe: "url", maks: 300},
    {k: "penjelasan", label: "Penjelasan aplikasi", tipe: "panjang", wajib: true, bantu: "Untuk apa, siapa yang mengisi, apa yang dihasilkan"},
    {k: "fungsi", label: "Fungsi utama", tipe: "banyak", wajib: true, opsi: ["Input data lapangan", "Basis data", "Dasbor atau visualisasi", "Peta atau GIS", "Pelaporan", "Peringatan dini",
      "Pengelolaan logistik", "Pengelolaan anggaran", "Persuratan", "Komunikasi"]},
    {k: "data_disimpan", label: "Data yang disimpan", tipe: "panjang", wajib: true, maks: 2000},
    {k: "pengelola", label: "Pengelola", tipe: "pilih", wajib: true, opsi: NAMA_UNIT},
    {k: "pengembang", label: "Dibangun oleh", tipe: "pilih", wajib: true, opsi: ["Tim internal unit", "Pusdatin", "Vendor atau pihak ketiga", "K/L lain", "Hibah mitra"]},
    {k: "pengguna", label: "Dipakai oleh", tipe: "banyak", wajib: true, opsi: ["Unit sendiri", "Seluruh BNPB", "BPBD", "K/L lain", "Publik"]},
    {k: "status", label: "Status", tipe: "pilih", wajib: true, opsi: ["Aktif dipakai", "Uji coba", "Jarang dipakai", "Tidak aktif"]},
    {k: "masuk", label: "Cara masuk", tipe: "pilih", opsi: ["Tanpa login", "Akun per orang", "Satu akun bersama", "SSO BNPB"]},
    {k: "akses_data", label: "Cara mengambil datanya", tipe: "banyak", wajib: true, opsi: AKSES_DATA},
    {k: "server", label: "Server", tipe: "pilih", opsi: ["Server Pusdatin BNPB", "Pusat Data Nasional", "Cloud", "Server vendor", "Server K/L lain", "Tidak tahu"]},
    {k: "terhubung", label: "Terhubung dengan aplikasi lain", tipe: "panjang", maks: 1000},
    {k: "kendala", label: "Kendala aplikasi", tipe: "panjang", maks: 2000},
  ],
  umum: [
    {k: "kebutuhan", label: "Data yang paling kamu butuhkan dari sistem", tipe: "panjang", wajib: true},
    {k: "prioritas", label: "Data yang wajib ada di laporan harian", tipe: "panjang", maks: 2000},
    {k: "kendala", label: "Kendala terbesar mengumpulkan data", tipe: "banyak", wajib: true, opsi: ["Harus bersurat", "Data belum dirilis daerah", "SDM kurang", "Format tidak seragam", "Akses K/L sulit",
      "Standar hitung berbeda", "Data sering terlambat", "Tidak ada anggaran", "Pembagian peran pusat dan daerah belum jelas"]},
    {k: "kendala_cerita", label: "Ceritakan kendalanya", tipe: "panjang", maks: 2000},
    {k: "usul", label: "Usulan perbaikan", tipe: "panjang", maks: 2000},
    {k: "setuju", label: "Data ini boleh dipakai bersama di Satu Data BNPB", tipe: "pilih", wajib: true, opsi: ["Ya", "Ya, dengan catatan"]},
    {k: "setuju_catatan", label: "Catatannya", tipe: "panjang", maks: 1000, syarat: {k: "setuju", sama: ["Ya, dengan catatan"]}},
  ],
};

/* teks bersih: NFC, tanpa karakter kontrol dan bidi, spasi dirapikan (baris baru dipertahankan di tipe panjang) */
const KONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁩﻿]/g;
const bersih = (v, panjang) => { const s = String(v).normalize("NFC").replace(KONTROL, ""); return (panjang ? s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ")).trim(); };
const kosong = v => v == null || v === "" || (Array.isArray(v) && !v.length);
const maksDari = c => c.maks ?? (c.tipe === "panjang" ? 2000 : 200);

function berlaku(c, o) {
  if (!c.syarat) return true;
  const v = o[c.syarat.k], vs = Array.isArray(v) ? v : kosong(v) ? [] : [v];
  if (!vs.length) return false;
  if (c.syarat.sama) return vs.some(x => c.syarat.sama.includes(x));
  return vs.some(x => !c.syarat.bukan.includes(x));
}

/* murni: (jenis, isian mentah, kirim) -> {isi} bersih atau {galat}. kirim=false (draf): kolom wajib boleh kosong, bentuk tetap diperiksa. */
export function periksaIsian(jenis, mentah, kirim = false) {
  const kolom = KOLOM[jenis]; if (!kolom) return {galat: "jenis isian tidak dikenal"};
  if (!mentah || typeof mentah !== "object" || Array.isArray(mentah)) return {galat: "isian harus objek"};
  const dikenal = new Set(kolom.flatMap(c => c.opsi ? [c.k, c.k + "_lain"] : [c.k]));
  for (const k of Object.keys(mentah)) if (!dikenal.has(k)) return {galat: `kolom tidak dikenal: ${String(k).slice(0, 40)}`};
  const isi = {};
  for (const c of kolom) {
    let v = mentah[c.k];
    if (typeof v === "string") v = bersih(v, c.tipe === "panjang");
    if (Array.isArray(v)) v = v.map(x => typeof x === "string" ? bersih(x) : x);
    if (kosong(v)) continue;
    if (c.tipe === "teks" || c.tipe === "panjang") {
      if (typeof v !== "string") return {galat: `${c.label} harus teks`};
      if (v.length > maksDari(c)) return {galat: `${c.label} maksimal ${maksDari(c)} huruf`};
    } else if (c.tipe === "pilih") {
      if (typeof v !== "string" || !(c.opsi.includes(v) || v === LAINNYA)) return {galat: `${c.label}: pilihan tidak dikenal`};
    } else if (c.tipe === "banyak") {
      if (!Array.isArray(v) || v.length > c.opsi.length + 1 || new Set(v).size !== v.length || !v.every(x => typeof x === "string" && (c.opsi.includes(x) || x === LAINNYA))) return {galat: `${c.label}: pilihan tidak dikenal`};
    } else if (c.tipe === "angka") {
      if (typeof v === "string" && /^\d{1,6}$/.test(v)) v = Number(v);
      if (!Number.isInteger(v) || v < c.min || v > c.maks) return {galat: `${c.label} harus angka ${c.min} sampai ${c.maks}`};
    } else if (c.tipe === "jam") {
      if (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return {galat: `${c.label} harus jam JJ:MM`};
    } else if (c.tipe === "url") {
      if (typeof v !== "string" || v.length > maksDari(c) || !/^https?:\/\/[^\s<>"]+$/i.test(v) || !URL.canParse(v)) return {galat: `${c.label} harus alamat web yang diawali http:// atau https://`};
    }
    isi[c.k] = v;
    if (c.opsi && (v === LAINNYA || (Array.isArray(v) && v.includes(LAINNYA)))) {
      const l = typeof mentah[c.k + "_lain"] === "string" ? bersih(mentah[c.k + "_lain"]) : "";
      if (l.length > 200) return {galat: `${c.label} (Lainnya) maksimal 200 huruf`};
      if (l) isi[c.k + "_lain"] = l;
    }
  }
  for (const c of kolom) if (!berlaku(c, isi)) { delete isi[c.k]; delete isi[c.k + "_lain"]; }
  if (kirim) for (const c of kolom) {
    if (!berlaku(c, isi)) continue;
    if (c.wajib && kosong(isi[c.k])) return {galat: `${c.label} wajib diisi`};
    const v = isi[c.k];
    if (c.opsi && (v === LAINNYA || (Array.isArray(v) && v.includes(LAINNYA))) && !isi[c.k + "_lain"]) return {galat: `${c.label}: tulis isian Lainnya`};
  }
  return {isi};
}

/* judul satu isian untuk daftar dan monitoring */
export const judulIsian = (jenis, isi) => jenis === "umum" ? JUDUL_JENIS.umum : String(isi?.nama || "(tanpa nama)");

/* teks satu kolom untuk tampilan dan CSV: larik digabung koma, Lainnya diganti isian manualnya */
export function teksKolom(c, isi) {
  const v = isi?.[c.k]; if (kosong(v)) return "";
  const ganti = x => x === LAINNYA && isi[c.k + "_lain"] ? `Lainnya: ${isi[c.k + "_lain"]}` : String(x);
  return Array.isArray(v) ? v.map(ganti).join(", ") : ganti(v);
}

/* akun: unit wajib dari UNIT; "lainnya" wajib menulis nama unit */
export const BERKAS = {maks: 10 * 1024 * 1024, per_isian: 5,
  tipe: {"application/pdf": "PDF", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel", "application/vnd.ms-excel": "Excel", "text/csv": "CSV",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word", "application/msword": "Word",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint", "image/png": "Gambar", "image/jpeg": "Gambar"}};
