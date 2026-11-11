# DESAIN-TEKNIS: Cek Kabar Luar

## Berkas

| Berkas | Pemilik | Isi |
| --- | --- | --- |
| `scripts/data/dalops_kabar.py` (baru) | pipa-data | `muat_bahan()`, `cocok()`, `arah()`, `alam()`, `label()`, `periksa()`, `arsipkan()`, `rapor()`, `uji()` |
| `scripts/data/dalops_banjir.py` | pipa-data | memanggil `periksa()` sebelum `tulis()`; tanpa logika cek di sini |
| `public/bnpb/dalops_hitung.js` | ruang-bnpb | `urutTanya()` memakai `luar.label`; `pesanWA()` menerima label |
| `public/bnpb/dalops.js` | ruang-bnpb | kartu ringkasan, label per baris, pop-up bukti |
| `tests/bnpb/dalops.test.mjs` | ruang-bnpb | uji urutan, teks WA, render label |

Tidak ada folder baru di `public/` atau `scripts/`, tidak ada rute Worker, tidak ada migrasi D1 (KEPUTUSAN D4).

## Kolom baru per baris `dalops/<jenis>.json`

Hanya pada baris `surut: false`:

```json
"luar": {
  "label": "masih | mungkin_selesai | belum_ada",
  "dasar": "berita | alam | null",
  "senyap": 5,
  "alam": "normal | aktif | null",
  "bukti": [{"judul": "...", "media": "...", "tgl": "2026-11-10", "url": "https://...", "arah": "masih | pulih"}],
  "catatan": "sumber tidak terjangkau | null",
  "dicek": "2026-11-11T07:30+07:00"
}
```

`bukti` paling banyak 5 artikel, terbaru dulu. `url` disimpan apa adanya dari berita tayang (tautan Google News).

`luar` dihitung ulang tiap jalan, termasuk jalur `--wa` (`main_wa`) yang membaca ulang berkas R2: baris yang kini `surut: true` **dihapus** kolom `luar`-nya, supaya label lama tidak tertinggal.

## Peta jenis ke berkas

| Jenis | Berita | Alam |
| --- | --- | --- |
| banjir, longsor | `/banjir/data/berita.json` | `/banjir/data/status.json` |
| cuaca | `/banjir/data/berita_cuaca.json` | tidak ada |
| gempa | `/banjir/data/berita_gempa.json` | tidak ada |
| kekeringan | `/banjir/data/berita_kekeringan.json` | `/kekeringan/data/gdo.json` |
| karhutla | `/data/berita.json` | `/data/peta_karhutla_kab.json` |
| gelombang | `/banjir/data/berita_pesisir.json` | tidak ada |
| permukiman | **[BAWAAN SEMENTARA]** `/data/berita.json` dengan `KATA_JENIS` permukiman sampai Q2 dijawab | tidak ada |

Dasar URL: `https://centurisk97.id`, bisa ditimpa env `CEK_KABAR_DASAR` untuk uji lokal.

## Arsip lokal

- `data/raw/dalops/berita_arsip/<berkas>.json`: `{diperbarui, artikel: [...]}` gabungan per `id`, artikel lebih tua dari 60 hari **[BAWAAN SEMENTARA]** dibuang. Ikut .gitignore (`data/raw/`).
- `data/raw/dalops/cek_arsip.jsonl`: `{hari, jenis, id, kab_kode, label, dasar, senyap}`, append-only. Baris `(hari, jenis, id)` yang sudah ada tidak ditulis ulang.

## Kinerja

Unduhan: paling banyak 8 berkas sekitar 1,5 MB per jalan. Pencocokan: indeks artikel per `kab_kode` sekali per berkas, lalu O(kejadian + artikel). Tidak ada panggilan jaringan di layar.

## Layar

`dalops.js` membaca `x.luar` dari JSON yang sudah dimuat; tidak ada fetch tambahan. `H.kelompok` membawa label kelompok dan bukti gabungan (ALGORITMA 5). `H.perluDitanya` memasukkan kelompok `mungkin_selesai` walau angkanya lengkap. `H.pesanWA(x, J, label)` memilih teks menurut label. Render label dan ringkasan mengikuti pola tab yang ada: dirender sekali, saring hanya mengganti `hidden` (INP).
