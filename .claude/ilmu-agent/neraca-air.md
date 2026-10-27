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
- `iklim.py`: ERA5-Land Open-Meteo Archive harian `precipitation_sum` + `et0_fao_evapotranspiration` 1991-2025 ->
  jumlah bulanan per sel (`iklim.json`: `sel{"lat,lon": {p[420], et0[420], elev}}`). `--prov 34` = sel sub-DAS yang
  menyentuh provinsi + semua hulunya; `--semua [--maks N]` = seluruh Jawa. Bulan bolong ditolak, tidak diisi.
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
