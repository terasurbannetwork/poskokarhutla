# Gerbang QA deck: apa yang diperiksa, cara menjalankan, cara membaca

Tiga lapis mesin, lalu mata. Deck baru boleh diserahkan hanya bila ketiga lapis LOLOS dan render sudah dibaca.

## Lapis 1: gerbang saat membangun (`scripts/deck.py`)

Berhenti di galat pertama dengan pesan `DeckGalat: <spek>#<slide>: <pesan>`. Daftar lengkap yang ditolak:
`spek-deck-json.md` bagian 7. Yang paling sering kena: angka diketik (D-22), judul lebih dari 2 baris, teks tidak muat
di kotaknya ("pendekkan"), jenis_slide berurutan sama, label tabel terlalu panjang ("label peringkat 2 baris"), kode
temuan salah bentuk, foto tanpa atribusi, peta basi.

Cara membetulkan: ubah spek (pendekkan, pecah slide, pakai `ganti` di kolom CSV, pindah butir ke lampiran), jangan
mengubah ambang di tema.json atau mesin untuk meloloskan kerjaan sendiri.

## Lapis 2: gerbang berkas jadi (`scripts/periksa.py`, fungsi `periksa`)

Dari XML slide dan PDF, berhenti di pelanggaran pertama:

| Kode | Memeriksa |
| --- | --- |
| D-1, D-2, D-3 | em dash, titik tengah, emoji nol di `<a:t>`; juga di teks PDF (dan elipsis, D-17) |
| D-10 | istilah terlarang (`kosakata.istilah.terlarang`) |
| D-4 | font tema `theme1.xml` dan semua `typeface` hanya Roboto; `pdffonts` PDF hanya Roboto |
| batas 6 pt | ukuran huruf terkecil di XML >= `slide.tipografi.batas_bawah_pt` |
| D-9 | hanya `srgbClr` dari daftar putih hex tema.json; `schemeClr`, `prstClr`, `sysClr` ditolak |
| D-24 | tiap hex tercatat perannya di manifest; satu hex satu arti per halaman; di halaman berkeluarga api/basah arah = teks-2, angka judul navy bila api tampil |
| kerangka | footer `Badan Nasional Penanggulangan Bencana  \|  Copyright 2026` di slide isi, tidak di sampul/penutup; nomor halaman = urutan slide di pojok footer; garis 0,75 pt selebar 873,6 pt di y95 dan y507,6 |
| D-22 | tiap angka di teks slide tercatat di manifest angka bersumber atau teks struktur mesin (nomor, kode, tanggal, label kosakata, baris Sumber) |
| D-8 | peta: legenda, sumber batas, sistem referensi, catatan batas tidak resmi, label >= 8 pt, label di dalam peta tanpa irisan |
| PDF | jumlah halaman = jumlah slide (P13); baris judul diukur per garis dasar di kotak judul (D-17) |

## Lapis 3: laporan QA per deck (S39, `periksa.laporan`)

Ditulis ke `<folder PPTX>/qa/deck-<nama>.md` oleh `deck.py --pdf` dan `periksa.py --serah`; build gagal (exit non-nol) bila
vonisnya GAGAL. Tiap baris dinilai, tidak berhenti di gagal pertama. Kelompok:

- **Font**: pdffonts hanya Roboto; `qa_periksa` D-4, D-5 (huruf terkecil), D-23 (glif di luar Roboto).
- **Ikon**: gambar raster di XML hanya logo, foto, peta dasar, ikon registri, dan jumlahnya sama dengan catatan generator (S37).
- **Tata letak**: gerbang lapis 2; `qa_periksa` T-2 (halaman PDF = dokumen asal), D-17, T-6 (kerangka slide, pil CUT OFF di
  slide data), T-7 (teks tidak beririsan, isi >= 7 pt dari tepi bawah panel), D-14 (label keyakinan di tabel dan kartu),
  D-9, D-16 (format angka id-ID), D-22, D-6 (angka silang); garis besar S34 (pesan_kunci, pesan, jenis_slide, judul_bentuk);
  tiap slide isi selain navigasi bervisual (S36); variasi S35; judul tidak kembar setelah angka dibuang (S6); paling banyak
  6 butir per kotak teks (S38).
- **Anti-AI**: `qa_periksa` D-1, D-2, D-3, D-10, T-4 (bebas AI slop, `slop.py` ambang final), T-8 (ambang anti-AI per
  slide: tiga-serangkai, titik dua, hedging, pembuka klise, kata terlarang khas AI; di deck tanpa pengecualian daftar tiga
  faktual).

Vonis LOLOS dan GAGAL (kosakata `qa_periksa`). LULUS, GAGAL RINGAN, GAGAL BERAT hanya untuk pindaian anti-AI per bab naskah
dan per slide di T-8: satu pelanggaran per slide sudah GAGAL RINGAN, dan GAGAL RINGAN tidak diterima apa adanya karena
hasil diserahkan tanpa putaran tinjauan pemilik. Tabel "Garis besar" di akhir laporan dibaca berurutan sebagai ringkasan.

## Perintah

```sh
# bangun + semua lapis
python scripts/deck.py SPEK.json OUT.pptx --pdf --akar AKAR

# sebelum serah: lapis 2 + 3 + cek basi (hash tiap masukan sama dengan saat dibangun; PDF lebih baru dari PPTX)
python scripts/periksa.py --serah OUT.pptx --akar AKAR

# gerbang repo lengkap untuk satu deck (status LOLOS/GAGAL/LEWAT/TAK per kode)
DECK_AKAR=AKAR python scripts/qa_periksa.py --pptx OUT.pptx --pptx-pdf OUT.pdf --semua --ketat --berkas-saja

# pindaian slop per slide (S-1 sampai S-43), ambang final; --ambang untuk vonis LULUS/GAGAL RINGAN/GAGAL BERAT
python scripts/slop.py --final OUT.pptx
python scripts/slop.py --ambang --laporan qa/slop-deck.md OUT.pptx

# uji diri mesin: bangun dua spek contoh + PDF, laporan LOLOS, 44 fixture rusak harus ditolak
python scripts/periksa.py
python scripts/ikon.py     # semua glif registri terender, konsep asing ditolak
python scripts/tema.py     # validator tema.json (beda warna CIEDE2000, kontras, geometri, fixture negatif)
python scripts/naskah.py   # uji diri resolver token angka (butuh references/NASKAH-SPEK.md)
```

Membaca keluaran `qa_periksa`: `TAK` = jenis berkas yang diperiksa gerbang itu tidak diberikan (gerbang DOCX saat memeriksa
deck), bukan lolos dan bukan gagal. `LEWAT` = masukan tidak ada; dengan `--ketat` dihitung gagal. Baris "Antre" = aturan
yang belum bergerbang mesin (registri `scripts/cakupan.json`); periksa manual.

## Pemeriksaan manual yang belum bergerbang

Dari `pola-konsultan.md` bagian Cara memeriksa dan `selera-presentasi.md` Alur kerja langkah 4, untuk tiap deck kajian:

1. Judul slide isi dibaca berurutan; tiap judul temuan memuat token angka, dan angka itu muncul lagi di badan slide (S6 sampai S8).
2. Kode dan label bagian di Pesan Kunci identik dengan kode bagian slide isi; jumlah temuan = jumlah bagian (S2, S10).
3. Tiap angka tampil tertutup tepat satu label keyakinan yang sama dengan registri; tiap slide berangka selain baris rekomendasi punya satu baris Sumber; tinggi zona catatan kaki <= 22,6 pt (S14, S15).
4. Per grafik paling banyak satu warna sorot; tiap warna punya label langsung atau legenda (S18 sampai S21).
5. Tabel penanggung jawab: baris tanpa tepat satu K berbingkai dan terhitung; tiap rekomendasi muncul sekali di satu horizon dan punya nomor, chip lembaga, pil status (S23, S28, S29).
6. Tidak ada "Rp" atau "rupiah" di slide program, peta jalan, pembiayaan (S31, P5).
7. Satu tanggal dan jam di semua pil CUT OFF; slide usulan berangka ikut berpil (S16).
8. Peta: label laut, label tidak menutup data, jumlah penanda = jumlah wilayah di judul (D-8 sebagian antre).
9. Angka sama di seluruh deck (judul = KPI = daftar = ikon), seperti d3.

## Batas yang disengaja

Baris judul dan keterangan diperkirakan dari lebar glif Roboto dan 1,2 x ukuran huruf, bukan dari render; selisih satu kata
bisa lolos, jadi render tetap dibaca. D-22 memakai daftar pengecualian (tahun, tanggal, jam WIB, nomor objek, regulasi,
halaman, versi lisensi, kode rekomendasi "01"). Gerbang visual DOCX (`--visual`, D-21, D-28), ejaan T-10, glosarium T-9, dan
pustaka T-11 tidak berlaku untuk deck.
