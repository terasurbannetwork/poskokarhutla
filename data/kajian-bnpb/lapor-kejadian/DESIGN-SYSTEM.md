# DESIGN-SYSTEM: Kejadian dari Laporan Warga

Mengikuti AGENTS 3.9 (token dulu, atom dulu, baru layar) dan `lapor-ai/DESIGN-SYSTEM.md`. Tidak ada gaya baru di
tingkat layar. Sebelum menulis kode peramban, rujuk skill `modern-web-guidance` (AGENTS butir 8): `search` lalu
`retrieve`.

## 1. Token dan atom yang dipakai ulang

| Kebutuhan | Dipakai ulang | Letak |
| --- | --- | --- |
| Warna, jarak, radius | token `public/inti/tema.css`; tanpa literal warna baru (gerbang `tests/agen/gerbang-token-warna.test.mjs`) | `public/inti/tema.css` |
| Kartu | kartu Alun-alun `.lp-alun-*` dan kartu standar `.ex.ex-std` (AGENTS 3.5) | `public/lapor/lapor.css`, `public/inti/kartu.css` |
| Peta | MapLibre yang dipakai Alun-alun dan meja (D84) | `public/lapor/lapor.js:1269` |
| Pil jenis dan pil status | pil yang sudah ada di Alun-alun dan meja | `public/lapor/` |
| Ikon orang untuk jumlah pelapor | `i-orang` | `public/lapor/lapor.js:1291` |

Komponen baru hanya dua, keduanya komposisi atom di atas: **lencana verifikasi** (pil dengan ikon centang dan
teks "Diverifikasi BPBD Kab. X, 14.20 WIB") dan **baris status usulan** di meja. Keduanya didefinisikan lengkap dengan
keadaannya sebelum dipakai di layar.

## 2. Halaman `/lapor/hari-ini`

Satu kolom di ponsel, dua kolom (daftar dan peta) di desktop. Urutan:

1. Kepala situs bersama (`public/inti/kepala.js`, memakai token Centurisk97, bukan palet halaman).
2. Judul halaman: "Kejadian hari ini". Satu baris penjelas: "Laporan warga yang sudah diverifikasi BPBD dalam 24 jam terakhir. Bukan data resmi korban." Stempel "Diperbarui 14.25 WIB".
3. Saring jenis (deretan pilihan ujung ke ujung, rata dan berikon, memori deretan-pilihan) dan saring provinsi.
4. Daftar kartu dan peta (peta ditunda dari klik, aturan INP nomor 2).
5. Catatan metode (lipat `<details>`): satu paragraf rata kiri-kanan: apa arti "diverifikasi BPBD", bahwa angka berupa rentang dari laporan warga dan tidak dijumlah, dan bahwa data pribadi tidak ditampilkan.

Kepala kartu = nama seksi, bukan kalimat temuan, tanpa kalimat kesimpulan (AGENTS 3.5, pembaruan 11 Nov). Jarak antarkartu 20 px.
Tanpa huruf kapital semua. Tanpa titik tengah sebagai pemisah teks: gunakan koma, kalimat, atau baris baru.

### Kartu kejadian

| Bagian | Isi |
| --- | --- |
| Baris atas | pil jenis, subjenis bila ada, waktu |
| Lokasi | desa, kecamatan, kab/kota, provinsi |
| Pelapor | "N warga melapor" bila 2 atau lebih; tidak ditulis untuk 1 |
| Verifikasi | lencana "Diverifikasi BPBD Kab. X" dengan jam |
| Dampak | tabel rapat penuh `.ex-tabel`: isian, rentang (mis. "2 sampai 5"), tanpa total; kepala tabel biru tua; di bawah tabel satu baris catatan "Menurut laporan warga, tidak dijumlah dan bukan data resmi korban" |
| Bagikan, cetak | tombol ikon polos tanpa garis luar (memori ikon-tanpa-garis-luar) |

Tidak ada foto, tidak ada nama pelapor, tidak ada nomor tiket, tidak ada tombol "ikuti" (itu Alun-alun).

### Keadaan

| Keadaan | Tampilan |
| --- | --- |
| Memuat | rangka kartu abu, bukan spinner penuh layar |
| Kosong | "Belum ada laporan terverifikasi dalam 24 jam terakhir. Ini bukan berarti tidak ada kejadian. Lihat Alun-alun atau hubungi BPBD setempat." |
| Gagal muat | "Data belum bisa dimuat. Coba lagi." dengan tombol |
| Ada kartu ditarik | kartu hilang tanpa jejak di publik |

### Aksesibilitas dan performa

Kontras sesuai token; peta punya padanan daftar; fokus terlihat; gerak dikurangi dihormati; target sentuh 44 px.
Filter jenis dan provinsi memakai `startTransition` hanya pada subtree berat, chrome kontrol urgent (aturan INP pemilik nomor 2). Render peta tidak di handler klik.

## 3. Meja

| Elemen | Perilaku |
| --- | --- |
| Kepala kejadian laporan | tambah "N pelapor" (ikon `i-orang`) dan chip "satu desa" bila sambungan hanya dari aturan satu desa (A1 butir 2) |
| Kartu "Halaman publik" di rincian | status: "Tayang", "Belum tayang, alasannya: belum dicek BPBD" dan seterusnya (lima syarat D4 sebagai daftar centang), tombol "Tarik dari halaman publik" atau "Tampilkan lagi" |
| Kartu "Buku Besar" di rincian | tombol "Usulkan ke Buku Besar" (satu klik, tanpa dialog bila syarat terpenuhi; dialog hanya bila kab berbeda atau jenis tak terpetakan); setelah klik: baris status usulan (A7) dengan tautan ke kejadian resmi |
| Kode | selalu berlabel "Kejadian laporan KJ-..." dan "Kejadian resmi KJ-..." (Q14) |

Ikon pada tombol, label tidak huruf kapital semua. Teks tombol: "Usulkan ke Buku Besar", "Tarik dari halaman publik".

## 4. Tinjau lokal

Tiap tiket layar menutup laporannya dengan `http://localhost:8800/lapor/hari-ini` atau `http://localhost:8800/lapor/meja` (server tinjau, `AGENTS.md` 3.8). Server tinjau menjawab `/api/lapor/*` dengan mesin lokal, tidak meneruskan ke produksi, jadi tidak ada data warga produksi di layar lokal.
