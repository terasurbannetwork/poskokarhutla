# Ilmu ruang-bnpb

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/ruang-bnpb.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca ruang-bnpb`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus ruang-bnpb "..."`.

## Peta berkas & tabel

Ruang Koordinasi BNPB lahir 19 Okt 2026 dari permintaan pemilik (staf ahli BNPB). Rencana dan
alasan per sistem: `docs/bnpb/RENCANA-12-JAM.md`. Kontrak teknis bersama: `docs/bnpb/ARSITEKTUR.md`.

| Berkas | Isi |
| --- | --- |
| `public/bnpb/bnpb.css` | gaya bersama halaman publik; `@import` admin.css (token, header, tabel, pil) + kelas `bn-*` (kartu, formulir, pil, alur status) |
| `public/bnpb/<halaman>.{html,js,css}` | satu halaman = tiga berkas; dilayani worker lewat `halamanBnpbPublik` (`src/bnpb.js`) dengan CSP ketat |
| `scripts/bnpb/*.py` | pipeline Python 3.12 stdlib (indeks risiko kecamatan, perkiraan kebutuhan musim) → `public/data/bnpb/*.json` |
| `public/data/bnpb/*.json` | keluaran pipeline yang dibaca layar |

Sumber yang dibaca (bukan milik agent ini): `public/data/inarisk.json` (indeks bahaya karhutla InaRISK per kompleks),
`public/data/bpbd.json` (kantor BPBD + nomor Pusdalops), `public/data/bnpb.json` (rekap harian BNPB per provinsi),
`public/geo/kecamatan/<prov>.json`, `public/geo/kabupaten/<prov>.json`, data modul bencana di `public/data`, `public/banjir/data`,
`public/gempa`, `public/gunungapi`, `public/kekeringan`.

Rute worker yang menyuapi layar (milik `warga-api`): `src/relawan.js`, `src/alun.js`, `src/riset.js`, `src/meja.js`.
Tabel D1: `laju_bnpb` (0022), lalu 0023 relawan, 0024 alun-alun, 0025 riset, 0026 meja kerja.

## Aturan & invarian

- Halaman publik TANPA skrip/gaya inline dan tanpa atribut `on*=`: CSP `script-src 'self'; style-src 'self'`. Semua teks dari data lewat
  `textContent` atau `esc()`; tidak pernah `innerHTML` dengan string mentah dari API.
- Data pribadi relawan (WA, email, kontak darurat) tidak pernah dirender di halaman publik. Halaman berkode (`/relawan/saya`, kampus,
  mitra, meja) membaca lewat header `x-kode` dari fragmen `#k=`, lalu menghapus fragmen dari bilah alamat.
- Indeks komposit buatan sendiri diberi pil "belum diuji balik" sampai ada uji balik terhadap kejadian nyata (DIBI). Angka InaRISK disebut sumbernya.
- Pintu `/bnpb` tidak dimasukkan ke nav utama situs (keputusan pemilik 19 Okt 2026).
- Gaya pemilik A1–A25 (memori `aturan-berulang`): data + label saja, pil berikon, kartu Insight, tabel standar, sapaan "kamu", tanpa em dash, angka format Indonesia.
- Klik tidak membekukan layar: daftar panjang dirender bertahap; chrome tombol bereaksi seketika.

## Ranjau yang pernah meledak

- Commit "gas" pemilik menyapu working tree dan push ke produksi beberapa kali per jam: berkas setengah jadi bisa tayang. Selesaikan satu
  halaman sampai bisa dipakai sebelum membuka berkas berikutnya; jangan tinggalkan tautan ke halaman yang belum ada.
- Berkas statis baru menambah aturan `_headers` lewat `scripts/terbit/versi.py`; batas Cloudflare 100 aturan. Lebih dari belasan berkas baru: cek hitungannya.
- Migrasi D1 produksi diterapkan manual; rute membalas 503 saat tabel belum ada. Layar harus menampilkan keadaan itu dengan rapi, bukan layar kosong.

## Gerbang yang menghakimi

- `npm run uji:warga` (rute dan D1 yang menyuapi layar), `npm run uji:agen` (pemilik berkas, katalog segar).
- Self-check `assert` di tiap `scripts/bnpb/*.py` (`python3 scripts/bnpb/<x>.py --cek`).
- Pemeriksaan layar di peramban 1440 dan 390, konsol tanpa galat; pengulas `selera-angka` dan `inp-reviewer`.

## Kasus
