# ALUR

## Warga

1. Buka `/lapor`, pilih Peringatan.
2. Lihat ringkas dan ONI/IOD; pilih pil bahaya (misal Banjir bandang).
3. Peta mewarnai kab; daftar menampilkan kab teratas.
4. Klik kab: kartu rincian, prakiraan BMKG per desa dimuat saat itu.
5. Ganti hari di kartu kanan atas; peta dan daftar mengikuti.
6. Buka sub-tab Analisis untuk gambaran nasional.

## Staf

Sama, ditambah di kartu rincian: tabel per desa (rute `/desa`), unduh CSV, dan rekomendasi per pihak (rute `/rekomendasi`). Masuk lewat `/admin/masuk`.

## Pipeline per jam (`dampak_peringatan.yml`)

1. Keterpaparan (induk).
2. `status_prakiraan.py` (sekarang dengan BDG).
3. `analisis_wilayah.py` membaca `status.json`, `prediksi.json`, `kelas_bahaya_kab.json`, kelas desa, `kekeringan_hth.json`, debit kab, menulis `analisis.json`.
4. Unggah ke R2 `dampak_peringatan/`.

## Bulanan

`kelas_kab.py --bangun` dengan bahaya tambahan dan kelas per desa.

## Harian

`hth.py`, `debit_glofas.py` dengan keluaran publik ringkas, `iklim.py` (mingguan) dengan cadangan IOD.

## Galat

Sumber hilang: blok tampil "belum terukur" dengan jam data terakhir. BMKG desa ditolak: "Prakiraan BMKG per desa belum bisa dimuat", tanpa angka.
