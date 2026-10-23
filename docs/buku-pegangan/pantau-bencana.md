Pemantauan bencana Indonesia: karhutla, banjir, dan enam bencana lain

# Buku Pegangan Pantau Bencana

Semua selera, keputusan pemilik, gerbang, dan armada yang berlaku di situs Pantau Bencana (repo `poskokarhutla`), di satu tempat. Yang baru diputus masuk ke Riwayat, lalu ke bagian aturannya.

Disegarkan 23 Okt 2026\
commit 2ce5dc44

[Riwayat perubahan](#riwayat-perubahan) [Keputusan pemilik](#keputusan-pemilik) [Stack & peta repo](#stack--peta-repo) [Situs per alamat](#situs-per-alamat) [Halaman & rute](#halaman--rute) [Selera tampilan](#selera-tampilan) [Angka & copy](#angka--copy) [Selera presentasi (PPT)](#selera-presentasi-ppt) [Fitur yang disembunyikan](#fitur-yang-disembunyikan) [Model & data](#model--data) [Ruang Koordinasi BNPB](#ruang-koordinasi-bnpb) [Ruang Instansi](#ruang-instansi) [Gerbang penjaga](#gerbang-penjaga) [Insiden & pelajaran](#insiden--pelajaran) [Armada agent](#armada-agent) [Tugas pemilik](#tugas-pemilik) [Rencana multi-bencana](#rencana-multi-bencana) [Cara halaman ini diperbarui](#cara-halaman-ini-diperbarui)

Terbaru di atas

## Riwayat perubahan

Vonis dan perubahan selera per tanggal. Kutipan miring adalah kata-kata pemilik saat menegur atau memutus.

1. 23 Okt 2026
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
   - **Status di laporan harian mengikuti sisa belum padam website.** Kota Tidore (sisa 0 ha) dipindah ke selesai: *"Bro ini Maluku Utara udah nol ya masuk selesai dong"*. Kartu PERLU PERHATIAN tidak lagi menyalin jumlah dalam penanganan (*"Emang semua perlu perhatian ya?"*). Pemilik memilih yang serius saja: sisa ≥100 ha atau dilapor BPBD belum padam, jadi 8 dari 10. Penunjuk "Lampiran (data rinci) mulai halaman 13" di penutup dibuang (*"Hilangkan"*).

2. 22 Okt 2026 (lanjutan)
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
3. 22 Okt 2026
   - **Ruang Instansi masuk main** (`16652489`): akun daerah (pemprov, pemkab/pemkot, polda, polres, kodam, kodim) dibuat massal bersandi acak lalu diklaim lewat verifikasi dokumen; tugas api per kompleks; rekomendasi cara padam; akun staf BNPB dan Meja Pantau; inventaris dan P3K; laporan korban jiwa; laporan karhutla harian bersnapshot; OMC; konferensi pers dan laporan Dit. Koordalops di `/laporan-bnpb`. Migrasi D1 0029 sampai 0035 menunggu pemilik. Rincian di [Ruang Instansi](#ruang-instansi).
   - **Terbit merah karena rute `/kekeringan/simulasi` 404**: tab simulasi kekeringan belum didaftarkan di registry. Dibetulkan di `a5afb8ab`; gerbangnya `gerbang-tab-registry`.
   - **Lampu malam ditahan**: modul `scripts/umum/lampu_malam.py` tidak dilanjutkan walau token Earthdata terisi. Skripnya tidak dipanggil workflow dan JSON validasinya tidak dibaca layar.
   - **Indeks risiko kebakaran permukiman DKI** (`/bnpb/kebakaran`): uji balik gagal. Indeks menangkap 18% kebakaran, jumlah bangunan saja 32%, acak sekitar 20%. Tetap berlabel belum lulus uji.
4. 21 Okt 2026
   - **Program Ruang Instansi dimulai**: sistem untuk daerah dan pusat yang dipakai harian. Sepuluh butir permintaan dicatat di memori `ruang-instansi` dan dicocokkan sebelum menyatakan selesai.
   - **Peringatan dari berita untuk tujuh bencana** (`81032a48`): berita Google News dipilah jadi peringatan ke depan (wajib sumber resmi) dan kejadian yang sedang berlangsung, dengan masa berlaku dari tanggal di judul. Panel bersama `public/inti/peringatan-berita.js` di tab Insight tujuh halaman dan `/semua`, berlabel "dari berita, belum diverifikasi".
   - **Abrasi garis pantai tahunan** (`1cd255ee`): Landsat 1988 sampai 2025, MNDWI + Otsu, transek 1 km, laju regresi dengan selang 95%, lima situs pantura, 167 transek (161 terbaca). Lapisan `abrasi` di entri banjir; agent baru `pesisir`.
   - **Konpers harian, rekomendasi cara padam per kompleks, arsip evaluasi OMC** (`scripts/data/taktik.py`): heli selalu pelengkap, dry ice bukan pemadaman titik.
5. 20 Okt 2026
   - **Titik tengah dilarang**: *"Gw ga pernah suka dipisahin titik gini. Catet."* (paparan Presiden). Tiap teks tampil, kartu, pil, slide, dan judul laporan tanpa " · ". Pakai koma, label sendiri, atau baris baru. Angka kunci di depan.
   - **Semua bencana dibuka di menu**: label "Soon" dicabut dari dropdown bencana.
   - **Header**: tab rata tengah, ikon tampil di desktop, tab pindah ke menu garis tiga di bawah 1280 px.
   - **Simulasi cuaca**: model dampak angin, limpasan, gelombang badai, pita ansambel, peringkat tindakan.
   - **Laporan konsesi**: indikasi lahan dibakar lalu jadi sawit (kebakaran 2015) dengan empat foto bukti; citra Sentinel-2 untuk 1.529 konsesi bertitik, panel tanpa adegan memakai citra terdekat (paling jauh 10 hari) sebelum jatuh ke VIIRS.
   - **Insiden penanda konflik**: `<<<<<<<` ter-commit di `public/udara/data/*.json`, JSON.parse gagal di layar tanpa satu uji merah. Gerbang baru `gerbang-konflik`.
   - **Ruang Koordinasi gelombang penyempurnaan**: Layar Pimpinan, pengingat harian, kapasitas relawan dinamis, uji balik jujur, mode luring, arsip sitrep R2, rehab-rekon, stok gudang, ekspor gaya DIBI, uji layar 59/59.
6. 19 Okt 2026
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
7. 18 Okt 2026
   - **Overlay Lahan diringkas**: 12 tombol jadi 8 berikon, lalu Hutan (kawasan hutan 2026, tutupan lahan 2025, tutupan pohon, hutan primer, mangrove) dan Konsesi (batas izin, hutan tanaman, tambang) sebagai pil pilihan.
   - **Lapisan Kesatuan Hidrologis Gambut** (518 KHG, BRGM PRIMS WFS), nama mulai zoom 8.
   - **Cari pabrik/konsesi** dengan buffer 10/25/50 km, slider banding, timelapse GIF, persen harian di pop-up.
   - **Laporan konsesi** (`/laporan-konsesi`, hanya Centurisk97) dan **laporan harian generik** (mesin `public/inti/laporan.js`, kontrak v1).
   - **Banjir**: peluang status 3 hari dari ansambel ECMWF, rob terpisah, dampak 4 hari + jalan berisiko terputus, bukti DAS hulu untuk 16 daerah.
   - **Cuaca ekstrem**: prediksi kecamatan 72 jam, siklon, gelombang, verifikasi, simulasi, laporan harian.
   - Worker menyajikan PMTiles dari R2 (`/ubin/<nama>.pmtiles`, HTTP Range). Roster: `tests/<bencana>/**` milik pengerja modulnya.
8. 17 Okt 2026
   - **Enam bencana dibuka** (status aktif, "Segera" hilang, masuk sitemap): banjir, gempa & tsunami, letusan gunung api, kekeringan, kualitas udara, ditambah beranda `/semua`. Tiap modul lolos audit paritas terhadap karhutla (`docs/multi-bencana/PARITAS-*.md`) dan cek data ke sumber resmi (BMKG gempaterkini 15/15, MAGMA level dan radius, SPI dihitung ulang). *"Kalo misal udah selesai maka coming soon nya dihilangkan dan orang bisa akses ya."* Cuaca ekstrem menyusul hari yang sama begitu nowcast BMKG tiap 10 menit ikut menentukan `/api/status`.
   - **Modul karhutla dipasang ulang, bukan disalin**: *"modulnya yang dari karhutla kaya plug and play ya... Lu tetap berpaku pada artifacts"*, lalu *"kodingannya udah ada semua ya tiru aja semua. Biar bisa kaya mirroring gitu."* CSS bersama di `public/inti/`, kartu Insight, mesin Bagikan per bencana, pop-up Situasi `Sapa.daftar`, foto per bencana (`?bencana=`), kaki/jejak/OG dari registry. Tambahan khas bencana boleh asal beralasan.
   - **Laporan harian karhutla** (`/laporan`): titik panas dan luas terdampak per provinsi dan kab/kota, perbandingan harian, cut-off dan sumber, cetak PDF berkop provinsi, kurva musim lintas tahun dengan latar median 2019 sampai 2025.
   - **Aktor konsesi**: nama perusahaan dan grup dipulihkan; klik perusahaan membuka laci linimasa titik panas 2026. Kartu PSN Merauke dan Tokoh politik disembunyikan; WALHI tidak tampil.
   - **Data dijujurkan**: kekeringan "Awas" butuh dua bukti (SPI-3 dan tanah atau SPI-6; 154 jadi 80 kab/kota), udara berlabel "perkiraan model CAMS, belum dikoreksi", tanggal letusan MAGMA dibetulkan, gelombang cuaca hanya kelas tinggi ke atas.
   - **Peringatan dini dan NASA**: pop-up alarm di semua halaman (`public/inti/alarm.js`); lapisan GIBS sempat dipasang lalu citra satelit NASA dibuang dari Overlay karhutla, CO AIRS sebaris AQI dan Hujan.
   - **Produksi = worker `centurisk97`**: domain pantau.terasurban.com ternyata dilayani worker kedua; `wrangler.jsonc` diganti ke `centurisk97`, yang memegang domain, secret, dan cron. Worker `poskokarhutla` yatim.
   - **Tanpa branch**: *"Agar cukup main saja ya jangan ada branch."* Lalu *"gw ga mau ada branch"* saat melihat `staging`; branch itu dihapus.
   - **Insiden dan gerbangnya**: terbit gagal karena `_headers` lebih dari 100 aturan; terbit gagal karena batas 5 cron akun Workers Free (kini satu cron tiap menit); data live basi karena deploy dari laptop; git macet karena repo di iCloud Documents. *"Catat ya biar ga gagal lagi."*
9. 16 Okt 2026
   - **Jalan 20 jam**: *"Lu yang tentukan sendiri habis ini apa setelah ini apa."* Ucapan berulang dari 438 pesan dijadikan aturan A1 sampai A25 dan rencana sembilan blok di `docs/multi-bencana/RENCANA-20-JAM.md`. Push dan deploy menunggu kata pemilik.
   - **Perfeksionis**: *"Gw adalah perfeksionis sedetail itu... lu harus control freak dan lu harus review lagi kerjaan agent lu."* Laporan agent bukan bukti.
   - **Tiga keputusan copy diputus**: sapaan "kamu", em dash dilarang di teks tampil, ikon tetap SVG garis.
   - **Rencana multi-bencana dilengkapi**: `PETA.md`, `PELATIHAN-MODEL.md`, `COPYWRITING.md`, `MODUL-PLUG-AND-PLAY.md`. *"Rencana arsitektur copywriting total fitur nya gimana modul nya yang udah ada jadi plug and play. Copy coding petanya. Petanya juga tiru modelnya."*
   - **Lima buku pegangan rujukan dipasang** (`docs/buku-pegangan/rujukan/`) dan diterbitkan sebagai artifact. Buku ini lahir meniru bentuknya: *"Iya lu tiru ya dari situ."*
10. 15 Okt 2026
   - **Semua bencana meniru karhutla, rinci dan exhaustive**: *"Gw mau yang bencana lain tiru best practice dan secara rinci semua fitur dan bagian yang dari Karhutla."*
   - **Foto lapangan**: 100 foto dummy karhutla, unik semua. Label waktu dan ikon kategori duduk DI DALAM foto; *"Gausah ada nomor ini de."* Upvote, bukan ikon hati; koordinat GPS tampil di pop-up.
   - **Nama provinsi di peta**: rounded rectangle, cukup besar. *"Bro coba agak besarin dikit dong yang nama provinsinya soalnya ga keliatan sumpah."*
   - Admin masuk pakai email dan kata sandi. Mobile 640 px ke bawah: tab pindah ke menu garis tiga.
11. 14 Okt 2026
    - **Daftar "yang disembunyikan" wajib dicatat**, karena pemilik bisa meminta daftarnya dan memulihkan sebagian.
    - **Bahasa konsesi netral**: "titik panas berada di dalam areal konsesi", tidak pernah menuduh siapa yang membakar.
    - Halaman Tentang bergaya editorial berfoto. Lapisan Angin dikembalikan NYALA.
12. 13 Okt 2026
    - **Semua halaman memakai format kartu Insight**. *"jelek banget"* untuk catatan teks polos, `<select>` bawaan, dan singkatan "rb" dalam perbandingan.
    - **"9 provinsi prioritas" dilarang**; tulis "provinsi yang sering mengalami karhutla".
13. 12 Okt 2026
    - Repo lahir: situs statis Cloudflare, tab Insight, mode peta, kalender bahaya, pembaruan data harian 21.20 WIB.

## Keputusan pemilik

### Diputus

| Keputusan | Tanggal | Bunyinya |
| --- | --- | --- |
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
| Layout | PUTIH (FFFFFF) untuk isi, GELAP (051C2C) untuk penutup dan pembatas Lampiran. Tanpa persegi putih full-bleed |
| Margin | Kiri 43,2 pt, tepi kanan isi 916,8 pt, lebar isi 873,6 pt |
| Kotak judul | x43,2 y21,6, tinggi 47,5–65 pt, anchor bawah, inset 0. Lebar 823 pt, atau 644 pt bila ada pil CUT OFF |
| Garis | 0,75 pt 1A1A1A selebar 873,6 pt, di y95 (bawah judul) dan y507,6 (atas footer) |
| Logo BNPB | 27,4×34,6 pt di (889,4; 28,8), tanpa lingkaran |
| Footer | `Badan Nasional Penanggulangan Bencana  \|  Copyright 2026` (dua spasi mengapit garis), 8,5 pt 1A1A1A di y512,6. Nomor halaman 8,5 pt bold rata kanan, berakhir di x916,8 |
| Sampul dan penutup | Tanpa footer dan tanpa nomor halaman (d2 dan d4 memasang footer di sampul, salah) |

### Struktur per jenis deck

| Jenis | Isi | Sampul / penutup |
| --- | --- | --- |
| Laporan Kejadian Bencana Harian | Tepat 4 slide: sampul, ringkasan dan peta, rincian per jenis, penutup | Ya / ya (GELAP) |
| Laporan Penanganan Pengendalian Karhutla | 3 slide: peta nasional, tabel provinsi, operasi. Versi Lengkap ditambah konsesi, pembatas, A1–A11, dan B1–B5 | Tidak / tidak |
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
  - **Karhutla dengan sisa belum padam 0 ha di website masuk selesai**, walau laporan lapangan belum menutupnya: *"udah nol ya masuk selesai dong"* (Kota Tidore, 23 Okt). Aksinya ikut dibuang dari pita YANG AKAN DILAKUKAN.
  - **Perlu perhatian tidak sama dengan dalam penanganan** (*"Emang semua perlu perhatian ya?"*). Kartu PERLU PERHATIAN menghitung karhutla dalam penanganan yang sisa belum padamnya 100 ha atau lebih, atau yang dilapor BPBD apinya belum padam. Sisa kecil (Riau ±2 ha, Raja Ampat ±5 ha) tetap dalam penanganan, tapi tidak perlu perhatian. Kartunya berlabel "karhutla perlu perhatian". Di daftar dalam penanganan, baris yang perlu perhatian diberi tanda ! merah yang sama dengan peta.
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
