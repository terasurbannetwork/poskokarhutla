# Rapor pemeriksa bersih: empat deck "Pengaruh Kunjungan Kepala BNPB terhadap Karhutla" (13 Nov 2026)

Cara periksa: PDF dirender 60 dpi (12 slide per deck, slide 2, 5, 6, 7, 9, 10, 11 dibaca sebagai gambar dan teks). Angka slide 2, 5, 9, 11 dihitung ulang dengan skrip sendiri dari `data/papsel/sumber/peta_karhutla.json` dan `peta_karhutla_kab.json` (jendela pra D-20..D-11, sebelum D-10..D-1, sesudah D+1..D+10, hari celah = `celah` + 2 hari sesudahnya + `celah_turunan`, pembanding = 32 provinsi di luar 93, 16, 62, 64, 35, 18). Uji tambahan: pembanding tanpa hari celah dan pembanding provinsi tetangga.

**Hasil hitung ulang:** semua angka slide 2, 5, 9, 11 di keempat deck cocok dengan hitungan ulang (luas/belum/hotspot per hari, laju, pembanding, laju tanpa celah, nilai tengah rasio, padam dua hari, belum/luas, porsi kabupaten). Satu-satunya ketidakcocokan yang tampak di layar adalah Jawa Timur slide 2 (329% di kartu, 330,0% di label grafik). Rinciannya ada di temuan tiap deck.

Hari celah per jendela (dari data):

| Deck | Hari celah pra | Hari celah sebelum | Hari celah sesudah | Hari bersih (pra/seb/ses) |
|---|---|---|---|---|
| Sumsel | 5 | 3 | 6 (20 Okt, 24 Okt + turunan) | 5 / 7 / 4 |
| Kalteng-Kaltim | 4 | 3 | 6 | 6 / 7 / 4 |
| Jatim | 3 | 6 (13 dan 20 Okt + turunan) | 3 (24 Okt + turunan) | 7 / 4 / 7 |
| Lampung | 3 | 5 | 2 | 7 / 5 / 8 |

Uji pembanding yang tidak ada di deck (dihitung sendiri):

| Deck | Wilayah, laju sesudah | 32 provinsi lain | 32 provinsi lain tanpa hari celah | Wilayah tanpa hari celah | Provinsi tetangga tidak dikunjungi |
|---|---|---|---|---|---|
| Sumsel | -51% | -14% | -26% | -64% | Jambi, Bengkulu, Babel: -30% |
| Kalteng-Kaltim | -22% | -21% | **-42%** | -28% | Kalbar, Kalsel, Kaltara: **-31%** |
| Jatim | -92% | -58% | -60% | -97% | Jateng, DIY, Bali, NTB: -59% (pra ke sebelum +31%, Jatim +329%) |
| Lampung | -92% | -64% | -61% | -89% | Bengkulu, Banten, Jambi: **-82%** |

---

## 1. Sumatera Selatan (kunjungan 18 Okt 2026, Ogan Komering Ilir)

| Dimensi | Nilai | Bukti |
|---|---|---|
| Judul | 4 | Judul slide 2 dan 11 didukung data: -51% lawan -14% pembanding, -64% lawan -26% tanpa hari celah, -30% di provinsi tetangga. Tetap tersirat sebab-akibat ("sesudah kunjungan ..., kebakaran turun lebih cepat"). |
| Grafik | 4 | Batang tiga periode bertanggal jelas. Zona "Sesudah kunjungan" di slide 5 membentang sampai 12 Nov, bukan 19-28 Okt, dan tidak ada penanda hari kunjungan. |
| Tata letak | 3 | Panel "Cara membaca" di slide 7 berhuruf kira-kira dua kali huruf tabel, rata kanan-kiri dengan celah lebar. Kartu slide 11 separuh kosong. |
| Sumber dan angka | 4 | Semua angka cocok dengan hitungan ulang. Jumlah hari bersih (4 dari 10 di jendela sesudah) tidak disebut. |
| Alur | 4 | Ringkasan, tren, peta, kabupaten, ukuran, rasio, kesimpulan mengalir. Arahan di slide 11 sudah basi (lihat temuan 3). |
| Rasa mahal | 3 | Rapi dan konsisten, tetapi slide 7 dan 11 terasa kosong atau berisi teks pengisi umum. |

### Temuan

1. **Jendela sesudah lebih banyak terkena celah satelit daripada jendela sebelum (6 lawan 3 hari).** Celah menurunkan luas, jadi penurunan 51% sedikit terbantu oleh data yang hilang. Uji tanpa hari celah tetap -64%, jadi kesimpulannya bertahan, tetapi baris itu hanya memakai 4 hari bersih dan jumlah itu tidak tertulis di slide 9 dan 11.
2. **Kecepatan padam bukti campuran.** Padam dua hari naik 22% ke 39% (membaik), tetapi nilai tengah belum padam dibanding kemarin naik 77% ke 82% (sedikit memburuk, divonis "Setara"). Slide 9 pita "Kecepatan padam: Membaik" hanya memilih ukuran yang baik.
3. **Arahan basi.** "Pertahankan regu darat dan armada udara di Ogan Komering Ilir sampai hujan merata" didasarkan pada jendela 19-28 Okt. Data 13 Nov menunjukkan luas provinsi sekitar 78 ha per hari (slide 5) sejak 26 Okt. Arahan perlu bertumpu pada keadaan per 12 Nov, atau diberi tanggal.
4. **Pembanding pada slide 9 tidak diuji tanpa hari celah**, padahal wilayahnya diuji. Tambahkan baris pembanding tanpa hari celah (-23% lalu -26%) supaya ujinya setara.
5. **Klaim sebab-akibat.** Judul slide 11 menempelkan penurunan pada "kunjungan Kepala BNPB ke Ogan Komering Ilir". Penyeimbangnya hanya satu kartu "Faktor lain", dan hujan serta OMC tidak diberi angka. Untuk Sumsel datanya paling kuat di antara empat deck. Tetap layak ditulis "bersamaan dengan", bukan "akibat".
6. Slide 7: kolom Perubahan menampilkan angka tanpa tanda (panah saja), sedangkan panel menulis "Perubahan negatif berarti...". Kalimat dan tampilan tidak cocok.
7. Slide 5: zona "Sesudah kunjungan" membentang sampai 12 Nov, sehingga pembaca mengira jendela sesudah berlangsung 25 hari. Batasi ke 19-28 Okt atau beri dua warna.

---

## 2. Kalimantan Tengah dan Kalimantan Timur (kunjungan 19 Okt 2026, Pulang Pisau)

| Dimensi | Nilai | Bukti |
|---|---|---|
| Judul | 3 | "Berbalik turun, setara dengan provinsi lain" jujur terhadap pembanding mentah (-22% lawan -21%), tetapi tanpa hari celah pembanding turun -42% dan tetangga -31%, jadi "setara" terlalu murah hati. |
| Grafik | 4 | Slide 5 jelas memperlihatkan puncak musim (28.624 ha, 22 Okt) di dalam jendela sesudah. Slide 10 terbaca. |
| Tata letak | 3 | Masalah slide 7 dan 11 sama dengan Sumsel. |
| Sumber dan angka | 3 | Angka cocok. Asumsi tanggal kunjungan Kaltim disamakan dengan Kalteng hanya ada di `_catatan` spek, tidak tertulis di slide mana pun. |
| Alur | 3 | Ringkasan menulis "berbalik turun", sementara lokasi kunjungan naik 5% dan menjadi penyumbang terbesar sesudah kunjungan. Arahan menyasar Pulang Pisau, yang konsisten, tetapi bertentangan dengan nada judul. |
| Rasa mahal | 3 | Sama dengan Sumsel. |

### Temuan

1. **Uji celah satelit membalik vonis pembanding.** Tanpa hari celah, Kalteng-Kaltim -28% sedangkan 32 provinsi lain -42%. Provinsi tetangga yang tidak dikunjungi (Kalbar, Kalsel, Kaltara) -31%. Dengan uji yang setara, wilayah ini turun lebih lambat, bukan "setara". Judul slide 2, 9, 11 dan pita "Dibanding provinsi lain: Setara" perlu ditinjau.
2. **Asumsi tanggal Kaltim tidak diungkap.** Kaltim tidak dikunjungi menurut sumber (InfoPublik 20 Okt hanya Pulang Pisau). Tanggal kunjungan Kaltim disamakan atas arahan pemilik, tetapi slide tidak menyebutnya. Sampul hanya menulis "Pulang Pisau, 19 Oktober 2026". Perlu satu kalimat di slide 2 atau 5.
3. **Jendela sesudah memuat puncak musim.** 22-23 Okt (D+3, D+4) adalah hari terbesar di grafik (28.624 dan 26.386 ha). Penurunan 22% sepenuhnya berasal dari 25-29 Okt, bersamaan dengan anjloknya angka nasional. Untuk pemimpin, "berbalik turun sesudah kunjungan" mudah terbaca sebagai akibat kunjungan, padahal tiga hari pertama justru naik.
4. **Lokasi kunjungan memburuk.** Pulang Pisau +5% (17.124 ke 17.954 ha), naik dari peringkat 2 ke 1, Kapuas +11%. Ini ada di slide 2 dan 7, tetapi judul ringkasan tidak mencerminkannya.
5. **Sebanyak 6 dari 10 hari jendela sesudah terkena celah, dan baris tanpa celah hanya memakai 4 hari.** Jumlah hari tidak ditulis.
6. "Belum padam dibanding kemarin" 112% ke 93% divonis "Membaik", sedangkan padam dua hari 29% ke 32% "Setara". Pita slide 9 hanya menampilkan "Setara". Bukti campuran, tidak salah, tetapi perlu konsisten di kartu slide 11.
7. Visual: masalah slide 7 dan 11 sama dengan deck Sumsel (lihat temuan Sumsel 6-7).

---

## 3. Jawa Timur (kunjungan 23 Okt 2026, Kota Batu)

| Dimensi | Nilai | Bukti |
|---|---|---|
| Judul | 2 | Judul slide 7 tentang Kota Batu (-86%) padahal Kota Batu tidak ada di tabelnya. "Berbalik turun, lebih cepat dari provinsi lain" mengabaikan lonjakan +329% sebelumnya (kembali ke rata-rata). |
| Grafik | 3 | Slide 10: sumbu kategori melompati tanggal (27 lalu 30 Okt) tanpa tanda. Slide 2: label batang "naik 330,0%" tidak sama dengan kartu "naik 329%". |
| Tata letak | 3 | Masalah slide 7 dan 11 sama dengan deck lain. |
| Sumber dan angka | 2 | Baris sorot lokasi kunjungan tidak ada. Angka 329 dan 330,0 tidak cocok. Jumlah kabupaten sesudah 694 ha, provinsi 706 ha. |
| Alur | 2 | Lokasi kunjungan adalah tempat rapat (0,8% luas terbakar), jadi slide 7 tidak punya bahan. Arahan menyasar Malang dengan 93 ha per sepuluh hari. |
| Rasa mahal | 3 | Tampilan rapi. Isinya paling rapuh dari empat deck. |

### Temuan

1. **Slide 7: Kota Batu tidak ada di tabel, tetapi judul dan panel membahasnya.** Kota Batu 70 ha ke 10 ha, di luar 12 besar. Panel "Baris yang disorot adalah kabupaten lokasi kunjungan" salah karena tidak ada baris yang disorot. Peta slide 6 juga tidak memberi label Kota Batu.
2. **Penurunan sudah mulai sebelum kunjungan, dan +329% adalah lonjakan pendek.** Puncak 16 Okt (1.722 ha), 22 Okt 811 ha, 23 Okt 549 ha. Jendela sebelum (13-22 Okt) adalah lonjakan 4,3 kali jendela pra. Penurunan sesudah sebagian besar merupakan kembali ke rata-rata dan bersamaan dengan anjloknya angka nasional (pembanding -58%, tetangga -59%). Kalimat "lebih cepat dari provinsi lain" tidak adil karena laju sebelum kunjungan sangat berbeda (Jatim +329%, pembanding -14%, tetangga +31%).
3. **Ketidakcocokan angka di slide 2.** Kartu "naik 329%" (dari jumlah mentah 2.173 ke 9.329 ha) dan label grafik "naik 330,0%" (dari rata-rata dibulatkan 217 ke 933). Satu sumber harus dipakai di keduanya. Hal yang sama terjadi pada 4,7% lawan 5% di Lampung, tetapi di sana pembulatannya konsisten.
4. **Uji celah memakai 4 hari bersih di jendela sebelum** (13-15 dan 20-22 Okt kena celah). Hasil "+538%" adalah angka yang besar dari contoh yang kecil. Jumlah hari tidak ditulis.
5. **Rapat koordinasi di Kota Batu bukan lokasi api.** Kartu "Lokasi kunjungan" dan butir slide 2 "Kota Batu turun 86%" menyiratkan dampak setempat dari 70 ha. Lebih jujur: sebutkan bahwa Kota Batu menyumbang 1% luas, lalu fokus pada provinsi.
6. **Arahan tidak sepadan.** "Pertahankan regu darat dan armada udara di Malang" untuk 93 ha dalam sepuluh hari (sekitar 9 ha per hari). Per 12 Nov provinsi sekitar 39 ha per hari.
7. Slide 10: sesudah kunjungan hanya 9 titik rasio. Tanggal dengan belum padam kemarin = 0 dibuang, dan sumbu kategori menyembunyikan lubangnya (27 lalu 30 Okt).

---

## 4. Lampung (kunjungan 24 Okt 2026, Way Kambas, Lampung Timur)

| Dimensi | Nilai | Bukti |
|---|---|---|
| Judul | 3 | -92% lawan pembanding -64% benar, tetapi tetangga -82%, dan 24 Okt adalah hari celah satelit. Judul slide 10 "belum padam ... tinggal 0% sesudahnya" menyesatkan. |
| Grafik | 3 | Slide 10: jendela sesudah hanya 3 titik (25-28 Okt), sumbu berhenti di 28 Okt padahal jendela sampai 3 Nov. Peta slide 6 punya kelas "tanpa data" yang tidak ada di deck lain, dan Lampung Timur tidak diberi label. |
| Tata letak | 3 | Masalah slide 7 dan 11 sama dengan deck lain. |
| Sumber dan angka | 3 | Angka cocok. Nilai tengah 0% berasal dari 3 rasio (24, 0, 0). Belum padam = 0 pada 28 Okt sampai 3 Nov, sedangkan hotspot 2-26 per hari, sebuah artefak metode yang tidak dijelaskan. |
| Alur | 3 | Slide 2 butir Lampung Timur "turun sama besar" tanpa angka. Arahan untuk Tulang Bawang 82 ha per sepuluh hari. |
| Rasa mahal | 3 | Sama dengan deck lain. |

### Temuan

1. **Slide 10, judul "0% sesudahnya" tidak layak tampil.** Hanya 3 hari punya pembagi (belum padam kemarin di atas 0). Nilai tengah dari 24%, 0%, 0% tidak mewakili "tiap hari ... biasanya". Grafiknya juga berhenti di 28 Okt. Sebaiknya tulis "belum padam habis sejak 26 Okt" dan pakai ukuran padam dua hari (65% ke 82%) sebagai judul.
2. **Pembanding tetangga mengecilkan keunggulan.** Bengkulu, Banten, Jambi turun 82%, Lampung 92%. Hari kunjungan 24 Okt sendiri adalah hari celah satelit, dan 25-26 Okt adalah turunannya (luas 83 dan 8 ha). Penurunan tajam tepat sesudah kunjungan sebagian adalah lubang data, meskipun uji tanpa celah tetap -89%.
3. **Kunjungan bersamaan dengan anjloknya angka nasional** (32 provinsi -64%, luas harian pembanding 10.000 ke 3.616 ha). "Pengaruh" dan "lebih cepat dari provinsi lain" perlu diimbangi dengan fakta ini di slide 2, tidak hanya di kartu "Faktor lain".
4. Slide 2 butir "Lampung Timur ... turun sama besar dengan penurunan seluruh provinsi" tanpa angka, padahal slide 7 menulis 92%. Pemimpin perlu angkanya.
5. Belum padam = 0 selama 28 Okt sampai 3 Nov, sementara luas 2-58 ha per hari, adalah akibat aturan "bertahan 12-36 jam". Belum padam dibanding luas 56% ke 21% divonis "Membaik" sebagian karena aturan ini, bukan karena pemadaman.
6. Slide 6: legenda punya kelas "tanpa data", sedangkan tiga deck lain tidak. Lokasi kunjungan (Lampung Timur) tidak diberi label di kedua peta.
7. Arahan "Pertahankan ... di Tulang Bawang" untuk 82 ha per sepuluh hari, dengan provinsi sekitar 33 ha per hari per 12 Nov. Arahan ini tidak sepadan.

---

## Lintas deck

**Keterbacaan slide 2 untuk pemimpin non-teknis.** Batang tiga periode dan butir "Apa artinya" mudah dibaca. Ada tiga sandungan:
- Kartu "turun 7% sebelum kunjungan" mudah dibaca sebagai "api turun 7% sebelum kunjungan datang". Maksudnya laju sepuluh hari sebelum dibanding sepuluh hari sebelumnya. Lebih jelas: "8-17 Okt dibanding 28 Sep-7 Okt: turun 7%".
- "Luas yang padam dalam dua hari 22% sebelum dan 39% sesudah" tidak dijelaskan di slide 2.
- Label persen di bawah batang terlalu kecil dan berbeda pembulatan dengan kartu.

**Keadilan perbandingan.**
- Ukuran persen per sepuluh hari dan pembanding tanggal sama sudah apple to apple untuk besar kebakaran.
- Ada tiga kelemahan. Pertama, pembanding gabungan 32 provinsi didominasi Kalbar dan Kalsel (sekitar sepertiga), bukan wilayah dengan rezim hujan yang sama; pembanding tetangga memberi hasil berbeda (Kalteng-Kaltim dan Lampung melemah). Kedua, laju sebelum kunjungan tidak sejajar dengan pembanding (Jatim +329% lawan -14%), jadi membandingkan hanya laju sesudah mengabaikan kembali ke rata-rata. Ketiga, uji tanpa hari celah hanya diterapkan pada wilayah, tidak pada pembanding, dan jumlah hari bersih (3-4 hari di beberapa jendela) tidak ditulis.

**Kata "pengaruh" dan klaim sebab-akibat.** Judul halaman tidak dinilai (permintaan pemilik). Judul ringkasan dan kesimpulan ("Sesudah kunjungan ... ke X, kebakaran turun lebih cepat") ditambah arahan menyiratkan kunjungan sebagai penyebab. Penyeimbangnya hanya satu butir dan satu kartu "Hujan dan OMC" tanpa angka hujan atau OMC. Bukti paling kuat ada di Sumsel. Kalteng-Kaltim dan Jatim paling lemah.

**Visual berulang.**
- Slide 7: huruf panel "Cara membaca" sekitar dua kali huruf tabel, isinya teks pengisi umum, dan kalimat "Perubahan negatif" tidak cocok dengan kolom yang tanpa tanda.
- Slide 11: delapan kartu dengan sekitar 40% ruang kosong, dan judul kartu kabur ("Rata-rata per hari", "Setara").
- Slide 5: zona sesudah membentang sampai 12 Nov dan tidak ada penanda hari kunjungan.
- Slide 10: sumbu kategori menyembunyikan tanggal yang hilang.
- Slide 9: sebelas baris rapat. Baris "rata-rata biasa ... Terdistorsi hari lonjakan" menampilkan ukuran yang lalu disangkal sendiri, dan bisa dibuang.
- Arahan di keempat deck didasarkan pada jendela yang berakhir 28 Okt sampai 3 Nov, padahal data per 12 Nov sudah mendekati nol.
