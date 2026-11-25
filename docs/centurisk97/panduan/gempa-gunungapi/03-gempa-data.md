# Data gempa dan cara membaca angka

Halaman ini menjelaskan dari mana data gempa berasal dan bagaimana kejadian dikelompokkan.

## Cara membaca bagian ini

Tiap sub-bagian punya empat bagian tetap: pertanyaan yang dijawab, langkah hitungnya, contoh, dan seberapa bisa dipercaya. Angka uji yang rinci sengaja dibatasi pada yang mengubah cara Anda memakai hasilnya.

Uji balik adalah cara kita memeriksa model. Model dijalankan pada masa lalu yang kejadiannya sudah diketahui, lalu hasilnya dibandingkan dengan yang benar-benar terjadi. Aturan lulus ditetapkan sebelum hasil dilihat, supaya model tidak disetel agar tampak bagus. Model juga dibandingkan dengan tebakan sederhana, misalnya "besok sama dengan kebiasaan bulan ini".

Model yang lulus boleh tampil tanpa tanda khusus. Model yang belum lulus tetap boleh tampil, tetapi diberi label "Hipotesis" dan kegagalan ujinya diakui terang-terangan. Artinya: belum terbukti cukup tepat, pakai sebagai bahan pertimbangan dan bukan sebagai dasar keputusan tunggal.

Beberapa istilah yang dipakai di bawah:

- **Skor keunggulan.** Ukuran seberapa jauh model lebih baik dari tebakan sederhana. Nol berarti sama saja, di atas nol berarti lebih baik, dan 1 berarti sempurna. Di bawah nol berarti lebih buruk dari tebakan sederhana.
- **AUC.** Ukuran kemampuan model membedakan kejadian dari bukan kejadian. 0,5 sama dengan tebakan acak dan 1 sempurna.
- **Persentil ke-95.** Nilai yang hanya dilampaui 5 dari 100 pengamatan. Persentil ke-10 berarti hanya 10 dari 100 yang lebih rendah.
- **Klimatologi.** Kebiasaan jangka panjang suatu tempat pada waktu tertentu, misalnya hujan rata-rata bulan Agustus.
- **Peringatan keliru.** Peringatan yang tidak diikuti kejadian tercatat.
- **Gempa utama dan susulan.** Gempa utama adalah gempa terbesar dalam satu rangkaian. Susulan adalah gempa-gempa lebih kecil yang menyusul di dekatnya.
- **Prakiraan ansambel.** Satu prakiraan cuaca yang dijalankan banyak kali dengan sedikit variasi awal, sehingga hasilnya berupa sebaran kemungkinan.

## Dari mana data gempa berasal dan bagaimana kejadian dikelompokkan

**Pertanyaan.** Gempa apa yang terjadi, dan mana yang satu rangkaian.

**Langkah.** Data berasal dari BMKG (gempa terkini, gempa dirasakan) dan USGS (katalog gempa dunia untuk Indonesia dan sekitarnya, M 4,5 atau lebih). Gempa terbaru diperbarui setiap menit, sumber lain setiap lima menit.

1. Teks BMKG diubah menjadi angka: magnitudo, kedalaman, waktu, dan koordinat.
2. Teks potensi tsunami dibaca: "tidak berpotensi tsunami" menjadi tingkat 0, "berpotensi tsunami" dengan kata Waspada, Siaga, atau Awas menjadi tingkat 1, 2, atau 3, dan selain itu dibiarkan kosong.
3. Gempa BMKG dan USGS dianggap gempa yang sama bila selisih waktunya 90 detik atau kurang dan jaraknya 100 km atau kurang. Bila sama, magnitudo dan lokasi BMKG yang dipakai.
4. Wilayah ditentukan dari pusat kecamatan terdekat dalam 300 km. Gempa di laut jauh hanya memuat teks wilayah dari sumber.
5. Gempa M 5 atau lebih digabung ke kejadian yang masih aktif bila jaraknya masuk jendela perkiraan sebaran susulan. Jendela ini makin lebar untuk gempa makin besar. Satu kejadian aktif 3 hari, atau 7 hari bila M 6,5 atau lebih.
6. Gempa lebih kecil yang jatuh di dekat dan sesudah gempa utama dihitung sebagai susulannya.

**Contoh.** Gempa M 7 membuka jendela dengan radius sekitar 70 km. Gempa M 5 yang terjadi 40 km darinya, dua hari kemudian, dihitung sebagai bagian kejadian yang sama.

**Seberapa bisa dipercaya.** Bagian ini hanya mencatat dan mengelompokkan, tidak meramal.
