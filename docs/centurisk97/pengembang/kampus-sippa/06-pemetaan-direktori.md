# Pemetaan relawan dan direktori

Bagian ini memerinci rasio kelengkapan bangunan untuk pemetaan relawan serta sumber dan metode direktori akademisi.

## Pemetaan relawan: rasio kelengkapan dan prioritas

Dokumen rujukan: `data/kajian-bnpb/pemetaan-relawan/ALGORITMA.md`. Semua ambang berstatus HIPOTESIS (Q6 dan Q7) dan hidup di `scripts/pemetaan/konst.py` yang harus identik dengan `public/pemetaan/konst.js`.

Sumber:

- Bangunan OSM: API ohsome (`https://api.ohsome.org/v1`, publik tanpa kunci), hitungan `elements/count` dengan filter `building=* and geometry:polygon`, pada tanggal data terbaru di metadata ohsome (`scripts/pemetaan/kelengkapan.py:13`).
- Pembanding: bangunan Google Open Buildings v3 dengan keyakinan 0,70 atau lebih pada zona yang sama, lewat `scripts/pemetaan/pembanding.py` dan `scripts/siklus/paparan.py`.

Rumus:

```
rasio = N_osm / N_pembanding            ; null bila N_pembanding < 100 atau N_osm tidak diketahui
kelas = tipis bila rasio < 0,6 ; memadai bila rasio > 0,85 ; selain itu sedang
skor_rasio = min(rasio, 1)              ; hanya untuk skor, tampilan tidak dipotong
```

Rumus prioritas rancangan (belum terimplementasi; `data/kajian-bnpb/pemetaan-relawan/ALGORITMA.md:38`): `prioritas = paparan_norm * (1 - min(rasio, 1))`, dengan `paparan_norm` = bangunan pembanding di zona dibagi nilai tertinggi antar kabupaten/kota terdaftar. Kode saat ini hanya menghitung `rasio`, `kelas`, dan `skor_rasio` (`scripts/pemetaan/pembanding.py:35`, baris agregat `scripts/pemetaan/kelengkapan.py:73`), dan tidak ada keluaran `prioritas` maupun `paparan_norm` di `scripts/pemetaan/` atau `public/pemetaan/`.

Aturan:

- Jeda 1 detik antar kueri ohsome, ulang dengan jeda naik (2, 4, 8 detik) untuk galat 429, 5xx, dan galat jaringan. Galat 4xx lain tidak diulang. Bentuk jawaban tak dikenal menghasilkan `null`, bukan nol.
- Kabupaten/kota tanpa grid pembanding ditandai `terliput = false`, bukan rasio nol.
- Rasio di atas 1 tampil apa adanya, bukan "100 persen", karena bisa berarti OSM lebih lengkap atau pembanding kurang lengkap.
- Data dianggap basi bila ujung rentang ohsome lebih tua dari 180 hari (`SEGAR_HARI`). Pada 15 November 2026 ketertinggalan sekitar 110 hari.
- Overture tidak dipakai sebagai pembanding karena sudah memuat OSM sehingga menggembungkan rasio.

Faktor pengganggu yang diketahui: positif palsu Open Buildings di perdesaan pada ambang 0,70 membuat rasio tampak rendah; bangunan yang digambar sebagai satu poligon majemuk lawan terpisah per rumah; bangunan OSM yang hanya titik atau multipoligon tidak terhitung; cakupan Open Buildings berbeda antar wilayah. Karena itu rasio dibaca per kelas, bukan sebagai angka tunggal lintas kota dan desa.

Bukti uji: hitungan nyata baru dijalankan pada tiga kabupaten/kota di provinsi 63 dengan zona seluruh kabupaten/kota (aproksimasi, bukan zona bahaya). Uji kejujuran ALGORITMA §4 (HR-05) belum dikerjakan: ambil 10 kabupaten/kota berstrata (sedikitnya 3 perkotaan dan 3 perdesaan), periksa manual 1 km persegi terhadap citra, dan bila kelas mesin cocok pada kurang dari 7 dari 10 maka pil tetap dan ambang direvisi. Daftar prioritas karena itu berpil "Belum diuji".

Sumbangan kampus: belum terdokumentasi di kode. Pembacaan sumbangan per hashtag belum dibangun; di kode hanya ada pembuatan hashtag (`scripts/pemetaan/paket.py:36`). Rancangannya (membaca agregat hashtag `#CentuRisk-<kode>` lewat layanan statistik hashtag ohsome, karena ohsome utama tidak bisa menyaring hashtag dan API changeset OSM memuat nama pengguna, hanya agregat per kampus per proyek yang disimpan) ada di `data/kajian-bnpb/pemetaan-relawan/RISET.md`.

Paket proyek (`scripts/pemetaan/paket.py`): keluaran `aoi.geojson`, `paket.json`, dan `instruksi.md`, ditolak bila diarahkan ke bawah `public/`. Ukuran tugas yang disarankan sekitar 1 km persegi, perkiraan jumlah tugas = luas / 1 km persegi (HIPOTESIS, belum dikalibrasi). Luas dihitung dengan rumus tali sepatu kasar pada cincin luar. Paket menandai `dikirim_ke_luar = false` dan memuat daftar periksa staf: halaman wiki OSM kegiatan, pemberitahuan ke komunitas OSM lokal, hashtag terdaftar, lisensi citra dipastikan, akun HOT disetujui.

## Direktori akademisi: sumber dan metode

Data pakar (ribuan dosen) tidak pernah ada di `public/` atau git. Berkas JSON ada di R2 (bucket media) dengan kunci `akademisi/<nama>.json`. Daftar nama berkas yang boleh dibaca lewat `GET /api/akademisi/data/<nama>` tertulis di `DATA_AKADEMISI` (`src/akademisi.js:203`).

Rincian karya (`GET /api/akademisi/riset/:id`, `src/akademisi.js:77-105`) juga memanggil Workers AI untuk membuat ringkasan, penjelasan, dan kesimpulan berbahasa Indonesia per karya. AI hanya dicoba bila abstrak lebih dari 200 karakter, dibatasi 60 per staf per jam, dan hanya memakai judul dan abstrak. Hasil di-cache tepi 30 hari, kecuali bila AI gagal (tidak disimpan supaya diringkas ulang). Ini terpisah dari `POST /ringkasan` (ringkasan kebijakan 30 riset, laju 10 per jam).

- **Karya**: `GET /api/akademisi/karya/<id OpenAlex>` mengambil delapan karya per halaman dari OpenAlex, dengan saringan jenis (jurnal, prosiding, buku), urutan (sitasi atau terbaru), dan pencarian judul. Hasil disimpan di cache tepi selama satu hari. Sumber gagal menghasilkan 502 dan layar menyembunyikan bagiannya.
- **Terdekat**: pakar serumpun diurutkan jarak haversine antara titik yang dipilih dan koordinat kampus pakar. Batas masukan: lintang -12 sampai 7, bujur 94 sampai 142, `n` 1 sampai 20. Bila provinsi dipilih, pakar di provinsi itu didahulukan lalu diisi pakar luar provinsi bertanda `luar_prov`. Data dimuat per isolate dengan umur cache 10 menit, jadi unggahan baru bisa tertunda paling lama 10 menit.
- **Ringkasan riset**: sintesis kebijakan dari abstrak 30 riset teratas (sitasi, lalu tahun) per rumpun dan provinsi memakai Workers AI. Prompt hanya menerima isi abstrak dan memerintahkan agar tidak menambah angka, nama tempat, atau klaim di luar abstrak. Id karya yang dikutip dicocokkan dengan daftar yang dikirim, yang tak cocok dibuang. Hasil disimpan di R2 selama 30 hari. Pembuatan baru dibatasi 10 per staf per jam.
- **Riwayat dengan BNPB**: tabel D1 `akademisi_riwayat` (migrasi `0087`), penilaian bilangan bulat 1 sampai 5.
- **Koreksi**: satu objek JSON per koreksi di R2 `akademisi/koreksi/<tanggal>/<uuid>.json`, dibatasi 20 per staf per jam, dibaca admin lewat `GET /api/akademisi/koreksi` (membaca paling banyak 200 objek terbaru dari 1000 kunci pertama).
- **Pembanding silang**: direktori memuat indikator kapasitas per provinsi (anggaran BTT per jiwa, tempat tidur rumah sakit dan puskesmas per penduduk, lembaga per 100 ribu jiwa, pakar per sejuta jiwa) pada tab Wilayah (`public/akademisi.js:2638`).

Status uji balik: direktori adalah agregasi data, bukan model prediksi, sehingga tidak ada uji balik. Perangkat uji yang menjaga hak akses adalah `tests/warga/akademisi_peran.test.mjs`.
