# RISET: sumber dan ambang untuk rombak Besok

## Sumber data yang sudah ada di repo

| Kebutuhan | Sumber | Catatan |
| --- | --- | --- |
| Titik pesisir gelombang | `public/banjir/data/cuaca_gelombang.json` (`scripts/cuaca/gelombang.py`, milik cuaca-udara) | 296 titik: pelabuhan `cuaca_sarana.json` + titik rob. Titik membawa provinsi dan nama, tidak membawa kab. Salinan git bisa basi, tetapi yang dipakai hanya koordinatnya. |
| Tinggi gelombang H+1..H+3 | Open-Meteo Marine `daily=wave_height_max`, zona Asia/Jakarta | Sama dengan sumber `gelombang.py` dan `rob.py`. |
| Embusan angin | Open-Meteo forecast `wind_gusts_10m` per jam | Ditumpangkan pada panggilan HJN (`catat.ambil_hujan`). |
| Hari tanpa hujan | `public/prediksi/data/bayangan/hujan_harian.json` (120 hari total harian per kab) | Cache masukan model bayangan, diisi `catat.py`. |
| Peluang kekeringan bulan | `public/kekeringan/data/peluang_bayangan.json` | AUC-PR uji 0,175 lawan klimatologi 0,134; FAR sekitar 88%: hipotesis. |
| Batas kab | `public/geo/kabupaten/<prov>.json` (properti `kab`) | Kunci sama dengan `dasar.kab()["geo"]`. |

## Ambang bersumber

- BMKG kategori tinggi gelombang: Tenang 0–0,5 m, Rendah 0,5–1,25, Sedang 1,25–2,5, Tinggi 2,5–4,0, Sangat tinggi 4,0–6,0, Ekstrem 6,0–9,0, Sangat ekstrem > 9,0.
- BMKG peringatan dini: angin kencang di atas 25 knot; gelombang di atas 1,25 m dan angin di atas 15 knot berisiko bagi perahu nelayan.
- Skala Beaufort: 8 (gale) 34–40 knot, 10 (storm) 48–55 knot.
- BMKG hari tanpa hujan (HTH): 1–5 sangat pendek, 6–10 pendek, 11–20 menengah, 21–30 panjang, 31–60 sangat panjang, > 60 kekeringan ekstrem; hari hujan = curah >= 1 mm.
- BMKG kelas hujan harian: ringan 0,5–20 mm, sedang 20–50, lebat 50–100, sangat lebat 100–150, ekstrem > 150.

## Pola layar yang ditiru

`/bnpb/dalops` (tangkapan pemilik 17 Nov 2026): kartu "Peta Pantauan" dengan dropdown jenis bencana, pil saring berangka dan legenda di dalam peta, ringkasan angka di samping; kartu tabel "Kondisi terkini" dengan dropdown Pulau/Provinsi bertema (`public/inti/pilih.js`), pil saring, kepala tabel navy, kolom bisa diurutkan.
