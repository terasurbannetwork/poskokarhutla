# PRD: Simulasi tsunami dengan genangan darat

## Tujuan

Staf dan pembaca tab Simulasi `/gempa` bisa melihat, untuk gempa yang berpotensi tsunami, kapan gelombang tiba di satu pantai, wilayah darat mana yang tergenang dalam simulasi, setinggi apa, dan seberapa dekat angkanya dengan run-up yang pernah terukur di tempat itu, dengan batas model yang terbaca jelas dan tanpa menggeser status resmi BMKG.

## Pengguna

Staf pusdalops dan analis BNPB dan BPBD pesisir; pembaca publik tab Simulasi (hak mengikuti Q15). Alat bantu pemahaman dan kajian, bukan peringatan dini.

## Fitur

| ID | Fitur | Pemilik | Kriteria terima |
| --- | --- | --- | --- |
| F1 | Animasi gelombang berlabel "T + N menit" dengan legenda meter dan riak kontras. | gempa | Sudah dikerjakan terpisah (K2); paket ini hanya memakainya sebagai bingkai. |
| F2 | Zoom ke satu pantai: pemilih pantai dari daftar yang sudah dihitung, peta bergerak ke kotak halus, animasi muka air kotak halus pada T + N menit. | gempa | Pantai di luar kotak halus tidak ada di pemilih atau tampil "belum dihitung". |
| F3 | Peta genangan darat: kedalaman maksimum per sel berwarna menurut skala 0 sampai 8 m dengan legenda meter. | gempa | Skala dan legenda tertulis; sel kering tampil transparan, bukan "aman". |
| F4 | Angka ringkas per pantai: luas darat tergenang, persen terhadap luas darat di dalam kotak halus (contoh "sekitar 1% semenanjung tergenang" dengan pembaginya ditulis), kedalaman maksimum, waktu tiba pertama. | gempa | Pembagi dan batas kotak tampil; tidak ada persen tanpa pembagi. |
| F5 | Titik run-up: run-up hitung di garis pantai dan, bila ada, run-up terukur dari kejadian yang cocok. | gempa | Tiap titik terukur memuat tahun, lokasi, tinggi, sumber. |
| F6 | Batang run-up historis per lokasi (NOAA NCEI), disandingkan dengan tinggi hasil simulasi di lokasi terdekat. | gempa | Tanpa data historis di lokasi: tulis "tidak ada data run-up tercatat di sini", tidak ada batang kosong yang terbaca nol. |
| F7 | Label tingkat dan status: "skenario pustaka" atau "dihitung untuk gempa ini", dan "hipotesis" atau "teruji pada n kejadian" menurut hasil uji balik. "Teruji" hanya untuk kelas sumber dan kotak yang diwakili kejadian uji kelas A. Kalimat batas wajib di samping legenda. | gempa | Label dan kalimat batas ada di setiap tampilan genangan dan di berkas keluaran. |
| F8 | Pustaka skenario praterhitung untuk pantai prioritas (Q6) dan pemilihan skenario terdekat bagi gempa baru. | gempa | Layar menulis jarak dan perbedaan magnitudo skenario terhadap gempa yang dilihat. |
| F9 | Hitungan otomatis untuk gempa yang lolos `Tsunami.layak` (tingkat A). | gempa, mekanik-mesin (workflow) | Fase 3; membutuhkan Q4 dan Q5. |
| F10 | Bab Metode untuk genangan: persamaan, DEM, kekasaran, sumber, uji balik, batas. | gempa | Mengikuti pola bab di `public/gempa/metode.js`. |
| F11 | Uji balik lawan run-up terukur, termasuk laporan kelas B apa adanya. | gempa | Ukuran K dan kappa per kejadian, pembanding Abe, tanpa menyetel ulang sesudah uji dibuka. |
| F12 | Prospektif: simulasi nyata dibekukan dan kelak dinilai. | gempa | Arsip append-only. |

## Alur kerja inti

Pembaca membuka rincian gempa, menekan Simulasikan, memilih pantai, melihat T + N menit dan genangan, membandingkan dengan batang run-up historis, dan membaca label yang menyebut simulasi ini hipotesis dan bukan peringatan.

## Larangan

Menulis "aman" atau padanannya. Menurunkan, menafsir ulang, atau menyembunyikan status resmi BMKG dan PTWC. Menampilkan 0 untuk pantai yang tidak dihitung. Memakai kata "prakiraan genangan" sebelum uji balik lulus. Memakai FABDEM di layar publik (lisensi). Menyatakan "teruji" untuk jenis sumber atau kotak yang tidak diwakili kejadian uji kelas A. Menyetel parameter sesudah uji dibuka. Menjalankan mesin hitung di peramban untuk grid halus. Mengirim koordinat pembaca ke server. Menyentuh worker, D1, atau workflow (usulan lewat `mekanik-mesin`). Memakai "Pantau Bencana". Notifikasi atau peringatan ke warga.

## Di luar lingkup

Peringatan dini dan keputusan evakuasi; jalur dan waktu evakuasi (sudah di tab Evakuasi); tsunami non-gempa (Q9); paparan bangunan dan penduduk di area genangan (Q13); model kerugian; gelombang badai dan rob; prakiraan gempa utama.
