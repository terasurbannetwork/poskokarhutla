# RENCANA-UJI-LOGPAL

Bukti utama: `node --test tests/warga/logpal.test.mjs` (workerd Miniflare, D1 sungguhan, migrasi apa adanya, tanpa mock). Gerbang: `npm run uji:warga` dan `npm run uji:agen`.

| Kriteria terima | Uji |
| --- | --- |
| Migrasi idempoten, CHECK dan trigger menahan | skema logpal |
| Akun tanpa hak dan tanpa x-pb ditolak | akses |
| BPBD A tidak menulis gudang BPBD B (404), pemprov tidak menulis gudang kabupaten (403) | kepemilikan |
| Stok kurang ditolak tanpa baris; dua penarikan serentak, satu lolos | stok |
| Jumlah diterima hanya untuk Keluar | diterima |
| Opname menyesuaikan stok, tercatat dari server, barang gudang lain ditolak | opname |
| Kolom aset tersimpan lengkap | ubah barang |
| Teks berawalan rumus ditolak, `jenis` bukan string 400 | rumus CSV, permintaan |
| Alur tahap, BPBD tidak memproses, BPBD hanya melihat miliknya | permintaan |
| Gudang BNPB oleh staf, kebutuhan hanya staf | staf BNPB |
| Impor idempoten (termasuk `logpal_statis`), tolak data tak sah dan jalur dalam repo | impor |
| Dummy: hanya Super Admin, tiap tab berangka, hapus bersih | dummy |
| Anonim (GET dan HEAD) tidak membuka halaman, JS, CSS, dan data statis; tidak ada nama gudang asli di repo; BPBD aktif, staf berperan, admin bisa; klien lokal; daftar tetap sama dengan server; tautan dari Ruang Instansi | halaman /instansi/logpal |

Tambahan manual: buka `/logpal` di peramban, klik sepuluh tab, cek konsol tanpa galat, isi satu mutasi, satu opname, satu permintaan.
