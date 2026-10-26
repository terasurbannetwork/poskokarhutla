# Proses produksi deck BNPB dari awal sampai serah

Cara deck kajian BNPB Oktober 2026 dibuat (Grand Design Ketahanan Air Pulau Jawa, Mitigasi Bencana Indonesia, Rehabilitasi
dan Rekonstruksi Air dan Akses Pascabencana, serta deck pembaruan 231026), dirumuskan jadi sepuluh langkah. Tiap langkah
menyebut buktinya selesai. Aturan gaya tidak diulang di sini; rujukannya disebut.

## 1. Tentukan jenis deck dan buka deck acuannya

- Jenis: deck kajian (pola konsultan S1 sampai S39, sekitar 12 slide isi + lampiran), deck pembaruan kajian (pola sama,
  pil DRAF PEMBARUAN), Laporan Kejadian Bencana Harian (d3), Laporan Penanganan Pengendalian Karhutla (d6, d8), paparan
  wilayah (d5), Paparan Kepala BNPB kepada Presiden (d9). Struktur tiap jenis: `selera-presentasi.md` bagian Struktur per
  jenis deck; keputusan operasional terbaru: `deck-operasional.md`.
- Lihat render acuannya sebelum menulis apa pun: `assets/contoh-png/` (d3 harian, Penanganan, paparan wilayah Jambi, deck
  kajian final, deck pembaruan). Bila pemilik menunjuk deck lama, deck itu yang disalin, bukan generator.
- Bukti: jenis deck, deck acuan, dan jumlah slide tertulis di catatan kerja.

## 2. Riset dan berkas bukti

- Pisahkan peneliti dan penulis. Untuk tiap pertanyaan kunci susun berkas bukti empat bagian: Inti; Temuan bersumber (tiap
  butir bersumber, termasuk "dibantah oleh"); Inferensi (analisis tim, ditandai); Celah (yang tidak ditemukan). Kalimat
  faktual tanpa sumber pindah ke Celah atau dihapus; "diperkirakan" tidak menutupi ketiadaan sumber (L56 sampai L58).
- Tiap angka diberi label keyakinan: `resmi` (terbitan lembaga negara), `terverifikasi` (dicek ke sumber primer atau
  data mentah), `estimasi-model` (keluaran model; tambah "belum diuji balik" bila belum lulus uji balik),
  `asumsi-kebijakan` (target atau angka kebijakan yang dipilih), `penilaian-pakar` (posisi penilaian). Hierarki bukti dan
  label: `pedoman-desain-deck.md` C6.1 dan C6.2. Berita hanya bila sumber resmi tidak ada, ditandai; agregator diganti
  sumber aslinya; angka yang bertentangan ditulis berdampingan.
- Regulasi BNPB dikutip dari teks pasal asli (di lingkungan pemilik tersedia skill `hukum-bnpb` untuk korpus JDIH BNPB).
- Data karhutla deck operasional dari website Pantau Bencana; fakta lapangan dari laporan BPBD atau Dit. Koordalops.
- Bukti: berkas bukti per bagian, tiap butir bersumber dan berlabel.

## 3. Garis besar (KERANGKA per slide) sebelum membangun

- Tulis satu kalimat `pesan_kunci` (S34), lalu tabel garis besar: kode bagian ("A1."), judul templat dengan slot angka
  (`{a}`), `pesan`, `jenis_slide` (S35), `judul_bentuk` (S7), visual utama, kunci angka. Contoh lengkap: tabel alur deck air
  dan mitigasi di `pedoman-desain-deck.md` B7.4 dan B7.5.
- Urutan bagian dari masalah ke tindakan: kondisi, risiko, skenario, kesenjangan, grand design (S3). Pesan Kunci = peta
  deck: temuan ke-n memakai kode dan nama bagian ke-n (S1, S2). Kesimpulan 8 kartu + ARAHAN (S32).
- Baca judul berurutan sebagai ringkasan (S6). Templat judul sekitar 110 karakter sesudah angka diisi supaya muat 2 baris
  di lebar 644 pt (B7.3).
- Bukti: tabel garis besar dibaca utuh; tidak ada dua judul sama setelah angka dibuang; tidak ada dua `jenis_slide`
  berurutan sama di luar seri.

## 4. Registri angka: angka deck sama dengan angka dokumen

- Tiap angka yang tampil masuk `<akar>/data/angka.json` sebagai entri (`berkas` + `jalur` ke paket data, atau `nilai` +
  `pustaka`), dengan `keyakinan`, `sumber`, `satuan` (skema: `spek-deck-json.md` bagian 6). Spek dan naskah DOCX memakai
  token `{{angka:kunci}}` yang sama, jadi angka di deck dan dokumen identik dan bisa dilacak.
- Angka yang dihitung mesin (persen perubahan, rentang legenda) dicatat sebagai angka turunan bersumber di manifest.
- Tabel dan grafik membaca CSV paket data langsung (`data.csv`), bukan angka salinan.
- Bukti: `deck.py` tidak menolak satu pun token; gerbang D-22 lolos (tiap angka tampil tercatat di manifest).

## 5. Aset visual: peta, foto, ikon

- **Peta**: perender menggambar SVG dari GeoJSON lalu merasterkan ke PNG dengan PyMuPDF (pola `scripts/peta_irbi.py`,
  `scripts/peta_jawa.py`). Latar putih tanpa laut biru; label dan legenda TIDAK dibakar ke PNG (deck menggambarnya
  native). Perender menulis manifest `<png>.json`: `unsur_peta` (`sumber_batas`, `sistem_referensi`, `proyeksi`,
  `catatan` "Batas wilayah bukan rujukan resmi"), `masukan` (sha256 tiap berkas masukan, jalur relatif folder PNG, untuk
  cek basi), dan `legenda` bila kelasnya dihitung dari data. Penanda wilayah ditulis di spek sebagai pecahan x, y.
- **Foto**: Wikimedia Commons berlisensi bebas (CC BY, CC BY-SA, CC0, PD; NC dan ND ditolak), relevan dengan isi slide
  (lokasi, operasi, dampak), tanpa ilustrasi AI dan tanpa foto stok. Atribusi "Foto: <judul atau lokasi>; <pengarang>,
  <lisensi>, Wikimedia Commons" lewat medan `kredit` di spek atau `<akar>/kredit.json`. Daftar kandidat yang sudah
  diperiksa lisensinya: `assets/kandidat-foto-commons.csv`. Foto belum ada: tanyakan ke pemilik dan sebut slide serta
  posisinya; deck tidak dikirim dengan placeholder.
- **Ikon**: garis gaya Lucide dalam lingkaran, dari registri `tema.json` `ikon` (glif di `scripts/glif.json`). Konsep baru:
  tambah glif Lucide asli ke `glif.json` dan kunci ke `tema.json` (satu konsep satu glif, D-25), lalu `python scripts/ikon.py`.
- Bukti: `deck.py` tidak menolak peta (manifest lengkap, tidak basi, label tidak tumpang), foto (atribusi ada), ikon.

## 6. Tulis spek deck JSON

- Salin spek contoh yang paling mirip dari `assets/proyek-contoh/spek/` (`contoh-deck.md` menjelaskan tiap spek), isi dari
  garis besar langkah 3. Skema medan demi medan: `spek-deck-json.md`.
- Akar proyek berisi `tema.json` (salinan dari `assets/proyek-contoh/tema.json`, tambah entri `kajian` baru bila perlu),
  `pustaka.json`, `data/angka.json`, `data/glosarium.json`, CSV paket data, `peta/`, `foto/`, `logo/sumber-bnpb.png`,
  `kredit.json`.
- `cut_off`: satu batas data bertanggal dan berjam dari tarikan data terakhir, jam bertitik (`23 Okt 2026, 23.59 WIB`).
  Dipasang di semua slide data termasuk Pesan Kunci, Kesimpulan, dan slide usulan berangka; tidak di slide baris
  rekomendasi (S16). Deck draf atau pembaruan menambah `pil_draf`.

## 7. Bangun di templat BNPB

```sh
python scripts/deck.py <akar>/spek/deck.json "<keluar>/<Judul> DDMMYY.pptx" --pdf --akar <akar>
```

Mesin memakai master, tema Roboto, dan layout PUTIH/GELAP dari `assets/templat-bnpb.pptx` (deck pemilik 221026), membuang
slide templat, lalu menggambar tiap slide dua lintasan (lintasan pertama mengenali keluarga warna yang tampil untuk peran
warna halaman, B1.5 dan B1.8). Semua teks, pil, tabel, grafik, penanda native. PDF diekspor LibreOffice dengan profil
terpisah. Bukti: baris `ok ...` dan `laporan QA deck: ... (LOLOS)`.

## 8. Gerbang sampai 0 GAGAL

- Galat saat membangun (`DeckGalat: spek#slide: pesan`) dibetulkan di spek, bukan dengan melonggarkan mesin.
- Laporan QA deck `<folder>/qa/deck-<nama>.md` (S39): kelompok Font, Ikon, Tata letak, Anti-AI; vonis LOLOS hanya bila tidak
  ada satu baris GAGAL. Rincian dan cara membaca: `qa-gerbang.md`.
- Jumlah halaman PDF = jumlah slide (P13, T-2); `pdffonts` hanya Roboto.
- Bukti: laporan berisi `Vonis: **LOLOS**` dan tabel garis besar di akhir laporan dibaca sebagai ringkasan.

## 9. Render dan baca tiap slide

```sh
pdftoppm -r 72 -png "<Judul> DDMMYY.pdf" render/slide
```

Baca tiap PNG (laporan "sudah rapi" tanpa melihat PNG tidak dihitung). Periksa: judul paling banyak 2 baris; tidak ada teks,
label, bulatan yang beririsan; tidak ada "..."; isi tidak menempel ke tepi bawah panel (7 pt atau lebih); tiap warna dan
bulatan berlegenda; angka sama antarslide (judul = kartu = tabel); nomor halaman lampiran benar; ruang kosong di dalam
kontainer dipadatkan; slot foto bila isi tidak mengisi y 101 sampai 500.

## 10. Lintasan devil's advocate, lalu serah

- Pemeriksa berkonteks bersih (bukan penulis spek) menyerang tiap slide: angka tanpa bukti di slide yang sama (S8),
  angka yang tidak cocok antarslide atau dengan dokumen, label keyakinan yang terlalu kuat, tiga-serangkai dan pola slop
  (`anti-slop.md`), judul yang tidak menjawab "lalu apa", slide tanpa visual (S36), istilah terlarang, sumber yang hilang.
  Temuan dibetulkan di spek, deck dibangun ulang, gerbang dijalankan lagi. Untuk deck pembaruan lintasan ini wajib, karena
  gerbang bisa lebih ketat daripada saat deck sebelumnya dibangun (contoh di skill ini: spek pembaruan 231026 gagal T-8 dan
  S36 pada gerbang 26 Okt, lalu dibetulkan; lihat `contoh-deck.md`).
- Sebelum serah: `python scripts/periksa.py --serah "<Judul> DDMMYY.pptx" --akar <akar>` (gerbang + cek basi: tiap masukan
  sama hash-nya dengan saat dibangun, PDF lebih baru dari PPTX).
- Nama berkas: `<Judul deck> DDMMYY` dengan DDMMYY = tanggal paparan (mis. `Laporan Kejadian Bencana Harian 231026`,
  `Update Grand Design Mitigasi Bencana Indonesia 2026-2030 231026`). Paket final kajian 8 berkas (P13): `<Judul>.docx` dan
  PDF-nya, `<Judul>.pptx` dan PDF deck bernama `Paparan <Judul>.pdf` supaya tidak bertabrakan dengan PDF dokumen.
  Judul di nama berkas memakai tanda hubung biasa untuk rentang tahun (`2026-2030`).
- Kirim PPTX dan PDF langsung. Koreksi pemilik dicatat sebagai keputusan (riwayat) lalu ke aturan.

---

## Lampiran: TAMBAHAN-RISET.md (skill deep-research untuk alur penulisan kajian)

> Salinan kata demi kata dari `data/kajian-bnpb/TAMBAHAN-RISET.md`.

| No | Insight skill | Penerapan di kajian | Diperiksa oleh |
| --- | --- | --- | --- |
| 1 | Peneliti dan penulis dipisah; penulis tidak meriset sendiri, hanya menyintesis catatan | Tiap bab punya berkas bukti `naskah/<kajian>/bukti/bab-NN.md` yang disusun lebih dulu dari riset A–D, data/*, dan sumber tambahan; penulis bab menulis HANYA dari berkas bukti + angka.json | penyunting substansi: klaim di naskah yang tidak ada di berkas bukti ditolak |
| 2 | Catatan per pertanyaan kunci dengan empat bagian: Inti, Temuan bersumber, Inferensi, Celah | Struktur wajib berkas bukti: per pertanyaan kunci bab, bagian Inti, Temuan bersumber (tiap butir bersumber, termasuk "dibantah oleh"), Inferensi (analisis tim, ditandai), Celah (yang tidak ditemukan) | qa: berkas bukti tanpa empat bagian ditolak |
| 3 | Evaluasi sumber: fakta vs spekulasi, sumber asli vs agregator, sumber bermasalah, konflik ditulis | Label keyakinan (resmi/terverifikasi/estimasi-model/asumsi-kebijakan) + aturan: berita hanya bila sumber resmi tidak ada dan ditandai; agregator diganti sumber aslinya; konflik ditulis berdampingan | penyunting substansi |
| 4 | Klaim tanpa sumber dibuang, bukan diperhalus | Kalimat faktual tanpa sumber dipindah ke Celah atau dihapus; tidak ada "diperkirakan" untuk menutupi ketiadaan sumber | qa: paragraf isi tanpa rujukan atau token angka dihitung |
| 5 | BLUF: pembuka yang langsung menjawab | Ringkasan Eksekutif dan kotak ringkasan tiap bab dibuka dengan temuan terpenting berangka, lalu arti dan dampaknya bagi BNPB; pembaca yang berhenti di situ sudah paham | penyunting bahasa |
| 6 | Judul penunjuk arah berisi temuan spesifik | Judul bab tetap baku dan kapital (keputusan T1). Judul subbab tingkat 3 dan judul kotak temuan memakai bentuk penunjuk arah berangka, mis. "Kedung Ombo kehilangan 5,5% tampungan" alih-alih "Sedimentasi waduk", selama tetap formal dan ≤ 2 baris | penyunting bahasa |
| 7 | Prosa padat, fakta kunci ditebalkan, kutipan strategis | Paragraf isi berbentuk prosa; daftar butir hanya untuk enumerasi sejajar (lembaga, langkah); angka kunci tebal; rujukan pada klaim besar, angka, dan dokumen | qa: rasio butir terhadap paragraf per bab |
| 8 | Data ditafsirkan, bukan didaftar | Tiap angka utama disertai pembanding (target RPJMN, tahun lalu, provinsi lain, standar internasional) dan artinya bagi keputusan | penyunting substansi |
| 9 | Kejujuran analitis: ketidakpastian dinyatakan, posisi lawan diuji, kesimpulan diambil | Tiap rekomendasi besar yang diperdebatkan (mis. tanggul laut, normalisasi vs naturalisasi sungai, relokasi) menampilkan argumen tandingan dan bukti kegagalan (pola Empat Sungai Korea), lalu posisi kajian | penyunting substansi |
| 10 | Kesimpulan berisi wawasan baru, bukan ringkasan ulang | Bab Kesimpulan dan Rekomendasi berisi keputusan dan implikasi; tidak mengulang paragraf bab sebelumnya | detektor pengulangan kalimat lintas bab |

Tidak dipakai: batas 15 panggilan alat per peneliti (kajian butuh penelusuran lebih dalam), laporan tanpa daftar butir sama
sekali (dibatasi, bukan dilarang), judul bab bergaya naratif (T1: judul bab baku).
