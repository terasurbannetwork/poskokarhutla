# KEPUTUSAN-LONGSOR-SATELIT: Pemetaan bekas longsor dari citra satelit sebelum dan sesudah kejadian

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Sesudah hujan ekstrem (contoh: Siklon Senyar, 25 Nov 2025, Sumatera Utara dan Aceh), longsor terjadi ratusan sampai ribuan titik sekaligus di lereng berhutan. Citra sebelum (7/6/2024) dan sesudah (26/1/2026) Tapanuli Tengah yang beredar di media sosial memperlihatkan bekas longsor yang rapat di hampir seluruh lereng. Repo ini belum punya alat untuk memetakannya:

- Modul longsor (`scripts/longsor/**`) hanya nowcast peluang longsor dari hujan dan kerentanan (resep LHASA), tidak memetakan longsor yang sudah terjadi.
- Paket kerusakan satelit (`data/kajian-bnpb/kerusakan-satelit/`) menghitung bangunan terdampak untuk Jitupasna; longsor tidak tercakup.
- Label kejadian longsor yang ada (`public/longsor/data/kejadian.json`: DIBI per kab, NASA GLC titik yang berhenti diperbarui, tanggapan PVMBG 2020 sampai Mei 2023) tidak memberi luas atau sebaran.

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 24 Nov 2026: pemilik meminta seluruh analisis dari unggahan media sosial (longsor Tapanuli Tengah, jalur air Bekasi, genangan radar Aceh Tamiang) dikerjakan ("Gas semuanya"), lalu memilih paket ini dikerjakan di sesi yang sama. |
| K2 | 24 Nov 2026: paket berdiri sendiri di `data/kajian-bnpb/longsor-satelit/`, bukan perluasan paket kerusakan satelit (jawaban pemilik atas pertanyaan lokasi paket). |
| K3 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Keluaran adalah bekas longsor (poligon dan luas per kecamatan), bukan peluang longsor. Tidak menggantikan atau mengubah nowcast `scripts/longsor/model.py` dan pra-registrasi LHASA2. | Dua pertanyaan berbeda: "di mana sudah longsor" lawan "di mana akan longsor". Pra-registrasi LHASA2 tidak boleh disentuh. |
| D2 | Validasi dulu. Kriteria lulus dikunci di berkas kriteria bersidik sebelum satu piksel dari kejadian uji dihitung (pola `scripts/siklus/kerusakan_kriteria.json`). | Pelajaran Cianjur dan kerusakan satelit v1: tanpa kunci, angka tampak meyakinkan padahal kalah dari plasebo. |
| D3 | Sebelum vonis lulus, tidak ada luas atau jumlah bekas longsor yang tampil di layar mana pun, publik maupun staf. Yang tampil: status uji ("menunggu uji", "gagal uji", "lulus uji") dan alasannya. | Aturan "menunggu, bukan nol" dan D2 paket kerusakan satelit. |
| D4 | Isyarat utama: penurunan NDVI relatif (rdNDVI) dari komposit Sentinel-2 L2A sebelum dan sesudah, di lereng yang sebelumnya bervegetasi. Isyarat pelengkap untuk daerah berawan: perubahan hamburan balik Sentinel-1 RTC (peta kerapatan, bukan poligon). | Metode terbuka yang sudah dipakai luas (HazMapper, kerapatan longsor radar), data gratis tanpa kunci, mesin pembacanya sudah ada di repo. |
| D5 | Pengecoh wajib disaring dan dilaporkan terpisah: tebangan hutan (Hansen loss tahun-tahun sebelum kejadian dan peringatan tebangan bertanggal; Hansen tahun kejadian tidak dipakai karena tidak membedakan sebelum dan sesudah tanggal kejadian), lahan pertanian dan kebun panen, alur sungai dan endapan banjir, awan dan bayangan awan. | Tapanuli Tengah memiliki tebangan dan longsor di lanskap yang sama; menyamakannya adalah klaim yang salah dan sensitif. |
| D6 | Pakai ulang mesin yang ada: pembaca Sentinel-2 Earth Search (`scripts/data/citra.py`, `scripts/banjir/citra_banjir.py`), Sentinel-1 Planetary Computer (`scripts/banjir/citra_banjir.py`, `scripts/banjir/s1_genangan.py`), kab dari `public/data/bnpb/wilayah.json`, batas kecamatan dari `public/geo/kecamatan/`, label `scripts/longsor/kejadian.py`. Pencarian STAC dan token dipakai ulang; komposit median, masker SCL, dan lereng adalah kode baru di `scripts/longsor/`. | Satu mesin per sumber. |
| D7 | Pipeline tinggal di `scripts/longsor/` (pengerja `longsor`). Tidak ada folder `public/` atau `scripts/` baru. | Folder sudah ada dan berpemilik. |
| D8 | Keluaran tidak pernah menyebut korban, rumah rusak, atau penyebab ("akibat tebangan"). Atribusi penyebab di luar lingkup. | Satelit 10 m tidak melihat penyebab; klaim penyebab bersifat hukum dan politik. |
| D9 | Bekas longsor hasil satelit tidak pernah membuat kejadian di Buku Besar Kejadian dan tidak masuk Jitupasna. | Aturan Siklus: kejadian resmi hanya dari laporan resmi; satu buku kejadian. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Kebenaran uji: dari mana poligon longsor yang sah? | **[BAWAAN SEMENTARA]** digitasi lembar buta oleh dua penafsir terpisah (staf atau mahasiswa mitra, pola lembar buta `/kemitraan`) pada titik sampel acak berlapis, melihat citra resolusi lebih tinggi yang boleh ditafsirkan, tanpa melihat keluaran model. Inventaris resmi PVMBG atau inventaris riset yang terbit untuk kejadian Nov 2025 dipakai bila ada, sesudah dicek lisensinya. | LS-02 |
| Q2 | Citra resolusi tinggi untuk penafsir (Esri World Imagery Wayback, Google Earth, Planet NICFI)? | **[BAWAAN SEMENTARA]** hanya ditafsirkan di layar, tidak diunduh atau diturunkan ke data; pemilik memastikan ketentuan penggunaannya sebelum LS-02. Planet NICFI tidak dipakai (program tropis itu sudah berubah syaratnya, perlu dicek ulang). | LS-02 |
| Q3 | Kejadian kalibrasi dan uji? | **[BAWAAN SEMENTARA]** uji: Tapanuli Tengah dan kab tetangga pada kejadian 25 Nov 2025; kalibrasi: kejadian longsor luas lain dengan citra bersih, dipilih mekanis dari DIBI (banyak kejadian longsor satu kab dalam 7 hari) sebelum citra dilihat. Q terbuka bila kejadian kalibrasi tidak cukup. Catatan jujur: kejadian uji ditetapkan sesudah penulis paket melihat satu citra unggahan sebelum-sesudah; ambang tidak disetel dari citra itu, dan kebenaran uji dari lembar buta, bukan dari unggahan. | LS-01 |
| Q4 | Ambang lulus? | **[BAWAAN SEMENTARA, HIPOTESIS]** angka di ALGORITMA 4, dikunci pemilik atau `validasi-model` sebelum kejadian uji dihitung. | LS-01 |
| Q5 | Sesudah lulus, tampil di mana? | **[BAWAAN SEMENTARA]** lapisan staf di `/siklus` (Kaji Cepat) dan agregat per kecamatan; publik tidak sebelum pemilik memutuskan. | LS-07 |
| Q6 | Poligon bekas longsor boleh di `public/`? | **[BAWAAN SEMENTARA]** tidak sebelum Q5 dijawab; disimpan di R2 `longsor/bekas/` di balik sesi staf. Poligon tidak memuat data orang, jadi alasannya kehati-hatian klaim, bukan privasi. | LS-06 |
| Q7 | Tebangan di dalam bekas longsor dilaporkan? | **[BAWAAN SEMENTARA]** dilaporkan sebagai irisan luas berlabel "tumpang tindih dengan hilang tutupan tahun yang sama", tanpa kalimat sebab akibat (D8). | LS-04 |
| Q8 | Dijalankan otomatis tiap kejadian longsor besar? | **[BAWAAN SEMENTARA]** tidak; manual per kejadian sampai vonis lulus. | LS-08 |
