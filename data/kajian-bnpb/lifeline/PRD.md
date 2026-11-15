# PRD: Status Lifeline

## Tujuan

Untuk tiap kejadian aktif, pimpinan dan Pusdalops melihat dalam satu kisi: kab terdampak x delapan layanan, dengan warna resmi, bukti, dan kapan terakhir diperbarui. Staf menetapkan warna dengan bantuan usulan mesin dari isyarat yang sudah masuk sistem.

## Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Pusdalops, Koordalops | Menetapkan dan memperbarui status, melihat usulan dan buktinya. |
| BPBD | Menetapkan status kab wilayahnya (Q2), melampirkan catatan. |
| Pimpinan | Membaca kisi dan linimasa pulih tanpa harus bertanya. |

## Fitur

| Kode | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Kisi kab x layanan per kejadian, empat warna, tanda lewat 24 jam. | D1, D2, Q7 |
| F-2 | Usulan mesin per sel dari isyarat Lapor Warga, logbook, meja dampak, meja pengungsi, titik pengungsian; tampil dengan daftar buktinya. | D3, Q3 |
| F-3 | Tetapkan status resmi dengan minimal satu bukti (pilih isyarat atau tulis catatan). | D3, D4, Q2 |
| F-4 | Riwayat per sel, linimasa pulih. | D5 |
| F-5 | Konteks provinsi: padam internet IODA, ditampilkan terpisah. | D6 |
| F-6 | Ringkasan di `/bnpb/dalops` per kejadian. | Q4 |
| F-7 | Tabel di Laporan Berkala. | Q5 |
| F-8 | Isyarat listrik dari lampu malam satelit setelah uji balik lulus. | D7, Q6 |

## Larangan

- Mesin tidak pernah menetapkan status resmi.
- Tidak ada warna selain abu tanpa bukti.
- IODA per provinsi tidak pernah menjadi warna kab.
- Tidak publik (Q4) dan tanpa nama pelapor warga di bukti.
- Tidak ada buku kejadian kedua.
