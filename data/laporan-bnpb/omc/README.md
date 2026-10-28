# Rekap OMC karhutla 2026 (gabungan)

Berkas data: `omc_rekap.csv` (82 baris). Hanya angka yang tertulis di sumber. Kolom `tanggal` = tanggal OPERASI. `cao_kg` kosong semua: tidak ada sumber yang menyebut CaO.

Cara gabung: `omc_dari_wa_16-26okt.csv` (rekap WA 17 sampai 27 Okt, tidak disunting) adalah baris utama untuk 16, 17, 18, 19, 20, 21, 23, 24, 26 Okt. Baris dari sumber repo/mesin (deck koordalops.py, presiden_data.js, WA contoh 24 dan 27 Okt) dibuang bila angka provinsi-harinya sama, dan disimpan dengan catatan "beda sumber" bila berbeda. Baris dari sumber saya tetap ada untuk 22 Okt (satu-satunya sumber, dari komentar kode deck), Lampung 22 Okt, baris nol (Jambi, Riau, Kalbar, Kalsel tanpa OMC), dan 3 baris Rakor Kalsel tanpa tanggal. Baris `2026-10-16..2026-10-18` adalah agregat 3 hari dari laporan Presiden; jangan dijumlahkan dengan baris harian.

## Ringkasan per provinsi (baris harian utama + pelengkap, tanpa agregat dan tanpa baris "beda sumber")

| Provinsi | Hari bersortie (Okt) | Sortie | NaCl (kg) | Dry ice (kg) |
| --- | --- | ---: | ---: | ---: |
| Kalimantan Tengah | 16 sampai 24, 26 | 60 | 36.800 | 23.800 |
| Sumatera Selatan | 16 sampai 24, 26 | 48 | 24.400 | 26.000 |
| Kalimantan Selatan | 16, 17, 18, 19, 21, 23, 24 | 9 | 9.000 | 0 |
| Kalimantan Barat | 16, 17, 18, 19, 20, 21, 23 | 10 | 9.400 | 0 |
| Lampung | 22 | 1 | tidak tertulis | tidak tertulis |
| Jambi, Riau | tidak ada | 0 | 0 | 0 |
| Jumlah | | 128 | 79.600 | 49.800 |

Hari bersortie Kalteng/Sumsel: 16, 17, 18, 19, 20, 21, 22, 23, 24, 26 Okt. Rentang data: 16 sampai 26 Okt 2026 (25 Okt kosong). Tanggal 22 Okt memakai ringkasan deck (Kalteng 7 sortie 1.000 kg NaCl 5.000 kg dry ice; Sumsel 9 sortie 1.800/5.800), bukan teks WA.

## Beda sumber dan risiko hitung ganda

- Dry ice Sumsel 16-20 Okt: Rekap Dry Ice 20 Okt menyebut total 4.800 kg, sedangkan jumlah harian laporan WA 8.000 kg (16 Okt 1.600; 17 Okt 1.600; 18 Okt 2.400; 19 Okt 1.600; 20 Okt 800). Dua angka disimpan apa adanya, tidak direkonsiliasi.
- PK-SNK lintas Kalteng-Kalsel: pada 17 dan 18 Okt sortie bisa terhitung dua kali (baris Kalteng dan Kalsel; catatan di baris). Batas atas hitung ganda 2 sortie dan 2.000 kg NaCl. Pada 19 dan 21 Okt sumber menyatakan sama dan hanya dihitung di Kalteng; 26 Okt Hercules A-1328 hanya dihitung di Kalteng.
- 20 Okt Kalteng: deck templat 5 sortie 3.900 kg dry ice; WA 6 sortie (3.900 kg dry ice + 800 kg NaCl). 21 Okt Kalteng: deck 5 sortie dry ice 4.400 kg; WA 9 sortie (4.400 dry ice + 3.800 NaCl). 21 Okt Sumsel: deck 5 sortie 4.000 kg; WA 6 sortie (4.000 dry ice + 800 NaCl). Dry ice sama, selisih pada NaCl/sortie yang tidak ada di deck.
- 22 Okt: Sumsel 9 sortie dan Lampung 1 sortie (sasaran OKU Timur) mungkin tumpang tindih.

## OMC tidak dilaksanakan

- Jambi: tanpa sortie 18 Okt (awan kurang mendukung); 23 dan 26 Okt tidak dilaksanakan, PK-ALA pindah ke Jawa Barat dan tidak siap operasi.
- Kalbar: 22 Okt tanpa sortie (awan belum mendukung); 24 Okt tidak ada baris di WA, 26 Okt dinyatakan tidak dilaksanakan, PK-SCH direposisi ke Jawa Timur pada 24 Okt.
- Kalsel: 22 Okt tanpa sortie (armada siaga); 20 dan 26 Okt tanpa sortie sendiri (26 Okt disasar Hercules A-1328 dari Kalteng).
- Kalteng 18 Okt: PK-FPU tidak terbang (visibilitas).

## Operasi berakhir

Riau berakhir 25 September 2026 (musim hujan). Provinsi lain tidak ada pernyataan berakhir; per 26 Okt masih aktif hanya Kalteng dan Sumsel. Dry ice dari Lampung ke Sumsel berakhir 18 Okt (catatan WA).

## Hujan

Sumber melaporkan hujan di wilayah, tidak menyimpulkan keberhasilan OMC. Satu-satunya klaim: komentar deck 21 Okt "OMC menghasilkan hujan di Kalbar dan Kalteng", dan laporan pantau hujan pasca-OMC 19 Okt (catatan WA: kedua sasaran Kalbar hujan). Hujan tercatat juga di hari/provinsi tanpa sortie (Kalbar 22 dan 26 Okt, Jambi 26 Okt).

## Celah

- Sebelum 16 Okt: tidak ada data di repo, mesin, atau mesin-awal-19okt.
- 25 Okt: tidak ada sumber (laporan WA 26 Okt tidak ditempel; tidak ada di repo).
- 22 Okt: hanya komentar deck (tanpa pesawat dan kg per pesawat); laporan WA 23 Okt tidak ada.
- 27 Okt dan seterusnya: belum ada laporan.
- Tiga baris Rakor Kalsel (`edit_omc.py`, blok rakor62): tanggal tidak tertulis, kolom tanggal kosong.

## Menilai hujan dengan `scripts/omc/nilai.py`

Alat butuh per sortie: `id`, `bahan` (`dry_ice` atau `nacl`), `mulai` ISO dengan jam, opsional `selesai`, `sasaran_kab` (`"kodeprov|nama kab"`). Hampir semua sortie tidak punya jam: 3 sortie 23 Okt dijalankan ke berkas sementara dan semuanya `data_kurang` ("sortie tanpa jam mulai"). Satu sortie punya jam: Sumsel 20 Okt CASA A-2117, dry ice 800 kg, 11.29-13.04 WIB, sasaran "timur laut-timur Palembang". Dijalankan dengan `Kota Palembang` sebagai pendekatan sasaran (asumsi saya): hasil `data_kurang`, "stasiun kontrol layak kurang dari 2" untuk PM2,5 dan jarak pandang. Jadi belum ada penilaian hujan yang valid; yang kurang: jam mulai/selesai tiap sortie, sasaran kab per sortie yang terpisah, dan stasiun kontrol di arsip. `omc_hasil.json` tidak disentuh.
