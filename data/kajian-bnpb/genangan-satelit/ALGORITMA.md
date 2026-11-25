# ALGORITMA: Genangan satelit per kejadian

Semua ambang yang ditandai HIPOTESIS dikunci di berkas kriteria (GS-02) sebelum kejadian uji dihitung. Rumus di bawah mengikuti kode yang ada; bila kode dan dokumen berbeda, dokumen dibetulkan lewat tiket, tidak diabaikan diam-diam.

## 1. Pasangan GFM per kab (memakai `genangan_nasional.hitung_pasangan`)

```
kandidat = lintasan GFM yang memotong ubin kab, waktu dalam [mulai, mulai + 12 hari], urut fraksi ubin, paling banyak MAKS_KANDIDAT (4)
lintasan = kandidat dengan (cakupan_pct, diamati_ha) terbesar
pra      = pilih_pra(lintasan): ubin sama, jam lintas +- 90 menit, 8 sampai 45 hari sebelum lintasan,
           DAN waktu pra < mulai                          (syarat tambahan mode kejadian; lihat catatan)
titik sampel: langkah = maks(LANGKAH_MIN 0,0006 derajat, akar(luas / MAKS_TITIK 600.000)); di kab besar langkah melebar
per titik (bobot luas sel titik):
  diamati_ha  = flood != 255                              (TERMASUK yang ter-mask; nama kolom kode)
  mask_ha     = exclusion == 1
  teramati_ha = diamati_ha - mask_ha                      (bacaan sah)
  tergenang   = flood == 1 dan bukan mask dan bukan air tetap
  baru        = tergenang pasca dan kering teramati pada pra
  latar       = tergenang pada pra di domain yang sama
cakupan_pct  = teramati_ha / luas_kab_ha x 100           (fungsi cakupan(): (diamati - mask) / luas)
sinyal_lemah = True bila nilai <= 0; selain itu baru_ha < 2 x latar_ha; None bila tanpa pra dan nilai > 0   (fungsi lemah())
```

Catatan syarat `pra < mulai`: `pilih_pra` bawaan hanya menuntut 8 sampai 45 hari sebelum lintasan. Lintasan bisa jatuh sampai mulai + 12, jadi tanpa syarat ini pra bisa jatuh sesudah `mulai` dan sudah berisi air banjir, sehingga tergenang baru mengecil palsu. Syarat ini menjadi opsi `--pra-sebelum-acuan` (pra harus jatuh sebelum tanggal acuan: `mulai` untuk mode kejadian, tanggal DIBI untuk mode riwayat). Mode kejadian selalu memakainya; uji balik (bagian 7) menjalankan mode riwayat dengan opsi yang sama supaya yang diuji sama dengan yang jalan di produksi. Tanpa opsi, mode `luas` dan `terbit` lama tidak berubah.

Status per kab: `ok`, `tanpa_lintasan` (tak ada kandidat), `tanpa_cakupan` (diamati 0), `tanpa_pra` (ada lintasan, tak ada pra sah sebelum `mulai`). Tiga status terakhir tidak pernah bernilai 0 di layar.

Lintasan baru sesudah hitungan pertama membuat versi kaji baru (ALUR 1 butir 9); versi tidak dirata-rata.

## 2. Cakupan sah (Q4, HIPOTESIS)

```
sah = status ok dan cakupan_pct >= 10 dan sinyal_lemah == false
```

Tidak sah: angka disimpan di R2 untuk audit, tidak tampil; teks sesuai status, "tidak teramati cukup (cakupan <c> persen)", atau "sinyal lemah".

## 3. Persen luas

```
persen_teramati = baru_ha / teramati_ha x 100      (yang tampil)
persen_kab      = baru_ha / luas_kab_ha x 100      (keterangan saja, selalu dengan cakupan di sampingnya)
```

## 4. Penduduk di area genangan (mesin paparan F2 apa adanya)

Mesin `paparan.hitung_kab` tidak diubah. Ia menerima zona berupa fungsi `fn(lon, lat)` yang dinilai pada pusat sel halus bangunan (sekitar 110 m), lalu menghitung per sumber:

```
worldpop = jumlah_kec WorldPop_kec x (bangunan di zona dalam kec / bangunan kec)
dukcapil = jumlah_desa jiwa_desa x (bangunan di zona milik desa / bangunan desa)
ghsl     = angka per kunci zona bila disediakan; zona sel tidak punya padanan GHSL: "tidak tersedia" + alasan, bukan 0
```

Yang baru hanya pembuat zona `zona_dari_sel` di `paparan.py`: dua zona dari titik baru.

```
ha_baru(sel)  = jumlah bobot titik baru yang jatuh di sel halus itu
ha_sel        = luas sel halus
zona atas   (kunci banjir:gfm_atas)  : sel dengan ha_baru(sel) > 0
zona bawah  (kunci banjir:gfm_bawah) : sel dengan ha_baru(sel) / ha_sel >= 0,5   (HIPOTESIS, boleh disetel di kalibrasi)
```

Butiran: pada langkah 0,0006 derajat satu titik bernilai sekitar 0,36 ha_sel, jadi rasio naik bertangga 0,36 dan bisa sedikit di atas 1 karena bobot titik dan tepi sel tidak sejajar. Ambang 0,5 berarti efektif paling sedikit dua titik baru dalam satu sel. Rasio tidak dipotong di 1 karena hanya dibandingkan dengan ambang.

Rentang per sumber s per kab = `[s pada zona bawah, s pada zona atas]`. Sumber tidak dicampur: tiap sumber punya rentangnya sendiri, berdampingan. `sk_kaji.ringkas.rentang` memakai WorldPop (sumber yang selalu ada) dengan `sumber_rentang: "worldpop"`; Dukcapil tampil di kartu di sampingnya.

Penjumlahan antarkab hanya untuk sumber yang sama dan hanya kab sah; kuncinya `jiwa_kab_sah` (bukan `total`, kunci itu ditolak `saji.TERLARANG`), dengan jumlah kab yang dikeluarkan di sampingnya.

Batas jujur: di kab besar langkah titik melebar melewati ukuran sel, sehingga sebagian sel tergenang tidak berisi titik dan zona atas bukan batas atas sejati. Bila `langkah > 0,001` derajat, kab ditandai `kisi_kasar` dan kartunya menulis "batas atas dari sampel, bisa lebih besar".

Kasus uji (dengan `hitung_kab` asli). Satu kec, WorldPop 1.000, tiga sel: A 10 bangunan ha_baru/ha_sel 0,6; B 30 bangunan 0,2; C 60 bangunan 0. Zona bawah = {A}: 1.000 x 10/100 = 100. Zona atas = {A, B}: 1.000 x 40/100 = 400. Rentang WorldPop [100, 400].

## 5. Lahan WorldCover

Untuk tiap titik baru, kelas = piksel WorldCover 10 m di bawah titik (tanpa interpolasi). Ha per kelas = jumlah bobot titik. Kelas: 10 pohon, 20 semak, 30 rumput, 40 pertanian, 50 terbangun, 60 lahan terbuka, 70 salju, 80 badan air, 90 lahan basah, 95 mangrove, 100 lumut. Nama tampil "Pertanian (termasuk sawah)", bukan "sawah": WorldCover tidak memisahkan sawah. Kelas yang tidak ada tidak keluar.

Catatan wajib di kartu: kelas 50 kecil bukan bukti permukiman tidak tergenang, karena GFM ter-mask di kota padat.

Kasus uji. Lima titik bobot 0,3 ha dengan kelas 40, 40, 40, 10, 80: pertanian 0,9 ha, pohon 0,3 ha, badan air 0,3 ha.

## 6. Citra

- Radar: VV RTC dB, pra dan pasca pada orbit relatif sama dengan lintasan GFM bila ada; rentang tampil -25 sampai 0 dB abu-abu.
- Optik warna asli: B4, B3, B2. Semu SWIR: B12, B8A, B4 (air gelap, lumpur dan tanah basah kontras).
- Kotak: bbox kab dipotong ke area dengan titik baru terbanyak, sisi paling besar 40 km; satu PNG <= 120 KB per citra.
- Adegan optik dipilih awan terendah di kotak; awan > 60 persen: "tertutup awan".

## 7. Uji balik (GS-13, Q5)

Satuan: pasangan kab-hari DIBI banjir atau banjir bandang dengan terdampak > 0, lintasan GFM 0 sampai 6 hari sesudah tanggal DIBI (jendela mode riwayat yang sudah ada), pra sebelum tanggal DIBI, cakupan sah. Catatan jujur: dengan jendela 6 hari dan pra minimal 8 hari sebelum lintasan, pra selalu jatuh paling lambat 2 hari sebelum tanggal DIBI, sehingga opsi `--pra-sebelum-acuan` tidak mengubah hasil riwayat; pra yang sudah tergenang sebelum tanggal lapor DIBI tetap mungkin (Q11) dan ditulis sebagai keterbatasan di laporan vonis.

```
x_i       = WorldPop tengah = (bawah + atas) / 2
y_i       = DIBI terdampak kab-hari itu
rho       = Spearman(x, y)
naif_1    = luas kab;  naif_2 = penduduk WorldPop seluruh kab;  naif_3 = luas tergenang baru (ha)
selisih_k = rho - rho(naif_k), CI 90 persen bootstrap blok berpasangan (blok = provinsi x minggu ISO tanggal DIBI; blok yang sama untuk model dan naif, 2.000 kali)
```

Lulus (HIPOTESIS, dikunci GS-02): blok uji sah >= 20, rho >= 0,4, dan batas bawah CI selisih terhadap ketiga naif > 0. Blok sah < 20 atau sah/dipilih < 0,30: "tak dapat dinilai", pil hipotesis tetap.

Sampel uji (dikunci GS-02, `scripts/siklus/genangan_kriteria.json` `sampel_uji`): 300 pasangan pertama populasi uji menurut sha256 "prov|kab|tanggal" naik (N HIPOTESIS sampai GS-03 mengukur anggaran). GS-13 membaca persis daftar itu: tanpa menambah, mengganti, atau berhenti lebih awal; gagal baca tetap di penyebut; laporan memuat dipilih, sah, tak sah, gagal baca. (Naif `banjir_jam1` tidak dipakai: status Siaga/Awas harian tidak ada untuk kejadian arsip.)

Pemisahan dan larangan bocor:
- GS-02 menghitung jumlah pasangan layak dari metadata katalog dan DIBI saja (tanpa membaca raster) lalu membagi kalibrasi dan uji menurut waktu: kejadian sebelum 2024 kalibrasi, 2024 dan sesudahnya uji. Riwayat saat ini hanya 21 pasangan dengan 10 sah; bila pasangan layak uji kurang dari 20, GS-02 menulis "tak dapat dinilai" sebagai hasil yang diharapkan dan pemilik diberi tahu sebelum ada hitungan.
- Pasangan yang sudah pernah terlihat dipindah ke kalibrasi per episode, bukan per kab-hari: pasangan yang rentang [tanggal DIBI, +6 hari]-nya berjarak <= 30 hari dari episode terlihat di provinsi yang sama. Episode: Sumatera prov 11-13 2025-11-01 s.d. 2026-02-28 (dihitung di GS-03), Aceh prov 11 2026-09-01 s.d. 2026-10-31, Demak prov 33 2024-01-25 s.d. 2024-04-15, kerusakan-satelit 205, 209, 212, 218 (prov 33 2025-12-15 s.d. 2026-02-05 dan jendela tiap pasangan +- 14 hari).
- Ambang cakupan (Q4, 10 persen) dan ambang zona bawah (0,5) dibekukan pada nilai bawaan saat GS-02 mengunci kriteria, sebelum kalibrasi dijalankan; tidak disetel lagi.
- Batas klaim: hanya di antara kab yang DIBI catat banjir (y > 0 karena definisi satuan); vonis lulus berarti "peringkat kab menurut penduduk di area genangan sejalan dengan DIBI", bukan angka mutlak dan bukan kemampuan membedakan banjir dari tidak banjir.

## 8. Yang tidak dihitung

Bangunan terendam (D6), kedalaman (Q6), kerugian rupiah, korban jiwa.
