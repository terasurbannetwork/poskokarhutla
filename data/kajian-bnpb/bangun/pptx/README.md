# pptx

Pembangun deck PPTX dua kajian BNPB, gaya rumah BNPB (Buku Pegangan bab Selera presentasi). Spek JSON +
`tema.json` + `data/angka.json` + PNG peta masuk; PPTX dan PDF-nya (soffice) keluar. Pemilik berkas: `pipa-data`.

| Berkas | Isi |
| --- | --- |
| `deck.py` | pembangun: spek ke PPTX, `--pdf` lewat soffice berprofil terpisah, manifest `<keluar>.manifest.json` |
| `periksa.py` | gerbang mekanis PPTX dan PDF, cek basi `--serah`, laporan QA per deck `laporan()` (S39), dan uji diri berfixture |
| `ikon.py` | ikon garis dari registri `tema.json` `ikon` ke PNG 256 px; glif dari `bangun/visual/ikon.mjs` |
| `templat/templat-bnpb.pptx` | salinan deck pemilik 221026; master, tema Roboto, layout PUTIH/GELAP dipakai apa adanya, slide-nya dibuang |
| `contoh/spek-mitigasi.json` | spek contoh 8 slide, data nyata IRBI (lampiran terpecah jadi 2 halaman, PDF 9 halaman) |
| `contoh/spek-uji-air.json` | uji jenis lain: sampul gelap, tabel-peringkat, skenario, strategi-tiga-fase, rekomendasi dua slide |
| `contoh/peta_irbi.py` | peta dasar contoh kelas IRBI 2023 + manifest perender (pengganti sementara sampai `bangun/visual` punya PNG resmi) |
| `requirements.txt` | pustaka Python berpin |

## Membuat ulang dan memeriksa

```sh
cd data/kajian-bnpb/bangun/pptx
../../.venv/bin/python contoh/peta_irbi.py
../../.venv/bin/python deck.py contoh/spek-mitigasi.json keluaran/spek-mitigasi.pptx --pdf   # bangun + gerbang PPTX dan PDF
pdftoppm -r 60 -png keluaran/spek-mitigasi.pdf keluaran/spek-mitigasi                       # lalu baca tiap PNG
../../.venv/bin/python periksa.py --serah keluaran/spek-mitigasi.pptx                        # sebelum diserahkan: + cek basi
../../.venv/bin/python periksa.py      # bangun semua spek contoh + PDF, gerbang lolos, 33 fixture rusak ditolak
../../.venv/bin/python ikon.py         # semua glif registri terender, konsep asing ditolak
```

Tanpa argumen keluaran, nama berkas mengikuti `tema.json` `kajian.<k>.nama_berkas` (`Kajian Mitigasi Bencana Indonesia 231026.pptx`).
`keluaran/` diabaikan git.

## Ketergantungan

| Apa | Dipakai untuk | Dicari di |
| --- | --- | --- |
| Python 3.15 + `requirements.txt` | python-pptx, PyMuPDF (metrik, raster ikon, foto, PDF) | `data/kajian-bnpb/.venv`: `python3 -m venv .venv && .venv/bin/pip install -r bangun/pptx/requirements.txt` |
| LibreOffice 26.2 | PPTX ke PDF | `SOFFICE`, lalu `soffice`/`libreoffice` di PATH, lalu `/opt/homebrew/bin`, lalu `/Applications/LibreOffice.app` |
| poppler 26.10 (`pdffonts`, `pdftoppm`) | D-4 di PDF, D-39 ruang mati, PNG bukti | PATH |
| Node 22 | membaca `GLIF` dari `bangun/visual/ikon.mjs` (Lucide yang disalin ke repo, glif deck, glif khusus) | `NODE`, lalu PATH |
| Roboto Regular dan Bold | metrik pas judul dan muat baris; font sistem juga dipakai soffice | `ROBOTO_DIR`, lalu `tema.json` `font.berkas`, lalu `public/vendor/roboto`. Bila soffice tidak menemukan Roboto, pdffonts di `periksa.py` menolak PDF-nya |

Kunci cache ikon (`keluaran/ikon/<konsep>-<hex>-<hash glif>.png`) memuat isi glif, jadi glif yang berubah di komponen ikon
tidak memakai PNG lama.

## Gerbang ruang mati (D-39)

`periksa()` merender tiap halaman PDF berkaki (slide isi) dengan `pdftoppm` dan mengukur ruang mati di zona isi: blok
1% x 1% yang seragam sewarna latar dan sekelilingnya juga kosong. Batas 25% (`RUANG_MATI_MAKS`); algoritmanya sama
dengan `rupa.py` skill ppt-konsultan. Vonis pemilik 26 Okt 2026 atas empat deck Grand Design: huruf kecil boleh,
ruang kosong tidak; panel yang direntangkan setinggi slide padahal isinya pendek diisi data atau pita bawah, bukan
diregangkan. Slide `rekomendasi` lanjutan dengan sedikit baris memakai kunci `pita` (sama dengan `temuan`). Fixture
uji diri membangun lanjutan rekomendasi tanpa pita dan harus ditolak D-39.

## Menyetel tampilan

Semua warna, ukuran huruf, margin, dan jarak ada di `tema.json`: `slide.tipografi` (ukuran huruf per peran),
`slide.komponen` (geometri per komponen: bingkai, kartu, grup, panel, pita, tabel, grafik, kesimpulan, sampul,
penutup, pembatas, temuan, peta, skenario), `slide.layout.gelap_untuk` (slide berlatar navy). Warna dirujuk dengan nama
token. Peran warna per halaman ikut PEDOMAN B1.5 dan B1.8: halaman yang menampilkan kategori atau ramp api/basah memakai
`warna.arah.berkeluarga` (teks-2) untuk arah dan menulis kata naik/turun; bila api tampil, angka judul memakai
`judul_temuan.warna_angka_berkeluarga` (navy). Mesin mengenalinya sendiri dari warna yang tergambar (lintasan pertama di
slide buangan), spek tidak perlu menyebutnya. Sesudah menyunting: `python3 ../kontrak/tema.py` lalu `periksa.py`.

## Format spek

```json
{"kajian": "mitigasi", "tanggal": "2026-10-23", "cut_off": "18 Okt 2026", "pesan_kunci": "...",
 "slide": [{"jenis": "...", "pesan": "...", "jenis_slide": "peta", "judul_bentuk": "temuan", ...}]}
```

**Garis besar wajib** (Buku Pegangan S34, S35, S7; `bangun/NASKAH-SPEK.md` bagian 17): `pesan_kunci` di akar, dan di
tiap slide selain sampul, penutup, dan pembatas: `pesan`, `jenis_slide` dari daftar tertutup S35 (`navigasi`, `peta`,
`grafik`, `tabel`, `matriks`, `kartu-skenario`, `panel`, `rekomendasi`, `lampiran`), dan `judul_bentuk` (`temuan` atau
`deskriptif`). Dua slide isi berurutan tidak berjenis sama kecuali lampiran atau `seri` sama (seri berchip, profil
wilayah, lanjutan). Judul `temuan` wajib bertoken angka; judul berkode bagian A sampai D wajib `temuan`; navigasi dan
lampiran `deskriptif`. Daftar butir paling banyak 6 (S38).

**Kunci opsional di akar:** `judul_dokumen`, `subjek_dokumen` (properti inti PPTX; bawaan judul dan subjudul kajian),
`horizon_label` {kode: label chip waktu}, `judul_sampul_maks_baris` dan `judul_sampul_pt`, `pil_draf` (`LABEL|nilai`).
Di `skenario`: `label_jenis` (lingkup ancaman di pita kepala), `kemungkinan_keyakinan` (pil di samping KEMUNGKINAN DALAM
LIMA TAHUN), `kebijakan.legenda` (keterangan batang). Di slide `rekomendasi`: `sumber` memasang baris Sumber. Kunci
ini dulu ditambal `keluaran/update-231026/bangun-update.py`, kini bagian dari mesin.

Teks spek memakai token naskah: `{{angka:kunci|opsi}}` (registri `data/angka.json`, opsi sama dengan NASKAH-SPEK
bagian 8), `{{tempat:Jawa Tengah}}` (biru lembaga di judul), `{{sorot:(7 Hari)}}` (oranye di judul), `**tebal**`.
Angka yang diketik langsung ditolak (D-22), kecuali tahun, rentang tahun, kode temuan/lampiran, "ke-7", "100 hari".
Angka registri dari baris berlabel ilustrasi (`utama=false` atau catatan "hanya ilustrasi") ditolak; pakai pasangan utama.
Di judul, angka oranye (navy bila api tampil); di isi, angka tebal. Baris "Sumber:" disusun otomatis dari angka yang tampil;
isi `"sumber"` di slide bila gabungannya lebih dari satu baris, atau `false` untuk tanpa baris sumber.

| Jenis | Isi wajib | Opsional |
| --- | --- | --- |
| `sampul` | | `foto` (atribusi dari `public/img/kredit.json` atau `tema.json` `docx.sampul_foto`), `kepada`, `kredit`, `layout: "gelap"` |
| `kartu-angka` | `judul`; halaman Pesan Kunci: `tesis`, `temuan` [{kode "Temuan B.1", keyakinan, ikon, teks}] | `grup`, `judul_panel`, `kolom`, `pita`, `cut_off`, `subjudul` |
| `temuan-grafik` | `judul`, `grafik` {judul_panel, judul, keluarga, data} | `panel`, `grup`, `pita`, `rasio`, `cut_off` |
| `temuan-peta` | `judul`, `peta` {png, legenda, keyakinan, sumber}; PNG wajib punya manifest perender `<png>.json` | `penanda` [{x, y, teks}] pecahan lebar/tinggi PNG, `panel`, `grup`, `pita` |
| `tabel-peringkat` | `judul`, `tabel` {judul_panel, data} | `peringkat`, `total`, `panel`, `grup`, `pita` |
| `skenario` | `judul`, `skenario` {jenis, judul, keyakinan, kemungkinan, kerusakan, kebijakan, respons, pemulihan, lembaga} | `sumber` |
| `strategi-tiga-fase` | `judul`, `fase` {prabencana, tanggap-darurat, pascabencana: 3 sampai 5 [{kode, aksi}]} | `pita`; `waktu` dan `lembaga` diturunkan dari rekomendasi berkode sama |
| `rekomendasi` | `judul`, `rekomendasi` [{kode, jenis, langkah, waktu, status, rincian, lembaga}] | boleh lebih dari satu slide; kode unik se-deck |
| `kesimpulan` | `judul`, `kartu` 8 [{label, ikon, warna, judul, isi}] | `arahan` {label, ikon, teks} |
| `penutup` | | `foto`, `teks` |
| `pembatas-lampiran` | `kelompok` {"A": "judul kelompok"} | `subjudul`; butir dan halaman dihitung dari slide lampiran sesudahnya |
| `lampiran-tabel` | `kode`, `judul`, `data` | `judul_daftar`, `maks_baris`; tabel panjang dipecah rata ke "(lanjutan 2/3)" |

Komponen bersama: `grup` = [{pil, nada (data, perhatian, bmkg), ikon, kartu [{nilai, label, ikon, warna}]}];
`pita` = {label, nada (aksi, hujan, data), kolom 3 sampai 4 [{ikon, judul, isi}]}; `panel` = {judul, ikon, nada,
salah satu atau gabungan `data`, `daftar`, `temuan`}. `ikon` = kunci registri `tema.json` `ikon`; `warna` = token.
Kartu yang nilainya bertoken `|arah` diwarnai arah halaman itu, tanpa melihat `warna`.

`data` membaca CSV seperti tabel csv naskah: `csv` (relatif ke `data/kajian-bnpb/`), `saring` (`k=v; k2!=v2`),
`urut` (`-kolom` menurun), `batas`, `kolom` [{nama, kepala, fmt, warna, ikon}], `keyakinan`, `sumber`, `sorot`
(label baris yang diblok), `seri: "kolom"` untuk grafik dari satu baris. `fmt` = desimal dan bendera naskah
(`2`, `1|persen|arah`, `ringkas`, `rupiah`); `arah` menggambar segitiga vektor. Label data diganti ke istilah baku dari
`tema.json` `kosakata.istilah.ganti`.

## Yang ditolak saat membangun

Spek tanpa garis besar (di atas), em dash, titik tengah, elipsis, segitiga dan panah karakter, emoji, istilah terlarang (`kosakata.istilah.terlarang`),
angka diketik, token atau kunci angka tak dikenal, angka dari baris ilustrasi, judul slide lebih dari dua baris pada 19 pt,
teks yang tidak muat di kotaknya, kartu terlalu sempit, kesimpulan bukan 8 kartu, fase di luar 3 sampai 5 aksi, kode aksi
yang tidak ada di matriks rekomendasi atau waktu/pemimpinnya berbeda, kode temuan bukan "Temuan B.1", temuan tanpa
keyakinan atau berkeyakinan lebih kuat dari angka terlemahnya, Pesan Kunci tanpa tesis, kartu berlabel kelas indeks
(Rendah/Sedang/Tinggi) yang tidak berwarna kelas `skala.irbi`, keyakinan di luar lima label, ikon di luar registri, warna
di luar token, foto tanpa atribusi atau berlisensi NC/ND, pembatas Lampiran tanpa slide lampiran, peta tanpa manifest
perender atau dengan masukan berubah sesudah dirender, label peta yang keluar dari peta, tumpang, atau menutup daratan
berdata lebih dari `komponen.peta.label_darat_maks`.

## Laporan QA per deck (S39)

`deck.py --pdf` dan `periksa.py --serah` menulis `keluaran/qa/deck-<nama>.md` (akar `data/kajian-bnpb/keluaran/qa/`)
dan gagal bila vonisnya GAGAL. Kelompok Font (pdffonts, D-4, D-5, D-23), Ikon (gambar raster di XML dicocokkan dengan
catatan generator: hanya logo, foto, peta dasar, ikon registri; S37), Tata letak (gerbang mesin deck, `qa/periksa.py`
T-2, D-17, T-6, T-7, D-14, D-9, D-16, D-22, D-6, garis besar S34, visual tiap slide S36, variasi S35, judul tidak kembar
S6, paling banyak 6 butir S38), dan Anti-AI (D-1 sampai D-3, D-10, T-4, T-8 vonis ambang per slide tanpa pengecualian
tiga-serangkai). Kosakata vonis LOLOS dan GAGAL seperti `qa/periksa.py`; tabel garis besar di akhir laporan dibaca
berurutan sebagai ringkasan (S6). Properti inti PPTX (L71): judul, subjek, penerbit BNPB, kata kunci kajian, bahasa
id-ID, pesan kunci di komentar.

## Yang diperiksa sesudah membangun (`periksa.py`)

Dari XML slide: D-1, D-2, D-3, D-10, D-4 (huruf dan font tema), batas huruf 6 pt, D-9 (hanya `srgbClr` dari daftar putih;
`schemeClr`/`prstClr`/`sysClr` ditolak), footer, nomor halaman persis di bentuk pojok kanan footer, garis bingkai, dan D-22
(tiap angka di `<a:t>` tercatat di manifest angka bersumber atau sebagai teks struktur mesin: nomor, kode, tanggal, label
kosakata, baris Sumber). Dari manifest: D-24 (satu hex satu peran per halaman, arah dan angka judul per keluarga halaman)
dan D-8 (legenda, sumber batas, sistem referensi, catatan batas tidak resmi, label >= 8 pt tanpa irisan). Dari PDF: jumlah
halaman, `pdffonts` hanya Roboto (D-4), teks tanpa em dash/titik tengah/elipsis, dan jumlah baris judul diukur per garis dasar
di kotak judul (D-17). `--serah` menambah cek basi: hash tiap masukan (spek, tema, registri, CSV, PNG peta, foto, templat)
dibandingkan dengan manifest.
