# RISET: bahan yang sudah ada untuk Alun-alun sebagai satu tempat kabar per kejadian

Semua fakta di bawah diperiksa di repo pada 25 Nov 2026. Praktik lembaga luar (cara ReliefWeb, GDACS, atau OCHA memadukan laporan resmi, berita, dan medsos) **belum diriset**; tidak dikarang di sini.

## 1. Alun-alun `/lapor` hari ini

- Markup: `public/lapor/index.html:240` (`<section id="lAlun">`). Klien: `public/lapor/lapor.js` `tampilAlun` (baris 1625), `gambarAlun` (1580), `kartuAlun` (1557), `gambarPetaAlun` (1600). Peta MapLibre dari `/vendor/maplibre`, dasar peta OpenFreeMap, titik berkelompok (GeoJSON). Saringan: Semua, Diikuti, dan jenis laporan.
- Rute: `GET /api/lapor/alun` di `src/lapor_ai.js:1157`. Hanya menerima `jenis` (daftar `JENIS`) dan `prov` (dua angka); parameter lain ditolak 400. Cache tepi 60 detik, batas 120 per IP per jam (baris 1171).
- Isi: hanya status `ditindaklanjuti` dan `selesai` (`TAMPIL_ALUN`, `src/lapor_tampil.js:21`), digugus 30 hari, paling banyak 100 baris. Bentuk baris: `id, jenisId, jenis, subjenis, waktu, lokasi{desa,kec,kab,prov,provKode}, dampak, status, statusLabel, tingkat, titik, nWarga, bukti` (`barisAlun` `src/lapor_tampil.js:136` dan `src/lapor_ai.js:1185`). `titik` = pusat desa dibulatkan 4 desimal; `bukti` paling banyak 4 foto yang ditandai publik per foto.
- Tidak ada kode kab/kota di baris: hanya nama `lokasi.kab` dan `lokasi.provKode`. `waktu` = `s.isian.waktu.nilai` (`src/lapor_tampil.js:115,138`), string isian pelapor; bentuknya (tanggal ISO atau kalimat bebas) **belum terdokumentasi di kode**. Versi angka (`waktuMs`) ada di ringkasan sesi tetapi dibuang dari baris Alun-alun (`{ms, id, ...x}`, `src/lapor_ai.js:1181`). `dampak` = objek angka tunggal per bidang `{meninggal, hilang, luka, mengungsi, rumah, terendam}` (`ringkasSesi`, `src/lapor_tampil.js:118`), **bukan rentang**; bidang yang belum dijawab atau nihil sama-sama menjadi `0`, jadi 0 di sini tidak berarti terukur nol.
- Sebelas id jenis (`src/lapor_spek.js:9-55`): banjir, longsor, abrasi, cuaca, kekeringan, karhutla, gempa, tsunami, erupsi, kebakaran_gedung, lainnya.

## 2. Laporan Kejadian Bencana Harian

- Generator `data/laporan-bnpb/generator/harian.py`; hasil terstruktur `data/laporan-bnpb/harian/<YYYY-MM>/<YYYY-MM-DD>/kerja-DDMMYY/data.json`. Contoh 25 Nov 2026: kunci `hari, cutoff, kejadian, prioritas_baru`; 27 kejadian (banjir 16, angin 7, longsor 3, cuaca 1); status berjalan 17, belum 9, selesai 1.
- Per kejadian: `jenis, prov` (kode BPS), `lokasi` (nama kab/kota), `status, baru, label, angka{kk, mengungsi, rumah_dampak}, teks{...}, tangani, perhatian, mulai, kondisi_pil[]`. Tidak ada koordinat, kode kab, atau korban jiwa.
- Nilai `jenis` yang dikenal generator (`harian.py:33`): gempabumi, karhutla, banjir, angin, cuaca, kekeringan, lainnya (kebakaran TPA), longsor, erupsi, gelombang_pasang, kebakaran_permukiman.
- **Selisih dengan KEPUTUSAN**: KEPUTUSAN D12 menyebut cut-off 12.00 WIB; berkas 25 Nov 2026 menulis `"cutoff": "2026-11-25T07:00+07:00"`. Paket ini memakai nilai `cutoff` dari berkas, tidak mengetik jamnya.
- **Sudah ada di git publik**: `git ls-files` menunjukkan `data.json` hari itu (`data/laporan-bnpb/harian/2026-11/2026-11-25/kerja-251126/data.json`) dan deck harian (237 berkas `Laporan Kejadian Bencana Harian*.pptx`) dilacak di repo publik ini. Jadi "laporan harian hanya di Mac pemilik" tidak benar; yang belum terjadi hanyalah penerbitan ke situs. Paket ini tidak mengubah itu, tetapi tidak menambah penerbitan baru sebelum Q2 dijawab.
- Nama folder `kerja-DDMMYY` memakai tanggal HARI BERIKUTNYA (`kerja-251126` memuat `hari` 2026-11-25); jalur berkas harus dicari dengan glob, bukan diturunkan dari `hari`. Folder hari bisa tidak ada (2026-11-24 tidak ada).
- Masukan lapangan: teks WA Dit. Koordalops dibaca `wa_harian.py` `koordalops()`. Generator jalan di Mac pemilik lewat `jalan.py` salinan per hari (`data/laporan-bnpb/harian/2026-11/2026-11-25/jalan.py`), bukan di GitHub Actions (KEPUTUSAN Q3).
- Deck 251126 empat slide: ringkasan dengan peta dan tabel, rincian kerusakan dan mulai, OMC, status gunung api. Slide 3 dan 4 di luar fase pertama (Q7).

## 3. Berita

- `scripts/umum/berita.py` (Google News RSS, kelas `Geo` memetakan teks ke kab/kota dengan kunci `"<kode prov>|<nama kab>"`, dibangun dari `public/geo/kecamatan/*.json`); karhutla `scripts/data/berita.py`. Keluaran `public/banjir/data/berita*.json` dan `public/data/berita.json`; jadwal `lintas.yml` harian (`cron: "10 2 * * *"`).
- Hanya judul, cuplikan RSS, dan tautan yang disimpan (`scripts/data/berita.py:10`). Bentuk artikel: `id, judul, sumber, url, tgl, ringkas, kab[], prov[], topik[]`.
- Pencocok kejadian ke berita sudah ada: `scripts/data/dalops_kabar.py` `cocok()` (baris 68): kode kab sama, tanggal dalam jendela, teks memuat kata jenis (`KATA_JENIS`). Peta jenis ke berkas berita: `BERKAS` (baris 28).
- Berkas berita tayang hanya menjangkau sekitar seminggu (paket `cek-kabar` RISET 2); lebih dari separuh artikel tidak punya `kab`, jadi tidak menempel.

## 4. Media sosial

- Satu-satunya kode: `scripts/umum/tiktok.mjs` dan `tiktok.py`, manual, menulis `public/data/medsos_tiktok.json` yang memuat "@akun". **Tidak dipakai** (KEPUTUSAN D10).
- Kajian `data/kajian-bnpb/pemantauan-medsos/`: Threads dan Instagram lewat API Meta tanpa biaya, X berbayar per unggahan, TikTok tanpa API resmi untuk lembaga; Paket Mulai sekitar Rp8,8 juta per bulan. Aturan PDP: halaman publik hanya angka per kab dan tautan, tanpa nama akun atau isi unggahan (`naskah/04-pembahasan.md`, bagian 4.3).
- Pilihan platform dan anggaran: belum diputuskan (Q1).

## 5. Penahan terbit

`public/.assetsignore` menjaga berkas `public/` tidak ikut terbit (dipakai untuk `data/progresi/arsip/`, `data/grup_perusahaan.json`). Ia hanya mencegah terbit ke situs; berkas yang di-commit tetap terbaca di repo publik. Karena itu `public/data/alun/kabar.json` sebelum Q2 dijawab masuk `public/.assetsignore` DAN `.gitignore` (tidak di-commit).

## 6. Akibat bagi rancangan

1. Data resmi tidak punya titik dan kode kab; harus dipasang dari nama (KEPUTUSAN D5).
2. Alun-alun tidak punya kode kab; penggabungan warga ke kejadian memakai nama kab dan kode provinsi.
3. Pencocok berita sudah ada; paket ini hanya memanggilnya.
4. Pipeline sudah ada untuk berita dan laporan harian; tidak butuh D1 atau rute Worker baru.
