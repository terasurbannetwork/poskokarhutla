# Tinjauan substansi: rehab bab-08 (25 Okt 2026)

Berkas: `naskah/rehab/bab-08.md`. Dibandingkan dengan `bukti/bab-08.md`, `bab-*.angka.json`, `data/angka.json`, `bab-08.pustaka.json`, riset D, dan KERANGKA rehab. Seluruh 192 kunci token ada dan teresolusi tanpa galat (nilai dan label diperiksa terhadap berkas bukti). Seluruh sitasi ada di pustaka.

## Diperbaiki langsung

| No | Temuan | Perbaikan |
| --- | --- | --- |
| 1 | SPAM Cianjur "98%" memakai kunci progres kontrak konsultan manajemen konstruksi, bukan progres fisik | Diganti 94,45% progres fisik terhadap rencana 99,56% (kunci fisik dan rencana) |
| 2 | R3P Lombok 94,73% per 2023 disitasi ke rilis 2020 | Sitasi diganti `kemenkopmk-2024-rehabrekon-lombok` sesuai kunci |
| 3 | Kebijakan gempa: "respons Lombok jauh di bawah hitungan setara" membandingkan jumlah unit, padahal 83 sumur irigasi aktif berkapasitas 1.314 l/detik | Ditulis dengan kapasitas, 28 truk, dan 26 pengolah air; hitungan dibaca sebagai kapasitas pembanding |
| 4 | "Orde yang sama" membandingkan 537 sarana darurat campuran dan 128 sumur dengan 486 sumur setara; sitasi PU ditempel pada hasil hitung kajian | Dilunakkan menjadi sama-sama ratusan unit; sitasi dipindah ke definisi sarana; "beralih ke sumur" dijadikan modal karena tanpa sumber |
| 5 | "Jawa Barat bagian selatan satu-satunya kawasan berulang tiga jenis" tidak benar: dihitung ulang dari DIBI kab-tahun 2015–2025, hanya Kab. Bogor dan Kab. Sukabumi yang mencatat ketiga jenis di paling sedikit 8 tahun (Jember ikut pada ambang 6) | Diganti klaim yang terhitung; dua kunci baru `rehab.sebaran.kab.berulang3.*` di `bab-08.angka.json` |
| 6 | Kelas dampak: "longsor dan cuaca ekstrem paling tinggi kelas 4"; longsor setahun 8.582 rumah masuk kelas 3. Titik megathrust Jawa memakai lantai korban jiwa Pangandaran 2006 untuk kelas rumah, besaran yang tidak sepadan | Kelas disebut per jenis dengan angka; megathrust berada di kelas 5 karena tidak boleh di bawah lantai tsunami Aceh dan Nias 2004 |
| 7 | "Musim itu tidak ditandai La Niña" tanpa sumber | Dibuang; La Niña 2020/2021 disebut pilihan pembanding kajian |
| 8 | Erupsi: 31 jembatan Sumbar 2024 diberi sebab "erupsi Marapi" tanpa sumber; "jembatan bentang panjang perlu konstruksi permanen" digeneralisasi dari satu kasus | Ditulis kategori DIBI; kesimpulan dibatasi pada Gladak Perak |
| 9 | Cuaca ekstrem: "pemulihan cukup di lapis darurat", "dalam jangkauan R3P kab/kota", "layanan air tidak berlaku" tanpa bukti; bertentangan dengan catatan Tabel 8.1 | Diganti "tidak dikuantifikasi" dan angka rumah 33.820 |
| 10 | Longsor: "beban RR terletak pada jembatan dan ruas jalan" tanpa data; "tidak ditemukan di sumber mana pun" berlebihan | Kalimat dibuang; dibatasi pada sumber yang dibuka |
| 11 | Kepekaan Cianjur "stimulan rumah mengikuti R3P" (Juklak 5/2024 tidak ada di korpus); baris kepekaan tsunami Flores 169 cm bukan tuas | Klaim dibuang; baris dibuang |
| 12 | Likuefaksi: "sumur tidak boleh menaikkan muka air tanah" tanpa pustaka | Dijadikan keputusan kartu: sumur dibatasi sampai ada rekomendasi Badan Geologi |
| 13 | Meta-komentar proses: "Buletin Agustus 2026 belum dibuka dan perlu dicocokkan", "Prinsip ini mengikuti aturan kajian", "ditulis tidak dikuantifikasi bukan nol", "menunggu turunan DIBI" | Dibuang atau diganti pernyataan keadaan data |
| 14 | Lain: tautologi Cianjur, pengungsi Padang tanpa catatan ketidaklengkapan, basis Padang tanpa catatan RS=0, 36 jembatan NTT 2026 ditulis semuanya Flores padahal memuat gempa NTT lain, target Agustus 2028 tanpa sitasi, rumah PKP tanpa sitasi, sebutan Seroja tanpa angka, catatan tabel Flores (102.384 bukan jumlah rusak), SIPPA tanpa rujukan Bab 6 | Dirapikan |

## Pemeriksaan tanpa temuan

Kewenangan (BNPB mengoordinasi, PU/ESDM/TNI sebagai pelaksana kartu), lantai skenario (tidak ada skenario di bawah lantai; Flores tidak dijadikan lantai), tidak ada klaim "terbukti" (BRR 140.304 rumah dilabeli laporan pelaksana sendiri), angka bertentangan berdampingan (DIBI lawan R3P, empat versi Flores, tiga versi jembatan banjir, DIBI lawan Buletin pengungsi). Pertanyaan kunci 1, 2, 3 terjawab; bailey dinyatakan tidak terhitung dengan alasan. Komponen KERANGKA ada: Tabel 8.1, 8.2, kartu 7 jenis, kartu agregat, sebaran, matriks, dua gambar.

## Untuk perakit dan pemilik (di luar berkas ini)

1. `bab-08.angka.json` dan `bab-08.pustaka.json` belum tergabung ke `data/angka.json` dan `pustaka.json`; bab ini juga memakai kunci dari bab-01, 02, 04, 05, 06, 07. Gabungkan sebelum bangun.
2. Pustaka ganda: kunci memakai id `pu-2026-spam-sumatera-feb`, `pu-2026-infrastruktur-sumatera-mei`, `kemenpupr-2023-cianjur`, `jsce-2011-lifeline`, `esdm-2018-air-siap-minum`, sedangkan teks bab ini memakai `pu-2026-spam-februari`, `pu-2026-pemulihan-sumatera-mei`, `pupr-2023-cianjur`, `jsce-2011-nojima`, `esdm-2018-air-sulteng`. Sumber yang sama dapat tampil dua kali di Pustaka.
3. Tiga gambar (peta sebaran, matriks, dan peta kartu) belum diperiksa; matriks harus menempatkan megathrust Jawa di kelas 5 dan longsor di kelas 3.
4. Buletin Info Bencana Agustus 2026 belum dibuka; angka Flores tetap sementara dan berlabel demikian.
5. "Direktorat PD Wilayah" tidak didefinisikan di bab mana pun; istilah mengikuti register R-RR-06 dan belum diubah.
6. Sumur TNI dan Polri Sumatra hanya dari media; teks sudah menyebutnya, tidak dipakai sebagai angka.
