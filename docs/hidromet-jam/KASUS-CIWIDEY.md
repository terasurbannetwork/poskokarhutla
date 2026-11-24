# Kasus Ciwidey 14 Nov 2026: kisaran embusan yang konsisten dengan kerusakan (H34)

Studi kasus, bukan validasi dan bukan perubahan produk. `public/cuaca/sim_dampak.js` tidak disunting.
Skrip ulang: `node scripts/cuaca/kasus_ciwidey.mjs` (memuat `SimDampak.ringkas` apa adanya).

## Masukan

| Masukan | Nilai | Sumber |
| ------- | ----- | ------ |
| Kejadian | Ciwidey dan Pasirjambu, Kab. Bandung, 14 Nov 2026 sekitar 14.30 WIB | RISET.md, video bacalangit.id |
| Kerusakan | 363 rumah (BPBD, 15 Nov); 1.397 bangunan (BPBD, per 16 Nov) | RISET.md; angka 1.397 oleh BPBD dicatat sebagai total seluruh area |
| Penduduk | Ciwidey 91.876 jiwa; Pasirjambu 101.158 jiwa | `public/data/penduduk.json` (WorldPop Global2 R2025A, 2026, 1 km, CC BY 4.0) |
| Rumah | 49.496 (23.558 + 25.938) = penduduk / 3,9 jiwa per rumah | `PARAM.jiwa_rumah` di sim (ASUMSI, rata-rata rumah tangga BPS) |
| Kerapuhan atap | lognormal, median 95 km/jam, beta 0,25; peluang < 0,02 dianggap nol (embusan < 56,9 km/jam) | `PARAM.atap`, `atap_b`, `ambang_p` (semuanya berstatus ASUMSI di sim) |
| Cek silang awan | Himawari-9 B13, Kab. Bandung (3219), 14 Nov 07.30 UTC (14.30 WIB): Tb_min 204,1 K, turun 27,7 K dari 07.00 UTC (231,9 K); `tumbuh` dan `puncak_tembus` keduanya benar | H12, `public/udara/data/awan_tumbuh.json` |

Sumber paparan bangunan: Open Buildings TIDAK dipakai. Berkas hasil pipeline hanya ada untuk provinsi 13, 33, 63
(`data/terkunci/bangunan/`); Jawa Barat (32) belum diproses, dan layanannya di R2 hanya untuk admin. Penggantinya penduduk WorldPop
yang memang jalur sim sendiri (titik `w` dibagi `jiwa_rumah`). Hitungan bangunan Open Buildings Ciwidey/Pasirjambu belum ada; ini
kekosongan, bukan angka.

## Metode

Per kecamatan dibuat satu titik penduduk `w = penduduk x fraksi lajur` dengan embusan seragam g; `SimDampak.ringkas` menghasilkan
`rumahAtap = w / 3,9 x P(atap rusak | g)`. Fraksi lajur 10%, 25%, 50% (lajur sempit downburst atau puting beliung), dan 100% sebagai batas atas.
Tiap sel diberi embusan puncak yang sama, jadi ini kerusakan yang diharapkan bila seluruh lajur mengalami embusan itu, bukan medan angin yang meluruh ke tepi lajur.

## Tabel: rumah rusak atap yang diharapkan (pembulatan)

| Embusan (km/jam) | P(atap) | Lajur 10% | Lajur 25% | Lajur 50% | Lajur 100% |
| ---------------- | ------- | --------- | --------- | --------- | ---------- |
| 60 | 0,033 | 163 | 409 | 817 | 1.634 |
| 80 | 0,246 | 1.217 | 3.043 | 6.086 | 12.172 |
| 100 | 0,581 | 2.877 | 7.193 | 14.386 | 28.771 |
| 120 | 0,825 | 4.083 | 10.208 | 20.416 | 40.832 |
| 150 | 0,966 | 4.782 | 11.955 | 23.910 | 47.821 |

Embusan yang menghasilkan persis target (interpolasi fungsi kerapuhan, km/jam):

| Lajur | 363 rumah | 1.397 bangunan |
| ----- | --------- | -------------- |
| 10% (4.950 rumah) | 66 | 82 |
| 25% (12.370 rumah) | 59 | 70 |
| 50% (24.750 rumah) | tidak tercapai: model melompat dari 0 ke 495 rumah pada 56,9 km/jam karena ambang peluang 0,02 | 64 |
| 100% | tidak tercapai (lompat 0 ke 990) | tidak tercapai (lompat 0 ke 990, terendah di atas 1.397 pada 60 km/jam: 1.634) |

## Kombinasi yang cocok

- 363 rumah: lajur 10% dengan embusan sekitar 66 km/jam, atau lajur 25% dengan sekitar 59 km/jam (tepat di atas ambang model).
- 1.397 bangunan: lajur 10% dengan sekitar 82 km/jam, lajur 25% dengan sekitar 70 km/jam, atau lajur 50% dengan sekitar 64 km/jam.
- Kisaran gabungan dua angka, lajur 10-50%: sekitar 59 sampai 82 km/jam. Batas bawah itu setara ambang puting beliung (>= 64 km/jam, RISET.md). Embusan 100 km/jam ke atas hanya cocok
  bila lajur lebih sempit dari 10% (belum diuji; di bawah 10%, 100 km/jam memberi sekitar 288 rumah per 1% lajur sehingga bisa saja cocok dengan lajur sekitar 1-5%).
- Cek silang H12: Tb_min 204,1 K pada 07.30 UTC dan penurunan 27,7 K per 30 menit menunjukkan inti konvektif sangat kuat di atas Kab. Bandung,
  jam yang sama dengan laporan kerusakan 14.30 WIB. Itu mendukung adanya mekanisme angin konvektif (downburst atau puting beliung) tetapi tidak
  mengukur kecepatannya dan tidak membedakan kedua mekanisme. Titik contoh 0,1 derajat (16 titik untuk seluruh Kab. Bandung) bukan sel di atas Ciwidey.

## Keterbatasan

1. Tidak ada anemometer di Ciwidey; data angin lokasi tidak tersedia untuk publik (RISET.md). Kisaran di atas diturunkan dari kerusakan, bukan diukur, sehingga tidak bisa jadi validasi.
2. Kurva kerapuhan adalah bentuk HAZUS-MH Hurricane umum, bukan rumah Indonesia; median 95 km/jam dan beta 0,25 berstatus ASUMSI di `PARAM`. Median lebih rendah (atap seng ringan, tidak dipaku) menggeser seluruh kisaran ke bawah.
3. Ambang `ambang_p` = 0,02 membuat model tidak bisa menghasilkan rumah rusak di bawah 56,9 km/jam dan menyebabkan lompatan, sehingga 363 pada lajur 50% atau 100% tidak bisa dicapai.
4. Definisi kerusakan berbeda: model menghitung kerusakan atap (keadaan terlampaui), BPBD menghitung "rumah" (363) dan "bangunan" (1.397) dengan tingkat rusak ringan/sedang/berat yang tidak dipilah. Dua angka itu juga tidak sebanding satu sama lain (rumah vs bangunan, tanggal berbeda).
5. 1.397 dicatat sebagai total seluruh area BPBD; tidak dipastikan hanya Ciwidey dan Pasirjambu. Bila mencakup kecamatan lain, kisarannya turun.
6. Paparan memakai penduduk / 3,9, bukan hitungan bangunan nyata; bangunan non-rumah, tempat usaha, dan pola kepadatan di tepi lajur tidak ada. Open Buildings untuk Jawa Barat belum diproses di repo ini.
7. Embusan dianggap seragam di seluruh lajur; kenyataannya intensitas puncak hanya di inti lajur, jadi fraksi lajur dan embusan puncak saling menggantikan (tidak identifiabel dari satu angka kerusakan).
8. Pohon tumbang (median 75 km/jam) tidak dihitung ke kerusakan rumah di tabel ini; `rumahPohon` ada di keluaran skrip.
