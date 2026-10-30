# PROFIL-DAERAH: isi profil dan buku per kab/kota

Dokumen kelima dalam urutan otoritas. Kalah dari KP, PRD, ALUR, ALG; menang atas DS, DT,
KM, RU, TIKET. Versi 1.0, 30 Okt 2026.

Profil = berkas JSON per kab `public/data/kemitraan/daerah/<kode4>.json` (514) + per prov
`.../prov/<NN>.json` (38), dibangun `scripts/kemitraan/profil_daerah.py` (harian, setelah
pipeline sumber). Buku = halaman cetak `/kemitraan/buku?kab=<kode4>` yang membaca JSON itu.

**Aturan isi.** Tiap blok: `{nilai…, "sumber": "<nama>", "tanggal": "YYYY-MM-DD",
"yakin": "resmi|terverifikasi|estimasi-model|asumsi-kebijakan"}`. Blok tanpa data →
`null`; buku menulis "Tidak ada data untuk wilayah ini". Tidak ada angka karangan; tidak
ada nol pengganti kosong. Format Indonesia (ribuan titik, desimal koma).

## 1. Skema JSON daerah (v1)

```json
{"v": 1, "kode": "6211", "prov": "62", "nama": "Kab. Pulang Pisau", "dibangun": "2026-10-30",
 "wilayah":   {"luas_km2", "pusat":[lat,lon], "n_kec", "n_desa", "pesisir_kec", "pct_le5m", "sumber","tanggal","yakin"},
 "penduduk":  {"total", "balita", "lansia", "wanita", "per_km2", "worldpop", ...},
 "sosek":     {"p0", "miskin", "ipm", "air_layak", "sanitasi_layak", "hunian_layak", "tren_p0", ...},
 "irbi":      {"seri": [[2015,skor,kelas],...,[2025,skor,kelas]], "bahaya": {"banjir":skor,...}, "skala": "2025 ambang 176", ...},
 "inarisk_kec": {"<bahaya>": {"tinggi": n, "sedang": n, "teratas": [["Kec X",0.92],...5]}, ...},
 "kejadian":  {"tahunan": {"banjir": [[2008,n],...], ...}, "total_2015_2025": {...}, "tren": {"banjir": "naik|turun|datar|null"},
               "musim": {"banjir": [12 nilai bulan]}, "dampak_12bln": {"meninggal","mengungsi","rr_berat","rr_sedang","rr_ringan"},
               "besar": [{"tgl","jenis","meninggal","sumber"}...≤10]},
 "gempa":     {"n_m5_1900", "m_maks", "risiko_lv", "indeks_inarisk", ...},
 "karhutla":  {"titik_tahun": [[2012,n],...], "rasio_elnino", "puncak_bulan", "gambut_ha", "khg", ...},
 "kekeringan":{"level_kini", "spi3", "riwayat": [...], "jiwa_terdampak", ...},
 "gunungapi": [{"gunung", "jarak_km", "krb3_jiwa", "status_kini"}...],
 "pesisir":   {"abrasi_m_th", "transek_n", ...} | null,
 "udara":     {"pm25_rerata_musim", "hari_tidak_sehat", ...} | null,
 "neraca_air":{"defisit_2030", ...} | null,
 "model":     {"risiko_kec": {"kelas_dominan", "kec_sangat_tinggi": [...]}, "longsor_nowcast", "banjir_status", "uji": {"<model>": "lolos|gagal|belum"}},
 "fasilitas": {"sekolah", "siswa", "faskes", "rs", "gudang_bnpb_km"},
 "kapasitas": {"bpbd": {"status","alamat","telp","email"}, "perda_pb", "perda_bpbd", "rpb", "renkon",
               "status_darurat_terakhir", "ikd": null, "relawan_aktif", "kampus_terdekat": [{"nama","km"}...3],
               "kampus_pendamping": [...], "desa_binaan_n"},   // dua kunci ini dari GET ekspor/kapasitas (DT §5.3); null bila gagal
 "siluet": "<path d SVG ≤ 1 KB, Douglas-Peucker>",  // ir.b dipetakan: gempabumi→gempa, karlahut→karhutla, abrasi→abrasi_rob
 "riwayat_luar": [{"tgl","jenis","sumber":"GDACS|CEMS","tautan"}...≤25],
 "masalah":   [{"id":"auto-6211-banjir-A2", "B","A","judul","skor","kelas","bukti":[{"teks","nilai","sumber","tanggal"}],
                "komponen_n"}],
 "pertanyaan_ringkas": {"n_templat", "arah": {...}},
 "sumber": [{"nama","berkas","tanggal","lisensi"}]}
```
Ukuran sasaran ≤ 60 KB per berkas (gzip ≤ 15 KB). Data pakar **tidak** ada di sini;
diambil dari R2 lewat API saat dibuka akun berhak.

## 2. Peta sumber → blok

| Blok | Berkas sumber | Kunci gabung | Catatan |
| --- | --- | --- | --- |
| wilayah, penduduk, sosek, irbi, kapasitas(rg,bp), riwayat_luar | `public/data/wilayah/NN.json` (`profil_wilayah.py`) | kode4 | blok `md, pp, sk, ir, rg, bp, rw` |
| inarisk_kec | `banjir/data/bahaya.json`, `gempa/data/inarisk_gempa.json`, `wilayah` blok `ik` | kunci_nama kec | 0–1, ambang tinggi ≥ 0,67, sedang ≥ 0,33 |
| kejadian.tahunan | `banjir/data/kejadian.json` (2008–2025) | kunci_nama kab | jenis banjir, cuaca, gelombang, kering, longsor, rob |
| kejadian.dampak_12bln | `data/dibi_kejadian.json` | kemendagri "NN.NN" | jendela 12 bulan bergulir |
| kejadian.musim | `banjir/data/riwayat.json` | kunci_nama | |
| gempa | `gempa/data/risiko.json`, `riwayat_m5.json` (titik → kab via poligon) | kunci_nama / poligon | |
| karhutla | `data/riwayat_wilayah/kab.json`, `data/lahan/*gambut*`, `data/khg_prioritas.json` | kunci_nama | |
| kekeringan | `data/kekeringan_wilayah.json`, `kekeringan_riwayat.json`, `data/kejadian/kekeringan-<n>.json` | `kode.json[kab4].kekeringan` (nomor berkas, bukan BPS) | 245 kab |
| gunungapi | `gunungapi/data/paparan.json`, `gunung.json` | jarak titik gunung ke poligon kab ≤ 50 km | |
| pesisir | `pesisir/data/abrasi.json` | transek di dalam poligon | sering null (5 situs) |
| udara | `udara/data/riwayat.json` | prov → kab | yakin estimasi-model |
| neraca_air | `data/neraca_air/kab.json` | kab4 (berkas memakai kode IRBI) | Jawa saja |
| model | `banjir/data/risiko_kecamatan.json`, `risiko_ujibalik.json`, `gerbang_model.json`, longsor `public/longsor/data/*` | kunci_nama kec | label uji wajib |
| fasilitas | `data/sekolah.json`, `data/fasilitas.json` (titik → kab via poligon), `risiko_kecamatan` kolom sekolah/faskes | poligon | sekolah 9 prov saja → tandai cakupan |
| kapasitas.relawan_aktif | `/api/relawan/kapasitas` (k-anonim) diunduh pipeline | kab | < 5 → "di bawah 5" |
| kapasitas.kampus_terdekat | R2 `akademisi/kampus.json` (pipeline punya kunci) → hanya nama kampus + km | titik | bukan data pribadi |
| masalah | ALG §3 | | |

Gabung titik → kab memakai `public/geo/kabupaten/<prov>.json` (ray casting, stdlib).

## 3. Buku: susunan bab

Halaman A4 tegak, Roboto, gaya kop `laporan.js` (logo BNPB tidak dipakai tanpa izin;
merek Centurisk97 kecil di kaki). Tiap halaman kaki: "Sumber: … · Data per <tanggal>".

| Bab | Isi | Komponen visual |
| --- | --- | --- |
| Sampul | nama kab, prov, tanggal bangun, pil kelas IRBI 2025 | peta SVG kab dalam prov |
| Ringkasan (1 hlm) | 5 angka kunci (penduduk, IRBI, kejadian 2015–2025, dampak 12 bln, kapasitas n/5); 5 masalah teratas; 3 bahaya teratas | kartu angka, daftar berpil P1/P2 |
| 1. Gambaran wilayah | luas, kec, desa, pesisir, elevasi rendah, penduduk, rentan, sosek | tabel 2 kolom, batang rentan |
| 2. Indeks risiko | IRBI 2015–2025 (seri), bahaya per jenis 2025, perbandingan prov/nasional | grafik garis, batang horizontal |
| 3. Profil per bahaya | satu subbab per bahaya yang skornya > 0 atau ada kejadian: skor bahaya, kec teratas InaRISK, kejadian tahunan + tren, musim, model platform + status uji | batang tahunan, pita musim 12 bln, tabel kec |
| 4. Riwayat kejadian | tabel tahunan semua jenis; kejadian besar; dampak 12 bln; GDACS/CEMS | tabel, linimasa |
| 5. Paparan dan fasilitas | sekolah, faskes, RS, bangunan, KRB gunung api | tabel |
| 6. Kapasitas | BPBD (kontak resmi), perda, RPB, renkon, status darurat, IKD (bila diisi), relawan, kampus terdekat dan pendamping, desa binaan | daftar centang ada/tidak |
| 7. Masalah prioritas | semua masalah otomatis + BPBD + koreksi lapangan, dengan bukti | kartu masalah |
| 8. Pakar dan solusi (akun) | per masalah P1/P2: 5 pakar teratas + 1 kalimat solusi + DOI | kartu ringkas |
| 9. Panduan pendataan | pertanyaan per narasumber (ALG §6) + data yang diminta | daftar bernomor + kotak isian kosong |
| Lampiran | sumber dan tanggal semua blok, metode skor (ALG §3), label keyakinan | tabel |

Edisi publik (T-B, nanti): bab 8 dibuang, kontak BPBD tetap (data resmi).

## 4. Profil provinsi
Agregat 514 → 38: jumlah/rerata tertimbang penduduk, daftar kab urut IRBI, masalah P1
per kab, peta kab berwarna kelas. Dipakai lembar prov dan buku ringkas provinsi
(`/kemitraan/buku?prov=NN`, bab: ringkasan, tabel kab, masalah P1 lintas kab).

## 5. Uji isi (RU §4)
- 514 berkas ada, valid skema v1, ≤ 60 KB.
- Tiap blok non-null punya sumber + tanggal + yakin.
- Pulang Pisau (6211): karhutla tidak null, gambut_ha > 0.
- Jakarta Pusat (IRBI 3171) bukan Jakarta Selatan.
- Kab tanpa data DIBI → `dampak_12bln: null`, bukan nol.
- Tidak ada kunci data pakar (nama dosen, email) di `public/data/kemitraan/**`.
