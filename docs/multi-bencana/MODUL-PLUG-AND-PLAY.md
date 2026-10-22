# Modul plug-and-play: apa yang sudah bisa dipakai ulang, apa yang perlu adaptor

Dipetakan 16 Okt 2026 dari 35 modul di `public/`, `src/`, dan `scripts/`. Tujuannya: bencana baru
**mencolok** modul yang sudah ada lewat registry, bukan menyalinnya. Skema registry dasarnya di
[`ARSITEKTUR.md`](ARSITEKTUR.md) §3.2; dokumen ini menambah medan yang dibutuhkan modulnya.

## 1. Empat kelas

| Kelas | Arti | Modul |
| --- | --- | --- |
| **A. Sudah colok** | Tanpa asumsi bencana; dipakai apa adanya | `bagi.js`, `i18n.js`, `persetujuan.js`, `pesan.js`, `statistik_publik.js`, `src/publik.js`, `scripts/terbit/versi.py` |
| **B. Satu langkah lagi** | Cuma butuh daftar dari registry atau satu migrasi | `informasi.js` + `informasi_jenis.js`, `foto.js` + `src/foto.js`, `jejak.js` + `src/statistik.js`, `kaki.js`, `src/og_meta.js`, `admin/*.js`, rute `src/worker.js`, `wilayah.py`, `banjir/umum.py`, `asap.py`, `tanah.py`, `citra.py` |
| **C. Mesin bersama, isi per bencana** | Mesinnya generik, kontennya lewat adaptor (semua jalur baru di dokumen ini, seperti `public/inti/`, `scripts/umum/`, `scripts/berita/<id>.py`, masih rencana) yang didaftarkan tiap bencana | `bagikan.js`, `sapa.js`, `databaru.js`, `lapisan5.js`, `cerita_karhutla.js`, `ansambel.py`, `berita.py`, `posko.py`, `scripts/og/buat.py` |
| **D. Karhutla saja** | Tidak dipindah; cuma POLA-nya yang ditiru | `titik_live.js`, bagian FIRMS `src/titik.js`, `fwi.py`, `operasi.py`, `keputusan.py` |

## 2. Medan registry tambahan

**Belum ada di repo**: `public/bencana.json` dan `src/bencana.generated.js` lahir di FASE-0 tahap A. Medan di bawah diusulkan untuk ditambahkan ke tiap entrinya:

```json
{
  "bagikan": { "nama": "Pantau Bencana · Gempa", "sumber": "BMKG, USGS", "tagar": ["#gempa", "#infogempa"] },
  "og": { "judul": "Gempa bumi hari ini · Pantau Bencana", "desk_templat": "{tgl}: {n} gempa M≥5, {jiwa} jiwa terpapar guncangan." },
  "kata": { "unit": "gempa", "kejadian": "gempa utama", "tindakan": ["Pemantauan", "Kaji cepat", "Siaga evakuasi", "Tanggap darurat"], "frasa_wilayah": "provinsi yang sering diguncang gempa" },
  "peringatan_relevan": "gempa|tsunami",
  "lapisan": ["penduduk", "sekolah", "fasilitas", "jalan"],
  "berita": { "kueri": ["gempa bumi", "tsunami"], "leksikon": "scripts/berita/gempa.py" },
  "prioritas": ["11", "13", "72", "81"],
  "posko": { "radius_km": 25, "bobot": { "awas": 3, "siaga": 1 } }
}
```

Nilai di atas contoh bentuk, bukan angka putusan. Kosakata `kata` mengikuti
[`COPYWRITING.md`](COPYWRITING.md) §5.

## 3. Layar (`public/`)

| Modul | API | Asumsi karhutla hari ini | Perubahan supaya colok |
| --- | --- | --- | --- |
| `informasi.js` + `informasi_jenis.js` | `window.Informasi {peta, render()}`; ekspor `BAHAYA, WARNA, JENIS, jenisUntuk, IKON` (dipakai worker, `src/worker.js:5`) | `BAHAYA_AWAL` (11), tautan `/k/` (233), teks "titik panas ≤ 2 km" (239), cabang KOLOM karhutla/banjir (349-351), D1 `CHECK bahaya IN (…)` (`0001_warga.sql:9,42`) | `BAHAYA` dari `lapor_bahaya` registry; jenis per bencana; KOLOM pindah ke kunci `kolom` tiap jenis; tautan `rute + "k/" + id`; migrasi tabel rujukan (ARSITEKTUR §6.1); `tests/warga/skema.test.mjs` ikut |
| `foto.js` + `src/foto.js` | `window.Foto {render, lapis, buka, kirim}`; server `KATEGORI, BATAS_FOTO, RUTE_FOTO` | `KAT` api/asap/padam (`foto.js:7`), subjudul "Foto lapangan untuk peta karhutla" (278), D1 `CHECK kategori` (`0007_foto.sql:7`), tanpa kolom `bencana` | migrasi kolom `bencana TEXT NOT NULL DEFAULT 'karhutla'`, kategori divalidasi server dari `foto_kategori`; `GET /api/foto?bencana=`; subjudul dan ikon dari registry |
| `bagikan.js` | global `Bagikan` (`init, buka, cepat, bagi, konteks, gambarCepat, keterangan`), tata letak `TATA` (679) | tema `_K()` (25-29), cabang `hal==="banjir"` (313, 336, 923), `S.kluster`/`S.meta.status` (339-354) | `_K` membaca `bagikan` registry; tiap bencana mendaftarkan `Bagikan.tema[id] = {data, teksWil, keterangan, konteks}` di berkasnya sendiri; mesin kanvas dan `TATA` tetap bersama |
| `bagi.js` | `window.Bagi {buka, utm, potong, en, QR, ponsel, ikon}`, tombol `[data-bagikan]` | tidak ada | `kampanye` jadi `"<id>-<jenis>"` |
| `i18n.js` | `window.T`, `T.ganti/hilang/kunci/siap`, peristiwa `bahasa` | satu kamus | opsional `i18n/en.<id>.json` digabung malas; seksi GLOSARIUM per bencana; trio hreflang di tiap `rute` |
| `persetujuan.js` | `window.Persetujuan` | tidak ada | merek di `privasi.html` dibetulkan |
| `jejak.js` + `src/statistik.js` | POST `/api/jejak`; `HAL, PERISTIWA, …` | regex `/^\/(banjir\|warga)/`, `/k/K\d+` (77-78); `HAL` tulisan tangan (`statistik.js:17`, halaman lain ditolak 400) | regex dan `HAL` dari `rute` + `kejadian.awalan` registry |
| `pesan.js` | `window.Pesan {buka}` | tidak ada | medan opsional `bencana` |
| `kaki.js` | tanpa global; `data/kontak.json` | daftar tab dan tautan karhutla (4, 44-45) | kolom "Pantau" dari `tab` minus `tab_sembunyi`; kolom "Bencana" dari registry |
| `databaru.js` | tanpa global | belah `karhutla()`/`banjir()` (232), saringan `R_API` (36, 59) | pita peringatan BMKG jadi modul sendiri disaring `peringatan_relevan`; bagian FWI/tanah jadi adaptor karhutla |
| `sapa.js` | tanpa API; kunci `pb_sapa` | semua copy karhutla (55-79) | `Sapa.daftar(id, {siap, hitung, html})`, kunci `pb_sapa_<id>`; tata letak bersama |
| `lapisan5.js` | global di 2-3 | lapis karhutla `kanal`, `iklim`, `akses` | `lapisan[]` registry memilih ubin; lapis generik (`penduduk, sekolah, fasilitas, jalan, asap`) jadi `public/inti/peta/lapis.js` ([`PETA.md`](PETA.md)) |
| `citra.js` | `window.Citra`, `pasangInsight` | `data/citra.json`, ID kompleks `Laci` | jalur data dari registry; penggeser sebelum/sesudah jadi komponen bersama |
| `cerita_karhutla.js` | `window.Cerita` | lima JSON karhutla, lencana "Coming soon" (190) | rangka bab + `rekamVideo` jadi `cerita.js`; bab dipasok per bencana |
| `admin/*.js`, `src/admin_halaman.js` | – | `HALN` (`admin/statistik.js:14`), `KAT` (`admin/foto.js:8`), merek "Posko Karhutla", nav Karhutla/Banjir | semuanya dari registry |

## 4. Worker (`src/`)

| Modul | Perubahan |
| --- | --- |
| `og_meta.js` | `TAB` (5), cabang banjir (12), `/k\|sim/K####` (14-19), "Pantau Bencana Karhutla" (28) diganti putaran atas `rute` registry dan `kejadian.awalan`; og:title tentang/privasi dibetulkan |
| `statistik.js` | `HAL = [...tetap, ...B.bencana.map(b => b.id)]` |
| `titik.js` | `wilayah(env)` dan `cariWilayah` (43-69) dipindah ke `src/wilayah.js`, dipakai cron gempa/cuaca; pola simpan D1 8 putaran ditiru `cron_worker` |
| `worker.js` | `SUMBER_STATUS` (330), regex `HALAMAN` (398), `HTML_RUTE` (404-410) di-generate dari registry |
| `publik.js` | tetap |

## 5. Pipeline (Python)

| Modul | Perubahan |
| --- | --- |
| `scripts/data/wilayah.py` | `Wilayah.cari(lon, lat)` tetap; `PRIORITAS` 9 provinsi karhutla (19) pindah ke `prioritas` registry |
| `scripts/banjir/umum.py` | `ambil` (retry), `simpan`, `baca`, `grid_darat`, `per_lokasi`, `KuotaHabis` pindah ke `scripts/umum/` dengan parameter jalur keluaran |
| `ansambel.py` | mesin 51 anggota ECMWF (`persentil`, `bobot`, `anggota`, `ringkas`) menerima daftar variabel + ambang (hujan ≥ 50/100 mm, hari kering) |
| `tanah.py` | buang urutan `PRIORITAS` (79); dipakai kekeringan dan banjir |
| `penduduk.py` | tambah "penduduk di dalam poligon/radius" untuk KRB gunung api dan MMI gempa |
| `berita.py` | panen RSS, dedup, geocode, sentimen tetap; leksikon (`KUERI_*`, `R_*`, `TOPIK`, `SITUASI/RESPONS`) pindah ke `scripts/berita/<id>.py` |
| `posko.py` | `pilih()` greedy maximum-coverage tetap; bobot dan `RADIUS_KM` dari registry `posko` |
| `citra.py` | menerima daftar `{id, lat, lon, skor}` + folder keluaran, bukan `kluster.json` |
| `asap.py` | jalur keluaran dari registry; jadi pipeline inti modul udara |
| `scripts/og/buat.py` | `hitung()` dipecah jadi `og_<id>()` per bencana yang mengembalikan `{judul, desk, gambar}`; `stempel` tentang/privasi dibetulkan |
| `fwi.py`, `operasi.py`, `keputusan.py` | tetap karhutla; Drought Code FWI boleh dipakai sebagai proksi kekeringan |

## 6. Urutan pindah (masuk FASE-0)

1. Registry + generator + gerbang segar (sudah direncanakan di FASE-0 tahap A).
2. Kelas B dari daftar sederhana dulu: `jejak`/`statistik`, `kaki`, `og_meta`, `admin`, rute worker.
3. Migrasi tabel rujukan (`informasi`, `foto`).
4. Kelas C: `bagikan` dan `sapa` duluan karena tampil di tiap halaman, lalu `berita`, `ansambel`, `posko`.
5. Kelas D tidak disentuh.

Tiap langkah: karhutla tetap tampil identik (uji balik dan tangkapan layar sebelum/sesudah), dan
gerbang `gerbang-tanpa-salin` menolak salinan baru dari modul kelas A–C di folder bencana.

## 7. Lapisan pesisir: abrasi (21 Okt 2026)

Abrasi, bencana BNPB ke-8 yang belum punya modul, masuk sebagai **lapisan**, bukan entri bencana baru: entri baru
menuntut halaman, tabel rujukan `bahaya`/`foto_kategori` di D1, dan workflow (§3.3 ARSITEKTUR), sedangkan datanya tahunan
dan paling berguna di samping rob. Colokannya:

| Bagian | Isi |
| --- | --- |
| Pipeline | `scripts/pesisir/abrasi.py` (pengerja `pesisir`); COG dibaca lewat `scripts/data/citra.py` (`COG`, `ambil`, `ke_utm`, `buka_ubin`), tidak disalin |
| Keluaran | `public/pesisir/data/abrasi.json`: transek 1 km (garis dasar, arah ke laut, jarak garis pantai per tahun, laju, selang 95%, keyakinan, desa) |
| Registry | `"abrasi"` di `lapisan` entri `banjir` (`public/bencana.json`); layar banjir yang memasangnya membaca `/pesisir/data/abrasi.json` |
| Metode, validasi, usulan jadwal | [`bencana/abrasi.md`](bencana/abrasi.md) |

Naik jadi entri bencana sendiri (`id: "abrasi"`) baru bila ada halaman, `lapor_bahaya`/`foto_kategori` di D1, dan workflow.
