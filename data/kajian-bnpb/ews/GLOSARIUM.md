# GLOSARIUM: Panel EWS

| Istilah | Arti di paket ini |
| --- | --- |
| EWS | sistem peringatan dini (early warning system). Di paket ini: panel pemantauan alat di `/banjir` dan `/gunungapi`. Berbeda dengan langganan peringatan email `src/ews.js` yang sudah ada. |
| Pos | satu titik pemantauan dengan satu atau beberapa nilai (mis. tinggi air dan hujan di satu tiang). |
| Alat | perangkat sensor milik sendiri yang terdaftar di tabel `sensor_alat`. |
| Sumber | asal data pos: `sensor` (milik sendiri), `sihka` (Kementerian PU), `pvmbg` (MAGMA Badan Geologi), atau sumber berizin lain. |
| TMA | tinggi muka air, dalam cm atau m; "mdpl" bila diukur dari permukaan laut. |
| Lidar | sensor jarak cahaya yang dipakai mengukur tinggi muka air dari atas sungai (dipakai di Gunung Ibu). Di tabel kita masuk jenis `tma`. |
| Geofon | sensor getaran tanah; nilai kecepatan getaran mm/s dan frekuensi Hz. Dipakai memantau lahar dan aktivitas gunung. |
| Ambang | batas nilai Waspada, Siaga, Awas yang tercatat dari pemilik alat atau pengelola resmi. |
| Basi | bacaan terakhir lebih tua dari batas jenisnya; tampil "Tidak ada data terkini". |
| HLS | format aliran video (`.m3u8`) yang dipakai CCTV dasbor rujukan. |
| Directus | sistem pengelola data yang dipakai backend dasbor vendor (`/panel/items/*`). |
| HMAC | tanda tangan pesan berkunci; dipakai alat untuk membuktikan bacaan asli. |
