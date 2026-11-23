# KEPUTUSAN-BESOK: rombak tab Besok di /prediksi, gelombang, cuaca ekstrem, kekeringan pekan dan bulan

Dokumen ini menang atas semua dokumen lain di folder ini. Untuk tab Tangga, `data/kajian-bnpb/tangga/KEPUTUSAN-TANGGA.md` tetap berlaku dan tidak dilonggarkan.

## Keputusan pemilik (17 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | Rombak tab Besok, digabung dengan penambahan bencana baru ("gas gabung sekalian sama rombak layout tabel"). |
| K2 | Kartu per kab diganti tabel: satu kab satu baris, sel berwarna sesuai level (abu, kuning, oranye, merah), angka utama langsung terlihat. |
| K3 | Pil uji ditulis sekali di kepala kolom ("teruji" atau "belum teruji", rincian n di `title`); pil "mengalahkan baseline, n ..." per baris dihapus. |
| K4 | Aturan yang terpicu tampil lengkap di bagian "Perlu tindakan" di atas, bukan satu bilah saja. |
| K5 | Isi panjang (jam mulai, lama hujan, peluang per ambang, riwayat bulan dari logbook, dampak) pindah ke pop-up rincian kab. |
| K6 | Rob tampil di tabel; kab tanpa titik rob diisi "–". |
| K7 | Kontrol memakai elemen bersama: dropdown bertema, pil bencana selebar layar berikon. |
| K8 | Ada tampilan peta, satu warna per bencana yang dipilih. Pola tampilan meniru `/bnpb/dalops` (peta berkartu, dropdown jenis, pil level berangka dan legenda di dalam peta, tabel di bawah). |
| K9 | Abrasi tidak diprediksi harian ("ga apa"). |
| K10 | Kekeringan masuk skala pekan dan bulan (tab Tangga), bukan tabel Besok. |
| K11 | Cuaca ekstrem masuk prediksi harian. |
| K12 | (19 Nov, jawaban Q1) Level gelombang ditulis "Sedang", "Tinggi", "Awas" (bukan Waspada/Siaga): Sedang 1,25 sampai di bawah 2,5 m, Tinggi 2,5 sampai di bawah 4 m, Awas 4 m ke atas. Kode `lv` 1..3 tidak berubah. |
| K13 | (19 Nov, jawaban Q2) Ambang angin 46/63/89 km/jam dipakai. |
| K14 | (19 Nov, jawaban Q3) Warna titik panas dari peluang 20/50/80% dipakai, hanya untuk tampilan. |
| K15 | (19 Nov, jawaban Q4) Formulir Konfirmasi tetap belum menerima gelombang dan angin. |
| K16 | (19 Nov, jawaban Q5) Siklon BMKG tetap belum masuk Perlu tindakan. |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Kode arsip baru `GEL` (gelombang) kolom `hs, lv`: tinggi gelombang maksimum harian (m) dari Open-Meteo Marine di titik pesisir `public/banjir/data/cuaca_gelombang.json` (pelabuhan + titik rob), maksimum per kab. | Titik pesisir sudah ada; dipanggil sekali per hari, 4 hari, beberapa lokasi per panggilan. |
| D2 | `lv` gelombang dari kategori tinggi gelombang BMKG: < 1,25 m = 0; Sedang 1,25–2,5 = 1; Tinggi 2,5–4,0 = 2; Sangat tinggi dan di atasnya >= 4,0 = 3. | Ambang bersumber BMKG; pemetaan kategori ke Waspada/Siaga/Awas adalah rancangan (Q1). |
| D3 | Titik ke kab: titik di dalam poligon `public/geo/kabupaten/<prov>.json`; titik di laut (pelabuhan sering di luar garis pantai poligon) ke poligon terdekat di provinsi yang sama bila jaraknya <= 25 km; selain itu dibuang dan dicatat di log. | Titik tidak membawa nama kab. Tanpa tebakan lintas provinsi. |
| D4 | Kode arsip baru `CEX` (cuaca ekstrem) kolom `emb, lv`: embusan angin 10 m maksimum harian (km/jam) Open-Meteo `wind_gusts_10m`, ditumpangkan pada panggilan hujan HJN yang sudah ada (tanpa panggilan tambahan). | Kuota Open-Meteo. |
| D5 | `lv` angin: >= 46 km/jam (25 knot, ambang angin kencang peringatan dini BMKG) = 1; >= 63 km/jam (34 knot, Beaufort 8) = 2; >= 89 km/jam (48 knot, Beaufort 10) = 3. | Rancangan (Q2). Puting beliung tidak diprediksi per kab. |
| D6 | Aturan "Hari tidak melaut" dinyalakan dengan syarat `GEL.hs >= 1,25` (BMKG: gelombang di atas 1,25 m berisiko bagi perahu nelayan). Paparan: tanpa jiwa (data nelayan per kab tidak ada di repo), yang tampil hanya jumlah kab. | Tidak mengarang jumlah nelayan. |
| D7 | Aturan baru "Waspada angin kencang": `CEX.emb >= 46`. Paparan seluruh penduduk kab, batas atas. | Sama dengan pola aturan karhutla dan asap. |
| D8 | `GEL` dan `CEX` berstatus "menunggu" di rapor sampai ada sumber pengamatan: tidak dinilai lawan model sendiri. Di tabel kolomnya "belum teruji". | Prospektif jujur. |
| D9 | Tangga, ancaman kering, prediksi kita: skala `sepekan` = hari tanpa hujan (< 1 mm/hari) berturut sampai H+3 dari riwayat `bayangan/hujan_harian.json` + prakiraan HJN, ditulis dengan kelas HTH BMKG (1–5 sangat pendek, 6–10 pendek, 11–20 menengah, 21–30 panjang, 31–60 sangat panjang, > 60 kekeringan ekstrem); skala `bulan` = peluang kekeringan bulan depan `public/kekeringan/data/peluang_bayangan.json` (`p_model_t1`) berlabel hipotesis. Keduanya tanpa peringkat (tk null), tidak ikut sinyal. | KEPUTUSAN-TANGGA K6 dan D2: prediksi kita terpisah dari BMKG; ambang kekeringan gagal uji balik. |
| D10 | Warna sel tabel: level 0 abu, 1 kuning, 2 oranye, 3 merah. Hujan menurut kelas BMKG harian (< 20 mm abu, 20–50 kuning, 50–100 oranye, >= 100 merah); titik panas menurut peluang (< 20% abu, 20–50% kuning, 50–80% oranye, >= 80% merah, warna tampilan saja); asap menurut kategori ISPU (Tidak sehat kuning, Sangat tidak sehat oranye, Berbahaya merah); rob lewat p95 oranye. | Satu bahasa warna untuk 514 baris. Warna titik panas bukan status resmi (Q3). |
| D11 | Urutan bawaan tabel: level tertinggi lintas kolom menurun, lalu jiwa. Kolom bisa diurutkan dengan klik kepala. | "Perlu ditangani" di atas. |
| D12 | Peta memakai MapLibre + batas `public/geo/kabupaten/<prov>.json`, digabung lewat kunci `geo` ("prov|nama") yang ditambahkan `terbit.py` ke tiap kab di `prediksi.json`. Batas dimuat hanya saat tampilan peta dibuka. | Pola dalops; tanpa unduhan berat di tab tabel. |

## Pertanyaan terbuka untuk pemilik (Q)

Q1 sampai Q5 sudah dijawab pemilik 19 Nov 2026 (K12 sampai K16). Belum ada pertanyaan terbuka baru.
