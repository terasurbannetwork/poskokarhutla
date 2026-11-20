# KEPUTUSAN-LAPOR-AI: Pelaporan kejadian bencana dipandu AI (WA dan web)

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

Rujukan konsep: deck pemilik "Digitalisasi dan Pelibatan Publik dalam Pendataan Bencana" (Tim Ahli dan Tim Sus IT BNPB, Jakarta, 18 November 2026; disampaikan kepada Kepala BNPB). Ringkasan isinya ada di `RISET.md` bagian 1.

## Masalah

Laporan kejadian bencana berjenjang (masyarakat, BPBD, Pusdalops, Pimpinan Pusdalops, Pimpinan BNPB) dan tiap jenjang menambah jeda. Isian sering tidak lengkap dan baru ketahuan di pusat, tiap petugas menafsirkan isian berbeda, foto terpisah dari laporan tanpa lokasi, laporan diketik ulang di tiap jenjang, dan warga yang pertama melihat kejadian belum punya kanal resmi. Akibatnya keputusan status dan bantuan diambil dari laporan yang terlambat.

## Keputusan pemilik

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K1 | 19 Nov 2026 | Bangun pelaporan kejadian bencana lewat chatbot AI sesuai deck rujukan: pelapor (BPBD atau masyarakat) bercerita, AI menanyakan data umum dan data khusus satu per satu sampai lengkap, laporan baku tersusun otomatis, diteruskan real time. |
| K2 | 19 Nov 2026 | Pengguna uji pertama adalah satu nomor WA yang disebut pemilik di chat. Nomornya **tidak ditulis di repo** (repo publik); didaftarkan pemilik lewat perintah WA `lapor izin <nomor>` ke tabel `lapor_izin` (lihat `DESAIN-TEKNIS.md` bagian Izin uji). |
| K3 | 19 Nov 2026 | Ada versi web yang "bisa untuk mobile dan bisa untuk web": satu halaman yang nyaman di HP dan di layar lebar, memakai mesin percakapan yang sama dengan WA. |
| K4 | 19 Nov 2026 | Konsep disusun lengkap dulu sebelum kode (AGENTS.md 3.7). |
| K5 | 19 Nov 2026 | Lampiran foto memakai konsep foto publik yang sudah berjalan: "foto dari publik selama ini yang ada geotag dan ada waktunya juga" (unggah foto warga `src/foto.js`: koordinat GPS perangkat saat unggah, waktu ambil, pemeriksaan EXIF dan GPS janggal `src/gps.js`). |
| K6 | 19 Nov 2026 | Pelapor bisa publik (warga) dan BPBD, lewat chatbot yang sama. Bot "langsung aja di awal" menanyakan data awal yang wajib, mulai dari identitas. |
| K7 | 19 Nov 2026 | Ada halaman monitoring: siapa saja yang melapor, dari nomor mana, dan laporannya apa. |
| K8 | 19 Nov 2026 | Tiap laporan langsung jadi laporan PDF dan jadi tiket. |
| K9 | 19 Nov 2026 | Ada tampilan dashboard di peta. |
| K10 | 19 Nov 2026 | Tampilan foto seperti tampilan foto publik yang sudah ada, tetapi foto masuk lewat chatbot WA ("laporannya konsepnya WA chat bot"). |
| K11 | 19 Nov 2026 | Pilihan di WA sebaiknya seperti Telegram: "pill yang tinggal dipilih", bukan mengetik angka. |
| K12 | 19 Nov 2026 | Lokasi diminta paling awal dan wajib ("Bagikan lokasi adalah ketika awal langsung", "Intinya wajib lokasi"); bisa "Pakai lokasi saat ini" atau cari nama tempat. Dari GPS langsung terbaca provinsi, kab/kota, kecamatan, desa, lalu RT dan RW. |
| K13 | 19 Nov 2026 | Untuk publik awam semua dipandu: tiap pertanyaan punya penjelasan istilah, contoh, dan templat; "usahakan semuanya itu adalah pilihan, jangan mereka harus isi sendiri" (pilihan, formulir angka, pemilih tanggal). |
| K14 | 19 Nov 2026 | Jawaban yang belum lengkap atau tidak jelas dikeluhkan dan ditanya ulang; sebelum ringkasan yang masih kosong ditanya lagi ("harus 100%"). |
| K15 | 19 Nov 2026 | Ada pertanyaan lanjutan bila jawabannya ada (misalnya sekolah rusak lebih dari 0: nama sekolahnya). |
| K16 | 19 Nov 2026 | Definisi harus bersumber (pemilik: "definisi rusak berat ... itu dari mana?"): korban, pengungsi, dan tingkat kerusakan dari Rancangan Juklak Standar Data; intensitas gempa dari SIG-BMKG sebagai fenomena yang bisa diamati. |
| K17 | 19 Nov 2026 | Waktu kejadian dan waktu dilaporkan dicatat terpisah ("log kejadian kapan terlapor dan kapan bencana terjadi"). |
| K18 | 19 Nov 2026 | Penutup: "Terima kasih sudah melaporkan", nomor tiket, "tim kami akan menghubungi Anda", laporan dalam bentuk PDF dan Word yang bisa diunduh, dan tautan pemantauan seperti lacak pesanan. |
| K19 | 19 Nov 2026 | Status tiket bisa dipantau pelapor "persis kaya tiket": diterima, sudah dilihat petugas, ditelaah, diteruskan, ditindaklanjuti, selesai. Admin bisa membalas dan menghubungi pelapor. |
| K20 | 19 Nov 2026 | Pola tampilan: kartu berkepala ala formulir Betutu Sambe (data pelapor, pilih bencana bergambar lalu karakteristik, tombol hari); jendela messenger ala Intercom (Beranda, Laporan, Bantuan, persetujuan data di awal, nilai percakapan, lampiran foto dan dokumen, menu cari dan unduh transkrip); pola ChatHPT (Tanya, Riwayat, Jelajah, Lainnya, Tentang, FAQ, sumber jawaban dapat diperiksa). |
| K21 | 19 Nov 2026 | Menu awal: informasi bencana di daerah, prediksi bencana di daerah, melapor bencana, dan edukasi bencana. Bisa memakai suara. |
| K22 | 19 Nov 2026 | Tinjau lokal di http://localhost:8800 (bukan port lain). Tombol keluar tidak tampil di /lapor. Kotak nomor hanya angka. Percakapan disimpan di cache peramban. |
| K23 | 19 Nov 2026 | Kebijakan privasi meniru tata letak halaman privasi Anthropic. Isinya ditulis untuk layanan BNPB (bukan salinan teks pihak lain) dan ditinjau bagian hukum BNPB sebelum publik. |
| K24 | 19 Nov 2026 | WA mengikuti alur yang sama, disesuaikan ke teks bernomor; tombol seperti Telegram menunggu Q13. |
| K25 | 19 Nov 2026 | Kajian Penentuan Kejadian Bencana dan Lampirannya (17 Nov 2026) menjadi pedoman supaya laporan yang dihasilkan langsung jadi sesuai standar. |
| K26 | 19 Nov 2026 | Ada pembuka animasi "Selamat datang di Lapor Bencana" dengan maskot beranimasi (meniru teknik maskot KDMP atau worth-it), maskot memakai logo BNPB. |
| K27 | 19 Nov 2026 | Info bencana dan prediksi di daerah tampil sebagai ringkasan langsung di chat per provinsi dan kab/kota, bukan diarahkan ke halaman utama. Nomor penting (BPBD daerah, damkar, rumah sakit dan polisi terdekat) baru tampil sesudah lokasi terverifikasi. |
| K28 | 19 Nov 2026 | Edukasi bencana diriset dari sumber resmi, bukan daftar singkat. FAQ meniru gaya halaman Tentang Centurisk97. Kebijakan privasi tampil di dalam aplikasi. Blok kontak BNPB (call center 117, alamat, telepon, surel, situs, Satu Data Bencana, media sosial) tampil. |
| K29 | 19 Nov 2026 | Pencarian lokasi tidak hanya desa: kab/kota, kecamatan, dan nama jalan. Tampilan selebar layar, tanpa ruang kosong besar dan tanpa kotak sempit. |
| K30 | 19 Nov 2026 | Ada Alun-alun: warga bisa melihat laporan bencana dari daerah lain. |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satu mesin percakapan, dua pintu. Mesinnya di Worker (`src/lapor_ai*.js`). Pintu WA: gateway Baileys meneruskan pesan nomor uji ke rute Worker dan mengirim balasan Worker apa adanya. Pintu web: halaman `/lapor` memanggil rute yang sama. | Satu sumber aturan; laporan yang dimulai di WA bisa dilanjutkan di web dan sebaliknya; tidak bergantung Mac mini menyala untuk pintu web. |
| D2 | Kode, bukan AI, yang memegang alur. Daftar isian, urutan, isian wajib, dan kapan laporan lengkap ditentukan spek isian (`lapor_spek`) dan fungsi kelengkapan murni. AI hanya (a) mengurai pesan pelapor jadi isian dengan kutipan, dan (b) memberi satu kalimat tanggapan yang sopan tanpa angka. Pertanyaan berikutnya selalu dari templat spek untuk isian yang dipilih kode. | AI tidak bisa melewatkan isian wajib atau mengarang urutan; perilaku bisa diuji tanpa AI. |
| D3 | Tiap angka hasil uraian wajib disertai kutipan teks pelapor. Validator menolak angka yang kutipannya tidak ada di pesan. Angka yang tidak disebut pelapor tetap kosong ("belum didata"), tidak pernah nol. | Pola D2 bot laporan; mencegah angka karangan. Juklak: nilai, nihil, atau belum didata. |
| D4 | Spek isian diturunkan mesin dari Rancangan Juklak Standar Data (`data/kajian-bnpb/standar-data-bencana/03-juklak-baru/naskah/`: Lampiran I data umum, Lampiran III data khusus per jenis), tidak ditulis tangan. Isian bertahap "Laporan awal" yang ditanyakan di versi pertama. | Deck: "juklak yang telah disepakati sebagai standar". Satu sumber istilah dengan kajian standar data. |
| D5 | Laporan awal wajib tiga kelompok: identitas kejadian (jenis dan subjenis), waktu, dan lokasi spesifik dengan koordinat. Kelompok lain (korban, pengungsian, rumah, fasilitas, layanan dasar, kebutuhan, data khusus, foto) ditanyakan sesudahnya dan boleh dijawab "belum tahu". | Deck slide 4: tiga isian oranye wajib di laporan awal. Pelapor di lapangan tidak boleh tertahan oleh isian yang memang belum diketahui. |
| D6 | Pilihan jenis dan subjenis ditampilkan sebagai daftar bernomor (WA) atau tombol (web), paling banyak empat sampai enam pilihan teratas dari tebakan AI, ditambah "lainnya". | Deck slide 4 (contoh "Pilih yang paling mirip"); Baileys tidak andal untuk tombol interaktif. |
| D7 | Laporan dari pelapor berlabel tingkat sumber: `bpbd` (akun BPBD terdaftar) atau `warga`. Laporan warga selalu "belum terverifikasi", tidak pernah membuat kejadian resmi, tidak pernah tampil publik, dan tidak menutup kejadian. | Pola alun-alun (AGENTS 2.26) dan Cek Kabar (2.11). |
| D8 | Laporan lengkap disimpan sebagai catatan D1 dan masuk Buku Besar Kejadian lewat pencocok yang sudah ada (`scripts/siklus/pasang.py`) sebagai sumber baru `lapor_ai` di `PRIORITAS_MASUK`, yang menempel ke gugus dan tidak pernah mendirikan gugus sendiri. Laporan BPBD juga bisa didorong ke meja `dampak` berstatus `dilaporkan` sehingga alur verifikasi dan Terima ke Logbook yang sudah ada (KEPUTUSAN-JUKLAK T10, T11) berlaku. Tidak ada buku kejadian kedua. | AGENTS 2.7, 2.15. |
| D9 | Selama uji (fase F0) laporan jadi hanya dikirim ke pelapor uji dan ke `PEMILIK`. Tidak ada kiriman otomatis ke BPBD, Pusdalops, atau pimpinan. | Mengirim pesan ke pejabat adalah tindakan keluar; butuh keputusan pemilik (Q5). |
| D10 | Lokasi kejadian: pintu web memakai GPS perangkat (izin peramban); pintu WA memakai pesan "Bagikan lokasi" WA. Koordinat dicocokkan ke kab/kota, kecamatan, dan desa dari data wilayah repo (`cariWilayah` di `src/titik.js`, `public/data/desa_cari.json`). Ketelitian lokasi (Lampiran I 3.3) diisi otomatis: GPS akurasi 1 km atau lebih baik = "titik GPS"; lokasi dari nama desa yang diketik = "perkiraan tingkat desa". | Deck: lokasi spesifik dengan geotag wajib di laporan awal. |
| D11 | Foto (K5) memakai aturan foto publik yang sudah ada, tanpa aturan kedua: koordinat foto = GPS perangkat saat unggah (akurasi 1 km atau lebih baik, dibaca paling lama 10 menit lalu, tidak bisa dipilih pengguna); bila EXIF membawa GPS dan waktu, foto lebih dari 5 km dari GPS perangkat atau diambil lebih dari 48 jam lalu ditolak; GPS janggal ditolak atau ditandai curiga oleh `nilaiGps` (`src/gps.js`); metadata dibersihkan `bersihMedia` sebelum disimpan. Fungsi pemeriksaannya dipakai ulang dari `src/foto.js`, tidak disalin. Yang melekat di laporan: koordinat, waktu ambil, waktu unggah, dan lencana verifikasi (GPS perangkat, EXIF cocok, curiga). | Konsep yang sudah dikenal pemilik dan sudah diuji; deck: "foto bertanda lokasi dan waktu melekat di laporan". |
| D16 | Foto masuk lewat chat WA (K10). WA membuang EXIF dan tidak memberi GPS perangkat, jadi foto chat WA ditandai dari dua hal yang dipegang bot: waktu pesan WA (waktu terima, bukan waktu ambil) dan lokasi "Bagikan lokasi" WA terdekat di sesi yang sama (paling jauh 30 menit sebelum atau sesudah foto). Lencananya "lokasi WA". Bila belum ada lokasi, bot meminta Bagikan lokasi sekali. Untuk lencana terkuat "GPS perangkat" (aturan D11), bot juga menawarkan tautan bertoken sekali pakai (24 jam, terikat satu laporan) ke halaman kamera `/lapor/foto`. Foto yang dikirim sebagai Dokumen membawa EXIF utuh dan diperiksa dengan aturan EXIF D11 (jarak ke lokasi WA dan umur 48 jam). | Pelapor tetap di chat WA; lencana jujur menunjukkan seberapa kuat bukti lokasinya. |
| D17 | Foto disimpan di R2 `lapor/` di balik sesi, tidak dikirim ke AI pada F0, dan tampil di galeri staf `/lapor/foto-galeri` yang meniru tata letak galeri foto publik (`public/foto.*`): kisi foto, lencana, pop-up dengan peta mini, jenis, waktu, dan nomor laporan. Tidak masuk galeri foto publik (Q11). | K10; wajah warga dan rumah. |
| D12 | Data orang: korban hanya angka agregat (tanpa nama korban, tanpa NIK). Identitas pelapor (nama, nomor WA, peran, instansi) disimpan terbaca di D1 karena K7, dan hanya tampil di layar staf monitoring; tidak pernah di `public/data`, ekspor publik, log, atau kiriman ke AI. Teks bebas disaring `teksBersih` sebelum disimpan dan `samarkan` sebelum dikirim ke AI. | K7; UU 27/2022 PDP; KEAMANAN-PRIVASI. |
| D18 | Identitas di awal (K6). Pesan pertama nomor yang belum dikenal dibalas pertanyaan data awal secara berurutan sebelum cerita: (1) melapor sebagai Warga atau Petugas BPBD, (2) nama, (3) khusus BPBD: kab/kota dan jabatan. Lalu data awal kejadian (D5). Identitas disimpan per nomor; laporan berikutnya cukup "Melapor sebagai Budi (warga)? 1 Ya, 2 Ganti". Bila pesan pertama sudah berisi cerita kejadian, ceritanya disimpan dan diurai sesudah identitas, tidak diminta ulang. | Pelapor tahu sejak awal apa yang ditanyakan; monitoring K7 butuh identitas. |
| D19 | Peran BPBD yang diakui sendiri berlabel `bpbd_klaim` sampai nomor itu dikonfirmasi PEMILIK atau admin (`lapor izin <nomor> bpbd <kab>`, atau tombol Konfirmasi di halaman monitoring). Laporan `bpbd_klaim` diperlakukan seperti warga untuk Buku Besar dan meja `dampak`. | Siapa pun bisa mengaku petugas; D7 tetap terjaga. |
| D20 | Tiket (K8): tiap laporan terkirim langsung menjadi tiket bernomor sama `LA-DDMMYY-NN` berstatus `baru`. Status: `baru`, `ditelaah`, `diteruskan`, `ditindaklanjuti`, `selesai`, `tidak_valid`. Tiap pindah status dan catatan staf disimpan append-only dengan pelaku dan waktu. Status tiket tidak pernah mengubah isi laporan, tidak membuat atau menutup kejadian resmi. Pelapor diberi tahu lewat WA saat tiket `ditindaklanjuti` dan `selesai` (teks tetap). | Pola log tindak lanjut Dalops (AGENTS 2.13). |
| D21 | PDF (K8): tiap laporan terkirim langsung dibuatkan PDF A4 dari halaman laporan `/lapor/l/<nomor>` (gaya cetak BNPB: kop logo BNPB dan KRIS, identitas pelapor, isian per kelompok, peta lokasi, foto berlencana, jejak asal isian, QR ke halaman laporan). PDF dibuat mesin bot (Playwright, sudah terpasang untuk laporan harian) dan disimpan di R2; dikirim ke pelapor di WA dan bisa diunduh dari monitoring. Versi perkembangan membuat PDF baru, PDF lama tetap. | Mesin cetak yang sudah ada; satu tampilan untuk layar dan PDF. |
| D22 | Monitoring (K7) dan dashboard peta (K9) adalah satu layar staf `/lapor/meja` dengan tiga tab: Peta (titik laporan diwarnai status tiket, filter jenis, tingkat sumber, rentang waktu, kab; panel samping bisa ditarik seperti peta utama), Daftar (tabel: waktu, nomor tiket, pelapor, nomor WA, peran, jenis, kab, persen lengkap, foto, status), dan Foto (D17). Klik titik atau baris membuka rincian laporan, transkrip, PDF, dan riwayat tiket. | Satu pintu untuk staf; gaya peta utama (memori `sidebar-bisa-ditarik`). |
| D13 | Pintu web memakai akun umum dari Satu Pintu Masuk (`/masuk`, kode sekali pakai lewat WA, AGENTS 2.17). Selama uji, hanya nomor di daftar izin uji yang bisa membuka sesi lapor. | Identitas web = nomor WA yang sama; tanpa sandi baru. |
| D14 | Web: satu halaman vanilla JS tanpa build step, mobile-first, tanpa pustaka chat. Gaya dari token `public/inti/tema.css` (AGENTS 3.9); kepala situs navy bersama. | Stack repo; aturan merek. |
| D15 | Satu putaran percakapan = satu panggilan model paling banyak. Balasan yang bisa dibuat kode (konfirmasi pilihan, ringkasan, terima kasih) tidak memanggil model. | Biaya dan kecepatan. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Pengguna uji pertama berperan sebagai siapa: petugas BPBD (kab/kota mana) atau warga? | **[BAWAAN SEMENTARA]** Pengguna uji memilih sendiri di awal (D18); bila memilih BPBD, labelnya `bpbd_klaim` sampai pemilik mengonfirmasi (D19). | LA-04 |
| Q2 | Model AI: Claude API (seperti bot laporan, kunci jadi secret Worker) atau Workers AI (seperti `/ai`, gratis, mutu bahasa Indonesia lebih rendah)? | **[BAWAAN SEMENTARA]** Claude API, model `claude-sonnet-5-5` effort rendah untuk percakapan; secret `ANTHROPIC_API_KEY` dipasang pemilik di Worker. Tanpa secret, mesin jalan dengan pertanyaan templat tanpa AI (D2 membuat ini mungkin). | LA-03 |
| Q3 | Standar isian: Rancangan Juklak Standar Data (belum ditetapkan) atau Juklak 7/2023 Lampiran I yang berlaku (sudah jadi meja `dampak`)? | **[BAWAAN SEMENTARA]** Rancangan Juklak (D4), dengan peta kolom ke meja `dampak` untuk isian yang sama. | LA-01 |
| Q4 | Foto boleh dikirim ke AI untuk menebak jenis bencana dan tingkat kerusakan? | **[BAWAAN SEMENTARA]** Tidak pada F0 (D17). | F1 |
| Q5 | Sesudah uji, laporan diteruskan ke siapa dan lewat apa: BPBD kab/kota setempat, Pusdalops, Pimpinan BNPB (WA, surel, layar `/bnpb/dalops`)? | **[BAWAAN SEMENTARA]** F0 hanya pelapor dan PEMILIK (D9). Laporan tampil di layar staf `/lapor/meja` untuk dibaca. | F1 |
| Q6 | Pesan suara (voice note) WA: ditranskripsi? | **[BAWAAN SEMENTARA]** Tidak. Bot membalas "Kirim dalam bentuk tulisan". | F1 |
| Q7 | Untuk masyarakat luas (F2), nomor bot pakai WhatsApp Business Platform resmi (berbayar per percakapan, tidak diblokir) atau tetap Baileys (gratis, rawan blokir)? | **[BAWAAN SEMENTARA]** F0 dan F1 di nomor bot yang ada (Baileys). F2 tidak dibuka sebelum pemilik menjawab. | F2 |
| Q13 | Pilihan tombol di WA (K11): tombol balasan (paling banyak 3) dan daftar pilihan (paling banyak 10 baris) hanya resmi di WhatsApp Business Platform (Cloud API, berbayar per percakapan, butuh verifikasi bisnis BNPB dan nomor baru). Gateway sekarang (Baileys, WhatsApp Web tidak resmi) tidak bisa mengirimnya dengan andal, dan mencobanya menaikkan risiko nomor diblokir. Pindah ke Cloud API untuk nomor lapor? | **[BAWAAN SEMENTARA]** F0 tetap angka bernomor di WA (D6); web `/lapor` sudah memakai tombol. Mesin sudah menyimpan pilihan sebagai daftar terpisah (`pilihan`), jadi pintu Cloud API tinggal memetakannya ke tombol (3 pilihan atau kurang) atau daftar (4 sampai 10) tanpa mengubah mesin. | F1 |
| Q8 | Permintaan verifikasi dua arah: siapa di BNPB yang boleh mengirim "minta verifikasi" ke BPBD, dan BPBD dihubungi lewat kontak mana? | **[BAWAAN SEMENTARA]** Belum dibangun di F0. Rancangan alurnya ada di `ALUR.md` bagian 5. | F1 |
| Q9 | Batas pemakaian per nomor per hari? | **[BAWAAN SEMENTARA]** 5 laporan dan 120 pesan per nomor per hari WIB; lewat batas dibalas sopan. | LA-06 |
| Q11 | Peta laporan dan galeri foto laporan juga tampil di halaman publik? | **[BAWAAN SEMENTARA]** Tidak; hanya staf (D7, D17). | F2 |
| Q12 | Siapa saja yang boleh membuka monitoring dan mengubah status tiket (nomor WA pelapor terlihat di sana)? | **[BAWAAN SEMENTARA]** Admin dan staf berperan `pusdalops` atau `koordalops`; F0 cukup PEMILIK lewat sesi admin. | LA-10 |
| Q14 | Dijawab pemilik 19 Nov 2026 ("usulan lu aja"): Alun-alun warga hanya menampilkan laporan berstatus ditindaklanjuti atau selesai, tanpa nama, nomor WA, foto, dan kronologi bebas; lokasi sampai desa; isi hanya jenis, karakteristik, waktu, dan angka dampak. | Dijawab. | LA-17 |
| Q15 | Dijawab pemilik 19 Nov 2026 ("usulan lu aja"): belum memakai layanan pencari alamat dari luar; pencarian memakai data wilayah sendiri (kab/kota, kecamatan, desa). Nama jalan ditinjau ulang bila pemilik memilih layanannya. | Dijawab. | LA-18 |
| Q10 | Nama layanan yang dilihat pelapor? | **[BAWAAN SEMENTARA]** "Lapor Bencana BNPB" (sesuai contoh percakapan di deck). | LA-02 |

## Fase

| Fase | Isi | Syarat masuk |
| --- | --- | --- |
| F0 Uji | Satu pengguna uji, pintu WA dan web, laporan ke pelapor dan PEMILIK, layar staf baca-saja | Paket ini diperiksa; LA-01 sampai LA-10 selesai; uji percakapan emas lulus |
| F1 Rintisan BPBD | Beberapa BPBD terpilih, dorong ke meja `dampak`, teruskan ke Pusdalops, minta verifikasi | Q1, Q5, Q8 dijawab; metrik F0 (RENCANA-UJI bagian 4) memenuhi |
| F2 Masyarakat | Nomor publik, laporan warga massal | Q7 dijawab; moderasi dan batas laju diuji beban |

---

# Lanjutan 19 Nov 2026: enam fitur lanjutan

Pemilik memilih enam fitur lanjutan pada 19 Nov 2026. Semuanya masuk paket ini lebih dulu sebagai dokumen (AGENTS 3.7); belum ada kode. Pertanyaan yang belum dijawab pemilik ada di Q16 sampai Q26 dengan bawaan sementara bertanda **[BAWAAN SEMENTARA]**. Rincian ada di `PRD.md` (F-18 sampai F-29), `ALUR.md` bagian 7 sampai 12, `ALGORITMA.md` A9 sampai A14, `DESAIN-TEKNIS.md` bagian Lanjutan, dan `TIKET.md` (LA-22 sampai LA-34).

## Keputusan pemilik (lanjutan)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K31 | 19 Nov 2026 | Verifikasi dua arah ke BPBD dibangun: staf menekan "Minta verifikasi" di `/lapor/meja`, BPBD setempat menerima tautan, dan menjawab Benar, Sebagian benar (dengan koreksi), atau Tidak ditemukan. Menggantikan rancangan awal di `ALUR.md` bagian 5 (isinya dipindah dan diperinci di bagian 7). |
| K32 | 19 Nov 2026 | Peringatan balik ke pelapor sekitar: bila di satu desa ada beberapa laporan, atau BMKG mengeluarkan peringatan, pelapor yang pernah melapor dari daerah itu dikabari lewat WA. |
| K33 | 19 Nov 2026 | Gugus laporan otomatis: laporan berdekatan, jenis sama, dalam beberapa jam digabung menjadi satu gugus di meja, lalu ditempel ke Buku Besar Kejadian lewat pencocok yang sudah ada. |
| K34 | 19 Nov 2026 | Mode Tanya (LA-19): warga bertanya bebas dan dijawab bersumber dari panduan resmi yang ada di repo; jawaban tanpa sumber tidak diberikan. |
| K35 | 19 Nov 2026 | Laporan susulan: pelapor menambah kabar ke tiket yang sama tanpa laporan baru; versi laporan append-only dan PDF versi baru terbit. |
| K36 | 19 Nov 2026 | Laporan lewat pesan suara dan lewat foto saja: pesan suara WA ditranskripsi lalu diurai mesin yang sama; foto tanpa teks memulai laporan. |

## Keputusan rancangan lanjutan (agent, bisa dibatalkan pemilik)

| No | Fitur | Keputusan | Alasan |
| --- | --- | --- | --- |
| D23 | Verifikasi | Permintaan verifikasi = baris `lapor_verif` dengan token acak (sha256 disimpan di `lapor_tautan`, terikat satu laporan dan satu kontak BPBD, berlaku 48 jam, Q17). Halaman `/lapor/v/<token>` tanpa login menampilkan ringkasan laporan tanpa nama dan nomor pelapor, lalu tiga jawaban. Jawaban disimpan append-only di `lapor_verif_jawab`; boleh lebih dari satu (jawaban terbaru dipakai, riwayat tetap). | Pola tautan bertoken yang sudah dipakai `/uji-pilot` dan kamera `/lapor/foto`; BPBD tidak perlu akun. |
| D24 | Verifikasi | Jawaban verifikasi tidak pernah mengubah isi laporan, status tiket, atau kejadian resmi. "Sebagian benar" menyimpan koreksi sebagai catatan teks (disaring `teksBersih`) yang tampil di rincian laporan dan PDF. Staf yang memutuskan pindah status tiket (A8). "Tidak ditemukan" hanya menandai laporan dan menyarankan staf menimbang `tidak_valid`. | D7: laporan warga tidak pernah resmi; verifikasi adalah bukti tambahan, bukan vonis. |
| D25 | Verifikasi | Pengiriman tautan ke BPBD adalah tindakan keluar. Selama F0 tautan hanya dikirim ke PEMILIK sebagai uji. Pada F1 tautan dikirim hanya ke kontak yang sudah terdaftar di `lapor_kontak_bpbd` untuk kab itu (Q16); tanpa kontak, tombol Minta verifikasi nonaktif dengan alasan terbaca. | D9; AGENTS: pesan ke pejabat butuh keputusan pemilik. |
| D26 | Verifikasi | Penjawab memasukkan nama dan jabatan di halaman. Nama itu klaim: jawaban berlabel "dijawab lewat kontak terdaftar" bila token dikirim ke kontak terdaftar, dan label itu tidak berarti orangnya terkonfirmasi. | Tautan bisa diteruskan; label jujur. |
| D27 | Gugus | Gugus dihitung kode tanpa AI dari laporan terkirim: jenis induk sama, jarak ke anggota terdekat sama atau di bawah radius jenis itu, dan waktu kejadian berselisih paling lama jendela jenis itu (tabel di `ALGORITMA.md` A9, semua HIPOTESIS karena tanpa sumber dan menunggu data F0, Q18). Gugus butuh paling sedikit 2 nomor pelapor berbeda; satu nomor yang melapor dua kali tetap dihitung satu. | Aturan "angka tanpa sumber tidak dikodekan sebagai fakta": ambang ditandai hipotesis dan disetel dari data F0. |
| D28 | Gugus | Angka dampak gugus tidak dijumlah dan tidak dipilih mesin: meja menampilkan angka tiap laporan berdampingan dan rentang terkecil sampai terbesar. | AGENTS 2.9: angka antarsumber tidak dijumlah; laporan yang sama peristiwanya bisa menghitung korban yang sama. |
| D29 | Gugus | Gugus masuk Buku Besar sebagai satu rekaman sumber `lapor_ai` (kode = nomor gugus) lewat `scripts/siklus/pasang.py` dan hanya menempel ke gugus kejadian yang sudah ada. Bila tidak ada kandidat, pencocok mencatat `tanpa_pasangan` dan tidak pernah memakai cabang `baru`. Laporan tunggal yang bukan gugus tidak dikirim ke Buku Besar sebagai rekaman. | D8; AGENTS 2.15: pencocok satu, tanpa buku kejadian kedua; laporan warga tidak mendirikan gugus resmi sendirian. |
| D30 | Gugus | Penomoran gugus `GL-DDMMYY-NN` (urut per tanggal WIB). Gugus yang tersambung ke gugus lain digabung ke yang tertua; yang lain menyimpan `digabung_ke` (append-only, tidak dihapus). | Pola nomor tiket A6; jejak gabung bisa diaudit. |
| D31 | Kabar balik | Dua pemicu, dua aturan. Pemicu gugus: tidak otomatis; staf menekan "Kabari sekitar" setelah melihat jumlah penerima dan teks, karena isinya berangkat dari laporan belum terverifikasi (Q22). Pemicu BMKG: otomatis, tetapi hanya meneruskan peringatan resmi BMKG apa adanya (judul, wilayah, waktu, tautan sumber) dari `public/banjir/data/peringatan.json` (Q21). | Meneruskan peringatan resmi aman dari hoaks; menyebarkan laporan warga tanpa tinjauan tidak. |
| D32 | Kabar balik | Hanya pelapor yang menyetujui dikabari (opt-in, bawaan tidak). Persetujuan diminta sekali sesudah laporan terkirim dan bisa dicabut kapan saja dengan `berhenti kabar`. Lokasi langganan disimpan dibulatkan 0,01 derajat (sekitar 1 km), bukan titik laporan. Teks pesan tetap (templat), tanpa karangan AI, tanpa kata "aman", tanpa saran keselamatan buatan sistem. | UU 27/2022 PDP; D2. |
| D33 | Kabar balik | Batas kirim: satu kabar per peringatan per nomor, paling banyak 1 kabar per 6 jam dan 3 per hari per nomor (Q21). Pesan proaktif ke banyak nomor lewat Baileys dibatasi ke F0 dan F1 (jumlah kecil); tidak dibuka di F2 sebelum Q7 dijawab. | Risiko blokir nomor; limiter gateway. |
| D34 | Mode Tanya | Jawaban dirakit kode dari butir teks asli di `public/lapor/edukasi.json` (18 topik; sumber lembaga, judul, dan tautan melekat pada topik, dan jawaban selalu menyebutnya). AI paling banyak memilih id butir dari daftar kandidat; ia tidak menulis kalimat jawaban. Id di luar kandidat dibuang. Tanpa kandidat yang lolos ambang, bot menjawab "belum ada panduan resmi" dan menawarkan topik terdekat. | D2: kode memegang isi; sumbernya tertelusur; jawaban tanpa sumber mustahil secara konstruksi. |
| D35 | Mode Tanya | Pertanyaan tentang keadaan sekarang atau lokasi ("apakah besok banjir di desa saya", "gempa tadi bahaya?") tidak dijawab dari edukasi; diarahkan ke ringkasan Info daerah dan Prediksi yang sudah ada dan ke BMKG. Pertanyaan medis dan hukum diarahkan ke nomor darurat dan layanan resmi. Tidak pernah menulis "aman". | PRD Larangan. |
| D36 | Susulan | Pesan sesudah laporan terkirim tidak pernah ditebak: bot bertanya "Tambah ke LA-... atau laporan baru?" bila ada tiket yang masih dalam jendela susulan (Q26). Pesan yang menyebut nomor tiket langsung jadi susulan. Susulan membuat `lapor_versi` baru (versi lama tidak ditimpa), baris riwayat tiket bertanda susulan tanpa mengubah status, dan PDF versi baru. | F-12 sudah ada (`update LA-...`); ini memperluas pemicunya tanpa tebak-tebakan. |
| D37 | Susulan | Jenis dan lokasi kejadian tidak berubah lewat susulan. Bila pelapor menyebut tempat atau jenis lain, bot menawarkan laporan baru. Angka susulan boleh lebih kecil dari versi lama (koreksi) bila punya kutipan; tiap angka menyimpan asal `susulan` dan nomor versi. | Susulan bukan jalan mengubah identitas kejadian; koreksi jujur tetap boleh. |
| D38 | Suara | Pesan suara WA diunduh gateway, diubah ke wav 16 kHz dengan `ffmpeg` (sudah terpasang di Mac mini), ditranskripsi lokal di Mac mini (bawaan whisper.cpp, Q25), dan audio dihapus segera. Transkrip ditunjukkan ke pelapor untuk dikonfirmasi ("Saya dengar: ... 1 Benar, 2 Ulangi") sebelum masuk A1, dan baru sesudah dikonfirmasi diurai. Asal isian bertanda `suara` dengan kutipan dari transkrip terkonfirmasi. | Salah dengar pada angka adalah risiko terbesar; konfirmasi menutupnya. Audio tidak keluar mesin. |
| D39 | Foto saja | Foto tanpa teks dari nomor berizin memulai sesi. Foto disimpan dengan lencana apa adanya (D16), bot berkata "Foto diterima, ceritakan kejadiannya dan bagikan lokasi", dan foto menempel ke sesi yang sama. Nomor baru tetap lewat identitas (D18) dulu; foto ditahan di `kerja.media_tunda` dan ditempelkan sesudah identitas. Foto tidak dikirim ke AI (Q4). | Foto sering lebih dulu dari cerita; D18 dan Q4 tetap berlaku. |
| D40 | Semua | Tidak ada cron Worker baru dan tidak ada trigger D1. Pemicu terjadwal (peringatan BMKG, kedaluwarsa tautan verifikasi) dijalankan oleh timer di `scripts/wa/lapor_wa.mjs` yang memanggil rute `WA_MESIN`; kedaluwarsa tautan dihitung malas saat dibaca. | Batas 5 jadwal akun Free (AGENTS 2); pola kedaluwarsa malas A1. |

## Pertanyaan terbuka lanjutan untuk pemilik (Q)

Q8 (siapa di BNPB boleh minta verifikasi) tetap berlaku; bawaannya diperbarui di bawah.

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q8 (diperbarui) | Siapa di BNPB boleh mengirim "Minta verifikasi"? | **[BAWAAN SEMENTARA]** Peran yang sama dengan Q12 (admin, `pusdalops`, `koordalops`); pada F0 hanya PEMILIK. Tiap permintaan tercatat dengan pelaku dan waktu. | LA-22 |
| Q16 | Siapa penerima tautan verifikasi di BPBD, dan siapa yang mendaftarkan kontaknya? | **[BAWAAN SEMENTARA]** Satu atau beberapa nomor WA per kab/kota di tabel `lapor_kontak_bpbd`, didaftarkan admin atau PEMILIK lewat `lapor kontak <kab> <nomor>`; bukan dari pengakuan pelapor. Tanpa kontak terdaftar, Minta verifikasi nonaktif. Nomor kontak tidak ditulis di repo. | LA-22, F1 |
| Q17 | Masa berlaku tautan verifikasi dan pengingat? | **[BAWAAN SEMENTARA]** 48 jam, satu pengingat pada jam ke-24 bila belum dijawab, lalu kedaluwarsa dan staf bisa meminta ulang (token baru). | LA-23 |
| Q18 | Ambang gugus: jarak, jendela jam, jumlah pelapor minimal? | **[BAWAAN SEMENTARA]** Tabel HIPOTESIS di `ALGORITMA.md` A9 (jenis lokal radius 3 km atau 5 km dengan jendela 6 jam, jenis luas per kab dengan jendela 12 jam; minimal 2 nomor pelapor berbeda). Disetel ulang dari data F0 (pasangan laporan yang dinilai staf "satu kejadian" lawan "bukan"). | LA-24 |
| Q19 | Gugus tampil ke siapa dan kapan masuk Buku Besar? | **[BAWAAN SEMENTARA]** Hanya staf `/lapor/meja`. Masuk Buku Besar hanya pada F1 dan hanya menempel (D29). | LA-25 |
| Q20 | Izin dikabari: bentuk persetujuan, masa simpan lokasi langganan, siapa boleh dikabari? | **[BAWAAN SEMENTARA]** Opt-in, bawaan tidak, ditanya sekali sesudah laporan pertama terkirim; lokasi langganan dibulatkan 0,01 derajat dan dihapus bila 90 hari tanpa laporan atau saat `berhenti kabar` atau `hapus data`. Pelapor bertingkat `warga`, `bpbd_klaim`, dan `bpbd` sama. | LA-32 |
| Q21 | Pemicu BMKG: ambang tingkat, cara mencocokkan wilayah, batas kirim, dan boleh tidak pesan proaktif lewat Baileys? | **[BAWAAN SEMENTARA]** Peringatan `aktif`, `severity` Moderate atau lebih, `urgency` Immediate atau Expected, dari `peringatan.json`; wilayah dicocokkan titik langganan ke poligon, bila poligon kosong ke nama kecamatan di teks `wilayah`; batas D33; hanya pada F0 dan F1 di nomor bot yang ada. | LA-34 |
| Q22 | Pemicu gugus ke pelapor sekitar: otomatis atau disetujui staf, dan ambang jumlah? | **[BAWAAN SEMENTARA]** Disetujui staf satu per satu (D31), ambang tampil tombol bila gugus punya 3 nomor pelapor berbeda atau lebih di satu desa. | LA-33 |
| Q23 | Sumber jawaban Mode Tanya: cukup `edukasi.json` atau ditambah dokumen resmi lain, dan siapa yang meninjau sebelum dibuka ke publik? | **[BAWAAN SEMENTARA]** Hanya `public/lapor/edukasi.json` (disusun dari sumber resmi, tiap butir bertautan sumber). Penambahan dokumen lewat tiket sendiri. Tinjauan Direktorat Kesiapsiagaan BNPB (catatan di berkas itu sendiri) sebelum Mode Tanya dibuka di luar pengguna uji. | LA-30, F2 |
| Q24 | Pertanyaan warga di Mode Tanya disimpan atau tidak? | **[BAWAAN SEMENTARA]** Teks pertanyaan tidak disimpan. Yang disimpan hanya topik terpilih, skor, ada atau tidak ada jawaban, dan nilai 1 sampai 5 bila diberikan. Daftar "pertanyaan tanpa jawaban" untuk memperbaiki panduan memakai data itu saja. | LA-30 |
| Q25 | Layanan transkripsi suara: lokal di Mac mini atau layanan awan berbayar, dan berapa lama audio disimpan? | **[BAWAAN SEMENTARA]** Lokal (whisper.cpp, perlu dipasang pemilik di Mac mini), audio dihapus segera sesudah transkripsi, durasi paling lama 90 detik, paling banyak 3 pesan suara per laporan. Layanan awan tidak dipakai sebelum pemilik memilihnya; biayanya tidak dicari dalam paket ini dan harus dicek pemilik. Mutu bahasa Indonesia dan logat daerah diukur di LA-29 sebelum dibuka. | LA-29 |
| Q26 | Jendela laporan susulan? | **[BAWAAN SEMENTARA]** 72 jam sejak terkirim dan selama tiket belum `selesai` atau `tidak_valid`; paling banyak 10 versi per laporan. Lewat itu pelapor membuat laporan baru (atau staf membuka tiket kembali, A8). | LA-26 |

## Fase (diperbarui)

| Fase | Tambahan dari enam fitur |
| --- | --- |
| F0 | Susulan (K35), foto saja (K36 bagian foto), Mode Tanya untuk pengguna uji (K34), suara bila uji mutu LA-29 lulus (K36), gugus di meja tanpa Buku Besar (K33). Verifikasi dan kabar balik hanya ke PEMILIK sebagai uji. |
| F1 | Verifikasi ke kontak BPBD terdaftar (Q8, Q16), gugus menempel ke Buku Besar (Q19), kabar balik ke pelapor yang setuju dalam jumlah kecil (Q20, Q21, Q22). |
| F2 | Mode Tanya terbuka setelah tinjauan Q23; kabar balik massal tidak dibuka sebelum Q7. |

---

# Lanjutan 19 Nov 2026 (bagian 2): enam fitur tambahan, total dua belas

Pemilik menambah enam fitur pada hari yang sama. Dua belas fitur lanjutan sekarang: 1 verifikasi BPBD, 2 kabar balik, 3 gugus, 4 Mode Tanya, 5 susulan, 6 suara dan foto saja (K31 sampai K36), lalu 7 mode luring, 8 penilaian foto, 9 ringkasan harian, 10 penugasan tiket, 11 sinyal awal di peta utama dan `/prediksi`, 12 kebutuhan ke LogPal (K37 sampai K42). Semua mengikuti pola K/D/Q yang sama; Q baru ada di Q27 sampai Q33.

## Koreksi atas bagian pertama

- Q21 dan D31 menyebut sumber peringatan BMKG dari `public/banjir/data/peringatan.json`. Keadaan sebenarnya: berkas itu dibuat `scripts/banjir/peringatan.py` oleh workflow harian, sedangkan nowcast BMKG berubah tiap beberapa jam (paket `tangga` Q7 dan Q11 mencatat hal yang sama: salinan segar belum ditarik workflow). Untuk kabar balik, berkas itu bisa basi berjam-jam. Bawaan diperbaiki di Q27 di bawah: gateway menarik feed publik BMKG yang sama dengan parser yang sudah ada. Q21 tetap berlaku untuk ambang dan batas kirim.
- Tabel `lapor_token` di migrasi 0155 membatasi `guna` ke `kamera` dan `cetak`. Karena CHECK tidak bisa diubah idempoten (ALTER bukan jalan aman), tautan verifikasi dan tugas memakai tabelnya sendiri (DESAIN-TEKNIS bagian Lanjutan 2). Hal yang sama untuk `lapor_foto.lencana`: lencana luring dicatat di tabel samping.

## Keputusan pemilik (lanjutan, bagian 2)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K37 | 19 Nov 2026 | Mode luring di web: laporan disimpan di HP saat sinyal hilang dan terkirim otomatis saat tersambung. |
| K38 | 19 Nov 2026 | Foto dinilai otomatis: buram, foto lama, foto sama dari internet (hash perseptual atau pencarian balik), dan relevan atau tidak dengan jenis bencana yang dilaporkan. Hanya ditandai untuk staf, tidak menolak otomatis. |
| K39 | 19 Nov 2026 | Ringkasan harian otomatis: tiap pagi rangkuman laporan warga 24 jam per provinsi dan jenis, siap ditempel ke Laporan Harian BNPB, tanpa buku kejadian kedua. |
| K40 | 19 Nov 2026 | Penugasan tiket ke orang atau BPBD dengan tenggat dan pengingat; lewat tenggat tanpa tindakan ditandai merah di meja. |
| K41 | 19 Nov 2026 | Laporan warga menjadi sinyal awal di peta utama (lapisan staf) dan di `/prediksi`, dibandingkan dengan prediksi sebagai uji jujur: tanpa skor gabungan sebelum uji balik, tidak menulis "aman". |
| K42 | 19 Nov 2026 | Kebutuhan mendesak dari laporan menjadi draf permintaan logistik di `/logpal` dengan nama barang katalog LogPal. |

## Keputusan rancangan (lanjutan, bagian 2)

| No | Fitur | Keputusan | Alasan |
| --- | --- | --- | --- |
| D41 | Luring | Halaman `/lapor` memuat `public/inti/antre.js` dan membuka satu saluran `lapor` (`PbAntre.saluran`, IndexedDB `pb-antre`, tanpa basis data baru). Saat tanpa sinyal halaman beralih ke "Laporan cepat" (D42); saat tersambung antrean mengirim sendiri sesuai aturan antre.js (terlama dulu, mundur 60 detik sampai 30 menit dengan jitter, 401 berhenti dan butir tetap). Cangkang halaman dan spek disajikan luring oleh service worker `public/sw-lapor.js` bercakupan `/lapor/` (pola `public/sw-lapangan.js` dan `public/sw-instansi.js`, yang sudah ada). | Keterpaduan K3 dan D5: satu antrean bersama, bukan antrean ke-7. |
| D42 | Luring | Laporan cepat hanya memuat tiga kelompok wajib awal (jenis dan subjenis dari pilihan, waktu kejadian dari pilihan atau pemilih jam, lokasi dari GPS perangkat) ditambah kronologi singkat dan foto opsional. Tanpa AI di HP. Formulir menolak simpan bila tiga kelompok wajib belum lengkap. Sesudah tersambung, Worker mengurai kronologi dengan satu putaran uraian (D15) lalu menerbitkan laporan terkirim versi 1, tiket, dan PDF; sisa isian ditawarkan lewat susulan (D36). | D5: laporan awal boleh dikirim dengan tiga kelompok; K14 ("harus 100 persen") dipenuhi lewat susulan, bukan dengan menahan laporan yang sudah dibuat saat darurat. |
| D43 | Luring | `klien_id` dari antre.js menjadi kunci idempotensi di tabel `lapor_luring`; pengiriman ulang butir yang sama menjawab 200 dengan hasil yang sama. Waktu dilaporkan = waktu pelapor menekan simpan di HP (`waktu_klien`); waktu diterima server dicatat terpisah (K17); keduanya tampil di rincian dan PDF. | Antrean bisa mengirim ganda; waktu laporan tidak boleh ikut mundur ke saat sinyal pulih. |
| D44 | Luring | Foto luring membawa GPS dan waktu yang dibaca saat foto diambil. Karena server tidak melihat sinyal jaringan saat itu, `nilaiGps` tidak bisa menilai relay dan hosting; foto diberi lencana "GPS perangkat, luring" yang lebih lemah dari "GPS perangkat" dan dicatat di tabel samping `lapor_foto_luring`. Foto tidak ditolak karena umur GPS lebih dari 10 menit (aturan D11 tidak mungkin dipenuhi luring), tetapi aturan EXIF D11 (jarak dan umur 48 jam) tetap diperiksa. | Jujur soal kekuatan bukti; aturan D11 disesuaikan, bukan dilanggar diam-diam. |
| D45 | Luring | Butir antrean tidak memuat identitas, kode akses, atau token (aturan antre.js menolak kunci rahasia). Butir ditahan 14 hari (jawaban pemilik K13 paket keterpaduan) lalu dibuang; setelah terkirim langsung dihapus. Pita "belum terkirim" milik antre.js tampil di halaman dan pelapor bisa membuang butir. | Data lokasi dan foto di HP milik bersama bila HP dipinjam; masa simpan sependek mungkin. |
| D46 | Penilaian foto | Penilaian hanya menandai (`buram`, `lama`, `sama`, dan bila Q29 dijawab, `relevan`). Tidak ada penolakan baru; penolakan D11 yang sudah ada tidak berubah. Tanda tampil di galeri meja dan rincian laporan sebagai lencana tambahan dan tidak ikut persen lengkap. | K38: "hanya ditandai untuk staf". |
| D47 | Penilaian foto | Penilaian dihitung di Mac mini oleh `scripts/wa/lapor_foto_nilai.mjs` dari antrean D1 (pola antrean PDF), dengan `ffmpeg` yang sudah terpasang menurunkan foto menjadi piksel abu-abu kecil; skor buram = ragam Laplacian, hash perseptual = dHash 64 bit. Tanpa pustaka gambar baru dan tanpa layanan luar. Worker Free tidak mendekode gambar. | Batas CPU Worker; tidak ada kode hash gambar di repo. |
| D48 | Penilaian foto | "Foto sama dari internet" dikerjakan dalam dua tingkat. Yang dikerjakan: dibandingkan dengan foto laporan lain di sistem ini (sesi berbeda) lewat dHash. Yang tidak dikerjakan otomatis: pencarian balik ke internet, karena foto warga harus dikirim ke pihak luar (mengulang Q4, privasi). Layar menulis "Tidak ditemukan di arsip foto laporan kami", tidak pernah "asli" atau "bukan dari internet". | Klaim jangan melebihi bukti. Pencarian balik menunggu Q29. |
| D49 | Penilaian foto | Relevansi foto dengan jenis bencana butuh model penglihatan, jadi tertahan Q4 dan Q29. Bila diizinkan: satu panggilan per foto dengan keluaran `{relevan: ya|tidak|tidak_jelas, alasan}` (alasan paling banyak 120 huruf), dicocokkan ke jenis laporan, hanya ditandai. | D2 dan D3: model tidak memutuskan. |
| D50 | Ringkasan harian | Ringkasan dibuat kode dari satu kueri D1 berindeks waktu terima atas laporan terkirim 24 jam terakhir sampai batas cut off (Q30), dikelompokkan per provinsi dan jenis. Isi: jumlah laporan, jumlah nomor pelapor berbeda, jumlah gugus, jumlah dengan foto berlencana, jumlah yang sudah diverifikasi BPBD, dan angka dampak sebagai rentang per laporan (tidak dijumlah, D28). Tiap baris berlabel "laporan warga, belum terverifikasi". Disimpan append-only di `lapor_ringkasan` dan tampil di tab Ringkasan meja dengan tombol Salin teks. | K39; AGENTS 2.9. |
| D51 | Ringkasan harian | Ringkasan tidak membuat kejadian, tidak masuk Buku Besar, dan tidak otomatis masuk dokumen mana pun. Staf menempelnya ke Laporan Harian BNPB (deck atau Laporan Berkala Harian). Rute `GET /api/lapor/ringkasan/<tanggal>` hanya untuk staf supaya Laporan Berkala Harian (paket `laporan-berkala`) kelak memakainya sebagai "baris calon" yang dipilih staf (pola Q8 paket itu), tanpa menulis ke pembuat laporan sekarang. | Aturan pemilik: jangan buat buku kejadian kedua; angka dihitung mesin, kalimat dipilih staf (D2 berkala). |
| D52 | Penugasan | Tiket bisa ditugaskan ke satu penerima: staf (peran Q12 yang punya nomor WA di register `orang`) atau kontak BPBD terdaftar (Q16). Tugas punya tenggat wajib (pilihan cepat 1 jam, 3 jam, 24 jam, atau pilih waktu), catatan, dan riwayat append-only (`lapor_tugas_riwayat`). Tidak ada tenggat bawaan sistem karena tidak ada sumber aturan waktu respons di repo. | Pola log tindak lanjut (AGENTS 2.13); tenggat tanpa sumber tidak dikodekan. |
| D53 | Penugasan | "Tindakan" = salah satu dari: pindah status tiket, catatan staf, jawaban verifikasi, atau penanda Diterima, Sedang ditangani, Selesai dari penerima, sesudah waktu penugasan. Tugas terbuka dengan tenggat lewat dan tanpa tindakan ditandai merah di meja (kolom Tenggat dan filter Lewat tenggat). Merah hanya tampilan; tidak mengubah status tiket dan tidak mengeskalasi ke pihak lain. | K40; pengingat bukan hukuman. |
| D54 | Penugasan | Pengingat lewat WA dikirim timer `lapor_wa.mjs` (D40): satu pengingat 1 jam sebelum tenggat dan satu saat lewat tenggat, ke penerima dan ke pembuat tugas. BPBD penerima mendapat tautan bertoken (`guna` tugas) berisi ringkasan tanpa data pelapor dan tiga tombol. Pengiriman ke kontak BPBD adalah tindakan keluar: F0 hanya ke PEMILIK, F1 sesudah Q16 dan Q31. | D25. |
| D55 | Sinyal awal | Peta utama mendapat satu lapisan "Laporan warga (sinyal awal)" hanya bagi sesi staf: lapisan ditawarkan bila rute `GET /api/lapor/meja/sinyal` menjawab 200, dan tidak muncul sama sekali bagi publik. Isi: gugus dan laporan terkirim 48 jam terakhir tanpa identitas pelapor, berlabel "belum terverifikasi". Render lapisan ditunda dari klik kontrol (aturan INP pemilik nomor 2). | K41; Q11 tetap: tidak ada tampilan publik. |
| D56 | Sinyal awal | Pembanding laporan warga lawan prediksi di `/prediksi` (tab Rapor) hanya tampil bagi sesi staf dan dihitung di klien dari rute staf, bukan dari berkas di `public/prediksi/data`. Isinya tabel hitung per jenis: dilaporkan dan diprediksi, dilaporkan tidak diprediksi, diprediksi tidak dilaporkan, dengan n; tanpa persentase dan tanpa skor gabungan sebelum jumlah pasangan melewati ambang (Q32). Tidak ada kalimat "aman"; "tidak ada laporan" tidak pernah ditulis sebagai "tidak ada kejadian". Pembanding tidak mengubah vonis "mengalahkan baseline" prediksi dan bukan sumber pengamatan pengganti untuk `GEL` dan `CEX`. | Paket `prediksi-besok` D8 dan paket `tangga` K6, K7; laporan warga bias ke tempat yang berpenduduk dan berpengguna. |
| D57 | LogPal | Tombol "Buat draf permintaan LogPal" di rincian laporan (staf, Q33) menyusun draf dari isian kebutuhan laporan: nama barang dipetakan ke `item_standar` LogPal (ALGORITMA A20) dan `jiwa` usulan dari isian mengungsi laporan itu. Jumlah barang dibiarkan kosong; tidak ada rumus jumlah (rumus standar LogPal masih terbuka di KEPUTUSAN-LOGPAL Q4 dan Q13). Draf disimpan di tabel `lapor_logpal_draf`, bukan di tabel LogPal, dan tampil di `/instansi/logpal` hanya bagi akun BPBD kab itu dan staf sebagai "Draf dari Lapor Bencana", yang memeriksa, mengisi jumlah, dan mengajukannya lewat alur permintaan LogPal yang sudah ada. | Skema LogPal tidak berubah; D2 LogPal: BPBD yang mengajukan; D7 LogPal: wajib login. |
| D58 | LogPal | Sumber draf: laporan tingkat `bpbd`, atau laporan `warga` dan `bpbd_klaim` yang sudah dijawab Benar atau Sebagian benar lewat verifikasi (D23). Laporan warga yang belum terverifikasi tidak bisa dibuat drafnya. Rute baru ada di berkas baru `src/logpal_lapor.js` dan memakai hak dari `src/hak.js` (T12 LogPal); `src/logpal.js` tidak bertambah. Nomor WA pelapor tidak pernah ikut ke draf. | Mengajukan logistik dari kabar belum diperiksa memboroskan stok. |

## Pertanyaan terbuka lanjutan (bagian 2)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q27 | Sumber peringatan BMKG untuk kabar balik: berkas workflow harian (bisa basi berjam-jam) atau tarik feed publik BMKG tiap beberapa menit? | **[BAWAAN SEMENTARA]** Gateway menarik feed `https://www.bmkg.go.id/alerts/nowcast/id` tiap 10 menit memakai parser `scripts/banjir/peringatan.py` (dipanggil lewat skrip kecil), mencantumkan "Sumber: BMKG" sesuai lisensi berkas itu. Peringatan lebih dari 3 jam lewat `selesai` tidak dikirim. | LA-34 |
| Q28 | Mode luring: laporan cepat langsung terkirim sebagai laporan awal sesudah tersambung, umur butir, dan foto luring berlencana lebih lemah? | **[BAWAAN SEMENTARA]** Ya terkirim otomatis sebagai versi 1 (D42), butir ditahan 14 hari (D45), lencana "GPS perangkat, luring" (D44). Laporan yang tiga kelompok wajibnya belum lengkap tidak bisa disimpan. | LA-35 |
| Q29 | Penilaian foto: ambang dan izin lanjutan. Ambang buram, umur "lama", jarak dHash; pencarian balik ke internet; relevansi memakai model penglihatan (mengulang Q4). | **[BAWAAN SEMENTARA]** Lokal saja. Ambang awal HIPOTESIS: foto lama bila waktu ambil EXIF lebih dari 6 jam sebelum unggah (batas tolak 48 jam D11 tidak berubah); duplikat bila jarak Hamming dHash 10 dari 64 bit atau kurang terhadap foto sesi lain; buram bila ragam Laplacian di bawah ambang yang disetel dari foto F0. Pencarian balik internet dan relevansi AI tidak dikerjakan sampai pemilik menjawab ya (LA-38 tertahan). | LA-37, LA-38 |
| Q30 | Ringkasan harian: batas cut off, penerima, dan bentuk. | **[BAWAAN SEMENTARA]** 24 jam berakhir pukul 06.00 WIB (disesuaikan dengan cut off Laporan Harian BNPB yang pemilik tetapkan); dibuat 06.05 WIB; penerima PEMILIK lewat WA dan staf lewat tab Ringkasan; bentuk teks salin ditambah tabel. Jenis tanpa laporan tidak ditulis "nol" tetapi tidak muncul. | LA-39 |
| Q31 | Penugasan: siapa bisa ditugaskan, tenggat, pengingat, eskalasi. | **[BAWAAN SEMENTARA]** Staf ber-WA di register `orang` dan kontak BPBD terdaftar (Q16); tenggat wajib diisi pembuat tugas; pengingat 1 jam sebelum dan saat lewat tenggat; lewat tenggat hanya merah di meja dan pengingat ke pembuat, tanpa eskalasi otomatis ke atasan. | LA-40 |
| Q32 | Pembanding laporan warga lawan prediksi: ambang jumlah pasangan dan perlakuan atas uji prediksi. | **[BAWAAN SEMENTARA]** Tabel hitung saja sampai ada paling sedikit 30 pasangan hari-kab per jenis (HIPOTESIS, sebelum itu label "terlalu sedikit untuk dinilai"); hanya sesi staf; tidak memengaruhi vonis uji prediksi; laporan warga bukan sumber pengamatan resmi. | LA-43 |
| Q33 | Draf permintaan LogPal: siapa boleh membuat draf, pemetaan nama barang, dan peran LogPal. | **[BAWAAN SEMENTARA]** Staf peran Q12; pemetaan A20 (HIPOTESIS, ditinjau staf LogPal); peran penyetuju LogPal tetap menunggu KEPUTUSAN-LOGPAL Q2 dan tidak dijawab di sini; jumlah barang selalu diisi manusia karena rumus standar (LogPal Q4, Q13) belum diputuskan. | LA-44 |

## Fase (bagian 2)

| Fase | Tambahan |
| --- | --- |
| F0 | Luring (K37) untuk pengguna uji, penilaian foto lokal (tanpa pencarian balik dan relevansi), ringkasan harian ke PEMILIK, penugasan ke staf (bukan BPBD), lapisan peta staf, pembanding prediksi bertanda terlalu sedikit data. |
| F1 | Penugasan dan pengingat ke kontak BPBD terdaftar, draf LogPal dari laporan BPBD atau yang diverifikasi. |
| F2 | Relevansi AI dan pencarian balik hanya bila Q29 dijawab ya. |

---

# Lanjutan 19 Nov 2026 (bagian 3): Meja lanjutan

Sembilan tambahan pemilik untuk layar staf `/lapor/meja` (diberi kode M1 sampai M10 oleh pemilik; M8 tidak ada). Layar meja sedang disunting sesi lain (dasbor dan arsitektur) dengan gaya `/bnpb/dalops`; rancangan di sini menempel pada pola itu dan tidak mengubah tata letaknya: peta berkartu dengan saringan jenis berikon dan angka, legenda dan bilah ringkasan di dasar peta (`.dl-legenda-peta`, `.dl-peta-dasar` di `public/bnpb/dalops.js` baris 38 sampai 40 dan 283 sampai 316), tabel di bawah, rincian di `<dialog>`, ekspor lewat bilah `data-ekspor` (`public/bnpb/dalops_ekspor.js`), dan aturan INP `nanti()` yang sudah tertulis di kepala `public/lapor/meja.js`. Penamaan: "gugus" tetap berarti gugus laporan kejadian (fitur 3, A9); pengelompokan titik di peta (M1) disebut "kelompok titik".

## Keputusan pemilik (Meja lanjutan)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K43 | 19 Nov 2026 | M1: kelompok titik di peta (lingkaran berangka, memecah saat zoom); hanya tampilan, bukan gugus kejadian. |
| K44 | 19 Nov 2026 | M2: lapisan konteks bisa dinyalakan (peringatan BMKG, titik panas, prediksi banjir dan longsor besok dari `/prediksi`, batas kab/kota); laporan yang cocok atau berlawanan dengan prediksi ditandai, tanpa skor gabungan dan tanpa kata "aman". |
| K45 | 19 Nov 2026 | M3: linimasa dengan penggeser waktu yang memutar ulang laporan masuk per jam. |
| K46 | 19 Nov 2026 | M4: kab/kota terbanyak bisa diklik: peta terbang ke kab dan tabel tersaring. |
| K47 | 19 Nov 2026 | M5: kotak masuk prioritas dengan skor perhatian (ada korban, foto sah, lama belum dibuka, lokasi GPS); rumus di ALGORITMA, bobot sebagai Q bila belum ada dasar. |
| K48 | 19 Nov 2026 | M6: tindakan massal: centang beberapa laporan untuk pindah status, teruskan ke BPBD yang sama, tandai ganda. |
| K49 | 19 Nov 2026 | M7: penanda waktu tanggap: lama sampai dibuka dan sampai ditindaklanjuti; lewat tenggat merah (terkait fitur 10). |
| K50 | 19 Nov 2026 | M9: mode layar besar untuk ruang Pusdalops: penuh layar, angka besar, segar sendiri. |
| K51 | 19 Nov 2026 | M10: ekspor daftar tersaring ke Excel dan PDF ringkas untuk rapat. |
| K52 | 19 Nov 2026 | Pemilik: "setuju semua bawaan". Semua bawaan sementara Q8 dan Q16 sampai Q38 menjadi keputusan. Q39 dibalik atas saran sesi induk yang disetujui pemilik: `dilihat` tetap STATUS tiket (tampilan lima tahap Diterima, Dilihat, Ditelaah, Ditindaklanjuti, Selesai di tiket, lacak, dan meja sudah disetujui pemilik), CHECK `lapor_tiket.status` memuat `dilihat`. |

## Keputusan rancangan (Meja lanjutan)

| No | Fitur | Keputusan | Alasan |
| --- | --- | --- | --- |
| D59 | M1 | Kelompok titik memakai pengelompokan bawaan sumber GeoJSON MapLibre (`cluster: true`, `clusterRadius`, `clusterMaxZoom`, `clusterProperties`), pustaka peta yang sama dengan `public/index.html` dan dalops (`public/vendor/maplibre`). Lingkaran berangka jumlah laporan; warna = status tiket paling mendesak di kelompok (urutan `baru`, `dilihat`, `ditelaah`, `diteruskan`, `ditindaklanjuti`, `selesai`); ketuk memperbesar ke kelompok itu; di zoom kelompok pecah menjadi titik. Tidak ada pustaka baru. | Pola sudah ada di peta utama; tanpa dependensi. |
| D60 | M2 | Empat lapisan konteks, semuanya mati bawaannya dan dinyalakan lewat pil: peringatan BMKG (poligon `nowcast[]` dari `public/banjir/data/peringatan.json`, berlabel waktu pembuatan berkas dan "tingkat kab/kec menurut BMKG"), titik panas 24 jam (`public/data/titik24.json`), prediksi banjir dan longsor besok (`public/prediksi/data/prediksi.json` dengan `Besok.levelKode`, level 0 sampai 3 per kab, batas dari `public/geo/kabupaten/<prov>.json` lewat kunci `geo`, dimuat hanya saat dinyalakan seperti D12 paket `prediksi-besok`), dan batas kab/kota. Tidak ada rute data baru dan tidak ada salinan data. | Memakai data statis yang sudah terbit; tidak menambah beban D1. |
| D61 | M2 | Tanda laporan lawan prediksi: cincin kecil di titik laporan bertanda "Sejalan dengan prediksi" bila kab laporan punya level paling sedikit 1 untuk kolom padanan jenisnya pada tanggal kejadian, atau "Di luar prediksi" bila level 0. Tanda hanya untuk jenis dengan padanan (A19) dan hanya bila tanggal kejadian termasuk tanggal yang dicakup `prediksi.json`. Tanpa angka, tanpa skor, tanpa warna baik atau buruk (dua tanda memakai satu bentuk, beda isian); teks pop-up: "Ini bukan penilaian prediksi dan bukan penilaian laporan. Tidak ada laporan di suatu kab tidak berarti tidak ada kejadian." Penilaian hitung ada di A19, bukan di sini. | Paket `tangga` K6 dan `prediksi-besok` D8. |
| D62 | M3 | Linimasa murni sisi klien atas daftar laporan yang sudah dimuat (paling banyak 1.000 baris, rentang paling lama 14 hari): penggeser langkah 1 jam, tombol Putar dan Jeda, kecepatan 1, 4, 16 jam per detik; titik laporan tampil kumulatif sampai jam terpilih berdasarkan `waktu_terima`, titik yang masuk di jam terpilih bergetar sekali (animasi mati bila `prefers-reduced-motion`; penggeser tetap bekerja manual). Tidak ada permintaan jaringan saat memutar. | Tanpa beban D1; memakai data tampilan. |
| D63 | M4 | Panel "Kab/kota terbanyak" (10 teratas menurut saringan aktif, dihitung di klien) berisi baris yang bisa diketuk: peta terbang ke batas kab (poligon `public/geo/kabupaten`, atau kotak titik laporan bila batas belum dimuat), tabel dan angka tersaring ke kab itu, dan chip "Kab: X" dengan tanda hapus muncul di bilah saringan. Ketuk lagi atau hapus chip melepas saringan. | K46; chrome kontrol urgent, peta dan tabel ditunda (INP). |
| D64 | M5 | Kotak masuk prioritas adalah urutan, bukan penyaring: tab Daftar mendapat urutan "Perhatian" (bawaan baru) yang menyusun laporan menurut jumlah penanda yang menyala (A21), lalu laporan tertua dulu. Tiap baris menampilkan penanda yang menyala sebagai chip (Korban, Foto sah, GPS, Lama belum dibuka, Gugus kuat, Dari BPBD atau terverifikasi, Ada susulan), bukan satu angka tertutup. Bobot bawaan sama untuk semua penanda dan berstatus tanpa dasar (Q34). Laporan tanpa penanda tidak disembunyikan dan tidak diberi label "tidak penting". | Aturan "angka tanpa sumber tidak dikodekan sebagai fakta": jumlah penanda bisa diperiksa; skor berbobot yang tidak bisa dipertanggungjawabkan tidak dibuat. |
| D65 | M6 | Kolom centang di Daftar; bilah aksi muncul bila ada yang dicentang: Pindah status (dengan catatan, aturan A8 per laporan), Teruskan ke BPBD (paling banyak 50 laporan, semuanya satu kab; F1 sesudah Q16 dan Q5), Tandai ganda. Rute `POST /api/lapor/meja/massal` memproses per laporan dan menjawab daftar hasil `{nomor, ok, galat}`; satu gagal tidak membatalkan yang lain. Pemeriksaan hak dan batas laju per laporan seperti rute tunggal (120 perubahan per jam per staf dihitung per laporan). | Efisiensi tanpa mengubah aturan transisi; kegagalan sebagian terlihat jujur. |
| D66 | M6 | Teruskan ke BPBD massal membuat satu tugas (fitur 10) per laporan ke kontak BPBD yang sama dengan satu `paket` dan satu pesan WA berisi daftar nomor tiket dan satu tautan bertoken untuk seluruh paket (tampil sebagai daftar di `/lapor/v/<token>`). Status tiket tidak berubah sendiri; staf memindahkannya ke `diteruskan` lewat aksi yang sama bila diinginkan. | Satu pesan, bukan banyak; tindakan keluar terjaga (D25). |
| D67 | M6 | Tandai ganda berarti laporan itu salinan laporan lain (dikirim dua kali oleh pelapor yang sama atau jelas satu laporan yang tercatat dua kali), bukan laporan pelapor lain tentang kejadian yang sama (itu urusan gugus, A9). Yang ditandai ganda menyimpan `ganda_dari` (laporan induk, wajib), dikeluarkan dari hitungan laporan di gugus, ringkasan harian, dan panel, tetap bisa dibuka, dan tanda bisa dibatalkan. Riwayat append-only. Tidak mengubah status tiket. | Menghindari hitungan ganda tanpa menghapus bukti. |
| D68 | M7 | Penanda waktu tanggap per laporan: `lama_dibuka` = dari waktu terima sampai penanda "dilihat" pertama oleh staf, `lama_tindak` = sampai status `ditindaklanjuti` pertama. Tampil sebagai chip dan kolom di Daftar dan rincian. Panel menampilkan median dan jumlah yang belum untuk saringan aktif, hanya sebagai informasi. Tidak ada target waktu bawaan karena tidak ada sumber aturan waktu tanggap di repo (Q37); merah hanya untuk tugas yang lewat tenggat (A16), bukan untuk laporan tanpa tugas. Tidak ada peringkat orang atau BPBD. | PRD Larangan: bukan penilaian kinerja; target tanpa sumber tidak dikodekan. |
| D69 | M9 | Mode layar besar: tombol di meja dan tautan `/lapor/meja?layar=besar`. Meminta layar penuh lewat Fullscreen API dengan deteksi fitur; bila ditolak, tata letak yang sama tampil di jendela. Isi: empat angka besar (laporan 24 jam, baru belum dibuka, lewat tenggat, gugus kuat), peta, dan sepuluh laporan teratas menurut urutan Perhatian, tanpa nama dan nomor pelapor (ruang terbuka). Segar sendiri tiap 30 detik hanya saat tab terlihat; penanda "diperbarui pukul ..." berubah merah bila lebih dari 5 menit tanpa pembaruan; bila sesi berakhir tampil pita "Sesi berakhir, masuk lagi" dan layar berhenti memperbarui (tidak masuk otomatis, tidak menampilkan data basi tanpa tanda). Screen Wake Lock dipakai bila tersedia; bila tidak, pengguna mengatur layar tidak mati. | Ruang Pusdalops; K22 sesi hanya diketik pemilik sendiri. |
| D70 | M10 | Ekspor daftar tersaring: Excel lewat penulis `.xlsx` tanpa pustaka `DalopsHitung.xlsx` (`public/bnpb/dalops_hitung.js`, dipakai ulang tanpa salinan), PDF ringkas lewat `/vendor/jspdf` dimuat saat pertama diklik (pola `public/bnpb/dalops_ekspor.js`), dan CSV. Kolom: nomor tiket, waktu terima, waktu kejadian, jenis, subjenis, kab, provinsi, tingkat sumber, persen lengkap, status, lama dibuka, lama tindak, penanda perhatian, verifikasi, tugas dan tenggat. Tanpa nama dan nomor WA pelapor (Q36). Sel yang diawali `=`, `+`, `-`, `@`, tab, atau CR dinetralkan (aturan T4 LogPal). PDF: A4 mendatar, paling banyak 200 baris (sisanya disebut jumlahnya), kepala berisi saringan aktif dan waktu cetak, label "laporan warga, belum terverifikasi", angka ringkasan di atas tabel. | Ekspor untuk rapat tanpa membocorkan identitas pelapor. |

## Pertanyaan terbuka lanjutan (Meja)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q34 | Bobot skor perhatian: seberapa berat korban, foto sah, lama belum dibuka, lokasi GPS dibanding yang lain, dan apakah ada penanda lain? | **[BAWAAN SEMENTARA]** Bobot sama (satu poin per penanda) dan urutan = jumlah penanda lalu laporan tertua dulu; pemilik atau staf Pusdalops menetapkan bobot sesudah melihat data F0. Ambang "lama belum dibuka" 6 jam (HIPOTESIS). | LA-48 |
| Q35 | Lapisan konteks M2: sumber dan batas yang boleh. Tanda "Sejalan dengan prediksi" dan "Di luar prediksi": setuju bunyinya? | **[BAWAAN SEMENTARA]** Empat lapisan D60; bunyi tanda D61; titik panas memakai `titik24.json` apa adanya (termasuk keyakinan rendah sesuai aturan sistem). | LA-47 |
| Q36 | Ekspor: boleh memuat nama dan nomor WA pelapor? | **[BAWAAN SEMENTARA]** Tidak. Hanya admin yang boleh menambah kolom itu lewat tombol terpisah, tercatat siapa dan kapan; tidak pada mode layar besar. | LA-52 |
| Q37 | Target waktu tanggap: berapa lama sampai dibuka dan sampai ditindaklanjuti dianggap terlambat, dan menurut aturan mana? | **[BAWAAN SEMENTARA]** Tidak ada target; angka hanya ditampilkan (D68). Merah hanya dari tenggat tugas. | LA-50 |
| Q38 | Teruskan massal ke BPBD: kontak mana dan kapan boleh dikirim (mengulang Q5 dan Q16)? | **[BAWAAN SEMENTARA]** Sama dengan penugasan ke BPBD: hanya kontak terdaftar (Q16), F0 hanya ke PEMILIK. | LA-49 |
| Q39 | Status tiket "dilihat": `meja.js` lokal memakai status `dilihat` (K19: "sudah dilihat petugas"), tetapi D20 dan A8 tidak memuatnya dan CHECK migrasi 0155 hanya enam status lain. Dijadikan status atau penanda terpisah? | **[BAWAAN SEMENTARA]** Penanda, bukan status: baris riwayat tiket dengan `dari` dan `ke` sama (`baru`) dan catatan khusus "dilihat" oleh staf; layar tetap menampilkannya sebagai tahap "Dilihat". Bila pemilik ingin status sungguhan, migrasi 0155 diubah sebelum diterapkan ke produksi (tabel CHECK tidak bisa diubah idempoten sesudahnya). | LA-45 **Dijawab K52: `dilihat` tetap status tiket.** |

## Keputusan pemilik (Meja tampilan dasbor, 19 Nov 2026 sore)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K53 | 19 Nov 2026 | Meja meniru dasbor `/bnpb/dalops`: menu samping (Peta laporan, Daftar laporan, antrean per status, pintu lain), tanpa kepala navy; baris saring bersama (cari, jenis, status, kab/kota, periode, ada korban, ada foto, bergugus) dengan label "Data diperbarui"; Peta dan Daftar di tampilan terpisah (`#peta`, `#daftar`); Ringkasan lalu Status tiket di kolom kiri peta; legenda sebaris. |
| K54 | 19 Nov 2026 | Pop-up titik peta punya tombol Buka rincian, Arah (Google Maps), dan Bagikan (ringkasan tanpa nomor WA pelapor, D12). |
| K55 | 19 Nov 2026 | Pemilik "gas" untuk tiga arah: (1) laporan mirip digabung jadi gugus lalu ditautkan ke Buku Besar, (2) diteruskan ke BPBD setempat langsung dari tiket, (3) batas waktu respons per status. Ringkasan tetap menghitung jumlah laporan, bukan menjumlah korban. |

## Keputusan rancangan (pelaksanaan K55)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D71 | Gugus dihitung oleh `src/lapor_gugus.js` (fungsi murni A9, uji `tests/warga/lapor_gugus.test.mjs`) dan dikirim sebagai `gugus` per baris `/api/lapor/meja` dan anggota beserta dampak per laporan di rincian. Meja: chip "Gugus" atau "Gugus kuat" di kolom Jenis, saring cepat Bergugus, kartu gugus di rincian. Penempelan ke Buku Besar tetap F1 lewat `pasang.py` sumber `lapor_ai` (D29, Q19, LA-25), tidak dibuat sendiri. | Pencocok kejadian tetap satu; gugus bukan kejadian resmi. |
| D72 | Teruskan ke BPBD pada F0: kartu di rincian menampilkan BPBD kab/kota dan provinsi dari `public/data/bpbd.json` (rute `/api/lapor/penting`), tombol Kirim WA membuka WhatsApp staf dengan pesan terisi (staf yang menekan kirim), dan Tandai diteruskan memindahkan tiket ke Diteruskan berbatas aturan A8 (dari Baru atau Dilihat lewat Ditelaah dulu, dua baris riwayat). Pengiriman otomatis oleh sistem ke kontak terdaftar tetap F1 (Q16, Q38, LA-49). | Tindakan keluar tetap oleh manusia (D25); tidak melanggar "F0 hanya ke PEMILIK" karena sistem tidak mengirim. |
| D73 | Waktu tanggap (D68) tampil: "dibuka N menit" atau "belum dibuka, N" di kolom Status, median sampai dibuka di Ringkasan. Belum ada warna terlambat karena target belum punya sumber (Q37, Q40). | Angka tanpa sumber tidak dikodekan. |

## Pertanyaan terbuka (pelaksanaan K55)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q40 | "Batas waktu respons per status" (K55 butir 3): berapa menit atau jam untuk Baru sampai dibuka, Ditelaah sampai diteruskan, Diteruskan sampai ditindaklanjuti, dan aturan mana yang jadi sumbernya (SOP Pusdalops, Perka, atau keputusan pemilik)? | **[BAWAAN SEMENTARA]** Tidak ada warna terlambat; waktu hanya ditampilkan (D73). Begitu pemilik memberi angka, kolom Status memerah saat lewat dan Antrean kerja menghitung yang lewat. | LA-56 |

## Keputusan pemilik (isian warga tambahan dan draf logbook, 19 Nov 2026 malam)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K56 | 19 Nov 2026 | Isian warga ditambah: kelompok rentan (pilihan, tanpa jumlah), layanan dasar terganggu (jalan, listrik, sinyal, air bersih), jenis Lainnya, dan lahan pertanian rusak untuk banjir, longsor, kekeringan, erupsi, cuaca ekstrem, tsunami, dan abrasi dengan kalimat per jenis (karhutla memakai Luas terbakar). Isian khusus BPBD (upaya penanganan, kendala lengkap, kebutuhan berjumlah, korban terpilah, prasarana dan kerugian, keposkoan, SK, KIB, sumber, tautan) TIDAK ditanyakan di Lapor: laporan yang diterima menjadi draf Logbook Pusdalops dan petugas melengkapinya di sana. |

## Keputusan rancangan (pelaksanaan K56)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D74 | `lahan_terendam` tetap satu isian (nama lama supaya data lama terbaca) berlabel "Lahan pertanian rusak", dengan `tanyaJenis` dan `labelJenis` per jenis yang dibaca `teksTanyaDasar` di `src/lapor_mesin.js`. | Satu kolom angka lintas jenis. |
| D75 | Kelompok baru `rentan` dan `layanan` di `KELOMPOK`, masing-masing satu isian `opsi_banyak` (`rentan`, `layanan_terganggu`). Layanan terganggu adalah bukti untuk Lifeline, bukan status resmi (KEPUTUSAN-LIFELINE). | Pilihan, bukan ketik; mesin tidak menetapkan status. |
| D76 | Draf logbook: tombol "Draf logbook" di rincian meja menulis draf perangkat `logbook_draf_v1` (bentuk `kumpul()` `public/bnpb/logbook.js`) dari nilai mentah rincian (`nilai`, `waktuKejadianMs`, tambahan aditif di `/api/lapor/meja/<nomor>`) lalu membuka `/bnpb/logbook`. Draf lama petugas tidak ditimpa tanpa ketukan kedua. Tanpa rute dan tabel baru; penyimpanan tetap oleh petugas lewat rute logbook yang ada. | Satu sumber angka, tanpa ketik ulang, tanpa buku kejadian kedua. |

## Pertanyaan terbuka (pelaksanaan K56)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q41 | Layanan terganggu dari laporan warga: dipakai sebagai bukti pada layar Lifeline per kab/kota sekarang, atau menunggu verifikasi BPBD? | **[BAWAAN SEMENTARA]** Belum mengalir ke Lifeline; tampil di rincian dan ikut draf logbook (kendala). | LA-57 |
| Q42 | Jenis Epidemi, Kecelakaan, dan Konflik sosial (ada di logbook) perlu masuk Lapor untuk warga? | **[BAWAAN SEMENTARA]** Tidak; warga memakai Lainnya. | — |

## Keputusan pemilik (video dan bahasa, 19 Nov 2026 malam)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K57 | 19 Nov 2026 | Selain foto, pelapor bisa mengirim video. |
| K58 | 19 Nov 2026 | Pelapor memilih bahasa: Indonesia, Inggris, dan bahasa daerah (Jawa, Sunda, Minang, Bugis, dan bahasa daerah lainnya). |

## Keputusan rancangan (pelaksanaan K57 dan K58)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D77 | Video memakai aturan media yang sudah ada di `src/foto.js` (`ATURAN_MEDIA`: paling besar 30 MB, paling lama 60 detik, MP4/MOV/WebM dikenali dari byte awal, durasi dari kotak `mvhd`, thumbnail dari peramban, R2 dengan Range). Aturan lokasi D11 berlaku sama: GPS perangkat saat unggah; EXIF tidak ada di video, jadi lokasi dan waktu ambil dari metadata video (`©xyz` dan `creation_time` di MP4/MOV) bila ada, diperiksa dengan batas jarak dan umur yang sama. Tanpa aturan kedua. | Satu sumber aturan media (pola `src/instansi.js`). |
| D78 | Video lewat WA ditandai seperti foto chat WA (D16): waktu pesan dan lokasi "Bagikan lokasi" terdekat, lencana "lokasi WA". Gateway menolak video di atas 30 MB atau 60 detik dengan pesan L-VIDEO-BESAR, bukan memotongnya. | WA membuang metadata; aturan sama dengan foto. |
| D79 | Batas per laporan: foto dan video dihitung bersama, paling banyak 20 berkas (batas foto yang ada), dengan video paling banyak 3. Penilaian foto (D46, D47) untuk video hanya pada bingkai thumbnail; tanpa penilaian bingkai lain. Video tidak pernah dikirim ke AI. | Biaya R2 dan CPU Mac mini; privasi (Q4 tetap tidak). |
| D80 | Bahasa dipilih sekali di awal (web: pemilih di beranda dan di menu; WA: pesan pertama menawarkan daftar bernomor, perintah `bahasa` mengganti). Pilihan disimpan di sesi, bukan di profil, dan tidak menebak dari nomor atau lokasi. | Pelapor yang menentukan; tebakan dari nomor salah untuk perantau dan turis. |
| D81 | Mesin dan data tetap berbahasa Indonesia. Pertanyaan berikutnya disusun mesin dalam bahasa Indonesia lalu diterjemahkan model; jawaban pelapor diurai model ke nilai isian dengan kutipan dari teks asli (aturan kutipan angka tetap: angka tanpa kutipan dari teks asli dibuang). Teks asli dan terjemahannya disimpan berdampingan; meja menampilkan terjemahan dengan pil "diterjemahkan AI" dan tombol Lihat teks asli. PDF memuat terjemahan dan lampiran teks asli. | Petugas membaca satu bahasa; bukti asli tidak hilang. |
| D82 | Pesan tetap (identitas, darurat 112, privasi, batas pemakaian, tiket) untuk Indonesia dan Inggris ditulis tangan dan disimpan di berkas; untuk bahasa daerah diterjemahkan model sekali, disimpan di berkas yang sama berstatus "belum ditinjau penutur", dan baru dipakai tanpa AI sesudah ditinjau (Q44). Nomor darurat, nomor tiket, dan angka selalu ditulis apa adanya. Tanpa secret AI, pilihan bahasa daerah tidak tampil (hanya Indonesia dan Inggris). | Pesan darurat tidak boleh salah terjemah; mesin tetap jalan tanpa AI (D2). |
| D83 | Kepala halaman, menu, dan tombol `/lapor` memakai Indonesia dan Inggris lewat `public/i18n.js` yang sudah ada; bahasa daerah hanya untuk percakapan dan pesan, bukan seluruh antarmuka (Q45). | Tanpa sistem terjemahan kedua. |

## Pertanyaan terbuka (K57 dan K58)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q43 | Daftar bahasa daerah yang ditawarkan? | **[BAWAAN SEMENTARA]** Tahap awal: Jawa, Sunda, Minang, Bugis, Madura, Bali, Banjar, Batak Toba, Aceh, Makassar. Bahasa lain (mis. bahasa Papua dan Dayak) ditambah sesudah uji mutu, karena mutu model untuk bahasa berpenutur sedikit belum diukur. Pilihan "Bahasa lain, ketik saja" tersedia: model menjawab dalam bahasa Indonesia sederhana. | LA-59 |
| Q44 | Siapa yang meninjau terjemahan pesan tetap per bahasa daerah? | **[BAWAAN SEMENTARA]** Penutur asli dari BPBD atau kampus mitra (`/kemitraan`), satu orang per bahasa; sebelum ditinjau, pesan diterjemahkan model saat dipakai dan pesan darurat dikirim dua bahasa (bahasa daerah dan Indonesia). | LA-60 |
| Q45 | Antarmuka web (menu, tombol) juga dalam bahasa daerah? | **[BAWAAN SEMENTARA]** Tidak; hanya Indonesia dan Inggris (D83). | LA-60 |
| Q46 | Video: batas 30 MB dan 60 detik cukup, dan berapa lama video disimpan di R2? | **[BAWAAN SEMENTARA]** Batas yang ada; masa simpan sama dengan foto laporan. Biaya R2 dipantau dari ringkasan harian (LA-39). | LA-58 |

## Keputusan pemilik (Alun-alun hidup, bukti tindak lanjut, unggah bersambung, 19 Nov 2026 malam)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K59 | 19 Nov 2026 | Alun-alun lebih hidup: ada peta, tombol "Ikuti kejadian" supaya dikabari saat statusnya berubah, dan hitungan "N warga melapor kejadian ini" dari gugus. |
| K60 | 19 Nov 2026 | Bukti tindak lanjut: saat tiket selesai, petugas melampirkan foto penanganan, dan pelapor melihatnya. |
| K61 | 19 Nov 2026 | Unggah video besar bersambung: bila sinyal putus di tengah unggah, kiriman melanjutkan dari bagian terakhir, tidak mulai dari nol. |

## Keputusan rancangan (pelaksanaan K59 sampai K61)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D84 | Peta Alun-alun memakai MapLibre yang sudah dipakai `/lapor/meja`, titik di pusat desa (bukan koordinat pelapor) sesuai Q14, kelompok titik saat jauh, pop-up berisi isi kartu yang sama. Daftar dan peta memakai satu jawaban `/api/lapor/alun` dan saring jenis yang sama. | Q14 membatasi lokasi sampai desa; satu sumber data. |
| D85 | "N warga melapor kejadian ini" = jumlah nomor pelapor berbeda di gugus (A9, `src/lapor_gugus.js`), hanya tampil bila 2 atau lebih; laporan bergugus tampil sebagai satu kartu, bukan N kartu. Angka dihitung server; nomor tidak pernah dikirim ke peramban. | Tanpa angka 1 yang tidak berarti; privasi pelapor. |
| D86 | "Ikuti kejadian" di web disimpan di perangkat (daftar nomor laporan di `localStorage`, dibungkus try/catch), tanpa akun dan tanpa push: menu Diikuti menandai kartu yang statusnya berubah sejak terakhir dibuka. Di WA, ikuti hanya untuk nomor yang pernah lapor dan sudah setuju dikabari (LA-32, Q20), lewat perintah `ikuti <nomor laporan>`, tunduk pada batas kirim D33. Notifikasi push peramban tidak dibangun (Q48). | Tanpa data orang baru di server untuk pengguna web; kabar WA ikut aturan kabar balik yang sudah diputuskan. |
| D87 | Bukti tindak lanjut: tombol "Selesai" di rincian meja meminta minimal satu foto penanganan (bisa dilewati dengan alasan tertulis, tercatat di riwayat). Foto petugas masuk tabel samping `lapor_bukti` (bukan `lapor_foto`), ke R2 `lapor/bukti/`, memakai `ATURAN_MEDIA` dan GPS perangkat petugas; lencananya "foto petugas". | Bukti tidak bercampur dengan foto pelapor; aturan media satu sumber. |
| D88 | Foto bukti tampil di halaman lacak pelapor (`/lapor/lacak.html`) dan di pesan WA penutup tiket (satu foto, sisanya tautan). Di Alun-alun hanya tampil sesudah staf menandai "boleh publik" per foto, dengan pengingat jangan memuat wajah korban atau pelat kendaraan (Q47). | Q14 melarang foto di Alun-alun untuk foto pelapor; foto petugas butuh keputusan sendiri per foto. |
| D89 | Unggah bersambung memakai multipart R2 lewat Worker: berkas di atas 5 MB dipotong 5 MB per bagian (batas minimum bagian R2), rute `unggah/mulai`, `unggah/bagian`, `unggah/selesai`, `unggah/status`; status bagian yang sudah diterima di tabel `lapor_unggah`. Peramban menyimpan berkas di antrean bersama `public/inti/antre.js` (saluran `lapor-video`, pengunggah sendiri lewat kait `media.unggah`; nomor unggahan di localStorage, D41) dan melanjutkan dari `unggah/status` saat tersambung lagi atau halaman dibuka ulang. Pemeriksaan isi (byte awal, durasi, metadata lokasi D77) dijalankan di `selesai`, bukan per bagian. | Worker Free tidak menyimpan state antar-permintaan; multipart R2 sudah menyimpan bagian. |
| D90 | Unggah yang belum selesai dibatalkan (abort multipart) 24 jam sesudah bagian terakhir oleh cron bersih-bersih menit 17 yang sudah ada; tanpa jadwal cron baru (batas 5 jadwal akun Free). Pita antre.js menampilkan "Video 3 dari 6 bagian, melanjutkan saat ada sinyal". Di WA, unggah bersambung urusan WhatsApp sendiri, tidak dibangun. | Tidak menumpuk bagian yatim di R2. |

## Pertanyaan terbuka (K59 sampai K61)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q47 | Foto bukti petugas boleh tampil di Alun-alun publik? | **[BAWAAN SEMENTARA]** Hanya foto yang ditandai staf "boleh publik" satu per satu (D88); bawaan tidak. | LA-62 |
| Q48 | Ikuti kejadian di web perlu notifikasi push peramban (butuh kunci VAPID dan izin notifikasi)? | **[BAWAAN SEMENTARA]** Tidak; tanda berubah di menu Diikuti saat halaman dibuka (D86). | LA-61 |
| Q49 | Foto bukti wajib saat Selesai, atau boleh dilewati? | **[BAWAAN SEMENTARA]** Wajib minimal satu, boleh dilewati dengan alasan tertulis yang tercatat (D87). | LA-62 |
| Q50 | Unggah bersambung juga untuk foto? | **[BAWAAN SEMENTARA]** Tidak; foto paling besar 3 MB, satu bagian, cukup diulang utuh oleh antrean luring. | LA-63 |

## Keputusan pemilik (data terbuka dan meja BPBD, 19 Nov 2026 malam)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K62 | 19 Nov 2026 | Data terbuka agregat: jumlah laporan per kab/kota, jenis, dan minggu, tanpa identitas, bisa diunduh peneliti dan kampus mitra `/kemitraan`; termasuk bahan riset seberapa cepat warga melapor dibanding data resmi. |
| K63 | 19 Nov 2026 | Meja BPBD: BPBD kab/kota melihat laporan di wilayahnya, mengubah status, dan melampirkan foto penanganan, menggantikan "Teruskan ke BPBD" lewat WA manual. Pemilik: "agar mereka login, pakai akun mereka aja", bukan tautan bertoken. |

## Keputusan rancangan (pelaksanaan K62 dan K63)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D91 | Agregat dihitung pipeline harian dari laporan terkirim: baris = (kab/kota kode Kemendagri, jenis, minggu ISO), kolom = jumlah laporan, jumlah pelapor berbeda, laporan berfoto sah, laporan berstatus tidak valid, median menit dari waktu kejadian sampai terkirim. Tanpa nomor tiket, desa, koordinat, teks, foto, atau nama. Sel dengan kurang dari 3 pelapor berbeda ditulis "<3" (bukan angka), supaya satu pelapor di kab sepi tidak bisa ditebak. | Privasi pelapor (D12, UU PDP); pola sel kecil lazim di data terbuka statistik. |
| D92 | "Seberapa cepat warga melapor dibanding data resmi" dihitung hanya untuk laporan yang sudah ditempel ke kejadian Buku Besar (pencocok `pasang.py`, LA-25, F1): selisih menit antara laporan warga pertama dan catatan resmi pertama (DIBI atau Pantau Dalops) kejadian yang sama, per jenis dan provinsi, median dan sebaran. Sebelum LA-25 jalan kolom ini tertulis "belum tersedia", tidak pernah nol. | Satu pencocok kejadian (AGENTS 2.15); kosong tidak jadi nol. |
| D93 | Unduhan CSV dan JSON dari halaman `/kemitraan` untuk akun kampus mitra yang aktif (sesi kemitraan yang sudah ada), beserta kamus kolom dan catatan metode. Tidak di `public/data` sebelum Q51 dijawab. Tiap unduhan tercatat (akun, waktu, berkas) untuk laporan pemakaian. | Kalimat pemilik menyebut peneliti dan kampus mitra; publik terbuka keputusan terpisah. |
| D94 | Meja BPBD memakai akun lembaga yang sudah ada: akun Ruang Instansi berjenis `pemkab` atau `pemkot` (tingkat kab) dan `pemprov` (tingkat provinsi), termasuk anggota yang diundang lewat `/masuk` (undangan berantai D7 paket pintu masuk). Tanpa tautan bertoken, tanpa jenis akun baru, tanpa sandi baru. | Pemilik K63; BPBD sudah masuk lewat akun pemda di Ruang Instansi. |
| D95 | Hak wilayah: akun kab melihat laporan yang lokasinya di kab/kota itu; akun provinsi melihat semua kab/kota di provinsinya. Diperiksa di Worker per permintaan dari kode wilayah laporan, bukan dari isian pelapor. Nomor WA pelapor tampil (sama dengan meja BNPB) karena BPBD perlu menghubungi; tiap pembukaan rincian tercatat di log akses (siapa, kapan, laporan mana). | Q12: nomor terlihat hanya di layar petugas; jejak akses untuk akuntabilitas. |
| D96 | Yang bisa dilakukan BPBD: tandai dilihat, pindah status menurut aturan A8 (termasuk Selesai dengan foto penanganan atau alasan, D87), balas pelapor, lampirkan foto penanganan, tandai foto boleh publik. Yang tidak: membuka kembali tiket Selesai (tetap BNPB), menghapus, mengubah isian pelapor, mengakses laporan di luar wilayah. Riwayat mencatat pelaku "BPBD <kab>" dengan nama anggota. | Tiket tetap satu; BNPB memegang pembukaan kembali. |
| D97 | Tombol "Teruskan ke BPBD" di meja BNPB menandai laporan masuk antrean meja BPBD wilayah itu (status Diteruskan) dan, bila ada nomor WA akun lembaga, mengirim satu pemberitahuan berisi tautan ke `/lapor/meja` (tanpa isi laporan di pesan). Kab tanpa akun aktif: tombol tetap ke WA manual (D72) dengan tanda "BPBD belum punya akun". | Pemberitahuan tanpa data pribadi; jalan lama tetap ada selama akun belum lengkap. |
| D98 | Layar: `/lapor/meja` yang sama, disaring server menurut wilayah akun; kepala menampilkan nama lembaga dan wilayah; tombol yang tidak berhak tidak tampil. Tanpa salinan halaman per peran. | Satu layar (pola meja dan `/bnpb/dalops`). |

## Pertanyaan terbuka (K62 dan K63)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q51 | Data agregat juga dibuka untuk umum (tanpa masuk), misalnya di `public/data`? | **[BAWAAN SEMENTARA]** Tidak; hanya akun kampus mitra `/kemitraan` (D93). | LA-64 |
| Q52 | Ambang sel kecil: 3 pelapor berbeda cukup? | **[BAWAAN SEMENTARA]** 3 (D91). | LA-64 |
| Q53 | Akun pemkab, pemkot, dan pemprov itu dipakai BPBD, atau kantor bupati/gubernur juga? Bila keduanya, meja BPBD dibatasi ke anggota yang mencantumkan unit BPBD? | **[BAWAAN SEMENTARA]** Semua anggota aktif akun lembaga pemda tingkat kab dan provinsi boleh membuka meja wilayahnya; unit tercatat di riwayat. Bila pemilik ingin hanya BPBD, saring dengan kolom `unit` akun. | LA-66 |
| Q54 | Polres, Kodim, Damkar perlu meja yang sama untuk wilayahnya? | **[BAWAAN SEMENTARA]** Tidak pada tahap ini. | LA-66 |
| Q55 | Pemberitahuan ke BPBD saat diteruskan: lewat bot WA yang ada (Baileys) atau tidak sama sekali? | **[BAWAAN SEMENTARA]** Lewat bot WA yang ada ke nomor akun lembaga, paling banyak 20 pesan per kab per hari; tanpa isi laporan (D97). | LA-67 |

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q56 | Rincian meja untuk BPBD memuat tautan lacak bertoken (foto, PDF, Word). Tautan itu tetap terbuka walau anggota sudah dicabut dari akun lembaga. Pindahkan foto dan dokumen BPBD ke rute bersesi yang diperiksa wilayah? | **[BAWAAN SEMENTARA]** Tetap tautan bertoken (risiko diterima sementara); identitas pelapor untuk BPBD hanya lewat POST yang tercatat (D95). | LA-66 |

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K64 | 19 Nov 2026 | Jawaban Q56: "biarin dulu". Rincian meja untuk BPBD tetap memuat tautan lacak bertoken (foto, PDF, Word); risiko tautan yang masih terbuka sesudah anggota dicabut diterima sementara. Identitas pelapor untuk BPBD tetap hanya lewat POST yang tercatat (D95). |

## Keputusan pemilik (masuk tanpa kode, 20 Nov 2026)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K65 | 20 Nov 2026 | Pelapor di web tidak diminta kode WA. Cukup mengetik nomor WhatsApp-nya, seperti bot sebelumnya. Pemilik: "gausah ada minta kode WA". |

## Keputusan rancangan (pelaksanaan K65)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D99 | Pintu web menerima nomor yang diketik tanpa kode. Sesi `/masuk` yang sudah ada tetap diterima dan dianggap terverifikasi. | K65. |
| D100 | Nomor ketikan diikat ke perangkat: kunci perangkat acak di kuki HttpOnly `lapor_perangkat` (SameSite=Lax, jalur `/api/lapor`), hanya sidiknya di D1. Riwayat laporan, sesi berjalan, kotak balasan, status, foto, dan unggahan sebuah nomor hanya terbaca dari perangkat yang membuatnya. Perangkat lain yang mengetik nomor sama memulai laporan baru dan tidak melihat yang lama. | Tanpa kode, siapa pun bisa mengetik nomor orang lain; ikatan perangkat mencegah orang membaca laporan dan balasan petugas milik nomor itu. |
| D101 | Laporan dari nomor ketikan ditandai `nomor belum diverifikasi` di meja, PDF, dan pesan ke BPBD tidak memuat nomor (aturan D97 tetap). Tingkat `bpbd_klaim` dari nomor ketikan tidak naik jadi `bpbd` (D19 tetap memerlukan konfirmasi). | Petugas tahu nomornya belum dibuktikan. |
| D102 | Batas pemakaian per IP dan per perangkat berlaku di samping batas per nomor (D33 dan kuota pesan), karena nomor bisa diganti-ganti. Selama masa uji, nomor tetap harus ada di `lapor_izin`. | Nomor palsu atau berganti tidak membuka banjir laporan. |

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q57 | Masa uji: nomor ketikan tetap dibatasi daftar izin `lapor_izin`, atau web dibuka untuk semua nomor? | **Dijawab K67**: web dibuka untuk semua nomor ketikan. | — |

## Keputusan pemilik (kejadian sama, 20 Nov 2026)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K66 | 20 Nov 2026 | Saat melapor, bila sudah ada laporan berdekatan (misalnya kecamatan yang sama), pelapor ditanya apakah ia melaporkan kejadian yang sama ("Apakah Anda mau melapor bencana xxx?"). Bila ya, laporan tidak mulai dari awal; pelapor ditanya detail yang ingin ditambahkan. Di meja laporan, laporan-laporan itu dikelompokkan sebagai satu kejadian dengan satu nomor. |
| K67 | 20 Nov 2026 | Menjawab Q57 (pemilik: "di local tadi ga ada masalah"): nomor yang diketik di web tidak lagi dibatasi daftar izin `lapor_izin`, sama dengan server tinjau. Penjaganya laju IP, ikatan perangkat, dan kuota per perangkat; jalur WA mesin tetap memakai daftar izin dan nomor ketikan tidak pernah naik ke peran BPBD (D101). |
| K68 | 20 Nov 2026 | Lapor darurat (pemilik: "butuh alert yang saat itu kejadian dan langsung bisa tanggap darurat dari stakeholder"): jalur pendek untuk kejadian yang sedang berlangsung. Identitas, lokasi (tanpa RT/RW), jenis, ada korban atau orang terjebak (ya, tidak, belum tahu), foto opsional, ringkasan, kirim; dilengkapi kemudian lewat Tambah kabar. Peringatan: meja BNPB dan meja BPBD kab/kota wilayahnya (pita merah di atas meja, nada, notifikasi peramban, segar 20 detik). Tidak dikirim ke WA BPBD atau Pusdalops, dan tidak tampil di Alun-alun sebelum ditindaklanjuti (jawaban pemilik 20 Nov 2026). |

## Keputusan rancangan (pelaksanaan K66)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D103 | Kandidat dicari sesudah lokasi terbaca: laporan terkirim di kecamatan yang sama (kode kecamatan wilayah), berstatus bukan `tidak_valid` dan bukan `selesai`, dengan waktu kejadian atau waktu kirim dalam jendela jenisnya (tabel A9: 6 jam jenis lokal, 12 jam jenis luas; jenis berlangsung lama seperti kekeringan dan abrasi 72 jam). Paling banyak 3 kandidat terdekat waktu, satu per jenis. Laporan dari nomor yang sama juga ditawarkan (bisa jadi laporan lanjutan). | Pemilik menyebut "satu kecamatan"; jendela memakai ambang gugus yang sudah ada. |
| D104 | Pertanyaan: "Di Kec. X sudah ada laporan {jenis} sejak {waktu} dari {N} warga. Apakah ini kejadian yang sama?" dengan pilihan tiap kandidat dan "Bukan, kejadian lain". Tanpa nama, nomor, atau isi laporan lain (D12). | Privasi pelapor lain. |
| D105 | Bila ya: jenis, subjenis, dan waktu kejadian diambil dari kejadian itu dan dikunci; pelapor ditanya "Ada detail yang ingin Anda tambahkan?" (kronologi bebas, diurai mesin menjadi isian yang biasa), lalu foto, lalu ringkasan dan kirim. Isian lain tidak ditanya satu per satu; yang disebut di detail tetap tercatat. Laporan tetap laporan sendiri dengan nomor tiket sendiri dan pelapornya sendiri. | "Tidak mulai dari awal"; tiket per pelapor tetap supaya kabar status sampai ke masing-masing. |
| D106 | Nomor kejadian `KJ-ddmmyy-NN` diberikan saat laporan kedua dikonfirmasi sama (laporan pertama ikut masuk). Laporan yang dikonfirmasi pelapor menempel tetap; gugus otomatis A9 tetap tampil sebagai saran untuk laporan yang tidak dikonfirmasi. Staf bisa melepas laporan dari kejadian di meja (tercatat di riwayat). | Konfirmasi pelapor lebih kuat dari tebakan jarak; staf memegang koreksi. |
| D107 | Meja menampilkan satu baris per kejadian: jenis, lokasi, waktu awal, jumlah laporan dan pelapor, status terjauh, dan angka dampak tertinggi antarlaporan berlabel "tertinggi dari N laporan" (tidak dijumlah, D28). Baris bisa dibuka untuk melihat tiap laporan. Kejadian ini terpisah dari Buku Besar Kejadian; penempelan ke Buku Besar tetap lewat pencocok `pasang.py` (LA-25). | Tidak ada buku kejadian kedua (AGENTS 2.15): nomor KJ hanya pengelompokan laporan warga. |

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q58 | Jangkauan "berdekatan": kecamatan yang sama saja, atau juga radius sekian km melewati batas kecamatan? | **[BAWAAN SEMENTARA]** Kecamatan yang sama. | LA-68 |
| Q59 | Sesudah "ya", pertanyaan dampak (korban, rumah, pengungsi) tetap ditanya satu per satu atau cukup dari detail bebas? | **[BAWAAN SEMENTARA]** Cukup dari detail bebas (D105). | LA-68 |
