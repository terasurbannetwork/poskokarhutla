# Paritas karhutla vs cuaca ekstrem: audit akhir 19 Okt 2026 malam

Dasar: HEAD `14d9be3`; tiap berkas dibuka dan dibaca; data live `centurisk97.terasurbannetwork.workers.dev` (hanya GET); halaman live dibuka di peramban (desktop dan emulasi 375x812). Uji lokal malam ini:
`npm run uji:agen` 57/57, `python3 scripts/umum/bencana.py cek` sah, `uji` 14 skrip `scripts/cuaca/` (termasuk `uji_alur.py`) lulus. Tabel 113 baris dengan bukti per baris: `bencana/cuaca.md`.
Paritas diukur terhadap karhutla yang TAMPIL (Dashboard, Posko, Informasi, Kompleks, Metode, dan kartu uji/galat model di Insight disembunyikan di karhutla).

## Hitungan

| | ADA | SEBAGIAN | BELUM | TIDAK BERLAKU |
| --- | --- | --- | --- | --- |
| Pagi 19 Okt | 44 | 34 | 28 | 7 |
| Malam 19 Okt | **68** (dibuat 56, diadaptasi 12) | **25** | **15** | **5** |

Registry tetap `aktif`. `PAKET-FITUR.md` melarang aktif bila ada baris "belum", tetapi tidak ada gerbang yang membaca tabel; keputusan tetap milik pemilik.

## Yang berubah sejak pagi

| Area | Keadaan sekarang |
| --- | --- |
| Kejadian | Kode C#### dan tab Kejadian ada (`scripts/umum/kejadian.py:307`, `public/cuaca/kejadian.js`); datanya belum terbit, lihat "Rusak atau basi" |
| Arsip CAP | Tabel D1 `cuaca_arsip` dan `GET /api/cuaca/arsip` (migrasi 0021, `src/nowcast.js:129`); live: 7 CAP sejak arsip menyala |
| Kalender musim dan ENSO | `scripts/cuaca/musim.py`, kartu Tren live; satu tahun DIBI (2025), per bulan nasional |
| Simulasi | `/cuaca/simulasi.html` 3D 72 jam dengan skenario siklon (menggantikan baris "tidak ada simulasi") |
| Lapor Warga | 4 jenis cuaca di server dan katalog (migrasi 0020); antarmuka belum dipasang |
| Konteks, dummy, i18n | Lapisan konteks registry; 17 foto dummy; kamus EN: kebocoran tinggal 5-10 per bencana |
| Laporan harian | `/cuaca/laporan.html`, `cuaca_laporan.json` 30 hari |

## Data live (GET)

| Cek | Hasil |
| --- | --- |
| `/api/status` | `ok:true`, `basi:[]`; cuaca umur 4,2 jam, cuaca_nowcast 0,1 jam, berita_cuaca 2,1 jam; `dampak` 21,5 jam tanpa ambang |
| `/api/cuaca/arsip` | 200; 13-19 Okt, 7 CAP "Hujan Lebat dan Petir" (Moderate), `terpotong:false` |
| `/banjir/data/cuaca_musim.json` | 200; bulan 2025 + ENSO 2010-2023; `kini`: El Nino, IOD positif, ONI 2,16 |
| `kejadian_cuaca_awal.json` | **404** (tab Kejadian dibuang; satu galat 404 di konsol tiap muat halaman) |
| Peringatan dan siklon | `cuaca_siklon.json` Champi (JTWC); panel live Nowcast 5, Gelombang 10, Status 14 provinsi |
| 375 px | `scrollWidth` 375 di ketujuh tab (Peta, Insight, Berita, Tren, Dampak, Foto, Tentang) |

## Lima celah terbesar

1. **Uji balik tidak layak dan sempit.** Prakiraan hujan >=50 mm vs DIBI: POD 6,5%, FAR 59%, CSI 6,0%; embusan, gelombang, ansambel belum diuji; peringatan BMKG vs DIBI n=0; prospektif n=0 (B02, B03, A09).
2. **Arsip CAP permanen tidak disambung.** D1 `cuaca_arsip` dan `/api/cuaca/arsip` tidak dibaca `verifikasi.py` maupun layar, sehingga uji balik BMKG masih memakai arsip harian sejak 12 Okt (A18, B02).
3. **Kejadian belum tayang dan laci miskin.** Data C#### 404; atribut tipis; laci tanpa kondisi sekarang, riwayat, InaRISK (A04, A05, A07, C12, C15).
4. **Lapisan respons tidak ada.** Posko, sarana, operasi, keputusan, pencegahan, dashboard, kontak aktif (A21, A22, A24, A25, A30, A40, C19, C21).
5. **Dokumen dan sejarah.** Tanpa `RISET-*.md`, galeri kasus, uji tren, IBTrACS, cerita, factsheet, `kredit.json` (B04, B06, B10, F03, F04, A18, A36, C16); Lapor Warga tak terjangkau (C24); EN belum nol (C29, E08).

## Rusak atau basi

- `public/banjir/data/kejadian_cuaca_awal.json` dan `_geo.json` tidak ada di repo maupun live; langkah baru di `lintas.yml:128` baru jalan 02:10 UTC.
- Registry `public/bencana.json:573-574` menulis `workflow: "banjir.yml"` dan `pengerja: "cuaca"`; kenyataannya pipeline di `lintas.yml` dan agen `cuaca-udara`.
- Teks usang "Berita diperbarui tangan" di `public/cuaca/metode.js:31` dan docstring `scripts/cuaca/berita.py:3`; `lintas.yml:112` menjalankannya harian (live dibuat 19 Okt 10.51 UTC).
- Komentar `public/cuaca/dampak.js:4-6` masih berkata sekolah dan faskes tidak ada, padahal `dampak_cuaca.py` menulis `zona`.
- `<title>` halaman `/cuaca/` hanya "Centurisk97" (udara memuat nama bencana).
- Tab Foto live kosong ("Belum ada foto"); dummy 🧪 belum diisi di produksi.
- `PAKET-FITUR.md` menyebut `tests/e2e/05-dummy-jejak.sql`; berkas itu tidak ada.

## Klaim lama yang dicabut (audit 16 Okt)

BEDA Fo2 (kategori foto) dan Ka4 (label ekspor) sudah teratasi (`public/foto.js:13`, `public/bagikan.js:34`); gambar OG cuaca ada (`/data/og/cuaca.png` live 200); "7 tab" tetap 7 di live (Kejadian bersyarat data, Simulasi lewat ikon kepala); "peringatan.json basi, perlu job per jam" digantikan Worker 600 dtk; "SIAP AKTIF: BELUM" dihapus karena registry sudah `aktif`; hitungan 34 SAMA/14 D/2 BEDA diganti tabel 113 baris.

## Mengulang audit

`npm run uji:agen`; `for s in scripts/cuaca/*.py; do python3 $s uji; done`; `curl` `/api/status`, `/api/cuaca/arsip`, `/banjir/data/cuaca_*.json`; buka `/cuaca/` pada 375 px dan cek `document.documentElement.scrollWidth`.
