/* Penyamar teks sebelum dikirim ke layanan model (Lapor Bencana AI D12; bot laporan Q4).
   ponytail: salinan sementara dari scripts/wa/claude.mjs (berkas itu sedang disunting sesi lain 19 Nov 2026). LA-03: claude.mjs
   mengimpor dari sini dan salinannya di sana dihapus, supaya satu sumber. Ubah keduanya bersamaan sampai itu terjadi. */
const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g
// NIK: 16 digit dalam paling banyak empat kelompok berpemisah tunggal (spasi, titik, strip), misal 16 rapat, 4-4-4-4, 6-6-4, 6-2-2-6.
// Batas empat kelompok menjaga deret angka laporan ("10 20 30 40 50 60 70 80") tidak ikut tersamar.
const RE_NIK = /(?<![\d.,])\d+(?:[ .-]\d+){0,3}(?!\d|[.,-]\d)/g
const RE_HP_KURUNG = /\((?:\+62|62|0)[ .-]?8\d{1,3}\)[ .-]?\d{3,4}(?:[ .-]?\d{2,5}){1,2}(?!\d)/g
const RE_HP = /(?<![\d+])(?:\+62|62|0)[ .-]?8(?:[ .-]?\d){7,12}(?!\d)/g
export function samarkan(teks) {
  if (teks == null) return teks
  return String(teks).replace(RE_EMAIL, '[email]')
    .replace(RE_HP_KURUNG, '[nomor HP]')
    .replace(RE_NIK, (m) => m.replace(/\D/g, '').length === 16 ? '[NIK]' : m)
    .replace(RE_HP, '[nomor HP]')
}
