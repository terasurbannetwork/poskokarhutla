# ALUR: Alat gambar wilayah

## 1. Alur pengguna

1. Pengguna menekan "Gambar wilayah" di kontrol peta: mode gambar menyala, peta tetap bisa digeser.
2. Memilih bentuk: poligon, kotak, atau buffer (lalu menggeser jari-jari 1 sampai 50 km).
3. Menggambar. Selama menggambar hanya garis bantu yang dicat; belum ada hitungan.
4. Menutup gambar (klik titik pertama, dua kali klik, atau lepas seretan): kartu hasil muncul dengan "Menghitung…", lalu angka terisi.
5. Mengubah periode (24 jam, 3 hari, 7 hari) atau jari-jari menghitung ulang tanpa menggambar lagi.
6. "Hapus" mengosongkan gambar dan mengembalikan penangan klik peta.

## 2. Alur data (peramban)

```
index.html memuat hotspot*.json (sudah ada)
gambar ditutup ─▶ kotak batas gambar
   ├─ titik: saring kotak batas, lalu titik-dalam-poligon (Worker bila perlu)
   │     ├─ lokasi unik per hari WIB, jumlah FRP, maksimum FRP
   │     ├─ siang lawan malam dari jam WIB
   │     └─ petak 375 m berdeteksi, jejak sel
   ├─ insiden: pusat insiden dalam gambar ─▶ luas dNBR bila ada (tidak dihitung ulang)
   └─ wilayah: kab yang kotaknya beririsan (≤ 12) ─▶ geo/desa/<kab>.json ─▶ desa beririsan + nama (desa_cari)
                                  geo/kecamatan/<prov>.json ─▶ kecamatan beririsan ─▶ penduduk.json kec
kartu hasil .ex.ex-std
```

## 3. Keadaan

| Keadaan | Perilaku |
| ------- | -------- |
| 0 titik | "0 titik dalam data periode ini" dengan keterangan jeda dan awan; bukan "aman" |
| Data titik belum termuat | kartu "menunggu data titik", bukan 0 |
| Gambar di laut atau luar Indonesia | titik dihitung; desa dan penduduk "tak terukur" |
| Lebih dari 12 kab | tanpa daftar desa, dengan pesan; titik tetap dihitung |
| Poligon > 200 simpul atau garis menyilang diri | ditolak dengan pesan |
| Tanpa JavaScript | tombol tidak ada; peta lama tetap jalan |
