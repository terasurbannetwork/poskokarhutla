// Nama, versi, dan changelog Bot Laporan BNPB (pemilik 19 Nov 2026: "Nama Bot: Bot Laporan BNPB, tampilin versi berapa, bisa liat changelog
// versi"; "buat versioning, kamu yang urus setelahnya ya"). Penomoran pemilik: v0 = bot terjadwal awal, v1 = bot proyek (18 Nov),
// v2 = agen Claude Code (19 Nov), v2.1 = kecerdasan percakapan.
// ATURAN (gerbang tests/wa/versi.test.mjs): tiap perubahan perilaku bot di scripts/wa menaikkan VERSI dan menambah entri CHANGELOG paling
// atas dengan versi yang sama. Patch (x.y.Z) = perbaikan; minor (x.Y) = kemampuan baru; mayor (X) = cara kerja baru.
// Isi changelog ditulis untuk pemakai: kalimat biasa, tanpa nama berkas atau istilah teknis.

export const NAMA_BOT = 'Bot Laporan BNPB'
export const VERSI = '2.1'

export const CHANGELOG = [
  { versi: '2.1', tanggal: '2026-11-19', isi: [
    'Bot paham kalimat biasa: misalnya "bikinin laporan harian kemarin", "udah oke finalkan", atau "laporanku gimana". Final dan batal tetap ditanya dulu.',
    'Bisa bertanya tentang isi draf ("slide 3 isinya apa") tanpa mengubah draf.',
    'Revisi panjang: ketik *revisi*, kirim revisinya dalam beberapa pesan (boleh diteruskan), lalu *lanjut*; semuanya dikerjakan sekaligus.',
    'Bahan WA yang formatnya berantakan dirapikan Claude bila tidak terbaca, tanpa mengubah angka, lalu laporan dibangun ulang.',
  ] },
  { versi: '2.0.2', tanggal: '2026-11-19', isi: [
    'Pemakaian bulan ini dihitung dari catatan harian lengkap, tidak lagi hanya sejak fitur biaya dipasang.',
    'Perintah pemilik *saldo* (misalnya *saldo 192,54*): bot menghitung sisa kredit Console.',
    'Nama bot, nomor versi, dan perintah *changelog*.',
    'Satu ikon di depan judul pesan supaya lebih mudah dibaca.',
  ] },
  { versi: '2.0.1', tanggal: '2026-11-19', isi: [
    'Sesudah *final*, bot menyebut biaya Claude laporan itu; perintah pemilik *biaya*.',
    'Kalau gagal, penyebabnya langsung tertulis di chat.',
    '*batal* menghapus semua bahan laporan itu, jadi *buat* berikutnya mulai dari awal.',
    'Kabar galat ke pemilik tidak lagi hilang diam-diam.',
    'Laporan harian tetap terbaca walau format WA Koordalops berubah (penomoran "1 .Bencana", label salah tulis, "Kota.").',
    'Laporan kejadian bencana harian tidak lagi menulis keterangan cut-off.',
  ] },
  { versi: '2.0', tanggal: '2026-11-19', isi: [
    'Bot V2 untuk nomor pemilik: Claude Code menyusun laporan di mesin bot, mengikuti laporan final kemarin dan pedoman dari kerja laporan sepekan terakhir.',
    'Revisi bebas, termasuk tata letak (hapus atau lebarkan panel), dalam satu percakapan per laporan.',
    'Angka hotspot, firespot, luas terbakar, dan belum padam dijaga mesin; draf yang mengubahnya ditolak.',
  ] },
  { versi: '1.1', tanggal: '2026-11-18', isi: [
    'Jawaban singkat atas pertanyaan revisi bot (misalnya "ya") dipahami.',
    'Balasan lebih cepat (2 sampai 4 detik); tanpa pesan kemajuan, cukup "sedang mengetik".',
    'Perintah *panduan* mengirim PDF; draf tersimpan dengan benar; revisi lewat WA bisa dipakai.',
  ] },
  { versi: '1.0', tanggal: '2026-11-18', isi: [
    'Bot proyek: *buat harian* atau *buat penanganan*, kirim bahan, *lanjut*, revisi dengan kalimat biasa, *final* ke Drive Tim IT.',
    'Menu angka di draf, riwayat *versi*, *balik v2*, *pptx*, *ulangi*, *batal*, status data satelit untuk laporan karhutla.',
    'Hanya nomor terdaftar yang bisa memakai bot.',
  ] },
  { versi: '0', tanggal: '2026-10-29', isi: [
    'Bot terjadwal: laporan harian dan laporan penanganan karhutla dibuat otomatis pada jam tetap dari bahan WA, tanpa revisi lewat chat.',
  ] },
]

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const tgl = (iso) => `${Number(iso.slice(8, 10))} ${NAMA_BULAN[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
export const labelVersi = (mode = null) => `${NAMA_BOT} v${VERSI}${mode ? ` (mode ${mode})` : ''}`

// Pesan *changelog*: n entri terbaru (bawaan 3), tiap entri versi, tanggal, dan butir perubahannya.
export function tChangelog(n = 3) {
  const blok = CHANGELOG.slice(0, n).map((c) => [`*v${c.versi}* (${tgl(c.tanggal)})`, ...c.isi.map((x) => `- ${x}`)].join('\n'))
  return [`*Changelog ${NAMA_BOT}*`, '', `Versi sekarang: v${VERSI}.`, '', ...blok.flatMap((b) => [b, '']),
    CHANGELOG.length > n ? `Ketik *changelog semua* untuk ${CHANGELOG.length} versi.` : ''].join('\n').trim()
}
