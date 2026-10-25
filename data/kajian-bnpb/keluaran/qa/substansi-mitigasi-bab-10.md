# QA lapis (b) penyunting substansi: kajian mitigasi Bab 10

Berkas: `naskah/mitigasi/bab-10.md`. Pembanding: `naskah/mitigasi/bukti/bab-10.md`, `bab-10.angka.json`,
`bab-10.pustaka.json`, `data/angka.json`, `data/lembaga/celah.csv`, `data/program-terbukti/kompendium_program.csv`,
`naskah/mitigasi/bab-08.md` (pengait status epidemi, rezim keselamatan industri), KERANGKA §2 dan §5 Bab 10, register
rekomendasi di `bab-13.md`. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- 80 pasangan token unik dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/mitigasi/bukti/bab-*.angka.json` (bab-10 menang) dan pustaka gabungan: semua kunci ada, nilai cocok dengan
  berkas bukti (39/34/24/20/4/5/12/8/8/7/21 sel; 6 dan 11 peraturan; 30/5/25 objek; 92,86% lawan 93,91%; 315/190/3
  dari 508; 1.692 = 1.506 + 186; 1.021 dan 1.689 berlabel asumsi-kebijakan), label sah. `baca()` atas bab utuh dengan
  `status: final` lulus setelah suntingan.
- `qa/slop.py --final`: LOLOS, skor 0, tanpa temuan tersisa. Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan bab, r-m10 | Judul langkah dan pemimpin K/L ("koordinator enam klaster") tidak sama dengan blok `rek` di `bab-13.md` (kl: –) | Disamakan dengan blok `rek` |
| 2 | Regulasi, paragraf Perpres 46/2026 | KLB ditulis "berjalan terpisah" dari status darurat bencana, bertentangan dengan Bab 8: pengait skala nasional ada di UU 17/2023 Pasal 369–370 | Ditulis: terkait hanya skala nasional; pengait provinsi dan kab/kota tidak ditemukan pada peraturan yang dibaca |
| 3 | Regulasi, paragraf peringatan dini | Ketiadaan sambungan PP 30/2024 Pasal 96 ke Perban 2/2024 ditulis sebagai fakta (bukti: disimpulkan penyusun, C17) | Ditandai "kajian tidak menemukan norma" |
| 4 | Regulasi, paragraf pola celah | Kalimat selisih waktu diulang dua kali; simpulan "norma paling tidak terhubung" tanpa tanda inferensi | Satu kalimat dibuang; simpulan ditandai "Kajian menilai" |
| 5 | Tabel 10.1 baris C09 | Topik lama paket tanpa pengait nasional (lihat no 2) | Ditambah "pengait hanya pada skala nasional (UU 17/2023 Pasal 369–370)" |
| 6 | Tabel 10.1 baris C14 | "Penanggung jawab nasional kebakaran industri belum ditemukan" bertentangan dengan 10.8 bab ini dan Bab 8 (tiga menteri sektor; BNPB bukan regulator keselamatan industri) | Topik dan lembaga ditulis ulang menurut Bab 8: pengawasan pada tiga menteri sektor; titik temu Perka BNPB 5/2008 teksnya tidak tersedia. Sumber dan catatan tabel menyebut penyesuaian |
| 7 | Tabel 10.2 catatan | Kolom versi lama dari berita instansi (sekunder) di tabel berpil resmi | Catatan menyebutnya sekunder terhadap keputusan |
| 8 | Data, paragraf Perban 1/2023 | "karena itu ... harus lewat Forum Satu Data" ditulis sebagai akibat pasti (bukti: Inferensi tim, "hasil membaca definisi") | Ditulis "Dibaca dari definisi itu" |
| 9 | Kartu temuan logistik, Dampak | "satu-satunya kesenjangan yang perbaikannya sudah masuk Progsun 2026" dibantah bab ini sendiri (Progsun butir 3, analisis risiko perizinan); kalimat status juga bukan dampak | Dibuang; Dampak memakai fakta gudang tidak terbuka |
| 10 | Kesenjangan bukti, paragraf 2 | Daftar tiga jenis alam terbaca tiga-serangkai | Diganti rujukan ke Gambar 10.1 |
| 11 | Kesenjangan bukti, paragraf 3 | "sel itu ditulis tanpa program" keliru untuk prabencana gunung api dan longsor, yang berkategori lemah (Destana, SPAB) | Ditulis: tanpa program di tanggap darurat dan pascabencana, lemah atau belum terbukti di prabencana |

## Diperiksa dan tidak diubah

- Lantai: bab tidak memuat kartu skenario. Hitungan kepekaan peringatan dini (1.021 dan 1.689) berlabel
  asumsi-kebijakan, bersanding lantai tercatat 1.692 (DIBI), keduanya di atas nol dan tidak di bawah lantai sebagai
  angka tercatat; disertai catatan bahwa kedua indikator diperlakukan setara padahal definisinya beda, tidak di judul.
- Angka bertentangan berdampingan: 6% / 6,00% / 6,10% / 11.060 per 100.000 (Tabel 10.3, tanpa menyatakan salah satu
  keliru); kapasitas 62% dan 67% lawan 38%; klaster kesehatan BPK lawan Kepka 308/2024; tahun Kepka 173 (2014/2015);
  R3P Cianjur Keputusan lawan Peraturan Bupati; master plan MHEWS lawan rencana induk BPK; patahan DIBI 2024 (koreksi).
- "Terbukti": InaTEWS dan PAMSIMAS ditulis berbukti sedang; Destana dan SPAB belum terbukti; kartu 10.8 menyatakan tidak
  ada program dalam negeri yang dapat diusulkan sebagai program terbukti; Tabel 10.4 menyatakan dipertahankan bukan
  berarti terbukti.
- Kewenangan: Perpres status (UU 24/2007 Pasal 7 ayat (3)), tafsir MK 3 dari 5 indikator, KLB pada kepala daerah dan
  Menteri (UU 17/2023), konflik (UU 7/2012 Pasal 16–20), TPA pada kab/kota (UU 18/2008 Pasal 9), mandat keselamatan
  industri pada menteri sektor. Temuan BPK seluruhnya beratribusi IHPS II 2024.
- Klaim R3P Cianjur "tanpa nomor penetapan" dari KERANGKA tidak dipakai (bukti 13a menolaknya); naskah sudah benar.
- Angka sekunder (19,68% IBF, R3P Lombok Rp11,44 triliun, daftar 8 klaster sebagai kunci) tidak masuk badan teks.
- Rekomendasi r-m04, r-m06, r-m08, r-m12, r-m13, r-m14, r-m17, r-m19, r-a10 ada di `bab-13.md`; ringkasan r-m06,
  r-m12, r-a10, r-m13 cocok.
- Pertanyaan kunci 1–5 KERANGKA terjawab (subbab 10.1, 10.2, 10.3, 10.4, 10.8); kartu temuan 10.1–10.8, Tabel 10.1–10.3,
  Gambar 10.1 ada. Kotak 10.1 (B5.5) disajikan sebagai Tabel 10.4 berargumen tandingan, mengikuti preseden kajian air
  Bab 7 yang sudah final.

## Sisa untuk orkestrator (di luar berkas ini)

1. Direktori `gambar/mitigasi/` belum ada: berkas Gambar 10.1 (`bab10-g16-sel-bukti-program.png`) belum dibuat; data
   selnya belum punya berkas paket (usul `program-terbukti/sel_mitigasi.csv`).
2. `lembaga/celah.csv` C09 dan C14 masih memuat simpulan lama; Tabel 10.1 kini memakai pembacaan Bab 8 (pemilik paket
   `lembaga`, `pipa-data`).
3. Penggabungan `bab-10.angka.json` ke `data/angka.json` (11 entri salinan dari bukti bab-03, bab-04, bab-07 identik
   dengan sumbernya; cukup salah satu).
4. KERANGKA §5 Bab 10 masih menulis R3P Cianjur "tanpa nomor penetapan" dan "isi temuan BPK belum dibaca" (Koreksi di
   berkas bukti).
5. Progsun 2026 butir 4 (Perban 5/2024 lawan 5/2017) dan dua judul SK 308/2024 di Juklak 16/2025 menunggu lampiran
   Penyelarasan dokumen BNPB.
