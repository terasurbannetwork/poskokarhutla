# QA lapis (b) penyunting substansi: kajian air Bab 7

Berkas: `naskah/air/bab-07.md`. Pembanding: `naskah/air/bukti/bab-07.md`, `bab-07.angka.json`, `data/angka.json` dan
`bab-01` sampai `bab-08.angka.json`, KERANGKA §2, §4 (Bab 7), PEDOMAN §B5.5 sampai §B5.7, Buku Pegangan L16, L60.
Diperiksa 24 Oktober 2026.

## Pemeriksaan mekanis

- 77 token angka unik (kunci dan opsi) dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/air/bukti/bab-*.angka.json`: semua kunci ada, nilai tampil cocok dengan berkas bukti, label keyakinan sah.
  `baca()` atas bab utuh lulus tanpa galat. Semua kunci pustaka yang dikutip ada.
- `qa/slop.py --final`: LOLOS, skor 0 (3.315 kata). Em dash dan titik tengah: nol.
- Kunci yang dipakai bab ini tersebar di `bab-01`, `bab-02`, `bab-04`, `bab-07`, dan `bab-08.angka.json`; bab gagal dibangun
  sampai registri digabung (sama dengan catatan QA Bab 10).

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan bab butir 2; subbab 7.7 paragraf 1 | "Hanya 1 sel berisi program dalam negeri" salah: sel lain berisi program dalam negeri berbukti lemah atau belum terbukti (P04, P10, P11, P12, P14, P15; bukti P3 temuan 6) | Ditulis "hanya 1 sel berbukti kuat atau sedang dari program dalam negeri" |
| 2 | 7.2 paragraf 1 | Kalimat tebal memasangkan keterpenuhan 6% dengan "target unit BNPB 6,32%" seolah satu indikator; 6,32% adalah target cakupan layanan di daerah berisiko (Renstra hlm. 133), penyebutnya berbeda | Kalimat dipecah; 6,32% disebut sebagai indikator lain; kutipan Renstra ditambah hlm. 133 |
| 3 | 7.2 paragraf 2 | Token POD tampil "menangkap sekitar 0,50 kabupaten-hari banjir", terbaca sebagai jumlah | Ditulis "peluang deteksi (POD) sekitar 0,50 atas kabupaten-hari banjir" |
| 4 | 7.1 paragraf 3 | Token tampil "mendaftar 11 jenis bahaya data peringatan dini"; "mewajibkan sistem peringatan dini" melebihi teks PP 30/2024 Pasal 96 ("pengaturan meliputi penetapan"); "bahkan" retoris | Ditulis "data peringatan dini untuk 11 jenis bahaya" dengan ayat (2) dan (3) dipisah; "mengatur penetapan"; "bahkan" dibuang |
| 5 | 7.1 paragraf 1 | "Inpres 2/2025 menyasar empat belas provinsi di luar Jawa" menghilangkan klausul provinsi lain (bukti P1 temuan 1) | Ditambah "mencakup Jawa hanya lewat klausul provinsi lain" |
| 6 | 7.1 paragraf 2 | "posisinya adalah menjalankan peran kontributor" berbentuk arahan di bab kesenjangan (prinsip 17) | Ditulis sebagai fakta: peran kontributor sudah tertulis, bukan peran yang masih harus diminta |
| 7 | 7.2 paragraf 5 | Tiga syarat "berfungsi" ditulis sebagai isi instrumen, padahal susunan itu inferensi tim; Pasal 30 tanpa kutipan; geladi posko hilang dari Pasal 19 | "kajian menyusun tiga syarat"; kutipan Perban 2/2024 dan Pasal 19 ditambah |
| 8 | 7.2 paragraf 3 | Fasilitasi 56 kab/kota nasional dijejer dengan 119 kab/kota Jawa tanpa batas tafsir | Ditambah "porsi Jawa dari target itu tidak dinyatakan" (bukti P2 inferensi) |
| 9 | 7.2 paragraf 4 | Target Rancangan Perpres 2025 tanpa kutipan Renstra | Ditambah Renstra hlm. 161 |
| 10 | Kartu temuan 7.5 | Judul "DSP hanya tiga keadaan, sehingga pemeliharaan bergantung pada APBD" adalah sebab yang tidak didukung bukti; ketergantungan pada APBD bersumber dari ancaman 10 Renstra | Judul dibalik menjadi dua fakta berdampingan; Renstra hlm. 76 masuk Bukti |
| 11 | 7.7 paragraf 2 | "Sel berbukti kuat bersandar pada Tokyo" mempersempit P16 | Ditulis "pengendalian air tanah Tokyo, Osaka, dan Bangkok; di Tokyo ..." |
| 12 | 7.8 paragraf 1 | Kunci `rpjmn.iks_penurunan_irb_persen` bersumber Renstra hlm. 84, naskah hanya mengutip RPJMN | Kutipan Renstra hlm. 84 ditambah |
| 13 | Ringkasan bab, rekomendasi | Kode tidak urut | Diurutkan r-a06, r-a07, r-a11, r-a12, r-a14, r-a19, r-a22 (semua ada di Bab 10) |

## Diperiksa dan tidak diubah

- Lantai skenario: Bab 7 tidak memuat kartu skenario (catatan lingkup bukti); tidak ada angka korban skenario.
- Angka model: satu angka (POD platform) berlabel estimasi model, berdampingan dengan angka BPK, dan dinyatakan tidak
  menguatkannya.
- "Terbukti": P16 satu-satunya berbukti kuat dan luar negeri; padanan Jakarta "belum dapat disebut terbukti"; PAMSIMAS
  berbukti sedang dengan evaluasi independen DFAT didahulukan; Destana belum terbukti; sel tanggap darurat ditulis "belum
  ada bukti dampak", bukan "tidak efektif"; tabel 7.8 ditutup "dipertahankan tidak berarti terbukti".
- Angka bertentangan berdampingan: cakupan peringatan dini tiga penyebut; kapasitas daerah 62%, 67%, 38,0% (KD-3); CAT rusak
  sebagai pernyataan instansi tanpa penetapan.
- Kewenangan: celah dibaca dari teks peraturan berpasal; jembatan UU 17/2019 Pasal 35 ayat (5) dan (6) tertulis; BNPB
  sebagai kontributor Renas 2.4.4.a (koreksi KERANGKA) dan anggota Dewan SDA Nasional; tidak ada klaim BNPB sebagai
  regulator air atau keselamatan bendungan; RTD tetap pada pemilik bendungan (PP 37/2010).
- Pertanyaan kunci KERANGKA §4 terjawab: kewenangan (7.1, Tabel 7.1), peringatan dini hulu dan hilir (7.2), komponen dan
  musim tanpa program berbukti (7.7, Gambar 7.1), yang dipertahankan (7.8). Kartu temuan 7.1 sampai 7.6 lengkap dengan bukti,
  dampak, pembuka; Tabel 7.1 ada.
- Kotak 7.1 (B5.5) diwujudkan sebagai `tbl:dipertahankan` berkolom dasar dan argumen tandingan; NASKAH-SPEK tidak punya
  direktif kotak daftar, dan dua baris bertanda "–" jujur terhadap bukti.

## Sisa untuk orkestrator (di luar berkas ini)

1. `gambar/air/bab07-sel-bukti-program.png` belum ada, dan `data/program-terbukti/sel_air.csv` yang diusulkan bukti belum
   dibangun (pemilik `pipa-data`). Gambar 7.1 akan gagal saat bangun DOCX sampai keduanya dibuat dari tabel P3 temuan 6.
2. Gabungkan `naskah/air/bukti/bab-*.angka.json` dan `bab-*.pustaka.json` ke registri; `pustaka.json` masih memuat entri
   penulis tanpa `family` (`Konteks._akhiran_tahun()` galat `KeyError: 'family'`).
3. Kunci `rpjmn.iks_penurunan_irb_persen` (bab-01) bercatatan "lampiran Perpres 12/2025 belum dibuka", sedangkan bukti Bab 7
   membaca RPJMN Lampiran III hlm. 913 (baseline 1,54, target 1,2). Pemilik bab-01 perlu memastikan satuan "% per tahun" dan
   memperbarui sumbernya.
4. Koreksi KERANGKA dari bukti Bab 7 (BNPB sudah kontributor 2.4.4.a; Perpres 53/2022 sudah dibuka; "gladi tahunan" bukan
   isi Juklak 4/2026; irigasi punya program berbukti lemah) masih menunggu pemilik KERANGKA.
