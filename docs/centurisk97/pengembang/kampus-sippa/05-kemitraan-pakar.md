# Kemitraan: pakar, pertanyaan, kunjungan

Bagian ini memerinci pencocokan pakar, generator pertanyaan, rumus rencana keaktifan dan donor, serta alur masalah dan kunjungan.

## Kemitraan Kampus: pencocokan pakar

Dokumen rujukan: ALGORITMA §4 dan §5. Kode: `scripts/kemitraan/korpus.py`, `teks.py`, `indeks_bm25.py`, `cocok_pakar.py`. Sumber: direktori pakar dan korpus karya OpenAlex, yang hanya ada di R2 privat, tidak pernah di `public/` atau git.

1. **Korpus**: per pakar, sampai 25 karya (15 sitasi tertinggi ditambah 10 terbaru sejak 2018) dari OpenAlex (judul, abstrak, tahun, DOI, sumber, sitasi, topik). Laju permintaan 7,7 per detik, empat ulangan dengan jeda eksponensial. Karya tanpa abstrak tetap dipakai dengan judul dan topiknya.
2. **Kueri masalah**: judul, uraian, kamus kata kunci bahaya, kamus aspek, nama provinsi, dan nama pulau. Token huruf kecil, tanda baca dan kata henti Indonesia dan Inggris dibuang, lalu stem ringan (akhiran `nya`, `kan`, `ing`, `an`, `ed`, `s`; kata sisa minimal 3 huruf).
3. **Skor teks BM25 per karya**:

```
bm25(q,d) = jumlah_t_dalam_q  IDF(t) * f(t,d) * (k1 + 1) / ( f(t,d) + k1 * (1 - b + b * |d| / avgdl) )
IDF(t)   = ln(1 + (N - n_t + 0,5) / (n_t + 0,5))
k1 = 1,2;  b = 0,75;  bidang judul dihitung dua kali
```

Skor teks pakar adalah rerata tiga karya teratas, dibagi nilai maksimum di antara kandidat sehingga berada pada rentang 0 sampai 1.

4. **Komponen lain**: Rumpun R (1 bila rumpun pakar memuat rumpun bahaya, 0,5 bila topik OpenAlex pakar memuat kata kamus, selain itu 0). Bukti lokal L (1,0 bila ada karya menyebut nama kabupaten/kota; 0,6 untuk nama provinsi atau pulau; nama rancu seperti nama pendek diberi 0,6 bila tidak diawali kata kota atau kabupaten). Mutu Q = 0,6 x persentil h-index + 0,4 x persentil porsi karya sejak 2021. Jarak J = exp(-km / 300), kampus tanpa titik diberi 0,3. Rekam jejak E (1,0 bila pakar tercatat di riset, satgas, atau kaji cepat BNPB; 0,5 bila punya lencana bukti; selain itu 0).
5. **Skor akhir**:

```
Skor(p) = 0,45*Teks + 0,15*R + 0,10*L + 0,12*Q + 0,10*J + 0,08*E
```

![Bobot enam komponen skor pakar, teks BM25 memegang 0,45 dari 1,00. Sumber angka: ALGORITMA kampus bagian 4 dan konst.py. Status hipotesis, belum diuji balik.](gambar/kampus-sippa-air-bobot-pakar.svg)

Kandidat adalah pakar dengan R > 0 atau Teks >= 0,2. Urutan: skor menurun, lalu h-index menurun, lalu id menaik. Daftar sepuluh teratas dibatasi dua pakar per kampus.

6. **Tempat hitung**: pipeline bulanan menghitung sepuluh teratas untuk semua masalah otomatis dan menyimpannya di R2 `kemitraan/cocok/<kode4>.json`. Masalah baru dari BPBD dihitung Worker dari indeks ringkas R2 `kemitraan/indeks_bm25/<bahaya>.json` dengan anggaran operasi (jumlah panjang posting token kueri paling banyak 20.000 dan kandidat paling banyak 400, `KM_MAKS_POSTING`). Bila melebihi, hasilnya "Dihitung malam ini". Worker tidak pernah memuat berkas induk pakar.
7. **Solusi tepat guna dari paper**: ekstraktif, tanpa model bahasa (keputusan T-C). Untuk tiga karya teratas, abstrak dipecah menjadi kalimat, tiap kalimat diberi skor 2 x (jumlah penanda solusi) + (jumlah token kueri) - 0,5 bila kalimat pertama hanya latar. Satu sampai dua kalimat berskor 3 atau lebih dikutip apa adanya dengan tautan DOI. Tanpa abstrak, hanya judul yang tampil dengan label "Abstrak tidak tersedia". Kartu berlabel "Kutipan dari abstrak, bukan rekomendasi BNPB".

Status uji balik: skor pakar berstatus HIPOTESIS dan berpil "Belum diuji". Uji relevansi (`scripts/kemitraan/uji_cocok.py`): 60 masalah acuan (6 per aspek), lima belas pakar teratas gabungan dari tiga sistem (skor ini, pembanding A: h-index dalam rumpun, pembanding B: pencarian terdekat lama), dua penilai staf memberi nilai 0, 1, atau 2 tanpa tahu sistemnya, lalu dihitung nDCG@10. Lolos bila skor ini melampaui maksimum pembanding sebesar 0,10 atau lebih dan kappa Cohen penilai paling sedikit 0,4. Syarat dibekukan lewat hash sebelum dijalankan, dan hanya fungsi `verifikasi()` yang boleh menghapus pil "Belum diuji". Status saat ini di `public/data/kemitraan/uji_cocok.json`: `status = belum_ada_label`, `lolos = false`. Label dari dua staf belum ada. Jadi pil tetap.

Batasan: skor worker bisa lebih kecil dari skor pipeline karena indeks ringkas membuang token yang paling sering muncul; hubungan nama kabupaten/kota yang rancu dinilai lemah.

## Kemitraan Kampus: generator pertanyaan

Kode: `scripts/kemitraan/pertanyaan.py` dan kembarannya `public/kemitraan/hitung.js`. Bank templat: `scripts/kemitraan/pertanyaan.json` (dilayani juga ke layar). Tiap templat memuat id, teks, arah, slot isian, dan syarat. Syarat adalah ekspresi sederhana atas profil (`<kunci> <op> <angka|true|false>` yang digabung `and`) yang dievaluasi tanpa `eval`.

Langkah penyusunan: ambil templat umum, bahaya masalah, aspek masalah, dan narasumber; saring menurut syarat; isi slot dari profil. Templat yang slotnya kosong dibuang, jadi teks "{...}" tidak pernah tampil. Urutan per arah: konfirmasi, akar, kapasitas, upaya, kebutuhan, harapan. Pertanyaan akar diberi susulan "Mengapa?" paling banyak tiga tingkat. Paling banyak 40 pertanyaan per narasumber. Hasil dijaga deterministik dan identik antara Python dan JavaScript (selisih paling besar 1e-9 pada kasus acuan `tests/kemitraan/fixtures/acuan.json`).

Pertanyaan riset dibentuk dari templat riset per aspek, ditambah pertanyaan dari vonis model yang gagal.

## Kemitraan Kampus: keaktifan kampus, kecocokan donor, urutan panggil satgas (rumus rencana)

Rumus berikut tertulis di ALGORITMA §7 sampai §9 dan bobotnya sudah ada di `konst.py`, tetapi fungsi dan layarnya belum dibangun (belum ada kode yang memakainya selain konstanta). Semuanya HIPOTESIS.

```
Aktif   = 0,20*min(masalah_diambil,5)/5 + 0,20*min(proposal,3)/3 + 0,15*satgas_siap
        + 0,15*min(jam_sah,2000)/2000 + 0,10*min(magang,20)/20
        + 0,10*min(desa_binaan,10)/10 + 0,10*min(luaran,5)/5          (jendela 365 hari)
Cocok(m,d) = 0,35*[bahaya] + 0,25*[aspek] + 0,15*[syarat mitra] + 0,15*[panggilan buka, tenggat >= 21 hari] + 0,10*[status siap dijajaki]   (tampil bila >= 0,5)
Panggil(a) = 0,40*exp(-km/100) + 0,30*keahlian_cocok + 0,15*[latih kaji cepat] + 0,15*min(jam_sah_365,200)/200
```

Status arsip perjanjian (`src/kemitraan_hitung.js:9`) sudah dipakai: tanpa tanggal berakhir "belum", sisa 60 hari atau kurang "segera_habis", lewat tanggal "habis", selain itu "aktif".

## Kemitraan Kampus: alur masalah dan kunjungan

![Alur status masalah dari diajukan sampai selesai, dengan cabang ditolak atau digabung dan jalan pintas dari tervalidasi ke diambil.](gambar/kampus-sippa-air-status-masalah.svg)

Alur status masalah dijaga trigger D1 `km_masalah_alur` dan salinannya di kode (`src/kemitraan_masalah.js:26`): diajukan menuju ditelaah, tervalidasi, ditolak, atau digabung; ditelaah menuju tervalidasi, ditolak, atau digabung; tervalidasi menuju dicocokkan atau diambil; dicocokkan menuju diambil; diambil menuju berjalan; berjalan menuju selesai; ditolak boleh kembali ke ditelaah. Kunjungan: rencana menuju berjalan atau batal; berjalan menuju selesai atau batal. Jawaban kunjungan bersifat idempoten per pasangan (kunjungan, id klien) dan seluruh larik kiriman ditolak bila satu butir salah, supaya antrean luring tidak menelan setengah. Jawaban "ya" atau "sebagian" pada pertanyaan berarah konfirmasi memajukan masalah dari ditelaah ke tervalidasi saat kunjungan selesai.
