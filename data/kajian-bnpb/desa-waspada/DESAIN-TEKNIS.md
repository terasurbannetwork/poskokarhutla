# DESAIN-TEKNIS: Desa Waspada

## 1. Berkas dan pemilik

| Berkas | Isi | Pemilik (`ilmu.mjs pemilik`) |
| ------ | --- | ---------------------------- |
| `scripts/data/desa_waspada.py` | mesin: statik bulanan, daftar 3 jam, hindcast lokal, `--uji` | `pipa-data` |
| `scripts/data/desa_waspada_laju.json` | hasil hindcast beku, di-commit | `pipa-data` |
| `scripts/data/desa_cari.py` | **hanya bila** kelas `Desa` dipindah dari `insiden.py` (DW-01) | `pipa-data` |
| `data/desa_statik.json` | hasil bulanan `{"tahun": {kd: [tahun_terbakar, tahun_terakhir]}, "gambut": {kd: pecahan}}`; di-commit ke `main` oleh `statis.yml` (seperti `data/riwayat_petak.bin`, dilacak git), bukan cache Actions; ukuran diukur di DW-02 | `pipa-data` |
| `public/data/desa_waspada/<pulau>.json`, `indeks.json` | keluaran, publik hanya sesudah Q1 dijawab (sebelumnya di `public/.assetsignore`) | `pipa-data` (publikasi lewat deploy `titik.yml`) |
| `public/desa-waspada/index.html`, `desa-waspada.js`, `desa-waspada.css` | halaman | tanpa pemilik sampai DW-00, lalu `layar-peta` |
| `tests/desa-waspada/**` | uji murni, hasil manual, hasil uji | tanpa pemilik sampai DW-00, lalu `penulis-gerbang` |
| `tests/agen/gerbang-desa-waspada.test.mjs` | gerbang berkas publik dan kata | `penulis-gerbang` |
| `.github/workflows/titik.yml`, `statis.yml` | langkah baru; `statis.yml` juga meng-commit `data/desa_statik.json` | `mekanik-mesin` |
| `public/.assetsignore` | baris `data/desa_waspada.json` dan `desa-waspada/` sampai Q1 dijawab | `mekanik-mesin` |
| `package.json` skrip `uji:desa` | | `mekanik-mesin` |

Tidak ada migrasi D1, rute Worker, atau penyimpanan R2.

## 2. ADR

### ADR-1: stdlib saja (D2)

Pipeline karhutla jalan di Actions dengan stdlib (AGENTS §Pipeline). Pembanding memakai numpy, pandas, duckdb, pyogrio, shapely; yang diambil adalah metodenya. Beban: ≈131 ribu petak (dari 1.509.562; diukur 24 Nov 2026) dipetakan ke desa bulanan (sekali), beberapa ribu titik per putaran 3 jam; gambut bulanan memakai kisi maks 200 titik per desa untuk semua desa di kab ber-gambut. Titik-dalam-poligon lewat indeks sel 0,05 derajat per kab yang dimuat malas; tiap kab hanya dimuat bila ada titik atau petak. Bila bagian statis lebih lama dari 10 menit di Actions, `statis.yml` memecah per pulau (ukur dulu di DW-02, tidak menambah numpy diam-diam).

### ADR-2: peluang kab/kota bukan desa (D9)

Model prediksi kita per kab (514), dibekukan append-only, dinilai prospektif. Membuat model desa membutuhkan uji balik sendiri (D15). Akibat: kolom peluang identik antar-desa sekab; layar menyebut itu dan tidak mengurutkan menurutnya.

### ADR-3: dua definisi titik (D5)

Angka utama (`titik_unik.py`: M, N, N20, N21, semua keyakinan sejak 28 Okt 2026) tidak dipakai. Daftar memakai VIIRS n/h supaya cocok dengan hindcast dan riwayat petak. Konsekuensi: jumlah titik desa bisa lebih kecil dari yang pengguna lihat di peta utama. `title` kepala kartu menulis definisi itu dan tautan ke metodologi.

### ADR-4: hindcast lokal dibekukan

Seperti `peluang_laju.json`: `data/raw/firms/viirs_2023.csv` hanya ada lokal, jadi `desa_waspada.py laju` dijalankan di mesin pemilik atau sesi lokal dan hasilnya di-commit. `main()` hanya membaca berkas beku; CI tidak menghitung ulang. Kriteria lulus dikunci tertulis di RENCANA-UJI §2 sebelum `laju` pertama dijalankan.

### ADR-5: modul lisensi MIT

Struktur hindcast (kelompok dan rasio minggu berikutnya) dan ide `fire_years` berasal dari repositori MIT pembanding. Kepala `desa_waspada.py` memuat: "Metode daftar desa dan hindcast diadaptasi dari Pantau Karhutla (MIT, Copyright (c) 2026 Pantau Karhutla), ditulis ulang di stdlib dan diukur ulang di data kita." Tidak ada kode yang disalin; kalau ada, teks lisensi lengkap ikut.

### ADR-6: pin tanpa titik individual (D12)

Pin = titik tengah kotak batas poligon yang digeser ke dalam bila di luar, dibulatkan 0,001 derajat (≈ 110 m). Tidak ada koordinat titik panas individual di berkas ini; titik panas individual sudah publik di `hotspot.json`, tetapi paket ini tidak menambah salinan.

## 3. Kunci JSON `public/data/desa_waspada/` (K8, 25 Nov 2026: per pulau)

Folder berisi `indeks.json` dan tujuh berkas pulau: `sumatera`, `jawa`, `bali-nusa-tenggara`, `kalimantan`, `sulawesi`, `maluku`, `papua`. Pulau ditentukan dari kode provinsi 2 digit (`PULAU` di `desa_waspada.py`: Sumatera 11-19,21; Jawa 31-36; Bali-Nusa Tenggara 51-53; Kalimantan 61-65; Sulawesi 71-76; Maluku 81-82; Papua 91-96). Berkas lama `desa_waspada.json` dihapus; `.gitignore` memuat folder.

`indeks.json` (kecil, dimuat dulu):

```
{
  "versi": 2, "dibuat": "2026-11-25T11:02:00+07:00", "acuan": "<acuan hotspot.json>",
  "definisi": {"sensor": ["N","N20","N21"], "keyakinan_min": "nominal", "jendela_jam": 168, "tahun_riwayat": [2012, 2025], "min_tahun": 3, "tahun_metode": "petak_terbanyak"},
  "kolom": ["kd","desa","kec","kab","prov","titik7","titik24","terakhir","tahun","tahun_akhir","gambut","p1","p2","p3","lon","lat"],
  "tanpa_desa": 0,
  "pulau": {"Sumatera": {"berkas": "sumatera.json", "provinsi": ["11", "..."], "a_total": 0, "a_terpotong": 0, "a_total_per_prov": {"11": 0}, "a_terpotong_per_prov": {},
                         "b_total": 0, "b_terpotong_per_prov": {"11": 0}, "b_total_per_prov": {"11": 0}}},
  "peluang": {"status": "dinilai|menunggu|tak ada", "dibuat": "<prediksi.json dibuat>", "ket": "peluang kab/kota, bukan desa"},
  "laju": {"status": "belum|lulus|gagal", "musim": 2023, "sensor": "S-NPP", "kelompok": {"a": {...}, "b": {...}, "lain": {...}, "tak_pernah": {...}},
           "kepekaan": {"noaa20": {...}, "metode_alt": {...}}},
  "batasan": ["...", "..."]
}
```

Berkas pulau: `{"versi": 1, "dibuat", "acuan", "pulau": "Sumatera", "kolom": [16 kolom sama], "a": {"baris": [[...]], "total", "terpotong", "total_per_prov", "terpotong_per_prov"}, "b": {"baris": [[...]], "total", "terpotong_per_prov", "total_per_prov"}}`. Batas 450 KB berlaku per berkas pulau; batas B 300 baris per provinsi dan A 2.000 baris per pulau; bila berkas melampaui batas, B dipotong per provinsi lebih dulu, lalu A, dan jumlah terpotong ditulis jujur.

- Baris daftar A: `titik7 ≥ 1`; daftar B: `titik7` dan `titik24` bernilai 0 (nol sah di daftar B karena dihitung dari titik nyata, bukan tak-terukur).
- `terakhir` string `YYYY-MM-DD HH:MM` WIB atau `null` untuk B.
- `tahun`: bilangan bulat ≥ 3 untuk B; untuk A boleh `null` (artinya "kurang dari 3", bukan 0).
- `gambut`: pecahan 0 sampai 1, 2 desimal, atau `null` (tak ada data), dan 0 hanya bila dihitung 0.
- `p1..p3`: bilangan bulat persen (`round(p * 100)` dari pecahan `API.p`) atau `null`.
- `terakhir` dihitung dari `acuan + jam`; `tgl_wib` di `hotspot.json` tanpa tahun, jadi tidak dipakai untuk string tanggal.
- `lon`, `lat`: 3 desimal.
- Tidak ada kunci `sel`, `petak`, atau titik individual.

`laju.kelompok.<k>` = `{n, ya, laju, wilson: [bawah, atas]}` atau `null` bila penyebut 0.

## 4. Ekspor CSV (di peramban)

Berkas dua bagian, BOM UTF-8, koma, kutip bila perlu. Satu baris keterangan di atas (diawali `#`): tanggal, definisi, "peluang kab/kota, bukan desa". Kolom, mengikuti pembanding dengan perbedaan yang ditandai:

| # | Kolom | Beda dari pembanding |
| - | ----- | -------------------- |
| 1 | kode desa (Kemendagri) | bukan kode BPS `ID...` |
| 2 | desa/kelurahan | sama |
| 3 | kecamatan | sama |
| 4 | kabupaten/kota | sama |
| 5 | provinsi | sama |
| 6 | titik panas 7 hari (VIIRS) | definisi D5 |
| 7 | titik panas 24 jam (VIIRS) | idem |
| 8 | terakhir terdeteksi (WIB) | sama |
| 9 | tahun terbakar 2012-2025 | batas bawah, definisi D6 |
| 10 | bagian di gambut | perkiraan |
| 11 | peluang kab/kota hari ke-1 (%) | bukan peluang desa |
| 12 | peluang kab/kota hari ke-2 (%) | idem |
| 13 | peluang kab/kota hari ke-3 (%) | idem |
| 14 | bujur | 3 desimal |
| 15 | lintang | 3 desimal |
| 16 | daftar | `A` atau `B` (satu berkas untuk dua daftar) |

Sel `null` ditulis kosong, bukan 0 (gerbang menolak nol tanpa dasar).

## 5. Alur kerja (workflow)

- `titik.yml` (cron `40 */3 * * *` ditambah dua putaran cut-off), langkah `desa_waspada`: sesudah `harian.py` (menulis `hotspot.json`) dan sesudah langkah `insiden.py`; `prediksi.json` dibaca dari checkout repo (di-commit `prediksi.yml` harian, tidak ditunggu di workflow ini); perintah `python3 scripts/data/desa_waspada.py --uji && python3 scripts/data/desa_waspada.py || echo "::warning title=desa_waspada::..."`. Berkas lama dibiarkan bila gagal.
- `statis.yml` (cron `0 19 2 * *`), langkah `desa_waspada statik`: bulanan; menulis `data/desa_statik.json` lalu meng-commit-nya bersama keluaran bulanan lain (pola "folder di luar cache HARUS di-commit ke main" yang sudah ada di berkas itu). Cache `data-` tidak dipakai: `statis.yml` hanya menyimpan `graf-`, `air-`, `lintas-`.
- Tidak ada cron baru. Bila `titik.yml` ditambah `permissions` atau `concurrency`, mengikuti yang ada (gerbang `gerbang-antrean-data`).
- `public/.assetsignore`: `data/desa_statik.json` di luar `public/`, tidak perlu. Sebelum Q1 dijawab, `data/desa_waspada.json` dan `desa-waspada/` ditambahkan ke sana. Server tinjau (`scripts/agents/tinjau_lokal.mjs`) menyajikan `/data/**` dari produksi, tetapi jatuh ke berkas folder kerja bila produksi menjawab 404; jadi berkas contoh dari `desa_waspada.py` lokal cukup untuk meninjau halaman sebelum terbit, tanpa mengubah server tinjau.

## 6. Rute Worker

Tidak ada. Berkas statis lewat Cloudflare static assets.

## 7. Kinerja

| Ukuran | Batas | Pemeriksa |
| ------ | ----- | --------- |
| tiap `desa_waspada/<pulau>.json` | ≤ 450 KB (mentah, tanpa gzip) per berkas | gerbang |
| waktu langkah 3 jam | ≤ 90 detik di Actions | DW-05 ukur dan catat |
| waktu langkah bulanan | ≤ 20 menit | DW-02 ukur |
| memori | di bawah 1 GB | DW-02 ukur |
| INP halaman | < 200 ms | `inp-reviewer` |

Bila ukuran melewati batas, potong daftar B per provinsi dari ekor sampai muat; jumlah terpotong ditulis di `terpotong_per_prov` (tidak diam-diam).

## 8. Kompatibilitas

- Tidak mengubah kunci `insiden.json`, `preventif.json`, `prediksi.json`, `hotspot.json`.
- Bila kelas `Desa` dipindah, `insiden.py --uji` tetap hijau dan `insiden.json` identik byte per byte pada masukan yang sama (DW-01 membuktikan).
- Gerbang ilmu agent: `desa_waspada.py`, `desa_cari.py`, dan `data/desa_statik.json` sudah dipetakan ke `pipa-data` oleh `ilmu.mjs pemilik` (dicek 24 Nov 2026); `public/desa-waspada/**` dan `tests/desa-waspada/**` belum punya pemilik dan didaftarkan di DW-00.
