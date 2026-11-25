# KEPUTUSAN-GAMBAR: Alat gambar wilayah di peta utama (PKH-37)

Dokumen ini menang atas semua dokumen lain di folder ini. Paket ini memuat satu tiket pembanding pantaukarhutla.com: PKH-37 (alat gambar poligon, kotak, dan buffer 1 sampai 50 km di peta utama yang menjawab dari data kita).
Keputusan pemilik ditulis dengan tanggal dan kalimat aslinya bila tersedia. Pertanyaan yang belum dijawab pemilik ditulis sebagai **Q**, dengan bawaan sementara bertanda **[SEMENTARA]**.
Bawaan sementara boleh dipakai untuk membangun, tetapi tidak boleh tampil di layar sebagai angka pasti bila tertulis demikian di D atau Q.

## Keputusan pemilik

Nomor K mengikuti `data/kajian-bnpb/pembanding-pantaukarhutla/TIKET.md` (bagian "Keputusan pemilik 24 Nov 2026").

| No | Tanggal | Keputusan | Berlaku di paket ini | Kalimat pemilik |
| -- | ------- | --------- | -------------------- | --------------- |
| K1 | 24 Nov 2026 | Kelompok G (PKH-33 sampai 45) ikut jalan; PKH-34 dan PKH-37 tetap lewat paket dokumen dulu lalu kode (AGENTS §3.7). | ya | "Gas semua" |
| K5 | 24 Nov 2026 | Animasi api 3D (PKH-12) disetujui. | tidak diubah; alat gambar tidak boleh bertabrakan dengan lapisannya (D9) | – |

Pemilik belum memutuskan apa pun yang khusus tentang alat gambar selain K1. Semua yang lain di bawah adalah rancangan (D) atau pertanyaan (Q).

## Rancangan (D)

| D | Keputusan rancangan | Alasan |
| - | ------------------- | ------ |
| D1 | **Tiga bentuk**: poligon (klik titik, tutup dengan klik titik pertama atau dua kali klik), kotak (seret dua sudut), dan buffer: lingkaran dari satu titik, atau kapsul dari garis yang digambar, dengan jari-jari 1 sampai 50 km (langkah 1 km). Satu gambar aktif sekaligus; "hapus" mengosongkannya. Buffer luar dari poligon tidak dibuat (Q6). | Definisi PKH-37; menjaga alat tetap kecil. |
| D2 | **Menjawab dari data kita saja**, lima kelompok angka: (1) titik panas dan FRP; (2) siang lawan malam; (3) sel berdeteksi 375 m; (4) luas dNBR insiden bila ada; (5) desa dan penduduk. Tidak ada sumber pihak ketiga, tidak ada panggilan jaringan baru selain berkas JSON yang sudah publik. | Aturan paket pembanding; hindari kelemahan SIPARHUTLA. |
| D3 | **Luas gambar bernama "luas wilayah digambar"**, dalam km2 dan ha, dihitung geodesik pada bola (rumus luas poligon di bola), dan tidak pernah disebut luas terbakar, luas bakar, atau luas karhutla. Gerbang menolak pasangan kata itu di berkas alat. | Pembanding (SIPARHUTLA) menampilkan luas gambar pengguna sebagai "luas area terbakar" (kotak 542 ribu ha dengan 0 titik). Itu persis yang tidak ditiru. |
| D4 | **Titik panas = definisi angka utama**: lokasi unik per hari WIB, semua sensor, semua keyakinan (`scripts/data/titik_unik.py`), dihitung dari `public/data/hotspot.json` yang sama dengan peta utama. Periode: 24 jam, 3 hari, 7 hari memakai `hotspot24.json`, `hotspot72.json`, `hotspot.json`. Titik MODIS dan VIIRS tidak dijumlah diam-diam: tampil per sensor di rincian, jumlah lokasi unik di angka utama. | Satu definisi per angka. |
| D5 | **Siang lawan malam** dari jam WIB deteksi: malam 18.00 sampai 06.00 WIB, selebihnya siang (sama dengan `gambut_bara.py`). Jam WIB = `acuan` UTC + `jam` + 7. Tidak ada tafsir "malam berarti gambut": angka disajikan, tidak ditafsirkan (RISET pembanding: tafsiran 65% belum diuji). | Tafsiran tanpa uji tidak ditiru. |
| D6 | **Sel berdeteksi** = jumlah sel angka utama (`AngkaKawasan.selUnik`, 0,003375 derajat berskala cos lintang; revisi 24 Nov 2026 dari tinjauan bersih) yang punya sedikitnya satu deteksi dalam periode; label "sel berdeteksi", bukan "sel terbakar". Jejak ditampilkan sebagai sel × luas sel (sekitar 14,08 ha) dengan label "jejak sel", bukan luas terbakar. | Titik panas bukan luas bakar. |
| D7 | **Luas dNBR hanya bila ada**: insiden yang sudah punya luas citra (`scripts/data/luas_citra.py`) dan pusatnya jatuh di dalam gambar ditampilkan per insiden dengan labelnya ("batas bawah, awan tidak dihitung"), dijumlah **tidak**; bila tidak ada, baris itu tidak muncul. Luas citra tidak dihitung ulang di peramban. | Satu mesin luas; luas itu milik insiden, bukan wilayah arbitrer. |
| D8 | **Desa dan penduduk**: daftar desa yang beririsan dengan gambar dari poligon `public/geo/desa/<kode kab>.json` (hanya kab yang kotak batasnya beririsan; batas jumlah berkas dimuat di D12), nama dari `public/data/desa_cari.json`. Penduduk: bawaan [SEMENTARA, Q4] hanya tampil sebagai "penduduk kecamatan yang beririsan" dari `public/data/penduduk.json` (`kec`), diberi pil "perkiraan kasar" dan **tidak** pernah disebut "penduduk di dalam gambar"; kecamatan didapat dari poligon `public/geo/kecamatan/<kode provinsi>.json`. | Satuan penduduk terkecil kita kecamatan atau grid 0,25 derajat (±28 km), jauh lebih kasar dari buffer 1 km. |
| D9 | **Tidak menabrak peta lain**: lapisan gambar memakai sumber dan lapisan MapLibre sendiri bernama `gambar-*`, di atas lapisan data dan di bawah label; tidak mengubah `ukurAktif`, indikator ukuran (`S.ukur`), atau lapisan api 3D. Penanganan klik peta dialihkan hanya saat mode gambar aktif dan dikembalikan saat keluar. | Peta utama sudah berat dan punya penangan klik; INP. |
| D10 | **Bawaan peramban dulu** (Q1): hitung di peramban dari JSON publik yang sudah dimuat peta utama; tanpa rute Worker, tanpa D1, tanpa penyimpanan gambar di server. Hitung titik di Web Worker bila pengukuran AG-03 menunjukkan > 100 ms di jalur utama. | Tanpa server baru; data pengguna tidak meninggalkan peramban. |
| D11 | **Gambar tidak disimpan dan tidak masuk URL** (Q2). Hilang saat halaman ditutup. Tanpa localStorage untuk gambar. Tidak ada kunci peta atau token milik pihak ketiga yang disimpan klien (SIPARHUTLA menyimpan map key FIRMS di localStorage; tidak ditiru). | Privasi dan keamanan. |
| D12 | **Batas muatan**: gambar yang beririsan dengan lebih dari 12 kabupaten tidak memuat daftar desa; kartu menulis "gambar terlalu luas untuk daftar desa" dan tetap menghitung titik. Poligon dengan lebih dari 200 simpul ditolak dengan pesan. | Menjaga memori dan INP. |
| D13 | **Kata**: tidak ada kata "luas terbakar" untuk luas gambar; tidak ada "aman", "bebas api", "padam", atau "pelaku". Hasil 0 titik ditulis "0 titik dalam data periode ini (satelit punya jeda dan awan menutup)". Teks lewat `bahasa-indonesia-plain`; kode klien dirujukkan dulu ke `modern-web-guidance`. | Aturan repo. |
| D14 | **Kartu hasil** mengikuti kartu standar (AGENTS §3.5): kepala = nama seksi ("Wilayah digambar"), isi tabel `.ex-tabel`, tanpa kalimat kesimpulan dan tanpa kaki Sumber. | Standar pemilik. |
| D15 | **Tidak dibangun di paket ini**: ekspor CSV atau GeoJSON gambar, simpan atau bagikan gambar, perbandingan dua periode (bulan lalu, YoY), skor atau peringkat wilayah, buffer dari poligon, lapisan baru di peta, angka emisi atau asap. | PKH-37 hanya alat gambar dan jawabannya. |

## Prinsip yang mengikat semua tiket

1. **Tidak ada data dummy** (standar pemilik 11 Nov 2026). Uji memakai data kecil buatan sendiri hanya di `tests/`.
2. **Tak terukur bukan nol.** Periode tanpa data, kab tanpa berkas desa, dan penduduk tanpa data tampil "tak terukur" atau "–".
3. **Satu definisi per angka.** Titik panas = angka utama; sel berdeteksi dan jejak tidak disebut luas.
4. **Tidak ada titik bukan tidak terbakar.** Gambar tanpa titik tidak ditulis aman atau padam.
5. **Klik tidak membekukan layar** (INP < 200 ms): chrome dicat dulu, hitungan menyusul.
6. **Tanpa server baru dan tanpa simpan sisi server.**
7. Teks Indonesia lewat `bahasa-indonesia-plain`; kode klien dirujukkan dulu ke `modern-web-guidance`.

## Pertanyaan terbuka untuk pemilik

| Q | Pertanyaan | Bawaan sementara |
| - | ---------- | ---------------- |
| Q1 | Hitung di peramban dari JSON publik, atau lewat rute Worker (mis. `/api/gambar`)? | [SEMENTARA] peramban dulu (D10): tanpa biaya D1 (kuota baca Free sudah pernah habis), tanpa data pengguna ke server. Worker dipertimbangkan hanya bila peramban tidak muat (11 MB `hotspot.json`, ponsel lemah) |
| Q2 | Gambar boleh dibagikan lewat tautan (koordinat di URL) atau disimpan? | [SEMENTARA] tidak: gambar hilang saat halaman ditutup; tautan berisi koordinat dianggap data lokasi |
| Q3 | Nama "sel berdeteksi" dan "jejak sel" untuk hitungan sel 375 m (PKH-37 menulis "sel terbakar") diterima? | [SEMENTARA] diterima; "sel terbakar" tidak dipakai karena titik panas bukan luas bakar |
| Q4 | Penduduk: hanya "kecamatan yang beririsan" (kasar), penduduk grid 0,25 derajat, atau belum ada sampai ada data penduduk per desa? | [SEMENTARA] kecamatan yang beririsan, berpil "perkiraan kasar"; tidak ada angka penduduk "di dalam gambar" |
| Q5 | Periode lebih lama dari 7 hari (arsip `public/data/titik_hari`, sejak Jan 2026) boleh? | [SEMENTARA] tidak; hanya 24 jam, 3 hari, 7 hari |
| Q6 | Buffer luar dari poligon (offset) diperlukan, atau cukup lingkaran dan kapsul? | [SEMENTARA] lingkaran dan kapsul saja |
| Q7 | Luas dNBR insiden dalam gambar boleh tampil walau tidak dijumlah? | [SEMENTARA] boleh, per insiden, dengan label batas bawah |
| Q8 | Letak tombol alat di peta utama dan bagi pengguna ponsel? | [SEMENTARA] satu tombol "Gambar wilayah" di kontrol peta yang ada; dipasang sesudah tinjau lokal |
