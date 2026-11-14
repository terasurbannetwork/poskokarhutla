# RISET: Peluang Semai Awan dan Prakiraan Asap

Ringkasan tiga riset di `riset/`. Rincian dan tautan sumber ada di berkas masing-masing.

| Berkas | Isi |
| ------ | --- |
| `riset/R1-SAINS-SEMAI.md` | dasar ilmiah penyemaian higroskopis, praktik TMC Indonesia, tabel kriteria, bukti kemanjuran, rancangan model, pra-registrasi |
| `riset/R2-DATA-MODEL.md` | ECMWF Open Data, Open-Meteo, Himawari-9, GSMaP/IMERG, pilihan model asap, FIRMS, batas wilayah; tabel tumpukan rekomendasi |
| `riset/R3-NIMBUS.md` | cerna 20 tangkapan layar dan panduan Nimbus v2.2: layar, metode, kelemahan, di mana kita bisa lebih baik |

## 1. Temuan yang menentukan rancangan

1. **Data cuaca 0,1 derajat tersedia gratis.** Diverifikasi 14 Nov 2026 di `data.ecmwf.int/forecasts/<tgl>/<jam>z/ifs/0p1/oper/`:
   tiap langkah punya `*-sfc.grib2` (sekitar 94 MB) dan `*-pl.grib2` (sekitar 380 MB) dengan berkas `.index` per baris JSON
   (`param`, `levelist`, `_offset`, `_length`). Satu field global sekitar 1,5 MB, 6.483.600 titik, paket `template 42` (CCSDS),
   jadi perlu `eccodes` untuk membukanya (KEPUTUSAN Q1). Parameter `sfc`: `lcc, mcc, hcc, tcc, mucape, tclw, tciw, tcwv, tp, cp,
   tprate, 10u, 10v, 2t, 2d, msl`. Parameter `pl` di 14 lapisan: `u, v, w, t, q, r, gh, vo, d`. Tidak ada `cin` dan `blh`.
2. **Open-Meteo tidak cukup untuk grid penuh.** Grid 0,25 derajat Indonesia 12.765 titik, kuota gratis 10.000 panggilan per hari
   dan nonkomersial. Hanya cocok sebagai cadangan titik (base, zona).
3. **Kriteria Nimbus sebagian asumsi** (R1 §4, R3 §2). Literatur yang terbaca (Flossmann dkk. 2019) menyebut tiga syarat:
   partikel garam 0,1 sampai 10 mikron, kedalaman awan di bawah level beku > sekitar 1 km, updraf dasar awan > 1 m/s. Tidak ada
   ambang CAPE, RH850, atau bobot di literatur. Usulan: CAPE dan cairan awan jadi skor lunak, tanda bahaya MUCAPE > sekitar
   3.500 J/kg, tambah suhu dasar awan > sekitar 10 derajat C dan w lapisan rendah.
4. **Bukti kemanjuran lemah, terutama untuk api.** Dua uji acak positif (Afrika Selatan 1997, India CAIPEEX 2023) dengan sampel
   kecil; tidak ada uji untuk padam api atau pembasahan gambut. Klaim aman di layar hanya "awan layak semai" dan "peluang hujan
   alami" (KEPUTUSAN D8).
5. **Praktik TMC Indonesia tidak menerbitkan indeks seleksi awan.** Dari pemberitaan: BMKG mendeteksi potensi awan dari Himawari
   (RGB mikrofisika, 1 sampai 2 jam lebih awal), NaCl dengan Caravan 208B atau CASA, dry ice bila ada inversi asap, sekitar
   800 kg per sortie. SOP Balai Besar TMC tidak ditemukan terbuka (pertanyaan untuk BMKG di R1 §7).
6. **Asap: mesin lintasan sendiri lebih masuk akal daripada HYSPLIT.** READY dibatasi 250 panggilan per hari; repo sudah punya
   `scripts/udara/lintasan.py` (72 jam, 10 m, 925, 850 hPa, kota dalam 25 km, poligon lintas batas MY SG BN TL; PNG hanya terdeteksi saat lintasan keluar tepi grid, jadi poligon PNG ditambah di SA-05). CAMS PM2.5
   (`scripts/data/asap.py`, `scripts/udara/prakiraan.py`) tetap sebagai pembanding, tidak dicampur.
7. **Verifikasi bisa dimulai sekarang tanpa menunggu semai.** GSMaP NRT (0,1 derajat per jam, latensi sekitar 4 jam, daftar gratis
   JAXA) atau IMERG Early (cadangan) memeriksa apakah sel berskor tinggi memang menjadi hujan alami 30 sampai 90 menit kemudian.
   Himawari B13 dari bucket AWS `noaa-himawari9` (tanpa akun) memeriksa awan konvektif nyata.
8. **FIRMS dan satelit hilang**: area API per sumber (`VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`); satelit hilang
   dideteksi dari jumlah titik per sumber lawan rerata 7 hari. Pipeline FIRMS repo dipakai ulang.

## 2. Kode repo yang dipakai ulang (inventaris 14 Nov 2026)

| Kebutuhan | Kode yang sudah ada | Catatan |
| --------- | ------------------- | ------- |
| Cluster api dan FRP | `scripts/data/harian.py` menulis `public/data/kluster.json` (`id, lat, lon, frp, frp24, luas, prov, kab, gambut, level, akhir`; `frp24` = 24 jam, `frp` = sepanjang umur, `prov` kode BPS) | `titik.yml` tiap 3 jam |
| Lintasan asap | `scripts/udara/lintasan.py` (`angin_di`, `geser`, `jalur`, `negara`), keluaran `public/udara/data/lintasan.json` | angin dari `angin.py` 1 derajat, tanpa 700 hPa |
| Angin | `scripts/udara/angin.py` Open-Meteo 1 derajat, 10 m, 925, 850 hPa, 0 sampai 72 jam per 3 jam | diganti atau dilengkapi IFS 0,1 derajat |
| Kota | `scripts/udara/kota.json` 514 kab/kota (titik berbobot penduduk, jiwa) | dipakai faktor T dan daftar kota berasap |
| Base | `migrations/0103_operasi_lapangan.sql` `op_base` (9 base, ICAO, koordinat); `scripts/operasi/renlap.py` `muat_base()`, `jarak_nm` | jelajah bawaan 120 nm di `bobot_renlap.json` |
| Bandara | `scripts/cuaca/data/bandara.json` 136 ICAO | kendala keselamatan |
| Renlap | `scripts/operasi/renlap.py` menulis `public/data/operasi/renlap_<tgl>_<versi>.json` dan `.txt`; `POST /api/operasi/renlap` | target OMC ditambahkan dari zona |
| OMC | `src/omc.js` (`/api/omc/sortie`, `PERAN_TULIS=["tmc"]`), `migrations/0033_omc.sql`, `scripts/omc/nilai.py` | sortie dinilai lawan zona |
| Awan teramati | `scripts/udara/awan_himawari.py` (puncak dingin B13 per kab, `arsip-bmkg.yml` tiap 3 jam) | pemeriksa zona |
| Peta | `public/operasi_peta.js` di atas MapLibre GL 4.7.1 (`public/index.html`) | lapisan semai ditambah di sini |
| Bilah jam | `public/udara/prakiraan.js` (`#jamGeser`), `public/udara/murni.js` `garisLintasan` | pola dipakai ulang, bukan disalin |
| Jadwal | `udara.yml` (`jalan.py` `LANGKAH`), `titik.yml` `40 */3`; `scripts/terbit/jaga_jadwal.mjs` memicu ulang workflow yang terlewat | workflow baru wajib masuk `jaga_jadwal` |

## 3. Yang belum diketahui (diuji di tiket SA-01 sebelum rancangan dikunci)

- Lama unduh dan urai satu putaran 0,1 derajat di runner GitHub (target < 12 menit).
- Apakah `w` di IFS (Pa/s) pada 850 sampai 700 hPa cukup berbeda antarsel untuk membedakan awan tumbuh, atau hanya derau.
- Latensi nyata putaran 0,1 derajat (riset: sekitar 2 jam sesudah 0,25 derajat).
- Konstanta FRP ke emisi (Wooster 0,368 kg per MJ) belum terverifikasi; beban asap tetap relatif.
- Pendaftaran GSMaP NRT (akun JAXA) dilakukan pemilik.
