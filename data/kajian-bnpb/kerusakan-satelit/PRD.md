# PRD: Perkiraan kerusakan satelit untuk Jitupasna

## Tujuan

Mempercepat awal Jitupasna dengan perkiraan awal bangunan terdampak (terendam atau terbakar) per kab dan kecamatan, hanya untuk bahaya yang sudah lulus uji balik, dan selalu berlabel perkiraan.

## Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Staf Jitupasna (Pusdalops, Koordalops) | Melihat perkiraan sebagai titik awal, menerima atau menolak per kab ke isian. |
| BPBD | Sama untuk kab wilayahnya. |
| Pimpinan | Tidak melihat angka satelit; hanya cacah resmi. |

## Fitur

| Kode | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Pipeline per bahaya (karhutla menunggu target uji, Q9): citra sebelum dan sesudah, peta terdampak, tumpang tindih dengan bangunan, agregat per kab dan kecamatan. | D6 |
| F-2 | Uji balik terkunci per bahaya dengan vonis (menunggu uji, gagal, lulus terbatas, lulus) disimpan dan tampil. | D1, D2 |
| F-3 | Kartu "Perkiraan satelit" di halaman Jitupasna: status uji; bila lulus, angka terdampak per kab berlabel "perkiraan satelit, belum diverifikasi" beserta tanggal citra dan keyakinan. | D2, D4 |
| F-4 | Terima ke isian: staf memilih kab, tingkat ditetapkan staf (D9), baris isian tercatat `unit_asal` baru dan catatan asal. | D4, D5, D9 |
| F-5 | Riwayat: perkiraan tiap citra baru tersimpan, perkiraan lama tidak ditimpa. | D4 |
| F-6 | Gempa: kartu tampil status "gagal uji" dengan tautan ke ringkasan percobaan, tanpa angka. | D2, Q2 |

## Larangan

- Tidak ada angka bangunan rusak untuk bahaya yang belum lulus uji.
- Perkiraan satelit tidak dijumlahkan dengan cacah resmi atau rekap rumah rusak; ditampilkan berdampingan.
- Tidak ada tingkat RB, RS, RR dari satelit.
- Tidak ada keluaran tingkat bangunan di `public/`; tidak ada nama atau penghuni.
- Tidak ada tabel rumah rusak kedua dan tidak ada buku kejadian kedua.
- Tidak ada klaim "rumah anda rusak" ke warga.
