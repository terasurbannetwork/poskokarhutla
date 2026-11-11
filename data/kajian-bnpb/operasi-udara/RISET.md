# RISET: Pantauan Operasi Udara

Riset ini memetakan data dan kode yang sudah ada di repo (dibaca 11 Nov 2026) dan celahnya per fitur PRD.
Rujukan luar yang disebut tanpa sumber tertaut adalah praktik umum dan wajib diverifikasi sebelum dipakai sebagai angka.

## 1. Data yang sudah ada

| Data | Tempat | Catatan |
| ---- | ------ | ------- |
| Base (9) | D1 `op_base` (migrasi 0103 L4-16): id, nama, icao, prov, lat, lon, vor_* | KTG, SMQ, KLP tanpa VOR |
| Armada (≈55) | D1 `op_armada` (0103 L17-28): registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, jelajah_nm | `bucket_liter` hanya terisi 2 pesawat; `jelajah_nm` kosong semua |
| Status harian | D1 `op_armada_status` (0103 L29-37): PK (tanggal, registrasi), status, alasan, sumber, diubah | `diubah` **ditimpa** tiap pesan WA baru (`src/operasi_udara.js` L84-85): jam laporan pertama hilang |
| Renlap dan target | D1 `op_renlap`, `op_target` (0103 L38-57) | id renlap `{tanggal}-{versi}-{base}`; target ≤ 20 per base |
| Gerak/sortie/jatuhan | D1 `op_gerak` (0103 L58-73) | jatuhan = jenis berangkat + alasan `water_drop` |
| Hasil jatuhan | D1 `op_gerak_hasil` (0106 L21-33): hasil padam/masih_api, drops, liter, luas_terbakar_ha, luas_padam_ha, menit_terbang | CHECK hasil hanya dua nilai |
| Temuan pilot | D1 `op_temuan` (0103 L74-90): status fs/berasap/clear, luas_klaim_ha, kab_kode | |
| Foto | D1 `op_foto` (0106 L4-15) + R2 `MEDIA` | dilayani `/api/operasi/foto/:id` |
| ADS-B | D1 `adsb_posisi` (0086): hex, menit, lat, lon, alt, gs, flight | adsb.fi, **sekali per jam menit 46**, 7 lingkaran, simpan 90 hari (`src/adsb.js`) |
| KPI per armada | `/api/operasi/monitor` `kpi.armada[reg]` (`hitungK` L192-195) | termasuk `respons_median_menit`, `hari_siap`, `hari_terbang`, `liter_total`, `menit_terbang` |
| Nilai M1–M11 | `/api/operasi/nilai` (`operasi_nilai.js` L33-74) | M5, M8, M9, M10 = belum ada data |
| Kontrak 2026 | `public/data/operasi/rekap_udara.json` (`scripts/data/rekap_udara.py`) | 163 kontrak: periode, jam_mob, jam_operasi, sortie, wb_drop, liter. **Plafon jam dan harga tidak ada** |
| Renlap mesin | `scripts/operasi/renlap.py` (skor sel 0,02°, bobot HIPOTESIS) | sumber air "tidak tersedia" (L434) |
| PDF renlap | `scripts/operasi/renlap_pdf.py` via `scripts/wa/renlap_jam.mjs` | dikirim ke WA pemilik saja; **tidak pernah ke R2** |
| METAR | `/api/jarak-pandang` (R2, bot Mac mini) + `public/data/metar.json` | 133 stasiun BMKG sejak 11 Nov 2026 |
| Titik panas | FIRMS 3-jam (`src/titik.js`), Himawari 10 menit (`src/himawari.js`, R2 `data/himawari.json`) | Himawari: titik api, **bukan asap** |
| Asap | `public/data/asap.json` (CAMS PM2.5, CO, AOD) | resolusi model, bukan citra |
| Cluster dan level | `scripts/data/aturan.py`: prioritas = px24 ≥ 15 dan (FWI ≥ 7 atau tanpa FWI) | |
| Luas terbakar | `luas_satelit.json` (GWIS per prov), `ujiluas_dnbr.json`, `op_gerak_hasil.luas_terbakar_ha` | |
| Per kabupaten | `public/data/peta_karhutla_kab.json` (kunci `prov|nama`), `op_temuan.kab_kode` | |
| Api muncul lagi (darat) | `tugas_muncul` (0037), `src/instansi.js:973`, `pantau.js:42` | pola untuk dipakai ulang di udara |
| Sumber air (darat) | `ops_sumber_air` (0039), `public/data/osm/63.json` (Kalsel), `public/kekeringan/data/embung.json` | tidak ada titik ambil air helikopter |

## 2. Celah per fitur

| Fitur | Ada | Celah |
| ----- | --- | ----- |
| F-1 telat lapor | status harian | jam laporan **pertama** tidak tersimpan → kolom baru |
| F-2 rusak berulang | `op_armada_status` harian | cukup kueri 7 hari |
| F-3 prakiraan 3–6 jam | Open-Meteo dipakai pipeline karhutla | belum ada berkas prakiraan per base |
| F-4 batas terang | – | rumus astronomi murni di klien |
| F-5 asap di rute | CAMS AOD/PM2.5 | Himawari tidak memberi asap; pakai CAMS, berlabel model |
| F-6 NOTAM | – | menunggu Q6 |
| F-7 waktu respons | `respons_median_menit` per armada | belum per cluster; perlu jam deteksi pertama cluster |
| F-8 liter dan sumber air | `liter`, `bucket_liter` (2 pesawat) | Q8, Q9; tidak ada dip site |
| F-9 di luar base, sinyal hilang | ADS-B per jam | sampling 1 jam: "hilang" baru bermakna ≥ 2 jam tanpa posisi |
| F-10 api muncul lagi | penilaian padam 24 jam (`src/operasi_hasil.js`) | jendela 24–72 jam belum ada |
| F-11 luas | `luas_terbakar_ha` laporan, dNBR uji | Q11 |
| F-12 per kabupaten | `kab_kode` temuan, peta kab | aksi belum berkode kab |
| F-13/F-14 kepatuhan | renlap + aksi (sudah dihitung di layar) | alasan tidak didatangi belum ada |
| F-15 PDF | PDF di Mac mini | unggah ke R2 + rute baca |
| F-16–F-18 | – | menunggu Q3–Q5 |
| F-19/F-20 | jam operasi per kontrak | plafon dan harga tidak ada (Q7) |
| F-21 menganggur | `hari_siap`, `hari_terbang` | sudah bisa (hari); biaya menunggu Q7 |

## 3. Praktik umum yang dirujuk (verifikasi sebelum dijadikan aturan)

- Operasi helikopter pemadam umumnya terbang visual (VFR) di jam terang; batas terang dihitung dari matahari terbit dan terbenam lokal.
- NOTAM untuk ruang udara Indonesia diterbitkan AirNav Indonesia.
- Pengukuran kinerja pemadaman udara lazim memakai waktu respons, liter per jam terbang, dan proporsi api yang muncul lagi.
- Jam kerja dan istirahat awak diatur regulasi keselamatan penerbangan sipil (CASR) dan ketentuan kontrak; angka batas wajib dari pemilik (Q4).

## 4. Kode yang dipakai ulang, bukan ditulis ulang

- Unggah mesin ke R2: `src/jarak_pandang.js` L6 (`bacaMesin`) dan L31-39 (`simpan`).
- Hak baca: pemeriksa di `src/operasi_udara.js` L21 (adminOK, `PERAN_BACA`, `pemirsaLihat`).
- Penilaian hasil: `src/operasi_hasil.js` L19-35, dipanggil tiap ronde FIRMS (`src/titik.js:143`).
- Api muncul lagi: pola `tugas_muncul` (0037) dan `src/instansi.js:973`.
- Layar: `public/operasi_laporan.js` (kartu, label `lbl`, pop-up, saringan) dan `public/operasi_peta.js` (`kelayakan`, `fotoAr`, `STATUS_AR`).
