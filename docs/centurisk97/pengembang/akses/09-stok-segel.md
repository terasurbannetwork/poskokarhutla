# Stok LogPal dan segel dokumen

Halaman ini menguraikan metode stok LogPal dan alur permintaan, serta rancangan segel dokumen yang belum diimplementasi.

## M7. Stok LogPal dan alur permintaan

Perubahan stok terjadi dalam satu batch D1 dengan UPDATE bersyarat (`catatMutasi`, `src/logpal.js:170`):

```
Masuk:               jumlah += j; baik += j; syarat jumlah + j <= 100.000.000
Keluar, Penghapusan: jumlah -= j; baik = max(0, baik - j);
                     rusak -= max(0, j - baik); syarat jumlah >= j
Baris mutasi ditulis hanya bila UPDATE mengubah satu baris (WHERE changes() > 0).
changes = 0 berarti 409.
Opname dengan penyesuaian: jumlah = fisik; baik = min(baik, fisik);
                           rusak = min(rusak, fisik - baik baru)
```

Yang baik diambil dahulu, sisanya dari yang rusak, sehingga `baik + rusak <= jumlah` selalu terjaga (CHECK di migrasi 0112).

Alur tahap permintaan (`FLOW`): Tanggap darurat memiliki enam tahap (rapat koordinasi lintas sektor, komandan tanggap darurat, kepala gudang, distribusi, pelaporan kepala gudang, selesai). Penguatan kesiapsiagaan memiliki sebelas tahap (surat permohonan sampai selesai). Trigger `logpal_permintaan_alur` mengizinkan tahap naik satu per satu atau ditolak sekali; yang ditolak tidak bergerak. Klien mengirim tahap yang dilihatnya (`dari`); beda dengan server menghasilkan 409. Permintaan Tanggap darurat wajib status dan nomor penetapan darurat; satu permintaan memuat 1 sampai 40 barang.

Perhitungan layar kesiapan audit (klien, `public/logpal/logpal.js`):

| Besaran | Rumus |
| --- | --- |
| Kedaluwarsa | lewat bila tanggal sebelum hari ini (Asia/Jakarta); dekat bila 90 hari atau kurang |
| Akurasi stok | satu dikurangi (selisih mutlak fisik terhadap kartu, dibagi kartu), dibatasi 0 sampai 100, persen utuh |
| Pemenuhan penyaluran | diterima / dikirim, dibatasi 0 sampai 100 |
| Nilai buku | `nilai x max(0, 1 - umur / masa manfaat)` garis lurus, dibulatkan ke ribuan rupiah; masa manfaat menurut kategori (KMK 295/2019). Berlabel perkiraan |
| Jam tempuh | perkiraan dari jarak garis lurus dan kecepatan rata-rata moda. Berlabel perkiraan |
| Standar minimal | draf Juklak 2024 pada service level 10, 20, 30 persen; versi resmi belum didapat |

Sebelas uji kesiapan audit: berita acara opname semester ini, fisik sama dengan kartu, pencatatan rinci per spesifikasi, persediaan punya kode harga dokumen lokasi, tanggal kedaluwarsa pangan dan obat, dokumen serah terima penyaluran, konfirmasi penerimaan, kode barang dan NUP peralatan, label peralatan, dokumen kepemilikan peralatan, serta nilai dan tahun perolehan. Satu uji lolos bila seluruh baris sasaran memenuhi syarat; bila sasarannya nol, status "Belum ada data" (bukan lolos dan bukan 0 persen).

Teks yang diawali `=`, `+`, `-`, `@`, tab, atau CR ditolak server pada kolom teks barang, mutasi, dan opname, dan dinetralkan (awalan `'`) pada ekspor CSV.

## M8. Segel dokumen (rancangan, belum diimplementasi)

Bagian ini mencatat rancangan agar pengembang berikutnya tidak mengulang keputusan. Seluruhnya belum berjalan di kode.

| Aspek | Rancangan |
| --- | --- |
| Kode segel | 10 huruf dari abjad Crockford base32 (tanpa I, L, O, U), sekitar 50 bit, acak, bukan nomor urut; tampil `ABCDE-FGHJK`. Masukan dinormalkan: huruf besar, buang spasi dan tanda hubung, O menjadi 0, I dan L menjadi 1 |
| Bentrok kode | ditangani kunci utama D1; ulang paling banyak 3 kali |
| Sidik | `lk`: `lk_snapshot.hash`; `lkb`: `lkb_snapshot.hash`; `pb`: `pb_dokumen.sha`; `lj` (fase 2): `lj_beku.sidik`. Segel tidak membekukan apa pun sendiri dan hanya menempel pada titik beku yang ada |
| Dicek ulang saat dibuka | server menghitung ulang SHA-256 isi sumber dan membandingkannya dengan sidik di segel |
| Status | cabut ada, maka Dicabut; isi sumber hilang atau SHA-256 berbeda, maka Tidak cocok; ada segel dengan rujukan dasar sama dan versi lebih tinggi, maka Ada versi lebih baru; selain itu Berlaku. Dicabut diperiksa lebih dulu dari Tidak cocok |
| Batas laju | 60 pencarian per 10 menit per hash IP (bawaan sementara Q9); kode salah format dan kode tidak ada dijawab sama (404) |
| Beban | paling banyak 3 baca D1 per pembukaan; jawaban `no-store` |
| QR | memuat `https://centurisk97.id/verifikasi/<kode>`; di bawahnya tercetak kode dan 12 huruf awal sidik supaya dapat dicek tanpa kamera |
| Baris dummy | tidak disegel (aturan pemilik 11 November 2026) |

Status uji balik: tidak berlaku; ini mekanisme verifikasi integritas, bukan model prediksi. Batas klaim: segel bukan tanda tangan elektronik tersertifikasi.
