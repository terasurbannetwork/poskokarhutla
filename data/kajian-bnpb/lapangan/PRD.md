# PRD: Pegawai dan Relawan Lapangan

Versi 1.0, 1 Nov 2026. Tunduk pada `KEPUTUSAN-LAPANGAN.md`.

## 1. Masalah

Saat regu turun ke lapangan (Kalteng, Kaltim, Merauke, 28 Okt sampai 1 Nov 2026), BNPB tidak punya satu tempat untuk tahu
siapa bertugas di mana, apa yang dikerjakan, dan apa yang ditemukan. Laporan masuk lewat WA sebagai teks dan foto lepas
(GPS Map Camera), sehingga tidak bisa dihitung, dicocokkan ke Renlap, atau dipakai melatih model. Relawan sudah bisa
mendaftar (modul relawan), tetapi belum ada pemanggilan cepat dan absen yang bisa dipercaya.

## 2. Tujuan dan ukuran berhasil

| Tujuan | Ukuran |
|---|---|
| Satu basis data semua pegawai dan relawan | 100% pegawai di data Biro SDM masuk induk; tiap relawan terverifikasi punya kode |
| Absen lapangan yang bisa dipercaya | ≥ 90% absen lolos otomatis; sisa ditinjau ≤ 24 jam |
| Logbook harian terisi | ≥ 90% orang bertugas mengisi tiap hari; yang belum terlihat di panel |
| Data lapangan memperbaiki model | tiap laporan kondisi api atau banjir tersimpan sebagai label berlokasi |
| Relawan dipanggil cepat | panggilan bot WA terkirim ≤ 30 menit sesudah dibuat; balasan tercatat |

## 3. Peran

| Peran | Siapa | Akses |
|---|---|---|
| Petugas | pegawai BNPB, Tenaga Ahli dan Tim Khusus | tautan kode pribadi; daftar wajah, absen, logbook miliknya |
| Relawan | Relawan BNPB terverifikasi | tautan kode pribadi (modul relawan); daftar wajah, absen, logbook miliknya |
| Ketua regu | petugas yang ditunjuk per tugas | lihat absen dan logbook anggota tugasnya |
| Peninjau | staf BNPB berperan `pimpinan` atau `koordalops`, atau admin | antrean tinjauan, panel pimpinan |
| Super Admin | pemilik | semua, impor data induk, dummy, hapus data wajah |

## 4. Fitur

| Kode | Fitur | Tahap |
|---|---|---|
| F-01 | Induk orang: pegawai dan relawan dalam satu tabel, tertaut ke `staf` dan `relawan` yang sudah ada | A |
| F-02 | Impor CSV pegawai dari Biro SDM (Super Admin), dengan pratinjau dan laporan baris ditolak | A |
| F-03 | Kode pribadi per orang dan tautan `/petugas#k=`; kirim tautan lewat bot WA atau salin | A |
| F-04 | Persetujuan data wajah sebelum pendaftaran wajah (teks persetujuan, waktu, versi) | A |
| F-05 | Pendaftaran wajah lima arah (depan, kiri, kanan, atas, bawah) berpanduan di kamera depan | B |
| F-06 | Tugas lapangan: judul, bencana, titik dan radius, periode, anggota, tautan Renlap | B |
| F-07 | Absen masuk dan pulang dengan pindai wajah + tantangan acak + GPS tiga sampel | B |
| F-08 | Foto absen dan logbook dengan stempel waktu server, koordinat, wilayah, nama, tugas tercetak | B |
| F-09 | Logbook harian: kegiatan, hasil, kendala, kebutuhan, kondisi lapangan terstruktur, foto bergeotag | B |
| F-10 | Antrean luring di HP: absen dan logbook tersimpan saat tanpa sinyal, terkirim otomatis | B |
| F-11 | Antrean tinjauan: absen meragukan (wajah, GPS, waktu) diputus peninjau | B |
| F-12 | Panel pimpinan: peta personel hari ini, siapa belum absen, siapa belum mengisi logbook | B |
| F-13 | Panggilan relawan lewat bot WA: pilih keahlian, wilayah, kuota; balasan SIAP atau TIDAK | C |
| F-14 | Bot WA mengirim Renlap dan penugasan ke anggota tugas, dan menanyakan kondisi lapangan | C |
| F-15 | Absen relawan sah membuka dan menutup sesi `relawan_jam` (jam layanan) | C |
| F-16 | Kondisi lapangan jadi label model: api (menyala, bara, padam, bukan api), banjir (tinggi genangan) | C |
| F-17 | Rekap per tugas: hadir, jam layanan, logbook, temuan; unduh CSV | C |
| F-18 | Tombol dummy (isi dan hapus) di tiap layar, Super Admin saja | A sampai C |

## 5. Di luar lingkup

- Aplikasi toko (Android/iOS) dan deteksi mock-location native (U2).
- Penggajian, tunjangan, perjalanan dinas, sanksi disiplin.
- Laporan harian Dirdalops terpisah: logbook yang ada sudah masuk langsung; modul ini hanya memantau pengisiannya.
- NIK atau KTP (keputusan relawan 19 Okt 2026 berlaku juga di sini).
- Pengiriman WA massal di luar limiter gateway.

## 6. Larangan

- Skor wajah atau GPS tidak pernah menolak absen sendirian; yang meragukan masuk tinjauan (D3).
- Foto wajah acuan dan vektor wajah tidak tampil di layar publik mana pun dan tidak masuk ekspor CSV.
- Waktu resmi selalu waktu server (D4).
- Tidak ada "swafoto dari galeri": kamera langsung saja.
- Tidak membuat tabel kembar untuk relawan, staf, atau jam layanan (D6).
