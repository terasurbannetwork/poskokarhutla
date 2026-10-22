# Rancangan modul Karbon (Pantau Karbon)

Disusun 22 Okt 2026 dari 43 dokumen folder `knowledge-hub 2/Carbon Trading` (catatan sulingan di
`docs/karbon/bahan/`) dan pemetaan kemampuan satelit repo ini. Dokumen ini KONTRAK: pengerja dan
pengulas membaca ini dulu, angka/kolom di bawah tidak diubah tanpa memperbarui dokumen ini.

## 0. Pertanyaannya, dan jawabannya

"Dengan kemampuan satelit ini, bisa bikin bisnis karbon?" Bisa, dengan batas yang jelas:

| Tahap rantai nilai karbon | Satelit cukup? | Yang dibangun di sini |
| --- | --- | --- |
| Menyaring ribuan konsesi (pra-FS) | **Ya**, ini keunggulan terbesar | Penyaringan otomatis per poligon: hutan, laju hilang 2001–2025, emisi, stok karbon, gambut, api, kawasan |
| Baseline deforestasi (aktivitas) | Ya, dengan uji balik | Laju historis per konsesi + uji balik "kalau dulu memakai rerata 10 th, berapa melesetnya" |
| Faktor emisi / stok karbon | Sebagian (peta global), lapangan wajib untuk sertifikasi | Dua penaksir berdampingan: model fluks GFW dan faktor kelas tutupan; selisihnya = ketidakpastian model |
| Pemantauan proyek (MRV berkelanjutan) | **Ya** | Peringatan harian deforestasi (GLAD/RADD terpadu) + titik api FIRMS di dalam/sekitar proyek |
| Risiko pembalikan (permanensi) | Ya | Riwayat api 2012–2026 per poligon → skor risiko untuk buffer |
| Validasi/verifikasi, FPIC, plot biomassa, muka air gambut | **Tidak** | Dicatat sebagai pekerjaan lapangan di pipeline proyek, bukan diklaim oleh satelit |

Jadi produk yang jujur: **pra-studi kelayakan satelit + MRV berkelanjutan + buku besar kredit + CRM
kesepakatan**. Bukan "kredit tersertifikasi dari satelit".

Temuan pertama (uji coba 22 Okt, PT Inhutani I Pangean, 50.255 ha): hutan 99,9%, stok karbon atas
tanah ±169 tC/ha, kehilangan tutupan 2015–2024 ±191 ha/th, emisi bruto GFW ±150 rb tCO2e/th.
Dokumen COA/Wanatara menulis 755.785 tCO2e/th untuk konsesi yang sama: **±5× lebih tinggi** dari
yang teramati satelit. Selisih ini (deforestasi terencana RKU vs deforestasi teramati) adalah inti
risiko additionality, dan justru itu yang dijual sistem ini: angka yang bisa diuji pembeli.

### 0.1 Kerangka aturan per 22 Okt 2026 (diverifikasi, `docs/karbon/bahan/E-verifikasi-2026.md`)
- **Perpres 110/2025** (10 Okt 2025) mencabut Perpres 98/2021. Registri perdagangan = **SRUK** (diluncurkan
  9 Jul 2026); SRN PPI tinggal untuk pelaporan nasional. Unit SPE-GRK diterbitkan KLH/BPLH atas rekomendasi
  Kemenhut; unit non-SPE (Verra dll.) perlu persetujuan Kemenhut; jual ke luar negeri untuk NDC perlu
  Otorisasi + corresponding adjustment.
- **Permenhut 6/2026** (13 Apr 2026) mencabut Permen LHK 7/2023. Pelaku: PBPH, perhutanan sosial, hutan adat,
  hutan hak, pemegang PB-PJL Karbon. Persetujuan unit non-SPE berlaku 6 bulan; ada PNBP.
- MRA Verra–Indonesia ditandatangani Okt 2025 (juga GCC, Plan Vivo, Gold Standard). POJK 10/2026 menyelaraskan
  bursa karbon dengan SRUK.
- **Verra VM0048 + VMD0055 v1.1**: data aktivitas dan peta risiko disediakan Verra per yurisdiksi; untuk Indonesia
  statusnya "AD Collection / Prioritization pending" (periode acuan 2014–2023). **VMD0055 tidak berlaku bila
  gambut/lahan basah pasang surut > 2% luas proyek.** VM0036 (gambut tropis) ditahan. Jadi konsesi gambut saat
  ini realistis lewat jalur nasional SPE-GRK dengan faktor FRL, bukan Verra.
- AFOLU Non-Permanence Risk Tool v4.2: buffer minimal 12%; skor risiko alam > 35 atau total > 60 = gagal.
- Harga acuan: REDD+ BBB+ ±USD 7,75/t (Sylvera Q3 2026, sekunder); IDXCarbon implisit ±Rp40.000/t (2025).

## 1. Lingkup dan batas

- Modul pribadi (data bisnis), semua layar dan API di balik `adminOK` (ADMIN_TOKEN / akun
  AKUN_SITUS_*), sama seperti `/laporan-bnpb`. Tidak ada data karbon di `public/data`.
- Satu bahasa hitung: **`public/karbon/akuntansi.js`** (modul ES murni, tanpa DOM). Dipakai layar,
  worker (impor relatif), dan uji. Python hanya mengambil data satelit, tidak menghitung kredit.
- Data satelit massal (penyaringan ribuan konsesi) = pipeline Python manual/bulanan → R2 `karbon/`.
  Pemantauan proyek aktif (puluhan poligon) = cron worker langsung ke GFW + D1 titik FIRMS.
- Data konsesi resmi Kemenhut yang akan dikirim pemilik masuk lewat `scripts/karbon/impor.py`
  (SHP/GeoJSON/KML) → format konsesi baku §3.1. Sebelum itu dipakai `public/data/lahan/konsesi.geojson`
  (3.489 poligon, sebagian besar data 2014).

## 2. Sumber data satelit

GFW Data API (`https://data-api.globalforestwatch.org`), query SQL + geometri GeoJSON, POST:
`/dataset/<ds>/<versi>/query/json`.

Ranjau yang sudah ditemukan (22 Okt):
1. Header **harus** huruf kecil persis `x-api-key`. urllib Python mengirim `X-api-key` → 403
   "missing valid API key". Pakai `http.client` dengan `putheader('x-api-key', …)`.
2. `latest` dijawab 307 ke versi; ikuti manual (urllib menjatuhkan header). Lebih baik sematkan versi.
3. Tabel `umd_tree_cover_loss` **hanya berisi piksel yang pernah hilang**. Luas, stok, dan ekstensi
   hutan diambil dari dataset dasar **`umd_tree_cover_density_2000` v1.8** (semua piksel).
4. Kunci: env `GFW_API_KEY`; cadangan kunci publik yang ditempel GFW di katalognya (lihat
   `scripts/scrape/lahan.py`). Untuk produksi pemilik perlu mendaftar kunci sendiri (gratis).

Kolom yang dipakai (semua sudah diuji pada satu poligon):
- `area__ha`, `umd_tree_cover_density_2000__threshold` (filter `>= 30` = definisi hutan),
  `umd_tree_cover_loss__year`, `gfw_forest_carbon_gross_emissions__Mg_CO2e`,
  `gfw_aboveground_carbon_stock_2000__Mg_C`, `gfw_belowground_carbon_stock_2000__Mg_C`,
  `gfw_soil_carbon_stock_2000__Mg_C`, `is__gfw_peatlands`, `is__umd_regional_primary_forest_2001`,
  `idn_land_cover_2017__class` (kode kelas tutupan KLHK), `idn_forest_area__class`,
  `umd_tree_cover_loss_from_fires__year`, `wri_google_tree_cover_loss_drivers__category`,
  `gfw_forest_carbon_gross_removals__Mg_CO2e`.
- Peringatan: dataset `gfw_integrated_alerts` (versi harian `vYYYYMMDD`), kolom
  `gfw_integrated_alerts__date`, `gfw_integrated_alerts__confidence` (nominal/high/highest), `area__ha`.
- Titik api: D1 `titik_terbaru` (worker, 3 jam) untuk pemantauan; riwayat per poligon dari dataset GFW
  `nasa_viirs_fire_alerts` bila tersedia, kalau tidak dari arsip lokal VIIRS (manual).

## 3. Kontrak data

### 3.1 Konsesi baku (masukan penyaringan)
GeoJSON FeatureCollection, properti: `id` (unik, stabil), `nama`, `pemegang` (PT), `jenis`
(hph|hti|re|sawit|tambang|ps|lain), `izin` (no SK bila ada), `prov` (kode BPS 2 digit), `kab`,
`sumber`, `tahun_data`, `luas_peta_ha`. Geometri Polygon/MultiPolygon WGS84.

### 3.2 Statistik satelit per poligon (`scripts/karbon/statistik.py` → JSON)
```
{ "id", "versi": {"tcl":"v1.13","tcd":"v1.8"}, "diambil": "2026-10-22",
  "luas_ha", "hutan2000_ha", "primer_ha", "gambut_ha", "gambut_hutan_ha",
  "stok_tC": {"atas", "bawah", "tanah"},            // dalam hutan2000 (tcd>=30)
  "tahun_data_akhir": 2025,                          // dari versi tcl (gfw_kueri.json)
  "hilang": {"2001": {"ha", "co2_t", "ha_gambut", "ha_primer",
             "pendorong": {"4": {"ha", "co2_t"}, …}}, … "2025": {…}},   // pendorong WRI 1..7
  "hilang_api": {"2001": ha, …},                      // kehilangan tutupan akibat api
  "tutupan2017": {"2001": ha, "2002": ha, …},          // kode kelas KLHK
  "kawasan": {"Limited Production Forest": ha, …},
  "pendorong": {"1": ha, …},
  "serapan_co2_t": bruto serapan 2001–2025 }
```
Hutan tersisa tahun t = `hutan2000_ha − Σ hilang[2001..t].ha`.

### 3.3 Hasil penyaringan (`karbon/saring.json` di R2)
`{"dibuat", "sumber_konsesi", "n", "baris": [ {konsesi §3.1 tanpa geometri} + {stat §3.2} ]}`.
Kredit/peringkat TIDAK disimpan: dihitung di peramban dengan `akuntansi.js` dari asumsi yang bisa diubah.
Geometri disederhanakan ke `karbon/saring_geom.json` (untuk peta), terpisah supaya tabel cepat.

## 4. Akuntansi (`public/karbon/akuntansi.js`)

Fungsi murni, satuan eksplisit di nama. Semua yang tampil di layar dibaca dari keluaran fungsi ini.

### 4.1 Baseline (skenario tanpa proyek)
- Periode acuan `[a, b]` (bawaan 2016–2025, 10 th data terakhir; harus berakhir ≤ tahun data terakhir).
- Hanya deforestasi TAK TERENCANA yang dapat dicegah masuk baseline: `pendorong_baseline` bawaan
  1 pertanian, 2 komoditas keras, 3 perladangan, 6 permukiman. Tebang (4) = indikator IFM (baseline butuh RKU),
  kebakaran (5) dan alami (7) tidak masuk. Kehilangan tanpa pendorong dibagi menurut porsi pendorong tahun itu.
- `masa_baseline_th` bawaan 7 (VMD0055): kredit dan NPV dilaporkan dalam masa dan seluruh durasi (bawaan 20 th).
- `laju = Σ hilang[a..b].ha / Σ hutan_awal_tahun[a..b]` (proporsi per tahun).
- `ef_tCO2_per_ha` (faktor emisi teramati) = `Σ hilang[a..b].co2_t / Σ hilang[a..b].ha`. Bila Σ ha
  < 1, pakai `stok_tC.atas+bawah` per ha hutan × 44/12 (penaksir faktor-stok).
- Proyeksi tahun kredit k = 1..N mulai `tahun_mulai`: `hutan_k = hutan_{k−1} × (1 − laju)`,
  `hilang_k = hutan_{k−1} × laju`, `emisi_baseline_k = hilang_k × ef`.
- Metode `tren` (opsional): regresi linear ha/th pada periode acuan, dipotong ≥ 0.

### 4.2 Proyek dan potongan, urutan TETAP
```
emisi_proyek_k   = emisi_baseline_k × (1 − efektivitas)        // efektivitas 0..1
reduksi_k        = emisi_baseline_k − emisi_proyek_k
kebocoran_k      = reduksi_k × kebocoran                        // 0..1
bruto_k          = reduksi_k − kebocoran_k
pot_ketidakpastian_k = bruto_k × ketidakpastian                  // 0..1
setelah_u_k      = bruto_k − pot_ketidakpastian_k
buffer_k         = setelah_u_k × buffer                          // pool non-permanen (standar)
bagian_negara_k  = (setelah_u_k − buffer_k) × bagian_negara       // buffer NDC/otorisasi pemerintah
kredit_k         = setelah_u_k − buffer_k − bagian_negara_k
```
Rumus umum net dari Manual Book (ARR: proyek − baseline − kebocoran; WRC: baseline − proyek −
kebocoran) diuji dengan angka SMPP 2019 (baseline 806.420, proyek 240.337, kebocoran 0 → 566.083).

### 4.3 Buffer dari risiko api
`skor_api` dari riwayat: `porsi_hilang_api = Σ hilang_api / Σ hilang` dan frekuensi tahun berapi.
Bawaan buffer = 12% + 5% × kelas risiko api (0 rendah, 1 sedang, 2 tinggi), jadi 12/17/22%. Lantai 12% bersumber
(NPRT v4.2); tambahan per kelas api HIPOTESIS sampai diganti skor NPRT lengkap.

### 4.3a Penaksir kedua: faktor FRL nasional
`public/karbon/faktor_frl.json` (FRL Indonesia 2022 Tabel 6, 7, 10). `ef_metode = 'frl'`: emisi per ha
deforestasi = (biomassa kelas hutan − biomassa kelas tujuan) × 0,47 × 44/12, kelas hutan dari tutupan 2017,
kelas tujuan dari pendorong WRI (pemetaan HIPOTESIS); gambut yang dibuka terus beremisi dekomposisi tiap tahun.
Layar menampilkan dua penaksir berdampingan (GFW vs FRL); selisihnya bagian dari ketidakpastian model.

### 4.4 Keuangan
Per tahun kalender: `pendapatan = kredit × porsi_terjual × harga_usd × (1+eskalasi)^k × kurs`.
Biaya: `capex` (studi + validasi + pendaftaran, 50/50 tahun 0 dan 1), `opex_tetap_usd_th + opex_usd_per_t × kredit`, `verifikasi`
tiap `siklus_verifikasi` tahun, `pnbp × pendapatan`, `bagi_hasil_pemegang × (pendapatan − opex)`,
`dana_komunitas × pendapatan`, pajak `pph × max(0, laba setelah semua biaya tahun itu)` (tanpa penyusutan/kompensasi rugi). Semua dalam USD; kurs hanya untuk tampilan. Kredit hanya terbit di tahun verifikasi: pertama tahun ke-`jeda_terbit` (bawaan 3), lalu tiap
`siklus_verifikasi` tahun, plus tahun kredit terakhir. `bagi_hasil = bagi_hasil_pemegang × (pendapatan − opex −
verifikasi − pnbp)`. Eskalasi harga bawaan 0. Keluaran: arus kas, NPV (diskonto), IRR (bisection, null bila tidak ada
pergantian tanda), payback, harga impas USD/t.

### 4.5 Skor penyaringan
`potensi_kredit_th` (rerata kredit per tahun dalam masa baseline), `stok_tCO2_per_ha`, `ancaman` (laju), `gambut_porsi`,
`risiko_api`, `npv`. Peringkat bawaan = NPV pada asumsi bawaan; filter luas ≥ 10.000 ha, hutan ≥ 50%.

### 4.6 Uji balik baseline
`scripts/karbon/ujibalik.py` (atau fungsi JS yang sama): untuk tiap konsesi, ramal hilang 2020–2024
dari laju 2010–2019, bandingkan dengan aktual. Laporkan median rasio ramal/aktual dan sebarannya.
Angka ini yang menentukan bawaan `ketidakpastian`.

## 5. Worker (`src/karbon.js`, migrasi `0051_karbon.sql`)

Semua rute `adminOK` dulu, sebelum validasi (tamu tak boleh tahu apa pun). Penguncian optimistis
memakai kolom `diubah` (pola `src/laporan_bnpb.js`).

Tabel:
- `karbon_proyek(id TEXT PK, nama, konsesi_id, pemegang, prov, kab, jenis_kegiatan, metodologi,
  tahap, geom TEXT (GeoJSON ≤ 1 MB), luas_ha, asumsi TEXT JSON, stat TEXT JSON, stat_diambil INT,
  catatan, dibuat, diubah, oleh)`. `tahap` ∈ identifikasi, loi, kesepakatan, studi, pdd, validasi,
  registrasi, pemantauan, verifikasi, terbit, hentikan.
- `karbon_peringatan(id INTEGER PK, proyek_id, sumber (gfw_terpadu|firms), tanggal, lat, lon,
  luas_ha, keyakinan, status (baru|dicek|valid|palsu|selesai), catatan, dibuat, diubah, oleh,
  UNIQUE(proyek_id, sumber, tanggal, lat, lon))`.
- `karbon_pihak(id, nama, jenis (pemegang_konsesi|pembeli|investor|vvb|mitra|pemerintah|komunitas),
  negara, kontak, catatan, dibuat, diubah, oleh)`.
- `karbon_kesepakatan(id, pihak_id, proyek_id NULL, arah (pasok|jual|modal|jasa), tahap
  (prospek|nda|term_sheet|loi|kontrak|selesai|batal), volume_t_th, tenor_th, harga_usd, nilai_usd,
  langkah_berikut, tenggat, catatan, dibuat, diubah, oleh)`.
- `karbon_buku(id INTEGER PK, proyek_id, vintage, jenis (terbit|cadang|lepas_cadang|alih|pensiun|
  batal), jumlah_t > 0, serial_awal, serial_akhir, kesepakatan_id NULL, pembeli, catatan, waktu, oleh)`
  APPEND-ONLY (trigger tolak UPDATE/DELETE). Saldo per (proyek, vintage) = terbit − alih − pensiun −
  batal; cadang mengurangi "tersedia". Server menolak entri yang membuat saldo/tersedia negatif.
- `karbon_laporan(id, proyek_id, periode_awal, periode_akhir, isi JSON, status (draf|tinjau|kirim),
  dibuat, diubah, oleh)`.

Rute (`RUTE_KARBON`):
`GET|POST /api/karbon/proyek`, `GET /api/karbon/proyek/:id`, `POST /api/karbon/stat/:id`
(router hanya mengenali id 16-hex di ujung jalur; worker menarik statistik GFW §3.2 untuk geometri proyek; lambat, satu permintaan per proyek),
`GET|POST /api/karbon/peringatan`, `GET|POST /api/karbon/pihak`, `GET|POST /api/karbon/kesepakatan`,
`GET|POST /api/karbon/buku` (GET = entri + saldo), `GET|POST /api/karbon/laporan`,
`GET /api/karbon/saring` dan `/api/karbon/saring_geom` (R2 `karbon/*.json`, pola `src/bangunan.js`).

Cron: sekali sehari (menit 47, jam 23 UTC = 06.47 WIB): untuk tiap proyek tahap ≥ studi dengan
geometri, (a) query GFW integrated alerts 30 hari terakhir dalam geometri, (b) titik FIRMS D1 di
dalam geometri / buffer 1 km; sisipkan ke `karbon_peringatan` (UNIQUE mencegah ganda). Batasi
≤ 40 subrequest per jalan (Workers Free 50).

## 6. Layar (`/karbon`, `public/karbon/`)

Satu halaman, tab (pil selebar wadah): **Ringkasan · Penyaringan · Proyek · Pemantauan · Kesepakatan ·
Buku unit · Keuangan · Metode**. Selera pemilik berlaku: judul + maks satu kalimat, rumus hanya di
tab Metode; angka pemisah ribuan titik; Rp rata kiri angka rata kanan; bahasa lugas.

- Ringkasan: KPI (proyek per tahap, ha dipantau, potensi estimasi kredit/th, saldo unit (catatan internal), nilai pipeline,
  peringatan baru), daftar tindakan jatuh tempo.
- Penyaringan: tabel konsesi + peta (MapLibre seperti layar lain), filter jenis/prov/luas/hutan,
  urut NPV/potensi; klik baris = kartu pra-FS (grafik hilang per tahun, stok, gambut, api, kawasan,
  kredit & NPV dengan asumsi bawaan) + tombol "jadikan proyek".
- Proyek: daftar + detail (peta poligon, statistik, asumsi yang bisa diubah, tabel kredit per tahun,
  peringatan, tahap), unggah GeoJSON/KML.
- Pemantauan: umpan peringatan semua proyek, ubah status, catatan tindak lanjut.
- Kesepakatan: kanban per tahap, pihak.
- Buku unit (catatan internal, bukan registri): saldo per proyek×vintage, entri baru, riwayat.
- Keuangan: kalkulator arus kas per proyek, sensitivitas harga × volume.
- Metode: rumus §4, sumber data §2, batas (§0), uji balik.
- Laporan MRV per periode: ekspor PDF (vendor jspdf) dan XLSX, berlabel "estimasi satelit, belum
  diverifikasi pihak ketiga".

## 7. Gerbang dan uji

- `tests/karbon/akuntansi.test.mjs`: kasus tangan (laju, ef, urutan potongan, SMPP 566.083, NPV/IRR
  pada arus kas yang diketahui, IRR null, kredit tak pernah negatif, potongan 0..1 ditolak).
- `scripts/karbon/*.py --uji`: self-check offline (parser respons GFW dari fixture, penyusun SQL,
  penjumlahan statistik, impor SHP/KML).
- `tests/warga/karbon.test.mjs` (Miniflare + D1 sungguhan): 403 tanpa masuk untuk SEMUA rute, CRUD,
  penguncian optimistis 409, buku kredit menolak saldo negatif dan UPDATE/DELETE (trigger), migrasi
  idempoten, cron dengan GFW tiruan (outboundService) menyisipkan peringatan tanpa ganda.
- Pengulas: validasi-model (akuntansi, uji balik), guard-api + security-reviewer (rute),
  migrasi-idempoten (0051), selera-angka + inp-reviewer (layar).

## 8. Yang sengaja BELUM

InSAR subsidensi gambut, peta biomassa ESA CCI/GEDI, Planet berbayar, LLM penulis PDD, API mitra
cakupan `karbon` — ditunda sampai inti di atas terbukti dan pemilik memutuskan. Klaim "VM0048
compliant" tidak boleh muncul di layar: VM0048 memakai data aktivitas yurisdiksi dari Verra, yang
tidak kita reproduksi.
