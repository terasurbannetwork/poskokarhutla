# Berkas bukti BAB 6 BENCANA GEOLOGI

Kajian: Grand Design Mitigasi Bencana Indonesia 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9). Penulis bab menulis hanya dari berkas ini
dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/mitigasi/bukti/bab-06.angka.json`: 97 kunci angka baru untuk registri (belum digabung ke `data/angka.json`).
- `naskah/mitigasi/bukti/bab-06.pustaka.json`: 24 entri CSL-JSON.

Bahan yang dibaca: `KERANGKA.md` §2, §5 (Bab 6 dan bab tetangga 3–5), §6, §7, §8; `KEPUTUSAN.md`; Buku Pegangan L56–L64
(titik tengah dilarang, angka kunci di depan, bahasa lugas); `PEDOMAN-DESAIN.md` §C6, §C8, §C9 dan tabel kode grafik
G1–G24; `riset/A` §1.4, §4.4, §6, §7, §8; `riset/D` §1.5–§1.7; `riset/E` §E1–§E5, §E11, §E16, §3, §4; paket
`data/skenario-geologi/` (README, `ringkasan.csv`, `gempa_kab.csv`, `tsunami_kab.csv`, `kepekaan.csv`, `analog.csv`,
`pembanding_pdna.csv`, `pembanding_resmi.csv`, `merapi2010_kab.csv`, `gunungapi_krb_kab.csv`, `skenario.json`);
`data/dibi/kejadian_besar.csv`; `data/irbi/irbi_kab_2025.csv`; `data/turunan/daftar_perhatian.csv` dan
`daftar_perhatian_kepekaan.csv`; `data/program-terbukti/kompendium_program.csv`; `riset/mentah/ks_gempabumi.json`,
`ks_tsunami.json`, `ks_letusan-gunungapi.json`, `ks_likuefaksi.json`, `usp000ensm.geojson`;
`public/gempa/data/kalibrasi_kerusakan.json`; korpus `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` (Renas PB) dan
`perban-nomor-2-tahun-2023.json` (penyusunan rencana kontingensi); berkas bukti mitigasi `bab-02` sampai `bab-05` dan
`bab-07` (supaya angka sama dan kunci tidak ganda); sumber web yang dibuka 24 Oktober 2026 (disebut per butir).

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah RI, dokumen atau tabel dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka (jurnal bertinjauan, USGS, Cabinet Office Jepang) |
| estimasi-model | Keluaran model yang belum diuji balik terhadap data Indonesia (termasuk mesin Pantau Bencana dan PAGER USGS) |
| asumsi-kebijakan | Pilihan penyusun (jendela, ambang kelas, pengali, durasi) |
| sekunder | Berita atau kutipan pihak lain; sumber primer tidak terbuka. **Tidak masuk badan teks**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**.

Aturan tampil yang dipakai di seluruh berkas (KERANGKA §2 butir 9): angka model tidak masuk judul bila melampaui angka
tercatat tanpa penjelasan; pita yang lebarnya lebih dari satu orde (rasio batas tinggi terhadap batas rendah > 10) tidak
masuk judul, kartu angka, atau RE; korban tsunami platform tidak dikutip sampai genangan InaRISK `Inun_*` × penduduk
dipakai. Tiap angka model di berkas ini ditulis berdampingan dengan angka tercatat untuk kejadian atau wilayah yang sama.
Keluaran platform bukan Data Bencana menurut Perban BNPB 1/2023; tiap gambar dan tabel model memuat pernyataan produsen
"Simulasi skenario Pantau Bencana, belum divalidasi" (prinsip 19).

---

## Kerangka bab (dari KERANGKA.md §5, BAB 6)

- **Judul:** BAB 6 BENCANA GEOLOGI (14 hlm).
- **Subbab:** 6.1 Gempa Bumi Megathrust; 6.2 Gempa Bumi Sesar Darat Dekat Permukiman; 6.3 Tsunami; 6.4 Gunung Api;
  6.5 Gempa, Tsunami, dan Likuefaksi Majemuk; 6.6 Kesenjangan Spesifik dan Implikasi. Tiap jenis: bahaya dan histori,
  status resmi lembaga dan indeks, sebaran, kartu.
- **Tujuan bab:** menyatakan apa yang dapat dan tidak dapat dikuantifikasi untuk skenario terburuk geologi, dengan
  paparan resmi dan kejadian analog sebagai angka utama.
- **Pertanyaan kunci:**
  1. Berapa penduduk terpapar resmi per bahaya geologi, dan di mana?
  2. Apa yang dapat dan tidak dapat dikuantifikasi untuk megathrust dan tsunami?
  3. Berapa korban dan kerusakan pada kejadian analog sesar darat, erupsi, dan gempa majemuk?
  4. Tuas apa yang paling menekan korban menurut data yang ada?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| KRB: gempa 272.405.410 terpapar, Rp1.111,32 T; tsunami 5.341.282, Rp42,98 T; gunung api 5.864.711, Rp12,05 T; likuefaksi 86.689.779, Rp351,88 T | **Dikonfirmasi** di teks Renas PB (korpus, hlm. 22, 24, 25). **Ditambah:** kelompok rentan per bahaya, luas kelas tinggi, dan aset di kelas bahaya (sekolah, puskesmas, rumah sakit) dari API KRB yang sama (P1) |
| Tidak ada skenario korban resmi PuSGeN atau BMKG; renkon megathrust nasional tidak ditemukan | **Dikonfirmasi.** **Ditambah:** Lampiran Perban BNPB 2/2023 hlm. 17 memuat contoh "Perencanaan Kontingensi Tsunami Akibat Gempabumi Megathrust Jawa Timur" (Provinsi Jawa Timur, 2021) yang memproyeksikan meninggal sebesar 1% penduduk terpapar per kab; renkon provinsi itu sendiri tidak dibuka (P2) |
| Megathrust selatan Jawa: M8,5 tanpa MMI ≥ VII; kepekaan M9,1 69 juta jiwa MMI ≥ VII (30–110 juta), korban analog 11.000–140.000; kartu memakai Mmaks setelah Peta Gempa 2024 dibuka | **Diperbarui:** Peta Gempa 2024 sudah dibuka (riset E §E1); Mw 9,1 segmen gabungan Jawa kini Resmi, sehingga syarat KERANGKA untuk memakai Mmaks terpenuhi. **Catatan:** bidang patahan platform untuk Mw 9,1 sepanjang 702 km, sedangkan segmen gabungan PuSGeN 1.120 km; kartu tetap berlabel "geometri platform". Pita korban 12,7 kali (lebih dari satu orde) tetap terlarang di kartu angka (P2) |
| Tsunami: jiwa pesisir rendah tiba ≤ 30 menit 2,9 juta (M8,5) dan 3,4 juta (M9,1), luput di pantai selatan Jawa Barat, Lebak, Pandeglang, Banyuwangi; faktor evakuasi ×1 / ×0,662 / ×0,437 | **Dikoreksi:** ×0,662 tidak ada di dokumen primer Cabinet Office; nilai primer pengganti ×0,600 (survei warga 2023) (riset E §E3). **Ditambah:** renkon Jatim 2021 mencatat 165.202 jiwa terpapar di Banyuwangi, sedangkan proksi platform tanpa batas waktu tiba memberi 44.692 (beda definisi; P2 butir 9). **Dikoreksi:** angka 2,9 dan 3,4 juta adalah skenario megathrust Jawa termasuk Bali dan NTB; Pulau Jawa saja 2,40 dan 2,55 juta. Daftar kab yang luput berbeda menurut skenario: pada Mw 9,1 Banyuwangi, Pandeglang, dan Lombok Barat tidak luput (P2 butir 9) |
| Sesar darat: Yogyakarta 2006 5.749 (USGS); Cianjur 2022 602 meninggal, 114.683 mengungsi, 56.278 rumah rusak (DIBI); Mmaks Lembang, Cimandiri, Opak diminta ke PuSGeN | **Dikoreksi sebagian:** 114.683 dan 56.278 adalah baris DIBI Kab. Cianjur saja; seluruh kejadian (5 kab) 115.382 mengungsi dan 57.337 rumah rusak. Mmaks sesar darat kini Resmi (PuSGeN 2024 Tabel 6.9: Lembang 6,6; Cimandiri 6,3–6,8; Opak 6,9), sehingga permintaan ke PuSGeN gugur. **Ditambah:** penilaian awal kerusakan dan kerugian Bappenas 2006 untuk Yogyakarta (5.716 meninggal; Rp29,1 T) dan R3P Cianjur (Rp4,55 T; 334 meninggal per data BPBD 7 Des 2022) (P3) |
| Gunung api: Merapi 2010 DIBI 386 meninggal, 447.982 mengungsi; model sapuan sekitar 90.000 jiwa tanpa evakuasi; KRB III 30 gunung 86.615 jiwa | **Dikonfirmasi.** **Ditambah:** Merapi dan Agung memuat 75,0% jiwa KRB III 30 gunung; Surono dkk. (2012): 10.000–20.000 jiwa terselamatkan oleh prakiraan PVMBG (P1, P3, P4) |
| Majemuk: Sulteng 2018 DIBI 4.140 meninggal, 705 hilang, 212.719 mengungsi, 110.214 rumah rusak; Rp13,82 T sementara (BNPB 20 Okt 2018) | **Dikonfirmasi.** Halaman BNPB tidak terjangkau langsung 24 Okt 2026; dibuka dari arsip Wayback dan memuat rincian sektor (perumahan Rp7,95 T) dan wilayah (P3) |
| Megathrust Bali–Sumba tanpa sumber magnitudo: tidak dibuat kartu | **Diperbarui:** PuSGeN 2024 memberi Mmaks Sumba 8,5 (periode ulang "No Data"); skenario platform 8,3 di bawah Mmaks, bukan "tanpa sumber". Tetap tanpa kartu megathrust sampai dijalankan di 8,5. **Ditambah:** gempa Laut Flores 15 Agustus 2026 (sesar naik di dalam lempeng Sunda menurut USGS; DIBI NTT sementara 151 meninggal) belum ada di KERANGKA dan menjadi kandidat analog NTT (P3) |

- **Komponen (KERANGKA):** Gambar 6.1 peta jiwa pesisir rendah tiba ≤ 30 menit dan panjang pantai, berlabel paparan
  (G20); Gambar 6.2 peta kab terpapar MMI pada kepekaan magnitudo (G19); Kartu 6.1 megathrust selatan Jawa (B5.11);
  Kartu 6.2 megathrust Mentawai–Enggano; Kartu 6.3 sesar darat dekat permukiman (analog); Kartu 6.4 erupsi gunung api
  (analog Merapi 2010 dan KRB); Kartu 6.5 gempa, tsunami, dan likuefaksi (analog Sulteng 2018 dan KRB likuefaksi);
  Gambar 6.3 tuas evakuasi atas paparan dan tuas kepatuhan bangunan (G14); Tabel 6.1 rasio analog guncangan dan
  tsunami (B5.7); Tabel 6.2 pembanding kerugian kejadian (B5.7). Pembaruan di bagian Komponen akhir berkas.
- **Status data (KERANGKA):** sebagian (Mmaks sekunder; `Inun_*` belum dipakai; bangunan tidak ada, rumah = jiwa / 3,9;
  sekolah dan faskes hanya 9 provinsi, tidak satu pun di Jawa); celah (Mmaks sesar darat; PDNA dan R3P final).
  **Pembaruan:** Mmaks megathrust dan sesar darat kini Resmi (riset E §E1); R3P Cianjur dan penilaian awal Bappenas
  Yogyakarta 2006 terbuka; angka sementara BNPB Sulteng terbuka lewat arsip; jumlah sekolah, puskesmas, dan rumah sakit di
  kelas bahaya tsunami, gempa, gunung api, dan likuefaksi tersedia nasional dari API KRB (bukan per kab); `Inun_*`,
  data bangunan, PDNA Merapi 2010, R3P Lombok dan Sulteng tetap tidak ada.

Catatan lingkup: bab ini berhenti di bahaya dan histori, status resmi, sebaran, kartu, kesenjangan spesifik, dan
implikasi (prinsip 17). Posisi bukti program yang disebut di P4 hanya dicatat supaya penulis tidak menyebutnya
"terbukti"; strategi dan rekomendasi ada di Bab 11 dan Bab 13. Periode acuan lantai geologi 1996–2025 mengikuti keputusan
berkas bukti Bab 3 (P2, Inferensi).

---

## P1. Berapa penduduk terpapar resmi per bahaya geologi, dan di mana?

### Inti

Kajian Risiko Bencana 2022–2026 mencatat penduduk terpapar gempa 272.405.410 jiwa (melampaui penduduk wilayah 271.680.290
di basis data yang sama, jadi praktis seluruh penduduk), likuefaksi 86.689.779, gunung api 5.864.711, dan tsunami
5.341.282, dengan potensi kerugian fisik dan ekonomi Rp1.111,32 T, Rp351,88 T, Rp12,05 T, dan Rp42,98 T yang tidak boleh
dijumlah antarbahaya. Sebaran resmi per kab untuk keempat bahaya ini belum ada di paket; ukuran resmi yang tersedia
memberi gambaran berbeda: IRBI 2025 menaruh 59 dari 112 kab kelas nilai teratas gempa di Sumatra dan tidak satu pun dari
56 kab kelas teratas tsunami di Jawa, sedangkan zona KRB PVMBG 30 gunung memusatkan 75,0% dari 86.615 jiwa KRB III di
Merapi dan Agung.

### Temuan bersumber

1. **Paparan dan potensi kerugian KRB 2022–2026 per bahaya geologi:**

   | Bahaya | Luas kelas tinggi (ha) | Terpapar (jiwa) | Umur rentan | Miskin | Disabilitas | Potensi kerugian fisik + ekonomi (juta Rp) |
   | --- | ---: | ---: | ---: | ---: | ---: | ---: |
   | Gempa bumi | 30.745.445 | 272.405.410 | 28.208.985 | 27.413.330 | 957.980 | 1.111.318.267 |
   | Likuefaksi | 457.325 | 86.689.779 | 8.939.959 | 8.656.035 | 296.088 | 351.875.950 |
   | Letusan gunung api | 189.193 | 5.864.711 | 649.712 | 675.532 | 24.620 | 12.048.691 |
   | Tsunami | 740.906 | 5.341.282 | 543.028 | 610.525 | 27.354 | 42.978.422 |

   Sumber: korpus `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` (Renas PB 2025–2029) hlm. 22 (luas), hlm. 24
   (terpapar, kelompok rentan, kerugian gempa, tsunami, dan gunung api), hlm. 25 (kerugian likuefaksi), baris sumber "Kajian Risiko
   Bencana Tahun 2022-2026"; dicek ulang 24 Okt 2026, sama dengan riset A §1.4. Pustaka `bnpb-2025-renas`. Kunci:
   `renas.krb.terpapar_gempa`, `renas.krb.terpapar_tsunami`, `renas.krb.terpapar_gunungapi`,
   `renas.krb.terpapar_likuefaksi`, `renas.krb.kerugian_tsunami`, `renas.krb.kerugian_gunungapi`,
   `renas.krb.kerugian_likuefaksi` (usulan bab-02), `renas.krb.kerugian_gempa` (usulan bab-03),
   `renas.krb.luas_tinggi_tsunami`, `renas.krb.tsunami.terpapar_umur_rentan`, `.terpapar_miskin`,
   `.terpapar_disabilitas` (baru). Label: resmi. Renas menulis gempa sebagai bahaya geologi dengan potensi penduduk
   terpapar tertinggi (hlm. 24).
2. **Paparan gempa melampaui penduduk:** di API KRB yang sama `terpapar` gempa 272.405.410 lebih besar daripada
   `wilayah_penduduk` 271.680.290. Field `jiwa_terpapar` (gempa 131.881.978; likuefaksi 77.370.182; tsunami 4.252.077;
   gunung api 1.000.037) tidak sama dengan angka Renas dan artinya tidak terdokumentasi. Sumber:
   `riset/mentah/ks_gempabumi.json`, `ks_likuefaksi.json`, `ks_tsunami.json`, `ks_letusan-gunungapi.json` (ditarik paket
   23 Okt 2026); `skenario-geologi/pembanding_resmi.csv`. Pustaka `bnpb-2026-krb-geologi`. Label: resmi (angka); arti
   `jiwa_terpapar` belum dikonfirmasi, tidak dipakai.
3. **Aset di kelas bahaya (API KRB, nasional):**

   | Bahaya | Sekolah kelas tinggi | Sekolah kelas sedang | Puskesmas tinggi | Puskesmas sedang | Rumah sakit tinggi | Rumah sakit sedang |
   | --- | ---: | ---: | ---: | ---: | ---: | ---: |
   | Gempa bumi | 198.052 | 322.390 | 3.351 | 5.000 | 722 | 1.383 |
   | Likuefaksi | 73.208 | 226.593 | 1.245 | 3.638 | 293 | 1.135 |
   | Tsunami | 59.839 | 70.505 | 1.210 | 1.459 | 232 | 264 |
   | Letusan gunung api | 24.721 | 35.468 | 378 | 528 | 35 | 52 |

   Sumber: field `assets` di keempat berkas `riset/mentah/ks_*.json`; pustaka `bnpb-2026-krb-geologi`. Kunci:
   `krb.tsunami.sekolah_kelas_tinggi`, `krb.tsunami.puskesmas_kelas_tinggi`, `krb.tsunami.rs_kelas_tinggi`,
   `krb.gempa.sekolah_kelas_tinggi`, `krb.gempa.puskesmas_kelas_tinggi`, `krb.gunungapi.sekolah_kelas_tinggi`,
   `krb.gunungapi.puskesmas_kelas_tinggi`, `krb.likuefaksi.sekolah_kelas_tinggi`. Label: resmi; arti dibaca dari nama
   field (jumlah fasilitas di kelas bahaya sedang dan tinggi), dokumentasi API tidak dibuka. **Memperbarui** status data
   KERANGKA ("sekolah dan faskes hanya 9 provinsi"): itu berlaku untuk mesin skenario platform, bukan untuk paparan resmi.
4. **IRBI 2025 per bahaya geologi (nilai per kab):**

   | Bahaya | Kab bernilai | Batas kelas nilai teratas | Kab di kelas teratas | Sebaran kelas teratas | Nilai tertinggi |
   | --- | ---: | ---: | ---: | --- | --- |
   | Gempa bumi | 514 | 11 | 112 | Sumatra 59, Papua 20, Sulawesi 14, Jawa 9, Bali dan Nusa Tenggara 5, Maluku 5 | 36 (Kota Padang Sidempuan, Kota Padang Panjang) |
   | Tsunami | 273 | 22 | 56 | Sumatra 18, Sulawesi 11, Papua 10, Maluku 9, Bali dan Nusa Tenggara 8, Jawa 0 | 35 (Kota Sibolga) |
   | Gunung api | 132 | 17 | 31 | Sumatra 12, Bali dan Nusa Tenggara 6, Maluku 5, Jawa 4, Sulawesi 4 | 31 (Kab. Manggarai) |

   Nilai tsunami tertinggi di Jawa: Kab. Sukabumi 19, Kab. Pangandaran 16, Kab. Cianjur, Kab. Pacitan, dan Kab. Trenggalek
   15. Sumber: `irbi/irbi_kab_2025.csv` kolom `gempabumi`, `tsunami`, `gunungapi`, `pulau`; batas kelas teratas =
   v[⌊n × 4/5⌋] dengan nilai sama ikut masuk (prinsip 8; berkas bukti Bab 3 P1, aturan 3.8); dihitung penyusun bukti
   24 Okt 2026. Pustaka `bnpb-irbi`. Kunci: `irbi.gempa.kab_kelas_atas.2025`, `irbi.tsunami.kab_dinilai.2025`,
   `irbi.tsunami.kab_kelas_atas.2025`, `irbi.tsunami.kab_kelas_atas_jawa.2025`, `irbi.gunungapi.kab_dinilai.2025`,
   `irbi.gunungapi.kab_kelas_atas.2025`. Label: resmi (nilai); asumsi-kebijakan (kelas kuintil). Kab tanpa nilai ditulis
   "tidak dinilai" (prinsip 7). Skala 2025 bilangan bulat dan patah terhadap 2015–2024 (berkas bukti Bab 3 P1).
5. **IRBI 2025 di kab tempat kejadian geologi besar:** Kota Palu gempa 9, tsunami 11; Kab. Donggala gempa 12, tsunami 18;
   Kab. Sigi gempa 15; Kab. Cianjur gempa 9; Kab. Bantul gempa 7; Kab. Lombok Utara gempa 4; Kab. Mamuju gempa 8,
   tsunami 23; Kab. Kepulauan Mentawai gempa 13, tsunami 13; Kota Padang gempa 12, tsunami 21; Kab. Sleman gunung api 14;
   Kab. Magelang 11; Kab. Klaten 9; Kab. Lumajang 11; Kab. Karangasem 13. Dibanding batas kelas teratas (gempa 11, tsunami
   22, gunung api 17), hanya Sigi, Donggala, Mentawai, dan Padang (gempa) serta Mamuju (tsunami) yang masuk. Korelasi
   peringkat IRBI 2025 dengan jumlah laporan DIBI 2015–2025 per kab: gempa 0,231 (n = 514), gunung api 0,254 (n = 132).
   Sumber: `irbi/irbi_kab_2025.csv`; kunci `irbi_dibi.nasional.spearman.gempa`, `irbi_dibi.nasional.spearman.gunungapi`
   (usulan bab-03). Label: resmi (nilai); asumsi-kebijakan (korelasi, analisis penyusun).
6. **KRB PVMBG 2018 untuk 30 gunung (zona × WorldPop 2026):** KRB III 86.615 jiwa, KRB II 297.012, KRB I 482.762
   (jumlah 866.389). Per gunung, KRB III terbesar: Merapi 34.582 (39,9%), Agung 30.414 (35,1%), Semeru 9.304, Sinabung
   3.668, Lewotobi Laki-laki 2.768, Karangetang 2.385. Per provinsi: Bali 30.414, Jawa Tengah 19.874, DI Yogyakarta 14.779,
   Jawa Timur 10.279 (Jawa dan Bali 87,0% jiwa KRB III). Jumlah 866.389 adalah 14,8% dari paparan gunung api KRB nasional
   5.864.711 karena cakupan berbeda (30 gunung, piksel ≤ 20 km dari puncak). Sumber: `skenario-geologi/ringkasan.csv`
   baris `krb-30-gunung`; `gunungapi_krb_kab.csv` (dijumlah penyusun bukti per gunung dan provinsi; selisih ≤ 3 jiwa
   karena pembulatan per baris, README §5). Pustaka `pantaubencana-2026-skenario-geologi`. Kunci: `geologi.krb30.jiwa_krb3`,
   `geologi.krb30.jiwa_krb2`, `geologi.krb30.jiwa_krb1`, `geologi.krb30.porsi_merapi_agung_krb3`. Label: resmi (zona) ×
   terverifikasi (penduduk); porsi olah.
7. **Daftar perhatian geologi (aturan Bab 3.8):** gempa 30 kab (Sumatera Barat 8, Aceh 5, Sumatera Utara 3, Jawa Barat 3,
   Sulawesi Tengah 3, sisanya tersebar), tsunami 16 kab, gunung api 12 kab. Di Jawa, daftar tsunami hanya memuat Kab.
   Pandeglang. Sepuluh kab pantai selatan Jawa Tengah, DI Yogyakarta, dan Jawa Timur (Cilacap sampai Banyuwangi) serta
   Kab. Sumenep hanya memenuhi satu syarat (proksi pesisir rendah, kolom `syarat_d`); lima kab pantai selatan Jawa Barat
   (Sukabumi, Cianjur, Garut, Tasikmalaya, Pangandaran) memenuhi nol syarat. Untuk gempa, Kab. Cianjur, Kota Palu, Kab.
   Bantul, Kab. Lombok Utara, dan Kab. Mamuju memenuhi satu syarat (kejadian berkorban sejak 2008) dan tidak masuk; syarat
   paparan KRB gempa per kab "tidak dinilai". Sumber: `turunan/daftar_perhatian.csv` kolom `syarat_a` sampai `syarat_d`,
   `syarat_d_arti`, `n_syarat`, `masuk`; `turunan/daftar_perhatian_kepekaan.csv`; kunci `perhatian.mitigasi.gempa.n`,
   `perhatian.mitigasi.tsunami.n`, `perhatian.mitigasi.gunungapi.n` (sudah di registri). Label: asumsi-kebijakan.
8. **Sebaran pada skenario platform (bukan paparan resmi):**
   - Jawa Mw 9,1: 77 kab dengan jiwa MMI ≥ VII (nilai tengah) > 0; porsi jiwa MMI ≥ VII Jawa Timur 38,8%, Jawa Tengah
     29,0%, Jawa Barat 22,6%, DI Yogyakarta 5,7%, Bali 4,0%; terbesar Kab. Bandung, Kab. Malang, Kab. Jember, Kota
     Bandung, Kab. Garut. Mentawai Mw 8,9: Sumatera Barat 52,5%, Bengkulu 34,4%; terbesar Kota Padang, Kab. Pesisir
     Selatan, Kab. Padang Pariaman. Sumber: `skenario-geologi/gempa_kab.csv` kolom `jiwa_mmi7plus_tengah` (dijumlah
     penyusun bukti); kunci `geologi.jawa_mmaks.kab_mmi7`. Label: estimasi-model; belum diuji balik.
   - Jiwa kecamatan pesisir rendah dengan tiba ≤ 30 menit, skenario megathrust Jawa (termasuk Bali dan NTB): M8,5
     2.862.544 jiwa di 13 kab, Kab. Cilacap sendiri 1.028.616 (35,9% dari total skenario), Bali dan NTB 466.249 (16,3%;
     antara lain Kota Denpasar 274.971, Kota Mataram 277.892), Pulau Jawa saja 2.396.295; Mw 9,1 3.442.456 di 17 kab,
     Bali dan NTB 892.046 (25,9%), Pulau Jawa saja 2.550.410; Mentawai 930.750 di 17 kab (Kota Bengkulu 285.942, Kota Padang
     223.143). Sumber: `skenario-geologi/tsunami_kab.csv` kolom `jiwa_pesisir_rendah_lt30`; `ringkasan.csv`. Kunci:
     `geologi.jawa.jiwa_pesisir_30mnt`, `geologi.jawa_mmaks.jiwa_pesisir_30mnt`, `geologi.mentawai.jiwa_pesisir_30mnt`,
     `geologi.jawa.porsi_cilacap_pesisir`, `geologi.jawa.jiwa_pesisir_30mnt_pulau_jawa`,
     `geologi.jawa_mmaks.jiwa_pesisir_30mnt_pulau_jawa` (baru; kolom `pulau`, dijumlah penyusun bukti). Label:
     estimasi-model; proksi seluruh penduduk kecamatan, bukan genangan.
9. **Isu wilayah di RPJMN:** isu Wilayah Jawa mencakup gempa dan tsunami di pesisir selatan (RPJMN 2025–2029 Lampiran I
   hlm. 216). Sumber: riset E §E11; pustaka `ri-2025-perpres12-rpjmn`. Label: resmi.

### Inferensi

- **[Inferensi tim]** "Di mana" untuk geologi tidak dapat dijawab dengan satu ukuran. Paparan KRB gempa mencakup praktis
  seluruh penduduk, jadi tidak membedakan wilayah; IRBI 2025 per bahaya membedakan wilayah tetapi tidak sejalan dengan
  kejadian (korelasi 0,23 dan 0,25) dan tidak menaruh satu pun kab Jawa di kelas teratas tsunami, padahal pantai selatan
  Jawa berhadapan dengan segmen gabungan Mw 9,1 dan tinggi tsunami model hingga sekitar 20 m di pulau-pulau kecil selatan
  Banten (Kab. Pandeglang tidak di kelas teratas; P2 butir 3). Penjelasan yang mungkin: IRBI memuat kapasitas yang
  dapat naik setelah bencana (Palu, Cianjur), skala 2025 bilangan bulat, dan nilai tsunami hanya ada untuk 273 kab. Tanpa
  catatan metode IRBI 2025 (KD-4) penjelasan ini tidak dapat dipastikan, jadi naskah tidak boleh menyebut sebabnya.
  Akibatnya untuk naskah: IRBI tampil sebagai status resmi per kab (prinsip 7), sedangkan peta sebaran Bab 6 memakai
  paparan skenario berlabel dan KRB PVMBG.
- **[Inferensi tim]** Aturan daftar perhatian tsunami menghasilkan daftar tanpa pantai selatan Jawa kecuali Pandeglang
  karena tiga syaratnya gagal bersamaan di pantai itu: (a) IRBI tidak menaruh kab Jawa di kelas teratas, (b) proksi
  pesisir rendah luput di Jawa Barat (P2), (c) syarat kejadian sejak 2008 melewatkan Pangandaran 2006. Ini catatan untuk
  pemilik Bab 3 dan Bab 5 (aturan 3.8, Tabel 5.3), bukan strategi: daftar tsunami perlu ditulis dengan keterbatasan itu,
  atau syarat (b) diganti genangan `Inun_*` saat tersedia.
- **[Inferensi tim]** Untuk gunung api, dua gunung (Merapi, Agung) memuat tiga perempat jiwa KRB III 30 gunung; kartu
  6.4 cukup memakai Merapi 2010 sebagai analog dan menyebut Agung sebagai paparan terbesar kedua tanpa skenario.
- **[Inferensi tim]** Untuk tsunami, angka paparan resmi (5.341.282) dan proksi platform tidak sebanding. Proksi
  skenario megathrust Jawa (termasuk Bali dan NTB) memberi 2,86 dan 3,44 juta; untuk Pulau Jawa saja 2,40 dan 2,55 juta,
  setara 45% dan 48% dari angka nasional. Proksi menghitung seluruh penduduk kecamatan yang pusatnya rendah (Cilacap
  35,9% dari total skenario M8,5) dan melewatkan kecamatan yang pusatnya tinggi. Naskah menulis angka resmi di
  badan teks dan proksi hanya di Gambar 6.1 dengan daftar kab yang terlewat.

### Celah

- **KRB per kab untuk gempa, tsunami, gunung api, dan likuefaksi** tidak ada di paket. API yang sama
  (`apiv4/kajian-summary/{bahaya}/<kode>?level=kabupaten`, pola `bangun/skenario-hidromet.py`) dicoba ulang 24 Okt 2026
  dan tidak terjangkau (batas waktu koneksi 60 detik, tiga percobaan; dibi.bnpb.go.id terjangkau). Penyajian: angka
  nasional saja di badan teks; peta per kab memakai IRBI 2025 (status) dan skenario berlabel. Permintaan: tarik ulang
  empat bahaya ke `riset/mentah/krb_kab/`, atau minta tabel ke Direktorat Pemetaan dan Evaluasi Risiko Bencana.
- Arti field `jiwa_terpapar` dan `assets` di API KRB tidak terdokumentasi; naskah menulis "sekolah di kelas bahaya
  tinggi (InaRISK)" dengan catatan, dan dokumentasi diminta ke Pusdatinkom.
- Penduduk BPS per kab belum ditarik (KERANGKA §7 butir 25); paparan platform memakai WorldPop 2026.
- KRB PVMBG yang dipakai bertahun 2018; pemutakhiran per gunung setelah 2018 tidak dicari.

---

## P2. Apa yang dapat dan tidak dapat dikuantifikasi untuk megathrust dan tsunami?

### Inti

Yang Resmi: magnitudo maksimum dan periode ulang megathrust dari PuSGeN 2024 (Jawa gabungan Mw 9,1 dengan periode ulang
600 tahun; Jawa barat dan timur 8,9 dengan 400 tahun; Mentawai-Siberut, Mentawai-Pagai, dan Enggano 8,9 dengan 330 tahun;
Sumba 8,5 tanpa data periode ulang), paparan dan aset KRB; Terverifikasi (keluaran model terbitan bertinjauan): tinggi
tsunami hingga sekitar 20 m di pulau-pulau kecil selatan Banten (sekitar 105,5° BT) dan sekitar 12 m di Jawa Timur,
rata-rata maksimum 4,5 m sepanjang pantai selatan Jawa, dan hingga 34 m dekat Ujung Kulon pada skenario yang memasukkan
sesar naik belakang; turunan: peluang lima tahun 0,83% untuk Mw 9,1, 1,24% untuk Mw 8,9 per segmen Jawa, dan 1,50% untuk
Mw 8,9 per segmen Mentawai–Enggano. Estimasi model yang boleh di kartu: jiwa MMI ≥ VII Jawa Mw 9,1 69 juta (30–110 juta)
dan Mentawai Mw 8,9 5,8 juta (2,2–9,7 juta); korban guncangan, rumah rusak, pengungsi skenario, dan kerugian hanya di
lampiran karena pitanya lebih dari satu orde. Korban tsunami, genangan, luka, dan peluang megathrust Sumba tidak
dikuantifikasi; tidak ada skenario korban PuSGeN atau BMKG, dan renkon megathrust nasional tidak ditemukan.

### Temuan bersumber

1. **Mmaks dan periode ulang megathrust (PuSGeN 2024, Tabel 6.2 hlm. 342–343):** Aceh-Andaman 9,2; Nias-Simeulue 8,7;
   Batu 7,8; Mentawai-Siberut 8,9; Mentawai-Pagai 8,9; Enggano 8,9; periode ulang (kolom "Reccurent period", hlm. 342)
   Aceh-Andaman 600 tahun, Nias-Simeulue 580, Batu 150, Mentawai-Siberut 330, Mentawai-Pagai 330, Enggano 330 (disamakan
   dengan Segmen Pagai); Java (segmen gabungan, baru 2024) 9,1, panjang 1.120
   km, periode ulang 600 tahun; Western Java 8,9 (670 km, 400 tahun); Eastern Java 8,9 (450 km, 400 tahun); Sumba 8,5
   (periode ulang "No Data"). Jumlah segmen megathrust 14 (2024) dan 13 (2017); sesar aktif 401 dan 273. Buku memuat
   bahaya, bukan skenario korban. Sumber: riset E §E1; PDF PuSGeN 2024 Tabel 6.2 hlm. 342 dibuka ulang 24 Okt 2026 untuk kolom periode ulang Sumatra;
   pustaka `pusgen-2024-peta-gempa`. Kunci: `pusgen.jawa.mmaks`,
   `pusgen.jawa.periode_ulang`, `pusgen.jawa_segmen.mmaks`, `pusgen.jawa_segmen.periode_ulang`, `pusgen.sumba.mmaks`,
   `pusgen.megathrust.segmen_2024` (usulan bab-03), `pusgen.mentawai.mmaks`, `pusgen.mentawai.periode_ulang`, `pusgen.jawa.panjang` (baru). Label: resmi.
   **Memperbarui** `skenario-geologi/README.md` §1 dan §4.1 yang menyebut Mmaks "sekunder" dan Sumba "tanpa sumber".
2. **Peluang lima tahun (turunan Poisson dari periode ulang):** 1 − e^(−5/600) = 0,83% (Mw 9,1, pita 2 NRR) dan
   1 − e^(−5/400) = 1,24% (Mw 8,9 per segmen Jawa, pita 3), dan 1 − e^(−5/330) = 1,50% (Mw 8,9 per segmen
   Mentawai-Siberut, Mentawai-Pagai, atau Enggano, pita 3); ketiganya di atas ambang penyisihan 0,2%, jadi skenario Mw 9,1
   dan Mw 8,9 Mentawai tidak boleh disisihkan. Sumba "No Data", jadi "tidak dinilai". Sumber: riset E §E1, §3 butir 1;
   PuSGeN 2024 Tabel 6.2 hlm. 342; berkas bukti Bab 3 P2; kunci `geologi.jawa_gabungan.peluang_5th`,
   `geologi.jawa_segmen.peluang_5th` (usulan bab-03), `geologi.mentawai_segmen.peluang_5th` (baru).
   Label: asumsi-kebijakan; turunan dari periode ulang resmi, asumsi Poisson bukan angka PuSGeN.
3. **Tinggi tsunami literatur (keluaran model terbitan bertinjauan, bukan run-up terukur):** zona defisit slip selatan
   Jawa bagian barat setara Mw 8,9 dan Jawa Tengah-Timur Mw 8,8; bila pecah bersamaan Mw 9,1, tinggi tsunami hingga
   sekitar 20 m (20,2 m) di pulau-pulau kecil selatan Banten (sekitar 105,5° BT) dan sekitar 12 m di Jawa Timur,
   rata-rata maksimum 4,5 m sepanjang pantai selatan Jawa (Widiyantoro dkk., 2020; teks lengkap Europe PMC PMC7499206
   dibuka 24 Okt 2026; riset E §E2; pustaka `widiyantoro-2020-tsunami`). Frasa abstrak "south coast of West ... Java"
   berarti Jawa bagian barat, bukan Provinsi Jawa Barat; naskah tidak boleh menulis "pantai selatan Jawa Barat". Supendi
   dkk. (2022) memodelkan dua skenario sumber di celah seismik selatan Jawa Barat dan Sumatra tenggara, salah satunya
   dengan sesar naik belakang (backthrust), dan memperoleh tinggi maksimum hingga 34 m di pantai barat Sumatra paling
   selatan dan pantai selatan Jawa dekat Semenanjung Ujung Kulon (abstrak dibaca lewat Crossref 24 Okt 2026, CC BY 4.0;
   pustaka `supendi-2022-megathrust`). Angka Supendi hanya untuk Kartu 6.1 atau wilayah Selat Sunda dan Ujung Kulon,
   bukan untuk segmen Mentawai–Enggano. Kunci: `widiyantoro.jawa_barat.tinggi_tsunami` (nama kunci lama; isinya selatan
   Banten), `widiyantoro.jawa_timur.tinggi_tsunami`, `widiyantoro.jawa.tinggi_rerata_maks`,
   `supendi.ujung_kulon.tinggi_tsunami`. Label: terverifikasi (keluaran model terbitan bertinjauan; Supendi: abstrak).
   **Memperbarui** `pembanding_resmi.csv` yang menandai Supendi "sekunder".
4. **Tidak ada skenario korban resmi pusat; ada contoh renkon provinsi.** Prinsip 5 KERANGKA dan riset E §E1 (buku
   PuSGeN memuat bahaya, bukan korban) dikonfirmasi. Renkon megathrust nasional tidak ditemukan (riset A §6). Tetapi
   Lampiran Perban BNPB 2/2023 hlm. 17 memuat "Contoh 1: Proyeksi Wilayah dan Penduduk Terdampak Tsunami Akibat
   Gempabumi Megathrust Jawa Timur", dikutip dari Perencanaan Kontingensi Tsunami Akibat Gempabumi Megathrust Jawa Timur
   Dalam Situasi Pandemi Covid-19 Provinsi Jawa Timur (2021):

   | Kab (penduduk terpapar) | Meninggal | Belum ditemukan | Mengungsi | Luka berat | Luka ringan |
   | --- | ---: | ---: | ---: | ---: | ---: |
   | Banyuwangi (165.202) | 1.652 | 330 | 148.682 | 826 | 8.260 |
   | Blitar (3.099) | 31 | 6 | 2.789 | 15 | 155 |
   | Jember (139.835) | 1.394 | 279 | 125.426 | 697 | 6.968 |

   Rasio yang tersirat sama di ketiga kab: meninggal 1,0%, belum ditemukan 0,2%, mengungsi 90%, luka berat 0,5%, luka
   ringan 5% dari penduduk terpapar (olah). Tabel di Perban terpotong ("dan seterusnya"), jadi total provinsi tidak
   dapat dihitung. Sumber: korpus `perban-nomor-2-tahun-2023.json` halaman 17; pustaka `bnpb-2023-renkon`. Kunci:
   `renkon.jatim2021.rasio_meninggal`, `renkon.jatim2021.banyuwangi_terpapar`, `renkon.jatim2021.jember_terpapar`.
   Label: resmi; contoh di lampiran peraturan. Dokumen renkon Jawa Timur 2021 sendiri tidak dibuka.
5. **Skenario platform: magnitudo dan geometri.** Tiga skenario `public/gempa/sim.js` (Jawa M8,5, Mentawai M8,8, Sumba
   M8,3) di bawah Mmaks; dua varian Mmaks (Jawa Mw 9,1, Mentawai Mw 8,9) memakai geometri yang sama dengan magnitudo
   diganti. Bidang patahan Jawa Mw 9,1: 702 km × 187 km (skala Strasser 2010), sedangkan segmen gabungan PuSGeN 1.120 km.
   Sumber: `skenario-geologi/README.md` §4.1; `skenario.json` `skenario[id=jawa-mmaks].panjang_km`; pustaka
   `pantaubencana-2026-skenario-geologi`. Kunci: `geologi.jawa_mmaks.panjang_bidang`. Label: estimasi-model.
6. **Hasil kunci skenario platform:**

   | Butir | Jawa M8,5 (ilustratif) | Jawa Mw 9,1 (Mmaks) | Mentawai M8,8 (ilustratif) | Mentawai Mw 8,9 (Mmaks) | Tampil di |
   | --- | --- | --- | --- | --- | --- |
   | Jiwa MMI ≥ VI (tengah) | 17,4 juta | 129,7 juta | 9,6 juta | 11,7 juta | kartu |
   | Jiwa MMI ≥ VII (pita; lebar) | 0 (0–5,5 juta) | 69,0 juta (30,2–110,4 juta; 3,7 kali) | 3,9 juta (1,2–7,5 juta; 6,2 kali) | 5,8 juta (2,2–9,7 juta; 4,4 kali) | kartu dan Gambar 6.2 |
   | Luas MMI ≥ VI | 17.481 km² | 120.796 km² | 80.637 km² | 107.023 km² | kartu |
   | Jiwa pesisir rendah tiba ≤ 30 menit | 2,86 juta | 3,44 juta | 0,93 juta | 0,93 juta | Gambar 6.1 (proksi) |
   | Panjang pantai tiba < 30 menit | 851–1.389 km | 1.585–2.175 km | 1.440–2.061 km | 1.622–2.193 km | Gambar 6.1 |
   | Pengungsi, (RB + RS) × 3,9 (tengah; pita) | 434.828 | 9.735.362 (1.418.106–62.668.967; 44 kali) | 563.696 | 891.831 (131.368–5.736.600; 44 kali) | lampiran |
   | Korban guncangan, rasio analog (pita; lebar) | 0–2.602 (tengah 0) | 10.720–136.032 (tengah 32.397; 12,7 kali) | 567–7.708 (13,6 kali) | 901–11.435 (12,7 kali) | lampiran |
   | Korban guncangan, mesin | 29–2.979 | 2.036–117.107 | 116–6.574 | 205–11.135 | lampiran |
   | Rumah rusak berat | 2.554–218.417 | 121.057–6.161.572 | 6.807–350.761 | 11.657–573.253 | lampiran |
   | Kerugian batas bawah (stimulan rumah) | Rp0,84–53,9 T | Rp20,4–883,2 T | Rp1,19–53,1 T | Rp1,89–81,2 T | lampiran |
   | Korban tsunami | tidak dikuantifikasi | tidak dikuantifikasi | tidak dikuantifikasi | tidak dikuantifikasi | – |

   Sumber: `skenario-geologi/ringkasan.csv`; README §5. Kunci: `geologi.jawa_mmaks.jiwa_mmi7`,
   `geologi.mentawai_mmaks.jiwa_mmi7`, `geologi.jawa.jiwa_mmi7`, `geologi.jawa_mmaks.jiwa_mmi6`,
   `geologi.jawa_mmaks.luas_mmi6` (baru); `geologi.jawa_mmaks.pengungsi`, `geologi.mentawai_mmaks.pengungsi` (baru,
   hanya lampiran);
   `geologi.jawa.korban_analog`, `geologi.jawa_mmaks.korban_analog`, `geologi.mentawai.korban_analog` (usulan bab-03,
   hanya lampiran). Label: estimasi-model; belum diuji balik. Pita pengungsi dihitung penyusun bukti dengan menerapkan aturan (RB + RS)
   × 3,9 pada batas rendah dan tinggi rumah rusak berat dan sedang di `ringkasan.csv`; pita 44 kali lebih dari satu orde,
   jadi pengungsi skenario tidak masuk kartu angka (KERANGKA §2 butir 9). Di kartu cukup aturan (RB + RS) × 3,9 beserta
   uji tiga kejadian (butir 10) dan pengungsi tercatat analog.
7. **Kinerja mesin, disandingkan dengan angka tercatat:** GMPE belum diuji (`model_guncangan.json` `kinerja_uji` =
   `belum_diuji`). Kalibrasi korban memakai 8 gempa kerak (3 di antaranya rangkaian Lombok) dengan faktor galat
   leave-one-out 5,341; korban pengamatan di berkas ditulis dari ingatan. Model lawan tercatat: Yogyakarta 2006 555 (LOO
   394) lawan 5.749 (USGS), 10,4 kali di bawah; Cianjur 2022 336 lawan 602 (DIBI); Mamuju 2021 24 lawan 107 (DIBI); Padang
   2009 di luar sampel 3.063 lawan 1.195 (DIBI). Tsunami hanya diuji invarian fisik, tanpa uji run-up; tinggi indikatif
   (Abe 1995 × 2) bukan run-up dan tidak dikutip (Mentawai M8,8 37,8 m di Kab. Bengkulu Utara; tidak ada pembanding literatur untuk segmen ini di
   berkas, karena angka 34 m Supendi berasal dari sumber di selatan Jawa Barat dan Sumatra tenggara). Laju gempa M6+ platform
   lolos uji balik 2016–2025 (berkas bukti Bab 3 P2). Sumber: `public/gempa/data/kalibrasi_kerusakan.json` (`kejadian`,
   `di_luar_sampel`, `faktor_loo`); riset D §1.5, §1.6; `skenario-geologi/README.md` §6. Kunci:
   `geologi.mesin.yogya2006_model`, `geologi.mesin.faktor_loo`. Label: estimasi-model; meleset dari data tercatat.
8. **Rasio analog yang dipakai mesin:** guncangan 0,016% / 0,047% (median) / 0,197% meninggal per jiwa MMI ≥ VII, dari
   enam gempa kerak dan slab (Yogyakarta 2006, Mamuju 2021, Lombok 5 Agu 2018, Cianjur 2022, Padang 2009, Pasaman Barat
   2022), dinormalkan ke okupansi 0,85; tidak ada analog megathrust. Tsunami: Mentawai 2010 447 / 11.016 = 4,06%, satu
   analog; Pangandaran 2006 tidak dipakai karena hanya 25,6% korbannya jatuh di kab yang terjangkau proksi (syarat 80%);
   dua rasio yang dicocokkan per kab terpaut 348 kali. Sumber: `skenario-geologi/analog.csv`; `skenario.json`
   `rasio_analog`; README §4.2. Kunci: `geologi.analog_guncangan.rasio`, `geologi.mentawai2010.rasio_tsunami`,
   `usgs.pangandaran2006.meninggal`, `geologi.pangandaran2006.porsi_korban_berpaparan`. Label: estimasi-model (rasio
   tsunami: orde besaran, belum layak dikutip); korban Pangandaran terverifikasi.
9. **Lubang proksi tsunami (berbeda per skenario):** pada Jawa M8,5, 18 kab punya tiba sisi aman < 30 menit tetapi jiwa
   pesisir rendah 0:
   Malang 9,9 menit; Tulungagung 10,5; Blitar 11,6; Wonogiri 11,8; Gunungkidul 12,8; Tasikmalaya 14,3; Banyuwangi 15,5;
   Pangandaran 16,7; Garut 17,1; Cianjur 18,2; Sukabumi 24,0; Klungkung 24,5; Lombok Barat 25,4; Lombok Tengah 27,3;
   Lebak 27,7; Tabanan 27,9; Pandeglang 28,1; Lombok Timur 29,5. Pada Jawa Mw 9,1 (skenario Gambar 6.1), 20 kab: Malang
   5,2 menit; Tulungagung 5,7; Tasikmalaya 5,8; Garut 6,5; Cianjur 7,0; Blitar 7,0; Wonogiri 7,7; Gunungkidul 8,4;
   Pangandaran 9,1; Klungkung 12,6; Sukabumi 12,8; Tabanan 15,6; Lombok Tengah 15,7; Lebak 16,6; Lombok Timur 18,2;
   Gianyar 19,2; Karangasem 19,4; Sumbawa 20,6; Lombok Utara 21,3; Buleleng 25,1. Banyuwangi, Pandeglang, dan Lombok
   Barat tidak luput pada Mw 9,1. Tiba sisi aman tercepat di seluruh kab Mw 9,1: Banyuwangi 4,0 menit (bukan lubang
   proksi); tercepat di antara kab lubang: Malang 5,2 menit. Sumber: README §6.4; `skenario.json`
   `lubang_proksi_tsunami`; `tsunami_kab.csv` kolom `tiba_menit_sisi_aman`, `jiwa_pesisir_rendah_lt30` (dihitung ulang
   penyusun bukti); kunci `geologi.jawa.lubang_proksi_kab`, `geologi.jawa_mmaks.lubang_proksi_kab` (baru). Label:
   estimasi-model. **Disandingkan dengan** renkon Jawa Timur 2021 (resmi; contoh di Perban 2/2023), dengan beda definisi:
   renkon memberi penduduk terpapar tanpa batas waktu tiba, jadi pembanding yang setara adalah proksi tanpa batas waktu
   (kolom `jiwa_pesisir_rendah_180`). Banyuwangi: renkon 165.202 lawan proksi 44.692 (M8,5 dan Mw 9,1 sama); Jember:
   renkon 139.835 lawan proksi 225.289. Kolom tiba ≤ 30 menit memberi Banyuwangi 0 pada M8,5 dan 44.692 pada Mw 9,1;
   `daftar_perhatian.csv` memberi Banyuwangi `syarat_d` = True.
10. **Pengungsi dari rumah rusak dapat dikuantifikasi:** aturan (RB + RS) × 3,9 terhadap rumah rusak DIBI memberi Cianjur
    (Kab. Cianjur) 115.799 lawan 114.683 tercatat, Lombok 425.233 lawan 406.202, Sulteng 245.954 lawan 212.719 (DIBI,
    `dibi.sulteng2018.mengungsi`); selisih 1–16% (Cianjur 1%, Lombok 5%, Sulteng 16%). `pembanding_pdna.csv` menulis
    pengungsi DIBI Sulteng 221.450 (selisih 11%), berbeda dari `dibi/kejadian_besar.csv` 212.719 (jumlah empat baris kab);
    angka utama 212.719. Sumber: `skenario-geologi/pembanding_pdna.csv` kolom `pengungsi_dibi`,
    `pengungsi_dari_rumah_rb_rs_x3_9`; `dibi/kejadian_besar.csv`; kunci `geologi.pengungsi_rumah.cianjur`,
    `dibi.cianjur2022.mengungsi_kab_cianjur`, `dibi.sulteng2018.mengungsi`. Label: asumsi-kebijakan; turunan
    yang diuji terhadap data resmi. Yang diuji adalah aturannya (meleset sampai 16%); rumah rusak skenario tetap estimasi-model.
11. **Status resmi jaringan pengamatan dan peringatan (Renas PB 2025–2029):** kegiatan 1.1.2.c jaringan pengamatan gempa
    dan tsunami (CORS 397 ke 420 unit; stasiun pasang surut 171 ke 200; penanggung jawab BMKG); 1.1.2.d sarana diseminasi
    informasi gempa dan tsunami (WRS/sirine) 480 ke 530 unit (BMKG); 1.1.2.e jaringan pengamatan gunung api dan gerakan
    tanah 219 ke 1.200 unit (Kementerian ESDM); 1.4.1.i informasi geospasial tematik gempa, tsunami, dan likuefaksi 11 ke
    12 dokumen atau peta (BMKG, Kementerian ESDM; kontributor BIG), lokasi termasuk daerah di sumber gempa megathrust;
    1.4.1.j pedoman informasi geospasial gunung api dan gerakan tanah 1 ke 10 dan peta 21 ke 85 (Kementerian ESDM).
    Masalah pokok Renas: zona sumber bahaya terbaru dan kawasan rawan bencana belum teridentifikasi lengkap untuk
    gempabumi, tsunami, dan kegagalan teknologi karena metode identifikasi bahaya belum optimal (hlm. 27–28). Sumber:
    korpus `perban-nomor-1-tahun-2025.json` hlm. 27–28, 52–53, 68; pustaka `bnpb-2025-renas`. Kunci:
    `renas.diseminasi_gempa_tsunami.unit_2024`, `.unit_2029`, `renas.pasut.unit_2024`, `.unit_2029`,
    `renas.pengamatan_gunungapi.unit_2024`, `.unit_2029`. Label: resmi. Pagu indikatif tidak dikutip (P5).
12. **Lantai per wilayah (kejadian tercatat terburuk 1996–2025):** gempa Jawa: Yogyakarta 2006, 5.749 meninggal (USGS;
    Bappenas 5.716, P3); tsunami selatan Jawa: Pangandaran 2006, 665 meninggal dan 65 hilang (USGS, rincian per kab);
    gempa Sumatra bagian barat: Padang 2009, 1.195 meninggal (DIBI; USGS 1.117); tsunami Sumatra bagian barat: Mentawai
    2010, 447 meninggal dan 56 hilang (DIBI); Aceh 2004, 127.720 meninggal dan 93.285 hilang (buku resmi BRR 2009, status
    sumber menunggu keputusan pemilik). Sumber: `dibi/kejadian_besar.csv`; `riset/mentah/usp000ensm.geojson` (impact-text
    per kabupaten; hilang dijumlah penyusun bukti: Ciamis 15, Tasikmalaya 2, Cilacap 15, Kebumen 33); berkas bukti Bab 3
    P2 dan Bab 4 P2. Kunci: `dibi.yogya2006.meninggal_usgs`, `dibi.padang2009.meninggal` (usulan bab-03),
    `dibi.mentawai2010.meninggal`, `dibi.mentawai2010.hilang`, `brr.aceh2004.meninggal` (usulan bab-04),
    `usgs.pangandaran2006.meninggal` (baru). Label: resmi (DIBI), terverifikasi (USGS).

### Inferensi

- **[Inferensi tim] Matriks ketersediaan kuantifikasi megathrust dan tsunami** (bahan Tabel 3.5 dan kartu 6.1, 6.2):

  | Metrik | Status | Angka yang dipakai | Tampil di | Alasan satu kalimat |
  | --- | --- | --- | --- | --- |
  | Mmaks, periode ulang | Resmi | Jawa 9,1 / 600 th; segmen 8,9 / 400 th; Mentawai–Enggano 8,9 / 330 th; Sumba 8,5 / "No Data" | judul, badan teks, kartu | PuSGeN 2024 Tabel 6.2 |
  | Peluang 5 tahun | Turunan | 0,83% (Mw 9,1); 1,24% (Mw 8,9 Jawa); 1,50% (Mw 8,9 Mentawai–Enggano); Sumba "tidak dinilai" | kartu, matriks G17 | Poisson dari periode ulang resmi |
  | Paparan penduduk | Resmi | KRB tsunami 5.341.282; gempa praktis seluruh penduduk | badan teks | KRB 2022–2026 |
  | Aset di kelas bahaya | Resmi | sekolah tsunami tinggi 59.839; puskesmas 1.210; RS 232 | badan teks, kartu | API KRB, arti dari nama field |
  | Tinggi tsunami | Terverifikasi (keluaran model terbitan bertinjauan) | sekitar 20 m (pulau kecil selatan Banten), 12 m (Jawa Timur), 4,5 m (rerata); hingga 34 m (Ujung Kulon, dengan backthrust) | Kartu 6.1, badan teks | jurnal bertinjauan; bukan run-up terukur |
  | Intensitas guncangan | Estimasi model | Jawa Mw 9,1: 69 juta jiwa MMI ≥ VII (30–110 juta) | kartu, Gambar 6.2 | pita < satu orde; GMPE belum diuji |
  | Waktu tiba tsunami | Estimasi model | pantai tiba < 30 menit; daftar kab | Gambar 6.1 | belum diuji terhadap kejadian |
  | Jiwa pesisir rendah | Estimasi model (proksi) | 2,86 dan 3,44 juta (skenario Jawa termasuk Bali dan NTB); Pulau Jawa saja 2,40 dan 2,55 juta | Gambar 6.1 dengan daftar kab terlewat | proksi kecamatan, bukan genangan |
  | Pengungsi gempa | Estimasi model, lampiran saja | aturan (RB + RS) × 3,9 di kartu; angka skenario 1,42–62,7 juta (Jawa Mw 9,1) | aturan di kartu; angka di lampiran | pita 44 kali; aturan diuji 3 kejadian (selisih 1–16%), rumah model belum |
  | Korban guncangan | Estimasi model | pita 12,7 kali | lampiran saja | lebih dari satu orde; mesin meleset 10 kali di Yogyakarta |
  | Rumah rusak, kerugian batas bawah | Estimasi model / Asumsi kebijakan | pita 43–86 kali (empat skenario megathrust) | lampiran saja | lebih dari satu orde |
  | Korban tsunami | Tidak dikuantifikasi | – | kartu menulis lantai tercatat | menunggu `Inun_*` × penduduk |
  | Genangan, luka, sekolah per kab Jawa | Tidak dikuantifikasi | – | – | data tidak ada |

- **[Inferensi tim] Uji lantai kartu megathrust:**

  | Kartu | Lantai tercatat (wilayah sama, 1996–2025) | Angka skenario | Hasil |
  | --- | --- | --- | --- |
  | 6.1 guncangan Jawa | Yogyakarta 2006: 5.749 meninggal | Mw 9,1: 10.720–136.032; M8,5: 0–2.602 | Mw 9,1 di atas lantai di seluruh pita; M8,5 di bawah lantai, tidak dipakai (sama dengan Bab 3) |
  | 6.1 tsunami selatan Jawa | Pangandaran 2006: 665 meninggal, 65 hilang | tidak dikuantifikasi | kartu menulis "tidak kurang dari kejadian 2006" |
  | 6.2 guncangan Sumatra barat | Padang 2009: 1.195 meninggal | Mw 8,9: 901–11.435; M8,8: 567–7.708 | batas bawah di bawah lantai; kartu menulis lantai tercatat saja, pita tetap utuh di lampiran (tidak dipotong) |
  | 6.2 tsunami Sumatra barat | Mentawai 2010: 447 meninggal, 56 hilang | tidak dikuantifikasi | kartu menulis lantai tercatat |

  Karena semua pita korban megathrust lebih dari satu orde, angka yang tampil di kartu angka untuk korban hanya lantai
  tercatat; pita model tetap utuh di lampiran. Batas bawah pita tidak dinaikkan ke lantai: lantai Padang 2009 adalah
  kejadian lain (gempa intraslab sekitar 80 km), bukan ketidakpastian model, dan memotong 901–11.435 menjadi
  1.195–11.435 akan membuat pita tampak lolos aturan satu orde (9,6 kali). Kartu dan lampiran menulis keduanya
  berdampingan.
- **[Inferensi tim]** Dengan Mmaks resmi, kartu 6.1 memenuhi syarat KERANGKA untuk berjudul Mmaks, tetapi bidang
  patahan platform 37% lebih pendek dari segmen gabungan PuSGeN (702 lawan 1.120 km), jadi sebaran guncangan ke barat
  dan timur kemungkinan kurang. Judul kartu menyebut "Mw 9,1 PuSGeN 2024 pada geometri platform"; angka jiwa MMI ≥ VII
  diberi catatan itu.
- **[Inferensi tim]** Rasio 1% renkon Jawa Timur dan rasio 4,06% Mentawai 2010 tidak dipakai untuk menghitung korban
  tsunami skenario: yang pertama adalah asumsi rasio tetap dalam contoh peraturan yang dasarnya tidak terbaca, yang
  kedua satu kejadian di pulau kecil dengan tiba sangat cepat. Keduanya ditulis berdampingan di lampiran metode sebagai
  alasan mengapa korban tsunami "tidak dikuantifikasi".
- **[Inferensi tim]** Megathrust Sumba punya Mmaks resmi 8,5 tetapi skenario platform dijalankan di 8,3 dan periode
  ulangnya "No Data"; kartu megathrust Sumba belum layak. Paparan pantai selatan Bali dan NTB dari proksi (Kota Mataram,
  Kota Denpasar) hanya disebut di Gambar 6.1.

### Celah

- **Genangan tsunami InaRISK `Inun_7_8_Mw` sampai `Inun_9_0_Mw`** belum dipakai (KERANGKA §7 butir 3); cakupan layer
  belum dicek. Korban tsunami tetap "tidak dikuantifikasi"; permintaan ke Direktorat Pemetaan dan Evaluasi Risiko
  Bencana untuk tabel penduduk per kab di dalam genangan per skenario.
- **Geometri segmen PuSGeN 2024** (jejak dan lebar) belum dipakai mesin; skenario dijalankan ulang dengan segmen 1.120 km
  bila jejak dapat dibaca dari buku PuSGeN.
- **Periode ulang megathrust Sumba** "No Data" di PuSGeN 2024 Tabel 6.2; sel kemungkinan Sumba "tidak dinilai".
- **Dokumen renkon tsunami megathrust Jawa Timur 2021** dan renkon megathrust provinsi lain (Banten, Jawa Barat, Jawa
  Tengah, DI Yogyakarta, Sumatera Barat, Bengkulu) tidak dicari di sesi ini; permintaan ke BPBD provinsi lewat Direktorat
  Kesiapsiagaan.
- Luka-luka tidak dimodelkan dan tidak dipakai (KERANGKA §7 butir 7). Data bangunan untuk zona skenario tidak ada (Open
  Buildings hanya Kalimantan Tengah); rumah = jiwa / 3,9. Sekolah dan faskes per kab di Jawa tidak tercakup mesin.
- GMPE belum diuji terhadap arsip intensitas dirasakan BMKG; korban kalibrasi perlu dicocokkan ke sumber halaman.

---

## P3. Berapa korban dan kerusakan pada kejadian analog sesar darat, erupsi, dan gempa majemuk?

### Inti

Sesar darat: gempa Yogyakarta 2006 menewaskan 5.749 orang (USGS; penilaian awal Bappenas 5.716) dengan kerusakan dan
kerugian Rp29,1 T dan 154.000–157.000 rumah hancur; gempa Cianjur 2022 mencatat 602 meninggal dan 8 hilang, 115.382
mengungsi, dan 57.337 rumah rusak (DIBI) dengan kerusakan dan kerugian Rp4,55 T (R3P). Erupsi: Merapi 2010 menewaskan
386 orang, 447.982 mengungsi, 2.919 rumah rusak (DIBI). Majemuk: Sulawesi Tengah 2018 mencatat 4.140 meninggal, 705 hilang,
212.719 mengungsi, dan 110.214 rumah rusak (DIBI), dengan kerusakan dan kerugian sementara Rp13,82 T (BNPB). Gempa Laut
Flores 15 Agustus 2026 menambah analog NTT: DIBI sementara 151 meninggal, USGS sedikitnya 136, tsunami 169 cm.

### Temuan bersumber

**Sesar darat dekat permukiman (6.2)**

1. **Yogyakarta 27 Mei 2006 (Mw 6,3):** USGS 5.749 meninggal. Penilaian awal kerusakan dan kerugian (laporan bersama
   Bappenas, pemda DIY, pemda Jawa Tengah, dan mitra internasional, Juni 2006): lebih dari 5.700 meninggal (kata
   pengantar), 5.716 (Tabel 1), 40.000–60.000 luka; kerusakan dan kerugian Rp29,1 T (US$3,1 miliar), terdiri dari
   kerusakan Rp22,75 T (78%) dan kerugian Rp6,40 T (22%); perumahan Rp15,3 T, lebih dari separuh total; rumah hancur
   157.000 dan rusak 202.000 (hlm. 15) atau 154.000 dan 260.000 (bagian Key Sectoral Facts), dua versi di dokumen yang
   sama; 600.000 sampai satu juta orang kehilangan rumah; Bantul dan Klaten paling parah. Laporan itu menilai teknik
   membangun yang buruk dan bahan bangunan bermutu rendah sebagai penyumbang besar jumlah korban (parafrase). DIBI dasbor
   publik tidak memuat kejadian sebelum 2008. Sumber: pustaka `usgs-usp000ej1c`, `bappenas-2006-dala-yogya` (dibuka 24 Okt
   2026, versi teks dokumen Bank Dunia). Kunci: `dibi.yogya2006.meninggal_usgs` (usulan bab-03),
   `bappenas.yogya2006.meninggal`, `bappenas.yogya2006.kerusakan_kerugian`, `bappenas.yogya2006.rumah_hancur` (baru).
   Label: terverifikasi (USGS); resmi, penilaian awal (Bappenas). **Memperbarui** riset A §4.4 yang menandai "±5.700
   Bappenas" sekunder.
2. **Cianjur 21 November 2022 (Mw 5,6):** DIBI (5 kab, 21–30 Nov 2022) 602 meninggal, 8 hilang, 7.824 luka, 115.382
   mengungsi, 57.337 rumah rusak (berat 13.730, sedang 16.320, ringan 27.287). Baris Kab. Cianjur saja: 114.683
   mengungsi dan 56.278 rumah rusak (13.633 / 16.059 / 26.586), inilah angka di KERANGKA. Renstra: 602 meninggal, 56.548
   rumah rusak, 108.720 mengungsi. R3P Cianjur (per data BPBD 7 Des 2022): 334 meninggal, 8 hilang, 593 luka berat,
   114.683 mengungsi; 114.315 rumah rusak (20.969 berat, 24.584 sedang, 68.762 ringan) menurut SK Bupati tahap II hasil
   reviu BNPB; kerusakan Rp3,98 T, kerugian Rp0,57 T, total Rp4,55 T; perumahan Rp3,21 T; kebutuhan R3P Rp5,05 T untuk
   2023–2025; sembilan desa di jalur Sesar Cugenang dikosongkan dari permukiman. Sumber: `dibi/kejadian_besar.csv`;
   `skenario-geologi/pembanding_pdna.csv`; riset E §E5; pustaka `bnpb-2026-dibi`, `cianjur-2022-r3p`. Kunci:
   `dibi.cianjur2022.meninggal`, `dibi.cianjur2022.rumah_rusak`, `r3p.cianjur2022.meninggal`, `r3p.cianjur2022.rumah_rusak`
   (usulan bab-04); `dibi.cianjur2022.hilang`, `dibi.cianjur2022.mengungsi`, `dibi.cianjur2022.mengungsi_kab_cianjur`,
   `r3p.cianjur2022.kerusakan_kerugian`, `r3p.cianjur2022.perumahan`, `r3p.cianjur2022.desa_dikosongkan` (baru). Label:
   resmi (R3P berstatus contoh di portal BNPB, tanpa nomor penetapan). **Dibantah oleh** R3P untuk korban (334 lawan
   602; beda tidak terjelaskan) dan rumah rusak (114.315 lawan 57.337). Perkiraan Bupati Rp4 T di `pembanding_pdna.csv`
   (sekunder) diganti angka R3P.
3. **Mmaks sesar darat dekat kota (PuSGeN 2024 Tabel 6.9, hlm. 368–371):** Lembang 6,6 (laju geser 3,45 mm/tahun);
   Cimandiri empat segmen 6,3–6,8 (Citatah 6,3; Nyalindung-Cibeber 6,5; Cimandiri 6,6; Cisokan 6,8); Cianjur 1 dan 2
   masing-masing 5,6; Cirata 6,8; Baribis 6,4; Semarang Front 6,9; Opak 6,9 (laju 2 mm/tahun). Sumber: riset E §E1;
   pustaka `pusgen-2024-peta-gempa`. Kunci: `pusgen.lembang.mmaks`, `pusgen.cimandiri.mmaks`, `pusgen.cianjur.mmaks`,
   `pusgen.opak.mmaks`. Label: resmi. **Dibantah:** `sim.js` memakai Lembang 6,8, Cimandiri 6,9, Opak 6,6 tanpa sumber
   (`skenario.json` `skenario[id=sesar-darat].alasan`).
4. **Gempa kerak lain di paket analog:** Lombok 2018, DIBI 569 meninggal (29 Jul–30 Sep, NTB dan Bali), 1.898 luka,
   406.202 mengungsi, 217.855 rumah rusak (berat 75.160); USGS 563; kebutuhan R3P Rp11,44 T dengan realisasi 94,73% per
   11 Sep 2023 (Kemenko PMK); angka kerugian Rp12,1 T hanya ada di media (sekunder, tidak masuk badan teks). Mamuju–Majene
   2021, DIBI 107; Pasaman Barat 2022, DIBI 27. Sumber: `dibi/kejadian_besar.csv`; `skenario-geologi/analog.csv`; riset E
   §E5; pustaka `kemenkopmk-2024-rehabrekon-lombok`. Kunci: `dibi.lombok2018.meninggal` (usulan bab-03/04),
   `dibi.lombok2018.mengungsi`, `dibi.lombok2018.rumah_rusak`, `kemenkopmk.lombok2018.kebutuhan_r3p` (baru). Label: resmi.

**Gunung api (6.4)**

5. **Merapi Oktober–Desember 2010:** DIBI 386 meninggal (Sleman 277, Magelang 56, Klaten 41, Boyolali 12), 381 luka,
   447.982 mengungsi, 2.919 rumah rusak (berat 2.465, sedang 158, ringan 296). Rekap BNPB 1 Des 2010: 347 (sekunder; beda
   tanggal rekap). Surono dkk. (2012): letusan terbesar dalam lebih dari seabad (VEI sekitar 4), sekitar sepertiga juta
   orang dipindahkan, hampir 400 meninggal; prakiraan PVMBG yang tepat waktu menurut penulis menyelamatkan 10.000–20.000
   jiwa. Sumber: `dibi/kejadian_besar.csv`; `skenario-geologi/merapi2010_kab.csv`; riset E §E16; pustaka
   `surono-2012-merapi`. Kunci: `dibi.merapi2010.meninggal`, `dibi.merapi2010.mengungsi`,
   `surono.merapi2010.jiwa_terselamatkan` (usulan bab-03/04), `dibi.merapi2010.rumah_rusak` (baru). Label: resmi (DIBI);
   terverifikasi (Surono, perkiraan penulis).
6. **Model Merapi setara 2010, disandingkan:** 89.707 jiwa di area sapuan awan panas dan lahar tanpa evakuasi (H/L 0,15;
   H/L 0,18: 34.742), 7.993 ha, awan panas 17,6 km dan lahar 21,1 km; pengungsi bila radius 20 km seperti 2010 1.552.098
   (3,46 kali pengungsi DIBI 447.982). Sebaran model per kab tidak cocok: 51% paparan sapuan di Magelang, padahal 72%
   korban nyata di Sleman (Kali Gendol). Korban skenario memakai angka 2010 (347–386). Sumber:
   `skenario-geologi/ringkasan.csv` baris `merapi2010`; README §5, §6 butir 2–3; pustaka
   `pantaubencana-2026-skenario-geologi`. Kunci: `geologi.merapi2010.jiwa_sapuan`, `geologi.merapi2010.pengungsi_radius20`.
   Label: estimasi-model (regresi atas keluaran 23 Okt, bukan validasi).
7. **Semeru 4 Desember 2021:** DIBI 64 meninggal, 9 hilang, 863 luka, 10.565 mengungsi, 1.027 rumah rusak (berat 942).
   Sumber: `dibi/kejadian_besar.csv`. Kunci: `dibi.semeru2021.meninggal`, `dibi.semeru2021.hilang` (usulan bab-04). Label:
   resmi.

**Gempa, tsunami, dan likuefaksi majemuk (6.5)**

8. **Sulawesi Tengah 28 September 2018:** DIBI (4 kab, 28 Sep–31 Okt) 4.140 meninggal, 705 hilang, 4.438 luka, 212.719
   mengungsi, 110.214 rumah rusak (berat 34.166, sedang 28.899, ringan 47.149). USGS: sedikitnya 2.077 meninggal, 1.075
   hilang. BNPB 22 Okt 2018 (dibuka dari arsip Wayback 24 Okt 2026 karena bnpb.go.id tidak terjangkau): per 21 Okt 13.00
   WIB 2.256 meninggal, 1.309 hilang, 4.612 luka, 223.751 mengungsi, 68.451 rumah rusak; kerusakan dan kerugian sementara
   per 20 Okt lebih dari Rp13,82 T (kerusakan Rp11,83 T, kerugian Rp1,99 T); perumahan Rp7,95 T, sosial Rp3,13 T,
   ekonomi produktif Rp1,66 T, infrastruktur Rp701,8 M, lintas sektor Rp378 M; Palu Rp7,63 T, Sigi Rp4,29 T, Donggala
   Rp1,61 T, Parigi Moutong Rp393 M; tsunami 2,2–11,3 m sampai 0,5 km ke darat; likuefaksi menimbun permukiman Petobo,
   Jono Oge, dan Sibalaya. Run-up tertinggi terukur 10,73 m (Tondo); tsunami tiba 3–8 menit setelah guncangan (Widiyanto
   dkk., 2019). Sumber: `dibi/kejadian_besar.csv`; pustaka `usgs-us1000h3p4`, `bnpb-2018-kerugian-sulteng`,
   `widiyanto-2019-palu`. Kunci: `dibi.sulteng2018.meninggal` (sudah di registri), `dibi.sulteng2018.hilang`,
   `bnpb.sulteng2018.meninggal_21okt`, `usgs.sulteng2018.meninggal`, `widiyanto.palu2018.runup_maks`,
   `widiyanto.palu2018.waktu_tiba` (usulan bab-03/04), `dibi.sulteng2018.mengungsi`, `dibi.sulteng2018.rumah_rusak`,
   `bnpb.sulteng2018.kerusakan_kerugian`, `bnpb.sulteng2018.perumahan` (baru). Label: resmi (DIBI; BNPB angka
   sementara); terverifikasi (USGS, Widiyanto). Angka BNPB 2.256 adalah rekap sementara; DIBI 4.140 menjadi angka utama.
   Paket memakai 4.141 (selisih satu jiwa karena jendela berbeda).
9. **KRB likuefaksi:** 86.689.779 jiwa terpapar, 457.325 ha kelas tinggi, potensi kerugian Rp351,88 T (P1). DIBI tidak
   memisahkan korban likuefaksi dari korban gempa dan tsunami Sulteng 2018.

**Tsunami (6.3) dan analog 2026 (6.1, 6.3)**

10. **Tsunami tercatat lain:** Pangandaran 17 Juli 2006 (Mw 7,7): USGS 665 meninggal dan 65 hilang, terbanyak Ciamis 413
    dan Cilacap 157. Mentawai 25 Oktober 2010 (Mw 7,8): DIBI 447 meninggal, 56 hilang, 498 luka, 15.353 mengungsi, 721
    rumah rusak. Selat Sunda 22 Desember 2018 (nontektonik): DIBI 437 meninggal, 16 hilang, 42.325 mengungsi. Sumber:
    `riset/mentah/usp000ensm.geojson`; `dibi/kejadian_besar.csv`; pustaka `usgs-usp000ensm`. Kunci:
    `usgs.pangandaran2006.meninggal`, `dibi.mentawai2010.mengungsi` (baru); `dibi.selatsunda2018.meninggal`,
    `dibi.selatsunda2018.hilang` (usulan bab-04). Label: terverifikasi (USGS); resmi (DIBI).
11. **Gempa Laut Flores 15 Agustus 2026 (sementara):** USGS: 14 Agu 2026 pukul 21.58 UTC (15 Agu 05.58 WITA), 66 km utara
    barat laut Ende, magnitudo Mww 7,8 di katalog dan M7,7 di teks USGS; sesar naik dangkal di dalam lempeng Sunda, bukan
    di zona subduksi Sunda yang berjarak sekitar 350 km di selatan; sekitar 1,7 juta jiwa terpapar MMI VI–VIII menurut
    PAGER; sedikitnya 136 meninggal, 1.776 luka, 27.414 rumah hancur, 71.486 rusak, 3.614 bangunan publik rusak; tsunami
    tercatat maksimum 169 cm di Pelabuhan Laut Pota; gempa M7,8 tahun 1992 di dekatnya menewaskan sedikitnya 2.500 orang.
    DIBI 2026 NTT kategori Gempabumi (sementara, 3,73 kejadian): 151 meninggal, 170.055 mengungsi, 29.315 rumah rusak
    berat. Media mengutip BNPB 111 meninggal per 30 Agu 2026 (sekunder). Sumber: pustaka `usgs-us6000tkt2` (dibuka lewat
    API FDSN USGS 24 Okt 2026); `dibi/rekap_provinsi_tahunan.csv`; berkas bukti Bab 4 P1 butir 13. Kunci:
    `usgs.flores2026.meninggal`, `usgs.flores2026.rumah_hancur`, `usgs.flores2026.tsunami_maks`,
    `usgs.flores2026.terpapar_mmi6_8` (baru); `dibi.ntt2026.gempa.meninggal`, `dibi.ntt2026.gempa.mengungsi`,
    `dibi.ntt2026.gempa.rumah_rusak_berat` (usulan bab-04). Label: terverifikasi (USGS; PAGER estimasi-model); resmi,
    sementara (DIBI).

**Kerugian kejadian lawan stimulan rumah**

12. **Pembanding kerugian:**

    | Kejadian | Angka kerugian resmi | Stimulan 60/30/15 juta × rumah rusak | Rasio | Catatan |
    | --- | --- | --- | ---: | --- |
    | Cianjur 2022, perumahan | Rp3,21 T (R3P) | Rp3,03 T (rumah R3P 20.969 / 24.584 / 68.762) | 1,06 | olah |
    | Cianjur 2022, total | Rp4,55 T (R3P) | Rp1,70 T (rumah DIBI Kab. Cianjur) | 2,68 | olah; paket memakai Rp4 T Bupati (sekunder): 2,35 |
    | Sulteng 2018, perumahan | Rp7,95 T (BNPB, sementara) | Rp3,62 T (rumah DIBI) | 2,19 | olah |
    | Sulteng 2018, total | Rp13,82 T (BNPB, sementara) | Rp3,62 T | 3,81 | sama dengan paket |
    | Lombok 2018 | kebutuhan R3P Rp11,44 T (Kemenko PMK) | Rp7,15 T (rumah DIBI) | 1,60 | kebutuhan, bukan kerusakan dan kerugian |
    | Yogyakarta 2006 | Rp29,1 T; perumahan Rp15,3 T (Bappenas) | tidak dihitung | – | rumah tercatat DIBI tidak ada |
    | Merapi 2010 | tidak ditemukan | Rp0,16 T (rumah DIBI) | – | PDNA tidak ditemukan |

    Sumber: `skenario-geologi/pembanding_pdna.csv` kolom `stimulan_60_30_15_rp_juta`; R3P Cianjur; BNPB 22 Okt 2018;
    Kemenko PMK 20 Mei 2024; Bappenas 2006. Kunci: `r3p.cianjur2022.rasio_perumahan_stimulan` (baru). Label: resmi
    (angka kerugian); olah(resmi) untuk rasio.

### Inferensi

- **[Inferensi tim]** Lantai kartu analog: sesar darat Jawa = Yogyakarta 2006 (5.749), lebih berat dari Cianjur 2022 dan
  menjadi angka utama kartu 6.3; gunung api = Merapi 2010 (386); majemuk = Sulteng 2018 (4.140 dan 705 hilang). Pita
  korban Merapi di `ringkasan.csv` (347–386) memuat rekap 1 Des yang lebih rendah dari DIBI; batas bawah 347 bukan pita
  ketidakpastian, jadi kartu memakai 386 saja dan menyebut 347 sebagai versi lain.
- **[Inferensi tim]** Mmaks Opak (6,9) lebih besar daripada gempa Yogyakarta 2006 (Mw 6,3), dan Mmaks Lembang (6,6) dan
  Cimandiri (sampai 6,8) lebih besar daripada Cianjur 2022 (5,6). Kartu 6.3 karena itu menulis analog sebagai lantai,
  bukan sebagai skenario terburuk, sampai skenario sesar darat dijalankan dengan Mmaks resmi. Gempa Cianjur 2022 sudah
  setara Mmaks segmen Cianjur (5,6), sehingga besar korbannya lebih dijelaskan oleh mutu bangunan dan letak permukiman
  daripada besar gempanya (penilaian, bukan hasil uji).
- **[Inferensi tim]** Stimulan rumah 60/30/15 juta mendekati nilai kerusakan perumahan R3P Cianjur bila jumlah rumah
  diambil dari R3P (1,06 kali), tetapi jauh di bawah bila jumlah rumah diambil dari DIBI (2,68 kali untuk total) dan di
  bawah angka perumahan Sulteng (2,19 kali). Kerugian total kejadian 1,5–3,8 kali stimulan (Cianjur dengan jumlah rumah R3P
  1,50 kali; Sulteng 3,81 kali). Ini menguatkan aturan
  KERANGKA bahwa stimulan hanya "batas bawah" dan bukan kerugian materiil penuh; rasio tidak dikalikan ke skenario.
- **[Inferensi tim]** Gempa Laut Flores 2026 terjadi di luar periode acuan (1996–2025) dan di sumber yang tidak punya
  kartu (sesar naik busur belakang, bukan megathrust Sunda). Bila periode acuan diperpanjang atau kartu NTT diminta,
  kejadian ini menjadi lantai NTT untuk gempa dan tsunami; keputusan ada di orkestrator (lihat Komponen, usulan Kartu
  6.6). Angka DIBI masih sementara (final sekitar Februari 2027).

### Celah

- PDNA atau R3P final Merapi 2010, Sulteng 2018, dan Lombok 2018 tidak ditemukan; penilaian akhir Yogyakarta 2006 (di luar
  penilaian awal) tidak dicari. Permintaan ke Deputi Bidang Rehabilitasi dan Rekonstruksi; seri CKAN kerusakan dan
  kerugian R3P belum ditarik (KERANGKA §7 butir 9).
- Beda korban Cianjur (R3P 334 per 7 Des 2022 lawan DIBI dan Renstra 602) tidak terjelaskan; ditulis berdampingan.
- Korban likuefaksi Sulteng 2018 tidak terpisah di DIBI; kartu 6.5 menulis korban gabungan.
- Mmaks dan periode ulang sesar naik busur belakang Flores tidak dibaca dari PuSGeN 2024; kartu NTT (bila diminta) memakai
  analog 2026 dan 1992 tanpa skenario.
- Pengungsi tercatat Yogyakarta 2006 tidak ada di DIBI; angka "600.000 sampai satu juta kehilangan rumah" bukan pengungsi
  tercatat dan hanya konteks.

---

## P4. Tuas apa yang paling menekan korban menurut data yang ada?

### Inti

Data yang ada menunjuk dua tuas menurut jenis bahaya: mutu bangunan untuk guncangan (di model platform korban turun ke
0,58–0,69 kali bila kepatuhan bangunan naik dan ke 0,15–0,38 kali bila penuh) dan evakuasi segera untuk tsunami dan erupsi
(kematian tsunami Nankai 0,437 kali bila evakuasi segera 70% lawan 20%, estimasi model Cabinet Office Jepang; untuk
Merapi 2010 hanya ada 386 meninggal tercatat dan perkiraan penulis 10.000–20.000 jiwa terselamatkan oleh prakiraan
PVMBG). Besar efek itu hanya berasal dari model yang belum diuji atau dari Jepang; tidak ada evaluasi dampak di
Indonesia, dan tidak satu pun program Indonesia untuk geologi di kompendium berbukti kuat: InaTEWS hulu terukur (waktu
terbit peringatan) tetapi dampaknya terhadap korban belum dievaluasi, Destana dan SPAB belum terbukti, Rekompak,
rekonstruksi Lombok, dan BRR lemah.

### Temuan bersumber

1. **Kepatuhan bangunan (mesin platform):** porsi stok tembok tanpa tulangan / beton terkekang / kayu 40/30/30 (dasar)
   ke 20/50/30 (naik) dan 0/70/30 (penuh). Faktor korban terhadap dasar:

   | Skenario | Kepatuhan naik | Kepatuhan penuh | Rumah rusak berat tengah (dasar ke penuh) |
   | --- | ---: | ---: | --- |
   | Jawa M8,5 | 0,60 | 0,20 | 24.991 ke 8.533 |
   | Jawa Mw 9,1 | 0,68 | 0,35 | 896.686 ke 473.310 |
   | Mentawai M8,8 | 0,68 | 0,36 | 50.378 ke 26.420 |
   | Mentawai Mw 8,9 | 0,69 | 0,38 | 84.335 ke 46.096 |
   | Sumba M8,3 | 0,58 | 0,15 | 928 ke 252 |

   Kelas "beton" di mesin tetap kurva pre-code, jadi manfaat kepatuhan penuh kemungkinan terlalu kecil (README §4.3).
   Sumber: `skenario-geologi/kepekaan.csv`; `skenario.json` `kepatuhan_bangunan`. Kunci:
   `geologi.kepekaan.bangunan_naik.jawa_mmaks`, `geologi.kepekaan.bangunan_penuh.jawa_mmaks`,
   `geologi.kepekaan.bangunan_penuh.mentawai_mmaks`. Label: estimasi-model; belum diuji balik.
2. **Bangunan dalam catatan resmi:** penilaian awal Yogyakarta 2006 menilai teknik membangun yang buruk dan bahan
   bermutu rendah sebagai penyumbang besar korban; perumahan lebih dari separuh kerusakan dan kerugian (P3 butir 1).
   Renas PB mencatat bangunan dan infrastruktur berkelayakan rendah tanpa konstruksi tahan bencana, pengawasan dan
   penegakan hukum yang lemah atas material tidak ber-SNI, tenaga ahli konstruksi tahan bencana yang kurang, dan RTRW
   serta RDTR yang belum seluruhnya berbasis mitigasi (hlm. 27). Sumber: pustaka `bappenas-2006-dala-yogya`,
   `bnpb-2025-renas` (korpus hlm. 27). Label: resmi.
3. **Kode bangunan di luar negeri:** pada gempa Maule 2010 (Mw 8,8), kegagalan bangunan hunian berizin 1985–2009 0,5% pada
   9.974 bangunan tiga lantai atau lebih dan 2,8% pada 1.939 bangunan sembilan lantai atau lebih. Kekuatan bukti sedang
   (satu kejadian, tanpa pembanding bangunan nonkode); posisi "Program dengan syarat (bukti sedang)". Padanan di
   Indonesia: pengawasan penerapan standar bangunan tahan bencana Renas 2.3.4.a (status dikembangkan); celah: rumah
   nonteknis tidak tersentuh izin, pengawasan lemah (kerusakan Cianjur 2022). Sumber:
   `program-terbukti/kompendium_program.csv` baris P22; pustaka `pantaubencana-2026-program-terbukti`. Label:
   terverifikasi.
4. **Evakuasi segera (tsunami), Cabinet Office Jepang 2025:** kasus Tokai, getaran sisi darat, musim dingin tengah malam:
   kematian tsunami sekitar 215.000 bila evakuasi segera rendah (20%), sekitar 94.000 bila tinggi (70%) dan imbauan
   efektif, sekitar 129.000 bila memakai hasil survei warga 2023 (53,3%). Rasio 0,437 (70% lawan 20%) dan 0,600 (survei
   lawan 20%); di delapan kombinasi kasus rasio tinggi lawan rendah 0,077–0,437, jadi 0,437 adalah yang paling
   konservatif. Ringkasan dokumen: selisih kematian tsunami antara evakuasi rendah dan tinggi 2,3–9,8 kali. Sumber: riset
   E §E3; pustaka `cao-japan-2025-nankai`. Kunci: `nankai.faktor_70`, `nankai.faktor_survei` (usulan bab-03),
   `nankai.faktor_rentang_kasus` (baru). Label: asumsi-kebijakan; rasio dari estimasi-model Cabinet Office Jepang 2025
   (angka 215.000, 94.000, dan 129.000 adalah perkiraan model, bukan kejadian teramati; KERANGKA §2 butir 10). **Dibantah oleh** dokumen
   primer yang sama: faktor ×0,662 (evakuasi 50%) di `skenario-geologi/kepekaan.csv` dan `ringkasan.csv` adalah
   interpolasi dari sumber sekunder dan tidak ada di dokumen Cabinet Office (kunci `geologi.kepekaan.faktor_50_paket`,
   usulan bab-03, berlabel "tidak boleh tampil").
5. **Evakuasi erupsi, Merapi 2010:** 386 meninggal tercatat; 447.982 mengungsi tercatat; Surono dkk. (2012): 10.000–20.000
   jiwa terselamatkan oleh prakiraan PVMBG (perkiraan penulis). Model sapuan memberi 34.742–89.707 jiwa di area sapuan
   tanpa evakuasi (dua nilai H/L, 0,18 dan 0,15), dengan penduduk WorldPop 2026, bukan 2010; sebaran model tidak cocok
   dengan kejadian (51% sapuan di Magelang, 72% korban di Sleman). Menyandingkan angka sapuan dengan korban mengandaikan
   seluruh penduduk sapuan meninggal tanpa evakuasi; itu inferensi, bukan besar efek, jadi rasio terhadap 386 tidak
   ditulis. Sumber: P3 butir 5–6. Label: resmi (DIBI); estimasi-model (sapuan, dengan semua asumsi di atas);
   terverifikasi (Surono, perkiraan penulis).
6. **Peringatan dini tsunami dekat sumber, Palu 2018:** Tsunami tiba 3–8 menit setelah guncangan; stasiun pasang surut
   Pantoloan di dalam Teluk Palu (dikelola BIG) tetap merekam, tetapi pengiriman datanya terhenti karena jaringan
   komunikasi putus (Widiyanto dkk., 2019, dibuka 24 Okt 2026). Waktu terbit peringatan InaTEWS (sekitar 5 menit setelah
   gempa 17.02 WIB), jam pencabutan (17.37 WIB), dan "sensor terdekat sekitar 200 km" hanya bersumber dari berita yang
   mengutip BMKG (Kontan, CGTN; `bukti_dampak.csv` B013–B016): **sekunder, tidak masuk badan teks**. Klaim "sensor terdekat
   sekitar 200 km" juga tidak sejalan dengan stasiun Pantoloan di dalam teluk yang dilaporkan Widiyanto dkk. Di Donggala dan Palu, 82,5% responden
   survei mengungsi setelah melihat orang lain mengungsi, dan tidak ada peringatan resmi yang diterima sebelum tsunami tiba
   (Harnantyari dkk., 2020, abstrak). InaTEWS: kompendium menulis kekuatan "sedang"; berkas ini menulisnya sebagai "hulu
   terukur, dampak terhadap korban belum dievaluasi", karena yang terukur hanya keluaran (kecepatan terbit) dan satu-satunya
   kejadian menunjukkan rantai hilir gagal; posisi "Program berjalan, wajib evaluasi dampak"; syarat: sensor muka laut di teluk, Pusdalops siaga terus-menerus, sirine dan pesan seluler sampai
   rumah tangga, warga terlatih evakuasi mandiri saat guncangan kuat. Sumber: `kompendium_program.csv` baris P03; pustaka
   `widiyanto-2019-palu`, `harnantyari-2020-palu`, `pantaubencana-2026-program-terbukti`. Kunci:
   `widiyanto.palu2018.waktu_tiba`, `harnantyari.palu2018.evakuasi_melihat_orang_lain` (usulan bab-04). Label:
   terverifikasi (Widiyanto, Harnantyari); sekunder (waktu terbit dan cabut peringatan, sampai rilis atau laporan BMKG
   dibuka).
7. **Waktu tiba di skenario:** pantai yang dicapai tsunami < 30 menit: Jawa M8,5 851–1.389 km, Jawa Mw 9,1 1.585–2.175 km;
   kab dengan tiba sisi aman tercepat di Jawa M8,5: Malang 9,9 menit, Tulungagung 10,5, Blitar 11,6 (P2 butir 9). Target
   resmi kecepatan penyampaian informasi peringatan dini BMKG: 3 menit menjadi kurang dari 3 menit (RPJMN 2025–2029
   Lampiran II hlm. 437–440); sarana diseminasi gempa dan tsunami 480 ke 530 unit (Renas). Sumber:
   `skenario-geologi/ringkasan.csv`; riset E §E11; pustaka `ri-2025-perpres12-rpjmn`, `bnpb-2025-renas`. Label:
   estimasi-model (waktu tiba, belum diuji terhadap kejadian); resmi (target).
8. **Penataan permukiman setelah kejadian:** R3P Cianjur mengosongkan sembilan desa di jalur Sesar Cugenang dari
   permukiman. Evaluasi dampak tidak ditemukan. Sumber: riset E §E5; kunci `r3p.cianjur2022.desa_dikosongkan`. Label:
   resmi.
9. **Posisi program terkait geologi di kompendium:**

   | Kode | Program | Kekuatan | Posisi | Catatan |
   | --- | --- | --- | --- | --- |
   | P01 | Desa dan Kelurahan Tangguh Bencana (Destana) | belum-terbukti | Program berjalan, wajib evaluasi dampak | hanya cakupan: 2.234 desa dibina lawan 53.000 desa rawan |
   | P02 | Satuan Pendidikan Aman Bencana (SPAB) | belum-terbukti | Program berjalan, wajib evaluasi dampak | indikator Renas berupa jumlah peserta dibina |
   | P03 | InaTEWS | sedang (kompendium); naskah: hulu terukur, dampak belum dievaluasi | Program berjalan, wajib evaluasi dampak | hulu cepat (sumber waktu terbit masih berita); hilir lemah (keterpenuhan peringatan dini 6%) |
   | P07 | Rekompak (Yogyakarta–Jawa Tengah 2006) | lemah | Rujukan tata kelola | laporan pelaksana dan donor sendiri |
   | P08 | BRR Aceh–Nias | lemah | Rujukan tata kelola | angka keluaran laporan sendiri |
   | P09 | Rehabilitasi-rekonstruksi rumah Lombok 2018 | lemah | Pelajaran, bukan teladan | mutu RISHA terhadap guncangan belum diuji |
   | P21 | Pendidikan kebencanaan Kamaishi (Jepang) | sedang | Program dengan syarat (bukti sedang) | luar negeri; padanan di Indonesia: SPAB (dikembangkan) |
   | P22 | Kode bangunan Chile NCh433 | sedang | Program dengan syarat (bukti sedang) | luar negeri; padanan di Indonesia: Renas 2.3.4.a (dikembangkan) |

   Sumber: `program-terbukti/kompendium_program.csv` kolom `kekuatan`, `posisi`, `padanan`, `status_padanan`, `celah`;
   pustaka `pantaubencana-2026-program-terbukti`. Label: per baris (resmi untuk P01, P02, P08, P09; terverifikasi untuk
   P07, P21, P22; terverifikasi untuk P03, dengan fakta waktu peringatan Palu berlabel sekunder).
10. **Jam kejadian (kondisi, bukan tuas):** gempa malam (okupansi rumah 0,99) memberi korban guncangan 1,165 kali
    rata-rata (0,85). Sumber: `skenario-geologi/kepekaan.csv`; kunci `geologi.kepekaan.malam`. Label: asumsi-kebijakan.

### Inferensi

- **[Inferensi tim] Tuas per jenis bahaya** (bahan Gambar 6.3, hanya berpil Asumsi kebijakan atau Estimasi model):

  | Jenis | Tuas yang ditunjuk data | Besar efek yang tersedia | Asal angka | Kekuatan bukti di Indonesia |
  | --- | --- | --- | --- | --- |
  | Guncangan megathrust dan sesar darat | mutu bangunan dan pengawasan | korban 0,58–0,69 kali (naik), 0,15–0,38 kali (penuh) | mesin platform, belum diuji | tidak ada evaluasi; Chile sedang (luar negeri) |
  | Tsunami dekat sumber (tiba < 30 menit) | evakuasi mandiri saat guncangan kuat | kematian 0,437 kali (70% lawan 20%), 0,600 kali (survei) | estimasi-model Cabinet Office Jepang (pil Asumsi kebijakan) | Palu 2018: peringatan resmi tidak sampai; Kamaishi sedang (luar negeri) |
  | Tsunami jauh dan nontektonik | rantai peringatan dini sampai rumah tangga | tidak dinilai | – | InaTEWS hulu terukur, dampak terhadap korban belum dievaluasi |
  | Erupsi | evakuasi berbasis prakiraan PVMBG | 10.000–20.000 terselamatkan (perkiraan penulis); sapuan model 34.742–89.707 jiwa (dua H/L, penduduk 2026, sebaran tidak cocok) hanya konteks paparan, bukan besar efek | Surono dkk.; model | satu kejadian; tidak ada evaluasi berpembanding |
  | Likuefaksi | letak permukiman | tidak dinilai | – | tidak ada |

- **[Inferensi tim]** Dua tuas itu tidak dapat diperingkat dengan satu angka. Untuk Jawa Mw 9,1, paparan guncangan (69 juta
  jiwa MMI ≥ VII) jauh lebih besar daripada proksi pesisir rendah (3,4 juta), tetapi pada kejadian analog kematian per jiwa
  terpapar tsunami (Mentawai 2010) sekitar dua orde lebih tinggi daripada guncangan. Naskah karena itu menulis keduanya
  sebagai tuas utama per jenis, tanpa menyatakan mana yang "paling" menekan korban secara nasional.
- **[Inferensi tim]** Untuk tsunami dekat sumber, waktu tiba model (sekitar 10 menit di pantai Jawa Timur terdekat pada
  M8,5; 4–6 menit pada Mw 9,1) dan pengalaman Palu (3–8 menit) lebih pendek atau setara dengan waktu terbit peringatan
  yang lazim (sekitar 5 menit menurut berita yang mengutip BMKG; sumber primer belum dibuka); cakupan peringatan dini
  (Renas 1.c, Renstra IKP) tidak cukup sebagai tuas untuk pantai ini. Ini dasar data bagi Bab 11, bukan rekomendasi.
- **[Inferensi tim]** Tidak ada program Indonesia untuk geologi yang boleh disebut "terbukti" (P6 dan prinsip 12):
  InaTEWS berstatus "Program berjalan, wajib evaluasi dampak" (hulu terukur, dampak terhadap korban belum dievaluasi); Destana dan SPAB "belum terbukti" berarti bukti tidak
  ditemukan, bukan program tidak bermanfaat. Bukti luar negeri (Chile, Kamaishi, Nankai) hanya dipakai lewat "Padanan di
  Indonesia". Efek tuas hanya tampil di kartu dan Gambar 6.3 berpil, tidak di tesis, Pesan Kunci, atau judul temuan
  (prinsip 10).

### Celah

- Evaluasi dampak program Indonesia untuk geologi (Destana, SPAB, InaTEWS hilir, rekonstruksi rumah pascagempa) tidak
  ditemukan; evaluasi UNDRR/UNESCO 2019 atas Palu ditolak server saat dibuka (kompendium P03).
- Data kepatuhan bangunan (izin, PBG, uji mutu) per kab tidak ada; data bangunan untuk zona skenario hanya Kalimantan
  Tengah. Efek kepatuhan penuh di mesin kemungkinan terlalu kecil karena kurva beton pre-code.
- Survei perilaku evakuasi tsunami di Indonesia selain Palu tidak dicari; Harnantyari dkk. hanya abstrak.
- Waktu tiba model belum diuji terhadap waktu tiba tercatat (Palu 2018, Pangandaran 2006, Flores 2026).
- Faktor evakuasi Jepang belum punya padanan Indonesia; dipakai hanya sebagai Asumsi kebijakan.

---

## Bahan subbab 6.6: kesenjangan spesifik dan implikasi

Ringkasan untuk penulis; tiap butir sudah bersumber di P1–P4. Implikasi ditulis sebagai kebutuhan data, bukan strategi.

| No | Kesenjangan | Bukti (butir) | Implikasi data | Pemegang data |
| --- | --- | --- | --- | --- |
| K1 | Tidak ada skenario korban resmi pusat; renkon megathrust nasional tidak ditemukan; renkon Jawa Timur 2021 hanya terbaca sebagai contoh di Perban 2/2023 | P2 butir 4 | dokumen renkon megathrust provinsi dihimpun | BPBD provinsi; Direktorat Kesiapsiagaan |
| K2 | Paparan tsunami per kab resmi tidak ada di paket; `Inun_*` belum dipakai; proksi luput di 20 kab pada Mw 9,1 (Malang, Tulungagung, Tasikmalaya, Garut, Cianjur, Blitar, Sukabumi, Lebak, dan lain-lain; Banyuwangi tidak luput pada Mw 9,1, luput hanya pada M8,5) | P1 Celah; P2 butir 9 | tabel penduduk dalam genangan per skenario | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
| K3 | IRBI 2025 tsunami tidak menaruh kab Jawa di kelas teratas; daftar perhatian tsunami tanpa pantai selatan Jawa kecuali Pandeglang | P1 butir 4, 7 | catatan metode IRBI 2025 (KD-4); aturan 3.8 ditulis dengan keterbatasan | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
| K4 | Mmaks dan periode ulang resmi ada (Mentawai–Enggano 330 tahun), tetapi Sumba "No Data", geometri segmen belum dipakai, sesar busur belakang Flores belum dibaca | P2 butir 1–2; P3 butir 11 | periode ulang Sumba; pembacaan Tabel 6.9 lengkap; geometri segmen | PuSGeN, Kementerian PU |
| K5 | PDNA atau R3P final Merapi, Sulteng, Lombok tidak ditemukan | P3 Celah | seri kerusakan dan kerugian R3P | Deputi Bidang Rehabilitasi dan Rekonstruksi |
| K6 | Mesin korban gempa meleset 10,4 kali pada Yogyakarta 2006; GMPE belum diuji | P2 butir 7 | arsip intensitas dirasakan untuk uji | BMKG |
| K7 | Data bangunan, sekolah, dan faskes per kab di zona skenario tidak ada | P1 butir 3; P2 Celah | data bangunan dan aset per kab | Kementerian PU; Pusdatinkom |
| K8 | Tidak ada evaluasi dampak program geologi di Indonesia | P4 butir 9 | evaluasi dampak berpembanding | pemimpin program per Renas |

---

## Catatan untuk pemilik paket `skenario-geologi`

Berkas ini tidak menyunting paket; koreksi berikut dibawa ke pemiliknya (agent `model-sebaran` atau pemilik `bangun/`):

1. Mmaks Jawa 9,1 dan Mentawai–Enggano 8,9 kini Resmi (PuSGeN 2024 Tabel 6.2); label `Mmaks (sekunder)` di
   `ringkasan.csv`, `gempa_kab.csv`, `pembanding_resmi.csv`, `skenario.json` perlu diganti. Sumba punya Mmaks 8,5; skenario
   8,3 "di bawah Mmaks", bukan "tanpa sumber".
2. Faktor evakuasi ×0,662 tidak ada di dokumen primer; ganti ×0,600 (survei 2023) atau hapus baris 50%; sumber Nankai
   diganti dokumen Cabinet Office (`asumsi.nankai.sumber` di `skenario.json` masih JST sekunder).
3. `pembanding_pdna.csv`: Cianjur Rp4 T (Bupati, sekunder) diganti R3P Rp4,55 T; baris Sulteng dapat diberi sumber arsip
   Wayback halaman BNPB.
4. `skenario.json` `skenario[id=sesar-darat].alasan` usang: Mmaks resmi kini ada (Lembang 6,6; Cimandiri 6,3–6,8; Opak
   6,9) dan berbeda dari nilai `sim.js`.
5. Lantai: batas bawah korban Mentawai (567 dan 901) di bawah Padang 2009 (1.195); batas bawah Merapi 347 di bawah DIBI 386.
6. Geometri Jawa Mw 9,1 702 km lawan segmen PuSGeN 1.120 km.
7. Analog Sulteng 4.141 di paket lawan 4.140 di `dibi/kejadian_besar.csv` (beda jendela).
8. `pembanding_pdna.csv` kolom `pengungsi_dibi` Sulteng 221.450 lawan DIBI 212.719 di `dibi/kejadian_besar.csv` (jumlah
   empat baris kab 82.891 + 52.415 + 578 + 76.835); selisih aturan (RB + RS) × 3,9 menjadi 16%, bukan 11%.
9. Label pengungsi skenario di `ringkasan.csv` (asumsi-kebijakan, tanpa pita) menyembunyikan pita rumah rusak; pita
   turunan Jawa Mw 9,1 1.418.106–62.668.967 dan Mentawai Mw 8,9 131.368–5.736.600 perlu dicatat di baris itu.
10. `ringkasan.csv` baris tinggi tsunami dan `pembanding_resmi.csv`: Widiyantoro 20 m terletak di pulau kecil selatan
    Banten (sekitar 105,5° BT), bukan pantai selatan Provinsi Jawa Barat; Supendi 34 m bukan pembanding segmen Mentawai.

---

## Komponen

| Kode | Isi | Sumber data | Kode grafik | Catatan |
| --- | --- | --- | --- | --- |
| Gambar 6.1 | Peta jiwa kecamatan pesisir rendah dengan tiba ≤ 30 menit dan panjang pantai tiba < 30 menit, skenario Jawa Mw 9,1 dan Mentawai Mw 8,9; daftar 20 kab lubang proksi Mw 9,1 (P2 butir 9, dari `tsunami_kab.csv`) di samping peta; tiba tercepat Banyuwangi 4,0 menit, kab lubang tercepat Malang 5,2 menit; skenario Jawa termasuk Bali dan NTB | `skenario-geologi/tsunami_kab.csv`, `jejak.geojson`, `skenario.json` `lubang_proksi_tsunami` | G20 | berlabel "paparan, bukan genangan"; pil Estimasi model dan pernyataan produsen; tinggi indikatif tidak ditampilkan |
| Gambar 6.2 | Peta kab menurut jiwa MMI ≥ VII, Jawa Mw 9,1 (PuSGeN 2024, geometri platform) | `skenario-geologi/gempa_kab.csv` kolom `jiwa_mmi7plus_tengah` | G19 | judul memakai Mmaks resmi; catatan geometri 702 km lawan 1.120 km |
| Tabel 6.0 (usulan baru) | Status resmi per bahaya geologi: Mmaks dan periode ulang, paparan KRB, aset di kelas bahaya, kab bernilai IRBI 2025 dan kelas teratas, KRB PVMBG 30 gunung | Renas korpus hlm. 22–25; `riset/mentah/ks_*.json`; `irbi/irbi_kab_2025.csv`; PuSGeN 2024; `ringkasan.csv` | B5.7 | memenuhi "status resmi lembaga dan indeks" di tiap subbab tanpa mengulang Bab 5 |
| Kartu 6.1 | Megathrust selatan Jawa Mw 9,1: karakteristik ancaman (Mmaks, periode ulang, peluang 0,83%), skenario (jiwa MMI ≥ VII, luas, tinggi tsunami literatur: hingga sekitar 20 m di pulau kecil selatan Banten, 12 m Jawa Timur, rerata 4,5 m; hingga 34 m dekat Ujung Kulon pada skenario dengan backthrust; pantai tiba < 30 menit), asumsi dampak lima aspek dengan aturan pengungsi (RB + RS) × 3,9 tanpa angka skenario, kebutuhan respons; korban: lantai Yogyakarta 2006 (guncangan) dan Pangandaran 2006 (tsunami) | `ringkasan.csv`, `kepekaan.csv`, PuSGeN 2024, Widiyantoro dkk., Supendi dkk. | B5.11 | pita korban 12,7 kali dan pengungsi skenario 1,42–62,7 juta hanya di Lampiran C |
| Kartu 6.2 | Megathrust Mentawai–Enggano Mw 8,9; periode ulang 330 tahun, kemungkinan 1,50% dalam lima tahun per segmen (turunan Poisson, pita 3); korban: lantai tercatat Padang 2009 (1.195 meninggal) dan Mentawai 2010 (447 meninggal, 56 hilang) | `ringkasan.csv`, `kepekaan.csv`, PuSGeN 2024 Tabel 6.2 | B5.11 | hanya lantai tercatat di kartu; pita 901–11.435 utuh di lampiran (tidak dipotong); pengungsi skenario 0,13–5,74 juta hanya di lampiran; tanpa angka tinggi tsunami literatur (Supendi bukan segmen ini) |
| Kartu 6.3 | Sesar darat dekat permukiman (analog Yogyakarta 2006 dan Cianjur 2022) dengan Mmaks resmi Lembang, Cimandiri, Opak | `dibi/kejadian_besar.csv`; Bappenas 2006; R3P Cianjur; PuSGeN Tabel 6.9 | B5.11 varian analog | analog ditulis sebagai lantai, bukan skenario terburuk |
| Kartu 6.4 | Erupsi gunung api (analog Merapi 2010; paparan KRB III 30 gunung, Merapi dan Agung) | `kejadian_besar.csv`; `merapi2010_kab.csv`; `gunungapi_krb_kab.csv`; Surono dkk. | B5.11 varian analog | korban 386 (bukan 347–386); model sapuan berdampingan berlabel |
| Kartu 6.5 | Gempa, tsunami, dan likuefaksi majemuk (analog Sulteng 2018; KRB likuefaksi) | `kejadian_besar.csv`; BNPB 22 Okt 2018; Widiyanto dkk. | B5.11 varian analog | kerugian sementara resmi; korban likuefaksi tidak terpisah |
| Kartu 6.6 (usulan, perlu keputusan orkestrator) | Gempa dan tsunami busur belakang Flores (analog Agustus 2026 dan 1992) | USGS us6000tkt2; DIBI 2026 sementara | B5.11 varian analog | di luar periode acuan 1996–2025; tanpa Mmaks |
| Gambar 6.3 | Tuas evakuasi atas kematian tsunami (×1 / ×0,600 / ×0,437) dan tuas kepatuhan bangunan atas korban guncangan (dasar, naik, penuh) | `kepekaan.csv` (faktor bangunan); Cabinet Office 2025 (faktor evakuasi) | G14 | ×0,662 diganti ×0,600; faktor evakuasi berpil Asumsi kebijakan (rasio dari estimasi-model Cabinet Office), faktor bangunan berpil Estimasi model; diterapkan pada paparan, bukan korban tsunami |
| Tabel 6.1 | Rasio analog guncangan (6 gempa) dan tsunami (Mentawai dipakai, Pangandaran tidak) | `analog.csv` | B5.7 | kolom porsi korban di kab berpaparan |
| Tabel 6.2 | Pembanding kerugian kejadian lawan stimulan rumah | `pembanding_pdna.csv`; R3P Cianjur; BNPB 22 Okt 2018; Kemenko PMK; Bappenas 2006 | B5.7 | baris sekunder (Lombok Rp12,1 T) ditandai atau dikeluarkan |

Halaman: 14 (KERANGKA). Bila Tabel 6.0 dan Kartu 6.6 ditambah, Tabel 6.1 dipindah ke Lampiran F supaya halaman tetap.

---

## Angka untuk registri

Semua kunci di bawah ditulis di `naskah/mitigasi/bukti/bab-06.angka.json` (97 kunci; `data/angka.json` utama
tidak disunting). Kunci yang sudah ada di registri utama atau di `bab-01` sampai `bab-05` dan `bab-07` tidak diulang dan
dirujuk di butir sumber di atas. Bentuk A (berkas + jalur) diperiksa dengan salinan fungsi `ikuti()` dari
`bangun/kontrak/naskah.py`: tiap jalur menunjuk tepat satu baris. Bentuk B (nilai + pustaka) diperiksa pustakanya ada di
`bab-06.pustaka.json`.

| Kunci | Nilai | Berkas + jalur, atau pustaka | Label | Sumber |
| --- | --- | --- | --- | --- |
| dibi.cianjur2022.mengungsi | 115.382 jiwa | `dibi/kejadian_besar.csv` `[kode=cianjur2022,metrik=mengungsi,versi=DIBI].nilai` | resmi | DIBI BNPB, gempa Cianjur 2022 |
| dibi.cianjur2022.hilang | 8 jiwa | `dibi/kejadian_besar.csv` `[kode=cianjur2022,metrik=hilang,versi=DIBI].nilai` | resmi | DIBI BNPB, gempa Cianjur 2022 |
| dibi.sulteng2018.mengungsi | 212.719 jiwa | `dibi/kejadian_besar.csv` `[kode=sulteng2018,metrik=mengungsi,versi=DIBI].nilai` | resmi | DIBI BNPB, Sulawesi Tengah 2018 |
| dibi.sulteng2018.rumah_rusak | 110.214 unit | `dibi/kejadian_besar.csv` `[kode=sulteng2018,metrik=rumah_rusak,versi=DIBI].nilai` | resmi | DIBI BNPB, Sulawesi Tengah 2018 |
| dibi.lombok2018.mengungsi | 406.202 jiwa | `dibi/kejadian_besar.csv` `[kode=lombok2018,metrik=mengungsi,versi=DIBI].nilai` | resmi | DIBI BNPB, rangkaian gempa Lombok 2018 |
| dibi.lombok2018.rumah_rusak | 217.855 unit | `dibi/kejadian_besar.csv` `[kode=lombok2018,metrik=rumah_rusak,versi=DIBI].nilai` | resmi | DIBI BNPB, rangkaian gempa Lombok 2018 |
| dibi.merapi2010.rumah_rusak | 2.919 unit | `dibi/kejadian_besar.csv` `[kode=merapi2010,metrik=rumah_rusak,versi=DIBI].nilai` | resmi | DIBI BNPB, erupsi Merapi 2010 |
| dibi.mentawai2010.mengungsi | 15.353 jiwa | `dibi/kejadian_besar.csv` `[kode=mentawai2010,metrik=mengungsi,versi=DIBI].nilai` | resmi | DIBI BNPB, tsunami Mentawai 2010 |
| dibi.cianjur2022.mengungsi_kab_cianjur | 114.683 jiwa | `skenario-geologi/pembanding_pdna.csv` `[kejadian=Gempa Cianjur 21 Nov 2022 (Kab. Cianjur saja)].pengungsi_dibi` | resmi | DIBI BNPB, gempa Cianjur 2022, Kab. Cianjur |
| geologi.jawa_mmaks.jiwa_mmi7 | 30.227.545–110.448.354 (tengah 69.038.814) jiwa | `skenario-geologi/ringkasan.csv` `[skenario=jawa-mmaks,butir=jiwa terpapar MMI >= VII].tengah`; rendah `[skenario=jawa-mmaks,butir=jiwa terpapar MMI >= VII].rendah`, tinggi `[skenario=jawa-mmaks,butir=jiwa terpapar MMI >= VII].tinggi` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.mentawai_mmaks.jiwa_mmi7 | 2.184.065–9.697.878 (tengah 5.803.334) jiwa | `skenario-geologi/ringkasan.csv` `[skenario=mentawai-mmaks,butir=jiwa terpapar MMI >= VII].tengah`; rendah `[skenario=mentawai-mmaks,butir=jiwa terpapar MMI >= VII].rendah`, tinggi `[skenario=mentawai-mmaks,butir=jiwa terpapar MMI >= VII].tinggi` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa.jiwa_mmi7 | 0–5.545.446 (tengah 0) jiwa | `skenario-geologi/ringkasan.csv` `[skenario=jawa,butir=jiwa terpapar MMI >= VII].tengah`; rendah `[skenario=jawa,butir=jiwa terpapar MMI >= VII].rendah`, tinggi `[skenario=jawa,butir=jiwa terpapar MMI >= VII].tinggi` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa_mmaks.jiwa_mmi6 | 129.704.396 jiwa | `skenario-geologi/ringkasan.csv` `[skenario=jawa-mmaks,butir=jiwa terpapar MMI >= VI].tengah` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa_mmaks.luas_mmi6 | 120.796 km2 | `skenario-geologi/ringkasan.csv` `[skenario=jawa-mmaks,butir=luas MMI >= VI].tengah` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa_mmaks.pengungsi | 9.735.362 jiwa (lampiran saja; pita 1.418.106–62.668.967) | `skenario-geologi/ringkasan.csv` `[skenario=jawa-mmaks,butir=pengungsi (penghuni RB + RS)].tengah` | estimasi-model; turunan; lampiran saja | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.mentawai_mmaks.pengungsi | 891.831 jiwa (lampiran saja; pita 131.368–5.736.600) | `skenario-geologi/ringkasan.csv` `[skenario=mentawai-mmaks,butir=pengungsi (penghuni RB + RS)].tengah` | estimasi-model; turunan; lampiran saja | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.merapi2010.pengungsi_radius20 | 1.552.098 jiwa | `skenario-geologi/ringkasan.csv` `[skenario=merapi2010,butir=pengungsi (radius 20 km seperti 2010)].tengah` | estimasi-model | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa_mmaks.panjang_bidang | 702,3 km | `skenario-geologi/skenario.json` `skenario[id=jawa-mmaks].panjang_km` | estimasi-model | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.analog_guncangan.rasio | 0,0155–0,197 (tengah 0,0469) % | `skenario-geologi/skenario.json` `rasio_analog.guncangan.median`; rendah `rasio_analog.guncangan.min`, tinggi `rasio_analog.guncangan.maks`; kali 100 | estimasi-model; rasio dari data resmi dan terverifikasi | Pengolahan Pantau Bencana dari DIBI BNPB dan USGS (6 gempa kerak dan slab) |
| geologi.mentawai2010.rasio_tsunami | 4,0577 % | `skenario-geologi/analog.csv` `[id=mentawai-2010].rasio_meninggal_per_terpapar`; kali 100 | estimasi-model; orde besaran, belum layak dikutip | Pengolahan Pantau Bencana dari DIBI BNPB (447 meninggal Kep. Mentawai 2010) |
| usgs.pangandaran2006.meninggal | 665 jiwa | `skenario-geologi/analog.csv` `[id=pangandaran-2006].meninggal` | terverifikasi | USGS, event usp000ensm (rincian korban per kabupaten) |
| geologi.pangandaran2006.porsi_korban_berpaparan | 25,6 % | `skenario-geologi/analog.csv` `[id=pangandaran-2006].porsi_korban_di_kab_berpaparan`; kali 100 | estimasi-model | Pengolahan Pantau Bencana dari USGS event usp000ensm |
| geologi.kepekaan.bangunan_naik.jawa_mmaks | 0,6762 | `skenario-geologi/kepekaan.csv` `[skenario=jawa-mmaks,nilai_tuas=kepatuhan naik (20/50/30)].faktor_terhadap_dasar` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.kepekaan.bangunan_penuh.jawa_mmaks | 0,3524 | `skenario-geologi/kepekaan.csv` `[skenario=jawa-mmaks,nilai_tuas=kepatuhan penuh (0/70/30)].faktor_terhadap_dasar` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.kepekaan.bangunan_penuh.mentawai_mmaks | 0,3772 | `skenario-geologi/kepekaan.csv` `[skenario=mentawai-mmaks,nilai_tuas=kepatuhan penuh (0/70/30)].faktor_terhadap_dasar` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.kepekaan.malam | 1,1647 | `skenario-geologi/kepekaan.csv` `[skenario=jawa-mmaks,tuas=jam kejadian (okupansi rumah)].faktor_terhadap_dasar` | asumsi-kebijakan | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.pengungsi_rumah.cianjur | 115.799 jiwa | `skenario-geologi/pembanding_pdna.csv` `[kejadian=Gempa Cianjur 21 Nov 2022 (Kab. Cianjur saja)].pengungsi_dari_rumah_rb_rs_x3_9` | asumsi-kebijakan; turunan dari data resmi | Pengolahan Pantau Bencana dari DIBI BNPB |
| renas.krb.luas_tinggi_tsunami | 740.906 ha | nilai; pustaka `bnpb-2025-renas`, hlm. 22 | resmi | Renas PB 2025–2029, sumber Kajian Risiko Bencana 2022–2026 |
| renas.krb.tsunami.terpapar_umur_rentan | 543.028 jiwa | nilai; pustaka `bnpb-2025-renas`, hlm. 24 | resmi | Renas PB 2025–2029, sumber Kajian Risiko Bencana 2022–2026 |
| renas.krb.tsunami.terpapar_miskin | 610.525 jiwa | nilai; pustaka `bnpb-2025-renas`, hlm. 24 | resmi | Renas PB 2025–2029, sumber Kajian Risiko Bencana 2022–2026 |
| renas.krb.tsunami.terpapar_disabilitas | 27.354 jiwa | nilai; pustaka `bnpb-2025-renas`, hlm. 24 | resmi | Renas PB 2025–2029, sumber Kajian Risiko Bencana 2022–2026 |
| krb.tsunami.sekolah_kelas_tinggi | 59.839 unit | nilai; pustaka `bnpb-2026-krb-geologi` | resmi; arti field dari nama API | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| krb.tsunami.puskesmas_kelas_tinggi | 1.210 unit | nilai; pustaka `bnpb-2026-krb-geologi` | resmi; arti field dari nama API | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| krb.tsunami.rs_kelas_tinggi | 232 unit | nilai; pustaka `bnpb-2026-krb-geologi` | resmi; arti field dari nama API | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| krb.gempa.sekolah_kelas_tinggi | 198.052 unit | nilai; pustaka `bnpb-2026-krb-geologi` | resmi; arti field dari nama API | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| krb.gempa.puskesmas_kelas_tinggi | 3.351 unit | nilai; pustaka `bnpb-2026-krb-geologi` | resmi; arti field dari nama API | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| krb.gunungapi.sekolah_kelas_tinggi | 24.721 unit | nilai; pustaka `bnpb-2026-krb-geologi` | resmi; arti field dari nama API | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| krb.gunungapi.puskesmas_kelas_tinggi | 378 unit | nilai; pustaka `bnpb-2026-krb-geologi` | resmi; arti field dari nama API | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| krb.likuefaksi.sekolah_kelas_tinggi | 73.208 unit | nilai; pustaka `bnpb-2026-krb-geologi` | resmi; arti field dari nama API | InaRISK BNPB, Kajian Risiko Bencana 2022–2026 |
| irbi.gempa.kab_kelas_atas.2025 | 112 kab/kota | nilai; pustaka `bnpb-irbi` | asumsi-kebijakan; turunan dari data resmi | Pengolahan data Pantau Bencana dari IRBI BNPB 2025 |
| irbi.tsunami.kab_dinilai.2025 | 273 kab/kota | nilai; pustaka `bnpb-irbi` | resmi; dihitung dari jumlah sel bernilai | InaRISK BNPB, IRBI 2025 |
| irbi.tsunami.kab_kelas_atas.2025 | 56 kab/kota | nilai; pustaka `bnpb-irbi` | asumsi-kebijakan; turunan dari data resmi | Pengolahan data Pantau Bencana dari IRBI BNPB 2025 |
| irbi.tsunami.kab_kelas_atas_jawa.2025 | 0 kab/kota | nilai; pustaka `bnpb-irbi` | asumsi-kebijakan; turunan dari data resmi | Pengolahan data Pantau Bencana dari IRBI BNPB 2025 |
| irbi.gunungapi.kab_dinilai.2025 | 132 kab/kota | nilai; pustaka `bnpb-irbi` | resmi; dihitung dari jumlah sel bernilai | InaRISK BNPB, IRBI 2025 |
| irbi.gunungapi.kab_kelas_atas.2025 | 31 kab/kota | nilai; pustaka `bnpb-irbi` | asumsi-kebijakan; turunan dari data resmi | Pengolahan data Pantau Bencana dari IRBI BNPB 2025 |
| pusgen.mentawai.mmaks | 8,9 Mw | nilai; pustaka `pusgen-2024-peta-gempa`, Tabel 6.2 hlm. 342–343 | resmi | PuSGeN (2024), Peta Sumber dan Bahaya Gempa Indonesia Tahun 2024 |
| pusgen.mentawai.periode_ulang | 330 tahun | nilai; pustaka `pusgen-2024-peta-gempa`, Tabel 6.2 hlm. 342 | resmi | PuSGeN (2024), Peta Sumber dan Bahaya Gempa Indonesia Tahun 2024 |
| geologi.mentawai_segmen.peluang_5th | 1,50 % | nilai; pustaka `pusgen-2024-peta-gempa`, Tabel 6.2 hlm. 342 | asumsi-kebijakan; turunan Poisson dari periode ulang resmi | Pengolahan Pantau Bencana dari PuSGeN (2024) |
| pusgen.jawa.panjang | 1.120 km | nilai; pustaka `pusgen-2024-peta-gempa`, Tabel 6.2 hlm. 342–343 | resmi | PuSGeN (2024), Peta Sumber dan Bahaya Gempa Indonesia Tahun 2024 |
| pusgen.lembang.mmaks | 6,6 Mw | nilai; pustaka `pusgen-2024-peta-gempa`, Tabel 6.9 hlm. 368–371 | resmi | PuSGeN (2024), Peta Sumber dan Bahaya Gempa Indonesia Tahun 2024 |
| pusgen.opak.mmaks | 6,9 Mw | nilai; pustaka `pusgen-2024-peta-gempa`, Tabel 6.9 hlm. 368–371 | resmi | PuSGeN (2024), Peta Sumber dan Bahaya Gempa Indonesia Tahun 2024 |
| pusgen.cimandiri.mmaks | 6,3–6,8 Mw | nilai; pustaka `pusgen-2024-peta-gempa`, Tabel 6.9 hlm. 368–371 | resmi | PuSGeN (2024), Peta Sumber dan Bahaya Gempa Indonesia Tahun 2024 |
| pusgen.cianjur.mmaks | 5,6 Mw | nilai; pustaka `pusgen-2024-peta-gempa`, Tabel 6.9 hlm. 368–371 | resmi | PuSGeN (2024), Peta Sumber dan Bahaya Gempa Indonesia Tahun 2024 |
| widiyantoro.jawa_barat.tinggi_tsunami | 20 m | nilai; pustaka `widiyantoro-2020-tsunami` | terverifikasi | Widiyantoro dkk. (2020), Scientific Reports 10:15274 |
| widiyantoro.jawa_timur.tinggi_tsunami | 12 m | nilai; pustaka `widiyantoro-2020-tsunami` | terverifikasi | Widiyantoro dkk. (2020), Scientific Reports 10:15274 |
| widiyantoro.jawa.tinggi_rerata_maks | 4,5 m | nilai; pustaka `widiyantoro-2020-tsunami` | terverifikasi | Widiyantoro dkk. (2020), Scientific Reports 10:15274 |
| supendi.ujung_kulon.tinggi_tsunami | 34 m | nilai; pustaka `supendi-2022-megathrust` | terverifikasi (keluaran model terbitan bertinjauan) | Supendi dkk. (2022), Natural Hazards 116: 1315–1328 |
| nankai.faktor_rentang_kasus | 0,077–0,437 | nilai; pustaka `cao-japan-2025-nankai`, lampiran metode hlm. 25; saidai_01 hlm. 18–19 | asumsi-kebijakan; rasio dari estimasi-model Cabinet Office Jepang 2025 | Cabinet Office Jepang (2025), perkiraan kerusakan gempa Palung Nankai kelas maksimum |
| renkon.jatim2021.rasio_meninggal | 1 % | nilai; pustaka `bnpb-2023-renkon`, Lampiran hlm. 17 | resmi; contoh di lampiran peraturan | Perban BNPB 2/2023, Lampiran Contoh 1 (Renkon Tsunami Megathrust Jawa Timur 2021) |
| renkon.jatim2021.banyuwangi_terpapar | 165.202 jiwa | nilai; pustaka `bnpb-2023-renkon`, Lampiran hlm. 17 | resmi; contoh di lampiran peraturan | Perban BNPB 2/2023, Lampiran Contoh 1 (Renkon Tsunami Megathrust Jawa Timur 2021) |
| renkon.jatim2021.jember_terpapar | 139.835 jiwa | nilai; pustaka `bnpb-2023-renkon`, Lampiran hlm. 17 | resmi; contoh di lampiran peraturan | Perban BNPB 2/2023, Lampiran Contoh 1 (Renkon Tsunami Megathrust Jawa Timur 2021) |
| renas.diseminasi_gempa_tsunami.unit_2024 | 480 unit | nilai; pustaka `bnpb-2025-renas`, hlm. 52 | resmi | Renas PB 2025–2029, matriks kegiatan |
| renas.diseminasi_gempa_tsunami.unit_2029 | 530 unit | nilai; pustaka `bnpb-2025-renas`, hlm. 52 | resmi | Renas PB 2025–2029, matriks kegiatan |
| renas.pasut.unit_2024 | 171 unit | nilai; pustaka `bnpb-2025-renas`, hlm. 52 | resmi | Renas PB 2025–2029, matriks kegiatan |
| renas.pasut.unit_2029 | 200 unit | nilai; pustaka `bnpb-2025-renas`, hlm. 52 | resmi | Renas PB 2025–2029, matriks kegiatan |
| renas.pengamatan_gunungapi.unit_2024 | 219 unit | nilai; pustaka `bnpb-2025-renas`, hlm. 52–53 | resmi | Renas PB 2025–2029, matriks kegiatan |
| renas.pengamatan_gunungapi.unit_2029 | 1.200 unit | nilai; pustaka `bnpb-2025-renas`, hlm. 52–53 | resmi | Renas PB 2025–2029, matriks kegiatan |
| r3p.cianjur2022.kerusakan_kerugian | 4.550.000.000.000 Rp | nilai; pustaka `cianjur-2022-r3p`, hlm. PDF 51 | resmi; dokumen berstatus contoh tanpa nomor penetapan | R3P Gempa Bumi Kabupaten Cianjur 2022 |
| r3p.cianjur2022.perumahan | 3.210.000.000.000 Rp | nilai; pustaka `cianjur-2022-r3p`, hlm. PDF 51 | resmi; dokumen berstatus contoh tanpa nomor penetapan | R3P Gempa Bumi Kabupaten Cianjur 2022 |
| r3p.cianjur2022.desa_dikosongkan | 9 desa | nilai; pustaka `cianjur-2022-r3p` | resmi; dokumen berstatus contoh tanpa nomor penetapan | R3P Gempa Bumi Kabupaten Cianjur 2022 |
| r3p.cianjur2022.rasio_perumahan_stimulan | 1,06 | nilai; pustaka `cianjur-2022-r3p` | asumsi-kebijakan; turunan dari data resmi | Pengolahan Pantau Bencana dari R3P Cianjur 2022 |
| kemenkopmk.lombok2018.kebutuhan_r3p | 11.440.594.509.577 Rp | nilai; pustaka `kemenkopmk-2024-rehabrekon-lombok` | resmi | Kemenko PMK, 20 Mei 2024 |
| bnpb.sulteng2018.kerusakan_kerugian | 13.820.000.000.000 Rp | nilai; pustaka `bnpb-2018-kerugian-sulteng` | resmi; angka sementara | BNPB, 22 Okt 2018 (data 20 Okt 2018) |
| bnpb.sulteng2018.perumahan | 7.950.000.000.000 Rp | nilai; pustaka `bnpb-2018-kerugian-sulteng` | resmi; angka sementara | BNPB, 22 Okt 2018 (data 20 Okt 2018) |
| bappenas.yogya2006.kerusakan_kerugian | 29.100.000.000.000 Rp | nilai; pustaka `bappenas-2006-dala-yogya`, Section II hlm. 12 | resmi; penilaian awal | Bappenas dan pemda DIY dan Jawa Tengah (2006), penilaian awal kerusakan dan kerugian |
| bappenas.yogya2006.meninggal | 5.716 jiwa | nilai; pustaka `bappenas-2006-dala-yogya`, Tabel 1 | resmi; penilaian awal | Bappenas dan pemda DIY dan Jawa Tengah (2006) |
| bappenas.yogya2006.rumah_hancur | 154.000–157.000 unit | nilai; pustaka `bappenas-2006-dala-yogya`, hlm. 15 | resmi; penilaian awal | Bappenas dan pemda DIY dan Jawa Tengah (2006) |
| usgs.flores2026.meninggal | 136 jiwa | nilai; pustaka `usgs-us6000tkt2` | terverifikasi | USGS, event us6000tkt2 |
| usgs.flores2026.rumah_hancur | 27.414 unit | nilai; pustaka `usgs-us6000tkt2` | terverifikasi | USGS, event us6000tkt2 |
| usgs.flores2026.tsunami_maks | 169 cm | nilai; pustaka `usgs-us6000tkt2` | terverifikasi | USGS, event us6000tkt2 |
| usgs.flores2026.terpapar_mmi6_8 | 1.700.000 jiwa | nilai; pustaka `usgs-us6000tkt2` | estimasi-model; PAGER USGS | USGS, event us6000tkt2 |
| geologi.merapi2010.jiwa_sapuan | 89.707 jiwa | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model; regresi, bukan validasi | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.krb30.jiwa_krb3 | 86.615 jiwa | nilai; pustaka `pantaubencana-2026-skenario-geologi` | resmi (zona KRB PVMBG 2018) × terverifikasi (WorldPop 2026) | Pengolahan Pantau Bencana dari KRB PVMBG 2018 dan WorldPop 2026 |
| geologi.krb30.jiwa_krb2 | 297.012 jiwa | nilai; pustaka `pantaubencana-2026-skenario-geologi` | resmi (zona KRB PVMBG 2018) × terverifikasi (WorldPop 2026) | Pengolahan Pantau Bencana dari KRB PVMBG 2018 dan WorldPop 2026 |
| geologi.krb30.jiwa_krb1 | 482.762 jiwa | nilai; pustaka `pantaubencana-2026-skenario-geologi` | resmi (zona KRB PVMBG 2018) × terverifikasi (WorldPop 2026) | Pengolahan Pantau Bencana dari KRB PVMBG 2018 dan WorldPop 2026 |
| geologi.krb30.porsi_merapi_agung_krb3 | 75 % | nilai; pustaka `pantaubencana-2026-skenario-geologi` | asumsi-kebijakan; turunan | Pengolahan Pantau Bencana dari KRB PVMBG 2018 dan WorldPop 2026 |
| geologi.jawa.jiwa_pesisir_30mnt | 2.862.544 jiwa | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model; proksi, bukan genangan | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa_mmaks.jiwa_pesisir_30mnt | 3.442.456 jiwa | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model; proksi, bukan genangan | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.mentawai.jiwa_pesisir_30mnt | 930.750 jiwa | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model; proksi, bukan genangan | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa.porsi_cilacap_pesisir | 35,9 % | nilai; pustaka `pantaubencana-2026-skenario-geologi` | asumsi-kebijakan; turunan dari estimasi-model | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa.jiwa_pesisir_30mnt_pulau_jawa | 2.396.295 jiwa | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model; proksi, bukan genangan | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa_mmaks.jiwa_pesisir_30mnt_pulau_jawa | 2.550.410 jiwa | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model; proksi, bukan genangan | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa_mmaks.lubang_proksi_kab | 20 kab/kota | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa.lubang_proksi_kab | 18 kab/kota | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.jawa_mmaks.kab_mmi7 | 77 kab/kota | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model; belum diuji balik | Simulasi skenario Pantau Bencana, belum divalidasi |
| geologi.mesin.yogya2006_model | 555 jiwa | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model; meleset dari data tercatat | Mesin kerusakan Pantau Bencana (kalibrasi 20 Okt 2026) |
| geologi.mesin.faktor_loo | 5,341 | nilai; pustaka `pantaubencana-2026-skenario-geologi` | estimasi-model | Mesin kerusakan Pantau Bencana (kalibrasi 20 Okt 2026) |

---

## Pustaka

Entri CSL-JSON di `naskah/mitigasi/bukti/bab-06.pustaka.json` (24 entri; yang dipakai ulang disalin persis dari
`pustaka.json`, `riset/E-pustaka.json`, dan berkas pustaka bab lain).

- `bnpb-2025-renas`: BNPB (2025). Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2025 tentang Rencana Nasional Penanggulangan Bencana Tahun 2025–2029. https://jdih.bnpb.go.id/storage/file/2025pbbnpb001.pdf.
- `bnpb-irbi`: BNPB (t.t.). Indeks Risiko Bencana Indonesia (IRBI) kabupaten/kota 2015–2025. https://inarisk.bnpb.go.id/apiv4/data-irbi-full; diakses 23-10-2026.
- `bnpb-2026-dibi`: BNPB (2026). Data Informasi Bencana Indonesia (DIBI), dasbor publik 1 (pdsi_staging.mv_dibi_dampak_by_kejadian). https://dibi.bnpb.go.id; diakses 23-10-2026.
- `bnpb-2023-renkon`: BNPB (2023). Peraturan Badan Nasional Penanggulangan Bencana Nomor 2 Tahun 2023 tentang Penyusunan Rencana Kontingensi Bencana. https://jdih.bnpb.go.id/storage/file/2023pbbnpb002.pdf.
- `pusgen-2024-peta-gempa`: PuSGeN (2024). Peta Sumber dan Bahaya Gempa Indonesia Tahun 2024. https://ciptakarya.pu.go.id/admin/assets/upload/galeri/gempa/2026/02/10/887359_0.%20Final_BUKU_PETA_SUMBER_DAN_BAHAYA_GEMPA_2024_Publish.pdf; diakses 23-10-2026.
- `widiyantoro-2020-tsunami`: Widiyantoro dkk. (2020). Implications for megathrust earthquakes and tsunamis from seismic gaps south of Java Indonesia. DOI 10.1038/s41598-020-72142-z; diakses 23-10-2026.
- `cao-japan-2025-nankai`: 中央防災会議 防災対策実行会議 南海トラフ巨大地震対策検討ワーキンググループ (Central Disaster Management Council, Japan) (2025). Perkiraan kerusakan gempa Palung Nankai kelas maksimum (besaran kuantitatif). https://www.bousai.go.jp/jishin/nankai/taisaku_wg_02/pdf/saidai_01.pdf; diakses 23-10-2026.
- `surono-2012-merapi`: Surono dkk. (2012). The 2010 explosive eruption of Java's Merapi volcano: a '100-year' event. DOI 10.1016/j.jvolgeores.2012.06.018; diakses 23-10-2026.
- `cianjur-2022-r3p`: Pemerintah Kabupaten Cianjur dkk. (2022). Rencana Rehabilitasi dan Rekonstruksi Pascabencana Gempa Bumi Kabupaten Cianjur Tahun 2022. https://eproposalrr.bnpb.go.id/manual/panduan_contoh-dokumen-r3p-bencana-masif_1739152465.pdf; diakses 23-10-2026.
- `kemenkopmk-2024-rehabrekon-lombok`: Kemenko PMK (2024). Komitmen Bersama dalam Penuntasan Rehab Rekon Pascabencana Gempa Bumi Pulau Lombok dan Sekitarnya. https://kemenkopmk.go.id/node/4970; diakses 23-10-2026.
- `widiyanto-2019-palu`: Widiyanto dkk. (2019). Post-event field survey of 28 September 2018 Sulawesi earthquake and tsunami. DOI 10.5194/nhess-19-2781-2019; diakses 24-10-2026.
- `harnantyari-2020-palu`: Harnantyari dkk. (2020). Tsunami awareness and evacuation behaviour during the 2018 Sulawesi Earthquake tsunami. DOI 10.1016/j.ijdrr.2019.101389; diakses 24-10-2026.
- `usgs-usp000ej1c`: USGS (2006). M 6.3 - Java, Indonesia (event usp000ej1c). https://earthquake.usgs.gov/earthquakes/eventpage/usp000ej1c; diakses 19-10-2026.
- `usgs-usp000h237`: USGS (2009). M 7.6 - Southern Sumatra, Indonesia (event usp000h237). https://earthquake.usgs.gov/earthquakes/eventpage/usp000h237; diakses 19-10-2026.
- `usgs-us1000h3p4`: USGS (2018). M 7.5 - 72 km N of Palu, Indonesia (event us1000h3p4). https://earthquake.usgs.gov/earthquakes/eventpage/us1000h3p4; diakses 23-10-2026.
- `pantaubencana-2026-program-terbukti`: Pantau Bencana (2026). Paket data program-terbukti: kompendium program, bukti dampak, organisasi BNPB, Renstra, Renas, RIPB. data/kajian-bnpb/data/program-terbukti/.
- `ri-2025-perpres12-rpjmn`: Republik Indonesia (2025). Peraturan Presiden Nomor 12 Tahun 2025 tentang Rencana Pembangunan Jangka Menengah Nasional Tahun 2025–2029. https://peraturan.bpk.go.id/Details/314638/perpres-no-12-tahun-2025; diakses 23-10-2026.
- `bappenas-2006-dala-yogya`: Bappenas dkk. (2006). Preliminary Damage and Loss Assessment: Yogyakarta and Central Java Natural Disaster. http://documents.worldbank.org/curated/en/581581468041086975/pdf/407120ENGLISH01507190Yogya01PUBLIC1.pdf; diakses 24-10-2026.
- `supendi-2022-megathrust`: Supendi dkk. (2022). On the potential for megathrust earthquakes and tsunamis off the southern coast of West Java and southeast Sumatra, Indonesia. DOI 10.1007/s11069-022-05696-y; diakses 24-10-2026.
- `usgs-us6000tkt2`: USGS (2026). M 7.8 - 66 km NNW of Ende, Indonesia (event us6000tkt2). https://earthquake.usgs.gov/earthquakes/eventpage/us6000tkt2; diakses 24-10-2026.
- `usgs-usp000ensm`: USGS (2006). M 7.7 - 226 km SSW of Singaparna, Indonesia (event usp000ensm). https://earthquake.usgs.gov/earthquakes/eventpage/usp000ensm; diakses 23-10-2026.
- `pantaubencana-2026-skenario-geologi`: Pantau Bencana (2026). Paket data skenario-geologi: skenario ilustratif dan kepekaan Mmaks gempa, tsunami, dan gunung api per kab/kota. data/kajian-bnpb/data/skenario-geologi/ (ringkasan.csv, gempa_kab.csv, tsunami_kab.csv, kepekaan.csv, analog.csv, pembanding_pdna.csv, skenario.json); kalibrasi mesin public/gempa/data/kalibrasi_kerusakan.json; diakses 24-10-2026.
- `bnpb-2026-krb-geologi`: BNPB (2026). Ringkasan Kajian Risiko Bencana 2022–2026 nasional untuk gempabumi, tsunami, letusan gunung api, dan likuefaksi. https://inarisk.bnpb.go.id/apiv4/kajian-summary/tsunami/ALL?level=nasional; diakses 23-10-2026.
- `bnpb-2018-kerugian-sulteng`: BNPB (2018). Loss and Damage of Disaster in Central Sulawesi Reach 13,82 Trillion Rupiah. https://bnpb.go.id/berita/loss-and-damage-of-disaster-in-central-sulawesi-reach-1382-trillion-rupiah; diakses 24-10-2026.

---

## Catatan revisi setelah pemeriksaan (24 Oktober 2026)

Sebelas temuan pemeriksa dicek ke sumber; semuanya diterima, dengan dua penyesuaian kecil.

1. Periode ulang Sumatra: dicek ke PDF PuSGeN 2024 Tabel 6.2 hlm. 342 (kolom "Reccurent period"); terkonfirmasi 600,
   580, 150, 330, 330, 330. Ditambah kunci `pusgen.mentawai.periode_ulang` dan `geologi.mentawai_segmen.peluang_5th`
   (1,50%).
2. Pengungsi skenario: pita dihitung ulang dari `ringkasan.csv` (1.418.106–62.668.967; 131.368–5.736.600). Kunci lama
   tetap di registri karena dipakai `bab-11.md` (baris 745–747), tetapi diberi label "lampiran saja". **Untuk pemilik
   bab-11:** angka pengungsi skenario per wilayah di butir itu adalah nilai tengah berpita 44 kali dan tidak boleh masuk
   kartu angka atau RE.
3. Widiyantoro: teks lengkap (Europe PMC PMC7499206) menaruh 20,2 m di pulau kecil selatan Banten, sekitar 105,5° BT;
   bagian Diskusi menulis 11,7 m untuk Jawa Timur (abstrak membulatkan ke 12 m).
4. Sulteng: 212.719 dipakai; selisih 15,6% (dibulatkan 16%).
5. Banyuwangi dan lubang proksi: dihitung ulang dari `tsunami_kab.csv`. Penyesuaian: tiba sisi aman tercepat Mw 9,1
   di seluruh kab adalah Banyuwangi 4,0 menit (bukan kab lubang proksi); Malang 5,2 menit adalah yang tercepat di antara
   kab lubang. Keduanya ditulis.
6. Pulau Jawa saja: 2.396.295 dan 2.550.410 (44,9% dan 47,7% dari 5.341.282), dibulatkan 45% dan 48%.
7. Supendi: abstrak lewat Crossref memastikan sumbernya celah seismik selatan Jawa Barat dan Sumatra tenggara, ditambah
   skenario backthrust.
8. Nankai: label `nankai.faktor_rentang_kasus` diubah. Penyesuaian: `nankai.faktor_70` dan `nankai.faktor_survei`
   tinggal di `bab-03.angka.json` dan tidak disunting dari berkas ini. **Untuk pemilik bab-03:** ubah label keduanya ke
   "asumsi-kebijakan; rasio dari estimasi-model Cabinet Office Jepang 2025" agar Gambar 6.3 berpil sama.
9. InaTEWS Palu: `bukti_dampak.csv` B013–B016 memang bersumber Kontan dan CGTN. Rilis atau laporan BMKG tidak dibuka di
   sesi ini; Widiyanto dkk. (2019) dibuka dan tidak memuat jam peringatan. Fakta waktu peringatan diberi label sekunder
   dan dikeluarkan dari badan teks. Widiyanto dkk. justru melaporkan stasiun pasang surut Pantoloan di dalam Teluk Palu
   (data terhenti karena jaringan putus), yang tidak sejalan dengan "sensor terdekat sekitar 200 km". **Untuk pemilik
   paket program-terbukti:** sumber B013–B016 perlu diganti dokumen BMKG, dan baris B016 perlu disandingkan dengan
   Widiyanto dkk.
10. Merapi: rasio "232 kali" dihapus; rentang 34.742–89.707 dan asumsinya ditulis.
11. Kartu 6.2: frasa "batas bawah dinaikkan" dihapus; kartu hanya lantai tercatat, pita utuh di lampiran.

