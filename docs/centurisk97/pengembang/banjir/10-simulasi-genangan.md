# Mesin simulasi genangan

Halaman ini menjelaskan mesin simulasi genangan dan skenario Jakarta J1 sampai J4.

## 18. Mesin simulasi genangan (tab Simulasi, genangan Jakarta J1 sampai J4)

Mesin di peramban (`public/banjir/sim_genangan.js` mesin, `sim_kerja.js` Web Worker, `sim_tampak.js` tampilan 3D, `sim_longsor.js`, `sim_lahan.js`) dan padanannya di Node untuk uji dan kalibrasi (`scripts/banjir/genangan/mesin.mjs`).

- Medan: ubin Terrarium AWS (SRTM sekitar 30 m), kisi bawaan 100 kali 100 sel (60 m untuk kotak 6 km sampai 240 m untuk kotak 24 km). Laut = sel di bawah atau sama dengan 0 m yang tersambung ke tepi kisi. Cekungan memakai Priority-Flood dengan 4 tetangga (mesin hanya memindah air lewat 4 sisi sel; dengan 8 tetangga lubang diagonal menjadi perangkap); cekungan lebih dalam dari 0,5 m di bawah ambangnya dianggap derau DEM dan dasarnya dinaikkan (dipilih dari contoh satu lokasi, ambang 2 m masih menahan 57 persen limpasan di lubang derau). Arah aliran D8 dan akumulasi mencari alur utama.
- Hujan: hujan harian ditaruh pada deret jam berpusat pukul 15.00 WIB (asumsi puncak konvektif sore).
- Limpasan: SCS-CN (USDA TR-55) dengan CN bawaan 80 dan kondisi kebasahan awal dari hujan 7 hari dan `sm`.
- Aliran: inersia lokal dengan 72 jam simulasi, neraca massa diperiksa; pembobotan debit terpusat theta 0,9 (theta 1 pecah, 0,7 berpola papan catur).
- Perlakuan: tanggul, pompa, pintu air, pintu muara (pada contoh uji 2020-01 pintu menurunkan masuknya air laut dari 145 juta m3 menjadi 0).

Jakarta J1 sampai J4 (`scripts/banjir/genangan/`): kalibrasi dan uji model genangan DKI dengan label laporan PetaBencana, hujan GSMaP (JAXA), debit hulu GloFAS, dan medan 100 m.

- J3: vonis dikunci, tetapi diagnosis 28 Oktober 2026 (`DIAGNOSIS-J3.md`) menyimpulkan label uji tidak sah: 98 sampai 99,6 persen laporan pada dua kejadian uji adalah laporan latihan atau simulasi, dan hujan nyata hampir nol. POD 0,9 persen mengukur model yang benar terhadap label yang salah. Model sendiri tetap punya masalah: pada kejadian kalibrasi bersih daya pembeda lemah (AUC 0,53 sampai 0,64) dan kalibrasi menang dengan membesarkan luas basah.
- J4: uji PROSPEKTIF musim hujan 2026/27 yang dipra-registrasi (`PRAREG-J4.md`). Model dibekukan (medan 100 m rata-rata blok, drainase seragam 8 mm/jam, durasi 96 jam, CN 80, muka laut 0,6 m, tanggul 2,5 m, hujan GSMaP kali bentuk jam ERA5). Pemicu kejadian: rata-rata hujan harian GSMaP NRT di 42 kecamatan daratan DKI 34 mm atau lebih (X = 34; cadangan X2 = 30). Hari beruntun menjadi satu kejadian. Prediksi dicatat dahulu pada D+2 sampai D+9, label PetaBencana (disaring dari laporan latihan) dikumpulkan sesudahnya. LULUS hanya bila batas bawah AUC rata-rata (laporan lawan sel darat acak) di atas 0,5, artinya laporan cenderung jatuh di sel yang diprediksi lebih dalam. LULUS tidak berarti model lebih baik dari InaRISK atau peta elevasi terendah dan tidak berarti prakiraan genangan akurat; klaim yang boleh hanya "keterampilan relatif terhadap bias lokasi pelapor". Pada kalibrasi AUC rata-rata J4 0,602 lebih rendah dari heuristik elevasi terendah 0,646. Vonis pada kejadian terjudge ke-10 atau 30 April 2027, mana yang lebih dulu; kurang dari 6 kejadian atau 150 laporan = "belum cukup data". Pengumpul berjalan harian lewat `.github/workflows/genangan_j4.yml`.
- Semua berkas yang terdaftar di `scripts/banjir/genangan/j4_sidik.json` (antara lain `sim_genangan.js`, `subsiden_literatur.json`, `scripts/banjir/umum.py`, `public/geo/kecamatan/31.json`) beku sampai uji prospektif J4 selesai dan tidak boleh disunting.
