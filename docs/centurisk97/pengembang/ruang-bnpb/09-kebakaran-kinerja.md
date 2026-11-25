# Kebakaran, kinerja, hukum, prioritas

Halaman ini menjelaskan metode risiko kebakaran permukiman, kinerja IKU, pustaka hukum, skor prioritas daerah, dan laporan berkala.

## Risiko kebakaran permukiman

`scripts/bnpb/kebakaran.py`, dijalankan lokal untuk kota yang dipilih. Skor 0 sampai 100 adalah rerata peringkat persentil (bobot sama) dari empat komponen: tutupan tapak bangunan, kepadatan bangunan per hektare, menit tempuh Damkar (Dijkstra multi-sumber lewat jalan yang bisa dilalui mobil pemadam ditambah jalan kaki 4 km/jam dari jalan ke bangunan, kecepatan per kelas jalan diandaikan), dan porsi jalan sempit (gang atau lebar di bawah 3,5 m). Hidran ditampilkan tetapi tidak masuk skor. Kelas relatif dalam satu kota: 10 persen teratas Sangat tinggi, 20 persen berikutnya Tinggi, 30 persen Sedang, sisanya Rendah. Aturan lulus uji balik ditulis sebelum hasil dilihat: di dua periode (2015 sampai 2023 dan 2024 sampai 2025) tangkapan 20 persen teratas harus sama atau di atas pembanding jumlah bangunan dan kepadatan saja ditambah 5 poin, dengan batas bawah selang 90 persen (bootstrap 2.000 ulangan) lebih dari 0. Hasil `kebakaran_31.json`: `lulus: false` (tangkapan indeks 0,177 dan 0,178 lawan jumlah bangunan 0,321 dan 0,323), jadi berlabel hipotesis dan tidak dipakai sebagai alat prioritas. Kepekaan pascahoc dilaporkan tetapi tidak dipakai vonis.

## Kinerja IKU

`scripts/bnpb/iku.py` merakit `public/data/bnpb/iku.json` tanpa jaringan. Angka resmi hanya dari catatan pustaka (LAKIP 2025, Renstra 2025 sampai 2029, NDPBA) dan membawa dokumen serta halaman. Baseline IRB 147,95 pada 2025 dan target turun 1,2 persen per tahun: `v(n) = 147,95 x 0,988^n`, `n = tahun - 2025`. IRB 2025 menurut teks LAKIP 170,17 sedangkan rumus di halaman yang sama memakai 170,19, dan keduanya dicatat. Raster kapasitas InaRISK tidak sama dengan IKD resmi: dihitung 310 kab rendah lawan 225 pada IKD resmi, sehingga persen kab berkapasitas sedang ke atas tidak sebanding.

## Pustaka hukum

`scripts/bnpb/hukum.py` mengikuti urutan tarik (JDIH BNPB), teks (pdftotext per halaman, OCR tesseract bila huruf per halaman kurang dari 40, mode halaman 4 supaya penanda ayat tidak terlepas), urai (segmen deterministik maksimal 6000 huruf, lampiran dan bagian tanpa Pasal dipotong 1500 huruf, relasi mencabut dan mengubah, definisi), lalu keluar `katalog.json` dan `data/hukum/seed.sql` (pernyataan maksimal 100.000 byte untuk D1). Aturan relasi: kata kerja mencabut, mengganti, mengubah hanya dibaca di segmen menimbang, menetapkan, atau pasal, dan hanya untuk sasaran sederajat; pembaca daftar pencabutan tidak boleh memotong di tanda titik koma atau sitasi berikutnya (perbaikan F0-1). Pertanyaan bebas: model hanya menjawab dari segmen yang diambil, dan klaim tanpa kutipan segmen yang lolos verifikasi dibuang.

## Skor prioritas daerah (MB-4, Ruang Unit)

`scripts/bnpb/unit/skor.py` adalah pustaka murni, belum dipakai langkah mana pun. Rumus tunggal rata-rata geometrik berbobot dengan lantai 0,01:

```
q_j = maks(persentil_j, 0,01)   untuk komponen persentil;  q_j = v_j (0 sampai 1) untuk komponen mutlak
S = produk q_j ^ (w_j / W)   atas komponen yang bernilai untuk kab itu
S = null ("data kurang") bila W < 0,5 x jumlah semua bobot
```

Persentil = peringkat berbasis 0 dibagi (n - 1), seri dirata-rata; komponen dengan n kurang dari 2 dianggap tidak ada. Label tetap: "Asumsi: bobot sementara". Bobot bukan hasil kalibrasi.

## Laporan berkala (rancangan)

Belum ada kode. Rancangan dari `data/kajian-bnpb/laporan-berkala/`:

- Empat periode, satu mesin, kode periode harian `YYYY-MM-DD`, mingguan `YYYY-Www` (Senin sampai Minggu), bulanan `YYYY-MM`, tahunan `YYYY`. Angka dihitung mesin; kalimat kebijakan ditulis staf.
- Kejadian dari kolom `kejadian` DIBI (bukan jumlah baris), jenis dipetakan lewat tabel; jenis mentah yang belum ada di tabel membuat perakitan gagal. Angka utama hanya bencana alam; kejadian non-alam dan sosial dibahas di Bab 1.4 dan tidak dijumlahkan.
- Duplikat antarkab: dampak identik pada tanggal dan jenis sama di dua kab dihitung sekali, kejadian tetap per kab (HIPOTESIS atas Q20).
- Karhutla dari sistem sendiri: hotspot, luas perkiraan, belum padam. Status surut banjir dari potongan harian yang disimpan perakit.
- Versi beku `v1`, `v2`, dan seterusnya, tidak pernah ditimpa. Prediksi dua bulan dari `logbook_riwayat.json` dengan definisi contoh "paling sedikit separuh tahun penuh", dan ENSO dari `iklim_outlook.json`. Bukan prakiraan resmi BMKG.
- Usulan temuan T1 sampai T7 dengan ambang bawaan, misalnya hotspot sebulan lebih dari 50.000; semuanya karangan agent yang meniru contoh Oktober 2026 dan dipilih ulang oleh staf.
- Tabel Respons BPBD bulanan: median waktu respons per BPBD dari `GET /api/lapor/respons`, BPBD dengan kurang dari 5 laporan sebulan ditulis "belum cukup data", tanpa peringkat.
