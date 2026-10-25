# QA substansi Bab 4 (rehab), lapis (b), 25 Okt 2026

Berkas: `naskah/rehab/bab-04.md`. Dibandingkan dengan `bukti/bab-04.md`, `bab-04.angka.json`, `data/angka.json`, `data/dibi/kejadian_besar.csv`, korpus Perban 5/2017.

## Hasil pemeriksaan

- Token angka: semua kunci `{{angka:...}}` di naskah ada di `bab-04.angka.json` atau `data/angka.json`; tidak ada yang hilang. Nilai dan label dicocokkan dengan bukti (total jenis jembatan 3.833, lima dan enam provinsi 49,2 dan 54,5 persen, tiga provinsi Sumatra 744, 57,1 persen rumah RB tiga provinsi, 75,40 persen Lombok).
- Pertanyaan kunci KERANGKA (rumah/jembatan/fasum per tahun dan jenis; provinsi dan kab/kota berulang; preseden dan kecepatan pulih) terjawab. Komponen terencana ada: empat gambar, Tabel preseden, Tabel perhatian ringkas, kotak perbandingan.
- Kewenangan: tidak ada klaim kewenangan baru di bab ini. Kata "terbukti" hanya muncul dalam penolakan (program preseden tidak terbukti). Lantai skenario: Sumatra memakai 1.181 jembatan (lebih berat dari 744), Cianjur menyebut dua versi RB, Padang diberi catatan kelas. Angka bertentangan (Cianjur, Sumatra rumah dan jembatan, Lombok) tertulis berdampingan.
- Masa R3P 90 hari dan 3 tahun dicek ke teks Perban 5/2017 Pasal 2 ayat (2) dan Pasal 10: cocok.

## Penyuntingan yang dilakukan

1. Daftar kejadian besar DIBI memuat jendela pilihan penyusun, bukan seluruh kejadian. Klaim "enam kejadian sejak 2009" dibatasi menjadi enam kejadian dalam daftar itu.
2. "Tujuh titik data" jembatan diperbaiki menjadi delapan (2018 sampai 2025).
3. Lonjakan jembatan 2025 tidak lagi disebut "berasal dari satu rangkaian" banjir November; 744 dari 1.088 mencakup semua kejadian 2025 di tiga provinsi, jadi dirumuskan "sebagian besar berada di tiga provinsi".
4. "Melipatgandakan lima sampai sepuluh kali" tidak punya dasar hitung yang jelas; diganti "di atas tiga kali lipat tahun tertinggi lainnya" (70.391 lawan 21.335 = 3,3).
5. Gempa 2018 ditulis "terutama" di Lombok dan Sulawesi Tengah (111.214 melampaui jumlah dua kejadian itu secara tak seketat klaim lama).
6. Klaim tsunami Palu masuk baris gempa dilunakkan menjadi "sebagian besar" (bukti hanya menyatakan sebagian besar).
7. Klaim bahwa beban Kalbar dan Sulsel "digerakkan kejadian menengah" tidak diperiksa per kab/kota; diganti pernyataan yang dapat dicek (puncak tidak bertepatan dengan kejadian dalam daftar kejadian besar).
8. Kalender musim hujan sebagai penanda akses darurat dijadikan penilaian kajian, dengan catatan jembatan gempa kurang tercatat.
9. Huntap Palu hampir dua kali masa R3P (5 tahun 8 bulan lawan 3 tahun) tetapi Palu IV (7 tahun 4 bulan) lebih dari dua kali; kalimat "kedua aset hampir dua kali" dikoreksi. Kalimat ringkasan bab diperjelas bahwa yang hampir dua kali masa R3P adalah waktu yang telah berlalu.
10. "BNPB sendiri mencatat 147.000" membingungkan karena DIBI juga milik BNPB; diganti "Rilis BNPB per 17 Desember 2025 menyebut".
11. Selisih sasaran Lombok Kemenko PMK (226.204) lawan DIBI (217.855) ditulis berdampingan sebagai angka bertentangan.
12. Rekompak dan CSRRP dijelaskan singkatannya; "belum ada evaluasi independen" diganti "penyusun tidak menemukan"; "posisi tertinggi dalam rubrik" diganti rumusan tingkat bukti yang dapat diperiksa.
13. "Permintaan data diarahkan ke" diganti "perlu diminta ke" karena permintaan belum dikirim.

## Catatan untuk lapis lain (tidak disunting)

- Rujukan halaman BRR berbeda untuk angka yang sama (hlm. xiii di paragraf pembuka subbab preseden, hlm. x di paragraf Padang); perlu dicek ke PDF sumber.
- Rekompak dan CSRRP bersandar pada kompendium program dan riset E tanpa entri pustaka sendiri di bab ini; bila ingin disitir, tambahkan entri.
- Judul deck A2 KERANGKA masih "Lima kejadian besar"; harus "Enam" (sudah tercatat di bukti).
- Gambar dan angka grafik tidak diperiksa di lapis ini; pemeriksaan token dengan pembaca `bangun/kontrak/naskah.py` belum dijalankan (butuh registri penuh).
