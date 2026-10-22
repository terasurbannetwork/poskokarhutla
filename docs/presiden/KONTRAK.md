# Kontrak: panel karhutla untuk dashboard presiden (22 Okt 2026)

Tujuan: satu halaman ringan `/presiden` yang bisa di-embed (iframe) dan feed
JSON per widget yang bisa ditarik tim dashboard presiden. Publik, agregat,
tanpa data pribadi (tanpa nama pelapor, regu, nomor HP, foto mentah).

Prinsip: tiap widget menjawab "apa yang harus ditindaklanjuti, oleh siapa".
Tidak memperlambat platform: semua dihitung di pipeline dari JSON yang sudah
ada (tanpa jaringan), halaman hanya membaca satu berkas kecil.

## Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/data/presiden.py` | generator, stdlib, tanpa jaringan, `--uji` self-check | `pipa-data` |
| `public/data/presiden/semua.json` | semua widget, satu berkas, target < 150 KB | generate |
| `public/data/presiden/<id>.json` | satu widget per berkas (feed) | generate |
| `public/data/presiden/indeks.json` | daftar widget: id, label, judul, per, url | generate |
| `public/presiden.html`, `presiden.js`, `presiden.css` | layar | `layar-peta` |
| `public/_headers` | `/presiden*` boleh di-iframe dari mana saja; `/data/presiden/*` CORS `*` | `layar-peta` |

Pemicu: dipanggil di akhir `scripts/data/laporan.py` (titik.yml, tiap 3 jam),
dibungkus try/except supaya gagalnya tidak menahan laporan. Workflow TIDAK
disunting (token git tanpa scope workflow).

## Bentuk `semua.json`

```json
{"versi": "presiden/1", "dibuat": "2026-10-22T12:00+07:00", "widget": [ <widget>, … ]}
```

`indeks.json`: `{"versi", "dibuat", "widget": [{"id", "label", "judul", "per", "status", "url"}]}`.

## Bentuk satu widget

```json
{
  "id": "provinsi",
  "label": "Provinsi",              // teks pill kategori
  "judul": "…",                     // satu kalimat temuan; angka kunci dibungkus [[…]] untuk disorot
  "per": "2026-10-22T12:00+07:00",  // tanggal akhir data yang dipakai (sama dengan per lapisan petanya); kesegaran: waktu pemeriksaan; tidak pernah di masa depan
  "status": "ok" | "kosong" | "basi",   // basi = sumber lebih tua dari ambang widget
  "angka": [ {"label": "…", "nilai": 123, "satuan": "titik", "ubah": -12.5, "tampil": "sekitar 123 titik"} ],   // 0–4 angka kunci, ubah = % vs pembanding, boleh null; tampil (opsional) = teks jadi yang menggantikan nilai+satuan di layar
  "grafik": null | {"jenis": "batang" | "garis", "label": ["…"], "seri": [{"nama": "…", "nilai": [1,2]}], "satuan": "…"},
  "kolom": [ {"k": "prov", "label": "Provinsi", "jenis": "teks" | "angka" | "persen" | "pill"} ],
  "baris": [ {"prov": "Kalimantan Tengah", "titik": 1234} ],   // paling banyak 10 baris
  "tindak_lanjut": [ {"siapa": "BNPB", "apa": "…"} ],          // 1–3 usulan, kalimat perintah pendek
  "sumber": "…",
  "catatan": null | "…"            // hanya bila wajib jujur (perkiraan, indikasi, data terlambat)
}
```

Aturan isi:
- Pill yang punya pembanding (naik/turun) menulisnya DI DALAM `tampil` ("15.486 titik, naik 1.309% dari median ...") dan `ubah` null, supaya tidak ganda; angka batas bawah ditulis "paling sedikit", bukan "sekitar".
- Semua perkiraan model memakai `tampil` ("sekitar 85 juta orang", "sekitar 1,1 juta ha (0,5 sampai 2,4 juta)"); `nilai` tetap angka mentah. `satuan` boleh "" bila label sudah memuat satuannya.
- Hari kalender berjalan tidak dipakai di perbandingan harian atau jendela 7 hari: judul, angka, dan `per` memakai tanggal hari lengkap terakhir yang sama.
- Kompleks yang tidak ada di `kendala.json` ditulis "Belum dinilai" (bukan "Tanpa kendala tercatat") dan tidak masuk tindak lanjut regu darat.
- `asap` dibatasi ke provinsi yang sering mengalami karhutla (PM2,5 CAMS berasal dari semua sumber); `sumberdaya` menamai `posko.json` "Lokasi posko usulan" (rekomendasi algoritma, bukan posko terdata).
- Lembaga: Kementerian Kehutanan (SiPongi, Manggala Agni, Gakkum Kehutanan) dan Kementerian Lingkungan Hidup; nama regulasi historis (Permen LHK) tetap.
- Angka nyata dari berkas sumber; tidak ada angka karangan. Sumber kosong =
  `status: "kosong"` dan `baris: []`, bukan 0.
- Perkiraan diberi kata "perkiraan" di judul atau catatan; angka konsesi diberi
  catatan "indikasi titik panas di dalam batas izin, bukan penetapan pelaku".
- Tanpa pemisah " · ", tanpa em dash, tanpa "9 provinsi prioritas" (tulis
  "provinsi yang sering mengalami karhutla"), format angka Indonesia di layar.

## Widget (urutan tampil)

| id | Pertanyaan | Sumber utama | Tindak lanjut khas |
| --- | --- | --- | --- |
| `situasi` | Seberapa parah hari ini dibanding biasanya dan 2015? | `musim_harian.json`, `kumulatif.json` | BNPB, Kementerian Kehutanan |
| `provinsi` | Provinsi mana paling mendesak? (titik 7 hari lengkap, ubah vs 7 hari sebelumnya, vonis peluang cuaca) | `musim_harian.json`, `peluang.json` | Gubernur: status siaga/darurat |
| `kejadian` | 10 kejadian api aktif terbesar, aksesnya (termasuk "Belum dinilai"), gambut atau bukan | `kluster.json`, `kompleks_konsesi.json`, `kendala.json`, `operasi.json` | BNPB: water bombing; Manggala Agni: regu darat |
| `konsesi` | Perusahaan (yang namanya terdata, sekitar sepertiga titik) dengan titik panas terbanyak di areal izinnya, 7 x 24 jam | `kompleks_konsesi.json`, `aktor_karhutla.json` | Gakkum Kehutanan, Kementerian Lingkungan Hidup: verifikasi lapangan |
| `gambut` | KHG dengan titik terbanyak 7 hari terakhir | `khg_prioritas.json` | BRGM: pembasahan, sekat kanal |
| `cuaca` | Provinsi dengan peluang cuaca api ekstrem 7 hari ke depan, plus ENSO/IOD | `peluang.json`, `iklim_outlook.json` | BMKG/BNPB: OMC |
| `asap` | Berapa penduduk, siswa, faskes di provinsi yang sering mengalami karhutla terpapar PM2.5 tidak sehat (perkiraan model) | `udara_dampak.json`, `peluang.json` | Kemenkes, Kemendikdasmen |
| `penerbangan` | Gangguan bandara akibat asap musim ini | `penerbangan.json` | Kemenhub |
| `sumberdaya` | Kebutuhan regu/personel (rentang skenario) vs personel tercatat BNPB per provinsi, plus lokasi posko usulan | `operasi.json`, `posko.json` | BNPB, TNI/Polri |
| `dampak` | Perkiraan model kerugian ekonomi, emisi, kesehatan dan luas (tiga skenario, bukan angka tercatat) | `dampak.json` | Bappenas, Kemenkeu |
| `luas` | Luas terbakar resmi SiPongi per tahun dan provinsi teratas | `luas_resmi.json` | Kementerian Kehutanan |
| `berulang` | Kecamatan langganan yang terbakar lagi tahun ini | `sejarah.json` | Pemda: pencegahan permanen |
| `pencegahan` | Paket pencegahan dan perkiraan biaya untuk provinsi teratas | `preventif.json` | Bappenas, Kemendagri |
| `peringatan` | Peringatan aktif level tertinggi | `peringatan.json` | BNPB |
| `kesegaran` | Umur tiap sumber data dibanding batasnya (`per` = waktu pemeriksaan) | `dibuat` atau tanggal akhir tiap berkas (tabel `WAKTU` di kode) | Pengelola platform |

Generator boleh menggugurkan widget yang sumbernya tidak memadai, asal
dilaporkan alasannya; jangan memalsukan isi.

## Peta (permintaan pemilik 22 Okt 2026: tampil juga di peta, bukan hanya kartu)

Berkas terpisah `public/data/presiden/peta.json`, dimuat HANYA saat tab Peta
dibuka (kartu tetap satu fetch kecil). Target < 400 KB.

```json
{"versi": "presiden-peta/1", "dibuat": "…", "lapisan": [
  {"id": "provinsi", "widget": "provinsi", "label": "Titik panas 7 hari", "jenis": "provinsi",
   "satuan": "titik", "per": "…", "nilai": {"62": 37427, "16": 15233}},          // kode BPS 2 digit = properties.kode di public/geo/provinsi.json
  {"id": "kejadian", "widget": "kejadian", "label": "Kejadian api", "jenis": "titik",
   "satuan": "ha sebaran titik", "per": "…",
   "fitur": [{"lat": -2.1, "lon": 113.2, "nama": "Seruyan Hilir, Seruyan", "nilai": 17002,
              "teks": ["Titik 24 jam 725", "Gambut", "Akses sulit di rawa"]}]}       // teks = baris pop-up, tanpa data pribadi
]}
```

Medan tambahan (putaran 2, dari pemeriksa angka):
- lapisan `sumber` (wajib, nama lembaga seperti widget) dan `catatan` (opsional, satu kalimat, mis. "Indikasi, bukan penetapan pelaku", "Perkiraan model, belum dikoreksi stasiun"); layar menampilkan keduanya di legenda.
- lapisan `label` sama dengan label kartu widget terkait bila maknanya sama.
- fitur `pill` (opsional, string jadi): bila ada, layar memakainya untuk pill pop-up menggantikan `nilai` + `satuan` (dipakai untuk perkiraan yang dibulatkan atau dikategorikan, mis. "sekitar 17.000 ha", "di atas 250 µg/m³, berbahaya"). `nilai` mentah tetap untuk ukuran lingkaran.
- lapisan `kelas` (opsional, untuk titik berkategori): `[{"dari": 55.5, "label": "Tidak sehat"}, …]`; bila ada, legenda menampilkan kelas, bukan "kecil … maks".
- `per` = tanggal akhir data yang benar-benar dipakai, bukan waktu pembuatan berkas, dan SAMA dengan `per` kartu widget terkait.
- Pencocokan lapisan `konsesi` ke `lahan/konsesi.geojson`: lewat id poligon di `aktor_karhutla.json`, lalu nama yang dinormalkan (tanpa keterangan dalam kurung); yang gagal dicetak sebagai peringatan, tidak diam-diam dibuang.

Lapisan (urutan chip di layar), paling banyak 300 fitur per lapisan titik:

| id | jenis | isi |
| --- | --- | --- |
| `provinsi` | provinsi | titik panas 7 hari per provinsi (semua provinsi, bukan 10 besar) |
| `cuaca` | provinsi | porsi wilayah berbahaya api sangat tinggi (persen) dari `peluang.json` |
| `kejadian` | titik | kejadian api tercatat, ukuran = sebaran titik, 300 terbesar |
| `konsesi` | titik | areal izin dengan titik 7 hari terbanyak (titik di kejadian terbesarnya), catatan indikasi di pop-up |
| `gambut` | titik | KHG bertitik 7 hari (titik pusat poligon `public/data/lahan/khg.geojson`) |
| `asap` | titik | sel PM2,5 tidak sehat (perkiraan model) hari terakhir dari `asap.json`, hanya sel yang pusatnya di provinsi yang sering mengalami karhutla; kelas 55,5 / 150,5 / 250,5 |
| `penerbangan` | titik | bandara terdampak asap musim ini |
| `posko` | titik | lokasi posko usulan (rekomendasi algoritma, `posko.json`), bukan posko terdata |
| `berulang` | titik | kecamatan langganan yang kembali tercatat titik panas (titik pusat kecamatan) |

## Layar

- `/presiden` menampilkan semua widget sebagai kartu bergaya Insight
  (`public/inti/insight.css`, `kartu.js`, `tabel.js`, `format.js` dipakai ulang).
- `/presiden?w=<id>` menampilkan satu widget saja tanpa kepala, untuk iframe.
- Tanpa peta dan tanpa pustaka luar: grafik SVG sederhana tulisan sendiri.
- Satu `fetch` ke `semua.json`; tidak ada polling lebih sering dari 5 menit.
