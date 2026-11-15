# PRD: 3W dan pintu tawaran bantuan

## Tujuan

Per kejadian, BNPB melihat siapa mengerjakan apa di kab mana per klaster, celah dan tumpang tindih terlihat, dan setiap tawaran bantuan tercatat, dicocokkan ke kebutuhan, lalu diputuskan dengan alasan.

## Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Pusdalops, koordinator klaster | Mencatat dan memperbarui 3W, membuat tautan untuk organisasi, memutuskan tawaran (Q1). |
| Organisasi luar | Mengisi kehadirannya dan tawarannya lewat tautan bertoken tanpa akun. |
| BPBD | Melihat 3W kab wilayahnya. |
| Pimpinan | Ringkasan celah, tumpang tindih, tawaran per status. |

## Fitur

| Kode | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Register organisasi `org` dengan jenis baku, tautan ke `institusi` untuk kampus. | D1 |
| F-2 | Isian 3W oleh staf. | D2, D3 |
| F-3 | Tautan bertoken per organisasi per kejadian; organisasi mengisi baris 3W dan tawarannya sendiri. | D4, Q6 |
| F-4 | Kartu 3W di halaman kejadian `/siklus`: tabel kab x klaster dengan jumlah organisasi, tanda celah dan tumpang tindih; klik sel menampilkan organisasi. | D8, Q4 |
| F-5 | Daftar tawaran per kejadian dengan status, alasan, mitra lokal. | D5, Q2 |
| F-6 | Pencocokan: untuk tiap tawaran, daftar kebutuhan meja logistik dan LogPal di kab kejadian dengan barang sama. | D6 |
| F-7 | Keputusan tawaran oleh staf berhak, riwayat append-only. | D5, Q1 |

## Larangan

- Tanpa router WA (K3).
- Mesin tidak memutuskan tawaran.
- Tidak publik (Q3); organisasi hanya melihat baris miliknya.
- Tanpa nilai rupiah (Q5).
- Tidak ada buku kejadian kedua.
