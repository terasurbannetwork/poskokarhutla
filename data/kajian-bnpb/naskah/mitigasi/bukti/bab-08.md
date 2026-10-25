# Berkas bukti BAB 8 BENCANA NONALAM

Kajian: Grand Design Mitigasi Bencana Indonesia 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9; Buku Pegangan L56–L64). Penulis bab menulis
hanya dari berkas ini dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/mitigasi/bukti/bab-08.angka.json`: 49 kunci angka baru (35 bentuk berkas + jalur, diperiksa skrip; 14 bentuk
  nilai + pustaka), belum digabung ke `data/angka.json`.
- `naskah/mitigasi/bukti/bab-08.pustaka.json`: 52 entri CSL-JSON.

Revisi 24 Oktober 2026 sesuai temuan pemeriksa (delapan temuan); hasil dan alasannya di bagian "Catatan revisi" di akhir
berkas.

Bahan yang dibaca: `KERANGKA.md` §2 (prinsip 3, 5, 6, 9, 12, 14, 17), §5 (Bab 8), §6, §7 (celah 14, 27, 28), §8;
`KEPUTUSAN.md` (P6, P11); Buku Pegangan L56–L64; `PEDOMAN-DESAIN.md` §A6, §B5.11 varian (b), §C9, tabel kode G1–G25;
`riset/A-dokumen-bnpb.md` §5, `riset/E-dokumen-primer.md` §E12; paket `data/nonalam-sosial/` (README, `regulasi.csv`,
`covid19_nasional.csv`, `covid19_provinsi.csv`, `krb_nonalam_nasional.csv`, `krb_covid19_wilayah.csv`, `peristiwa.csv`,
`skenario_terburuk.csv`, `indikator.csv`, `dibi_nonalam_sosial_rekap.csv`), paket `data/lembaga/` (`celah.csv` C09 dan
C14, `peran.csv` R110–R122, `matriks_bencana.csv`, `lembaga.csv`, teks mentah UU 18/2008, UU 24/2007), teks lengkap UU
17/2023 (salinan peraturan.go.id, 300 hlm, batang tubuh dan Penjelasan),
paket `data/program-terbukti/` (README §4 dan §5, `kompendium_program.csv`, `renas_aksi_terkait.csv`), `data/angka.json`;
korpus `data/raw/hukum/teks/` (Perban 1/2025 Renas PB, Perban 5/2025 Renstra, Perpres 17/2018, Perpres 46/2026, Perka
12/2014, indeks Perka 5/2008); sumber web yang dibuka 24 Oktober 2026 (disebut per butir).

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah RI; dokumen, tabel, atau rilis dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka (WHO, ICG, jurnal bertinjauan) |
| estimasi-model | Keluaran model yang belum diuji balik terhadap data Indonesia (di bab ini: kematian berlebih WHO) |
| asumsi-kebijakan | Pilihan penyusun (aturan analog, lingkup kartu) |
| sekunder | Berita atau kutipan pihak lain; dokumen primer tidak terbuka. **Tidak masuk badan teks sebagai angka utama**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**. Rujukan
"registri `kunci`" berarti kunci di `data/angka.json`; "kunci baru `kunci`" berarti kunci di `bab-08.angka.json`.

---

## Kerangka bab (dari KERANGKA.md §5, BAB 8)

- **Judul:** BAB 8 BENCANA NONALAM (9 hlm).
- **Subbab:** 8.1 Epidemi dan Pandemi; 8.2 Kebakaran Industri dan Kegagalan Teknologi; 8.3 Kebakaran Tempat Pemrosesan
  Akhir Sampah; 8.4 Kesenjangan Spesifik dan Implikasi.
- **Tujuan bab:** mengkuantifikasi analog terburuk tiap jenis nonalam dan menyatakan rezim penanggung jawabnya.
- **Pertanyaan kunci:**
  1. Siapa menetapkan status epidemi menurut UU 17/2023, dan kapan status darurat bencana berlaku?
  2. Berapa korban, luas, dan kerugian pada analog terburuk tiap jenis?
  3. Rezim keselamatan sektoral apa yang mengatur kebakaran industri, dan di mana peran BNPB?
  4. Mengapa kebakaran TPA berulang pada musim kemarau, dan instrumen apa yang menjadi lini pertama?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| COVID-19 6.811.945 kasus dan 161.870 meninggal (resmi); kematian berlebih 2020–2021 806.815–1.343.849 (estimasi model, rentang); status bencana nasional 1.165 hari; DTP3 85% ke 67%; JEE 2023 | Dikonfirmasi. **Ditambah:** kematian terlapor 2020–2021 = 144.094, sehingga rentang model 5,6–9,3 kali angka tercatat (P2); minggu puncak 12.444; per provinsi per 30 Sep 2022 (DIY 161,4 per 100.000) |
| Dua rezim status: KLB dan wabah (UU 17/2023) dan darurat bencana (UU 24/2007; Perpres 17/2018); norma pengait belum ada (C09) | **Dikoreksi sebagian.** Teks lengkap UU 17/2023 memuat pengait skala nasional: Pasal 369 (Menteri mengusulkan penetapan Wabah sebagai bencana nasional nonalam kepada Presiden) dan Pasal 370 (Presiden menetapkannya). Pengait untuk KLB dan status darurat bencana provinsi atau kab/kota tidak ditemukan. **Ditambah:** UU 17/2023 Pasal 454 mencabut UU 4/1984 dan UU 6/2018; Permenkes 1/2026 (teks rancangan) menambah status ketiga, Krisis Kesehatan, ditetapkan kepala dinas kesehatan atau Menteri, dan menyatakan klaster kesehatan bagian integral klaster bencana, tetapi tidak mengaitkan status; preseden COVID-19 dua status berselang 13 hari (P1) |
| Gagal teknologi: KRB 186.940 ha, 713.784 jiwa, Rp584.288 juta; Plumpang 17 (hari ke-2), 29 (sekunder), 1.085 pengungsi; Balongan 912–932; Morowali 19–20 (sekunder) | Dikonfirmasi dengan koreksi: angka 17 adalah per 5 Mar 2023, bukan "hari ke-2"; angka 29 kini resmi (portal Pemprov DKI, 18 Mar 2023) dan menjadi lantai kartu; 33 per 24 Mar 2023 sekunder. Morowali tetap sekunder (ANTARA mengutip Polda Sulteng 20; Kemnaker via Investortrust 19). **Koreksi lantai:** kejadian gagal teknologi tercatat terberat di DIBI adalah ambruknya musala Ponpes Al Khoziny 2025 (63 meninggal), dan Renas PB memasukkan kecelakaan konstruksi ke kegagalan teknologi; kartu harus memilih lingkup (P2 Inferensi) |
| Rezim sektoral dibuka sebelum naskah; C14 ditulis sesuai hasil; Kemenperin dan Kemnaker masuk bila mandat tertulisnya ada; Perka 5/2008 dan Perka 12/2014 | Dibuka (riset E §E12). Mandat tertulis: Menteri ESDM (migas, termasuk depo penyimpanan dan niaga), Menteri Perindustrian, Menteri Ketenagakerjaan; BNPB tidak disebut. **Ditambah:** UU 24/2007 Pasal 40 ayat (3) dan Penjelasan, Pasal 41, Pasal 75–76 (analisis risiko pembangunan berisiko tinggi); PP 22/2021 Pasal 433 ayat (2) (kedaruratan B3 bagian program PB provinsi). Perka 5/2008 tidak dapat dibaca (dokumen belum tersedia di JDIH) (P3) |
| Kebakaran TPA: 16 TPA bersamaan 2023 (BNPB); Sarimukti 80% lahan, 3.000 KK; status 21 dan 14 hari; Jatiwaringin 15 ha, 10 hari; KLH 485 TPA, sekitar 369 belum berhenti; UU 18/2008 Pasal 44 ayat (2) dan Pasal 9 ayat (1) huruf f | Dikonfirmasi dengan catatan: "bersamaan" hanya sebagai kutipan Kepala BNPB; KLH menulis 369 TPA "perlu segera bertransformasi", bukan "belum berhenti". **Ditambah:** daftar 14 TPA terbakar Agustus–Oktober 2023 dari Pusdatinkom BNPB (sekunder, Kompas.com), yang menunjukkan Jatiwaringin dan Jatibarang terbakar pada 2023 dan 2026; angka KLHK 35 TPA terbakar 2023 (sekunder) berdampingan dengan 16 BNPB; SE Menteri LH 11/2026 (pembasahan dan patroli); empat TPA terbakar tercatat pada kemarau 2026 (termasuk Galuga, Bogor); tenggat penutupan TPA pembuangan terbuka menurut UU 18/2008 jatuh 7 Mei 2013 (P4) |

- **Komponen (KERANGKA):** Kartu 8.1 pandemi; Kartu 8.2 kebakaran industri dan kegagalan teknologi; Kartu 8.3 kebakaran
  TPA (B5.11, empat besaran, sel kosong "–" beralasan); Gambar 8.1 kematian COVID-19 terlapor per pekan dan rentang
  kematian berlebih (G11); Gambar 8.2 garis waktu status epidemi dua rezim (B5.31); Tabel 8.1 KRB nonalam nasional
  (B5.7); Tabel 8.2 TPA terbakar 2023–2026 dan statusnya (B5.7).
- **Status data (KERANGKA):** ada (COVID-19, KRB, TPA); sebagian (industri sekunder; SK status TPA dari berita); celah
  (kerugian rupiah dan imateriil nonalam; sebaran kab epidemi selain COVID-19; rezim sektoral belum dibaca).
  **Pembaruan:** rezim sektoral kini terbaca (riset E §E12); teks lengkap UU 17/2023 terbaca; celah yang tersisa: teks
  final Permenkes 1/2026 dan PP 28/2024 belum dibuka, dan isi Perka BNPB 5/2008 tidak tersedia.

Catatan lingkup: bab per jenis berhenti di bahaya, histori, status resmi, kartu analog, kesenjangan spesifik, dan
implikasi (prinsip 17). Strategi, program, dan rekomendasi tidak ditulis di sini. Nonalam memakai kartu analog berangka
tanpa perkalian dan tanpa proyeksi per wilayah; skenario terburuk = analog terbesar dalam 30 tahun terakhir beserta
alasan analog yang disisihkan; kemungkinan "tidak dinilai" (prinsip 9; PEDOMAN §A6 dan §B5.11 varian (b)). Program
nonalam tidak boleh disebut "terbukti": kompendium 25 program tidak memuat satu pun program untuk epidemi, kegagalan
teknologi, atau kebakaran TPA (P3 temuan 12).

---

## P1. Siapa menetapkan status epidemi menurut UU 17/2023, dan kapan status darurat bencana berlaku?

### Inti

Menurut UU 17/2023, kejadian luar biasa (KLB) ditetapkan dan dicabut oleh bupati/wali kota, gubernur, atau Menteri
Kesehatan (Pasal 353), sedangkan daerah terjangkit wabah ditetapkan Menteri (Pasal 368). Status keadaan darurat bencana
ditetapkan Presiden, gubernur, atau bupati/wali kota menurut skala (UU 24/2007 Pasal 51; Perpres 17/2018 Pasal 2).
Pengait kedua rezim hanya ada di skala nasional: bila Wabah berdampak luas, Menteri mengusulkan penetapannya sebagai
bencana nasional nonalam dan Presiden menetapkannya (UU 17/2023 Pasal 369–370). Untuk KLB dan untuk status darurat
bencana provinsi atau kab/kota, tidak ditemukan norma pengait pada teks lengkap UU 17/2023, Perpres 17/2018 jo. 46/2026,
dan teks rancangan Permenkes 1/2026; PP 28/2024 belum dibaca. Permenkes 1/2026 malah menambah status ketiga, Krisis
Kesehatan, yang ditetapkan dinas kesehatan atau Menteri. Pada COVID-19 kedua rezim berjalan sejajar:
kedaruratan kesehatan masyarakat ditetapkan 31 Maret 2020 dan bencana nasional nonalam 13 April 2020, keduanya berakhir
dengan satu Keppres yang berlaku 21 Juni 2023, sehingga status bencana nasional berlangsung 1.165 hari.

### Temuan bersumber

1. **Epidemi dan wabah adalah bencana nonalam.** UU 24/2007 Pasal 1 angka 3: bencana nonalam "antara lain berupa gagal
   teknologi, gagal modernisasi, epidemi, dan wabah penyakit". Sumber: `nonalam-sosial/regulasi.csv` (UU 24/2007 Pasal 1
   angka 3); pustaka `ri-2007-uu24`. Label: resmi.
2. **KLB ditetapkan tiga tingkat pemerintahan.** UU 17/2023 Pasal 353 ayat (1): "Bupati/wali kota, gubernur, atau
   Menteri harus menetapkan KLB jika pada suatu daerah tertentu terdapat penyakit atau masalah Kesehatan yang memenuhi
   kriteria KLB"; ayat (3) kewajiban mencabut bila kriteria tidak lagi terpenuhi; Pasal 354 ayat (1): yang menetapkan
   KLB "wajib segera melaksanakan kegiatan penanggulangan KLB". Penjelasan Pasal 353–354: "Cukup jelas". Sumber: teks
   lengkap UU 17/2023 hlm. 155–156 dan 285; `lembaga/peran.csv` R111; pustaka `ri-2023-uu17`. Label: resmi.
3. **Daerah terjangkit wabah ditetapkan Menteri.** UU 17/2023 Pasal 368 ayat (1): "Menteri menetapkan atau mencabut
   penetapan daerah tertentu sebagai Daerah Terjangkit Wabah." Sumber: `uu-17-2023.json.gz` hlm. 162; `peran.csv` R110
   (pemetaan "Menteri" ke Kementerian Kesehatan adalah pemetaan penyusun paket). Label: resmi.
4. **Definisi dan pencabutan rezim lama.** UU 17/2023 Pasal 1 angka 30 (Wabah: meningkatnya KLB penyakit menular yang
   jumlah kasus dan/atau kematiannya meningkat dan menyebar cepat dalam skala luas), angka 32 (KLB), angka 35 (Daerah
   Terjangkit); Pasal 454 mencabut UU 4/1984 tentang Wabah Penyakit Menular (huruf b) dan UU 6/2018 tentang
   Kekarantinaan Kesehatan (huruf j); diundangkan 8 Agustus 2023. Sumber: teks lengkap UU 17/2023 (salinan
   https://peraturan.go.id/files/uu-no-17-tahun-2023.pdf, 300 hlm, diunduh 24 Okt 2026; hlm. 6–7, 196–197); pustaka
   `ri-2023-uu17`. Label: resmi.
4a. **Pengait skala nasional: Wabah menjadi bencana nasional nonalam.** UU 17/2023 Pasal 369: "Dalam hal Wabah berdampak
   mengancam dan berpotensi mengganggu kehidupan dan penghidupan masyarakat yang menyebabkan jumlah korban, kerugian
   ekonomi, cakupan luas wilayah yang terkena Wabah, dampak sosial ekonomi yang ditimbulkan, dan kerusakan lingkungan,
   Menteri mengusulkan penetapan Wabah sebagai bencana nasional nonalam kepada Presiden." Pasal 370: "Dalam hal terjadi
   situasi Wabah sebagaimana dimaksud dalam Pasal 369, Presiden menetapkan Wabah sebagai bencana nasional nonalam sesuai
   dengan ketentuan peraturan perundang-undangan." Penjelasan keduanya "Cukup jelas". Sumber: teks lengkap UU 17/2023
   hlm. 163 dan 288; pustaka `ri-2023-uu17`. Label: resmi.
4b. **Yang tidak ditemukan pada teks lengkap.** Penelusuran seluruh batang tubuh dan Penjelasan (lapisan teks OCR; 441
   dari 458 judul pasal terbaca langsung, sisanya salah baca OCR seperti "Pasal 1O9", termasuk seluruh Pasal 340–385)
   tidak menemukan istilah "Kedaruratan Kesehatan Masyarakat", kata "BNPB" atau "Badan Nasional", maupun "status keadaan
   darurat". Kata "bencana" muncul di 21 halaman, antara lain Kesehatan Bencana (Pasal 109–113), tenaga cadangan
   kesehatan untuk KLB, Wabah, dan darurat bencana (Pasal 238), dan pendanaan penanggulangan bencana, KLB, dan/atau Wabah
   (Pasal 402); hanya Pasal 369–370 yang mengaitkan penetapan status. Tidak ada pasal yang mengaitkan penetapan KLB atau
   Daerah Terjangkit Wabah dengan status darurat bencana provinsi atau kab/kota. Sumber: idem. Label: resmi (hasil
   penelusuran teks, bukan pernyataan resmi).
5. **Status darurat bencana menurut skala.** UU 24/2007 Pasal 51 ayat (2): penetapan status darurat bencana "untuk
   skala nasional dilakukan oleh Presiden, skala provinsi dilakukan oleh gubernur, dan skala kabupaten/kota dilakukan
   oleh bupati/walikota". Perpres 17/2018 Pasal 2 ayat (2) mengulangnya untuk "tingkat" bencana; Pasal 1 angka 3:
   keadaan darurat bencana meliputi siaga darurat, tanggap darurat, dan transisi darurat ke pemulihan. Sumber:
   `uu-24-2007.json.gz`; korpus `perpres-nomor-17-tahun-2018.json` hlm. 3; pustaka `ri-2007-uu24`, `ri-2018-perpres17`.
   Label: resmi.
6. **Keadaan tertentu kini mencakup ancaman nonalam.** Perpres 46/2026 Pasal I mengubah Perpres 17/2018 Pasal 3 ayat
   (2): Kepala BNPB dapat menyelenggarakan PB dalam keadaan tertentu bila ada "potensi Bencana dengan tingkat ancaman
   maksimum yang disebabkan oleh faktor alam, nonalam, dan/atau sosial" (huruf a), setelah keputusan rapat koordinasi
   yang dikoordinasikan menteri koordinator (ayat (1)); pedomannya ditetapkan Kepala BNPB (ayat (4)). Ditetapkan dan
   diundangkan 16 Juli 2026, LN 2026/83. Sumber: korpus `perpres-nomor-46-tahun-2026.json`; `regulasi.csv`. Label: resmi.
7. **Garis waktu status COVID-19 (dua rezim sejajar).** Keppres 7/2020 (13 Mar 2020) membentuk Gugus Tugas; Keppres
   11/2020 (31 Mar 2020) menetapkan kedaruratan kesehatan masyarakat atas dasar UU 6/2018; Keppres 12/2020 (13 Apr 2020)
   menetapkan bencana nonalam penyebaran COVID-19 sebagai bencana nasional atas dasar UU 4/1984 dan UU 24/2007; Perpres
   82/2020 (20 Jul 2020) mengganti Gugus Tugas dengan Komite dan Satgas Penanganan COVID-19; Keppres 17/2023 (ditetapkan
   22 Jun 2023, berlaku 21 Jun 2023) mencabut penetapan kedaruratan kesehatan masyarakat dan bencana nasional sekaligus;
   Perpres 48/2023 (diundangkan 4 Agt 2023) mengakhiri Satgas. Sumber: `regulasi.csv` (baris Keppres 7, 11, 12/2020,
   Perpres 82/2020, Keppres 17/2023, Perpres 48/2023); pustaka `ri-2020-keppres11`, `ri-2020-keppres12`,
   `ri-2023-keppres17`, `ri-2020-perpres82`, `setkab-2023-perpres48`. Label: resmi. Bahwa Kepala BNPB menjadi ketua
   pelaksana Gugus Tugas hanya dari riset A §5 (sekunder; teks Keppres 7/2020 tidak dibuka); Renstra BNPB hlm. 56
   menulis BNPB menjadi Satgas Penanganan COVID-19 (resmi).
8. **Selisih dan durasi status.** Keppres 12/2020 terbit 13 hari setelah Keppres 11/2020 (kunci baru
   `nonalam.covid19.selisih_kkm_bencana_hari`, olah(resmi)); status bencana nasional 13 Apr 2020–21 Jun 2023 = 1.165 hari
   kalender inklusif, atau 1.164 bila hari berlakunya Keppres 17/2023 tidak dihitung (kunci baru
   `nonalam.covid19.durasi_status_hari`; `covid19_nasional.csv`). Label: resmi.
9. **Status ketiga: Krisis Kesehatan (Permenkes 1/2026).** Teks yang dibuka berlabel RANCANGAN. Pasal 1 angka 4: Krisis
   Kesehatan adalah "peristiwa akibat faktor alam, nonalam, atau sosial, yang serius dan mendesak yang menimbulkan
   permasalahan kesehatan pada masyarakat dan membutuhkan respons cepat di luar kebiasaan normal, sementara kapasitas
   kesehatan setempat tidak memadai". Pasal 82 ayat (1) rancangan: status Krisis Kesehatan ditetapkan kepala dinas
   kesehatan kab/kota, kepala dinas kesehatan provinsi, dan/atau Menteri. Pasal 86 ayat (2) rancangan: Sistem Klaster
   Kesehatan "dalam aspek penanggulangan bencana merupakan bagian integral dari klaster bencana yang dikoordinasikan
   oleh lembaga yang menyelenggarakan pemerintahan di bidang penanggulangan bencana nasional dan perangkat daerah" PB.
   Pasal 101 ayat (1) rancangan: perencanaan krisis kesehatan bagian dari perencanaan PB nasional, provinsi, dan kab/kota.
   Pasal 48 ayat (2) rancangan: Menteri menetapkan daerah terjangkit wabah. Teks rancangan tidak memuat kata "BNPB" maupun
   "status keadaan darurat". Sumber: https://jdih.kemkes.go.id/storage/documents/pdfs/2026permenkes001.pdf (diakses 24 Okt
   2026; pustaka `kemenkes-2026-pmk1`). Label: resmi (rancangan). Penetapan 20 Januari 2026, 12 bab, 175 pasal, penetapan
   status krisis kesehatan di Pasal 80 menurut ANTARA Jogja 4 Feb 2026 (pustaka `antara-2026-pmk1`, sekunder): nomor
   pasal final berbeda dari rancangan.
10. **C09 dalam paket lembaga perlu dikoreksi.** "Untuk epidemi kini ada dua penetapan status yang terpisah: KLB/daerah
    terjangkit wabah (bupati, gubernur, Menteri Kesehatan; UU 17/2023) dan status keadaan darurat bencana (Presiden,
    gubernur, bupati; UU 24/2007 jo. Perpres 17/2018). Tidak ditemukan norma yang mengaitkan keduanya." Sumber:
    `lembaga/celah.csv` C09. Label: resmi (disimpulkan paket dari salinan BPK lokal yang hanya 7 halaman). Simpulan itu
    dibantah sebagian oleh temuan 4a: pengait skala nasional ada (Pasal 369–370); yang tetap tidak ditemukan adalah
    pengait skala daerah (temuan 4b). Pemilik paket `lembaga` memperbarui C09.
11. **Renas PB menaruh aksi epidemi pada Kementerian Kesehatan.** Kegiatan dengan penanggung jawab Kementerian Kesehatan
    (dibaca dari OCR tabel berkolom bertumpuk; urutan kolom PJ, kontributor, pihak lain): 1.1.2.i jaringan pengamatan dan
    pantauan penyakit berpotensi KLB/wabah (target 5 unit/jaringan, kontributor BRIN; hlm. 54–55); 1.2.1.e Emergency
    Medical Team dan klaster kesehatan (34 ke 38 provinsi; hlm. 57); 1.2.1.f Public Safety Center (90 ke 510 kab/kota;
    hlm. 57; kunci baru `renas.epidemi.psc.target_2029`); 1.2.1.g gladi penanggulangan krisis kesehatan (192 rumah sakit;
    kunci baru `renas.epidemi.gladi_rs.target_2029`); 1.4.1.l IGT epidemi (3 ke 8 dokumen/peta, kontributor BIG, BRIN;
    hlm. 68). Program 1.2.1 bersasaran "Menurunnya proporsi korban krisis kesehatan secara signifikan setiap tahun".
    BNPB tidak tercantum sebagai PJ aksi-aksi itu. Sumber: korpus `perban-nomor-1-tahun-2025.json`; pustaka
    `bnpb-2025-renas`. Label: resmi.
12. **BNPB dalam data peringatan dini.** Perban BNPB 2/2024 mendaftar data peringatan dini "i. epidemik" dan "k.
    teknologi industri". Sumber: `lembaga/peran.csv` R113 dan R117 (hlm. 5). Label: resmi.
13. **Renstra BNPB memakai bahasa KLB untuk COVID-19.** Renstra hlm. 14: "Pada Tahun 2020 terjadi KLB yang berakhir
    menjadi wabah yaitu kasus COVID-19"; hlm. 13: epidemi dan wabah penyakit "merupakan salah satu bentuk bencana".
    Sumber: korpus `perban-nomor-5-tahun-2025.json`. Label: resmi.
14. **Bukan dibantah, tetapi dinuansakan oleh JEE 2023.** Indikator R2.1 (keterkaitan otoritas kesehatan masyarakat dan
    keamanan) skor 4, P3.2 (mekanisme koordinasi multisektor) skor 4, R1.2 (PHEOC) skor 4 dari 5. Sumber:
    `nonalam-sosial/indikator.csv` (kode R2.1, P3.2, R1.2); kunci baru `nonalam.jee2023.r2_1`. Label: terverifikasi. JEE
    menilai keterkaitan kesehatan dengan otoritas keamanan, bukan dengan rezim status bencana; skor ini tidak membuktikan
    adanya norma pengait.

### Inferensi

- **[Inferensi tim] Kini ada tiga status untuk satu kejadian epidemi, bukan dua.** KLB atau daerah terjangkit wabah
  (UU 17/2023), Krisis Kesehatan (Permenkes 1/2026), dan keadaan darurat bencana (UU 24/2007), masing-masing dengan
  penetap berbeda: kepala daerah atau Menteri, kepala dinas kesehatan atau Menteri, dan Presiden atau kepala daerah.
  UU 17/2023 Pasal 369–370 mengaitkan Wabah dengan status bencana nasional nonalam lewat usul Menteri dan penetapan
  Presiden; Permenkes 1/2026 mengaitkan sisi organisasi (klaster kesehatan masuk klaster bencana; perencanaan krisis
  kesehatan masuk perencanaan PB). Pemicu status di skala daerah (KLB atau krisis kesehatan ke status darurat bencana
  provinsi atau kab/kota) tidak dikaitkan pada teks yang dibaca. Gambar 8.2 sebaiknya menggambar tiga jalur, dengan status Krisis
  Kesehatan berpil "teks rancangan" sampai salinan final dibuka.
- **[Inferensi tim] Preseden COVID-19 menunjukkan jeda, bukan konflik.** Selisih 13 hari antara status kesehatan dan
  status bencana nasional, lalu pencabutan keduanya oleh satu Keppres, menunjukkan bahwa pengaitan pada 2020 terjadi
  lewat keputusan Presiden per kejadian; UU 17/2023 Pasal 369–370 kini menuliskan jalur itu (usul Menteri, penetapan
  Presiden) sebagai norma. Untuk epidemi skala daerah tidak ada preseden tertulis yang ditemukan; kunjungan
  Kepala BNPB ke Kupang Juni 2024 untuk rabies "yang masuk dalam kategori bencana non alam" (peristiwa.csv
  `rabiesntt2024`, narasi) tidak disertai keterangan status apa yang ditetapkan.
- **[Inferensi tim] Jalur BNPB tanpa status ada sejak Juli 2026.** Perpres 46/2026 Pasal 3 ayat (2) huruf a membuka
  keadaan tertentu untuk ancaman nonalam, dan ayat (4) mewajibkan pedoman Kepala BNPB. Pedoman itu adalah tempat yang
  sudah tersedia untuk menulis kapan status KLB, wabah, atau krisis kesehatan memicu rapat koordinasi keadaan tertentu,
  khususnya di bawah ambang bencana nasional Pasal 369–370.
  Ini implikasi untuk Bab 10 dan Bab 11, bukan rekomendasi di bab ini (prinsip 17).
- **[Inferensi tim] Bahasa naskah.** Karena UU 6/2018 sudah dicabut, naskah tidak boleh menulis "kedaruratan kesehatan
  masyarakat" sebagai status yang berlaku sekarang; istilah itu hanya untuk Keppres 11/2020 sebagai sejarah.

### Celah

- **PP 28/2024** (peraturan pelaksana UU 17/2023, memuat KLB dan wabah) tidak dibuka; bila PP itu memuat pengait skala
  daerah ke status bencana atau BNPB, C09 berubah lagi. Penyajian: tulis "pengait skala nasional ada (UU 17/2023 Pasal
  369–370); pengait skala daerah tidak ditemukan pada UU 17/2023, Perpres 17/2018 jo. 46/2026, dan teks rancangan
  Permenkes 1/2026 yang dibaca", bukan "tidak ada". Permintaan: teks PP 28/2024 dari JDIH BPK
  (https://peraturan.bpk.go.id/Details/294077) dibaca pada bagian KLB dan wabah.
- **Salinan final Permenkes 1/2026** tidak terbuka (peraturan.go.id habis waktu 24 Okt 2026). Nomor pasal di temuan 9
  adalah nomor rancangan. Penyajian: kutip isi, sebut "Permenkes 1/2026" tanpa nomor pasal sampai salinan final dibaca.
- **Teks Keppres 7/2020** tidak dibuka; susunan Gugus Tugas (Kepala BNPB ketua pelaksana) tetap sekunder.
- **Status yang ditetapkan untuk epidemi daerah selain COVID-19** (rabies NTT 2024, KLB lain) tidak ditemukan.
  Permintaan data: Kementerian Kesehatan (daftar penetapan KLB dan daerah terjangkit wabah 2020–2026) dan Pusdatinkom BNPB
  (status darurat bencana nonalam yang tercatat).
- **Teks UU 17/2023 dari JDIH BPK** belum dicocokkan (situs pemeliharaan 24 Okt 2026); penelusuran memakai salinan
  peraturan.go.id dengan lapisan teks OCR. Sebelum final, cocokkan kutipan Pasal 353, 368–370, dan 454 ke salinan BPK.

---

## P2. Berapa korban, luas, dan kerugian pada analog terburuk tiap jenis?

### Inti

Pandemi COVID-19 adalah analog terberat: 161.870 meninggal dan 6.811.945 kasus (resmi), berdampingan dengan kematian
berlebih 2020–2021 menurut model WHO 806.815–1.343.849, yaitu 5,6–9,3 kali 144.094 kematian terlapor pada dua tahun yang
sama; status bencana nasional 1.165 hari. Untuk kebakaran industri analognya Plumpang 2023: 29 meninggal per 18 Mar 2023
menurut Pemprov DKI (data Dinkes DKI), naik dari 17 meninggal dan 18 hilang per 5 Mar 2023 menurut Kepala BNPB, dengan
1.085 pengungsi; tetapi kejadian kegagalan teknologi tercatat terberat di DIBI adalah ambruknya
musala Ponpes Al Khoziny 2025 (63 meninggal), sehingga lingkup Kartu 8.2 menentukan lantainya. Kebakaran TPA terberat
adalah kemarau 2023 (16 TPA "terbakar hebat bersamaan" menurut catatan BNPB yang dikutip Kepala BNPB; 14 TPA terbakar
Agustus–Oktober 2023 menurut daftar Pusdatinkom BNPB, sekunder; Sarimukti 80% lahan, 3.000 KK terdampak asap) tanpa
korban jiwa tercatat; kerugian rupiah resmi tidak ada untuk ketiga jenis, kecuali potensi kerugian fisik KRB kegagalan
teknologi Rp584.288 juta yang merupakan batas atas aset terpapar, bukan kerugian.

### Temuan bersumber

**Pandemi (Kartu 8.1)**

1. **Korban tercatat:** 6.811.945 kasus terkonfirmasi dan 161.870 meninggal (Kementerian Kesehatan 2024 dikutip Renstra
   hlm. 14), kumulatif sampai sekitar akhir Juni 2023 (kumulatif WHO melewati angka itu antara pekan 25 Jun dan 2 Jul
   2023); jangan ditulis "hingga Maret 2023". Sumber: registri `nonalam.covid19.meninggal`; kunci baru
   `nonalam.covid19.kasus`; `covid19_nasional.csv`. Label: resmi. WHO 162.059 (kunci baru `nonalam.covid19.meninggal_who`,
   terverifikasi) adalah pemutakhiran, bukan angka bertentangan.
2. **Per tahun dan puncak:** meninggal terlapor 2020 = 22.138 dan 2021 = 121.956 (covid19.go.id; kunci baru
   `nonalam.covid19.meninggal.2020`, `.2021`), jumlah 144.094 (olah); minggu puncak 12.444 meninggal (pekan 26 Jul–1 Agt
   2021, gelombang Delta; kunci baru `nonalam.covid19.kematian_minggu_puncak`, terverifikasi, sama persis dengan jumlah
   harian covid19.go.id). Label: resmi.
3. **Berdampingan dengan model:** kematian berlebih 2020–2021 806.815–1.343.849 (selang 95%; registri
   `nonalam.covid19.kematian_berlebih`); 2020: 198.861–521.585; 2021: 540.737–891.605 (kunci baru
   `nonalam.covid19.kematian_berlebih.2020`, `.2021`). Rasio terhadap tercatat 5,6–9,3 kali (kunci baru
   `nonalam.covid19.rasio_berlebih_terlapor.2020_2021`, olah). Sumber: `covid19_nasional.csv`; pustaka
   `who-2023-kematian-berlebih`. Label: estimasi-model. WHO memodelkan Indonesia dari data bulanan Jakarta dan data
   tahunan historis (Methods §5.1) dan menyatakan angkanya bukan statistik resmi nasional; selalu ditulis sebagai rentang
   dan tidak di judul.
4. **Durasi dan status:** 1.165 hari status bencana nasional (P1 temuan 8). Label: resmi.
5. **Sebaran provinsi (bukan angka akhir, data 30 Sep 2022):** kematian per 100.000 tertinggi DIY 161,4, Kalimantan
   Timur 150,7, DKI Jakarta 138,4; terbanyak Jawa Tengah 33.543 dan Jawa Timur 31.808. Sumber: `covid19_provinsi.csv`;
   kunci baru `nonalam.covid19.prov_meninggal_per100rb_maks`, `nonalam.covid19.prov_meninggal_terbanyak`. Label: resmi
   (penyebut penduduk KRB, bukan BPS). Jumlah 34 provinsi 158.174 lawan nasional 158.112 pada tanggal yang sama; selisih
   tidak dijelaskan sumber (`nonalam-sosial/README.md` §Rekonsiliasi).
6. **Layanan dasar 2019–2024:** cakupan imunisasi DTP3 anak 1 tahun 85, 77, 67, 91, 83, 78% (2019 sampai 2024); MCV1
   88, 76, 72, 92, 82, 85%; notifikasi TB 566.846 (2019) ke 393.323 (2020). Cakupan naik pada 2022 lalu turun lagi pada
   2023–2024, jadi tidak ditulis "pulih". Sumber: `skenario_terburuk.csv`, `indikator.csv` (WHS4_100, WHS8_110); kunci
   baru `nonalam.covid19.dtp3.*`, `.mcv1.*`, `.tb_notifikasi.*`. Label: terverifikasi. Sumber tidak menyatakan sebab
   penurunan; atribusi ke COVID-19 ada di bagian Inferensi.
7. **KRB COVID-19 dan epidemi (Tabel 8.1):** COVID-19 luas bahaya tinggi 1.181.863 ha, sedang 3.433.775 ha; epidemi dan
   wabah penyakit bahaya tinggi 385.762 ha; penduduk terpapar keduanya 272.566.688 (tulis "praktis seluruh penduduk":
   angka ini melebihi penduduk KRB 271.680.290 karena terpapar lima kab Sulawesi Barat terhitung ganda), kelompok umur
   rentan 28.208.985, miskin 27.413.330, disabilitas 957.980. Bahaya tinggi COVID-19 82,2% di Jawa (971.660 ha), tetapi
   kelas risiko tinggi hanya 4.231 ha nasional, 3.716 ha di antaranya di Papua dan 0 ha di Jawa. Sumber:
   `krb_nonalam_nasional.csv` (Renas Tabel 2.2 dan 2.5); `krb_covid19_wilayah.csv`; kunci baru
   `krb.covid19.luas_bahaya_tinggi_ha`, `krb.covid19.luas_bahaya_tinggi_jawa_ha`, `krb.covid19.luas_risiko_tinggi_papua_ha`,
   `krb.epidemi.luas_bahaya_tinggi_ha`. Label: resmi.
8. **DIBI:** COVID-19 tidak punya baris DIBI. Epidemi dan wabah 2025: 14 meninggal setelah entri ganda dibuang (kunci baru
   `dibi.epidemi.meninggal.2025`, olah(resmi)). Catatan mutu: rekap DIBI menulis 28 karena kejadian Nias Selatan 9 Jan
   2025 (14 meninggal) tercatat dua kali, di subjenis "Epidemi dan Wabah Penyakit" dan "Wabah Penyakit"; angka 28 tidak
   dikutip. 2026 sementara 1 kejadian, 5 meninggal. Sumber: `dibi_nonalam_sosial_rekap.csv`,
   `dibi_nonalam_sosial_baris.csv` (dua baris Nias Selatan 2025-01-09). Label: resmi; olah.
9. **Kerugian materiil:** tidak ada estimasi kerugian ekonomi COVID-19 yang resmi di sumber yang dibuka. Pagu BNPB 2020
   (Rp12,71 triliun) dan 2021 (Rp7,22 triliun) yang memuat alokasi COVID-19 adalah anggaran penanganan, bukan kerugian.
   Sumber: `skenario_terburuk.csv` (epidemi_pandemi, kerugian_materiil); Renstra hlm. 55–56. Label: narasi resmi.
10. **Parameter historis pandemi (narasi, tidak dikalikan):** Kepmenkes 300/2009 mencatat CFR pandemi influenza 1918
    5% dan pandemi berikutnya sekitar 1–2%, serta CFR kasus H5N1 terkonfirmasi di Indonesia Januari–Mei 2006–2008
    79,4–87,5%. Tidak ada skenario pandemi resmi berangka untuk Indonesia. Sumber: `skenario_terburuk.csv`; pustaka
    `kemenkes-2009-kepmenkes300`. Label: resmi (narasi).

**Kebakaran industri dan kegagalan teknologi (Kartu 8.2)**

11. **Plumpang 2023 (kebakaran Terminal BBM di tengah permukiman, Jakarta Utara, malam 3 Mar 2023):** deret angka
    meninggal dari instansi pemerintah, berdampingan:
    - 17 meninggal, 18 hilang, 1.085 pengungsi, "hingga saat ini" menurut Kepala BNPB, dikutip Setkab 5 Mar 2023 (hari
      kalender ketiga sejak kejadian; tanpa keterangan "hari ke-"). Registri `nonalam.plumpang2023.meninggal`; kunci baru
      `nonalam.plumpang2023.hilang`, `nonalam.plumpang2023.pengungsi`; pustaka `setkab-2023-plumpang`. Label: resmi.
    - 19 meninggal per 9 Mar 2023 06.00 (siaran pers PPID Pemprov DKI, data Dinkes DKI) dan **29 meninggal per 18 Mar
      2023** (Kalaksa BPBD DKI, data Dinkes DKI; 15 masih dirawat; tidak ada pengungsi di posko sejak 16 Mar), keduanya
      di portal resmi Pemprov DKI beritajakarta.id. Kunci baru `nonalam.plumpang2023.meninggal_pemprov_18mar`; pustaka
      `beritajakarta-2023-plumpang`. Label: resmi.
    - Sekunder: 21 per 13 Mar (ANTARA), 33 per 24 Mar 2023 (Kalaksa BPBD DKI mengutip Dinkes DKI, IDX Channel; pustaka
      `idxchannel-2023-plumpang`), 579 pengungsi (Kompas TV 4 Mar 2023). Rilis Pemprov untuk angka 33 tidak ditemukan.
    Kunci registri `nonalam.plumpang2023.meninggal_akhir` (29) berlabel resmi padahal kolom sumbernya Merah Putih
    (sekunder); bab ini tidak memakainya dan memakai kunci baru di atas yang bersumber portal Pemprov. DIBI tidak punya
    baris.
12. **Balongan 2021 (kebakaran kilang RU VI, Indramayu, 29 Mar 2021):** 912 lalu 932 pengungsi, 1 meninggal (serangan
    jantung saat ledakan), 5 desa terdampak (BNPB 29 dan 30 Mar 2021); Renstra hlm. 14 menyebutnya contoh kegagalan
    teknologi yang mengharuskan ratusan penduduk mengungsi. Sumber: `peristiwa.csv`; kunci baru
    `nonalam.balongan2021.pengungsi`. Label: resmi.
13. **Morowali 2023 (ledakan tungku smelter PT ITSS, kawasan IMIP, 24 Des 2023):** 20 meninggal (12 pekerja Indonesia, 8
    TKA) menurut Kabidhumas Polda Sulteng, ANTARA Palu 12 Feb 2024 (pustaka `antara-2024-morowali`); 19 meninggal (11
    pekerja Indonesia, 8 TKA) menurut Investortrust 9 Jan 2024 tanpa atribusi pejabat (pustaka
    `investortrust-2024-morowali`). Angka lain yang beredar 13 (hari pertama), 18 (IMIP, 26 Des) dan 21 (Polda, awal Jan
    2024) belum dicocokkan ke rilis. Sumber: `peristiwa.csv`. Label: sekunder; tidak menjadi angka utama dan tidak masuk
    registri. Rilis Tribratanews Polda Sulteng 3 Jan dan 8 Mar 2024 diblokir (HTTP 403) saat dicek 24 Okt 2026; siaran
    pers Kemnaker atau Kemenko Marves yang memuat angka korban tidak ditemukan. DIBI tidak punya baris.
14. **DIBI kegagalan teknologi 2018–2026:** 10 kejadian, 90 meninggal (cakupan kejadian bencana; 2026 sementara); 63 di
    antaranya ambruknya musala Ponpes Al Khoziny, Sidoarjo, 29 Sep 2025 (DIBI mencatatnya "Gagal Teknologi", kegagalan
    konstruksi; Basarnas 67, sekunder); baris lain memuat dugaan tabrakan kereta Bekasi Timur 27 Apr 2026 (15 meninggal,
    jenis "Kecelakaan Industri") dan dugaan kejadian pantai Gunungkidul 28 Jan 2025 (6 meninggal, 2 hilang). Sumber:
    `dibi_nonalam_sosial_rekap.csv`; `peristiwa.csv`; kunci baru `dibi.gagal_teknologi.kejadian.2018_2026`,
    `dibi.gagal_teknologi.meninggal.2018_2026`, `nonalam.alkhoziny2025.meninggal_dibi`. Label: resmi (pencocokan Bekasi
    dan Gunungkidul adalah dugaan penyusun paket).
15. **Renas memasukkan konstruksi ke kegagalan teknologi:** Renas hlm. 6: "kegagalan teknologi seperti kecelakaan
    industri, transportasi, konstruksi, sampai kegagalan teknologi nuklir, biologi, dan kimia". Sumber: korpus
    `perban-nomor-1-tahun-2025.json` hlm. 6. Label: resmi.
16. **KRB kegagalan teknologi (Tabel 8.1):** luas bahaya 186.940 ha (tinggi 3.600 ha, sedang 3.794 ha), 713.784 jiwa
    terpapar (umur rentan 94.387, miskin 221.154, disabilitas 1.732), potensi kerugian fisik Rp584.288 juta (Renas Tabel
    2.6; kolom ekonomi dan lingkungan "-"). Sumber: `krb_nonalam_nasional.csv`; registri `nonalam.gagal_teknologi.terpapar`;
    kunci baru `krb.gagal_teknologi.luas_bahaya_total_ha`, `krb.gagal_teknologi.luas_bahaya_tinggi_ha`; kunci kerugian
    `renas.krb.kerugian_gagal_teknologi` sudah ada di `bab-02.angka.json`. Label: resmi. Sebaran kab tidak tersedia (API
    InaRISK tidak punya `kajian-summary` untuk kegagalan teknologi).

**Kebakaran TPA (Kartu 8.3)**

17. **Kemarau El Niño 2023:** 16 TPA "terbakar hebat bersamaan" menurut catatan BNPB tahun 2023 (Kepala BNPB, rapat
    koordinasi Bali 21 Jun 2024; kata "bersamaan" dipakai hanya sebagai kutipan). Sumber: registri
    `nonalam.tpa.terbakar_2023`; pustaka `bnpb-2024-tpa-suwung`. Label: resmi. **Pembanding BNPB sezaman yang berdaftar
    nama:** Kepala Pusdatinkom BNPB Abdul Muhari, Disaster Briefing daring 17 Okt 2023, mencatat 14 TPA terbakar
    Agustus–Oktober 2023: Sarimukti (Bandung Barat, 19 Agt), Bantar Gebang (Bekasi, 19 Agt), Kawatuna (Palu, 23 Agt),
    Randegan (Mojokerto, 8 Sep), Kopi Luhur (Cirebon, 9 Sep), Jatiwaringin (Tangerang, 12 Sep), Putri Cempo (Solo, 16
    Sep), Jatibarang (Semarang, 18 Sep), Sumompo (Manado, 1 Okt), Purbahayu (Pangandaran, 6 Okt), Bakung (Bandar Lampung,
    12 Okt), Cikolotok (Purwakarta, 12 Okt), Suwung (Denpasar, 12 Okt), Mandung (Tabanan, 14 Okt). Pustaka
    `kompas-2023-tpa14`. Label: sekunder (rilis atau rekaman BNPB asli tidak ditemukan pada penelusuran 24 Okt 2026).
    Rawa Kucing dan Jalupang (temuan 19) tidak ada di daftar ini; Rawa Kucing mulai terbakar sesudah briefing.
    **Berdampingan (definisi dan periode berbeda, semuanya sekunder):** Menteri LHK 30 Sep 2023 "yang tercatat oleh
    saya ada 15 spot" (detikJabar); Kemenko Marves 31 Okt 2023 "30 TPA selama tiga bulan terakhir" (Katadata); Direktur
    Pengelolaan Sampah KLHK 9 Nov 2023 "35 TPA" sejak awal 2023 (Kompas.com); Dirjen PSLB3 KLHK 24 Jan 2024 "sepanjang
    2023 kami mencatat 35 TPA terbakar yang mayoritas akibat gas metana" (RRI). Pustaka `detik-2023-tpa15`,
    `katadata-2023-tpa30`, `kompas-2023-tpa35`, `rri-2024-tpa35`.
18. **Sarimukti, Kab. Bandung Barat (terbakar sejak 19 Agt 2023):** 80% lahan terbakar dan sekitar 3.000 KK terdampak
    asap (BNPB 26 Agt 2023); helikopter water bombing atas permintaan Gubernur. Sumber: `peristiwa.csv`; kunci baru
    `nonalam.tpa.sarimukti_persen_lahan`, `nonalam.tpa.sarimukti_kk_asap`. Label: resmi. Status tanggap darurat kabupaten
    21 hari (22 Agt–11 Sep), provinsi 14 hari (12–25 Sep), darurat sampah Kota Bandung 28 hari, 8.000 ton sampah tak
    terangkut; luas 16,5 ha (Metro TV) lawan 25 ha (opini Jakarta Post); biaya pemadaman provinsi Rp5,8 miliar dan
    kabupaten sekitar Rp1 miliar: semuanya sekunder.
19. **TPA 2023 lain (BNPB, resmi):** Suwung, Denpasar 32,4 ha, 7 km dari Bandara I Gusti Ngurah Rai (kunci baru
    `nonalam.tpa.suwung_luas_ha`); Rawa Kucing, Kota Tangerang sekitar 10 ha, 450 personel; Jalupang, Karawang 10 ha, 4
    desa terdampak asap; Kopi Luhur, Cirebon sekitar 3 ha, sebagian warga dari sekitar 1.500 KK mengungsi; Putri Cempo,
    Surakarta 2 ha, 200 jiwa terdampak asap; Jatibarang, Semarang dan Jatiwaringin, Kab. Tangerang ada di daftar 14 TPA
    Pusdatinkom (temuan 17, sekunder). Status: Rawa Kucing tanggap darurat 14 hari (Keputusan Wali Kota 442/Kep.1023-
    BPBD/2023); Suwung transisi darurat 7 hari (Keputusan Wali Kota 188.45/2575/HK/2023), berakhir 16 Nov 2023: sekunder.
    Antang (Makassar) 2023 tidak ditemukan sumbernya; jangan dikutip. Sumber: `peristiwa.csv`.
20. **Kemarau 2026 (resmi):** Jatiwaringin, Kab. Tangerang 15 ha, mulai 30 Jun 2026, padam 100% 9 Jul (10 hari
    kalender), 15 jiwa mengungsi, 4 helikopter, status tanggap darurat Keputusan Bupati Tangerang 609/2026 (BNPB; kunci
    baru `nonalam.tpa.jatiwaringin_luas_ha`, `nonalam.tpa.jatiwaringin_hari_padam`); Galuga, Bogor, api teridentifikasi 7
    Sep 2026 di lahan kebun lalu merambat ke TPA, 10 sorti water bombing TNI AU (KLH 9 Sep 2026); Putri Cempo 1,36 ha (24
    Sep 2026, BNPB); Jatibarang, Semarang sekitar 10 ha (30 Sep 2026, BPBD Jateng via BNPB, tanpa korban jiwa). Jumlah
    tercatat 4 TPA (kunci baru `nonalam.tpa.terbakar_2026_tercatat`, olah). Tiga dari empat (Jatiwaringin, Putri
    Cempo, Jatibarang) juga terbakar pada 2023: Putri Cempo tercatat di rilis BNPB 2023 (temuan 19, resmi), Jatiwaringin
    dan Jatibarang hanya di daftar Pusdatinkom BNPB yang dikutip media (temuan 17, sekunder). Pustaka `bnpb-2026-jatiwaringin`,
    `klh-2026-galuga`. Label: resmi. KLH 5 Jul 2026 menulis di judul "area terbakar tinggal 36 persen" tetapi kutipan Menteri
    di badan berita "dari sekitar 70 persen area yang semula terbakar, kini tinggal sekitar 3,6 persen" (pustaka
    `klh-2026-jatiwaringin`): angka persen tidak dipakai.
21. **Kerugian:** tidak ada angka kerugian rupiah kebakaran TPA di sumber yang dibuka; yang ada biaya respons (sekunder)
    dan pengerahan helikopter. Korban jiwa langsung tidak tercatat. Sumber: `skenario_terburuk.csv` (kebakaran_tpa,
    kerugian_materiil). Label: narasi resmi.

**Aturan analog**

22. Nonalam: "skenario terburuk = analog terbesar dalam 30 tahun terakhir beserta alasan analog yang disisihkan";
    lantai: skenario tidak boleh lebih ringan daripada kejadian tercatat terburuk untuk jenis dan wilayah yang sama.
    PEDOMAN §B5.11 varian (b) menetapkan COVID-19 untuk pandemi, Plumpang 2023 untuk kebakaran industri, Sarimukti 2023
    untuk kebakaran TPA; kemungkinan "tidak dinilai: tidak ada model peluang yang dapat diuji balik". Sumber: `KERANGKA.md`
    §2 butir 9; `PEDOMAN-DESAIN.md` §B5.11. Label: asumsi-kebijakan.

### Inferensi

- **[Inferensi tim] Usulan isi tiga kartu (empat besaran, PEDOMAN §B5.11 varian (b)):**

  | Besaran | Kartu 8.1 Pandemi (COVID-19) | Kartu 8.2 Kebakaran industri (Plumpang 2023) | Kartu 8.3 Kebakaran TPA (kemarau 2023) |
  | --- | --- | --- | --- |
  | Korban jiwa | 161.870 meninggal (resmi); pembanding kematian berlebih 2020–2021 806.815–1.343.849 (estimasi-model) | 29 meninggal per 18 Mar 2023 (Pemprov DKI, data Dinkes DKI; resmi), angka resmi tertinggi yang dibuka dan lantai kartu; pembanding: 17 meninggal dan 18 hilang per 5 Mar 2023 (Kepala BNPB, resmi) dan 33 per 24 Mar 2023 (sekunder) | "–": tidak ada korban jiwa langsung tercatat |
  | Luas terdampak | KRB bahaya tinggi COVID-19 1.181.863 ha; penduduk terpapar "praktis seluruh penduduk" | "–": radius dampak tidak ada di sumber resmi; KRB nasional 186.940 ha sebagai konteks | 16 TPA "terbakar hebat bersamaan" (catatan BNPB, kutipan); pembanding 14 TPA Agustus–Oktober 2023 (Pusdatinkom, sekunder); Sarimukti 80% lahan; Suwung 32,4 ha |
  | Kerugian materiil | "–": tidak ada penilaian resmi; pagu BNPB bukan kerugian | KRB potensi kerugian fisik Rp584.288 juta (batas atas aset terpapar nasional, bukan kerugian Plumpang) | "–": hanya biaya respons (sekunder) |
  | Kerugian imateriil | Status bencana nasional 1.165 hari; DTP3 85% (2019) ke 67% (2021), 78% pada 2024; notifikasi TB turun 173.523 (2019 ke 2020) | 1.085 pengungsi (Balongan 932 sebagai pembanding) | 3.000 KK terdampak asap; status darurat berlapis (sekunder) |

- **[Inferensi tim] Lantai Kartu 8.2 bergantung pada lingkupnya.** Bila kartu tetap berjudul "kebakaran industri dan
  kegagalan teknologi", lantai tercatat adalah Al Khoziny 2025 (DIBI 63 meninggal), karena Renas sendiri memasukkan
  kecelakaan konstruksi ke kegagalan teknologi dan DIBI mencatatnya di jenis itu; kartu berangka 17 akan melanggar lantai.
  Bila kartu dibatasi ke "kebakaran dan ledakan industri" (lingkup P11), Plumpang tetap analog dengan alasan penyisihan
  tertulis: Al Khoziny adalah runtuhnya bangunan (rezim bangunan gedung, bukan rezim keselamatan industri), Bekasi Timur
  kecelakaan transportasi, Gunungkidul dugaan kejadian pantai. Lantai Plumpang sendiri adalah 29 (resmi, Pemprov DKI
  18 Mar 2023), bukan 17. Bawaan usulan (dapat dibalik orkestrator): judul kartu
  "Kebakaran dan ledakan industri", Al Khoziny disebut di paragraf 8.2 sebagai kejadian kegagalan teknologi tercatat
  terberat dengan angka DIBI, dan Morowali (19–20, sekunder) disebut sebagai pembanding yang menunggu angka resmi.
- **[Inferensi tim] Angka Plumpang di kartu adalah 29, dan masih batas bawah.** Angka 17 (per 5 Mar 2023) adalah hitungan
  awal; korban luka bakar terus meninggal di rumah sakit sehingga angka Dinkes DKI naik ke 29 per 18 Mar (resmi, Pemprov
  DKI) dan 33 per 24 Mar (sekunder). Kartu menulis "29 meninggal per 18 Mar 2023 (Pemprov DKI)" sebagai angka utama
  supaya tidak di bawah angka tercatat, dengan 33 (sekunder) di catatan dan 17 dan 18 hilang per 5 Mar sebagai deret
  awal.
- **[Inferensi tim] Kematian berlebih memperbesar, bukan mengganti, angka tercatat.** Rentang 5,6–9,3 kali dari angka
  terlapor menunjukkan COVID-19 tercatat jauh di bawah dampak semua sebab, tetapi lebar pita (1,7 kali dari batas bawah ke
  batas atas) dan basis data Jakarta membuatnya tidak layak sebagai angka utama. Angka utama kartu tetap 161.870.
- **[Inferensi tim] Kerugian imateriil COVID-19 terbaca di layanan dasar.** Penurunan notifikasi TB 173.523 orang
  (566.846 ke 393.323, olah) dan DTP3 18 poin persentase (2019 ke 2021) bertepatan dengan pandemi dan menjadi besaran
  fisik untuk kolom imateriil tanpa rupiah (PEDOMAN §A6 melarang rupiah imateriil di angka utama). Mengaitkan
  penurunan itu dengan COVID-19 adalah penilaian tim, bukan pernyataan sumber. Cakupan DTP3 sempat 91% pada 2022 tetapi
  turun lagi ke 83% (2023) dan 78% (2024), jadi kartu tidak menulis "pulih" dan tidak mengaitkan penurunan 2023–2024
  dengan pandemi.
- **[Inferensi tim] Bahaya COVID-19 terkonsentrasi di Jawa, risiko di Papua.** Kelas bahaya KRB mengikuti kepadatan
  (Jawa 82,2% luas bahaya tinggi) sedangkan kelas risiko mengikuti kapasitas (Papua 3.716 dari 4.231 ha risiko tinggi).
  Naskah tidak memeringkat provinsi dari angka ini (prinsip 8); cukup sebagai keterangan Tabel 8.1.

### Celah

- **Skenario pandemi resmi berangka** tidak ditemukan (Kepmenkes 300/2009 hanya pedoman episenter; dokumen renkon
  pandemi influenza nasional tidak ditemukan). Penyajian: analog COVID-19 tanpa perkalian; CFR historis hanya narasi.
- **Kerugian rupiah dan imateriil resmi** untuk ketiga jenis tidak ada. Penyajian: sel "–" beralasan. Permintaan data:
  Bappenas atau Kementerian Keuangan (penilaian kerugian ekonomi COVID-19, bila ada), Pertamina dan Kementerian ESDM
  (penilaian kerugian Plumpang dan Balongan), KLH (kerugian kebakaran TPA).
- **Angka korban akhir resmi Plumpang dan Morowali** tidak ditemukan. Plumpang: angka resmi tertinggi yang dibuka 29
  per 18 Mar 2023; 33 per 24 Mar hanya sekunder. Morowali: semua angka sekunder; rilis Tribratanews Polda Sulteng
  diblokir saat dicek. Permintaan data: BPBD DKI atau PPID Pemprov DKI (rekap akhir Plumpang), Kementerian
  Ketenagakerjaan dan Polda Sulteng (Morowali).
- **COVID-19 per provinsi akhir (Maret–Juni 2023)** tidak ditemukan; data provinsi berhenti 30 Sep 2022.
- **Sebaran kab epidemi selain COVID-19 dan kegagalan teknologi** tidak ada di API InaRISK; hanya nasional.
- **Galuga 2026 belum ada di `peristiwa.csv`**; kunci kajian air `nonalam.tpa.jawa_2026_tercatat` = 3 (bab-05 kajian
  air) tidak memuatnya. Penulis kedua kajian memakai angka yang sama; pemilik paket `nonalam-sosial` menambah baris
  Galuga sebelum angka dikunci.
- **Daftar 35 TPA KLHK 2023** tidak ditemukan sebagai dokumen; hanya kutipan pejabat di media. Daftar per lokasi yang
  ada adalah 14 TPA Agustus–Oktober 2023 dari Pusdatinkom BNPB, tetapi hanya lewat Kompas.com (sekunder); rilis atau
  rekaman Disaster Briefing 17 Okt 2023 tidak ditemukan. Permintaan: Pusdatinkom BNPB (bahan paparan briefing 17 Okt
  2023) dan KLH (data kebakaran TPA 2023–2026 per lokasi).

---

## P3. Rezim keselamatan sektoral apa yang mengatur kebakaran industri, dan di mana peran BNPB?

### Inti

Pengawasan keselamatan kebakaran industri berada di tiga rezim sektoral: keselamatan migas, termasuk depo penyimpanan dan
niaga, pada Menteri ESDM melalui Dirjen Migas dan Kepala Inspeksi (PP 11/1979; Permen ESDM 32/2021); keamanan dan
keselamatan proses dan penyimpanan industri pada Menteri Perindustrian (UU 3/2014 Pasal 117); dan keselamatan kerja
termasuk pencegahan kebakaran pada Menteri Ketenagakerjaan (UU 1/1970). Tidak satu pun menyebut BNPB. Peran BNPB
bersumber dari UU 24/2007: kejadian yang dinyatakan bencana nonalam, dan prabencana lewat kewajiban analisis risiko
bencana bagi pembangunan berisiko tinggi (Pasal 40 ayat (3) dan Penjelasannya menyebut pengeboran minyak bumi), dengan
persyaratan ditetapkan dan dipantau BNPB (Pasal 41) dan sanksi pidana (Pasal 75–76); Perka BNPB 5/2008 yang mengatur
persyaratan itu berstatus berlaku tetapi isinya tidak tersedia di JDIH.

### Temuan bersumber

1. **Keselamatan kerja (Menteri Ketenagakerjaan).** UU 1/1970 Pasal 2 (berlaku di semua tempat kerja, termasuk tempat
   bahan mudah terbakar disimpan); Pasal 3 ayat (1) huruf b (syarat keselamatan kerja untuk "mencegah, mengurangi dan
   memadamkan kebakaran"); Pasal 5 ayat (1) (pengawasan oleh direktur, pegawai pengawas, ahli keselamatan kerja); Pasal 9
   ayat (3) (pengurus wajib membina pemberantasan kebakaran). Sumber: `riset/E-dokumen-primer.md` §E12; pustaka
   `ri-1970-uu1` (dibuka 23 Okt 2026). Label: resmi.
2. **Keselamatan industri (Menteri Perindustrian).** UU 3/2014 Pasal 117 ayat (1) dan ayat (3) huruf j: Menteri
   mengawasi kepatuhan industri, paling sedikit atas "keamanan dan keselamatan alat, proses, hasil produksi, penyimpanan,
   dan pengangkutan". Teks 2014 yang dibaca; versi konsolidasi pascaperubahan UU 6/2023 tidak diperiksa. Sumber: riset E
   §E12; pustaka `ri-2014-uu3`. Label: resmi.
3. **Keselamatan migas (Menteri ESDM).** PP 11/1979 Pasal 2 ayat (1): tata usaha dan pengawasan keselamatan kerja atas
   pemurnian dan pengolahan migas "berada dalam wewenang dan tanggungjawab Menteri", dilimpahkan ke Dirjen dan dilaksanakan
   Kepala Inspeksi (ayat (2)–(4)); Pasal 23 mengatur tangki timbun, tanggul, dan pembatasan kebakaran atau ledakan. Permen
   ESDM 32/2021 Pasal 3 ayat (1) mewajibkan kontraktor atau pemegang izin usaha menjamin keselamatan instalasi; ayat (6)
   huruf d mewajibkan inspeksi teknis instalasi "kegiatan penyimpanan dan niaga"; Pasal 2 huruf f memuat analisis risiko;
   Pasal 50 menetapkan daerah terbatas dan terlarang hanya untuk instalasi lepas pantai. Sumber: riset E §E12; pustaka
   `ri-1979-pp11`, `esdm-2021-permen32`. Label: resmi.
4. **BNPB tidak disebut di empat peraturan sektoral itu.** Sumber: riset E §E12 ("Tidak satu pun dari empat peraturan
   menyebut BNPB"). Label: resmi (hasil pembacaan teks).
5. **Analisis risiko bencana bagi pembangunan berisiko tinggi (UU 24/2007).** Pasal 40 ayat (3): "Setiap kegiatan
   pembangunan yang mempunyai risiko tinggi yang menimbulkan bencana dilengkapi dengan analisis risiko bencana";
   Penjelasan: kegiatan itu "antara lain pengeboran minyak bumi, pembuatan senjata nuklir, pembuangan limbah, eksplorasi
   tambang, dan pembabatan hutan". Pasal 41 ayat (1): persyaratan analisis risiko bencana "disusun dan ditetapkan oleh
   Badan Nasional Penanggulangan Bencana"; ayat (3): BNPB memantau dan mengevaluasi pelaksanaannya. Pasal 75 ayat (1):
   pembangunan berisiko tinggi tanpa analisis risiko yang karena kelalaian mengakibatkan bencana dipidana penjara 3–6 tahun
   dan denda Rp300 juta–Rp2 miliar, naik bila menimbulkan kerugian harta atau kematian; Pasal 76 untuk kesengajaan.
   Pasal 7 ayat (1) huruf e: wewenang Pemerintah merumuskan kebijakan penggunaan teknologi yang berpotensi menjadi sumber
   ancaman bencana. Sumber: `lembaga/mentah/teks/uu-24-2007.json.gz`; pustaka `ri-2007-uu24`. Label: resmi.
6. **Perka BNPB 5/2008 tidak dapat dibaca.** Judul: Pedoman Persyaratan Analisis Risiko Bencana bagi Pembangunan Berisiko
   Tinggi; status BERLAKU; sumber "TIDAK ADA BNRI"; halaman JDIH menulis "Dokumen belum tersedia" dan tautan PDF di indeks
   korpus memberi HTTP 404 (dicek 24 Okt 2026). Sumber: `data/raw/hukum/indeks.json` (slug perka-nomor-5-tahun-2008);
   https://jdih.bnpb.go.id/dokumen/Peraturan/perka-nomor-5-tahun-2008; pustaka `bnpb-2008-perka5`. Label: resmi
   (metadata).
7. **Perka BNPB 12/2014 adalah instrumen peran serta sukarela.** Peran serta lembaga usaha meliputi prabencana, keadaan
   darurat, dan pascabencana (Pasal 3), disusun lewat nota kesepahaman, kerangka acuan, dan rencana kegiatan bersama BNPB
   atau BPBD (Pasal 5), dengan kewajiban melapor (Pasal 22); tidak memuat kewajiban keselamatan fasilitas. Sumber: korpus
   `perka-nomor-12-tahun-2014.json` (BN 2014/1603); pustaka `bnpb-2014-perka12`. Label: resmi.
8. **Kedaruratan B3 dikaitkan ke program PB daerah.** PP 22/2021 Pasal 433 ayat (2), sebagaimana dikutip konsiderans
   huruf c Pergub Jawa Tengah 7/2024: "program kedaruratan Pengelolaan Limbah Bahan Berbahaya dan Beracun skala provinsi
   merupakan bagian dari program penanggulangan bencana provinsi"; Pergub itu (ditetapkan 13 Mar 2024) mengatur sistem
   tanggap darurat B3 skala provinsi yang melibatkan BPBD, damkar, dinas kesehatan, dan pelaku usaha. Sumber: pustaka
   `jateng-2024-pergub7`. Label: resmi (teks PP 22/2021 sendiri tidak dibuka; pasal dikutip dari Pergub). Perban BNPB
   6/2018 menyebut "bencana dampak pengelolaan bahan berbahaya dan beracun (B3) dan limbah B3" (`lembaga/peran.csv` R116,
   resmi).
9. **Pemadaman di tingkat kab/kota.** UU 23/2014 Lampiran: "Pencegahan, pengendalian, pemadaman, penyelamatan, dan
   penanganan bahan berbahaya dan beracun kebakaran dalam Daerah kabupaten/kota"; standardisasi sarana-prasarana pemadam
   kebakaran urusan pusat (dipetakan ke Kemendagri). Sumber: `lembaga/peran.csv` R114, R115 (hlm. 333). Label: resmi.
10. **C14 dalam paket lembaga masih menulis "belum ditemukan".** `lembaga/celah.csv` C14: K/L penanggung jawab kebakaran
    industri berskala bencana "belum ditemukan di sumber yang dibaca", dan Kemenperin serta Kemnaker "masuk matriks hanya
    setelah mandat tertulisnya dibaca". Riset E §E12 (23 Okt 2026) membaca mandat itu. `lembaga/lembaga.csv` belum memuat
    kode Kementerian Perindustrian dan Kementerian Ketenagakerjaan. Label: resmi (status paket).
11. **Renas: risiko gagal teknologi naik, aksinya sempit.** Renas hlm. 29: "Peningkatan kegiatan industri termasuk
    industri yang memanfaatkan bahan minyak dan gas bumi, bahan kimia berbahaya, dan nuklir di hampir seluruh wilayah di
    Indonesia, meningkatkan potensi kejadian bencana gagal teknologi", diperbesar oleh perkembangan permukiman yang tidak
    terkendali; hlm. 28 menyebut belum optimalnya metode identifikasi potensi bahaya kegagalan teknologi. Aksi yang
    menyebut kegagalan teknologi: 1.1.2.k jaringan pengamatan kedaruratan biologi dan kimia (target 5; nama yang terbaca
    di kolom pelaksana Kementerian Perindustrian, Kementerian ESDM, BRIN; hlm. 55) dan 1.4.1.k IGT gagal teknologi berupa
    peta potensi risiko kedaruratan nuklir skala 1:50.000 (5 ke 6 peta; hlm. 68). Sumber: korpus
    `perban-nomor-1-tahun-2025.json`. Label: resmi (PJ 1.1.2.k dan 1.4.1.k tidak dapat dipastikan dari OCR bertumpuk).
12. **Bukti program nonalam nihil.** Kompendium paket `program-terbukti` memuat 25 program; kolom bencana hanya memuat
    banjir, gempa, kekeringan, tsunami, cuaca ekstrem, karhutla, gunung api, rob, longsor, gelombang-abrasi. Tidak ada
    program untuk epidemi, kegagalan teknologi, atau kebakaran TPA. Sumber: `program-terbukti/kompendium_program.csv`;
    kunci baru `program.kompendium.nonalam`. Label: olah(resmi). "Belum terbukti" berarti bukti tidak ditemukan pada
    penelusuran 23 Okt 2026, bukan program tidak bermanfaat (`program-terbukti/README.md` §5).
13. **Kapasitas kejadian kimia (JEE 2023):** CE1 (deteksi dan respons kejadian kimia) skor 3 dan CE2 (lingkungan
    pemungkin) skor 3 dari 5. Sumber: `indikator.csv`; kunci baru `nonalam.jee2023.ce1`, `.ce2`. Label: terverifikasi.

### Inferensi

- **[Inferensi tim] Matriks mandat tertulis kebakaran industri (masukan Tabel 8.3 usulan dan Bab 12):**

  | Fase | Pemimpin menurut mandat tertulis | Dasar | Peran BNPB (kosakata prinsip 14) |
  | --- | --- | --- | --- |
  | Prabencana: keselamatan instalasi migas | Kementerian ESDM (Dirjen Migas, Kepala Inspeksi) | PP 11/1979; Permen ESDM 32/2021 | data/KRB (KRB kegagalan teknologi); NSPK persyaratan analisis risiko (UU 24/2007 Pasal 41) |
  | Prabencana: keselamatan proses industri | Kementerian Perindustrian | UU 3/2014 Pasal 117 | idem |
  | Prabencana: keselamatan kerja dan pencegahan kebakaran | Kementerian Ketenagakerjaan | UU 1/1970 | – |
  | Tanggap darurat: pemadaman | Pemda kab/kota (damkar) | UU 23/2014 Lampiran | komando darurat bila status ditetapkan; keadaan tertentu (Perpres 46/2026) |
  | Tanggap darurat: kedaruratan B3 | KLH/BPLH dan pemda | PP 22/2021 Pasal 433 (dikutip Pergub) | koordinasi lewat program PB daerah |
  | Pascabencana: pengungsi dan pemulihan | Pemda; BNPB bila status ditetapkan | UU 24/2007 | koordinasi; pendanaan Dana Bersama |

- **[Inferensi tim] Satu-satunya instrumen prabencana milik BNPB untuk fasilitas industri tidak terbaca.** Kewajiban
  analisis risiko bencana (UU 24/2007 Pasal 40–41) adalah titik temu rezim sektoral dengan rezim PB, tetapi Perka 5/2008
  sebagai persyaratannya tidak tersedia teksnya dan tidak tercatat di Berita Negara. Ini kesenjangan spesifik subbab 8.4;
  naskah menulisnya sebagai "teks tidak tersedia di JDIH BNPB", bukan sebagai ketiadaan aturan.
- **[Inferensi tim] Plumpang memperlihatkan celah antara zona keselamatan dan permukiman.** Permen ESDM 32/2021 menetapkan
  daerah terlarang hanya untuk instalasi lepas pantai, sedangkan Plumpang adalah depo darat di tengah permukiman. Riset E
  menyatakan ini fakta, bukan simpulan kesenjangan, sampai peraturan tata ruang dibaca; naskah mengikuti batas itu.
- **[Inferensi tim] Penyelarasan paket.** C14 di `lembaga/celah.csv` perlu diperbarui ke hasil riset E §E12 dan dua kode
  K/L ditambahkan ke `lembaga.csv` (KERANGKA §10); sampai itu terjadi, naskah memakai nama resmi lengkap tanpa kode.

### Celah

- **Isi Perka BNPB 5/2008** tidak tersedia. Permintaan: Biro Hukum, Organisasi dan Kerja Sama BNPB (salinan dan status
  pelaksanaan; jumlah dokumen analisis risiko yang disahkan).
- **Teks PP 22/2021 Pasal 431–433** tidak dibuka langsung; isinya dikutip dari Pergub Jawa Tengah 7/2024.
- **UU 3/2014 versi konsolidasi** (pascaperubahan UU 11/2020 dan UU 6/2023) tidak diperiksa.
- **Penanggung jawab Renas 1.1.2.k dan 1.4.1.k** tidak dapat dipastikan dari OCR. Permintaan: tabel Renas dalam format
  asli (Biro Perencanaan BNPB).
- **Data inspeksi keselamatan depo dan kilang** (Kementerian ESDM) dan **jumlah fasilitas berisiko tinggi per kab**
  tidak tersedia; sebaran gagal teknologi hanya nasional.

---

## P4. Mengapa kebakaran TPA berulang pada musim kemarau, dan instrumen apa yang menjadi lini pertama?

### Inti

Kebakaran TPA terkumpul pada kemarau El Niño: 2023 (16 TPA "terbakar hebat bersamaan" menurut catatan BNPB; 14 TPA
Agustus–Oktober 2023 menurut daftar Pusdatinkom BNPB dan 35 menurut KLHK, keduanya sekunder; KLHK menyebut gas metana
sebagai penyebab mayoritas) dan kemarau 2026 (empat TPA tercatat, termasuk Jatiwaringin 15 ha dan Galuga). Tiga TPA
terbakar lagi di lokasi yang sama: Putri Cempo (2023 resmi), Jatiwaringin dan Jatibarang (2023 sekunder). Sumber kerentanannya adalah pembuangan terbuka yang sudah dilarang: UU 18/2008 mewajibkan
pemda menutup TPA pembuangan terbuka paling lama lima tahun sejak 7 Mei 2008, yaitu 7 Mei 2013, tetapi menurut KLH
pada April 2026 baru "sekitar 30 persen dari total 485 TPA" yang menghentikan pembuangan terbuka dan "sekitar 369 TPA"
masih "perlu segera bertransformasi"; porsi yang belum berhenti karena itu sekitar 70–76% (olah tim; batas 76%
bertumpu pada tafsiran tim bahwa 369 TPA itu belum berhenti). Lini pertama adalah pemerintah kab/kota: sistem tanggap darurat
pengelolaan sampah (UU 18/2008 Pasal 9 ayat (1) huruf f), pemadam kebakaran, dan Surat Edaran Menteri LH 11/2026 tentang
pembasahan dan patroli; BNPB masuk ketika status keadaan darurat ditetapkan, seperti Jatiwaringin dengan Keputusan Bupati
Tangerang 609/2026.

### Temuan bersumber

1. **Renstra mengaitkan kebakaran TPA dengan kemarau El Niño 2023.** Renstra hlm. 12: kebakaran pada El Niño 2023 "tidak
   hanya melahap hutan dan lahan perkebunan atau ladang namun kebakaran melanda sejumlah Tempat Pembuangan Akhir (TPA),
   pelabuhan, dan gunung"; kelalaian seperti membakar sampah memperparah. Sumber: korpus `perban-nomor-5-tahun-2025.json`
   hlm. 12. Label: resmi.
2. **Penyebab menurut KLHK: gas metana.** Dirjen PSLB3 KLHK, 24 Jan 2024: "sepanjang 2023 kami mencatat 35 TPA terbakar
   yang mayoritas akibat gas metana" (RRI); Direktur Pengelolaan Sampah KLHK: api TPA sulit dipadamkan karena metana dari
   sampah organik (Kompas.com 9 Nov 2023). Pustaka `rri-2024-tpa35`, `kompas-2023-tpa35`. Label: sekunder (dokumen
   primer KLHK tidak ditemukan).
3. **Pengulangan 2026 dan kaitannya dengan cuaca.** Wamen LH, 14 Sep 2026: "Sekarang lagi ada El Niño dan pemanasan
   global, sehingga kebakaran itu bisa terjadi dengan lebih mudah" (KLH); empat TPA terbakar tercatat Juni–September 2026
   (P2 temuan 20). Pustaka `klh-2026-sambutan`. Label: resmi.
4. **Larangan dan tenggat pembuangan terbuka.** UU 18/2008 Pasal 29 ayat (1) huruf f dan g melarang penanganan sampah
   dengan pembuangan terbuka di TPA dan membakar sampah tidak sesuai persyaratan teknis (sanksi lewat perda kab/kota,
   ayat (3)–(4)); Pasal 44 ayat (1): rencana penutupan TPA pembuangan terbuka paling lama 1 tahun; ayat (2): "Pemerintah
   daerah harus menutup tempat pemrosesan akhir sampah yang menggunakan sistem pembuangan terbuka paling lama 5 (lima)
   tahun terhitung sejak berlakunya Undang-Undang ini"; UU berlaku 7 Mei 2008. Tenggat = 7 Mei 2013 (kunci baru
   `nonalam.tpa.tenggat_tutup_uu18`, olah(resmi)). Pasal 9 ayat (1) huruf e: kab/kota memantau TPA pembuangan terbuka yang
   telah ditutup setiap 6 bulan selama 20 tahun. Sumber: `lembaga/mentah/teks/uu-18-2008.json.gz`; pustaka `ri-2008-uu18`.
   Label: resmi.
5. **Kepatuhan akhir 2025.** KLH/BPLH (SR.70, 17 Apr 2026): "sekitar 30 persen dari total 485 TPA telah menghentikan
   praktik open dumping" dan "masih terdapat sekitar 369 TPA yang perlu segera bertransformasi"; target dihentikan paling
   lambat 2026 dengan percepatan Agustus 2026 tanpa pengecualian (dasar RPJMN, Perpres 12/2025). Sumber: registri
   `nonalam.tpa.jumlah`, `nonalam.tpa.open_dumping`; pustaka `klh-2026-open-dumping`. Label: resmi. Rilis tidak menulis
   "belum berhenti" untuk 369 TPA itu; frasanya "perlu segera bertransformasi". **Berdampingan:** dari "sekitar 30
   persen" telah berhenti, sekitar 70% belum; bila 369 dibaca sebagai belum berhenti (tafsiran tim), 369 / 485 = 76%
   dan yang berhenti 116 TPA (24%), tidak cocok dengan "sekitar 30 persen". Ditulis sebagai rentang sekitar 70–76%
   (kunci baru `nonalam.tpa.belum_berhenti_porsi`, olah). `indikator.csv`; `nonalam-sosial/README.md` §Rekonsiliasi.
6. **Penegakan.** 273 TPA dikenai sanksi administratif (250 sepanjang 2025 dan 23 pada Januari 2026): 231 wajib
   menghentikan pembuangan terbuka, 22 dihentikan operasionalnya, 20 wajib memiliki TPA; dari 388 TPA yang diawasi
   sampai Februari 2026. Sumber: `indikator.csv`; kunci baru `nonalam.tpa.disanksi`; pustaka `klh-2026-sanksi-tpa`.
   Label: resmi.
7. **Lini pertama menurut undang-undang: kab/kota.** UU 18/2008 Pasal 9 ayat (1) huruf f: pemerintah kab/kota
   berwenang "menyusun dan menyelenggarakan sistem tanggap darurat pengelolaan sampah sesuai dengan kewenangannya";
   Pasal 1 angka 11: sistem tanggap darurat adalah kegiatan pengendalian yang meliputi pencegahan dan penanggulangan
   kecelakaan akibat pengelolaan sampah yang tidak benar; Pasal 9 ayat (3): pedoman penyusunannya diatur dengan peraturan
   menteri. Khusus DKI Jakarta kewenangan Pasal 9 ayat (1) dan (2) ada di provinsi (Pasal 46). Sumber: `uu-18-2008.json.gz`
   hlm. 7; `lembaga/peran.csv` R118. Label: resmi (penggolongan ke ancaman kebakaran TPA adalah tafsiran penyusun paket).
8. **Instrumen 2026: SE Menteri LH 11/2026.** "Peningkatan Kesiapsiagaan dan Antisipasi Kebakaran di TPA pada Kondisi
   Cuaca Panas Ekstrem", ditujukan kepada gubernur, bupati, dan wali kota; mengarahkan pembasahan sampah berkala dan
   patroli, dan kepatuhan daerah dipantau KLH. Sumber: pustaka `klh-2026-jatiwaringin`, `klh-2026-galuga`,
   `klh-2026-sambutan`. Label: resmi (teks SE tidak dibuka; isi dari tiga berita KLH).
9. **Pemadaman dan penanganan sampah di daerah.** Damkar kab/kota (UU 23/2014 Lampiran; `peran.csv` R119); penanganan
   sampah di TPA/TPST regional oleh provinsi (`peran.csv` R122); NSPK pengelolaan sampah oleh Pemerintah, dipetakan ke KLH
   (`peran.csv` R120); infrastruktur persampahan Kementerian PU (R121). Label: resmi.
10. **BNPB masuk setelah status ditetapkan.** Jatiwaringin 2026: status tanggap darurat Keputusan Bupati Tangerang
    609/2026 dan Satgas Keputusan 613/2026, lalu BNPB mengerahkan 4 helikopter water bombing, Deputi Bidang Penanganan
    Darurat menyebut pemadaman diperkuat termasuk modifikasi cuaca (BNPB 10 Jul 2026; KLH 5 Jul 2026). Sarimukti 2023:
    helikopter BNPB atas permintaan Gubernur Jawa Barat. Sumber: `peristiwa.csv`; pustaka `bnpb-2026-jatiwaringin`,
    `klh-2026-jatiwaringin`, `bnpb-2023-sarimukti`. Label: resmi. Status TPA lain umumnya hanya diketahui dari berita
    (sekunder; nomor SK tercatat: Kota Tangerang 442/Kep.1023-BPBD/2023; Kota Denpasar 188.45/2575/HK/2023 dan
    188.45/2651/HK/2023).
11. **Pencegahan oleh BNPB sebelum kemarau.** Kepala BNPB menghimpun "kekuatan awal" untuk mencegah kebakaran TPA Suwung
    pada rapat koordinasi Bali 21 Jun 2024. Sumber: pustaka `bnpb-2024-tpa-suwung` (isi dari paket `nonalam-sosial`; situs
    BNPB HTTP 521 saat dicek ulang 24 Okt 2026). Label: resmi.
12. **Data:** kebakaran TPA tidak punya jenis sendiri di DIBI; rangkaian 2023 dan 2026 hanya tercatat di rilis BNPB dan
    KLH. Sumber: `nonalam-sosial/README.md` §Rekonsiliasi. Label: resmi.

### Inferensi

- **[Inferensi tim] Kebakaran TPA adalah kepatuhan yang tertunda lebih dari 12 tahun, dipicu kemarau.** Tenggat
  penutupan pembuangan terbuka jatuh 7 Mei 2013; pada April 2026 KLH masih menyebut sekitar 369 TPA "perlu segera
  bertransformasi" dan hanya sekitar 30% yang sudah berhenti, hampir 13 tahun setelah tenggat. Gas metana dari timbunan terbuka (KLHK, sekunder) dan kemarau El Niño (Renstra, resmi; KLH 2026)
  bertemu di lokasi yang sama tiap kemarau kuat. Pencegahan utamanya karena itu kepatuhan UU 18/2008 Pasal 44 ayat (2)
  dan target KLH Agustus 2026, bukan kapasitas pemadaman.
- **[Inferensi tim] Lini pertama sudah punya dasar, belum punya pedoman.** Sistem tanggap darurat kab/kota diwajibkan
  sejak 2008, tetapi peraturan menteri pedomannya (Pasal 9 ayat (3)) tidak ditemukan; SE Menteri LH 11/2026 mengisi
  sebagian (pembasahan dan patroli) sebagai surat edaran, bukan peraturan. Ini kesenjangan spesifik subbab 8.4.
- **[Inferensi tim] Peran BNPB adalah dukungan respons berstatus, dan peringatan musim.** Pola Sarimukti dan Jatiwaringin
  sama: pemda menetapkan status, BNPB mengerahkan aset udara. Ruang BNPB di prabencana adalah peringatan musim kemarau
  ke kab/kota ber-TPA terbuka dan pencatatan; implikasinya ke Rencana Aksi Musim Kemarau 2027 ditulis di Bab 11.
- **[Inferensi tim] TPA dan "pembuangan limbah" di UU 24/2007.** Penjelasan Pasal 40 ayat (3) menyebut "pembuangan
  limbah" sebagai contoh pembangunan berisiko tinggi yang wajib analisis risiko bencana. Apakah TPA sampah termasuk
  (sampah dan limbah dibedakan dalam UU 18/2008) adalah tafsiran, sehingga naskah tidak menulisnya sebagai kewajiban yang
  berlaku tanpa pendapat hukum.
- **[Inferensi tim] Angka utama tetap 16 (BNPB), dengan 14 BNPB berdaftar nama di sampingnya.** Lima angka 2023 (14,
  15, 16, 30, 35) berbeda definisi dan periode: 16 adalah kutipan Kepala BNPB 2024 atas catatan BNPB 2023 ("terbakar
  hebat bersamaan", tanpa daftar dan tanpa rentang tanggal; kata "bersamaan" tidak cocok untuk kejadian yang tersebar
  berbulan-bulan, jadi hanya dipakai sebagai kutipan); 14 adalah daftar Pusdatinkom BNPB 19 Agt–14 Okt 2023 (sekunder);
  35 hitungan KLHK setahun penuh (sekunder). Hanya 16 yang resmi dari dokumen yang dibuka. Tabel 8.2 memuat 16 sebagai
  angka utama, daftar 14 sebagai dasar baris per lokasi, dan 35 KLHK di catatan, keduanya berlabel sekunder.

### Celah

- **Peraturan menteri pedoman sistem tanggap darurat pengelolaan sampah** (UU 18/2008 Pasal 9 ayat (3)) tidak ditemukan.
  Permintaan: KLH (status peraturan pedoman) dan data jumlah kab/kota yang sudah menyusun sistem tanggap darurat sampah.
- **Teks SE Menteri LH 11/2026** tidak dibuka; isinya dari berita KLH.
- **Daftar TPA pembuangan terbuka per kab/kota dan per provinsi** tidak tersedia; tanpa itu peta sasaran Rencana Aksi
  Musim Kemarau tidak dapat dibuat. Permintaan: KLH (SIPSN atau hasil pengawasan 388 TPA).
- **Nomor SK status darurat TPA** sebagian besar hanya dari berita; ketiadaan jenis DIBI untuk TPA menjadi rekomendasi data
  Pusdatinkom (celah KERANGKA §7 no. 14).
- **Korban kesehatan asap TPA** (ISPA, rujukan) tidak tercatat di sumber yang dibuka.
- **Rilis atau paparan BNPB untuk daftar 14 TPA 2023** tidak ditemukan; daftar hanya dari Kompas.com. Permintaan:
  Pusdatinkom BNPB.

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Kartu 8.1 | Pandemi: analog COVID-19, empat besaran (P2 Inferensi tabel), status 1.165 hari, kemungkinan "tidak dinilai", lembaga Kementerian Kesehatan (pemimpin) dan BNPB (pendukung bila status bencana) | `covid19_nasional.csv`, `skenario_terburuk.csv`, `krb_nonalam_nasional.csv`; registri `nonalam.covid19.*` | B5.11 varian (b) | Kematian berlebih hanya baris pembanding berpil "Estimasi model" dengan rentang; tidak di judul. Tanpa CFR dan tanpa perkalian penduduk terpapar. Label per baris: resmi, terverifikasi, estimasi-model |
| Kartu 8.2 | Kebakaran dan ledakan industri: Plumpang 2023 29 meninggal per 18 Mar 2023 (Pemprov DKI, resmi) dengan deret 17 meninggal dan 18 hilang per 5 Mar 2023 (Kepala BNPB) dan 33 per 24 Mar (sekunder, catatan), 1.085 pengungsi; Balongan pembanding; KRB nasional sebagai konteks; alasan penyisihan Al Khoziny, Bekasi Timur, Gunungkidul | `peristiwa.csv`, `krb_nonalam_nasional.csv`, `dibi_nonalam_sosial_rekap.csv` | B5.11 varian (b) | Judul kartu menentukan lantai (P2 Inferensi). Bila judul memuat "kegagalan teknologi", angka korban = Al Khoziny 63 (DIBI). Morowali hanya catatan sekunder. Luka tidak dipakai |
| Kartu 8.3 | Kebakaran TPA: kemarau 2023 (16 TPA "terbakar hebat bersamaan" menurut BNPB; 14 TPA berdaftar nama, sekunder; Sarimukti 80% lahan dan 3.000 KK, Suwung 32,4 ha), pengulangan 2026 (4 TPA, tiga di antaranya juga terbakar 2023), kerentanan: KLH menyebut sekitar 369 dari 485 TPA "perlu segera bertransformasi" dan sekitar 30% sudah berhenti (porsi belum berhenti sekitar 70–76%) | `peristiwa.csv`, `skenario_terburuk.csv`, `indikator.csv` | B5.11 varian (b) | Korban jiwa "–" beralasan; kerugian "–"; status darurat Sarimukti berlabel sekunder. Lembaga: pemda kab/kota (pemimpin), KLH (NSPK), BNPB (dukungan berstatus) |
| Gambar 8.1 | Kematian COVID-19 terlapor per pekan 2020–2023 (garis), dengan panel kecil per tahun 2020 dan 2021: terlapor (22.138; 121.956) lawan rentang kematian berlebih (198.861–521.585; 540.737–891.605) | `mentah/who_covid19_idn.csv` atau `covid19goid_update.json`; `covid19_nasional.csv` | G11 (panel tahunan G12) | Estimasi WHO tahunan, bukan mingguan: jangan digambar sebagai pita di sumbu pekan. Pernyataan produsen: "estimasi model WHO, bukan statistik resmi nasional". Pil keyakinan per panel |
| Gambar 8.2 | Garis waktu status: rezim bencana (Keppres 12/2020 sampai Keppres 17/2023; Perpres 17/2018 jo. 46/2026), rezim kesehatan (Keppres 11/2020 atas UU 6/2018; UU 17/2023 diundangkan 8 Agt 2023; Permenkes 1/2026), satu jalur per rezim | `regulasi.csv`; P1 temuan 2–9 | B5.31 (G23) | Tiga jalur, bukan dua; jalur Krisis Kesehatan berpil "teks rancangan" sampai salinan final dibaca. Tandai jeda 13 hari, pencabutan bersama 21 Jun 2023, dan satu penghubung jalur kesehatan ke jalur bencana pada 8 Agt 2023 (UU 17/2023 Pasal 369–370: Wabah ke bencana nasional nonalam); skala daerah tanpa penghubung |
| Tabel 8.1 | KRB nonalam nasional: COVID-19, epidemi dan wabah, kegagalan teknologi; luas bahaya rendah, sedang, tinggi; terpapar (rentan umur, miskin, disabilitas); potensi kerugian (kegagalan teknologi saja) | `krb_nonalam_nasional.csv` (Renas Tabel 2.2, 2.5, 2.6) | B5.7 | Terpapar COVID-19 dan epidemi ditulis "praktis seluruh penduduk" dengan catatan kaki angka 272.566.688 dan alasannya. Potensi kerugian berlabel "batas atas aset terpapar, bukan kerugian" |
| Tabel 8.2 | TPA terbakar 2023–2026: lokasi, tanggal mulai, luas atau persen terbakar, terdampak, status dan nomor SK, sumber, label | `peristiwa.csv` (+ baris Galuga dari KLH 9 Sep 2026) | B5.7 | Baris 2023 resmi: Sarimukti, Kopi Luhur, Putri Cempo, Suwung, Rawa Kucing, Jalupang; baris 2023 sekunder (daftar 14 Pusdatinkom BNPB, Kompas.com): Bantar Gebang, Kawatuna, Randegan, Jatiwaringin, Jatibarang, Sumompo, Purbahayu, Bakung, Cikolotok, Mandung; 2026: Jatiwaringin, Galuga, Putri Cempo, Jatibarang. Tandai TPA yang terbakar 2023 dan 2026 (Putri Cempo, Jatiwaringin, Jatibarang). Catatan: 16 TPA (BNPB, resmi) berdampingan dengan 14 (Pusdatinkom, sekunder) dan 35 (KLHK, sekunder). Antang tidak dimuat |
| Tabel 8.3 (usulan) | Mandat tertulis per jenis nonalam per fase (P3 Inferensi matriks, ditambah epidemi dan TPA) | `lembaga/peran.csv` R110–R122; riset E §E12 | B5.7 | Hanya mandat tertulis berpasal; usulan penugasan tidak di sini (prinsip 14, 17). Bila halaman sempit, digabung ke subbab 8.4 sebagai kotak |

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/mitigasi/bukti/bab-08.angka.json` dengan bentuk entri `data/angka.json` (bentuk A:
`berkas` + `jalur` relatif ke `data/`, atau `jalur_rendah`/`jalur_tinggi` untuk rentang; bentuk B: `nilai` + `pustaka`).
`data/angka.json` tidak disunting. Skrip pembangun memeriksa tiap jalur bentuk A menunjuk tepat satu baris dengan nilai
yang sama, dan bahwa tidak ada kunci yang sudah ada di `data/angka.json` atau berkas bukti lain. Kunci yang sudah ada dan
dipakai ulang: `nonalam.covid19.meninggal`, `nonalam.covid19.kematian_berlebih`, `nonalam.gagal_teknologi.terpapar`,
`nonalam.plumpang2023.meninggal`, `nonalam.tpa.terbakar_2023`, `nonalam.tpa.open_dumping`, `nonalam.tpa.jumlah`,
`renas.krb.kerugian_gagal_teknologi` (bab-02), `nonalam.jee2023.*` dan `nonalam.spar.*` (bab-02). Angka sekunder tidak
masuk registri. **Pengecualian yang dicabut:** `nonalam.plumpang2023.meninggal_akhir` (29) di `data/angka.json`
berlabel "resmi" padahal kolom sumbernya Merah Putih (sekunder); bab ini tidak memakainya lagi dan memakai kunci baru
`nonalam.plumpang2023.meninggal_pemprov_18mar` (nilai sama, sumber portal Pemprov DKI). Pemilik registri memilih:
mengganti sumber kunci lama ke `beritajakarta-2023-plumpang` (label resmi menjadi sah) atau menurunkan labelnya ke
"resmi; sekunder"; berkas bukti ini tidak menyunting `data/angka.json`.

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| nonalam.covid19.kasus | 6.811.945 | nonalam-sosial/skenario_terburuk.csv `[jenis=epidemi_pandemi,komponen=kasus_analog_covid19].nilai` | resmi | Kemenkes 2024 via Renstra hlm. 14 |
| nonalam.covid19.durasi_status_hari | 1.165 hari | idem `[jenis=epidemi_pandemi,komponen=durasi_status_bencana_nasional].nilai` | resmi | Keppres 12/2020, 17/2023 |
| nonalam.covid19.kematian_minggu_puncak | 12.444 per minggu | idem `[jenis=epidemi_pandemi,komponen=kematian_minggu_puncak].nilai` | terverifikasi | WHO dashboard |
| nonalam.covid19.meninggal.2020 | 22.138 | nonalam-sosial/covid19_nasional.csv `[metrik=meninggal_per_tahun,periode=2020,label=resmi].nilai` | resmi | covid19.go.id |
| nonalam.covid19.meninggal.2021 | 121.956 | idem `[metrik=meninggal_per_tahun,periode=2021,label=resmi].nilai` | resmi | covid19.go.id |
| nonalam.covid19.meninggal_who | 162.059 | idem `[metrik=meninggal,label=terverifikasi].nilai` | terverifikasi | WHO dashboard |
| nonalam.covid19.kematian_berlebih.2020 | 198.861–521.585 | idem `[metrik=kematian_berlebih_batas_bawah_95,periode=2020]` dan `..._batas_atas_95` | estimasi-model | WHO 2023 |
| nonalam.covid19.kematian_berlebih.2021 | 540.737–891.605 | idem, periode 2021 | estimasi-model | WHO 2023 |
| nonalam.covid19.dtp3.2019 | 85% | skenario_terburuk.csv `[jenis=epidemi_pandemi,komponen=imateriil_layanan_WHS4_100_2019].nilai` | terverifikasi | WUENIC |
| nonalam.covid19.dtp3.2021 | 67% | idem `..._WHS4_100_2021` | terverifikasi | WUENIC |
| nonalam.covid19.mcv1.2019 | 88% | idem `..._WHS8_110_2019` | terverifikasi | WUENIC |
| nonalam.covid19.mcv1.2021 | 72% | idem `..._WHS8_110_2021` | terverifikasi | WUENIC |
| nonalam.covid19.tb_notifikasi.2019 | 566.846 | idem `..._TB_notif_num_2019` | terverifikasi | WHO GHO |
| nonalam.covid19.tb_notifikasi.2020 | 393.323 | idem `..._TB_notif_num_2020` | terverifikasi | WHO GHO |
| nonalam.covid19.prov_meninggal_per100rb_maks | 161,4 (DIY) | nonalam-sosial/covid19_provinsi.csv `[provinsi=DI Yogyakarta].meninggal_per_100rb` | resmi | covid19.go.id 30 Sep 2022 |
| nonalam.covid19.prov_meninggal_terbanyak | 33.543 (Jateng) | idem `[provinsi=Jawa Tengah].meninggal` | resmi | covid19.go.id 30 Sep 2022 |
| krb.covid19.luas_bahaya_tinggi_ha | 1.181.863 ha | nonalam-sosial/krb_nonalam_nasional.csv `[bahaya=COVID-19,metrik=luas_bahaya_tinggi].nilai` | resmi | Renas Tabel 2.2 |
| krb.covid19.luas_bahaya_tinggi_jawa_ha | 971.660 ha | nonalam-sosial/krb_covid19_wilayah.csv `[tingkat=pulau,nama=Jawa].bahaya_luas_tinggi` | resmi | InaRISK |
| krb.covid19.luas_risiko_tinggi_papua_ha | 3.716 ha | idem `[tingkat=pulau,nama=Papua].risiko_luas_tinggi` | resmi | InaRISK |
| krb.epidemi.luas_bahaya_tinggi_ha | 385.762 ha | krb_nonalam_nasional.csv `[bahaya=Epidemi dan wabah penyakit,metrik=luas_bahaya_tinggi].nilai` | resmi | Renas Tabel 2.2 |
| krb.gagal_teknologi.luas_bahaya_total_ha | 186.940 ha | idem `[bahaya=Kegagalan teknologi,metrik=luas_bahaya_total].nilai` | resmi | Renas Tabel 2.2 |
| krb.gagal_teknologi.luas_bahaya_tinggi_ha | 3.600 ha | idem `[bahaya=Kegagalan teknologi,metrik=luas_bahaya_tinggi].nilai` | resmi | Renas Tabel 2.2 |
| nonalam.plumpang2023.hilang | 18 | nonalam-sosial/peristiwa.csv `[kode=plumpang2023,metrik=hilang].nilai` | resmi | Kepala BNPB via Setkab |
| nonalam.plumpang2023.pengungsi | 1.085 | skenario_terburuk.csv `[jenis=gagal_teknologi,komponen=analog_plumpang2023_pengungsi].nilai` | resmi | Kepala BNPB via Setkab |
| nonalam.alkhoziny2025.meninggal_dibi | 63 | peristiwa.csv `[kode=alkhoziny2025,metrik=meninggal,label=resmi].nilai` | resmi | DIBI |
| dibi.epidemi.meninggal.2025 | 14 | pustaka bnpb-2026-dibi | resmi; olah | olah: rekap DIBI 28 dikurangi entri ganda Nias Selatan 9 Jan 2025 (14) |
| dibi.gagal_teknologi.meninggal.2025 | 69 | idem `[tingkat=nasional,tahun=2025,kode_jenis_juklak=203,cakupan=bencana].meninggal` | resmi | DIBI |
| nonalam.tpa.sarimukti_kk_asap | 3.000 KK | skenario_terburuk.csv `[jenis=kebakaran_tpa,komponen=analog_sarimukti_kk_terdampak_asap].nilai` | resmi | BNPB 26 Agt 2023 |
| nonalam.tpa.sarimukti_persen_lahan | 80% | peristiwa.csv `[kode=sarimukti2023,metrik=persen_lahan_terbakar].nilai` | resmi | BNPB 26 Agt 2023 |
| nonalam.tpa.suwung_luas_ha | 32,4 ha | skenario_terburuk.csv `[jenis=kebakaran_tpa,komponen=analog_suwung_luas_ha].nilai` | resmi | BNPB 22 Jun 2024 |
| nonalam.tpa.jatiwaringin_luas_ha | 15 ha | peristiwa.csv `[kode=jatiwaringin2026,metrik=luas_terbakar].nilai` | resmi | BNPB 1 Jul 2026 |
| nonalam.tpa.jatiwaringin_hari_padam | 10 hari | idem `[kode=jatiwaringin2026,metrik=durasi_sampai_padam_100].nilai` | resmi | BNPB 1 dan 10 Jul 2026 |
| nonalam.tpa.disanksi | 273 TPA | nonalam-sosial/indikator.csv `[tema=tpa_open_dumping,indikator=tpa_disanksi_administratif].nilai` | resmi | KLH 26 Feb 2026 |
| nonalam.jee2023.ce1 | 3 | indikator.csv `[kode=CE1].nilai` | terverifikasi | WHO JEE 2023 |
| nonalam.jee2023.ce2 | 3 | idem `[kode=CE2].nilai` | terverifikasi | WHO JEE 2023 |
| nonalam.jee2023.r2_1 | 4 | idem `[kode=R2.1].nilai` | terverifikasi | WHO JEE 2023 |
| nonalam.covid19.selisih_kkm_bencana_hari | 13 hari | pustaka ri-2020-keppres12 | resmi | olah 31 Mar ke 13 Apr 2020 |
| nonalam.covid19.meninggal_terlapor.2020_2021 | 144.094 | pustaka satgas-2022-covid19 | resmi | olah 22.138 + 121.956 |
| nonalam.covid19.rasio_berlebih_terlapor.2020_2021 | 5,6–9,3 kali | pustaka who-2023-kematian-berlebih | estimasi-model | olah |
| dibi.gagal_teknologi.kejadian.2018_2026 | 10 | pustaka bnpb-2026-dibi | resmi | olah cakupan bencana, kode 203 |
| dibi.gagal_teknologi.meninggal.2018_2026 | 90 | pustaka bnpb-2026-dibi | resmi | olah 2 + 2 + 69 + 17 |
| nonalam.balongan2021.pengungsi | 932 | pustaka bnpb-2021-balongan | resmi | BNPB 30 Mar 2021 |
| renas.epidemi.psc.target_2029 | 510 kab/kota (baseline 90) | pustaka bnpb-2025-renas | resmi | Renas 1.2.1.f hlm. 57 |
| renas.epidemi.gladi_rs.target_2029 | 192 rumah sakit | pustaka bnpb-2025-renas | resmi | Renas 1.2.1.g hlm. 57 |
| program.kompendium.nonalam | 0 dari 25 | pustaka pantau-2026-program-terbukti | resmi | olah kolom bencana |
| nonalam.tpa.belum_berhenti_porsi | sekitar 70–76% | pustaka klh-2026-open-dumping | resmi; olah | olah: 100% − "sekitar 30 persen", dan 369 / 485 (tafsiran tim) |
| nonalam.plumpang2023.meninggal_pemprov_18mar | 29 | pustaka beritajakarta-2023-plumpang | resmi | Pemprov DKI 18 Mar 2023, data Dinkes DKI |
| nonalam.tpa.tenggat_tutup_uu18 | 7 Mei 2013 | pustaka ri-2008-uu18 | resmi | olah Pasal 44 ayat (2) |
| nonalam.tpa.terbakar_2026_tercatat | 4 TPA | pustaka klh-2026-galuga | resmi | olah BNPB dan KLH |

---

## Pustaka

Entri CSL-JSON lengkap di `naskah/mitigasi/bukti/bab-08.pustaka.json` (52 entri; kunci `id` dipakai kolom `pustaka`
registri). Ringkas:

| id | Sumber | Verifikasi |
| --- | --- | --- |
| ri-2007-uu24 | UU 24/2007 Penanggulangan Bencana | primer |
| ri-2023-uu17 | UU 17/2023 Kesehatan (teks lengkap, salinan peraturan.go.id) | primer |
| ri-2008-uu18 | UU 18/2008 Pengelolaan Sampah | primer |
| ri-2014-uu23 | UU 23/2014 Pemerintahan Daerah (Lampiran) | primer |
| ri-2018-perpres17 | Perpres 17/2018 PB dalam Keadaan Tertentu | primer |
| ri-2026-perpres46 | Perpres 46/2026 Perubahan Perpres 17/2018 | primer |
| ri-2020-keppres7 | Keppres 7/2020 Gugus Tugas COVID-19 | primer (metadata) |
| ri-2020-keppres11 | Keppres 11/2020 Kedaruratan Kesehatan Masyarakat COVID-19 | primer |
| ri-2020-keppres12 | Keppres 12/2020 Bencana Nasional Nonalam COVID-19 | primer |
| ri-2020-perpres82 | Perpres 82/2020 Komite Penanganan COVID-19 dan PEN | primer |
| ri-2023-keppres17 | Keppres 17/2023 Berakhirnya Status Pandemi | primer |
| setkab-2023-perpres48 | Setkab, 7 Agt 2023 (Perpres 48/2023) | primer |
| kemenkes-2026-pmk1 | Permenkes 1/2026 KLB, Wabah, dan Krisis Kesehatan (teks rancangan) | primer (rancangan) |
| antara-2026-pmk1 | ANTARA Jogja, 4 Feb 2026 (Permenkes 1/2026) | sekunder |
| kemenkes-2009-kepmenkes300 | Kepmenkes 300/2009 Pedoman Episenter Pandemi Influenza | primer |
| bnpb-2025-renas | Perban BNPB 1/2025 Renas PB 2025–2029 (korpus) | primer |
| bnpb-2025-renstra | Perban BNPB 5/2025 Renstra BNPB 2025–2029 (korpus) | primer |
| bnpb-2014-perka12 | Perka BNPB 12/2014 Peran Serta Lembaga Usaha | primer |
| bnpb-2008-perka5 | Perka BNPB 5/2008 Persyaratan Analisis Risiko Bencana (metadata JDIH) | primer (metadata) |
| bnpb-2024-perban2 | Perban BNPB 2/2024 (data peringatan dini) | primer |
| bnpb-2018-perban6 | Perban BNPB 6/2018 (bencana dampak B3) | primer |
| ri-1970-uu1 | UU 1/1970 Keselamatan Kerja | primer (riset E) |
| ri-2014-uu3 | UU 3/2014 Perindustrian | primer (riset E) |
| ri-1979-pp11 | PP 11/1979 Keselamatan Kerja Pemurnian dan Pengolahan Migas | primer (riset E) |
| esdm-2021-permen32 | Permen ESDM 32/2021 Inspeksi Teknis dan Keselamatan Instalasi Migas | primer (riset E) |
| jateng-2024-pergub7 | Pergub Jawa Tengah 7/2024 Sistem Tanggap Darurat B3 (mengutip PP 22/2021 Pasal 433) | primer |
| satgas-2022-covid19 | Satgas Penanganan COVID-19, data.covid19.go.id (arsip) | primer |
| who-2026-covid-dashboard | WHO COVID-19 global data | primer |
| who-2023-kematian-berlebih | WHO (2023), estimasi kematian berlebih COVID-19 | primer |
| who-gho-imunisasi-tb | WHO GHO: WUENIC, notifikasi TB, SPAR | primer |
| who-2024-jee-idn | WHO (2024), JEE IHR Indonesia 2023 | primer |
| bnpb-2026-dibi | BNPB, DIBI dasbor publik 1, ditarik 23 Okt 2026 | primer |
| setkab-2023-plumpang | Setkab, 5 Mar 2023 (Kepala BNPB, Plumpang, per 5 Mar) | primer |
| beritajakarta-2023-plumpang | Pemprov DKI (Berita Jakarta), 18 Mar 2023 (Plumpang 29 meninggal) | primer |
| idxchannel-2023-plumpang | IDX Channel, 24 Mar 2023 (Plumpang 33 meninggal) | sekunder |
| bnpb-2021-balongan | BNPB, 29 dan 30 Mar 2021 (Balongan) | primer |
| antara-2024-morowali | ANTARA Palu, 12 Feb 2024 (Morowali 20, Polda Sulteng) | sekunder |
| investortrust-2024-morowali | Investortrust, 9 Jan 2024 (Morowali 19) | sekunder |
| bnpb-2024-tpa-suwung | BNPB, 22 Jun 2024 (16 TPA 2023; Suwung) | primer |
| bnpb-2023-sarimukti | BNPB, 26 Agt 2023 (Sarimukti) | primer |
| bnpb-2026-jatiwaringin | BNPB, 1 dan 10 Jul 2026 (Jatiwaringin) | primer |
| klh-2026-open-dumping | KLH/BPLH SR.70, 17 Apr 2026 (485 TPA; 369 belum berhenti) | primer |
| klh-2026-sanksi-tpa | KLH/BPLH, 26 Feb 2026 (273 TPA disanksi) | primer |
| klh-2026-jatiwaringin | KLH/BPLH, 5 Jul 2026 (Jatiwaringin; SE 11/2026) | primer |
| klh-2026-galuga | KLH/BPLH, 9 Sep 2026 (Galuga) | primer |
| klh-2026-sambutan | KLH/BPLH, 14 Sep 2026 (judul SE 11/2026) | primer |
| kompas-2023-tpa35 | Kompas.com, 9 Nov 2023 (35 TPA) | sekunder |
| rri-2024-tpa35 | RRI, 24 Jan 2024 (35 TPA, gas metana) | sekunder |
| detik-2023-tpa15 | detikJabar, 30 Sep 2023 (15 spot) | sekunder |
| katadata-2023-tpa30 | Katadata, 31 Okt 2023 (30 TPA dalam tiga bulan) | sekunder |
| kompas-2023-tpa14 | Kompas.com, 18 Okt 2023 (14 TPA Agustus–Oktober 2023, Pusdatinkom BNPB) | sekunder |
| pantau-2026-program-terbukti | Paket program-terbukti (kompendium 25 program) | olahan tim |

Sumber berbeda untuk bab ini: 52 entri, 42 primer (termasuk 3 hanya metadata atau teks rancangan), 9 sekunder (tidak
untuk badan teks sebagai angka utama), 1 olahan tim.

---

## Catatan revisi (24 Oktober 2026, atas temuan pemeriksa)

| No | Temuan pemeriksa | Hasil cek ke sumber | Tindakan |
| --- | --- | --- | --- |
| 1 | Temuan negatif UU 17/2023 bersandar pada transkripsi Wikisource yang bolong (tinggi) | **Benar, dan lebih berat dari dugaan.** BPK sedang pemeliharaan; teks lengkap diunduh dari peraturan.go.id (300 hlm, batang tubuh dan Penjelasan). Pasal 369–370 ternyata mengaitkan Wabah dengan status bencana nasional nonalam (usul Menteri, penetapan Presiden). Penomoran Pasal 454 juga keliru: UU 4/1984 huruf b, UU 6/2018 huruf j, bukan angka 2 dan 10 | P1 Inti, temuan 4, 4a (baru), 4b (baru), 10, Inferensi "tiga status" dan "preseden", Celah, Gambar 8.2, pustaka `ri-2023-uu17` diperbarui. Simpulan C09 diubah dari "tidak ada pengait" menjadi "pengait skala nasional ada; skala daerah tidak ditemukan". Yang tidak ditemukan kini ditelusuri pada teks lengkap, bukan transkripsi. Pemilik paket `lembaga` perlu memperbarui `celah.csv` C09 |
| 2 | Angka 14 TPA Pusdatinkom BNPB terlewat; "bersamaan" tidak cocok (sedang) | Benar. Kompas.com 18 Okt 2023 dibuka: 14 TPA dengan nama dan tanggal mulai, dari Disaster Briefing BNPB 17 Okt 2023. Rilis atau rekaman BNPB asli tidak ditemukan (tiga penelusuran), jadi label sekunder | P2 Inti, temuan 17, 19, 20, Kartu 8.3, Tabel 8.2, P4 Inti dan Inferensi "angka utama", dua Celah, pustaka `kompas-2023-tpa14`. Jatiwaringin dan Jatibarang ditandai berulang 2023 dan 2026 (2023 sekunder); Putri Cempo berulang dengan 2023 resmi. "Bersamaan" kini hanya dalam kutipan |
| 3 | Label "hari ke-2" tidak bersumber; kartu di bawah angka tercatat (sedang) | Benar. Setkab 5 Mar 2023 menulis "hingga saat ini", tanpa hari ke-. Angka 29 per 18 Mar 2023 ditemukan di portal resmi Pemprov DKI (beritajakarta.id, Kalaksa BPBD DKI, data Dinkes DKI), jadi resmi; angka 19 per 9 Mar dari siaran pers PPID di portal yang sama. Ditemukan juga 33 per 24 Mar 2023 (IDX Channel, sekunder) | Kartu 8.2 kini memakai 29 (resmi) sebagai angka utama, 17 dan 18 hilang sebagai deret awal, 33 di catatan. Kunci baru `nonalam.plumpang2023.meninggal_pemprov_18mar`; catatan kunci `nonalam.plumpang2023.hilang` dan pustaka `setkab-2023-plumpang` diperbaiki. Teks "hari ke-2" masih ada di `nonalam-sosial/peristiwa.csv` baris plumpang2023 dan `skenario_terburuk.csv` baris narasi_analog gagal_teknologi; pemilik paket memperbaikinya |
| 4 | Kunci registri `nonalam.plumpang2023.meninggal_akhir` berlabel resmi padahal sumber sekunder (sedang) | Benar untuk sumber yang dicatat kunci itu (Merah Putih). Nilainya (29) sendiri kini terdukung sumber resmi | Kunci dikeluarkan dari daftar pakai ulang; diganti kunci baru bersumber Pemprov DKI. `data/angka.json` di luar cakupan berkas bukti dan tidak disunting; pilihan untuk pemilik registri ditulis di bagian "Angka untuk registri" |
| 5 | `dibi.epidemi.meninggal.2025` = 28 terhitung ganda (sedang) | Benar. `dibi_nonalam_sosial_baris.csv` memuat dua baris identik Nias Selatan 9 Jan 2025 (14 dan 14); seluruh 28 meninggal 2025 berasal dari pasangan itu | Kunci diubah ke bentuk nilai + pustaka, nilai 14, label "resmi; olah"; 28 hanya di catatan mutu (P2 temuan 8) |
| 6 | 369 TPA "belum berhenti" dan 76,1% tampil sebagai fakta (sedang) | Benar. Rilis KLH menulis "perlu segera bertransformasi" dan "sekitar 30 persen" sudah berhenti | Frasa KLH dikutip apa adanya; porsi ditulis "sekitar 70–76%" dengan keterangan bahwa 76% bertumpu pada tafsiran tim; P4 Inti, temuan 5, Inferensi, Kartu 8.3, kunci `nonalam.tpa.belum_berhenti_porsi` diperbarui |
| 7 | "DTP3 pulih ke 91% pada 2022" memilih tahun (sedang) | Benar. `indikator.csv`: DTP3 2019–2024 = 85, 77, 67, 91, 83, 78; MCV1 = 88, 76, 72, 92, 82, 85 | Deret penuh ditampilkan, kata "pulih" dihapus, atribusi ke COVID-19 dipindah ke Inferensi; catatan kunci `nonalam.covid19.dtp3.2021` diperbarui |
| 8 | Morowali dikutip lewat agregator (sedang) | Benar sebagian. BHRRC ternyata menerbitkan ulang Jakarta Globe, bukan ANTARA. Artikel ANTARA asli ditemukan (Palu, 12 Feb 2024: Kabidhumas Polda Sulteng, 20 meninggal). Investortrust 9 Jan 2024 menulis 19 "seperti diberitakan" tanpa atribusi pejabat. Rilis Tribratanews Polda Sulteng (3 Jan dan 8 Mar 2024) diblokir HTTP 403/Cloudflare; siaran pers Kemnaker atau Kemenko Marves yang memuat angka korban tidak ditemukan | Pustaka BHRRC diganti `antara-2024-morowali`, ditambah `investortrust-2024-morowali`. Label tetap sekunder karena tidak ada rilis pemerintah yang terbuka |

Tidak ada temuan pemeriksa yang ditolak.
