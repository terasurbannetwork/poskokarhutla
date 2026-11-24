# ALGORITMA: Insiden Kaya

Semua ambang yang belum dijawab pemilik bertanda **[SEMENTARA]** dan bersumber dari `KEPUTUSAN-INSIDEN.md`. Tiap rumus murni punya fungsi dengan uji di `RENCANA-UJI.md`.
Metode bagian A diambil dari `progression.py` pembanding (MIT) dan ditulis ulang di stdlib (D3). Bagian B memakai ulang mesin bangunan kita.

## Konstanta

| Nama | Nilai | Asal |
| ---- | ----- | ---- |
| `SEL_DEG` | 0,0034 derajat | `SEL_PIKSEL` di `insiden.py` dan `SEL` di `arsip_insiden.py` (satu piksel VIIRS) |
| `ARSIP_DARI` | 1 Jul 2026 00.00 UTC | `arsip_insiden.py`; semua waktu arsip dalam menit sejak ini |
| `MAKS_PETAK` | 20.000 | `arsip_insiden.py` (yang paling awal dipertahankan) |
| `KM_SEL` | 0,0034 × 111,32 = 0,378 km | pembanding `KM_PER_CELL` |
| `HA_SEL` | 14,0625 ha | `PIKSEL_HA` |
| `JEDA_GABUNG_JAM` | 1,5 | pembanding `merge_h` |
| `JEDA_BAWAAN_JAM` | 12; batas atas 24 | pembanding |
| `K_TETANGGA` | 5 | pembanding, dipilih uji tahan mereka |
| `FRONT_UTC` | 07.00 UTC (14.00 WIB) | pembanding |
| `LOMPAT_MIN_KM`, `LOMPAT_MAKS_KM` | 2, 10 | pembanding `JUMP_KM` |
| `MIN_PIKSEL` | 20 [SEMENTARA, Q9] | pembanding `MIN_DETECTIONS` |
| `SEGAR_JAM` | 12 | `insiden.py` |
| `RADIUS_BANGUNAN_M` | 500 | K2, PKH-07 |
| `AMBANG_BANGUNAN` | 0,70, hanya dibaca dari `bangunan.AMBANG_KEYAKINAN` | `bangunan.py` |
| `GALAT_HALUS_KM` | 0,08 | `siklus/paparan.py` |

## A. Perkembangan api per insiden

### A1. Masukan

Untuk insiden `id`, himpunan petak `D` = petak di `public/data/progresi/arsip/<id>.json` (kunci `petak: [iy, ix, t_menit, frp, sensor]`) dengan `sensor` ∈ {`N`, `N20`, `N21`}; arsip sudah hanya berisi keyakinan nominal atau tinggi dan tanpa sumber panas tetap (keyakinan rendah tidak ada di arsip dan tidak ikut epoch). `t` = menit sejak `ARSIP_DARI`, diubah ke jam UTC bila perlu. Petak bersensor `M` tidak masuk `D` (pikselnya 1 km); catatan kode: arsip menyimpan satu sensor per sel dengan waktu terawal, jadi sel yang pertama terlihat oleh MODIS memakai waktu MODIS, dan IK-01 memutuskan apakah arsip dipisah per jenis sensor.
Sumber: arsip per insiden (F-1), bukan `hotspot24.json` langsung. Insiden dengan piksel unik < `MIN_PIKSEL` berhenti di sini: `tersedia:false`, alasan "terlalu kecil untuk dilacak". `hitung_sejak` = waktu terawal arsip insiden, tidak lebih awal dari `ARSIP_DARI`.

Petak = kunci sel `(iy, ix) = (floor(lat / SEL_DEG), floor(lon / SEL_DEG))` (sudah menjadi kunci arsip). Satu petak = satu piksel unik. Per petak simpan `t_pertama = min t` dan `frp` (arsip menyimpan FRP dari deteksi terawal, bukan maksimum).

### A2. Epoch pengamatan

```
E0 = { e dari arsip.epoch : jam(e) di [min(D) - 48, max(D) + 1] }    // arsip: waktu deteksi VIIRS/MODIS, dibulatkan KE BAWAH 30 menit, sel 1 derajat yang menyentuh kotak insiden ±1 derajat, tanpa jendela waktu
E  = E0 diurut, dengan elemen yang selisihnya <= JEDA_GABUNG_JAM dari elemen sebelumnya dibuang   // lintasan N20 dan N21 menyatu
```
Himawari tidak dihitung epoch (geostasioner, resolusi 2 km, bukan pengamatan 375 m).
**Keterbatasan masukan:** `titik_hari` hanya menyimpan waktu deteksi pertama tiap lokasi unik per hari WIB, jadi epoch hanya lintasan yang menemukan lokasi baru hari itu; lintasan yang cuma mengulang lokasi lama tidak tampak, jeda membesar, dan `galat = jeda / 2` ikut membesar (KEPUTUSAN D18 butir a, Q11). Sel 1 derajat yang menyentuh kotak lebih longgar daripada kotak ±1 derajat persis (kelebihan epoch hanya membuat jeda lebih kecil, bukan lebih besar).

### A3. Waktu tiba per petak

```
untuk petak p dengan t_pertama:
  e = elemen terbesar E yang < t_pertama - 0,75
  jeda = t_pertama - e         bila e ada dan jeda > 0, selain itu JEDA_BAWAAN_JAM
  jeda = min(jeda, 24)
  t_tiba(p) = t_pertama - jeda / 2
  galat(p)  = jeda / 2          // jam
```
Deteksi berikutnya pada petak yang sama tidak mengubah `t_tiba` (itu bara, bukan penjalaran).

### A4. Jejak dan permukaan waktu tiba

```
det    = himpunan petak terdeteksi
jejak  = tutup2(dilasi4(det)) gabung det        // dilasi tetangga 4, lalu penutupan 2 iterasi
untuk sel s dalam jejak tak terdeteksi:
  T(s) = median(t_tiba dari 5 petak terdeteksi terdekat ke s)     // jarak Euklid sel; indeks kisi dict
untuk petak p terdeteksi:
  T(p) = min(T(p), t_pertama(p))        // sel tak boleh sampai sesudah terlihat menyala
```
Pencarian tetangga terdekat: kisi dict berukuran blok 16 sel dan perluasan cincin sampai 5 tetangga ditemukan (stdlib). Bila petak terdeteksi < 5, `K` = jumlahnya.

### A5. Garis depan harian

```
t1 = min t_tiba; langkah_pertama = hari ke-1 pukul 07.00 UTC sesudah t1
tk = langkah_pertama + 24 * k, k = 0.. sampai >= max T
dijangkau_k = { s di jejak : T(s) <= tk }
luas_k   = |dijangkau_k| * HA_SEL
baru_k   = |dijangkau_k tanpa dijangkau_(k-1)| * HA_SEL
isokron_k = batas poligon dijangkau_k (sel gabungan, ditutup, tepi diperhalus, disederhanakan <= 0,0004 derajat)
```
Langkah k tanpa sel dijangkau dilewati. Isokron dibatasi 30 langkah terbaru per insiden.
`luas_k` adalah luas sel yang dilalui garis depan, **batas atas luas terbakar**, bukan luas terbakar (R11).

### A6. Laju

Untuk langkah k ≥ 1 dengan `dijangkau_(k-1)` tak kosong dan `baru_k` tak kosong:

```
d(s) = jarak Euklid sel s ke sel terdekat di dijangkau_(k-1), km (BFS multi-sumber di kisi 8-tetangga dengan bobot 1 dan akar 2, dikali KM_SEL; galat jarak ≤ 8% dibanding Euklid, di bawah resolusi satu sel)
sebar_k = { s di baru_k : d(s) <= LOMPAT_MIN_KM }          // sel > 2 km adalah lompatan, bukan laju
bila sebar_k kosong: laju tidak diisi
median_k = median d di sebar_k;  p90_k = persentil 90 d di sebar_k
resolved_k = (p90_k >= KM_SEL)
laju_km_per_hari_k = p90_k         bila resolved_k, selain itu null
```
`resolved:false` ditulis di berkas dan tampil "belum terukur" di layar, tidak pernah 0. Langkah per 24 jam, jadi p90 jarak sama dengan km per hari.
Persentil 90: interpolasi linier (sama dengan `numpy.quantile` bawaan) supaya uji bisa dibandingkan dengan pembanding.

### A7. Lompatan

```
untuk tiap hari (kunci t_tiba // 24, hari UTC, lihat catatan) berurutan:
  sudah = petak yang t_tiba-nya pada hari-hari sebelumnya
  untuk petak p hari ini: d(p) = jarak km ke sel terdekat di sudah     (butuh sudah tak kosong)
  pilih p dengan d(p) di [2, 10] dan d terbesar
  catat {t: t_tiba(p), lat, lon, jarak_km: d(p), dari: sel terdekat di sudah, arah_deg: bearing(dari -> p)}
```
Catatan: pembanding mengelompokkan per `t_arr // 24` (hari UTC). Kita mempertahankannya di versi 1 supaya hasil uji sebanding; pindah ke hari WIB menunggu uji (ponytail: hari UTC bergeser 7 jam dari WIB, tidak mengubah daftar lompatan secara berarti karena lompatan dicatat per petak).
Arah `bearing(dx, dy)` = `(atan2(dx, dy) dalam derajat + 360) mod 360`, `dx = dlon * 111,32 * cos(lat tujuan)`, `dy = dlat * 110,57`. Ditulis "arah dari asal ke tujuan (geometri)", tidak pernah "arah angin".
Jarak > 10 km tidak dicatat sebagai lompatan (kemungkinan api terpisah); di kita hampir selalu insiden terpisah (RISET §4, Q4).

### A8. Perkiraan titik awal

```
t0 = min t_tiba
awal = petak dengan t_tiba <= t0 + 1
w(p) = FRP(p) atau 0, ditambah 1
lon_awal = sum(w * lon pusat petak) / sum(w);   lat_awal analog
galat_jam = max galat(p) di awal
t_awal = t0;  t_paling_awal = t0 - galat_jam;  t_paling_akhir = min t_pertama(awal)
mulai_lebih_awal = (|awal| >= 5)
radius_m = max(375, jarak terjauh pusat petak awal ke (lon_awal, lat_awal) * 1000)
```

### A9. Pembangunan ulang dan kunci

Berkas `public/data/progresi/<id>.json` dibangun ulang bila jumlah petak atau deteksi terakhir berubah, atau umurnya > 12 jam (pembanding `RECOMPUTE_H`). Insiden tanpa deteksi baru mempertahankan berkasnya. Versi metode `versi` dinaikkan bila rumus berubah.

### A10. Uji tahan (kriteria dikunci sebelum dihitung, Q2)

Per insiden uji: 20% petak terdeteksi dipilih acak (benih tetap `20261124`), disembunyikan, `T` dihitung dari 80% sisanya dengan A3, A4; dibandingkan dengan `t_tiba` sebenarnya petak yang ditahan.

```
MAE = rata |T_pred - t_tiba| ;  dalam12 = pecahan |selisih| <= 12 ;  dalam24 = pecahan |selisih| <= 24
pembanding = tetangga terdekat (1)
lulus = gabungan 10 insiden: dalam24 >= 0,60  dan  MAE <= MAE(tetangga terdekat)   [SEMENTARA, Q2]
```
Insiden uji: 10 insiden terbesar 2019 dan 2023 yang punya ≥ 200 petak unik (campuran 5 dan 5), dipilih menurut ukuran sebelum hasil dilihat. Komposisi sensor uji dicatat (S-NPP dan NOAA-20 untuk 2019, 2023; produksi sesudah 1 Nov 2026 NOAA-20 dan NOAA-21).

## B. Bangunan dalam 500 m dari petak api

### B1. Petak

Petak insiden = petak unik dari A1 (semua waktu sejak awal arsip) dengan pusat `((iy + 0,5) * SEL_DEG, (ix + 0,5) * SEL_DEG)`. `petak_segar` = petak dengan `t_pertama` atau deteksi terakhirnya dalam `SEGAR_JAM` dari waktu hitung (deteksi terakhir diambil dari arsip).

### B2. Sel halus dalam radius

Sel halus 110 m dari `halus_<prov>.json` (`cells: [[i, j, n, luas_m2]]`, header `lat0 = -12,0`, `lon0 = 94,0`, `step = 0,001`; pusat sel `(lat0 + (i + 0,5) * step, lon0 + (j + 0,5) * step)`), dibaca lewat `bangunan.bangunan_di(prov, titik=...)` dengan titik = pusat sel yang lolos jarak:

```
S(petak) = { sel halus s : jarak_km(pusat s, pusat petak) <= 0,500 }       // ekuirektangular lokal; galat sel +- GALAT_HALUS_KM
kumulatif = gabungan S(p) untuk semua petak          // gabungan, bukan jumlah: tiap sel sekali (D11)
kini      = gabungan S(p) untuk petak_segar
bangunan  = jumlah n pada gabungan;  luas_atap_m2 = jumlah luas pada gabungan
```
Pencarian: untuk tiap petak hanya sel halus dalam kotak ±0,0046 derajat (±500 m) dilihat (±9 × 9 sel halus), indeks dict. Biaya ≈ jumlah petak × 81, aman di stdlib.

### B3. Keterliputan

```
terliput = kode provinsi insiden ada di cakupan_provinsi (berkas halus_<prov>.json ada)
```
Bila `terliput = false`: `bangunan`, `kini`, `kumulatif`, `luas_atap_m2` semuanya `null` dan `alasan = "grid bangunan provinsi ini belum dibuat"`. Bila petak insiden berjarak ≤ 500 m dari batas provinsi bergrid lain, sel di provinsi tak bergrid tidak terhitung; ditulis `catatan_tepi:true` bila insiden dekat batas provinsi tak bergrid (cek sederhana: ada sel halus tetangga dari provinsi lain di kotak). [SEMENTARA, bisa disederhanakan menjadi keterbatasan tertulis]

### B4. Angka publik

```
tampil(n) = "kurang dari 5"         bila n < 5
          = "sekitar " + round_ke_5(n)   bila n >= 5            [SEMENTARA, Q6]
luas_tampil = round(luas_atap_m2, -2)
```
Berkas publik `insiden_bangunan.json` memuat `bangunan` sebagai bilangan yang sudah dibulatkan (bukan nilai mentah), dan `tampil` teks. Nilai mentah hanya di rincian terkunci.

### B5. Jangan campur

Angka B tidak dijumlah dengan `paparan_bangunan.karhutla` (1/3/5 km dari poligon kompleks, sel kasar 1,1 km) dan tidak dengan bangunan OSM. Label kartu: "dalam 500 m dari petak api".

## C. Status dan gabungan

- Insiden `gabung`: arsip pemenang dibangun ulang tiap putaran dari `titik_hari` terhadap geometri pemenang (yang sudah memuat kompleks gabungan), jadi tidak ada langkah "memindahkan arsip"; arsip `<id lama>.json` dan berkas `progresi/<id lama>.json` dihapus, dan `indeks.json` mencatat `gabung_ke`. Pemangkasan arsip insiden `gabung` dan `tak_terdeteksi` lewat `SIMPAN_HARI` belum ada di kode (IK-01).
- Insiden `tak_terdeteksi`: isokron dan angka terakhir dipertahankan sampai `SIMPAN_HARI`; tidak ada langkah baru ditambahkan; tidak ada kata padam.
- Insiden dibuka kembali (`BUKA_HARI`, `BUKA_GAMBUT_HARI`) melanjutkan arsip yang sama; langkah hari-hari tak terlihat tidak mengisi isokron.
