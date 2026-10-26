# Pola deck konsultan kelas dunia (S1 sampai S39)

> Salinan kata demi kata dari `docs/buku-pegangan/pantau-bencana.md` subbab "Pola deck konsultan kelas dunia" dan `data/kajian-bnpb/TAMBAHAN-PPTX-RULES.md`, diambil 26 Okt 2026 untuk skill deck-bnpb. Jalur repo di dalam teks (mis. `data/kajian-bnpb/...`, `bangun/pptx/...`, `qa/periksa.py`) dipetakan ke skill di `references/peta-jalur.md`. Aturan tidak diringkas; bila ada yang bertentangan, urutan otoritas di `keputusan-pemilik.md` berlaku.

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



---

## Tambahan dari skill alfatehan-pptx-rules untuk deck kajian

Dinilai 23 Okt 2026 terhadap Buku Pegangan bab Selera presentasi (PPT). Buku Pegangan
menang bila bentrok. Berkas ini dilebur ke Buku Pegangan, PEDOMAN-DESAIN.md, pembangun
PPTX, dan `qa/` pada tahap penggabungan.

## Dipakai

| No | Aturan skill | Penerapan di deck kajian | Diperiksa oleh |
| --- | --- | --- | --- |
| 1 | Satu pesan kunci per deck, garis besar satu baris per slide sebelum membangun | Tiap deck punya satu kalimat pesan kunci di spek deck; spek berisi judul + pesan + visual per slide (ghost deck) sebelum render | spek deck JSON wajib berisi `pesan_kunci` dan `pesan` tiap slide |
| 2 | Slide master dulu (kepala, kaki, nomor) | Sudah: master dari deck BNPB pemilik | qa: semua slide memakai layout master yang sama |
| 3 | Variasi tata letak, jangan dua slide berurutan bertata letak sama | Urutan tipe slide di spek tidak boleh mengulang tipe yang sama berturut-turut (kecuali lampiran tabel) | qa: tipe slide berurutan |
| 4 | Tiap slide punya unsur visual (grafik, peta, ikon, bentuk) | Tidak ada slide teks saja | qa: tiap slide memuat minimal satu gambar, tabel, atau kelompok bentuk |
| 5 | Ikon PNG asli, bukan simbol Unicode; nol emoji | Sudah sejalan (ikon garis dalam lingkaran) | qa: glif di luar cmap Roboto, emoji |
| 6 | Paling banyak 6 butir per daftar, ideal 3–4; paling banyak 2 tingkat | Berlaku untuk daftar di panel; pita bawah tetap 3–4 kolom | qa: hitung butir per kotak teks |
| 7 | Tiap angka bersumber dan bertahun di slide | Satu baris "Sumber: …" 7,5 pt 6B7280 di zona catatan kaki tiap slide analisis (pola Buku Pegangan untuk slide analisis); tidak memasang baris sumber di bawah tiap grafik (dihapus pemilik di d5) | qa: slide berangka tanpa baris Sumber ditolak |
| 8 | Grafik native (bisa disunting), bukan gambar | Grafik batang, garis, dan tabel di PPTX dibuat dari bentuk/tabel native seperti deck pemilik; PNG hanya untuk peta dasar, foto, logo, ikon | qa: gambar raster di slide hanya dari daftar izin (peta, foto, logo, ikon) |
| 9 | Kata terlarang khas AI | Ditambahkan ke ANTI-SLOP.md dan `qa/slop.py` dalam padanan Indonesia: komprehensif (sebagai hiasan), memanfaatkan/mendayagunakan (bila "memakai" cukup), tangguh/kokoh/robust (sebagai hiasan), mulus/seamless, menavigasi, krusial, esensial, mendalami/menyelami, memulai perjalanan, mendorong/memupuk (foster) tanpa objek terukur, sangat penting/pivotal, transformatif; versi Inggris juga | qa/slop.py |
| 10 | Nol tiga-serangkai; em dash paling banyak 1 per slide | Lebih ketat dari skill: em dash nol (Buku Pegangan), tiga-serangkai dilarang | qa/slop.py, periksa.py |
| 11 | Margin minimal 0,5 inci | Sudah: margin 43,2 pt | qa: kotak di luar 36 pt dari tepi |
| 12 | Laporan QA per deck (font, ikon, tata letak, anti-AI lulus/gagal) | `qa/periksa.py` mengeluarkan laporan per deck dan per DOCX dalam format itu | keluaran qa |
| 13 | Render ke gambar, periksa visual, perbaiki, periksa ulang | Sudah jadi alur kerja (Buku Pegangan Alur kerja langkah 3–4) | penyerahan |

## Tidak dipakai (bentrok dengan keputusan pemilik)

| Aturan skill | Keputusan pemilik yang berlaku |
| --- | --- |
| Judul 36–44 pt | Judul 19–26 pt, paling banyak dua baris (Buku Pegangan, Judul) |
| Isi 14–16 pt, keterangan 10–12 pt | Skala padat deck BNPB: isi 7,2–11 pt, batas bawah 6 pt; slide 180–290 kata |
| Jarak antarblok 0,3–0,5 inci | Jarak kartu 7,2 pt, antarpanel 10,8 pt, antargrup 21 pt |
| Jangan ada garis di bawah judul | Garis 0,75 pt selebar isi di bawah judul adalah kerangka rumah BNPB; yang dilarang adalah garis aksen pendek berwarna |
| Mesin PptxGenJS | Pembangun memakai templat XML deck pemilik agar master identik; prinsip native tetap dipakai |
