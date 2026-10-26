# Spek deck JSON: skema medan demi medan

`scripts/deck.py` membaca satu berkas spek JSON dan menolak (DeckGalat, berhenti di galat pertama) semua yang tidak sesuai
skema dan gaya. Skema ini diturunkan dari kode `deck.py` dan README pembangun repo. Contoh nyata: tujuh spek di
`assets/proyek-contoh/spek/` (lihat `contoh-deck.md`). Dialek token dan registri angka: `NASKAH-SPEK.md` bagian 8, 9, 17.

Daftar isi: 1 Akar spek. 2 Medan bersama tiap slide isi. 3 Token teks. 4 Jenis tata letak (`jenis`). 5 Komponen bersama
(grup, kartu, pita, panel, data CSV, grafik, tabel, peta). 6 Registri angka. 7 Yang ditolak saat membangun.

## 1. Akar spek

| Medan | Wajib | Isi |
| --- | --- | --- |
| `kajian` | ya | kunci entri `tema.json` `kajian` (contoh: `air`, `mitigasi`, `rehab`). Memberi judul sampul, subjudul, judul pendek, kata kunci PPTX, dan `nama_berkas` bawaan. Deck baru: tambah entri ke tema.json proyek |
| `tanggal` | ya | ISO `YYYY-MM-DD`, tanggal paparan. Dipakai pil tanggal sampul, baris penutup, dan `{DDMMYY}` nama berkas |
| `pesan_kunci` | ya | satu kalimat pesan kunci deck (S34). Ditulis ke komentar properti PPTX |
| `cut_off` | untuk slide data | isi pil CUT OFF DATA, mis. `"23 Okt 2026, 23.59 WIB"`. Slide yang menulis `"cut_off": true` memakai nilai ini. Satu nilai untuk semua pil (S16) |
| `slide` | ya | daftar slide berurutan |
| `judul_dokumen`, `subjek_dokumen` | tidak | properti inti PPTX; bawaan judul dan subjudul kajian |
| `horizon_label` | tidak | `{kode horizon: label chip}`, mis. `{"100-hari": "100 hari sejak penetapan"}`; kode harus ada di `kosakata.horizon` |
| `judul_sampul_maks_baris`, `judul_sampul_pt` | tidak | judul sampul paling banyak N baris pada ukuran ini (huruf dikecilkan, bukan baris ketiga) |
| `pil_draf` | tidak | `"LABEL\|nilai"`, mis. `"DRAF PEMBARUAN\|23 Okt 2026"`: pil kedua berpola CUT OFF di atas pil batas data (deck draf atau pembaruan) |
| `_catatan` | tidak | catatan bebas, diabaikan mesin |

## 2. Medan bersama tiap slide isi

Slide isi = semua selain `sampul`, `penutup`, `pembatas-lampiran`.

| Medan | Wajib | Isi |
| --- | --- | --- |
| `jenis` | ya | tata letak, salah satu dari 12 di bagian 4 |
| `jenis_slide` | ya | daftar tertutup S35: `navigasi`, `peta`, `grafik`, `tabel`, `matriks`, `kartu-skenario`, `panel`, `rekomendasi`, `lampiran` (lihat `jenis-slide-S35.md`) |
| `judul_bentuk` | ya | `temuan` (kalimat temuan, wajib memuat paling sedikit satu token `{{angka:...}}`) atau `deskriptif` |
| `pesan` | ya | satu kalimat pesan slide (garis besar, ghost deck) |
| `judul` | ya (kecuali lampiran-tabel memakai `kode` + `judul`) | judul slide, paling banyak 2 baris pada 19 pt (huruf dikecilkan otomatis sampai batas). Slide bagian berkode "A1. " di depan |
| `subjudul` | tidak | satu baris 12 pt di bawah judul, harus selesai sebelum x 690 pt |
| `cut_off` | tidak | `true` (pakai `cut_off` akar) atau teks sendiri. Pil CUT OFF di kanan atas; kotak judul menyempit ke 644 pt |
| `seri` | tidak | nama seri; dua slide berurutan ber-`jenis_slide` sama hanya sah bila `seri` sama (seri berchip S12, profil wilayah S26, lanjutan) |
| `sumber` | tidak | teks baris "Sumber:" bila gabungan otomatis lebih dari satu baris; `false` = tanpa baris sumber |

## 3. Token teks

Semua teks spek (judul, pesan, label, isi, daftar) boleh memuat:

- `{{angka:kunci|opsi}}`: angka dari registri (`data/angka.json` atau `--registri`). Opsi: `fmt=0|1|2`, `persen`, `arah`
  (kata naik/turun + segitiga, diwarnai arah halaman), `ringkas` (juta, miliar), `rupiah`, `rentang`, `rendah`, `tinggi`,
  `satuan`, `tahun`, `teks`. Di judul angka berwarna oranye D9600B (navy bila keluarga api tampil di halaman); di isi tebal.
- `{{tempat:Jawa Tengah}}`: tempat berwarna biru lembaga 00499D di judul.
- `{{sorot:(7 Hari)}}`: satu frasa oranye di judul; juga kode bagian `{{sorot:A1.}}`.
- `**tebal**`.

Angka yang diketik langsung ditolak (D-22), kecuali tahun (`2026`), rentang tahun (`2026/2027`), kode temuan atau lampiran
(`B1`, `A.2`), urutan `ke-7`, dan `100 hari`. Angka dari entri registri berlabel ilustrasi (`utama: false` atau catatan
"hanya ilustrasi") ditolak; pakai pasangan utamanya. Karakter terlarang di semua teks: em dash, titik tengah, elipsis,
segitiga dan panah karakter, centang, emoji; istilah di `kosakata.istilah.terlarang` (dan `data/glosarium.json`
`terlarang`). Label data CSV diganti ke istilah baku `kosakata.istilah.ganti`.

## 4. Jenis tata letak (`jenis`)

| `jenis` | `jenis_slide` yang sah | Wajib | Opsional |
| --- | --- | --- | --- |
| `sampul` | (bingkai) | | `foto` (jalur relatif akar; atribusi dari `kredit`, `kredit.json` akar, atau `tema.json` `docx.sampul_foto`), `kredit`, `kepada`, `subjudul` (baris tanggal paparan, ditulis sebagai struktur), `layout: "gelap"` |
| `kartu-angka` | apa saja selain yang dikunci tata letak lain; lazim `navigasi` (Pesan Kunci) atau `panel` | `judul`; untuk halaman Pesan Kunci: `tesis` dan `temuan` | `grup`, `judul_panel` (bawaan "Pesan kunci"), `kolom` (kolom daftar temuan, bawaan 2), `pita`, `panel` |
| `temuan-grafik` | biasanya `grafik` | `judul`, `grafik` | `grup`, `panel`, `pita`, `rasio` (lebar utama, bawaan `bingkai.rasio_utama`) |
| `temuan-peta` | hanya `peta` | `judul`, `peta` | `grup`, `panel`, `pita`, `rasio` |
| `tabel-peringkat` | `tabel` atau `matriks` | `judul`, `tabel` | `grup`, `panel`, `pita`, `rasio` |
| `skenario` | hanya `kartu-skenario` | `judul`, `skenario` | `sumber` |
| `strategi-tiga-fase` | biasanya `grafik` (rantai tahap G21) | `judul`, `fase` | `pita` |
| `rekomendasi` | hanya `rekomendasi` | `judul`, `rekomendasi` | `seri`, `sumber` (memasang baris Sumber; bawaan tanpa kaki, d5) |
| `kesimpulan` | hanya `navigasi` | `judul`, `kartu` (tepat 8) | `arahan` |
| `penutup` | (bingkai) | | `foto`, `kredit`, `teks` (bawaan "Terima kasih") |
| `pembatas-lampiran` | (bingkai) | `kelompok` `{"A": "judul kelompok"}` | `teks` (bawaan "Lampiran"), `subjudul`; butir dan nomor halaman dihitung dari slide lampiran sesudahnya |
| `lampiran-tabel` | hanya `lampiran` | `kode` (mis. `L1`, `A1`), `judul`, `data` | `judul_daftar` (teks di pembatas), `maks_baris` (bawaan 24); tabel panjang dipecah rata ke "(lanjutan 2/3)" |

Rincian per jenis:

- **kartu-angka (Pesan Kunci, PEDOMAN B5.26)**: `tesis` = kalimat tesis 12 pt navy (paling banyak 2 baris). `temuan` =
  `[{kode, keyakinan, ikon, teks}]`; `kode` harus berpola `tema.json slide.komponen.temuan.pola_kode` (kini
  `Temuan [A-C].n`, mis. "Temuan B.1"; huruf menurut pertanyaan pimpinan DOCX); `keyakinan` salah satu lima label dan
  tidak boleh lebih kuat dari angka terlemah di teksnya; teks paling banyak 3 baris.
- **temuan-grafik**: `grafik = {judul_panel, ikon, nada, hitungan, judul, keluarga, seragam, pembanding, data}`.
  `judul` grafik = topik bold, lalu satuan dan periode (S9), mis. `"**Kematian terlapor**, jiwa, 2020–2025"`.
  `keluarga` = `netral`, `api`, `air`, `kering`. Batang pertama abu pembanding (`pembanding: false` mematikan), tiga
  terakhir pekat; `seragam: true` = satu warna. Paling banyak `grafik_batang.maks_batang` batang. Persen perubahan antarbatang
  dan perubahan neto di kepala dihitung mesin (angka turunan bersumber).
- **temuan-peta**: `peta = {png, legenda, keyakinan, sumber, penanda}`. `png` relatif akar; wajib ada manifest perender
  `<png>.json` di sebelahnya dengan `unsur_peta.sumber_batas` dan `unsur_peta.sistem_referensi` (opsional `proyeksi`,
  `catatan` "Batas wilayah bukan rujukan resmi") dan `masukan` `{jalur relatif folder PNG: sha256}` untuk cek basi.
  `legenda` = `{"item": [{warna, label}], "judul"}`, atau `{"irbi": ["Sedang", "Tinggi"], "judul"}` (warna dari
  `skala.irbi`, T8), atau `{"dari_manifest": true, "judul"}` (label rentang kelas ditulis perender di manifest `legenda`).
  `penanda` = `[{x, y, teks}]`, x dan y pecahan lebar dan tinggi PNG; label pil native, ditolak bila keluar peta, tumpang,
  atau menutup daratan berdata lebih dari `komponen.peta.label_darat_maks`.
- **tabel-peringkat**: `tabel = {judul_panel, ikon, nada, hitungan, peringkat (bawaan true: nomor dalam bulatan navy),
  total (baris total navy), data}`. Kolom pertama tanpa `fmt` = label; kolom ber-`fmt` = metrik (kepala berpil bila kolom
  punya `warna`). `data.sorot` = daftar label baris yang diblok FDF1E8.
- **skenario (kartu skenario, PEDOMAN B5.11)**: `skenario = {jenis, judul, keyakinan, label_jenis, kemungkinan,
  kemungkinan_catatan, kemungkinan_keyakinan, kerusakan, kebijakan, catatan, respons, pemulihan, lembaga}`.
  `jenis` = kunci `kosakata.jenis_bencana` (menentukan keluarga warna); `kemungkinan` = 1 sampai 5 (kelas
  `kosakata.kemungkinan_5_tahun`) atau `null` (tampil `kemungkinan_catatan`, bawaan "Kelas kemungkinan dalam penyusunan");
  `kerusakan` = `[{besaran, nilai, keyakinan}]` (nilai bertoken); `kebijakan` = `{sekarang: {label, nilai}, target:
  {label, nilai}, keterangan, keyakinan (bawaan asumsi-kebijakan), legenda}`; `respons`, `pemulihan` = daftar paling banyak
  6 butir (S38); `lembaga` = daftar singkatan (chip, yang pertama pemimpin, paling banyak 3 baris).
- **strategi-tiga-fase (PEDOMAN B5.12)**: `fase = {prabencana, tanggap-darurat, pascabencana}`, masing-masing 3 sampai 5
  `[{kode, aksi}]`. `kode` wajib ada di baris `rekomendasi` deck yang sama; `waktu` dan lembaga pemimpin diturunkan dari
  baris itu (bila ditulis sendiri harus identik, C7).
- **rekomendasi (S28, S29)**: `rekomendasi = [{kode, jenis, langkah, waktu, status, rincian, lembaga}]`. `kode` unik se-deck
  (mis. `"01"`); `jenis` = `kosakata.jenis_aksi` (`regulasi`, `data`, `infrastruktur`, `kapasitas`, `pembiayaan`; jadi ikon
  lingkaran navy); `waktu` = `100-hari`, `2026-2027`, `2028-2030`; `status` = `sudah-ada`, `dikembangkan`, `baru`;
  `rincian` satu kalimat sekitar 110 karakter, rata kiri-kanan, paling banyak 2 baris; `lembaga` = chip berikon, bukan logo.
  Baris yang tidak muat satu slide ditolak: pecah ke slide berikut dengan `seri` sama.
- **kesimpulan (S32)**: `kartu` = tepat 8 `[{label, ikon, warna, judul, isi}]` (grid 4 x 2; `label` jadi KAPITAL kecil di
  atas judul; kartu berlabel kelas Rendah/Sedang/Tinggi wajib warna `skala.irbi`). `arahan = {label (bawaan ARAHAN),
  ikon, teks}`: pita oranye keputusan yang diminta dari Kepala BNPB, paling banyak 2 baris.

## 5. Komponen bersama

- `grup` = `[{pil, nada, ikon, kartu}]`. `nada` = `data` (navy), `perhatian` (merah), `bmkg` (slate). `kartu` =
  `[{nilai, label, ikon, warna}]`; `nilai` wajib bertoken angka registri (pil keyakinan grup diturunkan dari angka
  terlemah). Kartu dengan nilai bertoken `|arah` diwarnai arah halaman, tanpa melihat `warna`. Lebar kartu minimum
  `komponen.kartu.lebar_pt[0]`; terlalu banyak kartu ditolak.
- `pita` = `{label, nada, kolom}`. `nada` = `aksi` (FDF4EC), `hujan` (EEF5FC), `data` (F7F8FA). `kolom` = 3 sampai 4
  `[{ikon, judul, isi}]`; judul 1 baris, isi paling banyak 2 baris.
- `panel` (panel samping) = `{judul, ikon, nada, hitungan, keyakinan}` ditambah salah satu atau gabungan `data` (tabel),
  `daftar` (butir, paling banyak 6), `temuan` (seperti Pesan Kunci, satu kolom). `nada` panel: `netral`, `api`, `bahaya`,
  `air`, `kering`, `geologi`, `nonalam`, `sosial`. `peringkat`/`total` berlaku untuk `data` di panel.
- `data` (tabel dari CSV, sama dengan tabel csv naskah) = `{csv, saring, urut, batas, kolom, keyakinan, sumber, sorot,
  seri}`. `csv` relatif akar proyek. `saring` = `"k=v; k2!=v2"`. `urut` = nama kolom, `-kolom` menurun. `batas` = jumlah
  baris. `kolom` = `[{nama, kepala, fmt, warna, ikon, ganti}]`; `fmt` = desimal dan bendera token (`"0"`, `"1|persen|arah"`,
  `"ringkas"`, `"rupiah"`); `arah` menggambar segitiga vektor; `ganti` = `{nilai CSV: label tampil}` untuk memendekkan label
  panjang (juga untuk membuang tiga-serangkai di label data). `keyakinan` = salah satu lima label. `seri: "kolom"` untuk
  grafik dari satu baris (kolom jadi batang). Tiap angka sel masuk manifest (kunci `csv:<berkas>#<kolom>`).
- `ikon` = kunci registri `tema.json` `ikon` (daftar di `komponen-dan-tata-letak.md`). `warna` = nama token (`navy`,
  `oranye`, `merah`, `biru`, `slate`, `kategori.<k>`, `skala.<ramp>.<n>`), tidak pernah hex.

## 6. Registri angka

Berkas `data/angka.json` = `{"angka": {kunci: entri}}`. Entri wajib `keyakinan`, `sumber`, `satuan`, lalu salah satu:

- `berkas` (relatif `data/`, JSON atau CSV) + `jalur` (dan/atau `jalur_rendah` + `jalur_tinggi`). Jalur: kunci dipisah
  titik, `[nama.bertitik]`, `[3]`, `[kolom=nilai,kolom2=nilai2]` memilih tepat satu baris.
- `nilai` (atau `rendah` + `tinggi`) + `pustaka` (kunci `pustaka.json`).

Opsional: `kali` (pengali), `utama: false` atau catatan "hanya ilustrasi" (ditolak di deck), tambahan keyakinan sesudah
titik koma (`"estimasi-model; belum diuji balik"`). Keyakinan sah: `resmi`, `terverifikasi`, `estimasi-model`,
`asumsi-kebijakan`, `penilaian-pakar` (urutan kuat ke lemah). Entri `estimasi-model` dibulatkan dua angka bermakna dan
diberi "sekitar" otomatis.

Registri lain: `deck.py SPEK --registri jalur/angka.json` memakai berkas itu (entri `berkas` tetap dibaca relatif
`<akar>/data/`). Angka deck sama dengan angka dokumen karena keduanya membaca registri yang sama; jangan menyalin angka ke
spek.

Contoh entri (dari registri contoh):

```json
"irbi.nasional.2024": {"berkas": "irbi/irbi.json", "jalur": "tabel[irbi_tren_2015_2024.csv].baris[tingkat=nasional].y2024",
                       "satuan": "", "keyakinan": "resmi", "sumber": "InaRISK BNPB, IRBI 2024"}
```

## 7. Yang ditolak saat membangun

Spek tanpa garis besar (`pesan_kunci`, `pesan`, `jenis_slide`, `judul_bentuk`); `jenis_slide` di luar S35 atau tidak
sah untuk tata letaknya; navigasi atau lampiran berjudul temuan; judul temuan tanpa token angka; slide bagian A sampai D
berjudul deskriptif; dua slide isi berurutan berjenis sama di luar seri; em dash, titik tengah, elipsis, segitiga, panah,
centang, emoji; istilah terlarang; angka diketik; token atau kunci angka tak dikenal; angka dari baris ilustrasi; judul
lebih dari dua baris pada 19 pt; teks tidak muat di kotaknya (label, nilai kartu, isi pita, rincian, judul panel, baris
Sumber); kartu terlalu sempit; kesimpulan bukan 8 kartu; fase di luar 3 sampai 5 aksi; kode aksi tiga fase tidak ada di
matriks rekomendasi atau waktu dan pemimpinnya beda; kode rekomendasi dobel; jenis aksi, horizon, status di luar kosakata;
kode temuan bukan "Temuan B.1"; temuan tanpa keyakinan atau lebih kuat dari angka terlemahnya; Pesan Kunci tanpa tesis;
kartu berlabel kelas indeks yang tidak berwarna `skala.irbi`; keyakinan di luar lima label; ikon di luar registri; warna
di luar token; foto tanpa atribusi atau berlisensi NC/ND; pembatas Lampiran tanpa slide lampiran; peta tanpa manifest
perender, tanpa unsur peta, atau basi; label peta keluar, tumpang, atau menutup daratan; lebih dari 6 butir per daftar;
grup tanpa angka registri; legenda peta menabrak pil keyakinan.
