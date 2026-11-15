# PRD: Kaji ulang pasca-kejadian

## Tujuan

Tiap kejadian besar di Buku Besar dapat kaji ulang yang disusun dari data sistem: linimasa deteksi sampai pulih, durasi tiap tahap, celah data, lalu pelajaran dan rekomendasi yang ditulis staf. Tiap rekomendasi punya penanggung jawab, tenggat, dan status yang dilacak sampai tertutup dengan bukti.

## Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Pusdalops, Koordalops | Melihat draf, menulis pelajaran dan rekomendasi, memperbarui status rekomendasi. |
| Koordalops, Super Admin | Mengesahkan kaji ulang (Q3). |
| BPBD | Membaca kaji ulang yang sudah disahkan untuk kab wilayahnya (Q6); tidak menulis di fase ini (Q13). |
| Pimpinan | Membaca kaji ulang, daftar rekomendasi terbuka dan lewat tenggat, cetak A4. |

## Fitur

| Kode | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Daftar kandidat kaji ulang: kejadian selesai yang memenuhi kriteria kejadian besar, dengan status kaji ulangnya (belum, draf, disahkan). | Q1 |
| F-2 | Draf otomatis: linimasa gabungan, durasi tahap dengan tanda "tidak ada data", ringkasan fase dan jejak, status layanan dasar, 3W, kutipan catatan lapangan. | D2, D6 |
| F-3 | Kerangka isian pelajaran empat pertanyaan (diharapkan, terjadi, baik, perbaiki), tiap pelajaran bertaut ke peristiwa linimasa bila ada. | RISET 1 |
| F-4 | Angkat catatan lapangan `ops_pelajaran` menjadi pelajaran kejadian. | D4 |
| F-5 | Rekomendasi dengan penanggung jawab, tenggat, dan status dilacak lewat `dl_tindak`; riwayat per rekomendasi. | D3, D7, Q4, Q5 |
| F-6 | Pengesahan dan potret beku, cetak A4 bernomor versi. | D8, Q3, Q7 |
| F-7 | Daftar rekomendasi lintas kejadian: terbuka, lewat tenggat, tertutup, per unit. | Q4 |

## Larangan

- Mesin tidak pernah menulis pelajaran atau rekomendasi.
- Tidak ada nama personel lapangan atau pelapor warga di draf, potret, atau ekspor.
- Tidak ada angka nol untuk data yang tidak ada: selalu "tidak ada data".
- Tidak ada buku kejadian kedua dan tidak ada tabel status kedua di luar `dl_tindak`.
- Tidak publik dan tidak ada berkas di `public/`.
- Tanpa kalimat menyalahkan individu; kaji ulang menilai sistem dan prosedur.
