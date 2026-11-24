# Hasil lab InSAR gambut (Palangka Raya (frame 003D_09241_131313), 2023-08-07..2023-11-11 (api); 2023-11-11..2024-01-22 (pasca))

| Jendela | piksel terbakar | piksel kontrol | koheren % | dh cm (p10 .. p90) | D_insar cm | vonis |
| --- | --- | --- | --- | --- | --- | --- |
| pra | 1 | 178 | 0.1 | tak terukur (tak terukur .. tak terukur) | tak terukur | tak_terukur |
| api | 1 | 178 | 0.1 | tak terukur (tak terukur .. tak terukur) | tak terukur | tak_terukur |
| pasca30 | 1 | 175 | 0.1 | tak terukur (tak terukur .. tak terukur) | tak terukur | tak_terukur |
| pasca90 | 0 | 175 | 0.0 | tak terukur (tak terukur .. tak terukur) | tak terukur | tak_terukur |
| api_tm | 1 | 475 | 0.1 | tak terukur (tak terukur .. tak terukur) | tak terukur | eksploratif: tak_terukur |
| pasca30_tm | 1 | 440 | 0.1 | tak terukur (tak terukur .. tak terukur) | tak terukur | eksploratif: tak_terukur |
| pasca90_tm | 0 | 438 | 0.0 | tak terukur (tak terukur .. tak terukur) | tak terukur | eksploratif: tak_terukur |

Jendela `pra` hanya 12 hari (satu pasang epoch, bukan vonis). Baris `*_tm` tanpa topeng mutu LiCSBAS: eksploratif, bukan dasar vonis.
Vonis resmi dihitung dari jendela `api` menurut kriteria terkunci (RENCANA-UJI §2, dibekukan di commit 0944468f9 sebelum lab ini): **`tak_terukur`**.

## Selisih lawan literatur

| Ukuran | InSAR C-band (lab ini) | Literatur / pembanding |
| ------ | ---------------------- | ---------------------- |
| Tambahan penurunan area terbakar lawan kontrol | tak terukur (1 dari 754 piksel terbakar punya nilai) | pembanding Geoaccess: 1,26 cm (Palangka Raya, Jul-Sep 2026; kami tidak membuka sumbernya) |
| D = α × Δh, α = 1,0 | tak terukur (bukan 0) | Ballhorn dkk. 2009: 33 ± 18 cm; rentang `gambut_bara.py` 15 sampai 51 cm |
| Sebaran piksel kontrol saja (jendela api, p10 / p50 / p90) | -0,49 / 0,17 / 0,95 cm | |

Yang bisa dikatakan: dispersi piksel kontrol dalam satu jendela (sekitar 1,4 cm antara p10 dan p90) sudah sebesar tambahan 1,26 cm
yang dilaporkan pembanding; kami tidak dapat membuktikan atau membantah angka itu karena area terbakar tidak terukur di data kami.
Kepekaan α (0,5; 1,0; 2,0) dan kontrol 2 sampai 10 lawan 2 sampai 20 km: semuanya tak terukur, tidak ada angka untuk disandingkan.

## Uji sebab (ALGORITMA F)

| Dugaan | Hasil | Arah |
| ------ | ----- | ---- |
| (a) salah bungkus fase | batas fase π = λ/4 = 1,39 cm per interferogram 12 hari (λ = 5,55 cm), atau laju gradien tetangga sekitar 422 mm/thn (42 cm/thn) per piksel. Porsi piksel berisiko: terbakar 0% (jendela api, 1 piksel); kontrol 0% (api), 5,05% (pasca30). Ambang pembanding "± 1,4 cm per 12 hari" cocok dengan λ/4 yang dihitung ulang. | tidak dapat diuji di area terbakar (1 piksel); di kontrol bukan penjelas utama |
| (b) dekorelasi dan bias seleksi | piksel dengan unwrapping valid (n_unw > 0): terbakar 0,13% (1 dari 754), kontrol cincin 4,52%, gambut tak terbakar seluruhnya 3,72%, non-gambut 37,9%. coh_avg median piksel yang selamat: kontrol 0,060, non-gambut 0,049 (ambang LiCSBAS 0,05). | **menguat**: area terbakar 0,13% lawan kontrol 4,52% dan gambut tak terbakar 3,72%, jadi area terbakar lebih sering kehilangan koherensi; tetapi tidak dapat dipisah dari efek topeng (Sentinel-2 pasca hanya 28,7% valid) dan sampel terbakar hanya 1 piksel |
| (c) oksidasi pasca-api | tidak ada piksel terbakar terukur di jendela pasca30 dan pasca90 | tidak dapat diuji |

Dua sebab tidak bisa dipisah dari data ini: dekorelasi gambut (b) menghabiskan sampel sebelum (a) dan (c) bisa diuji.
Yang terukur hanya kontrol yang selamat, dan itu adalah bagian kecil gambut yang koheren (bias seleksi).

## Batas lab ini

- Musim berbeda dari D3 (2023, bukan Jul-Sep 2026): bingkai LiCSAR berakhir 23 Jan 2026. Vonis berlaku untuk kotak, musim, dan bingkai ini saja (Q5).
- Satu geometri (turun), vertikal = LOS/U; tanpa GACOS; 16 epoch, 39 interferogram lolos loop closure; 12 hari per epoch (S-1A).
- Valid komposit Sentinel-2 pasca hanya 28,7% (awan dan asap Nov-Jan): topeng terbakar (754 piksel kasar, sekitar 0,33 km² per piksel) adalah batas bawah, bukan luas terbakar.
- Selang bootstrap piksel terlalu sempit karena korelasi spasial (tidak berlaku di sini; tak ada selang).

## IG-05: kandidat L-band (catatan, tanpa unduhan)

Sampai di sini C-band tidak mengukur gambut terbakar di kotak ini; L-band (panjang gelombang sekitar 24 cm) adalah kandidat alami karena lebih tahan dekorelasi di vegetasi
dan salah bungkus lebih jarang. Hal berikut BELUM diperiksa oleh kami (pengetahuan umum, bukan hasil baca): produk ALOS-2 PALSAR-2 dan NISAR memiliki jalur akses dan lisensi berbeda
(arsip ALOS-2 lewat JAXA dan mitra; NISAR lewat arsip NASA), dan keduanya dipasang di luar repo dengan alat yang berbeda dari LiCSBAS. Prasyarat sebelum apa pun diunduh: jawaban Q4 dari pemilik,
pemeriksaan lisensi tiap sumber, dan satu pengolah di luar repo; hanya laju LOS float32 yang boleh masuk (DESAIN-TEKNIS ADR-1). Tidak ada yang diunduh.
