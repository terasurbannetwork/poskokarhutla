# Brief penulisan ulang kajian dengan IMRaD (13 Nov 2026)

Pemilik membaca kajian lama (folder `naskah/`, 213 halaman) dan tidak menangkap kesimpulannya. Katanya
susunannya "abstrak banget", "pusing", dan banyak istilah ciptaan sendiri. Naskah baru ditulis di folder
`naskah-imrad/` dengan kerangka IMRaD dan bahasa biasa. Angka dan temuan tidak berubah; yang berubah
susunan dan bahasanya. Naskah lama tetap menjadi sumber fakta.

## Pembaca

Pejabat BNPB (Kepala, Deputi, Pusdatinkom, Pusdalops) dan staf BPBD. Mereka paham bencana dan data,
tetapi bukan peneliti statistik. Mereka harus bisa menangkap pesan tiap bab dari paragraf pertamanya.

## Susunan

| Berkas | Isi | Panjang |
|---|---|---|
| `00-abstrak.md` | Abstrak dan Abstract | 1 halaman |
| `00-ringkasan.md` | Ringkasan untuk pimpinan: enam kesimpulan, tiga keputusan | 2 halaman |
| `01-pendahuluan.md` | BAB 1: latar, masalah, tiga pertanyaan penelitian, tujuan, batas kajian | sekitar 1.200 kata |
| `02-metode.md` | BAB 2: data, cara menguji tiap pertanyaan, aturan hitung yang diuji, mutu | sekitar 1.800 kata |
| `03-hasil.md` | BAB 3: satu subbab per pertanyaan penelitian | sekitar 4.500 kata |
| `04-pembahasan.md` | BAB 4: arti hasil, pembanding negara, usulan aturan hitung, aturan penyajian | sekitar 2.800 kata |
| `05-kesimpulan.md` | BAB 5: kesimpulan per pertanyaan, rekomendasi, revisi Juklak, tahapan, keputusan | sekitar 1.800 kata |
| `pustaka.md` | Daftar pustaka | salin dari lama |
| lampiran | Kasus sulit penghitungan, matriks uji, tabel negara, pohon keputusan, wawancara, glosarium, sumber data | dari lama |

## Tiga pertanyaan penelitian (tulang Bab 3 dan Bab 5)

1. **Seberapa besar jumlah kejadian bencana berubah bila cara menghitungnya berubah?**
   Jawaban: karhutla 2,2 kali (3,4 kali bila jendela 6 jam ikut), logbook 27 persen antar-cara
   mencocokkan laporan, lebih dari dua kali lipat tanpa pencocokan; satu gempa 15 Agustus 2026 tercatat di
   11 kabupaten masing-masing 0,091 kejadian; 643 baris DIBI berupa pecahan kejadian.
2. **Apakah enam kriteria Juklak 7/2023 menyaring kejadian dengan terukur dan setara antarjenis bencana?**
   Jawaban: 51,1 persen kejadian lolos hanya lewat kriteria terdampak; kekeringan lolos 94,6 persen,
   karhutla 1,4 persen; dua kriteria (status darurat, permintaan bantuan) keputusan administratif;
   1 persen baris DIBI memikul 85,5 persen korban meninggal, jadi jumlah kejadian bukan ukuran besar.
3. **Apakah aturan hitung baru membuat angka lebih stabil dan bermakna?**
   Jawaban: kejadian yang masuk hitungan turun 9,3 persen (7.535 menjadi 6.835); beda hasil antar-cara
   mencocokkan logbook tinggal 3 persen; status darurat hanya cocok dengan skala dampak pada 52,7 persen
   kejadian; kelas Besar atau Katastrofik hanya 0,4 persen (opsi a) dan 0,8 persen (usulan, 57 dari 6.835).

Angka lain ambil dari naskah lama, `riset/*.md`, atau `analisis/hasil/*.json`. Jangan mengarang. Bila
naskah lama berbeda dengan json, json yang menang (kunci `v2` untuk kerangka berlaku) dan catat di
laporan balik.

## Aturan tulis tiap bab

- Kalimat pertama tiap subbab Hasil adalah jawabannya, dengan angka. Baru kemudian buktinya.
- Satu paragraf satu gagasan, paling banyak 5 kalimat. Kalimat lengkap EYD V.
- Tiap subbab Hasil memuat minimal satu tabel atau gambar. Pakai gambar yang ada di `mesin/gambar/`
  (rujuk sebagai `gbr/<nama>.png`, nama sama dengan json) bila labelnya tidak memuat istilah terlarang.
  Bila perlu gambar baru, buat json baru berawalan `i-` dengan meniru format json yang ada
  (`r-*.json`), label dalam bahasa biasa.
- Nomor tabel dan gambar mengikuti bab (Tabel 3.1, Gambar 3.2).
- Tidak ada rujukan ke "Fase 1/2/3", "paradoks P-xx" di badan naskah, "BRIEF", atau berkas kerja.
  Kasus sulit boleh dirujuk sebagai "lihat Lampiran A".
- Tanpa em dash, tanpa titik tengah, tanpa tanda seru.
- BNPB dan BPBD ditulis "kita" bila perlu kata ganti.
- Jangan tulis "Pantau Bencana".
- Penanda [BELUM TERVERIFIKASI] dan [ILUSTRASI] dari naskah lama tetap dipertahankan pada klaim yang sama.
- Tidak ada data pribadi (nama korban, petugas, pelapor, nomor telepon).
- Angka antarsumber tidak dijumlah.
- Ikuti konvensi Markdown mesin di `riset/KONVENSI-NASKAH.md` (judul `# BAB n Nama`, `## n.m`,
  `Tabel n.m. Judul` di atas tabel, `Sumber: ...` di bawahnya, kotak `:::kalimat`, `:::kartu`,
  `:::temuan`, `:::keputusan`).

## Gaya bahasa

Ikuti `data/kajian-bnpb/qa/GAYA-BAHASA-KAJIAN.md` (kalimat efektif, kalke Inggris, frasa birokratis, pola klise).
Sebelum menyerahkan, jalankan `py data/kajian-bnpb/qa/periksa_bahasa.py <berkas>` sampai temuan K nol dan
temuan G/AI sudah ditimbang satu per satu.

## Istilah: WAJIB diganti

| Jangan pakai | Pakai |
|---|---|
| KJN | kejadian nasional |
| CK | catatan kabupaten |
| RBS, RB/RS/RR berbobot | rumah rusak berat atau setaranya (rusak sedang dihitung setengah, rusak ringan seperempat) |
| L1, L2, L3, lapis, kerangka tiga lapis | aturan hitung tiga langkah: langkah 1 menentukan satu kejadian, langkah 2 syarat masuk hitungan, langkah 3 kelas keparahan |
| D (aturan dampak), S (aturan penyajian) | aturan angka korban dan kerusakan; aturan penyajian |
| M1 sampai M6 | tulis syaratnya langsung: ada korban meninggal atau hilang; minimal 50 orang terdampak langsung; minimal 5 rumah rusak berat atau setaranya; fasilitas penting rusak; karhutla minimal 2 hektare terverifikasi atau puso 10 hektare; ada SK tanggap darurat yang cocok |
| K1 sampai K6, kriteria a sampai f | tulis nama kriterianya: korban meninggal, terdampak, rumah dan fasilitas rusak, lahan terbakar, permintaan bantuan, status darurat |
| penaik relatif | kenaikan kelas untuk daerah berpenduduk kecil |
| paradoks (sebagai konsep bab) | kasus sulit penghitungan |
| iris salami, sorites, kapal Theseus, hukum Goodhart, Simpson | hapus nama itu; jelaskan masalahnya dengan kalimat biasa |
| aturan gabung | aturan menggabungkan laporan menjadi satu kejadian |
| kunci pencocokan | cara mencocokkan laporan harian (boleh disertai "deduplication key" sekali) |
| opsi a, b, c | skala absolut, skala relatif terhadap penduduk, skala mengikuti status darurat |
| uji adversarial | uji dengan kasus sulit buatan pemeriksa |
| v1, v2, v2.1 | versi pertama, versi akhir |
| delineasi, kalibrasi, operasionalisasi | penentuan batas, penyesuaian angka, penerapan |

Pemilik (13 Nov, saat penulisan berjalan): "kurangi singkatan yang sulit dipahami, jelaskan aja"; "kalau ada
istilah yang lebih mudah dimengerti pakai Inggris, pakai aja"; "bahasa Indonesia yang ga nanggung dan gampang
dipahami". Artinya: jangan menerjemahkan istilah teknis menjadi padanan Indonesia yang jarang dipakai orang
(misalnya "penentuan batas", "ambang", "pencocokan" boleh, tetapi "delineasi", "kalibrasi", "agregasi",
"operasionalisasi", "proksi" tidak). Bila padanan Indonesianya kaku, pakai istilah Inggris yang dikenal
(threshold, dashboard, database, trend, outlier, baseline, proxy, cut-off) dan jelaskan sekali. Kalimat
ditulis seperti orang menjelaskan ke rekan kerja: subjek jelas, kata kerja aktif, tanpa kata benda berlapis.

Istilah Inggris yang lazim boleh dan dimiringkan: *hotspot*, *double counting*, *long tail*, *backtest*,
*deduplication key*. Singkatan lembaga dan sistem yang lazim boleh: BNPB, BPBD, DIBI, Pusdatinkom,
Pusdalops, Juklak, SK, VIIRS, FIRMS, EM-DAT, KIB (jelaskan sekali saat pertama muncul).
