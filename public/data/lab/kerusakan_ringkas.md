# Lab kerusakan bangunan dari radar (damage proxy amplitudo)

Status: **selesai**, dibuat 2026-10-28T01:56:11+07:00, kriteria_sha a613e7809d96. Bukan produksi, tanpa layar.

## Gempa Cianjur 21 Nov 2022 (M5,6)

Kebenaran: kecamatan dan sel 1 km (titik survei rumah rusak BNPB). Orbit 98 ascending, sesudah 2022-11-23, sebelum 2022-11-11, 2022-10-30, 2022-10-18, 2022-10-06, 2022-09-24.

**Vonis: GAGAL** (tidak terpenuhi: mengalahkan_naif_terkuat, ci_selisih_di_atas_nol, mengalahkan_plasebo)

Kombinasi dipilih di kecamatan kalibrasi: VH, arah naik, z >= 2.0 (rho kalibrasi 0.546). Sel kalibrasi 246, sel uji 259, k = 26 (acak 0.10).

| Pembanding (sel uji) | rho Spearman | presisi@k |
|---|---|---|
| model | 0.537 | 0.385 |
| plasebo | 0.559 | 0.385 |
| naif_n_x_mmi | 0.554 | 0.346 |
| naif_n | 0.525 | 0.308 |
| naif_mmi | 0.569 | 0.231 |

Selisih model - naif terkuat (naif_mmi): -0.032, CI90 blok [-0.154, 0.106].
Selisih model - plasebo: -0.022, CI90 [-0.068, 0.022].

Kecamatan (n=11, deskriptif): rho model 0.682, naif n x MMI 0.282, naif n 0.064.
Waktu proses: 251.6 dtk (kebenaran 0.3, bangunan 53.7, baca_sar 189.1, z 5.0, agregasi_uji 3.0).

## Kejadian lain

- Gempa Sulbar (Mamuju/Majene) 15 Jan 2021: tidak_dijalankan, kebenaran hanya per kabupaten (DIBI/Majene-Mamuju, 2-3 unit): Spearman tak bermakna; Open Buildings Sulbar belum diunduh
- Gempa-tsunami-likuefaksi Palu 28 Sep 2018: tidak_dijalankan, kebenaran hanya per kabupaten (4-5 unit); kerusakan didominasi tsunami/likuefaksi, bukan getaran; Open Buildings Sulteng belum diunduh

## Keterbatasan

- Amplitudo, bukan koherensi: PC tidak menyediakan SLC, jadi deteksi 'damage proxy' koheren (ARIA/DPM) tidak dilakukan.
- Perubahan backscatter juga datang dari hujan/kelembapan tanah, panen/tanam sawah, longsor, dan banjir; plasebo (adegan pra-kejadian) mengukur sebagian dari ini.
- Resolusi piksel 40 m; bangunan hanya titik pusat Open Buildings v3 pada sel 110 m (bukan jejak), jadi skor = bangunan sel x bagian piksel berubah.
- Satu geometri pengamatan (satu orbit/arah): kerusakan menghadap-jauh dan bayangan radar tak terlihat.
- Kebenaran = survei rumah rusak BNPB (InaRisk+Rutena, 24.427 rumah per 1 Des 2022), bukan cacah resmi lengkap; sel tanpa titik survei bernilai 0 (bisa belum disurvei).
- Hanya satu kejadian punya kebenaran di bawah tingkat kabupaten; uji lintas-kejadian TIDAK mungkin. Pemisahan kalibrasi/uji adalah antar-kecamatan di kejadian yang sama (tetangga berdekatan, ada autokorelasi spasial).
