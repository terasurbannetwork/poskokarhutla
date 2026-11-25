# Model akan membesar dan WASPADA

Definisi: titik panas baru (kurang dari 10 sel) membesar bila mencapai 10 sel VIIRS atau lebih dalam 72 jam sejak deteksi pertama (`LEPAS = 10`, `latih.py:26`, `lolos.py:42`). Satuan latih: 438.217 titik panas baru di sembilan provinsi prioritas, Juli sampai November, yang punya berkas cuaca; 12.436 membesar (2,8 persen). Semua positif dan 5 persen negatif ikut latih (`NEG = .05`, bobot 20) karena mesin 8 GB dan pustaka standar.

Model terpasang adalah konfigurasi B (38 fitur): cuaca dan kode kekeringan, lahan, ukuran dan FRP lintasan pertama, ditambah konteks titik sekitar (titik S-NPP dalam 5 dan 10 km selama 3 hari, jarak ke titik aktif 24 jam, hari aktif 7 hari). Hiperparameter: kedalaman 5, 150 pohon, laju belajar 0,06 (terpilih dari `KISI`, `lolos.py:301`). Penyetelan hanya dengan validasi silang tinggal-satu-tahun pada 2015 sampai 2023 (`TAHUN_CV`, sembilan lipatan, `lolos.py:48`); El Niño 2015, 2019, 2023 masing-masing pernah menjadi tahun uji.

Hasil ablasi pada prediksi luar-lipatan (n 340.468; 9.514 membesar; ambang dipilih pada recall 70 persen):

| Konfigurasi | AUC | AP (acak 0,028) | Presisi pada recall 70% |
| --- | --- | --- | --- |
| A: cuaca, lahan, ukuran dan FRP awal | 0,902 | 0,469 | 17,9% |
| B: A ditambah konteks titik sekitar (terpasang) | 0,909 | 0,484 | 19,1% |
| C sampai F: tambah NOAA-20, bobot kelas, kendala monoton, bobot fokal | 0,905 sampai 0,910 | 0,418 sampai 0,483 | tidak berbeda bermakna |
| U: C ditambah ramal ulang 14 jam | 0,952 | 0,676 | 43,6% |

Ambang WASPADA (peluang terkalibrasi Platt): `ambang = 0,0492` dengan Platt `[-0,296979; 0,91772]`, setara recall 70 persen pada luar-lipatan; ramal ulang 14 jam memakai ambang 0,0971 (`model_sebaran.json`, kunci `lolos` dan `lolos_ulang`). Hasil di berkas model:

| Himpunan | Model | n | Membesar | AUC | Recall | Presisi | Alarm palsu per api kecil |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Luar-lipatan 2015 sampai 2023 | baru | 340.468 | 9.514 | 0,9108 | 0,700 | 0,196 | 0,083 |
| Uji 2024 sampai 2026, semua titik baru (lihat kedua) | baru | 97.749 | 2.922 | 0,9076 | 0,678 | 0,209 | 0,079 |
| 500 deteksi pertama uji | lama (Monte Carlo, ambang 50%) | 500 | 42 | 0,7012 | 0,214 | 0,900 | 0,002 |
| 500 deteksi pertama uji | baru | 500 | 42 | 0,8119 | 0,667 | 0,219 | 0,218 |
| 123 kejadian lalu | lama | 123 | 58 | 0,7206 | 0,310 | 0,857 | 0,046 |
| 123 kejadian lalu | baru | 123 | 58 | 0,8324 | 0,672 | 0,750 | 0,200 |
| 123 kejadian lalu | baru, ramal ulang 14 jam | 123 | 58 | 0,8944 | 0,759 | 0,800 | 0,169 |

![Perbandingan AUC model lama, model baru, dan model baru dengan ramal ulang 14 jam pada 123 kejadian lalu; semuanya hipotesis sampai uji prospektif lolos. Sumber: model_sebaran.json.](gambar/model-sebaran-uji-membesar.svg)

Per lahan pada uji 2024 sampai 2026: gambut AUC 0,8668, recall 0,81, presisi 0,224, alarm palsu 0,244; mineral 0,9047, 0,584, 0,204, 0,052; sabana 0,9046, 0,624, 0,185, 0,055. Harga yang dibayar jelas: pada 500 titik uji yang diperkaya api besar, satu dari lima api kecil ikut ditandai; pada populasi titik baru sebenarnya satu dari sekitar 13. Uji 2024 sampai 2026 adalah "lihat kedua" karena model sel sudah pernah dinilai di sana; angkanya sedikit optimistis. Peluang lama (porsi Monte Carlo model sel) hanya dipertahankan sebagai pembanding `p_lepas_mc` dan tidak boleh ditampilkan sebagai peringatan dini.

Uji tambahan yang gagal dan tidak dipasang: tutupan lahan tahunan Impact Observatory 2017 sampai 2023 (`lab_tutupan.py`; kriteria "positif pada minimal 3 dari 4 tahun uji" gagal, tambahan AP hanya +0,001) dan tinggi kanopi ke bahan bakar (`bahan_bakar.py`; uji 2024 sampai 2026 AUC 0,9075 turun ke 0,9065). Keduanya laboratorium, tanpa workflow dan tanpa menyentuh `model_sebaran.json`.
