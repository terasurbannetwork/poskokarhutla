# Ilmu karbon

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/karbon.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca karbon`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus karbon "..."`.

## Peta berkas & tabel

Wilayahmu: `scripts/karbon/**`, `public/karbon/**`, `tests/karbon/**`, `docs/karbon/**` (per 22 Okt 2026).
- `docs/karbon/RANCANGAN.md`: KONTRAK modul (kolom statistik satelit §3.2, urutan potongan kredit §4.2, rute worker §5,
  layar §6). Baca dulu; ubah dokumen sebelum mengubah kontrak.
- `docs/karbon/bahan/` (tidak di-git, `.git/info/exclude`): sulingan 43 dokumen pemilik. A metodologi (Manual Book, PPT
  Badan Karbon Nasional), B pasar & pembeli (Pertamina, Rimba Raya, Agrinas, KKL), C paket bisnis Wanatara + kritiknya,
  D panduan pembangunan daerah, E verifikasi regulasi 2025–2026. Rahasia bisnis: jangan disalin ke berkas yang di-git.
- `scripts/karbon/gfw.py`: klien GFW Data API (http.client). `statistik.py`: statistik per poligon. `saring.py`: semua
  konsesi → R2 `karbon/saring.json`. `impor.py`: data konsesi Kemenhut (SHP/GeoJSON/KML) → format baku §3.1.
  `ujibalik.py`: ramal hilang 2020–2024 dari laju 2010–2019.
- `public/karbon/akuntansi.js`: SATU-SATUNYA tempat rumus kredit dan keuangan (modul ES murni, tanpa DOM); dipakai
  layar, worker (`src/karbon.js`, milik warga-api), dan uji `tests/karbon/akuntansi.test.mjs`.
- Worker dan D1 bukan wilayahmu: `src/karbon.js` + `migrations/0050_karbon.sql` milik warga-api.
- Masukan konsesi sementara: `public/data/lahan/konsesi.geojson` (3.489 poligon, milik pipa-data, data 2014 kebanyakan);
  versi bernama lengkap `data/raw/konsesi/konsesi_lengkap.geojson` (lokal, tidak terbit).

## Aturan & invarian

- Python stdlib saja. Kredit, NPV, IRR tidak pernah dihitung di Python: Python menulis statistik mentah, JS menghitung.
- Definisi hutan = tutupan pohon 2000 >= 30% (`umd_tree_cover_density_2000__threshold >= 30`). Hutan tersisa tahun t =
  hutan2000 − Σ hilang s.d. t.
- Urutan potongan kredit tetap: reduksi → kebocoran → ketidakpastian → buffer non-permanen → bagian negara. Semua
  parameter 0..1; di luar itu ditolak, bukan dijepit diam-diam.
- Tiap angka di layar dibaca dari keluaran fungsi, tidak diketik. Asumsi yang belum teruji (buffer dari risiko api,
  efektivitas proyek) dilabeli HIPOTESIS di tab Metode.
- Tidak ada klaim "VM0048 compliant", "terverifikasi", atau "tersertifikasi" di layar: ini estimasi satelit pra-FS.
- Data bisnis (konsesi incaran, pembeli, harga) pribadi: R2/D1 di balik adminOK, tidak pernah di `public/data`.
- Angka: pemisah ribuan titik, desimal koma; Rp rata kiri, angka rata kanan; judul + maks satu kalimat, rumus hanya di Metode.

## Ranjau yang pernah meledak

- GFW Data API memeriksa header kunci PEKA HURUF: `x-api-key` lolos, `X-api-key` (urllib Python mengapitalkan) → 403
  "Request is missing valid API key". Pakai `http.client.putheader('x-api-key', …)` (22 Okt 2026).
- `latest` dibalas 307 ke versi; urllib mengikuti redirect POST tanpa header → 403 juga. Sematkan versi (tcl v1.13,
  tcd v1.8, alerts vYYYYMMDD harian) atau ikuti Location manual.
- Tabel `umd_tree_cover_loss` hanya memuat piksel yang PERNAH hilang: SUM(area__ha) Pangean 3.388 ha padahal poligon
  51.103 ha. Luas/stok/ekstensi dari dataset `umd_tree_cover_density_2000` (22 Okt 2026).
- Satu query ±3–10 detik; 3.489 konsesi × beberapa query = berjam-jam. Gabungkan GROUP BY, cache per (id, hash geometri,
  versi), jalankan paralel terbatas (≤ 6), dan simpan kemajuan supaya bisa dilanjutkan.
- Dokumen sumber pemilik penuh angka yang tidak konsisten (Rimba Raya 3,5/3,8/4,5 Mt/th; model Wanatara v2 rumusnya
  menghasilkan 194,6 jt bukan 73 jt). Jangan salin angka dokumen ke konstanta tanpa sumber+halaman dan cek ulang.

## Gerbang yang menghakimi

- `node --test tests/karbon/*.test.mjs` : akuntansi (kasus tangan, SMPP 566.083, NPV/IRR, penolakan parameter di luar 0..1).
- `python3 scripts/karbon/<skrip>.py --uji` : self-check offline tiap skrip (fixture respons GFW, impor SHP/KML).
- `npm run uji:agen` : satu pemilik per berkas, ilmu terisi, definisi segar.
- `tests/warga/karbon.test.mjs` (milik warga-api) menguji rute dan buku kredit; ubah kontrak = kabari warga-api.
- Pengulas: validasi-model (akuntansi, uji balik), selera-angka + inp-reviewer (layar).

## Kasus

- 22 Okt 2026: modul dibuat. Uji coba Pangean (hph-gfw-29245): hutan 50.196 ha dari 50.255 ha, AGC 8,5 jt tC
  (±169 tC/ha), hilang 2015–2024 ±191 ha/th, emisi GFW ±150 rb tCO2e/th; dokumen COA menulis 755.785 t/th (±5×).
