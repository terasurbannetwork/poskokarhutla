# Status prakiraan dan dampak peringatan dini: metode

Halaman ini memuat cara hitung status Normal sampai Awas per kab/kota, sumber datanya, batas ketelitian, dan status uji baliknya.

## Tabel status per bahaya

Kriteria dikunci di `scripts/prediksi/status_prakiraan_kriteria.json:1`; mengubah satu angka berarti sidik baru (`scripts/prediksi/status_prakiraan.py:15`). Bahaya: BNJ (banjir), LSR (longsor), CEX (cuaca ekstrem); tambahan KEK (kekeringan) dan GEL (gelombang); KHT (karhutla) dari status taktis (`status_prakiraan.py:185`).

Untuk tiap (kab, bahaya, hari sasaran 0 sampai 3): E = maksimum prakiraan P dan, hanya hari 0, peringatan BMKG R. Status S dari E dan kelas bahaya kab K (`status_prakiraan.py:80`):

| Syarat | S |
| --- | --- |
| CEX, atau K sedang, atau K tinggi | S = E |
| K rendah dan R bukan 3 | min(E, 2) |
| K rendah dan R = 3 | S = E |
| K tidak ada (banjir atau longsor) | E = 0: belum terukur; E lebih dari 0: min(E, 2) bertanda "sebagian" |

Status kab = maksimum S atas hari 0 sampai 3 (`status_prakiraan.py:92`). Normal hanya bila semua sumber ada dan segar. KEK dan GEL tanpa K dan tanpa R, S = E (`status_prakiraan.py:206`).

Kesegaran: prakiraan 36 jam, BMKG 3 jam (`status_prakiraan_kriteria.json`, kunci `segar_jam`). Severity CAP: Minor 1, Moderate 2, Severe dan Extreme 3.

## Sumber

| Sumber | Dipakai untuk | Rujukan |
| --- | --- | --- |
| CAP BMKG lewat umpan nowcast | R, poligon area peringatan | `scripts/siklus/dampak_peringatan.py:15` |
| Prakiraan Centurisk97 `/prediksi` | P | `status_prakiraan.py:16` |
| Kelas bahaya InaRISK, disampel per kab | K | `scripts/siklus/kelas_kab.py:16` |
| WorldPop, Dukcapil, GHSL | penduduk, berdampingan | `scripts/siklus/paparan.py:183` |
| OSM dan Dapodik | fasilitas, per sumber | `scripts/siklus/paparan.py:183` |

Penduduk dihitung satu mesin lewat `paparan.hitung_kab` dari zona gabungan poligon (`paparan.py:40`), lalu dibulatkan `paparan.bulat` (`paparan.py:199`). Kata terlarang di keluaran, termasuk klaim keselamatan dan korban, dijaga `dampak_peringatan.py:18`.

## Batas ketelitian

- Penduduk desa memakai titik pusat desa dan anggapan merata: porsi bangunan di zona dikali jumlah jiwa desa (`paparan.py:183`). Ketelitian posisi sekitar 80 meter pada kotak halus (`paparan.py:14`).
- Kelas bahaya kab adalah sampel 200 titik per kab per bahaya, bukan peta penuh (`kelas_kab.py:16`); porsi minimal 0,10 dan tak terliput maksimal 0,5 adalah bawaan sementara (`kelas_kab.py:17`). Batas kelas 0,33 dan 0,66 belum bersumber resmi (`scripts/siklus/konst.py:12`).
- Dari umpan CAP, baru satu jenis peringatan teramati: "Hujan Lebat dan Petir", severity Moderate. Angin kencang dan puting beliung belum teramati, dan peringatan yang tak terpetakan hanya dihitung (`dampak_peringatan.py:22`).
- Layanan ArcGIS cuaca BMKG tidak dapat dipakai tanpa token; hanya CAP.
- KEK hanya hari 0 dan kab yang ada di berkas kekeringan; GEL hanya kab pesisir.

## Status uji balik

Per 26 November 2026 semua bahaya hipotesis: `boleh_tampil` salah untuk BNJ, LSR, dan CEX (`public/data/gerbang/status_prakiraan.json:1`). Label prospektif (DIBI dan logbook, dinilai terpisah) belum punya pasangan: n = 0. Retrospektif komponen P saja, hanya informasi: BNJ n = 9 hari sasaran, selang 95 persen -0,047 sampai 0,060 (menyentuh nol), LSR n = 9, selang -0,109 sampai -0,053. Syarat lolos: paling sedikit 30 hari sasaran dan 30 kejadian serta batas bawah selang di atas nol. Karena itu pil "hipotesis" tampil di semua layar. Arsip harian status append-only mulai 26 November 2026 (`status_prakiraan.py:265`).
