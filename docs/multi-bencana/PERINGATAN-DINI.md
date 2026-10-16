# Peringatan dini Pantau Bencana

Permintaan pemilik 16 Okt 2026: *"Bisa ga ya kalo kita buat kaya Early Warning System dari sensor yang telah
kita buat. Dan munculin pop up alert gitu kalo terjadi sesuatu."*

## Prinsip

1. **Sumber resmi dulu.** Peringatan lembaga (BMKG gempa dan tsunami/InaTEWS, BMKG cuaca, PVMBG gunung api)
   diteruskan apa adanya, berlabel lembaganya dan jam terbitnya. Deteksi kami (titik panas baru, lonjakan,
   kejadian banjir baru) berlabel "Deteksi Pantau Bencana", tidak pernah menyamar sebagai status resmi.
2. **Tidak ada alarm palsu yang menakutkan.** Tiap aturan punya ambang yang diuji pada data lama dulu
   (berapa alarm per minggu yang akan muncul). Target: paling banyak beberapa alarm per minggu per wilayah.
3. **Tanpa pernyataan tsunami, tidak pernah ditulis "aman".**
4. **Satu alarm, satu kejadian.** Alarm diberi kunci (`jenis:kode:jendela`) supaya tidak berbunyi berulang.

## Sensor yang sudah ada

| Sensor | Jalur | Kecepatan |
| --- | --- | --- |
| Gempa BMKG + USGS | cron Worker `* * * * *` → D1 `gempa` | ± 1 menit |
| Titik panas FIRMS | cron Worker 3-jam → D1, `/api/titik` | 3 jam |
| Peringatan dini cuaca BMKG (CAP/nowcast) | pipeline → `peringatan.json` | harian, bisa dinaikkan lewat cron Worker |
| Status banjir kecamatan, kejadian aktif B0001 | pipeline banjir harian | harian |
| Laporan warga terverifikasi | D1 `laporan` | seketika |

## Aturan pemicu awal (ambang dikalibrasi pada data lama)

| Jenis | Pemicu | Tingkat |
| --- | --- | --- |
| Gempa | M ≥ 5,0 di darat atau ≤ 100 km dari pusat kecamatan, ATAU dirasakan ≥ MMI IV (BMKG) | Waspada; M ≥ 6,0 dangkal = Siaga |
| Tsunami | BMKG `Potensi` berpotensi tsunami (kode 1–3) | Awas, langsung, label InaTEWS |
| Karhutla | kompleks api baru berstatus Prioritas pemadaman, atau titik panas provinsi ≥ 3× normal harian | Waspada/Siaga |
| Banjir | kejadian aktif baru level Siaga/Awas | Siaga/Awas |
| Cuaca | peringatan BMKG tingkat Siaga/Awas untuk kabupaten | ikut BMKG |

## Alur

1. **Pemicu di Worker** (`src/peringatan.js`): sesudah tiap cron (gempa tiap menit, titik 3-jam), aturan
   dijalankan atas data baru, alarm ditulis ke D1 `peringatan` (kunci unik, wilayah, tingkat, sumber, teks,
   berlaku_hingga). Idempoten.
2. **API** `GET /api/peringatan/aktif?sejak=` (cache tepi 30 dtk, GET/HEAD saja).
3. **Pop-up di layar** (`public/inti/peringatan.js`, dipakai semua halaman bencana):
   - jajak tiap 60 dtk saat tab terlihat (berhenti saat tersembunyi);
   - alarm baru muncul sebagai kartu bergaya kartu Situasi karhutla: pita tingkat berwarna, satu kalimat berangka,
     wilayah, jam, sumber, tombol "Lihat di peta";
   - sekali per alarm per perangkat (localStorage); bunyi hanya bila pengguna mengizinkan.
4. **Notifikasi di luar layar (tahap 2)**: Web Push lewat service worker dan langganan per wilayah di D1.
   Butuh kunci VAPID sebagai secret Worker (pemilik yang memasang lewat `wrangler secret put`, tidak pernah di repo).
5. **Admin**: daftar alarm terkirim dan tombol cabut (alarm keliru).

## Gerbang

- uji integrasi Miniflare: data gempa tiruan M5,8 dangkal → satu alarm Siaga; diulang → tetap satu;
- uji balik ambang pada riwayat (riwayat_m5.json, arsip titik): jumlah alarm per minggu tertulis di laporan;
- pemeriksa: guard-api, security-reviewer (teks dari BMKG di-escape), inp-reviewer (jajak tidak membebani).

## Urutan kerja

Masuk sesudah halaman gempa berdiri (B5), sebelum cuaca/udara (B6): tahap 1 (pemicu, API, pop-up) lebih
dulu karena tidak butuh secret; tahap 2 (Web Push) menunggu kunci VAPID dari pemilik.
