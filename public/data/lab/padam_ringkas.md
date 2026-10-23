# Lab: luas masih terdeteksi / belum padam

Tahap: selesai. Tahun lengkap: [2019, 2020, 2022, 2023]. kriteria_sha: d3987163dce3678ffe7cec988be04d754cf7a50c1039b14a0dc5edb1814e9bb8. LAB, bukan produksi.

> Aturan berlaku untuk PROKSI AWAN ERA5 (titik tengah sel 0,5 derajat) dan tidak menangkap asap. Tidak boleh dikutip sebagai 'k lintasan satelit bersih' operasional sebelum divalidasi dengan masker VIIRS.

## Kriteria (dipra-tulis, scripts/data/lab_kriteria/lab_padam.json)

- Pilih k terkecil dengan aturan_batas <= 10% di set setel: aturan_batas = maks(Wilson 95%, bootstrap klaster sel x tahun B=1000 p97.5), gambut DAN mineral, n >= 60, >= 20 klaster
- Lolos bila aturan_batas <= 15% di set uji (gambut DAN mineral, sama: n >= 60, >= 20 klaster)
- Tak dinyatakan padam dalam 240 jam <= 20% pengamatan (setel DAN uji, gambut DAN mineral)
- Keterlambatan vs A0 <= 24 jam (berpasangan; bersyarat pada hasil)
- Setel [2019, 2020], uji [2022, 2023], SEKALI; arah sebaliknya hanya kepekaan

## Uji murni (tahun uji [2022, 2023], parameter dari tahun setel [2019, 2020])

**Terpilih: None. Vonis: tidak_ada_aturan.**

| aturan | batas atas gabungan gambut | mineral | n klaster g/m | tak dinyatakan g/m | selisih telat vs A0 (jam) | lolos |
|---|---|---|---|---|---|---|
| A0 (pembanding, laporan saja) | 0.3344 | 0.2865 | 45/68 | 0.0/0.0 | 0.0 | - |
| A1 (pembanding, laporan saja) | 0.47 | 0.35 | 45/70 | 0.0/0.0 | -47.6 | - |
| A2 | None | None | None/None | None/None | None | False |
| A3 | None | None | None/None | None/None | None | False |
| A4 | None | None | None/None | None/None | None | False |

## Tiga angka (bukan satu; sel sampel saja, luas piksel bukan luas terbakar)

- aktif_teramati: lokasi dengan deteksi terakhir <= 24 jam sebelum snapshot
- tak_teramati: tanpa deteksi > 24 jam tetapi belum memenuhi aturan padam (menunggu lintasan bersih / tertutup awan); tak_teramati_awan_n = yang >= 50% lintasan 72 jam berawan
- kandidat_padam: sudah memenuhi aturan padam dalam 7 hari terakhir: layak diverifikasi (lapangan/Sentinel-2), belum pasti padam
- luas: piksel unik SAMPAI waktu snapshot x ha/piksel = LUAS PIKSEL, bukan luas terbakar; HANYA sel sampel (acak berstrata dari tahun setel), BUKAN nasional
- informasi: status tiap lokasi memakai hanya informasi <= waktu snapshot (deteksi terakhir <= snapshot, bukan t_akhir episode)

- parameter aturan dipilih dari set SETEL ([2019, 2020]); snapshot tiap tahun diberi peran_tahun uji/setel

| snapshot | peran tahun | aturan | aktif teramati (ha) | tak teramati (ha) | kandidat padam (ha) |
|---|---|---|---|---|---|
| 2019-09-15 | setel | A0 | 101377 | 24061 | 15933 |
| 2019-09-15 | setel | aturan_terpilih_atau_A0 | 101377 | 24061 | 15933 |
| 2019-10-01 | setel | A0 | 65714 | 25734 | 42947 |
| 2019-10-01 | setel | aturan_terpilih_atau_A0 | 65714 | 25734 | 42947 |
| 2019-10-15 | setel | A0 | 42975 | 12220 | 25945 |
| 2019-10-15 | setel | aturan_terpilih_atau_A0 | 42975 | 12220 | 25945 |
| 2020-09-15 | setel | A0 | 464 | 1547 | 1055 |
| 2020-09-15 | setel | aturan_terpilih_atau_A0 | 464 | 1547 | 1055 |
| 2020-10-01 | setel | A0 | 352 | 211 | 1153 |
| 2020-10-01 | setel | aturan_terpilih_atau_A0 | 352 | 211 | 1153 |
| 2020-10-15 | setel | A0 | 520 | 1491 | 1308 |
| 2020-10-15 | setel | aturan_terpilih_atau_A0 | 520 | 1491 | 1308 |
| 2022-09-15 | uji | A0 | 408 | 197 | 450 |
| 2022-09-15 | uji | aturan_terpilih_atau_A0 | 408 | 197 | 450 |
| 2022-10-01 | uji | A0 | 84 | 84 | 534 |
| 2022-10-01 | uji | aturan_terpilih_atau_A0 | 84 | 84 | 534 |
| 2022-10-15 | uji | A0 | 225 | 225 | 323 |
| 2022-10-15 | uji | aturan_terpilih_atau_A0 | 225 | 225 | 323 |
| 2023-09-15 | uji | A0 | 12122 | 4697 | 10856 |
| 2023-09-15 | uji | aturan_terpilih_atau_A0 | 12122 | 4697 | 10856 |
| 2023-10-01 | uji | A0 | 31162 | 23344 | 15230 |
| 2023-10-01 | uji | aturan_terpilih_atau_A0 | 31162 | 23344 | 15230 |
| 2023-10-15 | uji | A0 | 19786 | 15905 | 23484 |
| 2023-10-15 | uji | aturan_terpilih_atau_A0 | 19786 | 15905 | 23484 |

## P(muncul ulang <= 7 hari | tak terdeteksi g jam), semua pengamatan (deskriptif)

- g=24 jam: 0.465
- g=48 jam: 0.3844
- g=72 jam: 0.2976
- g=120 jam: 0.2637
- g=168 jam: 0.2297

## Sentinel-2

{"dilewati": "waktu tersisa tidak cukup atau aturan terpilih A0/tidak ada"}

## Batasan

- Aturan berlaku untuk PROKSI AWAN ERA5 (cloud_cover total di titik tengah sel 0,5 derajat pada jam lintas), BUKAN masker VIIRS VNP14IMG; proksi ini tidak menangkap asap/kabut tebal (dominan Agu-Okt). Tidak boleh dikutip sebagai 'k lintasan satelit bersih' operasional sebelum divalidasi dengan masker VIIRS.
- 'Lintasan bersih' tidak menjamin api terdeteksi: api kecil/dingin di bawah kanopi, di bawah ambang piksel 375 m, atau di tepi sapuan bisa lolos. Jadi laju muncul ulang di sini BATAS BAWAH.
- Bara gambut bawah permukaan tak terlihat satelit mana pun; 'tak muncul ulang' tidak membuktikan padam. Kebenaran akhir = konfirmasi lapangan (/uji-lapangan Q5), yang belum dipakai di sini.
- 'Muncul ulang dalam R km' diukur dengan deteksi FIRMS yang sama (satu sumber): deteksi baru dalam R km bisa API BARU di dekatnya, bukan kebangkitan api lama. Radius 0,5/1/2 km disajikan sebagai kepekaan.
- Pengamatan = celah antar-deteksi (proses pembaruan) dan pengamatan satu sel berkorelasi: batas atas = maks(Wilson, bootstrap klaster sel x tahun B=1000 persentil 97.5), strata wajib >= 20 klaster (setel DAN uji). Lokasi besar yang terbakar lama tetap menyumbang lebih banyak celah.
- DC dihitung dari cuaca jam 12 setempat pada tanggal t_i; untuk lintasan malam (sekitar 10 jam sebelumnya) DC itu adalah hari yang sama dan tidak berisi informasi sesudah t_i yang bocor ke vonis, tetapi kasar sekitar setengah hari.
- Bootstrap 20 klaster sempit untuk rasio langka (persentil 97,5 dari 20 sel kasar): sebab itu ditambal dengan maks(Wilson, bootstrap), dan 'tidak_ada_aturan' adalah hasil sah.
- Jam lintas diidealkan (satu lintasan siang + satu malam per satelit, jam surya median dari acq_time); tumpang-tindih sapuan di khatulistiwa dan bukan-lintasan diabaikan.
- Cuaca hanya untuk SEL SAMPEL (acak berstrata, benih tetap, dipilih dari titik tahun SETEL saja): luas di tiga angka adalah luas di sel sampel, BUKAN nasional. Pengamatan di sel tanpa cuaca dibuang.
- Dua tahun kering + dua basah: kesimpulan musiman bergantung pada empat musim saja; strata dengan n < 60 dinyatakan tak cukup.
- Luas = piksel unik sampai waktu snapshot x faktor ha/piksel: LUAS PIKSEL, bukan luas terbakar.
- Populasi utama: berlaku untuk kejadian >= 3 piksel unik; semua ukuran hanya kepekaan.
