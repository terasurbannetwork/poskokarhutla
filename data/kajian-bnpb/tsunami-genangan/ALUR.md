# ALUR: Simulasi tsunami dengan genangan darat

## 1. Pembaca

1. Membuka rincian gempa di `/gempa`, menekan Simulasikan (`/gempa/sim?lat=&lon=&m=&dalam=`).
2. Tab Simulasi memeriksa `Tsunami.layak`. Bila tidak layak, bagian tsunami tidak tampil (perilaku sekarang).
3. Pita status resmi BMKG dan PTWC tetap di atas bila ada.
4. Simulasi kasar jalan di peramban (animasi T + N menit, waktu tiba, tinggi indikatif), seperti sekarang.
5. Peramban membaca indeks skenario genangan. Bila ada skenario pustaka yang cocok (ALGORITMA bagian 6) muncul pemilih pantai dan label "skenario pustaka: M 8,5, selisih 0,2 M, jarak 40 km". Bila tidak ada, bagian genangan tidak tampil dan tertulis "genangan belum dihitung untuk gempa ini".
6. Pembaca memilih pantai. Peta zoom ke kotak halus, animasi mengikuti geser waktu, genangan maksimum tampil di bawah legenda meter.
7. Panel angka: luas tergenang, persen terhadap luas darat kotak halus, kedalaman maksimum, waktu tiba pertama.
8. Panel run-up: titik terukur dan batang historis per lokasi terdekat, berdampingan dengan hasil simulasi.
9. Label tingkat dan status ada di tiap panel. Tautan "Metode" membuka bab genangan.

## 2. Pembuat keluaran (staf teknis)

1. Menjalankan skrip persiapan data (DEM, batimetri, run-up) sekali per pantai dan menyimpan ringkasannya.
2. Menjalankan hitung skenario di mesin lokal (Q4); skrip menulis keluaran terkuantisasi dan indeks.
3. Menjalankan uji balik (TS-14 dan seterusnya); hasil masuk berkas terpisah.
4. Memeriksa keluaran dengan uji; hanya sesudah itu keluaran masuk `public/gempa/data/`.
5. Sesi induk meng-commit; tidak ada deploy otomatis.

## 3. Hitungan per gempa (fase 3)

1. Cron Worker menyimpan gempa baru ke D1 (milik `warga-api`).
2. Langkah terjadwal membaca `/api/gempa/terbaru`, menyaring dengan padanan Python dari `Tsunami.layak` (kesetaraan diuji), dan melewati gempa yang sudah punya simulasi.
3. Untuk gempa layak: bangun sumber Okada, jalankan hitung pada kotak halus pantai terkait, tulis keluaran, bekukan salinan di arsip prospektif.
4. Peramban menandai "dihitung untuk gempa ini" sesudah keluaran ada. Sebelum itu, skenario pustaka tampil dengan label tingkatnya.

## 4. Keadaan khusus

| Keadaan | Perilaku |
| --- | --- |
| Pantai di luar kotak halus | "belum dihitung" |
| Kotak halus tanpa sel tergenang | "tidak tergenang pada simulasi ini", dengan peringatan batas model |
| Keluaran gagal diunduh | tulis "genangan tidak bisa dimuat", animasi kasar tetap jalan |
| Uji balik belum lulus | label "hipotesis" |
| Peringatan resmi aktif | pita resmi di atas, simulasi tetap dengan label dan kalimat batas (K7) |
| Gempa tidak layak | bagian tsunami hilang, tidak ada kalimat "tidak ada tsunami" |
