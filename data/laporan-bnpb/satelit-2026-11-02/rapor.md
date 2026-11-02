# Rapor pemeriksa bersih: Laporan Penanganan Pengendalian Karhutla 021126 (bangun ulang, png7)

Diperiksa ulang dari PNG png7 (slide 3 dan 4 berubah), `angka.json`, `wa-satgas.txt`, `satgas.py`, `format-ringkas.md` §3–6, `selera-pemilik.md` §10b.

Klaim pembuat yang saya cek sendiri:
- (1) Klaim pertama terbukti. Judul slide 4 kini "Hasil Pemadaman Satgas per Tanggal 1 November 2026", 1 baris. Angkanya pindah ke kepala panel: "Padam ±115,19 ha dari target ±604,67 ha; ±427,68 ha masih ditangani di Kalimantan Tengah".
- (2) Klaim kedua terbukti. Baris Sumber slide 3 kini menyebut "PM2,5 model CAMS rata-rata provinsi 1 Nov; cuaca Open-Meteo 2 Nov".

| Dimensi | Nilai | Bukti |
|---|---|---|
| Judul | 4 | Slide 3, 4, dan 5 kini berbentuk `<Topik> per Tanggal …` dan masing-masing 1 baris. Sisa masalah: judul slide 5 "per Tanggal 2 November 2026", sedangkan OMC dan hasilnya kegiatan 1 Nov (pil "1 Nov"). Slide 4 dari laporan yang sama memakai 1 Nov, jadi pembaca melihat dua tanggal untuk satu sumber. Alasan pembuat (aturan pemilik: judul = tanggal laporan WA) mungkin sah, tapi slide 4 tidak mengikuti pola yang sama. Judul slide 4 juga duduk sekitar 30 px lebih rendah daripada judul slide 2, 3, dan 5. Slide 2 tetap tanpa tanggal ("… Karhutla 2026"). |
| Grafik | 4 | Batang mini slide 3 diskalakan per baris dan warnanya cocok dengan ▲/▼ di 72 sel. Batang armada slide 5 cocok dengan teks. Peta cocok dengan tabel. Minus tetap ada: legenda slide 3 memuat "tanpa pembanding" dan "PM2.5 berbahaya" yang tidak tampil, oranye punya 4 arti, dan biru punya 2 arti. Pembuat menyebut ini templat terkunci; nilai tetap mengikuti yang terlihat. |
| Tata letak | 3 | Tidak berubah. Panel PENANGANAN slide 5 sekitar 60% kosong dan mengulang 22/30 dengan urutan terbalik. Celah antarbaris panel OMC lebar. Ada ruang kosong sekitar 100 px di atas dan di bawah peta slide 2. Pita Hambatan slide 4 rata kanan-kiri padahal hanya 2 baris, sehingga celah antarkata lebar. Logo slide 4 lain ukuran. Tidak ada teks tumpang tindih atau terpotong; huruf terkecil 6,0–6,6 pt. |
| Sumber dan angka | 5 | Semua hitung ulang cocok (lihat lampiran). Sumber PM2,5 dan cuaca kini tertulis. Isi Hambatan bisa ditelusuri ke bagian C laporan pemilik menurut docstring `satgas.py` ("C (hambatan dan upaya)"). |
| Alur | 4 | Urutan Situasi → Operasi runtut. Kepala panel slide 4 kini memegang pesannya. Masih tersandung di tanggal: slide 4 "1 November", slide 5 "2 November", padahal laporannya sama. |
| Rasa mahal | 4 | Slide 4 kini sekelas slide lain. Yang masih menurunkan nilai: panel slide 5 yang lowong dan mengulang angka, serta pita justify bercelah di slide 4. |

## Sisa temuan (paling berat dulu)

1. **Slide 5, panel PENANGANAN lowong dan berulang.** Tiga angka tersebar di sekitar 930 px; 22 dan 30 sudah ada di panel armada, dengan urutan terbalik. Bila templat memang dikunci pemilik, minta pemilik membuka kuncinya. Usul isi: sortie WB 22 / 484 kali WB / padam udara 45,20 ha.
2. **Tanggal slide 4 dan 5 tidak satu pola untuk sumber yang sama** (1 Nov lawan 2 Nov). Kalau aturannya "judul = tanggal laporan", slide 4 seharusnya juga 2 Nov dengan keterangan kegiatan 1 Nov; kalau "judul = tanggal kegiatan", slide 5 jadi 1 Nov.
3. **Slide 4, pita Hambatan rata kanan-kiri pada teks 2 baris.** Celah antarkata lebar; justify hanya untuk 3 baris atau lebih.
4. **Slide 3, warna berarti ganda dan legenda memuat 2 kategori yang tidak tampil.** Pembuat menyebutnya templat terkunci.
5. **Slide 2, ruang kosong sekitar 100 px di atas dan di bawah peta.**
6. **Slide 4, judul dan logo tidak sejajar dengan slide 2, 3, dan 5** (judul lebih rendah, logo lebih besar).
7. Kecil: catatan kaki "*Data berdasarkan … FIRMS" di slide 2 dan 3 mengulang baris Sumber. Slide 2 tanpa "per Tanggal". Chip personel memakai singkatan, sedangkan panel armada memakai nama lengkap.

## Lampiran: hitung ulang (semua cocok, tanpa selisih)

- **Slide 2:** kartu 3.148 HS / 1.052 FS / 6.180 ha / 1.735 ha = jumlah nasional `angka.json` hari 2 Nov. Sepuluh baris tabel cocok dan urutannya benar menurut hotspot.
- **Slide 3, baris Jumlah:** HS 2.694 / 1.801 / 2.243; FS 1.189 / 654 / 840; luas 4.604 / 3.517 / 4.205; belum padam 2.034 / 1.215 / 1.256. Semua cocok, termasuk 72 persen perubahan. Subjudul 2.802 ÷ 4.604 = 60,9% ≈ 61% ✓.
- **Slide 4:** tiap baris padam = darat + udara dan target = padam + sisa, untuk FS dan ha ✓. Jumlah 144 / 604,67 / 69,99 / 45,20 / 59 / 115,19 / 85 / 489,48 = rekap teks ✓. Kepala panel kini 115,19 / 604,67 / 427,68 ✓.
- **Slide 5:** personel 71.878 dan persen per provinsi ✓. Patroli 22 + heli 30 = 52, tiap batang provinsi cocok ✓. Semai 12 sortie / 19.500 kg ✓. OMC di 3 provinsi, hujan di 5 provinsi ✓.
