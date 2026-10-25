# QA lapis (b) penyunting substansi: kajian mitigasi Bab 5

Berkas: `naskah/mitigasi/bab-05.md`. Pembanding: `naskah/mitigasi/bukti/bab-05.md` (PK1 sampai PK4, T1.1 sampai T4.18,
I1.1 sampai I4.5, Komponen), `bab-05.angka.json`, `bab-0N.angka.json` mitigasi, `data/angka.json`, pustaka gabungan, blok
rek `bab-13.md` (r-m01, r-m04, r-m20), `bab-01.md` dan `bab-13.md` untuk angka LKIP BNPB 2025; KERANGKA §2, §5 Bab 5, §6
KD-3 dan KD-4; Buku Pegangan L16, L60. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- `bangun/kontrak/naskah.py` `baca()` atas bab utuh dengan registri gabungan `data/angka.json` +
  `naskah/mitigasi/bukti/bab-*.angka.json` (bab-05 didahulukan) dan pustaka gabungan: lulus tanpa galat sebelum dan
  sesudah suntingan. Sesudah suntingan 473 token, 280 kunci unik, semuanya ada; nilai tampil cocok dengan T1 sampai T4
  berkas bukti; label keyakinan sah.
- `qa/slop.py --final`: LOLOS, skor 0. Sembilan S-18 rendah adalah daftar nama diri faktual (provinsi, jenis bencana,
  aspek Perban 2/2023), dibiarkan. Em dash dan titik tengah: nol. Kata "terbukti": nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan bab temuan 3; 5.6 paragraf RPJMN; blok koreksi | Bab menulis "dokumen yang dikutip bab ini tidak memuat capaian 2024 atau 2025" dan "Renstra tidak menyebut alat ukur", padahal LKIP BNPB 2025 (registri `bab-13.angka.json`, sudah dipakai Bab 1 dan Bab 13) mencatat capaian 50% provinsi berkategori IKD minimal sedang menurut Manual IKU (Kepka BNPB 318/2025), target 67% tidak tercapai, dan IKD kab/kota 2025 56,2%. Bab 1 menyerahkan pembahasan pilihan ini ke Bab 5 | Capaian LKIP, alat ukur Manual IKU, dan penyebut provinsi ditulis berdampingan dengan penyebut kab/kota siaran Kemenko PMK; ringkasan temuan 3 ditulis ulang; koreksi kini menyebut capaian 2025 |
| 2 | Catatan IRBI 2025 (5.2) | "Capaian 2025 ... belum dapat dinilai sampai baseline skala baru terbit" bertentangan dengan LKIP: baseline 147,95 sudah ditetapkan, penurunan 2025 1,03% terhadap target 1,2% (tidak tercapai), IRB 2024 versi LKIP 171,95 | Ditambah angka LKIP; IRB 2024 171,95 dan 128,52 ditulis berdampingan tanpa dirata-rata; yang tersisa hanya catatan metode (r-m01) |
| 3 | 5.6 paragraf "Angka 62% dan 38,0%" dan Tabel `tbl:kapasitas-dua-alat` | Hanya dua angka; jarak 28 poin memakai baseline 2023 berpenyebut tak dikenal sementara capaian 2025 resmi ada | Kalimat pembuka tebal berangka (rentang 38,0% sampai 91,2%); jarak dihitung dari kunci Bab 13 (40 poin provinsi; kurang 174 kab/kota IKD; kurang 265 kab/kota KRB); dua baris tabel baru (Manual IKU provinsi 2025, IKD kab/kota 2025); sumber dan catatan tabel menyebut LKIP dan beda penyebut |
| 4 | Blok keputusan | KD-3 ditulis "memilih alat ukur" dengan opsi IKD baseline 62%, tidak sejalan dengan KD-3 Bab 13 ("memilih penyebut", Manual IKU sudah menetapkan IKD); butir kedua menjadikan catatan metode IRBI keputusan, padahal KERANGKA baris 1053 dan Bab 13 menempatkan KD-4 sebagai rekomendasi 100 hari | KD-3 diselaraskan dengan Bab 13 (dua opsi penyebut, angka LKIP dan KRB); butir KD-4 dibuang, dirujuk lewat r-m01 di catatan 5.2 |
| 5 | Blok `matriks-rekomendasi` `tbl:rekomendasi-kapasitas` | `rek:r-m04` didefinisikan ganda (Bab 5 dan Bab 13) dengan program, unit, dan indikator berbeda; isi Bab 5 ("belum punya alat ukur tertulis") sudah usang. Pola kajian air: definisi rek hanya di register | Blok dibuang; Bab 5 merujuk `@rek:r-m04` dari keputusan. Butir ringkasan r-m04 menambah Direktorat Sistem Penanggulangan Bencana sesuai unit di Bab 13 |
| 6 | Ringkasan temuan 1; 5.3 kalimat tebal DIBI | 47,2% kejadian disebut "sebanding" dengan 56,1% penduduk, padahal per penduduk Jawa di bawah nasional (12,3 lawan 14,7; T1.8a) | "sedikit di bawah porsi penduduknya" dengan angka porsi penduduk |
| 7 | 5.3 paragraf penutup | Paragraf dua kalimat tanpa angka mengulang kesimpulan (L16) | Digabung ke akhir paragraf DIBI sebelumnya |
| 8 | 5.6 paragraf KRB | "kesamaan ... adalah kebetulan dan bukan sumber angka Renstra" menyatakan hal yang tidak dapat diuji (I3.3) | "tidak menunjukkan asal angka Renstra, karena alat ukur Renstra adalah IKD provinsi" |
| 9 | Ringkasan temuan 2 | "bahaya geologi yang tidak berubah" (premis hanya untuk bahaya fisik, I2.1) | "secara fisik tidak berubah" |
| 10 | Kotak temuan 5.1, Dampak | "setelah baseline IRBI 2025 terbit" (baseline sudah ada) | "setelah catatan metode IRBI 2025 terbit" |

## Diperiksa dan tidak diubah

- Klaim "terbukti": tidak ada. Peran kapasitas pada penurunan IRB ditulis "mendukung, tetapi tidak membuktikan" (I2.1).
- Lantai skenario: kelas jenis dari kejadian tercatat terbesar (Aceh 2004, Sulawesi Tengah 2018, Maluku 1999–2002,
  COVID-19); titik megathrust kelas empat dari lantai Pangandaran dengan model 11.000–140.000 di sampingnya dan catatan
  gambar; status IRB tidak menggantikan lantai (I1.3).
- Angka model berlabel dan berdampingan dengan tercatat: kematian berlebih COVID-19 (WHO) lawan 161.870; asap 2015
  (Koplitz) lawan DIBI 24; guncangan megathrust lawan Pangandaran 665 dan 65; peluang Poisson dan Weibull ditandai turunan
  penyusun, Weibull disebut dasar lemah.
- Angka bertentangan berdampingan: BRR 126.741 lawan 127.720; provinsi terendah Renas lawan Renstra; korban provinsi
  rekap DIBI lawan jumlah kab (Jawa Barat 1.271 lawan 1.260, Aceh 823 lawan 794); kolom terpapar lawan jiwa terpapar
  InaRISK; IRB 2024 128,52 lawan 171,95; kapasitas 62/67/50/56,2/38,0/91,2%.
- Kewenangan: bab tidak menempatkan BNPB sebagai regulator; Perban 2/2023 disebut tidak menetapkan ambang; NRR rujukan
  metode, bukan standar Indonesia; Perka 3/2012 tidak disebut sebagai dasar IKD.
- Pertanyaan kunci PK1 (5.2 sampai 5.5), PK2 (5.1), PK3 (5.6), PK4 (5.8) terjawab. Komponen KERANGKA ada: Gambar 5.1
  sampai 5.6, Tabel 5.1, 5.2, 5.4; Tabel 5.3 dirujuk ke `tbl:daftar-perhatian` Bab 3 dan dilengkapi `tbl:perhatian-pulau`.
- Hitungan kelas: 5 dari 15 jenis kelas fatalitas lima, 6 dengan mengungsi, 7 dengan likuefaksi gabungan; 3 jenis
  dengan kemungkinan dinilai, 12 di panel; cocok dengan I4.1.

## Sisa untuk orkestrator (di luar berkas ini)

1. Label registri: `kemenkopmk.daerah_belum_ikd_2024`, `_belum_krb`, `_belum_spm_bencana` (`data/angka.json`) berlabel
   resmi, sedangkan T3.8 berkas bukti memberi terverifikasi (siaran pers); `dibi.nasional.spearman_kejadian_meninggal.2015_2025`
   (`bab-04.angka.json`) resmi lawan asumsi-kebijakan di T2.9.
2. Bab 5 kini memakai 11 kunci `bnpb.lkip2025.*` dan `kapasitas.jarak_90.*` dari `bab-13.angka.json`; bila registri
   dipindah ke `data/angka.json`, kunci itu ikut.
3. "Rincian per kab/kota tersedia di Lampiran A" (5.5): berkas lampiran mitigasi belum ada di `naskah/mitigasi/`.
4. Berkas bukti Bab 5 (§0.1 butir 1, PK3 Celah) masih menulis capaian kapasitas 2024 dan 2025 tidak ditemukan; perlu
   diperbarui dengan LKIP BNPB 2025 agar bukti dan naskah sejalan.
5. KERANGKA §6 KD-3 masih berbunyi "memilih alat ukur" dengan opsi IKD Perka 3/2012; Bab 5 dan Bab 13 kini "memilih
   penyebut" menurut Manual IKU.
