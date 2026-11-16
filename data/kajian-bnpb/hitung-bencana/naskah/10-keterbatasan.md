# BAB 10 Keterbatasan dan Agenda Riset

Status: Fase 3, draf.


## 10.1 Keterbatasan data

1. **DIBI tidak resmi lewat API.** Data DIBI ditarik dari dasbor publik pada 12 November 2026. DIBI
   dikoreksi susulan, sehingga angka 12 bulan terakhir dapat berubah. Arti kolom `is_bencana` dan
   pecahan `jumlah_kejadian` adalah tafsiran dari pola data dan belum dikonfirmasi Pusdatinkom (Q-12).
2. **DIBI 2024 tidak lengkap.** Baris 2024 berjumlah 3.752, dibanding 8.946 pada 2025. Perbandingan
   antartahun dibatasi pada Januari sampai Oktober dan selalu disertai catatan series break.
3. **Kriteria luas dan administratif tidak bisa diuji.** DIBI tidak menyimpan luas lahan, permintaan
   bantuan, atau status darurat. Uji M5 dan M6 (dan K4 sampai K6 lama) belum dilakukan; angka karhutla
   yang lolos ambang dalam kajian ini adalah batas bawah.
4. **Kejadian nasional dari DIBI adalah batas atas.** Tanpa nomor induk, banjir yang mengenai tiga
   kabupaten pada hari yang sama tetap terhitung tiga KJN bila DIBI tidak memecahnya; 98,1 persen KJN
   berasal dari satu baris.
5. **Angka logbook diurai dari teks bebas.** Meninggal, terdampak, dan hektare logbook harian diambil
   dengan pola teks; hektare terbukti terinflasi dan tidak dipakai. Sebanyak 1.461 baris tabel tidak
   terurai, dan arsip berakhir 29 Oktober 2026.
6. **Hotspot bukan luas terbakar.** Simulasi karhutla memakai 28 hari data VIIRS (15 Oktober
   sampai 11 November 2026). Satu piksel mewakili 14,06 ha, deteksi tertutup awan dan asap, dan S-NPP
   berhenti 1 November 2026. Angka luas di simulasi adalah proxy.
7. **Penduduk dari WorldPop.** Penaik relatif dan opsi b memakai penduduk WorldPop per kabupaten,
   bukan angka BPS. Sepuluh KJN mencatat terdampak melebihi penduduk kabupatennya.
8. **Teks Juklak tidak resmi.** Juklak 7/2023 dibaca dari salinan PDF UNFPA; lima halaman berupa gambar
   dan belum terbaca, termasuk definisi lengkap tingkat kerusakan rumah (Q-02).

## 10.2 Keterbatasan metode

1. **Wawancara belum dilakukan.** Daftar pertanyaan siap (Lampiran E), tetapi tidak ada jawaban
   Pusdalops, BPBD, atau Pusdatinkom yang dipakai. Beban kerja tambahan bagi pencatat belum terukur.
2. **Angka ambang dan kelas belum dikalibrasi terhadap respons.** Angka M1 sampai M5 dan jenjang kelas
   R, S, B, K adalah bawaan sementara yang bersandar pada praktik dunia (PAGER) dan panduan Pusdalops.
   Kalibrasi butuh daftar SK status dan dana siap pakai per kejadian (Q-35).
3. **Penilai matriks.** Status TERJAWAB, SEBAGIAN, dan GAGAL di Lampiran B ditetapkan penguji yang
   membaca kerangka dan katalog; penilaian itu sebagian bersifat pertimbangan. Uji adversarial oleh
   pemeriksa independen menutupi sebagian bias ini (Bab 7.4).
4. **Dependency map.** Hubungan antarparadoks ditetapkan per kelompok dan cenderung kurang
   mencatat hubungan antarkelompok (Bab 5.4).
5. **Contoh kejadian besar.** Angka Palu 2018 dan Cianjur 2022 diambil dari berkas repo
   (`kejadian_besar.csv`, katalog BMKG); angka dari sumber lain berbeda dan tidak dijumlah.

## 10.3 Keterbatasan penerapan

1. Aturan kekeringan bergantung pada zona musim BMKG, dan aturan karhutla bergantung pada pengamatan
   satelit yang layak serta verifikasi luas lapangan atau citra resolusi tinggi. Ketiganya membutuhkan
   data dari luar BNPB.
2. Kelas keparahan bukan penetapan tingkat bencana menurut UU 24/2007 Pasal 7 ayat (3), yang
   menunggu peraturan presiden. Kelas diusulkan sebagai klasifikasi data statistik.
3. Deret lama tidak dapat dihitung ulang sepenuhnya, karena nomor induk, tingkat kerusakan fasilitas,
   dan luas terverifikasi tidak tersimpan untuk kejadian lama.

## 10.4 Agenda riset

Tabel 10.1. Agenda riset lanjutan

| No | Agenda | Data yang dibutuhkan | Menjawab |
| --- | --- | --- | --- |
| 1 | Kalibrasi ambang dan kelas terhadap respons negara | Daftar SK status darurat dan dana siap pakai per kejadian 2019 sampai 2026 | Q-35, Q-04, Q-34 |
| 2 | Wawancara dan uji coba tiga provinsi selama satu musim | Izin wawancara; data berdampingan lama dan baru | Q-11, beban kerja |
| 3 | Penghitungan ulang deret DIBI 2015 sampai 2026 dengan aturan sebanding | Arsip DIBI per baris dengan riwayat koreksi | P-35, Q-12 |
| 4 | Aturan gabung karhutla pada satu musim penuh dengan luas terbakar referensi | Arsip hotspot Juni sampai November dan peta luas terbakar resmi | Q-06, P-01 sampai P-04 |
| 5 | Kematian tak langsung: jendela atribusi per jenis | Data kesehatan pascabencana | P-23, Q-26 |
| 6 | Kerusakan dan kerugian dalam rupiah sebanding | Hasil Jitupasna per kejadian dan indeks harga BPS | P-28 sampai P-30, Q-32 |
| 7 | Definisi dan ambang bencana nonalam dan sosial bersama otoritas sektor | Penetapan Kementerian Kesehatan dan otoritas keamanan | P-47, Q-42 |
| 8 | Uji konkordansi DIBI, logbook, dan sumber sektor per variabel | Data per kejadian dari tiap sumber | P-31, Q-33 |

Sumber: Bab 5 sampai Bab 9.
