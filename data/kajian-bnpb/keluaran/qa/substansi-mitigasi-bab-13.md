# QA lapis (b) penyunting substansi: kajian mitigasi Bab 13

Berkas: `naskah/mitigasi/bab-13.md`. Pembanding: `naskah/mitigasi/bukti/bab-13.md` (P1 sampai P3, Bahan 13.5 dan 13.6,
Koreksi, Komponen), `bab-13.angka.json`, `bab-13.pustaka.json`, `data/angka.json`, KERANGKA §1 (M08), §2, §4 Bab 10, §5 Bab 13,
§6, naskah final `bab-09.md`, `bab-12.md`, `air/bab-10.md`. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- 118 token unik (117 sebelum suntingan) dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/*/bukti/bab-*.angka.json` (bab-13 menang) dan pustaka gabungan. Semua kunci ada, nilai cocok dengan berkas bukti dan
  registri bab asal, label sah; angka model (pita La Niña, mesin korban gempa, proksi tsunami, kematian asap) berlabel estimasi
  model dan selalu di samping angka tercatat. `baca()` atas bab utuh (`status: final`) lulus sebelum dan sesudah suntingan.
- Hitungan register dicek ulang dari blok `rek`: 36 rekomendasi, 27 internal dan 9 lintas K/L, 12 dalam 100 hari, 19 pada
  2026–2027, 5 pada 2028–2030; kisi prioritas memuat ke-36 kode sesuai horizon; Direktorat Kesiapsiagaan memimpin 8.
- `qa/slop.py --final`: LOLOS, skor 0 (satu S-18 rendah pada legenda kode K/P/R/I, yang memang daftar kode). Em dash dan titik
  tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Komponen 13.5 | KERANGKA §5 Bab 13 mewajibkan "perubahan target Renas lewat jalur bencana" di daftar yang tidak direkomendasikan; baris itu tidak ada di naskah maupun berkas bukti | Ditambah baris berdasar Renas hlm. 123–125 (bukti T2.5): jalur bencana paling lambat 2028 hanya program dan kegiatan; target lewat jalur berkala 2027 (@rek:r-a05), target perumahan 3.1.2.c lewat jalur bencana (@rek:r-m23). Kalimat pengantar "Sepuluh" menjadi "Sebelas" |
| 2 | Tabel keputusan 14 hari | KERANGKA §6 butir (7), penugasan memuat rekomendasi kedua kajian ke evaluasi tahunan Renas PB 2026, hilang | Ditambah baris di bawah @rek:r-a05 (Direktorat Pengembangan Strategi PB; Biro Perencanaan) dan indikator r-a05 dilengkapi |
| 3 | Blok r-m03 | Status `dikembangkan` bertentangan dengan KERANGKA §1 M08 ("instrumen Usulan baru") dan naskah final Bab 9 dan Bab 12 (Usulan baru) | Status menjadi `baru`; atribut `program` dicabut |
| 4 | Ringkasan, Angka kunci | Angka korban LKIP (1.666 dan 214) tampil sendiri, sedangkan butir Temuan memakai DIBI (1.956); dua angka resmi bertentangan tidak berdampingan | Ditambah DIBI per 23 Oktober 2026 (1.735 dan 221, bencana alam) di butir yang sama |
| 5 | 13.1 paragraf 2 | "Kedua angka resmi itu ditulis berdampingan" adalah meta-komentar | "Kedua angka resmi itu sama-sama tertinggi sejak 2018" |
| 6 | Paragraf KD-4 | "keduanya ditulis berdampingan dan tidak dirata-rata" meta-komentar | "keduanya tidak dapat dirata-rata" |
| 7 | Pita KD-3 (a) | Spasi ganda; "jarak ke 90% 40 poin persen" tidak terbaca | "jaraknya ke 90% sebesar 40 poin persen" |
| 8 | Pita KD-3 (b) | "469 kab/kota yang menilai IKD 2025 belum mencakup semua kab/kota" tanpa penyebut | "baru 469 dari 514 kab/kota yang menilai IKD 2025" |
| 9 | 13.3 kalimat pembuka | "beban ... jatuh pada Deputi Bidang Pencegahan dan Deputi Bidang Penanganan Darurat" tidak diturunkan dari angka Direktorat Kesiapsiagaan | Diganti tiga rekomendasi 100 hari Direktorat itu (r-a02, r-a08, r-a09) yang bertepatan dengan puncak musim hujan |
| 10 | 13.3 paragraf 1 | "hampir semua rekomendasi" tanpa angka | "tiga puluh dua dari tiga puluh enam" (bukti I3.6) |
| 11 | 13.3 paragraf program | Kalimat pembuka bertata bahasa ganda ("Tidak satu pun dari 25 program ... yang berbukti kuat berasal dari dalam negeri") | "Kedua program berbukti kuat di antara 25 program dalam kompendium berasal dari luar negeri" |
| 12 | Paragraf legenda kurung | Meta-komentar empat kalimat | Dipadatkan jadi satu kalimat legenda kode |
| 13 | r-a17 rincian | "bukan Data Bencana menurut Perban 1/2023" melebihi teks; bukti T3.10: Perban hanya menetapkan produsen = unit kerja BNPB | Ditulis sebagai turunan dari ketentuan produsen |
| 14 | r-a06 rincian | 19,68% tanpa sumber pengutip; label registri "dikutip lembaga negara dari LHP BPK yang tidak dibuka" | Disebut Badan Keahlian DPR dan dirujuk [@dpr-2022-deteksi-dini], sama dengan Bab 10 kajian air |
| 15 | r-m10 indikator | "nomenklatur Perpres 90/2025" tanpa entri pustaka (sisa QA Bab 9 butir 3) | "nomenklatur kementerian yang berlaku" |
| 16 | r-m15 rincian | "sebagian besar TPA" tanpa angka | Token `nonalam.tpa.belum_berhenti_porsi` (sekitar 70–76%, akhir 2025) |
| 17 | 13.4 paragraf pembuka | Koordinasi Mendagri dirujuk ke UU 7/2012 Pasal 49; pasal itu hanya memuat unsur Satgas | Koordinasi dirujuk ke PP 2/2015 Pasal 97, unsur Satgas ke UU 7/2012 Pasal 49 ayat (2) (sama dengan Bab 9) |
| 18 | Tabel 13.6 | Stok logistik per gudang terhadap lantai (celah baru Bab 11, permintaan keputusan 14 hari butir 4) tidak tercantum | Ditambah baris, tertaut @rek:r-a04; pengantar "Delapan" menjadi "Sembilan" |
| 19 | Ringkasan butir 3 | "ternyata" tidak formal | "adalah" |

## Diperiksa dan tidak diubah

- Pertanyaan kunci 1 sampai 3 terjawab: kisi 4 × 2 delapan kesimpulan berangka dengan rujukan temuan dan bab; pita KD-1 sampai
  KD-3 dengan akibat tiap pilihan; KD-4 sebagai rekomendasi 100 hari (r-m01) dengan alasan; matriks rekomendasi per horizon dan
  unit. Komponen KERANGKA ada: kisi kesimpulan, pita keputusan, matriks internal dan lintas K/L, kisi prioritas (36 > 9), daftar
  13.5, tabel 13.6. Tesis memakai token alam `tesis.mitigasi.alam` (V06).
- Lantai: tidak ada skenario di bawah angka tercatat terburuk; pita La Niña (520–1.200) hanya pembanding lantai 1.692; musim El Niño
  kuat ditulis sebagai ekspektasi; lantai kemarau, logistik, dan megathrust memakai kejadian tercatat.
- "Terbukti": hanya dipakai untuk menolak klaim (Destana, SPAB, InaTEWS, hibah mitigasi Amerika Serikat); paket Bangladesh disebut
  berbukti kuat dan hanya lewat padanan.
- Angka bertentangan berdampingan: korban 2025 LKIP lawan DIBI; IRB 2024 128,52 lawan 171,95; rasio Renas 1.a 3,1 (alam) lawan 3,6
  (semua klasifikasi); kapasitas empat angka dua penyebut (62%, 50%, 56,2%, 38,0%).
- Kewenangan: BNPB menetapkan persyaratan analisis risiko, keselamatan industri tetap pada Menteri ESDM, Perindustrian, dan
  Ketenagakerjaan (r-m11); KLB pada UU 17/2023 dan Kemenkes (r-m07); TPA lini pertama kab/kota (UU 18/2008 Pasal 9); Renstra butuh
  persetujuan Kementerian PPN/Bappenas; alat ukur kapasitas diubah lewat Kepka.
- Angka model berlabel: 23.600 jiwa tsunami (pembacaan rumus, asumsi kebijakan); korelasi Spearman (analisis penyusun).

## Sisa untuk orkestrator (di luar berkas ini)

1. Status r-m03: `bab-08.md` ringkasan dan berkas bukti Bab 13 (T3.13, I3.1) masih "Sudah ada, perlu dikembangkan"; naskah Bab 9,
   Bab 12, Bab 13, dan KERANGKA M08 kini "Usulan baru". Ringkasan Bab 8 perlu diselaraskan.
2. Butir (7) keputusan 14 hari kini di tabel Bab 13 (lewat r-a05); berkas bukti Bab 13 I2.7 masih menyebut KERANGKA §6 "enam butir"
   dan mengusulkan izin prakarsa sebagai butir ketujuh. Pemilik register perlu memutus apakah izin prakarsa (r-m02) menjadi butir
   kedelapan atau menggantikan salah satu.
3. Baris 13.5 "perubahan target Renas lewat jalur bencana" belum ada di berkas bukti Bahan 13.5 (T4.x); sumbernya T2.5. Tambahkan
   T4.11 baru agar bukti dan naskah sama.
4. Panjang bab jauh di atas target 4 halaman (5.170 kata, 36 blok `rek`). Komponen berkas bukti mengizinkan matriks 2026–2027 dan
   2028–2030 diringkas ke kode dan langkah dengan isi lengkap di Lampiran I; keputusan tata letak ada pada perakit DOCX.
5. `tesis.mitigasi` di `data/angka.json` masih versi semua klasifikasi; naskah memakai `tesis.mitigasi.alam` dari `bab-13.angka.json`.
   Ringkasan Eksekutif dan slide Pesan Kunci mitigasi wajib memakai kunci yang sama (gerbang D-6), dan kunci bab-13 belum digabung ke
   registri utama.
6. `nonalam.tpa.belum_berhenti_porsi` berbentuk teks rentang; opsi `|teks` wajib (tanpa opsi, `suntik` gagal karena nilai string).
