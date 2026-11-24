# DESAIN-TEKNIS: Hulu ke hilir per kejadian

## 1. Berkas dan pemilik

Pemilik diperiksa dengan `node scripts/agents/ilmu.mjs pemilik <berkas>` pada 24 Nov 2026. Bila satu tiket menyentuh wilayah dua pengerja, tiket dipecah per pemilik.

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `scripts/banjir/bukti_das.py` (diubah) | `hitung_hansen(..., penanda=None, langkah=S)`; `S` dan `tally` mengikuti `langkah`; tanpa `penanda` keluaran identik | banjir |
| `scripts/banjir/hulu_hilir_dem.py` (baru) | `Medan`: ubin GLO-30 per bbox, `tinggi(lat, lon)`, `lereng(lat, lon)` memakai `scripts/longsor/lereng_dem.py` lewat importlib; `penanda_medan()` untuk `hitung_hansen` | banjir |
| `scripts/banjir/hulu_hilir_sempadan.py` (baru) | garis sungai, kapsul, `Koridor.rentang(lat)`, kelas sempadan | banjir |
| `scripts/banjir/hulu_hilir_hujan.py` (baru) | IMERG 30 menit per DAS (memakai `scripts/cuaca/imerg.py` `parse` dan pola folder, tanpa mengubahnya) dan CHIRPS per DAS dan peringkat | banjir |
| `scripts/banjir/hulu_hilir_resmi.py` (baru) | UNOSAT dan Charter, jalan (Overture lewat DuckDB lokal), desa (`public/geo/desa`), kesepakatan | banjir |
| `scripts/banjir/hulu_hilir_alert.py` (baru, bersyarat Q5) | alert hutan bertanggal untuk piksel tahun kejadian | banjir |
| `scripts/longsor/lereng_kejadian.py` (LT-15, diperluas HH-17 dan HH-18) | detektor bekas longsor tunggal: komposit Sentinel-2, objek, kalibrasi; memakai `scripts/data/citra.py` dan `lereng_dem.py` | longsor (kesepakatan lintas pemilik di HH-17) |
| `scripts/banjir/hulu_hilir_longsor.py` (baru) | pembaca keluaran detektor, golongan tutupan, agregat per DAS, kelas, zona, jarak ke sungai, pelebaran alur, PNG lokasi (pola `citra_banjir.py`) | banjir |
| `scripts/siklus/hulu_hilir.py` (baru) | perakit per kejadian: pilih DAS, panggil modul di atas, baca `banjir_gfm`, susun JSON R2 dan ringkasan, `validasi`, `uji` | siklus |
| `scripts/siklus/hulu_hilir_kriteria.py`, `hulu_hilir_kriteria.json` (baru) | kunci ambang, sidik, jangkar commit, prasyarat uji bahaya | siklus (+ validasi-model) |
| `scripts/siklus/hulu_hilir_bahaya.py` (baru) | uji bahaya level kecamatan dan level sel, vonis | siklus (+ validasi-model) |
| `src/siklus_kaji.js` (`MODEL`, `MAKS_R2` baris 12, pemeriksaan `hasil_r2` baris 103) dan migrasi baru | model `hulu_hilir` di `sk_kaji`, daftar izin berkas R2, saring BP per kab4 | warga-api |
| `scripts/siklus/saji.py` (`BATAS`, `TERLARANG`) | pola batas untuk `_hulu_hilir_v<n>.json` bila HH-06 menunjukkan lebih dari 100 KB; kunci terlarang tetap | siklus |
| `public/siklus/hulu_hilir.js`, `hulu_hilir.css` (baru), `public/siklus/kaji.js` (sambung) | kartu, bagan, peta, cetak A4 | siklus |
| `public/siklus/kaji_ulang.js` (sambung) | satu baris tautan | siklus |
| `src/kaji_ulang.js` (perakitan potret, memeriksa `KU_MAKS_POTRET` dari `src/kaji_ulang_rakit.js`) dan bagian kaji ulang di `src/hak.js` (`kuSahkan`) | enam angka beku masuk potret | warga-api |
| `.github/workflows/siklus.yml` (usulan, bukan sekarang) | tidak dijadwalkan di tahap ini (Q11) | mekanik-mesin |
| `tests/banjir/hulu_hilir*.test.mjs`, `tests/siklus/hulu_hilir*.test.mjs`, `tests/warga/siklus_kaji_hh.test.mjs`, `tests/agen/gerbang-hulu-hilir.test.mjs` | uji | banjir, siklus, warga-api, penulis-gerbang |

Roster tidak perlu diubah: pemilik berkas baru mengikuti glob yang ada (diperiksa dengan `node scripts/agents/ilmu.mjs pemilik <berkas>`), dan HH-00 hanya memeriksanya. Nomor migrasi diambil saat tiket HH-12 (cek `migrations/` dan reservasi di `data/kajian-bnpb/*`; terakhir yang terbaca saat ditulis 0171). Kolom `dummy` tidak dipakai (aturan 11 Nov 2026).

## 2. Hook `penanda` pada `hitung_hansen` (D1)

Sekarang `hitung_hansen(garis_das, konsesi)` menjumlah per baris lewat `tally(hilang, tutup, k0, k1)` (potongan `bytes`, tanpa gelung per piksel). Penanda butuh gelung per titik, jadi dipisah:

```
hitung_hansen(garis_das, konsesi, sedang=print, penanda=None, langkah=S, koridor=None)
  penanda(lat, lon_pusat_k, k) -> kunci kelas (str) atau None     # dipanggil hanya bila penanda diberikan, untuk titik hutan awal
  hasil tambahan: {kunci_kelas: Jumlah}; kunci memuat sub-DAS pemilik titik (penanda yang mencarinya, bagian ini tidak punya parameter sub_garis)
```

Aturan:

- Tanpa `penanda`, kode jalan persis seperti sekarang (tidak ada cabang yang menyentuh jalur lama selain parameter `langkah` dengan bawaan `S`). Golden: tidak ada golden luring `hitung_hansen` sekarang (`bukti_das.py uji` hanya menguji fungsi murni dan berkas hasil). HH-01 membuatnya lebih dulu: kelas `Ubin` palsu (lossyear dan treecover sintetis pada kisi kecil, tanpa jaringan) dan satu `Garis` DAS kotak, keluaran `Jumlah` dibekukan di `tests/banjir/fixtures/hitung_hansen_golden.json` SEBELUM menyunting apa pun; sesudah perubahan keluaran tanpa `penanda` harus identik byte demi byte. Prasyarat: sunting sesi K9 pada `bukti_das.py` sudah dikomit.
- Dengan `penanda`, gelung per titik hanya untuk titik hutan awal (selain itu `tally` lama). Perkiraan beban: DAS 5.600 km2 sekitar 390 ribu titik cuplik pada S=4, DAS 25.000 km2 sekitar 1,7 juta; Python biasa cukup (detik sampai menit), tanpa numpy.
- Sub-DAS: tiap titik dicari sub-DAS pemiliknya dengan indeks kisi 0,01 derajat atas cincin sub-DAS (`di_dalam` pada kandidat), bukan memindai semua sub-DAS per titik.
- Sempadan memakai `koridor` (objek dengan `rentang(lat)`) sebagai pengganti `garis_das` untuk satu putaran kedua dengan `langkah` terkecil dari uji HH-04; putaran kedua tidak mengulang DAS penuh.

## 3. Medan (`hulu_hilir_dem.py`)

- Ubin GLO-30 per derajat dari `copernicus-dem-30m` (COG, pola `scripts/banjir/genangan/medan.py`), disimpan di `data/raw/banjir/dem/` (gitignored). Unduh bertahap dengan jeda, hanya ubin yang memotong bbox DAS, dicatat berapa berkas dan berapa MB. URL dan ukuran Aceh diuji di HH-01 sebelum dipakai.
- `Medan.tinggi(lat, lon)`: piksel terdekat, NaN bila nodata atau di luar ubin (laut). `Medan.lereng(lat, lon)`: lereng dihitung per ubin GLO-30 sekali (`lereng_dem.jendela` lalu `lereng_persen` pada seluruh ubin, bertahap per pita baris), disimpan sebagai cache `data/raw/banjir/dem/lereng_<ubin>.f32`, lalu dibaca O(1) per titik; NaN bila tetangga NaN. Waktu satu ubin (sekitar 13 juta piksel, Python biasa) diukur HH-01; bila lebih dari sekitar 10 menit per ubin, HH-01 menggantinya dengan jendela 3x3 per titik cuplik (jauh lebih sedikit piksel) dan mencatat keputusannya.
- Titik diurutkan per ubin sebelum dicari; memori dijaga di bawah 400 MB (pita baris, bukan seluruh ubin sekaligus). Pembacaan Hansen lewat jaringan (HTTP Range) dan unduhan ubin dicatat jumlah berkas, MB, dan izin pemilik di HH-01 dan HH-06.
- `lereng_dem.py` milik `longsor`: paket ini hanya membacanya. Perubahan kontrak di sana harus mengabari `banjir`; uji `python3 scripts/longsor/lereng_dem.py uji` dijalankan di tiket kita.
- Audit DSM (HH-02): bandingkan kelas lereng GLO-30 dengan DEMNAS pada lembar yang ada (Jakarta, Bandung Raya, dan Aceh Tamiang bila diunduh pemilik) pada sampel titik hutan; kesepakatan kelas dilaporkan (tabel silang 3x3), tidak disetel.

## 4. Sempadan (`hulu_hilir_sempadan.py`)

- Garis sungai dari HydroRIVERS (shapefile `hydrorivers_as` dan `au`, dibaca `scripts/scrape/lahan.py baca_shp` seperti HydroBASINS; Q2) dengan `UPLAND_SKM` sebagai ukuran sungai. Lisensi dibaca di HH-03 dan dicatat; berkas mentah tidak di-commit.
- Kapsul: untuk titik pada garis lintang `y`, interval silang kapsul `(p1, p2, w)` dihitung analitik dalam meter lokal; satu interval cembung per ruas. Ruas diindeks per baris lintang 0,002 derajat (sekitar 220 m) supaya satu baris cuplik hanya memeriksa ruas yang berpotongan; tanpa indeks, gelung per baris per segmen (ribuan ruas kali puluhan ribu baris) terlalu lambat.
- Hasil `Koridor.rentang(lat)` dipotong dengan rentang DAS (`potong`), dipakai `hitung_hansen(..., koridor=...)`.
- Invarian: luas koridor tercuplik terhadap luas koridor geometri berbeda paling banyak 10 persen; jumlah empat kelas = luas koridor tercuplik.

## 5. Hujan (`hulu_hilir_hujan.py`)

- IMERG: koleksi 30 menit via OPeNDAP ASCII, subset jendela sel bbox DAS; `parse` dipakai dari `scripts/cuaca/imerg.py` (tidak disalin dan tidak diubah). Header Authorization hanya ke `*.earthdata.nasa.gov` dan `*.eosdis.nasa.gov` (pola `Teruskan`). Hanya satu koleksi per hitungan (Final, Late, atau Early; dicatat). Cache `data/raw/banjir/imerg_dap/<kj>.jsonl.gz` (gitignored).
- CHIRPS: struktur berkas diuji di HH-08 (strip atau ubin, kompresi, apakah Range berguna). Jeda minimal 2 detik, satu koneksi, cache `data/raw/banjir/chirps/`. Bila tidak bisa dibaca per jendela, peringkat dikurangi menurut Q9 dan sisanya "belum dihitung".
- Bobot sel: `bukti_das.iris_sel(garis, dy, sel)` dengan `sel` 0,1 dan 0,05; satu panggilan per DAS per ukuran sel, disimpan di keluaran.
- Waktu: IMERG slot UTC diubah ke WIB; uji menolak selisih zona waktu yang salah (T8).

## 6. Resmi (`hulu_hilir_resmi.py`)

- UNOSAT lewat HDX (`unosat-hdx` di `sumber.json`): cari paket menurut kejadian dan tanggal, unduh sumber daya yang berupa shapefile atau GDB dalam zip; bila hanya tautan peta web, status `tanpa_data`. Poligon dibaca `lahan.baca_shp`, luas dari `km2`. Zip mentah di `data/raw/banjir/resmi/` (gitignored). Lisensi per paket (`license_id`) dicatat di JSON.
- Charter dan Copernicus EMS: hanya mencatat ada atau tidaknya aktivasi untuk kejadian itu dan tautannya; data poligon dibaca hanya bila tersedia terbuka.
- Jalan: Overture segmen (tema transportation) lewat DuckDB lokal di venv `data/raw/lereng/venv` (pola `lereng_bangunan.py ekstrak`), kelas jalan yang dipilih dicatat; hasil antara di `data/raw/banjir/jalan/<kj>.parquet`. Tidak jalan di CI. `gis-bnpb-jalan-putus` hanya berdampingan.
- Desa: `public/geo/desa/<kab>.json`; sel genangan dan titik kisi 110 m dihitung terhadap poligon desa dengan `di_dalam`. Hasil hanya hitungan dan persen, nama desa publik administratif.

## 7. Perakit dan kriteria

`scripts/siklus/hulu_hilir.py` mengikuti pola `genangan_kaji.py`: `jalan --kj <KJ> [--kering]` (tanpa jaringan untuk uji), `vonis`, `uji`. `--kering` memakai fixture kecil di `tests/siklus/fixtures/`. Perakit tidak menghitung ulang GFM; ia membaca `banjir_gfm` dari R2 lewat rute baca berdaftar izin atau dari berkas lokal hasil `genangan_kaji.py`. Bila `banjir_gfm` belum ada, bagian genangan "belum ada" dan bagian lain jalan.

## 8. D1, R2, dan rute

| Hal | Rancangan |
| --- | --- |
| `sk_kaji` | `migrations/0122_sk_kaji.sql` punya `CHECK (model IN ('gempa','banjir_jam1'))` dan `CHECK` ringkas yang menuntut `$.rentang` berisi dua unsur kecuali status `menunggu_data`; SQLite tidak bisa mengubah CHECK, jadi migrasi HH-12 membangun ulang tabel (tabel baru, salin, hapus, ganti nama, indeks dan pemicu dibuat lagi). Urutan terhadap GS-08: HH-12 bergantung GS-08; bila GS-08 sudah menambah `banjir_gfm`, daftar model di migrasi HH-12 memuat keempatnya (`gempa`, `banjir_jam1`, `banjir_gfm`, `hulu_hilir`); bila belum, satu migrasi gabungan dengan GS-08 yang disepakati di tiket. CHECK ringkas dilonggarkan per model: `model = 'hulu_hilir' OR status = 'menunggu_data' OR rentang = 2`; ringkas `hulu_hilir` tidak punya rentang. `MODEL` di `src/siklus_kaji.js` diperluas bersama. Pola `hasil_r2` tetap `GLOB 'siklus/saji/kaji/KJ-*'` |
| Ringkas | JSON paling banyak 1.500 byte: enam angka, status, versi, sidik kriteria |
| R2 rincian | `siklus/saji/kaji/<kj>_hulu_hilir_v<n>.json` (konvensi GS-08), paling banyak 100 KB (`MAKS_R2`, `saji.BATAS`); HH-12 memeriksa dan, bila ukuran pilot HH-06 melebihi, menaikkan batas khusus pola ini dengan alasan; bentuk di bagian 9. Kunci JSON tidak boleh `total`, `jumlah_gabungan`, `rata` (`saji.TERLARANG`) |
| R2 berkas | `siklus/saji/kaji_berkas/<kj>/hulu_hilir/v<n>/` (PNG peta, titik hutan hilang 5 km, sel genangan), paling banyak 120 KB per PNG |
| Rute | mengikuti `DESAIN-TEKNIS` genangan-satelit 4 dan 5: ingest memakai rute `ingest/kaji` yang ada dengan token pipeline; berkas lewat satu rute baca dengan `:nama` dicocokkan daftar izin tetap; kunci R2 disusun server dari baris `sk_kaji`; BP disaring ke kab4 sesi |
| Kaji ulang | potret dirakit di `src/kaji_ulang.js` dan disahkan lewat `kuSahkan` (`src/hak.js`); memuat `{hulu_hilir: {versi, enam angka}}` bila ada dan tetap di bawah `KU_MAKS_POTRET`; tanpa tabel baru |
| Cache | `cache-control: private, no-store` untuk semua jawaban |
| Kuota D1 | tidak ada cron dan tidak ada pindai; satu kueri baca model per permintaan kaji (set-based) |

## 9. Bentuk JSON rincian (`hulu_hilir/1`)

```
{ "skema": "hulu_hilir/1", "kejadian": {"id", "mulai", "jenis", "tahun", "tahun_akhir_hansen"},
  "das": [ {"hybas_id", "luas_km2", "bbox", "n_subdas", "cakupan_dem",
            "lereng": {"awal": {"<25","25-40",">40","tak"}, "tahun": {"2001": {...}, ...}, "label": {"sebelum": {...}, "tahun_kejadian": {...}, "sesudah": {...}, "belum_tercakup": bool}},
            "zona": {"luas": {...}, "awal": {...}, "tahun": {...}, "genangan": {...}},
            "sempadan": {"lebar_m", "s", "luas_ha", "kelas": {...}, "porsi_hutan", "porsi_luas"},
            "subdas": [ {"id", "luas_km2", "lereng": {...}, "sempadan": {...}} ] } ],
  "longsor": {"jendela": {"sebelum": [..], "sesudah": [..], "lebar": bool}, "n", "luas_ha", "luas_tak_teramati_ha", "golongan": {"hutan_utuh", "terbuka", "tak_tentu"}, "per_kelas": {...}, "per_zona": {...}, "per_subdas": [...], "rasio": {"nilai", "selang"}, "jarak_sungai": {...}, "pelebaran": [...], "lokasi": [{"id", "pusat_5km", "png": ["sebelum", "sesudah", "swir"]}], "kalibrasi": {"sidik": "...", "presisi", "recall"}},
  "hujan": {"imerg": {"koleksi", "slot", "puncak", "puncak_wib", "mulai_naik_wib", "curah_jendela_mm", "slot_sah"}, "chirps": {"t3", "peringkat_3hari", "peringkat_bulan", "peringkat_ytd", "n", "tahun_dasar"}, "rasio"},
  "genangan": {"gfm": {...}, "resmi": [{"sumber", "lisensi", "luas_ha", "zona", "jalan_km", "desa_any", "desa_10"}], "kesepakatan"},
  "bahaya": {"status": "belum_dinilai|lulus|tidak_terbukti|tak_dapat_dinilai", "kecamatan": {...}, "sel": {...}},
  "metode": {"sumber": {...}, "ambang": {...}, "sidik_kriteria": "..."},
  "kosong": [ {"bagian", "alasan"} ] }
```

`validasi` menolak: jumlah kelas lereng tidak sama dengan hutan hilang DAS (selisih lebih dari satu ha per kelas), tahun kejadian digabung ke "sebelum", nol pada bagian yang berstatus kosong, kunci sebab (D8), ukuran lebih dari 100 KB, dan koordinat di luar sel 110 m atau kotak 5 km.

## 10. Anggaran (Q11, HIPOTESIS sampai HH-06 mengukur)

| Sumber | Anggaran per kejadian |
| --- | --- |
| Ubin GLO-30 | sampai 12 berkas atau 500 MB, cache lokal |
| Hansen Range | sampai 400 MB; sempadan S=2 sampai 1,6 kali lebih besar |
| IMERG | sampai 100 MB, sampai 600 permintaan |
| CHIRPS | sampai 300 MB, jeda 2 detik |
| Sentinel-2 (komposit, Range COG) | sampai 600 MB per kejadian, jendela dua sisi; PNG lokasi sampai 6 x 3 x 120 KB |
| Waktu satu kejadian di satu mesin | sampai 60 menit tanpa uji bahaya level sel |
| R2 | sampai 5 MB per kejadian (rincian paling banyak 100 KB) |

## 11. Yang tidak boleh disentuh

Daftar lengkap dari `scripts/banjir/genangan/j4_sidik.json` dan `SIDIK_DAFTAR` di `scripts/banjir/nowcast_jkt.py`, dibaca 24 Nov 2026. HH-00 memeriksa ulang karena sidik bisa bertambah.

Sidik J4: `public/banjir/data/bahaya.json`, `public/banjir/data/genangan/hulu.json`, `public/banjir/data/genangan/pompa.json`, `public/banjir/data/subsiden_literatur.json`, `public/banjir/sim_genangan.js`, `public/geo/kecamatan/31.json`, `scripts/banjir/genangan/PRAREG-J4.md`, `bersama.py`, `j4_kalibrasi.json`, `j4_medan_100m.json.gz`, `j4_operasi.py`, `kalibrasi_j4.py`, `kunci_j3.py`, `kunci_j4.py`, `mesin.mjs`, `petabencana.py`, `skor_j3.py`, `skor_j4.py` (semuanya di `scripts/banjir/genangan/`), `scripts/banjir/umum.py`, `scripts/banjir/wilayah.py`.

Sidik nowcast (`SIDIK_DAFTAR`): `scripts/banjir/PRAREG-NOWCAST-JKT.md`, `scripts/banjir/nowcast_jkt.py`, `scripts/banjir/genangan/petabencana.py`, `scripts/banjir/lab_genangan_radar.py`, `scripts/banjir/genangan/bersama.py`, `scripts/banjir/genangan/mesin.mjs`, `scripts/banjir/genangan/kunci_j4.py`, `scripts/banjir/wilayah.py`, `scripts/banjir/umum.py`, `public/geo/kecamatan/31.json`, `public/banjir/data/pusat_kec.json`. Manifes nowcast juga memuat fungsi `parse` dan konstanta `HILANG` dari `scripts/cuaca/imerg.py`.

Berkas itu hanya dibaca atau diimpor. Modul baru boleh mengimpor `umum.py` dan `wilayah.py` seperti `bukti_das.py` sekarang. Tidak disunting juga: `scripts/banjir/hulu.py` (Open-Meteo), `scripts/longsor/model_lhasa2.py`, `ambang_kab.py`, dan berkas bersidik `model_lhasa2.sidik`; `public/banjir/laporan-das.html` dan `bukti.js` tidak diubah selain oleh tiket GS-10 paket genangan-satelit.

## 12. Hubungan dengan paket lain

| Paket | Hubungan |
| --- | --- |
| `genangan-satelit` | memasok `banjir_gfm` (GS-07 dan GS-08); GS-10 memindahkan penggeser; paket ini tidak menghitung GFM |
| `kaji-ulang` | tautan dan potret enam angka lewat `src/kaji_ulang.js` dan `kuSahkan`; ketergantungan KU-06 dan KU-09; tidak ada tabel baru |
| `siklus` | Buku Besar, pencocok kejadian, hak, Kaji Cepat |
| `lereng-bangunan` | hanya memakai `lereng_dem.py`; bangunan di lereng tetap milik paket itu |
| `kerusakan-satelit` | bangunan rusak tetap di sana; tidak ada tumpang tindih dengan bekas longsor |
| `lereng-bangunan` (LT-15, LT-16) | detektor perubahan tutupan tunggal; paket ini memakai dan memperluasnya lewat HH-17 dan HH-18 |
| `longsor` (model, ambang, label) | penerima label dari D23; berkas model dibekukan sidik dan tidak disunting di sini |
| `paparan` (F2) | penduduk di area genangan dari `banjir_gfm`, tidak dihitung lagi |
| Sesi lain: tambahan kabupaten Sumatera di Bukti DAS (K9) | hanya dirujuk; keluaran `bukti/<slug>.json` dapat dipakai sebagai pembanding hutan hilang per tahun DAS |
