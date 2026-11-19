# KEAMANAN-PRIVASI: Lapor Bencana BNPB

## Data yang disimpan

| Data | Di mana | Siapa membaca | Catatan |
| --- | --- | --- | --- |
| Nomor WA, nama, peran, kab, jabatan pelapor | D1 `lapor_pelapor` | Staf monitoring (Q12), admin | Tidak di `public/data`, tidak di log, tidak ke AI. PDF menulis nomor sebagian |
| Isian laporan | D1 `lapor_sesi`, `lapor_versi` | Pelapornya, staf, admin | Korban hanya angka; teks bebas disaring `teksBersih` |
| Transkrip | D1 `lapor_pesan` | Staf, admin, pelapornya | Disaring `teksBersih` sebelum simpan |
| Foto | R2 `lapor/` | Staf, admin, pelapornya | Metadata dibersihkan `bersihMedia`; koordinat dan jam disimpan terpisah di D1 |
| PDF | R2 `lapor/pdf/` | Pelapornya, staf, admin | Dikirim ke WA pelapor saja |
| Riwayat tiket | D1 `lapor_tiket_riwayat` | Staf, admin | Append-only |

Nomor uji pertama dan nomor mana pun tidak pernah ditulis di repo (repo publik). Perintah `lapor izin` diketik pemilik di WA.

## Ke layanan luar

- Ke Claude API (Q2): hanya teks pesan pelapor sesudah `samarkan` (HP, NIK, surel diganti) dan daftar nama isian. Tanpa identitas pelapor, tanpa foto (Q4), tanpa koordinat.
- Ke WA: balasan ke pelapor sendiri; F0 salinan ke PEMILIK. Tidak ada kiriman ke pihak lain tanpa keputusan pemilik (Q5).

## Akses

- Rute pelapor: sesi `/masuk` (nomor akun = pemilik sesi) atau gateway berkunci `WA_MESIN` yang membawa nomor pengirim. Sesi orang lain = 404, tidak membocorkan keberadaan.
- Token kamera dan token cetak: acak 32 byte, disimpan sha256, terikat satu sesi, kedaluwarsa (kamera 24 jam, cetak 10 menit), token kamera bukan sekali pakai: berlaku 24 jam untuk satu laporan, paling banyak 20 foto.
- Monitoring dan perubahan status: staf atau admin (Q12); jawaban `cache-control: private, no-store`, `x-robots-tag: noindex`.
- Semua masukan divalidasi panjang dan tipe; teks yang ditampilkan di layar disisipkan sebagai teks, bukan HTML (pemeriksa `security-reviewer`).

## Persetujuan (UU 27/2022 PDP)

Pesan L-SAPA pertama memuat satu kalimat: "Data laporan dan nomor Anda dipakai BNPB untuk penanganan bencana." Pelapor yang mengetik `hapus data` mendapat konfirmasi; identitasnya diganti "dihapus atas permintaan" dan transkripnya dikosongkan, isian kejadian tetap (bukan data pribadi). Lama simpan transkrip dan foto: menunggu pemilik; **[BAWAAN SEMENTARA]** 2 tahun.

## Penyalahgunaan

- Batas laju per nomor (DESAIN-TEKNIS). Nomor di luar izin pada F0 tidak menyentuh mesin lapor.
- Laporan warga tidak pernah membuat kejadian resmi atau tampil publik (D7), jadi laporan palsu tidak sampai ke publik.
- Foto berlencana jujur: "Lokasi WA" lebih lemah dari "GPS perangkat"; GPS janggal ditandai `nilaiGps`.
- Prompt injection: teks pelapor diperlakukan sebagai data di prompt; keluaran model hanya diterima lewat skema dan validator kutipan (D2, D3), jadi model tidak bisa mengubah alur, status tiket, atau penerima.
