# KEAMANAN-PRIVASI: Penurunan tanah

| Data | Aturan |
| --- | --- |
| Keluaran `subsiden.json`, `proyeksi_tanah.json` | Data geofisika agregat per kecamatan, tidak mengandung data orang. Tayang publik (Q7), berlabel hipotesis. |
| Atribusi | Setiap berkas dan layar membawa atribusi Sentinel-1, COMET LiCSAR, dan LiCSBAS seperti `ATRIBUSI` di `subsiden.py:27`. Lisensi diperiksa ulang saat tiket pertama (Copernicus bebas dengan atribusi; DeltaDTM CC BY 4.0). |
| Kode eksternal | LiCSBAS adalah klon pihak ketiga yang dipasang di `~/licsbas`, di luar repo. Dijalankan hanya bila pemilik menjawab Q1; agent tidak menjalankan atau menyunting kode itu tanpa aturan izin pemilik. Versi dan hash komit klon dicatat di `RISET-SUBSIDEN.md`. |
| Akun dan kredensial | Agent tidak membuat akun. Token Earthdata atau kredensial layanan lain tidak pernah masuk berkas yang dilacak git; bila Q2 dijawab ya, pemilik menyimpannya di Keychain. |
| Raster mentah dan interferogram | Tinggal di luar repo, dihapus sesudah ML terbentuk; yang masuk repo hanya agregat kecamatan. |
| DeltaDTM (17,3 GB) | Hanya di luar repo; yang masuk repo hanya statistik per kecamatan. |
| Klaim | Layar tidak memakai kata aman, pasti, atau tahun tenggelam; tidak ada klaim sebab-akibat tentang air tanah di tingkat kecamatan. |
| Angka beresiko salah tafsir | Penurunan di acuan tidak terukur, laju bisa berubah; keduanya ditulis di kartu. |

Pemeriksa: `validasi-model` untuk dekomposisi, gerbang, dan proyeksi; `selera-angka` untuk tampilan angka; `security-reviewer` bila ada jalur unduh baru di skrip.
