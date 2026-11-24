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
