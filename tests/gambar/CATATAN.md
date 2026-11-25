# Catatan temuan AG-01: alat gambar wilayah

Diperiksa 24 Nov 2026 di `public/index.html` (satu berkas, tanpa perubahan).

## Data titik yang bisa dipakai ulang

- `S.titik` = baris `hotspot.json`: `[lat, lon, jam, sensor, frp, keyakinan, indeks_wilayah, "MM-DD" WIB]`. `jam` relatif ke `S.acuan` (negatif = sebelum acuan); `titik_live.js` menggeser keduanya bersama.
- `S.jamTitik` = cakupan jam yang termuat (48 awal, 168 sesudah `muatTitik(168)`); `S.titikPenuh` true bila seluruh berkas termuat. `muatTitik(jam)` aman dipanggil ulang (mengembalikan janji yang sama).
- `S.dihitung(baris)` = definisi angka utama (lokasi unik per hari WIB, `AngkaKawasan.unik`, `S.kmin` = 0). Alat memakainya apa adanya, jadi angka titik di gambar sama dengan angka di panel. Tanpa predikat ini (uji di node) fungsi geometri memakai kunci hari + petak 0,0034 derajat.
- `peta` (let global di skrip inline), `S`, `toast` terbaca sebagai identifier telanjang dari skrip klasik lain.
- Insiden (pusat, `luas_ha`) belum disentuh: itu AG-04. Desa/kecamatan: AG-05.

## Alat ukur jarak

Tidak ada alat ukur jarak atau gambar di peta utama. `ukurAktif()` (baris ~1910) adalah pemilih indikator (hot/kl/luas/belum), bukan alat jarak; `S.ukur` sama. Tidak disentuh.

## Luas dNBR

Belum diperiksa untuk AG-01 selain bahwa AG-04 yang mengurusnya (D7); tidak ada perhitungan luas ulang di klien.

## Titik pasang

- Tombol: `<button class="iconbtn">` di `#tools` (kolom kanan atas peta), sesudah `#lapisBtn`; satu tombol saja.
- Penangan klik: peta utama punya `peta.on("click", ...)` (baris ~2216) yang membuka wilayah/cluster. Karena `index.html` tidak boleh diubah, mode gambar menahan klik di fase capture pada `peta.getCanvasContainer()` sebelum MapLibre melihatnya, lalu melepasnya saat mode berakhir.
- Warna garis: `paint` MapLibre tidak mengerti `oklch()`; warna dibaca dari token `--brand2` lewat kanvas 1 piksel, tidak ada literal warna baru.

## Keputusan kecil

- Kotak = dua klik (sudut pertama, sudut kedua) dengan garis bantu mengikuti kursor; seretan ditunda karena bentrok dengan geser peta di layar sentuh.
- Kapsul: luas dihitung dengan sampling grid (tidak ada gabungan poligon tanpa pustaka); isi gambar memakai bidang-bidang tumpang tindih berkelir tipis.
