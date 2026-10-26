---
name: deck-bnpb
description: Pedoman final dan mesin lengkap untuk membuat deck presentasi (PPTX + PDF) Badan Nasional Penanggulangan Bencana dengan gaya rumah BNPB, setara deck Grand Design kajian BNPB Oktober 2026. Pakai skill ini SETIAP KALI diminta membuat, mengubah, atau memeriksa slide untuk BNPB atau Kepala BNPB, termasuk paparan, PPT, deck, bahan tayang, laporan kejadian bencana harian, laporan penanganan pengendalian karhutla, paparan wilayah atau provinsi, paparan kepada Presiden, deck kajian atau Grand Design, deck pembaruan (update) kajian, atau "bikin slide" bertema bencana Indonesia, walau kata BNPB tidak disebut tetapi isinya penanggulangan bencana pemerintah. Memuat aturan pemilik S1 sampai S39, angka dan copy, anti-slop, pembangun deck.py di templat BNPB dengan token angka dari registri, gerbang QA sampai 0 GAGAL, dan contoh spek nyata.
---

# Deck BNPB

Skill ini membuat deck BNPB yang lolos selera pemilik dan gerbang mekanis yang sama dengan deck kajian BNPB Oktober 2026.
Satu gaya rumah untuk semua deck: kerangka BNPB (Roboto, layout PUTIH dan GELAP, garis, logo, footer). Deck pihak lain
hanya sumber isi. Bahasa skill dan deck: Indonesia formal dan lugas.

Isi folder: `scripts/` (mesin), `references/` (aturan lengkap, dibaca saat topiknya muncul), `assets/` (templat pemilik,
font, proyek contoh berisi tujuh spek nyata, render contoh). Daftar tiap berkas: `README.md`.

## Kapan berkas mana dibaca

| Saat | Baca |
| --- | --- |
| Selalu, sebelum menulis spek | bagian "Aturan keras" di bawah, lalu `references/selera-presentasi.md` (kerangka halaman, struktur per jenis deck, judul, tipografi, warna, komponen, larangan, alur kerja) |
| Deck kajian, Grand Design, deck pembaruan | `references/pola-konsultan.md` (S1 sampai S39), `references/pedoman-desain-deck.md` B7 (struktur, anatomi, alur slide per kajian) |
| Laporan harian, Penanganan, paparan wilayah, Presiden | `references/deck-operasional.md` (keputusan operasional terbaru, cut off, cara bangun di repo) |
| Menulis teks, angka, judul | `references/angka-dan-copy.md`, `references/contoh-judul.md`, `references/anti-slop.md` |
| Menulis spek JSON | `references/spek-deck-json.md`, `references/jenis-slide-S35.md`, `references/contoh-deck.md`, `references/NASKAH-SPEK.md` bagian 8 (token angka) |
| Mengubah warna, ukuran, komponen | `references/komponen-dan-tata-letak.md` (nilai tema.json) |
| Gerbang gagal atau sebelum serah | `references/qa-gerbang.md` |
| Ragu aturan mana yang menang | `references/keputusan-pemilik.md` (urutan otoritas, keputusan P, T, U, riwayat koreksi pemilik) |
| Teks menyebut jalur repo | `references/peta-jalur.md` |
| Alur lengkap langkah demi langkah | `references/proses-produksi.md` |

## Aturan keras (ringkasan; teks lengkapnya di references)

Kerangka dan gaya
- Slide 960 x 540 pt. Margin kiri 43,2 pt, tepi kanan isi 916,8 pt. Garis 0,75 pt 1A1A1A di y95 dan y507,6. Logo BNPB
  27,4 x 34,6 pt di (889,4; 28,8). Footer `Badan Nasional Penanggulangan Bencana  |  Copyright 2026` 8,5 pt dan nomor halaman
  bold rata kanan. Sampul dan penutup tanpa footer dan nomor. Layout GELAP 051C2C hanya untuk penutup, pembatas Lampiran,
  pembatas bab.
- Hanya Roboto (font tema juga), tanpa emoji. Huruf yang dibaca paling kecil 6 pt; isi 7,2 sampai 11 pt. 180 sampai 290 kata
  dan 3 sampai 4 blok per slide. Satu topik satu kontainer; tanpa panel gelap di samping; panel setinggi isinya; isi berjarak
  7 pt atau lebih dari tepi bawah panel.
- Judul paling banyak 2 baris di semua deck (kecilkan huruf, jangan baris ketiga). Deck kajian: slide temuan = kalimat temuan
  berangka 19 sampai 22 pt diawali kode bagian ("A1. "), angka D9600B, tempat 00499D; navigasi, usulan, lampiran
  deskriptif. Deck wilayah: judul deskriptif, satu frasa sorot.
- Palet rumah: teks 1A1A1A/2E3440/6B7280, navy 051C2C, oranye D9600B (angka kunci, api, naik), merah C8102E hanya bahaya
  dan perlu perhatian, biru 2F86D1 (air, turun, musim hujan), slate 5B7A99, biru lembaga 00499D. Naik oranye, turun biru.
  Palet lama D9650B, 0F1E2D, 0B4EA2, A88A3C, FBEBDD, D5D9DE dilarang. Satu warna sorot per grafik; satu keluarga bencana
  satu warna sepanjang deck; sorot dengan bingkai.
- Semua yang bisa disunting native: teks, pil, tabel, grafik batang, penanda dan label peta. Gambar hanya foto, logo, peta
  dasar, ikon. PNG peta tanpa teks; legenda dan label dibangun native. Ikon garis Lucide dalam lingkaran, wajib di kepala
  tabel, kartu angka, chip. Lembaga ditulis sebagai chip berikon, bukan logo.
- Peta berlatar putih tanpa laut biru, legenda wajib, tidak ada yang bertumpuk, label pil putih bergaris abu, jumlah sama
  dengan app atau data.
- Pil CUT OFF DATA navy di kanan atas (x 696, y 70) di tiap slide data, berisi tanggal dan jam WIB tarikan data, jam
  bertitik (`23 Okt 2026, 23.59 WIB`). Tidak di slide baris rekomendasi. Satu nilai di semua pil.
- Satu baris "Sumber: ..." 7,5 pt 6B7280 di zona kaki (y 485 sampai 507,6) tiap slide berangka, kecuali slide baris
  rekomendasi; tanpa baris sumber di bawah tiap grafik.
- Label keyakinan berupa pil di pojok kanan atas panel: Resmi, Terverifikasi, Estimasi model (tambah "belum diuji balik"),
  Asumsi kebijakan, Penilaian pakar. Tepat satu label menutup tiap angka.

Angka dan copy
- Format id-ID: titik ribuan, koma desimal, paling banyak 1 desimal; satuan selalu tertulis; "ribu/juta/miliar" di kalimat.
  Bulan penuh di judul ("22 Oktober"), singkat di isi ("22 Okt"); en dash untuk rentang.
- Tiap angka punya sumber dan waktu, dari registri angka (token `{{angka:kunci}}`), tidak diketik. Angka deck = angka
  dokumen. Angka judul dibuktikan lagi di badan slide. Angka harus cocok di seluruh deck.
- Em dash nol, titik tengah nol, elipsis nol. Tanpa personifikasi, slogan, kontras "X bukan Y", "mulai besok",
  tiga-serangkai (di deck tanpa pengecualian daftar faktual), pembuka klise, hedging, kata khas AI. "Titik panas", bukan
  "titik api", untuk data satelit; "hitungan satelit", tidak pernah "perkiraan satelit". Label = kata benda polos; pakai
  chip, bukan kalimat.

Struktur dan produksi
- Deck kajian: sampul, Pesan Kunci (tesis + 4 sampai 6 temuan, satu per bagian, sekaligus peta deck), sekitar 12 slide isi
  berurutan dari masalah ke tindakan (kondisi, risiko, skenario, kesenjangan, grand design), Kesimpulan 8 kartu 4 x 2 +
  pita ARAHAN, Terima kasih, lalu pembatas Lampiran dan lampiran tabel native paling banyak 24 baris per slide dipecah rata.
  Tanpa agenda, tanpa slide pelacak, tanpa pagu atau rupiah di slide program.
- Garis besar dulu (`pesan_kunci`, lalu `pesan`, `jenis_slide`, `judul_bentuk` tiap slide). `jenis_slide` dari daftar
  tertutup S35; dua slide isi berurutan tidak berjenis sama kecuali seri atau lampiran. Tiap slide isi selain navigasi
  memuat grafik native, tabel native, atau peta. Paling banyak 6 butir per daftar.
- Foto Wikimedia Commons berlisensi bebas (bukan NC/ND) dengan atribusi, relevan dengan isi; tanpa ilustrasi AI, tanpa foto
  stok, tanpa placeholder.
- Gerbang sampai 0 GAGAL, halaman PDF = jumlah slide, render dibaca tiap halaman, lintasan devil's advocate, lalu serah.
- Nama berkas `<Judul deck> DDMMYY` (tanggal paparan). Paket final kajian: `<Judul>.pptx` dan `Paparan <Judul>.pdf`.

Bila aturan pihak lain (skill PPT umum, konsultan, alfatehan-pptx-rules) bentrok dengan aturan di atas, aturan BNPB menang
(`references/pola-konsultan.md` tabel Bentrok).

## Sepuluh langkah (rinciannya di `references/proses-produksi.md`)

1. Tentukan jenis deck; buka render acuannya di `assets/contoh-png/`. Deck lama yang ditunjuk pemilik yang disalin.
2. Riset dan berkas bukti per pertanyaan kunci (Inti, Temuan bersumber, Inferensi, Celah); tiap angka berlabel keyakinan.
3. Garis besar per slide sebelum membangun; baca judul berurutan sebagai ringkasan.
4. Daftarkan tiap angka ke registri `data/angka.json` proyek (atau `--registri`).
5. Siapkan peta (SVG ke PNG + manifest perender), foto Commons beratribusi, ikon registri.
6. Tulis spek JSON dari spek contoh yang paling mirip.
7. Bangun: `deck.py ... --pdf`.
8. Betulkan spek sampai laporan QA LOLOS (0 GAGAL) dan halaman PDF = slide.
9. Render `pdftoppm -r 72` dan baca tiap halaman.
10. Pemeriksa berkonteks bersih menyerang tiap slide; betulkan, bangun ulang, `periksa.py --serah`, kirim PPTX dan PDF.

## Mulai cepat

Kebutuhan: Python 3.12 atau lebih baru (diuji 3.15), LibreOffice (`soffice`), poppler (`pdffonts`, `pdftoppm`), dan font
Roboto terpasang di sistem (wajib untuk PDF; salinannya di `assets/fonts/`).

```sh
SKILL=/jalur/ke/deck-bnpb
# Roboto untuk LibreOffice (macOS; Linux: ~/.local/share/fonts lalu fc-cache -f)
cp $SKILL/assets/fonts/Roboto-*.ttf ~/Library/Fonts/
python3 -m venv .venv && .venv/bin/pip install -r $SKILL/scripts/requirements.txt

# uji mesin: dua spek contoh dibangun, laporan LOLOS, 44 fixture rusak ditolak
.venv/bin/python $SKILL/scripts/periksa.py

# bangun contoh nyata (akar bawaan = assets/proyek-contoh)
.venv/bin/python $SKILL/scripts/deck.py $SKILL/assets/proyek-contoh/spek/deck-mitigasi.json out/deck-mitigasi.pptx --pdf
pdftoppm -r 72 -png out/deck-mitigasi.pdf out/render/slide
```

Deck baru:

```sh
cp -R $SKILL/assets/proyek-contoh proyek-saya        # tema.json, pustaka.json, data/, peta/, foto/, logo/, kredit.json
# ubah proyek-saya/data/angka.json (registri), tambah CSV ke proyek-saya/data/, tambah entri kajian ke tema.json bila perlu
cp proyek-saya/spek/deck-mitigasi.json proyek-saya/spek/deck.json   # lalu isi dari garis besar
.venv/bin/python $SKILL/scripts/deck.py proyek-saya/spek/deck.json "out/<Judul deck> DDMMYY.pptx" --pdf --akar proyek-saya
.venv/bin/python $SKILL/scripts/periksa.py --serah "out/<Judul deck> DDMMYY.pptx" --akar proyek-saya
```

Peta dasar baru: tiru `scripts/peta_irbi.py` (GeoJSON ke SVG ke PNG + manifest `unsur_peta`, `masukan`). Contoh:
`DECK_AKAR=proyek-saya .venv/bin/python $SKILL/scripts/peta_irbi.py 2023`. Hasil ada di `proyek-saya/peta/`.

Pesan `DeckGalat: <spek>#<n>: ...` menyebut slide ke-n di spek dan apa yang harus diubah. Laporan QA ada di
`out/qa/deck-<nama>.md`; baca juga tabel garis besar di akhirnya.

## Yang tidak dibawa skill

Generator laporan harian dan Penanganan (`data/laporan-bnpb/generator` di repo poskokarhutla) butuh data situs langsung
dan kunci FIRMS, jadi tidak dibawa; aturan dan tata letaknya lengkap di `references/selera-presentasi.md` dan
`references/deck-operasional.md`, render acuannya di `assets/contoh-png/`, templat pemiliknya `assets/templat-bnpb.pptx`
(deck d3 221026). Untuk jenis ini bangun dengan mesin `deck.py` bila komponennya cukup, atau tiru deck acuan dengan
python-pptx di atas templat yang sama. Deck tanpa manifest `deck.py` tetap diperiksa dengan
`DECK_AKAR=<akar> python scripts/qa_periksa.py --pptx X.pptx --pptx-pdf X.pdf --semua --berkas-saja` (gerbang yang butuh
manifest angka tampil LEWAT) dan `python scripts/slop.py --final X.pptx`, lalu render dibaca per halaman.
