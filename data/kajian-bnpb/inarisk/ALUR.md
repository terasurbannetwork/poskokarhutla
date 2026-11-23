# Alur

## A1. Pipeline (mingguan, atau tangan)

1. `python3 scripts/bnpb/inarisk.py tarik` menarik `data-irbi-full`, `kabupaten`, `provinsi`,
   `external-links`, batas kab, lalu per kab `data-jiwa-terpapar` dan `data-ikd/{pcode}/{tahun}` untuk
   tahun IKD terakhir yang tersedia per kab. Berjeda 0,4 detik, cache di `data/raw/inarisk/` (gitignored),
   bisa dilanjutkan.
2. `python3 scripts/bnpb/inarisk.py bangun` menulis `public/data/inarisk/*.json` lewat berkas sementara,
   menjalankan self-check, lalu memindahkan. Gagal cek = keluaran lama tidak tersentuh.
3. `python3 scripts/bnpb/inarisk.py --cek` menjalankan self-check tanpa jaringan.

## A2. Staf membuka IRBI

1. Buka `/bnpb/inarisk` (tab IRBI). Layar memuat `irbi.json` dan `kab.geojson`.
2. Ubah filter: kartu, peta, dan tabel dihitung ulang dari data di memori.
3. Klik baris atau wilayah peta: dialog detail terbuka seketika dengan data IRBI, lalu bagian jiwa
   terpapar dan IKD diisi dari `jiwa.json` dan `ikd.json` (sudah dimuat malas sekali).
4. "Unduh ringkasan PDF": `window.print()` dengan gaya cetak hanya dialog.

## A3. IKD

Pilih tahun, provinsi, kab. Tabel dari `ikd.json`. "Lihat analisa" membuka dialog dari data analisa
tersimpan; bila analisa tahun itu tidak dicermin, tampil "Analisa tahun ini belum tersedia".

## A4. Web GIS

1. Peta terbuka di Indonesia. Pilih peta dasar dan lapisan; raster ArcGIS dimuat per ubin.
2. Alat gambar: titik (radius bawaan 1 km), lingkaran, poligon. Setelah selesai, layar POST ke
   `/api/inarisk/dampak` lewat proksi, hasil tampil di dialog "Informasi gambar".
3. Lapor Kegiatan: pilih rentang tanggal, layar meminta `/api/inarisk/kegiatan/{id}/{pcode}`.

## A5. Unduhan

Filter mengirim `/api/inarisk/unduhan?...` (proksi ke `downloads`), 8 baris per halaman. Tombol Unduh
membuka `file_url` asli di tab baru.

## A6. Keadaan gagal

InaRISK atau ArcGIS tidak menjawab: proksi membalas 502 dengan pesan; layar menampilkan "Sumber InaRISK
tidak menjawab, coba lagi" di bagian itu saja. Berkas cermin tidak ada: tab menampilkan "Data belum
ditarik".
