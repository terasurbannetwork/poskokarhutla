# Lapis (c) penyunting bahasa: mitigasi bab 08 (Bencana Nonalam)

Tanggal: 25 Okt 2026. Berkas: `naskah/mitigasi/bab-08.md`.

## Vonis slop

- Sebelum sunting: LOLOS, skor 0 (3.931 kata), tetapi dengan 5 temuan S-18 tiga-serangkai gaya (baris 38, 48, 152, 178, 217). S-18 berbobot 0 pada skor, namun dihitung pada vonis ambang T-8 (1 sampai 2 GAGAL RINGAN, 3 atau lebih GAGAL BERAT).
- Sesudah sunting: LOLOS, skor 0 (4.005 kata), nol temuan dalam bentuk apa pun, kata kosong 0,0 per 1.000.
- Perintah: `.venv/bin/python qa/slop.py --final naskah/mitigasi/bab-08.md`.

## Suntingan

| Letak | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| Ringkasan, temuan 1 | Organisasi Kesehatan Dunia (WHO) | Organisasi Kesehatan Dunia (*World Health Organization*, WHO) | kepanjangan glosarium untuk WHO (T-9) |
| Ringkasan, temuan 3 | Catatan BNPB memuat ... TPA ...; rilis BNPB serta KLH/BPLH | BNPB, TPA, dan KLH/BPLH dieja lengkap; kalimat 52 kata dipecah dua | singkatan pertama di bab (T-9); S-30 kalimat terlalu panjang |
| Ringkasan, angka kunci 2 | Terminal BBM Plumpang | Terminal Bahan Bakar Minyak (BBM) Plumpang | singkatan pertama di bab |
| Ringkasan, r-m07 | norma pengait KLB; rapat koordinasi Kemenko PMK | norma pengait status "kejadian luar biasa" (KLB); Kemenko PMK dieja lengkap | T-9; istilah UU 17/2023 diberi petik sebagai istilah (ANTI-SLOP: kutipan istilah empat kata atau kurang) karena frasa "luar biasa" tanpa petik ditandai S-11 bahasa promosi |
| Ringkasan, r-m11 | Kementerian ESDM | Kementerian Energi dan Sumber Daya Mineral (ESDM) | T-9 |
| Ringkasan, r-m08 | di DIBI; Pusat Data, Informasi, dan Komunikasi Kebencanaan | Data dan Informasi Bencana Indonesia (DIBI); ... Kebencanaan (Pusdatinkom) | T-9; Pusdatinkom dipakai lagi di 8.3.1. Kepanjangan DIBI di 8.1.2 dihapus agar tidak dobel |
| 8.1.1, paragraf 1 | Menurut UU 17/2023 ..., kepala daerah atau Menteri wajib menetapkan KLB ..., mencabutnya ..., dan segera menanggulanginya | Kepala daerah atau Menteri wajib menetapkan KLB ... dan mencabutnya ..., serta segera menanggulanginya (UU 17/2023 tentang Kesehatan Pasal 353–354) | S-18 tiga-serangkai; isi dan pasal tetap |
| 8.1.1, paragraf 1 | Kedaruratan kesehatan masyarakat karena itu bukan lagi | Dengan pencabutan itu, kedaruratan kesehatan masyarakat bukan lagi | "karena itu" terulang delapan kali di bab; variasi penghubung |
| 8.1.1, paragraf 2 | Permenkes 1/2026 malah menambah status Krisis Kesehatan | Permenkes 1/2026 justru menambahkan status lain, yaitu Krisis Kesehatan | "malah" ragam lisan |
| 8.1.1, paragraf 3 | Renstra BNPB mencatat | Rencana Strategis (Renstra) BNPB mencatat | T-9 |
| 8.1.1, paragraf 4 | menuliskan jalur yang sama, usul Menteri dan penetapan Presiden, sebagai norma | menuliskan jalur yang sama sebagai norma, yaitu usul Menteri dan penetapan Presiden | S-18 |
| 8.1.2, paragraf DTP3 | imunisasi DTP3 | imunisasi DTP3 (vaksin difteri-tetanus-pertusis dosis ketiga) | singkatan teknis belum dieja |
| 8.1.2, paragraf DTP3 | sehingga kata pulih tidak dipakai | sehingga cakupannya belum dapat disebut pulih | meta-komentar tentang pilihan kata diganti pernyataan substansi |
| 8.1.2, paragraf KRB | Kelas risiko tinggi justru terpusat di Papua ... [@bnpb-2025-renas] | ... menurut tabel KRB dalam Rencana Nasional Penanggulangan Bencana (Renas PB) 2025–2029 [@bnpb-2025-renas] | Renas pertama di prosa (T-9); sumber tabel tidak dihitung T-9 |
| 8.1.2, paragraf KRB | Kartu analog pandemi ... karena itu tidak mengalikan | Oleh sebab itu, kartu analog pandemi ... tidak mengalikan | variasi penghubung |
| 8.2.1, paragraf DIBI | Kartu ... karena itu berlantai | Dengan demikian, kartu ... berlantai | variasi penghubung |
| 8.2.1, paragraf Renas | industri berbahan migas, kimia berbahaya, dan nuklir | industri berbahan migas dan kimia berbahaya serta industri nuklir | S-18 |
| Kartu 8.2, respons | Pemadaman, penyelamatan, dan penanganan bahan berbahaya kebakaran oleh pemerintah kab/kota | Pemadaman kebakaran oleh pemerintah kab/kota, termasuk penyelamatan dan penanganan bahan berbahaya | S-18 |
| Kartu 8.2, respons | limbah B3 | limbah bahan berbahaya dan beracun (B3) | singkatan belum dieja |
| 8.2.2, paragraf 1 | Hal ini dicatat sebagai fakta sampai peraturan tata ruang dibaca. | Kekosongan aturan zona untuk depo darat belum disimpulkan sebelum peraturan tata ruang dibaca. | "Hal ini" tanpa acuan jelas; pelaku dan batas simpulan disebut |
| 8.2.2, paragraf 3 | BNPB karena itu bukan regulator | Oleh sebab itu, BNPB bukan regulator | variasi penghubung |
| 8.3.1, paragraf 1 | Kata bersamaan dipakai hanya sebagai kutipan, karena kejadian yang tercatat tersebar dari Agustus sampai Oktober. | Kejadian yang tercatat tersebar dari Agustus sampai Oktober 2023, tidak serentak. | meta-komentar dibuang; fakta dipertahankan |
| 8.3.1, paragraf 1 | dari KLHK | dari Kementerian Lingkungan Hidup dan Kehutanan (KLHK) | singkatan belum terdaftar di glosarium, dieja |
| 8.3.1, paragraf 2 | TPST Sarimukti | Tempat Pengolahan Sampah Terpadu (TPST) Sarimukti | singkatan belum terdaftar di glosarium, dieja |
| 8.3.2, paragraf 1 | Porsi yang belum berhenti karena itu | Dengan demikian, porsi yang belum berhenti | variasi penghubung |
| 8.3.2, paragraf 2 | Pencegahan utamanya karena itu penutupan | Pencegahan utamanya adalah penutupan | variasi penghubung; predikat eksplisit |

Satu usulan sunting dibatalkan: "Dengan demikian, persyaratan analisis risiko bencana adalah satu-satunya titik temu" ditandai S-21 kalimat penutup bergaya, sehingga kalimat 8.2.2 paragraf 2 dikembalikan ke bentuk asal.

Token `{{angka:...}}`, rujukan pustaka, rujukan silang `@rek/@tbl/@gbr/@sub`, dan kutipan langsung yang sudah ada tidak berubah (dicek mesin: himpunan sebelum dan sesudah sama). Satu-satunya petik baru adalah istilah "kejadian luar biasa". Makna tidak diubah.

## Daftar periksa M-1 sampai M-14

- M-1 pasif penyembunyi pelaku: tidak ditemukan; penetap (Presiden, Menteri, kepala daerah, Bupati Tangerang) dan pencatat (BNPB, KLH/BPLH, Kementerian Kesehatan, WHO) tersebut.
- M-2 sinonim berputar: istilah konsisten (status keadaan darurat bencana, pembuangan terbuka, kegagalan teknologi, lantai tercatat).
- M-3 kalimat pertama mengulang judul: tidak ada.
- M-4 keberatan fiktif: tidak ada.
- M-5 angka ketik tangan: angka data bertoken; "tiga belas tahun", "tujuh kilometer", "tiga puluh persen", "empat helikopter", "enam bulan selama dua puluh tahun" adalah bilangan teks dari sumber yang dirujuk, bukan angka data kajian.
- M-6 sebab dari korelasi: penurunan imunisasi dan notifikasi TB ditulis tanpa klaim sebab; kaitan dengan pandemi berlabel penilaian kajian.
- M-7 paragraf satu gagasan: terpenuhi.
- M-8 subbab templat: tidak ada; tiga kartu skenario mengikuti direktif, bukan prosa templat.
- M-9 rekomendasi: kelima rekomendasi ringkasan berlembaga dan bertenggat.
- M-10 kontras "X, bukan Y": tiap kontras berlandas (pemutakhiran bukan pertentangan, anggaran penanganan bukan kerugian, BNPB bukan regulator keselamatan industri).
- M-11 register: formal ilmiah; "malah" diganti.
- M-12 tebal sebagai penekanan: tebal hanya pada kalimat pembuka temuan (L16) dan label ringkasan.
- M-13 kalimat bijak kosong: tidak ada.
- M-14 uji tukar logo: tidak berlaku untuk naskah.

## Catatan untuk sesi induk

- `bangun/kontrak/naskah.py` menolak bab ini dengan `kunci angka "nonalam.covid19.rasio_berlebih_terlapor.2020_2021" tidak ada di data/angka.json` (baris 15). Token itu sudah ada sebelum sunting dan tidak disentuh; kuncinya perlu ditambahkan pemilik paket angka.
- TPST, KLHK, Pusdatinkom, B3, dan DTP3 belum terdaftar di `data/glosarium.json`; T-10 akan menandai yang berhuruf kapital penuh sampai didaftarkan. Glosarium di luar cakupan lapis ini.
- KLB tetap memakai "kejadian luar biasa" berpetik pada kemunculan pertama: T-9 mewajibkan kepanjangan, sedangkan S-11 menandai frasa "luar biasa" tanpa petik. Bab 12 memakai bentuk tanpa petik dan menerima satu temuan S-11.
- Paragraf penjelas tanpa angka baru (8.1.1 paragraf 4, 8.1.2 kerugian, 8.2.1 paragraf Renas, 8.2.2 paragraf 3, 8.3.2 paragraf 2 dan 4) tidak berkalimat pembuka tebal karena bukan paragraf temuan.
