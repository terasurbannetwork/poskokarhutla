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
  "per": "2026-10-22T12:00+07:00",  // waktu data sumber paling tua yang dipakai widget ini
  "status": "ok" | "kosong" | "basi",   // basi = sumber lebih tua dari ambang widget
  "angka": [ {"label": "…", "nilai": 123, "satuan": "titik", "ubah": -12.5} ],   // 0–4 angka kunci, ubah = % vs pembanding, boleh null
  "grafik": null | {"jenis": "batang" | "garis", "label": ["…"], "seri": [{"nama": "…", "nilai": [1,2]}], "satuan": "…"},
  "kolom": [ {"k": "prov", "label": "Provinsi", "jenis": "teks" | "angka" | "persen" | "pill"} ],
  "baris": [ {"prov": "Kalimantan Tengah", "titik": 1234} ],   // paling banyak 10 baris
  "tindak_lanjut": [ {"siapa": "BNPB", "apa": "…"} ],          // 1–3 usulan, kalimat perintah pendek
  "sumber": "…",
  "catatan": null | "…"            // hanya bila wajib jujur (perkiraan, indikasi, data terlambat)
}
```

Aturan isi:
- Angka nyata dari berkas sumber; tidak ada angka karangan. Sumber kosong =
  `status: "kosong"` dan `baris: []`, bukan 0.
- Perkiraan diberi kata "perkiraan" di judul atau catatan; angka konsesi diberi
  catatan "indikasi titik panas di dalam batas izin, bukan penetapan pelaku".
- Tanpa pemisah " · ", tanpa em dash, tanpa "9 provinsi prioritas" (tulis
  "provinsi yang sering mengalami karhutla"), format angka Indonesia di layar.

## Widget (urutan tampil)

| id | Pertanyaan | Sumber utama | Tindak lanjut khas |
| --- | --- | --- | --- |
| `situasi` | Seberapa parah hari ini dibanding biasanya dan 2015? | `titik24.json`, `kumulatif.json`, `musim_harian.json` | BNPB, KLHK |
| `provinsi` | Provinsi mana paling mendesak? (titik 7 hari, ubah vs 7 hari sebelumnya, vonis peluang cuaca) | `titik_tahun.json`, `peluang.json` | Gubernur: status siaga/darurat |
| `kejadian` | 10 kejadian api terbesar yang masih aktif, aksesnya, gambut atau bukan | `kluster.json`/`kompleks_konsesi.json`, `kendala.json` | BNPB: water bombing, regu darat |
| `konsesi` | Perusahaan dengan titik panas terbanyak di areal izinnya musim ini | `kompleks_konsesi.json`, `aktor_karhutla.json` | KLHK Gakkum: verifikasi lapangan |
| `gambut` | KHG dengan titik terbanyak 7 hari terakhir | `khg_prioritas.json` | BRGM: pembasahan, sekat kanal |
| `cuaca` | Provinsi dengan peluang cuaca api ekstrem 7 hari ke depan, plus ENSO/IOD | `peluang.json`, `iklim_outlook.json` | BMKG/BNPB: OMC |
| `asap` | Berapa penduduk, siswa, faskes terpapar PM2.5 tidak sehat (perkiraan model) | `udara_dampak.json` | Kemenkes, Kemendikdasmen |
| `penerbangan` | Gangguan bandara akibat asap musim ini | `penerbangan.json` | Kemenhub |
| `sumberdaya` | Kebutuhan regu/air perkiraan vs posko yang ada per provinsi | `operasi.json`, `posko.json` | BNPB, TNI/Polri |
| `dampak` | Kerugian ekonomi, emisi, kesehatan yang sudah tercatat (dengan sumber) | `dampak.json` | Bappenas, Kemenkeu |
| `luas` | Luas terbakar resmi SiPongi per tahun dan provinsi teratas | `luas_resmi.json` | KLHK |
| `berulang` | Kecamatan langganan yang terbakar lagi tahun ini | `keputusan.json`, `sejarah.json` | Pemda: pencegahan permanen |
| `pencegahan` | Paket pencegahan dan perkiraan biaya untuk provinsi teratas | `preventif.json` | Bappenas, Kemendagri |
| `peringatan` | Peringatan aktif level tertinggi | `peringatan.json` | BNPB |
| `kesegaran` | Umur tiap sumber data dibanding jadwalnya | `meta.json` + `dibuat` tiap berkas | Pengelola platform |

Generator boleh menggugurkan widget yang sumbernya tidak memadai, asal
dilaporkan alasannya; jangan memalsukan isi.

## Layar

- `/presiden` menampilkan semua widget sebagai kartu bergaya Insight
  (`public/inti/insight.css`, `kartu.js`, `tabel.js`, `format.js` dipakai ulang).
- `/presiden?w=<id>` menampilkan satu widget saja tanpa kepala, untuk iframe.
- Tanpa peta dan tanpa pustaka luar: grafik SVG sederhana tulisan sendiri.
- Satu `fetch` ke `semua.json`; tidak ada polling lebih sering dari 5 menit.
