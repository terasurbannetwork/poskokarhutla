# KEAMANAN-PRIVASI: Panel EWS

| Risiko | Kendali |
| --- | --- |
| Bacaan palsu dari alat tiruan | sudah ada: HMAC per alat diturunkan dari secret `SENSOR_KUNCI_INDUK`, kunci tidak disimpan di D1 (`src/sensor.js`). Tidak diubah. |
| Bacaan belum diverifikasi memicu kepanikan publik | ambang terlewati hanya ke antrean `pengingat` staf; panel tidak memicu peringatan publik (D6); sensor sendiri hanya untuk staf sampai Q2 dijawab. |
| Mengambil data atau aliran CCTV pihak lain tanpa izin | tidak dilakukan; tiap sumber dan kamera wajib mencatat dasar izinnya (Q1, DESAIN-TEKNIS bagian CCTV). |
| Alamat aliran CCTV berisi token sesi | daftar kamera di R2 di balik rute staf, tidak di `public/` dan tidak di repo. |
| Wajah atau pelat kendaraan di CCTV | CCTV hanya diputar langsung, tidak direkam atau disimpan oleh sistem ini. |
| Lokasi alat diincar pencuri (alat pernah hilang di lapangan) | koordinat alat sendiri hanya untuk staf; bila Q2 membuka publik, koordinat dibulatkan 0,01 derajat. |
| Kuota baca D1 habis (pernah menjatuhkan situs 28 Okt 2026) | satu kueri pos terakhir per muat, seri hanya saat pos dipilih, cache tepi 60 detik. |
| Secret masuk repo | tidak ada secret baru; kunci sumber berizin (bila ada) disimpan sebagai secret Worker. |
