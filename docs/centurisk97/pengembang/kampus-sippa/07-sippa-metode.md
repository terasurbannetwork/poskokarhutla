# SIPPA: hidraulika dan pipeline data

Bagian ini memerinci hitungan hidraulika, gerbang kalkulator, dan pipeline data SIPPA.

## SIPPA: hidraulika dan gerbang kalkulator

Kode: `public/pipa/hitung.js` (JavaScript, kembar Python di `scripts/data/sippa/hidraulika.py`). Kasus acuan bersama: `tests/sippa/fixtures/acuan.json`. Konstanta ada di `KONST` (`hitung.js:5`).

Rumus utama (`hitung.js:99`):

```
hf (Hazen-Williams) = 10,67 * L * Q^1,852 / (C^1,852 * D^4,871)
hm = K * v^2 / (2 * g)
TDH = beda_tinggi + hf + hm + sisa_bar * 10,197 + head_hisap(3,5 m bila hisap)
P_pompa = TDH / 10,197  (bar)
Daya_poros (kW) = rho * g * Q * TDH / eta / 1000
P_ujung = sisa_bar + P_tersedia - P_pompa
waktu_isi (menit) = (luas_penampang * L) / Q / 60
```

Masukan bawaan: layflat DN100, debit 300 L/menit, 8 lance, panjang 1000 m, C 130, beda tinggi 2 m, K 5, tekanan sisa 3 bar, efisiensi 0,65, suhu 35 derajat Celsius, kelas pompa `ve1500`, kedalaman injeksi 1,5 m.

Konstanta penting: batas kerja 88 persen dari PN, derating suhu 1 - 0,014 x (T - 20) dijepit antara 0,58 dan 1, serapan 40 L/menit per lance, kecepatan peringatan 3 m/s, sisa tekanan keras 1 bar dan syarat 2 bar, daya poros paling tinggi 85 persen rating pompa, kedalaman injeksi paling besar 5 m (keputusan 50) dan 3 m ke atas hanya untuk lengan uji kedua.

Kelas pompa yang dikenal: `ve1500` (1.500 L/menit pada 10 bar, bensin, 44 kW), `portabel_besar` (kelas VC52AS, 30 kW), `tekanan_tinggi` (kelas Mark-3, 8 kW). Kurva rating hanya dua sampai tiga titik datasheet yang diinterpolasi linear, bukan kurva Q-H terukur.

Gerbang (`hitung.js:133`):

| Kode | Tingkat | Syarat |
| --- | --- | --- |
| H-TEKANAN | keras | tekanan pompa melebihi batas kerja selang |
| H-SISA | keras | tekanan ujung kurang dari 1 bar |
| H-SISA2 | syarat | tekanan ujung 1 sampai di bawah 2 bar |
| H-SERAP | keras | debit melebihi serapan lance |
| H-RATING | keras | debit di luar rating pompa |
| H-DAYA | keras | daya poros melebihi 85 persen rating |
| H-KECEPATAN | syarat | kecepatan di atas 3 m/s (risiko lonjakan) |
| H-PANAS | keras | HDPE di perimeter api aktif |
| H-AIR | keras atau syarat | sumber habis (keras), atau Q95 kurang dari 1,5 kali debit operasi (syarat) |
| H-DSM | catatan | beda tinggi dari DSM berkanopi, ukur ulang |
| H-UJI | catatan | kedalaman 3 sampai 5 m hanya untuk lengan uji kedua |

Vonis: NO-GO bila ada gerbang keras, HOLD bila hanya ada gerbang syarat, KONDISIONAL selain itu. Tidak ada GO karena belum ada pembuktian lapangan.

Neraca air sumber (`neracaAir`, `hitung.js:249`): stok(t+1) = stok(t) + (maks(0, Q95 - Q_eko) - Q_api) x 86,4 - evaporasi, dengan L/detik dikalikan 86,4 untuk menjadi m3/hari. `habis_hari` adalah hari pertama stok negatif. Lonjakan tekanan Joukowsky: dP (bar) = 1000 x a x dv / 100.000, dengan a = 300 m/detik untuk HDPE dan 150 m/detik untuk layflat (asumsi).

Keuangan: AF = (1 - (1+r)^-H) / r, NPV = (manfaat - opex) x AF - capex, BCR = manfaat x AF / (capex + opex x AF). Bawaan r = 0,08 dan H = 5 tahun. Manfaat bawaan nol (keputusan 15), jadi NPV dan BCR bawaan tidak boleh dibaca sebagai klaim manfaat.

## SIPPA: pipeline data

Semua berkas turunan ada di `data/sippa/keluaran/` dan diunggah ke R2 `sippa/` oleh `data.yml`. Worker membacanya lewat `GET /api/sippa/data/<nama>` dengan nama yang diizinkan (`src/sippa.js:543`): `kelayakan_kompleks`, `kelayakan_sel`, `zona`, `sel22`, `kit_nasional`, `pemicu`, `aoi_calon`, `akses_kompleks`, `cat`, `jembatan_dibi`, `program_jembatan`, `prioritas`, `brgm_pembasahan`, `konsesi_kompleks`.

| Skrip | Fungsi |
| --- | --- |
| `sel22.py` | kekerapan deteksi VIIRS 2012-2025 per sel 2,2 km; semua tahun wajib ada, tahun kosong menghentikan proses, tidak dikarang |
| `zona.py` | kelayakan kompleks dan sel, ringkasan zona A sampai D tiga versi |
| `osm_prov.py`, `osm_pbf.py` | jarak kompleks ke jalan dan air OSM per provinsi (ubin 0,5 derajat), cadangan dari ekstrak Geofabrik |
| `akses_sippa.py`, `moda.py` | rute dari posko atau Daops terdekat lewat graf jalan OSM; moda jalan (mobil, motor, jalan kaki) dari aturan tag, berlabel asumsi-kebijakan |
| `pemicu.py`, `prioritas.py` | tingkat pemicu harian dan peringkat prioritas mingguan |
| `nasional.py` | kit per provinsi dari luas terbakar puncak SiPongi |
| `aoi.py` | calon AOI pilot 2027 |
| `brgm.py`, `cat.py`, `jembatan.py` | sekat kanal dan sumur BRGM, cekungan air tanah, jembatan rusak DIBI |
| `pilot_cek.py` | pemeriksa kelengkapan data pilot dan vonis |
| `respons.py`, `bersama.py`, `kembar_cli.py` | kembar Python matriks respons, bagian bersama, dan swauji paritas kembar |
| `pilot/` | pembuat berkas uji pilot, termasuk `ekspor_web.py` yang dibaca `src/uji_pilot.js` |

Estimasi waktu tempuh memakai kecepatan per kelas jalan dan moda dan berlabel estimasi-model. Untuk rencana kunjungan, jarak dan waktu jalan memakai OSRM publik bila tersedia, dan bila gagal perkiraan garis lurus x 1,4 pada 40 km per jam berlabel estimasi (`public/pipa/kunjungan.js:5`). Kompleks yang dicurigai api tambang atau sumber panas tetap dikeluarkan secara bawaan, dan bisa dimasukkan dengan tanda peringatan.
