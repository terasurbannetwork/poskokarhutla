# Pembangun DOCX kajian BNPB

Naskah Markdown (`bangun/NASKAH-SPEK.md`) menjadi DOCX A4 tegak, PDF-nya, dan `<nama>.manifest.json`. Isi dibaca lewat
`bangun/kontrak/naskah.py`. Warna, ukuran huruf, margin, garis, dan jarak dibaca dari `tema.json`; kenop yang khusus
DOCX ada di blok `docx` tema itu.

```
cd data/kajian-bnpb
.venv/bin/python bangun/docx/bangun.py air      # naskah/air/*.md -> keluaran/air.docx, air.pdf, air.manifest.json
.venv/bin/python bangun/docx/uji.py             # uji diri dengan naskah/_contoh, lalu qa/periksa.py --semua
.venv/bin/python bangun/docx/uji.py --tanpa-qa  # tanpa gerbang QA repo (saat menyetel tampilan)
```

## Kebutuhan

| Apa | Untuk | Catatan |
| --- | --- | --- |
| Python 3.12+ dengan `python-docx`, `pymupdf`, `Pillow`, `lxml`, `spylls` | perakit, raster ikon, baca PDF, ejaan (T-10) | venv `data/kajian-bnpb/.venv`: `python3 -m venv .venv && .venv/bin/pip install python-docx python-pptx pymupdf Pillow lxml spylls` |
| LibreOffice (`soffice`) | ekspor PDF lewat makro `ekspor.bas` | dicari di `SOFFICE`, lalu `PATH`, lalu `/Applications/LibreOffice.app`; diuji 26.2 |
| poppler (`pdffonts`, `pdftoppm`, `pdftotext`, `pdfinfo`) | uji diri, PNG bukti, gerbang QA | `brew install poppler` |
| Node 22+ | `ikon.mjs` membaca glif dari `bangun/visual/ikon.mjs` | stdlib saja |
| Playwright + Chromium | hanya `uji.py` bila PNG contoh belum ada (`bangun/visual/render.mjs`) | setel `PLAYWRIGHT` dan `CHROME`, lihat `bangun/visual/README.md` |
| Roboto Regular dan Bold | ukur lebar kolom tabel | jalur di `tema.json` `font.berkas` |

Satu build sekali jalan: ekspor memakai satu profil LibreOffice (`keluaran/.lo-profil`), jadi dua build bersamaan saling
menimpa. Ikon dirender ulang tiap build (tidak ada cache basi).

| Berkas | Isi |
| --- | --- |
| `bangun.py` | perakit DOCX (python-docx + XML), ekspor PDF, titik tetap nomor halaman, manifest |
| `ekspor.bas` | makro LibreOffice: DOCX ke PDF, catatan kaki per bab, penanda Word jadi tujuan bernama PDF |
| `ikon.mjs` | glif registri `tema.json` dari `bangun/visual/ikon.mjs` (satu sumber dengan peta, grafik, deck) sebagai JSON |
| `uji.py` | rakit `naskah/_contoh`, assert atas DOCX dan PDF, uji negatif penjaga, PNG 60 dpi, gerbang `qa/periksa.py --semua` |

## Cara bidang TOC, SEQ, dan nomor bab terisi

python-docx tidak menghitung halaman. Pembangun merakit DOCX dengan bidang `TOC` (daftar isi 3 tingkat, `\c "Tabel"`,
`\c "Gambar"`, `\t "Judul Lampiran,1"`) yang hasil tersimpannya sudah berisi entri, lalu LibreOffice mengekspor PDF
dengan tujuan bernama dari penanda `_Toc*`. Halaman tiap penanda dibaca dengan PyMuPDF, diberi label romawi (bagian
depan, mulai `docx.romawi_mulai`) atau arab (mulai Bab 1), dan DOCX dirakit ulang sampai label dan jumlah halaman tidak
berubah. `docProps/app.xml` `Pages` = jumlah halaman PDF akhir (KEPUTUSAN P13).

Label "BAB n" berasal dari penomoran Heading 1 (`lvlText "BAB %1"`, `startOverride` = meta `bab`), bukan teks ketikan;
judul dibuka `w:br` sehingga label berdiri di atasnya. Word yang memperbarui bidang menyusun entri "BAB n<tab>JUDUL"
sendiri (TOC tanpa `\x` mengganti baris baru dengan spasi). Awalan keterangan "Tabel 2.1" memakai `STYLEREF 1 \n \t`
ditambah `SEQ Tabel \r 1` di objek pertama tiap bab (`STYLEREF \s` dibaca LibreOffice sebagai teks judul). Rujukan ke bab
berupa tautan ke judul, rujukan ke objek memakai `REF`.

Catatan kaki asli Word (`footnotes.xml`) bernomor ulang per seksi. LibreOffice tidak membaca `numRestart` dari DOCX, jadi
makro menyetel penomoran per bab sebelum ekspor.

## Bahasa, terbitan, dan metadata (Buku Pegangan L67, L70, L71)

- Semua gaya ber-`w:lang id-ID`, `w:autoHyphenation` aktif; pola `hyph_id_ID` dan kamus `id_ID` dari repositori kamus
  LibreOffice (folder id, disalin ke `bangun/kamus/id`, dikunci SHA-256 `KAMUS_SHA`) dipasang lewat `unopkg` ke profil
  ekspor `keluaran/.lo-profil` (`-env:UserInstallation`), bukan profil pemilik.
- Urutan bagian depan `KERANGKA.md` §3: sampul, kolofon (halaman keterangan terbitan: judul, penerbit, tahun, batas data,
  cara mengutip, dasar penyusunan, versi), Kata Pengantar, Daftar Isi, Ringkasan Eksekutif, Daftar Tabel/Gambar/
  Lampiran, Daftar Singkatan (hanya singkatan `data/glosarium.json` yang muncul di naskah). Sampul belakang navy: logo,
  alamat, judul, dan satu paragraf ringkas (tesis registri `tesis.<kajian>` + `tema.json` `kajian.<k>.cakupan_sampul`).
- Properti inti DOCX (judul, penerbit, subjek, kata kunci, bahasa id-ID); PDF membawa judul, subjek, kata kunci,
  pengarang, `/Lang (id-ID)`, dan bookmark dari judul bab dan subbab. `uji.py` memeriksa semuanya, termasuk kata
  terpenggal di PDF.
- Tiap build menulis `keluaran/qa/slop-<nama>.md` (vonis ambang anti-AI per bab) dan blok `pustaka` di manifest
  (bab -> kunci pustaka yang dirujuk, status naskah) untuk gerbang T-11.

## Penanda bagi gerbang QA dan uji diri

- `<nama>.manifest.json`: `angka` (manifest injeksi `naskah.py` + subtotal grup sebagai `turunan:`) untuk D-6 dan D-22;
  `halaman` (objek, hex, dan peran per halaman, dari penanda `_Obj*`) untuk D-24. Hex berperan ganda bermakna (kategori,
  skala, arah) pada satu halaman dilaporkan.
- Kartu skenario satu tabel luar berbaris tunggal `cantSplit` ber-`w:tblCaption "skenario"`; kartu angka
  `"kartu-angka"`; garis waktu `"garis-waktu"`. Kartu yang terbelah dari keterangan atau baris Sumber-nya mulai halaman
  baru di lintasan berikut; `uji.py` memeriksa ketiganya satu halaman.
- Tabel: penanda baris ke-4 dari akhir dan baris terakhir; `uji.py` memeriksa keduanya satu halaman (sisa >= 4 baris, B4).
  Tabel berpil, berwarna, atau berikon ditutup baris legenda 8 pt yang disusun dari penanda yang benar-benar dipakai.
- Latar sampul, pembatas lampiran, dan sampul belakang ada di kepala halaman seksinya, bukan gambar badan.

## Keputusan yang bisa disetel di tema.json

- Keterangan objek mengikuti `tipografi_docx.keterangan.pola` (`{label} {nomor} {judul}`, tanpa titik dua, L38).
- `docx.lebar_peta_kartu` (bawaan `tiga-kolom`), `docx.sel_tabel_kartu_mm` (bawaan separuh tinggi sel tabel biasa),
  `docx.tema_word` (slot warna tema Word ke token, menimpa `SLOT_WARNA`).
- Foto sampul dan data kolofon di `docx.sampul_foto` dan `docx.kolofon`; VERSI kolofon diturunkan dari status naskah.

## Status final

Naskah `status: final` menolak build bila foto sampul, gambar, peta skenario, atau `data/glosarium.json` belum ada, bila
glif belum digambar, bila keterangan tanpa tahun, atau bila bab tanpa `ringkasan-bab`. Draf memakai pengganti berarsir dan
mencetak peringatan. Selalu ditolak: tabel, kartu, garis waktu, atau matriks tanpa label keyakinan; gambar yang huruf
terkecilnya < 8 pt pada lebar pasangnya (dari manifest dan SVG `bangun/visual`); gambar lebih tinggi dari
`docx.tinggi_gambar_maks_cm` (tidak disusutkan diam-diam).

## Belum

- Pil tanpa spasi huruf: LibreOffice menggambar garis putih di run berspasi huruf yang bershading atau bergaris.
- Nomor subbab (1.1, 1.1.1) dan awalan RE/lampiran masih teks dari `naskah.py`, belum penomoran bertingkat Word.
- Belum dibuka di Microsoft Word: uji "buka, perbarui bidang, ekspor PDF, bandingkan jumlah halaman" belum dijalankan.
- LibreOffice mengabaikan `w:position` pada ikon sebaris, jadi ikon di PDF sedikit lebih tinggi dari teks.
