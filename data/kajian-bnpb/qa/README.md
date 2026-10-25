# qa

Gerbang QA mekanis dua kajian BNPB (PEDOMAN-DESAIN.md bagian D). Stdlib Python, poppler
(`pdftotext`, `pdffonts`, `pdfinfo`), `soffice` untuk render ulang DOCX, dan `node` untuk gerbang visual
(`bangun/visual`). Pemilik: `pipa-data`.

| Berkas | Isi |
| --- | --- |
| `periksa.py` | gerbang D-1 sampai D-32 yang bisa dimekaniskan dan T-1 sampai T-11; keluar 1 bila ada yang gagal |
| `slop.py` | detektor AI slop (S-1 sampai S-43) dan vonis ambang anti-AI per bab (`--ambang --laporan`), dibaca T-4 dan T-8 |
| `uji.py` | uji diri: fixture bersih lolos `--ketat`, satu fixture negatif per sub-aturan, fixture positif, regresi |
| `cakupan.json` | registri `diuji` (kode -> sub-aturan -> fixture), `positif`, `dikecualikan` (dengan alasan), `antre` (utang) |
| `regresi/` | `contoh.docx` + PDF: DOCX nyata pertama dari `bangun/docx` (23 Okt 2026), penjaga positif palsu |
| `fixtures/` | dibuat ulang oleh `uji.py` tiap jalan |

```sh
cd data/kajian-bnpb
python3 qa/uji.py                                   # sekitar 25 detik tanpa beban lain, enam render soffice
python3 qa/periksa.py --docx K.docx --pdf K.pdf --pptx D.pptx --pptx-pdf D.pdf --visual DIR --ketat
```

Bawaan berhenti di gerbang gagal pertama; `--semua` menjalankan semuanya. `--ketat` menghitung LEWAT (masukan
tidak ada, mis. manifest) sebagai gagal: pakai untuk build kirim. `--berkas-saja` menandai gerbang untuk jenis berkas
yang tidak diberikan sama sekali sebagai tidak berlaku (build satu jenis berkas). `--lain` menambah SVG, HTML, CSS,
atau JSON untuk D-1 sampai D-4, D-9, D-10, D-23; teks SVG dan HTML juga diperiksa D-16.

## Gerbang naskah per bab (T-8 sampai T-11)

| Kode | Memeriksa | Sumber |
| --- | --- | --- |
| T-8 | vonis ambang anti-AI tiap bab DOCX dan tiap slide LULUS (tiga-serangkai gaya, titik dua, hedging, pembuka klise, kata terlarang khas AI; em dash di D-1) | `qa/slop.py` `AMBANG_KODE`, Buku Pegangan Angka & copy |
| T-9 | singkatan `data/glosarium.json` dieja pada kemunculan pertama di prosa tiap BAB (kutipan pustaka tidak dihitung); `varian_konteks` (nama K/L lama tanpa "kini"/"dahulu", "Karhutla" di tengah kalimat) | L66 |
| T-10 | kata prosa, judul, dan keterangan tiap bab dikenal kamus `bangun/kamus/id/id_ID` lewat `spylls` (venv), glosarium (`istilah`, `kata_tambahan`, `singkatan`), atau nama diri; singkatan kapital wajib terdaftar | L67 |
| T-11 | blok `pustaka` manifest DOCX: kunci ada di `pustaka.json`; untuk naskah final, sumber berbeda per bab, per kajian, dan porsi resmi atau primer memenuhi `tema.json` `qa.pustaka` | L65 |

`data/glosarium.json` juga menggantikan daftar istilah terlarang D-10 (`terlarang`). Kata baru yang ditolak T-10 tapi
baku ditambahkan ke `kata_tambahan` sesudah dicek ke KBBI; istilah kajian ke `istilah` dengan definisi dan sumbernya.

## Kenop di tema.json

Ambang dan daftar gerbang dibaca dari `tema.json`, tidak ditulis di kode: huruf terkecil, baris judul, lebar isi,
batas halaman, hex sah dan terlarang, label keyakinan dan tampilan pilnya (`kosakata.keyakinan`), istilah terlarang
(`kosakata.istilah.terlarang`, diganti `data/glosarium.json` bila ada), kepala dan kaki (`header_footer`,
`garis_pt`), kerangka slide (`slide`). Blok `qa` khusus gerbang:

| Kunci | Dipakai |
| --- | --- |
| `gaya_kapital_boleh` | D-11: gaya paragraf yang boleh kapital penuh (label pita, kepala kolom, pil, judul bagian depan) |
| `gaya_pustaka` | D-19: gaya entri Daftar Pustaka; bagian pustaka berhenti di paragraf berisi pertama bergaya lain |
| `kolom_tanpa_rata_kanan` | D-20, D-22: kepala kolom NO, peringkat, kode (rata tengah sah, angka 1 sampai 6 digit bukan ketikan) |
| `kata_cacah` | D-22: angka empat digit yang diikuti kata ini adalah hitungan ("1987 kejadian"), bukan tahun |
| `cut_off_teks` | T-6: teks pil batas data |
| `panel_tinggi_min_pt`, `jarak_tepi_bawah_panel_pt`, `irisan_toleransi_pt` | T-7 |
| `logo_toleransi_mm` | T-5: tinggi logo kepala terhadap `objek.logo_header_tinggi_mm` |
| `pustaka` | T-11: `bab_min`, `kajian_min` per kajian, `resmi_primer_min_persen` (L65) |

## Kontrak dengan pembangun

Gerbang membaca struktur berikut; pembangun yang menyimpang ditolak.

- **Manifest angka, satu nama**: `<stem>.manifest.json` di samping berkasnya (`K.docx` -> `K.manifest.json`,
  `D.pptx` -> `D.manifest.json`). DOCX dan PPTX satu kajian tidak boleh berbagi stem, karena PDF keduanya pun akan
  bertabrakan. Isinya objek dengan kunci `angka`: daftar entri `Konteks.manifest` (`kunci`, `tampil`, `nilai`,
  `rendah`, `tinggi`, `opsi`, `naskah`, `keyakinan`, `sumber`). Kunci lain (`spek`, `slide`, `halaman`, `catatan`)
  dibiarkan. Kunci `csv:<berkas>#<kolom>` dicocokkan ke CSV; kunci registri ke `data/angka.json`; kunci
  `turunan:<asal>#<nama>` (angka yang dihitung pembangun, mis. "turun 42%") wajib ber-`sumber`, boleh ber-`dari`
  (daftar kunci asal) yang wajib ada di manifest yang sama. Dipakai D-6 dan D-22 (DOCX dan PPTX).
- **Keterangan**: gaya bernama `caption`, nomor dari bidang `SEQ` (tidak diketik, D-13), teks diawali `Gambar n.m` atau
  `Tabel n.m`, memuat tahun atau periode. Objek tepat di bawahnya; paragraf pertama sesudah objek diawali `Sumber:`.
  Legenda tabel di baris terakhir tabel. Format label (Bold navy) ditaruh di gaya paragraf, karena LibreOffice
  merender ulang hasil SEQ dan PAGE tanpa format run.
- **Kotak majemuk**: tabel pertama kartu skenario diberi `w:tblCaption` `skenario`, grup kartu angka `kartu-angka`.
  Kartu skenario yang berketerangan menjadi satu objek sampai baris `Sumber:` kakinya (tabel, gambar, label pita di
  dalamnya ikut); tabel berbaris kepala di dalam kartu diperiksa D-20 tanpa kewajiban `w:tblHeader` pada bingkainya.
- **Tabel data**: baris kepala `w:tblHeader`, isi kepala navy (lampiran: tanpa isi), angka rata kanan kecuali kolom
  `qa.kolom_tanpa_rata_kanan`, tanpa garis vertikal, baris Jumlah navy. Label keyakinan berupa pola
  `Keyakinan: <label>`, atau pil/sel yang teksnya persis satu label `kosakata.keyakinan`; tampilan pil (isi, garis,
  warna teks) diperiksa terhadap entri label itu (C6.2).
- **Indeks**: bidang TOC `\o` untuk Daftar Isi, `\c "Tabel"` dan `\c "Gambar"`, hasil terisi, `w:updateFields` aktif.
  Entri bergaya `toc 1` (bab), `toc 2` (n.m), `toc 3` (n.m.k). Nomor halaman tiap entri dicocokkan ke halaman tempat
  judulnya tercetak di PDF (nomor dibaca dari kaki; halaman tanpa nomor melanjutkan nomor sebelumnya).
- **Penomoran halaman**: seksi yang kepala dan kakinya tanpa teks (sampul, pembatas Lampiran, sampul belakang;
  gambar latar di kepala tidak dihitung) tanpa nomor. Seksi bernomor sebelum BAB 1 romawi kecil; seksi tanpa
  `footerReference` mewarisi kaki seksi sebelumnya. Seksi BAB 1 `w:pgNumType w:start="1"` desimal.
- **Judul**: gaya `heading 1..3`. Nomor bab boleh dari penomoran otomatis (`numbering.xml`, `lvlText` "BAB %1") atau
  diketik "BAB 1" dengan `w:br`; keduanya dibaca sebagai "BAB 1 PENDAHULUAN". Daftar Pustaka di bawah judul
  `DAFTAR PUSTAKA` (gaya `qa.gaya_pustaka`); Lampiran Atribusi di bawah judul tingkat 1 yang memuat kata ATRIBUSI.
- **Kepala dan kaki (T-5)**: kepala memuat logo setinggi `objek.logo_header_tinggi_mm`, judul pendek Bold, baris
  `header_footer.header.baris2`, garis tegak `garis_pt.aksen_header`, garis bawah `garis_pt.header`. Kaki memuat dua
  baris `header_footer.footer.baris`, garis atas `garis_pt.footer`, nomor dari bidang PAGE 9 pt Bold rata kanan.
- **Slide (T-6, T-7)**: slide isi (yang memuat footer) punya garis `slide.garis` di y95 dan y507,6, nomor halaman rata
  kanan di pita footer, dan pil `qa.cut_off_teks` bila memuat tabel atau angka CSV manifest; kotak judul selebar
  `judul_kotak.lebar_dengan_pil_pt` bila ada pil. Teks yang tampak tidak beririsan; isi berjarak
  `qa.jarak_tepi_bawah_panel_pt` dari tepi bawah panel.
- **Gambar (D-8, D-21, D-24, D-28)**: folder `--visual` keluaran `bangun/visual/render.mjs` (SVG + manifest).

## Memasang di build

Pembangun memanggil satu pemeriksa ini di akhir build, bukan pemeriksa sendiri:

```python
sys.path.insert(0, str(AKAR / 'qa')); import periksa
periksa.wajib_lolos(docx=keluar, pdf=keluar.with_suffix('.pdf'))          # bangun/docx
periksa.wajib_lolos(pptx=keluar, pptx_pdf=keluar.with_suffix('.pdf'))     # bangun/pptx
```

`wajib_lolos` menjalankan semua gerbang dengan `--ketat --berkas-saja` dan menghentikan build (SystemExit) bila ada
yang gagal; manifest yang hilang tetap gagal.

## Batas yang disengaja

- Baris judul dan keterangan, luas teks slide, dan tepi bawah teks diperkirakan dari lebar glif Roboto (cmap dan hmtx
  dibaca langsung dari TTF) dan 1,2 x ukuran huruf per baris, bukan dari render; selisih satu kata bisa lolos.
- D-22 memakai daftar pengecualian (tahun, tanggal, jam WIB, nomor objek, regulasi, halaman, versi lisensi, nomor
  standar, sistem referensi peta, kode rekomendasi "01", nomor halaman penunjuk lampiran "A1. ... 8–9"). Kalimat nyata
  baru mungkin menambah pola; tambah ke `RE_D22_KECUALI` atau `tema.json` `qa` berikut fixture positifnya.
- D-19 mencocokkan kutipan APA 7 dengan pola teks; singkatan dipetakan hanya ke pengarang pustaka yang menjadi
  akhiran teks sebelum singkatan itu.
- `cakupan.json` `antre` mencatat yang belum bergerbang, termasuk sub-aturan di dalam gerbang yang sudah jalan.
