# Desain teknis

## Berkas dan pemilik

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/bnpb/inarisk.py` | tarik, bangun, `--cek` (stdlib) | `ruang-bnpb` |
| `public/data/inarisk/{irbi,jiwa,ikd,tautan}.json`, `kab.geojson` | cermin | `ruang-bnpb` |
| `public/bnpb/inarisk.html`, `inarisk.css` | kerangka halaman | `ruang-bnpb` |
| `public/bnpb/inarisk.js` | tab, muat data, tab IRBI | `ruang-bnpb` |
| `public/bnpb/inarisk_hitung.js` | fungsi murni ALGORITMA (UMD kecil: `window.InariskHitung` dan `module.exports`) | `ruang-bnpb` |
| `public/bnpb/inarisk_detail.js` | dialog detail IRBI dan analisa IKD, grafik SVG | `ruang-bnpb` |
| `public/bnpb/inarisk_ikd.js`, `inarisk_gis.js`, `inarisk_unduh.js`, `inarisk_info.js` | tab lain | `ruang-bnpb` |
| `tests/bnpb/inarisk_hitung.test.mjs` | uji fungsi murni dengan data cermin | `ruang-bnpb` |
| `src/inarisk.js` + rute di `src/bnpb.js` | proksi `/api/inarisk/*`, rute halaman | `warga-api` |
| `tests/warga/inarisk_proksi.test.mjs` | uji proksi dengan fetch tiruan | `warga-api` |

## Bentuk JSON cermin

```
irbi.json  {dibuat, sumber, tahun:[2015..2025], kolom:["total","gempabumi",...9],
            kab:{pcode:[nama, kode_prov]}, prov:{kode:nama},
            nilai:{pcode:{tahun:[total, ...9 bahaya]}},   // null bila kosong
            status:{pcode:"Tinggi"|"Sedang"} (2025), pembanding:{pcode:angka}}
jiwa.json  {dibuat, bencana:[{id,nama}], kab:{pcode:{penduduk, terpapar:[11]}}}
ikd.json   {dibuat, tahun_tersedia, daftar:[[pcode, nama, prov, tahun, indeks, tingkat]],
            prioritas:["Perkuatan Kebijakan...", ...7],
            indikator:[teks...], aksi:[teks...],          // katalog tanpa duplikat
            analisa:{"pcode/tahun":{indeks, nilai:[7], rek:[[p, indikator_idx, aksi_idx], ...]}}}
tautan.json {dibuat, baris:[{judul, kategori, url, deskripsi}]}
kab.geojson batas 514 kab, properti {pcode, nama}, disederhanakan (koordinat 3 desimal)
```

## Rute Worker

| Rute | Ke InaRISK | Catatan |
| --- | --- | --- |
| `GET /bnpb/inarisk` | - | `halamanBnpbPublik(..., "inarisk", {pribadi: true, citra: true, gis: true})` |
| `GET /api/inarisk/unduhan?...` | `downloads` | parameter disaring: page, per_page<=50, search<=80 huruf, category, file_format, sort, region |
| `GET /api/inarisk/unduhan/ringkas` | `downloads/summary` | |
| `POST /api/inarisk/dampak` | `dashboards/dashboard-jakarta/spatial-query/{0\|1}` | badan <= 64 KB, hanya `type`, `center`, `radius_meter` (<= 50 km), `geometry` |
| `GET /api/inarisk/kegiatan/{id}/{pcode}` | `posgagah/geojson/...` | id angka, pcode 2-10 digit; buang `User Pemantau` dan properti nama orang |
| `GET /api/inarisk/ubin/{layanan}?bbox=` | `gis.bnpb.go.id/.../{layanan}/ImageServer/exportImage` atau `MapServer/export` | `layanan` dari daftar izin `LAPISAN` di `src/inarisk.js`; bbox 4 angka EPSG:3857; balasan PNG |

Cache `caches.default` 1 jam untuk GET data, 7 hari untuk ubin; batas laju lewat `laju_bnpb`; tenggat
20 detik (ubin 60 detik, karena server ArcGIS sering membalas 503 sesudah sekitar 60 detik).

## CSP

Ubin lewat proksi sendiri (`'self'`), jadi CSP hanya butuh citra Esri (`citra: true`, sudah ada) dan
host foto `https://inarisk2.bnpb.go.id` di `img-src` (opsi `gambar`).

## Ubin ArcGIS (temuan katalog 23 Nov 2026)

763 layanan, tidak ada yang berubin cache; semua `exportImage` (ImageServer) atau `export` (MapServer)
dinamis, SR asli EPSG:3395, `imageSR=3857` diterima. Daftar izin: ImageServer `layer_bahaya_*` (12),
`layer_risiko_*` dan `layer_kerentanan_*` yang tidak berkunci token, `layer_peta_kapasitas`; MapServer
`Basemap/batas_administrasi`. Dikecualikan karena token: `layer_bahaya_tsunami_30`,
`layer_kerentanan_banjir`, `layer_risiko_tanah_longsor`. Ubin gagal tampil sebagai lapisan kosong dengan
pesan di panel lapisan, bukan galat.

## Pipeline

Ditambahkan ke workflow mingguan oleh `mekanik-mesin` sesudah tarik tangan pertama lolos (tiket IR-09).
