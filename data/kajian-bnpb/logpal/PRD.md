# PRD-LOGPAL

## Tujuan
Satu tempat untuk stok logistik dan peralatan gudang BNPB dan BPBD, dengan jejak mutasi, stok opname yang bisa diaudit, dan permintaan bantuan BPBD ke BNPB yang tahapnya terlihat.

## Peran
| Peran | Masuk lewat | Boleh |
| --- | --- | --- |
| BPBD provinsi (akun pemprov) | `/instansi` | baca gudang provinsi cakupan, tulis gudang miliknya, ajukan dan lihat permintaan sendiri |
| BPBD kab/kota (pemkab, pemkot) | `/instansi` | baca dan tulis gudang miliknya, ajukan dan lihat permintaan sendiri |
| Staf BNPB (pusdalops, koordalops, pimpinan) dan moderator | `/admin/masuk` | baca semua, tulis gudang BNPB, proses tahap, lihat kebutuhan |
| Super Admin, admin | token admin | semua di atas ditambah dummy (dummy: Super Admin saja) |
| Akun polda, kodam, tanpa peran logistik, anonim | | ditolak |

## Fitur (11 tab)
Stok, Standar minimal, Kebutuhan, Jaringan logistik (pantau, data statis dan stok); Permintaan bantuan; Input stok; Mutasi barang; Stok opname beserta label QR; Pembuat laporan (8 jenis, unduh CSV atau HTML); Kesiapan audit (11 uji).

## Larangan
- Tidak ada data gudang asli di repo.
- Tidak ada angka karangan: jam tempuh, nilai buku, dan stok perkiraan berlabel perkiraan.
- Tidak ada fitur di luar dokumen ini tanpa tiket baru; fitur riset (pelacakan pengiriman, FEFO, KPI) belum dibangun.
- Tidak menulis kata "Pantau Bencana".
- Tidak menyambung SIMAN, SAKTI, atau SIMDA (tidak ada API resmi).

## Di luar lingkup
Optimasi alokasi stok, rantai dingin, donasi in-kind, rating pemasok (lihat `riset/R2-praktik-dunia.md` bagian 6).
