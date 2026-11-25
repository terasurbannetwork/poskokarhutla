# Layar SIPPA dan neraca air

Bagian ini memerinci layar SIPPA di jalur pipa dan keluaran neraca air Jawa.

## SIPPA: `/pipa`

Jalur: `/pipa` (Ringkas), `/pipa/<layar>`, `/pipa/kit/<id>`, `/pipa/aset/<id>`, `/pipa/lapangan`, dan `/renlap`. Alamat `/admin/pipa` dialihkan ke `/pipa`. Halaman hanya untuk staf BNPB.

Hak (`src/sippa.js:23`): membaca untuk peran `pusdalops`, `koordalops`, dan `pimpinan`; menulis hanya `pusdalops` dan `koordalops`. Admin, moderator, dan Super Admin juga masuk. Sesi sah tanpa peran mendapat 403 polos tanpa pengalihan. Tamu dialihkan ke layar masuk. Staf yang punya wilayah hanya melihat kit dan data di wilayahnya; di luar wilayah dijawab "tidak ada" (404). Halaman `/pipa/lapangan` dan formulir lapangan dipakai regu tanpa akun, lewat kode penugasan.

Layar dikelompokkan di menu menjadi tiga bagian (`public/pipa/app.js:10`).

### Rencana

- **Peta** (`/pipa/peta`): peta kelayakan kompleks api dan sel 2,2 km dengan zona A sampai D dan saran sarana per kompleks. Tersedia pilihan versi zona: Konservatif, Optimistis, dan Terverifikasi (`public/pipa/app.js:20`). Arti zona: huruf A sampai D menunjuk kombinasi jarak ke air (ambang 2,5 km) dan ke jalan (ambang 5 km). A berarti dekat air dan dekat jalan, B dekat air tetapi jauh dari jalan, C jauh dari air tetapi dekat jalan, D jauh dari keduanya. Huruf dan pola arsiran selalu dipakai bersama warna supaya terbaca oleh pengguna buta warna.
- **Kunjungan** (`/pipa/kunjungan`): menyusun rencana kunjungan lapangan. Staf menaruh titik awal, mengisi jumlah tim (1 sampai 4), jumlah lokasi (bawaan 6, paling banyak 10), dan radius. Hasilnya daftar lokasi per tim dan per hari, tautan Google Maps, dan tombol untuk membuat PDF renlap.
- **Hitung** (`/pipa/hitung`): kalkulator hidraulika. Masukan bahan selang (layflat atau HDPE), diameter, panjang, debit, beda tinggi, kelas pompa, jumlah lance, dan suhu. Keluaran berupa tekanan, daya, bahan bakar, waktu pengisian, profil tekanan, dan daftar gerbang.
- **Pemicu** (`/pipa/pemicu`): tingkat pra-posisi harian per kabupaten: NORMAL, SIAGA, PRA-POSISI, GELAR.
- **Studio** (`/pipa/studio`): simulator keputusan yang membandingkan skenario memakai mesin milik pemilik dan simulasi Monte Carlo di Web Worker.
- **3D** (`/pipa/3d`): simulasi tiga dimensi dari angka kalkulator yang sama. Panel teks memuat angka yang sama dengan kanvas.

### Operasi

- **Kit** (`/pipa/kit`, `/pipa/kit/<id>`): inventaris kit (kode `SIPPA-###`, status gudang, depot, gelar, banjir, servis, hilang, pensiun), komponen, gerak, penugasan, dan pinjam pakai. Kode penugasan lapangan hanya tampil sekali di dialog.
- **Pelihara** (`/pipa/pelihara`): jadwal pemeliharaan, kelaikan gelar, stok suku cadang, dan biaya.
- **Air tanah** (`/pipa/air`): sumur bor pascabencana dan cekungan air tanah.
- **Log** (`/pipa/log`): rekap time-motion sesi lapangan, dapat diunduh CSV.
- **A/B** (`/pipa/ab`): dasbor perbandingan lengan uji dengan cara konvensional, beserta vonis.
- **Telemetri** (`/pipa/telemetri`): bacaan sensor, perangkat, dan alarm.

### Keluaran

- **Laporan** (`/pipa/laporan`): memilih jenis dan rentang laporan, lalu PDF dirender di peramban.
- **Data** (`/pipa/data`): empat tab (Dataset, Rumus, Gerbang, Batas pemakaian alat).

Menu "Akses" (jembatan) disembunyikan dari menu atas permintaan pemilik tetapi rutenya tetap ada.

### Arti vonis dan penanda

- Vonis kalkulator: NO-GO bila ada gerbang tingkat keras, HOLD bila hanya ada gerbang tingkat syarat, KONDISIONAL bila tidak ada keduanya. Tidak ada vonis GO (`public/pipa/hitung.js:175`).
- Vonis pilot "dapat dipakai": DAPAT DIPAKAI, DAPAT DIPAKAI BERSYARAT, atau BELUM DAPAT DIPAKAI (tujuh butir, lihat Metode).
- Vonis A/B (G4): LULUS, TIDAK LULUS, atau BELUM BISA DIPUTUS. Data pilot selalu berlabel "pilot, n kecil" dan tidak diberi vonis G4.
- Pil keyakinan pada angka: `resmi`, `terverifikasi`, `estimasi-model`, `asumsi-kebijakan`.

### Halaman uji pilot tanpa login: `/uji-pilot`

Siapa pun yang memegang tautan bertoken dapat membuka dossier lapangan tanpa akun. Token ada di fragmen alamat (`#t=...`), tidak masuk log server, dan API hanya mengirim data bila hash token cocok. Tanpa token halaman kosong. Metadata foto dibuang sebelum disimpan (`src/uji_pilot.js:2`).

## Neraca air Jawa

Tidak ada halaman web (keputusan pemilik 7). Bagian ini dipakai lewat berkas JSON di `public/data/neraca_air/`, lewat ringkasan `data/kajian-bnpb/neraca-air/HASIL.md`, dan oleh modul lain (profil daerah Kemitraan Kampus membaca `kab.json`; model banjir kabupaten membaca `deret_bulanan.json`).

Cara membaca hasil:

1. Satuan juta meter kubik (Mm3) kecuali disebut lain.
2. N adalah air tersedia dikurangi kebutuhan konsumtif. Positif berarti surplus, negatif berarti defisit.
3. N80 kemarau adalah persentil ke-20 dari total Juni sampai Oktober tiap tahun (35 nilai). Kabupaten/kota dengan N80 negatif mengalami kekurangan pada 20 persen tahun atau lebih.
4. Skenario: `klim` (rerata klimatologi), `1997`, `2015`, `2019`, `2023`.
5. Semua angka berlabel estimasi-model.

Hal yang sering disalahpahami:

- Jumlah N antar-kabupaten/kota tidak boleh dijumlahkan, karena aliran masuk dari hulu terhitung ganda. Hanya limpasan lokal R yang bisa dijumlahkan.
- Skenario tahun kering adalah indikasi, bukan batas atas atau batas bawah. Arah bias bergantung tahun (lihat Metode).
- Irigasi adalah kebutuhan potensial, bukan air yang benar-benar dipasok.
- Nilai ternak dan industri yang kosong berarti tidak tersedia, bukan nol. Industri hanya mencakup 75 dari 119 kabupaten/kota.
- Anomali simpanan GRACE bukan simpanan kabupaten/kota: resolusi aslinya sekitar 330 km.
