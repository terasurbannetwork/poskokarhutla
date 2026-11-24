# KEPUTUSAN-PENURUNAN: Penurunan tanah dari radar satelit (InSAR) untuk proyeksi genangan rob 10 dan 20 tahun

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Rob di pantura bukan hanya soal muka laut naik: tanahnya juga turun, dan di Jakarta, Semarang, dan Pekalongan penurunannya sering lebih cepat dari kenaikan laut. Sistem belum punya angka penurunan tanah per wilayah yang diukur satelit. Yang ada baru kutipan literatur per kota (`public/banjir/data/subsiden_literatur.json`, titik kota di peta) dan satu baris kartu rob "sampai X cm/th" (`public/banjir/peta.js:163`). Catatan kaki kartu pasang tegas mengatakan penurunan tanah tidak termasuk (`public/banjir/lapis_air.js:122`). Tidak ada proyeksi 10 atau 20 tahun sama sekali. Pimpinan yang bertanya "kecamatan mana yang tanahnya terus turun sehingga robnya makin sering" belum punya jawaban yang bisa diperiksa.

Benchmark: Copernicus European Ground Motion Service (EGMS, Sentinel-1 InSAR, ketelitian milimeter per tahun, hanya Eropa, jadi tidak bisa dipakai langsung untuk Indonesia). Angka kasar yang disebut dalam permintaan ini, Jakarta 1 sampai 15 cm per tahun dan rerata BRIN 3,5 cm per tahun: literatur repo (Abidin dkk. 2011) menulis umumnya 1-15 cm/tahun, beberapa lokasi 20-28, angka BRIN 3,5 belum ada sumber primernya di repo dan tidak ditampilkan sebelum diverifikasi.

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 15 Nov 2026, pemilik: "Ini yang dua atas oke" (menyetujui butir 2 sampai 4 daftar kedua, termasuk penurunan tanah dari radar satelit InSAR untuk proyeksi genangan rob 10 sampai 20 tahun). |
| K2 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |
| K3 | 24 Nov 2026, pemilik memilih "Bootstrap blok (b)" untuk n_efektif galat (ALGORITMA 4): galat median kecamatan dan galat acuan dihitung dengan bootstrap blok spasial, bukan rumus piksel bebas. |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Penurunan tanah dan rob selalu dua angka terpisah dengan label sendiri. Tidak ada satu angka gabungan sebelum diuji balik terhadap rob teramati. | Aturan modul banjir; angka gabungan tanpa uji balik adalah klaim yang tidak bisa dipertanggungjawabkan. |
| D2 | Pipa yang sudah ada dipakai: `scripts/banjir/subsiden.py` (dekomposisi vertikal, agregasi, gerbang pola). Tidak ada penulisan ulang. | Kode sudah lulus swa-uji, belum pernah dijalankan pada data nyata. |
| D3 | Pemrosesan InSAR berjalan di mesin pemilik, bukan di GitHub Actions. Yang masuk repo hanya `subsiden.json` kecil. | Rincian dan alasan di DESAIN-TEKNIS dan RISET bagian 3. |
| D4 | Semua keluaran berlabel hipotesis sampai laju tervalidasi terhadap GNSS atau levelling (ALGORITMA 6). | `subsiden.py` sudah menulis label itu. |
| D5 | Proyeksi memakai laju tetap per satuan wilayah dengan rentang ketidakpastian; bukan prakiraan kebijakan air tanah. | Tidak ada data kebijakan; laju tetap adalah asumsi paling mudah diperiksa. |
| D6 | Satuan awal kecamatan (sesuai `subsiden.py` dan `public/geo/kecamatan`); kelurahan/desa (`public/geo/desa`) tahap kedua. | Satu laju per sel radar 330 m cukup padat untuk kelurahan, tetapi ketelitian dan gerbang pola diuji dulu di kecamatan. |
| D7 | Semua berkas yang terdaftar di `scripts/banjir/genangan/j4_sidik.json` tidak disentuh (antara lain `subsiden_literatur.json`, `scripts/banjir/umum.py`, `scripts/banjir/wilayah.py`, `public/geo/kecamatan/31.json`, `public/banjir/sim_genangan.js`; daftar lengkap di berkas itu; beku sampai uji prospektif J4 selesai). | Menyentuhnya membatalkan uji prospektif J4. `subsiden.py` hanya mengimpor `umum` dan `wilayah`, tidak menyuntingnya. |
| D8 | Tidak ada akun yang dibuat agent. Akses yang butuh login (Earthdata) dilakukan pemilik sendiri bila Q2 dijawab ya. | Aturan keamanan repo. |
| D9 | Ukuran blok bootstrap 0,01 derajat (sekitar 1,1 km, 3 sampai 4 piksel LiCSBAS 0,003 derajat), 200 ulangan, benih acak tetap; kecamatan dengan kurang dari 4 blok tidak diberi galat (galat kosong, tidak tayang). **[BAWAAN SEMENTARA]**: ukuran blok belum diukur dari variogram data; bila pemeriksa meminta, blok diperbesar dan hasilnya dilaporkan berdampingan. Variogram 24 Nov 2026 (RISET 6.11): derau tanpa plafon sampai 20 km, jadi ukuran blok tidak bisa diturunkan dari variogram; galat antar-kecamatan berjauhan butuh suku galat jarak (menunggu keputusan pemilik). | Blok harus lebih besar dari jarak korelasi derau piksel tetapi cukup kecil supaya kecamatan berisi beberapa blok. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Izinkan menjalankan dua skrip di luar repo, `~/licsbas/lb.sh` (pembungkus LiCSBAS v1.6.3, klon 29 Nov 2024) dan `~/licsbas/ambil.py` (pengunduh pasangan interferogram CEDA), lewat aturan izin Claude Code (daftar izinkan untuk dua jalur itu saja, tanpa izin umum untuk kode klon)? Pada 21 Okt 2026 izin menolak keduanya (kelas "Code from External"). Keputusan yang dibutuhkan: pemilik menambahkan aturan izin itu sendiri di pengaturannya, atau pemilik menjalankan keduanya sendiri di terminalnya (bukan oleh agent) lalu membawa hasilnya ke repo. | **[BAWAAN SEMENTARA]** tidak diizinkan; jalur LiCSBAS tidak jalan, proyeksi memakai literatur berlabel. | PT-04 sampai PT-07 |
| Q2 | Pemilik membuat akun NASA Earthdata (gratis) dan mencoba ASF HyP3 InSAR sesuai permintaan, sebagai pembanding atau pengganti LiCSBAS? Agent tidak membuat akun. | **[BAWAAN SEMENTARA]** tidak; HyP3 dicatat sebagai opsi cadangan. | tidak menahan |
| Q3 | Kota mana yang diproses? | **[BAWAAN SEMENTARA]** empat kota yang framenya sudah terdaftar: Jakarta, Semarang dan Demak, Pekalongan, Surabaya. Medan dan Cirebon tetap literatur. Usulan tambahan 23 Nov 2026 (belum diputuskan pemilik): cekungan Bandung (Gedebage, Dayeuhkolot, Baleendah) untuk banjir genangan, bukan rob; butuh frame Sentinel-1 tersendiri dan keluaran ke peta genangan (RISET 6.1). | PT-04 |
| Q4 | Satuan tampil: kecamatan atau kelurahan/desa? | **[BAWAAN SEMENTARA]** kecamatan dulu; kelurahan sesudah validasi lulus. | PT-09 |
| Q5 | Horizon proyeksi dan skenario laju? | **[BAWAAN SEMENTARA]** 10 dan 20 tahun, laju tetap, rentang dari p10 sampai p90 sebaran piksel ditambah galat acuan; tanpa skenario kebijakan air tanah. | PT-08 |
| Q6 | Unduh DeltaDTM (Asia.zip 17,3 GB, CC BY 4.0) secara lokal untuk ambang elevasi? | **[BAWAAN SEMENTARA]** ya, tiket tersendiri, tidak masuk repo; tanpa itu proyeksi hanya menampilkan penurunan kumulatif, tidak "luas di bawah ambang". | PT-10 |
| Q7 | Tayang di mana dan berlabel apa? | **[BAWAAN SEMENTARA]** lapis dan kartu di peta banjir publik, berlabel hipotesis; tanpa angka kelurahan sampai validasi GNSS lolos. | PT-09 |
| Q8 | Jadwal penyegaran? | **[BAWAAN SEMENTARA]** tahunan, manual di mesin pemilik (sesuai RISET-SUBSIDEN.md "kuartalan atau tahunan"). | tidak menahan |
| Q9 | Koreksi atmosfer GACOS dan deramp? | **[BAWAAN SEMENTARA]** tanpa GACOS; deramp derajat 1 dan dinyatakan di berkas dan layar. | tidak menahan |
| Q10 | Kapan angka gabungan rob dan penurunan boleh ada? | **[BAWAAN SEMENTARA]** tidak sebelum uji balik terhadap rob teramati (`public/pesisir/data/rob_kejadian.json`) lulus dan dipra-registrasi. | tidak menahan |
| Q11 | Data pembanding GNSS (stasiun CORS BIG, levelling)? | **[BAWAAN SEMENTARA]** hanya angka dari literatur di `subsiden_literatur.json`; data mentah GNSS belum ada dan diminta pemilik bila tersedia. | PT-07 sebagian |
| Q12 | Bila validasi ALGORITMA 6 gagal, tayangkan angka dengan label "di luar rentang literatur"? | **[BAWAAN SEMENTARA]** tidak; hanya literatur tayang. | PT-09 |
