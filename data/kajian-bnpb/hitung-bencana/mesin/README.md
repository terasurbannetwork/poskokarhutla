# Mesin dokumen kajian (naskah Markdown -> DOCX dan PDF)

Meniru mesin A4 Laporan Bencana bulanan (`data/laporan-bnpb/bulanan/2026-10/a4/`): HTML dicetak Chromium
menjadi PDF, DOCX dibangun python-docx, gaya navy 051C2C, oranye D9600B, Roboto, logo BNPB dan KRIS.
Tidak ada berkas di `data/laporan-bnpb/**` yang diubah.

## Satu perintah

```
set PYTHONUTF8=1
py data/kajian-bnpb/hitung-bencana/mesin/bangun.py
```

Urutannya: `gambar.mjs` (PNG ke `mesin/gbr/`) -> HTML -> `cetak.mjs` (PDF, dua sampai tiga lintasan sampai nomor
halaman daftar isi stabil) -> gabung sampul + isi -> DOCX. Keluaran di `keluaran/`:
`Kajian Penghitungan dan Klasifikasi Kejadian Bencana <ddmmyy>.docx` dan `.pdf` (tanggal = hari bangun).
Waktu sekitar 2 menit untuk seluruh naskah.

Opsi: `--tanpa-gambar` (pakai PNG yang ada), `--hanya <berkas.md> ...` (uji sebagian, keluaran diberi akhiran
"(uji)"), `--word` (setelah DOCX jadi, Word COM memperbarui daftar isi dan bidang lalu menyimpan; pakai
`perbarui_word.ps1`; hanya bila Microsoft Word terpasang), `--urutan <berkas.json>` (bawaan `urutan.json`).

## Urutan alternatif (ringkasan)

`--urutan urutan-ringkas.json` membaca JSON lain di `mesin/`. Kunci opsional: `folder` (folder naskah relatif ke `mesin/`,
mis. `../naskah-ringkas`), `judul`, `anak_judul`, `label` (sampul, kepala halaman, metadata), `nama_keluaran` (awal nama berkas
keluaran), dan `berkas` (daftar naskah berurutan). Tanpa kunci itu dipakai nilai kajian penuh. Daftar `berkas` kosong
menghentikan bangun dengan "tidak ada naskah". Catatan akhir bab dan semua aturan di bawah berlaku sama.

## Tautan dan catatan

- Daftar isi bisa diklik. PDF: judul `#` dan `##` punya `id`, entri daftar isi tautan internal; Chromium memberi tujuan
  bernama, jadi `bangun.py` memasang ulang tautan sebagai tautan halaman setelah sampul digabung (dicek `page.get_links()`).
  DOCX: tiap judul 1-2 diberi bookmark `_Toc9...`, hasil antara daftar isi berupa `w:hyperlink w:anchor` ke bookmark itu
  (di dalam bidang `TOC \h`), sehingga klik bekerja sebelum dan sesudah Word memperbarui bidang. Gaya tanpa garis bawah.
- `catatan.py` memproses naskah sebelum disajikan: kurung yang isinya hanya URL atau kode sebaris berupa path berkas
  (berakhiran `.json .py .md ...` atau memuat `/`), dipisah koma, titik koma, "dan", diganti angka catatan; URL atau path
  telanjang di tengah kalimat juga; kurung bercampur teks dipertahankan teksnya, URL-nya jadi catatan. Kode sebaris
  lain (`is_bencana`) tetap di teks. Berlaku untuk paragraf, butir, sel tabel, kutipan, kotak. Tidak untuk judul,
  keterangan "Sumber:" di bawah tabel/gambar, tautan `[teks](url)`, dan blok kode.
- Dikecualikan: `pustaka.md`, `lampiran-g.md` (daftar sumber), dan kolom "Sumber" tabel di `lampiran-c.md`
  (URL dipisah `;` per sel; dijadikan catatan akan memecah tabel).
- PDF/HTML: catatan akhir bab. Angka superskrip oranye bisa diklik ke daftar "Catatan" di akhir berkas naskah itu
  (huruf monospace kecil, URL dipatahkan), nomor catatan bisa diklik kembali; nomor mulai dari 1 per berkas.
- DOCX: catatan kaki Word asli (`word/footnotes.xml`, gaya Footnote Text 8 pt), nomor berurutan sepanjang dokumen.
- Kotak "Singkatan dan istilah" tidak lagi dicetak: paragraf yang diawali kalimat itu dibuang dengan PERINGATAN.
- Sampul tidak lagi memuat blok "Disampaikan kepada" (`KEPADA` di `konst.py` tidak dipakai).

## Ketergantungan

Python 3.12+ dengan `python-docx`, `lxml`, `Pillow`, `PyMuPDF` (pakai `py`, bukan `python` biasa, di mesin ini);
Node dengan playwright-core lewat `data/laporan-bnpb/generator/pw.mjs`; font Roboto, logo BNPB di skill
`ppt-konsultan` (`~/.claude/skills/ppt-konsultan/bnpb/assets/`); logo KRIS di
`data/laporan-bnpb/generator/sampul/media/kris-logo.png`. Roboto harus terpasang di komputer pembaca DOCX.

## Berkas

| Berkas | Fungsi |
| --- | --- |
| `bangun.py` | Orkestrator. Membaca `urutan.json`, melewati berkas yang belum ada dengan peringatan |
| `naskah.py` | Pembaca Markdown menjadi blok (satu bentuk untuk HTML dan DOCX) |
| `html_tulis.py`, `gaya.css` | HTML sampul dan isi, daftar isi bernomor halaman nyata (penanda tak terlihat `ZQ0001` dicari di PDF) |
| `word_tulis.py` | DOCX: sampul (foto digabung logo lewat Pillow), bidang TOC Word, judul Heading 1 sampai 4, kepala dan kaki |
| `gambar.mjs` | Pohon keputusan dan grafik jadi PNG 3x |
| `cetak.mjs` | PDF lewat Chromium (sampul tanpa kepala/kaki, isi dengan logo dan nomor halaman) |
| `perbarui_word.ps1` | Perbarui TOC lewat Word COM |
| `_kerja/` | Berkas antara (html, pdf bagian, toc.json); boleh dihapus |
| `gbr/` | PNG hasil render; jangan disunting tangan |

## Sampul

Label "KAJIAN BNPB", judul, anak judul, "Disusun oleh: Tim Ahli dan Tim Sus IT BNPB",
"Jakarta, <tanggal bangun>", logo BNPB dan KRIS. Foto: `h-1417.jpg` dari aset skill `ppt-konsultan`
(`bnpb/assets/proyek-bulanan/foto/web/`), banjir merendam permukiman, laporan situasi harian BNPB 17 Oktober 2026,
berstatus "dikutip dari pemberitaan" di `kredit.json` aset itu (ganti `FOTO_SAMPUL` di `konst.py` bila perlu
foto berlisensi bersih).

## Konvensi naskah

Dasar: `../riset/KONVENSI-NASKAH.md`. Tambahan yang didukung mesin:

- `# BAB n Judul` dan `# Lampiran X, kelompok Y: Judul` jadi kotak judul berlabel (BAB n / LAMPIRAN X); judul lain
  (Penutup, Daftar Pustaka, Ringkasan Eksekutif) jadi kotak judul tanpa label. Tiap `#` memulai halaman baru.
- Daftar isi memuat tingkat `#` dan `##`. `###` dan `####` tidak masuk daftar isi.
- `### P-xx Nama` memulai blok paradoks seragam (kepala navy dengan kode oranye, baris "**Kelompok:** ..." berlatar
  krem, butir 1 sampai 7 dengan bilah kiri oranye). Butir bernomor dicetak dengan nomor sumbernya, jadi tabel boleh
  menyela butir 5 dan 6 tetap bernomor 6. Sub-butir `- ` hanya satu tingkat di bawah butir.
- Paragraf diawali "Status:" sebelum `##` pertama dibuang. Paragraf "Singkatan dan istilah ..." dibuang (lihat Tautan dan catatan).
- Tautan `[teks](url)` dicetak sebagai `teks` saja; tulis URL telanjang bila URL harus tampak.
- Kode sebaris pakai backtik; blok kode pakai pagar tiga backtik. Kutipan pakai `>`. `---` diabaikan.
- Escape `\*`, `\|`, backtik dan lain-lain didukung. HTML mentah tidak didukung (kecuali `<br>` di sel tabel di DOCX).
- `:::tentang`, `:::metode`, `:::kalimat`, `:::kartu` (`nilai | label`, 1 sampai 6 kartu), `:::temuan`, `:::keputusan`,
  `:::aksi` (judul `####`; tiga judul = tiga kolom, yang ketiga oranye) seperti di KONVENSI-NASKAH.
- Keterangan tabel: baris `Tabel n.m. Judul` tepat sebelum tabel (boleh ada satu baris kosong), `Sumber: ...` tepat sesudahnya.
  Gambar: `![Gambar n.m. Judul](gbr/nama.png)` lalu `Sumber: ...`. Nama PNG = nama spesifikasi (tanpa `.pohon`).
- Lebar kolom tabel dihitung otomatis dari panjang isi sel; kolom angka (rata kanan lewat `---:`) dibuat sempit.
  Tabel 6 kolom atau lebih otomatis memakai huruf lebih kecil. Kepala tabel selalu kapital rata tengah dan berulang.

## Gambar (`mesin/gambar/*.json`)

Pohon keputusan (`nama.pohon.json`): `simpul` (`id`, `tanya`, `ya`, `tidak`; tujuan boleh simpul lain atau ujung),
`ujung` (id -> teks, atau `{"teks":..., "warna":"oranye|navy|biru|emas|slate|merah|#hex"}`), `akar` opsional.
Lompatan lebih dari satu lapis digambar lewat sisi luar. Teks `judul` tidak dicetak ke PNG (keterangan ada di Markdown).

Grafik (`nama.json`):

```
{"jenis": "batang" | "batang-mendatar" | "tumpuk" (atau "bertumpuk") | "garis",
 "kategori": [...]  (alias "sumbu_x"),
 "seri": [{"nama": "...", "nilai": [...], "warna": "navy|oranye|biru|emas|slate|merah|abu|#hex"}],
 "satuan": "%" (<= 2 huruf: menempel pada nilai; lebih panjang: judul sumbu Y) , "sumbu_y": "...",
 "tampilkan_nilai": true, "tinggi": 360, "lebar": 760,
 "garis_acuan": {"nilai": 3000, "label": "..."},
 "penanda": [{"x": "2013", "teks": "..."}]   garis patah vertikal bernomor di kategori x, keterangan di bawah grafik
 "catatan": "teks kecil di bawah grafik"}
```

`judul` dan `sumber` di JSON tidak digambar; keduanya ditulis di Markdown. Contoh: `gambar/contoh-*.json`.

## Keterbatasan

- DOCX tidak persis halaman PDF: Word memuat lebih banyak halaman (tabel dan paragraf lebih longgar). Nomor halaman
  daftar isi DOCX diisi dari PDF lalu diperbarui Word (`--word`, atau klik kanan, Update Field).
- Roboto harus terpasang untuk DOCX. Pohon dan grafik di DOCX berupa gambar.
- Tabel sangat lebar (8 kolom atau lebih) rapat; pertimbangkan memecah tabel.
