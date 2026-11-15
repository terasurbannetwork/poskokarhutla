# GLOSARIUM: Keterpaduan

| Istilah | Arti |
| --- | --- |
| Buku Besar Kejadian | Tabel `sk_kejadian`, satu-satunya daftar kejadian di repo; nomornya `KJ-YYYY-XXXXXXXX`. |
| Sumber | Asal satu baris yang ditautkan ke kejadian, misal `dibi`, `usgs`, `tugas_api`. Disimpan di `sk_kejadian_sumber`. |
| Tautan | Baris `sk_kejadian_sumber` berstatus terpasang yang menghubungkan satu baris modul ke satu kejadian. |
| Ambigu | Baris modul yang cocok ke lebih dari satu kejadian; menunggu pilihan staf. |
| GLIDE | Nomor kejadian global dari ADRC, bentuk jenis-tahun-urut-negara, misal `EQ-2018-000155-IDN`. |
| IRWIN | Hub data kebakaran hutan AS yang memberi satu ID per insiden; rujukan rancangan tautan. |
| Saluran | Bagian antrean luring milik satu modul di basis data `pb-antre`. |
| Butir | Satu isian yang menunggu dikirim dari ponsel. |
| `klien_id` | Kunci acak buatan ponsel per butir; server menolak butir dengan kunci yang sudah diterima. |
| Spek | Definisi formulir: daftar medan dan aturan; dipakai Worker dan peramban. |
| Medan | Satu isian dalam formulir (nama, label, tipe, batas). |
| Titik pengungsian | Satu tempat pengungsian dengan kode tetap `TP-`. |
| Putaran | Kaji ulang satu titik pengungsian pada satu tanggal; nomornya `pendataan_ke`. |
| DTM | Displacement Tracking Matrix milik IOM; rujukan kaji per putaran. |
| Register orang | Tabel `orang`; satu baris per orang nyata. |
| `orang_akun` | Tabel samping penunjuk dari akun ke register orang. |
| Bentrok | Akun yang cocok ke dua orang berbeda lewat NIP dan WA; ditinjau admin. |
