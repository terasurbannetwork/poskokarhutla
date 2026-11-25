# Gelar armada, water bombing, kelayakan

Halaman ini menjelaskan metode gelar armada, hasil water bombing dari satelit, kelayakan terbang, dan jangkauan base.

## Gelar armada dan status harian

- **Sumber:** pesan grup WhatsApp satgas udara, diurai oleh `urai()` di `src/operasi_wa.js:122`, dan dicatat oleh `catatOperasi()` (`src/operasi_udara.js:73`) sesudah pesan tersimpan.
- **Pengurai:** murni (tanpa D1, tanpa jaringan, tanpa model bahasa). Pesan yang tidak terbaca ditahan atau dilewati, tidak ditebak. Registrasi pesawat dicocokkan dengan pola (`PK-`, `VH-`, `VN-`, `UR-`, `ZK-`, `RA-`, `HA-` berangka, `H-` dan lainnya). Tanda panggil tertentu dipetakan lewat tabel `ALIAS`. Alasan tidak siap hanya dari daftar tetap, supaya teks bebas tidak membawa nama kru.
- **Tanggal operasi:** tanggal yang tertulis di isi pesan bila wajar (tidak lewat besok WIB), selain itu tanggal terima.
- **Status:** `siap`, `operasi`, `siaga`, atau `tidak_siap` per pesawat per tanggal (`op_armada_status`). Satu registrasi satu status per hari.
- **Isian manual menang atas bot** (K15). Penjagaan ada di dalam pernyataan tulis bot, bukan baca lalu tulis, jadi dua permintaan bersamaan tidak lolos (`src/operasi_udara.js:81` dan sekitarnya). Butir yang dilewati bot dicatat sebagai `bot_dilewati` di `op_isian_log`.
- **Telat lapor.** Aturan di layar: pada hari ini, base dengan armada dan tanpa satupun status dianggap belum lapor mulai 07.30 waktu setempat. Ambang 07.30 adalah bawaan sementara (Q1). Jam laporan pertama per pesawat belum disimpan (lihat Batasan).

## Hasil aksi water bombing dari satelit

Sumber: titik panas dari putaran FIRMS yang baru masuk. Tiap putaran baru dicocokkan dengan aksi water bombing berkoordinat dalam 48 jam terakhir yang belum punya hasil (`nilaiAksi`, `src/operasi_hasil.js:29-34`). Penilaian dipanggil dari `perbaruiTitik` (`src/titik.js:143`) dan hanya memakai titik dari putaran saat itu; hasil ditulis sekali. Tabel `titik_terbaru` menyimpan 8 putaran hanya sebagai arsip (`src/titik.js:140`) dan tidak dipakai penilaian.

```
t0 = jam aksi
titik_dekat = titik panas dengan jarak <= 1 km (KM_PADAM) dari koordinat aksi dalam [t0, t0 + 24 jam]
masih_api   bila titik_dekat > 0
padam       bila 24 jam sudah lewat dan titik_dekat = 0
menunggu    bila belum 24 jam dan belum ada titik dekat
tak_dinilai untuk patroli, OMC, atau aksi tanpa koordinat atau jam
```

Jarak memakai haversine, dengan pra-saring selisih lintang dan bujur kurang dari 0,02 derajat. Hasil `padam` berarti tidak ada titik panas satelit dalam 1 km selama 24 jam, bukan konfirmasi padam di lapangan. Penilaian tidak menunggu keterlambatan data FIRMS dekat waktu nyata (hingga sekitar 3 jam); bila ada padam yang menyala lagi, jendela dinaikkan (catatan `ponytail` di `src/operasi_hasil.js`). Penilaian "api muncul lagi" 24 sampai 72 jam sesudah aksi, yang direncanakan di paket dokumen, belum ada di kode.

Koordinat aksi yang kosong dilengkapi otomatis (`lengkapi`, `src/operasi_hasil.js:60`) untuk aksi 3 hari terakhir. Pemicunya bukan cron, melainkan saat foto grup tersimpan (`src/operasi_hasil.js:53`) dan saat pesan WA satgas tercatat (`src/operasi_udara.js:107`): dari foto grup yang dipasangkan (registrasi sama, selisih jam 3 jam atau kurang), lalu dari temuan pilot hari itu dengan nama lokasi (segmen pertama) yang sama. Sumber koordinat dicatat (`foto` atau `temuan`).

## Kelayakan terbang base

Fungsi `kelayakan(b)` di `public/operasi_peta.js:53`. Ambang adalah rancangan agent, bukan ketentuan resmi; label di layar "perkiraan".

```
stasiun = METAR terdekat dalam 60 km dari base (BMKG, /api/jarak-pandang dan data/metar.json)
basi    bila umur laporan > 3 jam (METAR_BASI_JAM)
tidak layak: jarak pandang < 1.500 m, atau badai guntur (TS), atau angin/embusan > 30 knot
terbatas   : jarak pandang < 5.000 m, atau asap/kabut asap (FU, HZ), atau angin/embusan > 20 knot
layak      : selain itu
tanpa stasiun atau basi: "?" (Tanpa METAR atau METAR basi), tidak pernah dianggap layak
```

![Tangga kelayakan terbang base dari METAR: tidak layak, terbatas, layak, dan tanpa METAR, dengan ambang dari public/operasi_peta.js:53.](gambar/operasi-kelayakan-terbang.svg)

Status uji balik: tidak ada. Angka angin hanya terbaca dari teks METAR mentah. Visibilitas dari model prakiraan (Open-Meteo) yang direncanakan belum dipakai.

## Jangkauan base dan celah

```
radius(base) = jelajah_nm terbesar armada base x 1,852 km
              bila semua jelajah_nm kosong: RADIUS_KM = 200 km   (bawaan sementara, public/operasi_peta.js:36)
cluster prioritas = cluster api level >= 3 dengan titik panas 24 jam > 0
celah = tidak ada base berarmada yang radiusnya mencakup cluster
```

Semua `jelajah_nm` masih kosong, sehingga yang berlaku 200 km. Mesin renlap memakai angka berbeda (lihat berikut). Kecepatan jelajah kasar untuk perkiraan waktu: 280 km/jam untuk pesawat sayap tetap (Cessna, Caravan, CASA, CN-295, Hercules), 200 km/jam untuk helikopter (`public/operasi_peta.js:37`).
