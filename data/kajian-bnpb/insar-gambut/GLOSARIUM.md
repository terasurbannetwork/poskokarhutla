# GLOSARIUM: Kedalaman gambut hilang dari InSAR

| Istilah | Arti di modul ini |
| ------- | ----------------- |
| InSAR | Pengukuran perubahan tinggi permukaan dari selisih fase radar antar dua waktu |
| LiCSAR | Layanan interferogram Sentinel-1 milik COMET; produk laju untuk Indonesia belum ada |
| LiCSBAS | Perangkat lunak yang menghitung deret waktu dan laju LOS dari interferogram LiCSAR; dijalankan di luar repo |
| LOS | Garis pandang satelit ke piksel; laju LOS bukan laju vertikal |
| Vertikal | Laju naik-turun hasil dekomposisi dua geometri (`subsiden.vertikal`); negatif = turun |
| C-band | Radar Sentinel-1, panjang gelombang 5,6 cm |
| L-band | Radar ALOS-2 (PALSAR-2), panjang gelombang jauh lebih besar; kandidat, belum dikerjakan |
| Salah bungkus fase (phase aliasing) | Penurunan antar piksel atau antar pasangan lebih besar dari setengah panjang gelombang sehingga fase salah dibaca |
| Dekorelasi | Hilangnya kemiripan fase antar dua waktu (lahan terbakar, vegetasi berubah) |
| Koherensi | Ukuran kemiripan fase 0 sampai 1; piksel koheren rendah tidak dapat dipercaya |
| `Δh_tambahan` | Penurunan area terbakar dikurangi penurunan kontrol (cm) |
| Kontrol | Piksel gambut tidak terbakar di cincin 2 sampai 20 km dari topeng terbakar |
| `D_insar` | `ALPHA × (-Δh_tambahan)` dalam cm; kedalaman gambut hilang menurut InSAR, hipotesis |
| `D_lit` | Kedalaman bakar literatur 15, 33, 51 cm (`D_BAWAH`, rata-rata Ballhorn, `D_ATAS`) |
| `α` (`ALPHA`) | Rasio penurunan permukaan ke gambut hilang; bawaan 1,0 |
| Oksidasi pasca-api | Penurunan gambut sesudah api padam oleh pemadatan dan pengeringan; bukan kedalaman terbakar |
| `selaras`, `meremehkan`, `tak_terukur` | Tiga vonis lab (RENCANA-UJI §2) |
| Hipotesis | Pil untuk angka InSAR sampai lulus |
| `tak_terukur` / `null` | Tidak terukur; bukan nol |
