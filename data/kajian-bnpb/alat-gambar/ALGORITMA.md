# ALGORITMA: Alat gambar wilayah

Semua fungsi geometri murni dan terpisah dari DOM, di `public/alat_gambar_geo.js` (dapat diuji `node --test`). Konstanta di kepala berkas.

## Konstanta

| Nama | Nilai | Catatan |
| ---- | ----- | ------- |
| `BUFFER_MIN_KM`, `BUFFER_MAX_KM` | 1, 50 | langkah 1 |
| `MAKS_SIMPUL` | 200 | D12 |
| `MAKS_KAB` | 12 | D12 |
| `PETAK` | 0,0034 | derajat, sama dengan `riwayat_petak.PETAK` |
| `PIKSEL_HA` | 14,0625 | `gambut_bara.PIKSEL_HA` |
| `MALAM_WIB` | 18 sampai 06 | D5 |
| `R_BUMI_KM` | 6371,0088 | jari-jari rata-rata |

## A. Luas geodesik

Luas poligon di bola: jumlah selisih bujur × (sin lintang_i + sin lintang_j) / 2 dikali jari-jari kuadrat, mutlak. Kotak diubah jadi poligon empat sudut. Hasil km2 dan ha = 100 × km2. Dibulatkan tanpa presisi palsu (dua angka bermakna di atas 100 km2).

## B. Buffer

- Lingkaran: 72 simpul pada jarak `r` km dengan rumus tujuan (lintang, bujur, arah, jarak) di bola.
- Kapsul: gabungan lingkaran di tiap simpul garis dan persegi panjang di tiap ruas; titik masuk bila jarak titik ke garis ≤ `r` (jarak titik ke ruas pada bidang lokal ekuidistan di sekitar titik). Untuk garis lebih dari 50 simpul dijarangkan.
- Luas buffer dihitung dari poligon hasil (A), bukan π r².

## C. Titik dalam gambar

1. Saring kotak batas (lat, lon).
2. Titik-dalam-poligon aturan genap-ganjil; titik pada tepi dianggap di dalam.
3. Dari baris yang lolos: `tgl_wib` dan petak `(floor(lat / PETAK), floor(lon / PETAK))` membentuk kunci unik; **lokasi unik per hari** = jumlah kunci berbeda (D4). Jumlah baris mentah tidak ditampilkan sebagai angka utama.
4. FRP: jumlah dan maksimum dari baris yang punya FRP; baris tanpa FRP dikeluarkan dan dihitung terpisah, tidak sebagai nol.
5. Siang atau malam: jam WIB = (`acuan` UTC dalam jam + `jam` + 7) mod 24; malam bila ≥ 18 atau < 6.
6. Sel berdeteksi = jumlah petak berbeda lintas hari periode; jejak sel = sel × `PIKSEL_HA` ha.

## D. Insiden dan luas dNBR

Pusat insiden (dari berkas insiden yang sudah dimuat peta) dalam gambar → tampilkan `luas_ha` citra bila ada, dengan `cakupan_pct`. Tidak ada penjumlahan dan tidak ada perhitungan ulang.

## E. Desa dan kecamatan

1. Kotak batas gambar ∩ kotak batas kab (dari `public/geo/kabupaten` atau indeks yang sudah ada) → daftar kab; lebih dari `MAKS_KAB` → berhenti dengan pesan.
2. Per kab, muat `public/geo/desa/<kode kab>.json`; desa beririsan bila ada simpul desa di dalam gambar, simpul gambar di dalam desa, atau ruas berpotongan.
3. Nama dari `desa_cari.json` (`kd`).
4. Kecamatan beririsan dari `public/geo/kecamatan/<kode provinsi>.json` dengan aturan sama; penduduk = jumlah `kec` kecamatan beririsan, label "penduduk kecamatan yang beririsan, perkiraan kasar".

## F. Kata

Rumusan tetap: "Luas wilayah digambar", "Titik panas dalam wilayah (lokasi unik per hari)", "Sel berdeteksi", "Jejak sel". Daftar kata terlarang di berkas alat: lihat RENCANA-UJI §5.
