# Rancangan pertanyaan kronologi berpandu, Lapor Bencana BNPB

Status: usulan riset (19 Nov 2026), belum masuk kode. `KEPUTUSAN-LAPOR-AI.md` tetap menang bila bertentangan. Berkas data siap pakai: `kronologi_usulan.json` di folder yang sama.

## 1. Masalah dan prinsip

Kronologi sekarang tiga langkah per jenis ditambah lama kejadian dan fenomena lain. Itu mengulang apa yang sudah ada di logbook Pusdalops, padahal logbook sendiri miskin pengamatan. Temuan di bawah menunjukkan nilai tambah warga ada di hal yang jarang dicatat petugas: tanda awal, kecepatan kejadian, bahaya yang masih mengancam, dan fenomena penyerta.

Prinsip rancangan:
1. Urutan kronologis: tanda awal, pemicu, kejadian utama, dampak yang terlihat, kondisi sekarang, bahaya lanjutan, fenomena lain.
2. Pilihan hanya hal yang bisa diamati langsung (apa yang dilihat, didengar, dicium, dirasakan), bukan istilah teknis. Tiap pertanyaan punya jalan keluar "Tidak tahu" atau "Tidak ada" yang jujur.
3. Tidak mengulang isian angka (korban, pengungsi, rumah, fasilitas, kebutuhan), waktu kejadian, dan isian khusus (tinggi air, intensitas SIG, tebal abu, dan seterusnya). Pertanyaan hanya jenis objek, bentuk, dan kondisi.
4. Pilihan yang menandakan bahaya jiwa ditandai supaya chatbot menyisipkan peringatan keselamatan pendek sebelum lanjut.
5. Kalimat dirakit mesin; frasa mengikuti aturan `rangkaiKronologi` (frasa diawali huruf kecil menyambung kalimat sebelumnya, huruf besar membuka kalimat baru).

## 2. Struktur data usulan

```
{jenis: [{tanya, banyak?, awalan?, bahaya?, opsi: [[label, frasa, pemicu?]]}]}
```
Tambahan terhadap bentuk `KRONOLOGI` sekarang:
- `opsi[2] = true`: memilih opsi ini memicu pesan `bahaya` milik pertanyaan itu (peringatan keselamatan, bukan penilaian resmi).
- `awalan` (hanya `banyak: true`): kalimat dirakit `awalan + daftar pilihan (koma, "dan") + titik`. Contoh: "Genangan merendam permukiman warga, jalan, dan sawah." Tanpa `awalan`, perilaku `FENOMENA` sekarang dipertahankan.
- `frasa: null` pada pilihan "Tidak tahu" atau "Tidak ada": tidak menambah kalimat. Pada `banyak`, memilihnya mengosongkan pilihan lain.
- `langkahKronologi` perlu berhenti menambahkan `LAMA` dan `FENOMENA` otomatis, karena langkah lama dan fenomena sudah tertulis per jenis di berkas ini (bila tidak, lama kejadian bertanya dua kali).
- Pesan `bahaya` diambil dari pertanyaan, bukan dari opsi; satu pertanyaan satu pesan.
- Jumlah pilihan 3 sampai 7 (pilihan banyak lebih dari 6 karena tombol "tidak ada"). Teks peringatan memakai nomor 112 (darurat umum), Basarnas 115, dan damkar 113; hubungi BPBD setempat bila ada. Nomor itu perlu dikonfirmasi pemilik sebelum tayang (Q baru, lihat bagian 6).

## 3. Temuan agregat logbook Pusdalops 2024 sampai 2026

Sumber: `data/raw/logbook/arsip/2024..2026/baris.jsonl` (31.285 baris; privat, hanya persentase). Dihitung per jenis mapping `gunungapi` ke erupsi, `gempabumi` ke gempa, `gelombang_pasang` ke abrasi, `kebakaran_permukiman` ke kebakaran gedung. Persentase = baris yang kolom `kronologi` atau kolom yang disebut memuat kata kunci; kata kunci kasar, jadi anggap orde besar, bukan angka resmi. Tsunami nyaris tak tercatat (8 baris menyebut tsunami nyata di luar kalimat "tidak berpotensi tsunami"), sehingga tidak ada angka dasar.

| Jenis | Baris | Isi kronologi paling sering | Yang hampir tidak tercatat |
|---|---|---|---|
| Banjir | 10.435 | hujan intensitas tinggi 89 persen, sungai meluap 39, tercatat pukul atau jam 38, arus deras 12, tinggi air 12, air kiriman 9, rob 6, tanggul 6 | lumpur 1, jalan terputus 1, listrik 1, warga mengungsi 0 |
| Longsor | 3.386 | hujan 85, tanah labil atau jenuh 20, rumah tertimpa 26, jalan 16, tebing atau lereng 12 | retakan 4, gemuruh 0, longsor susulan 1, korban jiwa 1, alat berat 0 |
| Gelombang pasang dan abrasi | 103 | pasang atau rob 44, gelombang tinggi 36, angin kencang 31, rumah rusak 10, perahu 9 | tanggul 3, peringatan BMKG 1 |
| Cuaca ekstrem | 4.570 | angin kencang 84 sampai 92, hujan 66 sampai 84, pohon tumbang 28, atap 16 | puting beliung 7, petir 2, hujan es 0, durasi kejadian 1, tanda awal 0 |
| Kekeringan | 1.939 | tidak hujan atau kemarau 80, air bersih sulit 75, mata air atau sungai 17, sejak kapan 16, sumur 9 | gagal panen 1, distribusi air 2, kesehatan 0 |
| Karhutla | 5.058 | hutan 45, pembakaran atau pembukaan lahan 10, cuaca kering 8, masih menyala atau berasap 8, hotspot 6, angin 5 | gambut 1, api dekat permukiman 2 sampai 3, asap 3, api muncul lagi 0, ISPA 0 |
| Gempa | 449 | kedalaman 97, sesar atau darat atau laut 84, tidak berpotensi tsunami 66, skala dirasakan 42, susulan 35, panik 19 | rumah rusak 0, korban 2, longsor 0 (isi hampir salinan rilis BMKG) |
| Erupsi | 663 | tinggi kolom abu 89, hujan abu 84, level status 80, gempa vulkanik 77, arah angin 75, warna asap 72, gemuruh 19 | lahar 8, mengungsi 4, awan panas 2, lava 2 |
| Kebakaran gedung | 1.012 | korsleting 42, jenis bangunan 44, penyebab belum diketahui 25, kompor atau gas 12, unit damkar 12 | ledakan 4, penghuni terjebak 0, sumber air 1 |

Kolom kondisi terakhir (persentase baris): banjir 67 surut atau selesai, 37 masih berlanjut; longsor 35 masih berlanjut, 16 kondusif, 8 potensi susulan; karhutla 55 padam, 25 masih berlanjut; gempa 46 masih berlanjut, 34 potensi susulan; erupsi 34 masih berlanjut, 18 waspada susulan; kebakaran gedung 81 padam.

Kolom upaya karhutla (agregat): patroli 41, water bombing 39, sumber air atau pompa 16, pembasahan 6, sekat bakar 3. Kendala karhutla: medan atau akses 15, sumber air 13, angin 11, alat 9.

Tiga pola yang membentuk rancangan:
1. Logbook kuat di PENYEBAB dan WAKTU, lemah di TANDA AWAL, KECEPATAN, dan BAHAYA LANJUTAN. Di semua jenis, tanda bahaya lanjutan (gemuruh, retakan melebar, air kiriman, api muncul lagi) di bawah 5 persen. Di situlah pertanyaan warga bernilai.
2. Gempa dan erupsi ditulis dari data instrumen (magnitudo, kedalaman, kolom abu, amplitudo). Pengamatan warga (lama guncangan, reaksi, apa yang terlihat sesudahnya) hampir tidak ada, padahal itu isi USGS "Did You Feel It?".
3. Kebakaran dan karhutla: penyebab dugaan dan kondisi api tercatat, tetapi bentuk api (permukaan, bawah tanah), ancaman ke permukiman, dan asap bagi kesehatan jarang.

## 4. Temuan sumber resmi dan praktik dunia

Catatan kejujuran: pencarian web sesi ini banyak kembali ke media dan artikel pendidikan, bukan dokumen primer. Butir bertanda (media) perlu diverifikasi ke dokumen resmi sebelum teks peringatan tayang. Dokumen yang saya tidak temukan secara primer ditandai "tidak terverifikasi".

- Gerakan tanah (PVMBG; media): tanda awal retakan berbentuk tapal kuda di mahkota lereng, rembesan atau mata air keruh atau baru muncul, pohon, tiang, atau pagar miring searah lereng, gemuruh dari lereng; retakan melebar saat hujan. CNN Indonesia https://www.cnnindonesia.com/teknologi/20180206075759-199-274109/kenali-longsor-dan-tanda-tandanya ; Medcom (pakar UGM) https://www.medcom.id/pendidikan/riset-penelitian/ob3yl9mK-5-tanda-alam-tanah-akan-longsor-pakar-ugm-sebut-nomor-3-sering-diabaikan ; Antara (PVMBG) https://jambi.antaranews.com/berita/464546/pvmbg-dokumentasi-titik-longsor-lama-perlu-untuk-bangun-kesiapsiagaan . Klasifikasi rayapan, runtuhan, aliran bahan rombakan di langkah 3 longsor: tidak terverifikasi ke dokumen PVMBG.
- Puting beliung dan cuaca ekstrem (BMKG; media): udara gerah sehari sebelumnya, awan putih berubah gelap pekat bergumpal (cumulonimbus), udara mendadak dingin disertai angin kencang, pusaran yang turun dari dasar awan ke tanah; durasi umumnya 3 sampai 5 menit, paling lama sekitar 10 menit; tidak semua cumulonimbus menghasilkan puting beliung. Liputan6 https://www.liputan6.com/news/read/3801138/tanda-tanda-puting-beliung-terbentuk-menurut-bmkg ; Suara Surabaya https://www.suarasurabaya.net/kelanakota/2021/bmkg-tidak-semua-awan-cumulonimbus-sebabkan-puting-beliung ; Jurnal Meteorologi dan Geofisika BMKG https://jmg.bmkg.go.id/jmg/index.php/jmg/article/download/1180/517/5059 .
- Tsunami (BMKG; media): guncangan lama, bukan hanya kuat, adalah tanda alami; air laut surut tiba-tiba; gemuruh dari laut; jangan menunggu peringatan resmi, langsung ke tempat tinggi; peringatan jangan dicabut selama osilasi berlanjut (Palu 2018). Jakarta Post https://www.thejakartapost.com/news/2019/03/27/at-first-sign-trouble-don-t-wait-tsunami-warning-just-run-higher-ground-bmkg.html ; ESKP https://www.eskp.de/en/natural-hazards/tsunami-advice-indonesia/ ; glosarium InaTNT BMKG https://inatnt.bmkg.go.id/web/glosary .
- Erupsi (PVMBG, MAGMA; media): gempa vulkanik adalah tanda paling umum; gas dan mata air hangat meningkat; jeda dari sinyal seismik ke erupsi bisa hanya beberapa jam; level Awas dinaikkan setelah tremor menerus beramplitudo naik. Katadata https://databoks.katadata.co.id/en/environment/statistics/99abf267a5a6182/pvmbg-lewotobi-volcano-alert-level-raised-to-level-iv-awas-marapi-to-level-iii-siaga ; Antara https://mataram.antaranews.com/berita/475909/sudden-eruption-likely-on-mt-lewotobi-official-warns . Satwa turun dan mata air kering sebagai tanda: tidak ditemukan di sumber resmi; dimasukkan sebagai pengamatan dan dicatat belum terverifikasi.
- Karhutla gambut (media): api gambut sering tanpa nyala, hanya asap lama; bara dalam tanah bertahan walau permukaan padam; tiga helikopter water bombing berulang, api baru padam 10 hari kemudian di Sungai Gelam. Mongabay https://mongabay.co.id/2026/09/15/ketika-masyarakat-sungai-gelam-belajar-deteksi-dini-api/ ; Good News from Indonesia https://www.goodnewsfromindonesia.id/indonesiana/nasional/gambut-kering-rentan-jadi-bahan-bakar-alami-pemadaman-menyeluruh-dan-pencegahan-karhutla-perlu-jalan-beriringan . SOP Manggala Agni dan BNPB: tidak ditemukan primer.
- IASC MIRA (primer): penilaian cepat multi-sektor memakai observasi langsung, wawancara informan kunci, dan Preliminary Scenario Definition 72 jam. Manual https://interagencystandingcommittee.org/sites/default/files/migrated/2014-11/2012_04_mira_manual.pdf ; UNHCR https://emergency.unhcr.org/print/pdf/node/629 . Dipakai untuk: lifeline (listrik, air, sinyal, jalan), laju perubahan, kondisi sekarang.
- USGS "Did You Feel It?" (primer): kuesioner warga tentang persepsi gerak, lama guncangan, reaksi dan perilaku, benda jatuh, dan kerusakan; jawaban dibobot jadi intensitas. https://www.usgs.gov/publications/did-you-feel-it-intensity-data-surprisingly-good-measure-earthquake-ground-motion ; presentasi 18 pertanyaan https://www.escmacroswg.rm.ingv.it/wp-content/uploads/2021/09/ESC2021_Quitoriano_USGS.pdf . Daftar pertanyaan terkini tidak terambil; yang dipakai adalah kerangkanya.
- NOAA mPING (primer): laporan cuaca anonim dari ponsel berbasis jenis fenomena yang diamati warga. https://mping.nssl.noaa.gov/types.php ; fact sheet https://nssl.noaa.gov/news/factsheets/mPING_Fact_Sheet_2014.pdf . Daftar kategori hail dan kerusakan angin: tidak terverifikasi.
- FEMA ICS 201 Incident Briefing, NWS storm spotter, ACAPS, dan Perka atau Juklak pengkajian cepat BNPB: tidak dibuka dalam sesi ini; hanya dipakai sebagai kerangka umum (situasi sekarang, bahaya, sumber daya). Perlu dibuka sebelum dijadikan rujukan di dokumen.

## 5. Rancangan pertanyaan per jenis

Pemicu peringatan ditandai kolom terakhir. Tiap pertanyaan memuat alasan (angka logbook atau sumber).

### Banjir (`banjir`), 8 langkah

**1. Sebelum air naik, apa yang pertama kali Anda lihat atau alami?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Hujan deras berjam-jam | Hujan dengan intensitas tinggi turun dalam waktu lama |  |
| Air sungai atau selokan naik cepat | Debit sungai atau saluran air meningkat hingga meluap |  |
| Di sini cerah, air datang dari arah hulu | Air kiriman dari wilayah hulu tiba di lokasi meski di lokasi tidak turun hujan |  |
| Air laut pasang masuk ke darat | Air laut pasang masuk ke daratan |  |
| Tanggul, talud, atau pintu air jebol | Tanggul atau pintu air jebol |  |
| Tidak tahu | Air naik dengan penyebab yang belum diketahui |  |

Alasan: Logbook: 89 persen kronologi banjir menyebut hujan intensitas tinggi, 39 persen sungai meluap, 9 persen air kiriman, 6 persen pasang, 6 persen tanggul. Pilihan air kiriman penting karena warga hulu tidak melihat hujan.

**2. Bagaimana air naik?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Pelan, sedikit demi sedikit | Air naik perlahan |  |
| Cepat, dalam hitungan menit | Air naik dengan cepat dalam hitungan menit | ya |
| Tiba-tiba, deras, berlumpur, membawa kayu atau batu | Air datang tiba-tiba, deras, berlumpur, dan membawa material kayu serta batu, mengindikasikan banjir bandang | ya |
| Tidak tahu | (tanpa kalimat) |  |

Pesan peringatan: Air yang naik cepat atau deras bisa menghanyutkan orang. Jangan menyeberangi arus, segera naik ke tempat tinggi atau lantai atas, dan hubungi 112.

Alasan: Membedakan banjir genangan dan banjir bandang (kecepatan naik, lumpur, material). Logbook hanya 12 persen menyebut arus deras dan 1 persen lumpur, jadi tanda ini hampir tidak tercatat padahal menentukan tingkat bahaya. MIRA: laju perubahan situasi.

**3. Apa saja yang terendam?** (pilih banyak)

Awalan kalimat: "Genangan merendam"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Rumah warga | permukiman warga |  |
| Jalan | jalan |  |
| Sawah atau kebun | sawah dan kebun |  |
| Sekolah atau tempat ibadah | sekolah atau tempat ibadah |  |
| Pasar atau pertokoan | pasar atau pertokoan |  |
| Belum tahu | (tanpa kalimat) |  |

Alasan: Jenis objek terdampak (FEMA ICS 201: current situation). Jumlah rumah dan fasilitas ditanya di isian angka, di sini hanya jenis.

**4. Apa yang terganggu karena banjir ini?** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Dampak yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Jalan tidak bisa dilewati kendaraan | akses jalan terputus |  |
| Listrik padam | listrik padam |  |
| Air bersih keruh atau terhenti | air bersih terganggu |  |
| Sinyal telepon lemah atau hilang | jaringan telepon terganggu |  |
| Warga terjebak di rumah atau di atap | warga terjebak di dalam rumah | ya |
| Tidak ada yang terganggu | (tanpa kalimat) |  |

Pesan peringatan: Orang yang terjebak: tetap di tempat tinggi dan terlihat (atap, jendela atas), jangan berenang di arus, kirim lokasi ke 112 atau Basarnas 115.

Alasan: Lifeline (listrik, air, sinyal, jalan) adalah inti MIRA dan modul Lifeline repo. Logbook hanya mencatat jalan 1 persen dan listrik 1 persen, padahal inilah dampak yang paling cepat dilihat warga.

**5. Sudah berapa lama air menggenang di lokasi?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Baru, kurang dari 3 jam | Genangan berlangsung kurang dari tiga jam. |  |
| 3 sampai 12 jam | Genangan berlangsung tiga sampai 12 jam. |  |
| Lebih dari setengah hari | Genangan berlangsung lebih dari setengah hari. |  |
| Lebih dari sehari | Genangan berlangsung lebih dari satu hari. |  |

Alasan: Lama genangan menentukan kebutuhan air bersih, penyakit kulit, dan kerusakan rumah. Logbook hanya 5 persen menyebut durasi.

**6. Bagaimana air sekarang?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Masih naik | Saat dilaporkan, air masih naik. | ya |
| Bertahan, tidak naik tidak turun | Saat dilaporkan, ketinggian air bertahan. |  |
| Mulai surut | Saat dilaporkan, air mulai surut. |  |
| Sudah surut, lumpur tersisa | Saat dilaporkan, air sudah surut dan meninggalkan lumpur. |  |

Pesan peringatan: Air masih naik: pindahkan orang sakit, anak, dan lansia ke tempat tinggi sekarang, matikan listrik dari saklar utama bila aman.

Alasan: Logbook kolom kondisi: 67 persen menyebut surut atau selesai, 37 persen masih berlanjut. Status ini adalah isi baris 'kondisi terakhir' Pusdalops.

**7. Apakah ada tanda bahaya lanjutan di sekitar?** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Potensi bahaya lanjutan:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Hujan masih deras di sini | hujan masih turun deras | ya |
| Tebing atau tanggul tampak retak | tebing atau tanggul retak | ya |
| Kabel listrik terendam atau putus | kabel listrik terendam atau putus | ya |
| Ada kabar air kiriman dari hulu | ada peringatan kiriman air dari hulu | ya |
| Tidak ada | (tanpa kalimat) |  |

Pesan peringatan: Jauhi kabel listrik dan genangan di dekat tiang. Jangan menyeberangi tanggul atau jembatan yang retak.

Alasan: Bahaya sekunder banjir: sengatan listrik, tanggul runtuh, gelombang kedua dari hulu.

**8. Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Fenomena lain yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Arus deras | arus deras |  |
| Sampah atau kayu menumpuk di jembatan | sampah dan kayu menumpuk di jembatan |  |
| Ternak hanyut | hewan ternak hanyut |  |
| Longsor di tebing sekitar | longsor di tebing sekitar |  |
| Air sumur tercemar | air sumur tercemar |  |
| Tidak ada | (tanpa kalimat) |  |

Alasan: Fenomena penyerta dari logbook (arus 12 persen, longsor 5 persen) dan tanda sumbatan yang memperparah luapan.


### Tanah longsor (`longsor`), 8 langkah

**1. Sebelum tanah bergerak, apa yang Anda lihat atau dengar? Boleh pilih lebih dari satu.** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Sebelum longsor terlihat tanda:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Retakan baru di tanah atau dinding rumah | muncul retakan baru di tanah atau dinding | ya |
| Mata air keruh atau tiba-tiba keluar | mata air berubah keruh atau muncul rembesan baru |  |
| Pohon, tiang, atau pagar mulai miring | pohon, tiang, atau pagar mulai miring |  |
| Suara gemuruh dari arah lereng | terdengar suara gemuruh dari lereng | ya |
| Tidak ada tanda, tiba-tiba | (tanpa kalimat) |  |

Pesan peringatan: Retakan melebar atau gemuruh dari lereng berarti lereng bisa bergerak lagi. Menjauh dari lereng dan dari alur di bawahnya, jangan kembali ke rumah, hubungi 112.

Alasan: Tanda awal gerakan tanah (retakan mahkota, rembesan atau mata air keruh, pohon dan tiang miring, gemuruh) konsisten di liputan PVMBG, UGM, dan Antara. Logbook hanya 4 persen menyebut retakan dan 0 persen gemuruh: informasi ini hilang dari laporan sekarang.

**2. Apa pemicunya menurut Anda?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Hujan deras hari ini | Hujan dengan intensitas tinggi mengakibatkan tanah di lereng jenuh air dan longsor |  |
| Hujan terus beberapa hari | Hujan yang turun terus beberapa hari mengakibatkan tanah di lereng jenuh air dan longsor |  |
| Gempa | Guncangan gempa mengakibatkan lereng longsor |  |
| Tebing digali, dipotong, atau dibebani | Lereng yang digali, dipotong, atau dibebani bangunan longsor |  |
| Tidak tahu | Tanah di lereng longsor dengan pemicu yang belum diketahui |  |

Alasan: Logbook: 85 persen hujan intensitas tinggi, 19 persen tanah labil atau jenuh, 2 persen pemotongan tebing. Hujan beberapa hari dibedakan karena tanah jenuh berbahaya walau hari ini cerah.

**3. Seperti apa tanah bergerak?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Merayap pelan sedikit demi sedikit | Tanah bergerak perlahan menuruni lereng |  |
| Runtuh tiba-tiba dari tebing | Tanah dan batu runtuh tiba-tiba dari tebing |  |
| Mengalir seperti lumpur bercampur batu dan kayu | Material longsor mengalir seperti lumpur bercampur batu dan kayu | ya |
| Amblas turun ke bawah | Tanah amblas ke bawah |  |

Pesan peringatan: Aliran lumpur dan batu bergerak cepat dan jauh. Menjauh ke arah menyamping dari alurnya, bukan lurus ke bawah.

Alasan: Membedakan rayapan, runtuhan, amblasan, dan aliran bahan rombakan lewat penampakan, bukan istilah teknis. Aliran cepat jauh lebih mematikan.

**4. Apa yang tertimpa atau terdampak material longsor?** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Material longsor"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Rumah | menimpa rumah warga |  |
| Jalan | menutup jalan |  |
| Sawah atau kebun | menimbun sawah atau kebun |  |
| Sungai atau saluran air | menyumbat sungai atau saluran air | ya |
| Ada orang tertimbun | menimbun warga | ya |
| Tidak ada yang terdampak | (tanpa kalimat) |  |

Pesan peringatan: Jika ada yang tertimbun atau sungai tersumbat: telepon 112 atau Basarnas 115, sebutkan perkiraan lokasi, jangan menggali dengan tangan di dekat lereng yang masih bergerak.

Alasan: Logbook: 26 persen menyebut rumah, 16 persen jalan, 8 persen sungai. Sumbatan sungai memicu banjir bandang susulan, jadi diberi tanda bahaya.

**5. Bagaimana lereng sekarang?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Masih bergerak atau retakan melebar | Saat dilaporkan, tanah masih bergerak dan retakan melebar. | ya |
| Ada retakan baru, belum bergerak | Saat dilaporkan, terdapat retakan baru namun belum ada gerakan. |  |
| Sudah berhenti, tidak ada gerakan baru | Saat dilaporkan, gerakan tanah sudah berhenti. |  |
| Tidak tahu | Kondisi lereng saat dilaporkan belum diketahui. |  |

Pesan peringatan: Lereng yang masih bergerak: tidak ada yang boleh mendekat, evakuasi warga di bawah dan di atas lereng.

Alasan: Logbook kondisi: 35 persen masih berlanjut, 8 persen potensi susulan, 7 persen masih rawan.

**6. Bagaimana akses ke lokasi?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Bisa dilewati kendaraan | Akses ke lokasi masih bisa dilalui kendaraan. |  |
| Hanya bisa jalan kaki | Akses ke lokasi hanya bisa dilalui dengan berjalan kaki. |  |
| Terputus, alat berat belum bisa masuk | Akses ke lokasi terputus sehingga alat berat belum dapat masuk. |  |

Alasan: Akses menentukan kecepatan pencarian dan alat berat; logbook jalan tertutup hanya 4 persen di kondisi dan 1 persen alat berat di kronologi. Berbeda dari isian kebutuhan alat berat (di sini kondisi fisik jalan).

**7. Apakah ada bahaya lanjutan di sekitar?** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Potensi bahaya lanjutan:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Hujan masih turun | hujan masih turun | ya |
| Lereng lain di sekitar retak | lereng lain di sekitar retak | ya |
| Air terbendung di sungai atas | air terbendung di sungai bagian atas | ya |
| Warga masih berada di bawah lereng rawan | warga masih berada di bawah lereng rawan | ya |
| Tidak ada | (tanpa kalimat) |  |

Pesan peringatan: Longsor susulan sering datang setelah hujan atau beberapa jam kemudian. Pindahkan warga ke tempat aman yang jauh dari lereng dan alur sungai.

Alasan: Longsor susulan hanya 1 persen disebut di logbook, padahal ini penyebab korban kedua. Sumber: PVMBG melalui Antara dan CNN Indonesia.

**8. Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Fenomena lain yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Longsor susulan kecil | longsor susulan kecil |  |
| Pohon tumbang | pohon tumbang |  |
| Listrik padam atau kabel putus | listrik padam atau kabel putus |  |
| Air sumur atau mata air keruh | air sumur atau mata air keruh |  |
| Jalan amblas | jalan amblas |  |
| Tidak ada | (tanpa kalimat) |  |

Alasan: Fenomena penyerta yang tidak ada di logbook.


### Gelombang pasang dan abrasi (`abrasi`), 7 langkah

**1. Sebelum air laut naik atau pantai terkikis, apa yang Anda lihat?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Angin kencang dan cuaca buruk di laut | Angin kencang dan cuaca buruk di laut diikuti gelombang tinggi |  |
| Air laut surut mendadak lalu naik lagi | Air laut surut mendadak lalu kembali naik | ya |
| Ombak besar datang padahal cuaca cerah | Gelombang besar datang meski cuaca tampak cerah |  |
| Air pasang purnama, lebih tinggi dari biasa | Air laut pasang tinggi melebihi biasanya |  |
| Tidak tahu | Gelombang tinggi menerjang kawasan pesisir dengan penyebab yang belum diketahui |  |

Pesan peringatan: Jika air laut surut mendadak, terlebih setelah gempa, segera menjauh dari pantai ke tempat tinggi tanpa menunggu peringatan resmi.

Alasan: Logbook: 44 persen pasang atau rob, 36 persen gelombang tinggi, 31 persen angin kencang. Surut mendadak diberi peringatan karena bisa tanda tsunami (BMKG).

**2. Apa yang terjadi di pantai?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Ombak menghantam bibir pantai | Gelombang tinggi menghantam bibir pantai |  |
| Air laut masuk ke permukiman | Air laut masuk ke permukiman dan menggenangi pesisir |  |
| Pantai terkikis dan mundur | Garis pantai terkikis dan mundur |  |
| Tanah atau pohon di tepi pantai runtuh ke laut | Tanah dan pohon di tepi pantai runtuh ke laut |  |

Alasan: Membedakan gelombang pasang, rob, dan abrasi lewat pengamatan langsung.

**3. Sebelum ini, apakah pantai di sini sering terkikis?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Baru kali ini | Menurut pelapor, kejadian ini baru pertama kali di lokasi. |  |
| Terulang setiap musim gelombang tinggi | Menurut pelapor, kejadian serupa terulang setiap musim gelombang tinggi. |  |
| Terkikis terus beberapa tahun terakhir | Menurut pelapor, pantai di lokasi terkikis terus beberapa tahun terakhir. |  |

Alasan: Memisahkan kejadian tunggal dari abrasi kronis; melengkapi isian garis pantai. Sumber: modul pesisir (Landsat tahunan) bisa dibanding dengan jawaban ini.

**4. Apa saja yang terdampak?** (pilih banyak)

Awalan kalimat: "Terdampak:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Rumah di pesisir | rumah warga di pesisir |  |
| Perahu atau dermaga | perahu atau dermaga |  |
| Tambak atau kebun kelapa | tambak atau kebun |  |
| Warung atau lapak | warung atau lapak |  |
| Jalan pesisir | jalan pesisir |  |
| Tanggul atau turap | tanggul atau turap |  |
| Belum tahu | (tanpa kalimat) |  |

Alasan: Logbook: 10 persen rumah, 9 persen perahu, 4 persen jalan, 3 persen tanggul.

**5. Bagaimana gelombang atau air laut sekarang?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Masih tinggi | Saat dilaporkan, gelombang masih tinggi. | ya |
| Mulai mereda | Saat dilaporkan, gelombang mulai mereda. |  |
| Sudah tenang | Saat dilaporkan, gelombang sudah tenang. |  |

Pesan peringatan: Jangan mendekati pantai, melaut, atau berenang. Gelombang susulan bisa lebih besar daripada yang pertama.

Alasan: Logbook: 40 persen kondisi masih berlanjut, 17 persen sudah selesai.

**6. Apakah ada bahaya lanjutan?** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Potensi bahaya lanjutan:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Air masih pasang | air laut masih pasang | ya |
| Tebing pantai retak atau menggantung | tebing pantai retak atau menggantung | ya |
| Rumah dekat bibir pantai terancam roboh | rumah dekat bibir pantai terancam roboh | ya |
| Peringatan gelombang tinggi BMKG masih berlaku | peringatan gelombang tinggi BMKG masih berlaku |  |
| Tidak ada | (tanpa kalimat) |  |

Pesan peringatan: Warga di rumah dekat bibir pantai sebaiknya pindah sementara ke tempat yang lebih jauh dari garis air.

Alasan: Pantau pasang berikutnya dan struktur yang terkikis.

**7. Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Fenomena lain yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Air asin masuk sawah atau sumur | air asin masuk ke sawah atau sumur |  |
| Perahu hanyut | perahu hanyut |  |
| Pohon pantai tumbang | pohon pantai tumbang |  |
| Sampah laut terdampar | sampah laut terdampar |  |
| Garis pantai tampak berubah | garis pantai tampak berubah |  |
| Tidak ada | (tanpa kalimat) |  |

Alasan: Fenomena penyerta pesisir.


### Cuaca ekstrem (`cuaca`), 7 langkah

**1. Sebelum kejadian, apa yang Anda rasakan atau lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Sebelum kejadian,"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Udara gerah dan panas sebelumnya | udara terasa panas dan gerah |  |
| Awan berubah gelap pekat bergumpal | awan berubah dari putih menjadi gelap pekat bergumpal |  |
| Tiba-tiba dingin dan angin kencang | udara tiba-tiba dingin disertai angin kencang |  |
| Petir dan kilat sering | petir dan kilat sering terjadi |  |
| Tidak ada tanda | (tanpa kalimat) |  |

Alasan: BMKG (melalui Liputan6 dan Suara Surabaya): udara gerah sehari sebelumnya, awan putih menjadi gelap pekat (cumulonimbus), udara mendadak dingin dan angin kencang. Tanda ini tidak ada di kronologi logbook (0 sampai 2 persen).

**2. Cuaca ekstrem seperti apa yang terjadi?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Angin berputar seperti pusaran dari awan ke tanah | Angin kencang berputar seperti pusaran dari awan ke permukaan tanah, diduga puting beliung, melanda permukiman | ya |
| Angin kencang lurus dari satu arah | Angin kencang dari satu arah melanda permukiman |  |
| Hujan es | Hujan es turun di permukiman |  |
| Hujan sangat deras dengan petir | Hujan sangat deras disertai petir melanda permukiman |  |

Pesan peringatan: Pusaran angin: berlindung di bangunan kokoh, jauhi jendela, pohon, tiang, dan baliho, berjongkok melindungi kepala.

Alasan: Logbook: 84 persen angin kencang, 66 persen hujan lebat, 7 persen puting beliung, kurang dari 1 persen hujan es. Corong pusaran adalah ciri yang bisa diamati warga (BMKG, mPING: laporan berbasis pengamatan).

**3. Sudah berapa lama anginnya berlangsung?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Hanya beberapa menit | Kejadian berlangsung singkat, hanya beberapa menit. |  |
| Sekitar seperempat sampai setengah jam | Kejadian berlangsung seperempat sampai setengah jam. |  |
| Lebih dari setengah jam | Kejadian berlangsung lebih dari setengah jam. |  |
| Masih berlangsung | Saat dilaporkan, cuaca buruk masih berlangsung. | ya |

Pesan peringatan: Cuaca buruk masih berlangsung: tetap di dalam bangunan kokoh, jauhi pohon dan tiang listrik.

Alasan: BMKG: puting beliung umumnya 3 sampai 5 menit, paling lama sekitar 10 menit; yang lebih lama biasanya badai lain. Durasi membantu membedakan.

**4. Apa saja yang rusak?** (pilih banyak)

Awalan kalimat: "Angin merusak"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Atap rumah | atap rumah warga |  |
| Pohon tumbang | pohon tumbang |  |
| Tiang listrik atau baliho roboh | tiang listrik atau baliho |  |
| Dinding atau bangunan roboh | dinding atau bangunan |  |
| Kendaraan tertimpa | kendaraan yang tertimpa |  |
| Tenda atau warung | tenda atau warung |  |
| Tidak ada kerusakan | (tanpa kalimat) |  |

Alasan: Logbook: 28 persen pohon tumbang, 16 persen atap, 7 persen bangunan roboh. Jumlah rumah rusak tetap di isian angka.

**5. Apakah ada bahaya langsung di sekitar sekarang?** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Bahaya langsung di lokasi:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Kabel listrik putus menjuntai | kabel listrik putus menjuntai | ya |
| Pohon atau baliho miring hampir roboh | pohon atau baliho miring hampir roboh | ya |
| Ada orang tertimpa atau terjepit | ada orang tertimpa atau terjepit | ya |
| Tidak ada | (tanpa kalimat) |  |

Pesan peringatan: Jauhi kabel putus, jangan sentuh genangan dekatnya. Orang yang terjepit: panggil 112, jangan digeser bila tidak perlu.

Alasan: Korban sering datang dari bahaya sekunder pascaangin.

**6. Bagaimana cuaca sekarang?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Masih buruk | Saat dilaporkan, cuaca buruk masih berlangsung. | ya |
| Reda, masih mendung | Saat dilaporkan, cuaca sudah reda namun masih mendung. |  |
| Reda dan cerah | Saat dilaporkan, cuaca sudah reda dan cerah. |  |

Pesan peringatan: Cuaca masih buruk: tunda evakuasi di luar bila angin masih kencang kecuali ada ancaman langsung.

Alasan: Logbook kondisi: 23 persen masih berlanjut, 21 persen kondusif.

**7. Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Fenomena lain yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Hujan es | hujan es |  |
| Petir menyambar bangunan atau orang | petir menyambar bangunan atau orang |  |
| Genangan atau banjir setelahnya | genangan atau banjir setelahnya |  |
| Longsor kecil | longsor kecil |  |
| Listrik padam | listrik padam |  |
| Ombak tinggi di pantai | ombak tinggi di pantai |  |
| Tidak ada | (tanpa kalimat) |  |

Alasan: Fenomena penyerta (mPING dan BMKG: hujan es, petir).


### Kekeringan (`kekeringan`), 7 langkah

**1. Apa tanda pertama bahwa air mulai sulit? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Tanda awal yang dirasakan:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Hujan tidak turun lama | hujan lama tidak turun |  |
| Air sumur atau mata air mengecil | debit sumur atau mata air mengecil |  |
| Sungai, embung, atau waduk menyusut | sungai, embung, atau waduk menyusut |  |
| Tanaman layu atau tanah retak | tanaman layu dan tanah retak |  |
| Tidak tahu | (tanpa kalimat) |  |

Alasan: Logbook: 80 persen menyebut tidak hujan atau kemarau, 75 persen air bersih sulit, 17 persen mata air atau sungai, 9 persen sumur.

**2. Sejak kapan air mulai sulit?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Kurang dari 2 minggu | Kesulitan air bersih berlangsung kurang dari dua minggu. |  |
| 2 minggu sampai 1 bulan | Kesulitan air bersih berlangsung dua minggu sampai satu bulan. |  |
| 1 sampai 3 bulan | Kesulitan air bersih berlangsung satu sampai tiga bulan. |  |
| Lebih dari 3 bulan | Kesulitan air bersih berlangsung lebih dari tiga bulan. |  |

Alasan: Lama kesulitan menentukan tingkat krisis. Hanya 16 persen kronologi logbook menyebut sejak kapan.

**3. Sumber air apa yang sudah mengering?** (pilih banyak)

Awalan kalimat: "Sumber air yang mengering:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Sumur gali | sumur gali |  |
| Sumur bor atau pompa | sumur bor atau pompa |  |
| Mata air | mata air |  |
| Sungai, embung, atau waduk | sungai, embung, atau waduk |  |
| Air PDAM atau pipa | air PDAM atau perpipaan |  |
| Belum ada yang mengering | (tanpa kalimat) |  |

Alasan: Membedakan sumber dangkal dan dalam menunjukkan skala krisis.

**4. Bagaimana warga mendapat air sekarang?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Antre di sumber yang tersisa | Warga mengantre di sumber air yang tersisa. |  |
| Membeli air galon atau tangki | Warga membeli air untuk kebutuhan sehari-hari. |  |
| Mengambil dari tempat jauh | Warga mengambil air dari tempat yang jauh. |  |
| Sudah ada kiriman air | Sudah ada distribusi air bersih untuk warga. |  |
| Memakai air sungai atau genangan keruh | Sebagian warga memakai air keruh yang tidak layak minum. | ya |

Pesan peringatan: Air keruh atau tercemar bisa menyebabkan diare. Rebus hingga mendidih atau gunakan tablet klorin.

Alasan: Jarak, biaya, dan kualitas air adalah indikator WASH di MIRA.

**5. Apa dampak yang terlihat?** (pilih banyak)

Awalan kalimat: "Dampak yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Tanaman mati atau gagal panen | tanaman mati atau gagal panen |  |
| Ternak kekurangan air | ternak kekurangan air |  |
| Warga diare atau sakit kulit | warga diare atau sakit kulit |  |
| Sekolah atau tempat ibadah kekurangan air | sekolah atau tempat ibadah kekurangan air |  |
| Tidak ada dampak yang terlihat | (tanpa kalimat) |  |

Alasan: Logbook: gagal panen 1 persen, kesehatan hampir tidak tercatat.

**6. Apakah ada bahaya lanjutan?** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Potensi bahaya lanjutan:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Kemarau masih panjang | kemarau diperkirakan masih panjang |  |
| Lahan sangat kering, mudah terbakar | lahan sangat kering dan mudah terbakar | ya |
| Harga air makin naik | harga air makin naik |  |
| Tidak ada | (tanpa kalimat) |  |

Pesan peringatan: Lahan kering mudah terbakar: jangan membakar sampah atau lahan, laporkan asap pertama ke 112 atau Manggala Agni.

Alasan: Kekeringan berlanjut ke karhutla dan krisis pangan.

**7. Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Fenomena lain yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Tanah retak-retak | tanah retak-retak |  |
| Sungai kering total | sungai kering total |  |
| Kabut asap | kabut asap |  |
| Warga mengungsi sementara untuk mencari air | warga berpindah sementara untuk mencari air |  |
| Tidak ada | (tanpa kalimat) |  |

Alasan: Fenomena penyerta kemarau panjang.


### Kebakaran hutan dan lahan (`karhutla`), 7 langkah

**1. Apa yang terbakar?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Hutan | Terjadi kebakaran hutan |  |
| Kebun atau ladang | Terjadi kebakaran di kebun atau ladang |  |
| Semak atau padang rumput | Terjadi kebakaran semak belukar atau padang rumput |  |
| Lahan gambut (tanah hitam berserat) | Terjadi kebakaran di lahan gambut |  |
| Lahan kosong atau pekarangan | Terjadi kebakaran di lahan kosong atau pekarangan |  |
| Tidak tahu | Terjadi kebakaran lahan |  |

Alasan: Logbook: hutan 45 persen, semak 5 persen, kebun 4 persen, gambut hanya 1 persen padahal paling sulit dipadamkan (Mongabay: api gambut menjalar di bawah permukaan, padam 10 hari kemudian).

**2. Bagaimana Anda pertama tahu ada api?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Melihat asap membumbung | Api diketahui pertama kali dari asap yang membumbung. |  |
| Melihat api menyala | Api diketahui pertama kali dari nyala api. |  |
| Mencium bau terbakar | Api diketahui pertama kali dari bau terbakar. |  |
| Asap keluar dari tanah, tanpa api | Api diketahui pertama kali dari asap yang keluar dari tanah tanpa nyala api. |  |
| Diberi tahu warga lain | Api diketahui pertama kali dari laporan warga. |  |

Alasan: Asap tanpa nyala adalah ciri api bawah tanah di gambut (Mongabay, Good News from Indonesia). Logbook: hanya 3 persen menyebut asap, 6 persen hotspot.

**3. Apa dugaan penyebabnya?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Pembukaan lahan dengan membakar | Kebakaran diduga berasal dari pembukaan lahan dengan cara membakar. |  |
| Membakar sampah atau semak yang menjalar | Kebakaran diduga berasal dari pembakaran sampah atau semak yang menjalar. |  |
| Puntung rokok, api unggun, atau sisa memasak | Kebakaran diduga berasal dari puntung rokok, api unggun, atau sisa memasak. |  |
| Petir | Kebakaran diduga akibat sambaran petir. |  |
| Cuaca sangat kering saja | Kebakaran terjadi saat cuaca sangat kering. |  |
| Tidak tahu | Penyebab kebakaran belum diketahui. |  |

Alasan: Logbook: 10 persen menyebut pembakaran atau pembukaan lahan, 8 persen cuaca kering. Dugaan, bukan tuduhan; staf menyunting.

**4. Bagaimana apinya sekarang?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Menjalar cepat di permukaan, tertiup angin | Saat dilaporkan, api menjalar cepat di permukaan tertiup angin. | ya |
| Asap tebal, tanpa nyala (di bawah tanah) | Saat dilaporkan, api membara di bawah tanah dengan asap tebal tanpa nyala. | ya |
| Api kecil di beberapa titik | Saat dilaporkan, api terlihat kecil di beberapa titik. |  |
| Padam, masih berasap atau berbara | Saat dilaporkan, api sudah padam namun masih berasap atau berbara. |  |
| Sudah padam | Saat dilaporkan, api sudah padam. |  |

Pesan peringatan: Jangan memadamkan api besar sendirian. Telepon 112 atau Manggala Agni, jauhi arah angin dan lahan gambut yang berasap (tanah bisa ambles).

Alasan: Logbook kondisi: 55 persen padam atau selesai, 25 persen masih berlanjut; 'masih berasap atau berbara' 8 persen. Gambut berbara berisiko menyala lagi.

**5. Ke arah mana api mengancam?** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Api mengancam"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Permukiman atau rumah | permukiman atau rumah | ya |
| Kebun atau lahan warga | kebun atau lahan warga |  |
| Jalan | jalan |  |
| Fasilitas berbahaya (SPBU, gudang, tabung gas) | fasilitas berbahaya seperti SPBU atau gudang | ya |
| Tidak mengancam apa pun | (tanpa kalimat) |  |

Pesan peringatan: Jika api mendekati rumah atau fasilitas berbahaya: evakuasi warga lebih dulu, hubungi damkar atau 112.

Alasan: Logbook: api dekat permukiman 2 sampai 3 persen, tetapi inilah yang memicu evakuasi. Mirip pelaporan ICS 201: exposures.

**6. Bagaimana asapnya?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Tidak ada asap | Tidak terlihat asap. |  |
| Tipis, berbau | Asap yang timbul tipis. |  |
| Tebal, jarak pandang pendek, mata perih | Asap tebal, jarak pandang pendek, dan mata terasa perih. |  |
| Tebal, warga sesak napas | Asap tebal mengganggu pernapasan warga. | ya |

Pesan peringatan: Pakai masker N95 atau kain basah, tetap di dalam ruangan. Balita, lansia, dan penderita asma sebaiknya ke tempat berudara bersih; bila sesak, segera ke fasilitas kesehatan.

Alasan: Logbook: asap 3 persen; ISPA 0 persen. Dampak kesehatan perlu ditangkap karena menentukan masker dan posko kesehatan.

**7. Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Fenomena lain yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Api muncul lagi setelah padam | api muncul kembali setelah dipadamkan |  |
| Sekolah diliburkan | sekolah diliburkan |  |
| Jalan tertutup asap | jalan tertutup asap |  |
| Hewan liar keluar ke permukiman | hewan liar keluar ke permukiman |  |
| Abu beterbangan | abu beterbangan |  |
| Tidak ada | (tanpa kalimat) |  |

Alasan: Api muncul lagi 0 persen tercatat padahal umum di gambut; satwa dari liputan Manggala Agni Riau.


### Gempa bumi (`gempa`), 7 langkah

**1. Apa yang pertama Anda rasakan?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Getaran halus lalu membesar | Warga merasakan getaran yang awalnya halus lalu membesar. |  |
| Hentakan keras mendadak | Warga merasakan hentakan keras mendadak. |  |
| Goyangan bergelombang pelan dan lama | Warga merasakan goyangan bergelombang pelan dan lama. |  |
| Bunyi gemuruh sebelum terasa | Warga mendengar bunyi gemuruh sebelum guncangan terasa. |  |

Alasan: USGS DYFI memulai dari persepsi gerak dan jenis guncangan. Logbook gempa 42 persen hanya salin skala dari BMKG, tanpa pengamatan warga.

**2. Seberapa lama guncangan terasa?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Sebentar, hitungan detik | Guncangan berlangsung singkat, hanya hitungan detik. |  |
| Cukup lama, sekitar setengah menit | Guncangan berlangsung cukup lama, sekitar setengah menit. | ya |
| Sangat lama, lebih dari setengah menit | Guncangan berlangsung sangat lama, lebih dari setengah menit. | ya |
| Tidak tahu | (tanpa kalimat) |  |

Pesan peringatan: Jika Anda di dekat pantai dan guncangan lama: segera naik ke tempat tinggi atau gedung kokoh, jauh dari pantai, tanpa menunggu sirene. Tetap di sana sampai BMKG menyatakan aman.

Alasan: BMKG (Jakarta Post 2019, ESKP): guncangan lama, bukan hanya kuat, adalah tanda alami tsunami; jangan menunggu peringatan resmi. DYFI juga menanyakan lama guncangan.

**3. Apa yang dilakukan warga sekitar?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Tidak ada yang keluar rumah | Sebagian besar warga tetap berada di dalam rumah. |  |
| Sebagian keluar rumah | Sebagian warga keluar rumah. |  |
| Hampir semua lari keluar, panik | Hampir semua warga berlari keluar rumah dalam keadaan panik. |  |
| Sulit berdiri atau berjalan | Guncangan membuat warga sulit berdiri atau berjalan. |  |

Alasan: DYFI: reaksi dan perilaku responden. Logbook: panik atau keluar rumah 19 persen. Skala SIG dan kerusakan ditanya terpisah di isian intensitas.

**4. Sesudah guncangan, apa yang terjadi di sekitar? Boleh pilih lebih dari satu.** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Sesudah gempa terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Air laut surut atau naik tidak biasa | air laut surut atau naik tidak biasa | ya |
| Tanah retak, ambles, atau keluar lumpur dan pasir | tanah retak, ambles, atau mengeluarkan lumpur dan pasir | ya |
| Longsor di lereng | longsor di lereng |  |
| Bau gas atau ada api | bau gas atau api | ya |
| Listrik padam atau kabel putus | listrik padam atau kabel putus |  |
| Ada orang terjebak di reruntuhan | ada orang terjebak di reruntuhan | ya |
| Tidak ada yang terlihat | (tanpa kalimat) |  |

Pesan peringatan: Air laut tidak biasa: ke tempat tinggi sekarang. Bau gas atau api: jauhi bangunan, jangan menyalakan api atau listrik. Orang terjebak: 112 atau Basarnas 115.

Alasan: Bahaya ikutan gempa: tsunami, likuifaksi, longsor, kebakaran, korban terjebak. Logbook hampir tidak mencatat: longsor tidak muncul, korban 2 persen.

**5. Bagaimana gempa susulan?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Belum terasa | Belum terasa gempa susulan. |  |
| Terasa satu dua kali, kecil | Terasa gempa susulan satu dua kali dengan getaran kecil. |  |
| Terasa berkali-kali | Warga masih merasakan gempa susulan berkali-kali. |  |
| Ada yang lebih kuat dari yang pertama | Terasa gempa susulan yang lebih kuat dari gempa pertama. | ya |

Pesan peringatan: Gempa susulan bisa lebih kuat. Tetap di tempat terbuka, jauh dari bangunan retak.

Alasan: Logbook: 35 persen menyebut susulan, 34 persen kondisi potensi susulan.

**6. Di mana warga sekarang?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Di rumah masing-masing | Warga berada di rumah masing-masing. |  |
| Berkumpul di lapangan terbuka | Warga berkumpul di lapangan terbuka. |  |
| Sudah mengungsi ke tempat tinggi atau tenda | Warga sudah mengungsi ke tempat tinggi atau tenda. |  |
| Takut kembali ke rumah | Warga takut kembali ke rumah. |  |

Alasan: Perilaku pascagempa (DYFI). Jumlah pengungsi tetap di isian angka.

**7. Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Fenomena lain yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Hewan gelisah | hewan gelisah |  |
| Air sumur keruh atau berubah | air sumur keruh atau berubah |  |
| Bangunan tinggi bergoyang | bangunan tinggi bergoyang |  |
| Suara dentuman | suara dentuman |  |
| Tidak ada | (tanpa kalimat) |  |

Alasan: Fenomena penyerta.


### Tsunami (`tsunami`), 7 langkah

**1. Apa tanda pertama yang Anda lihat atau rasakan?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Gempa kuat dan lama | Setelah gempa kuat dan lama terasa, air laut naik ke daratan | ya |
| Air laut surut tiba-tiba | Air laut surut tiba-tiba, lalu gelombang besar datang | ya |
| Gemuruh keras dari laut | Terdengar gemuruh keras dari laut, lalu gelombang besar datang | ya |
| Sirene peringatan berbunyi | Sirene peringatan berbunyi, lalu gelombang datang ke daratan | ya |
| Tidak ada tanda, gelombang langsung datang | Gelombang besar datang dari laut tanpa tanda yang terlihat | ya |

Pesan peringatan: Segera naik ke tempat tinggi atau gedung kokoh jauh dari pantai, jangan menonton laut, dan tetap di sana sampai BMKG menyatakan aman. Hubungi 112.

Alasan: BMKG, Jakarta Post 2019, ESKP: gempa kuat dan lama, air laut surut tiba-tiba, dan gemuruh laut adalah tanda alami; jangan menunggu peringatan. Logbook: hanya 8 kejadian menyebut tsunami, jadi tidak ada angka dasar.

**2. Seperti apa air datang?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Naik pelan seperti pasang cepat | Air naik seperti pasang yang sangat cepat. |  |
| Seperti dinding air | Air datang seperti dinding air. |  |
| Datang berkali-kali | Gelombang datang berulang kali. |  |
| Datang dengan suara gemuruh | Air datang disertai suara gemuruh. |  |

Pesan peringatan: Gelombang pertama bukan yang terakhir. Jangan turun sebelum ada pernyataan aman resmi.

Alasan: Bentuk gelombang membantu membedakan tsunami dan gelombang pasang. BMKG: gelombang berulang, yang kemudian bisa lebih besar.

**3. Sampai mana air masuk?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Hanya sampai pantai | Air mencapai bibir pantai. |  |
| Masuk ke permukiman dekat pantai | Air masuk ke permukiman dekat pantai. |  |
| Jauh ke darat melewati permukiman | Air masuk jauh ke daratan melewati permukiman. |  |
| Menyusuri sungai ke hulu | Air menyusuri sungai ke arah hulu. |  |

Alasan: Jangkauan rayapan (run-up) per observasi; tinggi air ditanya terpisah.

**4. Apa yang terseret atau terdampar?** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Air membawa serta"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Perahu atau kapal ke darat | perahu atau kapal terdampar ke darat |  |
| Rumah hanyut atau roboh | rumah hanyut atau roboh |  |
| Kendaraan terseret | kendaraan terseret |  |
| Puing dan pohon menumpuk | puing dan pohon menumpuk |  |
| Warga hanyut atau hilang | warga hanyut atau hilang | ya |
| Tidak ada | (tanpa kalimat) |  |

Pesan peringatan: Warga hilang: laporkan perkiraan lokasi terakhir ke 112 atau Basarnas 115, jangan masuk air yang masih surut-pasang.

Alasan: Dampak fisik yang bisa diamati, mendahului angka korban.

**5. Bagaimana warga?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Sudah di tempat tinggi | Warga sudah menyelamatkan diri ke tempat tinggi. |  |
| Sedang bergerak naik | Warga sedang bergerak ke tempat tinggi. |  |
| Sebagian belum mengungsi | Sebagian warga belum mengungsi. | ya |
| Jalur evakuasi macet atau tertutup | Jalur evakuasi macet atau tertutup. | ya |

Pesan peringatan: Bila jalur macet, naik ke gedung kokoh bertingkat atau perbukitan terdekat dengan berjalan kaki.

Alasan: Evakuasi vertikal dan jalur adalah inti kesiapsiagaan tsunami.

**6. Bagaimana laut sekarang?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Masih bergejolak, gelombang berulang | Saat dilaporkan, laut masih bergejolak dan gelombang berulang. | ya |
| Air surut lagi | Saat dilaporkan, air laut kembali surut. | ya |
| Tenang, belum ada pernyataan resmi | Saat dilaporkan, laut tampak tenang namun belum ada pernyataan resmi bahwa kondisi aman. |  |
| Tidak tahu | Kondisi laut saat dilaporkan belum diketahui. |  |

Pesan peringatan: Tetap di tempat tinggi sampai BMKG menyatakan aman. Gelombang susulan bisa lebih besar.

Alasan: BMKG: peringatan jangan dicabut selama osilasi muka laut berlanjut; di Palu 2018 tsunami datang setelah peringatan dicabut.

**7. Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Fenomena lain yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Gempa susulan | gempa susulan |  |
| Kebakaran | kebakaran |  |
| Listrik padam, jalan terputus | listrik padam dan jalan terputus |  |
| Ikan atau biota terdampar | ikan atau biota laut terdampar |  |
| Sirene tidak berbunyi | sirene tidak berbunyi |  |
| Tidak ada | (tanpa kalimat) |  |

Alasan: Fenomena penyerta; sirene tidak berbunyi informasi kesiapsiagaan.


### Erupsi gunung api (`erupsi`), 8 langkah

**1. Sebelum erupsi, apa yang terlihat atau terasa? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Sebelum erupsi,"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Getaran atau gempa terasa | terasa getaran atau gempa dari arah gunung |  |
| Suara gemuruh atau dentuman | terdengar suara gemuruh atau dentuman |  |
| Bau belerang | tercium bau belerang |  |
| Air sumber berubah hangat atau keruh | air sumber berubah hangat atau keruh |  |
| Hewan hutan turun ke permukiman | hewan hutan turun ke permukiman |  |
| Tidak ada tanda | (tanpa kalimat) |  |

Alasan: Gempa vulkanik adalah tanda paling umum, gas dan mata air hangat menyusul (PVMBG melalui Katadata dan Antara). Hewan turun adalah kearifan lokal yang belum terverifikasi sumber resmi; dicatat sebagai pengamatan, bukan fakta.

**2. Apa yang keluar dari gunung?** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Erupsi disertai"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Kolom asap atau abu menjulang | kolom asap atau abu menjulang |  |
| Hujan abu | hujan abu |  |
| Lontaran batu pijar atau kerikil | lontaran batu pijar atau kerikil |  |
| Awan panas atau guguran | awan panas atau guguran | ya |
| Lahar atau lumpur di sungai | aliran lahar di sungai | ya |
| Lava pijar mengalir | aliran lava pijar |  |

Pesan peringatan: Awan panas atau lahar: tinggalkan radius dan bantaran sungai sekarang, ikuti arahan PVMBG dan BPBD, jangan menonton dari dekat.

Alasan: Logbook (gunungapi): 89 persen tinggi kolom, 84 persen hujan abu, 8 persen lahar, 2 persen awan panas. Warga bisa membedakan kolom, hujan abu, batu, awan panas, lahar.

**3. Seperti apa langit dan udara di lokasi Anda?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Normal | Langit di lokasi tampak normal. |  |
| Mendung keabuan | Langit di lokasi mendung keabuan karena abu. |  |
| Gelap seperti malam di siang hari | Langit di lokasi gelap seperti malam di siang hari. |  |
| Jarak pandang pendek, napas sesak | Jarak pandang pendek dan warga sesak napas. | ya |

Pesan peringatan: Pakai masker N95 atau kain basah, kacamata, tetap di dalam ruangan bila abu tebal, bersihkan atap perlahan agar tidak runtuh.

Alasan: Ketebalan abu sudah di isian; di sini kondisi udara dan visibilitas.

**4. Bagaimana sungai yang berhulu di gunung?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Normal | Aliran sungai yang berhulu di gunung tampak normal. |  |
| Debit naik dan keruh | Debit sungai yang berhulu di gunung naik dan keruh. |  |
| Mengalir lumpur pekat membawa batu | Sungai mengalirkan lumpur pekat membawa batu. | ya |
| Tiba-tiba kering | Sungai tiba-tiba kering. | ya |

Pesan peringatan: Jauhi aliran dan bantaran sungai; lahar bisa datang meski hujan hanya di puncak.

Alasan: Lahar hujan dan bendung alami adalah ancaman utama setelah erupsi (PVMBG).

**5. Bagaimana warga di sekitar?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Beraktivitas seperti biasa | Warga masih beraktivitas seperti biasa. |  |
| Sebagian sudah mengungsi | Sebagian warga sudah mengungsi. |  |
| Semua sudah mengungsi | Seluruh warga di zona rawan sudah mengungsi. |  |
| Masih ada warga di radius berbahaya | Masih ada warga di dalam radius berbahaya. | ya |

Pesan peringatan: Warga di radius berbahaya harus dievakuasi ke luar radius yang ditetapkan PVMBG dan BPBD.

Alasan: Logbook: pengungsian disebut 4 persen. Radius dan status level (waspada, siaga, awas) tertulis di logbook 80 persen, sehingga ditanyakan pengamatan warganya, bukan status resminya.

**6. Bagaimana gunung sekarang?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Masih terus erupsi atau bergemuruh | Saat dilaporkan, gunung masih terus erupsi atau bergemuruh. | ya |
| Berhenti, masih berasap | Saat dilaporkan, erupsi berhenti dan gunung masih berasap. |  |
| Tampak tenang | Saat dilaporkan, gunung tampak tenang. |  |
| Tidak tahu | Kondisi gunung saat dilaporkan belum diketahui. |  |

Pesan peringatan: Erupsi bisa berulang tanpa banyak jeda; tetap di luar radius yang ditetapkan.

Alasan: Logbook kondisi: 34 persen masih berlanjut, 18 persen waspada susulan. PVMBG: jeda antara tanda seismik dan erupsi bisa hanya hitungan jam (Lewotobi).

**7. Apa dampak yang dialami warga? Boleh pilih lebih dari satu.** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Dampak yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Mata perih, batuk | warga mengalami mata perih dan batuk |  |
| Atap tertimbun abu | atap tertimbun abu | ya |
| Tanaman dan ternak tertutup abu | tanaman dan ternak tertutup abu |  |
| Sekolah atau kegiatan diliburkan | sekolah atau kegiatan diliburkan |  |
| Bandara atau jalan ditutup | bandara atau jalan ditutup |  |
| Tidak ada | (tanpa kalimat) |  |

Pesan peringatan: Abu basah berat dan bisa meruntuhkan atap. Bersihkan atap perlahan dengan pelindung napas, jangan menyapu saat abu masih turun.

Alasan: Dampak yang tidak tertangkap oleh isian angka.

**8. Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Fenomena lain yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Gempa terasa lagi | gempa terasa lagi |  |
| Hujan kerikil | hujan kerikil |  |
| Sirene atau kentongan berbunyi | sirene atau kentongan berbunyi |  |
| Listrik padam | listrik padam |  |
| Air sumur keruh | air sumur keruh |  |
| Tidak ada | (tanpa kalimat) |  |

Alasan: Fenomena penyerta.


### Kebakaran gedung dan permukiman (`kebakaran_gedung`), 7 langkah

**1. Bagaimana Anda pertama tahu ada kebakaran?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Melihat asap | Kebakaran diketahui pertama kali dari asap yang membumbung. |  |
| Melihat api | Kebakaran diketahui pertama kali dari nyala api. |  |
| Mendengar ledakan atau letupan | Kebakaran diketahui pertama kali dari suara ledakan atau letupan. |  |
| Mencium bau gosong atau gas | Kebakaran diketahui pertama kali dari bau gosong atau gas. |  |
| Teriakan warga | Kebakaran diketahui pertama kali dari teriakan warga. |  |

Alasan: Tanda awal sebelum penyebab; logbook hanya 4 persen menyebut ledakan.

**2. Apa dugaan penyebabnya?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Korsleting listrik | Kebakaran diduga akibat korsleting listrik |  |
| Kompor atau tabung gas | Kebakaran diduga berasal dari kompor atau tabung gas |  |
| Lilin, rokok, obat nyamuk, atau dupa | Kebakaran diduga berasal dari lilin, rokok, obat nyamuk, atau dupa |  |
| Membakar sampah yang menjalar | Kebakaran diduga berasal dari pembakaran sampah yang menjalar |  |
| Kendaraan atau pengisian bahan bakar | Kebakaran diduga berasal dari kendaraan atau pengisian bahan bakar |  |
| Tidak tahu | Kebakaran terjadi dengan penyebab yang belum diketahui |  |

Alasan: Logbook: 42 persen korsleting, 25 persen penyebab belum diketahui atau dalam penyelidikan, 12 persen kompor atau gas, 4 persen lilin atau rokok.

**3. Bangunan apa yang terbakar?**

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Rumah tinggal | dan menghanguskan rumah tinggal. |  |
| Toko, kios, atau pasar | dan menghanguskan toko, kios, atau pasar. |  |
| Pabrik, gudang, atau bengkel | dan menghanguskan pabrik, gudang, atau bengkel. |  |
| Kantor, sekolah, atau asrama | dan menghanguskan kantor, sekolah, atau asrama. |  |
| Banyak jenis bangunan sekaligus | dan menghanguskan beberapa jenis bangunan sekaligus. |  |

Alasan: Logbook: rumah 32 persen, toko atau kios 6 persen, pabrik atau gudang 3 persen, kantor atau sekolah 2 persen. Jumlah unit di isian angka.

**4. Bagaimana api menyebar?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Terbatas di satu bangunan | Api terbatas di satu bangunan. |  |
| Merambat ke bangunan sebelah | Api merambat ke bangunan di sebelahnya. | ya |
| Menjalar cepat karena angin | Api menjalar cepat karena tertiup angin. | ya |
| Sulit dijangkau karena gang sempit | Api sulit dijangkau karena akses gang sempit. |  |

Pesan peringatan: Warga di bangunan sebelah dan sekitar agar segera keluar membawa dokumen penting, jauhi arah angin, beri jalan untuk damkar.

Alasan: Logbook: api membesar atau menjalar karena angin 8 persen, akses sempit 1 persen. Perambatan di permukiman padat adalah penentu skala.

**5. Apakah ada bahaya langsung di sana? Boleh pilih lebih dari satu.** (pilih banyak; PERINGATAN KESELAMATAN)

Awalan kalimat: "Bahaya langsung yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Tabung gas atau bahan mudah meledak | ada tabung gas atau bahan mudah meledak di dalam | ya |
| Asap hitam tebal | asap hitam tebal |  |
| Orang masih terjebak di dalam | ada orang masih terjebak di dalam | ya |
| Kabel listrik atau trafo menyala | kabel listrik atau trafo menyala | ya |
| Bangunan mulai runtuh | bangunan mulai runtuh | ya |
| Tidak ada | (tanpa kalimat) |  |

Pesan peringatan: Jangan masuk menyelamatkan barang. Orang terjebak: telepon 112 atau damkar 113, sebut lantai dan sisi bangunan. Jauhi bangunan yang bergemeretak atau miring.

Alasan: FEMA ICS 201: hazards. Penghuni terjebak dan benda meledak menentukan prioritas.

**6. Bagaimana apinya sekarang?** (PERINGATAN KESELAMATAN)

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Masih membesar | Saat dilaporkan, api masih membesar. | ya |
| Masih menyala, mulai terkendali | Saat dilaporkan, api masih menyala namun mulai terkendali. |  |
| Padam, masih berasap | Saat dilaporkan, api sudah padam namun masih berasap. |  |
| Padam total | Saat dilaporkan, api sudah padam. |  |

Pesan peringatan: Api masih membesar: menjauh minimal satu blok dan jangan menghalangi jalan damkar.

Alasan: Logbook kondisi: 81 persen padam atau selesai, 10 persen masih berlanjut.

**7. Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.** (pilih banyak)

Awalan kalimat: "Fenomena lain yang terlihat:"

| Pilihan | Frasa kalimat | Pemicu peringatan |
|---|---|---|
| Ledakan susulan | terdengar ledakan susulan |  |
| Air untuk memadamkan kurang | air untuk memadamkan kurang |  |
| Hidran tidak berfungsi | hidran tidak berfungsi |  |
| Listrik dipadamkan | listrik dipadamkan |  |
| Warga membantu memadamkan dengan ember | warga membantu memadamkan dengan ember |  |
| Tidak ada | (tanpa kalimat) |  |

Alasan: Logbook: kendala sumber air 1 persen; di permukiman padat sering menentukan.

## 6. Catatan penerapan dan pertanyaan terbuka

Kunci ke implementasi (bukan perubahan kode di sini):
1. Dukung `awalan`, elemen ketiga `opsi`, dan `bahaya` di `langkahKronologi` dan layar `/lapor`; hentikan `LAMA` dan `FENOMENA` otomatis.
2. Pesan `bahaya` memakai kalimat netral dan tidak pernah menyatakan "aman" atau "tidak apa-apa"; chatbot tidak memberi diagnosis (konsisten dengan KEPUTUSAN: laporan warga bukan kejadian resmi).
3. Opsi yang menandai bahaya jiwa juga bisa menaikkan prioritas tiket di meja monitoring (usul, belum diputuskan).
4. Pilihan "Tidak tahu" harus selalu ada pada pertanyaan yang jawabannya bisa tidak terlihat warga.
5. Uji: tiap jenis, rangkai satu jalur dengan `rangkaiKronologi`, pastikan kalimat tidak ganda titik dan huruf besar kecil benar (rangkaian contoh sudah diuji dengan fungsi itu di sesi riset).

Pertanyaan terbuka untuk pemilik (bawaan sementara: tayang tanpa nomor telepon, hanya "hubungi petugas atau pemadam setempat" dan 112):
- Q-A: boleh teks peringatan menyebut Basarnas 115 dan damkar 113, atau cukup 112?
- Q-B: peringatan keselamatan di chatbot dan teks dari PVMBG, BMKG, dan BNPB perlu ditinjau pakar sebelum tayang; siapa yang menyetujui.
- Q-C: panjang jalur 7 sampai 8 langkah diterima, atau dipangkas menjadi inti 5 langkah untuk warga yang pelapor sekali lewat (langkah bertanda "pilih banyak" paling lama dijawab).
- Q-D: apakah pengamatan hewan turun gunung (erupsi) dipertahankan sebagai opsi walau belum ada sumber resmi.

Batas riset: pencarian web sesi ini US-only dan banyak hasil media; tidak ada dokumen resmi BNPB (Perka, Juklak pengkajian cepat), InaRISK, atau SOP Damkar yang berhasil dibuka. Rancangan ini mengisi celah dari logbook dan sumber media; verifikasi primer perlu sebelum jadi aturan.
