# Abrasi garis pantai

Pengerja: `pesisir` (baru, 21 Okt 2026). Status registry: **lapisan** `abrasi` di entri `banjir`, belum entri bencana
sendiri (alasan di [`MODUL-PLUG-AND-PLAY.md`](../MODUL-PLUG-AND-PLAY.md) §7). Abrasi adalah satu-satunya dari 8 bencana
BNPB yang belum punya modul.

## Ringkas

| Kunci | Nilai |
| --- | --- |
| Skrip | `scripts/pesisir/abrasi.py` (`uji` swa-uji tanpa jaringan, `ringkas` hitung ulang laju dari deret tersimpan tanpa citra, `validasi` tabel literatur) |
| Keluaran | `public/pesisir/data/abrasi.json` |
| Data | Landsat 4, 5, 7, 8, 9 Collection 2 Level-2 (USGS) via Microsoft Planetary Computer, token anonim; garis dasar OSM `natural=coastline` (sekali); nama desa Nominatim (sekali) |
| Rujukan metode | DEA Coastlines, Bishop-Taylor dkk. 2021, Remote Sensing of Environment 267:112734 |
| Cakupan awal | 5 situs pantura: Sayung (Demak, plus Terboyo dan Trimulyo, Kota Semarang), pesisir Pekalongan, Karangsong dan delta Cimanuk (Indramayu), Blanakan dan Legonkulon (Subang), Muara Gembong (Bekasi); 167 transek, 1988 sampai tahun lalu |

## Metode

1. Transek tiap 1 km tegak lurus garis pantai OSM, 3 km ke darat dan 4 km ke laut, sampel tiap 15 m. Transek disimpan di
   keluaran dan dipakai ulang tiap tahun, jadi ID dan letaknya tetap.
2. Tiap adegan (12 adegan berawan STAC terendah per tahun): QA_PIXEL membuang isian, awan, awan dilatasi, sirus,
   bayangan; adegan dengan < 30% sampel bersih dibuang. MNDWI = (hijau - SWIR1) / (hijau + SWIR1) dari reflektans
   permukaan, bilinear di tiap sampel.
3. Komposit tahunan: median MNDWI tiap sampel (minimal 2 pengamatan).
4. Ambang: Otsu atas semua sampel situs-tahun, dijepit -0,25 sampai 0,5 (jepitan belum pernah aktif: 0,19 sampai 0,48).
5. Garis pantai: penyeberangan air->darat pertama dari ujung laut, subpiksel, darat harus bersambung >= 60 m; ujung laut
   harus air; garis yang < 150 m dari ujung darat dibuang (di luar jangkauan).
6. Laju: regresi linear jarak terhadap tahun, pencilan > 3 MAD dibuang sekali, selang 95% t dilebarkan untuk autokorelasi
   AR(1). Juga laju 10 tahun terakhir. Keyakinan tinggi = >= 15 tahun, selang tidak memuat nol, R2 >= 0,5; sedang = >= 8
   tahun dan selang tidak memuat nol; turun satu bila membuang pencilan membalik arah atau baru membuat nyata; rendah =
   "tidak nyata". Transek `GANGGUAN` (tanggul, reklamasi) dipotong di tahun bangunan; lompatan > 300 m di dua tahun
   terakhir ditandai `tinjau`.

### Keputusan yang menyimpang dari DEA, dan kenapa

- **Ambang bukan 0.** DEA memakai MNDWI 0. Di pantura, tambak (MNDWI 0 sampai 0,5) terbaca air pada ambang 0, jadi
  "garis pantai" lari ke belakang sabuk tambak. Uji luring di Sayung (cache yang sama, transek 2 km, lima aturan ambang):
  ambang 0 berbeda lebih dari 15 m/th dari Otsu di 13 dari 21 transek terbaca, 3 di antaranya berbalik tanda; Otsu
  bebas (~0,34) dan "median laut - 0,35" berbeda kurang dari 3 m/th di 16 dari 21. Otsu dipakai, dijepit supaya tahun
  berawan tidak liar.
- **Belum ada koreksi pasang surut.** DEA memodelkan pasut (FES2014) dan memilih piksel di sekitar muka laut rata-rata.
  Itu belum bisa dengan pustaka standar. Tunggang pasut pantura sekitar 1 m (Semarang M2 0,4 m, S2 0,3 m) dan pantainya
  landai berlumpur, jadi posisi satu tahun bisa bergeser puluhan sampai ratusan meter. Median banyak adegan meredam; laju
  dari 30+ tahun jauh lebih kokoh daripada posisi satu tahun.
- **Transek, bukan kontur 2D.** Lebih murah (hanya piksel di sepanjang transek yang dibaca) dan langsung memberi jarak.

## Validasi

Jalan 21 Okt 2026, 1988-2025, 167 transek, 161 terbaca. Tabel di bawah keluaran `python3 scripts/pesisir/abrasi.py validasi`
(laju per transek dihitung ulang di jendela tahun rujukan, dengan aturan selang dan keyakinan yang sama seperti keluaran).
Angka rujukan dikumpulkan dari jurnal; metodenya beda (DSAS EPR dari dua citra, luas ha, Sentinel-2), jadi yang bisa
dibandingkan jujur adalah **arah, orde, dan pola waktu**, bukan angka persis. Kolom rerata mundur/maju memakai semua
transek bertanda itu, termasuk yang tidak nyata. Nama desa dari Nominatim 300 m ke darat dari garis dasar; di pantai
yang tenggelam batas desa kabur.

| Situs | Desa | Periode | Rujukan | Angka rujukan | Pantau Bencana: transek terbaca, mundur/maju nyata, median laju, rerata transek mundur, rerata transek maju, mundur terparah (m/th) |
| --- | --- | --- | --- | --- | --- |
| sayung | Bedono | 2013-2020 | Ramadhani dkk. 2021, J. Marine Research 10(2), doi:10.14710/jmr.v10i2.30468 | Landsat 8 DSAS: rata-rata transek mundur -19,9 m/th | 5/7, 2/0, -5,8, -7,4, -, -20,2 |
| sayung | Timbulsloko | 2013-2020 | Ramadhani dkk. 2021 | rata-rata transek mundur -15,4 m/th | 2/2, 1/0, -0,4, -5,8, +4,9, -5,8 |
| sayung | Surodadi | 2013-2020 | Ramadhani dkk. 2021 | rata-rata transek mundur -7,3 m/th, ada akresi +6,1 | 6/6, 1/0, -4,4, -20,9, +56,2, -61,0 |
| sayung | Bedono | 1988-1999 | Munawaroh & Setyaningsih 2021, Geo Image 10(2) | Landsat NDWI: abrasi 331 ha 1990-1999, puncak | 5/7, 3/0, -15,6, -81,1, -, -193,8 |
| sayung | Bedono | 2011-2019 | Munawaroh & Setyaningsih 2021 | abrasi melambat: 37 ha 2011-2015, 49 ha 2015-2019 | 5/7, 0/0, -3,4, -4,9, -, -12,1 |
| bekasi | semua | 2011-2021 | Meizwar & Tarya 2024, J. Tropical Marine Science 7(2), doi:10.33019/jour.trop.mar.sci.v7i2.5063 | Landsat DSAS: bersih +0,2 m/th; transek mundur -7,7, transek maju +12,2 | 39/41, 11/6, -0,5, -9,5, +12,7, -79,9 |
| subang | bujur 107,6-107,73 | 1995-2020 | Tarya & Aneky 2026, J. Ilmu Kelautan Kepulauan 9(1), doi:10.33387/jikk.v9i1.11451 | Landsat: Blanakan akresi, barat +40,2 m/th, timur +2,5 m/th | 16/16, 0/10, +15,1, -1,5, +23,1, -1,5 |
| subang | bujur 107,6-107,665 | 1995-2020 | Tarya & Aneky 2026 | Blanakan barat +40,2 m/th | 8/8, 0/6, +16,0, -, +18,9, +6,4 |
| subang | bujur 107,665-107,73 | 1995-2020 | Tarya & Aneky 2026 | Blanakan timur +2,5 m/th | 8/8, 0/4, +10,2, -1,5, +28,0, -1,5 |
| subang | bujur 107,75-107,86 | 1990-2018 | Kalther & Itaya 2020 (dari ringkasan, sumber primer belum dibaca) | Legonkulon: mundur terparah 2.361 m 1990-2018 (sekitar 84 m/th) | 23/27, 14/0, -12,4, -20,8, +24,1, -64,6 |
| indramayu | semua | 1989-2009 | Kusnanto dkk. 2022, JPSL 12(3), doi:10.29244/jpsl.12.3.543-554 | Landsat: abrasi 2.416 ha lawan akresi 668 ha (abrasi dominan) | 29/30, 3/6, +2,6, -37,9, +21,0, -211,8 |
| indramayu | semua | 2009-2019 | Kusnanto dkk. 2022 | abrasi 358 ha lawan akresi 698 ha (berbalik akresi dominan) | 30/30, 3/3, +0,9, -12,0, +29,5, -55,5 |
| pekalongan | semua | 2016-2022 | Endarsih dkk. 2025, J. Teknologi Lingkungan 26(1), doi:10.55981/jtl.2025.3960 | Sentinel-2 Kota Pekalongan: abrasi dominan 4,0 m/th | 24/24, 0/0, -4,3, -16,0, +1,8, -218,7 |

### Vonis per kasus

| Kasus | Vonis | Alasan |
| --- | --- | --- |
| Sayung (Bedono), pola waktu | **Cocok** | 1988-1999 rerata transek mundur -81 m/th (terparah -194); 2011-2019 hanya -3 sampai -5 m/th dan tidak satu pun nyata. Sama dengan Munawaroh: puncak abrasi 1990-1999, melambat sesudah 2011. Deret per transek: stabil, runtuh 2007-2012, lalu mundur pelan. |
| Sayung, besaran per desa 2013-2020 | **Tidak cocok / tidak bisa dipastikan** | Bedono -7,4 lawan -19,9 m/th, Timbulsloko -5,8 lawan -15,4 (orde sama, kami 2-3 kali lebih kecil); Surodadi terbalik (-20,9 lawan -7,3). Sampel kecil: 5, 2, dan 6 transek. Rujukan memakai EPR dua citra 7 tahun yang peka pasut hari itu. |
| Muara Gembong 2011-2021 | **Cocok orde** | Transek mundur -9,5 lawan -7,7; transek maju +12,7 lawan +12,2. Laju bersih sama-sama dekat nol tapi beda tanda (median -0,5 lawan +0,2). |
| Blanakan 1995-2020 | **Cocok arah, pola barat-timur tidak teruji** | 10 dari 16 transek maju nyata, tak satu pun mundur nyata. Belahan kira-kira di bujur 107,665: barat median +16,0, timur +10,2; rujukan barat +40,2 dan timur +2,5. Batas barat/timur rujukan tidak diketahui, jadi pola itu tidak bisa diuji. |
| Legonkulon 1990-2018 | Cocok arah | 14 transek mundur nyata, 0 maju nyata, terparah -64,6 m/th. Rujukan hanya dari ringkasan (terparah sekitar 84 m/th). |
| Pekalongan 2016-2022 | **Cocok orde, tidak nyata** | Median -4,3 lawan -4,0 m/th (Sentinel-2, Kota), tapi 7 tahun terlalu pendek: tidak satu pun transek nyata sesudah koreksi autokorelasi. Rerata ditarik satu transek liar (pekalongan-12). |
| Indramayu 1989-2009 | **Tidak cocok** | Rujukan se-kabupaten: abrasi dominan. Kotak kami (Karangsong sampai delta Cimanuk, yang memang tumbuh): median +2,6, 3 mundur nyata lawan 6 maju nyata. Cakupan berbeda; perlu kotak Eretan dan Balongan sebelum disimpulkan. |
| Indramayu 2009-2019 | Tidak bisa dipastikan | Rujukan: berbalik akresi dominan. Kami 3 lawan 3, median +0,9. |

Kesimpulan: arah cocok di Muara Gembong, Blanakan, Legonkulon, dan Pekalongan; Sayung cocok untuk pola waktu Bedono saja,
tidak untuk besaran per desa; Indramayu tidak cocok (cakupan beda). Layak tampil sebagai **Deteksi Pantau Bencana dengan
selang 95% dan keyakinan**, bukan angka resmi, dan tanpa angka per desa sebagai klaim.

### Pemeriksa bersih (`validasi-model`, 21 Okt) dan yang sudah dibetulkan

| Temuan | Tindakan |
| --- | --- |
| Residu tahunan berautokorelasi (lag-1 median 0,53); derau AR(1) 0,5 lolos "nyata" 26% | Selang dilebarkan `sqrt((1+r)/(1-r))`, derajat bebas dari n efektif (`ar1` di keluaran). Uji: derau AR(1) 0,7 lolos nyata <= 15%. Akibatnya transek yang runtuh mendadak (Bedono 05-06, AR1 0,8+) jatuh ke rendah: garis lurus memang model yang buruk untuk keruntuhan. |
| R2 dan "nyata" dihitung sesudah pencilan dibuang; 11 transek berbalik tanda | Keyakinan turun satu bila pembuangan membalik arah atau baru membuat nyata; `r2_penuh` dan `pencilan` ikut di keluaran. Keyakinan rendah ditulis "tidak nyata". |
| Tahun tanggul/reklamasi ikut regresi | Transek `GANGGUAN` memotong deret di tahun mulai bangunan (deret lengkap tetap di `jarak`). |
| Lompatan besar tahun terakhir tak ditandai | `tinjau`: lompatan > 300 m dari median 5 tahun sebelumnya di dua tahun terakhir; 16 transek bertanda, belum diperiksa tangan. |
| Ambang dipilih dengan melihat Sayung | Dicatat di `catatan`. Sensitivitas menurut pemeriksa: ambang 0 menggagalkan hampir semua vonis (Bekasi 5 mundur lawan 20 maju, Legonkulon 8 lawan 6); ambang tetap 0,3 mempertahankan arah dan kelas utama. Jepitan [-0,25; 0,5] tidak pernah aktif (ambang nyata 0,19 sampai 0,48). |
| Vonis terlalu optimistis ("5 dari 6") | Diganti tabel di atas. |

## Usulan jadwal (BELUM dipasang)

Tahunan cukup: komposit tahun lalu lengkap sesudah Landsat C2 L2 terbit (jeda beberapa minggu). Token repo tanpa scope
`workflow`, jadi pemilik yang memasang. Usulan: satu langkah di `.github/workflows/statis.yml` (sudah bulanan, tanggal 2,
02.00 WIB), hanya jalan di bulan Februari atau bila dipicu tangan, dengan cache adegan supaya tahun berikutnya hanya membaca adegan baru:

```yaml
      - name: Bulan abrasi?
        id: abrasi
        run: |
          if [ "$(date -u +%m)" = "02" ] || [ "${{ github.event_name }}" = "workflow_dispatch" ]; then echo "jalan=1" >> "$GITHUB_OUTPUT"; fi

      - name: Pulihkan cache adegan abrasi
        if: steps.abrasi.outputs.jalan == '1'
        uses: actions/cache/restore@v4
        with:
          path: data/raw/pesisir/adegan
          key: abrasi-${{ github.run_id }}
          restore-keys: abrasi-

      - name: Abrasi garis pantai tahunan (boleh gagal)
        if: steps.abrasi.outputs.jalan == '1'
        continue-on-error: true
        timeout-minutes: 300
        run: python3 scripts/pesisir/abrasi.py uji && python3 scripts/pesisir/abrasi.py

      - name: Simpan cache adegan abrasi
        if: always() && steps.abrasi.outputs.jalan == '1'
        uses: actions/cache/save@v4
        with:
          path: data/raw/pesisir/adegan
          key: abrasi-${{ github.run_id }}
```

Langkah ini ditaruh SEBELUM "Commit lapisan bulanan lintas bencana", dan `public/pesisir/data/abrasi.json` ditambahkan ke
daftar `B` di langkah commit itu. Waktu terukur di mesin lokal 21 Okt: tanpa cache 26 sampai 50 menit per situs (berurutan sekitar 3 jam untuk 5 situs, di
bawah batas 300 menit); dengan cache sebagian besar waktu habis untuk kueri STAC per tahun. Cache sekitar 40 MB.
Jalan pertama di CI tanpa cache bisa mendorong job `statis` (batas 360 menit) melewati batas bila Overpass lambat;
kalau itu terjadi, jadikan langkah ini job terpisah di workflow yang sama.

## Batas yang harus tampil di layar

Daftar `catatan` di `abrasi.json` wajib ikut tampil: belum koreksi pasut, Sayung = abrasi + penurunan tanah, tambak,
tanggul Tol Semarang-Demak, Patimban, Landsat 7 SLC-off, arti keyakinan, autokorelasi, ambang dipilih dari Sayung,
transek `tinjau`. Transek `gangguan` dan `tinjau` diberi pil tersendiri. Laju selalu bersama selang 95% dan pil keyakinan;
"tidak nyata" bila selang memuat nol. Label "Deteksi Pantau Bencana", bukan data resmi.

## Meluas

Tambah baris di `SITUS` (`id`, `nama`, `kab`, `prov`, `bbox`); transek diletakkan otomatis dari OSM dan desa dari
Nominatim pada jalan pertama. Kandidat berikut: Brebes, Tegal, Pemalang, Rembang, Tuban (pantura), lalu pesisir barat
Sumatera dan Bali selatan. Kotak di atas 25 km atau pantai berlekuk banyak (delta) menghasilkan transek yang menabrak
daratan lain; periksa transek tak terbaca sesudah jalan pertama.
