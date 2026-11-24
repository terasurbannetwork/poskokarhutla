# ALGORITMA

Semua ambang di bawah adalah ambang AWAL dari pustaka. Ambang yang dipakai menilai model dibekukan di PRAREG masing-masing,
tidak di berkas ini.

## A1. Embusan awan badai dari METAR (H11)

Masukan: riwayat 6 jam per ICAO dari `metar.py` (BMKG Aviation, cadangan NOAA): waktu, suhu T (°C), QNH (hPa), arah dan kecepatan
angin (kt), embusan G (kt), kode cuaca.

Untuk tiap pasangan laporan berurutan (a, b) dengan jarak waktu ≤ 75 menit:

- `dingin` = T_b − T_a ≤ −4 °C
- `tekanan` = Q_b − Q_a ≥ +1 hPa
- `angin` = selisih arah ≥ 60° dengan kecepatan_b ≥ 10 kt, ATAU G_b ≥ 20 kt, ATAU kecepatan_b − kecepatan_a ≥ 10 kt

Ditandai **embusan awan badai terekam** bila `dingin` DAN (`tekanan` ATAU `angin`). Kekuatan: `kuat` bila ketiganya terpenuhi atau
G ≥ 35 kt (±65 km/jam, ambang puting beliung BMKG).
Keluaran per stasiun: waktu b, ΔT, ΔQ, arah sebelum dan sesudah, G, ada TS/RA dalam 60 menit sesudahnya.
Dasar: tanda gust front (pressure jump, penurunan suhu, perubahan arah angin), NOAA/NWS; Fujita 1985.
Kasus uji wajib: WIII 17 Nov 2026 ±13.00 WIB (35 ke 27°C, 1009 ke 1010 hPa, berbalik, G 21 kt).

## A2. Awan tumbuh cepat dari Himawari (H12)

Masukan: pita 13 (10,4 µm) NOAA S3 `noaa-himawari9`, dua pindaian berjarak 30 menit (t−30, t), lewat pembaca yang sudah ada di
`scripts/udara/awan_himawari.py`.

Per kabupaten (titik kisi 0,1° dalam poligon): Tb_min(t), Tb_min(t−30), fraksi titik dengan Tb ≤ 235 K dan ≤ 208 K.

- `tumbuh` = Tb_min(t) − Tb_min(t−30) ≤ −8 K DAN Tb_min(t) ≤ 253 K DAN Tb_min(t−30) ≤ 273 K (awan sudah ada sebelumnya)
- `masuk` = Tb_min(t) ≤ 253 K DAN Tb_min(t−30) > 273 K: awan dingin baru masuk/terdeteksi di kabupaten itu (adveksi dari kabupaten sebelah atau awal pindaian), BUKAN pertumbuhan
- `puncak_tembus` = Tb_min(t) ≤ 208 K

Dasar: laju pendinginan −4 K per 15 menit sebagai tanda awal konveksi (Roberts & Rutledge 2003; Mecikalski & Bedka 2006).
Alasan `masuk` (24 Nov 2026, tinjauan validasi-model): Tb_min per kabupaten turun juga bila awan dingin yang sudah ada bergeser masuk ke kabupaten yang tadinya cerah; penurunan puluhan K dalam 30 menit (mis. −81 K) mustahil sebagai pertumbuhan. Kabupaten yang tadinya sudah berawan dan turun besar tetap `tumbuh`, tetapi sebagian bisa tetap adveksi (titik contoh tetap, sel bergerak).
Catatan: resolusi 2 km dan sel 0,1° akan melewatkan sel badai kecil. Ini tanda awal, bukan deteksi badai.

## A3. Jam rawan per kabupaten (H13)

Masukan: IMERG per jam per kab (lab, 2015-01 s.d. 2026-10), jam UTC diubah ke WIB (+7; WITA dan WIT ditampilkan sesuai zona kab).

- `pangsa[h]` = jumlah hujan jam h / total hujan, h = 0..23 jam lokal
- `jam_puncak` = argmax pangsa
- `jendela_70` = jendela jam bersambung terpendek (melingkar 24 jam) yang menampung ≥ 70% hujan
- `amplitudo` = (maks − min) / rata-rata pangsa; kab dengan amplitudo kecil ditulis "merata", seperti Jakarta di video
- `peluang_jam[h]` = frekuensi jam basah (≥ 1 mm/jam) per jam

Juga dihitung per musim (DJF, MAM, JJA, SON) karena fase harian bergeser antar musim.
Catatan: IMERG cenderung kurang mengukur hujan deras singkat dan bisa bergeser fase sekitar 1 jam. Pakai "±".

## A4. Indeks angin menabrak gunung (H20)

Per kabupaten dan per jam prakiraan: u, v pada 850 hPa dan kelembapan spesifik q850 (atau RH850 dan T850) dari Open-Meteo (ECMWF IFS).
Medan: gradien elevasi ∇h dari DEM (Copernicus 90 m dihaluskan ke 5 km) dirata-ratakan di lereng arah angin dalam kab.

`dorong_naik` = maks(0, u·∂h/∂x + v·∂h/∂y) dalam m/s, dikali q850 → `fluks_orografi` (g/kg · m/s).
Faktor harian: maksimum 24 jam dan jumlah 72 jam. Bersih bocoran: hanya prakiraan yang terbit sebelum hari target.
Lab memakai ERA5 850 hPa (CDS) untuk 2008-2026, lalu PRAREG-OROGRAFI menentukan uji.

## A5. Fase MJO (H21)

Masukan: indeks RMM harian (RMM1, RMM2, fase 1-8, amplitudo). Sumber utama BoM; cadangan NOAA CPC. Terbit dengan jeda 1-2 hari,
jadi yang boleh dipakai untuk hari D hanya nilai yang sudah terbit pada D−1 (pelajaran ONI di `scripts/kekeringan/bayangan.py`).
Faktor: fase aktif bila amplitudo ≥ 1. Uji: laju kejadian banjir per wilayah per fase dibanding klimatologi kab×bulan.

## A6. Bibit siklon dan dampak tidak langsung (H22)

Masukan: JTWC Significant Tropical Weather Advisory, `abio10.txt` (Samudra Hindia) dan `abpw10.txt` (Pasifik Barat). Urai nama invest
(mis. 92B, 96S), posisi, angin maksimum, tekanan, peluang (LOW/MEDIUM/HIGH).
Tanda **pasangan pusaran**: satu invest atau siklon di 0-15° LU dan satu di 0-15° LS, keduanya pada bujur 70-110° BT. Bila ada, dicatat
untuk dihubungkan dengan A4 (angin barat di pantai barat Sumatra). Ini catatan, bukan peringatan.

## A7. Banjir belum surut (H23)

Dari `scripts/banjir/terdampak.py` dan kejadian aktif: per kab, jumlah hari sejak laporan banjir terakhir dan status surut bila ada.
Faktor: `aktif_3h` (ada laporan dalam 3 hari), `hari_sejak`. Bersih bocoran: hanya laporan yang tercatat SEBELUM pukul 00 WIB hari target.
Ranjau: laporan adalah label. PRAREG wajib memisahkan "kejadian lanjutan" dan "kejadian baru" supaya faktor ini tidak menebak dirinya sendiri.

## A8. Fase musim (H24, menunggu Q4)

Per ZOM: hari sejak prakiraan awal musim hujan, hari ke puncak; kelas `peralihan` (±30 hari dari awal), `puncak`, `lainnya`.

## A9. Bahan angin kencang (H31)

Per kecamatan per jam (Open-Meteo ECMWF): CAPE, angin 10 m, angin 850 hPa, RH 700 hPa, suhu 850 dan 500 hPa.

- geser_0_1,5 km = |V850 − V10|
- kering_tengah = 100 − RH700
- `bahan_downburst` = CAPE ≥ 1000 J/kg DAN kering_tengah ≥ 40 DAN lapse 850-500 ≥ 6,5 K/km
- `bahan_putaran` = CAPE ≥ 1000 J/kg DAN geser ≥ 10 m/s

Bobot jam: jam 12-17 lokal dan fase peralihan (A8) dipakai sebagai faktor terpisah di PRAREG, bukan pengali tersembunyi.
Target uji: kejadian DIBI "cuaca ekstrem/angin kencang/puting beliung" per kecamatan-hari (jenisnya digabung).

## A10. Jeda hulu ke hilir (H32)

Per sub-DAS di `hulu.py`: panjang alur ke kecamatan hilir L (km), beda tinggi, waktu tempuh Kirpich
t_c = 0,0195 · L^0,77 · S^−0,385 menit (L dalam m, S kemiringan). Hujan per jam di hulu (GSMaP/IMERG) digeser t_c untuk memberi
"jam tiba" di hilir. Diuji dengan kriteria `scripts/banjir/PRAREG-HULU.md` yang sudah beku. Tidak mengubah PRAREG itu.

## A11. Skenario dan kalibrasi (H33, H34)

H33: masukan hujan historis (2007, 2015, 1 Jan 2020 dengan sebaran pos BMKG) dijalankan di mesin simulasi genangan yang TIDAK beku,
lalu genangan dibandingkan dengan RW tergenang dari arsip resmi (BPBD DKI). Ukuran: hit rate, false alarm, CSI per RW.
H34: kasus Ciwidey: Open Buildings + `sim_dampak.js` (kurva HAZUS) dijalankan untuk kisaran embusan 60-120 km/jam, dibandingkan
dengan 363 rumah (15 Nov) dan 1.397 bangunan (16 Nov). Keluaran: kisaran embusan yang konsisten dengan kerusakan, dan keterbatasannya
(tanpa alat ukur di lokasi).
