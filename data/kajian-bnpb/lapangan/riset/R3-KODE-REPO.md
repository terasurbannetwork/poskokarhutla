# R3. Yang sudah ada di repo (dipakai ulang, tidak dibuat kembar)

Pemetaan 1 Nov 2026.

## Relawan (`src/relawan.js`, migrasi 0023)
- Tabel `institusi`, `institusi_perjanjian`, `relawan` (nama, wa, email, prov, kab, jalur, kampus_id, organisasi,
  keahlian 15 enum, sertifikat, ketersediaan, gol_darah, darurat_*, status 9 nilai, setuju_pdp, anonim), tanpa NIK/KTP.
- `relawan_permintaan` (bencana, wilayah, lat/lon, butuh [{keahlian, jumlah}]), `relawan_penugasan` (ditawarkan sampai
  selesai, asuransi, nilai), `relawan_pelatihan`.
- **Check-in/out sudah ada**: `relawan_jam` (masuk, keluar, lat, lon opsional, menit ≤ 960, sah 0/1/2,
  klien_masuk/keluar untuk luring, selisih_menit); satu sesi terbuka per relawan. Logika `aksiPenugasanSaya`
  (relawan.js:297-352). Celah: lokasi opsional, tanpa sampel GPS, tanpa foto, tanpa wajah.
- Akses relawan dengan kode pribadi 26 hex (sha saja), header `x-kode`; `kodeBaru`, `pemegangKode` (src/bnpb.js).
- Kapasitas agregat `GET /api/relawan/kapasitas` (cache tepi 600 detik). Anonimisasi PDP dan retensi 180 hari.

## Logbook (`src/logbook.js`, 0088 + 0091)
Logbook **kejadian** Pusdalops (angka dampak per entri), bukan logbook harian personel. Peran `stafOK` pusdalops,
koordalops, pimpinan. Pola `waktuMs`, validasi `teks`, pengingat 24/72 jam.

## Akun
- `adminOK`, `modOK`, `superOK` (posko.js); staf BNPB `staf` (username, nama, nip unik, unit teks bebas, email, wa,
  peran JSON, wilayah) + `staf_sesi` 30 hari (0030, src/staf.js); `stafOK`, `dalamWilayahStaf`.
- Akun instansi `instansi_akun` (jabatan, pangkat, unit).
- `penugasan` + `penugasan_posisi` (jejak GPS append-only), rute `/api/lacak/*`.
- Celah: **tidak ada induk pegawai/unit/jabatan**; staf dan relawan tanpa kunci bersama.

## Media, EXIF, GPS (dipakai ulang langsung)
- EXIF dibaca di klien: `window.bacaExif` (public/inti/exif.js).
- `unggahMediaInti` (src/instansi.js:821-893): EXIF > 5 km dari GPS ditolak, umur > 48 jam ditolak;
  `ATURAN_MEDIA` (src/foto.js), `waktuMedia`, `jenisBerkas` dari byte awal, `bersihMedia` (src/media_bersih.js) membuang
  metadata, sha256 rantai kustodi (bukan tolak duplikat).
- **`nilaiGps` (src/gps.js:19)**: tolak jaringan luar Indonesia, VPN/hosting, kurang dari 3 sampel, sampel basi; tandai
  `gps_curiga` bila zona waktu tak cocok, GPS diam, kecepatan mustahil.
- R2 binding `MEDIA`; Workers AI `MODEL_ORANG` detr-resnet-50 hanya menghitung orang.
- Pola uji pilot (`public/pipa/uji_pilot.js`): 3 sampel `getCurrentPosition` highAccuracy jeda 1 detik, zona waktu,
  EXIF, foto kamera langsung. **Pola paling cocok untuk absen.**

## WhatsApp
Gateway Baileys di Mac mini (scripts/wa); Worker tidak bisa memanggil gateway; pesan keluar ditarik skrip Mac lewat
`127.0.0.1/send`; limiter 3/menit, 60/jam, 300/hari, 8 per tujuan per hari, pemanasan 40/hari. **Siaran ke relawan
belum ada**: perlu antrean di Worker + penarik di Mac.

## Wajah
Tidak ada sama sekali; satu-satunya `getUserMedia` memakai kamera belakang.

## Konvensi
`RUTE_X` di-spread ke `RUTE` (src/worker.js); POST lewat `tolakOrigin`; `laju()`/`lajuIP`; migrasi berikutnya
**0094**, sha256 ke `tests/warga/migrasi_beku.json`; tiap rute/tabel/trigger di `tests/warga/cakupan.json`; kolom
`dummy`, waktu ms epoch. Pemilik: `warga-api` (src, migrations, tests/warga), `ruang-bnpb` (public/bnpb),
`inti-layar` (public/inti), `wa-bot` (scripts/wa).

## Celah yang dibangun modul ini
Induk orang (pegawai + relawan satu kunci), absen berfoto + sampel GPS + wajah, templat wajah, logbook harian personel,
siaran WA dari Worker, tolak duplikat foto (indeks unik sha256).
