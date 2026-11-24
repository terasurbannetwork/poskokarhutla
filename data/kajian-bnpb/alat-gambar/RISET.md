# RISET: Alat gambar wilayah di peta utama

Bahan untuk PKH-37. Tidak ada angka di sini yang tampil di layar. Sumber: `data/kajian-bnpb/pembanding-pantaukarhutla/RISET.md` (putaran 24 Nov 2026, bagian SIPARHUTLA Kotim), dibaca dari tangkapan layar; situsnya tidak dibuka.

## 1. Yang dilaporkan pembanding

- Layak ditiru: alat gambar poligon, kotak, buffer 1 sampai 50 km, ukur jarak; komparasi periode; kelas FRP; siang lawan malam.
- Jangan ditiru:
  - peringkat jenuh (semua kecamatan skor 100 dan "Awas");
  - label "Baik (Aman)" di AQI;
  - tujuh "stasiun" berisi nilai model, bukan alat ISPU;
  - map key FIRMS disimpan di localStorage;
  - "luas area terbakar" yang sebenarnya luas gambar pengguna (kotak 542 ribu ha dengan 0 titik);
  - "malam 65% berarti gambut" (tafsiran belum diuji).

Dua butir terakhir menentukan D3 dan D5.

## 2. Yang kita punya (dibaca 24 Nov 2026)

| Bahan | Berkas | Keadaan | Dipakai |
| ----- | ------ | ------- | ------- |
| Peta utama | `public/index.html` (MapLibre GL 4.7.1 dari cdnjs, 922 KB); kata `ukur` di berkas itu adalah indikator ukuran (`S.ukur`, `ukurAktif`), **bukan** alat ukur jarak | ada | tempat tombol dan lapisan |
| Alat ukur jarak | RISET pembanding menyebutnya ada di peta utama; penelusuran kata kunci 24 Nov 2026 tidak menemukannya | belum terkonfirmasi | diperiksa ulang di AG-01 |
| Pustaka gambar | tidak ada (`terra-draw`, `maplibre-gl-draw`, `turf` tidak ditemukan di `public/*.js` dan `index.html`) | – | gambar dibuat sendiri, kecil (D1) |
| Titik panas | `public/data/hotspot.json` (11 MB, 217.042 baris; `kolom: lat, lon, jam, sensor, frp, keyakinan, wilayah, tgl_wib`; `acuan` UTC; `sensor_utama: M, N, N20`), `hotspot24.json`, `hotspot72.json` | dimuat `index.html`, `titik_live.js`, `sim_data.js`, `sim_panel.js`, `renlap_cetak.js` | ya (D4) |
| Definisi titik utama | `scripts/data/titik_unik.py`: lokasi unik per hari WIB, semua satelit, semua keyakinan | ada | satu definisi (D4) |
| FRP dan keyakinan | kolom `frp`, `keyakinan` di `hotspot.json` | ada | ya |
| Siang lawan malam | `gambut_bara.py` memakai malam 18.00 sampai 06.00 WIB; `jam` relatif terhadap `acuan` | ada | ya (D5) |
| Petak 375 m | `scripts/data/riwayat_petak.py` (`PETAK` 0,0034 derajat), `PIKSEL_HA = 14.0625` di `gambut_bara.py` | ada | sel berdeteksi (D6) |
| Luas dNBR | `scripts/data/luas_citra.py` (per insiden); `public/data/citra.json` berisi `dibuat, hari, kotak_km, kompleks, atribusi`; berkas `luas_citra.json` yang disebut skrip tidak ada di `public/data` per 24 Nov 2026 | tak pasti | diperiksa di AG-01 (D7) |
| Desa | `public/geo/desa/<kode kab>.json` (513 berkas, kira-kira 80 sampai 130 KB masing-masing), `public/data/desa_cari.json` (3,4 MB) | ada | ya (D8) |
| Kecamatan | `public/geo/kecamatan/<kode provinsi>.json` (mis. `11.json` 585 KB), `public/geo/kabupaten`, `public/geo/provinsi.json` | ada | ya (D8) |
| Penduduk | `public/data/penduduk.json` (344 KB): `sel` 0,25 derajat, `grid` `[lat, lon, penduduk, prov]`, `kec` `"PP|kab|kec"` ke jumlah; WorldPop 2026 | ada | kasar (D8, Q4) |
| Peta api 3D | `public/api3d.js` | ada, disetujui (K5) | jangan bentrok (D9) |
| Titik per hari | `public/data/titik_hari/<tgl>.json`, sejak Jan 2026 | ada | tidak (Q5) |

## 3. Yang belum diketahui dan harus diukur

1. Memori dan waktu menghitung titik dalam poligon untuk 217 ribu baris di ponsel menengah; ukuran `hotspot.json` sudah dimuat peta, jadi biaya tambahan hanya hitungan.
2. Apakah variabel data titik di `index.html` bisa dipakai ulang tanpa memuat dua kali; nama variabelnya dan bentuknya dibaca di AG-01.
3. Berapa kab rata-rata yang beririsan dengan buffer 50 km (bergantung wilayah) dan berapa KB desa yang dimuat.
4. Apakah poligon desa disederhanakan sehingga irisan dengan gambar kecil (1 km) tak teliti; sudah dicatat sebagai batas di `title` (KEPUTUSAN desa-waspada D4).

## 4. Risiko

- Pengguna membaca "0 titik" sebagai "tidak terbakar": D13 menolaknya.
- Pengguna membaca luas gambar sebagai luas bakar: D3 menolaknya.
- Penduduk kecamatan terbaca sebagai penduduk terpapar: D8 menolaknya.
