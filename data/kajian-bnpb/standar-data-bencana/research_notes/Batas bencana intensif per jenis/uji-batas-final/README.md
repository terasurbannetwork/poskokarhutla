# Uji batas intensif final (24 Nov 2026)

Bukti internal untuk pemilik. Tidak dikutip dalam naskah kajian (aturan tanpa DIBI).

Data: salinan dasbor publik DIBI 2024 sampai 2026 (`hitung-bencana/analisis/hasil/dibi_mentah_2024_2026.json`,
15.974 baris). Dasbor DIBI tidak dapat dijangkau pada 24 Nov 2026, sehingga tahun 2008 sampai 2023 belum diuji.
Satuan: satu baris = satu catatan kabupaten/kota per tanggal, sama dengan satuan GAR. Hanya baris yang memenuhi
kriteria a, b, atau c yang dihitung (7.614 baris). Kriteria d sampai f dan batas 5 sampai 7 tidak punya kolom.

Perintah: `py uji_batas.py hasil_2024_2026.json <salinan lokal>` (tanpa argumen kedua menarik dari dasbor).

## Hasil

| Ukuran | Aturan final | Versi GAR (meninggal 30, rusak berat 600) | GAR 2015 global |
| --- | ---: | ---: | ---: |
| Catatan intensif | 58 (0,76%) | 36 (0,47%) | 0,86% |
| Porsi korban jiwa di catatan intensif | 52,3% | 48,6% (meninggal) | sekitar 87% |
| Porsi rumah rusak berat di catatan intensif | 83,3% | 82,0% | 84% (rumah hancur) |

Penentu: batas 1 (meninggal dan hilang) 20 catatan, 3 di antaranya hanya karena hilang ikut dihitung; batas 2
(rumah terbobot) 34, 4 di antaranya hanya karena bobot rusak sedang; batas 3 (pengungsi longsor) 8; batas 4
(kekeringan, proksi "menderita" dibanding penduduk) 9. Proksi kekeringan adalah batas atas, karena syarat 20 liter
dan 15 hari tidak terukur di DIBI.

Per jenis: gempa 10,4% intensif, kekeringan 3,7%, longsor 1,7%, banjir 0,6%, cuaca ekstrem, angin, puting beliung,
gelombang, dan kebakaran permukiman 0%. Karhutla tidak terukur (tidak ada kolom luas).

## Bacaan

- Porsi intensif 0,76% dekat dengan kalibrasi GAR, jadi penambahan hilang dan bobot rumah tidak menggelembungkan kelas.
- Porsi korban jiwa (52%) jauh di bawah 87% GAR karena periode 2024 sampai 2026 tidak memuat bencana katastrofik
  besar; kematian tersebar di banyak kejadian kecil. Perlu diulang pada 2008 sampai 2023 saat dasbor dapat dijangkau.
- Kekeringan 9 catatan intensif dari proksi; angka sebenarnya bergantung pada isian baru lama kesulitan air.

## Ulangan 2008 sampai 2026 (24 Nov 2026, dasbor DIBI terjangkau lagi)

Perintah: `py uji_batas.py hasil_2008_2026.json`. Baris memenuhi kriteria a, b, atau c: 26.503.

| Ukuran | Aturan final | Versi GAR | GAR 2015 global |
| --- | ---: | ---: | ---: |
| Catatan intensif | 290 (1,09%) | 138 (0,52%) | 0,86% |
| Tanpa kekeringan (proksi) | 219 dari 25.764 (0,85%) | | |
| Porsi korban jiwa di catatan intensif | 63,8% | 62,3% (meninggal) | sekitar 87% |
| Porsi rumah rusak berat di catatan intensif | 80,1% | 78,8% | 84% |

Penentu: batas 1 sebanyak 61 (7 hanya karena hilang), batas 2 sebanyak 136 (21 hanya karena bobot rusak sedang),
batas 3 longsor 63, batas 4 kekeringan 71.

Per jenis: gempa 13,6%, kekeringan 9,6%, erupsi 9,1%, banjir dan longsor 7,0%, longsor 1,4%, banjir bandang 1,4%,
banjir 0,5%, cuaca ekstrem 0,1%, karhutla 0% (tanpa kolom luas).

Bacaan:
- Di luar kekeringan, porsi intensif 0,85% hampir sama dengan kalibrasi GAR.
- Kekeringan 9,6% intensif karena proksinya longgar: "menderita" mencakup semua penerima bantuan air tanpa syarat
  20 liter dan 15 hari. Batas 4 perlu diuji ulang setelah isian kesulitan air minum dan lamanya terkumpul; bila porsinya
  tetap jauh di atas jenis lain, batas 15 persen perlu dinaikkan pada tinjauan satu tahun.
- Porsi korban jiwa 64% lebih rendah daripada 87% GAR, karena data dasbor tidak memuat tsunami 2004 dan bencana
  katastrofik sebelum 2008.

## Koreksi penyebut (24 Nov 2026, kritik ahli statistik)

GAR 2015 menghitung 0,86 persen terhadap semua catatan kerugian DesInventar, yaitu catatan yang punya efek apa pun.
Penyebut di atas hanya baris yang memenuhi kriteria a, b, atau c, sehingga porsinya terlalu tinggi.

| Penyebut | Baris | Intensif aturan final (290) | Versi GAR (138) |
| --- | ---: | ---: | ---: |
| Semua baris dasbor | 63.255 | 0,46% | 0,22% |
| Baris dengan dampak apa pun (padanan GAR) | 44.470 | 0,65% | 0,31% |
| Baris memenuhi kriteria a, b, c | 26.503 | 1,09% | 0,52% |

Bacaan yang benar: dengan penyebut yang setara GAR, porsi intensif aturan final 0,65 persen, satu orde dengan 0,86
persen GAR, dan lebih rendah, bukan "hampir sama". Satuan uji tetap baris kabupaten per tanggal, bukan KIB atau
kejadian nasional, sehingga aturan kelas nasional belum teruji.
