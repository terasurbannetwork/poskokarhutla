# ALUR

## Publik

1. Buka `/potensi` (dari menu, dari Alun-alun mode Peringatan, atau langsung). Tab bawaan: Status, pilihan hari "3 hari".
2. Pilih pil bahaya; peta dan daftar mengikuti. Putar garis waktu Hari ini sampai Lusa.
3. Klik kab di peta atau daftar: kartu fakta di panel; prakiraan BMKG per desa dimuat saat itu.
4. Tab Dampak: peringatan BMKG yang aktif dan keterpaparannya per kab.
5. Tab Iklim: ONI, IOD, hari tanpa hujan, debit.
6. Tab Analisis, Lapisan, Ringkasan, Sumber: baca.
7. Alamat menyimpan tab, bahaya, hari, dan kab (`/potensi#status?b=bnj&h=1&kab=3501`) supaya bisa dibagikan.

## Staf

Sama, ditambah: tab Rekomendasi muncul sesudah rute sesi menjawab sah; kartu fakta dan tab Dampak memuat tabel per desa, fasilitas bernama, CSV. Masuk lewat `/admin/masuk`.

## Pipeline

- Per jam (`dampak_peringatan.yml`): keterpaparan (induk), `status_prakiraan.py` (dengan BDG dan K dari kelas desa), `analisis_wilayah.py`, unggah R2.
- Harian: `hth.py`, `debit_glofas.py` keluaran ringkas, runner BMKG desa bila Q2 jatuh ke jalur cadangan.
- Mingguan: `iklim.py` dengan cadangan IOD.
- Bulanan: `kelas_desa_bnpb.py` menarik berkas kelas desa BNPB, memeriksa bentuk dan jumlah desa, menulis `public/data/kelas_desa_bnpb.json` dan kelas kab.

## Galat

Sumber hilang: blok tampil "belum terukur" dengan tanggal data terakhir. BMKG desa ditolak: "Prakiraan BMKG per desa belum bisa dimuat", tanpa angka. Berkas kelas desa BNPB berubah bentuk: pipeline berhenti dan memakai tarikan terakhir yang lolos, tidak menulis berkas kosong.
