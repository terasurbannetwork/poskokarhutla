# Memasang model sebaran & cerita ke `public/index.html`

Berkas baru (tidak menyentuh index.html):

| Berkas | Isi |
| --- | --- |
| `public/sebaran_model.js` | evaluator model data (`window.SebaranModel`): cuaca → fitur → peluang per sel 375 m, 72 jam, Monte Carlo, dampak |
| `public/data/model_sebaran.json` | model gradient boosting (pohon datar), ambang, tabel ONI/DMI, kinerja uji |
| `public/cerita_karhutla.js` / `.css` | cerita bergulir 7 bab (`window.Cerita`), otomatis menambah kartu "Baca cerita" di atas Insight |
| `public/data/sebaran_cerita.json`, `sebaran_kasus.json`, `musim_awal.json`, `tren_karhutla.json`, `sebaran_pendorong.json` | data cerita |

## 1. Muat berkas (3 baris)

Di `<head>`, setelah `<link href="databaru.css" rel="stylesheet">` (± baris 600):

```html
<link href="cerita_karhutla.css" rel="stylesheet">
```

Di akhir, SETELAH `<script src="sim_perlakuan.js"></script>` (± baris 4249; harus sesudah skrip utama karena
`cerita_karhutla.js` menambah dirinya ke `Insight.EX`):

```html
<script src="sebaran_model.js"></script>
<script src="cerita_karhutla.js"></script>
```

Hasilnya: tab Insight punya kartu pertama "Dari mana mulai, ke mana menyebar" dengan tombol **Baca cerita**; ceritanya
terbuka di tempat kartu itu. Usulan: cerita di dalam Insight (bukan tab baru) karena tab sudah 12 dan cerita ini adalah
"kesimpulan dalam grafik" yang sama dengan Insight. Kalau mau tab sendiri: tambah `["cerita", "Cerita"]` ke `TABS`, sebuah
`<section class="page scroll" id="p-cerita"><div class="wrap" id="cerita"></div></section>`, dan di `bukaTab`:
`if (id === "cerita") Cerita.buka($("#cerita"));`.

## 2. Pilihan "Model data (dilatih)" di Simulasi

Di panel Sim (fungsi yang menulis `<details class="simatur">`, ± baris 4140) tambahkan pemilih mesin:

```js
<label class="simcek"><input type="checkbox" id="simData" ${o.data ? "checked" : ""}> Model data (dilatih) di samping model fisika</label>
```
dan `$("#simData").onchange = e => { o.data = e.target.checked; this.tandaiBasi(); };`

Di akhir `Sim.jalan()` (setelah `this.hasil = H;`), jalankan model data bila dicentang:

```js
if (this.op.data && typeof SebaranModel !== "undefined") {
  const p = this.f.properties, M = Sim._model ||= await SebaranModel.muat();
  const sel0 = [...new Set((p.api24 || []).map(([lo, la]) => SebaranModel.sel(lo, la)))];
  const L = Sim._lahanData ||= {gambut: Lapis.cache.gambut, kawasan: Lapis.cache.kawasan, konsesi: Lapis.cache.konsesi, sanksi: await muatJSON("data/lahan/sanksi_karhutla.json").catch(() => null),
    kanal: await muatJSON("data/kanal.json"), jalan: await muatJSON("data/jalan.geojson"), desa: Sim._desa,
    riwayat: await muatJSON("data/riwayat_grid.json"), penduduk: await muatJSON("data/penduduk.json").catch(() => null)};
  this.data = SebaranModel.ramal({model: M, lat: p.lat, lon: p.lon, waktu: Date.now(), sel0,
    cuaca: await SebaranModel.cuaca(p.lat, p.lon), lahan: L, mc: 60});
}
```

Gambar di `pasangLapis()` (lapisan isi, warna = peluang 72 jam):

```js
if (this.data) { const fs = this.data.sel.filter(s => s.p[2] >= .05).map(s => { const x = SebaranModel.pusat(s.k), h = .003375 / 2;
  return {type: "Feature", properties: {p: s.p[Math.min(2, Math.floor(+$("#simT").value / 24.01))]}, geometry: {type: "Polygon",
    coordinates: [[[x[0]-h, x[1]-h], [x[0]+h, x[1]-h], [x[0]+h, x[1]+h], [x[0]-h, x[1]+h], [x[0]-h, x[1]-h]]]}}; });
  m.addSource("sim-data", {type: "geojson", data: {type: "FeatureCollection", features: fs}});
  m.addLayer({id: "sim-data", type: "fill", source: "sim-data", paint: {"fill-color": ["interpolate", ["linear"], ["get", "p"],
    .05, "#fde7a7", .3, "#ef9a4a", .6, "#c63b2f", 1, "#6e1323"], "fill-opacity": .6}}); }
```
(tambahkan `"sim-data"` ke dua daftar hapus di awal `pasangLapis`). Ringkasan hasil di panel:
`this.data.luas[i].p10/p50/p90` (ha 24/48/72 jam), `this.data.p_lepas`, `this.data.arah` (`deg`, `km`),
`this.data.kena` (`desa`, `gambut_ha`, `lindung_ha`, `jiwa`), `this.data.luasJam` (73 titik, ha harapan per jam).

Catatan: `Sim.cuacaJam()` hanya mengambil 1 hari lalu; model data butuh 31 hari (masa panas DC/DMC), jadi pakai
`SebaranModel.cuaca()` (forecast `past_days=40`). Untuk tanggal lampau: `SebaranModel.cuacaTanggal(lat, lon, waktu)`.

Mesin fisika (`tabelLaju`) masih memakai efek BUI `exp(32·ln 0,9·(1/BUI − 1/32))`; FBP (pers. 54) memakai 50, bukan 32.
Port Python `scripts/sebaran/simfisika.py` sudah memakai 50 (`efek_bui`). Bila index.html diperbaiki, ganti 32 pertama
di baris `fBUI` (± 3523 dan 3796) menjadi 50.

## 3. Uji

- `python3 scripts/sebaran/uji_js.py` — kesetaraan Python ↔ JS (fitur & peluang hari-1 pada titik awal nyata, selisih
  maks harus < 1e-4) + penolakan masukan di luar jangkauan.
- `public/_uji_model.html` dipakai sekali di peramban lalu dihapus (lihat RISET-SEBARAN.md).

## 4. Memperbarui model

```
python3 scripts/sebaran/lacak.py          # peristiwa dari viirs.csv (~1 menit)
python3 scripts/sebaran/cuaca.py          # cuaca per jam (kuota Open-Meteo, berkas di-cache)
python3 scripts/sebaran/latih.py bangun   # sampel
python3 scripts/sebaran/latih.py latih    # setel di 2023, uji 2024-2026, ekspor model_sebaran.json
python3 scripts/sebaran/kasus.py          # pustaka uji-balik >= 100 kasus
python3 scripts/sebaran/pendorong.py      # analisis pendorong
python3 scripts/sebaran/musim_awal.py     # awal musim & tren
python3 scripts/sebaran/cerita_data.py    # data cerita
```
Tiap skrip punya `uji` (asersi invarian) kecuali tahap berat.

## 5. Per jam sungguhan: Himawari-9 (JAXA P-Tree) — belum dipasang

VIIRS S-NPP melihat Indonesia ± 2 kali sehari (13:30 & 01:30 waktu setempat). Arsip FIRMS di repo ini HANYA S-NPP
(NOAA-20/21 belum diunduh); menambah NOAA-20 (`VIIRS_NOAA20_NRT`/`_SP`) dan NOAA-21 lewat `scripts/data/firms.py`
memberi 4–6 lintasan, masih bukan per jam. Per jam (10 menit) butuh satelit geostasioner Himawari-9.

Yang harus dibuat pemilik (sekali, gratis, tidak bisa diwakilkan):
1. Daftar di JAXA Himawari Monitor P-Tree: https://www.eorc.jaxa.jp/ptree/registration_top.html — isi nama, email,
   afiliasi, tujuan (non-komersial/riset/kebencanaan), setujui ketentuan (atribusi "Himawari data supplied by P-Tree
   System, JAXA").
2. JAXA mengirim akun FTP lewat email (ID = alamat email dengan `@` diganti `_`, plus kata sandi).
3. Simpan sebagai rahasia: `PTREE_USER`, `PTREE_PASS` di `.env` lokal (sudah di-.gitignore) dan GitHub Actions secrets.
   Jangan pernah di-commit.

Produk yang dipakai: Himawari L2 Wild Fire (`/pub/himawari/L2/WLF/` di `ftp.ptree.jaxa.jp`, 10 menit, piksel ±2 km,
CSV per pindaian berisi lat, lon, FRP, keyakinan). Periksa nama versi direktori setelah login; strukturnya
`.../YYYYMM/DD/HH/` per jam.

Rancangan colokan (belum ditulis karena butuh kredensial):
- `scripts/sebaran/himawari.py`: `ftplib` (stdlib) + `PTREE_USER/PASS` dari lingkungan → unduh CSV 10 menit untuk N jam
  terakhir → saring kotak Indonesia → baris dengan skema yang sama dengan `muat_viirs()` (`t` menit, `lat`, `lon`, `frp`,
  `dn`) tetapi `sumber="H9"` dan piksel 2 km.
- Pelacak: `lacak.hubungkan(t, lat, lon, jarak=2000, jeda=3*60)` untuk Himawari saja; peristiwa VIIRS dicocokkan ke
  peristiwa Himawari bila ≤ 2 km & ≤ 1 jam, jadi tiap peristiwa punya urutan per 10 menit (awal lebih presisi) dan sel
  375 m dari VIIRS.
- Model: tambah langkah 1 jam (`calon` dari piksel Himawari aktif, target = sel VIIRS/ Himawari baru dalam 1 jam) dan fitur
  `jam_lokal`; evaluator JS sudah menerima `hari` 1–3, cukup ditambah `langkah_jam`.
- Alternatif tanpa pendaftaran: data mentah Himawari L1b di AWS Open Data (`noaa-himawari9`), tetapi itu radiansi; deteksi
  api harus dibangun sendiri (algoritme kontekstual 3,9/11 µm). Lebih berat, tidak disarankan.
