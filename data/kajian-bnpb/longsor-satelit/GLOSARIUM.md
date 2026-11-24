# GLOSARIUM: Pemetaan bekas longsor dari satelit

| Istilah | Arti di paket ini |
| --- | --- |
| Bekas longsor | Bidang di lereng yang kehilangan vegetasi sesudah kejadian dan lolos saringan pengecoh; keluaran model berlabel `estimasi-model`, bukan inventaris resmi. |
| rdNDVI | Penurunan NDVI relatif: (NDVI sesudah - NDVI sebelum) / NDVI sebelum. Negatif besar = vegetasi hilang. |
| NDVI | Indeks vegetasi dari pita merah (B04) dan inframerah dekat (B08) Sentinel-2. |
| MNDWI | Indeks air dari pita hijau dan SWIR; dipakai menyaring air dan endapan basah. |
| Komposit | Nilai median piksel bersih dari banyak adegan dalam satu jendela waktu. |
| SCL | Lapis klasifikasi adegan Sentinel-2 L2A; dipakai untuk membuang awan dan bayangannya. |
| Hamburan balik | Kekuatan pantulan radar Sentinel-1 (VV, VH); berubah saat permukaan lereng berubah. |
| Tumpang tindih tebangan | Bagian kandidat yang juga hilang tutupan menurut Hansen tahun-tahun sebelum kejadian atau peringatan tebangan bertanggal sebelum kejadian; dilaporkan terpisah tanpa klaim sebab. Tebangan sesudah peringatan terakhir dan sebelum kejadian tidak tersaring. |
| Lembar buta | Penafsir mendigitasi titik sampel tanpa melihat keluaran model. |
| Kappa | Ukuran kesepakatan dua penafsir di luar kebetulan. |
| Plasebo | Menjalankan metode yang sama pada dua komposit yang sama-sama sebelum kejadian; hasilnya mengukur alarm palsu. |
| Tidak terliput | Piksel atau kecamatan tanpa cukup pengamatan bersih; tampil "tidak terliput", tidak pernah 0. |
| Vonis | Lulus, gagal, atau menunggu uji, dihitung dari kriteria terkunci. |
