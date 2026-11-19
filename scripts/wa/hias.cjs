// Ikon dan format pesan bot (pemilik 19 Nov 2026: "pakai icon/emoji biar ga terlalu polos, tapi jangan overuse"; "kalau nyebutin command,
// formattingnya pake codeblock"; "mainin formatting, tapi jangan jadi keliatan berantakan").
// Ikon: paling banyak SATU per pesan, di depan judul tebal baris pertama, dipilih dari kata di judul. Pesan tanpa judul tebal, atau yang sudah
// berikon, tidak diberi ikon. Perintah: kata perintah yang ditulis tebal di mesin proyek (*lanjut*, *revisi P-...*, *1*) jadi kode `lanjut`
// supaya terlihat bisa diketik; judul tebal (huruf besar di awal) tidak disentuh. Dipasang di gateway saat mengirim, jadi isi pesan mesin
// proyek (dan ujinya) tetap polos.
// Urutan aturan ikon penting: yang lebih khusus lebih dulu.
const ATURAN = [
  [/gagal|ditolak|belum bisa|belum terbaca|belum siap|tidak ditemukan|tidak ada|habis|batas/i, '⚠️'],
  [/dibatalkan|batalkan/i, '🗑️'],
  [/perlu dipastikan|bertanya|pilih|ragu/i, '❓'],
  [/sedang dibangun|sedang dibuat|sedang dikerjakan|sibuk|antre|tunggu/i, '⏳'],
  [/ada revisi|menerima revisi/i, '✏️'],
  [/pemakaian|saldo|biaya/i, '💰'],
  [/changelog|versi/i, '📝'],
  [/halo/i, '👋'],
  [/cara pakai|panduan|bantuan/i, '📘'],
  [/kirim bahan|bahan wajib|diterima|bahan disimpan/i, '📥'],
  [/selesai|final/i, '🎉'],
  [/siap|diatur|tersimpan|pratinjau|pptx/i, '✅'],
]
const BERIKON = /^\p{Extended_Pictographic}/u

const KODE = /P-\d{6}-\d{2}/
// kata perintah bot (huruf kecil di awal, persis seperti diketik pemakai), boleh dengan kode proyek atau tanggal pendek
const PERINTAH = new RegExp(String.raw`\*((?:buat(?: (?:harian|penanganan|saja))?(?: (?:kemarin|hari ini|\d{1,2} [a-z]{3}|\d{1,2}/\d{1,2}|\d{4}-\d{2}-\d{2}|` + KODE.source + String.raw`))?` +
  String.raw`|lanjut|selesai|ulangi|pptx|versi|bantuan|panduan|changelog(?: semua)?|biaya|terima kurang|ya|hitung|tunggu|status(?: \d{1,2} [a-z]{3})?` +
  String.raw`|(?:batal|final|revisi|versi|pptx)(?: ` + KODE.source + String.raw`)?|balik v\d+|kirim ulang [a-z0-9 ]{1,30}|[1-5]))\*`, 'g')

function kodePerintah(teks) {
  return String(teks ?? '').replace(PERINTAH, (_, k) => '`' + k + '`')
}

function hias(teks) {
  const t = kodePerintah(teks)
  const m = t.match(/^\*([^*\n]+)\*(\n|$)/)
  if (!m || BERIKON.test(t)) return t
  for (const [re, ikon] of ATURAN) if (re.test(m[1])) return `${ikon} ${t}`
  return t
}

module.exports = { hias, kodePerintah, ATURAN }
