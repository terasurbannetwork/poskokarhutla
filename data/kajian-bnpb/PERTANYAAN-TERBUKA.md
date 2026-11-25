# Pertanyaan terbuka pemilik (data/kajian-bnpb, dibaca 25 Nov 2026)

Jumlah per folder: alat-gambar 8, alun-terpadu 13, bot-laporan 25, cek-kabar 6, dashboard 3, desa-waspada 9, ews 8, genangan-satelit 12, hitung-bencana 43, hulu-hilir 24, inarisk 5, insar-gambut 6, insiden-kaya 9, juklak 8, kaji-ulang 13, kampus 6, kedeputian 12, kemampuan-inti 7, kerusakan-satelit 13, lapangan 8, lapor-ai 38, lapor-kejadian 20, lapor-lanjutan 13, laporan-berkala 23, lereng-bangunan 18, lifeline 7, logpal 15, longsor-satelit 8, misi-udara 18, operasi-udara 19, paritas-bencana 39, pembiayaan-risiko 9, pemetaan-relawan 8, penurunan-tanah 12, pintu-masuk 6, prediksi-kejadian 4, profil-bpbd 10, rantai 14, segel-dokumen 4, semai-awan 13, silang-sumber 7, tangga 10, tiga-w 7, tindak-langkah 6, tindakan-operasi 4, tsunami-genangan 9.
**Total: 579.** Nol terbuka: keterpaduan, lapor-luring, pipa, prediksi-besok, pwa-peringatan, rehab, siklus.

## alat-gambar
- alat-gambar Q1: Hitung di peramban dari JSON publik atau lewat rute Worker? | Bawaan: peramban dulu
- alat-gambar Q2: Gambar boleh dibagikan lewat tautan atau disimpan? | Bawaan: tidak; hilang saat halaman ditutup
- alat-gambar Q3: Nama "sel berdeteksi" dan "jejak sel" diterima? | Bawaan: diterima; "sel terbakar" tidak dipakai
- alat-gambar Q4: Penduduk dihitung per kecamatan beririsan, grid 0,25 derajat, atau ditunda? | Bawaan: kecamatan beririsan, berlabel perkiraan kasar
- alat-gambar Q5: Periode lebih dari 7 hari boleh? | Bawaan: tidak; 24 jam, 3 hari, 7 hari saja
- alat-gambar Q6: Perlu buffer luar dari poligon? | Bawaan: lingkaran dan kapsul saja
- alat-gambar Q7: Luas dNBR insiden boleh tampil walau tidak dijumlah? | Bawaan: boleh, per insiden, label batas bawah
- alat-gambar Q8: Letak tombol alat di peta utama dan ponsel? | Bawaan: satu tombol "Gambar wilayah" di kontrol peta

## alun-terpadu
- alun-terpadu Q1: Rekap alun-alun boleh tampil publik per provinsi? | Bawaan: tidak
- alun-terpadu Q2: Mitra berkunci API boleh menarik rekap agregat? | Bawaan: tidak
- alun-terpadu Q3: Pemberitahuan ke BPBD juga lewat WA keluar? | Bawaan: tidak; push dan email saja
- alun-terpadu Q4: Batas "lama tak terjawab" berapa jam? | Bawaan: 24 jam tanpa balasan resmi
- alun-terpadu Q5: Kabar warga boleh jadi sumber Cek Kabar Luar? | Bawaan: tidak
- alun-terpadu Q6: Kiriman tamu tanpa akun ditautkan ke kejadian? | Bawaan: ya, tanpa pemberitahuan, dihitung terpisah
- alun-terpadu Q7: Siapa boleh menutup kebutuhan? | Bawaan: akun instansi wilayah dan moderator; pelapor buka lagi 14 hari
- alun-terpadu Q8: Akun TNI/Polri menerima kotak masuk dan boleh menjawab? | Bawaan: ya; ubah status hanya pemda
- alun-terpadu Q9: Pemilik yang menerapkan migrasi dan memeriksa PIPA_TOKEN? | Bawaan: pemilik
- alun-terpadu Q10: Akun pemda boleh menerima push/email otomatis kebutuhan warga? | Bawaan: ya, hanya kiriman terverifikasi
- alun-terpadu Q11: Pemirsa boleh melihat angka alun-alun di /bnpb/pimpinan? | Bawaan: tidak
- alun-terpadu Q12: Angka alun-alun boleh masuk Laporan Berkala ke Presiden? | Bawaan: tidak
- alun-terpadu Q13: BPBD boleh menjawab atas nama lembaga dan ubah status kebutuhan warga? | Bawaan: ya lewat /instansi; tidak dari halaman publik

## bot-laporan
- bot-laporan Q1: Batas kirim WA dilonggarkan untuk balasan ke orang yang baru menulis? | Bawaan: draf kirim pratinjau+PDF; balasan 10 menit batas 40/hari
- bot-laporan Q2: Gateway pindah ke mesin yang selalu menyala? | Bawaan: tetap satu mesin; pesan selama mati tidak diproses
- bot-laporan Q3: Jenis laporan versi pertama? | Bawaan: harian bencana dan penanganan karhutla
- bot-laporan Q4: Ada aturan BNPB soal data yang boleh dikirim ke Anthropic? | Bawaan: HP, NIK, email disamarkan; nama tetap dikirim
- bot-laporan Q5: Batas belanja API? | Bawaan: berhenti bila lewat $10 sehari, pemilik diberi tahu
- bot-laporan Q6: Satu proyek terbuka per apa? | Bawaan: per nomor pengirim, jenis laporan, tanggal
- bot-laporan Q7: Proyek yang dibiarkan terbuka diapakan? | Bawaan: ditutup otomatis sesudah 24 jam tanpa aktivitas
- bot-laporan Q9: Susunan folder Drive tim IT? | Bawaan: subfolder jenis/tanggal/Revisi N
- bot-laporan Q10: Hasil final juga dikirim ke daftar PENERIMA terjadwal? | Bawaan: tidak
- bot-laporan Q11: Ambang peringatan banding 7 hari? | Bawaan: lebih dari 3 kali median 7 hari atau jadi nol
- bot-laporan Q12: Kapan revisi berulang jadi aturan tetap? | Bawaan: pola sama 3 kali dalam 14 hari dari 2 proyek
- bot-laporan Q13: Bot bertanya tapi penanya tidak menjawab? | Bawaan: bot menunggu; perintah "buat saja" membangun
- bot-laporan Q14: Perintah mana yang dipakai bot baru vs perintah.mjs lama? | Bawaan: buat, status, bantuan pindah ke mesin proyek
- bot-laporan Q15: Batas biaya V2? | Bawaan: $4 per jalan, $12 per proyek
- bot-laporan Q16: V2 gagal otomatis turun ke V1? | Bawaan: tidak
- bot-laporan Q17: Kunci API khusus V2 dan V2 dibuka untuk nomor lain? | Bawaan: V2 hanya nomor BL_V2_NOMOR; kunci khusus dianjurkan
- bot-laporan Q18: Agen boleh mengubah kode generator di repo mesin? | Bawaan: tidak
- bot-laporan Q19: Skill ppt-konsultan dipasang di mesin bot? | Bawaan: tidak
- bot-laporan Q20: Koreksi berulang V2 dijadikan aturan bagaimana? | Bawaan: ke pedoman agen lewat pengembang, disetujui pemilik
- bot-laporan Q21: Draf V2 sampai 6 menit diterima? | Bawaan: ya; V1 tetap ada
- bot-laporan Q22: "final" dari kalimat bebas langsung dijalankan? | Bawaan: tidak, ditanya dulu
- bot-laporan Q23: Obrolan bebas dijawab Claude? | Bawaan: ya, satu-dua kalimat lalu petunjuk bantuan
- bot-laporan Q24: Aturan rapikan yang sering dipindah ke pengurai generator? | Bawaan: ya, saat pola muncul tiga kali
- bot-laporan Q25: Tinjau visual (1-3 menit, $0,10-0,80 per draf) diterima? | Bawaan: ya, nyala untuk semua draf V2
- bot-laporan Q26: Vision untuk bot V1? | Bawaan: hanya tanya draf bergambar

## cek-kabar
- cek-kabar Q1: Berapa hari tanpa bukti luar sebelum "Kemungkinan selesai"? | Bawaan: banjir 3, longsor 7, karhutla 3, kekeringan 14 hari
- cek-kabar Q2: Tambah kueri Google News kebakaran permukiman? | Bawaan: belum ditambah
- cek-kabar Q3: Sumber lain di luar berita (medsos BPBD, DIBI, /warga)? | Bawaan: fase 1 hanya berita dan data alam
- cek-kabar Q4: Tombol WA ke BPBD dengan teks konfirmasi selesai? | Bawaan: ya, tombol WA yang ada, teks diganti
- cek-kabar Q5: Pemirsa baca-saja boleh melihat label ini? | Bawaan: ya
- cek-kabar Q6: Bila ketepatan rendah sesudah 60 hari, label dicabut atau ambang diubah? | Bawaan: tidak ada (diputuskan saat rapor CK-07)

## dashboard
- dashboard Q1: Target angka bullet graph Efektivitas? | Bawaan: tanpa garis target
- dashboard Q3: Bila bertentangan, KEPUTUSAN-SIPPA atau sistem dashboard yang menang? | Bawaan: KEPUTUSAN-SIPPA menang
- dashboard Q4: Mode TV di semua dashboard atau hanya /operasi? | Bawaan: hanya /operasi

## desa-waspada
- desa-waspada Q1: Halaman /desa-waspada publik atau hanya staf? | Bawaan: publik tanpa peringkat; dibangun tapi belum terbit
- desa-waspada Q2: Ambang lulus laju hindcast sebelum tampil tanpa pil hipotesis? | Bawaan: A ≥3x, B ≥2x, ≥200 desa-minggu, Wilson 95%
- desa-waspada Q3: "Terbakar ≥3 tahun" pakai petak terbanyak atau tahun di mana pun di desa? | Bawaan: petak terbanyak
- desa-waspada Q4: Hindcast S-NPP 2023 sebanding dengan produksi N20/N21? | Bawaan: tidak otomatis; diulang dengan NOAA-20
- desa-waspada Q5: Batas baris daftar B 300 per provinsi? | Bawaan: 300
- desa-waspada Q6: Letak tautan halaman? | Bawaan: satu tautan di menu situs
- desa-waspada Q7: gambut.geojson cukup untuk porsi gambut per desa? | Bawaan: dipakai berpil perkiraan, lisensi dicek
- desa-waspada Q8: Ekspor CSV boleh memuat peluang kab/kota? | Bawaan: boleh, dengan nama kolom jelas
- desa-waspada Q9: Titik kawah gunung api disaring dari daftar A? | Bawaan: dibiarkan, dicatat di batasan

## ews
- ews Q1: Data sensor/CCTV vendor dan MHEWS boleh diambil? | Bawaan: tidak diambil
- ews Q2: Panel untuk publik atau staf; BPBD lihat sensor wilayahnya? | Bawaan: SIHKA/PVMBG publik; sensor sendiri hanya tiga peran staf
- ews Q3: Jenis sensor gunung api milik sendiri? | Bawaan: tambah geofon lewat migrasi
- ews Q4: Batas basi per jenis sensor? | Bawaan: tma/hujan 30 menit, geofon 10 menit
- ews Q5: Kotak "Langkah cepat" ikut? | Bawaan: ya, dari tangga tindakan yang ada
- ews Q6: Grafik geofon seri penuh atau ringkasan per menit? | Bawaan: ringkasan per menit 24 jam
- ews Q7: Status SIHKA Siaga 3/2/1 disejajarkan ke Waspada/Siaga/Awas? | Bawaan: tidak dipetakan, ditulis apa adanya
- ews Q8: Interval kirim alat sendiri per jenis? | Bawaan: 5 menit tma/hujan, 1 menit geofon (hipotesis)

## genangan-satelit
- genangan-satelit Q1: Tampil publik di /banjir atau staf saja? | Bawaan: staf saja dulu
- genangan-satelit Q2: Kejadian mana yang dihitung? | Bawaan: banjir Buku Besar fase tanggap atau dibuka staf
- genangan-satelit Q3: Penduduk di genangan tampil sebelum uji balik lulus? | Bawaan: tampil dengan pil hipotesis
- genangan-satelit Q4: Ambang cakupan sah? | Bawaan: ≥10% luas kab teramati, sinyal_lemah false
- genangan-satelit Q5: Kebenaran uji balik? | Bawaan: DIBI terdampak/rumah terendam, peringkat Spearman
- genangan-satelit Q6: Kedalaman FwDET dipakai untuk kurva JRC? | Bawaan: tidak
- genangan-satelit Q7: Anggaran jaringan dan R2 per kejadian? | Bawaan: GFM ≤400 MB, WorldCover ≤300 MB, R2 ≤5 MB
- genangan-satelit Q8: Optik Sentinel-2 dari mana? | Bawaan: Earth Search Element84, adegan terbersih 0-15 hari
- genangan-satelit Q9: Jadwal hitung? | Bawaan: langkah siklus.yml sesudah lintasan GFM
- genangan-satelit Q10: Ambang VV kerusakan-satelit disatukan ke GFM? | Bawaan: tidak; dua jalur terpisah
- genangan-satelit Q11: Mode riwayat perlu margin pra sebelum tanggal DIBI? | Bawaan: tanpa margin tambahan
- genangan-satelit Q12: Akun BPBD boleh melihat ringkas agregat semua kab satu kejadian? | Bawaan: ya, rincian per kab tetap disaring

## hitung-bencana
- hitung-bencana Q-01: Kajian disampaikan kepada siapa? | Bawaan: tidak diisi, ditanya lagi sebelum Fase 3
- hitung-bencana Q-02: Siapa memasok salinan resmi Juklak 7/2023 dari JDIH? | Bawaan: kutipan PDF UNFPA berlabel tidak resmi
- hitung-bencana Q-03: Satuan jumlah kejadian: nasional atau per kabupaten? | Bawaan: dua angka dengan nama berbeda
- hitung-bencana Q-04: Ambang luas pengganti "1 hektare lahan"? | Bawaan: karhutla 2 ha, sawah/kebun 10 ha puso
- hitung-bencana Q-05: Kriteria e dan f jadi penanda, bukan pemicu? | Bawaan: ya, penanda
- hitung-bencana Q-06: Aturan gabung karhutla (jarak dan waktu)? | Bawaan: aturan harian.py (≤1,5 km, 48 jam)
- hitung-bencana Q-07: Versi angka mana yang sah? | Bawaan: ikut Petunjuk Juklak 7/2023, dibekukan per rilis
- hitung-bencana Q-08: Siapa berwenang menyatakan dua laporan satu kejadian? | Bawaan: Pusdatinkom memutuskan, BPBD mengusulkan
- hitung-bencana Q-09: Jeda pemisah kejadian berulang? | Bawaan: 7 hari tanpa laporan, batas 30 hari (gempa 30/90)
- hitung-bencana Q-10: Kejadian berantai/majemuk dicatat bagaimana? | Bawaan: satu induk dengan anak per bahaya
- hitung-bencana Q-11: Siapa narasumber wawancara dan apakah jalurnya dibuka? | Bawaan: daftar siap, belum dijadwalkan
- hitung-bencana Q-12: Naskah boleh memakai tarikan DIBI lewat Superset publik? | Bawaan: boleh dengan catatan sumber
- hitung-bencana Q-13: Kejadian lewat 31 Desember dihitung di tahun mana? | Bawaan: tahun mulai, penanda lintas tahun
- hitung-bencana Q-14: Tipe utama kejadian majemuk ditentukan apa dan oleh siapa? | Bawaan: dampak terbesar; Pusdatinkom memutuskan
- hitung-bencana Q-15: Gempa susulan merusak: episode induk atau kejadian baru? | Bawaan: episode induk 30 hari di zona sama
- hitung-bencana Q-16: Kapan kekeringan, kabut asap, abrasi mulai dan selesai? | Bawaan: per musim BMKG / anak karhutla / per tahun
- hitung-bencana Q-17: Kecelakaan pelayaran masuk lingkup bencana? | Bawaan: di luar lingkup sampai dikonfirmasi
- hitung-bencana Q-18: Asap/abu dari luar negeri dicatat sebagai kejadian? | Bawaan: dicatat dengan penanda sumber luar negeri
- hitung-bencana Q-19: Pusdalops menerbitkan KIB sejak laporan pertama? | Bawaan: ya sebagai tujuan; kunci sementara dipakai
- hitung-bencana Q-20: Ambang orang diberi pendamping relatif penduduk? | Bawaan: ambang absolut; per 100.000 berdampingan
- hitung-bencana Q-21: Ambang menonjol Pusdalops dan ambang Juklak disatukan? | Bawaan: disatukan dua tingkat (M1-M6, Sedang ke atas)
- hitung-bencana Q-22: Deteksi satelit belum dikonfirmasi jadi daftar resmi terpisah? | Bawaan: daftar terpisah, tenggang 3 hari
- hitung-bencana Q-23: DIBI menambah atribut "pemicu dominan"? | Bawaan: ya, ditetapkan Pusdatinkom
- hitung-bencana Q-24: Kapan orang hilang dinyatakan diduga meninggal? | Bawaan: saat pencarian resmi ditutup
- hitung-bencana Q-25: Pencatatan baru memakai satu orang satu kategori? | Bawaan: ya
- hitung-bencana Q-26: Siapa menyatakan kematian akibat bahaya? | Bawaan: BPBD mengusulkan, Pusdatinkom memutuskan
- hitung-bencana Q-27: Kriteria rumah memakai bobot tingkat kerusakan? | Bawaan: ya, RB + 0,5 RS + 0,25 RR, ambang 5
- hitung-bencana Q-28: Formulir wajib membedakan nilai, nol, belum didata? | Bawaan: ya
- hitung-bencana Q-29: Sumber luas apa yang boleh memicu K4? | Bawaan: terverifikasi lapangan atau citra resolusi tinggi
- hitung-bencana Q-30: Rupiah dilarang jadi ambang atau skala? | Bawaan: ya, rupiah hanya keterangan
- hitung-bencana Q-31: Formulir memisahkan kerusakan dan kerugian? | Bawaan: ya, dua kolom terpisah
- hitung-bencana Q-32: Indeks dan tahun dasar rupiah harga konstan? | Bawaan: tahun harga dicatat; indeks BPS dipilih pemilik
- hitung-bencana Q-33: Sumber utama dan pembanding tiap variabel dampak? | Bawaan: DIBI utama, sumber lain berdampingan
- hitung-bencana Q-34: Pembanding relatif skala keparahan? | Bawaan: kelas absolut dengan penaik 10% penduduk
- hitung-bencana Q-35: Boleh minta daftar SK darurat dan DSP per kejadian? | Bawaan: belum diminta
- hitung-bencana Q-36: Ambang GAR 2015 dipakai untuk Indonesia? | Bawaan: label analisis, bukan kelas resmi
- hitung-bencana Q-37: DIBI simpan kode wilayah saat kejadian dan terkini; siapa pelihara konkordansi? | Bawaan: keduanya disimpan
- hitung-bencana Q-38: Hari kosong logbook 2021-2023 bolong arsip atau nol? | Bawaan: tidak diketahui, bukan nol
- hitung-bencana Q-39: Definisi baku titik panas untuk laporan resmi? | Bawaan: lokasi unik per hari WIB
- hitung-bencana Q-40: Siapa menerbitkan nomor induk kejadian dan formatnya? | Bawaan: Pusdatinkom (KJN), catatan kab pakai KIB
- hitung-bencana Q-41: Periode rilis data statis dan versinya? | Bawaan: rilis bulanan bernomor, beku per triwulan
- hitung-bencana Q-42: Epidemi dan konflik sosial pakai ambang yang sama? | Bawaan: penetapan otoritas sektor, tanpa ambang K2
- hitung-bencana Q-43: Bagaimana DIBI mencatat COVID-19 2020-2023? | Bawaan: tidak diketahui, tidak dipakai contoh

## hulu-hilir
- hulu-hilir Q1: Sumber DEM: DEMNAS, GLO-30, atau keduanya? | Bawaan: GLO-30 berpil hipotesis; DEMNAS audit
- hulu-hilir Q2: Sumber garis sungai untuk sempadan? | Bawaan: HydroRIVERS dengan kepekaan luas hulu
- hulu-hilir Q3: Lebar sempadan 100 m seragam atau ikut PP 38/2011? | Bawaan: 100 m seragam, kepekaan 50/200 m
- hulu-hilir Q4: Arti "kritis" pada sempadan? | Bawaan: bukan hutan sejak awal atau hilang sebelum tahun kejadian
- hulu-hilir Q5: Sumber alert hutan (GLAD-L, GLAD-S2, RADD, GFW)? | Bawaan: ukur akses dulu; pemisahan tahunan saja
- hulu-hilir Q6: Tampil publik atau staf? | Bawaan: staf saja; BPBD kejadian wilayahnya
- hulu-hilir Q7: Aturan memilih DAS untuk kejadian multi-kab? | Bawaan: sub-DAS terbesar ≤25.000 km2, maks tiga DAS
- hulu-hilir Q8: Kejadian pertama dan jenis yang ikut? | Bawaan: Aceh Tamiang, Sumbar, Padang Nov 2025; banjir/bandang
- hulu-hilir Q9: Peringkat hujan: dasar dan metode? | Bawaan: CHIRPS tiga ukuran sejak 1981 (hipotesis)
- hulu-hilir Q10: Definisi "jam mulai naik" dan ambang laju hujan? | Bawaan: 5 mm/jam bertahan dua slot (hipotesis)
- hulu-hilir Q11: Anggaran jaringan dan penyimpanan? | Bawaan: batas per sumber, JSON ≤150 KB (hipotesis)
- hulu-hilir Q12: Agregat UNOSAT dan Overture jalan boleh tampil? | Bawaan: hanya agregat beratribusi
- hulu-hilir Q13: Kriteria vonis uji bahaya? | Bawaan: tangkapan ≥1,5x di 4 dari 6 kejadian (hipotesis)
- hulu-hilir Q14: Masuk Laporan Berkala atau kaji ulang? | Bawaan: enam angka ke kaji ulang; Berkala menunggu
- hulu-hilir Q15: Nama di layar? | Bawaan: "Hulu ke hilir"
- hulu-hilir Q16: Sumber jalan tergenang? | Bawaan: Overture segmen jalan
- hulu-hilir Q17: Batas "desa tergenang"? | Bawaan: dua angka: ≥1 sel dan ≥10% luas
- hulu-hilir Q18: Ambang teknis pendamping tanpa dasar tertulis? | Bawaan: angka usulan, dikunci di kriteria JSON
- hulu-hilir Q19: Ambang NDVI/SWIR/lereng dan cara kalibrasi? | Bawaan: titik mulai LT-15, kalibrasi inventaris manual Tapteng
- hulu-hilir Q20: Ukuran minimal objek bekas longsor? | Bawaan: 0,1 ha (hipotesis)
- hulu-hilir Q21: Jendela tanggal citra sebelum/sesudah? | Bawaan: ±120 hari, dilebarkan sampai 12 bulan
- hulu-hilir Q22: Validasi lawan inventaris resmi? | Bawaan: pakai yang ada sebagai pembanding; bila tidak, manual
- hulu-hilir Q23: Bentuk keluaran poligon atau sel? | Bawaan: poligon kasar di R2 staf; sel 110 m agregat
- hulu-hilir Q24: Inventaris boleh dipakai longsor sebagai label uji balik? | Bawaan: ya sesudah vonis kalibrasi

## inarisk
- inarisk Q1: Sumber resmi penduduk per jenis kelamin per kab? | Bawaan: tidak ditampilkan
- inarisk Q2: Halaman terbuka tanpa login atau staf? | Bawaan: terbuka, noindex, tidak di menu
- inarisk Q3: ACEBS, SPAB, DAS, dan dashboard lain ikut fase berikut? | Bawaan: ACEBS dan SPAB fase 2; lainnya menunggu
- inarisk Q4: STEP-A dan portal dicermin? | Bawaan: dilewati
- inarisk Q5: Teks bebas Lapor Kegiatan yang memuat nama tetap tampil? | Bawaan: tetap ditampilkan

## insar-gambut
- insar-gambut Q1: Boleh menjalankan unduhan LiCSAR/LiCSBAS untuk Palangka Raya? | Bawaan: tidak dijalankan sampai diizinkan
- insar-gambut Q2: Bila selaras, D InSAR menggantikan D literatur? | Bawaan: tidak; berdampingan berpil hipotesis
- insar-gambut Q3: Nilai α penurunan ke gambut hilang? | Bawaan: 1,0
- insar-gambut Q4: L-band ALOS-2: sumber, lisensi, pemroses? | Bawaan: tidak dikerjakan
- insar-gambut Q5: Satu wilayah lab cukup atau perlu wilayah kedua? | Bawaan: satu wilayah
- insar-gambut Q6: Ambang koherensi dan piksel minimum diterima? | Bawaan: angka RENCANA-UJI §2, dikunci sebelum jalan

## insiden-kaya
- insiden-kaya Q2: Kriteria lulus uji tahan perkembangan api? | Bawaan: ≥60% sel dalam ±24 jam, MAE tak lebih buruk
- insiden-kaya Q3: Perkiraan titik awal boleh tampil publik? | Bawaan: lingkaran galat ≥375 m tanpa nama lahan
- insiden-kaya Q4: Insiden baru ≤10 km ditandai lompatan dari insiden lain? | Bawaan: tidak
- insiden-kaya Q6: Pembulatan dan ambang angka bangunan publik? | Bawaan: <5 "kurang dari 5"; kelipatan 5
- insiden-kaya Q7: Bangunan insiden dihitung di bangunan.yml atau titik.yml? | Bawaan: bangunan.yml harian
- insiden-kaya Q8: Atribusi CC BY Open Buildings cukup di title dan metodologi? | Bawaan: title kepala kartu plus metodologi
- insiden-kaya Q9: Ambang 20 piksel unik untuk isokron dipakai? | Bawaan: 20 piksel, "terlalu kecil untuk dilacak"
- insiden-kaya Q10: Bila uji tahan gagal, tampil berpil hipotesis atau disembunyikan? | Bawaan: tampil berpil hipotesis
- insiden-kaya Q11: Vonis uji FIRMS historis berlaku untuk produksi titik_hari? | Bawaan: tidak otomatis; diuji juga 3 insiden musim ini

## juklak
- juklak Q2: Tabel kemungkinan dan matriks Juklak 17/2025 mana yang resmi? | Bawaan: skala 1-5 asumsi, level diisi manual
- juklak Q3: Siapa memasok berkas asli Format dan kode risiko Juklak 17/2025? | Bawaan: kode diisi manual, format lain belum
- juklak Q4: Perlu butir rinci kebutuhan Format 2 Juklak 9/2023? | Bawaan: Ada/Tidak per enam sektor
- juklak Q5: Status "ditolak" dipertahankan atau diganti? | Bawaan: dipertahankan (ikut penugasan)
- juklak Q6: Identitas Terlapor disimpan di tabel terpisah? | Bawaan: belum dibangun; hanya unit kerja
- juklak Q7: Format nomor register? | Bawaan: teks bebas, unik dijaga D1
- juklak Q8: Masa simpan identitas pelapor dan siapa memusnahkan? | Bawaan: tidak ada
- juklak Q9: Batas umur di Juklak 9/2023 benar "di bawah 19 tahun" dan "5-12 tahun"? | Bawaan: itu yang dipakai meja

## kaji-ulang
- kaji-ulang Q1: Apa itu kejadian besar yang otomatis dapat draf? | Bawaan: ≥3 kab, Lifeline merah, tanggap >7 hari, atau ditandai
- kaji-ulang Q2: Siapa menulis pelajaran dan rekomendasi? | Bawaan: Pusdalops dan Koordalops pusat
- kaji-ulang Q3: Siapa mengesahkan? | Bawaan: Koordalops atau Super Admin, dua pasang mata
- kaji-ulang Q4: Tenggat kaji ulang dan rekomendasi? | Bawaan: 30 hari; rekomendasi 60 hari (7-365)
- kaji-ulang Q5: Penanggung jawab rekomendasi? | Bawaan: unit/instansi berupa teks, bukan akun
- kaji-ulang Q6: Siapa boleh melihat? | Bawaan: staf; BPBD wilayahnya yang sudah sah; tidak publik
- kaji-ulang Q7: Format keluaran untuk pimpinan? | Bawaan: cetak A4 dari layar
- kaji-ulang Q8: Perlu status "ditolak" atau "dialihkan"? | Bawaan: tidak; selesai dengan alasan
- kaji-ulang Q9: Masuk Laporan Berkala ke Presiden? | Bawaan: belum; hanya hitungan ringkas
- kaji-ulang Q10: Jendela 60 hari rute Dalops tidak cukup? | Bawaan: rute baca sendiri tanpa batas 60 hari
- kaji-ulang Q11: Jenis kejadian yang ikut? | Bawaan: semua jenis Buku Besar
- kaji-ulang Q12: Bentrok nomor F6 dengan Risiko Masa Depan Siklus? | Bawaan: nama "Kaji ulang", kode KU-*
- kaji-ulang Q13: BPBD boleh menulis pelajaran wilayahnya? | Bawaan: tidak di fase ini

## kampus
- kampus T-A: Pilar ketiga Pendampingan Daerah atau Pemulihan Pascabencana? | Bawaan: Pendampingan Daerah
- kampus T-B: Siapa boleh membaca buku profil daerah? | Bawaan: akun saja; edisi publik menyusul
- kampus T-C: Boleh pakai LLM meringkas solusi dari paper? | Bawaan: tidak; ekstraktif
- kampus T-E: BPBD masuk lewat apa? | Bawaan: kode pribadi per kab diterbitkan staf
- kampus T-F: Nama menu? | Bawaan: "Kemitraan Kampus", /kemitraan
- kampus T-G: Surat dukungan BNPB untuk proposal? | Bawaan: draf dan nomor registri; tanda tangan di luar sistem

## kedeputian
- kedeputian U1: Centurisk97 wajib menyerahkan kode sumber ke Unit TIK? | Bawaan: ya, dengan tautan repo dan dokumentasi
- kedeputian U2: Layar Ruang Unit hanya staf atau ada yang publik? | Bawaan: staf saja
- kedeputian U3: Peran pusdalops diganti nama Dit. KPOD/Koordalops? | Bawaan: nama peran tetap, label "Dit. Koordalops"
- kedeputian U4: Boleh memanen sumber resmi terbuka sekali sehari? | Bawaan: ya, agregat, layar staf saja
- kedeputian U5: Boleh memanen JDIH pemda lewat JDIHN berkala? | Bawaan: ya, dengan atribusi
- kedeputian U6: Layer Survey123 berdata pribadi dilaporkan ke Pusdatinkom? | Bawaan: ya lewat pemilik; tidak dipanen
- kedeputian U7: Status katalog JDIH yang salah dilaporkan resmi? | Bawaan: koreksi label tampilan; pemilik meneruskan
- kedeputian U8: WIL-4 jejak DSP dibangun sekarang atau ditunda? | Bawaan: ditunda ke F3
- kedeputian U9: IRT-2 dan data TLHP/SAKTI boleh masuk D1 produksi? | Bawaan: tidak; skrip lokal
- kedeputian U10: Data direktorat (Destana, sirine, hibah, IKD dll.) bisa diminta? | Bawaan: tidak dianggap tersedia; proksi berlabel
- kedeputian U11: Gateway WA boleh mengirim pertanyaan satu ketuk ke BPBD? | Bawaan: belum
- kedeputian U12: Urutan mulai? | Bawaan: F0 dulu, lalu F1 dari mesin MB-1, MB-2, MB-6

## kemampuan-inti
- kemampuan-inti Q1: Keluaran model belum lolos (email, push) dihentikan atau tetap dikirim? | Bawaan: tetap dikirim berlabel hipotesis
- kemampuan-inti Q3: Severity CAP cuaca disamakan antara layar dan email? | Bawaan: email ikut PB-42 (Severe=Siaga, Extreme=Awas)
- kemampuan-inti Q4: Kurva JRC Asia boleh dipakai sebelum ada kurva Indonesia? | Bawaan: ya, berlabel, dikalibrasi ke DIBI
- kemampuan-inti Q5: Peringatan berantai baru tampil di mana? | Bawaan: layar Pusdalops dan laci kejadian saja
- kemampuan-inti Q6: Model eskalasi kejadian banjir dibangun? | Bawaan: sebagai riset; ditutup bila label <200
- kemampuan-inti Q7: Ambang mutu label ALGORITMA 5 tanpa sumber? | Bawaan: ambang awal berlabel bawaan
- kemampuan-inti Q8: Putaran email pertama KI-50 mengirim semua peringatan berlaku? | Bawaan: putaran pertama dicatat terkirim tanpa email

## kerusakan-satelit
- kerusakan-satelit Q1: Bahaya mana yang diuji dulu? | Bawaan: banjir, lalu karhutla
- kerusakan-satelit Q2: Jalur gempa? | Bawaan: tetap gagal, tidak dibangun
- kerusakan-satelit Q3: Citra sub-meter berlisensi atau Copernicus EMS dipakai? | Bawaan: tidak
- kerusakan-satelit Q4: Ambang lulus? | Bawaan: angka ALGORITMA 3, dikunci sebelum dihitung
- kerusakan-satelit Q5: Kebenaran uji banjir? | Bawaan: DIBI rumah terendam per kab; maks "lulus terbatas"
- kerusakan-satelit Q6: Siapa boleh menerima perkiraan ke isian? | Bawaan: peran pengisi Jitupasna
- kerusakan-satelit Q7: Nama nilai unit_asal baru? | Bawaan: satelit_diterima
- kerusakan-satelit Q8: Tampil di Laporan Berkala? | Bawaan: tidak
- kerusakan-satelit Q9: Target mandiri uji karhutla? | Bawaan: uji karhutla ditunda
- kerusakan-satelit Q10: Model gagal tampil tanpa angka atau berpil hipotesis? | Bawaan: tanpa angka
- kerusakan-satelit Q11: Parameter skor dan pembanding uji banjir? | Bawaan: usulan hipotesis (ambang VV -16 s.d. -20 dB, dll.)
- kerusakan-satelit Q12: Masker sawah dan tambak untuk skor banjir? | Bawaan: tanpa masker, dicatat di keterbatasan
- kerusakan-satelit Q13: Naif HAND dihitung di mana? | Bawaan: tetap wajib; tempat mesin diputus pemilik

## lapangan
- lapangan U1: Ambang wajah final? | Bawaan: 0,60 lolos, 0,45-0,60 tinjauan, kalibrasi 200 pasang
- lapangan U2: Aplikasi Android native untuk deteksi GPS palsu? | Bawaan: sesudah 90 hari bila banyak GPS curiga
- lapangan U3: Siapa boleh melihat foto wajah acuan? | Bawaan: Super Admin dan peninjau yang ditunjuk
- lapangan U4: Aturan sertifikat relawan? | Bawaan: per penugasan selesai + piagam lama bakti
- lapangan U5: Asuransi relawan sebelum diterjunkan? | Bawaan: kolom ada; penyedia diputus pemilik
- lapangan U6: Nama resmi program relawan? | Bawaan: Sayap BNPB, Korps Relawan Gerak Cepat
- lapangan U7: Data induk pegawai dari Biro SDM? | Bawaan: impor CSV sekali, lalu dijaga di sistem
- lapangan U8: Migrasi D1 produksi? | Bawaan: diterapkan pemilik

## lapor-ai
- lapor-ai Q1: Pengguna uji pertama berperan BPBD atau warga? | Bawaan: memilih sendiri; BPBD berlabel bpbd_klaim
- lapor-ai Q2: Model AI Claude API atau Workers AI? | Bawaan: Claude API sonnet effort rendah; tanpa secret pakai templat
- lapor-ai Q3: Standar isian Rancangan Juklak atau Juklak 7/2023? | Bawaan: Rancangan Juklak dengan peta ke meja dampak
- lapor-ai Q4: Foto boleh dikirim ke AI untuk menebak jenis/kerusakan? | Bawaan: tidak pada F0
- lapor-ai Q5: Laporan diteruskan ke siapa dan lewat apa sesudah uji? | Bawaan: F0 hanya pelapor dan PEMILIK
- lapor-ai Q7: F2 pakai WhatsApp Business Platform atau tetap Baileys? | Bawaan: F0-F1 Baileys; F2 tidak dibuka
- lapor-ai Q9: Batas pemakaian per nomor per hari? | Bawaan: 5 laporan dan 120 pesan
- lapor-ai Q10: Nama layanan yang dilihat pelapor? | Bawaan: "Lapor Bencana BNPB"
- lapor-ai Q12: Siapa boleh membuka monitoring dan ubah status tiket? | Bawaan: admin, pusdalops, koordalops
- lapor-ai Q13: Pindah ke Cloud API untuk tombol WA? | Bawaan: F0 tetap angka bernomor
- lapor-ai Q40: Batas waktu respons per status berapa dan sumbernya? | Bawaan: tidak ada warna terlambat
- lapor-ai Q41: Layanan terganggu dari laporan warga jadi bukti Lifeline? | Bawaan: belum mengalir ke Lifeline
- lapor-ai Q42: Epidemi, Kecelakaan, Konflik sosial masuk Lapor warga? | Bawaan: tidak; pakai Lainnya
- lapor-ai Q43: Daftar bahasa daerah yang ditawarkan? | Bawaan: 10 bahasa awal (Jawa, Sunda, Minang, dll.)
- lapor-ai Q44: Siapa meninjau terjemahan pesan tetap? | Bawaan: penutur asli BPBD/kampus mitra
- lapor-ai Q45: Antarmuka web juga dalam bahasa daerah? | Bawaan: tidak; Indonesia dan Inggris
- lapor-ai Q46: Batas video 30 MB/60 detik cukup dan masa simpan? | Bawaan: batas yang ada; masa simpan sama dengan foto
- lapor-ai Q47: Foto bukti petugas boleh tampil di Alun-alun? | Bawaan: hanya yang ditandai staf boleh publik
- lapor-ai Q48: Ikuti kejadian perlu push peramban? | Bawaan: tidak
- lapor-ai Q49: Foto bukti wajib saat Selesai? | Bawaan: wajib satu, boleh dilewati dengan alasan
- lapor-ai Q50: Unggah bersambung juga untuk foto? | Bawaan: tidak
- lapor-ai Q51: Data agregat dibuka untuk umum? | Bawaan: tidak; hanya kampus mitra
- lapor-ai Q52: Ambang sel kecil 3 pelapor cukup? | Bawaan: 3
- lapor-ai Q53: Akun pemda dipakai BPBD saja atau juga kantor bupati? | Bawaan: semua anggota aktif akun pemda boleh
- lapor-ai Q54: Polres, Kodim, Damkar perlu meja yang sama? | Bawaan: tidak pada tahap ini
- lapor-ai Q55: Pemberitahuan ke BPBD saat diteruskan lewat bot WA? | Bawaan: ya, maks 20 pesan per kab per hari
- lapor-ai Q58: Jangkauan "berdekatan" kecamatan sama atau radius km? | Bawaan: kecamatan yang sama
- lapor-ai Q59: Sesudah "ya", pertanyaan dampak ditanya satu per satu? | Bawaan: cukup dari detail bebas
- lapor-ai Q60: Tindakan tampil di lacak pelapor dan Alun-alun? | Bawaan: kabar status ke pelapor saja
- lapor-ai Q61: Valid BPBD menaikkan lencana di Alun-alun dan PDF? | Bawaan: lencana hanya di meja
- lapor-ai Q62: Jendela gabung di meja berapa lama dan per jenis? | Bawaan: 72 jam berantai semua jenis
- lapor-ai Q63: Verifikasi satu kepala gabungan sekaligus? | Bawaan: tidak; tiap laporan sendiri
- lapor-ai Q65: Darurat sekali ketuk boleh tanpa nama dan nomor? | Bawaan: nomor wajib; nama boleh kosong
- lapor-ai Q66: Keluarga boleh mencari tanda selamat lewat nomor HP? | Bawaan: tidak; hanya tautan dari penanda
- lapor-ai Q67: Berapa lama tanda selamat dan laporan orang dicari disimpan? | Bawaan: selamat 30 hari; dicari ikut masa simpan laporan
- lapor-ai Q68: Kabar selamat dibuka kapan saja atau hanya saat kejadian aktif? | Bawaan: kapan saja; kartu beranda saat kejadian aktif
- lapor-ai Q69: Poster memuat QR ke WA bot? | Bawaan: tidak; hanya web
- lapor-ai Q70: Darurat sekali ketuk juga lewat WA? | Bawaan: belum

## lapor-kejadian
- lapor-kejadian Q1: Jendela jam aturan satu desa? | Bawaan: 24 jam berantai untuk jenis lokal (hipotesis)
- lapor-kejadian Q2: Batas panjang rantai satu kejadian laporan? | Bawaan: 72 jam sejak laporan pertama
- lapor-kejadian Q3: Kekeringan dan abrasi ikut aturan satu desa? | Bawaan: tidak
- lapor-kejadian Q4: Apa yang dihitung "terverifikasi" untuk halaman publik? | Bawaan: hanya Valid oleh BPBD wilayah
- lapor-kejadian Q5: Laporan memenuhi D4 tayang otomatis atau ditekan staf? | Bawaan: otomatis, dengan tarikan staf
- lapor-kejadian Q6: Angka dampak tampil di halaman publik? | Bawaan: rentang antarlaporan, tidak dijumlah
- lapor-kejadian Q7: Titik peta pusat desa, kecamatan, atau tanpa peta? | Bawaan: pusat desa dibulatkan 4 desimal
- lapor-kejadian Q8: Foto bukti tampil publik? | Bawaan: tidak
- lapor-kejadian Q9: Arti "hari ini"? | Bawaan: 24 jam bergulir dari verifikasi Valid terakhir
- lapor-kejadian Q10: Alun-alun K30 ikut syarat terverifikasi? | Bawaan: tidak diubah
- lapor-kejadian Q11: Siapa boleh mengeklik "Usulkan"? | Bawaan: staf meja berperan siklus PDKO; BPBD tidak
- lapor-kejadian Q12: Seberapa cepat usulan dipasang? | Bawaan: jalan siklus.yml berikutnya (tiap 3 jam)
- lapor-kejadian Q13: Usulan dengan lebih dari satu kandidat kejadian resmi? | Bawaan: antrean tinjau Siklus (ambigu)
- lapor-kejadian Q14: Tabrakan awalan KJ- diganti? | Bawaan: tidak; layar selalu menulis jenisnya
- lapor-kejadian Q15: Kartu publik menautkan ke ringkasan kejadian resmi? | Bawaan: tidak pada rilis pertama
- lapor-kejadian Q16: Bahasa halaman publik? | Bawaan: Indonesia saja
- lapor-kejadian Q17: Ada unduhan/JSON/RSS untuk wartawan? | Bawaan: tidak
- lapor-kejadian Q18: Siapa boleh menarik dari halaman publik? | Bawaan: staf BNPB dan BPBD wilayah
- lapor-kejadian Q19: Waktu kejadian sampai menit atau dibulatkan? | Bawaan: dibulatkan ke jam bila satu pelapor
- lapor-kejadian Q20: Laporan yang jadi Tidak valid turun otomatis? | Bawaan: ya, pada muat berikut

## lapor-lanjutan
- lapor-lanjutan Q2: Siapa menerima penutupan ke Buku Besar? | Bawaan: staf Pusdalops di /lapor/meja
- lapor-lanjutan Q3: Pertanyaan harian dikirim jam berapa dan ke siapa? | Bawaan: 16.00 WIB ke ketua berkas
- lapor-lanjutan Q5: Anggota tim perlu konfirmasi admin? | Bawaan: cukup ditambah ketua terkonfirmasi
- lapor-lanjutan Q6: NIK disimpan utuh atau empat digit akhir? | Bawaan: utuh; staf lihat tersamar
- lapor-lanjutan Q7: Perlu jumlah objek minimal sebelum ditutup? | Bawaan: tidak ada minimum
- lapor-lanjutan Q8: Korban meninggal perlu foto? | Bawaan: tidak; korban hilang opsional
- lapor-lanjutan Q9: Rumah sewa: penghuni atau pemilik? | Bawaan: kepala keluarga penghuni wajib
- lapor-lanjutan Q10: Pengungsi dewasa menolak difoto? | Bawaan: tercatat menolak; isian tetap sah
- lapor-lanjutan Q11: Token web berlaku berapa lama? | Bawaan: 30 hari, diperpanjang saat dipakai
- lapor-lanjutan Q12: Berapa foto wajib per objek? | Bawaan: rumah/prasarana 2, titik/usaha 1
- lapor-lanjutan Q13: Batas umur foto wajah? | Bawaan: 18 tahun ke atas
- lapor-lanjutan Q14: Ketua berganti? | Bawaan: admin/Pusdalops memindahkan peran ketua
- lapor-lanjutan Q15: Akun lembaga BPBD dan staf lain boleh melihat berkas? | Bawaan: kab: berkas kabnya tersamar; prov: rekap

## laporan-berkala
- laporan-berkala Q2: Kapan DIBI ditarik untuk laporan bulan lalu? | Bawaan: staf memilih; peringatan bila <7 hari
- laporan-berkala Q3: Pembanding tahun lalu dari mana? | Bawaan: arsip beku tahun lalu, atau DIBI kini
- laporan-berkala Q5: Huruf kapital di PDF? | Bawaan: tanpa kapital kecuali singkatan resmi
- laporan-berkala Q6: PDF ke Presiden boleh memuat Ringkasan dan Temuan? | Bawaan: PDF boleh; layar tanpa kesimpulan
- laporan-berkala Q7: Foto media boleh dipakai? | Bawaan: foto BNPB; media bila izin dan kredit
- laporan-berkala Q8: Bab 6 dan lampiran tautan ditarik otomatis? | Bawaan: mesin mengusulkan, staf memilih
- laporan-berkala Q9: Generator contoh Oktober boleh jadi rujukan kode? | Bawaan: dibangun ulang dari contoh PDF
- laporan-berkala Q10: Perlu PPTX juga? | Bawaan: PDF saja
- laporan-berkala Q11: Bulan pertama dan siapa menyetujui? | Bawaan: November 2026; persetujuan di luar sistem
- laporan-berkala Q12: Definisi peluang banjir/longsor dipakai terus? | Bawaan: ya, dari logbook_riwayat.json
- laporan-berkala Q13: Laporan A4 boleh dicetak dari HTML? | Bawaan: boleh
- laporan-berkala Q15: Kartu angka operasi dari mana? | Bawaan: isian staf bersumber wajib
- laporan-berkala Q16: Boleh panen siaran pers bnpb.go.id harian? | Bawaan: ya, judul/tanggal/tautan saja
- laporan-berkala Q17: Tampilan PDF ikut contoh Oktober atau kit pangantara? | Bawaan: contoh Oktober
- laporan-berkala Q18: Syarat dan ambang usulan temuan T1-T7? | Bawaan: seperti tertulis; staf memilih
- laporan-berkala Q20: Aturan duplikat antarkab berlaku bagaimana? | Bawaan: hanya baris berdampak; kejadian per kab
- laporan-berkala Q21: Ukuran tampilan tiruan contoh tetap atau ikut data? | Bawaan: tetap seperti contoh
- laporan-berkala Q22: "Semuanya" termasuk publik tanpa masuk situs? | Bawaan: tidak
- laporan-berkala Q23: Kepada siapa tiap periode disampaikan? | Bawaan: harian/mingguan ke Kepala BNPB; bulanan/tahunan ke Presiden
- laporan-berkala Q24: Minggu ISO atau tujuh hari bergulir? | Bawaan: Senin-Minggu, YYYY-Www
- laporan-berkala Q25: Harian/mingguan menggantikan deck lama atau berdampingan? | Bawaan: berdampingan
- laporan-berkala Q26: Laporan harian ditarik jam berapa? | Bawaan: rakit 10.10 WIB untuk hari kemarin
- laporan-berkala Q27: Bagian kebijakan juga di harian dan mingguan? | Bawaan: hanya bulanan dan tahunan

## lereng-bangunan
- lereng-bangunan Q1: Sumber ambang lereng 40 persen? | Bawaan: dipakai, sumber "belum diverifikasi", kepekaan 30/45/60
- lereng-bangunan Q2: Izin dan unduhan DEMNAS Bandung Raya? | Bawaan: pemilik mengunduh; hanya agregat terbit
- lereng-bangunan Q3: Cara memberi lereng ke bangunan? | Bawaan: median jejak + cincin 15 m
- lereng-bangunan Q4: Lokasi per bangunan atau sel halus boleh tampil? | Bawaan: tidak publik; agregat desa/kecamatan
- lereng-bangunan Q5: Hubungan dengan F2 Peta Paparan? | Bawaan: bahaya tetap; F2 tetap Open Buildings
- lereng-bangunan Q6: Asal dan nama desa di public/geo/desa? | Bawaan: dipakai apa adanya dengan kode Kemendagri
- lereng-bangunan Q7: Daftar desa longsor dari pemilik atau disusun agen? | Bawaan: agen menyusun dengan aturan inklusi
- lereng-bangunan Q8: Kriteria vonis uji desa? | Bawaan: AUC ≥0,65 dengan selang bootstrap
- lereng-bangunan Q9: Ambang cakupan DEMNAS untuk menulis angka? | Bawaan: 95 persen bangunan
- lereng-bangunan Q10: Urutan perluasan sesudah Bandung Raya? | Bawaan: Jabar, Jawa, Sumatra, lalu lainnya
- lereng-bangunan Q11: Rilis Overture dan lisensi turunan? | Bawaan: rilis dibekukan 2026-10-21.0, atribusi
- lereng-bangunan Q12: Boleh pakai FABDEM untuk audit? | Bawaan: audit internal saja
- lereng-bangunan Q13: Tempat layar? | Bawaan: halaman sendiri /longsor/lereng
- lereng-bangunan Q14: Siapa melihat? | Bawaan: staf dan instansi sampai uji awal selesai
- lereng-bangunan Q15: Peringkat lima teratas boleh memasang nama wilayah? | Bawaan: daftar ukuran, tanpa kata "rawan"
- lereng-bangunan Q16: Kejadian pertama citra sebelum-sesudah? | Bawaan: Cisarua dan Pasirlangu Jan 2026
- lereng-bangunan Q17: Anggaran waktu dan tempat hitung? | Bawaan: mesin lokal pemilik per kotak
- lereng-bangunan Q18: Lapisan boleh masuk skor kerentanan nowcast? | Bawaan: tidak

## lifeline
- lifeline Q1: Layanan apa saja? | Bawaan: delapan layanan dasar
- lifeline Q2: Siapa menetapkan status resmi? | Bawaan: Pusdalops/Koordalops pusat; BPBD wilayahnya
- lifeline Q3: Ambang usulan dari Lapor Warga? | Bawaan: 3 pelapor/24 jam = kuning; >50% = merah (hipotesis)
- lifeline Q4: Tampil di mana? | Bawaan: halaman kejadian siklus dan /bnpb/dalops; tidak publik
- lifeline Q5: Masuk Laporan Berkala ke Presiden? | Bawaan: ya, menunggu paket Berkala
- lifeline Q6: Perpanjang token Earthdata dan bangun jalur VNP46A2? | Bawaan: ya, tiket tersendiri
- lifeline Q7: Berapa lama status tanpa pembaruan dianggap basi? | Bawaan: 24 jam, tanda tanpa ubah warna

## logpal
- logpal Q2: Peran yang menyetujui tahap permintaan; perlu peran "logistik"? | Bawaan: tidak ada
- logpal Q4: Versi resmi rumus standar minimal dan pemasoknya? | Bawaan: tidak ada (tab Standar masih draf)
- logpal Q5: Pemprov boleh menulis gudang akun kabupaten? | Bawaan: tidak ada
- logpal Q6: Kunci jumlah di form ubah barang atau terima tanpa jejak? | Bawaan: tidak ada
- logpal Q7: Kapan dan oleh siapa migrasi 0112 dan impor data asli? | Bawaan: tidak ada (dijalankan pemilik)
- logpal Q8: Akun BPBD boleh melihat data statis nasional atau provinsinya saja? | Bawaan: tidak ada (kini dilayani nasional)
- logpal Q9: Arti flag belum_usulkan 0 = sudah mengusulkan? | Bawaan: tidak ada
- logpal Q10: Ambang layak berangkat per moda pakai aturan mana? | Bawaan: hanya status BMKG tanpa vonis
- logpal Q11: Kartu dan laporan persediaan juga untuk gudang BPBD? | Bawaan: tidak ada
- logpal Q12: Laporan pertanggungjawaban bulanan atau triwulan? | Bawaan: tidak ada
- logpal Q13: Hari buffer stock dan kriteria daerah khusus/umum? | Bawaan: tidak ada
- logpal Q14: Penomoran BAST/SPPB dan perlu pindaian bertanda tangan? | Bawaan: tidak ada
- logpal Q15: FEFO per batch disetujui atau kartu v1 tanpa batch? | Bawaan: tidak ada
- logpal Q16: Jenis alat tahap awal dan siapa menyalin tabel interval? | Bawaan: tidak ada
- logpal Q17: Q6 dijawab dulu atau kartu bertanda "koreksi tanpa jejak"? | Bawaan: tidak ada

## longsor-satelit
- longsor-satelit Q1: Dari mana poligon longsor yang sah untuk uji? | Bawaan: digitasi lembar buta dua penafsir
- longsor-satelit Q2: Citra resolusi tinggi untuk penafsir? | Bawaan: hanya ditafsirkan di layar; NICFI tidak
- longsor-satelit Q3: Kejadian kalibrasi dan uji? | Bawaan: uji Tapteng 25 Nov 2025; kalibrasi dipilih dari DIBI
- longsor-satelit Q4: Ambang lulus? | Bawaan: angka ALGORITMA 4, dikunci sebelum uji
- longsor-satelit Q5: Sesudah lulus tampil di mana? | Bawaan: lapisan staf /siklus dan agregat kecamatan
- longsor-satelit Q6: Poligon bekas longsor boleh di public/? | Bawaan: tidak; R2 di balik sesi staf
- longsor-satelit Q7: Tebangan di dalam bekas longsor dilaporkan? | Bawaan: irisan luas tanpa kalimat sebab akibat
- longsor-satelit Q8: Dijalankan otomatis tiap longsor besar? | Bawaan: tidak; manual per kejadian

## misi-udara
- misi-udara Q1: Enam jenis misi sudah pas? | Bawaan: enam jenis D3
- misi-udara Q2: Tipe helikopter dan angka kinerjanya dari mana? | Bawaan: daftar ALGORITMA berlabel umum; 200 km/jam
- misi-udara Q3: Cadangan bahan bakar? | Bawaan: 30 menit untuk semua
- misi-udara Q4: Jarak penyangga di luar radius PVMBG? | Bawaan: 5 km
- misi-udara Q5: Gunung Level I boleh dilintasi tanpa catatan? | Bawaan: tidak dibelokkan, dicetak sebagai perhatian
- misi-udara Q6: Standar syarat lapangan pendaratan? | Bawaan: daftar periksa PMS 510 berlabel sumber
- misi-udara Q7: Ambang cuaca tetap ikut Operasi Udara? | Bawaan: sama persis, berlabel perkiraan
- misi-udara Q8: Saat peringatan tsunami, titik darat pesisir ditolak? | Bawaan: ditolak sebagai titik darat
- misi-udara Q9: Flight plan kunjungan pejabat boleh di repo publik? | Bawaan: tidak; ditulis ke luar repo
- misi-udara Q10: Siapa boleh membuat dan membaca flight plan? | Bawaan: buat pusdalops; baca ikut /api/operasi/peta
- misi-udara Q11: Mesin boleh membuka tautan pendek Google Maps? | Bawaan: CLI dan bot di Mac mini boleh; Worker tidak
- misi-udara Q12: Base selain sembilan base karhutla? | Bawaan: dari udara.json atau diketik
- misi-udara Q13: Pola pencarian SAR cukup dua pola? | Bawaan: kotak melebar dan lintasan sejajar
- misi-udara Q14: Zona hening SAR dan sektor larangan diisi staf? | Bawaan: ya, zona manual beralasan
- misi-udara Q15: Misi malam dibuat atau ditolak? | Bawaan: tidak ditolak, dicetak sebagai perhatian
- misi-udara Q16: Tiga jarak pemeriksaan tanpa sumber resmi pas? | Bawaan: 30 km, 15 km, 300 km
- misi-udara Q17: Angka kerja mesin tanpa sumber resmi pas? | Bawaan: seperti tertulis di batas_terbang
- misi-udara Q18: Ada token resmi InaRISK untuk layanan "Token Required"? (sisa bagian token) | Bawaan: tidak ada token; ImageServer terbuka saja

## operasi-udara
- operasi-udara Q1: Batas jam laporan gelar armada per base? | Bawaan: 07.30 waktu setempat
- operasi-udara Q2: Apa itu "tidak siap berulang"? | Bawaan: ≥3 hari dalam 7 hari
- operasi-udara Q3: Sumber jam terbang dan jadwal inspeksi pesawat? | Bawaan: belum ada data perawatan
- operasi-udara Q4: Batas jam kerja kru ikut aturan mana? | Bawaan: 8 jam terbang per hari, penanda kuning
- operasi-udara Q5: Laporan insiden dan nyaris celaka lewat apa, siapa baca? | Bawaan: tidak dibangun
- operasi-udara Q6: Sumber NOTAM? | Bawaan: tidak dibangun
- operasi-udara Q7: Harga kontrak dan plafon jam boleh masuk sistem? | Bawaan: biaya tidak ditampilkan
- operasi-udara Q8: Liter per jatuhan dihitung bagaimana? | Bawaan: kapasitas × jatuhan, berlabel perkiraan
- operasi-udara Q9: Sumber titik air (dip site)? | Bawaan: badan air terdekat dari data repo
- operasi-udara Q10: Definisi waktu respons? | Bawaan: ya, ≤2 km, maks 72 jam
- operasi-udara Q11: Luas terbakar dari cluster atau dNBR Sentinel-2? | Bawaan: luas cluster sistem kita
- operasi-udara Q12: Siapa boleh baca PDF renlap; JSON/TXT tetap publik? | Bawaan: PDF ikut hak peta; JSON/TXT tetap
- operasi-udara Q13: Kartu keadaan untuk periode >1 hari tampil hari terakhir atau rata-rata? | Bawaan: hari terakhir
- operasi-udara Q14: Seksi apa saja dan urutannya? | Bawaan: Ringkasan, Base, Renlap, Aksi, Operator, Dokumentasi
- operasi-udara Q15: Ekspor berisi seksi tampil atau seluruh laporan? | Bawaan: seksi yang sedang tampil
- operasi-udara Q22: Syarat koridor air per tipe dari sumber resmi mana? | Bawaan: angka laporan K21 berlabel
- operasi-udara Q23: Kedalaman dan gelombang badan air tampil sebagai apa? | Bawaan: "kandidat", ditulis "belum dicek"
- operasi-udara Q24: Panjang lintasan lurus dihitung dari apa? | Bawaan: sisi kotak batas OSM, sungai tidak dihitung
- operasi-udara Q25: Tipe pesawat mana yang ditampilkan? | Bawaan: enam tipe laporan K21 sebagai bahan kajian

## paritas-bencana
- paritas-bencana Q1: Longsor layar sendiri atau tab di /banjir? | Bawaan: tetap tab di /banjir
- paritas-bencana Q2: Dashboard pimpinan satu untuk semua atau per bencana? | Bawaan: satu lintas bencana dengan saringan
- paritas-bencana Q3: Siapa pengisi renlap dan operasi non-karhutla? | Bawaan: Pusdalops dan BPBD wilayahnya
- paritas-bencana Q4: Data aset udara gempa dan cuaca dari mana? | Bawaan: isian manual
- paritas-bencana Q5: Sumber SK status darurat? | Bawaan: logbook_sk yang ada
- paritas-bencana Q6: Koefisien harga rupiah dari mana? | Bawaan: IHPB/IKK BPS dan PIHPS
- paritas-bencana Q7: Video (A34) dikerjakan? | Bawaan: tidak
- paritas-bencana Q8: Bahasa Inggris lengkap masuk paket ini? | Bawaan: masuk W7 sesudah F2
- paritas-bencana Q9: Ambang riset bertanda [perlu cek] dipakai di layar? | Bawaan: tidak; pakai ambang di kode
- paritas-bencana Q10: Dasar mengikat laporan ke Presiden? | Bawaan: ikut praktik laporan harian dan berkala
- paritas-bencana Q11: Papan komando SKPDB dan gladi masuk paket? | Bawaan: di luar lingkup
- paritas-bencana Q12: Hitungan audit belum memasukkan K5? | Bawaan: dihitung ulang di PB-01
- paritas-bencana Q13: Rute tiga layar baru? | Bawaan: siaga.html, /bnpb/sitrep, /bnpb/pimpinan
- paritas-bencana Q14: Saringan jenis boleh pilih jamak? | Bawaan: ya
- paritas-bencana Q15: Mode TV dashboard pimpinan? | Bawaan: tidak
- paritas-bencana Q16: Garis target di ubin kesiapan? | Bawaan: tidak
- paritas-bencana Q17: Peringatan hipotesis boleh lewat email/push/CAP? | Bawaan: tidak
- paritas-bencana Q18: Peringatan jenis baru perlu persetujuan staf? | Bawaan: ya, 30 hari pertama
- paritas-bencana Q19: BPBD boleh membuka operasi tanpa persetujuan Pusdalops? | Bawaan: boleh untuk wilayahnya
- paritas-bencana Q20: Batas waktu checklist tangga tindakan? | Bawaan: angka usulan sebagai bawaan
- paritas-bencana Q21: Bobot prioritas wilayah 0,4/0,3/0,2/0,1? | Bawaan: dipakai, label bobot sementara
- paritas-bencana Q22: Laju mengungsi untuk jenis tanpa data historis? | Bawaan: tidak ditampilkan
- paritas-bencana Q23: Ambang kejadian besar pemicu laporan per KIB? | Bawaan: ikut ambang aktivasi Pusdalops
- paritas-bencana Q24: Pengganti ISPU KLHK untuk EWS udara? | Bawaan: PM2,5 BMKG dan OpenAQ
- paritas-bencana Q25: Pesisir satu id, rob tetap banjir? | Bawaan: ya
- paritas-bencana Q26: Masa berlaku renlap generik? | Bawaan: 14 hari per wilayah
- paritas-bencana Q27: Ambang sinyal "akan berakhir" status darurat? | Bawaan: 7 hari
- paritas-bencana Q29: Batas ukuran berkas statis baru? | Bawaan: 100 KB ringkas, 1 MB lainnya
- paritas-bencana Q30: Akun instansi mana yang disebut BPBD dan cara cocok ke kode kab? | Bawaan: pemprov/pemkab/pemkot lewat pemetaan
- paritas-bencana Q31: Pemirsa boleh membuka berkas renlap dan dokumen beku? | Bawaan: hanya daftar dan ringkasan
- paritas-bencana Q32: Pimpinan boleh membekukan dokumen? | Bawaan: boleh
- paritas-bencana Q33: Pemindai HP/NIK menolak rakit atau memperingatkan? | Bawaan: menolak (422)
- paritas-bencana Q35: Uji layar paket masuk npm run uji? | Bawaan: lewat skrip uji:paritas
- paritas-bencana Q36: Nomor migrasi D13 cukup nomor kosong berikutnya? | Bawaan: ya
- paritas-bencana Q37: Pemetaan tingkat ISPU dan aturan gunung api dipakai? | Bawaan: dipakai seperti tertulis
- paritas-bencana Q38: Pemirsa boleh membaca titik operasi semua bencana dan provinsi? | Bawaan: ya, nasional
- paritas-bencana Q39: Rumus kepatuhan renlap? | Bawaan: didatangi/jml_target, satu desimal
- paritas-bencana Q40: Tempat draf dokumen, penyala jenis, dan pembaca daftar? | Bawaan: R2 draf; registri; peran tertentu
- paritas-bencana Q44: PDF laporan rentang satu ringkasan atau per hari? | Bawaan: satu ringkasan; per hari lewat Excel/CSV

## pembiayaan-risiko
- pembiayaan-risiko Q1: Siapa menyediakan saldo DSP dan PFB, seberapa sering? | Bawaan: staf keuangan, bulanan dan tiap pencairan besar
- pembiayaan-risiko Q2: Saldo boleh disimpan di sistem; siapa melihat? | Bawaan: boleh; staf pembiayaan dan pimpinan
- pembiayaan-risiko Q3: Model kerugian awal apa? | Bawaan: tidak ada dulu
- pembiayaan-risiko Q4: Ada skema asuransi/parametrik resmi? | Bawaan: tidak diketahui; bagian parametrik mati
- pembiayaan-risiko Q5: Kejadian mana yang dibandingkan? | Bawaan: KJ dengan permohonan DSP atau Jitupasna
- pembiayaan-risiko Q6: Masuk Laporan Berkala ke Presiden? | Bawaan: tidak sampai Q1, Q2, Q9 terjawab
- pembiayaan-risiko Q7: Perlu koordinasi Kemenkeu/BPDLH untuk istilah PFB? | Bawaan: ya, lewat pemilik
- pembiayaan-risiko Q8: Rupiah berjalan atau konstan? | Bawaan: rupiah berjalan, tahun harga ditulis
- pembiayaan-risiko Q9: Peran apa yang membaca dan menulis? | Bawaan: baca pimpinan/Pusdalops/Koordalops; tulis Super Admin

## pemetaan-relawan
- pemetaan-relawan Q1: Siapa pemegang akun HOT Tasking Manager dan penyetuju proyek? | Bawaan: pemilik memegang akun; Pusdalops menyiapkan
- pemetaan-relawan Q2: Titip proyek ke HOT/komunitas OSM atau buka sendiri? | Bawaan: koordinasi HOT dulu
- pemetaan-relawan Q3: Nama pengguna OSM boleh tampil di layar internal? | Bawaan: tidak; agregat per kampus
- pemetaan-relawan Q4: Citra apa yang disarankan dan siapa cek lisensi? | Bawaan: daftar saran; staf memilih
- pemetaan-relawan Q5: Paparan boleh beralih ke OSM/Overture bila lengkap? | Bawaan: tidak beralih
- pemetaan-relawan Q6: Ambang "tipis"? | Bawaan: <0,6 tipis, 0,6-0,85 sedang (hipotesis)
- pemetaan-relawan Q7: Minimum peserta dan lama proyek? | Bawaan: satu kampus, 10 pemeta, 30 hari
- pemetaan-relawan Q8: Dihitung jam kegiatan mahasiswa? | Bawaan: ya, lewat modul sertifikat

## penurunan-tanah
- penurunan-tanah Q1: Izinkan dua skrip LiCSBAS di luar repo lewat aturan izin? | Bawaan: tidak diizinkan; pakai literatur
- penurunan-tanah Q2: Pemilik membuat akun Earthdata dan mencoba HyP3? | Bawaan: tidak; HyP3 cadangan
- penurunan-tanah Q3: Kota mana yang diproses? | Bawaan: Jakarta, Semarang-Demak, Pekalongan, Surabaya
- penurunan-tanah Q4: Satuan tampil kecamatan atau kelurahan? | Bawaan: kecamatan dulu
- penurunan-tanah Q5: Horizon proyeksi dan skenario laju? | Bawaan: 10 dan 20 tahun, laju tetap, p10-p90
- penurunan-tanah Q6: Unduh DeltaDTM lokal? | Bawaan: ya, tiket tersendiri
- penurunan-tanah Q7: Tayang di mana dan berlabel apa? | Bawaan: peta banjir publik berlabel hipotesis
- penurunan-tanah Q8: Jadwal penyegaran? | Bawaan: tahunan, manual
- penurunan-tanah Q9: Koreksi GACOS dan deramp? | Bawaan: tanpa GACOS, deramp derajat 1
- penurunan-tanah Q10: Kapan angka gabungan rob dan penurunan boleh ada? | Bawaan: sesudah uji balik lulus
- penurunan-tanah Q11: Data pembanding GNSS? | Bawaan: angka literatur saja
- penurunan-tanah Q12: Bila validasi gagal tetap tayang berlabel? | Bawaan: tidak; hanya literatur

## pintu-masuk
- pintu-masuk Q2: Ada peran staf yang boleh masuk hanya dengan kode? | Bawaan: tidak ada
- pintu-masuk Q3: Siapa mengisi peta domain email ke lembaga (mk_domain)? | Bawaan: admin satu per satu
- pintu-masuk Q4: Tulisan akun belum terverifikasi tampil atau ditahan? | Bawaan: tampil berlabel; isian instansi ditahan
- pintu-masuk Q6: Berapa lama sesi dari kode? | Bawaan: sama dengan sesi tiap peran; umum 30 hari
- pintu-masuk Q8: Siapa menerapkan migrasi dan mengisi MASUK_KUNCI? | Bawaan: pemilik
- pintu-masuk Q11: Pesan kode boleh melewati pembatas kirim WA? | Bawaan: tidak

## prediksi-kejadian
- prediksi-kejadian Q1: Laporan warga belum diperiksa ikut dihitung "terjadi"? | Bawaan: semua kecuali tidak_valid
- prediksi-kejadian Q2: Kapan kotak "Belum ada laporan" dianggap matang? | Bawaan: 3 hari
- prediksi-kejadian Q3: Siapa boleh melihat titik laporan di Dalops? | Bawaan: semua sesi staf Dalops
- prediksi-kejadian Q4: Tab Karhutla Dalops dibandingkan dengan FIRMS? | Bawaan: logbook dan laporan saja

## profil-bpbd
- profil-bpbd Q1: /masuk kode WA ditutup untuk akun BPBD? | Bawaan: akun pemda hanya username, sandi, profil, PIN
- profil-bpbd Q2: PIN berapa angka dan batas salah? | Bawaan: 6 angka; 5 salah kunci 15 menit
- profil-bpbd Q3: Siapa mengatur ulang PIN lupa? | Bawaan: admin BNPB
- profil-bpbd Q4: Surat tugas dan kartu tetap wajib? | Bawaan: tetap wajib sekali per akun
- profil-bpbd Q5: Sandi akun bersama dipegang siapa? | Bawaan: semua PIC; admin bisa reset
- profil-bpbd Q6: Akun Polda/Polres/Kodam/Kodim ikut model profil? | Bawaan: tidak dibuat di paket ini
- profil-bpbd Q7: Log dilihat siapa dan disimpan berapa lama? | Bawaan: admin semua, PIC lembaganya; 2 tahun
- profil-bpbd Q8: Sesi profil berapa lama; ganti profil butuh PIN? | Bawaan: 12 jam; ganti profil selalu PIN
- profil-bpbd Q9: Siapa "PIC yang sedang jaga"? | Bawaan: semua PIC aktif, terakhir aktif dulu
- profil-bpbd Q10: Waktu respons dibandingkan antar-BPBD (peringkat)? | Bawaan: tabel per BPBD tanpa peringkat

## rantai
- rantai Q1: Siapa boleh melihat rantai lintas BPBD? | Bawaan: usulan: BPBD kabnya, staf wilayahnya, admin semua
- rantai Q2: Rantai kejadian anak digabung di induk atau per KIB? | Bawaan: tidak ada
- rantai Q3: "Ada isian posko" cukup sebagai tanda tahap Posko selesai? | Bawaan: tidak ada
- rantai Q4: Tahap hibah RR cukup meja rehab atau perlu meja baru? | Bawaan: tidak ada
- rantai Q5: Siapa memasukkan tanggal SPPH, PHD, akhir hibah? | Bawaan: tidak ada
- rantai Q6: Siapa memasukkan tanggal RPBD? | Bawaan: tidak ada
- rantai Q7: Baris laporan pelatihan hanya untuk akun penyelenggara? | Bawaan: usulan: hanya akun bertanda penyelenggara
- rantai Q8: Penilaian Destana ditampilkan kewajiban atau anjuran? | Bawaan: tidak ada
- rantai Q9: Ambang "memenuhi SPM" per kabupaten berapa persen? | Bawaan: tidak ada
- rantai Q10: "Siap diberangkatkan" dan "dikerahkan" dua cap waktu; siapa mencatat? | Bawaan: tidak ada
- rantai Q11: Kelas risiko kabupaten untuk sosialisasi dari sumber mana? | Bawaan: tidak ada
- rantai Q12: Indikator gladi dan peralatan dibiarkan tidak diukur? | Bawaan: tidak ada
- rantai Q13: Rapor SPM antar-BPBD boleh publik kelak? | Bawaan: tidak ada
- rantai Q14: Rapor SPM digabung ke skor Rapor Kinerja atau terpisah? | Bawaan: tidak ada

## segel-dokumen
- segel-dokumen Q4: Deck PPTX/PDF generator Python ikut diberi QR? | Bawaan: belum di fase 1
- segel-dokumen Q7: Segel ditambahkan untuk snapshot lama? | Bawaan: tidak
- segel-dokumen Q8: Berapa lama baris segel disimpan? | Bawaan: selamanya
- segel-dokumen Q9: Angka teknis batas laju, panjang kode, ulang bentrok? | Bawaan: 60/10 menit, 10 huruf, 3 kali ulang

## semai-awan
- semai-awan Q4: Tinjau BMKG lewat peran baru bmkg atau tampilan di akun BNPB? | Bawaan: tampilan untuk semua pembaca /operasi
- semai-awan Q5: Tampilan Mitra lintas batas: layar saja atau tautan tanpa login? | Bawaan: layar dan ringkasan teks saja
- semai-awan Q6: Ambang skor zona dan jumlah zona maksimum? | Bawaan: skor ≥0,35, maks 5 zona, jarak ≥40 km
- semai-awan Q7: Jendela terbang 07-16 atau ikut batas terang base? | Bawaan: 07.00-16.00, ditandai bila di luar terang
- semai-awan Q8: Kecepatan jelajah per jenis armada OMC? | Bawaan: 300 km/j semua, berlabel perkiraan
- semai-awan Q9: Tujuan utama semai yang diberi bobot? | Bawaan: api aktif × pengali gambut 1,5
- semai-awan Q10: BNPB bisa dapat log sortie OMC BMKG berkoordinat? | Bawaan: uji balik dari omc_sortie isian tmc
- semai-awan Q11: Kota di negara tetangga boleh disebut namanya? | Bawaan: ya, nama kota dan jam tiba saja
- semai-awan Q12: Bahasa ringkasan teks bagikan? | Bawaan: Indonesia untuk Posko, Inggris untuk Mitra
- semai-awan Q14: Bahan apa yang boleh diusulkan mesin? | Bawaan: NaCl, dan dry ice bila inversi berasap
- semai-awan Q15: Muatan bahan per sortie per jenis armada? | Bawaan: kosong, "muatan armada belum diisi"
- semai-awan Q16: Lama penaburan per sortie? | Bawaan: 30 menit, berlabel perkiraan
- semai-awan Q17: Peringatan subuh bot WA ke grup mana? | Bawaan: satu grup Pusdalops

## silang-sumber
- silang-sumber Q2: Sasaran sekitar mana yang dipantau F5? | Bawaan: gunung api ada; sesar belum
- silang-sumber Q3: Ambang "perlu dicek" F3? | Bawaan: beda ≥2 peringkat atau gelombang beda >2x
- silang-sumber Q4: Kejadian lawan untuk gelombang tinggi dan angin kencang? | Bawaan: DIBI jenis terkait
- silang-sumber Q5: Tangga Peringatan boleh membaca beda_sumber.json? | Bawaan: tidak dikerjakan di paket ini
- silang-sumber Q6: "Belum ada data" untuk kab tanpa penduduk/sekolah/faskes cukup? | Bawaan: dipakai
- silang-sumber Q7: Prediksi bulanan BMKG dan laju kejadian berdampingan tanpa skor? | Bawaan: dipakai
- silang-sumber Q8: Arsip tiap sumber dimulai tanggal berapa? | Bawaan: dibaca saat SS-02

## tangga
- tangga Q1: Dari mana pemetaan ZOM ke kabupaten? | Bawaan: anak tangga musim tingkat nasional
- tangga Q2: Setuju pemetaan peringkat 0-3 untuk pernyataan non-Waspada/Siaga/Awas? | Bawaan: dipakai untuk sinyal saja
- tangga Q3: Setuju anak tangga "sepekan"? | Bawaan: ditambahkan
- tangga Q4: Perlu sinyal gabungan BMKG dan prediksi kita? | Bawaan: tidak, sampai ada uji balik
- tangga Q5: SPI perlu diberi peringkat untuk sinyal? | Bawaan: tampil tanpa peringkat
- tangga Q6: Perlu tabel kecamatan ke kabupaten untuk nowcast? | Bawaan: tingkat provinsi, nama kecamatan di teks
- tangga Q7: Pasang langkah tangga.py tiap 3 jam? | Bawaan: dirantai harian di jalan.py
- tangga Q8: Sumber anak tangga "jam" untuk ancaman kering? | Bawaan: kosong, "belum ada data"
- tangga Q9: Peringatan kekeringan diringkas ke tingkat tertinggi per kab cukup? | Bawaan: dipakai
- tangga Q11: Setuju usulan workflow menarik salinan sumber jam? | Bawaan: gagal-lunak, basi dilewati

## tiga-w
- tiga-w Q1: Siapa memutuskan tawaran diterima/dialihkan/ditolak? | Bawaan: staf Kedeputian Penanganan Darurat
- tiga-w Q2: Tawaran internasional wajib mitra lokal? | Bawaan: ya
- tiga-w Q3: 3W tampil untuk siapa? | Bawaan: staf, BPBD wilayahnya, organisasi lewat token
- tiga-w Q4: Ambang tumpang tindih? | Bawaan: >3 organisasi di klaster dan kab sama (hipotesis)
- tiga-w Q5: Nilai rupiah tawaran dicatat? | Bawaan: tidak
- tiga-w Q6: Siapa membuat tautan token organisasi? | Bawaan: staf Pusdalops, maks 90 hari
- tiga-w Q7: Alasan untuk organisasi dipisah dari catatan internal? | Bawaan: ya

## tindak-langkah
- tindak-langkah Q1: Status apa saja? | Bawaan: Belum, Dikerjakan, Selesai
- tindak-langkah Q2: Pimpinan boleh mengubah status? | Bawaan: hanya melihat
- tindak-langkah Q3: Nama pengisi tampil di riwayat? | Bawaan: ya
- tindak-langkah Q4: Langkah Selesai yang muncul lagi dibuka otomatis? | Bawaan: tidak
- tindak-langkah Q5: Jenis bencana lain ikut? | Bawaan: hanya banjir
- tindak-langkah Q6: Perlu bukti foto atau tautan dokumen? | Bawaan: belum; catatan teks 300 karakter

## tindakan-operasi
- tindakan-operasi Q1: Kebakaran permukiman dibuat entri bencana sendiri? | Bawaan: tidak dibangun di paket ini
- tindakan-operasi Q2: Tindakan kualitas udara dari mana? | Bawaan: masker dan sosialisasi dari registri udara
- tindakan-operasi Q3: OMC banjir dibuatkan zona usulan? | Bawaan: tidak
- tindakan-operasi Q4: Tindakan per target cukup centang atau perlu jumlah? | Bawaan: centang saja

## tsunami-genangan
- tsunami-genangan Q3: Batimetri dekat pantai? | Bawaan: GEBCO; BATNAS bila cocok
- tsunami-genangan Q8: Ambang lulus dan jumlah minimal kejadian uji? | Bawaan: Aida K dan kappa (JSCE); n_min 8
- tsunami-genangan Q9: Tsunami non-gempa masuk lingkup? | Bawaan: tidak di fase 1
- tsunami-genangan Q10: Sumber awal uji balik slip seragam atau inversi? | Bawaan: slip seragam
- tsunami-genangan Q11: Geometri patahan dari mana? | Bawaan: fokal BMKG/USGS, atau bawaan tsunami.js
- tsunami-genangan Q12: Anggaran animasi zoom pantai? | Bawaan: ditetapkan di TS-12; interpolasi sementara
- tsunami-genangan Q13: Paparan bangunan dan penduduk masuk fase 1? | Bawaan: tidak
- tsunami-genangan Q16: Tombol bagikan peta genangan? | Bawaan: tidak di fase 1
- tsunami-genangan Q17: Tambah kotak uji kelas A (Aceh Besar, Flores)? | Bawaan: ya, tidak tampil di pemilih publik
