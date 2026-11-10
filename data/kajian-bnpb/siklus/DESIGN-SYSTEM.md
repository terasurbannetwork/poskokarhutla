# DESIGN-SYSTEM: Siklus Bencana (`/siklus`)

Dokumen keenam dalam urutan otoritas. Kalah dari `KEPUTUSAN-AWAL.md` (KA), `PRD.md`, `ALUR.md`; menang atas DESAIN-TEKNIS dan di bawahnya. Versi 1.0, 10 Nov 2026.

Desktop dulu (1440 px) untuk staf di meja Pusdalops; seluler (390 px) untuk BPBD di lapangan. Stack: vanilla JS tanpa build step, tanpa React atau starter kit. Sistem desain Centurisk97 dipakai apa adanya: tidak ada palet lokal, tidak ada huruf lokal. Kelas baru berawalan `.sk-*` dan dijaga sesedikit mungkin; semua yang sudah ada di `public/inti` dipakai ulang.

## 1. Fondasi (wajib, semua layar)

### 1.1 Kepala situs dan urutan berkas

- Kepala `header.top` navy bersama (memori kepala-situs-wajib): salin markup dari `public/semua/index.html` (logo `/img/logo.svg?v=2`, `<details class="bencana" data-bencana="semua" data-tanpa-segera>`, tombol Bagikan dan tema `.iconbtn`). Menu bencana digambar `/inti/kepala.js`. Tautan `/siklus` tidak masuk menu utama sebelum U2 dijawab (KA bagian H).
- Urutan `<link>`: `/inti/tema.css`, `/inti/gaya.css`, `/inti/kepala.css`, `/inti/kartu.css`, `/inti/tabel.css`, lalu `/siklus/siklus.css` terakhir. `/inti/peta.css` dan MapLibre 4.7.1 hanya di layar yang punya peta (`/siklus/paparan`, `/siklus/kejadian/:id`, `/siklus/kaji/:id`).
- Urutan `<script>`: `/inti/format.js`, `/inti/nanti.js`, `/inti/tip.js`, `/inti/kartu.js`, lalu modul layar. `#tip` dan `.toast` ada di tiap halaman.
- Halaman `/siklus/*` staf dilayani lewat `run_worker_first` (KA 27a): JS dan CSS-nya tidak terbuka tanpa sesi. Layar publik hanya `/siklus` (kartu publik) dan bagian ringkasan resmi `/siklus/kejadian/:id` (U3 bawaan).
- Nama lama situs tidak muncul di judul, `<title>`, OG, atau teks. Judul halaman: "Siklus Bencana, Centurisk97".

### 1.2 Token yang dipakai (semua dari `tema.css`, tidak ada tambahan)

| Kebutuhan | Token |
|---|---|
| Latar halaman, kartu, panel abu | `--paper`, `--card`, `--surface` |
| Teks, teks kedua, garis | `--ink`, `--ink2`, `--line` |
| Kepala tabel dan tombol aktif | `--brand` (navy), `--brand2`, `--accent` |
| Status | `--ok`, `--warn`, `--bad`, `--info` |
| Skala bahaya peta | `--f0` hijau, `--f1` kuning, `--f2` oranye, `--f3` merah |
| Bayangan, sudut, tinggi kepala | `--shadow`, `--shadow-lg`, `--r` 16, `--r-sm` 10, `--top` 58 |
| Huruf | `--font` Inter (isi), `--display` Plus Jakarta Sans (judul dan angka kunci) |

Terang dan gelap setara lewat token yang sama; tidak ada `#hex` baru. Warna di dalam kartu hanya lewat token (dengan `color-mix(in oklch, var(--x) N%, transparent)` untuk latar pil, pola `.ex-ey`). `.hl` merah hanya dari `.ex-std .hl`. Kepala kartu navy `#0b2545` sudah diatur `kartu.css` untuk semua `.ex`; tidak ditiru ulang.

### 1.3 Huruf dan teks

- Judul kartu 21 px (18 px seluler) `--display` 800, dari `.ex-std`. Angka kunci memakai `--display`, `font-variant-numeric:tabular-nums` (kelas `.num`).
- Paragraf narasi rata kanan-kiri (`text-align:justify;hyphens:auto`). Sel tabel dan baris pendek tetap rata kiri.
- Tanpa titik tengah dan em dash. Pemisah: koma, kalimat biasa, label sendiri, atau baris baru. Rentang ditulis "{bawah} sampai {atas}".
- Sapaan "kamu" di teks bantuan. BNPB dan BPBD ditulis "kita".
- Ikon: garis SVG seragam 2 px, `currentColor`, tanpa emoji, tombol ikon polos tanpa garis luar dan tanpa kotak (memori ikon-tanpa-garis-luar).

### 1.4 Format angka (satu formatter)

Hanya `fmt` (id-ID, titik ribuan, koma desimal), `rb` (rb, jt), `jamWIB`, `fmt.durasi` dari `/inti/format.js`, dipakai lewat `inti.js` Siklus (`inti.js` hanya menyodorkan `window.fmt`; tidak ada formatter kedua). Tidak ada `toLocaleString` lepas.

| Hal | Bentuk |
|---|---|
| Jumlah jiwa, bangunan | `fmt`, bulat; di atas 10 ribu boleh `rb` ("48 rb") di sel sempit, tooltip menunjukkan penuh |
| Rentang | `{fmt(bawah)} sampai {fmt(atas)}` selalu dua ujung (KA 9) |
| Rupiah | "Rp 1,2 miliar", "Rp 640 juta"; penuh di tooltip. Satu fungsi `rupiah()` di `siklus.js` |
| Persen | satu desimal, koma: "58,9 persen" di teks, "58,9%" di sel |
| Tanggal dan jam | 24 jam, zona tertulis (WIB, WITA, WIT) |
| Selisih sumber | "DIBI 12, Logbook 15, selisih 3" (ALUR bagian 1) |
| Tidak ada data | kata "tidak ada" atau "belum ada laporan" dengan pil `menunggu`; tidak pernah `0` dan tidak pernah "–" bila artinya tidak ada |
| Provinsi tanpa grid | "tidak terliput" (bukan 0 bangunan) |

## 2. Pola bersama

### 2.1 Kartu standar `.ex.ex-std` (AGENTS.md §3.5)

Tiap bagian layar adalah satu kartu `.ex.ex-std` dari `/inti/kartu.css`: pil kategori `.ex-ey`, judul kalimat temuan dengan angka `.hl`, isi `.ex-bd`. Tanpa kaki `.ex-footer`/`.ex-ft`, tanpa teks "Sumber:". Definisi kolom masuk `title` kepala tabel; sumber dan waktu angka tampil sebagai pil label keyakinan beserta `title` (isi: nama sumber, waktu ambil, rumus singkat). Tombol atau pemilih bagian ada di kanan judul (`.ex-jd`). Dilarang membuat kepala bagian sendiri. Tiap layar siklus didaftarkan ke daftar `LAYAR` di `tests/agen/gerbang-kartu-std.test.mjs` (kerja `penulis-gerbang` atas permintaan tiket).

Judul adalah kalimat temuan, bukan nama bagian: "Gempa M7,8 Ende diperkirakan menjangkau {a} sampai {b} jiwa pada MMI 7 ke atas" dengan `{a}` dan `{b}` dibungkus `<span class="hl">`. Angka judul dihitung dari data kartu yang sama; bila data belum ada, judul menjadi kalimat keadaan ("Perkiraan dampak <span class="hl">menunggu</span> grid USGS").

Di dalam `.ex-bd`, tiap kelompok isi adalah wadah sendiri (memori bagian-dalam-kartu): putih, garis 1 px `--line`, sudut 14 px, padding 12 sampai 16 px, judul kecil huruf kapital di dalam padding, jarak 12 px. Tidak ada yang menempel ke tepi wadah. Tabel tunggal di `.ex-bd` menempel penuh (`.ex-tabel`).

### 2.2 Tabel inti

Tabel dari `/inti/tabel.css` (`.tw` + `table`, kepala navy `--brand`, teks putih, kepala rata tengah, `border-bottom` kepala `--accent`). Di dalam kartu: `.ex-tabel` agar menempel penuh. Aturan:

- Kepala memakai `title` untuk definisi kolom dan satuan; tidak ada baris keterangan di bawah tabel.
- Angka rata kanan, `.num`; teks rata kiri; label keyakinan rata tengah.
- Kolom sumber berdampingan (DIBI, Logbook, sistem kita) berurutan tetap, kolom terakhir "Selisih". Tidak ada kolom total gabungan (KA 7).
- Baris klik `tr.klik` membuka halaman rincian; sel aksi berupa ikon dengan `title`.
- Paginasi `.pgn` untuk lebih dari 50 baris; penyaring di `.tbar` (kotak cari pil, pemilih `.pc`).
- Sel tak ada data: pil `menunggu` kecil atau kata "tidak ada", bukan kosong.

### 2.3 Pil label keyakinan (enam nilai, KA 8)

Satu kelas `.sk-pil` dengan modifier `data-y`. Pil kecil (10 px, huruf kapital, `border-radius:999px`, tinggi 20 px) memuat ikon garis 12 px dan kata persis dari KA. Warna dari token, bukan hanya warna (ikon dan kata berbeda), latar `color-mix(... 14%, transparent)`, teks `color-mix(... 70%, var(--ink))`.

| `data-y` | Kata | Token | Ikon | `title` baku |
|---|---|---|---|---|
| `resmi` | resmi | `--ok` | centang dalam perisai | "Angka resmi dari penerbitnya. {sumber}, {waktu}" |
| `terverifikasi` | terverifikasi | `--info` | centang | "Sudah diperiksa petugas. {siapa}, {waktu}" |
| `estimasi-model` | estimasi model | `--brand2` | gelombang | "Hasil model, bukan angka resmi. Galat kalibrasi {x}" |
| `asumsi-kebijakan` | asumsi kebijakan | `--warn` | timbangan | "Memakai asumsi yang dipilih. {asumsi}" |
| `hipotesis` | hipotesis | `--f2` | tanda tanya dalam segitiga | "Belum lolos uji. Pembacaan sementara" |
| `menunggu` | menunggu | `--ink2` (abu) | jam pasir | "Masukan belum ada. {yang ditunggu}" |

Aturan tampil:

1. Tiap angka di kartu (judul, strip angka, sel tabel, titik grafik) punya satu pil, atau berbagi pil bila satu blok sepenuhnya satu label. Angka tanpa pil tidak lolos pemeriksaan layar.
2. Kamus 4 nilai `yakin` profil kemitraan ditampilkan lewat pemetaan KA 27b (`tinggi` dan `sedang` jadi `terverifikasi`, `rendah` jadi `estimasi-model`, `tidak` jadi `hipotesis`); tampilan tidak pernah menulis kata `yakin` mentah.
3. Keluaran F3 selalu `estimasi-model` sampai uji balik lolos (KA 9); keluaran F6 selalu `hipotesis` (KA 10). Model yang tidak lolos tetap tampil dengan pil yang jelas (KA 11).
4. Pil `hipotesis` dan `menunggu` memakai isi yang tidak berubah dengan tema; tidak ada pil hijau untuk angka model.

### 2.4 Pil fase

Dua keluarga, keduanya `.sk-fase` dengan `data-f` (ikon 14 px + kata, tinggi 24 px, tidak kecil seperti pil keyakinan sehingga tidak tertukar).

Fase kejadian (ALUR 2.1): `terdeteksi` abu `--ink2`, `terverifikasi` `--info`, `tanggap` `--bad`, `transisi` `--warn`, `pemulihan` `--brand2`, `selesai` `--ok`, `dibatalkan` abu dengan coretan tipis. Label bahasa Indonesia persis.

Fase siklus di pintu: Sebelum (pengurangan risiko), Siaga (kesiapsiagaan), Tanggap (tanggap darurat), Pulih (pascabencana). Masing-masing ikon sendiri, semua dengan warna `--brand2` kecuali Tanggap `--bad`. Fase yang sedang punya kejadian aktif diberi titik denyut kecil (dimatikan oleh `prefers-reduced-motion`).

Status objek lain (kaji, Jitupasna, R3P, renkon, gladi) memakai `.sk-fase` dengan token yang sama: awal abu, berjalan `--info`, perlu tindakan `--warn`, final `--ok`, ditarik atau kedaluwarsa `--bad`.

### 2.5 Pemilih bagian penuh lebar berikon

Semua deretan pilihan (segmen, sub-tab, pil penyaring, ringkasan status) memakai `.seg.penuh` dari `kartu.css`: lebar penuh wadah, tombol terbagi rata (`flex:1`), ikon di tiap tombol, `aria-pressed`, tanpa kelompok pil sempit di tengah (memori deretan-pilihan-ujung-ke-ujung; berlaku juga untuk pemilih kecil di dalam kartu). Warna status bermakna (hijau berjalan, kuning perlu tindakan, merah terlambat), label Indonesia. Di seluler deretan lebih dari 4 tombol menggulir mendatar di dalam wadah yang sama lebarnya, ikon tetap. Pemilih panjang (wilayah, jenis) memakai `.pc` (PilihCantik), ganda `.pc.pc-multi`; tombol Buka semua tidak dipakai.

### 2.6 Panel peta bisa ditarik

Layar dengan peta (paparan, kejadian, kaji) memakai pola `index.html`: `.panel` mengambang kiri 440 px di atas peta penuh, dengan pegangan `.tarik` (lebar 10 px, `cursor:col-resize`, ubah lebar 320 sampai 640 px, nilai diingat di `localStorage`). Di bawah 900 px pegangan hilang dan panel menjadi lembar bawah (`.panel` 46 persen tinggi, `.panel.min` 96 px) dengan pegangan `.tarik-v` di atas. Legenda `.ex-leg` mengikuti gaya `index.html` dan hanya menggambar kelas yang ada di data. Lapis peta dibuat satu kali; ganti zona hanya mengganti sumber GeoJSON, bukan membuat ulang peta.

### 2.7 Grafik interaktif bertooltip

Setiap grafik dan peta interaktif (memori selera-teks-grafik): garis panduan, titik sorot, dan tooltip `#tip` lewat atribut `data-tip` (`<b>judul</b><br>label: nilai`, dirapikan `rapikanTip`). Tooltip menampilkan nilai, pil keyakinan sebagai teks ("estimasi model"), dan selisih terhadap titik sebelumnya atau terhadap sumber lain. Implementasi rujukan: `grafik()` dan `sorotGrafik()` di `public/akademisi.js`. Grafik rentang (F3, F6) menggambar bilah `[bawah, atas]` dengan titik tengah tidak digambar sebagai angka tunggal. Sentuh di seluler: ketuk menahan tooltip, ketuk di luar menutup. Warna deret bergantian lewat `--brand2`, `--f2`, `--info`, `--ok`; tiga sumber dampak memakai tiga warna tetap di semua layar (DIBI `--brand2`, Logbook `--f2`, sistem kita `--ok`).

### 2.8 Komponen `.sk-*` baru (daftar lengkap, tidak boleh ditambah tanpa alasan)

| Kelas | Fungsi | Dipakai di |
|---|---|---|
| `.sk-wrap` | kolom isi, lebar maks 1280 px, tengah, jarak antarkartu 16 px, padding atas `--top` + 16 | semua |
| `.sk-pil` | pil keyakinan (2.3) | semua |
| `.sk-fase` | pil fase dan status (2.4) | semua |
| `.sk-ber` | blok angka sumber berdampingan: kolom per sumber, angka besar, nama sumber kecil, baris "selisih" di bawah | kejadian, kaji |
| `.sk-rentang` | bilah rentang bawah sampai atas dengan label dua ujung | kaji, masa depan, renkon |
| `.sk-garis` | linimasa tegak: titik, jam, kalimat, pelaku | kejadian/:id, gladi |
| `.sk-kead` | keadaan memuat (kerangka), kosong, galat, basi (2.9) | semua |
| `.sk-dummy` | dua ikon dummy (2.11), meniru `.sp-dummy` di `public/pipa/pipa.css` | semua |

Yang tidak dibuat ulang: strip angka memakai `.kpis`/`.cuaca4` yang ada; modal memakai `dialog.dlg`; lipat memakai `details.lipat`; paginasi `.pgn`; toast `.toast`.

### 2.9 Keadaan layar

Tiap kartu dan tiap layar punya empat keadaan; `.sk-kead` dengan `data-k`.

| Keadaan | Tampilan | Aksi |
|---|---|---|
| Memuat | kerangka abu berdenyut dengan bentuk isi akhir (baris tabel, bilah, peta abu); tidak ada spinner penuh layar; denyut mati di reduced-motion | tidak ada |
| Kosong | satu kalimat sebab ("Belum ada kejadian di wilayah ini pada rentang yang dipilih") dan satu tombol aksi ukuran normal | satu aksi (ubah rentang, buat kejadian) |
| Galat | kalimat manusiawi dari katalog galat ("Data belum bisa dimuat. Coba lagi sebentar lagi"), bukan kode | tombol Ulangi |
| Sumber basi | angka lama tetap tampil, pita kecil di kepala kartu "Terakhir diambil {jamWIB}", pil `menunggu` pada bagian yang baru (ALUR bagian 1) | tidak ada; tidak pernah dihapus atau diisi nol |

Keadaan tambahan: sesi staf habis menampilkan kartu "Masuk lagi untuk melanjutkan" dengan tombol Masuk; provinsi `terliput:false` menampilkan "tidak terliput"; jenis bencana tanpa mesin F3 menampilkan "belum ada perkiraan otomatis"; pemberitahuan luring (Jitupasna) pita "Tersimpan di HP, terkirim saat ada sinyal" dengan jumlah antrean.

### 2.10 Aturan INP

Standar `~/.claude/INP.md`: klik tidak boleh membekukan layar. Di repo ini bentuknya vanilla, rumah perkakasnya satu: `window.nanti(fn)` di `/inti/nanti.js` (dua rAF bersarang, jaring `setTimeout` 120 ms). Aturan untuk semua layar siklus:

1. **Chrome urgent, isi berat ditunda.** Pada klik segmen, tab, pemilih, sortir, atau paginasi, handler langsung mengubah chrome (`aria-pressed`, pil aktif, panah sortir, `aria-expanded`, nilai pemilih) dan memasang kerangka `.sk-kead[data-k=memuat]` di isinya; membangun tabel, memasang GeoJSON, atau menggambar grafik berat dipanggil lewat `nanti(() => ...)`. Tidak membungkus semua pembaruan dalam penundaan.
2. Tabel panjang digambar per halaman (50 baris) atau dipotong 200 baris pertama lalu sisanya bertahap, bukan sekaligus.
3. Fetch dimulai di handler tetapi tidak ditunggu sebelum chrome berubah; respons yang datang lambat dibuang bila pilihan sudah berganti (token permintaan).
4. Peta: ganti zona atau bahaya mengubah sumber lewat `nanti`, tidak membuat ulang peta; geser panel `.tarik` memakai `pointermove` dengan `requestAnimationFrame` dan tidak memicu penggambaran ulang tabel.
5. Pemilih ber-`href` (tautan antarlayar) mengubah penanda halaman dahulu, pindah halaman sesudahnya.
6. Modul layar dengan kontrol berchrome baru lolos `gerbang-inp-transisi` yang sama (kerja `penulis-gerbang` bila gerbangnya perlu diperluas ke `public/siklus/**`); pemeriksa `inp-reviewer` memeriksa tiap layar sebelum dianggap selesai.

### 2.11 Tombol dummy dua ikon (DUMMY.md)

Di tiap halaman `/siklus/*`, di kepala `header.top` sebelum tombol tema, Super Admin saja (`superOK`; staf lain tidak melihatnya dan DOM-nya tidak dibuat). Dua ikon polos `.sk-dummy`, 40 px, `title` dan `aria-label`:

| Ikon | Kerja |
|---|---|
| tabung uji | isi data dummy untuk HALAMAN yang sedang dibuka (periode, wilayah, kejadian yang terpampang) |
| sapu | hapus SELURUH baris dummy dari modul siklus, dari halaman mana pun |

Aturan: isi mengikuti kejadian yang sedang dibuka dan rentang yang terpampang; gerbang "sudah ada" menghitung baris dummy yang masih hidup; angka lahir dari rantai sungguhan (ID `KJ-`, paparan, rentang, harga satuan), bukan konstanta; tiap ember status terisi minimal satu; semua kartu layar ikut berangka; tombol segera berubah keadaan (`aria-busy`, denyut) lalu mengisi lewat `nanti`; sesudah selesai layar muat ulang kartu dan menampilkan toast "N baris dummy dibuat" (jumlah nyata dari rute). Baris dummy punya kolom `dummy` (KA bagian B), diberi pil kecil "contoh" di tabel, dan tidak terlihat oleh staf nyata. Rute dan penghapusan milik `warga-api`; layar hanya memanggil dan menampilkan hasilnya.

## 3. Wireframe per layar

Konvensi: `[ ]` kartu `.ex.ex-std`; `{ }` kontrol; `(pil)` pil keyakinan. Desktop memakai `.sk-wrap` maks 1280; seluler 390 satu kolom, padding 16, target sentuh minimal 44 px, tanpa gulir mendatar kecuali tabel di `.tw`. Semua layar: kepala `header.top`, tombol dummy SA di kepala, empat keadaan 2.9, dan aturan INP 2.10 (ganti segmen, pemilih, atau sortir: chrome urgent, isi berat lewat `nanti`, tabel 50 baris per halaman). Bagian "Dummy" di tiap layar menyebut isi tombol isi untuk halaman itu.

### 3.1 `/siklus` (pintu per fase dan peran, F7)

Tujuan: satu pintu; pengguna melihat empat fase dan kartu menuju layar yang hidup untuk perannya.

```
[ SIKLUS | <n> kejadian aktif, <k> sedang tanggap, <p> menunggu PDNA ]  strip 4 angka (aktif, tanggap, pemulihan, renkon kedaluwarsa) (pil)
{Sebelum | Siaga | Tanggap | Pulih}      <- .seg.penuh berikon
[ kartu pintu fase terpilih, grid 2x2 ]
[ Kejadian aktif: 8 baris + Buka semua ]  [ Pengingat: batas PDNA, renkon di bawah 90 hari ]
[ Tanya jawab asisten ]
```
Seluler: segmen empat ikon, kartu bertumpuk. Fase awal otomatis Tanggap bila ada kejadian `tanggap`, selain itu Sebelum. Peta kartu: Sebelum ke `/siklus/paparan` dan `/siklus/masa-depan`; Siaga ke `/siklus/renkon` dan `/siklus/gladi`; Tanggap ke `/siklus/kejadian`, `/siklus/kaji`, `/semua`; Pulih ke `/siklus/pulih`. Kartu menuju layar yang belum hidup tidak tampil. Per peran: WG kartu publik saja; BP wilayahnya; PD, KO, PM, SA penuh; peran tertulis kecil di kepala kartu. Jawaban asisten memuat label keyakinan dan nama alat sumber. Kosong: "tidak ada kejadian aktif" + "Buka kejadian arsip". Dummy: tiga kejadian berfase beda dan satu renkon kedaluwarsa.

### 3.2 `/siklus/kejadian` (daftar Buku Besar, F1)

```
[ KEJADIAN | <n> kejadian pada rentang ini, <a> belum terpetakan wilayahnya ]
{Semua | Banjir | Gempa | Karhutla | Gunung api | Cuaca | Lainnya}  <- .seg.penuh
{Fase .pc-multi} {Wilayah .pc} {7 hari | 30 hari | 1 tahun | semua} {cari}
[ tabel: KJ | Jenis | Wilayah | Mulai | Fase | Korban DIBI | Korban Logbook | Selisih ]  {paginasi}
[ Antrean ambigu (PD, KO): per kasus pilihan kandidat .seg.penuh + Buat baru ]
```
Seluler: tabel jadi kartu kecil, penyaring di lembar bawah. Korban per sumber berdampingan dengan kolom Selisih, tanpa total (KA 7). Tanpa laporan: "belum ada laporan". Tanpa wilayah BPS: "wilayah belum terpetakan" (menunggu). Menggabungkan dua `KJ-` berfase beda ditolak dengan pesan baku. Karhutla hanya angka sistem kita. Klik baris ke `:id`. Dummy: kejadian tiap fase dan jenis, dua kasus ambigu, satu tanpa wilayah.

### 3.3 `/siklus/kejadian/:id` (linimasa satu halaman, F1)

Tujuan: riwayat satu `KJ-` dari peringatan sampai pulih. WG hanya melihat Ringkasan resmi.

```
[ KJ-<id> | <jenis> di <wilayah>, <n> jiwa menurut DIBI, <m> menurut Logbook, selisih <d> ]
fase (.sk-fase) {Naikkan} {Mundur} (KO)   {Ringkasan | Waktu | Dampak | Paparan | Kaji | Pulih} <- anker .seg.penuh
kiri 8 kolom                         | kanan 4 kolom
[ Ringkasan resmi ]                  [ Peta kejadian ]
[ Garis waktu .sk-garis ]            [ Sumber terpasang ]
[ Dampak per sumber .sk-ber ]
[ Paparan ] [ Kaji cepat ] [ Pemulihan ]   (staf)
```
Satu halaman bergulir, bukan tab (`scroll-margin-top` = `--top` + 12). Seluler: satu kolom, peta 220 px di bawah ringkasan. Ringkasan: paragraf rata kanan-kiri, pengenal luar GLIDE, GDACS, USGS sebagai teks, nomor induk resmi "tidak ada" (menunggu, U14), tanpa nama korban. Garis waktu: jam WIB, kalimat, pelaku, terbaru di atas, `data-tip` per titik. Dampak: tiga kolom DIBI, Logbook, sistem kita beserta pil, baris selisih, tabel per jenis dampak. Paparan: tiga sumber jiwa berdampingan, "tidak terliput" bila tanpa grid. Kaji: `.sk-rentang` (estimasi model) berdampingan dengan hasil petugas, atau "belum ada perkiraan otomatis". Pemulihan: ringkasan dan tautan `/siklus/pulih/:id`, atau "Jitupasna belum dibuka". Mundur, batal, dan tutup wajib alasan. Satu kartu gagal tidak mengosongkan halaman. Naikkan fase: pil berganti seketika, tulis dan muat ulang garis waktu lewat `nanti`; peta dimuat sesudah kartu atas tercat. Dummy: satu kejadian lengkap (garis waktu, tiga sumber berselisih, paparan, kaji, Jitupasna).

### 3.4 `/siklus/paparan` (Peta Paparan, F2)

Tujuan: bangunan, fasilitas vital, dan jiwa per zona bahaya; agregat per desa dan kecamatan. Rincian per bangunan hanya setelah masuk lewat rute berkunci.

```
peta penuh; .panel kiri 440 bisa ditarik (.tarik)
{Wilayah .pc}  {Banjir | Gempa | Gunung api | Karhutla | Pesisir}  {Semua kelas | Sedang | Tinggi}  <- .seg.penuh
[ <n> bangunan dan <j> jiwa berada di zona <kelas> ]
[ Bangunan: jumlah, luas jejak (estimasi model; ambang 0,70 di title) ]
[ Jiwa: WorldPop | Dukcapil | GHSL berdampingan .sk-ber ]
[ Fasilitas vital per kategori InaRISK ]   [ Desa teratas 10 baris ]     legenda .ex-leg
```
Seluler: lembar bawah 46 persen, pegangan `.tarik-v`. Kelas bahaya batas 0,33 dan 0,66 berpil asumsi kebijakan dengan title "sumber resmi batas tidak ditemukan" (U12). Kesehatan berpil estimasi model; sumber gagal: "cakupan terbatas". Provinsi tanpa grid: panel bangunan jadi "tidak terliput". Tinggi dan jenis bangunan "tidak diketahui". Rincian: tombol ikon hanya dengan sesi; tanpa sesi "Masuk untuk melihat rincian". Ganti bahaya: segmen urgent, sumber GeoJSON diganti lewat `nanti`; zoom tidak memicu fetch tabel. Dummy: paparan satu provinsi bergrid dan satu tanpa grid.

### 3.5 `/siklus/kaji` (daftar Kaji Cepat, F3)

```
[ KAJI CEPAT | <n> kejadian punya perkiraan dalam <j> jam, <m> menunggu data ]
{Semua | Menunggu data | Dihitung | Diperiksa | Dipakai | Ditarik}  <- .seg.penuh   {Jenis} {Rentang}
[ tabel: KJ | Jenis | Wilayah | Status | Korban jiwa (rentang) (pil) | Rumah rusak ]
```
Seluler: kartu per kejadian dengan rentang satu baris. Rentang `{bawah} sampai {atas}` (estimasi model); rumah rusak gempa "menunggu" (tanpa kurva resmi). Klik baris ke `/siklus/kaji/:id`. Dummy: gempa arsip, banjir aktif, satu `menunggu_data`.

### 3.6 `/siklus/kaji/:id` (Kaji Cepat satu kejadian, F3)

```
[ KAJI | korban jiwa diperkirakan <a> sampai <b>, rumah rusak menunggu ] (estimasi model)
status .sk-fase {Diperiksa} {Dipakai} {Tarik} (PD, KO)
kiri 7 kolom                              | kanan 5 kolom
[ Rentang per metrik .sk-rentang ]        [ Peta MMI atau poligon banjir ]
[ Dasar model: PAGER dan ITB berdampingan ]
[ Galat kalibrasi ]   [ Bandingkan dengan petugas (meja kaji_cepat) ]
```
Dua ujung selalu tampil, tidak ada angka tunggal; hanya jumlah jiwa, bukan registri orang. Galat: "kalibrasi 3,06, faktor LOO 5,34, model dapat meleset sampai 5 kali" dengan pil hipotesis bila uji balik belum lolos. Banjir tanpa kedalaman: "kedalaman belum tersedia", poligon dikali paparan sebagai batas atas. `menunggu_data`: "Menunggu grid USGS" dengan jam ambil terakhir; gagal ambil tidak pernah nol. Model dan petugas berdampingan dengan selisih, tidak digabung. Status: pil berganti seketika, muat ulang lewat `nanti`. Dummy: gempa M7,8, banjir, dan satu `menunggu_data`.

### 3.7 `/siklus/pulih` (daftar Jitupasna dan R3P, F4)

```
[ PULIH | <n> Jitupasna berjalan, <m> R3P menunggu tanda setuju, <h> hari ke batas 90 ]
{Jitupasna | R3P | Pelaksanaan} <- .seg.penuh   {Status .pc-multi} {Wilayah .pc}
[ tabel: KJ | Wilayah | Status | Kerusakan | Kerugian | Hari tersisa | Setuju ]   [ Pengingat ]
```
Seluler: kartu per kejadian. Nilai berpil asumsi kebijakan (U4, U8); harga kosong membuat nilai "menunggu", bukan nol. Hari tersisa adalah pengingat, bukan penolakan. BP menulis hanya wilayahnya. Dummy: Jitupasna lima sektor pada kejadian arsip dan satu draf R3P.

### 3.8 `/siklus/pulih/:id` (Jitupasna dan R3P satu kejadian, F4)

```
[ PULIH | kerusakan dan kerugian <Rp x> dari <n> unit rusak, draf R3P <draf> ]
{Jitupasna | Draf R3P | Pelaksanaan} <- .seg.penuh   status .sk-fase  {Hitung} {Tinjau} {Final} (KO)  {Setuju internal} (PM)
[ Isian lapangan: sektor x tingkat RB, RS, RR, hancur total ]
[ Harga satuan per tingkat ]   [ Nilai kerusakan dan kerugian + pemeriksaan hitung ganda ]
[ Draf R3P: lima sektor Pasal 8 ]   [ Pelaksanaan ]   [ Daftar periksa hibah RR ]
```
Seluler: formulir satu kolom per sektor, tombol 48 px, pita luring dengan jumlah antrean (IndexedDB, pola `public/pipa/antre.js`, idempoten). Rumah rusak dari `rumah_rusak`, tanpa identitas pemilik. Harga: tingkat, harga, dokumen, tahun, pil asumsi kebijakan; IKK atau IHPB hanya dalam tahun yang sama. Pemeriksaan gagal ditandai, angka tidak disembunyikan. Draf: penanda tetap "DRAF, bukan dokumen resmi"; "tanda setuju internal"; nomor keputusan resmi diisi teks staf; unduh berkop untuk staf. Tarif stimulan 60/30/15 juta dengan title "sumber sekunder, teks Juklak 5/2024 belum ditemukan". Pelaksanaan: target, realisasi, status, bilah; cair tidak melebihi tahap sebelumnya; `macet` berpita kuning. Final mengunci kontrol ("ubah lewat versi baru"). Simpan sel: pil "tersimpan" seketika, hitung ulang lewat `nanti`. Dummy: isian lima sektor, harga contoh berlabel asumsi, draf R3P, dua kegiatan (satu macet).

### 3.9 `/siklus/renkon` (daftar Renkon, F5)

```
[ RENKON | <n> berlaku, <m> kedaluwarsa, <k> berakhir dalam 90 hari ]
{Semua | Persiapan | Berlaku | Kedaluwarsa | Dimutakhirkan} <- .seg.penuh   {Bencana} {Wilayah}
[ tabel: Judul | Bencana | Wilayah | Status | Berlaku sampai | Hari tersisa | Kesenjangan ]  [ Usulan tinjau ]
```
Hari tersisa dibaca saat halaman dibuka (bukan kueri pindai cron); kedaluwarsa berpil merah. Kesenjangan: "stok belum tercatat" bila LogPal kosong. Ejaan "kontingensi". Seluler: kartu dengan hari tersisa berwarna. Dummy: tiga renkon (berlaku, mendekati batas, kedaluwarsa) dan satu usulan tinjau.

### 3.10 `/siklus/renkon/:id` (satu Renkon, F5)

```
[ RENKON | asumsi dampak <n> jiwa, kesenjangan <x>, sisa berlaku <h> hari ]
status .sk-fase   {Asumsi | Kerangka respon | Kesenjangan | Riwayat} <- .seg.penuh
[ Asumsi dampak lima aspek ]   [ Usulan dari data: sekarang, usulan, sumber {Terima}{Ubah}{Tolak} ]
[ Kebutuhan dasar Perka 7/2008 ]   [ Kesenjangan: kebutuhan, stok LogPal, personel /petugas, selisih ]
```
Usulan tidak menimpa; tiap baris tercatat dengan pelaku. Kebutuhan dasar berpil asumsi kebijakan, Sphere sebagai kolom pembanding (U9). Stok dibaca langsung, tidak disalin. Revisi dari gladi membuat versi `dimutakhirkan`. Daftar klaster tidak diciptakan. Dummy: renkon dengan usulan terbuka dan kesenjangan berangka.

### 3.11 `/siklus/gladi` (Gladi, F5)

```
[ GLADI | <n> gladi, <m> rekomendasi belum tertaut ke renkon ]
{Ruang | Posko | Lapang}   {Dirancang | Siap | Berjalan | Dievaluasi | Selesai}  <- dua .seg.penuh
[ Rancang: renkon + kejadian arsip F1 -> {Susun skenario} ]   [ Skenario .sk-garis injeksi ]
[ Matriks masalah dan rekomendasi ]   [ Kerangka Juklak 4/2026: Direktif, RGB, ROL ]
```
Seluler: satu kolom, injeksi saat ini besar, tombol Lanjut 48 px. Label tetap "Putar ulang kejadian arsip, bukan simulasi dan bukan prakiraan"; replay Maret 2025 berpil hipotesis, "Model sederhana, bukan prakiraan" (NC). Posko tanpa juklak sendiri; dokumen "bukan dokumen resmi"; `selesai` hanya bila rekomendasi tertaut renkon. Dummy: satu gladi tiap jenis dengan dua rekomendasi.

### 3.12 `/siklus/masa-depan` (Risiko Masa Depan, F6)

```
[ MASA DEPAN | curah hujan maksimum 5 hari <naik/turun> <x> persen pada 2050 di <kabupaten> ] (hipotesis)
{2030 | 2050}  {SSP, empat skenario penuh lebar}  {Wilayah .pc}
kiri 8 kolom                         | kanan 4 kolom
[ Selisih terhadap dasar: rentang antar model ]   [ Peta pertumbuhan paparan ]
[ Muka laut 17 sampai 83 persen ]  [ Bangunan tumbuh di zona bahaya ]  [ Tata ruang ]
```
Seluler: satu kolom, segmen horizon dan SSP dua baris penuh lebar. Pil hipotesis di tiap kartu tidak bisa disembunyikan; kata "sinyal", bukan "akan terjadi"; tidak ada angka tunggal, tooltip menyebut jumlah model. Tiga indeks (Rx1day, Rx5day, CDD) lewat pemilih ganda. Muka laut: "penurunan muka tanah pesisir tidak dihitung". Bangunan tumbuh hanya bila GHSL ada (kalau belum, kartu tidak tampil); epoch 2025 dan 2030 bertanda model. RTRW: "tidak ada sumber otomatis" (menunggu). Sebelum NEX-GDDP teruji: seluruh layar "menunggu". WG hanya ringkasan berpil hipotesis. Berkas per provinsi dibaca sekali dan disimpan. Dummy: satu provinsi, dua skenario, semua hipotesis.

## 4. Teks baku dan daftar periksa

| Kunci | Teks |
|---|---|
| kosong | Belum ada data pada rentang ini |
| menunggu | Menunggu {masukan}. Terakhir diambil {jamWIB} |
| galat | Data belum bisa dimuat. Coba lagi sebentar lagi |
| sesi | Masuk lagi untuk melanjutkan |
| selisih | {sumberA} {a}, {sumberB} {b}, selisih {d} |
| setuju | Tanda setuju internal, tidak menggantikan dokumen resmi |

Layar selesai bila: kepala bersama dan token saja (tanpa `#hex`, nama lama situs, U+00B7, em dash); kartu `.ex.ex-std` berjudul temuan tanpa kaki sumber; tiap angka berpil keyakinan dan tanpa nol palsu; deretan pilihan penuh lebar berikon; grafik bertooltip; empat keadaan; 1440 dan 390 dicek di peramban; chrome urgent; dummy mengisi semua kartu; paparan rinci tidak di `public/`. Pemeriksa setelah pengerja: `selera-angka`, `inp-reviewer`, `validasi-model` (F3, F6), `guard-api` bila menyentuh rute.
