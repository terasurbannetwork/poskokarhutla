# Elemen grafis BNPB: pustaka dan penempatan

Disusun 31 Okt 2026 atas permintaan pemilik: elemen grafis plug-and-play sebanyak mungkin, geometris (tanpa liukan),
penempatan ditentukan mesin per jenis halaman. Kode: `scripts/elemen.py`; katalog: `scripts/katalog_elemen.py`.

## Pelajaran yang melahirkan aturan ini

- Ornamen organik buatan kode (kipas garis, pita arus meliuk) ditolak berulang kali ("jelek banget"): kurva matematis
  terlihat kaku di sebelah elemen gambar tangan desainer (HUT RI 79 "Aliran Sungai"). Bentuk geometris tetap rapi.
- Segitiga yang menyerupai lambang dilarang pedoman merek BNPB (26 Okt: "pakai gambar asli, bukan segitiga gambaran").
- Kotak yang ditebar acak "ga natural": elemen harus berjangkar dan bersinggungan sudut ke sudut.

## Pustaka (27 elemen)

kotak_tangga, piksel, gelombang, bilah, chevron, halftone, arsir, seperempat, silang, cincin_target, lingkaran_tangga,
sinyal, orbit, kotak_garis, siku_fokus, setengah, pelangi, horizon, simpul, progres_batang, kotak_tumpuk. Makna tiap
elemen ada di `elemen.MAKNA` dan halaman katalog.

## Aturan penempatan (dijalankan mesin)

1. Hanya di halaman bingkai: sampul, penutup, daftar isi, pembatas bagian. Slide isi data tidak dihias.
2. Satu jenis elemen per deck, dipakai sama di semua halaman bingkai (aturan pedoman HUT: paling banyak satu elemen
   per media).
3. Posisi tetap per jenis halaman:
   - sampul dan penutup (bingkai tumpuk foto): hanya gugus kotak PwC berjangkar di tepi bawah sambungan dan di celah
     foto pertama; tidak ada elemen di atas foto (pemilik 31 Okt: "di sampul depan ga perlu");
   - daftar isi dan pembatas: pojok kiri bawah panel kiri, 104 pt persegi, berjangkar ke margin kiri.
4. Warna: di atas foto putih dengan satu aksen oranye; di atas latar putih atau panel berwarna (oranye utama, navy
   atau abu-biru pendamping). Tidak transparan. Hanya token palet lembaga.
5. Tidak bersinggungan dengan teks, logo, pil, atau kredit foto; jarak minimal satu satuan grid.
6. Jenis elemen dipilih dari judul deck (kata utuh): kerja sama/koordinasi = kotak_tumpuk; karhutla/kebakaran/titik
   panas = piksel; gempa = gelombang; tsunami/banjir/air = setengah; cuaca/iklim/kekeringan = pelangi; peringatan dini =
   sinyal; satelit = orbit; peta jalan = simpul; selain itu kotak (gugus PwC). Spek boleh menimpa: `"elemen": "<nama>"`,
   atau `"elemen": ""` untuk tanpa elemen.
7. Hiasan manual di halaman mana pun hanya lewat `"hiasan": [{"jenis", "x", "y", "w", "h", "warna"}]` dan tetap
   mengikuti aturan 3 sampai 5; pakai untuk halaman pesan kunci atau halaman kutipan, tidak untuk slide data.

## Berkas di folder ini

- `Katalog Elemen Grafis BNPB 311026.pdf` dan `.pptx`: satu halaman per elemen, empat varian warna palet hiasan.
- `PALET.md`: palet sistem, kontras, dan pasangan warna terlarang.
- `kode/`: salinan `elemen.py` dan `katalog_elemen.py` dari skill `ppt-konsultan`.
- Halaman katalog daring: https://claude.ai/artifact/H3ScSZeP2yohaA9sdDf4zz
