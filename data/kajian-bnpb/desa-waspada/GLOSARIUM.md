# GLOSARIUM: Desa Waspada

| Istilah | Arti di modul ini |
| ------- | ----------------- |
| Desa waspada | Nama halaman untuk dua daftar desa (A dan B). Bukan vonis bahwa desa akan terbakar atau pelakunya |
| Daftar A | Desa dengan sedikitnya 1 titik panas VIIRS nominal atau tinggi dalam 7 x 24 jam dari `acuan` |
| Daftar B | Desa tanpa titik panas 7 hari yang punya `tahun terbakar ≥ 3` dari 2012 sampai 2025 |
| Titik panas | Deteksi satelit satu piksel; istilah layar (bukan "titik api") |
| Titik unik | Satu petak 375 m per hari WIB, bukan satu baris deteksi |
| Petak | Sel 0,0034 derajat (≈ 375 m) milik `riwayat_petak.py`; kunci `(ix, iy)` |
| Tahun terbakar | Jumlah tahun terbanyak di satu petak mana pun di desa (batas bawah; geser geolokasi antartahun membuat "petak sama" ketat) |
| Tahun terakhir terbakar | Tahun terbaru di bitmask petak dengan tahun terbanyak atau petak mana pun milik desa, sesuai B1 |
| `acuan` | Waktu referensi `hotspot.json`; `jam` tiap titik relatif terhadapnya |
| Kelas keyakinan | 0 rendah, 1 nominal, 2 tinggi (`firms_sumber.kelas_yakin`); daftar memakai ≥ 1 |
| VIIRS | Sensor titik panas 375 m: S-NPP (`N`, berhenti 1 Nov 2026), NOAA-20 (`N20`), NOAA-21 (`N21`) |
| Porsi gambut | Perkiraan pecahan titik uji di dalam desa yang jatuh pada poligon gambut BBSDLP (bukan luas gambut resmi) |
| Peluang kab/kota | `API.p` dari `prediksi.json`: peluang ada titik panas di kab/kota itu pada hari tenggang 1, 2, 3; sama untuk semua desa di kab itu |
| Hindcast | Uji mundur: pada musim 2023, persen desa-minggu tiap kelompok yang punya titik minggu berikutnya |
| Desa-minggu | Satu desa pada satu minggu musim kering; satuan penyebut hindcast |
| Laju | Persen desa-minggu satu kelompok yang punya titik minggu berikutnya |
| Selang Wilson | Selang kepercayaan 95% untuk proporsi; terlalu sempit karena desa-minggu beruntun berkorelasi |
| Semua lainnya | Desa-minggu tanpa titik minggu itu yang bukan daftar B |
| Tak pernah terbakar | Desa tanpa petak ber-riwayat 2012 sampai 2022 |
| Hipotesis | Pil yang tampil sampai laju atau peluang punya vonis lulus |
| Perkiraan | Pil untuk porsi gambut (poligon kasar) |
| `terpotong` | Jumlah baris yang tidak masuk berkas karena batas ukuran, dicatat bukan dibuang diam-diam |
| `tanpa_desa` | Titik panas yang tidak jatuh di poligon desa mana pun (laut, atau di luar batas yang disederhanakan) |
| `kd` | Kode desa Kemendagri `PP.KK.CC.DDDD`; 4 digit pertama tanpa titik = kode kab di `prediksi.json` |
| Desa sasaran (`preventif.json`) | Hitungan lain milik `preventif.py`: titik desa OSM dalam 3 km dari petak 1 km yang terbakar ≥ 3 tahun berbeda (MODIS sejak 2002), per kecamatan. Bukan daftar B; tidak dijumlah atau disamakan |
| `lulus_sementara` | Vonis hindcast terhadap ambang bawaan sementara (Q2); tetap berpil hipotesis |
| KHG | Kesatuan Hidrologis Gambut; dipakai `khg_prioritas.py`, bukan di paket ini |
| Pembanding | pantaukarhutla.com dan repositori MIT-nya |
