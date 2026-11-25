# Rencana: lereng dan panel EWS

Halaman ini menguraikan rencana bangunan di lereng terjal dan panel EWS sensor dan CCTV yang belum dibangun.

## Bangunan di lereng terjal (rencana, sebagian pondasi sudah ada)

Paket `data/kajian-bnpb/lereng-bangunan/` (K1 sampai K4, K4 menerima semua bawaan Q1 sampai Q18). Tujuan: menghitung bangunan yang berdiri di lereng 40 persen atau lebih per kecamatan dan desa, hanya bila dua peta sepakat. Ketentuan:
- Lereng dalam persen `100 x tan(sudut)` (40 persen = 21,8 derajat), metode Horn 3 kali 3 (`scripts/longsor/lereng_dem.py`), ukuran piksel dari ellipsoid WGS84 per baris; tidak boleh dicampur dengan derajat modul longsor lama.
- Lereng per bangunan = median lereng piksel di jejak ditambah cincin 15 m (topeng bangunan tetangga); lima kelas: S (sepakat terjal, DEMNAS dan GLO-30 sama-sama 40 persen atau lebih), D (hanya DEMNAS), G (hanya GLO-30), L (landai), T (tak dinilai). Angka utama hanya `n_S`; `n_T` selalu tampil; rentang `[n_S, n_S + n_D + n_G]`.
- Syarat tampil: cakupan DEMNAS 95 persen atau lebih (bila tidak, "belum ada DEMNAS", bukan 0), bangunan dinilai 20 atau lebih untuk rincian kelas; peringkat hanya untuk wilayah 1 km2 atau lebih dengan 200 bangunan dinilai atau lebih dan kelengkapan Overture diketahui.
- Bangunan dari Overture Maps (rilis dibekukan 2026-10-21.0, ODbL); kata yang dipakai "bangunan", tidak "rumah". Kelengkapan hanya dibandingkan dengan Open Buildings (provinsi 13, 33, 63 saja); OSM bukan pembanding sah karena sekitar 80 persen isi Overture berasal dari OSM.
- Uji pada desa (AUC dalam strata kabupaten/kota, lima pembanding: p75 lereng, jumlah bangunan, acak, skor DEMNAS saja, skor GLO-30 saja; vonis awal bila AUC 0,65 atau lebih, batas bawah selang bootstrap 95 persen di atas 0,5, dan batas bawah selang selisih berpasangan di atas 0). Daftar desa longsor 2025 sampai 2026 disusun dan di-commit sebelum agregat dihitung. Hasil tidak boleh disetel ke angka video rujukan (K1: lebih dari 5.000 bangunan Bandung Barat, lebih dari 9.000 Bandung Raya).
- Lapisan tidak masuk skor kerentanan dan nowcast longsor (D10, Q18); tidak ada koordinat bangunan di `public/`.

Yang sudah ada (`scripts/longsor/lereng_dem.py`, `lereng_bangunan.py`): pembaca DEM dan lereng persen dengan uji sintetis (LT-04), cakupan GLO-30 per kabupaten (`glo30`, LT-06), batas desa dan kecamatan (`batas`, LT-03), dan ekstrak Overture untuk empat kabupaten/kota Bandung Raya lewat DuckDB (`ekstrak`, `hitung`, LT-07: 3,54 juta baris bbox, 2,545 juta dalam empat kabupaten/kota, 687.916 di Bandung Barat, sesuai video; hanya jumlah total, tanpa lereng). LT-12 sudah selesai: daftar desa longsor Bandung Raya (16 desa, 5 gagal dicocokkan) dikunci sebelum agregat di `scripts/longsor/data_kejadian_desa.json` dan `data_kejadian_desa.sidik`. Agregat bangunan-di-lereng, layar `/longsor/lereng`, hitungan uji desa (AUC), dan citra Sentinel-2 belum ada.

## Panel EWS sensor dan CCTV (rencana, belum dibangun)

Paket `data/kajian-bnpb/ews/` (K1: hanya banjir dan gunung api; K3: tanpa data contoh). Rancangan: satu mesin panel `public/inti/pantau_alat.js` dan `.css` dinyalakan lewat kunci registri `kemampuan.alat`; bentuk pos seragam `{id, sumber, jenis, nama, lat, lon, kab, nilai, satuan, waktu, ambang, tingkat, alat, basi}`.
- Tingkat pos: basi berarti "tanpa data" (abu, "Tidak ada data terkini"); level resmi PVMBG dan status resmi SIHKA ("Siaga 3/2/1") tampil apa adanya dengan nama pengelola dan tidak dipetakan; selain itu `tingkatAmbang` dari `src/sensor.js` dipakai ulang (nilai sama dengan atau di atas ambang terlewati, tingkat tertinggi menang); tanpa ambang tercatat hanya nilai tanpa warna.
- Batas basi bawaan: tma dan hujan 30 menit, geofon 10 menit (Q4); `GET /api/sensor/status` lama tetap memakai 1 jam (`src/sensor.js`, `BASI`).
- Ringkasan: jumlah pos, di atas ambang, terputus, kamera. Nilai kosong tidak pernah menjadi 0 dan sensor putus tidak pernah ditampilkan 0.
- Grafik seri waktu SVG interaktif: tma dan hujan 288 titik (interval 5 menit, hipotesis), geofon ringkasan per menit 1.440 titik; celah lebih dari dua kali interval digambar putus.
- CCTV HLS hanya dari aliran berizin tertulis (`ews/cctv.json` di R2 `MEDIA`).
- Data dasbor vendor (geodashboard, Banda Aceh, MHEWS BNPB) tidak diambil tanpa izin (Q1). Bacaan sensor tidak memicu peringatan publik.
