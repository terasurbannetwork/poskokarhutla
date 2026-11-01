# DESIGN-SYSTEM: Pegawai dan Relawan Lapangan

Seluler dulu (390 px), dipakai di lapangan dengan sinyal lemah, tangan kotor, terik matahari. Panel pimpinan di desktop
(1440 px). Mengikuti sistem desain Centurisk97, tidak membuat palet sendiri.

## 1. Fondasi (wajib)

- Kepala situs bersama: `header.top` navy dengan logo, menu bencana `/inti/kepala.js`, tombol tema (memori
  kepala-situs-wajib). Salin markup dari `public/akademisi.html`.
- Gaya: `/inti/tema.css`, `/inti/gaya.css`, `/inti/kepala.css`; token `--paper`, `--card`, `--surface`, `--ink`, `--ink2`,
  `--line`, `--brand`, `--brand2`, `--f2` (oranye angka kunci), huruf tampilan `--display`. Kelas modul berawalan `.lp-*`.
- Format angka dan tanggal dari `/inti/format.js` (satu formatter). Jam 24 jam, zona tertulis (WIB, WITA, WIT).
- Teks menyapa "kamu", tanpa titik tengah dan em dash, paragraf rata kanan-kiri, angka kunci dulu.
- Target sentuh ≥ 48 px (sarung tangan), kontras AA di bawah terik (teks ≥ 16 px di layar kamera).
- Ikon garis SVG seragam; tanpa emoji.
- Tiap layar punya keadaan: memuat (kerangka), kosong (satu aksi), galat (kalimat manusiawi + ulangi), luring (pita
  "Tersimpan di HP, terkirim saat ada sinyal" + jumlah antrean).
- Tombol dummy dua ikon (isi, hapus) di pojok kanan bawah, Super Admin saja (DUMMY.md).
- Klik tidak membekukan layar: kerja berat wajah di `requestAnimationFrame` dan Web Worker bila tersedia; tombol langsung
  berubah keadaan (INP.md).

## 2. Layar petugas `/petugas` (seluler)

| Layar | Isi | Komponen |
|---|---|---|
| L1 Beranda | kartu tugas hari ini (judul, titik, jarak dari kamu), status absen masuk/pulang, status logbook hari ini, pita antrean luring | `.lp-tugas`, dua tombol besar "Absen masuk" / "Isi logbook" |
| L2 Persetujuan | teks persetujuan wajah (apa, untuk apa, berapa lama, cara hapus), centang, tombol Setuju | kartu teks, satu tombol |
| L3 Daftar wajah | kamera depan penuh, lingkaran pemandu oval, panah arah, lima titik progres (depan, kiri, kanan, atas, bawah), teks perintah besar | `.lp-kamera`, `.lp-pemandu`, `.lp-progres-arah` |
| L4 Absen | kamera depan, perintah tantangan ("Kedipkan mata"), indikator GPS (3 titik terisi), lalu layar hasil: centang hijau "Absen masuk tercatat 07.42 WIB" atau kuning "Menunggu tinjauan: wajah kurang jelas" | `.lp-kamera`, `.lp-gps`, `.lp-hasil` |
| L5 Logbook | formulir satu kolom: jenis kegiatan (chip), uraian, hasil, kendala (chip multi), kebutuhan (chip multi), kondisi lapangan (sesuai bencana tugas), foto 1 sampai 6 | chip deret penuh lebar terbagi rata berikon (memori deretan-pilihan) |
| L6 Riwayat | daftar absen dan logbook 14 hari, status berwarna | baris ringkas |

Kamera: foto selalu dari kamera langsung (`getUserMedia`), tidak ada pilihan galeri. Stempel tampil sebagai pratinjau
sebelum kirim.

Warna status: lolos/sah hijau, tinjau kuning, tolak merah, luring abu biru. Label status Bahasa Indonesia.

## 3. Panel pimpinan `/petugas/panel` (desktop)

| Bagian | Isi |
|---|---|
| Strip angka | hadir hari ini, belum absen, belum isi logbook, antrean tinjauan (angka besar, klik menyaring) |
| Peta | titik absen hari ini per tugas, warna status, klik titik: nama, waktu, foto berstempel |
| Tabel tugas | tugas aktif, anggota, hadir, logbook terisi, temuan terbaru |
| Antrean tinjauan | baris: foto berstempel vs foto acuan depan berdampingan, skor wajah, alasan (chip), jarak ke titik, tombol Sah / Tolak |
| Pengisian logbook Dirdalops | daftar petugas per provinsi dengan tanda sudah atau belum mengisi hari ini |
| Panggilan relawan | form panggilan + tabel balasan (terkirim, SIAP, TIDAK, tanpa balasan) |

Tabel: kepala rata tengah, tanpa butir lepas di bawah tabel (pakai kartu atau baris tabel). Tiap grafik dan peta
interaktif dengan tooltip.

## 4. Teks antarmuka baku

| Kunci | Teks |
|---|---|
| absen.lolos | Absen {masuk/pulang} tercatat {jam} {zona} |
| absen.tinjau | Menunggu tinjauan: {alasan manusiawi} |
| absen.luring | Tersimpan di HP. Terkirim otomatis saat ada sinyal |
| wajah.arah.depan | Hadap lurus ke kamera |
| wajah.arah.kiri | Toleh pelan ke kiri |
| wajah.arah.kanan | Toleh pelan ke kanan |
| wajah.arah.atas | Angkat dagu sedikit |
| wajah.arah.bawah | Tunduk sedikit |
| wajah.mutu | Wajah kurang terang. Hadap ke cahaya |
| gps.tunggu | Mencari lokasi ({n} dari 3) |
| alasan.wajah_rendah | wajah kurang jelas |
| alasan.luar_radius | di luar radius tugas ({jarak}) |
| alasan.gps_curiga | lokasi perlu dicek |
| alasan.jam_hp | jam HP berbeda dari jam server |
