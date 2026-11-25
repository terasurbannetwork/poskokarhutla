# KEAMANAN-PRIVASI: Panel EWS

| Risiko | Kendali |
| --- | --- |
| Bacaan palsu dari alat tiruan | sudah ada: HMAC per alat diturunkan dari secret `SENSOR_KUNCI_INDUK`, kunci tidak disimpan di D1 (`src/sensor.js`). Tidak diubah. |
| Bacaan belum diverifikasi memicu kepanikan publik | ambang terlewati hanya ke antrean `pengingat` staf; panel tidak memicu peringatan publik (D6). Q2 dijawab 25 Nov 2026: bacaan sensor sendiri boleh tampil publik lewat `GET /api/alat/pos` dan `/api/alat/seri` (`src/alat.js`). |
| Mengambil data atau aliran CCTV pihak lain tanpa izin | tidak dilakukan; tiap sumber dan kamera wajib mencatat dasar izinnya (Q1, DESAIN-TEKNIS bagian CCTV). |
| Alamat aliran CCTV berisi token sesi | daftar kamera di R2 di balik rute staf, tidak di `public/` dan tidak di repo. |
| Wajah atau pelat kendaraan di CCTV | CCTV hanya diputar langsung, tidak direkam atau disimpan oleh sistem ini. |
| Lokasi alat diincar pencuri (alat pernah hilang di lapangan) | publik: koordinat alat sendiri dibulatkan 0,01 derajat dan `desa` tidak keluar; koordinat penuh dan desa hanya untuk sesi staf pusdalops, koordalops, pimpinan (cookie `sesi_staf`, bukan token admin), tanpa cache. |
| Id alat sendiri terlihat publik | id alat (mis. `sensor:TMA-AGAM-01`) memang tampil di jawaban publik. Itu bukan kunci: kiriman bacaan wajib HMAC per alat yang diturunkan dari secret `SENSOR_KUNCI_INDUK` (`src/sensor.js`), jadi mengetahui id tidak cukup untuk memalsukan bacaan. `kunci_hash`, `rssi`, dan kunci tidak pernah keluar. |
| Kueri acak menembus cache tepi | kunci cache dibangun dari parameter yang sudah divalidasi (`bencana`, atau `pos`, `jam`, `kunci`); tiap cache miss dihitung batas laju per hash IP (600 per jam per rute). |
| Kuota baca D1 habis (pernah menjatuhkan situs 28 Okt 2026) | satu kueri pos terakhir per muat, seri hanya saat pos dipilih, cache tepi 60 detik. |
| Secret masuk repo | tidak ada secret baru; kunci sumber berizin (bila ada) disimpan sebagai secret Worker. |
