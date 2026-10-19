# Ilmu banjir

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/banjir.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca banjir`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus banjir "..."`.

## Peta berkas & tabel

Semua skrip di `scripts/banjir/` menulis ke `public/banjir/data/*.json`; berkas mahal/perantara di `data/raw/banjir/`. Layar: `public/banjir/index.html` (satu berkas; aturan status dicerminkan di JS-nya). Dijalankan `.github/workflows/banjir.yml` (cron `20 0 * * *` = 07.20 WIB, timeout 50 mnt, `concurrency: group: data`).

Urutan langkah workflow:
1. `uji` semua: `for s in hujan ansambel_hujan sungai bahaya kejadian status uji_balik rob posko peringatan riwayat; do python3 scripts/banjir/$s.py uji; done`
2. `hujan.py` -> `hujan.json` (kisi darat 0,25 derajat, 7 hari lalu + 7 ke depan: h, p, jam, g, h3, a7, imax, cape, sm, ws, wd). Satu ulangan setelah 10 menit (13 Okt 2026 Open-Meteo mengirim JSON rusak 5x).
3. `ansambel_hujan.py` (boleh gagal) -> `hujan_ansambel.json`: ECMWF IFS 51 anggota, satu titik per kotak 1 derajat (349 titik, ~1.780 panggilan); p50, p100, p3.
4. `peringatan.py` (boleh gagal) -> `peringatan.json` (+ salinan ke `public/data/`): nowcast CAP BMKG + gelombang maritim.
5. `sungai.py` -> `sungai.json`; cache `data/raw/banjir/sungai_titik.json` dan `sungai_ambang.json` (di-commit). `SUNGAI_B_TITIK=6` titik per hari untuk ambang 29 tahun (~760 panggilan kuota per titik).
6. `rob.py` -> `rob.json` (Open-Meteo Marine, IOC gauge, PDF BMKG lewat `pdftotext`/poppler); `ROB_ARSIP_LOKASI=15`; `rob/titik.json` dan `rob/ambang.json` di-commit.
7. `bahaya.py` -> `bahaya.json` (InaRISK, nilai tertinggi 10 titik per kecamatan); `kejadian.py` -> `kejadian.json` (BNPB CKAN). Hanya dijalankan bila berkas belum ada.
8. `riwayat.py` -> `riwayat.json`, `riwayat_grid.json`, `riwayat_grid_longsor.json`.
9. `status.py` -> `status.json` + `meta.json`; `posko.py` -> `pusat_kec.json`, `posko.json`.
10. `uji_balik.py` -> `validasi.json` (jalan lokal/manual; mentah ERA5 gzip di `data/raw/banjir/uji_balik/`). `wilayah.py` dan `umum.py` adalah pustaka.

`param_banjir.json` ada di `public/banjir/data/` dan TIDAK ditulis skrip mana pun (ditulis tangan dari `RISET-PARAMETER.md`; dokumen itu menyebut jalurnya `public/data/param_banjir.json`, salah).

Dokumen riset: `RISET-PARAMETER.md` (regulasi Perka BNPB, parameter kuat vs lemah), `RISET-ROB.md` (sumber rob, 403 dan Cloudflare), `RISET-UJI-BALIK.md` (hasil uji balik, kuota).

## Aturan & invarian

- Status per kecamatan 4 hari (`HARI = 4`), level 0 Normal, 1 Waspada, 2 Siaga, 3 Awas; aturan pertama dari atas yang terpenuhi (`status.py` `level_banjir` baris 68, `level_longsor` baris 81).
- Jendela hujan: `H3 = d-1..d+1` (`GESER = -1`, baris 58). Ambang H3 = 50/100/150 x K, `K_BANJIR` 0,8 (jadi 40/80/120 mm), `K_LONGSOR` 0,6 (30/60/90 mm), `A7_BASAH` 25 mm, `SM_JENUH` 0,45 m3/m3, `RADIUS_SUNGAI_KM` 25. Bahaya InaRISK B: 0,33 dan 0,66.
- Banjir bandang: `I >= 30` mm/jam dan B >= 0,33 (Siaga). Ensemble: `P3 >= 0,5` dan B >= 0,33 (Siaga). Sungai: kelas RK dari debit tertinggi hari d..d+2 vs Q2/Q5/Q20.
- `status.json` hanya memuat kecamatan dengan level > 0; kunci `"prov|kab|kec"`.
- Ambang dipilih dengan ERA5 sebagai prakiraan sempurna pada 2016-2021 dan lolos 2022-2025; prakiraan IFS lebih basah dari ERA5 = status lebih sering naik daripada di uji balik. Longsor DIBI 2024 dibuang (hanya 219 kejadian).
- Python stdlib saja. Kuota Open-Meteo gratis 600/menit, 5.000/jam, 10.000/hari dibagi hujan, ansambel, sungai, rob. Ubah jumlah titik = hitung ulang.
- Ubah ambang = perbarui `status.py`, JS di `public/banjir/index.html` (cermin aturan), jalankan `uji_balik.py`, perbarui `validasi.json` dan `RISET-UJI-BALIK.md`.
- Dilarang membobol tantangan Cloudflare (`signature.bmkg.go.id` tidak dipakai). `www.bmkg.go.id` hanya dengan UA peramban biasa tanpa cookie.
- Angka tanpa sumber kuat (efek peringatan dini, VSL, harga alat) wajib tampil dengan rentang dan label asumsi.

## Ranjau yang pernah meledak

- Cache banjir dipulihkan dengan daftar jalur berbeda dari simpanannya, sehingga setiap publish mengirim data banjir lama yang di-commit (`6622f26`). Jalur `public/banjir/data` + `data/raw/banjir` HARUS identik di `banjir.yml` (save+restore), `data.yml`, `titik.yml`, `terbit.yml`.
- Open-Meteo mengirim JSON rusak: ulangan di `banjir.yml` (`dd0f47c`, 13 Okt 2026 gagal 5x berturut-turut).
- Kuota habis oleh isi-ulang arsip ambang sungai; karena itu hanya 6 titik per hari dan ansambel dijalankan sebelumnya. `ansambel_hujan` gagal = `status.py` mengabaikan `hujan_ansambel.json` basi berdasarkan tanggalnya.
- Ambang H3 awal (BMKG 100/150 mm) terlalu tinggi untuk hujan sel 0,25 derajat; direkalibrasi lewat uji balik (`7cadb25`).
- Docstring `status.py`/`bahaya.py` menyebut jalur `scripts/data/...`; jalur sebenarnya `scripts/banjir/...`.
- Siaga banjir tidak terbukti punya skill di Kalimantan dan Bali-NT (CI PSS memuat 0).
- Salinan iCloud `posko 2.py` pernah ikut commit (`b6f645f`), dihapus `3b90271`. Jangan sunting/jalankan berkas "* 2.*".
- 403: `peta-maritim.bmkg.go.id/public_api`, query ad-hoc dashboard rob, unduhan stat_by_wil BNPB (Cloudflare).
- `bahaya.json` dan `kejadian.json` hanya dibuat bila belum ada; data basi tidak diperbarui otomatis.

## Gerbang yang menghakimi

- Swa-uji tiap skrip: `python3 scripts/banjir/<skrip>.py uji` untuk hujan, ansambel_hujan, sungai, bahaya, kejadian, status, uji_balik, rob, posko, peringatan, riwayat (persis daftar di `banjir.yml`).
- Uji balik: `python3 scripts/banjir/uji_balik.py` (ambil sel yang belum ada, hitung bila lengkap; melanjutkan bila kuota habis) dan `python3 scripts/banjir/uji_balik.py uji` (luring, data mainan). Ukuran: POD, FAR, CSI, PSS, ETS dengan bootstrap blok 1.000 ulangan; usul aturan diterima hanya bila CI95 selisih ETS di periode uji > 0.
- Kesegaran data tayang: langkah "Periksa kesegaran data yang tayang" (banjir > 30 jam = 503).
- Layar dibuktikan di browser preview (tidak ada build).

## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode: docstring scripts/banjir/*.py, banjir.yml, RISET-PARAMETER/ROB/UJI-BALIK.md, git log (6622f26, dd0f47c, 7cadb25, 3b90271).
- 2026-10-16 · sekolah.json dan fasilitas.json hanya mencakup 9 provinsi karhutla; jumlah sekolah/faskes di luar itu dibuang, bukan 0 (dampak.py kec_tercakup_*). Batas kecamatan berbagi simpul persis, jadi tetangga = berbagi sisi dan gabungan poligon cukup penghapusan sisi bersama. status.json hari ke-0 bisa lebih tua dari tanggal sebenarnya (13 Okt saat 16 Okt): seri_status menolak mencatat bila beda dari hujan.hari_ini.
- 2026-10-16 · Memecah skrip inline jadi berkas eksternal: blok startup (mulai.js: async IIFE muatData/Peta.init) harus dimuat TERAKHIR, kalau tidak bukaTab(hash) bisa menyentuh Posko/Sarana sebelum posko.js ter-load (balapan baru karena skrip eksternal memblokir parser; inline tidak). Bukti identik: tangkapan playwright 14 tab x 2 viewport dengan Math.random di-seed, banding md5 teks/HTML/PNG; 390-keputusan berisik di baseline sendiri.
- 2026-10-16 · L5: <base href=/banjir/> wajib karena rute /banjir/<tab>/ bertitik-miring bikin path relatif salah. Tab id 'sim' (bukan simulasi) mengikuti registry; ALIAS simulasi->sim. Tab disembunyikan tetap bisa dibuka lewat URL kecuali section hidden (jatuh ke Peta).
- 2026-10-16 · L6: PilihCantik.pasang() jangan dipasang dua kali (klik jadi buka-tutup); insight.js memakai penjaga window.__pilihPasang. Menu PilihCantik menutup saat ada scroll, jadi uji Playwright harus scroll dulu baru klik. Nama tempat dan tanggal dalam judul dibungkus span translate=no supaya kunci kamus EN tidak pecah per nama. Berkas kejadian_aktif_awal.json belum ada: 404 di konsol sampai workflow memuatnya (tak bisa dicek tanpa 404).
- 2026-10-16 · 2026-10-16 paritas: seg Insight sudah di kepala kartu seperti karhutla (Kartu.ex menaruh .ctl di header); selisih sebenarnya override padding/h3 mobile. f2() di peta.js menulis koma mati: pakai F2 (tren.js) agar i18n menukar titik di EN. Nama tempat di SVG rob perlu translate=no (Tulis->Write). 404 data opsional: berkas kosong sah di-commit + pipeline menulis kosong bila belum ada.
- 2026-10-16 · Berita/Dampak/Foto banjir: berita.json & dampak.json banjir tidak dibuat banjir.yml (belum ada langkahnya); API /api/foto belum punya kategori/bencana banjir sehingga galeri selalu kosong; CSS berita disalin dari blok #berita index.html, dampak/foto @import css karhutla.
- 2026-10-16 · Foto banjir memakai public/foto.js via window.FOTO_BENCANA (shim banjir/foto.js dimuat sebelum ../foto.js). Cache tepi /api/foto 60 dtk: foto yang baru disetujui baru tampil setelahnya. Port 8791 bisa dipegang worktree lain: cek lsof cwd sebelum percaya hasil curl.
- 2026-10-18 · 2026-10-18 · Paket D: /banjir/laporan 404 di wrangler (html_handling none) sampai ada baris di HTML_RUTE src/worker.js; laporan.json kab tak punya kode Kemendagri (peta kab tanpa kode) jadi kode = prov + urutan kab; penduduk/kab lampau dibawa dari laporan.json sebelumnya karena seri_status hanya per provinsi.
- 2026-10-18 · Peluang ansambel butuh sebaran per anggota (m2/m3) di hujan_ansambel.json; H3 hari 0 = hujan teramati kemarin + m2. Uji balik ERA5 sempurna membuat d0..d3 identik, jadi ketepatan per waktu-tunda hanya bisa dari prospektif.json. sed -i di macOS butuh '' (gagal diam di rantai &&); wrangler dev mati bila dipipa ke head.
- 2026-10-18 · Hansen GFC bukan COG (strip 1 baris LZW, 40000x40000) tapi mendukung Range: baca per blok 32 baris, tanpa unduh 85-281 MB. HydroBASINS: Indonesia hampir seluruhnya di file au, bukan as. S1 RTC Planetary Computer float32 prediktor 3, citra.buka_ubin hanya prediktor 2. html_handling none: /banjir/laporan-das butuh rute di src/worker.js, .html langsung 200.
- 2026-10-18 · Korelasi tingkat DIBI vs hutan hilang (n=14, kedua deret naik, pencatatan membaik) tak bisa dibedakan dari kebetulan di 14 dari 16 daerah (ambang |r|=0,53); kartu hanya kalimat, r di RISET-BUKTI.md. Jendela S1 'sesudah' mulai tepat di tanggal kejadian; validasi menolak sesudah < kejadian.
- 2026-10-19 · Mesin genangan inersia hanya memindah air lewat 4 sisi: penyiapan DEM (Priority-Flood/batas cekungan) WAJIB 4-tetangga, kalau 8 lubang yang bocor diagonal jadi perangkap (Sukajaya: kolam 8 m tak surut, langkah 3x). Uji: tests/banjir sim_genangan 'DEM siap mesin'. Mesin juga butuh q-terpusat theta 0,9 (theta 1 pecah, 0,7 papan catur).
- 2026-10-19 · Catatan metode paket A menulis jendela peluang 24/48/72 jam, padahal status.py menghitung HARI status (hari 0, 0..1, 0..2; H3 hari 0 memuat hujan kemarin). Ikuti kode (HORIZON, catatan prakiraan72.json). Bab Metode baru ditaruh SETELAH bab lama supaya rujukan 'bagian N' tidak bergeser; contoh bab harus punya cadangan angka tetap bila berkas (prakiraan72/prospektif) belum ada di data lokal.
- 2026-10-19 · Ukur INP layar 3D MapLibre di Chrome for Testing + --use-angle=metal (GPU nyata), bukan headless-shell swiftshader: swiftshader memberi 1-10 dtk dua-frame karena render medan, Metal 21-135 ms untuk kode yang sama. Uji vm lintas realm: pakai Array.from sebelum deepStrictEqual.
- 2026-10-19 · Longsor: sm hujan.json (3-27 cm) jangan dipakai sebagai kadar air kolom 1,5 m (Sukajaya sm 0,43 -> lereng merah di jam 0 dengan hujan 5 mm). Model ember: m = (a7 x (1-HILANG) + resapan)/225 mm; sm hanya penanda jenuh status.py.
- 2026-10-19 · peluang_banjir: hujan_ansambel.json lokal 6 hari basi dan tanpa m2/m3/q, jadi diunduh ulang sekali (1780 kuota). Agregat kabupaten/provinsi/nasional = MAKSIMUM titik 1 derajat (batas bawah P(ada titik lewat ambang)); kab tanpa sinyal dibuang ke tanpa_sinyal agar < 400 KB (231 KB). pasang_astro: bobot diurnal/semi 80/20 itu ASUMSI, repo tak punya konstanta harmonik; perigee presisi rendah meleset ~1,5 jam/0,25% dari publikasi.
- 2026-10-19 · Peluang.kartu (inti/peluang.js) memakai besaran.label sebagai awalan label segmen: label ambang yang diawali besaran.label dan satuan <=2 huruf jadi 'mm 50 mm+'. Pakai besaran 'Curah hujan harian' dan ambang 'Hujan 50 mm atau lebih per hari'. Vonis tetap satu (ambang pertama) walau segmen ambang diganti. uji_balik peluang.json harus string siap tampil (Peluang.batasan mencetak nilai apa adanya).
- 2026-10-19 · 2026-10-19 B3: prospektif.json 'live 404' ternyata salah ukur: worker poskokarhutla.*.workers.dev yatim (semua /banjir/data 404), yang tayang centurisk97 menjawab 200 (prospektif pertama tercatat 19 Okt karena run sebelumnya dibatalkan timeout). Cek data tayang lewat worker pemegang domain. Rute /banjir/k/B… tidak dilayani selama registry warisan:true (src/bencana.js jalurKejadian): URL kejadian pakai /banjir/?k=B0007 (KejAktif.PATH_K=false); ubah ke true setelah registry. Overpass: python macOS 3.9 gagal SSL handshake ke overpass-api.de (CI 3.12 ok), pakai UNIT_MENTAH=berkas untuk uji lokal; Overpass wajib User-Agent (406 tanpa). Scratchpad dipakai bersama sesi lain: berkas bernama umum (uji.mjs) tertimpa, beri nama unik. Berkas data kejadian_aktif_* bisa di-commit sesi lain saat kamu sedang menimpanya untuk preview: cek git ls-files sebelum menghapus.
