# QA lapis (b) penyunting substansi: kajian mitigasi Bab 6

Berkas: `naskah/mitigasi/bab-06.md`. Pembanding: `naskah/mitigasi/bukti/bab-06.md`, `bab-06.angka.json`, `data/angka.json`
dan `naskah/mitigasi/bukti/bab-*.angka.json`, KERANGKA §2 (butir 5, 9, 10, 12, 14, 17), §5 Bab 6, §7 butir 1–9, KEPUTUSAN
T14. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- 171 token angka unik di Bab 6 dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/mitigasi/bukti/bab-*.angka.json` (bab-06 menang) dan pustaka gabungan; `baca()` + `nomori()` atas Bab 6 bersama
  Bab 13 lulus setelah suntingan (rujukan `@rek:` terselesaikan di Bab 13). Semua kunci ada, nilai cocok dengan berkas
  bukti, label sah.
- `qa/slop.py --final`: LOLOS, skor 0. Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan bab butir 2 | Lantai 5.749 ditulis sebagai lantai megathrust tanpa keterangan bahwa Yogyakarta 2006 gempa sesar darat; KERANGKA §2 butir 9 menyebut Pangandaran 2006 sebagai lantai megathrust selatan Jawa | Ditulis "gempa sesar darat Yogyakarta 2006 untuk guncangan" dan "tsunami Pangandaran 2006", beserta alasan kartu memakai lantai (pita lebih dari satu orde) |
| 2 | Subbab 6.1 paragraf lantai | Sama: Yogyakarta 2006 dan Padang 2009 tidak disebut bukan megathrust (bukti P2 Inferensi uji lantai) | Ditambah "bukan gempa megathrust: Yogyakarta 2006 sesar darat, Padang 2009 intraslab"; alasan tidak menaikkan batas bawah pita Mentawai ditulis sesuai bukti |
| 3 | Ringkasan butir 3 | "Besar efeknya hanya dari model atau Jepang" melewatkan sumber tuas erupsi (perkiraan penulis Surono dkk.); perbaikan pertama memicu tiga-serangkai S-18 | Ditulis "besar efek kedua tuas belum diukur di Indonesia" (bukti P4 Inti) |
| 4 | Paragraf setelah Tabel status | Pembuka tebal berisi riwayat koneksi InaRISK ("tiga percobaan"), meta-proses tanpa nilai bagi pembaca | Pembuka tebal diganti temuan berangka: korelasi IRBI dan DIBI 0,23 dan 0,25, KRB per kab/kota tidak tersedia (L16) |
| 5 | Subbab 6.1, skenario platform | Rentang "0,0–5,5 juta" skenario ilustratif M8,5: nilai tengah 0 artefak magnitudo (catatan kunci `geologi.jawa.jiwa_mmi7`), pita tak terhingga orde | Angka dibuang; kalimat hanya menyatakan skenario di bawah Mmaks tidak dipakai |
| 6 | Subbab 6.1, mesin korban | Token `geologi.analog_guncangan.rasio|rentang|fmt=3` tampil "0,016–0,200%" padahal bukti 0,197%: pembulatan dua angka bermakna estimasi model lalu diberi tiga desimal | Diganti median (sekitar 0,047%) |
| 7 | Kartu megathrust selatan Jawa, kepekaan | KERANGKA §5 Bab 6 Komponen: Kartu 6.1 wajib kepekaan Mw 8,9 per segmen; baris tidak ada | Ditambah baris magnitudo: Mw 9,1 gabungan (0,83%) lawan Mw 8,9 per segmen (1,24%), korban "tidak dihitung: skenario belum dijalankan platform" |
| 8 | Kartu megathrust selatan Jawa, kepekaan | "Jam kejadian" di kolom tuas, padahal bukti P4 butir 10: kondisi, bukan tuas | Diberi keterangan "(kondisi, bukan tuas)" |
| 9 | Subbab 6.2 paragraf Mmaks; dasar kartu sesar darat | "Ketiganya lebih besar daripada Yogyakarta 2006 dan Cianjur 2022" keliru: Cimandiri segmen Citatah Mw 6,3 sama dengan Yogyakarta 2006 Mw 6,3 (bukti P3 butir 1 dan 3, Inferensi) | Ditulis per pasangan sesuai bukti: Opak di atas Yogyakarta 2006; Lembang dan Cimandiri di atas Cianjur 2022 |
| 10 | Subbab 6.3 paragraf daftar perhatian | "Tiga syarat gagal bersamaan di pantai selatan Jawa" keliru: kab pantai selatan Jawa Tengah, DIY, Jawa Timur memenuhi syarat proksi (bukti P1 butir 7) | Dipisah: Jateng, DIY, Jatim satu syarat; lima kab Jawa Barat nol syarat, dengan sebabnya |
| 11 | Subbab 6.3 paragraf KRB tsunami | Kalimat koreksi internal "data sekolah sembilan provinsi berlaku untuk mesin platform" (catatan pembaruan status data untuk penulis, bukan temuan) | Dihapus |
| 12 | Subbab 6.6.1 paragraf tuas | Faktor efek tuas (0,35; 0,437; rentang 0,077–0,437) di prosa badan; bukti P4 Inferensi dan KERANGKA §2 butir 10: efek tuas hanya di kartu dan Gambar 6.3 berpil | Angka dikeluarkan dari prosa; kalimat merujuk kartu dan @gbr:tuas-geologi; "paling hati-hati dari delapan kombinasi kasus" tetap tanpa angka |
| 13 | Subbab 6.6.1 paragraf waktu tiba | Rasio tsunami Mentawai 2010 (sekitar 4,1%) dikutip, padahal kuncinya berlabel "orde besaran, belum layak dikutip" (bukti P2 butir 8) | Angka dibuang; rasio disebut tanpa nilai |
| 14 | Tabel pembanding kerugian, baris Merapi 2010 | Keyakinan "resmi" untuk baris yang hanya berisi stimulan (hitungan kajian) | "asumsi-kebijakan" |
| 15 | Tabel kesenjangan data, baris PuSGeN | "Periode ulang sesar busur belakang Flores tidak tersedia": bukti P3 Celah menulis belum dibaca dari PuSGeN 2024, bukan tidak tersedia | Dipisah: Sumba tidak tersedia; Flores belum dibaca; geometri belum dipakai mesin |
| 16 | Enam kartu, medan `lembaga` | "Kementerian Energi dan Sumber Daya Mineral"; KERANGKA §2 butir 14 dan Bab 13 memakai "Kementerian ESDM (Badan Geologi)" | Diseragamkan |
| 17 | Akhir bab: dua `matriks-rekomendasi` (r-m05, r-m17, r-m19) | KERANGKA §2 butir 17: rekomendasi hanya di bab kesimpulan; ketiga ID juga didefinisikan di `bab-13.md` dengan isi berbeda (jenis, kl, indikator), sehingga ID ganda | Blok dihapus, sama dengan keputusan Bab 3; rujukan `@rek:` di ringkasan dan kartu tetap dan menunjuk Bab 13 |

## Diperiksa dan tidak diubah

- Lantai (KERANGKA §2 butir 9): megathrust Jawa guncangan Yogyakarta 2006 (5.749, terverifikasi) dan tsunami Pangandaran
  2006 (665 dan 65 hilang); Mentawai guncangan Padang 2009 (1.195) dan tsunami Mentawai 2010 (447 dan 56 hilang); Selat
  Sunda 2018 (437 dan 16); nasional Aceh 2004 (127.720 dan 93.285, resmi menurut KEPUTUSAN T14). Pita model Mw 9,1
  (10.720–136.032, lampiran) di atas lantai Jawa. Tidak ada skenario di bawah lantai di badan teks atau kartu.
- Larangan tampil: pita korban guncangan (12,7 kali), pengungsi (44 kali), rumah rusak, kerugian skenario tidak tampil;
  korban tsunami tidak dikuantifikasi; angka model berlabel dan bersanding angka tercatat (mesin 560 lawan 5.749; Padang;
  sapuan Merapi lawan 386; proksi pesisir lawan renkon Banyuwangi; pengungsi model lawan tercatat).
- Angka bertentangan berdampingan: Cianjur DIBI lawan R3P (korban dan rumah rusak), Yogyakarta USGS lawan Bappenas, rumah
  hancur Bappenas dua versi, Sulteng DIBI lawan USGS.
- "Terbukti": tidak ada program disebut terbukti. Destana dan SPAB "belum terbukti" dengan arti tertulis; InaTEWS "hulu
  terukur, dampak belum dievaluasi" (kompendium menulis sedang; naskah mengikuti bukti P4 butir 6); Chile dan Kamaishi
  lewat padanan di Indonesia.
- Kewenangan: BMKG untuk InaTEWS dan sarana diseminasi (Renas 1.1.2.d); Badan Geologi untuk gunung api; BNPB tidak
  disebut regulator; produsen keluaran platform tertulis di tiap gambar dan kartu model.
- Pertanyaan kunci 1–4 KERANGKA terjawab (6.0 dan Tabel status; 6.1 dan 6.3; 6.2, 6.4, 6.5; 6.6.1). Komponen ada:
  Gambar 6.1 tsunami, 6.2 MMI, 6.3 tuas; Kartu 6.1 sampai 6.6; Tabel 6.2 pembanding kerugian; tambahan Tabel status,
  Tabel program, Tabel kesenjangan.
- Kemungkinan kartu: megathrust Jawa pita 2 (0,83%), Mentawai pita 3 (1,50%), tsunami pita 2; analog "tidak dinilai"
  beralasan.

## Sisa untuk orkestrator (di luar berkas ini)

1. Tabel 6.1 rasio analog guncangan dan tsunami (KERANGKA Komponen, `analog.csv`) tidak ada di naskah; bukti bagian
   Komponen memindahkannya ke Lampiran F bila Tabel status dan Kartu 6.6 ditambah. Lampiran mitigasi belum ada di
   `naskah/mitigasi/`; pita korban, pengungsi, rumah rusak skenario dan rentang faktor 0,077–0,437 juga dijanjikan ke
   lampiran.
2. Berkas gambar `gambar/mitigasi/bab06-*.png` (tiga gambar, enam peta kartu) belum ada; folder `gambar/mitigasi/` belum
   ada.
3. `surono.merapi2010.jiwa_terselamatkan` di `bab-04.angka.json` berlabel estimasi-model, sedangkan KERANGKA §5 Bab 6 dan
   bukti Bab 6 menulis Terverifikasi (perkiraan penulis). Putuskan satu label saat registri digabung.
4. Konflik satuan `r3p.cianjur2022.kerusakan_kerugian` (bab-03 dalam triliun lawan bab-06 dalam rupiah) masih terbuka dari
   QA Bab 3; Bab 6 memakai `|rupiah` dan tampil benar dengan registri bab-06.
5. Penampil `format_angka` memberi tiga desimal pada rentang estimasi model yang batas atasnya dibulatkan dua angka
   bermakna ("0,200"); kesan presisi palsu. Pemilik `bangun/` dapat memangkas nol di belakang.
6. Kartu NTT gempa Laut Flores 2026 (usulan Kartu 6.6 bukti) menunggu keputusan perluasan periode acuan; naskah
   menyebutnya analog tanpa kartu.
7. ID rekomendasi r-m05, r-m17, r-m19 di Bab 13 berbeda isi dengan versi yang dihapus dari Bab 6 (kl r-m05 kini Badan
   Geologi; indikator r-m19 tidak lagi memuat Destana). Bila isi Bab 6 yang dihapus lebih tepat, pemilik Bab 13 yang
   memutuskan.
