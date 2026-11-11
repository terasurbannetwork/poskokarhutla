# GLOSARIUM: Cek Kabar Luar

| Istilah | Arti di modul ini |
| --- | --- |
| Kejadian belum selesai | baris `dalops/<jenis>.json` dengan `surut: false`: belum ada laporan resmi bahwa banjir surut, longsor tertangani, api padam, penanganan selesai, atau kekeringan berakhir |
| Laporan resmi | logbook Pusdalops dan rekap WA Koordalops. Satu-satunya yang boleh menutup kejadian |
| Kabar luar | apa pun di luar laporan resmi: berita yang sudah dipanen situs, atau data alam yang sudah ada di repo |
| Bukti masih | artikel cocok kab/kota yang menyebut kejadian, korban, atau penanganan, dan bukan kabar pulih |
| Bukti pulih | artikel cocok kab/kota yang tegas menyebut surut, padam, kembali normal, warga kembali, atau status darurat berakhir |
| Sinyal alam | angka model atau pengamatan per kab: level prakiraan banjir dan longsor, titik panas, SPI kekeringan |
| Alam normal | sinyal alam jenis itu berada di ambang normal (ALGORITMA 3) |
| Senyap | jumlah hari sejak laporan resmi terakhir atau bukti luar terakhir, mana yang lebih baru |
| Ambang senyap | `AMBANG[jenis]`, hari senyap minimal untuk "Kemungkinan selesai" berdasar alam (Q1) |
| Masih berlangsung | label: ada bukti masih sesudah laporan resmi terakhir |
| Kemungkinan selesai | label: ada bukti pulih, atau senyap melewati ambang dan alam normal. Bukan status selesai |
| Belum ada kabar luar | label: tidak ada bukti luar yang cukup untuk dua label lain |
| Deteksi Centurisk97 | penanda bahwa label adalah turunan kita, bukan pernyataan resmi |
| Arsip beku | `cek_arsip.jsonl`, label harian yang tidak diubah sesudah ditulis, dasar rapor ketepatan |
