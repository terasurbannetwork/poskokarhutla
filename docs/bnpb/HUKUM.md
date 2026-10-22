# Pustaka Hukum BNPB (`/bnpb/hukum`)

Permintaan pemilik 22 Okt 2026: sistem yang paling paham peraturan BNPB, meniru pasal.id
(cari per pasal, filter jenis/tahun/status, MCP untuk AI) dengan konsep legal AI Ibrahim Arief:
segmentasi deterministik, OCR ensemble untuk PDF pindaian, konteks kecil per pasal
(konteks besar = recall turun), dan tiap kutipan jawaban diperiksa ke dokumen asli.

Sumber: jdih.bnpb.go.id (Peraturan, Monografi, Artikel, Putusan). UU/PP umum di luar JDIH BNPB
dirujuk lewat MCP pasal.id, tidak disalin.

Sumber cadangan: peraturan.bpk.go.id (entitas=616, BNPB). `tarik` menjalankannya sesudah JDIH: PDF Perka/Perban yang 404 di JDIH
diunduh dari BPK (cocok lewat nomor+tahun; indeks.json memuat `pdf_bpk`, `bpk`, `sumber_data`), dan dokumen yang hanya ada di BPK
ditambahkan sebagai dok baru (metadata dari halaman BPK, `sumber_data: "peraturan.bpk.go.id"`, kunci `BPK/<slug>` di indeks).
`tarik` ulang tidak menghapus bidang BPK. Katalog memakai `pdf_bpk` sebagai tautan PDF bila ada; dok membawa `sumber`.
`--bpk-saja` / `--tanpa-bpk` mengatur langkahnya.

## Alur

```
jdih.bnpb.go.id (+ peraturan.bpk.go.id cadangan) ──tarik──> data/raw/hukum/{indeks.json, pdf/, teks/}      (gitignore kecuali indeks.json)
                 ──teks──> teks per halaman: pdftotext; halaman miskin teks -> tesseract -l ind
                 ──urai──> segmen deterministik (menimbang, mengingat, pasal, penjelasan, lampiran)
                 ──relasi─> sitasi "Peraturan ... Nomor X Tahun Y" -> kunci kanonik
                 ──keluar─> public/data/bnpb/hukum/katalog.json + data/hukum/seed.sql (D1)
```

Perintah: `python3 scripts/bnpb/hukum.py tarik|teks|urai|semua`, self-check `--cek`.
Jalan MANUAL (lokal) seperti laporan konsesi; workflow menyusul kalau pemilik mau.

## Kunci kanonik dokumen

`<jenis>-<nomor>-<tahun>` huruf kecil: `perban-1-2026`, `perka-2-2012`, `uu-24-2007`, `pp-21-2008`,
`perpres-1-2019`, `juklak-2-2026`, `juknis-5-2023`, `kepka-327-2025` (keputusan kepala), `se-...`.
Slug JDIH (`perban-nomor-1-tahun-2026`) disimpan terpisah untuk tautan ke situs resmi.
Rujukan ke dokumen yang TIDAK ada di JDIH BNPB tetap dicatat (`terdaftar: false`).

## Kontrak `public/data/bnpb/hukum/katalog.json`

```json
{"versi": 1, "dibangun": "2026-10-22T...", "sumber": "jdih.bnpb.go.id",
 "dok": [{"id": "perban-1-2026", "slug": "perban-nomor-1-tahun-2026", "tipe": "Peraturan",
          "jenis": "Peraturan Badan", "singkatan": "PERBAN", "nomor": "1", "tahun": 2026,
          "judul": "...", "status": "BERLAKU", "subjek": "...", "bidang": "...",
          "tgl_tetap": "2026-03-10", "tgl_undang": "2026-03-17", "sumber_bn": "BN 2026 (189); 13 Hlm",
          "url": "https://jdih.bnpb.go.id/dokumen/Peraturan/...", "pdf": ["https://.../2026pbbnpb001.pdf"],
          "halaman": 13, "halaman_ocr": 0, "mutu": 0.98, "n_segmen": 41}],
 "relasi": [{"dari": "perban-1-2026", "ke": "perban-1-2024", "jenis": "mengganti", "terdaftar": true,
             "ke_judul": "Peraturan BNPB Nomor 1 Tahun 2024 tentang ..."}],
 "definisi": [{"istilah": "Dana Bersama", "dok": "perban-1-2026", "label": "Pasal 1", "teks": "Dana Bersama ... adalah ..."}]}
```

`relasi.jenis`: `mengingat` (dasar hukum di konsideran), `mencabut`, `mengganti`, `mengubah`, `merujuk` (sitasi di batang tubuh).
`mutu` = porsi kata teks yang dikenal kamus korpus berlapis-teks (0..1); `halaman_ocr` = halaman yang dibaca tesseract.

## Kontrak D1 (migrasi `0049_hukum.sql`, isi dari `data/hukum/seed.sql`)

| Tabel | Kolom |
|---|---|
| `hukum_dok` | `id` TEXT PK (kunci kanonik), `slug`, `tipe`, `jenis`, `singkatan`, `nomor`, `tahun` INTEGER, `judul`, `status`, `subjek`, `tgl_tetap`, `tgl_undang`, `url`, `pdf` (JSON larik), `halaman`, `mutu` REAL, `diperbarui` INTEGER ms |
| `hukum_segmen` | `id` INTEGER PK, `dok` FK, `urut` INTEGER, `jenis` CHECK IN ('judul','menimbang','mengingat','menetapkan','pasal','penjelasan','lampiran','lain'), `label` ("Pasal 5", "Menimbang", "Lampiran hal. 12"), `bab` ("BAB II PRIORITAS PENYALURAN" atau null), `halaman` INTEGER, `teks` (maks 6000 huruf; lampiran dipecah per ~1500 huruf di batas paragraf) |
| `hukum_fts` | `fts5(teks, label, judul, tokenize='unicode61 remove_diacritics 2')`, `rowid` = `hukum_segmen.id` |
| `hukum_relasi` | `dari`, `ke`, `jenis` CHECK sama dengan katalog, `terdaftar` 0/1, `ke_judul`; PK (`dari`,`ke`,`jenis`) |

Seed = `DELETE` lalu `INSERT` (idempoten, boleh dijalankan ulang). Diterapkan manual:
`npx wrangler d1 execute poskowarga --remote --file data/hukum/seed.sql` HANYA atas izin pemilik.

## Rute worker (`src/hukum.js`, publik, tanpa data pribadi)

- `GET /api/hukum/cari?q=&jenis=&tahun=&status=&hal=` → `{total, hasil:[{segmen, dok, judul, singkatan, nomor, tahun, status, label, bab, cuplikan}]}`.
  FTS5 `bm25`, cuplikan `snippet()` dengan penanda `[[`/`]]` (layar mengubahnya jadi `<mark>` lewat DOM, bukan innerHTML).
- `GET /api/hukum/dok?id=perban-1-2026` → metadata + semua segmen + relasi keluar/masuk.
- `POST /api/hukum/tanya {pertanyaan}` → ambil ≤ 8 segmen teratas (FTS), Workers AI menjawab HANYA dari segmen itu
  dengan klaim `{pernyataan, kutipan:{segmen, teks}}`. **Gerbang mekanis** (`verifikasiKutipan`, src/hukum_spek.js): kutipan ≥ 40 huruf dan ≥ 6 kata,
  substring (huruf kecil, spasi dan kutip dinormalkan) dari segmen yang disebut DAN yang ikut dikirim; ≥ separuh kata kunci pernyataan
  (bukan stopword, ≥ 4 huruf) harus ada di segmen itu. Yang gagal dibuang dan dihitung di `dibuang`. Teks kutipan yang dikembalikan =
  potongan ASLI segmen, bukan ketikan model. Balasan `{jawaban, kutipan:[{segmen, teks, dok, label, pernyataan}], dibuang, segmen_dipakai, model, ringkasan_model}`;
  `ringkasan_model: true` bila jawaban susunan model (layar memberi label).
  Nol segmen ditemukan = `jawaban` "tidak ditemukan di peraturan BNPB". Segmen ada tetapi semua kutipan dibuang (atau model mati / tanpa binding AI) = `jawaban: null`
  + `segmen_dipakai` (layar menampilkan segmennya saja). Laju: per IP 8/jam dan 30/hari, plus plafon global 300 panggilan model/hari (dicek sebelum `AI.run`; 429).
- `GET /api/hukum/dok` memuat `relasi_tersedia` (false bila tabel relasi belum dimigrasi).
- Tabel belum ada = 503 "fitur belum diaktifkan".

## MCP (`src/mcp.js`, tool publik)

`cari_peraturan_bnpb {q, jenis?, tahun?, status?, limit}`, `baca_peraturan_bnpb {id, pasal?}`, `relasi_peraturan_bnpb {id}`.
Deskripsi tool menyuruh model mengutip label pasal dan id dokumen, dan merujuk UU/PP di luar BNPB ke pasal.id.

## Layar `/bnpb/hukum` (ruang-bnpb)

Satu halaman tiga berkas `public/bnpb/hukum.{html,js,css}` (CSP ketat):
Cari (hero kotak cari + contoh kueri, filter jenis/tahun/status, hasil per pasal dengan sorotan, berhalaman),
Dokumen (`#d=<id>`: metadata pil, daftar isi BAB/Pasal, teks per segmen, relasi keluar/masuk, tautan PDF resmi,
pil "dibaca OCR" bila `halaman_ocr > 0`), Tanya (jawaban + kartu kutipan yang bisa diklik ke pasalnya, pil
"N kutipan dibuang" bila ada), Relasi (daftar dokumen paling sering dirujuk, dicabut/diganti).
