# Hasil periksa manual AG-08 (24 Nov 2026)

Pemeriksa bersih (validasi-model). Data: public/data/hotspot.json (acuan 2026-10-12T12:27Z, 217.042 baris); alat: public/alat_gambar_geo.js dengan dihitung = AngkaKawasan.unik(baris,0) seperti public/index.html:1867.
Pembanding independen (Python stdlib di luar repo): lokasi unik = deteksi paling awal per (hari WIB, sel 0,003375 derajat berskala cos lintang), sensor M/N/N20/N21 semua keyakinan; titik-dalam-poligon sendiri; jam WIB = (acuan+jam+7) lantai, malam bila >=18 atau <6; luas = ellipsoid WGS84, buffer = 720 titik Vincenty.
Tiga gambar sesuai permintaan (Pulang Pisau, buffer OKI, kotak laut); menggantikan contoh wilayah di RENCANA-UJI 4.

| Gambar | Bentuk | Luas alat km2 | Luas pembanding km2 | Selisih |
| --- | --- | --- | --- | --- |
| 1 Pulang Pisau | poligon 5 simpul (114,0/-2,9; 114,5/-2,95; 114,6/-2,6; 114,2/-2,45; 113,95/-2,7) | 2794,3 (tampil 2800) | 2781,9 | +0,45% |
| 2 OKI | buffer 10 km di 105,2/-3,45 | 313,8 (tampil 310) | 314,2 | -0,13% |
| 3 Laut Jawa | kotak 108,0/-5,5 s.d. 108,1/-5,4 | 123,1 (tampil 120) | 122,5 | +0,44% |

Selisih luas = bola R 6371,0088 lawan ellipsoid plus 72 sudut lingkaran; di bawah 0,5%.

Titik (alat = pembanding di semua sel, selisih 0):

| Gambar | Periode | Titik unik | FRP jumlah | Siang | Malam |
| --- | --- | --- | --- | --- | --- |
| 1 | 24 jam | 651 | 3834,5 | 97 | 554 |
| 1 | 72 jam | 1059 | 5254,9 | 103 | 956 |
| 1 | 7 hari | 2943 | 13502,0 | 371 | 2572 |
| 2 | 24 jam | 151 | 3397,5 | 43 | 108 |
| 2 | 72 jam | 356 | 4349,2 | 69 | 287 |
| 2 | 7 hari | 1029 | 10031,6 | 220 | 809 |
| 3 | 24 jam, 72 jam, 7 hari | 0 | null (bukan 0) | 0 | 0 |

## Vonis

- Gambar 1: LULUS (titik, FRP, siang, malam sama persis; luas +0,45%).
- Gambar 2: LULUS (sama persis; luas -0,13%).
- Gambar 3: LULUS (nol titik yang benar-benar dihitung, FRP null).

## Catatan di luar kriteria (untuk layar-peta)

1. sel dan jejak_ha memakai PETAK=0.0034 tanpa skala cos lintang, sedangkan lokasi unik memakai sel 0,003375 berskala cos: sel (539) < titik_unik (651) pada gambar 1, 24 jam; jejak_ha tidak sebanding.
2. Tanpa dihitung (jalur cadangan hitungTitik) angka beda dari angka utama: gambar 1, 24 jam 646 lawan 651, FRP 4159,5 lawan 3834,5. Aman selama pemanggil menyuplai S.dihitung (public/alat_gambar.js:91 menyuplai).
