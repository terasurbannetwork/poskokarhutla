# Berkas bukti BAB 7 ANALISIS KESENJANGAN

Kajian: Grand Design Ketahanan Air Pulau Jawa 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 24 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9). Penulis bab menulis hanya dari berkas ini
dan dari registri angka; klaim yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/air/bukti/bab-07.angka.json`: 64 kunci angka baru untuk registri (belum digabung ke `data/angka.json`).
- `naskah/air/bukti/bab-07.pustaka.json`: entri CSL-JSON (49 sumber).

Bahan yang dibaca: `KERANGKA.md` §2, §4 (Bab 7, juga Bab 4–6 dan 8 untuk batas isi), §6, §7, §8; `KEPUTUSAN.md`; Buku
Pegangan L56–L64; `PEDOMAN-DESAIN.md` §C9 dan daftar kode G; `riset/A`–`E`; paket `data/lembaga/` (README, `celah.csv`,
`matriks_air.csv`, `sumber.csv`), `data/program-terbukti/` (README, `kompendium_program.csv`, `bukti_dampak.csv`,
`organisasi_bnpb.csv`, `renas_aksi_terkait.csv`, `kompendium.md`), `data/nonalam-sosial/krb_covid19_kab.csv`,
`data/angka.json`, `naskah/air/bukti/bab-01` sampai `bab-04`; korpus JDIH lokal `data/raw/hukum/teks/` (Perban 5/2025
Renstra, Perban 1/2025 Renas, Perban 2/2024, Perban 2/2023, Perban 1/2023, Perban 4/2020, Juklak 4/2026, Juklak 7/2026,
Kepka 327/2025); `public/banjir/data/validasi.json`; sumber web yang dibuka 24 Oktober 2026 (disebut per butir).

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah atau lembaga negara, dokumen atau tabel dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka (jurnal bertinjauan, laporan evaluasi) |
| estimasi-model | Keluaran model yang belum diuji balik atau gagal uji balik |
| asumsi-kebijakan | Pilihan penyusun (pemetaan, rubrik, definisi operasional) |
| sekunder | Berita atau ringkasan; sumber primer tidak terbuka. **Tidak masuk badan teks**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**. Kode C01–C17
merujuk baris `data/lembaga/celah.csv`; kutipan di baris itu sudah dicocokkan mesin ke teks peraturan pada halaman yang
disebut (`lembaga/README.md` §1).

---

## Kerangka bab (dari KERANGKA.md §4, BAB 7)

- **Judul:** BAB 7 ANALISIS KESENJANGAN (8 hlm).
- **Subbab:** 7.1 Kewenangan dan Batas Mandat; 7.2 Data dan Peringatan Dini yang Berfungsi; 7.3 Infrastruktur, Operasi,
  dan Keamanan Bendungan; 7.4 Tata Ruang dan Pengendalian Air Tanah; 7.5 Pembiayaan; 7.6 Kapasitas BPBD dan Instrumen
  Daerah; 7.7 Kesenjangan Bukti Program; 7.8 Yang Sudah Berjalan dan Tidak Boleh Dikorbankan.
- **Tujuan bab:** menamai yang menahan, dengan bukti, dan yang harus dipertahankan.
- **Pertanyaan kunci:**
  1. Di titik mana kewenangan air tumpang tindih atau kosong?
  2. Apa yang membuat peringatan dini tidak sampai ke warga?
  3. Komponen dan musim mana yang tidak punya program terbukti?
  4. Apa yang sudah berjalan dan tidak boleh dikorbankan?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| Celah kewenangan air C05, C06, C07, C13, C17; BNPB dan Kementerian ESDM tidak duduk di Dewan Pengarah BOP Pantura Jawa | Dikonfirmasi di `celah.csv`. **Ditambah:** C16 (UU 23/2014 Lampiran C dan CC dicabut sebagian), 0 dari 31 baris matriks kewenangan air menyebut BNPB (cakupan matriks: norma rezim SDA yang dibaca, jadi angka ini akibat cara matriks disusun, bukan bukti ketiadaan peran), RPSDA yang sudah menempatkan BPBD dan BNPB sebagai pelaksana kegiatan daya rusak air, dan forum air yang ada: Kepala BNPB anggota Dewan SDA Nasional (Perpres 53/2022, dibuka ulang). **Dikoreksi:** Renas 2.4.4.a sudah mencantumkan BNPB sebagai kontributor (P1 temuan 6) |
| Peringatan dini: perbedaan tafsir antartingkat dan pemeliharaan sarana bergantung APBD (Renstra Ancaman 9–10, hlm. 76) | Dikonfirmasi pada korpus. **Ditambah:** kelemahan 21, 23, 24 Renstra; cakupan 6%; Renas 1.1.2.a tanpa BNPB; target hilir Renstra; temuan BPK 2022 atas BMKG lewat Badan Keahlian DPR (IBF 19,68%); unit kerja Perban 2/2024 yang sudah diganti; Rancangan Perpres sistem peringatan dini belum ditemukan terbit |
| Definisi "berfungsi": alat terpelihara, pesan sampai warga, gladi tahunan (Juklak 4/2026, 7/2026) | **Dikoreksi sebagian:** Juklak 4/2026 tidak menetapkan frekuensi gladi; frekuensi wajib yang tertulis ada di Juklak 7/2026 (sosialisasi 2 kali setahun untuk kab/kota berisiko tinggi); Perban 2/2023 mewajibkan uji renkon lewat latihan kesiapsiagaan (Pasal 19) dan masa berlaku 3 tahun, sedangkan reviu 6 bulanan hanya "dapat" dilakukan (Pasal 21 ayat (2), norma fakultatif). "Gladi tahunan" adalah pilihan penyusun (asumsi-kebijakan) |
| 63 daerah belum tuntas SPM dan 87 belum mengaktifkan KRB (Kemenko PMK, sekunder) | **Naik ke resmi:** siaran Kemenko PMK 12 September 2025 dibuka ulang (pernyataan Direktur MPBG Kemendagri). Ditambah 79 daerah belum menyusun IKD 2024. Angka nasional, bukan Jawa |
| BTT dan DSP belum sinkron (Renas, C02) | Dikonfirmasi (Renas hlm. 26) |
| Irigasi dan keamanan serta sedimentasi bendungan tidak punya program di kompendium; jumlah sel tanpa program terbukti dilaporkan | **Dikoreksi sebagian:** keamanan dan sedimentasi bendungan memang tanpa program; irigasi punya dua program yang dipetakan (SLI lemah, embung belum terbukti), jadi yang benar "tanpa program berbukti kuat atau sedang". Hitungan sel: 30 sel, 3 berbukti kuat atau sedang (hanya 1 dalam negeri), 4 lemah atau belum terbukti, 23 tanpa program; bila P16 dipetakan ke dua musim, 5 berbukti kuat atau sedang dan 21 tanpa program (rentang 3–5, P3 temuan 6) |
| Tidak boleh dikorbankan: InaRISK/IRBI, Satu Data Bencana, Dana Bersama PB, rencana kontingensi, PAMSIMAS | Dikonfirmasi berdasar teks peraturan. **Catatan:** PAMSIMAS berperiode 2008–2023 (fase III berakhir), jadi yang dipertahankan adalah aset dan BP-SPAMS, bukan proyeknya; kelanjutan tidak terverifikasi |

- **Komponen (KERANGKA):** Kartu temuan 7.1–7.6 (bukti, dampak, lembaga pembuka; B5.6); Tabel 7.1 tumpang tindih dan celah
  kewenangan air (B5.7); Gambar 7.1 sel komponen × musim × fase menurut kategori bukti (G16); Kotak 7.1 yang tidak boleh
  dikorbankan (B5.5). Rincian di bagian Komponen.
- **Status data (KERANGKA):** ada; isi temuan BPK belum dibaca dan tidak diklaim. **Pembaruan:** satu LHP Kinerja BPK (2022,
  BMKG, deteksi dini banjir dan longsor) diketahui isinya lewat ringkasan Badan Keahlian DPR; LHP-nya sendiri tidak dibuka
  (lihat P2 Celah). Bahan tata ruang untuk subbab 7.4 ditambahkan di bagian Bahan subbab (temuan 7).

Catatan lingkup: Bab 7 tidak memuat kartu skenario, jadi aturan lantai skenario (KERANGKA §2 butir 9) tidak dipakai di
sini dan angka korban skenario Bab 5–6 tidak diulang. Satu angka model (uji balik status banjir dan longsor platform)
ditulis berdampingan dengan angka tercatat lembaga (P2 temuan 9), tetapi tidak dipakai sebagai penguat temuan lembaga
karena satuan dan ukurannya berbeda. Strategi dan rekomendasi tidak ditulis di bab ini (prinsip 17);
bagian Inferensi hanya menamai lembaga pembuka untuk kartu temuan. Ketidaksesuaian dokumen internal BNPB ditulis sebagai
butir lampiran Penyelarasan dokumen BNPB dengan suara BNPB (prinsip 1), tidak masuk Ringkasan Eksekutif.

---

## P1. Di titik mana kewenangan air tumpang tindih atau kosong?

### Inti

Tumpang tindih terjadi di irigasi (tiga tingkat kewenangan per daerah irigasi ditambah jaringan tersier Kementan), air tanah
(dasar spasial kewenangan berbeda antara UU 23/2014 dan UU 17/2019, penerbit izin belum pasti), penurunan muka tanah (dua
rezim, PP 43/2008 dan PP 30/2024) dan tanggul pesisir Jakarta (Kementerian PU, Pemprov DKI, BOP Pantura Jawa). Kekosongan
terjadi di peringatan dini kekeringan hidrologis (penyedia tidak ditunjuk) dan di tautan antara sistem peringatan dini per
wilayah sungai dan sistem BNPB. Jembatan umum ke rantai kedaruratan sudah tertulis (UU 17/2019 Pasal 35 ayat (5)–(6); PP
30/2024 Pasal 96 ayat (1) huruf d), dan beberapa RPSDA sudah menempatkan BPBD dan BNPB sebagai pelaksana kegiatan daya
rusak air. Jalur BNPB yang tertulis di tingkat nasional adalah keanggotaan Kepala BNPB di Dewan SDA Nasional dan
kontributor Renas 2.4.4.a. Matriks kewenangan air penyusun, yang hanya memuat norma rezim SDA yang dibaca, tidak memuat
baris BNPB; itu akibat cakupan matriks, bukan temuan.

### Temuan bersumber

1. **Irigasi (C05):** UU 17/2019 membagi sistem irigasi menurut daerah irigasi kewenangan pusat, provinsi, dan kab/kota, dan
   Pemerintah Pusat menetapkan status daerah irigasi; ambang luas (pusat lebih dari 3.000 ha, provinsi 1.000–3.000 ha, kab/kota
   kurang dari 1.000 ha) tertulis di Permen PUPR 14/PRT/M/2015; jaringan tersier ada di Kementan; Inpres 2/2025 membuat
   Kementerian PU mengambil alih percepatan jaringan kewenangan Kementan dan pemda lalu menyerahkannya kembali, dan
   memerintahkan PU serta Kementan memastikan tidak ada tumpang tindih. Inpres 2/2025 menyasar 14 provinsi di luar Jawa;
   Jawa hanya tercakup lewat klausul "provinsi lain". Sumber: `lembaga/celah.csv` C05 (UU 17/2019 hlm. 11; Permen PUPR
   14/2015 hlm. 8; Inpres 2/2025 hlm. 2, 5, 7). Label: resmi; titik tumpang tindih disimpulkan penyusun (Inpres tidak
   menyatakan tumpang tindih sudah terjadi).
2. **Ambang irigasi dan izin air tanah di UU 23/2014 sudah dicabut (C16):** UU 17/2019 Pasal 77 mencabut UU 23/2014
   Lampiran C No. 1 SDA kolom 3–5 huruf b (ambang irigasi) dan Lampiran CC Geologi kolom 3 huruf a (penetapan CAT), kolom 4
   huruf b (izin air tanah oleh provinsi), dan kolom 5. Pengganti Permen PUPR 14/2015 tidak ditemukan; penerbit izin air tanah
   per Oktober 2026 belum pasti (PP 28/2025 dan Kepmen ESDM 291.K/2023 belum dibaca). Sumber: `celah.csv` C16 (UU 17/2019
   hlm. 49). Label: resmi.
3. **Air tanah, dasar spasial berbeda (C07):** UU 23/2014 Lampiran CC kolom 4 huruf a (masih berlaku) memberi provinsi zona
   konservasi untuk CAT "dalam Daerah provinsi"; UU 17/2019 memberi provinsi zona konservasi CAT "di Wilayah Sungai lintas
   kabupaten/kota" dan pusat untuk CAT di WS lintas provinsi atau strategis, tanpa menunjuk K/L. Batas CAT dan WS tidak sama.
   Sumber: `celah.csv` C07 (UU 23/2014 hlm. 435; UU 17/2019 hlm. 11, 13). Label: resmi; perbedaan disimpulkan penyusun.
4. **Penurunan muka tanah, dua rezim (C06):** pengendalian daya rusak air tanah termasuk amblesan oleh menteri bidang air
   tanah, gubernur, dan bupati/wali kota (PP 43/2008, berstatus Berlaku di BPK); kawasan daya rusak air yang memuat "ambles"
   oleh Menteri SDA, gubernur, dan bupati/wali kota (PP 30/2024). Konsiderans Perpres 77/2025 menyebut penurunan muka tanah
   Pantura. Kementerian ESDM dan BNPB tidak duduk di Dewan Pengarah BOP Pantura Jawa, sedangkan pengoordinasi keduanya, Menko
   Perekonomian dan Menko PMK, duduk sebagai Wakil Ketua. Sumber: `celah.csv` C06 (PP 43/2008 hlm. 31; PP 30/2024 hlm. 66;
   Perpres 77/2025 hlm. 1, 5–6); status PP 43/2008 di `lembaga/sumber.csv`. Label: resmi. Tanah ambles termasuk daya rusak
   air (UU 17/2019 Penjelasan Pasal 35 ayat (3) huruf i). Label: resmi.
5. **Pesisir Jakarta, tiga pelaku tanggul (C13):** NCICD dibangun terbagi antara Kementerian PU dan Pemprov DKI (trase DKI
   20,9 km, terbangun 9,4 km, sisa 11,5 km per 17 Juli 2025; Fase A 39 km, target 2030); sejak 2025 BOP Pantura Jawa bertugas
   atas persiapan sampai pembangunan Pantura termasuk tanggul laut, dengan Menteri PU dan Gubernur DKI di Dewan Pengarah.
   Sumber: `celah.csv` C13; Dinas SDA DKI (https://dsda.jakarta.go.id/detail-artikel/update-progres-pekerjaan-ncicd-ini-tanggul-terbangun-per-juli-2025/8,
   diakses 23 Oktober 2026); kunci lama `ncicd.fase_a.kewenangan_dki_km`. Label: resmi; data sekitar 15 bulan sebelum batas
   data.
6. **Renas 2.4.4.a (NSPK mitigasi dan adaptasi "subsiden tanah", nama aksi verbatim):** penanggung jawab Kementerian
   Lingkungan Hidup; kontributor Kementerian Hukum, Kemenko PMK, Kemenko Infrastruktur dan Pembangunan Kewilayahan,
   Kementerian ATR/BPN, **BNPB**, dan KKP; target 5 dokumen pada 2029. Kementerian ESDM (rezim PP 43/2008) dan Kementerian PU
   (rezim PP 30/2024) tidak tercantum di kolom penanggung jawab maupun kontributor. Sumber: korpus
   `perban-nomor-1-tahun-2025.json` hlm. 86 (dibaca dari tata letak kolom asli); kunci baru
   `renas.aksi_244a.kontributor_kl`; kunci lama `renas.aksi_244a.target_2029`. Label: resmi. **Dibantah oleh / koreksi:**
   KERANGKA §2 butir 2 dan KD-5 menulis BNPB "diusulkan menjadi kontributor 2.4.4.a"; `program-terbukti/renas_aksi_terkait.csv`
   hanya mencatat tiga kontributor pertama (Kementerian Hukum, Kemenko PMK, Kemenko Infrastruktur). Teks Renas menunjukkan BNPB
   sudah kontributor.
7. **Peringatan dini per bahaya (C17):** Perban 2/2024 Pasal 7 ayat (2) mendaftar 11 jenis data peringatan dini bahaya (huruf
   a–k, termasuk banjir, pergerakan tanah, kekeringan) ditambah layanan lainnya, dan ayat (3) menyerahkan penyampaiannya ke
   "ketentuan peraturan perundang-undangan". Mandat yang ditemukan: BMKG (cuaca ekstrem, iklim ekstrem, gelombang, tsunami; UU
   31/2009), Badan Geologi (gunung api, gerakan tanah), dan rezim SDA: penetapan sistem peringatan dini pada setiap WS (PP
   30/2024 Pasal 96 ayat (1) huruf b) yang menjadi tanggung jawab Menteri, menteri/pimpinan LPNK, gubernur, dan/atau
   bupati/wali kota (Pasal 94 ayat (5)). Jembatan umum rezim SDA ke rantai kedaruratan yang sudah tertulis: "Upaya
   penanggulangan Daya Rusak Air yang dinyatakan sebagai bencana dilaksanakan sesuai dengan ketentuan peraturan
   perundang-undangan" dan, dalam keadaan yang membahayakan, gubernur dan/atau bupati/wali kota berwenang mengambil tindakan
   darurat (UU 17/2019 Pasal 35 ayat (5) dan (6), hlm. 24); pengaturan pengendalian daya rusak air meliputi "penetapan
   prosedur operasi standar evakuasi korban bencana akibat Daya Rusak Air" (PP 30/2024 Pasal 96 ayat (1) huruf d, hlm. 65),
   dan pembinaannya meliputi pelatihan tanggap darurat (Pasal 96 ayat (2) huruf b). Tidak ditemukan: norma khusus yang
   menghubungkan sistem peringatan dini per WS dengan Perban 2/2024 dan platform BNPB; siapa di antara pemegang Pasal 94 ayat
   (5) yang menetapkan; dan penyedia peringatan dini kekeringan hidrologis. Sumber: `celah.csv` C17; korpus
   `perban-nomor-2-tahun-2024.json` hlm. 5; `lembaga/mentah/teks/uu-17-2019.json.gz` hlm. 24; `pp-30-2024.json.gz` hlm. 65.
   Label: resmi; ketiadaan disimpulkan penyusun dari teks yang dibaca.
8. **Matriks kewenangan air, dari norma rezim SDA yang dibaca:** 31 baris (komponen × tingkat × lembaga), 23 berjenis tertulis
   dan 8 pemetaan penyusun. Cakupan matriks dipilih penyusun: hanya UU 17/2019 jo. UU 6/2023, UU 23/2014, dan turunannya
   (`lembaga/README.md` §4.3); peraturan kebencanaan dan dokumen RPSDA tidak dimasukkan. Dalam cakupan itu tidak ada baris
   yang menyebut BNPB, dan BPBD muncul di 1 baris (A19, diikutsertakan menyusun RTD bendungan, dipetakan dari Penjelasan PP
   37/2010). Ketiadaan baris BNPB adalah akibat cara matriks dibangun, bukan bukti bahwa BNPB tidak berperan di rezim air
   (bandingkan temuan 9 dan 10). Sumber: `lembaga/matriks_air.csv`; kunci baru `lembaga.air.baris_total`,
   `lembaga.air.baris_tertulis`, `lembaga.air.baris_bnpb`, `lembaga.air.baris_bpbd`. Label: olah (asumsi-kebijakan cakupan);
   baris berjenis tertulis bersumber resmi.
9. **Forum air yang sudah ada, dibuka ulang:** Perpres 53/2022 tentang Dewan SDA Nasional (ditetapkan 6 April 2022) Pasal 7
   ayat (1) huruf d angka 14 menetapkan "kepala badan yang melaksanakan tugas pemerintahan di bidang penanggulangan bencana"
   sebagai anggota dari unsur Pemerintah Pusat (15 jabatan); Pasal 5 ayat (2) huruf c memberi Dewan fungsi koordinasi
   perumusan kebijakan pengelolaan sistem informasi hidrologi, hidrometeorologi, dan hidrogeologi tingkat nasional, dan huruf e
   koordinasi dengan tim koordinasi pengelolaan SDA wilayah sungai. Ketua dijabat menko bidang kemaritiman dan investasi.
   Keanggotaan ditetapkan Keppres 18/2024. Sumber: https://peraturan.bpk.go.id/Download/199318/Perpres%20Nomor%2053%20Tahun%202022.pdf
   (diakses 24 Oktober 2026); `riset/E-dokumen-primer.md` E13; kunci baru `perpres53.anggota_pusat`. Label: resmi.
   **Dibantah oleh / koreksi:** KERANGKA §7 butir 32, §8, dan berkas bukti bab-01 (§ celah) serta bab-02 (C2.3) menulis
   Perpres Dewan SDA Nasional "tidak dibuka/tidak ditemukan".
10. **Wadah WS tanpa BNPB/BPBD di teksnya, tetapi RPSDA sudah menyebut keduanya:** Permen PU 2/2024 (13 Desember 2024)
    mengatur TKPSDA WS lintas negara, lintas provinsi, dan strategis nasional yang ditetapkan Menteri; teksnya tidak menyebut
    BNPB atau BPBD. Di sisi lain, beberapa Rencana PSDA (ditetapkan Kepmen PU/PUPR) menempatkan BPBD dan BNPB sebagai pelaksana
    di matriks kegiatan pengendalian daya rusak air. Contohnya RPSDA Ciliwung-Cisadane 2019: kajian peringatan dini banjir,
    tindak darurat, dan posko, dengan BNPB di tabel peran ("kebijakan penanggulangan bencana, rehabilitasi dan rekonstruksi").
    Kata BPBD muncul 50 kali di RPSDA Brantas 2021, 44 kali di Serayu-Bogowonto 2017, dan 29 kali di Jratunseluna 2024. Jadi
    yang kosong adalah keanggotaan di wadah koordinasi WS, bukan peran pelaksana di rencana WS. Sumber:
    `riset/E-dokumen-primer.md` E6, E13;
    https://peraturan.bpk.go.id/Details/328867; https://sda.pu.go.id/dokumen/kategori/pola_pengelolaan_sda (diakses 23
    Oktober 2026 oleh riset E). Label: resmi.
11. **Pengakuan BNPB sendiri:** Renstra BNPB 2025–2029 mengutip National Assessment Report 2023 bahwa ketidakjelasan regulasi
    dan pembagian kewenangan mengakibatkan tumpang tindih penanganan bencana (C01, hlm. 24), dan mencatat ancaman "tidak adanya
    aktor tingkat K/L yang mampu memimpin intervensi isu lintas sektor" (Ancaman 1, hlm. 75). Sumber: korpus
    `perban-nomor-5-tahun-2025.json` hlm. 24, 75. Label: resmi.
12. **Rantai koordinasi tiga Kemenko (C15):** BMKG bertanggung jawab kepada Presiden melalui menteri bidang transportasi, dan
    Kementerian PU (banjir, bendungan) di bawah Kemenko Infrastruktur dan Pembangunan Kewilayahan; BNPB dikoordinasikan Kemenko
    PMK; Badan Geologi (ESDM) di bawah Kemenko Perekonomian. Sumber: `celah.csv` C15 (Perpres 12/2024 hlm. 2; Perpres 145/2024
    hlm. 4–5; Perpres 1/2019 hlm. 4; Perpres 143/2024 hlm. 5). Label: resmi.
13. **CAT rusak, sumber resmi tanpa penetapan:** artikel situs Badan Geologi (22 Januari 2024) menyebut CAT yang teridentifikasi
    rusak, antara lain Jakarta, Karawang-Bekasi, Semarang, Bandung-Soreang, Bogor, Serang-Tangerang; tidak ada kategori,
    kriteria, atau dokumen penetapan status. Sumber:
    https://geologi.esdm.go.id/media-center/tanah-pantura-jawa-alami-penurunan-ini-mitigasi-badan-geologi (riset E7, diakses
    23 Oktober 2026). Label: resmi (pernyataan instansi), tanpa dokumen penetapan. **Dibantah oleh / berdampingan:** bab-04 P4
    temuan 13 menulis siaran pers resmi ESDM tidak menyebut nama CAT; artikel Badan Geologi ini menyebutnya.

### Inferensi

- **[Inferensi tim]** Kekosongan yang paling relevan bagi BNPB bukan "siapa membangun", karena pembangunan prasarana air
  bermandat tertulis (Kementerian PU, pemda, PJT). Jembatan umum ke rantai kedaruratan juga sudah tertulis (UU 17/2019 Pasal
  35 ayat (5)–(6); PP 30/2024 Pasal 96 ayat (1) huruf d), dan RPSDA sudah menyebut BPBD dan BNPB sebagai pelaksana kegiatan
  peringatan dini banjir dan tindak darurat. Yang belum tertulis lebih sempit: norma yang menghubungkan sistem peringatan dini
  per WS (PP 30/2024 Pasal 96 ayat (1) huruf b) dengan Perban 2/2024 dan platform BNPB, dan penyedia peringatan kekeringan
  hidrologis. Dewan SDA Nasional sudah punya fungsi koordinasi sistem informasi hidrologi dan Kepala BNPB sudah anggota, jadi
  forum untuk sambungan itu sudah ada secara tertulis.
- **[Inferensi tim]** Untuk penurunan muka tanah, penanggung jawab NSPK di Renas (KLH) bukan pemegang salah satu dari dua rezim
  yang mengatur amblesan (ESDM lewat PP 43/2008, PU lewat PP 30/2024), dan kedua pemegang rezim itu tidak tercantum di aksi
  2.4.4.a. BNPB sudah kontributor, sehingga posisi KD-5 bergeser dari "meminta menjadi kontributor" ke "menjalankan peran
  kontributor yang sudah tertulis". Penulis wajib memakai rumusan kedua.
- **[Inferensi tim]** Air tanah adalah titik dengan ketidakpastian hukum terbesar: kewenangan izin provinsi sudah dicabut,
  penggantinya belum dapat dipastikan dari teks yang dibaca, dan zona konservasi diatur dengan dua dasar spasial. Ini bukan
  tumpang tindih yang terbukti di lapangan; ini ketidakjelasan norma.
- **[Inferensi tim]** Lembaga pembuka untuk kartu temuan 7.1: Kemenko PMK (rakor; Wakil Ketua Dewan Pengarah BOP Pantura
  Jawa), Dewan SDA Nasional (sekretaris ex officio Dirjen SDA Kementerian PU), Kementerian ESDM (Badan Geologi), KLH (PJ
  2.4.4.a).

### Celah

- Teks PP 28/2025 dan Kepmen ESDM 291.K/2023 belum dibaca; penerbit izin air tanah per Oktober 2026 ditulis "belum dapat
  dipastikan". **Permintaan:** Kementerian ESDM (Badan Geologi).
- Keberadaan dan susunan TKPSDA WS di Jawa saat ini, serta apakah BPBD duduk di dalamnya, tidak diperiksa per WS. Pelaksanaan
  kegiatan RPSDA yang menyebut BPBD/BNPB juga tidak diperiksa. **Penyajian:** tulis dasar hukumnya (Permen PU 2/2024), bahwa
  teksnya tidak menyebut BNPB/BPBD, dan bahwa RPSDA sudah menyebut keduanya sebagai pelaksana. **Permintaan:** Kementerian PU
  (Ditjen SDA), BBWS di Jawa.
- Matriks kewenangan air tidak memuat peraturan kebencanaan dan RPSDA; hitungan baris BNPB/BPBD tidak boleh dibaca sebagai
  ukuran peran BNPB di rezim air. **Penyajian:** bila dipakai, sebut "dari norma rezim SDA yang dibaca".
- Pemetaan jabatan ketua Dewan SDA Nasional (menko bidang kemaritiman dan investasi) ke kabinet 2024–2029 belum dapat
  dipastikan; perubahan Perpres 53/2022 tidak ditemukan (riset E13). **Penyajian:** sebut jabatan sesuai teks dengan catatan.
- Dokumen penetapan status atau zona konservasi CAT tidak ditemukan. **Penyajian:** CAT rusak hanya sebagai pernyataan
  instansi, tidak menjadi syarat daftar perhatian.
- Bukti bahwa tumpang tindih irigasi pernah menimbulkan kegagalan respons di Jawa tidak ditemukan; butir ditulis sebagai
  potensi dari teks, bukan kejadian.

---

## P2. Apa yang membuat peringatan dini tidak sampai ke warga?

### Inti

Cakupan peringatan dini masih 6% dari masyarakat terpapar di kawasan berisiko tinggi (Renstra), dan BNPB sendiri mencatat
empat penyebab: penyelenggaraan masih sektoral dan eksklusif, data antarsistem K/L tidak kompatibel, tafsir sistem
peringatan dini berbeda antara nasional, daerah, dan masyarakat, serta pemeliharaan sarana bergantung pada anggaran dan
komitmen pemda; diseminasi dari BPBD ke masyarakat belum merata. Di hulu, BPK (lewat ringkasan Badan Keahlian DPR)
menemukan hanya 19,68% kejadian banjir yang mendapat peringatan dini berbasis dampak dari BMKG. Di hilir, target sarana
diseminasi di desa sampai 2029 setara paling banyak 16,3% dari 53.000 desa rawan, dan aksi sarana itu di Renas tidak
menyebut BNPB.

### Temuan bersumber

1. **Cakupan, dua angka berpenyebut berbeda (ditulis berdampingan):** (a) keterpenuhan sistem peringatan dini 6% dari total
   masyarakat terpapar di kawasan berisiko tinggi (Renstra hlm. 70, isu RPJMN; kunci baru `renstra.pd_keterpenuhan_persen`);
   (b) KP 08.04.02 RPJMN cakupan layanan peringatan dini di daerah berisiko: baseline 6,00, target 6,10 (2025) dan 6,32 (2029)
   (RPJMN Lampiran III hlm. 913; kunci baru `rpjmn.kp_peringatan_dini.baseline`; kunci lama `renstra.ikp_peringatan_dini.2025`,
   `.2029`); (c) Renas indikator 1.c: 11.060 ke 52.000 per 100.000 penduduk di daerah berisiko (kunci lama
   `renas.indikator_1c.2025`, `.2029`). Sumber: korpus `perban-nomor-5-tahun-2025.json` hlm. 70, 133;
   `perban-nomor-1-tahun-2025.json` Tabel 2.8; `riset/E-dokumen-primer.md` E11b. Label: resmi. Penyebut (a), (b), dan (c)
   berbeda; tidak dijejerkan sebagai satu deret (program-terbukti README §4 butir 7; KD-2).
2. **Diagnosis BNPB sendiri (Renstra, analisis SWOT):** kelemahan 21 "Diseminasi informasi dari BPBD sebagai jejaring
   informasi ke masyarakat di seluruh Indonesia belum merata, terlebih untuk kelompok rentan"; kelemahan 23 "Penyelenggaraan
   sistem peringatan dini masih sektoral dan eksklusif dalam lingkup program/kegiatan terpisah"; kelemahan 24 kompatibilitas
   data dan sistem koneksi berbagai sistem peringatan dini bahaya di berbagai K/L (hlm. 74–75); ancaman 9 "Adanya perbedaan
   interpretasi sistem peringatan dini di lingkup nasional, daerah, dan masyarakat"; ancaman 10 alokasi anggaran dan komitmen
   pemda untuk pembangunan dan pemeliharaan sarana dan prasarana pendukung peringatan dini (hlm. 76); risiko sasaran
   strategis 1 huruf b "Keterbatasan jumlah infrastruktur early warning system yang tersedia" (hlm. 91). Strategi W-T 1
   memasangkan kelemahan 23 dengan ancaman 9, 10, 11 (hlm. 78). Sumber: korpus `perban-nomor-5-tahun-2025.json` hlm. 74–78,
   91. Label: resmi.
3. **Regulasi:** Renas mencatat "Belum optimalnya regulasi peringatan dini yang ada terutama untuk multi ancaman bencana"
   (C03, Renas hlm. 26). Renstra menargetkan 1 Rancangan Perpres tentang Peringatan Dini Bencana pada 2025 (hlm. 161); BNPB
   membuka seleksi konsultan untuk "Penyusunan Rancangan Peraturan Presiden Tentang Sistem Peringatan Dini Bencana" lewat
   proyek IDRIP, Direktorat Peringatan Dini (Pengumuman No. 1/KI-RANPERPRES/POKJAIDRIP-D2/7/2024, 1 Juli 2024). Perpres itu
   tidak ditemukan terbit pada penelusuran 24 Oktober 2026. Progsun BNPB 2026 (Kepka 327/2025, 11 rancangan) tidak memuat
   perubahan Perban 2/2024. Sumber: `celah.csv` C03; korpus hlm. 161 Renstra; https://bnpb.go.id/storage/app/media/PENGUMUMAN%20SELEKSI%20KI%20PERINGATAN%20DINI/Pengumuman_Seleksi%20Konsultan%20Individu%20Regulasi%20MHEWS%202024.pdf
   (diakses 24 Oktober 2026); korpus `keputusan-kepala-nomor-327-tahun-2025.json`. Label: resmi; status "belum terbit"
   adalah hasil penelusuran, bukan pernyataan resmi.
4. **Rancangan rantai di Perban 2/2024 (ditetapkan 25 Maret 2024):** tujuh komponen utama, yaitu platform, konektivitas data,
   interoperabilitas, rekomendasi aksi, diseminasi, aksi merespons, dan pemanfaatan (Pasal 2 ayat (3)); keputusan
   penyebarluasan dan arahan tindakan oleh Kepala BNPB dan kepala daerah (Pasal 17); rekomendasi teknis disusun BPBD (Pasal
   15); BPBD memberi umpan balik lewat platform (Pasal 23); penyelenggaraan di daerah oleh BPBD lewat platform (Pasal 25);
   evaluasi paling sedikit 1 kali dalam 4 bulan oleh Deputi Bidang Pencegahan dan dilaporkan ke Kepala BNPB (Pasal 29);
   pendanaan APBN, APBD, dan sumber lain (Pasal 30). Sumber: korpus `perban-nomor-2-tahun-2024.json` hlm. 4–13; kunci baru
   `perban2_2024.jenis_data_bahaya`, `perban2_2024.evaluasi_per_bulan`. Label: resmi.
5. **Unit kerja Perban 2/2024 yang sudah diganti:** kelompok kerja interoperabilitas (Pasal 12 ayat (2) huruf d), rekomendasi
   aksi (Pasal 14 ayat (3) huruf b dan c), dan diseminasi (Pasal 19 ayat (3) huruf c) menyebut Pusat Pengendalian Operasi dan
   Direktorat Fasilitasi Penanganan Korban dan Pengungsi. Keduanya berstatus "diganti Perban 11/2025" (Pusat Pengendalian
   Operasi diganti Pusat Pembinaan Jabatan Fungsional Kebencanaan; Deputi Bidang Penanganan Darurat kini satu direktorat
   koordinasi dan tiga direktorat wilayah). Sumber: korpus `perban-nomor-2-tahun-2024.json` hlm. 7–10;
   `program-terbukti/organisasi_bnpb.csv` baris 39, 42, 46. Label: resmi. Penyajian: butir lampiran Penyelarasan dokumen
   BNPB ("BNPB menyelaraskan susunan kelompok kerja Perban 2/2024 dengan OTK Perban 11/2025").
6. **Hilir di Renas: aksi sarana diseminasi tanpa BNPB.** Rencana Aksi 1.1.2.a "Peningkatan Ketersediaan Sarana Prasarana
   Pendukung dan Diseminasi Peringatan Dini Bencana di Daerah": sarana dan prasarana 546 ke 1.495 unit; desa dengan sarana
   peringatan dini 8.412 ke 8.642 (2024 ke 2029). Penanggung jawab 11 K/L sektor bahaya (Kementerian ESDM, Kementerian PU,
   BMKG, KLH, Kemenhut, Kemensos, Kemenkes, BRIN, Kementan, Kemendes PDT, BIG), kontributor Kemendagri; BNPB tidak disebut.
   Di Program 1.1.1 (MHEWS) BNPB memegang empat aksi: 1.1.1.a rencana induk dan evaluasi aksesibilitas MHEWS (PJ BNPB);
   1.1.1.b platform pantauan dan pengamatan ancaman (PJ bersama: BNPB, Kementerian ESDM, Kementerian PU, BMKG, KLH,
   Kemenhut, Kemensos, Kemenkes, BRIN, Kementan); 1.1.1.c platform analisis peringatan dini (PJ BNPB); dan 1.1.1.d
   "Pengembangan dan pemanfaatan platform diseminasi peringatan dini bencana" (PJ BNPB, target 1 platform/sistem pada
   2029). Jadi BNPB memegang diseminasi di sisi platform; yang tanpa BNPB adalah sarana fisik pendukung dan diseminasi di
   daerah (1.1.2.a). Sumber: korpus `perban-nomor-1-tahun-2025.json` hlm. 50–51 (dicek dengan pdftotext -layout atas PDF
   asli `data/raw/hukum/pdf/perban-nomor-1-tahun-2025.pdf`); kunci baru `renas.aksi_112a.*`. Label: resmi.
7. **Skala hilir terhadap desa rawan:** 53.000 desa di daerah rawan bencana (Renstra hlm. 69, isu RPJMN; kunci baru
   `renstra.desa_rawan`). Target 8.642 desa bersarana pada 2029 setara paling banyak 16,3% dari 53.000 (2024: 15,9%). Sumber:
   olah(resmi) dari temuan 6 dan Renstra hlm. 69; kunci baru `renas.aksi_112a.desa_2029_porsi_desa_rawan_persen`. Label:
   resmi (olah); batas atas karena tidak semua desa bersarana dijamin berada di desa rawan.
8. **Target hilir Renstra (Direktorat Peringatan Dini):** sirene peringatan dini terpasang 23 paket (2025) naik bertahap ke 170
   paket (2029); pembinaan penguatan respons sistem peringatan dini berbasis masyarakat 300 orang per tahun (2025–2028) dan
   4.250 orang (2029); fasilitasi pemda 7 kab/kota per tahun dan 56 kab/kota (2029); persentase layanan diseminasi berbasis
   sirine yang memadai 6,09% (2025) ke 6,29% (2029). Sumber: korpus `perban-nomor-5-tahun-2025.json` hlm. 161–162; kunci
   baru `renstra.sirene_terpasang.*`, `renstra.pembinaan_respons_pd.*`, `renstra.fasilitasi_pemda_pd.*`,
   `renstra.diseminasi_sirene_memadai.*`. Label: resmi. Deret indikator sirene di hlm. 135 sama dengan hlm. 161 (6,09; 6,14;
   6,18; 6,23; 6,29 untuk 2025–2029; dicek dengan pdftotext -layout atas PDF asli). Kolom tidak menyatakan apakah 23–170 paket
   tahunan atau kumulatif.
9. **Hulu, temuan BPK atas BMKG (lewat Badan Keahlian DPR) disandingkan dengan uji balik platform:**
   - Badan Keahlian DPR (Accountability Brief Komisi V, 2022) merangkum LHP Kinerja BPK 2022 atas efektivitas observasi,
     analisis, dan prakiraan untuk deteksi dini banjir dan longsor pada BMKG dan instansi terkait: kegiatan pendukung deteksi
     dini "belum sepenuhnya efektif"; hanya 19,68% kejadian banjir yang telah mendapat peringatan dini dari Impact Based
     Forecasting; rata-rata akurasi prakiraan cuaca 34 provinsi 82,82% terhadap target 87% (hanya 2 provinsi memenuhi);
     kekurangan 40 radar, 311 AWS, 6.536 penakar hujan otomatis; koordinasi forecaster IBF pusat dan daerah menjadi kendala.
     Sumber: https://berkas.dpr.go.id/pa3kn//analisis-tematik-akuntabilitas/public-file/analisis-ringkas-cepat-public-66.pdf
     hlm. 3–4 (diakses 24 Oktober 2026); kunci baru `bpk.bmkg.*`. Label: resmi (dokumen lembaga negara yang mengutip LHP BPK;
     LHP tidak dibuka, periode data tidak disebut). Penulis wajib menulis "menurut ringkasan Badan Keahlian DPR atas LHP BPK".
   - Uji balik ambang platform (estimasi-model), ditulis berdampingan, bukan pembanding langsung: uji balik status banjir
     platform Pantau Bencana tingkat kabupaten, uji 2022–2025, Jawa, satuan kabupaten-hari (bukan kejadian). POD bergantung
     pada ambang yang dipilih: status Waspada POD 0,503 (selang 95% 0,413–0,597; FAR 0,957), status Siaga POD 0,141 (selang 95%
     0,089–0,202; FAR 0,923); longsor Waspada 0,531 dan Siaga 0,181. Uji ini memakai hujan ERA5 sebagai prakiraan sempurna,
     jadi kemampuan nyata lebih rendah. Ini uji ambang platform sendiri, bukan bukti kondisi hulu BMKG, dan tidak dipakai
     sebagai penguat angka IBF 19,68% (satuan, ambang, dan sumber berbeda). Sumber: `public/banjir/data/validasi.json` kunci
     `banjir.pulau.Jawa.waspada`, `.siaga`, `longsor.pulau.Jawa.waspada`, `.siaga`, `catatan`; `riset/D` §1.2–1.3; kunci baru
     `platform.banjir.jawa.pod_waspada`, `platform.banjir.jawa.pod_siaga`, `platform.longsor.jawa.pod_siaga`. Label:
     estimasi-model; keluaran platform, bukan Data Bencana menurut Perban BNPB 1/2023 (prinsip 19).
   - Data BNPB yang dikutip brief yang sama: LEWS longsor di 112 titik kab/kota (27 provinsi), FEWS banjir di 27 titik, TEWS
     tsunami di 4 titik; tanggal data tidak disebut. Label: sekunder terhadap BNPB; tidak masuk badan teks dan registri.
10. **Definisi "berfungsi" yang tertulis di instrumen berlaku:** renkon wajib diuji lewat latihan kesiapsiagaan, termasuk
    uji operasionalisasi melalui geladi posko dan geladi lapang (Perban 2/2023 Pasal 19), dan berlaku 3 tahun (Pasal 21 ayat
    (1)); reviu bersifat fakultatif: "Rencana Kontingensi Bencana dapat dilakukan reviu secara berkala paling sedikit 6
    (enam) bulan sekali" (Pasal 21 ayat (2)); RPKB Daerah wajib diuji coba setelah ditetapkan, melalui Gladi Ruang (Perban
    9/2025 Pasal 27, korpus hlm. 9); sosialisasi KIE paling sedikit 2 kali setahun di kab/kota berisiko tinggi dan 1 kali di berisiko sedang, materinya memuat pengenalan sistem peringatan dini dan cara
    merespons (Juklak 7/2026 hlm. 7, 9; ditetapkan 15 September 2026); gladi lapang menguji penerimaan dan penyebaran peringatan
    dini kepada masyarakat (Juklak 4/2026 hlm. 21; ditetapkan 15 September 2026) tetapi teksnya tidak menetapkan frekuensi.
    Sumber: korpus `perban-nomor-2-tahun-2023.json` hlm. 8; `perban-nomor-9-tahun-2025.json` hlm. 9;
    `juklak-nomor-7-tahun-2026.json`; `juklak-nomor-4-tahun-2026.json`; kunci baru `perban2_2023.*`, `juklak7_2026.*`. Label:
    resmi. **Dibantah oleh / koreksi:** KERANGKA §4 Bab 7 menyebut "gladi tahunan (Juklak 4/2026 gladi)"; frekuensi tahunan
    tidak tertulis di Juklak 4/2026. Reviu renkon 6 bulanan tidak boleh ditulis sebagai kewajiban ("direviu paling sedikit 6
    bulan sekali"); kutip "dapat dilakukan reviu".
11. **Kapasitas daerah yang memikul hilir:** 63 daerah belum menuntaskan SPM sub-urusan bencana, 87 belum mengaktifkan KRB, 79
    belum menyusun IKD 2024 (Direktur MPBG Kemendagri dalam rapat 4 September 2025). Sumber: Kemenko PMK, siaran 12 September
    2025, https://kemenkopmk.go.id/node/5841 (diakses 24 Oktober 2026); kunci baru `kemenkopmk.*`. Label: resmi. Cakupan
    nasional; jenis dan sebaran daerah (termasuk berapa di Jawa) tidak dirinci.

### Inferensi

- **[Inferensi tim]** Bukti yang ada menunjuk hambatan di dua ujung rantai; lapis platform tidak dinilai karena laporan
  evaluasi Pasal 29 tidak ditemukan, dan BNPB sendiri mencatat kelemahan di lapis itu (kelemahan 24: kompatibilitas data dan
  koneksi sistem peringatan dini antar-K/L). Di hulu, peringatan banjir berbasis dampak hanya menangkap sekitar satu dari
  lima kejadian banjir (19,68%, temuan BPK menurut ringkasan Badan Keahlian DPR). Di hilir, sarana fisik pendukung dan
  diseminasi di desa (Renas 1.1.2.a) dipimpin 11 K/L sektor bahaya tanpa BNPB, sementara Perban 2/2024 menaruh keputusan dan
  arahan tindakan pada Kepala BNPB dan kepala daerah dan BNPB memegang platform diseminasi (Renas 1.1.1.d). Yang berbeda
  pemiliknya adalah keputusan dan platform di satu sisi, dan sarana fisik diseminasi di daerah di sisi lain.
- **[Inferensi tim]** Ancaman 9 Renstra (perbedaan tafsir) punya padanan teknis yang dapat dibuktikan: Perban 2/2024 memakai
  empat tingkat warna (normal, waspada, siaga, awas; Pasal 20 ayat (4)), sementara tiap K/L penyedia menyampaikan data
  "sesuai peraturan perundang-undangan" masing-masing (Pasal 7 ayat (3)). Tanpa Perpres yang menyatukan, tingkat peringatan
  K/L dan tingkat BNPB dapat berbeda untuk kejadian yang sama. Penulis tidak boleh menyatakan perbedaan itu terjadi pada
  kejadian tertentu; data kejadiannya tidak ada di bahan.
- **[Inferensi tim]** Definisi operasional "berfungsi" yang dapat diaudit, disusun hanya dari instrumen berlaku: (a) sarana
  terpelihara (Perban 2/2024 Pasal 30 dan ancaman 10 Renstra); (b) pesan sampai warga (Juklak 7/2026: sosialisasi 2 kali
  setahun di kab/kota berisiko tinggi); (c) diuji, yang wajib: renkon diuji lewat latihan kesiapsiagaan termasuk geladi posko
  dan geladi lapang (Perban 2/2023 Pasal 19), RPKB Daerah diuji coba lewat Gladi Ruang setelah ditetapkan (Perban 9/2025
  Pasal 27), dan gladi menguji penerimaan peringatan oleh masyarakat (Juklak 4/2026). Yang fakultatif dan karena itu bukan
  tolok ukur audit: reviu renkon paling sedikit 6 bulan sekali ("dapat", Perban 2/2023 Pasal 21 ayat (2)). Frekuensi gladi
  tahunan adalah pilihan penyusun (asumsi-kebijakan) dan harus berlabel demikian di naskah.
- **[Inferensi tim]** Target hilir Renstra kecil terhadap skala Jawa: 56 kab/kota difasilitasi pada 2029 adalah angka
  nasional, sedangkan Jawa saja punya 119 kab/kota. Bab ini tidak dapat menyatakan berapa yang jatuh ke Jawa.
- **[Inferensi tim]** Lembaga pembuka untuk kartu temuan 7.2: Direktorat Peringatan Dini (Perban 2/2024; rancangan Perpres),
  BMKG (IBF, prakiraan), Kementerian PU (sistem peringatan dini per WS, PP 30/2024 Pasal 96), Kemendagri (SPM, kontributor
  Renas 1.1.2.a), BPBD.

### Celah

- LHP Kinerja BPK 2022 atas BMKG tidak dibuka; isi temuan BPK lain tentang BNPB/BPBD (IHPS II 2023, 2024, 2025 menurut riset A
  §7) belum dibaca. **Penyajian:** hanya angka yang tertulis di brief Badan Keahlian DPR, dengan atribusi ke brief itu.
  **Permintaan:** BPK atau Inspektorat Utama BNPB untuk salinan LHP.
- Laporan evaluasi sistem peringatan dini per 4 bulan (Perban 2/2024 Pasal 29) tidak ditemukan terbuka. **Permintaan:** Deputi
  Bidang Pencegahan.
- Baseline cakupan peringatan dini per provinsi dan kab/kota Jawa (Renas 1.c) tidak ada (KERANGKA §7 butir 33).
  **Permintaan:** Direktorat Peringatan Dini.
- Jumlah dan sebaran sirene, LEWS, FEWS yang berfungsi di Jawa, dan desa Jawa yang tercakup Renas 1.1.2.a, tidak ditemukan.
  **Penyajian:** angka nasional saja; tulis "per Jawa belum tersedia".
- Status Rancangan Perpres sistem peringatan dini (sejak Juli 2024) tidak dapat dipastikan; JDIH Setneg tidak dapat dicari
  (riset E14). **Penyajian:** "belum ditemukan terbit per 24 Oktober 2026".
- Tidak ada data kejadian di Jawa yang menunjukkan peringatan dini terbit tetapi tidak sampai ke warga (atau sebaliknya).
  Bab ini tidak mengklaim kegagalan per kejadian.

---

## P3. Komponen dan musim mana yang tidak punya program terbukti?

### Inti

Dari 30 sel komponen × musim × fase, hanya 3 sampai 5 yang punya program berbukti kuat atau sedang (bergantung pada
penempatan musim P16, pilihan penyusun), dan di semua varian hanya 1 di antaranya program dalam negeri: PAMSIMAS untuk air
baku dan air minum di musim kemarau, fase prabencana (bukti sedang, bukan terbukti kuat). Sel berbukti kuat (air tanah dan
penurunan muka tanah, prabencana; dua sel di musim hujan, empat bila P16 dipetakan ke dua musim) bersandar pada program
luar negeri Tokyo, Osaka, dan Bangkok yang padanan Indonesianya belum dievaluasi. Irigasi, waduk dan bendungan (termasuk keamanan dan
sedimentasi), serta seluruh 20 sel fase tanggap darurat dan pascabencana tidak punya program berbukti kuat atau sedang.

### Temuan bersumber

1. **Kompendium:** 25 program; berbukti kuat 2, keduanya luar negeri (P16 pengendalian pengambilan air tanah Tokyo, Osaka,
   Bangkok; P19 kesiapsiagaan siklon Bangladesh, yang terbukti adalah paketnya, bukan unsur tunggal); program dalam negeri
   terbaik berbukti sedang: PAMSIMAS (P13) dan InaTEWS hulu (P03). Sumber: `program-terbukti/kompendium_program.csv` kolom
   `kekuatan`, `kekuatan_catatan`; README §4 butir 1; kunci baru `program.kompendium.*`. Label: asumsi-kebijakan (rubrik
   kekuatan bukti paket; angka di tiap program berlabel sendiri).
2. **Program yang relevan bagi lima komponen air dan kekuatan buktinya (kolom `kekuatan` dan `posisi`):**

   | Program | Kekuatan | Posisi di kajian | Asal |
   | --- | --- | --- | --- |
   | P13 PAMSIMAS | sedang | Program dengan syarat (bukti sedang) | dalam negeri |
   | P04 Sekolah Lapang Iklim BMKG | lemah | Program berjalan, wajib evaluasi dampak | dalam negeri |
   | P10 Embung dan panen air hujan | belum-terbukti | Program berjalan, wajib evaluasi dampak | dalam negeri |
   | P11 Sumur resapan dan biopori | lemah | Program berjalan, wajib evaluasi dampak | dalam negeri |
   | P12 Citarum Harum | lemah | Program berjalan, wajib evaluasi dampak | dalam negeri |
   | P14 Sodetan dan bendungan kering Ciliwung | lemah | Program berjalan, wajib evaluasi dampak | dalam negeri |
   | P15 Polder dan pompa kota pesisir | belum-terbukti | Program berjalan, wajib evaluasi dampak | dalam negeri |
   | P16 Pengendalian air tanah Tokyo, Osaka, Bangkok | kuat | Program (bukti kuat); padanan Indonesia: zona bebas air tanah DKI dan pengendalian izin, status dikembangkan | luar negeri |
   | P18 Room for the River | sedang | Uji coba terukur | luar negeri |
   | P17 Delta Programme | lemah | Rujukan tata kelola | luar negeri |
   | P01 Destana | belum-terbukti | Program berjalan, wajib evaluasi dampak | dalam negeri |

   Sumber: `kompendium_program.csv`. Label: per baris kompendium.
3. **PAMSIMAS, bukti sedang; evaluasi independen didahulukan:** evaluasi independen untuk DFAT (Januari 2023, sampel 42
   desa) menilai data MIS terlalu optimistis; banyak sistem yang tercatat berfungsi penuh kekurangan air saat pemakaian puncak
   atau musim kemarau (PDF hlm. 40). Label: terverifikasi (evaluasi independen). Angka capaian dari laporan penyelesaian Bank
   Dunia (ICR00005882, 29 Juni 2023; dibuka langsung, SHA-1 sama dengan bab-02): sekitar 24,8 juta jiwa mendapat layanan air
   berkelanjutan, melampaui target 22,1 juta (hlm. cetak 10), di 35.553 desa (hlm. cetak 8 dan 10; "Project MIS 2022"), dan
   sekitar 91% sistem yang dibangun atau direhabilitasi berfungsi baik menurut "Data from the MIS" (hlm. cetak 11). Label:
   evaluasi diri Bank Dunia sebagai pembiaya, angka dari MIS program, bukan uji lapangan; kunci lama `bukti.p13.jiwa_terlayani`,
   `bukti.p13.berfungsi_persen`, `bukti.p13.desa` (bab-02, pustaka `bankdunia-2023-pamsimas`). Ringkasan RWSN tidak dipakai
   lagi sebagai sumber. Periode program 2008–2023, fase III berakhir, kelanjutan tidak diverifikasi. Sumber: `bukti_dampak.csv`
   B082, B083; https://documents1.worldbank.org/curated/en/099070523124528093/pdf/BOSIB0fe61a43c0c2081aa0f122dbc2be54.pdf
   (diakses 24 Oktober 2026); `kompendium.md` P13.
4. **Program musim hujan tanpa kinerja terukur:** untuk sodetan Ciliwung, bendungan kering Ciawi dan Sukamahi, Citarum
   Harum, dan polder pesisir, kinerja terukur pascaoperasi dari sumber resmi atau evaluasi tidak ditemukan. Satu-satunya
   bahan yang dapat masuk badan teks: kajian Polder Jati Pinggir (Sudjatmiko dkk. 2017) menemukan kapasitas saluran dan
   pompa kurang (label: terverifikasi, abstrak, lewat riset B). Sumber: `kompendium_program.csv` P12, P14, P15;
   `bukti_dampak.csv` B094; `riset/B-air-jawa.md` §9.
   - Pembanding sekunder (tidak masuk badan teks dan registri; hanya untuk celah): kapasitas sodetan 60 m³/detik dari debit
     rencana 508 m³/detik dan klaim pengurangan potensi banjir 62% di 6 kelurahan (B090–B093, [SEKUNDER] di riset B);
     reduksi debit puncak Ciawi 20,87% pada banjir Maret 2025 (B086, "BBWS via detik"); IKA Citarum 33,43 (2018, B072,
     narasi wartawan detikJabar tanpa sumber data) berdampingan dengan 33,34 (B074, Republika); tanggul Pekalongan 2019
     dilaporkan tenggelam pada 2022 (B094, pernyataan Bappenas, [SEKUNDER]). Label: sekunder. Kolom `label` B072–B093 di
     `bukti_dampak.csv` tertulis "terverifikasi" walau kolom `catatan` atau kutipan riset menandai [SEKUNDER] (lihat tabel
     Koreksi).
   - Kalimat yang boleh dipakai penulis: "kinerja terukur pascaoperasi tidak ditemukan".
5. **P16 sebagai satu-satunya bukti kuat bagi air tanah dan penurunan muka tanah:** Tokyo, pengambilan air tanah turun dari
   1.160.000 m³/hari (1964) ke 128.000 m³/hari (1975) setelah larangan sumur bertahap, dan laju penurunan tanah turun sejak 1972
   setelah maksimum 27 cm/tahun; Bangkok 120 mm/tahun (1981) ke 20 mm/tahun (2007–2010). Celah yang dicatat kompendium:
   cakupan air perpipaan rendah di Pantura, data subsiden dan zona konservasi CAT tidak terbuka, kewenangan izin tersebar.
   Sumber: `bukti_dampak.csv` B095–B101; kunci lama `bukti.p16.*` (bab-02). Label: terverifikasi.
6. **Hitungan sel (pemetaan penyusun, tabel di bawah):** 30 sel; 3 berbukti kuat atau sedang (1 dalam negeri sedang, 2 luar
   negeri kuat); 4 hanya lemah atau belum terbukti; 23 tanpa program, terdiri atas 20 sel tanggap darurat dan pascabencana dan 3
   sel prabencana musim kemarau (waduk dan bendungan, air tanah, penurunan muka tanah). Menurut musim, sel tanpa program: 13
   kemarau, 10 hujan. Angka ini peka terhadap penempatan musim P16 (lihat uji kepekaan di bawah): rentang sel berbukti kuat
   atau sedang 3–5, sel tanpa program 21–24. Sumber: olah dari `kompendium_program.csv` dengan pemetaan di bawah; kunci baru
   `air.sel_program.*`. Label: asumsi-kebijakan.

   **Pemetaan program ke sel (fase prabencana; sel tanggap darurat dan pascabencana kosong semua):**

   | Komponen | Kemarau | Hujan |
   | --- | --- | --- |
   | Air baku dan air minum | P13 PAMSIMAS (sedang) | P12 Citarum Harum (lemah) |
   | Irigasi | P04 SLI (lemah); P10 embung (belum terbukti) | P04 SLI (lemah) |
   | Waduk dan bendungan | tanpa program | P14 bendungan kering Ciliwung (lemah) |
   | Air tanah | tanpa program | P16 (kuat, luar negeri); P11 sumur resapan (lemah) |
   | Penurunan muka tanah dan pesisir utara | tanpa program | P16 (kuat, luar negeri); P15 polder (belum terbukti) |

   Aturan pemetaan: tiap program ditempatkan menurut kolom `bencana` (kekeringan ke kemarau; banjir dan rob ke hujan) dan
   `fase`; komponen ditentukan penyusun dari kolom `apa`. P04 dipetakan ke irigasi karena sasarannya petani sawah (tafsiran);
   P18 tidak dipetakan karena pengendalian banjir sungai bukan salah satu dari lima komponen; P01, P17, P19, P20, P23, P24
   lintas komponen dan tidak dipetakan. P16 (larangan dan pengendalian pengambilan air tanah, kegiatan sepanjang tahun)
   ditempatkan hanya di musim hujan karena kolom `bencana` berisi "rob;banjir"; penempatan ini pilihan penyusun
   (asumsi-kebijakan) dan wajib ditandai di Gambar 7.1.

   **Uji kepekaan pemetaan (olah dari tabel di atas):**

   | Varian | Kuat atau sedang | Lemah atau belum terbukti | Tanpa program | Tanpa program kemarau / hujan |
   | --- | --- | --- | --- | --- |
   | Dasar (P16 hanya hujan; P04 ke irigasi) | 3 (kuat 2) | 4 | 23 | 13 / 10 |
   | P16 di dua musim | 5 (kuat 4) | 4 | 21 | 11 / 10 |
   | P04 tidak dipetakan | 3 (kuat 2) | 3 | 24 | 13 / 11 |
   | P16 di dua musim dan P04 tidak dipetakan | 5 (kuat 4) | 3 | 22 | 11 / 11 |

   Sel yang berpindah bila P16 di dua musim adalah air tanah dan penurunan muka tanah, musim kemarau, prabencana; keduanya
   bersandar pada program luar negeri, jadi jumlah sel berbukti sedang dalam negeri tetap 1 di semua varian.
7. **Pengecualian yang tertulis di peraturan (bukan program, kategori "aksi wajib menurut peraturan", prinsip 12):** RTD
   bendungan disusun pembangun, ditetapkan pemilik, dikonsultasikan ke bupati/wali kota dan gubernur, dengan perangkat daerah
   urusan penanggulangan bencana sebagai contoh instansi yang diikutsertakan (PP 37/2010 Pasal 52–54 dan Penjelasan;
   `matriks_air.csv` A18, A19, A31); SPAM bersifat khusus untuk bencana dan kekeringan (PP 122/2015; `lembaga/README.md` §4.2);
   penetapan sistem peringatan dini pada setiap WS (PP 30/2024 Pasal 96). Label: resmi. Sel tanggap darurat waduk dan
   bendungan dan sel tanggap darurat air baku musim kemarau karena itu tidak kosong norma, hanya kosong bukti program.

### Inferensi

- **[Inferensi tim]** Kesenjangan bukti paling tajam ada di musim kemarau: hanya satu sel kemarau yang punya program dalam
  negeri dengan bukti sedang (PAMSIMAS; sel kemarau lain hanya terisi program luar negeri bila P16 dipetakan ke dua musim),
  dan evaluasi independennya justru menemukan sistem yang tercatat berfungsi kekurangan air saat
  kemarau. Bagi tesis kajian (gangguan air bersih dan pangan sebagai ukuran musim kemarau), ini berarti tidak ada program
  dalam negeri yang terukur menurunkan gangguan air bersih saat El Niño.
- **[Inferensi tim]** Kosongnya 20 sel tanggap darurat dan pascabencana mencerminkan isi kompendium, yang memang berfokus pada
  prabencana. Itu bukan bukti bahwa operasi darurat air (distribusi air, perbaikan darurat tanggul) tidak berjalan; artinya
  dampaknya belum pernah diukur dengan cara yang dapat dikutip. Penulis wajib menulis "belum ada bukti dampak yang ditemukan",
  bukan "tidak efektif".
- **[Inferensi tim]** Keamanan bendungan adalah sel yang paling berisiko tanpa bukti program: inventaris resmi BBWS
  Pemali-Juana mencatat instrumen keamanan rusak dalam jumlah besar (Bahan subbab 7.3), sementara kompendium tidak memuat
  satu pun program keamanan atau sedimentasi bendungan.
- **[Inferensi tim]** P16 berbukti kuat karena urutan intervensinya (pasokan pengganti, lalu larangan dan zona, lalu tarif)
  dan deret data resmi puluhan tahun. Padanan Indonesia berstatus "dikembangkan" dan belum dievaluasi, jadi naskah tidak boleh
  menulis bahwa pengendalian air tanah di Jakarta "terbukti".
- **[Inferensi tim]** Lembaga pembuka untuk kartu temuan 7.7 dan Gambar 7.1: Kementerian PU (PAMSIMAS, bendungan, polder),
  Kementan (embung, irigasi tersier), BMKG (SLI), BNPB Direktorat Mitigasi Bencana (agenda bukti, Bab 8.10).

### Celah

- Kompendium tidak memuat program kesiapsiagaan bendungan (RTD, gladi kegagalan bendungan), distribusi air darurat, atau
  perbaikan darurat tanggul; penelusuran lanjutan tidak dilakukan di bab ini. **Penyajian:** sel ditulis "tanpa program di
  kompendium" dan dibedakan dari sel yang berkewajiban norma (temuan 7).
- Evaluasi dampak asuransi pertanian (Renas 2.5.1.c, PJ Kementan) dan Katam tidak ada di kompendium; sel irigasi pascabencana
  kosong. **Permintaan:** Kementan.
- Kinerja terukur pascaoperasi program musim hujan tidak ditemukan; angka yang beredar hanya sekunder (P3 temuan 4).
  **Penyajian:** "kinerja terukur pascaoperasi tidak ditemukan". **Permintaan data:** BBWS Ciliwung-Cisadane (debit masuk
  dan keluar Bendungan Ciawi dan Sukamahi pada banjir Maret 2025; data operasi sodetan Ciliwung-KBT); Kementerian LH (deret
  resmi IKA Sungai Citarum 2018–2025); Bappenas dan BBWS Pemali-Juana (laporan kinerja tanggul Pekalongan sejak 2019).
- Kelanjutan PAMSIMAS setelah 2023 dan kondisi BP-SPAMS di Jawa tidak terverifikasi; policy brief Bappenas tentang
  keberlanjutan PAMSIMAS ditemukan di mesin pencari tetapi server menolak akses (403) sehingga tidak dikutip. **Permintaan:**
  Kementerian PU (Ditjen Cipta Karya).
- Pemetaan program ke sel adalah pilihan penyusun. Uji kepekaan (P3 temuan 6) menunjukkan jumlah sel berbukti kuat atau sedang
  tidak kokoh: 3 bila P16 hanya di musim hujan, 5 bila P16 di dua musim; sel tanpa program 21–24. Yang kokoh di semua varian
  hanya jumlah sel berbukti sedang dalam negeri (1, PAMSIMAS) dan nol sel kuat dalam negeri. **Penyajian:** tulis rentang
  "3–5 sel" atau sebut varian dasarnya sebagai pilihan penyusun.

---

## P4. Apa yang sudah berjalan dan tidak boleh dikorbankan?

### Inti

Lima instrumen sudah berdasar peraturan dan menjadi tumpuan bab lain: InaRISK/IRBI dan KRB 2022–2026 (dasar IKU RPJMN PP
08.04), Satu Data Bencana dan DIBI (Perban 1/2023; dasar tesis kajian), Dana Bersama PB (Perpres 75/2021, Perban 1/2026),
rencana kontingensi (Perban 2/2023), dan aset serta pengelola PAMSIMAS (satu-satunya program air dalam negeri berbukti
sedang). Ditambah jalur yang sudah tertulis: keanggotaan Kepala BNPB di Dewan SDA Nasional, platform dan pembinaan Pusdalops
daerah (Renas 1.2.1.c), dan SPM sub-urusan bencana dengan Juklak 4–7/2026. "Tidak boleh dikorbankan" berarti instrumennya
dipertahankan; itu tidak berarti dampaknya sudah terbukti.

### Temuan bersumber

1. **InaRISK/IRBI dan KRB:** penurunan nilai Indeks Risiko Bencana menjadi IKU RPJMN PP 08.04 (baseline 1,54 pada 2023,
   target 1,2 pada 2025 dan 2029) dan indikator Renas 4.c; KRB 2022–2026 menjadi penyebut resmi penduduk terpapar di bab lain.
   Sumber: `riset/E-dokumen-primer.md` E11b (RPJMN Lampiran III hlm. 913); `irbi/README.md`; kunci lama `rpjmn.iks_penurunan_irb_persen`.
   Label: resmi. **Keterbatasan (berdampingan):** IRBI 2025 berskala patah dan tidak dibandingkan dengan 2015–2024 (KERANGKA
   §7 butir 12); 87 daerah belum mengaktifkan KRB (P2 temuan 11).
2. **Satu Data Bencana (Perban 1/2023, ditetapkan 4 Januari 2023):** Walidata Bencana adalah unit BNPB yang mengumpulkan,
   memeriksa, mengelola, dan menyebarluaskan data dari produsen data; Data Bencana mencakup data prabencana (ancaman,
   kerentanan, kapasitas, keterpaparan, program PRB), data tanggap darurat, data pascabencana, dan data pembiayaan
   penanggulangan bencana termasuk biaya pencegahan dan kesiapsiagaan (Pasal 1 angka 5, Pasal 4–5, 7–8). Sumber: korpus
   `perban-nomor-1-tahun-2023.json` hlm. 2–6. Label: resmi. DIBI menjadi sumber tesis kajian (`tesis.air`).
3. **Dana Bersama PB:** Perpres 75/2021 (dikelola Menteri Keuangan; penyaluran prabencana, darurat, pascabencana, dan transfer
   risiko; penyaluran prabencana atas permohonan tertulis pemda dan/atau K/L kepada BNPB, Pasal 8 ayat (1)); Perban 1/2026
   (ditetapkan 10 Maret 2026) mengatur penelaahan, verifikasi, dan evaluasi penyaluran. Sumber: `riset/E-dokumen-primer.md`
   E11c; korpus `perban-nomor-1-tahun-2026.json`. Label: resmi. **Keterbatasan:** Perban 1/2026 Pasal 14 ayat (4) dan Pasal 16
   ayat (3) tidak mensyaratkan analisis manfaat-biaya (dicek mesin; `program-terbukti/README.md` §4 butir 6).
4. **Rencana kontingensi (Perban 2/2023):** cakupan kedaruratan disusun dari karakteristik ancaman, skenario kejadian, dan
   asumsi dampak (Pasal 7), boleh mempertimbangkan sejarah kejadian terburuk (lampiran hlm. 14), ditetapkan Kepala BNPB atau
   kepala daerah (Pasal 17), wajib diuji lewat latihan kesiapsiagaan termasuk geladi (Pasal 19), berlaku 3 tahun (Pasal 21
   ayat (1)), dan "dapat dilakukan reviu secara berkala paling sedikit 6 (enam) bulan sekali" (Pasal 21 ayat (2), norma
   fakultatif). Sumber: korpus `perban-nomor-2-tahun-2023.json` hlm. 4, 7–8, 14. Label: resmi. Kartu skenario Bab 5–6 disusun dalam
   format tiga blok Pasal 7 supaya dapat disalin ke renkon (KERANGKA §2 butir 9).
5. **PAMSIMAS:** satu-satunya program air dalam negeri di kompendium dengan bukti sedang (P3 temuan 3); posisi "Program dengan
   syarat (bukti sedang)", status "Sudah ada, perlu dikembangkan". Sistemnya dikelola kelompok warga (BP-SPAMS) dengan iuran.
   Sumber: `kompendium.md` P13. Label: terverifikasi untuk evaluasi independen DFAT; evaluasi diri Bank Dunia (angka MIS)
   untuk angka capaian; asumsi-kebijakan untuk posisi.
6. **Jalur kelembagaan yang sudah tertulis:** Kepala BNPB anggota Dewan SDA Nasional (Perpres 53/2022 Pasal 7; P1 temuan 9);
   BNPB kontributor Renas 2.4.4.a (P1 temuan 6); BNPB penanggung jawab pembinaan Pusdalops daerah, 395 ke 525 daerah 2024–2029
   (Renas 1.2.1.c hlm. 56; kunci baru `renas.aksi_121c.pusdalops.*`). Label: resmi.
7. **Instrumen daerah yang baru ditetapkan:** Juklak SPM sub-urusan bencana kab/kota 4/2026 (gladi), 5/2026 (peralatan
   perlindungan dan kesiapsiagaan), 6/2026 (pencarian, pertolongan, evakuasi), 7/2026 (KIE rawan bencana), ditetapkan 15
   September 2026; Perban 9/2025 (rencana penanggulangan kedaruratan daerah, 22 Desember 2025); Perban 7/2025 (Destana, tingkat
   utama, madya, pratama; 24 Oktober 2025). Destana dibina 2.234 desa/kelurahan (2024) dengan target 7.234 (2029) (kunci baru
   `renas.aksi_451a.desa.*`). Sumber: korpus `juklak-nomor-4` sampai `7-tahun-2026.json`, `perban-nomor-9-tahun-2025.json`,
   `perban-nomor-7-tahun-2025.json`; `bukti_dampak.csv` B001, B002, B007. Label: resmi. Destana berbukti "belum terbukti"
   (P01) meski berjalan lebih dari 10 tahun.

### Inferensi

- **[Inferensi tim]** Kelima instrumen KERANGKA adalah sarana yang dipakai kajian ini sendiri untuk mengukur risiko, membiayai,
  dan menyusun respons; mengorbankannya membuat rekomendasi Bab 8–10 kehilangan alat ukur dan jalur pelaksanaan. Itu alasan
  "tidak boleh dikorbankan", bukan bukti bahwa instrumen itu menurunkan korban.
- **[Inferensi tim]** Argumen tandingan yang wajib ditulis di Kotak 7.1: IRBI 2025 tidak sebanding dengan seri lama; Dana
  Bersama prabencana disalurkan tanpa syarat manfaat-biaya; cakupan renkon BPBD Jawa tidak diketahui; PAMSIMAS sudah berakhir
  sebagai proyek dan data fungsinya dinilai terlalu optimistis. Posisi kajian: pertahankan instrumennya, tambahkan ukuran
  hasilnya (bahasan agenda bukti di Bab 8.10, bukan di sini).
- **[Inferensi tim]** Juklak SPM 2026 baru berumur sekitar lima minggu pada batas data; belum ada data pelaksanaannya. Yang
  "sudah berjalan" darinya adalah normanya, bukan capaiannya.

### Celah

- Jumlah dan masa berlaku renkon banjir, longsor, dan kekeringan yang ditetapkan BPBD di Jawa tidak ditemukan. **Permintaan:**
  Direktorat Kesiapsiagaan, enam BPBD provinsi.
- Jumlah desa Destana dan tingkat ketangguhannya di Jawa tidak ada di bahan. **Permintaan:** Direktorat Kesiapsiagaan.
- Realisasi penyaluran Dana Bersama prabencana untuk kegiatan air di Jawa tidak ditemukan; rasio anggaran penanggulangan bencana
  terhadap APBD tidak ditemukan (KERANGKA §7 butir 31). **Permintaan:** BNPB (Biro Perencanaan), Kemenkeu.
- Kelanjutan PAMSIMAS dan inventaris BP-SPAMS di Jawa tidak terverifikasi (P3 Celah).

---

## Bahan subbab 7.3, 7.4, 7.5, 7.6 (konteks, bukan pertanyaan kunci)

### Inti

Keamanan bendungan punya data resmi hanya untuk BBWS Pemali-Juana, dan di sana instrumen keamanan banyak yang rusak; RTD
diwajibkan PP 37/2010 tetapi status RTD per bendungan tidak ditemukan. Pembiayaan punya celah yang dinyatakan Renas sendiri
(BTT dan DSP belum sinkron), DSP terbatas pada keadaan darurat, keadaan tertentu, dan risiko berdampak luas, dan pemeliharaan
sarana peringatan dini bergantung APBD. Kapasitas daerah ditulis dengan tiga angka yang berbeda alat ukur: 62% (RPJMN,
nasional, 2023), 67% (nilai awal Renstra), dan 38% (kelas kapasitas pada ringkasan KRB COVID-19 InaRISK, nasional); di Jawa,
114 dari 119 kab/kota berkelas kapasitas minimal sedang menurut ringkasan yang sama. Untuk tata ruang, BNPB sendiri mencatat
bahwa aspek penanggulangan bencana belum terintegrasi penuh dalam dokumen perencanaan pembangunan dan tata ruang (Renstra
hlm. 70), padahal dasar hukum penegakan tata ruang untuk pengurangan risiko dan masukan kawasan daya rusak air ke RTRW
sudah tertulis.

### Temuan bersumber

1. **Instrumen keamanan bendungan BBWS Pemali-Juana (2021, 18 bendungan):** piezometer rusak 87 dari 543; V-notch rusak 26 dari
   48; inklinometer rusak 13 dari 24; settlement rusak 21 dari 56; Kedung Ombo inklinometer rusak 11 dari 13. Sumber: berkas
   bukti bab-04 P3; kunci `airjawa.bendungan.pj.piezometer`, `.piezometer_rusak`, `.vnotch`, `.vnotch_rusak`, `.inklinometer`,
   `.inklinometer_rusak`, `.settlement`, `.settlement_rusak`, `airjawa.bendungan.kedungombo.inklinometer_rusak` (di
   `bab-04.angka.json`). Label: resmi. Bendungan lain di Jawa tidak punya data serupa yang terbuka.
2. **RTD dan BPBD:** RTD disusun pembangun dan ditetapkan pemilik bendungan (pemerintah, pemda, atau badan usaha),
   dikonsultasikan ke bupati/wali kota dan gubernur terdampak; BPBD diikutsertakan sebagai instansi teknis menurut Penjelasan
   (PP 37/2010 Pasal 52–54). Sumber: `matriks_air.csv` A18, A19, A31; `lembaga/README.md` §4.3. Label: resmi (A19 pemetaan
   penyusun).
3. **Bendungan baru:** 19 bendungan PSN di Jawa (Permenko Perekonomian 16/2025, masih berlaku setelah Permenko 4/2026), antara
   lain Ciawi, Sukamahi, Karian, Bener, Jragung, Semantok. Sumber: `riset/E-dokumen-primer.md` E8. Label: resmi.
4. **Pembiayaan:** Renas mencatat pemahaman dan pengelolaan dana penanganan darurat belum tersinkronisasi (BTT dan DSP) dan
   akuntabilitas BTT belum jelas (C02, Renas hlm. 26); DSP digunakan selama keadaan darurat bencana, keadaan tertentu, dan
   risiko berdampak luas yang ditetapkan Kepala BNPB (Perban 4/2020 Pasal 20 ayat (1), korpus hlm. 16); dana kontinjensi
   bencana APBN untuk kesiapsiagaan prabencana (PP 22/2008 Pasal 6 ayat (1); riset E11e); pendanaan operasional sistem
   peringatan dini dari APBN, APBD, dan sumber lain (Perban 2/2024 Pasal 30); ancaman 10 Renstra (komitmen APBD untuk
   pemeliharaan sarana peringatan dini). Label: resmi. Tanpa nominal (P5).
5. **Kapasitas daerah, tiga angka berdampingan:**

   | Ukuran | Nilai | Cakupan | Sumber | Kunci |
   | --- | --- | --- | --- | --- |
   | KP 08.04.01 RPJMN: daerah dengan kapasitas PB minimal sedang | 62% (2023); target 67% (2025), 90% (2029) | nasional | RPJMN Lampiran III hlm. 913 (riset E11b) | `rpjmn.kp_kapasitas_minimal_sedang.baseline_2023` (baru) |
   | IKS Renstra, nilai awal | 67% ke 90% | nasional | Renstra hlm. 84–85, 128 | `renstra.iks_kapasitas_minimal_sedang.awal` (lama) |
   | Kelas kapasitas pada ringkasan KRB COVID-19 InaRISK (KRB 2022–2026) | 38,0% minimal sedang (193 dari 508 kab/kota berkelas) | nasional | InaRISK `apiv4/kajian-summary/covid-19`, `nonalam-sosial/krb_covid19_kab.csv` kolom `kapasitas_kab` | `krb.nasional.kab_kapasitas_minimal_sedang_persen` (baru) |
   | Idem, Jawa | 114 dari 119 (95,8%) minimal sedang; rendah 5: Kulon Progo, Gunungkidul, Sleman, Kota Yogyakarta, Pamekasan; tinggi 3: Kebumen, Magelang, Klaten | Jawa | idem | `krb.jawa.*` (baru) |

   Label: resmi; persen KRB olah(resmi). Renstra memakai target 2025 RPJMN (67%) sebagai nilai awal; baseline RPJMN 62% (2023)
   (riset E11b). Angka 38% bertentangan dengan 62% dan 67% untuk konsep yang sama (daerah berkapasitas minimal sedang) karena
   alat ukurnya berbeda (IKD lawan kelas kapasitas KRB); ketiganya ditulis berdampingan sampai KD-3 diputus. **Asal kelas
   kapasitas:** kolom `kapasitas_kab` ditarik dari ringkasan KRB untuk bahaya COVID-19 (endpoint `kajian-summary/covid-19`),
   bukan dari ringkasan KRB banjir atau kekeringan. Apakah kelas kapasitas per kab/kota sama di ringkasan bahaya lain belum
   diperiksa: penarikan ulang endpoint banjir dan kekeringan pada 24 Oktober 2026 gagal (InaRISK tidak menjawab, batas waktu
   habis). Label: resmi untuk angka; kesetaraannya dengan kapasitas untuk bahaya air belum terverifikasi.
6. **Kepatuhan daerah:** 63 daerah belum SPM, 87 belum KRB, 79 belum IKD 2024 (P2 temuan 11). Label: resmi; nasional.
7. **Tata ruang (subbab 7.4):**
   - Pengakuan BNPB: isu RPJMN yang dikutip Renstra, "Aspek penanggulangan bencana belum terintegrasi secara penuh dalam
     dokumen perencanaan pembangunan dan tata ruang" (isu 6, Renstra hlm. 70). Sumber: korpus
     `perban-nomor-5-tahun-2025.json` hlm. 70 (dicek dengan pdftotext -layout). Label: resmi.
   - Dasar hukum di rezim kebencanaan: penyelenggaraan PB dalam situasi tidak terjadi bencana meliputi "pemaduan dalam
     perencanaan pembangunan", "persyaratan analisis risiko bencana", dan "penegakan rencana tata ruang" (UU 24/2007 Pasal 35
     huruf d, e, f, hlm. 18); penegakan rencana tata ruang mencakup pemberlakuan peraturan tata ruang, standar keselamatan,
     dan sanksi (Pasal 42 ayat (1), hlm. 20); mitigasi dilakukan antara lain melalui "pelaksanaan penataan tata ruang" (Pasal
     47 ayat (2) huruf a, hlm. 22). Sumber: `lembaga/mentah/teks/uu-24-2007.json.gz`. Label: resmi.
   - Dasar hukum di rezim SDA: kawasan daya rusak air (banjir, tanah longsor, ambles, dan lainnya) "menjadi masukan untuk
     penyusunan rencana tata ruang wilayah" (PP 30/2024 Pasal 97 ayat (5), hlm. 66). Sumber: `lembaga/mentah/teks/pp-30-2024.json.gz`.
     Label: resmi.
   - Pelaku: Kementerian ATR/BPN tercatat sebagai kontributor Renas 2.4.4.a (NSPK penurunan muka tanah; P1 temuan 6).
     Label: resmi.
   - Tidak dibaca: UU 26/2007 tentang Penataan Ruang dan turunannya, RTRW/RDTR provinsi dan kab/kota di Jawa, serta data
     integrasi KRB ke RTRW. Ketidakterpaduan tata ruang di Jawa karena itu hanya bertumpu pada pernyataan Renstra yang bersifat
     nasional.

### Inferensi

- **[Inferensi tim]** Instrumen yang rusak di 18 bendungan satu BBWS berarti kemampuan mendeteksi gejala kegagalan bendungan
  sebelum hujan ekstrem menurun pada bendungan itu. Penulis tidak boleh menggeneralisasi ke bendungan BBWS lain; datanya
  tidak ada.
- **[Inferensi tim, bersyarat]** Bila kelas kapasitas pada ringkasan KRB COVID-19 sama dengan kelas kapasitas untuk bahaya
  banjir dan kekeringan (belum diperiksa), maka di Jawa kelas kapasitas hampir seluruhnya sedang, dan persoalan Jawa lebih
  mungkin berada di mata rantai yang dinamai P1 dan P2 (sambungan informasi, hilir peringatan dini) daripada di kapasitas
  kelas rendah. Pengecualiannya DIY: empat dari lima kab/kota DIY berkelas rendah, termasuk Gunungkidul yang menjadi contoh
  kekeringan Bab 5. Syarat itu wajib ditulis bersama simpulannya; tanpa syarat, simpulan ini tidak boleh masuk naskah.
- **[Inferensi tim]** Celah pembiayaan yang relevan bagi air adalah pemeliharaan, bukan pembangunan: sarana peringatan dini dan
  instrumen keamanan bendungan sama-sama sudah terpasang tetapi terancam rusak atau tidak terpelihara (ancaman 10 Renstra;
  instrumen rusak BBWS Pemali-Juana).

### Celah

- Status RTD per bendungan di Jawa dan keterhubungannya dengan renkon BPBD tidak ditemukan (sama dengan Bab 6.6).
  **Permintaan:** BBWS, PJT I, PJT II, Balai Teknik Bendungan Kementerian PU.
- Kondisi instrumen keamanan bendungan di luar BBWS Pemali-Juana tidak ditemukan. **Permintaan:** BBWS di Jawa, PJT.
- Teks Permendagri 101/2018 (SPM sub-urusan bencana) belum dibaca (`lembaga/README.md` §6).
- Isi temuan BPK atas pembiayaan PB daerah belum dibaca dan tidak diklaim.
- Kelas kapasitas per kab/kota pada ringkasan KRB banjir dan kekeringan belum dibandingkan dengan ringkasan KRB COVID-19
  (InaRISK tidak menjawab saat ditarik ulang 24 Oktober 2026). **Penyajian:** sebut asalnya, "kelas kapasitas pada ringkasan
  KRB COVID-19 InaRISK", dan tulis simpulan Jawa sebagai inferensi bersyarat. **Permintaan:** Direktorat Pemetaan dan
  Evaluasi Risiko Bencana BNPB (kelas kapasitas per kab/kota per jenis bahaya, KRB 2022–2026).
- Integrasi KRB ke RTRW/RDTR provinsi dan kab/kota di Jawa, dan pemakaian kawasan daya rusak air (PP 30/2024 Pasal 97 ayat
  (5)) sebagai masukan RTRW, tidak diperiksa; UU 26/2007 dan turunannya belum dibaca. **Penyajian:** subbab 7.4 memuat
  pengakuan Renstra dan dasar hukumnya saja; tidak ada klaim tentang RTRW tertentu. **Permintaan:** Kementerian ATR/BPN
  (Ditjen Tata Ruang), Bappeda enam provinsi.

---

## Koreksi untuk KERANGKA dan paket data (dibawa ke pemiliknya; berkas ini tidak menyunting berkas lain)

| Tertulis | Temuan | Pemilik |
| --- | --- | --- |
| KERANGKA §2 butir 2 dan KD-5: BNPB "usul menjadi kontributor 2.4.4.a" | Renas hlm. 86: BNPB sudah kontributor 2.4.4.a; Kementerian ESDM dan Kementerian PU tidak tercantum | pemilik KERANGKA |
| `program-terbukti/renas_aksi_terkait.csv` baris 2.4.4.a kolom `kontributor` (3 K/L) | teks memuat 6 K/L: Kementerian Hukum, Kemenko PMK, Kemenko IPK, ATR/BPN, BNPB, KKP | `pipa-data` (bangun/program-terbukti.py) |
| KERANGKA §7 butir 32 dan §8: Perpres Dewan SDA Nasional belum dibuka | Perpres 53/2022 berlaku; Kepala BNPB anggota (Pasal 7 ayat (1) huruf d angka 14) | pemilik KERANGKA; bab-01, bab-02 |
| KERANGKA Bab 7: 63/87 daerah "sekunder, dibuka primer" | siaran Kemenko PMK 12 September 2025 dibuka; resmi | pemilik KERANGKA |
| KERANGKA Bab 7: "gladi tahunan (Juklak 4/2026)" | Juklak 4/2026 tidak menetapkan frekuensi; frekuensi wajib tertulis ada di Juklak 7/2026; reviu renkon 6 bulanan di Perban 2/2023 Pasal 21 ayat (2) fakultatif ("dapat") | pemilik KERANGKA |
| KERANGKA Bab 7: irigasi "tidak punya program di kompendium" | irigasi punya P04 (lemah) dan P10 (belum terbukti); yang benar "tanpa program berbukti kuat atau sedang" | pemilik KERANGKA |
| `program-terbukti/bukti_dampak.csv` B072–B077, B086–B093 kolom `label` "terverifikasi" | sumbernya narasi wartawan atau [SEKUNDER] di riset B (kolom `catatan` sendiri menyebutnya); label yang benar "sekunder" | `pipa-data` (bangun/program-terbukti.py) |
| `program-terbukti/bukti_dampak.csv` B078–B081 (PAMSIMAS) label "terverifikasi", penerbit Rural Water Supply Network | angkanya berasal dari ICR Bank Dunia ICR00005882 (evaluasi diri pembiaya, angka dari MIS program); ICR kini dibuka langsung (hlm. cetak 8, 10, 11); ganti sumber ke ICR dan beri catatan "evaluasi diri pembiaya, angka MIS" | `pipa-data` (bangun/program-terbukti.py) |
| `bab-01.angka.json` `renstra.iks_kapasitas_minimal_sedang.awal` catatan "bertentangan dengan 38%" | rumusan bab-07 kini selaras ("bertentangan karena alat ukur berbeda; ditulis berdampingan, KD-3"); tambahkan asal 38%: ringkasan KRB COVID-19 InaRISK | pemilik bab-01 |
| Lampiran Penyelarasan dokumen BNPB | Perban 2/2024 Pasal 12, 14, 19 menyebut dua unit yang diganti Perban 11/2025 | penyusun lampiran |

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Kartu temuan 7.1 Kewenangan | Bukti: C05, C06, C07, C13, C16, C17; jembatan umum ke rantai kedaruratan sudah tertulis (UU 17/2019 Pasal 35 ayat (5)–(6); PP 30/2024 Pasal 96 ayat (1) huruf d); RPSDA (Kepmen PU) sudah menyebut BPBD dan BNPB sebagai pelaksana kegiatan peringatan dini banjir dan tindak darurat; Permen PU 2/2024 (TKPSDA WS) tidak menyebut BNPB/BPBD. Dampak: norma yang menghubungkan sistem peringatan dini per WS dengan Perban 2/2024 dan platform BNPB tidak ditemukan; penyedia peringatan kekeringan hidrologis tidak ditunjuk. Lembaga pembuka: Kemenko PMK, Dewan SDA Nasional, Kementerian PU (Ditjen SDA), Kementerian ESDM, KLH | `lembaga/celah.csv`; UU 17/2019; PP 30/2024; riset E6, E13; Perpres 53/2022; Renas hlm. 86 | B5.6 | Rumusan KD-5 memakai "peran kontributor yang sudah tertulis". Hitungan 0 dari 31 baris matriks tidak dipakai di kartu; bila dipakai di teks, wajib "dari norma rezim SDA yang dibaca" dan berlabel asumsi-kebijakan cakupan |
| Kartu temuan 7.2 Peringatan dini | Bukti: 6% keterpenuhan; IBF 19,68% (lewat DPR); Renas 1.1.2.a (sarana fisik di daerah) tanpa BNPB, sedangkan BNPB PJ platform diseminasi (1.1.1.d); 16,3% desa rawan. Lembaga pembuka: Direktorat Peringatan Dini, BMKG, Kementerian PU, Kemendagri | P2 | B5.6 | Atribusi BPK wajib "menurut ringkasan Badan Keahlian DPR"; angka platform (Waspada dan Siaga, satuan kabupaten-hari) hanya berpil estimasi-model dan tidak disandingkan sebagai penguat angka BPK |
| Kartu temuan 7.3 Bendungan | Instrumen rusak BBWS Pemali-Juana; RTD wajib, status tidak diketahui; 19 bendungan PSN baru | bab-04 kunci `airjawa.bendungan.pj.*`; PP 37/2010; riset E8 | B5.6 | Pita "data instrumen hanya BBWS Pemali-Juana" |
| Kartu temuan 7.4 Air tanah dan tata ruang | Air tanah: dua dasar spasial; izin belum pasti; dua rezim penurunan muka tanah; CAT rusak tanpa penetapan. Tata ruang: Renstra hlm. 70 isu 6 (PB belum terintegrasi penuh dalam perencanaan pembangunan dan tata ruang); dasar hukum UU 24/2007 Pasal 35 huruf f, 42, 47 ayat (2) huruf a dan PP 30/2024 Pasal 97 ayat (5); ATR/BPN kontributor Renas 2.4.4.a | C06, C07, C16; Badan Geologi 2024; Bahan subbab temuan 7 | B5.6 | "Penurunan muka tanah", bukan "subsiden", kecuali nama aksi Renas verbatim. Pita "integrasi KRB ke RTRW Jawa belum diperiksa" |
| Kartu temuan 7.5 Pembiayaan | BTT dan DSP belum sinkron; DSP tiga keadaan; pemeliharaan sarana bergantung APBD; Dana Bersama tanpa syarat manfaat-biaya | C02; Perban 4/2020; Perban 1/2026; Renstra ancaman 10 | B5.6 | Tanpa nominal (P5) |
| Kartu temuan 7.6 Kapasitas | 62% / 67% / 38% berdampingan; Jawa 95,8% minimal sedang (kelas kapasitas pada ringkasan KRB COVID-19 InaRISK); 63/87/79 daerah | Bahan subbab 7.6 | B5.6 | Tiga angka satu tabel, alat ukur dan asal 38% disebut; KD-3; simpulan Jawa hanya bersyarat |
| Tabel 7.1 | Tumpang tindih dan celah kewenangan air: kolom komponen, norma A, norma B, pelaku, jenis (tumpang tindih/celah/dicabut/jembatan tertulis), bukti berpasal, lembaga pembuka. Baris peringatan dini memuat PP 30/2024 Pasal 96 ayat (1) huruf b dan d, UU 17/2019 Pasal 35 ayat (5)–(6), dan Perban 2/2024 Pasal 7 ayat (3) | `celah.csv` C05, C06, C07, C13, C16, C17; UU 17/2019; PP 30/2024; Renas 2.4.4.a; Perpres 53/2022 | B5.7 | Kolom jenis_bukti; sel pemetaan penyusun bertanda inferensi |
| Gambar 7.1 | Sel komponen × musim × fase menurut kategori bukti: kuat (luar negeri), sedang, lemah/belum terbukti, aksi wajib menurut peraturan, tanpa program | pemetaan P3 temuan 6 dari `kompendium_program.csv`; aksi wajib dari P3 temuan 7 | G16 (tabel peta panas) | Belum ada berkas data; usul `pipa-data` menulis `program-terbukti/sel_air.csv` dari tabel P3 supaya angka identik di DOCX, PPTX, web. Titik program luar negeri diberi isi berbeda; pil asumsi-kebijakan, termasuk penempatan P16 hanya di musim hujan; catatan kaki rentang 3–5 sel kuat atau sedang bila P16 di dua musim |
| Kotak 7.1 | Yang tidak boleh dikorbankan: lima instrumen KERANGKA ditambah Dewan SDA Nasional, Pusdalops, SPM 2026; tiap butir dengan dasar pasal dan satu argumen tandingan | P4 | B5.5 | Kalimat penutup: dipertahankan bukan berarti terbukti |
| Gambar 7.2 (usulan) | Rantai peringatan dini tujuh komponen Perban 2/2024 dengan angka per mata rantai (hulu 19,68%; platform; keputusan Kepala BNPB dan kepala daerah; hilir 8.642 desa terhadap 53.000) dan pemilik tiap mata rantai | P2 temuan 4–9 | G21 (aliran tanggung jawab berikon, tanpa lebar sebanding) | Hanya bila halaman cukup; angka hulu dan hilir berbeda penyebut, ditulis sebagai label, bukan rasio |

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/air/bukti/bab-07.angka.json` dengan bentuk entri `data/angka.json` (bentuk A:
`berkas` + `jalur` relatif ke `data/`; bentuk B: `nilai` + `pustaka`). `data/angka.json` tidak disunting. Kunci lama yang
dipakai ulang dan tidak didaftar lagi: `renas.indikator_1c.2025`, `.2029`, `renstra.ikp_peringatan_dini.2025`, `.2029`,
`renstra.iks_kapasitas_minimal_sedang.awal`, `.2029`, `rpjmn.iks_penurunan_irb_persen` (bab-01); `bukti.p13.*`,
`bukti.p16.*`, `perpres77.dewan_pengarah.kepala_daerah`, `renas.aksi_244a.target_2029` (bab-02);
`ncicd.fase_a.kewenangan_dki_km` (bab-03); `airjawa.bendungan.pj.*`, `airjawa.bendungan.kedungombo.inklinometer_rusak`
(bab-04); `tesis.air` (utama). Angka sekunder tidak masuk registri.

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| lembaga.air.baris_total | 31 baris | pustaka pantaubencana-2026-paket-lembaga | olah; asumsi-kebijakan cakupan | olah matriks_air.csv (norma rezim SDA yang dibaca) |
| lembaga.air.baris_tertulis | 23 baris | idem | olah; asumsi-kebijakan cakupan; baris bersumber resmi | olah |
| lembaga.air.baris_bnpb | 0 baris | idem | olah; asumsi-kebijakan cakupan | olah; akibat cakupan matriks, bukan temuan |
| lembaga.air.baris_bpbd | 1 baris | idem | olah; asumsi-kebijakan cakupan; pemetaan penyusun | olah (A19) |
| lembaga.celah.n | 17 temuan | idem | resmi; 14 disimpulkan penyusun | olah celah.csv |
| lembaga.celah.n_air | 6 temuan | idem | resmi; disimpulkan penyusun | C05, C06, C07, C13, C16, C17 |
| perpres53.anggota_pusat | 15 jabatan | pustaka ri-2022-perpres53 | resmi | Perpres 53/2022 Pasal 7 |
| renas.aksi_244a.kontributor_kl | 6 K/L | pustaka bnpb-2025-renas hlm. 86 | resmi | Renas PB 2025–2029 |
| renstra.pd_keterpenuhan_persen | 6% | program-terbukti/bukti_dampak.csv `[id=B017].nilai_angka` | resmi | Renstra hlm. 70 |
| rpjmn.kp_peringatan_dini.baseline | 6,00% | pustaka ri-2025-perpres12-rpjmn | resmi | RPJMN Lampiran III hlm. 913 |
| renas.aksi_112a.sarpras.2024 | 546 unit | pustaka bnpb-2025-renas hlm. 51 | resmi | Renas 1.1.2.a |
| renas.aksi_112a.sarpras.2029 | 1.495 unit | idem | resmi | idem |
| renas.aksi_112a.desa.2024 | 8.412 desa/kel | idem | resmi | idem |
| renas.aksi_112a.desa.2029 | 8.642 desa/kel | idem | resmi | idem |
| renstra.desa_rawan | 53.000 desa | program-terbukti/bukti_dampak.csv `[id=B003].nilai_angka` | resmi | Renstra hlm. 69 |
| renas.aksi_112a.desa_2029_porsi_desa_rawan_persen | 16,3% | pustaka bnpb-2025-renas | resmi; olah | 8.642 / 53.000 |
| renstra.sirene_terpasang.2025 | 23 paket | pustaka bnpb-2025-renstra hlm. 162 | resmi | Renstra |
| renstra.sirene_terpasang.2029 | 170 paket | idem | resmi | idem |
| renstra.pembinaan_respons_pd.2025 | 300 orang | idem | resmi | idem |
| renstra.pembinaan_respons_pd.2029 | 4.250 orang | idem | resmi | idem |
| renstra.fasilitasi_pemda_pd.2025 | 7 kab/kota | idem | resmi | idem |
| renstra.fasilitasi_pemda_pd.2029 | 56 kab/kota | idem | resmi | idem |
| renstra.diseminasi_sirene_memadai.2025 | 6,09% | pustaka bnpb-2025-renstra hlm. 161 | resmi | idem (hlm. 135 sama) |
| renstra.diseminasi_sirene_memadai.2029 | 6,29% | idem | resmi | idem |
| bpk.bmkg.ibf_banjir_terperingatkan_persen | 19,68% | pustaka dpr-2022-deteksi-dini | resmi; dikutip dari LHP BPK yang tidak dibuka | Badan Keahlian DPR 2022 |
| bpk.bmkg.akurasi_prakiraan_persen | 82,82% | idem | idem | idem |
| bpk.bmkg.akurasi_prakiraan_target_persen | 87% | idem | idem | idem |
| bpk.bmkg.kekurangan_radar | 40 unit | idem | idem | idem |
| bpk.bmkg.kekurangan_aws | 311 unit | idem | idem | idem |
| bpk.bmkg.kekurangan_arg | 6.536 unit | idem | idem | idem |
| platform.banjir.jawa.pod_waspada | 0,503 | pustaka pantaubencana-2026-validasi-banjir | estimasi-model | public/banjir/data/validasi.json (satuan kabupaten-hari) |
| platform.banjir.jawa.pod_siaga | 0,141 | idem | estimasi-model | idem |
| platform.longsor.jawa.pod_siaga | 0,181 | idem | estimasi-model | idem |
| perban2_2024.jenis_data_bahaya | 11 jenis | pustaka bnpb-2024-spdb | resmi | Pasal 7 ayat (2) |
| perban2_2024.evaluasi_per_bulan | 4 bulan | idem | resmi | Pasal 29 ayat (1) |
| perban2_2023.renkon_masa_berlaku_tahun | 3 tahun | pustaka bnpb-2023-renkon | resmi | Pasal 21 ayat (1) |
| perban2_2023.renkon_reviu_bulan | 6 bulan | idem | resmi; norma fakultatif ("dapat") | Pasal 21 ayat (2) |
| juklak7_2026.sosialisasi_risiko_tinggi_per_tahun | 2 kali | pustaka bnpb-2026-juklak-kie | resmi | hlm. 7 |
| juklak7_2026.sosialisasi_risiko_sedang_per_tahun | 1 kali | idem | resmi | hlm. 7 |
| program.kompendium.n | 25 program | pustaka pantaubencana-2026-program-terbukti | asumsi-kebijakan | olah kompendium |
| program.kompendium.kuat | 2 program | idem | asumsi-kebijakan | P16, P19 |
| program.kompendium.kuat_dalam_negeri | 0 program | idem | asumsi-kebijakan | olah |
| program.kompendium.sedang_dalam_negeri | 2 program | idem | asumsi-kebijakan | P03, P13 |
| air.sel_program.total | 30 sel | idem | asumsi-kebijakan | pemetaan P3 |
| air.sel_program.bukti_kuat_sedang | 3 sel | idem | asumsi-kebijakan | idem |
| air.sel_program.lemah_belum_terbukti | 4 sel | idem | asumsi-kebijakan | idem |
| air.sel_program.tanpa_program | 23 sel | idem | asumsi-kebijakan | idem |
| air.sel_program.tanpa_program_tanggap_pasca | 20 sel | idem | asumsi-kebijakan | idem |
| air.sel_program.sedang_dalam_negeri | 1 sel | idem | asumsi-kebijakan | PAMSIMAS |
| air.sel_program.kuat_luar_negeri | 2 sel | idem | asumsi-kebijakan | P16 |
| air.sel_program.bukti_kuat_sedang_p16_dua_musim | 5 sel | idem | asumsi-kebijakan | uji kepekaan P16 di dua musim |
| air.sel_program.tanpa_program_p16_dua_musim | 21 sel | idem | asumsi-kebijakan | idem |
| rpjmn.kp_kapasitas_minimal_sedang.baseline_2023 | 62% | pustaka ri-2025-perpres12-rpjmn | resmi | RPJMN Lampiran III hlm. 913 |
| krb.nasional.kab_kapasitas_minimal_sedang_persen | 38,0% | pustaka bnpb-2026-krb | resmi; olah; ringkasan KRB COVID-19 | 193 / 508 |
| krb.jawa.kab_kapasitas_minimal_sedang | 114 kab/kota | idem | resmi; olah; ringkasan KRB COVID-19 | dari 119 |
| krb.jawa.kab_kapasitas_rendah | 5 kab/kota | idem | resmi; olah; ringkasan KRB COVID-19 | DIY 4, Pamekasan |
| krb.jawa.kab_kapasitas_minimal_sedang_persen | 95,8% | idem | resmi; olah; ringkasan KRB COVID-19 | 114 / 119 |
| kemenkopmk.daerah_belum_spm_bencana | 63 daerah | pustaka kemenkopmk-2025-sinkronisasi-irb | resmi | Kemenko PMK 2025 |
| kemenkopmk.daerah_belum_krb | 87 daerah | idem | resmi | idem |
| kemenkopmk.daerah_belum_ikd_2024 | 79 daerah | idem | resmi | idem |
| renas.aksi_121c.pusdalops.2024 | 395 daerah | pustaka bnpb-2025-renas hlm. 56 | resmi | Renas 1.2.1.c |
| renas.aksi_121c.pusdalops.2029 | 525 daerah | idem | resmi | idem |
| renas.aksi_451a.desa.2024 | 2.234 desa/kel | program-terbukti/bukti_dampak.csv `[id=B001].nilai_angka` | resmi | Renas 4.5.1.a |
| renas.aksi_451a.desa.2029 | 7.234 desa/kel | program-terbukti/bukti_dampak.csv `[id=B002].nilai_angka` | resmi | idem |

---

## Pustaka

Entri CSL-JSON lengkap di `naskah/air/bukti/bab-07.pustaka.json` (49 entri; kunci `id` dipakai kolom `pustaka`
registri). Entri yang sudah ada di berkas pustaka bab-01 sampai bab-04 atau `riset/E-pustaka.json` disalin dengan catatan
halaman Bab 7. Ringkas:

| id | Sumber | Verifikasi |
| --- | --- | --- |
| bnpb-2025-renstra | Perban BNPB 5/2025, Renstra BNPB 2025–2029 | primer (korpus) |
| bnpb-2025-renas | Perban BNPB 1/2025, Renas PB 2025–2029 | primer (korpus) |
| bnpb-2024-spdb | Perban BNPB 2/2024, Sistem Peringatan Dini Bencana | primer (korpus) |
| bnpb-2023-renkon | Perban BNPB 2/2023, Penyusunan Rencana Kontingensi Bencana | primer (korpus) |
| bnpb-2023-satudata | Perban BNPB 1/2023, Satu Data Bencana | primer (korpus) |
| bnpb-2026-dana-bersama | Perban BNPB 1/2026, penyaluran Dana Bersama PB | primer (korpus) |
| bnpb-2020-dsp | Perban BNPB 4/2020, Penggunaan DSP | primer (korpus) |
| bnpb-2026-juklak-gladi | Juklak BNPB 4/2026, SPM gladi kesiapsiagaan | primer (korpus) |
| bnpb-2026-juklak-kie | Juklak BNPB 7/2026, SPM KIE rawan bencana | primer (korpus) |
| bnpb-2025-otk, bnpb-2025-otk-ubah | Perban BNPB 6/2025 dan 11/2025, OTK BNPB | primer (korpus) |
| bnpb-2025-destana | Perban BNPB 7/2025, Destana | primer |
| bnpb-2025-rpkb | Perban BNPB 9/2025, Penyusunan dan Uji Coba RPKB Daerah | primer (korpus) |
| bnpb-2025-progsun | Kepka BNPB 327/2025, Progsun 2026 | primer (korpus) |
| bnpb-2024-pengumuman-ranperpres-pd | BNPB, Pengumuman 1/KI-RANPERPRES/POKJAIDRIP-D2/7/2024 | primer (dibuka 24 Okt 2026) |
| dpr-2022-deteksi-dini | Badan Keahlian DPR RI (2022), Accountability Brief deteksi dini | primer terhadap DPR; ringkasan terhadap LHP BPK (dibuka 24 Okt 2026) |
| kemenkopmk-2025-sinkronisasi-irb | Kemenko PMK, siaran 12 September 2025 | primer (dibuka ulang 24 Okt 2026) |
| ri-2022-perpres53, ri-2024-keppres18 | Perpres 53/2022 Dewan SDA Nasional; Keppres 18/2024 keanggotaan | primer (Perpres dibuka ulang 24 Okt 2026) |
| kemenpu-2024-permen2 | Permen PU 2/2024, wadah koordinasi PSDA WS | primer (riset E) |
| ri-2025-perpres12-rpjmn | Perpres 12/2025, RPJMN 2025–2029 | primer (riset E) |
| ri-2021-perpres75, ri-2008-pp22 | Perpres 75/2021 Dana Bersama; PP 22/2008 pendanaan | primer (riset E) |
| ri-2007-uu24, ri-2019-uu17, ri-2014-uu23 | UU 24/2007; UU 17/2019; UU 23/2014 | primer |
| ri-2024-pp30, ri-2010-pp37, ri-2008-pp43, ri-2015-pp122 | PP 30/2024; PP 37/2010; PP 43/2008; PP 122/2015 | primer |
| ri-2019-perpres1, ri-2025-perpres77, ri-2025-inpres2 | Perpres 1/2019; Perpres 77/2025; Inpres 2/2025 | primer |
| pupr-2015-permen14 | Permen PUPR 14/PRT/M/2015 | primer |
| kemenko-ekon-2025-permenko16 | Permenko Perekonomian 16/2025 (PSN) | primer (riset E) |
| kemenpupr-pola-rpsda-jawa | Ditjen SDA, daftar Pola dan Rencana PSDA | primer (riset E) |
| badangeologi-2024-cat | Badan Geologi, 22 Januari 2024 | primer (riset E) |
| dsda-2025-ncicd | Dinas SDA DKI, progres NCICD Juli 2025 | primer |
| bbwspj-2021-inventaris-bendungan | BBWS Pemali-Juana (2021), inventaris bendungan | primer |
| bnpb-irbi, bnpb-dibi, bnpb-2026-krb | IRBI; DIBI; KRB 2022–2026 InaRISK | primer |
| bankdunia-2023-pamsimas, dfat-2023-pamsimas | ICR Bank Dunia PAMSIMAS III (ICR00005882, evaluasi diri pembiaya, angka MIS); evaluasi independen DFAT 2023 | primer (ICR dibuka 24 Okt 2026; menggantikan ringkasan RWSN) |
| yamamoto-1984-tokyo, tanaka-2013-bangkok | studi kasus Tokyo; Bangkok | primer |
| pantaubencana-2026-paket-lembaga | paket data lembaga (repo) | primer (paket data) |
| pantaubencana-2026-program-terbukti | paket data program-terbukti (repo) | primer (paket data) |
| pantaubencana-2026-validasi-banjir | uji balik status banjir dan longsor (repo) | primer (keluaran platform) |

Sumber berbeda untuk bab ini: 49 entri; tiga di antaranya paket data internal. Sumber yang ditemukan tetapi tidak dibuka
(policy brief Bappenas PAMSIMAS, LHP BPK 2022) tidak dikutip dan tidak masuk daftar.

---

## Tindak lanjut temuan pemeriksa (24 Oktober 2026)

Sebelas temuan dicek ke sumber dan semuanya diterima; tidak ada yang ditolak. Pemeriksaan yang dijalankan: pdftotext
-layout atas PDF asli Renstra hlm. 135 dan 161 (6,09% di kolom 2025, 6,14% di kolom 2026; kedua halaman sama) dan Renas
hlm. 50–51 (1.1.1.d PJ BNPB, target 1 platform/sistem); teks UU 17/2019 hlm. 24 (Pasal 35 ayat (5)–(6)), PP 30/2024 hlm.
65–66 (Pasal 96 ayat (1) huruf b dan d, ayat (2) huruf b; Pasal 97 ayat (5)), UU 24/2007 hlm. 18, 20, 22, Perban 2/2023 hlm.
8 (Pasal 19, Pasal 21 ayat (2) "dapat"), Perban 9/2025 hlm. 9 (Pasal 27); riset E6 (RPSDA Ciliwung-Cisadane memuat BNPB);
`krb_covid19_kab.csv` (nasional 190 sedang, 3 tinggi, 315 rendah, 6 kosong; Jawa 111, 3, 5); ICR Bank Dunia PAMSIMAS III
dibuka ulang (SHA-1 791e693c05fc56a10228430b63bb85b36f3058ed; 24,8 juta, 22,1 juta, 35.553 desa, 91% "Data from the MIS"
di PDF hlm. 19, 21, 22). Satu ketelitian atas uraian temuan 5: PJ 1.1.1.b adalah BNPB bersama 9 K/L (10 instansi), bukan
BNPB bersama 10 K/L; berkas ini menulis daftar namanya tanpa angka. Kelas kapasitas per bahaya banjir dan kekeringan tetap
belum dapat dibandingkan: percobaan tarik ulang InaRISK 24 Oktober 2026 pagi membalas 404 untuk semua endpoint
`kajian-summary`, termasuk COVID-19 yang terjawab saat paket dibangun; simpulan Jawa tetap bersyarat.
