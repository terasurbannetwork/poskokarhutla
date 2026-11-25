// Peran satu proses gateway WA (pemilik 24 Nov 2026: "buat jadi 2 bot terpisah aja"). Satu kode gateway, dipasang dua kali:
//  - lapor   : nomor WA lama. Lapor Bencana (lapor_wa.mjs, `lapor izin|cabut`) dan antrean Worker (lapangan_tarik.mjs: kode /masuk, relawan /petugas).
//  - laporan : nomor WA baru. Bot Laporan BNPB (proyek, perintah, `setuju|tolak`, nomor bl_daftar), bahan WA_IZIN, grup OPERASI_GRUP,
//              logbook LOGBOOK_GRUP, Drive, OCR, otomatis.mjs.
//  - semua   : bawaan bila WA_PERAN kosong; perilaku sebelum pemisahan (satu nomor memegang keduanya), dipakai sampai nomor baru terpasang.
// Tiap proses punya rumah sendiri (WA_RUMAH: sesi WA, outbox, jatah limiter) dan PORT sendiri; keduanya diisi di plist launchd, bukan .env bersama.
const PERAN = ['semua', 'lapor', 'laporan']

// env -> {peran, lapor, laporan}; nilai lain = galat (lebih baik gateway berhenti daripada diam-diam memegang dua bot).
function bacaPeran(env = process.env) {
  const p = String(env.WA_PERAN ?? '').trim().toLowerCase() || 'semua'
  if (!PERAN.includes(p)) throw new Error(`WA_PERAN tidak dikenal: "${env.WA_PERAN}" (pilih ${PERAN.join(', ')})`)
  return { peran: p, lapor: p !== 'laporan', laporan: p !== 'lapor' }
}

module.exports = { PERAN, bacaPeran }
