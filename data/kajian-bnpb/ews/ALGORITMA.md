# ALGORITMA: Panel EWS

## G1. Tingkat pos

```
tingkat(pos):
  bila basi(pos)                     -> "tanpa_data"        (abu, label "Tidak ada data terkini")
  bila pos.sumber == "pvmbg"         -> level resmi PVMBG (Normal, Waspada, Siaga, Awas)
  bila pos.sumber == "sihka" dan status_resmi ada -> Siaga 3/2/1 dari pengelola (aturan pos_air.js sekarang)
  bila pos.ambang kosong             -> null               (nilai tampil tanpa warna tingkat)
  selain itu                         -> tingkatAmbang(ambang, nilai)  (fungsi yang sama di src/sensor.js)
```

`tingkatAmbang` dipakai ulang, tidak ditulis ulang: nilai `>=` ambang terlewati, nilai `null` tidak dinilai, tingkat tertinggi menang.

## G2. Basi

`basi(pos) = pos.waktu == null atau (kini - pos.waktu) > BATAS[pos.jenis]`

Bawaan BATAS (KEPUTUSAN Q4): tma 30 menit, hujan 30 menit, geofon 10 menit, SIHKA mengikuti aturan "lama" di `pos_air.js`. Basi tidak mengubah nilai: nilai terakhir tetap disimpan dan ditampilkan dengan umurnya.

## G3. Ringkasan kepala panel

```
jumlah_pos      = banyaknya pos
di_atas_ambang  = banyaknya pos dengan tingkat Waspada ke atas dan tidak basi
terputus        = banyaknya pos basi
kamera          = banyaknya aliran CCTV berizin
```

Angka 0 hanya ditulis bila memang dihitung dari daftar yang ada. Sumber gagal dimuat ditulis "sumber X gagal dimuat", bukan 0 pos.

## G4. Grafik seri waktu

- Sensor sendiri: `sensor_baca` per alat 24 jam, paling banyak 288 titik untuk tma dan hujan (tiap 5 menit).
- Geofon: ringkasan per menit (maks dan rata-rata), paling banyak 1.440 titik (Q6). Data mentah tidak dikirim ke peramban.
- Celah lebih dari 2x interval kirim digambar sebagai putus garis, bukan garis lurus yang menyambung.

## G5. Urutan kartu

Tingkat tertinggi di depan, lalu pos basi, lalu sisanya menurut nama. Urutan tidak berubah saat data diperbarui, kecuali tingkat berubah, supaya kartu tidak melompat di bawah jari petugas.
