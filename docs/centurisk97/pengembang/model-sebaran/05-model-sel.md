# Model sel dan gerbang pembanding

Halaman ini mencatat model sel per kotak dan gerbang pembanding sederhana yang menentukan penampilannya.

## Model sel: peluang tiap sel terbakar, Monte Carlo, kalibrasi (`gbdt.py`, `latih_jalan.py`, `sebaran_model.js`)

Model: regresi logistik dan gradient boosting pohon dangkal ditulis tangan dengan pustaka standar Python (`gbdt.py`; versi numpy `gbdt_np.py` untuk data jutaan baris). Pohon disimpan sebagai daftar simpul datar `[fitur, ambang, kiri, kanan]` atau `[nilai]`; skor adalah `bias + jumlah daun` dan peluang `1 / (1 + e^-skor)`. Model terpasang: 150 pohon, 40 fitur, bias -4,811651, dipilih di validasi 2023 dari kisi kedalaman 3, 4, 5 dan 50 sampai 200 pohon (`model_sebaran.json`; `RISET-SEBARAN.md` bagian 6). Pemangkasan fitur dicoba dan dibatalkan karena logloss validasi memburuk (0,02494 lawan 0,02487).

Satu langkah adalah 24 jam, tiga langkah menjadi 72 jam. Untuk tiap langkah, tiap sel calon mendapat peluang. Ada dua cara menjalankan:

1. Deterministik: sel dianggap terbakar bila peluang sama dengan atau di atas `tau`. `tau = 0,08` (`model_sebaran.json`). Tiap strata punya pergeseran logit sehingga ambang efektif `tauEff = sigmoid(logit(tau) + geser)` dan peta deterministik tidak berubah oleh kalibrasi ulang (`sebaran_model.js:245`).
2. Monte Carlo: setiap sel diundi dengan peluangnya (bawaan 40 putaran di peramban, maksimum 200; kartu Simulasi memakai 60). Peluang sel adalah frekuensi kumulatif, sebaran luas diambil dari persentil 10, 50, dan 90.

Strata ditentukan dari titik awal (`strataTitik`): gambut bila sel awal gambut; sabana bila (bujur antara 118,5 dan 125,6 dan lintang di bawah -8) atau (bujur di atas 137 dan lintang di bawah -5,5); selain itu mineral. Pergeseran logit hasil analisis kesalahan: gambut -0,5, mineral -0,25, sabana 0. Pemilihan model per strata di validasi: gambut dan mineral boosting, sabana McArthur; pilihan sabana itu tidak bertahan di uji, sehingga model peramban tetap boosting di semua strata.

Rentang luas dilebarkan dengan kalibrasi konformal (`lolos.py selang`, kunci `selang` di JSON): di ruang `log(1 + sel baru)`, P10 dan P90 Monte Carlo diperlebar sebesar `q` per kombinasi lahan dan tanda WASPADA, dikalibrasi pada 540 titik awal deteksi pertama 2015 sampai 2023 dengan model yang tidak melihat tahunnya, target cakupan 80 persen. Nilai `q` pada berkas saat ini: 0 untuk `mineral|0`, `sabana|0`, `*|0`; 0,6931 untuk `*|1` (semua lahan dengan tanda WASPADA). Setelah peta gambut baru, kelompok gambut tidak lagi punya `q` sendiri (kurang dari 40 titik kalibrasi per tanda). Cakupan rentang pada uji 2024 sampai 2026 naik dari 76, 72, 70 persen menjadi 80, 75, 73 persen pada 24, 48, 72 jam; pada 123 kejadian lalu dari 52, 48, 42 menjadi 61, 57, 55 persen. Untuk api yang benar-benar besar, rentang tetap terlalu sempit.

Angka kinerja model sel pada uji 2024 sampai 2026 (604 titik awal, `kinerja_uji`): F1 sel baru 24 jam 0,3835 (selang 95 persen 0,347 sampai 0,4213), IoU 24 jam 0,6477 (0,6258 sampai 0,6721), salah arah 24 jam 81,3 derajat (69,9 sampai 92,2), AUC "membesar" cara lama (porsi Monte Carlo) 0,7012. Pembanding "persistensi" (api tidak tumbuh) memiliki IoU kumulatif yang lebih tinggi karena sel awal mendominasi; ukuran yang adil untuk "ke mana menyebar" adalah F1 sel baru.

## Gerbang pembanding sederhana (`gerbang.py`)

Menulis `public/data/gerbang_model.json` dengan kunci `model_sel`, `mesin_fisika`, `jejak_api`, `lolos` (`gerbang.py:33`). Aturan tetap: `boleh_tampil` hanya bila selisih (model lebih baik dari pembanding) di atas 0 DAN batas bawah selang 95 persen bootstrap berpasangan atas kasus (2000 ulangan, biji 7) di atas 0; tanpa selang berarti `false` dengan alasan "belum ada selang". Peluang membesar juga wajib vonis prospektif `lolos`. Pembaca bersifat gagal-tertutup: berkas hilang, rusak, atau kunci tidak ada berarti keluaran disembunyikan (`sebaran_model.js:304`, `sim_data.js`, `insight_sebaran.js`, `jejak.py`, `src/ews.js`). Isi salinan lokal (dibuat 23 Okt 2026):

| Keluaran | Metrik | Model | Pembanding | Selang 95% selisih | Boleh tampil |
| --- | --- | --- | --- | --- | --- |
| `model_sel` | IoU sel terbakar 24 jam, 123 kasus | 0,5842 | persistensi 0,6726 | -0,1296 sampai -0,0494 | tidak |
| `mesin_fisika` | Galat log luas 72 jam (kecil lebih baik) | 3,5017 | luas awal tetap 1,0085 | -3,0095 sampai -1,9925 | tidak |
| `jejak_api` | IoU 72 jam (bukti tidak langsung) | 0,5485 | persistensi 0,6081 | -0,1053 sampai -0,0172 | tidak |
| `lolos` | Brier skill terhadap laju dasar, uji balik historis 2024 sampai 2026 (n 10.675) | 0,364 | 0 | belum ada selang | tidak (vonis prospektif belum `lolos`) |

Jalankan ulang tiap kali `sebaran_kasus.json`, `model_sebaran.json`, atau `prospektif.json` berubah; di CI langkahnya ada sesudah `prospektif.py`.
