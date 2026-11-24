# ALUR: Genangan satelit per kejadian

## 1. Pipeline (siklus.yml, Q9)

1. Ambil daftar kejadian banjir yang memenuhi Q2 dari Buku Besar (`sk_kejadian`, jenis banjir, fase `tanggap`, atau ditandai staf).
2. Per kejadian, per kab anggota: cari lintasan GFM di katalog (`genangan_nasional.katalog`, metadata saja) dalam 0 sampai 12 hari sesudah `mulai`.
   - Tidak ada lintasan: `tanpa_lintasan` beserta jam cek terakhir. Kartu: "belum ada lintasan radar sejak <mulai>". Bukan 0.
3. Lintasan ada: `hitung_pasangan` memilih lintasan bercakupan terbesar dari paling banyak 4 kandidat, lalu pra sebelum `mulai`; per kecamatan luas, mask, cakupan, sinyal lemah.
   - Diamati 0: `tanpa_cakupan`, kartu "lintasan ada, kab tidak teramati".
   - Tidak ada pra sebelum `mulai`: `tanpa_pra`, kartu "tidak ada citra pembanding sebelum kejadian"; angka tidak tampil.
   - Cakupan di bawah ambang Q4 atau sinyal lemah: angka luas disimpan untuk audit, kartu menulis "tidak teramati cukup" dan angkanya tidak tampil.
4. Titik tergenang baru dikumpulkan ke sel halus bangunan (sekitar 110 m, kisi F2) menjadi zona bawah dan zona atas (ALGORITMA 4).
5. Mesin paparan F2 apa adanya dengan dua zona itu: rentang jiwa per kab per sumber (WorldPop, Dukcapil), berdampingan.
6. WorldCover pada titik tergenang baru: ha per kelas per kab.
7. Citra: radar VV pra dan pasca pada orbit yang sama; Sentinel-2 warna asli dan semu SWIR, adegan terbersih sebelum (Jul sampai Sep tahun yang sama atau tahun sebelumnya) dan sesudah (0 sampai 15 hari). PNG ke R2.
8. Susun keluaran: ringkasan ke `sk_kaji` (model `banjir_gfm`, status `dihitung`), rincian ke R2 `siklus/saji/kaji/<kj>_banjir_gfm_v<n>.json`, sel dan PNG ke `siklus/saji/kaji_berkas/<kj>/banjir_gfm/v<n>/`.
9. Lintasan baru untuk kejadian yang sudah dihitung: versi baru (`versi` + 1). Versi lama tetap; layar menampilkan versi terakhir dan tanggal lintasannya.

## 2. Status kaji

```
menunggu_data  (belum ada lintasan)  ->  dihitung  ->  diperiksa (PD, KO)  ->  dipakai (PD, KO)
                                                    \->  ditarik (wajib alasan)
```

Status mengikuti `sk_kaji` yang ada; tidak ada status baru.

## 3. Layar `/siklus/kaji/:id`

1. Kepala: kejadian, fase, label `estimasi-model`.
2. Kartu jam pertama (`banjir_jam1`) tetap di tempatnya.
3. Kartu Genangan radar (`banjir_gfm`): tanggal lintasan per kab, ringkasan luas, rentang penduduk, pil hipotesis selama vonis belum lulus.
4. Tabel per kab: luas tergenang baru, cakupan, persen dari teramati, penduduk (rentang); baris tak teramati tertulis alasannya.
5. Lahan: bilah tumpuk per kelas dan tabel ha.
6. Citra: pemilih kab, segmen Radar, Warna asli, Semu SWIR; penggeser sebelum dan sesudah.
7. Metode: empat butir (data, deteksi, dampak, catatan) dalam bahasa polos, termasuk vonis uji balik.
8. Peta kanan: lapis Genangan radar (sel), batas kab; dimuat sesudah kartu atas tercat.
9. Bandingkan dengan petugas (meja `kaji_cepat`) dan DIBI: berdampingan, baris selisih.

## 4. Gagal

- GFM atau STAC tidak menjawab: versi lama tetap; status `menunggu_data` hanya bila belum pernah dihitung.
- WorldCover gagal dibaca untuk satu kab: lahan kab itu "belum terbaca", luas dan penduduk tetap tampil.
- Citra gagal: kartu citra "belum ada citra yang memenuhi syarat", sisanya tetap.
- Satu kartu gagal tidak mengosongkan halaman (aturan Siklus).
