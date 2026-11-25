# Usulan target renlap

Halaman ini menjelaskan cara sistem mengusulkan lokasi tujuan dalam rencana lapangan, untuk karhutla dan untuk bencana lain.

## Usulan target renlap karhutla

Data: titik panas 72 jam terakhir, laporan pilot, kekeringan bahan bakar, peta gambut, letak desa, dan prakiraan asap. Mesin berjalan sekali pada malam hari dan sekali pada pagi hari, dan hanya bila diaktifkan.

1. Titik panas yang berjarak 1 km atau kurang dari laporan pilot "bersih" yang lebih baru dibuang. Yang lebih baru dari laporan bersih dipertahankan dengan pengurangan nilai.
2. Titik panas dikelompokkan ke petak, yaitu kotak peta seluas sekitar 0,02 derajat (kira-kira 2 km).
3. Setiap petak diberi nilai dengan menjumlahkan faktor pada tabel di bawah daftar ini. Petak masuk daftar bila nilainya 0,1 atau lebih.
4. Untuk penyiraman air dipilih paling banyak 3 lokasi dari laporan pilot 48 jam terakhir berstatus berapi atau berasap, yang belum dilaporkan bersih sesudahnya dan berada dalam jangkauan.
5. Untuk patroli dipilih paling banyak 8 petak. Caranya: pilih dulu petak bernilai paling tinggi, lalu petak berikutnya yang nilainya tinggi dan letaknya cukup jauh dari yang sudah dipilih (area yang sudah terlihat dalam radius pandang 6 km tidak dihitung lagi), sehingga cakupan seluas mungkin. Rutenya diurutkan dari titik terdekat pangkalan.
6. Jarak jelajah yang dipakai mesin ini 120 mil laut (sekitar 222 km) karena data armada belum terisi. Angka ini berbeda dari 200 km di layar karena keduanya bawaan sementara yang ditetapkan terpisah.

Nilai petak (butir 3):

| Faktor | Tambahan nilai |
| --- | --- |
| Titik panas baru dalam 6 jam terakhir | 2,0 untuk tiap titik (dihitung paling banyak 5 titik) |
| Hari berturut-turut berapi | 1,5 untuk tiap hari (paling banyak 6 hari) |
| Berada di atas gambut | 3,0 |
| Bahan bakar kering | sampai 2,0, makin kering makin besar |
| Ada permukiman dalam 2 km | 2,0 |
| Belum ada laporan pilot berapi dalam 1 km (belum ditangani) | 1,5 |
| Pernah dilaporkan bersih oleh pilot, tetapi muncul titik baru | dikurangi 2,0 |

Contoh: sebuah petak punya 2 titik baru (4,0), berapi 3 hari berturut-turut (4,5), di atas gambut (3,0), dan dekat permukiman (2,0). Nilainya 13,5, jauh di atas batas masuk. Pada contoh ini faktor lain dianggap nol.

Kepercayaan: seluruh bobot adalah **hipotesis**, yaitu masih tebakan terdidik dan belum lolos uji balik. Pakai sebagai bahan pertimbangan. Penalaan ulang direncanakan setelah 14 hari data.

## Usulan target renlap untuk bencana lain

Data: berkas publik tiap bencana, tanpa data karangan. Mesin dijalankan saat staf meminta renlap, dan karhutla tidak berubah.

1. Tiap bencana punya sumber target sendiri (tabel di bawah).
2. Kandidat disaring dengan ambang bencana itu.
3. Tiap kandidat diberi nilai dengan menjumlahkan lima fitur, masing-masing bernilai 0 sampai 1 dan berbobot sama (1,0): **tingkat** (seberapa parah dibanding kandidat lain, misalnya magnitudo gempa dibagi magnitudo terbesar), **baru** (seberapa baru kejadiannya), **terdampak** (seberapa banyak penduduk atau wilayah terdampak), **fasilitas** (seberapa dekat ada fasilitas penting), dan **belum ditangani** (belum ada tindakan tercatat). Fitur yang datanya kosong tidak dihitung dan dicatat, bukan dianggap 0.
4. Kandidat dibagi ke pangkalan terdekat. Patroli paling banyak 8 per pangkalan dengan radius pandang 6 km.

| Bencana | Target dari | Ambang masuk |
| --- | --- | --- |
| Banjir | Kecamatan yang dilaporkan banjir dan belum surut | Semua kecamatan itu menjadi target |
| Pesisir | Pengukuran abrasi pantai | Hanya pengukuran yang tingkat keyakinannya bukan rendah, tidak bermasalah atau perlu ditinjau ulang, dan tidak melewati ambang kritis |
| Kualitas udara | Prakiraan asap | Kecamatan dengan debu halus (PM2,5) rata-rata 24 jam di atas 55,4 mikrogram per meter kubik |
| Kekeringan | Status kekeringan kabupaten | Kabupaten tingkat 2 atau 3 (Siaga dan Awas) |
| Cuaca | Prakiraan cuaca ekstrem kecamatan | Kecamatan tingkat 2 atau lebih |
| Gempa | Katalog gempa 30 hari terakhir | Magnitudo 5 atau lebih |
| Gunung api | Status resmi Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG) | Level 2 atau lebih (level resmi gunung api, makin tinggi makin waspada), radius rekomendasi terisi (jarak yang ditetapkan PVMBG), dan ada penduduk di dalamnya |
| Longsor | Prakiraan longsor dan kerentanan lereng | Bahaya tinggi |

Contoh: pada kualitas udara, kecamatan dengan debu halus 60 mikrogram masuk, sedangkan yang 40 tidak. Bila sumber sebuah bencana kosong, renlap hanya memuat pangkalan dan menjelaskan alasannya, tanpa mengarang target.

Kepercayaan: semua bobot jenis ini sama rata (1,0) dan berstatus **hipotesis**. Model longsor sudah diuji balik dan hasilnya lebih buruk daripada tebakan sederhana berdasarkan kejadian rata-rata sebelumnya (skor kemampuan membedakan wilayah rawan dari yang tidak: 0,70 untuk model dan 0,78 untuk tebakan; makin mendekati 1 makin baik), jadi usulan longsor harus dibaca dengan sangat hati-hati. Ambang kekeringan dan cuaca juga belum lolos uji balik.
