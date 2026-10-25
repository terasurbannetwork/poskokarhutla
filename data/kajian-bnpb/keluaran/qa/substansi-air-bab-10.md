# QA lapis (b) penyunting substansi: kajian air Bab 10

Berkas: `naskah/air/bab-10.md`. Pembanding: `naskah/air/bukti/bab-10.md`, `bab-10.angka.json`, `data/angka.json`
dan `bab-01` sampai `bab-09.angka.json`, KERANGKA §2, §4, §6, PEDOMAN §B5.25, §B5.28, §D (D-27), Buku Pegangan L16,
L60, L61, L63, L64. Diperiksa 24 Oktober 2026.

## Pemeriksaan mekanis

- 66 token angka unik (kunci dan opsi) dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan
  `data/angka.json` + `naskah/air/bukti/bab-*.angka.json`: semua kunci ada, nilai tampil cocok dengan berkas bukti, label
  keyakinan sah. `baca()` atas bab utuh lulus tanpa galat.
- `qa/slop.py --final`: LOLOS, skor 0. Em dash dan titik tengah: nol.
- Catatan: hanya 13 dari 66 kunci yang dipakai ada di `data/angka.json`; 53 lainnya baru ada di
  `naskah/air/bukti/bab-NN.angka.json` (12 dari bab-10, 41 dari bab-01 sampai bab-08). Bab ini gagal dibangun sampai registri digabung.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan bab butir 3; kisi kesimpulan K8 | Token `lembaga.air.baris_bnpb` bernilai 0 tampil "0 dari 31"; di kisi, kurung "23 baris tertulis" terbaca sebagai rincian baris BNPB | Ditulis "Tidak satu pun dari 31 baris ... (23 tertulis ...) menyebut BNPB" sesuai T1.22 |
| 2 | Kisi K2 | "0 korban meninggal" sebagai pembuka; angka 2026 tanpa tanda sementara | Kalimat dibalik ke jangkauan kekeringan, "tanpa korban meninggal 2015–2026"; 2026 diberi "(sementara)" (T1.3) |
| 3 | Kisi K6 | "Lantai korban Jawa berasal dari jebolnya tanggul Situ Gintung" melebihkan; Situ Gintung 193 dari 270 | Disisipi token `hidromet.jawa.lantai.porsi_situgintung_persen` (71,5%) (T1.6, T2.15) |
| 4 | Kisi K7 | "dengan 0 meninggal dan hilang" | "tanpa korban meninggal dan hilang" (T1.19) |
| 5 | Subbab 10.3 paragraf 1 | "Kelompok internal memuat rekomendasi yang dipimpin unit BNPB" salah: semua 22 baris dipimpin unit BNPB; aturan register adalah pemimpin program/instrumen (I3.1, KERANGKA §2 butir 14). "Tujuh rekomendasi" tidak menyebut bahwa tiga di antaranya lintas K/L | Kalimat kelompok diganti dengan aturan register; kalimat pembuka menyebut "tujuh dari dua puluh dua rekomendasi internal dan lintas K/L" |
| 6 | Kisi prioritas | Kode tidak urut (r-a08 sebelum r-a07, r-a11 sebelum r-a10, r-a21 sebelum r-a19) padahal B5.28 meminta urut kode | Diurutkan |
| 7 | R-A05, R-A17 kolom dasar | Tanpa kode "Temuan X.n"; D-27 mewajibkan ≥ 1 kode per baris rekomendasi | R-A05 diberi Temuan C.1 (peninjauan Renas membuka penyelarasan target R-A10); R-A17 diberi Temuan C.2 (peran data BNPB). Pemetaan ini penilaian penyunting, bukan isi berkas bukti |
| 8 | R-A13, R-A22 | "berposisi belum terbukti" mencampur kolom `kekuatan` dan `posisi` kompendium (posisi P10, P15 = wajib evaluasi dampak) | Ditulis "kekuatan bukti ... adalah belum terbukti" (T2.16, T4.9a) |
| 9 | R-A07 | "BPBD hilir lewat Dewan SDA Nasional": BPBD tidak duduk di Dewan SDA Nasional (Perpres 53/2022) | Jalur daerah ditulis "BPBD hilir" |
| 10 | Subbab 10.4, paragraf Novita | Angka model genangan rob tanpa angka tercatat di sampingnya; "Kajian tidak menolak tanggul. Posisi kajian adalah ..." bernada meta | Ditambah kalimat bahwa luas genangan teramati belum tersedia (T1.19, I1.5), dirujuk ke tabel 10.6; kalimat posisi dipadatkan |
| 11 | Subbab 10.6 paragraf pembuka | Menyebut hanya debit dan air minum sebagai yang tak bertaut, padahal tiga baris tanpa rekomendasi (rob, debit dan air minum, awal musim); kalimat DIBI sementara mengulang paragraf 10.1 | Ditulis "tiga kelompok sisanya"; ulangan dibuang |

## Diperiksa dan tidak diubah

- Lantai skenario: R-A04, R-A08, R-A09 dan kisi K3 tidak memakai skenario di bawah lantai tercatat per metrik (270; 525.861
  dengan versi lain 532.321 berdampingan; 6.905; 76 kab/kota dan 4.924.057 terdampak). Pita model La Niña 250–550 tampil
  berlabel estimasi model di samping lantai, dengan catatan batas bawahnya di bawah lantai.
- "Terbukti": hanya P16 (Tokyo, Osaka, Bangkok; luar negeri) disebut berbukti kuat; PAMSIMAS berbukti sedang dan berakhir
  2023; program dalam negeri lain sebagai evaluasi dampak. Sesuai T1.20, T1.23, I3.5.
- Angka bertentangan ditulis berdampingan: lantai pengungsi dua versi; proyeksi Pekalongan 42,8 cm (GNSS) dan 21,5 cm
  (patok), keduanya asumsi kebijakan; GNSS 10,7 cm lawan InSAR 16 cm per tahun tanpa diperingkat.
- Kewenangan: KD-2 dirumuskan "memutuskan apakah mengusulkan" karena perubahan Renstra butuh persetujuan Bappenas (Perpres
  80/2025 Pasal 22, 26–29); KD-5 lewat Kemenko PMK dan Dewan SDA Nasional; BNPB sudah kontributor Renas 2.4.4.a (kotak
  koreksi); DSP tidak diperluas (Perban 4/2020 Pasal 20). Tidak ada klaim BNPB sebagai regulator air.
- Pertanyaan kunci KERANGKA §4 Bab 10 terjawab: delapan kesimpulan (kisi 4 × 2), tiga KD dengan akibat dua pilihan, 22
  rekomendasi per horizon dan unit (12 internal, 10 lintas K/L, cocok dengan I3.1). Komponen B5.25, B5.13, B5.28, daftar
  10.5 (12 butir) dan tabel 10.6 ada. Langkah tiap rekomendasi paling banyak 8 kata.
- Angka 20 November 2026 sebagai batas hari ke-0 cocok dengan aritmetika (20 November + 100 hari = 28 Februari 2027).

## Sisa untuk orkestrator (di luar berkas ini)

1. KERANGKA §6 masih menulis KD-2 "Menyelaraskan target ..." dan KD-5 (a) "BNPB menjadi kontributor Renas 2.4.4.a pada
   peninjauan"; keduanya bertentangan dengan teks primer (bukti T2.3, T2.5). Pita Pesan Kunci dan slide 13 harus memakai
   rumusan Bab 10, bukan KERANGKA §6 (B5.25 mewajibkan isi identik).
2. Gabungkan `naskah/air/bukti/bab-*.angka.json` dan `bab-*.pustaka.json` ke registri; `pustaka.json` gabungan memuat entri
   penulis tanpa `family` sehingga `Konteks._akhiran_tahun()` galat (`KeyError: 'family'`). Entri itu harus diperbaiki sebelum
   bangun DOCX.
3. Kisi prioritas tetap berbaris dampak kosong sampai kelas skala dampak Bab 3 Tabel 3.4 dikunci; baris "Belum dinilai"
   adalah keadaan sementara yang sah menurut bukti I3.6, tetapi tidak siap terbit bila kelas sudah dikunci.
4. ID R-A01 sampai R-A22 masih sementara sampai register bersama dibangun bersama Kajian 2.
