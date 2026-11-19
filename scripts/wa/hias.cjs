// Ikon pesan bot (pemilik 19 Nov 2026: "pakai icon/emoji biar ga terlalu polos, tapi jangan overuse").
// Aturan: paling banyak SATU ikon per pesan, di depan judul tebal baris pertama, dipilih dari kata di judul. Pesan tanpa judul tebal,
// atau yang sudah berikon, tidak diubah. Dipasang di gateway saat mengirim, jadi isi pesan mesin proyek (dan ujinya) tetap polos.
// Urutan aturan penting: yang lebih khusus lebih dulu.
const ATURAN = [
  [/gagal|ditolak|belum bisa|belum terbaca|belum siap|tidak ditemukan|tidak ada|habis|batas/i, '⚠️'],
  [/dibatalkan|batalkan/i, '🗑️'],
  [/perlu dipastikan|bertanya|pilih|ragu/i, '❓'],
  [/sedang dibangun|sedang dibuat|sedang dikerjakan|sibuk|antre|tunggu/i, '⏳'],
  [/pemakaian|saldo|biaya/i, '💰'],
  [/changelog|versi/i, '📝'],
  [/halo/i, '👋'],
  [/cara pakai|panduan|bantuan/i, '📘'],
  [/kirim bahan|bahan wajib|diterima|bahan disimpan/i, '📥'],
  [/selesai|final/i, '🎉'],
  [/siap|diatur|tersimpan|pratinjau|pptx/i, '✅'],
]
const BERIKON = /^\p{Extended_Pictographic}/u

function hias(teks) {
  const t = String(teks ?? '')
  const m = t.match(/^\*([^*\n]+)\*(\n|$)/)
  if (!m || BERIKON.test(t)) return t
  for (const [re, ikon] of ATURAN) if (re.test(m[1])) return `${ikon} ${t}`
  return t
}

module.exports = { hias, ATURAN }
