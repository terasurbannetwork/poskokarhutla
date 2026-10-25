# Lapis (c) penyunting bahasa: kajian air, Bab 4

Berkas: `naskah/air/bab-04.md` (Kondisi Sumber Daya Air Pulau Jawa). Tanggal: 24 Oktober 2026.

## Vonis slop

| Tahap | Perintah | Hasil |
| --- | --- | --- |
| Sebelum sunting | `qa/slop.py --final naskah/air/bab-04.md` | LOLOS, skor 0, 3.635 kata |
| Sesudah sunting | `qa/slop.py --final naskah/air/bab-04.md` | LOLOS, skor 0, 3.610 kata, kata kosong 0,0 per 1.000 |

## Suntingan

1. Singkatan dieja pada kemunculan pertama di bab (glosarium, T-9). Lima singkatan belum memenuhi aturan itu, dan semuanya sudah dibetulkan: BPS (Subbab Air Baku dan Air Minum), BNPB (Subbab Celah Data), serta ATR/BPN, BMKG, dan KLH/BPLH (Tabel celah-air). Judul subbab "DAS dan Tutupan Lahan Hulu" menjadi "Daerah Aliran Sungai dan Tutupan Lahan Hulu" supaya judul tidak memakai singkatan yang belum dieja. Id `{#sub:das}` tidak berubah.
2. Ejaan ganda dihapus. BBWS dan GNSS sudah dieja di ringkasan bab, jadi kepanjangannya tidak diulang di prosa isi.
3. Pengulangan antarsubbab dihapus.
   - Jumlah CAT Jawa tadinya disebut di Subbab Ketersediaan dan Subbab Air Tanah. Sekarang angka itu hanya ada di Subbab Air Tanah, dan di sana CAT dieja. Token `airjawa.jawa.cat_jumlah` dan rujukan `@keppres-2011-cat` tetap ada di bab, dan nilainya tidak berubah.
   - Kalimat penutup paragraf InSAR Semarang ("Stasiun GNSS yang stabil hanya mewakili titik ...") dihapus karena isinya sudah ada di paragraf GNSS dan catatan @gbr:muka-tanah.
4. Kalimat tanpa predikat diperbaiki menjadi "Sumber itu mencatat air permukaan Jawa ...".
5. Redundansi di paragraf kondisi jaringan irigasi dirapikan menjadi "dugaan ini belum dapat dibuktikan dengan data yang ada". Pengulangan "artikel itu" di paragraf CAT rusak dihapus ("Teksnya berasal dari CNBC Indonesia ...").

Tidak ada angka, token, kutipan langsung, label keyakinan, atau rujukan silang yang berubah nilai atau makna. Pembandingan multiset token sebelum dan sesudah sunting hanya menemukan satu perbedaan, yaitu pemindahan jumlah CAT pada butir 3.

## Daftar periksa M-1 sampai M-14

Prosa sudah dibaca per paragraf. Tidak ditemukan pasif yang menyembunyikan pelaku (M-1), sinonim berputar (M-2), alternatif palsu (M-4), angka yang diketik tangan (M-5), atau sebab-akibat dari korelasi (M-6). Untuk M-6, paragraf Jakarta sudah menyatakan bahwa data tidak cukup untuk menyimpulkan sebab-akibat. Tidak ada juga subbab templat (M-8), tebal di tengah paragraf (M-12), maupun kalimat bijak atau rangkaian kalimat pendek yang dramatis (M-13). Kontras "bukan" yang tersisa berdasar pada definisi atau data (M-10), misalnya leding Susenas yang bukan cakupan SPAM. Semua paragraf temuan dibuka kalimat tebal yang memuat angka (L16), dan judul subbab deskriptif (L60). M-9 dan M-14 tidak berlaku untuk bab ini.

## Catatan di luar lapis bahasa

`bangun/kontrak/naskah.py naskah/air/bab-04.md` gagal di baris 15 karena kunci `airjawa.*` tidak ada di `data/angka.json`. Naskah asli sebelum sunting gagal dengan galat yang sama, jadi galat ini tidak berasal dari suntingan. Paket angka air-jawa perlu disuntikkan ke `data/angka.json` sebelum bab ini dibangun.

Sisa ringan: nama "Kementerian PUPR" di Subbab Ketersediaan lolos pengecualian varian karena didahului kata "dahulu".
