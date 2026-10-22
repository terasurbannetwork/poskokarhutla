# Rencana operasi pemadaman lapangan

Disetujui pemilik 22 Okt 2026 ("gas semuanya"). Tujuan: lingkar kendali operasi yang
utuh, dari api terdeteksi sampai benar-benar padam dan tidak menyala lagi, dengan satu
gambar situasi yang sama untuk Posko, regu, dan pimpinan.

Dasar: peta modul yang sudah ada (tugas api `src/instansi.js`, penugasan + pelacak
`src/penugasan.js`, regu berkode `src/posko.js`, inventaris, Meja Pantau `src/pantau.js`,
taktik `scripts/data/taktik.py`, Himawari `src/himawari.js`). Fitur baru MENYAMBUNG
ke modul itu, tidak menyalin.

## Butir

| # | Butir | Inti | Tempat |
|---|---|---|---|
| L1 | Verifikasi padam + api muncul lagi | Himawari (≤1 jam, 2 km) ikut memicu `muncul_lagi`; laporan regu berkode (`lapangan`) ikut menandai padam/menyala pada tugas api terdekat; kunjungan cek ulang terjadwal H+1, H+3, H+7 untuk gambut (bara tak terlihat satelit) | `src/instansi.js`, `src/pantau.js` |
| L2 | Usulan penugasan | Kandidat orang/regu yang tidak sedang bertugas, posisi terakhir atau pos asal, waktu tempuh (graf `akses.json` dari posko/daops bila ada, selain itu garis lurus × 1,3), keahlian/peran, alat terdekat; Posko menyetujui sekali klik | `src/penugasan.js` |
| L3 | Keselamatan regu | Alarm "sunyi" (tidak ada posisi > N menit selagi bertugas), batas jam kerja per orang, tombol darurat di halaman lacak, peringatan angin bila prakiraan angin 6 jam mengarah dari api ke regu | `src/penugasan.js`, `public/lacak.js`, `src/pantau.js` |
| L4 | Peta operasi bersama | Satu peta per tugas: lokasi + poligon kluster, posisi dan jejak regu, garis api hasil rekam jalan, sektor padam vs aktif, sumber air, drop heli, titik drone | `src/operasi_lapangan.js` + layar |
| L5 | Sumber air + rencana selang | Titik sumber air yang dilaporkan lapangan (jenis, kondisi), hitungan pompa estafet dari jarak selang dan susut tekanan | `src/operasi_lapangan.js` |
| L6 | Rencana aksi periode operasi | Lembar briefing 12/24 jam per tugas (sasaran, sektor, penanggung jawab, regu, alat, cuaca, komunikasi, keselamatan), terisi otomatis dari rekomendasi/penugasan/cuaca, siap cetak, log serah terima | `src/operasi_lapangan.js` |
| L7 | Water bombing dari darat | Permintaan heli dengan koordinat + sumber air terdekat; status; log drop; hasil titik sesudah drop | `src/operasi_lapangan.js` |
| L8 | Logistik regu | Permintaan barang berjumlah dari lapangan (BBM, selang, konsumsi) dengan status pemenuhan, terhubung ke inventaris | `src/operasi_lapangan.js` |
| L9 | Linimasa pasca-operasi | Satu linimasa per tugas dari semua jejak (deteksi, konfirmasi, berangkat, tiba, padam, terverifikasi, muncul lagi), waktu respons, catatan pelajaran | `src/operasi_lapangan.js` |
| L10 | Patroli pencegahan | Tugas patroli non-api dari risiko harian (kecamatan/KHG prioritas), bukti kunjungan foto GPS | `src/operasi_lapangan.js` |
| L11 | Bukti lapangan ke Gakkum | Foto/kabar tugas api di dalam poligon konsesi tampil di berkas Gakkum | `public/admin/gakkum.js` + rute admin |
| L12 | Drone termal | Unggah titik bara hasil drone (CSV lat, lon, suhu) dan foto; tampil di peta operasi | `src/operasi_lapangan.js` |
| L13 | Integrasi data resmi | Pengimpor CSV TMAT (muka air gambut) dan status regu Daops; dipakai prioritas pembasahan. Tarikan otomatis menunggu akses resmi | `src/operasi_lapangan.js` |

## Aturan

- Migrasi baru mulai 0040 (sesi lain memakai 0036 ke atas untuk akun). Hanya `CREATE ... IF NOT EXISTS`.
- Tanpa kiriman otomatis keluar. Alarm masuk Meja Pantau dan halaman lacak; WhatsApp lewat tautan wa.me yang ditekan manusia.
- Data posisi orang hanya untuk Posko/staf berwenang dan pemegang tautan lacak sendiri; tidak pernah publik.
- Tiap rute dan tabel diuji integrasi (Miniflare + D1) dan masuk `tests/warga/cakupan.json`; tiap layar baru masuk `tests/bnpb/layar.test.mjs`.
- Commit hanya bila `uji:agen`, `uji:warga`, `uji:layar` masing-masing `ℹ fail 0`.
- Berkas yang sedang dipegang sesi lain (src/staf.js, src/admin_halaman.js, public/admin/pantau.js, public/admin/akun.*) tidak disentuh sampai sesi itu commit.
