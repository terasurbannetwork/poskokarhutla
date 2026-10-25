# QA lapis (b) penyunting substansi: kajian air Bab 5

Berkas: `naskah/air/bab-05.md`. Pembanding: `naskah/air/bukti/bab-05.md`, `bab-05.angka.json`, `data/angka.json`,
`bab-01` sampai `bab-04.angka.json`, `data/program-terbukti/kompendium_program.csv`, KERANGKA §2 (butir 2, 5, 9, 12)
dan §4 Bab 5, register rekomendasi di `naskah/air/bab-10.md`, teks UU 17/2019 di `data/lembaga/mentah/teks`.
Diperiksa 24 Oktober 2026.

## Pemeriksaan mekanis

- 149 pasangan token (kunci dan opsi) disuntik lewat `bangun/kontrak/naskah.py` dengan registri gabungan
  `data/angka.json` + `naskah/air/bukti/bab-*.angka.json`: semua kunci ada, nilai cocok dengan berkas bukti, label sah
  (korelasi Spearman dan daftar perhatian berlabel asumsi-kebijakan, sisanya resmi atau terverifikasi). Tidak ada angka
  model di badan teks.
- `baca()` atas bab utuh GAGAL di satu titik: `kemungkinan: tidak dinilai: ...` pada Kartu kekeringan (varian a)
  ditolak validator, yang hanya menerima kelas 1 sampai 5 atau "periode ulang". Dengan nilai itu diganti sementara,
  `baca()` lulus. Lihat sisa butir 1.
- Aritmetika dicek: 13 + 26 + 9 + 5 = 53, dengan 48 memenuhi (d); 49.498 / 71.110 = 69,6%; 100.000 × 15 l = 1.500 m³;
  meninggal karhutla 2015–2026 = 12 + 3 + 9 + 1 + 1 + 6 = 32; Probolinggo 5 dari 6 meninggal 2026.
- `qa/slop.py --final`: LOLOS, skor 0 (sebelum suntingan GAGAL S-28, lima paragraf simetris di subbab Siapa
  Mengerjakan Apa). Em dash dan titik tengah: nol.
- Hanya 9 pasangan token yang dipakai ada di `data/angka.json`; sisanya baru ada di berkas bukti.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Subbab Pengelolaan Air, paragraf PP 122/2015 | Embung dan panen air hujan "berposisi belum terbukti" mencampur kolom `kekuatan` (belum-terbukti) dan `posisi` (program berjalan, wajib evaluasi dampak); SLI hanya ditulis kekuatannya | Kekuatan dan posisi ditulis terpisah sesuai kompendium P10 dan P04; PAMSIMAS ditambah "berakhir 2023" (kolom periode) |
| 2 | Kartu kekeringan, kepekaan | Nilai digeser varian 2027 memuat 1.963.378 jiwa terdampak (2019), di bawah lantai 4.924.057 (2018), tanpa penegasan lantai (KERANGKA §2 butir 9) | Jiwa terdampak tetap berlantai 4.924.057; angka 2019 ditulis berdampingan |
| 3 | Subbab Karhutla, paragraf korban | Sebab kematian 2015 dikutip ke [@bnpb-dibi], padahal sumbernya README paket skenario | Angka tetap ke DIBI; sebab ditulis sebagai catatan paket, sumber per kejadian belum dibuka |
| 4 | Subbab Kemarau 2026, paragraf ENSO | Meta-komentar "sehingga tiap angka ditulis bersama nama indeks ..." | Dipotong; perbedaan periode dan metode tetap |
| 5 | Subbab Kemarau 2026, paragraf El Niño kuat | "Prediksi BMKG yang dibuka" (jejak proses) | "Siaran pers BMKG 10 Juni 2026" |
| 6 | Subbab Riwayat, kotak catatan | Mengulang isi paragraf sebelumnya dan catatan Gambar kab/kota per tahun tanpa angka atau keputusan baru | Dihapus |
| 7 | Subbab Sebaran, paragraf varian | Rujukan status paket ("belum masuk paket data turunan") | "Kedua varian itu hitungan penyusun" |
| 8 | Paragraf pembuka bab | "tidak mencatat korban jiwa ..., dengan 0 meninggal" berulang | Satu kalimat: DIBI mencatat 0 meninggal |
| 9 | Subbab Dampak, paragraf padi | Meta penutup "kedua tahun ditulis berdampingan" | Dipotong |
| 10 | Subbab Karhutla dan TPA, open dumping | Penilaian penyusun ditulis sebagai fakta | "Kajian ini memakai angka itu sebagai ukuran kerentanan" |
| 11 | Subbab Gunungkidul | "Jiwa terdampak 2019 saja" (lisan) | "mencapai" |
| 12 | Subbab Pengelolaan Air, paragraf peringatan dini | Kalimat Juklak 7/2026 (materi KIE dalam SPM) tanpa angka atau keputusan; ikut membuat lima paragraf simetris | Dihapus |

## Diperiksa dan tidak diubah

- Lantai skenario: kartu kekeringan 76 kab/kota (2019), 4.924.057 jiwa (2018), 71.110 ha (2023); angka 2026 (55;
  1.300.190) ditulis di bawah lantai dan tidak dipakai. Kartu karhutla: lantai tahun 12 meninggal (2015); kejadian
  tunggal Magetan 7 berdampingan dengan Probolinggo 5 meninggal dan 4 hilang (sementara). Kepekaan karhutla memakai luas
  2015 dan 2019 sebagai tuas, sesuai KERANGKA §2 butir 10.
- Angka model: keluaran mesin neraca dan padi tidak tampil; paragraf padi 2015 menyandingkan BPS (Jawa Tengah naik 17,14%,
  Jawa Timur naik 6,11%) dan menyebut model hanya di Lampiran I. Peluang El Niño 98% dan 62% tidak dipakai sebagai kelas
  kemungkinan.
- Angka bertentangan berdampingan: korelasi jumlah kab (IOD 0,55 lawan ONI 0,32) bersama jiwa terdampak (0,66 dan
  0,67); IRBI lawan DIBI di Gunungkidul (Tabel banding lima kab/kota); indeks ENSO BMKG ASO 3,08 dan 3,05 lawan JAS 2,63
  lawan ONI 2,16; padi 2023 lawan 2024. Berita Metro TV tentang karhutla Bromo (4 meninggal, 15 Oktober) yang berbeda
  dengan baris DIBI Probolinggo tidak dimasukkan karena KERANGKA §2 butir 5 melarang angka sekunder di naskah final;
  naskah menyatakan sebab dan kronologi belum diverifikasi.
- "Terbukti": tidak ada program yang disebut terbukti; PAMSIMAS berbukti sedang, embung belum terbukti, SLI lemah.
- Kewenangan: status darurat Perpres 17/2018 Pasal 2 ayat (2); keadaan tertentu Perpres 46/2026 Pasal 3 dengan pedoman
  Perban BNPB 5/2018 yang masih berlaku; DSP Perban BNPB 4/2020 Pasal 2, 4, 14; alokasi air darurat UU 17/2019 Pasal 31
  menurut kewenangan WS, prioritas Pasal 8 ayat (3) jo. UU 6/2023; SPAM bersifat khusus PP 122/2015 Pasal 38 sampai 40.
  BNPB tidak ditulis sebagai pengatur air. UU 17/2019 Pasal 35 (daya rusak air) tidak dipakai: penjelasan ayat (3) di
  teks yang tersimpan tidak menyebut kekeringan (huruf e terpotong OCR), sehingga dasar Pasal 31 dan Pasal 8 lebih tepat.
- Pertanyaan kunci terjawab: (1) 53 kab/kota, 48 lewat syarat (d), empat dari sepuluh terdampak terbanyak di luar
  daftar; Gunungkidul IRBI 5 lawan DIBI 5 dari 11 tahun dan 0 ha bahaya tinggi KRB; (2) 2015: 3, 2019: 76, 2023: 43,
  2026: 55 kab/kota, dengan catatan intensitas pelaporan; (3) Tabel siapa mengerjakan apa enam fungsi; (4) kartu dengan
  lantai per metrik dan ukuran tanpa korban jiwa (jiwa dan kab terdampak, air 15 l, padi BPS, luas karhutla).
- Komponen KERANGKA hadir: Gambar ONI, koroplet IRBI, peta tahun DIBI, batang kab/kota per tahun, kotak temuan
  Gunungkidul (Kotak 5.1), Tabel daftar perhatian, Tabel siapa mengerjakan apa, Kartu kekeringan dan karhutla, rujukan
  Kartu 8.3 (TPA) dan 7.5 (asap). Tambahan: tabel banding IRBI dan DIBI, batang karhutla per provinsi, kotak koreksi
  paparan.
- Rekomendasi R-A03, R-A09, R-A18, R-A22 cocok dengan unit, K/L, dan waktu di `bab-10.md`.

## Sisa untuk orkestrator (di luar berkas ini)

1. Validator `bangun/kontrak/naskah.py` (baris 829 sampai 831) menolak `kemungkinan: tidak dinilai: <alasan>` untuk
   kartu varian a, padahal KERANGKA §4 Kartu 5.1 ("pita peluang tidak dinilai"), D18, dan PEDOMAN §B5.11 butir 3
   ("Jenis tanpa dasar peluang ditulis 'tidak dinilai'") memintanya. Naskah tidak diubah; validator dan NASKAH-SPEK §11.4
   perlu menerima "tidak dinilai:" untuk varian a. Sampai itu, bab gagal dibangun.
2. Gabungkan `naskah/air/bukti/bab-*.angka.json` dan `bab-*.pustaka.json` ke registri sebelum bangun DOCX.
3. Kartu karhutla menurut KERANGKA mengambil lantai dari `skenario-hidromet/lantai_jenis.csv`; berkas itu belum ada dan
   angka lantai diketik dari DIBI lewat kunci bukti. Kartu menyatakannya di blok pemulihan.
4. Pustaka `bnpb-2026-juklak7` tidak lagi dikutip di Bab 5.
5. Varian daftar perhatian tanpa (d) dan dengan (c) terdampak belum dibangun `bangun/turunan.py` (pemilik `pipa-data`).
