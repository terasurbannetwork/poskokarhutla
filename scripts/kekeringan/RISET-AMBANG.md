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

---

# Putaran 2 (22 Okt 2026): satuan uji, zona iklim, tanah dan HTH

Protokol ini ditulis SEBELUM skor kandidat putaran 2 dihitung. Yang sudah dilihat
saat menulis: seluruh hasil putaran 1 (di atas), termasuk skor uji E-0,5 dan A-1,0.
Jadi periode uji Jan 2025 - Agu 2026 BUKAN murni buta untuk dua aturan itu;
untuk semua aturan dan satuan lain di bawah, skor latih maupun uji belum pernah
dilihat. Kriteria LAYAK tidak diubah: POD >= 0,5, FAR <= 0,8, CSI >= 2 x CSI acak
(`ujibalik.KRITERIA_LAYAK`). Pembagian waktu sama: latih Okt 2023 - Des 2024, uji
Jan 2025 - Agu 2026. Kode: `scripts/kekeringan/ambang2.py`, keluaran
`kekeringan_ujibalik.json` bagian `kejadian.setel2`.

## Tuas (a): satuan verifikasi dan jeda

Alarm kabupaten sama seperti putaran 1 (>= 30% penduduk di kecamatan yang selnya
beralarm). Delapan rancangan, tidak ada yang lain:

| Kode | Satuan | Alarm di | Kejadian di | Toleransi |
| ---- | ------ | -------- | ----------- | --------- |
| D0 | kab-bulan | bulan t | t | 0 (putaran 1) |
| D1 | kab-bulan | t | t | +-1 bulan |
| D2 | kab-bulan | t | t+1 | 0 |
| D3 | kab-bulan | t | t+2 | 0 |
| D4 | kab-bulan | t | t+1 | +-1 bulan (t..t+2) |
| D5 | kab-bulan | t | t+2 | +-1 bulan (t+1..t+3) |
| D6 | kab-triwulan kalender (Jan-Mar, Apr-Jun, Jul-Sep, Okt-Des) | bulan pertama triwulan | triwulan itu | prakiraan jeda 0-2 bulan |
| D7 | kab-triwulan | salah satu bulan triwulan | triwulan itu | diagnosis serentak |

Skor dengan toleransi (D1, D4, D5): POD = kejadian yang punya alarm di
jendelanya / semua kejadian; FAR = alarm yang tak punya kejadian di jendelanya /
semua alarm; CSI = 1 / (1/(1-FAR) + 1/POD - 1) (identitas diagram kinerja).
CSI acak: alarm bebas dengan laju sama; kemungkinan alarm di jendela = 1-(1-a)^w,
kemungkinan kejadian di jendela = 1-(1-o)^w (w = lebar jendela), CSI acak dengan
rumus yang sama. Tanpa toleransi (w = 1) identik dengan `skor_kontingensi`.
Batas kejadian = bulan SPI terakhir (Agu 2026); Sep-Okt 2026 masih bisa terlambat
dilaporkan dan tidak dipakai. Bulan alarm t dipakai hanya bila seluruh jendela
kejadiannya jatuh di dalam periodenya sendiri (latih: jendela dalam Okt 2023 -
Des 2024, jadi kejadian 2025 tidak bocor ke label latih; uji: bulan alarm >= Jan
2025 dan jendela sampai Agu 2026). Peristiwa dicocokkan dari dua arah: alarm
menilai FAR dari jendela kejadiannya, kejadian menilai POD dari jendela alarmnya
(alarm bulan s-jeda-1 .. s-jeda+1). Triwulan Jul-Sep 2026 hanya memuat Jul-Agu dan
tetap dipakai; triwulan latih = lima triwulan penuh Okt 2023 - Des 2024.

## Tuas (b): ambang per zona iklim

Zona ditetapkan dari klimatologi hujan sel 1991-2020 saja, bukan dari kejadian:
R = rerata hujan bulanan Jun-Agu / rerata Des-Feb. **Z1 monsunal: R < 0,5**
(kemarau tegas, Jawa, Nusa Tenggara, selatan Sumatra/Sulawesi); **Z2 lainnya:
R >= 0,5** (ekuatorial, dua puncak, antimonsun). Untuk tiap keluarga A-G, ambang
t dipilih per zona: (t_Z1, t_Z2) dari {-0,5; -1; -1,5}^2 = 9 pasangan, 6 di antaranya
berbeda dari ambang global. Sel tanpa klimatologi dihitung Z2.

## Tuas (c): tanah dan HTH

Tanah dan HTH tidak punya riwayat di repo, jadi diambil dari NASA POWER (sumber
SPI yang sama, tanpa kunci): `GWETROOT` bulanan 1991-2026 (kebasahan tanah zona
akar, MERRA-2) dan `PRECTOTCORR` harian 1 Sep 2023 - 31 Agu 2026.
- `tanah` = persentil nilai GWETROOT bulan itu terhadap 30 nilai bulan kalender
  yang sama 1991-2020 (peringkat; <= p berarti kering).
- `hth` = hari tanpa hujan beruntun terpanjang (hujan harian < 1 mm, kebiasaan
  BMKG) yang berakhir di bulan itu, menyambung dari bulan sebelumnya. Awal rangkaian
  1 Sep 2023, jadi Okt 2023 memotong rangkaian yang mulai sebelum itu (bias
  rendah, tidak menguntungkan kandidat).
Keluarga baru, p dalam {20; 10}, d dalam {21; 31} hari (kategori BMKG "panjang" dan
"sangat panjang"), t dalam {-0,5; -1; -1,5}:
| Kode | Alarm sel |
| ---- | --------- |
| I | E dan tanah <= p (6 konfigurasi) |
| J | E dan hth >= d (6) |
| K | E dan tanah <= p dan hth >= d (12) |
| L | tanah <= p dan hth >= d, tanpa SPI (4) |
Alarm sel bernilai None bila bahannya kosong (tidak dihitung, sama seperti putaran 1).

## Himpunan kandidat dan aturan memilih

Aturan per rancangan = 21 (putaran 1, ambang global) + 42 (A-G dengan ambang per
zona yang berbeda dari global) + 28 (I-L) = **91**, dikali **8 rancangan = 728
kandidat**. Memilih (di LATIH saja): per rancangan, CSI latih tertinggi dengan
syarat minimal 10 tepat di latih (hindari kandidat nyaris tanpa alarm); seri ->
urutan daftar. Tiap rancangan menghasilkan satu terpilih, jadi **K = 8 uji**.

## Kriteria LAYAK putaran 2

Per rancangan terpilih, di UJI: POD >= 0,5, FAR <= 0,8, CSI >= 2 x CSI acak, DAN
batas bawah selang bootstrap CSI di atas CSI acak. Karena K = 8 uji dilakukan,
selang memakai koreksi Bonferroni: persentil 0,3125 dan 99,6875 (2,5%/8) dari
10.000 ulangan, benih 20261022; yang dicuplik ulang adalah bulan (D0-D5) atau
triwulan (D6-D7). Pembanding ikut dilaporkan: aturan sekarang (A-1,0) di tiap
rancangan.
- Bila SATU atau lebih rancangan LAYAK: yang CSI uji-nya tertinggi dipasang
  (`status.py` memakai aturannya, pil hipotesis lepas), dan klaim "teruji" hanya
  berlaku untuk satuannya (kalimat vonis menyebut satuan dan jeda).
- Bila tidak ada: `status.py` dan pil tidak berubah.
- Hasil jalan satu kali ini dibekukan di `kejadian.setel2`; ujibalik.py tidak
  menghitung ulangnya tiap bulan (pengujian berikutnya baru sah pada kejadian
  Sep 2026 dan sesudahnya, yang belum terjadi saat ini).

## Catatan kewajaran target (tidak dipakai untuk meloloskan)

DIBI adalah laporan BPBD, bukan sensus kekeringan. Diagnostik yang dilaporkan di
`setel2.pelaporan` TANPA mengubah kriteria: (1) sebaran kejadian menurut provinsi
dan berapa kabupaten pernah melapor; (2) FAR terpilih dipecah menurut provinsi
yang pernah melapor kejadian kering vs yang tidak pernah; (3) bukti bahwa
kabupaten yang melapor sekali cenderung melapor berulang. FAR yang turun tajam di
provinsi pelapor menandakan sebagian "alarm palsu" adalah kekeringan tanpa laporan.

## Hasil putaran 2 (satu kali jalan, 22 Okt 2026, SPI/tanah/HTH sampai Agu 2026)

`python3 scripts/kekeringan/ambang2.py jalan`; 728 kandidat; 609 dari 611 sel punya
tanah/HTH (2 sel gagal unduh, aturan tanah/HTH tak bernilai di sana). Zona: 156
sel monsunal (Z1), 455 lainnya (Z2). Tak satu pun dari 728 kandidat memenuhi
POD >= 0,5 dan FAR <= 0,8 sekaligus di periode LATIH.

| Rancangan | Terpilih (latih) | POD uji | FAR uji | CSI uji | CSI acak | A-1,0 CSI uji |
| --------- | ---------------- | ------- | ------- | ------- | -------- | ------------- |
| D0 kab-bulan serentak | E[Z1-0,5 / Z2-1,0] | 0,227 | 0,923 | 0,061 | 0,011 | 0,038 |
| D1 serentak +-1 bln | E[Z1-0,5 / Z2-1,5] | 0,132 | 0,815 | 0,083 | 0,016 | 0,047 |
| D2 jeda 1 bln | Lp20d21 | 0,057 | 0,932 | 0,032 | 0,007 | 0,026 |
| D3 jeda 2 bln | B[Z1-1,0 / Z2-1,5] | 0,050 | 0,966 | 0,021 | 0,009 | 0,021 |
| D4 jeda 1 bln +-1 | Lp20d21 | 0,000 | 0,667 | 0,000 | 0,001 | 0,047 |
| D5 jeda 2 bln +-1 | B[Z1-1,0 / Z2-1,5] | 0,000 | 0,946 | 0,000 | 0,017 | 0,023 |
| D6 kab-triwulan, alarm bulan pertama | J-0,5 d21 | 0,122 | 0,802 | 0,082 | 0,014 | 0,065 |
| D7 kab-triwulan, alarm salah satu bulan | E[Z1-0,5 / Z2-1,5] | 0,412 | 0,832 | 0,136 | 0,027 | 0,089 |

**Vonis: TIDAK LAYAK untuk kedelapan rancangan.** Terbaik D7 (diagnosis per
kab-triwulan): CSI 0,136 = 5 kali acak, tetapi POD 0,41 < 0,5, FAR 0,83 > 0,8, dan
batas bawah selang Bonferroni CSI 0 (hanya 7 triwulan uji). `status.py` dan pil
hipotesis tidak berubah.

Bacaan:
- Toleransi dan satuan triwulan menaikkan skor mentah (D7 CSI 0,136, aturan
  sekarang 0,089), tetapi itu sebagian besar karena satuannya lebih longgar; FAR
  tetap di atas 0,8 dan POD di bawah 0,5. Tidak ada kandidat latih yang lolos
  POD dan FAR, jadi pelolosan di uji pun tidak akan bisa dibenarkan oleh latih.
- Jeda 1 dan 2 bulan (D2-D5, prakiraan sungguhan) jatuh ke batas acak atau di
  bawahnya: SPI-3/tanah/HTH bulan ini tidak memberi petunjuk laporan kekeringan
  1-2 bulan lagi di data 2023-2026.
- Ambang per zona memang dipilih di 5 dari 8 rancangan, dengan pola konsisten
  (Z1 monsunal -0,5, Z2 -1,0/-1,5), tetapi tanpa pengujian lanjutan ia tidak
  mengubah vonis.
- Tanah (GWETROOT) dan HTH muncul sebagai terpilih (L, J) hanya di rancangan jeda
  dan triwulan-bulan-pertama yang skornya sudah di dasar; tak satu pun memberi
  keunggulan tegas atas SPI-3 saja.

Kewajaran target DIBI (catatan, bukan alasan lolos): dari 508 kabupaten, 133 (26%)
pernah melapor kekeringan Okt 2023 - Agu 2026, dan 60 dari 133 melapor lebih dari
satu bulan. Pelapor terbanyak Jawa Tengah (27 dari 35 kab), Jawa Barat (21 dari
27), Jawa Timur (14 dari 38), NTB (10 dari 10): DIBI sangat terkonsentrasi di
Jawa dan Nusa Tenggara. Alarm D7 (rancangan terbaik) di provinsi yang tak pernah melapor 23 dari 23
palsu menurut definisi; di provinsi pelapor FAR 0,82 (244 dari 298). Jadi
sebagian FAR memang artefak pelaporan, tetapi hanya 23 dari 321 alarm berada
di luar provinsi pelapor, sehingga koreksi pelaporan tidak mengubah kesimpulan.
Target ini adil untuk menyatakan ada atau tidak ada laporan BPBD, tidak untuk
menyatakan ada atau tidak ada kekeringan fisik.

Langkah yang masih mungkin: kejadian Sep 2026 dan sesudahnya sebagai uji
sungguhan baru, DIBI pra-2023 untuk memperpanjang latih, dan target selain
laporan (mis. status siaga darurat SK BNPB atau gagal panen BPS).

### Koreksi pelaporan (22 Okt 2026, sesudah tinjauan)

- Aturan "rancangan terdekat" (untuk diagnostik pelaporan) tertulis di kode sejak
  awal sebagai rasio CSI/CSI acak uji tertinggi = **D6** (5,86x; D7 5,04x). Sempat
  saya ubah ke CSI mentah (D7) sesudah melihat hasil; itu dikembalikan.
  `pelaporan` kini untuk D6 (aturan J-0,5 d21: FAR 78,7% di provinsi pelapor, 6
  dari 6 alarm palsu di provinsi non-pelapor); D7 (CSI mentah tertinggi, 0,136)
  dilaporkan terpisah di `pelaporan_csi_tertinggi` (FAR 81,9% di provinsi
  pelapor, 23 dari 23 palsu di non-pelapor). Kesimpulan sama pada keduanya.
  Teks "Alarm D7 ..." di atas merujuk ke rancangan CSI mentah tertinggi itu.
- Jenis rancangan: D0, D1, D7 diagnosis (alarm boleh jatuh sesudah kejadian dalam
  jendela atau triwulan); D2-D5 prakiraan; D6 campuran. D7 BUKAN bukti kemampuan
  prakiraan. Tertulis di `rancangan.*.jenis` dan kartu Metode.
- Selang bootstrap dengan kurang dari 10 klaster (D6, D7: 7 triwulan) tak andal:
  `terpilih_selang_bonferroni.andal = false`, angka selang disembunyikan di layar.
- CSI acak memakai satu penyebut unit valid untuk laju alarm dan laju kejadian
  (pendekatan; rentang bulan kejadian bergeser sedikit pada rancangan bertoleransi).
- Uji tidak sepenuhnya buta untuk keluarga E dan aturan A-1,0 (skor ujinya sudah
  dilihat di putaran 1).
- Teks vonis memakai persen satu desimal (FAR D6 80,2% > 80,0%).
