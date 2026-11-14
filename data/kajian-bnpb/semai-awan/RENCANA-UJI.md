# RENCANA-UJI: Peluang Semai Awan dan Prakiraan Asap

Tiap tiket selesai hanya bila perintah buktinya hijau dan layar ditinjau pemilik di `http://localhost:8800/operasi#semai`.
Tanpa data dummy: uji memakai fixture potongan data nyata (satu putaran IFS 14 Nov 2026 00z, dipotong ke 2 x 2 derajat sekitar
Kendari dan Palangkaraya, disimpan sebagai `scripts/operasi/fixture_semai.json`) dan kasus sintetis untuk fungsi murni.

## 1. Fungsi murni Python (`python3 scripts/operasi/semai.py uji`)

| Kasus | Harapan |
| ----- | ------- |
| LCL T2m 30, Td 24 | 750 m |
| Level beku dari profil t/gh sintetis | interpolasi benar, tanpa lapisan beku -> `None`, sel gagal G8 |
| w -0,5 Pa/s di 850 hPa, T 290 K | sekitar +0,05 m/s (tanda dibalik) |
| Gerbang tiap syarat G1 sampai G9 di batas persis | `>=` dan `<` sesuai tabel ALGORITMA §3 |
| Ramp q_cape 1500, 2250, 3000, 4000 | 0, 0,5, 1, 1 |
| T jarak 5, 10, 30, 50, 80 km | 0, 0, 0,5, 1, 1 |
| D tanpa api dalam 25 km | 0, skor 0 di kedua mode |
| Skor geometris dengan satu faktor 0 | 0 |
| Contoh ALGORITMA §6: komponen 0,53/0,36/1/0,54/0,40, F 442 MW, T 1 | Q 0,566, D 0,890; skor bawaan 0,74; seperti Nimbus 0,78 |
| Skor mode Nimbus untuk contoh panduan Nimbus (Q 0,66, D 0,83, T 1,0, bobot 0,45/0,40/0,15) | 0,78 |
| NMS zona: dua sel 30 km terpisah | satu zona |
| Ambang 0,35 dan maksimum 5 | patuh |
| Jendela 85% | rentang langkah berurutan, tidak melompati langkah di bawah 85% |
| Zona waktu provinsi 62 Kalteng / 63 Kalsel / 51 Bali / 82 Maluku Utara / sel laut dekat Bali | WIB / WITA / WITA / WIT / WITA |
| Jendela: blok 03Z dan 06Z, provinsi WIB / blok 03Z, provinsi WITA | "10.00 sampai 16.00 WIB" / "11.00 sampai 14.00 WITA" |
| Hujan blok langkah dari tp kumulatif | `(tp(t+3) - tp(t)) / 3`, langkah 0 terdefinisi |
| Ambang cluster: terbesar 3.000 MW | ambang 60 MW, kalimat kosong menyebut 60 |
| DMS -4,6 / 121,9 | `4°36'00" S 121°54'00" E` |
| Pembulatan mitra -4,6 / 121,9 | -4,5 / 122,0 |
| Ringkasan Mitra | tidak memuat angka desimal di luar kelipatan 0,5 untuk koordinat, tidak memuat skor |
| Keadaan kosong tiga jenis | `alasan_kosong` benar |

## 2. Integrasi data (tiket SA-01)

```
python3 scripts/operasi/semai_ifs.py --putaran 2026111400 --langkah 0,24 --cek
```

Harus: menemukan 29 field per langkah di `.index`, mengunduh lewat rentang byte, ukuran sesuai `_length`, grid terpotong 191 x 481,
nilai `lcc` 0..1, `mucape` >= 0, `t` 180..320 K. Waktu total satu putaran dicatat di log (target < 12 menit di runner).

## 3. Uji silang Python lawan JS (`node --test tests/operasi/semai_silang.test.mjs`)

Untuk fixture dan 3 set bobot (bawaan, 1/0/0, 0,2/0,6/0,2), skor dan zona dari `public/operasi_semai_murni.js` sama dengan keluaran
`semai.py` (selisih skor <= 0,005, huruf dan sel zona sama). Mode Nimbus sama dengan `nimbus.zona`.

## 4. Rute dan D1 (`npm run uji:warga`, berkas `tests/warga/operasi_semai.test.mjs`)

Menjalankan Worker sungguhan dengan D1 lokal (pola uji warga yang ada), bukan mock:

| Kasus | Harapan |
| ----- | ------- |
| Migrasi 0129 dijalankan dua kali | tanpa galat (idempoten) |
| Tanpa sesi | 401 |
| Peran pembaca saja | 403 |
| `pusdalops` zona sah | 201, baris punya lat/lon/skor dari `semai.json`, bukan dari badan |
| Badan membawa lat/lon palsu | diabaikan, baris tetap memakai koordinat zona |
| Zona tidak ada di putaran | 404 |
| `putaran` tidak cocok awal `zona_id` | 400 |
| Jendela terbang zona sudah lewat | 400 |
| Hapus lunak lalu isi ulang zona+base sama | 201 (indeks unik hanya baris aktif) |
| Rute berkas nama di luar daftar (`../x`, `semai_lain.json`) | 404 |
| Ulangi zona+base yang sama | 409 |
| Tanggal kemarin | 400 |
| `catatan` 501 huruf | 400 |
| Ke-31 dalam sehari (baris terhapus ikut dihitung) | 429 |
| Hapus tanpa alasan | 400; dengan alasan: `terhapus` terisi, GET tidak menampilkannya |
| CHECK lat di luar wilayah (sisip langsung) | ditolak D1 |

## 5. Pemeriksa

| Tiket | Pemeriksa | Sinyal |
| ----- | --------- | ------ |
| SA-04, SA-05, SA-10 | `validasi-model` | ambang dari `semai_bobot.json`, tidak ada kebocoran waktu di uji prospektif, klaim layar cocok rapor |
| SA-08 | `guard-api`, `security-reviewer` | §4 hijau, koordinat dari server |
| SA-07 | `migrasi-idempoten` | §4 baris pertama |
| SA-11 sampai SA-13 | `inp-reviewer`, `selera-angka` | §7 |

## 6. Gerbang teks (`tests/agen/gerbang-semai-klaim.test.mjs`, tiket SA-16)

Memindai `public/operasi_semai*.js`, `scripts/operasi/semai*.py`, dan `semai.json` contoh: gagal bila ada frasa terlarang
(KEAMANAN §7), huruf kapital semua di teks layar, atau pemisah titik tengah. Gerbang yang ada (`gerbang-operasi-gelap`,
`gerbang-operasi-renggang`, `gerbang-tanpa-kesimpulan`, `gerbang-kartu-renggang`) memasukkan berkas baru ke daftarnya.

## 7. Layar (tinjau lokal + `inp-reviewer`)

| Cek | Cara | Harapan |
| --- | ---- | ------- |
| Geser bilah jam | Playwright, ukur INP 20 kali | p75 < 200 ms |
| Geser bobot terus-menerus | sama | p75 < 200 ms, zona akhir sama dengan uji silang |
| Pilih zona | klik baris B | peta ke B, bilah jam ke langkah B, kartu Rekomendasi B |
| Tampilan Mitra | pilih Mitra | tidak ada teks koordinat desimal penuh di DOM kolom kanan, tidak ada tombol renlap |
| Kosong | `semai.json` fixture `alasan_kosong` | kalimat ALGORITMA §7 |
| Basi | `dibuat` 7 jam lalu | pita peringatan umur |
| Lebar 390 px | HP | kolom kanan di bawah peta, tanpa geser mendatar |
| Gelap/terang | dua tema | kontras teks >= 4,5 |

## 8. Uji prospektif (SA-10)

`python3 scripts/operasi/semai_nilai.py uji` (luring, GSMaP fixture) membuktikan: unit zona dinilai sekali, sel pembanding memakai
benih tetap, jendela 30 sampai 90 menit benar, rapor "data kurang" bila n < 30. Pemeriksa `validasi-model` membaca pra-registrasi
ALGORITMA §12 dan memastikan kode mengikutinya tanpa penyimpangan tak tercatat.
