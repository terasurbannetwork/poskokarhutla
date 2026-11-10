# RISET: ringkasan Siklus Bencana (10 November 2026)

Gabungan tiga riset: `riset/R1-KODE.md` (audit kode), `riset/R2-SUMBER.md` (uji sumber data), `riset/R3-PRAKTIK.md` (peraturan dan metode). Tunduk pada `KEPUTUSAN-AWAL.md` (KA). Angka dan ukuran di bawah dikutip dari ketiga riset itu; yang butuh rincian dibuka di berkas aslinya.

## 1. Temuan penentu rancangan

1. **Kode karhutla `K####` tidak stabil.** `scripts/data/harian.py` memberi ulang id tiap hari urut skor. Kode banjir, gunung api, cuaca, udara, kekeringan stabil lewat `nomor.json` (cache CI, bisa kedaluwarsa), gempa stabil di D1. Maka F1 punya ID sendiri `KJ-` dan tabel pemetaan (sumber, kode sumber) ke ID itu (R1 I.1; KA 17).
2. **Tiga kunci wilayah** (`PP|nama`, BPS 4 digit, DIBI bertitik). Kunci tunggal = BPS 4 digit, jembatan `kab_kunci()` dan `hvc_dasar.kab_kode()`. Tidak ada kunci keempat (R1 B.1).
3. **DIBI harian di repo hanya setahun** (4.404 baris, 28 Okt 2025 sampai 28 Okt 2026). Riwayat 2011-2026 (57.161 baris) hanya di mesin pemilik. `logbook_kejadian.csv` (56.685 baris) dilacak git dan kotor: 644 tanggal kosong, sekitar 10 tahun mustahil (R1 A.2, I.3-4).
4. **F2 baru tiga provinsi**: 13, 33, 63, lokal, dibuat 27 Okt. Tiga puluh lima provinsi lain belum terverifikasi di R2 atau cache; `bangunan.yml` bulanan yang akan melengkapi. InaRISK tidak disimpan, dibaca dari ArcGIS. `halus_33.json` 19,7 MB: 38 provinsi mendekati plafon (R1 C, I.9).
5. **Sekolah 65.551 berkoordinat** sudah ada (`sekolah.json`, 7,4 MB); fasilitas kesehatan lewat Geofabrik OSM, Overture places, Wikidata; SIRS Kemenkes gagal (R1 C; R2 F2).
6. **Overture bangunan** 115 juta bangunan di Indonesia, 276,9 GB: dibaca di tempat dengan DuckDB, simpan agregat; atribut tinggi dan jenis terisi di bawah 2 persen sehingga hanya jumlah dan luas jejak (R2 F2).
7. **F3 gempa jauh lebih siap daripada banjir.** `guncangan.py`, `pager.py`, kalibrasi 8 gempa (model meleset sampai 5 kali). Banjir: Sentinel-1 per kabupaten tanpa pembaca dan tanpa poligon, GFM hanya Jakarta; tahap pertama = poligon kejadian aktif x paparan. "ShakeMap" di KA 19 keliru: di repo hanya nama PNG BMKG; grid USGS `grid.xml` (32,9 MB per gempa) adalah sumber baru dan terbukti hidup (R1 I.6-7; R2 F3).
8. **`lampu_malam.py` belum layak terbit**; tidak dipakai (R1 D).
9. **F4 tanpa skema R3P, harga satuan, atau nilai kerusakan.** Tidak ada API harga satuan PUPR; HSBGN atau Perka manual berlabel `asumsi-kebijakan`, disesuaikan IKK dan IHPB BPS. Tabel baru `sk_*`, bukan `meja_catatan` (R1 E, I.10; R2 F4).
10. **F5**: replay Maret 2025 hanya satu kejadian, DEM bersifat NC, POD 0,04 sampai 0,26. Gladi tahap pertama memutar data arsip F1 (R1 F).
11. **F6 belum punya data**: tidak ada proyeksi iklim di repo; bangun dari NEX-GDDP-CMIP6 dan GHSL (R1 G; R2 F6).
12. **JS dan CSS statis terbuka** kecuali masuk `run_worker_first`; peran staf yang ada dipakai (R1 I.13, I.15; KA 27a).
13. **Sesi lain memegang meja `dampak`** (Juklak 7/2023, `0118`/`0119`): pemilik pemasangan kejadian harus satu (`kunci_kejadian.pasangkan`) (R1 I.5).

## 2. Kode yang dipakai ulang

| Fitur | Dipakai | Catatan |
| --- | --- | --- |
| F1 | `kunci_kejadian.py` (`kab_kunci`, `pasangkan`, `gabung`), `scripts/umum/kejadian.py`, `rekonsiliasi_dalops_dibi.py`, `src/gempa.js` | bentuk `_awal.json` yang dibaca `/semua` tidak berubah |
| F2 | `bangunan.py`, `paparan_bangunan.py`, `src/bangunan.js`, `bangunan.yml`, `terpapar.py`, `bahaya.py` | kontrak `terpapar.json`, `kec.json`, `grid_<prov>.json` tidak diubah; perluasan berkas baru |
| F3 | `guncangan.py`, `pager.py`, `dampak.py`, `s1_genangan.py` | lampu malam tidak |
| F4 | `rumah_rusak.js`, `pemulihan.js`, `meja.js`, `keputusan.js` | tanpa tabel rumah rusak kedua |
| F5 | `logpal.js`, `/petugas`, meja renkon, `pengingat.js`, `logbook_kebutuhan.json` | |
| F6 | `profil_daerah.py` (milik `kampus`), `risiko_hvc.py`, `abrasi.py` | kamus `yakin` 4 nilai disatukan dengan 6 nilai KA 8 |
| F7 | `/semua`, `src/mcp.js`, `src/ai.js` | dibungkus, tidak diganti |

Pola uji dan dummy: `tests/warga/_bnpb.mjs` (`siapkan`), `DUMMY.md`, contoh LogPal dan SIPPA.

## 3. Sumber dipilih per fitur (registri `scripts/siklus/sumber.json`, 42 sumber diuji)

| Fitur | Pakai | Gagal atau bersyarat |
| --- | --- | --- |
| F1 | DIBI, GDACS dan GLIDE (kunci silang), USGS FDSN, PetaBencana (lisensi data belum jelas) | ReliefWeb (U6), Copernicus EMS (nol aktivasi Indonesia), DesInventar (berhenti 2020) |
| F2 | Open Buildings, Overture bangunan dan places, GHSL, WorldPop, Dukcapil, Geofabrik OSM, Wikidata, Sekolah Kita (butuh izin) | SIRS Kemenkes, Overpass cermin |
| F3 | USGS ShakeMap, PAGER, Sentinel-1 via Planetary Computer, Sentinel-2 via Earth Search, UNOSAT lewat HDX | lampu malam |
| F4 | BPS IKK var 2515 dan IHPB var 1018 | HSBGN PUPR, INAPROC |
| F5 | InaRISK ArcGIS, Geofabrik, Overture places | BIG RBI parsial |
| F6 | NEX-GDDP-CMIP6, CHIRPS v3, GHSL epoch, AR6 Zenodo, PSMSL | ATR/BPN, MODI ESDM, CMEMS (butuh akun) |

Belum teruji (R2 penutup): teks lisensi tiap sumber belum dibaca dari halamannya; potongan bbox NEX-GDDP dan unduhan penuh Geofabrik belum dijalankan.

## 4. Konflik dan celah dokumen

- KA 19 menyebut ShakeMap sudah ada; kenyataannya hanya PNG BMKG. KA menang, tetapi PRD menulis grid USGS sebagai sumber baru.
- KA 17 benar hanya untuk non-karhutla; PRD memakai ID `KJ-` untuk semuanya.
- R1 G: 514 berkas per kabupaten menghabiskan jatah 200 berkas `public/` (KA 28); F6 satu berkas per provinsi atau R2.
- R3 menyebut tarif stimulan sebagai U4; di KA tarif adalah U8 dan harga satuan U4. PRD mengikuti KA.
- Tidak ada format resmi nomor induk kejadian (Perban 1/2023 Pasal 8); `KJ-` bersifat sementara. Tidak ada daftar klaster renkon baku, tidak ada batas kelas InaRISK resmi (dua definisi di repo: 0,66 dan 0,67). Tidak boleh dikarang.

## 5. Tautan

`riset/R1-KODE.md` (kode dan bentrok), `riset/R2-SUMBER.md` (uji sumber), `riset/R3-PRAKTIK.md` (Perka 15/2011, Perban 5/2017, 6/2017, 4/2024, 2/2023, Juklak 4/2026, Perka 7/2008, PAGER, JRC, GLIDE, EM-DAT, NEX-GDDP, AR6).
