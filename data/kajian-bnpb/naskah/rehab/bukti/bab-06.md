# Berkas bukti Bab 6: AIR: SISTEM PERPIPAAN PASCABENCANA

Kajian: Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030 (pembaca Kepala BNPB).
Disusun 25 Oktober 2026 oleh peneliti berkas bukti (subagent), dari `rehab/KERANGKA.md` Bab 6, riset `rehab/riset/A`, `D`, `E`, paket `data/program-terbukti`, `data/dibi`, `data/lembaga`, korpus `data/raw/hukum/teks`, dan sumber yang dibuka ulang sesi ini: dua rilis ePPID Kementerian PU (5 Februari dan 11 Mei 2026), Buku Satgas Penanganan Gempa Lombok dan buku Penanganan Gempa Cianjur 2022 (diunduh dan diekstrak utuh), R3P Cianjur 2022 (diunduh dan diekstrak), paparan JSCE (Nojima 2011), WHO Technical Note 9, Sphere Handbook 2018, ringkasan Value of SCIRT 2018, dan laman audit Auditor-General Selandia Baru 2016.

Konvensi. Path relatif ke `data/kajian-bnpb/` kecuali disebut lain. Label keyakinan: resmi, terverifikasi, estimasi-model, asumsi-kebijakan. Angka media ditandai **sekunder** dan hanya boleh di lampiran rekonsiliasi (KEPUTUSAN-AWAL R3), tidak di badan teks. "Dibuka ulang sesi ini" berarti teks sumber dibaca langsung 25 Oktober 2026; "dari riset D" berarti angka diambil dari riset D tanpa dibuka ulang. Kunci `rehab.*` baru ada di `bab-06.angka.json`; kunci yang sudah dibuat berkas bukti bab lain atau `data/angka.json` disebut dengan namanya dan tidak diulang. Nomor halaman "hlm. PDF" adalah urutan halaman berkas PDF; "hlm. cetak" adalah nomor yang tercetak.

## Pegangan bab (dari KERANGKA §4 Bab 6)

- **Judul:** BAB 6 AIR: SISTEM PERPIPAAN PASCABENCANA (perkiraan 12 hlm).
- **Subbab:** 6.1 Kerusakan Sistem Air Minum pada Kejadian Besar; 6.2 Lapis Darurat: Truk Tangki, Hidran Umum, IPA Mobile, dan Kit Pipa Bergerak; 6.3 Lapis Sementara: Transmisi HDPE dan Sistem Gravitasi; 6.4 Lapis Permanen: Rehabilitasi SPAM dan Membangun Kembali Lebih Baik; 6.5 Waktu Pulih: Pembanding Domestik dan Internasional; 6.6 Biaya Satuan sebagai Pembanding; 6.7 Bukti Program; 6.8 Kesenjangan Spesifik Air Perpipaan.
- **Tujuan bab:** menetapkan pola peralihan air darurat ke perpipaan permanen dan ukurannya.
- **Pertanyaan kunci:** (1) Berapa SPAM dan jiwa terdampak per kejadian, dan berapa lama layanan pulih? (2) Kapan truk tangki diganti perpipaan sementara, dan siapa memutus? (3) Standar apa yang mengikat tiap lapis (Perka BNPB 7/2008, SPM air minum, SNI pipa)? (4) Bagaimana kit pipa bergerak (SIPPA) dipakai di lapis darurat?
- **Temuan kunci yang diharapkan (KERANGKA):** standar 7 lalu 15 liter (Perka 7/2008), SPM 60 liter, Sphere 250 orang per keran; Lombok 37 titik SPAM rusak, 83 sumur bor (1.314 l/dt), 242 hidran 2.000 liter, 28 truk tangki; Cianjur 10 titik SPAM rusak, 172 hidran pada puncak; Sumatra 143 dari 176 SPAM berfungsi 2 Februari 2026, sekitar 95,5% dari 178 pada 7 Mei 2026, 537 sarana darurat, 128 sumur bor, permanen Agustus 2028; Kobe 90% dalam 38 hari dan 100% dalam 81 hari, Tohoku 90% dalam 36 hari; biaya satuan truk dan SPAM berlabel; PAMSIMAS sekitar 24,4 juta orang (sedang), Satgas PU (sedang), tanpa evaluasi independen pemulihan SPAM.
- **Komponen (KERANGKA):** Tabel 6.1 (L55), Gambar 6.1 (G24), Tabel 6.2 (B5.7), Gambar 6.2 (B5.23, G21), Gambar 6.3 (G14), Tabel 6.3 (G12 bila digambar), Kotak 6.1 SIPPA (B5.5, R1), studi kasus 6.1 SCIRT (B5.30).
- **Status data (KERANGKA):** sebagian (PDNA dan R3P dengan angka air terpisah untuk Palu, Lombok, Sumatra tidak diperoleh; biaya resmi pipa HDPE per km tidak ada; pedoman resmi PU untuk SPAM darurat tidak ditemukan).

**Koreksi atas kerangka yang wajib dibawa penulis.** Pemeriksaan ulang sesi ini mengubah empat butir KERANGKA Bab 6.

| Butir KERANGKA | Yang benar menurut sumber primer | Akibat |
|---|---|---|
| "permanen ditargetkan Agustus 2028" untuk SPAM Sumatra | Rilis PU 5 Feb 2026 menyebut target itu hanya untuk Sumatera Barat ("penanganan permanen ditargetkan selesai secara bertahap hingga Agustus 2028"); rilis 11 Mei 2026 tidak menyebut target permanen. Target untuk seluruh Sumatra hanya ada di Investortrust 28 Jan 2026 (sekunder) | Tulis "SPAM Sumatera Barat permanen bertahap hingga Agustus 2028"; kunci `rehab.pipa.sumbar.target_permanen` (bab-01) dipakai, bukan `rehab.pipa.sumatra2025.target_permanen`. Sama dengan koreksi bab-01 |
| "83 sumur bor" Lombok | Buku Satgas PU hlm. cetak 50: BWS Nusa Tenggara I "mengaktifkan 83 sumur bor JIAT", yaitu sumur jaringan irigasi air tanah yang sudah ada, di empat kabupaten termasuk Sumbawa dan Sumbawa Barat; 70 sumur (1.095 l/dt) di Lombok Utara | Tulis "mengaktifkan 83 sumur bor irigasi air tanah (JIAT)", bukan "membangun 83 sumur" |
| "172 hidran" Cianjur tanpa ukuran | Buku Cianjur hlm. cetak 43: hidran umum berkapasitas 200 liter | Jangan disandingkan langsung dengan hidran 2.000 liter Lombok tanpa menyebut kapasitas |
| "28 truk tangki" Lombok sebagai satu-satunya armada | Tabel 5 Buku Lombok: 28 mobil tangki 4.000 liter, 19 di antaranya di gudang regional; Setkab 10 Agu 2018 menyebut sekitar 13 mobil tangki (riset D [11]) | Tulis "28 mobil tangki 4.000 liter dimobilisasi dari Balai Teknik Air Minum Bekasi" |

Satu butir KERANGKA dilemahkan: "Satgas PU Lombok dan Cianjur ... (sedang)" adalah penilaian riset D, bukan baris di `program-terbukti`; program itu tidak boleh disebut "terbukti".

---

## Pertanyaan kunci 1. Berapa SPAM dan jiwa terdampak per kejadian, dan berapa lama layanan pulih?

### Inti

Untuk kejadian besar Indonesia, yang tercatat resmi adalah jumlah titik atau unit SPAM rusak, bukan jiwa atau sambungan yang kehilangan air: Lombok 2018 37 titik, Cianjur 2022 10 titik, Sumatra 2025 176 lalu 178 SPAM; DIBI tidak punya kolom air sama sekali. Waktu pulih hanya ada sebagai titik progres unit: Sumatra 143 dari 176 SPAM (81%) sekitar 72 hari setelah kejadian dan sekitar 95,5% dari 178 sekitar 166 hari, sedangkan kota Jepang mencapai 90% rumah tangga tersambung dalam 36 sampai 38 hari. Satuan keduanya berbeda (unit SPAM lawan rumah tangga), jadi perbandingannya hanya arah, bukan selisih.

### Temuan bersumber

1. DIBI tidak mencatat kerusakan SPAM, pipa, atau sumur, dan tidak mencatat waktu pulih layanan; kolom fasilitas yang paling dekat adalah `fasum_rusak`. Sumber: daftar kolom `dibi/rekap_nasional_tahunan.csv` (header dibaca sesi ini); riset F §4. Label: resmi (ketiadaan kolom). Sama dengan bab-04 butir 11.
2. Lombok 2018: "Terdapat 37 titik sistem penyediaan air minum yang mengalami kerusakan", reguler, Pamsimas, dan swadaya, di Lombok Utara dan Lombok Timur; umumnya pada pipa HDPE; termasuk IPA Anja 40 l/dt. Sumber: Kementerian PUPR, Buku Satgas Penanganan Gempa Lombok, hlm. cetak 11 dan 61 (dibuka ulang sesi ini; pustaka `kemenpupr-2019-satgas-lombok`); kunci `rehab.pipa.lombok.spam_rusak` (bab-01). Label: resmi. Catatan mutu: halaman tim penyusun buku berisi nama pengganti, tanda berkas draf (riset D [10]).
3. Cianjur 2022 (gempa 21 November 2022): "10 titik area kerusakan pipa SPAM" di tujuh desa, antara lain broncap Cirumput (gate valve macet) dan pipa baja 150 dan 200 mm terbawa longsor di Rancapicung. Sumber: Kementerian PUPR, Penanganan Gempa Cianjur 2022, hlm. cetak 59 (dibuka ulang; pustaka `kemenpupr-2023-cianjur`); kunci `rehab.pipa.cianjur.titik_kerusakan_pipa` (bab-01). Label: resmi.
4. Cianjur 2022 dalam R3P (dalam rupiah, bukan unit atau jiwa): subsektor air bersih dan sanitasi kerusakan Rp1.895.861.300 dan kerugian Rp399.050.000, termasuk kerugian "mobilisasi pendistribusian air bersih" Rp324.800.000 (Tabel 3.8); sarana air bersih SPAM perkotaan di subsektor SDA Rp41.599.615.049,20 kerusakan dan kerugian (Tabel 3.9). Sumber: R3P Kabupaten Cianjur 2022, hlm. cetak 57–58 (hlm. PDF 64–66), sumber tabel "Tim Jitupasna Kabupaten Cianjur, 2023" (dibuka ulang; pustaka `cianjur-2022-r3p`); kunci `rehab.rekon.cianjur2022.r3p_air_sanitasi_kerusakan_rp` dan `rehab.rekon.cianjur2022.r3p_spam_perkotaan_rp` (bab-03), `rehab.pipa.cianjur.r3p_mobilisasi_air_kerugian_rp` (baru). Label: resmi. **Catatan mutu:** teks R3P menulis kerugian subsektor SDA Rp690.567.957.188,20, sedangkan Tabel 3.9 menulis Rp90.567.957.188,20 dan totalnya (Rp214.603.985.311,70) hanya cocok dengan angka tabel; yang dipakai angka tabel. R3P berstatus "contoh dokumen" di portal e-proposal RR, tanpa nomor penetapan.
5. Sumatra 2025, per 2 Februari 2026: 176 SPAM terdampak (Aceh 71 di 10 kab/kota, Sumatera Utara 45 di 9, Sumatera Barat 60 di 13); 143 berfungsi (Aceh 54, Sumut 37, Sumbar 52); kapasitas fungsional "lebih dari 5.300" l/dt; progres penanganan infrastruktur SPAM "sekitar 82%". Kapasitas berfungsi Aceh 1.595 dari 2.177 l/dt, Sumbar 2.263 dari 2.663 l/dt; kapasitas awal Sumut tidak disebut. Sumber: Kementerian PU (ePPID) 5 Feb 2026 (dibuka ulang; pustaka `pu-2026-spam-sumatera-feb`); judul menulis 142, isi 143. Kunci `rehab.pipa.sumatra2025.spam_terdampak_feb2026`, `rehab.pipa.sumatra2025.spam_berfungsi_feb2026` (bab-01); per provinsi dan kapasitas baru di bab-06. Label: resmi.
6. Sumatra 2025, per 7 Mei 2026: "Dari 178 sistem penyediaan air minum (SPAM) terdampak, sekitar 95,5% telah kembali fungsional"; rilis yang sama tidak menyebut target permanen dan tidak menyebut jiwa atau sambungan. Sumber: Kementerian PU (ePPID) 11 Mei 2026 (dibuka ulang; pustaka `pu-2026-infrastruktur-sumatera-mei`); kunci `rehab.pipa.sumatra2025.spam_terdampak`, `rehab.pipa.sumatra2025.persen_fungsi_mei2026` (bab-01). Label: resmi. **Dibantah oleh / versi lain:** 153 dari 176 SPAM berfungsi (Investortrust 11 Feb 2026; BCA Sekuritas mengutip IQPlus) (sekunder, riset D [24], riset E [28]); kerusakan 34 unit SPAM dan IPA di Sumut Desember 2025 (media, sekunder). Ditulis berdampingan di lampiran rekonsiliasi saja.
7. Turunan dari butir 5 dan 6: 143 ÷ 176 = 81,25%; 95,5% × 178 ≈ 170 SPAM; tanggal acuan kejadian 22 November 2025 (`dibi/kejadian_besar.csv`, `sumatra2025`, kolom tanggal; jendela DIBI 15 November sampai 31 Desember 2025) memberi sekitar 72 hari ke 2 Februari 2026 dan sekitar 166 hari ke 7 Mei 2026. Kunci baru `rehab.pipa.sumatra2025.persen_fungsi_feb2026`, `rehab.pipa.sumatra2025.hari_ke_feb2026`, `rehab.pipa.sumatra2025.hari_ke_mei2026`, `rehab.pipa.sumatra2025.spam_fungsi_mei2026_turunan`. Label: estimasi-model (tanggal awal rangkaian kejadian dipilih penyusun; 170 adalah pembulatan dari "sekitar 95,5%").
8. Sumatra 2025 tingkat sistem: SPAM IKK Langkahan 20 l/dt berfungsi 9 Januari 2026 (Republika, sekunder, riset D [26]); perbaikan pipa PDAM Bener Meriah 80% per 15 Januari 2026 (BNPB 16 Jan 2026, resmi, riset D [27], tidak dibuka ulang). Label: butir pertama sekunder; butir kedua resmi.
9. Palu, Sigi, Donggala 2018: kerusakan dan kerugian awal lebih dari Rp13,82 triliun per 20 Oktober 2018 tanpa rincian air minum (BNPB, resmi, riset D [15]); SPAM Pasigala "hancur 90%" terutama air baku dan transmisi (Bisnis.com mengutip Dinas SDA Sulteng, sekunder, riset D [16]); satu kelurahan (Tanamodindi): 270 m dari 28.079 m pipa PDAM Donggala patah atau bocor, 0,96% (jurnal SIIMO Engineering 2020, terverifikasi, riset D [18]). Label sesuai butir; angka 90% tidak masuk badan teks (R3).
10. Waktu pulih pembanding, Jepang. Kobe 1995: 90% dalam 38 hari, 95% dalam 43 hari, 100% dalam 81 hari; gangguan awal 1,26 juta rumah tangga (Prefektur Hyogo saja). Tohoku 2011: 90% dalam 36 hari, 95% dalam 41 hari, 100% belum tercapai saat paparan; gangguan awal lebih dari 2 juta. Sumber: Nojima, "Lifeline Restoration Overview", JSCE, 13 Juni 2011, tabel "Initial Outage" dan "Restoration Time" (PDF dibuka ulang dan diekstrak sesi ini; pustaka `jsce-2011-nojima`); kunci `rehab.pipa.pulih.kobe_90`, `rehab.pipa.pulih.kobe_100`, `rehab.pipa.pulih.tohoku_90` (bab-02), `rehab.pipa.pulih.kobe_95`, `rehab.pipa.pulih.tohoku_95`, `rehab.pipa.intl.kobe_rumah_tangga_padam`, `rehab.pipa.intl.tohoku_rumah_tangga_padam` (baru). Label: terverifikasi. **Versi lain:** Tohoku 2,2 juta rumah tangga di 187 kota (Kuwata dan Okamoto 2012) dan 2,57 juta (Biro Air Tokyo), riset D [37][38], terverifikasi; ditulis berdampingan.
11. Kobe: pemulihan penuh air "about three months" (abstrak KAKENHI 11650480, terverifikasi, riset E [37]); konsisten dengan 81 hari di butir 10.
12. Christchurch 2011: reservoir rusak setara sekitar 40% kapasitas simpan jaringan untuk sekitar 320.000 jiwa (Bull. NZSEE 2011, terverifikasi, riset D [40]); 84% rumah tangga tersambung kembali per 9 Maret 2011, sekitar dua minggu setelah 22 Februari (IOL, sekunder, riset D [41]). Label sesuai butir.
13. Tohoku: 184 proyek pemulihan fasilitas air minum reguler selesai dan 40 dari 46 proyek khusus (87%) selesai per September 2024 (Reconstruction Agency Jepang, terverifikasi, riset E [38]). Label: terverifikasi.
14. Kekuatan bukti kurva Jepang dinilai berbeda oleh dua riset: riset D §5 menilai "sedang" (data pemulihan rinci dan konsisten), riset E kompendium menilai pemulihan air Kobe "lemah" (laporan pelaksana dan abstrak). Sumber: `rehab/riset/D-sistem-pipa.md` §5; `rehab/riset/E-pelajaran-program.md` kompendium. Label: penilaian penyusun riset, ditulis berdampingan.
15. Pembanding kerusakan internasional dengan rincian sektor air: Türkiye 2023 sekitar 4.000 km jaringan air hancur, kerusakan air dan limbah USD 790 juta (JICA ex-ante 2024, terverifikasi, riset D [43]); Nepal 2015 1.570 skema rusak berat dan 3.663 rusak sebagian, kebutuhan pemulihan NRS 18,1 miliar (PDNA dikutip WEDC 2018, terverifikasi, riset D [44]). Label: terverifikasi.

### Inferensi (analisis tim, bukan temuan)

- Indonesia mengukur pemulihan air dalam unit SPAM, padahal ukuran yang menentukan orang bisa pulang adalah jiwa atau sambungan terlayani dan liter yang diterima (KERANGKA prinsip 4). Dua rilis PU yang paling rinci pun tidak memuat jiwa atau sambungan. Ini sejalan dengan temuan DFAT bahwa data fungsi PAMSIMAS terlalu optimistis (PK4 butir 3), sehingga "95,5% berfungsi" belum boleh dibaca sebagai "95,5% warga kembali mendapat air".
- Titik Sumatra (81% unit di hari ke-72) lebih lambat dari kurva Jepang (90% rumah tangga di hari ke-36 sampai 38), tetapi Sumatra adalah banjir bandang dan longsor yang merusak intake dan transmisi di 32 kab/kota, sedangkan Kobe dan Tohoku adalah gempa perkotaan dengan utilitas besar. Bab ini tidak boleh menulis "Indonesia dua kali lebih lambat"; yang boleh: "Indonesia belum punya kurva yang dapat dibandingkan".
- Lantai skenario untuk Bab 8 (KERANGKA §2 prinsip 7): kartu banjir memakai lantai layanan air 178 SPAM terdampak (Sumatra 2025) dan kartu gempa 37 titik (Lombok 2018); skenario air tidak boleh lebih ringan dari dua angka tercatat itu untuk wilayah yang sama. Satuan keduanya berbeda (unit SPAM lawan titik kerusakan), jadi tidak dijumlah dan tidak dibandingkan antarkartu.
- R3P Cianjur menempatkan air di dua tempat (subsektor air dan sanitasi di sektor perumahan, SPAM perkotaan di subsektor SDA). Perka 15/2011 sendiri memperingatkan hitung ganda air minum antara sektor perumahan dan sektor air (PK3 butir 9). Untuk Grand Design, angka air R3P harus dibaca dari kedua subsektor dan diperiksa tumpang-tindihnya sebelum dijumlah.

### Celah

- Jumlah jiwa atau sambungan rumah yang kehilangan air perpipaan, untuk kejadian Indonesia mana pun, tidak ditemukan di sumber resmi. Penyajian: tabel 6.1 memakai kolom "unit atau titik SPAM" dan kolom "jiwa terlayani" bertanda "tidak dilaporkan", bukan diisi taksiran.
- PDNA atau R3P dengan angka air untuk Lombok, Palu, dan Sumatra 2025 (R3P Aceh, Sumut, Sumbar; rencana induk 2026–2028) tidak diperoleh. R3P Cianjur terbuka (butir 4).
- Data resmi SPAM Sumatra setelah 7 Mei 2026 tidak ditemukan (penelusuran web sesi ini hanya menemukan media). Gambar 6.1 berhenti di titik Mei 2026.
- Kurva pulih domestik (persen pelanggan PDAM terlayani per hari) tidak ada untuk bencana apa pun; Yogyakarta 2006 dan Padang 2009 tingkat PDAM tidak ditemukan.
- Rincian 178 SPAM per provinsi pada Mei 2026 tidak disebut rilis; hanya 176 per provinsi pada Februari.

---

## Pertanyaan kunci 2. Kapan truk tangki diganti perpipaan sementara, dan siapa memutus?

### Inti

Tidak ada peraturan BNPB atau PU yang menetapkan pemicu peralihan dari truk tangki dan hidran umum ke perpipaan sementara, dan tidak ada pemutus yang ditunjuk; daftar kegiatan air DSP yang dulu memuat "jaringan air bersih" ada di Perban BNPB 2/2018, yang sudah dicabut, sedangkan Perban 4/2020 menyerahkan daftar kegiatan DSP ke keputusan Kepala BNPB yang tidak ditemukan di korpus. Praktik yang terdokumentasi: di Cianjur, distribusi air ditata satu pintu di posko PDAM atas arahan Bupati, hidran turun dari 172 unit (hari ke-27) ke 59 unit sekitar empat bulan kemudian seiring perbaikan pipa; di Lombok, truk mengangkut air dari IPA dan PDAM ke hidran sambil sumber dan pipa diperbaiki. Pembanding luar negeri menunjukkan biaya per m3 truk berlipat dari perpipaan, tetapi konteksnya kamp pengungsian jangka panjang.

### Temuan bersumber

1. Pemulihan segera prasarana dan sarana vital dalam tanggap darurat "dilakukan oleh instansi/lembaga terkait yang dikoordinasikan oleh Kepala BNPB dan/atau kepala BPBD" (PP 21/2008 Pasal 54 ayat (2)); UU 24/2007 Pasal 48 huruf f dan Pasal 53 huruf a memuat pemulihan prasarana vital dan pemenuhan air bersih dan sanitasi. Sumber: riset A §1 [A1][A2] (PP 21/2008 dibuka riset A dari BPK, status Berlaku). Label: resmi.
2. Perka BNPB 12/2010 menyebut hasil yang diharapkan dari bantuan perbaikan darurat adalah berfungsinya kembali secara minimal prasarana "seperti jalan, jembatan, dermaga, irigasi, utilitas air minum", dan perbaikan prasarana mencakup utilitas air bersih dan air minum. Sumber: `data/raw/hukum/teks/perka-nomor-12-tahun-2010.json` hlm. 3 dan 8 (dibaca sesi ini); status BERLAKU menurut `data/raw/hukum/indeks.json`; pustaka `bnpb-2010-perka12-perbaikan-darurat`. Label: resmi.
3. Perban BNPB 2/2018 tentang Penggunaan DSP memerinci kegiatan pelayanan air bersih pada status siaga darurat: "pembelian dan distribusi air bersih, pembelian air minum kemasan, pengadaan hidran umum, sumur bor, sumur pompa tangan, kolam tandon air, jaringan air bersih, perbaikan sumber air baku, dan pengawasan kualitas air bersih" (Pasal 12 ayat (4) huruf a), dengan rumusan serupa di status tanggap darurat dan transisi darurat ke pemulihan (hlm. 19 dan 25). Perban ini **dicabut** oleh Perban BNPB 4/2020 Pasal 27. Sumber: `data/raw/hukum/teks/perban-nomor-2-tahun-2018.json` hlm. 12–13, 19, 25; `perban-nomor-4-tahun-2020.json` hlm. 20; status TIDAK BERLAKU di `data/raw/hukum/indeks.json`. Label: resmi.
4. Perban BNPB 4/2020 Pasal 11: "Kegiatan yang dapat dibiayai dengan DSP akan ditetapkan oleh Kepala BNPB"; status keadaan darurat mencakup siaga darurat, tanggap darurat, dan transisi darurat ke pemulihan (hlm. 3). Keputusan Kepala BNPB yang merinci kegiatan itu tidak ditemukan di korpus. Sumber: `data/raw/hukum/teks/perban-nomor-4-tahun-2020.json` hlm. 3 dan 11; riset A §4. Label: resmi.
5. Perka BNPB 7/2008: "Bantuan air bersih diberikan dalam bentuk sumber air beserta peralatannya", bukan hanya air. Sumber: `data/raw/hukum/teks/perka-nomor-7-tahun-2008.json` hlm. PDF 12 (hlm. cetak 10); pustaka `bnpb-2008-kebutuhan-dasar`. Label: resmi.
6. Lombok 2018: "Pasokan air bersih untuk para pengungsi dilakukan dengan menggunakan mobil tangki yang mengangkut air bersih dari IPA/PDAM tersedia ke hidran-hidran umum"; penyediaan ini "dapat dilakukan setelah dilakukan perbaikan terhadap sumber air serta pipa-pipa layanan"; perbaikan sistem eksisting diharapkan "secara berangsur mengurangi gap pelayanan air bersih sehingga masyarakat dapat kembali ke sumber airnya sendiri". Sarana: 83 sumur bor JIAT diaktifkan (1.314 l/dt; 70 sumur dan 1.095 l/dt di Lombok Utara); 242 hidran 2.000 liter dan 65 hidran 1.000 liter "pada daerah-daerah yang tidak dapat dibangun sumur"; 28 mobil tangki 4.000 liter dari Balai Teknik Air Minum Bekasi; 26 IPA dengan produksi 358 l/dt. Sumber: Buku Satgas Lombok hlm. cetak 50–53 dan 60, Tabel 4–6 (dibuka ulang). Kunci baru `rehab.pipa.lombok.sumur_jiat_diaktifkan`, `..._kapasitas_lps`, `rehab.pipa.lombok.hidran_2000l`, `rehab.pipa.lombok.hidran_1000l`, `rehab.pipa.lombok.mobil_tangki_4000l`, `rehab.pipa.lombok.ipa_unit`, `rehab.pipa.lombok.ipa_kapasitas_lps`. Label: resmi.
7. Cianjur 2022, lapis darurat: tim Ditjen Cipta Karya dan BPPW Jawa Barat mengerahkan 57 unit alat dasar dari Depo Cipta Karya Bekasi (15 hidran umum, 14 toilet portable, 3 tenda besar, 10 tenda kecil, 6 mobil tangki air, 1 mobil toilet); posko di kantor PDAM Tirta Mukti. Distribusi awal "tidak terkoordinasi dan termonitor akibat belum adanya SOP maupun kesatuan komando/koordinasi", lalu ditetapkan satu pintu di Posko PDAM berdasarkan identifikasi lapangan dan permohonan warga; PDAM punya 10 mobil tangki, masing-masing lima kali distribusi per hari, "didukung oleh arahan dari Bupati Cianjur"; PMI mengoperasikan 10 mobil lain. Alat yang tidak lagi dipakai dialihkan atau ditarik ke PDAM. Sumber: buku Penanganan Gempa Cianjur 2022 hlm. cetak 41–42 (dibuka ulang). Kunci baru `rehab.pipa.cianjur.alat_dasar_awal`, `rehab.pipa.cianjur.pdam_mobil_tangki`, `rehab.pipa.cianjur.rit_truk_per_hari`. Label: resmi. **Versi lain:** hari pertama 6 hidran umum dan 4 mobil tangki (Setkab 22 Nov 2022, resmi, riset D [13]); 142 hidran, 18 mobil tangki, 2 IPA mobile per 2 Desember 2022 (Bisnis.com, sekunder, riset D [14]).
8. Cianjur 2022, kurva lapis darurat: hidran umum 200 liter mencapai puncak 172 unit pada 18 Desember 2022 (hari ke-27), lalu berkurang "hingga mencapai 59 unit di tanggal 21 Maret 2022" (tahun tercetak 2022, kemungkinan salah ketik untuk 2023; halaman berikutnya memakai 21 Maret 2023); puncak seluruh sumber daya PUPR 406 unit pada 14 Desember 2022 (hari ke-23), dan sampai 21 Maret 2023 (hari ke-120) 202 unit sudah dikembalikan ke depo. Sumber: buku Cianjur hlm. cetak 43–44 (dibuka ulang). Kunci baru `rehab.pipa.cianjur.hidran_puncak` (200 liter), `rehab.pipa.cianjur.hidran_hari_puncak`, `rehab.pipa.cianjur.hidran_2023_03`, `rehab.pipa.cianjur.sumber_daya_puncak`, `rehab.pipa.cianjur.sumber_daya_kembali_2023_03`. Label: resmi (jumlah); hari dihitung dari 21 November 2022 (resmi, olahan).
9. Pelajaran yang ditulis sendiri oleh buku Cianjur: penyaluran hidran umum oleh PUPR "memerlukan informasi satu pintu", dan pemda serta pihak terkait harus sudah memiliki rencana lokasi posko terpusat dan "siapa melakukan apa" sebelum bencana besar. Sumber: buku Cianjur, bab pelajaran (hlm. cetak sekitar 98–99, dibuka ulang). Label: resmi (penilaian pelaksana sendiri).
10. Sumatra 2025: 537 unit sarana darurat "di seluruh wilayah Sumatera" (IPA mobile, mobil tangki air bersih, hidran umum, toren, unit pengolahan air siap minum, toilet portable, toilet darurat), tanpa rincian per jenis; sumur bor 128 unit: Ditjen SDA 25 sumur air dalam (Aceh 24, Sumbar 1), Ditjen Cipta Karya 17 dangkal di Aceh dan 86 dalam (Aceh 63, Sumut 5, Sumbar 18 tahap survei geolistrik). Sumber: Kementerian PU 5 Feb 2026 (dibuka ulang). Kunci `rehab.pipa.sumatra2025.sarana_darurat_feb2026`, `rehab.pipa.sumatra2025.sumur_bor_feb2026` (bab-01). Label: resmi.
11. Palu 2018: Kementerian ESDM mengoperasikan 17 unit pengolah air di 15 lokasi mulai 17 Oktober 2018 (hari ke-19 sejak gempa 28 September 2018) untuk 22.241 jiwa. Sumber: Kementerian ESDM 17 Des 2018 (resmi, riset D [17], tidak dibuka ulang); hari dihitung riset D. Kunci baru `rehab.pipa.palu.pengolah_esdm_unit`, `rehab.pipa.palu.pengolah_esdm_jiwa`, `rehab.pipa.palu.hari_pengolah_darurat`. Label: resmi; hari estimasi-model.
12. Standar bertahap WHO: 5 liter per orang per hari dan jarak 1 km pada dua minggu sampai satu bulan; 10 liter dan 1 km pada satu sampai tiga bulan; 15 liter atau lebih dan 0,5 km pada tiga sampai enam bulan (Tabel 9.3). Sumber: WHO/WEDC Technical Note 9, 2013 (PDF dibuka ulang dan diekstrak; pustaka `who-2013-tn9`). Kunci baru `rehab.pipa.standar.who_bulan1_3`, `rehab.pipa.standar.who_bulan3_6`, `rehab.pipa.standar.who_minggu2_4`. Label: terverifikasi. Riset D hanya mencatat tahap pertama dan ketiga.
13. Biaya truk lawan pipa, pembanding luar negeri: di Renk, Sudan Selatan, biaya operasi turun "from USD 9 to USD 1 per cubic meter" setelah truk dan diesel diganti perpipaan bertenaga surya (UN South Sudan 6 Okt 2025, terverifikasi, riset D [46]); di Ethiopia biaya air turun 92% setelah peralihan dari truk ke perpipaan, pengelolaan utilitas, dan pompa surya (UNICEF, IRC, KfW, UNHCR, Juni 2024, terverifikasi, riset D [45]). Keduanya kamp pengungsian jangka panjang. Kunci baru `rehab.pipa.biaya.truk_intl_per_m3`, `rehab.pipa.biaya.pipa_surya_intl_per_m3`, `rehab.pipa.biaya.penurunan_truk_ke_pipa`. Label: terverifikasi (tidak dibuka ulang).
14. Sphere 2018: air permukaan, meski butuh pengolahan lebih, "may be the quickest solution"; air tanah dan aliran gravitasi dari mata air "are preferable" karena butuh pengolahan lebih sedikit dan gravitasi tanpa pompa; 15 liter "is never a maximum" dan tidak cocok bila orang mengungsi bertahun-tahun. Sumber: Sphere Handbook 2018, Water supply standard 2.1, hlm. 105–106 (PDF dibuka sesi ini; pustaka `sphere-2018-handbook`). Label: terverifikasi.
15. Sistem gravitasi dari mata air dominan di pegunungan pascagempa: 92,2% dari 1.504 skema yang dipetakan di Nepal bertipe gravitasi, 75,6% bersumber mata air (WEDC 2018, terverifikasi, riset D [44]). Cianjur: SPAM yang direhabilitasi bersumber Mata Air Cirumput dengan tiga pipa transmisi baja (Ø150 dan Ø160 mm) dari broncap Cirumput ke BPT Munjul (R3P Cianjur hlm. PDF 106; buku Cianjur hlm. cetak 59–60). Label: terverifikasi (Nepal), resmi (Cianjur).

### Inferensi (analisis tim, bukan temuan)

- Pemutus de facto di Cianjur adalah posko PDAM di bawah arahan Bupati, dengan PU sebagai pemasok alat; di Lombok, Satgas PU. Secara hukum, koordinasi ada pada Kepala BNPB atau kepala BPBD (PP 21/2008 Pasal 54 ayat (2)), tetapi tidak ada teks yang menamai siapa memutus "hidran ditarik, pipa sementara dipasang". Usulan kajian (R-RR-08, W1): pemicu tertulis di rencana operasi darurat, misalnya "jarak tempuh truk lebih dari X km atau rit per truk tidak cukup memenuhi 15 liter" dan "pengungsian diperkirakan lebih dari N minggu". Ambang X dan N belum punya dasar data dan harus berlabel asumsi-kebijakan.
- Hilangnya daftar kegiatan air rinci Perban 2/2018 tanpa keputusan pengganti yang terbuka membuat BPBD tidak punya rujukan tertulis bahwa pipa sementara (bukan hanya truk dan hidran) dapat dibiayai DSP. Ini kesenjangan penyelarasan dokumen (R-RR-15), bukan bukti bahwa pipa sementara dilarang.
- Rasio sumber daya Cianjur (202 dari 406 unit kembali pada hari ke-120) menunjukkan lapis darurat bertahan sekitar empat bulan di kejadian gempa kabupaten; lama ini sejajar dengan tahap WHO "tiga sampai enam bulan", saat standar naik ke 15 liter dalam 0,5 km. Itu titik wajar meninjau peralihan ke perpipaan sementara, tetapi satu kejadian tidak cukup untuk dijadikan aturan.
- Angka biaya truk lawan pipa luar negeri (USD 9 ke 1 per m3) berasal dari kamp yang beroperasi bertahun-tahun. Untuk pengungsian Indonesia yang umumnya berminggu-minggu sampai bulanan, penghematan per m3 tidak boleh dikutip tanpa catatan konteks; Gambar 6.3 wajib berpil konteks.

### Celah

- Pedoman resmi Kementerian PU untuk SPAM darurat atau juknis tanggap darurat air minum tidak ditemukan (riset D §1); praktik hanya di buku Satgas.
- Keputusan Kepala BNPB tentang kegiatan DSP (Perban 4/2020 Pasal 11) tidak ada di korpus; permintaan ke Biro Hukum, Organisasi, dan Kerja Sama.
- Data Indonesia tentang pipa transmisi HDPE sementara (panjang, diameter, waktu gelar) sebagai pengganti truk tidak ditemukan untuk kejadian mana pun. Subbab 6.3 ditulis sebagai kesenjangan dan pola dari pembanding, bukan praktik domestik.
- Biaya resmi air darurat per m3 atau per jiwa di Indonesia tidak ditemukan; satu-satunya tarif adalah tarif mobil tangki PDAM satu kabupaten (PK4 butir 7), bukan biaya darurat penuh.
- Kapasitas dan stok IPA mobile dan hidran umum di Depo Cipta Karya Bekasi tidak ditemukan; Perka BNPB 17/2009 menetapkan jenis alat (mobile water treatment, mobil tangki air, water pillow, instalasi penjernih air) tetapi bukan stok nyata (PK3 butir 10).

---

## Pertanyaan kunci 3. Standar apa yang mengikat tiap lapis (Perka BNPB 7/2008, SPM air minum, SNI pipa)?

### Inti

Lapis darurat diikat Perka BNPB 7/2008 yang masih berlaku: 7 liter per orang per hari pada tiga hari pertama, lalu 15 liter, titik air paling jauh 500 meter, air minum 2,5 liter; Sphere 2018 menambah ukuran yang tidak ada di Perka, yaitu 250 orang per keran dan antre paling lama 30 menit. Lapis permanen diikat SPM air minum (60 liter per orang per hari, diukur sebagai persen penduduk berakses) dan PP 122/2015, yang menjelaskan bahwa SPAM "bersifat khusus" yang diselenggarakan pusat dapat meliputi penanganan bencana alam. Lapis sementara tidak punya standar sendiri: tidak ada angka liter, jarak, atau waktu untuk masa peralihan di peraturan Indonesia mana pun yang ditemukan, dan teks SNI pipa belum dibaca.

### Temuan bersumber

1. Perka BNPB 7/2008: air bersih "7 liter pada tiga hari pertama, selanjutnya 15 liter per orang per hari"; jarak terjauh tempat penampungan sementara ke jamban keluarga 50 meter; "Jarak terjauh sumber air dari tempat penampungan sementara dengan titik air terdekat adalah 500 meter"; air minum 2,5 liter per orang per hari. Status BERLAKU (indeks JDIH lokal). Sumber: `data/raw/hukum/teks/perka-nomor-7-tahun-2008.json` hlm. PDF 12 (hlm. cetak 10), mutu OCR 0,99, dibaca sesi ini; kunci yang sudah ada `perka_2008.air_bersih_awal_liter_hari`, `perka_2008.air_bersih_liter_hari`, `perka_2008.jarak_sumber_air_m`, `perka_2008.air_minum_liter_hari` (data/angka.json). Label: resmi (KEPUTUSAN-AWAL R4 membetulkan label asumsi-kebijakan riset C).
2. Sphere 2018, standar pasokan air 2.1: rata-rata air minum dan kebersihan "Minimum of 15 litres per person per day"; "250 people per tap (based on a flow rate of 7.5 litres/minute)"; 500 orang per pompa tangan; jarak ke titik air kurang dari 500 meter; antre kurang dari 30 menit; di konteks perkotaan berpendapatan menengah "50 litres per person per day may be the minimum acceptable amount". Sumber: Sphere Handbook 2018 hlm. 105–106 (dibuka sesi ini). Kunci baru `rehab.pipa.standar.sphere_liter`, `rehab.pipa.standar.sphere_orang_per_keran`, `rehab.pipa.standar.sphere_antre_menit`, `rehab.pipa.standar.sphere_urban_liter`. Label: terverifikasi.
3. Standar bertahap WHO TN9 (5, 10, 15 liter menurut bulan; PK2 butir 12). Label: terverifikasi.
4. SPM air minum: turunan daerah Pergub NTB 32/2022 Lampiran III memuat "Kebutuhan pokok minimal air minum sejumlah 60 liter/orang/hari", dengan nilai SPM berupa persen penduduk berakses; standar teknis nasional Permen PUPR 13/2023 (mencabut Permen PUPR 29/PRT/M/2018), pelaksana PP 2/2018. Sumber: riset D [3][4] (tidak dibuka ulang). Kunci baru `rehab.pipa.standar.spm_kuantitas`. Label: resmi.
5. PP 122/2015 Pasal 38 huruf d: pemerintah pusat melaksanakan penyelenggaraan SPAM "yang bersifat khusus, kepentingan strategis nasional, dan lintas provinsi"; penjelasannya: "bersifat khusus" dapat meliputi "penanganan bencana alam, kekeringan" dan lain-lain; Pasal 39 huruf c memberi wewenang yang sama kepada provinsi untuk SPAM bersifat khusus tingkat provinsi. Pasal 54 ayat (5) huruf a: dana APBN untuk SPAM "juga dapat digunakan untuk" keadaan darurat. Sumber: `data/kajian-bnpb/data/lembaga/mentah/teks/pp-122-2015.json.gz` hlm. 17, 18, 26, 43 (dibaca sesi ini); `data/lembaga/peran.csv` R077; pustaka `ri-2015-pp122`. Label: resmi.
6. Permen PUPR 27/PRT/M/2016 Pasal 15 ayat (2): SPAM bukan jaringan perpipaan mencakup sumur dangkal, sumur pompa, penampungan air hujan, terminal air, dan bangunan penangkap mata air; hidran umum memakai pipa pelayanan ¾ sampai 1 inci. Sumber: riset D [2] (dibaca utuh riset D, tidak dibuka ulang). Label: resmi.
7. Perban BNPB 6/2017 Pasal 7 ayat (4) huruf d dan e: rehabilitasi dan rekonstruksi berpedoman pada SNI bangunan dan infrastruktur dan pada SPM; Pasal 1 angka 5 mendefinisikan membangun kembali lebih baik dan lebih aman. Sumber: riset A §3 [A4]. Label: resmi.
8. Perka BNPB 15/2011 (Jitupasna) memuat kriteria kerusakan air bersih dan sanitasi: rusak berat bila kerusakan fisik lebih dari 70% dan "Tidak dapat berfungsi sama sekali", ditangani rekonstruksi; rusak sedang 30–70%, "Relatif masih berfungsi", ditangani rehabilitasi; rusak ringan kurang dari 30%, masih bisa difungsikan. Format 4 (pengumpulan data sarana dan prasarana air minum) memuat komponen struktur pengambilan air, instalasi pemurnian, sistem perpipaan, sistem penyimpanan, sumur, serta baris "Perkiraan Jangka Waktu Rehabilitasi (Dalam Bulan)", "Perkiraan Jangka Waktu Rekonstruksi (Dalam Bulan)", dan kehilangan pendapatan PDAM per bulan. Status BERLAKU. Sumber: `data/raw/hukum/teks/perka-nomor-15-tahun-2011.json` hlm. 72–73 dan 93 (dibaca sesi ini); pustaka `bnpb-2011-pdna`. Label: resmi.
9. Perka BNPB 15/2011 mencontohkan hitung ganda: "Kerusakan fasilitas air minum dan sanitasi dihitung sebagai bagian dari kerusakan sektor perumahan dan dihitung lagi sebagai kerusakan sektor air dan sanitasi". Sumber: korpus yang sama hlm. 41. Label: resmi.
10. Perka BNPB 17/2009 (standarisasi peralatan PB, status BERLAKU) mencantumkan sebagai standar minimal jenis peralatan: mobile water treatment, mobil tangki air, water pillow, dan instalasi penjernih air, dengan instansi "BNPB/BPBD/Instasi/Lembaga"; lampiran per wilayah mencantumkan jumlah unit (misalnya mobil tangki air 2 sampai 5 unit). Sumber: `data/raw/hukum/teks/perka-nomor-17-tahun-2009.json` hlm. 7 dan 12–51 (dibaca sesi ini; BN 2014 No. 1089). Label: resmi. Jumlah per wilayah adalah standar, bukan inventaris.
11. Mutu air darurat: di Lombok, pemantauan kualitas pasokan dilakukan Dinas Kesehatan Provinsi NTB didukung Balai Besar Kesehatan Lingkungan Surabaya, berkala pada sumber air baku dan titik distribusi, termasuk E. coli; 80 mahasiswa KKN tematik memantau hidran dan toilet. Sumber: Buku Satgas Lombok hlm. cetak 59 (dibuka ulang). Label: resmi. Baku mutu (Permenkes 2/2023 E. coli 0 CFU/100 ml) dibahas di Bab 7 (riset C [25]).
12. SNI pipa: polietilen air minum seri SNI 4829-1/2/3:2015 dipadankan dengan ISO 4427:2019; PVC air minum SNI 06-0084-2002. Sumber: skema sertifikasi TÜV NORD Indonesia (riset D [8][9], terverifikasi, belum dibaca utuh). Label: terverifikasi. Teks SNI tidak dibaca; kelas tekanan dan SDR tidak tercatat.

### Inferensi (analisis tim, bukan temuan)

- Perka 7/2008 sejalan dengan angka Sphere untuk liter (15) dan jarak (500 m), tetapi tidak mengatur jumlah orang per keran dan waktu antre, padahal itulah ukuran yang membedakan "air tersedia" dari "air terjangkau" di pengungsian padat. Untuk Tabel 6.2, kolom darurat memakai Perka 7/2008 sebagai standar mengikat dan Sphere sebagai pelengkap berlabel terverifikasi; Sphere tidak ditulis sebagai kewajiban hukum.
- Lompatan dari 15 liter (darurat) ke 60 liter (SPM) tanpa anak tangga di antaranya adalah sebab lapis sementara tidak punya ukuran keberhasilan. Tangga WHO (5, 10, 15 liter) dan catatan Sphere 50 liter untuk perkotaan dapat menjadi rancangan anak tangga lapis sementara, berlabel asumsi-kebijakan sampai baseline 2027 (KEPUTUSAN-AWAL Q11).
- Formulir Jitupasna sudah meminta "perkiraan jangka waktu rehabilitasi dalam bulan" untuk air minum. Artinya baris waktu pulih yang diusulkan R-RR-02 dan R-RR-03 bukan konsep baru; yang hilang adalah kewajiban melaporkannya kembali setelah R3P berjalan. Ini memperkuat status "Sudah ada, perlu dikembangkan" untuk R-RR-03.
- PP 122/2015 memberi dasar bagi Kementerian PU (dan provinsi) untuk menyelenggarakan SPAM pascabencana sebagai "bersifat khusus" dan untuk memakai APBN SPAM dalam keadaan darurat. Itu mendukung pembagian kerja Grand Design: BNPB mengoordinasikan dan mengukur; Cipta Karya membangun.

### Celah

- Standar resmi untuk lapis sementara (liter, jarak, waktu, mutu) tidak ditemukan; disajikan sebagai sel kosong bertanda "tidak diatur" di Tabel 6.2, bukan diisi angka WHO.
- Teks SNI 4829:2015 dan SNI 06-0084-2002 tidak dibaca; spesifikasi selang atau pipa bermutu pangan untuk pemasangan sementara tidak ditemukan.
- Permen PUPR 13/2023 dan Pergub NTB 32/2022 tidak dibuka ulang sesi ini; angka 60 liter berasal dari riset D.
- Apakah Perka 7/2008 sudah diganti peraturan BNPB yang lebih baru: indeks JDIH lokal menyatakan BERLAKU; pencarian peraturan pengganti di luar korpus tidak dilakukan sesi ini.

---

## Pertanyaan kunci 4. Bagaimana kit pipa bergerak (SIPPA) dipakai di lapis darurat?

### Inti

SIPPA adalah kajian terpisah BNPB tentang kit pompa dan selang yang disimpan di gudang dan dipindah ke lokasi rawan, pilotnya baru berjalan Oktober 2026, sehingga belum ada klaim kinerja; Grand Design hanya merujuknya dalam satu kotak tanpa angka biaya dan tanpa menggabungkan rekomendasi (R1). Celah yang dapat diisi kit sejenis tercatat jelas: tidak ada pipa transmisi sementara antara sumber air yang selamat dan hidran di pengungsian, sedangkan truk di Cianjur dibatasi lima rit per hari.

### Temuan bersumber

1. Keputusan kajian rehab: SIPPA "kajian terpisah; dirujuk satu kotak sebagai sumber kit pipa bergerak tahap darurat, tanpa angka biaya SIPPA dan tanpa menggabungkan rekomendasi". Sumber: `rehab/KEPUTUSAN-AWAL.md` R1; KERANGKA §1 prinsip 11. Label: asumsi-kebijakan (keputusan pemilik).
2. SIPPA: pilot Oktober 2026, bila berhasil kit dipakai untuk banjir November–Desember 2026 (butir 4); pemakaian ganda banjir masuk hitungan biaya-manfaat (butir 7); tidak boleh ada klaim "terbukti" tanpa uji dan tidak boleh ada jaringan permanen nasional (butir 50). Sumber: `data/kajian-bnpb/pipa/KEPUTUSAN-SIPPA.md` baris 9, 12, 67. Label: asumsi-kebijakan (keputusan kajian SIPPA).
3. Riset D §7: kit SIPPA adalah pompa, selang layflat, manifold, dan lance, dirancang untuk karhutla lalu banjir dengan modul pompa banjir terpisah; bukan jaringan permanen; dua syarat bila dipakai untuk air minum: selang dan sambungan bermutu pangan dan didisinfeksi, dan peran dibatasi lapis darurat sampai SPAM eksisting pulih. Sumber: `rehab/riset/D-sistem-pipa.md` §7. Label: asumsi-kebijakan (belum diuji).
4. Celah yang diisi: tidak ditemukan data Indonesia tentang pipa transmisi sementara (riset D §2 Celah); truk PDAM Cianjur lima rit per hari per unit (PK2 butir 7); Lombok mengangkut air dari IPA dan PDAM ke hidran dengan truk (PK2 butir 6). Label: resmi (fakta praktik); kaitannya dengan kit adalah inferensi.
5. Perka BNPB 17/2009 sudah memuat jenis alat air darurat (mobile water treatment, water pillow, instalasi penjernih air, mobil tangki) tetapi tidak memuat selang atau pipa transmisi sementara. Sumber: `perka-nomor-17-tahun-2009.json` hlm. 7. Label: resmi.
6. Status program dalam rubrik: W3 "Kit pipa bergerak dan IPA mobile di gudang regional (rujukan SIPPA)", lapis darurat, Usulan baru bergantung hasil pilot, bukti "Uji coba terukur". Sumber: KERANGKA Bab 10 tabel kerangka program. Label: asumsi-kebijakan.

### Inferensi (analisis tim, bukan temuan)

- Kit pipa bergerak relevan untuk jarak pendek antara sumber yang selamat (sumur JIAT seperti di Lombok, IPA mobile, sungai, atau jaringan PDAM yang masih bertekanan) dan klaster hidran. Itu mengurangi kebutuhan rit truk, bukan menggantikan rehabilitasi SPAM. Tanpa uji mutu bakteriologis di ujung selang, kit justru menambah risiko; maka syarat pemantauan mutu seperti di Lombok (PK3 butir 11) harus menyertai.
- Karena SIPPA dirancang untuk pemadaman, kecocokannya untuk air minum belum ditunjukkan. Kotak 6.1 hanya boleh menulis "dapat diuji", tidak "dapat dipakai".

### Celah

- Kinerja kit SIPPA untuk air minum (debit, jarak, waktu gelar, mutu) belum ada; pilot belum melapor. Kotak 6.1 ditulis tanpa angka.
- Spesifikasi selang bermutu pangan dan prosedur disinfeksi untuk kit darurat tidak ditemukan di SNI atau peraturan yang dibaca.

---

## Pertanyaan pendukung subbab 6.4, 6.6, 6.7 (permanen, biaya, bukti)

Bagian ini menampung bukti untuk subbab yang tidak tercakup penuh empat pertanyaan kunci, dengan empat bagian yang sama.

### Inti

Rehabilitasi SPAM permanen pascabencana di Indonesia terdokumentasi rinci hanya untuk Cianjur: lima SPAM direhabilitasi Kementerian PUPR dengan progres manajemen konstruksi 98,31% per 25 September 2023, sekitar sepuluh bulan setelah gempa, tetapi dua SPAM untuk hunian tetap tertinggal (78,21% dan 80,88%). Biaya satuan yang tersedia adalah turunan dari proyek SPAM permanen besar (sekitar Rp0,37 sampai 1,57 miliar per l/dt) dan tidak cocok untuk SPAM perdesaan kecil. Tidak ada program air pascabencana di Indonesia yang punya evaluasi dampak independen; PAMSIMAS berbukti "sedang" tetapi bukan program darurat, dan pembanding terbaik untuk tata kelola pipa tersebar adalah SCIRT Christchurch (sedang).

### Temuan bersumber

1. Cianjur, rehabilitasi SPAM (status 25 September 2023): SPAM Cianjur bersumber Mata Air Cirumput realisasi 98,55%; SPAM Batalion Infanteri Raider 300 96,6%; penyediaan SPAM Hunian Tetap 1 Desa Sirnagalih 78,21% (rencana 98,02%); SPAM Hunian Tetap 2 Desa Murnisari 80,88% (rencana 97,11%); SPAM Pondok Pesantren Darul Falah Jambudipa 92,74%; progres manajemen konstruksi 98,31%; pelaksana Brantas Abipraya, MK Virama Karya. Sumber: buku Cianjur hlm. cetak 59–60 (dibuka ulang). Kunci baru `rehab.pipa.cianjur.spam_rehab_titik`, `rehab.pipa.cianjur.spam_rehab_progres_mk_2023_09`, `rehab.pipa.cianjur.spam_cirumput_realisasi_2023_09`, `rehab.pipa.cianjur.spam_huntap_sirnagalih_realisasi_2023_09`, `rehab.pipa.cianjur.spam_huntap_murnisari_realisasi_2023_09`. Label: resmi.
2. R3P Cianjur, kebutuhan SPAM perkotaan Rp62.671.663.000, termasuk "Penanganan SPAM Pasca Gempa Bumi" lima lokasi yang sama dengan butir 1 sebesar Rp32.200.466.000, manajemen konstruksi Rp2.589.122.000, rekonstruksi sambungan rumah Rp3.800.000.000, dan tiga rekonstruksi pipa transmisi baja dari Cirumput ke BPT Munjul (Rp3.614.600.000; Rp4.232.800.000; Rp4.232.800.000), semua bersumber "Kabupaten". Panjang pipa dan jumlah sambungan tidak disebut. Sumber: R3P Cianjur hlm. PDF 106–107, sumber "Jitupasna Kabupaten Cianjur Tahun 2023" (dibuka ulang). Kunci baru `rehab.pipa.cianjur.r3p_kebutuhan_spam_perkotaan_rp`, `rehab.pipa.cianjur.r3p_penanganan_spam_5lokasi_rp`. Label: resmi. Catatan: pelaksana fisik menurut buku PUPR adalah Kementerian PUPR, sedangkan kolom pendanaan R3P menulis kabupaten; penulis wajib menulis keduanya apa adanya.
3. Biaya per kapasitas SPAM permanen (hitungan riset D dari rilis resmi, bukan anggaran): Banjarbakula tahap II Rp787 miliar ÷ 500 l/dt = Rp1,57 miliar per l/dt dan Rp13,0 juta per rumah tangga (2023; Setkab 17 Mar 2023 [D29]); Jatiluhur I hulu Rp1,75 triliun ÷ 4.750 l/dt = Rp0,37 miliar per l/dt dan Rp4,6 juta per SR (2025; PU 26 Sep 2025 [D30]); Semarang Barat Rp746 miliar ÷ 1.000 l/dt = Rp0,75 miliar per l/dt, Rp10,7 juta per SR, pipa distribusi utama Rp4,3 miliar per km tanpa diameter (2017–2023; PUPR 1 Agu 2023 [D31]). Kunci baru `rehab.pipa.biaya.per_lps_banjarbakula`, `rehab.pipa.biaya.per_lps_jatiluhur1`, `rehab.pipa.biaya.per_lps_semarang_barat`, `rehab.pipa.biaya.per_sr_banjarbakula`, `rehab.pipa.biaya.per_sr_semarang_barat`, `rehab.pipa.biaya.pipa_distribusi_utama_per_km`. Label: estimasi-model (tidak dibuka ulang sesi ini).
4. Tarif mobil tangki PDAM Hulu Sungai Utara: Rp95.000 per 5.000 liter dalam 10 km pertama, belum pajak, tambahan Rp20.000 per 10 km (Perbup HSU 3/2022 Pasal 12, resmi, riset D [32]); hitungan riset D Rp19.000 per m3. Kunci baru `rehab.pipa.biaya.truk_pdam_per_m3`. Label: resmi (tarif), estimasi-model (per m3). Tarif layanan biasa satu kabupaten, bukan biaya darurat.
5. Hibah Air Minum 2019 Rp2 juta per SR untuk 1.000 SR pertama, Rp3 juta sesudahnya (Kontan 4 Nov 2018 mengutip siaran pers PUPR; sekunder, riset D [28]). Tidak masuk badan teks sampai siaran pers PUPR dibuka (R3).
6. PAMSIMAS (P13 `program-terbukti`): posisi "Program dengan syarat (bukti sedang)", kekuatan `sedang`, jenis bukti `evaluasi-independen`; laporan penyelesaian Bank Dunia 2023 (ringkasan RWSN): layanan air berkelanjutan untuk sekitar 24,8 juta jiwa di lebih dari 35.553 desa dan sekitar 91% sistem berfungsi baik; evaluasi independen DFAT (Januari 2023) menilai data MIS terlalu optimistis, banyak sistem yang tercatat berfungsi kekurangan air saat puncak atau kemarau. Bukan program darurat. Sumber: `data/program-terbukti/kompendium_program.csv` baris P13; pustaka `rwsn-2023-pamsimas`, `dfat-2023-pamsimas`. Kunci baru `rehab.pipa.pamsimas.jiwa_layanan_icr2023`, `rehab.pipa.pamsimas.persen_berfungsi_icr2023`. Label: terverifikasi. **Versi lain:** sekitar 24,4 juta orang akses air di 35.443 desa per Desember 2021 (World Bank Results Brief 20 Jan 2023, riset D [33]); ditulis berdampingan dengan tanggal datanya.
7. Satgas PUPR Lombok dan Cianjur: dokumentasi resmi rinci jumlah sumur, hidran, truk, IPA, dan titik SPAM, tetapi tanpa ukuran liter per orang per hari yang diterima; dinilai "sedang" oleh riset D §5. Tidak ada baris di `program-terbukti`. Label: penilaian riset D; program tidak boleh disebut terbukti.
8. Hibah Air Minum (lemah untuk konteks bencana), BRR dan donor Aceh untuk IPA Lambaro 430 l/dt (lemah, satu sumber media), Oxfam Sulawesi 2018 sekitar 28 juta liter dalam enam bulan (lemah, laporan mandiri). Sumber: riset D §5 tabel. Label: penilaian riset D.
9. Riset E: tidak ditemukan evaluasi independen pemulihan SPAM pascabencana di Indonesia; ukuran "unit berfungsi" berisiko optimistis, ukuran layanan lebih jujur (pelajaran lintas kasus 7). Sumber: `rehab/riset/E-pelajaran-program.md`. Label: inferensi riset E berdasar [E43].
10. SCIRT Christchurch: aliansi sementara pemilik aset dan kontraktor "Created in five months in 2011"; program NZ$2,2 miliar selama lima setengah tahun, lebih dari 600 proyek pipa limbah, drainase, air bersih, pompa, jalan, jembatan, dan dinding penahan, didanai Pemerintah Selandia Baru dan Dewan Kota Christchurch (Value of SCIRT Summary, Juni 2018, dokumen aliansi sendiri; dibuka ulang dan diekstrak; pustaka `scirt-2018-value`). Audit lanjutan Auditor-General 2016: "good progress", kepastian pendanaan memakan waktu hingga 19 bulan, sekitar 30 proyek air limbah dan drainase menghadapi ketidakpastian dana lebih dari delapan bulan, serah terima informasi aset ke dewan kota semula lambat lalu membaik (laman ao.parliament.nz dibuka ulang; pustaka `oag-nz-2016-scirt`). Kunci baru `rehab.pipa.intl.scirt_program_nzd_miliar`, `rehab.pipa.intl.scirt_proyek`, `rehab.pipa.intl.scirt_kepastian_dana_bulan`. Label: terverifikasi. Kekuatan bukti: sedang (audit negara independen untuk tata kelola; klaim nilai uang dari aliansi sendiri), riset E kompendium.
11. Jepang: program sambungan pipa tahan gempa Biro Air Tokyo 37%, dijadwalkan 61% pada FY2025 (terverifikasi, riset D [37]); kaitan sebab dengan waktu pulih belum diuji (riset D §5).

### Inferensi (analisis tim, bukan temuan)

- Cianjur memperlihatkan pola lintas kasus riset E pelajaran 5 dan 6 pada skala kecil: SPAM eksisting (Cirumput) hampir selesai, SPAM baru untuk huntap tertinggal sekitar 18 poin dari rencana. Ini bukti domestik pertama yang dapat dikutip untuk H1 dan R-RR-12 (sumber air sebagai syarat lokasi huntap): air untuk relokasi adalah pekerjaan baru, bukan perbaikan, dan berjalan paling lambat.
- Biaya per l/dt dari proyek regional ratusan sampai ribuan l/dt tidak dapat dipakai untuk menaksir SPAM perdesaan pascabencana berkapasitas puluhan l/dt (misalnya IKK Langkahan 20 l/dt). Tabel 6.3 menampilkan rentang dengan kolom "skala proyek" dan tidak dijumlah (KERANGKA prinsip 8).
- SCIRT relevan bukan karena hasil pipanya terukur (km pipa tidak dilaporkan), tetapi karena dua pelajaran tata kelola yang cocok dengan Sumatra: kepastian dana multi-tahun dikunci sejak awal (hibah RR tidak dapat membiayai operasi dan pemeliharaan, Perban 4/2024 Pasal 5) dan serah terima data aset ke pemilik dirancang sejak awal.

### Celah

- Biaya resmi pipa HDPE per km per diameter tidak ditemukan; sumber yang perlu: HSPK daerah atau e-Katalog LKPP.
- Biaya pengadaan dan operasi IPA mobile, hidran umum, dan sumur darurat Kementerian PU tidak ditemukan.
- Evaluasi build back better utilitas air Indonesia (PDAM Palu, Pasigala setelah 2024, Cianjur setelah 2023) tidak ditemukan; ADB EARR menyebut target layanan 80% Pasigala pada 2028, tetapi dokumen ADB menolak diambil (riset D [19]) sehingga tidak dikutip di badan teks.
- Total km pipa yang diperbaiki SCIRT tidak ditemukan; studi kasus 6.1 tidak memuat angka km.

---

## Komponen

| Kode | Komponen | Isi dan aturan | Sumber data | Kode G / B5 |
|---|---|---|---|---|
| Tabel 6.1 | Kerusakan sistem air per kejadian besar | Baris: Aceh 2004 (sekunder, lampiran), Lombok 2018, Palu 2018, Cianjur 2022, Sumatra 2025. Kolom: unit atau titik SPAM rusak; sarana darurat (sumur, hidran dengan kapasitas, truk, IPA); jiwa terlayani ("tidak dilaporkan"); waktu pulih titik; sumber; label. Hidran Lombok 2.000 liter dan Cianjur 200 liter ditulis dengan kapasitas | PK1 butir 2–9; PK2 butir 6–11; `kemenpupr-2019-satgas-lombok`, `kemenpupr-2023-cianjur`, `pu-2026-spam-sumatera-feb`, `pu-2026-infrastruktur-sumatera-mei` | L55, B5.7 |
| Gambar 6.1 | Persen layanan pulih lawan hari sejak kejadian | Garis Kobe dan Tohoku (90, 95, 100% rumah tangga) dan titik Sumatra (81% unit hari ke-72; 95,5% unit hari ke-166). Pil "satuan berbeda: rumah tangga lawan unit SPAM"; pil estimasi-model pada sumbu hari Sumatra. Cianjur tidak digambar (tidak ada persen layanan) | `jsce-2011-nojima`; PK1 butir 5–7, 10 | G24 |
| Tabel 6.2 | Standar per lapis | Baris: darurat (Perka 7/2008 resmi; Sphere terverifikasi), sementara (sel "tidak diatur"; WHO TN9 sebagai pembanding terverifikasi), permanen (SPM 60 liter; PP 122/2015). Kolom: liter, jarak, orang per keran, antre, mutu, waktu, dasar | PK3 butir 1–8, 11 | B5.7 |
| Gambar 6.2 | Rantai darurat, sementara, permanen dengan titik serah dan pemutus | Kotak lapis, titik serah (hidran ditarik; pipa sementara; SPAM permanen), pemutus tertulis ("tidak diatur" untuk peralihan truk ke pipa; posko PDAM dan Bupati sebagai praktik Cianjur), dasar pasal | PK2 butir 1–9 | B5.23, G21 |
| Gambar 6.3 | Biaya per m3 truk lawan pipa | Dua batang Renk (USD 9 lawan 1) dan satu tarif PDAM HSU (Rp19.000 per m3) di panel terpisah, bukan satu sumbu; pil "kamp jangka panjang" dan "tarif layanan biasa" | PK2 butir 13; subbab pendukung butir 4 | G14 |
| Tabel 6.3 | Rentang biaya satuan berlabel | Banjarbakula, Jatiluhur I, Semarang Barat per l/dt dan per SR, pipa distribusi per km; kolom tahun harga, skala, label estimasi-model; tanpa total; R3P Cianjur per paket sebagai baris resmi tanpa satuan | subbab pendukung butir 2–4 | B5.7 (G12 bila digambar) |
| Kotak 6.1 | Kit pipa bergerak SIPPA | Rujukan saja, tanpa angka biaya dan tanpa rekomendasi gabungan (R1); dua syarat mutu pangan dan batas lapis | PK4 | B5.5 |
| Studi kasus 6.1 | SCIRT Christchurch | Aliansi pemilik aset dan kontraktor; NZ$2,2 miliar; lebih dari 600 proyek; 19 bulan kepastian dana; pelajaran serah terima data aset; bukti sedang | subbab pendukung butir 10 | B5.30 |
| Kartu angka 6.x (usul) | Tiga kartu: 178 SPAM terdampak Sumatra; 95,5% berfungsi Mei 2026; 172 hidran 200 liter puncak Cianjur | Baris kaki satu sumber dan label per grup kartu | PK1 butir 5–6; PK2 butir 8 | B5.4 |
| Tabel 6.4 (usul) | Progres rehabilitasi SPAM Cianjur 2023 | Lima SPAM; rencana, realisasi, deviasi; menyorot dua SPAM huntap | subbab pendukung butir 1 | B5.7 |

## Angka untuk registri

Kunci baru di `naskah/rehab/bukti/bab-06.angka.json`. Kunci yang sudah ada dan dipakai (tidak diulang): `perka_2008.air_bersih_awal_liter_hari`, `perka_2008.air_bersih_liter_hari`, `perka_2008.jarak_sumber_air_m`, `perka_2008.air_minum_liter_hari` (data/angka.json); `rehab.pipa.sumatra2025.spam_terdampak_feb2026`, `..._spam_berfungsi_feb2026`, `..._sarana_darurat_feb2026`, `..._sumur_bor_feb2026`, `rehab.pipa.sumbar.target_permanen`, `rehab.pipa.sumatra2025.spam_terdampak`, `..._persen_fungsi_mei2026`, `rehab.pipa.lombok.spam_rusak`, `rehab.pipa.cianjur.titik_kerusakan_pipa` (bab-01); `rehab.pipa.pulih.kobe_90`, `kobe_100`, `tohoku_90` (bab-02); `rehab.rekon.cianjur2022.r3p_air_sanitasi_kerusakan_rp`, `..._r3p_spam_perkotaan_rp` (bab-03).

| Kunci | Nilai | Berkas sumber dan jalur | Label | Sumber |
|---|---|---|---|---|
| rehab.pipa.sumatra2025.spam_terdampak_aceh_feb2026 | 71 | pustaka pu-2026-spam-sumatera-feb | resmi | Kementerian PU 5 Feb 2026 |
| rehab.pipa.sumatra2025.spam_berfungsi_aceh_feb2026 | 54 | idem | resmi | idem |
| rehab.pipa.sumatra2025.spam_terdampak_sumut_feb2026 | 45 | idem | resmi | idem |
| rehab.pipa.sumatra2025.spam_berfungsi_sumut_feb2026 | 37 | idem | resmi | idem |
| rehab.pipa.sumatra2025.spam_terdampak_sumbar_feb2026 | 60 | idem | resmi | idem |
| rehab.pipa.sumatra2025.spam_berfungsi_sumbar_feb2026 | 52 | idem | resmi | idem |
| rehab.pipa.sumatra2025.kapasitas_fungsi_feb2026_lps | 5.300 (lebih dari) | idem | resmi | idem |
| rehab.pipa.sumatra2025.progres_infrastruktur_feb2026_persen | 82 | idem | resmi | idem |
| rehab.pipa.sumatra2025.persen_fungsi_feb2026 | 81,25 | olah 143 ÷ 176 | estimasi-model | turunan |
| rehab.pipa.sumatra2025.hari_ke_feb2026 | 72 | olah dari dibi/kejadian_besar.csv [sumatra2025] tanggal 2025-11-22 | estimasi-model | turunan |
| rehab.pipa.sumatra2025.hari_ke_mei2026 | 166 | idem | estimasi-model | turunan |
| rehab.pipa.sumatra2025.spam_fungsi_mei2026_turunan | 170 | olah 95,5% × 178 | estimasi-model | turunan |
| rehab.pipa.lombok.sumur_jiat_diaktifkan | 83 | pustaka kemenpupr-2019-satgas-lombok Tabel 4 | resmi | Buku Satgas Lombok |
| rehab.pipa.lombok.sumur_jiat_kapasitas_lps | 1.314 | idem | resmi | idem |
| rehab.pipa.lombok.hidran_2000l | 242 | idem Tabel 5 | resmi | idem |
| rehab.pipa.lombok.hidran_1000l | 65 | idem | resmi | idem |
| rehab.pipa.lombok.mobil_tangki_4000l | 28 | idem | resmi | idem |
| rehab.pipa.lombok.ipa_unit | 26 | idem Tabel 6 | resmi | idem |
| rehab.pipa.lombok.ipa_kapasitas_lps | 358 | idem | resmi | idem |
| rehab.pipa.cianjur.alat_dasar_awal | 57 | pustaka kemenpupr-2023-cianjur hlm. 41 | resmi | Buku Cianjur |
| rehab.pipa.cianjur.pdam_mobil_tangki | 10 | idem hlm. 42 | resmi | idem |
| rehab.pipa.cianjur.rit_truk_per_hari | 5 | idem | resmi | idem |
| rehab.pipa.cianjur.hidran_puncak | 172 | idem hlm. 43 | resmi | idem |
| rehab.pipa.cianjur.hidran_hari_puncak | 27 | olah 18 Des 2022 dikurangi 21 Nov 2022 | resmi (olah) | idem |
| rehab.pipa.cianjur.hidran_2023_03 | 59 | idem hlm. 43 | resmi | idem |
| rehab.pipa.cianjur.sumber_daya_puncak | 406 | idem hlm. 44 | resmi | idem |
| rehab.pipa.cianjur.sumber_daya_kembali_2023_03 | 202 | idem | resmi | idem |
| rehab.pipa.cianjur.spam_rehab_titik | 5 | idem hlm. 59 | resmi | idem |
| rehab.pipa.cianjur.spam_rehab_progres_mk_2023_09 | 98,31 | idem hlm. 60 | resmi | idem |
| rehab.pipa.cianjur.spam_cirumput_realisasi_2023_09 | 98,55 | idem | resmi | idem |
| rehab.pipa.cianjur.spam_huntap_sirnagalih_realisasi_2023_09 | 78,21 | idem | resmi | idem |
| rehab.pipa.cianjur.spam_huntap_murnisari_realisasi_2023_09 | 80,88 | idem | resmi | idem |
| rehab.pipa.cianjur.r3p_mobilisasi_air_kerugian_rp | 324.800.000 | pustaka cianjur-2022-r3p Tabel 3.8 | resmi | R3P Cianjur |
| rehab.pipa.cianjur.r3p_kebutuhan_spam_perkotaan_rp | 62.671.663.000 | idem hlm. PDF 107 | resmi | idem |
| rehab.pipa.cianjur.r3p_penanganan_spam_5lokasi_rp | 32.200.466.000 | idem | resmi | idem |
| rehab.pipa.palu.pengolah_esdm_unit | 17 | pustaka esdm-2018-air-siap-minum | resmi | ESDM 17 Des 2018 |
| rehab.pipa.palu.pengolah_esdm_jiwa | 22.241 | idem | resmi | idem |
| rehab.pipa.palu.hari_pengolah_darurat | 19 | olah 17 Okt dikurangi 28 Sep 2018 | estimasi-model | riset D |
| rehab.pipa.pulih.kobe_95 | 43 | pustaka jsce-2011-nojima | terverifikasi | JSCE |
| rehab.pipa.pulih.tohoku_95 | 41 | idem | terverifikasi | idem |
| rehab.pipa.intl.kobe_rumah_tangga_padam | 1.260.000 | idem | terverifikasi | idem |
| rehab.pipa.intl.tohoku_rumah_tangga_padam | 2.000.000 (lebih dari) | idem | terverifikasi | idem |
| rehab.pipa.standar.sphere_liter | 15 | pustaka sphere-2018-handbook hlm. 105 | terverifikasi | Sphere |
| rehab.pipa.standar.sphere_orang_per_keran | 250 | idem | terverifikasi | idem |
| rehab.pipa.standar.sphere_antre_menit | 30 | idem | terverifikasi | idem |
| rehab.pipa.standar.sphere_urban_liter | 50 | idem hlm. 106 | terverifikasi | idem |
| rehab.pipa.standar.who_minggu2_4 | 5 | pustaka who-2013-tn9 Tabel 9.3 | terverifikasi | WHO |
| rehab.pipa.standar.who_bulan1_3 | 10 | idem | terverifikasi | idem |
| rehab.pipa.standar.who_bulan3_6 | 15 | idem | terverifikasi | idem |
| rehab.pipa.standar.spm_kuantitas | 60 | pustaka ntb-2022-pergub32-spm | resmi | Pergub NTB 32/2022 |
| rehab.pipa.biaya.per_lps_banjarbakula | 1,57 miliar Rp per l/dt | pustaka setkab-2023-banjarbakula | estimasi-model | riset D |
| rehab.pipa.biaya.per_lps_jatiluhur1 | 0,37 miliar Rp per l/dt | pustaka pu-2025-jatiluhur1 | estimasi-model | riset D |
| rehab.pipa.biaya.per_lps_semarang_barat | 0,75 miliar Rp per l/dt | pustaka pupr-2023-semarang-barat | estimasi-model | riset D |
| rehab.pipa.biaya.per_sr_banjarbakula | 13,0 juta Rp | pustaka setkab-2023-banjarbakula | estimasi-model | riset D |
| rehab.pipa.biaya.per_sr_semarang_barat | 10,7 juta Rp | pustaka pupr-2023-semarang-barat | estimasi-model | riset D |
| rehab.pipa.biaya.pipa_distribusi_utama_per_km | 4,3 miliar Rp per km | idem | estimasi-model | riset D |
| rehab.pipa.biaya.truk_pdam_per_m3 | 19.000 Rp | pustaka hsu-2022-perbup-tarif | estimasi-model | riset D |
| rehab.pipa.biaya.truk_intl_per_m3 | 9 USD | pustaka unss-2025-renk | terverifikasi | riset D |
| rehab.pipa.biaya.pipa_surya_intl_per_m3 | 1 USD | idem | terverifikasi | riset D |
| rehab.pipa.biaya.penurunan_truk_ke_pipa | 92 persen | pustaka unicef-2024-afrika-timur | terverifikasi | riset D |
| rehab.pipa.pamsimas.jiwa_layanan_icr2023 | 24,8 juta | pustaka rwsn-2023-pamsimas | terverifikasi | program-terbukti P13 |
| rehab.pipa.pamsimas.persen_berfungsi_icr2023 | 91 | idem | terverifikasi | idem |
| rehab.pipa.pamsimas.orang_akses_2021 | 24,4 juta | pustaka wb-2023-pamsimas-brief | terverifikasi | riset D |
| rehab.pipa.intl.scirt_program_nzd_miliar | 2,2 | pustaka scirt-2018-value | terverifikasi | SCIRT |
| rehab.pipa.intl.scirt_proyek | 600 (lebih dari) | idem | terverifikasi | idem |
| rehab.pipa.intl.scirt_kepastian_dana_bulan | 19 | pustaka oag-nz-2016-scirt | terverifikasi | Auditor-General NZ |

## Pustaka

Entri CSL-JSON di `naskah/rehab/bukti/bab-06.pustaka.json` (33 entri, semuanya sumber berbeda; 23 lembaga pemerintah Indonesia berlabel resmi, 10 terverifikasi; semua berkas medan `verifikasi` primer, 13 di antaranya dibuka ulang sesi ini dan sisanya dicatat "dari riset D" di medan note). Id yang sudah dipakai `pustaka.json` utama atau berkas bukti bab lain dipakai ulang: `bnpb-2008-kebutuhan-dasar`, `ri-2015-pp122`, `bnpb-2011-pdna`, `bnpb-2020-dsp`, `rwsn-2023-pamsimas`, `dfat-2023-pamsimas`, `bnpb-2010-perka12-perbaikan-darurat`, `pu-2026-spam-sumatera-feb`, `pu-2026-infrastruktur-sumatera-mei`, `kemenpupr-2019-satgas-lombok`, `kemenpupr-2023-cianjur`, `cianjur-2022-r3p`, `jsce-2011-nojima`, `bnpb-dibi`, `bnpb-2024-hibah-rr`, `bnpb-2017-rr`, `ri-2008-pp21`. Id baru: `bnpb-2018-dsp-dicabut`, `bnpb-2009-perka17-peralatan`, `sphere-2018-handbook`, `who-2013-tn9`, `scirt-2018-value`, `oag-nz-2016-scirt`, `esdm-2018-air-siap-minum`, `setkab-2023-banjarbakula`, `pu-2025-jatiluhur1`, `pupr-2023-semarang-barat`, `hsu-2022-perbup-tarif`, `unss-2025-renk`, `unicef-2024-afrika-timur`, `ntb-2022-pergub32-spm`, `kemenpupr-2016-permen27`, `wb-2023-pamsimas-brief`.

Catatan id: berkas bukti bab lain memakai id berbeda untuk dua rilis PU yang sama (`pu-2026-spam-sumatra-feb` di bab-03, `pu-2026-spam-februari` di bab-04); id bab-01 dipakai di sini dan penyatuan diserahkan ke tahap registri.
