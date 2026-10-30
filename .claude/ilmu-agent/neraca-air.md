# Ilmu neraca-air

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/neraca-air.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca neraca-air`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus neraca-air "..."`.

## Peta berkas & tabel

Wilayahmu: `scripts/air/neraca/**`, `public/data/neraca_air/**`, `data/kajian-bnpb/neraca-air/**` (per 26 Okt 2026).
Rancangan dan keputusan pemilik: `data/kajian-bnpb/neraca-air/RANCANGAN.md` (bagian "Keputusan pemilik (26 Okt 2026)"
menang atas isi di atasnya).

- `topologi.py` (sekali, lokal): HydroBASINS v1c **level 09** (`data/raw/banjir/das/hybas_as_lev09_v1c.zip`, dibaca
  `lahan.baca_shp` dari scripts/scrape) x `data/kajian-bnpb/data/air-jawa/peta_kab.geojson` (119 kab, kode Kemendagri)
  x sel iklim 0,1 derajat, lewat kisi sampel 0,01 derajat (`rasterkan` = scanline even-odd, sisi dikelompokkan per
  baris). Keluaran `topologi.json`: `subdas{id: {nd, km2, kab{kode: {sel: km2}}}}`, `titik{id_waduk: subdas}`, `meta`.
  Id negatif `-kode` = celah pantai tanpa sub-DAS, langsung ke laut.
- `iklim_global.py` (JALUR UTAMA sejak 27 Okt 2026): hujan CHIRPS v2.0 0,05 derajat via IRI (netCDF-3, `chirps` potongan 5 tahun) +
  ET0 FAO-56 PM bulanan dari NASA POWER 88 titik 0,5 derajat (`power`, via curl), `gabung` -> `iklim.json` (p, et0, elev, dan
  p_era5/et0_era5 di 18 sel DIY sebagai pembanding). Mentah di `data/kajian-bnpb/neraca-air/mentah/{power_jawa,chirps_jawa}.json`.
- `iklim.py`: PEMBANDING ERA5 Open-Meteo (`era5_seamless`, kuota ~54 sel/hari); jangan jalankan di atas iklim.json hasil global.
- `masukan_bps.py` (`ternak`, `industri`) + `tarik_bps.mjs` (Playwright tahan galat): `masukan/{ternak,industri}_kab.csv` dari tabel BPS.
- `glofas.py` (tarik debit muara 12 sungai), `validasi.py` (NA-06, kalibrasi alpha/k), `hasil.py` (HASIL.md otomatis).
- `kebutuhan.py`: `kebutuhan.json` per kab: penduduk 2025/2030 (WorldPop 2026 diskala ke BPS Proyeksi 2010-2035
  per provinsi), pangsa perkotaan dipaskan ke BPS, domestik SNI 2002 (120/60 L), `irigasi_ha` (= `irigasi_permukaan_ha`
  kab_jawa.csv), ternak/industri dari `data/kajian-bnpb/neraca-air/masukan/{ternak,industri}_kab.csv` (kosong = null).
  `bulanan()` dipanggil neraca.py: irigasi gaya KP-01 per bulan dari ET0/hujan kab; konsumtif = total - 30% irigasi.
- `neraca.py`: bak Thornthwaite-Mather per sel (+ tampungan linear), routing per sub-DAS hulu->hilir (`rute_bulan`),
  waduk (target = rerata aliran tanpa waduk), transfer Tarum Barat, indikator. Keluaran `public/data/neraca_air/`
  `kab.json` (5 skenario x 12 bulan), `ringkas.json`, `aliran.json`.
- `waduk.csv`: 6 waduk + Tarum Barat, satu sumber dan label per baris (hanya Kedung Ombo dan Tarum Barat `resmi`).
- `data/kajian-bnpb/neraca-air/mentah/bps/*.txt`: tabel BPS hasil `data/kajian-bnpb/bangun/air_jawa_bps.mjs`
  (Playwright; tabel dinamis tipe 2 BPS hanya merender tahun terakhir, pakai tabel statis tipe 1).

## Aturan & invarian

- Semua angka neraca `estimasi-model` sampai NA-06 (GloFAS + BPS 2020) lolos. Parameter bak `ASUMSI_*` di neraca.py.
- Konservasi massa diperiksa tiap jalan: P = ETa + dS tanah + laut + keluar himpunan + pasok + dS waduk (galat < 0,1%).
- Subset jujur: sub-DAS dipakai hanya bila semua sel dan semua hulunya ada di iklim.json; kab masuk keluaran hanya bila
  semua irisannya di himpunan itu.
- Data kosong = null, bukan 0 (ternak, industri). Jangan menulis potret angka di uji; uji = invarian + angka tangan.
- Kemarau = Juni-Oktober (keputusan pemilik 1). Skenario klim, 1997, 2015, 2019, 2023. Kebutuhan 2025 + 2030.
- Tidak ada halaman web (keputusan pemilik 7).

## Ranjau yang pernah meledak

- Checkout di iCloud Drive (`~/Documents`): fileproviderd bisa menahan baca `__pycache__/*.pyc` belasan menit. Jalankan
  dengan `PYTHONPYCACHEPREFIX=<scratchpad>/pyc`. Membaca zip HydroBASINS 52 MB pertama kali juga bisa lama.
- Kuota Open-Meteo: 182,6 bobot per sel untuk 35 tahun x 2 variabel; ~27 sel/jam, ~54 sel/hari. Jangan paralel
  dengan pipeline lain yang memakai Open-Meteo dari IP yang sama.
- SNI 6728.1:2015 tidak terbuka gratis (BSN menjual); koefisien yang dipakai dari SNI 19-6728.1-2002 (PDF BIG).

## Gerbang yang menghakimi

- `python3 scripts/air/neraca/{topologi,iklim,kebutuhan,neraca}.py uji` (tanpa jaringan, tanpa zip).
- `npm run uji:agen` sesudah berkas baru masuk index git (sesi induk yang `git add`).
- Pemeriksa: `validasi-model` untuk metode/angka; kamu tidak memverifikasi kerjamu sendiri (AGENTS.md §3.2).

## Kasus
- 2026-10-27 · urllib (Python 3.15) ke NASA POWER menggantung berpuluh detik per panggilan padahal curl 1-2 dtk dari mesin yang sama (88 titik: ~2 jam vs 1 menit); untuk POWER pakai subprocess curl --max-time. Tahu dari faulthandler: macet di recv_into dalam ambil().
- 2026-10-27 · IRI Data Library CHIRPS: biaya permintaan ~ jumlah bulan, bukan luas (kotak 1x1 derajat x 420 bulan timeout >100 dtk); satu permintaan 420 bulan terpotong max-time 600 dtk dengan HTTP 200 dan berkas terpotong. Pecah per 5 tahun (60 bulan ~4,7 MB, 4-8 mnt), curl --max-time 900, coba ulang 3x; baca_nc3 menolak berkas terpotong lewat offset.
- 2026-10-27 · Tabel BPS: URL dinamis (#3) ber-token sama dipakai lintas host provinsi (jateng.bps.go.id dll) dengan ?year=2024, jadi satu token = satu tabel kab per provinsi. Tabel statis tipe 2 tidak muncul di innerText: ambil 'table tr' per sel (tarik_bps.mjs bagian #TABEL). Mesin pencari: DuckDuckGo memblokir cepat, Brave via curl+UA browser jalan tapi juga kena batas laju.
- 2026-10-27 · flood-api.open-meteo.com: batas per JAM (429 'Hourly API request limit') habis oleh kisi multi-lokasi x deret panjang. Cari sel sungai dengan kisi 1 tahun saja, lalu tarik deret penuh satu sel; tunggu reset jam.
- 2026-10-27 · Label statistik harus sama dengan hitungannya: jumlah persentil-20 bulanan BUKAN persentil-20 total musim (68 vs 73 kab negatif); N80_kemarau kini persentil-20 dari 35 total Jun-Okt tahunan. Arah bias skenario kering bergantung tahun (1997 memadamkan aliran, 2019/2023 melebihi GloFAS di Jratunseluna): jangan menulis 'batas atas'. Pilih parameter dengan data tahun kering, bukan median rerata saja.
- 2026-10-29 · 2026-10-29 GRACE JPL mascon: Hyrax OPeNDAP POCLOUD 404 (.dmrpp tak ada) -> unduh .nc 46 MB dengan Bearer EARTHDATA_TOKEN dari archive.podaac.earthdata.nasa.gov (HTTP 200, tanpa EULA terpisah); HDF5 butuh h5py (venv lab). Dua larik jatuh di bulan sama (2012-01, 2015-04) -> geser lewat time_bounds. CI Sen dengan n_eff harus MEMBESARKAN varians S (n/n_eff), bukan mengganti n. 119 kab hanya 7 mascon efektif: vonis hindcast atas mascon, bukan kab (menghitung ganda).
