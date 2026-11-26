# Potensi bencana hidrometeorologi

Halaman ini menjelaskan cara membaca halaman Potensi bencana hidrometeorologi: apa isi tiap tab, apa arti status dan "belum terukur", dan apa yang sengaja tidak diambil dari dashboard InaRISK.

## Untuk apa halaman ini

Halaman ini mengumpulkan di satu tempat bahan untuk menilai potensi banjir, banjir bandang, longsor, gelombang, karhutla, dan kekeringan per kabupaten/kota. Status Normal sampai Awas memakai hitungan yang sama dengan status prakiraan di Alun-alun dan Pusdalops (lihat halaman Status prakiraan dan dampak peringatan). Halaman ini hanya tempat membacanya lebih dalam. Semua status di sini berlabel hipotesis sampai lolos uji balik. Halaman ini belum terbuka tanpa masuk; kebijakan akses publiknya belum diputuskan (bawaan sementara: terkunci seperti halaman Prediksi).

## Tab-tab

| Tab | Isinya |
| --- | --- |
| Status | Peta kab/kota berwarna status. Pilih bahaya dan pilih hari (Hari ini, Besok, Lusa, Hari ke-3, atau Ringkas 3 hari, yaitu tingkat tertinggi dari empat hari). Klik kab/kota untuk kartu fakta: status per bahaya per hari, prakiraan BMKG per desa, kelas bahaya desa. |
| Dampak | Area peringatan BMKG yang sedang aktif dan perkiraan penduduk di dalamnya. Staf melihat rincian per desa. |
| Iklim | Kartu ONI dan IOD, debit sungai per kab/kota, dan hari tanpa hujan. |
| Analisis | Matriks bahaya kali status, 10 kab/kota dengan hujan prakiraan tertinggi, kab/kota dengan hari tanpa hujan terpanjang, gelombang tertinggi, debit tertinggi, dan desa dengan bahaya tinggi terbanyak. |
| Lapisan | Enam lapis objek: peringatan BMKG aktif, bahaya, provinsi, kab/kota, kecamatan, desa. Klik satu objek untuk mengikuti objek terkait ke lapis di bawahnya. |
| Ringkasan | Bab bernomor yang ditulis mesin dari data hari itu. Kalimatnya dari templat tetap, tanpa tafsir sebab dan tanpa ramalan kejadian. |
| Sumber | Arti chip, tanggal data tiap sumber, cara status dihitung, dan atribusi. |
| Rekomendasi | Hanya untuk staf yang sudah masuk. Tab ini baru ada bila sesi staf sah. Isinya masih berupa kerangka dan belum terisi. |

## Arti status dan chip fakta

### Status dan "Belum terukur"

Tingkatnya Normal, Waspada, Siaga, Awas. Hijau Normal hanya muncul bila semua sumber yang dibutuhkan ada dan segar. Abu "Belum terukur" berarti datanya tidak ada, bukan berarti rendah dan bukan berarti tidak ada ancaman. Kolom kosong tidak pernah ditulis nol.

### Chip fakta

Setiap angka membawa satu chip.

| Chip | Arti |
| --- | --- |
| Bersumber | Sumber resmi atau sumber publik menyebut angka itu. |
| Dihitung | Dihitung dari fakta lain, misalnya jumlah kab/kota berstatus Siaga. |
| Hipotesis | Hasil model Centurisk97 yang belum lolos uji balik. Pakai sebagai bahan pertimbangan. |
| Belum terukur | Data tidak ada. Ditampilkan kosong. |

## Kelas bahaya desa

Kelas bahaya tiap desa (rendah, sedang, tinggi) berasal dari data BNPB tingkat desa, untuk enam bahaya: banjir, banjir bandang, longsor, gelombang, karhutla, dan kekeringan. Desa tanpa kelas di sumber ditulis "belum terukur", tidak pernah dianggap rendah.

- Yang tampil bawaan adalah kelas baseline.
- Kelas proyeksi tampil sebagai kolom terpisah berlabel "tahun dan skenario tidak tercantum di sumber". Kelas proyeksi hanya pembanding dan tidak dipakai menghitung status.
- Kelas kab/kota diturunkan dari sebaran kelas desanya. Kab/kota berkelas tinggi bila paling sedikit 40 persen desanya berkelas tinggi.
- Rincian kelas per desa tampil publik. Penduduk, fasilitas, dan keterpaparan per desa tetap hanya untuk staf.

## Banjir bandang

Status banjir bandang memakai tabel yang sama dengan banjir. Bedanya hanya pada kelas bahaya kab/kota, yang diambil dari kelas banjir bandang. Prakiraan hujan harian tidak menangkap pemicu bandang yang berlangsung singkat, sehingga status bandang hampir selalu bergerak bersama status banjir. Anggap ia sebagai pembeda wilayah rawan, bukan sinyal mandiri. Label kejadian bandang yang jarang membuat uji baliknya sulit lolos, jadi status bandang kemungkinan tetap berlabel hipotesis untuk waktu lama.

## Iklim dan sungai

### ONI dan IOD

ONI menunjukkan kondisi El Nino atau La Nina di Pasifik. IOD menunjukkan kondisi Samudra Hindia. Keduanya hanya muncul di tab Iklim. Kartu berubah abu bertuliskan "basi" bila ONI sudah lebih dari 45 hari dari akhir musimnya, atau IOD lebih dari 21 hari dari tanggal datanya. Sumber IOD utama kadang berhenti diperbarui; bila begitu, sistem memakai pembacaan mingguan dari lembaga cuaca Australia dan menyebut sumbernya di kartu.

### Debit sungai

Debit adalah banyaknya air yang lewat di sungai tiap detik, dari model global. Angkanya perkiraan, selalu berlabel hipotesis, dan tidak menaikkan status banjir. Debit puncak ditulis bilangan bulat dalam m³/detik. Rasio terhadap debit banjir dua tahunan (Q2) ditulis "Belum terukur" karena Q2 tiap kab/kota belum ada; bila kelak tersedia, rasio tampil satu desimal dengan tanda "×".

### Hari tanpa hujan

Jumlah hari berturut-turut tanpa hujan sampai kemarin, dihitung dari hujan model. Ini bukan prakiraan dan bukan hasil pos hujan BMKG. Bila datanya lebih tua dari tiga hari, blok ini ditulis "belum diperbarui sejak" disusul tanggal data terakhir, dan angkanya tidak ditampilkan.

## Yang sengaja tidak diambil dari dashboard InaRISK

Hanya kelas bahaya desa yang dipakai dari sumber BNPB itu. Yang tidak diambil: status dari satu titik cuaca per kab/kota, angka penduduk tanpa pembulatan, hitungan dampak di peramban, umpan laporan kejadian yang memuat nama, notifikasi WhatsApp ke daftar penerima, unggahan peluang hujan oleh petugas, animasi angin, serta simulasi banjir dan peta web mereka (Centurisk97 sudah punya padanannya sendiri). Peluang hujan bulanan BMKG per kab/kota belum diputuskan (bawaan sementara: tidak ditampilkan).

## Prakiraan BMKG per desa

Saat Anda memilih kab/kota, prakiraan cuaca per desa diambil dari BMKG dan disimpan sementara selama 3 jam. Bila antrean permintaan penuh, desa yang belum termuat ditulis "sebagian desa belum dimuat". Desa itu tidak pernah ditampilkan sebagai nol.
