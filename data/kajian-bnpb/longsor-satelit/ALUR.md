# ALUR: Pemetaan bekas longsor dari satelit

## Uji (sekali, sebelum fitur hidup)

1. `longsor` mengunci berkas kriteria (kejadian kalibrasi dan uji, ambang, sampel, pembanding) dan sidiknya; `validasi-model` memeriksa sebelum kunci (LS-01).
2. Titik sampel acak berlapis dibuat dari kriteria (tanpa melihat keluaran model); dua penafsir mendigitasi di lembar buta (LS-02).
3. Kesepakatan dua penafsir dihitung; titik yang berbeda ditengahi penafsir ketiga. Kesepakatan rendah berarti kebenaran tidak sah dan vonis menunggu.
4. Pipeline dijalankan pada kejadian kalibrasi, ambang dipilih di sana saja (LS-03).
5. Pipeline dijalankan sekali pada kejadian uji dengan ambang terkunci; vonis ditulis apa adanya (LS-05).

## Pakai (sesudah lulus)

1. Staf memilih kejadian (kab dan tanggal) di layar staf (Q5).
2. Pipeline dijalankan manual (Q8): komposit sebelum dan sesudah, rdNDVI, saringan pengecoh, poligon, agregat per kecamatan, irisan tebangan.
3. Hasil ke R2 `longsor/bekas/<kab>/<tanggal>/`; layar membaca agregat lewat rute staf.
4. Staf memakai peta untuk memilih kecamatan kunjungan; tidak ada penerimaan ke data resmi.

## Gagal

Citra bersih tidak ada di jendela sesudah: bagian itu "tidak terliput", bukan nol. Vonis gagal: layar menampilkan status gagal dan alasannya, tanpa angka.
