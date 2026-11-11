# RENCANA-UJI: Pantauan Operasi Udara

Standar pemilik `~/.claude/TEST.md`: perilaku di luar TypeScript (D1, rute, R2, migrasi, rumus) wajib punya uji yang benar-benar
menjalankannya, bukan mock yang meloloskan bug. Tiap tiket selesai bila semua kriteria terimanya hijau dan pemilik sudah meninjau di
`http://localhost:8800/operasi` (K3).

## 1. Kriteria terima per tiket

| Tiket | Kriteria terima | Perintah bukti |
| ----- | --------------- | -------------- |
| UD-01 | Mesin bisa unggah PDF sah; tanpa Bearer = 403; bukan `%PDF-` = 400; base tak dikenal = 400; > 15 MB = 413; tamu GET = 403; staf GET = PDF dengan `attachment` dan `private, no-store`; daftar menampilkan berkas yang diunggah | `node --test tests/warga/operasi_udara.test.mjs` |
| UD-01 | Bot mengunggah tiap PDF per base dan gabungan tepat sekali; gagal tidak menahan laporan lain | `node --test tests/wa/renlap_jam.test.mjs` (diperluas, berkas sudah ada) |
| UD-00 | `npm run uji:operasi` menjalankan `tests/operasi/*.test.mjs` dan ikut `npm run uji` | `npm run uji:operasi` |
| UD-02 | Pesan WA yang lebih awal tetapi diproses belakangan menurunkan `pertama`; pesan lebih lambat tidak mengubahnya; pemutaran ulang `isi_ulang_wa.mjs` tetap benar; `diubah` tetap ikut pesan terakhir | `node --test tests/warga/operasi_wa.test.mjs tests/warga/operasi_isi_ulang.test.mjs` (Miniflare) |
| UD-02 | Layar menandai telat sesuai tabel zona (BDJ WITA); rute `peta` tetap jalan bila tabel `op_lapor_pertama` belum ada | `tests/operasi/lapor.test.mjs` + `tests/warga/operasi_udara.test.mjs` |
| UD-02 | Migrasi 0125 dijalankan Miniflare bersama migrasi lain; `migrasi_beku` tetap hijau | `node --test tests/warga/migrasi_beku.test.mjs` |
| UD-03 | 7 hari dengan 3 tidak siap = berulang; hari tanpa laporan tidak dihitung; rute `status7` satu kueri | `tests/warga/operasi_udara.test.mjs` (rute, Miniflare) + `tests/operasi/status7.test.mjs` (penanda) |
| UD-04 | Tiap target belum didatangi mendapat tepat satu alasan sesuai urutan ALGORITMA §9 | `tests/operasi/kepatuhan.test.mjs` |
| UD-05a | `pertama_utc` cluster bertahan antarputaran dan tidak bergeser bila titik lama hilang | uji pipeline Python di `scripts/data` (pola uji yang ada) |
| UD-05b | Cluster prioritas tanpa base berarmada siap dalam radius = celah; respons dari aksi ≤ 2 km pertama dalam 72 jam; cluster tanpa `pertama_utc` tidak diberi angka | `tests/operasi/respons.test.mjs` |
| UD-06 | Aksi padam dengan titik FIRMS 1 km di jam ke-30 = muncul lagi; titik di jam ke-80 tidak dihitung; titik 1,5 km tidak dihitung; muncul lagi lengket; aksi yang belum diperiksa sampai jam ke-72 tidak masuk padam bertahan | `node --test tests/warga/operasi_monitor.test.mjs` |
| UD-07 | Terbit/terbenam Jakarta 21 Juni dan 21 Des dalam ±2 menit dari tabel NOAA | `tests/operasi/surya.test.mjs` |
| UD-08 | Aksi tanpa kab tetap terhitung di "kab belum diketahui", tidak hilang | `tests/warga/operasi_monitor.test.mjs` (kab dari Worker) |
| UD-09 | Prakiraan dari Open-Meteo tersimpan 12 jam × 9 base; gagal jaringan tidak menimpa berkas lama | `python3 scripts/operasi/prakiraan_base.py uji` |
| UD-10 | Posisi 3 jam lalu dengan status operasi = sinyal hilang; status siap tidak pernah sinyal hilang | `tests/warga/operasi_udara.test.mjs` (rute jejak, Miniflare) |
| UD-11 | Hari menganggur = hari siap − hari siap yang terbang, tidak negatif | `tests/operasi/menganggur.test.mjs` |
| UD-12..UD-17 | Tidak dikerjakan sebelum Q terkait dijawab; kriteria terima ditulis saat Q dijawab | – |

## 2. Gerbang yang ikut jalan

- `npm run uji:agen`: kartu renggang, tipografi (tanpa px literal baru), paket modul, tinjau lokal.
- `npm run uji:warga`: rute Worker dan D1.
- Uji baru: `tests/agen/gerbang-biaya-tidak-publik.test.mjs`: tidak ada kunci `harga`, `tarif`, `biaya` di `public/data/operasi/**` (KEAMANAN §3).

## 3. Tinjauan manusia

1. Pemilik membuka `http://localhost:8800/operasi` sesudah tiap tiket layar, di desktop dan ponsel.
2. Layar: tanpa huruf kapital semua, tanpa latar abu, tabel tanpa geser di 1440, klik tidak membekukan.
3. Pengulas: `guard-api` + `security-reviewer` untuk UD-01; `migrasi-idempoten` untuk 0125; `selera-angka` + `inp-reviewer` untuk layar.
