# Batasan SIPPA dan neraca air

Bagian ini memuat batasan dan pertanyaan terbuka untuk SIPPA dan neraca air Jawa.

## SIPPA

- Seluruh ambang matriks respons FRP dan luas, pemicu, dan saran sarana berstatus asumsi-kebijakan dan belum diuji terhadap log lapangan 2026.
- Kurva pompa hanya dua sampai tiga titik datasheet. Akan diganti kurva uji penerimaan pabrik (FAT) setelah gerbang G2.
- Data pilot tidak pernah diberi vonis G4. Belum ada vonis "dapat dipakai" yang tercatat dalam dokumen yang dibaca; status hasil pilot Kalimantan Timur belum terdokumentasi di kode.
- Kedalaman gambut per titik belum punya data resmi (lapisan PRIMS 1:250.000 tanpa kelas kedalaman). Tiap petak wajib dibor, gambut kurang dari 50 cm atau kurang dari 1 m berarti petak dipindah.
- Keputusan 60 menutup opsi jaringan pipa tetap (koridor HDPE semi-permanen dan tulang punggung permanen). Preset S2 dan S3 di Studio hanya tampil sebagai pembanding dan selalu NO-GO melalui gerbang `jaringan_permanen`.
- `sel22.py` mensyaratkan data VIIRS 2012-2025 lengkap. Menurut catatan 28 Oktober 2026, berkas lokal hanya 2015, 2019, dan 2023-2025, sehingga sel 2,2 km provinsi lain belum bisa dibangun (status per 24 November belum diperiksa ulang).
- Jaringan data tertentu (Overpass, OSRM) tergantung layanan publik. Jalur cadangan (Geofabrik, garis lurus x 1,4) berlabel estimasi.
- Dossier lapangan dan halaman uji pilot memakai token yang hash-nya ada di kode. Tidak dibahas rinci di dokumen ini.
- Dokumen paket SIPPA sangat besar (PRD sekitar 225 KB, DESAIN-TEKNIS sekitar 163 KB) dan hanya KEPUTUSAN-SIPPA serta kode yang dibaca langsung untuk dokumen ini. Rincian per layar (DESIGN-SYSTEM) tidak diulang.
- Keputusan pemilik 1 sampai 64 sudah final. Tidak ada pertanyaan terbuka bernomor Q yang tercatat di KEPUTUSAN-SIPPA.md.

## Neraca air Jawa

- Semua angka berlabel estimasi-model. Validasi kemarau (median rasio Juni-Oktober 1,34 dan satu sungai di luar rentang 0,5 sampai 2) tidak lolos. Skenario tahun kering dibaca sebagai indikasi.
- Parameter bak (TAW 130 mm, Kc 1,0, alpha 0,6, k 2,0 bulan) adalah asumsi-kebijakan yang dikalibrasi pada GloFAS, bukan pos duga. Tanpa data BBWS (keputusan pemilik 8).
- Waduk disederhanakan (pelepasan tetap sama dengan rerata aliran). Delapan atau lebih waduk lain belum dimodelkan.
- Industri hanya tersedia untuk 75 dari 119 kabupaten/kota. Ayam ras dan kuda tidak masuk ternak. Irigasi adalah kebutuhan potensial gaya KP-01 yang kira-kira 40 persen dari pembanding SNI 1 L per detik per hektare.
- Proyeksi 2030 hanya menumbuhkan penduduk domestik.
- Kota kecil yang lebih kecil dari satu sub-DAS level 09 mendapat aliran menurut pecahan luas saja, sehingga kartu kota perlu catatan.
- Ketergantungan data eksternal: radiasi NASA POWER terlambat sekitar 3 bulan; GloFAS dan CHIRPS tergantung layanan publik; GRACE membutuhkan token Earthdata dan pustaka h5py hanya di lab.
- Proyeksi iklim berbias model dan bukan prakiraan.
- Tidak ada workflow GitHub Actions dan tidak ada halaman web. Pembaruan dilakukan manual atau lokal, jadi berkas di `public/data/neraca_air/` tidak otomatis segar.
- Halaman web belum diputuskan: keputusan pemilik 7 menyatakan tidak ada halaman, dan tidak ada pertanyaan terbuka lain di berkas yang dibaca.
