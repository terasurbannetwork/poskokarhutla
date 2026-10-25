# Lapis (c) penyunting bahasa: mitigasi bab 01 (Pendahuluan)

Tanggal: 25 Okt 2026. Berkas: `naskah/mitigasi/bab-01.md`.

## Vonis slop

- Sebelum sunting: LOLOS, skor 0 (2.871 kata).
- Sesudah sunting: LOLOS, skor 0 (2.878 kata), kata kosong 0,0 per 1.000.
- Perintah: `.venv/bin/python qa/slop.py --final naskah/mitigasi/bab-01.md`.

## Suntingan

| Letak | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| Ringkasan, angka kunci 2 | Laporan Kinerja (LKIP) | Laporan Kinerja Instansi Pemerintah (LKIP) | kepanjangan singkatan lengkap pada kemunculan pertama |
| Lingkup, paragraf 1 | sampai karhutla | sampai kebakaran hutan dan lahan (karhutla) | istilah glosarium dieja pada kemunculan pertama di bab |
| Posisi, paragraf 2 | indikator RPJMN KP 08.04.02 | indikator Kegiatan Prioritas (KP) 08.04.02 RPJMN | singkatan KP belum dieja |
| Latar Belakang, paragraf 5 | Kedua angka resmi itu dihitung dari komponen berbeda dan tidak dirata-rata. | Keduanya resmi, tetapi dihitung dari komponen berbeda, sehingga tidak dirata-rata. | frasa "Kedua angka resmi itu" sudah dipakai di paragraf 1 subbab yang sama |
| Lingkup, paragraf mitigasi | menaruh mitigasi bencana di prabencana | menempatkan mitigasi bencana pada tahap prabencana | ragam formal; preposisi "pada" untuk tahap |
| Lingkup, paragraf kebakaran permukiman | menaruh sub-urusan | menempatkan sub-urusan | ragam formal |
| Lingkup, paragraf kebakaran permukiman | Alasan kajian, yang merupakan tafsiran penyusun, ... sedangkan kajian memusatkan diri | Alasannya, yang berlabel tafsiran penyusun, ... sementara kajian ini berpusat | kalimat lebih padat; label keyakinan disebut sebagai label |

Angka, token `{{angka:...}}`, kutipan, rujukan silang, rujukan pustaka, dan makna tidak diubah.

## Daftar periksa M-1 sampai M-14

- M-1 pasif penyembunyi pelaku: tidak ditemukan; pelaku (BNPB, LKIP, Renstra, penyusun) tersebut.
- M-2 sinonim berputar: istilah konsisten (baseline, proksi penyusun, versi semua klasifikasi, seri bencana alam).
- M-3 kalimat pertama mengulang judul: tidak ada.
- M-4 keberatan fiktif: tidak ada.
- M-5 angka ketik tangan: semua angka data bertoken; "10%" di paragraf IRB adalah kutipan target Renstra, bilangan tahun dan pasal bukan angka data.
- M-6 sebab dari korelasi: paragraf IRB menyatakan IRB turun dan korban naik tidak bertentangan, tanpa klaim sebab.
- M-7 paragraf satu gagasan: terpenuhi.
- M-8 subbab templat: tidak ada.
- M-9 rekomendasi: keempat rekomendasi ringkasan berlembaga dan bertenggat; rinciannya di register.
- M-10 kontras "X, bukan Y": tidak ada tanpa landasan.
- M-11 register: formal ilmiah sepanjang bab, tanpa sapaan.
- M-12 tebal sebagai penekanan: tebal hanya pada kalimat pembuka temuan (L16) dan label kotak catatan.
- M-13 kalimat bijak kosong: tidak ada.
- M-14 uji tukar logo: tidak berlaku untuk naskah (berlaku pada halaman jadi).

## Catatan

- Paragraf Tujuan dan Sistematika tidak berkalimat pembuka tebal karena bukan paragraf temuan.
- Singkatan peraturan (UU, PP, Perpres, Perban, Perka, Kepka, Juklak) dan K/L dipakai tanpa kepanjangan sesuai glosarium (`periksa: false`).
- "Sub-urusan" dipertahankan mengikuti istilah UU 23/2014.
