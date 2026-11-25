# Penerbitan dan level sel

Halaman ini menjelaskan penerbitan, aturan perlu tindakan, dan level sel tampilan.

## Penerbitan dan aturan "perlu tindakan" (`terbit.py`, `aturan.json`)

`terbit.py` menggabungkan baris arsip terakhir per kode, kalibrasi, skor, aturan, dan dampak menjadi `prediksi.json`. Setiap kab membawa kunci `geo` ("kode provinsi|nama kab di public/geo") untuk peta. Tiap angka membawa vonis grupnya. Keluaran divalidasi: 514 kab, peluang 0 sampai 1, `p1 >= p20 >= p50`, `tot` 0 sampai 1000, level 0 sampai 3, kebutuhan tidak negatif. `lalu.json` menyimpan prakiraan tenggang +1 untuk sasaran hari ini dan 3 hari ke belakang (bahan tab Konfirmasi). `lengas.json` menyimpan lengas tanah tenggang +1 per kab (tab Laporan provinsi); nilai tepat 0 dianggap sel laut dan dibuang, nilai di luar 0 sampai 1 ditolak.

Aturan "jika ini maka ini" (`scripts/prediksi/aturan.json`), dievaluasi per kab per tenggang; syarat dengan masukan hilang bernilai tidak diketahui dan tidak memicu:

| Aturan | Syarat | Sumber ambang |
| --- | --- | --- |
| Waspada banjir | `HJN.tot >= 50` DAN `HJN.sm >= 0,45` | BMKG hujan lebat 50 mm per 24 jam; tanah jenuh (ambang `status.py`) |
| Waspada longsor | `HJN.tot >= 100` ATAU jumlah 3 hari `>= 150` mm | BMKG hujan sangat lebat; rancangan aturan longsor |
| Waspada karhutla | `API.ps >= 0,6` DAN jumlah hujan 3 hari `< 3` mm | Ansambel FWI ECMWF: P(FWI >= 14) |
| Imbauan masker, sekolah kurangi kegiatan luar ruang | `ASP.kat >= 1` | ISPU P.14/2020, Tidak sehat |
| Hari tidak melaut (nelayan kecil) | `GEL.hs >= 1,25` m | BMKG: gelombang di atas 1,25 m berisiko bagi perahu nelayan |
| Waspada angin kencang | `CEX.emb >= 46` km/jam | BMKG: angin kencang di atas 25 knot |

Dampak tiap aturan berupa perkiraan: banjir memakai penduduk zona bahaya tinggi (`paparan_kab.json`); longsor memakai seluruh penduduk kecamatan berindeks bahaya longsor >= 0,666 (batas atas); karhutla dan angin memakai seluruh penduduk kab (batas atas); aturan melaut tanpa jiwa karena data nelayan per kab tidak ada di repo. Sekolah dan faskes dihitung per kecamatan. Perkiraan mengungsi = jiwa terpapar dikali laju DIBI `sum(mengungsi)/sum(terdampak)` per jenis (kab bila sedikitnya 3 kejadian tercatat, selain itu nasional). Kebutuhan harian mengikuti Sphere 2018: air 15 L per orang, hunian tertutup 3,5 m2 per orang, 1 jamban per 20 orang, 2.100 kkal per orang. Semuanya berpil "perkiraan, belum diuji balik".

## Level sel tampilan (`besok_inti.js`)

![Ambang level sel di tab Besok untuk hujan, titik panas, angin, dan gelombang. Sumber: public/prediksi/besok_inti.js dan scripts/prediksi/catat.py. Ambang titik panas hanya untuk tampilan.](gambar/prediksi-tangga-level.svg)

```
Hujan   : tot < 20 -> 0 ; < 50 -> 1 ; < 100 -> 2 ; selain itu 3
Titik panas : p < 0,2 -> 0 ; < 0,5 -> 1 ; < 0,8 -> 2 ; selain itu 3  (tampilan saja)
Banjir, Longsor, Gelombang, Angin : lv
Asap    : kat 0..3
Rob     : lewat -> 2 ; tidak -> 0
Level baris = maksimum level sel ; sel tanpa data = null (bukan 0)
Angka pil bencana = jumlah kab dengan level pil >= 2 (pil Gelombang dan rob = maksimum GEL dan ROB)
```

Aturan ini satu sumber: `public/prediksi/besok_inti.js`, dipakai juga oleh `/prediksi/ringkas`, dan didokumentasikan di `data/kajian-bnpb/prediksi-besok/ALGORITMA.md`.
