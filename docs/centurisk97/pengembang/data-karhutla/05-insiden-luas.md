# Insiden dan luas terbakar

Halaman ini menjelaskan pelacakan insiden lintas putaran, perkembangan per insiden, hitungan luas terbakar harian, dan luas dari citra Sentinel-2.

## 9. Insiden api

`scripts/data/insiden.py` mencocokkan kompleks tingkat 2 ke atas ke insiden lama lewat kedekatan geometri:

```
tepi bila jarak terdekat antar titik atau simpul <= JARAK_KM (0,6)
         atau titik satu berada di dalam garis luar yang lain
satu komponen terhubung = satu insiden ; yang tertua menang, sisanya
direkam "gabung" selama SIMPAN_HARI (14)
tak terdeteksi: tanpa deteksi dan tanpa kompleks cocok selama PADAM_HARI (3)
dibuka lagi bila menyala dalam BUKA_HARI (3), gambut BUKA_GAMBUT_HARI (10)
(insiden.py:66-70)
```

Luas koreksi: jumlah deteksi kumulatif x hektare per deteksi. Faktor per provinsi adalah median luas resmi KLHK (SiPongi) dibagi jumlah deteksi VIIRS S-NPP nominal dan tinggi per tahun (tahun >= 2020), dengan rentang p10 sampai p90 antar tahun; 15 dari 38 provinsi jatuh ke faktor nasional. Radius ketidakpastian adalah ukuran piksel nominal sensor, sehingga merupakan batas bawah. Faktor ini adalah rentang antar tahun, bukan selang kepercayaan.

**Perkembangan per insiden** (`scripts/data/arsip_insiden.py`, `scripts/data/progresi.py`, paket `data/kajian-bnpb/insiden-kaya/`; metode diambil dari repo pembanding berlisensi MIT dan ditulis ulang tanpa pustaka tambahan):

- waktu tiba per petak 375 m = deteksi pertama dikurangi setengah jeda lintasan sebelumnya;
- permukaan waktu tiba = median 5 petak terdeteksi terdekat;
- garis depan harian pukul 14.00 WIB; laju = persentil 90 kemajuan petak baru; lompatan 2 sampai 10 km; titik awal berbobot FRP;
- petak lebih tua dari awal insiden dikurangi 24 jam dibuang, karena arsip memakai geometri insiden saat ini.

Status uji: HIPOTESIS. Uji tahan A10 pada FIRMS 2019 dan 2023 menunjukkan median 5 petak mengungguli tetangga terdekat (dalam 24 jam 0,82 lawan 0,75; galat rata-rata mutlak 14,3 lawan 18,4 jam), tetapi kelompok produksi hanya memuat 1 insiden dengan >= 50 petak, sehingga vonis tertulis "belum" (`tests/insiden/hasil_uji.json`). Dari 54 insiden aktif hanya 3 yang memiliki >= 20 petak VIIRS. Angka yang tidak terukur tampil "belum terukur", bukan nol.

## 10. Luas terbakar harian, belum padam, dan padam

Dua jalur, dengan satuan berbeda.

**Peta karhutla** (`scripts/data/peta_karhutla.py`, per provinsi, kabupaten, dan kecamatan, hari WIB):

```
hot   = lokasi unik per hari (definisi di [Sumber deteksi dan angka utama](/docs/pengembang/data-karhutla/sumber-titik), tanpa sel sumber panas tetap)
luas  = ( n_N20 x F20 + n_N21 x F21 ) / 2 ,  n = titik n/h per satelit
        F20 = 4,12 ha ; F21 = 4,16 ha  (peta_karhutla.py:84)
        di pita bujur 5 derajat tempat satu satelit hilang: bobot penuh
        satelit yang ada, tanpa dibagi 2
belum = (A + B) x F_LOK ,  F_LOK = 2,25 ha per lokasi (peta_karhutla.py:89)
        A = sel yang bertahan: ada deteksi N20/N21 n/h di sel 3 x 3
            pada 12 sampai 36 jam sebelumnya
        B = sel baru yang berada di cluster firespot "ya"
padam(d) = bobot yang sama atas titik hari d-2 yang sel 3 x 3-nya tanpa
           deteksi N20/N21 n/h pada hari d-1 dan d  (48 jam tanpa titik = padam)
```

F20 dan F21 berasal dari kalibrasi langsung per satelit: luas resmi BNPB 2019 sampai 2025 dibagi titik N20 n/h per tahun (median 4,12; N21 median 4,16 pada 2024 sampai 2025); perubahan dari cara lama (rasio S-NPP x 4,3) +20 persen terhadap SiPongi pada Januari sampai Juli 2026. F_LOK = luas resmi 2024 sampai 2025 dibagi lokasi-hari N20 gabung N21. Angka dibulatkan sekali per provinsi (setengah ke atas); nasional adalah jumlah angka provinsi. Celah ditandai bila S-NPP nasional kurang dari 0,6 kali harapan (`CELAH_NAS`), atau satu satelit kurang dari atau sama dengan 0,1 kali harapan di satu pita bujur (`CELAH_HILANG`) dengan harapan minimal 100 titik (`CELAH_MIN`); baris ada di `peta_karhutla.py:116-118`. Invarian `periksa()`, `periksa_kab()`, `periksa_wil()` tidak boleh dilonggarkan. Aturan "padam" 48 jam berbeda dari aturan 72 jam (168 jam gambut) pada kompleks harian.

**Laporan harian** (`scripts/data/laporan.py`): luas = titik S-NPP keyakinan >= 1 pada hari laporan x `HA_TITIK` 4,30 ha (rentang 3,22 sampai 4,59; `laporan.py:47`). Hari laporan = (D-1 16.00, D 16.00] WIB. Mulai 2 November 2026, hari tanpa S-NPP memakai titik NOAA-20 dibagi 0,97.

Catatan penting: angka satelit adalah perkiraan. Angka resmi luas terbakar tetap dari KLHK (SiPongi); GWIS belum punya data 2026.

## 11. Luas terbakar dari citra Sentinel-2 (dNBR)

`scripts/data/luas_citra.py` menghitung perkiraan luas bekas bakar per insiden setelah api tak terdeteksi lebih dari 7 hari (`N_HARI`). Satu adegan pra (bersih, sebelum awal) dan satu pasca (bersih, sesudah terakhir) dari Earth Search:

```
NBR  = (NIR - SWIR) / (NIR + SWIR)
dNBR = NBR_pra - NBR_pasca
piksel terbakar : dNBR > 0,27  DAN  NBR_pasca < 0,2        (luas_citra.py:40-41)
luas_ha  = piksel terbakar valid x luas piksel   (batas bawah: piksel berawan tidak dihitung)
cakupan >= 60 persen piksel topeng valid agar luas dilaporkan (CAKUPAN_MIN)
kontrol latar: aturan sama di cincin 2 sampai 4 km (RING_KM)
luas_ha < 2 x latar_ha  ->  luas_ha: null, dengan luas_mentah_ha dan alasan
```

Ambang awan: adegan pra awan <= 40 persen, pasca <= 30 persen. Hanya piksel dalam topeng insiden (<= 1,2 km dari simpul atau titik) yang dihitung. Rentang = akar jumlah piksel (ketidakpastian cacah, bukan galat klasifikasi). Kelas keparahan lima tingkat dNBR dan cadangan radar Sentinel-1 (RBR) ada; ambang RBR BELUM disetel sehingga berlabel `s1_rbr_hipotesis`.

Status uji: INDIKATIF. `ujiluas_dnbr.json` pada 33 dari 120 cluster S-NPP Agustus sampai Oktober 2023 yang citranya cukup bersih menunjukkan luas dNBR pada median 0,5 sampai 0,6 dari luas piksel titik panas (rentang median 0,3 sampai 0,8), sekitar 1,5 sampai 4 kali asumsi 20 persen, dengan sebaran antar-cluster 0,09 sampai 2,2 dan tanpa verifikasi lapangan. Tidak dipakai sebagai koreksi faktor. Kata "terukur" baru boleh dipakai setelah dibandingkan dengan luas lapangan pada >= 20 insiden. Dalam percobaan sampling, dNBR 0,27 mentah memberi 11,6 juta ha (10 kali angka resmi); dengan jeda <= 60 hari, NBR pasca < 0,1, B8A turun, dan kontrol latar: 2,0 juta ha (rentang 0,5 sampai 3,4).
