Pemantauan bencana Indonesia: karhutla, banjir, dan enam bencana lain

# Buku Pegangan Pantau Bencana

Semua selera, keputusan pemilik, gerbang, dan armada yang berlaku di situs Pantau Bencana (repo `poskokarhutla`), di satu tempat. Yang baru diputus masuk ke Riwayat, lalu ke bagian aturannya.

Disegarkan 24 Okt 2026\
commit 2ce5dc44

[Riwayat perubahan](#riwayat-perubahan) [Keputusan pemilik](#keputusan-pemilik) [Stack & peta repo](#stack--peta-repo) [Situs per alamat](#situs-per-alamat) [Halaman & rute](#halaman--rute) [Selera tampilan](#selera-tampilan) [Angka & copy](#angka--copy) [Selera presentasi (PPT)](#selera-presentasi-ppt) [Selera laporan (DOCX/PDF) dan visualisasi data](#selera-laporan-docx-pdf-dan-visualisasi-data) [Fitur yang disembunyikan](#fitur-yang-disembunyikan) [Model & data](#model--data) [Ruang Koordinasi BNPB](#ruang-koordinasi-bnpb) [Ruang Instansi](#ruang-instansi) [Gerbang penjaga](#gerbang-penjaga) [Insiden & pelajaran](#insiden--pelajaran) [Armada agent](#armada-agent) [Tugas pemilik](#tugas-pemilik) [Rencana multi-bencana](#rencana-multi-bencana) [Cara halaman ini diperbarui](#cara-halaman-ini-diperbarui)

Terbaru di atas

## Riwayat perubahan

Vonis dan perubahan selera per tanggal. Kutipan miring adalah kata-kata pemilik saat menegur atau memutus.

1. 24 Okt 2026
   - **Jam cut off ditetapkan dan generator dibuat**: *"tiap laporan harian bencana di jam 12 cut off nya dan laporan harian karhutla cut off jam 15"*. Kolom terakhir = hari laporan itu sendiri, angka sementara sampai jam cut off; teks WA Koordalops, BMKG, dan laporan operasi ditempel apa adanya lalu diurai generator `data/laporan-bnpb/generator/`.
   - **Laporan harian 241026 dirombak bersama pemilik.** Status karhutla ikut sisa website (Kaltim, Luwu Timur, Arjuno kembali dalam penanganan walau BPBD melapor padam), perlu perhatian mencakup semua jenis (13: 12 karhutla dan TPA Supit Urang), daftar panel status hanya yang perlu perhatian, batang status `4 selesai | 15 karhutla ditangani | 3 lainnya` supaya tally sama dengan tabel, panel kekeringan dan bencana lainnya dipadatkan, pita aksi tanpa rujukan BMKG.
   - **Deck Penanganan 231026 dibuat dua kali**: cut off 23 Okt 07.00 dari data website, lalu *"Buat cut off 15.00 WIB"* dengan hari 23 Okt sementara dari FIRMS mentah (website belum menerbitkan luas hari berjalan). Slide operasi diisi ringkasan WA Koordalops; baris PEMILIK yang berupa perkiraan dibuang.
   - **Paparan Karhutla Provinsi Lampung** dibuat dari pola paparan Jatim: *"pakai data yang hari ini"* (per 24 Okt 06.44 WIB), catatan kaki hanya kalimat standar (*"Hilangkan"*), label "data satelit" di grafik dibuang, "24 jam" dibuang dari label cluster, "kompleks" ditulis "cluster" seperti aplikasi, tiap status berikon berbeda (*"Dikirim bedain dong iconnya"*), semua pil berikon, grafik harian selebar pitanya (*"Bagusin"*).

2. 23 Okt 2026
   - **Deck kajian meniru konsultan kelas dunia, empat skill pemilik diadopsi, tanpa pertanyaan lagi ke pemilik.** Bedah 10 deck McKinsey, BCG, Bain, Deloitte, dan KPMG dicatat jadi subbab [Pola deck konsultan kelas dunia (McKinsey, BCG, Big Four)](#pola-deck-konsultan-kelas-dunia-mckinsey-bcg-big-four): *"ppt mckinsey bcg dan konsultan big four management juga ditiru ya"*. Yang dipakai antara lain Pesan Kunci sebagai peta deck, judul temuan yang dibuktikan angka di slide yang sama, kode bagian di depan judul, satu warna sorot, matriks lembaga × fase, dan tabel penanggung jawab berikon. Empat skill pemilik dinilai lalu diadopsi sebagian: `alfatehan-pptx-rules` (garis besar per slide sebelum membangun, variasi tata letak, grafik native, laporan QA per deck), `anti-ai-checker` (ambang terukur dan vonis tiga tingkat di [Angka & copy](#angka--copy)), `book-production-rules` (kepadatan pustaka, glosarium, ejaan dan pemenggalan id-ID, QA lima lapis, metadata), dan `deep-research` (berkas bukti per bab, klaim tanpa sumber dibuang, BLUF). Pemilik meminta tidak ada pertanyaan lagi (`KEPUTUSAN.md`, kepala tabel bawaan), jadi pertanyaan terbuka diputus sebagai bawaan orkestrator (`KEPUTUSAN.md` T1–T13, menunggu koreksi pemilik; daftarnya di [Belum diputus](#belum-diputus)). Syarat LULUS pindaian anti-AI per bab adalah aturan proses orkestrator, bukan kata pemilik. Aturan pemilik menang saat bentrok: ukuran huruf skill, garis di bawah judul, Garamond, halaman pembatas bab penuh, panel gelap, Gantt, biaya proyek, merah, dan huruf di bawah 6 pt. Keputusan pemilik P1–P17 untuk dua kajian masuk tabel [Diputus](#diputus).
   - **Selera laporan dicatat** jadi bab [Selera laporan (DOCX/PDF) dan visualisasi data](#selera-laporan-docx-pdf-dan-visualisasi-data), dari tata letak JAPFA REPORT dan bedah 22 laporan kelas dunia (World Bank, ADB, IMF, McKinsey, BCG, Deloitte, IPCC, UNDRR, WMO, OECD, UNICEF, Jepang, Inggris, Belanda, Our World in Data, Financial Times): *"Tiru style mereka dan implementasikan untuk sempurnakan system kita."* Yang dipakai antara lain halaman Pesan Kunci, kalimat pembuka tebal, keterangan gambar deskriptif stabil dengan temuan berangka di kalimat pembuka tebal, pilih grafik menurut pesan, peta kecil berganda, rentang ketidakpastian, matriks kemungkinan × dampak, rekomendasi berkode berlembaga, dan studi kasus empat pertanyaan. Aturan pemilik menang saat bentrok: baris satuan, sumbu Y, merah, latar gelap, laut biru, dan biaya proyek. Bukti per pola di `data/kajian-bnpb/riset/desain-benchmark/SINTESIS.md`; `PEDOMAN-DESAIN.md` kajian ikut diperbarui.
   - **Selera presentasi dicatat** jadi bab [Selera presentasi (PPT)](#selera-presentasi-ppt), diukur dari 9 deck tanggal 18 sampai 23 Okt. Laporan harian kini mengikuti deck 221026: *"Ini format terakhirnya yang kemarin"*. Deck 23 Okt yang dibuat Claude dengan generator `/laporan-bnpb` masih bergaya lama (palet D9650B/0F1E2D, tanpa ikon, teks terpotong "…"), jadi deck yang ditunjuk pemilik yang disalin, bukan generatornya.
   - **Paparan Karhutla Jawa Timur dirombak berulang**: *"Bagusin. Sumpah jelek banget"*. Gaya rumah BNPB dipertahankan, deck Kalteng dipakai untuk isi saja. Perubahannya:
     - pil CUT OFF DATA ditambahkan;
     - grup DATA SATELIT dan PERLU PERHATIAN dipasang;
     - panel diberi pita kepala berikon;
     - peringkat diberi nomor dan penanda peta diberi nama;
     - keterangan diganti chip, dan chip lembaga memakai ikon, bukan logo.
   - **Peta dan grafik deck**:
     - latar peta tidak biru (*"petanya belakangnya jangan biru"*), label tidak tumpang tindih (*"Ini situbondo tumpang tindih"*), setiap bulatan dan warna punya legenda;
     - grafik batang meniru laporan harian: nilai di atas, tanggal dan persen di bawah, naik oranye, turun biru, batang pertama abu, tiga terakhir pekat.
   - **Satu topik, satu kontainer, tanpa panel gelap di samping**: *"JANGAN DIPISAHIN DONG CONTAINERNYA KAN SAMA"*. Isi tidak menempel ke tepi bawah, rincian rekomendasi rata kiri-kanan. Banyak teks hiasan dibuang, termasuk satu slide utuh (*"Slide 5 buang"*).
   - **Judul paling banyak dua baris** (*"Ukuran disesuaikan lah intinya cuma 2 baris"*) dan judul memakai bentuk deskriptif, misalnya "Sebaran Titik Panas dan Kebakaran di Jawa Timur per 22 Oktober".
   - **Data karhutla di deck = data website** (*"Karhutla udah pasti pakai data kita"*): hotspot dari tabel Real Time, luas terbakar dan belum padam dari lapisan peta. Fakta lapangan dari laporan BPBD atau Koordalops.
   - **Bencana lainnya di laporan harian dipisah per jenis dengan ikon berbeda**, mengikuti laporan 18–19 Okt: *"Dipisahin dong ... jadi orang tau mana gempa bumi mana bla bla bla coba cek yang laporan harian 18-19"*. Baris TOTAL kekeringan kini berikon rumah, orang, dan tetes air (*"Buat icon"*). Pembangun deck 231026 disimpan di `data/laporan-bnpb/harian-2026-10-23/` setelah scratchpad sempat terhapus dan pembangun Jatim hilang.
   - **Status di laporan harian mengikuti sisa belum padam website.** Kota Tidore (sisa 0 ha) dipindah ke selesai: *"Bro ini Maluku Utara udah nol ya masuk selesai dong"*. Kartu PERLU PERHATIAN tidak lagi menyalin jumlah dalam penanganan (*"Emang semua perlu perhatian ya?"*). Pemilik memilih yang serius saja: sisa ≥100 ha atau dilapor BPBD belum padam, jadi 8 dari 10. Penunjuk "Lampiran (data rinci) mulai halaman 13" di penutup dibuang (*"Hilangkan"*), lalu sampul dan penutup sekalian dibuang: *"Hilangkan cover dan terimakasih kirim ppt dan pdf"*. Laporan harian kini 2 slide, dikirim sebagai PPTX dan PDF.

3. 22 Okt 2026 (lanjutan)
   - **Satu tujuan: api padam lebih cepat.** Rancangan `docs/bnpb/RANCANGAN-API-PADAM.md` Fase 0 dan 1 disetujui dan selesai: ID insiden stabil (`scripts/data/insiden.py`), Kartu Api di `/instansi` dengan teks WA dan cetak, tugas dibuat begitu data terbit. Keputusan pemilik: tugas otomatis untuk level 3 dan level 2 bersyarat (permukiman, konsesi, tumbuh); insiden Himawari ke Posko pusat saja sampai VIIRS mengonfirmasi; server rute berbayar boleh bila graf sendiri tidak cukup; surat akses data TMAT, SiPongi, Daops jalan. Radius permukiman 5 km dan nama perusahaan di tugas diambil sebagai bawaan.
   - **Program lanjut disetujui dan tayang** (`docs/bnpb/RENCANA-LANJUT.md`): alarm Himawari, push dan email seketika, dashboard kinerja dan SLA, kalibrasi, gerbang prakiraan, rute ke titik api, CAP, hash berkas Gakkum, regu luring. Push akun daerah tiap 3 jam lewat Web Push standar tanpa pustaka. Operasi lapangan: verifikasi padam (Himawari, laporan regu, cek ulang gambut H+1/3/7), keselamatan regu, peta operasi, sumber air dan pompa estafet.
   - **Program 15 jam**: produksi ternyata masih di migrasi 0035 dengan nol akun instansi dan nol tugas; hambatannya adopsi dan aktivasi, bukan fitur model. Lahir `scripts/bnpb/aktivasi.sh` (uji kering migrasi tertunda di salinan skema produksi), halaman `/kabar` per kabupaten, teks undangan WhatsApp di CSV akun massal, graf jalan diarsipkan ke R2, `jeda_satelit` di `/api/status`, uji siklus insiden ujung ke ujung.
   - **Tugas api tidak pernah terbentuk di produksi** (`7526857c`): migrasi 0029 di repo disunting ke 3.000 huruf sesudah diterapkan, produksi tetap 2.000, cron gagal tiap menit dan seluruh batch ditolak. Batas kembali 2.000.
   - **Semua pengembangan karhutla dibawa ke bencana lain** (`3169c015`): *"semua pengembangan karhutla, lakukan juga di bencana lain"*. Tugas lapangan, Ruang Instansi, operasi, laporan harian, WA, deck, dan paparan kini per bencana (migrasi 0047 sampai 0049).
   - **Panel presiden** `/presiden`: kartu dan tab Peta, feed JSON `/data/presiden/*` untuk dashboard Presiden. Publik tanpa sesi (agregat saja), boleh di-iframe, nama perusahaan boleh, WALHI tidak. Kartu basi diredupkan dengan "Data terakhir <tanggal>". Widget peringatan BMKG dicabut atas permintaan pemilik; panel kini 14 widget.
   - **Domain pindah ke centurisk97.id**; pantau.terasurban.com sengaja dilepas. Rujukan operasional (`src/ews.js`, `src/pengingat.js`, `URL_STATUS`) pindah; canonical dan og meta sengaja tetap. *"Jangan ganti domain dulu."*
   - **"perkiraan satelit" tidak pernah ditulis** di judul, tooltip, legenda, pop-up, grafik, dan slide (`944bffc5`). Tab Posko (Ajuan) benar-benar tersembunyi; tab Replay banjir keluar dari menu (validasi 26%).
   - **Laporan konsesi** menambah kebakaran 2019 dan 2023 dengan peta The TreeMap 2024 (CC BY-NC 4.0, terbit atas keputusan pemilik, atribusi tampil).
   - **Uji balik yang tidak diadopsi**: persentil FWI per provinsi seri di Sumatra dan Kalimantan, status tidak diubah; firespot tiga satelit, ambang 4 dipertahankan. Peluang "akan membesar" tetap disembunyikan (prospektif 17% lawan dasar historis sekitar 3%).
   - Peta: lapisan EFFIS (prakiraan FWI, Drought Code, area terbakar) dan AOD NASA GIBS. Audit worker: EXIF dibuang dari unggahan publik, CSRF admin seragam.
4. 22 Okt 2026
   - **Ruang Instansi masuk main** (`16652489`): akun daerah (pemprov, pemkab/pemkot, polda, polres, kodam, kodim) dibuat massal bersandi acak lalu diklaim lewat verifikasi dokumen; tugas api per kompleks; rekomendasi cara padam; akun staf BNPB dan Meja Pantau; inventaris dan P3K; laporan korban jiwa; laporan karhutla harian bersnapshot; OMC; konferensi pers dan laporan Dit. Koordalops di `/laporan-bnpb`. Migrasi D1 0029 sampai 0035 menunggu pemilik. Rincian di [Ruang Instansi](#ruang-instansi).
   - **Terbit merah karena rute `/kekeringan/simulasi` 404**: tab simulasi kekeringan belum didaftarkan di registry. Dibetulkan di `a5afb8ab`; gerbangnya `gerbang-tab-registry`.
   - **Lampu malam ditahan**: modul `scripts/umum/lampu_malam.py` tidak dilanjutkan walau token Earthdata terisi. Skripnya tidak dipanggil workflow dan JSON validasinya tidak dibaca layar.
   - **Indeks risiko kebakaran permukiman DKI** (`/bnpb/kebakaran`): uji balik gagal. Indeks menangkap 18% kebakaran, jumlah bangunan saja 32%, acak sekitar 20%. Tetap berlabel belum lulus uji.
5. 21 Okt 2026
   - **Program Ruang Instansi dimulai**: sistem untuk daerah dan pusat yang dipakai harian. Sepuluh butir permintaan dicatat di memori `ruang-instansi` dan dicocokkan sebelum menyatakan selesai.
   - **Peringatan dari berita untuk tujuh bencana** (`81032a48`): berita Google News dipilah jadi peringatan ke depan (wajib sumber resmi) dan kejadian yang sedang berlangsung, dengan masa berlaku dari tanggal di judul. Panel bersama `public/inti/peringatan-berita.js` di tab Insight tujuh halaman dan `/semua`, berlabel "dari berita, belum diverifikasi".
   - **Abrasi garis pantai tahunan** (`1cd255ee`): Landsat 1988 sampai 2025, MNDWI + Otsu, transek 1 km, laju regresi dengan selang 95%, lima situs pantura, 167 transek (161 terbaca). Lapisan `abrasi` di entri banjir; agent baru `pesisir`.
   - **Konpers harian, rekomendasi cara padam per kompleks, arsip evaluasi OMC** (`scripts/data/taktik.py`): heli selalu pelengkap, dry ice bukan pemadaman titik.
6. 20 Okt 2026
   - **Titik tengah dilarang**: *"Gw ga pernah suka dipisahin titik gini. Catet."* (paparan Presiden). Tiap teks tampil, kartu, pil, slide, dan judul laporan tanpa " · ". Pakai koma, label sendiri, atau baris baru. Angka kunci di depan.
   - **Semua bencana dibuka di menu**: label "Soon" dicabut dari dropdown bencana.
   - **Header**: tab rata tengah, ikon tampil di desktop, tab pindah ke menu garis tiga di bawah 1280 px.
   - **Simulasi cuaca**: model dampak angin, limpasan, gelombang badai, pita ansambel, peringkat tindakan.
   - **Laporan konsesi**: indikasi lahan dibakar lalu jadi sawit (kebakaran 2015) dengan empat foto bukti; citra Sentinel-2 untuk 1.529 konsesi bertitik, panel tanpa adegan memakai citra terdekat (paling jauh 10 hari) sebelum jatuh ke VIIRS.
   - **Insiden penanda konflik**: `<<<<<<<` ter-commit di `public/udara/data/*.json`, JSON.parse gagal di layar tanpa satu uji merah. Gerbang baru `gerbang-konflik`.
   - **Ruang Koordinasi gelombang penyempurnaan**: Layar Pimpinan, pengingat harian, kapasitas relawan dinamis, uji balik jujur, mode luring, arsip sitrep R2, rehab-rekon, stok gudang, ekspor gaya DIBI, uji layar 59/59.
7. 19 Okt 2026
   - **Pemilik menjadi staf ahli BNPB**, lalu meminta sistem yang membetulkan kinerja BNPB. Lahir **Ruang Koordinasi** di balik `/bnpb`: relawan dan kampus mitra, alun-alun, riset, Meja Kerja, sitrep otomatis, indeks risiko kecamatan, kebutuhan musim, berkas Gakkum. M8 pengungsi dicoret pemilik. Agent baru `ruang-bnpb`.
   - **Bahasa lugas**: deck Kepala BNPB ditolak keras karena kalimat bergaya (personifikasi, slogan, kontras "X bukan Y", "mulai besok"). Judul = fakta + angka + sumber; label = kata benda polos.
   - **Kekeringan tetap tampil dengan pil hipotesis**: ambang SPI gagal uji balik (POD 22%, FAR 97%, CSI 0,026 lawan acak 0,012). *"Tetap tampilkan angka kekeringan dengan pil hipotesis yang jelas, lalu setel ulang ambangnya di blok model."*
   - **Situs Centurisk97** (centurisk97.id dan workers.dev): semua merek Centurisk97, login wajib di semua halaman HTML, tab Tentang hilang di semua bencana, tanpa kata WALHI di layar. pantau.terasurban.com tetap utuh.
   - **Titik panas Himawari-9 tiap 10 menit** di peta: satu suar per api, ikut tombol Satelit, tanpa tombol sendiri.
   - **Laporan konsesi terbakar 2026** dirapikan puluhan kali: tabel muat selayar, kolom gambut dan persen gambut, RSPO centang polos, logo grup, nomor urut kab/kota, PDF berkop.
   - **Lunasi 17 salinan CSS/JS** antar modul ke `public/inti/`; `gerbang-inti` kini memblokir.
   - **Rencana 20 jam kedua** (`RENCANA-20-JAM-2.md`, blok B0 sampai B4): gerbang hijau, angka gempa jujur, registry = halaman, Lapor Warga multi-bahaya, `/semua` menampilkan kejadian aktif lintas bencana, i18n EN untuk lima bencana baru.
   - **Spanduk persetujuan dinyalakan lagi** (*"nyalakan"*) supaya statistik per bencana terisi.
   - **Insiden "gas" menyapu**: perubahan yang sengaja ditahan di working tree ikut commit GitHub Desktop pemilik dan langsung terbit. Sejak itu tidak ada suntingan yang "ditahan" di tree.
8. 18 Okt 2026
   - **Overlay Lahan diringkas**: 12 tombol jadi 8 berikon, lalu Hutan (kawasan hutan 2026, tutupan lahan 2025, tutupan pohon, hutan primer, mangrove) dan Konsesi (batas izin, hutan tanaman, tambang) sebagai pil pilihan.
   - **Lapisan Kesatuan Hidrologis Gambut** (518 KHG, BRGM PRIMS WFS), nama mulai zoom 8.
   - **Cari pabrik/konsesi** dengan buffer 10/25/50 km, slider banding, timelapse GIF, persen harian di pop-up.
   - **Laporan konsesi** (`/laporan-konsesi`, hanya Centurisk97) dan **laporan harian generik** (mesin `public/inti/laporan.js`, kontrak v1).
   - **Banjir**: peluang status 3 hari dari ansambel ECMWF, rob terpisah, dampak 4 hari + jalan berisiko terputus, bukti DAS hulu untuk 16 daerah.
   - **Cuaca ekstrem**: prediksi kecamatan 72 jam, siklon, gelombang, verifikasi, simulasi, laporan harian.
   - Worker menyajikan PMTiles dari R2 (`/ubin/<nama>.pmtiles`, HTTP Range). Roster: `tests/<bencana>/**` milik pengerja modulnya.
9. 17 Okt 2026
   - **Enam bencana dibuka** (status aktif, "Segera" hilang, masuk sitemap): banjir, gempa & tsunami, letusan gunung api, kekeringan, kualitas udara, ditambah beranda `/semua`. Tiap modul lolos audit paritas terhadap karhutla (`docs/multi-bencana/PARITAS-*.md`) dan cek data ke sumber resmi (BMKG gempaterkini 15/15, MAGMA level dan radius, SPI dihitung ulang). *"Kalo misal udah selesai maka coming soon nya dihilangkan dan orang bisa akses ya."* Cuaca ekstrem menyusul hari yang sama begitu nowcast BMKG tiap 10 menit ikut menentukan `/api/status`.
   - **Modul karhutla dipasang ulang, bukan disalin**: *"modulnya yang dari karhutla kaya plug and play ya... Lu tetap berpaku pada artifacts"*, lalu *"kodingannya udah ada semua ya tiru aja semua. Biar bisa kaya mirroring gitu."* CSS bersama di `public/inti/`, kartu Insight, mesin Bagikan per bencana, pop-up Situasi `Sapa.daftar`, foto per bencana (`?bencana=`), kaki/jejak/OG dari registry. Tambahan khas bencana boleh asal beralasan.
   - **Laporan harian karhutla** (`/laporan`): titik panas dan luas terdampak per provinsi dan kab/kota, perbandingan harian, cut-off dan sumber, cetak PDF berkop provinsi, kurva musim lintas tahun dengan latar median 2019 sampai 2025.
   - **Aktor konsesi**: nama perusahaan dan grup dipulihkan; klik perusahaan membuka laci linimasa titik panas 2026. Kartu PSN Merauke dan Tokoh politik disembunyikan; WALHI tidak tampil.
   - **Data dijujurkan**: kekeringan "Awas" butuh dua bukti (SPI-3 dan tanah atau SPI-6; 154 jadi 80 kab/kota), udara berlabel "perkiraan model CAMS, belum dikoreksi", tanggal letusan MAGMA dibetulkan, gelombang cuaca hanya kelas tinggi ke atas.
   - **Peringatan dini dan NASA**: pop-up alarm di semua halaman (`public/inti/alarm.js`); lapisan GIBS sempat dipasang lalu citra satelit NASA dibuang dari Overlay karhutla, CO AIRS sebaris AQI dan Hujan.
   - **Produksi = worker `centurisk97`**: domain pantau.terasurban.com ternyata dilayani worker kedua; `wrangler.jsonc` diganti ke `centurisk97`, yang memegang domain, secret, dan cron. Worker `poskokarhutla` yatim.
   - **Tanpa branch**: *"Agar cukup main saja ya jangan ada branch."* Lalu *"gw ga mau ada branch"* saat melihat `staging`; branch itu dihapus.
   - **Insiden dan gerbangnya**: terbit gagal karena `_headers` lebih dari 100 aturan; terbit gagal karena batas 5 cron akun Workers Free (kini satu cron tiap menit); data live basi karena deploy dari laptop; git macet karena repo di iCloud Documents. *"Catat ya biar ga gagal lagi."*
10. 16 Okt 2026
   - **Jalan 20 jam**: *"Lu yang tentukan sendiri habis ini apa setelah ini apa."* Ucapan berulang dari 438 pesan dijadikan aturan A1 sampai A25 dan rencana sembilan blok di `docs/multi-bencana/RENCANA-20-JAM.md`. Push dan deploy menunggu kata pemilik.
   - **Perfeksionis**: *"Gw adalah perfeksionis sedetail itu... lu harus control freak dan lu harus review lagi kerjaan agent lu."* Laporan agent bukan bukti.
   - **Tiga keputusan copy diputus**: sapaan "kamu", em dash dilarang di teks tampil, ikon tetap SVG garis.
   - **Rencana multi-bencana dilengkapi**: `PETA.md`, `PELATIHAN-MODEL.md`, `COPYWRITING.md`, `MODUL-PLUG-AND-PLAY.md`. *"Rencana arsitektur copywriting total fitur nya gimana modul nya yang udah ada jadi plug and play. Copy coding petanya. Petanya juga tiru modelnya."*
   - **Lima buku pegangan rujukan dipasang** (`docs/buku-pegangan/rujukan/`) dan diterbitkan sebagai artifact. Buku ini lahir meniru bentuknya: *"Iya lu tiru ya dari situ."*
11. 15 Okt 2026
   - **Semua bencana meniru karhutla, rinci dan exhaustive**: *"Gw mau yang bencana lain tiru best practice dan secara rinci semua fitur dan bagian yang dari Karhutla."*
   - **Foto lapangan**: 100 foto dummy karhutla, unik semua. Label waktu dan ikon kategori duduk DI DALAM foto; *"Gausah ada nomor ini de."* Upvote, bukan ikon hati; koordinat GPS tampil di pop-up.
   - **Nama provinsi di peta**: rounded rectangle, cukup besar. *"Bro coba agak besarin dikit dong yang nama provinsinya soalnya ga keliatan sumpah."*
   - Admin masuk pakai email dan kata sandi. Mobile 640 px ke bawah: tab pindah ke menu garis tiga.
12. 14 Okt 2026
    - **Daftar "yang disembunyikan" wajib dicatat**, karena pemilik bisa meminta daftarnya dan memulihkan sebagian.
    - **Bahasa konsesi netral**: "titik panas berada di dalam areal konsesi", tidak pernah menuduh siapa yang membakar.
    - Halaman Tentang bergaya editorial berfoto. Lapisan Angin dikembalikan NYALA.
13. 13 Okt 2026
    - **Semua halaman memakai format kartu Insight**. *"jelek banget"* untuk catatan teks polos, `<select>` bawaan, dan singkatan "rb" dalam perbandingan.
    - **"9 provinsi prioritas" dilarang**; tulis "provinsi yang sering mengalami karhutla".
14. 12 Okt 2026
    - Repo lahir: situs statis Cloudflare, tab Insight, mode peta, kalender bahaya, pembaruan data harian 21.20 WIB.

## Keputusan pemilik

### Diputus

| Keputusan | Tanggal | Bunyinya |
| --- | --- | --- |
| Cut off laporan harian 12.00, laporan karhutla 15.00 | 24 Okt 2026 | Laporan Kejadian Bencana Harian dipotong pukul 12.00 WIB dan Laporan Penanganan Pengendalian Karhutla pukul 15.00 WIB; kolom terakhir = hari laporan itu sendiri, angka sementara sampai jam cut off. Data lapangan ditempel apa adanya dari WA, generator `data/laporan-bnpb/generator/` yang mengurai |
| Laporan harian 4 slide lagi | 24 Okt 2026 | Sampul dan penutup dipasang kembali (*"tetap kasih cover dan penutup"*); batang status cukup selesai dan belum selesai |
| Status karhutla ikut sisa website | 24 Okt 2026 | 0 ha selesai; ≥10 ha dalam penanganan walau BPBD melapor padam; <10 ha selesai kecuali BPBD melapor belum padam |
| Perlu perhatian semua jenis | 24 Okt 2026 | Karhutla sisa ≥100 ha atau BPBD belum padam, ditambah kejadian lain yang dilapor belum tertangani; daftar panel status hanya yang perlu perhatian |
| Tally sama di seluruh deck | 24 Okt 2026 | Batang status per jenis (selesai, karhutla, lainnya); angka karhutla di batang = judul = tabel |
| Provinsi Prioritas website wajib masuk laporan harian | 24 Okt 2026 | Provinsi dengan cluster level 3 ditambahkan bila tidak ada di laporan Koordalops |
| Ruang kosong di dalam kontainer dipadatkan | 24 Okt 2026 | Panel setinggi isinya; berlaku di semua deck |
| Catatan kaki slide hanya kalimat standar | 24 Okt 2026 | "*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS)." tanpa tambahan |
| Istilah cluster | 24 Okt 2026 | Di slide ditulis "cluster" seperti aplikasi, bukan "kompleks"; label cluster tanpa "24 jam"; grafik tanpa label "data satelit" |
| Cut off hari berjalan | 24 Okt 2026 | Bila pemilik memberi jam cut off, hari itu masuk sebagai angka sementara sampai jam tersebut |
| Tanpa pertanyaan lagi ke pemilik untuk dua kajian | 23 Okt 2026 | Pertanyaan terbuka diputus sebagai bawaan orkestrator (`KEPUTUSAN.md` T1–T13) sampai pemilik membaliknya (`KEPUTUSAN.md`, kepala tabel bawaan). Bawaannya tercatat di [Belum diputus](#belum-diputus) |
| Deck meniru deck konsultan kelas dunia | 23 Okt 2026 | Pola yang divonis cocok di `data/kajian-bnpb/riset/desain-benchmark/deck/SINTESIS-DECK.md` dipakai di deck kajian; aturan pemilik yang tertulis menang bila bentrok (`KEPUTUSAN.md` P16). Vonis per pola adalah hasil bedah, bukan kata pemilik |
| Penerbit dan pembaca kajian | 23 Okt 2026 | Penerbit BNPB saja; tanpa tim penyusun dan tanpa memo Presiden; pembaca utama Kepala BNPB (`KEPUTUSAN.md` P1) |
| Judul dua kajian | 23 Okt 2026 | Grand Design Ketahanan Air Pulau Jawa 2026–2030; Grand Design Mitigasi Bencana Indonesia 2026–2030 (`KEPUTUSAN.md` P2) |
| Kajian air berlensa risiko BNPB | 23 Okt 2026 | Pola dan Rencana PSDA Kementerian PU dirujuk, tidak ditandingi (`KEPUTUSAN.md` P3) |
| Horizon kajian 2026–2030 | 23 Okt 2026 | Lima tahun; peta jalan 100 hari, 2026–2027, 2028–2030 (`KEPUTUSAN.md` P4) |
| Kajian tanpa pagu dan biaya proyek | 23 Okt 2026 | Pembiayaan cukup arsitektur sumber dana (`KEPUTUSAN.md` P5) |
| Program kajian hanya yang terbukti | 23 Okt 2026 | Tiap program disertai dampak terukur dan sumbernya (`KEPUTUSAN.md` P6) |
| Status usulan tiga kelas | 23 Okt 2026 | Sudah ada; Sudah ada, perlu dikembangkan; Usulan baru (`KEPUTUSAN.md` P7) |
| Rekomendasi kajian berlembaga | 23 Okt 2026 | Dipetakan ke unit BNPB dari korpus JDIH lokal dan ke K/L bernomenklatur terkini (`KEPUTUSAN.md` P8) |
| IRBI rujukan utama kajian | 23 Okt 2026 | Indeks dan simulasi platform pendukung, berlabel (`KEPUTUSAN.md` P9) |
| Skenario terburuk per jenis bencana | 23 Okt 2026 | Korban jiwa, luas terdampak, kerugian materiil dan imateriil, dengan analisis kepekaan (`KEPUTUSAN.md` P10) |
| Cakupan nonalam dan sosial | 23 Okt 2026 | Nonalam: pandemi, kebakaran industri, kebakaran TPA. Sosial: kerusuhan dan konflik (`KEPUTUSAN.md` P11) |
| DOCX kajian | 23 Okt 2026 | A4 tegak, Roboto, logo BNPB, foto Wikimedia Commons beratribusi, tanpa ilustrasi AI (`KEPUTUSAN.md` P12) |
| Keluaran kajian 8 berkas | 23 Okt 2026 | Per kajian DOCX dan PDF-nya, PPTX dan PDF-nya; jumlah halaman PDF sama dengan dokumen asal (`KEPUTUSAN.md` P13). PDF ringkas tidak dibuat lagi (tersirat dari P13: delapan berkas tanpa PDF ringkas) |
| Deck kajian ±12 slide isi | 23 Okt 2026 | Gaya rumah BNPB bab Selera presentasi, ditambah lampiran (`KEPUTUSAN.md` P14) |
| Peta kajian dari simulasi web | 23 Okt 2026 | Disimulasikan di web lalu dirender untuk dokumen (`KEPUTUSAN.md` P15) |
| Kajian tanpa perlengkapan paparan tambahan | 23 Okt 2026 | Tanpa tata naskah dinas khusus, simulasi tanya-jawab, lembar persiapan, dan paket telaah K/L (`KEPUTUSAN.md` P17) |
| Laporan meniru laporan kelas dunia | 23 Okt 2026 | Pola yang divonis cocok di `data/kajian-bnpb/riset/desain-benchmark/SINTESIS.md` dipakai di DOCX dan PDF kajian; aturan pemilik yang tertulis menang bila bentrok (`KEPUTUSAN.md` P16) |
| Laporan harian 2 slide | 23 Okt 2026 | Tanpa sampul dan tanpa penutup; nomor halaman 1 dan 2; dikirim PPTX dan PDF |
| Karhutla sisa 0 ha = selesai | 23 Okt 2026 | Sisa belum padam website 0 ha memindahkan karhutla ke selesai walau laporan lapangan belum menutupnya |
| Perlu perhatian = sisa ≥100 ha atau BPBD belum padam | 23 Okt 2026 | Kartu PERLU PERHATIAN, tanda ! peta, dan garis merah provinsi memakai satu aturan; sisa kecil tetap dalam penanganan tanpa tanda ! |
| Bencana lainnya per jenis berikon | 23 Okt 2026 | Slide 3 laporan harian memasang satu bagian per jenis (gempa bumi, kebakaran TPA, banjir, dan seterusnya) dengan ikon dan warna berbeda; tabel kekeringan ditutup baris TOTAL berikon |
| Format laporan harian = deck 221026 | 23 Okt 2026 | 4 slide mengikuti deck 221026 (periode 21–22 Okt), menggantikan acuan 18–19 Okt dari 21 Okt; deck 18–19 Okt jadi penunjuk data yang boleh masuk dan pola panel Bencana lainnya |
| Satu gaya rumah deck | 23 Okt 2026 | Kerangka BNPB (Roboto, PUTIH/GELAP, garis, logo, footer) di semua deck; deck lain hanya sumber isi |
| Data karhutla di deck dari website | 23 Okt 2026 | Hotspot dari tabel Real Time, luas terbakar dan belum padam dari lapisan peta website; fakta lapangan dari laporan BPBD atau Koordalops |
| Judul slide paling banyak dua baris | 23 Okt 2026 | Huruf dikecilkan, tidak dibungkus ke baris ketiga |
| Pil CUT OFF DATA di slide data | 23 Okt 2026 | Navy di kanan atas, tanggal dan jam WIB tarikan data |
| Peta deck berlatar putih | 23 Okt 2026 | Tanpa laut biru, tanpa label atau bulatan bertumpuk, legenda wajib, jumlah sama dengan app |
| Grafik batang harian model laporan harian | 23 Okt 2026 | Nilai di atas, tanggal dan % di bawah, naik ▲ oranye D9600B, turun ▼ biru 2F86D1, batang pertama abu, tiga terakhir pekat |
| Satu topik satu kontainer | 23 Okt 2026 | Tanpa panel gelap di samping; isinya digabung ke panel putih |
| Ikon, bukan logo lembaga | 23 Okt 2026 | Kepala tabel, kartu angka, dan chip penanggung jawab berikon garis |
| Keterangan jadi label | 23 Okt 2026 | Chip pendek, bukan kalimat; teks hiasan dan baris sumber di bawah grafik dibuang |
| Tugas api otomatis | 22 Okt 2026 | Level 3 dan level 2 bersyarat (permukiman, konsesi, tumbuh); insiden Himawari ke Posko pusat saja sampai VIIRS mengonfirmasi |
| Server rute berbayar boleh | 22 Okt 2026 | Bila graf jalan sendiri tidak cukup |
| Surat akses data | 22 Okt 2026 | Surat ke BRGM (TMAT), SiPongi, Daops jalan; draf `docs/bnpb/SURAT-AKSES-DATA.md` |
| Program lanjut api padam | 22 Okt 2026 | Disetujui, termasuk dashboard kinerja/SLA dan email di samping push |
| Pengembangan karhutla ke semua bencana | 22 Okt 2026 | Tugas, kartu, operasi, push, SLA, laporan harian, paparan berlaku per bencana |
| Panel presiden publik | 22 Okt 2026 | Tanpa sesi, agregat saja, boleh di-iframe; nama perusahaan boleh, WALHI tidak; kartu basi diredupkan; tanpa widget peringatan BMKG |
| Domain centurisk97.id | 22 Okt 2026 | pantau.terasurban.com sengaja dilepas; canonical/og meta tidak diganti sampai pemilik bilang |
| "perkiraan satelit" dilarang | 22 Okt 2026 | Slide memakai "hitungan satelit"; pop-up kab "Bukan luas resmi." |
| The TreeMap 2024 di laporan konsesi | 22 Okt 2026 | Boleh terbit dengan atribusi dan lisensi CC BY-NC tampil |
| Lampu malam ditahan | 22 Okt 2026 | Tidak dilanjutkan walau token Earthdata ada; berkasnya boleh tinggal karena tidak dipanggil siapa pun |
| Ruang Instansi wajib lengkap | 21 Okt 2026 | Sepuluh butir di memori `ruang-instansi` dicocokkan sebelum menyatakan selesai; migrasi produksi tetap oleh pemilik |
| Titik tengah dilarang | 20 Okt 2026 | Tidak ada " · " di teks tampil, slide, pil, laporan. Koma, label sendiri, atau baris baru |
| Semua bencana di menu | 20 Okt 2026 | Label "Soon" dicabut; ketujuh bencana bisa dipilih |
| Bahasa lugas | 19 Okt 2026 | Judul = fakta + angka + sumber; tanpa personifikasi, slogan, kontras retoris, tiga-serangkai |
| Kekeringan tampil berpil hipotesis | 19 Okt 2026 | Angka jiwa dan posko tidak disembunyikan; pil dicabut hanya bila uji balik berbagi waktu lulus |
| Ruang Koordinasi di balik `/bnpb` | 19 Okt 2026 | Tidak ditautkan dari nav utama; di admin satu menu "Ruang Koordinasi" |
| M8 pengungsi dicoret | 19 Okt 2026 | Tidak dibangun; rancangannya di `docs/bnpb/RENCANA-12-JAM.md` §S7 |
| Situs Centurisk97 terpisah merek | 19 Okt 2026 | centurisk97.id dan workers.dev: merek Centurisk97, login wajib, tanpa Tentang, tanpa kata WALHI |
| Spanduk persetujuan nyala | 19 Okt 2026 | Supaya statistik per bencana terisi |
| Produksi = worker `centurisk97` | 17 Okt 2026 | Domain tidak pernah dipindah ke `poskokarhutla` |
| Hanya branch main, tanpa worktree, tanpa staging | 17 Okt 2026 | Agent bekerja langsung di main, satu per satu bila berkasnya bersinggungan |
| Nama perusahaan konsesi tampil | 17 Okt 2026 | Nama dan grup tampil; nomor izin dan kasus sanksi tetap tidak |
| WALHI tidak tampil | 17 Okt 2026 | Tanpa kolom, angka, atau sumber WALHI di layar; data mentah tetap di JSON |
| Modul bencana lain meniru kode karhutla (plug and play) | 17 Okt 2026 | Bagian yang sudah ada dipakai ulang lewat registry, tidak disalin; tambahan khas bencana boleh dengan alasan |
| Bencana dibuka bertahap | 17 Okt 2026 | uji = halaman jadi; aktif = lolos audit paritas + cek data |
| Sapaan pembaca "kamu" | 16 Okt 2026 | Semua teks yang menyapa memakai "kamu" |
| Em dash dilarang di teks tampil | 16 Okt 2026 | En dash tetap untuk rentang dan angka kosong |
| Ikon SVG garis | 16 Okt 2026 | Seragam dengan karhutla, bukan emoji dalam lingkaran |
| Peta sesar Pusgen 2017 boleh dipakai | 16 Okt 2026 | Lapisan sesar aktif masuk peta gempa |
| Notifikasi peringatan dini lewat email | 16 Okt 2026 | Bukan Web Push; langganan email per wilayah dengan konfirmasi dan berhenti langganan |
| Bencana yang selesai langsung dibuka | 16 Okt 2026 | "Segera" hilang dari menu, halaman bisa diakses publik |
| Kendali mutu | 16 Okt 2026 | Diff agent dibaca sendiri, layar dicek 1440 dan 390, gerbang dijalankan, verifier konteks bersih untuk perubahan berarti |
| Semua bencana meniru karhutla | 15 Okt 2026 | Tiap bencana dinilai dengan paket 113 komponen karhutla |
| Satu situs, satu registry | 15 Okt 2026 | `public/bencana.json` sumber tunggal; karhutla tetap di `/` |
| Kartu Insight di semua halaman | 13 Okt 2026 | Pil kategori + satu kalimat temuan berangka merah + kontrol segmen, grafik, kaki legenda + "Sumber:" |
| Disembunyikan, bukan dihapus | 14 Okt 2026 | Tiap "hilangkan" dicatat berikut berkas dan cara memulihkannya |
| Konsesi netral | 14 Okt 2026 | Tidak ada tuduhan pembakar |
| Foto: label di dalam foto | 15 Okt 2026 | Ikon kategori dan waktu relatif di dalam foto; tanpa nomor urut |
| Upvote, bukan love | 15 Okt 2026 | Dukungan foto warga = tombol Upvote |
| Bahasa bawaan Indonesia | 15 Okt 2026 | Pilihan bahasa di `sessionStorage`; kunjungan baru selalu ID |
| Lapisan Foto mulai mati, Angin mulai nyala | 14 sampai 15 Okt 2026 | Foto tidak diingat di `localStorage` |
| Data dummy di tiap website | aturan global | Dua ikon, Super Admin saja, isinya ditentukan halaman yang sedang dibuka (`~/.claude/DUMMY.md`) |
| Armada agent sejak hari pertama | aturan global | Roster, model tertulis, ilmu per agent, `AGENTS.md` (`~/.claude/AGEN.md`) |

### Belum diputus

| Pertanyaan | Usulan | Rujukan |
| --- | --- | --- |
| `/kabar` dibuka publik | Tambah ke `PUBLIK_TANPA_SESI` bila disetujui; kini di balik login | `docs/bnpb/PROGRAM-15-JAM.md` |
| `/data/tugas_kompleks.json` publik dan memuat nama pemegang konsesi | Dibatasi atau dibiarkan | memori `program-15-jam` |
| Angka kebijakan tugas lintas bencana | `JIWA_MIN` 1000, `UMUR_KAJI_CEPAT_JAM` 72, `LAPORAN_MUNDUR_HARI` 14 | `scripts/umum/tugas.py`, `src/tugas_bencana.js` |
| Radius permukiman tugas dan nama perusahaan di tugas | Bawaan 5 km dan tampil | `RANCANGAN-API-PADAM.md` |
| Target SLA | Kini vonis hanya konfirmasi 6 jam dan kabar 24 jam | `RENCANA-LANJUT.md` |
| CSP dan daftar iframe panel presiden | Belum diputus | `docs/presiden/KONTRAK.md` |
| Kapan `/bnpb` masuk nav utama | Sesudah migrasi 0022 sampai 0028 diterapkan dan uji layar hijau di produksi | `docs/bnpb/STATUS.md` |
| Daftar 21 Kodam untuk akun instansi | Dicek pemilik sebelum akun massal dibagikan | memori `ruang-instansi` |
| Nama jenis bencana gaya DIBI di ekspor Meja | Dicocokkan pemilik ke istilah DIBI resmi | `/api/meja/ekspor` |
| Turnstile relawan dan alun-alun | Isi sitekey begitu form mulai diserbu spam | `wrangler.jsonc` |
| Ambang kekeringan baru | Opus merancang, `gunungapi-kering` mengerjakan, `validasi-model` memeriksa | `RENCANA-20-JAM-2.md` blok B3b |
| Keputusan arsitektur multi-bencana yang menunggu | Daftarnya di akhir `ARSITEKTUR.md` | `docs/multi-bencana/ARSITEKTUR.md` |
| Bawaan orkestrator kajian BNPB (T1–T13, U1–U7) | Berlaku sampai dibalik pemilik: judul bab kapital (T1), arah peta web (T2), peta web di `public/kajian/` (T3), kaki halaman (T4), batas halaman (T5), palet enam keluarga (T6), Kata Pengantar (T7), kelas IRBI oranye (T8), Daftar Pustaka di luar batas halaman (T9), ejaan fase (T10), judul slide (T11), kode bagian (T12), pembatas GELAP (T13), dan U1–U7 | `data/kajian-bnpb/KEPUTUSAN.md`, `PEDOMAN-DESAIN.md` §0.2 |
| T11 menyimpang dari vonis "Judul deskriptif menang atas judul data" | Slide temuan deck kajian berjudul kalimat temuan berangka; berlaku sampai pemilik memutus. Bila dibalik: judul deskriptif, angka pindah ke kartu angka (S8) | `KEPUTUSAN.md` T11, [S7](#pola-deck-konsultan-kelas-dunia-mckinsey-bcg-big-four) |
| Kode bagian deck berhuruf (T12) dan kode lampiran "L1." (U5) | Huruf bagian A–E berbeda arti dengan "Temuan A.1" DOCX (pertanyaan pimpinan A–C), dan "L1." bisa terbaca sebagai aturan L1 buku ini. Bawaan: tetap huruf, kode DOCX selalu ditulis lengkap "Temuan A.1". Alternatif: bagian bernomor "1. ", "2. " dan lampiran kembali "A1. " pola d9 | `KEPUTUSAN.md` T12, `PEDOMAN-DESAIN.md` U5, S10, S33 |
| Isi pil CUT OFF deck kajian | Keputusan 23 Okt: tanggal dan jam WIB tarikan data. Bawaan S16: satu batas data lintas paket bertanggal dan berjam dari satu kunci; tanggal tarik per paket di lampiran metode | S16 |
| Tanpa putaran tinjauan pemilik (`PEDOMAN-DESAIN.md` K18) | Bawaan dari "tidak ada pertanyaan lagi"; penyunting independen menggantikan persetujuan pemilik atas grand design dan halaman contoh. Kata Pengantar satu-satunya bagian yang ditandai untuk pemilik (T7) | `PEDOMAN-DESAIN.md` K18, §D3 |

## Stack & peta repo

| Lapis | Isinya |
| --- | --- |
| Layar | Vanilla JS tanpa build step di `public/`, MapLibre 4.7.1 dari cdnjs, satu `.js` + satu `.css` per modul; komponen bersama di `public/inti/` (kepala, kartu, insight, tabel, tip, pilih, peluang, laporan, alarm, sapa, video, peringatan-berita, `nanti.js`) |
| Worker | Cloudflare Worker `centurisk97` + D1 `poskowarga` + R2 (`src/**`, `migrations/**`): warga, foto, moderasi, `/api/titik` FIRMS, Himawari, nowcast, EWS email, PMTiles, Ruang Koordinasi, Ruang Instansi |
| Jadwal worker | Satu cron `* * * * *` (batas 5 jadwal akun Free); tugas dipilih dari menit: FIRMS ke D1 menit 15 tiap 3 jam UTC, bersih-bersih menit 17, pemantauan MAGMA tiap 30 menit, arsip sitrep 07 WIB, pengingat 07.40 WIB |
| Pipeline | Python 3.12 stdlib di GitHub Actions; JSON di-commit ke `public/data/` dan `public/<bencana>/data/` |
| Workflow | `data.yml` harian, `titik.yml` 3 jam, `statis.yml`, `banjir.yml`, `gempa.yml`, `udara.yml` (OMC dirantai di sini), `himawari.yml`, `lintas.yml` (cuaca, gunung api, kekeringan, indeks risiko, kebutuhan musim), `bangunan.yml`, `jaga.yml`, `terbit.yml` |
| Terbit | Cloudflare static assets (`assets.directory ./public`); seluruh isi `public/` ikut terbit, jadi tidak ada kunci, berkas kerja, atau data pribadi di sana. `_headers` paling banyak 100 aturan (kini 37 sesudah digabung per pola) |
| D1 | Migrasi 0001 sampai 0049; produksi sudah sampai 0049 per 22 Okt. Migrasi yang sudah diterapkan tidak pernah disunting: uji lokal memakai versi repo dan tidak melihat bedanya |

Peta modul dan pengerjanya ada di `AGENTS.md` §2. Repo di `~/Documents` disinkron iCloud: stage path eksplisit saja, salinan `* 2.*` yang muncul sendiri dihapus, git jaringan dibungkus batas waktu.

## Situs per alamat

Satu worker, tiga wajah. Merek dipilih dari nama host.

| Alamat | Wajah |
| --- | --- |
| centurisk97.id | Situs produksi sejak 22 Okt: merek Centurisk 97, semua halaman HTML wajib masuk admin (JSON/JS/CSS publik), tanpa Tentang, tanpa kata WALHI; laporan konsesi hanya di sini; `/presiden` terbuka tanpa sesi |
| pantau.terasurban.com | Sengaja dilepas 22 Okt (NXDOMAIN); jangan dipulihkan. Canonical dan og meta masih menyebutnya sampai pemilik memutus |
| *.workers.dev | Sama dengan centurisk97.id, tanpa Chat Admin |

Pulihkan Tentang di Centurisk97: hapus aturan `html[data-situs=w]` di `public/inti/kepala.css` dan alihan `tt` di `src/worker.js`.

## Halaman & rute

| Kelompok | Rute |
| --- | --- |
| Bencana | `/` karhutla, `/banjir/`, `/gempa/`, `/cuaca/`, `/udara/`, `/gunungapi/`, `/kekeringan/`, `/semua` |
| Tab per bencana | Insight, Peta, Tren, Berita, Dampak, Foto, Simulasi, Metode, Tentang menurut `tab` di registry; kejadian berkode `/banjir/k/B####`, kode generik C cuaca, U udara, V gunung api, D kekeringan |
| Laporan | `/laporan` harian karhutla, `/laporan-konsesi` (Centurisk97), `/laporan-bnpb` konpers dan Koordalops, `/paparan`, `/presiden` panel dan feed `/data/presiden/*`, `/kabar` per kabupaten (di balik login) |
| Warga | `/warga` Lapor Warga multi-bahaya, `/peringatan` langganan email, `/foto`, `/statistik` |
| Ruang Koordinasi | `/bnpb`, `/relawan`, `/kampus`, `/alun-alun`, `/riset`, `/risiko`, `/sitrep`, `/kebutuhan`, `/meja`, `/bnpb/kebakaran` |
| Ruang Instansi | `/instansi`, `/lapangan`, `/lacak#token` |
| Admin | `/admin`, `/admin/relawan`, `/admin/alun`, `/admin/riset`, `/admin/meja`, `/admin/pimpinan`, `/admin/pengingat`, `/admin/gakkum` |
| Simulasi | `/sim?titik=bromo` atau `lat,lon`, langsung menghitung dan membuka 3D |

Rute yang ada di nav wajib ada di `tab` registry; rute yatim membuat terbit merah.

## Selera tampilan

Aturan A1 sampai A25 (`docs/multi-bencana/RENCANA-20-JAM.md` §1) dipindai sebelum tiap perubahan layar. Arah sejak 13 Okt: kurangi dan satukan, bukan tambah.

### Kartu Insight

- Pil kategori (`Insight.LABEL`) + judul SATU kalimat temuan dengan angka merah (`Insight.hl`) + kontrol segmen, pemilih provinsi di kanan judul.
- Kaki kartu: legenda di tengah + `Sumber: …` miring (`Insight.ex`).
- **Dilarang**: subjudul atau baris satuan, paragraf catatan, kotak KPI berkepala navy. Angkanya dilebur ke judul kartu.
- Angka di ujung batang dan kolom tabel jadi pil (sering berikon); tiap bar chart menampilkan total di atas batang; garis rata-rata berpil navy "rata-rata"; nilai kecil tetap tertulis.
- Kartu peluang (`public/inti/peluang.js`): judul = vonis, satu batang per hari, nilai kecil "<1%", tidak pernah "100%"; batasan hanya di bab Metode.

### Tooltip

- Pita judul + kolom label/nilai (`rapikanTip`). Naik ▲ merah, turun ▼ hijau. Tidak ada tanggal ISO mentah. Tidak ada `cursor:help`.

### Tabel

- Kepala gelap tulisan putih, bisa diurutkan, sudut atas membulat, dipaginasi (`paginasi()`).
- Nol sel dua baris; info sekunder jadi kolom sendiri, huruf lebih kecil. Kolom teks rata kiri.
- Judul artikel di tabel = tautan. `<select>` bawaan diganti `PilihCantik`.

### Peta

- Panel Overlay = ubin ikon ala Windy, satu baris per kategori, latar putih; Lahan diringkas jadi pil Hutan dan Konsesi.
- Nama provinsi di rounded rectangle, cukup besar untuk terbaca. Legenda panjang bergulir; kartu cari jadi lembar bawah di HP.
- `peta.setStyle` selalu `{diff: false}`; `Peta.init` menunggu `style.load`. Cetak biru: `docs/multi-bencana/PETA.md`.

### Header dan menu

- Tab rata tengah, ikon tampil di desktop; di bawah 1280 px tab pindah ke menu garis tiga.
- HP 640 px ke bawah: pilihan bencana dan tombol tema disembunyikan.

### Foto lapangan

- Kategori dan waktu relatif di dalam foto; label putih di atas latar sorot; tanpa nomor.
- Pop-up lebar, koordinat GPS tampil, Upvote, tombol tutup merah berikon putih di kanan atas.

### Interaksi

- Klik tidak boleh membekukan layar. Chrome kontrol (pil aktif, `aria-pressed`) di-set langsung, kerja berat lewat `nanti()` sesudah frame tercat. Membungkus seluruh setState dalam transisi bukan obatnya (`~/.claude/INP.md`).
- Simulasi asap dan genangan dihitung di Web Worker.

### Lebar dan ruang

- Lebar penuh, tanpa ruang putih kosong; semua di dalam kontainer + kartu. Tanpa latar abu gelap. Pop-up lebar dan interaktif. Bagikan = ikon saja.

## Angka & copy

- `fmt` id-ID: titik ribuan, koma desimal, paling banyak 1 desimal; "–" bila kosong. `toFixed` mentah dilarang di teks tampil. Persen ribuan juga bertitik (+1.244%).
- Satuan selalu tertulis. "rb"/"jt" cuma di label sempit; kalimat memakai "ribu/juta"; rupiah besar dalam miliar.
- Tiap angka punya sumber dan waktu; "hari ini/kemarin" menurut hari WIB data. Sumber tanpa path internal.
- Probabilitas dibulatkan kasar atau jadi kelas; skor dan regu bulat; luas terbakar dibulatkan sesuai resolusi piksel. Angka kinerja model dibaca dari JSON uji, tidak diketik tangan.
- Sapaan "kamu". Em dash dilarang; en dash untuk rentang. **Titik tengah " · " dilarang**: pakai koma, label sendiri, atau baris baru. Ikon SVG garis.
- Suara: polos, faktual, satu baris satu temuan, angka di depan, tanpa emoji. Judul = fakta + angka + sumber; label = kata benda polos. Tanpa personifikasi, slogan, kontras "X bukan Y", "mulai besok", tiga-serangkai, kalimat penutup bergaya. Pola lengkap: `docs/multi-bencana/COPYWRITING.md`.
- Tidak pernah menulis "perkiraan satelit"; luas dari satelit = "hitungan satelit", dan pop-up kab menambah "Bukan luas resmi."
- Panel presiden: estimasi model dibulatkan ("sekitar"), hitungan titik panas tetap persis, tiap judul membawa tanggal data, kartu basi diredupkan.
- Frasa wilayah: "provinsi yang sering mengalami karhutla", tidak pernah "9 provinsi prioritas". "Titik panas", bukan "titik api", untuk data satelit.
- Angka yang belum lulus uji balik tampil dengan pil "hipotesis" atau label "belum diuji balik", tidak disembunyikan diam-diam dan tidak dijual sebagai pasti.
- **Anti-slop di naskah dan deck kajian BNPB.** Keduanya diperiksa dengan `data/kajian-bnpb/ANTI-SLOP.md` (detektor `qa/slop.py`) dan ambang terukur dari skill pemilik `anti-ai-checker` (`data/kajian-bnpb/TAMBAHAN-ANTI-AI.md`). Em dash nol. Titik dua paling banyak 20 per 1.500 kata di paragraf isi; label tabel, keterangan gambar, dan "Sumber:" tidak dihitung. Hedging paling banyak 2 per 1.500 kata, antara lain "perlu dicatat bahwa", "dapat dikatakan bahwa", "tampaknya", dan "cenderung" tanpa data. Tiga-serangkai gaya: nol. Di DOCX, daftar tiga yang faktual (nama diri atau angka) tidak dihitung; di deck tidak ada pengecualian (`ANTI-SLOP.md`). Pembuka klise dipindai di 50 kata pertama tiap bab dan tiap subbab, karena pimpinan membaca subbab terpisah, antara lain "Di era", "Dalam lanskap", "Tidak dapat dipungkiri", dan "Dalam rangka". Daftar lengkap hedging dan pembuka klise ada di `PEDOMAN-DESAIN.md` §D4. Vonis per bab: nol pelanggaran LULUS, 1–2 GAGAL RINGAN (ditulis ulang penyunting), 3 atau lebih GAGAL BERAT (kembali ke penulis, ditulis ulang, dipindai ulang). Aturan proses orkestrator, karena hasil diserahkan tanpa putaran tinjauan pemilik (bawaan, lihat [Belum diputus](#belum-diputus)): GAGAL RINGAN tidak diterima apa adanya, semua bab wajib LULUS pindaian ini dan QA lima lapis ([L68](#produksi-naskah-dan-qa-lima-lapis-skill-pemilik-book-production-rules)) sebelum diserahkan, dan laporannya ditulis ke `keluaran/qa/slop-<kajian>.md`. Kata terlarang khas AI mengikuti daftar pemilik `data/kajian-bnpb/riset/anti-slop/banned-ai-words.txt` (182 baris) untuk teks Inggris. Padanan Indonesianya baru sebagian ada di `ANTI-SLOP.md` S-12; mulus, menavigasi, mendalami, menyelami, memulai perjalanan, memupuk, mendayagunakan, dan kokoh belum masuk. **Belum jadi menurut standar uji pemilik:** ambang titik dua, hedging, tiga-serangkai, vonis tiga tingkat, dan `banned-ai-words.txt` belum dibaca gerbang mana pun. `qa/slop.py` S-18 baru menandai tiga-serangkai beruntun atau lebih dari 6 per 1.000 kata, jadi sampai gerbangnya dibangun pemeriksaan ambang ini manual.

## Selera presentasi (PPT)

Dari 9 deck tanggal 18 sampai 23 Okt dan koreksi pemilik saat deck itu dibuat. Ukuran diambil dari XML pptx dalam pt (slide 960×540 pt, 1 in = 72 pt, 1 pt = 12.700 EMU), jadi render 72 dpi memberi 1 px = 1 pt. Aturan yang sudah ada di [Angka & copy](#angka--copy) berlaku penuh di slide dan tidak diulang di sini: tanpa " · ", tanpa em dash, bahasa lugas, "hitungan satelit", format angka id-ID, dan "titik panas" untuk data satelit. Aturan rinci deck Penanganan varian satelit (urutan kolom, metode 48 jam, kalimat bawah judul) ada di `docs/audit-metode/2026-10-21/pedoman-deck-gabung.md`.

### Deck acuan

| Kode | Deck | Perannya |
| --- | --- | --- |
| d3 | Laporan Kejadian Bencana Harian 221026 (periode 21–22 Okt) | **Format terakhir laporan harian.** *"Ini format terakhirnya yang kemarin"* |
| d1 | Laporan Kejadian Bencana Harian 18–19 Okt | Contoh data lapangan yang boleh masuk, dan acuan panel Bencana lainnya per jenis. Tata letak lainnya sudah diganti d3 |
| d2, d4 | Laporan Kejadian Bencana Harian 20–21 Okt dan draf pertama 231026 | Hasil generator `/laporan-bnpb` dengan gaya lama. Contoh cacat, jangan ditiru. Versi akhir 231026 dibangun ulang dari d3 |
| d5 | Paparan Karhutla Jawa Timur, Malang, Arjuno 221026 | **Acuan paparan wilayah**, sudah dikoreksi pemilik berkali-kali |
| d6, d8, d7 | Laporan Penanganan Pengendalian Karhutla 221026 (satelit), 211026, 211026 Lengkap | Templat BNPB. d8 sama persis dengan d7 slide 1–3 |
| d9 | Paparan Kepala BNPB kepada Presiden 20 Okt, Lengkap | Satu-satunya acuan deck Presiden |

Nama berkas memakai pola `<Judul deck> DDMMYY`, dengan DDMMYY = tanggal paparan.

### Prinsip

- **Hanya ada satu gaya rumah.** Kerangka BNPB berlaku untuk semua deck. Deck dari pihak lain dipakai sebagai sumber isi saja: *"Gayanya tetap pakai gini cuma yang Kalteng itu untuk referensi tambahan informasi"*.
- **Deck lama yang ditunjuk pemilik yang disalin, bukan generator.** d4 dibuat dengan generator `/laporan-bnpb` (`public/laporan_bnpb_slide.js`, palet `C` di baris 9), sehingga hasilnya gaya d2. Selama generator itu belum disesuaikan, laporan harian dibangun mengikuti d3 dengan pembangun di `data/laporan-bnpb/harian-2026-10-23/` (langkahnya di README).
- **Padat tapi tetap bernapas.** Satu slide berisi 3–4 blok (grup angka, 2–3 panel, pita bawah), 180–290 kata, dan mengisi y≈101–500. Tidak ada isi yang menempel ke tepi panel: *"Jangan ada yang nempel ke bawah gitu"*.
- **Satu topik, satu kontainer**: *"JANGAN DIPISAHIN DONG CONTAINERNYA KAN SAMA"*. Panel gelap di samping tidak dipakai; isinya digabung ke panel putih.
- **Pakai label, bukan kalimat.** Keterangan ditulis sebagai chip pendek (*"Ini keterangan dibuat label aja"*). Setiap panel punya kepala (*"Kasih header"*), setiap peringkat punya nomor, setiap penanda punya nama, setiap warna dan bulatan punya legenda.
- **Teks yang tidak membawa informasi dibuang.** Daftar yang sudah dihapus ada di bawah.
- **Semua yang bisa disunting dibuat native**: teks, pil, tabel, penanda dan label peta. Gambar hanya untuk foto, logo, peta dasar, dan ikon.

### Kerangka halaman (semua slide isi)

| Unsur | Ukuran |
| --- | --- |
| Layout | PUTIH (FFFFFF) untuk isi, GELAP (051C2C) untuk penutup, pembatas Lampiran, dan pembatas bab deck kajian bila dipakai (`KEPUTUSAN.md` T13). Tanpa persegi putih full-bleed |
| Margin | Kiri 43,2 pt, tepi kanan isi 916,8 pt, lebar isi 873,6 pt |
| Kotak judul | x43,2 y21,6, tinggi 47,5–65 pt, anchor bawah, inset 0. Lebar 823 pt, atau 644 pt bila ada pil CUT OFF |
| Garis | 0,75 pt 1A1A1A selebar 873,6 pt, di y95 (bawah judul) dan y507,6 (atas footer) |
| Logo BNPB | 27,4×34,6 pt di (889,4; 28,8), tanpa lingkaran |
| Footer | `Badan Nasional Penanggulangan Bencana  \|  Copyright 2026` (dua spasi mengapit garis), 8,5 pt 1A1A1A di y512,6. Nomor halaman 8,5 pt bold rata kanan, berakhir di x916,8 |
| Sampul dan penutup | Tanpa footer dan tanpa nomor halaman (d2 dan d4 memasang footer di sampul, salah) |

### Struktur per jenis deck

| Jenis | Isi | Sampul / penutup |
| --- | --- | --- |
| Laporan Kejadian Bencana Harian | 4 slide: sampul, ringkasan dan peta, rincian per jenis, penutup. Sempat 2 slide pada 23 Okt, sampul dan penutup dipasang kembali 24 Okt. Cut off 12.00 WIB | Ya / ya (GELAP) |
| Laporan Penanganan Pengendalian Karhutla | 3 slide, cut off 15.00 WIB hari laporan (kolom terakhir sementara): peta nasional, tabel provinsi, operasi. Versi Lengkap ditambah konsesi, pembatas, A1–A11, dan B1–B5 | Tidak / tidak |
| Paparan wilayah | 5 slide yang makin menyempit: provinsi, kabupaten fokus, kompleks api, risiko lanjutan, RTL 7 hari | Tidak / tidak |
| Paparan Presiden | Versi Utama 7 slide: sampul, 4 temuan, Kesimpulan, Terima kasih. Versi Lengkap ditambah pembatas Lampiran dan lampiran A/B | Ya / ya, penutup ditaruh sebelum lampiran |

- **Harian, slide 2 (d3).**
  - Pita KPI di y101–174.
  - Peta 605×227 di (40; 184).
  - Panel STATUS PENANGANAN 247×238 di (670; 184).
  - Legenda di tengah bawah peta (x225–476, y408–423).
  - Pita "YANG AKAN DILAKUKAN BNPB" 874×65 di y431–496.
- **Harian, slide 3.**
  - Satu panel untuk setiap jenis yang benar-benar menonjol. Lebarnya sebanding isi (d3: karhutla 529 pt, kekeringan 334 pt, jarak 11 pt).
  - Panel kosong tidak dipasang (d2 menampilkan "0").
  - **Bencana lainnya dipisah per jenis**, seperti d1, setiap kali ada kejadiannya: *"Dipisahin dong ... jadi orang tau mana gempa bumi mana bla bla bla"*. Setiap jenis punya kepala sendiri dengan ikon dan warna berbeda (gempa bumi slate 5B7A99, kebakaran TPA A23B2A, banjir 2F6FB5), pil fakta, dan angka korban, pengungsi, atau rumah rusak berikon. Penanda peta slide 2 memakai warna jenisnya dan legendanya per jenis.
  - **Tabel kekeringan ditutup baris TOTAL berikon** (rumah untuk KK, orang untuk jiwa, tetes untuk air) berisi jumlah liter dan tangki: *"Buat icon"*.
- **Harian, sampul.**
  - Foto kanan x497–960 dengan fade putih ke kiri.
  - Logo dalam lingkaran putih 79 pt.
  - Judul 34 pt bold, 2 baris, patah setelah "Bencana".
  - Nama lembaga 16 pt bold 00499D.
  - Pil PERIODE FBE7D6 331×30 dengan ikon kalender, berisi `21 Okt 2026, 07.00  –  22 Okt 2026, 07.00 WIB`.
  - "DISAMPAIKAN OLEH" 9 pt D9600B spc100, nama dan gelar 14 pt bold, jabatan 12 pt 6B7280.
  - Pil tanggal navy 230×30 berisi `Kamis, 22 Oktober 2026`.
  - Kredit foto 7 pt.
- **Harian, penutup.**
  - Foto dengan gradasi navy.
  - "Terima kasih" 54 pt, garis F28C28 2×374 pt.
  - Nama lembaga 18 pt bold (bukan nama pejabat), baris laporan 13 pt C9D1E3.
  - Tanpa kartu kontak.
  - Penunjuk lampiran tidak dipasang di laporan harian 4 slide (*"Hilangkan"*). Di deck yang memang berlampiran, penunjuk 11 pt F6B26B boleh asal nomor halamannya benar.
- **Penanganan (d6, d8).**
  - Langsung ke data dan tanpa slide penutup.
  - Pil CUT OFF dipasang di slide tabel dan peta. Slide operasi tidak memakainya, jadi tanggal datanya harus tertulis di judul.
  - Versi ringkas dibuat dengan memotong slide; tata letaknya tidak diubah.
- **Paparan wilayah (d5).**
  - Slide 1–3 memakai pola judul yang sama, hanya wilayahnya yang berganti.
  - Slide risiko dan slide rekomendasi tanpa pil CUT OFF.
  - Slide rekomendasi tanpa catatan kaki dan tanpa pita kepala panel.
- **Presiden (d9).**
  - Kode lampiran ditulis di depan judul ("A1. ", "B4. ").
  - Tabel panjang dipecah ke slide "(lanjutan 2/5)" dengan baris yang dibagi rata. d7/d9 B5 5/5 hanya berisi 3 baris, dan itu cacat.
  - Kesimpulan berupa 8 kartu dalam grid 4×2 ditambah pita ARAHAN D9600B.

### Judul

| Jenis | Ukuran | Bentuk | Warna sorot |
| --- | --- | --- | --- |
| Templat BNPB | 26 pt bold, 1 baris | `<Topik> per Tanggal 22 Oktober 2026`, dengan subjudul 12 pt | Angka di subjudul D9600B, provinsi 00499D |
| Harian | 22 pt bold, jarak baris 95% | Kalimat kesimpulan | Setiap angka kunci D9600B, juga di slide 3 (d4 lupa) |
| Wilayah | 20 pt bold | Judul topik deskriptif | Satu frasa saja D9600B (wilayah atau "(7 Hari)"). Biru tidak dipakai |
| Presiden, lampiran | 19–22 pt bold | Kalimat temuan, diawali kode lampiran | Angka D9600B, tempat 00499D |
| Kajian (bawaan `KEPUTUSAN.md` T11, menyimpang dari vonis di bawah, menunggu pemilik; lihat [Belum diputus](#belum-diputus)) | 19–22 pt bold | Slide temuan (definisinya di [S7](#pola-deck-konsultan-kelas-dunia-mckinsey-bcg-big-four)): kalimat temuan berangka, diawali kode bagian ("A1. "). Sampul, pembatas, slide navigasi, dan slide usulan: deskriptif | Kode bagian dan angka D9600B, tempat 00499D |

- **Paling banyak dua baris, di semua deck.** Kalau tidak muat, huruf dikecilkan (pernah sampai 21,84 pt), jangan dibiarkan turun ke baris ketiga: *"Ukuran disesuaikan lah intinya cuma 2 baris"*. Judul d7 A1 setinggi 3 baris terpotong di atas slide, dan d9 s3 juga 3 baris.
- **Judul deskriptif menang atas judul data.** Contoh judul akhir dari pemilik: "Sebaran Titik Panas dan Kebakaran di **Jawa Timur** per 22 Oktober", "Rekomendasi Rencana Tindak Lanjut Sepekan **(7 Hari)** ke Depan", "Waspada saat peralihan musim: **9** kawasan …". Yang dipakai "musim hujan", bukan "hujan pertama".
- **Pola judul harian.**
  - Slide 2: `Laporan {DD–DD Bulan YYYY}: {N} kejadian menonjol di {P} provinsi, terdiri atas {a} karhutla dan {b} kekeringan; {c} kejadian karhutla masih dalam proses penanganan`.
  - Slide 3: `Rincian {N} kejadian menonjol: {a} karhutla ({c} di antaranya masih dalam proses penanganan) dan {b} kekeringan di {Provinsi}`.
  - Frasa "belum selesai" dan awalan "Rincian per jenis:" tidak dipakai lagi.
- **Subjudul 12 pt** ditulis satu baris dan harus selesai sebelum x≈690 pt supaya tidak menabrak pil CUT OFF. Subjudul tidak boleh mencampur kohort dengan total: d6 menyandingkan "belum padam 22.251 ha" (total) dengan kohort api 20 Okt.

### Tipografi dan warna

- **Hanya Roboto**, termasuk font tema. Tanpa emoji.
- **Skala ukuran:**
  - Nilai kartu 17 pt bold. Hitungan panel 16–18 pt. Nilai ubin 15 pt.
  - Judul panel 11 pt bold. Judul grafik 10 pt. Judul kolom pita dan judul langkah 9 pt bold.
  - Footer 8,5 pt. Label kartu dan label bagian 7,5 pt. Isi daftar dan isi pita 7,2 pt.
  - Kepala kolom 6,5 pt bold 6B7280 spc80. Pil bagian 6,6 pt bold KAPITAL spc100. Pil status 6–6,4 pt.
- **Batas bawah huruf 6 pt untuk teks yang dibaca.** Ukuran 5,2–5,8 pt hanya untuk persen di tabel padat dan chip. Kalau baris tidak muat, jumlah baris dikurangi atau baris dikelompokkan; font tidak diciutkan (d4 turun ke 6,08 pt untuk 21 baris).
- **Kapital dengan spasi huruf 80–100** hanya untuk pil bagian, kepala kolom, dan label pita. Label KPI dan status ditulis huruf kecil ("laporan kejadian", "selesai").

| Peran | Warna | Tint |
| --- | --- | --- |
| Teks: utama, isi, redup | 1A1A1A, 2E3440, 6B7280 | A9B4C2 untuk "baru" |
| Navy: pil, peringkat, baris total, selesai, nilai netral | 051C2C | E6EAF0 chip, F3F5F8 grup |
| Oranye: angka kunci, api, naik, berjalan | D9600B | FBE7D6 pil, FDF4EC pita, F2D3BA pemisah, F4C3A0 batang lama, FDF1E8 baris sorot |
| Merah: perlu perhatian, bahaya, belum padam (deck wilayah) | C8102E | F8DDE0 pil, FCF1F2 grup |
| Biru: turun, air, musim hujan | 2F86D1 | DCEBF8 pita kepala, B7D3EE batang lama, EEF5FC pita, C9DDF2 pemisah |
| Slate: luas, BMKG, sekunder | 5B7A99 (pil kolom luas 3F5F80) | E3EAF1 |
| Emas kekeringan (harian) | B08A3E, teks 8A6A2E | F4ECDC, FBF8F2, E2D3B5 |
| Gunung api, gambut | 8A4B2A, 6B4A2B | F1E2D6, EFE6DC |
| Biru lembaga atau tempat | 00499D | Nama BNPB di sampul, nama wilayah di judul Presiden |
| Garis | Kartu BFC5CC 0,75 pt, hairline EEF0F3/F1F2F4 0,5 pt, pemisah panel E5E7EB | Zebra dan ubin F7F8FA |

- **Arah naik dan turun.**
  - Naik ▲ D9600B, turun ▼ 2F86D1, 0% 6B7280, batang pembanding DCE1E7.
  - Di atas latar navy: naik F2A35E, turun 8EC5F5.
  - Pasangan ini khusus slide. Tooltip situs tetap merah dan hijau.
  - Pasangan lama turun = navy (d9, d7 A5) sudah diganti.
- **Merah di laporan harian** dipakai hanya untuk perlu perhatian. "Dalam penanganan" berwarna oranye.
- **Grup BELUM PADAM** di templat BNPB tetap oranye. Di deck wilayah, belum padam ditulis merah.
- **Palet generator lama dilarang**: D9650B, 0F1E2D, 0B4EA2, A88A3C, FBEBDD, D5D9DE.
- **Satu skema kualitas udara per deck.** Slide inti memakai 7E1F1F untuk berbahaya dan C7811B untuk tidak sehat. Lampiran A7 masih memakai C8102E dan D9600B.

### Komponen

- **Pil bagian.**
  - Kotak membulat penuh setinggi 14,4 pt, ikon putih 9 pt, label KAPITAL 6,6 pt bold putih.
  - Warna isi: navy untuk DATA SATELIT dan KEJADIAN BENCANA, merah untuk PERLU PERHATIAN dan PRESEDEN, slate untuk PERINGATAN BMKG.
  - Labelnya hanya nama bagian, tanpa tempat atau tanggal (*"DATA SATELIT"*).
- **Grup kartu.**
  - Kontainer tint (F3F5F8, FCF1F2, EEF5FC) setinggi 73 pt di y≈101–104, dengan pil bagian di kiri atas.
  - Jarak antargrup 21 pt.
  - KPI tidak dibuat sebagai satu deret datar (d1, d2, d4).
- **Kartu angka.**
  - Putih, garis BFC5CC 0,75 pt, radius ≈5,8 pt, ukuran 132–159×40 pt.
  - Lingkaran tint 26 pt di x+8,6 berisi ikon 14 pt sewarna nilai.
  - Nilai 17 pt bold berwarna makna, label 7,5 pt 2E3440 (contoh "titik panas, naik 39%").
  - Jarak antarkartu 7,2 pt. Tanpa ± di deck wilayah dan di kotak angka slide peta.
- **Panel berpita.**
  - Putih bergaris BFC5CC, radius ≈4,3 pt.
  - Pita kepala 36 pt berwarna tint tema: E6EAF0 netral, FBE7D6 api, F8DDE0 bahaya, DCEBF8 air, F4ECDC kekeringan. Sudut bawah pita ditutup rect supaya lurus.
  - Isi pita: lingkaran solid 23 pt dengan ikon putih 14 pt, judul 11 pt bold, hitungan 16–18 pt bold rata kanan.
  - Jarak antarpanel 10,8 pt.
- **Daftar status.**
  - Satu baris berisi lingkaran ikon, nama tempat bold diikuti ", lokasi" regular, dan pil status di kanan.
  - Pil status: belum padam F8DDE0/C8102E, berjalan atau pendataan FBE7D6/D9600B, kumulatif E6EAF0/051C2C.
  - Chip fakta 5,8 pt ditaruh di bawah nama. Jarak antarbaris rata.
  - Laporan harian hanya punya 2 status: selesai (navy dengan centang) dan dalam penanganan (oranye dengan titik tiga). Daftar diurutkan menurut sisa ha, terbesar dulu.
  - **Status karhutla mengikuti sisa belum padam website, bukan laporan BPBD** (*"Ini kalo dibilang data sisa ya pakai punya kita aja bro"*, *"yakin kan yang lainnya beneran selesai?"*): sisa 0 ha = selesai; sisa 10 ha atau lebih = dalam penanganan walau BPBD melapor padam (Kaltim, Luwu Timur, Arjuno 24 Okt); di bawah 10 ha = selesai kecuali BPBD melapor api belum padam (*"Ini dua gausah deh kan dikit aja"*). Semua angka sisa, termasuk di pita YANG AKAN DILAKUKAN, memakai website. Aturannya satu tempat di `data.py`.
  - **Perlu perhatian mencakup semua jenis, bukan hanya karhutla** (*"jangan hanya karhutla tulisannya tapi semua yang butuh perhatian"*): karhutla yang masih ditangani dengan sisa 100 ha atau lebih atau dilapor BPBD belum padam, ditambah kejadian lain yang dilapor BPBD belum tertangani (contoh TPA Supit Urang). Kartu berlabel "kejadian perlu perhatian"; daftar di panel status hanya berisi yang perlu perhatian (*"masukin yang perlu perhatian aja"*), tiap baris berikon jenisnya, jumlahnya sama dengan kartu.
  - **Tally harus sama di seluruh deck** (*"kalo 15 yang masih dalam penanganan ya 15"*): batang status dipecah per jenis, `selesai | karhutla ditangani | lainnya`, sehingga angka karhutla di batang = judul = ikon oranye di tabel slide 2.
  - **Provinsi berstatus Prioritas di website wajib masuk** (*"pedoman ya yang dimasukin yang prioritas"*): provinsi dengan cluster level 3 yang tidak ada di laporan Koordalops ditambahkan sebagai baris provinsi.
  - **Ruang kosong di dalam kontainer dipadatkan** (*"Gw ga suka white space banyak gini"*): panel setinggi isinya, panel berikutnya langsung menyusul; tabel satu baris tanpa baris TOTAL.
- **Tabel peringkat (d5 s1).**
  - Kepala metrik berupa pil berikon 57,6×16,6 pt: TITIK navy, LUAS (HA) 3F5F80, BELUM PADAM C8102E.
  - Baris 17,3 pt dengan pemisah EEF0F3.
  - Nomor peringkat dalam bulatan navy 13,7 pt berangka putih.
  - Angka rata kanan, panah dan persen rata kiri.
  - Wilayah fokus diblok FDF1E8 dan tetap memakai nomor aslinya.
  - Baris total berupa kotak navy 21 pt.
- **Tabel provinsi templat BNPB (d6, d8).**
  - Tiga chip grup 167,6×31,7 pt.
  - Sel berupa batang mini 23,5 pt dengan nilai 8–9 pt di atas dan delta 6,8 pt di bawah.
  - Baris Jumlah berupa kotak navy 862×30 pt.
  - Diurutkan menurut hotspot hari terakhir. Data lapangan yang belum ada ditulis "NA" dan dijelaskan di catatan kaki.
- **Tabel native lampiran.**
  - Kepala 7,8–8,5 pt bold dengan garis bawah 1 pt. Baris 18–21,6 pt dengan garis bawah 0,5 pt BFC5CC.
  - Tanpa garis vertikal, paling banyak 24 baris per slide.
- **Peta.**
  - Latar putih atau abu sangat muda, tanpa laut biru: *"petanya belakangnya jangan biru"*.
  - Peta wilayah: kab/kota bertitik D3DBE5, tanpa titik F1F3F6. Bulatan D9600B bergaris putih dengan luas sebanding jumlah titik.
  - Nomor peringkat berupa lingkaran putih bergaris oranye. Label berupa pil putih bergaris abu, misalnya "Jember 19".
  - Peta zoom kompleks: titik diwarnai menurut umur (B4BDC8 lama, F2A35E tengah, C8102E terbaru), dengan segitiga di puncak gunung.
  - Peta harian: penanda shape 17/22/24 pt (untuk 1/2/≥3 kejadian) bergaris putih 1,25 pt, ditambah badge "!" merah 11 pt di provinsi yang punya karhutla perlu perhatian. Provinsi itu juga bergaris merah di peta dasar, dan aturannya satu sumber dengan kartu PERLU PERHATIAN. Badge jumlah dan badge ! duduk di pinggir lingkaran (0,42 diameter dari pusat), jangan sampai menutupi angka.
  - **Tidak boleh ada yang bertumpuk**: *"Ini situbondo tumpang tindih"*.
  - **Wajib ada legenda** yang menerangkan arti bulatan dan warna: *"Ya apa itu lingkaran dan warnanya isinya apa legendanya"*. Teks legenda 7–7,5 pt.
- **Grafik batang harian.**
  - Pola: *"Tiru model selama ini di laporan bencana harian dan laporan harian karhutla"*.
  - Batang berujung atas membulat (round2SameRect adj 22000) di atas garis dasar 0,75 pt BFC5CC, tanpa sumbu Y.
  - Nilai 7,6 pt bold di atas batang. Tanggal 6,5 pt di bawah (hari terakhir ditulis "22 Okt"), lalu % perubahan 6 pt bold berwarna arah.
  - Batang pertama DCE1E7 sebagai pembanding. Hari lama memakai tint, tiga hari terakhir memakai warna pekat.
  - Kepala grafik: nama metrik 10 pt di kiri, perubahan neto "▼ 67%" di kanan.
- **Pita bawah.**
  - Kotak membulat selebar 874 pt, tinggi 61–71 pt, berwarna FDF4EC (aksi, indikator), EEF5FC (musim hujan), atau F7F8FA (data). Labelnya 7,5 pt bold spc100.
  - Isinya 3–4 kolom dipisah garis 0,75 pt. Tiap kolom: lingkaran 26 pt berikon putih, judul 9 pt bold, isi 7,2 pt paling banyak 2 baris.
  - Pita grafik harian di slide 1 tetap dipasang: *"Eh ini tetap ada aja"*.
- **Baris rekomendasi.**
  - Kolom LANGKAH, RINCIAN, PENANGGUNG JAWAB. Baris 46,8 pt.
  - Lingkaran 26 pt diwarnai menurut jenis aksi: oranye untuk api, navy untuk dukungan, biru untuk musim hujan.
  - Rincian satu kalimat 8 pt rata kiri-kanan (*"Justify"*), sekitar 110 karakter.
  - Penanggung jawab ditulis sebagai chip lembaga berikon, bukan logo: *"Pakai ikon saja"*.
- **Pil CUT OFF DATA.**
  - Navy 051C2C di kanan atas (x≈696, y≈70), lebar 186–220 pt, tinggi 16,6–18 pt.
  - Isi: label `CUT OFF DATA` 6–8 pt bold AFC3DA/A9B4C2 spc100, lalu `22 Okt 2026, 23.00 WIB` 8–10 pt bold putih. Jam ditulis dengan titik. Deck wilayah menambah ikon jam.
  - Dipasang di setiap slide data: *"Tambahkan data cut off"*.
- **Catatan kaki.**
  - Bilah 4A9BE0 sekitar 3×13–17 pt di x43,2 y≈488–490.
  - Teksnya `*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).` dengan ukuran 7,5 pt di deck wilayah dan 9,5 pt miring di templat BNPB.
  - Data hari berjalan ditambah "Angka 22 Okt sementara, data s.d. 16.25 WIB."
  - Slide analisis memakai baris "Sumber: …" 7,5 pt 6B7280.
- **Ikon.**
  - Gaya garis Lucide/Tabler, PNG 256 px, satu warna, selalu di dalam lingkaran.
  - Ikon putih di atas lingkaran solid, ikon berwarna di atas lingkaran tint warnanya sendiri.
  - Ukuran ikon 55–62% diameter lingkaran (14/26, 14/23, 7/12).
  - Ikon wajib ada di kepala tabel, kartu angka, dan chip: *"Kasih icon"*.

### Isi dan sumber data

- **Semua angka karhutla diambil dari data website.** Hotspot dari tabel Real Time; luas terbakar dan belum padam dari lapisan peta website. *"intinya semua data hotspot luas terbakar titik panas titik puncak belum padam ambil data kita"*, dan untuk laporan harian *"Karhutla udah pasti pakai data kita"*.
- **Fakta lapangan diambil dari laporan BPBD atau Koordalops**: status, korban, kekeringan, gempa, operasi. *"laporan lapangan BPBD aja"*. Isi yang boleh masuk laporan harian bisa dilihat di d1: KK dan jiwa, liter air beserta sarananya, rumah rusak, pengungsi, pendaki, sortie WB.
- **Peta di deck sama dengan peta app.** Kompleks prioritas disorot dan bernomor, kompleks kecil masuk legenda, dan jumlahnya sama dengan app.
- **Angka harus cocok di seluruh deck.** Di d3, angka 9 "dalam penanganan" sama di judul, KPI, "(9)", 9 baris daftar, dan 9 ikon oranye di slide 3. Selesai + berjalan = kejadian menonjol. Kartu PERLU PERHATIAN = jumlah tanda ! di daftar dalam penanganan. Jumlah penanda = jumlah provinsi di judul.
- **Pembulatan berbeda per jenis.**
  - Harian: bulat tanpa desimal, "± 635.296 ha", "sisa ± 7.938 ha".
  - Templat BNPB dengan data lapangan: "±502,08 ha".
  - Hitungan satelit dan deck wilayah: bulat tanpa ±.
- **Format tanggal.** Di judul bulan ditulis penuh ("22 Oktober"). Di isi bulan disingkat ("22 Okt"). Rentang memakai en dash ("15–22 Okt"). Periode laporan harian 07.00–07.00 WIB.
- **Istilah.** "Hotspot" tetap dipakai di templat BNPB (d3, d6, d8) karena memang label templat itu. Deck wilayah memakai "titik panas". "Titik api" tidak dipakai untuk data satelit; d9 s3 dan s6 masih memakainya.

### Pola deck konsultan kelas dunia (McKinsey, BCG, Big Four)

Dari bedah 10 deck konsultan pada 23 Okt: McKinsey (MCOV, MLEB, MWSTC), BCG (BCOV, BNYC), Bain (BAIN), Deloitte (DNEMA, DQRA, DGSW), dan KPMG. Pemilik: *"ppt mckinsey bcg dan konsultan big four management juga ditiru ya"*. Pola ini dipakai di deck kajian (`KEPUTUSAN.md` P14, P16). Laporan harian, Penanganan, paparan wilayah, dan Paparan Presiden tetap mengikuti [Struktur per jenis deck](#struktur-per-jenis-deck) dan deck acuannya; pola di sini masuk ke deck itu hanya bila pemilik memintanya. Teknik konsultan masuk ke dalam kerangka BNPB dan tidak menggantikannya: MLEB, rencana yang dikenal sebagai karya McKinsey walau sampulnya tanpa nama firma, dikerjakan di dalam templat pemerintah Lebanon (`mbb/png/mck-lebanon/s0001.png`), sama dengan prinsip satu gaya rumah. Bila pola konsultan atau aturan skill pemilik bentrok dengan aturan di bab ini, aturan bab ini yang berlaku; bentroknya dicatat di bawah. Judul slide, kode bagian, dan warna pembatas memakai keputusan bawaan orkestrator `KEPUTUSAN.md` T11–T13, yang berlaku sampai pemilik mengoreksinya. Bukti dan vonis lengkap ada di `data/kajian-bnpb/riset/desain-benchmark/deck/SINTESIS-DECK.md`, dan path bukti di subbab ini relatif ke folder `deck/` itu. PwC dan EY tidak berhasil diambil. Butir S34–S39 berasal dari skill pemilik `alfatehan-pptx-rules` (penilaiannya di `data/kajian-bnpb/TAMBAHAN-PPTX-RULES.md`). Alur slide per kajian ada di `data/kajian-bnpb/PEDOMAN-DESAIN.md` §B7.

| Kode | Deck | Yang diambil |
| --- | --- | --- |
| MCOV | McKinsey, COVID-19 Briefing Note, 2020 | Ringkasan tiga kolom sama dengan nama bab, profil per negara, rantai dampak per tahap |
| BCOV | BCG, COVID-19 Perspectives v20, 2020 | Kerangka fase, ringkasan piramida, kurung kelipatan, grafik kecil berganda, tabel skenario, matriks aktor × fase |
| MLEB | McKinsey, Lebanon Economic Vision, 2018 | Ringkasan tiga baris, target per tahun, waterfall tuas A–D, tabel penanggung jawab berikon, tata kelola dan pelaporan |
| BNYC | BCG, NYCHA, 2012 | Grid kewenangan per tingkat, kondisi kini ke sasaran, corong prioritas, kelas prioritas di lampiran |
| MWSTC | McKinsey, paparan WSTC, 2020 | Judul grafik topik-satuan-periode, peta panas bahaya × aset, sorot dengan bingkai, situasi dan tuas pembiayaan |
| BAIN | Bain, SEA Green Economy, 2024 | Judul Roboto "Topik: temuan", matriks kemajuan, bulatan nomor, chip seri, profil wilayah berulang |
| DNEMA | Deloitte-NEMA, National Risk Study, 2025 | Lima temuan sebelum bagian pertama, nomor bagian di depan judul, angka bukti judul, satu warna sorot |
| DQRA | Deloitte, biaya banjir SEQ 2022 | Taksonomi cakupan dengan yang tidak dihitung, baris data yang belum ada |
| DGSW | Deloitte, Giant Sea Wall, 2025 | Kerangka dipakai ulang sampai peta, rekomendasi bernomor, tabel pilihan × kriteria, daftar singkatan |
| KPMG | KPMG India, ekonomi sirkular, 2026 | Peta kecil berpasangan sebelum dan sesudah |

**Alur cerita**

- **S1. Jawaban di depan.** Slide isi pertama sesudah sampul adalah Pesan Kunci: kalimat tesis, lalu 4–6 temuan, satu per bagian, dipilih dari 6–8 temuan Pesan Kunci DOCX (L14). Tiap temuan satu label berangka. Bukti: `big4/png/deloitte-nema/s003.png` (lima temuan sebelum bagian pertama), `mbb/png/mck-covid/s003.png`, `mbb/png/bcg-covid/s005.png`, `mbb/png/mck-lebanon/s0007.png`. d9 tidak punya slide ini; dasarnya `PEDOMAN-DESAIN.md` §B7 (lihat Belum pasti). Periksa: tesis identik dengan kunci `tesis` di `angka-kunci.json` (D-6); berkas itu dibangun bersama naskah dan per 23 Okt belum ada.
- **S2. Pesan Kunci sekaligus peta deck.** Temuan ke-n memakai kode dan nama bagian ke-n (bagian A sampai E). String yang sama dipakai di kode bagian slide isi, dan urutan slide mengikuti urutan temuan. MCOV s003 memakai judul kolom yang sama dengan tiga dari empat bab di daftar isinya (s004); DNEMA menomori bagian 1 sampai 5 (s006, s009, s018) dalam urutan lima temuan s003. Periksa: label bagian di Pesan Kunci identik dengan label di slide isi; jumlah temuan sama dengan jumlah bagian.
- **S3. Urutan bagian dari masalah ke tindakan**: kondisi, risiko, skenario, kesenjangan, grand design. Sama dengan alur argumen `PEDOMAN-DESAIN.md` §A4; MLEB s0007 memakai urutan masalah, visi, pendekatan. Periksa: huruf bagian di slide isi tidak pernah mundur, dan bagian grand design selalu terakhir sebelum Kesimpulan.
- **S4. Satu kerangka menjadi tulang deck.** Kerangka ditampilkan sekali, lalu dipakai ulang sebagai kolom matriks, label peta, dan chip di slide berikutnya: DGSW memperkenalkan tiga strategi di s004 lalu memakainya di tabel s011 dan peta s024; BCOV merujuk Flatten, Fight, Future (s003) lagi di ringkasan s005. Namanya memakai istilah undang-undang (prabencana, tanggap darurat, pascabencana) atau nama musim, bukan nama bergaya slogan. Periksa: label fase dan musim sama persis di semua slide, diambil dari `tema.json` kunci `kosakata.fase` dan `kosakata.musim`.
- **S5. Slide isi membawa temuan, lampiran membawa rincian.** Uraian inisiatif berparagraf, tabel kelas prioritas, metode, dan proses penyusunan pindah ke lampiran (MLEB s0781 dan s0004, BNYC s055). Periksa: tidak ada kotak teks lebih dari 3 baris di slide isi.
- **S6. Judul dibaca berurutan menjadi ringkasan.** Periksa: judul slide isi diekstrak dari `ppt/slides/*.xml` sebagai satu daftar; tidak ada dua judul yang sama setelah angka dibuang (mesin), dan daftar itu dibaca sekali sebagai ringkasan sebelum dikirim (manusia).

**Judul**

- **S7. Judul slide temuan deck kajian berupa kalimat temuan** (bawaan `KEPUTUSAN.md` T11, menunggu koreksi pemilik), paling banyak 2 baris, 19–22 pt bold, angka D9600B, tempat 00499D, seperti judul lampiran Presiden d9. **Slide temuan** adalah slide bagian yang membuktikan kondisi, risiko, skenario, atau kesenjangan (bagian A sampai D), ditambah matriks lembaga × fase di bagian grand design. Slide usulan di bagian grand design (kerangka program, prioritas program, rekomendasi dan peta jalan), sampul, pembatas, dan slide navigasi (Pesan Kunci, Kesimpulan) berjudul deskriptif (`PEDOMAN-DESAIN.md` §B7.1). Spek tiap slide memuat medan `judul` bernilai `temuan` atau `deskriptif`. Jenis judul tidak menentukan kaki slide: slide usulan yang memuat angka tetap memasang baris Sumber dan pil CUT OFF (S14, S16). Aturan pemilik yang tertulis berbunyi "Judul deskriptif menang atas judul data" ([Judul](#judul)) dan tidak dibatasi ke deck tertentu, jadi T11 menyimpang darinya, dicatat di [Belum diputus](#belum-diputus), dan dibalik bila pemilik memilih judul deskriptif. MBB memakai judul aksi di tiap slide data: MCOV 24–32 pt, BAIN Roboto sekitar 20 pt dengan pola "Topik: temuan" (`mbb/png/bain-sea/s036.png`). Periksa, selama T11 berlaku: tiap slide bagian A sampai D berspek `judul: temuan`, dan tiap judul berspek `judul: temuan` memuat paling sedikit satu token `{{angka:…}}`.
- **S8. Angka di judul dibuktikan di slide yang sama**, sebagai kartu angka atau label grafik. DNEMA menaruh angka bukti "97%" tepat di bawah judul yang tidak berangka (`big4/png/deloitte-nema/s006.png`). Periksa: tiap angka judul muncul lagi di badan slide.
- **S9. Judul grafik 10 pt memuat topik, satuan, dan periode dalam satu baris**: topik bold, lalu satuan dan periode regular sesudah koma (`mbb/png/mck-wstc/s002.png`). Tidak ada baris satuan terpisah. Periksa: tiap judul grafik memuat satuan dan periode.

**Pelacak bagian**

- **S10. Deck sekitar 12 slide isi tanpa slide agenda dan tanpa pembatas bab.** Posisi ditandai kode bagian D9600B di depan judul: huruf bagian lalu nomor slide di bagian itu ("A1. ", "B2. "), pola kode lampiran d9 dan nomor bagian berwarna sorot DNEMA (`big4/png/deloitte-nema/s006.png`, s009, s018). Tidak ada unsur baru di pojok yang bisa menabrak logo atau pil CUT OFF (bawaan `KEPUTUSAN.md` T12). Bila deck yang lebih panjang memakai pembatas bab, layout-nya GELAP 051C2C, sama dengan pembatas Lampiran dan penutup (bawaan `KEPUTUSAN.md` T13). Periksa: tiap slide isi selain Pesan Kunci dan Kesimpulan berawalan kode bagian; huruf tidak mundur dan nomor dalam satu bagian urut tanpa lompat.
- **S11. Tanpa slide pelacak.** Daftar isi berulang (`mbb/png/mck-covid/s004.png`, `mbb/png/bcg-nycha/s009.png`, `mbb/png/bain-sea/s091.png`) tidak dipakai: deck kajian ±12 slide isi (P14) tidak memerlukannya. Bila kelak ada deck lebih dari 20 slide isi, bentuk ini dibawa ke pemilik dulu. Periksa: tiap slide di antara sampul dan Terima kasih, kecuali pembatas bab bila dipakai (T13), memuat angka, grafik, peta, atau tabel (S36).
- **S12. Seri slide sejenis** (per kelompok bencana, per provinsi) memakai deret chip 6,6 pt tepat di bawah garis judul, dan isi slide dimulai di bawah deret itu: chip aktif navy berteks putih, lainnya E6EAF0 berteks 2E3440 (`mbb/png/bain-sea/s036.png`). Periksa: jumlah chip sama dengan jumlah slide di seri, dan tiap slide punya tepat satu chip aktif.

**Anatomi slide**

- **S13. Satu slide satu pesan dalam 3–4 blok**: satu bukti utama (grafik, peta, atau matriks), kolom 2–3 kartu angka, dan pita bawah bila ada aksi (`mbb/png/bcg-covid/s007.png`, `big4/png/deloitte-nema/s006.png`, `mbb/png/mck-covid/s010.png`). Kolom temuan ditaruh di panel putih yang sama dengan grafiknya, bukan di kotak terpisah seperti MCOV s010 dan BAIN s036. Periksa: paling banyak satu grafik atau peta utama per slide.
- **S14. Catatan kaki bernomor superskrip dan satu baris "Sumber: …"** 7,5 pt 6B7280 ([Komponen](#komponen), Catatan kaki) berbagi zona catatan kaki dari y≈485 sampai garis y507,6 (22,6 pt): paling banyak satu baris Sumber 7,5 pt ditambah 2 baris catatan 6 pt, tinggi total kotak ≤ 22,6 pt (jarak baris 1,15: 8,6 + 2 × 6,9 = 22,4 pt). MCOV s010 dan BAIN s036 memuat 3–6 catatan pada 5–6 pt; di bawah 6 pt tidak ditiru. Catatan yang tidak muat pindah ke lampiran metode. Tidak ada baris sumber di bawah tiap grafik (d5). Hanya slide baris rekomendasi (LANGKAH, RINCIAN, PENANGGUNG JAWAB) yang tanpa catatan kaki (d5); slide usulan berangka seperti kerangka program dan prioritas program tetap memasang baris Sumber. Periksa: tiap superskrip di badan punya pasangan di zona kaki, tinggi kotak catatan kaki dari XML ≤ 22,6 pt dan tepi atasnya tidak di atas y≈485, dan slide berangka selain slide baris rekomendasi tanpa baris Sumber ditolak.
- **S15. Label keyakinan berupa pil 6–6,4 pt di pojok kanan atas panel grafik atau tabel**: Resmi, Terverifikasi, Estimasi model, atau Asumsi kebijakan (`KERANGKA.md` prinsip 4; teks dari `tema.json` `kosakata.keyakinan`, dengan tambahan "belum diuji balik" untuk keluaran model). Pil ini pengganti stempel ILLUSTRATIVE, PRELIMINARY, dan NON-EXHAUSTIVE milik konsultan (`mbb/png/mck-lebanon/s0781.png`, s1113; `mbb/png/mck-wstc/s011.png`). Panel yang semua angkanya berkeyakinan sama memakai satu pil. Tabel yang mencampur keyakinan, misalnya tabel kerusakan skenario (rumah rusak dari DIBI, korban dari model, kerugian dari asumsi), memakai chip keyakinan per baris dan tanpa pil panel. Pil tidak ditaruh di kanan atas slide, karena itu zona pil CUT OFF. Periksa: tiap angka tampil tertutup tepat satu label (pil panel atau chip baris), dan labelnya sama dengan `keyakinan` kunci angkanya di `angka.json`.
- **S16. Pil CUT OFF DATA setara stempel "As of" konsultan** (MCOV s005 dan s007, BCOV s007). Keputusan pemilik 23 Okt menetapkan isinya tanggal dan jam WIB tarikan data ([Diputus](#diputus)). Di deck kajian isinya satu batas data kajian bertanggal dan berjam, misalnya `23 Okt 2026, 23.59 WIB`, keduanya dibaca dari satu kunci, tidak diketik (D-22). Tanggal tarik per paket berbeda (IRBI ditarik 18 Okt, DIBI 23 Okt) dan ditulis di lampiran metode; satu batas lintas paket ini bawaan dan dicatat di [Belum diputus](#belum-diputus). Hanya slide baris rekomendasi (LANGKAH, RINCIAN, PENANGGUNG JAWAB) yang tanpa pil (d5); slide usulan berangka tetap berpil. Pesan Kunci dan Kesimpulan memuat angka, jadi ikut aturan "dipasang di setiap slide data" ([Komponen](#komponen), Pil CUT OFF DATA). Periksa: satu tanggal dan jam di semua pil, jam ditulis bertitik, dan tanggal tarik tiap paket yang angkanya tampil tidak lebih baru daripada batas itu.

**Kepadatan**

- **S17. 180–290 kata per slide isi** ([Prinsip](#prinsip)). Median MBB yang diukur: 167 kata (BNYC) dan 276 kata (MCOV). Slide 300 kata ke atas dipecah atau dipindah ke lampiran (MCOV s014 dan s020, `big4/png/deloitte-qra/s013.png`). Batas huruf tetap aturan bab ini: 6 pt untuk teks yang dibaca, 5,2–5,8 pt hanya untuk persen di tabel padat dan chip. Catatan kaki 5,3 pt (BCOV) dan 5–5,8 pt (BAIN) tidak ditiru. Periksa: jumlah kata dan ukuran huruf dihitung dari XML.

**Warna**

- **S18. Satu warna sorot per grafik**: navy 051C2C untuk dasar, D9600B untuk yang disorot, DCE1E7 pembanding, A9B4C2 untuk sisanya. DNEMA memakai hitam untuk kondisi sekarang dan satu warna untuk pesan (s006); BAIN memucatkan seri yang tidak dibahas (s036), walau empat seri sorotnya berwarna berbeda. Periksa: tiap grafik paling banyak satu warna sorot di luar navy, abu, dan warna keluarga bencana.
- **S19. Satu keluarga bencana memegang satu warna di seluruh deck**, juga di dua grafik berdampingan yang berbagi satu legenda (`big4/png/deloitte-nema/s009.png`). Warnanya palet enam keluarga (`KEPUTUSAN.md` T6, `tema.json`), sama dengan DOCX karena kedua keluaran membaca token yang sama; jenis dalam satu keluarga dibedakan ikon (`PEDOMAN-DESAIN.md` §0.3, v1.1 butir c). Warna per jenis di laporan harian tidak berubah. Periksa: keluarga yang sama berwarna sama di semua slide.
- **S20. Sorot dengan bingkai, bukan isi warna baru**: bingkai D9600B 0,75 pt pada kolom, baris, atau sel yang disorot (`mbb/png/mck-wstc/s011.png`; BAIN membingkai sel yang berubah di `mbb/png/bain-sea/s029.png`). Periksa: penyorotan tidak menambah warna isi di luar palet.
- **S21. Label langsung di ujung seri bila paling banyak 4 seri**, dan label itu dihitung sebagai legenda; lebih dari 4 seri memakai legenda. BCOV s007 dan BAIN s036 melabeli 5 dan 10 seri langsung; batas 4 dipilih untuk kepadatan slide BNPB. Peta tetap wajib legenda ([Komponen](#komponen), Peta). Periksa: tiap warna punya label langsung atau entri legenda.

**Pilih grafik menurut pesan (slide)**

Pesan ditetapkan dulu, bentuknya mengikuti tabel ini dan tabel [Pilih grafik menurut pesan](#pilih-grafik-menurut-pesan). Jenis di G25 tetap dilarang.

| Pesan | Bentuk di slide | Bukti | Kode |
| --- | --- | --- | --- |
| Lonjakan antara dua titik waktu | Dua batang dengan kurung kelipatan atau persen D9600B di atasnya, ditulis id-ID ("2,5×", "turun 40%") | `mbb/png/bcg-covid/s008.png` | G1 |
| Jembatan dari kondisi kini ke sasaran lewat beberapa tuas | Waterfall dengan tuas berhuruf A–D dan 2–3 label rincian di bawah tiap batang; satuan fisik (jiwa, m³, rumah), bukan rupiah | `mbb/png/mck-lebanon/s0118.png`, `mbb/png/bcg-nycha/s043.png` | G10 |
| Wilayah dibandingkan dengan skala sama | Grafik atau peta kecil berganda bersumbu sama, satu sorot, baris selisih di bawah | `mbb/png/bcg-covid/s010.png`, `big4/png/kpmg-in/s019.png` | L33 untuk peta; grafiknya di luar daftar G, jadi alasannya ditulis di manifest (D-28) |
| Bahaya × wilayah atau sektor | Peta panas kelas diskret, legenda di atas, penjelasan per baris berupa label | `mbb/png/mck-wstc/s010.png` | G16 |
| Kewenangan per tingkat pemerintahan | Grid urusan × tingkat (pusat, provinsi, kab/kota, desa), sel berwarna tingkat, legenda | `mbb/png/bcg-nycha/s028.png` | G16 |
| Kesiapan wilayah × dimensi pada dua tahun | Matriks status 4 kelas, bingkai pada sel yang berubah, nomor bulatan yang dirujuk daftar temuan | `mbb/png/bain-sea/s029.png` | G16, G22 |
| Grafik dengan 3–4 sorotan | Bulatan nomor di ujung seri yang disorot, daftar temuan bernomor sama di panel yang sama | `mbb/png/bain-sea/s036.png` | G2 |
| Peringkat | Batang horizontal terurut, nilai di ujung, nomor dalam bulatan navy | `big4/png/deloitte-nema/s018.png` (urutan dan nilai; nomor bulatan dari G4) | G4 |
| Kemungkinan × dampak | Matriks 5×5 tint E6EAF0, nomor jenis dalam bulatan navy, tanpa titik merah | `mbb/png/mck-covid/s005.png` (kisi 3×3 berhuruf, disesuaikan) | G17 |
| Prioritas | Kisi 3×3 horizon × dampak berisi kode, daftar kode di panel yang sama, bila butirnya lebih dari 9 | `mbb/png/bain-sea/s051.png` (sebaran kontinu, disesuaikan jadi kisi) | G18 |
| Pilihan × kriteria | Tabel bersel kelas teks bertint (Tinggi, Sedang, Terbatas, Tidak berlaku) dengan legenda | `big4/png/deloitte-gsw/s011.png` (centang bertingkat, disesuaikan jadi kelas teks) | G16 |
| Upaya × dampak, ya atau tidak | Bulatan navy bercentang putih; sel kosong bila tidak | `mbb/png/bcg-covid/s021.png` | – |
| Rantai tahap | Kolom tahap berikon dalam lingkaran, dihubungkan chevron; baris "Kondisi kini" dan "Yang diperkirakan" | `mbb/png/mck-covid/s027.png` | G21 |
| Cakupan hitungan | Taksonomi kotak berwarna jenis, kotak A9B4C2 untuk yang tidak dihitung, legenda | `big4/png/deloitte-qra/s010.png` | – |
| Seri panjang dengan periode khusus | Garis dengan pita periode EEF5FC atau FBE7D6 dan garis rata-rata berpil navy | `mbb/png/mck-wstc/s002.png` | G2 |

**Matriks dan tabel**

- **S22. Matriks lembaga × fase.** Baris lembaga (ikon garis dan singkatan), kolom prabencana, tanggap darurat, pascabencana, lintas; sel berisi chip kode peran dan satu label kerja (`mbb/png/bcg-covid/s015.png`, yang selnya berupa kalimat). Sel kosong ditulis "–" berlegenda "tidak tercatat di peraturan yang dibaca", bukan "tidak berlaku", karena sel kosong di `lembaga/matriks_bencana.csv` berarti tidak ada kutipan peraturan. Slide isi memuat paling banyak 12 baris lembaga; matriks lengkap di lampiran. Periksa: nama lembaga dari `data/kajian-bnpb/data/lembaga/lembaga.csv`, dan tiap chip punya pasangan baris di `lembaga/peran.csv`.
- **S23. Tabel penanggung jawab.** Baris program × kolom lembaga; kepala kolom berupa ikon garis dan singkatan, bukan logo; sel berisi chip huruf peran navy; legenda huruf di atas tabel (`mbb/png/mck-lebanon/s1113.png`, pola R/A/S/C/I). Huruf peran mengikuti `data/kajian-bnpb/data/lembaga/README.md`: K koordinator atau penanggung jawab utama, P pelaksana atau pendukung, R penetap status, izin, atau norma, I informasi dan peringatan dini. Periksa: baris tanpa tepat satu K diberi bingkai D9600B (S20) dan jumlahnya sama dengan angka celah di judul; data tidak dipaksa punya satu K.
- **S24. Kondisi kini ke target.** Dua kolom "Kondisi <tahun>" dan "Target 2029", tanggal kondisi ditulis di kepala kolom (`mbb/png/bcg-nycha/s034.png`). Target resmi di paket data berakhir 2029 (`program-terbukti/renstra_bnpb_2025_2029.csv` kolom `t2025` sampai `t2029`; `renas_pb_2025_2029.csv` tidak memuat angka target). Kolom "Sasaran 2030" hanya dipasang bila naskah menetapkannya, dengan pil Asumsi kebijakan. Bentuk lain: baris indikator bersatuan × kolom garis dasar, 2027, 2029, dengan batang ringan dan angka di atasnya (`mbb/png/mck-lebanon/s0067.png`). Nilai yang belum ada ditulis "–" dengan catatan kaki. Periksa: tiap indikator bersatuan dan bersumber, dan tiap angka target punya kunci di `angka.json`.
- **S25. Tabel skenario.** Kepala kolom skenario memakai tint pita keluarga bencana skenarionya (`PEDOMAN-DESAIN.md` §B1.3): basah DCEBF8 (musim hujan, gelombang dan rob), kering F4ECDC (kekeringan), api FBE7D6 (karhutla), geologi F1E2D6, nonalam E3EDE8, sosial E6EAF0; skenario sekeluarga dibedakan label. Tint merah F8DDE0 tidak dipakai sebagai pembeda skenario, karena merah hanya untuk bahaya dan perlu perhatian. Baris dimensi berlabel blok F3F5F8, kesimpulannya di pita bawah (`mbb/png/bcg-covid/s013.png`). Periksa: urutan kolom skenario sama di semua slide skenario, dan tint tiap kepala kolom sama dengan tint keluarga skenarionya.
- **S26. Profil wilayah bertemplat sama.** Satu baris atau satu slide per wilayah dengan kolom dan urutan identik: 3–4 angka berwarna makna, pil status, 2 aksi berupa label (`mbb/png/mck-covid/s008.png`, `mbb/png/bain-sea/s134.png`). Wilayah fokus diblok FDF1E8. Periksa: kolom identik antarbaris dan antarslide.

**Peta**

- **S27. Label per wilayah berisi angka dan arah**, berupa pil putih bergaris abu dengan warna arah slide (naik D9600B, turun 2F86D1), di atas peta berlatar putih. MCOV memakai latar navy (`mbb/png/mck-covid/s007.png`) dan latarnya tidak ditiru. Segmen atau wilayah boleh diwarnai per strategi dengan legenda (`big4/png/deloitte-gsw/s024.png`, peta dasar satelitnya diganti latar putih). Aturan peta di [Komponen](#komponen) tetap berlaku.

**Rekomendasi, peta jalan, tata kelola**

- **S28. Rekomendasi tetap baris LANGKAH, RINCIAN, PENANGGUNG JAWAB** (d5), tanpa pita kepala. Dari konsultan ditambah nomor urut (DGSW 01–05 berupa angka besar, `big4/png/deloitte-gsw/s004.png`). Nomor ditaruh di lingkaran 26 pt navy, karena lima jenis aksi kajian (`tema.json` `kosakata.jenis_aksi`) tidak punya warna kanon; jenis aksi ditulis sebagai chip berikon, sama dengan DOCX (`PEDOMAN-DESAIN.md` §0.3, v1.1 butir e; bawaan, lihat Belum pasti). Pil status usulan di kolom LANGKAH: Sudah ada; Sudah ada, perlu dikembangkan; atau Usulan baru (`KEPUTUSAN.md` P7). Periksa: tiap baris punya nomor urut, chip lembaga berikon, dan pil status bertulisan sama dengan `kosakata.status_usulan`.
- **S29. Peta jalan tanpa Gantt.** Baris rekomendasi dikelompokkan dengan pita grup F3F5F8 per horizon: 100 hari, 2026–2027, 2028–2030 (`KEPUTUSAN.md` P4; label dari `kosakata.horizon`). Urutan fase dari MLEB s0143 dan DGSW s025 (tiga fase berurutan tanpa batang) dipakai; batang mingguan dan garis putus MLEB tidak. Periksa: tiap rekomendasi muncul tepat sekali di satu horizon.
- **S30. Tata kelola dan pelaporan**: bagan tiga lapis berikon (pengarah, koordinator, pelaksana) dengan 1–3 label peran, dan tabel pelaporan jenis × frekuensi × penanggung jawab × penerima (`mbb/png/mck-lebanon/s0147.png`, s1134; `mbb/png/mck-covid/s019.png`). Ditaruh di lampiran. Periksa: tiap lapis menyebut lembaga dari `lembaga.csv`.
- **S31. Pembiayaan berupa arsitektur sumber**: kolom per sumber (APBN, APBD, Dana Siap Pakai, dana bersama, KPBU) dengan ikon dalam lingkaran, baris "Kondisi" dan "Arah penguatan", tanpa nominal (`mbb/png/mck-wstc/s014.png`, yang memakai "Situation" dan "Levers to pull"; `KEPUTUSAN.md` P5). Kata "tuas" tidak dipakai sebagai label di slide. Periksa: tidak ada angka rupiah di slide program, peta jalan, dan pembiayaan.

**Penutup dan lampiran**

- **S32. Kesimpulan tetap pola d9**: 8 kartu dalam grid 4×2 dan pita ARAHAN D9600B yang memuat keputusan yang diminta dari Kepala BNPB. Penutup ditaruh sebelum lampiran, tanpa nama penyaji dan tanpa kartu kontak pribadi (bawaan, mengikuti penghapusan nama pejabat dan kartu kontak dari penutup laporan harian d3; P1 hanya melarang tim penyusun); nama lembaga tetap.
- **S33. Lampiran**: pembatas GELAP, kode "L1. " di depan judul karena huruf A sampai E sudah dipakai kode bagian (S10; bawaan U5, lihat Belum pasti dan [Belum diputus](#belum-diputus)). Di buku ini dan di `PEDOMAN-DESAIN.md` kode itu selalu ditulis "lampiran deck L1" supaya tidak terbaca sebagai aturan L1–L72 bab Selera laporan. Tabelnya native, paling banyak 24 baris per slide, dan dipecah "(lanjutan 2/5)" dengan baris dibagi rata (MLEB s0781 memakai "(1/5)"). Isinya rincian per wilayah, katalog program per kelas (`mbb/png/bcg-nycha/s055.png`), metode dan rekonsiliasi dengan baris "Data yang belum ada" (`big4/png/deloitte-qra/s011.png`), dan daftar singkatan dua kolom (`big4/png/deloitte-gsw/s033.png`). Periksa: nomor halaman lampiran benar, dan jumlah baris antarslide lanjutan berselisih paling banyak 1.

**Disiplin produksi (skill pemilik `alfatehan-pptx-rules`)**

- **S34. Pesan kunci dan garis besar sebelum membangun.** Tiap deck punya satu kalimat pesan kunci, dan spek deck memuat judul, pesan, dan visual tiap slide sebelum render (ghost deck). Garis besar itu dibaca berurutan seperti S6 sebelum satu bentuk pun digambar. Periksa: spek JSON tanpa `pesan_kunci`, atau slide tanpa `pesan`, ditolak (belum ada di `bangun/pptx/deck.py`).
- **S35. Variasi tata letak.** Dua slide isi berurutan tidak memakai jenis slide yang sama. Daftar `jenis` tertutup: `navigasi` (Pesan Kunci, Kesimpulan), `peta`, `grafik` (termasuk rantai tahap dan taksonomi cakupan), `tabel` (termasuk tabel peta panas dan profil wilayah), `matriks` (grid, matriks, dan kisi), `kartu-skenario`, `panel` (panel berpita kartu temuan), `rekomendasi`, dan `lampiran`. Jenis tiap slide kedua kajian ditulis di `PEDOMAN-DESAIN.md` §B7.4 dan §B7.5; daftar ini belum dipasang di `bangun/NASKAH-SPEK.md` dan `bangun/pptx/deck.py`. Dikecualikan: lampiran tabel, seri berchip (S12), dan profil wilayah bertemplat sama (S26), karena pola judul dan tata letak yang berulang memang dipakai pemilik di d5 slide 1–3. Periksa: `jenis` di luar daftar ditolak, dan urutan `jenis` di spek tidak berulang di luar pengecualian.
- **S36. Tiap slide bervisual.** Tiap slide isi memuat paling sedikit satu grafik native, tabel native (termasuk matriks dan kisi), atau gambar peta; grup kartu saja tidak cukup, dan tidak ada slide teks saja. Dikecualikan: slide navigasi (Pesan Kunci, Kesimpulan) yang berupa kisi kartu temuan, dan pembatas bab bila dipakai (T13). Periksa: tiap slide isi selain pengecualian itu memuat `a:tbl`, gambar peta dari daftar izin S37, atau grafik native yang tercatat di manifest generator.
- **S37. Grafik native.** Grafik batang, garis, dan tabel di slide dibuat dari bentuk dan tabel native seperti deck pemilik, dari data dan token yang sama dengan DOCX, supaya angkanya bisa disunting ([Prinsip](#prinsip)). Gambar raster hanya untuk peta dasar, foto, logo, dan ikon. Deck memakai PNG peta dasar dari render yang sama dengan DOCX, dengan lapisan label dan legenda dimatikan; pil wilayah, nomor, dan legenda dibangun native dari koordinat manifest peta (D-8), karena penanda dan label peta wajib native ([Prinsip](#prinsip)) dan penanda yang dibakar ke PNG adalah cacat d4. Periksa: gambar raster di slide hanya dari daftar izin itu, dan PNG peta di slide tidak memuat teks (SVG sumbernya tanpa elemen `text`).
- **S38. Paling banyak 6 butir per daftar**, idealnya 3–4, dan paling banyak 2 tingkat. Pita bawah tetap 3–4 kolom. Periksa: hitung butir per kotak teks.
- **S39. Laporan QA per deck belum dibangun.** Skill meminta laporan per deck berisi font, ikon, tata letak, dan anti-AI. Yang ada: `bangun/pptx/periksa.py` (D-1 sampai D-4, D-8, D-9, D-10, D-17, D-22, D-24, batas 6 pt, footer, nomor halaman) dan `qa/periksa.py` (status LOLOS, GAGAL, LEWAT, atau TAK per kode D). Bawaan: pemilik laporan deck adalah `bangun/pptx/periksa.py`, ditulis ke `keluaran/qa/`, dengan kosakata vonis LOLOS dan GAGAL seperti `qa/periksa.py`; LULUS, GAGAL RINGAN, dan GAGAL BERAT hanya untuk pindaian anti-AI per bab ([Angka & copy](#angka--copy)). Sampai laporan itu dibangun, keluaran kedua berkas dan render yang dibaca per slide ([Alur kerja](#alur-kerja) langkah 3–4) dicatat tangan, dan aturannya belum jadi menurut standar uji pemilik.

Yang sudah sejalan dengan skill dan tidak menambah aturan: slide master dari deck pemilik, ikon PNG tanpa emoji, margin 43,2 pt, serta render lalu periksa ulang. Em dash di slide tetap nol walau skill membolehkan satu per slide, dan tiga-serangkai tetap dilarang.

**Yang sengaja tidak ditiru**

| Pola | Deck dan bukti | Alasan |
| --- | --- | --- |
| Panel gelap atau berfoto di samping, judul memenuhi kolom kiri | MCOV s014 dan s020, MWSTC s003 dan s007, BCOV s023, MLEB s0067 (kolom hijau pekat) | Satu topik satu kontainer; judul di kotak atas paling banyak 2 baris |
| Kotak takeaway abu terpisah dari grafiknya | MCOV s010 | Temuan digabung ke panel putih yang sama |
| Judul di pita abu selebar slide | BCOV s007 | Judul di atas putih dengan garis 0,75 pt di y95 |
| Judul 3 baris atau lebih | DNEMA s006 (5 baris di kolom sempit) dan s018, MWSTC s002 | Paling banyak 2 baris |
| Serif Bower, Arial, huruf Light | MCOV, BNYC, DQRA, DGSW | Hanya Roboto, bold untuk judul |
| Huruf di bawah 6 pt | BCOV 5,3 pt, BAIN 5–5,8 pt | Batas bawah 6 pt |
| Watermark dan stempel diagonal | MLEB ("Internal", ILLUSTRATIVE di s0143) | Merusak keterbacaan; status ditulis sebagai pil keyakinan (S15) |
| Pembatas bagian berupa foto, kutipan anonim, atau blok warna | DNEMA s004 dan s016, DQRA s003, KPMG s010, pembuka bab DGSW | Slide tanpa data; pembatas hanya layout GELAP (T13) |
| Venn, lingkaran sebab-akibat berfoto, objek 3D, ilustrasi, foto stok | MLEB s0666 dan s0011, MWSTC s009, BAIN s019, KPMG s013 dan s047 | Dekoratif; gambar hanya foto lapangan, peta dasar, logo, dan ikon |
| Kolase gambar mini slide kerja | BNYC s052 | Tidak terbaca di layar pimpinan |
| Logo mitra di sampul atau footer | BNYC s001, BAIN | Footer BNPB baku; deck lembaga sendiri |
| Sampul blok hitam, penutup kartu metadata, kredit nama penulis | DNEMA s001 dan s019, DGSW s031 | Sampul dan penutup mengikuti bab ini, tanpa nama orang |
| Peta berlatar navy atau citra satelit | MCOV s007, DQRA s006 dan s021, DGSW s024 | Peta berlatar putih, legenda wajib |
| Batang bertumpuk 6 warna, donat 7 irisan | DNEMA s005, DQRA s004 | Satu warna sorot; G25 |
| Gantt mingguan dan mini-Gantt | MLEB s0143, BNYC s054 | Gantt dibuang dari slide rekomendasi d5; peta jalan memakai S29 |
| Angka biaya: tabel proyek beranggaran, waterfall anggaran, garis batas dana | MLEB s1070, BNYC s042 dan s043, MWSTC s004 | Tanpa pagu dan biaya proyek (`KEPUTUSAN.md` P5); strukturnya dipakai dengan satuan fisik |
| Nama strategi bergaya slogan dan pita "Stop / Start" | DGSW (Go Forward, Defend, Restructure), BCOV s003 (Flatten, Fight, Future), KPMG s049 | Bahasa lugas tanpa slogan dan tanpa kontras retoris; pakai istilah undang-undang dan label "Kondisi 2025" dan "Target 2029" |
| Merah atau tiga warna sebagai penekanan teks | MLEB s0007, MCOV s005 (titik sorot merah), BNYC s042 (lingkaran merah) | Merah hanya untuk bahaya dan perlu perhatian; satu warna sorot D9600B |
| Rating centang bertingkat | DGSW s011 | Diganti sel kelas teks bertint, sejalan dengan bab Selera laporan |
| Pemisah "\|" di dalam baris isi | MCOV s018 | Diganti chip label |
| Label vertikal di tepi kiri, kata "Contents" vertikal besar | BAIN s036, MCOV s004 | Memakan margin 43,2 pt; dekoratif |
| Format potret, kepadatan 300–1.300 kata | KPMG, DGSW, DQRA | Deck 960×540 pt, 180–290 kata |

**Bentrok dengan keputusan pemilik**

| Pola konsultan, usulan bedah, atau aturan skill | Aturan pemilik yang berlaku |
| --- | --- |
| Slide ringkasan temuan sesudah sampul (DNEMA s003, MCOV s003, BCOV s005) | d9 Versi Utama tidak punya slide ini (sampul, 4 temuan, Kesimpulan, Terima kasih). Slide Pesan Kunci diambil dari `PEDOMAN-DESAIN.md` §B7, bukan vonis pemilik (S1, Belum pasti) |
| Slide daftar isi atau pembatas bab berulang (MCOV s004 dan BCOV s006 gelap, BNYC s009 putih) | GELAP hanya untuk penutup, pembatas Lampiran, dan pembatas bab bila dipakai (T13). Deck kajian sekitar 12 slide isi tanpa pembatas bab dan tanpa slide pelacak (S10, S11) |
| Tab atau label bab di kiri atas (MLEB) atau kanan atas (BCOV s021, s023) | Kotak judul di x43,2 y21,6, pil CUT OFF di x≈696 y≈70, dan logo di (889,4; 28,8) tidak digeser; posisi ditandai kode bagian di depan judul (T12) |
| Peta jalan berbatang per minggu atau bulan (MLEB s0143, BNYC s054) | Gantt dibuang dari slide rekomendasi d5, dan `PEDOMAN-DESAIN.md` §B7 tidak membawa tabel tahap × horizon ke deck; peta jalan berupa pita grup horizon (S29) |
| Tabel proyek dengan pagu, jembatan anggaran, garis batas dana (MLEB s1070, BNYC s042, MWSTC s004) | Tanpa pagu dan biaya proyek (P5, `PEDOMAN-DESAIN.md` K6). Tabel proyek memakai kapasitas fisik (tampungan, luas layanan); waterfall memakai jiwa, m³, atau rumah |
| "TBC" atau "NA" untuk nilai yang belum pasti (MLEB s0067) | Deck kajian menulis "–" dengan catatan kaki (`PEDOMAN-DESAIN.md` §0.3 butir b). "NA" tetap di templat Penanganan |
| Kolom "Key observations" atau kotak takeaway terpisah (MCOV s010, BNYC s028, BAIN s029) | Satu topik satu kontainer; kolom temuan di panel putih yang sama |
| "Note: n = …" dan "Source: …" di dasar panel grafik (DNEMA s006, MCOV, BAIN) | Baris sumber di bawah grafik dibuang (d5); catatan dan sumber pindah ke zona catatan kaki slide (S14) |
| Kepala panel berwarna atau kartu 2×2 berkepala tint untuk rekomendasi (BAIN s130, BNYC blok hijau) | Slide rekomendasi tanpa pita kepala panel (d5); panel berpita tetap boleh di slide analisis |
| Rating centang bertingkat (DGSW s011) | Penilaian bergambar diganti pil atau sel kelas teks (bab Selera laporan, Yang sengaja tidak ditiru) |
| Merah sebagai sorot | Merah hanya untuk bahaya dan perlu perhatian |
| Peta latar gelap atau satelit | Peta berlatar putih tanpa laut biru |
| Huruf 5–5,8 pt, serif, judul 3–5 baris | Batas 6 pt, Roboto saja, judul paling banyak 2 baris |
| Grafik deck memakai PNG yang sama dengan DOCX (draf bedah; `PEDOMAN-DESAIN.md` §A5 v1.2) | Grafik di slide native dari data yang sama ([Prinsip](#prinsip), S37); hanya peta dasar, foto, logo, dan ikon yang berupa gambar |
| Judul 36–44 pt (skill `alfatehan-pptx-rules`) | Judul 19–26 pt, paling banyak dua baris ([Judul](#judul)) |
| Isi 14–16 pt, keterangan 10–12 pt (skill) | Skala padat deck BNPB: isi 7,2–11 pt, batas bawah 6 pt; slide 180–290 kata |
| Jarak antarblok 0,3–0,5 inci (skill) | Jarak kartu 7,2 pt, antarpanel 10,8 pt, antargrup 21 pt |
| Larangan garis di bawah judul (skill) | Garis 0,75 pt selebar isi di bawah judul adalah kerangka rumah BNPB; yang dilarang garis aksen pendek berwarna |
| Em dash paling banyak satu per slide (skill) | Em dash nol ([Angka & copy](#angka--copy)) |
| Mesin PptxGenJS (skill) | Pembangun memakai templat XML deck pemilik (`data/kajian-bnpb/bangun/pptx/templat/templat-bnpb.pptx`) supaya master identik; prinsip native tetap dipakai |
| Variasi tata letak tanpa pengecualian (skill) | Seri berchip dan profil wilayah bertemplat sama boleh berurutan, seperti d5 slide 1–3 (S35) |

**Cara memeriksa**

Ditambahkan ke langkah 4 [Alur kerja](#alur-kerja) untuk deck kajian. Gerbang mesinnya belum lengkap: `data/kajian-bnpb/bangun/pptx/periksa.py` per 23 Okt memeriksa D-1 sampai D-4, D-8, D-9, D-10, D-17, D-22, D-24, batas huruf 6 pt, footer, dan nomor halaman. Sampai butir di bawah masuk ke berkas itu bersama uji dirinya, pemeriksaannya manual dan aturannya belum jadi menurut standar uji pemilik.

1. Judul slide isi diekstrak berurutan dari `ppt/slides/*.xml`: tidak ada dua judul yang sama setelah angka dibuang; selama bawaan T11 berlaku, tiap slide bagian A sampai D berspek `judul: temuan`, tiap judul berspek itu memuat token angka, dan angka itu muncul lagi di badan slide (S6–S8).
2. Kode dan label bagian di Pesan Kunci identik dengan kode bagian di slide isi; jumlah temuan sama dengan jumlah bagian (S2, S10).
3. Tiap angka tampil tertutup tepat satu label keyakinan yang sama dengan `angka.json`; tiap slide berangka selain slide baris rekomendasi punya satu baris Sumber; superskrip berpasangan dan tinggi kotak catatan kaki ≤ 22,6 pt (S14, S15).
4. Per grafik paling banyak satu warna sorot; tiap warna punya label langsung atau entri legenda (S18–S21).
5. Baris tabel penanggung jawab tanpa tepat satu K berbingkai dan terhitung; tiap rekomendasi muncul sekali di satu horizon dan punya nomor, chip lembaga, dan pil status (S23, S28, S29).
6. `grep` untuk "Rp" dan "rupiah" di slide program, peta jalan, dan pembiayaan hasilnya nol (S31).
7. Satu tanggal dan jam di semua pil CUT OFF, dan slide usulan berangka ikut berpil (S16).
8. Spek deck memuat `pesan_kunci`, lalu `pesan`, `judul`, dan `jenis` tiap slide; `jenis` dari daftar tertutup S35 dan tidak berulang berurutan kecuali pengecualian S35 (S7, S34, S35).
9. Tiap slide isi selain slide navigasi dan pembatas bab memuat grafik native, tabel native, atau gambar peta; gambar raster hanya peta dasar, foto, logo, dan ikon, dan PNG peta tanpa teks; paling banyak 6 butir per kotak teks (S36–S38).
10. Keluaran `bangun/pptx/periksa.py` dan `qa/periksa.py` LOLOS semua dan dicatat sebagai laporan deck sebelum dikirim (S39).

**Belum pasti**

- Judul slide temuan deck kajian: bawaan T11 berupa kalimat temuan. Bila pemilik memilih judul deskriptif seperti deck wilayah, angka pindah ke kartu angka dan pemeriksaan S7–S8 gugur.
- Slide Pesan Kunci sesudah sampul (bawaan, `PEDOMAN-DESAIN.md` §B7) atau langsung ke temuan seperti d9 Versi Utama.
- Kode temuan Pesan Kunci di deck. DOCX memakai kode "Temuan A.1" menurut pertanyaan pimpinan, sementara kode bagian deck juga berhuruf ("A1. ", T12). Bawaan: kartu temuan ke-n memakai kode bagian ke-n, dan kode DOCX ditulis lengkap "Temuan A.1" sebagai chip kecil di kartu temuan.
- Kode lampiran deck kajian. Bawaan: "L1. ", karena pola d9 ("A1. ") kini dipakai kode bagian (T12).
- Lingkaran langkah rekomendasi deck kajian: navy bernomor dengan chip jenis aksi (bawaan, S28) atau berwarna jenis aksi seperti d5.
- Peta jalan sebagai pita grup horizon di slide rekomendasi (bawaan) atau satu slide tiga panel horizon tanpa batang.

### Yang dilarang atau sudah dihapus

- **Penghapusan pemilik di d5** (*"Hilangkan"*, *"Gausah ada ini"*):
  - baris sumber di bawah grafik dan catatan kaki tentang luas;
  - "H+1" dan baris "Hasil";
  - Gantt, dan pita kepala di slide rekomendasi;
  - "(BPBD Jatim)", "Siaga Darurat" di subjudul, dan "29 Oktober" di kepala indikator;
  - kalimat ringkasan di pita grafik;
  - kolom dan kartu fire spot, serta kartu "Manual";
  - satu slide utuh (*"Slide 5 buang"*).
- **Panel gelap di samping**: *"Gausah ada yang gini di samping... Informasinya digabung aja sama yang lain di bagian yang putih"*.
- **Dihapus dari laporan harian, d1 ke d3:**
  - kartu KPI datar, dan pil jenis di bawah label peta;
  - status ketiga "belum selesai" yang merah;
  - kalimat deskripsi di daftar perlu perhatian;
  - kartu aksi keempat. Panel Bencana lainnya dan baris TOTAL kekeringan sempat hilang di d3, lalu dipasang kembali oleh pemilik pada 23 Okt;
  - desimal dan keterangan periode di tiap sel;
  - nama pejabat dan kartu kontak di penutup.
- **Cacat yang tidak boleh terulang:**
  - teks terpotong "…" (d4: 5 dari 6 baris);
  - penanda peta yang dibakar ke PNG (d4);
  - garis footer yang hanya 266 pt (d2, d4);
  - label bertumpuk (d7 A1: "389,39" di bawah "14%");
  - data operasi basi tanpa tanda (d6 s3 masih 21 Okt);
  - penunjuk "Lampiran mulai halaman 13" di deck 4 slide (d3 s4).
- **Titik tengah yang masih tersisa di d5**: strip komposisi s2 ("216 titik · 55%"), callout peta s3, dan pil preseden s4 ("2021 · Kota Batu"). Ini dibetulkan di deck berikutnya, termasuk teks yang dibakar ke PNG peta.

### Alur kerja

1. **Tentukan jenis deck dan buka render deck acuannya** sebelum menulis kode. Kalau pemilik menunjuk deck lama, yang disalin deck itu.
2. **Kumpulkan angka.** Data karhutla dari website, catat jam tarikannya untuk pil CUT OFF. Fakta lapangan dari laporan BPBD atau Koordalops.
3. **Render sendiri sebelum dikirim**: `soffice --headless --convert-to pdf`, lalu `pdftoppm -png -r 72`. Setiap halaman dibaca dengan Read. Laporan "sudah rapi" tanpa melihat PNG tidak dihitung sebagai bukti.
4. **Cek mekanis dari XML dan PNG:**
   - judul paling banyak 2 baris;
   - kotak teks, label, dan bulatan peta tidak beririsan;
   - tidak ada "…";
   - `grep` untuk `·` dan `—` di `ppt/slides/*.xml` hasilnya nol;
   - huruf terkecil 6 pt atau lebih, kecuali persen tabel;
   - isi berjarak 7 pt atau lebih dari tepi bawah panel;
   - setiap warna dan bulatan punya legenda;
   - angka sama antarslide;
   - nomor halaman lampiran benar.
5. **Kirim berkasnya langsung.** PPT didahulukan dari pekerjaan website (pedoman 21 Okt). Setiap koreksi pemilik masuk ke Riwayat buku ini lalu ke bab ini.

### Belum pasti

- Pengungsi gempa yang sudah masuk masa transisi tidak tercantum sebagai kejadian menonjol di d3. Ini masih inferensi.
- Penutup Presiden (d9 s7) masih memuat nama penyaji dan kartu kontak, padahal d3 menghapusnya dari laporan harian.
- Generator `/laporan-bnpb` disesuaikan ke d3 atau tidak.
- Belum padam: merah (deck wilayah) atau oranye (templat BNPB) disatukan atau tidak.

## Selera laporan (DOCX/PDF) dan visualisasi data

Dari tata letak JAPFA REPORT yang diukur di `data/kajian-bnpb/SPESIFIKASI-GAYA.md` dan bedah 22 laporan kelas dunia pada 23 Okt: World Bank, ADB, IMF, McKinsey, BCG, Deloitte, IPCC, UNDRR, WMO, OECD, UNICEF, pemerintah Jepang, Inggris, dan Belanda, Our World in Data, dan Financial Times. Pemilik: *"Tiru style mereka dan implementasikan untuk sempurnakan system kita."* Bukti PNG dan vonis tiap pola ada di `data/kajian-bnpb/riset/desain-benchmark/SINTESIS.md`; kode P (pola) dan G (pilih grafik) di bab ini merujuk ke sana. Ukuran, token, dan gerbang mesin ada di `data/kajian-bnpb/PEDOMAN-DESAIN.md`. Aturan [Angka & copy](#angka--copy) serta palet, ikon, dan arah naik-turun di [Selera presentasi (PPT)](#selera-presentasi-ppt) berlaku penuh dan tidak diulang. Bila pola dunia bentrok dengan aturan pemilik yang tertulis, aturan pemilik yang berlaku; bentroknya dicatat di bawah.

### Laporan acuan

| Kode | Laporan | Yang diambil |
| --- | --- | --- |
| JAPFA | JAPFA REPORT, IFSR, Sep 2024 | Tata letak halaman, kepala, kaki, keterangan di atas objek, urutan bagian depan |
| CCDR | World Bank, Indonesia Country Climate and Development Report 2023 | Kalimat pembuka tebal, kartu rekomendasi berkode, kisi prioritas, kronologi regulasi, peta satu warna sorot |
| WS45 | World Bank dan Bappenas, Indonesia Vision 2045: Toward Water Security 2021 | Pilar, aksi, dampak bila tidak ditangani, matriks rekomendasi berlembaga |
| ATLAS | World Bank, Atlas of SDGs 2018 | Keterangan berupa temuan, anotasi langsung di grafik, satu warna ditambah abu |
| MGI, MGIA, CWF | McKinsey Global Institute 2020 (global dan Asia), Charting Our Water Future 2009 | Anatomi exhibit, peta kecil berganda, dasbor wilayah bertemplat, waterfall kesenjangan air |
| WMO, OECD, IPCC, GAR | State of the Climate in Asia 2024, Global Drought Outlook 2025, AR6 WGII SPM, GAR 2025 | Halaman pesan kunci berikon, paragraf berkalimat tebal, temuan bernomor, matriks titik, skenario berlapis |
| NRR, DELTA, NANKAI, JWP | National Risk Register 2026, Deltaprogramma 2026, Nankai Trough 2025, White Paper Jepang 2025 | Matriks kemungkinan × dampak, studi kasus empat pertanyaan, tabel skenario, efek tindakan, tabel preseden |
| FTVV, OWID | Financial Times Visual Vocabulary, Our World in Data | Pilih grafik menurut pesan, normalisasi per kapita, catatan bias pelaporan |

### Tata letak laporan (pola JAPFA dalam palet BNPB)

- **L1.** A4 tegak, satu kolom isi selebar 165 mm. Margin kiri 25 mm, kanan 20 mm, atas 25 mm, bawah 20 mm. Margin JAPFA (1,1 cm dan 0,8 cm) terlalu mepet dan tidak ditiru.
- **L2.** Isi Roboto 10,5 pt, spasi 1,15, 6 pt sesudah paragraf, rata kiri-kanan, warna 1A1A1A. Hanya Roboto, termasuk font tema DOCX; Regular dan Bold saja.
- **L3.** Kepala halaman di semua halaman kecuali sampul: garis tegak D9600B 2 pt × 7 mm di kiri, baris 1 judul pendek kajian 8 pt Bold, baris 2 "BNPB | Oktober 2026" 8 pt, logo BNPB resmi setinggi 8 mm di kanan tanpa lingkaran, lalu garis 0,75 pt 1A1A1A selebar isi.
- **L4.** Kaki halaman: garis 0,5 pt BFC5CC selebar isi, alamat BNPB dua baris 8 pt rata tengah (`KEPUTUSAN.md` T4), nomor halaman 9 pt Bold di kanan dari bidang PAGE Word. Kata "H a l a m a n" yang direnggangkan di JAPFA tidak ditiru.
- **L5.** Sampul tanpa nomor, bagian depan romawi kecil, Bab 1 mulai angka 1. Bab selalu mulai halaman baru.
- **L6.** Bagian depan berurutan: Sampul, Kolofon, Kata Pengantar, Daftar Isi, Daftar Tabel, Daftar Gambar, Daftar Lampiran, Daftar Singkatan, Ringkasan Eksekutif. Ucapan Terima Kasih dan Tim Penyusun milik JAPFA tidak dipasang (penerbit BNPB saja).
- **L7.** Daftar Isi dari bidang TOC Word sampai tingkat 1.1.1, titik penuntun ke nomor halaman rata kanan. Daftar Tabel, Gambar, dan Lampiran dari Caption Word. Semua indeks diperbarui sebelum ekspor PDF, supaya tidak tercetak kosong.
- **L8.** Judul bab mengikuti `KEPUTUSAN.md` T1 ("BAB 1 PENDAHULUAN"), subbab ke bawah huruf judul, warna 051C2C, paling banyak dua baris. Kapital berspasi di luar itu hanya untuk pil bagian, kepala kolom, dan label pita.
- **L9.** Penekanan dalam isi Bold 051C2C; istilah asing miring; tanpa garis bawah hiasan.
- **L10.** Keterangan objek di atas, "Sumber:" di bawah (pola JAPFA); rinciannya di Anatomi gambar dan tabel.
- **L11.** Pustaka APA 7 urut abjad dengan inden gantung. Lampiran berkode huruf ("Lampiran A. Tabel indikator 119 kab/kota"), tabel di dalamnya "Tabel A.1"; data per kab/kota ikut diserahkan sebagai .xlsx.
- **L12.** Sampul: foto Wikimedia Commons beratribusi di atas, blok navy 051C2C di bawah dengan judul putih, garis aksen oranye, logo BNPB berwarna di bidang putih; tanpa kepala, kaki, dan nomor. Sampul belakang navy memuat alamat BNPB.
- **L13.** Satu angka, satu sumber: angka di judul, kartu, tabel, peta, dan teks dibaca dari JSON yang sama, tidak diketik tangan. Jumlah halaman, keluaran, dan nama berkas mengikuti `KEPUTUSAN.md`.

### Pola laporan kelas dunia yang dipakai

**Ringkasan dan alur**

- **L14.** Halaman pertama Ringkasan Eksekutif adalah Pesan Kunci: kalimat tesis, lalu 6–8 temuan bernomor. Tiap temuan berupa ikon putih dalam lingkaran navy dan satu temuan berangka paling banyak 3 baris, angka di depan (WMO; P16).
- **L15.** Temuan berkode huruf menurut pertanyaan pimpinan dan selalu ditulis lengkap ("Temuan A.1", "Temuan B.2"), supaya tidak tertukar dengan "Tabel A.1" di lampiran (L11). Tiap temuan ditutup label keyakinan dan rujukan "(Bab 5.2)" (IPCC; P18). Kotak ringkasan bab dan kolom Dasar di matriks rekomendasi menyebut kode yang sama.
- **L16.** Paragraf temuan Ringkasan Eksekutif dan semua paragraf isi bab analisis (Bab 4–7 kajian air, Bab 4–10 kajian mitigasi) memakai gaya Isi Temuan: dibuka satu kalimat Bold 051C2C yang memuat angka, tempat, dan tahun, paling banyak 2 baris (OECD, CCDR; P17). Paragraf keputusan yang diminta dan yang belum diketahui memakai gaya Isi biasa.
- **L17.** Tiap bab dibuka kotak ringkasan bab: Temuan (paling banyak 3, berangka), Angka kunci (paling banyak 3, bersumber), Rekomendasi (nomor) (WDR, Deloitte; P6).
- **L18.** Bab Grand Design dibuka satu halaman kerangka: pilar, sasaran, program bernomor. Kode program dipakai ulang di matriks, tabel indikator, dan rekomendasi (BCG; P2).
- **L19.** Kajian air memakai urutan pilar, aksi bernomor, kotak "Dampak bila tidak ditangani" berangka, lalu aksi 100 hari berlembaga (WS45; P3, P58).
- **L20.** Satu ancaman satu kartu skenario berkepala tetap (NRR; P4). Satu provinsi satu dasbor bertemplat identik, di lampiran (MGIA; P5).
- **L21.** Studi kasus satu halaman bertint F3F5F8 dengan pil STUDI KASUS dan empat label tetap: Masalah, Pelaksana, Cara, Hasil. Judulnya hasil berangka (Deltaprogramma, BCG; P69, P24).
- **L22.** Angka yang berbeda dari dokumen lama ditaruh di kotak "Perbandingan dengan kajian sebelumnya" di samping tabel rekonsiliasi (Deloitte; P71).
- **L23.** Gambar dan tabel dirujuk lewat cross-reference Word ("lihat Gambar 5.2"), tidak diketik (BCG; P14).
- **L24.** Wilayah dikelompokkan per tipe dengan pita grup E6EAF0, lalu rekomendasi per tipe (MGIA, Nankai; P104). Tipe tidak diberi warna sendiri.

**Ketidakpastian dan skenario**

- **L25.** Angka model ditulis sebagai rentang rendah–tinggi dengan titik tengah. Data digambar garis solid, proyeksi garis putus, estimasi arsir, dan pil "belum diuji balik" dipasang di kanan atas gambar (Atlas, ADB; P54–P56).
- **L26.** Skenario dibandingkan lewat tabel berkolom skenario dengan sel digabung bila nilainya sama (Nankai; P60), atau small multiples selisih dari skenario dasar (IMF; P57).
- **L27.** Perkiraan lama dan baru berada di satu tabel: rentang "sekitar", asumsi tertulis di bawah nilai, stempel skenario (Nankai; P59).
- **L28.** Angka kebijakan digambar sebagai pasangan batang "kondisi sekarang" lawan "bila target tercapai", berlabel "turun 70%" dengan ikon arah biru (Nankai; P61).
- **L29.** Profil ancaman memakai matriks kemungkinan × dampak 5×5 bertint E6EAF0 seragam dengan nomor ancaman dalam bulatan navy; angka Bold polos bila satu sel memuat lebih dari 3 nomor; tiap kartu skenario memuat matriks mini dengan garis silang rentang keyakinan (NRR; P62).

**Rekomendasi**

- **L30.** Tiap rekomendasi berkode dan memuat aksi Bold paling banyak 8 kata, lembaga pemimpin, pendukung, tahun, indikator selesai, dan dasar (kode temuan, regulasi). Urgensi dibaca dari pil horizon (100 hari, 2026–2027, 2028–2030), bukan pil terpisah (CCDR, WS45; P75, P76). Rekomendasi berbentuk prosa tanpa penanggung jawab tidak dipakai.
- **L31.** Bila rekomendasi lebih dari 9, satu halaman prioritas berupa kisi 3×3 horizon × dampak yang berisi kode saja dalam pil navy, tanpa warna bertingkat; nama rekomendasi di daftar samping (CCDR; P77).
- **L32.** Kronologi regulasi berupa tabel native tiga kolom dua sisi (CCDR; P85).

**Peta**

- **L33.** Peta kecil berganda untuk tahun, skenario, atau komponen berbagi satu legenda dan satu skala kelas (MGI, OECD; P43).
- **L34.** Koroplet hanya untuk rasio dan indeks. Total dan jumlah memakai bulatan sebanding dengan legenda tiga ukuran (FT; P46).
- **L35.** Peta indeks studi kasus: bulatan bernomor di peta dan nomor yang sama di tabel di bawahnya (MGI; P44). Koroplet boleh bersanding dengan tabel peringkat yang warnanya sama (White Paper Jepang; P45). Wilayah sungai di peta strategi dibedakan nomor dalam bulatan navy, tanpa warna per wilayah; kalimat arahnya di tabel di bawah peta (Deltaprogramma; P49).
- **L36.** Kawasan padat diberi inset perbesaran, misalnya Jabodetabek dan Semarang–Demak (OECD; P47). Sorot satu kategori memakai oranye atau biru di atas daratan abu, tidak merah (CCDR; P42). Kelas IRBI memakai skala oranye untuk semua bahaya (`KEPUTUSAN.md` T8); warna keluarga hanya untuk indeks platform.

### Pilih grafik menurut pesan

Pesan ditetapkan dulu, grafik mengikutinya. Grafik di luar daftar ini butuh alasan tertulis.

| No | Pesan | Grafik | Bukti |
| --- | --- | --- | --- |
| G1 | Perubahan waktu, paling banyak 24 periode | Batang tegak ujung membulat, nilai di atas, tanpa sumbu Y | Gaya rumah d3/d5; WDR hanya untuk nilai di atas batang |
| G2 | Perubahan waktu, seri panjang | Rata-rata per dekade sebagai batang, atau garis berlabel ujung dengan anotasi kejadian dan paling banyak 3 garis acuan | OWID, White Paper Jepang, IMF |
| G3 | Musim berjalan lawan normal | Kurva tahun berjalan di atas pita median historis | Gaya rumah; ADB hanya untuk pita persentil |
| G4 | Peringkat | Batang horizontal terurut, nomor dalam bulatan navy, kolom jiwa terpapar | Gaya rumah d5; Atlas hanya untuk urutan |
| G5 | Peringkat seluruh wilayah | Satu deret batang terurut, nama hanya untuk yang disorot | Charting Our Water Future |
| G6 | Dua titik waktu per wilayah | Dumbbell terurut, titik awal DCE1E7, selisih ditulis | Atlas |
| G7 | Surplus atau defisit, anomali | Batang divergen dari nol berlabel kata; di kajian air 2E3440 lawan DCE1E7, bukan warna arah, supaya surplus tidak terbaca oranye | FT |
| G8 | Komposisi | Batang bertumpuk 100%, paling banyak 4 kategori ditambah "lainnya" | Atlas, BCG |
| G9 | Komposisi per skenario atau tahun | Batang bertumpuk per skenario, total di atas | GAR, Deloitte |
| G10 | Kesenjangan kebutuhan lawan pasokan | Waterfall atau baji dalam m³, pil selisih | Charting Our Water Future |
| G11 | Proyeksi dengan rentang | Pita melebar, garis tengah navy, angka rentang tertulis | FT, IMF |
| G12 | Rentang per wilayah atau skenario | Batang rentang mengambang dengan median | ADB, MGI |
| G13 | Skenario lawan dasar | Small multiples selisih dari skenario dasar; di kajian air 2E3440 lawan DCE1E7 berlabel "membaik"/"memburuk" | IMF |
| G14 | Efek tindakan | Pasangan batang sebelum dan sesudah, label "turun …%" | Nankai |
| G15 | Rugi bila diam lawan manfaat bertindak | Batang kupu-kupu, dua skenario | WS45 |
| G16 | Wilayah × kategori | Matriks titik atau tabel peta panas kelas diskret dengan angka tertulis | IPCC, ADB, MGI |
| G17 | Kemungkinan × dampak | Matriks 5×5 tint netral, nomor dalam bulatan | NRR (nomor polos); bulatan dari gaya rumah d5 |
| G18 | Prioritas | Kisi 3×3 horizon × dampak berisi kode, bila rekomendasi lebih dari 9 | CCDR |
| G19 | Sebaran rasio atau indeks | Koroplet 5 kelas diskret; kelas IRBI skala oranye (T8) | Atlas, FT |
| G20 | Sebaran total | Bulatan sebanding berlegenda | FT, Atlas |
| G21 | Aliran | Aliran fisik bersumber (m³ air per sektor): Sankey paling banyak 3 tingkat. Aliran dana dan tanggung jawab: diagram aliran berikon tanpa lebar sebanding, karena lebar Sankey adalah besaran dan nominal proyek dilarang | ADB, WS45, MGI |
| G22 | Capaian lawan target | Bullet chart atau tabel status lawan target | FT, White Paper Jepang |
| G23 | Kapan dan berapa lama | Kolom WAKTU berpil horizon di matriks rekomendasi (tabel tahap × tahun hanya bila pemilik setuju, lihat Belum pasti), kronologi dua sisi | Deltaprogramma, CCDR |
| G24 | Respons antar-kejadian | Garis bersumbu "hari sejak kejadian" | White Paper Jepang |
| G25 | Dilarang | Pai lebih dari satu pangsa, donat, sumbu ganda, radar, chord, streamgraph, violin, Voronoi, area bertumpuk lebih dari 4 kategori, 3D, lingkaran konsentris, ikon dekoratif sebagai grafik, kurva biaya | White Paper Jepang, UNICEF, WS45, Deltaprogramma, Charting Our Water Future |

### Anatomi gambar dan tabel

**Gambar**

- **L37.** Urutan dari atas: keterangan, pil kanan atas bila ada, grafik atau peta, baris "Sumber:", lalu "Catatan:" bila ada (MGI; P32).
- **L38.** Keterangan 9 pt rata tengah: label "Gambar 5.2" Bold 051C2C, satu spasi, lalu judul deskriptif yang stabil berisi besaran, tempat, dan periode: "Gambar 5.2 Kejadian banjir per kabupaten/kota di Pulau Jawa, 2015–2025 (kejadian)". Paling banyak 2 baris, tanpa titik dua, tanpa angka hasil yang berubah tiap pembaruan data, supaya Daftar Gambar stabil. Satuan ditulis dalam kurung di akhir bila tidak ada di legenda. Kalimat temuan berangka dari gambar itu ditulis sebagai kalimat pembuka tebal paragraf yang merujuknya (L16). Ini bawaan; judul aksi berangka ada di Belum pasti.
- **L39.** Kartu Insight adalah aturan layar situs. Di kertas, kepala grafik pola grafik batang pemilik (nama metrik kiri, perubahan neto kanan, lihat Komponen di bab Selera presentasi) boleh menjadi satu-satunya baris di atas grafik, tanpa satuan dan periode; baris subjudul indikator, satuan, atau periode tidak dipakai. Cara membaca grafik yang tidak lazim ditulis di baris "Catatan:" paling banyak satu baris dan 120 karakter.
- **L40.** Pil kanan atas paling banyak satu: label keyakinan ("Estimasi model, belum diuji balik"), skenario ("Skenario El Niño kuat"), atau sasaran ("Sasaran Sendai B") (MGI, Atlas; P38).
- **L41.** Label seri ditulis langsung di ujung garis atau batang bila seri paling banyak 4; lebih dari itu, legenda di atas grafik. Paling banyak 3 anotasi per grafik; kejadian di deret waktu ditandai garis tegak tipis berlabel (Atlas, IMF; P26, P27).
- **L42.** Batang mengikuti grafik batang pemilik: kepala grafik satu baris (L39), ujung atas membulat, tanpa sumbu Y, nilai Bold di atas tiap batang termasuk yang kecil, total di atas batang bertumpuk, pembanding DCE1E7. Lebih dari 24 batang diringkas per dekade atau diganti garis.
- **L43.** Teks di dalam grafik dan peta paling kecil 8 pt pada ukuran cetak. Arah ditulis dengan ikon vektor atau kata; karakter ▲, ▼, dan → tidak dipakai karena tidak ada di Roboto.
- **L44.** Panel berganda diberi label (a), (b), (c) 9 pt Bold, skalanya sama, legendanya satu di kaki (WMO, OECD; P36).
- **L45.** "Sumber:" Bold 8,5 pt 6B7280 rata kiri sejajar objek, tepat di bawah objek: lembaga atau sistem, periode, dan batas data, tanpa path internal. Seri yang bias pelaporannya mengubah cara baca, seperti DIBI sebelum dan sesudah 2008, diberi "Catatan:" satu baris (OWID; P28).
- **L46.** Lebar objek penuh 165 mm atau satu lebar kolom grid.
- **L47.** Grafik dan peta pihak ketiga tidak ditempel apa adanya, tetapi digambar ulang dari data dengan token rumah (P39).

**Tabel**

- **L48.** Keterangan di atas dengan bentuk yang sama ("Tabel 5.2" lalu judul deskriptif, L38); "Sumber:" dan label keyakinan tepat di bawah tabel. Tabel berwarna, berikon, atau berpil ditutup legenda di baris terakhir tabel itu sendiri (sel digabung selebar tabel, tanpa isi warna, 8 pt), supaya "Sumber:" tetap paragraf pertama sesudah tabel.
- **L49.** Kepala navy teks putih Bold 8,5 pt, kata label kapital, satuan huruf asli dalam kurung ("LUAS (ha)"), diulang di tiap halaman. Kolom label baris tanpa isi warna. Kepala oranye dan kolom hijau JAPFA tidak ditiru.
- **L50.** Angka rata kanan dengan digit tabular dan titik ribuan, teks rata kiri, garis bawah 0,5 pt BFC5CC, tanpa garis vertikal, tanpa pita selang-seling, baris total navy.
- **L51.** Paling banyak 8 kolom di A4 tegak; kolom sekunder pindah ke lampiran atau .xlsx.
- **L52.** Kolom target dan proyeksi berlatar F3F5F8, terpisah dari kolom aktual (IMF; P67).
- **L53.** Tabel peta panas: sel diwarnai kelas diskret (kelas IRBI skala oranye, T8), angka tetap tertulis, legenda kelas di baris terakhir tabel (ADB, MGI; G16).
- **L54.** Tabel peringkat: nomor dalam bulatan navy, kolom jiwa terpapar di samping indeks, dasar urutan disebut di keterangan, wilayah fokus diblok FDF1E8 (gaya rumah d5). Yang diambil dari UNICEF hanya titik kelas di samping nilai; UNICEF sendiri memakai angka peringkat polos (P106).
- **L55.** Tabel preseden: kejadian besar sebagai kolom, besaran yang sama sebagai baris, kolom yang sedang dikaji berlatar FDF1E8 (White Paper Jepang; P108).

### Naskah dan bukti (skill pemilik `deep-research`)

Dari skill pemilik `deep-research`, dinilai 23 Okt dan dipakai sebagai arsitektur tahap naskah (`data/kajian-bnpb/TAMBAHAN-RISET.md`). Rinciannya di `PEDOMAN-DESAIN.md` §C9.

- **L56. Berkas bukti per bab disusun sebelum naskah.** Peneliti dan penulis dipisah. Tiap bab punya berkas bukti `naskah/<kajian>/bukti/bab-NN.md` yang disusun lebih dulu dari riset A–D, `data/*`, dan sumber tambahan. Penulis bab menulis hanya dari berkas bukti dan `data/angka.json`; penyunting substansi menolak klaim naskah yang tidak ada di berkas bukti.
- **L57. Empat bagian per pertanyaan kunci.** Untuk tiap pertanyaan kunci bab, berkas bukti memuat Inti; Temuan bersumber (tiap butir bersumber, termasuk "dibantah oleh"); Inferensi (analisis tim, ditandai); dan Celah (yang tidak ditemukan). Berkas tanpa empat bagian ditolak. Sumber dinilai dengan label keyakinan: berita hanya dipakai bila sumber resmi tidak ada dan ditandai, agregator diganti sumber aslinya, dan angka yang bertentangan ditulis berdampingan.
- **L58. Kalimat faktual tanpa sumber dipindah ke Celah atau dihapus.** "Diperkirakan" tidak dipakai untuk menutupi ketiadaan sumber.
- **L59. BLUF.** Ringkasan Eksekutif dan kotak ringkasan tiap bab dibuka temuan terpenting berangka, lalu arti dan dampaknya bagi BNPB. Pembaca yang berhenti di situ sudah paham.
- **L60. Temuan berangka di kotak temuan dan kalimat pembuka, judul subbab tetap deskriptif.** Judul bab tetap baku dan kapital (`KEPUTUSAN.md` T1). Judul subbab tingkat 2 dan tingkat 3 (x.y.z) deskriptif dan stabil, misalnya "4.3.2 Sedimentasi Waduk", karena vonis "Judul deskriptif menang atas judul data" tidak dibatasi ke deck ([Bentrok](#bentrok-dengan-keputusan-pemilik)) dan Daftar Isi memuat tingkat 1.1.1 (L7), jadi judul berangka mengubah Daftar Isi tiap pembaruan data. Temuan berangka skill `deep-research`, misalnya "Kedung Ombo kehilangan 5,5% tampungan", ditulis di kalimat pembuka tebal subbab (L16) dan di judul kotak temuan, yang tidak masuk Daftar Isi; angkanya token, bukan ketikan (D-22). Bawaan, lihat Belum pasti.
- **L61. Prosa padat.** Paragraf isi berbentuk prosa; daftar butir hanya untuk enumerasi sejajar seperti lembaga dan langkah. Angka kunci ditebalkan lewat kalimat pembuka tebal (L16); tebal tambahan di tengah paragraf tidak dipakai karena terbaca sebagai penekanan khas mesin (`ANTI-SLOP.md` M-12). Rujukan menempel pada klaim besar, angka, dan dokumen.
- **L62. Tiap angka utama disertai pembanding dan artinya bagi keputusan.** Pembandingnya target RPJMN, tahun lalu, provinsi lain, atau standar internasional.
- **L63. Argumen tandingan.** Rekomendasi besar yang diperdebatkan, seperti tanggul laut, normalisasi lawan naturalisasi sungai, dan relokasi, menampilkan argumen tandingan dan bukti kegagalan (pola Empat Sungai Korea), lalu posisi kajian.
- **L64. Kesimpulan tanpa ulangan.** Bab Kesimpulan dan Rekomendasi berisi keputusan dan implikasi, tidak mengulang paragraf bab sebelumnya; detektor pengulangan kalimat lintas bab memeriksanya.

### Produksi naskah dan QA lima lapis (skill pemilik `book-production-rules`)

Kajian ±110 dan ±150 halaman setara buku nonfiksi akademik, jadi disiplin produksi buku dari skill pemilik `book-production-rules` dipakai (`data/kajian-bnpb/TAMBAHAN-BUKU.md`). Rinciannya di `PEDOMAN-DESAIN.md` §B dan §D4.

- **L65. Kepadatan pustaka.** Kajian mitigasi paling sedikit 80 sumber dan kajian air 50; paling sedikit separuhnya sumber resmi atau primer; tiap bab paling sedikit 8 sumber berbeda. Yang dihitung hanya entri `pustaka.json` yang benar-benar dirujuk per bab.
- **L66. Glosarium dan konsistensi istilah.** `glosarium.json` memuat istilah baku, singkatan, dan varian terlarang. Singkatan dieja lengkap pada kemunculan pertama di tiap bab, jadi "BMKG" tanpa kepanjangan di awal bab ditolak. Varian terlarang dipindai, misalnya "pra bencana" untuk "prabencana", "Karhutla" berhuruf besar di tengah kalimat, "air bersih" dan "air minum" yang tidak mengikuti definisi BPS, dan nama K/L lama.
- **L67. Ejaan dan pemenggalan id-ID.** Semua gaya DOCX berbahasa `id-ID` dengan pemenggalan otomatis, karena isi rata kiri-kanan tanpa pemenggalan menimbulkan celah antarkata yang lebar. Pola `hyph_id_ID` dari repositori kamus LibreOffice dipasang ke profil LibreOffice khusus ekspor (`-env:UserInstallation` ke `bangun/docx/keluaran/.lo-profil`), bukan profil pemilik, sebelum ekspor PDF, karena LibreOffice di mesin ini tidak membawanya. Ejaan diperiksa dengan kamus `id_ID` lewat `spylls`; kata yang tidak dikenal dan bukan istilah glosarium atau nama diri harus nol sebelum serah.
- **L68. QA lima lapis berurutan**: (a) penulis memeriksa sendiri; (b) penyunting substansi mencocokkan tiap angka ke `angka.json` dan sumbernya, lalu memotong paragraf tanpa angka, sumber, atau keputusan; (c) penyunting bahasa memeriksa KBBI, PUEBI, dan anti-slop; (d) proofread pada PDF hasil render oleh mata baru; (e) gerbang mekanis. Laporan tiap lapis ditulis ke `keluaran/qa/`, dan tiap bab wajib lolos kelima lapis sebelum serah (aturan proses orkestrator, bukan kata pemilik). Fungsi pembaca beta dijalankan penyunting independen di lapis (b) sampai (d), karena hasil diserahkan tanpa putaran tinjauan pemilik (bawaan, lihat [Belum diputus](#belum-diputus)).
- **L69. Pembatas bab.** Bab dibuka di bagian atas halaman barunya, bukan di halaman pembatas penuh: label "BAB n", judul bab, 2–3 pertanyaan yang dijawab bab itu, foto Commons beratribusi hanya bila membawa informasi, lalu kotak ringkasan bab (L17).
- **L70. Sampul belakang dan halaman keterangan terbitan.** Sampul belakang navy memuat logo BNPB, alamat, dan satu paragraf ringkas kajian. Kolofon (L6) menjadi halaman keterangan terbitan: judul, penerbit BNPB, tahun, tanggal batas data, dan cara mengutip.
- **L71. Metadata dan bookmark.** Properti dokumen DOCX, PDF, dan PPTX berisi judul, penerbit BNPB, subjek, kata kunci, dan bahasa id-ID. PDF memuat bookmark dari judul bab dan subbab untuk navigasi.
- **L72. Proofread pada render.** Lapis (d) dibaca pada render halaman utuh, bukan pada Markdown.

### Yang sengaja tidak ditiru

| Pola | Laporan | Alasan |
| --- | --- | --- |
| Kolom samping untuk catatan, dua kolom isi, A4 lanskap | CCDR, MGI, WMO, IMF, GAR, UNICEF, NRR | A4 tegak satu kolom; sidenote di Word rapuh dan merusak Caption |
| Pembuka bab halaman penuh berwarna atau berfoto | GAR, OECD, IMF, ADB, Deltaprogramma, NRR | Memakan batas halaman; halaman gelap hanya sampul dan pembatas Lampiran |
| Kode warna per bab | GAR | Warna berarti makna (jenis bencana, arah), bukan nomor bab |
| Palet banyak warna, climate stripes, hijau, pelangi, ungu, merah murni | CCDR, ADB, WMO, UNICEF, Nankai | Palet BNPB sudah final; merah hanya bahaya |
| Serif, huruf Light, tiga keluarga huruf | IMF, MGI, Charting Our Water Future, NRR, Deltaprogramma | Hanya Roboto |
| Huruf grafik dan sumber 5,9–7 pt | CCDR, Atlas, MGI, Deloitte | Batas laporan 8 pt |
| Infografik dan panel berlatar gelap | MGI, BCG, Deloitte | Tanpa panel gelap; satu topik satu kontainer |
| Kutipan tarik, halaman kutipan besar, judul slogan | CCDR, BCG, WMO | Teks tanpa informasi baru dibuang; tanpa slogan |
| Ringkasan prosa tanpa angka sorotan, paragraf "Bab 1 membahas" | IMF, GAR | Kepala BNPB butuh angka kunci di halaman pertama |
| Rekomendasi berupa prosa atau daftar pertanyaan tanpa penanggung jawab | ADB, Deloitte, MGI | Tidak bisa ditindaklanjuti |
| Pai banyak irisan, donat, sumbu ganda, area bertumpuk 7 kategori, lingkaran konsentris, tetesan air dekoratif | White Paper Jepang, UNICEF, WS45, Deltaprogramma, OWID | Sulit dibandingkan atau luasnya menyesatkan |
| Kurva biaya langkah, neraca anggaran dalam rupiah | Charting Our Water Future, MGIA, Deltaprogramma | Tanpa pagu dan tanpa biaya proyek (`KEPUTUSAN.md` P5) |
| Grafik dan peta pihak ketiga ditempel apa adanya | OECD, WMO | Satu sumber data, satu set gambar |
| Ilustrasi stok, ikon isometrik, kiasan, lanskap ilustrasi, foto anak, potret pejabat | GAR, Deloitte, IPCC, UNICEF, Deltaprogramma, WMO | Gambar hanya foto Commons, peta, logo BNPB, dan ikon garis |
| Laut biru, bayangan relief, legenda gradien kontinu | WS45, UNICEF, BCG, GAR | Peta berlatar putih, kelas diskret berlegenda |
| Daftar isi berubin atau tanpa titik penuntun | CCDR, GAR, BCG | Bidang TOC Word bertitik penuntun |
| Dial jarum dan penilaian tiga kotak mini | WDR, CCDR | Berupa gambar yang tidak bisa disunting dan butuh legenda terpisah; urgensi dibaca dari pil horizon native |
| Grafik dengan kolom pesan di sampingnya, di DOCX | GAR | Kolom samping di Word rapuh; hanya di deck (kolom temuan di panel yang sama, S13), di DOCX pesannya jadi kalimat pembuka tebal paragraf di bawah gambar |
| Warna per wilayah dan paragraf di legenda peta | Deltaprogramma | Warna berarti keluarga bencana; wilayah dibedakan nomor, legenda berupa label pendek |
| Halaman pesan utama bergaya kampanye (judul slogan, lingkaran ilustrasi, latar peta berwarna) | Deltaprogramma | Tanpa slogan dan ilustrasi; strukturnya sudah ada di peta indeks bernomor (P44) |

### Bentrok dengan keputusan pemilik

| Pola dunia | Aturan pemilik yang berlaku |
| --- | --- |
| Judul aksi berangka di tiap objek (MGI, WDR, Atlas) | Belum pasti. Vonis 23 Okt "judul memakai bentuk deskriptif" dan "Judul deskriptif menang atas judul data" lebih baru daripada "judul = fakta + angka + sumber", dan tidak ada kata pemilik yang membatasinya ke deck. Bawaan di DOCX dan PDF: keterangan deskriptif stabil (L38), temuan berangka di kalimat pembuka tebal (L16). Di deck, aturan judul per jenis deck tetap berlaku |
| Baris subjudul indikator dan satuan (CCDR, Atlas, IMF, MGI, OECD) | Tidak dipakai; satuan dilebur ke keterangan atau legenda. Kartu Insight berlaku di layar situs; di kertas kepala grafik pola pemilik satu baris dan "Catatan:" satu baris (L39) |
| Sumbu Y dan garis kisi (hampir semua) | Batang tanpa sumbu Y dengan nilai di atas; seri panjang diringkas atau dibuat garis |
| Panah dan sorot merah (Nankai, CCDR, Atlas) | Turun biru 2F86D1, sorot oranye atau biru; merah hanya bahaya dan perlu perhatian |
| Warna valensi, membaik biru dan memburuk oranye (IMF) | Warna mengikuti arah. Di kajian air, surplus/defisit dan membaik/memburuk memakai batang 2E3440 lawan DCE1E7 berlabel kata |
| Baris sumber di bawah grafik (semua) | Di deck dibuang (keputusan 23 Okt "Keterangan jadi label"); di DOCX dan PDF wajib, karena tiap angka punya sumber dan waktu |
| Tabel tahap × tahun berwujud Gantt (Deltaprogramma) | Pemilik membuang Gantt dari slide rekomendasi d5, jadi tidak dipakai di deck; di DOCX bawaannya juga tidak dipakai, lihat Belum pasti |
| Latar gelap untuk infografik (MGI, BCG, Deloitte) | Tanpa panel gelap, latar putih |
| Laut biru (WS45, UNICEF, WMO) | Peta berlatar putih tanpa laut biru |
| Kontras "X, not just Y" di judul (WDR) | Bahasa lugas tanpa kontras retoris |
| Huruf 5,9–7 pt (CCDR, Atlas, MGI) | Batas bawah 8 pt di laporan; batas slide 6 pt tidak berlaku untuk kertas |
| Kurva biaya dan neraca anggaran (Charting Our Water Future, Deltaprogramma) | Tanpa pagu dan biaya proyek; strukturnya dipakai untuk neraca air dalam m³ |
| Halaman pembatas bab penuh dengan nomor bab besar (skill `book-production-rules`) | Pembatas di atas halaman pertama bab (L69): pembuka bab halaman penuh tidak ditiru (Yang sengaja tidak ditiru) karena memakan batas halaman `KEPUTUSAN.md` T5 |
| Garamond 11 pt (skill `book-production-rules`) | Roboto saja (`KEPUTUSAN.md` P12) |
| ISBN, BISAC, ebook, rencana pemasaran (skill `book-production-rules`) | Tidak dipakai; kajian adalah dokumen kebijakan BNPB, bukan buku dagang |
| Pembaca beta 3–5 orang dan persetujuan pemilik tiap fase (skill `book-production-rules`) | Pemilik meminta tidak ada pertanyaan lagi (`KEPUTUSAN.md`); tanpa putaran tinjauan pemilik sebagai bawaan, penyunting independen menjalankan lapis (b) sampai (d) (L68) |
| Kotak ringkasan bab 3–4 temuan (skill `book-production-rules`) | Paling banyak 3 temuan (L17) |
| Laporan tanpa daftar butir sama sekali (skill `deep-research`) | Enumerasi lembaga dan langkah tetap boleh, dibatasi (L61) |
| Judul bab bergaya naratif (skill `deep-research`) | Judul bab baku dan kapital (`KEPUTUSAN.md` T1) |
| Judul subbab tingkat 3 berangka (skill `deep-research`) | Deskriptif (vonis "Judul deskriptif menang atas judul data"); temuan berangka di kalimat pembuka tebal dan judul kotak temuan (L60) |
| Tiga-serangkai paling banyak 5 per 1.000 kata (skill `anti-ai-checker`) | Dilarang ([Bahasa lugas](#diputus), 19 Okt); di DOCX daftar tiga yang faktual tidak dihitung ([Angka & copy](#angka--copy)) |
| Fakta kunci ditebalkan di tengah paragraf (skill `deep-research`) | Tebal hanya di kalimat pembuka (L16, L61) |
| Batas 15 panggilan alat per peneliti (skill `deep-research`) | Tidak dipakai; penelusuran per bab perlu lebih dalam |

### Cara memeriksa

1. Sebelum menggambar, tulis pesan grafik dan cocokkan ke tabel Pilih grafik; jenis di G25 ditolak.
2. Render DOCX dengan `soffice --headless --convert-to pdf` sesudah indeks diperbarui, deck dengan `bangun/pptx/deck.py --pdf` (soffice), lalu `pdftoppm -png -r 110`. Setiap halaman dibaca dengan Read.
3. Cek mekanis: titik tengah (U+00B7) dan em dash (U+2014) nol; huruf terkecil 8 pt atau lebih; tiap Gambar dan Tabel bernomor urut dengan "Sumber:" tepat di bawahnya dan legenda tabel di baris terakhir tabel; keterangan paling banyak 2 baris dan memuat tahun atau periode; "Catatan:" paling banyak satu baris; paragraf bergaya Isi Temuan dibuka run Bold berangka; Pesan Kunci 6–8 temuan; tiap rekomendasi punya kode "Temuan A.1" di kolom Dasar dan langkah paling banyak 8 kata; peta kecil berganda berbagi satu skala kelas. Gerbang mesinnya D-1 sampai D-32 di `PEDOMAN-DESAIN.md` §D. `qa/periksa.py`, `qa/uji.py`, dan `qa/cakupan.json` sudah ada: 22 kode diuji dengan fixture, 10 masih antre (D-8, D-18, D-21, D-24 sampai D-30). Kode yang antre masih diperiksa manual dan aturannya belum jadi menurut standar uji pemilik.
4. Kalimat tebal tiap bab dibaca berurutan tanpa isi lainnya. Bila alur bab tidak terbaca dari kalimat itu saja, kalimat pembukanya ditulis ulang (P17).
5. QA lima lapis (L68) dijalankan berurutan dengan laporan per lapis di `keluaran/qa/`, dan pindaian anti-AI tiap bab LULUS ([Angka & copy](#angka--copy)). Kepadatan pustaka, singkatan dan varian terlarang, kata tak dikenal, celah antarkata, properti dokumen dan bookmark PDF, berkas bukti empat bagian, rasio butir terhadap paragraf, dan pengulangan kalimat lintas bab diperiksa menurut `PEDOMAN-DESAIN.md` §D4. Semuanya belum punya gerbang mesin, jadi aturannya belum jadi menurut standar uji pemilik sampai kodenya masuk `qa/cakupan.json` bersama fixture.

### Belum pasti

- Peta bernomor sendiri dengan Daftar Peta (GAR, UNICEF). Bawaan: peta tetap seri Gambar.
- Tabel tahap × tahun pola Deltaprogramma di DOCX. Bawaan: tidak dibuat; waktu ditulis sebagai kolom WAKTU berpil horizon di matriks rekomendasi, mengikuti satu-satunya sinyal pemilik (Gantt dibuang dari slide d5). Bila disetujui: hanya di bab Peta Jalan, sel tahap berupa pil native Kajian, Perencanaan, Pelaksanaan, Evaluasi.
- Kelas IRBI banjir dan kekeringan di kajian air ikut oranye (`KEPUTUSAN.md` T8), sementara kategori air biru dan kekeringan emas. Bawaan: T8 apa adanya.
- Keterangan gambar dan tabel berupa judul aksi berangka (MGI, WDR) atau judul deskriptif. Bawaan: deskriptif stabil (L38). Bila pemilik memilih judul aksi, kutipannya dicatat di Riwayat.
- Judul slide deck kajian: diputus sebagai bawaan `KEPUTUSAN.md` T11 (kalimat temuan untuk slide temuan, deskriptif untuk sampul, pembatas, dan rekomendasi), menunggu koreksi pemilik; lihat S7 di [Pola deck konsultan kelas dunia](#pola-deck-konsultan-kelas-dunia-mckinsey-bcg-big-four).
- Judul subbab tingkat 3 berangka (skill `deep-research`) bertemu vonis "Judul deskriptif menang atas judul data". Bawaan: deskriptif stabil (L60), temuan berangka di kalimat pembuka tebal (L16) dan judul kotak temuan. Bila pemilik memilih judul berangka, Daftar Isi ikut berubah tiap pembaruan data dan kutipannya dicatat di Riwayat.

## Fitur yang disembunyikan

Aturannya: **disembunyikan, tidak dihapus.** Caranya atribut `hidden`, `display:none`, flag (`SPANDUK`, `if (false && …)`, `TAB_SEMBUNYI`), `splice` dikomentari, `"sembunyi": true` di `data/tim.json`. Fungsinya tetap ada supaya bisa dipulihkan, dan fungsi yang dipulihkan wajib diuji.

Daftar lengkap berikut cara memulihkannya hidup di memori `fitur-disembunyikan`. Ringkasannya:

| Wilayah | Yang tersembunyi | Sejak |
| --- | --- | --- |
| Tab karhutla | Posko (Ajuan), Ringkasan, Informasi, Kompleks (dilebur ke dasar Insight), Metode (masih lewat URL) | 14 Okt |
| Insight karhutla | Model sebaran "Coming soon", sebDorong, sebUji, sebGalat, sebLolos; kartu `ytd`, `tahun`, `kec` (dobel dengan Tren); Laporan resmi BNPB dan Penanganan; PSN Merauke dan Tokoh politik; tombol gambar kartu Musim | 14 sampai 17 Okt |
| Pindah ke Tren | kartu `luasTahun`, `luas`, `nasional`, `dunia` dan bab "Penempatan regu" | 17 Okt |
| Cerita | bab Model sebaran, bab Uji model, keterangan bab Pendorong | 14 sampai 15 Okt |
| Panel dan menu (22 Okt) | Posko (Ajuan) di panel peta, tab Replay banjir (masih di `/banjir/replay`), widget peringatan BMKG panel presiden, tulisan "perkiraan satelit" | 22 Okt |
| Bagikan | tab Ekspor, subjudul, teks ukuran, watermark logo, blok Rekomendasi | 14 Okt |
| Laci kompleks | nama provinsi di kepala, "Teruskan ke", caption langganan api; "Kenapa status ini" diganti visual | 14 Okt |
| Pop-up situasi | kartu jarak Daops, baris waktu data | 15 Okt |
| Header | lonceng ke `/peringatan` diganti tombol "!" yang membuka pop-up Situasi | 17 Okt |
| Tentang | Layanan, Sumber data, Cara kerja data, Cara mengutip, kotak angka hidup, landasan hukum, beberapa FAQ, tombol WhatsApp, label bagian; seluruh Tentang di situs Centurisk97 | 14 dan 19 Okt |
| Laporan harian | kolom SiPongi 2026 dan BNPB dipadamkan, ubin Luas resmi dan Operasi | 17 Okt |
| Banjir | tab Posko, Informasi, Metode, Prakiraan, Wilayah siaga, Provinsi, Rob, Sungai, Keputusan, Sarana; seg Posko di panel peta; spanduk basi | 16 Okt |
| Bencana baru | gempa: Kontak BPBD terdekat di laci; udara: METAR bila tak ada laporan 12 jam; gunung api: KRB (lisensi); kekeringan: tab posko | 16 sampai 19 Okt |
| Ruang Koordinasi | pintu `/bnpb` dan semua halamannya tidak ditautkan dari nav utama | 19 Okt |
| Lain | spanduk data basi `#basi`, pil statistik di kepala, catatan privasi dialog pesan, kolom Peta batas dan tabel Status lahan konsesi, Unduh CSV Tren, judul dan hitungan galeri Foto, toggle Galeri/Peta | 14 sampai 15 Okt |

**Dipulihkan**: tombol video kartu Musim (15 Okt), nama perusahaan dan grup konsesi (17 Okt), spanduk persetujuan (19 Okt), menu semua bencana tanpa "Soon" (20 Okt).

## Model & data

### Prinsip

- Layar tidak menghitung ulang angka pipeline; skema JSON adalah kontrak dengan pengerja pipeline.
- Status resmi lembaga didahulukan; indeks buatan sendiri tidak pernah menimpa status resmi.
- Data BNPB bertipe campur selalu lewat `angkaID()`.
- Vonis model wajib mengalahkan **semua** pembanding bermakna (acak, persistensi, peta bahaya statis, jumlah penduduk atau bangunan), dengan seri dipecah netral per waktu. Kalah = label "belum lulus", bukan disembunyikan.

### Kinerja yang tercatat

| Model | Hasil | Status di layar |
| --- | --- | --- |
| Sebaran api karhutla (GBDT tulisan tangan, 40 variabel, Platt) | Diuji sekali pada 2024 sampai 2026 dan 123 kejadian lampau; prospektif append-only | Kartu model disembunyikan |
| Ambang kekeringan SPI | POD 22%, FAR 97%, CSI 0,026 lawan acak 0,012 terhadap 288 kejadian DIBI 2023 sampai 2026 | Pil hipotesis di semua angka status |
| Indeks risiko kecamatan | Gempa lulus melawan sebagian pembanding tapi kalah dari peta bahaya InaRISK; banjir dan longsor belum mengalahkan baseline penduduk; bahaya harian butuh sekitar 44 hari potret untuk uji prospektif | Label per bahaya |
| Risiko kebakaran permukiman DKI | Menangkap 18% kebakaran; jumlah bangunan saja 32%; acak sekitar 20% | Belum lulus |
| Status banjir | Persen ketepatan dari cacah n, peluang 3 hari dari ansambel ECMWF | Ketepatan tampil jujur |
| Persentil FWI per provinsi | Sumatra dan Kalimantan seri (J 0,591 lawan 0,592), provinsi lain hit turun | Tidak diadopsi, pembanding saja |
| Firespot tiga satelit | Api besar mungkin di hari pertama 25,1% (2019) dan 18,3% (2023); level 3 tidak pernah tertunda | Ambang 4 dipertahankan |
| Peluang "akan membesar" | Prospektif 17% lawan dasar historis sekitar 3%, selisih belum terjelaskan | Disembunyikan, gerbang dua putaran |
| Replay banjir | 1 dari 23 laporan di sel, 26% dengan toleransi sekitar 1 km | Tab keluar dari menu |
| OMC | Evaluasi dengan kontrol, pita diurnal, dan plasebo; bukan klaim sebab-akibat | Arsip evaluasi |

### Data yang perlu diingat

- S-NPP berhenti 1 Nov 2026; `insiden.py` pindah ke NOAA-20 (rasio 0,89).
- Graf jalan dan titik air diarsipkan permanen ke R2 (`graf.yml`); cache Actions sempat terusir karena cache `data-` 11,6 GB melewati batas 10 GB.
- Riwayat titik 2026 Jan sampai Jun dibangun ulang dari arsip VIIRS S-NPP; 37 hari tanpa S-NPP diisi NOAA-20 × 0,978.
- Luas terdampak harian = piksel VIIRS × 14,06 ha. Perkiraan luas terbakar 2026 tampil sebagai rentang (1,6 sampai 2,3 juta ha).
- Luas resmi KLHK SiPongi ditarik tiap hari; provinsi pemekaran sebelum 2023 = null.
- Udara: "perkiraan model CAMS, belum dikoreksi"; status udara memantau `prakiraan.json` dengan ambang 18 jam.
- Himawari-9 tiap 10 menit, satu suar per api. Citra konsesi: kotak 40 km di gugus titik terpadat, air dibuang dari hitungan bakar.
- Abrasi: transek dengan GANGGUAN (tanggul tol, Patimban) ditandai tinjau.
- Peringatan dari berita: peringatan ke depan wajib bersumber resmi; kejadian berlaku sampai tanggal di judul.

## Ruang Koordinasi BNPB

Lahir 19 Okt 2026 karena pemilik menjadi staf ahli BNPB. Pintu `/bnpb`, tidak di nav utama. Kontrak teknis `docs/bnpb/ARSITEKTUR.md`, status `docs/bnpb/STATUS.md`, pengerja `ruang-bnpb`.

| Masalah | Sistem |
| --- | --- |
| M1 sitrep manual | Sitrep otomatis harian nasional dan provinsi, cetak A4, teks WhatsApp, arsip 07 WIB di R2 (retensi 400 hari) |
| M2, M3, M6, M7, M12 | Meja Kerja: kaji cepat, logistik dengan stok gudang dipotong atomik, Dana Siap Pakai sampai SPJ, renkon, Destana, rehab-rekon |
| M4 relawan | Pendaftaran tanpa NIK, kode pribadi, kampus mitra dan MoU PTN, jam kerja untuk SKS/KKN, anonimisasi UU PDP, retensi 180 hari |
| M5 BPBD | Rapor kinerja BPBD |
| M9 InaRISK statis | Indeks risiko operasional per kecamatan, harian, kapasitas dinamis dari relawan siap (k-anonim) |
| M10 riset | Kemitraan riset: agenda, usulan, katalog data, luaran tampil sesudah disetujui admin |
| M11 komunikasi | Alun-alun: utas, balasan, upvote, aduan, pengumuman resmi; "butuh bantuan" diteruskan sekali klik jadi permintaan relawan atau logistik; lokasi dibulatkan sekitar 1 km |
| M13 anggaran | Kebutuhan musim 30/60/90 hari sebagai rentang |
| M14 Gakkum | Berkas Gakkum konsesi, lembar A4, admin saja |
| Pimpinan | Layar Pimpinan `/admin/pimpinan` dan pengingat harian 07.40 WIB (email hanya bila admin menekan kirim) |

Mode luring `/meja` dan check-in relawan memakai IndexedDB dengan `klien_id` idempoten. Turnstile siap, aktif begitu sitekey diisi. Uji: `npm run uji:layar` (59 uji Chrome headless, wajib 0 todo).

## Ruang Instansi

Program 21 Okt 2026, masuk main 22 Okt (`16652489`). Pengguna: daerah dan pusat, dipakai harian.

1. **Akun instansi**: pemprov, pemkab/pemkot, polda, polres, kodam, kodim (korem dilewati). Dibuat massal bersandi acak, diklaim lewat NIP/NRP, surat tugas, kartu pegawai; disetujui admin; wajib ganti sandi; jejak audit.
2. **Tugas api per kompleks** (gabung 2 km): konfirmasi foto GPS paling lambat 6 jam, PIC lapangan wajib, kabar tiap 24 jam sampai padam, tagih lewat wa.me tanpa kiriman otomatis, verifikasi padam lewat satelit.
3. **Media multi-berkas**: hitung orang dengan Workers AI ("minimal terlihat"), EXIF jam dan koordinat; waktu mulai dan padam "terdokumentasi" dari waktu foto.
4. **Rekomendasi cara padam** (`scripts/data/taktik.py`): regu, personel, pompa bersumber, air, BBM, genset, kedalaman bara; heli pelengkap; akses jalan terdekat, km jalan kaki, alat yang dipikul, checklist berangkat.
5. **Penugasan** dengan tautan pelacak GPS `/lacak#token`.
6. **Kontak konsesi**: instansi mengusulkan, admin menerima.
7. **Laporan karhutla harian** (`docs/laporan-karhutla/SOP.md`): form daerah dan pusat, cek merah/kuning, kunci jadi snapshot beku, ralat bernomor, deck PPTX/PDF dan teks WA dari snapshot. Belum lengkap = belum bisa diunduh; watermark DRAF.
8. **Konpers** `/laporan-bnpb`: deck, naskah juru bicara + teleprompter, mode Matador (huruf paling kecil 28, judul 44, paling banyak 5 baris). Laporan Dit. Koordalops: teks WA, PDF, DOCX.
9. **OMC**: catatan sortie, arsip PM2.5/METAR, evaluasi dengan kontrol dan plasebo.
10. **Staf BNPB berperan + Meja Pantau**: antrean harian tugas terlambat, konsesi tanpa kontak, korban, laporan belum masuk, P3K, OMC. Inventaris peralatan dan P3K per gudang. Laporan korban jiwa dengan nama privat.

Sejak 22 Okt (api padam): Kartu Api, ID insiden stabil, verifikasi padam, keselamatan regu, operasi lapangan, push 3 jam per wilayah, dashboard kinerja dan SLA, `/kabar` per kabupaten, teks undangan WA di CSV akun massal, dan semua itu berlaku per bencana lewat `src/tugas_bencana.js`.

Produksi sudah di migrasi 0049, tetapi per 22 Okt belum ada satu pun akun instansi atau tugas api; aktivasi lewat `scripts/bnpb/aktivasi.sh` dan `docs/bnpb/AKTIVASI.md`.

## Gerbang penjaga

| Gerbang | Menjaga | Jalankan |
| --- | --- | --- |
| `gerbang-ilmu-agent` | katalog dan definisi agent segar, tiap agent punya ilmu, tiap berkas kode tepat satu pemilik, jejak melewati yang tak berubah | `npm run uji:agen` |
| `gerbang-model-agent` | tiap agent punya `model:`; agent bawaan turun ke Sonnet | `npm run uji:agen` |
| `gerbang-wrangler` | config produksi worker (nama `centurisk97`, satu cron) | `npm run uji:agen` |
| `gerbang-headers` | `_headers` hasil `versi.py` di bawah 100 aturan, peringatan di 80 | `npm run uji:agen` |
| `gerbang-bencana` | registry sumber tunggal, `src/bencana.generated.js` segar | `npm run uji:agen` |
| `gerbang-tab-registry` | tiap rute di nav ada di `tab` registry | `npm run uji:agen` |
| `gerbang-inti` | tidak ada CSS/JS salinan antar modul layar | `npm run uji:agen` |
| `gerbang-konflik` | tidak ada penanda konflik git di berkas yang dilacak | `npm run uji:agen` |
| `gerbang-sebar-fbp` | mesin penjalaran api dijalankan sungguhan di kisi sintetis | `npm run uji:agen` |
| `gerbang-paparan-templat` | templat `/paparan` menolak id bentrok, gambar luar, `<` | `npm run uji:agen` |
| `laporan-inti`, `peluang-inti`, `peta-karhutla` | mesin laporan harian, kartu peluang, kartu peta provinsi | `npm run uji:agen` |
| `laporan-karhutla-deck`, `laporan-konpers`, `laporan-koordalops` | angka hanya dari snapshot atau isian, bagian kosong tidak dikarang, tanpa " · ", Matador terbaca | `npm run uji:agen` |
| `siklus_insiden`, `presiden`, `sla_koreksi` | satu siklus insiden dari cron sampai SLA; panel presiden; uji cron di luar jendela push 3 jam | `npm run uji:warga` |
| `peta-kab` | kartu peta kabupaten | `npm run uji:agen` |
| `tests/warga/*` | route, skema D1, API, foto, OG, EWS, Ruang Koordinasi, Ruang Instansi di Miniflare sungguhan | `npm run uji:warga` |
| `tests/banjir`, `tests/udara`, `tests/<bencana>` | pipeline dan kontrak tiap bencana | `npm run uji:banjir`, `npm run uji:udara` |
| `tests/bnpb/*` | 19 halaman × 1440/390 + interaksi di Chrome headless | `npm run uji:layar` |
| `npm run agents:check` | definisi agent sinkron dengan `roster.json` | |
| `scripts/i18n/kumpul.mjs` | teks yang belum diterjemahkan atau bercampur | `node scripts/i18n/kumpul.mjs` |
| `.gitignore` | salinan nyasar `* 2` dan `* 2.*` | |

Semuanya: `npm run uji`. Commit hanya bila tiap suite mencetak `fail 0`; grep pass/fail dalam rantai `&&` pernah meloloskan commit gagal.

**Batas mati** (`AGENTS.md` §9): tidak ada `wrangler deploy` atau push produksi dari subagent; gerbang, plafon, dan uji haram dilemahkan; subagent tidak commit; berkas `* 2.*` tidak disunting; secret tidak pernah masuk berkas yang dilacak git. Commit dengan path spesifik, tidak pernah `git add -A`. Jalankan `npm run uji:agen` sesudah `git add`, karena gerbang pemilik membaca berkas terlacak saja.

## Insiden & pelajaran

| Tanggal | Insiden | Pelajaran |
| --- | --- | --- |
| 22 Okt | Tugas api nol di produksi: CHECK 2.000 huruf menolak seluruh batch tiap menit | Migrasi yang sudah diterapkan tidak disunting; batas di kode mengikuti produksi |
| 22 Okt | `akses.py` gagal tiap hari karena cache graf jalan terusir | Arsip permanen di R2, bukan cache Actions |
| 22 Okt | Terbit merah: `/kekeringan/simulasi` 404 | Tab baru didaftarkan di registry dulu; `gerbang-tab-registry` |
| 20 Okt | Penanda konflik git ter-commit di JSON udara | `gerbang-konflik` |
| 19 Okt | Commit "gas" pemilik menyapu suntingan yang sengaja ditahan dan langsung terbit | Tree dianggap publik dalam hitungan menit; yang belum aman ditaruh di luar repo |
| 19 Okt | Spinner tak berhenti di semua repo | Hook Stop global pangantara dicabut; `npm run mesin:pasang` di pangantara memasangnya lagi |
| 17 Okt | Domain dilayani worker kedua yang basi | Produksi = `centurisk97`; bandingkan domain dengan `/api/status` |
| 17 Okt | Terbit gagal karena lebih dari 5 cron | Satu cron tiap menit |
| 17 Okt | `git add` macet 1,5 jam di iCloud | Stage path eksplisit, batas waktu git jaringan |
| 16 Okt | Terbit gagal karena `_headers` 136 aturan; dilaporkan "tayang" padahal belum | Tunggu `terbit.yml` sukses, cek aset live dan `/api/status` sebelum bilang tayang |
| 16 Okt | Disk 96% karena worktree agent | Tanpa worktree; cek `df -h` |
| 16 Okt | Token CLI tanpa scope `workflow` | Suntingan `.github/workflows/**` dibiarkan untuk commit GitHub Desktop pemilik |

## Armada agent

21 agent, generate dari `scripts/agents/roster.json` (`.claude/ilmu-agent/KATALOG.md`):

| Kelas | Agent |
| --- | --- |
| Pengerja domain (Sonnet) | `pipa-data`, `model-sebaran`, `banjir`, `gempa`, `cuaca-udara`, `gunungapi-kering`, `pesisir`, `warga-api`, `ruang-bnpb`, `layar-peta`, `inti-layar`, `pipa-umum` |
| Pengerja platform (Sonnet) | `mekanik-mesin`, `penulis-gerbang` |
| Pemeriksa (Sonnet) | `validasi-model`, `security-reviewer`, `inp-reviewer` |
| Pemeriksa (Haiku) | `guard-api`, `migrasi-idempoten`, `higiene-repo`, `selera-angka` |

Agent yang lahir sesudah 16 Okt: `gempa`, `cuaca-udara`, `gunungapi-kering`, `inti-layar`, `pipa-umum` (17 sampai 19 Okt), `ruang-bnpb` (19 Okt), `pesisir` (21 Okt).

Aturannya: Opus merencanakan, model murah mengerjakan; penulis kode bukan pengulasnya; pemilik repo ini menolak worktree, jadi agent penulis jalan di main satu per satu atau paralel bila berkasnya terpisah dan disebut di brief. Diff agent tidak pernah di-commit hanya karena laporannya.

## Tugas pemilik

Yang tidak bisa dikerjakan sesi agent:

1. Pasang secret `VAPID_*` dan `PIPA_TOKEN` (Worker dan GitHub), verifikasi domain Resend lalu ganti `EMAIL_FROM` ke domain sendiri (`docs/bnpb/AKTIVASI.md`).
2. Buat dan bagikan akun instansi pertama; produksi masih nol akun.
3. Putar ulang kunci FIRMS dan Earthdata (salinan `.env 2` pernah terlacak).
4. Putuskan `/kabar` publik, `/data/tugas_kompleks.json`, target SLA, dan angka kebijakan tugas lintas bencana.
5. Commit berkas `.github/workflows/**` lewat GitHub Desktop (langkah harian indeks risiko, kebutuhan musim, peringatan dari berita di `lintas.yml`).
6. Isi `TURNSTILE_SITEKEY` dan secret `TURNSTILE_SECRET` bila form relawan dan alun-alun diserbu spam.
7. Pastikan secret `SUPER_ADMIN` memuat awalan hash akun supaya tombol isi dan hapus dummy muncul.
8. Cek daftar 21 Kodam dan nama jenis bencana DIBI.
9. Putuskan kapan `/bnpb` masuk nav utama.

## Rencana multi-bencana

Rencana lengkap ada di `docs/multi-bencana/` dan diterbitkan sebagai artifact "Rencana Multi-Bencana". Ketujuh bencana kini aktif; yang tersisa adalah paritas penuh 113 komponen dan model yang lulus uji balik.

| Berkas | Isinya |
| --- | --- |
| `ARSITEKTUR.md` | registry, rute, data, pipeline, worker, D1, layar, i18n, OG, agent |
| `PAKET-FITUR.md` | 113 komponen karhutla dan padanannya |
| `PARITAS-*.md` | audit paritas tiap bencana terhadap karhutla |
| `RENCANA-20-JAM.md`, `RENCANA-20-JAM-2.md` | aturan A1 sampai A25 dan blok kerja B0 sampai B4 |
| `RENCANA-PELUANG.md`, `PERINGATAN-DINI.md`, `LAPORAN-HARIAN.md` | kartu peluang, alarm dan email, mesin laporan harian |
| `RINCI-BANJIR.md`, `RINCI-GEMPA.md`, `bencana/*.md` | spesifikasi per bencana, termasuk abrasi |
| `SUMBER-DATA.md`, `SUMBER-BNPB.md`, `docs/sumber-lapisan.md` | sumber data terbuka dan lisensi lapisan peta |
| `PETA.md`, `PELATIHAN-MODEL.md`, `COPYWRITING.md`, `MODUL-PLUG-AND-PLAY.md` | cetak biru peta, kerangka latih, suara, katalog modul |
| `FASE-0.md`, `ALUR.md` | fondasi bersama dan 12 tahap per bencana |

## Buku pegangan rujukan

Lima buku pemilik dari proyek lain, disalin ke `docs/buku-pegangan/rujukan/` dan diterbitkan ulang sebagai artifact. Yang ditiru dari sana: bentuk buku ini (riwayat bertanggal, keputusan diputus dan belum, gerbang, armada), protokol tiga lapis (perbaiki, catat, gerbang), dan aturan bahwa halaman diterbitkan ulang ke URL yang SAMA. Alamatnya di `docs/buku-pegangan/ARTIFACT.json`.

## Cara halaman ini diperbarui

1. Keputusan baru pemilik masuk ke **Riwayat** (bertanggal, kutipan miring) lalu ke bagian aturannya, di `docs/buku-pegangan/pantau-bencana.md`.
2. Bangun ulang: `python3 docs/buku-pegangan/bangun.py pantau-bencana`.
3. Terbitkan ulang ke URL yang tersimpan di `docs/buku-pegangan/ARTIFACT.json`. **Jangan pernah menerbitkan sebagai artifact baru**: itu tidak gagal, ia cuma melahirkan halaman kedua dan yang lama berhenti diperbarui tanpa ada yang tahu.
4. Routine harian yang menyapu sisanya dirumuskan di `docs/buku-pegangan/ROUTINE.md`.
