# Riset: sumber data InaRISK (dibongkar 23 Nov 2026)

Dibongkar dengan skill REA (tangkapan peramban terkendali) dan pembacaan 70 berkas JS SPA InaRISK v4.
Semua jalur di bawah publik, tanpa login, diuji dengan curl 23 Nov 2026.

## 1. API InaRISK v4 (`https://inarisk.bnpb.go.id/apiv4`)

| Jalur | Isi | Dipakai |
| --- | --- | --- |
| `data-irbi-full` | NDJSON 5.654 baris (514 kab x 2015-2025): 9 kolom bahaya, `total`, `fix_values`, `status`, `pembanding` | IRBI, dicermin |
| `irbi/{pcode}` | skor 2025 + `pembanding` (SEB_60) | tidak perlu, sudah di `data-irbi-full` |
| `data-jiwa-terpapar/{pcode}` | jiwa terpapar 11 bahaya + `penduduk` | detail IRBI, dicermin |
| `data-ikd?tahun=&wilayah=&page=&per_page=` | 2.078 baris IKD 2019-2026 (`indeks_kab`, `tingkat_kapasitas`) | IKD, dicermin |
| `data-ikd/{pcode}/{tahun}` | analisa: `prioritas[7].nilai`, `rekomendasi[7].aksi[{indikator, teks}]`, `ambang` | IKD dan detail IRBI, dicermin |
| `downloads?page=&per_page=&search=&category=&file_format=&sort=&region=` dan `downloads/summary` | 18.853 berkas (Data Wilayah 11.259, Peta 4.875, Data Infra 2.361, KRB 218, RPB 136) | Unduhan, proksi |
| `external-links`, `external-links/summary` | 7 tautan (Dashboard 4, GIS 3) | Tautan, dicermin |
| `dashboards/{slug}`, `dashboards/{slug}/spatial-query/{0\|1}` (POST) | konfigurasi Web GIS; dampak poligon dan radius (penduduk, sekolah, rs, puskesmas, madrasah, bandara, bangunan, OJK, pajak, obvitnas, pariwisata, pelabuhan, perguruan tinggi) | Web GIS, proksi |
| `get-nama-kegiatan-posgagah`, `posgagah/geojson/{kegiatan}/{pcode}?date_from=&date_to=` | titik Lapor Kegiatan (20) dan Sosialisasi (4); memuat nama petugas | Web GIS, proksi + buang nama |
| `/v4/topojson/kabupaten-small.geojson` (0,75 MB) | batas 514 kab | peta IRBI, dicermin |

## 2. Lapisan peta (`https://gis.bnpb.go.id/server/rest/services`)

`inarisk/layer_bahaya_{banjir, banjir_bandang, gempabumi, kekeringan, letusan_gunungapi, tanah_longsor,
likuefaksi, tsunami, gelombang_ekstrim_dan_abrasi, kebakaran_hutan_dan_lahan, cuaca_ekstrim, multi}`,
`layer_risiko_*`, `layer_kerentanan_*`, `layer_peta_kapasitas`, `Basemap/batas_administrasi`.
ImageServer `exportImage` membalas PNG 256 piksel (diuji). Server kadang membalas "Wait timeout"
(gempabumi MapServer), jadi lapisan gagal harus tampil sebagai pesan, bukan layar kosong.

## 3. Aplikasi lain (K2)

| Aplikasi | Data | Putusan |
| --- | --- | --- |
| ACEBS `inarisk2.../apiv4/acebs/geojson` | 8.755 titik ber-kode desa, kelas kerentanan | fase 2 (Q3) |
| SPAB `inarisk2.../spab/api/get-data/{prov}/{kab}` | capaian 19.144 sekolah per wilayah | fase 2 (Q3) |
| Pencegahan `.../pencegahan/das_vs_bencana/{das}` | luas kelas bahaya per DAS, hanya cari per nama | tunggu Q3 |
| STEP-A, portal | tipis, atau butuh token | dilewati (Q4) |

## 4. Metodologi (Buku IRBI 2024, 65 MB)

R = H x V / C per bahaya (hlm. 16, 18, 28), lalu dijumlah per kab (hlm. 23). H = kelas 1-3 x bobot
(longsor 5, gunung api 3, lainnya 4; hlm. 24). V dari jiwa terpapar per km2, kerugian rupiah, kerusakan
lingkungan dengan bobot per bahaya (hlm. 25-27). C = kelas IKD: < 0,40 kelas 1, 0,40-0,80 kelas 2,
> 0,80 kelas 3 (hlm. 28). Dasar KRB 2021 (11 bahaya) tidak sebanding dengan dasar 2011 (hlm. 350).

## 5. Kode yang dipakai ulang

`scripts/cuaca/risiko_bnpb.py` (penarik berjeda dengan User-Agent peramban), `data/kajian-bnpb/data/irbi/`
(salinan IRBI 2015-2025 sudah diperiksa SHA-1), `public/vendor/maplibre`, `public/inti/tema.css`,
`public/bnpb/bnpb.css`, `halamanBnpbPublik` di `src/bnpb.js`.

## 6. Angka uji (data 23 Nov 2026)

Nasional 2025 = 147,95 (rerata 514). Tinggi 169, Sedang 345. Halmahera Selatan peringkat 1 (2024: 13).
Langkat peringkat 39 (2024: 160), skor 231,47. Cocok dengan layar InaRISK.

## 7. IR-17: sebab kode desa ACEBS tidak cocok (diukur 26 Nov 2026)

Data: `inarisk2.../apiv4/acebs/geojson` ditarik 26 Nov 2026, 8.760 baris (2,8 MB, cache `data/raw/inarisk/acebs.geojson`,
tidak di-commit). Rujukan: desa Kemendagri `public/geo/desa/*.json` (kode `kd` dan poligon BIG). Ulang dengan
`python3 -I scripts/bnpb/acebs_telusur.py` (self-check `--cek`). Satu sebab per baris, kode diperiksa dulu baru titik.

| Sebab | Baris | Persen |
| --- | ---: | ---: |
| Titik jatuh di desa ber-kab sama dengan kodenya (cocok) | 7.529 | 85,9% |
| Kode kosong atau bukan 10 digit (197 kosong, 2 berisi 2 digit) | 199 | 2,3% |
| Kode berpola BPS (kecamatan 3 digit, digit ke-7 = 0), tidak ada di daftar Kemendagri | 23 | 0,3% |
| Kode kab Papua sebelum pemekaran 2022 (`9108`, kab sudah pindah ke provinsi baru) | 7 | 0,1% |
| Kode 10 digit lain yang tidak ada di daftar Kemendagri (desa baru atau salah ketik) | 1 | 0,0% |
| Titik rusak: bujur tanpa titik desimal atau lintang dan bujur tertukar | 29 | 0,3% |
| Titik di laut atau celah poligon, paling jauh 1 km dari kab kodenya (presisi garis pantai) | 164 | 1,9% |
| Titik di laut, lebih dari 1 km (170 baris tepat di 118, -2,6: titik pusat peta Indonesia) | 195 | 2,2% |
| Titik di kab tetangga, paling jauh 2 km dari kab kodenya (presisi batas) | 120 | 1,4% |
| Titik di kab lain, lebih dari 2 km (titik salah; 302 baris bahkan di provinsi lain) | 493 | 5,6% |
| **Tidak cocok** | **1.231** | **14,1%** |

Temuan:

- **Kode BPS lawan Kemendagri bukan sebab utama.** ACEBS memakai kode desa Kemendagri: 8.530 dari 8.561 kode 10 digit (99,6%)
  ada di daftar desa Kemendagri. Kode berpola BPS hanya 23 baris.
- **Pemekaran** hanya 7 baris (Papua 2022). Tidak ada kode 9 digit, jadi soal nol di depan tidak ada (kode provinsi mulai 11).
- **Sebab utama ada di koordinat, bukan di kode: 1.001 baris (11,4%).** 249 di antaranya memakai satu koordinat yang sama untuk
  3 kab atau lebih (pusat peta, kantor operator), jadi titiknya bawaan aplikasi, bukan lokasi rumah. 284 baris (3,2%) hanya
  meleset kurang dari 1 sampai 2 km di tepi batas atau pantai.
- **Perbaikan yang terbukti: tidak ada.** Repo tidak punya tabel padanan kode desa BPS ke Kemendagri (`public/data/kemitraan/kode.json`
  kolom `bps` kosong semua) dan tidak punya tabel padanan kode Papua sebelum 2022 ke sesudahnya. Padanan dari nama tidak dipakai.
  Jadi tidak ada pemetaan yang diterapkan di `inarisk.py`; sisa tidak cocok tetap 14,1%. Menerapkan dua tabel padanan resmi itu
  paling banyak memulihkan 30 baris (0,3%).
- **Ukuran 85,6% di D17 menguji titik, bukan kode.** Bila ACEBS dicermin per desa atau kab lewat kodenya (titik tidak pernah ke
  `public/`, D17), yang dipakai adalah kode, dan kode sah Kemendagri 97,4% (8.530 dari 8.760), di atas ambang 95%. Keputusan
  memakai ukuran ini ada di Q7 KEPUTUSAN.
- Catatan cermin: 1.867 baris berulang dengan kode dan koordinat yang sama persis; jumlah titik per desa perlu dihitung dengan
  aturan ulang yang jelas sebelum tampil.
