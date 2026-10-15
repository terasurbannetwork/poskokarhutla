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
