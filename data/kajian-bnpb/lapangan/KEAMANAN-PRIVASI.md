# KEAMANAN DAN PRIVASI: Pegawai dan Relawan Lapangan

Data wajah adalah data pribadi spesifik (UU 27/2022 Pasal 4 ayat 2). Desain ini menjaganya walau slide paparan tidak
membahasnya.

## 1. Matriks hak

| Data | Petugas sendiri | Ketua regu | Peninjau | Super Admin | Publik |
|---|---|---|---|---|---|
| Profil induk | lihat | nama, unit anggota | lihat | ubah | tidak |
| Vektor wajah | tidak (hanya status) | tidak | tidak | hapus | tidak |
| Foto acuan depan | lihat | tidak | lihat saat meninjau | lihat, hapus | tidak |
| Absen dan foto berstempel | lihat | lihat anggota | lihat, putus | semua | tidak |
| Logbook | ubah sampai 23.59 | lihat anggota | lihat | semua | tidak |
| Label kondisi lapangan | | | | | agregat lokasi tanpa nama di `label.json` |
| WA, email | lihat | tidak | lihat | ubah | tidak |
| Kode/tautan pribadi | pemilik | tidak | tidak | lihat saat terbit (admin saja); staf pimpinan/koordalops hanya mengantrekan ke WA, tanpa melihat kode | tidak |

## 2. Aturan

1. Persetujuan eksplisit sebelum wajah direkam; versi teks persetujuan disimpan. Tanpa persetujuan, orang tetap bisa absen
   dan semua absennya masuk tinjauan (jalur tanpa wajah).
2. Vektor disimpan hanya di D1, tidak pernah dikirim balik ke klien, tidak masuk ekspor CSV, tidak masuk log.
3. Foto acuan di R2 dengan kunci yang tidak bisa ditebak; disajikan hanya lewat rute berpenjaga.
4. Hapus: orang mencabut persetujuan atau keluar → vektor dan foto acuan dihapus seketika; `wajah_status = dihapus`.
5. Masa simpan: foto absen dan logbook 2 tahun (bukti kegiatan); sesudahnya foto dihapus, baris tetap tanpa foto.
6. Kode pribadi 26 hex, hanya sha256 disimpan; diganti bila HP hilang (tombol "Ganti tautan" di panel). Balasan API memuat kode hanya untuk admin (moderator ke atas); staf pimpinan/koordalops hanya mengantrekan ke WA orangnya, dan orang tanpa WA dijawab 409 (minta admin menyalin tautan). Antrean WA (memuat kode) dibuang cron: dikirim/gagal > 24 jam, antre > 72 jam. Penerbitan tautan dan impor dicatat ke log terstruktur tanpa kode/WA.
7. IP disimpan sebagai hash bergaram `IP_SALT`.
8. Relawan yang mencabut diri mengikuti `anonimkan` modul relawan; seketika baris `orang`, vektor, persetujuan, antrean WA, dan foto acuan `lapangan/acuan/<id>.jpg` ikut dihapus (`hapusOrang`).
9. Tidak ada NIK atau KTP.
10. Semua masukan divalidasi di server (tipe, panjang, rentang, enum); galat ke klien tanpa pesan internal.

## 3. Ancaman dan penjaga

| Ancaman | Penjaga |
|---|---|
| Titip absen (orang lain memakai HP) | pindai wajah + tantangan acak + antispoof |
| Foto dari foto atau layar | antispoof + liveness + tantangan; ragu masuk tinjauan |
| Foto lama diunggah ulang | nonce sekali pakai + sha256 unik |
| GPS palsu | `nilaiGps`, lompatan mustahil, tinjauan; native di U2 |
| Jam HP diubah | waktu server resmi, `selisih_detik` ditandai |
| Tebak kode | 26 hex + `lajuIP` |
| Kebocoran vektor | tidak pernah keluar dari Worker |
| Banjir pesan WA | limiter gateway (3/menit, 60/jam, 300/hari, 8 per tujuan per hari) |
