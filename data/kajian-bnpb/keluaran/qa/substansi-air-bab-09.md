# Penyunting substansi: kajian air, Bab 9 Kelembagaan, Pembiayaan, dan Peta Jalan

Diperiksa 24 Oktober 2026 terhadap `naskah/air/bukti/bab-09.md`, `bab-09.angka.json`, register `naskah/air/bab-10.md`,
KERANGKA §2 butir 2, §4 Bab 9, §6, serta KEPUTUSAN. Berkas `naskah/air/bab-09.md` disunting langsung.

## Vonis

Siap terbit secara substansi, dengan dua syarat produksi di bagian "Belum beres". Keempat pertanyaan kunci KERANGKA
terjawab: mandat per komponen dan fase (9.1, 9.2), forum (9.3), sumber dana tanpa nominal (9.4), instrumen dan posisinya
di Progsun 2026 (9.5). Delapan komponen yang direncanakan ada (Tabel 9.1 sampai 9.5, Gambar 9.1 sampai 9.3).

## Pemeriksaan

| Butir | Hasil |
| --- | --- |
| Token angka | 64 token, 52 kunci. Semua ada di `data/angka.json` atau di `bab-01/02/07/08/10/09.angka.json`; nilai dan label cocok dengan berkas bukti (31, 23 lawan 21, 129/76/53, 76/49/32, 26/8, 13/11, 8 jenis DSP, 11 rancangan Progsun, 44 dan 50 kegiatan Juklak, 82,35% ke 100%, dan seterusnya) |
| Angka bertentangan | Ditulis berdampingan: 23 baris tertulis menurut paket lawan 21 bersumber norma; rentang DSP PP 22/2008 lawan Perban 4/2020; "dan" Perban 5/2018 lawan "dan/atau" Perpres 46/2026 |
| Kewenangan | Sesuai UU 17/2019 Pasal 35 dan KERANGKA §2 butir 2; tidak ada komponen yang dipimpin BNPB; Kementerian PU, pemda, Kementan, Kementerian ESDM memegang komponen |
| Klaim "terbukti" | Tidak ada program yang disebut terbukti |
| Lantai skenario dan angka model | Tidak berlaku: bab tanpa skenario dan tanpa angka model. Satu angka berlabel asumsi-kebijakan (98 kab/kota daftar perhatian) dirujuk ke Bab 8 |
| Register | Semua @rek ada di Bab 10 (r-a22 termasuk). Horizon 14 hari untuk R-A01 sampai R-A05 mengikuti daftar keputusan 14 hari KERANGKA §6 dan Bab 1, walau kolom waktu register Bab 10 bernilai 100-hari |
| Keputusan KD | KD-1, KD-2, KD-5 ada di Bab 10 |
| slop.py --final | LOLOS, skor 0 (3.507 kata); tanpa em dash dan tanpa titik tengah |
| naskah.py | Lolos bila registri bab digabung (lihat "Belum beres") |

## Suntingan

1. **Salah pasal (kritis):** keputusan rakor keadaan tertentu dirujuk ke "Perpres 46/2026 Pasal 3 ayat (1)". Perpres 46/2026
   hanya mengubah ayat (2) (bukti T3.4). Diganti menjadi Perpres 17/2018 Pasal 3 ayat (1), yang tidak diubah Perpres 46/2026,
   dengan kutipan `ri-2018-perpres17`.
2. **Isi Perpres 46/2026 tidak tepat:** "menambah faktor sosial" diganti dengan bunyi bukti, yaitu menambah penyebab alam,
   nonalam, dan/atau sosial, kondisi daerah pascakonflik sosial, dan penghubung "dan/atau".
3. **Kewenangan:** PJT I dan II tidak lagi ditulis sebagai bagian Kementerian PU (BUMN operator wilayah kerja). UU 17/2019
   Pasal 35 kini disebut per ayat (2), (5), (6), termasuk tindakan darurat oleh gubernur dan bupati/wali kota (KERANGKA §2 butir 2).
4. **Komponen pembiayaan dari KERANGKA yang hilang:** ditambah RPJMN KP 08.04.05 Kementerian PU (19 ke 100 pada 2029; kunci
   `rpjmn.kp080405.*` bab-08, `ri-2025-perpres12-rpjmn`).
5. **Alasan DSP:** "DSP terikat tanggap darurat" dipersempit menjadi "PP 22/2008 mengikat DSP pada tanggap darurat", karena
   bab yang sama menyandingkan rentang Perban 4/2020 yang lebih lebar.
6. **Logika indikator:** IKP P1 Renstra "dipakai sebagai ukuran ... karena metodenya belum dibaca" dibalik menjadi acuan arah,
   bukan alat ukur, sesuai bukti Celah 9.7.
7. **Kutipan yang kurang:** ditambah pada kalimat klaster Kepka 308/2024 (paket lembaga), PP 22/2008 Pasal 23, dan tiga lapis
   pelaporan (Perpres 1/2019, Perban 6/2025, Perpres 87/2020, Perban 1/2026, Perban 4/2020).
8. **Bahasa:** rujukan Kepka 327/2025 dipindah ke "Butir 3" (sebelumnya menempel pada Penjelasan UU 24/2007); "Tuas itu
   bersyarat tiga" diganti kalimat lugas; satu kalimat 52 kata dipecah; satu tiga-serangkai dibuang.

Tidak ada paragraf yang dipotong: tiap paragraf memuat angka, pasal, atau keputusan.

## Belum beres (bukan wewenang penyunting substansi)

- **Registri belum digabung.** Ke-51 kunci bab-09 tidak ada di `data/angka.json`; `naskah.py` gagal di baris 15 tanpa
  penggabungan `bab-09.angka.json` (dan kunci bab-01, 02, 07, 08, 10 yang dipakai ulang). Penggabung wajib menjalankannya
  sebelum build; kunci `lembaga.peran.*` dihitung dari berkas kerja paket yang belum ter-commit dan harus dihitung ulang saat
  paket dikunci.
- **Tiga berkas gambar tidak ada:** `gambar/air/bab09-forum-koordinasi.png`, `bab09-lapisan-pembiayaan.png`,
  `bab09-pelaporan-tiga-lapis.png`. Isinya sudah dirancang di bukti I2.1, I3.1, I5.3.
- Kolom register Tabel 9.2 baris 6 bernilai "–", sedangkan bukti I1.3 menulis "keduanya"; tidak ada ID register yang dapat
  dirujuk, jadi dibiarkan.
