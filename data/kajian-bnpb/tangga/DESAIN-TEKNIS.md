# DESAIN-TEKNIS: Tangga Peringatan

## Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/prediksi/tangga.py` | Python 3 stdlib; `python3 tangga.py` menulis keluaran, `python3 tangga.py uji` self-check tanpa jaringan. Dirantai di `jalan.py giliran`. | prediksi |
| `public/prediksi/data/tangga.json` | Keluaran. | prediksi |
| `public/prediksi/data/tangga_arsip/YYYY-MM.jsonl` | Arsip harian append-only. | prediksi |
| `public/prediksi/tangga.js`, `tangga_inti.js`, `tangga.css`, bagian `index.html` | Layar tab Tangga; `tangga_inti.js` memuat fungsi murni (gabung cakupan, urutan) agar bisa diuji di Node. | prediksi |
| `tests/prediksi/tangga.test.mjs` | Uji. | prediksi |

Tidak menyentuh worker, D1, migrasi, workflow.

## Skema `tangga.json`

```
{ versi: 1, dibuat: ISO WIB, hari: "YYYY-MM-DD",
  skala: [{id, nama, ok: {k: bool, b: bool}, gagal: [str]}]            // urutan terjauh ke terdekat
  sumber: { <sid>: {lembaga, nama, terbit|null (hanya tanggal terbit sumber), update? (SPI, apa adanya), diambil, cakupan, url|null, jenis: "resmi"|"kita"|"analisis"} },
  nasional: { <skala>: [item] },
  prov: { "<kode 2 digit>": { <skala>: [item] } },
  kab:  { "<id Kepmendagri>": { <skala>: [item], sg: {k: sinyal, b: sinyal}, kita: {k: tk|null, b: tk|null} } },
  ringkas: { n_kab, cakupan: {<skala>: {kab, prov, nas, kosong}}, menguat: {k, b}, searah: {k, b}, belum_selaras: {k, b}, tak_cocok: {<sumber>: n} },
  catatan: [str], gagal: [str] }
item  = { a: "k"|"b"|"kb", j: jenis, tk: 0..3|null, t: label resmi, x: kalimat, s: sid, c: "nas"|"prov"|"kab"|"kec", p?: periode, u?: vonis rapor kita }
sinyal = { m: bool (menguat), d: bool (searah), s: bool (belum selaras), r: [tk|null x 7 skala], c: ["nas"|"prov"|"kab"|null x 7], par?: [i, j] }
```

Pernyataan nasional dan provinsi disimpan sekali; layar menggabungkan nasional + provinsi + kabupaten menurut kunci kabupaten (`prov` dari `prediksi.json`).

## Arsip

Baris: `{t, dibuat, skala: [...], kab: {id: [[r kering x7], [r basah x7]]}}`. Satu baris per tanggal; baris yang sudah ada tidak diubah. Hanya ditulis bila ada paling sedikit satu peringkat bukan null.

## Gagal-lunak

Setiap pembaca sumber dibungkus: pengecualian, berkas hilang, bentuk berubah, atau basi menambah satu baris di `gagal` dan melewati sumber itu. Bila hasil akhir tanpa satu pun pernyataan dan `tangga.json` lama ada, yang lama tetap. Keluaran proses selalu 0.

## Layar

Tab baru `tangga` (`data-tab`, hash `#tangga/<id kab>`), memuat `tangga.json` sekali lewat `ambil()`. Kontrol (pemilih provinsi, kabupaten, saring ancaman) bersifat urgent: perubahan nilai kontrol dicat dulu, isi tangga dirender satu frame sesudahnya lewat dua `requestAnimationFrame` dengan `setTimeout` sebagai jaring. Kartu `.ex.ex-std`, tooltip lewat `data-tip` dan `pasangTip()` yang sudah ada.

## Sumber jam segar

Salinan `public/banjir/data/peringatan.json` (nowcast), `cuaca_petir.json`, dan `public/udara/data/awan_himawari.json` di git bisa basi berminggu-minggu; yang segar hanya diterbitkan pipeline CI ke situs live tanpa commit. `tangga.py` membaca salinan lokal; bila basi (lebih dari 4 jam) dan variabel lingkungan `LIVE` ada, ia mengunduh `$LIVE/banjir/data/peringatan.json` (dan dua lainnya) dengan batas waktu 20 detik; gagal atau `LIVE` kosong = sumber dilewati dan dicatat di `gagal`. `prediksi.yml` sudah punya `LIVE` di langkah "Tarik masukan segar dari situs" tetapi tidak menarik ketiga berkas ini dan tidak mengekspor `LIVE` ke langkah `jalan.py giliran`. Usulan untuk mekanik-mesin: tambahkan `banjir/data/peringatan.json`, `banjir/data/cuaca_petir.json`, `udara/data/awan_himawari.json` ke daftar tarik itu (atau `env: LIVE:` pada langkah `jalan.py giliran`).

## Jadwal (usulan, bukan perubahan)

`prediksi.yml` sudah memanggil `jalan.py giliran` setiap hari. Bila dikehendaki tiap 3 jam, tambahkan langkah `python3 scripts/prediksi/tangga.py` pada workflow yang menyegarkan nowcast; ini keputusan mekanik-mesin (Q7).
