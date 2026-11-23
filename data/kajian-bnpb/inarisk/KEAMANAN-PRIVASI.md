# Keamanan dan privasi

## Data pribadi

- Titik Lapor Kegiatan dan Sosialisasi InaRISK memuat nama petugas (`User Pemantau`) dan foto. Proksi
  membuang properti nama orang sebelum membalas; repo tidak pernah menyimpan GeoJSON itu. Berkas uji
  memakai titik buatan tanpa nama.
- Berkas unggahan pemilik `Data Pelaporan Kegiatan DKI Jakarta.geojson` tidak masuk repo.
- Cermin IRBI, IKD, jiwa terpapar, tautan: data agregat wilayah, tanpa data orang.

## Proksi

- Hanya jalur di daftar izin; jalur lain 404. Tidak ada penerusan URL bebas (cegah SSRF).
- Parameter disaring dan dibatasi panjang; badan POST divalidasi bentuknya (GeoJSON titik atau poligon,
  maksimal 2.000 titik sudut, radius maksimal 50 km).
- Batas laju per IP lewat `laju_bnpb`; tenggat 20 detik; galat hulu jadi 502 tanpa membocorkan isi.
- Tidak ada kredensial InaRISK; rute login dan `/cms/*` tidak pernah disentuh.

## Layar

- Semua teks dari API lewat `textContent` atau `esc()`; tidak ada `innerHTML` dengan string mentah.
- Tautan unduhan dan foto hanya diterima bila host `inarisk.bnpb.go.id` atau `inarisk2.bnpb.go.id`
  dan skema https (atau http untuk foto lama, ditampilkan sebagai tautan, bukan gambar).
- CSP tetap `script-src 'self'`; tidak ada skrip pihak ketiga.

## Lisensi

Lisensi data InaRISK tidak tertulis: tiap tab menyebut "Sumber: InaRISK BNPB", tidak diklaim data
terbuka (sama dengan `data/kajian-bnpb/data/irbi/README.md`).

## Pengulas

`guard-api` dan `security-reviewer` untuk `src/inarisk.js`; `selera-angka` dan `inp-reviewer` untuk layar.
