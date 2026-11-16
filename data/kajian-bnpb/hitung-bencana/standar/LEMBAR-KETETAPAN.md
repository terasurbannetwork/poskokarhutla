# Lembar ketetapan Standar Penghitungan dan Klasifikasi Kejadian Bencana

Status: catatan kerja, tidak dicetak. Satu-satunya sumber angka dan aturan untuk semua bab di folder `standar/`.
Bila bab lain berbeda dengan lembar ini, lembar ini yang benar. Pemilik menyetujui rincian produk 13 Nov 2026.

Tiap ketetapan diberi kode UK-nn (usulan ketetapan). Di naskah, ketetapan ditulis TEGAS sebagai ketentuan
("Jeda pemisah banjir adalah 7 hari."), tanpa kata "bawaan sementara". Daftar UK dengan dasar dan alternatifnya
dicetak sekali di depan dokumen (Tabel Usulan Ketetapan) supaya pemilik cukup meninjau satu tabel. Penanda
[BELUM TERVERIFIKASI] tetap dipakai untuk kutipan teks resmi yang belum dicocokkan ke dokumen aslinya.

Sumber fakta: `naskah/06-kerangka.md` (aturan versi 2.1), `naskah/lampiran-b.md` (status 65 kasus),
`KEPUTUSAN.md` (Q-01 sampai Q-43), `riset/REGULASI.md` (kutipan Juklak 7/2023, Juklak 3/2022, Perka 8/2011,
Perka 15/2011, UU 24/2007), `riset/SIM-*.md` dan `analisis/hasil/sim_kerangka.json` kunci `v2` (angka uji),
`naskah-imrad/` (versi IMRaD, bahasa yang sudah disetujui).

## A. Istilah baku dan peta istilah

| Konsep | Istilah baku | Kolom DIBI | Juklak 7/2023 | Juklak 3/2022 | Logbook Pusdalops | Padanan Sendai/EM-DAT |
|---|---|---|---|---|---|---|
| Orang meninggal | meninggal | meninggal | meninggal | meninggal | meninggal | *deaths* |
| Orang hilang | hilang | hilang | hilang | hilang | hilang | *missing* |
| Orang luka atau sakit | luka atau sakit | luka_sakit | luka | luka | luka | *injured or ill* |
| Orang mengungsi | mengungsi | mengungsi | mengungsi | pengungsi | mengungsi | *evacuated/displaced* |
| Orang terdampak langsung | terdampak | menderita | terdampak ("menderita akibat dampak buruk bencana... namun masih dapat menempati tempat tinggalnya") | penduduk terdampak (definisi berbeda) | jiwa terdampak, KK terdampak | *directly affected* |
| Orang yang hanya terancam | terancam | (tidak ada) | (tidak ada) | berpotensi terdampak | kadang ditulis terdampak | *exposed* |
| Pindah sebelum dampak | evakuasi preventif | (tercampur di mengungsi) | (tidak ada) | (tidak ada) | dievakuasi | *pre-emptive evacuation* |

Ketetapan istilah:

- UK-01. "Terdampak" adalah istilah baku. Kolom DIBI `menderita` adalah nama kolom lama untuk konsep yang sama,
  diganti nama pada skema baru. Kata "menderita" tidak dipakai di laporan.
- UK-02. Kolom DIBI `menderita_mengungsi` dihapus dari skema baru. Angka gabungan dihitung saat dibutuhkan dari
  kolom terdampak dan mengungsi (dalam kajian, kolom ini sering tidak sama dengan jumlah kedua kolom).
- UK-03. Satuan orang adalah jiwa. Bila laporan hanya memuat KK, jiwa = KK x rata-rata anggota rumah tangga
  kabupaten itu menurut BPS (Susenas tahun terbaru), dan angka diberi penanda "taksiran dari KK". KK tetap disimpan.
- Terdampak langsung adalah salah satu dari tiga: (a) penghuni rumah yang rusak; (b) penghuni rumah yang tergenang
  sampai masuk ke dalam rumah, berapa pun lamanya; (c) orang yang mata pencaharian atau akses air bersihnya terputus
  paling sedikit 3 hari (UK-04).
- Satu orang satu kategori, urutan: meninggal, hilang, luka atau sakit, mengungsi, terdampak. Orang luka yang
  mengungsi dicatat sebagai luka.
- Hilang menjadi "diduga meninggal" saat operasi pencarian resmi ditutup oleh pos komando atau Basarnas; BPBD
  mencatat tanggal penutupan (UK-05).
- UK-30. Diduga meninggal disimpan di kolom tersendiri, tetap dihitung dalam "meninggal dan hilang" (Ketentuan 1.5).
- UK-31. Puso: tanaman rusak lebih dari 85 persen menurut dinas pertanian (Ketentuan 1.6).
- UK-32. Permintaan bantuan dibuktikan dengan surat resmi kepala daerah atau Sekda kepada Kepala BNPB (Ketentuan 1.7).
- Kematian langsung: akibat langsung bahaya dalam masa kejadian. Kematian tidak langsung (penyakit pascabanjir,
  ISPA akibat asap, meninggal di pengungsian): dicatat di kolom tersendiri bila terjadi paling lama 30 hari setelah
  kejadian selesai (UK-06). Atribusi kematian dicatat BPBD dengan keterangan penyebab dari fasilitas kesehatan atau
  dinas kesehatan, diverifikasi Pusdatinkom (UK-07). Kematian yang bukan akibat bahaya (sakit biasa, kecelakaan
  lalu lintas biasa) tidak dicatat.
- Rumah rusak berat, sedang, ringan mengikuti definisi Perka BNPB 8/2011 Pasal 1 angka 34 sampai 36 (kutip dari
  `riset/REGULASI.md`). Rumah terendam dicatat terpisah, tidak masuk hitungan rumah rusak; penghuninya terdampak.
- Rumah setara rusak berat = rusak berat + 0,5 x rusak sedang + 0,25 x rusak ringan; rumah rusak yang belum
  terpilah tingkatnya dihitung 0,25 sampai terpilah (UK-08).
- Fasilitas penting (daftar tertutup): satuan pendidikan, fasilitas pelayanan kesehatan, rumah ibadat, kantor
  pemerintahan, pasar (satuan lembaga); jembatan, ruas jalan, jaringan air bersih, jaringan listrik (satuan unit
  atau ruas). Hanya rusak berat atau sedang yang dihitung.
- Luas terbakar terverifikasi: luas dari pengukuran lapangan (BPBD, Manggala Agni) atau dari peta luas terbakar
  berbasis citra resolusi 30 m atau lebih halus (Sentinel-2, Landsat) yang diterbitkan instansi resmi (UK-09).
  Luas dari hotspot hanya indikasi dan tidak memicu syarat masuk.
- Puso: tanaman padi atau kebun gagal panen menurut dinas pertanian.

## B. Satu kejadian

- Satu kejadian bencana adalah satu rangkaian dampak dari satu bahaya utama yang terhubung dalam ruang dan waktu,
  sejak dampak pertama sampai jeda tanpa laporan aktif yang ditetapkan untuk jenis bahayanya.
- Dua tingkat: kejadian nasional (satu nomor induk per kejadian utuh) dan catatan kabupaten (satu per kabupaten/kota
  terdampak, identitasnya KIB 16 digit Juklak 7/2023, merujuk nomor induk). Dua angka bernama: "jumlah kejadian"
  dan "jumlah catatan kabupaten". Pecahan kejadian dilarang. Provinsi menghitung kejadian nasional yang menyentuh
  provinsi itu; jumlah provinsi tidak dijumlah menjadi angka nasional.
- UK-10. Nomor induk kejadian berformat `TTTT-JJJ-NNNNNN` (tahun mulai, kode jenis bencana 3 digit dari Lampiran I
  Juklak 7/2023, nomor urut nasional), diterbitkan Pusdatinkom sebagai walidata (Peraturan BNPB 1/2023 Pasal 8
  huruf c). Laporan pertama memberi nomor usulan; Pusdatinkom mengesahkan nomor induk paling lambat 7 hari kerja
  setelah laporan pertama (UK-11).
- Aturan per jenis: pakai Tabel 6.2 `naskah/06-kerangka.md` apa adanya sebagai ketentuan, ditambah:
  - UK-12. Karhutla di lahan gambut: jeda pemisah 14 hari (bukan 7), karena bara di bawah permukaan dapat menyala
    lagi tanpa terdeteksi satelit. Jenis lahan (gambut, mineral) dicatat sebagai atribut.
  - UK-13. Luas kejadian karhutla gabungan adalah luas gabungan wilayah terbakar (bagian yang tumpang tindih dihitung
    sekali), bukan jumlah luas tiap kejadian sebelum menyatu.
  - UK-14. Daftar jenis mengikuti 14 kategori DIBI: banjir, tanah longsor, gelombang pasang dan abrasi, cuaca
    ekstrem, kekeringan, kebakaran hutan dan lahan, gempa bumi, tsunami, erupsi gunung api, kebakaran permukiman,
    gagal teknologi, epidemi dan wabah penyakit, konflik sosial, lainnya. Kabut asap bukan jenis; anak karhutla. Banjir bandang adalah subjenis banjir (atribut), bukan jenis baru.
    Nama kejadian majemuk seperti "banjir dan tanah longsor" tidak dipakai; dicatat sebagai induk dan anak.
  - UK-15. Kecelakaan transportasi (kapal tenggelam, pesawat) di luar lingkup standar ini kecuali penyebab utamanya
    bahaya alam yang tercatat (gelombang tinggi, cuaca ekstrem); dalam hal itu dicatat sebagai anak kejadian
    cuaca ekstrem atau gelombang pasang.
  - Kejadian lintas tahun dihitung di tahun tanggal mulai, dengan penanda lintas tahun.
  - Batas durasi 30 hari (gempa 90 hari); lanjutannya kejadian baru dengan tautan "lanjutan dari".
  - Hari tanpa pengamatan satelit yang layak tidak dihitung dalam jeda karhutla.
- UK-16. Data lama (sebelum standar berlaku) dicocokkan dengan cara: jenis, provinsi, dan kabupaten sama, jeda
  antarlaporan paling lama 7 hari, kabupaten yang bersinggungan digabung. Hasilnya diberi penanda "dicocokkan
  ulang".
- Penggabungan menurut aturan tertulis boleh dijalankan mesin dengan jejak dan dapat dibatalkan; sengketa diputuskan
  Pusdatinkom. UK-17: BPBD dapat mengajukan keberatan atas penggabungan, pemisahan, status, atau kelas paling lambat
  14 hari setelah rilis; Pusdatinkom memutuskan paling lambat 14 hari setelah keberatan diterima.

## C. Syarat masuk hitungan bencana

Kejadian masuk hitungan bila penyebabnya salah satu jenis bencana dan memenuhi minimal satu syarat:

1. Minimal 1 orang meninggal atau hilang akibat langsung bahaya.
2. Minimal 50 orang unik yang luka atau sakit, mengungsi, atau terdampak langsung (dijumlah, satu orang satu kali).
3. Minimal 5 rumah setara rusak berat.
4. Minimal 1 fasilitas penting rusak berat atau sedang.
5. Karhutla minimal 2 hektare luas terbakar terverifikasi, atau minimal 10 hektare puso.
6. Ada SK tanggap darurat yang menyebut jenis, wilayah, dan tanggal mulai yang cocok dengan kejadian ini.

- Penanda (dicatat, tidak memicu): permintaan bantuan nasional, status siaga darurat, status payung, Keadaan
  Tertentu, dana siap pakai, masing-masing dengan nomor dokumen.
- UK-18. Pencocokan SK dengan kejadian: BPBD mengusulkan saat mengirim SK, Pusdatinkom mencocokkan saat verifikasi.
  SK yang menyebut beberapa kejadian dicocokkan ke masing-masing kejadian yang jenis, wilayah, dan tanggalnya cocok.
- Epidemi dan konflik sosial: masuk lewat penetapan otoritas sektor ditambah syarat 1; syarat 2 sampai 5 tidak
  berlaku.
- Tiga status: bencana; di bawah ambang (disimpan, tidak dijumlah dengan bencana); terdeteksi belum diverifikasi
  (deteksi satelit, tenggang verifikasi 3 hari, lalu "tidak terverifikasi, kedaluwarsa"; tetap dapat dipindah bila
  diverifikasi kemudian).
- UK-19. Kejadian terdeteksi belum diverifikasi tidak mendapat nomor induk; nomor induk terbit saat terverifikasi.
- Kolom "dasar masuk" wajib, berisi nomor syarat yang terpenuhi.
- Selama tanggap darurat status "bencana" sementara; status akhir pada rilis statis.
- UK-20. Penanda risiko menumpuk: bila kejadian di bawah ambang di satu kabupaten dalam satu tahun menumpuk menjadi
  minimal 30 meninggal atau 600 rumah setara rusak berat, kabupaten itu diberi penanda "risiko menumpuk" pada rilis
  tahunan (ambang intensif dan ekstensif UNDRR GAR). Penanda tidak mengubah jumlah kejadian.
- UK-21. Laporan menonjol Pusdalops memakai tangga yang sama untuk semua jenis: kejadian masuk laporan harian bila
  lolos syarat masuk, dan masuk laporan menonjol bila kelasnya Sedang ke atas atau ditetapkan khusus oleh pimpinan.

## D. Kelas keparahan

| Kelas | Meninggal dan hilang | Mengungsi (puncak) | Rumah setara rusak berat | Karhutla: luas terbakar terverifikasi |
|---|---:|---:|---:|---:|
| Katastrofik | 1.000 atau lebih | 100.000 atau lebih | 10.000 atau lebih | 100.000 ha atau lebih |
| Besar | 100 sampai 999 | 10.000 sampai 99.999 | 1.000 sampai 9.999 | 10.000 sampai 99.999 ha |
| Sedang | 10 sampai 99 | 1.000 sampai 9.999 | 100 sampai 999 | 1.000 sampai 9.999 ha |
| Ringan | lolos syarat masuk, di bawah Sedang | | | |

- Kelas = kelas tertinggi yang dicapai salah satu indikator; indikator penentu ditulis di samping kelas.
- Meninggal dan hilang = nilai terbesar jumlah keduanya per laporan.
- Kelas yang ditentukan oleh pengungsi saja paling tinggi Sedang. Pengungsi dihitung di kabupaten asal.
- UK-22. Kenaikan kelas untuk daerah berpenduduk kecil: bila pengungsi ditambah terdampak langsung di satu kabupaten
  mencapai 10 persen penduduknya, kelas naik satu tingkat, paling tinggi ke Besar; naik dari Ringan ke Sedang hanya
  bila jumlahnya minimal 100 orang, dari Sedang ke Besar minimal 1.000 orang.
- UK-23. Penduduk = proyeksi penduduk kabupaten/kota BPS untuk tahun kejadian. Anggaran daerah tidak dipakai.
- Rupiah tidak menentukan kelas.
- UK-24. Kelas akhir ditetapkan pada rilis bulanan pertama setelah kejadian selesai. Koreksi sesudahnya hanya lewat
  rilis triwulan, dengan catatan perubahan.
- Status darurat ditulis berdampingan dengan kelas; ketidakcocokan menjadi bahan evaluasi, bukan koreksi kelas.
- Ukuran bahaya (magnitudo dan jenis skalanya, kedalaman, MMI, PAGER, tinggi genangan, VEI, luas, porsi gambut,
  indeks kekeringan BMKG, level GDACS, pemicu dominan) adalah atribut, tidak menentukan kelas. Jawaban "gempa
  skala berapa itu bencana besar": tidak ada magnitudo yang otomatis; besar bila dampaknya mencapai kelas Besar.

## E. Angka korban, kerusakan, dan kerugian

- Meninggal dan kerusakan memakai nilai terakhir; hilang, luka atau sakit, terdampak, mengungsi memakai nilai
  terbesar selama masa kejadian. Menjumlah angka antarhari dilarang.
- Tiga keadaan isian: ada nilai, nihil (terkonfirmasi nol), belum didata.
- UK-25. Hari tanpa laporan logbook dicatat "tidak ada laporan", bukan nol.
- Kerusakan (aset fisik) dan kerugian (pendapatan dan biaya yang hilang) dua kolom terpisah mengikuti Perka BNPB
  15/2011, dengan tahun harga; tidak dijumlah dan tidak menentukan syarat masuk atau kelas.
- UK-26. Rupiah antartahun disetarakan dengan Indeks Harga Konsumen (IHK) nasional BPS, tahun dasar yang berlaku di
  BPS saat rilis (saat ini 2022 = 100 [BELUM TERVERIFIKASI]). Rasio terhadap PDRB kabupaten dicatat sebagai
  keterangan.
- Satu angka resmi per versi: DIBI (setelah satuannya kejadian nasional dan catatan kabupaten) adalah angka utama;
  angka instansi lain tampil berdampingan berlabel, tidak dijumlah.
- Rilis data statis bulanan bernomor versi, dibekukan per triwulan; koreksi terbit sebagai rilis baru dengan tabel
  angka terbit lawan angka kini.

## F. Penyajian

Sebelas aturan `naskah/06-kerangka.md` 6.6 dipakai sebagai ketentuan, ditambah:

- UK-27. Hotspot dalam laporan berarti deteksi VIIRS 375 m dari satelit S-NPP, NOAA-20, dan NOAA-21 (semua tingkat
  keyakinan, sesuai metode deck harian); MODIS disajikan terpisah bila dipakai. Firespot adalah kluster hotspot.
  Jumlah hotspot dan jumlah firespot tidak pernah disebut sebagai jumlah kejadian.
- UK-28. Data hotspot menyimpan nama satelit per deteksi. Deret yang melintasi 1 November 2026 (S-NPP berhenti)
  dibandingkan memakai NOAA-20 dan NOAA-21 saja, dengan tanda patah deret.
- UK-29. Tabel padanan kode wilayah saat pemekaran dipelihara Pusdatinkom mengikuti kode wilayah Kemendagri terbaru.

## G. Angka uji yang dipakai sebagai bukti (versi akhir, `sim_kerangka.json` kunci `v2`)

- Kejadian masuk hitungan 2024 sampai 12 Nov 2026: Juklak 7.535, standar 6.835 (turun 9,3 persen); per tahun
  Juklak 2.556 / 3.647 / 1.332, standar 2.285 / 3.324 / 1.226.
- Logbook Jan sampai Okt 2026: jumlah kejadian 2.809 sampai 3.860 (27 persen) antar-cara mencocokkan; lolos
  syarat standar 745 sampai 768 (3 persen); lolos kriteria Juklak 865 sampai 924 (7 persen).
- Kelas (seluruh jenis, 6.835 kejadian): tanpa kenaikan kelas Sedang 3,3 persen, Besar 0,3, Katastrofik 0,1
  (Besar atau Katastrofik 26 kejadian, 0,4 persen); dengan kenaikan kelas (standar) Sedang 4,0, Besar 0,8,
  Katastrofik 0,1 (Besar atau Katastrofik 57 kejadian, 0,8 persen).
- Kelas mengikuti status darurat (versi pertama, 6.812 kejadian): cocok dengan kelas dampak 52,7 persen; 38,6 persen
  menjadi Besar.
- 65 kasus sulit: pada kerangka versi 2.1, 42 terjawab penuh, 23 sebagian; standar ini menutup ke-23 lewat UK di
  atas (lihat peta penutupan di bawah). Kasus uji buatan pemeriksa: 26 kasus; pada kerangka versi 2.1, 17 terjawab dan 9 sebagian; setelah ketentuan pelengkap standar (2.19 sampai 2.22, 3.4, 7.6) ke-26 terjawab.
- Gempa 15 Agustus 2026: 11 kabupaten, DIBI 0,091 kejadian per kabupaten; standar: 1 kejadian nasional, 11 catatan
  kabupaten.
- Karhutla 15 Okt sampai 11 Nov 2026: 27.322 sampai 61.138 kejadian (2,2 kali) menurut aturan gabung; 0,28 persen
  kejadian mengalami penggabungan api menyatu pada aturan acuan.

Ketentuan pelengkap (ditambahkan induk 13 Nov setelah bab ditulis): UK-33 hari tanpa pengamatan layak (2.19),
UK-34 orang terkena dua kejadian (2.20), UK-35 jendela tautan bahaya ikutan (2.21), UK-36 dampak di negara lain
(2.22), UK-37 fasilitas rusak sedang hanya bila layanan terhenti 7 hari (3.4), UK-38 Zona Musim BMKG (7.6),
batas durasi 30 hari tidak berlaku untuk kekeringan, abrasi, erupsi, epidemi, konflik (2.13), kenaikan kelas
dinilai per catatan kabupaten (4.5). Pengantar Tabel 0.1 baris 38 sampai 43.

## H. Peta penutupan 23 kasus "sebagian"

| Kasus lama | Yang kurang | Ditutup oleh |
|---|---|---|
| P-01 Menyatu | cara menghitung luas gabungan | UK-13 |
| P-04 Menyala lagi | pengecualian gambut | UK-12 |
| P-06 Berulang | jeda pada laporan BPBD | Ketentuan jeda 7 hari berlaku untuk semua laporan; diuji saat uji coba |
| P-38 Tulis ulang harian | cara mencocokkan data lama | UK-16 |
| P-50 Jenis gabungan | daftar jenis, banjir bandang | UK-14 |
| P-17 Normalisasi | sumber penduduk | UK-23 |
| P-20 Jenis lahan | jenis lahan karhutla | UK-12 (atribut jenis lahan; ambang 2 ha sama) |
| P-40 Satelit lawan laporan | nomor induk deteksi | UK-19 |
| P-58 Dua ambang satu lembaga | ambang menonjol jenis lain | UK-21 |
| P-62 Status payung | pencocok SK | UK-18 |
| P-23 Kematian langsung lawan tidak langsung | jendela dan penetap | UK-06, UK-07 |
| P-24 Hilang | penutup pencarian | UK-05 |
| P-52 Kematian bukan akibat bahaya | penetap atribusi | UK-07 |
| P-60 Sumber angka luas | citra dan pemverifikasi | UK-09 |
| P-30 Inflasi | indeks dan tahun dasar | UK-26 |
| P-32 Kecil-kecil jadi bukit | penanda | UK-20 |
| P-33 Besar menurut siapa | sumber penduduk, anggaran | UK-23 |
| P-42 Naik kelas di tengah jalan | waktu kelas akhir | UK-24 |
| P-43 Hotspot lawan lokasi unik | definisi hotspot dan satelit | UK-27 |
| P-44 Pergantian alat ukur | sensor per deteksi, deret sambung | UK-28 |
| P-55 Pemekaran | pemelihara tabel | UK-29 |
| P-61 Hari tanpa laporan | hari kosong logbook | UK-25 |
| P-45 Siapa berwenang | batas pengesahan dan keberatan | UK-11, UK-17 |

Ketetapan lain yang tadinya bawaan sementara dan kini dinyatakan tegas (masuk Tabel Usulan Ketetapan juga):
angka enam syarat masuk, bobot rumah setara rusak berat (UK-08), batas kelas, kenaikan kelas 10 persen (UK-22),
jeda 7 hari dan batas durasi 30/90 hari, definisi terdampak langsung butir (c) 3 hari (UK-04), tenggang verifikasi
3 hari, aturan erupsi 14 hari, zona gempa, aturan gabung karhutla (1,5 kali piksel, 0,6 sampai 1,5 km, 48 jam).
