# Rencana multi-bencana Pantau Bencana

Dibuat 15 Okt 2026 atas permintaan pemilik: semua bencana lain meniru best practice dan SELURUH
fitur modul karhutla, satu per satu, serinci mungkin.

Dokumen ini adalah rencana, bukan kode. Tiap bencana dikerjakan mengikuti alur di
[`ALUR.md`](ALUR.md) dan dinilai dengan daftar periksa di [`PAKET-FITUR.md`](PAKET-FITUR.md).

## Isi

| Berkas | Isinya | Dibaca saat |
| --- | --- | --- |
| [`ARSITEKTUR.md`](ARSITEKTUR.md) | Arsitektur target: registry bencana, rute, data, pipeline, worker, D1, layar, i18n, OG, agent | Sebelum menyentuh kode apa pun |
| [`PAKET-FITUR.md`](PAKET-FITUR.md) | Daftar exhaustive 113 komponen karhutla, padanannya untuk bencana lain, dan cara membuatnya | Merencanakan dan menutup tiap bencana |
| [`FASE-0.md`](FASE-0.md) | Fondasi bersama yang WAJIB ada sebelum bencana ketiga lahir | Pekerjaan pertama |
| [`ALUR.md`](ALUR.md) | Alur kerja 12 tahap per bencana, dari riset sampai rilis, dengan gerbang tiap tahap | Tiap kali memulai bencana baru |
| [`SUMBER-DATA.md`](SUMBER-DATA.md) | Sumber data terbuka per bencana (URL, format, frekuensi, lisensi, status verifikasi) | Tahap riset tiap bencana |
| [`RENCANA-20-JAM.md`](RENCANA-20-JAM.md) | Aturan A1–A25 dari ucapan berulang pemilik dan urutan kerja sembilan blok | Sebelum blok kerja apa pun |
| [`PETA.md`](PETA.md) | Cetak biru peta karhutla dipecah ke `public/inti/peta/`, beda peta per bencana, gerbang peta | Menulis layar peta bencana baru |
| [`PELATIHAN-MODEL.md`](PELATIHAN-MODEL.md) | Kerangka latih bersama (`scripts/umum/latih/`), bug karhutla yang dibetulkan dulu, model per bencana, gerbang model | Sebelum melatih model apa pun |
| [`COPYWRITING.md`](COPYWRITING.md) | Suara dan pola copy karhutla, aturan angka, pelanggaran sisa, kosakata padanan per bencana | Menulis teks layar, bagikan, OG |
| [`MODUL-PLUG-AND-PLAY.md`](MODUL-PLUG-AND-PLAY.md) | Katalog 35 modul: colok, satu langkah, adaptor, karhutla saja; medan registry tambahan | Sebelum menyalin modul apa pun |
| [`bencana/`](bencana/) | Spesifikasi rinci per bencana: kejadian, status, lapisan, laci, insight, model, uji balik, posko, dampak, lapor warga | Saat bencana itu dikerjakan |

## Keputusan inti (ringkas; alasannya di ARSITEKTUR.md)

1. **Satu situs, satu registry.** `public/bencana.json` jadi sumber tunggal daftar bencana:
   nama, ikon, warna, rute, folder data, tab, sumber status, kategori foto, jenis lapor warga.
   Menu header, worker, statistik, OG, dan pipeline membacanya. Tidak ada lagi menu yang
   ditulis tangan di tiap HTML.
2. **Rute `/<id>/` per bencana**, tab dengan URL bersih `/<id>/<tab>` seperti karhutla.
   Karhutla tetap di `/` demi tautan lama dan OG yang sudah tersebar; `/karhutla/` dialihkan ke `/`.
3. **Data di `public/<id>/data/`.** Karhutla tetap di `public/data/` (dicatat di registry).
4. **Inti bersama ditarik bertahap (pola strangler), bukan rombak besar.** `public/inti/` untuk
   layar, `scripts/umum/` untuk pipeline. Karhutla tidak disentuh kecuali untuk mengganti fungsi
   yang sudah dipindah. Gerbang menolak duplikasi baru.
5. **Dua kecepatan data.** Bencana lambat (kekeringan, musim) lewat GitHub Actions dan JSON statis.
   Bencana cepat (gempa, tsunami, erupsi, peringatan cuaca) lewat cron Worker ke D1 dan
   `/api/<id>/terbaru`, persis pola `/api/titik` karhutla.
6. **Enum bahaya dan jenis laporan di D1 jadi tabel rujukan**, bukan CHECK berdaftar. Ini butuh
   SATU pembangunan ulang `laporan`/`foto` yang hati-hati (cascade FK, ARSITEKTUR §6.1); sesudahnya
   bencana baru = satu migrasi INSERT.
7. **Satu bencana selesai = 100% PAKET-FITUR terisi** (tiap baris: dibuat, diadaptasi, atau
   "tidak berlaku" dengan alasan tertulis), semua gerbang hijau, dan uji balik tampil apa adanya.
8. **Tiap bencana punya pengerja agent sendiri** (Sonnet) dengan ilmu dan wilayah berkas sendiri.

## Urutan pengerjaan yang diusulkan

| Urutan | Bencana | Alasan |
| --- | --- | --- |
| 0 | Fondasi bersama (FASE-0) | Pemakai kedua (banjir) sudah lahir tanpa rumah bersama; bencana ketiga jangan |
| 1 | Banjir, longsor, rob: naik kelas ke paket penuh dan dibuka di menu | 80% sudah ada, saat ini tersembunyi; tutup celahnya dulu |
| 2 | [Gempa bumi & tsunami](bencana/gempa.md) | Tiga JSON BMKG + USGS/EMSC terverifikasi hidup, real-time, dampak terbesar, 26.004 gempa M4,5+ sejak 2000 untuk uji balik. Tsunami jadi lapisan di modul ini (tidak ada umpan terbuka tersendiri) |
| 3 | [Cuaca ekstrem + gelombang tinggi](bencana/cuaca.md) | Nowcast/CAP dan prakiraan BMKG hidup, Open-Meteo sudah dipakai, bahan sudah ada di banjir |
| 4 | [Kualitas udara & asap](bencana/udara.md) | CAMS lewat Open-Meteo tanpa kunci, langsung terkait titik panas karhutla; upaya paling kecil |
| 5 | [Gunung api](bencana/gunungapi.md) | Dampak tinggi, tetapi MAGMA tanpa API terbuka: pemanen HTML rapuh, perlu cadangan GDACS |
| 6 | [Kekeringan](bencana/kekeringan.md) | Bisa dihitung dari ERA5 + ONI/DMI tanpa layanan baru; lambat, mendesak paling rendah |
| 7 | Beranda semua bencana (`/semua`) | GDACS + InaRISK + BNPB `Kejadian_Bencana_Mingguan` sebagai kartu "semua kejadian", setelah minimal 4 modul aktif |

Longsor dan rob tetap di modul banjir ([`bencana/banjir.md`](bencana/banjir.md)).
Urutan ini mengikuti hasil verifikasi [`SUMBER-DATA.md`](SUMBER-DATA.md) 15 Okt 2026.

## Risiko terbesar dari riset

1. **BMKG menolak permintaan ber-UA pendek (403).** Wajib UA peramban lengkap; belum diuji dari
   IP GitHub Actions. Ini diuji pertama kali di FASE-0 tahap B, sebelum modul gempa ditulis.
2. **MAGMA tanpa API terbuka.** Modul gunung api bergantung pada pemanen HTML yang bisa patah.

## Keputusan yang menunggu pemilik

Daftarnya di akhir [`ARSITEKTUR.md`](ARSITEKTUR.md#keputusan-yang-menunggu-pemilik).
