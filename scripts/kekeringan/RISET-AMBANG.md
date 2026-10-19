# Riset ambang status kekeringan (B3b, 19 Okt 2026)

Protokol ini ditulis SEBELUM angka kandidat mana pun dihitung. Yang sudah
diketahui saat menulis: skor aturan sekarang (SPI-3, Waspada+) di tiga periode
(POD 10/15/38%, FAR 99/98/95%) dan jumlah kejadian DIBI kering per tahun
(2023: 26, 2024: 90, 2025: 50, 2026: 122; puncak Jun-Sep). Skor kandidat baru
belum pernah dilihat. Kode: `scripts/kekeringan/ambang.py`, dipanggil
`ujibalik.py`, keluaran `public/data/kekeringan_ujibalik.json` bagian `setel`.

## Satuan dan kejadian

Sama dengan `ujibalik.py` bagian `kejadian`: kabupaten-bulan; teramati = >= 1
kejadian kering DIBI di kabupaten itu pada bulan itu; alarm kabupaten = >= 30%
penduduk tinggal di kecamatan yang sel 0,5 derajatnya beralarm (aturan
`status.py`, tidak disetel). Diagnosis serentak (bulan yang sama), bukan
prakiraan.

## Pembagian waktu

- **Latih (memilih aturan):** Okt 2023 - Des 2024 (15 bulan, 101 kab-bulan
  berkejadian).
- **Uji (sekali):** Jan 2025 - Agu 2026 (20 bulan, bulan SPI terakhir di cache
  POWER; 141 kab-bulan berkejadian).
- Alasan: pembagian maju dalam waktu meniru pemakaian nyata (aturan dipilih dari
  masa lalu lalu dipakai ke depan). Kedua sisi memuat musim kemarau penuh. Sisi
  latih El Nino 2023, sisi uji memuat 2025 (netral) dan 2026 (El Nino), jadi uji
  ini juga melihat apakah aturan bertahan di tahun bukan El Nino. Lipatan
  lain (silang tahun) tidak dipakai: dengan tiga musim kemarau saja, tiap
  lipatan memilih ulang aturan dan angka uji gabungannya tidak lagi menguji satu
  aturan tetap.
- SPI periode 2023-2026 memakai baku gamma 1991-2020, dan klimatologi musim juga
  1991-2020: tidak ada informasi dari periode latih maupun uji yang bocor ke
  ambang selain pilihan kandidat itu sendiri.

## Kandidat (semuanya, tidak ada yang lain dicoba)

Per sel dan bulan: `s3` = SPI-3 berakhir bulan itu, `s6` = SPI-6, `h` = hujan
bulan itu (mm), `k` = rerata hujan bulan itu 1991-2020 (mm). `t` dalam
{-0,5; -1; -1,5}. 7 keluarga x 3 ambang = **21 konfigurasi**.

| Kode | Alarm sel | Gagasan |
| ---- | --------- | ------- |
| A | `s3 <= t` | aturan sekarang (A, t = -1 = Waspada+ sekarang) |
| B | `s6 <= t` | kering lebih panjang |
| C | `s3 <= t` DAN `s6 <= t` | kering pendek yang menumpuk di atas kering panjang |
| D | `s3 <= t` ATAU `s6 <= t` | salah satu |
| E | `s3 <= t` DAN `k < 100` | hanya di musim kemarau setempat (bukan bulan basah Schmidt-Ferguson menurut klimatologi sel) |
| F | `s3 <= t` DAN `s6 <= t` DAN `k < 100` | C + musim |
| G | `h < 60` DAN `s3 <= t` | bulan itu benar-benar bulan kering Schmidt-Ferguson dan di bawah normal |

Tidak dicoba, dengan alasan:
- **HTH** sebagai syarat: HTH dihitung dari hujan harian Open-Meteo beberapa
  bulan terakhir saja (`hth.py`); tidak ada riwayat harian 2023-2024 untuk
  periode latih.
- **Persentil tanah**: klimatologi ERA5-Land per sel baru terisi di sebagian
  kecil sel dan tanpa riwayat harian 2023-2026.
- **Ambang per pulau**: periode latih hanya 101 kab-bulan berkejadian; dibagi
  lima pulau besar tiap ambang dipilih dari 10-30 kejadian dan jumlah kandidat
  berlipat lima. Iklim setempat masuk lewat syarat musim per sel (E, F, G).
- Batas 30% penduduk tidak disetel.

## Aturan memilih (di periode latih saja)

CSI tertinggi di periode latih. Seri dipecah dengan urutan daftar (A sebelum B,
ambang -0,5 sebelum -1 sebelum -1,5). Skor uji hanya dihitung untuk aturan
terpilih dan dua pembanding; kandidat lain hanya punya skor latih di berkas.

## Kriteria LAYAK (periode uji, sekali)

Sama seperti `ujibalik.KRITERIA_LAYAK`: POD >= 0,5, FAR <= 0,8, CSI >= 2 x CSI
alarm acak (laju alarm dan laju kejadian sama), dihitung pada angka titik
periode uji. Ditambah: batas bawah selang bootstrap 95% CSI harus di atas CSI
acak (unggul dari acak tidak hanya karena kebetulan bulan).

Selang bootstrap: 2.000 ulangan, bulan dicuplik ulang dengan pengembalian
(kabupaten dalam satu bulan bergerak bersama karena kering itu luas), persentil
2,5 dan 97,5; benih tetap (`random.Random(20261019)`).

## Pembanding

- Aturan sekarang (A, t = -1) di periode latih dan uji.
- Alarm acak: CSI harapan untuk laju alarm dan laju kejadian yang sama.

## Akibat

- LAYAK: `status.py` memakai aturan terpilih untuk tingkat Waspada dan
  `vonis.layak` di berkas melepas pil hipotesis.
- TIDAK LAYAK: `status.py` tidak berubah; hasil jujur tampil di tab Metode.

## Batas

DIBI mencatat laporan BPBD, bukan semua kekeringan, jadi FAR batas atas. Laju
kejadian ~1,3% kab-bulan: FAR <= 0,8 berarti 1 dari 5 alarm harus bertepatan
dengan laporan, jauh di atas laju dasar. Hasil ditulis di bawah ini sesudah
dijalankan sekali.

## Hasil (satu kali jalan, 19 Okt 2026, data SPI sampai Agu 2026)

Skor latih semua kandidat ada di `kejadian.setel.kandidat`. Terpilih di latih:
**E-0,5** (SPI-3 <= -0,5 di musim kemarau setempat), CSI latih 0,054 vs acak
0,008; tertinggi berikutnya G-0,5 (0,039), E-1,0 (0,038). Tidak satu pun dari 21
kandidat mencapai POD >= 0,5 dan FAR <= 0,8 sekaligus di periode latih.

| Aturan | Periode | POD | FAR | CSI | CSI acak |
| ------ | ------- | --- | --- | --- | -------- |
| E-0,5 (terpilih) | latih Okt 2023 - Des 2024 | 0,139 | 0,919 | 0,054 | 0,008 |
| E-0,5 (terpilih) | uji Jan 2025 - Agu 2026 | 0,227 (0-0,39) | 0,926 (0,89-1,00) | 0,059 (0-0,076) | 0,011 |
| A-1,0 (sekarang) | latih | 0,099 | 0,988 | 0,011 | 0,012 |
| A-1,0 (sekarang) | uji | 0,312 (0,11-0,55) | 0,959 (0,94-0,99) | 0,038 (0,013-0,053) | 0,012 |

Angka dalam kurung = selang bootstrap 95% (cuplik ulang bulan, 2.000 kali).

**Vonis: TIDAK LAYAK.** POD 0,23 < 0,5; FAR 0,93 > 0,8; batas bawah selang
CSI 0 tidak di atas acak. `status.py` tidak diubah; pil hipotesis tetap.

Bacaan:
- Syarat musim memang menyaring: alarm turun dari 10,6% ke 4,3% kab-bulan dan
  CSI titik naik (0,038 -> 0,059, 5x acak), tetapi tangkapan juga turun (31% ->
  23%). Arahnya sama di latih dan uji, tetapi selang CSI keduanya tumpang tindih, jadi belum terbukti lebih baik dari ambang sekarang,
  hanya belum cukup.
- Laju kejadian 1,4% kab-bulan membuat FAR <= 0,8 menuntut alarm 14 kali lebih
  tepat dari dasar. Dengan DIBI yang hanya mencatat laporan BPBD, sebagian
  "alarm palsu" kemungkinan kekeringan tanpa laporan; kriteria tidak
  dilonggarkan karena itu.
- Selang CSI menyentuh 0 karena kejadian mengumpul di Jun-Sep: cuplikan ulang
  yang kebanyakan memuat bulan basah tidak punya kejadian sama sekali. Dengan
  20 bulan uji, selang lebar ini nyata, bukan cacat hitungan.
- A-1,0 di sini memakai `spi.spi_seri` (sama dengan `status.py`); bagian
  `kejadian.aturan` lama memakai fit LOO `prakiraan.fit_gamma`, jadi hitungan
  palsu berbeda sedikit (latih 815 vs 807).

Langkah yang mungkin mengubah vonis (belum dicoba, butuh protokol baru):
riwayat HTH harian panjang (mis. CHIRPS/POWER harian 2023-2024) sebagai syarat,
dan DIBI yang lebih panjang (sebelum Okt 2023) supaya latih tidak satu musim.
