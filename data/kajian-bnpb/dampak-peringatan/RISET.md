# RISET: bahan yang sudah ada untuk dampak peringatan dini per desa

Fakta repo diperiksa 26 Nov 2026. Fakta dashboard InaRISK diamati pemilik dan Claude pada 26 Nov 2026 lewat peramban; halamannya bisa berubah. Praktik lembaga luar lain (GDACS, PAGER, Impact-based forecasting WMO) belum diriset dan tidak dikarang di sini.

## 1. Dashboard hidromet InaRISK (diamati 26 Nov 2026)

- Aplikasi Leaflet yang menghitung di peramban (`assets/hidromet/ews-engine.js`). Tabel dampaknya adalah poligon nowcasting BMKG (layanan ArcGIS `datacuaca.bmkg.go.id`, `nowcasting_public`, sublayer 2, status "Area terjadi" dan "Area meluas", serta CAP dari `bmkg.go.id/alerts/nowcast/id`) dipotong dengan raster penduduk `INARISKPOP_2020` 100 m, indeks bahaya InaRISK, dan batas desa.
- Fasilitas dari layanan InaRISK `get_data_rumahsakit_00`, `puskesmas_00`, `sekolah_00`, dan `poi_infrastruktur` BNPB Basemap.
- Matriks status Normal, Waspada, Siaga, Awas = kelas bahaya kab lawan pemicu 3 hari dari satu titik sampel per kab (Open-Meteo). Tidak ada uji balik yang terlihat.
- Menampilkan angka berpresisi palsu (contoh 1.083.781 jiwa). Status hijau Normal terbaca "tidak ada apa-apa". Notifikasi memuat kode wilayah mentah.
- Umpan Lapor Kejadian mereka (port 444) memuat nama pelapor dan berhenti pada 25 Agu 2026. Tidak ditarik oleh paket ini.
- Angka mereka tidak ditiru. Kita mengambil gagasan: tabel dampak per poligon, per desa, dengan fasilitas.

## 2. Poligon peringatan BMKG di repo

- Pembaca CAP: `scripts/banjir/peringatan.py:26` (RSS), `:71` `baca_cap` (poligon `[[lon,lat],...]`, tanda `aktif` bila `expires` > sekarang), harian lewat `lintas.yml`; keluaran `public/banjir/data/peringatan.json` (terlalu basi untuk paket ini, dibangun sekali sehari).
- Pembaca hampir-waktu-nyata: `src/nowcast.js:10` (RSS), `:43` satu CAP menjadi peringatan dengan `polygon` (paling banyak 20 cincin, 3 desimal), cron Worker tiap 10 menit ke tabel D1 `cuaca_nowcast` (migrasi 0014), rute `GET /api/cuaca/nowcast`. Arsip permanen di `cuaca_arsip` (migrasi 0021) memakai poligon yang disederhanakan (paling banyak 8 cincin kali 12 titik, `src/nowcast.js:56`): cukup kasar untuk uji balik perkiraan, tidak untuk hitung penduduk.
- Contoh nama peringatan yang terbukti: "Hujan Lebat dan Petir" (`scripts/banjir/RISET-ROB.md:110`). Daftar lengkap nama peristiwa belum didokumentasi; DP-01 mengumpulkannya dari arsip.
- Layanan ArcGIS `nowcasting_public` sublayer 2: tidak ditemukan satu pun rujukan di `scripts/`, `src/`, atau `.github/` (dicari 26 Nov 2026). Brief awal menyebutnya sebagai sumber; repo memakai CAP (Q11).
- Tangga memberi peringkat nowcast Minor, Moderate, Severe atau Extreme sebagai 1, 2, 3 (`data/kajian-bnpb/tangga/ALGORITMA.md`, baris nowcast di bagian 3). Paket ini memakai pemetaan yang sama untuk R di ALGORITMA 5.

## 3. Mesin keterpaparan yang sudah ada (satu mesin, K7)

| Berkas | Isi | Dipakai paket ini |
| --- | --- | --- |
| `scripts/siklus/paparan.py:40` `zona_dari_bagian` | zona dari daftar geometri GeoJSON, tepi poligon, galat 0,08 km | ya: poligon BMKG menjadi zona |
| `scripts/siklus/paparan.py:134` `hitung_kab` | sel halus 110 m Open Buildings (ambang 0,70) lawan zona; jiwa tiga sumber berdampingan (WorldPop per kecamatan, Dukcapil per desa, GHSL), keluaran per kecamatan dan per desa, `kelas_inarisk` | ya, mesin utama |
| `scripts/siklus/bahaya_kelas.py:35` `klasifikasi` | kelas bahaya InaRISK per sel dari ImageServer `gis.bnpb.go.id`, nodata menjadi `tak_terliput`, bukan rendah | ya |
| `scripts/bnpb/terpapar.py` | Dukcapil 83.489 desa, titik pusat desa, balita dan lansia, kelas bahaya raster InaRISK banjir, longsor, karhutla, kekeringan, gempa | sumber Dukcapil lewat `paparan.py`; tidak ada raster cuaca ekstrem |
| `scripts/siklus/fasilitas.py` (F2.4) | fasilitas dalam zona; kategori berkoordinat sekolah, madrasah, kesehatan, ibadah, kantor pemerintah; objek vital hanya hitungan; kategori tanpa sumber null | ya |
| `scripts/banjir/dampak_kab.py`, `public/banjir/data/paparan_kab.json` | jiwa WorldPop per kab di zona bahaya tinggi, porsi luas kecamatan | tidak (tingkat kab, tanpa poligon); dipakai `/prediksi` untuk aturan dampak harian |
| `scripts/prediksi/dampak.py` | profil paparan statis per kab | tidak; ia skenario, bukan peringatan aktif |
| `scripts/gunungapi/paparan.py`, `scripts/kekeringan/dampak.py`, `scripts/banjir/dampak.py` | paparan khusus bahaya masing-masing | tidak; jangan disalin |

Tidak ada rujukan `INARISKPOP` di `scripts/` dan `src/` (dicari 26 Nov 2026). Paket `inarisk` K3 menolak angka pengisi InaRISK (rumus penduduk per kab dan persen jenis kelamin di kode klien mereka); raster penduduknya tidak dinilai di sana. Paket ini tidak memakainya (K7).

Pencari nama dan geometri: nama desa dari `public/data/desa_cari.json` (`baris [[kd, nama, kec]]`; dibangun `scripts/scrape/desa_cari.py`), batas desa `public/geo/desa/<kab>.json`, batas kab `public/geo/kabupaten/`. Titik pusat desa untuk membagi bangunan: Dukcapil (x, y) lewat `scripts/bnpb/terpapar.py` (`desa_dari_fitur`), bukan `scripts/siklus/titik_desa.py` (D35). `scripts/banjir/peringatan.py` hanya baca CAP sekali sehari; tidak dipakai (D2).

Data sumber: penduduk WorldPop Global2 R2025A 2026 per kecamatan (`public/data/penduduk.json`); sekolah 65.551 baris (`public/data/sekolah.json`); fasilitas OSM `public/data/fasilitas.json` hanya 9 provinsi prioritas (`scripts/scrape/fasilitas.py` kepala berkas); batas desa `public/geo/desa/<kab>.json` (513 berkas, properti `kd` saja, tanpa nama desa); titik pusat desa `scripts/siklus/titik_desa.py`.

## 4. Status dan notifikasi yang sudah ada

- Tingkat 0 sampai 3 per kab per kolom prakiraan sudah ada di layar: `public/prediksi/besok_inti.js:10` (`LEVEL` Normal, Waspada, Siaga, Awas), `:16` `levelSel`, dan `:29` `levelKode`; dipakai ulang Worker (`src/lapor_besok.js`).
- Notifikasi: paket `data/kajian-bnpb/pwa-peringatan/` sudah terbangun di kode: `src/pw_inti.js:10` (`JENIS_PW` banjir, longsor, asap, angin; `TINGKAT`), `src/pw_peringatan.js:88` `jalankanPeringatan`, `public/lapor/peringatan.js`, `public/sw-lapor.js`, `public/lapor/manifest.webmanifest`. Pemicunya tingkat naik ke Waspada atau lebih; teks "Prakiraan Pantau Bencana, bukan peringatan resmi". Paket ini menambah masukan status, bukan kanal.
- Gerbang tampil: `scripts/umum/gerbang.py` (aturan `boleh_tampil` = selisih positif dan batas bawah selang 95 persen di atas nol, prospektif wajib "lolos"), berkas `public/data/gerbang/<bencana>.json` (ada banjir, cuaca, longsor, pesisir, udara), pembanding `scripts/umum/pembanding.py` (persistensi, klimatologi), pra-registrasi `scripts/umum/sidik.py`, selang `scripts/umum/selang.py`.

## 5. Selisih antara brief dan repo

| Brief | Repo |
| --- | --- |
| Sumber poligon ArcGIS `nowcasting_public` | CAP lewat Worker; ArcGIS tak dipakai di mana pun |
| Batas kelas "rendah sampai 0,333, sedang sampai 0,666" | `scripts/siklus/konst.py:12` `BATAS_INARISK = [0.33, 0.66]` (sedikit berbeda di tepi; satu nilai dijaga di repo) |
| Fasilitas dari InaRISK atau BNPB Basemap | Dapodik, EMIS, dan OSM sudah di repo; kesehatan OSM baru 9 provinsi |
| Pisah rumah sakit dan puskesmas | kategori F2.4 "kesehatan" tidak membedakan |
| Penduduk laki-laki dan perempuan | `terpapar.py` belum mengambil kolom `pria` dan `wanita`, padahal layanan Dukcapil memuatnya (DP-27, D29) |
| Status empat tingkat belum ada | empat tingkat per kolom sudah ada di `/prediksi`; yang baru adalah pemicu BMKG, baris kelas bahaya, uji balik, dan label |

## 6. Perbandingan dengan dashboard InaRISK (K8: pakai yang kita lebih bagus)

| Fitur | Cara InaRISK | Cara kita | Yang dipakai |
| --- | --- | --- | --- |
| Poligon peringatan | ArcGIS BMKG dan CAP, dihitung di peramban | CAP lewat Worker tiap 10 menit, disimpan di D1 dan arsip | kita |
| Penduduk dalam poligon | raster `INARISKPOP_2020` 100 m, angka penuh | `paparan.py`: bangunan Open Buildings 110 m, tiga sumber jiwa berdampingan, dibulatkan | kita |
| Jenis kelamin | ada (rumus pengisi di kode klien) | kolom `pria` dan `wanita` Dukcapil per desa, dikali rasio, berlabel perkiraan; dicek silang HDX COD-PS adm2 2020 | kita (K13, D29) |
| Kelas bahaya | raster InaRISK per piksel | raster InaRISK resmi yang sama lewat `bahaya_kelas.py`, tak terliput tidak pernah rendah | sama; kita lebih jujur pada nodata |
| Fasilitas | layanan InaRISK dan POI BNPB, nama tampil | Dapodik, EMIS, OSM; objek vital hanya hitungan; kab tanpa sumber null | kita |
| Satuan tampil | desa, kecamatan, kab, provinsi | desa hanya staf, publik sampai kab (D18) | kita, lebih berhati-hati |
| Status Normal sampai Awas | kelas bahaya kab lawan pemicu 3 hari dari satu titik Open-Meteo | prakiraan 514 kab tersimpan append-only, dinilai prospektif, ditambah peringatan BMKG, ambang terkunci sebelum uji, pil hipotesis | kita |
| Arti hijau | label Normal tanpa penjelasan | Normal berarti tidak ada pemicu menurut sumber yang masuk, tooltip menyatakan bukan jaminan, abu bila sumber hilang | kita |
| Presisi angka | 1.083.781 | dibulatkan dua angka penting | kita |
| Notifikasi | kode wilayah mentah | Web Push langganan kecamatan, nama wilayah, label hipotesis | kita |
| Umpan Lapor Kejadian | memuat nama pelapor, basi sejak 25 Agu 2026 | Lapor Bencana tanpa nama di data publik | kita; tidak ditarik |
| Kartu ONI dan IOD | ada | belum ada | kandidat paket berikutnya |
| Debit sungai GloFAS | ada | belum ada | kandidat paket berikutnya |
| Rekomendasi per audiens | ada | belum ada | kandidat paket berikutnya (Q7) |

Dari dashboard itu paket ini mengambil tiga hal yang belum kita punya: tabel dampak per poligon peringatan, rincian per desa, dan penghitungan fasilitas di dalam poligon.

## 7. Hubungan dengan paket lain

- Alun-alun (`kabar-alun`): K10 menambahkan saklar "Kejadian | Peringatan" pada peta Alun-alun dan satu baris kecil di kartu kejadian. Paket `kabar-alun` (`data/kajian-bnpb/kabar-alun/KEPUTUSAN-KABAR-ALUN.md`) tidak berubah selain saklar itu.
- Prakiraan lawan Kejadian (`prediksi-kejadian`): Dalops sudah membaca `prediksi.json`; bagian dampak peringatan memakai tempat yang sama dengan seksi "Prakiraan dan kejadian".
- Tangga: status kita ikut sinyal Tangga hanya sebagai masukan terpisah berpil hipotesis, pengecualian pemilik K14 atas `tangga` D2, K6, Q4 (D14).
- Kemampuan Inti D7: pengecualian pemilik K6 untuk notifikasi status selama hipotesis; kanal tetap satu.
- Kemampuan Inti: gerbang dipakai apa adanya (D12).

## 8. Sumber jenis kelamin (diperiksa langsung 26 Nov 2026, DP-27)

| Sumber | Isi | Cakupan | Tahun dan lisensi | Dipakai |
| --- | --- | --- | --- | --- |
| Dukcapil FeatureServer `AGR_VISUAL_KEL_FIX/0` (yang sudah dipakai `terpapar.py`) | kolom `jumlah_penduduk`, `pria`, `wanita` per desa, mis. no_prop 32 no_kab 73 Karang Anyar: 6.582, pria 3.222, wanita 3.360 | 83.489 desa | tahun dan lisensi tidak tertulis; `copyrightText` kosong; data administrasi kependudukan, bukan sensus | ya, satu mesin (D29) |
| HDX COD-PS Indonesia adm2 2020 (CSV, kolom `M_TL`, `F_TL`) | penduduk laki-laki dan perempuan per kab | semua kab | 2020 | hanya pemeriksaan silang per kab, tidak dimuat ke layar |
| InaRISK raster `DisLaki1` dan `DisWanita1` | penduduk laki-laki dan perempuan per piksel | nasional | tidak dinyatakan | tidak (satu mesin, K7, K8) |
