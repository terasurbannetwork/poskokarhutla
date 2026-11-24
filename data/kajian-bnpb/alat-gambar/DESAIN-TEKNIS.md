# DESAIN-TEKNIS: Alat gambar wilayah

## 1. Berkas dan pemilik

| Berkas | Isi | Pemilik (`ilmu.mjs pemilik`) |
| ------ | --- | ---------------------------- |
| `public/alat_gambar.js`, `public/alat_gambar.css` | mode gambar, simpul, kartu hasil | `layar-peta` |
| `public/alat_gambar_geo.js` | fungsi geometri murni (luas, buffer, titik-dalam-poligon, irisan) | `layar-peta` |
| `public/alat_gambar_kerja.js` | Web Worker hitung titik, hanya bila AG-03 mengukur perlu | `layar-peta` |
| `public/index.html` | satu tautan skrip dan satu tombol; tidak ada logika baru di dalamnya | `layar-peta` |
| `tests/gambar/*.test.mjs` | uji geometri dan kartu | tanpa pemilik sampai AG-00, lalu `penulis-gerbang` |
| `tests/agen/gerbang-alat-gambar.test.mjs` | gerbang kata dan berkas | `penulis-gerbang` |
| `package.json` skrip `uji:gambar` | | `mekanik-mesin` |

Tidak ada migrasi D1, rute Worker, R2, dan skrip pipeline. Tidak ada berkas data baru.

## 2. ADR

### ADR-1: peramban dulu (D10, Q1)

Data yang dibutuhkan sudah publik dan sudah diunduh peta: `hotspot*.json`. Desa dan kecamatan dimuat malas per kab. Tidak ada tulis ke server. Pilihan Worker ditolak bawaannya karena kuota baca D1 dan karena gambar adalah data lokasi pengguna.

### ADR-2: Web Worker bersyarat

Titik-dalam-poligon atas 217 ribu baris dengan saringan kotak batas biasanya ribuan baris yang lolos; dihitung di jalur utama dalam potongan kecil dengan jeda (`scheduler.yield` bila ada, selain itu `setTimeout`). Bila AG-03 mengukur > 100 ms di ponsel menengah (`?perf`), pindah ke Web Worker. Pustaka tidak ditambah (terra-draw, turf ditolak: gambar sederhana, satu fungsi per bentuk).

### ADR-3: peta

Lapisan MapLibre `gambar-garis`, `gambar-isi`, `gambar-simpul` dari satu sumber GeoJSON `gambar` yang ditambahkan lewat `peta.addSource` di dalam mode gambar dan dicabut saat hapus. Penangan klik peta dipasang di awal mode dan dilepas di akhir; `index.html` tidak diubah selain tombol (D9).

### ADR-4: kata di kode

Nama peubah memakai `wilayahDigambar`, `titikUnik`, `selBerdeteksi`, `jejakSel`; tidak ada peubah bernama `luasTerbakar` (gerbang).

## 3. Bentuk keadaan

```
{ bentuk: "poligon"|"kotak"|"buffer", simpul: [[lon,lat],...], r_km: n|null,
  periode: "24j"|"3h"|"7h",
  hasil: { luas_km2, titik_unik, frp_jumlah, frp_maks, siang, malam,
           sel, jejak_ha, insiden: [...], desa: [...]|null, kec: [...]|null } }
```

`null` = tak terukur, bukan nol. Keadaan hidup di memori halaman saja.
