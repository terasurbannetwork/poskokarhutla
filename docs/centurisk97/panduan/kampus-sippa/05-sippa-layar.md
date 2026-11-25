# SIPPA: pipa portabel dan uji pilot

Bagian ini menjelaskan cara memakai layar SIPPA dan halaman uji pilot.

## SIPPA: pipa portabel di centurisk97.id/pipa

SIPPA adalah paket selang dan pompa portabel untuk mengalirkan air ke lahan terbakar atau menyedot genangan. Layar-layarnya membantu staf memilih lokasi, menghitung rancangan, dan mencatat hasil uji lapangan.

SIPPA hanya untuk staf BNPB. Yang boleh melihat adalah peran Pusdalops (pusat pengendalian operasi), Koordalops (koordinator operasi), dan pimpinan. Yang boleh mengubah data hanya Pusdalops dan Koordalops. Staf yang dibatasi wilayah hanya melihat paket di wilayahnya. Regu lapangan tanpa akun memakai kode penugasan di halaman lapangan.

Layar di menu terbagi tiga kelompok.

**Rencana**

- Peta: menunjukkan kelayakan tiap kompleks api. Tiap area diberi zona A sampai D. A artinya dekat air dan dekat jalan, sehingga paket bisa dibawa kendaraan dan airnya dekat. B dekat air tetapi jauh dari jalan, sehingga paket harus dipikul atau lewat perahu. C jauh dari air tetapi dekat jalan, sehingga perlu sumur dangkal atau mobil tangki. D jauh dari keduanya, sehingga paket tidak dipasang dan yang dipakai adalah pencegahan. Batas dekat adalah kurang dari 2,5 km ke air dan kurang dari 5 km ke jalan. Zona selalu ditandai huruf dan pola arsiran, bukan warna saja, supaya terbaca oleh pengguna buta warna. Ada tiga versi zona yang bisa dipilih: Konservatif, Optimistis, dan Terverifikasi. Perbedaan ketiganya belum terdokumentasi di panduan ini.
- Kunjungan: menyusun rencana kunjungan lapangan. Letakkan titik awal, isi jumlah tim (1 sampai 4) dan jumlah lokasi (bawaan 6, paling banyak 10), lalu sistem membagi lokasi per tim dan per hari, memberi tautan Google Maps, dan menyiapkan PDF rencana.
- Hitung: kalkulator aliran air dan tekanan. Cara memakainya dijelaskan di bawah.
- Pemicu: tingkat pra-posisi harian per kabupaten: NORMAL, SIAGA, PRA-POSISI, atau GELAR.
- Studio, 3D: layar untuk teknisi. Studio membandingkan skenario keputusan dengan simulasi berulang, 3D memperagakan rancangan secara tiga dimensi dengan angka yang sama seperti kalkulator. BPBD boleh melewatinya.

**Operasi**

- Kit: daftar paket selang dan pompa dengan kode SIPPA-###, status (gudang, depot, gelar, banjir, servis, hilang, pensiun), komponen, pergerakan, dan pinjam pakai.
- Pelihara: jadwal pemeliharaan, kelaikan, stok suku cadang, dan biaya.
- Air tanah: sumur bor pascabencana dan cekungan air tanah.
- Log: rekap waktu kerja regu lapangan, bisa diunduh sebagai berkas tabel.
- A/B: perbandingan antara petak yang memakai paket dan petak yang memakai cara biasa, beserta vonisnya. Dipakai untuk menilai apakah paket ini sungguh lebih baik.
- Telemetri: bacaan sensor yang dikirim otomatis dari perangkat di lapangan, beserta alarmnya. Layar ini untuk teknisi.

**Keluaran**

- Laporan: pilih jenis dan rentang laporan, PDF dibuat di peramban Anda.
- Data: dataset, rumus, daftar gerbang, dan batas pemakaian alat.

### Layar Hitung, langkah demi langkah

1. Pilih bahan selang (HDPE, yaitu selang plastik keras, atau layflat) dan diameternya.
2. Isi panjang selang, debit air (liter per menit), beda tinggi antara sumber air dan ujung (meter), jenis pompa, jumlah lance, dan suhu udara.
3. Baca hasilnya: tekanan pompa (bar), daya pompa (kilowatt), kebutuhan bahan bakar (liter per jam), waktu pengisian selang, dan daftar peringatan.

Contoh: selang layflat 100 mm sepanjang 1.000 m, debit 300 liter per menit, 8 lance, beda tinggi 2 m, suhu 35 derajat. Hasilnya dibaca berurutan: peringatan keras dulu, baru peringatan syarat. Contoh angka lengkap hasilnya ada di bagian "Cara menghitung".

### Arti vonis di layar

Kalkulator:

| Vonis | Artinya | Yang harus dilakukan |
| --- | --- | --- |
| NO-GO | Ada syarat keras yang dilanggar. Contoh syarat keras: tekanan pompa melebihi batas kerja selang. | Ubah rancangan. Jangan dipasang. |
| HOLD | Tidak ada syarat keras yang dilanggar, tetapi ada syarat lunak yang belum terpenuhi. Contoh syarat lunak: tekanan di ujung selang antara 1 dan 2 bar. | Perbaiki dulu atau putuskan dengan sadar risikonya. |
| KONDISIONAL | Tidak ada pelanggaran dalam hitungan. | Kelayakan lapangan masih harus dipastikan regu. |

Tidak pernah ada vonis GO (lampu hijau penuh). Itu bukan kekurangan sistem: paket ini belum terbukti di lapangan, jadi sistem sengaja tidak memberi lampu hijau.

Hasil uji pilot: DAPAT DIPAKAI, DAPAT DIPAKAI BERSYARAT, atau BELUM DAPAT DIPAKAI. Perbandingan A/B: LULUS, TIDAK LULUS, atau BELUM BISA DIPUTUS. Data uji pilot berlabel "pilot, n kecil" dan tidak diberi vonis perbandingan.

## Halaman uji pilot tanpa masuk akun

Halaman ini dipakai regu lapangan untuk mengunggah foto dan catatan uji. Hanya pemegang tautan khusus yang bisa membukanya; tanpa tautan itu halaman kosong. Foto disimpan tanpa data titik koordinat bawaan kamera demi privasi; titik uji dicatat terpisah.
