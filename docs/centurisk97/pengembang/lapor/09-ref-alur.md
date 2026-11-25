# Referensi: cron, keluaran, uji

Halaman ini mendaftar jadwal cron, berkas yang dibaca dari public/data, dan perintah uji modul Lapor Bencana.

## Cron dan workflow

- Worker memakai satu pemicu `* * * * *` (`wrangler.jsonc`); langkah ditentukan dari waktu terjadwal di `src/worker.js`.
- Menit 17 tiap jam: `bersihkanLapor` (`src/lapor_ai.js:698`) membuang dari `lj_kabar` pembuka dan tim yang belum terkirim lebih dari 1 hari, kabar lain yang belum terkirim lebih dari 7 hari, dan kabar yang sudah terkirim lebih dari 30 hari (`src/hak.js:1896-1897`, `src/lapor_ai.js:699`); juga draf WhatsApp tahap 2 lebih dari 24 jam dan unggahan video menggantung lebih dari 24 jam. `bersihPeringatanLapor` (`pwBersih`, `src/hak.js:1818-1821`) menghapus peristiwa `pw_peristiwa` lebih dari 30 hari, baris `pw_status` dengan tanggal lebih dari 30 hari, dan langganan `pw_langganan` yang tidak aktif lebih dari 180 hari.
- Menit 29 tiap jam: `peringatanTiapMenit` (`src/worker.js:1032`), maksimal 40 notifikasi per putaran. Dokumen paket menyebut tiap menit, tetapi kode menjalankannya sekali per jam demi anggaran cron akun Free.
- Pukul 09.00 UTC menit 0 dan 30: `tanyaHarian` (`src/worker.js:1022`).
- Bot WhatsApp di Mac mini (di luar Worker) menarik `GET /api/lapor/kabar` dan `GET /api/lapor/pdf/antre`. Tidak ada workflow GitHub Actions khusus modul ini; berkas `public/lapor/tr/*.json` dibuat manual.
- Variabel lingkungan yang berpengaruh: kunci model dan alamat router model, model pilihan, `LAPOR_HARI_INI`, `PW_UJI`, pasangan kunci VAPID khusus warga dan subjeknya, kunci mesin WhatsApp, dan rahasia sesi. Nilainya tidak ada di repo.

## Berkas keluaran di public/data

Modul ini tidak menulis berkas ke `public/data`. Ia membaca `public/data/desa_cari.json`, `public/data/bpbd_kontak.json`, `public/geo/provinsi.json`, `public/geo/desa/<kab>.json`, `public/data/osm_nasional/<prov>.json` dan `.../ibadah/<prov>.json`, serta `public/prediksi/data/prediksi.json`. Laporan warga, nomor WA, dan data pribadi tidak pernah masuk `public/`.

## Uji dan gerbang

- `node --test --test-concurrency=1 tests/lapor/*.test.mjs`: mesin (`mesin`), rute (`rute`, `rute_kejadian`), darurat sekali ketuk (`darurat_cepat`), peringatan (`peringatan`, `peringatan_rute`), data lanjutan (`lanjut_spek`, `lanjut_mesin`, `lanjut_rute`, `lanjut_rekap`, `lanjut_tim`, `lanjut_harian`, `lanjut_kabar`, `lanjut_tutup`, `lanjut_migrasi`), kejadian dan verifikasi (`lk_migrasi`, `verifikasi_bpbd`, `kartu_publik`), poster, kontak, agregat, kamus terjemahan, gerbang topik, tempat peta, dan fungsi lokal (`lokal_*`).
- `npm run uji:warga` (`tests/warga/*.test.mjs`) memuat uji Worker terkait: meja, profil meja, push, laporan warga.
- `npm run uji:agen` memeriksa gerbang repo (aturan tampilan kartu, token warna, ilmu agent, paket modul).
- Tinjau layar di `http://localhost:8800/lapor/` dan `http://localhost:8800/lapor/meja.html` (server tinjau lokal menjawab `/api/lapor/*` dengan mesin lokal dan tidak meneruskan ke produksi). Alternatif mandiri: `node scripts/lapor/lokal.mjs` di port 8810.
