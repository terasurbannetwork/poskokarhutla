# Ilmu lapangan

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/lapangan.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca lapangan`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus lapangan "..."`.

## Peta berkas & tabel

Modul Pegawai dan Relawan Lapangan (`/petugas`) lahir 1 Nov 2026 dari Paparan Kepala BNPB 011126 (slide Big Data
Lapangan). Dokumen rancangan urut otoritas AGENTS.md §2.3: `data/kajian-bnpb/lapangan/` KEPUTUSAN-LAPANGAN, RISET (+
`riset/R1-R3`), PRD, ALUR, ALGORITMA, DESIGN-SYSTEM, DESAIN-TEKNIS, KEAMANAN-PRIVASI, RENCANA-UJI, TIKET, GLOSARIUM.

| Berkas | Isi |
| --- | --- |
| `public/petugas/index.html`, `app.js`, `lapangan.css`, `sw.js` | layar petugas L1 sampai L6, cangkang PWA |
| `public/petugas/wajah.js`, `model/**` | pembungkus Human (MIT): sudut, mutu, tantangan, vektor |
| `public/petugas/stempel.js`, `antre.js` | stempel foto, antrean luring IndexedDB |
| `public/petugas/panel.*` | panel pimpinan |
| `tests/lapangan/*` | fungsi murni klien |
| `scripts/lapangan/*` | ekspor label, kalibrasi ambang |

Bukan milikku (pakai lewat API): `src/lapangan*.js`, `migrations/0095-0098` (warga-api); `scripts/wa/**` (wa-bot);
modul relawan `src/relawan.js`, `public/bnpb/relawan*`.

## Aturan & invarian

- Konstanta (sudut, ambang, radius, jeda GPS) hanya dari `GET /api/petugas/konst`; klien tidak mengarang angka.
- Kamera langsung (`getUserMedia`), tidak ada pilihan galeri. Stempel memakai waktu server + selisih yang diukur.
- Vektor wajah tidak disimpan di `localStorage` maupun IndexedDB kecuali di antrean luring sampai terkirim, lalu dihapus.
- Istilah: "pindai wajah" (bukan swafoto), "Relawan BNPB", "Tenaga Ahli dan Tim Khusus", "hotspot" (bukan titik api).
- Kepala situs bersama `/inti/kepala.*`, token `/inti/tema.css`, tanpa palet lokal; teks rata kanan-kiri, tanpa titik tengah.

## Ranjau yang pernah meledak

- Nomor migrasi: 0094 dipakai sesi logbook (juklak); modul ini 0095-0098.
- Tanda yaw/pitch kamera depan tercermin; cek di HP nyata (RENCANA-UJI U-07) sebelum mengunci arah kiri/kanan.

## Gerbang yang menghakimi

`npm run uji:agen` (paket modul, ilmu agent), `npm run uji:warga` (rute), `node --test tests/lapangan`.

## Kasus
- 2026-11-01 · uji murni menangkap STATUS['__proto__'] lolos ||; pakai Object.hasOwn untuk peta dari data luar. Cek: tests/lapangan/murni.test.mjs
- 2026-11-02 · Permissions-Policy camera=() di public/_headers memblokir getUserMedia di /petugas; CSP_PETUGAS tanpa worker-src blob: dan tiles.openfreemap.org mematikan peta panel. Cek: buka /petugas di HP nyata.
- 2026-11-02 · 2026-11-02 · anti-palsu = MiniFASNet 2.7 + 4.0 via onnxruntime-web WASM tanpa threads (11 MB wasm, 3,5 MB model); butuh CSP script-src 'wasm-unsafe-eval' di src/worker.js. Galat muat/jalan model = skor_hidup 0 (tinjau), bukan absen gagal. Distribusi skor beda dari model Human lama: antispoofMin server perlu dikalibrasi ulang di HP nyata. Cek: tests/lapangan/antispoof.test.mjs, vendor/LISENSI.txt.
- 2026-11-02 · 2026-11-02 · tabel lebar di dalam div anak .lp-kartu melebarkan SELURUH halaman panel (scrollWidth 826 di 390 px) karena item grid min-width:auto; obat .lp-kartu>*{min-width:0}. Cek: scrollWidth panel di 390 px.
