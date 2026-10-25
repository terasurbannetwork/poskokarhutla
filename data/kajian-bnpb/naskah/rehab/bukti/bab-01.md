---
kajian: rehab
bab: 1
judul: BAB 1 PENDAHULUAN
jenis: berkas bukti
disusun: 25 Oktober 2026
status: bukti draf (belum melewati penyunting substansi)
pemilik_berkas: belum ditetapkan (KERANGKA rehab §12; glob data/** saat ini jatuh ke pipa-data)
pasangan: bab-01.angka.json (usulan kunci registri rehab.*), bab-01.pustaka.json (CSL-JSON, 21 sumber)
---

# Berkas bukti BAB 1 PENDAHULUAN, Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030

Aturan yang dipakai: Buku Pegangan L56–L64 dan `PEDOMAN-DESAIN.md` §C9 (empat bagian per pertanyaan kunci),
`rehab/KERANGKA.md` §1 (prinsip), §3 (tesis), §4 BAB 1, §5 (registri), §10 (celah), `rehab/KEPUTUSAN-AWAL.md` (Q1–Q20
berstatus keputusan; R1–R5), lalu `KEPUTUSAN.md`. Label keyakinan memakai empat kode: **resmi**, **terverifikasi**,
**estimasi-model**, **asumsi-kebijakan**. Kolom verifikasi (primer atau sekunder) ditulis bila angka dibaca dari kutipan
pihak lain. Angka berverifikasi sekunder hanya boleh ke lampiran rekonsiliasi, tidak ke badan teks (KEPUTUSAN-AWAL R3, Q16).
Butir bertanda **[Inferensi tim]** adalah penilaian penyusun, bukan fakta bersumber. Bab ini tidak memuat keluaran model,
jadi label estimasi-model tidak dipakai.

Bahan yang dibaca: `rehab/riset/A-hukum-kelembagaan.md` (§1–§8), `F-data-repo.md` (§2–§4), `D-sistem-pipa.md` (sumber 10,
12, 21, 22, 36), `E-pelajaran-program.md` (sumber 1, 14, 27–31), `B-jembatan.md` (sumber 1, 29, 36). Paket data:
`data/dibi` (README dibaca utuh; `rekap_nasional_tahunan.csv`, `rekap_provinsi_tahunan.csv`, `kejadian_besar.csv`),
registri `data/angka.json`. Korpus peraturan `data/raw/hukum/teks` (Perban 5/2017, 6/2017, 4/2024, 4/2020, Perka 12/2010,
Juklak 3/2023) dan `data/lembaga/mentah/teks/uu-24-2007.json.gz`; status dari `public/data/bnpb/hukum/katalog.json`. Semua
hitungan DIBI di berkas ini dijalankan ulang sesi ini (Python stdlib, filter `klasifikasi=alam`, `cakupan=bencana`).
Sumber web dibuka 25 Oktober 2026: dua rilis ePPID Kementerian PU (5 Februari dan 11 Mei 2026), rilis Bina Marga BPJN Aceh
(3 Desember 2025), rilis Setneg (13 Agustus 2026), Info Singkat Badan Keahlian DPR (Januari 2026), halaman dan PDF salinan
Keppres 1/2026 di JDIH Kemenko Infrastruktur (teks dibaca utuh lewat `pdftotext`).

## 0. Kerangka bab dari rehab/KERANGKA.md §4

- **Judul:** BAB 1 PENDAHULUAN (perkiraan 6 hlm).
- **Subbab:** 1.1 Latar Belakang; 1.2 Posisi terhadap R3P, Renas PB, dan Dua Grand Design Saudara; 1.3 Tujuan; 1.4 Lingkup,
  Lapis Waktu, dan Definisi Operasional; 1.5 Status Dokumen dan Jalur Adopsi; 1.6 Sistematika.
- **Tujuan bab:** menjelaskan mengapa air dan akses menjadi pokok RR 2026–2030 dan apa yang dicakup.
- **Pertanyaan kunci:** (1) Mengapa rangkaian banjir dan longsor Sumatra November 2025 dan seri DIBI 2018–2025 menuntut
  Grand Design RR untuk air dan akses sekarang? (2) Apa yang sudah diatur UU 24/2007, PP 21/2008, dan Perban BNPB 5/2017,
  6/2017, 4/2024, dan apa yang belum? (3) Apa arti rehabilitasi, rekonstruksi, membangun kembali lebih baik, dan tiga lapis
  waktu dalam kajian ini?
- **Temuan kunci yang diharapkan (KERANGKA):** jembatan rusak 2018–2025 3.833, 2025 1.088; Sumatra November 2025 62.956
  rumah RB, 228.006 rumah rusak, 970.876 mengungsi; Sumatra 2025 178 SPAM terdampak, sekitar 95,5% berfungsi Mei 2026,
  perbaikan permanen ditargetkan Agustus 2028; definisi UU 24/2007 Pasal 1 angka 11–12 dan Perban 6/2017 Pasal 1 angka 5.
- **Komponen:** Gambar 1.1 jembatan rusak per tahun 2018–2025 dengan anotasi 2025 (G1, `dibi/rekap_nasional_tahunan.csv`);
  Kotak 1.1 definisi operasional dan tiga lapis (B5.5); Tabel 1.1 lingkup jenis bencana × sektor (B5.7).
- **Status data menurut KERANGKA:** ada.
- **Keputusan yang diminta yang bergantung pada bab ini:** KD-R1 (waktu pulih sebagai ukuran keberhasilan) memakai angka
  latar 1.1; KD-R2 (jalur dana aset desa) memakai Perban 4/2024 Pasal 5 huruf e di 1.2; KD-R3 memakai posisi Satgas di 1.2.

### 0.1 Hasil cek terhadap KERANGKA yang wajib diketahui penulis bab

1. **Porsi banjir pada jembatan rusak 2018–2025 bukan sekitar 91%, melainkan 89,2%.** Hitung ulang dari
   `dibi/rekap_nasional_tahunan.csv` (alam, bencana): banjir 3.419, longsor 246, gempa bumi 52, erupsi 51, cuaca ekstrem 37,
   gelombang pasang dan abrasi 28; jumlah 3.833. Angka riset F (banjir 3.490, longsor 250, gempa 90, erupsi 52) menjumlah
   3.947, tidak sama dengan 3.833, dan tidak dapat direproduksi di cakupan `bencana` maupun `semua_laporan` (semua laporan:
   banjir 3.455 dari 3.887). Kalimat tesis KERANGKA §3 ("sekitar 91% karena banjir") dan kunci
   `rehab.dibi.jembatan_rusak.porsi_banjir_persen` perlu diganti ke 89,2 (sekitar 89%). Angka gempa 90 di Kartu 8.2 dan
   longsor 250 di Kartu 8.6 juga perlu dicek pemilik bab 8.
2. **Target "Agustus 2028" hanya untuk Sumatera Barat.** Rilis PU 5 Februari 2026 menulis penanganan permanen SPAM
   Sumatera Barat ditargetkan selesai bertahap hingga Agustus 2028; rilis itu tidak menyebut target provinsi lain. Naskah
   tidak boleh menulis "SPAM Sumatra permanen Agustus 2028".
3. **128 sumur bor dan 86 sumur dalam bukan dua versi yang bertentangan.** Rilis PU 5 Februari 2026: Ditjen SDA 25 sumur bor
   air dalam, Ditjen Cipta Karya 103 unit (17 sumur dangkal, 86 sumur dalam). 128 = 25 + 103; 86 adalah bagian Cipta Karya.
   Rincian per provinsi 86 sumur dalam di rilis yang sama hanya menjumlah 86 bila 63 unit Aceh dihitung (17 selesai + 46
   dikerjakan) ditambah Sumut 5 dan Sumbar 18 = 86; cocok. Catatan rekonsiliasi KERANGKA Bab 7 ("86 lawan 128") perlu dibaca
   sebagai bagian lawan keseluruhan.
4. **"14 jembatan nasional putus di Aceh" tidak sepenuhnya didukung sumber.** Rilis Bina Marga BPJN Aceh 3 Desember 2025
   menulis 14 jembatan roboh atau terputus per 1 Desember 2025 dari inspeksi BPJN, tetapi hanya menyebut satu jembatan
   (Krueng Tingkeum) sebagai jalan nasional. Naskah menulis "14 jembatan roboh atau terputus di Aceh menurut inspeksi BPJN
   Aceh", tanpa kata "nasional".
5. **Ada angka resmi jembatan daerah Sumatra yang belum ada di KERANGKA.** Rilis PU 11 Mei 2026 (data 7 Mei 2026): sekitar
   67% dari 1.181 unit jembatan daerah terdampak sudah dapat difungsikan kembali; 94% dari 2.421 ruas jalan daerah terdampak
   fungsional; jalan dan jembatan nasional terdampak fungsional 100%. Ini angka resmi primer (Kementerian PU) dan dapat
   menggantikan angka sekunder "jembatan daerah Aceh 58,93%" untuk titik Mei 2026. Angka 1.181 berbeda dengan DIBI 2025 tiga
   provinsi (744); ditulis berdampingan (lihat P1).
6. **Keppres 1/2026 sudah dibuka (salinan PDF JDIH Kemenko Infrastruktur).** Ketua tim pelaksana Menteri Dalam Negeri;
   Kepala BNPB Wakil Ketua II tim pelaksana; ketua tim pengarah Menko PMK; Bidang Infrastruktur dikoordinasikan Menteri PU
   (anggota Menteri Perhubungan); Bidang Pengelolaan Data dikoordinasikan Kepala BPS. Celah KERANGKA §10 butir 10 untuk
   Keppres tertutup; Inpres 18/2025 tetap belum dibuka utuh.
7. **Definisi rehabilitasi di Perban 6/2017 tidak sama persis dengan UU 24/2007.** Perban 6/2017 Pasal 1 angka 3 menambah
   frasa "kehidupan dan penghidupan masyarakat" pada sasaran utama; UU 24/2007 Pasal 1 angka 11 menulis "pemerintahan dan
   kehidupan masyarakat". Kotak 1.1 memakai rumusan UU dan mencatat perluasan Perban.
8. **Seri DIBI alam 2024 dan sesudahnya tersaring ambang Juklak 7/2023** (patahan seri 2024, `dibi/README.md`). Untuk
   jembatan, perbandingan 2025 dengan 2018–2024 tetap memakai cakupan `bencana` alam dan disertai catatan patahan; arah
   kesimpulannya tidak berubah karena penyaringan ambang hanya dapat menurunkan angka pasca-2024.

---

## P1. Mengapa rangkaian banjir dan longsor Sumatra November 2025 dan seri DIBI 2018–2025 menuntut Grand Design RR untuk air dan akses sekarang?

### Inti

DIBI mencatat 3.833 jembatan rusak akibat bencana alam pada 2018–2025, dan 1.088 di antaranya (28%) terjadi pada 2025,
2,8 kali rerata tahunan 2018–2024; rangkaian Sumatra November 2025 menambah 62.956 rumah rusak berat dan 970.876 orang
mengungsi. Sementara layanan nasional pulih cepat (jalan dan jembatan nasional 100% fungsional dan sekitar 95,5% dari 178
SPAM terdampak berfungsi pada Mei 2026), jembatan daerah baru sekitar 67% dari 1.181 unit, dan kerusakan sistem air sama
sekali tidak tercatat di DIBI, sehingga ukuran pemulihan air dan akses belum ada di instrumen BNPB.

### Temuan bersumber

1. **Jembatan rusak akibat bencana alam 2018–2025: 3.833 unit.** Per tahun 2018–2025: 275; 433; 487; 505; 342; 258; 445;
   1.088. Sumber: `dibi/rekap_nasional_tahunan.csv`, jumlah kolom `jembatan_rusak` baris `klasifikasi=alam`,
   `cakupan=bencana`, tahun 2018–2025 (pustaka `bnpb-dibi`; kunci `rehab.dibi.jembatan_rusak.2018_2025`,
   `rehab.dibi.jembatan_rusak.2025`). Label resmi, primer.
2. **2025 adalah 28,4% dari total delapan tahun dan 2,8 kali rerata 2018–2024 (392,1 per tahun; median 433).** Sumber:
   hitungan dari baris yang sama (kunci `rehab.dibi.jembatan_rusak.porsi_2025_persen`,
   `rehab.dibi.jembatan_rusak.rerata_2018_2024`, `rehab.dibi.jembatan_rusak.rasio_2025_rerata`). Label resmi (olah).
   Catatan patahan seri 2024 berlaku (`dibi/README.md` bagian Patahan seri: sejak data 2024 laporan disaring ambang Juklak
   BNPB 7/2023 tentang Standar Data Kejadian dan Dampak Bencana, pustaka `bnpb-2023-standar-data`).
3. **Versi semua klasifikasi 2025: 1.114 jembatan**, termasuk 26 dari kebakaran permukiman (nonalam). Sumber:
   `dibi/rekap_nasional_tahunan.csv` `[tahun=2025,klasifikasi=semua,cakupan=bencana].jembatan_rusak` (kunci
   `rehab.dibi.jembatan_rusak.semua_klasifikasi.2025`). Label resmi, primer. Ditulis berdampingan, angka utama tetap alam
   (lingkup Q5).
4. **Banjir menyumbang 3.419 dari 3.833 jembatan rusak (89,2%)**; longsor 246, gempa bumi 52, erupsi 51, cuaca ekstrem 37,
   gelombang pasang dan abrasi 28. Sumber: `dibi/rekap_nasional_tahunan.csv` per `kategori_dibi` (kunci
   `rehab.dibi.jembatan_rusak.banjir.2018_2025`, `rehab.dibi.jembatan_rusak.porsi_banjir_persen`). Label resmi (olah).
   **Dibantah oleh / berbeda dengan:** `rehab/riset/F-data-repo.md` §2 dan KERANGKA §3 (banjir 3.490, sekitar 91%); tidak
   dapat direproduksi (lihat 0.1 butir 1).
5. **Kolom `jembatan_rusak` bernilai 0 di semua tahun 2008–2017**, sehingga seri efektif mulai 2018. Sumber: baris yang sama;
   `F-data-repo.md` §2 dan §4 butir 2. Label resmi. Kolom tidak memisah status jalan (nasional, provinsi, kab/kota, desa)
   maupun jenis jembatan.
6. **2025 per provinsi: Aceh 480, Sumatera Barat 182, Sumatera Utara 82 (tiga provinsi 744 dari 1.088 nasional)**; 2018–2025:
   Aceh 633, Sumatera Barat 521, Sulawesi Selatan 280. Sumber: `dibi/rekap_provinsi_tahunan.csv` (alam, bencana) (kunci
   `rehab.dibi.jembatan_rusak.prov.aceh.2025`, `rehab.dibi.jembatan_rusak.sumatra3prov.2025`,
   `rehab.dibi.jembatan_rusak.prov.aceh.2018_2025`). Label resmi (olah). Angka 744 memuat semua kejadian alam 2025 di tiga
   provinsi, bukan hanya rangkaian November.
7. **Sumatra November 2025 (Aceh, Sumut, Sumbar; banjir dan longsor): 62.956 rumah rusak berat, 228.006 rumah rusak
   (RB+RS+RR), 970.876 mengungsi, 1.202 meninggal, 140 hilang, 55 kab/kota.** Sumber: `dibi/kejadian_besar.csv`
   `[kode=sumatra2025,versi=DIBI]`, jendela 15 November–31 Desember 2025 pilihan penyusun (kunci lama
   `dibi.sumatra2025.rumah_rusak_berat`, `dibi.sumatra2025.mengungsi`, `dibi.sumatra2025.meninggal`,
   `dibi.sumatra2025.hilang`, `dibi.sumatra2025.kab_terdampak`; kunci baru `rehab.lantai.banjir.sumatra2025.rumah_rusak`).
   Label resmi, primer, turunan penyusun (jendela).
8. **Rumah rusak berat akibat bencana alam 2025: 70.391**, tertinggi sesudah 2018 (117.655); 2019–2024 berkisar 4.870
   sampai 21.335. Sumber: `dibi/rekap_nasional_tahunan.csv` (alam, bencana) (kunci `rehab.dibi.rumah_rb.2025`). Label resmi
   (olah).
9. **SPAM Sumatra: 143 dari 176 SPAM terdampak berfungsi per 2 Februari 2026; kapasitas dipulihkan lebih dari 5.300 l/detik;
   537 unit sarana darurat disiagakan; 128 sumur bor (SDA 25 sumur air dalam; Cipta Karya 17 sumur dangkal dan 86 sumur
   dalam).** Sumber: Kementerian PU, ePPID, "Update Pemulihan Layanan Air Bersih Pascabencana Sumatera, Kementerian PU
   Fungsionalkan 142 SPAM", terbit 5 Februari 2026,
   https://sahabat.pu.go.id/eppid/berita/detail/update-pemulihan-layanan-air-bersih-pascabencana-sumatera-kementerian-pu-fungsionalkan-142-spam,
   diakses 25 Oktober 2026 (pustaka `pu-2026-spam-sumatera-feb`; kunci `rehab.pipa.sumatra2025.spam_berfungsi_feb2026`,
   `rehab.pipa.sumatra2025.spam_terdampak_feb2026`, `rehab.pipa.sumatra2025.sarana_darurat_feb2026`,
   `rehab.pipa.sumatra2025.sumur_bor_feb2026`). Label resmi, primer. Judul rilis menulis 142, isi 143; angka isi dipakai.
10. **Penanganan permanen SPAM Sumatera Barat ditargetkan selesai bertahap hingga Agustus 2028.** Sumber: rilis yang sama
    (kunci `rehab.pipa.sumbar.target_permanen`). Label resmi, primer. Hanya Sumbar; target Aceh dan Sumut tidak disebut.
11. **Per 7 Mei 2026: sekitar 95,5% dari 178 SPAM terdampak kembali fungsional; jalan dan jembatan nasional terdampak 100%
    fungsional; 94% dari 2.421 ruas jalan daerah terdampak fungsional; sekitar 67% dari 1.181 unit jembatan daerah terdampak
    sudah dapat difungsikan kembali.** Sumber: Kementerian PU, ePPID, "Kementerian PU Percepat Penanganan Infrastruktur
    Terdampak Bencana di Sumatera", terbit 11 Mei 2026,
    https://sahabat.pu.go.id/eppid/berita/detail/kementerian-pu-percepat-penanganan-infrastruktur-terdampak-bencana-di-sumatera-mayoritas-infrastrukt,
    diakses 25 Oktober 2026 (pustaka `pu-2026-infrastruktur-sumatera-mei`; kunci `rehab.pipa.sumatra2025.spam_terdampak`,
    `rehab.pipa.sumatra2025.persen_fungsi_mei2026`, `rehab.akses.sumatra2025.jembatan_daerah_terdampak`,
    `rehab.akses.sumatra2025.jembatan_daerah_persen_fungsi_mei2026`, `rehab.akses.sumatra2025.jalan_daerah_ruas_terdampak`,
    `rehab.akses.sumatra2025.jalan_daerah_persen_fungsi_mei2026`). Label resmi, primer. "Fungsional" tidak didefinisikan
    (sementara atau permanen).
12. **Angka SPAM terdampak berbeda versi: 176 (Februari 2026) dan 178 (Mei 2026).** Sumber: butir 9 dan 11. Ditulis
    berdampingan dengan tanggal datanya. Versi 153 dari 176 (11 Februari 2026, Investortrust mengutip Menteri PU,
    `E-pelajaran-program.md` [28]) berstatus sekunder, hanya lampiran rekonsiliasi.
13. **Jembatan Sumatra 2025 berbeda versi:** DIBI 2025 tiga provinsi 744 (butir 6); PU 1.181 jembatan daerah terdampak per
    7 Mei 2026 (butir 11); BPJN Aceh 14 jembatan roboh atau terputus per 1 Desember 2025 (Ditjen Bina Marga, terbit
    3 Desember 2025,
    https://binamarga.pu.go.id/balai-aceh/berita/dampak-bencana-banjir-dan-longsor-sumatera-kementerian-pu-percepat-penanganan-14-jembatan-rusak-di-aceh,
    diakses 25 Oktober 2026; pustaka `binamarga-2025-jembatan-aceh`; kunci `rehab.akses.aceh.jembatan_putus_des2025`; label
    resmi, primer); BNPB 498 jembatan rusak per 10 Desember 2025 (Kontan, `B-jembatan.md` [36]; resmi, sekunder, lampiran
    saja). Empat angka ditulis berdampingan; tidak dipilih satu.
14. **Rumah rusak Sumatra berbeda versi:** DIBI 228.006 (butir 7); BNPB sekitar 147.000 per 17 Desember 2025 dan Kementerian
    PKP sekitar 189.308 rumah terdampak per 9 Januari 2026, dengan catatan "proses pemutakhiran yang belum sepenuhnya sinkron"
    (Badan Keahlian DPR RI, Info Singkat Vol. XVIII No. 2, Januari 2026, Rafika Sari,
    https://berkas.dpr.go.id/pusaka/files/info_singkat/Info%20Singkat-XVIII-2-II-P3DI-Januari-2026-230.pdf, diakses
    25 Oktober 2026; pustaka `dpr-2026-infosingkat-rumah-sumatra`). Label: dokumen DPR resmi primer untuk pernyataan
    ketidaksinkronan; angka BNPB dan PKP di dalamnya resmi, sekunder (dikutip DPR), jadi masuk lampiran rekonsiliasi.
15. **DIBI tidak memiliki kolom kerusakan SPAM, pipa, sumur, atau waktu pulih layanan.** Sumber: daftar kolom
    `dibi/rekap_nasional_tahunan.csv` (kejadian, korban, rumah, `pendidikan_rusak`, `rumah_ibadat_rusak`, `fasyankes_rusak`,
    `fasum_rusak`, `kantor_rusak`, `jembatan_rusak`); `F-data-repo.md` §4 butir 1. Label resmi (struktur data). Fasilitas
    umum rusak 2015–2025: 21.703 (kategori DIBI, tidak memisah SPAM; kunci `rehab.dibi.fasum_rusak.2015_2025`).
16. **Preseden kerusakan sistem air pada gempa:** Lombok 2018, 37 titik SPAM rusak (Buku Satgas Penanganan Gempa Lombok,
    Kementerian PUPR, data sampai 31 Maret 2019; pustaka `kemenpupr-2019-satgas-lombok`; kunci `rehab.pipa.lombok.spam_rusak`);
    Cianjur 2022, 10 titik area kerusakan pipa SPAM (Penanganan Gempa Cianjur 2022, Kementerian PUPR, status 25 September
    2023; pustaka `kemenpupr-2023-cianjur`; kunci `rehab.pipa.cianjur.titik_kerusakan_pipa`). Label resmi, primer (dibaca
    utuh oleh riset D; tidak dibuka ulang sesi ini).
17. **Program jembatan K/L berskala ribuan berjalan bersamaan:** TNI AD 3.008 titik jembatan dikerjakan, 2.500 selesai,
    508 dalam proses, 798 titik di wilayah bencana; Polri (Jembatan Merah Putih Presisi) 895 unit di 30 Polda, 874 selesai,
    17 dibangun; TNI AD 3.000 sumber air bersih (Kementerian Sekretariat Negara, 13 Agustus 2026,
    https://www.setneg.go.id/baca/index/resmikan_3395_jembatan_tni_polri_dan_3000_sumber_air_bersih_tni_ad_presiden_prabowo_misi_bakti_kepada_rakyat,
    diakses 25 Oktober 2026; pustaka `setneg-2026-jembatan-tni-polri`; kunci `rehab.jembatan.garuda.titik_2026_08`,
    `rehab.jembatan.garuda.selesai_2026_08`, `rehab.jembatan.garuda.titik_wilayah_bencana_2026_08`,
    `rehab.jembatan.polri_mpp.jumlah_total_2026_08`, `rehab.jembatan.polri_mpp.selesai_2026_08`). Label resmi, primer. Judul
    rilis menulis 3.395 jembatan TNI-Polri (= 2.500 + 895, hitungan penyusun); rilis tidak menjelaskan, dan isi menyebut
    3.008 titik TNI AD. Bab 1 hanya menyebut skala; pembahasan di Bab 5.
18. **Satgas Percepatan RR Pascabencana Alam Aceh, Sumut, dan Sumbar dibentuk dengan Keppres 1/2026 (8 Januari 2026)**, bertugas
    menyusun dan menetapkan kebijakan umum termasuk rencana induk dan/atau rencana aksi (Pasal 2 huruf a); rencana induk
    ditetapkan ketua tim pengarah (Pasal 7 huruf b); ketua tim pengarah melapor ke Presiden tiap 2 bulan (Pasal 10). Sumber:
    salinan Keppres 1/2026, JDIH Kemenko Infrastruktur,
    https://jdih.kemenkoinfra.go.id/dokumen/file/keputusan-presiden-republik-indonesia/2026/keppres-nomor-1-tahun-2026.pdf,
    diakses 25 Oktober 2026 (pustaka `ri-2026-keppres1`). Label resmi, primer.

### Inferensi

- **[Inferensi tim]** Beban akses naik pada saat program jembatan K/L juga naik ke skala ribuan; tanpa ukuran bersama,
  angka program (2.500 selesai TNI AD, 874 Polri) dan angka kerusakan (1.088 DIBI 2025, 1.181 PU jembatan daerah Sumatra)
  tidak dapat dicocokkan per lokasi, sehingga tidak diketahui berapa jembatan rusak akibat bencana yang sudah diganti oleh
  program mana. Ini dasar KD-R3 dan R-RR-04.
- **[Inferensi tim]** Pola "nasional cepat, daerah tertinggal" terlihat di satu kejadian dengan angka resmi: jalan dan
  jembatan nasional 100% pada 7 Mei 2026 lawan jembatan daerah sekitar 67%. Pola yang sama dicatat riset E di Sulteng
  (huntap tersisa 382 dari 5.598 per Juni 2024; resmi, Kemenko PMK, `E-pelajaran-program.md` [14]), tetapi Bab 1 hanya
  menyebutnya sebagai pengantar Bab 4.5.
- **[Inferensi tim]** "SPAM berfungsi" mengukur unit, bukan orang terlayani atau liter per orang per hari; 95,5% unit
  berfungsi tidak menjawab berapa jiwa masih bergantung pada 537 sarana darurat. Ini dasar lensa layanan (KERANGKA prinsip
  4) dan R-RR-09.
- **[Inferensi tim]** Ketiadaan kolom SPAM di DIBI berarti Grand Design tidak dapat menetapkan sasaran waktu pulih air
  berangka sekarang; yang dapat ditetapkan adalah baseline paling lambat 2027 (Q11, KD-R1).
- **[Inferensi tim]** Kebutuhan "sekarang" juga datang dari kalender: R3P paling lama 3 tahun (Perban 5/2017 Pasal 10)
  berarti R3P Sumatra 2025 berjalan sampai sekitar akhir 2028, sejalan dengan target Sumbar Agustus 2028, dan musim hujan
  2026/2027 jatuh di tengah masa itu.

### Celah

- **Kerusakan dan pemulihan SPAM per kejadian tidak ada di DIBI.** Disajikan dari rilis PU per titik waktu (Februari dan Mei
  2026) dan buku Satgas PU Lombok dan Cianjur; tidak ada kurva harian. Permintaan data: Kementerian PU (Cipta Karya) daftar
  SPAM terdampak per kab dengan tanggal fungsi kembali dan jiwa terlayani.
- **Jembatan per status jalan dan per kab tidak ada di DIBI paket.** Disajikan nasional dan provinsi; permintaan data ke
  Pusdatinkom (tarik ulang per kab 2018–2025) dan Bina Marga (jembatan nasional terdampak Sumatra dan tanggal fungsi).
- **Definisi "fungsional" dan "dapat difungsikan kembali" di rilis PU tidak tertulis.** Naskah menulis kata rilis apa adanya
  dan tidak menyamakannya dengan pulih permanen.
- **Progres SPAM dan jembatan daerah Sumatra sesudah Mei 2026 tidak ditemukan di sumber resmi.** Angka Oktober 2026
  (jembatan daerah Aceh 58,93%, CNN Indonesia 5 Oktober 2026, `E-pelajaran-program.md` [31]) sekunder, lampiran saja.
- **Rencana induk RR Sumatra (Keppres 1/2026 Pasal 7) dan R3P Aceh, Sumut, Sumbar tidak dibuka.** Angka Rp100,1 triliun
  2026–2028 hanya dari Antara (sekunder) dan tidak dikutip di badan teks (juga P5).
- **Rerata dan rasio 2025 memakai seri yang patah di 2024.** Ditulis dengan catatan patahan; tidak ada seri alternatif.

---

## P2. Apa yang sudah diatur UU 24/2007, PP 21/2008, dan Perban BNPB 5/2017, 6/2017, 4/2024, dan apa yang belum?

### Inti

Rantai norma sudah menamai air dan akses di ketiga tahap: pemenuhan air bersih dan pemulihan segera prasarana vital saat
tanggap darurat (UU 24/2007 Pasal 48 huruf f, 53 huruf a, 56), perbaikan prasarana umum dan pembangunan kembali tahan
bencana pascabencana (Pasal 58, 59), R3P paling lama 90 hari dan berlaku paling lama 3 tahun dengan sektor "sumber daya air,
air bersih dan sanitasi" dan "transportasi darat" (Perban 5/2017), dan hibah RR untuk konstruksi (Perban 4/2024). Yang
belum diatur: ukuran atau standar waktu pulih layanan air dan akses, pembiayaan hibah RR untuk aset desa, lahan, serta
operasi dan pemeliharaan (Perban 4/2024 Pasal 5), dan pengikatan program K/L di luar R3P.

### Temuan bersumber

1. **UU 24/2007 Pasal 48 huruf f:** tanggap darurat meliputi "pemulihan dengan segera prasarana dan sarana vital"; **Pasal 56:**
   dilakukan "dengan memperbaiki dan/atau mengganti kerusakan akibat bencana"; **Pasal 53 huruf a:** pemenuhan kebutuhan dasar
   meliputi bantuan penyediaan "kebutuhan air bersih dan sanitasi". Sumber: `data/lembaga/mentah/teks/uu-24-2007.json.gz`
   hlm. 23–25 (pustaka `ri-2007-uu24`). Label resmi, primer.
2. **UU 24/2007 Pasal 58 ayat (1) huruf b:** rehabilitasi dilakukan melalui "perbaikan prasarana dan sarana umum"; **Pasal 59
   ayat (1):** rekonstruksi "dilakukan melalui kegiatan pembangunan yang lebih baik", meliputi huruf a "pembangunan kembali
   prasarana dan sarana" dan huruf d "penerapan rancang bangun yang tepat dan penggunaan peralatan yang lebih baik dan tahan
   bencana". Sumber: idem hlm. 25–26. Label resmi, primer.
3. **PP 21/2008 Pasal 54 ayat (2):** pemulihan segera prasarana dan sarana vital dilakukan instansi terkait "yang
   dikoordinasikan oleh Kepala BNPB dan/atau kepala BPBD"; **Pasal 57 ayat (1)** dan **Pasal 76 ayat (1):** rehabilitasi dan
   rekonstruksi tanggung jawab pemerintah dan/atau pemda terdampak, rekonstruksi tanggung jawab pemda "kecuali prasarana dan
   sarana yang merupakan tanggung jawab Pemerintah"; **Pasal 66:** perbaikan prasarana umum "dilakukan secara gotong royong,
   dengan bimbingan dan/atau bantuan teknis". Sumber: PDF PP 21/2008 JDIH BPK, string dicek `A-hukum-kelembagaan.md` [2]
   §1–§2 (pustaka `ri-2008-pp21`). Label resmi, primer (dibaca riset A, tidak dibuka ulang sesi ini).
4. **Perban 5/2017 Pasal 2 ayat (2)–(3):** penyusunan R3P "paling lama 90 (sembilan puluh) hari" dan "dimulai pada saat
   tanggap darurat"; **Pasal 8 ayat (2) huruf b:** sektor infrastruktur mencakup "transportasi darat" dan "sumber daya air, air
   bersih dan sanitasi"; **Pasal 10:** R3P disusun "untuk jangka waktu paling lama 3 (tiga) tahun"; **Pasal 12:** mencabut
   Perka 17/2010. Sumber: `data/raw/hukum/teks/perban-nomor-5-tahun-2017.json` hlm. 4, 7, 9–10 (pustaka `bnpb-2017-r3p`;
   kunci lama `perban2017_5.r3p_hari_maks`, `perban2017_5.r3p_masa_tahun`). Label resmi, primer; status BERLAKU (katalog).
5. **Perban 6/2017 Pasal 7 ayat (4) huruf d–e:** RR berpedoman pada SNI bangunan gedung dan infrastruktur dan pada standar
   pelayanan minimal; **Pasal 10 huruf d:** manajemen RR memperhitungkan keluaran (outcome) "manfaat yang dirasakan oleh
   masyarakat korban bencana dan lingkungan"; **Pasal 12 ayat (1) dan (4):** BNPB dan/atau BPBD lembaga penanggung jawab
   pelaksanaan RR; kelompok kerja koordinatif sementara "paling lama 3 (tiga) tahun"; **Pasal 13 ayat (3) dan (6):** BNPB
   dan/atau BPBD melibatkan K/L teknis; hasil RR "menjadi aset Pemerintah, pemerintah daerah, dan/atau masyarakat"; **Pasal
   14:** monitoring dan evaluasi mengacu R3P dan dikoordinasikan BNPB dan/atau BPBD; tiap pelaksana wajib melapor ke BPBD
   dan/atau BNPB. Sumber: `data/raw/hukum/teks/perban-nomor-6-tahun-2017.json` hlm. 8, 10–13 (pustaka `bnpb-2017-rr`; kunci
   `rehab.hukum.pokja_rr_tahun_maks`). Label resmi, primer; status BERLAKU.
6. **Perban 4/2024 Pasal 2:** hibah RR membiayai kegiatan konstruksi dan nonkonstruksi; rinciannya ditetapkan Kepala BNPB
   setelah berkoordinasi dengan Kementerian Keuangan (ayat (2)); **Pasal 3 huruf a dan c:** penambahan volume "maksimal
   sebesar 10%" dan perubahan konstruksi karena "perubahan struktur tanah, pola aliran sungai"; **Pasal 5:** hibah RR "tidak
   dapat membiayai" antara lain huruf b "biaya perencanaan, pengawasan, operasional, dan pemeliharaan", huruf c "normalisasi
   aliran sungai dan pekerjaan penanganan darurat bencana", huruf d "pembelian lahan", huruf e "aset rusak milik pemerintah
   desa"; **Pasal 6 ayat (1):** penerima harus sudah punya BPBD dengan perda dan sudah menyusun R3P. Sumber:
   `data/raw/hukum/teks/perban-nomor-4-tahun-2024.json` hlm. 3–5 (pustaka `bnpb-2024-hibah-rr`; kunci
   `rehab.hukum.hibah_rr_tambah_volume_maks`). Label resmi, primer; status BERLAKU; menggantikan Perban 3/2019.
7. **Perban 4/2024 Pasal 26 ayat (2):** perubahan RKA tidak diperkenankan untuk mengubah jenis atau lokasi kegiatan. Sumber:
   `A-hukum-kelembagaan.md` §4 [5]; teks hlm. 10–11 korpus (ayat (2) berlanjut ke hlm. 11). Label resmi, primer.
8. **Perka 12/2010 (Pedoman Mekanisme Pemberian Bantuan Perbaikan Darurat):** hasil yang diharapkan adalah berfungsinya
   kembali "secara minimal" prasarana seperti "jalan, jembatan, dermaga, irigasi, utilitas air minum"; jembatan penghubung
   "berupa bantuan rangka baja dan struktur dari Departemen Pekerjaan Umum, dengan penutup kayu dolken". Sumber:
   `data/raw/hukum/teks/perka-nomor-12-tahun-2010.json` hlm. 3 dan 9 (pustaka `bnpb-2010-perka12-perbaikan-darurat`). Label
   resmi, primer; status BERLAKU; ditetapkan 14 September 2010; nomenklatur kementerian lama.
9. **Perban 4/2020 (DSP):** status keadaan darurat bencana terdiri atas siaga darurat, tanggap darurat, dan transisi darurat
   ke pemulihan (Pasal 1); pengguna DSP termasuk TNI/Polri (Pasal 14). Sumber: `data/raw/hukum/teks/perban-nomor-4-tahun-2020.json`
   hlm. 3 dan 12–13, teks OCR (pustaka `bnpb-2020-dsp`). Label resmi, primer (OCR; cek PDF resmi sebelum kutipan final).
10. **Keppres 1/2026:** Satgas di bawah dan bertanggung jawab kepada Presiden (Pasal 1 ayat (2)); Kepala BNPB Wakil Ketua II
    tim pelaksana yang diketuai Menteri Dalam Negeri (Pasal 4 ayat (2) huruf a dan c); Bidang Infrastruktur dikoordinasikan
    Menteri PU dengan tugas perbaikan, peningkatan, dan pembangunan kembali prasarana "transportasi, sumber daya air" dan
    prasarana lingkungan permukiman (Pasal 4 ayat (2) huruf j; Pasal 5 huruf e); Bidang Pengelolaan Data dikoordinasikan
    Kepala BPS untuk "data tunggal rehabilitasi dan rekonstruksi pascabencana" (Pasal 5 huruf c); bencana susulan ditangani
    Kepala BNPB melalui mekanisme tanggap darurat (Pasal 11). Sumber: salinan Keppres 1/2026 (pustaka `ri-2026-keppres1`;
    kunci `rehab.keppres2026_1.bidang_tim_pelaksana`, `rehab.keppres2026_1.laporan_bulan`). Label resmi, primer.
11. **Inpres 18/2025:** Menko Infrastruktur dan Pembangunan Kewilayahan mengoordinasikan masalah infrastruktur; pemda
    berkoordinasi dengan BNPB. Sumber: ringkasan halaman JDIH Kemenko Infrastruktur (pustaka `kemenkoinfra-2026-inpres18`).
    Label resmi, primer (ringkasan halaman; PDF Inpres tidak dibuka).
12. **Tidak ditemukan standar waktu pulih (hari) untuk air perpipaan atau akses jalan dan jembatan di peraturan BNPB yang
    terunduh**; tidak ada templat R3P yang mewajibkan baris waktu pulih layanan air atau daftar jembatan sementara yang harus
    diganti permanen. Sumber: `A-hukum-kelembagaan.md` §1 Celah dan §3 Celah (pencarian korpus `data/raw/hukum/teks`). Label
    resmi (temuan ketiadaan dari korpus).
13. **Tidak ditemukan ketentuan BNPB yang mewajibkan sumber air huntap ditetapkan sebelum lokasi huntap disahkan**; Juklak
    3/2023 hanya mensyaratkan lokasi huntara "harus memiliki akses pada layanan kesehatan, air bersih dan sanitasi" (teks
    OCR hlm. 7). Sumber: `data/raw/hukum/teks/juklak-nomor-3-tahun-2023.json` (pustaka `bnpb-2023-huntara`);
    `A-hukum-kelembagaan.md` §5. Label resmi, primer (OCR).
14. **Keputusan Kepala BNPB yang merinci kegiatan hibah RR (Perban 4/2024 Pasal 2 ayat (2)) dan kegiatan DSP (Perban 4/2020
    Pasal 11) tidak ditemukan di korpus.** Sumber: `A-hukum-kelembagaan.md` §4 Celah. Label resmi (temuan ketiadaan).
15. **Ketidakselarasan dokumen BNPB:** Perban 6/2017 Pasal 9 ayat (1) di bawah "Bagian Kedua Rekonstruksi" berbunyi
    "Penyelenggaraan Rehabilitasi Pascabencana" (hlm. 9, dicek sesi ini); katalog JDIH masih menandai Perka 17/2010 BERLAKU
    padahal Perban 5/2017 Pasal 12 mencabutnya (hlm. 10, dicek sesi ini). Sumber: korpus dan
    `public/data/bnpb/hukum/katalog.json`; `A-hukum-kelembagaan.md` §8. Label resmi, primer. Bahan Lampiran K.

### Inferensi

- **[Inferensi tim]** Celah terbesar bukan ketiadaan norma, melainkan ketiadaan ukuran: Perban 6/2017 Pasal 10 huruf d
  sudah meminta outcome "manfaat yang dirasakan", tetapi tidak ada indikator outcome untuk air dan akses. Grand Design
  mengisi celah ukuran, bukan menulis ulang kewenangan (KD-R1).
- **[Inferensi tim]** Perban 4/2024 Pasal 5 huruf b dan e mengenai inti topik: jembatan desa dan SPAM desa berada di luar
  hibah RR, dan biaya operasi dan pemeliharaan sistem pipa dan sumur yang dibangun saat RR juga di luar hibah RR, sehingga
  keberlanjutan bergantung pada APBD, PDAM, atau pengelola desa (dasar KD-R2, R-RR-07).
- **[Inferensi tim]** Pasal 26 ayat (2) Perban 4/2024 menyulitkan perubahan trase pipa atau lokasi jembatan sesudah survei
  ulang; ini tafsir penyusun atas bunyi pasal, belum diuji dengan kasus.
- **[Inferensi tim]** Pada kejadian besar, koordinasi RR dapat keluar dari rantai Perban 6/2017: Keppres 1/2026 menempatkan
  Kepala BNPB sebagai wakil ketua dan Menteri PU sebagai koordinator bidang infrastruktur. Grand Design ditulis supaya
  berlaku di kedua rantai (R3P biasa dan Satgas), bukan sebagai penilaian kinerja Satgas (Q7).
- **[Inferensi tim]** Perka 12/2010 sudah memuat rangka baja sebagai jembatan darurat sejak 2010, tetapi tanpa standar hari
  dan tanpa titik serah ke jembatan permanen; inilah titik masuk A1 dan R-RR-05.

### Celah

- **PP 21/2008 tidak ada di korpus lokal;** pasal dikutip dari pembacaan riset A atas PDF JDIH BPK. Sebelum naskah final,
  string pasal dicek ulang ke PDF (`https://peraturan.bpk.go.id/Details/4833/pp-no-21-tahun-2008`).
- **Inpres 18/2025 belum dibuka utuh.** Isi instruksi kepada Kepala BNPB tidak dikutip; permintaan teks ke Biro Hukum,
  Organisasi, dan Kerja Sama (KERANGKA §6 keputusan 14 hari butir 4).
- **Juklak 5/2024 (stimulan rumah DSP) tidak ada di korpus;** besaran tidak dikutip (KERANGKA §10 butir 11).
- **Petunjuk pelaksanaan turunan Perban 6/2017 (Pasal 8 ayat (2), 9 ayat (2), 13 ayat (7), 14 ayat (6)) tidak ditemukan di
  korpus.** Naskah menulis "petunjuk pelaksanaan yang diamanatkan belum ditemukan di korpus JDIH yang terunduh", bukan
  "belum ada".
- **Perban 4/2020 hanya tersedia sebagai teks OCR.** Kutipan final dicek ke PDF resmi
  (`https://jdih.bnpb.go.id/storage/file/2020pbbnpb004.pdf`).

---

## P3. Apa arti rehabilitasi, rekonstruksi, membangun kembali lebih baik, dan tiga lapis waktu dalam kajian ini?

### Inti

Rehabilitasi dan rekonstruksi memakai definisi UU 24/2007 Pasal 1 angka 11–12, dan membangun kembali lebih baik memakai
Perban 6/2017 Pasal 1 angka 5 ("menjadi lebih baik dan lebih aman serta berpedoman pada upaya mengurangi risiko bencana").
Tiga lapis waktu adalah pilihan definisi kajian yang dipetakan ke status hukum yang ada: lapis darurat (status tanggap
darurat dan transisi darurat ke pemulihan, Perban 4/2020), lapis sementara (transisi sampai R3P berjalan), dan lapis
permanen (masa R3P paling lama 3 tahun, Perban 5/2017 Pasal 10), masing-masing dengan titik serah tertulis.

### Temuan bersumber

1. **UU 24/2007 Pasal 1 angka 11:** rehabilitasi adalah "perbaikan dan pemulihan semua aspek pelayanan publik atau masyarakat
   sampai tingkat yang memadai pada wilayah pascabencana dengan sasaran utama untuk normalisasi atau berjalannya secara wajar
   semua aspek pemerintahan dan kehidupan masyarakat pada wilayah pascabencana". **Angka 12:** rekonstruksi adalah
   "pembangunan kembali semua prasarana dan sarana, kelembagaan pada wilayah pascabencana" dengan sasaran tumbuhnya
   perekonomian, sosial dan budaya, tegaknya hukum dan ketertiban, dan bangkitnya peran serta masyarakat. Sumber:
   `uu-24-2007.json.gz` hlm. 3 (pustaka `ri-2007-uu24`). Label resmi, primer.
2. **Perban 6/2017 Pasal 1 angka 3** mengulang definisi rehabilitasi dengan sasaran "semua aspek pemerintahan, kehidupan dan
   penghidupan masyarakat" (menambah "penghidupan"); **angka 4** mengulang definisi rekonstruksi. Sumber:
   `perban-nomor-6-tahun-2017.json` hlm. 3 (pustaka `bnpb-2017-rr`). Label resmi, primer.
3. **Perban 6/2017 Pasal 1 angka 5:** "Membangun Kembali Menjadi Lebih Baik dan Lebih Aman (build back better and safer)
   adalah upaya rehabilitasi dan rekonstruksi pascabencana pada saat pembangunan kembali, baik aspek kerusakan maupun
   kerugian akibat bencana, harus dilakukan agar menjadi lebih baik dan lebih aman serta berpedoman pada upaya mengurangi
   risiko bencana di masa yang akan datang". Sumber: idem hlm. 3. Label resmi, primer.
4. **Perban 6/2017 Pasal 1 angka 6:** Jitupasna adalah rangkaian pengkajian dan penilaian akibat, analisis dampak, perkiraan
   kebutuhan, dan rekomendasi awal strategi pemulihan yang menjadi dasar R3P; **angka 7:** R3P dokumen perencanaan yang
   disusun bersama BNPB/BPBD, K/L, perangkat daerah, dan pemangku kepentingan berdasarkan Jitupasna "untuk periode waktu
   tertentu". Sumber: idem hlm. 3–4. Label resmi, primer.
5. **Perban 4/2020 Pasal 1:** Status Keadaan Darurat Bencana terdiri atas "siaga darurat, tanggap darurat, dan transisi
   darurat ke pemulihan"; Status Transisi Darurat ke Pemulihan adalah keadaan ketika ancaman "cenderung menurun eskalasinya
   dan/atau telah berakhir, sedangkan gangguan kehidupan dan penghidupan sekelompok orang/masyarakat masih tetap
   berlangsung". Sumber: `perban-nomor-4-tahun-2020.json` hlm. 3, OCR (pustaka `bnpb-2020-dsp`). Label resmi, primer (OCR).
   Definisi yang sama muncul di Perka 12/2010 (hlm. 5) dan Juklak 3/2023 (hlm. 3, OCR).
6. **Perban 5/2017 Pasal 2 ayat (3) dan Pasal 10:** R3P dimulai saat tanggap darurat dan berjangka paling lama 3 tahun;
   **Perban 6/2017 Pasal 12 ayat (4):** kelompok kerja koordinatif RR paling lama 3 tahun. Sumber: P2 butir 4 dan 5. Label
   resmi, primer.
7. **Perka 12/2010:** bantuan perbaikan darurat mencakup perbaikan prasarana dan sarana darurat "jalan, jembatan, bandara,
   pelabuhan" dan "jaringan air bersih dan sanitasi" (hlm. 6); jembatan penghubung berupa rangka baja (hlm. 9). Sumber: P2
   butir 8. Label resmi, primer. Ini padanan regulasi lapis darurat untuk akses dan air.
8. **Perka 7/2008:** kebutuhan air bersih 7 liter per orang per hari pada tiga hari pertama, sesudahnya 15 liter; jarak
   terjauh ke titik air 500 m. Sumber: korpus `perka-nomor-7-tahun-2008.json` hlm. PDF 12 (tercetak 10) (pustaka
   `bnpb-2008-kebutuhan-dasar`; kunci lama `perka_2008.air_bersih_3hari_liter`, `perka_2008.air_bersih_liter_hari`,
   `perka_2008.jarak_sumber_air_m`). Label resmi, primer (KEPUTUSAN-AWAL R4). Standar lapis darurat untuk air.
9. **Tiga lapis waktu dengan titik serah (bailey ke jembatan permanen; truk tangki dan sumur darurat ke SPAM; huntara ke
   huntap bersumber air) adalah rancangan kajian**, ditetapkan di KERANGKA rehab §0 butir 2 dan prinsip 3, dari pelajaran
   lintas kasus riset E (layanan sementara pulih cepat, aset permanen daerah tertinggal). Sumber: `rehab/KERANGKA.md`;
   `E-pelajaran-program.md` pelajaran 5–6. Label asumsi-kebijakan (pilihan definisi kajian).

### Inferensi

- **[Inferensi tim]** "Membangun kembali lebih baik" di Perban 6/2017 mengikat ke pengurangan risiko, dan Perban 5/2017
  Pasal 8 ayat (3) huruf f meminta R3P memperhatikan kajian risiko bencana; untuk jembatan berarti bentang dan elevasi yang
  tidak mengulang kegagalan banjir (89,2% jembatan rusak 2018–2025 karena banjir), dan untuk air berarti sumber dan trase di
  luar zona bahaya serta sumur dalam batas konservasi (prinsip 6). Kotak 1.1 menuliskannya sebagai definisi operasional
  kajian, bukan sebagai norma baru.
- **[Inferensi tim]** Tiga lapis waktu tidak menciptakan status hukum baru. Lapis darurat dan sementara berada di dalam
  status keadaan darurat dan transisi menurut Perban 4/2020 (sumber DSP), sedangkan lapis permanen berada di masa R3P
  (sumber hibah RR, Dana Bersama, APBN K/L, APBD). Karena "transisi darurat ke pemulihan" menurut definisinya masih dapat
  dibiayai DSP, garis antara lapis sementara dan permanen adalah garis sumber dana, dan titik serah perlu ditulis dalam R3P.
- **[Inferensi tim]** Ukuran operasional per lapis (KERANGKA prinsip 4): lapis darurat diukur dalam liter per orang per hari
  (standar Perka 7/2008) dan hari sampai akses darurat terbuka; lapis sementara dan permanen diukur dalam jiwa atau sambungan
  terlayani dan desa tersambung kembali.

### Celah

- **Tidak ada definisi resmi "lapis sementara" atau "titik serah" di peraturan BNPB.** Disajikan sebagai definisi kajian
  berlabel asumsi-kebijakan, dengan rujukan pasal untuk batas tiap lapis.
- **Perban 5/2017 tidak mengatur kapan R3P dimulai berlaku relatif terhadap akhir status transisi.** Naskah menulis "masa
  R3P" tanpa menyamakannya dengan tanggal berakhirnya status.
- **Juklak penyelenggaraan rehabilitasi dan rekonstruksi yang diamanatkan Perban 6/2017 Pasal 8 ayat (2) dan 9 ayat (2) tidak
  ditemukan di korpus;** definisi teknis "perbaikan prasarana" dan "pembangunan kembali" per sektor tidak dapat dikutip.

---

## Komponen

| Kode | Komponen | Isi | Sumber data | Grafik / pola | Status |
|---|---|---|---|---|---|
| Gambar 1.1 | Jembatan rusak akibat bencana alam per tahun, Indonesia, 2018–2025 (unit) | Batang per tahun 275; 433; 487; 505; 342; 258; 445; 1.088; anotasi 2025 (28,4% dari total; 2,8 kali rerata 2018–2024); garis rerata 2018–2024 (392,1); penanda patahan seri 2024; catatan kaki "kolom bernilai 0 untuk 2008–2017" | `dibi/rekap_nasional_tahunan.csv` `[klasifikasi=alam,cakupan=bencana].jembatan_rusak`, dijumlah per tahun | G1 (batang waktu), B5 keterangan deskriptif U4 | siap; satu warna tambal banjir tidak dipakai karena satu seri |
| Kartu angka 1.1 (grup, opsional di 1.1) | Tiga kartu: 3.833 jembatan 2018–2025; 89,2% karena banjir; Aceh 480 pada 2025 | idem | `dibi/rekap_*_tahunan.csv` | B5.4, satu baris kaki "Sumber: DIBI BNPB, diolah; Resmi" | siap |
| Kotak 1.1 | Definisi operasional dan tiga lapis waktu | Rehabilitasi, rekonstruksi (UU 24/2007 Pasal 1 angka 11–12), membangun kembali lebih baik dan lebih aman (Perban 6/2017 Pasal 1 angka 5), lapis darurat / sementara / permanen dengan dasar status (Perban 4/2020 Pasal 1; Perban 5/2017 Pasal 2, 10), standar lapis darurat (Perka 7/2008; Perka 12/2010) dan titik serah per sektor | korpus `data/raw/hukum/teks`, `uu-24-2007.json.gz` | B5.5 kotak catatan; label "fakta" untuk definisi pasal, "penilaian" untuk lapis | siap |
| Tabel 1.1 | Lingkup jenis bencana × sektor | Baris: gempa bumi, tsunami, likuefaksi, banjir dan banjir bandang, tanah longsor, erupsi, cuaca ekstrem, kekeringan (konteks akuifer); kolom: akses (jembatan, jalan penghubung), air perpipaan (SPAM), air tanah (sumur, mata air), perumahan (beban dan pengikat lokasi); sel berisi jembatan rusak 2018–2025 DIBI per jenis bila ada (banjir 3.419; longsor 246; gempa 52; erupsi 51; cuaca ekstrem 37; gelombang 28) dan "tidak dicatat DIBI" untuk air | `dibi/rekap_nasional_tahunan.csv`; KEPUTUSAN-AWAL Q3, Q5 | B5.7 | siap (likuefaksi dan tsunami tidak terpisah di kolom jembatan DIBI: tsunami 0, likuefaksi masuk gempa) |
| Kotak 1.2 (usulan, di 1.2) | Perbandingan angka Sumatra 2025 | Jembatan: DIBI 744 / PU 1.181 jembatan daerah / BPJN Aceh 14; SPAM: 176 lawan 178; rumah: DIBI 228.006 dengan catatan versi BNPB dan PKP di lampiran | butir P1.6, P1.11–14 | B5.5 "Perbandingan dengan sumber lain" (L22) | siap; versi sekunder hanya dirujuk ke Lampiran D |

## Angka untuk registri

Ditulis juga di `bab-01.angka.json` (bentuk entri sama dengan `data/angka.json`). Kunci lama yang dipakai ulang dan tidak
diulang: `dibi.sumatra2025.meninggal`, `dibi.sumatra2025.hilang`, `dibi.sumatra2025.mengungsi`,
`dibi.sumatra2025.rumah_rusak_berat`, `dibi.sumatra2025.kab_terdampak`, `perban2017_5.r3p_hari_maks`,
`perban2017_5.r3p_masa_tahun`, `perka_2008.air_bersih_3hari_liter`, `perka_2008.air_bersih_liter_hari`,
`perka_2008.jarak_sumber_air_m`.

| Kunci | Nilai | Berkas / jalur atau pustaka | Label | Sumber |
|---|---|---|---|---|
| rehab.dibi.jembatan_rusak.2018_2025 | 3.833 unit | olah `dibi/rekap_nasional_tahunan.csv` [klasifikasi=alam,cakupan=bencana,tahun=2018..2025].jembatan_rusak | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.2025 | 1.088 unit | olah, idem tahun 2025 | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.semua_klasifikasi.2025 | 1.114 unit | `dibi/rekap_nasional_tahunan.csv` [tahun=2025,klasifikasi=semua,cakupan=bencana].jembatan_rusak | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.rerata_2018_2024 | 392,1 unit per tahun | olah (2.745 / 7) | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.rasio_2025_rerata | 2,8 kali | olah (1.088 / 392,1 = 2,77) | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.porsi_2025_persen | 28,4% | olah (1.088 / 3.833) | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.banjir.2018_2025 | 3.419 unit | olah [kategori_dibi=Banjir] | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.longsor.2018_2025 | 246 unit | olah [kategori_dibi=Longsor] | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.porsi_banjir_persen | 89,2% | olah (3.419 / 3.833); mengganti 91 di KERANGKA | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.tahun_awal_terisi | 2018 | olah (2008–2017 bernilai 0) | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.prov.aceh.2018_2025 | 633 unit | olah `dibi/rekap_provinsi_tahunan.csv` | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.prov.aceh.2025 | 480 unit | olah, idem | resmi | DIBI BNPB |
| rehab.dibi.jembatan_rusak.sumatra3prov.2025 | 744 unit | olah (Aceh 480 + Sumbar 182 + Sumut 82) | resmi | DIBI BNPB |
| rehab.dibi.rumah_rb.2025 | 70.391 unit | olah `dibi/rekap_nasional_tahunan.csv` | resmi | DIBI BNPB |
| rehab.dibi.fasum_rusak.2015_2025 | 21.703 unit | olah, idem | resmi | DIBI BNPB |
| rehab.lantai.banjir.sumatra2025.rumah_rusak | 228.006 unit | `dibi/kejadian_besar.csv` [kode=sumatra2025,metrik=rumah_rusak,versi=DIBI].nilai | resmi | DIBI BNPB |
| rehab.lantai.banjir.sumatra2025.rumah_rb | 62.956 unit | `dibi/kejadian_besar.csv` [kode=sumatra2025,metrik=rumah_rusak_berat,versi=DIBI].nilai | resmi | DIBI BNPB (setara `dibi.sumatra2025.rumah_rusak_berat`) |
| rehab.pipa.sumatra2025.spam_terdampak_feb2026 | 176 SPAM | pustaka `pu-2026-spam-sumatera-feb` | resmi | Kementerian PU |
| rehab.pipa.sumatra2025.spam_berfungsi_feb2026 | 143 SPAM | idem | resmi | Kementerian PU |
| rehab.pipa.sumatra2025.sarana_darurat_feb2026 | 537 unit | idem | resmi | Kementerian PU |
| rehab.pipa.sumatra2025.sumur_bor_feb2026 | 128 unit | idem (SDA 25 + Cipta Karya 103) | resmi | Kementerian PU |
| rehab.pipa.sumbar.target_permanen | Agustus 2028 | idem | resmi | Kementerian PU |
| rehab.pipa.sumatra2025.spam_terdampak | 178 SPAM | pustaka `pu-2026-infrastruktur-sumatera-mei` | resmi | Kementerian PU |
| rehab.pipa.sumatra2025.persen_fungsi_mei2026 | 95,5% | idem | resmi | Kementerian PU |
| rehab.akses.sumatra2025.jembatan_daerah_terdampak | 1.181 unit | idem | resmi | Kementerian PU |
| rehab.akses.sumatra2025.jembatan_daerah_persen_fungsi_mei2026 | 67% | idem | resmi | Kementerian PU |
| rehab.akses.sumatra2025.jalan_daerah_ruas_terdampak | 2.421 ruas | idem | resmi | Kementerian PU |
| rehab.akses.sumatra2025.jalan_daerah_persen_fungsi_mei2026 | 94% | idem | resmi | Kementerian PU |
| rehab.akses.sumatra2025.jalan_jembatan_nasional_persen_fungsi_mei2026 | 100% | idem | resmi | Kementerian PU |
| rehab.akses.aceh.jembatan_putus_des2025 | 14 jembatan | pustaka `binamarga-2025-jembatan-aceh` | resmi | Ditjen Bina Marga (BPJN Aceh) |
| rehab.pipa.lombok.spam_rusak | 37 titik | pustaka `kemenpupr-2019-satgas-lombok` | resmi | Kementerian PUPR |
| rehab.pipa.cianjur.titik_kerusakan_pipa | 10 titik | pustaka `kemenpupr-2023-cianjur` | resmi | Kementerian PUPR |
| rehab.jembatan.garuda.titik_2026_08 | 3.008 titik | pustaka `setneg-2026-jembatan-tni-polri` | resmi | Kemensetneg |
| rehab.jembatan.garuda.selesai_2026_08 | 2.500 titik | idem | resmi | Kemensetneg |
| rehab.jembatan.garuda.titik_wilayah_bencana_2026_08 | 798 titik | idem | resmi | Kemensetneg |
| rehab.jembatan.polri_mpp.jumlah_total_2026_08 | 895 unit | idem | resmi | Kemensetneg |
| rehab.jembatan.polri_mpp.selesai_2026_08 | 874 unit | idem | resmi | Kemensetneg |
| rehab.hukum.pokja_rr_tahun_maks | 3 tahun | pustaka `bnpb-2017-rr`, Pasal 12 ayat (4) | resmi | Perban BNPB 6/2017 |
| rehab.hukum.hibah_rr_tambah_volume_maks | 10% | pustaka `bnpb-2024-hibah-rr`, Pasal 3 huruf a | resmi | Perban BNPB 4/2024 |
| rehab.keppres2026_1.bidang_tim_pelaksana | 10 bidang | pustaka `ri-2026-keppres1`, Pasal 4 ayat (2) huruf f–o | resmi | Keppres 1/2026 |
| rehab.keppres2026_1.laporan_bulan | 2 bulan | pustaka `ri-2026-keppres1`, Pasal 10 | resmi | Keppres 1/2026 |

Angka sekunder (hanya lampiran rekonsiliasi, tidak didaftarkan sebagai kunci badan teks): BNPB 498 jembatan rusak Sumatra
(10 Desember 2025, Kontan); BNPB sekitar 147.000 rumah rusak (17 Desember 2025) dan PKP 189.308 (9 Januari 2026) dikutip
DPR; 153 dari 176 SPAM (11 Februari 2026, Investortrust); jembatan daerah Aceh 58,93% dan huntap 2.085 dari 57.027
(5 Oktober 2026, CNN Indonesia); Rp100,1 triliun rencana induk (Antara, 18 Juni 2026).

## Pustaka

CSL-JSON di `bab-01.pustaka.json`, 21 sumber berbeda (16 resmi primer peraturan atau rilis instansi, 1 dataset resmi, 4
dokumen instansi lain): `ri-2007-uu24`, `ri-2008-pp21`, `bnpb-2017-r3p`, `bnpb-2017-rr`, `bnpb-2024-hibah-rr`,
`bnpb-2020-dsp`, `bnpb-2010-perka12-perbaikan-darurat`, `bnpb-2008-kebutuhan-dasar`, `bnpb-2023-huntara`,
`bnpb-2023-standar-data`, `bnpb-dibi`, `ri-2026-keppres1`, `kemenkoinfra-2026-inpres18`, `pu-2026-spam-sumatera-feb`,
`pu-2026-infrastruktur-sumatera-mei`, `binamarga-2025-jembatan-aceh`, `setneg-2026-jembatan-tni-polri`,
`dpr-2026-infosingkat-rumah-sumatra`, `kemenpupr-2019-satgas-lombok`, `kemenpupr-2023-cianjur`, `bnpb-2025-otk-ubah`.

## Catatan untuk penggabung dan pemilik KERANGKA

1. Ganti "sekitar 91%" di tesis KERANGKA §3 dan kunci `rehab.dibi.jembatan_rusak.porsi_banjir_persen` menjadi 89,2 (0.1
   butir 1). Kartu 8.2 (gempa 90) dan 8.6 (longsor 250) perlu dicek ulang terhadap 52 dan 246.
2. Ganti "perbaikan permanen ditargetkan Agustus 2028" (KERANGKA §4 BAB 1, BAB 6, Kartu 8.5, §5) menjadi "penanganan permanen
   SPAM Sumatera Barat ditargetkan bertahap hingga Agustus 2028"; kunci `rehab.pipa.sumatra2025.target_permanen` diganti
   `rehab.pipa.sumbar.target_permanen`.
3. Hapus kata "nasional" pada "14 jembatan nasional putus di Aceh" (KERANGKA §4 BAB 3 dan BAB 5).
4. Tambahkan titik resmi PU 7 Mei 2026 untuk jembatan daerah (67% dari 1.181) dan jalan daerah (94% dari 2.421) ke Bab 4.5
   dan Gambar 4.4; angka sekunder Oktober 2026 tetap lampiran.
5. Tutup celah KERANGKA §10 butir 10 untuk Keppres 1/2026 (dibaca utuh); Inpres 18/2025 tetap terbuka.
6. Kunci `rehab.dibi.*` hasil olah ditulis sebagai `nilai` + catatan hitungan, karena registri belum bisa menjumlah baris;
   skrip `bangun/rehab_angka.py` (KERANGKA §12) sebaiknya menghasilkan dan menguji semuanya, termasuk uji diri jumlah per
   kategori = jumlah nasional (yang akan menangkap selisih riset F).
