# Berkas bukti BAB 5 PROFIL RISIKO MUSIM KEMARAU

Kajian: Grand Design Ketahanan Air Pulau Jawa 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9). Penulis bab menulis hanya dari berkas ini
dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/air/bukti/bab-05.angka.json`: kunci angka baru untuk registri (belum digabung ke `data/angka.json`).
- `naskah/air/bukti/bab-05.pustaka.json`: entri CSL-JSON (45 entri: 41 primer, 4 sekunder).

Bahan yang dibaca: `KERANGKA.md` §2, §4 (Bab 5), §6, §7, §8; `KEPUTUSAN.md`; `PEDOMAN-DESAIN.md` §C9 dan tabel G1–G25;
`riset/A`–`E`; paket `data/air-jawa/` (README, `kab_jawa.csv`, `dibi_kab_tahun.csv`), `data/turunan/` (daftar perhatian dan
kepekaannya, skrip `bangun/turunan.py`), `data/skenario-hidromet/` (README, `kartu_skenario.csv`, `paparan_kab.csv`,
`dibi_kab_tahun.csv`, `karhutla_provinsi.csv`, `lampiran_kekeringan_model.csv`), `data/nonalam-sosial/` (`peristiwa.csv`,
`skenario_terburuk.csv`), `data/lembaga/` (README, `peran.csv`, `matriks_air.csv`, `celah.csv`),
`data/program-terbukti/kompendium_program.csv`, `data/angka.json`; `riset/mentah/oni_cpc.txt`,
`riset/mentah/sipongi_luas_2015_2026.json`; korpus hukum (Perpres 17/2018, Perpres 46/2026, Perban 4/2020, Perban 2/2024,
Perban 1/2025, Perban 1/2026, Perban 5/2018, Perka 7/2008, Juklak 7/2026, Juknis 7/2023; UU 24/2007, UU 6/2023,
UU 17/2019, PP 122/2015 dari `data/lembaga/mentah/teks/`); `riset/mentah/dibi_hidromet.json` (tanggal baris DIBI);
berkas bukti Bab 1–4 (untuk kunci yang sudah ada); sumber web yang dibuka 24 Oktober 2026 (disebut per butir).
Perbaikan atas temuan pemeriksa dicatat di bagian terakhir berkas.

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah, dokumen atau tabel dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka (jurnal bertinjauan, data terbuka akademik atau lembaga luar negeri) |
| estimasi-model | Keluaran model yang belum diuji balik |
| asumsi-kebijakan | Pilihan penyusun |
| sekunder | Berita atau ringkasan; sumber primer tidak terbuka. **Tidak masuk badan teks**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**.

---

## Kerangka bab (dari KERANGKA.md §4, BAB 5)

- **Judul:** BAB 5 PROFIL RISIKO MUSIM KEMARAU (13 hlm).
- **Subbab:** 5.1 Kemarau 2026 dan Prakiraan BMKG; 5.2 Riwayat Kekeringan dan Krisis Air Bersih; 5.3 Sebaran Risiko
  Kekeringan per Kab/Kota; 5.4 Dampak pada Air Bersih, Pangan, dan Kesehatan; 5.5 Karhutla dan Kebakaran TPA di Jawa;
  5.6 Pengelolaan Air Saat Kemarau: Siapa Mengerjakan Apa; 5.7 Kartu Skenario Kemarau Terburuk yang Masuk Akal.
- **Tujuan bab:** menyatakan risiko kemarau Jawa dengan ukuran yang dipakai BPBD (gangguan air bersih dan pangan),
  menjelaskan perbedaan peta resmi dengan pengalaman lapangan, dan menyiapkan kemarau 2027.
- **Pertanyaan kunci:**
  1. Kab/kota mana yang memenuhi syarat daftar perhatian kekeringan, dan mengapa peta IRBI berbeda dengan pengalaman
     BPBD (contoh Gunungkidul)?
  2. Berapa kab/kota yang mencatat kekeringan pada tahun El Niño dan pada 2026, dengan catatan intensitas pelaporan?
  3. Siapa menetapkan status, menyalurkan air bersih, dan menyediakan sumber air darurat?
  4. Seperti apa kemarau terburuk yang masuk akal untuk 2026–2027, dan apa ukurannya bila korban jiwa tidak berlaku?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| IRBI kekeringan 2025 tertinggi Sukabumi (19); Temanggung, Kota Semarang, Karawang, Jombang, Jepara (18); Gunungkidul 5; Wonogiri, Pacitan, Grobogan, Blora 8; median 10. Paragraf penjelas: IRBI kekeringan dibedakan terutama oleh paparan | **Nilai dikonfirmasi** (ditambah: Kota Probolinggo juga 5; Kota Yogyakarta juga 8). **Paragraf penjelas dibantah data:** paparan KRB kekeringan 97,5–100% penduduk di semua 119 kab (median 100%), jadi paparan tidak membedakan; IRBI kekeringan mengikuti luas bahaya tinggi KRB (Spearman 0,43) jauh lebih kuat daripada jiwa terpapar (0,12). Lihat P1 |
| Kab/kota mencatat kekeringan (DIBI): 2015: 3 (5 kejadian); 2019: 76; 2023: 43; 2026 sampai 23 Oktober: 55 kab dan 1.300.190 terdampak; terdampak terbesar 2018: 4.924.057 | **Dikonfirmasi.** Ditambah: 2008 = 73 kab dan 2018 = 67 kab, keduanya bukan tahun El Niño pada puncak kemarau; 2019 netral pada JAS (ONI 0,20) tetapi IOD positif kuat (DMI JAS 0,64). Lihat P2 |
| Kekeringan Jawa 2015–2026 tidak mencatat korban jiwa | **Dikonfirmasi** dan berlaku untuk seluruh 2008–2026. Hanya untuk kekeringan: karhutla Jawa mencatat 32 meninggal dan 4 hilang 2015–2026 (T4.6a), yang masuk Kartu 5.2 |
| TPA terbakar 2023–2026 di Jawa: Sarimukti, Kopi Luhur, Putri Cempo, Rawa Kucing, Jalupang, Jatibarang, Jatiwaringin (Keputusan Bupati Tangerang 609/2026) | **Dikonfirmasi** dengan rincian tanggal: lima pada 2023; Jatiwaringin (30 Juni 2026), Putri Cempo berulang (24 September 2026), Jatibarang (30 September 2026). Nomor 609/2026 berasal dari narasi BNPB, masa berlaku status tidak disebut |
| Kematian karhutla di Jawa adalah kebakaran hutan dan gunung setempat (2015: Magetan 7, Ponorogo 5), bukan korban asap | **Angka dikonfirmasi** (DIBI): 2015 12; 2018 3; 2019 9; 2023 1; 2024 1; 2026 sampai 23 Oktober 6 meninggal dan 4 hilang (Kab. Probolinggo 5 meninggal dan 4 hilang). **Sebab:** 2015 kebakaran setempat menurut README paket `skenario-hidromet` dan KERANGKA (sumber per kejadian belum dibuka di berkas ini); 2018, 2019, 2023, 2024, dan 2026 **belum diverifikasi sebabnya**. Berita kejadian Bromo 15 Oktober 2026 (4 meninggal, 2 luka) tidak cocok dengan baris DIBI Probolinggo (10 September, 5 meninggal, 4 hilang); lihat T4.13 |
| Penyedia peringatan dini kekeringan hidrologis tidak ditemukan (C17); SPAM bersifat khusus untuk bencana dan kekeringan (PP 122/2015) | **Dikonfirmasi** (PP 122/2015 Pasal 38 huruf d dan Penjelasannya). **Ditambah:** peringatan dini kekeringan **meteorologis** BMKG ada dan terbaca primer (dasarian II Oktober 2026, kategori Awas di enam provinsi Jawa); Perban 2/2024 Pasal 7 ayat (2) huruf e memuat kekeringan sebagai data peringatan dini dari K/L |

- **Komponen (KERANGKA):** Gambar 5.1 ONI dan musim kemarau El Niño kuat 2008–2026 (G2); Gambar 5.2 koroplet IRBI
  kekeringan 2025, 5 kelas nilai (G19); Gambar 5.3 jumlah tahun tercatat kekeringan DIBI 2015–2025 per kab/kota (G19);
  Gambar 5.4 kab/kota mencatat kekeringan per tahun 2008–2026 dengan catatan pelaporan (G1); Kotak 5.1 IRBI dan
  pengalaman lapangan (B5.5); Tabel 5.1 daftar perhatian kekeringan (B5.7); Tabel 5.2 siapa mengerjakan apa saat kemarau
  (B5.7); Kartu 5.1 dan Kartu 5.2 Karhutla Jawa (B5.11; KERANGKA §4 versi final). Kebakaran TPA Jawa tidak berkartu di
  Kajian 1; 5.5 merujuk Kartu 8.3 Kajian 2. Rincian dan usulan tambahan di bagian Komponen.
- **Status data (KERANGKA):** ada (IRBI, DIBI, KRB, ONI); sebagian (rilis BMKG dan HTH per ZOM; SK status dari berita);
  celah (distribusi air per kab, puso per kab, kasus penyakit, tampungan waduk harian, Katam Kementan). **Pembaruan:**
  rilis BMKG 13 Oktober 2026 (Analisis Dinamika Atmosfer, memuat peringatan dini kekeringan meteorologis) terbaca primer;
  luas karhutla SiPongi per provinsi 2015–Juli 2026 ada di repo; produksi padi BPS 2023 untuk Jawa Tengah, Jawa Timur, dan
  nasional terbaca primer; daftar perhatian sudah dibangun paket `turunan` (varian dasar dan tiga varian kepekaan).

**Catatan lingkup untuk penulis.**

- **Lantai skenario (KERANGKA §2 butir 9) berlaku di Kartu 5.1.** Skenario kemarau tidak boleh lebih ringan daripada
  kemarau tercatat terburuk di Jawa untuk metrik yang sama. Lantai per metrik ada di P4. Angka 2026 (55 kab, 1.300.190
  terdampak) masih di bawah lantai, jadi tidak boleh dipakai sebagai angka skenario. Korban jiwa kekeringan ditulis
  "tidak tercatat", bukan "tidak berlaku" untuk seluruh kartu: korban karhutla tercatat dan berlantai (12 meninggal,
  2015; T4.6a), ditulis di Kartu 5.2 dan dirujuk satu baris di Kartu 5.1.
- **Angka model disandingkan dengan angka tercatat.** Satu-satunya keluaran model di bab ini (mesin neraca dan padi
  platform, analog 2015) hanya boleh tampil di Lampiran I, berdampingan dengan angka BPS dan DIBI (P4, butir T4.11).
- **Program.** Bab ini tidak membahas strategi (prinsip 17). Bila penulis menyebut program air saat kemarau: embung dan
  panen air hujan berposisi "belum terbukti" (P10), Sekolah Lapang Iklim "lemah" (P04), PAMSIMAS "sedang, program dengan
  syarat" (P13) menurut `program-terbukti/kompendium_program.csv` kolom `kekuatan` dan `posisi`. Tidak satu pun boleh
  ditulis "terbukti".
- **IRBI tidak dipakai memeringkat** (prinsip 7). Tabel 5.1 diurutkan menurut kode wilayah atau abjad, bukan nilai.

---

## P1. Kab/kota mana yang memenuhi syarat daftar perhatian kekeringan, dan mengapa peta IRBI berbeda dengan pengalaman BPBD (contoh Gunungkidul)?

### Inti

Menurut aturan dasar paket `turunan`, 53 dari 119 kab/kota masuk daftar perhatian kekeringan, tetapi 48 di antaranya lolos
karena punya daerah irigasi kewenangan pusat (syarat d), sehingga daftar itu lebih menggambarkan kawasan irigasi pusat yang
sering melapor kekeringan daripada wilayah krisis air bersih; empat dari sepuluh kab dengan jiwa terdampak kekeringan
terbanyak 2015–2025 (Kendal, Sumedang, Gunungkidul, Blora) berada di luar daftar. Peta IRBI berbeda dengan pengalaman BPBD
karena kajian risiko 2022–2026 tidak menilai bahaya kekeringan "tinggi" di 68 kab, termasuk seluruh Gunungkidul (148.536 ha
kelas sedang, 0 ha kelas tinggi; IRBI 5, terendah di Jawa), padahal DIBI mencatat kekeringan Gunungkidul pada 5 dari 11
tahun 2015–2025 dengan 566.351 jiwa terdampak, terbanyak keenam di Jawa. IRBI kekeringan mengikuti luas bahaya tinggi
(Spearman 0,43), bukan jumlah jiwa terpapar (0,12).

### Temuan bersumber

**Daftar perhatian (aturan dan hasil)**

- **T1.1 Aturan varian dasar.** Kab masuk bila memenuhi ≥ 2 dari: (a) IRBI 2025 kekeringan ≥ 13, yaitu batas bawah kelas
  kuintil teratas untuk 119 kab (rumus sama dengan kelas peta `bangun/visual/peta.mjs`, nilai kembar ikut); (b) kejadian
  DIBI kekeringan pada ≥ 3 dari 11 tahun 2015–2025; (c) meninggal dan hilang atau mengungsi DIBI di kuartil atas Jawa;
  (d) daerah irigasi kewenangan pusat (`irigasi_pusat_ha` > 0). Syarat (e) status darurat berulang tidak diisi karena SK
  tidak diperoleh. Sumber: `bangun/turunan.py` fungsi `daftar`, `kajian_air`; `turunan/daftar_perhatian.csv` kolom
  `ambang_irbi` = 13. Label: asumsi-kebijakan (data di baliknya resmi).
- **T1.2 Hasil: 53 kab/kota.** Sumber: `turunan/daftar_perhatian_kepekaan.csv` [kajian=air, bahaya=kekeringan,
  varian=dasar]; kunci lama `perhatian.air.kekeringan.n`. Label: asumsi-kebijakan.
- **T1.3 Syarat (c) kosong untuk kekeringan.** Meninggal, hilang, dan mengungsi kekeringan bernilai nol di semua kab
  2015–2025, jadi kuartil atasnya nol dan tidak ada kab yang memenuhi. Sumber: `air-jawa/dibi_kab_tahun.csv`
  (kelompok=kekeringan); `turunan.py` fungsi `syarat_kuartil` (nol tidak memenuhi). Label: resmi (data), olah.
- **T1.4 Komposisi syarat dari 53 kab.** (b)+(d) 26 kab; (a)+(b)+(d) 13; (a)+(d) 9; (a)+(b) 5. Jadi 48 dari 53 memenuhi
  (d); 73 dari 119 kab Jawa punya DI pusat. Sumber: `turunan/daftar_perhatian.csv` kolom `syarat_*` (dihitung penyusun
  bukti). Kunci baru `perhatian.air.kekeringan.n_syarat_d`. Label: olah(asumsi-kebijakan).
- **T1.5 Sebaran provinsi.** Jawa Tengah 23, Jawa Barat 15, Jawa Timur 13, DI Yogyakarta 1 (Sleman), Banten 1 (Kab.
  Serang), DKI Jakarta 0. Sumber: idem, kolom `prov`. Label: olah(asumsi-kebijakan).
- **T1.6 Daftar 53 kab/kota (urut kode).** Jawa Barat: Bogor, Sukabumi, Cianjur, Bandung, Tasikmalaya, Ciamis, Cirebon,
  Majalengka, Indramayu, Subang, Purwakarta, Karawang, Bekasi, Bandung Barat, Kota Tasikmalaya. Jawa Tengah: Cilacap,
  Banyumas, Purbalingga, Kebumen, Purworejo, Magelang, Boyolali, Klaten, Karanganyar, Sragen, Grobogan, Rembang, Pati,
  Jepara, Demak, Semarang, Temanggung, Batang, Pekalongan, Pemalang, Tegal, Kota Magelang, Kota Pekalongan. DI Yogyakarta:
  Sleman. Jawa Timur: Ponorogo, Blitar, Jember, Bondowoso, Situbondo, Jombang, Nganjuk, Madiun, Magetan, Ngawi, Bojonegoro,
  Tuban, Kota Mojokerto. Banten: Serang. Sumber: `turunan/daftar_perhatian.csv` [kajian=air, bahaya=kekeringan,
  masuk=True]. Label: asumsi-kebijakan.
- **T1.7 Kepekaan (paket).** Ambang (b) ≥ 2 tahun: 66 kab (+13); ≥ 4 tahun: 42 (−11); syarat (a) dua kelas teratas: 65
  (+12). Sumber: `turunan/daftar_perhatian_kepekaan.csv` varian `syarat_b_2_tahun`, `syarat_b_4_tahun`,
  `syarat_a_dua_kelas_teratas`. Kunci baru `perhatian.air.kekeringan.n_b2`, `.n_b4`, `.n_a2`. Label: asumsi-kebijakan.
- **T1.8 Kepekaan tambahan (dihitung penyusun bukti, belum ada di paket).**
  - Tanpa syarat (d): 18 kab (hanya yang memenuhi a dan b).
  - Syarat (c) diganti "menderita dan mengungsi 2015–2025 di kuartil atas Jawa" (ambang 83.509 jiwa; 30 kab memenuhi):
    58 kab; tambahan lima: Garut (112.199 terdampak), Blora (363.157), Kendal (915.097), Gunungkidul (566.351), Pandeglang
    (148.164).
  - Tanpa (d) dan (c) terdampak: 33 kab.
  Sumber: `turunan/daftar_perhatian.csv` dan `air-jawa/dibi_kab_tahun.csv` (kelompok=kekeringan, kolom
  `menderita_mengungsi`, 2015–2025; kuartil = nilai ke-floor(3n/4) dari 119 nilai terurut, sama dengan `turunan.py`
  `batas_kuartil_atas`). Kunci baru `perhatian.air.kekeringan.n_tanpa_d`, `.n_c_terdampak`, `.c_terdampak_ambang`.
  Label: olah(resmi), asumsi-kebijakan.
  - *Angka berdampingan:* berkas bukti Bab 3 (P2) menulis ambang kuartil 82.123 jiwa untuk ukuran yang sama; hitungan di
    sini 83.509 (indeks floor(3n/4), juga sama dengan `statistics.quantiles` metode bawaan). Jumlah kab yang memenuhi sama
    (30) dan daftar 58 kab sama dengan angka Bab 3 dalam kurung. Penulis memakai 83.509 karena cara hitungnya sama dengan
    skrip paket.
- **T1.9 Jiwa terdampak kekeringan terbanyak 2015–2025 (DIBI).** Kendal 915.097; Sumedang 912.478; Bandung Barat 775.520;
  Bogor 752.089; Bandung 595.121; Gunungkidul 566.351; Semarang 556.962; Bekasi 511.407; Cilacap 445.192; Blora 363.157.
  Kendal, Sumedang, Gunungkidul, dan Blora tidak masuk daftar varian dasar. Jumlah Jawa 2015–2025: 11.857.516. Sumber:
  `air-jawa/dibi_kab_tahun.csv` (kelompok=kekeringan, jumlah `menderita_mengungsi` per kab 2015–2025). Kunci baru
  `airjawa.kekeringan.terdampak_2015_2025`. Label: olah(resmi). Catatan: kolom ini juga intensitas pelaporan (P2).
- **T1.10 Tumpang tindih dengan 2026.** Dari 55 kab yang mencatat kekeringan 2026 (sampai 23 Oktober), 32 ada di daftar
  dan 23 di luar, termasuk Gunungkidul, Blora, Garut, Kendal, Bantul, Kulon Progo, Brebes, Lebak, Pandeglang. Sumber:
  `air-jawa/dibi_kab_tahun.csv` (2026, is_bencana=1) dan `turunan/daftar_perhatian.csv`. Kunci baru
  `perhatian.air.kekeringan.dibi2026_dalam_daftar`. Label: olah(resmi), DIBI 2026 sementara.

**Mengapa IRBI berbeda dengan pengalaman lapangan**

- **T1.11 Nilai IRBI 2025 kekeringan.** Sukabumi 19; Karawang, Jepara, Temanggung, Kota Semarang, Jombang 18; Batang dan
  Kota Mojokerto 17; Gunungkidul dan Kota Probolinggo 5; Wonogiri, Pacitan, Grobogan, Blora, Kota Yogyakarta 8; median 10;
  15 nilai unik untuk 119 kab. Kota Semarang (18) tidak masuk daftar: DIBI hanya 2 tahun dan tanpa DI pusat. Sumber:
  `air-jawa/kab_jawa.csv` kolom `irbi2025_kekeringan`; kunci lama `airjawa.jawa.irbi2025.kekeringan_median`,
  `airjawa.jawa.irbi2025.kekeringan_nilai_unik` (bab-03). Kunci baru `airjawa.gunungkidul.irbi2025_kekeringan`. Label:
  resmi.
- **T1.12 Paparan tidak membedakan kab.** Jiwa terpapar kekeringan KRB 2022–2026 = 97,5% sampai 100% penduduk KRB per
  kab (median 100%); untuk Jawa 99,97%. Sumber: `skenario-hidromet/paparan_kab.csv` [bahaya=kekeringan] kolom
  `krb_terpapar_jiwa` dibagi `penduduk_krb_inarisk` (`air-jawa/kab_jawa.csv`); kunci lama
  `hidromet.jawa.kekeringan.krb_porsi_penduduk_persen` (bab-02). Label: resmi, olah(resmi).
- **T1.13 Korelasi peringkat IRBI 2025 kekeringan (n = 119).** Lawan jiwa terpapar KRB 0,119; lawan penduduk KRB 0,118;
  lawan luas bahaya kelas tinggi KRB 0,430; lawan luas bahaya sedang + tinggi 0,191; lawan potensi kerugian KRB 0,344;
  lawan jumlah kejadian DIBI 2015–2025 0,178. Sumber: `air-jawa/kab_jawa.csv`, `skenario-hidromet/paparan_kab.csv`
  (Spearman dengan peringkat rata-rata untuk nilai kembar, dihitung penyusun bukti 24 Oktober 2026). Kunci baru
  `airjawa.jawa.spearman_irbi_kekeringan.luas_tinggi`, `.terpapar`; kunci lama `airjawa.jawa.spearman_irbi_dibi.kekeringan`.
  Label: olah(resmi).
  - *Membantah:* paragraf penjelas KERANGKA §4 Bab 5 ("IRBI kekeringan dibedakan terutama oleh paparan"). Data
    menunjukkan paparan hampir seragam, dan yang paling sejalan dengan IRBI adalah luas bahaya kelas tinggi.
- **T1.14 68 kab tanpa bahaya kekeringan kelas tinggi.** Luas bahaya tinggi kekeringan KRB = 0 ha di 68 dari 119 kab;
  median IRBI kelompok ini 10, kelompok lain 12. Dari 68 itu, 27 mencatat kekeringan DIBI pada ≥ 3 tahun 2015–2025
  (antara lain Gunungkidul, Blora, Bojonegoro, Tuban, Ngawi, Pati, Rembang, Bogor, Bekasi, Karawang, Subang, Cirebon).
  Luas bahaya tinggi terbesar: Garut 307.407 ha, Cianjur 263.986, Tasikmalaya 244.235, Sukabumi 171.137. Sumber:
  `skenario-hidromet/paparan_kab.csv` kolom `krb_luas_tinggi_ha`; `air-jawa/dibi_kab_tahun.csv`. Kunci baru
  `airjawa.jawa.krb_kekeringan_kab_tinggi_nol`. Label: resmi, olah(resmi).
- **T1.15 Gunungkidul menurut sumber resmi.**
  - IRBI 2025 kekeringan 5 (terendah di Jawa bersama Kota Probolinggo). `air-jawa/kab_jawa.csv` [kode=3403]. resmi.
  - KRB 2022–2026: luas bahaya kekeringan tinggi 0 ha, sedang 148.536 ha, rendah 0 ha; jiwa terpapar 774.296 = seluruh
    penduduk KRB; kecamatan berbahaya tinggi menurut lapisan platform 0 dari 18. `skenario-hidromet/paparan_kab.csv`
    [kode=3403, bahaya=kekeringan]. resmi (KRB); kolom kecamatan = estimasi-model.
  - DIBI: kekeringan tercatat 2008–2013, 2017–2019, 2023, 2024, dan 2026 (12 dari 19 tahun 2008–2026); 2015–2025 lima
    tahun dengan terdampak 2017: 132.681; 2018: 116.216; 2019: 220.429; 2023: 43.156; 2024: 53.869 (jumlah 566.351).
    Terdampak 2019 = 28,5% penduduk KRB Gunungkidul. 2026 (sementara): 1 kejadian, 239 terdampak. `air-jawa/dibi_kab_tahun.csv`
    [kode=3403, kelompok=kekeringan, is_bencana=1]. resmi, olah(resmi).
  - Status daftar: hanya syarat (b); tidak masuk varian dasar, masuk bila (c) memakai terdampak (T1.8).
  Kunci baru `airjawa.gunungkidul.krb_kekeringan_luas_tinggi`, `.krb_kekeringan_luas_sedang`,
  `.dibi_tahun_kekeringan_1525`, `.terdampak_kekeringan_1525`, `.terdampak_2019`.
- **T1.16 Pengalaman BPBD Gunungkidul 2026 (sekunder, hanya pembanding).** NU Online, 27 Agustus 2026: Gunungkidul
  menetapkan siaga darurat kekeringan lewat Keputusan Bupati Nomor 154/KPTS/2026, berlaku 1 Juni sampai 31 Agustus 2026
  (https://www.nu.or.id/daerah/kekeringan-di-gunung-kidul-lazisnu-diy-salurkan-30-ribu-liter-air-bersih-ke-saptosari-5qoQS,
  diakses 24 Oktober 2026). RRI Yogyakarta, 5 Agustus 2026: anggaran droping air BPBD Gunungkidul Rp346 juta untuk 800
  tangki, 200 tangki tersalur sampai awal Agustus, BPBD menyiapkan Belanja Tidak Terduga (BTT)
  (https://rri.co.id/yogyakarta/regional/2626384/anggaran-dropping-air-sisa-600-tanki-bpbd-gunungkidul-siapkan-skema-btt,
  diakses 24 Oktober 2026). Label: sekunder. Teks Keputusan Bupati tidak dibuka.
  - *Dibantah oleh / berdampingan dengan:* DIBI 2026 Gunungkidul hanya 1 kejadian dan 239 terdampak (T1.15), padahal
    status siaga berjalan tiga bulan menurut berita. Keduanya ditulis berdampingan sebagai contoh kekurangan catat DIBI
    2026, bukan sebagai angka dampak.
- **T1.17 Konteks lapangan DIY yang resmi.** Hari tanpa hujan terpanjang di Indonesia 131 hari di Kab. Bantul (BMKG, 22
  September 2026; kunci lama `bmkg.musim_2026.hth_terpanjang_bantul`). Peringatan dini kekeringan meteorologis dasarian II
  Oktober 2026 menempatkan DI Yogyakarta di kategori Awas (P2, T2.9). Rumah tangga DIY yang air minum utamanya sumur
  bor/pompa, sumur terlindung, atau mata air terlindung 57,80% dan leding 10,33% (2023; kunci lama
  `airjawa.diy.sumur_mata_air_terlindung_2023`, bab-04). Label: resmi.
- **T1.18 Peta bahaya kekeringan terpadu belum ada.** Renas PB 2025–2029 aksi 1.4.1.e "Penyelenggaraan IGT integrasi
  bahaya kekeringan": baseline 2024 N/A, target 2029 = 1 dokumen/peta, penanggung jawab BMKG dan Kementerian Pertanian,
  diprioritaskan untuk lokus prioritas intervensi. Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 67
  [`bnpb-2025-renas`]. Kunci baru `renas.aksi_141e.target_2029`. Label: resmi.
- **T1.19 Rumus dan parameter bahaya kekeringan KRB tidak terbuka.** Lampiran Perka BNPB 2/2012 (rumus R = H × V / C dan
  parameter per bahaya) tidak ada di korpus lokal; penelusuran web 24 Oktober 2026 tidak menemukan dokumen metode BNPB
  untuk bahaya kekeringan. Sumber: `riset/A-dokumen-bnpb.md` §1.1 [`bnpb-2012-pengkajian-risiko`]. Label: resmi (status
  Perka); parameter tidak diketahui.

### Inferensi

- **[Inferensi tim]** Daftar varian dasar mengukur "kab beririgasi pusat yang sering melapor kekeringan". Itu relevan untuk
  kekeringan pertanian, tetapi pertanyaan Kepala BNPB untuk musim kemarau adalah gangguan air bersih. Usul untuk 3.5 dan
  Tabel 5.1: kunci syarat (c) kekeringan pada "menderita dan mengungsi kuartil atas" (58 kab), karena syarat (c) persis teks
  KERANGKA kosong untuk kekeringan dan membuat (d) menentukan 48 dari 53 kab. Pilihan ini tetap Asumsi kebijakan, dan kedua
  daftar ditampilkan dengan kolom syarat yang dipenuhi.
- **[Inferensi tim]** Perbedaan IRBI dengan lapangan di Gunungkidul bukan bukti bahwa IRBI salah, melainkan bahwa IRBI
  mengukur hal lain. Kelas bahaya KRB tampaknya tidak menangkap kekurangan air pada wilayah yang airnya bergantung pada sumur
  dan mata air; DIBI menangkap gangguan air bersih yang dilaporkan. Dugaan penyebab hidrogeologis (karst) belum diuji karena
  parameter bahaya KRB tidak terbuka (T1.19), jadi naskah tidak boleh menyebut karst sebagai sebab tanpa label.
- **[Inferensi tim]** Kotak 5.1 paling jujur bila memakai dua kolom berdampingan untuk 4–6 kab (mis. Gunungkidul, Blora,
  Kendal, Sukabumi, Kota Semarang): IRBI 2025, luas bahaya tinggi KRB, tahun berkejadian DIBI, jiwa terdampak DIBI, status
  daftar. Pesannya: kab dengan nilai IRBI rendah tidak berarti tanpa gangguan air bersih.
- **[Inferensi tim]** Aksi Renas 1.4.1.e (IGT bahaya kekeringan terpadu, target 2029) adalah jalur resmi untuk menutup beda
  ini; BNPB dapat mengusulkan agar data gangguan air bersih BPBD masuk sebagai validasi peta itu.

### Celah

- Parameter bahaya kekeringan KRB 2022–2026 dan metode IRBI 2025 (KD-4) tidak terbuka. Penyajian: "kelas bahaya KRB" tanpa
  penjelasan parameter; permintaan ke Direktorat Pemetaan dan Evaluasi Risiko Bencana BNPB.
- Varian (c) terdampak dan varian tanpa (d) dihitung penyusun bukti; `bangun/turunan.py` baru membangun varian dasar dan
  tiga varian kepekaan. Sebelum naskah final, pemilik paket (`pipa-data`) menambah kedua varian dan uji tolaknya.
- SK status siaga/tanggap darurat kekeringan per kab (syarat e) tidak diperoleh; Keputusan Bupati Gunungkidul 154/KPTS/2026
  hanya diketahui dari berita. Permintaan data ke enam BPBD provinsi dan Pusdatinkom; JDIH Kabupaten Gunungkidul belum
  ditelusuri.
- Data hidrogeologi (sumber air, CAT) per kab untuk menguji dugaan karst tidak ada (KERANGKA §7 butir 16).

---

## P2. Berapa kab/kota yang mencatat kekeringan pada tahun El Niño dan pada 2026, dengan catatan intensitas pelaporan?

### Inti

DIBI mencatat kekeringan di 3 kab/kota Jawa pada 2015 (ONI JAS 1,73, El Niño kuat), 43 pada 2023 (ONI JAS 1,25), dan 55
pada 2026 sampai 23 Oktober (ONI JAS 2,16; 1.300.190 terdampak, sementara), sedangkan angka tertinggi justru tercatat pada
tahun tanpa El Niño di puncak kemarau: 76 kab pada 2019 (ONI JAS 0,20, tetapi IOD positif kuat), 73 kab pada 2008, dan
terdampak terbesar 4.924.057 jiwa pada 2018 (ONI JAS 0,30). Dua ukuran DIBI memberi hasil berbeda dan ditulis
berdampingan: peringkat jumlah kab per tahun 2008–2025 lebih sejalan dengan indeks IOD (Spearman 0,55) daripada ONI
(0,32), sedangkan jiwa terdampak 2012–2025 sejalan dengan ONI dan IOD sama kuat (0,66 dan 0,67). **[Inferensi tim]**
Karena jumlah kab tidak mengikuti kekuatan El Niño, jumlah kab dan kejadian DIBI dibaca sebagai intensitas pelaporan.

### Temuan bersumber

- **T2.1 Seri DIBI kekeringan Jawa 2008–2026** (kab dengan kejadian, kejadian, jiwa terdampak; is_bencana=1) bersama indeks
  iklim puncak kemarau:

  | Tahun | ONI JAS | DMI JAS (rerata Jul–Sep) | Kab/kota | Kejadian | Terdampak |
  | --- | ---: | ---: | ---: | ---: | ---: |
  | 2008 | −0,20 | 0,15 | 73 | 155 | tidak dicatat (0) |
  | 2009 | 0,56 | −0,13 | 26 | 35 | tidak dicatat (0) |
  | 2010 | −1,24 | −0,11 | 4 | 4 | tidak dicatat (0) |
  | 2011 | −0,50 | 0,26 | 54 | 91 | tidak dicatat (0) |
  | 2012 | 0,39 | 0,55 | 64 | 160 | 225.006 |
  | 2013 | −0,34 | −0,23 | 42 | 42 | 2.223.225 |
  | 2014 | 0,07 | −0,29 | 5 | 5 | 137.951 |
  | 2015 | 1,73 | 0,36 | 3 | 5 | 213.399 |
  | 2016 | −0,34 | −0,55 | 0 | 0 | 0 |
  | 2017 | −0,07 | 0,30 | 7 | 10 | 222.505 |
  | 2018 | 0,30 | 0,26 | 67 | 90 | 4.924.057 |
  | 2019 | 0,20 | 0,64 | 76 | 81 | 1.963.378 |
  | 2020 | −0,43 | −0,02 | 12 | 14 | 121.556 |
  | 2021 | −0,46 | −0,13 | 7 | 13 | 92.927 |
  | 2022 | −0,78 | −0,25 | 3 | 4 | 13.231 |
  | 2023 | 1,25 | 0,76 | 43 | 98 | 3.265.382 |
  | 2024 | −0,04 | 0,14 | 45 | 63 | 908.603 |
  | 2025 | −0,26 | −0,32 | 18 | 18 | 132.478 |
  | 2026* | 2,16 | tidak tersedia | 55 | 67 | 1.300.190 |

  \* 2026 sampai 23 Oktober, sementara. Kejadian = jumlah `jumlah_kejadian` (pecahan 1/k untuk kejadian lintas k kab;
  2023 = 98, sedangkan baris laporan 107). 2025 dan 2026 masing-masing punya satu kab tambahan berstatus `is_bencana = 0`.
  Sumber: `air-jawa/dibi_kab_tahun.csv` (kelompok=kekeringan) [`bnpb-dibi`], dihitung penyusun bukti; ONI dari
  `riset/mentah/oni_cpc.txt` [`noaa-2026-oni`]; DMI dari NOAA PSL, DMI HadISST1.1 (data bulanan, berlabel "Preliminary"),
  https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data (diakses 24 Oktober 2026) [`noaa-psl-dmi`]; data DMI
  2026 baru sampai Mei. Kunci lama `airjawa.kekeringan.kab_2015/2019/2023/2026`, `airjawa.kekeringan.terdampak_2026`,
  `hidromet.jawa.kekeringan.dibi_terdampak_2018`, `oni.jas_2015`, `oni.jas_2026`. Kunci baru `airjawa.kekeringan.kab_2008`,
  `.kab_2018`, `.kab_2024`, `.terdampak_2019`, `.terdampak_2023`, `oni.jas_2019`, `oni.jas_2018`, `oni.jas_2023`,
  `dmi.jas_2015`, `dmi.jas_2018`, `dmi.jas_2019`, `dmi.jas_2023`. Label: resmi (DIBI); terverifikasi (ONI, DMI).
- **T2.2 Kolom terdampak 2008–2011 bernilai nol karena tidak dicatat**, bukan karena tanpa dampak (2008: 73 kab dan 155
  kejadian, terdampak 0). Sumber: idem. Label: resmi; tafsiran "tidak dicatat" = olah.
- **T2.3 Tahun El Niño kuat dalam periode.** Musim dengan ONI NDJ ≥ 1,5 pada 2008–2025: 2009/10 (1,50), 2015/16 (2,59),
  2023/24 (1,99), yaitu 3 dari 18 musim. Pada puncak kemarau (JAS), hanya 2015 yang ≥ 1,5 (1,73); 2023 = 1,25; 2009 = 0,56.
  2026 JAS = 2,16 (tertinggi dari 77 nilai JAS 1950–2026, bab-01). 2019: El Niño lemah ASO 2018 sampai MJJ 2019 berakhir
  sebelum puncak kemarau (JJA 0,38; JAS 0,20). Sumber: `riset/mentah/oni_cpc.txt` [`noaa-2026-oni`]. Kunci baru
  `enso.elnino_kuat_musim_2008_2025`, `oni.ndj_2009`. Label: terverifikasi; hitungan olah.
- **T2.4 Korelasi peringkat jumlah kab berkejadian per tahun (2008–2025, n = 18):** dengan ONI JAS 0,321; dengan DMI JAS
  0,553. Jiwa terdampak 2012–2025 (n = 14): dengan ONI JAS 0,660; dengan DMI JAS 0,666. Sumber: T2.1, dihitung penyusun bukti.
  Kunci baru `airjawa.kekeringan.spearman_kab_dmi`, `.spearman_kab_oni`, `.spearman_terdampak_oni`,
  `.spearman_terdampak_dmi`. Label: olah(resmi, terverifikasi); sampel kecil.
  - *Wajib berdampingan:* jumlah kab lebih sejalan dengan IOD; jiwa terdampak sejalan dengan ONI dan IOD sama kuat. Naskah
    tidak boleh mengutip pasangan jumlah kab saja.
- **T2.5 IOD memodulasi kekeringan Jawa.** Kekeringan meteorologis di delapan kabupaten penghasil padi terbesar di Jawa
  dimodulasi El Niño dan IOD positif; keparahan bergantung pada keduanya terjadi bersamaan, durasi lebih dimodulasi IOD.
  Sumber: Siswanto dkk. (2022) melalui `riset/B-air-jawa.md` §4.4 [`siswanto-2022-kekeringan`]. Label: terverifikasi
  (oleh riset B; artikel tidak dibuka ulang di berkas ini).
- **T2.6 2026 per provinsi (DIBI, sementara).** Jawa Tengah 25 kab, 738.353 terdampak (56,8% dari Jawa); Jawa Barat 14,
  356.352; Banten 5, 119.090; Jawa Timur 8, 84.105; DI Yogyakarta 3, 2.290; DKI Jakarta 0. Sumber: `air-jawa/dibi_kab_tahun.csv`
  (2026). Kunci baru `airjawa.kekeringan.kab_2026_jateng`, `.terdampak_2026_jateng`. Label: olah(resmi), sementara.
- **T2.7 Patahan dan cara catat.** Jumlah kejadian DIBI pecahan per kab (Juklak 7/2023); `is_bencana = false` baru dipakai
  sejak data 2024; ambang kejadian bencana cukup satu kriteria (mis. 50 orang terdampak). Sumber: `air-jawa/README.md` §3;
  berkas bukti Bab 3 P2 (kunci `juklak_2023.ambang.*`). Label: resmi.
- **T2.8 Kemarau 2026 menurut BMKG.** Prediksi 10 Juni: kemarau "lebih kering dan lebih panjang dibanding rata-rata
  normalnya", puncak Agustus di 369 ZOM termasuk sebagian besar Jawa [`bmkg-2026-musim-kemarau`]. Siaran 22 September:
  indeks ENSO JAS +2,63 (El Niño sangat kuat), IOD Agustus +0,376 menuju positif; awal musim hujan mundur di 529 ZOM
  (61,08% luas daratan); Jawa mulai November (sebagian) dan Desember (sebagian besar), puncak Januari (sebagian) dan Februari
  2027 (sebagian besar) [`bmkg-2026-musim-hujan`]. Kunci lama `bmkg.musim_2026.*` (bab-01). Label: resmi.
- **T2.9 Kondisi terbaru (BMKG, rilis 13 Oktober 2026).** Indeks ENSO (3 bulanan) ASO +3,08 (El Niño sangat kuat);
  anomali Niño 3.4 dasarian I Oktober +3,33; indeks IOD dasarian +0,703 (September +0,72). Peringatan dini kekeringan meteorologis berlaku dasarian II Oktober 2026: kategori Awas di Banten,
  DKI Jakarta, Jawa Barat, Jawa Tengah, DI Yogyakarta, dan Jawa Timur; Siaga di DKI Jakarta dan Jawa Tengah; Waspada di
  beberapa kab/kota Jawa Tengah (nama kab/kota tidak tercantum). Prakiraan hujan dasarian II dan III Oktober: sebagian besar
  Jawa kategori rendah (< 50 mm/dasarian); dasarian I November rendah di pesisir utara Jawa Barat dan Jawa Tengah, DIY,
  sebagian Jawa Tengah bagian timur, sebagian besar Jawa Timur dan Madura. Sumber: BMKG, Analisis Dinamika Atmosfer
  Dasarian I Oktober 2026, https://www.bmkg.go.id/iklim/analisis-dinamika-atmosfer-dasarian-i-oktober-2026 (diakses 24
  Oktober 2026) [`bmkg-2026-dinamika-okt1`]. Kunci baru `bmkg.dasarian_okt1_2026.enso_aso` (kunci yang sama dan nilai yang
  sama sudah ada di `naskah/mitigasi/bukti/bab-07.angka.json`), `bmkg.dasarian_okt1_2026.nino34`, `.iod`,
  `bmkg.pdkm_okt2_2026.prov_awas_jawa`. Label: resmi.
  - *Pemutakhiran (BMKG, Analisis Dinamika Atmosfer Dasarian II Oktober 2026, rilis 23 Oktober 2026):* indeks ENSO ASO
    +3,05; Niño 3.4 dasarian +3,19; IOD dasarian +0,765. Peringatan dini kekeringan meteorologis dasarian III Oktober 2026:
    Awas di beberapa kab/kota Banten, Jawa Barat, DI Yogyakarta, dan Jawa Timur; Siaga di Banten dan Jawa Timur; Waspada di
    Banten dan Jawa Tengah. https://www.bmkg.go.id/iklim/analisis-dinamika-atmosfer-dasarian-ii-oktober-2026 (diakses 24
    Oktober 2026) [`bmkg-2026-dinamika-okt2`]. Kunci baru `bmkg.dasarian_okt2_2026.enso_aso`,
    `bmkg.pdkm_okt3_2026.prov_awas_jawa` (4). Label: resmi.
  - *Angka berdampingan:* indeks ENSO ASO +3,08 (BMKG, 13 Oktober) dan +3,05 (BMKG, 23 Oktober); indeks ENSO JAS +2,63 (BMKG,
    22 September, angka September); Niño 3.4 dasarian +3,33 (BMKG, 13 Oktober); ONI JAS 2,16 (NOAA). Indeks berbeda periode
    dan metode; ditulis dengan nama indeks dan tanggal rilis masing-masing.
- **T2.10 Angka sekunder yang bertentangan (hanya pembanding).** 2015: berita mengutip BNPB menulis kekeringan di 102
  kab/kota di 16 provinsi (akhir Juli 2015), sedangkan DIBI mencatat 3 kab di Jawa; 2023: Kapusdatinkom BNPB dikutip berita
  menyebut 70–80% kab/kota di semua provinsi Jawa krisis air bersih (17 Oktober 2023), sedangkan DIBI mencatat 43 dari 119
  kab (36%). Sumber: `riset/B-air-jawa.md` §8.3. Label: sekunder.
  - *Dibantah oleh:* angka DIBI di T2.1. Keduanya ditulis berdampingan di Gambar 5.4 sebagai catatan pelaporan, tanpa
    angka sekunder di judul.
- **T2.11 Pembanding nasional jangan dicampur.** DIBI 2015 nasional 232.348 terdampak; Jawa 213.399. README
  `skenario-hidromet` baris 169 menulis angka nasional. Sumber: `skenario-hidromet/kartu_skenario.csv`
  [skenario=kekeringan_2015, metrik=dibi_terdampak_2015, wilayah=nasional/jawa]. Label: resmi.
- **T2.12 Korban jiwa kekeringan nol di semua tahun 2008–2026.** Sumber: `air-jawa/dibi_kab_tahun.csv`; kunci lama
  `dibi.jawa.kekeringan.meninggal_2015_2026`. Label: resmi.

### Inferensi

- **[Inferensi tim]** Kekuatan El Niño tidak cukup untuk menjelaskan jumlah kab dalam catatan DIBI. Tahun dengan El Niño
  terkuat di puncak kemarau (2015) justru hampir kosong, sedangkan 2008 dan 2018 yang netral tercatat luas. Untuk jiwa
  terdampak 2012–2025, korelasi dengan ONI (0,66) dan IOD (0,67) setara (T2.4), jadi kesimpulan "intensitas pelaporan"
  berlaku untuk jumlah kab dan kejadian, bukan bukti bahwa El Niño tidak berpengaruh. Penulis tidak boleh menyebut 2019
  atau 2018 sebagai "tahun El Niño", dan tidak boleh menyimpulkan bahwa 2026 "lebih ringan" dari 2019 karena 55 < 76.
- **[Inferensi tim]** IOD positif tampak penting untuk Jawa (2019 dan 2023 sama-sama DMI JAS > 0,6), sejalan dengan T2.5.
  Dengan 18 titik data, korelasi 0,55 hanya isyarat, bukan model; cukup untuk memilih varian skenario 2027 (P4), tidak cukup
  untuk prakiraan.
- **[Inferensi tim]** Gambar 5.4 harus memuat catatan "jumlah kab dan kejadian DIBI = intensitas pelaporan" dan menandai tiga
  hal: kolom terdampak kosong 2008–2011, patahan `is_bencana` 2024, dan 2026 sementara. ONI dan DMI ditulis sebagai baris angka
  di bawah batang, bukan sumbu kedua (G25 melarang sumbu ganda).
- **[Inferensi tim]** Untuk Kepala BNPB, pesan subbab 5.2 adalah ketiadaan alat ukur dampak kemarau yang konsisten, sehingga
  permintaan data operasional kemarau 2026 (keputusan 14 hari butir 3, KERANGKA §6) menjadi syarat untuk menilai kemarau 2027.

### Celah

- Rincian kab/kota peringatan dini kekeringan meteorologis BMKG untuk Jawa tidak tercantum di rilis 13 Oktober (hanya
  provinsi). Penyajian tingkat provinsi; tabel per ZOM atau per kab diminta ke BMKG (KERANGKA §7 butir 35).
- Rilis BMKG 2 Oktober 2026 tetap tidak terbuka primer (riset E, E9). Persistensi El Niño sampai awal 2027 kini bersumber
  primer dari siaran pers BMKG 10 Juni 2026 (T4.2); InfoPublik hanya dipakai untuk frasa "awal dan puncak musim hujan
  berdekatan".
- DMI 2026 di NOAA PSL baru sampai Mei; untuk 2026 dipakai indeks IOD BMKG (+0,703), dengan nama indeksnya.
- Data distribusi air, desa terdampak, dan status per kab 2015–2026 dari BPBD tidak ada, sehingga keparahan antartahun tidak
  dapat dinilai di luar DIBI. Permintaan data ke Pusdalops dan enam BPBD provinsi (peta jalan 100 hari).

---

## P3. Siapa menetapkan status, menyalurkan air bersih, dan menyediakan sumber air darurat?

### Inti

Status siaga atau tanggap darurat kekeringan ditetapkan bupati/wali kota, gubernur, atau Presiden menurut tingkatannya, dan
status itu menjadi dasar permohonan Dana Siap Pakai ke Kepala BNPB; tanpa status daerah, BNPB hanya dapat bertindak lewat
"keadaan tertentu" setelah rapat koordinasi menko atau lewat penetapan risiko berdampak luas oleh Kepala BNPB; kondisi dan
tata cara keadaan tertentu diatur dalam pedoman yang ditetapkan Kepala BNPB sendiri (Perpres 46/2026 Pasal 3 ayat (4)), dan
pedoman yang masih berlaku (Perban 5/2018) hanya memuat kriteria kekeringan kualitatif "kemarau panjang". Dalam keadaan
memaksa, pemerintah pusat dan daerah menurut kewenangan wilayah sungai dapat mengatur penggunaan sumber daya air untuk
kebutuhan pokok saat kekeringan (UU 17/2019 Pasal 31). Penyaluran air
bersih adalah pemenuhan kebutuhan dasar tanggap darurat dengan standar 7 liter per orang per hari pada tiga hari pertama lalu
15 liter, sedangkan kewajiban memenuhi kebutuhan pokok minimal air warga melekat pada pemerintah kab/kota dan SPAM "bersifat
khusus" untuk bencana dan kekeringan menjadi kewenangan pusat dan provinsi. Peringatan dini kekeringan meteorologis ada di
BMKG; penyedia peringatan dini kekeringan hidrologis dan pelaksana sumber air darurat jangka menengah tidak ditunjuk di rezim
penanggulangan bencana.

### Temuan bersumber

**Status dan dasar bertindak**

- **T3.1 Penetap status.** "Penentuan status Keadaan Darurat Bencana ... untuk tingkat nasional ditetapkan oleh Presiden,
  tingkat daerah provinsi oleh gubernur, dan tingkat daerah kabupaten/kota oleh bupati/wali kota" (Perpres 17/2018 Pasal 2
  ayat (2)). Keadaan darurat meliputi siaga darurat, tanggap darurat, dan transisi darurat ke pemulihan (Pasal 1 angka 3).
  Sumber: korpus `perpres-nomor-17-tahun-2018.json` hlm. 3 [`ri-2018-perpres17`]; `lembaga/peran.csv` R014, R015. Label:
  resmi.
- **T3.2 Definisi siaga darurat.** "keadaan ketika potensi ancaman bencana sudah mengarah pada terjadinya bencana yang
  ditandai dengan adanya informasi peningkatan ancaman berdasarkan sistem peringatan dini yang diberlakukan dan pertimbangan
  dampak yang akan terjadi di masyarakat" (Perban 4/2020 Pasal 1). Sumber: korpus `perban-nomor-4-tahun-2020.json` hlm. 3
  [`bnpb-2020-dsp`]. Label: resmi.
- **T3.3 Keadaan tertentu.** Kepala BNPB dapat menyelenggarakan penanggulangan bencana termasuk kemudahan akses "setelah
  mendapatkan keputusan dalam rapat koordinasi antarkementerian/lembaga yang dikoordinasikan oleh menteri koordinator" pada
  kondisi (a) potensi bencana dengan tingkat ancaman maksimum, (b) telah terjadi evakuasi atau "gangguan fungsi pelayanan umum
  yang berdampak luas terhadap kehidupan sosial dan ekonomi masyarakat", dan/atau (c) daerah pascakonflik berkapasitas fiskal
  rendah (Perpres 17/2018 Pasal 3 sebagaimana diubah Perpres 46/2026, ditetapkan 16 Juli 2026). Sumber: korpus
  `perpres-nomor-46-tahun-2026.json` hlm. 3–4 [`ri-2026-perpres46`]. Label: resmi.
- **T3.3a Pedoman keadaan tertentu didelegasikan ke Kepala BNPB.** "Ketentuan lebih lanjut mengenai kondisi dan tata cara
  pelaksanaan penyelenggaraan penanggulangan bencana sebagaimana dimaksud pada ayat (2) dan ayat (3), diatur dalam pedoman
  yang ditetapkan oleh Kepala Badan Nasional Penanggulangan Bencana" (Perpres 17/2018 Pasal 3 ayat (4) sebagaimana diubah
  Perpres 46/2026). Sumber: korpus `perpres-nomor-46-tahun-2026.json` hlm. 3 [`ri-2026-perpres46`]. Label: resmi.
  - **Status pedoman.** Pedoman baru untuk Perpres 46/2026 tidak ditemukan di korpus JDIH BNPB lokal (peraturan BNPB 2026
    di korpus: Perban 1, 2, 3/2026; Juklak 2, 4, 5, 6, 7/2026; Pedoman 1/2026; tidak satu pun tentang keadaan tertentu).
    Pedoman lama, Perban 5/2018 tentang Kondisi dan Tata Cara Pelaksanaan Penyelenggaraan Penanggulangan Bencana dalam
    Keadaan Tertentu, ditetapkan "untuk melaksanakan ketentuan Pasal 3 ayat (4) Peraturan Presiden Nomor 17 Tahun 2018" dan
    berstatus BERLAKU menurut indeks JDIH BNPB di repo. KERANGKA M08 mencatat pedoman baru belum ada. Sumber: korpus
    `perban-nomor-5-tahun-2018.json` hlm. 1; `data/raw/hukum/indeks.json` [`bnpb-2018-perban5`]. Label: resmi.
  - **Kekeringan di pedoman lama.** Potensi bencana dengan tingkat ancaman maksimum meliputi peringatan dini K/L berwenang,
    antara lain "ancaman bencana kekeringan, yang berdasarkan kajian dan/atau analisis terhadap terjadinya kemarau panjang"
    (Perban 5/2018 Pasal 3 ayat (2) huruf a angka 9). Syarat itu digabung dengan "dan" dengan evakuasi atau gangguan fungsi
    pelayanan umum berdampak luas (Pasal 3 ayat (1)), berdasarkan laporan BPBD/masyarakat yang paling sedikit meliputi korban
    meninggal dan luka berat, pengungsian yang memerlukan kebutuhan dasar, kerusakan sarana prasarana vital, gangguan
    pelayanan umum dan pemerintahan, dan kebutuhan pemulihan segera (Pasal 3 ayat (3)). Tata cara: informasi peringatan dini
    dari K/L berwenang dan kaji cepat BNPB/BPBD (Pasal 4 ayat (1)); rapat koordinasi dipimpin menko atas inisiatif BNPB, dengan
    BMKG dan Kementerian PUPR sebagai anggota (Pasal 4 ayat (2), Pasal 5, Pasal 6); SK Kepala BNPB menentukan awal dan akhir
    status (Pasal 7). Tidak ada ambang angka untuk kekeringan. Sumber: korpus `perban-nomor-5-tahun-2018.json` hlm. 3–7
    [`bnpb-2018-perban5`]. Label: resmi.
  - *Berdampingan:* Perban 5/2018 Pasal 3 ayat (1) memakai "dan" (ancaman maksimum dan evakuasi atau gangguan), sedangkan
    Perpres 46/2026 Pasal 3 ayat (2) memakai "dan/atau" antara huruf a, b, dan c. Syarat pedoman lama lebih ketat daripada
    Perpres yang baru.
- **T3.4 Dasar Dana Siap Pakai.** Bantuan DSP dalam negeri berdasarkan (a) penetapan status keadaan darurat oleh
  bupati/wali kota, gubernur, atau Presiden; (b) penetapan status keadaan tertentu; (c) pertimbangan risiko bencana berdampak
  luas yang ditetapkan Kepala BNPB (Perban 4/2020 Pasal 2 ayat (1)). Permohonan berdasarkan status kab/kota memuat laporan
  BPBD paling lambat 3 hari, keputusan status, surat permohonan bupati/wali kota, rencana kegiatan, rincian anggaran,
  pengkajian kebutuhan dari instansi teknis, dan keputusan pembentukan Pos Komando (Pasal 4). DSP dipakai selama masa
  keadaan darurat, keadaan tertentu, dan risiko berdampak luas (Pasal 20 ayat (1)); pengguna DSP termasuk BPBD provinsi dan
  kab/kota (Pasal 14). Sumber: korpus `perban-nomor-4-tahun-2020.json` hlm. 5–7, 12–13, 16 [`bnpb-2020-dsp`]. Label: resmi.
- **T3.5 Dana Bersama mencakup tahap prabencana.** Penyaluran Dana Bersama meliputi tahap prabencana, darurat bencana, dan
  pascabencana (Perban 1/2026 Pasal 2 ayat (2)). Sumber: korpus `perban-nomor-1-tahun-2026.json` hlm. 3
  [`bnpb-2026-dana-bersama`]. Label: resmi.

**Air bersih saat darurat**

- **T3.6 Kebutuhan dasar.** Pemenuhan kebutuhan dasar meliputi bantuan penyediaan "kebutuhan air bersih dan sanitasi"
  (UU 24/2007 Pasal 53 huruf a). Sumber: `lembaga/mentah/teks/uu-24-2007.json.gz` hlm. 24 [`ri-2007-uu24`]. Label: resmi.
- **T3.7 Standar minimal Perka BNPB 7/2008.** Bantuan air bersih "diberikan dalam bentuk sumber air beserta peralatannya";
  7 liter pada tiga hari pertama, selanjutnya 15 liter per orang per hari; jarak terjauh sumber air dari penampungan ke titik
  air terdekat 500 meter; air minum 2,5 liter per orang per hari. Sumber: korpus `perka-nomor-7-tahun-2008.json` hlm. 12
  (lampiran hlm. 10) [`bnpb-2008-kebutuhan-dasar`]; kunci lama `perka_2008.air_bersih_liter_hari`,
  `perka_2008.air_minum_liter_hari` (bab-03). Kunci baru `perka_2008.air_bersih_3hari_liter`, `perka_2008.jarak_sumber_air_m`.
  Label: resmi.
- **T3.8 Prioritas air saat tidak mencukupi.** "Dalam hal ketersediaan Air tidak mencukupi untuk prioritas pemenuhan ...,
  pemenuhan Air untuk kebutuhan pokok sehari-hari lebih diprioritaskan dari yang lainnya" (UU 17/2019 Pasal 8 ayat (3)
  sebagaimana diubah UU 6/2023 Pasal 53); urutan prioritas: kebutuhan pokok sehari-hari, pertanian rakyat, usaha untuk
  kebutuhan pokok melalui SPAM (ayat (2)). Sumber: `lembaga/mentah/teks/uu-6-2023.json.gz` hlm. 365 [`ri-2023-uu6`]. Label:
  resmi.
- **T3.8a Pengaturan alokasi air darurat.** "Dalam keadaan memaksa, Pemerintah Pusat dan/atau Pemerintah Daerah mengatur dan
  menetapkan penggunaan Sumber Daya Air ... untuk kepentingan konservasi, persiapan pelaksanaan konstruksi, dan pemenuhan
  prioritas penggunaan Sumber Daya Air" (UU 17/2019 Pasal 31). Penjelasan: "keadaan memaksa" adalah keadaan darurat yang
  memerlukan penanggulangan segera; contoh penggunaan untuk pemenuhan prioritas adalah "pemenuhan kebutuhan pokok sehari-hari
  pada saat terjadi kekeringan". Pemegang menurut kewenangan wilayah sungai (T3.9): pusat untuk WS lintas provinsi, lintas
  negara, dan strategis nasional; provinsi untuk WS lintas kab/kota; kab/kota untuk WS dalam satu kab/kota. Pengelola SDA di
  lapangan dapat berupa UPT (BBWS) atau BUMN/BUMD: PJT I untuk WS Brantas dan Bengawan Solo, PJT II untuk WS Citarum (UU
  17/2019 Pasal 19; PP 46/2010; PP 25/2022). Sumber: `lembaga/mentah/teks/uu-17-2019.json.gz` hlm. 23 (Pasal 31) dan hlm. 72
  (Penjelasan) [`ri-2019-uu17`]; `lembaga/matriks_air.csv` A01–A05; `lembaga/README.md` bagian Air baku. Label: resmi
  (pemetaan pemegang per WS = olah penyusun dari T3.9). Potongan UU 6/2023 di repo tidak memuat Pasal 31; apakah UU 6/2023
  mengubah pasal ini belum diperiksa pada teks lengkap.
- **T3.9 Kewajiban pemda kab/kota.** Pemerintah kab/kota memenuhi kebutuhan pokok minimal sehari-hari atas air bagi
  masyarakat di wilayahnya dan menjamin air baku pada WS dalam satu kab/kota; provinsi untuk WS lintas kab/kota; pusat untuk WS
  lintas provinsi, lintas negara, dan strategis nasional (UU 17/2019). Sumber: `lembaga/peran.csv` R073, R074;
  `lembaga/matriks_air.csv` A01–A03 [`ri-2019-uu17`]. Label: resmi (A01 dan R073 dipetakan penyusun ke Kementerian PU).
- **T3.10 SPAM bersifat khusus.** Wewenang pusat meliputi "melaksanakan Penyelenggaraan SPAM yang bersifat khusus,
  kepentingan strategis nasional, dan lintas provinsi" (PP 122/2015 Pasal 38 huruf d); provinsi untuk yang bersifat khusus,
  strategis provinsi, dan lintas kab/kota (Pasal 39 huruf c); Penjelasan: "bersifat khusus" dapat meliputi "penanganan bencana
  alam, kekeringan, kawasan kumuh, wilayah perbatasan, pulau terluar". Kab/kota melaksanakan SPAM di wilayahnya (Pasal 40
  huruf c). Sumber: `lembaga/mentah/teks/pp-122-2015.json.gz` hlm. 17–18, 43 [`ri-2015-pp122`]; `lembaga/peran.csv` R077
  (dipetakan penyusun ke Kementerian PU, Ditjen Cipta Karya). Label: resmi.
- **T3.11 Klaster logistik saat darurat dikoordinasikan BNPB**; kesehatan oleh Kemenkes (Kepka BNPB 308/2024, dua versi
  klaster berdampingan). Sumber: `lembaga/README.md` §4.1. Label: resmi.

**Peringatan dini, data, dan kesiapsiagaan**

- **T3.12 BMKG: iklim ekstrem dan prakiraan musim** (UU 31/2009; dipetakan penyusun ke BMKG). Sumber: `lembaga/peran.csv`
  R072. BMKG menerbitkan peringatan dini kekeringan meteorologis per dasarian (T2.9). Label: resmi.
- **T3.13 Kekeringan sebagai data peringatan dini.** Kementerian/lembaga menyampaikan data peringatan dini bahaya ke platform
  BNPB, termasuk "kekeringan" (Perban 2/2024 Pasal 7 ayat (2) huruf e), "sesuai dengan ketentuan peraturan perundang-undangan"
  (ayat (3)); platform dikelola Deputi Bidang Pencegahan (Pasal 3 ayat (2)). Sumber: korpus `perban-nomor-2-tahun-2024.json`
  hlm. 4–5 [`bnpb-2024-peringatan-dini`]. Label: resmi.
- **T3.14 Penyedia peringatan dini kekeringan hidrologis tidak ditunjuk** (C17); Renas PB menyatakan regulasi peringatan dini
  multiancaman belum optimal (C03). Sumber: `lembaga/celah.csv` C03, C17; `lembaga/README.md` butir C17. Label: resmi
  (disimpulkan dari teks resmi).
- **T3.15 Pertanian.** Sinkronisasi penyediaan air di lahan padi: Kemenko Pangan (Inpres 2/2025; penggolongan ke kekeringan
  tafsiran penyusun; Inpres menyasar 14 provinsi luar Jawa, Jawa hanya lewat klausul "provinsi lain"); lahan dan irigasi
  pertanian: Kementan (Perpres 192/2024). Sumber: `lembaga/peran.csv` R075, R076. Label: resmi.
- **T3.16 Renas PB.** Aksi 1.2.1.i operasi penanggulangan kedaruratan karhutla, banjir, kekeringan, dan longsor: daerah dengan
  TRC baseline 80 daerah, target 2029 84; pembinaan anggota TRC 107 ke 157 (instansi yang tercetak: BMKG, Kementerian
  Kehutanan, BNPB). Aksi 1.4.1.e IGT bahaya kekeringan (T1.18). Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 58, 67
  [`bnpb-2025-renas`]. Kunci baru `renas.aksi_121i.trc_2024`, `renas.aksi_121i.trc_2029`. Label: resmi (pembagian kolom
  penanggung jawab dan kontributor pada hlm. 58 terbaca kurang jelas dari teks OCR).
- **T3.17 KIE kekeringan dalam SPM.** Juklak 7/2026 (SPM sub-urusan bencana kab/kota, subkegiatan KIE rawan bencana) memuat
  materi untuk 9 jenis ancaman termasuk kekeringan, dengan tautan infografis BNPB untuk tindakan sebelum, saat, dan sesudah
  kekeringan. Sumber: korpus `juklak-nomor-7-tahun-2026.json` hlm. 26, 32–33 [`bnpb-2026-juklak7`]. Label: resmi.
- **T3.18 Kebakaran TPA dan karhutla.** TPA: kab/kota (sistem tanggap darurat pengelolaan sampah, UU 18/2008 Pasal 9;
  penggolongan ke kebakaran TPA = tafsiran penyusun), damkar kab/kota. Karhutla (Inpres 3/2020): BNPB komando nasional,
  gubernur dan bupati komandan satgas, BPBD koordinator daerah. Sumber: `lembaga/README.md` §4.2. Label: resmi.
- **T3.19 Pelaksanaan di lapangan (sekunder).** BPBD Gunungkidul menyalurkan air dengan anggaran reguler dan menyiapkan BTT
  ketika anggaran habis (T1.16). Label: sekunder; menggambarkan praktik, bukan mandat.

### Inferensi

- **[Inferensi tim]** Rantai "status, lalu DSP" membuat respons kemarau bergantung pada keputusan kepala daerah. Kekeringan
  berkembang pelan, sehingga ada risiko status terlambat atau berakhir sebelum kemarau selesai (contoh: status Gunungkidul
  menurut berita berakhir 31 Agustus, sedangkan BMKG memasukkan DIY ke kategori Awas pada Oktober). Ini kesenjangan untuk
  Bab 7, bukan rekomendasi di Bab 5.
- **[Inferensi tim]** "Gangguan fungsi pelayanan umum yang berdampak luas" di Perpres 46/2026 dapat menjadi dasar keadaan
  tertentu untuk krisis air bersih lintas kab. Ambang krisis air bersih dapat diatur dalam pedoman Kepala BNPB yang
  diamanatkan Pasal 3 ayat (4) (T3.3a); pedoman yang berlaku sekarang (Perban 5/2018) hanya memuat kriteria kualitatif
  "kemarau panjang" dan syarat gabungan yang lebih ketat daripada Perpres 46/2026. Penetapan pedoman itu adalah kewenangan
  Kepala BNPB sendiri; perubahan Perban 5/2018 sudah terdaftar sebagai instrumen usulan di KERANGKA (Bab 12 Kajian 2), dan
  Bab 5 hanya menunjuknya (prinsip 17). Penafsiran bahwa krisis air bersih memenuhi kondisi Pasal 3 ayat (2) huruf b tetap
  ditulis sebagai tafsiran penyusun.
- **[Inferensi tim]** Tabel 5.2 paling berguna dengan enam baris fungsi (peringatan, status, distribusi air, sumber air
  darurat, pengaturan alokasi air darurat, pembiayaan) dan tiga kolom (pemegang mandat tertulis berpasal, pelaksana lapangan,
  celah). Baris "sumber air darurat jangka menengah" berisi SPAM bersifat khusus (pusat/provinsi) dengan catatan bahwa tidak
  ada tautan tertulis ke BPBD atau ke status darurat. Baris "pengaturan alokasi air darurat" berisi UU 17/2019 Pasal 31
  (pemerintah pusat/daerah menurut kewenangan WS; T3.8a), pelaksana pengelola SDA (BBWS, PJT I, PJT II), dan celah: pelaksana
  pola operasi waduk saat kemarau dan tautannya ke status darurat tidak tertulis di sumber yang dibaca.
- **[Inferensi tim]** Standar 15 liter per orang per hari mengubah jiwa terdampak menjadi volume: setiap 100.000 jiwa butuh
  1.500 m³ per hari (100.000 × 15 liter). Satuan ini aman dipakai di kartu karena hanya aritmetika standar; mengalikannya
  dengan total DIBI tidak boleh dilakukan (P4).

### Celah

- Ambang atau kriteria status siaga/tanggap darurat kekeringan yang ditetapkan kepala daerah (hari tanpa hujan, desa
  terdampak) tidak ditemukan di korpus BNPB yang dibaca. Penyajian: "ditetapkan kepala daerah tanpa kriteria kekeringan
  tertulis di sumber yang dibaca". Untuk keadaan tertentu, Perban 5/2018 memuat kriteria kualitatif ("kemarau panjang") tanpa
  ambang angka (T3.3a); pedoman baru menurut Perpres 46/2026 Pasal 3 ayat (4) belum ditemukan.
- Pelaksana pola operasi waduk dan pengaturan alokasi air saat kemarau (BBWS, PJT I, PJT II, dinas SDA provinsi) serta
  tautannya ke status darurat atau ke BPBD tidak terdokumentasi di repo; teks PP 46/2010, PP 25/2022, dan PP 30/2024 yang
  tersimpan di paket `lembaga` tidak memuat kata "alokasi air" atau "kekeringan". Permintaan ke Ditjen SDA Kementerian PU,
  PJT I, dan PJT II (bersama tampungan waduk harian, KERANGKA §7 butir 24).
- Data DSP dan BTT untuk kekeringan per kab 2015–2026 tidak ada. Permintaan ke Biro Keuangan BNPB dan BPBD.
- Pelaksana sumur bor atau SPAM darurat di Jawa 2023 dan 2026 tidak terdokumentasi di repo. Permintaan ke Ditjen Cipta Karya
  dan BPBD.
- Perpres status dan tingkatan bencana belum terbit (riset E, E14); bab ini tidak membahas tingkatan.

---

## P4. Seperti apa kemarau terburuk yang masuk akal untuk 2026–2027, dan apa ukurannya bila korban jiwa tidak berlaku?

### Inti

Kemarau terburuk yang masuk akal adalah kemarau El Niño 2026 yang berlanjut sampai awal musim hujan (November di sebagian
Jawa, Desember di sebagian besar Jawa) dengan dampak tidak lebih ringan daripada catatan terburuk Jawa: ≥ 76 kab/kota
terdampak (2019), ≥ 4.924.057 jiwa terdampak (2018), dan karhutla ≥ 71.110 ha (2023); korban karhutla berlantai 12
meninggal (2015) dan ditulis di Kartu 5.2. Varian 2027 yang punya analog adalah kemarau dengan IOD positif tanpa El Niño
(2019), karena dalam delapan episode El Niño kuat 1950–2025 tidak satu pun berlanjut ke kemarau tahun berikutnya (ONI JAS
tahun berikutnya paling tinggi 0,32). Korban jiwa kekeringan tidak tercatat di semua tahun 2008–2026, jadi ukuran kemarau
adalah jiwa dan kab terdampak, kebutuhan air (15 liter per orang per hari), produksi padi provinsi BPS (2023 dan 2024,
terhadap tahun sebelumnya dan terhadap rerata 2021–2022), dan luas karhutla; kebakaran TPA dirujuk ke Kartu 8.3 Kajian 2.

### Temuan bersumber

**Karakteristik ancaman dan skenario kejadian**

- **T4.1** Indeks ENSO (3 bulanan) ASO +3,08 (BMKG, 13 Oktober; pemutakhiran 23 Oktober +3,05); indeks ENSO JAS +2,63
  ditulis sebagai angka September (BMKG, 22 September); Niño 3.4 dasarian I Oktober +3,33 dan IOD dasarian +0,703 (BMKG, 13
  Oktober); peringatan dini kekeringan meteorologis Awas di enam provinsi Jawa untuk dasarian II Oktober dan di empat provinsi
  (Banten, Jawa Barat, DI Yogyakarta, Jawa Timur) untuk dasarian III Oktober; awal musim hujan November (sebagian Jawa) dan
  Desember (sebagian besar Jawa). Kartu 5.1 menulis ASO +3,08 dengan tanggalnya (dan +3,05 pada 23 Oktober), bukan JAS +2,63
  saja; KERANGKA Kartu 5.1 masih menulis JAS +2,63. Sumber: T2.8, T2.9. Label: resmi.
- **T4.2 Persistensi El Niño.** "BMKG memprediksi fenomena El Nino akan terus bertahan hingga awal tahun 2027", dengan
  peluang intensitas kategori moderat 98 persen dan kategori kuat 62 persen; dampaknya bagi Indonesia saat bertemu musim
  kemarau disebut "hingga pertengahan bulan Oktober" (BMKG, siaran pers 10 Juni 2026; dibuka ulang 24 Oktober 2026)
  [`bmkg-2026-musim-kemarau`]. Kunci baru `bmkg.musim_2026.elnino_peluang_moderat` (98%),
  `bmkg.musim_2026.elnino_peluang_kuat` (62%). Label: resmi.
  - *Batas pakai:* 98% dan 62% adalah peluang intensitas El Niño menurut prediksi Juni, bukan peluang skenario dampak Kartu
    5.1, dan tidak boleh ditulis sebagai pita kemungkinan kartu (T4.3).
  - *Berdampingan:* prediksi Juni menyebut dampak kemarau sampai pertengahan Oktober, sedangkan rilis 13 dan 23 Oktober masih
    menerbitkan peringatan dini kekeringan meteorologis Awas di Jawa untuk dasarian II dan III Oktober (T2.9).
  - Frasa awal dan puncak musim hujan "sangat berdekatan" hanya bersumber dari Direktur Perubahan Iklim BMKG lewat InfoPublik,
    2 Oktober 2026 [`infopublik-2026-awal-puncak`]. Label: sekunder; hanya untuk frasa itu, rilis primer 2 Oktober tidak
    ditemukan.

**Kemungkinan**

- **T4.3** El Niño kuat (ONI NDJ ≥ 1,5): 3 dari 18 musim 2008–2025 (T2.3); porsi jendela lima tahun 1950–2025 yang memuat
  El Niño kuat 38,9% (kunci lama `enso.elnino_kuat_porsi_jendela5`, bab-03). Untuk 2026 kejadian ini sudah berlangsung. Pita
  peluang skenario dalam lima tahun: tidak dinilai (KERANGKA §2 butir 9, "jenis tanpa dasar peluang"). Label: terverifikasi
  (ONI); olah.
- **T4.4 Kemarau tahun kedua di bawah El Niño tidak punya analog.** Delapan episode dengan ONI NDJ ≥ 1,5 sejak 1950 (1957,
  1965, 1972, 1982, 1997, 2009, 2015, 2023) diikuti ONI JAS tahun berikutnya antara −1,24 dan 0,32 (1958: 0,32; 2016: −0,34;
  2024: −0,04). Sumber: `riset/mentah/oni_cpc.txt` [`noaa-2026-oni`], dihitung penyusun bukti. Kunci baru
  `enso.elnino_kuat_jas_berikut_maks`. Label: olah(terverifikasi).
  - *Membantah sebagian:* KERANGKA Kartu 5.1 "kemarau tahun kedua 2027 sebagai varian bila El Niño bertahan (BMKG 2 Oktober
    2026)". Sumber resmi yang dibuka (siaran pers BMKG 10 Juni 2026, T4.2) menyebut El Niño bertahan sampai awal 2027, bukan
    sampai kemarau 2027; rilis 2 Oktober yang dirujuk KERANGKA tetap tidak ditemukan.
- **T4.5 Analog kemarau tanpa El Niño yang luas.** 2019: ONI JAS 0,20, DMI JAS 0,64, 76 kab, 1.963.378 terdampak; 2018: ONI
  JAS 0,30, DMI JAS 0,26, 67 kab, 4.924.057 terdampak (T2.1). Label: resmi, terverifikasi.

**Lantai (tercatat terburuk di Jawa, KERANGKA §2 butir 9)**

- **T4.6 Kependudukan.** Jiwa terdampak terbesar 4.924.057 (2018); kab/kota terdampak terbanyak 76 (2019); kejadian terbanyak
  160 (2012) dan 155 (2008). 2026 sementara: 55 kab, 1.300.190 terdampak, di bawah lantai. Korban jiwa kekeringan: tidak
  tercatat (0 di DIBI 2008–2026; T2.12). Sumber: T2.1; kunci lama `hidromet.jawa.kekeringan.dibi_terdampak_2018`,
  `airjawa.kekeringan.kab_2019`. Label: resmi.
- **T4.6a Korban karhutla (lantai Kartu 5.2; dirujuk satu baris di Kartu 5.1).** Meninggal karhutla DIBI di Jawa: 2015 12;
  2018 3; 2019 9; 2023 1; 2024 1; 2026 sampai 23 Oktober 6 meninggal dan 4 hilang (sementara); tahun lain 2011–2025 nol.
  Jumlah 2015–2026: 32 meninggal dan 4 hilang (sama dengan KERANGKA Kartu 5.2). Lantai tahun: 2015, 12 meninggal; 2026
  sementara 10 meninggal dan hilang, di bawah lantai. Lantai kejadian tunggal ditulis berdampingan: Kab. Magetan, 18 Oktober
  2015, 7 meninggal (terbesar menurut meninggal); baris Kab. Probolinggo bertanggal 10 September 2026, 5 meninggal dan 4
  hilang (terbesar bila hilang dihitung; sementara). Sumber: `skenario-hidromet/dibi_kab_tahun.csv` (jenis=karhutla, prov
  31–36); tanggal dari `riset/mentah/dibi_hidromet.json` kolom `dt` (ditarik 23 Oktober 2026) [`bnpb-dibi`]; dihitung ulang
  penyusun bukti 24 Oktober 2026. Kunci baru `dibi.jawa.karhutla.meninggal_2015`, `.meninggal_2018`, `.meninggal_2019`,
  `.meninggal_2015_2026`. Label: olah(resmi); 2026 sementara; sebab kematian lihat T4.13.
- **T4.7 Lingkungan.** Luas karhutla Jawa (SiPongi): 2015 13.575 ha; 2019 38.021; 2023 71.110 (terbesar; Jawa Timur 49.498 =
  69,6%); 2024 29.648; 2026 sampai Juli 13.685. Sumber: `riset/mentah/sipongi_luas_2015_2026.json` (Kementerian Kehutanan,
  SiPongi, endpoint `opsroom.sipongidata.my.id/api/list/luas-kebakaran/provinsi`, ditarik 23 Oktober 2026, data terakhir "Juli
  2026") [`kemenhut-sipongi`]; dijumlah penyusun bukti untuk enam provinsi. Pembanding batas atas: luas bahaya kekeringan kelas
  tinggi KRB 2.877.406 ha (bukan jejak satu kejadian; kunci lama `hidromet.jawa.kekeringan.luas_bahaya_tinggi`). Kunci baru
  `karhutla.jawa.luas_2023`, `karhutla.jatim.luas_2023`, `karhutla.jawa.luas_2019`, `karhutla.jawa.luas_2026_juli`. Label:
  resmi, olah(resmi).
- **T4.8 Ekonomi.** Nilai aset terpapar kekeringan KRB Jawa Rp450,08 T, "bukan kerugian" (kunci lama
  `hidromet.jawa.kekeringan.krb_kerugian_potensi`). Produksi padi provinsi (BPS, angka tetap, juta ton GKG):

  | Provinsi | 2021 | 2022 | 2023 | 2024 |
  | --- | ---: | ---: | ---: | ---: |
  | Jawa Tengah | 9,62 | 9,36 | 9,08 | 8,89 |
  | Jawa Timur | 9,789 | 9,53 | 9,71 | 9,27 |

  Perubahan terhadap tahun sebelumnya (angka rilis): Jawa Tengah 2023 turun 0,27 juta ton atau 2,91%, 2024 turun 0,19 juta
  ton atau 2,12%; Jawa Timur 2023 naik 184,15 ribu ton atau 1,93%, 2024 turun 0,44 juta ton atau 4,53%. Perubahan terhadap
  rerata 2021–2022 (olah): Jawa Tengah 2023 −4,3%, 2024 −6,3%; Jawa Timur 2023 +0,5%, 2024 −4,0%. Jawa Timur 2020: 9,944
  juta ton (2021 turun 1,56%); halaman rilis Jawa Timur 1 Maret 2022 tidak menulis status "angka tetap" secara tersurat.
  Sumber: BPS Jawa Tengah 1 Maret 2024 [`bps-jateng-2024-padi`] dan 3 Maret 2025
  [`bps-jateng-2025-padi-2024`]; angka tetap Jawa Tengah 2021 dari rilis ulang BPS Kabupaten Klaten 1 Maret 2022
  [`bps-jateng-2022-padi-2021`]; BPS Jawa Timur 26 Maret 2024 lewat laman BPS Kabupaten Probolinggo [`bps-jatim-2024-padi`],
  3 Maret 2025 [`bps-jatim-2025-padi-2024`], dan 1 Maret 2022 [`bps-jatim-2022-padi-2021`]. Nasional 2023: 53,63 juta ton GKG,
  turun 1,12 juta ton atau 2,05% (angka sementara, 16 Oktober 2023) [`bps-2023-padi-sementara`]; angka tetap nasional 53,98
  juta ton GKG (1 Maret 2024) [`bps-2024-padi-tetap`]. Kunci baru `bps.padi.jateng_2023_persen`, `bps.padi.jatim_2023_persen`,
  `bps.padi.nasional_2023_sementara_persen`, `bps.padi.jateng_2024_persen`, `bps.padi.jatim_2024_persen`,
  `bps.padi.jateng_2023_vs_rerata2122`, `bps.padi.jatim_2023_vs_rerata2122`, `bps.padi.jateng_2024_vs_rerata2122`,
  `bps.padi.jatim_2024_vs_rerata2122`. Label: resmi; olah(resmi) untuk perubahan terhadap rerata.
  - *Ukuran:* KERANGKA Kartu 5.1 meminta "produksi padi BPS provinsi tahun El Niño lawan tren". Berkas ini memakai dua
    ukuran: perubahan terhadap tahun sebelumnya (angka rilis BPS) dan perubahan terhadap rerata dua tahun sebelumnya
    (2021–2022) sebagai pendekatan tren sederhana. Rerata tiga tahun tidak dipakai karena angka tetap Jawa Tengah 2020 belum
    dibuka; tren regresi belum dihitung. Penulis menyebut ukuran mana yang dipakai di setiap angka.
  - *Atribusi:* **[Inferensi tim]** perubahan produksi 2023 dan 2024 belum diuji sebagai dampak El Niño. El Niño 2023
    memuncak pada musim NDJ (ONI 1,99; T2.3), sehingga mundurnya tanam dapat jatuh ke panen 2024; kedua tahun ditulis
    berdampingan dan naskah tidak menyebut perubahan itu "dampak El Niño" tanpa label.
  - *Angka berdampingan:* penurunan nasional 2,05% adalah angka sementara; angka tetap nasional 2023 lebih tinggi 0,35 juta
    ton dari angka sementara, dan rilis angka tetap yang dibuka tidak memuat perbandingan dengan 2022.
- **T4.9 Infrastruktur dan layanan (TPA).** 2023: 16 TPA "terbakar hebat" menurut catatan BNPB (nasional; Kepala BNPB, 21 Juni
  2024); di Jawa tercatat Sarimukti (19 Agustus; 80% lahan terbakar, sekitar 3.000 KK terdampak asap), Kopi Luhur (9
  September; 3 ha, warga dari sekitar 1.500 KK sebagian mengungsi), Putri Cempo (16 September; 2 ha), Rawa Kucing (20 Oktober;
  10 ha, 450 personel), Jalupang (28 Oktober; 10 ha, 4 desa terdampak asap). 2026: Jatiwaringin (30 Juni; 15 ha, 15 jiwa
  mengungsi, 4 helikopter, padam 100% lahan utama 9 Juli; status tanggap darurat Keputusan Bupati Tangerang 609/2026), Putri
  Cempo (24 September; 1,36 ha), Jatibarang (30 September; sekitar 10 ha). Kerentanan: 369 dari 485 TPA belum berhenti open
  dumping (KLH/BPLH, 17 April 2026). Sumber: `nonalam-sosial/peristiwa.csv`, `nonalam-sosial/skenario_terburuk.csv` (URL BNPB
  dan KLH per baris, diakses 23 Oktober 2026) [`bnpb-2024-tpa-suwung`, `bnpb-2023-sarimukti`, `bnpb-2026-jatiwaringin`,
  `bnpb-2026-jatibarang`, `klh-2026-open-dumping`]; kunci lama `nonalam.tpa.terbakar_2023`, `nonalam.tpa.open_dumping`,
  `nonalam.tpa.jumlah`. Kunci baru `nonalam.tpa.jawa_2023_tercatat` (5), `nonalam.tpa.jawa_2026_tercatat` (3). Label: resmi;
  durasi status Sarimukti dan biaya penanganan berlabel sekunder di paket.
- **T4.10 Layanan sipil (status).** Jumlah kab berstatus siaga/tanggap darurat kekeringan 2026 tidak diperoleh dari SK; satu
  contoh hanya dari berita (Gunungkidul, T1.16). Label: celah.

**Model dan kebutuhan respons**

- **T4.11 Keluaran model platform (estimasi-model, hanya Lampiran I).** Analog kemarau 2015 di mesin neraca dan padi:
  penurunan hasil padi tertimbang Jawa 85,7% (normal 48,9%); sawah model "puso" 964.312 ha (normal 456.490 ha). Mesin belum
  pernah diuji balik terhadap puso atau produksi; padi dimodelkan tadah hujan tanpa irigasi; aturan peringatan SPI-3 gagal
  uji balik (POD 0,10, FAR 0,99). Sumber: `skenario-hidromet/lampiran_kekeringan_model.csv`; `skenario-hidromet/README.md`
  bagian Kekeringan analog 2015. Label: estimasi-model.
  - *Disandingkan, tahun sama (wajib):* BPS mencatat produksi padi 2015 naik di Jawa. Jawa Tengah 11,30 juta ton GKG, naik
    17,14% dari 9,65 juta ton (2014) (angka tetap, BPS Jawa Tengah 1 Juli 2016) [`bps-jateng-2016-padi-2015`]; Jawa Timur 13,15
    juta ton GKG, naik 757,92 ribu ton atau 6,11% (angka tetap, BPS Jawa Timur 1 Juli 2016) [`bps-jatim-2016-padi-2015`];
    Pulau Jawa naik 2,31 juta ton dari 2014, nasional 75,40 juta ton GKG, naik 4,55 juta ton atau 6,42% (BPS, 1 Juli 2016)
    [`bps-2016-padi-2015`]. Kunci baru `bps.padi.jateng_2015_persen`, `bps.padi.jatim_2015_persen`,
    `bps.padi.jawa_2015_naik_juta_ton`. Label: resmi.
    - *Batas perbandingan:* ukurannya berbeda. Model menghitung satu musim tanam kemarau (tanam 1 Juli, tadah hujan tanpa
      irigasi), sedangkan BPS mencatat produksi setahun semua musim. Seri 2015 dan seri 2021–2024 juga berasal dari rilis
      yang berbeda, dan kesebandingan metode antarseri belum diperiksa. Jawa Barat, Banten, DI Yogyakarta, dan DKI Jakarta
      2015 belum ditarik. Yang dapat ditulis: tidak ada catatan resmi yang dibuka yang menunjukkan penurunan produksi padi Jawa
      2015 mendekati orde 85,7%.
  - *Pembanding tahun El Niño lain (bukan bantahan):* produksi 2023 Jawa Tengah −2,91% dan Jawa Timur +1,93% terhadap 2022
    (T4.8).
  - Angka model tidak masuk kartu, judul, atau Ringkasan Eksekutif karena mesin belum diuji balik (prinsip 9 larangan
    tampil); selisih dengan BPS 2015 menguatkan larangan itu. Jiwa sel krisis air model (Jawa sekitar 158 juta) tidak dikutip
    sama sekali.
- **T4.12 Kebutuhan air darurat.** Rumus kartu: penduduk desa terdampak × 15 liter per orang per hari (7 liter pada tiga hari
  pertama) × lama status (Perka BNPB 7/2008; T3.7), dihitung hanya bila data desa terdampak dari BPBD diperoleh (KERANGKA
  Kartu 5.1). Angka BPBD Jawa Timur "815 desa, sekitar 410 ribu KK" adalah berita musim kemarau 2025 dengan dua angka KK
  berbeda, bukan data 2026, dan tidak dikutip di naskah final (riset E, E18). Label: resmi (standar); sekunder (angka Jatim).
- **T4.13 Kesehatan dan sebab kematian karhutla.** Rincian kematian karhutla DIBI di Jawa (tanggal = kolom `dt` baris DIBI):
  2015 12 (Magetan 7, 18 Oktober; Ponorogo 5, 29 dan 31 Oktober); 2018 3 (Pangandaran 1, 1 September; Sragen 1, 16 Agustus;
  Magelang 1, 6 Oktober); 2019 9 (Temanggung 2; Purworejo, Wonogiri, Grobogan, Jepara, Kota Semarang, Ponorogo, Jember
  masing-masing 1; 17 Juni sampai 11 November); 2023 1 (Cianjur); 2024 1 (Pamekasan); 2026 sampai 23 Oktober 6 meninggal dan
  4 hilang (Kab. Probolinggo 5 meninggal dan 4 hilang, 10 September; Banyumas 1, 14 Oktober). Kejadian karhutla DIBI Jawa:
  2023 480 di 70 kab; 2026 364 di 70 kab. Sumber: `skenario-hidromet/dibi_kab_tahun.csv` (jenis=karhutla, prov 31–36);
  `riset/mentah/dibi_hidromet.json`; dihitung penyusun bukti [`bnpb-dibi`]. Kunci baru `dibi.jawa.karhutla.kejadian_2026`,
  `.kab_2026`, `.meninggal_2026`, `.hilang_2026`, `.kejadian_2023` (dan kunci T4.6a). Label: resmi (2026 sementara). Kasus
  penyakit terkait air saat kemarau: tidak ada data (celah).
  - **Sebab kematian.** 2015: kebakaran hutan atau gunung setempat, bukan asap, menurut `skenario-hidromet/README.md`
    (bagian Karhutla analog 2015 dan 2019) dan KERANGKA Kartu 5.2; sumber per kejadian belum dibuka di berkas ini. README
    yang sama menulis "2019: 9 dari 10 kematian" tanpa sumber per kejadian. Untuk 2018, 2019, 2023, 2024, dan 2026 sebabnya
    **belum diverifikasi**: baris DIBI di repo hanya memuat tanggal dan angka, tanpa keterangan kronologi.
  - *Pembanding sekunder (2026):* Metro TV, 16 Oktober 2026, mengutip Kepala BPBD Kab. Probolinggo: pada 15 Oktober 2026 di
    lereng Pusung Lingker, Desa Ngadirejo, Kec. Sukapura (kawasan Bromo), petugas Balai Besar TNBTS dan relawan terjebak api
    dan asap saat memadamkan karhutla; 4 meninggal, 2 luka bakar berat, tidak ada yang disebut hilang [`metrotv-2026-bromo`].
    Label: sekunder; tidak masuk badan teks.
  - *Bertentangan dengan* baris DIBI Kab. Probolinggo (10 September 2026; 5 meninggal, 4 hilang): tanggal dan angkanya
    berbeda, sehingga belum dapat dipastikan apakah baris DIBI memuat kejadian 15 Oktober, kejadian lain, atau gabungan.
    Keduanya ditulis berdampingan. Rilis BNPB tentang kejadian ini tidak ditemukan pada penelusuran 24 Oktober 2026.

**Matriks ketersediaan kuantifikasi kemarau Jawa (kontrak isi Kartu 5.1, KERANGKA §2 butir 9)**

| Metrik | Kode | Nilai yang boleh tampil | Alasan satu kalimat |
| --- | --- | --- | --- |
| Korban jiwa kekeringan | Tidak dikuantifikasi | "tidak tercatat" | DIBI mencatat 0 meninggal kekeringan di Jawa 2008–2026 |
| Korban karhutla (rujukan ke Kartu 5.2) | Resmi | lantai tahun 12 meninggal (2015); kejadian tunggal Magetan 7 meninggal (2015) berdampingan dengan Kab. Probolinggo 5 meninggal dan 4 hilang (2026, sementara); 2026: 6 meninggal dan 4 hilang | DIBI; label "kebakaran setempat" hanya untuk 2015 (README paket), sebab 2018–2026 belum diverifikasi (T4.13) |
| Jiwa terdampak | Resmi | lantai 4.924.057 (2018); 2026 sementara 1.300.190 | DIBI kolom menderita+mengungsi; intensitas pelaporan |
| Kab/kota terdampak | Resmi | lantai 76 (2019); 2026: 55 | DIBI; intensitas pelaporan |
| Kebutuhan air darurat | Turunan | rumus Perka 7/2008; 1.500 m³ per 100.000 jiwa per hari | jumlah desa terdampak BPBD belum ada |
| Luas karhutla | Resmi | lantai 71.110 ha (2023) | SiPongi per provinsi |
| Luas bahaya kekeringan | Resmi | 2.877.406 ha kelas tinggi | batas atas, bukan kejadian |
| Produksi padi | Resmi | terhadap tahun sebelumnya: Jateng 2023 −2,91%, 2024 −2,12%; Jatim 2023 +1,93%, 2024 −4,53%. Terhadap rerata 2021–2022: Jateng 2023 −4,3%, 2024 −6,3%; Jatim 2023 +0,5%, 2024 −4,0% | BPS angka tetap; atribusi ke El Niño belum diuji; per kab belum ditarik |
| Puso per kab | Tidak dikuantifikasi | "permintaan data" | data Kementan tidak diperoleh; puso model tidak lolos uji |
| Nilai aset terpapar | Resmi | Rp450,08 T "bukan kerugian" | KRB, tidak dijumlah antarbahaya |
| TPA terbakar | Resmi | tidak di Kartu 5.1; dirujuk ke Kartu 8.3 Kajian 2 (2023: 16 nasional, 5 di Jawa tercatat) | KERANGKA §4: TPA Jawa tidak berkartu di Kajian 1; catatan BNPB; DIBI tanpa jenis TPA |
| Kab berstatus darurat | Tidak dikuantifikasi | "permintaan data" | SK tidak diperoleh |

### Inferensi

- **[Inferensi tim]** Skenario Kartu 5.1 disusun sebagai "kemarau 2026 berlanjut sampai Desember 2026 dengan dampak setara lantai
  tercatat", bukan sebagai proyeksi angka 2026. Lantai per metrik diambil dari tahun yang berbeda (2018, 2019, 2023), jadi
  kartu harus menulis tahunnya per metrik dan tidak menyebut "kemarau 2018" atau "2019" sebagai satu analog utuh.
- **[Inferensi tim]** Varian kemarau 2027 yang dapat dipertanggungjawabkan adalah "IOD positif tanpa El Niño" dengan analog
  2019, karena (1) El Niño kuat tidak pernah berlanjut ke kemarau tahun berikutnya dalam catatan ONI, dan (2) catatan DIBI
  terluas justru 2019. Kemungkinannya tetap "tidak dinilai"; varian ini hanya menyiapkan Kesiapan Musim Kemarau 2027.
- **[Inferensi tim]** Pesan untuk Kepala BNPB dari 5.4: produksi padi provinsi tidak bergerak seragam pada 2023 (Jawa Tengah
  turun, Jawa Timur naik terhadap 2022 dan hampir sama dengan rerata 2021–2022), lalu keduanya turun pada 2024. Hubungan
  perubahan ini dengan El Niño belum diuji. Ukuran pangan di kartu sebaiknya produksi provinsi BPS terhadap tahun sebelumnya
  dan terhadap rerata tahun sebelumnya, untuk tahun El Niño dan tahun sesudahnya, bukan model.
- **[Inferensi tim]** Luas karhutla tetap aspek lingkungan Kartu 5.1 (KERANGKA). Korban karhutla tidak ditulis "tidak
  berlaku": ia punya lantai tercatat (T4.6a) dan masuk Kartu 5.2 Karhutla Jawa (KERANGKA §4); Kartu 5.1 memuat satu baris
  rujukan ke lantai itu. Kebakaran TPA tidak berkartu di Kajian 1 (KERANGKA §4); 5.5 merujuk Kartu 8.3 Kajian 2, dan kebakaran
  TPA tidak mencatat korban di sumber yang dibuka.
- **[Inferensi tim]** Baris Kab. Probolinggo 2026 (5 meninggal, 4 hilang) adalah kejadian tunggal karhutla dengan meninggal
  dan hilang terbanyak di Jawa sejak 2015 bila hilang dihitung, tetapi jumlah 2026 (10) masih di bawah lantai tahun 2015 (12).
  Sebab dan kronologinya belum diverifikasi (T4.13), jadi naskah tidak menyebut sebab kematian 2026.

### Celah

- Puso per kab (Kementan), Katam, dan produksi padi BPS per kab tahun El Niño belum ditarik (KERANGKA §7 butir 34). Produksi
  2015 baru ditarik untuk Jawa Tengah, Jawa Timur, dan total Pulau Jawa; Jawa Barat, Banten, DI Yogyakarta, dan DKI Jakarta
  belum. Angka tetap Jawa Tengah 2020 belum dibuka, sehingga pembanding tren memakai rerata 2021–2022. Permintaan data ke
  Kementan; tarik tabel BPS provinsi per kab.
- Tampungan waduk harian (PJT I, PJT II, BBWS) tidak ada (KERANGKA §7 butir 24). Aspek infrastruktur kartu ditulis "permintaan
  data".
- Kasus diare dan penyakit terkait air saat kemarau tidak ada (Kemenkes). Ditulis "belum dihitung".
- Kronologi dan sebab kematian karhutla 2018, 2019, dan 2026 belum dibaca dari sumber resmi. Rekaman DIBI yang tersimpan
  tidak memuat keterangan kronologi: `riset/mentah/dibi_baris.json` hanya berisi tahun 2010, 2018, dan 2020–2022, dan
  `riset/mentah/dibi_hidromet.json` hanya tanggal dan angka. Rilis BNPB tentang karhutla Bromo 15 Oktober 2026 tidak
  ditemukan. Permintaan ke Pusdatinkom BNPB.
- Pita peluang lima tahun untuk kemarau El Niño kuat: tidak dinilai.

---

## Bahan pendukung subbab 5.4 dan 5.5 (dampak; karhutla dan TPA)

### Inti

Dampak kemarau Jawa yang terukur resmi terbatas pada jiwa terdampak DIBI, produksi padi provinsi BPS, luas karhutla SiPongi,
dan daftar kebakaran TPA dari BNPB; air bersih tercatat sebagai jiwa terdampak tanpa volume distribusi, dan kesehatan tidak
tercatat. Karhutla Jawa bersifat kebakaran hutan dan gunung (Jawa Timur 69,6% dari luas 2023), sedangkan kebakaran TPA
terkonsentrasi di kota besar dan berulang (Putri Cempo 2023 dan 2026).

### Temuan bersumber

- **T5.1** Seluruh angka dampak di T2.1, T4.7, T4.8, T4.9, T4.13 (tidak diulang).
- **T5.2 Luas karhutla per provinsi Jawa (ha, SiPongi).** Jawa Timur: 2015 7.967; 2019 23.655; 2023 49.498; 2026 sampai Juli
  10.835. Jawa Barat: 2.886; 9.552; 11.525; 1.893. Jawa Tengah: 2.472; 4.782; 9.966; 948. Banten: 250; 9; 1; 8. DIY: 0
  (2015 kosong); 23; 120; 0. DKI 0. Sumber: `riset/mentah/sipongi_luas_2015_2026.json` [`kemenhut-sipongi`]; pembanding
  2015/2019 di `skenario-hidromet/karhutla_provinsi.csv` (angka sama). Label: resmi.
- **T5.3 Status darurat kebakaran TPA berlapis (Sarimukti 2023).** Status kab 22 Agustus sampai 11 September (21 hari),
  provinsi 12–25 September (14 hari), darurat sampah Kota Bandung 28 Agustus sampai 24 September (28 hari), 8.000 ton sampah
  tak terangkut. Sumber: `nonalam-sosial/peristiwa.csv`. Label: sekunder (berita); luas 80% dan 3.000 KK resmi (BNPB).
- **T5.4 Program terkait air saat kemarau dan posisinya.** Embung dan panen air hujan: kekuatan "belum-terbukti", posisi
  "Program berjalan, wajib evaluasi dampak" (P10); Sekolah Lapang Iklim BMKG: "lemah" (P04); PAMSIMAS: "sedang", "Program
  dengan syarat (bukti sedang)" (P13). Sumber: `program-terbukti/kompendium_program.csv`. Label: asumsi-kebijakan (rubrik
  paket).

### Inferensi

- **[Inferensi tim]** Subbab 5.4 sebaiknya terbuka tentang tiga dari empat ukuran yang diminta tujuan bab (air bersih, pangan,
  kesehatan) yang belum punya data resmi per kab, lalu menyajikan yang ada. Ini sejalan dengan tujuan bab "ukuran yang dipakai
  BPBD": ukuran itu (volume air, desa, hari status) ada di BPBD tetapi tidak naik ke data nasional.
- **[Inferensi tim]** Bila penulis menyebut embung atau PAMSIMAS di 5.6, kata yang dipakai adalah "program berjalan, belum
  dievaluasi dampaknya" (embung) dan "program dengan syarat" (PAMSIMAS); bukan "terbukti".

### Celah

- Volume distribusi air bersih per kab (BPBD), jumlah desa terdampak, dan biaya: tidak ada.
- DIBI tidak mencatat jenis "kebakaran TPA" (KERANGKA §7 butir 14); daftar TPA bersumber berita BNPB per kejadian.

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Status |
| --- | --- | --- | --- | --- |
| Gambar 5.1 | ONI 2008–2026 dengan musim El Niño kuat (NDJ ≥ 1,5: 2009/10, 2015/16, 2023/24) dan JAS 2026 = 2,16 ditandai; baris DMI JAS sebagai teks, bukan sumbu kedua | `riset/mentah/oni_cpc.txt`; NOAA PSL DMI | G2 | data ada; DMI perlu disalin ke `riset/mentah/` sebelum dipakai |
| Gambar 5.2 | Koroplet IRBI 2025 kekeringan 119 kab, 5 kelas kuintil (kelas sama dengan syarat a, batas teratas 13), legenda nilai | `air-jawa/peta_kab.geojson` kolom `irbi2025_kekeringan` | G19 | data ada |
| Gambar 5.3 | Koroplet jumlah tahun tercatat kekeringan DIBI 2015–2025 per kab (0 sampai 9 tahun; sebaran: 25 kab 0 tahun, 1 kab 9 tahun) | `turunan/daftar_perhatian.csv` kolom `n_tahun_dibi` atau `air-jawa/dibi_kab_tahun.csv` | G19 | data ada |
| Gambar 5.4 | Kab/kota mencatat kekeringan per tahun 2008–2026 (batang), baris ONI JAS dan DMI JAS di bawah batang, catatan pelaporan (terdampak tidak dicatat 2008–2011, patahan 2024, 2026 sementara) | T2.1 | G1 | data ada |
| Gambar 5.5 (usulan) | Jiwa terdampak kekeringan 2015–2025 per kab, 119 kab terurut, nama hanya untuk sepuluh teratas, sorot kab di luar daftar perhatian | `air-jawa/dibi_kab_tahun.csv` | G5 | data ada; dihitung penyusun bukti |
| Gambar 5.6 (usulan) | Luas karhutla Jawa per tahun 2015–2026, bertumpuk Jawa Timur, Jawa Barat, Jawa Tengah, lainnya; 2026 berpita "sampai Juli" | `riset/mentah/sipongi_luas_2015_2026.json` | G9 | data ada; perlu masuk paket `skenario-hidromet` sebagai tabel |
| Kotak 5.1 | IRBI dan pengalaman lapangan: tabel kecil Gunungkidul, Blora, Kendal, Sukabumi, Kota Semarang (IRBI 2025, luas bahaya tinggi KRB, tahun DIBI 2015–2025, terdampak 2015–2025, status daftar); satu kalimat status siaga Gunungkidul berlabel sekunder hanya bila penyunting mengizinkan, bila tidak dihapus | T1.11–T1.16 | B5.5 (tabel di dalam kotak B5.7) | data ada |
| Tabel 5.1 | Daftar perhatian kekeringan: kab, provinsi, syarat a–d yang dipenuhi (centang), urut kode; kolom varian (c) terdampak; catatan kepekaan (42 sampai 66) | `turunan/daftar_perhatian.csv`; varian T1.8 | B5.7 (Lampiran G) | varian dasar ada; varian (c) terdampak belum di paket |
| Tabel 5.2 | Siapa mengerjakan apa saat kemarau: fungsi (peringatan, status termasuk keadaan tertentu dan pedoman Kepala BNPB, distribusi air, sumber air darurat, pengaturan alokasi air darurat, pembiayaan) × pemegang mandat berpasal × pelaksana lapangan × celah | T3.1–T3.18, T3.3a, T3.8a; `lembaga/peran.csv`, `lembaga/matriks_air.csv` | B5.7 | data ada; pelaksana pola operasi waduk saat kemarau = celah |
| Tabel 5.3 (usulan) | Matriks ketersediaan kuantifikasi kemarau (metrik × kode × alasan) | P4 matriks | G16 (tabel peta panas) | data ada |
| Kartu 5.1 | Kemarau El Niño 2026 berlanjut sampai awal musim hujan; karakteristik ancaman indeks ENSO ASO +3,08 (13 Oktober; +3,05 pada 23 Oktober), JAS +2,63 sebagai angka September; persistensi El Niño sampai awal 2027 (BMKG 10 Juni); lima aspek dengan lantai; baris korban kekeringan "tidak tercatat" dan satu baris rujukan korban karhutla ke Kartu 5.2; produksi padi terhadap tahun sebelumnya dan rerata 2021–2022 (2023 dan 2024); varian 2027 IOD positif (analog 2019); kebutuhan respons rumus Perka 7/2008; pernyataan produsen bila ada angka model (tidak ada di kartu) | P4 | B5.11 | data ada kecuali status SK, puso, waduk |
| Kartu 5.2 | Karhutla Jawa (ringkas, per jenis; KERANGKA §4): lantai tahun 12 meninggal (2015); kejadian tunggal Magetan 7 meninggal (2015) berdampingan dengan Kab. Probolinggo 5 meninggal dan 4 hilang (2026, sementara); luas SiPongi per provinsi, lantai 71.110 ha (2023); sebab kematian hanya 2015 yang berlabel; kepekaan luas 2015 lawan 2019 dan 2023 | T4.6a, T4.7, T4.13, T5.2 | B5.11 | data ada; sebab 2018–2026 belum diverifikasi; `skenario-hidromet/lantai_jenis.csv` belum ada di repo |

Catatan desain: Gambar 5.2 dan 5.3 berpasangan (kelas sama di semua panel, gerbang D-29). Peta tidak memakai merah untuk IRBI
(T8). Tidak ada sumbu ganda di Gambar 5.1 dan 5.4.

---

## Angka untuk registri

Semua kunci di bawah ditulis juga di `naskah/air/bukti/bab-05.angka.json`. Kunci yang sudah ada di `data/angka.json` atau di
berkas angka Bab 1–4 tidak diulang. Angka sekunder tidak dimasukkan.

| Kunci | Nilai | Berkas sumber + jalur / pustaka | Label | Sumber |
| --- | --- | --- | --- | --- |
| `perhatian.air.kekeringan.n_b2` | 66 | `turunan/daftar_perhatian_kepekaan.csv` [kajian=air,bahaya=kekeringan,varian=syarat_b_2_tahun].n_masuk | asumsi-kebijakan | Pengolahan Pantau Bencana dari IRBI dan DIBI |
| `perhatian.air.kekeringan.n_b4` | 42 | idem varian=syarat_b_4_tahun | asumsi-kebijakan | idem |
| `perhatian.air.kekeringan.n_a2` | 65 | idem varian=syarat_a_dua_kelas_teratas | asumsi-kebijakan | idem |
| `perhatian.air.kekeringan.n_syarat_d` | 48 | olah `turunan/daftar_perhatian.csv` | asumsi-kebijakan | idem |
| `perhatian.air.kekeringan.n_tanpa_d` | 18 | olah idem | asumsi-kebijakan | idem |
| `perhatian.air.kekeringan.n_c_terdampak` | 58 | olah idem + `air-jawa/dibi_kab_tahun.csv` | asumsi-kebijakan | idem |
| `perhatian.air.kekeringan.c_terdampak_ambang` | 83.509 jiwa | olah `air-jawa/dibi_kab_tahun.csv` | olah(resmi) | DIBI 2015–2025 |
| `perhatian.air.kekeringan.dibi2026_dalam_daftar` | 32 dari 55 | olah | olah(resmi) | DIBI 2026 sementara |
| `airjawa.kekeringan.terdampak_2015_2025` | 11.857.516 | olah `air-jawa/dibi_kab_tahun.csv` | olah(resmi) | DIBI |
| `airjawa.kekeringan.kab_2008` | 73 | olah idem | olah(resmi) | DIBI 2008 |
| `airjawa.kekeringan.kab_2018` | 67 | olah idem | olah(resmi) | DIBI 2018 |
| `airjawa.kekeringan.kab_2024` | 45 | olah idem | olah(resmi) | DIBI 2024 |
| `airjawa.kekeringan.terdampak_2019` | 1.963.378 | olah idem | olah(resmi) | DIBI 2019 |
| `airjawa.kekeringan.terdampak_2023` | 3.265.382 | olah idem | olah(resmi) | DIBI 2023 |
| `airjawa.kekeringan.kab_2026_jateng` | 25 | olah idem | olah(resmi) | DIBI 2026 sementara |
| `airjawa.kekeringan.terdampak_2026_jateng` | 738.353 | olah idem | olah(resmi) | DIBI 2026 sementara |
| `airjawa.kekeringan.spearman_kab_dmi` | 0,553 | olah T2.1 | olah(resmi, terverifikasi) | DIBI, NOAA PSL |
| `airjawa.kekeringan.spearman_kab_oni` | 0,321 | olah T2.1 | olah(resmi, terverifikasi) | DIBI, NOAA CPC |
| `airjawa.kekeringan.spearman_terdampak_oni` | 0,660 | olah T2.1 | olah(resmi, terverifikasi) | DIBI 2012–2025, NOAA CPC |
| `airjawa.kekeringan.spearman_terdampak_dmi` | 0,666 | olah T2.1 | olah(resmi, terverifikasi) | DIBI 2012–2025, NOAA PSL |
| `airjawa.gunungkidul.irbi2025_kekeringan` | 5 | `air-jawa/kab_jawa.csv` [kode=3403].irbi2025_kekeringan | resmi | InaRISK IRBI 2025 |
| `airjawa.gunungkidul.krb_kekeringan_luas_tinggi` | 0 ha | `skenario-hidromet/paparan_kab.csv` [kode=3403,bahaya=kekeringan].krb_luas_tinggi_ha | resmi | KRB 2022–2026 |
| `airjawa.gunungkidul.krb_kekeringan_luas_sedang` | 148.536 ha | idem .krb_luas_sedang_ha | resmi | KRB 2022–2026 |
| `airjawa.gunungkidul.dibi_tahun_kekeringan_1525` | 5 | `turunan/daftar_perhatian.csv` [kajian=air,bahaya=kekeringan,kode=3403].n_tahun_dibi | resmi | DIBI |
| `airjawa.gunungkidul.terdampak_kekeringan_1525` | 566.351 | olah `air-jawa/dibi_kab_tahun.csv` | olah(resmi) | DIBI |
| `airjawa.gunungkidul.terdampak_2019` | 220.429 | olah idem | olah(resmi) | DIBI 2019 |
| `airjawa.jawa.krb_kekeringan_kab_tinggi_nol` | 68 | olah `skenario-hidromet/paparan_kab.csv` | olah(resmi) | KRB 2022–2026 |
| `airjawa.jawa.spearman_irbi_kekeringan.luas_tinggi` | 0,430 | olah | olah(resmi) | IRBI 2025, KRB |
| `airjawa.jawa.spearman_irbi_kekeringan.terpapar` | 0,119 | olah | olah(resmi) | IRBI 2025, KRB |
| `oni.jas_2018` | 0,30 | pustaka `noaa-2026-oni` | terverifikasi | NOAA CPC |
| `oni.jas_2019` | 0,20 | idem | terverifikasi | NOAA CPC |
| `oni.jas_2023` | 1,25 | idem | terverifikasi | NOAA CPC |
| `oni.ndj_2009` | 1,50 | idem | terverifikasi | NOAA CPC |
| `enso.elnino_kuat_musim_2008_2025` | 3 dari 18 | olah idem | olah(terverifikasi) | NOAA CPC |
| `enso.elnino_kuat_jas_berikut_maks` | 0,32 | olah idem | olah(terverifikasi) | NOAA CPC |
| `dmi.jas_2015` | 0,36 | pustaka `noaa-psl-dmi` | terverifikasi | NOAA PSL |
| `dmi.jas_2018` | 0,26 | idem | terverifikasi | NOAA PSL |
| `dmi.jas_2019` | 0,64 | idem | terverifikasi | NOAA PSL |
| `dmi.jas_2023` | 0,76 | idem | terverifikasi | NOAA PSL |
| `bmkg.dasarian_okt1_2026.nino34` | +3,33 | pustaka `bmkg-2026-dinamika-okt1` | resmi | BMKG |
| `bmkg.dasarian_okt1_2026.iod` | +0,703 | idem | resmi | BMKG |
| `bmkg.pdkm_okt2_2026.prov_awas_jawa` | 6 | idem | resmi | BMKG |
| `bmkg.dasarian_okt1_2026.enso_aso` | +3,08 | idem (kunci dan nilai sama di `naskah/mitigasi/bukti/bab-07.angka.json`) | resmi | BMKG |
| `bmkg.dasarian_okt2_2026.enso_aso` | +3,05 | pustaka `bmkg-2026-dinamika-okt2` | resmi | BMKG |
| `bmkg.pdkm_okt3_2026.prov_awas_jawa` | 4 | idem | resmi | BMKG |
| `bmkg.musim_2026.elnino_peluang_moderat` | 98% | pustaka `bmkg-2026-musim-kemarau` | resmi | BMKG, prediksi 10 Juni 2026 |
| `bmkg.musim_2026.elnino_peluang_kuat` | 62% | idem | resmi | BMKG, prediksi 10 Juni 2026 |
| `karhutla.jawa.luas_2019` | 38.021 ha | pustaka `kemenhut-sipongi` | olah(resmi) | SiPongi |
| `karhutla.jawa.luas_2023` | 71.109,63 ha | idem | olah(resmi) | SiPongi |
| `karhutla.jatim.luas_2023` | 49.498,32 ha | idem | resmi | SiPongi |
| `karhutla.jawa.luas_2026_juli` | 13.684,50 ha | idem | olah(resmi) | SiPongi, sampai Juli 2026 |
| `dibi.jawa.karhutla.kejadian_2023` | 480 | olah `skenario-hidromet/dibi_kab_tahun.csv` | olah(resmi) | DIBI |
| `dibi.jawa.karhutla.kejadian_2026` | 364 | olah idem | olah(resmi) | DIBI 2026 sementara |
| `dibi.jawa.karhutla.kab_2026` | 70 | olah idem | olah(resmi) | DIBI 2026 sementara |
| `dibi.jawa.karhutla.meninggal_2026` | 6 | olah idem | olah(resmi) | DIBI 2026 sementara |
| `dibi.jawa.karhutla.hilang_2026` | 4 | olah idem | olah(resmi) | DIBI 2026 sementara |
| `dibi.jawa.karhutla.meninggal_2015` | 12 | olah idem | olah(resmi) | DIBI |
| `dibi.jawa.karhutla.meninggal_2018` | 3 | olah idem | olah(resmi) | DIBI |
| `dibi.jawa.karhutla.meninggal_2019` | 9 | olah idem | olah(resmi) | DIBI |
| `dibi.jawa.karhutla.meninggal_2015_2026` | 32 | olah idem | olah(resmi) | DIBI, 2026 sementara |
| `bps.padi.jateng_2023_persen` | −2,91% | pustaka `bps-jateng-2024-padi` | resmi | BPS Jawa Tengah |
| `bps.padi.jatim_2023_persen` | +1,93% | pustaka `bps-jatim-2024-padi` | resmi | BPS |
| `bps.padi.nasional_2023_sementara_persen` | −2,05% | pustaka `bps-2023-padi-sementara` | resmi | BPS |
| `bps.padi.jateng_2024_persen` | −2,12% | pustaka `bps-jateng-2025-padi-2024` | resmi | BPS Jawa Tengah |
| `bps.padi.jatim_2024_persen` | −4,53% | pustaka `bps-jatim-2025-padi-2024` | resmi | BPS Jawa Timur |
| `bps.padi.jateng_2023_vs_rerata2122` | −4,3% | olah pustaka `bps-jateng-2024-padi`, `bps-jateng-2022-padi-2021` | olah(resmi) | BPS Jawa Tengah |
| `bps.padi.jateng_2024_vs_rerata2122` | −6,3% | olah idem + `bps-jateng-2025-padi-2024` | olah(resmi) | BPS Jawa Tengah |
| `bps.padi.jatim_2023_vs_rerata2122` | +0,5% | olah pustaka `bps-jatim-2024-padi`, `bps-jatim-2022-padi-2021` | olah(resmi) | BPS Jawa Timur |
| `bps.padi.jatim_2024_vs_rerata2122` | −4,0% | olah idem + `bps-jatim-2025-padi-2024` | olah(resmi) | BPS Jawa Timur |
| `bps.padi.jateng_2015_persen` | +17,14% | pustaka `bps-jateng-2016-padi-2015` | resmi | BPS Jawa Tengah |
| `bps.padi.jatim_2015_persen` | +6,11% | pustaka `bps-jatim-2016-padi-2015` | resmi | BPS Jawa Timur |
| `bps.padi.jawa_2015_naik_juta_ton` | 2,31 juta ton | pustaka `bps-2016-padi-2015` | resmi | BPS |
| `perka_2008.air_bersih_3hari_liter` | 7 | pustaka `bnpb-2008-kebutuhan-dasar` | resmi | Perka BNPB 7/2008 |
| `perka_2008.jarak_sumber_air_m` | 500 | idem | resmi | Perka BNPB 7/2008 |
| `nonalam.tpa.jawa_2023_tercatat` | 5 | olah `nonalam-sosial/peristiwa.csv` | olah(resmi) | BNPB per kejadian |
| `nonalam.tpa.jawa_2026_tercatat` | 3 | olah idem | olah(resmi) | BNPB per kejadian |
| `renas.aksi_141e.target_2029` | 1 dokumen/peta | pustaka `bnpb-2025-renas` hlm. 67 | resmi | Renas PB |
| `renas.aksi_121i.trc_2024` | 80 daerah | pustaka `bnpb-2025-renas` hlm. 58 | resmi | Renas PB |
| `renas.aksi_121i.trc_2029` | 84 daerah | idem | resmi | Renas PB |

---

## Pustaka

Entri lengkap CSL-JSON di `naskah/air/bukti/bab-05.pustaka.json` (45 entri). Daftar ringkas 38 sumber pokok:

1. BMKG (2026, 13 Oktober). Analisis Dinamika Atmosfer Dasarian I Oktober 2026. [`bmkg-2026-dinamika-okt1`] (primer, baru)
2. BMKG (2026, 22 September). Siaran pers prediksi musim hujan 2026/2027. [`bmkg-2026-musim-hujan`]
3. BMKG (2026, 10 Juni). Siaran pers puncak musim kemarau Agustus 2026. [`bmkg-2026-musim-kemarau`]
4. InfoPublik (2026, 2 Oktober). Awal dan puncak musim hujan 2026/2027 berdekatan. [`infopublik-2026-awal-puncak`]
5. NOAA CPC. Oceanic Niño Index. [`noaa-2026-oni`]
6. NOAA PSL. Dipole Mode Index (HadISST1.1). [`noaa-psl-dmi`] (baru)
7. BNPB. Data dan Informasi Bencana Indonesia (DIBI). [`bnpb-dibi`]
8. BNPB. Indeks Risiko Bencana Indonesia (IRBI) InaRISK. [`bnpb-irbi`]
9. BNPB. Kajian Risiko Bencana 2022–2026 (InaRISK). [`bnpb-2026-krb`]
10. BNPB (2012). Perka BNPB 2/2012 Pedoman Umum Pengkajian Risiko Bencana. [`bnpb-2012-pengkajian-risiko`]
11. BNPB (2025). Perban 1/2025 Rencana Nasional PB 2025–2029. [`bnpb-2025-renas`]
12. BNPB (2008). Perka BNPB 7/2008 Pedoman Tata Cara Pemberian Bantuan Pemenuhan Kebutuhan Dasar. [`bnpb-2008-kebutuhan-dasar`]
13. BNPB (2020). Perban 4/2020 Penggunaan Dana Siap Pakai. [`bnpb-2020-dsp`] (baru)
14. BNPB (2024). Perban 2/2024 Sistem Peringatan Dini Bencana. [`bnpb-2024-peringatan-dini`] (baru)
15. BNPB (2026). Perban 1/2026 Penelaahan, Verifikasi, dan Evaluasi Penyaluran Dana Bersama. [`bnpb-2026-dana-bersama`] (baru)
16. BNPB (2026). Juklak 7/2026 SPM sub-urusan bencana, subkegiatan KIE. [`bnpb-2026-juklak7`] (baru)
17. Republik Indonesia (2018). Perpres 17/2018. [`ri-2018-perpres17`] (baru)
18. Republik Indonesia (2026). Perpres 46/2026. [`ri-2026-perpres46`] (baru)
19. Republik Indonesia (2007). UU 24/2007. [`ri-2007-uu24`]
20. Republik Indonesia (2019). UU 17/2019. [`ri-2019-uu17`]
21. Republik Indonesia (2023). UU 6/2023. [`ri-2023-uu6`]
22. Republik Indonesia (2015). PP 122/2015 SPAM. [`ri-2015-pp122`]
23. Kementerian Kehutanan. SiPongi, luas kebakaran per provinsi 2015–2026. [`kemenhut-sipongi`] (baru)
24. BPS (2023, 16 Oktober). Luas panen dan produksi padi 2023 (angka sementara). [`bps-2023-padi-sementara`] (baru)
25. BPS (2024, 1 Maret). Luas panen dan produksi padi 2023 (angka tetap). [`bps-2024-padi-tetap`] (baru)
26. BPS Provinsi Jawa Tengah (2024, 1 Maret). Luas panen dan produksi padi Jawa Tengah 2023 (angka tetap). [`bps-jateng-2024-padi`] (baru)
27. BPS (2024, 26 Maret). Luas panen dan produksi padi Jawa Timur 2023 (angka tetap). [`bps-jatim-2024-padi`] (baru)
28. Siswanto dkk. (2022). Kekeringan meteorologis Jawa, El Niño dan IOD. [`siswanto-2022-kekeringan`]
29. BNPB (2024, 22 Juni). Kepala BNPB himpun kekuatan cegah kebakaran TPA Suwung (16 TPA terbakar hebat 2023). [`bnpb-2024-tpa-suwung`] (baru)
30. BMKG (2026, 23 Oktober). Analisis Dinamika Atmosfer Dasarian II Oktober 2026. [`bmkg-2026-dinamika-okt2`] (baru)
31. BNPB (2018). Perban 5/2018 Kondisi dan Tata Cara Pelaksanaan Penyelenggaraan PB dalam Keadaan Tertentu. [`bnpb-2018-perban5`] (baru)
32. BPS (2016, 1 Juli). Produksi padi tahun 2015 naik 6,42 persen. [`bps-2016-padi-2015`] (baru)
33. BPS Provinsi Jawa Tengah (2016, 1 Juli). Produksi padi tahun 2015 sebesar 11,30 juta ton GKG. [`bps-jateng-2016-padi-2015`] (baru)
34. BPS Provinsi Jawa Timur (2016, 1 Juli). Produksi padi dan palawija (angka tetap) tahun 2015. [`bps-jatim-2016-padi-2015`] (baru)
35. BPS Provinsi Jawa Tengah (2025, 3 Maret). Luas panen dan produksi padi 2024 (angka tetap). [`bps-jateng-2025-padi-2024`] (baru)
36. BPS Provinsi Jawa Timur (2025, 3 Maret). Luas panen dan produksi padi Jawa Timur 2024 (angka tetap). [`bps-jatim-2025-padi-2024`] (baru)
37. BPS Provinsi Jawa Timur (2022, 1 Maret). Produksi padi Jawa Timur 2021 sebesar 9,789 juta ton GKG. [`bps-jatim-2022-padi-2021`] (baru)
38. BPS Kabupaten Klaten (2022, 1 Maret). Luas panen dan produksi padi di Jawa Tengah 2021 (angka tetap). [`bps-jateng-2022-padi-2021`] (baru)

Sumber per kejadian TPA (BNPB 2023 dan 2026) dan siaran KLH/BPLH 17 April 2026 tercatat per baris di
`nonalam-sosial/peristiwa.csv` dan `skenario_terburuk.csv`; empat yang dipakai langsung juga masuk berkas pustaka sebagai
entri tambahan (`bnpb-2023-sarimukti`, `bnpb-2026-jatiwaringin`, `bnpb-2026-jatibarang`, `klh-2026-open-dumping`). Berita NU
Online dan RRI (T1.16) serta Metro TV 16 Oktober 2026 (T4.13, `metrotv-2026-bromo`) masuk berkas pustaka dengan
`verifikasi: sekunder` dan tidak dipakai di badan teks.

---

## Catatan perbaikan atas temuan pemeriksa (24 Oktober 2026)

Semua temuan dicek ulang ke sumber sebelum diubah.

1. **Korban karhutla di Kartu 5.1 (tinggi).** Diterima. Angka dihitung ulang dan cocok: 2015 12; 2018 3; 2019 9; 2026 6
   meninggal dan 4 hilang; ditambah 2023 1 dan 2024 1 (jumlah 32 meninggal, sama dengan KERANGKA). Perbaikan mengikuti
   KERANGKA §4 versi final, yang sudah memuat **Kartu 5.2 Karhutla Jawa** terpisah: lantai korban karhutla ditulis di Kartu 5.2
   (T4.6a), Kartu 5.1 memuat baris "Korban jiwa kekeringan: tidak tercatat" dan satu baris rujukan ke lantai karhutla. Label
   "kebakaran setempat" hanya dipasang untuk 2015, karena temuan 7 menurunkan status sebab tahun lain. Ikut diselaraskan
   dengan KERANGKA §4: kebakaran TPA Jawa tidak berkartu di Kajian 1, jadi baris TPA di matriks kini merujuk ke Kartu 8.3
   Kajian 2.
2. **Persistensi El Niño (sedang).** Diterima. Siaran pers BMKG 10 Juni 2026 dibuka ulang dan memuat kalimat persistensi serta
   peluang 98% dan 62% (T4.2). InfoPublik kini hanya untuk frasa awal dan puncak musim hujan berdekatan.
3. **ENSO ASO +3,08 (sedang).** Diterima; angka cocok dengan rilis 13 Oktober. Ditambah rilis BMKG 23 Oktober (dasarian II)
   yang memuat ASO +3,05 dan peringatan dini dasarian III, ditulis berdampingan (T2.9, T4.1). Kunci
   `bmkg.dasarian_okt1_2026.enso_aso` sudah ada dengan nilai sama di `naskah/mitigasi/bukti/bab-07.angka.json`; entri di
   bab-05 identik. KERANGKA Kartu 5.1 masih menulis JAS +2,63; tidak diubah di sini karena di luar berkas bukti.
4. **Korelasi P2 (sedang).** Diterima. Hitung ulang dari T2.1: kab lawan ONI 0,321, jiwa terdampak lawan ONI 0,660 dan lawan
   DMI 0,666. Kab lawan DMI dari DMI dua desimal di tabel T2.1 memberi 0,555; nilai kunci 0,553 dipertahankan karena dihitung
   dari DMI NOAA PSL tanpa pembulatan, dan keduanya sama bila dibulatkan ke 0,55.
5. **T4.11 dibantah oleh tahun lain (sedang).** Diterima. Produksi BPS 2015 ditarik untuk Jawa Tengah, Jawa Timur, dan total
   Pulau Jawa (semuanya naik); Jawa Barat, Banten, DI Yogyakarta, dan DKI Jakarta belum. Karena ukuran model (satu musim tanam
   kemarau, tadah hujan) dan BPS (produksi setahun) berbeda, label "dibantah oleh" diganti "disandingkan, tahun sama" dengan
   batas perbandingan tertulis; BPS 2023 menjadi "pembanding tahun El Niño lain".
6. **Atribusi produksi 2023 (sedang).** Diterima. Atribusi ke El Niño ditandai [Inferensi tim]; produksi 2024 dan pembanding
   rerata 2021–2022 ditambahkan. Rerata tiga tahun tidak dipakai karena angka tetap Jawa Tengah 2020 belum terbuka; ukuran
   yang dipakai ditulis eksplisit lawan permintaan KERANGKA ("lawan tren").
7. **Status sebab kematian karhutla (sedang).** Diterima. Status 2019 dan 2026 (juga 2018, 2023, 2024) diturunkan ke "belum
   diverifikasi sebabnya"; seri T4.13 dilengkapi 2018 (Pangandaran, Magelang, Sragen). Rilis BNPB kejadian Probolinggo tidak
   ditemukan; berita Metro TV 16 Oktober 2026 (kejadian 15 Oktober, 4 meninggal, 2 luka) bertentangan dengan baris DIBI (10 September, 5
   meninggal, 4 hilang) dan ditulis berdampingan sebagai sekunder.
8. **Perpres 46/2026 Pasal 3 ayat (4) (sedang).** Diterima dengan koreksi. Bunyi ayat (4) cocok dengan korpus hlm. 3 (T3.3a).
   Pemeriksaan status pedoman menemukan hal yang tidak disebut temuan: Perban 5/2018 adalah pedoman lama untuk Pasal 3 ayat
   (4) Perpres 17/2018, berstatus BERLAKU, dan sudah memuat kriteria kekeringan kualitatif ("kemarau panjang"). Karena itu
   inferensi tidak ditulis "belum ada ambangnya" tanpa syarat, melainkan "kriteria kualitatif ada di pedoman lama, ambang angka
   belum ada, dan pedoman baru menurut Perpres 46/2026 belum ditemukan".
9. **UU 17/2019 Pasal 31 (sedang).** Diterima. Bunyi pasal (hlm. 23) dan Penjelasannya (hlm. 72) cocok dengan korpus (T3.8a);
   baris "pengaturan alokasi air darurat" masuk Tabel 5.2, dan pelaksana pola operasi waduk saat kemarau dicatat sebagai
   celah P3. Perubahan pasal ini oleh UU 6/2023 belum diperiksa pada teks lengkap.
