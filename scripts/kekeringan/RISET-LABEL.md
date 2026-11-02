# Uji balik ambang kekeringan terhadap label Pusdalops (G8, 2 Nov 2026)

Kode: `label.py` (bangun label -> `data/raw/kekeringan_label.json`, git-ignored), `ujilabel.py`
(uji -> `data/raw/kekeringan_ujilabel.json`). Jalankan `python3 scripts/kekeringan/label.py`
lalu `python3 scripts/kekeringan/ujilabel.py jalan` (25 dtk, hanya membaca cache POWER/ekstra,
tanpa unduh). Self-check: `... label.py uji`, `... ujilabel.py`. Protokol lengkap ada di
docstring kedua berkas dan ditulis sebelum skor uji dilihat. Tidak ada angka di layar atau
`public/data` yang berubah.

## Label: aturan gabung

Satuan kabupaten-bulan. Banyak baris/episode di kab-bulan yang sama dihitung SATU kejadian
(dedup per sumber, gabungan = gabungan himpunan). Kejadian = ada pernyataan kekeringan di kab itu
pada bulan itu, bukan tingkat keparahan.

| Sumber | Dianggap kejadian | Baris -> kab-bulan | Tahun bercakupan (>=10 kejadian/tahun) |
| --- | --- | --- | --- |
| sk (`sk_status.jsonl`, jenis kekeringan) | tiap bulan mulai..selesai SK darurat (Siaga/Tanggap/perpanjangan sama); tanpa mulai pakai bulan tgl_sk | 69 -> 248 (7 baris tanpa kab/tanggal dibuang) | 2019, 2020, 2021 |
| rekap (`rekap_harian.jsonl`) | bulan tanggal laporan | 157 -> 128 (17 kab tak cocok) | 2017, 2018, 2019 |
| laphar (`laphar_2022_2025.json` episode) | bulan mulai..terakhir | 257 -> 229 | 2023, 2024, 2025 |
| logbook (`data/raw/logbook/arsip/*/kejadian.jsonl`) | bulan tgl_kejadian | 815 -> 631 (19 tak cocok) | 2013-15, 2017-21, 2023-26 (bulan tercatat >= 90% hari) |
| gabungan | positif bila sumber mana pun positif | 970 kab-bulan | gabungan cakupan |

- `public/data/logbook_riwayat.json` TIDAK dipakai: isinya hitungan kab-per-tahun dan
  klimatologi bulan lintas tahun, tidak ada kab-per-bulan-per-tahun. Diganti kejadian logbook mentah.
- Bulan di luar cakupan sumber tidak pernah dihitung negatif (tidak ada catatan bukan berarti
  tidak ada kekeringan). Itu membuang 2016, 2022, dan SK 2022/2024 (4 dan 1 kejadian saja).
- 29 kab "tidak menerbitkan SK kekeringan" (Jateng, Jatim, Bali) dikeluarkan dari penilaian SK
  (bukan positif, bukan negatif); sumber lain tetap menilai mereka.
- Sumber TIDAK independen: rekap dan logbook tumpang tindih 114 dari 169 kab-bulan, laphar dan
  logbook 129 dari 318. SK nyaris tak beririsan dengan yang lain (waktu SK = bulan resmi, bukan bulan laporan).
- Label hanya mencatat kejadian yang DILAPORKAN ke Pusdalops: kab yang tak melapor tampak "negatif",
  jadi FAR batas atas (sama peringatannya dengan DIBI di RISET-AMBANG.md).

## Pembagian waktu dan aturan

- LATIH tahun <= 2021 (memilih), UJI tahun >= 2023 (sekali). Aturan SPI tidak memakai label, jadi
  aturan tetap (sekarang = SPI-3 <= -1, "Waspada+"; Siaga = SPI-3 <= -1,5) boleh dilaporkan di kedua periode.
- Disetel hanya `terpilih`: dari 69 aturan `ambang2.aturan()` tanpa HTH (HTH harian baru ada sejak Sep 2023),
  CSI latih tertinggi pada gabungan dengan >= 10 tepat. Terpilih: `I-0,5p20` (SPI-3 <= -0,5 di musim
  kemarau setempat DAN persentil kelembapan tanah akar <= 20). Latih: POD 0,218 FAR 0,899 CSI 0,074.
- Sampel: bulan dalam cakupan dan bulan sebelumnya juga dalam cakupan (supaya persistensi adil).
- Pembanding: acak (laju alarm dan kejadian sama); klimatologi K1 (kab x bulan-kalender yang
  pernah berkejadian di latih gabungan) dan K2 (bulan-kalender nasional, ukuran dipilih CSI latih, hasil: hanya September);
  persistensi. Klimatologi dibangun HANYA dari latih gabungan; baris "latih" K1 sengaja POD 1,0 (dalam-sampel), abaikan.
- **Persistensi tanpa bocor (perbaikan 2 Nov):** hanya kejadian bulan lalu yang SUDAH TERCATAT di akhir bulan itu.
  Logbook memakai `pertama_dicatat` (bukan `tgl_kejadian`): 138 dari 631 kab-bulan logbook baru tercatat sesudah bulan kejadiannya
  dan kini tidak ikut sebagai "bulan lalu". Rekap dan laphar bertanggal laporan, tidak berubah. Persistensi SK dibuang: rentang
  mulai..selesai SK ditetapkan di muka sehingga bulan lalu "diketahui" dari tanggalnya sendiri (artefak).
- **Selang:** bootstrap blok kab x tahun (2.000 ulangan, cuplikan sama untuk semua metode) untuk CSI dan untuk SELISIH CSI
  berpasangan metode - K1. Blok tanpa tepat/terlewat/palsu di metode mana pun dibuang dari cuplikan (tak memengaruhi CSI).
  Selang bulan lama (cuplik-bulan) terlalu sempit karena antar-bulan berkorelasi dan dihapus.
- **Tanpa pelapor berulang:** baris tambahan tanpa 59 kab yang melapor >= 3 bulan berbeda di latih gabungan.
- Layak = POD >= 0,5, FAR <= 0,8, CSI >= 2x acak, CSI > pembanding terbaik, batas bawah selisih CSI vs K1 > 0, dan batas bawah
  selang CSI > acak, di gabungan UJI dan di tiap sumber UJI.

## Hasil UJI (2023-2026, tidak disetel pada data ini)

Gabungan (21.844 kab-bulan, 418 kejadian); selisih = CSI metode - CSI K1, selang bootstrap blok 95%:

| Metode | POD | FAR | CSI | Selang CSI | Selisih vs K1 |
| --- | --- | --- | --- | --- | --- |
| Waspada+ sekarang (SPI-3 <= -1) | 0,225 | 0,957 | 0,037 | 0,029-0,046 | -0,088 .. -0,046 |
| Siaga (SPI <= -1,5) | 0,079 | 0,963 | 0,026 | 0,017-0,035 | -0,101 .. -0,057 |
| terpilih `I-0,5p20` | 0,062 | 0,916 | 0,037 | 0,023-0,052 | -0,090 .. -0,043 |
| klimatologi K1 kab x bulan | 0,388 | 0,876 | 0,104 | 0,083-0,124 | |
| klimatologi K2 bulan nasional | 0,156 | 0,957 | 0,035 | 0,027-0,043 | |
| persistensi (tercatat) | 0,292 | 0,643 | **0,191** | 0,153-0,229 | +0,053 .. +0,123 |
| acak | | | 0,016 | | |

Per sumber uji:

| Sumber (kab-bulan, kejadian) | Metode | POD | FAR | CSI (selang) | Selisih vs K1 |
| --- | --- | --- | --- | --- | --- |
| laphar (17.780, 225) | sekarang | 0,196 | 0,968 | 0,028 (0,019-0,038) | -0,060 .. -0,020 |
| | Siaga | 0,022 | 0,988 | 0,008 (0,002-0,016) | -0,080 .. -0,041 |
| | terpilih | 0,022 | 0,922 | 0,018 (0,004-0,034) | -0,071 .. -0,029 |
| | K1 | 0,369 | 0,923 | 0,068 (0,049-0,089) | |
| | persistensi | 0,360 | 0,640 | **0,220** (0,166-0,271) | +0,103 .. +0,200 |
| logbook (19.812, 320) | sekarang | 0,191 | 0,970 | 0,027 (0,020-0,034) | -0,081 .. -0,044 |
| | Siaga | 0,091 | 0,965 | 0,026 (0,017-0,036) | -0,083 .. -0,043 |
| | terpilih | 0,072 | 0,926 | 0,038 (0,023-0,055) | -0,075 .. -0,027 |
| | K1 | 0,403 | 0,898 | 0,089 (0,071-0,107) | |
| | persistensi | 0,159 | 0,791 | 0,099 (0,069-0,131) | -0,015 .. +0,036 |

Tanpa pelapor berulang (kab yang melapor >= 3 bulan di latih dikeluarkan; K1 praktis kehilangan dasarnya):

| Sumber (kab-bulan, kejadian) | sekarang CSI / selisih vs K1 | terpilih CSI / selisih | K1 CSI | persistensi CSI / selisih | acak |
| --- | --- | --- | --- | --- | --- |
| gabungan (19.307, 239) | 0,032 / -0,046 .. -0,002 | 0,035 / -0,043 .. +0,003 | 0,055 | 0,132 / +0,034 .. +0,117 | 0,011 |
| laphar (15.715, 126) | 0,023 / -0,043 .. 0,000 | 0,006 / -0,061 .. -0,013 | 0,043 | 0,189 / +0,088 .. +0,206 | 0,007 |
| logbook (17.511, 180) | 0,022 / -0,046 .. -0,005 | 0,040 / -0,029 .. +0,018 | 0,046 | 0,049 / -0,027 .. +0,032 | 0,009 |

POD/FAR "sekarang" di baris itu: gabungan 0,285 / 0,966, laphar 0,238 / 0,976, logbook 0,239 / 0,976.

Persistensi, CSI sebelum -> sesudah tidak bocor: gabungan uji 0,207 -> 0,191; laphar uji 0,220 -> 0,220 (tak berubah);
logbook uji 0,102 -> 0,099; logbook latih 0,069 -> 0,061; gabungan latih 0,296 -> 0,088 (angka lama sebagian besar artefak SK:
persistensi SK latih tadinya 0,625). Rekap latih 0,049 tak berubah.

sk dan rekap tidak punya data tahun >= 2023, jadi hanya periode LATIH (diagnostik, bukan uji). Aturan sekarang di latih
(POD / FAR / CSI): sk 0,352 / 0,966 / 0,032; rekap 0,289 / 0,984 / 0,015; logbook 0,251 / 0,989 / 0,011; gabungan 0,298 / 0,976 / 0,023.
`terpilih` latih: sk CSI 0,110, rekap 0,041, logbook 0,034, gabungan 0,074.

## Vonis

- **SPI serentak tidak lebih baik daripada kebiasaan melapor.** Aturan sekarang (Waspada+), Siaga, dan terpilih
  semuanya di bawah klimatologi kab x bulan (selisih CSI negatif di gabungan, laphar, dan logbook; seluruh selang di bawah nol).
  Sekarang dan terpilih memang di atas alarm acak (batas bawah selang CSI > acak di gabungan dan tiap sumber; Siaga tidak, di laphar CSI 0,008 = acak), jadi ada sinyal lemah, tetapi
  jauh dari ambang layak: POD 0,06-0,23, FAR 0,92-0,96.
- Aturan sekarang TIDAK LAYAK di gabungan dan tiap sumber (gagal POD, FAR, 2x acak, dan pembanding). Terpilih `I-0,5p20` TIDAK LAYAK:
  CSI latih 0,074 menyusut ke 0,037 di uji (penyetelan berlebih pada laju kejadian ~1%), POD 6%.
- Tanpa kab yang sudah biasa melapor, SPI sekarang tetap tidak melampaui K1 (selisih gabungan -0,046 .. -0,002, laphar batas atas tepat 0,000;
  logbook negatif). Terpilih di gabungan dan logbook mencapai selang selisih yang menyentuh nol (+0,003, +0,018): tidak bisa dibedakan dari K1
  di sana, bukan lebih baik.
- Persistensi tercatat (kab ini sudah lapor bulan lalu) unggul atas K1 di gabungan (+0,053 .. +0,123) dan laphar (+0,103 .. +0,200),
  tetapi tidak di logbook (selisih -0,015 .. +0,036; logbook memang lebih banyak laporan terlambat). Ia diagnosis kebiasaan lapor, bukan model
  kekeringan, dan butuh laporan bulan lalu sudah masuk.
- Persistensi SK tidak dipakai di mana pun (artefak rentang SK).
- Keputusan: tidak ada ambang baru. Ambang kekeringan TETAP berlabel hipotesis; pil di layar dibiarkan; `status.py` tidak berubah.

## Rekomendasi

1. Pertahankan label hipotesis dan jangan menyetel SPI lagi pada periode 2023-2026 (sudah terlihat).
2. Opsi produk (keputusan `validasi-model` dan pemilik): jadikan "kab dengan laporan kekeringan bulan lalu" dan musim kemarau kab sebagai
   petunjuk utama, SPI sebagai konteks.
3. Uji prospektif beku di bawah (belum disegel).

## Protokol uji prospektif beku (DRAF, BELUM DISEGEL; penyegelan keputusan pemilik)

Tujuan: menguji tanpa bisa menyetel sesudah melihat. Meniru uji J4 banjir.

1. **Segel sebelum bulan pertama dinilai:** (a) aturan yang diuji, kode dan versi (`sekarang`, `siaga`, dan bila pemilik mau, satu atau dua kandidat
   tertulis, tidak lebih), (b) definisi label dan aturan gabung (bagian Label di atas, hash `label.py`), (c) cakupan dan aturan kab tidak-terbit,
   (d) kriteria layak dan metrik utama, (e) K1 yang dibangun dari seluruh data hingga hari penyegelan, (f) benih dan jumlah ulangan bootstrap.
   Segel = satu commit yang memuat berkas protokol dan hash-nya, dengan jangkar commit seperti uji prospektif Siaga banjir.
2. **Stempel waktu append-only:** tiap bulan, sebelum bulan itu dimulai, simpan alarm tiap aturan per kab (berkas append-only, tidak boleh diubah
   sesudahnya). Label memakai `pertama_dicatat` dari logbook/laporan harian sebagai cap waktu catatan; catatan yang pertama kali dicatat sesudah
   penutupan jendela penilaian tidak dipakai mengubah penilaian bulan itu.
3. **Penilaian 60 hari sesudah bulan tutup** (memberi waktu laporan terlambat masuk), sekali per bulan, tanpa revisi; laporan lambat sesudah itu dicatat
   terpisah, tidak mengubah skor.
4. **Metrik utama:** selisih CSI berpasangan aturan - K1 (klimatologi kab x bulan) dengan bootstrap blok kab x tahun (pola `uji_balik.py` banjir);
   laporkan juga POD, FAR, CSI, persistensi, dan baris tanpa pelapor berulang. Lolos bila seluruh syarat Layak di atas terpenuhi pada akumulasi.
5. **Durasi minimal:** dua musim kemarau penuh (Jun-Okt) sebelum vonis; vonis awal sebelum itu hanya boleh berbunyi "belum cukup data".
6. Satu aturan baru hanya boleh masuk sekali; kegagalan tidak diikuti penyetelan ulang di periode yang sama.

## Keterbatasan (angka apa adanya)

- Pelaporan tidak merata (Jateng/Jabar/NTB padat): FAR batas atas; K1 sebagian besar mengukur kebiasaan melapor.
- 2022 tanpa cakupan; SK 2023 dan 2025 tidak ada di arsip (CKAN SK 2025 ada di BNPB tapi bukan bagian paket ini).
- Sumber tumpang tindih; gabungan bukan penjumlahan bukti independen.
- Satu periode uji (2023-2026, tiga musim kemarau, El Nino 2023 dan 2026).
- Aturan berbasis HTH tidak diuji (tak ada riwayat HTH harian sebelum Sep 2023); aturan tanah (I) ikut diuji karena persentil GWETROOT 1991-2020 tersedia.
