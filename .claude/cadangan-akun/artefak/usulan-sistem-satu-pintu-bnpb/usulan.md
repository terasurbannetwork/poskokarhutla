# Usulan Sistem Satu Pintu Data Kebencanaan BNPB dan BPBD dengan AI Internal

Oct 31, 2026, disusun oleh @TIm IT BNPB

## Ringkasan

BNPB membangun satu sistem kebencanaan yang dipakai bersama oleh BNPB, 38 BPBD provinsi, dan BPBD kabupaten/kota. Sistem ini mencakup direktori, satu data, dan asisten AI, dan seluruhnya berjalan di server internal pemerintah.

- **Satu pintu:** satu akun, satu alamat, satu basis data. Begitu pengguna login, sistem mengenali unit, jabatan, dan wilayahnya, lalu hanya menampilkan data yang menjadi haknya.
- **Satu data:** kejadian, dampak, pengungsi, logistik, posko, orang, dan lembaga memakai kode referensi yang sama. Data diisi sekali di daerah, lalu otomatis terjumlah di provinsi dan pusat.
- **AI internal:** pengguna meminta paparan atau laporan dengan bahasa biasa. AI menyusunnya dari data sistem dengan templat BNPB, tanpa mengirim data ke layanan luar negeri. AI bekerja sebagai agen seperti Claude: mencari di web, menjalankan kode, menarik data, lalu merakit berkas sendiri.
- **Biaya dan waktu:** pilot 3 bulan di 3 sampai 4 provinsi dengan 1 server GPU (perkiraan Rp0,5 sampai 1,5 miliar). Skala nasional dalam 18 bulan, dengan total pembangunan sekitar Rp15–21 miliar, operasional sekitar Rp2,7–4 miliar per tahun, dan penghematan sekitar Rp7–18 miliar per tahun.
- **Keputusan yang diminta:** persetujuan pilot, penetapan tim, lokasi server di Pusat Data Nasional, dan penyusunan peraturan BNPB tentang pelaporan satu pintu.

## Latar dan masalah

Data kebencanaan saat ini tersebar di banyak aplikasi, berkas, dan grup percakapan. Akibatnya, satu paparan untuk pimpinan bisa butuh berhari-hari hanya untuk mengumpulkan dan mencocokkan angka.

- **Data terpisah.** DIBI, InaRISK, laporan BPBD, data BMKG, data logistik, dan direktori kontak disimpan di tempat berbeda dengan kode wilayah dan format yang tidak selalu sama.
- **Rekap manual.** Laporan kejadian dari BPBD banyak masuk lewat WhatsApp atau berkas Excel, lalu direkap ulang oleh Pusdalops. Angka bisa berbeda antara pusat dan daerah.
- **Orang tidak terhubung.** Daftar pejabat, petugas, relawan, dan pakar tidak tersambung ke kejadian, wilayah, dan dokumen yang mereka tangani.
- **Paparan dan laporan disusun dari nol.** Tiap permintaan pimpinan dikerjakan ulang secara manual, walaupun bentuknya berulang.
- **Keharusan server internal.** Data kebencanaan memuat data pribadi korban dan pengungsi. Data itu tidak boleh diproses di layanan AI komersial di luar negeri, sehingga AI-nya juga harus berjalan di server pemerintah.

## Tujuan dan ruang lingkup

Tujuannya satu: setiap angka kebencanaan diisi sekali, dipakai semua pihak, dan bisa langsung diolah menjadi paparan atau laporan.

**Termasuk dalam lingkup:**

1. Login tunggal untuk BNPB, BPBD provinsi, BPBD kabupaten/kota, posko, dan mitra yang diberi akses.
2. Direktori orang dan lembaga yang terhubung ke wilayah, kejadian, dan dokumen.
3. Basis data kebencanaan terpadu: kejadian, dampak, pengungsi, kebutuhan, logistik, posko, dan personel.
4. Penarikan data otomatis dari instansi lain (BMKG, BIG, Kemendagri, InaRISK, DIBI) dan dari aplikasi BPBD.
5. Dasbor dan peta untuk tiap tingkat.
6. Asisten AI untuk tanya jawab, pencarian dokumen, serta penyusunan paparan dan laporan.

**Di luar lingkup tahap ini:** menggantikan aplikasi BPBD yang sudah berjalan (cukup disambungkan), sistem keuangan, dan sistem kepegawaian.

## Arsitektur sistem

Semua layar, AI, dan data dari luar membaca serta menulis ke satu basis data PostgreSQL. Karena itu tidak ada lagi salinan data yang terpisah.

&#91;embedded content: Arsitektur sistem, lima lapisan\]

Pengguna masuk lewat login tunggal, lalu portal meneruskan permintaannya ke basis data, mesin AI, atau penyimpanan berkas. Mesin AI tidak membaca data langsung; ia meminta lewat basis data yang sudah menyaring hak akses.

- **PostgreSQL** dipilih karena satu mesin sudah mencakup data tabel, peta (PostGIS), pencarian AI (pgvector), dan relasi antarorang. Basis data graf terpisah baru ditambahkan bila kueri relasi mulai berat.
- **Kode referensi tunggal** (kode wilayah Kemendagri, ID orang, ID lembaga, ID kejadian) membuat semua tabel otomatis tersambung.
- **Setiap baris data menyimpan sumber dan waktu tariknya**, sehingga setiap angka bisa dilacak asalnya.

## Satu pintu BNPB dan BPBD

BNPB dan semua BPBD memakai satu sistem yang sama, dengan alamat yang sama, tetapi tiap akun hanya melihat wilayahnya sendiri. Laporan provinsi dan nasional tidak lagi direkap manual karena terbentuk dari data yang diisi di bawah.

&#91;embedded content: Jenjang akun dan alur data BNPB sampai posko\]

Data mengalir ke atas, sedangkan pembuatan akun mengalir ke bawah. Pusat tidak perlu mengurus ribuan akun sendirian.

- **Hak akses mengikuti kode wilayah Kemendagri.** Akun BPBD Kabupaten Ketapang hanya melihat kode wilayah Ketapang. Akun BPBD Provinsi Kalimantan Barat melihat semua kode berawalan 61. Aturan ini dipasang di basis data, sehingga berlaku sama di layar, ekspor, dan AI.
- **Status data jelas.** Angka yang baru masuk berstatus draf, lalu berubah menjadi terverifikasi setelah dicek BPBD provinsi atau Pusdalops. Keduanya tampil dengan label berbeda. DIBI dibentuk dari data yang sudah terverifikasi.
- **Tiga jalan masuk data, satu tabel tujuan:** API dari aplikasi BPBD yang sudah ada (lewat SPLP), unggahan Excel berformat baku, dan form langsung di web atau HP. Aplikasi BPBD yang sudah berjalan tidak perlu diganti.
- **Daerah dengan sinyal lemah:** form tetap bisa diisi tanpa sinyal, tersimpan di HP, lalu terkirim otomatis begitu ada jaringan.
- **AI per wilayah:** BPBD bisa meminta laporan untuk bupati atau gubernur, dan AI hanya memakai data wilayah BPBD itu.

## AI internal

AI berjalan sepenuhnya di server pemerintah dengan model open-weight, yaitu model yang bobotnya boleh diunduh dan dijalankan sendiri. Tidak ada data yang dikirim ke layanan AI luar.

| Komponen | Pilihan | Fungsi |
| --- | --- | --- |
| Model bahasa utama | Keluarga Qwen3 (versi MoE 30B untuk pilot, 235B untuk nasional), gpt-oss-120b, atau DeepSeek V3 | Menjawab pertanyaan, menyusun narasi, memanggil alat hitung |
| Model berbahasa Indonesia | Sahabat-AI atau SEA-LION | Pembanding untuk kehalusan bahasa Indonesia |
| Penyaji model | vLLM, dengan LiteLLM sebagai gerbang | Melayani banyak pengguna sekaligus, kuota, dan log pemakaian |
| Pencarian dokumen | BGE-M3 dan bge-reranker-v2-m3 | Mencari isi perka, rencana kontinjensi, kajian, dan laporan |
| Pembaca dokumen | Docling dan PaddleOCR | Mengubah PDF dan hasil pindaian surat menjadi teks |
| Suara ke teks | Whisper large-v3 | Notulen rapat dan rekaman lapangan |

Versi model dipilih saat pengadaan lewat uji dengan 100 pertanyaan dan tugas nyata BNPB. Model diperbarui berkala tanpa mengubah aplikasi.

**Pengaman angka.** AI tidak boleh mengarang angka:

1. Angka diambil oleh alat yang menjalankan kueri ke tampilan data yang sudah disetujui. AI tidak menulis kueri bebas ke seluruh basis data.
2. AI hanya menyusun kalimat, memilih grafik, dan merangkai halaman.
3. Tiap angka di paparan membawa sumber dan tanggal datanya.
4. Pencarian dokumen disaring dengan hak akses penanya, sehingga AI tidak bisa membuka data yang tidak boleh dilihat penanya.

**Generator paparan dan laporan.** Alurnya: permintaan, kerangka, penarikan data, perakitan berkas dari templat resmi BNPB (PowerPoint dan Word), lalu pemeriksaan oleh penyusun sebelum dokumen keluar. BPBD memakai templat yang sama dengan kop daerahnya sendiri.

Contoh permintaan: "Buatkan paparan banjir Jawa Tengah lima tahun terakhir, bandingkan dengan provinsi lain di Pulau Jawa, untuk rapat Kepala BNPB besok."

## Agen AI dan akses web

AI dirancang sebagai agen seperti Claude: ia merencanakan langkah, memakai alat, memeriksa hasilnya, lalu menyerahkan berkas jadi. Satu permintaan paparan bisa memanggil model 20 sampai 50 kali sebelum berkasnya selesai.

| Kemampuan | Padanan di sistem BNPB |
| --- | --- |
| Model yang berpikir dan memanggil alat | Model terbuka yang mendukung tool calling (keluarga Qwen3, gpt-oss), disajikan lewat vLLM |
| Alat | Protokol MCP, standar terbuka yang juga berjalan dengan model lokal; tiap alat (basis data, web, berkas, deck) menjadi satu server MCP |
| Cari dan baca web | Gerbang web: SearXNG yang dipasang sendiri dan pembaca halaman (Crawl4AI atau Trafilatura) |
| Menjalankan kode | Kotak pasir Python di kontainer terisolasi (gVisor atau Firecracker), tanpa akses ke data lain |
| Skill | Instruksi baku per tugas: laporan harian, kajian, paparan wilayah, surat; skill deck BNPB dan gerbang QA yang sudah ada dipindahkan |
| Memori | Selera, singkatan, dan format favorit per pengguna dan per unit, disimpan di PostgreSQL |
| Sub-agen | Tugas besar dipecah ke beberapa agen yang bekerja paralel |
| Pratinjau | PPT, Word, grafik, dan peta tampil di portal sebelum diunduh |
| Ruang kerja | Per unit atau per kejadian, berisi dokumen dan percakapan bersama |
| Pembuat agen tanpa kode | Admin unit membuat agen sendiri lewat formulir: nama, instruksi, tingkat kreativitas, sumber pengetahuan, dan siapa yang boleh memakai (pribadi, unit, atau publik) |
| Sumber pengetahuan per agen | Tiap agen hanya diberi sumber yang dipilih: unggahan PDF, DOCX, XLSX, tampilan basis data, REST API, atau server MCP. Agen Pusdalops tidak otomatis membaca berkas Inspektorat |
| Kotak uji agen | Agen dicoba dulu di ruang uji sebelum dibuka ke pengguna; mode penalaran menampilkan langkah, sumber, dan alasan jawabannya untuk audit |
| Ganti model per percakapan | Pengguna bisa memilih model (cepat atau teliti) dari daftar yang disediakan gerbang model |
| Saluran pakai | Selain portal, agen bisa disematkan di situs BPBD (iframe atau gelembung chat) dan disambungkan ke nomor WhatsApp resmi unit |
| Obrolan suara | Bicara langsung dengan agen, berguna di posko atau di jalan |
| Brankas kredensial | Kunci API dan akun layanan disimpan terpisah dari agen, dikelola admin, tidak pernah tampil ke pengguna |

Contoh: "Buatkan paparan banjir Jawa Tengah lima tahun, bandingkan dengan Pulau Jawa, untuk rapim besok." Agen menarik data DIBI dan BPBD, mencari rilis BMKG terbaru, menghitung tren dengan Python, merakit PPT dari templat BNPB, menjalankan gerbang QA, membetulkan yang gagal, lalu menyerahkan PPT dan PDF untuk dicek penyusun.

**Akses web.** AI tidak terhubung langsung ke internet. Semua akses lewat satu gerbang di zona DMZ:

1. Hanya kata kunci pencarian yang keluar. Gerbang menolak kueri yang memuat NIK, nama korban, atau isi dokumen internal.
2. Isi halaman web diperlakukan sebagai bahan, bukan perintah, sehingga teks jebakan di halaman tidak bisa memicu tindakan.
3. Angka dari web berlabel "sumber web, belum terverifikasi" dan dibedakan dari data resmi BNPB.
4. Situs rutin (BMKG, BIG, MAGMA, JDIH, berita kebencanaan) ditarik terjadwal ke basis data; pencarian bebas tetap boleh dan tercatat di log.

**Batas yang perlu disadari.** Model lokal masih di bawah Claude untuk tugas panjang. Kesenjangannya ditutup dengan skill yang ketat, templat baku, dan gerbang QA yang menolak hasil jelek secara otomatis. Tindakan keluar (mengirim surat, publikasi, mengubah data resmi) tetap menunggu persetujuan manusia.

## Biaya

Ajuan total sekitar Rp15–21 miliar untuk 18 bulan pembangunan, termasuk cadangan 10%, lalu sekitar Rp2,7–4 miliar per tahun untuk operasional. Semua angka adalah perkiraan pasar yang belum dicek ke e-katalog; harga GPU mengikuti kurs dolar.

**A. Pilot, bulan 1 sampai 4: sekitar Rp1,6–2,3 miliar**

| Komponen | Isi | Perkiraan |
| --- | --- | --- |
| Server AI pilot | 1 GPU H100 80 GB atau 2 GPU L40S 48 GB, RAM 256 GB, NVMe | Rp0,6–1,0 miliar |
| Server basis data dan aplikasi | 2 unit, atau mesin virtual di PDN | Rp0,2–0,4 miliar |
| Tim inti | 6 orang × 4 bulan | Rp0,6 miliar |
| Pendampingan 4 provinsi pilot | Pelatihan dan perjalanan | Rp0,2–0,3 miliar |

**B. Skala nasional, bulan 5 sampai 18: sekitar Rp11–16 miliar**

| Komponen | Isi | Perkiraan |
| --- | --- | --- |
| Node AI nasional | 8 GPU H100 atau H200 | Rp5–7 miliar |
| Server basis data dan aplikasi | Primary dan replika, 3–4 unit | Rp0,8–1,2 miliar |
| Penyimpanan berkas | 100–200 TB foto, PDF, PPT | Rp0,4–0,8 miliar |
| Jaringan, rak, UPS | Tidak perlu bila ditempatkan di PDN | Rp0,3–0,5 miliar |
| Cadangan data di lokasi kedua | Salinan data, tanpa model | Rp0,5–1,0 miliar |
| Gerbang web dan kotak pasir kode | Server DMZ dan server eksekusi kode terisolasi | Rp0,1–0,3 miliar |
| Tim pengembang | 8–10 orang × 14 bulan | Rp2,8–3,5 miliar |
| Uji keamanan | Pentest dan penilaian BSSN | Rp0,2–0,4 miliar |
| Pelatihan BPBD | 38 provinsi dan pelatih untuk kab/kota | Rp0,8–1,5 miliar |
| Penyusunan Peraturan BNPB | Konsultasi dan rapat | Rp0,1–0,2 miliar |

**C. Operasional per tahun setelah jadi: sekitar Rp2,7–4 miliar**

| Komponen | Perkiraan per tahun |
| --- | --- |
| Ruang pusat data dan listrik (node GPU sekitar 10 kW) | Rp0,2–0,4 miliar |
| Pemeliharaan dan garansi (10–15% harga beli) | Rp0,7–1,2 miliar |
| Tim operasional 6–8 orang | Rp1,8–2,4 miliar |

Lisensi perangkat lunak Rp0 karena semuanya sumber terbuka. Biaya perangkat keras bisa turun banyak bila PDN menyediakan server GPU, atau berubah menjadi sewa bulanan bila GPU disewa dari penyedia cloud dalam negeri. Pemakaian agen yang berat (ratusan pengguna aktif harian) bisa menuntut tambahan kapasitas GPU, karena satu node 8 GPU kira-kira melayani 10–20 agen bersamaan.

## Penghematan per tahun

Perkiraan penghematan sekitar Rp7–18 miliar per tahun; dikurangi operasional, bersihnya sekitar Rp4–14 miliar, sehingga biaya pembangunan kembali dalam 2 sampai 5 tahun. Sebagian besar berupa jam kerja yang dibebaskan, bukan uang tunai, dan baru menjadi penghematan nyata bila staf dialihkan ke pekerjaan lain.

| Pos | Asumsi | Hemat per tahun |
| --- | --- | --- |
| Waktu staf BNPB pusat menyusun paparan, laporan, rekap | 200 staf, hemat 3 jam per minggu, Rp75 ribu per jam | Rp2,2 miliar |
| Waktu staf BPBD merekap dan melapor | 552 BPBD, 3 staf masing-masing, hemat 2 jam per minggu, Rp60 ribu per jam; batas bawah bila separuh BPBD memakai | Rp4,7–9,5 miliar |
| Langganan AI komersial yang tidak perlu dibeli | 1.000 pengguna × USD 25–30 per bulan | Rp0–5,4 miliar |
| Aplikasi lama yang digabung | Sekitar 5 aplikasi, Rp200–500 juta per tahun masing-masing | Rp0–2,5 miliar |

Manfaat yang tidak dirupiahkan: angka pusat dan daerah sama tanpa pencocokan sebelum rapat, paparan untuk Presiden atau DPR siap dalam hitungan jam, dan data korban tidak keluar dari server pemerintah.

**Angka yang harus diverifikasi:** jumlah staf yang benar-benar menyusun laporan beserta jam per minggunya, dan daftar aplikasi BNPB yang ada beserta biaya pemeliharaannya.

## Regulasi, keamanan, dan perlindungan data

Sistem ini harus berdiri di atas aturan yang sudah ada, ditambah satu peraturan BNPB baru yang mewajibkan pelaporan lewat satu pintu.

| Aturan | Akibatnya bagi sistem |
| --- | --- |
| UU 24/2007 tentang Penanggulangan Bencana | Dasar kewenangan BNPB dan BPBD atas data kebencanaan |
| Perpres 39/2019 tentang Satu Data Indonesia | Kode referensi, metadata, dan interoperabilitas wajib diikuti; BPBD ditetapkan sebagai produsen data kebencanaan di forum Satu Data daerah |
| Perpres 95/2018 tentang SPBE | Server di Pusat Data Nasional atau pusat data instansi; pertukaran antarinstansi lewat SPLP |
| UU 27/2022 tentang Pelindungan Data Pribadi | Data korban dan pengungsi dibatasi per peran, NIK tidak ditampilkan penuh, ada log siapa membuka apa |
| Standar keamanan BSSN | Uji keamanan sebelum tayang, enkripsi, dan pemantauan akses |

**Payung baru yang perlu disusun:** Peraturan BNPB tentang sistem informasi kebencanaan terpadu. Tanpa kewajiban ini, pemakaian oleh BPBD tidak akan merata.

## Tahapan dan pilot

Pembangunan berjalan dalam empat tahap selama 18 bulan. Tiap tahap baru dimulai setelah gerbang sebelumnya terpenuhi.

&#91;embedded content: Tahapan 18 bulan dengan tiga gerbang\]

Prototipe bisa dibuat sekarang dengan perangkat yang sudah ada, sehingga pimpinan melihat demo sebelum ada pengadaan.

**Usulan provinsi pilot,** dipilih agar jenis bencananya berbeda:

| Provinsi | Bencana utama yang diuji |
| --- | --- |
| Kalimantan Barat | Karhutla |
| Riau | Karhutla dan asap |
| Jawa Tengah | Banjir dan longsor |
| Sulawesi Tengah | Gempa dan tsunami |

**Pilot dinyatakan lolos bila:**

1. BPBD pilot melapor kejadian hanya lewat sistem selama 4 minggu berturut-turut.
2. Sitrep provinsi terbentuk otomatis dan cocok dengan rekap manual.
3. Paparan yang disusun AI dari 20 permintaan nyata bisa dipakai setelah sedikit suntingan, dan semua angkanya bisa dilacak ke sumbernya.
4. Uji keamanan tidak menemukan celah tingkat tinggi.

## Perbandingan dengan produk vendor

Lapisan chat AI boleh dibeli, tetapi inti data harus milik BNPB. Contoh produk yang ada di pasar adalah KnowgenAI dari PT Metrodata Electronics Tbk. Produk ini adalah platform pembuat agen AI: admin membuat agen, memberinya sumber pengetahuan, mengatur siapa yang boleh memakai, lalu menyematkannya di situs atau WhatsApp. Sumber pengetahuannya berupa unggahan PDF, DOCX, dan XLSX, basis data BigQuery, REST API, server MCP, serta alat bawaan (cuaca, Google Search, Wikipedia). Hak aksesnya tiga peran (pengguna, admin, super admin) yang bisa disetel per menu, dikelompokkan per organisasi. Login, basis data, dan akun layanannya bertumpu pada Google Cloud.

| Kebutuhan BNPB | Produk pembuat agen AI | Sistem yang diusulkan |
| --- | --- | --- |
| Tanya jawab dan laporan dari data | Ada | Ada |
| Sambungan ke banyak sumber data | Ada: berkas, BigQuery, REST API, MCP | Ada, ditambah SPLP, API BPBD, dan PostgreSQL |
| Pembuat agen, kotak uji, sematan web dan WhatsApp | Ada | Ada, ditiru (lihat bagian Agen AI) |
| Hak akses berjenjang BNPB, provinsi, kabupaten/kota | Per peran dan per menu dalam organisasi | Per kode wilayah, ikut menyaring jawaban AI |
| Berjalan di server internal tanpa internet | Tidak disebut; login, basis data, dan akun layanan memakai Google Cloud | Wajib |
| Peta dan data lokasi | Tidak ada | PostGIS dan peta di tiap layar |
| Status draf dan terverifikasi | Tidak ada | Ada |
| Pengisian luring di lapangan | Tidak ada | Ada |
| Penyusun paparan dan laporan dari templat BNPB | Tidak ada; keluarannya teks chat | Ada |
| Kepemilikan data dan kode | Milik vendor | Milik BNPB |

**Opsi:**

1. **Bangun sendiri dengan perangkat lunak sumber terbuka** (direkomendasikan). Kendali penuh dan tanpa lisensi per pengguna, tetapi butuh tim teknis tetap.
2. **Gabungan.** Inti data dibangun sendiri, lapisan chat dibeli dari vendor. Syaratnya: produk bisa dipasang di server internal tanpa internet, aksesnya lewat API terbuka, dan hak akses per wilayah ikut menyaring jawaban AI.
3. **Beli utuh dari vendor.** Paling cepat dimulai, tetapi BNPB terkunci ke vendor dan hierarki BPBD harus dibuat ulang di produk itu.

Bila vendor diundang, minta demonstrasi tiga hal: berjalan tanpa internet, jawaban AI tersaring per wilayah, dan tiap angka bisa dilacak ke sumbernya.

## Risiko dan mitigasi

Risiko terbesar bukan teknologi, melainkan BPBD yang tidak ikut mengisi.

| Risiko | Mitigasi |
| --- | --- |
| BPBD tetap melapor lewat WhatsApp | Peraturan BNPB tentang pelaporan satu pintu; form singkat; laporan provinsi dan nasional hanya diambil dari sistem |
| AI mengarang angka | Angka hanya dari kueri basis data, sumber tercantum, pemeriksaan penyusun sebelum dokumen keluar |
| Kebocoran data pribadi | Hak akses per peran dan wilayah, NIK disamarkan, log akses, uji keamanan BSSN |
| Mutu jawaban AI lokal di bawah layanan komersial | Tugas dibatasi pada data dan templat sendiri; uji 100 tugas nyata sebelum memilih model; model diganti saat versi baru lebih baik |
| Halaman web berisi teks jebakan untuk AI | Isi web diperlakukan sebagai bahan, bukan perintah; hasil web tidak bisa memicu tindakan; hanya kata kunci yang keluar lewat gerbang |
| Kapasitas GPU habis saat agen dipakai ramai | Antrean dan kuota per pengguna di gerbang model; pemakaian dipantau sejak pilot sebelum node nasional dibeli |
| Sinyal lemah di daerah | Form luring yang terkirim otomatis saat ada sinyal |
| Bergantung pada satu vendor | Perangkat lunak sumber terbuka; kode dan data milik BNPB |
| Tim teknis tidak tersedia | Tim inti tetap 4 sampai 6 orang (pengembang, operator server, analis data) sejak pilot |

## Keputusan yang diminta

Empat keputusan dibutuhkan agar prototipe berjalan bulan ini dan pilot dimulai pada bulan kedua.

- [ ] Persetujuan pilot 3 bulan di 3 sampai 4 provinsi, beserta anggaran satu server GPU.
- [ ] Penetapan tim inti 4 sampai 6 orang dan penanggung jawab dari Pusdatinkom.
- [ ] Persetujuan lokasi server di Pusat Data Nasional atau pusat data BNPB.
- [ ] Penugasan penyusunan rancangan Peraturan BNPB tentang sistem informasi kebencanaan terpadu.
