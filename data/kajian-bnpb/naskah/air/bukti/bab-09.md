# Berkas bukti BAB 9 KELEMBAGAAN, PEMBIAYAAN, DAN PETA JALAN

Kajian: Grand Design Ketahanan Air Pulau Jawa 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9; Buku Pegangan L56–L64). Penulis bab menulis
hanya dari berkas ini dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi. Diperbaiki
24 Oktober 2026 menurut delapan temuan pemeriksa (catatan perbaikan di akhir berkas).

Berkas pendamping:

- `naskah/air/bukti/bab-09.angka.json`: kunci angka baru untuk registri (belum digabung ke `data/angka.json`).
- `naskah/air/bukti/bab-09.pustaka.json`: entri CSL-JSON (lihat bagian Pustaka).

Bahan yang dibaca: `KERANGKA.md` §0, §1, §2, §4 (Bab 8–10), §6, §7, §8; `KEPUTUSAN.md`; Buku Pegangan L56–L64;
`PEDOMAN-DESAIN.md` §C6, §C8, §C9 dan tabel kode G; `riset/A`, `riset/C` §2.5, `riset/E` (E6, E11, E13, E14); berkas bukti
Bab 1, 7, 8, dan 10 Kajian 1 (dipakai ulang bila butirnya sudah diverifikasi, disebut per butir; draf register R-A01 sampai
R-A21 diambil dari bab-10 I3.1); paket `data/lembaga/` (README, `lembaga.csv`, `peran.csv`, `matriks_air.csv`, `celah.csv`,
teks mentah Perpres 1/2019, Perpres 77/2025, Perpres 144/2024, UU 24/2007), `data/program-terbukti/` (README,
`organisasi_bnpb.csv`, `renas_aksi_terkait.csv`, `renstra_bnpb_2025_2029.csv`, `ripb_2020_2044.csv`); korpus
`data/raw/hukum/teks` (Kepka BNPB 327/2025, Perban 1/2025, 1/2023, 4/2020, 6/2025, 1/2026, 2/2024, 5/2018, Perka 6/2014,
Juklak 2/2026, Perpres 17/2018, Perpres 46/2026, indeks JDIH); dokumen web yang diunduh dan dibaca 24 Oktober 2026 (PP 21/2008,
PP 22/2008, Perpres 75/2021, PP 12/2019, PMK 28/2025, PMK 43/2025, Permen PU 2/2024, Permendes PDT 16/2025, halaman PFB BKF
Kemenkeu; disebut per butir, SHA-1 PDF di Pustaka).

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah; dokumen, tabel, atau peraturan dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka |
| estimasi-model | Keluaran model yang belum diuji balik, siapa pun pembuatnya |
| asumsi-kebijakan | Pilihan penyusun (definisi, pemetaan, pengelompokan, rancangan tabel) |
| sekunder | Berita atau ringkasan; sumber primer tidak terbuka. **Tidak masuk badan teks naskah final** dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti dan ditandai **[Inferensi tim]**. Program disebut dengan posisi rubrik
paket `program-terbukti` (KERANGKA §2 butir 12); bab ini tidak menyebut program apa pun "terbukti". Nominal anggaran, pagu
indikatif Renas, dan nilai kapitalisasi dana sengaja tidak disalin (P5); bab ini hanya memuat arsitektur sumber dana.

---

## Kerangka bab (dari KERANGKA.md §4, BAB 9)

- **Judul:** BAB 9 KELEMBAGAAN, PEMBIAYAAN, DAN PETA JALAN (9 hlm).
- **Subbab:** 9.1 Matriks Mandat Tertulis; 9.2 Usulan Penugasan dan Instrumen Penetapannya; 9.3 Forum Koordinasi dan
  Jalur Adopsi; 9.4 Arsitektur Pembiayaan; 9.5 Instrumen Hukum; 9.6 Peta Jalan; 9.7 Indikator Kinerja; 9.8 Pemantauan
  dan Pelaporan.
- **Tujuan bab:** memastikan tiap rekomendasi punya pemilik bermandat, forum, sumber dana, instrumen, dan jadwal.
- **Pertanyaan kunci:**
  1. Lembaga mana punya mandat tertulis per komponen dan fase, dan peran mana yang baru usulan?
  2. Lewat forum apa tiap rekomendasi lintas K/L dibawa?
  3. Sumber dana apa membiayai tiap fase tanpa nominal proyek?
  4. Instrumen hukum apa yang diusulkan, dan apakah sudah masuk Progsun BNPB 2026?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| Mandat: 74 dari 127 baris peran dan 23 dari 31 baris kewenangan air tertulis (`lembaga/README.md` §1) | **Berubah.** Berkas kerja `peran.csv` per 24 Okt 2026 memuat **129 baris, 76 tertulis, 53 pemetaan penyusun** (tambahan R144 Kemendikdasmen dan R145 Kemenag, keduanya tertulis); README paket masih menulis 127. Matriks air tetap 31 baris, 23 tertulis menurut paket, tetapi hanya **21 bersumber norma**: A28 dan A29 (NCICD) bersumber halaman web Dinas SDA DKI (P1 T1.1–T1.2) |
| Daftar lembaga `lembaga.csv` | **41 baris** (README menulis 40). Semua lembaga dan Kemenko yang disebut KERANGKA ada di daftar; hanya 11 kode yang punya baris di matriks komponen air, dan BNPB tidak termasuk (P1 T1.2) |
| Forum: Dewan SDA Nasional dan wadah koordinasi WS "diverifikasi"; Dewan Pengarah BOP Pantura Jawa; rakor Kemenko PMK | **Terverifikasi semua dari teks.** Ditambah dua forum yang belum masuk daftar forum Bab 9 KERANGKA (Unsur Pengarah hanya disebut di prinsip 1 sebagai jalur adopsi): Unsur Pengarah BNPB yang anggotanya memuat Kementerian PU dan Kementerian ESDM, dan forum koordinasi K/L penanggung jawab Renas (triwulan II tiap tahun). TKPSDA WS memberi kursi kepada sampai 5 instansi provinsi dan 3 instansi kab/kota yang terkait PSDA; teks tidak menyebut BPBD (P2) |
| Pembiayaan: DSP tiga keadaan; Dana Bersama jendela prabencana; APBN K/L; APBD dan BTT; dana desa; asuransi pertanian; asuransi BMN; teks PP 21/2008, PP 22/2008, Perpres 75/2021 dibuka | **Dibuka semua.** Ditambah: dana kontinjensi bencana APBN untuk kesiapsiagaan dan dana bantuan sosial berpola hibah pascabencana (PP 22/2008); DSP dibatasi delapan jenis pengadaan termasuk "kebutuhan air bersih dan sanitasi"; BTT dari PP 12/2019; PMK 28/2025 (BPDLH); Permendes PDT 16/2025 (fokus dana desa 2026 memuat pengendalian kekeringan, banjir, longsor, dan rob); BKF: pemda menyiapkan usulan Dana Bersama untuk TA 2027 (P3) |
| Instrumen: kolom Progsun Kepka 327/2025 butir 3, 9, 11 | **Dikonfirmasi; butir 9 sudah terbit** sebagai Perban BNPB 1/2026 (10 Maret 2026). Perubahan Renas, perubahan Perban 5/2018 (pedoman keadaan tertentu yang sudah berlaku sejak 2018) untuk unsur baru Perpres 46/2026, dan pedoman integrasi RTD ke renkon tidak ada di Progsun 2026. Sambungan peringatan dini per WS tidak memerlukan rancangan peraturan (kerja sama menurut Perban 2/2024 Pasal 8). Rancangan di luar Progsun dapat diprakarsai lewat izin prakarsa Kepala (Perka 6/2014 Pasal 8 ayat (2)) (P4) |
| Peta jalan: hari ke-0, 14 hari, 100 hari, 2026–2027, 2028–2030; jalur adopsi lewat peninjauan Renas sebagai butir 2026–2027 | Jangkar waktu bersumber (Renas §4.5–4.6, Perpres 80/2025 lewat bab-10, Progsun Diktum KEDUA, BKF TA 2027); disusun di Bahan subbab 9.6 |
| (tidak tertulis di KERANGKA) Peran BNPB dalam Renas 2.4.4.a | **Koreksi:** BNPB **sudah** kontributor Renas 2.4.4.a (Renas hlm. 86, dibuka ulang 24 Okt 2026). KERANGKA §2 butir 2 dan KD-5 (a) yang menulis "usul menjadi kontributor" sudah usang (P1 T1.7) |

- **Komponen (KERANGKA):** Tabel 9.1 matriks mandat tertulis lembaga × komponen × fase (B5.7); Tabel 9.2 usulan penugasan
  dan instrumen (B5.7); Gambar 9.1 forum koordinasi dan aliran rekomendasi (B5.23, G21); Gambar 9.2 lapisan pembiayaan
  (B5.21); Tabel 9.3 instrumen hukum berkolom Progsun (B5.20); Tabel 9.4 peta jalan per horizon (B5.13 kolom WAKTU); Tabel
  9.5 indikator (B5.19); Gambar 9.3 tata kelola dan pelaporan tiga lapis (B5.23). Rincian di bagian Komponen.
- **Status data (KERANGKA):** ada (lembaga, korpus); sebagian (status Dewan SDA Nasional; teks PP 21/22/2008 dan Perpres
  75/2021). **Pembaruan:** semua teks itu kini dibuka; yang tetap tidak ada adalah data realisasi (penyaluran Dana Bersama,
  dana kontinjensi, BTT per daerah) dan keanggotaan TKPSDA WS di Jawa.

Catatan lingkup: Bab 9 adalah satu-satunya tempat lembaga dan pembiayaan (prinsip 17). Strategi tinggal di Bab 8; rekomendasi
bernomor tinggal di Bab 10 (register bersama §6; ID sementara R-A01 sampai R-A21 dari bab-10). Bab ini memberi tiap baris
register pemilik bermandat, forum, sumber dana, instrumen, dan jadwal, tanpa menulis ulang rekomendasinya.

---

## P1. Lembaga mana punya mandat tertulis per komponen dan fase, dan peran mana yang baru usulan?

### Inti

Kelima komponen air dipimpin lembaga lain: Kementerian PU (BBWS, PJT I dan II) untuk air baku, irigasi pusat, dan
bendungan; pemda dan BUMD SPAM untuk air minum; Kementan untuk jaringan tersier; Kementerian ESDM dan pemda untuk air tanah
dan amblesan; dan dari 31 baris kewenangan air tidak satu pun menyebut BNPB. Mandat BNPB yang tertulis bersifat lintas jenis
dan per fase: koordinasi pada prabencana dan pascabencana, komando dan DSP pada darurat, platform peringatan dini, dan
rencana rehabilitasi dan rekonstruksi nasional; ditambah kontributor NSPK penurunan muka tanah (Renas 2.4.4.a) yang ternyata
sudah tertulis. Peran yang benar-benar baru usulan sempit: BPBD di wadah koordinasi WS dan penyedia peringatan kekeringan
hidrologis. Tiga peran lain dasarnya sudah ada dan tinggal dikembangkan: integrasi RTD bendungan dan SOP kegagalan tanggul
ke renkon BPBD (PP 37/2010, PP 30/2024, Perban 2/2023), sambungan sistem peringatan dini per WS ke platform BNPB (Perban
2/2024 Pasal 6–8 sudah mengatur konektivitas platform K/L, termasuk peringatan dini banjir dan kekeringan), dan keadaan
tertentu untuk kekeringan dan gangguan fungsi pelayanan umum (Perban 5/2018 sudah memuatnya; yang perlu disesuaikan hanya
unsur baru Perpres 46/2026).

### Temuan bersumber

**Hitungan matriks mandat**

- **T1.1 Baris peran.** Berkas kerja `lembaga/peran.csv` (dibaca 24 Okt 2026; berkas belum ter-commit dan sedang diubah
  workflow lain, SHA-1 12 karakter awal `8d35ac37df2f`): **129 baris; 76 `jenis_bukti` = tertulis; 53 pemetaan penyusun**.
  Fase: saat 56, pra 42, lintas 24, pasca 7. Sumber: `data/lembaga/peran.csv` [`pantaubencana-2026-paket-lembaga`]; kunci baru
  `lembaga.peran.baris_total`, `lembaga.peran.baris_tertulis`, `lembaga.peran.baris_pemetaan`. Label: resmi (olah).
  - *Dibantah oleh / berdampingan:* KERANGKA §4 Bab 9 dan `lembaga/README.md` §1 menulis "53 dari 127 baris peran" berjenis
    pemetaan, yaitu 74 tertulis. Selisih dua baris adalah R144 (Kemendikdasmen) dan R145 (Kemenag), keduanya penanggung jawab
    bersama Renas 2.1.2.a, tertulis. Naskah memakai kunci registri yang dibaca saat build, bukan angka KERANGKA.
- **T1.2 Matriks kewenangan air.** `lembaga/matriks_air.csv`: 31 baris (7 komponen: air baku 6 baris/5 tertulis, air minum
  4/3, irigasi 6/5, waduk dan bendungan 4/2, air tanah 4/3, penurunan muka tanah 4/2, banjir dan rob 3/3 menurut paket);
  **23 tertulis menurut paket, 8 pemetaan penyusun**; 11 kode lembaga (Kementerian PU, Pemda, Pemerintah Pusat, PJT I, PJT II,
  BUMD SPAM, Kementan, Kemenko IPK, Kementerian ESDM, BOP Pantura Jawa, BPBD). BNPB 0 baris; BPBD 1 baris (A19, dipetakan dari
  Penjelasan PP 37/2010). Kementerian PU 7 baris: **1 tertulis bersumber norma** (A15 Inpres 2/2025) dan 1 baris berjenis
  tertulis yang bersumber halaman web instansi (A28 NCICD). `lembaga.csv` memuat 41 baris lembaga (README menulis 40). Sumber:
  idem; kunci lama `lembaga.air.baris_total`, `lembaga.air.baris_tertulis`, `lembaga.air.baris_bnpb`, `lembaga.air.baris_bpbd`
  (bab-07); kunci baru `lembaga.matriks_air.kemen_pu.baris`, `lembaga.matriks_air.kemen_pu.tertulis`,
  `lembaga.matriks_air.tertulis_norma`, `lembaga.matriks_air.tertulis_situs_instansi`, `lembaga.daftar.n`. Label: resmi (olah);
  cakupan matriks hanya norma rezim SDA yang dibaca (pilihan penyusun, bab-07).
  - *Berdampingan (definisi lawan isi baris):* README paket mendefinisikan "`tertulis` = norma menyebut lembaga itu"
    (`lembaga/README.md` §1), tetapi A28 (Kementerian PU) dan A29 (Pemda, progres NCICD DKI) bersumber halaman web Dinas SDA DKI
    (`sid` web-dsda-ncicd-2025), bukan norma. Kedua baris ditulis di naskah sebagai **dinyatakan instansi (bukan norma)**. Hitungan
    bersumber norma: 21 dari 31 baris; Kementerian PU 1 dari 7; banjir dan rob 1 dari 3 (A30, Perpres 77/2025). Kunci lama
    `lembaga.air.baris_tertulis` (23) tidak diubah karena milik bab-07, tetapi di naskah Bab 9 wajib disandingkan dengan
    `lembaga.matriks_air.tertulis_norma` (21).
  - *Catatan A15:* Inpres 2/2025 menyasar 14 provinsi luar Jawa; Jawa hanya masuk lewat klausul umum "provinsi lain yang perlu
    ditingkatkan kinerja jaringan irigasi" (kolom `catatan` matriks). Sel irigasi Kementerian PU di Tabel 9.1 tidak boleh
    ditulis sebagai mandat khusus Jawa.
- **T1.3 Irisan peran untuk ancaman air.** Ancaman Kajian 1 di `peran.csv` (banjir termasuk rob, longsor, kekeringan, cuaca
  ekstrem, gelombang dan abrasi, kebakaran TPA) ditambah norma lintas jenis (`semua`): **76 baris, 49 tertulis, 32 lembaga;
  26 lembaga punya paling sedikit satu peran tertulis.** Ancaman air saja tanpa norma lintas jenis: 26 baris, **8 tertulis**
  (Pemda R061, R063, R074; PJT I R064; PJT II R065; BOP Pantura Jawa R066; KKP R070; Kementan R076). Bila karhutla ikut
  (KERANGKA §4 memasukkan karhutla Jawa ke ancaman kemarau): 102 baris, 65 tertulis, 35 lembaga. Sumber: idem, dihitung 24 Okt
  2026; kunci baru `lembaga.peran.air_semua.*`, `lembaga.peran.air_khusus.*`. Label: resmi (olah); penggolongan ke ancaman
  adalah pemetaan paket.
- **T1.4 Pemetaan penyusun tidak sama dengan tanpa mandat.** Kementerian PU punya 10 baris peran, **semuanya** pemetaan
  penyusun, karena normanya menyebut "Menteri", "Pemerintah Pusat", atau tidak menyebut pelaku (misalnya R062 kawasan daya
  rusak air, R078 penetapan sistem peringatan dini pada setiap WS); catatan paket: "Menteri SDA = Kementerian PU (Perpres
  170/2024)". BMKG punya 3 peran peringatan dini air (R068 cuaca ekstrem, R069 gelombang, R072 iklim ekstrem dan prakiraan
  musim) yang juga pemetaan karena UU 31/2009 menyebut "Badan". Sebaliknya enam baris kebakaran TPA dipetakan karena normanya
  tidak menyebut kebakaran sama sekali (penggolongan ancaman adalah tafsiran penyusun). Aturan paket: "Di naskah, sel pemetaan
  wajib diberi tanda inferensi" (`lembaga/README.md` §1). Sumber: `peran.csv` kolom `catatan`. Label: resmi (olah).
- **T1.5 Mandat BNPB yang tertulis** (13 baris BNPB, 11 tertulis; 8 di antaranya norma lintas jenis yang berlaku untuk
  ancaman air): pedoman dan pengarahan dari pencegahan sampai rekonstruksi (R001, UU 24/2007); kemudahan akses dan komando saat
  status darurat (R002); DSP saat tanggap darurat (R003); penanggulangan dalam keadaan tertentu (R004, Perpres 17/2018 jo. 46/2026; pedomannya Perban 5/2018, T3.4); fungsi
  komando pengerahan sumber daya (R005, Perpres 1/2019 Pasal 19); pengelola platform Sistem Peringatan Dini Bencana
  multiancaman (R006, Perban 2/2024); penyusun Rencana RR skala nasional bersama Bappenas dan K/L (R007, Perban 5/2017);
  koordinator Klaster Logistik (R009, Juklak 16/2025). BPBD: pedoman dan pengarahan di daerah (R010) serta peta rawan bencana
  (R011). Pemda: menjamin hak pengungsi sesuai SPM dan mengalokasikan dana PB di APBD (R012), sub-urusan bencana (R013),
  penetapan status darurat daerah (R015). Sumber: `peran.csv`; kunci baru `lembaga.peran.bnpb.baris`,
  `lembaga.peran.bnpb.tertulis`. Label: resmi.
- **T1.6 Fungsi BNPB per fase menurut Perpres 1/2019:** unsur pelaksana berfungsi koordinasi, komando, dan pelaksana (Pasal
  17); fungsi koordinasi "dilaksanakan pada tahap prabencana dan pascabencana" (Pasal 18 ayat (1)); fungsi komando lewat
  pengerahan sumber daya manusia, logistik, dan peralatan dari instansi terkait, Polri, dan TNI dalam penanganan darurat
  (Pasal 19 ayat (1)); fungsi pelaksanaan terkoordinasi dengan instansi pusat dan daerah (Pasal 20). BNPB dikoordinasikan
  kementerian koordinator bidang pembangunan manusia dan kebudayaan (Pasal 6) dan melaporkan penyelenggaraan PB kepada Presiden
  "setiap sebulan sekali dalam kondisi normal dan setiap saat dalam kondisi darurat bencana" (Pasal 3 huruf d). Sumber:
  `lembaga/mentah/teks/perpres-1-2019.json.gz` hlm. 2–4, 7–8 [`ri-2019-perpres1`]. Label: resmi.
- **T1.7 BNPB sudah kontributor Renas 2.4.4.a.** Kolom kontributor aksi 2.4.4.a "Penyusunan NSPK Mitigasi dan Adaptasi Subsiden
  Tanah" (PJ Kementerian Lingkungan Hidup; target 5 dokumen) memuat Kementerian Hukum, Kemenko PMK, Kemenko Infrastruktur dan
  Pembangunan Kewilayahan, Kementerian ATR/BPN, **BNPB**, dan seterusnya. Sumber: korpus `perban-nomor-1-tahun-2025.json`
  halaman n = 86, dibuka ulang 24 Okt 2026 [`bnpb-2025-renas`]; sama dengan bab-07 P1 butir 6 dan bab-10 T2.5; kunci lama
  `renas.aksi_244a.kontributor_kl`, `renas.aksi_244a.target_2029`. Label: resmi.
  - *Dibantah oleh:* KERANGKA §2 butir 2 dan §6 KD-5 (a) ("usul menjadi kontributor 2.4.4.a"); bab-08 T4.5 ("BNPB tidak
    tercantum"); `program-terbukti/renas_aksi_terkait.csv` (hanya menyalin tiga kontributor pertama). Teks Renas yang benar.
    Kementerian ESDM dan Kementerian PU, pemegang dua rezim amblesan, tidak tercantum di aksi itu.
- **T1.8 RTD bendungan.** RTD disusun Pembangun dan ditetapkan Pemilik bendungan, dikonsultasikan ke bupati dan gubernur
  terdampak; Penjelasan PP 37/2010 menyebut perangkat daerah urusan PB sebagai contoh instansi teknis yang diikutsertakan
  (matriks_air A19, A31; bab-08 T2.4) [`ri-2010-pp37`]. Label: resmi; pemetaan ke BPBD oleh paket.
- **T1.9 Sambungan peringatan dini per WS dan kekosongan penyedia.** Penetapan sistem peringatan dini pada setiap WS (PP
  30/2024 Pasal 96 ayat (1) huruf b) tidak menyebut pelaku; pemegang tanggung jawab Pasal 94 ayat (5) ada empat jenis.
  Mekanisme umum penyambungan ke Platform BNPB sudah tertulis di Perban 2/2024: konektivitas data dan informasi adalah hasil
  interkoneksi sistem dan interoperabilitas data "antara Platform yang dimiliki oleh kementerian/lembaga ke dalam Platform"
  (Pasal 6); K/L menyampaikan data peringatan dini bahaya yang terdiri atas antara lain "banjir" (Pasal 7 ayat (2) huruf b) dan
  "kekeringan" (huruf e); untuk memastikan konektivitas itu "BNPB bekerja sama dengan kementerian/lembaga penyedia layanan
  informasi Bahaya" lewat koordinasi data dan layanan informasi 24 jam (Pasal 8); koordinasi berbentuk rapat paling sedikit
  sekali setahun dan/atau permintaan data (Pasal 9); kelompok kerja konektivitas terdiri atas Direktorat Peringatan Dini dan
  Pusdatinkom (Pasal 10). Yang tidak ditemukan hanya pengait spesifik antara sistem per WS menurut PP 30/2024 dan Platform BNPB;
  penyedia peringatan dini kekeringan hidrologis tidak ditemukan. Sumber: `lembaga/celah.csv` C17 (PP 30/2024 hlm. 64–65);
  korpus `perban-nomor-2-tahun-2024.json` hlm. n = 5–6 [`ri-2024-pp30`, `bnpb-2024-peringatan-dini`]. Label: resmi; ketiadaan
  pengait disimpulkan penyusun.
  - *Batas (inferensi):* Pasal 6–8 menyebut "kementerian/lembaga". Sistem per WS yang dikelola BBWS (UPT Kementerian PU) masuk
    jalur ini; sistem yang dikelola pemda atau PJT (BUMN) tidak tercakup eksplisit.
- **T1.10 Unit BNPB berlaku** (Perban 6/2025 jo. 11/2025; 38 unit): Deputi Bidang Pencegahan (Direktorat Mitigasi Bencana,
  Kesiapsiagaan, Peringatan Dini); Deputi Bidang Penanganan Darurat (Direktorat Koordinasi Pengendalian Operasi Darurat;
  Direktorat Penanganan Darurat Wilayah I Jawa Tengah dan DIY, II DKJ, Banten, Jawa Barat, III Jawa Timur); Deputi Bidang
  Rehabilitasi dan Rekonstruksi (tiga direktorat sektor); Deputi Bidang Logistik dan Peralatan; Deputi Bidang Sistem dan
  Strategi (Direktorat Pemetaan dan Evaluasi Risiko Bencana, Direktorat Pengembangan Strategi Penanggulangan Bencana,
  Direktorat Sistem Penanggulangan Bencana); Pusdatinkom; Biro Perencanaan; Biro Hukum, Organisasi, dan Kerja Sama. Sumber:
  `program-terbukti/organisasi_bnpb.csv` [`bnpb-2025-otk`, `bnpb-2025-otk-ubah`]. Label: resmi.
- **T1.11 Tugas unit yang memegang lembaga, pembiayaan, dan instrumen:** Biro Perencanaan "melaksanakan koordinasi penyusunan
  program dan anggaran ... serta pemantauan, evaluasi, dan penyusunan laporan" BNPB (Perban 6/2025 Pasal 24–25); Biro Hukum,
  Organisasi, dan Kerja Sama mengoordinasikan penyusunan peraturan perundang-undangan dan kerja sama (Pasal 41–42); Direktorat
  Pengembangan Strategi PB merumuskan kebijakan teknis serta pemantauan, evaluasi, dan pelaporan "melalui pengurangan risiko
  bencana dan tata kelola penanggulangan bencana" (Pasal 50–51); Direktorat Pemetaan dan Evaluasi Risiko Bencana melaksanakan
  "analisis potensi kebencanaan, ancaman, kerentanan, risiko, dan kapasitas" (Pasal 47–48). Sumber: korpus
  `perban-nomor-6-tahun-2025.json` hlm. 7, 10–12 [`bnpb-2025-otk`]. Label: resmi.
- **T1.12 Klaster nasional tanpa klaster prasarana yang disebut eksplisit.** Kepka BNPB 308/2024 (dikutip Juklak 16/2025)
  tinggal 6 klaster: Pencarian dan Pertolongan (Basarnas), Pengungsian dan Perlindungan (Kemensos), Logistik (BNPB), Kesehatan
  (Kemenkes), Pendidikan, dan **Pemulihan (Kemendagri)**, yang menggantikan Pemulihan Dini versi lama. Klaster Sarana dan
  Prasarana (koordinator Kementerian PU) dan Ekonomi (Kementan) dari versi Kepka 173 tidak disebut lagi. Teks SK 308/2024 tidak
  ada di korpus, sehingga cakupan Klaster Pemulihan tidak dapat diperiksa. Sumber: `celah.csv` C08; `lembaga/klaster.csv`.
  Label: resmi (versi 2024, dari dokumen BNPB yang mengutip SK); versi lama dari berita (sekunder, hanya pembanding).

### Inferensi

- **I1.1 [Inferensi tim] Tiga keadaan sel, bukan dua.** Pemisahan KERANGKA prinsip 14 ("mandat tertulis" lawan "usulan
  penugasan = pemetaan penyusun") akan mengosongkan sel Kementerian PU dan BMKG di matriks utama, padahal mandat keduanya
  tertulis dengan pelaku umum (T1.4). Tabel 9.1 karena itu memakai tiga keadaan: (a) **tertulis** (norma menyebut lembaga);
  (b) **tertulis, pelaku dipetakan** (norma menyebut "Menteri", "Pemerintah Pusat", "Badan"; diberi tanda inferensi sesuai
  README paket); (c) kosong. Baris yang bersumber halaman web instansi (A28, A29) diberi tanda tersendiri, **dinyatakan instansi
  (bukan norma)**. Tabel 9.2 untuk peran yang belum ditugaskan secara spesifik oleh norma yang dibaca; kolom status P7
  membedakan peran yang dasarnya sudah ada dan perlu dikembangkan dari yang benar-benar baru. Penggolongan kebakaran TPA ke
  ancaman tetap ditandai tafsiran.
- **I1.2 [Inferensi tim] Draf Tabel 9.1** (baris lembaga, kolom komponen dan fase; kode K/P/R/I paket; `*` = pelaku dipetakan;
  `†` = dinyatakan instansi, bukan norma; irigasi pusat Kementerian PU lewat Inpres 2/2025 hanya klausul umum untuk Jawa, T1.2):

  | Lembaga | Komponen air (matriks_air) | Prabencana | Tanggap darurat | Pascabencana |
  | --- | --- | --- | --- | --- |
  | Kementerian PU (Ditjen SDA, BBWS; Cipta Karya) | air baku pusat*, SPAM nasional*, irigasi pusat*, keamanan bendungan*, kawasan ambles*, NCICD† | R kawasan daya rusak air*, I sistem peringatan dini per WS*, K pengaman pantai* | P SPAM khusus kekeringan* | – (rehabilitasi lewat UU 24/2007 Pasal 58, lintas jenis) |
  | PJT I, PJT II | air baku (operator WS Brantas, Bengawan Solo, Citarum) | P pengendalian banjir di wilayah kerja (lintas fase) | idem | – |
  | Pemda (provinsi, kab/kota) | air baku dan air minum menurut WS, irigasi provinsi dan kab, CAT dalam provinsi, amblesan | R kawasan daya rusak air; I sistem peringatan dini WS daerah* | R status darurat daerah; K hak pengungsi sesuai SPM | K rumah korban (UU 23/2014) |
  | BUMD SPAM | penyelenggara SPAM | – | – | – |
  | Kementan | jaringan tersier | P lahan dan irigasi pertanian | – | – |
  | Kementerian ESDM (Badan Geologi) | zona konservasi CAT lintas provinsi*, amblesan* | I gerakan tanah* | P bantuan bidang ESDM | – |
  | KLH/BPLH | – | R NSPK sampah* (kebakaran TPA, tafsiran); PJ Renas 2.4.4.a | – | – |
  | BMKG | – | I cuaca ekstrem*, gelombang*, iklim ekstrem dan prakiraan musim* | – | – |
  | BOP Pantura Jawa | amblesan dan tanggul laut Pantura | P tanggul laut (rob) | – | – |
  | BNPB | 0 baris | I platform peringatan dini; K pedoman; kontributor 2.4.4.a | K komando, DSP, keadaan tertentu, klaster logistik | K rencana RR nasional |
  | BPBD | RTD bendungan* (A19) | I peta rawan bencana; K pedoman daerah | K koordinasi daerah | K koordinasi daerah |
  | Kemenko PMK | – | P prioritas Dana Bersama* | K rakor keadaan tertentu* | – (K sinkronisasi lintas fase) |
  | Kemenko IPK, Kemenko Pangan | irigasi (sinkronisasi Inpres 2/2025) | K penyediaan air lahan padi* (Pangan) | – | – |

  Untuk slide E3 (≤ 12 baris) baris Kemenko dipindah ke Gambar 9.1. Sel bersumber baris `peran.csv` dan `matriks_air.csv` yang
  disebut di T1.2–T1.5.
- **I1.3 [Inferensi tim] Draf Tabel 9.2 usulan penugasan dan instrumen yang diperlukan:**

  | No | Peran yang diusulkan | Dasar yang sudah ada | Instrumen untuk menetapkannya | Status P7 | Register |
  | --- | --- | --- | --- | --- | --- |
  | 1 | BPBD duduk di TKPSDA WS sebagai salah satu instansi daerah terkait PSDA | Permen PU 2/2024 Pasal 34 ayat (4)–(7) (WS lintas provinsi) dan Pasal 41 ayat (4)–(7) (WS strategis nasional): kepala daerah menyampaikan atau mengusulkan sampai 5 orang dari 5 instansi provinsi dan 3 dari 3 instansi kab/kota terkait PSDA (P2 T2.4) | Lewat usulan kepala daerah pada penetapan atau pembaruan keanggotaan; tidak perlu mengubah Permen; tiga syarat di I2.4 | Usulan baru (BPBD tidak disebut; masuknya BPBD ke "instansi terkait PSDA" adalah tafsiran) | R-A07, R-A13 |
  | 2 | RTD bendungan dan SOP kegagalan tanggul/polder diintegrasikan ke renkon BPBD hilir dan pesisir | PP 37/2010 Pasal 52–54; PP 30/2024 Pasal 96 ayat (1) huruf c–d; Perban 2/2023 | Pedoman atau juklak BNPB di bawah Perban 2/2023, ditambah permintaan daftar RTD lewat Kementerian PU | Sudah ada, perlu dikembangkan | R-A07, R-A13 |
  | 3 | Sambungan sistem peringatan dini per WS ke platform BNPB | Perban 2/2024 Pasal 6–8 (konektivitas platform K/L ke Platform BNPB; Pasal 7 ayat (2) huruf b banjir, huruf e kekeringan; Pasal 8 kerja sama dengan K/L penyedia informasi bahaya); PP 30/2024 Pasal 96 ayat (1) huruf b (T1.9) | Kerja sama BNPB dengan Kementerian PU menurut Perban 2/2024 Pasal 8; tidak memerlukan perubahan Perban | Sudah ada, perlu dikembangkan (Perban 2/2024 Pasal 6–8) | R-A06 |
  | 4 | Penyedia peringatan dini kekeringan hidrologis | Tidak ada pemegang (T1.9); Dewan SDA Nasional berfungsi koordinasi sistem informasi hidrologi (P2 T2.3) | Belum dapat ditentukan; dibahas di Dewan SDA Nasional | Usulan baru | R-A14 |
  | 5 | BNPB dilibatkan dalam pelaksanaan tugas BOP Pantura Jawa | Perpres 77/2025 Pasal 7 ayat (6) ("dapat dilibatkan") (P2 T2.5) | Pelibatan oleh Dewan Pengarah; tidak perlu mengubah Perpres; mekanisme pelibatan tidak tertulis | Sudah ada, perlu dikembangkan | R-A12, R-A20 |
  | 6 | Keadaan tertentu untuk kekeringan dan gangguan layanan air bersih berdampak luas | Perpres 17/2018 Pasal 3 ayat (2) huruf b dan ayat (4) (bunyi sama sejak 2018; ayat (2) diubah Perpres 46/2026); Perban 5/2018 Pasal 3 ayat (2) huruf a angka 9 (kekeringan) dan ayat (3) huruf d (gangguan fungsi pelayanan umum) (P3 T3.4) | Perubahan Perban 5/2018 untuk menyesuaikan unsur baru Perpres 46/2026 | Sudah ada, perlu dikembangkan | keduanya |

  Baris "BNPB menjadi kontributor 2.4.4.a" **tidak** masuk Tabel 9.2: peran itu sudah tertulis (T1.7) dan pindah ke Tabel 9.1.
- **I1.4 [Inferensi tim] Peran BNPB per komponen memakai kosakata prinsip 14:** air baku dan air minum (komando darurat,
  pendanaan DSP untuk air bersih, NSPK renkon kekeringan); irigasi (koordinasi; puso kekeringan bukan DSP); waduk dan bendungan
  (NSPK renkon, data-KRB); air tanah dan penurunan muka tanah (data-KRB, kontributor NSPK 2.4.4.a); lintas komponen (monev
  Renas, pendanaan Dana Bersama). Tidak ada sel tempat BNPB menjadi pemimpin komponen; ini sesuai batas mandat UU 17/2019 Pasal
  35 (KERANGKA §2 butir 2).
- **I1.5 [Inferensi tim]** Pemulihan darurat prasarana air (SPAM, tanggul, saluran irigasi) **tidak disebut eksplisit** dalam
  daftar klaster Kepka 308/2024 yang dikutip Juklak 16/2025 (T1.12). Cakupan Klaster Pemulihan (Kemendagri) tidak dapat
  diperiksa karena teks SK 308/2024 tidak tersedia, sehingga tidak dapat disimpulkan bahwa prasarana air tanpa koordinator
  klaster. Di luar klaster, fungsi komando BNPB (Perpres 1/2019 Pasal 19) dan rehabilitasi UU 24/2007 Pasal 58 tetap berlaku.
  Di Tabel 9.1 sel ini ditulis "tidak disebut eksplisit; menunggu teks SK 308/2024", bukan sel kosong dan bukan rekomendasi
  baru.

### Celah

- `peran.csv` dan README paket lembaga sedang diubah di berkas kerja (belum ter-commit); hitungan T1.1–T1.5 dapat bergeser.
  **Penyajian:** naskah membaca kunci registri saat build; KERANGKA §4 diperbarui pemiliknya.
- Perpres 53/2022, Keppres 18/2024, Permen PU 2/2024, Perpres 77/2025 Pasal 7 ayat (6), dan Perban 6/2025 Pasal 10 (Unsur
  Pengarah) belum menjadi baris `peran.csv`. **Permintaan:** pemilik paket `lembaga` (KERANGKA §10).
- Teks PP 28/2025 dan Kepmen ESDM 291.K/2023 belum dibaca; penerbit persetujuan penggunaan air tanah per Oktober 2026 ditulis
  "belum dapat dipastikan" (bab-07 P1 Celah).
- Keanggotaan TKPSDA WS di Jawa yang berlaku dan apakah BPBD sudah duduk di dalamnya tidak diperiksa per WS. **Permintaan:**
  Ditjen SDA Kementerian PU, BBWS di Jawa.
- Mekanisme pelibatan K/L lain di BOP Pantura Jawa (Perpres 77/2025 Pasal 7 ayat (6)) tidak diatur di batang tubuh yang dibaca.
- Teks Kepka BNPB 308/2024 (klaster nasional) tidak ada di korpus; cakupan Klaster Pemulihan atas prasarana air dan apakah SK itu
  mencabut Kepka 173 tidak dapat diperiksa (I1.5). **Permintaan:** Biro Hukum, Organisasi, dan Kerja Sama; Deputi Bidang
  Penanganan Darurat.

---

## P2. Lewat forum apa tiap rekomendasi lintas K/L dibawa?

### Inti

Semua forum yang dibutuhkan sudah ada dalam peraturan dan tidak satu pun perlu dibentuk: rakor Kemenko PMK (pengoordinasi
BNPB, jalur pelaporan RIPB, syarat keadaan tertentu, dan koordinasi Dana Bersama), Unsur Pengarah BNPB (anggotanya memuat
Kementerian PU dan Kementerian ESDM), Dewan SDA Nasional (Kepala BNPB anggota, berfungsi koordinasi sistem informasi
hidrologi), TKPSDA WS (kursi instansi daerah terkait PSDA; bahwa BPBD termasuk di dalamnya adalah tafsiran), Dewan Pengarah
BOP Pantura Jawa (Menko PMK Wakil Ketua;
K/L lain dapat dilibatkan), serta siklus monev Renas (forum K/L penanggung jawab tiap triwulan II dan forum multipihak
tahunan). Rekomendasi irigasi dan pangan dibawa lewat Kemenko Pangan, prasarana air lewat Kemenko IPK, dan air tanah lewat
Kemenko Perekonomian sebagai pengoordinasi Kementerian ESDM.

### Temuan bersumber

- **T2.1 Kemenko PMK.** BNPB dikoordinasikan kementerian koordinator bidang pembangunan manusia dan kebudayaan (Perpres 1/2019
  Pasal 6; T1.6). Deputi Bidang Koordinasi Penanggulangan Bencana dan Konflik Sosial bertugas "sinkronisasi dan koordinasi
  perumusan, penetapan, dan pelaksanaan kebijakan serta pengendalian pelaksanaan kebijakan kementerian/lembaga" di bidang PB,
  termasuk pemantauan, analisis, evaluasi, dan pelaporan (Perpres 144/2024 Pasal 25–26; `perpres-144-2024.json.gz` hlm. 12–13)
  [`ri-2024-perpres144`]. Pemantauan RIPB dilaporkan ke Presiden melalui menko PMK (Perpres 87/2020 Pasal 6 ayat (3); riset
  E11a) [`ri-2020-perpres87`]. Dana Bersama: BNPB menelaah setelah berkoordinasi dengan Kemenko PMK (Perpres 75/2021 Pasal 8
  ayat (2)); kementerian koordinator bidang PMK dilibatkan dalam penyusunan prioritas kegiatan (Perban 1/2026 Pasal 7 ayat (3)),
  menerima daftar permohonan (Pasal 13), dan menerima tembusan rekomendasi (Pasal 25 ayat (2) huruf a) [`ri-2021-perpres75`,
  `bnpb-2026-dana-bersama`]. Keadaan tertentu memerlukan keputusan rakor yang dikoordinasikan menko pembidang PB (Perpres
  46/2026 Pasal 3 ayat (1)); pemetaan ke Kemenko PMK oleh paket (R017). Menko PMK adalah Wakil Ketua Dewan Pengarah BOP Pantura
  Jawa (Perpres 77/2025 Pasal 7 ayat (3) huruf b). Label: resmi.
- **T2.2 Unsur Pengarah BNPB.** Bertugas memberi masukan dan saran kepada Kepala (Perban 6/2025 Pasal 7); berfungsi perumusan
  konsep kebijakan PB nasional, pemantauan, dan evaluasi (Pasal 8); terdiri atas Ketua yang dijabat Kepala dan 20 anggota (Pasal
  9): 11 pejabat yang mewakili Kemenko PMK, Kemenko Politik dan Keamanan, Kemendagri, Kemenkeu, Kemenkes, Kemensos,
  **Kementerian ESDM**, **Kementerian PU**, Kemenhub, Polri, TNI, ditambah 9 anggota masyarakat profesional (Pasal 10). Sumber:
  korpus `perban-nomor-6-tahun-2025.json` hlm. 3–4 [`bnpb-2025-otk`]; kunci baru `perban2025_6.unsur_pengarah.anggota`,
  `perban2025_6.unsur_pengarah.instansi`. Label: resmi. KLH/BPLH, Kementan, dan BMKG tidak termasuk.
  - *Berdampingan:* Perpres 1/2019 Pasal 13 ayat (2) memuat susunan yang sama dengan nama lama "Kementerian Koordinator Bidang
    Politik, Hukum, dan Keamanan" dan "Kementerian Pekerjaan Umum dan Perumahan Rakyat" (`perpres-1-2019.json.gz` hlm. 5–6;
    `celah.csv` C12). Naskah memakai nama Perban 6/2025.
- **T2.3 Dewan SDA Nasional.** Perpres 53/2022 (6 April 2022): ketua menko bidang kemaritiman dan investasi, wakil menko
  perekonomian, ketua harian Menteri PU; "kepala badan yang melaksanakan tugas pemerintahan di bidang penanggulangan bencana"
  anggota unsur Pemerintah Pusat (Pasal 7 ayat (1) huruf d angka 14; 15 jabatan pusat); fungsi koordinasi perumusan kebijakan
  pengelolaan sistem informasi hidrologi, hidrometeorologi, dan hidrogeologi tingkat nasional (Pasal 5 ayat (2) huruf c) dan
  koordinasi dengan TKPSDA WS (huruf e); keanggotaan Keppres 18/2024 memuat Kepala BNPB. Sumber: riset E13; bab-07 P1 butir 9
  [`ri-2022-perpres53`, `ri-2024-keppres18`]; kunci lama `perpres53.anggota_pusat`. Label: resmi.
- **T2.4 TKPSDA WS.** Permen PU 2/2024 (ditetapkan 13 Desember 2024; mencabut Permen PUPR 17/PRT/M/2017): lima jenis TKPSDA WS;
  ditetapkan Menteri untuk WS lintas negara, lintas provinsi, dan strategis nasional, gubernur untuk WS lintas kab/kota,
  bupati/wali kota untuk WS dalam satu kab/kota (Pasal 4–5); tugas TKPSDA WS lintas provinsi: menyelaraskan kepentingan
  antarsektor, memberi saran kepada Pemerintah Pusat dan pemda, serta "memantau dan mengevaluasi pelaksanaan program dan rencana
  kegiatan Pengelolaan Sumber Daya Air" (Pasal 12); ketua kepala Bappeda provinsi bergantian, ketua harian kepala dinas SDA
  provinsi, anggota unsur pemerintah dan nonpemerintah berimbang (Pasal 33); unsur pemerintah: Pemerintah Pusat paling sedikit 1
  UPT K/L terkait PSDA, provinsi **paling banyak 5 orang dari 5 instansi provinsi** terkait PSDA, kab/kota **paling banyak 3 orang
  dari 3 instansi** (Pasal 34 ayat (2)–(7)); unsur nonpemerintah memuat organisasi/asosiasi "pengendali Daya Rusak Air" (Pasal
  35 ayat (1) huruf m); masa kerja anggota 5 tahun (Pasal 36 ayat (1)), dan penggantian antarwaktu diatur hanya untuk anggota
  unsur nonpemerintah (Pasal 36 ayat (2)–(6)); TKPSDA WS strategis nasional diketuai kepala Bappeda provinsi lokasi, ketua
  harian kepala dinas SDA (Pasal 40 ayat (2)–(3)), dengan susunan unsur pemerintah yang sama: gubernur **mengusulkan** paling
  banyak 5 orang dari 5 instansi provinsi dan bupati/wali kota paling banyak 3 orang dari 3 instansi (Pasal 41 ayat (4)–(7)),
  masa kerja 5 tahun dan penggantian antarwaktu hanya unsur nonpemerintah (Pasal 43); TKPSDA WS yang dibentuk sebelum Permen
  ini tetap berlaku sampai masa tugasnya berakhir (Pasal 95 huruf a). Teks tidak menyebut BNPB atau BPBD. Sumber:
  https://peraturan.bpk.go.id/Details/328867, PDF /Download/390749/2024pmpu2.pdf (diunduh dan dibaca lewat `pdftotext`, 24 Okt
  2026; SHA-1 `4aa048a8f253...`; hlm. PDF 14–16, 18–20, 40) [`kemenpu-2024-permen2`]; kunci baru `permenpu2024_2.tkpsda.*`.
  Label: resmi.
- **T2.5 Dewan Pengarah BOP Pantura Jawa.** BOP lembaga nonstruktural di bawah Presiden untuk persiapan, perencanaan,
  pembangunan, dan pengembangan Pantura Jawa, berfungsi antara lain pemantauan dan evaluasi (Perpres 77/2025 Pasal 2–4). Ketua
  Dewan Pengarah Menko IPK; Wakil Ketua Menko Perekonomian, Menko PMK, Menko Pemberdayaan Masyarakat, Menko Pangan (Pasal 7 ayat
  (2)–(3)); anggota 13 jabatan pusat (Bappenas, KKP, ATR/BPN, Kemenkeu, Investasi dan Hilirisasi, Kemendagri, PU, PANRB,
  Kemenhut, KLH/BPLH, Kemenhub, BRIN, BIG) dan 30 kepala daerah (ayat (4)–(5)); "Dalam hal tertentu, Menteri/Kepala Lembaga selain
  sebagaimana dimaksud pada ayat (4) dapat dilibatkan" (ayat (6)); sekretariat ex officio unit eselon I Kemenko IPK (Pasal 8);
  Kepala melapor kepada Presiden dan Dewan Pengarah (Pasal 35); pendanaan APBN, APBD, dan sumber lain termasuk KPBU, hibah,
  Danantara, kontribusi swasta (Pasal 49). Sumber: `lembaga/mentah/teks/perpres-77-2025.json.gz` hlm. 4–7, 15, 19
  [`ri-2025-perpres77`]; kunci lama `perpres77.dewan_pengarah.kepala_daerah`; kunci baru
  `perpres77.dewan_pengarah.anggota_pusat`. Label: resmi. Kementerian ESDM dan BNPB tidak tercantum (C06).
- **T2.6 Kemenko lain yang mengoordinasikan pemimpin komponen.** Kementerian PU dan Kemenhub (induk koordinasi BMKG)
  dikoordinasikan Kemenko IPK; Kementerian ESDM dikoordinasikan Kemenko Perekonomian (C15; Perpres 145/2024, 143/2024, 12/2024);
  Kementan, KLH/BPLH, Kemenhut, dan KKP dikoordinasikan Kemenko Pangan (`lembaga.csv` kolom `dikoordinasikan_oleh`); Inpres 2/2025
  menugaskan Kemenko IPK menyinkronkan percepatan jaringan irigasi (A16) dan Menko Pangan untuk penyediaan air lahan padi (R075,
  pemetaan). Sumber: `lembaga/lembaga.csv`, `celah.csv` C15, `matriks_air.csv` A16, `peran.csv` R075. Label: resmi (R075:
  penggolongan ke kekeringan tafsiran penyusun).
- **T2.7 Forum dalam siklus Renas.** Pemantauan saat pelaksanaan memakai "forum koordinasi dengan Kementerian/Lembaga
  Penanggung Jawab paling lambat pada triwulan ke-dua (TW-II) di tahun berjalan" (Renas §4.5, hlm. 123); pemetaan peran pihak
  nonpemerintah "dapat dilakukan melalui forum multipihak minimal 1 (satu) tahun sekali di tingkat nasional" (§4.3, hlm. 120);
  pemda berkontribusi dengan menyelaraskan Renas ke RPB daerah (hlm. 120). Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm.
  120, 123 [`bnpb-2025-renas`]. Label: resmi.
- **T2.8 Pemberi pertimbangan Dana Bersama:** kementerian bidang keuangan negara, kementerian/lembaga bidang perencanaan
  pembangunan nasional, dan kementerian bidang dalam negeri (Perban 1/2026 Pasal 21 ayat (1); Perpres 75/2021 Pasal 8 ayat (3));
  risalah pertimbangan paling lambat 10 hari kerja (Perban 1/2026 Pasal 23 ayat (3)). Sumber: korpus
  `perban-nomor-1-tahun-2026.json` hlm. 9 [`bnpb-2026-dana-bersama`]. Label: resmi.
- **T2.9 Jalur perubahan Renstra:** usulan perubahan Renstra-KL dibahas dalam Pertemuan Dua Pihak dengan Kementerian
  Perencanaan dan ditetapkan setelah persetujuannya; evaluasi Renstra tahun ke-3 dan ke-5 (Perpres 80/2025 Pasal 22–29, 51).
  Sumber: bab-10 T2.3 [`ri-2025-perpres80`]. Label: resmi.
- **T2.10 Rantai informasi melintasi tiga Kemenko** (BMKG dan PU di bawah Kemenko IPK, BNPB di bawah Kemenko PMK, Badan Geologi
  di bawah Kemenko Perekonomian). Sumber: `celah.csv` C15; bab-07 P1 butir 12. Label: resmi.

### Inferensi

- **I2.1 [Inferensi tim] Draf peta forum per baris register (isi Gambar 9.1, G21 diagram aliran berikon tanpa lebar
  sebanding):**

  | Forum | Dasar | Baris register yang dibawa | Siapa membawa dari BNPB (unit berlaku) |
  | --- | --- | --- | --- |
  | Rakor Kemenko PMK (Deputi Bidang Koordinasi PB dan Konflik Sosial) | Perpres 1/2019 Pasal 6; Perpres 144/2024 Pasal 25–26; Perpres 87/2020 Pasal 6 | R-A05, R-A09, R-A12, R-A18, R-A20, R-A21; keadaan tertentu (Perpres 46/2026) | Biro Perencanaan; Direktorat Pengembangan Strategi PB |
  | Unsur Pengarah BNPB | Perban 6/2025 Pasal 7–10 | Kajian utuh sebagai masukan dan saran; R-A06, R-A07, R-A12, R-A14 (Kementerian PU dan ESDM duduk di forum ini) | Kepala BNPB selaku Ketua |
  | Dewan SDA Nasional | Perpres 53/2022 Pasal 5, 7; Keppres 18/2024 | R-A06, R-A07, R-A12, R-A14; penyedia peringatan kekeringan hidrologis | Kepala BNPB selaku anggota; Pusdatinkom dan Direktorat Peringatan Dini sebagai pendukung |
  | TKPSDA WS (lintas provinsi, strategis nasional) | Permen PU 2/2024 Pasal 5, 12, 33–36, 40–43, 95 | R-A07, R-A13 | BPBD lewat usulan kepala daerah pada penetapan atau pembaruan keanggotaan (syarat di I2.4); Direktorat Kesiapsiagaan menyurati pemda |
  | Dewan Pengarah BOP Pantura Jawa | Perpres 77/2025 Pasal 7 ayat (3), (6) | R-A12, R-A13, R-A20 | Lewat Menko PMK (Wakil Ketua); pelibatan langsung bila Dewan Pengarah memutuskan |
  | Kemenko Pangan | Inpres 2/2025; koordinasi Kementan | R-A09 (kalender tanam, asuransi pertanian Renas 2.5.1.c) | Direktorat Kesiapsiagaan |
  | Kemenko IPK | koordinasi Kementerian PU dan Kemenhub (BMKG) | Eskalasi R-A06, R-A07 bila forum air tidak menyelesaikan | Lewat rakor Kemenko PMK |
  | Kemenko Perekonomian | koordinasi Kementerian ESDM; PSN | Data air tanah dan amblesan (R-A12, R-A14) | Lewat Dewan SDA Nasional (Menko Perekonomian wakil ketua) |
  | Kementerian Perencanaan (Pertemuan Dua Pihak) | Perpres 80/2025 | R-A10 | Biro Perencanaan |
  | Forum K/L penanggung jawab Renas (TW-II) dan forum multipihak tahunan | Renas §4.3, §4.5 | Semua baris lintas K/L (R-A07, A09, A10, A12, A13, A14, A15, A16, A19, A20) | Direktorat Pengembangan Strategi PB |
  | Dana Bersama (Kemenko PMK; pertimbangan Kemenkeu, Bappenas, Kemendagri) | Perpres 75/2021 Pasal 8; Perban 1/2026 Pasal 7, 13, 21 | Usulan pemda daftar perhatian untuk renkon, peringatan dini, kapasitas badan air (P3) | Tim penelaahan BNPB (Perban 1/2026 Pasal 27) |

- **I2.2 [Inferensi tim] Tidak perlu forum baru.** Usulan "wadah air Jawa" atau komisaris (KERANGKA M05, Bab 10 yang tidak
  direkomendasikan) tidak diperlukan karena enam forum di atas sudah berdasar hukum dan dua di antaranya (Unsur Pengarah, Dewan
  SDA Nasional) sudah memuat BNPB bersama Kementerian PU. Yang belum ada adalah agenda: tidak ditemukan bukti forum-forum itu
  pernah membahas sambungan peringatan dini per WS ke platform BNPB.
- **I2.3 [Inferensi tim] Urutan jalur adopsi:** kajian masuk ke Kepala lewat Unsur Pengarah (masukan dan saran), diputuskan
  Kepala (KD-1, KD-2, KD-5), dibawa ke rakor Kemenko PMK untuk peninjauan Renas dan ke forum K/L penanggung jawab Renas
  triwulan II 2027, dan untuk butir air dibawa paralel ke Dewan SDA Nasional dan TKPSDA WS. Butir tanggul laut berjalan lewat
  Menko PMK di Dewan Pengarah BOP.
- **I2.4 [Inferensi tim]** Kursi BPBD di TKPSDA WS tidak memerlukan perubahan peraturan: Permen PU 2/2024 sudah memberi kursi
  instansi daerah terkait PSDA (Pasal 34 untuk WS lintas provinsi, Pasal 41 untuk WS strategis nasional), dan jalurnya lewat
  usulan kepala daerah pada penetapan atau pembaruan keanggotaan. Tuas ini bersyarat tiga: (a) masa kerja anggota 5 tahun dan
  penggantian antarwaktu diatur hanya untuk unsur nonpemerintah (Pasal 36 ayat (1)–(2), Pasal 43 ayat (1)–(2)), sedangkan
  TKPSDA lama tetap berlaku sampai masa tugasnya berakhir (Pasal 95 huruf a), sehingga kursi pemerintah mungkin baru terbuka
  pada periode keanggotaan berikutnya; (b) kursi dibatasi 5 untuk provinsi dan 3 untuk kab/kota (Pasal 34 ayat (5), (7); Pasal
  41 ayat (5), (7)) dan diperebutkan dengan Bappeda serta dinas SDA yang memegang jabatan ketua dan ketua harian merangkap
  anggota (Pasal 33 ayat (2)–(3), Pasal 40 ayat (2)–(3)); bahwa kedua jabatan itu memakai kuota instansi provinsi adalah
  tafsiran; (c) apakah BPBD termasuk "instansi ... yang terkait Pengelolaan Sumber Daya Air" adalah tafsiran penyusun, karena
  teks tidak menyebut BPBD. RPSDA yang sudah menyebut BPBD sebagai pelaksana kegiatan daya rusak air (bab-08 T2.20) memperkuat
  alasan tafsiran (c).

### Celah

- Pemetaan jabatan ketua Dewan SDA Nasional (menko bidang kemaritiman dan investasi) ke kabinet 2024–2029 belum dapat
  dipastikan; perubahan Perpres 53/2022 tidak ditemukan (riset E13). **Penyajian:** jabatan ditulis sesuai teks dengan catatan.
- Notula atau jadwal sidang Dewan SDA Nasional, TKPSDA WS di Jawa, dan rakor Kemenko PMK 2025–2026 tidak ditemukan; naskah tidak
  menyatakan forum itu aktif atau tidak aktif.
- Keputusan keanggotaan Unsur Pengarah BNPB yang berlaku tidak dibuka.
- Laporan forum K/L penanggung jawab dan forum multipihak Renas 2025 tidak ditemukan (bab-01 PK4 Celah).

---

## P3. Sumber dana apa membiayai tiap fase tanpa nominal proyek?

### Inti

Prabencana dibiayai APBN K/L pemimpin komponen, APBD, DAK irigasi, dana desa (fokus 2026 memuat pengendalian kekeringan,
banjir, longsor, dan rob), Dana Bersama jendela prabencana atas permohonan pemda atau K/L kepada BNPB, dan dana kontinjensi
bencana APBN untuk kesiapsiagaan. Darurat dibiayai BTT APBD dan DSP, dan DSP secara tertulis mencakup "kebutuhan air bersih
dan sanitasi", sehingga krisis air bersih kemarau berstatus darurat punya jalur dana yang sudah ada. Pascabencana dibiayai
APBN/APBD, dana bantuan sosial berpola hibah, Dana Bersama pascabencana, serta transfer risiko (asuransi BMN dan asuransi
pertanian); puso kekeringan diarahkan ke asuransi pertanian, bukan DSP.

### Temuan bersumber

**Undang-undang dan peraturan pemerintah**

- **T3.1 UU 24/2007.** Tanggung jawab Pemerintah memuat pengalokasian anggaran PB dalam APBN yang memadai dan dalam bentuk DSP
  (Pasal 6 huruf e–f); tanggung jawab pemda memuat pengalokasian dana PB dalam APBD (Pasal 8 huruf d); dana PB tanggung jawab
  bersama (Pasal 60); pada saat tanggap darurat BNPB menggunakan DSP yang disediakan dalam anggaran BNPB (Pasal 62). Sumber:
  `lembaga/mentah/teks/uu-24-2007.json.gz` hlm. 7–8, 26–27 [`ri-2007-uu24`]. Label: resmi.
- **T3.2 PP 22/2008 (Berlaku; LN 2008/43).** Dana PB berasal dari APBN, APBD, dan/atau masyarakat (Pasal 4 ayat (2)); disediakan
  pada prabencana, tanggap darurat, dan pascabencana (Pasal 5 ayat (2)); APBN juga menyediakan dana kontinjensi bencana, DSP, dan
  dana bantuan sosial berpola hibah (Pasal 5 ayat (3)). "Dana kontinjensi bencana ... disediakan dalam APBN untuk kegiatan
  kesiapsiagaan pada tahap prabencana" (Pasal 6 ayat (1)); DSP ditempatkan dalam anggaran BNPB untuk kegiatan saat tanggap
  darurat (ayat (2)); pemda dapat menyediakan DSP dalam anggaran BPBD (ayat (3)). Dana prabencana pada situasi berpotensi bencana
  dipakai untuk kesiapsiagaan, pembangunan sistem peringatan dini, dan mitigasi; kesiapsiagaan memakai dana kontinjensi (Pasal 14).
  Penggunaan DSP terbatas pada pengadaan barang dan/atau jasa untuk delapan keperluan, termasuk huruf d "kebutuhan air bersih dan
  sanitasi" (Pasal 17 ayat (2)). Bantuan pascabencana berpola hibah atas permohonan tertulis pemda kepada Pemerintah melalui BNPB,
  dievaluasi dan diverifikasi BNPB, ditetapkan Kepala BNPB, disampaikan ke Menteri Keuangan untuk persetujuan DPR (Pasal 23).
  Laporan pertanggungjawaban tanggap darurat paling lambat 3 bulan setelah masa tanggap darurat (Pasal 34 ayat (2)); semua laporan
  diaudit (Pasal 36). Sumber: https://peraturan.bpk.go.id/Details/4834/pp-no-22-tahun-2008, PDF /Download/36843 (diunduh dan
  dibaca 24 Okt 2026; SHA-1 `4f529566623f...`; hlm. cetak 3–4, 6–8, 10, 15) [`ri-2008-pp22`]; kunci baru
  `pp22_2008.dsp.jenis_pengadaan`, `pp22_2008.laporan_darurat.bulan`. Label: resmi.
- **T3.3 DSP dalam Perban BNPB 4/2020.** "DSP digunakan selama masa keadaan darurat bencana, keadaan tertentu, dan pertimbangan
  adanya risiko Bencana berdampak luas yang ditetapkan oleh Kepala BNPB" (Pasal 20 ayat (1)); keadaan darurat meliputi siaga
  darurat, tanggap darurat, dan transisi darurat ke pemulihan; status siaga darurat ditandai informasi peningkatan ancaman dari
  sistem peringatan dini (Pasal 1, hlm. 3); laporan perkembangan penggunaan DSP paling lambat tanggal 5 bulan berikutnya dan
  pertanggungjawaban paling lambat 3 bulan setelah status berakhir (Pasal 21). Mengingat memuat PP 22/2008 dan Perpres 17/2018.
  Sumber: korpus `perban-nomor-4-tahun-2020.json` hlm. 1–3, 16 [`bnpb-2020-dsp`]; kunci baru `perban2020_4.dsp.*`. Label: resmi.
  - *Berdampingan (rentang berbeda, bukan angka):* PP 22/2008 Pasal 6 ayat (2) dan Pasal 15–17 menempatkan DSP "untuk kegiatan
    pada saat tanggap darurat"; Perban 4/2020 Pasal 20 ayat (1) memakai rentang keadaan darurat (termasuk siaga dan transisi),
    keadaan tertentu, dan risiko berdampak luas, dengan Perpres 17/2018 di dasar mengingatnya. Hubungan hukum keduanya tidak
    ditelaah di berkas ini.
- **T3.4 Keadaan tertentu (Perpres 17/2018 jo. Perpres 46/2026) dan pedomannya yang sudah berlaku (Perban BNPB 5/2018).**
  - *Perpres 17/2018 (ditetapkan 19 Maret 2018, LN 2018/34; status BERLAKU menurut indeks JDIH).* Kepala BNPB dapat melaksanakan
    penyelenggaraan PB termasuk kemudahan akses "setelah mendapatkan keputusan dalam rapat koordinasi antarkementerian/ lembaga"
    yang dikoordinasikan menko pembidang PB (Pasal 3 ayat (1)), pada kondisi "a. adanya potensi Bencana dengan tingkat ancaman
    maksimum; dan b. telah terjadi evakuasi/penyelamatan/pengungsian atau gangguan fungsi pelayanan umum yang berdampak luas
    terhadap kehidupan sosial dan ekonomi masyarakat" (ayat (2)); kondisi dan tata caranya "diatur dalam pedoman yang ditetapkan
    oleh Kepala Badan Nasional Penanggulangan Bencana" (ayat (4)). Kewajiban pedoman dan kondisi gangguan fungsi pelayanan umum
    sudah ada sejak 2018. Sumber: korpus `perpres-nomor-17-tahun-2018.json` hlm. 3–4 [`ri-2018-perpres17`]. Label: resmi.
  - *Perpres 46/2026 (ditetapkan dan diundangkan 16 Juli 2026, LN 2026/83).* Pasal I hanya mengubah ayat (2) Pasal 3: huruf a
    ditambah "yang disebabkan oleh faktor alam, nonalam, dan/atau sosial"; huruf b bunyinya tetap; ditambah huruf c "pemerintah
    daerah yang wilayahnya dalam proses rekonsiliasi pascakonflik sosial dan memiliki kapasitas fiskal sangat rendah atau rendah";
    penghubung antarhuruf menjadi "dan/atau" (sebelumnya "dan" antara huruf a dan b). Ayat (1), (3), dan (4) tetap. Sumber: korpus
    `perpres-nomor-46-tahun-2026.json` hlm. 2–4 [`ri-2026-perpres46`]. Label: resmi.
  - *Perban BNPB 5/2018 tentang Kondisi dan Tata Cara Pelaksanaan Penyelenggaraan PB dalam Keadaan Tertentu (ditetapkan 27 Agustus
    2018, diundangkan 13 Desember 2018, BN 2018/1644; status BERLAKU menurut indeks JDIH).* Ditetapkan "untuk melaksanakan
    ketentuan Pasal 3 ayat (4) Peraturan Presiden Nomor 17 Tahun 2018" (konsiderans). Keadaan tertentu dilakukan pada potensi
    bencana dengan tingkat ancaman maksimum **dan** telah terjadi evakuasi/penyelamatan/pengungsian atau gangguan fungsi pelayanan
    umum yang berdampak luas (Pasal 3 ayat (1)); potensi ancaman maksimum meliputi peringatan dini K/L berwenang, antara lain
    "ancaman bencana kekeringan, yang berdasarkan kajian dan/atau analisis terhadap terjadinya kemarau panjang" (ayat (2) huruf a
    angka 9), serta banjir (angka 3) dan banjir bandang (angka 4); laporan BPBD/masyarakat paling sedikit memuat, antara lain,
    "adanya gangguan fungsi pelayanan umum dan pemerintahan" (ayat (3) huruf d). Tata cara: informasi peringatan dini K/L dan kaji
    cepat BNPB/BPBD (Pasal 4 ayat (1)); rakor dipimpin menko atas inisiatif BNPB (Pasal 4 ayat (2), Pasal 5); anggota rakor 20
    unsur termasuk Kementerian PUPR, Kementerian ESDM, BMKG, dan pemda terdampak (Pasal 6); status ditetapkan dengan SK Kepala BNPB
    (Pasal 7); BNPB dapat mengaktifkan sistem komando (Pasal 8); pendanaan APBN/APBD dan sumber lain yang tidak mengikat (Pasal
    12). Tidak ada ambang angka untuk kekeringan. Sumber: korpus `perban-nomor-5-tahun-2018.json` hlm. 1, 3–8;
    `data/raw/hukum/indeks.json` [`bnpb-2018-perban5`]; sama dengan bab-05 T3.3a. Label: resmi.
  - *Berdampingan:* Perban 5/2018 Pasal 3 ayat (1) memakai "dan" (ancaman maksimum dan evakuasi atau gangguan), sedangkan
    Perpres 46/2026 Pasal 3 ayat (2) memakai "dan/atau" antarhuruf; syarat pedoman yang berlaku lebih ketat daripada Perpres yang
    baru. KERANGKA M08 dan baris instrumen Kajian 2 menulis perubahan Perban 5/2018 sebagai "Usulan baru" karena pedoman lama
    tidak memuat kondisi pascakonflik; untuk kajian air, kekeringan dan gangguan fungsi pelayanan umum sudah tercakup, sehingga
    statusnya "Sudah ada, perlu dikembangkan" (I1.3, I4.1).
- **T3.5 BTT APBD (PP 12/2019).** Belanja tidak terduga adalah pengeluaran APBD "untuk keadaan darurat termasuk keperluan mendesak"
  (Pasal 68 ayat (1)); keadaan darurat meliputi bencana alam, nonalam, sosial dan/atau KLB, operasi pencarian dan pertolongan,
  dan "kerusakan sarana/prasarana yang dapat mengganggu kegiatan pelayanan publik" (Pasal 69 ayat (1)); keperluan mendesak
  meliputi antara lain kebutuhan pelayanan dasar yang belum dianggarkan (ayat (2) huruf a); kriteria ditetapkan dalam Perda APBD
  tahun berkenaan (ayat (3)); belanja tanggap darurat bencana tidak perlu diformulasikan lebih dulu dalam RKA SKPD (ayat (4)).
  Sumber: https://peraturan.bpk.go.id/Details/103888/pp-no-12-tahun-2019, PDF /Download/94590 (diunduh dan dibaca 24 Okt 2026;
  SHA-1 `da75b49a74fa...`; hlm. cetak 52–54) [`ri-2019-pp12`]. Label: resmi.
- **T3.6 Masalah pokok yang diakui Renas:** akuntabilitas BTT tidak jelas dan "belum tersinkronisasinya pemahaman dan pengelolaan
  dana untuk penanganan darurat bencana" (Renas hlm. 26; `celah.csv` C02); dana desa untuk ketangguhan belum optimal (Renas hlm.
  26–27; riset A). Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 26–27 [`bnpb-2025-renas`]. Label: resmi.

**Dana Bersama**

- **T3.7 Perpres 75/2021 (Berlaku; ditetapkan 13 Agustus 2021).** Dikelola Menteri Keuangan selaku pengelola fiskal lewat unit
  pengelola dana yang boleh berpola BLU (Pasal 3); bersumber APBN, APBD lewat belanja hibah, dan sumber lain termasuk klaim
  asuransi, hasil investasi, hibah, dan dana perwalian (Pasal 4); disalurkan pada prabencana, darurat, pascabencana terutama
  pemulihan, dan transfer risiko (Pasal 6 ayat (2)); kepada K/L, pemda, kelompok masyarakat terverifikasi pemda, dan penyedia
  (Pasal 7); prabencana dan pascabencana "dilakukan setelah adanya permohonan tertulis dari Pemerintah Daerah dan/atau kementerian
  negara/lembaga kepada BNPB", ditelaah BNPB setelah berkoordinasi dengan Kemenko PMK, dengan pertimbangan Kemenkeu, Bappenas,
  Kemendagri, lalu Kepala BNPB menyampaikan rekomendasi kepada Menteri (Pasal 8); darurat mengikuti peraturan lain (Pasal 9);
  transfer risiko lewat asuransi dengan klaim disalurkan untuk perbaikan, pembangunan kembali, atau penggantian objek (Pasal 10).
  Sumber: https://peraturan.bpk.go.id/Details/175273/perpres-no-75-tahun-2021, PDF /Download/168550 (diunduh dan dibaca 24 Okt
  2026; SHA-1 `cc2cfdb2954a...`; hlm. 3–8) [`ri-2021-perpres75`]. Label: resmi.
- **T3.8 PMK 28/2025 (ditetapkan 21 April 2025, diundangkan 28 April 2025).** BPDLH, unit non-eselon di bawah Menteri melalui
  Dirjen Perbendaharaan, memegang rekening Dana Bersama (Pasal 1 angka 25, 27) dan menerima pelimpahan kewenangan pengumpulan,
  pengembangan, dan penyaluran (Pasal 3 ayat (4)); penyaluran ke pemda untuk program prabencana dan pascabencana "dari BPDLH kepada
  Pemda melalui DJPK dari RKUN ke RKUD" (Pasal 27 ayat (3) huruf b); penyaluran darurat lewat penambahan alokasi anggaran dana
  cadangan bencana (Pasal 26 ayat (5)). Sumber: https://peraturan.bpk.go.id/Details/317819, PDF /Download/379225 (diunduh dan
  dibaca 24 Okt 2026; SHA-1 `723bb4343fcb...`; hlm. cetak 4–6, 14–15) [`kemenkeu-2025-pmk28`]. Label: resmi.
- **T3.9 Perban BNPB 1/2026 (ditetapkan 10 Maret 2026; mencabut Perban 1/2024 di Pasal 34).** Penyelenggaraan PB "mengutamakan
  kegiatan yang bersifat investasi pada pengurangan risiko bencana" (Pasal 2 ayat (3)); prioritas ditetapkan Kepala BNPB dengan
  mempertimbangkan kesesuaian Renas/RPBD, daerah berindeks risiko tinggi, rencana RR, dan SPM sub-urusan bencana (Pasal 7 ayat
  (2)); pemohon K/L paling rendah pejabat pimpinan tinggi madya, pemohon pemda kepala daerah, permohonan kab/kota ditembuskan ke
  sekda dan BPBD provinsi (Pasal 9); pemda membentuk tim dengan BPBD sebagai koordinator (Pasal 11); kriteria prabencana:
  kesesuaian dengan Renas dan RKP (K/L) atau RKPD, RPBD, dan/atau SPM (pemda) (Pasal 14 ayat (4)); dokumen KAK, RAB, reviu APIP,
  spesifikasi, dokumen sistem pengelolaan lingkungan dan sosial (Pasal 16 ayat (3)); dokumen tambahan dalam 5 hari kerja (Pasal 20
  ayat (4)); tim internal BNPB masa kerja 2 tahun dan bertemu rutin atau tiap 3 bulan (Pasal 28); pemantauan dan evaluasi
  (Pasal 29–31); laporan kemajuan dan laporan akhir paling lama 60 hari setelah kegiatan (Pasal 32); sistem informasi "sesuai
  prinsip satu data" (Pasal 33). Tidak ada syarat analisis manfaat-biaya (bab-08 T5.9; `program-terbukti/README.md` §4 butir 6).
  Sumber: korpus `perban-nomor-1-tahun-2026.json` hlm. 3–13 [`bnpb-2026-dana-bersama`]; kunci baru `perban2026_1.*`. Label: resmi.
- **T3.10 Juklak BNPB 2/2026 (16 Maret 2026) standar komponen biaya usulan prabencana.** Daftar usulan kegiatan: K/L 50, pemda
  provinsi 44, pemda kab/kota 44, kelompok masyarakat 10 (Lampiran I). Kegiatan yang mengenai air antara lain "Penyusunan Rencana
  Kontingensi", "Mitigasi Bencana Berbasis Alam", "Pembangunan/Penguatan Infrastruktur Pendukung Ketahanan Bencana" (contoh kab/kota:
  sumur resapan dan biopori di permukiman rawan banjir, drainase lingkungan, bronjong), "Peningkatan Kapasitas Badan Air" (sungai,
  waduk, danau; contoh normalisasi sungai dan tanggul sungai; untuk K/L, provinsi, kab/kota sesuai kewenangan), "Pembangunan Sistem
  Komunikasi Risiko dan Peringatan Dini Bencana", "Penyelenggaraan Instrumentasi Peringatan Dini", dan "Pendampingan, Monitoring,
  dan Evaluasi SPM Sub-Urusan Bencana". Harga satuan memakai standar biaya Kemenkeu dan pemda; juklak tidak memuat nominal. Sumber:
  korpus `juklak-nomor-2-tahun-2026.json` hlm. 1–12, 135–140 [`bnpb-2026-juklak2`]; kunci baru `juklak2026_2.kegiatan.*`. Label: resmi.
  - *Berdampingan:* Latar belakang Juklak 2/2026 (hlm. 1) masih merujuk Perban 1/2024 sebagai dasar, padahal Perban 1/2026 Pasal 34
    mencabutnya enam hari sebelumnya. Butir Lampiran J (penyelarasan dokumen BNPB), bukan badan teks.
- **T3.11 Status operasional Dana Bersama menurut BKF Kemenkeu.** Halaman resmi Pooling Fund Bencana (PFB): dikelola BPDLH; tonggak
  "2025 Piloting LIVE" dengan regulasi PMK 28 dan 43/2025; "Implementasi formulasi Partisipasi dan Manfaat Pemda" pada 2026–2027;
  pemda "can now begin preparing proposals for pre-disaster and post-disaster activities ... to be funded through the PFB mechanism
  in the 2027 Fiscal Year"; urutan pemakaian "Dana Siap Pakai (On Call) → Dana Cadangan → Hasil Investasi → Dana Utama". Halaman
  juga memuat nilai pendanaan awal APBN; nilai itu **tidak dikutip** (P5). Sumber: https://fiskal.kemenkeu.go.id/parb/en/pfb-2/
  (diakses 24 Okt 2026) [`kemenkeu-bkf-2026-pfb`]. Label: resmi (halaman instansi).
  - *Berdampingan:* riset C §2.5 mencatat tanggal mulai operasi PFB bertentangan antarsumber (2022 lawan April 2025, sekunder).
    Halaman BKF menempatkan 2025 sebagai tahap uji coba dan 2026–2027 sebagai penerapan; naskah memakai halaman BKF.

**Sumber lain per fase**

- **T3.12 Dana desa 2026 (Permendes PDT 16/2025, ditetapkan 29 Desember 2025).** Fokus penggunaan dana desa 2026 diutamakan untuk
  delapan hal, termasuk huruf b "penguatan Desa berketahanan iklim dan tangguh bencana" (Pasal 2 ayat (1)); Lampiran B memuat
  "pengendalian kekeringan, banjir dan longsor, seperti pembuatan penampung/pemanen/peresapan air hujan ... pembuatan/perbaikan
  saluran air di area rentan banjir" dan "penanganan atau antisipasi kenaikan muka laut, rob, intrusi air laut, abrasi"; fokus
  dibahas dalam Musyawarah Desa dan diutamakan berdasarkan rekomendasi Indeks Desa (Pasal 8 ayat (2)–(3)). Sumber:
  https://www.peraturan.go.id/filespengundangan/permendespdt-no-16-tahun-2025.pdf (diunduh dan dibaca 24 Okt 2026; SHA-1
  `25b415088baa...`; hlm. cetak 4–5, Lampiran hlm. 13) [`kemendes-2025-permendes16`]; kunci baru `permendes2025_16.fokus.jumlah`.
  Label: resmi.
- **T3.13 Kerangka pendanaan Renas:** APBN lewat anggaran K/L, diprioritaskan untuk kegiatan yang menjadi prioritas nasional RPJMN;
  DSP untuk tanggap darurat, keadaan tertentu, dan risiko berdampak luas; Dana Bersama untuk prabencana, darurat, pascabencana, dan
  transfer risiko; pendanaan nonpemerintah (CSR, filantropi, KPBU, asuransi risiko bencana) (Renas §4.4, hlm. 120–122); pendanaan
  Renas dari APBN dan sumber lain (Pasal 6). Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 4, 120–122 [`bnpb-2025-renas`].
  Label: resmi.
- **T3.14 Aksi pembiayaan dalam Renas** (pagu indikatif sengaja tidak disalin): 4.6.2.a optimasi penyaluran Dana Bersama, target
  **100** K/L, pemda, dan kelompok yang mendapat penyaluran pada 2029 (baseline "-"; PJ Kementerian Keuangan, BNPB); 4.6.2.b laporan
  pemantauan dan evaluasi kegiatan Dana Bersama, target **5** dokumen; 4.6.3.a asuransi BMN dan perluasan skema pembiayaan BMN dan
  BMD, dari 1 rekomendasi kebijakan ke **1 peraturan perundang-undangan** (PJ Kemenkeu, BNPB, Kemendagri); 4.6.3.b pengenalan konsep
  transfer risiko kepada **546** daerah (PJ BNPB; kontributor Kemenkeu, Kemendagri, OJK). Fokus capaian RIPB 4: investasi memadai
  dalam PRB. Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 111–112 [`bnpb-2025-renas`]; `renas_aksi_terkait.csv` (4.6.3.a,
  4.6.3.b); kunci baru `renas.aksi_462a.target_2029`, `renas.aksi_462b.target_2029`, `renas.aksi_463a.target_2029`,
  `renas.aksi_463b.target_2029`. Label: resmi; kolom OCR bertumpuk, angka 4.6.2.a dan 4.6.2.b dibaca dari urutan teks.
- **T3.15 Asuransi pertanian:** Renas 2.5.1.c luas pertanaman terlindungi asuransi 278.806 ha (2024) ke 1.250.000 ha (2029), PJ
  Kementan (bab-08; kunci lama `renas.aksi_251c.*`). KERANGKA R04 menolak perluasan DSP ke puso kekeringan. Label: resmi.
- **T3.16 DAK irigasi dan APBN PU:** pemda yang mengusulkan DAK Fisik Bidang Irigasi wajib mengumpulkan data kondisi jaringan lewat
  e-PAKSI (bab-08 T1.13 [`djpk-2024-dak-irigasi`]); RPJMN KP 08.04.05 Kementerian PU "infrastruktur berketahanan bencana di lokasi
  prioritas" 19 ke 100 dengan proyek prioritas peningkatan infrastruktur pengendali daya rusak air (riset E11b; kunci lama
  `rpjmn.kp080405.*`). Label: resmi.
- **T3.17 Data pembiayaan adalah Data Bencana.** Data Bencana terdiri atas data prabencana, tanggap darurat, pascabencana, dan
  "Data Pembiayaan Penanggulangan Bencana" (Perban 1/2023 Pasal 4), paling sedikit biaya pencegahan, pengurangan risiko, mitigasi
  dan kesiapsiagaan; biaya tanggap kedaruratan; biaya pemulihan (Pasal 5 ayat (4)). Sumber: korpus `perban-nomor-1-tahun-2023.json`
  hlm. 2–5 [`bnpb-2023-satudata`]. Label: resmi.
- **T3.18 Arah RIPB:** strategi 3b "Meningkatkan investasi dan pemanfaatan berbagai skema pendanaan inovatif termasuk transfer
  risiko" dan 3c "Mengoptimalkan pendanaan secara terpadu" (dikutip Renas hlm. 14; riset E11a membuka Perpres 87/2020). Sumber:
  `program-terbukti/ripb_2020_2044.csv` [`ri-2020-perpres87`, `bnpb-2025-renas`]. Label: resmi.
- **T3.19 PMK 43/2025 tentang Pengasuransian Barang Milik Negara (ditetapkan 7 Juli 2025).** Mengganti PMK 97/PMK.06/2019
  "untuk menyesuaikan dengan perkembangan program pengasuransian Barang Milik Negara dan menyelaraskan dengan kebijakan dana
  bersama penanggulangan bencana" (Menimbang huruf b) dan mencabutnya (Pasal 49); Unit Pengelola Dana membayar premi BMN Preferen
  yang didanai Dana Bersama dan menjadi pemegang polis bersama Pengguna Barang (Pasal 10, 18); sumber pendanaan pengasuransian
  BMN: APBN, Dana Bersama, Pihak Lain, Mitra, atau sumber lain yang sah, dan Dana Bersama "hanya dapat digunakan untuk
  pengasuransian BMN Preferen" (Pasal 33); klaim BMN Preferen berpremi Dana Bersama diberikan dalam bentuk uang tunai (Pasal 34
  ayat (2)). Peraturan ini hanya mengatur BMN; pengasuransian **BMD tidak diatur** di teks yang dibaca. Tanggal pengundangan
  tidak terbaca di salinan yang dibuka. Sumber: salinan JDIH Kemenkeu
  https://jdih.kemenkeu.go.id/download/18a5150f-3cb7-40f7-ac82-1dc5cf228ff3/2025pmkeuangan043.pdf (diunduh dan dibaca lewat
  `pdftotext`, 24 Okt 2026; SHA-1 `35bccae98ded...`; hlm. 1, 10, 12, 17–18, 25–26) [`kemenkeu-2025-pmk43`]. Label: resmi. Halaman
  BPK tidak dapat dibuka 24 Okt 2026 (situs dalam pemeliharaan), sehingga status keberlakuan dari BPK tidak diperiksa.
  - *Berdampingan:* Renas 4.6.3.a "Asuransi BMN serta Perluasan Skema Pembiayaan untuk Perlindungan BMN dan BMD" menargetkan
    "1 Peraturan Perundang-undangan" pada 2029 dari baseline "1 Rekomendasi Kebijakan" (T3.14). PMK 43/2025 mengisi bagian BMN;
    bagian BMD belum ditemukan. Apakah PMK 43/2025 dihitung sebagai capaian 4.6.3.a adalah penilaian penyusun.

### Inferensi

- **I3.1 [Inferensi tim] Draf Gambar 9.2 lapisan pembiayaan per fase (B5.21, G21 tanpa nominal):**

  | Fase | Lapisan dan dasar | Contoh pemakaian untuk lima komponen air | Pengguna |
  | --- | --- | --- | --- |
  | Prabencana, situasi normal | APBN K/L (PU, Kementan, ESDM, KLH, BMKG); APBD; DAK irigasi; dana desa 2026 | Prasarana air oleh pemimpin komponen; data e-PAKSI; penampung air hujan dan saluran desa | K/L, pemda, desa |
  | Prabencana, potensi bencana | Dana kontinjensi bencana APBN (PP 22/2008 Pasal 6 ayat (1), 14); Dana Bersama prabencana (Perpres 75/2021 Pasal 8; Perban 1/2026; Juklak 2/2026) | Renkon kekeringan dan banjir; peringatan dini; peningkatan kapasitas badan air sesuai kewenangan | K/L, pemda (BPBD koordinator tim), kelompok masyarakat lewat pemda |
  | Siaga dan tanggap darurat | BTT APBD (PP 12/2019 Pasal 68–69); DSP BPBD bila dianggarkan (PP 22/2008 Pasal 6 ayat (3)); DSP BNPB (UU 24/2007 Pasal 62; PP 22/2008 Pasal 17 ayat (2) huruf d air bersih; Perban 4/2020 Pasal 20); keadaan tertentu (Perpres 17/2018 jo. 46/2026; Perban 5/2018 Pasal 12); Dana Bersama darurat lewat dana cadangan (PMK 28/2025 Pasal 26 ayat (5)) | Distribusi air bersih kemarau berstatus; evakuasi dan pemulihan darurat prasarana saat banjir | Pemda, BPBD, BNPB |
  | Pascabencana | APBN/APBD; dana bantuan sosial berpola hibah (PP 22/2008 Pasal 23); Dana Bersama pascabencana sesuai rencana RR (Perban 1/2026 Pasal 14 ayat (5)) | Rehabilitasi SPAM, tanggul, jaringan irigasi | Pemda, K/L |
  | Transfer risiko | Asuransi BMN (Perpres 75/2021 Pasal 10; PMK 43/2025, premi BMN Preferen dapat dari Dana Bersama); asuransi BMD direncanakan (Renas 4.6.3.a); asuransi pertanian (Renas 2.5.1.c) | Bendungan dan prasarana milik negara; puso kekeringan dan banjir | Kemenkeu, Kementan, pemda |

  Urutan pemakaian dana PFB menurut BKF (T3.11) dipakai sebagai keterangan lapisan darurat. Profil kerugian tahunan batas bawah
  Jawa (prinsip 15, boleh tampil berlabel Asumsi kebijakan) tidak dihitung di berkas ini; lihat Celah.
- **I3.2 [Inferensi tim] Krisis air bersih kemarau sudah punya jalur dana tertulis.** DSP terbatas delapan jenis pengadaan dan
  air bersih termasuk di dalamnya (T3.2); BTT memakai "keadaan darurat" bencana dan "kerusakan sarana/prasarana yang dapat
  mengganggu kegiatan pelayanan publik" (T3.5). Yang menentukan akses adalah status: status siaga atau tanggap darurat oleh kepala
  daerah, atau keadaan tertentu lewat rakor (T3.4). Karena itu rekomendasi kemarau tidak meminta instrumen dana baru, tetapi
  pemicu status dan pengembangan pedoman keadaan tertentu yang sudah ada. Perban 5/2018 sudah memuat ancaman kekeringan
  ("kemarau panjang") dan gangguan fungsi pelayanan umum (T3.4); yang perlu disesuaikan adalah unsur baru Perpres 46/2026
  (faktor alam, nonalam, dan/atau sosial; huruf c pascakonflik; penghubung "dan/atau" yang lebih longgar daripada syarat gabungan
  Perban 5/2018 Pasal 3 ayat (1)), ditambah ambang krisis air bersih yang belum ada di pedoman itu.
- **I3.3 [Inferensi tim] Jendela TA 2027.** BKF menyatakan pemda dapat menyiapkan usulan prabencana untuk TA 2027 (T3.11), dan
  Juklak 2/2026 sudah memuat kegiatan renkon, peringatan dini, dan kapasitas badan air (T3.10). Bupati/wali kota daftar perhatian
  (98 kab/kota; kunci `perhatian.air.gabungan.n`, bab-08) dapat menjadi pemohon pertama: permohonan pemda diajukan Kepala Daerah
  (Perban 1/2026 Pasal 9 ayat (4)) dan permohonan kab/kota ditembuskan ke sekda dan BPBD provinsi (ayat (5)); BPBD berperan
  sebagai koordinator tim persiapan yang ditetapkan Kepala Daerah (Pasal 11 ayat (2) huruf a, ayat (3)). Kriteria Pasal 14 ayat (4) Perban 1/2026
  mensyaratkan kegiatan merujuk RPBD dan/atau SPM, sehingga status RPBD dan SPM per kab (bab-08 P2 Celah) menjadi syarat praktis.
- **I3.4 [Inferensi tim] Usulan manfaat-biaya tetap berstatus Usulan baru** (kompendium P24, rujukan tata kelola FEMA): Perban
  1/2026 dan Juklak 2/2026 tidak memuatnya; Renas 4.6.2.c (NSPK tata kelola Dana Bersama) adalah tempat masuknya.
- **I3.5 [Inferensi tim] Yang tidak direkomendasikan** sesuai KERANGKA §4 Bab 10 dan prinsip 15: dana air Jawa; DSP untuk mitigasi
  prabencana; perluasan DSP ke puso kekeringan. Bukti T3.2–T3.4 mendukung batas itu: DSP dalam PP 22/2008 terikat tanggap darurat
  dan delapan jenis pengadaan.
- **I3.6 [Inferensi tim] Data Pembiayaan PB (T3.17) adalah alat ukur lapisan:** tanpa data realisasi per fase, arsitektur di I3.1
  tidak dapat dipantau. Permintaan ke Pusdatinkom (Walidata) masuk subbab 9.8.

### Celah

- Realisasi Dana Bersama (jumlah permohonan, rekomendasi Kepala BNPB, penyaluran per daerah) tidak ditemukan; pencarian 24 Okt
  2026 hanya menemukan regulasi. **Permintaan:** Direktorat Pengembangan Strategi PB dan tim penelaahan Dana Bersama; BPDLH.
- Pemakaian dana kontinjensi bencana APBN (PP 22/2008 Pasal 6 ayat (1)) dalam praktik tidak ditemukan; naskah menulisnya sebagai
  instrumen yang tersedia dalam PP, tanpa klaim pemakaian.
- Rasio anggaran PB terhadap APBD dan BTT per kab/kota Jawa tidak ditemukan (KERANGKA §7 butir 31). **Permintaan:** Kemendagri
  (Ditjen Bina Keuangan Daerah), BPBD provinsi.
- KMK 407/2021 tidak dibuka; PMK 97/2019 tidak dibuka (sudah dicabut PMK 43/2025 Pasal 49); status pilot asuransi BMN hanya dari
  halaman BKF. Pengaturan asuransi BMD (bagian BMD Renas 4.6.3.a) tidak ditemukan. Status keberlakuan PMK 43/2025 di BPK belum
  diperiksa karena situs dalam pemeliharaan 24 Okt 2026.
- Juknis BNPB 1/2024 (DSP puso banjir) dan juknis DAK irigasi 2026 tidak dibuka (yang dibaca lampiran 2024).
- Besaran stimulan rumah resmi tidak ditemukan di korpus (bab-03 Celah); profil kerugian tahunan batas bawah hanya tersedia
  nasional (`turunan/profil_kerugian.csv`), irisan Jawa belum dihitung.
- Hubungan hukum PP 22/2008 Pasal 6 ayat (2) dengan Perban 4/2020 Pasal 20 ayat (1) tidak ditelaah (T3.3).

---

## P4. Instrumen hukum apa yang diusulkan, dan apakah sudah masuk Progsun BNPB 2026?

### Inti

Progsun BNPB 2026 (Kepka 327/2025) memuat 11 rancangan; tiga menyentuh kajian ini: butir 3 analisis risiko bencana pada kegiatan
pembangunan berisiko tinggi, butir 9 penelaahan Dana Bersama (sudah terbit sebagai Perban 1/2026), dan butir 11 monev RIPB.
Instrumen yang diperlukan kajian air tetapi tidak ada di Progsun 2026 adalah perubahan Renas PB, pedoman integrasi RTD dan SOP
tanggul ke renkon, perubahan Perban 5/2018 (pedoman keadaan tertentu yang sudah berlaku) untuk menyesuaikan unsur baru Perpres
46/2026, perubahan Renstra untuk target peringatan dini, dan syarat manfaat-biaya Dana Bersama. Sambungan peringatan dini per WS
tidak memerlukan rancangan peraturan: cukup kerja sama menurut Perban 2/2024 Pasal 8. Rancangan di luar Progsun dapat
diprakarsai dalam 2026 lewat izin prakarsa Kepala BNPB (Perka 6/2014 Pasal 8 ayat (2)), atau dimasukkan ke Progsun 2027.

### Temuan bersumber

- **T4.1 Progsun 2026.** Kepka BNPB 327/2025 ditetapkan 31 Desember 2025; Lampiran memuat 11 rancangan Perban (Diktum KESATU);
  berlaku 1 tahun (KEDUA); Kepala Biro Hukum, Organisasi, dan Kerja Sama melaporkan realisasi tiap triwulan kepada Kepala melalui
  Sekretaris Utama (KETIGA). Rancangan dan pemrakarsa: (1) perubahan kedua Perka 1/2016 tunjangan kinerja, Biro SDM dan Umum; (2)
  perubahan Perka 13/2014 pengarusutamaan gender, Biro Perencanaan; (3) **analisis risiko bencana pada kegiatan pembangunan berisiko
  tinggi bencana, Deputi Bidang Sistem dan Strategi, Direktorat Pemetaan dan Evaluasi Risiko Bencana**; (4) perubahan "Peraturan
  BNPB Nomor 5 Tahun 2024 tentang Perencanaan Rehabilitasi dan Rekonstruksi Pascabencana", Deputi Bidang RR, Direktorat Perencanaan
  RR; (5) perubahan Perban 6/2017 penyelenggaraan RR, Deputi Bidang RR; (6) perubahan Perban 4/2018 sistem manajemen logistik dan
  peralatan, Deputi Bidang Logistik dan Peralatan; (7) perubahan Perka 6/2014 pembentukan produk hukum, Biro Hukum; (8) perubahan
  Perban 1/2021 uraian fungsi organisasi, Biro Hukum; (9) **penelaahan, verifikasi, dan evaluasi permohonan Dana Bersama, Biro
  Hukum**; (10) perubahan Perban 1/2021 klasifikasi arsip, Biro SDM dan Umum; (11) **monitoring dan evaluasi RIPB "Tahun 2020-2045",
  Deputi Bidang Sistem dan Strategi, Direktorat Pengembangan Strategi PB**. Sumber: korpus
  `keputusan-kepala-nomor-327-tahun-2025.json` hlm. 2–5 [`bnpb-2025-progsun`]; kunci lama `progsun.2026.jumlah_rancangan`. Label:
  resmi.
- **T4.2 Butir 9 sudah terbit.** Perban BNPB 1/2026 tentang Pelaksanaan Penelaahan, Verifikasi, dan Evaluasi terhadap Penyaluran
  Dana Bersama PB ditetapkan 10 Maret 2026, berdasarkan Pasal 8 Perpres 75/2021 (konsiderans huruf d) dan mencabut Perban 1/2024
  (Pasal 34). Sumber: korpus `perban-nomor-1-tahun-2026.json` hlm. 1, 12–13; indeks JDIH (status Berlaku). Label: resmi;
  kesamaannya dengan butir 9 disimpulkan dari judul dan pokok materi.
- **T4.3 Dasar butir 3.** "Setiap kegiatan pembangunan yang mempunyai risiko tinggi yang menimbulkan bencana dilengkapi dengan
  analisis risiko bencana" (UU 24/2007 Pasal 40 ayat (3)); persyaratannya disusun dan ditetapkan BNPB (Pasal 41 ayat (1)); kelalaian
  yang mengakibatkan bencana dipidana (Pasal 75); Penjelasan Pasal 40 ayat (3) memberi contoh "pengeboran minyak bumi, pembuatan
  senjata nuklir, pembuangan limbah, eksplorasi tambang, dan pembabatan hutan". PP 21/2008: persyaratan analisis risiko ditetapkan
  Kepala BNPB dengan melibatkan instansi terkait dan dipakai sebagai dasar AMDAL, tata ruang, serta pencegahan dan mitigasi (Pasal 11);
  dokumen disahkan pejabat dan dipantau BNPB atau BPBD (Pasal 12). Instrumen yang berlaku: Perka BNPB 5/2008 tentang Pedoman
  Persyaratan Analisis Risiko Bencana bagi Pembangunan Berisiko Tinggi (indeks JDIH: Berlaku; teks tidak ada di korpus). Renas Sasaran
  2 memuat substansi utama "Persyaratan analisis risiko bencana" (hlm. 119). Sumber: `uu-24-2007.json.gz` hlm. 20, 30, 47
  [`ri-2007-uu24`]; PP 21/2008 dari https://peraturan.bpk.go.id/Details/4833/pp-no-21-tahun-2008, PDF /Download/36842 (diunduh dan
  dibaca 24 Okt 2026; SHA-1 `a694f380a0ea...`; hlm. cetak 8–9) [`ri-2008-pp21`]; `data/raw/hukum/indeks.json` [`bnpb-2008-perka5`];
  korpus Renas hlm. 119 [`bnpb-2025-renas`]. Label: resmi (Perka 5/2008: metadata saja).
- **T4.4 Instrumen yang tidak ada di Progsun 2026:** perubahan Perban 1/2025 (Renas) (bab-01 T4.6; bab-10 T2.8); perubahan Perban
  5/2018 untuk menyesuaikan unsur baru Perpres 46/2026 (faktor sosial, huruf c pascakonflik, penghubung "dan/atau"); pedomannya
  sendiri sudah berlaku sejak 2018 dan sudah memuat kekeringan serta gangguan fungsi pelayanan umum, sedangkan Perpres 46/2026
  terbit 16 Juli 2026, sesudah Progsun ditetapkan (T3.4); perubahan Perban 1/2026 untuk syarat manfaat-biaya (Perban baru terbit
  Maret 2026); pedoman integrasi RTD dan SOP kegagalan tanggul ke renkon; perubahan Renstra BNPB (Perban 5/2025). Sambungan
  peringatan dini per WS tidak tercantum dan tidak perlu tercantum, karena berupa kerja sama menurut Perban 2/2024 Pasal 8, bukan
  rancangan peraturan (T1.9). Sumber: T4.1 dicocokkan dengan T3.4 dan bab-08, bab-10. Label: resmi (isi Progsun); daftar kebutuhan
  adalah pemetaan penyusun.
- **T4.5 Instrumen dalam Renas yang pemimpinnya bukan BNPB (semuanya target 2029, bukan instrumen terbit):** NSPK mitigasi dan
  adaptasi subsiden 5 dokumen, baseline "-" (2.4.4.a, PJ KLH; BNPB kontributor, T1.7); peraturan perluasan skema pembiayaan BMN dan
  BMD, baseline 1 rekomendasi kebijakan, target 1 peraturan (4.6.3.a, PJ Kemenkeu, BNPB, Kemendagri; bagian BMN sudah diatur PMK
  43/2025, T3.19); rekomendasi dan NSPK tata kelola penyaluran Dana Bersama, baseline 2, target 7 (4.6.2.c, PJ Kemenkeu, BNPB).
  Sumber: korpus Renas hlm. 86, 111–112. Label: resmi.
- **T4.6 Perubahan Renstra** mengikuti Perpres 80/2025 (Pertemuan Dua Pihak; persetujuan Kementerian Perencanaan; evaluasi tahun ke-3
  2027) (bab-10 T2.3, kunci lama `perpres80.renstra.evaluasi_tahun_ke`, `renstra.evaluasi_tahun_ke3.tahun`). Label: resmi.
- **T4.7 Perpres status dan tingkatan bencana belum terbit** (penelusuran JDIH BPK; tulisan hukum BPK Perwakilan Jawa Barat, 3
  Februari 2025; riset E14); Penjelasan PP 21/2008 Pasal 21 ayat (1) huruf b memasukkan penentuan tingkatan bencana ke penentuan
  status (riset E11d). Label: resmi. Butir ini milik Kajian 2 Bab 12; untuk Kajian 1 cukup rujukan silang (status kekeringan).
- **T4.8 Kolom tabel silang lima dokumen** (prinsip 13): RIPB fokus capaian 2025–2029 nomor 1 "Terwujudnya peraturan
  perundang-undangan yang harmonis di bidang penanggulangan bencana" (dikutip Renas hlm. 94), nomor 4 investasi memadai dalam PRB
  (hlm. 74), nomor 5 tata kelola risiko yang sinergis pusat dan daerah (hlm. 101); Renstra IKP program P1 Deputi Bidang Sistem dan
  Strategi "Persentase rekomendasi kebijakan sistem dan strategi yang di integrasikan oleh K/L/D ke dalam rencana
  pembangunan/sektoral": baseline 82,35%, 2027 94,12%, 2029 100% (Renstra hlm. 130, 132–133); RPJMN indikator PP 08.04 dan KP
  08.04.01–05 (riset E11b; bab-08). Sumber: `program-terbukti/ripb_2020_2044.csv`, `renstra_bnpb_2025_2029.csv`
  [`bnpb-2025-renas`, `bnpb-2025-renstra`, `ri-2025-perpres12-rpjmn`]; kunci baru `renstra.ikp_p1_rekomendasi.*`. Label: resmi.
- **T4.9 Ketidakselarasan dokumen BNPB yang ditemukan saat pemeriksaan** (untuk Lampiran J, suara BNPB, tidak di badan teks dan
  tidak di RE): (a) Progsun butir 4 menulis "Peraturan BNPB Nomor 5 Tahun 2024 tentang Perencanaan Rehabilitasi dan Rekonstruksi
  Pascabencana", sedangkan indeks JDIH mencatat Perban 5/2024 sebagai Kamus Kompetensi Teknis dan Perban 5/2017 sebagai Penyusunan
  Rencana RR Pascabencana; (b) pemrakarsa butir 4, Direktorat Perencanaan RR, sudah diganti Perban 11/2025 (30 Desember 2025, sehari
  sebelum Progsun ditetapkan; `organisasi_bnpb.csv` status "diganti Perban 11/2025"); (c) butir 11 menulis RIPB "2020-2045" lawan
  2020–2044 (bab-01 T4.6); (d) Juklak 2/2026 merujuk Perban 1/2024 yang sudah dicabut (T3.10). Sumber: T4.1;
  `data/raw/hukum/indeks.json` [`bnpb-2017-r3p`, `bnpb-2024-kamus-kompetensi`]. Label: resmi; penilaian ketidakselarasan oleh penyusun.
- **T4.10 Jalur pembentukan Perban di dalam dan di luar program (Perka BNPB 6/2014).** Perka BNPB 6/2014 tentang Pembentukan
  Produk Hukum di Lingkungan BNPB (ditetapkan 1 April 2014, diundangkan 24 April 2014, BN 2014/557; status BERLAKU menurut indeks
  JDIH) menjadi dasar Mengingat angka 4 Kepka 327/2025 dan sedang diubah (Progsun 2026 butir 7). Perencanaan peraturan Kepala BNPB
  dilaksanakan dalam Proleg PB yang disusun Tim Penyusun, ditetapkan dengan SK Kepala, berdasarkan skala prioritas untuk 1 tahun,
  dan wajib memuat analisis pengurangan risiko bencana, gender, dan disabilitas (Pasal 4); daftar rancangan didasarkan atas
  "a. perintah peraturan perundang-undangan yang lebih tinggi", Renstra, Renja tahunan, pelaksanaan kewenangan PB, dan aspirasi
  masyarakat (Pasal 5); penyusunan diprakarsai unit eselon I (Pasal 6, memakai nama unit OTK 2014) lewat Tim Teknis dan Panitia
  antar Kedeputian (Pasal 7); Tim Teknis menyusun rancangan berdasarkan Proleg PB (Pasal 8 ayat (1)) dan dapat menyusun rancangan
  "di luar Proleg PB, setelah terlebih dahulu mengajukan permohonan izin prakarsa kepada Kepala BNPB" (ayat (2)), diawali kajian
  materi (ayat (3)–(4)); kebijakan yang menetapkan dan tidak mengatur dapat berbentuk Keputusan Kepala, Sekretaris Utama, Deputi,
  atau Inspektur Utama (Pasal 16). Teks tidak memuat tenggat usulan Proleg PB maupun tata cara perubahan Proleg di tengah tahun;
  rincian teknis diserahkan ke Petunjuk Pelaksanaan (Pasal 3 ayat (2), Pasal 7 ayat (4)). Sumber: korpus
  `perka-nomor-6-tahun-2014.json` hlm. 3–8 (mutu 1,0); `keputusan-kepala-nomor-327-tahun-2025.json` hlm. 2;
  `data/raw/hukum/indeks.json` [`bnpb-2014-produkhukum`, `bnpb-2025-progsun`]. Label: resmi; penyamaan "Proleg PB" (Perka 6/2014)
  dengan "Program Penyusunan Peraturan BNPB" (Kepka 327/2025) adalah pemetaan penyusun, didukung rujukan Mengingat Kepka itu.

### Inferensi

- **I4.1 [Inferensi tim] Draf Tabel 9.3 instrumen hukum (B5.20) dengan tabel silang lima dokumen.** Pemrakarsa memakai unit OTK
  berlaku; status P7 = Sudah ada / Sudah ada, perlu dikembangkan / Usulan baru, ditambah **Direncanakan (Renas/Progsun), belum
  terbit** untuk instrumen yang baru berupa target atau rancangan. "Sudah ada" hanya untuk instrumen yang teksnya terbit dan dibuka.

  | No | Instrumen | Peraturan diubah atau dibentuk; pemrakarsa | RIPB | Renas | Renstra | RPJMN | Progsun 2026 | Status P7 | Register |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | 1 | Perubahan Renas memuat irisan Jawa dan aksi air | Perban 1/2025; Direktorat Pengembangan Strategi PB, Biro Hukum | Perpres 87/2020 Pasal 7 (peninjauan); strategi 4c | Pasal 7; §4.6 (berkala ≤ 2027, bencana ≤ 2028) | IKP P1 | PP 08.04 (konteks) | Tidak ada | Usulan baru | R-A05, R-A21 |
  | 2 | Persyaratan analisis risiko bencana untuk pembangunan berisiko tinggi (bendungan, tanggul laut, pengambilan air tanah sebagai calon objek) | Perban baru menyempurnakan Perka 5/2008; Direktorat Pemetaan dan Evaluasi Risiko Bencana | fokus capaian 1 | Sasaran 2 substansi "Persyaratan analisis risiko bencana" | SK Direktorat Pemetaan dan Evaluasi Risiko | KP 08.04.05 (PU, konteks) | **Butir 3** | Sudah ada, perlu dikembangkan | keduanya |
  | 3 | Penelaahan Dana Bersama | Perban 1/2026 (terbit); Biro Hukum | strategi 3c; fokus capaian 4 | 4.6.2 | – | – | **Butir 9, terealisasi** | Sudah ada | – |
  | 4 | Syarat manfaat-biaya Dana Bersama prabencana | Perubahan Perban 1/2026 atau ketentuan Kepala BNPB Pasal 26; Direktorat Pengembangan Strategi PB | strategi 3c | 4.6.2.c | – | – | Tidak ada | Usulan baru | keduanya |
  | 5 | Monev RIPB sebagai wadah pelaporan irisan Jawa | Perban baru; Direktorat Pengembangan Strategi PB | Perpres 87/2020 Pasal 6 | Pasal 7 ayat (3) | IKP P1 | – | **Butir 11** | Direncanakan (Progsun 2026 butir 11), belum terbit | R-A21 |
  | 6 | Pedoman integrasi RTD bendungan dan SOP kegagalan tanggul/polder ke renkon | Juklak di bawah Perban 2/2023; Direktorat Kesiapsiagaan | fokus capaian 5 | tidak ditemukan pada baris yang dibaca | IKK rencana aksi kesiapsiagaan (bab-08) | – | Tidak ada | Sudah ada, perlu dikembangkan (PP 37/2010, PP 30/2024, Perban 2/2023 sudah ada) | R-A07, R-A13 |
  | 7 | Sambungan sistem peringatan dini per WS ke platform BNPB | Kerja sama BNPB dengan Kementerian PU menurut Perban 2/2024 Pasal 8 (tanpa perubahan Perban); Direktorat Peringatan Dini dan Pusdatinkom (kelompok kerja konektivitas, Pasal 10) | strategi peringatan dini terpadu (Renas hlm. 14) | masalah pokok "regulasi peringatan dini ... multi ancaman" (hlm. 26); 1.1.2.a | IKP cakupan peringatan dini | KP 08.04.02 | Tidak perlu (bukan rancangan peraturan) | Sudah ada, perlu dikembangkan (Perban 2/2024 Pasal 6–8) | R-A06 |
  | 8 | Pedoman keadaan tertentu (Perban 5/2018) disesuaikan dengan Perpres 46/2026; kekeringan dan gangguan pelayanan umum sudah tercakup | Perubahan Perban 5/2018 (melaksanakan Perpres 17/2018 jo. 46/2026 Pasal 3 ayat (4)); Deputi Bidang Penanganan Darurat | – | – | – | KP 08.04.02 (status darurat sesuai standar) | Tidak ada (Perpres 46/2026 terbit sesudahnya) | Sudah ada, perlu dikembangkan (Perban 5/2018 berlaku) | keduanya |
  | 9 | Perubahan IKP peringatan dini Renstra | Perban 5/2025 lewat Perpres 80/2025; Biro Perencanaan | – | 1.c | IKP cakupan peringatan dini | KP 08.04.02 | Tidak ada | Usulan baru | R-A10 |
  | 10 | NSPK mitigasi dan adaptasi penurunan muka tanah | Instrumen KLH; BNPB kontributor | fokus capaian 9 (pesisir) | 2.4.4.a | – | Lampiran I hlm. 29 (penurunan tanah) | Bukan Progsun BNPB | Direncanakan (Renas 2.4.4.a: baseline "-", target 5 dokumen 2029), belum terbit | R-A12 |
  | 11 | Peraturan perluasan skema pembiayaan BMN dan BMD | Instrumen Kemenkeu bersama BNPB, Kemendagri | strategi 3b | 4.6.3.a | – | – | Bukan Progsun BNPB | BMN: Sudah ada (PMK 43/2025, T3.19). BMD: Direncanakan (Renas 4.6.3.a: baseline 1 rekomendasi kebijakan, target 1 peraturan 2029), belum terbit | – |

- **I4.2 [Inferensi tim] Dua jalur waktu.** (a) **Dalam 2026, di luar Progsun:** Tim Teknis pemrakarsa dapat menyusun rancangan
  di luar Proleg PB setelah mengajukan izin prakarsa kepada Kepala BNPB (Perka 6/2014 Pasal 8 ayat (2); T4.10), sehingga
  instrumen tidak harus menunggu Progsun berikutnya. Perubahan Perban 5/2018 punya dasar daftar menurut Pasal 5 huruf a (perintah
  Perpres 17/2018 jo. 46/2026 Pasal 3 ayat (4) yang kondisinya berubah). (b) **Progsun 2027:** Progsun berlaku satu tahun dan
  Progsun 2026 ditetapkan 31 Desember 2025 (T4.1); bila pola tanggal berulang, Progsun 2027 ditetapkan sekitar akhir 2026.
  Instrumen nomor 1, 4, 6, 8, dan 9 dapat menempuh salah satu jalur; nomor 7 berupa kerja sama, bukan rancangan peraturan. Tenggat
  usulan Progsun tidak diatur di teks Perka 6/2014, dan Perka itu sendiri sedang diubah (Progsun butir 7).
- **I4.3 [Inferensi tim] Butir 3 adalah titik masuk tercepat untuk risiko tanggul laut dan bendungan.** Penjelasan UU 24/2007 Pasal
  40 ayat (3) tidak mencontohkan bendungan atau tanggul laut, tetapi daftarnya "antara lain" (T4.3). Rancangan butir 3 yang sedang
  disusun dapat menegaskan apakah bendungan PSN dan Tanggul Laut Pantura termasuk "pembangunan berisiko tinggi"; keputusan itu milik
  pemrakarsa, bukan kajian.
- **I4.4 [Inferensi tim] Prioritas instrumen untuk musim hujan 2026/2027** adalah yang tidak memerlukan Perban baru: surat Kepala
  BNPB untuk reviu renkon (R-A02) dan permintaan daftar RTD (R-A07) bersandar pada Perban 2/2023 dan PP 37/2010 yang berlaku.
  Instrumen nomor 7 cukup kerja sama menurut Perban 2/2024 Pasal 8 dan dapat dimulai segera; nomor 6 dan 8 diprakarsai dalam 2026
  lewat izin prakarsa Kepala atau masuk Progsun 2027 (I4.2). Selama perubahan Perban 5/2018 belum terbit, keadaan tertentu untuk
  kekeringan tetap dapat ditempuh dengan Perban 5/2018 yang berlaku (T3.4).

### Celah

- Petunjuk Pelaksanaan Perka 6/2014 (Pasal 3 ayat (2), Pasal 7 ayat (4)) dan rancangan perubahan Perka itu (Progsun butir 7) tidak
  dibuka; tenggat usulan Progsun 2027 dan praktik izin prakarsa di luar Proleg PB tidak diketahui. **Permintaan:** Biro Hukum,
  Organisasi, dan Kerja Sama.
- Teks Perka BNPB 5/2008 tidak ada di korpus; kemajuan rancangan butir 3, 9, dan 11 dan laporan realisasi triwulanan Progsun tidak
  ditemukan. **Permintaan:** Biro Hukum, Organisasi, dan Kerja Sama.
- Baris Renas untuk integrasi RTD bendungan dengan renkon tidak ditemukan pada halaman yang dibaca; kolom Renas instrumen nomor 6
  ditulis "tidak ditemukan pada baris yang dibaca".

---

## Bahan subbab 9.6, 9.7, 9.8 (konteks, bukan pertanyaan kunci)

### Inti

Peta jalan punya jangkar waktu bersumber: pemantauan Renas triwulan IV 2026 untuk Renja K/L 2027, forum K/L penanggung jawab dan
evaluasi tahunan 2026 paling lambat triwulan II 2027, evaluasi paruh waktu dan batas perubahan berkala Renas 2027, evaluasi Renstra
tahun ke-3 2027, usulan Dana Bersama pemda untuk TA 2027, batas perubahan Renas karena bencana 2028, dan target 2029. Indikator
kinerja bab ini menambah indikator tata kelola dan pembiayaan pada indikator Bab 8. Pelaporan berjalan dalam tiga lapis yang semuanya
sudah diwajibkan peraturan: internal BNPB, lintas K/L lewat Kemenko PMK dan siklus Renas, dan daerah lewat renkon, Dana Bersama, DSP,
dan Satu Data Bencana.

### Temuan bersumber

**9.6 Peta jalan**

- **T5.1 Siklus Renas:** pemantauan pra-pelaksanaan triwulan IV tahun T-1 meninjau Renja K/L penanggung jawab; forum koordinasi K/L
  penanggung jawab paling lambat triwulan II tahun berjalan; evaluasi tahunan paling lambat minggu terakhir triwulan II tahun T+1;
  evaluasi paruh waktu di tahun ketiga; evaluasi akhir sesudah tahun ke-5; perubahan berdasarkan peninjauan berkala maksimal tahun
  ketiga dan karena bencana maksimal tahun keempat; rekomendasi peninjauan "harus termuat dalam hasil pemantauan dan evaluasi tahunan
  atau evaluasi paruh waktu". Sumber: korpus Renas hlm. 122–125 [`bnpb-2025-renas`]; bab-01 T4.2–T4.3; kunci lama
  `renas.perubahan_berkala.tahun_maks`, `renas.perubahan_bencana.tahun_maks` (bab-10). Label: resmi.
- **T5.2 Dasar peninjauan dua tahunan di tingkat PP:** rencana PB ditetapkan untuk 5 tahun dan "ditinjau secara berkala setiap 2 (dua)
  tahun atau sewaktu-waktu apabila terjadi bencana" (PP 21/2008 Pasal 6 ayat (5)–(6)); penyusunannya dikoordinasikan BNPB di tingkat
  nasional (ayat (4)). Sumber: PP 21/2008 hlm. cetak 5–6 [`ri-2008-pp21`]. Label: resmi.
- **T5.3 Jangkar lain:** RIPB ditinjau tiap 5 tahun atau sewaktu-waktu (Perpres 87/2020 Pasal 7; riset E11a); Progsun berlaku 1 tahun
  (Kepka 327/2025 Diktum KEDUA); pemda menyiapkan usulan Dana Bersama untuk TA 2027 (BKF, T3.11); tim penelaahan Dana Bersama masa
  kerja 2 tahun (Perban 1/2026 Pasal 28 ayat (3)); renkon berlaku 3 tahun dan direviu paling sedikit 6 bulan sekali (Perban 2/2023
  Pasal 21; kunci lama `perban2023.renkon.*`); penilaian ketangguhan Destana paling sedikit tiap 3 tahun (Perban 7/2025 Pasal 14 ayat
  (5); kunci lama `perban2025_7.destana.penilaian_tahun`); awal musim hujan November (sebagian Jawa) dan Desember 2026 (sebagian besar
  Jawa), puncak Januari dan Februari 2027 (bab-01, bab-08; kunci lama `bmkg.musim_2026.*`); evaluasi Renstra tahun ke-3 = 2027
  (bab-10). Label: resmi.
- **T5.4 Horizon dan keputusan 14 hari** ditetapkan KERANGKA §2 butir 11 dan §6 (hari ke-0 = tanggal penetapan Kepala BNPB; 14 hari;
  100 hari; 2026–2027; 2028–2030; enam keputusan 14 hari pertama). Label: asumsi-kebijakan (rancangan kajian).

**9.7 Indikator kinerja**

- **T5.5 Indikator hasil dan cakupan yang sudah terdaftar** (bab-08 Tabel 8.1; tidak diulang angkanya di sini): Renas 1.a dan 1.b
  irisan Jawa (kunci `airjawa.renas1a.*`, `airjawa.renas1b.*`), Renas 1.c nasional (`renas.indikator_1c.*`), RPJMN KP 08.04.02,
  08.04.04 (`rpjmn.kp0804*`), Renas 4.5.1.a, 1.1.2.a, 1.2.1.c, 2.5.1.c, 1.2.1.h. Label: resmi (irisan Jawa: olah DIBI).
- **T5.6 Indikator tata kelola dan pembiayaan:** Renstra IKP P1 rekomendasi kebijakan sistem dan strategi yang diintegrasikan K/L/D:
  82,35% (baseline) ke 100% (2029) (T4.8); Renstra sasaran kegiatan "Persentase Daerah yang mendapatkan rekomendasi bantuan pendanaan
  pascabencana" 50% (2025) ke 70% (2029), unit Renstra Direktorat Perencanaan RR yang sudah diganti Perban 11/2025 (Renstra hlm.
  136–137); Renas 4.6.2.a, 4.6.2.b, 4.6.3.a, 4.6.3.b (T3.14). Sumber: `renstra_bnpb_2025_2029.csv` [`bnpb-2025-renstra`]; korpus
  Renas hlm. 111–112. Kunci baru `renstra.ikk_rekomendasi_pendanaan_pasca.*`. Label: resmi; padanan unit OTK berlaku untuk sasaran
  kegiatan Deputi Bidang RR adalah penilaian penyusun.

**9.8 Pemantauan dan pelaporan**

- **T5.7 Lapis internal BNPB:** Kepala melapor kepada Presiden sebulan sekali dalam kondisi normal dan setiap saat dalam darurat
  (Perpres 1/2019 Pasal 3 huruf d); Unsur Pengarah berfungsi pemantauan dan evaluasi (Perban 6/2025 Pasal 8); Biro Perencanaan
  menyusun pemantauan, evaluasi, dan laporan BNPB (Pasal 24–25); Direktorat Pengembangan Strategi PB memantau dan melaporkan lingkup
  tata kelola PB (Pasal 50–51); Biro Hukum melaporkan realisasi Progsun tiap triwulan (Kepka 327/2025 Diktum KETIGA). Label: resmi.
- **T5.8 Lapis lintas K/L:** pemantauan RIPB satu kali setahun dilaporkan ke Presiden melalui menko PMK (Perpres 87/2020 Pasal 6;
  riset E11a); monev Renas tahunan, paruh waktu, akhir (T5.1) menjadi bagian monev RIPB (Renas Pasal 7 ayat (3)); BNPB memantau dan
  mengevaluasi kegiatan Dana Bersama dengan melibatkan K/L pembina teknis (Perban 1/2026 Pasal 29–31) dan Renas 4.6.2.b menargetkan 5
  laporan monev; Kepala BOP Pantura Jawa melapor kepada Presiden dan Dewan Pengarah (Perpres 77/2025 Pasal 35); TKPSDA WS memantau dan
  mengevaluasi program PSDA per WS (Permen PU 2/2024 Pasal 12 huruf c). Label: resmi.
- **T5.9 Lapis daerah dan data:** pemohon Dana Bersama menyampaikan laporan kemajuan dan laporan akhir paling lama 60 hari kepada BNPB
  dan Kemenkeu (Perban 1/2026 Pasal 32); laporan perkembangan DSP tiap tanggal 5 dan pertanggungjawaban 3 bulan setelah status
  berakhir (Perban 4/2020 Pasal 21); laporan pertanggungjawaban tanggap darurat 3 bulan (PP 22/2008 Pasal 34 ayat (2)); renkon direviu
  6 bulanan (Perban 2/2023 Pasal 21); evaluasi Destana minimal setahun sekali dilaporkan ke Kepala BNPB (Perban 7/2025 Pasal 19;
  bab-08 T5.2). Walidata Bencana adalah unit BNPB yang mengumpulkan, memeriksa, mengelola, dan menyebarluaskan data dari produsen
  (Perban 1/2023 Pasal 1 angka 5, Pasal 7); hasil analisis data disampaikan ke Walidata (Pasal 27 ayat (2)); penyebarluasan lewat
  portal Satu Data Bencana dan Satu Data Indonesia (Pasal 28). Label: resmi; pemetaan Walidata ke Pusdatinkom adalah pemetaan
  penyusun (Pasal 7 menyebut fungsi unit, bukan nama).

### Inferensi

- **I5.1 [Inferensi tim] Draf Tabel 9.4 peta jalan per horizon (B5.13 kolom WAKTU, G23).**

  | Horizon | Jangkar bersumber | Baris register (bab-10) | Instrumen atau forum |
  | --- | --- | --- | --- |
  | Hari ke-0 | Penetapan Kepala BNPB; bila KD-1 (a), November 2026 | R-A01 | Keputusan Kepala |
  | 14 hari | Pemantauan pra-pelaksanaan Renas triwulan IV 2026 (Renja K/L 2027); awal musim hujan November–Desember 2026 | R-A01 sampai R-A05 | Surat Kepala; rakor Kemenko PMK |
  | 100 hari | Puncak musim hujan Jawa Januari–Februari 2027; pemda menyiapkan usulan Dana Bersama TA 2027 | R-A06 sampai R-A09 | Perban 2/2023, 2/2024; Dewan SDA Nasional; TKPSDA WS; Dana Bersama |
  | 2026–2027 | Forum K/L penanggung jawab dan evaluasi tahunan 2026 paling lambat triwulan II 2027; evaluasi paruh waktu dan batas perubahan berkala Renas 2027; evaluasi Renstra tahun ke-3 2027; Progsun 2027 | R-A10 sampai R-A17 | Perubahan Renas (Tabel 9.3 no. 1); Perpres 80/2025; izin prakarsa Kepala 2026 atau Progsun 2027 (no. 4, 6, 8, 9) |
  | 2028–2030 | Batas perubahan Renas karena bencana 2028; target 2029 Renas, Renstra, RPJMN; penilaian Destana paling lambat 3 tahun (2030); evaluasi akhir Renas | R-A18 sampai R-A21 | Monev RIPB (Progsun butir 11); laporan tahunan |

- **I5.2 [Inferensi tim] Draf Tabel 9.5 indikator (B5.19, G22):** baris hasil dari bab-08 Tabel 8.1 tetap; ditambah baris tata kelola
  dan pembiayaan: Renstra IKP P1 (82,35% ke 100%; sebagai ukuran adopsi rekomendasi kajian); Renas 4.6.2.a (100 penerima Dana Bersama
  pada 2029; irisan Jawa tidak tersedia); Renas 4.6.3.b (546 daerah transfer risiko); jumlah kab/kota daftar perhatian yang mengajukan
  permohonan Dana Bersama prabencana TA 2027 (baseline dibentuk; data BNPB); jumlah TKPSDA WS pusat di Jawa yang memuat BPBD (baseline
  dibentuk 2027; data Ditjen SDA). Dua baris terakhir adalah usulan penyusun berlabel asumsi-kebijakan.
- **I5.3 [Inferensi tim] Draf Gambar 9.3 tata kelola dan pelaporan tiga lapis (B5.23):** lapis 1 internal (unit pelaksana ke Biro
  Perencanaan dan Direktorat Pengembangan Strategi PB, ke Kepala, ke Presiden bulanan; Unsur Pengarah memantau); lapis 2 lintas K/L
  (monev Renas dan RIPB lewat Kemenko PMK ke Presiden; forum air Dewan SDA Nasional dan TKPSDA WS; Dewan Pengarah BOP); lapis 3 daerah
  dan data (BPBD lewat renkon, DSP, Dana Bersama; semua data, termasuk Data Pembiayaan PB, masuk Walidata dan portal Satu Data
  Bencana). Keluaran platform Pantau Bencana tetap bukan Data Bencana (prinsip 19).
- **I5.4 [Inferensi tim]** Tidak perlu laporan khusus kajian: irisan Jawa Renas 1.a dan 1.b (R-A21) cukup menjadi lampiran laporan
  monev Renas tahunan, sehingga tidak ada beban pelaporan baru bagi daerah.

### Celah

- Laporan monev Renas tahunan 2025 dan laporan pemantauan RIPB tidak ditemukan; tidak diketahui apakah indikator irisan pulau pernah
  dilaporkan. **Permintaan:** Direktorat Pengembangan Strategi PB, Biro Perencanaan.
- Jadwal RKP 2027 dan tahapan Renja K/L 2027 tidak dibuka; jangkar "Renja 2027" bersandar pada Renas §4.5 saja.
- Metode pengukuran IKP P1 Renstra (pembilang dan penyebut) tidak dibaca; indikator dipakai sebagai acuan arah, bukan alat ukur
  kajian.
- Data realisasi Data Pembiayaan PB (Perban 1/2023 Pasal 5 ayat (4)) tidak ditemukan di portal yang diperiksa.

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Tabel 9.1 Matriks mandat tertulis | Lembaga × komponen air × fase dengan kode K/P/R/I dan pasal; tiga keadaan sel (tertulis; tertulis, pelaku dipetakan; kosong) | `lembaga/matriks_air.csv`, `lembaga/peran.csv`; P1 T1.1–T1.6, I1.1–I1.2 | B5.7, G16 | Sel pelaku dipetakan bertanda inferensi; sel NCICD bertanda "dinyatakan instansi (bukan norma)"; hitungan dari kunci `lembaga.peran.*`, `lembaga.air.*`, dan `lembaga.matriks_air.tertulis_norma` (23 disandingkan dengan 21); slide E3 ≤ 12 baris |
| Tabel 9.2 Usulan penugasan | Enam peran usulan, dasar yang sudah ada, instrumen penetapan, status P7, ID register | P1 I1.3; P2 T2.4–T2.5, I2.4; P3 T3.4 | B5.7 | Kontributor 2.4.4.a tidak di tabel ini (sudah tertulis); dua peran berstatus Usulan baru, empat Sudah ada, perlu dikembangkan |
| Gambar 9.1 Forum koordinasi dan aliran rekomendasi | Kepala BNPB dan Unsur Pengarah di pusat; rakor Kemenko PMK, Dewan SDA Nasional, TKPSDA WS, Dewan Pengarah BOP, Kemenko IPK, Pangan, Perekonomian, Pertemuan Dua Pihak, forum Renas; panah berlabel ID register | P2 T2.1–T2.9, I2.1 | B5.23, G21 | Diagram aliran berikon tanpa lebar sebanding; jabatan ketua Dewan SDA sesuai teks dengan catatan |
| Gambar 9.2 Lapisan pembiayaan | Lima baris fase × lapisan, pengguna, contoh pemakaian untuk komponen air; tanpa nominal | P3 T3.1–T3.18, I3.1 | B5.21, G21 | Tanpa angka rupiah (P5); pil "Sudah ada" untuk instrumen berlaku; urutan PFB BKF sebagai keterangan |
| Tabel 9.3 Instrumen hukum | 11 instrumen, pemrakarsa, lima kolom dokumen, Progsun 2026, status P7, register | P4 T4.1–T4.8, I4.1 | B5.20 | Butir 9 ditulis "terealisasi: Perban 1/2026"; status "Direncanakan, belum terbit" dibedakan dari "Sudah ada"; ketidakselarasan T4.9 hanya di Lampiran J |
| Tabel 9.4 Peta jalan | Lima horizon, jangkar bersumber, baris register, instrumen | Bahan T5.1–T5.4, I5.1 | B5.13, G23 | Kolom WAKTU berpil horizon; jangan menulis puncak Desember untuk Jawa |
| Tabel 9.5 Indikator | Baris bab-08 ditambah tata kelola dan pembiayaan | T5.5–T5.6, I5.2 | B5.19, G22 | Baris usulan penyusun berlabel Asumsi kebijakan; irisan Jawa Dana Bersama "tidak tersedia" |
| Gambar 9.3 Tata kelola dan pelaporan tiga lapis | Internal, lintas K/L, daerah dan data; frekuensi laporan berpasal | T5.7–T5.9, I5.3 | B5.23, G21 | Pernyataan produsen platform di samping lapis data |

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/air/bukti/bab-09.angka.json` dengan bentuk entri `data/angka.json` (bentuk B: `nilai` +
`pustaka`). `data/angka.json` tidak disunting. Semua entri bentuk B karena nilainya hitungan baris lintas berkas atau angka yang
tertulis di teks peraturan, bukan sel tabel paket yang dapat dibaca `ikuti()`. Angka sekunder dan nominal anggaran tidak masuk.

**Kunci lama yang dipakai ulang (tidak diubah):** `lembaga.air.baris_total`, `lembaga.air.baris_tertulis`, `lembaga.air.baris_bnpb`,
`lembaga.air.baris_bpbd`, `lembaga.celah.n_air`, `perpres53.anggota_pusat`, `renas.aksi_244a.kontributor_kl` (bab-07);
`progsun.2026.jumlah_rancangan` (bab-01); `perpres77.dewan_pengarah.kepala_daerah`, `renas.aksi_244a.target_2029` (bab-02);
`renas.aksi_251c.*`, `rpjmn.kp080405.*`, `perban2023.renkon.*`, `perban2025_7.destana.penilaian_tahun`, `perhatian.air.gabungan.n`,
`airjawa.renas1a.*`, `airjawa.renas1b.*` (bab-08); `renas.perubahan_berkala.tahun_maks`, `renas.perubahan_bencana.tahun_maks`,
`perpres80.renstra.evaluasi_tahun_ke`, `renstra.evaluasi_tahun_ke3.tahun` (bab-10); `renas.indikator_1c.*`, `bmkg.musim_2026.*`
(bab-01).

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| lembaga.peran.baris_total | 129 baris | pustaka pantaubencana-2026-paket-lembaga (olah `lembaga/peran.csv`) | resmi | olah paket lembaga; README dan KERANGKA: 127 |
| lembaga.peran.baris_tertulis | 76 baris | idem | resmi | idem; KERANGKA: 74 |
| lembaga.peran.baris_pemetaan | 53 baris | idem | resmi | idem |
| lembaga.peran.air_semua.baris | 76 baris | idem (ancaman air + `semua`) | resmi | idem |
| lembaga.peran.air_semua.tertulis | 49 baris | idem | resmi | idem |
| lembaga.peran.air_semua.lembaga | 32 lembaga | idem | resmi | idem |
| lembaga.peran.air_semua.lembaga_tertulis | 26 lembaga | idem | resmi | idem |
| lembaga.peran.air_khusus.baris | 26 baris | idem (ancaman air saja) | resmi | idem |
| lembaga.peran.air_khusus.tertulis | 8 baris | idem | resmi | idem |
| lembaga.peran.kemen_pu.baris | 10 baris | idem | resmi | idem |
| lembaga.peran.kemen_pu.tertulis | 0 baris | idem | resmi | idem; semua pelaku dipetakan |
| lembaga.peran.bnpb.baris | 13 baris | idem | resmi | idem |
| lembaga.peran.bnpb.tertulis | 11 baris | idem | resmi | idem |
| lembaga.matriks_air.kemen_pu.baris | 7 baris | pustaka pantaubencana-2026-paket-lembaga (olah `lembaga/matriks_air.csv`) | resmi | idem |
| lembaga.matriks_air.kemen_pu.tertulis | 1 baris | idem | resmi | idem (A15, bersumber norma); A28 berjenis tertulis tetapi bersumber situs Dinas SDA DKI |
| lembaga.matriks_air.tertulis_norma | 21 baris | idem | resmi | idem; 23 baris tertulis menurut paket dikurangi A28 dan A29 |
| lembaga.matriks_air.tertulis_situs_instansi | 2 baris | idem | resmi | idem (A28, A29; sid web-dsda-ncicd-2025) |
| lembaga.daftar.n | 41 lembaga | pustaka pantaubencana-2026-paket-lembaga (olah `lembaga/lembaga.csv`) | resmi | idem; README: 40 |
| perban2025_6.unsur_pengarah.anggota | 20 anggota | pustaka bnpb-2025-otk (Pasal 9) | resmi | Perban BNPB 6/2025 |
| perban2025_6.unsur_pengarah.instansi | 11 instansi | pustaka bnpb-2025-otk (Pasal 10 ayat (1)–(2)) | resmi | idem |
| perpres77.dewan_pengarah.anggota_pusat | 13 jabatan | pustaka ri-2025-perpres77 (Pasal 7 ayat (4) huruf a–m) | resmi | Perpres 77/2025 |
| permenpu2024_2.tkpsda.instansi_prov_maks | 5 instansi | pustaka kemenpu-2024-permen2 (Pasal 34 ayat (5); sama di Pasal 41 ayat (5)) | resmi | Permen PU 2/2024 |
| permenpu2024_2.tkpsda.instansi_kab_maks | 3 instansi | idem (Pasal 34 ayat (7); sama di Pasal 41 ayat (7)) | resmi | idem |
| permenpu2024_2.tkpsda.masa_kerja_tahun | 5 tahun | idem (Pasal 36 ayat (1); sama di Pasal 43 ayat (1)) | resmi | idem |
| pp22_2008.dsp.jenis_pengadaan | 8 jenis | pustaka ri-2008-pp22 (Pasal 17 ayat (2)) | resmi | PP 22/2008 |
| pp22_2008.laporan_darurat.bulan | 3 bulan | idem (Pasal 34 ayat (2)) | resmi | idem |
| perban2020_4.dsp.laporan_tanggal | tanggal 5 | pustaka bnpb-2020-dsp (Pasal 21 ayat (1)) | resmi | Perban BNPB 4/2020 |
| perban2020_4.dsp.pertanggungjawaban_bulan | 3 bulan | idem (Pasal 21 ayat (2)) | resmi | idem |
| perban2026_1.laporan_akhir.hari | 60 hari kalender | pustaka bnpb-2026-dana-bersama (Pasal 32 ayat (4)) | resmi | Perban BNPB 1/2026 |
| perban2026_1.tim.masa_kerja_tahun | 2 tahun | idem (Pasal 28 ayat (3)) | resmi | idem |
| perban2026_1.tim.rapat_bulan | 3 bulan | idem (Pasal 28 ayat (2)) | resmi | idem |
| perban2026_1.dokumen_tambahan.hari_kerja | 5 hari kerja | idem (Pasal 20 ayat (4)) | resmi | idem |
| perban2026_1.pertimbangan.hari_kerja | 10 hari kerja | idem (Pasal 23 ayat (3)) | resmi | idem |
| juklak2026_2.kegiatan.kl | 50 kegiatan | pustaka bnpb-2026-juklak2 (Lampiran I huruf A) | resmi | Juklak BNPB 2/2026 |
| juklak2026_2.kegiatan.provinsi | 44 kegiatan | idem (huruf B) | resmi | idem |
| juklak2026_2.kegiatan.kabkota | 44 kegiatan | idem (huruf C) | resmi | idem |
| juklak2026_2.kegiatan.kelompok | 10 kegiatan | idem (huruf D) | resmi | idem |
| permendes2025_16.fokus.jumlah | 8 fokus | pustaka kemendes-2025-permendes16 (Pasal 2 ayat (1) huruf a–h) | resmi | Permendes PDT 16/2025 |
| renas.aksi_462a.target_2029 | 100 K/L, daerah, kelompok | pustaka bnpb-2025-renas (hlm. 111) | resmi | Renas 4.6.2.a; OCR bertumpuk |
| renas.aksi_462b.target_2029 | 5 dokumen | pustaka bnpb-2025-renas (hlm. 112) | resmi | Renas 4.6.2.b |
| renas.aksi_463a.target_2029 | 1 peraturan | idem | resmi | Renas 4.6.3.a |
| renas.aksi_463b.target_2029 | 546 daerah | idem | resmi | Renas 4.6.3.b |
| renstra.ikp_p1_rekomendasi.baseline | 82,35% | pustaka bnpb-2025-renstra (hlm. 130, 132–133) | resmi | Renstra BNPB IKP P1 |
| renstra.ikp_p1_rekomendasi.2027 | 94,12% | idem | resmi | idem |
| renstra.ikp_p1_rekomendasi.2029 | 100% | idem | resmi | idem |
| renstra.ikk_rekomendasi_pendanaan_pasca.2025 | 50% | pustaka bnpb-2025-renstra (hlm. 136–137) | resmi | Renstra BNPB; unit OTK lama |
| renstra.ikk_rekomendasi_pendanaan_pasca.2029 | 70% | idem | resmi | idem |

**Catatan untuk penggabung:** kunci `lembaga.peran.*` dihitung dari berkas kerja yang belum ter-commit; hitung ulang saat paket
`lembaga` dikunci. Draf sel Tabel 9.1–9.4 sengaja tidak didaftarkan sampai tabel naskah dikunci.

---

## Pustaka

Entri CSL-JSON lengkap di `naskah/air/bukti/bab-09.pustaka.json` (kunci `id` dipakai kolom `pustaka` registri). Entri yang sama
dengan berkas bukti lain disalin dengan `id` yang sama dan catatan halaman Bab 9 ditambahkan. Ringkas:

| id | Sumber | Verifikasi |
| --- | --- | --- |
| ri-2007-uu24 | UU 24/2007 Penanggulangan Bencana | primer |
| ri-2008-pp21 | PP 21/2008 Penyelenggaraan PB | primer (dibuka ulang 24 Okt 2026) |
| ri-2008-pp22 | PP 22/2008 Pendanaan dan Pengelolaan Bantuan Bencana | primer (dibuka ulang 24 Okt 2026) |
| ri-2019-pp12 | PP 12/2019 Pengelolaan Keuangan Daerah | primer (baru) |
| ri-2019-perpres1 | Perpres 1/2019 BNPB | primer |
| ri-2020-perpres87 | Perpres 87/2020 RIPB 2020–2044 | primer |
| ri-2021-perpres75 | Perpres 75/2021 Dana Bersama PB | primer (dibuka ulang 24 Okt 2026) |
| ri-2022-perpres53 | Perpres 53/2022 Dewan SDA Nasional | primer |
| ri-2024-keppres18 | Keppres 18/2024 keanggotaan Dewan SDA Nasional | primer |
| ri-2024-perpres144 | Perpres 144/2024 Kemenko PMK | primer |
| ri-2025-perpres77 | Perpres 77/2025 BOP Pantura Jawa | primer |
| ri-2025-perpres80 | Perpres 80/2025 Renstra dan Renja K/L | primer |
| ri-2025-perpres12-rpjmn | Perpres 12/2025 RPJMN 2025–2029 | primer |
| ri-2018-perpres17 | Perpres 17/2018 Penyelenggaraan PB dalam Keadaan Tertentu | primer (baru untuk Bab 9; id sama dengan bab-05) |
| ri-2026-perpres46 | Perpres 46/2026 perubahan Perpres 17/2018 (keadaan tertentu) | primer |
| bnpb-2018-perban5 | Perban BNPB 5/2018 Kondisi dan Tata Cara Pelaksanaan PB dalam Keadaan Tertentu | primer (baru untuk Bab 9; id sama dengan bab-05) |
| bnpb-2014-produkhukum | Perka BNPB 6/2014 Pembentukan Produk Hukum di Lingkungan BNPB | primer (baru untuk Bab 9; id sama dengan bab-01) |
| kemenkeu-2025-pmk43 | PMK 43/2025 Pengasuransian Barang Milik Negara | primer (baru) |
| ri-2010-pp37 | PP 37/2010 Bendungan | primer |
| ri-2024-pp30 | PP 30/2024 Pengelolaan SDA | primer |
| kemenpu-2024-permen2 | Permen PU 2/2024 TKPSDA WS | primer (dibuka ulang 24 Okt 2026) |
| kemenkeu-2025-pmk28 | PMK 28/2025 Pengelolaan Dana Bersama PB | primer (baru) |
| kemenkeu-bkf-2026-pfb | BKF Kemenkeu, halaman Pooling Fund Bencana | primer (baru) |
| kemendes-2025-permendes16 | Permendes PDT 16/2025 fokus dana desa 2026 | primer (baru) |
| bnpb-2025-renas | Perban BNPB 1/2025 Renas PB 2025–2029 | primer |
| bnpb-2025-renstra | Perban BNPB 5/2025 Renstra BNPB 2025–2029 | primer |
| bnpb-2025-progsun | Kepka BNPB 327/2025 Progsun 2026 | primer |
| bnpb-2025-otk | Perban BNPB 6/2025 OTK | primer |
| bnpb-2025-otk-ubah | Perban BNPB 11/2025 Perubahan OTK | primer |
| bnpb-2026-dana-bersama | Perban BNPB 1/2026 Penelaahan Dana Bersama | primer |
| bnpb-2026-juklak2 | Juklak BNPB 2/2026 standar komponen biaya Dana Bersama prabencana | primer (baru) |
| bnpb-2020-dsp | Perban BNPB 4/2020 Penggunaan DSP | primer |
| bnpb-2023-satudata | Perban BNPB 1/2023 Satu Data Bencana | primer |
| bnpb-2023-renkon | Perban BNPB 2/2023 Rencana Kontingensi | primer |
| bnpb-2024-peringatan-dini | Perban BNPB 2/2024 Sistem Peringatan Dini | primer |
| bnpb-2025-destana | Perban BNPB 7/2025 Destana | primer |
| bnpb-2017-r3p | Perban BNPB 5/2017 Penyusunan Rencana RR | primer |
| bnpb-2008-perka5 | Perka BNPB 5/2008 persyaratan analisis risiko (metadata JDIH) | primer (metadata) |
| bnpb-2024-kamus-kompetensi | Perban BNPB 5/2024 Kamus Kompetensi Teknis (metadata JDIH; hanya Lampiran J) | primer (metadata) |
| djpk-2024-dak-irigasi | Lampiran juknis DAK Fisik Bidang Irigasi (DJPK, 2024) | primer |
| pantaubencana-2026-paket-lembaga | Paket data `lembaga` Pantau Bencana | primer (olah) |

Sumber berbeda untuk bab ini: 41 entri, 39 primer dengan teks dibuka dan 2 hanya metadata; tidak ada entri sekunder. Sembilan dibuka
ulang atau baru dibuka 24 Oktober 2026 dari peraturan.bpk.go.id, peraturan.go.id, fiskal.kemenkeu.go.id, dan jdih.kemenkeu.go.id.

---

## Catatan perbaikan menurut temuan pemeriksa (24 Oktober 2026)

Semua temuan dicek ke teks sumber sebelum diterapkan. Tidak ada temuan yang ditolak.

1. **Pedoman keadaan tertentu (kritis).** Diterima. Perpres 17/2018 hlm. 3–4 memuat Pasal 3 ayat (2) huruf b dan ayat (4)
   kata per kata; Perpres 46/2026 Pasal I hanya mengubah ayat (2). Perban 5/2018 (BERLAKU) melaksanakan Pasal 3 ayat (4) dan sudah
   memuat kekeringan (Pasal 3 ayat (2) huruf a angka 9) dan gangguan fungsi pelayanan umum (ayat (3) huruf d). Diubah: Inti P1,
   T3.4 (ditulis ulang, tiga anak butir), Tabel 9.2 baris 6, I3.2, Inti P4, T4.4, Tabel 9.3 no. 8, I4.4, tabel temuan yang
   diharapkan; pustaka `ri-2018-perpres17` dan `bnpb-2018-perban5` ditambah. Temuan tambahan saat pemeriksaan: penghubung
   antarhuruf berubah dari "dan" ke "dan/atau", sehingga syarat gabungan Perban 5/2018 Pasal 3 ayat (1) kini lebih ketat daripada
   Perpres; KERANGKA M08 dan baris instrumen Kajian 2 menulis "Usulan baru" untuk konteks pascakonflik, dan perbedaan itu ditulis
   berdampingan di T3.4.
2. **Perka 6/2014 (tinggi).** Diterima. Pasal 4–8 dibaca dari korpus (hlm. 3–6); Pasal 8 ayat (2) memuat jalur izin prakarsa di luar
   Proleg PB, dan Kepka 327/2025 merujuk Perka ini di Mengingat angka 4. Ditambah T4.10; diubah Inti P4, I4.2, I4.4, Tabel 9.4
   horizon 2026–2027; butir Celah "Perka 6/2014 tidak dibaca" diganti dengan celah Petunjuk Pelaksanaan dan tenggat usulan.
3. **Status P7 terlalu tinggi (tinggi).** Diterima. Renas hlm. 86 (2.4.4.a baseline "-") dan hlm. 112 (4.6.3.a baseline 1 rekomendasi
   kebijakan, target 1 peraturan) dibuka ulang. Status "Direncanakan (Renas/Progsun), belum terbit" ditambah ke I4.1 dan dipakai
   untuk no. 5 dan 10. Untuk no. 11, teks PMK 43/2025 dibuka (T3.19): bagian BMN sudah diatur, bagian BMD belum ditemukan, sehingga
   statusnya dipisah. T4.5 ditandai sebagai target 2029.
4. **Pemohon Dana Bersama (sedang).** Diterima. Perban 1/2026 Pasal 9 ayat (4)–(5) dan Pasal 11 ayat (2)–(3) dicek di korpus. I3.3
   diubah. I5.2 tidak menyebut BPBD sebagai pemohon, jadi tidak diubah.
5. **Peringatan dini per WS (sedang).** Diterima. Perban 2/2024 Pasal 6–10 dicek di korpus (hlm. n = 5–6). T1.9, Tabel 9.2 baris 3,
   Tabel 9.3 no. 7, Inti P1, Inti P4, T4.4 diubah. Batas yang ditambah sebagai inferensi: Pasal 6–8 menyebut K/L, sehingga sistem per
   WS yang dikelola pemda atau PJT tidak tercakup eksplisit.
6. **Baris NCICD (sedang).** Diterima. `matriks_air.csv` A28 dan A29 bersumber `web-dsda-ncicd-2025`; definisi README §1 dicek.
   Frasa "tiap baris berkutipan peraturan" dihapus dari T1.1; T1.2 diberi hitungan bernorma (21 dari 31; Kementerian PU 1; banjir
   dan rob 1) dan catatan A15; sel Tabel 9.1 diberi tanda; kunci `lembaga.matriks_air.kemen_pu.tertulis` dikoreksi ke 1 dan dua
   kunci baru ditambah. Kunci lama `lembaga.air.baris_tertulis` (23, milik bab-07) tidak diubah dan wajib disandingkan.
7. **Klaster Pemulihan (sedang).** Diterima. `klaster.csv` memuat Klaster Pemulihan (Kemendagri) versi 308/2024. T1.12 dan I1.5
   ditulis ulang sebagai "tidak disebut eksplisit"; permintaan teks SK 308/2024 masuk Celah P1.
8. **Kursi BPBD di TKPSDA WS (sedang).** Diterima. Permen PU 2/2024 Pasal 33–36, 40–43, dan 95 dibaca dari PDF yang sama (SHA-1
   cocok). I2.4 ditulis ulang dengan tiga syarat; Pasal 41 dan 43 ditambah di T2.4, Tabel 9.2 baris 1, dan I2.1. Temuan tambahan:
   Pasal 95 huruf a (TKPSDA lama berlaku sampai masa tugas berakhir) memperkuat syarat (a).
