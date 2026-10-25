# Berkas bukti BAB 12 KELEMBAGAAN, PEMBIAYAAN, DAN PETA JALAN

Kajian: Grand Design Mitigasi Bencana Indonesia 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9; Buku Pegangan L56–L64), menggantikan versi
pagi yang sama dan menyesuaikan diri dengan KERANGKA versi 3 final (pertanyaan kunci 2 kini memuat jalur berkala dan
jalur bencana; status data dan temuan yang diharapkan diperbarui). Penulis bab menulis hanya dari berkas ini dan dari
registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/mitigasi/bukti/bab-12.angka.json`: kunci angka baru Bab 12 (bentuk A berkas + jalur untuk sel paket data;
  bentuk B nilai + pustaka untuk hitungan lintas berkas, angka di teks peraturan, dan respons web), belum digabung ke
  `data/angka.json`.
- `naskah/mitigasi/bukti/bab-12.pustaka.json`: entri CSL-JSON (lihat bagian Pustaka).

Bahan yang dibaca: `KERANGKA.md` §0, §1.1 (M08, M10, M15, P05, P19, B19, B20, K13), §1.2 (V01, V06, V15), §2 (prinsip 1,
5, 6, 9, 11–19), §5 (Kajian 2 Bab 10–13 dan deck E3–E4), §6, §7 (celah 9, 10, 28–33, 36), §8 (E5, E11, E12, E14), §10;
`KEPUTUSAN.md` (P1, P3, P5–P8, P10, T14); Buku Pegangan L56–L64; `PEDOMAN-DESAIN.md` §C9, §B5.13, §B5.19–B5.23, tabel G1–G25;
riset `A-dokumen-bnpb.md`, `C-benchmark.md` §2.5 dan §3, `E-dokumen-primer.md` (E5, E11, E12, E14); berkas bukti Kajian 1
Bab 9–10 dan Kajian 2 Bab 1–13 (butir yang sudah diverifikasi di sana dipakai ulang dan disebut per butir; draf register
R-A dan R-M dari berkas bukti mitigasi bab-13 I3.1); paket `data/lembaga/` (README, `peran.csv`, `matriks_ringkas.csv`,
`matriks_bencana.csv`, `klaster.csv`, `celah.csv`, teks mentah UU 7/2012, UU 24/2007, Perpres 1/2019, Perpres 144/2024),
`data/program-terbukti/` (README §4, `kompendium_program.csv`, `renas_pb_2025_2029.csv`, `renas_aksi_terkait.csv`,
`organisasi_bnpb.csv`, `ripb_2020_2044.csv`), `data/dibi/` (README, `kejadian_besar.csv`, `mentah/dibi_peristiwa.json`),
`data/turunan/profil_kerugian.csv`, `data/angka.json`; korpus `data/raw/hukum/teks` (Perban 1/2025 Renas PB hlm. 4,
26, 32–33, 47–48, 94–99, 111–125; Perban 5/2018; Perpres 46/2026; Perban 4/2020; Perban 1/2026; Perban 6/2025; Kepka
327/2025; Perka 6/2014); sumber web yang dibuka ulang atau dibuka baru 24 Oktober 2026 (CKAN data.bnpb.go.id, Kemenko PMK,
Putusan MK 261/PUU-XXIII/2025, Strategi PARB Kemenkeu, ANTARA; disebut per butir).

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah RI; peraturan, tabel, atau rilis dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka |
| estimasi-model | Keluaran model yang belum diuji balik (di bab ini hanya rasio manfaat-biaya FEMA, yang hasil pemodelan) |
| asumsi-kebijakan | Pilihan penyusun (profil kerugian batas bawah, pemetaan, rancangan tabel, pelapisan dana, jadwal) |
| sekunder | Berita; sumber primer tidak terbuka. **Tidak masuk badan teks sebagai angka utama** dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**. Rujukan "registri
`kunci`" berarti kunci di `data/angka.json`; "kunci lama `kunci`" berarti kunci di berkas bukti bab lain; "kunci baru
`kunci`" berarti kunci di `bab-12.angka.json`. ID register R-A dan R-M adalah ID sementara draf register di berkas bukti
mitigasi bab-13 I3.1; token register diisi saat register bersama (KERANGKA §6) dibangun.

Tiga aturan yang dijaga di seluruh berkas: (1) program disebut dengan posisi rubrik paket `program-terbukti` (KERANGKA §2
butir 12); tidak satu pun program kelembagaan atau pembiayaan di kompendium berkekuatan kuat, jadi bab ini tidak menyebut
satu pun program "terbukti"; P07, P08, P09, dan P17 berkekuatan lemah dan hanya boleh tampil sebagai rujukan tata kelola
atau pelajaran; (2) angka model dan angka asumsi selalu disandingkan dengan angka tercatat untuk hal yang sama; (3) lapisan
ekstrem tidak boleh lebih ringan daripada kejadian tercatat terberat dalam periode acuan untuk ukuran yang sama (lantai,
KERANGKA §2 butir 9). Nominal anggaran, pagu indikatif Renas, dan nilai dana sengaja tidak disalin (P5); profil kerugian
batas bawah boleh tampil sebagai dasar lapisan berlabel Asumsi kebijakan (prinsip 15).

---

## Kerangka bab (dari KERANGKA.md §5, BAB 12)

- **Judul:** BAB 12 KELEMBAGAAN, PEMBIAYAAN, DAN PETA JALAN (11 hlm).
- **Subbab:** 12.1 Matriks Mandat Tertulis per Jenis dan Fase; 12.2 Usulan Penugasan dan Instrumen Penetapannya; 12.3
  Forum Koordinasi dan Jalur Adopsi; 12.4 Yang Berubah dari Renas PB 2025–2029; 12.5 Profil Kerugian dan Arsitektur
  Pembiayaan; 12.6 Instrumen Hukum; 12.7 Peta Jalan; 12.8 Indikator Kinerja; 12.9 Pemantauan dan Pelaporan.
- **Tujuan bab:** memberi tiap rekomendasi pemilik bermandat, forum, sumber dana, instrumen, dan jadwal, dan menyatakan apa
  yang diusulkan berubah dari Renas PB.
- **Pertanyaan kunci:**
  1. Mandat tertulis siapa per jenis dan fase, dan mana yang baru usulan?
  2. Apa yang diusulkan berubah dari Renas PB (target, lokus, unit, instrumen), dan lewat jalur mana: berkala untuk target
     dan indikator paling lambat 2027, atau bencana untuk program dan kegiatan rencana aksi paling lambat 2028?
  3. Lapisan dana mana untuk kejadian sering, berat, dan ekstrem?
  4. Instrumen hukum apa, oleh siapa, dan di Progsun mana?
  5. Bagaimana kemajuan dilaporkan?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| Mandat: 127 baris peran, 74 tertulis (`lembaga/peran.csv`); klaster Kepka 308/2024 | **Berubah angka.** `peran.csv` (SHA-1 awal `8d35ac37df2f`, dihitung ulang 24 Okt 2026) memuat 129 baris, 76 tertulis, 53 pemetaan penyusun; 35 lembaga, 26 di antaranya punya paling sedikit satu peran tertulis. **Ditambah:** 6 dari 13 ancaman (gempa, tsunami, gunung api, longsor, cuaca ekstrem, kebakaran TPA) tidak punya satu pun baris tertulis khusus jenis. Klaster 308/2024: 6 klaster, dikutip dari Juklak 16/2025 (SK tidak dibuka) (P1) |
| Forum: rakor Kemenko PMK (Perpres 1/2019 Pasal 6; Deputi Bidang Koordinasi PB dan Konflik Sosial, Perpres 144/2024); Unsur Pengarah BNPB (Perpres 1/2019 Pasal 10–13); peninjauan Renas PB lewat monev tahunan 2026 atau paruh waktu 2027; peninjauan RIPB (Perpres 87/2020 Pasal 7) dengan monev melalui Menko PMK (Pasal 6) | **Dikonfirmasi dari teks.** Perpres 144/2024 Pasal 25–26 dan Perpres 1/2019 Pasal 6 dibuka; Renas hlm. 124–125 dibuka ulang. **Catatan nomenklatur:** Perpres 1/2019 Pasal 13 ayat (2) memakai nama lama (Kemenko Polhukam, Kementerian PUPR); susunan dengan nama berlaku ada di Perban 6/2025 Pasal 9–10 (Kemenko Polkam, Kementerian PU). Keduanya ditulis (P2, P5) |
| Yang berubah dari Renas: tabel berkolom kode program Renas, perubahan, jalur berkala (≤ 2027) atau bencana (≤ 2028), dokumen monev tempat dimuat, status, bukti; KD-2, KD-3, KD-4 hanya berjalur berkala | **Disusun (P2, draf Tabel 12.3, sebelas baris).** **Ditambah:** jalur ketiga tanpa mengubah Renas, yaitu pengendalian ("saran perubahan lokasi"), dan jalur Renstra lewat Perpres 80/2025 untuk IKP dan IKS; lokus prioritas ada di Bab II Renas (bukan rencana aksi), jadi perubahan daftarnya hanya lewat jalur berkala; Renas tidak memuat indikator kapasitas 90% (itu indikator RPJMN dan Renstra) |
| Profil kerugian tahunan batas bawah 2015–2025: rumah rusak DIBI × stimulan Rp60/30/15 juta (skema lama 50/25/10); lapisan sering (median), berat (p90), ekstrem (Sulteng 2018, Sumatra 2025); Renas 2.a identik dengan PN 8 indikator 4 (0,140% PDB 2022; 0,137 pada 2025; 0,135 pada 2029) menunggu seri CKAN R3P | **Dikonfirmasi** untuk median dan p90 (registri `kerugian.nasional.lapisan_sering`, `.lapisan_berat`) dan untuk Renas 2.a. **Koreksi lantai:** pada ukuran yang sama Lombok 2018 (Rp5,69–7,16 T) hampir dua kali Sulteng 2018 (Rp2,90–3,62 T) dan merupakan kejadian terberat 2015–2025; dalam periode acuan geologi 30 tahun, Padang 2009 (Rp7,48–9,43 T) lebih berat lagi. **Ditambah:** dasar pelapisan resmi dari Strategi PARB Kemenkeu (layering menurut frekuensi dan dampak); pembanding resmi rata-rata kerugian ekonomi langsung 2000–2016 Rp22,8 T per tahun; seri CKAN proposal pemda ditarik ulang (310 baris) tetapi berulang dan memuat 6 baris dengan nilai kerugian sama persis dengan nilai kerusakan, sehingga Renas 2.a tetap belum terukur (P3) |
| Pembiayaan: DSP tiga keadaan; Dana Bersama (Perpres 75/2021 Pasal 8; Perban 1/2026 tanpa analisis manfaat-biaya); dana kontinjensi APBN (PP 22/2008 Pasal 6 ayat (1)); DSP konflik sosial (UU 7/2012 Pasal 55 ayat (1)); asuransi BMN; DAK; APBD, BTT, DSP BPBD; dana desa; sinkronisasi BTT dan DSP | **Dikonfirmasi dari teks**, kecuali DAK. Perban 4/2020 Pasal 20, Perban 1/2026 Pasal 7, 14, 32, UU 7/2012 Pasal 55, Renas hlm. 26 dibuka ulang di bab ini. **Ditambah:** prioritas Dana Bersama mempertimbangkan "daerah dengan indeks risiko bencana tinggi" (Perban 1/2026 Pasal 7 ayat (2) huruf b) dan permohonan pascabencana wajib merujuk R3P yang ditetapkan (Pasal 14 ayat (5)). **Celah:** dasar dan menu DAK untuk PB tahun 2026 tidak ditemukan (P3) |
| Instrumen: perubahan Perban 5/2018 untuk Perpres 46/2026 Pasal 3 ayat (4) (Usulan baru; Deputi PD dan Biro Hukum; rakor Kemenko PMK); Perpres status dan tingkatan bencana (BNPB lewat Kemenko PMK; indikator dikuantifikasi dari DIBI tanpa ambang rekaan); norma pengait KLB; Perban analisis risiko (Sudah ada, perlu dikembangkan; Perka 5/2008; Progsun butir 3); syarat manfaat-biaya Dana Bersama (FEMA P24) | **Dikonfirmasi semua.** Status P7 perubahan Perban 5/2018 mengikuti KERANGKA §1.1 M08 ("Usulan baru"). **Ditambah:** Putusan MK 261/PUU-XXIII/2025 (28 Agustus 2026) memaknai Pasal 7 ayat (2) UU 24/2007 (status nasional minimal 3 dari 5 indikator, jumlah korban wajib), sehingga "tanpa ambang rekaan" kini juga tafsir MK; Progsun 2026 butir 7 mengubah Perka 6/2014 (tata cara pembentukan produk hukum), dan Perka 6/2014 Pasal 8 ayat (2) membuka rancangan di luar program dengan izin prakarsa Kepala (P4) |

- **Komponen (KERANGKA):** Tabel 12.1 matriks mandat tertulis lembaga × fase dengan kode K/P/R/I dan pasal (B5.7,
  `lembaga/matriks_ringkas.csv`); Tabel 12.2 usulan penugasan dan instrumen (B5.7); Gambar 12.1 forum dan jalur adopsi
  (B5.23); Tabel 12.3 yang berubah dari Renas PB dengan kolom jalur berkala dan jalur bencana (B5.7); Gambar 12.2 profil
  kerugian tahunan batas bawah 2015–2025 (G1); Gambar 12.3 lapisan pembiayaan (B5.21); Tabel 12.4 instrumen hukum dengan
  kolom Progsun (B5.20); Tabel 12.5 peta jalan (B5.13 kolom WAKTU); Tabel 12.6 indikator (B5.19); Gambar 12.4 tata kelola dan
  pelaporan tiga lapis (B5.23).
- **Status data (KERANGKA):** ada (lembaga, korpus, Renas, RPJMN, PP 21/2008, PP 22/2008, Perpres 75/2021, Perpres 87/2020);
  sebagian (seri CKAN R3P belum ditarik). **Pembaruan:** seri CKAN nilai kerusakan dan kerugian proposal pemda ditarik ulang
  24 Okt 2026 ke ruang kerja peneliti (belum masuk paket `dibi`; pemiliknya `pipa-data`, §10). Yang tetap tidak ada:
  realisasi Dana Bersama, BTT per daerah, dasar DAK PB 2026, teks Juklak 5/2024, teks Kepka 308/2024, dokumen R3P Lombok
  dan Sulteng, laporan monev Renas 2025.

Catatan lingkup: Bab 12 adalah satu-satunya tempat lembaga dan pembiayaan Kajian 2 (prinsip 17). Strategi tinggal di Bab
11; rekomendasi bernomor tinggal di Bab 13 dan register bersama (§6). Bab ini memberi tiap baris register pemilik
bermandat, forum, sumber dana, instrumen, dan jadwal, tanpa menulis ulang rekomendasinya. Kesenjangan norma sudah dinamai
Bab 10 (berkas bukti mitigasi bab-10 P1); bab ini hanya memasangkan tiap kesenjangan dengan instrumen, pemrakarsa, dan
jalur penetapannya.

---

## P1. Mandat tertulis siapa per jenis dan fase, dan mana yang baru usulan?

### Inti

Dari 129 baris peran bersumber, 76 menyebut lembaganya di norma dan 53 dipetakan penyusun; 50 baris adalah norma lintas
jenis (41 tertulis) yang menjadikan BNPB koordinator prabencana dan pascabencana serta pemegang komando, DSP, keadaan
tertentu, dan klaster logistik saat tanggap darurat untuk semua jenis. Mandat khusus per jenis tertulis tebal hanya untuk
karhutla (16 baris tertulis), konflik sosial (8), dan banjir (5); untuk gempa, tsunami, gunung api, longsor, cuaca ekstrem,
dan kebakaran TPA tidak ada satu pun baris yang menyebut lembaganya, sehingga sel BMKG, Badan Geologi, dan pemda di kolom
itu adalah pelaku dipetakan. Yang benar-benar baru usulan sempit: pedoman keadaan tertentu untuk faktor sosial dan
pascakonflik, pengait status KLB dengan status darurat bencana, penetapan tingkatan bencana, dan penyedia peringatan dini
yang belum ditunjuk.

### Temuan bersumber

**Hitungan matriks**

1. **Baris peran.** `lembaga/peran.csv` (dihitung ulang 24 Okt 2026; SHA-1 awal `8d35ac37df2f`): 129 baris; `jenis_bukti`
   tertulis 76, dipetakan penyusun 53; fase saat 56, pra 42, lintas 24, pasca 7. Sumber: paket `lembaga`
   [`pantaubencana-2026-paket-lembaga`]; kunci lama `lembaga.peran.baris_total`, `.baris_tertulis`, `.baris_pemetaan` (air
   bab-09). Label: resmi (olah; tiap baris berkutipan peraturan yang dicek skrip `bangun/lembaga.py`).
   - *Dibantah oleh / berdampingan:* KERANGKA §5 Bab 12 dan `lembaga/README.md` §2 menulis 127 baris dan 74 tertulis. Selisih
     dua baris tertulis adalah R144 (Kemendikdasmen) dan R145 (Kemenag) (air bab-09 T1.1). Naskah memakai kunci registri yang
     dibaca saat build.
2. **Lembaga.** 35 kode lembaga punya baris peran; 26 punya paling sedikit satu peran tertulis. `matriks_ringkas.csv` memuat
   35 baris lembaga × 14 kolom (13 ancaman ditambah `semua`, yaitu norma lintas jenis). Sumber: `peran.csv`,
   `matriks_ringkas.csv`; kunci baru `lembaga.peran.lembaga_n`, `lembaga.peran.lembaga_tertulis_n`,
   `lembaga.matriks.ancaman_n`. Label: resmi (olah). Angka 35 memuat 9 lembaga yang hanya punya baris dipetakan penyusun,
   tanpa satu pun baris tertulis: BRIN, Kemendes, Kemenhut, Kemenko Pangan, Kemenko Polkam, Kementerian PKP, Kementerian PU,
   KLH/BPLH, Komdigi (dihitung ulang dari `peran.csv`, SHA-1 `8d35ac37df2f`). Karena itu 35 tidak boleh tampil sendirian
   sebagai jumlah lembaga bermandat tertulis; selalu bersama 26.
3. **Lintas jenis lawan khusus jenis.** Norma lintas jenis 50 baris, 41 tertulis (9 dipetakan penyusun); khusus jenis 79 baris, 35 tertulis.
   Sumber: idem; kunci baru `lembaga.peran.semua.baris`, `.semua.tertulis`, `.spesifik.baris`, `.spesifik.tertulis`. Label:
   resmi (olah).
4. **Per ancaman (baris / tertulis / lembaga):** gempa 2/0/2; tsunami 2/0/2; gunung api 1/0/1; longsor 2/0/2; cuaca ekstrem
   1/0/1; gelombang dan abrasi 3/1/3; banjir 9/5/5; kekeringan 6/2/5; karhutla 26/16/23; epidemi 4/2/3; gagal teknologi
   4/1/4; kebakaran TPA 5/0/3; konflik sosial 14/8/11. Sumber: `peran.csv` kolom `ancaman`, `jenis_bukti`; kunci baru
   `lembaga.peran.ancaman_tanpa_tertulis`. Label: resmi (olah).
5. **Mengapa enam ancaman itu "dipetakan".** Peringatan dini gempa, tsunami, cuaca ekstrem, gelombang, dan iklim ekstrem
   (R050, R052, R068, R069, R072) bersandar pada UU 31/2009 yang menyebut pelaku "Badan"; KRB geologi, status gunung api,
   dan peringatan gerakan tanah (R051, R053, R054, R055) bersandar pada Lampiran UU 23/2014 kolom "Pemerintah Pusat",
   dipetakan ke Kementerian ESDM (Badan Geologi); baris kebakaran TPA dipetakan karena normanya tidak menyebut kebakaran
   (R118–R122). Sumber: `peran.csv` kolom `catatan`; `lembaga/README.md` §1 ("Di naskah, sel pemetaan wajib diberi tanda
   inferensi"). Label: resmi (olah).
6. **Kode K khusus jenis** (`matriks_bencana.csv`): banjir Pemda (lintas, R061) dan Kementerian PU (lintas, R060, dipetakan);
   kekeringan Pemda (R074), Kementerian PU dan Kemenko Pangan (dipetakan); karhutla BPBD (lintas) serta Kemenhut, Kemenko Polkam, dan KLH/BPLH
   (lintas; dipetakan, pewaris nomenklatur: R088, R080, R089, karena Inpres 3/2020 ditujukan ke Menko Polhukam dan Menteri LHK) serta BNPB (saat, R094) dan Pemda (saat); epidemi Kemenkes (lintas, R112); gagal teknologi Pemda (R114); kebakaran
   TPA Pemda (dipetakan); konflik sosial Kemenko PMK (lintas), Polri (saat, R132) dan Kemenko Polkam (saat; dipetakan,
   pewaris nomenklatur, R137), Pemda (pasca). Gempa, tsunami,
   gunung api, longsor, dan cuaca ekstrem tidak punya baris K khusus jenis; perannya hanya I dan R. Sumber:
   `matriks_bencana.csv`, `matriks_ringkas.csv`. Label: resmi (olah).
7. **BNPB sebagai koordinator tanggap darurat (untuk slot deck E3 `{b}`).** Baris BNPB `saat:K` ada di norma lintas jenis
   (R002 kemudahan akses dan komando, R003 DSP, R004 keadaan tertentu, R009 klaster logistik) yang berlaku untuk ke-13
   ancaman, dan sebagai baris khusus jenis hanya untuk karhutla (R094, Inpres 3/2020). Sumber: `matriks_bencana.csv` baris
   BNPB; kunci baru `lembaga.peran.bnpb.k_saat_spesifik_n` (1). Label: resmi (olah).
8. **Mandat BNPB yang tertulis** (13 baris BNPB, 11 tertulis): pedoman dan pengarahan dari pencegahan sampai rekonstruksi
   (R001); kemudahan akses dan komando (R002); DSP (R003); keadaan tertentu untuk faktor alam, nonalam, dan sosial (R004,
   Perpres 46/2026); fungsi komando pengerahan sumber daya (R005, Perpres 1/2019 Pasal 19); platform peringatan dini
   multiancaman (R006, Perban 2/2024); penyusun Rencana RR skala nasional bersama Bappenas dan K/L (R007, Perban 5/2017);
   koordinator Klaster Logistik (R009); komando nasional karhutla (R094); keadaan tertentu bagi daerah rekonsiliasi
   pascakonflik berkapasitas fiskal rendah (R135); anggota Satgas Penyelesaian Konflik Sosial nasional (R136, UU 7/2012).
   Dua baris dipetakan: epidemi dan gagal teknologi sebagai bencana nonalam (R113, R117). Sumber: `peran.csv`; kunci lama
   `lembaga.peran.bnpb.baris`, `.bnpb.tertulis`. Label: resmi.
9. **Fungsi BNPB per fase menurut Perpres 1/2019:** "Apabila terjadi bencana nasional, BNPB melaksanakan fungsi komando
   dalam penanganan status keadaan darurat bencana dan keadaan tertentu" (Pasal 5); koordinasi "dilaksanakan pada tahap
   prabencana dan pascabencana" (Pasal 18 ayat (1)); komando lewat pengerahan sumber daya (Pasal 19); BNPB dikoordinasikan
   kementerian koordinator bidang PMK (Pasal 6). Sumber: `lembaga/mentah/teks/perpres-1-2019.json.gz` hlm. 3–4, 7, dibuka
   ulang 24 Okt 2026 [`ri-2019-perpres1`]. Label: resmi.
10. **Klaster nasional dua versi.** Kepka BNPB 308/2024 (dikutip Juklak 16/2025 hlm. 1): 6 klaster, koordinator Basarnas,
    Kemensos, BNPB (logistik), Kemenkes, kementerian pendidikan, Kemendagri (pemulihan). Versi Kepka 173 (dari berita BPBD
    DIY, sekunder): 8 klaster termasuk Sarana dan Prasarana (Kementerian PU) dan Ekonomi (Kementan). Sumber:
    `lembaga/klaster.csv` [`bnpb-2025-juklak16`, `pantaubencana-2026-paket-lembaga`]; kunci lama `lembaga.klaster.kepka308`,
    `.kepka173` (mitigasi bab-10). Label: resmi (versi 2024); versi lama hanya pembanding.
11. **Pascabencana.** R3P skala nasional disusun BNPB, Bappenas, dan K/L terkait (Perban 5/2017 Pasal 3, R007); rumah korban
    adalah urusan perumahan pusat (Kementerian PKP, pemetaan penyusun), provinsi, dan kab/kota menurut skala; Kemendagri
    koordinator klaster pemulihan. Sumber: `lembaga/README.md` §4.1; `peran.csv`. Label: resmi; pemetaan PKP ditandai.
12. **Celah kewenangan.** `lembaga/celah.csv` 17 baris; 3 dinyatakan sumbernya (C01 Renstra, C02 dan C03 Renas), 14
    disimpulkan penyusun; yang menyangkut Bab 12: C02 (BTT dan DSP belum sinkron, TRC multisektor belum diatur), C08 (klaster
    8 ke 6), C09 (dua rezim status epidemi), C10 (dua rezim konflik), C12 (nama lama di Perpres 1/2019 dan Perban 6/2018), C15
    (rantai peringatan dini melintasi tiga Kemenko), C17 (penyedia peringatan dini per bahaya). Sumber: `celah.csv`; kunci lama
    `lembaga.celah.n` (air bab-07). Label: resmi (bukti); disimpulkan penyusun (14 baris).
13. **Mandat tertulis di luar paket (rezim keselamatan industri).** Pengawasan keselamatan migas termasuk depo penyimpanan
    dan niaga oleh Menteri ESDM melalui Dirjen Migas dan Kepala Inspeksi (PP 11/1979 Pasal 2; Permen ESDM 32/2021 Pasal 3);
    keselamatan proses dan penyimpanan industri oleh Menteri Perindustrian (UU 3/2014 Pasal 117); K3 dan pencegahan kebakaran
    di tempat kerja di bawah Menteri Ketenagakerjaan (UU 1/1970 Pasal 3, 5); tidak satu pun menyebut BNPB. Sumber: riset
    E12; KERANGKA §8 [`ri-1970-uu1`, `ri-2014-uu3`, `ri-1979-pp11`, `kesdm-2021-permen32`]. Label: resmi.
    - *Berdampingan:* KERANGKA §1.1 K13 menyetujui Kemenperin dan Kemnaker masuk matriks setelah mandat tertulisnya dibaca;
      `peran.csv` belum memuat keduanya (35 kode lembaga yang ada tidak mencakup Kemenperin dan Kemnaker).
14. **Unit BNPB berlaku** (Perban 6/2025 jo. 11/2025): Deputi Bidang Sistem dan Strategi (Pasal 43) dengan Direktorat Pemetaan
    dan Evaluasi Risiko Bencana (Pasal 47), Direktorat Pengembangan Strategi PB (Pasal 50), Direktorat Sistem PB (Pasal 53);
    Deputi Bidang Pencegahan (Pasal 55) dengan Direktorat Kesiapsiagaan (Pasal 61); Deputi Bidang Penanganan Darurat
    (Direktorat Koordinasi Pengendalian Operasi Darurat; Direktorat PD Wilayah I–III); Deputi Bidang RR; Deputi Bidang Logistik
    dan Peralatan; Pusdatinkom; Biro Perencanaan (Pasal 24); Biro Hukum, Organisasi, dan Kerja Sama (Pasal 41). Tujuh unit lama
    berstatus "diganti Perban 11/2025". Sumber: korpus `perban-nomor-6-tahun-2025.json` hlm. 7, 10–14, dibuka ulang;
    `program-terbukti/organisasi_bnpb.csv` [`bnpb-2025-otk`, `bnpb-2025-otk-ubah`]. Label: resmi.

### Inferensi

- **[Inferensi tim] Tiga keadaan sel.** Memisah matriks utama "tertulis" dari "usulan penugasan" (prinsip 14) secara harfiah
  akan mengosongkan seluruh kolom gempa, tsunami, gunung api, longsor, dan cuaca ekstrem, padahal mandat BMKG dan Badan
  Geologi ada di undang-undang dengan pelaku umum. Tabel 12.1 karena itu memakai: (a) tertulis; (b) tertulis, pelaku
  dipetakan (bertanda inferensi); (c) kosong beralasan "tidak tercatat di peraturan yang dibaca". Tabel 12.2 hanya untuk
  peran yang tidak ada di norma mana pun (air bab-09 I1.1 memakai aturan yang sama).
- **[Inferensi tim] Draf Tabel 12.1** (≤ 12 baris untuk slide E3; lengkap di lampiran; `*` = pelaku dipetakan):

  | Lembaga | Prabencana | Tanggap darurat | Pascabencana | Jenis yang disebut khusus |
  | --- | --- | --- | --- | --- |
  | BNPB | I platform peringatan dini; K pedoman (lintas) | K komando, DSP, keadaan tertentu, klaster logistik | K rencana RR nasional | karhutla K saat; konflik P |
  | BPBD | I peta rawan; K pedoman daerah (lintas) | K koordinasi daerah (lintas) | K koordinasi daerah (lintas) | karhutla K lintas |
  | Pemda | R kawasan daya rusak air (banjir) | R status darurat daerah; R KLB; K damkar | K rumah korban; K pascakonflik | banjir, kekeringan, epidemi, gagal teknologi, TPA*, konflik |
  | Kemenko PMK | P prioritas Dana Bersama | K rakor keadaan tertentu | – | konflik K lintas |
  | BMKG | I gempa*, tsunami*, cuaca ekstrem*, gelombang*, iklim ekstrem* | P | – | karhutla I |
  | Kementerian ESDM (Badan Geologi) | R KRB geologi*; I gunung api*, gerakan tanah* | P | – | – |
  | Kementerian PU | R, I banjir dan longsor*; K pengaman pantai* | P | – | banjir, kekeringan, gelombang |
  | Kemenkes | – | K klaster kesehatan; R daerah terjangkit wabah* | – | epidemi K lintas |
  | Kemensos | – | K klaster pengungsian | – | karhutla P, konflik P |
  | Basarnas | – | K klaster pencarian dan pertolongan | – | – |
  | Kemendagri | R standar damkar* | P | K klaster pemulihan | – |
  | Polri; Kemenko Polkam | – | K konflik (Polri); K konflik* (Kemenko Polkam) | – | karhutla K lintas* (Kemenko Polkam) |

  Sel bersumber baris `peran.csv` dan `matriks_bencana.csv` yang disebut di temuan 4–11. Kementerian PKP (K perumahan pasca)
  dan Bappenas (P rencana RR) pindah ke lampiran bila slide penuh. Slot deck E3: `{a}` dua lapis "35 lembaga, 26 bermandat tertulis" (9 lembaga hanya
  dipetakan penyusun; temuan 2), `{n}` = 13 ancaman;
  `{b}` harus ditulis dua lapis supaya jujur: "13 ancaman lewat norma lintas jenis; 1 ancaman (karhutla) lewat norma khusus".
- **[Inferensi tim] Draf Tabel 12.2 usulan penugasan dan instrumen penetapannya:**

  | No | Peran yang diusulkan | Dasar yang sudah ada | Instrumen untuk menetapkannya | Register |
  | --- | --- | --- | --- | --- |
  | 1 | BNPB menyelenggarakan PB dalam keadaan tertentu untuk faktor sosial dan daerah rekonsiliasi pascakonflik berkapasitas fiskal rendah | Perpres 46/2026 Pasal 3 ayat (2) huruf a dan c, ayat (4) | Pedoman Kepala BNPB: perubahan Perban 5/2018 (P4) | R-M03 |
  | 2 | Pengait status KLB atau wabah dengan status darurat bencana | UU 17/2023 Pasal 353, 368; UU 24/2007 Pasal 51; C09 | Norma bersama Kemenkes dan BNPB; bentuk belum dapat ditentukan (P4) | R-M07 |
  | 3 | Penetapan tingkatan bencana dengan indikator UU 24/2007 Pasal 7 ayat (2) menurut tafsir MK | UU 24/2007 Pasal 7 ayat (3); Putusan MK 261/PUU-XXIII/2025 | Perpres status dan tingkatan bencana (P4) | R-M06 |
  | 4 | Penyedia peringatan dini kekeringan hidrologis dan sambungan peringatan dini per WS ke platform BNPB | PP 30/2024 Pasal 96; Perban 2/2024; C17 | Dibahas di Dewan SDA Nasional; perubahan Perban 2/2024 (Kajian 1 Bab 9) | R-M12 |
  | 5 | Koordinator pemulihan darurat prasarana (setelah klaster Sarana dan Prasarana tidak ada di SK 308/2024) | Perpres 1/2019 Pasal 19 (komando); UU 24/2007 Pasal 58 | Tidak perlu instrumen baru bila komando BNPB dipakai; dicatat sebagai sel kosong beralasan | R-M10 |

  Baris "BNPB kontributor Renas 2.4.4.a" tidak masuk tabel ini karena sudah tertulis sebagai keanggotaan Dewan SDA Nasional
  (air bab-09 T1.7; KERANGKA prinsip 2).
- **[Inferensi tim]** Ketimpangan mandat per jenis mengikuti ketimpangan bukti di Bab 10: karhutla punya Inpres sendiri (16
  baris tertulis), sedangkan lima ancaman geologi dan hidrometeorologi bergantung pada undang-undang sektoral berpelaku
  umum. Komando BNPB tertulis untuk semua jenis lewat UU 24/2007 Pasal 50 (status keadaan darurat) dan Perpres 1/2019
  Pasal 5 (bencana nasional) serta Pasal 19 (pengerahan sumber daya); tetapi Pasal 5 bersyarat "Apabila terjadi bencana
  nasional", dan Perpres penetapan status dan tingkatan bencana belum terbit (P4 temuan 5), sehingga komando nasional BNPB
  bergantung pada alat penetapan status yang belum ada. Celah utama di sini karena itu celah akuntabilitas prabencana,
  ditambah ketergantungan komando nasional pada Perpres status (P4): siapa yang wajib menghasilkan informasi bahaya dapat ditafsirkan, tetapi tidak
  dapat ditunjuk dari teks.

### Celah

- `peran.csv` dan README paket sedang diubah di berkas kerja; hitungan dapat bergeser. **Penyajian:** naskah membaca kunci
  registri saat build; README dan KERANGKA diperbarui pemiliknya (`pipa-data`).
- Teks Kepka BNPB 308/2024 dan 173 tidak dibuka; apakah 308/2024 mencabut 173 tidak tertulis. **Permintaan:** Biro Hukum,
  Organisasi, dan Kerja Sama.
- Kemenperin dan Kemnaker belum dimuat sebagai lembaga di paket meski mandat tertulisnya sudah dibaca (E12); Bapeten, BIN,
  BPOM tidak dimuat. **Penyajian:** sel kosong ditulis "tidak tercatat di peraturan yang dibaca", bukan "tidak berlaku"
  (S22); penambahan dua lembaga itu masuk koreksi paket.
- Peran Kementerian PKP dalam stimulan rumah DSP dan hunian tetap Sumatra 2025 tidak terbaca dari teks (Juklak 5/2024 tanpa
  teks di JDIH).
- Pasal tugas unit Deputi Bidang Penanganan Darurat, Deputi Bidang RR, Pusdatinkom, dan Direktorat Peringatan Dini sesudah
  Perban 11/2025 tidak dikutip di berkas ini. **Penyajian:** sebut unitnya dengan rujukan "Perban 6/2025 jo. 11/2025" tanpa
  nomor pasal.

---

## P2. Apa yang diusulkan berubah dari Renas PB (target, lokus, unit, instrumen), dan lewat jalur mana?

### Inti

Renas PB 2025–2029 dapat diubah lewat dua jalur bertenggat: jalur berkala paling lambat 2027, yang boleh menyentuh
kebijakan, strategi, program, dan kegiatan, dan jalur bencana paling lambat 2028, yang hanya
menyentuh program dan kegiatan rencana aksi; keduanya hanya sah bila rekomendasinya termuat di hasil evaluasi tahunan atau
evaluasi paruh waktu. [Inferensi tim] Karena teks hanya membatasi jalur bencana pada "program dan kegiatan dalam rencana
aksi" dan tidak menyebut target sasaran maupun lokus untuk jalur mana pun, tim menafsirkan seluruh usulan target dan alat ukur (sasaran 1.a dan 1.b berangka, KD-2, KD-3, KD-4, dan
daftar lokus yang berada di Bab II Renas) harus masuk laporan evaluasi tahunan Renas 2026 yang paling lambat selesai akhir
triwulan II 2027, sedangkan jalur bencana cocok untuk meninjau target kegiatan rehabilitasi perumahan 3.1.2.c
yang perubahannya dipicu Sumatra November 2025 ([Inferensi tim] pembanding 5.802 rumah/unit/paket target 2029 lawan 62.956
rumah rusak berat satu kejadian berbeda satuan dan cakupan, jadi hanya penanda perlunya peninjauan). Di luar dua jalur itu, pengendalian Renas dapat
memberi "saran perubahan lokasi" untuk Renja 2027 tanpa mengubah Renas, dan IKP serta IKS Renstra berubah lewat Perpres
80/2025, bukan lewat Renas.

### Temuan bersumber

**Jalur perubahan**

1. **Tenggat dan syarat.** "Perubahan RENAS PB Tahun 2025-2029 yang didasarkan pada peninjauan kembali secara berkala
   dilakukan maksimal di tahun ketiga periode pelaksanaan"; "Rekomendasi peninjauan kembali tersebut harus termuat dalam
   hasil pemantauan dan evaluasi tahunan atau evaluasi paruh waktu"; perubahan karena bencana "dilakukan maksimal di tahun
   keempat" dan "dapat dilakukan terhadap program dan kegiatan dalam rencana aksi", dengan syarat termuat yang sama (§4.6
   hlm. 125). Teks §4.6 menyebut perubahan "kebijakan, strategi, program, dan kegiatan" dan tidak menyebut secara eksplisit
   target dan indikator sasaran (Tabel 2.8) maupun lokus (Bab II §2.7) untuk jalur mana pun; penempatannya di jalur berkala
   adalah tafsiran tim (Inferensi, aturan pemilahan (a)). Batang tubuh: Renas "ditinjau secara berkala setiap 2 (dua) tahun" (Pasal 7 ayat (1)) dan "dapat ditinjau
   sewaktu-waktu jika terjadi bencana" (ayat (2)). Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 4 dan 125, dibuka
   ulang 24 Okt 2026 [`bnpb-2025-renas`]; kunci lama `renas.perubahan_berkala.tahun_maks` (2027),
   `renas.perubahan_bencana.tahun_maks` (2028) (air bab-10); KERANGKA V01, V15. Label: resmi.
2. **Dokumen monev tempat rekomendasi dimuat.** Evaluasi tahunan "dilakukan maksimal hingga minggu terakhir di TW II tahun
   berikutnya (tahun T+1)" dengan luaran peta kegiatan dalam Renja K/L, gap analysis, dan rekomendasi pelaksanaan kegiatan
   tahun berikutnya; evaluasi paruh waktu "dilakukan di tahun ketiga" dengan luaran antara lain "Rekomendasi perbaikan RENAS
   PB Tahun 2025-2029 (bila perlu)"; evaluasi akhir sesudah tahun kelima (hlm. 124). Sumber: korpus Renas hlm. 124
   [`bnpb-2025-renas`]. Label: resmi.
3. **Jalur pengendalian tanpa mengubah Renas.** Rekomendasi tindakan korektif "dapat berupa saran perubahan lokasi, penerima
   manfaat (beneficiaries), volume output, bentuk kegiatan, dan lainnya"; pemantauan pra-pelaksanaan pada triwulan IV tahun
   T-1 meninjau Renja K/L penanggung jawab; forum koordinasi K/L penanggung jawab paling lambat triwulan II tahun berjalan.
   Sumber: korpus Renas hlm. 123 [`bnpb-2025-renas`]. Label: resmi.
4. **Dasar di tingkat PP:** rencana PB "ditinjau secara berkala setiap 2 (dua) tahun atau sewaktu-waktu apabila terjadi
   bencana" (PP 21/2008 Pasal 6 ayat (6)). Sumber: riset E11d [`ri-2008-pp21`]. Label: resmi.
5. **Jalur Renstra.** Perubahan Renstra-KL konsisten dengan RPJMN (Perpres 80/2025 Pasal 22), boleh menyentuh indikator dan
   target (Pasal 24 ayat (1) huruf b), disetujui Kementerian Perencanaan setelah Pertemuan Dua Pihak (Pasal 26–29); evaluasi
   Renstra tahun ke-3 (2027). Sumber: berkas bukti mitigasi bab-13 T2.2 [`ri-2025-perpres80`]; kunci lama
   `renstra.evaluasi_tahun_ke3.tahun`. Label: resmi.
6. **Unit pemasuk rekomendasi ke monev.** Direktorat Pengembangan Strategi PB bertugas "pemantauan, evaluasi, dan analisis
   pelaporan pada lingkup sistem dan strategi melalui pengurangan risiko bencana dan tata kelola penanggulangan bencana"
   (Perban 6/2025 Pasal 50); Biro Perencanaan bertugas "pemantauan, evaluasi, dan penyusunan laporan" BNPB (Pasal 24). Sumber:
   korpus `perban-nomor-6-tahun-2025.json` hlm. 7, 12 [`bnpb-2025-otk`]; KERANGKA prinsip 1 dan §6 keputusan 14 hari butir
   (7). Label: resmi; penugasan unit ke monev Renas adalah pemetaan penyusun.

**Target**

7. **Indikator sasaran Renas** (Tabel 2.8, kolom PROYEKSI 2025 dan TARGET 2029): 1.a 0,22 per 100.000 ke "Menurun"; 1.b 2.643
   ke "Menurun"; 1.c 11.060 ke 52.000 per 100.000 penduduk di daerah berisiko; 2.a 0,137 ke 0,135; 2.b 0,004 ke 0,003; 3.a
   Indeks Pemulihan Pascabencana 6,5 ke 8; 4.a implementasi strategi PRB nasional 87% ke 100%; 4.b 12% ke 15%; 4.c penurunan
   indeks risiko 1,2% ke 1,2%. Tabel 2.8 tidak memuat indikator kapasitas daerah. Sumber: korpus Renas hlm. 32–33, dibuka
   ulang [`bnpb-2025-renas`]; kunci lama `renas.indikator_1a.proyeksi_2025`, `renas.indikator_1b.proyeksi_2025`,
   `renas.indikator_1c.2025`, `.2029`, `renas.indikator_2a.*`, `renas.indikator_4c.proyeksi_2025` (air bab-01, mitigasi
   bab-01, bab-02). Label: resmi.
8. **Realisasi DIBI 2025 lawan proyeksi 1.a.** Versi bencana alam (angka utama Kajian 2, V06): 1.735 meninggal dan 221 hilang,
   0,68 per 100.000 (penyebut BPS 2026), sekitar 3,1 kali proyeksi 0,22. Versi semua klasifikasi: 2.276 meninggal dan hilang,
   0,79–0,80 per 100.000, sekitar 3,6 kali. Proyeksi 0,22 setara sekitar 632 jiwa (asumsi-kebijakan). Sumber: kunci lama
   `dibi.nasional.meninggal_alam.2025`, `dibi.alam.per100rb.2025_bps2026` (bab-13), `dibi.nasional.per100rb.2025_bps2026`,
   `.2025_supas`, `renas.indikator_1a.setara_jiwa_2025` (bab-01); kunci baru `renas.indikator_1a.rasio_dibi_alam_2025` (olah
   0,68 / 0,22 = 3,1) dan `renas.indikator_1a.rasio_dibi_2025` (olah 0,80 / 0,22 = 3,6). Label: resmi; rasio olah(resmi).
   - *Berdampingan:* rumus, penyebut, dan cakupan jenis indikator 1.a tidak tertulis di Renas; DIBI memakai "menderita" untuk
     1.b (Juklak 7/2023). Rasio hanya pembanding, bukan capaian.
9. **Peringatan dini, dua lintasan (KD-2).** Renas 1.c 11.060 ke 52.000 per 100.000 (kelipatan 4,7); Renstra IKP 6,10% ke 6,32%
   (= RPJMN KP 08.04.02, baseline 6,00); penyebut berbeda. Sumber: kunci lama `renas.indikator_1c.*`,
   `renstra.ikp_peringatan_dini.*`, `rpjmn.kp080402.peringatan_dini_baseline` (air bab-01, bab-08, bab-10); riset E11b.
   Label: resmi. Faktor korban dari lintasan ini (asumsi-kebijakan) hanya di kartu Bab 6–7, tidak di Bab 12 (V02).
10. **Kapasitas daerah, dua alat (KD-3).** RPJMN KP 08.04.01 baseline 62% (2023), 67% (2025), 90% (2029); Renstra IKS 67% ke 90%;
    kelas kapasitas KRB 2022–2026 37,99% kab/kota minimal sedang (193 dari 508). Sumber: riset E11b; kunci lama
    `rpjmn.kp_kapasitas.baseline_2023`, `renstra.iks_kapasitas_minimal_sedang.*`,
    `krb.nasional.kapasitas_minimal_sedang_persen`, `kapasitas.jarak_90.*` (mitigasi bab-05, bab-13). Label: resmi; jarak
    asumsi-kebijakan.
11. **IRB (KD-4).** Renas 4.c dan RPJMN PP 08.04: penurunan IRB 1,2% per tahun, baseline RPJMN 1,54 (2023); IRBI 2025 berskala
    bilangan bulat dan tidak sebanding dengan 2015–2024. Sumber: kunci lama `rpjmn.pp_irb.baseline_2023`, `irbi.skala.*`
    (mitigasi bab-01, bab-03); `irbi/README.md` §4. Label: resmi (angka); "skala berubah" asumsi-kebijakan.
12. **Rehabilitasi perumahan.** Renas 3.1.2.c "Rehabilitasi dan Rekonstruksi Sektor Perumahan": baseline 1.160, target 2029
    5.802 rumah/unit/paket, PJ Kementerian PKP, kontributor BNPB, ATR/BPN, Kementerian BUMN (nomenklatur Renas). DIBI mencatat
    62.956 rumah rusak berat dalam satu rangkaian banjir dan longsor Sumatra (15 Nov–31 Des 2025). Sumber:
    `program-terbukti/renas_aksi_terkait.csv` baris 3.1.2.c (hlm. 90) [`bnpb-2025-renas`]; `dibi/kejadian_besar.csv`
    [kode=sumatra2025, metrik=rumah_rusak_berat, versi=DIBI] [`bnpb-2026-dibi`]; kunci baru `renas.aksi_312c.target_2029`,
    `.baseline_2024`; kunci lama `dibi.sumatra2025.rumah_rusak_berat` (mitigasi bab-01). Label: resmi.
    - *Beda satuan:* satuan 3.1.2.c "rumah/unit/paket" mencakup sarana dan prasarana permukiman dengan PJ Kementerian PKP;
      angka DIBI hanya rumah rusak berat dari satu kejadian. Hubungan aksi ini dengan stimulan rumah DSP BNPB untuk Sumatra
      tidak ditunjukkan di teks yang dibaca. Penyandingan keduanya adalah [Inferensi tim], bukan ukuran kekurangan target.
    - *Berdampingan:* kartu skenario hidromet (jenis musim hujan) mencatat 63.019 rumah rusak berat untuk kasus yang sama
      (`skenario-hidromet/kartu_skenario.csv` baris `kasus_sumatra_nov2025`). Selisih karena penyaring kategori; keduanya resmi.

**Lokus**

13. **Lokus prioritas Renas.** "Lokus prioritas tersebut ditetapkan berdasarkan beberapa kriteria, yaitu: (a) histori kejadian
    bencana; (b) hasil kajian risiko bencana multi bahaya ..." dan menjadi "pertimbangan utama dalam menentukan lokasi
    pelaksanaan rencana aksi" (§2.7, Bab II). Tabel 2.3 memuat 172 entri, 171 unik (Kab. Badung tertulis dua kali): Sumatera
    40, Jawa 66, Bali dan Nusa Tenggara 16, Kalimantan 8, Sulawesi 28, Maluku 4, Papua 9. Sumber: korpus Renas hlm. 47–48,
    dihitung ulang 24 Okt 2026 [`bnpb-2025-renas`]; kunci baru `renas.lokus_prioritas.entri_unik`, `.sumatera`, `.jawa`.
    Label: resmi (hitungan olah penyusun dari daftar teks).
14. **Uji lokus terhadap kejadian terbesar 2025.** Dari 1.342 meninggal dan hilang banjir dan longsor Sumatra (DIBI, 15 Nov–31
    Des 2025; 55 kab/kota tercatat, 33 dengan korban jiwa), 429 (32,0%) tercatat di kab/kota lokus Renas; dari sepuluh kab/kota
    dengan korban terbanyak hanya tiga lokus (Agam 233, Kota Sibolga 55, Kota Padang Panjang 46); tujuh bukan lokus (Aceh Utara
    251, Tapanuli Tengah 164, Aceh Tamiang 101, Tapanuli Selatan 97, Aceh Timur 58, Bener Meriah 44, Bireuen 43). Sumber:
    `dibi/mentah/dibi_peristiwa.json` peristiwa `sumatra2025` (ditarik 23 Okt 2026), dihitung ulang 24 Okt 2026 [`bnpb-2026-dibi`];
    kunci baru `dibi.sumatra2025.mh_di_lokus_renas`, `.mh_di_lokus_renas_persen`, `.top10_kab_lokus`. Label: resmi (olah);
    pencocokan nama kab/kota oleh penyusun.

**Unit**

15. **Renstra memakai unit OTK lama.** Renstra 2025–2029 memakai nama unit Perban 4/2019 untuk Deputi Penanganan Darurat dan
    Deputi RR, sedangkan OTK berlaku sudah berubah (Perban 11/2025) tanpa pasal peralihan; sasaran kegiatan "Persentase Daerah
    yang mendapatkan rekomendasi bantuan pendanaan pascabencana" (50% ke 70%) tercatat pada Direktorat Perencanaan RR yang
    sudah diganti. Sumber: `program-terbukti/README.md` §4 butir 4 [`pantaubencana-2026-program-terbukti`]; air bab-09 T5.6;
    kunci lama `renstra.ikk_rekomendasi_pendanaan_pasca.*`. Label: resmi; padanan unit penilaian penyusun.
16. **Peran BNPB di aksi Renas yang PJ-nya K/L lain.** BNPB sudah kontributor 2.4.4.a NSPK penurunan muka tanah (hlm. 86), PJ
    bersama 4.5.1.a Destana (2.234 ke 7.234 desa), kontributor 2.1.2.a SPAB (PJ Kemendikdasmen dan Kemenag). Sumber:
    `renas_aksi_terkait.csv`; air bab-09 T1.7. Label: resmi.

**Instrumen**

17. **Renas Tabel 4.1 Kebutuhan Regulasi** memuat, antara lain, Sasaran 1 "d. Status tingkatan bencana" dan "g. Tim Reaksi
    Cepat penanggulangan bencana multisektor"; Sasaran 2 "a. Persyaratan analisis risiko bencana"; Sasaran 4 "b. Pendanaan
    penanggulangan bencana", "d. Kerangka pemantauan dan evaluasi penanggulangan bencana", "h. Pencatatan dana penanggulangan
    bencana bersumber dari masyarakat". Sumber: korpus Renas hlm. 118–119 [`bnpb-2025-renas`]. Label: resmi.
18. **Aksi regulasi berkode di Program 4.1.1** (PJ BNPB; target dalam dokumen naskah akademis/RIA/urgensi/NSPK): 4.1.1.c regulasi
    pendanaan PB, 2 dokumen; 4.1.1.d regulasi penyelenggaraan PB, 1 dokumen; 4.1.1.h NSPK penanggulangan kedaruratan; 4.1.1.l
    NSPK analisis risiko bencana, 1 dokumen; 4.1.1.n NSPK pemulihan perumahan. Penelusuran baris 4.1.1.a–r tidak menemukan aksi
    berjudul status tingkatan bencana. Sumber: korpus Renas hlm. 94–99 [`bnpb-2025-renas`]; kunci baru
    `renas.aksi_411c.target_2029`, `renas.aksi_411l.target_2029`. Label: resmi; kolom OCR bertumpuk, angka dibaca dari urutan
    teks.
19. **Aksi pembiayaan dan monev:** 4.6.2.a penyaluran Dana Bersama ke 100 K/L, daerah, dan kelompok; 4.6.2.b 5 laporan monev
    Dana Bersama; 4.6.2.c tata kelola penyaluran Dana Bersama; 4.6.3.a 1 peraturan perluasan skema pembiayaan BMN dan BMD
    (PJ Kemenkeu, BNPB, Kemendagri); 4.6.3.b 546 daerah transfer risiko; 4.7.1.c metadata indikator kinerja PB 3 dokumen;
    4.7.1.d koordinasi strategis evaluasi sinergi multipihak 1 kegiatan per tahun. Sumber: korpus Renas hlm. 111–114;
    `renas_aksi_terkait.csv` [`bnpb-2025-renas`]; kunci lama `renas.aksi_462a.target_2029`, `.aksi_462b`, `.aksi_463a`,
    `.aksi_463b` (air bab-09); kunci baru `renas.aksi_471c.target_2029`. Label: resmi.

### Inferensi

- **[Inferensi tim] Aturan pemilahan jalur.** (a) (Tafsiran tim; Renas §4.6 tidak menyebut target sasaran dan lokus.) Target dan indikator sasaran (Tabel 2.8) serta isi Bab II (lokus prioritas
  §2.7) bukan "program dan kegiatan dalam rencana aksi", sehingga hanya dapat diubah lewat jalur berkala (≤ 2027). (b) Target
  kegiatan dan aksi baru di Bab III dapat lewat jalur berkala atau jalur bencana (≤ 2028); jalur bencana dipakai bila
  perubahannya berpijak pada peninjauan pascakejadian (Sumatra November 2025). (c) Lokasi kegiatan tahun berjalan dapat
  digeser lewat pengendalian tanpa mengubah Renas. (d) IKP dan IKS Renstra berubah lewat Perpres 80/2025, bukan lewat
  Renas; Renas tidak punya indikator kapasitas.
- **[Inferensi tim] Draf Tabel 12.3 yang berubah dari Renas PB** (jalur: B = berkala ≤ 2027; D = bencana ≤ 2028; K = pengendalian
  tanpa ubah Renas; R = Renstra lewat Perpres 80/2025. Dokumen monev: ET-2026 = laporan evaluasi tahunan Renas 2026, selesai
  paling lambat minggu terakhir TW II 2027; EPW-2027 = evaluasi paruh waktu 2027; ET-2027 = evaluasi tahunan 2027, selesai
  paling lambat TW II 2028; PPP-2026 = pemantauan pra-pelaksanaan TW IV 2026):

  | No | Kode Renas | Yang tertulis | Perubahan yang diusulkan | Jenis | Jalur | Dokumen monev | Status P7 | Bukti | Register |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | 1 | Sasaran 1.a, 1.b | Proyeksi 2025 0,22 dan 2.643 per 100.000; target "Menurun" | Target 2029 berangka dari DIBI (versi alam dan semua klasifikasi, penanda patahan 2024), dengan rumus dan penyebut tertulis | target | B | ET-2026; cadangan EPW-2027 | Usulan baru | temuan 7–8 | R-M09 |
  | 2 | Sasaran 1.c; IKP Renstra | 11.060 ke 52.000 per 100.000 lawan 6,10% ke 6,32% | Satu lintasan dengan penyebut tertulis (KD-2) | target | B (Renas); R (Renstra, konsisten RPJMN) | ET-2026; evaluasi Renstra tahun ke-3 2027 | Usulan baru | temuan 5, 9 | R-A10 |
  | 3 | (tidak ada di Renas); IKS Renstra dan RPJMN KP 08.04.01 | 90% pada 2029 tanpa alat ukur tertulis | Pilih IKD atau kelas kapasitas KRB (KD-3); bila dimuat ke Renas, lewat jalur berkala | indikator (alat ukur) | R; B bila ditambahkan ke Renas | evaluasi Renstra tahun ke-3 2027; ET-2026 | Usulan baru | temuan 5, 7, 10 | R-M04 |
  | 4 | Sasaran 4.c; RPJMN PP 08.04 | Turun 1,2% per tahun | Catatan metode dan baseline IRBI 2025 skala baru (KD-4) | target (baseline) | B | ET-2026 | Usulan baru | temuan 11 | R-M01 |
  | 5 | §2.7 Tabel 2.3 lokus prioritas | 171 lokus | Pengendalian: saran lokasi kegiatan 2027 di kab/kota terdampak berat 2025 di luar lokus; berkala: tambah kab/kota itu atau rujuk daftar perhatian per bahaya Bab 3 | lokus | K lalu B | PPP-2026 (Renja 2027); ET-2026 | Usulan baru | temuan 3, 13–14 | R-M20 |
  | 6 | 3.1.2.c rehabilitasi perumahan | 5.802 unit pada 2029 | Tinjau target setelah Sumatra 2025 ([Inferensi tim] pembanding 62.956 rumah rusak berat, beda satuan dan cakupan) | target kegiatan | D (atau B) | ET-2026 atau ET-2027; EPW-2027 | Usulan baru | temuan 12 | R-M17 |
  | 7 | Unit Renstra | Unit OTK lama | Selaraskan nama unit dengan Perban 11/2025 | unit | R | evaluasi Renstra tahun ke-3 2027 | Sudah ada, perlu dikembangkan (lampiran Penyelarasan) | temuan 15 | R-M10 |
  | 8 | 4.1.1.l; Tabel 4.1 Sasaran 2 a | NSPK analisis risiko, 1 dokumen | Dilaksanakan lewat Progsun butir 3; tidak perlu ubah Renas | instrumen | tanpa ubah Renas | laporan triwulanan Progsun | Sudah ada, perlu dikembangkan | temuan 17–18; P4 | R-M11 |
  | 9 | Tabel 4.1 Sasaran 1 d | "Status tingkatan bencana" tanpa aksi berkode | Tambah aksi Perpres status dan tingkatan bencana di 4.1.1 (tafsir MK 261) | instrumen (kegiatan baru) | B (cadangan D) | ET-2026 | Usulan baru | temuan 17–18; P4 | R-M06 |
  | 10 | 4.6.2.c | Tata kelola penyaluran Dana Bersama | Muat syarat analisis manfaat-biaya untuk usulan prabencana | instrumen | tanpa ubah Renas (pelaksanaan) | laporan monev Dana Bersama 4.6.2.b | Usulan baru | temuan 19; P3, P4 | R-M18 |
  | 11 | 1.2.1, 4.1.1.h (kedaruratan) | Tanpa pedoman keadaan tertentu faktor sosial dan pascakonflik | Pedoman Kepala BNPB (perubahan Perban 5/2018) | instrumen | tanpa ubah Renas (pelaksanaan) | ET-2026 (catatan pelaksanaan) | Usulan baru (KERANGKA M08) | P4 | R-M03 |

  Hitungan draf: 11 baris; jalur berkala 6 (No 1, 2, 3, 4, 5, 9), jalur bencana 1 (No 6, boleh juga berkala), Renstra 3 (No 2,
  3, 7), tanpa ubah Renas 3 (No 8, 10, 11), pengendalian 1 (No 5). KD-2, KD-3, KD-4 ada di No 2, 3, 4 dan hanya berjalur
  berkala atau Renstra, sesuai KERANGKA.
- **[Inferensi tim] Mengapa lokus dan target perumahan.** Lokus Renas dipilih dengan kriteria histori dan KRB sebelum November
  2025; uji temuan 14 menunjukkan dua pertiga korban kejadian terbesar 2025 jatuh di luar lokus. Itu tidak berarti pemilihan
  lokus keliru (satu kejadian tidak menguji metode), tetapi cukup sebagai alasan memakai pengendalian untuk Renja 2027 tanpa
  menunggu perubahan Renas. Target 3.1.2.c sebaliknya adalah kegiatan rencana aksi (Renas ditetapkan Januari 2025, sebelum kejadian)
  yang perubahan targetnya dipicu kejadian itu, jadi tepat untuk jalur bencana.
- **[Inferensi tim] Urutan waktu.** Bila KD-1 (a) jatuh November 2026, PPP-2026 (triwulan IV 2026) adalah kesempatan pertama
  memasukkan saran lokasi ke Renja K/L 2027, dan ET-2026 (tenggat akhir Juni 2027) adalah kesempatan terakhir yang masih
  menyisakan sisa tahun 2027 untuk menetapkan perubahan berkala. EPW-2027 juga jatuh pada 2027, sehingga bila rekomendasi baru
  masuk di sana, waktu penetapan perubahan berkala menjadi sangat sempit. Ini dasar butir (7) keputusan 14 hari KERANGKA §6,
  yang belum punya ID di draf register bab-13 (usul ID baru; pemilik register yang memutus).

### Celah

- Laporan monev Renas 2025 (evaluasi tahunan pertama, tenggat akhir TW II 2026) tidak ditemukan; tidak diketahui apakah 1.a
  dan 1.b 2025 sudah dilaporkan. **Permintaan:** Direktorat Pengembangan Strategi PB, Biro Perencanaan.
- Rumus dan penyebut resmi 1.a dan 1.b tidak tertulis di teks yang dibaca. **Penyajian:** rasio DIBI lawan proyeksi berpil olah
  dan catatan definisi; versi alam di depan, versi semua klasifikasi berdampingan.
- Uji lokus hanya untuk satu kejadian; kejadian besar sebelum penetapan lokus tidak diuji. **Penyajian:** satu kejadian, tanpa
  generalisasi.
- Metadata IKD (Perka 3/2012) dan rumus IKS Renstra tidak dibaca; definisi Indeks Pemulihan Pascabencana (3.a) dan
  "implementasi strategi PRB" (4.a) tidak dibaca. **Penyajian:** KD-3 ditulis sebagai pilihan alat ukur, bukan penilaian mutu
  alat; 3.a dan 4.a dikutip tanpa tafsir.
- Lampiran IV Perpres 80/2025 (tata cara rinci perubahan Renstra-KL) tidak dibuka.

---

## P3. Lapisan dana mana untuk kejadian sering, berat, dan ekstrem?

### Inti

Dengan rumah rusak DIBI dikali stimulan Rp50/25/10 juta (rendah) sampai Rp60/30/15 juta (tinggi), kebutuhan rumah tahunan
batas bawah 2015–2025 berada di median Rp1,60–2,05 T (lapisan sering) dan persentil 90 Rp6,76–8,57 T (lapisan berat); lapisan
ekstrem tidak boleh lebih ringan dari tahun tercatat terberat 2018 (Rp9,46–11,90 T) dan dari kejadian tunggal terberat
Lombok 2018 (Rp5,69–7,16 T, sedikit di atas Sumatra 2025 dan hampir dua kali Sulteng 2018). Angka itu batas bawah: rata-rata
kerugian ekonomi langsung 2000–2016 menurut Strategi PARB Kemenkeu sekitar Rp22,8 T per tahun, dan nilai kerusakan dan
kerugian resmi Cianjur, Lombok, dan Sulteng 1,06 sampai 3,81 kali ukuran stimulan. Pelapisannya sudah resmi di Strategi PARB
(retensi lewat APBN/APBD dan pooling fund untuk yang sering dan kecil; transfer risiko untuk yang besar); bagi BNPB lapisan
sering dipikul BTT APBD dan DSP, lapisan berat menambah Dana Bersama dan hibah RR, lapisan ekstrem menambah dana utama Dana
Bersama dan transfer risiko, dan mitigasi prabencana dibiayai APBN K/L, APBD, dana desa, dan Dana Bersama prabencana, bukan DSP;
dana kontinjensi APBN disediakan untuk kesiapsiagaan prabencana (PP 22/2008 Pasal 6 ayat (1)), bukan mitigasi.

### Temuan bersumber

**Profil kerugian batas bawah dan lantainya**

1. **Profil tahunan 2015–2025** (rumah RB/RS/RR DIBI semua jenis, cakupan bencana): median Rp1,596–2,046 T (tahun 2019);
   persentil 90 Rp6,760–8,570 T (tahun 2025); tahun terberat 2018 Rp9,463–11,902 T; jumlah 11 tahun Rp29,09–37,14 T (rata-rata
   Rp2,64–3,38 T per tahun); 2018 dan 2025 bersama 55,1% dari jumlah. Sumber: `turunan/profil_kerugian.csv`
   [`pantaubencana-2026-profil-kerugian`]; registri `kerugian.nasional.lapisan_sering`, `.lapisan_berat`; kunci baru
   `kerugian.nasional.tahun_2018`, `.jumlah_2015_2025`, `.rerata_2015_2025`. Label: asumsi-kebijakan (rumah dari DIBI,
   resmi; pengali stimulan pilihan penyusun).
2. **Kejadian tunggal, rumus sama** (urut dari terberat; dihitung ulang 24 Okt 2026 dari `dibi/kejadian_besar.csv` versi DIBI):
   Padang 2009 Rp7,48–9,43 T (RB 119.005, RS 0, RR 152.535); Lombok 2018 Rp5,69–7,16 T (RB 75.160, RS 33.951, RR 108.744;
   jendela 29 Jul–30 Sep 2018, NTB dan Bali); Sumatra 2025 Rp5,60–7,06 T; Sulteng 2018 Rp2,90–3,62 T; Cianjur 2022
   Rp1,37–1,72 T; Seroja 2021 Rp0,88–1,18 T. Dalam periode profil 2015–2025, Lombok 2018 adalah yang terberat. Sumber:
   [`bnpb-2026-dibi`]; `profil_kerugian.csv` baris `ekstrem_analog_*`; kunci baru `kerugian.nasional.ekstrem_sulteng2018`,
   `.ekstrem_sumatra2025`, `kerugian.lombok2018.stimulan_batas_bawah`, `kerugian.padang2009.stimulan_batas_bawah`. Label:
   asumsi-kebijakan. Catatan: RS Padang 2009 tercatat 0 di DIBI; Yogyakarta 2006 dan Aceh 2004 tanpa baris rumah di tabel
   itu.
   - *Berdampingan:* Sumatra 2025 versi kartu skenario (jenis musim hujan) Rp5,61–7,06 T (kunci lama
     `hidromet.sumatra2025.materiil_batas_bawah`, mitigasi bab-07); versi `profil_kerugian.csv` (kategori banjir dan longsor)
     Rp5,60–7,06 T.
3. **Lantai kerugian kejadian (besaran (b) prinsip 9), angka tercatat berdampingan:** Aceh 2004 kerugian langsung Rp51,4 T dan
   Yogyakarta 2006 Rp26,1 T menurut Strategi PARB (hlm. PDF 23); Yogyakarta 2006 Rp29,1 T menurut penilaian awal Bappenas
   (kerusakan Rp22,75 T, kerugian Rp6,40 T); Sulteng 2018 Rp13,82 T (BNPB, sementara); Lombok 2018 kebutuhan R3P Rp11,44 T
   (Kemenko PMK; kebutuhan, bukan kerusakan dan kerugian); Cianjur 2022 Rp4,55 T (R3P, contoh dokumen). Sumber:
   [`kemenkeu-bkf-2018-parb`]; berkas bukti mitigasi bab-06 temuan 12 [`bappenas-2006-dala-yogya`, `bnpb-2018-kerugian-sulteng`,
   `kemenkopmk-2024-rehabrekon-lombok`, `cianjur-2022-r3p`]; kunci baru `kemenkeu.parb2018.aceh2004_kerugian`,
   `kemenkeu.parb2018.yogya2006_kerugian`; kunci lama `bappenas.yogya2006.kerusakan_kerugian`,
   `bnpb.sulteng2018.kerusakan_kerugian`, `kemenkopmk.lombok2018.kebutuhan_r3p`, `r3p.cianjur2022.kerusakan_kerugian`. Label:
   resmi (nilai nominal tahun kejadian; Sulteng sementara; Cianjur contoh dokumen).
   - *Bertentangan, ditulis berdampingan:* Yogyakarta 2006 Rp26,1 T (Kemenkeu, PARB) lawan Rp29,1 T (Bappenas, penilaian
     awal). Sumber PARB untuk angka kerugian per kejadian tidak dirinci di halaman itu.
4. **Pembanding resmi tingkat tahunan.** "Antara tahun 2000-2016, rata-rata kerugian ekonomi langsung berupa rusaknya bangunan
   dan bukan bangunan akibat bencana alam ... setiap tahunnya mencapai sekitar Rp. 22,8 triliun" (hlm. PDF 15, 22; rinci Rp22,85 T
   di hlm. PDF 35, bersumber penelitian Meilano dkk. 2018); gempa rata-rata Rp7,56 T, karhutla Rp5,32 T, banjir Rp4,64 T per tahun;
   "Bank Dunia memperkirakan kerugian ekonomi yang dapat diidentifikasi ... hanya menggambarkan sekitar 60% dari nilai kerugian
   ekonomi yang sesungguhnya terjadi" (hlm. PDF 23). Sumber: Kemenkeu BKF, Strategi Pembiayaan dan Asuransi Risiko Bencana
   (2018, revisi; PDF SHA-1 `8911e1f7a590`), diakses 24 Okt 2026; diunduh ulang dan keenam angka PARB bab ini (Rp22,8 T,
   60%, Aceh Rp51,4 T, Yogyakarta Rp26,1 T, ambang Rp4 T, 20%) dicocokkan ke teks pada halaman PDF yang dikutip; salinan
   `riset/mentah/kemenkeu-bkf-2018-parb.pdf` (tidak dilacak git) dan teks `riset/mentah/kemenkeu-bkf-2018-parb.txt`
   (pdftotext -layout, halaman dipisah form feed) [`kemenkeu-bkf-2018-parb`]; kunci baru
   `kemenkeu.parb2018.kerugian_rerata_2000_2016`, `kemenkeu.parb2018.kerugian_teridentifikasi_porsi`. Label: resmi (dokumen
   Kemenkeu yang mengutip penelitian dan Bank Dunia).
5. **DIBI memakai rumus stimulan yang sama.** Kolom `estimasi_kerugian_rumah` di respons dasbor DIBI sama dengan RB × 60 + RS ×
   30 + RR × 15 + rumah terendam × 1 (satuan disimpulkan juta rupiah) pada 4.146 dari 4.146 baris peristiwa 25 kejadian besar
   2009–2025; 3.541 baris persis 60/30/15, sisanya berselisih tepat sebesar jumlah rumah terendam. Sumber:
   `dibi/mentah/dibi_peristiwa.json` (ditarik 23 Okt 2026), dihitung ulang 24 Okt 2026 [`bnpb-2026-dibi`]; kunci baru
   `dibi.estimasi_kerugian_rumah.baris_diuji`, `.baris_cocok`. Label: resmi (olah); satuan disimpulkan, bukan didokumentasikan.
6. **Sumber skema stimulan.** Menko PMK, 21 November 2023 (siaran 22 November 2023): sejak 2010 bantuan rumah rusak dari BNPB
   "Rp 50 juta untuk rumah rusak berat, Rp 25 juta untuk rumah rusak sedang, dan Rp 10 juta untuk rumah rusak ringan", diusulkan
   menjadi Rp60, Rp30, dan Rp15 juta; siaran yang sama mengutip Menko "Bapak Presiden menghitung akhirnya dinaikkan menjadi 60
   juta, 30 juta, 15 juta", jadi besaran itu dinaikkan atas arahan Presiden, bukan sekadar usulan; implementasinya lewat penyusunan Peraturan Badan tentang standar bantuan stimulan. Sumber:
   https://kemenkopmk.go.id/node/4634 (dibuka ulang 24 Okt 2026) [`kemenkopmk-2023-standar-stimulan`]; kunci baru
   `stimulan.rumah.*.skema_2010`, `.skema_2023`. Label: resmi (siaran resmi pemerintah; teks peraturan besaran tidak
   ditemukan). Label ini berlaku untuk besaran stimulan sendiri; profil kerugian yang mengalikannya tetap asumsi-kebijakan karena
   pilihan pengalinya oleh penyusun.
   - *Dibantah sebagian oleh:* berkas bukti mitigasi bab-03 Celah (besaran stimulan hanya dari siaran dan berita). Siaran kini
     dibuka langsung; teks peraturan yang menetapkan besaran tetap tidak ditemukan; indeks JDIH mencatat Juklak BNPB 5/2024
     (10 Juni 2024, Berlaku) tanpa berkas teks [`bnpb-2024-juklak5-stimulan`].
   - *Berdampingan (sekunder, bukan angka utama):* Kepala BNPB dalam Rapat Tingkat Menteri, Kamis 2 Juli 2026, mengusulkan
     stimulan rumah rusak berat Sumatra naik "dari Rp60 juta menjadi Rp70 juta - Rp80 juta per unit". Sumber: ANTARA,
     https://www.antaranews.com/berita/5632767/bnpb-minta-tambah-biaya-bangun-rumah-penyintas-banjir-sumatera (dibuka ulang
     24 Okt 2026) [`antara-2026-stimulan-sumatra`]. Label: sekunder; hanya baris kepekaan.
7. **Kerugian kejadian lawan stimulan.** Cianjur 2022 perumahan Rp3,21 T (R3P) lawan stimulan Rp3,03 T dengan jumlah rumah R3P
   (1,06 kali); Sulteng 2018 perumahan Rp7,95 T dan total Rp13,82 T lawan stimulan Rp3,62 T (2,19 dan 3,81 kali); Lombok 2018
   kebutuhan R3P Rp11,44 T lawan Rp7,16 T (1,60 kali). Sumber: berkas bukti mitigasi bab-06 temuan 12; kunci lama
   `r3p.cianjur2022.perumahan`, `.rasio_perumahan_stimulan`, `bnpb.sulteng2018.perumahan`. Label: resmi (angka kerugian);
   rasio olah.
8. **Seri CKAN nilai kerusakan dan kerugian (ditarik ulang bab ini).** "Rekapitulasi Nilai Kerusakan dan Kerugian Akibat Bencana
   Berdasarkan Proposal Pemerintah Daerah Tahun 2017-2024": 310 baris; jumlah Rp109,34 T (kerusakan Rp73,00 T, kerugian Rp36,35
   T). Per tahun proposal: 2017 Rp0,23 T (4 baris); 2018 Rp11,26 T (66); 2019 Rp19,71 T (54); 2020 Rp11,25 T (41); 2021 Rp4,55 T
   (27); 2022 Rp13,91 T (43); 2023 Rp27,79 T (45); 2024 Rp20,63 T (30). Mutu: 43 baris bertahun kejadian rentang ("2018 -
   2019"); 10 baris bernilai nol; 6 baris dengan nilai kerugian sama persis dengan nilai kerusakan (antara lain Donggala dan Kota
   Palu, proposal 2023, kejadian 2018). Sumber:
   https://data.bnpb.go.id/api/3/action/datastore_search?resource_id=fefc94c0-5275-4d12-899e-1d517f6c8f7c&limit=1000 (diakses
   24 Okt 2026; respons SHA-1 `a4f23da0041b`) [`bnpb-2026-ckan-kerusakan-kerugian`]; kunci baru
   `ckan.kerusakan_kerugian_proposal.baris`, `.jumlah_2017_2024`, `.baris_tahun_rentang`, `.baris_kerugian_sama`. Label:
   resmi (olah); nilai pengajuan pemda, bukan hasil verifikasi.
   - *Bertentangan, ditulis berdampingan:* baris Palu, Sigi, dan Donggala untuk kejadian 2018 berjumlah Rp43,49 T (6 baris,
     tahun proposal 2020–2024; Kota Palu dua kali, Rp13,96 T pada 2023 dan Rp5,22 T pada 2024), dan seluruh baris Sulawesi
     Tengah kejadian 2018 tahun proposal 2020–2024 Rp44,16 T, lawan Rp13,82 T angka sementara BNPB Oktober 2018. Kabupaten
     Batang (Jawa Tengah) kejadian 2018 tercatat Rp11,11 T dalam satu baris. Lombok 2018 hanya Lombok Barat Rp0,07 T dan
     Lombok Tengah Rp0,85 T; Cianjur 2022 tidak ada. Kunci baru `ckan.kerusakan_kerugian_proposal.palu_sigi_donggala_2018`,
     `.sulteng2018`. Label: resmi (data); penilaian "berulang dan perlu verifikasi" oleh penyusun.
9. **Renas 2.a identik dengan sasaran utama PN 8 RPJMN** ("Proporsi Kerugian Ekonomi Langsung Akibat Bencana Relatif terhadap
   PDB", baseline 0,140 (2022), target 0,137 (2025) dan 0,135 (2029)). Sumber: riset E11b, Lampiran I Perpres 12/2025 hlm. 201
   [`ri-2025-perpres12-rpjmn`]; kunci lama `rpjmn.pn8_kerugian_pdb.baseline_2022`, `renas.indikator_2a.*`. Label: resmi.

**Dasar pelapisan dan instrumen dana per fase**

10. **Pelapisan resmi Kemenkeu.** "Layering atau klasifikasi risiko adalah pembagian jenis risiko berdasarkan frekuensi terjadinya
    bencana dan dampak yang diakibatkan ... yang dibagi menjadi layer rendah, sedang, dan tinggi" (hlm. PDF 52); bencana sering
    menurut catatan BNPB 2009–2018: banjir, tanah longsor, cuaca ekstrem; dampak besar (di atas Rp4 triliun): gempa bumi,
    tsunami, banjir; strategi dibagi menjadi pembiayaan yang ditanggung Pemerintah (APBN/APBD, pooling fund, pinjaman
    kontinjensi) dan pemindahan risiko lewat asuransi, ditambah bantuan dari luar pemerintah untuk risiko residual (hlm. PDF
    54–55); "Pemerintah menanggung atau menyerap risiko melalui pembiayaan APBN dan/atau APBD untuk bencana yang sering terjadi
    dan/atau menghasilkan dampak kerugian kecil" (hlm. PDF 56). Sumber: [`kemenkeu-bkf-2018-parb`]; kunci baru
    `kemenkeu.parb2018.ambang_dampak_besar`. Label: resmi.
11. **Kapasitas dana cadangan APBN** "secara rata-rata mendekati atau di bawah 20% dari nilai kerugian ekonomi" (periode yang
    ditelaah dokumen, 2005–2017) (hlm. PDF 46). Sumber: [`kemenkeu-bkf-2018-parb`]; kunci baru
    `kemenkeu.parb2018.dana_cadangan_porsi_maks`. Label: resmi. Nominal dana cadangan di halaman yang sama tidak disalin (P5).
12. **DSP tiga keadaan.** "DSP digunakan selama masa keadaan darurat bencana, keadaan tertentu, dan pertimbangan adanya risiko
    Bencana berdampak luas yang ditetapkan oleh Kepala BNPB" (Perban 4/2020 Pasal 20 ayat (1)); laporan perkembangan paling lambat
    tanggal 5 bulan berikutnya, pertanggungjawaban paling lambat 3 bulan setelah status berakhir (Pasal 21). Sumber: korpus
    `perban-nomor-4-tahun-2020.json` hlm. 16, dibuka ulang [`bnpb-2020-dsp`]; kunci lama `perban2020_4.dsp.laporan_tanggal`,
    `.pertanggungjawaban_bulan` (air bab-09). Label: resmi.
    - *Berdampingan:* PP 22/2008 Pasal 6 ayat (2) menempatkan DSP "untuk kegiatan pada saat tanggap darurat" dan Pasal 17 ayat
      (2) membatasinya pada delapan jenis pengadaan [`ri-2008-pp22`]; kunci lama `pp22_2008.dsp.jenis_pengadaan`. Hubungan hukum
      keduanya tidak ditelaah.
13. **Dana kontinjensi, hibah pascabencana, dan pemda.** "Dana kontinjensi bencana ... disediakan dalam APBN untuk kegiatan
    kesiapsiagaan pada tahap prabencana" (PP 22/2008 Pasal 6 ayat (1)); pemda dapat menyediakan DSP di anggaran BPBD (ayat (3));
    bantuan pascabencana berpola hibah atas permohonan pemda melalui BNPB (Pasal 23); BTT APBD untuk keadaan darurat termasuk
    bencana alam, nonalam, sosial, dan KLB (PP 12/2019 Pasal 68–69). Sumber: riset E11e; air bab-09 T3.2, T3.5 [`ri-2008-pp22`,
    `ri-2019-pp12`]. Label: resmi.
14. **Dana Bersama.** Disalurkan pada prabencana, darurat, pascabencana, dan transfer risiko (Perpres 75/2021 Pasal 6 ayat (2));
    prabencana dan pascabencana "setelah adanya permohonan tertulis dari Pemerintah Daerah dan/atau kementerian negara/lembaga
    kepada BNPB" (Pasal 8 ayat (1)); BNPB menelaah setelah berkoordinasi dengan Kemenko PMK, meminta pertimbangan Kemenkeu,
    Bappenas, Kemendagri, lalu Kepala BNPB menerbitkan rekomendasi kepada Menteri Keuangan (Pasal 8 ayat (2)–(4)); rekening dan
    penyaluran di BPDLH (PMK 28/2025 Pasal 3, 27). Kepala BNPB menetapkan prioritas dengan mempertimbangkan kesesuaian Renas/RPBD,
    "kegiatan pada daerah dengan indeks risiko bencana tinggi", dan kegiatan dalam dokumen R3P (Perban 1/2026 Pasal 7); kriteria
    prabencana hanya kesesuaian dengan Renas dan RKP (K/L) atau RKPD, RPBD, dan/atau SPM (pemda) (Pasal 14 ayat (4)); permohonan
    pascabencana "wajib merujuk pada rencana rehabilitasi dan rekonstruksi pascabencana yang telah ditetapkan oleh pejabat yang
    berwenang" dan diajukan pada masa berlakunya (Pasal 14 ayat (5)); tidak ada syarat analisis manfaat-biaya (kata "manfaat"
    hanya muncul sebagai "penerima manfaat" dan di konsiderans). BKF: pemda dapat menyiapkan usulan prabencana dan pascabencana
    untuk TA 2027; urutan pemakaian "Dana Siap Pakai (On Call) → Dana Cadangan → Hasil Investasi → Dana Utama" (istilah PFB,
    bukan DSP BNPB). Sumber: riset E11c; korpus `perban-nomor-1-tahun-2026.json` hlm. 4–7, dibuka ulang 24 Okt 2026; air bab-09
    T3.7–T3.11 [`ri-2021-perpres75`, `kemenkeu-2025-pmk28`, `bnpb-2026-dana-bersama`, `kemenkeu-bkf-2026-pfb`]. Label: resmi.
15. **Konflik sosial.** "Pendanaan Penghentian Konflik dan rekonsiliasi pascakonflik diambil dari dana siap pakai pada APBN
    dan/atau dana belanja tidak terduga pada APBD oleh Pemerintah dan/atau Pemerintah Daerah sebagai unsur Satuan Tugas
    Penyelesaian Konflik Sosial" (UU 7/2012 Pasal 55 ayat (1)); keadaan tertentu bagi pemda dalam rekonsiliasi pascakonflik "dan
    memiliki kapasitas fiskal sangat rendah atau rendah" (Perpres 46/2026 Pasal 3 ayat (2) huruf c); PMK 97/2025 menempatkan 351
    dari 508 kab/kota dan 24 dari 38 provinsi di kelas rendah atau sangat rendah. Sumber: `lembaga/mentah/teks/uu-7-2012.json.gz`
    hlm. 27 dan korpus `perpres-nomor-46-tahun-2026.json` hlm. 3, dibuka ulang [`ri-2012-uu7`, `ri-2026-perpres46`,
    `kemenkeu-2025-pmk97`]; kunci lama `pmk97_2025.kab_rendah_sangat_rendah`, `.prov_rendah_sangat_rendah` (mitigasi bab-09).
    Label: resmi.
16. **Masalah yang diakui Renas.** "potensi ketidakjelasan akuntabilitas pemanfaatan dana Biaya Tidak Terduga (BTT)" dan "belum
    tersinkronisasinya pemahaman dan pengelolaan dana untuk penanganan darurat bencana yang bersumber dari ... (BTT) dan ... (Dana
    Siap Pakai/DSP)"; "Belum optimalnya penggunaan dana desa untuk program ketangguhan bencana masyarakat desa" (Renas hlm. 26;
    C02). Fokus dana desa 2026 memuat "penguatan Desa berketahanan iklim dan tangguh bencana" (Permendes PDT 16/2025 Pasal 2
    ayat (1) huruf b). Sumber: korpus Renas hlm. 26, dibuka ulang [`bnpb-2025-renas`]; air bab-09 T3.12
    [`kemendes-2025-permendes16`]. Label: resmi.
17. **Program pembiayaan di kompendium (bukan "terbukti"):** P23 asuransi risiko dan pooling (CCRIF, ARC; padanan Dana Bersama
    dan asuransi BMN, "Sudah ada, perlu dikembangkan"): kekuatan sedang, "Program dengan syarat (bukti sedang)", syarat pemicu
    parametrik cocok dengan kerugian nyata dan rencana penggunaan dana disiapkan sebelum bencana. P24 hibah mitigasi FEMA dengan
    syarat analisis manfaat-biaya: kekuatan sedang, "Rujukan tata kelola", jenis evaluasi model (rasio 6:1 hasil pemodelan NIBS);
    padanan Indonesia "Usulan baru". P09 rehabilitasi rumah pascagempa Lombok 2018 (stimulan, pokmas): kekuatan lemah,
    "Pelajaran, bukan teladan" (laporan sendiri; data progres tidak konsisten dalam satu rilis). P07 Rekompak dan P08 BRR: lemah,
    "Rujukan tata kelola". Sumber: `program-terbukti/kompendium_program.csv` baris P07, P08, P09, P23, P24
    [`pantaubencana-2026-program-terbukti`, `fema-2018-mitsaves`]. Label: asumsi-kebijakan (posisi rubrik); rasio FEMA
    estimasi-model.

### Inferensi

- **[Inferensi tim] Draf Gambar 12.3 bagian A: lapisan kejadian × sumber dana** (diagram aliran berikon tanpa lebar sebanding,
  G21; nilai rentang hanya di Gambar 12.2):

  | Lapisan | Dasar ukuran (batas bawah, asumsi-kebijakan) dan lantai tercatat | Sumber dana yang terbuka | Pemicu | Pengguna |
  | --- | --- | --- | --- | --- |
  | Prabencana | bukan kerugian | APBN K/L; APBD; dana desa 2026; Dana Bersama prabencana; dana kontinjensi bencana APBN khusus kesiapsiagaan (PP 22/2008 Pasal 6 ayat (1)), bukan mitigasi; Dana Bersama prabencana (permohonan ke BNPB) | Renas, RPBD, SPM; daftar perhatian; prioritas "indeks risiko tinggi" | K/L, pemda, desa |
  | Sering (PARB: sering atau kecil) | Tahun median Rp1,60–2,05 T | BTT APBD; DSP BPBD bila dianggarkan; DSP BNPB | Status siaga atau tanggap darurat oleh kepala daerah | Pemda, BPBD, BNPB |
  | Berat | Sampai persentil 90 Rp6,76–8,57 T per tahun | Lapisan sering ditambah Dana Bersama darurat (dana cadangan, PMK 28/2025); hibah RR (PP 22/2008 Pasal 23; Perban 4/2024); Dana Bersama pascabencana (wajib R3P ditetapkan) | Status provinsi atau nasional; keadaan tertentu (Perpres 46/2026) | BNPB, pemda, K/L |
  | Ekstrem (PARB: dampak besar di atas Rp4 T; risiko residual) | Lantai tahunan: 2018 Rp9,46–11,90 T. Lantai kejadian tunggal 2015–2025: Lombok 2018 Rp5,69–7,16 T (Sumatra 2025 Rp5,60–7,06 T); 30 tahun: Padang 2009 Rp7,48–9,43 T. Lantai kerugian tercatat 30 tahun: Aceh 2004 Rp51,4 T (PARB) | Lapisan berat ditambah hasil investasi dan dana utama Dana Bersama (urutan BKF); transfer risiko (asuransi BMN, Renas 4.6.3.a); APBN lewat mekanisme anggaran yang berlaku; bantuan luar pemerintah (risiko residual, PARB) | Status nasional menurut tafsir MK (minimal 3 dari 5 indikator, korban wajib) | Pemerintah Pusat |
  | Konflik sosial | kerugian rupiah tidak tersedia | DSP APBN dan BTT APBD oleh unsur Satgas (UU 7/2012 Pasal 55); keadaan tertentu huruf c | Status keadaan konflik; rekonsiliasi pascakonflik | Satgas, pemda, BNPB |

  Baris kepekaan di Gambar 12.2: (a) stimulan Rp70–80 juta per rumah rusak berat (usulan Juli 2026, sekunder); (b) pengali
  kerugian nyata 1,06–3,81 kali (pembanding, tidak dikalikan ke profil); (c) pembanding tahunan resmi Rp22,8 T (PARB, 2000–2016,
  semua bangunan dan bukan bangunan).
- **[Inferensi tim] Draf Gambar 12.3 bagian B: per sumber dana (kolom B5.21: sumber, dasar hukum, pemicu pencairan, pengelola;
  urutan tumpukan dari darurat ke transfer):**

  | Sumber | Dasar hukum | Pemicu pencairan | Pengelola |
  | --- | --- | --- | --- |
  | BTT APBD; DSP di anggaran BPBD | PP 12/2019 Pasal 68–69; PP 22/2008 Pasal 6 ayat (3) | Keadaan darurat daerah | Pemda (BPKAD), BPBD |
  | DSP APBN | PP 22/2008 Pasal 6 ayat (2), 17; Perban 4/2020 Pasal 20 | Status darurat, keadaan tertentu, risiko berdampak luas ditetapkan Kepala BNPB | BNPB |
  | Dana kontinjensi bencana APBN | PP 22/2008 Pasal 6 ayat (1) | Kesiapsiagaan prabencana | APBN (pengelola tidak dirinci di teks yang dibaca) |
  | Dana Bersama (PFB) | Perpres 75/2021 Pasal 6, 8; PMK 28/2025; Perban 1/2026 | Permohonan tertulis, telaah BNPB, rekomendasi Kepala BNPB ke Menkeu | Kemenkeu (BPDLH); telaah BNPB |
  | Hibah RR | PP 22/2008 Pasal 23; Perban 4/2024 | Permohonan pemda melalui BNPB | BNPB, Kemenkeu |
  | Asuransi BMN dan BMD | Renas 4.6.3.a (perluasan skema, PJ Kemenkeu, BNPB, Kemendagri); PARB | Kerusakan aset tertanggung | Kemenkeu |
  | Dana desa | Permendes PDT 16/2025 Pasal 2 ayat (1) huruf b | Musyawarah desa, fokus desa tangguh bencana | Pemerintah desa |
  | DAK | dasar dan menu PB 2026 tidak ditemukan | tidak ditulis | tidak ditulis |

- **[Inferensi tim] Lantai lapisan ekstrem.** KERANGKA memilih Sulteng 2018 sebagai analog ekstrem gempa; dengan ukuran yang sama
  Lombok 2018 hampir dua kali lebih berat (Rp5,69–7,16 T lawan Rp2,90–3,62 T), sehingga prinsip lantai mengharuskan Lombok 2018
  sebagai analog kejadian tunggal 2015–2025 dan Sumatra 2025 sebagai analog hidrometeorologi. Sulteng 2018 tetap relevan
  sebagai analog korban (4.140 meninggal dan 705 hilang), bukan sebagai analog kebutuhan rumah. Untuk periode acuan geologi 30
  tahun, lantai stimulan adalah Padang 2009 dan lantai kerugian kejadian adalah Aceh 2004 (Rp51,4 T, PARB). Ketiga ukuran
  (stimulan rumah, kerugian kejadian, aset terpapar) tetap dipisah (prinsip 9).
- **[Inferensi tim] Satu kejadian setara satu tahun berat.** Lombok 2018 atau Sumatra 2025 sendirian mendekati lapisan berat
  tahunan (persentil 90 adalah tahun 2025 itu sendiri), sedangkan rata-rata tahunan profil (Rp2,64–3,38 T) hanya sekitar
  sepersepuluh rata-rata kerugian ekonomi langsung PARB (Rp22,8 T), dengan periode dan cakupan berbeda. Artinya lapisan berat
  dan ekstrem tidak dapat ditanggung lapisan sering, dan profil ini tidak boleh dibaca sebagai kerugian ekonomi. Pertanyaan
  pembiayaan bagi Kepala BNPB adalah urutan pemakaian dana di atas DSP, yang sudah tertulis di Strategi PARB dan halaman PFB
  BKF, bukan instrumen baru.
- **[Inferensi tim] R3P sebagai gerbang dana pascabencana.** Karena permohonan Dana Bersama pascabencana wajib merujuk R3P yang
  ditetapkan (Perban 1/2026 Pasal 14 ayat (5)), dokumen R3P Lombok dan Sulteng yang tidak ditemukan di sumber terbuka dan R3P
  Cianjur yang hanya berstatus contoh bukan sekadar soal keterbukaan, tetapi soal akses dana. Ini memperkuat R-M17 (tarik data
  kerusakan R3P) dari sisi pembiayaan.
- **[Inferensi tim] Prioritas "indeks risiko tinggi" bergantung pada KD-4.** Perban 1/2026 Pasal 7 ayat (2) huruf b memakai
  indeks risiko sebagai pertimbangan prioritas; tanpa catatan metode IRBI 2025 dan kelas resmi per kab/kota, kriteria itu
  dapat dibaca beragam. KD-4 karena itu juga keputusan pembiayaan, bukan hanya pengukuran.
- **[Inferensi tim] Mengapa profil tetap batas bawah dan Renas 2.a tetap belum terukur.** Kolom DIBI `estimasi_kerugian_rumah`
  memakai rumus yang sama, jadi profil ini adalah ukuran BNPB sendiri untuk rumah. Seri CKAN proposal pemda tidak dapat
  menggantikannya untuk Renas 2.a: cakupannya pengajuan, satu kejadian muncul di beberapa tahun proposal, ada nilai kerugian
  yang menyalin nilai kerusakan, dan ada nilai yang perlu diverifikasi (Batang 2018). Renas 2.a ditulis sebagai permintaan
  data (celah 10), dengan usul agar seri CKAN dibersihkan menurut tahun kejadian dan dipasangkan dengan R3P yang ditetapkan.
- **[Inferensi tim] Syarat manfaat-biaya.** Satu-satunya rujukan untuk syarat itu (P24) berposisi rujukan tata kelola dengan
  rasio hasil model; tidak ada angka tercatat Indonesia yang dapat disandingkan dengan rasio itu, jadi naskah menulisnya
  sebagai rujukan tata kelola, bukan bukti bahwa Dana Bersama akan lebih efektif, dan rasio 6:1 tidak tampil sebagai angka
  manfaat.

### Celah

- Realisasi Dana Bersama (permohonan, rekomendasi Kepala BNPB, penyaluran), pemakaian dana kontinjensi, dan BTT per daerah tidak
  ditemukan. **Permintaan:** Direktorat Pengembangan Strategi PB, tim penelaahan Dana Bersama, BPDLH, Kemendagri.
- Dasar hukum dan menu DAK untuk penanggulangan bencana tahun 2026 tidak ditemukan dalam penelusuran 24 Okt 2026. **Penyajian:**
  DAK tidak diberi pasal di Gambar 12.3; baris DAK bertuliskan "dasar belum diverifikasi" atau dihapus. **Permintaan:** Kemenkeu
  (DJPK), Bappenas.
- Teks Juklak 5/2024 (stimulan rumah) dan Perban standar stimulan yang direncanakan 2023 tidak ditemukan. **Permintaan:** Deputi
  Bidang RR, Biro Hukum. **Penyajian:** besaran 50/25/10 dan 60/30/15 berlabel resmi dengan atribusi
  "menurut siaran Kemenko PMK 22 November 2023; teks peraturan tidak ditemukan"; 60/30/15 ditulis "dinaikkan atas arahan
  Presiden", bukan "usulan". Profil yang mengalikannya tetap asumsi-kebijakan.
- Seri CKAN kerusakan dan kerugian baru ada di ruang kerja peneliti. **Permintaan:** pemilik paket `dibi` menarik dan
  membersihkan seri (§10 KERANGKA); Deputi Bidang RR menjelaskan baris Batang 2018, pengulangan Palu, dan baris yang nilai
  kerugiannya sama dengan nilai kerusakan.
- Kerugian ekonomi langsung untuk Renas 2.a tidak tersedia (KERANGKA §7 butir 10). **Penyajian:** "Belum dapat diukur; profil batas
  bawah berlabel Asumsi kebijakan; pembanding tahunan PARB 2000–2016".
- Sumber angka kerugian per kejadian di Strategi PARB (Aceh 2004, Yogyakarta 2006) tidak dirinci; seri Meilano dkk. 2018 tidak
  dibuka. **Penyajian:** label resmi dengan atribusi "menurut Strategi PARB Kemenkeu", berdampingan dengan Bappenas.
- Kerugian rupiah nonalam dan sosial tidak ada (celah 28). **Penyajian:** sel "–" beralasan di lapisan konflik.

---

## P4. Instrumen hukum apa, oleh siapa, dan di Progsun mana?

### Inti

Progsun BNPB 2026 (Kepka 327/2025, berlaku satu tahun) memuat 11 rancangan; yang menyentuh Bab 12 adalah butir 3 (analisis
risiko bencana pembangunan berisiko tinggi, pasangan Renas 4.1.1.l), butir 7 (perubahan Perka 6/2014 tentang pembentukan
produk hukum), butir 9 (penelaahan Dana Bersama, sudah terbit sebagai Perban 1/2026), dan butir 11 (monev RIPB). Instrumen
yang diperlukan tetapi tidak ada di Progsun 2026: pedoman keadaan tertentu Perpres 46/2026 (perubahan Perban 5/2018), syarat
manfaat-biaya Dana Bersama, standar stimulan rumah, dan perubahan Renas; keempatnya dapat disusun di luar program dengan izin
prakarsa Kepala (Perka 6/2014 Pasal 8 ayat (2)) atau masuk Progsun 2027. Di luar kewenangan Perban ada Perpres status dan
tingkatan bencana, yang diperintahkan UU 24/2007 sejak 2007 dan kini indikatornya ditafsir MK, serta norma pengait status KLB
dengan status darurat bencana yang pemrakarsanya Kemenkes.

### Temuan bersumber

1. **Progsun 2026.** Kepka BNPB 327/2025 ditetapkan 31 Desember 2025; Lampiran memuat 11 rancangan (Diktum KESATU); berlaku 1
   tahun (KEDUA); Kepala Biro Hukum, Organisasi, dan Kerja Sama melaporkan realisasi tiap triwulan kepada Kepala melalui
   Sekretaris Utama (KETIGA). Butir 3 "Analisis Risiko Bencana pada Kegiatan Pembangunan Berisiko Tinggi Bencana" (Deputi
   Bidang Sistem dan Strategi, Direktorat Pemetaan dan Evaluasi Risiko Bencana); butir 7 "Perubahan atas Peraturan Kepala BNPB
   Nomor 6 Tahun 2014 tentang Pembentukan Produk Hukum di Lingkungan BNPB" (Biro Hukum); butir 9 "Penelaahan, Verifikasi, dan
   Evaluasi Permohonan Dana Bersama" (Biro Hukum); butir 11 "Monitoring dan Evaluasi Rencana Induk Penanggulangan Bencana Tahun
   2020-2045" (Direktorat Pengembangan Strategi PB). Sumber: korpus `keputusan-kepala-nomor-327-tahun-2025.json` hlm. 2–5,
   dibuka ulang 24 Okt 2026 [`bnpb-2025-progsun`]; kunci lama `progsun.2026.jumlah_rancangan` (air bab-01),
   `progsun.2026.jangka_tahun` (bab-13). Label: resmi.
   - *Berdampingan:* judul butir 11 menulis RIPB "2020-2045", sedangkan Perpres 87/2020 menulis "2020–2044"; butir untuk lampiran
     Penyelarasan dokumen BNPB, bukan badan teks.
2. **Jalur di luar program.** Perencanaan Peraturan Kepala BNPB "dilaksanakan dalam Proleg PB" yang "ditetapkan berdasarkan skala
   prioritas dalam jangka waktu 1 (satu) tahun" dan "wajib memuat analisis pengurangan risiko bencana", analisis gender, dan
   analisis disabilitas (Perka 6/2014 Pasal 4 ayat (1), (4)–(7)); "Tim Teknis menyusun rancangan Peraturan Kepala BNPB di luar
   Proleg PB, setelah terlebih dahulu mengajukan permohonan izin prakarsa kepada Kepala BNPB" (Pasal 8 ayat (2)); Tim Teknis
   lebih dulu menyusun kajian materi (ayat (3)–(4)). Sumber: korpus `perka-nomor-6-tahun-2014.json` hlm. 4–6, dibuka 24 Okt 2026
   [`bnpb-2014-produkhukum`]; berkas bukti mitigasi bab-13 T2.4. Label: resmi. Catatan: Perka 6/2014 memakai istilah "Peraturan
   Kepala BNPB" dan sedang diubah (butir 7 di atas); penerapannya pada Peraturan Badan adalah tafsiran penyusun yang didukung
   pencantumannya di konsiderans Kepka 327/2025.
3. **Butir 9 terealisasi.** Perban BNPB 1/2026 ditetapkan 10 Maret 2026, mencabut Perban 1/2024 (Pasal 34). Sumber: korpus
   `perban-nomor-1-tahun-2026.json` hlm. 12–13 [`bnpb-2026-dana-bersama`]. Label: resmi.
4. **Perban 5/2018 belum melaksanakan Perpres 46/2026.** Perban 5/2018 menimbang "untuk melaksanakan ketentuan Pasal 3 ayat (4)
   Peraturan Presiden Nomor 17 Tahun 2018"; kondisi keadaan tertentu hanya ancaman alam dan nonalam (Pasal 3), tanpa sosial dan
   tanpa pascakonflik; rakor "dilaksanakan atas inisiatif Badan Nasional Penanggulangan Bencana" (Pasal 5 ayat (2)); Kepala BNPB
   menetapkan Status Keadaan Tertentu dengan surat keputusan (Pasal 7). Perpres 46/2026 (ditetapkan dan diundangkan 16 Juli
   2026, LN 2026/83) mengubah Pasal 3: kondisi kini faktor "alam, nonalam, dan/atau sosial" (ayat (2) huruf a) dan "pemerintah
   daerah yang wilayahnya dalam proses rekonsiliasi pascakonflik sosial dan memiliki kapasitas fiskal sangat rendah atau rendah"
   (huruf c); syaratnya keputusan rakor yang dikoordinasikan menko bidang PB (ayat (1)); ketentuan lanjut "diatur dalam pedoman
   yang ditetapkan oleh Kepala Badan Nasional Penanggulangan Bencana" (ayat (4)). Sumber: korpus `perban-nomor-5-tahun-2018.json`
   hlm. 1–7 dan `perpres-nomor-46-tahun-2026.json` hlm. 1–4, dibuka ulang 24 Okt 2026 [`bnpb-2018-keadaan-tertentu`,
   `ri-2026-perpres46`]; kunci lama `perban5_2018.jenis_ancaman`, `.anggota_rakor` (mitigasi bab-09). Label: resmi.
5. **Perpres status dan tingkatan bencana belum terbit.** UU 24/2007 Pasal 7 ayat (1) huruf c, ayat (2) lima indikator, ayat (3)
   "diatur dengan peraturan presiden"; Penjelasan Pasal 21 ayat (1) huruf b PP 21/2008: "Termasuk dalam penentuan status keadaan
   darurat bencana adalah penentuan tingkatan bencana". IHPS II 2024 BPK mencatat "Belum disusunnya Perpres penetapan status dan
   tingkatan bencana" dengan rekomendasi Kepala BNPB menginisiasinya; Pemerintah di persidangan MK menyatakan Perpres "belum
   dibentuk secara tersendiri"; tulisan hukum BPK Perwakilan Jawa Barat (3 Feb 2025) menyatakan belum dibuat. Sumber:
   `lembaga/mentah/teks/uu-24-2007.json.gz` [`ri-2007-uu24`]; riset E11d, E14 [`ri-2008-pp21`, `bpk-2025-status-bencana`];
   berkas bukti mitigasi bab-10 P1 temuan 1 [`bpk-2025-ihps2-2024`, `mk-2026-putusan261`]; kunci lama `uu24.pasal7.indikator`,
   `bpk.ihps2_2024.bnpb.peraturan_belum_disahkan`, `.peraturan_belum_diinisiasi`. Label: resmi; ketiadaan Perpres adalah
   temuan negatif per 24 Okt 2026.
6. **Tafsir MK atas indikator.** Amar Putusan 261/PUU-XXIII/2025 butir 2: Pasal 7 ayat (2) bertentangan dengan UUD secara
   bersyarat sepanjang tidak dimaknai bahwa penetapan status dan tingkat bencana memuat lima indikator dan bahwa "Dalam hal
   menetapkan status dan tingkat bencana nasional didasarkan pada pemenuhan sekurang-kurangnya 3 (tiga) indikator dengan
   menempatkan jumlah korban sebagai indikator utama yang harus dipenuhi"; butir 4 menolak permohonan selebihnya; diputus RPH
   12 Agustus 2026, diucapkan 28 Agustus 2026. Sumber: PDF putusan (SHA-1 `2987f693a99d`, sama dengan yang dibaca berkas bukti
   bab-10), hlm. 240, diunduh dan dibaca ulang 24 Okt 2026 [`mk-2026-putusan261`]; kunci lama
   `mk.putusan261_2025.indikator_minimal`. Label: resmi.
7. **Renas sudah mendaftar substansi itu** (Tabel 4.1 Sasaran 1 "d. Status tingkatan bencana"; Sasaran 2 "a. Persyaratan analisis
   risiko bencana"), tetapi aksi berkodenya hanya untuk analisis risiko (4.1.1.l). Sumber: P2 temuan 17–18. Label: resmi.
8. **Pengait status epidemi.** KLB ditetapkan bupati/wali kota, gubernur, atau Menteri (UU 17/2023 Pasal 353); daerah terjangkit
   wabah oleh Menteri (Pasal 368); status darurat bencana oleh Presiden, gubernur, bupati/wali kota (UU 24/2007 Pasal 51;
   Perpres 17/2018 Pasal 2); norma pengait tidak ditemukan pada teks yang dibaca; Permenkes 1/2026 (teks rancangan) menambah
   status Krisis Kesehatan; BPK merekomendasikan finalisasi rancangan Permenkes krisis kesehatan. Sumber: berkas bukti mitigasi
   bab-08 P1 dan bab-10 P1 temuan 3 [`ri-2023-uu17`, `ri-2018-perpres17`, `kemenkes-2026-pmk1`, `bpk-2025-ihps2-2024`];
   `celah.csv` C09. Label: resmi; ketiadaan pengait disimpulkan penyusun.
9. **Dasar butir 3.** "Setiap kegiatan pembangunan yang mempunyai risiko tinggi yang menimbulkan bencana dilengkapi dengan analisis
   risiko bencana" (UU 24/2007 Pasal 40 ayat (3)); persyaratannya ditetapkan BNPB (Pasal 41); PP 21/2008 Pasal 11–12; instrumen
   berlaku Perka BNPB 5/2008 (indeks JDIH Berlaku; teks tidak ada di korpus); Renas mencatat penerapannya belum optimal (hlm.
   28). Sumber: air bab-09 T4.3 [`ri-2007-uu24`, `ri-2008-pp21`, `bnpb-2008-perka5`]. Label: resmi (Perka 5/2008 metadata saja).
10. **Standar stimulan rumah.** Kemenko PMK (2023) menyebut implementasi standar Rp60/30/15 juta lewat Perban; indeks JDIH hanya
    memuat Juklak 5/2024 (tanpa teks); Progsun 2026 tidak memuat Perban standar stimulan; butir 4 dan 5 Progsun adalah perubahan
    perencanaan dan penyelenggaraan RR; Renas 4.1.1.n NSPK pemulihan perumahan. Sumber: P3 temuan 6; temuan 1; P2 temuan 18.
    Label: resmi.
11. **Ketidakselarasan Progsun** (lampiran Penyelarasan, bukan badan teks): butir 4 merujuk "Peraturan BNPB Nomor 5 Tahun 2024
    tentang Perencanaan Rehabilitasi dan Rekonstruksi Pascabencana", sedangkan Perban 5/2024 di indeks JDIH adalah Kamus
    Kompetensi Teknis dan perencanaan RR diatur Perban 5/2017; pemrakarsa butir 4 (Direktorat Perencanaan RR) sudah diganti
    Perban 11/2025. Sumber: korpus Kepka 327/2025 hlm. 4; air bab-09 T4.9. Label: resmi; penilaian ketidakselarasan oleh penyusun.

### Inferensi

- **[Inferensi tim] Draf Tabel 12.4 instrumen hukum** (kolom B5.20 ditambah status P7 dan tabel silang lima dokumen prinsip 13;
  RIPB memakai kode fokus capaian dan strategi `program-terbukti/ripb_2020_2044.csv`):

  | No | Instrumen | Jenis | Isi pokok | Pemrakarsa; forum | Horizon | RIPB | Renas | Renstra | RPJMN | Progsun 2026 | Status P7 | Register |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | 1 | Pedoman keadaan tertentu faktor sosial dan pascakonflik | Perban (perubahan Perban 5/2018) | Kondisi faktor sosial; kriteria rekonsiliasi pascakonflik dan kapasitas fiskal (PMK 97/2025); unsur rakor bernomenklatur berlaku | Deputi Bidang Penanganan Darurat, Biro Hukum; rakor Kemenko PMK sebagai syarat Pasal 3 ayat (1) | 100 hari (rancangan); 2027 (penetapan) | fokus capaian 7 | 4.1.1.h; Tabel 4.1 Sasaran 1 | – | KP 08.04.02 (status darurat sesuai standar) | Tidak ada (Perpres terbit sesudahnya); izin prakarsa | Usulan baru (KERANGKA M08) | R-M02, R-M03 |
  | 2 | Perpres status dan tingkatan bencana | Perpres | Lima indikator UU 24/2007 Pasal 7 ayat (2) dengan tafsir MK; DIBI sebagai sumber korban; tanpa ambang angka rekaan | BNPB menginisiasi lewat Kemenko PMK (rekomendasi BPK) | 2026–2027 (usulan inisiasi) | fokus capaian 1; strategi 1a | Tabel 4.1 Sasaran 1 d; tanpa aksi berkode | – | – | Bukan objek Progsun BNPB | Usulan baru | R-M06 |
  | 3 | Pengait status KLB/wabah dan darurat bencana | Bentuk belum dapat ditentukan (Permenkes krisis kesehatan atau norma bersama) | Hubungan status KLB, wabah, krisis kesehatan dengan status darurat bencana | Kemenkes bersama BNPB; rakor Kemenko PMK | 2026–2027 | fokus capaian 1 | 1.2.1 (kedaruratan dan krisis kesehatan) | – | – | Bukan objek Progsun BNPB | Usulan baru | R-M07 |
  | 4 | Persyaratan analisis risiko pembangunan berisiko tinggi | Perban (menyempurnakan Perka 5/2008) | Syarat analisis risiko untuk kegiatan berisiko tinggi termasuk fasilitas migas dan industri | Direktorat Pemetaan dan Evaluasi Risiko Bencana | 2026–2027 | fokus capaian 1; strategi 1b | 4.1.1.l; Tabel 4.1 Sasaran 2 a | – | – | **Butir 3** | Sudah ada, perlu dikembangkan | R-M11 |
  | 5 | Penelaahan Dana Bersama | Perban 1/2026 (terbit) | Prioritas, kriteria, verifikasi, laporan | Biro Hukum | berjalan | strategi 3c | 4.6.2 | – | – | **Butir 9, terealisasi** | Sudah ada | – |
  | 6 | Syarat analisis manfaat-biaya Dana Bersama prabencana | Perban (perubahan Perban 1/2026) | Analisis manfaat-biaya untuk usulan prabencana (rujukan tata kelola P24) | Direktorat Pengembangan Strategi PB, Biro Hukum | 2028–2030 | strategi 3c | 4.6.2.c; 4.1.1.c | – | – | Tidak ada | Usulan baru | R-M18 |
  | 7 | Perubahan Renas PB (target, lokus, aksi status tingkatan bencana) | Perban (perubahan Perban 1/2025) | Isi Tabel 12.3 jalur berkala | Direktorat Pengembangan Strategi PB, Biro Perencanaan, Biro Hukum | 2026–2027 (paling lambat 2027) | Perpres 87/2020 Pasal 7 | §4.6 | IKP P1 | PP 08.04 | Tidak ada; izin prakarsa | Usulan baru | R-A05, R-M02 |
  | 8 | Standar bantuan stimulan rumah | Perban yang direncanakan 2023 atau perubahan Juklak 5/2024 | Besaran dan penyesuaian harga | Deputi Bidang RR | 2026–2027 | strategi 6c | 4.1.1.n; 3.1.2.c | – | KP 08.04.03 | Tidak ada | Belum dapat dipastikan (teks Juklak 5/2024 tidak tersedia) | – (usul baris register) |
  | 9 | Monev RIPB sebagai wadah pelaporan kajian | Perban | Kerangka monev RIPB | Direktorat Pengembangan Strategi PB | 2026–2027 | Perpres 87/2020 Pasal 6 | Pasal 7 ayat (3); 4.7.1 | IKP P1 | – | **Butir 11** | Sudah ada (di Progsun) | R-M21 |
  | 10 | Penyelarasan Renstra (unit OTK, IKP peringatan dini, alat ukur kapasitas) | Perban (perubahan Perban 5/2025) lewat Perpres 80/2025 | Unit dan indikator | Biro Perencanaan | 2027 (evaluasi tahun ke-3) | – | 1.c | IKP, IKS | KP 08.04.01–02 | Tidak ada | Usulan baru | R-A10, R-M04, R-M10 |
  | 11 | Perubahan Perka 6/2014 (tata cara produk hukum) | Perban | Prosedur Proleg dan izin prakarsa | Biro Hukum | 2026 | fokus capaian 1 | – | – | – | **Butir 7** | Sudah ada (di Progsun) | – (prasyarat R-M02) |

- **[Inferensi tim] Status P7 nomor 1.** KERANGKA §1.1 M08 memutus "Usulan baru" karena substansinya (faktor sosial dan
  pascakonflik) belum diatur di mana pun; wadahnya instrumen berlaku. Bila penyunting memakai definisi P7 menurut wadah, statusnya
  menjadi "Sudah ada, perlu dikembangkan". Bawaan berkas ini: ikut KERANGKA.
- **[Inferensi tim] Indikator status dari DIBI tanpa ambang rekaan.** Tafsir MK menetapkan jumlah korban sebagai indikator wajib dan
  minimal tiga indikator untuk status nasional, tetapi tidak menetapkan ambang angka. Kajian cukup menyajikan sebaran indikator dari
  DIBI (korban, rumah rusak, fasilitas rusak, kab terdampak; dampak sosial ekonomi tidak tersedia) untuk kejadian besar sebagai
  bahan Perpres, tanpa mengusulkan ambang.
- **[Inferensi tim] Jendela Progsun.** Progsun 2026 berlaku sampai akhir 2026 dan Progsun 2027 lazimnya ditetapkan akhir tahun
  sebelumnya (pola Kepka 327/2025 ditetapkan 31 Desember 2025); usulan nomor 1, 6, 7, 8 perlu sampai ke Biro Hukum sebelum
  itu, atau berjalan lewat izin prakarsa. Karena butir 7 Progsun 2026 sedang mengubah Perka 6/2014, mekanisme izin prakarsa
  perlu dicek terhadap rancangan perubahannya sebelum dipakai.
- **[Inferensi tim] Prioritas musim hujan 2026/2027** adalah nomor 1: pedoman keadaan tertentu diwajibkan Perpres yang sudah
  berlaku sejak Juli 2026 dan menentukan apakah DSP dapat dipakai pada keadaan tertentu faktor sosial (Perban 4/2020 Pasal 20).

### Celah

- Petunjuk pelaksanaan Perka 6/2014 dan rancangan perubahannya (Progsun butir 7) tidak dibuka; naskah tidak mengklaim usulan dapat
  masuk perubahan Progsun 2026.
- Judul 6 peraturan yang belum disahkan dan 11 yang belum diinisiasi tidak disebut IHPS. **Permintaan:** Inspektorat Utama BNPB
  atau BPK (LHP kinerja BNPB Semester II 2024).
- JDIH Setneg tidak dapat dicari; Perpres status dan tingkatan bencana ditulis "belum ditemukan terbit per 24 Oktober 2026; diakui
  belum dibentuk oleh Pemerintah di persidangan MK dan dicatat BPK".
- Teks final Permenkes 1/2026 dan PP 28/2024 belum dibuka (berkas bukti mitigasi bab-08 Celah).
- Kemajuan rancangan butir 3, 7, dan 11 dan laporan realisasi triwulanan Progsun tidak ditemukan. **Permintaan:** Biro Hukum,
  Organisasi, dan Kerja Sama.

---

## P5. Bagaimana kemajuan dilaporkan?

### Inti

Semua lapis pelaporan yang dibutuhkan sudah diwajibkan peraturan: internal (Kepala BNPB ke Presiden bulanan dan setiap saat
dalam darurat; Unsur Pengarah memantau dan mengevaluasi; Biro Perencanaan dan Direktorat Pengembangan Strategi PB menyusun
monev; Biro Hukum melaporkan Progsun tiap triwulan), lintas K/L (evaluasi tahunan, paruh waktu, dan akhir Renas yang menjadi
bagian monev RIPB yang dilaporkan ke Presiden melalui Menko PMK; forum K/L penanggung jawab triwulan II; Deputi Bidang
Koordinasi PB dan Konflik Sosial Kemenko PMK), dan daerah serta data (laporan DSP tiap tanggal 5, laporan akhir Dana Bersama
paling lama 60 hari, renkon direviu enam bulanan, Data Pembiayaan PB ke Walidata). Kajian tidak perlu laporan baru; yang perlu
adalah indikator kajian dimasukkan ke laporan evaluasi tahunan Renas 2026 dan ke metadata indikator Renas 4.7.1.c, dan
indikator Renstra IKP P1 dipakai sebagai ukuran adopsi rekomendasi.

### Temuan bersumber

1. **Lapis internal.** Kepala BNPB melapor kepada Presiden "setiap sebulan sekali dalam kondisi normal dan setiap saat dalam
   kondisi darurat bencana" (Perpres 1/2019 Pasal 3 huruf d); Unsur Pengarah memberi masukan dan saran kepada Kepala dan
   berfungsi perumusan konsep kebijakan, pemantauan, dan evaluasi, terdiri atas Ketua (Kepala) dan 20 anggota: 11 pejabat
   eselon I dari instansi pemerintah dan 9 anggota masyarakat profesional (Perban 6/2025 Pasal 7–10); Biro Perencanaan menyusun
   pemantauan, evaluasi, dan laporan BNPB (Pasal 24–25); Direktorat Pengembangan Strategi PB memantau dan melaporkan lingkup tata
   kelola PB (Pasal 50–51); Biro Hukum melaporkan realisasi Progsun tiap triwulan (Kepka 327/2025 Diktum KETIGA). Sumber:
   `lembaga/mentah/teks/perpres-1-2019.json.gz` hlm. 3; korpus `perban-nomor-6-tahun-2025.json` hlm. 3–4, 7, 12, dibuka ulang
   [`ri-2019-perpres1`, `bnpb-2025-otk`, `bnpb-2025-progsun`]; kunci lama `perban2025_6.unsur_pengarah.anggota`, `.instansi`.
   Label: resmi.
   - *Berdampingan:* Perpres 1/2019 Pasal 12–13 memuat susunan yang sama dengan nama instansi lama (Kemenko Polhukam, Kementerian
     PUPR); Perban 6/2025 Pasal 10 ayat (2) memakai Kemenko Polkam dan Kementerian PU.
2. **Lapis lintas K/L.** Pemantauan RIPB satu kali setahun dilaporkan ke Presiden melalui Menko PMK (Perpres 87/2020 Pasal 6);
   RIPB ditinjau berkala lima tahunan atau sewaktu-waktu (Pasal 7); monev Renas menjadi bagian monev RIPB (Renas Pasal 7 ayat
   (3)); evaluasi tahunan Renas paling lambat minggu terakhir triwulan II tahun berikutnya; evaluasi paruh waktu tahun ketiga
   (2027); evaluasi akhir sesudah tahun kelima. Deputi Bidang Koordinasi PB dan Konflik Sosial Kemenko PMK menyelenggarakan
   "sinkronisasi dan koordinasi perumusan, penetapan, dan pelaksanaan kebijakan serta pengendalian pelaksanaan kebijakan
   kementerian/lembaga" di bidang PB dan konflik sosial, termasuk pemantauan (Perpres 144/2024 Pasal 25–26). Sumber: korpus
   Renas hlm. 4, 123–124; `lembaga/mentah/teks/perpres-144-2024.json.gz` hlm. 13; riset E11a [`bnpb-2025-renas`,
   `ri-2020-perpres87`, `ri-2024-perpres144`]. Label: resmi.
3. **Aksi monev di Renas:** 4.7.1.a sistem informasi pemantauan dan evaluasi; 4.7.1.b tata kelola pemantauan dan evaluasi; 4.7.1.c
   metadata indikator kinerja PB, 3 dokumen; 4.7.1.d koordinasi strategis evaluasi sinergi multipihak, 1 kegiatan per tahun;
   4.7.1.e pembinaan pelaporan dan pengawasan kebencanaan daerah; 4.7.1.f NSPK pelaporan dan pengawasan PB daerah; 4.6.2.b 5
   laporan monev Dana Bersama. Sumber: korpus Renas hlm. 112–114 [`bnpb-2025-renas`]; kunci baru `renas.aksi_471c.target_2029`.
   Label: resmi (judul 4.7.1.a, b, e, f dibaca dari kolom OCR bertumpuk).
4. **Lapis daerah dan data.** Penerima Dana Bersama menyampaikan laporan kemajuan sesuai jangka waktu kegiatan dan laporan akhir
   "paling lama 60 (enam puluh) hari kalender setelah berakhirnya pelaksanaan kegiatan" kepada BNPB dan Kemenkeu (Perban 1/2026
   Pasal 32); laporan DSP tiap tanggal 5 dan pertanggungjawaban 3 bulan setelah status berakhir (Perban 4/2020 Pasal 21); renkon
   berlaku 3 tahun dan direviu paling sedikit 6 bulan sekali (Perban 2/2023 Pasal 21); Data Bencana mencakup "Data Pembiayaan
   Penanggulangan Bencana" (Perban 1/2023 Pasal 4–5); Walidata menyebarluaskan lewat portal Satu Data Bencana (Pasal 28). Sumber:
   korpus `perban-nomor-1-tahun-2026.json` hlm. 12, dibuka ulang; air bab-09 T3.17, T5.9 [`bnpb-2026-dana-bersama`,
   `bnpb-2020-dsp`, `bnpb-2023-renkon`, `bnpb-2023-satudata`]; kunci lama `perban2026_1.laporan_akhir.hari`, `perban2023.renkon.*`.
   Label: resmi; pemetaan Walidata ke Pusdatinkom oleh penyusun.
5. **Indikator adopsi rekomendasi.** Renstra IKP P1 Deputi Bidang Sistem dan Strategi "Persentase rekomendasi kebijakan sistem dan
   strategi yang di integrasikan oleh K/L/D ke dalam rencana pembangunan/sektoral": baseline 82,35%, 2027 94,12%, 2029 100%; Renas
   4.a "Persentase implementasi strategi pengurangan risiko bencana di level nasional" 87% ke 100%. Sumber: air bab-09 T4.8
   [`bnpb-2025-renstra`]; korpus Renas hlm. 33; kunci lama `renstra.ikp_p1_rekomendasi.*`. Label: resmi.
6. **Data sebagai syarat pembiayaan.** Strategi PARB: "Basis data dan informasi terkait dengan potensi bencana (hazard), kerentanan
   (exposure), dan dampak kerugian (loss), termasuk catatan klaim asuransi (claim history) perlu dikelola dengan baik dan
   diperbarui secara periodik". Sumber: [`kemenkeu-bkf-2018-parb`] hlm. PDF 53–54. Label: resmi.
7. **Pemeriksaan eksternal.** BPK memeriksa kinerja penanggulangan bencana atas 30 objek (5 pusat, 25 pemda) dan merekomendasikan
   penyusunan regulasi pelaksana (IHPS II 2024). Sumber: mitigasi bab-10 [`bpk-2025-ihps2-2024`]; kunci lama
   `bpk.ihps2_2024.pb.objek`. Label: resmi.
8. **Rujukan tata kelola laporan kemajuan berangka (bukan teladan program):** Delta Programme Belanda menerbitkan laporan kemajuan
   publik tahunan berangka; kekuatan lemah, posisi "Rujukan tata kelola" (jenis evaluasi laporan sendiri). Sumber:
   `program-terbukti/kompendium_program.csv` baris P17 [`pantaubencana-2026-program-terbukti`]. Label: asumsi-kebijakan (posisi
   rubrik).

### Inferensi

- **[Inferensi tim] Draf Gambar 12.4 tata kelola dan pelaporan tiga lapis (B5.23, G21):** lapis 1 internal (unit pelaksana ke Biro
  Perencanaan dan Direktorat Pengembangan Strategi PB, ke Kepala, ke Presiden bulanan; Unsur Pengarah memantau dan mengevaluasi;
  Biro Hukum untuk Progsun triwulanan); lapis 2 lintas K/L (forum K/L penanggung jawab triwulan II; evaluasi tahunan Renas; monev
  RIPB lewat Kemenko PMK ke Presiden; Deputi Bidang Koordinasi PB dan Konflik Sosial; koordinasi strategis Renas 4.7.1.d); lapis 3
  daerah dan data (BPBD lewat renkon, DSP, Dana Bersama; Data Bencana termasuk Data Pembiayaan PB ke Walidata). Pernyataan produsen
  di samping lapis data: keluaran simulasi platform Pantau Bencana bukan Data Bencana (prinsip 19).
- **[Inferensi tim] Tanpa laporan baru.** Indikator yang diusulkan kajian (1.a dan 1.b versi alam dan semua klasifikasi per pulau
  dan per kelompok jenis; lokus; realisasi Dana Bersama; status pedoman keadaan tertentu) cukup dimasukkan ke metadata indikator
  Renas 4.7.1.c dan lampiran evaluasi tahunan Renas, sehingga tidak menambah beban pelaporan daerah. IKP P1 Renstra dapat menjadi
  ukuran adopsi rekomendasi kajian.
- **[Inferensi tim] Data pembiayaan adalah prasyarat lapisan dana.** Arsitektur P3 tidak dapat dipantau tanpa Data Pembiayaan PB
  per fase (Perban 1/2023 Pasal 5) dan catatan kerugian per kejadian yang diminta Strategi PARB; permintaan ke Pusdatinkom masuk
  subbab 12.9 dan terkait R-M17.

### Celah

- Laporan monev Renas tahunan 2025 dan laporan pemantauan RIPB tidak ditemukan. **Permintaan:** Direktorat Pengembangan Strategi
  PB, Biro Perencanaan.
- Keputusan keanggotaan Unsur Pengarah BNPB yang berlaku dan notula rakor Kemenko PMK 2025–2026 tidak dibuka; naskah tidak
  menyatakan forum itu aktif atau tidak aktif.
- Data realisasi Data Pembiayaan PB tidak ditemukan di portal yang diperiksa.
- Metode pengukuran IKP P1 Renstra dan Renas 4.a (pembilang, penyebut) tidak dibaca.

---

## Bahan subbab 12.3, 12.7, 12.8 (forum, peta jalan, indikator; konteks, bukan pertanyaan kunci)

### Inti

Forum yang dibutuhkan sudah ada semua: rakor Kemenko PMK, Unsur Pengarah BNPB, forum K/L penanggung jawab Renas, dan rakor
keadaan tertentu; untuk air ditambah Dewan SDA Nasional dan TKPSDA WS (Kajian 1 Bab 9). Peta jalan berjangkar waktu bersumber,
dan tiap baris draf register dapat diberi pemilik bermandat, forum, sumber dana, instrumen, dan jadwal tanpa satu pun forum atau
lapisan dana baru. Indikator Bab 12 adalah indikator Renas, RPJMN, dan Renstra yang sudah ada, ditambah indikator tata kelola
dan pembiayaan.

### Temuan bersumber

1. **Forum.** Rakor Kemenko PMK (Perpres 1/2019 Pasal 6; Perpres 144/2024 Pasal 25–26); syarat keadaan tertentu "keputusan dalam
   rapat koordinasi antarkementerian/lembaga" (Perpres 46/2026 Pasal 3 ayat (1); rakor atas inisiatif BNPB, Perban 5/2018 Pasal 5);
   Unsur Pengarah BNPB (Perban 6/2025 Pasal 6–10); forum K/L penanggung jawab Renas (Renas hlm. 123); Dana Bersama: BNPB berkoordinasi
   dengan Kemenko PMK lewat daftar permohonan (Perban 1/2026 Pasal 13). Sumber: dibuka ulang di bab ini (P1 temuan 9, P2 temuan
   3, P4 temuan 4, P5 temuan 1–2); air bab-09 T2.1–T2.8. Label: resmi.
2. **Jangkar peta jalan.** Pemantauan pra-pelaksanaan Renas triwulan IV 2026 (Renja K/L 2027); awal musim hujan November–Desember
   2026; evaluasi tahunan Renas 2026 paling lambat triwulan II 2027; batas perubahan berkala dan evaluasi paruh waktu 2027;
   evaluasi Renstra tahun ke-3 2027 (Perpres 80/2025); usulan Dana Bersama pemda untuk TA 2027 (BKF); Progsun 2027; batas perubahan
   karena bencana 2028; target 2029 Renas, Renstra, RPJMN; evaluasi akhir Renas sesudah 2029. Sumber: P2 temuan 1–5; air bab-09
   T3.11, T5.1–T5.3; kunci lama `renstra.evaluasi_tahun_ke3.tahun`. Label: resmi; hari ke-0 dan keputusan 14 hari dari KERANGKA
   §2 butir 11 dan §6 (asumsi-kebijakan, rancangan kajian).
3. **Indikator.** Renas sasaran 1.a–4.c (P2 temuan 7); RPJMN PP 08.04 dan KP 08.04.01–04 (riset E11b); Renas 4.6.2.a (100 penerima
   Dana Bersama 2029), 4.6.2.b (5 laporan), 4.6.3.a (1 peraturan), 4.6.3.b (546 daerah), 4.7.1.c (3 dokumen); Renstra IKP P1 (82,35%
   ke 100%); Renstra sasaran kegiatan rekomendasi bantuan pendanaan pascabencana 50% ke 70%. Sumber: kunci lama yang disebut di P2,
   P3, P5. Label: resmi.
4. **Draf register mitigasi** memuat 34 baris (14 hari 7, 100 hari 4, 2026–2027 18, 2028–2030 5) dengan unit pemimpin, peran BNPB,
   forum, instrumen, indikator selesai, dan dasar, tetapi tanpa kolom sumber dana dan jalur Renas. Sumber: berkas bukti mitigasi
   bab-13 I3.1 (asumsi-kebijakan, ID sementara). Label: asumsi-kebijakan.

### Inferensi

- **[Inferensi tim] Draf Tabel 12.5 peta jalan (B5.13 kolom WAKTU, G23):**

  | Horizon | Jangkar bersumber | Instrumen, forum, atau dokumen Bab 12 | Register |
  | --- | --- | --- | --- |
  | Hari ke-0 | Penetapan Kepala BNPB (bila KD-1 (a), November 2026) | Keputusan Kepala | R-A01 |
  | 14 hari | Pemantauan pra-pelaksanaan Renas TW IV 2026 | Surat ke Kemenko PMK untuk rakor peninjauan Renas; penugasan memuat rekomendasi ke ET-2026 dipisah jalur berkala dan bencana (keputusan 14 hari butir 7); saran lokasi Renja 2027; penugasan catatan metode IRBI; izin prakarsa | R-A05, R-M01, R-M02, usul ID baru |
  | 100 hari | Puncak musim hujan; usulan Dana Bersama TA 2027 | Rancangan pedoman keadaan tertentu; permintaan data realisasi Dana Bersama, BTT, dan seri CKAN bersih | R-M03 |
  | 2026–2027 | ET-2026 (≤ TW II 2027); batas perubahan berkala 2027; EPW-2027; evaluasi Renstra tahun ke-3; Progsun 2027 | Perubahan Renas jalur berkala (1.a, 1.b, 1.c, 4.c, lokus, aksi status tingkatan bencana); penyelarasan Renstra; Perban analisis risiko (butir 3); usulan Perpres status dan tingkatan; data R3P | R-A10, R-M04, R-M06, R-M09, R-M10, R-M11, R-M17 |
  | 2028–2030 | Batas perubahan karena bencana 2028; target 2029; evaluasi akhir Renas | Perubahan 3.1.2.c bila belum; syarat manfaat-biaya Dana Bersama; monev RIPB (butir 11); pembaruan daftar perhatian | R-M18, R-M20, R-M21 |

- **[Inferensi tim] Tabel pemilik per baris register (tujuan bab; usul kolom tambahan register).** Kolom "sumber dana" menyebut
  lapisan, tanpa nominal (P5); "jalur" menyebut jalur Renas atau "tanpa ubah Renas".

  | ID | Langkah (draf bab-13) | Dasar mandat pemimpin | Forum | Sumber dana | Instrumen | Jalur / dokumen |
  | --- | --- | --- | --- | --- | --- | --- |
  | R-A01 | Tetapkan hari ke-0 dan tugaskan unit | Perpres 1/2019 Pasal 3 (tugas BNPB); Pasal 8 (Kepala memimpin) | internal | APBN BNPB | Keputusan Kepala | KD-1 |
  | R-A02 | Kirim prakiraan musim, minta reviu renkon | Perban 2/2023 Pasal 21; Direktorat Kesiapsiagaan (Perban 6/2025 Pasal 61) | BPBD provinsi | APBN BNPB; APBD | Renkon | tanpa ubah Renas |
  | R-A04 | Inventarisasi logistik terhadap lantai musim | Deputi Bidang Logistik dan Peralatan (Perban 6/2025 jo. 11/2025) | Direktorat PD Wilayah I–III | APBN BNPB; DSP saat darurat | Standar Perka 7/2008, Perban 3/2018 | tanpa ubah Renas |
  | R-A05 | Ajukan rakor peninjauan Renas | Perpres 1/2019 Pasal 6; Biro Perencanaan (Pasal 24) | rakor Kemenko PMK | APBN BNPB | Perubahan Perban 1/2025 | berkala; ET-2026 |
  | R-A10 | Selaraskan target peringatan dini | Biro Perencanaan (Pasal 24) | Pertemuan Dua Pihak (Perpres 80/2025) | APBN BNPB | Perubahan Renstra; Renas 1.c | berkala dan Renstra |
  | R-A15 | Garis dasar evaluasi dampak Destana | Renas 4.5.1.a (PJ Kemendes PDT, BNPB, Kemensos) | rakor Kemenko PMK | APBN K/L; dana desa (Permendes PDT 16/2025) | Perban 7/2025 | tanpa ubah Renas |
  | R-A17 | Serahkan lampiran data ke Walidata | Perban 1/2023 Pasal 28 | Forum Satu Data | APBN BNPB | Perban 1/2023 | tanpa ubah Renas |
  | R-M01 | Catatan metode IRBI 2025 | Direktorat Pemetaan dan Evaluasi Risiko Bencana (Pasal 47) | internal | APBN BNPB | Catatan metode | berkala (4.c); ET-2026 |
  | R-M02 | Izin prakarsa di luar Progsun | Perka 6/2014 Pasal 8 ayat (2); Biro Hukum (Pasal 41) | Panitia antar Kedeputian | APBN BNPB | Izin prakarsa | tanpa ubah Renas |
  | R-M03 | Pedoman keadaan tertentu | Perpres 46/2026 Pasal 3 ayat (4) | rakor Kemenko PMK | APBN BNPB; DSP saat keadaan tertentu (Perban 4/2020 Pasal 20) | Perubahan Perban 5/2018 | tanpa ubah Renas |
  | R-M04 | Alat ukur kapasitas | Biro Perencanaan (Pasal 24) | Pertemuan Dua Pihak | APBN BNPB | Perubahan Renstra | Renstra; berkala bila ke Renas |
  | R-M05 | Skenario megathrust ke renkon pesisir | Perban 2/2023; Direktorat Kesiapsiagaan (Pasal 61) | BMKG, Badan Geologi | APBN BNPB; APBD; Dana Bersama prabencana (renkon ada di daftar Juklak 2/2026) | Renkon tsunami | tanpa ubah Renas |
  | R-M06 | Usulkan Perpres status dan tingkatan | UU 24/2007 Pasal 7 ayat (3); rekomendasi BPK kepada Kepala BNPB; Direktorat Sistem PB (Pasal 53) | rakor Kemenko PMK | APBN BNPB | Perpres | berkala (aksi 4.1.1); ET-2026 |
  | R-M07 | Norma pengait KLB dan darurat bencana | UU 17/2023 Pasal 353, 368 (Kemenkes) | rakor Kemenko PMK | APBN Kemenkes | Permenkes krisis kesehatan | tanpa ubah Renas |
  | R-M08 | Rapikan pencatatan nonalam dan sosial di DIBI | Perban 1/2023 | Forum Satu Data | APBN BNPB | Perban 1/2023; Juklak 7/2023 | tanpa ubah Renas |
  | R-M09 | Laporkan realisasi 1.a dan 1.b | Direktorat Pengembangan Strategi PB (Pasal 50) | rakor Kemenko PMK | APBN BNPB | Laporan evaluasi tahunan | berkala; ET-2026 |
  | R-M10 | Selaraskan klaster dan dokumen ke OTK | Biro Hukum (Pasal 41) | koordinator enam klaster | APBN BNPB | SK klaster; perubahan Renstra | Renstra |
  | R-M11 | Perban analisis risiko | UU 24/2007 Pasal 41; Direktorat Pemetaan dan Evaluasi Risiko Bencana (Pasal 47) | K/L pemberi izin | APBN BNPB | Perban (Progsun butir 3) | tanpa ubah Renas (4.1.1.l) |
  | R-M12 | Rencana induk peringatan dini | Perban 2/2024; Direktorat Peringatan Dini | rakor Kemenko PMK; Dewan SDA Nasional | APBN BNPB; Dana Bersama prabencana (peringatan dini ada di daftar Juklak 2/2026) | Rencana induk; rancangan Perpres | tanpa ubah Renas |
  | R-M13 | Dokumen dasar daerah kapasitas rendah | Direktorat Kesiapsiagaan (Pasal 61) | Kemendagri (SPM) | APBD; Dana Bersama prabencana (kriteria RPBD/SPM, Perban 1/2026 Pasal 14 ayat (4)) | KRB, RPBD, RPKB, renkon | tanpa ubah Renas |
  | R-M14 | Permendagri OTK BPBD | Kemendagri | – | APBN Kemendagri | Permendagri | tanpa ubah Renas |
  | R-M15 | TPA ke kesiapan kemarau | UU 18/2008 Pasal 9 (pemda, KLH/BPLH) | – | APBD; BTT saat darurat | Sistem tanggap darurat sampah; renkon | tanpa ubah Renas |
  | R-M16 | Latih komando dengan skenario lantai | Pusdiklat PB (Perban 6/2025 jo. 11/2025) | internal | APBN BNPB | Gladi SPM; Gladi Ruang RPKB | tanpa ubah Renas |
  | R-M17 | Tarik data kerusakan R3P | Perban 5/2017; Deputi Bidang RR | Kemendagri, Kementerian PKP | APBN BNPB; Dana Bersama pascabencana mensyaratkan R3P ditetapkan | Jitupasna, R3P | bencana (3.1.2.c); ET-2026 atau ET-2027 |
  | R-M18 | Syarat manfaat-biaya Dana Bersama | Perpres 75/2021 Pasal 8; Direktorat Pengembangan Strategi PB (Pasal 50) | Kemenkeu, Bappenas, Kemendagri, Kemenko PMK | APBN BNPB | Perubahan Perban 1/2026 | tanpa ubah Renas (4.6.2.c) |
  | R-M19 | Evaluasi dampak program berjalan | Perban 7/2025; Juklak 15/2025 | BMKG, Kemendikdasmen, Kemendes PDT | APBN K/L | Protokol evaluasi | tanpa ubah Renas |
  | R-M20 | Perbarui daftar perhatian dan lantai | Direktorat Pemetaan dan Evaluasi Risiko Bencana (Pasal 47) | internal | APBN BNPB | Daftar perhatian | berkala bila lokus (No 5 Tabel 12.3) |
  | R-M21 | Masukan peninjauan RIPB | Perpres 87/2020 Pasal 6–7; Direktorat Pengembangan Strategi PB (Pasal 50) | Kemenko PMK (laporan RIPB) | APBN BNPB | Monev RIPB (Progsun butir 11) | RIPB |

  Baris R-A03, R-A06, R-A08, R-A09, R-A11, R-A18 mengikuti pola baris sejenis (APBN BNPB dan APBD; tanpa ubah Renas, kecuali R-A11
  yang membentuk baseline 1.c dan karena itu masuk ET-2026). Tidak satu pun baris memerlukan lapisan dana baru atau forum baru.
- **[Inferensi tim] Draf Tabel 12.6 indikator (B5.19, G22):**

  | Indikator | Baseline (nilai, tahun) | 100 hari | 2026–2027 | 2028–2030 | Sumber data | Lembaga |
  | --- | --- | --- | --- | --- | --- | --- |
  | Renas 1.a meninggal dan hilang per 100.000 | proyeksi 0,22 (2025); realisasi DIBI alam 0,68, semua klasifikasi 0,79 (2025) | – | target berangka ditetapkan (ET-2026) | Target 2029: "Menurun" (resmi) | DIBI | BNPB |
  | Renas 1.b terdampak per 100.000 | proyeksi 2.643 (2025) | – | definisi tertulis | Target 2029: "Menurun" (resmi) | DIBI | BNPB |
  | Renas 1.c / RPJMN KP 08.04.02 | 11.060 per 100.000 (2025) / 6,00 | – | lintasan dipilih (KD-2) | Target 2029: 52.000 per 100.000 / 6,32% (resmi) | Direktorat Peringatan Dini | BNPB, 11 K/L aksi 1.1.2.a |
  | RPJMN KP 08.04.01 kapasitas minimal sedang | 62% (2023); KRB 38% | – | alat ukur dipilih (KD-3) | Target 2029: 90% (resmi) | IKD atau KRB | BNPB |
  | Renas 4.c / RPJMN PP 08.04 penurunan IRB | 1,54 (2023) | catatan metode IRBI 2025 terbit (KD-4) | baseline 2025 skala baru | Target 2029: turun 1,2% per tahun (resmi) | IRBI | BNPB |
  | Renas 2.a kerugian ekonomi langsung terhadap PDB | 0,140 (2022) | – | belum dapat diukur; seri CKAN dibersihkan | Target 2029: 0,135 (resmi) | CKAN, R3P | BNPB, Bappenas |
  | Renas 4.6.2.a penerima Dana Bersama | – (realisasi tidak ditemukan) | – | permintaan data | Target 2029: 100 (resmi) | Tim penelaahan Dana Bersama | Kemenkeu, BNPB |
  | Renstra IKP P1 adopsi rekomendasi | 82,35% | – | Target 2027: 94,12% (resmi) | Target 2029: 100% (resmi) | Renstra | BNPB |
  | Pedoman keadaan tertentu Perpres 46/2026 | belum ada (2026) | rancangan selesai | ditetapkan (2027) | dipakai | JDIH | BNPB (asumsi-kebijakan) |

  Baris tanpa label "resmi" adalah usulan penyusun berlabel Asumsi kebijakan; arah 2030 hanya bila rumusnya tertulis (prinsip 11).

### Celah

- Jadwal RKP 2027 dan tahapan Renja K/L 2027 tidak dibuka; jangkar "Renja 2027" bersandar pada Renas §4.5 saja.
- Notula forum-forum di atas tidak ditemukan (air bab-09 P2 Celah).
- Pasal tugas Direktorat Peringatan Dini, Deputi Bidang RR, Deputi Bidang Logistik dan Peralatan, dan Pusdiklat PB tidak dikutip
  (P1 Celah); kolom "Dasar mandat pemimpin" untuk baris itu menyebut unit tanpa pasal.

---

## Koreksi untuk KERANGKA dan paket data (dibawa ke pemiliknya; berkas ini tidak menyunting berkas lain)

| Tertulis | Temuan | Pemilik |
| --- | --- | --- |
| KERANGKA §5 Bab 12: "127 baris peran, 74 tertulis" | 129 baris, 76 tertulis (berkas kerja); README paket juga menulis jumlah lama | pemilik KERANGKA; `pipa-data` (`bangun/lembaga.py`, README) |
| KERANGKA §5 Bab 12: Unsur Pengarah "Perpres 1/2019 Pasal 10–13" | Pasal 13 memakai nama lama; susunan bernama berlaku di Perban 6/2025 Pasal 9–10; tulis keduanya | pemilik KERANGKA |
| KERANGKA §5 Bab 12: lapisan ekstrem "Sulteng 2018, Sumatra 2025" | Dengan ukuran stimulan yang sama Lombok 2018 (Rp5,69–7,16 T) lebih berat dari Sulteng 2018 (Rp2,90–3,62 T) dan terberat 2015–2025; lantai mengharuskan Lombok 2018; lantai 30 tahun Padang 2009 (stimulan) dan Aceh 2004 (kerugian, PARB) | pemilik KERANGKA; `pipa-data` (`turunan/profil_kerugian.csv` belum memuat baris Lombok dan Padang) |
| KERANGKA §5 Bab 12: indikator Pasal 7 ayat (2) "dikuantifikasi dari DIBI tanpa ambang rekaan" | Tetap, dengan rujukan wajib Putusan MK 261/PUU-XXIII/2025 (amar hlm. 240) | pemilik KERANGKA; penulis Bab 12 |
| KERANGKA §5 Bab 12 dan §7 butir 9: "seri CKAN R3P belum ditarik" | Ditarik 24 Okt 2026 ke ruang kerja peneliti (310 baris, 2017–2024); belum masuk paket `dibi`; berulang dan 6 baris kerugian sama dengan kerusakan | `pipa-data` (paket `dibi`) |
| KERANGKA §5 Bab 12: "DAK" di daftar pembiayaan; PEDOMAN §B5.21 memuat DAK | Dasar dan menu DAK PB 2026 tidak ditemukan | pemilik KERANGKA; penulis Bab 12 |
| KERANGKA §1.1 K13: Kemenperin dan Kemnaker masuk matriks setelah mandat dibaca | Mandat dibaca (E12), tetapi `peran.csv` belum memuat keduanya | `pipa-data` (paket `lembaga`) |
| `dibi/README.md`: `estimasi_kerugian_rumah` "satuannya tidak didokumentasikan" | Nilainya = RB × 60 + RS × 30 + RR × 15 + terendam × 1 pada 4.146 dari 4.146 baris | `pipa-data` |
| Kepka 327/2025 butir 11: RIPB "2020-2045" | Perpres 87/2020: 2020–2044; lampiran Penyelarasan | Biro Hukum (lewat lampiran Penyelarasan) |
| Draf register bab-13: keputusan 14 hari butir (7) KERANGKA §6 belum ber-ID | Usul ID baru untuk penugasan memuat rekomendasi ke ET-2026 dipisah jalur | pemilik register |

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Tabel 12.1 Matriks mandat tertulis | Lembaga × fase dengan kode K/P/R/I, pasal, dan kolom jenis yang disebut khusus; tiga keadaan sel | `lembaga/matriks_ringkas.csv`, `matriks_bencana.csv`, `peran.csv`; P1 temuan 1–11, Inferensi | B5.7, G16 | Sel pelaku dipetakan bertanda inferensi; sel kosong "tidak tercatat di peraturan yang dibaca"; slide E3 ≤ 12 baris; `{a}` = `lembaga.peran.lembaga_n`, `{n}` = `lembaga.matriks.ancaman_n`, `{b}` dua lapis (13 lewat norma lintas jenis, `lembaga.peran.bnpb.k_saat_spesifik_n` lewat norma khusus) |
| Tabel 12.2 Usulan penugasan | Lima peran baru, dasar yang ada, instrumen penetapan, ID register | P1 Inferensi; P4 | B5.7 | Kontributor 2.4.4.a tidak di tabel ini |
| Gambar 12.1 Forum dan jalur adopsi | Kepala BNPB dan Unsur Pengarah; rakor Kemenko PMK (Deputi Bidang Koordinasi PB dan Konflik Sosial); forum K/L penanggung jawab Renas; rakor keadaan tertentu; jalur berkala, bencana, pengendalian, Renstra; ET-2026, EPW-2027, ET-2027 | P2 temuan 1–6; Bahan temuan 1 | B5.23, G21 | Diagram aliran berikon tanpa lebar sebanding; tenggat 2027 dan 2028 ditulis di panah; panah sebagai kepala garis vektor |
| Tabel 12.3 Yang berubah dari Renas PB | Sebelas baris: kode Renas, yang tertulis, perubahan, jenis, jalur, dokumen monev, status P7, bukti, register | P2 Inferensi; `renas_pb_2025_2029.csv`, `renas_aksi_terkait.csv` | B5.7 | Kolom jalur B/D/K/R dan dokumen monev berlegenda; lokus memakai kunci `dibi.sumatra2025.mh_di_lokus_renas_persen`; KD-2, KD-3, KD-4 hanya B atau R |
| Gambar 12.2 Profil kerugian tahunan batas bawah 2015–2025 | Batang per tahun, rentang rendah–tinggi; garis median dan persentil 90; penanda kejadian tunggal Lombok 2018 dan Sumatra 2025 di samping; pembanding PARB Rp22,8 T sebagai catatan | `turunan/profil_kerugian.csv`; `dibi/kejadian_besar.csv`; Strategi PARB | G1 (G12 untuk rentang kejadian) | Pil "Asumsi kebijakan"; kalimat "batas bawah, bukan kerugian ekonomi"; baris pembanding kerugian resmi Cianjur, Sulteng, Lombok, Yogyakarta (dua versi), Aceh 2004; tanpa nominal anggaran |
| Gambar 12.3 Lapisan pembiayaan | Bagian A: lima lapis (prabencana, sering, berat, ekstrem, konflik) × dasar ukuran dan lantai, sumber dana, pemicu, pengguna. Bagian B: per sumber dana (dasar hukum, pemicu, pengelola) | P3 temuan 10–16, Inferensi | B5.21, G21 | Pelapisan berjangkar Strategi PARB (resmi); urutan PFB BKF sebagai keterangan; DSP bukan untuk mitigasi prabencana; DAK "dasar belum diverifikasi" atau dihapus |
| Tabel 12.4 Instrumen hukum | Sebelas instrumen; jenis, isi pokok, pemrakarsa, horizon, lima kolom dokumen, status P7, register | P4 temuan 1–11, Inferensi | B5.20 | Butir 9 "terealisasi: Perban 1/2026"; butir 7 sebagai prasyarat izin prakarsa; ketidakselarasan Progsun hanya di lampiran Penyelarasan |
| Tabel 12.5 Peta jalan | Lima horizon, jangkar bersumber, instrumen atau forum, register | Bahan Inferensi | B5.13, G23 | Kolom WAKTU berpil horizon; batas 2027 dan 2028 dari Renas |
| Tabel lampiran: pemilik per baris register | 28 baris: dasar mandat, forum, sumber dana, instrumen, jalur | Bahan Inferensi; draf register bab-13 | B5.7 | Kolom tambahan register (usul); sumber dana tanpa nominal |
| Tabel 12.6 Indikator | Indikator Renas, RPJMN, Renstra ditambah tata kelola | P2 temuan 7–11; Bahan temuan 3 | B5.19, G22 | Baris usulan penyusun berlabel Asumsi kebijakan; 2.a "belum dapat diukur" |
| Gambar 12.4 Tata kelola dan pelaporan tiga lapis | Internal, lintas K/L, daerah dan data dengan frekuensi berpasal | P5 temuan 1–6, Inferensi | B5.23, G21 | Pernyataan produsen platform di samping lapis data |
| Tabel lampiran (usulan): Seri CKAN kerusakan dan kerugian | Per tahun proposal; baris Sulteng, Batang, dan baris kerugian sama kerusakan ditandai | P3 temuan 8 | B5.7 | Hanya lampiran; "nilai pengajuan pemda, bukan hasil verifikasi" |

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/mitigasi/bukti/bab-12.angka.json` dengan bentuk entri `data/angka.json` (bentuk A: `berkas`
+ `jalur` relatif ke `data/`, atau `jalur_rendah`/`jalur_tinggi`; bentuk B: `nilai` (atau `rendah`/`tinggi`) + `pustaka`).
`data/angka.json` tidak disunting. Kunci yang sudah ada di registri atau berkas bukti lain dirujuk di badan berkas dan tidak
diulang, antara lain `kerugian.nasional.lapisan_sering`, `.lapisan_berat` (registri); `lembaga.peran.baris_*`, `lembaga.peran.bnpb.*`,
`renas.aksi_462a`–`463b`, `perban2026_1.*`, `perban2020_4.dsp.*`, `pp22_2008.dsp.jenis_pengadaan`, `renstra.ikp_p1_rekomendasi.*`,
`perban2025_6.unsur_pengarah.*` (air bab-09); `renas.perubahan_*` (air bab-10); `renas.indikator_*`, `dibi.nasional.*`,
`dibi.sumatra2025.*` (mitigasi bab-01, bab-02, bab-04); `dibi.alam.per100rb.2025_bps2026`, `kapasitas.jarak_90.*`,
`progsun.2026.jangka_tahun` (mitigasi bab-13); `r3p.cianjur2022.*`, `bnpb.sulteng2018.*`, `kemenkopmk.lombok2018.kebutuhan_r3p`,
`bappenas.yogya2006.*` (mitigasi bab-06); `hidromet.sumatra2025.materiil_batas_bawah` (mitigasi bab-07); `perban5_2018.*`,
`pmk97_2025.*` (mitigasi bab-09); `uu24.pasal7.indikator`, `mk.putusan261_2025.indikator_minimal`, `bpk.ihps2_2024.*`,
`lembaga.klaster.*` (mitigasi bab-10). Angka sekunder dan nominal anggaran tidak masuk.

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| lembaga.peran.lembaga_n | 35 lembaga | pustaka pantaubencana-2026-paket-lembaga (olah `lembaga/peran.csv`) | resmi | olah; memuat 9 lembaga hanya dipetakan penyusun; tampil selalu bersama 26 tertulis |
| lembaga.peran.lembaga_tertulis_n | 26 lembaga | idem | resmi | olah |
| lembaga.peran.semua.baris | 50 baris | idem | resmi | olah; memuat 9 baris dipetakan penyusun |
| lembaga.peran.semua.tertulis | 41 baris | idem | resmi | olah |
| lembaga.peran.spesifik.baris | 79 baris | idem | resmi | olah |
| lembaga.peran.spesifik.tertulis | 35 baris | idem | resmi | olah |
| lembaga.peran.ancaman_tanpa_tertulis | 6 dari 13 ancaman | idem | resmi | gempa, tsunami, gunung api, longsor, cuaca ekstrem, kebakaran TPA |
| lembaga.matriks.ancaman_n | 13 ancaman | idem (kolom `matriks_ringkas.csv` di luar `semua`) | resmi | olah |
| lembaga.peran.bnpb.k_saat_spesifik_n | 1 ancaman | idem (`matriks_bencana.csv`) | resmi | karhutla, R094 |
| renas.lokus_prioritas.entri_unik | 171 | pustaka bnpb-2025-renas (hlm. 47–48) | resmi | olah Tabel 2.3 (172 entri) |
| renas.lokus_prioritas.sumatera | 40 | idem | resmi | olah |
| renas.lokus_prioritas.jawa | 66 | idem | resmi | olah |
| dibi.sumatra2025.mh_di_lokus_renas | 429 jiwa | pustaka bnpb-2026-dibi | resmi | olah `dibi_peristiwa.json` × Tabel 2.3 |
| dibi.sumatra2025.mh_di_lokus_renas_persen | 32,0% | idem | resmi | olah 429 / 1.342 |
| dibi.sumatra2025.top10_kab_lokus | 3 dari 10 | idem | resmi | Agam, Kota Sibolga, Kota Padang Panjang |
| renas.indikator_1a.rasio_dibi_2025 | 3,6 kali | pustaka bnpb-2025-renas | resmi | olah 0,80 / 0,22 (semua klasifikasi) |
| renas.indikator_1a.rasio_dibi_alam_2025 | 3,1 kali | pustaka bnpb-2025-renas | resmi | olah 0,68 / 0,22 (bencana alam) |
| renas.aksi_312c.target_2029 | 5.802 rumah/unit/paket | program-terbukti/renas_aksi_terkait.csv `[kode=3.1.2.c].target_2029` | resmi | Renas hlm. 90 |
| renas.aksi_312c.baseline_2024 | 1.160 | idem `[kode=3.1.2.c].baseline_2024` | resmi | Renas hlm. 90 |
| renas.aksi_411c.target_2029 | 2 dokumen | pustaka bnpb-2025-renas (hlm. 95) | resmi | Renas 4.1.1.c |
| renas.aksi_411l.target_2029 | 1 dokumen | pustaka bnpb-2025-renas (hlm. 98) | resmi | Renas 4.1.1.l |
| renas.aksi_471c.target_2029 | 3 dokumen | pustaka bnpb-2025-renas (hlm. 114) | resmi | Renas 4.7.1.c |
| kerugian.nasional.tahun_2018 | Rp9,46–11,90 T | turunan/profil_kerugian.csv `[lapisan=tahun,tahun=2018].rp_rendah` / `.rp_tinggi` | asumsi-kebijakan | DIBI × stimulan |
| kerugian.nasional.ekstrem_sulteng2018 | Rp2,90–3,62 T | idem `[lapisan=ekstrem_analog_sulteng2018]` | asumsi-kebijakan | idem |
| kerugian.nasional.ekstrem_sumatra2025 | Rp5,60–7,06 T | idem `[lapisan=ekstrem_analog_sumatra2025]` | asumsi-kebijakan | idem |
| kerugian.nasional.jumlah_2015_2025 | Rp29,09–37,14 T | pustaka pantaubencana-2026-profil-kerugian | asumsi-kebijakan | olah jumlah 11 baris tahun |
| kerugian.nasional.rerata_2015_2025 | Rp2,64–3,38 T per tahun | idem | asumsi-kebijakan | olah jumlah / 11 |
| kerugian.lombok2018.stimulan_batas_bawah | Rp5,69–7,16 T | pustaka bnpb-2026-dibi | asumsi-kebijakan | olah `kejadian_besar.csv` lombok2018 |
| kerugian.padang2009.stimulan_batas_bawah | Rp7,48–9,43 T | pustaka bnpb-2026-dibi | asumsi-kebijakan | olah `kejadian_besar.csv` padang2009 |
| stimulan.rumah.rb.skema_2010 | Rp50 juta | pustaka kemenkopmk-2023-standar-stimulan | resmi | Kemenko PMK 22 Nov 2023 |
| stimulan.rumah.rs.skema_2010 | Rp25 juta | idem | resmi | idem |
| stimulan.rumah.rr.skema_2010 | Rp10 juta | idem | resmi | idem |
| stimulan.rumah.rb.skema_2023 | Rp60 juta | idem | resmi | idem (dinaikkan atas arahan Presiden menurut siaran; teks peraturan tidak ditemukan) |
| stimulan.rumah.rs.skema_2023 | Rp30 juta | idem | resmi | idem |
| stimulan.rumah.rr.skema_2023 | Rp15 juta | idem | resmi | idem |
| dibi.estimasi_kerugian_rumah.baris_diuji | 4.146 baris | pustaka bnpb-2026-dibi | resmi | olah `dibi_peristiwa.json` |
| dibi.estimasi_kerugian_rumah.baris_cocok | 4.146 baris | idem | resmi | rumus 60/30/15 + terendam × 1 |
| ckan.kerusakan_kerugian_proposal.baris | 310 baris | pustaka bnpb-2026-ckan-kerusakan-kerugian | resmi | CKAN, diakses 24 Okt 2026 |
| ckan.kerusakan_kerugian_proposal.jumlah_2017_2024 | Rp109,34 T | idem | resmi | olah; nilai pengajuan pemda |
| ckan.kerusakan_kerugian_proposal.sulteng2018 | Rp44,16 T | idem | resmi | olah 9 baris Sulteng proposal 2020–2024; berdampingan Rp13,82 T |
| ckan.kerusakan_kerugian_proposal.palu_sigi_donggala_2018 | Rp43,49 T | idem | resmi | olah 6 baris Palu, Sigi, Donggala |
| ckan.kerusakan_kerugian_proposal.baris_tahun_rentang | 43 baris | idem | resmi | olah; tahun kejadian berbentuk rentang |
| ckan.kerusakan_kerugian_proposal.baris_kerugian_sama | 6 baris | idem | resmi | olah; nilai kerugian = nilai kerusakan |
| kemenkeu.parb2018.kerugian_rerata_2000_2016 | Rp22,8 T per tahun | pustaka kemenkeu-bkf-2018-parb (hlm. PDF 22) | resmi | Strategi PARB, mengutip Meilano dkk. 2018 |
| kemenkeu.parb2018.kerugian_teridentifikasi_porsi | sekitar 60% | idem (hlm. PDF 23) | resmi | Strategi PARB, mengutip Bank Dunia |
| kemenkeu.parb2018.aceh2004_kerugian | Rp51,4 T | idem (hlm. PDF 23; juga 15, 36) | resmi | Strategi PARB |
| kemenkeu.parb2018.yogya2006_kerugian | Rp26,1 T | idem (hlm. PDF 23) | resmi | Strategi PARB; berdampingan Bappenas Rp29,1 T |
| kemenkeu.parb2018.ambang_dampak_besar | Rp4 T | idem (hlm. PDF 55) | resmi | Strategi PARB |
| kemenkeu.parb2018.dana_cadangan_porsi_maks | 20% | idem (hlm. PDF 46) | resmi | "mendekati atau di bawah 20%" |

---

## Pustaka

Entri CSL-JSON lengkap di `naskah/mitigasi/bukti/bab-12.pustaka.json` (kunci `id` dipakai kolom `pustaka` registri). Entri yang sama
dengan berkas bukti lain disalin dengan `id` yang sama dan catatan Bab 12 ditambahkan. Ringkas:

| id | Sumber | Verifikasi |
| --- | --- | --- |
| ri-2007-uu24 | UU 24/2007 Penanggulangan Bencana (Pasal 7, 40–41, 51) | primer |
| ri-2008-pp21 | PP 21/2008 Penyelenggaraan PB | primer |
| ri-2008-pp22 | PP 22/2008 Pendanaan dan Pengelolaan Bantuan Bencana | primer |
| ri-2019-pp12 | PP 12/2019 Pengelolaan Keuangan Daerah (BTT) | primer |
| ri-2012-uu7 | UU 7/2012 Penanganan Konflik Sosial (Pasal 55) | primer (dibuka ulang) |
| ri-2023-uu17 | UU 17/2023 Kesehatan (Pasal 353, 368) | primer |
| ri-2018-perpres17 | Perpres 17/2018 PB dalam Keadaan Tertentu | primer |
| ri-2026-perpres46 | Perpres 46/2026 Perubahan Perpres 17/2018 | primer (dibuka ulang) |
| ri-2019-perpres1 | Perpres 1/2019 BNPB | primer (dibuka ulang) |
| ri-2020-perpres87 | Perpres 87/2020 RIPB 2020–2044 | primer |
| ri-2021-perpres75 | Perpres 75/2021 Dana Bersama PB | primer |
| ri-2024-perpres144 | Perpres 144/2024 Kemenko PMK | primer (dibuka ulang) |
| ri-2025-perpres12-rpjmn | Perpres 12/2025 RPJMN 2025–2029 | primer |
| ri-2025-perpres80 | Perpres 80/2025 Renstra dan Renja K/L | primer |
| ri-1970-uu1, ri-2014-uu3, ri-1979-pp11, kesdm-2021-permen32 | Rezim keselamatan kerja, industri, dan migas (riset E12) | primer |
| mk-2026-putusan261 | Putusan MK 261/PUU-XXIII/2025 (28 Agustus 2026) | primer (diunduh ulang; amar hlm. 240) |
| kemenkeu-2025-pmk28 | PMK 28/2025 Pengelolaan Dana Bersama PB | primer |
| kemenkeu-2025-pmk97 | PMK 97/2025 Peta Kapasitas Fiskal Daerah | primer |
| kemenkeu-bkf-2026-pfb | BKF Kemenkeu, halaman Pooling Fund Bencana | primer |
| kemenkeu-bkf-2018-parb | Kemenkeu BKF, Strategi Pembiayaan dan Asuransi Risiko Bencana (2018, revisi) | primer (baru; salinan dan teks di `riset/mentah/`, dicek ulang 24 Okt 2026) |
| kemendes-2025-permendes16 | Permendes PDT 16/2025 fokus dana desa 2026 | primer |
| kemenkes-2026-pmk1 | Permenkes 1/2026 KLB, Wabah, Krisis Kesehatan (teks rancangan) | primer (rancangan) |
| kemenkopmk-2023-standar-stimulan | Kemenko PMK, 22 Nov 2023, standar biaya bantuan rumah rusak | primer (dibuka ulang) |
| antara-2026-stimulan-sumatra | ANTARA, 2 Jul 2026, usulan stimulan Rp70–80 juta | sekunder (dibuka ulang) |
| bnpb-2025-renas | Perban BNPB 1/2025 Renas PB 2025–2029 | primer (dibuka ulang) |
| bnpb-2025-renstra | Perban BNPB 5/2025 Renstra BNPB 2025–2029 | primer |
| bnpb-2025-progsun | Kepka BNPB 327/2025 Progsun 2026 | primer (dibuka ulang) |
| bnpb-2014-produkhukum | Perka BNPB 6/2014 Pembentukan Produk Hukum | primer (baru untuk bab ini) |
| bnpb-2025-otk | Perban BNPB 6/2025 OTK | primer (dibuka ulang) |
| bnpb-2025-otk-ubah | Perban BNPB 11/2025 Perubahan OTK | primer |
| bnpb-2018-keadaan-tertentu | Perban BNPB 5/2018 Keadaan Tertentu | primer (dibuka ulang) |
| bnpb-2020-dsp | Perban BNPB 4/2020 Penggunaan DSP | primer (dibuka ulang) |
| bnpb-2026-dana-bersama | Perban BNPB 1/2026 Penelaahan Dana Bersama | primer (dibuka ulang) |
| bnpb-2026-juklak2 | Juklak BNPB 2/2026 komponen biaya Dana Bersama prabencana | primer |
| bnpb-2023-satudata | Perban BNPB 1/2023 Satu Data Bencana | primer |
| bnpb-2023-renkon | Perban BNPB 2/2023 Rencana Kontingensi | primer |
| bnpb-2017-r3p | Perban BNPB 5/2017 Penyusunan Rencana RR | primer |
| bnpb-2008-perka5 | Perka BNPB 5/2008 persyaratan analisis risiko (metadata JDIH) | primer (metadata) |
| bnpb-2024-juklak5-stimulan | Juklak BNPB 5/2024 stimulan rumah (metadata JDIH) | primer (metadata) |
| bnpb-2025-juklak16 | Juklak BNPB 16/2025 Klaster Logistik (mengutip SK 308/2024) | primer |
| bnpb-2026-dibi | DIBI BNPB, dasbor publik (ditarik 23 Okt 2026) | primer |
| bnpb-2026-ckan-kerusakan-kerugian | CKAN BNPB, rekap nilai kerusakan dan kerugian proposal pemda 2017–2024 | primer (ditarik ulang) |
| cianjur-2022-r3p | R3P Gempa Cianjur 2022 (contoh dokumen BNPB) | primer |
| bnpb-2018-kerugian-sulteng | BNPB, kerusakan dan kerugian Sulteng (sementara, Okt 2018) | primer (arsip) |
| kemenkopmk-2024-rehabrekon-lombok | Kemenko PMK, 20 Mei 2024, kebutuhan R3P Lombok | primer |
| bappenas-2006-dala-yogya | Bappenas, penilaian kerusakan dan kerugian Yogyakarta 2006 | primer |
| bpk-2025-ihps2-2024 | BPK, IHPS II 2024 | primer |
| bpk-2025-status-bencana | BPK Perwakilan Jawa Barat, tulisan hukum 3 Feb 2025 | primer |
| fema-2018-mitsaves | FEMA, Natural Hazard Mitigation Saves fact sheet 2018 | primer (arsip) |
| pantaubencana-2026-paket-lembaga | Paket data `lembaga` Pantau Bencana | primer (olah) |
| pantaubencana-2026-program-terbukti | Paket data `program-terbukti` Pantau Bencana | primer (olah) |
| pantaubencana-2026-profil-kerugian | Turunan `turunan/profil_kerugian.csv` Pantau Bencana | olah |

Sumber berbeda untuk bab ini: 55 entri; 50 berlabel primer (teks atau data dibuka; termasuk dua paket olah Pantau Bencana dan
lembar fakta FEMA yang angkanya estimasi-model), 2 hanya metadata JDIH, 1 rancangan, 1 olah turunan, 1 sekunder (hanya baris
kepekaan). Sumber resmi pemerintah RI berbeda di luar paket olah: lebih dari 40. Dua dibuka baru untuk bab ini pada
pemutakhiran ini: `kemenkeu-bkf-2018-parb` dan `bnpb-2014-produkhukum` (yang kedua sudah dibaca berkas bukti air bab-01 dan mitigasi
bab-13); empat dibuka atau ditarik ulang: `mk-2026-putusan261`, `bnpb-2026-ckan-kerusakan-kerugian`, `kemenkopmk-2023-standar-stimulan`,
`antara-2026-stimulan-sumatra`.

---

## Catatan pemeriksaan (24 Okt 2026)

Delapan temuan pemeriksa dicek ke sumber; semuanya diterima, dengan rincian berikut.

| No | Temuan | Hasil cek | Tindakan |
| --- | --- | --- | --- |
| 1 | `lembaga_n` 35 dan `semua.baris` 50 berlabel resmi tanpa lapis kedua | Benar: `peran.csv` (SHA-1 `8d35ac37df2f`) memuat 9 lembaga tanpa baris tertulis dan 9 baris dipetakan di `semua` | P1 temuan 2–3, slot `{a}` dua lapis, catatan kunci di angka.json |
| 2 | Kemenhut, Kemenko Polkam, KLH/BPLH ditulis sebagai mandat tertulis | Benar: R080, R088, R089, R137 berjenis "dipetakan penyusun"; Polri R132 tertulis | Tanda pewaris nomenklatur di temuan 6; `*` pada sel Kemenko Polkam di Tabel 12.1 |
| 3 | Target dan lokus ditulis sebagai isi aturan Renas §4.6 | Benar: hlm. 125 hanya menyebut "kebijakan, strategi, program, dan kegiatan" | Inti dan temuan 1 diperbaiki; aturan (a) bertanda tafsiran tim |
| 4 | Skema 2023 disebut "usulan"; label tidak konsisten | Sebagian benar: siaran memakai "diusulkan" dan juga "Bapak Presiden menghitung akhirnya dinaikkan"; label disamakan ke resmi (siaran resmi, tanpa teks peraturan) | Catatan skema_2023, P3 temuan 6, Celah P3 butir 3 |
| 5 | Dana kontinjensi dimasukkan ke pembiayaan mitigasi | Benar (PP 22/2008 Pasal 6 ayat (1): kesiapsiagaan prabencana) | Inti P3 dan Gambar 12.3 A dipisah |
| 6 | "Bukan celah komando" melampaui sumber | Benar: Perpres 1/2019 Pasal 5 bersyarat bencana nasional; UU 24/2007 Pasal 50 ayat (1) huruf i dicek di teks paket | Inferensi P1 ditulis ulang dengan rujukan P4 temuan 5 |
| 7 | 3.1.2.c lawan 62.956 tidak sebanding; Renas mendahului kejadian | Benar | Inti P2, temuan 12, Tabel 12.3 No 6, Inferensi diperbaiki |
| 8 | Enam angka PARB tidak dapat diverifikasi | PDF diunduh ulang 24 Okt 2026, SHA-1 `8911e1f7a5907843c772ffb6c790691a6622b954` cocok; keenam angka dan halaman PDF 15, 22, 23, 35, 46, 52, 54–56 cocok; Aceh Rp51,40 T juga di hlm. PDF 36 (bukan 35) | Salinan ke `riset/mentah/`; lokasi kunci Aceh dikoreksi; angka tidak berubah |

