# DESAIN-TEKNIS: Genangan satelit per kejadian

## 1. Berkas dan pemilik

| Berkas | Perubahan | Pemilik |
| --- | --- | --- |
| `scripts/banjir/genangan_nasional.py` | opsi `--pra-sebelum-acuan` (ALGORITMA 1) untuk mode riwayat dan kejadian, status `tanpa_pra`; mode `kejadian --kj KJ-... --mulai TGL --kab ...` dengan keluaran per kab termasuk titik baru (lon, lat, bobot); tanpa opsi itu mode `katalog`, `luas`, `terbit` tidak berubah | `banjir` |
| `scripts/banjir/genangan_lahan.py` (baru) | baca WorldCover v200 per titik lewat `tiff_mini` + Range; `uji` sintetis | `banjir` |
| `scripts/banjir/citra_banjir.py` | mode `kejadian`: PNG radar pra/pasca, optik warna asli dan semu SWIR pra/pasca per kab | `banjir` |
| `scripts/siklus/paparan.py` | fungsi baru `zona_dari_sel(sel_set, kunci)` yang mengembalikan zona baku `{bahaya, kunci, tersedia, fn, galat_km}`; `hitung_kab` TIDAK berubah | `siklus` |
| `scripts/siklus/kaji_banjir.py` | `banjir_gfm(...)`, `rencana` memasukkan model baru; `banjir_jam1` tidak berubah | `siklus` |
| `scripts/siklus/genangan_kaji.py` (baru) | perakit: kejadian dari Buku Besar, panggil langkah banjir, paparan, susun ringkas dan R2, kirim lewat `_kirim_cli`; mode `prasyarat`, `jalan`, `vonis` | `siklus` |
| `scripts/siklus/saji.py` | entri `BATAS` untuk awalan `siklus/saji/kaji_berkas/` (geojson 300 KB, png 120 KB) | `siklus` |
| `scripts/siklus/genangan_kriteria.py`, `genangan_kriteria.json`, `genangan_sidik.json` (baru, GS-02) | hitung pasangan layak dari metadata, kunci kriteria, `prasyarat` (sidik dan jangkar), `uji`; dipanggil `genangan_kaji.py` | `siklus` (+ `validasi-model`) |
| `migrations/<nomor>_sk_kaji_gfm.sql` | bangun ulang `sk_kaji` dengan CHECK `model IN ('gempa','banjir_jam1','banjir_gfm')` dan pola `hasil_r2` per model; nomor dipilih saat tiket (sesi lain menambah migrasi) | `warga-api` (+ `migrasi-idempoten`) |
| `src/siklus_kaji.js` | `MODEL` tambah `banjir_gfm`; `hasil_r2` per model (bagian 4); rute baca berkas kaji (bagian 5) | `warga-api` (+ `guard-api`, `security-reviewer`) |
| `public/inti/geser.js`, `public/inti/geser.css` (baru) | komponen penggeser sebelum/sesudah, pindahan dari `public/banjir/bukti.*` | `inti-layar` |
| `public/banjir/bukti.js`, `bukti.css` | memakai `inti/geser`; tampilan tidak berubah | `banjir` |
| `public/siklus/kaji.js`, `siklus.css` | kartu `banjir_gfm`, tabel, lahan, citra, lapis peta | `siklus` |
| `.github/workflows/siklus.yml` | langkah `genangan_kaji.py` (Q9) | `mekanik-mesin` |
| `tests/siklus/genangan_*.test.mjs`, `tests/warga/siklus_kaji*.test.mjs` | uji layar murni, rute, hak | `siklus` / `warga-api` |

Folder baru: tidak ada. Semua berkas baru di folder modul yang sudah ada.

## 2. Zona sel di paparan

```
zona_dari_sel(sel_set, kunci) -> {"bahaya": "banjir", "kunci": kunci, "tersedia": True, "galat_km": GALAT_HALUS_KM,
                                  "fn": lambda lon, lat: indeks_sel_halus(lon, lat) in sel_set}
```

`indeks_sel_halus` memakai kisi grid bangunan halus yang sama dengan `genangan_nasional.hitung_bangunan` dan F2. Dua zona dibuat (`banjir:gfm_bawah`, `banjir:gfm_atas`, ALGORITMA 4). GHSL untuk kedua kunci: tidak disediakan, `hitung_kab` menulis `null` dan layar menulis "tidak tersedia". Uji golden: zona poligon lama menghasilkan keluaran identik, karena `hitung_kab` tidak disentuh.

## 3. Ringkasan D1 (`sk_kaji.ringkas`, <= 1.500 byte)

```json
{"rentang": [bawah, atas], "sumber_rentang": "worldpop", "satuan": "jiwa", "metrik": "penduduk di area genangan",
 "luas_baru_ha": 0, "kab_sah": 0, "kab_semua": 0, "lintasan_terakhir": "YYYY-MM-DD",
 "vonis": "menunggu|lulus|gagal|tak_dapat_dinilai", "sumber": "Copernicus GFM"}
```

Kunci `total`, `jumlah_gabungan`, `rata` tidak dipakai (`saji.TERLARANG`). `masukan` (<= 800 byte): `{"kj", "kab": [...], "kriteria_sidik", "versi_pipeline"}`.

## 4. R2

| Kunci | Isi | Batas |
| --- | --- | --- |
| `siklus/saji/kaji/<kj>_banjir_gfm_v<n>.json` | per kab: lintasan, pra, status, luas, cakupan, sah, rentang penduduk per sumber, lahan per kelas; per kecamatan luas dan mask; atribusi dan sidik kriteria | 100 KB (`MAKS_R2` dan `saji.BATAS` yang ada) |
| `siklus/saji/kaji_berkas/<kj>/banjir_gfm/v<n>/<kab4>_sel.geojson` | sel berisi titik baru per kab: pusat dan ha, tanpa bangunan | 300 KB; lebih dari itu sel digabung ke 330 m dan dicatat |
| `siklus/saji/kaji_berkas/<kj>/banjir_gfm/v<n>/<kab4>_<radar|asli|swir>_<pra|pasca>.png` | citra | 120 KB per berkas |

Benturan kunci yang harus dibetulkan: hari ini `src/siklus_kaji.js:103` hanya menerima `hasil_r2 = siklus/saji/kaji/<kejadian_id>.json`, satu kunci untuk semua model satu kejadian. GS-08 mengubahnya: model `gempa` dan `banjir_jam1` tetap `siklus/saji/kaji/<kejadian_id>.json`; model `banjir_gfm` wajib tepat `siklus/saji/kaji/<kejadian_id>_<b.model>_v<b.versi>.json`, dicocokkan dengan `model` dan `versi` baris itu, bukan pola umum. CHECK migrasi mengikuti aturan yang sama. Versi baru tidak menimpa versi lama.

Saring per wilayah: JSON kaji `banjir_gfm` memuat semua kab satu kejadian. Untuk BP, pembaca hasil (`bacaHasil`) menyaring `kab` dan `kec` ke kab4 dalam `lingkupKab4` sesi sebelum dikirim; PD dan KO menerima utuh. `ringkas` di D1 tingkat kejadian sama seperti `banjir_jam1` hari ini.

## 5. Rute

Rute baru satu, di `src/siklus_kaji.js`, hak sama dengan baca kaji:

```
GET /api/siklus/kaji/:sid/berkas/:nama          (:sid = id baris sk_kaji, nama parameter sama dengan rute kaji yang ada)
  :nama cocok ^\d{4}_(sel\.geojson|(radar|asli|swir)_(pra|pasca)\.png)$, selain itu 404
  empat digit awal = kab4; BP hanya bila kab4 itu dalam lingkupKab4 sesinya, selain itu 403
  kunci R2 disusun server dari baris sk_kaji (kejadian_id, model, versi), tidak pernah dari masukan pengguna
  ukuran di atas batas bagian 4: 413 tanpa isi
  Cache-Control private, max-age 3600; Content-Type dari daftar tetap
```

Kaji dibaca lewat rute kaji yang ada; ingest lewat `ingest/kaji` yang ada dengan model baru.

## 6. Anggaran (K5, 25 Nov 2026)

Waktu jalan dingin <= 75 menit, total R2 <= 12 MB, WorldCover <= 20 MB (terukur 8,1 MB untuk 52 kab Sumatera), GFM Range dikunci sesudah byte dicatat. Lebih dari itu: kab diproses urut menurut skor kejadian, sisanya `menunggu_data` dan dilanjutkan di jalan berikutnya (cache di `data/raw/banjir/gfm_nasional/`, gitignored). Angka dikunci sesudah GS-03 mengukurnya.

## 7. ADR

- ADR-1 GFM, bukan ambang sendiri: lab DKI gagal; GFM produk operasional Copernicus dengan ensemble tiga algoritma.
- ADR-2 PNG pra-render, bukan ubin hidup: tanpa ketergantungan peladen luar saat staf membuka, ukuran terkendali, bisa disegel nanti.
- ADR-3 Model kaji kedua, bukan mengganti `banjir_jam1`: jam pertama tetap berguna sebelum satelit lewat (6 sampai 12 hari).
- ADR-4 Mesin paparan tidak diubah: zona baru hanya pembuat `fn`; satu mesin paparan (AGENTS 2.41).

## 8. Versi publik (K4, GS-14)

Genangan radar per kejadian tampil di `/banjir` (tab Dampak, bagian "Genangan radar"), berlabel "perkiraan radar" dan "hipotesis" sampai uji balik lulus. Satu mesin: versi publik hanya MEMBACA keluaran staf yang sudah ada, tidak menghitung ulang dan tidak memanggil jaringan.

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/banjir/genangan_terbit.py` (baru) | mode `terbit [--sumber DIR] [--keluar DIR]` dan `uji`. Membaca `<sumber>/kaji/<KJ>_banjir_gfm_v<n>.json` versi TERBARU tiap kejadian dan `<sumber>/kaji_berkas/<KJ>/banjir_gfm/v<n>/*` (bawaan `data/raw/siklus/kaji/siklus/saji`); menulis JSON dan aset publik. `genangan_kaji.py` (siklus) tidak diubah | `banjir` |
| `public/banjir/data/genangan_kejadian.json` | per kejadian yang punya hasil, per kab: `sah`, `status`, `lintasan`, `pra`, `cakupan_pct`, `luas` (baru, teramati, persen), `lahan` per kelas, `penduduk` per sumber hanya bila dua ujung ada, `sel`, `citra`; kab tak sah hanya `alasan`. Tingkat kejadian: `ringkas`, `ambang`, `atribusi`, `catatan`. Sekitar 33 KB untuk 52 kab | `banjir` |
| `public/banjir/data/genangan_kejadian/<KJ>/v<n>/<kab4>_*` | `<kab4>_sel.geojson` dan `<kab4>_<radar\|asli\|swir>_<pra\|pasca>.png`; hanya versi terbaru, folder versi lama dihapus tiap terbit | `banjir` |
| `public/banjir/genangan_kejadian.js`, `.css` (baru) | modul ES yang dimuat `import()` dari `dampak.js`; fungsi murni teruji di Node. Tidak mengimpor `public/siklus/genangan.js` karena `/siklus/*` berjalan lewat Worker dan butuh sesi staf (`wrangler.jsonc` `run_worker_first`); fungsi format yang sama ditulis ulang kecil di sini | `banjir` |
| `public/banjir/dampak.js`, `index.html` | bagian `gen` di Dampak, tautan CSS, `inti/geser.js` dan `geser.css` | `banjir` |
| `tests/banjir/genangan_kejadian.test.mjs` (baru) | uji pipeline, fungsi murni, kartu, dan invarian JSON publik | `banjir` |

Aturan keluaran:

- Daftar putih. Kunci yang tidak disebut di `kab_publik`/`kejadian_publik` tidak pernah keluar (kecamatan, id adegan, sidik, `jiwa_kab_sah`, akun). `kunci_terlarang` menggagalkan terbit bila `total`, `jumlah_gabungan`, `rata`, `nik`, `hp`, `email`, `akun`, `bangunan`, `kec` muncul.
- Kab tak sah: tanpa `luas`, `lahan`, `penduduk`, `sel`. Tidak ada angka 0 untuk yang tak teramati.
- `ringkas.luas_baru_ha`, `kab_sah`, `kab_semua` dihitung ulang dari kab publik; `kab_rentang` = jumlah kab sah yang punya angka penduduk pada sumber rentang, supaya layar menulis "6 dari 18 kabupaten".
- Anggaran K5: PNG <= 120 KB, GeoJSON <= 300 KB, total aset <= 12 MB per kejadian. Kab sah disalin lebih dulu; yang tak muat tertulis `status: "dilewati: melebihi anggaran"`, bukan hilang diam-diam.
- Nama berkas harus cocok `^\d{4}_(sel\.geojson|(radar|asli|swir)_(pra|pasca)\.png)$` (daftar izin yang sama dengan rute berkas staf, bagian 5); GeoJSON sel diperiksa: hanya `Point` dengan properti `ha`.
- Atribusi Open Buildings hanya ikut bila ada kab dengan penduduk; atribusi GFM, WorldCover, dan Sentinel selalu.
- Pemicu terbit: belum ada. Jadwal (GS-12 dan langkah workflow) menyusul sesudah pemilik menjawab Q13 butir b.
