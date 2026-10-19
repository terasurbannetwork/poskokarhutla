# Paritas karhutla vs kekeringan

Audit akhir 19 Okt 2026 malam, HEAD c191384. Rincian 113 baris dengan bukti `berkas:baris`: [`bencana/kekeringan.md`](bencana/kekeringan.md).
Yang dibandingkan: karhutla yang TAMPIL (tab dan bagian yang disembunyikan pemilik tidak dihitung sebagai kekurangan).
Pembuktian: 19 skrip `uji` kekeringan lulus, `npm run uji:agen` 57/57, uji warga (og, registry, foto, skema) 37/37.

## Hitungan

| | ADA | SEBAGIAN | BELUM | TB |
| --- | --- | --- | --- | --- |
| Pagi 19 Okt | 38 | 43 | 24 | 8 |
| Malam 19 Okt | 62 | 33 | 9 | 9 |

Naik hari ini: uji balik vs DIBI dan penyetelan 21 kandidat, pil hipotesis di semua angka status, dampak sekolah/fasilitas,
posko air (tersembunyi), lapisan embung/gambut, kalender musim + risiko riwayat, kode D dan laporan kejadian 246 kabupaten,
foto dummy, Lapor Warga di server, lapisan konteks, EN, bagikan, OG per bencana.

## Yang sama dengan karhutla

Kepala, menu, tab URL bersih, tema, waktu data, peta satelit dengan 7 mode data, kartu hover, legenda dok, Insight (10 kartu),
Tren (7 kartu), Dampak (5 bagian), pop-up Situasi, Foto, Tentang, kaki, bagikan, statistik, admin foto, kesegaran `/api/status`,
beban, pemilik berkas, model agent.

## Beda yang sah (D)

Status adalah potret harian/bulanan (tanpa rentang waktu, tanpa titik pengamatan, tanpa jalur cepat Worker); simulasi memakai neraca
air FAO-56, bukan fisika api; tidak ada aset udara; seri 30 hari mengganti arus kejadian. Status resmi lembaga hanya SK BNPB 2025
(`n_aktif` 0); BMKG hanya menerbitkan peta gambar.

## Status ambang: hipotesis, dan jujur

Uji balik (`kekeringan_ujibalik.json`, 611 sel, 1991-2025, tinggal-satu-tahun, DIBI 288 kejadian) menyatakan ambang SPI-3 belum
layak (POD 0,10-0,38, FAR 0,95-0,99, CSI di bawah kriteria 2x acak). Prospek musiman cadangan ENSO BSS -0,02. Semua angka status
tampil dengan pil hipotesis. Persentil tanah baru 12 dari 611 sel (bertanggal 13 Okt), sehingga Awas bergantung pada SPI-6.

## 5 celah terbesar

1. Kejadian D (A04-A07, C12, C15): adaptor jalan, tetapi keluaran tidak diterbitkan ke repo dan halaman kekeringan tidak membacanya (tanpa laci, tab kejadian, `/k/D####`); hanya `/semua` memakainya.
2. Lapor Warga (C24): backend, jenis, migrasi, uji ada; halaman kekeringan tidak punya tab atau form (karhutla/banjir punya).
3. Gerbang CI (E01): dari 19 skrip hanya 4 diuji di workflow; `neraca` (kesetaraan Python-JS B07), `ujibalik`, `ambang`, `dampak`, `posko` tidak.
4. Ekonomi dan pimpinan (A24, A25, A30, C21, C16): keputusan biaya-manfaat, preventif, ringkasan dan dashboard, cerita belum dibuat; posko hanya liter dan rit tangki.
5. Dokumen dan kredit (F04, B10, C22, C29): tanpa `kredit.json` modul, RISET hanya untuk ambang, Metode tanpa bab neraca/posko/risiko, kamus EN belum memuat beberapa label dan crawl belum mencakup kekeringan.

## Rusak / basi

- Produksi belum memuat `kekeringan_ujibalik.json` terbaru: live `dibuat` 00:38 WIB dan `bnpb.ada=false`; versi di repo (19:00, DIBI, `kejadian`) baru tayang saat `lintas.yml` berikutnya (cron 02:10 UTC; terakhir 10:29 UTC) karena data kekeringan hidup di cache CI.
- `scripts/kekeringan/berita.py` `METODE.batas` masih menulis "tidak ada workflow, diperbarui tangan" padahal `lintas.yml:119-122` menjalankannya harian; komentar `kekeringan/berita.js:4`, `lintas.yml:101` ("9 turunan", sebenarnya 11), `kekeringan/app.js:66-68` ("menunggu foto") basi.
- `public/banjir/data/dampak_kekeringan.json` (16 Okt, skema lama) yatim; `dampak.js` membaca `public/data/dampak_kekeringan.json`.
- Registry: `workflow: "data.yml"` keliru (pekerjanya `lintas.yml`); `pengerja: "kekeringan"` bukan id roster (`gunungapi-kering`).
- `berita_kekeringan.json` lokal 16 Okt (live segar: `/api/status` 2,1 jam). Kode kabupaten laporan kejadian urut alfabetis internal, bukan Kemendagri: tautan tersimpan bergeser bila daftar berubah.
- `/api/status` live: `ok`, `basi` kosong, kekeringan 2,3 jam, berita_kekeringan 2,1 jam.
