# Paritas karhutla vs kualitas udara: audit akhir 19 Okt 2026 malam

Dasar: HEAD `14d9be3`; tiap berkas dibuka dan dibaca; data live `centurisk97.terasurbannetwork.workers.dev` (hanya GET); halaman live dibuka di peramban (desktop dan emulasi 375x812). Uji lokal malam ini:
`npm run uji:agen` 57/57, `npm run uji:udara` 26/26, `python3 scripts/umum/bencana.py cek` sah, `uji` 16 skrip `scripts/udara/` lulus. Tabel 113 baris dengan bukti per baris: `bencana/udara.md`.
Paritas diukur terhadap karhutla yang TAMPIL (Dashboard, Posko, Informasi, Kompleks, Metode, dan kartu uji/galat model di Insight disembunyikan di karhutla).
Semua angka PM2,5 dan jiwa adalah perkiraan model CAMS yang belum dikoreksi ke alat ukur; tiap kartu berangka membawa pil itu.

## Hitungan

| | ADA | SEBAGIAN | BELUM | TIDAK BERLAKU |
| --- | --- | --- | --- | --- |
| Pagi 19 Okt | 42 | 33 | 28 | 10 |
| Malam 19 Okt | **65** (dibuat 51, diadaptasi 14) | **25** | **17** | **6** |

Registry tetap `aktif`. `PAKET-FITUR.md` melarang aktif bila ada baris "belum", tetapi tidak ada gerbang yang membaca tabel; keputusan tetap milik pemilik.

## Yang berubah sejak pagi

| Area | Keadaan sekarang |
| --- | --- |
| Satu jalur data | `public/udara/data/prakiraan.json` (514 kab/kota, 72 jam) menjadi sumber peta, Insight, Dampak, status; `/api/status` memantau berkas itu (ambang 18 jam, commit d77b3c7) |
| Peta | PM2,5 diinterpolasi ke sel 0,25 derajat; puncak per jam jujur (hari ini hanya jam tersisa); peta di-cache per hari (commit 4124356) |
| Atribusi dan peluang | Insight "Sumber asap", "Asal asap", "Peluang" (729 varian), "Galat model" METAR; arsip prakiraan harian untuk uji prospektif |
| Kejadian | Kode U#### dan tab Kejadian (`scripts/umum/kejadian.py:242`); datanya belum terbit; laporan kejadian per kab Siaga sudah tayang (14 kab) |
| Tren | Kalender musim asap dan ENSO ada di kode; berkasnya belum terbit |
| Simulasi | Tab Simulasi partikel Lagrangian 3D, 6 skenario, 15 uji |
| Lapor Warga, konteks, dummy, i18n | 3 jenis udara di server dan katalog (antarmuka belum dipasang); lapisan konteks; 15 foto dummy; kebocoran EN tinggal 5-10 |

## Data live (GET)

| Cek | Hasil |
| --- | --- |
| `/api/status` | `ok:true`, `basi:[]`; kualitas umur 5,2 jam (ambang 18), berita_udara 2,1 jam |
| `/udara/data/prakiraan.json` | 200; dibuat 19 Okt 07.42 UTC; 514 kota x 72 jam; `jalan_model` 18 Okt 12.00 UTC; status hari ini: normal 414, waspada 88, siaga 5, awas 7 |
| Koreksi stasiun | `koreksi.status` "belum", `n_stasiun` 0, `galat.stasiun` null |
| Uji METAR (hindcast) | 810 hari-bandara, 27 bandara: hit 45,3%, FAR 15,8%, CSI 41,8% |
| `riwayat.json`, `musim_asap.json`, `kejadian_udara_awal.json` | **404** (tiga galat 404 di konsol tiap muat halaman) |
| Halaman | 8 tab live; Insight 8 kartu; Tren hanya 2 kartu (3 hari prakiraan); Overlay 6 ubin |
| 375 px | `scrollWidth` 375 di delapan tab |

## Lima celah terbesar

1. **Tanpa pengamatan terukur.** Tidak ada ISPU resmi maupun stasiun; koreksi bias tidak aktif (`WAQI_TOKEN` dikirim di `udara.yml:59` tetapi n_stasiun 0); satu-satunya uji adalah hindcast METAR (A01, A20, B01, B02, B05).
2. **Tren tanpa riwayat dan musim.** Dua berkas 404 sehingga Tren live hanya 3 hari prakiraan, tanpa kalender musim asap dan ENSO; riwayat hanya 31-120 hari, bukan sejak 2013 (A16, A18, C18).
3. **Kejadian belum tayang dan laci tipis.** Data U#### 404; tanpa polutan dominan, durasi, sumber dugaan; laci tanpa saran kesehatan, sekolah/RS, riwayat (A04, A05, A07, A25, C12, C15).
4. **Model belum teruji menyeluruh.** Prospektif menunggu >=50 hari-bandara; atribusi tanpa uji balik dan 108 dari 415 kota tak terpercaya; "peluang" hanya sensitivitas asumsi; tidak ada uji silang Python-JS (A10, A12, B03, B07, B08).
5. **Respons, kredit, dokumen.** Tanpa ruang udara bersih, video, factsheet, unit respons, `RISET-*.md`, kasus, uji tren, cerita; Tentang tidak menyebut WRI (CC BY 4.0), METAR/IEM, Dapodik (A21, A34, A36, A40, B04, B06, B10, F03, F04, C16). Di luar PAKET: Peringatan Dini (`src/ews.js`) tidak mencakup udara.

## Rusak atau basi

- `riwayat.json`, `musim_asap.json`, `kejadian_udara_awal.json` tidak ada di repo maupun live; kodenya ditambah 18.49 dan 17.52 WIB, sesudah run `udara.yml` terakhir (14.43 WIB); `riwayat.py`/`musim_asap.py` baru jalan pada run berikutnya (06.40 atau 18.40 UTC), kejadian pada `lintas.yml` 02:10 UTC.
- `public/udara/metode.js:16,18`: Metode menyebut riwayat Tren dari analisis CAMS (belum benar di live) dan "Berita diperbarui tangan" (usang, `lintas.yml:112` harian).
- Komentar `udara.yml:3` berkata jalan CAMS 00 dan 12 UTC sudah tersedia; data live memakai jalan 12 UTC hari sebelumnya (umur ±20 jam saat terbit). Perlu dicek.
- Registry `public/bencana.json:652` menamai kejadian "Stasiun tercemar" padahal isinya kab/kota; `:701` `pengerja: "udara"` tidak cocok dengan agen `cuaca-udara`.
- Tentang (`public/tentang.html:1160-1175`) tidak punya baris jadwal udara dan tidak menyebut sumber WRI, METAR/IEM.
- Tab Foto live kosong; jenis lama karhutla `udara/sehat/ruang` tetap bahaya karhutla (`public/informasi_jenis.js:47,53`), tidak dipindah.
- `PAKET-FITUR.md` menyebut `tests/e2e/05-dummy-jejak.sql`; berkas itu tidak ada.

## Klaim lama yang dicabut (audit 16 Okt)

BEDA Fo2 (kategori foto) dan Ka4 (label ekspor) sudah teratasi (`public/foto.js:13`, `public/bagikan.js:34`); "uji ke OpenAQ/WAQI" diganti hindcast METAR; "riwayat 45 hari dari isi awal" diganti `r24_kota` 120 hari dan `laporan.json` 32 hari;
"tidak ada simulasi" diganti tab Simulasi; "SIAP AKTIF: BELUM" dihapus karena registry sudah `aktif`; hitungan 35 SAMA/13 D/2 BEDA diganti tabel 113 baris.

## Mengulang audit

`npm run uji:agen && npm run uji:udara`; `for s in scripts/udara/*.py; do grep -q "def uji" $s && python3 $s uji; done`; `curl` `/api/status`, `/udara/data/prakiraan.json`, `/udara/data/riwayat.json`, `/udara/data/musim_asap.json`; buka `/udara/` pada 375 px.
