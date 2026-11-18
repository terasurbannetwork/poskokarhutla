# KEAMANAN-PRIVASI: tindakan lapangan per bencana

## 1. Data

| Data | Tempat | Siapa membaca |
| --- | --- | --- |
| Arsip logbook mentah (teks upaya, nama tempat, korban) | `data/raw/logbook/` di mesin pemilik, diabaikan git | pemegang arsip saja |
| Hitungan tindakan per bencana | `public/data/bnpb/logbook_tindakan.json` | publik (hanya angka agregat) |
| Tindakan per target renlap | D1 `pb_renlap_tindakan` | sama dengan hasil renlap: akun gerbang, staf berperan sewilayah, pemirsa Pusdalops, akun instansi sewilayah |

## 2. Aturan

- Keluaran publik tanpa teks asli, nama orang, nama instansi pengisi, angka korban, atau id kejadian. Hanya `n` dan hitungan per kode per bencana. Skrip `uji` memeriksa kunci keluaran terhadap daftar putih.
- Kolom `oleh` di `pb_renlap_tindakan` tidak pernah dibaca rute mana pun (sama dengan `pb_renlap_hasil`).
- Hak tulis tindakan = hak tulis hasil yang sudah ada (`gerbangTulis` lalu `penulis` wilayah baris renlap). Tidak ada jalur tulis baru.
- Kode tindakan divalidasi dari registri sebelum menyentuh D1; CHECK pola huruf kecil dan garis bawah menolak sisa masukan aneh.
- Batas laju yang ada (`lajuOK`, 60 tulis per 10 menit per pengisi) berlaku. Satu permintaan paling banyak 100 butir x 12 kode = 1.200 baris, tetapi hapus dan sisip tindakan masing-masing SATU pernyataan lewat `json_each`, jadi batch = butir hasil + 2 + log (paling banyak 103 pernyataan).
- Pesan galat ke klien tidak menyebut nama tabel atau migrasi; detail hanya ke log Worker.
- Semua SQL lewat `src/hak.js` dengan `MATRIKS` (gerbang `tests/agen/gerbang-d1.test.mjs`).
