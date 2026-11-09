# ALGORITMA-LOGPAL

Sumber kebenaran: `src/logpal.js` (server) dan `public/logpal/logpal.js` (klien). Bila berbeda dengan dokumen ini, kode menang.

## Stok (server)
- Masuk: `jumlah += j`, `baik += j`, syarat `jumlah + j <= 100000000`.
- Keluar atau Penghapusan: `jumlah -= j`, `baik = max(0, baik - j)`, `rusak -= max(0, j - baik)`, syarat `jumlah >= j`. Yang baik diambil dulu, sisanya dari yang rusak, sehingga `baik + rusak <= jumlah` selalu terjaga (CHECK di 0112).
- Baris mutasi ditulis `WHERE changes() > 0`. `meta.changes = 0` berarti 409.
- Opname dengan penyesuaian: `jumlah = fisik`, `baik = min(baik, fisik)`, `rusak = min(rusak, fisik - baik baru)`.

## Alur tahap permintaan
- Tanggap darurat: Rapat koordinasi lintas sektor, Komandan tanggap darurat, Kepala gudang, Distribusi, Pelaporan kepala gudang, Selesai.
- Penguatan kesiapsiagaan: Surat permohonan, Diagendakan di Deputi, Disposisi Direktur Logistik, Penelaahan Kasubdit, Usulan ke Direktur Logistik, Arahan Direktur Logistik, Surat perintah pengeluaran dan berita acara, Distribusi, Pengecekan barang, Pelaporan, Selesai.
- Trigger `logpal_permintaan_alur`: tahap hanya naik 1, tolak sekali, yang ditolak tidak bergerak. Klien mengirim `dari` (tahap yang dilihatnya); beda dengan server = 409.

## Perhitungan layar (klien)
- Kedaluwarsa: lewat bila tanggal < hari ini (Asia/Jakarta), dekat bila <= 90 hari.
- Nilai buku: `nilai x max(0, 1 - umur / masa manfaat)` garis lurus, dibulatkan ke ribuan rupiah; masa manfaat dari kategori (KMK 295/2019): 5 tahun bawaan dan komunikasi, 7 kendaraan, 10 perahu, mesin perahu, alat berat, genset, pompa, chainsaw. Hasilnya perkiraan.
- Akurasi stok: `1 - |fisik - kartu| / kartu`, dibatasi 0 sampai 100, persen utuh. Pemenuhan penyaluran: diterima / dikirim, dibatasi 0 sampai 100.
- Jam tempuh jaringan: perkiraan dari jarak garis lurus dan kecepatan rata-rata moda (data statis), ditampilkan jam utuh berlabel perkiraan. Rata-rata tertimbang memakai pengungsi rata-rata + 1.
- Standar minimal: draf Juklak 2024 dengan service level 10, 20, 30 persen. Versi resmi belum didapat (KEPUTUSAN Q4).
- Kesiapan audit: 11 uji, setiap uji lolos bila semua baris sasaran memenuhi syarat; "belum ada data" bila sasarannya nol.

## Teks diawali rumus
Server menolak nilai teks yang diawali `=`, `+`, `-`, `@`, tab, CR. Ekspor CSV menambah awalan `'` pada sel teks berawalan itu; sel bertipe angka tidak disentuh.
