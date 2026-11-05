# DESIGN-SYSTEM Ruang Unit BNPB: `/bnpb/unit` dan layar sistem F1, F2

Versi 1, 5 Nov 2026. Dokumen keempat dalam urutan otoritas `KEPUTUSAN-AWAL.md`: kalah dari
`KEPUTUSAN-UNIT.md` (bila sudah ada), `KEPUTUSAN-AWAL.md`, dan `PRD.md`; menang atas
`DESAIN-TEKNIS.md`, `RENCANA-UJI.md`, dan `TIKET.md` untuk semua hal rupa: token, komponen,
tata letak, keadaan layar, dan kalimat antarmuka.

Aturan induknya satu: **Ruang Unit meniru `/bnpb/*` yang sudah ada dan kartu laporan standar
`.ex.ex-std`** (AGENTS.md §3.5, `public/inti/kartu.css`). Tidak ada palet baru. Komponen baru
hanya yang tercantum di §5, semuanya di satu berkas `public/bnpb/unit/unit.css` berawalan
kelas `un-`. Bila sebuah layar butuh sesuatu yang tidak tertulis di sini, pengerja berhenti
dan bertanya (aturan berhenti AGENTS.md §2.1), tidak menambah token sendiri.

Rujukan `berkas:baris` di bawah dicek ke repo 5 Nov 2026. Nama sistem (PERB-1 dan seterusnya)
mengikuti katalog `KEPUTUSAN-AWAL.md` §5.1; isi teknis tiap sistem ada di `riset/1-6` dan
tidak disalin ulang di sini, kecuali yang menentukan rupa layar.

---

## 1. Prinsip rupa

1. **Pakai yang ada, jangan salin.** Kepala halaman `.ad-top`, tabel `.ad-tabel`, tab
   `.ad-tabs`, tombol `.ad-tombol` dari `public/admin/admin.css`; kerangka `/bnpb` dari
   `public/bnpb/bnpb.css`; kartu, tooltip, pemilih, paginasi dari `public/inti/kartu.css`.
   Berkas `unit.css` hanya berisi §5.
2. **Satu sistem, satu kartu `.ex.ex-std`.** Tiap bagian layar adalah satu kartu: pil
   kategori `.ex-ey`, judul berupa kalimat temuan dengan angka disorot `.hl`, isi. Tanpa
   kaki keterangan atau sumber (`.ex-ft` dilarang, gerbang `tests/agen/gerbang-kartu-std.test.mjs`).
   Tombol atau pemilih bagian di kanan judul. Tanpa kepala bagian buatan sendiri.
3. **Tiap angka membawa label, tanggal, dan asalnya** (KEPUTUSAN-AWAL §3 butir 3). Karena kaki
   kartu dilarang, ketiganya pindah ke baris pil di kepala kartu: pil label sumber `.un-lbl`
   (resmi, sekunder, hitungan, proksi, asumsi) dan pil tanggal `.un-per`. Asal rinci, rumus,
   dan pasal muncul di tooltip saat pil diketuk atau disorot (§5.1). Angka hitungan kita tidak
   pernah tampil tanpa pil `hitungan` atau `proksi`.
4. **Tiap ambang dan tenggat membawa pasalnya.** Pil jam tenggat `.un-jam` menyimpan acuan
   pasal di tooltip. Ambang tanpa pasal tampil dengan pil `asumsi`.
5. **Warna tidak pernah satu-satunya pembawa makna.** Tiap status punya kata dan ikon; warna
   hanya penguat.
6. **Terisi sendiri dulu.** Layar dirancang untuk data otomatis. Isian manusia hanya tombol
   satu ketuk (Setujui, Tolak, Benar) atau koreksi satu kolom; tidak ada form panjang.
7. **Grafik dan peta selalu interaktif.** Sorot atau ketuk memunculkan garis bantu, titik
   tersorot, dan tooltip berisi nilai serta perubahan dari titik sebelumnya. Grafik statis
   tidak cukup.
8. **Chrome dulu, isi kemudian.** Handler klik mengubah tampilan kontrolnya sendiri seketika,
   kerja berat lewat `nanti()` (`public/inti/nanti.js`).

## 2. Peta sumber token dan komponen

| Kelompok | Berkas dan baris | Dipakai untuk |
| --- | --- | --- |
| Token warna hex terang | `public/admin/admin.css:4-8` | `--paper --card --surface --ink --ink2 --ink3 --line --soft --navy --navy2 --emas --c1`-`--c8 --gradien --ring --bayang --font --display` |
| Token warna gelap | `public/admin/admin.css:9-12` | sama, mode gelap otomatis dan `data-theme="dark"` |
| Token tema oklch | `public/inti/tema.css:2-24` | `--brand --brand2 --ok --warn --bad --info --shadow --shadow-lg --r --r-sm` (dibutuhkan `.pc` dan fallback kartu; lihat §3) |
| Dasar halaman admin | `public/admin/admin.css:13-20` | `body` 14px, `h1-h3` Plus Jakarta Sans, `.ad-galat` |
| Kepala halaman navy | `public/admin/admin.css:22-34`, `:333-335` | `.ad-top`, `.ad-logo`, `.ad-sep`, `.ad-sep.staf`, `.ad-staf-nama`, `.ad-keluar` |
| Tab penuh lebar | `public/admin/admin.css:102-108`, `:207` | `.ad-tabs` (deretan pilihan terbagi rata) |
| Tombol dan chip | `public/admin/admin.css:89-100` | `.ad-tombol`, `.ad-tombol.utama`, `.ad-tombol.kecil`, `.ad-chip` |
| Spanduk peringatan | `public/admin/admin.css:110` | `.ad-spanduk` (data basi, pratinjau) |
| Grafik dan legenda admin | `public/admin/admin.css:139-145`, `:300-303` | `.ad-grafik`, `.ad-leg`, garis bantu `.ad-hov`, `.ad-tip` |
| Keadaan kosong dan hantu | `public/admin/admin.css:157`, `:310-318`, `:320-322` | `.ad-kosong`, `.ad-hantu`, `.ad-peta-kosong` |
| Tabel kepala biru tua, mode kartu HP | `public/admin/admin.css:181-204` | `.ad-tabel-wadah`, `.ad-tabel`, `.n`, `.w`, `.a`, `td[data-label]` |
| Kerangka `/bnpb` | `public/bnpb/bnpb.css:6-9` | `.bn-wrap`, `.bn-judul`, `.bn-aksi` |
| Kartu kecil, pil berikon | `public/bnpb/bnpb.css:12-24` | `.bn-grid`, `.bn-kartu`, `.bn-pil` + `--pil` |
| Tombol besar, pesan | `public/bnpb/bnpb.css:40-47` | `.bn-tombol`, `.bn-pesan.ok`, `.bn-pesan.galat` |
| Alur status | `public/bnpb/bnpb.css:49-53` | `.bn-alur` (tahapan MB-7, kaji cepat) |
| Kepala tabel bisa diurut | `public/bnpb/bnpb.css:58` | `.kb-tabel .ad-tabel th button` |
| Pintu kartu tautan | `public/bnpb/pintu.css:2-19` | `.pt-grid`, `.pt-kartu`, `.pt-panah`, `.pt-angka` |
| Kartu laporan standar | `public/inti/kartu.css:87-101` | `.ex.ex-std`, `.ex-hd`, `.ex-ey`, `.ex-jd`, `.hl`, `.ex-bd`, `.ex-tabel` |
| Kepala kartu navy | `public/inti/kartu.css:105-109` | `.ex-hd` latar `#0b2545`, `.hl` `#ffab7a` |
| Baris pil kepala, ubin ikon | `public/inti/kartu.css:111-120` | `.ex-pl`, `.ex-ik`, `.ex-tk` |
| Pemilih kustom | `public/inti/kartu.css:50-71`, `public/inti/pilih.js` | `.pc`, `.pc-btn`, `.pc-menu`, `.pc-cari`, `PilihCantik` |
| Tooltip | `public/inti/kartu.css:21-49`, `public/inti/tip.js:9-29` | `#tip`, `.tp2-*`, `rapikanTip`, `pasangTip` |
| Paginasi | `public/inti/kartu.css:72-79`, `public/inti/tabel.js:4-12` | `.pgn`, `paginasi()` |
| Legenda | `public/inti/kartu.css:18-20` | `.ex-leg` |
| Format angka dan waktu | `public/inti/format.js:4-16` | `$`, `fmt`, `esc`, `escUrl`, `jamWIB`, `fmt.durasi` |
| Tunda kerja berat | `public/inti/nanti.js` | `nanti()` |
| Fokus, teks layar-baca | `public/inti/gaya.css:6-7` | nilai disalin ke `unit.css` karena `gaya.css` tidak dimuat di `/bnpb` |
| Grafik garis dan batang bertooltip | `public/bnpb/kinerja.js:16-60`, `public/bnpb/kinerja.css:15-28` | pola `garis()`, `batang()`, area sentuh `.kj-kena`, `data-tip` |
| Paragraf rata kiri-kanan | `public/bnpb/kinerja.css:7` | pola `.kj-p` (`text-align:justify; hyphens:auto`) |
| Pil label kinerja yang sudah ada | `public/bnpb/kinerja.css:10`, `public/bnpb/kinerja.js:6`, `:65` | asal arti `resmi` dan `hitung`; ikon `resmi`, `hitung` |
| Peta SVG choropleth per provinsi | `public/bnpb/risiko.js:72-82`, `public/bnpb/risiko.css:15-18` | pola `.rk-svg`, kelas `.k0`-`.k3` |
| Ikon garis | `public/bnpb/pintu.js:6-20`, `public/bnpb/wilayah.js` | path ikon unit dan bahaya |
| Kartu masuk staf | `public/bnpb/dalops.js:81-85` | pola layar 401 dan 403 |
| Kartu bagian standar | `public/bnpb/dalops.js:107-115` | pola fungsi `bagian(id, ikon, kategori, judul, ...isi)` |
| Ikon polos tanpa bingkai | `public/bnpb/dalops.css:216-217` | pola `.dl-ikon` sesudah perbaikan 3 Nov 2026 |
| Huruf web | `public/bnpb/dalops.html:12` | Google Fonts Inter 400-700, Plus Jakarta Sans 600-800 |

## 3. Urutan muat dan cangkang halaman

Semua halaman Ruang Unit memakai kerangka statis `/bnpb/*` (pola `public/bnpb/dalops.html` dan
`public/bnpb/kinerja.html`), bukan cangkang `src/admin_halaman.js`:

```html
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#0b2545">
<title>Ruang Unit, Centurisk97</title>              <!-- koma, bukan titik tengah -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<link href="/inti/tema.css" rel="stylesheet">        <!-- 1. token oklch: --brand2, --bad, --shadow -->
<link href="/bnpb/bnpb.css" rel="stylesheet">        <!-- 2. menimpa token dasar dengan hex admin -->
<link href="/inti/kartu.css?v=2" rel="stylesheet">   <!-- 3. kartu .ex-std, .pc, #tip, .pgn -->
<link href="/bnpb/unit/unit.css?v=1" rel="stylesheet"><!-- 4. hanya komponen §5 -->
...
<header class="ad-top">logo Centurisk97, <span class="ad-sep staf">Ruang Unit</span></header>
<main class="bn-wrap" id="app"><p class="bn-pesan" role="status">Memeriksa akses…</p></main>
<div id="tip" role="tooltip"></div>
<script src="/inti/format.js"></script> <script src="/inti/tip.js"></script>
<script src="/inti/tabel.js"></script>  <script src="/inti/nanti.js"></script>
<script src="/inti/pilih.js"></script>  <script src="/bnpb/unit/unit.js?v=1"></script>
```

- `tema.css` dimuat **sebelum** `bnpb.css`. Tanpa itu `.pc` dan fallback kartu kehilangan
  `--brand2` dan `--shadow`, yang tidak ada di `admin.css` (lihat Catatan butir 3).
- Tanpa skrip atau gaya inline, tanpa atribut `style=` (CSP). Lebar batang diset lewat
  `el.style.setProperty("--w", ...)` di JS.
- Kepala halaman: `.ad-top` navy (`--gradien`, `admin.css:6`, `:23`) seperti semua `/bnpb/*`.
  Sub-nav kelompok unit memakai menu Ruang Koordinasi yang sudah ada di kepala; tidak ada
  menu buatan Ruang Unit di kepala.

## 4. Token yang dipakai

### 4.1 Warna dasar (nilai persis)

| Token | Terang (`admin.css:4-5`) | Gelap (`admin.css:9`) | Dipakai untuk |
| --- | --- | --- | --- |
| `--paper` | `#f5f7fb` | `#0b1220` | latar halaman |
| `--card` | `#fff` | `#131c30` | isi kartu, tabel |
| `--surface` | `#edf2f8` | `#1a2540` | latar kontrol, hantu |
| `--ink` | `#0b2545` | `#eef1f7` | teks utama |
| `--ink2` | `#5b6782` | `#aab4c8` | teks kedua, label kolom HP |
| `--ink3` | `#8a93a8` | `#7c879e` | belum ada data, ditunda |
| `--line` | `#e3e7ef` | `#26314a` | garis |
| `--navy` | `#0b2545` | sama | kepala kartu (dipaku `#0b2545`, `kartu.css:105`) |
| `--navy2` | `#1d4e89` | sama | ujung terang `--gradien` |
| `--emas` | `#c9a227` | sama | cincin tab aktif, garis bawah kepala tabel |
| `--c1` | `#c9503a` | sama | merah: lewat tenggat, kurang, konflik |
| `--c2` | `#e58a45` | sama | jingga: proksi |
| `--c3` | `#e3b94e` | sama | kuning: segera habis, hitungan kita |
| `--c4` | `#5a9e74` | sama | hijau: berlaku, cukup, resmi, tayang |
| `--c5` | `#4f8fc4` | sama | biru: tautan, sekunder, info |
| `--c6` | `#5f6fb0` | sama | nila: asumsi |
| `--c7` | `#2b8c86` | sama | hijau laut: ruas grafik kedua |
| `--c8` | `#7a2b2b` | sama | marun: perbaikan F0 |
| `.hl` di kepala navy | `#ffab7a` (`kartu.css:108`) | sama | angka temuan di judul kartu |

`--gradien` = `linear-gradient(135deg,var(--navy2),var(--navy))` (`admin.css:6`): kepala
halaman, kepala tabel, tab aktif, tombol utama.

### 4.2 Arti semantik (satu arti, satu token)

| Arti | Token | Kata wajib | Ikon (§6) |
| --- | --- | --- | --- |
| Berlaku, cukup, tepat waktu, sudah tayang | `--c4` | Berlaku, Cukup, Tepat waktu, Tayang | `cek` |
| Segera habis, perlu perhatian, sedang disiapkan | `--c3` | Segera habis, Perlu reviu, Disiapkan | `jam` |
| Lewat tenggat, kurang, konflik, selisih besar | `--c1` | Lewat N hari, Kurang, Konflik | `seru` |
| Belum ada data, belum dilaporkan, ditunda | `--ink3` | Belum ada data, Belum dilaporkan, Ditunda | `kosong` |
| Info, sumber sekunder, tautan | `--c5` | sesuai konteks | `info` |

Pola ini mengikuti aturan deretan status pemilik: aktif hijau, selesai atau tidak aktif abu,
disiapkan kuning, gagal atau lewat merah, berlabel bahasa Indonesia.

### 4.3 Tipografi

| Unsur | Nilai | Sumber |
| --- | --- | --- |
| Isi halaman | Inter 14px/1.5 | `admin.css:14` |
| Judul halaman `h1` | Plus Jakarta Sans 800 22px (HP 19px) | `bnpb.css:8`, `:55` |
| Judul kartu `.ex-jd>h3` | 800 21px/1.3 (HP 18px) | `kartu.css:93`, `:101` |
| Pil kategori `.ex-ey` | 800 10px kapital, jarak huruf .08em | `kartu.css:89` |
| Kepala tabel | 800 10.5px kapital, .09em, putih, rata tengah | `admin.css:185` |
| Sel tabel | 12.5px; angka `.n` tabular 700 rata tengah | `admin.css:183`, `:191` |
| Tab | 700 13px, tinggi 40px | `admin.css:104` |
| Pil `.bn-pil` | 700 12px | `bnpb.css:22` |
| Tooltip | 12px/1.4; angka besar 20px | `kartu.css:21`, `:33` |
| Paragraf metode | 13.5px rata kiri-kanan, `hyphens:auto` | `kinerja.css:7` |
| Angka besar (hanya pintu) | 800 28px (HP 24px) | `bnpb.css:18`, `:55` |

Angka di tabel, pil, dan tooltip selalu `font-variant-numeric:tabular-nums`.

### 4.4 Spasi, radius, bayangan, titik patah

| Unsur | Nilai | Sumber |
| --- | --- | --- |
| Wadah halaman | maks 1440px, padding 20px 24px 48px (HP 14px 16px 40px) | `bnpb.css:6`, `:55` |
| Jarak antarkartu | 14px | `bnpb.css:12` |
| Kepala kartu | padding 18px 22px 14px (HP 14px 16px 12px) | `kartu.css:88`, `:101` |
| Isi kartu | padding 16px 22px 12px, gap 14px; tabel tunggal 0 | `kartu.css:95-96` |
| Radius kartu | 18px | `kartu.css:87` |
| Radius kartu kecil, tabel | 16px | `bnpb.css:16`, `admin.css:182` |
| Radius tombol | 12px; kecil 10px; pil 999px | `admin.css:93`, `:96` |
| Bayangan | `--bayang` | `admin.css:7` |
| Titik patah | 900 (KPI dua kolom), 640 (tabel jadi kartu, padding kartu), 560 (tab menumpuk, kepala membungkus), 420 (pintu satu kolom) | `admin.css:194`, `:206-207`, `kartu.css:101`, `pintu.css:15` |

### 4.5 Kontras pil (diukur 5 Nov 2026)

Pil `.bn-pil` yang ada mencampur teks 80% warna dan 20% `--ink` (`bnpb.css:23`). Diukur di atas
latar pilnya sendiri (14% warna di atas `--card`), mode terang:

| Warna | Teks 80% (`.bn-pil`) | Teks 50% (`.un-*`) |
| --- | --- | --- |
| `--c1` | 4,94 | 7,59 |
| `--c2` | 3,23 | 5,68 |
| `--c3` | 2,46 | 4,65 |
| `--c4` | 3,73 | 6,04 |
| `--c5` | 3,95 | 6,22 |
| `--c6` | 5,07 | 7,30 |
| `--ink3` | 3,64 | 5,95 |

Teks 12px butuh 4,5:1. Karena itu semua pil baru `un-*` memakai campuran 50% warna dan 50%
`--ink`; mode gelap dengan campuran yang sama 5,8 sampai 8,9. Di kepala navy, teks putih di
atas `rgb(255 255 255 / .14)` = 10,03, dan ikon berwarna (60% warna, 40% putih) 4,23 sampai 6,97.

## 5. Komponen

### 5.0 Aturan bersama

- Semua nilai dari data lewat `textContent` atau `esc()`; tautan luar lewat `escUrl()`.
- Angka lewat `fmt()` (`toLocaleString("id-ID")`), tidak pernah `toFixed` langsung. Tanpa
  singkatan "rb" atau "jt" di tabel dan perbandingan; singkatan hanya di sumbu grafik.
- Tombol berikon tampil sebagai ikon polos: tanpa bingkai, tanpa latar, tanpa lingkaran;
  sorot cukup ganti warna (`dalops.css:216-217`). Fokus keyboard tetap bergaris.
- Delegasi event di wadah dengan atribut `data-*`, bukan satu handler per baris.

### 5.1 Komponen pakai ulang

| Kebutuhan | Pakai | Catatan Ruang Unit |
| --- | --- | --- |
| Kepala halaman | `.ad-top` + `.ad-sep.staf` "Ruang Unit" | nama staf dan Keluar di kanan (`admin.css:333-335`) |
| Judul halaman | `.bn-judul` > `h1` + `.bn-aksi` | aksi kanan: Unduh CSV, Salin tautan |
| Bagian layar | `.ex.ex-std` dengan pola `bagian()` `dalops.js:107-115` | id kartu = ID sistem huruf kecil, contoh `#plp-1` |
| Baris pil kepala | `.ex-pl` > `.ex-ey` + `.un-lbl` + `.un-per` (+ `.un-fase` di daftar sistem) | `kartu.css:115-116` |
| Pemilih di kanan judul | `.pc` (`PilihCantik`) di dalam `.ex-jd` | provinsi, kab/kota, tahun, direktorat; maks 320px (`kartu.css:62-63`) |
| Deretan pilihan halaman | `.ad-tabs` | penuh lebar, terbagi rata, ikon di tiap tombol, angka di `b` |
| Deretan pilihan dalam kartu | `.ad-tabs` di baris pertama `.ex-bd` | sama, tidak pernah grup pil sempit di tengah |
| Tabel | `.ad-tabel-wadah.ex-tabel.kb-tabel` > `table.ad-tabel` | kepala biru tua, kolom label rata kiri, kolom lain rata tengah; definisi kolom di `th title`; tiap `td` punya `data-label` |
| Urut kolom | `th button` (`bnpb.css:58`) | `aria-sort` di `th` |
| Paginasi | `paginasi(hal, total, 25, "kab/kota")` | 25 baris per halaman; tanpa tombol "Tampilkan N" |
| Tooltip | `#tip` + `data-tip` + `pasangTip()` | kepala pita `.tp2-h`, baris `.tp2-kv`; naik merah, turun hijau (`kartu.css:27-28`) |
| Grafik | pola `garis()` dan `batang()` `kinerja.js:22-60` | area sentuh `.kj-kena`, garis bantu `.ad-hov` |
| Peta | SVG per provinsi pola `risiko.js:72-82` | nasional dari `public/geo/provinsi.json`, kab dari `public/geo/kabupaten/<prov>.json` saat provinsi dipilih |
| Legenda | `.ex-leg` | hanya kelas yang tergambar |
| Tombol | `.ad-tombol`, `.ad-tombol.utama`, `.ad-tombol.kecil` | kata kerja: Setujui, Tolak, Salin, Unduh, Buka |
| Spanduk | `.ad-spanduk` | data basi, sumber putus |
| Pesan | `.bn-pesan`, `.bn-pesan.ok`, `.bn-pesan.galat` | `role="status"` |
| Hantu memuat | `.ad-hantu` | kerangka baris abu |
| Kosong | `.ad-kosong` di dalam `.ex-bd` | kalimat §8 |
| Alur status | `.bn-alur` + `li[aria-current]`, `li.lewat` | tahapan antrean setuju, kaji cepat dua tahap |
| Kartu pintu | `.bn-kartu.pt-kartu` di `.bn-grid.pt-grid` | hanya di pintu `/bnpb/unit` |
| Masuk staf | pola `kartuMasuk()` `dalops.js:81-85` | 401 dan 403 |

Jangan tiru: `.rk-tutup` (`risiko.css:38`, tombol ikon berlatar), `.dl-ikon` versi
`dalops.css:121` (berbingkai, sudah ditimpa `:216`), kotak KPI `.ad-kpi` untuk angka laporan
(angka masuk judul kartu), emoji di nav `src/admin_halaman.js:19`.

### 5.2 Komponen baru (awalan `un-`, di `public/bnpb/unit/unit.css`, maks 160 baris)

Semua pil baru dibangun di atas `.bn-pil` (`bnpb.css:22-24`) dengan `--pil` dan satu aturan
teks 50% (§4.5):
`.un-lbl,.un-per,.un-jam,.un-fase,.un-st{color:color-mix(in srgb,var(--pil) 50%,var(--ink))}`.
Di kepala navy: `.ex>.ex-hd :is(.un-lbl,.un-per,.un-jam){background:rgb(255 255 255 / .14);color:#fff}`
dengan ikon `color:color-mix(in srgb,var(--pil) 60%,#fff)`.

#### 5.2.1 Label sumber angka `.un-lbl`

Berbentuk `<button type="button" class="bn-pil un-lbl un-<jenis>" data-tip="...">ikon + kata</button>`.

| Jenis | `--pil` | Kata di pil | Ikon | Kapan |
| --- | --- | --- | --- | --- |
| `resmi` | `--c4` | Angka resmi | `resmi` (`kinerja.js:6`) | dari dokumen atau API resmi BNPB, K/L, BPS: LAKIP, Renstra, CKAN, INALOGPAL, SIRUP, SK status |
| `sekunder` | `--c5` | Sekunder, berita | `koran` | angka dari berita atau rilis yang diurai MB-7 sebelum dikonfirmasi pemiliknya |
| `hitungan` | `--c3` | Hitungan kita | `hitung` (`kinerja.js:6`) | rumus kita atas data resmi (neraca, skor, rapor MB-6) |
| `proksi` | `--c2` | Proksi | `proksi` | pengganti data yang tidak tersedia (raster InaRISK untuk IKD, OSM untuk sirine) |
| `asumsi` | `--c6` | Asumsi | `tanya` | ambang atau bobot tanpa pasal (KEPUTUSAN-AWAL §3 butir 4) |

Tooltip pil (lewat `rapikanTip`) berisi kepala nama dataset lalu baris dua kolom:
`Asal angka`, `Per tanggal`, `Rumus` (untuk `hitungan` dan `proksi`: jejak rumus MB-6),
`Pasal` (bila ambang), `Tautan` (bila sumber terbuka). Tidak memakai kata "Sumber:" di kode
karena gerbang kartu standar menolaknya.

Satu kartu boleh memuat lebih dari satu label bila isinya campuran (contoh PERB-1: `proksi` +
`hitungan`). Tabel dengan asal angka berbeda per baris memakai pil yang sama di dalam sel
kolom "Asal".

#### 5.2.2 Pil tanggal data `.un-per`

`--pil:var(--ink3)`, ikon `kalender`, kata "per 5 Nov 2026" atau "per 5 Nov 2026, 07.00 WIB"
untuk data harian dengan jam. Bila umur data lebih dari 2 kali periode pembaruannya, pil
berganti `--pil:var(--c1)` dan kata "basi sejak 3 Nov 2026", lalu `.ad-spanduk` muncul di atas
isi kartu (§8.4).

#### 5.2.3 Jam tenggat `.un-jam`

Pil hitung mundur untuk semua tenggat MB-2. Anatomi: ikon `jam` + kata, `data-tip` berisi
peristiwa awal, tanggal tenggat, acuan pasal, dan kutipan pendeknya.

| Kelas | `--pil` | Kata |
| --- | --- | --- |
| `.un-jam.aman` | `--c4` | "sisa 45 hari" |
| `.un-jam.dekat` | `--c3` | "sisa 12 hari" (ambang dekat per aturan; bawaan 30 hari, RRX-1 juga 30) |
| `.un-jam.lewat` | `--c1` | "lewat 4 hari" |
| `.un-jam.tanpa` | `--ink3` | "tanggal awal belum ada" |
| `.un-jam.asumsi` | `--c6` | kata seperti di atas + ikon `tanya`; ambang tanpa pasal |

Satuan menyesuaikan besar sisa: jam bila kurang dari 48 jam (kaji cepat 24 dan 72 jam), hari
selain itu, bulan bila lebih dari 90 hari (renkon 3 tahun). Lewat `fmt.durasi` untuk jam.

#### 5.2.4 Neraca kebutuhan lawan tersedia `.un-neraca` (MB-5)

Sel tabel dan baris ringkas untuk PLP-1, WIL-2, RRP-1, RRS-1:

```html
<div class="un-neraca" data-tip="...">
  <span class="un-bar"><i class="ada"></i><i class="celah"></i></span>   <!-- --w-ada, --w-celah di-set JS -->
  <span class="bn-pil un-st kurang">Kurang 1.240 paket</span>
</div>
```

- `.un-bar`: tinggi 8px, radius 999px, latar `--surface`. `i.ada` isi `--c5` selebar
  `min(tersedia/kebutuhan,1)`. `i.celah` arsir garis miring `--c1` sisa sampai 100%.
  Lebih dari cukup: batang penuh `--c4` dan tanda lebih di ujung.
- Status `.un-st`: `cukup` (`--c4`), `kurang` (`--c1`), `belum` (`--ink3`, kata "Stok belum
  dilaporkan"). Belum dilaporkan tidak pernah digambar sebagai nol: batang kosong berarsir abu.
- Tooltip: Kebutuhan, Tersedia, Selisih, rumus (contoh `JP x PR x H`), pasal standar.
- RRP-1 memakai tiga ruas berurutan (Lapor, Verifikasi, Tersalur) sebagai tiga batang
  bertumpuk di satu sel; kata status memakai rasio susut, bukan cukup atau kurang.
- WIL-2 panel selisih pusat lawan daerah: dua angka berdampingan dengan pil asal masing-masing;
  selisih lebih dari 25% memberi `.un-st.kurang` berkata "Selisih 62%". Sistem tidak memilih
  angka yang benar.

#### 5.2.5 Pil fase dan status sistem `.un-fase`, `.un-st`

Dipakai di pintu dan kartu "Sistem unit ini".

| Kelas | `--pil` | Kata |
| --- | --- | --- |
| `.un-fase.f0` | `--c8` | Perbaikan |
| `.un-fase.f1` `.f2` `.f3` | `--navy2` | Fase 1, Fase 2, Fase 3 |
| `.un-fase.t` | `--ink3` | Ditunda |
| `.un-st.tayang` | `--c4` | Tayang |
| `.un-st.disiapkan` | `--c3` | Disiapkan |
| `.un-st.menunggu` | `--ink3` | Menunggu data (tooltip: syarat mulai, contoh "MB-3 belum jadi" atau "U10") |

#### 5.2.6 Antrean setuju `.un-antre` (MB-7)

Daftar baris usulan dari dokumen, WA, atau berita untuk KPOD-3, RRP-2, RRI-1, WIL-2 (pesan WA
yang tidak cocok pola). Satu baris:

```
| [pil sekunder] 120 unit huntara selesai, Kab. X        [Benar] [Tolak]  (ikon tautan) |
|   per 4 Nov 2026, dari rilis BNPB (judul berita dipotong satu baris)                  |
```

- Tombol `.ad-tombol.kecil` "Benar" (`.utama`) dan "Tolak"; ikon tautan polos ke URL asal.
- Sesudah diketuk: baris diganti pil `.un-st.tayang` "Diterima" atau abu "Ditolak", lalu
  hilang dari antrean pada muat berikut. Tanpa dialog konfirmasi; ada tombol "Urungkan"
  di `.toast` 5 detik.
- Kepala kartu memakai `.bn-alur` tiga langkah: Diurai, Diperiksa, Diterima.

#### 5.2.7 Fokus dan teks layar-baca

`unit.css` menyalin dua aturan `gaya.css:6-7` (`:focus-visible` outline 2px `var(--info)`
offset 2px; `.sr`) karena `gaya.css` tidak dimuat di `/bnpb`.

## 6. Ikon

SVG garis 24x24, `fill:none; stroke:currentColor; stroke-width:1.9; round` (`pintu.css:5`).
Path dari `pintu.js:6-20` dan `wilayah.js` dipakai apa adanya. Ikon baru:

| Nama | Dipakai | `d` |
| --- | --- | --- |
| `koran` | label sekunder | `M4 5h13v14H6a2 2 0 0 1-2-2z\|M17 9h3v8a2 2 0 0 1-2 2\|M8 9h5\|M8 13h5` |
| `proksi` | label proksi | `M4 9c3-3 5 3 8 0s5-3 8 0\|M4 15c3-3 5 3 8 0s5-3 8 0` |
| `tanya` | label asumsi | `M9 9a3 3 0 1 1 4 2.8c-.7.3-1 1-1 1.7V14\|M12 18h.01` |
| `jam` | jam tenggat, disiapkan | `M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z\|M12 7v5l3 2` |
| `kalender` | pil tanggal | `M4 6h16v14H4z\|M4 10h16\|M8 3v4\|M16 3v4` |
| `cek` | tayang, berlaku | `M5 12l4 4 10-10` |
| `seru` | lewat, konflik | `M12 3l9 16H3z\|M12 10v4\|M12 17h.01` |
| `kosong` | belum ada data | `M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z\|M8 12h8` |
| `gudang` | Deputi Logistik | `M3 21V9l9-6 9 6v12\|M7 21v-7h10v7` |
| `rumah` | Deputi RR | `M3 11l9-7 9 7\|M5 10v10h14V10\|M10 20v-5h4v5` |
| `timbang` | Biro Hukum | `M12 3v18\|M5 7h14\|M5 7l-3 6h6z\|M19 7l-3 6h6z` |
| `toga` | Pusdiklat, Pusbin JF | `M22 10 12 5 2 10l10 5 10-5z\|M6 12v5c3 2 9 2 12 0v-5` |
| `kaca` | Inspektorat | `M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z\|M21 21l-5-5` |

Ikon kelompok lain diambil dari `pintu.js`: `risiko` (Sistem dan Strategi), `siaga`
(Pencegahan), `banjir` atau `sitrep` (Penanganan Darurat), `kinerja` (Sestama, Pusdatinkom).

## 7. Wireframe

Nama dalam kurung siku `[ ]` adalah komponen §5. `‹n›` adalah angka dari data; wireframe tidak
memuat angka contoh agar tidak dibaca sebagai temuan.

### 7.0 Kerangka bersama

Desktop (1280px ke atas):

```
+------------------------------------------------------------------------------------------+
| [.ad-top] (logo) Centurisk97 [RUANG UNIT]  Ruang Koordinasi v  Ruang kerja v   Nama Keluar|
+------------------------------------------------------------------------------------------+
| main.bn-wrap (maks 1440px)                                                               |
|  Ruang Unit > Deputi Bidang Logistik dan Peralatan > Dit. PLP     (remah, teks ink2)     |
|  [.bn-judul] h1 Direktorat Pengelolaan Logistik dan Peralatan       [.bn-aksi] (unduh)   |
|  [.ad-tabs] (ikon) Neraca stok ‹n› | (ikon) Daftar hibah | (ikon) Pengingat | (ikon) Sistem|
|  [.ex.ex-std] ...                                                                        |
|  [.ex.ex-std] ...                                                                        |
+------------------------------------------------------------------------------------------+
```

HP (di bawah 640px):

```
+--------------------------------+
| [.ad-top] Centurisk97   Keluar |
| (nav membungkus ke baris 2)    |
+--------------------------------+
| h1 Dit. PLP (19px)             |
| [.ad-tabs] menumpuk 2 kolom    |
| (ikon) Neraca | (ikon) Hibah   |
| (ikon) Ingat  | (ikon) Sistem  |
| [.ex-std] satu kolom, 16px     |
+--------------------------------+
```

### 7.1 Pintu `/bnpb/unit`

```
 h1 Ruang Unit
+--------------------------------------------+--------------------------------------------+
|[.pt-kartu] (ikon risiko)                   |[.pt-kartu] (ikon siaga)                    |
| Deputi Bidang Sistem dan Strategi      (->)| Deputi Bidang Pencegahan               (->)|
| ‹n› sistem tayang dari ‹n›                 | ‹n› sistem tayang dari ‹n›                 |
|  Dit. Pemetaan dan Evaluasi Risiko   ‹n›   |  Dit. Peringatan Dini                ‹n›   |
|  Dit. Pengembangan Strategi PB       ‹n›   |  Dit. Kesiapsiagaan                  ‹n›   |
|  Dit. Sistem PB                      ‹n›   |  Dit. Mitigasi Bencana               ‹n›   |
| [pil Tayang ‹n›] [pil Disiapkan ‹n›]       | [pil Tayang] [pil Disiapkan]               |
+--------------------------------------------+--------------------------------------------+
| Deputi Bidang Penanganan Darurat           | Deputi Bidang Logistik dan Peralatan       |
|  Dit. KPOD (Dit. Koordalops)  + tautan Dalops |  Dit. PLP, Dit. OJL                     |
|  Dit. Penanganan Darurat Wilayah I, II, III|                                            |
+--------------------------------------------+--------------------------------------------+
| Deputi Bidang Rehabilitasi dan Rekonstruksi| Sekretariat Utama                          |
|  Lintas Deputi, Dit. RRP, Dit. RRI, Dit. RRS| Biro Perencanaan, Keuangan, SDM dan Umum, |
|                                            |  Hukum Organisasi dan Kerja Sama           |
+--------------------------------------------+--------------------------------------------+
| Inspektorat Utama (Inspektorat I, II, III) | Pusat                                      |
|                                            |  Pusdatinkom, Pusdiklat PB, Pusbin JF      |
+--------------------------------------------+--------------------------------------------+
```

- Sembilan kartu sesuai kelompok KEPUTUSAN-AWAL §1, urutan sama. Grid `.pt-grid`
  (`minmax(380px,1fr)`, `pintu.css:2`); satu kolom di bawah 420px.
- Tiap baris unit adalah tautan ke `/bnpb/unit/<kode>`; angka di kanan = sistem tayang unit
  itu, `--ink3` "belum ada" bila nol. Kartu bukan `.ex-std` karena pintu adalah navigasi,
  bukan laporan.
- Angka di kepala kartu dihitung dari registri sistem (lihat DESAIN-TEKNIS), bukan diketik.
- Kartu Penanganan Darurat menautkan juga layar yang sudah melayani Dit. KPOD:
  `/bnpb/dalops`, `/bnpb/logbook`, `/bnpb/dokumen`, `/bnpb/perencanaan`, `/sitrep`.

### 7.2 Halaman unit `/bnpb/unit/<kode>`

```
 Ruang Unit > Deputi Bidang Pencegahan > Dit. Peringatan Dini
 h1 Direktorat Peringatan Dini                                         (ikon unduh polos)
[.ad-tabs] (ikon) Rapor peringatan | (ikon) Cakupan sirine | (ikon) Pesan standar | (ikon) Sistem
+------------------------------------------------------------------------------------------+
|[.ex-std] kartu sistem yang dipilih tab (lihat 7.3 sampai 7.10)                           |
+------------------------------------------------------------------------------------------+
+------------------------------------------------------------------------------------------+
|[.ex-std] [SISTEM UNIT INI] (tab terakhir "Sistem")                                      |
| ‹n› dari ‹n› sistem Dit. Peringatan Dini sudah tayang                                    |
|------------------------------------------------------------------------------------------|
| ID   | SISTEM                                  | FASE      | STATUS           | MESIN     |
| PD-3 | Penyusun pesan peringatan Pasal 20      | [Fase 1]  | [Tayang]         | -         |
| PD-1 | Rapor peringatan dini dan umpan balik   | [Fase 2]  | [Disiapkan]      | MB-2 MB-6 |
| PD-2 | Peta cakupan layanan peringatan dini    | [Fase 2]  | [Menunggu data]  | -         |
| PD-4 | Papan konektivitas data K/L             | [Fase 3]  | [Menunggu data]  | -         |
|------------------------------------------------------------------------------------------|
| Layar yang sudah ada: (tautan) /peringatan  (tautan) /prediksi  (tautan) /kinerja-bnpb    |
+------------------------------------------------------------------------------------------+
```

- Satu tab per sistem tayang, ditambah tab "Sistem" di ujung. Tab hanya untuk sistem yang
  tayang; sistem lain tampil di kartu "Sistem unit ini" dengan pil fase dan status.
- Tab diingat di `?s=pd-1` lewat `history.replaceState`; tautan langsung `#pd-1` membuka tab itu.
- Unit dengan satu sistem tayang (RRX, KEU) tidak menampilkan `.ad-tabs`; kartunya langsung.
- Dit. Wilayah I, II, III satu halaman `/bnpb/unit/wil` dengan `.ad-tabs` direktorat
  (Wilayah I, II, III, Semua) di atas tab sistem; pilihan diingat `?dit=1`.
- Layar yang sudah ada ditautkan, tidak disalin (KEPUTUSAN-AWAL §6 butir 2).

### 7.3 Bentuk A: daftar peringkat kab/kota (MB-4 dan skor sejenis)

Dipakai PERB-1, MT-2, PLP-2, DIK-1, OJL-2, PD-2, KS-3, REN-2, PERB-2, RRS-1, JF-2.

```
+------------------------------------------------------------------------------------------+
|[.ex-hd navy]                                                                             |
| [PENDAMPINGAN IKD] [Proksi] [Hitungan kita] [per 1 Nov 2026]                             |
| ‹n› kab/kota naik satu kelas kapasitas bila         [PilihCantik: Semua provinsi    v]  |
| didampingi, ‹n› di antaranya mengangkat provinsinya                                      |
|------------------------------------------------------------------------------------------|
| [.ad-tabs] (ikon) Peringkat | (ikon) Peta | (ikon) Bobot                                 |
| PERINGKAT:                                                                               |
| NO | KAB/KOTA          | PROVINSI   | SKOR | KELAS KINI | KELAS SESUDAH | ALASAN       |
|  1 | Kab. ...          | ...        | ‹n›  | [Rendah]   | [Sedang]      | jarak 0,03.. |
|  2 | ...                                                                                 |
| [.pgn] Menampilkan 1-25 dari ‹n› kab/kota      ‹ Sebelumnya 1 2 3 … Berikutnya ›        |
| PETA: SVG provinsi berwarna skor; klik provinsi = kab/kota; sorot = tooltip skor, kelas |
| BOBOT: tabel bobot tiap komponen dengan pil [Asumsi] dan pasal bila ada; tanpa form     |
+------------------------------------------------------------------------------------------+
```

- Kolom label (kab/kota) rata kiri, kolom lain rata tengah; `th title` berisi definisi kolom.
- Klik baris membuka rincian di bawah baris (bukan dialog): komponen skor sebagai batang
  kecil per komponen, bertooltip nilai dan bobot.
- Peta selalu interaktif; legenda `.ex-leg` lima kelas hanya untuk kelas yang tergambar.
- Bobot tampil dan bisa ditelusuri, tidak bisa diubah di layar fase ini (perubahan bobot
  lewat berkas aturan, dicatat).

| Sistem | Kategori `.ex-ey` | Pola judul | Kolom khusus | Label | Pemilih kanan |
| --- | --- | --- | --- | --- | --- |
| PERB-1 | Pendampingan IKD | ‹n› kab/kota naik satu kelas bila didampingi | kelas kini, kelas sesudah, manfaat IRB, biaya proksi | proksi (raster InaRISK), hitungan, pil tetap "bukan IRB resmi" | provinsi |
| PERB-2 | Kerugian ekonomi | Kerugian langsung berjalan ‹n›% PDB, ‹n› kab/kota menyumbang separuhnya | rumah RB, RS, RR, rupiah, pembanding resmi | hitungan, resmi (pembanding 2025) | tahun |
| MT-2 | Prioritas mitigasi | ‹n› kab/kota prioritas belum difasilitasi mitigasi | bahaya utama, 1 sampai 3 kode kegiatan 02.01.xx | hitungan, pil tetap "usulan analis" | bahaya |
| PLP-2 | Daftar pendek hibah | ‹n› kab/kota teratas menurut lima kriteria terukur | kolom per kriteria, dua kolom kosong "diisi rapat" | hitungan, pil tetap "daftar pendek, keputusan tetap di rapat" | tahun |
| DIK-1 | Sasaran diklat | ‹n› kab/kota rawan belum punya alumni 5 tahun | skor MB-4, cakupan, perkiraan angkatan | hitungan, asumsi (30 SDM per BPBD) | provinsi |
| OJL-2 | Penempatan stok | ‹n› kab/kota berisiko tinggi lebih dari 24 jam dari gudang | jam tempuh, paket 72 jam, gudang asal | hitungan, pil tetap "saran" | minggu ini atau musim |
| PD-2 | Cakupan sirine | Baru ‹n›% penduduk terpapar tinggi terlayani instrumen | terpapar, terlayani, skor prioritas paket | proksi (OSM), asumsi (radius 2 km) | bahaya |
| KS-3 | Lokasi evakuasi | ‹n› desa terpapar tinggi tanpa titik evakuasi dalam jangkauan | desa, jarak, kandidat bangunan, cakupan OSM | proksi, pil tetap "bukan lokasi evakuasi resmi" | bahaya |
| REN-2 | Belanja lawan risiko | ‹n› kab/kota berkebutuhan teratas kurang dilayani belanja | pangsa belanja, pangsa kebutuhan, rasio | resmi (SIRUP), hitungan, pil tetap "RUP adalah rencana" | tahun |
| RRS-1 | Kerugian pertanian | Sawah tergenang ‹n› ha di ‹n› kab/kota | ha tergenang, rupiah (hanya bila kalibrasi lolos) | hitungan; bila belum lolos hanya kolom ha dan pil "belum layak dirupiahkan" | kejadian |
| JF-2 | Formasi JF | Kebutuhan ‹n› Analis Kebencanaan di ‹n› instansi | per jenjang, volume kegiatan | hitungan, asumsi (norma waktu bawaan) | provinsi |

PERB-2 dan RRS-1 punya keadaan "belum layak": bila uji balik tidak lolos, isi kartu diganti
satu baris `.ad-kosong` berkata "Taksiran belum layak tayang: galat uji balik ‹n›% dari angka
resmi 2025" dan tabel tetap menampilkan kolom yang bukan rupiah.

### 7.4 Bentuk B: neraca kebutuhan lawan tersedia (MB-5)

Dipakai PLP-1, RRP-1, dan bagian kebutuhan WIL-2.

```
+------------------------------------------------------------------------------------------+
| [STOK PENYANGGA] [Hitungan kita] [Resmi] [per 1 Nov 2026]                                |
| ‹n› kab/kota belum punya data stok untuk 72 jam pertama     [PilihCantik: Semua prov v] |
|------------------------------------------------------------------------------------------|
| [.ad-tabs] (ikon) PR 1% | (ikon) PR 4% | (ikon) PR menurut risiko                        |
| KAB/KOTA  | PENDUDUK | KEBUTUHAN 72 JAM | NERACA                          | UJI BALIK     |
| Kab. ...  | ‹n›      | ‹n› paket        | [####////] [Kurang ‹n› paket]   | [pernah > 1%] |
| Kab. ...  | ‹n›      | ‹n› paket        | [::::::::] [Stok belum dilaporkan] | -          |
| [.pgn]                                                                                   |
+------------------------------------------------------------------------------------------+
```

- Tab skenario PR adalah `.ad-tabs` di dalam kartu; ganti tab mengganti kolom kebutuhan dan
  neraca, judul ikut berubah.
- Rincian baris: barang turunan (beras kg, air minum liter, matras, tambahan balita) dalam
  tabel kecil, dan pil "bacaan harfiah Pasal 11" pada baris sandang dan papan.
- RRP-1: kolom Lapor, Verifikasi, Tersalur dengan batang tiga ruas; kolom beban stimulan dua
  versi (lapor, verifikasi) bertanda `hitungan`; kolom "Periksa" dengan `.un-st.kurang` bila
  lapor melewati 0,8 kali bangunan Open Buildings di kecamatan.

### 7.5 Bentuk C: jam dan register tenggat (MB-2, MB-3)

Dipakai KPOD-2, RRX-1, KS-4, REN-3, PLP-3, MT-3, KS-1, PSPB-1.

```
+------------------------------------------------------------------------------------------+
| [JAM PASCABENCANA] [Resmi] [Hitungan kita] [per 5 Nov 2026]                              |
| ‹n› kab/kota melewati 90 hari tanpa R3P tercatat            [PilihCantik: Semua v]      |
|------------------------------------------------------------------------------------------|
| [.ad-tabs] (seru) Lewat ‹n› | (jam) 1-30 hari ‹n› | (cek) Lebih dari 30 hari ‹n› | Semua  |
| KAB/KOTA  | KEJADIAN        | HARI-0      | SISA                 | R3P       | SK          |
| Kab. ...  | banjir          | 12 Jul 2026 | [lewat 26 hari]      | [Belum]   | (tautan SK) |
| Kab. ...  | gempabumi       | 3 Sep 2026  | [sisa ‹n› hari]      | [Sudah]   | (tautan SK) |
+------------------------------------------------------------------------------------------+
```

- Deretan status adalah `.ad-tabs` penuh lebar dengan angka di `b`, bukan chip kecil.
- Kolom "Sisa" selalu `.un-jam`; urutan bawaan: lewat paling lama di atas.
- Koreksi satu ketuk (KEPUTUSAN-AWAL §3 butir 1): kolom status R3P atau dokumen berupa
  tombol pil yang membuka pilihan Sudah atau Belum di tempat; ketukan menulis ke meja yang
  sudah ada (DESAIN-TEKNIS).

| Sistem | Kategori | Baris | Kolom khusus | Tampilan kedua |
| --- | --- | --- | --- | --- |
| KPOD-2 | Jam Aturan | satu kunci aturan | kunci, nilai, satuan, acuan pasal, kutipan, status pasal | tab "Dipakai oleh": meja dan layar yang membaca kunci itu |
| RRX-1 | Jam pascabencana | (kab, kejadian) | hari-0, sisa R3P, rumah RB dan RS, layak didampingi | - |
| KS-4 | Gladi pra-musim | kab | bahaya utama, awal musim, bulan gladi disarankan, skenario terburuk | kalender 12 bulan (lihat bawah) |
| REN-3 | Tenggat pelaporan | satu tenggat | dokumen, siklus, tenggat berikut, pasal | kalender 12 bulan |
| PLP-3 | Kewajiban pasca-hibah | (kab, BAST) | barang, tgl BAST, laporan jatuh tempo, kedaluwarsa | - |
| MT-3 | Kampanye musiman | kab | bahaya, bulan, desa sasaran, porsi lansia, saluran | kalender 12 bulan; unduh kartu PNG |
| KS-1 | Dokumen kesiapsiagaan | (pemda, jenis dokumen, bahaya) | tgl tetap, berlaku sampai, reviu terakhir, tautan JDIH | pil batas bawah "dokumen SK BPBD tidak terbaca" |
| PSPB-1 | Register RPBD | pemda (552) | periode, status, ditetapkan sesudah 6 Okt 2026, tautan | pil "diduga" bila periode dari tanggal tetap + 5 tahun |

Kalender 12 bulan (KS-4, REN-3, MT-3): grid 12 kolom bulan di dalam `.ex-bd`, baris per bahaya
atau per dokumen, sel berisi titik `--c5` (gladi, kampanye) atau `.un-jam` kecil (tenggat).
Sorot sel = tooltip daftar kab dan pasal. Di HP berubah jadi daftar per bulan berjudul bulan.

KPOD-2 tidak punya angka hitung di judul selain jumlah; contoh pola: "‹n› tenggat dari ‹n›
pasal berlaku, ‹n› dipakai meja". Kunci yang acuannya tidak lagi BERLAKU menampilkan
`.un-st.kurang` "Acuan dicabut".

### 7.6 Bentuk D: rapor indikator (MB-6)

Dipakai PUS-1, REN-1, KPOD-1, PD-1, PSPB-3, OJL-3, SDU-1, IRT-1, KEU-1.

```
+------------------------------------------------------------------------------------------+
| [RAPOR WALIDATA] [Resmi] [Hitungan kita] [per 5 Nov 2026]                                |
| ‹n› produsen data belum menyetor satu dataset pun ke Satu Data Bencana   [Unduh CSV]   |
|------------------------------------------------------------------------------------------|
| [.ad-tabs] (ikon) Per produsen | (ikon) Data prioritas | (ikon) Tren                     |
| PRODUSEN        | DATASET | UMUR MEDIAN | METADATA LENGKAP | PRIORITAS TERBIT | STATUS    |
| Dit. ...        | 0       | -           | -                | 0 dari ‹n›       | [Kosong]  |
| Pusdatinkom     | ‹n›     | ‹n› hari    | ‹n›%             | ‹n› dari ‹n›     | [Basi ‹n›]|
| TREN: grafik garis bulanan per indikator, sorot = nilai dan perubahan dari bulan lalu    |
+------------------------------------------------------------------------------------------+
```

- Tiap angka rapor membawa jejak rumus di tooltip pil `hitungan` dan di `th title`.
- Bila ada angka resmi pembanding (LAKIP, IKU), kolom "Resmi" berdampingan dengan kolom
  "Hitungan kita", masing-masing berpil; tidak pernah digabung.
- Tab "Tren" memakai grafik garis `garis()`; titik terakhir tersorot, garis target putus-putus.

| Sistem | Kategori | Baris tabel | Pembanding resmi | Catatan rupa |
| --- | --- | --- | --- | --- |
| PUS-1 | Rapor walidata | produsen CKAN | 37 data prioritas LAKIP | status Kosong, Basi, Lengkap |
| REN-1 | Reformasi Birokrasi | komponen RB | nilai LAKIP | kolom bobot, nilai, poin hilang, pemilik; urut poin hilang |
| KPOD-1 | Intervensi status darurat | SK status | IKU Program 3 LAKIP | tab per direktorat wilayah dan per jenis; kolom terpantau, didampingi, tepat waktu |
| PD-1 | Rapor peringatan dini | (jenis bahaya, tingkat) | - | kolom hit, palsu, terlewat, POD, FAR; tab periode 4 bulan |
| PSPB-3 | Indikator Sendai | indikator A-1, B-1, C-1, E-1, E-2 | angka Sendai bila diberikan | rata-rata bergulir 10 tahun di grafik |
| OJL-3 | Klaster Logistik | provinsi | dasbor INALOGPAL | kolom SK, capaian pra, darurat, pasca, hari sejak pembaruan; unduh draf Format-5 |
| SDU-1 | Tata kelola pengadaan | indikator per tahun | nilai komponen RB | tab "Kandidat konsolidasi" berisi kelompok nama paket, tautan SIRUP; tanpa nama penyedia |
| IRT-1 | Umur rekomendasi TLHP | unit | target Renstra 75% dan 46% | hanya bila U9 dijawab "boleh"; bawaan lihat §8.6 |
| KEU-1 | Konsistensi angka | selisih per tabel | - | kolom halaman, tabel A, tabel B, selisih; tanpa grafik |

### 7.7 Bentuk E: antrean setuju (MB-7)

Dipakai KPOD-3, RRP-2, RRI-1.

```
+------------------------------------------------------------------------------------------+
| [LAPHAR TERURAI] [Resmi] [per 5 Nov 2026, 07.00 WIB]                                     |
| Laphar ‹n› hari terakhir terurai, ‹n› baris menunggu diperiksa                           |
| [.bn-alur] Diurai > Diperiksa > Diterima                                                 |
|------------------------------------------------------------------------------------------|
| [.ad-tabs] (ikon) Menunggu ‹n› | (ikon) Diterima ‹n› | (ikon) Hari bolong ‹n›            |
| [.un-antre] [Sekunder] ‹n› jiwa mengungsi, Kab. ...           [Benar] [Tolak] (tautan)   |
| [.un-antre] ...                                                                          |
+------------------------------------------------------------------------------------------+
```

- KPOD-3 tab "Hari bolong" berisi tanggal tanpa PDF laphar (`cakupan.tanpa_pdf`) dengan
  `.un-st.kurang`.
- RRP-2: baris usulan angka huntara, huntap, DTH dari berita; tiap baris wajib menampilkan
  judul dan tanggal berita.
- RRI-1: dua tampilan. Tab "Peta" SVG titik akses putus berwarna status (putus `--c1`, darurat
  `--c3`, pulih `--c4`, bentuk penanda berbeda per status); tab "Daftar" tabel titik dengan
  umur putus `.un-jam`, kelas pemilik (nasional, provinsi, kab, desa) bertanda `proksi`, dan
  pil "aset desa: tidak bisa hibah RR". Antrean WA "jembatan dibuka" memakai `.un-antre`.

### 7.8 Bentuk F: status peraturan (MB-1)

Dipakai HUK-1, HUK-2, SPB-1. Layar `/bnpb/hukum` yang sudah ada tetap rumah wiki; kartu Ruang
Unit adalah ringkasan dan daftar kerja.

```
+------------------------------------------------------------------------------------------+
| [STATUS PERATURAN] [Hitungan kita] [per 5 Nov 2026]                     [Buka JDIH kita] |
| ‹n› peraturan tertulis BERLAKU padahal dicabut menurut teks                              |
|------------------------------------------------------------------------------------------|
| PERATURAN        | MENURUT JDIH | MENURUT TEKS                 | PASAL PENCABUT          |
| Perka 1/2012     | [Berlaku]    | [Dicabut Perban 7/2025]      | Pasal 22 (kutipan)      |
+------------------------------------------------------------------------------------------+
```

- Dua status berdampingan, tidak digabung. Kata pil teks: "Dicabut oleh X (menurut teks)".
- HUK-2: baris = amanat (dokumen induk, pasal, kalimat delegasi, umur, status terpenuhi atau
  terbuka, tautan turunan); `.un-jam` dipakai untuk umur amanat.
- SPB-1: tab "Matriks" berupa tabel fase (pra, darurat, pasca) kali jenis bencana, sel berisi
  jumlah NSPK berlaku dan berwarna intensitas `--c5`; sel kosong `--ink3` berkata "kosong".
  Tab "Target Renstra": baris target, tahun, sudah terbit atau belum, `.un-jam`.

### 7.9 Bentuk G: alat hitung dan penyusun di peramban

Tanpa simpan ke D1 di fase ini. Kiri masukan terisi otomatis, kanan hasil.

```
+------------------------------------------------------------------------------------------+
| [PESAN PERINGATAN] [Resmi] [Hitungan kita] [per 5 Nov 2026, 14.00 WIB]                   |
| Pesan Siaga banjir Kab. ... memuat ‹n› dari 6 unsur Pasal 20 ayat 2                      |
|                                       [PilihCantik: peringatan aktif v]                 |
|------------------------------------------------------------------------------------------|
| MASUKAN (terisi dari data)            | PESAN (enam baris)                               |
|  Jenis    banjir                      |  1 Jenis dan tingkat: ...                        |
|  Tingkat  [Siaga]                     |  2 Waktu dan masa berlaku: ...                   |
|  Kab      Kab. ...                    |  3 Wilayah dan jiwa terpapar: ‹n› jiwa           |
|  Terpapar ‹n› jiwa [Hitungan kita]    |  4 Daya rusak: belum ada data                    |
|                                       |  5 Tindakan: ...                                 |
|                                       |  6 Sumber daya: ...                              |
|                                       |  [Salin pesan WA] [Unduh kartu PNG]              |
+------------------------------------------------------------------------------------------+
```

| Sistem | Masukan otomatis | Hasil | Aksi |
| --- | --- | --- | --- |
| PD-3 | peringatan aktif, `terpapar.json`, `siaga.json`, `public/ews_tindakan.js` | enam baris Pasal 20 ayat 2; unsur kosong tertulis "belum ada data" | Salin pesan WA, Unduh kartu PNG |
| RRP-3 | unit rusak dari RRP-1 bila ada, IKK BPS kab | tabel kerusakan dan kebutuhan per RB, RS, RR; tanda huntap tambah stimulan RB melebihi RB terverifikasi | Unduh CSV kolom lampiran 7 Perka 15/2011 |
| MT-1 | kode kegiatan 02.01.xx, standar biaya, indeks risiko kita | skor prioritas tiga butir, kelas risiko lingkungan-sosial, RAB dengan komponen di atas standar bertanda `.un-st.kurang` | Unduh PDF, Unduh Excel |
| WIL-3 | laporan warga, `saran_status.json`, `terpapar.json`, median masa SK | draf laporan awal (24 jam) lalu lanjutan (72 jam) | Setujui awal, Setujui lanjutan, Unduh Format-4 |
| JF-1 | `kompetensi.json` | cari kode PB.01 sampai PB.58, lima level per kode, jenjang minimum | Unduh CSV |
| DIK-4 | kurikulum, direktori pakar | daftar calon pengajar per mata pelatihan | Buka profil di `/direktori` |

- Masukan yang bisa dikoreksi berupa satu kolom angka; koreksi tidak disimpan ke server.
- Hasil yang berupa saran (WIL-3) memakai pil tetap "Saran, bukan penetapan"; yang
  menetapkan status tetap kepala daerah.
- WIL-3 memakai `.bn-alur` dua langkah: Laporan awal (dengan `.un-jam` 24 jam sejak tiba),
  Laporan lanjutan (72 jam).

### 7.10 Bentuk khusus

**WIL-1 Meja Wilayah**

```
 h1 Direktorat Penanganan Darurat Wilayah
[.ad-tabs] (ikon) Wilayah I ‹n› | (ikon) Wilayah II ‹n› | (ikon) Wilayah III ‹n› | Semua
+------------------------------------------------------------------------------------------+
| [ANTREAN HARI INI] [Resmi] [Hitungan kita] [per 5 Nov 2026, 07.00 WIB]                   |
| ‹n› kab/kota perlu diurus hari ini, ‹n› kejadian berkorban belum didampingi               |
|------------------------------------------------------------------------------------------|
| [.ad-tabs] 1 Belum didampingi ‹n› | 2 SK hampir habis ‹n› | 3 Saran tanpa SK ‹n› |       |
|            4 SPJ DSP ‹n› | 5 Besok berisiko ‹n›                                          |
| [1] Kab. ...  banjir, ‹n› jiwa mengungsi, tanpa pendampingan          [jam] (tautan)     |
|     Alasan: episode berjalan dengan pengungsi lebih dari 1.000 jiwa (laphar 5 Nov)       |
| [2] Kab. ...  SK berakhir [sisa 2 hari], episode masih berjalan                          |
+------------------------------------------------------------------------------------------+
```

Lima jenis antrean dari riset 3 W1 tampil sebagai `.ad-tabs` bernomor; tiap butir membawa
alasan dalam satu kalimat dan pil asal angkanya.

**WIL-2 Pengungsian**

Dua kartu: (1) bentuk B per kab berisi kebutuhan dasar per hari (beras, air, jamban, luas
hunian) dengan pil pasal Perka 7/2008 dan Juklak 3/2022; (2) panel selisih pusat lawan daerah
(§5.2.4) per kab. Tempat dengan data lebih dari 2 hari bertanda `.un-per` basi dan tidak
dijumlah. Tempat kurang dari 10 jiwa tidak pernah tampil sendiri.

**PUS-2 KIB usulan dan pencocok DIBI**

Satu kartu, `.ad-tabs` tiga daftar: Cocok ‹n›, Logbook tanpa DIBI lewat 7 hari ‹n›, DIBI tanpa
logbook ‹n›. Kolom KIB berpil tetap "KIB usulan", tidak pernah "KIB resmi". Aksi kepala:
Unduh CSV kolom Juknis "Daftar Data".

**RRS-3 Fasilitas sosial rusak**

Bentuk A tanpa skor: baris sekolah atau puskesmas di jejak bahaya, urut jumlah murid; kolom
pembanding jumlah `f_pendidikan` DIBI kab dengan `.un-st.kurang` bila selisih besar. Label
`proksi` bila sumbernya OSM.

## 8. Keadaan layar

### 8.1 Memeriksa akses dan memuat

- Muat pertama: `<p class="bn-pesan" role="status">Memeriksa akses…</p>` (pola `dalops.html`).
- Kepala halaman, judul, dan `.ad-tabs` tampil seketika; isi kartu menampilkan `.ad-hantu`
  enam baris setinggi baris tabel sambil data dimuat. Kepala kartu hantu tetap navy dengan
  pil kategori dan judul "Memuat …".
- Muat lebih dari 9 detik (batas `AbortSignal.timeout(9000)`, `pintu.js:24`) jatuh ke §8.3.

### 8.2 Kosong

| Situasi | Kalimat (`.ad-kosong`) |
| --- | --- |
| Data ada, filter tidak cocok | "Tidak ada kab/kota yang cocok dengan pilihan ini." |
| Isian manusia belum ada (stok, R3P, umpan balik) | "Belum ada yang dilaporkan. Angka di atas dihitung tanpa data ini." |
| Sistem bergantung data unit yang belum diberikan (U10) | "Menunggu data dari ‹unit›. Sampai ada, kartu ini memakai proksi berlabel." |
| Tidak ada kejadian atau tenggat aktif | "Tidak ada tenggat yang berjalan hari ini." |
| Pintu, unit tanpa sistem tayang | "Belum ada sistem yang tayang untuk unit ini." |

Kosong tidak pernah ditulis "0" bila datanya belum dilaporkan. Peta kosong memakai
`.ad-peta-kosong` di tengah peta.

### 8.3 Galat

- Satu kartu gagal tidak menjatuhkan kartu lain. Isi kartu diganti
  `<p class="bn-pesan galat">Data ‹nama› gagal dimuat. Coba lagi beberapa menit lagi.</p>`
  dan tombol `.ad-tombol.kecil` "Muat ulang".
- Sumber luar putus (CKAN, INALOGPAL, SIRUP, JDIHN): tampilkan berkas terakhir dengan
  `.un-per` basi dan `.ad-spanduk` "Sumber ‹nama› tidak menjawab sejak ‹tanggal›. Angka di
  bawah dari tarikan terakhir."
- Teks galat tidak memuat pesan teknis mentah atau kode status.

### 8.4 Basi

Data dengan umur lebih dari 2 kali periode pembaruan: `.un-per` merah "basi sejak ‹tanggal›"
dan `.ad-spanduk` di atas isi kartu. Angka tetap tampil.

### 8.5 Belum masuk dan tanpa hak

Pola `kartuMasuk()` `dalops.js:81-85`, di dalam `.bn-blok`:
- 401: judul "Masuk staf", kalimat "Ruang Unit hanya untuk staf BNPB. Masuk dulu dengan akun
  staf, lalu buka halaman ini lagi.", tombol `.bn-tombol` ke `/admin/masuk?ke=<jalur>`.
- 403: "Akunmu belum berhak membuka halaman unit ini. Minta Super Admin menambah perannya."

### 8.6 Sistem yang dijalankan lokal

KEU-1 (riset 6 K1) dan IRT-1 di bawah bawaan U9 dijalankan sebagai skrip lokal. Kartunya di
halaman unit hanya menampilkan pil `.un-st.menunggu` "Dijalankan lokal" dan kalimat
"Laporan disusun di luar situs untuk pemilik; tidak ada data internal di halaman ini." KEU-1
boleh menampilkan hasil uji atas LAKIP 2025 yang sudah terbit di repo
(`data/kajian-bnpb/pustaka/5-lakip.md`).

## 9. Tampilan ponsel

- Di bawah 640px tabel `.ad-tabel` berubah jadi kartu per baris (`admin.css:194-204`); tiap
  `td` wajib `data-label` berisi nama kolom. Kolom aksi `.a` rata kanan tanpa label.
- Tabel lebar yang harus tetap tabel (matriks SPB-1, kalender 12 bulan) menggulir mendatar di
  wadahnya sendiri (`overflow-x:auto`); halaman tidak pernah menggulir mendatar.
- `.ad-tabs` di bawah 560px menumpuk jadi kisi `minmax(140px,1fr)` (`admin.css:207`); ikon
  tetap tampil.
- Pemilih `.pc` di kanan judul turun ke baris sendiri selebar penuh (`kartu.css:63`).
- Bentuk G (alat hitung) menumpuk: masukan di atas, hasil di bawah; tombol aksi selebar penuh
  setinggi 44px.
- Tooltip pada sentuhan: ketuk pertama memunculkan tooltip, ketuk di luar menutup.
- Peta: tinggi maksimum 60vh, ketuk provinsi memuat kab, tombol ikon polos "Kembali ke
  nasional" di pojok.
- Target sentuh minimum 44 x 44px untuk tombol satu ketuk (Benar, Tolak, Sudah, Belum).

## 10. Aksesibilitas

- Kontras: teks utama `--ink` di `--card` dan putih di navy di atas 10:1; pil `un-*` diukur
  §4.5. Teks `--ink3` hanya untuk keterangan berukuran 12,5px ke atas bersama kata.
- Warna tidak sendiri: tiap status punya kata dan ikon; neraca punya arsir untuk celah; titik
  peta akses putus punya bentuk berbeda per status.
- Struktur: satu `h1` per halaman, `h3` di tiap kartu (pola `.ex-jd>h3`), tabel memakai
  `th scope="col"` dan `caption.sr` berisi judul kartu.
- Tab: `.ad-tabs` sebagai `role="tablist"` dengan `aria-pressed` (pola `hukum.html:20`),
  panah kiri dan kanan berpindah tab.
- Urut kolom: `th` bertombol dengan `aria-sort`.
- Tooltip: pemicu `data-tip` bisa difokus (`button` atau `tabindex="0"`); isi tooltip juga
  diumumkan lewat `aria-describedby` ke `#tip`.
- Grafik dan peta: `role="img"` dengan `aria-label` kalimat ringkas, dan tabel datanya tersedia
  di tab sebelahnya (Peringkat, Daftar).
- Pesan memuat, kosong, galat memakai `role="status"`; galat sumber memakai `role="alert"`
  hanya bila memblokir.
- `prefers-reduced-motion`: tanpa animasi pada batang dan transisi tab.
- Fokus terlihat: `:focus-visible` disalin dari `gaya.css:6`.

## 11. Aturan menulis teks layar

### 11.1 Suara

- Bahasa Indonesia lugas, kalimat aktif, sapaan staf "kamu" hanya di pesan masuk dan galat.
- BNPB dan BPBD adalah "kita": "Dit. Pemetaan dan Evaluasi Risiko", bukan "mitra BNPB".
- Nama platform Centurisk97. Tidak pernah menulis nama platform lama.
- Tanpa slogan, tanpa kalimat mendayu, tanpa em dash, tanpa titik tengah (U+00B7) sebagai pemisah
  (gerbang `tests/agen/gerbang-titik-tengah.test.mjs`). Pisah dengan koma, kalimat biasa,
  label sendiri, atau baris baru.
- Judul kartu = kalimat temuan: fakta + angka + lingkup. Angka kunci di depan bila wajar.
  Contoh pola: "‹n› kab/kota melewati 90 hari tanpa R3P tercatat". Bukan "Rekap R3P" dan bukan
  "Pesan kunci: …".
- Tanpa subjudul di bawah judul kartu, tanpa paragraf peringatan. Batas pemakaian angka masuk
  pil label dan tooltipnya.
- Paragraf (hanya di tab Metode atau rincian) rata kiri-kanan, pola `.kj-p`.

### 11.2 Angka dan satuan

- Ribuan titik, desimal koma: 1.240 paket, 0,4 kg, 6,29%.
- Persen 0 desimal bila 10% ke atas, 1 desimal di bawah 10%, 2 desimal hanya bila menyalin
  angka resmi apa adanya (contoh target Renstra 6,29%).
- Rupiah: "Rp51,3 triliun" di judul; tabel memakai angka penuh dengan satuan di kepala kolom
  ("PAGU (RP JUTA)"). Tanpa "rb" dan "jt" di tabel.
- Satuan selalu disebut: jiwa, kab/kota, paket, unit, ha, hari, jam.
- Tanpa presisi palsu: hitungan kita dibulatkan ke angka bermakna (paket ke satuan, rupiah ke
  juta).

### 11.3 Tanggal dan waktu

- "5 Nov 2026"; dengan jam "5 Nov 2026, 07.00 WIB" (`jamWIB`, `format.js:10`). Tidak pernah ISO
  mentah di layar.
- Durasi lewat `fmt.durasi`: "6 jam 24 menit", "1 hari 10 jam".

### 11.4 Label tetap

| Konteks | Kata |
| --- | --- |
| Label sumber | Angka resmi, Sekunder, berita, Hitungan kita, Proksi, Asumsi |
| Hitungan bukan angka resmi | bukan IRB resmi, KIB usulan, usulan analis, daftar pendek, keputusan tetap di rapat |
| Saran | Saran, bukan penetapan |
| Data belum masuk | Belum ada data, Stok belum dilaporkan, Menunggu data dari ‹unit› |
| Batas bawah | batas bawah: dokumen di luar JDIH tidak terbaca |
| Tenggat | sisa ‹n› hari, lewat ‹n› hari, tanggal awal belum ada |
| Status sistem | Tayang, Disiapkan, Menunggu data, Ditunda, Dijalankan lokal |
| Tombol | Setujui, Tolak, Benar, Urungkan, Salin pesan WA, Unduh CSV, Unduh PDF, Buka, Muat ulang, Masuk staf |

### 11.5 Nama unit

Nama lengkap di `h1` halaman unit sesuai Perban 6/2025 jo. 11/2025 (contoh "Direktorat
Pengelolaan Logistik dan Peralatan"); singkatan di remah dan tab ("Dit. PLP"). Dit. KPOD
berlabel "Dit. Koordalops" di layar (bawaan U3).

## 12. Daftar periksa pengulas

`selera-angka`: format §11.2 dan §11.3; tiap angka punya `.un-lbl` dan `.un-per`; tidak ada
angka hitungan tanpa label; tidak ada "Sumber:" atau `.ex-ft`; tidak ada titik tengah.

`inp-reviewer`: ganti tab dan pemilih mengubah kontrolnya sendiri dulu, render isi lewat
`nanti()`; peta provinsi dimuat sekali lalu disimpan; tooltip satu pendengar terdelegasi.

Aksesibilitas (keduanya): §10, terutama `data-label` di tiap `td`, kontras pil 50%, dan
fokus terlihat.

Gerbang: halaman `/bnpb/unit/*` masuk daftar `LAYAR` di `tests/agen/gerbang-kartu-std.test.mjs`
begitu sistem pertama tayang; `unit.css` lolos `tests/agen/gerbang-tabel-rata.test.mjs`.

---

## Catatan untuk sesi induk

**Kontradiksi dan ketegangan yang ditemukan**

1. **Komentar kartu basi.** Komentar `public/inti/kartu.css:82-85` masih menggambarkan kaki
   keterangan dan sumber; basi sejak keputusan 4 Nov 2026 (sumber per angka sekarang lewat
   `data-sumber`, `title`, dan pil, KEPUTUSAN-AWAL §3 prinsip 3).
2. **Dua kepala situs.** Memori pemilik `kepala-situs-wajib` (28 Okt 2026) meminta
   `header.top` dari `public/inti/kepala.css` di tiap halaman; semua `public/bnpb/*.html`
   memakai `.ad-top`. Dokumen ini memilih `.ad-top` agar Ruang Unit sama dengan `/bnpb/*`.
   Perlu konfirmasi pemilik.
3. **Token yang tidak ada di `/bnpb`.** `.pc` dan `.seg` (`kartu.css`) memakai `--brand`,
   `--brand2`, `--shadow` dari `tema.css`; `admin.css` tidak mendefinisikannya dan tidak ada
   halaman `/bnpb` yang memuat `tema.css`. Dokumen ini meminta `tema.css` dimuat sebelum
   `bnpb.css` (§3) dan memakai `.ad-tabs`, bukan `.seg`, untuk deretan pilihan. Belum diuji di
   peramban; pengerja wajib memeriksa bahwa `body` dan token dasar tetap mengikuti `admin.css`.
4. **Kontras `.bn-pil` yang ada gagal AA** untuk `--c2`, `--c3`, `--c4`, `--c5`, `--ink3` di
   mode terang (2,46 sampai 3,95; §4.5). Komponen baru memakai campuran 50%; perbaikan
   `bnpb.css:23` sendiri di luar cakupan dokumen ini.
5. **Nama berkas bertabrakan.** riset 3 W1 mengusulkan `public/bnpb/wilayah.{html,js,css}`;
   `public/bnpb/wilayah.js` sudah ada sebagai pembantu bersama logbook dan siaga. Di Ruang Unit
   WIL-1 tinggal di `/bnpb/unit/wil`.
6. **Rumah layar.** Riset menaruh banyak sistem sebagai tab di layar lama (`kinerja`, `hukum`,
   `siaga`, `perencanaan`, `pendataan`, `logbook`, `meja`, `prediksi`, `mitra`), sedangkan
   KEPUTUSAN-AWAL §6 menaruh tiap sistem sebagai kartu di `/bnpb/unit/<kode>`. Dokumen ini
   mengikuti KEPUTUSAN-AWAL: kartu di halaman unit, layar lama ditautkan. Perubahan yang memang
   di dalam layar lama (pil konflik HUK-1 di `hukum.js`, tombol PD-3 di `/peringatan` dan
   `/prediksi`) tetap di sana dan kartu unit meringkas. DESAIN-TEKNIS perlu menetapkannya per
   sistem.
7. **KEU-1 dan IRT-1 tanpa layar.** KEU-1 berfase F1 tetapi riset 6 K1 menyebut skrip lokal
   tanpa layar; IRT-1 berfase F2 tetapi bawaan U9 melarang D1. Dirancang sebagai kartu
   "Dijalankan lokal" (§8.6).
8. **Ukuran WIL-2.** KEPUTUSAN-AWAL §5.1 menulis M; riset 3 W2 menulis "Ukuran kerja: L".
9. **RRS-3 di F1.** Riset 5 S3 memerlukan panen Dapodik dan data Kemenkes yang belum ada di
   repo dan "mungkin menolak panen massal"; definisi F1 "datanya sudah ada" tidak terpenuhi.

**Data yang tidak ditemukan**

- Tidak ada pola grafik bersama di `public/inti`: `garis()` dan `batang()` hidup di dalam IIFE
  `public/bnpb/kinerja.js:22-60`. Sebelum unit kedua memakai grafik, fungsinya perlu dipindah
  ke berkas bersama (bukan disalin). Keputusan untuk DESAIN-TEKNIS.
- Peta kab nasional sekaligus butuh 38 berkas `public/geo/kabupaten/*.json` (puluhan KB sampai
  hampir 300 KB per berkas). Dokumen ini memakai `public/geo/provinsi.json` untuk tampilan
  nasional dan memuat kab per provinsi saat dipilih.
- `PilihCantik` belum pernah dipakai di `public/bnpb/*`; layar `/bnpb` lain memakai `select`
  di `.bn-isian` (contoh `kinerja.css:33`). Memori pemilik meminta pemilih pil.

**Asumsi yang diambil**

- Awalan kelas `un-`, berkas `public/bnpb/unit/unit.css` dan `unit.js`, satu cangkang HTML untuk
  semua `/bnpb/unit/<kode>`; kode unit huruf kecil sama dengan kode KEPUTUSAN-AWAL §1.
- Warna label sumber: resmi `--c4`, sekunder `--c5`, hitungan `--c3`, proksi `--c2` (selaras
  `kinerja.css:10`: resmi c4, hitung c3, raster c2), asumsi `--c6`.
- Ikon baru §6 digambar untuk dokumen ini; belum ada di repo.
- Ambang "dekat" jam tenggat bawaan 30 hari mengikuti RRX-1; tenggat lain memakai ambang
  dari berkas aturan MB-2 bila ada.
