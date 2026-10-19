# Ilmu pipa-data

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/pipa-data.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca pipa-data`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus pipa-data "..."`.

## Peta berkas & tabel

Semua keluaran ke `public/data/*.json` (kontrak dengan layar). Berkas besar/perantara di `data/raw/**` (sebagian besar tidak di-commit, lihat `.gitignore`). Tiga workflow menjalankan skrip ini, semuanya satu `concurrency: group: data`.

**Harian `data.yml`** (cron `20 14 * * *` = 21.20 WIB, timeout 90 mnt), urutan:
- `scripts/data/harian.py` (FIRMS_MAP_KEY): titik panas 7 hari (`SENSOR` baris 19, 4 sensor NRT), DBSCAN kompleks (`dbscan` baris 123), FWI (`cuaca_fwi` baris 201), BNPB. Menulis `hotspot.json`, `hotspot72.json`, `hotspot24.json`, `kluster.json`, `kluster_awal.json`, `kluster_geo.json` (`pecah_kluster` baris 501), `fwi.json`, `fwi_state.json`, `wilayah.json`, `bnpb.json`, `meta.json`; memanggil `harian30.py` -> `harian30.json`. Memakai `aturan.py`, `fwi.py`, `garis_api.py` (garis luar organik, bukan lambung cembung), `geo/batas.py`.
- `konsesi_kompleks.py` -> `kompleks_konsesi.json` (hanya jenis lahan, tanpa nama perusahaan). `warga/titik24.py` -> `titik24.json` (dibaca worker untuk lencana lapor warga).
- `ansambel.py` -> `fwi_ansambel.json` (IFS 51 anggota); `tanah.py` -> `tanah.json` + cache `data/raw/tanah_klim.json`.
- `berita.py` -> `berita.json` + arsip `data/raw/berita/arsip.json`; `video.py` (YOUTUBE_API_KEY, lewat diam bila kosong) -> `video.json`.
- `posko.py` -> `posko.json`; `preventif.py uji|ringan` -> `preventif.json`; `scrape/akses.py` -> `akses.json`; `operasi.py` -> `operasi.json`; `iklim.py` (hanya Senin) -> `iklim.json`; `keputusan.py` -> `keputusan.json`; `bnpb_gis.py` -> `inarisk.json`, `bpbd.json`; `udara_rekom.py` -> `udara_rekom.json`; `citra.py` -> `citra.json` + `citra/` (PNG, cache `citra-`); `asap.py` -> `asap.json`; `scrape/metar.py` -> `metar.json`; `penerbangan.py` -> `penerbangan.json`; `dampak.py` -> `dampak.json`; `cuaca_jam.py` -> `public/data/cuaca/<lat>_<lon>.json`; `ringkasan.py` -> `ringkasan.json`.

**3-jam `titik.yml`** (cron `40 */3 * * *`): `harian.py` dengan `FWI=0` (FWI dipakai ulang bila `hari_ini` sama), lalu konsesi_kompleks, titik24, posko, operasi, ringkasan, `cuaca_jam.py` (`CUACA_SEL_MAKS=60`), `sebaran/prospektif.py`, `citra.py` (`CITRA_DETIK=300`), `og/buat.py`; lalu `terbit/versi.py` + `wrangler deploy`.

**Bulanan `statis.yml`** (tanggal 2, `0 19 2 * *`): `scrape/tarik_osm.py` (fasilitas, jalan, sungai) -> `scrape/fasilitas.py`, `kanal.py`, `akses.py graf` (`data/graf_jalan.json.gz`), `penduduk.py`, `scrape/konsesi.py`. Satu-satunya yang `git commit` berkas statis: `fasilitas.json`, `kanal.json`, `jalan.geojson`, `penduduk.json`, `lahan/konsesi.geojson`, `data/raw/konsesi/sanksi_karhutla.json`.

**Hanya lokal/manual (tidak di workflow):** `firms.py` (arsip VIIRS 2015+ -> `data/raw/firms/viirs.csv`), `sejarah.py` (`sejarah.json`), `riwayat_grid.py`, `musim.py`, `scrape/lahan.py`, `osm.py`, `udara.py`, `daops.py`, `luas_satelit.py`, `sekolah.py` (butuh xlsx ~/Downloads), `grup_perusahaan.py` (internal, tidak terbit). `pfvi.py` ada (sesi lain memegangnya, jangan disentuh).

**Skrip splice** `scripts/splice_*.py`, `statistik/splice_jejak.py`, `warga/splice_informasi.py`: menyisip ke `public/index.html` lewat jangkar; milik pipa-data hanya secara glob, isinya tampilan.

## Aturan & invarian

- Python 3.12 stdlib saja, tanpa `pip install` di Actions. Shapefile/TIFF/netCDF dibaca tangan (mis. `penduduk.py baca_tiff`, `iklim.py`).
- Status kompleks (`aturan.py`): kelas FWI BMKG apa adanya (`kelas_fwi` <2, <7, <14, selebihnya). Keparahan S1-S3 (`keparahan` baris 66): S3 bila `px24 >= 10` atau (bertahan >= 4 hari dan `px24 >= 5`). Cuaca hanya MENAIKKAN status (`status` baris 77, S3 minimal level 2). Prioritas (level 3) = `px24 >= PRIOR_PX` (15) DAN FWI >= 7, atau FWI tak ada (`prioritas` baris 90). Level "tanggap darurat" tidak diberikan model.
- Gunung api (`aturan.GUNUNG_API`, radius 3 km) tidak dijadikan kompleks; titiknya tetap di `hotspot.json`.
- Hitungan utama setara SiPongi: sensor M, N, N20 (tanpa NOAA-21), semua keyakinan, hari kalender WIB. Kejadian api: DBSCAN eps 1,5 km, minPts 1, jendela 7 hari, aktif <= 72 jam (168 jam di gambut).
- FWI Van Wagner 1987, faktor panjang hari khatulistiwa. `fwi_state.json` menyimpan FFMC/DMC/DC per sel 0,5 derajat pada H-2 dan dilanjutkan tiap hari. Sel baru dipanaskan dari ERA5 archive 300 hari (25 sel per panggilan), sisanya forecast `past_days` 8 (atau 92 bila ada sel tanpa keadaan).
- Kuota Open-Meteo ~10.000/hari dibagi: `ansambel.py` per kotak 1 derajat (20,4 per lokasi), `cuaca_jam.py` bobot 3,3 per sel (<= 400 sel = <= 1.320), `asap.py` 799/hari. Ubah jumlah titik = hitung ulang kuota di docstring.
- `kluster.json` lengkap dibaca skrip Python; `kluster_awal.json` (tanpa poligon/api24) dan `kluster_geo.json` dibuat dari padanya, urutan fitur HARUS sama.
- Keputusan pemilik 14 Okt 2026: situs tidak menampilkan nama perusahaan/grup/izin. Data bernama hanya di `data/raw/konsesi/` (tidak terbit).
- Berkas keluaran lokal yang tak dibuat ulang di CI dipulihkan dari repo oleh langkah "Pakai lapisan statis dari repo" (`git ls-files ... | git checkout HEAD --`). Berkas baru yang di-commit tapi tidak dibuat CI WAJIB ditambah ke daftar itu di data.yml, titik.yml, banjir.yml, terbit.yml.

## Ranjau yang pernah meledak

- Salinan iCloud/Finder "* 2.*" ikut commit `b6f645f`: `data 2.yml` ikut terjadwal (jalan ganda versi lama), `berita 2.py`, `operasi 2.py`, `splice_ops 2.py`, JSON `* 2.json`. Dibersihkan di `3b90271`, `.gitignore` kini menolak `* 2`, `* 2.*`. Jangan sunting/jalankan berkas bernama "... 2.*" bila muncul lagi.
- Cache `public/data` lama menimpa berkas yang di-commit tapi tak dibuat ulang di CI (`dd0f47c`); obatnya langkah `git checkout HEAD --` di atas. Daftar itu harus sama di empat workflow.
- Citra satelit: dulu hanya run harian yang membawanya, publish lain membuangnya (`ec6fd99`, cache `citra-` terpisah, jalurnya harus persis sama antara simpan dan pulihkan). `public/data/citra*` tidak di-commit.
- Gunung api muncul sebagai kompleks karhutla (Semeru, Merapi dll., 13 kompleks dalam 3 km pada 13 Okt 2026) karena data NRT tak membawa kolom `type`; ditambal daftar statis di `aturan.py`.
- Peer review 12 Okt: aturan lama "FFMC > 82 menaikkan kelas" membuat matriks runtuh (terlampaui hampir tiap hari kemarau); sekarang dibuang.
- SiPALAGA/TMAT membalas 403, BoM memblokir otomatis (`iklim.py` sengaja tidak memakainya), Overpass publik sering 504 (`statis.yml` timeout 240 mnt, `tarik_osm.py` mengulang). Data resmi BNPB yang diketik pemilik (`operasi_resmi.json`) dilindungi dari cache (`5c6e8ca`).
- Kunci API pernah ikut commit lewat `.env 2`; sekarang `.env*` di-ignore kecuali `.env.example`.
- Push bentrok: jalur commit (tanpa token Cloudflare) memakai `git pull --rebase && git push`; `statis.yml` juga. Tampilan diambil dari `origin/main` terbaru lewat `git checkout FETCH_HEAD -- . ':!public/data'`.

## Gerbang yang menghakimi

- `python3 scripts/data/fwi.py` (self-check `__main__` baris 142: uji baku Van Wagner-Pickett dan rantai 48 hari vs cffdrs; DMC/DC selisih < 0,006). Jangan ubah rumus tanpa ini.
- `python3 scripts/data/aturan.py` (assert status/keparahan).
- Blok "Uji aturan" di `data.yml`: `harian.py uji`, `geo/batas.py uji`, `posko.py uji`, `udara_rekom.py uji`, `berita.py uji` (akurasi sentimen vs `data/raw/berita/label_uji.json`), `citra.py uji`, `konsesi_kompleks.py uji`, `dampak.py uji`, `penerbangan.py uji`, `ansambel.py uji`, `tanah.py uji`, `penduduk.py paparan`, `scrape/akses.py uji`, `cuaca_jam.py uji`, `ringkasan.py uji`, `terbit/versi.py uji`. Jalankan yang menyentuh skripmu.
- Kesegaran: langkah "Periksa kesegaran data yang tayang" memanggil `/api/status` (titik > 8 jam, berita > 30 jam = 503, run merah).
- Peta penghubung: `node scripts/agents/ilmu.mjs pemilik <berkas>`.

## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode: docstring skrip di scripts/data, scrape, geo; data.yml, titik.yml, statis.yml; git log (b6f645f, 3b90271, ec6fd99, dd0f47c, 5c6e8ca).
- 2026-10-16 · GWIS Country Profile (Mei-Okt 2026) belum punya tahun 2026 dan Des 2025 masih 0 semua provinsi; luas 2026 hanya dari SiPongi (last Juli 2026). Cek: banf yearTo=2026 hanya mengembalikan 2025.
- 2026-10-17 · laporan.py membaca hotspot.json (jam relatif acuan, tgl_wib tanpa tahun: tahun diturunkan dari acuan, mundur setahun bila melampaui); laporan.json memakai arsip sendiri (_konteks) sehingga baru/titik tanggal tertua jendela tidak turun saat jendela bergulir; dipanggil dari ringkasan.py supaya CI tanpa scope workflow tetap menjalankannya
- 2026-10-17 · wt PFVI hanya ada di keadaan_pf (H-2), bukan di hari grid; harian.py kini mengekspos grid[i]['wt'] dan fwi.json menyimpannya supaya jalur FWI=0 (3-jam) tetap punya wt. Konstanta gambut repo: dampak.py (CO2 1,703, CH4 0,021, konsumsi 170-536 t/ha); brief 1,701 diabaikan.
- 2026-10-17 · musim_harian.json: tahun lampau + latar hanya dibangun lokal (musim_harian.py bangun <sd>, cache data/raw/firms/musim_harian_hitung.json); CI hanya menimpa hari arsip laporan, jadi berkas WAJIB di-commit dan ada di checkout CI. Definisi 'semua keyakinan' menghasilkan 2019 965.775 vs Nusantara Atlas 885.037 (+9%), 2022 +19%; latar nasional rata-rata 2 hari 16-17 Okt = 5.528 (didominasi 2019/2023), median 2.379.
- 2026-10-17 · Trase pabrik sawit: unduhan di resources.trase.earth/data/facilities-data/IDN_PO_mills_clean.geo.json (1452 titik, koordinat+kapasitas, tanpa RSPO/ISPO); pulp id_wood_mills_facilities_v2026_02_10.geo.json hanya 10 pabrik, kapasitas juta ton/tahun. lahan/konsesi.geojson sudah memuat nama+id per poligon, jadi cari.json tidak menyalin geometri.
- 2026-10-19 · FIRMS NRT tanpa kolom type; titik_palsu.py menurunkan sel statis (0,01 derajat, >=30 hari, >=8 bulan, >=2 tahun) dari arsip SP VIIRS 2019+2023-2025 (unduh ~70 panggilan/tahun, tanpa 5000/10mnt masalah). Sel kebakaran gambut OKI 2019 maks 4 bulan dan 1 tahun, tidak lolos. kumulatif.py: 2015 dari data/kumulatif_2015.json (M+N saja), tahun lain dari musim_harian.json. peluang.py periksa menolak sumber >90 huruf/berkas dan nama berkurung.
- 2026-10-19 · Perbandingan lintas tahun WAJIB setara sensor: 149% dari 2015 (semua satelit vs M+N) ternyata 82% setelah 2026/2019/2023 dihitung ulang M+N (data/kumulatif_mn.json). NOAA-20 SP ada sejak 2018-04 jadi 2019+ satu definisi. Filter titik palsu: sel dari titik_palsu.json kecuali kawah; bila berkas hilang di cache CI filter diam-diam mati, jadi harian.py mencetak ::warning::. Uji dampak offline: monkeypatch hotspot()/dt.now/KELUAR di skrip scratch, dua jalan (TITIK_PALSU=0/1).
- 2026-10-19 · Titik panas level titik 2026 tidak pernah tersimpan (hotspot.json 7 hari, harian30 agregat kab); khg_prioritas membangun khg_hari.json {tgl:{kode:n}} dan mengisi mundur dari FIRMS (284 hari = ~175 permintaan, >40 menit lokal, maka MAKS_REQ 45/jalan di CI). Jangan menunggu dengan 'until ! pgrep -f nama': pgrep cocok dengan shell loopnya sendiri. Data air nasional tak ada (public/data/osm hanya 63.json): kendala.py pakai jalan.geojson kelas 6 (sungai besar) + kanal.json; jalan desa/track tak di peta jadi label Roda empat sulit masuk berlebih.
- 2026-10-19 · Penimpaan hari dari hotspot.json basi harus dibatasi sampai tanggal acuan; kalau tidak hari sesudahnya jadi {} dan dianggap selesai (musim_lengkap palsu). Nama label harus sama dengan yang diukur (jalan.geojson hanya kelas 1-3: jangan klaim 'roda empat').
- 2026-10-19 · FIRMS SP (arsip standar) tertinggal ~3 bulan dari NRT dan jangkauannya berbeda per sensor (data_availability: VIIRS SP berakhir 30 Jun, MODIS SP 31 Jul); memilih SP/NRT dari umur hari membuat SP kosong (header saja) diterima sebagai 'nol titik' dan Agustus tercatat kosong. Pilih sumber dari /api/data_availability, tolak balasan bukan CSV, tandai hari curiga bila KHG kosong tapi nasional >= 300. harian30.py masih memakai BATAS_NRT=55 (cacat sama).
- 2026-10-19 · kejadian_karhutla_awal.json (harian.kejadian_awal, ditulis tiap harian.py main) = K#### level 3 saja, tanpa geometri, bentuk kejadian_<id>_awal.json; 194 kejadian ~48 KB (batas 50 KB): jangan tambah kolom/n_kab/tempat. Semua fitur kluster sudah aktif (jendela 72/168 j), jadi aktif selalu true; kode K#### dari id kluster (belum stabil lintas hari seperti mesin umum).
