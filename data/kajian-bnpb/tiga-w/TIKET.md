# TIKET: 3W dan tawaran

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| TW-01 | `public/inti/klaster.js` konstanta delapan klaster; `public/fungsi_direktori.js` memakainya | inti-layar | uji kecil | - |
| TW-02 | Migrasi `org`, `tw_baris`, `tw_token`, `tw_tawaran`, `tw_tawaran_riwayat`, indeks ekspresi barang meja logistik + sidik + cakupan | warga-api (+ migrasi-idempoten) | T10, T11 | - |
| TW-03 | Bagian TigaW di `src/hak.js` | warga-api | T2, T3, T4 | TW-02 |
| TW-04 | Rute register organisasi dan 3W staf; gabung `RUTE_TIGAW` ke `RUTE_SIKLUS` di `src/siklus.js`; izin BP dan pimpinan | warga-api (+ guard-api) | T1, T2, T9, T13 | TW-03 |
| TW-05 | Token organisasi + rute `/api/bantu` + pendaftaran di `src/worker.js` (HTML_RUTE, PUBLIK_TANPA_SESI, RUTE) dan cek `public/_headers` | warga-api (+ security-reviewer) | T5, T13 | TW-04, Q6 |
| TW-06 | Rute tawaran + pencocokan | warga-api | T6, T8 | TW-04, Q2 |
| TW-07 | Keputusan tawaran + riwayat, alasan internal dan untuk organisasi | warga-api | T7, T12 | TW-06, Q1, Q7 |
| TW-08 | Kartu Siapa di mana dan Tawaran di `/siklus` | siklus (+ inp-reviewer, selera-angka) | tinjau lokal | TW-04, TW-07, Q3 |
| TW-09 | Halaman organisasi `/bantu` | layar-peta (+ inp-reviewer) | tinjau lokal | TW-05 |
| TW-10 | Pemilik menerapkan migrasi di D1 produksi | pemilik | `wrangler d1 migrations apply` | TW-02 |
