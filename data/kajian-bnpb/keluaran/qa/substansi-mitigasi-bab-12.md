# QA lapis (b) penyunting substansi: kajian mitigasi Bab 12

Berkas: `naskah/mitigasi/bab-12.md`. Pembanding: `naskah/mitigasi/bukti/bab-12.md`, `bab-12.angka.json`,
`bab-12.pustaka.json`, `data/angka.json`, berkas bukti bab lain (registri gabungan), KERANGKA §1.1 M08, §2 dan §5 Bab 12,
register rekomendasi di `bab-13.md`, naskah air Bab 8 dan Bab 9 (kewenangan SDA). Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- 106 kunci token unik dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/mitigasi/bukti/bab-*.angka.json` (bab-12 menang) dan pustaka gabungan: semua kunci ada, nilai cocok dengan berkas
  bukti, label sah. `baca()` atas bab utuh dengan `status: final` lulus sebelum dan sesudah suntingan; 51 kunci pustaka
  primer atau olah, tidak ada sekunder.
- Turunan dicek ulang: 0,68/0,22 = 3,1; 0,79/0,22 = 3,6; 429/1.342 = 32,0%; 2018 + 2025 = 55% dari jumlah 2015–2025;
  Lombok/Sulteng 1,96–1,98; Kemenko PMK Lombok/stimulan tinggi 1,60; 76 + 53 = 129; 35 − 26 = 9 lembaga.
- `qa/slop.py --final`: LOLOS, skor 1 (S-11 "Luar Biasa" adalah nama status KLB, positif palsu; S-18 rendah). Em dash
  dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan butir 2 | Target dan lokus "hanya dapat diubah lewat jalur berkala" ditulis sebagai fakta; bukti P2 temuan 1 dan Inferensi (a): tafsiran tim, §4.6 tidak menyebut target maupun lokus | Diberi "Menurut tafsiran kajian atas Renas PB §4.6"; kalimat dipecah |
| 2 | Ringkasan r-a05 | Rangkuman menambahkan "muat rekomendasi ke evaluasi tahunan" yang tidak ada di blok `rek` r-a05 (bab-13: surat rakor peninjauan) | Ditulis rakor kepada Kemenko PMK, disertai penugasan pemuatan per jalur |
| 3 | Ringkasan r-m17 | "Usulan baru", padahal register `status: dikembangkan` dan R3P sudah diatur Perban 5/2017 | "Sudah ada, perlu dikembangkan" |
| 4 | 12.1 paragraf keselamatan industri | Meta: "selnya ditulis tidak tercatat" untuk dua kementerian yang tidak punya baris di tabel | Ditulis sebagai fakta: belum dimuat paket, tidak tampil di Tabel 12.1 meski mandat tertulisnya ada |
| 5 | 12.2 kalimat pembuka | "Lima peran ... diusulkan ditetapkan", padahal baris kelima "tanpa instrumen baru, sel kosong beralasan" | Empat diusulkan ditetapkan, satu sel kosong beralasan |
| 6 | 12.2 paragraf kewenangan | "Dua dari lima" di luar kewenangan BNPB; penunjukan penyedia peringatan dini per WS adalah pengaturan pengelola SDA (PP 30/2024 Pasal 96 ayat (1) huruf b; UU 17/2019 Pasal 35 ayat (2); naskah air Bab 8–9) | "Tiga dari lima"; kalimat kewenangan SDA ditambah dengan kutipan `ri-2024-pp30`, `ri-2019-uu17`; sumber Tabel 12.2 ditambah UU 17/2019 |
| 7 | 12.3 paragraf forum | "Empat forum" tetapi "forum kedua" tidak pernah disebut | Rakor antar-K/L keadaan tertentu dinamai forum kedua; kalimat Dana Bersama dipindah ke simpul Kemenko PMK |
| 8 | 12.3 akhir paragraf; 12.4 paragraf tafsiran | Meta ("bab ini tidak menyatakan"; "tafsiran ini milik tim, bukan isi teks") | Dirumuskan ulang sebagai pernyataan keadaan bukti |
| 9 | Tabel 12.3 baris KD-3 | Jalur "R; B" bertentangan dengan register (r-a05, KD-3 bab-13): alat ukur diubah lewat Kepka Manual IKU, angka target lewat Renstra | Kolom perubahan dan jalur dibetulkan; sumber tabel ditambah Kepka BNPB 318/2025 |
| 10 | 12.4 paragraf hitungan baris | Hitungan jalur tumpang tindih (6 + 1 + 3 + 3 > 11) tanpa keterangan; "keputusan KD-4", padahal KD-4 adalah rekomendasi 100 hari (bab-13) | Tumpang tindih dijelaskan; KD-3 berkala hanya bila dimuat ke Renas; kata "keputusan" dibuang |
| 11 | 12.5 paragraf profil | "DIBI memakai rumus yang sama": bukti P3 temuan 5 menunjukkan besaran tinggi ditambah komponen rumah terendam | Dirumuskan tepat |
| 12 | Koreksi Sulteng/Lombok | Meta: "Rancangan kajian ini memakai ..." merujuk draf internal; PEDOMAN §B: koreksi premis | Ditulis sebagai premis: korban terbanyak tidak otomatis kebutuhan rumah terbesar |
| 13 | 12.5 lantai Aceh 2004 | Angka PARB tanpa kutipan di kalimatnya | Ditambah `kemenkeu-bkf-2018-parb` |
| 14 | 12.5 pembanding PARB | "Sekitar sepersepuluh": Rp2,64–3,38 T / Rp22,8 T = 12–15% (bukti Inferensi P3 keliru membulatkan) | "Seperdelapan sampai seperenam" |
| 15 | 12.5 DSP | Meta "kedua rentang ditulis berdampingan karena ..." | Ditulis sebagai keadaan telaah |
| 16 | 12.5 Perban 1/2026 | "KD-4 juga keputusan pembiayaan" (inferensi diangkat jadi label keputusan) | Catatan metode (KD-4, r-m01) ikut menentukan prioritas Dana Bersama |
| 17 | 12.5 dana desa | "padahal" menyiratkan pertentangan yang tidak ada (Renas: belum optimal; Permendes menambah fokus) | "sejalan dengan catatan Renas"; kata kosong "optimal" dibuang |
| 18 | Tabel 12.4 catatan | Meta internal ("menurut P7", "KERANGKA memutus") | Diganti alasan substantif status Usulan baru (KERANGKA §1.1 M08) |
| 19 | Tabel 12.4 baris penyelarasan Renstra | "Alat ukur kapasitas" lewat Perpres 80/2025, padahal alat ukur lewat Kepka | "Target peringatan dini dan kapasitas" |
| 20 | 12.7 paragraf | "keputusan 14 hari yang belum ber-ID di register" (catatan kerja) | Penugasan ditulis menyertai r-a05 dalam empat belas hari pertama |
| 21 | Tabel 12.5 hari ke-0 | "KD-1 pilihan (a)" tidak ada di bab-13 (KD-1: "Bila ditetapkan dalam November 2026") | Disamakan |
| 22 | Tabel 12.6 baris IRB | 1,54 tampil tanpa satuan, terbaca nilai IRB; registri: persentase penurunan | "penurunan 1,54%" |
| 23 | Tabel 12.6 baris kapasitas | Kelas KRB 38% (asumsi-kebijakan, turunan) di baris berpil resmi | Diberi keterangan "olahan penyusun, asumsi kebijakan" |

## Diperiksa dan tidak diubah

- Lantai: lapisan ekstrem tidak lebih ringan dari 2018 (tahun) dan Lombok 2018 (kejadian tunggal 2015–2025); Padang 2009 dan
  Aceh 2004 untuk 30 tahun. Profil stimulan selalu berlabel Asumsi kebijakan dan disandingkan kerugian resmi (Sulteng,
  Lombok, Cianjur, Yogyakarta, Aceh).
- Angka bertentangan berdampingan: Yogyakarta 2006 PARB lawan Bappenas; CKAN Sulteng Rp44,16 T lawan BNPB Rp13,82 T; DSP
  Perban 4/2020 lawan PP 22/2008; 127/74 KERANGKA lawan 129/76 registri (naskah memakai registri, sesuai bukti).
- "Terbukti": satu-satunya pemakaian menyatakan tidak ada program pembiayaan yang terbukti; CCRIF/ARC "dengan syarat (bukti
  sedang)", FEMA rujukan tata kelola tanpa rasio 6:1, Lombok "pelajaran, bukan teladan", Delta Programme bukti lemah.
- Kewenangan: KLB dan wabah pada kepala daerah dan Menkes (UU 17/2023 Pasal 353, 368); status darurat pada Presiden atau
  kepala daerah (UU 24/2007 Pasal 51); Perpres status ditetapkan Presiden, BNPB menginisiasi; BNPB bukan regulator
  keselamatan industri (PP 11/1979, UU 3/2014, UU 1/1970); keadaan tertentu lewat rakor Kemenko PMK.
- Pertanyaan kunci 1–5 KERANGKA terjawab (12.1–12.2; 12.4; 12.5; 12.6; 12.9). Komponen Tabel 12.1–12.6 dan Gambar 12.1–12.4
  ada di naskah. ID register yang dirujuk ada semua di `bab-13.md`.

## Sisa untuk orkestrator (di luar berkas ini)

1. Direktori `gambar/mitigasi/` belum ada: `bab12-forum-jalur-adopsi.png`, `bab12-profil-kerugian.png`,
   `bab12-lapisan-pembiayaan.png`, `bab12-pelaporan-tiga-lapis.png` belum dibuat.
2. `bab-13.md` r-m03 berstatus `dikembangkan`, sedangkan KERANGKA §1.1 M08 dan Bab 12 memutus "Usulan baru"; pemilik
   register menyamakan.
3. Penugasan pemuatan rekomendasi ke evaluasi tahunan Renas 2026 per jalur (keputusan 14 hari butir (7) KERANGKA §6) belum
   punya ID atau baris di `tbl:keputusan-14-hari` bab-13; Bab 12 kini menempelkannya pada r-a05.
4. Lampiran I (tabel pemilik per baris register) dan lampiran lembaga (Kementerian PKP, Bappenas) dirujuk naskah, tetapi berkas
   lampiran Kajian 2 belum ada di `naskah/mitigasi/`.
5. `bab-12.angka.json` belum digabung ke `data/angka.json`; build final memerlukan registri gabungan seperti yang dipakai di
   pemeriksaan ini. Inferensi P3 berkas bukti masih menulis "sepersepuluh" (seharusnya 12–15%).
6. Kemenperin dan Kemnaker belum dimuat `lembaga/peran.csv` (KERANGKA §1.1 K13); KERANGKA §5 Bab 12 masih menulis 127/74 dan
   Sulteng 2018 sebagai analog ekstrem (koreksi bukti, pemilik KERANGKA).
