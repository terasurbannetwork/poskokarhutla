# KEAMANAN-PRIVASI: Bangunan di lereng terjal

## 1. Data apa yang ada

| Data | Sifat | Di mana |
| --- | --- | --- |
| Jejak dan titik bangunan Overture | data peta terbuka (ODbL), tetapi di skala per bangunan memuat lokasi tempat tinggal orang | hanya `data/raw/lereng/` (gitignored) selama hitungan |
| Lembar DEMNAS | data BIG, syarat penggunaan dibaca di LT-02 | `data/raw/lereng/dem/` (gitignored) |
| Ubin GLO-30 | Copernicus, terbuka | `data/raw/lereng/dem/` (gitignored) |
| Agregat desa dan kecamatan | jumlah, kerapatan, cakupan | `public/longsor/data/lereng/` |
| Daftar 21 desa longsor | nama desa, tanggal, tautan sumber | `scripts/longsor/data_kejadian_desa.json` |
| Citra dan potongan | gambar kecil bertanda "perkiraan dari citra" | `public/longsor/data/lereng/kejadian/` |

Tidak ada data orang: tanpa nama, tanpa kontak, tanpa jumlah korban, tanpa nama petugas.

## 2. Aturan

1. Tidak ada koordinat, id, atau jejak bangunan tunggal di `public/`, di PDF, di ekspor, atau di jawaban API. Agregat terkecil yang tampil adalah desa. Desa dengan bangunan dinilai kurang dari 20 tampil tanpa rincian kelas (bawaan teknis tanpa sumber, `n_min_rincian` di `lereng_param.json`, ALGORITMA 5: mencegah identifikasi bangunan tunggal dari hitungan kecil).
2. Sel halus 110 m hanya untuk sesi staf lewat R2 di balik sesi, dan hanya setelah Q4 dijawab. Sel dengan hitungan 1 sampai 4 digabung ke sel sekitarnya atau disembunyikan.
3. Mentah (`data/raw/`) tidak di-commit; tidak ada berkas bangunan per baris di repo, di artefak CI, atau di R2 publik. Keputusan 29 siklus: Overture tidak disalin utuh ke R2.
4. Peringkat nama wilayah tidak diberi kata rawan atau aman (D16, Q15). Kalimat tentang desa tidak menyiratkan nilai tanah atau kelayakan huni.
5. Nama desa tidak dikaitkan dengan nama orang atau korban. Daftar kejadian hanya berisi nama desa, tanggal, jenis sumber, dan tautan.
6. Layar mengikuti hak sesi: bawaan staf dan akun instansi (Q14). Sebelum itu tidak ada angka di sumber halaman untuk tamu.
7. Tidak ada kunci, token, atau kredensial di berkas yang dilacak git. Unduhan DEMNAS yang butuh akun dilakukan pemilik; kredensialnya tidak masuk repo.
8. Tidak ada tombol bagikan peta tanpa label hipotesis, ambang, dan rilis di dalam gambarnya (selaras Q16 modul tsunami).

## 3. Lisensi

| Sumber | Syarat dan sikap |
| --- | --- |
| Overture Maps bangunan | ODbL-1.0 untuk turunan OSM dan Microsoft; atribusi "Overture Maps Foundation, OpenStreetMap contributors, Microsoft ML Buildings, Google Open Buildings" tampil. Agregat dianggap karya terproduksi menurut pemahaman awal; ini diperiksa di LT-02 dan tidak menerbitkan basis data per bangunan (Q11). |
| DEMNAS (BIG) | Syarat tidak dibaca di paket ini. Mentah tidak dipublikasikan; agregat dengan atribusi BIG; dibaca di LT-02 (Q2). |
| Copernicus GLO-30 | Lisensi Copernicus terbuka dengan atribusi **[periksa]** di LT-02. |
| FABDEM | CC BY-NC-SA 4.0: hanya audit internal, tidak ada angka atau peta turunan di layar (`fabdem.mjs`; Q12). |
| Sentinel-2 | Copernicus terbuka, atribusi tampil. Citra ditampilkan terpotong kecil dengan label perkiraan. |
| Batas desa dan kecamatan | BIG dan Kemendagri sesuai catatan `scripts/geo/batas.py`; asal batas desa belum tercatat (Q6). |

## 4. Risiko penyalahgunaan dan jawabannya

| Risiko | Jawaban |
| --- | --- |
| Peringkat dibaca sebagai vonis wilayah tidak layak huni atau merugikan nilai tanah | Wording paparan, label hipotesis, kelengkapan di tiap baris, hak staf dulu (Q14, Q15). |
| Angka dipakai sebagai prakiraan longsor | Tertulis bukan peringatan; tidak ada kata prediksi; tidak masuk nowcast (D10). |
| Bangunan hilang dari peta jadi "tidak ada bangunan" | Kosong bukan nol, "paling sedikit", kelas kelengkapan (D7). |
| Pengidentifikasi bangunan tunggal | Agregat desa, ambang n kecil, tanpa sel halus publik. |
| Kutipan media dengan nama korban | Daftar hanya nama desa dan tautan. |

## 5. Pemeriksa

`security-reviewer` dan `guard-api` bila ada rute Worker (LT-27); `higiene-repo` sebelum commit besar (memastikan `data/raw` tidak ikut); `validasi-model` untuk uji.
