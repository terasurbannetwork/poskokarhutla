# Kerangka buku kajian SIPPA

Versi 1, 25 Oktober 2026. Kerangka tunggal untuk buku kajian **Sistem Pipa Portabel Karhutla dan Banjir (SIPPA)
2026–2030** (DOCX dan PDF) beserta deck paparan untuk Kepala BNPB (PPTX dan PDF). Berkas ini mengunci arah, urutan
bab, pertanyaan kunci, angka wajib berikut kunci registrinya, objek bernomor, rekomendasi, lampiran, deck, foto,
generator visual, dan urutan produksi. Penulis bab hanya mengisi bukti dan prosa; arah tidak diubah di tingkat bab.

**Urutan otoritas.** (1) `pipa/KEPUTUSAN-SIPPA.md` (50 keputusan pemilik 24 Oktober 2026, menang atas semua berkas
lain); (2) `KEPUTUSAN.md` (P1–P18, T1–T14) sejauh tidak dicabut oleh (1), lihat §0.2; (3) Buku Pegangan
`docs/buku-pegangan/pantau-bencana.md` (L1–L72, S1–S39); (4) berkas ini; (5) `pipa/PRD.md`; (6) `PEDOMAN-DESAIN.md`,
`bangun/NASKAH-SPEK.md`, `tema.json`, `ANTI-SLOP.md`. Bahan isi: `pipa/KRITIK-DAN-KEPUTUSAN.md` (disingkat KD),
`pipa/baca-A.md`, `baca-B.md`, `baca-C.md` (celah G01–G28), `pipa/data/README.md`, `pipa/data/matriks_jarak.md`, dan
data repo yang didaftar di tiap bab. Bila berkas ini mengubah isi PRD §8, berkas ini berlaku untuk buku dan PRD
diperbarui pemiliknya (§0.3).

**Konvensi.** Path relatif ke `data/kajian-bnpb/` kecuali diawali `public/`, `scripts/`, `src/`, atau `data/raw/`
(relatif ke akar repo). Angka di berkas ini adalah **nilai acuan** yang sudah dibaca dari sumbernya pada 24–25
Oktober 2026 dan dipakai penyunting substansi untuk mencocokkan; di naskah angka tampil hanya lewat token
`{{angka:sippa.<kunci>}}` (gerbang D-22). Kode G1–G25 di kolom objek adalah pilihan grafik `PEDOMAN-DESAIN.md` §B5.10;
kode B5.x adalah komponen PEDOMAN §B5. Gerbang program ditulis "gerbang G0" sampai "gerbang G6"; gambar teknik ditulis
"SIPPA-G-01" sampai "SIPPA-G-12". Rekomendasi berkode `SR-nn` (register §6) dan di naskah menjadi `::: rek
{#rek:<id>}`. Label keyakinan ditulis dengan kode `tema.json`: `resmi`, `terverifikasi`, `estimasi-model`,
`asumsi-kebijakan`, ditambah status slot `menunggu` (§2 butir 4). Halaman = isi utama di luar bagian depan, Daftar
Pustaka, dan lampiran; angka halaman adalah perkiraan beban kerja, bukan batas (keputusan 11, P18).

**Isi berkas.** §0 keputusan yang mengikat; §1 identitas buku; §2 prinsip isi; §3 bagian depan dan KD-1 sampai KD-7;
§4 bab demi bab (BAB 1 sampai BAB 17); §5 lampiran A–N; §6 register rekomendasi SR-01 sampai SR-20; §7 foto, peta,
grafik, gambar teknik; §8 perubahan mesin; §9 urutan produksi dan gerbang QA; §10 butir terbuka; §11 deck.

---

## 0. Keputusan yang mengikat kerangka ini

### 0.1 Keputusan pemilik SIPPA yang dieksekusi buku

| No | Keputusan (`KEPUTUSAN-SIPPA.md`) | Letak di buku |
| --- | --- | --- |
| 1, 2, 3 | Nama SIPPA; pemilik program BNPB; pembaca Kepala BNPB | §1, seluruh buku |
| 4 | Pilot Oktober 2026; bila "dapat dipakai", kit dipakai untuk banjir November–Desember 2026 | Bab 12, Bab 11, KD-2 |
| 5 | Horizon 2026–2030 | Bab 16, rek.waktu |
| 6 | Provinsi lain dibahas penuh | Bab 5 (18 profil bertemplat), Lampiran C |
| 7 | Pemakaian ganda banjir masuk hitungan biaya-manfaat | Bab 11, Bab 13 (varian BCR + banjir) |
| 8 | Irigasi masuk, air dari sumber lain | Bab 11.5, Bab 13 (varian BCR + banjir + irigasi) |
| 9 | Injeksi 1,5 m untuk pilot; 3–5 m lengan uji kedua | Bab 2, Bab 6, Bab 9, SIPPA-G-03 |
| 10 | Surfaktan bebas PFAS sebagai lengan uji | Bab 2.5, Bab 12 |
| 11 | Tanpa batas halaman | §1, alokasi halaman perkiraan |
| 12 | Gambar teknik tingkat konstruksi; blok pengesahan insinyur berlisensi kosong | Bab 8, Lampiran F |
| 13 | RAB dihitung ulang | Bab 13, Lampiran E |
| 14 | Harga helikopter: angka BNPB menyusul | slot `menunggu` §2 butir 4, Bab 13.6, KD-5 |
| 15 | NPV, BCR, Monte Carlo | Bab 13 |
| 16, 17 | Matriks respons FRP dan luas | Bab 9.3 |
| 18 | Simulasi Three.js di web | Bab 15.4 (rujukan, bukan gambar utama) |
| 19 | Deck sekitar 15 slide | §11 |
| 20 | Tanpa bab kritik; arah desain ditulis langsung | §2 butir 2, seluruh bab |
| 21 | YonTP gudang, tenaga gelar, transport; komando Satgas; operator inti Manggala Agni | Bab 10 |
| 22 | Tanpa bagian dasar hukum TNI | Bab 10 (hanya MoU pinjam pakai BMN) |
| 23 | Aset BMN BNPB, pinjam pakai | Bab 10.3 |
| 24 | Matriks RACI per tahap | Bab 10.2 |
| 25 | Swasta/konsesi sebagai opsi kebijakan | Bab 10.5 |
| 26, 27 | Semua data terbuka ditarik; draf surat permintaan data sebagai lampiran | Lampiran A, Lampiran I |
| 28 | Batas data 23 Oktober 2026 pukul 23.59 WIB | §1, kolofon, pil CUT OFF deck |
| 29 | Label keyakinan di semua angka | §2 butir 4 |
| 30 | Ambang zona air 2,5 km, jalan 5 km | Bab 4 |
| 31–45 | Aplikasi web `/pipa` | Bab 15 (ringkas), Lampiran L |
| 46, 47, 48 | PRD dulu lalu buku dan web paralel; mitigasi ditunda; kuota | §9 |
| 49 | Deploy dari sesi induk setelah lolos uji | §9.5 |
| 50 | Enam larangan: "terbukti" tanpa uji, angka tanpa sumber, jaringan permanen nasional, pembelian massal sebelum pilot, injeksi > 5 m, nama/logo selain BNPB | §2 butir 3, 5, 6, 7; gerbang §9.4 |

### 0.2 Aturan `KEPUTUSAN.md` yang tetap berlaku dan yang tidak

| Kode | Status untuk SIPPA | Catatan |
| --- | --- | --- |
| P1 | berlaku | penerbit BNPB saja, tanpa tim penyusun, pembaca Kepala BNPB |
| P2 | tidak berlaku | judul SIPPA di §1 |
| P3 | berlaku dalam bentuk lain | rezim pengelolaan gambut dan pengambilan air dirujuk, tidak ditandingi (BRGM/Kemenhut untuk sekat kanal, BWS untuk izin air) |
| P4 | berlaku | horizon 2026–2030; peta jalan 100 hari, 2026–2027, 2028–2030 |
| P5 | **dicabut** oleh keputusan 13 dan 15 | buku memuat RAB, NPV, BCR, Monte Carlo |
| P6 | berlaku | "terbukti" hanya dengan kutipan uji; SIPPA berstatus usulan baru yang diuji |
| P7 | berlaku | status Sudah ada / Sudah ada, perlu dikembangkan / Usulan baru |
| P8 | berlaku | unit dari OTK BNPB berlaku (Perban BNPB 6/2025 jo. 11/2025, korpus JDIH lokal); K/L bernomenklatur Oktober 2026 |
| P9, P10, P11 | tidak berlaku | bukan kajian risiko multi-bencana |
| P12 | berlaku | DOCX A4 tegak, Roboto, logo BNPB, foto Commons beratribusi, tanpa ilustrasi AI |
| P13 | berlaku | empat berkas: DOCX + PDF, PPTX + PDF; halaman PDF sama dengan dokumen asal |
| P14 | berlaku dengan penyesuaian | deck sekitar 15 slide (keputusan 19), bukan 12 |
| P15 | berlaku | peta disimulasikan di web (`/pipa/peta`) lalu dirender untuk dokumen |
| P16, P17 | berlaku | gaya laporan kelas dunia; tanpa tata naskah dinas khusus, tanpa simulasi tanya-jawab |
| P18 | berlaku | tanpa batas halaman; D-12 lolos tanpa batas |
| T1 | berlaku | judul bab KAPITAL ("BAB 7 HIDRAULIKA DAN TITIK KERJA"), subbab huruf judul |
| T2, T3 | berlaku | oranye naik, biru turun; peta web di situs, tetapi di `/pipa` berlogin (keputusan 32), bukan `public/kajian/` |
| T4 | berlaku | kaki halaman alamat BNPB |
| T5 | dicabut (P18) | |
| T7 | berlaku | Kata Pengantar draf berpenanda periksa pemilik |
| T10 | berlaku | "prabencana", "tanggap darurat", "pascabencana" |
| T11, T12, T13 | berlaku | judul temuan berangka maks 2 baris; kode bagian A–E; pembatas GELAP |

### 0.3 Penyesuaian terhadap PRD §8 (PRD diperbarui pemiliknya)

| Pokok | PRD §8 | Kerangka ini | Alasan |
| --- | --- | --- | --- |
| Kode kajian | `kajian: pipa`, kunci `pipa.*` | `kajian: sippa`, kunci `sippa.*` | permintaan sesi induk 25 Okt 2026; nama program (keputusan 1) |
| Folder naskah | `naskah/pipa/` | `naskah/sippa/` | idem |
| Keluaran | `keluaran/pipa.docx` dst. | `keluaran/sippa.docx`, `sippa.pdf`, `sippa-deck.pptx`, `sippa-deck.pdf` (§1) | idem |
| Spek deck | `bangun/pptx/spek/pipa-deck.json` | `naskah/sippa/deck.json` | pola yang sudah jalan di `naskah/air/deck.json` |
| Jumlah bab | 15 | 17: profil 18 provinsi menjadi bab sendiri (keputusan 6) dan sistem data menjadi bab sendiri (keputusan 33, 38) | provinsi lain "dibahas penuh" tidak muat di satu subbab |
| Huruf lampiran | A–K | A–N (§5) | BOM, RAB, profil provinsi, dan atribusi foto dipisah |
| Registri angka | berkas turunan di `data/sippa/keluaran/` (akar repo) | entri `angka.json` membaca paket `data/sippa/` di bawah `data/kajian-bnpb/data/` (§8.2) | `berkas` di `angka.json` relatif ke `data/kajian-bnpb/data/` |

---

## 1. Identitas buku

| Medan | Isi |
| --- | --- |
| Judul | Sistem Pipa Portabel Karhutla dan Banjir (SIPPA) 2026–2030 |
| Subjudul | Desain, Uji Lapangan, dan Peta Jalan Kit Relay Portabel untuk Pemadaman Bara Gambut dan Pemakaian Ganda Banjir |
| Judul pendek (kepala halaman) | Kajian SIPPA |
| Penerbit | Badan Nasional Penanggulangan Bencana (satu-satunya nama dan logo di sampul, kepala, kaki, deck; P1, keputusan 50) |
| Terbit | Desember 2026 (versi serah minggu 49, PRD §4.1); kolofon menulis tanggal versi |
| Pembaca | Kepala BNPB; pembaca kedua: Deputi Bidang Penanganan Darurat, Deputi Bidang Logistik dan Peralatan, Satgas Karhutla provinsi |
| Batas data | 23 Oktober 2026 pukul 23.59 WIB untuk semua data sekunder dan resmi; satu pengecualian bertanda: hasil pilot Oktober 2026 dan operasi banjir 2026 dari D1 `sippa_*` (diberi pil "pilot, n kecil" dan tanggal tarik sendiri, Bab 12.3) |
| Horizon | 2026–2030 |
| Cakupan | Kalimantan Tengah sampai tingkat kompleks api (865 kompleks) dan sel 2,2 km; 18 provinsi sampai tingkat provinsi (9 provinsi dengan zona A–D dari `kendala.json`) |
| Cakupan sampul | "Cakupan: 865 kompleks api Kalimantan Tengah dan 18 provinsi rawan kebakaran hutan dan lahan, dengan pemakaian ganda pada musim banjir." |
| Kata kunci | BNPB; kebakaran hutan dan lahan; gambut; kit relay portabel; injeksi bawah permukaan; banjir; SIPPA |
| Format | DOCX A4 tegak, Roboto, logo BNPB; Lampiran F gambar teknik A3 lipat (PDF tersendiri disisipkan, halaman dihitung di PDF) |
| Folder naskah | `naskah/sippa/` (bab-01.md s.d. bab-17.md, `00-depan-kata-pengantar.md`, `00-depan-ringkasan-eksekutif.md`, `90-lampiran-a.md` s.d. `90-lampiran-l.md`, `deck.json`) |
| Folder bukti | `naskah/sippa/bukti/bab-NN.md`, `bab-NN.angka.json`, `bab-NN.pustaka.json` (pola `naskah/air/bukti/`) |
| Keluaran | `keluaran/sippa.docx`, `keluaran/sippa.pdf`, `keluaran/sippa.manifest.json`, `keluaran/sippa-deck.pptx`, `keluaran/sippa-deck.pdf`, `keluaran/sippa-deck.manifest.json`; salinan bernama untuk serah "Kajian SIPPA {DDMMYY}.docx/.pdf" dan "Kajian SIPPA {DDMMYY} Paparan.pptx/.pdf" |
| QA | `keluaran/qa/slop-sippa.md`, `keluaran/qa/sippa.md`, `keluaran/qa/sippa-deck.md` |
| Gambar | `gambar/sippa/*.png` (300 dpi), `gambar/sippa/teknik/*.pdf` (A3) dan `*.png` |

Entri `tema.json` yang ditambahkan (`kajian.sippa`), bentuk sama dengan `air` dan `mitigasi`:

```json
"sippa": {
  "judul": "Sistem Pipa Portabel Karhutla dan Banjir (SIPPA) 2026–2030",
  "subjudul": "Desain, Uji Lapangan, dan Peta Jalan Kit Relay Portabel untuk Pemadaman Bara Gambut dan Pemakaian Ganda Banjir",
  "judul_pendek": "Kajian SIPPA",
  "nama_berkas": "Kajian SIPPA {DDMMYY}",
  "batas_halaman_isi": null,
  "lampiran": "ABCDEFGHIJKLMN",
  "kata_kunci": ["BNPB", "kebakaran hutan dan lahan", "gambut", "kit relay portabel", "injeksi bawah permukaan", "banjir", "SIPPA"],
  "cakupan_sampul": "Cakupan: 865 kompleks api Kalimantan Tengah dan 18 provinsi rawan kebakaran hutan dan lahan, dengan pemakaian ganda pada musim banjir."
}
```

Ditambah `qa.pustaka.kajian_min.sippa = 50` (PRD §8.3; separuh resmi atau primer; 8 sumber berbeda per bab, L65).

---

## 2. Prinsip isi

1. **Suara dan posisi BNPB.** Buku adalah dokumen keputusan program milik BNPB (keputusan 2). Kalimat aktif dengan
   pelaku lembaga ("BNPB menetapkan", "Satgas memutus"). SIPPA diposisikan sebagai pelengkap sarana yang sudah ada
   (regu darat, sekat kanal, water bombing, OMC), bukan pengganti. Heli tetap untuk front yang tidak tercapai regu darat
   dalam 6 jam (`jam_tiba`, `public/data/operasi.json`); OMC tetap keputusan BMKG dan Kemenhut.
2. **Arah ditulis langsung, tanpa bab kritik (keputusan 20).** Temuan KD §2 (K-01 sampai K-19) masuk sebagai **dasar
   desain** di bab tempat keputusan teknisnya diambil, dalam kalimat positif ("titik kerja ditetapkan di ujung
   manifold 2–4 bar karena ..."). Dilarang di naskah: frasa yang merujuk dokumen awal sebagai salah ("dokumen awal
   keliru", "klaim sebelumnya", "tidak berdasar"), daftar kesalahan, tabel putusan NO-GO per dokumen pemilik, dan
   angka Rp364 M. Pilihan yang ditutup (backbone permanen, injeksi dalam, sumur dalam sebagai bawaan, baja dan pipa
   tertanam, HDPE pasang-bongkar) ditulis sebagai **batas desain** berikut alasan fisik dan biayanya (Bab 6.6).
3. **"Terbukti" hanya dengan uji yang dikutip.** Kata "terbukti" dan turunannya hanya untuk sekat kanal dan
   pembasahan ulang dengan rujukan program resmi, dan untuk hasil uji lapangan yang dikutip dari naskah aslinya. Untuk
   SIPPA dipakai "hipotesis", "diuji pada gerbang G4", "belum diuji". `data/glosarium.json` `varian_terlarang`
   ditambah "terbukti efektif", "sudah terbukti", "teruji" tanpa rujukan (gerbang D-10, T-9). Vonis pilot dipisah dua:
   "dapat dipakai" dan "lebih baik dari cara konvensional" (Bab 12).
4. **Label keyakinan di semua angka (keputusan 29).** Empat label `tema.json` dipakai di tiap tabel, kartu angka,
   gambar data, dan chip slide, identik dengan `keyakinan` entri `angka.json`. Slot yang menunggu data (harga heli,
   radius larangan surfaktan, hasil RFQ, hasil pilot sebelum ditarik) ditulis sebagai entri berstatus `menunggu`
   yang tampil "–" dengan alasan di catatan, tidak pernah angka tebakan. Harga helikopter: kunci
   `sippa.heli.biaya_jam` dan `sippa.heli.biaya_sorti` berstatus `menunggu` sampai pemilik menyerahkan angka BNPB
   (keputusan 14); sampai itu pembanding hanya "> Rp200 juta per sorti satu jam" (pernyataan BNPB September 2023,
   `resmi`, pernyataan, bukan kontrak).
5. **Tanpa angka tanpa sumber.** Semua angka lewat token `{{angka:sippa.*}}` (D-22). Tabel dari data memakai `csv:`.
   Angka yang hanya ada di berita masuk naskah `status: draf` saja; naskah `final` menolak pustaka sekunder, jadi angka
   pembanding berita (OMC, sekat kanal, sumur dangkal) dibuka ke dokumen resmi atau dipindah ke catatan berlabel.
6. **Tanpa nama merek dan tanpa nama perusahaan (keputusan 50).** Spesifikasi alat ditulis sebagai kelas kinerja
   "atau setara" ("pompa portabel kelas 1.500 L/min pada 1,0 MPa"). Merek dan model hanya di `pustaka.json` sebagai
   rujukan lembar data dan di kolom "RUJUKAN DATASHEET" Lampiran D, bukan di badan teks, judul, gambar, atau deck. Nama
   perusahaan konsesi tidak ditulis; kompleks di konsesi disebut "di areal berizin". Logo hanya BNPB.
7. **Lantai angka tercatat.** Angka perencanaan tidak boleh lebih ringan daripada keadaan tercatat terburuk dalam
   periode acuan untuk wilayah yang sama: jumlah kit memakai luas terbakar puncak SiPongi (maksimum 2019 atau 2023),
   kebutuhan respons memakai musim 2015 sebagai musim acuan terberat (VIIRS 2012–2025), kebutuhan air memakai nilai atas
   bila probe belum ada, dan P90 Monte Carlo tidak boleh di bawah biaya realisasi pilot 2026. Angka model yang
   melampaui angka tercatat tidak masuk judul tanpa penjelasan; pita yang lebarnya lebih dari satu orde tidak masuk
   judul, kartu angka, atau Pesan Kunci.
8. **Dua versi bila hasil bergantung pada data yang belum diverifikasi.** Zona A–D Kalteng selalu tampil berdampingan:
   **konservatif** (jalan utama tersier ke atas `kendala.json` × air lama) sebagai angka perencanaan, dan
   **optimistis** (semua jalan kendaraan OSM termasuk `track` × semua air) sebagai batas atas, dengan syarat
   verifikasi lapangan per `track` sebelum kompleks dinaikkan zonanya. Hal yang sama untuk RAB (kendaraan dan perahu
   dipinjam lawan dibeli) dan BCR (inti, + banjir, + banjir + irigasi).
9. **Gerbang mendahului belanja.** Tiap tingkat anggaran T0–T4 hanya dibuka setelah gerbangnya lulus (Bab 13.2).
   Pengadaan 81 kit nasional ditulis "rencana bersyarat, bukan pengadaan" di tiap tabel, peta, dan slide. Tidak ada
   skenario jaringan permanen nasional; koridor semi-permanen paling banyak 2 dan hanya setelah musim pilot pertama.
10. **Doktrin kedalaman.** Injeksi 0–1,5 m; lengan uji 3–5 m hanya di petak yang probe 1,0 m masih > 50 °C setelah
    injeksi 1,5 m; tidak pernah > 5 m. Kalimat, tabel, atau gambar yang menyebut kedalaman injeksi > 5 m ditolak.
11. **Gambar teknik tingkat konstruksi, tetap wajib disahkan.** Tiap gambar teknik memuat blok pengesahan insinyur
    berlisensi (nama, nomor STRA/SKA, tanda tangan, tanggal) yang dikosongkan, dan baris tetap "Wajib verifikasi dan
    pengesahan insinyur berlisensi sebelum dibangun". Buku tidak menyebut gambar sebagai DED atau dokumen pengadaan.
12. **Pemakaian ganda bersyarat keras.** Banjir: pompa api head tinggi tidak dipakai untuk genangan; modul banjir
    head rendah terpisah; tidak membuang air ke kanal gambut. Irigasi: air dari sumber di luar kubah gambut, bukan air
    pemadaman atau kanal gambut; tidak boleh menurunkan muka air gambut; bila syarat tidak terpenuhi di satu kabupaten,
    manfaat irigasinya nol. Manfaat keduanya dihitung sebagai varian BCR tersendiri, tidak pernah dicampur ke BCR inti.
13. **Pembanding biaya bukan bukti keunggulan.** Perbandingan dengan heli, OMC, sekat kanal, dan regu darat dipakai
    untuk urutan besaran, karena tugasnya berbeda. Kalimat "lebih murah dari heli" tanpa satuan tugas yang sama
    dilarang.
14. **Satu register rekomendasi.** Semua rekomendasi dari register §6, ID `SR-nn`, tampil sekali di bab
    asal sebagai rujukan dan lengkap hanya di Bab 17 dan Bab 16 (peta jalan). Satu daftar keputusan yang diminta
    (KD-1 sampai KD-7, §3.5), dipakai identik di Pesan Kunci, Bab 17, dan deck.
15. **Tanpa pengulangan (L64).** Data dan pola di Bab 3–5; desain di Bab 6–8; operasi di Bab 9; lembaga di Bab 10;
    uang di Bab 13; rekomendasi di Bab 16–17. Bab lain merujuk silang (`@sub:`), tidak menyalin.
16. **Produsen data dan tiga keluaran satu sumber.** Keluaran hitungan platform Pantau Bencana bukan Data Bencana
    menurut Perban BNPB 1/2023; tiap gambar dan tabel turunan memuat pernyataan produsen di samping label. Peta dan
    grafik dibangun dari satu set data, tampil di `/pipa`, dirender PNG untuk DOCX, dan dipakai deck; angka identik di
    ketiganya.
17. **Bahasa.** Bahasa Indonesia formal, PUEBI, tanpa em dash, tanpa titik tengah, tanpa panah, tanpa emoji
    (`NASKAH-SPEK.md` §4); singkatan dieja pada kemunculan pertama tiap bab (L66); semua bab LULUS `qa/slop.py`
    (`ANTI-SLOP.md`, T-4, T-8).

---

## 3. Bagian depan

Urutan (L6): Sampul, Kolofon, Kata Pengantar, Daftar Isi, Daftar Tabel, Daftar Gambar, Daftar Lampiran, Daftar
Singkatan, Ringkasan Eksekutif, lalu BAB 1. Nomor romawi kecil. Sampul, kolofon, daftar, dan sampul belakang
dibangkitkan pembangun; yang ditulis tangan hanya Kata Pengantar dan Ringkasan Eksekutif.

### 3.1 Sampul dan sampul belakang

Sampul pola kajian air (judul, subjudul, cakupan sampul, logo BNPB, satu foto Commons beratribusi dari §7.1 topik F1
atau F2). Sampul belakang navy (L70): logo BNPB, alamat T4, satu paragraf ringkas (3 kalimat: masalah bara, bentuk
SIPPA, gerbang sebelum belanja) yang diambil dari kunci `sippa.tesis|teks`.

### 3.2 Kolofon (halaman keterangan terbitan, L70)

Dibangkitkan dari `tema.json` dan manifest: judul dan subjudul; penerbit BNPB; alamat T4; versi dan tanggal; batas
data "23 Oktober 2026 pukul 23.59 WIB" dan pengecualian data pilot; pernyataan lisensi foto (Commons, atribusi di
Lampiran N); pernyataan produsen (prinsip 16); pernyataan gambar teknik ("Gambar teknik di Lampiran F wajib
diverifikasi dan disahkan insinyur berlisensi sebelum dibangun; bukan dokumen pengadaan"); pernyataan "Spesifikasi
alat ditulis sebagai kelas kinerja; merek dalam daftar pustaka hanya rujukan lembar data, bukan anjuran pengadaan".
Tanpa tim penyusun (P1), tanpa ISBN.

### 3.3 Kata Pengantar (1–2 hlm)

Berkas `00-depan-kata-pengantar.md`, front matter `bagian: kata-pengantar`, `catatan_pemilik: draf untuk
ditandatangani Kepala BNPB; nama dan gelar sesuai deck BNPB 21 Oktober 2026 (T7, PRD T-G)`. Isi empat paragraf: (1)
mengapa bara gambut menjadi persoalan pemadaman yang belum terjawab sarana udara; (2) apa itu SIPPA dalam satu
kalimat; (3) pendekatan bergerbang: uji dulu, belanja kemudian; (4) harapan kepada Satgas, Manggala Agni, BPBD, dan
YonTP. Tanpa objek bernomor, tanpa angka selain tahun.

### 3.4 Ringkasan Eksekutif (dua lapis, `00-depan-ringkasan-eksekutif.md`)

**Lapis keputusan (2 hlm, dapat dibaca terpisah).**

Halaman 1, Pesan Kunci (B5.26, L14). Kalimat pertama = token `{{angka:sippa.tesis|teks}}`. Bunyi tesis (kunci entri
teks, angkanya bertoken di dalamnya):

> "Api di Kalimantan Tengah tidak datang setiap tahun, tetapi kembali ke tempat yang sama: {sel85} deteksi 2023 jatuh
> di sel 2,2 km yang sudah terbakar tiga tahun atau lebih, dan {ab} kompleks api 2026 berada dalam 2,5 km dari sumber
> air. SIPPA menjawabnya dengan kit relay portabel yang dipra-posisikan ke lokasi yang sudah bisa ditebak, membasahi
> bara pada kedalaman 0–1,5 m, lalu dipindah ke daerah banjir pada musim hujan; pengadaan hanya dibuka setelah
> gerbang uji lulus."

`{sel85}` = `sippa.sel22.kalteng.deteksi_2023_sel_berulang_persen` (85%, `terverifikasi`); `{ab}` =
`sippa.zona.kalteng.konservatif.ab.persen` (70%, `terverifikasi`).

Tujuh temuan bernomor (satu berangka, paling banyak 3 baris, ikon putih dalam lingkaran navy):

| No | Bagian | Temuan (bentuk) | Kunci utama | Keyakinan |
| --- | --- | --- | --- | --- |
| 1 | A Pola api | Deteksi VIIRS Kalteng selatan {2015} pada 2015 dan di bawah {1.000} per tahun pada 2020–2022: aset tetap akan diam di sebagian besar tahun | `sippa.viirs.kalteng.2015`, `sippa.viirs.kalteng.maks_2020_2022` | terverifikasi |
| 2 | A Pola api | {85%} deteksi 2023 dan {72%} deteksi 2019 jatuh di sel 2,2 km yang sudah aktif tiga tahun atau lebih sebelumnya: lokasi api bisa ditebak | `sippa.sel22.kalteng.deteksi_2023_sel_berulang_persen`, `..._2019_...` | terverifikasi |
| 3 | B Kelayakan | {606} dari 865 kompleks Kalteng ({70%}) berada di zona A dan B yang dapat dilayani kit (versi konservatif); {170} kompleks zona D tidak dilayani kit | `sippa.zona.kalteng.konservatif.ab.n`, `.d.n` | terverifikasi |
| 4 | B Kelayakan | 18 provinsi membutuhkan {81} kit bila skala dibuka, {56} di provinsi gambut; zona D mencakup {34%} kompleks di sembilan provinsi dan {53%} di Papua Selatan | `sippa.kit.nasional.n`, `sippa.zona.sembilan.d.persen` | asumsi-kebijakan (kit), terverifikasi (zona) |
| 5 | C Desain | Bara gambut berada pada {0,3–0,5} m; doktrin injeksi 0–1,5 m dengan lengan uji 3–5 m dan batas mutlak 5 m | `sippa.bara.kedalaman_m` | terverifikasi |
| 6 | C Desain | Relay DN100 sepanjang 1 km pada 10 L/s kehilangan sekitar {17} m head per km; satu pompa kelas 1.500 L/min cukup tanpa booster untuk 1 km | `sippa.hid.dn100_10ls.hf_m_per_km` | estimasi-model |
| 7 | E Biaya dan jalan | Pilot dua musim dengan 3 kit dan 3 modul banjir: {Rp13,7–18,9 M} bila kendaraan dipinjam; tidak ada belanja skala sebelum gerbang G5 | `sippa.rab.t2.pinjam` | asumsi-kebijakan |

Pita keputusan ringkas di kaki Pesan Kunci: KD-1, KD-2, KD-3 (kode dan satu baris pilihan, §3.5).

Halaman 2: direktif `keputusan` memuat KD-1 sampai KD-7 dengan akibat tiap pilihan (B5.25); 5 kartu angka (kartu
pertama: jumlah kompleks Kalteng yang dapat dilayani kit, versi konservatif; lalu kit nasional bersyarat, kedalaman
bara, CAPEX pilot T2, biaya pembanding heli per sorti); daftar rekomendasi 100 hari berlembaga (SR-01 sampai SR-04,
SR-19).

**Lapis rincian (4–6 hlm).** Tujuh temuan lengkap gaya Isi Temuan (`::: temuan`), satu peta (Gambar RE.1 zona A–D
Kalteng versi konservatif, dari spek `sippa-01`), ringkasan gerbang G0–G6 (satu tabel 7 baris), ringkasan RAB
bertingkat (satu tabel T0–T4), tiga risiko teratas (R04, R01, R05), tiga kapasitas yang sudah ada (regu Manggala
Agni dan Daops, sekat kanal, pompa dan selang BPBD), dan yang belum diketahui (lima butir dari KD §7.1).

### 3.5 Keputusan yang diminta dari Kepala BNPB (KD-1 sampai KD-7, khusus buku ini)

Kode KD di buku ini berdiri sendiri (tidak berhubungan dengan KD-1 sampai KD-5 kajian air). Dikunci di Bab 17 dan
dipakai identik di Pesan Kunci dan deck slide 1 dan 15.

| Kode | Keputusan | Pilihan dan akibat | Waktu |
| --- | --- | --- | --- |
| KD-1 | Menetapkan SIPPA sebagai program uji bergerbang BNPB 2026–2028 dengan nota putusan tertulis | (a) Tetapkan: pilot 2027–2028 berjalan dengan gerbang G0–G5 tertulis; pengadaan skala tertutup sampai G5 lulus; permintaan pembelian di luar tingkat T2 ditolak dengan dasar nota. (b) Tunda: musim kemarau 2027 lewat tanpa data A/B; keputusan skala 2029 tidak punya dasar dan tekanan pembelian besar tanpa uji tetap terbuka (R04) | hari ke-0 sampai 14 |
| KD-2 | Mengizinkan pemakaian ganda banjir November–Desember 2026 dengan alat pinjam dan modul banjir terpisah, bila vonis pilot "dapat dipakai" | (a) Izinkan: kit pinjam dan pompa banjir BPBD dipindah ke kabupaten banjir dengan transport YonTP; log jam pompa dan m³ menjadi data pertama manfaat banjir di BCR. (b) Tidak: varian BCR + banjir tetap bertumpu pada asumsi sampai musim hujan 2027/2028 | minggu 45 (2–8 Nov 2026) |
| KD-3 | Menyetujui tingkat anggaran T1 (Fase 0 2027) dan mencadangkan T2 (3 kit pilot, 3 modul banjir) bersyarat gerbang G0–G2 | (a) Setujui: survei tapak, bench test, izin air, dan protokol A/B selesai sebelum kemarau 2027; pengadaan 3 kit Mei 2027 hanya bila G2 lulus. (b) Hanya T1: pilot 2027 memakai alat pinjam, A/B berjalan dengan alat tak seragam, G3 dan G4 lebih sulit diputus | 100 hari |
| KD-4 | Menugaskan kelembagaan: komando Satgas Karhutla provinsi, operator inti Manggala Agni, YonTP untuk gudang, tenaga gelar, dan transport, dengan aset BMN BNPB lewat pinjam pakai | (a) Tugaskan dan mulai MoU pinjam pakai BMN dengan TNI dan nota kesepahaman operator dengan Kemenhut: gudang dan transport antar-daerah tersedia untuk siklus karhutla-banjir. (b) Tanpa MoU: kit tersimpan di gudang BNPB pusat; waktu pra-posisi dan pindah ke banjir bertambah dan tidak terukur | 2026–2027 |
| KD-5 | Menyerahkan angka kontrak helikopter water bombing BNPB dan menugaskan surat permintaan data ke 10 instansi | (a) Serahkan: tabel pembanding Bab 13 dan varian BCR "heli-hari terhindar" terisi dari angka kontrak. (b) Tidak: pembanding tetap hanya pernyataan "> Rp200 juta per sorti", varian heli tampil "–" | 100 hari |
| KD-6 | Menunjuk evaluator independen dan menetapkan aturan berhenti | (a) Tunjuk Januari 2027: protokol A/B pra-registrasi dikunci sebelum musim; bila G4 gagal, kit dilebur ke inventaris pompa biasa tanpa sengketa. (b) Tidak: hasil pilot dinilai pelaksana sendiri dan tidak dapat dipakai sebagai dasar skala | 2026–2027 |
| KD-7 | Membuka skema pinjam pompa banjir untuk irigasi kelompok tani di luar KHG pada Maret–April | (a) Buka sebagai uji di satu kabupaten 2027 dengan syarat keras (air dari luar kubah gambut, BBM ditanggung peminjam): varian BCR + irigasi mendapat data. (b) Tidak: manfaat irigasi tetap nol di semua hitungan | 2026–2027 |

**Keputusan 14 hari pertama (hanya instrumen yang sudah ada):** (1) nota putusan KD-1; (2) surat ke BPBD Kalteng dan
Satgas tentang vonis pilot dan rencana banjir (KD-2); (3) penugasan Pusdatinkom untuk 10 surat permintaan data
(Lampiran I); (4) penyerahan angka heli internal (KD-5); (5) penugasan unit penyusun KAK Fase 0 dan protokol A/B.

### 3.6 Daftar singkatan

Dibangkitkan dari `data/glosarium.json`. Entri baru yang wajib ditambahkan (bentuk: singkatan, kepanjangan, definisi
satu kalimat untuk glosarium Lampiran M): AOI (wilayah kajian pilot), A/B (uji banding lengan), BBM, BCR, BMN, BOM,
BRGM, BWS, CAPEX, CHIRPS, DEM, DEMNAS, DN (diameter nominal), DSM, FAT, FEED, FRP, FWI, GA (gambar susunan), GSW,
HDPE, KHG, LKPP, MCD64A1, NPSH, NPV, OD, OPEX, OSM, P&ID, PFAS, PN (tekanan nominal), RAB, RACI, RFQ, SDR, SIPPA, SOP,
TCO, TDH, TMA, VIIRS, YonTP. Istilah tanpa singkatan yang masuk glosarium: layflat, lance, manifold, relay, booster,
kopling Storz, foot valve, totalizer, piezometer, dingin terverifikasi, kompleks api, sel 2,2 km, zona A–D, modul
banjir, depot depan, gudang induk, pra-posisi, nyala ulang, head gesek, head minor, derating suhu, lonjakan tekanan.

---

## 4. Bab demi bab

Pola tiap bab: judul baku; subbab; pertanyaan kunci (menjadi front matter `pertanyaan`, digabung satu kalimat
majemuk); isi per subbab; angka wajib (kunci registri, nilai acuan, berkas sumber, keyakinan); objek bernomor (jenis,
kode pilihan grafik, data, generator); rekomendasi yang lahir di bab itu; alokasi halaman (perkiraan); berkas bukti.
Tiap bab dibuka `::: ringkasan-bab` (Temuan, Angka kunci, Rekomendasi) dengan BLUF (L59) dan ditutup paragraf
"Implikasi bagi keputusan" yang merujuk KD. Paket data turunan yang disebut `data/sippa/...` berada di
`data/kajian-bnpb/data/sippa/` (§8.2).

### BAB 1 PENDAHULUAN (6 hlm)

- **Subbab:** 1.1 Latar Belakang; 1.2 Bara Gambut sebagai Celah Pemadaman; 1.3 Tujuan dan Keluaran; 1.4 Lingkup,
  Horizon, dan Batas Kajian; 1.5 Kedudukan terhadap Kebijakan Karhutla yang Berlaku; 1.6 Sistematika Buku.
- **Pertanyaan kunci:**
  1. Mengapa BNPB memerlukan sarana pemadaman bara bawah permukaan di samping water bombing, OMC, dan regu darat?
  2. Apa yang dicakup dan apa yang tidak dicakup buku ini (bukan DED, bukan pengadaan, bukan jaringan permanen)?
  3. Di mana SIPPA berdiri terhadap kewenangan Kemenhut (Manggala Agni), BRGM, BPBD, dan Satgas?
- **Isi per subbab:**
  - 1.1 Musim 2015, 2019, dan 2023 di Kalteng; luas terbakar resmi; personel yang dikerahkan 2026.
  - 1.2 Sarana udara memadamkan nyala permukaan; bara gambut terus menyala di bawah permukaan dan memicu nyala ulang;
    kecepatan padam ditentukan luas yang bisa dicari, ditusuk, disiram, dan dicek regu per hari (KD §1).
  - 1.3 Tujuan PRD §1.2 butir 1–4 dalam satu paragraf; keluaran: buku, deck, alat kerja `/pipa`.
  - 1.4 Kalteng rinci, 18 provinsi tingkat provinsi; 2026–2030; batas: gambar wajib pengesahan insinyur, angka harga
    wajib RFQ, efikasi belum diuji.
  - 1.5 UU 24/2007 (peran BNPB pada prabencana dan tanggap darurat); Inpres atau peraturan karhutla yang berlaku
    dirujuk dari korpus JDIH lokal (`data/raw/hukum/teks`, skill `hukum-bnpb`); Permen LHK P.32/2016 (pengendalian
    karhutla, Manggala Agni); PP 57/2016 (gambut). Tanpa pasal TNI (keputusan 22).
- **Angka wajib:**

| Kunci | Nilai acuan | Berkas sumber | Keyakinan |
| --- | --- | --- | --- |
| `sippa.luas.kalteng.2019` | 317.749 ha | `public/data/luas_resmi.json` (disalin ke `data/sippa/luas_resmi.csv`) | resmi |
| `sippa.luas.kalteng.2023` | 165.896 ha | idem | resmi |
| `sippa.personel.kalteng.total` | 4.686 orang (per 12 Okt 2026; ditarik ulang per 23 Okt) | `public/data/operasi.json` | resmi |
| `sippa.personel.kalteng.manggala_agni` | 176 | idem | resmi |
| `sippa.daops.kalteng.n`, `.regu`, `.anggota` | 4 Daops, 14 regu, 210 anggota | idem | resmi |
| `sippa.heli.armada_2026` | 33 heli | rekap BNPB 12 Okt 2026 (dibuka ke dokumen sebelum `final`) | resmi |

- **Objek:** Gambar 1.1 alur empat lapis SIPPA dari pencegahan sampai verifikasi (diagram, G21 diagram aliran
  berikon, generator `bangun/visual/teknik/lapis.mjs`); Tabel 1.1 lingkup dan batas kajian (tabel teks: termasuk,
  tidak termasuk, alasan); Tabel 1.2 kedudukan terhadap peraturan (B5.7, kolom PERATURAN, PASAL, PENGATURAN, KAITAN
  SIPPA); foto F1 (§7.1) sebagai pembuka bab.
- **Rekomendasi asal:** tidak ada (bab pengantar).
- **Bukti:** `naskah/sippa/bukti/bab-01.md` (Inti, Temuan bersumber, Inferensi, Celah per pertanyaan, L57).

### BAB 2 BARA GAMBUT DAN CARA MEMADAMKANNYA (8 hlm)

- **Subbab:** 2.1 Gambut, Muka Air Tanah, dan Kedalaman Bakar; 2.2 Kebutuhan Air per Volume Gambut Membara; 2.3
  Sifat Hidrofobik dan Penetrasi Air; 2.4 Injeksi Dangkal dengan Lance; 2.5 Surfaktan Bebas PFAS sebagai Lengan Uji;
  2.6 Verifikasi Dingin.
- **Pertanyaan kunci:**
  1. Di kedalaman berapa bara gambut berada, dan mengapa tidak lebih dalam dari muka air tanah?
  2. Berapa air yang dibutuhkan per volume gambut membara, dan dari mana angka perencanaannya?
  3. Apa yang diketahui dan belum diketahui tentang injeksi dangkal dan surfaktan?
  4. Kapan sebuah petak dinyatakan dingin?
- **Isi per subbab:**
  - 2.1 Gambut di bawah muka air jenuh tidak membara; kedalaman bakar terukur 0,3–0,5 m (Page dkk. 2002; Ballhorn
    dkk. 2009, dicek ke naskah asli sebelum `final`); PP 57/2016 kriteria kerusakan 0,4 m. Dasar desain: doktrin 0–1,5
    m, lengan uji 3–5 m, batas mutlak 5 m.
  - 2.2 Air dihitung per m³ gambut membara hasil probe (KD K-08); nilai perencanaan bawah, tengah, atas; uji lab UI
    3,81–4,22 L/kg; Santoso dkk. 2021 7,2 L/m².
  - 2.3 Gambut kering bersifat hidrofobik; penetrasi dari permukaan lambat; alasan fisik injeksi.
  - 2.4 Debit lance 15–40 L/min pada 2–4 bar; orifis dari bench (8 lubang 2 mm sekitar 19 L/min pada 2 bar); bukti
    lapangan baru satu uji (Palangka Raya 2021): status hipotesis.
  - 2.5 Surfaktan Class A 0,1–0,3% bebas PFAS; lembar data ekotoksisitas; zona larangan dari intake air minum dan
    perairan ikan (radius `menunggu`); kecepatan penetrasi diukur dari probe, klaim kecepatan pabrikan tidak dipakai.
  - 2.6 Definisi "dingin terverifikasi": semua probe 0,1/0,3/0,5/1,0 m < 50 °C pada cek 24 dan 72 jam dan tanpa nyala
    ulang pada cek 7 hari (ambang usulan, bukan standar pemerintah); drone termal hanya penyaring permukaan.
- **Angka wajib:**

| Kunci | Nilai acuan | Sumber | Keyakinan |
| --- | --- | --- | --- |
| `sippa.bara.kedalaman_m` (rendah 0,3, tinggi 0,5) | 0,3–0,5 m | pustaka `page-2002-...`, `ballhorn-2009-...` | terverifikasi |
| `sippa.bara.pp57_kriteria_m` | 0,4 m | pustaka PP 57/2016 | resmi |
| `sippa.air.m3_per_ha.rendah` | 72 m³/ha | `public/data/operasi.json` (`air_bara` lo), pustaka Santoso dkk. 2021 | terverifikasi |
| `sippa.air.m3_per_ha.tengah` | 200 m³/ha | `operasi.json` | asumsi-kebijakan |
| `sippa.air.m3_per_ha.atas` | 500 m³/ha | `operasi.json` | asumsi-kebijakan |
| `sippa.air.lab_l_per_kg` | 3,81–4,22 L/kg | pustaka Mulyasih (UI) | terverifikasi |
| `sippa.lance.debit_l_min` | 15–40 L/min | PRD §6.5, pustaka A2 (baca-A) | asumsi-kebijakan (sampai bench G2) |
| `sippa.surfaktan.dosis_persen` | 0,1–0,3% | pustaka lembar data kelas Class A | terverifikasi |
| `sippa.surfaktan.radius_larangan_m` | `menunggu` (kajian lingkungan Fase 0) | | menunggu |
| `sippa.verifikasi.ambang_c` | 50 °C | pustaka A2 | asumsi-kebijakan |

- **Objek:** Gambar 2.1 penampang gambut: muka air tanah, zona bara, kedalaman lance 1,5 m dan 3–5 m, probe empat
  kedalaman (diagram teknik, generator `teknik/penampang.mjs`, skala vertikal tertulis); Tabel 2.1 koefisien air
  per ha dan per kg dengan keyakinan (B5.7, `keyakinan: campuran`); Gambar 2.2 rentang debit lance per diameter
  orifis pada 2–4 bar (G12 rentang, `grafik.mjs rentang`, data `data/sippa/lance_orifis.csv` hitungan orifis
  `estimasi-model; belum diuji balik`); `::: catatan` definisi dingin terverifikasi; foto F3 (probe atau gambut
  terbakar).
- **Rekomendasi asal:** SR-06 (bench lance dan surfaktan di G2).
- **Bukti:** `bukti/bab-02.md`; pustaka minimum 8 sumber berbeda, sebagian besar jurnal primer.

### BAB 3 POLA API: KAPAN DAN DI MANA (10 hlm)

- **Subbab:** 3.1 Deteksi Satelit per Tahun 2012–2025; 3.2 Kekerapan per Sel 2,2 km; 3.3 Keterpredikian Lokasi:
  Uji 2019 dan 2023; 3.4 Riwayat Area Terbakar 2001–2025; 3.5 Kemarau Juli–Oktober dan Tahun Terkering; 3.6 Luas
  Terbakar Resmi 18 Provinsi.
- **Pertanyaan kunci:**
  1. Seberapa episodik api Kalteng dari tahun ke tahun?
  2. Seberapa terpusat deteksi di sel yang sama, dan seberapa jarang sel yang terbakar hampir tiap tahun?
  3. Seberapa baik riwayat tiga tahun memprediksi lokasi api musim berikutnya?
  4. Tahun mana yang terkering, dan bagaimana luas terbakar resmi tersebar di 18 provinsi?
- **Isi per subbab:**
  - 3.1 VIIRS S-NPP Kalteng selatan (bbox lon 111,0–114,6, lat −3,6 s.d. −1,5; tepi Kalsel ikut, ditulis di catatan).
    Dasar desain: aset tetap akan diam di sebagian besar tahun, sehingga aset harus bergerak.
  - 3.2 Tabel ambang ≥ 3/5/7/10 dari 14 tahun: porsi sel lawan porsi deteksi.
  - 3.3 72% deteksi 2019 dan 85% deteksi 2023 di sel aktif ≥ 3 tahun sebelumnya: dasar pra-posisi; hanya 61 sel aktif
    ≥ 10 tahun: dasar batas koridor semi-permanen.
  - 3.4 MODIS MCD64A1 2001–2025: jumlah tahun terbakar per kompleks (jendela 2,3 km dan 5 km).
  - 3.5 CHIRPS anomali Juli–Oktober per tahun; empat tahun terkering 2006, 2015, 2002, 2019; hubungan dengan pemicu
    pra-posisi (Bab 9.2).
  - 3.6 Luas SiPongi per provinsi 2019 dan 2023; dasar jumlah kit Bab 5.
- **Angka wajib:**

| Kunci | Nilai acuan | Berkas sumber | Keyakinan |
| --- | --- | --- | --- |
| `sippa.viirs.kalteng.<tahun>` (2012–2025) | 2015 169.782; 2019 76.211; 2023 26.771; 2020 750; 2021 716; 2022 527 | `data/sippa/viirs_tahunan.csv` dari `scripts/data/sippa/sel22.py` atas `data/raw/firms/viirs*.csv` | terverifikasi |
| `sippa.viirs.kalteng.maks_2020_2022` | 750 | idem | terverifikasi |
| `sippa.sel22.kalteng.ge<n>.sel`, `.porsi_sel_persen`, `.porsi_deteksi_persen` (n = 3, 5, 7, 10) | ≥3: 6.212 / 56,8% / 81,9%; ≥7: 825 / 7,5% / 18,4%; ≥10: 61 / 0,6% / 0,7% | `data/sippa/sel22.json` | terverifikasi |
| `sippa.sel22.kalteng.deteksi_2019_sel_berulang_persen` | 72% | idem | terverifikasi |
| `sippa.sel22.kalteng.deteksi_2023_sel_berulang_persen` | 85% | idem | terverifikasi |
| `sippa.mcd.kalteng.kompleks_ge3_tahun` | 300 dari 865 | `pipa/data/area_terbakar.csv` (disalin ke `data/sippa/`) | terverifikasi |
| `sippa.chirps.kalteng.anomali.<tahun>` | 2015 −55%; 2019 −44%; 2023 −16% | `pipa/data/chirps_anomali_tahunan.csv`, `chirps_ringkas.csv` | terverifikasi |
| `sippa.chirps.kalteng.terkering_urut` (teks) | 2006, 2015, 2002, 2019 | `chirps_ringkas.csv` | terverifikasi |
| `sippa.luas.<prov>.puncak` (18 prov) | per provinsi | `data/sippa/luas_resmi.csv` | resmi |

- **Objek:** Gambar 3.1 deteksi VIIRS per tahun 2012–2025 (G1 batang tegak, 14 periode, satu seri, label nilai hanya
  2015, 2019, 2023; `grafik.mjs batang`; spek `sippa-03`); Gambar 3.2 peta kekerapan sel 2,2 km Kalteng (G19
  koroplet sel 5 kelas diskret 1–2, 3–4, 5–6, 7–9, ≥ 10 tahun, ramp api satu warna; perender sel baru §8.3; spek
  `sippa-04`); Tabel 3.1 ambang kekerapan: sel lawan deteksi (B5.7, `csv:`); Gambar 3.3 keterpredikian: porsi
  deteksi 2019 dan 2023 di sel berulang (G14 pasangan batang, spek `sippa-05`); Gambar 3.4 sebaran jumlah tahun
  terbakar per kompleks 2001–2025 (G1 batang per jumlah tahun 0–25, spek `sippa-06`); Gambar 3.5 anomali CHIRPS
  Juli–Oktober 2001–2025 (G7 divergen dari nol, warna arah T2, label kata "lebih kering"/"lebih basah", spek
  `sippa-07`); Tabel 3.2 luas terbakar puncak 18 provinsi (B5.7, `csv: data/sippa/luas_resmi.csv`, `urut: -puncak`).
- **Rekomendasi asal:** SR-12 (pemicu pra-posisi harian).
- **Bukti:** `bukti/bab-03.md`; skrip `sel22.py` wajib self-check `__main__` sebelum angka dipakai.

### BAB 4 KELAYAKAN KIT DI KALIMANTAN TENGAH (12 hlm)

- **Subbab:** 4.1 Aturan Zona A–D; 4.2 Zona Versi Konservatif dan Versi Optimistis; 4.3 Jarak ke Air dan ke Jalan;
  4.4 Beda Elevasi Air dan Kompleks; 4.5 Air yang Tidak Terlihat Satelit; 4.6 Zona per Kabupaten; 4.7 Calon Wilayah
  Pilot.
- **Pertanyaan kunci:**
  1. Berapa kompleks api Kalteng yang dapat dilayani kit, dan berapa yang tidak?
  2. Seberapa besar hasil zona bergantung pada jalan `track` OpenStreetMap, dan bagaimana keraguan itu ditutup?
  3. Apa yang diketahui dari elevasi dan citra air tentang kesulitan memompa dan debit kemarau?
  4. Di mana tiga wilayah pilot 2027 dipilih, dan mengapa?
- **Isi per subbab:**
  - 4.1 Rumus zona PRD §5.1 dengan ambang air 2,5 km dan jalan 5 km (keputusan 30); kompleks tanpa data jalan dihitung
    jauh. Dasar desain: kit melayani A dan B; C memakai sumur dangkal; D tidak dipra-posisikan.
  - 4.2 Dua versi berdampingan; pergeseran 263 kompleks B ke A dan 83 D ke C berasal dari `track`; versi konservatif
    menjadi angka perencanaan; kenaikan zona hanya setelah verifikasi lapangan (`jalan_terverifikasi`).
  - 4.3 Median dan p90 jarak air dan jalan; 44 kompleks tanpa jalan kendaraan OSM dalam 16 km.
  - 4.4 Median beda elevasi −3,9 m (DSM berkanopi): pompa hampir selalu mendorong ke atas; profil trase dari DEMNAS
    wajib per AOI.
  - 4.5 GSW di titik air terdekat 120 permanen, 103 musiman, 642 tidak terdeteksi; "tidak terdeteksi" bukan kering;
    gerbang G1 (debit terukur) tidak dapat dilewati.
  - 4.6 Tabel zona per kabupaten (dua versi).
  - 4.7 Calon AOI: satu mudah (Kota Palangka Raya, Bukit Batu/Jekan Raya), satu menengah (Pulang Pisau), satu sulit
    (Kapuas, Mantangai), dengan saringan berangka KD §3.2; status "belum disurvei"; AOI di areal berizin hanya dengan
    persetujuan tertulis; nama perusahaan tidak ditulis.
- **Angka wajib:**

| Kunci | Nilai acuan | Berkas sumber | Keyakinan |
| --- | --- | --- | --- |
| `sippa.kompleks.kalteng.n` | 865 | `pipa/data/kompleks.csv` | terverifikasi |
| `sippa.kompleks.kalteng.gambut` | 644 | `kendala.json` | terverifikasi |
| `sippa.zona.kalteng.konservatif.<a,b,c,d>.n` | 188, 418, 89, 170 | `data/sippa/zona.json` dari `scripts/data/sippa/zona.py` atas `osm_jarak.csv` | terverifikasi |
| `sippa.zona.kalteng.optimistis.<a,b,c,d>.n` | 469, 158, 167, 71 | idem | terverifikasi |
| `sippa.zona.kalteng.konservatif.ab.n`, `.ab.persen` | 606; 70% | idem | terverifikasi |
| `sippa.zona.kalteng.optimistis.ab.persen` | 72% | idem | terverifikasi |
| `sippa.zona.kalteng.pindah_b_ke_a`, `.pindah_d_ke_c` | 263; 83 | `pipa/data/matriks_jarak.md` (tabel perpindahan) | terverifikasi |
| `sippa.jarak.air.median_km`, `.p90_km` | 1,02; 5,79 | `osm_jarak.csv` | terverifikasi |
| `sippa.jarak.air_kecil.median_km` | 1,67 | idem | terverifikasi |
| `sippa.jarak.jalan.median_km`, `.p90_km` | 2,27; 11,74 | idem | terverifikasi |
| `sippa.jarak.tanpa_jalan_16km.n` | 44 | idem | terverifikasi |
| `sippa.dem.beda_median_m` | −3,9 m | `pipa/data/dem_elevasi.csv` | terverifikasi |
| `sippa.gsw.<permanen,musiman,tak_terdeteksi>.n` | 120; 103; 642 | `pipa/data/gsw_air_terdekat.csv` | terverifikasi |
| `sippa.aoi.<kode>.kekerapan_sel`, `.median_air_km` | KD §3.2 | `data/sippa/aoi_calon.json` | terverifikasi (saringan) |

- **Objek:** Gambar 4.1 peta zona A–D per kompleks versi konservatif (titik berwarna kategori A–D, empat warna
  kategorikal urutan tetap, legenda empat kelas; `peta.mjs` lapisan titik; spek `sippa-01`, dipakai juga sebagai
  Gambar RE.1); Gambar 4.2 peta yang sama versi optimistis (peta kecil berganda dengan 4.1, skala dan warna identik,
  spek `sippa-02`); Tabel 4.1 matriks zona dua versi dan tabel perpindahan (B5.7, `csv: data/sippa/zona_versi.csv`);
  Gambar 4.3 sebaran jarak ke air dan ke jalan (G12 rentang median dan p90 per ukuran jarak, spek `sippa-08`); Gambar
  4.4 sebaran beda elevasi air lawan kompleks (G1 batang per kelas 1 m, spek `sippa-09`); Tabel 4.2 status air GSW
  (B5.7); Tabel 4.3 zona per kabupaten dua versi (B5.7, `grup: KABUPATEN`, `total: ya`); Tabel 4.4 calon AOI (B5.7,
  kolom KAB/KOTA, KECAMATAN, KEKERAPAN SEL, MEDIAN AIR, KELAS MEDAN, STATUS LAHAN, CATATAN); `::: catatan` pernyataan
  produsen dan atribusi OSM (ODbL).
- **Rekomendasi asal:** SR-05 (pemilihan AOI, persetujuan pemegang hak, izin air), SR-20 (verifikasi `track` dan
  pelengkapan `akses.json`).
- **Bukti:** `bukti/bab-04.md`; keterbatasan dari `pipa/data/README.md` disalin ke Celah.

### BAB 5 KEBUTUHAN KIT 18 PROVINSI (16 hlm)

- **Subbab:** 5.1 Rumus Jumlah Kit per Provinsi; 5.2 Provinsi Gambut; 5.3 Provinsi Mineral dan Sabana; 5.4 Zona A–D
  di Sembilan Provinsi; 5.5 Profil 18 Provinsi; 5.6 Depot dan Musim Banjir Pasangan.
- **Pertanyaan kunci:**
  1. Berapa kit yang dibutuhkan tiap provinsi bila skala dibuka setelah gerbang G5, dan seberapa peka angka itu
     terhadap asumsi?
  2. Di provinsi mana kit tidak menjawab sebagian besar kompleks (zona D)?
  3. Di mana depot diusulkan dan ke mana kit dipindah pada musim banjir?
- **Isi per subbab:**
  - 5.1 Kit = luas puncak SiPongi (maks 2019 atau 2023) dibagi sekitar 22.700 ha per kit, dibulatkan, minimal 1 bila
    luas puncak ≥ 10.000 ha di gambut atau sabana; kit mineral dan sabana 75% biaya kit gambut; kepekaan ±50% (Bab
    13.7). Dasar: prinsip lantai angka tercatat (§2 butir 7).
  - 5.2 Delapan provinsi gambut: Sumsel 15, Kalteng 14, Kalsel 8, Kalbar 7, Riau 4, Kaltim 3, Jambi 3, Lampung 2
    (jumlah 56).
  - 5.3 Sepuluh provinsi mineral dan sabana: Papua Selatan 7, NTT 6, NTB 3, Jatim 2, Maluku 2, Sultra 1, Sulsel 1,
    Sulteng 1, Jabar 1, Jateng 1 (jumlah 25); konfigurasi tanpa lance dan node suhu gambut.
  - 5.4 Zona dari `kendala.json` untuk sembilan provinsi yang tercakup; D 34% di sembilan provinsi, 53% di Papua
    Selatan; provinsi tanpa data zona ditulis "zona belum dihitung" dengan permintaan data.
  - 5.5 **Satu provinsi satu profil bertemplat identik (L20, S26)**, urut kit terbanyak: kartu 4 angka (luas puncak,
    tahun puncak, kit bersyarat, porsi zona D atau "belum dihitung"), peta kecil provinsi (titik kompleks bila ada),
    musim kemarau dan musim banjir pasangan, depot calon (Daops atau BPBD), kelas kit (gambut atau mineral),
    catatan khusus satu kalimat. 18 profil x 2 profil per halaman = 9 hlm di badan teks; versi dasbor lengkap di
    Lampiran C.
  - 5.6 Pasangan musim: kit gambut di provinsi berpasangan banjir mendapat modul banjir (Kalteng, Kalsel, Kalbar,
    Sumsel, Riau, Jambi, Kaltim, Lampung); NTT dan Papua Selatan ditimbang per kasus.
- **Angka wajib:**

| Kunci | Nilai acuan | Berkas sumber | Keyakinan |
| --- | --- | --- | --- |
| `sippa.kit.ha_per_kit` | sekitar 22.700 ha | `data/sippa/kit_nasional.json` dari `scripts/data/sippa/nasional.py` | asumsi-kebijakan |
| `sippa.kit.<prov>.n` (18) | daftar 5.2–5.3 | idem | asumsi-kebijakan |
| `sippa.kit.nasional.n`, `.gambut`, `.mineral` | 81; 56; 25 | idem | asumsi-kebijakan |
| `sippa.kit.mineral_porsi_biaya` | 75% | idem | asumsi-kebijakan |
| `sippa.kit.nasional.n_rendah`, `.n_tinggi` | kepekaan ±50% ha per kit (dihitung) | idem | asumsi-kebijakan |
| `sippa.zona.sembilan.d.persen` | 34% | `data/sippa/zona_provinsi.csv` dari `kendala.json` | terverifikasi |
| `sippa.zona.papua_selatan.d.persen` | 53% | idem | terverifikasi |
| `sippa.luas.<prov>.puncak`, `.tahun_puncak` | per provinsi | `data/sippa/luas_resmi.csv` | resmi |
| `sippa.banjir.<prov>.kejadian_2015_2025` | per provinsi | `data/dibi/rekap_provinsi_tahunan.csv` | resmi |

- **Objek:** Gambar 5.1 peta Indonesia jumlah kit bersyarat per provinsi (G20 simbol sebanding tiga ukuran legenda,
  warna dua kelas gambut lawan mineral; pil "rencana bersyarat, bukan pengadaan"; spek `sippa-10`); Tabel 5.1 kit per
  provinsi (B5.7, `csv: data/sippa/kit_nasional.csv`, `grup: KELOMPOK`, `total: ya`, kolom PROVINSI, LUAS PUNCAK
  (ha), TAHUN, KIT, KIT RENDAH, KIT TINGGI, KELAS); Gambar 5.2 porsi zona A–D di sembilan provinsi (G8 batang
  bertumpuk 100%, empat kategori, urutan warna sama dengan Gambar 4.1, spek `sippa-11`); 18 profil provinsi
  (komponen profil wilayah B5.x bertemplat, data `data/sippa/profil_provinsi.csv`, peta kecil dari `peta.mjs` spek
  `sippa-p-<kode>`); Tabel 5.2 depot calon dan musim banjir pasangan (B5.7).
- **Rekomendasi asal:** SR-17 (rencana nasional bertahap bersyarat).
- **Bukti:** `bukti/bab-05.md`; tiap profil punya satu baris sumber; provinsi tanpa `kendala.json` diberi Celah.

### BAB 6 DESAIN SIPPA (10 hlm)

- **Subbab:** 6.1 Empat Lapis Sistem; 6.2 Doktrin per Zona; 6.3 Kit Gambut dan Kit Mineral; 6.4 Modul Banjir; 6.5
  Siklus Tahunan Kit; 6.6 Batas Desain.
- **Pertanyaan kunci:**
  1. Apa bentuk sistem SIPPA dari pencegahan sampai verifikasi?
  2. Sarana apa dipakai di tiap zona, dan apa yang sengaja tidak dipakai?
  3. Bagaimana satu kit berpindah antara musim karhutla, musim banjir, dan servis?
  4. Pilihan teknis apa yang ditutup, dan mengapa?
- **Isi per subbab:**
  - 6.1 Hibrida empat lapis KD §3.1: pencegahan di sel inti (sekat kanal dan pembasahan ulang, sumur dangkal
    pra-posisi); kit relay portabel pra-posisi pada tahun kering; protokol perimeter-inti-verifikasi; koridor
    semi-permanen paling banyak 2 setelah musim pilot pertama dengan syarat KD (koridor 1 km terbakar ≥ 7 dari 14
    tahun, kit dipakai ≥ 3 kali, izin lahan, rencana anti-pencurian).
  - 6.2 Tabel doktrin zona PRD §5.1 (arti, doktrin, sarana inti, yang tidak dilakukan).
  - 6.3 Kit gambut (2 pompa N+1, layflat DN100 1.000 m, DN65 500 m, 8 lance, manifold, flowmeter, sensor, APD 20
    orang) dan kit mineral (tanpa lance dan node suhu, DN100 800 m, 10 nozzle).
  - 6.4 Modul banjir: pompa debit besar head rendah, layflat DN150 300 m, intake terapung; berbagi gudang, truk, kru;
    tidak berbagi pompa.
  - 6.5 Mei–Oktober karhutla (depot depan saat pemicu), November–April banjir, Maret–April servis dan irigasi;
    status lacak `gudang`, `depot`, `gelar`, `banjir`, `servis`, `hilang`.
  - 6.6 Batas desain sebagai kalimat positif: debit operasi 10 L/s karena serapan lance; tanpa trunk 2.000 L/min
    sebagai standar; HDPE hanya untuk koridor dan di luar perimeter aktif (2 km HDPE OD200 sekitar 20 ton dan sekitar
    160 sambungan fusi); tanpa backbone permanen; injeksi ≤ 5 m; sumur dalam 50–100 m hanya pengecualian; tanpa baja
    berlapis dan pipa tertanam (sekitar 2,7 kali harga HDPE, merusak hidrologi gambut); umur HDPE 50 tahun berlaku
    pada kondisi standar, tidak di gambut terbakar.
- **Angka wajib:** `sippa.kit.debit_operasi_ls` (10 L/s, asumsi-kebijakan); `sippa.kit.panjang_dn100_m` (1.000 m);
  `sippa.kit.panjang_dn65_m` (500 m); `sippa.kit.lance_n` (8); `sippa.modul_banjir.debit_min_ls` (100 L/s, head 3–5
  m, asumsi-kebijakan); `sippa.hdpe.od200_2km_ton` (sekitar 20 ton, estimasi-model); `sippa.hdpe.od200_2km_sambungan`
  (sekitar 160, estimasi-model); `sippa.baja.rasio_harga_hdpe` (sekitar 2,7, asumsi-kebijakan); `sippa.sumur.biaya_titik`
  (Rp1,5–6 juta, terverifikasi sampai dibuka ke dokumen resmi); `sippa.koridor.maks_n` (2). Semua dari
  `data/sippa/parameter.csv` (satu tabel parameter dengan kolom sumber, PRD §6) atau pustaka.
- **Objek:** Gambar 6.1 diagram empat lapis (G21 diagram berikon, ulang dari Gambar 1.1 tidak boleh: Gambar 1.1
  ringkas alur, Gambar 6.1 rinci per lapis dengan sarana; generator `teknik/lapis.mjs` mode rinci); Tabel 6.1 doktrin
  per zona (B5.7); Gambar 6.2 siklus tahunan kit (G23 kalender 12 bulan, pita status; `teknik/siklus.mjs`); Tabel 6.2
  aset yang dibagi dan tidak dibagi karhutla-banjir (B5.7); Tabel 6.3 batas desain: pilihan, alasan fisik, alasan
  biaya, syarat dibuka kembali (B5.7); Gambar 6.3 ringkasan diagram zona A–D dan alur keputusan sarana (SIPPA-G-11
  versi buku).
- **Rekomendasi asal:** SR-01 (nota putusan bergerbang), SR-11 (sekat kanal sel inti sebagai lengan pembanding).
- **Bukti:** `bukti/bab-06.md`.

### BAB 7 HIDRAULIKA DAN TITIK KERJA (10 hlm)

- **Subbab:** 7.1 Rumus dan Asumsi; 7.2 Titik Kerja di Ujung Manifold; 7.3 Kehilangan Head per Diameter; 7.4 Serapan
  Lance dan Debit Pompa; 7.5 Tekanan, Suhu, dan Lonjakan; 7.6 Profil Trase dan Booster; 7.7 BBM dan Emisi BBM.
- **Pertanyaan kunci:**
  1. Pompa dan selang apa yang cukup untuk relay 1 km, dan kapan booster dibutuhkan?
  2. Berapa debit yang benar-benar dapat diserap regu dengan lance, dan bagaimana neraca debitnya ditutup?
  3. Batas tekanan, suhu, dan kecepatan apa yang menolak sebuah konfigurasi?
  4. Berapa BBM dan emisi BBM per jam dan per musim?
- **Isi per subbab:**
  - 7.1 Tabel rumus PRD §6.4 (Hazen-Williams SI, head minor, TDH, daya poros, BBM, derating HDPE, gerbang tekanan,
    kecepatan, Joukowsky, volume isi, neraca air sumber); fungsi kembar `public/pipa/hitung.js` dan
    `scripts/data/sippa/hidraulika.py`, diuji terhadap nilai acuan (Lampiran J).
  - 7.2 Spesifikasi sebagai tekanan di ujung 2–4 bar pada debit operasi, dipilih dari kurva Q-H; contoh relay DN100 1
    km 10 L/s: head gesek sekitar 17 m/km, TDH sekitar 50 m, tekanan pompa sekitar 5 bar, daya poros sekitar 7,5 kW.
  - 7.3 Kurva head loss DN65, DN100, DN150 layflat dan HDPE OD160/OD200 terhadap debit.
  - 7.4 Gerbang serapan: NO-GO bila debit pompa > jumlah lance × 40 L/min. **Neraca debit kit wajib ditutup di Tabel
    7.3**: 8 lance × 40 L/min = 320 L/min (sekitar 5,3 L/s) lawan debit operasi 10 L/s; sisanya dialokasikan ke 4 set
    selang serang 38 mm dan pembasahan perimeter, atau debit operasi diturunkan. Penulis tidak memilih; angka akhir dari
    `hidraulika.py` dan bench G2, dan dicatat sebagai butir terbuka §10.
  - 7.5 Derating suhu HDPE 35 °C = 0,79; uji invarian OD160 SDR11 2.000 L/min 2 km +10 m NO-GO (sekitar 12,4 bar >
    11,1 bar) dan OD200 lolos (sekitar 6,3 bar); katup tutup lambat; relief ≤ 88% PN.
  - 7.6 Profil trase contoh dari DEMNAS AOI (SIPPA-G-08); booster dihitung dari profil, bukan jarak tetap.
  - 7.7 BBM 22 L/jam per pompa kelas 1.500 L/min pada rating; emisi pilot sekitar 73 ton CO2 per musim (hanya BBM).
- **Angka wajib (semua `estimasi-model` dari `data/sippa/hidraulika_skenario.csv` keluaran `hidraulika.py`, kecuali
  disebut):** `sippa.hid.dn100_10ls.hf_m_per_km` (sekitar 17); `sippa.hid.dn100_1km.tdh_m` (sekitar 50);
  `sippa.hid.dn100_1km.tekanan_pompa_bar` (sekitar 5); `sippa.hid.dn100_1km.daya_kw` (sekitar 7,5);
  `sippa.hid.dn100_1km.volume_isi_m3` (7,85); `sippa.hid.dn100_1km.waktu_isi_menit` (13);
  `sippa.hid.od160.tekanan_bar` (sekitar 12,4) dan `.batas_bar` (11,1); `sippa.hid.od200.tekanan_bar` (sekitar 6,3);
  `sippa.hid.derating_35c` (0,79, asumsi-kebijakan); `sippa.hid.serap.lance8_l_min` (320); `sippa.pompa.kelas_l_min`
  (1.500 L/min pada 1,0 MPa, terverifikasi lembar data); `sippa.pompa.bbm_l_jam` (22, terverifikasi);
  `sippa.co2.pilot_musim_ton` (sekitar 73).
- **Objek:** Gambar 7.1 kehilangan head per km terhadap debit untuk lima diameter (garis, satu sumbu, lima seri,
  legenda dan label di ujung garis, warna kategorikal urutan tetap; `grafik.mjs garis`; spek `sippa-12`); Tabel 7.1
  rumus dan nilai bawaan (B5.7); Tabel 7.2 skenario hidraulika: relay DN100 1 km, 1,5 km, 2 km; HDPE OD160 NO-GO; OD200
  lolos (B5.7, `csv:`, kolom VONIS dengan pil teks GO/NO-GO, bukan warna saja); Tabel 7.3 neraca debit kit (B5.7);
  Gambar 7.2 profil trase contoh AOI (SIPPA-G-08 versi buku; `teknik/profil.mjs` dari DEMNAS); Tabel 7.4 BBM per
  insiden dan per musim (B5.7).
- **Rekomendasi asal:** SR-06 (bench G2: kurva Q-H, head loss ±15%, lance, uji 1,5 kali tekanan kerja).
- **Bukti:** `bukti/bab-07.md`; uji kembar JS-Python hijau dilampirkan sebagai bukti, bukan klaim.

### BAB 8 SPESIFIKASI KOMPONEN DAN GAMBAR TEKNIK (12 hlm)

- **Subbab:** 8.1 Struktur Kode Komponen; 8.2 Kit Gambut; 8.3 Kit Mineral dan Sabana; 8.4 Modul Banjir; 8.5 Sensor
  dan Telemetri Lapangan; 8.6 Pemeliharaan dan Kriteria Terima; 8.7 Gudang Induk dan Depot Depan; 8.8 Daftar Gambar
  Teknik.
- **Pertanyaan kunci:**
  1. Apa isi kit sampai komponen terkecil, dengan titik kerja dan kriteria terima per komponen?
  2. Bagaimana tiap komponen dirawat dan diperiksa sebelum dan sesudah musim?
  3. Gambar teknik apa yang tersedia, dan apa batas pemakaiannya?
- **Isi per subbab:**
  - 8.1 Kode P-/H-/I-/M-/C-/ST-/SF-/V-/FT-/PT-/T-/GWT-/U-/Q-/S-/B- (pola paket pemilik, baca-B §2) supaya RFQ cocok.
  - 8.2 BOM kit gambut ringkas (rinci sampai baut di Lampiran D): kelas kinerja, jumlah, titik kerja, keyakinan harga.
    Tanpa merek (§2 butir 6).
  - 8.3 Selisih kit mineral.
  - 8.4 BOM modul banjir.
  - 8.5 Sensor yang menentukan gerbang G1–G4 dan laju sampel (PRD §6.6); pilot 2026 manual; sensor mulai 2027.
  - 8.6 Interval pemeliharaan per shift, mingguan, bulanan, triwulan, tahunan; filter: mesh ditetapkan dari uji sumbat
    G2; FAT kurva Q-H sebelum bayar.
  - 8.7 Gudang induk (ukuran rujukan 24 × 12 × 5 m, asumsi; volume simpan sekitar 12 m³ per kit dihitung dari BOM);
    depot depan kontainer 20 kaki.
  - 8.8 SIPPA-G-01 sampai G-12 dengan kriteria terima PRD §6.9; gambar penuh di Lampiran F; semua bertanda wajib
    pengesahan insinyur.
- **Angka wajib:** `sippa.bom.kit_gambut.<kode>.jumlah` dan `.harga` (dari `data/sippa/harga.csv`, satu baris satu
  komponen, keyakinan per baris); `sippa.bom.kit_gambut.total` (rentang); `sippa.bom.kit_mineral.total`;
  `sippa.bom.modul_banjir.total`; `sippa.pompa.harga_listing` (Rp190,78 juta termasuk PPN, terverifikasi);
  `sippa.layflat.dn100.harga_m` (Rp275 ribu, asumsi-kebijakan); `sippa.layflat.dn65.harga_m` (Rp165 ribu);
  `sippa.gudang.volume_kit_m3` (sekitar 12, estimasi-model); `sippa.gambar.n` (12).
- **Objek:** Tabel 8.1 BOM kit gambut (B5.7, `csv: data/sippa/bom_gambut.csv`, kolom KODE, KOMPONEN, JUMLAH, TITIK
  KERJA, KRITERIA TERIMA, HARGA, KEYAKINAN; `keyakinan: campuran`); Tabel 8.2 selisih kit mineral (B5.7); Tabel 8.3
  BOM modul banjir (B5.7); Tabel 8.4 sensor dan laju sampel (B5.7); Tabel 8.5 jadwal pemeliharaan (B5.7, matriks
  komponen × interval); Gambar 8.1 susunan kit relay (SIPPA-G-01 diperkecil); Gambar 8.2 P&ID kit relay (SIPPA-G-02
  diperkecil); Gambar 8.3 detail lance (SIPPA-G-03 diperkecil); Tabel 8.6 daftar gambar teknik dan kriteria terima
  (B5.7). Gambar teknik di badan teks berjenis `diagram` dan keterangan selalu memuat kalimat pengesahan.
- **Rekomendasi asal:** SR-07 (pengadaan 3 kit dan 3 modul banjir bersyarat G2, RFQ e-katalog dan 3 penawaran).
- **Bukti:** `bukti/bab-08.md`; tiap harga punya baris di `harga.csv` dengan `sumber`, `tanggal`, `keyakinan`.

### BAB 9 OPERASI: PEMICU, RESPONS, SOP, K3, LOGISTIK, DAN PELATIHAN (14 hlm)

- **Subbab:** 9.1 Alur Operasi dari Pemicu sampai Verifikasi; 9.2 Pemicu Pra-posisi; 9.3 Matriks Respons FRP, Luas,
  dan Zona; 9.4 Enam Keluarga SOP; 9.5 Keselamatan dan Kesehatan Kerja; 9.6 BBM; 9.7 Logistik Antar-daerah; 9.8
  Pelatihan dan Latihan Tahunan.
- **Pertanyaan kunci:**
  1. Kapan kit dipindah ke depot depan, dan siapa memutuskannya?
  2. Berapa regu, hari, dan sarana dibutuhkan pada tiap tingkat api, dan kapan heli dipanggil?
  3. Prosedur apa yang wajib, dan di titik mana pekerjaan dihentikan?
  4. Siapa dilatih, berapa jam, dan kapan latihan diulang?
- **Isi per subbab:**
  - 9.1 Alur hulu-hilir: pemicu, pra-posisi, deteksi, survei trase cepat, gelar, injeksi, verifikasi, bongkar, kembali.
  - 9.2 Pemicu dari `iklim_outlook.json`, `fwi_ansambel.json`, dan kelayakan kompleks (keluaran `pemicu.json`
    harian); ambang ditulis `asumsi-kebijakan` sampai diuji terhadap musim 2015, 2019, 2023 (uji balik ditulis hasilnya,
    bukan klaim).
  - 9.3 Matriks PRD §5.4 (tingkat 1–4); FRP hanya penanda nyala permukaan; koefisien `bara_regu` 0,5–2,8
    ha/regu/hari dan `orang_regu` 15 dari `operasi.json`; ambang FRP diuji terhadap log 2026 sebelum `final`.
  - 9.4 SOP-01 sampai SOP-06 ringkas (tujuan, pelaku, titik berhenti); teks lengkap di Lampiran G.
  - 9.5 CO dan PM2.5, APD, larangan masuk gambut tak tertopang, jalur lolos, medik, komunikasi.
  - 9.6 Penerimaan, penyaluran, mesin mati dan dingin saat isi, wadah berpenampung sekunder, log tambah-saja,
    cadangan 1,25 kali.
  - 9.7 Gudang YonTP terdekat Daops; transport antar-daerah dengan permintaan tertulis Satgas atau BPBD penerima;
    ETA p50 dan p90 dicatat; kendaraan dan perahu bawaan pinjam.
  - 9.8 Kurikulum operator inti 58 jam (ekologi 4, FWI dan GIS 6, pompa dan hidraulika 8, pipa dan selang 6, injeksi
    dan probing 8, drone 4, HSE 6, lapangan terpadu 8, malam 4, asesmen 4); modul YonTP 8 jam teori + 12 jam latihan;
    latihan basah gabungan tanpa membakar tiap tahun (gerbang G6).
- **Angka wajib:** `sippa.respons.bara_regu.rendah/.tengah/.tinggi` (0,5/1,2/2,8 ha/regu/hari, resmi kasus Manggala
  Agni 2026 di `operasi.json`); `sippa.respons.orang_regu` (15); `sippa.respons.jam_tiba_heli` (6 jam,
  asumsi-kebijakan); `sippa.respons.tingkat<n>.*` (regu, hari dari `respons.py`); `sippa.pelatihan.jam_inti` (58);
  `sippa.pelatihan.jam_yontp` (20); `sippa.latihan.biaya_lokasi_tahun` (Rp52–95 juta, asumsi-kebijakan);
  `sippa.bbm.cadangan_kali` (1,25).
- **Objek:** Gambar 9.1 alur operasi (G21 diagram berikon, `teknik/alur.mjs`); Tabel 9.1 pemicu pra-posisi dan
  ambangnya (B5.7); Tabel 9.2 matriks respons FRP × luas × zona (B5.7, `csv: data/sippa/respons.csv`); Tabel 9.3
  ringkasan SOP dan titik berhenti (B5.7); Tabel 9.4 kurikulum (B5.7, `total: ya`); `::: catatan` FRP bukan
  kedalaman bara; foto F4 (regu pemadam di lahan gambut).
- **Rekomendasi asal:** SR-09 (SOP disahkan Satgas, pelatihan operator inti), SR-14 (latihan tahunan G6).
- **Bukti:** `bukti/bab-09.md`.

### BAB 10 KELEMBAGAAN DAN TATA KELOLA ASET (8 hlm)

- **Subbab:** 10.1 Peran Lembaga; 10.2 Matriks RACI per Tahap; 10.3 Aset BMN BNPB dan Pinjam Pakai; 10.4 Komando,
  Operator, dan Tenaga Gelar; 10.5 Opsi Peran Pemegang Izin Konsesi.
- **Pertanyaan kunci:**
  1. Siapa memutus, mengerjakan, dikonsultasikan, dan diberi tahu pada tiap tahap?
  2. Bagaimana aset tetap milik BNPB tetapi disimpan, digelar, dan dipindah lembaga lain?
  3. Opsi apa yang tersedia bagi pemegang izin konsesi, dan apa syaratnya?
- **Isi per subbab:**
  - 10.1 BNPB pemilik program dan BMN; Satgas Karhutla provinsi komando; Manggala Agni operator inti bersertifikat
    (Permen LHK P.32/2016); BPBD regu, pompa, data kejadian; YonTP gudang, tenaga gelar, transport; BRGM atau walidata
    KHG yang berlaku untuk sekat kanal dan TMA; BWS untuk izin pengambilan air; BIG, BMKG untuk data; LKPP untuk
    e-katalog.
  - 10.2 RACI 14 tahap PRD §3.3, satu A per baris.
  - 10.3 BMN BNPB dengan pinjam pakai (MoU) ke penerima; pencatatan inventaris dan jejak di `/pipa/kit`.
  - 10.4 Komando di Satgas; operator inti bukan TNI untuk menahan dampak rotasi personel; YonTP tanpa uraian dasar
    hukum TNI (keputusan 22), cukup MoU pinjam pakai BMN dan permintaan tertulis.
  - 10.5 Tiga opsi kebijakan PRD §3.4 berikut syarat; tidak mengklaim kewajiban hukum baru; nama perusahaan tidak
    ditulis.
- **Angka wajib:** `sippa.raci.tahap.n` (14); tidak ada angka lain kecuali personel di Bab 1.
- **Objek:** Tabel 10.1 matriks RACI per tahap (direktif `matriks-lembaga` tidak cocok karena kolomnya fase; dipakai
  `::: tabel` B5.7 kolom TAHAP, BNPB, SATGAS PROV, MANGGALA AGNI, BPBD, YONTP, BRGM, KEMENHUT, PEMEGANG HAK, BWS/BIG/BMKG,
  sel kode R/A/C/I; `keyakinan: asumsi-kebijakan`); Tabel 10.2 aset, pemilik, penerima pinjam pakai, dokumen (B5.7);
  Tabel 10.3 opsi peran konsesi dan syarat (B5.7); Gambar 10.1 alur komando dan alur aset (G21 diagram berikon,
  chip lembaga tanpa logo; `teknik/lembaga.mjs`).
- **Rekomendasi asal:** SR-08 (MoU pinjam pakai BMN dengan TNI untuk YonTP), SR-18 (opsi konsesi).
- **Bukti:** `bukti/bab-10.md`; nama unit dicek ke `data/raw/hukum/teks/perban-nomor-6-tahun-2025.json` dan
  `perban-nomor-11-tahun-2025.json`; nomenklatur K/L dari `data/lembaga/lembaga.csv`.

### BAB 11 PEMAKAIAN GANDA: BANJIR DAN IRIGASI (9 hlm)

- **Subbab:** 11.1 Mengapa Pompa Api Tidak Dipakai untuk Genangan; 11.2 Modul Banjir dan Kapasitasnya; 11.3 Provinsi
  dan Musim Banjir Pasangan; 11.4 Operasi Banjir November–Desember 2026; 11.5 Irigasi dengan Air dari Sumber Lain;
  11.6 Manfaat dalam Hitungan Biaya-Manfaat.
- **Pertanyaan kunci:**
  1. Berapa kapasitas modul banjir dalam satuan genangan yang dipahami BPBD?
  2. Ke kabupaten mana kit dipindah pada musim hujan, dan apa buktinya pada 2026?
  3. Dengan syarat apa irigasi masuk tanpa mengeringkan gambut?
  4. Bagaimana manfaat banjir dan irigasi dihitung tanpa mencampur BCR inti?
- **Isi per subbab:**
  - 11.1 1 ha × 0,5 m = 5.000 m³; pada 30 L/s sekitar 46 jam, pada 100 L/s sekitar 14 jam: pompa api head tinggi
    debit kecil tidak cocok; modul head rendah terpisah.
  - 11.2 BOM modul banjir ringkas (rujuk Bab 8.4); kapasitas m³ per jam dan ha genangan per hari.
  - 11.3 Kejadian banjir per provinsi (DIBI) dan bulan puncak; delapan provinsi gambut berpasangan banjir.
  - 11.4 Hasil operasi 2026 dari D1 `sippa_gerak` dan `sippa_log_gelar` (jam pompa, m³, lokasi, waktu pindah), pil
    "pilot, n kecil"; bila belum ada, tabel berisi "–" beralasan.
  - 11.5 Syarat keras PRD §5.7; pinjam ke kelompok tani di luar KHG Maret–April; BBM ditanggung peminjam; paket pilot
    irigasi; manfaat nol bila syarat gagal.
  - 11.6 Varian BCR inti, + banjir, + banjir + irigasi; rumus manfaat banjir (m³ terpompa × nilai per m³ atau biaya
    pompa sewa terhindar, label `asumsi-kebijakan`); rujuk Bab 13.5.
- **Angka wajib:** `sippa.banjir.genangan_1ha_05m_m3` (5.000); `sippa.banjir.jam_30ls` (sekitar 46);
  `sippa.banjir.jam_100ls` (sekitar 14) dari `hidraulika.py` (estimasi-model); `sippa.banjir.<prov>.kejadian_2015_2025`
  (resmi, DIBI); `sippa.banjir.2026.jam_pompa`, `.m3`, `.kabupaten_n`, `.waktu_pindah_jam` (terverifikasi, D1, slot
  `menunggu` sampai ditarik); `sippa.irigasi.paket_pilot_rp` (Rp140 juta, asumsi-kebijakan).
- **Objek:** Tabel 11.1 kapasitas modul banjir (B5.7); Gambar 11.1 kalender kit karhutla-banjir-irigasi per provinsi
  (G23, baris provinsi berpasangan, pita bulan; `teknik/siklus.mjs` mode provinsi); Tabel 11.2 provinsi dan musim
  banjir pasangan (B5.7, `csv:`); Tabel 11.3 operasi banjir 2026 (B5.7, pil pilot); Tabel 11.4 syarat keras irigasi
  dan cara periksa (B5.7); foto F6 (pompa banjir atau genangan).
- **Rekomendasi asal:** SR-03 (pemakaian banjir November–Desember 2026), SR-13 (uji irigasi satu kabupaten).
- **Bukti:** `bukti/bab-11.md`.

### BAB 12 PILOT 2026 DAN PROGRAM UJI 2027–2028 (12 hlm)

- **Subbab:** 12.1 Dua Vonis: Dapat Dipakai dan Lebih Baik; 12.2 Pilot Oktober 2026; 12.3 Hasil Pilot Oktober 2026;
  12.4 Gerbang G0–G6; 12.5 Protokol A/B Empat Lengan; 12.6 Waktu Gelar per Kelas Medan; 12.7 Evaluasi Independen dan
  Aturan Berhenti.
- **Pertanyaan kunci:**
  1. Apa yang diputus pilot Oktober 2026, dan apa yang belum dapat diputus?
  2. Gerbang apa yang harus lulus sebelum tiap belanja, dengan ambang berangka apa?
  3. Bagaimana uji A/B dirancang supaya hasilnya tidak dapat diperdebatkan?
  4. Apa yang terjadi bila hasilnya nol?
- **Isi per subbab:**
  - 12.1 "Dapat dipakai" (gelar, air mengalir, probe terbaca, tanpa kecelakaan) lawan "lebih baik" (ha dingin
    terverifikasi per regu-hari dan nyala ulang 7 hari antara petak lance dan konvensional); bila n < 8 per lengan:
    "belum bisa diputus".
  - 12.2 AOI, tanggal, alat pinjam, 2 lance sederhana, termometer tusuk 0,1/0,3/0,5/1,0 m, formulir G3-lite.
  - 12.3 Hasil dari ekspor D1 (`/api/sippa/log.csv`), dengan tanggal tarik sendiri; setiap angka berpil "pilot, n
    kecil"; tidak ada kata "terbukti".
  - 12.4 Tabel gerbang PRD §4.4 dengan ambang, waktu, dan arti gagal; G3 per kelas medan (I p50 ≤ 4 jam, p90 ≤ 6 jam;
    II p50 ≤ 8, p90 ≤ 12; III p50 ≤ 24, p90 ≤ 36; semua asumsi-kebijakan); hipotesis atas mesin Studio pemilik dicatat
    sebagai batas yang harus dikalahkan.
  - 12.5 Empat lengan (konvensional; kit + lance; kit + surfaktan; sekat kanal dan pembasahan ulang); outcome primer
    ha dingin terverifikasi 30 hari per regu-hari dan nyala ulang 30 hari; titik cek 24 jam, 72 jam, 7, 30, 90 hari;
    n ≥ 8 petak per lengan; 95% CI; pra-registrasi sebelum musim; tidak menyalakan gambut.
  - 12.6 Time-motion ≥ 5 ulangan per kelas medan.
  - 12.7 Evaluator independen; bila G4 gagal: kit dilebur ke inventaris pompa biasa; bila musim basah: perpanjang
    satu musim, jangan beli.
- **Angka wajib:** `sippa.gerbang.g4.ambang_persen` (30%); `.n_min_lengan` (8); `.biaya_ha_rasio_maks` (1,2);
  `sippa.gerbang.g3.<kelas>.p50_jam`, `.p90_jam`; `sippa.gerbang.g1.rasio_debit` (1,5); `.piezometer_cm` (10);
  `sippa.gerbang.g2.headloss_toleransi_persen` (15); `sippa.gerbang.g5.hari_aktif_min` (30); `sippa.studio.g3.<kelas>`
  (22–27, 43–55, 74 jam; estimasi-model; belum diuji balik); `sippa.pilot.2026.<sesi_n, petak_n, waktu_gelar_jam,
  suhu_turun_c, nyala_ulang_n>` (terverifikasi, D1, `menunggu` sampai ditarik). Semua ambang dari
  `data/sippa/gerbang.csv` (asumsi-kebijakan).
- **Objek:** Gambar 12.1 garis waktu gerbang 2026–2029 (G23 kronologi, pita horizon; `teknik/gerbang.mjs`); Tabel 12.1
  gerbang G0–G6 (direktif `tabel`, kolom GERBANG, KAPAN, LULUS BILA, GAGAL BERARTI); Tabel 12.2 lengan A/B dan outcome
  (B5.7); Tabel 12.3 hasil pilot Oktober 2026 (B5.7, `csv: data/sippa/pilot_2026.csv`); Gambar 12.2 waktu gelar per
  kelas medan: ambang G3 lawan hipotesis Studio lawan hasil pilot (G12 rentang, spek `sippa-13`); Gambar 12.3 tata
  letak petak A/B dan grid probe (SIPPA-G-12 diperkecil).
- **Rekomendasi asal:** SR-02 (vonis pilot dan laporan), SR-10 (protokol A/B dan evaluator), SR-15 (evaluasi G4/G5).
- **Bukti:** `bukti/bab-12.md`; hasil pilot ditulis ulang setelah ekspor D1 (tugas B-10 PRD).

### BAB 13 ANGGARAN, NPV, BCR, DAN MONTE CARLO (14 hlm)

- **Subbab:** 13.1 Aturan Hitung; 13.2 Anggaran Bertingkat Gerbang T0–T4; 13.3 RAB Kit dan Modul Banjir; 13.4 OPEX
  Tahun Kering dan Tahun Basah; 13.5 TCO, NPV, dan BCR dalam Tiga Skenario Manfaat dan Tiga Varian Pemakaian; 13.6
  Pembanding Biaya Bersumber; 13.7 Monte Carlo dan Kepekaan; 13.8 Ambang Impas yang Harus Dicapai Pilot.
- **Pertanyaan kunci:**
  1. Berapa biaya tiap tingkat program, dan gerbang apa yang membukanya?
  2. Dengan manfaat apa SIPPA impas, dan seberapa jauh hasil itu bergantung pada pemakaian banjir dan irigasi?
  3. Seberapa lebar ketidakpastian biaya, dan asumsi mana yang paling menggeser hasil?
  4. Berapa biaya per ha dingin terverifikasi yang harus dicapai supaya kit layak diperluas?
- **Isi per subbab:**
  - 13.1 Delapan aturan PRD §11.1 (satu item satu satuan alokasi; harga bersumber apa adanya, sisanya ±30%;
    kontingensi 25% item asumsi dan 10% item bersumber, kontingensi seragam Studio 20% ditampilkan sebagai pembanding;
    PPN tidak ditambah untuk listing ber-PPN; OPEX tahun kering dan basah; TCO nominal dan terdiskonto 8%; kepekaan
    wajib; harga heli `menunggu`). Semua angka dari `bangun/sippa_keuangan.py` atas `data/sippa/harga.csv`.
  - 13.2 T0 pilot Oktober 2026 (realisasi kuitansi); T0B banjir 2026 (realisasi); T1 Fase 0 2027; T2 pilot 2027–2028;
    T3 skala Kalteng 2029 ke atas; T4 nasional 2030 ke atas, paling banyak 25 kit tambahan pada 2030. Tiap baris
    menyebut gerbang pembuka; T3 dan T4 berlabel "rencana bersyarat, bukan pengadaan".
  - 13.3 Ringkasan RAB per kit gambut, kit mineral, modul banjir; baris tambahan (kendaraan dan perahu pinjam lawan
    beli, keamanan, telemetri, logistik, latihan, servis 5–8% CAPEX, irigasi, platform web Rp0 di repo ini).
  - 13.4 Porsi tahun kering 40% (asumsi-kebijakan, kepekaan 20–60%); jam pompa dan hari regu tidak terjadi tiap tahun.
  - 13.5 Tiga skenario manfaat: (i) nol (bawaan, seperti Studio pemilik); (ii) biaya regu konvensional terhindar; (iii)
    biaya heli-hari terhindar (`menunggu` angka kontrak, tampil "–" sampai ada). Tiga varian pemakaian: inti; + banjir
    (keputusan 7); + banjir + irigasi (keputusan 8). Matriks 3 × 3 NPV dan BCR; sel heli "–" beralasan. Dua definisi
    biaya per ha berdampingan (OPEX saja ala Studio; dengan CAPEX teramortisasi ala KD), sesuai celah G09.
  - 13.6 Pembanding: water bombing > Rp200 juta per sorti satu jam (resmi, pernyataan); OMC Rp2,3–2,5 M per provinsi
    per 10–12 hari; sekat kanal Rp20,6 juta per unit; restorasi hidrologi; sumur dangkal Rp1,5–6 juta per titik; regu
    konvensional Rp2,25–3,75 juta per regu-hari. Cara baca: TCO 5 tahun skala Kalteng setara jumlah heli-hari tertentu
    (dihitung, bukan diketik), dan itu bukan bukti kit lebih murah per ha karena tugasnya berbeda (§2 butir 13).
  - 13.7 Monte Carlo 800 sampel berbenih, pengali seragam Studio (CAPEX 0,78–1,28; BBM 0,65–1,40; upah 0,70–1,45;
    operasi lain 0,75–1,35); P10, P50, P90; tornado kepekaan: ha per kit ±50%, harga layflat ±30%, jam pompa ±50%,
    porsi tahun kering 20–60%, kontingensi 20% lawan 25%.
  - 13.8 Biaya per ha dingin terverifikasi 30 hari = (CAPEX teramortisasi + OPEX + regu) / ha terverifikasi; regu
    konvensional Rp0,8–7,5 juta per ha tenaga; kit layak bila produktivitas naik ≥ 30% atau nyala ulang turun ≥ 30%
    (gerbang G4) dan biaya per ha ≤ 1,2 kali konvensional.
- **Angka wajib (semua dari `data/sippa/keuangan.json` keluaran `sippa_keuangan.py` kecuali disebut):**

| Kunci | Nilai acuan (titik awal KD dan PRD, diganti hasil skrip) | Keyakinan |
| --- | --- | --- |
| `sippa.rab.t0` | realisasi kuitansi pilot 2026 (`menunggu`) | terverifikasi setelah realisasi |
| `sippa.rab.t0b` | realisasi banjir 2026 (`menunggu`) | terverifikasi setelah realisasi |
| `sippa.rab.t1` | Rp1,1–2,1 M | asumsi-kebijakan |
| `sippa.rab.t2.kd` | Rp10,5–14,7 M | asumsi-kebijakan |
| `sippa.rab.t2.pinjam`, `sippa.rab.t2.beli` | Rp13,7–18,9 M; Rp16,2–21,4 M | asumsi-kebijakan |
| `sippa.rab.t3.capex`, `sippa.rab.t3.tco5` | Rp37,6–43,3 M; Rp58–79 M | asumsi-kebijakan |
| `sippa.rab.t4.capex` | dihitung dari per-kit T2 dan `kit_nasional.json` (tanpa angka dokumen awal) | asumsi-kebijakan |
| `sippa.rab.kit_gambut`, `.kit_mineral`, `.modul_banjir` | dari BOM | campuran |
| `sippa.opex.lokasi_tahun.tambahan` | Rp276–439 juta | asumsi-kebijakan |
| `sippa.npv.<manfaat>.<varian>`, `sippa.bcr.<manfaat>.<varian>` | 9 sel; sel heli `menunggu` | asumsi-kebijakan |
| `sippa.mc.t2.p10`, `.p50`, `.p90` | dihitung | estimasi-model |
| `sippa.heli.biaya_sorti_pernyataan` | > Rp200 juta | resmi (pernyataan) |
| `sippa.heli.biaya_jam`, `sippa.heli.biaya_sorti` | `menunggu` (KD-5) | menunggu |
| `sippa.omc.biaya_provinsi` | Rp2,3–2,5 M per 10–12 hari | resmi (dibuka ke dokumen sebelum `final`) |
| `sippa.sekat.biaya_unit` | Rp20,6 juta | resmi (dibuka ke dokumen sebelum `final`) |
| `sippa.regu.biaya_hari` | Rp2,25–3,75 juta | asumsi-kebijakan |
| `sippa.regu.biaya_ha` | Rp0,8–7,5 juta | estimasi-model |
| `sippa.diskonto_persen` | 8% | asumsi-kebijakan |
| `sippa.mc.n_sampel` | 800 | |

- **Objek:** Tabel 13.1 tingkat anggaran T0–T4 dan gerbang pembuka (B5.7); Gambar 13.1 CAPEX bertingkat T1–T4 (G9 batang
  bertumpuk per tingkat dengan komponen kit, modul banjir, aset pendukung, kontingensi; satu sumbu rupiah; total di
  atas; pil "rencana bersyarat" pada T3 dan T4; spek `sippa-14`); Tabel 13.2 RAB per kit dan modul (B5.7, `csv:`);
  Tabel 13.3 baris tambahan dan aturannya (B5.7); Tabel 13.4 OPEX tahun kering dan basah (B5.7); Tabel 13.5 matriks
  NPV dan BCR 3 × 3 (B5.7; sel tanpa angka "–" dengan alasan di `catatan:`); Gambar 13.2 kipas Monte Carlo biaya T2
  (G11 pita melebar P10–P90 per tahun, garis tengah navy, angka rentang tertulis; spek `sippa-15`); Gambar 13.3 tornado
  kepekaan (G4 batang horizontal terurut menurut lebar ayunan, satu sumbu; spek `sippa-16`); Tabel 13.6 pembanding
  biaya bersumber dengan satuan tugas (B5.7, kolom METODE, ANGKA, SATUAN TUGAS, SUMBER, KEYAKINAN).
- **Rekomendasi asal:** SR-19 (harga heli internal dan rekap water bombing 2019–2026).
- **Bukti:** `bukti/bab-13.md`; skrip keuangan wajib self-check yang menolak item ganda satuan dan kontingensi ganda.

### BAB 14 RISIKO DAN MITIGASI (6 hlm)

- **Subbab:** 14.1 Cara Menilai Risiko; 14.2 Register Risiko Program; 14.3 Risiko Teknis Peralatan; 14.4 Pemantauan
  dan Pemicu.
- **Pertanyaan kunci:**
  1. Apa yang paling mungkin menggagalkan program, dan siapa pemilik tiap risiko?
  2. Penangkal apa yang sudah dibangun ke desain dan gerbang?
  3. Tanda apa yang dipantau supaya risiko terlihat sebelum terjadi?
- **Isi per subbab:**
  - 14.1 Skala kemungkinan dan dampak 1–5; skor = K × D; matriks risiko B5.27.
  - 14.2 Risiko program R01–R13 PRD §11.2 (musim basah, pilot tanpa api, hasil nol, tekanan membeli besar, sumber air
    gagal, kecelakaan, pencurian, rotasi personel, izin lahan, surfaktan, angka pembanding dipersoalkan, `track` OSM
    tak bisa dilalui, pengeringan gambut oleh modul banjir atau irigasi).
  - 14.3 FMEA pemilik (A2) diringkas per komponen: pompa, selang, lance, filter, sensor; batas pemakaian alat
    keputusan (G22, G23).
  - 14.4 Pemicu pantau per risiko dengan sumber datanya (`iklim_outlook`, titik panas 24 jam AOI, U8 kehilangan
    komponen, neraca air).
- **Angka wajib:** `sippa.risiko.<kode>.k`, `.d`, `.skor` (asumsi-kebijakan, `data/sippa/risiko.csv`);
  `sippa.target.kehilangan_komponen_persen` (< 5%).
- **Objek:** Gambar 14.1 matriks kemungkinan × dampak (G17, bulatan navy bernomor kode risiko; `grafik.mjs matriks`;
  spek `sippa-17`); Tabel 14.1 register risiko (B5.7, kolom KODE, RISIKO, K, D, SKOR, PEMILIK, PENANGKAL, PEMICU PANTAU;
  `urut: -skor`); Tabel 14.2 FMEA ringkas peralatan (B5.7).
- **Rekomendasi asal:** tidak ada baru; penangkal merujuk SR yang sudah ada.
- **Bukti:** `bukti/bab-14.md`. Risiko web (R14–R20 PRD) tidak masuk buku kecuali R14 (kebocoran data staf), R15
  (kiriman luring), R19 (simulator dipakai menyimpulkan kelayakan jaringan).

### BAB 15 SISTEM DATA DAN PEMANTAUAN (6 hlm)

- **Subbab:** 15.1 Alat Kerja Staf BNPB di `/pipa`; 15.2 Inventaris dan Lacak Kit Antar-daerah; 15.3 Log Gelar,
  Probe, dan Dasbor A/B; 15.4 Simulator Keputusan dan Simulasi Tiga Dimensi; 15.5 Telemetri; 15.6 Batas Pemakaian Alat.
- **Pertanyaan kunci:**
  1. Data apa yang dicatat sejak pilot, oleh siapa, dan bagaimana dipakai memutus gerbang?
  2. Bagaimana kit dilacak dari gudang ke depot, ke gelar, ke banjir, dan kembali?
  3. Apa yang tidak boleh disimpulkan dari simulator dan peta kelayakan?
- **Isi per subbab:**
  - 15.1 Layar `/pipa` (ringkas, peta kelayakan dan saran sarana, kalkulator, pemicu, kit, log, A/B, data dan metode,
    studio, 3D, lapangan, laporan PDF) hanya untuk staf BNPB di balik login (keputusan 32); bahasa Indonesia; ponsel
    untuk lapangan.
  - 15.2 Status kit, jejak gerak, kehilangan komponen per musim (U8).
  - 15.3 Formulir lapangan luring yang terkirim saat ada sinyal; ekspor CSV untuk evaluator independen.
  - 15.4 Simulator membandingkan semua skenario dengan gerbang keras (menolak backbone > 2 koridor, kedalaman > 5 m,
    debit tak terserap); simulasi Three.js pola `public/sim_*` untuk pemahaman ruang, bukan bukti.
  - 15.5 Format pesan dan laju sampel; kerangka siap terima data sejak 2026, sensor mulai 2027.
  - 15.6 Batas alat (G22, G23); manfaat bawaan nol; keluaran alat bukan Data Bencana (Perban BNPB 1/2023).
- **Angka wajib:** `sippa.web.layar_n` (dihitung dari PRD §9.1.1); `sippa.telemetri.laju_<sensor>`; tidak ada angka
  efikasi.
- **Objek:** Gambar 15.1 peta layar dan alur data (G21 diagram berikon; `teknik/alur_data.mjs`); Tabel 15.1 layar,
  pengguna, data yang dicatat, gerbang yang dilayani (B5.7); Gambar 15.2 tangkapan layar peta kelayakan `/pipa/peta`
  mode terang (`jenis: diagram`, bukan `foto`, karena bukan foto Commons; sumber "Pantau Bencana, layar staf"; tangkapan
  memakai data nyata per batas data, tidak pernah data dummy).
- **Rekomendasi asal:** SR-12 (pemicu harian), SR-20 (telemetri dan verifikasi `track`).
- **Bukti:** `bukti/bab-15.md`; rujuk PRD §9 dan uji `tests/warga/sippa*.test.mjs` (hijau sebagai bukti, bukan klaim).

### BAB 16 PETA JALAN 2026–2030 (7 hlm)

- **Subbab:** 16.1 Hari ke-0 dan Keputusan 14 Hari Pertama; 16.2 Rencana 100 Hari; 16.3 Rencana 2026–2027; 16.4
  Rencana 2028–2030; 16.5 Indikator Kinerja Program; 16.6 Pelaporan.
- **Pertanyaan kunci:**
  1. Apa yang dikerjakan minggu demi minggu sampai akhir 2026, bulan demi bulan pada 2027, dan tahun demi tahun
     2028–2030?
  2. Indikator apa yang dipakai Kepala BNPB untuk menilai program tanpa membaca seluruh buku?
  3. Kapan dan dalam bentuk apa program dilaporkan?
- **Isi per subbab:**
  - 16.1 Hari ke-0 = tanggal penetapan nota putusan (KD-1); keputusan 14 hari pertama (§3.5).
  - 16.2 Minggu 44–53 PRD §4.1 yang jatuh di 100 hari.
  - 16.3 Bulan demi bulan 2027 PRD §4.2.
  - 16.4 Tahun demi tahun 2028–2030 PRD §4.3; skala Kalteng 14 kit dan 7 depot hanya bila G5; nasional bertahap mulai
    provinsi gambut terbesar; paling banyak 25 kit tambahan dan 2 koridor pada 2030.
  - 16.5 Indikator U3–U9 PRD §1.3 (vonis pilot, A/B, waktu gelar, efikasi, keutuhan aset, pemakaian ganda).
  - 16.6 Laporan pilot (minggu 46), laporan mingguan operasi banjir, laporan antara Desember 2027, evaluasi G4/G5,
    evaluasi akhir horizon 2030; semua dari laporan PDF otomatis `/pipa/laporan`.
- **Angka wajib:** `sippa.jalan.kit_kalteng_skala` (14); `sippa.jalan.depot_kalteng` (7); `sippa.jalan.kit_2030_maks`
  (25); `sippa.indikator.<U3..U9>.target` (dari `data/sippa/indikator.csv`, asumsi-kebijakan).
- **Objek:** direktif `garis-waktu` per horizon tidak dipakai karena kolom FASE wajib prabencana, tanggap darurat,
  pascabencana; diganti Tabel 16.1 garis waktu program (B5.7, kolom WAKTU, TONGGAK, GERBANG, UNIT, REK, pil horizon;
  G23); Tabel 16.2 indikator kinerja program (G22 tabel indikator B5.19, kolom INDIKATOR, BASELINE, TARGET, CARA UKUR,
  KAPAN); direktif `matriks-rekomendasi` dua blok (`kelompok: internal` dan `kelompok: lintas`) dengan anak `rek`
  dari register §6.
- **Rekomendasi asal:** SR-16, SR-17 (rencana skala bersyarat); tampil penuh semua SR.
- **Bukti:** `bukti/bab-16.md`.

### BAB 17 KESIMPULAN DAN KEPUTUSAN YANG DIMINTA (4 hlm)

- **Subbab:** 17.1 Kesimpulan; 17.2 Keputusan yang Diminta dari Kepala BNPB; 17.3 Yang Sengaja Tidak Direkomendasikan;
  17.4 Yang Belum Diketahui.
- **Pertanyaan kunci:**
  1. Delapan kesimpulan berangka apa yang menopang tesis?
  2. Keputusan apa yang hanya dapat diambil Kepala BNPB, dan apa akibat tiap pilihan?
  3. Apa yang sengaja tidak diusulkan, dan apa yang belum diketahui?
- **Isi per subbab:**
  - 17.1 Delapan kesimpulan (satu per bagian A–E plus tiga dari Bab 9, 10, 13), angka identik dengan Pesan Kunci dan
    deck; tanpa mengulang paragraf bab (L64).
  - 17.2 Direktif `keputusan` KD-1 sampai KD-7, identik dengan §3.5.
  - 17.3 Tidak direkomendasikan: jaringan pipa permanen nasional; pembelian massal sebelum G5; pipa HDPE pasang-bongkar
    tiap musim; injeksi lebih dari 5 m; sumur dalam sebagai bawaan; menyalakan gambut untuk latihan; memindahkan
    anggaran heli sebelum G5; menyatakan padam dari drone termal saja; memakai pompa api untuk genangan; irigasi dari
    kanal gambut.
  - 17.4 Belum diketahui: efikasi injeksi lance di lapangan; debit kemarau di intake; volume bara per ha; waktu gelar
    nyata per kelas medan; garis dasar operasi konvensional; harga riil; dampak pengambilan air kanal terhadap muka air
    gambut; harga heli kontrak.
- **Angka wajib:** tidak ada kunci baru; semua angka kesimpulan memakai kunci bab asal; tesis `sippa.tesis|teks`.
- **Objek:** kisi kesimpulan 4 × 2 dan pita keputusan (B5.25); direktif `keputusan`.
- **Rekomendasi asal:** tidak ada baru.
- **Bukti:** `bukti/bab-17.md` (hanya peta silang kesimpulan ke bab asal).

**Jumlah perkiraan:** 6 + 8 + 10 + 12 + 16 + 10 + 10 + 12 + 14 + 8 + 9 + 12 + 14 + 6 + 6 + 7 + 4 = 164 hlm isi utama,
ditambah bagian depan sekitar 16 hlm dan lampiran (Lampiran B dan F terbesar). Tidak ada batas (keputusan 11).

---

## 5. Lampiran

| Huruf | Judul | Isi | Sumber dan bentuk | Berkas naskah |
| --- | --- | --- | --- | --- |
| A | Metode, Data, dan Rekonsiliasi | inventaris dataset PRD §7.1 dengan status, garis keturunan PRD §7.2, tanggal tarik per paket, batas data 23 Okt 2026 23.59 WIB, label keyakinan dan status `menunggu`, keterbatasan per dataset (`pipa/data/README.md`), rekonsiliasi angka: zona lama A188/B418/C89/D170 direproduksi persis dari `kendala.json` (cocok, `matriks_jarak.md`), ambang lama 2/3 km lawan ambang baru 2,5/5 km, median air 1,28 km lama lawan 1,02 km baru, dua set CAPEX pemilik (Excel lawan Studio) lawan RAB kajian (G02), harga heli Studio tidak dipakai (G13); GloFAS tidak ditarik dan alasannya; pernyataan produsen | tabel `csv:` dari `data/sippa/inventaris.csv`, `rekonsiliasi.csv` | `90-lampiran-a.md` |
| B | Kelayakan per Kompleks Kalimantan Tengah | 865 baris: ID, kabupaten, kecamatan, lat, lon (3 desimal), gambut, jarak air dan jalan dua versi, zona dua versi, beda elevasi, status GSW, tahun terbakar MCD64A1, kekerapan sel, status lahan (berizin/lain/konservasi, tanpa nama perusahaan), `jalan_terverifikasi` | `csv: data/sippa/kelayakan_kompleks.csv`, `grup: KABUPATEN`, `orientasi: lanskap`; juga `.xlsx` serah | `90-lampiran-b.md` |
| C | Dasbor 18 Provinsi | satu halaman per provinsi bertemplat identik (L20): kartu angka, peta, luas per tahun 2015–2025, zona bila ada, kit dan depot, musim banjir pasangan, data yang belum ada | `csv: data/sippa/profil_provinsi.csv`; peta `sippa-p-<kode>` | `90-lampiran-c.md` |
| D | Daftar Bahan sampai Baut dan Kriteria Terima | BOM kit gambut, kit mineral, modul banjir, depot, gudang: kode, uraian kelas kinerja, jumlah, satuan, titik kerja, material, kriteria terima, uji (FAT, tekanan 1,5 kali, kebocoran), interval pemeliharaan, suku cadang per musim, rujukan datasheet (satu-satunya kolom yang boleh memuat merek). Baut, mur, ring, gasket dihitung **dari gambar** SIPPA-G-04, G-05, G-06, G-09 (jumlah per sambungan flensa menurut kelas PN di gambar), bukan diperkirakan; sambungan Storz tanpa baut ditulis "0, sambungan tanpa baut". Baris tanpa gambar bertanda "menunggu gambar" | `csv: data/sippa/bom_rinci.csv` | `90-lampiran-d.md` |
| E | Rencana Anggaran Biaya Rinci | `harga.csv` lengkap (kode, uraian, satuan, harga, sumber, tanggal, keyakinan, rentang, per), RAB T0–T4, OPEX per tahun 2026–2030 tahun kering dan basah, arus kas dan diskonto 8%, NPV dan BCR 3 × 3, sebaran Monte Carlo, tabel kepekaan | `csv:` dari `data/sippa/keuangan_*.csv` | `90-lampiran-e.md` |
| F | Gambar Teknik SIPPA-G-01 sampai SIPPA-G-12 | daftar gambar, kriteria terima, lalu 12 lembar A3 lipat: G-01 susunan kit relay; G-02 P&ID kit relay; G-03 detail lance 1,5 m dan teleskopik 3–5 m; G-04 manifold DN100 ke 4 × DN65; G-05 depot depan kontainer 20 kaki; G-06 gudang induk YonTP; G-07 rumah pompa panggung (hanya koridor); G-08 profil trase contoh dari DEMNAS; G-09 modul banjir GA dan P&ID; G-10 telemetri dan daya; G-11 diagram zona A–D dan alur keputusan sarana; G-12 tata letak petak A/B dan grid probe. Blok judul: nomor, revisi, skala, satuan, tanggal, digambar, diperiksa, blok pengesahan insinyur berlisensi kosong, catatan wajib pengesahan | PDF A3 dari `bangun/visual/teknik/*.mjs`; halaman PDF disisipkan pembangun DOCX | `90-lampiran-f.md` (pengantar dan daftar; lembar disisipkan) |
| G | Prosedur Operasi Standar dan Formulir | SOP-01 sampai SOP-06 bernomor (tujuan, pelaku RACI, prasyarat, langkah bernomor, titik berhenti, formulir, rujukan); formulir G3-lite, probe empat kedalaman, BBM, gerak kit, survei trase, inspeksi pasca-musim | teks; formulir juga `pipa/formulir/*.pdf` | `90-lampiran-g.md` |
| H | Protokol Pilot dan Uji A/B | protokol pilot Oktober 2026 (lokasi, alat, urutan sesi, data yang dicatat, vonis); protokol A/B pra-registrasi empat lengan (hipotesis, outcome primer dan sekunder, ukuran petak, pengacakan petak, n, analisis, aturan berhenti, etika: tidak menyalakan gambut, persetujuan pemegang hak); formulir analisis | teks + tabel; salinan `pipa/protokol-ab.md` | `90-lampiran-h.md` |
| I | Draf Surat Permintaan Data | 10 surat berkop BNPB (BIG; BWS Kalimantan II; walidata KHG atau badan restorasi gambut yang berlaku; BMKG; BPBD Kalteng dan kabupaten pilot; Manggala Agni; Badan Geologi; ATR/BPN dan pemda; LKPP dan penyedia; BNPB internal), ID data D01–D36 pemilik dipertahankan, format dan tenggat | teks; salinan `pipa/surat/*.md` | `90-lampiran-i.md` |
| J | Rumus dan Uji Invarian Hidraulika | rumus lengkap, satuan, nilai bawaan, rentang sah; nilai acuan dan hasil uji kembar JS-Python (relay DN100 1 km; OD160 NO-GO; OD200 lolos; volume isi; serapan lance) | tabel `csv: data/sippa/uji_hidraulika.csv` | `90-lampiran-j.md` |
| K | Rujukan Praktik Luar Negeri | relay layflat dan pemadaman gambut di negara lain, tiap baris berlabel "belum diverifikasi" sampai dikutip dari naskah aslinya (G18); kolom padanan di Indonesia | `::: program` dengan `jenis: uji-coba` | `90-lampiran-k.md` |
| L | Batas Pemakaian Alat Keputusan `/pipa` | yang dihitung dan tidak dihitung kalkulator dan simulator (G22, G23); gerbang keras; manfaat bawaan nol; peta kelayakan bukan izin | teks + tabel | `90-lampiran-l.md` |
| M | Glosarium | dibangkitkan dari `data/glosarium.json` (§3.6) | pembangun | tidak ditulis |
| N | Atribusi Foto | dibangkitkan dari atribut foto (`pengarang`, `lisensi`, `url`) dan `pustaka.json`; lisensi CC BY, CC BY-SA, CC0, PD saja | pembangun | tidak ditulis |

Tiap lampiran data memuat pernyataan produsen (prinsip 16). Lampiran B dan E juga diserahkan sebagai `.xlsx`.

---

## 6. Register rekomendasi SIPPA

Satu register, berkas `data/sippa/rekomendasi.csv` (kolom: id, langkah ≤ 8 kata, rincian, jenis, status P7, unit
pemimpin; unit pendukung, K/L pemimpin; pendukung, waktu, indikator selesai, dasar (bab dan regulasi), butuh,
membuka, kelompok internal/lintas). Di naskah menjadi `::: rek {#rek:<id>}` dengan atribut NASKAH-SPEK §11.1. Unit
BNPB dicocokkan ke OTK berlaku: Perban BNPB 6/2025 jo. 11/2025 (korpus `data/raw/hukum/teks`); nama di tabel ini sudah
ditemukan di kedua teks itu, pembagian Direktorat Penanganan Darurat Wilayah I–III untuk Kalteng dicek sebelum `final`.
Rekomendasi yang pemimpinnya bukan BNPB masuk `kelompok: lintas`.

| ID | Langkah | Jenis | Status | Unit BNPB pemimpin; pendukung | K/L pemimpin; pendukung | Waktu | Indikator selesai | Dasar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SR-01 | Tetapkan nota putusan program uji bergerbang | regulasi | baru | Deputi Bidang Penanganan Darurat; Deputi Bidang Sistem dan Strategi, Biro Hukum, Organisasi, dan Kerja Sama | – | 100-hari | nota ditandatangani, gerbang G0–G6 tertulis | Bab 6, 12, 13; KD-1 |
| SR-02 | Tetapkan vonis pilot Oktober 2026 | data | baru | Direktorat Dukungan Sumber Daya Darurat; Pusat Data, Informasi, dan Komunikasi Kebencanaan | Kemenhut (Manggala Agni); BPBD Kalteng | 100-hari | laporan pilot PDF dengan dua vonis | Bab 12 |
| SR-03 | Pindahkan kit pinjam ke banjir 2026 | infrastruktur | baru | Direktorat Pengelolaan Logistik dan Peralatan; Direktorat Penanganan Darurat Wilayah (sesuai pembagian) | TNI AD (YonTP); BPBD penerima | 100-hari | log jam pompa dan m³ per kabupaten | Bab 11; KD-2 |
| SR-04 | Kirim sepuluh surat permintaan data | data | baru | Pusat Data, Informasi, dan Komunikasi Kebencanaan; Direktorat Mitigasi Bencana | BIG; Kementerian PU (BWS Kalimantan II); Kemenhut; BMKG; LKPP | 100-hari | 10 surat terkirim, tanda terima | Lampiran I; KD-5 |
| SR-05 | Pilih tiga AOI dan ajukan izin air | data | baru | Direktorat Mitigasi Bencana; Direktorat Dukungan Sumber Daya Darurat | Kementerian PU (BWS Kalimantan II); BPBD Kalteng | 2026-2027 | gerbang G0 lulus | Bab 4; PRD §4.4 |
| SR-06 | Jalankan survei tapak dan uji bangku | infrastruktur | baru | Direktorat Dukungan Sumber Daya Darurat; Direktorat Pengelolaan Logistik dan Peralatan | Kemenhut (Manggala Agni) | 2026-2027 | gerbang G1 dan G2 diputus | Bab 2, 7 |
| SR-07 | Adakan tiga kit dan tiga modul banjir | infrastruktur | baru | Direktorat Pengelolaan Logistik dan Peralatan; Biro Keuangan | LKPP | 2026-2027 | kontrak setelah G2, FAT lulus | Bab 8, 13; KD-3 |
| SR-08 | Tanda tangani pinjam pakai BMN YonTP | regulasi | baru | Deputi Bidang Logistik dan Peralatan; Biro Hukum, Organisasi, dan Kerja Sama | TNI AD; Kemhan | 2026-2027 | MoU ditandatangani | Bab 10; KD-4 |
| SR-09 | Sahkan SOP dan latih operator inti | kapasitas | baru | Direktorat Kesiapsiagaan; Pusat Pendidikan dan Pelatihan Penanggulangan Bencana | Kemenhut (Manggala Agni); BPBD | 2026-2027 | 6 SOP disahkan Satgas; operator bersertifikat | Bab 9 |
| SR-10 | Kunci protokol A/B dan evaluator | data | baru | Deputi Bidang Sistem dan Strategi; Direktorat Pemetaan dan Evaluasi Risiko Bencana | – | 2026-2027 | protokol pra-registrasi terkunci sebelum Juli 2027 | Bab 12; KD-6 |
| SR-11 | Pasang sekat kanal di sel inti | infrastruktur | sudah-ada | Direktorat Mitigasi Bencana (pendukung) | Kemenhut atau badan restorasi gambut yang berlaku; BPBD | 2026-2027 | sekat di 3 AOI sebagai lengan pembanding | Bab 6, 12 |
| SR-12 | Jalankan pemicu pra-posisi harian | data | baru | Direktorat Peringatan Dini; Pusat Data, Informasi, dan Komunikasi Kebencanaan | BMKG | 2026-2027 | `pemicu.json` harian; uji balik 2015/2019/2023 ditulis | Bab 3, 9 |
| SR-13 | Uji irigasi di satu kabupaten | infrastruktur | baru | Direktorat Pengelolaan Logistik dan Peralatan | Kementerian Pertanian; BPBD | 2026-2027 | catatan pinjam dan syarat keras terpenuhi | Bab 11; KD-7 |
| SR-14 | Gelar latihan basah tahunan | kapasitas | baru | Direktorat Kesiapsiagaan | BPBD; Kemenhut (Manggala Agni) | 2028-2030 | gerbang G6 tiap lokasi tiap tahun | Bab 9 |
| SR-15 | Putus gerbang efikasi dan skala | data | baru | Deputi Bidang Sistem dan Strategi; Deputi Bidang Penanganan Darurat | – | 2028-2030 | laporan evaluasi independen G4/G5 | Bab 12 |
| SR-16 | Siapkan skala Kalteng bila lulus | infrastruktur | baru | Deputi Bidang Logistik dan Peralatan | BPBD Kalteng; Kemenhut | 2028-2030 | rencana 14 kit dan 7 depot terhubung G5 | Bab 5, 13, 16 |
| SR-17 | Tahapkan rencana nasional bersyarat | pembiayaan | baru | Biro Perencanaan; Deputi Bidang Logistik dan Peralatan | Bappenas; Kemenkeu | 2028-2030 | paling banyak 25 kit pada 2030 setelah G5 | Bab 5, 13 |
| SR-18 | Rumuskan opsi peran konsesi | regulasi | baru | Deputi Bidang Pencegahan | Kemenhut; KLH | 2028-2030 | naskah opsi dengan syarat tertulis | Bab 10 |
| SR-19 | Serahkan harga kontrak heli | data | baru | Direktorat Dukungan Sumber Daya Darurat; Biro Keuangan | – | 100-hari | slot heli terisi di `angka.json` | Bab 13; KD-5 |
| SR-20 | Verifikasi jalan dan pasang telemetri | data | baru | Pusat Data, Informasi, dan Komunikasi Kebencanaan; Direktorat Dukungan Sumber Daya Darurat | BPBD Kalteng | 2026-2027 | `jalan_terverifikasi` di AOI; telemetri menerima data | Bab 4, 15 |

Langkah ≤ 8 kata dan berwaktu (D-31). Urutan tampil di Bab 16: internal dulu menurut waktu, lalu lintas.

---

## 7. Foto, peta, grafik, dan gambar teknik

### 7.1 Foto Wikimedia Commons yang dicari

Hanya Commons dengan lisensi CC BY, CC BY-SA, CC0, atau PD (NC dan ND ditolak, D-15); tanpa ilustrasi AI (P12); tanpa
foto yang menampilkan merek alat atau logo lembaga selain BNPB secara menonjol (keputusan 50; logo kecil di seragam
boleh bila tidak terbaca). Kandidat ditambahkan ke `kandidat-foto-commons.csv` dengan `kajian=sippa`, lalu dipilih
dan diberi atribut `pengarang`, `lisensi`, `url` di direktif `gambar` `jenis: foto`.

| Kode | Topik | Kueri Commons (urut dicoba) | Dipakai di |
| --- | --- | --- | --- |
| F1 | Asap dan api di lahan gambut Kalimantan | "peat fire Kalimantan"; "2015 Southeast Asian haze Central Kalimantan"; "kebakaran lahan gambut" | sampul, Bab 1 |
| F2 | Kebakaran 2019 di Kalimantan Tengah | "2019 Indonesian forest fires Central Kalimantan"; "Palangka Raya haze 2019" | sampul alternatif, Bab 3 |
| F3 | Gambut terbakar atau bekas bakar, profil tanah | "burnt peatland Indonesia"; "peat soil profile"; "peat swamp forest fire scar" | Bab 2 |
| F4 | Regu pemadam darat di gambut, selang dan pompa | "firefighters peatland Indonesia"; "Manggala Agni"; "forest firefighter hose Indonesia" | Bab 9 |
| F5 | Kanal gambut dan sekat kanal | "canal blocking peatland Indonesia"; "peat canal Central Kalimantan"; "Ex-Mega Rice Project canal" | Bab 6 |
| F6 | Banjir di Kalimantan atau pompa banjir | "flood Kalimantan"; "banjir Kalimantan Tengah"; "flood pump Indonesia" | Bab 11 |
| F7 | Sungai Kahayan atau Sebangau (sumber air) | "Kahayan River"; "Sebangau National Park river" | Bab 4 |
| F8 | Water bombing helikopter | "water bombing helicopter Indonesia"; "helicopter forest fire Indonesia" | Bab 1 atau Bab 13 (tanpa nama operator terbaca) |
| F9 | Selang layflat tergelar | "lay-flat hose"; "fire hose relay pumping" | Bab 7 (bila tanpa merek terbaca) |

Paling sedikit satu foto per bab yang punya padanan topik; foto boleh ditambah sebanyak yang relevan (P18). Atribusi
otomatis di Lampiran N.

### 7.2 Peta dan grafik yang dibangkitkan

Generator: `bangun/visual/render.mjs` atas spek di `bangun/visual/spek-sippa/*.json` (pola `spek-air/`), data
disiapkan `bangun/visual/data_sippa.py` (pola `data_air.py`) dari paket `data/sippa/`. Keluaran `gambar/sippa/*.png`
300 dpi + SVG + manifest; gerbang D-8, D-21, D-24, D-28. Tiap spek memakai `pesan` kode G yang punya perender atau
`alasan` satu kalimat.

| Spek | Gambar | Kode G | Perender | Data |
| --- | --- | --- | --- | --- |
| `sippa-01` | Zona A–D per kompleks Kalteng, konservatif (Gambar 4.1, RE.1, deck B1) | G16 kategori pada titik (alasan tertulis) | `peta.mjs` lapisan titik kategori | `data/sippa/kelayakan_kompleks.csv` |
| `sippa-02` | Zona A–D, optimistis (Gambar 4.2) | idem | idem | idem |
| `sippa-03` | Deteksi VIIRS per tahun 2012–2025 (Gambar 3.1, deck A1) | G1 | `grafik.mjs batang` | `data/sippa/viirs_tahunan.csv` |
| `sippa-04` | Kekerapan sel 2,2 km (Gambar 3.2, deck A2) | G19 | `peta.mjs` perender sel baru (§8.3) | `data/sippa/sel22.json` |
| `sippa-05` | Deteksi di sel berulang 2019 dan 2023 (Gambar 3.3) | G14 | `grafik.mjs batang` berpasangan | `sel22.json` |
| `sippa-06` | Jumlah tahun terbakar per kompleks (Gambar 3.4) | G1 | `grafik.mjs batang` | `area_terbakar.csv` |
| `sippa-07` | Anomali CHIRPS Juli–Oktober (Gambar 3.5) | G7 | perender divergen baru atau `batang` bertanda (§8.3) | `chirps_anomali_tahunan.csv` |
| `sippa-08` | Jarak air dan jalan median dan p90 (Gambar 4.3) | G12 | `grafik.mjs rentang` | `osm_jarak.csv` |
| `sippa-09` | Beda elevasi air lawan kompleks (Gambar 4.4) | G1 | `grafik.mjs batang` | `dem_elevasi.csv` |
| `sippa-10` | Kit bersyarat per provinsi (Gambar 5.1, deck B2) | G20 | `peta.mjs` simbol sebanding | `kit_nasional.csv` |
| `sippa-11` | Porsi zona A–D sembilan provinsi (Gambar 5.2) | G8 | `grafik.mjs bertumpuk` | `zona_provinsi.csv` |
| `sippa-p-<kode>` (18) | Peta kecil per provinsi (Bab 5.5, Lampiran C) | G20 | `peta.mjs` | `profil_provinsi.csv` |
| `sippa-12` | Head loss per km lawan debit, lima diameter (Gambar 7.1, deck C2) | alasan: hubungan dua besaran kontinu, satu sumbu y | `grafik.mjs garis` | `hidraulika_kurva.csv` |
| `sippa-13` | Waktu gelar per kelas medan (Gambar 12.2) | G12 | `grafik.mjs rentang` | `gerbang.csv`, `pilot_2026.csv` |
| `sippa-14` | CAPEX bertingkat T1–T4 (Gambar 13.1, deck E1) | G9 | `grafik.mjs bertumpuk` | `keuangan_tingkat.csv` |
| `sippa-15` | Kipas Monte Carlo T2 (Gambar 13.2, deck E1) | G11 | perender pita baru (§8.3) | `keuangan_mc.csv` |
| `sippa-16` | Tornado kepekaan (Gambar 13.3) | G4 | `grafik.mjs horizontal` | `keuangan_kepekaan.csv` |
| `sippa-17` | Matriks risiko (Gambar 14.1) | G17 | `grafik.mjs matriks` | `risiko.csv` |
| `sippa-18` | Matriks respons tingkat 1–4 (deck D1, bila tabel native tidak dipakai) | G16 | `grafik.mjs matriks-titik` | `respons.csv` |

**Aturan grafik (skill `dataviz`, tunduk pada `tema.json` dan PEDOMAN §B5.10 bila bertentangan):**

1. Bentuk dipilih dari tugas data dulu, warna terakhir; angka tunggal menjadi kartu angka, bukan grafik.
2. Satu sumbu y per grafik; dua besaran beda skala menjadi dua grafik atau peta kecil berganda (G25 melarang sumbu
   ganda).
3. Warna kategorikal zona A–D dan kelompok gambut lawan mineral diberi urutan tetap dari `tema.json` dan tidak berubah
   antargambar, antarversi, dan di deck; warna mengikuti entitas, bukan peringkat.
4. Sekuensial satu rona terang ke gelap (kekerapan sel, ramp api); divergen dua rona dengan titik tengah netral
   (anomali CHIRPS, warna arah T2).
5. Palet baru untuk SIPPA (empat warna zona) diuji dengan validator skill `dataviz`
   (`scripts/validate_palette.js "<hex,...>" --mode light`, lalu `--mode dark` untuk layar `/pipa`) dan ΔE CIEDE2000
   antarpasangan dicatat seperti T6; hex hanya dari `tema.json` (D-9). Status GO/NO-GO selalu dengan teks atau ikon,
   tidak warna saja.
6. Legenda untuk ≥ 2 seri, label langsung untuk ≤ 4 seri; tanpa angka di tiap titik; teks memakai warna teks, bukan
   warna seri.
7. Tiap grafik di layar web punya tampilan tabel; versi cetak memakai pola atau label untuk pembaca buta warna.
8. Render dilihat (lembar bukti `render.mjs --lembar` lalu `pdftoppm`) sebelum dinyatakan selesai: irisan label,
   geometri, luapan.

### 7.3 Gambar teknik

Generator baru `bangun/visual/teknik/*.mjs` (Node stdlib, pola `bangun/visual`): `kit_ga.mjs` (G-01), `pid.mjs` (G-02,
G-09, G-10), `lance.mjs` (G-03), `manifold.mjs` (G-04), `depot.mjs` (G-05), `gudang.mjs` (G-06), `rumah_pompa.mjs`
(G-07), `profil.mjs` (G-08, dari DEMNAS AOI; bila DEMNAS belum diterima dari BIG, memakai Copernicus GLO-30 dengan
catatan DSM berkanopi dan label `terverifikasi; DSM`), `zona.mjs` (G-11, membaca aturan `saranSarana` dari
`public/pipa/hitung.js` supaya identik), `petak.mjs` (G-12), ditambah diagram buku `lapis.mjs`, `siklus.mjs`,
`penampang.mjs`, `alur.mjs`, `lembaga.mjs`, `gerbang.mjs`, `alur_data.mjs`. Keluaran: SVG, PNG 300 dpi untuk badan
teks, PDF A3 untuk Lampiran F. Blok judul satu modul bersama `teknik/blok_judul.mjs`; uji diri menolak gambar tanpa
blok pengesahan kosong atau tanpa kalimat wajib pengesahan, dan menolak dimensi tanpa satuan. Tag P&ID identik dengan
skema telemetri PRD §9.11 (diuji silang).

---

## 8. Perubahan mesin yang diperlukan

Berkas yang disentuh dimiliki `pipa-data` (semua `data/kajian-bnpb/**`, PRD §10.3), kecuali gerbang (`penulis-gerbang`)
dan `public/pipa/**` (agent `sippa` atau `layar-peta` sesuai roster). Subagent tidak commit; sesi induk yang commit
dengan path spesifik.

### 8.1 Kontrak dan pembangun

| No | Berkas | Perubahan | Bukti |
| --- | --- | --- | --- |
| M1 | `tema.json` | blok `kajian.sippa` (§1); `qa.pustaka.kajian_min.sippa = 50`; palet zona A–D sebagai token warna kategori | `python3 bangun/kontrak/tema.py` |
| M2 | `bangun/kontrak/naskah.py` | daftar kajian sah dibaca dari kunci `tema.json` `kajian` (bukan tuple `('air', 'mitigasi')` baris 426); fixture baru menolak kajian tak dikenal | uji diri `python3 bangun/kontrak/naskah.py` |
| M3 | `bangun/docx/bangun.py` | `choices` argumen kajian dari `tema.json` (baris 2021); peta JUDUL sampul (baris 1572) sudah membaca `kj['judul']`, cukup diuji; penyisipan halaman PDF A3 Lampiran F sebagai halaman lipat (fitur baru, atau Lampiran F diserahkan sebagai PDF terpisah bila fitur belum ada, dicatat §10) | `.venv/bin/python bangun/docx/bangun.py sippa` |
| M4 | `qa/periksa.py` | `_kajian()` (baris 1285), `--kajian` (baris 2530), dan T-5 (baris 2091) membaca daftar kajian dari `tema.json`; gerbang baru di §9.4 | `qa/periksa.py --docx ... --kajian sippa` |
| M5 | `bangun/pptx/deck.py` | memastikan spek `naskah/sippa/deck.json` dan stem `sippa-deck` berbeda dari DOCX; tidak ada pemetaan kajian lain yang dikunci | `bangun/pptx/periksa.py` |
| M6 | Workflow `naskah-kajian.js` dan `rakit-kajian.js` di `~/.claude/projects/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/6b4ae72d-ad19-4e2b-b9ca-73f12c9d80a1/workflows/scripts/` (di luar repo, tidak di-commit; tiket SP-005 `pipa/TIKET.md`) | kini bercabang tetap `KAJIAN === 'air' ? ... : ...` (baris 17–20). Cabang `sippa`: `JUDUL` = judul §1; `NAMA` = "Kajian SIPPA {DDMMYY}"; otoritas = `pipa/KEPUTUSAN-SIPPA.md`, `KEPUTUSAN.md` (§0.2 berkas ini), Buku Pegangan, `pipa/KERANGKA-BUKU.md` menggantikan "KERANGKA.md bagian ${BAGIAN}" (bab §4, register §6, butir terbuka §10, deck §11); peta BAGIAN deck A Pola api, B Kelayakan, C Desain, D Operasi dan lembaga, E Biaya dan jalan; "KD-1..KD-5" diganti "KD-1..KD-7"; "±13 slide isi" diganti 15; cek batas halaman (rakit baris 41, 110/150) dilewati untuk `sippa` (keputusan 11); nama berkas depan dan lampiran mengikuti pola repo yang dibaca `bangun.py` (`00-depan-*.md`, `90-lampiran-<huruf>.md`, seperti `naskah/air/`), bukan `00-depan.md` dan `90-lampiran.md` tunggal; larangan keputusan 50 dan "tanpa bab kritik" disisipkan ke prompt penulis | diff dibaca pemeriksa berkonteks bersih: cabang `air` dan `mitigasi` tidak berubah perilaku |
| M7 | `data/glosarium.json` | singkatan dan istilah §3.6; `varian_terlarang`: "terbukti efektif", "sudah terbukti", "teruji" tanpa rujukan, nama merek alat yang dipakai di pustaka datasheet, "jaringan pipa nasional" | T-9, D-10 |
| M8 | `pustaka.json` | ≥ 50 sumber, separuh resmi atau primer: Page dkk. 2002, Ballhorn dkk. 2009, Santoso dkk. 2021, Mulyasih (UI), PP 57/2016, Permen LHK P.32/2016, UU 24/2007, Perban BNPB 1/2023, 6/2025, 11/2025, lembar data pompa dan layflat, CHIRPS, WorldCover, FIRMS, MCD64A1, GSW (Pekel dkk. 2016), Copernicus DEM, OSM, SiPongi, DIBI, pernyataan BNPB 2023, Kemenhut OMC 2026, BRGM 2021, LPDS 2016 | T-11, D-19 |
| M9 | `kandidat-foto-commons.csv` | baris `kajian=sippa` per §7.1 | D-15 |

### 8.2 Paket data dan registri angka

| No | Berkas | Perubahan |
| --- | --- | --- |
| M10 | `data/sippa/` (di `data/kajian-bnpb/data/`) dengan `README.md` (sumber, lisensi, keterbatasan, tanggal tarik, batas data) | paket kajian: salinan beku per batas data dari `pipa/data/*.csv`, `public/data/luas_resmi.json`, `kendala.json`, `operasi.json`, ditambah turunan: `viirs_tahunan.csv`, `sel22.json`, `zona.json`, `zona_versi.csv`, `zona_provinsi.csv`, `kelayakan_kompleks.csv`, `aoi_calon.json`, `kit_nasional.csv/json`, `profil_provinsi.csv`, `parameter.csv`, `hidraulika_skenario.csv`, `hidraulika_kurva.csv`, `uji_hidraulika.csv`, `lance_orifis.csv`, `respons.csv`, `gerbang.csv`, `harga.csv`, `bom_gambut.csv`, `bom_rinci.csv`, `keuangan*.csv/json`, `risiko.csv`, `indikator.csv`, `rekomendasi.csv`, `inventaris.csv`, `rekonsiliasi.csv`, `pilot_2026.csv` |
| M11 | `bangun/pipa_data.py` | langkah baru `paket` yang menulis M10 dari keluaran langkah yang sudah ada dan dari `scripts/data/sippa/*.py` (PRD §7.2); self-check `__main__` memeriksa reproduksi A188/B418/C89/D170 dan jumlah 865 |
| M12 | `bangun/sippa_angka.py` | membangun entri `angka` kunci `sippa.*` di `data/angka.json` dengan `berkas` relatif ke `data/` (contoh `"berkas": "sippa/zona.json"`), label, sumber; tidak menimpa kunci yang ada; entri `menunggu` ditulis dengan `nilai: null` dan `keyakinan: "menunggu"` |
| M13 | `bangun/sippa_keuangan.py` | RAB, OPEX, TCO, NPV, BCR 3 × 3, Monte Carlo 800 sampel berbenih, kepekaan, dari `harga.csv`; self-check menolak item di dua satuan alokasi dan kontingensi ganda |
| M14 | Kontrak `angka.json` dan pembaca token | status `menunggu` dikenali: token berstatus `menunggu` tampil "–" dan wajib catatan alasan; D-22 dan D-14 menerima "–" dari entri `menunggu`; `tema.json` `kosakata.keyakinan` ditambah `menunggu` untuk pil |
| M15 | Pemicu ekspor D1 | skrip `bangun/sippa_pilot.py` membaca CSV ekspor `/api/sippa/log.csv` yang diunduh staf ke `data/sippa/pilot_2026.csv` (tanpa kredensial di repo) |

### 8.3 Visual

| No | Berkas | Perubahan |
| --- | --- | --- |
| M16 | `bangun/visual/peta.mjs` | lapisan titik kategori (zona A–D) dan perender sel grid 2,2 km (koroplet sel, bukan wilayah administratif); cakupan Kalteng dan nasional |
| M17 | `bangun/visual/grafik.mjs` | perender divergen G7 (bila `batang` tidak cukup) dan pita G11 |
| M18 | `bangun/visual/data_sippa.py`, `spek-sippa/*.json` | pola `data_air.py` dan `spek-air/` |
| M19 | `bangun/visual/teknik/*.mjs` | §7.3, dengan `uji.mjs` sendiri |

---

## 9. Urutan produksi dan gerbang QA

### 9.1 Pemetaan fase skill produksi buku ke mesin repo

Skill `book-production-rules` memakai 14 fase; aturan repo menang bila bertentangan (Buku Pegangan baris "Pembaca beta
3–5 orang ... tidak ditiru" dan `KEPUTUSAN.md`). Pemetaannya:

| Fase skill | Padanan di repo | Catatan |
| --- | --- | --- |
| 1 Ideation | PRD §1, KEPUTUSAN-SIPPA | selesai |
| 2 Research | berkas bukti `bukti/bab-NN.md` (L56, L57); pustaka ≥ 50 | minimal pustaka repo (L65) lebih ketat dari skill |
| 3 Outline | berkas ini | selesai saat disetujui sesi induk |
| 4 Draft | naskah bab dialek NASKAH-SPEK | |
| 5 Self-edit | QA lapis (a) L68 | |
| 6 Beta reader | **tidak dijalankan** | diganti penyunting independen per bab (Buku Pegangan) |
| 7 Revise | sesudah lapis (b) dan (c) | |
| 8 Copy edit | lapis (b) substansi dan (c) bahasa | |
| 9 Proofread | lapis (d) pada render (L72) | |
| 10 Format, 11 Layout | `bangun/docx/bangun.py` dari `tema.json` (Roboto, A4, L1) | font skill (Garamond) tidak berlaku |
| 12 Cover | sampul dan sampul belakang dibangkitkan (§3.1) | |
| 13 ISBN | **tidak** (kolofon tanpa ISBN) | |
| 14 Publish | serah berkas `keluaran/` ke pemilik; tanpa epub, tanpa materi pemasaran | |

Glosarium dan pemindai varian (aturan skill 7) dijalankan lewat T-9; pemenggalan id-ID (aturan 8) lewat L67.

### 9.2 Urutan kerja

| Langkah | Kerja | Pengerja | Bergantung | Paralel dengan | Bukti selesai |
| --- | --- | --- | --- | --- | --- |
| S1 | Persetujuan kerangka ini oleh sesi induk; PRD §8 diperbarui sesuai §0.3 | sesi induk | – | – | catatan sesi |
| S2 | Mesin M1–M5, M7, M14 | `pipa-data`, gerbang oleh `penulis-gerbang` | S1 | S3, S4 | uji diri kontrak hijau |
| S3 | Paket data M10–M13 dan skrip `scripts/data/sippa/*.py` dengan self-check | `pipa-data` | S1 | S2 | `.venv/bin/python bangun/pipa_data.py paket`; `bangun/sippa_angka.py` |
| S4 | Pustaka M8, foto M9, glosarium M7 | penulis riset | S1 | S2, S3 | `qa/periksa.py` bagian pustaka |
| S5 | Berkas bukti bab 1–17 dalam tiga kelompok paralel: (a) Bab 1–5, (b) Bab 6–11, (c) Bab 12–17 | tiga penulis bukti | S3 | S6, S7 | tiap bab punya Inti, Temuan bersumber, Inferensi, Celah, `.angka.json`, `.pustaka.json` |
| S6 | Visual §7.2 (M16–M18) | `pipa-data` | S3 | S5, S7 | `node render.mjs --lembar`; `qa/periksa.py --visual` |
| S7 | Gambar teknik §7.3 (M19) | `pipa-data` | S1 | S5, S6 | daftar periksa PRD §6.9 diisi pengulas lain |
| S8 | Naskah bab, bagian depan, lampiran A–L; paling banyak empat penulis paralel | penulis | S5, S4 | S6, S7 | `python3 bangun/kontrak/naskah.py naskah/sippa/*.md`; `qa/slop.py --ambang --laporan` per bab |
| S9 | Bab 11.4 dan 12.3 dari ekspor D1 (M15) | penulis | ekspor pilot 1 Nov dan banjir | S8 | pil "pilot, n kecil" |
| S10 | QA lapis (b) substansi, (c) bahasa, per bab, oleh agent berbeda dari penulis (AGENTS.md §3.2) | penyunting | S8 | antar bab | nol angka ketikan; semua bab LULUS |
| S11 | Bangun DOCX dan PDF | `pipa-data` | S10, S6, S7 | S12 | `cd data/kajian-bnpb && .venv/bin/python bangun/docx/bangun.py sippa` |
| S12 | Deck: `naskah/sippa/deck.json` lalu PPTX dan PDF | `pipa-data` | S3, S6, Bab 17 final | S11 | `.venv/bin/python bangun/pptx/deck.py` atas spek; `bangun/pptx/periksa.py` |
| S13 | QA lapis (d) proofread render dan (e) gerbang mekanis | pengulas berbeda | S11, S12 | – | `keluaran/qa/sippa.md`, `sippa-deck.md` |
| S14 | Serah versi minggu 49 | sesi induk | S13 | – | berkas di `keluaran/` + manifest |

Fan-out yang menulis memakai `isolation: "worktree"` (AGENTS.md §3.3). Tiap subagent yang dibuat sesi induk diberi
kalimat "You are a subagent. Don't run memo."

### 9.3 QA lima lapis (L68)

1. **(a) Penulis:** dialek lolos `naskah.py`; token, kutipan, rujukan terurai; pertanyaan kunci terjawab berurutan.
2. **(b) Substansi:** tiap angka dicocokkan ke `angka.json` dan sumbernya; nilai acuan di berkas ini dibandingkan
   dengan hasil skrip, selisih dicatat; paragraf tanpa angka, sumber, atau keputusan dipotong; label keyakinan
   benar; "terbukti" diperiksa manual.
3. **(c) Bahasa:** `qa/slop.py --ambang --laporan` sampai LULUS; ditambah enam cek skill `anti-ai-checker` sebagai
   pemindai pendamping: kata terlarang (`ANTI-SLOP.md` adalah daftar yang berlaku), em dash nol (lebih ketat dari ambang
   skill 3,0 per 1.000 kata), kepadatan titik dua ≤ 20 per 1.500 kata di prosa (tidak berlaku untuk label paragraf dan
   sel tabel), pembuka klise di 50 kata pertama tiap bab, frasa pagar ≤ 2 per 1.500 kata, daftar tiga sejajar ≤ 5 per
   1.000 kata. Vonis skill HARD FAIL (≥ 3 pelanggaran) menahan bab seperti vonis `slop.py`.
4. **(d) Proofread render:** dibaca dari PNG halaman PDF (L72): judul dua baris, tabel terpotong, rujukan "Gambar n.m"
   cocok, pil keyakinan terbaca, gambar teknik terbaca pada A3.
5. **(e) Gerbang mekanis:** `qa/periksa.py --docx keluaran/sippa.docx --pdf keluaran/sippa.pdf --pptx
   keluaran/sippa-deck.pptx --pptx-pdf keluaran/sippa-deck.pdf --visual bangun/visual/keluaran --kajian sippa --ketat`
   dengan D-1 sampai D-32, T-1 sampai T-11 nol gagal; D-12 lolos tanpa batas (P18).

### 9.4 Gerbang baru khusus SIPPA (`penulis-gerbang`, dengan fixture negatif)

| Kode usulan | Memeriksa | Ditolak bila |
| --- | --- | --- |
| D-33 | Nama merek dan perusahaan | kata dari daftar merek di `glosarium.json` muncul di luar Daftar Pustaka dan kolom RUJUKAN DATASHEET Lampiran D |
| D-34 | Kedalaman injeksi | pola angka kedalaman injeksi > 5 m di prosa, tabel, atau slide |
| D-35 | Gambar teknik | gambar berawalan "SIPPA-G-" tanpa kalimat wajib pengesahan di keterangan atau tanpa blok pengesahan kosong di manifest |
| D-36 | Slot menunggu | entri `menunggu` tampil selain "–", atau "–" tanpa catatan alasan |
| D-37 | Rencana bersyarat | tabel, peta, atau slide yang memuat kunci `sippa.kit.nasional.*`, `sippa.rab.t3.*`, `sippa.rab.t4.*` tanpa frasa "rencana bersyarat" |
| D-38 | "Terbukti" | kata "terbukti" atau "teruji" dalam kalimat tanpa kutipan pustaka di kalimat yang sama |

Gerbang-gerbang ini juga dijalankan untuk deck (`bangun/pptx/periksa.py`) sejauh berlaku.

### 9.5 Batas

Tidak ada `wrangler deploy` atau push dari subagent; buku tidak dideploy. Kata Pengantar tetap berpenanda periksa
pemilik sampai dilepas pemilik (T7). Berkas `* 2.*` tidak disunting atau dipakai.

---

## 10. Butir terbuka

| No | Butir | Bawaan sementara | Pemutus |
| --- | --- | --- | --- |
| O1 | Harga helikopter kontrak BNPB per jam dan per sorti (keputusan 14, KD-5) | slot `menunggu`; pembanding pernyataan "> Rp200 juta per sorti" | pemilik |
| O2 | Neraca debit kit: 8 lance × 40 L/min (sekitar 5,3 L/s) lawan debit operasi 10 L/s (Bab 7.4) | alokasi sisa ke selang serang dan perimeter, diputus `hidraulika.py` dan bench G2 | `pipa-data` lalu `validasi-model` |
| O3 | Workflow `naskah-kajian.js` dan `rakit-kajian.js` ada di `~/.claude/projects/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/6b4ae72d-ad19-4e2b-b9ca-73f12c9d80a1/workflows/scripts/`, di luar repo dan tidak terlacak git | perubahan M6 dikerjakan tiket SP-005 tanpa commit; sampai selesai, workflow tidak boleh dijalankan untuk `sippa` | sesi induk (`mekanik-mesin`) |
| O4 | Pembagian Direktorat Penanganan Darurat Wilayah I–III untuk Kalteng dan provinsi banjir | ditulis "sesuai pembagian wilayah" | penulis Bab 10 dengan skill `hukum-bnpb` |
| O5 | Nama lembaga restorasi gambut dan walidata KHG yang berlaku Oktober 2026 | "Kemenhut atau badan restorasi gambut yang berlaku" | penulis Bab 10 |
| O6 | Penyisipan halaman A3 lipat ke DOCX (M3) | bila belum didukung, Lampiran F menjadi PDF A3 terpisah dan halaman di DOCX berisi daftar dan rujukan; T-2 tetap terpenuhi | `pipa-data` |
| O7 | DEMNAS AOI belum diterima dari BIG | SIPPA-G-08 dan Gambar 7.2 memakai Copernicus GLO-30 berlabel DSM | surat Lampiran I |
| O8 | Tanggal terbit buku | Desember 2026 | sesi induk |
| O9 | Ambang FRP matriks respons belum diuji terhadap log 2026 | tabel PRD §5.4 berlabel asumsi-kebijakan | `pipa-data` sebelum `final` |
| O10 | Angka pembanding berita (OMC, sekat kanal, sumur dangkal, armada heli) belum dibuka ke dokumen resmi | hanya di naskah `draf`; bila tidak terbuka, pindah ke catatan berlabel | penulis riset |

---

## 11. Deck paparan (15 slide isi)

Spek `naskah/sippa/deck.json` dibaca `bangun/pptx/deck.py` (pola `naskah/air/deck.json`); keluaran
`keluaran/sippa-deck.pptx` dan `.pdf`. Mengikuti Buku Pegangan S1–S39 dan templat rumah BNPB (slide master
`bangun/pptx/templat`: garis y95 dan y507,6, nomor halaman, logo BNPB, pil CUT OFF `23 Okt 2026, 23.59 WIB` di slide
data). Dari skill `alfatehan-pptx-rules` dipakai yang tidak bertentangan dengan Buku Pegangan: Roboto saja; nol emoji
dan nol simbol Unicode sebagai ikon (ikon dari registri `tema.json` `glif`); tanpa garis aksen di bawah judul; tiap
slide bervisual (S36); paling banyak 6 butir, dua tingkat inden (S38); tiap angka bersumber dan bertahun di baris
Sumber; variasi tata letak (S35); kata terlarang `ANTI-SLOP.md`; em dash nol. Ukuran judul mengikuti Buku Pegangan (19
pt, maks 2 baris, T11), bukan 36–44 pt skill; palet dari `tema.json`, bukan palet skill.

`pesan_kunci` akar spek: "Api Kalteng kembali ke tempat yang sama; kit relay portabel dipra-posisikan ke sana, membasahi
bara 0–1,5 m, dipakai lagi untuk banjir, dan dibeli hanya setelah gerbang uji lulus."

Bagian: **A** Pola api; **B** Kelayakan; **C** Desain; **D** Operasi dan lembaga; **E** Biaya dan jalan. Judul slide
berkode A–D wajib `judul_bentuk: temuan` dengan token angka di judul (NASKAH-SPEK §17); karena itu slide kit, respons,
gerbang, dan RACI yang di PRD §8.5 deskriptif ditulis ulang menjadi judul temuan. Urutan `jenis_slide`: navigasi,
peta, grafik, peta, tabel, panel, grafik, matriks, tabel, matriks, panel, matriks, grafik, rekomendasi, navigasi (tidak
ada dua jenis sama berurutan).

| No | Kode | `jenis_slide` | `judul_bentuk` | Judul (bentuk, token) | `pesan` | Visual dan sumber |
| --- | --- | --- | --- | --- | --- | --- |
| – | sampul | – | – | Sistem Pipa Portabel Karhutla dan Banjir (SIPPA) 2026–2030 | – | sampul rumah BNPB, subjudul, foto F1 atau F2 beratribusi |
| 1 | – | navigasi | deskriptif | Pesan Kunci: api kembali ke tempat yang sama, kit bergerak ke sana, belanja menunggu gerbang | tesis, lima temuan satu per bagian, pita KD-1, KD-2, KD-3 | tesis `{{angka:sippa.tesis\|teks}}`; lima kartu "Temuan A.1" sampai "Temuan E.1" berpil keyakinan; pita keputusan |
| 2 | A1 | peta | temuan | `{{angka:sippa.sel22.kalteng.deteksi_2023_sel_berulang_persen\|persen}}` deteksi 2023 jatuh di sel 2,2 km yang sudah terbakar tiga tahun atau lebih | lokasi api dapat ditebak | peta `sippa-04` + kartu angka 72% (2019) dan 825 sel aktif ≥ 7 tahun; pil Terverifikasi; Sumber: NASA FIRMS VIIRS 2012–2025, olahan Pantau Bencana |
| 3 | A2 | grafik | temuan | Deteksi VIIRS Kalteng `{{angka:sippa.viirs.kalteng.2015}}` titik pada 2015 dan di bawah `{{angka:sippa.viirs.kalteng.maks_2020_2022}}` per tahun pada 2020–2022 | aset tetap akan diam di sebagian besar tahun | batang G1 `sippa-03` native; pil Terverifikasi |
| 4 | B1 | peta | temuan | `{{angka:sippa.zona.kalteng.konservatif.ab.n}}` kompleks Kalteng (`{{angka:sippa.zona.kalteng.konservatif.ab.persen\|persen}}`) berada di zona yang dapat dilayani kit | kit menjawab sebagian besar, zona D dijawab pencegahan | dua peta kecil `sippa-01` dan `sippa-02` berdampingan, label "konservatif" dan "optimistis, wajib verifikasi jalan"; tabel mini A–D dua versi |
| 5 | B2 | tabel | temuan | `{{angka:sippa.kit.nasional.n}}` kit bersyarat untuk 18 provinsi, `{{angka:sippa.kit.nasional.gambut}}` di provinsi gambut | kebutuhan nasional terukur tetapi bersyarat G5 | tabel native 18 baris (provinsi, luas puncak, kit, kelas) + peta kecil `sippa-10`; pil Asumsi kebijakan; teks "rencana bersyarat, bukan pengadaan" |
| 6 | C1 | panel | temuan | Bara gambut berada pada `{{angka:sippa.bara.kedalaman_m\|rentang\|satuan}}`; injeksi dibatasi 0–1,5 m dan paling dalam 5 m | doktrin kedalaman dari fisika gambut | diagram penampang (Gambar 2.1) + tiga kartu angka (kedalaman, air per ha rendah–atas, ambang dingin 50 °C) |
| 7 | C2 | grafik | temuan | Relay DN100 pada 10 L/s kehilangan sekitar `{{angka:sippa.hid.dn100_10ls.hf_m_per_km}}` m per km; satu pompa cukup untuk 1 km | titik kerja di ujung manifold, booster dari profil | garis `sippa-12` native + panel serapan lance; pil Estimasi model |
| 8 | C3 | matriks | temuan | Satu kit gambut memuat `{{angka:sippa.bom.kit_gambut.n_kode}}` komponen berkode dengan CAPEX `{{angka:sippa.rab.kit_gambut\|rupiah}}` | isi kit sampai komponen dan kriteria terima | GA ringkas SIPPA-G-01 + tabel BOM 8 baris teratas menurut biaya; pil Asumsi kebijakan; catatan "wajib pengesahan insinyur" |
| 9 | C4 | tabel | temuan | Modul banjir mengeringkan 1 ha genangan 0,5 m dalam sekitar `{{angka:sippa.banjir.jam_100ls}}` jam, pompa api perlu sekitar `{{angka:sippa.banjir.jam_30ls}}` jam | pemakaian ganda butuh modul terpisah | tabel native kapasitas + kalender kit karhutla-banjir-irigasi (Gambar 11.1) |
| 10 | D1 | matriks | temuan | Api tingkat 4 membutuhkan sedikitnya `{{angka:sippa.respons.tingkat4.regu_min}}` regu; kit bekerja di sisi yang sudah tertahan | respons berjenjang dan kapan heli dipanggil | matriks tingkat 1–4 × FRP, luas, regu, hari, sarana, heli (tabel native); catatan "FRP bukan kedalaman bara" |
| 11 | D2 | panel | temuan | Gerbang efikasi menuntut kenaikan ≥ `{{angka:sippa.gerbang.g4.ambang_persen\|persen}}` dengan sedikitnya `{{angka:sippa.gerbang.g4.n_min_lengan}}` petak per lengan | belanja dibuka gerbang demi gerbang | tujuh kartu gerbang G0–G6 (lulus bila, gagal berarti) + garis waktu ringkas |
| 12 | D3 | matriks | temuan | `{{angka:sippa.raci.tahap.n}}` tahap program dengan satu pemutus per tahap; BNPB memutus `{{angka:sippa.raci.bnpb_a.n}}` tahap | siapa memegang apa | matriks RACI (≤ 12 baris di slide, sisanya di lampiran deck), chip lembaga tanpa logo (S22, S23) |
| 13 | E1 | grafik | temuan | Pilot dua musim membutuhkan `{{angka:sippa.rab.t2.pinjam\|rupiah\|rentang}}`; skala dibuka hanya setelah gerbang G5 | biaya bertingkat dan ketidakpastiannya | batang bertumpuk `sippa-14` + kipas `sippa-15` dalam dua panel terpisah (satu sumbu per panel); pembanding heli "> Rp200 juta per sorti" dan slot kontrak "–" |
| 14 | E2 | rekomendasi | deskriptif | Peta Jalan 2026–2030 dan Keputusan yang Diminta | 20 rekomendasi per horizon | baris LANGKAH, RINCIAN, PENANGGUNG JAWAB, pil status, pita horizon (S28, S29); SR dari register §6 (paling banyak 6 baris di slide, lanjutan di lampiran deck) |
| 15 | – | navigasi | deskriptif | Kesimpulan | 8 kesimpulan dan keputusan yang sama dengan slide 1 | kisi 4 × 2 (S32) + pita ARAHAN berisi KD-1 sampai KD-3; angka identik dengan slide 2–13 |
| – | penutup | – | – | Terima kasih | – | layout GELAP, alamat T4 |
| L1 | lampiran | lampiran | deskriptif | Zona A–D per kabupaten Kalteng, dua versi | – | tabel native (lanjutan per 24 baris) |
| L2 | lampiran | lampiran | deskriptif | Profil 18 provinsi | – | tabel native seri S26 |
| L3 | lampiran | lampiran | deskriptif | Register rekomendasi SR-01 sampai SR-20 | – | tabel native |
| L4 | lampiran | lampiran | deskriptif | Metode, data yang belum ada, dan singkatan | – | tabel native |

Kunci yang dipakai deck tetapi belum ditulis di §4 dan wajib dibuat M12: `sippa.bom.kit_gambut.n_kode`,
`sippa.respons.tingkat4.regu_min`, `sippa.raci.bnpb_a.n`. QA deck: `bangun/pptx/periksa.py` lalu `qa/periksa.py
--pptx --pptx-pdf --ketat`, daftar periksa Buku Pegangan butir 1–10 (§ deck), laporan `keluaran/qa/sippa-deck.md`.
