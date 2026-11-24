# RENCANA-UJI: Panel EWS

Aturan pemilik: perilaku di luar TypeScript diuji dengan menjalankannya, bukan dengan mock (`~/.claude/TEST.md`).

| No | Kriteria terima | Bukti |
| --- | --- | --- |
| U1 | `tingkat()` memakai `tingkatAmbang` yang sama dengan `src/sensor.js`; pos basi selalu `tanpa_data`; pos tanpa ambang `null` | `node --test tests/warga/alat_tingkat.test.mjs` (murni, kasus tepi: nilai null, nilai tepat di ambang, umur tepat di batas) |
| U2 | Pos basi tidak pernah menampilkan 0 dan tidak berwarna tingkat | uji DOM `tests/warga/alat_kartu.test.mjs` dengan pos basi bernilai terakhir 0 dan bernilai null |
| U3 | `GET /api/alat/pos` dengan D1 lokal sungguhan (migrasi 0089 + migrasi geofon) mengembalikan bentuk D2, staf melihat sensor sendiri, tanpa sesi tidak | `tests/warga/alat_rute.test.mjs` memakai pola uji rute `tests/warga` (Miniflare/D1 lokal) |
| U4 | Migrasi geofon idempoten: dijalankan dua kali tanpa galat, baris alat lama utuh | `tests/warga/alat_migrasi.test.mjs`; diperiksa `migrasi-idempoten` |
| U5 | Sumber gagal dimuat tampil sebagai "sumber X gagal dimuat", ringkasan tidak menulis 0 pos | uji rute dengan adapter yang melempar galat |
| U6 | Panel tidak dirender bila tidak ada sumber aktif | uji DOM |
| U7 | Memilih pos dan membuka tab CCTV tidak membekukan layar | `inp-reviewer` + playwright di `http://localhost:8800/banjir` |
| U8 | Kunci `kemampuan.alat` sah di registri, `kemampuan.ews` lama tidak berubah | `python3 scripts/umum/bencana.py uji` |
| U9 | Kamera tanpa catatan izin ditolak | uji murni pemuat `cctv.json` |
| U10 | Tidak ada literal warna baru | `node --test tests/agen/gerbang-token-warna.test.mjs` |
| U11 | Tidak ada kata "aman" di teks panel | uji teks atas `pantau_alat.js` |
| U12 | Grafik putus pada celah lebih dari 2x interval | uji murni pembentuk seri |
