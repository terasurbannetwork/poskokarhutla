# Peluang semai: masukan dan skor

Halaman ini menjelaskan data masukan peluang semai awan serta turunan, gerbang, faktor, dan skor zona.

## M13. Peluang semai awan: data masukan

- **Cuaca**: ECMWF IFS Open Data 0,1 derajat (CC BY 4.0), putaran 00 dan 12 UTC, langkah 0 sampai 36 per 3 jam; wilayah 94 sampai 142 BT dan 12 LS sampai 7 LU (grid 481 x 191 = 91.871 sel). Field `sfc`: lcc, mucape, tclw, tp, 10u, 10v, 2t, 2d; field `pl`: u dan v pada 850, 700, 200 hPa, r 850, t dan gh pada 1000, 925, 850, 700, 600, 500 hPa, w 850 dan 700 (29 field per langkah, sekitar 840 MB per putaran). Diambil per potong lewat berkas `.index` (rentang byte), 6 unduhan paralel, 3 kali coba ulang (`scripts/operasi/semai_ifs.py:20-36`). Pengurai GRIB2 memakai `eccodes` (hanya di workflow `semai.yml`, keputusan pemilik). `--putaran auto` mundur sampai 4 putaran bila yang terbaru belum lengkap.
- **Titik panas**: `public/data/kluster.json` (kolom `frp24`, daya radiasi 24 jam, bukan `frp` kumulatif) dan `hotspot24.json` untuk hitungan piksel per satelit; kluster di luar daratan Indonesia atau provinsi tidak dikenal tidak dipakai.
- **Pendukung**: batas provinsi repo (zona waktu dan nama), `scripts/udara/kota.json` (kota), `scripts/cuaca/data/bandara.json` (136 bandara BMKG), `op_base` (base terdaftar), `awan_himawari.json` (tanda awan teramati).

## M14. Peluang semai awan: turunan, gerbang, faktor, skor

Seluruh ambang berada di `scripts/operasi/semai_bobot.json` dengan `"status": "HIPOTESIS"` dan `"versi": "1"`; dasar tiap nilai ditandai N (panduan produk pembanding), L (literatur), atau H (hipotesis penyusun). Rujukan fungsi: `scripts/operasi/semai_murni.py` dan padanan numpy di `scripts/operasi/semai.py:406-470`.

Turunan per sel per langkah:

| Turunan | Rumus |
| ------- | ----- |
| Hujan 3 jam (mm/jam) | `(tp[t+3] - tp[t]) / 3`, negatif dipotong 0; langkah 36 tidak punya hujan blok |
| Geseran (m/s) | `hypot(u200 - u850, v200 - v850)` |
| Angin pengarah | rerata vektor 850 dan 700 hPa |
| LCL (m) | `125 x (T2m - Td2m)` (Espy), minimal 0 |
| Suhu dasar awan (C) | `T2m - 273,15 - 0,0098 x LCL` |
| Level beku | interpolasi linear `gh` pada lapisan pertama dari bawah dengan t sama dengan atau di bawah 273,15 K |
| Kedalaman awan hangat | `level beku - (LCL + elevasi)`; elevasi diaproksimasi `maks(0, gh 1000 hPa)` karena geopotensial permukaan tidak ikut diunduh |
| Updraf (m/s) | `w = -omega x R x T / (p x g)`, rerata 850 dan 700 hPa, positif berarti naik |

**Gerbang** (sel layak semai bila semua lolos; nilai hilang berarti gagal; `semai_bobot.json` bagian `gerbang`):

| Gerbang | Syarat | Dasar |
| ------- | ------ | ----- |
| G1 | tutupan awan rendah 0,25 atau lebih | N |
| G2 | MUCAPE 1.500 J/kg atau lebih | N |
| G3 | cairan awan 0,05 kg/m2 atau lebih | N |
| G4 | geseran 850 ke 200 hPa 12,5 m/s atau kurang | N |
| G5 | RH 850 hPa 65% atau lebih (dipangkas ke 100) | N |
| G6 | hujan 3 jam di bawah 4 mm/jam | N |
| G7 | suhu dasar awan 10 C atau lebih | H |
| G8 | kedalaman awan hangat 1.000 m atau lebih | L |
| G9 | blok 3 jam beririsan 07.00 sampai 16.00 waktu setempat | N |

Tanda bahaya (bukan gerbang): MUCAPE di atas 3.500 J/kg menurunkan zona ke daftar "hati-hati" (maksimal 3). Mode "seperti Nimbus" (pembanding) mematikan G7, G8, dan tanda bahaya.

**Sel kandidat**: hanya sel dalam 60 km dari pusat cluster api besar. Cluster besar: `frp24 >= maks(40 MW, 2% frp24 cluster terbesar)`. Tanpa cluster besar, keluaran `zona = []` dengan `alasan_kosong = "tidak_ada_api_besar"`.

**Tiga faktor**:

```
Q = rerata(q_cape, q_air, q_rh, q_geser, q_naik)         tiap komponen dipotong ke 0..1
q_cape  = (MUCAPE - 1500) / (3000 - 1500)
q_air   = (tclw - 0,05) / (0,30 - 0,05)
q_rh    = (RH850 - 65) / (95 - 65)
q_geser = (12,5 - geseran) / 12,5
q_naik  = w / 0,1                                         (lihat Batasan: dokumen menulis 1,0)

titik hujan = titik sel digeser angin pengarah selama 30 menit (sensitivitas 20, 45, 60)
F = jumlah frp24 cluster dalam 25 km titik hujan (cluster gambut dikali 1,5)
D = 1 - exp(-F / 200 MW), D = 0 bila F = 0
T = ramp(jarak titik hujan ke kota atau bandara terdekat, 10 km, 50 km)
```

**Skor**: `skor = gerbang x Q^0,45 x D^0,40 x T^0,15` (rerata geometris berbobot; bernilai 0 bila satu faktor 0). Mode seperti Nimbus: `skor = gerbang x (0,45 Q4 + 0,40 D + 0,15 T)` dengan Q4 tanpa komponen naik dan D = 0 memaksa skor 0 (`semai_murni.py:155-164`). Bobot dinormalkan berjumlah 1.

![Alur skor zona semai: masukan prakiraan dan titik panas melewati gerbang G1 sampai G9, lalu skor dari tiga faktor Q, D, dan T menghasilkan paling banyak lima zona. Seluruh bobot berstatus hipotesis. Sumber: scripts/operasi/semai_bobot.json dan scripts/operasi/semai_murni.py.](gambar/cuaca-udara-semai-gerbang-skor.svg)

**Zona** (`semai_murni.py:173-205`): ambil skor tertinggi tiap sel di langkah siang; pilih serakah, sel terbaik jadi zona, buang sel dalam 40 km; berhenti pada 5 zona (A sampai E) atau skor di bawah 0,35. Jendela terbang: langkah berurutan di sekitar langkah terbaik dengan skor sama dengan atau lebih dari 85% puncak, dipotong ke 07.00 sampai 16.00 setempat. Zona waktu dari kode provinsi (WIB, WITA, WIT); kode tidak dikenal adalah galat, bukan tebakan.

**Daya jangkau, ketinggian, bahan** (`semai_murni.py:243-292`, bagian `terbang`, `ketinggian`, `rute` di JSON bobot):

- Base: bandara terdekat tanpa batas jelajah (keputusan pemilik 14 November 2026). Menit terbang `jarak / 300 km/jam x 60`, dibulatkan 5 menit, berlabel perkiraan.
- Ketinggian: `(LCL + elevasi) x 3,281` kaki dibulatkan 500; di luar LCL 300 sampai 3.000 m tidak ditampilkan angka.
- Inversi: suhu naik terhadap tinggi antara permukaan dan 700 hPa (lapisan di bawah permukaan dibuang). Bahan: inversi dan beban asap sedang atau tinggi berarti "dry ice dulu ..., lalu NaCl"; selain itu NaCl.
- Jumlah sortie: `lantai(jendela menit / (2 x menit terbang + 30 menit semai))`, minimal 1, maksimal armada siap (belum diketahui, dihitung 1). Muatan per sortie belum diisi (`muatan_kg` kosong).
- Rute satu sortie OMC: CP0 base, CP1 titik masuk 10 NM sebelum zona pada garis base ke zona, CP2 sampai CP5 dua kaki tabur 10 NM berjarak 3 NM melintang angin pengarah (melintang garis base-zona bila angin kurang dari 1 m/s), CP6 kembali ke base. Jarak, haluan, radial VOR, dan waktu tempuh memakai fungsi renlap yang sudah ada (`scripts/operasi/renlap.py`).

**Mulai dari target**: `kandidat_target` menghitung kandidat terbaik per kabupaten yang memiliki cluster aktif (sampai 40 baris per target) dengan faktor D diganti 1 bila titik hujan jatuh dalam kabupaten dilebarkan 25 km; target kawasan gambut (KHG) belum ada karena poligon KHG tidak tersedia di repo (`scripts/operasi/semai.py:951-983`). Hasilnya ada di `semai.json`, namun belum ada pemilih target di layar.
