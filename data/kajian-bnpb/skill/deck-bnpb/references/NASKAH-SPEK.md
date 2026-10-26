# Dialek naskah kajian BNPB

Kontrak antara penulis bab dan semua pembangun (DOCX, PPTX, peta web, gerbang QA). Versi 1,
23 Oktober 2026. Naskah bab ditulis di `naskah/air/*.md` dan `naskah/mitigasi/*.md` dalam
Markdown biasa ditambah empat hal: front matter, token angka, kutipan pustaka, dan blok
direktif `:::`. Tampilan (warna, ukuran huruf, margin) tidak ditulis di naskah; semuanya dari
`tema.json`. Kode yang ditulis di naskah (jenis bencana, fase, status, keyakinan, ikon)
diambil dari `tema.json` blok `kosakata` dan `ikon`.

Pembaca rujukan: `bangun/kontrak/naskah.py` (stdlib). Pembangun memakai pembaca ini, tidak
menulis pengurai sendiri. Pembaca berhenti di galat pertama dengan pesan
`berkas:baris: sebab`. Uji diri `python3 bangun/kontrak/naskah.py` mengurai contoh di bagian 15
dan menolak 20 fixture pelanggaran; memeriksa naskah: `python3 bangun/kontrak/naskah.py
naskah/air/*.md`.

Otoritas: KEPUTUSAN.md, Buku Pegangan, KERANGKA.md, PEDOMAN-DESAIN.md. Bila berkas ini
bertentangan dengan yang di atasnya, yang di atas berlaku dan berkas ini dibetulkan.

## 1. Berkas

| Berkas | Isi | Front matter pembeda |
| --- | --- | --- |
| `naskah/<kajian>/bab-06.md` | satu bab | `bab: 6` |
| `naskah/<kajian>/lampiran-a.md` | satu lampiran | `lampiran: A` |
| `naskah/<kajian>/kata-pengantar.md`, `ringkasan-eksekutif.md` | bagian depan yang ditulis tangan | `bagian: kata-pengantar` |

- Satu berkas satu bab, lampiran, atau bagian. Urutan dokumen diambil dari front matter,
  bukan nama berkas.
- Sampul, kolofon, daftar isi, daftar tabel, gambar, lampiran, singkatan, daftar pustaka,
  glosarium, atribusi foto, dan sampul belakang dibangkitkan pembangun; tidak ditulis di naskah.
- Jalur berkas di naskah (`csv:`, `berkas:`, `peta:`) relatif ke `data/kajian-bnpb/`.
- UTF-8, baris baru LF. Paragraf boleh dipatah di mana saja; baris kosong memisah blok.

## 2. Front matter

Di baris pertama, dibuka dan ditutup `---`, satu `kunci: nilai` per baris (YAML datar).

| Kunci | Wajib | Nilai |
| --- | --- | --- |
| `kajian` | ya | `air` atau `mitigasi` |
| `bab` / `lampiran` / `bagian` | tepat satu | nomor bab; huruf lampiran (`tema.json` kajian.<k>.lampiran); `kata-pengantar` atau `ringkasan-eksekutif` |
| `judul` | ya | sama persis dengan judul `#` |
| `pertanyaan` | ya untuk bab | satu kalimat pertanyaan yang dijawab bab (pembatas bab, PEDOMAN B5.2) |
| `status` | tidak | `draf` (bawaan) atau `final`; `final` menolak pustaka bersumber sekunder |
| `target_halaman` | tidak | alokasi halaman bab dari PEDOMAN A3.2/A3.3, untuk gerbang panjang |
| `orientasi` | tidak | `lanskap`, hanya lampiran bertabel lebar |
| `catatan_pemilik` | tidak | penanda untuk diperiksa pemilik, mis. Kata Pengantar draf (KEPUTUSAN T7) |

## 3. Judul

| Tanda | Tingkat | Tampil | Daftar isi |
| --- | --- | --- | --- |
| `#` | bab (sekali per berkas) | label pita "BAB 6" dan judul KAPITAL (KEPUTUSAN T1); lampiran: "Lampiran A. Judul" | ya |
| `##` | subbab | "6.1 Judul" | ya |
| `###` | sub-subbab | "6.1.1 Judul" | ya |
| `####` | tingkat 4 | tanpa nomor | tidak |

- Ditulis huruf judul PUEBI ("Profil Risiko Musim Hujan"); kapital bab dibuat pembangun dari
  `tema.json` tipografi_docx.judul_bab.kapital.
- Nomor tidak diketik. `## 6.1 Judul` ditolak.
- Judul stabil: tanpa token angka, kutipan, atau rujukan; paling banyak dua baris (perpendek,
  jangan kecilkan huruf).
- Id rujukan di ujung judul: `{#bab:nama}` untuk `#` bab, `{#lamp:nama}` untuk `#` lampiran,
  `{#sub:nama}` untuk `##` dan `###`. Id: huruf kecil, angka, tanda hubung.

## 4. Paragraf dan teks

- `**tebal**` = penekanan (Bold navy), hemat. `*miring*` = istilah asing. Tanpa garis bawah,
  tanpa `***`, tanpa HTML, tanpa tautan `[teks](url)`: URL masuk `pustaka.json`.
- Paragraf berlabel: paragraf yang diawali `**Label:**` dibaca sebagai label + isi (dipakai
  kotak temuan, ringkasan bab, program).
- Lepas karakter khusus dengan garis miring terbalik: `\*`, `\[`, `\]`, `\{`, `\}`, `\@`, `\|`
  (mis. bintang catatan di kepala kolom `LUAS (ha)\*`).
- Ditolak pembaca: em dash (U+2014), titik tengah (U+00B7), segitiga U+25B2 dan U+25BC, panah
  U+2192, butir ◦ ▪, centang, dan emoji. Arah ditulis kata "naik"/"turun" atau token `arah`.
  En dash hanya untuk rentang ("2015–2025") dan sel kosong ("–").
- Angka data tidak diketik (gerbang D-22): pakai token angka (bagian 8). Yang boleh diketik:
  tahun, rentang tahun, nomor regulasi dan pasal, nomor bab, cacah kecil yang dieja.

## 5. Daftar

- `- ` butir tingkat 1 (•); dua spasi lalu `- ` tingkat 2 (a., b.); `1. ` daftar bernomor.
- Paling banyak 5 butir per tingkat (PEDOMAN B3); lebih dari itu jadikan tabel.
- Baris lanjutan butir diberi inden dua spasi.

## 6. Catatan kaki

```
Rerata kab/kota di Pulau Jawa {{angka:irbi.jawa.2024|fmt=1}} pada 2024[^pulau].

[^pulau]: Rerata sederhana kab/kota per pulau; pengelompokan pulau pilihan penyusun.
```

- Label bebas (huruf kecil, angka, tanda hubung); nomor tampil diberi per bab menurut urutan
  rujukan pertama. Definisi satu baris, di mana saja di berkas (lazimnya di akhir).
- Rujukan tanpa definisi dan definisi tanpa rujukan ditolak.
- Untuk sumber angka di prosa yang tidak punya tabel/gambar dan untuk alasan "–". Sumber
  tabel dan gambar memakai atribut `sumber:`, bukan catatan kaki (PEDOMAN B5.16).

## 7. Pustaka dan kutipan (APA 7)

`pustaka.json` berisi larik CSL-JSON sederhana. Kunci entri `id`: huruf kecil dan tanda
hubung, pola `<penulis>-<tahun>-<kata>`.

| Medan | Isi |
| --- | --- |
| `id`, `type` | `legislation`, `report`, `dataset`, `webpage`, `book`, `article-journal` |
| `author` | `[{"literal": "Badan Nasional Penanggulangan Bencana", "singkatan": "BNPB"}]` atau `[{"family": "Haque", "given": "Ubydul"}, ...]` (semua penulis) |
| `issued` | `{"date-parts": [[2025]]}`; tanpa tahun tampil "t.t." |
| `title`, `container-title`, `volume`, `issue`, `page`, `publisher`, `genre` | seperti CSL; `genre: "Data set"` untuk data |
| `URL`, `DOI`, `accessed` | `accessed` untuk halaman atau data yang berubah: "Diakses 23 Oktober 2026, dari URL" |
| `verifikasi` | `primer` (dibaca dari sumber asli) atau `sekunder` (hanya boleh di naskah `status: draf`, PEDOMAN C6.1) |
| `note` | catatan penyusun, tidak tampil |

Bentuk di naskah (sama dengan Pandoc):

| Tulis | Tampil |
| --- | --- |
| `[@bnpb-2025-renas]` | (Badan Nasional Penanggulangan Bencana [BNPB], 2025a) pada kutipan pertama, lalu (BNPB, 2025a) |
| `[@bnpb-2025-renas, hlm. 32–33]` | (BNPB, 2025a, hlm. 32–33) |
| `[@bnpb-2025-renas; @bnpb-2025-renstra]` | (BNPB, 2025a, 2025b) |
| `@haque-2012-siklon` | Haque dkk. (2012) |
| `[-@bnpb-2025-renstra]` | (2025b) |

- Lembaga bersingkatan dikenalkan sekali per dokumen, lalu singkatannya dipakai. Dua karya
  satu penulis satu tahun diberi akhiran a, b menurut judul.
- `@` dibaca kutipan hanya bila didahului awal baris, spasi, atau tanda kurung; alamat surel
  aman. Kunci yang tidak ada di `pustaka.json` ditolak.
- Daftar Pustaka dibangkitkan dari kunci yang benar-benar dikutip (gerbang D-19), urut abjad,
  inden gantung (`tema.json` spasi_pt.inden_gantung_pustaka_cm).

## 8. Token angka

```
{{angka:<kunci>}}
{{angka:<kunci>|fmt=1}}
{{angka:<kunci>|fmt=1|persen|arah}}
```

Kunci dibaca dari registri `data/angka.json`. Tiap entri menyebut asal angka, label
keyakinan, satuan, dan teks sumber:

```json
"irbi.nasional.2024": {
  "berkas": "irbi/irbi.json",
  "jalur": "tabel[irbi_tren_2015_2024.csv].baris[tingkat=nasional].y2024",
  "satuan": "",
  "keyakinan": "resmi",
  "sumber": "InaRISK BNPB, IRBI 2024"
}
```

- `berkas` relatif ke `data/` (JSON atau CSV). `jalur`: kunci dipisah titik; `[nama.bertitik]`
  untuk kunci yang memuat titik; `[3]` indeks; `[kolom=nilai,kolom2=nilai2]` memilih tepat satu
  baris dari larik objek, dari tabel `{kolom, baris}`, atau dari CSV. Nol atau lebih dari satu
  baris cocok = galat.
- Rentang: `jalur_rendah` + `jalur_tinggi` (boleh bersama `jalur`).
- Angka dari literatur tanpa paket data: `nilai` (atau `rendah` + `tinggi`) + `pustaka`
  (kunci pustaka.json).
- `kali`: pengali, mis. `100` untuk pecahan ke persen. `keyakinan` boleh bertambahan setelah
  titik koma: `estimasi-model; belum diuji balik`.

| Opsi | Arti | Contoh tampil |
| --- | --- | --- |
| `fmt=0`, `fmt=1`, `fmt=2` | jumlah desimal; bawaan 0 untuk bilangan bulat, 1 untuk pecahan. `fmt=2` hanya untuk data resmi berpresisi dua | 128,52 |
| `persen` | tambah % | 6% |
| `arah` | nilai mutlak dengan kata naik/turun, "tetap" bila 0 | turun 17,8% |
| `ringkas` | juta, miliar, triliun dalam kata (C4) | 1,3 juta |
| `rupiah` | Rp + ringkas | Rp257,4 miliar |
| `rentang` | rendah–tinggi; otomatis bila entri tidak punya `jalur` | 260–590 |
| `rendah`, `tinggi` | satu batas rentang (untuk sel tabel kerusakan) | 260 |
| `satuan` | tambah satuan registri | 260–590 jiwa |
| `tahun` | bilangan tanpa pemisah ribuan | 2020 |
| `teks` | nilai apa adanya (nama wilayah, kalimat tesis); token angka di dalamnya diurai sekali | Kab. Sukabumi |

Aturan yang dijalankan pembaca, bukan penulis (PEDOMAN C4):

- Titik ribuan, koma desimal, pembulatan setengah ke atas, tidak pernah "-0".
- Entri `estimasi-model` dibulatkan dua angka bermakna; satu angka diberi awalan "sekitar",
  rentang dan batas tidak. Penulis tidak mengetik "sekitar".
- Tiap token yang disuntik masuk `manifest` (kunci, nilai mentah, teks tampil, keyakinan,
  sumber, berkas:baris) untuk gerbang D-6 dan D-22. Angka dari tabel CSV ikut tercatat.
- Kalimat tesis (PEDOMAN A2) disimpan sebagai entri teks dan dipanggil `{{angka:tesis.air|teks}}`,
  supaya identik di Ringkasan Eksekutif dan Bab Kesimpulan.

## 9. Label keyakinan

Empat kode (PEDOMAN C6.2, `tema.json` kosakata.keyakinan): `resmi`, `terverifikasi`,
`estimasi-model`, `asumsi-kebijakan`. Tambahan untuk estimasi model: `belum diuji balik`,
`uji balik gagal`. Ditulis di atribut `keyakinan:` (tabel, gambar data, kartu angka,
program) atau di kolom KEYAKINAN (tabel kerusakan; tabel `keyakinan: campuran`). Label
tampil sebagai pil; warnanya dari `tema.json`.

## 10. Rujukan silang

| Tulis | Tampil | Menunjuk |
| --- | --- | --- |
| `@gbr:peta-banjir` | Gambar 6.1 | `::: gambar {#gbr:peta-banjir}` |
| `@tbl:irbi-jawa` | Tabel 6.1 | tabel, kartu skenario, garis waktu, matriks |
| `@sub:skenario` | Subbab 6.2 | `## Judul {#sub:skenario}` |
| `@bab:musim-hujan`, `@lamp:indikator` | Bab 6, Lampiran A | judul `#` |
| `@rek:peringatan-dini` | 01 | `::: rek {#rek:peringatan-dini}` |

Nomor objek per bab ("Tabel 6.2"), per kode lampiran ("Tabel A.1"), "RE" di Ringkasan
Eksekutif. Rekomendasi bernomor dua digit menurut urutan kemunculan di seluruh dokumen.
Rujukan yang tidak menunjuk id mana pun ditolak saat penomoran (`nomori`). Di DOCX rujukan
menjadi bidang REF ke penanda Caption.

## 11. Blok direktif

```
::: nama {#prefiks:id}
atribut: nilai
atribut_lain: nilai

Isi Markdown: paragraf, paragraf berlabel, daftar, atau satu tabel pipa.
:::
```

- Atribut: baris `kunci: nilai` tepat di bawah pembuka sampai baris kosong pertama. Nilai satu
  baris; daftar dalam nilai dipisah titik koma. Nilai teks (judul, sumber, dampak, langkah,
  dst.) boleh memuat token angka, kutipan, dan rujukan.
- Tabel pipa di dalam direktif memakai kepala kapital literal; kolom dicocokkan tanpa beda
  huruf dan tanpa satuan berkurung. `|` di dalam token tidak memisah sel. Perataan dari baris
  pemisah: `---:` kanan (kolom angka), `:---:` tengah, `---` kiri. Satu baris satu skala:
  jangan campur `ringkas` dan angka penuh di baris yang sama.
- Bersarang: pembuka luar diberi colon lebih banyak (`::::`), anak `:::`. Penutup menutup blok
  terdalam. Anak hanya sah di induknya (`rek` di `matriks-rekomendasi`; `kerusakan` dst. di
  `skenario`); direktif lain tidak bersarang.
- Bernomor (keterangan di atas "Gambar n.m"/"Tabel n.m", baris "Sumber:" di bawah, masuk daftar):
  `gambar` (Gambar); `tabel`, `skenario`, `garis-waktu`, `matriks-rekomendasi`,
  `matriks-lembaga`, `matriks-jenis` (Tabel). Kotak lain tidak bernomor.
- `data_per` pada objek bernomor ditambahkan ke baris sumber: "Sumber: ...; data per 23 Okt 2026".

### 11.1 Daftar direktif

| Direktif | Atribut wajib | Atribut opsional | Isi | Komponen pedoman |
| --- | --- | --- | --- | --- |
| `gambar` | berkas, judul, jenis | sumber, keyakinan (wajib selain foto), lebar, data_per, catatan; foto: pengarang, lisensi, url (wajib), potong | kosong, atau satu paragraf cara baca grafik tak lazim | B5.9, B5.10, B5.15 |
| `tabel` | judul, sumber, keyakinan | csv, kolom, saring, urut, batas, total, angka, peringkat, sorot, data_per, catatan, grup | satu tabel pipa, atau kosong bila `csv` | B5.7 |
| `kartu-angka` | pil, sumber, keyakinan | nada | tabel NILAI, SATUAN, LABEL, IKON, WARNA | B5.4 |
| `temuan` | judul, sifat | | paragraf berlabel Bukti, Dampak, Pembuka; opsional "Mengapa bukan satu tingkat lebih baik atau lebih buruk" | B5.5 |
| `keputusan` | | judul | daftar: pertanyaan, butir tingkat 2 akibat tiap pilihan | B5.5, B5.25 |
| `koreksi`, `catatan` | | | paragraf; koreksi paling banyak satu per bab | B5.5 |
| `ringkasan-bab` | | | paragraf berlabel Temuan, Angka kunci, Rekomendasi (rujukan @rek) | B5.3 |
| `program` | nama, lokasi, lembaga, periode, dampak, sumber, keyakinan | status, jenis | paragraf berlabel Yang dilakukan, Yang ditiru, Yang tidak cocok, Penyesuaian Indonesia | P6, B5.7 perbandingan |
| `skenario` | jenis, judul, dasar, sumber, lembaga | kemungkinan, peta, analog, kaki, data_per, keyakinan | blok anak menurut varian | B5.11, P10 |
| `garis-waktu` | judul, sumber | musim, keyakinan | tabel FASE, AKSI, REK, LEMBAGA | B5.12 |
| `matriks-rekomendasi` | judul, kelompok, sumber | keyakinan | blok `rek` | B5.13, P7, P8 |
| `rek` | langkah, jenis, status, unit, kl, waktu, indikator, dasar | program (wajib bila status bukan baru), butuh, membuka | satu kalimat rincian; opsional paragraf berlabel Langkah pelaksanaan, Risiko pelaksanaan (tiga teratas) | B5.13 |
| `matriks-lembaga` | judul, sumber | keyakinan | tabel LEMBAGA, PRABENCANA, TANGGAP DARURAT, PASCABENCANA | B5.7 matriks lembaga |
| `matriks-jenis` | judul, sumber | keyakinan | tabel JENIS, PRABENCANA, TANGGAP DARURAT, PASCABENCANA | B5.22 |

### 11.2 Nilai kode

| Atribut atau kolom | Nilai sah (sumber: `tema.json`) |
| --- | --- |
| `gambar.jenis` | peta, grafik, diagram, foto |
| `gambar.lebar` | penuh, dua-kolom, tiga-kolom (lebar dari objek.lebar_cm) |
| `gambar.lisensi` | diawali CC BY, CC BY-SA, CC0, PD; NC dan ND ditolak (K5) |
| `keyakinan` | resmi, terverifikasi, estimasi-model, asumsi-kebijakan (+ tambahan); `tabel` juga `campuran` dengan kolom KEYAKINAN |
| `kartu-angka.nada` | data (pil navy), perhatian (pil merah), bmkg (pil garis slate) |
| kolom IKON | kunci di `tema.json` ikon (mis. wilayah, jiwa, rumah, pengungsi, banjir) |
| kolom WARNA | nama token warna (navy, oranye, biru, kategori.api); kosong = navy |
| `temuan.sifat` | fakta, penilaian |
| `program.keyakinan` | resmi, terverifikasi (program terbukti tidak memakai estimasi model) |
| `program.jenis` | program (terbukti), uji-coba (belum terbukti, P6) |
| `status` | sudah-ada, dikembangkan, baru (tampil "Sudah ada", "Sudah ada, perlu dikembangkan", "Usulan baru", P7) |
| `rek.jenis` | regulasi, data, infrastruktur, kapasitas, pembiayaan (dibedakan ikon) |
| `rek.waktu` | 100-hari, 2026-2027, 2028-2030 (atau labelnya "2026–2027"; P4) |
| `rek.unit`, `rek.kl` | dipisah titik koma; entri pertama = pemimpin. Unit dari korpus JDIH BNPB (P8), K/L bernomenklatur Oktober 2026; "–" bila tidak ada |
| `rek.butuh`, `rek.membuka` | `@rek:a; @rek:b` |
| `matriks-rekomendasi.kelompok` | internal, lintas |
| kolom FASE | prabencana, tanggap-darurat, pascabencana (T10) |
| `garis-waktu.musim` | kemarau, hujan |
| `skenario.jenis`, kolom JENIS | gempa, tsunami, gunungapi, likuefaksi, banjir, longsor, cuaca-ekstrem, gelombang-abrasi, rob, kekeringan, karhutla, pandemi, kebakaran-industri, kebakaran-tpa, konflik-sosial |

### 11.3 Tabel

Dua sumber, pilih satu:

1. **CSV** (angka dari data, disarankan):

   ```
   csv: data/irbi/irbi_kab_2025.csv
   saring: pulau=Jawa; prov_nama=Jawa Barat
   urut: -total
   batas: 8
   kolom: nama_kepmendagri="KAB/KOTA"; penduduk_2026="PENDUDUK (jiwa)" fmt=0; total="IRB" fmt=1
   total: ya
   ```

   `saring` = sama dengan, digabung DAN. `urut` = nama kolom, `-` untuk menurun. `kolom` =
   `nama_kolom="KEPALA" fmt=<n|persen|ringkas|rupiah|tahun|teks>`; kolom ber-fmt angka rata
   kanan dan masuk manifest. `total: ya` = baris Jumlah dari baris yang tampil.
2. **Tabel pipa** di isi, untuk tabel teks (perbandingan, regulasi) atau sel bertoken.
   `angka: 3; 4` menandai kolom angka (rata kanan). Baris "Jumlah"/"Total" yang diketik ditolak;
   pakai `total: ya`.

`peringkat: ya` = nomor peringkat dalam bulatan navy; `sorot: Kab. Demak; Kab. Kudus` = baris
wilayah fokus bertint (PEDOMAN B5.7). Sel kosong: "–" dengan alasan di `catatan:`. `grup: PROVINSI` (atau
`PULAU; PROVINSI`) = kolom itu menjadi baris grup berjenjang, dengan subtotal per grup bila ber-`total`
(PEDOMAN B5.8, tabel lampiran kab/kota).

### 11.4 Kartu skenario

Varian diturunkan dari `jenis` lewat keluarga bencana (`tema.json` warna.kategori.<k>.varian_skenario):

| Varian | Jenis | Atribut wajib tambahan | Blok anak wajib |
| --- | --- | --- | --- |
| a (alam, dimodelkan) | geologi, basah, kering, api | kemungkinan (kelas 1–5 pita peluang 5 tahun, atau "periode ulang n tahun"), peta, kaki | kerusakan, kebijakan, kepekaan, respons, pemulihan |
| b (nonalam, kejadian analog) | pandemi, kebakaran-industri, kebakaran-tpa | analog | kerusakan, respons, pemulihan |
| c (sosial, kejadian analog) | konflik-sosial | analog, kemungkinan diawali "tidak dinilai:" | kerusakan, mandat, respons, pemulihan |

- `kerusakan` varian a: tabel BESARAN, RENDAH, TINGGI, KEYAKINAN, SUMBER. Wajib paling sedikit satu baris yang
  diawali tiap aspek di `tema.json` kosakata.besaran_skenario_alam: lima aspek Perban BNPB 2/2023 Pasal 7 ayat (5)
  (Lingkungan, Kependudukan, Ekonomi, Infrastruktur/fisik, Layanan sipil) ditambah Kebutuhan respons (Perka BNPB
  7/2008, Perban 3/2018). Satu aspek boleh beberapa baris ("Kependudukan, korban jiwa", "Kependudukan,
  pengungsi"). Besaran di kosakata.besaran_skenario_terlarang (luka, pengungsi hari ke-7, DALY) ditolak karena
  tidak ada di DIBI (KERANGKA prinsip 9). Yang tidak terhitung: "–" dengan alasan di kolom SUMBER. Rupiah
  imateriil tidak di sini (lampiran metode).
- `kerusakan` varian b dan c: kartu analog berangka tanpa perkalian, tabel INDIKATOR, NILAI, KEYAKINAN, SUMBER
  dengan empat besaran kosakata.indikator_skenario_nonalam (korban jiwa, luas terdampak, kerugian materiil,
  kerugian imateriil); sel tanpa data "–" beralasan.
- `kebijakan`: satu paragraf angka kebijakan. `kepekaan`: tabel TUAS, NILAI DASAR, NILAI
  DIGESER, KORBAN JIWA, KERUGIAN MATERIIL (KERANGKA prinsip 12). `respons`, `pemulihan`: daftar
  3–4 butir. `mandat`: paragraf batas mandat (varian c).
- Kartu skenario satu halaman: pembangun DOCX merakitnya sebagai satu blok yang pindah halaman utuh bila tidak muat;
  `{{halaman-baru}}` tidak diperlukan. Kartu tanpa label keyakinan di kolom KEYAKINAN (varian b yang semua "–",
  varian c) wajib atribut `keyakinan`; pembangun DOCX menolak kartu, garis waktu, dan matriks tanpa label (PEDOMAN C6.2).

### 11.5 Garis waktu dan matriks

- Garis waktu: ketiga fase wajib ada, 3–5 aksi per fase, tiap aksi merujuk `@rek:<id>`. Pita
  horizon (100 hari, 2026–2027, 2028–2030) dibangkitkan dari `tema.json`, tidak ditulis.
- Matriks lembaga: tiap sel diawali `pemimpin:`, `pendukung:`, atau `tidak berlaku:` diikuti
  tugas atau alasan satu kalimat; lembaga tampil sebagai chip berikon, bukan logo.
- Matriks jenis: tiap sel berisi aksi dengan `@rek:<id>`, atau `tidak berlaku: <alasan yang bisa
  dibantah>`. Sel kosong ditolak.

## 12. Pemisah halaman

Satu baris berisi `{{halaman-baru}}` saja. Bab selalu mulai halaman baru tanpa penanda.

## 13. Lampiran dan bagian depan

- Lampiran: `lampiran: A` di front matter, `# Judul {#lamp:nama}` tampil "Lampiran A. Judul",
  tabel bernomor "Tabel A.1" bergaya tabel lampiran (kepala tanpa isi). Tabel per kab/kota
  disusun dari katalog wilayah lengkap lewat `csv:` (D-18).
- Ringkasan Eksekutif: `bagian: ringkasan-eksekutif`; kalimat pertama = token tesis; objek
  bernomor "Gambar RE.1". Kata Pengantar tidak memuat objek bernomor.

## 14. Keluaran pembaca untuk pembangun

`baca()` mengembalikan `{nama, meta, blok, catatan_kaki, id}`. `blok` berisi:

| `jenis` | Medan |
| --- | --- |
| `judul` | tingkat, teks, id, nomor (setelah `nomori`) |
| `paragraf` | label (atau None), isi (run) |
| `daftar` | nomor (bool), butir: [{isi, anak}] |
| `tabel` | kepala, kunci (kepala ternormal), rata, baris (sel = run), total (tabel CSV), dari_csv |
| `halaman-baru` | |
| `direktif` | nama, id, atribut (teks mentah), teks (atribut teks sebagai run), isi (blok), varian dan keluarga (skenario), nomor dan label (setelah `nomori`) |

Run = `{j, s, tebal, miring}` dengan `j`: `teks`; `angka` (+ kunci); `catatan` (s = nomor,
+ label); `pustaka` (s = kutipan jadi, + kunci); `rujuk` (+ id; s = label setelah `nomori`).
`Konteks.manifest` = angka tersuntik; `Konteks.daftar_pustaka()` = entri APA 7 sebagai run
(judul miring).

## 15. Contoh lengkap satu subbab

Contoh di bawah dibaca uji diri pembaca: semua direktif (kecuali `mandat`, anak varian c), semua bentuk
kutipan, rujukan, catatan kaki, dan pemisah halaman. Angka berasal dari registri nyata;
kalimat, kelas kemungkinan, dan rincian aksi adalah ilustrasi sintaks, bukan naskah final.

````naskah
---
kajian: air
bab: 6
judul: Profil Risiko Musim Hujan
pertanyaan: Kab/kota mana di Pulau Jawa yang paling berisiko tergenang saat musim hujan, dan seberapa besar skenario terburuknya?
status: draf
target_halaman: 20
---

# Profil Risiko Musim Hujan {#bab:musim-hujan}

::: ringkasan-bab
**Temuan:**

- IRB nasional {{angka:irbi.nasional.persen_2015_2024|fmt=1|persen|arah}} dari 2015 ke 2024, tetapi {{angka:irbi.kab.tinggi.2023}} kab/kota masih kelas Tinggi pada 2023.
- Musim hujan La Niña {{angka:hidromet.jawa.lanina.tahun_analog|tahun}}/2021 menjadi analog skenario terburuk Pulau Jawa.

**Angka kunci:**

- Korban jiwa skenario {{angka:hidromet.jawa.lanina.korban_jiwa|satuan}}.

**Rekomendasi:** @rek:peringatan-dini, @rek:data-genangan
:::

## Sebaran Risiko Banjir {#sub:sebaran}

IRB nasional turun dari {{angka:irbi.nasional.2015|fmt=1}} pada 2015 menjadi
{{angka:irbi.nasional.2024|fmt=2}} pada 2024 [@bnpb-2025-renas]. Rerata kab/kota di Pulau Jawa
{{angka:irbi.jawa.2024|fmt=1}} pada 2024[^pulau]. Renas PB menetapkan penurunan nilai IRB sebagai
indikator tata kelola [@bnpb-2025-renas, hlm. 32–33], dan Renstra BNPB [-@bnpb-2025-renstra]
memuat tren IRB sejak 2019. Kedua dokumen menjadi rujukan sasaran 2030
[@bnpb-2025-renas; @bnpb-2025-renstra]. Kewenangan menyusun kajian risiko berasal dari
@ri-2007-uu24.

Sebaran kelas risiko banjir per kab/kota tampil pada @gbr:peta-banjir, dan delapan kab/kota
dengan IRB tertinggi pada @tbl:irbi-jawa.

::: gambar {#gbr:peta-banjir}
berkas: gambar/air/peta-irbi-banjir-kab.png
jenis: peta
judul: Kelas risiko banjir kab/kota di Pulau Jawa, IRBI 2025
sumber: Pengolahan data Pantau Bencana dari InaRISK BNPB, IRBI 2025
keyakinan: resmi
lebar: penuh
data_per: 23 Okt 2026
:::

::: tabel {#tbl:irbi-jawa}
judul: Delapan kab/kota di Pulau Jawa dengan IRB tertinggi, IRBI 2025
csv: data/irbi/irbi_kab_2025.csv
saring: pulau=Jawa
urut: -total
batas: 8
kolom: nama_kepmendagri="KAB/KOTA"; prov_nama="PROVINSI"; penduduk_2026="PENDUDUK (jiwa)" fmt=0; total="IRB" fmt=1; status_total_resmi="KELAS"
peringkat: ya
sumber: InaRISK BNPB, IRBI 2025; WorldPop 2026
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Kolom penduduk dari WorldPop 2026 berlabel asumsi kebijakan.
:::

::: catatan
IRBI 2025 memakai skala yang berbeda dari IRBI 2015–2024, sehingga nilai 2025 tidak
dibandingkan langsung dengan tahun sebelumnya.
:::

::: kartu-angka
pil: DATA RESMI
nada: data
sumber: InaRISK BNPB, IRBI 2023 dan 2024
keyakinan: resmi

| NILAI | SATUAN | LABEL | IKON | WARNA |
| --- | --- | --- | --- | --- |
| {{angka:irbi.kab.tinggi.2023}} | kab/kota | kelas Tinggi IRBI 2023 | wilayah | navy |
| {{angka:irbi.kab.dinilai.2023}} | kab/kota | dinilai IRBI 2023 | wilayah | |
| {{angka:irbi.nasional.2024|fmt=2}} | | IRB nasional 2024 | data | navy |
:::

::: temuan
judul: {{angka:irbi.kab.tinggi.2023}} dari {{angka:irbi.kab.dinilai.2023}} kab/kota masih kelas Tinggi IRBI pada 2023
sifat: fakta

**Bukti:** IRBI mencatat {{angka:irbi.kab.tinggi.2023}} kab/kota kelas Tinggi pada 2023 [@bnpb-irbi].

**Dampak:** Kab/kota kelas Tinggi menjadi sasaran pertama kajian risiko dan peringatan dini;
skenario musim hujan Pulau Jawa ada di @sub:skenario.

**Pembuka:** Pusat Data, Informasi, dan Komunikasi Kebencanaan membuka data genangan per
kab/kota (rekomendasi @rek:data-genangan).
:::

::: koreksi
IRB nasional adalah rerata indeks gabungan; nilainya dapat turun karena kapasitas naik walau
bahaya banjir di kab/kota yang sama tetap.
:::

## Skenario Musim Hujan Terburuk yang Masuk Akal {#sub:skenario}

### Dasar Skenario

Skenario memakai musim La Niña {{angka:hidromet.jawa.lanina.tahun_analog|tahun}}/2021 sebagai
analog, dipilih dari musim La Niña sejak 2008 [@bnpb-dibi]. Korban jiwa berupa rentang model
yang belum diuji balik; rumah rusak dan pengungsi adalah catatan resmi musim analog.

{{halaman-baru}}

:::: skenario {#tbl:skenario-hujan}
jenis: banjir
judul: Musim hujan La Niña setara 2020/2021 di Pulau Jawa
dasar: Musim analog dipilih dari musim La Niña 2008 sampai 2025 menurut peringkat gabungan kejadian, korban, pengungsi, dan rumah rusak DIBI; ekstrem yang sangat tidak mungkin disisihkan.
kemungkinan: 4
peta: gambar/air/jejak-skenario-hujan.png
lembaga: Deputi Bidang Penanganan Darurat; BMKG; Kementerian Pekerjaan Umum; BPBD provinsi
sumber: DIBI BNPB 2008–2026; InaRISK BNPB; simulasi skenario Pantau Bencana
kaki: Simulasi skenario Pantau Bencana, belum divalidasi; korban jiwa berupa rentang model.
data_per: 23 Okt 2026

::: kerusakan
| BESARAN | RENDAH | TINGGI | KEYAKINAN | SUMBER |
| --- | ---: | ---: | --- | --- |
| Kependudukan, korban jiwa | {{angka:hidromet.jawa.lanina.korban_jiwa|rendah}} | {{angka:hidromet.jawa.lanina.korban_jiwa|tinggi}} | estimasi-model | DIBI BNPB; simulasi Pantau Bencana |
| Kependudukan, pengungsi tercatat | {{angka:hidromet.jawa.lanina.mengungsi}} | – | resmi | DIBI BNPB, musim analog |
| Kependudukan, pengungsi-hari | {{angka:hidromet.jawa.lanina.hari_mengungsi|rendah}} | {{angka:hidromet.jawa.lanina.hari_mengungsi|tinggi}} | asumsi-kebijakan | DIBI BNPB; lama mengungsi asumsi |
| Infrastruktur/fisik, rumah rusak berat | {{angka:hidromet.jawa.lanina.rumah_rusak_berat}} | – | resmi | DIBI BNPB, musim analog |
| Infrastruktur/fisik, rumah rusak sedang | {{angka:hidromet.jawa.lanina.rumah_rusak_sedang}} | – | resmi | DIBI BNPB, musim analog |
| Infrastruktur/fisik, rumah rusak ringan | {{angka:hidromet.jawa.lanina.rumah_rusak_ringan}} | – | resmi | DIBI BNPB, musim analog |
| Lingkungan, zona bahaya tinggi banjir | {{angka:hidromet.jawa.lanina.luas_bahaya_tinggi_banjir|ringkas|satuan}} | – | resmi | InaRISK BNPB |
| Ekonomi, kebutuhan stimulan rumah (batas bawah) | {{angka:hidromet.jawa.lanina.materiil_batas_bawah|rendah|rupiah}} | {{angka:hidromet.jawa.lanina.materiil_batas_bawah|tinggi|rupiah}} | asumsi-kebijakan | stimulan rumah BNPB |
| Layanan sipil, fasilitas rusak | – | – | – | menunggu rekap fasilitas rusak DIBI per musim |
| Kebutuhan respons, tempat pengungsian | – | – | – | dihitung dari pengungsi tercatat dan standar Perka BNPB 7/2008 saat naskah final |
:::

::: kebijakan
Bila cakupan peringatan dini naik ke target Renas 2029, korban jiwa skenario dihitung
{{angka:hidromet.jawa.lanina.pd_renas.korban_jiwa|fmt=0|satuan}}, dibanding
{{angka:hidromet.jawa.lanina.korban_jiwa|satuan}} pada cakupan sekarang.
:::

::: kepekaan
| TUAS | NILAI DASAR | NILAI DIGESER | KORBAN JIWA | KERUGIAN MATERIIL |
| --- | ---: | ---: | ---: | --- |
| Cakupan peringatan dini (Renas 1.c) | {{angka:hidromet.jawa.lanina.pd_renas.cakupan_2025|satuan}} | {{angka:hidromet.jawa.lanina.pd_renas.cakupan_2029|satuan}} | {{angka:hidromet.jawa.lanina.pd_renas.korban_jiwa|fmt=0}} | tidak berubah: peringatan dini tidak mengurangi rumah rusak |
:::

::: respons
- Pos komando aktif di kab/kota kelas Tinggi saat peringatan banjir terbit.
- Logistik dan tempat pengungsian disiapkan sebelum puncak musim hujan.
- BPBD mengirim data genangan harian ke BNPB.
:::

::: pemulihan
- Kajian kebutuhan pascabencana memakai data rumah rusak per kab/kota.
- Kementerian Pekerjaan Umum memperbaiki tanggul dan saluran.
- Stimulan rumah untuk rumah rusak berat dan sedang.
:::
::::

#### Pembanding dari Luar Negeri

::: program
nama: Paket kesiapsiagaan siklon Bangladesh
lokasi: Bangladesh
lembaga: Pemerintah Bangladesh; Bulan Sabit Merah Bangladesh
periode: 1970–2007
dampak: Kematian akibat siklon turun dari {{angka:bukti.bangladesh_siklon.kematian_1970|satuan}} pada 1970 menjadi {{angka:bukti.bangladesh_siklon.kematian_2007|satuan}} pada 2007
sumber: @haque-2012-siklon
keyakinan: terverifikasi
jenis: program

**Yang dilakukan:** peringatan dini siklon berjenjang sampai desa, tempat perlindungan
siklon, tanggul pesisir, dan relawan desa.

**Yang ditiru:** peringatan dini yang sampai ke desa dan rute evakuasi ke tempat
perlindungan yang dikenal warga.

**Yang tidak cocok:** penurunan itu hasil paket selama empat dekade; tidak ada satu program
yang bisa diberi seluruh penurunan.

**Penyesuaian Indonesia:** untuk banjir bandang dan longsor yang berwaktu tunggu pendek,
manfaat peringatan dini lebih kecil daripada untuk siklon.
:::

## Strategi Musim Hujan {#sub:strategi}

::: garis-waktu {#tbl:garis-waktu-hujan}
judul: Aksi prabencana, tanggap darurat, dan pascabencana musim hujan di Pulau Jawa
musim: hujan
sumber: Rekomendasi kajian ini

| FASE | AKSI | REK | LEMBAGA |
| --- | --- | --- | --- |
| prabencana | Perbarui peta risiko banjir kab/kota kelas Tinggi | @rek:data-genangan | Pusat Data, Informasi, dan Komunikasi Kebencanaan |
| prabencana | Sebarkan peringatan dini berbasis dampak sebelum musim hujan | @rek:peringatan-dini | Direktorat Peringatan Dini |
| prabencana | Latih BPBD membaca prakiraan musim hujan BMKG | @rek:peringatan-dini | Direktorat Kesiapsiagaan |
| tanggap-darurat | Aktifkan pos komando saat peringatan banjir terbit | @rek:peringatan-dini | Deputi Bidang Penanganan Darurat |
| tanggap-darurat | Catat genangan harian per kab/kota | @rek:data-genangan | BPBD kab/kota |
| tanggap-darurat | Salurkan logistik ke lokasi pengungsian tercatat | @rek:data-genangan | Deputi Bidang Logistik dan Peralatan |
| pascabencana | Kaji kebutuhan pascabencana dengan data genangan | @rek:data-genangan | Deputi Bidang Rehabilitasi dan Rekonstruksi |
| pascabencana | Evaluasi ketepatan peringatan dini musim berjalan | @rek:peringatan-dini | Direktorat Peringatan Dini |
| pascabencana | Perbarui kajian risiko dengan kejadian musim berjalan | @rek:data-genangan | Direktorat Pemetaan dan Evaluasi Risiko Bencana |
:::

:::: matriks-rekomendasi {#tbl:rekomendasi-hujan}
judul: Rekomendasi internal BNPB untuk musim hujan di Pulau Jawa
kelompok: internal
sumber: Analisis kajian ini; Renas PB 2025–2029

::: rek {#rek:peringatan-dini}
langkah: Perluas peringatan dini banjir kab/kota kelas Tinggi
jenis: data
status: dikembangkan
program: Layanan peringatan dini cuaca BMKG
unit: Direktorat Peringatan Dini; Direktorat Kesiapsiagaan
kl: BMKG; Kementerian Pekerjaan Umum
waktu: 2026-2027
indikator: penduduk daerah berisiko yang tercakup peringatan dini mencapai {{angka:hidromet.jawa.lanina.pd_renas.cakupan_2029|satuan}}
dasar: Renas PB 2025–2029 indikator 1.c [@bnpb-2025-renas]
butuh: @rek:data-genangan

Penduduk daerah berisiko yang tercakup peringatan dini baru
{{angka:hidromet.jawa.lanina.pd_renas.cakupan_2025|satuan}}, di bawah target Renas 2029.
:::

::: rek {#rek:data-genangan}
langkah: Buka data genangan musim hujan per kab/kota
jenis: data
status: baru
unit: Pusat Data, Informasi, dan Komunikasi Kebencanaan
kl: Kementerian Pekerjaan Umum; BMKG
waktu: 100-hari
indikator: data genangan musim hujan 2026/2027 terbit per kab/kota sebelum Maret 2027
dasar: UU 24/2007 [@ri-2007-uu24]

Data genangan per kab/kota belum terbuka, sehingga kajian risiko dan evaluasi peringatan dini
belum bisa diuji terhadap kejadian.
:::
::::

::: matriks-lembaga {#tbl:lembaga-hujan}
judul: Pembagian tugas lembaga per fase musim hujan
sumber: UU 24/2007; analisis kajian ini

| LEMBAGA | PRABENCANA | TANGGAP DARURAT | PASCABENCANA |
| --- | --- | --- | --- |
| BNPB | pemimpin: peringatan dini dan kajian risiko (@rek:peringatan-dini) | pemimpin: komando tanggap darurat bersama BPBD | pemimpin: kajian kebutuhan pascabencana |
| BMKG | pemimpin: prakiraan musim hujan dan peringatan dini cuaca | pendukung: pembaruan peringatan cuaca selama kejadian | tidak berlaku: pemulihan prasarana dan permukiman di luar kewenangan BMKG |
| Kementerian Pekerjaan Umum | pemimpin: operasi waduk dan pemeliharaan tanggul | pendukung: perbaikan darurat tanggul | pemimpin: rehabilitasi prasarana sumber daya air |
| BPBD | pendukung: penyebaran peringatan dini ke desa | pemimpin: penanganan darurat di kab/kota | pendukung: pendataan kerusakan |
:::

::: matriks-jenis {#tbl:jenis-hujan}
judul: Aksi per fase untuk dua ancaman musim hujan
sumber: Rekomendasi kajian ini

| JENIS | PRABENCANA | TANGGAP DARURAT | PASCABENCANA |
| --- | --- | --- | --- |
| banjir | peringatan dini berbasis dampak (@rek:peringatan-dini) | pencatatan genangan harian (@rek:data-genangan) | kajian kebutuhan dengan data genangan (@rek:data-genangan) |
| rob | peringatan pasang tinggi (@rek:peringatan-dini) | pencatatan genangan rob (@rek:data-genangan) | tidak berlaku: pemulihan pesisir dibahas di Bab 4 |
:::

::: keputusan
judul: Keputusan yang diminta dari Kepala BNPB

- Menetapkan target cakupan peringatan dini kab/kota kelas Tinggi di Pulau Jawa sebelum musim hujan 2026/2027.
  - Bila ditetapkan: BPBD bekerja dengan sasaran yang sama dengan Renas PB 2025–2029.
  - Bila tidak: cakupan mengikuti kemampuan tiap daerah.
:::

[^pulau]: Rerata sederhana kab/kota per pulau; pengelompokan pulau adalah pilihan penyusun.
````

## 16. Potongan varian lain

Potongan ini juga diurai uji diri (dibungkus front matter bab kajian mitigasi).

Foto Commons beratribusi (PEDOMAN B5.15; sumber disusun pembangun dari pengarang dan lisensi):

````naskah-potongan
::: gambar {#gbr:jatiluhur}
berkas: gambar/foto/jatiluhur-12.jpg
jenis: foto
judul: Waduk Jatiluhur, Purwakarta
pengarang: Cep Budhi Darma
lisensi: CC BY-SA 4.0
url: https://commons.wikimedia.org/wiki/File:Jatiluhur_12.jpg
potong: dipotong tengah selebar isi
lebar: penuh
:::
````

Kartu skenario varian b (nonalam, kejadian analog, tanpa pita model):

````naskah-potongan
:::: skenario {#tbl:skenario-tpa}
jenis: kebakaran-tpa
judul: Kebakaran TPA setara Sarimukti 2023
dasar: Kejadian analog terdokumentasi; platform tidak punya simulasi kebakaran TPA.
analog: Kebakaran TPA Sarimukti, Kabupaten Bandung Barat, 2023
lembaga: Kementerian Lingkungan Hidup; BPBD provinsi; Deputi Bidang Penanganan Darurat
sumber: Laporan kejadian BPBD
kaki: Kejadian analog, bukan proyeksi model.

::: kerusakan
| INDIKATOR | NILAI | KEYAKINAN | SUMBER |
| --- | --- | --- | --- |
| Korban jiwa | – | – | tidak ada korban jiwa tercatat di laporan BPBD |
| Luas terdampak | – | – | menunggu laporan resmi luas terbakar |
| Kerugian materiil | – | – | tidak ada penilaian kerugian resmi |
| Kerugian imateriil | – | – | hari asap dan kasus ISPA menunggu data dinas kesehatan |
:::

::: respons
- Pemadaman dan pendinginan timbunan oleh pemda bersama BPBD.
- Pemantauan kualitas udara di permukiman sekitar TPA.
- Layanan kesehatan untuk keluhan pernapasan.
:::

::: pemulihan
- Penataan ulang sel timbunan dan jalur pemadaman.
- Penetapan TPA pengganti sementara.
- Evaluasi izin dan operasi TPA.
:::
::::
````

Kartu skenario varian c (sosial, kartu analog berangka tanpa perkalian dan tanpa proyeksi per wilayah):

````naskah-potongan
:::: skenario {#tbl:skenario-sosial}
jenis: konflik-sosial
judul: Konflik sosial antarkelompok setara Maluku 1999–2002
dasar: Analog terbesar dalam 30 tahun terakhir; tanpa perkalian dan tanpa proyeksi per wilayah.
analog: Konflik antarkelompok Maluku, 1999–2002
kemungkinan: tidak dinilai: kejadian sosial tidak punya model peluang yang bisa diuji balik
lembaga: Kementerian Dalam Negeri; Kepolisian Negara Republik Indonesia; Deputi Bidang Penanganan Darurat
sumber: International Crisis Group; UU 7/2012; Perpres 46/2026

::: kerusakan
| INDIKATOR | NILAI | KEYAKINAN | SUMBER |
| --- | --- | --- | --- |
| Korban jiwa | {{angka:sosial.maluku.meninggal_bawah|satuan}} | terverifikasi | International Crisis Group |
| Luas terdampak | – | – | tidak ada luas terdampak terdokumentasi |
| Kerugian materiil | – | – | tidak ada penilaian kerugian resmi |
| Kerugian imateriil | {{angka:sosial.maluku.pengungsi|satuan}} | terverifikasi | International Crisis Group, pengungsi |
:::

::: mandat
Status konflik ditetapkan kepala daerah atau Presiden menurut UU 7/2012; BNPB mendukung
logistik, pengungsian, dan pemulihan.
:::

::: respons
- Dukungan logistik dan tempat pengungsian.
- Layanan dasar bagi pengungsi.
- Pendataan pengungsi bersama pemda.
:::

::: pemulihan
- Pemulihan permukiman dan layanan dasar.
- Dukungan rekonsiliasi pascakonflik menurut Perpres 46/2026.
- Pemantauan pengungsi yang kembali.
:::
::::
````

## 17. Spek deck: garis besar sebelum render

Deck tidak ditulis dalam dialek naskah ini; spek JSON-nya dibaca `bangun/pptx/deck.py` (format lengkap di
`bangun/pptx/README.md`) dengan token teks yang sama (`{{angka:...}}`, `{{tempat:...}}`, `{{sorot:...}}`). Sebelum satu
bentuk pun digambar, spek wajib memuat garis besar (Buku Pegangan S34, S35, S7):

| Medan | Letak | Isi | Ditolak bila |
| --- | --- | --- | --- |
| `pesan_kunci` | akar spek | satu kalimat pesan kunci deck | kosong atau tidak ada |
| `pesan` | tiap slide selain sampul, penutup, pembatas | pesan slide satu frasa | kosong atau tidak ada |
| `jenis_slide` | idem | daftar tertutup S35: `navigasi`, `peta`, `grafik`, `tabel`, `matriks`, `kartu-skenario`, `panel`, `rekomendasi`, `lampiran` | di luar daftar; tidak cocok dengan tata letak (kesimpulan navigasi, skenario kartu-skenario, temuan-peta peta, rekomendasi rekomendasi, lampiran-tabel lampiran); sama dengan slide isi sebelumnya kecuali lampiran atau `seri` sama |
| `judul_bentuk` | idem | `temuan` atau `deskriptif` (S7, KEPUTUSAN T11) | di luar dua nilai; `temuan` tanpa token angka di judul; judul berkode bagian A sampai D yang tidak `temuan`; navigasi atau lampiran yang tidak `deskriptif` |
| `seri` | opsional | nama seri: seri berchip S12, profil wilayah S26, lanjutan satu tabel | – |

Medan S35 "jenis" dan S7 "judul" ditulis `jenis_slide` dan `judul_bentuk` karena `jenis` (tata letak) dan `judul`
(teks judul) sudah dipakai spek. Daftar butir di slide paling banyak 6 (S38).

## 18. Mengubah kontrak

Direktif, atribut, atau opsi token baru: tambahkan di berkas ini, di `naskah.py` (tabel
`DIREKTIF`, `KOLOM`, opsi `suntik`), dan di contoh bagian 15, lalu jalankan uji diri. Kode
tampil (label, ikon, warna) ditambahkan di `tema.json`, bukan di sini.
