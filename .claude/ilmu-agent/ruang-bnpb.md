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
- 2026-10-19 · Halaman /bnpb dilayani dengan CSP script-src 'self' dan tanpa vendor lokal: MapLibre dari cdnjs akan diblokir, jadi peta koroplet digambar sebagai SVG sendiri (path per kecamatan, kelas CSS k0-k3). Gaya lewat atribut style di markup juga diblokir; setProperty lewat JS dan elemen meter boleh. Uji dengan server node yang menambahkan header CSP dari src/bnpb.js lalu Chrome headless lewat CDP: konsol harus kosong selain favicon.
- 2026-10-19 · Data lokal repo bisa tertinggal dari produksi (fwi.json dan hotspot.json commit 12-13 Okt, hari kerja 19 Okt). risiko.py membuang sumber harian lebih tua dari 7 hari (null) dan mencatat umur_hari per sumber di JSON; jangan baca 'tanpa titik panas' sebagai nol bila berkasnya basi. Fasilitas (sekolah.json, fasilitas.json) hanya mencakup 9 provinsi prioritas, jadi tidak boleh masuk skor nasional.
- 2026-10-19 · 2026-10-19 · Sitrep tidak menghitung ulang: tiap bencana punya laporan.json v1 (karhutla format lama: prov[].level, tanpa metrik; gunungapi dari gunungapi_status.json). Tingkat respons dibaca dari level karhutla, sorot tertinggi (banjir, cuaca, kekeringan), level gunung; gempa dan udara tanpa tingkat karena tangga registry berbeda. Pintu /bnpb membaca ringkasan risiko dari 200 KB awal berkas 900 KB (stream), cukup pindah ke berkas ringkas kecil bila pipeline menyediakan. Headless Chrome minimal 500 px: uji 390 pakai Emulation.setDeviceMetricsOverride (cdp.mjs).
- 2026-10-19 · 2026-10-19 · kebutuhan.py: kluster.json memuat 12.683 kluster median 2 titik (banyak noise), jadi titik per kompleks dan koefisien regu diambil dari kompleks operasi.json (4.696) saja; provinsi dengan < 5 kompleks di sana (Riau, Aceh, Papua, dst) diberi null, bukan dikarang. Penduduk terdampak asap dibatasi kecamatan berkompleks lv >= 2: tanpa itu masker (Rp15rb x 2 per orang) menguasai 80% total karena Jawa punya jutaan penduduk di kecamatan berklaster 1 titik. Uji cetak A4 Gakkum: Chrome CDP Emulation.setEmulatedMedia print + Page.printToPDF; body harus putih saat print (latar halaman admin ikut tercetak abu-abu bila tidak).
- 2026-10-20 · 2026-10-20 · Uji balik indeks risiko (ujibalik_risiko.py): kejadian nyata di repo hanya DIBI per KABUPATEN (kejadian.json kejadian_dibi, 3 tahun) dan gempa USGS, bukan per kecamatan; skor kabupaten = kecamatan tertinggi, lalu bendera Tinggi+ menjangkau ~90% kabupaten dan presence DIBI jenuh (base rate 0,9), jadi vonis memakai seperempat teratas dan sasaran seperempat kabupaten terbanyak laporan. Hasil: gempa mengalahkan baseline penduduk (POD 0,42 vs 0,10), banjir/longsor KALAH (0,46 vs 0,59: bias pelaporan DIBI ikut penduduk); hit rate naik monoton per kelas. Indeks harian tak punya riwayat: uji prospektif lewat arsip potret di risiko_ujibalik.json, angka baru muncul setelah 30 potret berjendela tertutup. Kapasitas dinamis hanya menaikkan (kab tak ada di agregat tidak dihukum). /api/meja/ringkas publik hanya per provinsi, tak dipakai di skor.
