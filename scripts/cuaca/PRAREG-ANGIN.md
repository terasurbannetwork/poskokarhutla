# Prapendaftaran: bahan angin kencang (ALGORITMA A9) menambah peluang kejadian "cuaca ekstrem / angin kencang / puting beliung" kabupaten-hari di atas klimatologi kab x bulan dan aturan embusan >= 54 km/jam

Status: DIBEKUKAN 24 Nov 2026 (tiket H31), SEBELUM data uji (2025-01-01 s.d. 2026-03-27) dibuka atau dinilai, dan sebelum satu pun angka bahan badai ERA5 dihitung.
Yang dilihat pembuat: (a) jumlah baris DIBI jenis `cuaca` per tahun dan total (agregat label, tanpa kaitan ke cuaca apa pun); (b) bahan badai ECMWF kabupaten Bandung 14 Nov 2026
sebagai studi kasus (tanpa label, di luar semua periode di bawah). Tidak ada hasil model.
Pelaksana: `cuaca-udara` (`bahan_badai.py`, arsip prospektif). Kode latih/uji menyusul, berkas baru `scripts/cuaca/uji_angin.py`, ditulis SETELAH sidik berkas ini, memakai penanda buka O_EXCL sekali jalan
(pola `model_kab_debit.py`), mengimpor dan tidak mengubah `scripts/banjir/umum.py` dan berkas beku lain.
Aturan main induk: `docs/banjir/PETA-JALAN-MODEL-BANJIR.md` §2 (arsip hanya menolak, prospektif memutus, protokol beku dulu). Keputusan pemilik Q2: indeks badai INTERNAL, tidak tayang di UI
sampai vonis prospektif LULUS.

## 1. Pertanyaan

Satu hipotesis nasional: apakah bahan A9 (`bahan_downburst`, `bahan_putaran`, dihitung per jam dari CAPE, angin 10 m dan 850 hPa, RH 700 hPa, T 850 dan 500 hPa) menaikkan peluang kejadian pada
kabupaten-hari di atas (i) klimatologi kabupaten x bulan sendirian dan (ii) aturan embusan sekarang (>= 54 km/jam, kelas terendah `ANGIN` di `scripts/cuaca/dasar.py`)? Keduanya harus terlampaui.
Rincian per wilayah (lima wilayah seperti PRAREG-MJO §1) hanya dilaporkan, tanpa gerbang. Dua faktor bernama dinilai TERPISAH (bagian 5): jam 12-17 lokal dan fase peralihan musim.

## 2. Label

- Sumber: `data/raw/banjir/dibi_tanggal.json`, baris dengan jenis `["cuaca"]`: gabungan DIBI "Cuaca Ekstrem" + "Puting Beliung" + "Angin Kencang" + "Angin Topan" (`kejadian.DIBI_JENIS`). Jenisnya DIGABUNG;
  berkas ini tidak membawa nama jenis aslinya, jadi sub-jenis tidak bisa dipisah (logbook juga tidak: `scripts/cuaca/langganan.py`). Positif = kab-hari dengan >= 1 baris.
- RESOLUSI: kabupaten-hari saja. DIBI di sini tidak punya kecamatan, jadi uji tingkat kecamatan TIDAK bisa dilakukan; bahan kecamatan (2.286 sel unik) tetap boleh diarsipkan, tanpa dinilai.
- Pencemaran label yang diakui: "Cuaca Ekstrem" DIBI bisa memuat kejadian hujan lebat tanpa angin. Itu melemahkan sinyal, tidak memihak model mana pun.
- Tahun 2024 DIKELUARKAN dari latih, validasi, dan uji: `kejadian.py` mencatat DIBI 2024 tidak lengkap (puting beliung 0); 753 kab-hari 2024 lawan 2.165 pada 2025. Pembuat belum memeriksa penyebab lain.
- Sampel kabupaten: yang punya >= 20 kab-hari positif pada 2012-2021 (pola `model_kab.py`), dibekukan sidik sebelum validasi. Logbook BNPB tidak dipakai (berhenti 2023).
- Hari tanpa label teramati: DIBI mencatat kejadian saja, tidak ada "cakupan hari". Penyebut = semua kab-hari sampel. Kurang lapor dicatat sebagai batas (bagian 7).
- AMANDEMEN A1 WAJIB sebelum `latih`: pengikatan nama kabupaten DIBI ke kunci `pp|Nama` (`kejadian.kunci_nama`) dan pengecekan komposisi jenis di sumber mentah. Dibuat tanpa melihat hari uji. Tanpa A1 belum boleh jalan.

## 3. Bahan: padanan ERA5 dan aturan hitung

Rumus per jam IDENTIK dengan `scripts/cuaca/bahan_badai.py` (impor fungsinya, jangan salin): geser = |V850 - V10| vektor; kering = 100 - RH700; lapse = (T850 - T500) / ((Z500 - Z850)/1000 km);
skor_downburst = min(CAPE/1000, kering/40, lapse/6,5); skor_putaran = min(CAPE/1000, geser/10). Ambang A9 tidak disetel.
Open-Meteo Archive (ERA5) mengembalikan `null` untuk CAPE dan semua peubah tekanan (diuji 24 Nov 2026 di 7S 107,5E), dan Historical Forecast ECMWF IFS `null` pada 2022-06 dan 2023-01
(berisi mulai 2024-06). Jadi latih TIDAK bisa memakai Open-Meteo. Peubah ERA5 yang dibutuhkan, per jam, 0,25 derajat, 2012-2026:

| Untuk | Peubah ERA5 |
| --- | --- |
| CAPE | single levels `convective_available_potential_energy` |
| angin 10 m | `10m_u_component_of_wind`, `10m_v_component_of_wind` |
| embusan (aturan pembanding) | `instantaneous_10m_wind_gust` |
| 850, 700, 500 hPa | pressure levels `u_component_of_wind` dan `v_component_of_wind` (850), `relative_humidity` (700), `temperature` (850, 500), `geopotential` (850, 500) dibagi 9,80665 untuk meter |

Sumber, pemilik memilih (PERTANYAAN TERBUKA P1): (a) Copernicus CDS API (butuh kunci CDS milik pemilik; Claude tidak menangani kunci), atau (b) ARCO-ERA5 Google (Zarr publik, tanpa kunci;
butuh xarray/zarr, bukan stdlib; jalur tepat diverifikasi di `latih`). Sel = sel 0,25 derajat terdekat dengan titik kabupaten yang sama dengan `bahan_badai.titik_kab()` (471 sel). Sidik sha256 berkas hasil ekstrak
dicatat di `PRAREG-ANGIN.sidik` (baris `jenis: "data_era5"`). Hari lokal dan jam lokal memakai zona kabupaten dari kode provinsi (WIB, WITA, WIT, tabel beku di kode uji).

Pergeseran distribusi (diakui, tidak dikoreksi): CAPE dan RH tengah ERA5 bukan IFS operasional. `latih` menulis diagnostik tumpang-tindih (kuantil harian IFS Historical Forecast 2024-06 s.d. 2026-03 lawan ERA5
di 30 sel acak) dan fraksi hari berbahan >= 1 per sumber; ambang TIDAK disesuaikan. Bila fraksinya berbeda lebih dari faktor 2, itu ditulis sebagai batas dan prospektif (IFS asli) menjadi satu-satunya vonis yang berarti.

## 4. Pembagian waktu

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih | 2012-01-01 s.d. 2021-12-31 | klimatologi kab x bulan, koefisien |
| Validasi | 2022-01-01 s.d. 2023-12-31 | memilih penalti ridge (satu-satunya hiperparameter) |
| Dikeluarkan | 2024 | label DIBI tidak lengkap |
| Uji arsip (beku) | 2025-01-01 s.d. 2026-03-27 | hanya MENOLAK; dibuka sekali oleh `uji` (batas akhir sama dengan PRAREG-MJO) |
| Prospektif | tanggal terbit pertama `data/raw/cuaca/badai/arsip_*.json` sesudah sidik ini | vonis, bagian 6 |

Rancangan lain mungkin sudah melihat label cuaca 2025-2026 (belum diperiksa), jadi hasil arsip tidak pernah boleh disebut LULUS. Label 2026 hanya dibuka oleh uji beku ini.

## 5. Model dan kriteria arsip

- M0: laju kab x bulan dari latih, dihaluskan ((n_pos + 0,5) / (n_hari + 1)), dipakai sebagai skor.
- M1: regresi logistik dengan offset logit(M0), fitur HANYA dua: min(skor_db maks harian, 2) dan min(skor_pt maks harian, 2), koefisien ridge. Penalti dipilih di validasi dari {0,1; 1; 10; 100} menurut logloss.
- Faktor terpisah, tiap satu menambah ke M1 sebagai model sendiri, dengan dETS dan selang sendiri (SEKUNDER, tanpa gerbang): M1+J = M1 ditambah indikator "jam skor maks harian jatuh pada 12-17 lokal"
  (satu koefisien, bukan pengali tersembunyi); M1+P = M1 ditambah indikator fase peralihan (bulan Mar-Mei dan Sep-Nov, ditetapkan sekarang, A8 tidak dipakai karena menunggu Q4). Tidak ada interaksi lain.
- Pembanding: (a) M0; (b) aturan embusan >= 54 km/jam (embusan harian maks ERA5 `instantaneous_10m_wind_gust`, alarm biner, tidak dilatih). Mismatch diakui: aturan hidup memakai embusan Open-Meteo, bukan ERA5.
- Laju alarm SAMA: q = frekuensi alarm aturan (b) pada kab-hari uji; M0 dan M1 membunyikan alarm pada q teratas skor per hari (seri dipecah menurut kunci kab, tetap).
- Ukuran utama: dETS(M1 - M0) dan dETS(M1 - (b)) pada q itu, nasional. Sekunder: tiap wilayah, M1+J, M1+P, selisih Brier skill, koefisien dan selangnya.
- Bootstrap DUA skema, 1.000 ulangan, biji 11: (1) blok per kabupaten; (2) blok 30 hari (semua kabupaten berbagi cuaca hari yang sama). Batas bawah = yang lebih kecil, batas atas = yang lebih besar.
- Vonis arsip, hanya menolak: DITOLAK bila salah satu dari dua dETS titik <= 0 atau batas atas CI95 < 0. Selain itu "LOLOS SARING" (bukan LULUS); koefisien dibekukan sidik. < 100 kejadian di uji: "belum cukup".

## 6. Vonis prospektif (PRAREG-PROSPEKTIF.md, tidak diubah)

Hanya bila LOLOS SARING. Fitur hari D = entri arsip berkunci terbit D-1 (indeks hari ke-1 di `bahan_badai`, IFS asli), tanpa entri D-1 hari itu tidak dinilai. Label DIBI saja, tertunda (hanya hari <= tanggal DIBI
terakhir dikurangi 14). Pembanding M0 dan aturan embusan >= 54 km/jam dari arsip `cuaca_prospektif_*.json`. Belum cukup bila < 60 hari atau < 100 kejadian. LULUS bila batas bawah selang 95%
(bootstrap blok-bergerak 7 hari, 1.000 ulangan, biji 7) selisih ETS model terhadap KEDUA pembanding > 0; vonis dikunci sekali. Tampilan UI baru boleh sesudah LULUS dan keputusan pemilik (Q2).

## 7. Kejujuran dan batas

- Label kurang lapor, bergantung kebiasaan lapor BPBD; "angin" tercatat jauh lebih mudah di permukiman padat, jadi model bisa belajar kepadatan, bukan bahaya (klimatologi kab x bulan menahan sebagian).
- Resolusi 0,25 derajat (~28 km) tidak melihat badai lokal; CAPE ERA5 sering bias; satu kabupaten satu sel, lereng gunung bisa memotong tingkat 850 hPa (permukaan di atas ~1.500 m).
- Hari lokal 00-24 menyembunyikan jam kejadian: faktor jam 12-17 hanya dinilai lewat jam skor maks, bukan jam kejadian (label DIBI harian).
- Peubah dan ambang A9 dari literatur lintang menengah; penerapan di tropis belum teruji di sini.
- Penyebut tanpa cakupan hari dapat memuat hari "tak teramati" sebagai negatif.
- Label "Cuaca Ekstrem" tercemar kejadian hujan: sinyal "angin" bisa sebenarnya sinyal hujan lebat. Jenis tak bisa dipisah di sumber ini; hasil dibaca sebagai "cuaca ekstrem gabungan", bukan angin murni.
- Pembanding (b) memakai embusan ERA5 (`instantaneous_10m_wind_gust`), bukan embusan Open-Meteo yang dipakai aturan hidup. Menang/kalah terhadap (b) tidak otomatis berlaku terhadap aturan hidup.
- DIBI 2025-01 s.d. 2026-03 bisa belum lengkap (jeda isian susulan) dan menggembungkan negatif palsu. Kriteria kelengkapan yang mengeluarkan 2024 belum diperiksa pada 2025 dan 2026.

## 8. Kode dan sidik

- `scripts/cuaca/bahan_badai.py` (hitung A9, arsip internal, mode `uji` dengan fixture respons nyata `scripts/cuaca/fixture/openmeteo_ecmwf_bandung_20261114.json`).
- `scripts/cuaca/uji_angin.py` (modus `latih`, `uji`): ditulis setelah sidik; ekstrak ERA5 mengikuti bagian 3.
- Sidik: sha256 berkas ini ditulis ke `scripts/cuaca/PRAREG-ANGIN.sidik` (JSON per baris) dan di-commit sebelum `latih`. Mengubah berkas ini sesudah sidik = protokol baru dengan tanggal baru.

## 9. Amandemen

### Amandemen sebelum data dibuka (24 Nov 2026)

Dibuat dari tinjauan konteks bersih (validasi-model) SEBELUM `latih` dan sebelum label 2025-2026 dilihat; tidak mengubah ambang, model, atau ukuran utama.

- B1. Kriteria kelengkapan tahun yang mengeluarkan 2024 (jumlah kab-hari positif jauh di bawah tahun sekitar; jenis puting beliung nol) DIPAKAI JUGA pada 2025 dan 2026. Tahun uji yang gagal dikeluarkan dan dicatat, bukan dinilai.
- B2. SEBELUM `uji` dijalankan, wajib dilaporkan jumlah kab-hari positif per tahun uji (2025 dan 2026 sampai 27 Mar) di berkas hasil `latih`, berdampingan dengan 2022 dan 2023. Laporan tanpa angka ini = `uji` tidak boleh jalan.
- B3. Tiga batas baru dicatat di bagian 7 (label tercemar hujan, pembanding (b) ERA5, DIBI 2025-26 mungkin belum lengkap).

(Lanjutan: belum ada. A1 wajib: pengikatan nama kabupaten DIBI dan komposisi jenis, sebelum `latih`. P1 menunggu pemilik: sumber ERA5.)
