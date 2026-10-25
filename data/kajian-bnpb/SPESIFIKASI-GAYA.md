# Spesifikasi gaya laporan kajian BNPB

> **Catatan 23 Okt 2026.** Kolom dan paragraf "Kajian BNPB" di berkas ini digantikan
> `PEDOMAN-DESAIN.md` §A–§B; berkas ini hanya ukuran acuan JAPFA REPORT. Yang bertentangan
> dengan pedoman dan tidak berlaku: judul pendek "Kajian Pengelolaan Air Pulau Jawa" (§2);
> judul bab, subbab, dan LAMPIRAN kapital oranye 14/12/11 pt (§4); Daftar Isi tebal kapital
> dan label "Tabel 1 :" (§5); "Sumber:" rata tengah (§6); kolom label oranye muda (§7);
> Ringkasan Eksekutif dibuka 4–5 paragraf (§8); PDF ringkas dirender dari DOCX yang sama
> (§11, kini dari HTML lewat Chromium headless).

Dibedah dari `JAPFA REPORT.pdf` (Studi Program Makan Bergizi Bersama JAPFA, IFSR,
Sep 2024; 309 hlm, dibuat di Microsoft Word 365). Angka di bawah diukur langsung
dari PDF (PyMuPDF), bukan perkiraan mata. Kolom "Kajian BNPB" = padanan yang akan
dipakai: struktur dan tata letak ditiru, warna oranye JAPFA diganti warna BNPB
dari deck harian (oranye `#D9600B`, navy `#051C2C`, oranye muda `#FBE7D6`, merah perhatian `#C8102E`).

## 1. Halaman

| Unsur | JAPFA (terukur) | Kajian BNPB |
| --- | --- | --- |
| Ukuran | A4 tegak, 595,8 × 841,8 pt | sama |
| Margin kiri/kanan isi | x 32 → 572 pt (≈ 1,1 cm kiri, 0,8 cm kanan) | 2,5 cm kiri, 2 cm kanan (standar laporan resmi; JAPFA terlalu mepet) |
| Font isi | Calibri-turunan 10,2 pt, hitam, rata kiri-kanan | Roboto 10,5 pt (serasi deck), rata kiri-kanan |
| Spasi baris | ±16,5 pt untuk 10,2 pt (≈ 1,15) | 1,15 |
| Jarak antarparagraf | satu baris kosong | 6 pt sesudah paragraf |

## 2. Kepala halaman (header)

- Kiri: dua baris tebal 7,8 pt — baris 1 judul pendek laporan, baris 2
  "Bersama **JAPFA** | September 2024" (nama mitra 10,2 pt).
- Di kiri teks ada **garis tegak oranye** 2 pt × ±21 pt (`#E46C0A`).
- Kanan: logo JAPFA ±69 × 35 pt.
- Di bawahnya **garis hitam 0,75 pt** selebar halaman (y ≈ 59–72 pt).
- **Kajian BNPB:** baris 1 "Kajian Pengelolaan Air Pulau Jawa" / "Kajian Mitigasi
  Bencana Indonesia", baris 2 "**BNPB** | Oktober 2026"; garis tegak oranye BNPB;
  logo BNPB kanan (`public/img/lembaga/sumber-bnpb.png`, 250 × 315 px; cadangan
  Commons `File:Logo BNPB.png`). Sampul tanpa header.

## 3. Kaki halaman (footer)

- **Garis abu tipis** `#D9D9D9` selebar isi (y ≈ 757).
- Kanan: nomor halaman 7,8 pt hitam + " | " + kata **"H a l a m a n"**
  direnggangkan, abu `#7F7F7F`.
- Tengah, dua baris 7,8 pt: alamat lembaga; telepon | situs (biru, italic,
  bergaris bawah) | surel.
- Bagian depan bernomor romawi kecil (ii, iii, …), isi angka Arab mulai bab 1.
- **Kajian BNPB:** "Badan Nasional Penanggulangan Bencana | Graha BNPB, Jl. Pramuka
  Kav. 38, Jakarta Timur 13120" / "Call Center 117 | www.bnpb.go.id |
  persuratan@bnpb.go.id" (sama dengan slide penutup deck 211026).

## 4. Judul dan subjudul

| Tingkat | JAPFA (terukur) | Kajian BNPB |
| --- | --- | --- |
| Judul bagian depan (DAFTAR ISI, RINGKASAN EKSEKUTIF) | 13,8 pt tebal, KAPITAL, oranye `#E36C0A` | 14 pt tebal kapital, oranye BNPB |
| Bab "1. LATAR BELAKANG" | 13,8 pt tebal kapital oranye | sama, bab selalu mulai halaman baru |
| Subbab "1.1. ANALISIS …" | 12 pt tebal kapital oranye, nomor menggantung di x 32, teks x 68 | 12 pt tebal kapital oranye |
| Sub-subbab "1.1.1. BIDANG …" | 12 pt tebal kapital oranye | 11 pt tebal kapital navy (JAPFA tak membedakan 1.1 dan 1.1.1; itu kelemahan) |
| Tingkat 4 | 10,8 pt tebal hitam ("a.", "1. Kandungan Gizi") | 10,5 pt tebal hitam |
| "LAMPIRAN" | 13,8 pt tebal, hijau tua `#00594C` | navy BNPB |
| Penekanan dalam isi | tebal hijau `#00594C` dan oranye | tebal navy; istilah asing *miring* |

## 5. Daftar isi, tabel, gambar, lampiran

- Urutan bagian depan: Sampul → Ucapan Terima Kasih → Tim Penyusun → Daftar Isi →
  Daftar Tabel → Daftar Gambar → Daftar Lampiran → Kata Sambutan → Ringkasan
  Eksekutif → Bab 1 dst.
- **Daftar Isi:** semua entri 10,2 pt TEBAL KAPITAL, nomor di x 26, judul di x 61,
  titik penuntun (leader dots) ke nomor halaman rata kanan, jarak baris ±16,5 pt,
  turun sampai 3 tingkat (1.1.1). Dibuat dari bidang TOC Word (gaya Heading).
- **Daftar Tabel:** "**Tabel 1 :** Judul …… 16" — label tebal, judul biasa.
  Sama untuk **Daftar Gambar** ("**Gambar 1 :**") dan **Daftar Lampiran**
  ("**Lampiran 1 :**").
- **Kajian BNPB:** bidang TOC asli Word (bisa diperbarui dengan F9), keterangan
  memakai fitur Caption Word agar Daftar Tabel/Gambar otomatis. Kelemahan JAPFA
  yang tidak ditiru: nomor ganda (Tabel 69 dua kali, Tabel 5 di posisi 40),
  nomor subbab melompat (3.4 → 3.6, 3.11 → 3.13), salah ketik "Progam".

## 6. Gambar

- Keterangan **di atas** gambar, rata tengah, 9 pt: "**Gambar 3 :**" tebal oranye
  + judul hitam.
- **"Sumber: …"** di bawah gambar, rata tengah, 9 pt, "Sumber:" tebal.
- Lebar gambar ±320–460 pt (55–80 % lebar isi), rata tengah; peta kecil boleh
  diberi bingkai hitam 0,75 pt.
- Sumber yang dipakai JAPFA: 155× "Pengolahan data JAPFA", 15× Google Maps,
  13× dokumentasi tim, sisanya laporan WFP/BPS/RPJPN. **Tidak ada foto Wikimedia.**
- **Kajian BNPB:** grafik dan peta dari data kita ("Sumber: Pengolahan data
  Pantau Bencana dari …"), foto dari Wikimedia Commons dengan atribusi lengkap
  sesuai lisensi: "Sumber: Wikimedia Commons, <pengarang>, CC BY-SA 4.0".
  Kandidat: `kandidat-foto-commons.csv` (215 berkas, sudah disaring: lebar
  ≥ 1.000 px, lisensi CC/PD, tanpa NC/ND).

## 7. Tabel

- Keterangan **di atas** tabel, rata tengah, 9 pt: "**Tabel 25 :**" tebal **hijau
  tua `#00594C`** (beda warna dari Gambar) + judul hitam.
- Baris kepala: isi oranye `#F79646`/`#E36C0A`, teks putih tebal 9 pt, rata tengah.
- Kolom kepala baris (label kiri): isi hijau tua `#00594C`, teks putih tebal.
- Garis kisi hitam tipis; baris pemisah kelompok abu `#D9D9D9`.
- Isi 9 pt, angka rata tengah; "Sumber:" di bawah tabel seperti gambar.
- Tabel ringkasan eksekutif: kepala oranye dengan ikon putih per kolom.
- **Kajian BNPB:** kepala navy + teks putih, kolom label oranye muda, angka rata
  kanan dengan pemisah ribuan titik (selera pemilik).

## 8. Ringkasan eksekutif

- Dibuka 4–5 paragraf konteks dengan **catatan kaki** bernomor (sumber), lalu
  butir tebal bergaris bawah (Profil, Efektivitas, Temuan Utama, Rekomendasi).
- Tabel perbandingan berikon, angka kunci diberi warna.
- Rekomendasi: "Rekomendasi Utama" (hijau tebal) lalu "Rekomendasi Tambahan"
  bernomor, **tiap butir dengan ikon garis hitam** di kiri dan sub-butir "o".
- **Kajian BNPB:** ikon garis dari set ikon deck (`h23-ik-*`), tanpa emoji.

## 9. Daftar pustaka dan lampiran

- Daftar Pustaka: gaya APA ("Lembaga. (Tahun). Judul. Diakses dari …"), urut
  abjad, satu baris kosong antarentri, tanpa inden gantung.
- Lampiran: judul "LAMPIRAN" sekali, lalu "**Lampiran 1 :** Judul" (label tebal),
  subjudul tabel biasa di bawahnya; isi lampiran = tabel lengkap, kuesioner,
  dokumentasi foto, SOP.
- **Kajian BNPB:** pustaka APA 7 dengan inden gantung; lampiran = tabel risiko
  per kab/kota, matriks lembaga, metode indeks, glosarium, dasar hukum.

## 10. Sampul

- Atas: foto setengah halaman kiri + logo kanan; bawah: blok warna penuh dengan
  judul putih besar (±40 pt), pita subjudul, kotak putih "Consolidated and
  Reported by / Supported by" berisi logo.
- **Kajian BNPB:** foto Commons (Jatiluhur/Bengawan Solo untuk kajian air;
  Merapi/Palu untuk kajian mitigasi), blok navy, aksen oranye, logo BNPB.

## 11. Dua versi keluaran

| | PDF ringkas | DOCX lengkap |
| --- | --- | --- |
| Panjang | ≤ 10 hlm per kajian | ±150 hlm per kajian |
| Isi | sampul, ringkasan eksekutif, peta, temuan, rekomendasi, lembaga | struktur penuh §5 |
| Pembuatan | dirender dari DOCX yang sama (bagian ringkas) | python-docx + bidang TOC/Caption |

## 12. Selera pemilik yang ikut berlaku (dari Buku Pegangan Pantau Bencana)

Buku Pegangan (artifact 5sPCWCh2…, sumber `docs/buku-pegangan/pantau-bencana.md`)
belum punya bab khusus laporan DOCX/PDF. Aturan yang berlaku lintas keluaran dan
dibawa ke kajian:

**Bahasa dan angka (bab Angka & copy)**
- Format id-ID: titik ribuan, koma desimal, paling banyak 1 desimal; satuan selalu
  ditulis; "ribu/juta/miliar" di kalimat, bukan "rb/jt".
- Tanpa em dash (en dash hanya untuk rentang), tanpa titik tengah " · ", tanpa emoji.
- Bahasa lugas: judul = fakta + angka + sumber; tanpa personifikasi, slogan, kontras
  "X bukan Y", tiga-serangkai, kalimat penutup bergaya.
- Tiap angka punya sumber dan tahun. Angka model yang belum lulus uji balik ditandai
  "belum diuji balik"/hipotesis, tidak disembunyikan dan tidak dijual sebagai pasti.
- "Titik panas", bukan "titik api", untuk data satelit; luas dari satelit =
  "hitungan satelit", tidak pernah "perkiraan satelit".
- Tanggal: bulan penuh di judul ("22 Oktober 2026"), singkat di tabel ("22 Okt").

**Visual (bab Selera presentasi, yang berlaku juga untuk gambar laporan)**
- Hanya Roboto; palet BNPB: teks 1A1A1A/2E3440/6B7280, navy 051C2C, oranye D9600B,
  merah C8102E (hanya untuk bahaya/perlu perhatian), biru 2F86D1 (air, turun),
  slate 5B7A99, emas kekeringan B08A3E, gunung api 8A4B2A. Palet generator lama
  (D9650B, 0F1E2D, 0B4EA2, A88A3C) dilarang.
- Peta berlatar putih/abu sangat muda, tanpa laut biru; tidak ada label atau bulatan
  bertumpuk; tiap warna dan bulatan wajib berlegenda.
- Grafik batang: ujung atas membulat, nilai di atas, tanpa sumbu Y, naik oranye,
  turun biru, pembanding abu.
- Ikon garis (gaya Lucide/Tabler) di dalam lingkaran; lembaga ditampilkan dengan
  ikon, bukan logo.
- Pakai label pendek, bukan kalimat hiasan; teks yang tidak membawa informasi dibuang.
- Satu topik satu kontainer; tanpa panel gelap di samping.

**Proses**
- Render sendiri lalu baca tiap halaman sebelum dikirim; cek mekanis `·` dan `—`
  nol, huruf terkecil ≥ 6 pt (laporan: ≥ 8 pt), angka sama di seluruh dokumen.

Skill `selera-pinka` (navy #0b2545 + emas) khusus MBG Bangka, TIDAK dipakai di sini.
