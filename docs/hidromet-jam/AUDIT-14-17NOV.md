# Audit kronologi 14-17 Nov 2026 (tiket H10)

Studi kasus, bukan validasi. Satu kejadian per kasus, tanpa ambang yang disetel di sini: semua ambang milik A1 (METAR) dan A2 (Himawari) apa adanya. Hasil tidak boleh dibaca sebagai ketepatan atau kecepatan peringatan sistem.
Skrip: `scripts/cuaca/kronologi.py` (mode `uji` lulus). Fixture: `scripts/cuaca/fixture/kronologi/`. Semua jam WIB. "Menit sebelum" = jam kejadian dikurangi jam sinyal pertama; "SESUDAH" = sinyal datang setelah kejadian.

## Yang dipakai dan yang tidak terarsip

| Sumber | Status |
| --- | --- |
| Himawari-9 B13 (NOAA S3, A2) | Terarsip untuk Kab. Bandung 14 Nov (fixture H12), Kota Bandung 16 dan 17 Nov (diunduh), Bandung Barat 16 Nov (hanya konteks hulu), serta Aceh 12 Nov 03:00-15:00 (jendela pendek). Kab lain: tidak diunduh |
| METAR arsip IEM | Hanya WIHH, WIII, WIMM, WIMN, WITT. Bandara terdekat Bandung (WICC) dan Subulussalam/Aceh Tamiang tidak ada: tidak terarsip. WIII (Jakarta) sekitar 120 km dari Bandung, WITT (Banda Aceh) dan WIMM (Medan) jauh dari Aceh Tamiang dan Subulussalam, jadi hanya konteks regional, bukan sinyal lokal |
| Peringatan BMKG (D1 `cuaca_arsip`) | Terarsip, lihat bagian D1 |
| Radar BMKG (awan pertama 10.53 di video) | Tidak terarsip. Halaman radar dijaga tantangan bot (RISET-RADAR.md); tidak dipanen |
| Laporan Koordalops | Hanya tanggal berkas harian (batas atas 07:00 WIB), tanpa jam kejadian |

## Waktu kejadian

Hanya Ciwidey punya jam di dokumen: sekitar 14.30 WIB (RISET.md, KASUS-CIWIDEY.md). Untuk Cikalintu/Kota Bandung (banjir 16-17 Nov) dan Aceh/Subulussalam (12-17 Nov, belum surut): **waktu kejadian tidak terarsip**. Kolom menit-sebelum untuk keduanya tidak dihitung; tabel hanya memuat jam sinyal pertama. Kolom itu juga tidak dikarang dari caption video (K6).

## Kasus 1. Ciwidey dan Pasirjambu, Kab. Bandung (3219), 14 Nov, kejadian sekitar 14:30

| Sumber | Sinyal pertama (WIB) | Menit sebelum kejadian |
| --- | --- | --- |
| Himawari `tumbuh` (Tb_min 220,9 K, turun 9,7 K per 30 menit) | 13:30 | 60 |
| Himawari `puncak_tembus` (Tb_min 204,1 K, turun 27,7 K) | 14:30 | 0 |
| METAR WIII (Jakarta, konteks regional) | tidak ada tanda embusan_badai | - |
| BMKG, teks wilayah menyebut CIWIDEY atau PASIRJAMBU | 15:20 | 50 SESUDAH |
| BMKG, teks wilayah menyebut kecamatan lain Kab. Bandung (Cilengkrang, Cimenyan) | 14:20 | 10 |
| BMKG, hanya kotak pembatas memuat titik contoh kab | 09:10 (sistem kita melihat 09:50) | 320, bukan bukti cakupan |
| Laporan Koordalops | berkas 15 Nov, 'kejadian baru' | 990 SESUDAH |
| Radar BMKG | tidak terarsip | - |

Bacaan: tanda awan tumbuh dari satelit muncul satu jam sebelum rusak, tetapi jam pindaian itu nominal; datanya baru tersedia sekitar 10-20 menit kemudian, jadi lead time yang bisa dipakai lebih pendek. Peringatan BMKG yang menyebut kecamatan terdampak baru berlaku setelah kejadian. Peringatan 14:20 untuk kecamatan lain di kab yang sama tidak membuktikan Ciwidey tercakup. Jam sinyal "puncak_tembus" jatuh sama dengan jam kejadian, bukan sebelumnya.

## Kasus 2. Cikalintu, Kota Bandung (3216), 16-17 Nov

Sungai Cikalintu ada di Kota Bandung; banjirnya di Cihampelas (berita arsip Dalops: "Pemkot Bandung Telusuri Penyebab Banjir Sungai Cikalintu", "Teror Banjir Cikalintu"). Cihampelas adalah kelurahan (di Coblong), bukan kecamatan di data geo kita, jadi kecamatan fokus yang bisa dicocokkan hanya tingkat kecamatan Kota Bandung. Waktu banjir tidak terarsip.

| Sumber | 16 Nov (WIB) | 17 Nov (WIB) |
| --- | --- | --- |
| Himawari `tumbuh` | 11:00 (Tb_min 242,0 K, turun 15,3 K) | 15:30 (Tb_min 249,1 K, turun 11,1 K) |
| Himawari `puncak_tembus` | 14:00 (Tb_min 203,8 K, turun 78,9 K) | 16:30 (Tb_min 198,3 K, turun 42,3 K) |
| BMKG, teks menyebut kecamatan Kota Bandung | 13:30, Babakan Ciparay dan Bandung Kulon (dilihat 13:40) | 12:10, Bandung Wetan, Cicendo, Coblong, Sukajadi (dilihat 12:20) |
| BMKG, kotak kab saja | 13:30, bukan bukti cakupan | 12:10, bukan bukti cakupan |
| METAR WIII (Jakarta, konteks regional) | - | 13:24, tanda embusan_badai, `kuat` salah, 39 km/jam |
| Laporan Koordalops | tidak ada entri di arsip repo | tidak ada entri di arsip repo |
| Radar BMKG | tidak terarsip | tidak terarsip |

Catatan 24 Nov (dihitung ulang dari fixture `himawari_3216_*.json`, aturan baru `masuk`): penurunan 78,9 K (16 Nov 07:00Z, 282,7 K ke 203,8 K) berasal dari titik yang tadinya cerah (> 273 K), jadi itu bukti ADVEKSI awan dingin yang masuk, bukan pertumbuhan; kini berlabel `masuk`, bukan `tumbuh`. Penurunan 42,3 K (17 Nov 09:30Z, 240,6 K ke 198,3 K) terjadi pada titik yang sudah berawan sehingga tetap `tumbuh` menurut aturan baru, tetapi laju sebesar itu juga lebih mungkin adveksi daripada pertumbuhan; bacalah sebagai "awan dingin tiba", bukan laju pertumbuhan. Kolom `tumbuh` dan `puncak_tembus` pada tabel di atas ditulis sebelum aturan ini.

Kota Bandung hanya satu titik contoh satelit, jadi sel sempit mudah terlewat atau terbaca terlalu kuat. Tanpa jam banjir, tabel tidak menjawab "seberapa dulu".

Catatan, hulu Lembang (konteks), bukan lokasi kejadian: Kab. Bandung Barat (3224) 16 Nov, Himawari `tumbuh` 07:30 dan `puncak_tembus` 13:30; BMKG menyebut Lembang 14:45. Ini tidak dipakai sebagai kronologi banjir. Fixture `himawari_3224_20261116.json` tetap disimpan untuk rujukan.

## Kasus 3. Aceh: Kota Subulussalam (1114) dan Aceh Tamiang (1115), 12-17 Nov

Banjir berlangsung berhari-hari. Jam awal tidak terarsip (lihat "Pencarian jam kejadian"). Himawari hanya diunduh untuk jendela pendek 12 Nov 03:00-15:00 WIB (hari peringatan BMKG pertama), bukan seluruh 12-17 Nov.

| Sumber | Subulussalam | Aceh Tamiang |
| --- | --- | --- |
| Himawari `tumbuh`, 12 Nov | 13:00 (Tb_min 251,8 K, turun 16,6 K) | 04:00 (Tb_min 201,9 K, turun 13,2 K) |
| Himawari `puncak_tembus`, 12 Nov | tidak terpicu dalam jendela | 04:00 (sinyal sama dengan tumbuh) |
| BMKG, teks wilayah menyebut kecamatan kab | 12 Nov 04:55 (dilihat 07:00) | 12 Nov 04:55 (dilihat 07:00) |
| Laporan Koordalops, 'kejadian baru' | berkas 14 Nov | berkas 13 Nov |
| METAR WITT (Banda Aceh, jauh, konteks) | 15 Nov 14:00, `kuat` salah | sama |
| METAR WIMM (Medan, konteks) | tidak ada tanda | sama |
| Radar | tidak terarsip | tidak terarsip |

Aceh Tamiang 04:00 jatuh di awal jendela unduhan (pindaian ke-3 sejak 03:00); sinyal itu mungkin sudah berlangsung sebelum jendela dan tidak bisa dibaca sebagai awal. Jendela sesudah 12 Nov 15:00 tidak diunduh. Peringatan BMKG tercatat 1-2 hari sebelum berkas Koordalops pertama; itu hanya urutan arsip.

## Pencarian jam kejadian

Dicari di: berita arsip Dalops (`data/raw/dalops/berita_arsip/berita.json`), `public/data/dibi_kejadian.json`, `logbook_kejadian.json`, `status_darurat.json`, laporan harian Koordalops di repo.
- Berita arsip hanya memuat jam TERBIT, bukan jam kejadian, dan ringkasannya kosong. Jam terbit paling awal tentang banjir Cikalintu: 16 Nov 20:57 WIB (BPBD Kota Bandung tangani 20 rumah terdampak di Cipaganti). Itu batas atas, bukan jam banjir. Subulussalam: berita banjir sudah ada 13 Nov 20:47 WIB dan awal Nov.
- DIBI dan logbook hanya tanggal. Koordalops hanya tanggal berkas.
Kesimpulan: jam kejadian Cikalintu dan Aceh **tidak terarsip**, setelah dicari. Menit-sebelum tidak dihitung dan tidak diperkirakan dari jam terbit.

## Bagian D1 (`cuaca_arsip`, hasil SELECT hanya-baca, izin Q3)

Fixture `cuaca_arsip_9-18nov.json`: peringatan dini BMKG CAP publik, 9 Nov 00:00 sampai 18 Nov, tanpa data pelapor, poligon tidak dimuat (hanya kotak pembatas). Tiga keterbatasan:
1. Aturan NAMA mencocokkan kecamatan di teks wilayah; teks BMKG tanpa nama kab, jadi nama kecamatan yang dipakai kab lain di provinsi sama dibuang dulu (kerapatan lebih rendah, tidak keliru ke kab lain).
2. Aturan KOTAK lebih longgar dari poligon: kotak sering memuat titik kab padahal poligon tidak. Pakai hanya sebagai petunjuk longgar bahwa peringatan mungkin mencakup.
3. "Sistem kita pertama melihat" adalah `pertama_dilihat` penarik, bisa tertunda dari jam berlaku (contoh 12 Nov: berlaku 04:55, dilihat 07:00, jeda 125 menit).

## Keterbatasan

1. Tiga kasus, satu kejadian per kasus: tidak ada tingkat deteksi, alarm palsu, atau ketepatan yang bisa disimpulkan.
2. Jam kejadian hanya ada untuk Ciwidey (perkiraan "sekitar 14.30" dari video); dua kasus lain tanpa menit.
3. METAR yang diarsip tidak ada di lokasi kejadian. Baris METAR adalah konteks regional.
4. Satelit: titik contoh 0,1 derajat per kab (16 titik Kab. Bandung, 1 Kota Bandung): kab kecil seperti Kota Bandung hanya satu titik, sel konvektif sempit mudah terlewat atau terlalu kuat dibaca.
5. Radar tidak bisa dipakai (akses ditolak); sinyal 10.53 dari video tidak diverifikasi.
6. Sinyal di sini diurai setelah kejadian dengan ambang A1/A2 yang sudah ada; tidak berarti sinyal itu terbaca dan ditindaklanjuti waktu itu.
