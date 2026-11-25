# Titik panas yang dihitung

Halaman ini mendefinisikan angka utama titik panas yang dipakai di seluruh layar.

![Alur data peta utama: titik satelit NASA FIRMS diolah pipeline Python menjadi lokasi unik, cluster, dan luas, disimpan sebagai berkas JSON di public/data, lalu digambar oleh layar peta utama.](gambar/peta-karhutla-alur-data.svg)

## Titik panas yang dihitung (angka utama)

Satu definisi untuk semua angka "titik panas" di layar (`scripts/data/titik_unik.py:1`):

- Sumber: NASA FIRMS, sensor MODIS (M), VIIRS S-NPP (N), NOAA-20 (N20), dan NOAA-21 (N21). Sensor VIIRS memberi piksel 375 m, MODIS 1 km. S-NPP berhenti didistribusikan 1 November 2026 pukul 13.00 UTC; sesudahnya angka tetap utuh karena NOAA-21 selalu ikut.
- Keyakinan: semua tingkat, termasuk rendah (`KEYAKINAN_MIN = 0`, `scripts/data/titik_unik.py:26`). Keputusan pemilik 28 Oktober 2026, dengan alasan api gambut bersuhu rendah dan sering tertutup asap sehingga sinyalnya jatuh di kelas rendah. Akibatnya ada lebih banyak alarm palsu di luar gambut.
- Satuan: lokasi unik per hari kalender WIB. Satu sel kisi sekitar 375 m (`SEL = 0,003375` derajat, bujur diskalakan cosinus lintang) dihitung sekali per hari tanpa melihat jumlah satelit atau lintasan. Alasannya: NOAA-20 dan NOAA-21 melintas dengan selang sekitar 50 menit di orbit yang sama sehingga titik mentah menghitung api yang sama dua kali. Pada 25 Oktober 2026, 433 dari 704 titik NOAA-21 Kalimantan Tengah jatuh di sel yang sudah terdeteksi satelit lain hari itu.
- Penyaring: titik di sumber panas tetap (smelter, tambang, kilang, pembangkit, lepas pantai) dibuang lewat `titik_palsu.sel_industri()`. Titik kawah gunung api tidak dibuang di angka utama.
- Wilayah: provinsi, kabupaten, dan kecamatan dari titik-dalam-poligon (`Wilayah.cari`). Cermin sisi peramban ada di `public/angka_kawasan.js`.
- Hasil: tidak sama dengan SiPongi atau GIS BNPB, yang memakai titik mentah. Untuk membandingkan, `data/titik_setara.json` memuat angka 24 jam versi kita, setara SiPongi, dan hanya keyakinan tinggi.
- Berkas turunan: `hotspot.json` (7 hari), `hotspot24.json` (48 jam), `hotspot72.json`, `titik_hari/<tanggal>.json` (arsip harian 2026), dan `titik_tahun.json`.

Frekuensi: `titik.yml` jalan tiap 3 jam (cron `40 */3 * * *` UTC) ditambah dua putaran menjelang batas laporan; `data.yml` harian pukul 21.20 WIB. Tiap satelit hanya melintas sekitar dua kali sehari, sehingga jeda dan awan tidak terhindarkan.

Batasan angka: tidak ada titik tidak berarti tidak terbakar; satelit punya jeda lintasan dan awan menutup.
