# Matriks jarak air x jalan, 865 kompleks Kalteng

Zona: A air<2,5 km & jalan<5 km; B air<2,5 & jalan>=5; C air>=2,5 & jalan<5; D sisanya (km, jarak garis lurus ke garis OSM terdekat). Ambang lama 2/3 km dihentikan; hasil acuan lama A188 B418 C89 D170.

Pereproduksi versi lama dari kendala.json (jalan None = tak ada rute = jauh): {'B': 418, 'D': 170, 'A': 188, 'C': 89}; cocok dengan A188/B418/C89/D170: **True**.

| Zona | Aturan | Lama (kendala.json) | Baru: semua jalan x semua air | Baru: air semua + jalan lama | Air lama + jalan baru | Baru: hanya jalan utama (tersier ke atas) x semua air |
|---|---|---:|---:|---:|---:|---:|
| A | air<2,5 & jalan<5 | 188 | 470 | 197 | 454 | 199 |
| B | air<2,5 & jalan>=5 | 418 | 158 | 431 | 152 | 429 |
| C | air>=2,5 & jalan<5 | 89 | 166 | 80 | 182 | 80 |
| D | air>=2,5 & jalan>=5 | 170 | 71 | 157 | 77 | 157 |

"Semua jalan" = highway motorway..tertiary, unclassified, residential, service, track, living_street (bisa dilalui kendaraan; track belum tentu musim hujan).
"Semua air" = waterway river/canal/stream/ditch/drain + tepi natural=water/landuse=reservoir.

## Perpindahan zona lama -> baru

| lama \ baru | A | B | C | D |
|---|---:|---:|---:|---:|
| A | 184 | 0 | 4 | 0 |
| B | 263 | 152 | 3 | 0 |
| C | 13 | 0 | 76 | 0 |
| D | 10 | 6 | 83 | 71 |

## Ringkasan jarak (km)

| ukuran | median | p90 |
|---|---:|---:|
| air lama (n=865) | 1.28 | 6.23 |
| air baru semua (n=865) | 1.02 | 5.79 |
| air baru kecil saja (n=865) | 1.67 | 11.26 |
| jalan lama (n=731) | 6.66 | 18.72 |
| jalan baru semua (n=865) | 2.27 | 11.74 |
| jalan baru setapak (n=865) | 8.82 | 16.00 |

Kompleks tanpa jalan di data lama (None): 134; tanpa jalan kendaraan OSM dalam 16 km: 44.
