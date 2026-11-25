# Design system: Docs (revisi 3, 24 Nov 2026)

Revisi 3 menyusun ulang struktur dan bilah navigasi. Alasan (KEPUTUSAN-DOCS.md K6, K7, K8):
"terlalu padat untuk 1 halaman, restructurize dan pecah2 lagi, sesuaikan juga desain2 dan halamannya", "penjelasan pengguna dan
pengembang jgn disatuin", "ini gausah ada 2 nav ini, satuin aja coba gayanya, gausah ada selector bencana juga, fokusin halamannya
emg buat docs". Isi revisi 2 yang tidak disebut di sini tetap berlaku (token, tipografi, element, callout, tabel). Yang berubah:
satu bilah atas khusus Docs (tanpa kepala situs navy dan tanpa pemilih bencana), dua bagian terpisah (Panduan dan Pengembang) tanpa
pemilih sudut, satu topik menjadi satu modul berisi beberapa halaman pendek, bilah samping tiga tingkat, "Di halaman ini" hanya
`h2`. Struktur modul dan halaman bersumber dari `docs/centurisk97/peta.json` (DESAIN-TEKNIS.md bagian 4), bukan dari nama berkas.
Revisi 2 dahulu menolak tampilan revisi 1 ("JELEK BGT TAMPILANNYA TERLALU PENUH", "buat tampilannya kayak docs app pada umumnya",
K5); acuannya enam situs docs: Stripe, Vercel/Next.js, Tailwind, Supabase, Cloudflare Developers, Mintlify/GOV.UK.
Angka ukuran situs rujukan berasal dari ingatan peneliti, bukan hasil ukur; angka di dokumen ini adalah KEPUTUSAN rancangan kita
sendiri, ditinjau di `http://localhost:8800/docs` lalu disetel.

Urutan kerja mengikuti AGENTS.md §3.9: token, element, blocks, baru halaman. Docs tidak membuat gaya baru di tingkat halaman.
Semua warna dari `public/inti/tema.css` lewat `var(--...)`; `public/docs/docs.css` tidak memuat literal warna
(`#...`, `rgb(`, `hsl(`, `oklch(`), gerbang `tests/agen/gerbang-token-warna.test.mjs` menolaknya. Tidak ada properti kustom lokal
baru yang berisi literal warna (tinggi bilah atas boleh `calc()` atas `--jr-*`). Tanpa skrip inline. Tanpa kepala situs bersama dan
tanpa `kepala.js` (K8; pengecualian dari "kepala situs wajib", dicatat di KEPUTUSAN-DOCS.md K8). Tanpa "Pantau Bencana". Tanpa titik
tengah sebagai pemisah.

## 0. Keputusan desain

| Kode | Keputusan | Alasan dari riset |
| --- | --- | --- |
| DS-1 | Halaman adalah satu lajur bacaan di atas latar polos. Isi memakai `h2` biasa dengan garis pemisah halus, BUKAN kartu `.ex.ex-std`, tanpa pil kategori `.ex-ey` | Keenam situs memakai halaman polos; kartu di dalam kartu adalah sumber kesan "penuh" |
| DS-2 | Kartu hanya ada di beranda bagian dan halaman depan modul (kisi), satu tingkat, tanpa kartu di dalam kartu. Tombol Sebelumnya/Berikutnya berupa tombol berbingkai, bukan kartu | Stripe, Cloudflare, Mintlify |
| DS-3 | Tema TERANG bawaan; gelap lewat tombol tema di bilah atas Docs (`data-theme`, kunci dan nilai sama dengan `halaman_statis.js`; Docs tidak membuat tema ketiga) | Stripe, Tailwind, GOV.UK |
| DS-4 | Tiga kolom: bilah samping 288 px, isi maksimum 760 px (sekitar 75 karakter per baris), "Di halaman ini" 200 px; sisa lebar dibiarkan kosong | Semua situs rujukan |
| DS-5 | Bilah samping tiga tingkat: kelompok (label kapital kecil), modul (bisa dilipat, ikon kecil), halaman (menjorok, batang kiri aktif). Hanya bagian (Panduan atau Pengembang) yang sedang dibuka yang tampil | Supabase, Tailwind, Vercel |
| DS-6 | Status HIPOTESIS tampil SATU kali per halaman sebagai callout di awal bagian metode, dan sebagai satu lencana kecil di kartu halaman bila halamannya memuat hipotesis; tidak pernah di bilah samping | Mintlify |
| DS-7 | Teks isi rata kiri, bukan rata kanan-kiri (Q10, bawaan rata kiri) | Keenam situs rata kiri |
| DS-8 | Isi minimal 16 px, tinggi baris 1,7, jarak antarbagian 56 px; kelegaan dari jarak, bukan dari mengecilkan huruf | Stripe, Vercel, Mintlify |
| DS-9 | Tombol berhierarki: primer (satu per area), sekunder berbingkai, ikon polos. Tinggi 40 px, area ketuk 44 px di HP, fokus jelas | GOV.UK, Stripe |
| DS-10 | DIHAPUS. Pemilih sudut Pengguna, Pengembang, Semua tidak ada lagi; digantikan dua tab bagian di bilah atas (K6, K8). `sudut.js` dan atribut `data-sudut` dihapus | K6 |
| DS-11 | Tiap halaman pendek (sekitar 1.200 kata, paling banyak sekitar 6 `h2`), jadi tidak ada akordeon Referensi teknis: referensi teknis adalah halaman sendiri di bagian Pengembang. Di cetak semua terbuka | K7 |
| DS-12 | Pencarian menonjol: kotak lebar di tengah bilah atas, pintasan `/` dan `Ctrl+K`, hasil sebagai panel melayang dikelompokkan per modul dan menyebut bagian (Panduan atau Pengembang), panah dan Enter | Stripe, Tailwind, Supabase |
| DS-13 | Tabel lega dan dibungkus gulir datar; kepala tabel navy tua bertulisan putih (AGENTS.md §3.5), rata kiri (Q9) | Aturan repo menang |
| DS-14 | Tanpa gambar hero, tanpa gradien, tanpa bayangan berat; satu aksen (`--brand2`). Gambar diagram dari `public/docs/gambar/` tetap (gambar.css) | Semua situs rujukan |
| DS-15 | SATU bilah atas khusus Docs, bukan dua bilah: tidak ada kepala navy situs di atasnya. Tautan "Ke situs" di kanan membawa pembaca ke `/` | K8 |
| DS-16 | Halaman Docs tidak memuat pemilih bencana, menu situs, atau tombol Keluar; `<body data-tanpa-keluar>` tetap | K8 |

## 1. Token yang dipakai

Semua sudah ada di `public/inti/tema.css`. Tidak ada token baru yang wajib (usulan di §12).

| Keperluan | Token |
| --- | --- |
| Latar halaman, bilah samping, isi | `--paper` (satu warna; pemisah memakai garis `--line`, bukan blok warna berbeda) |
| Latar kartu beranda, panel cari, kotak cari | `--card` |
| Latar blok kode, kode inline, baris belang tabel, sorot hover | `--surface` |
| Teks utama, judul | `--ink` |
| Teks sekunder, remah roti, judul kelompok | `--ink2` |
| Garis | `--line` |
| Tautan, butir aktif, tab aktif, tombol primer | `--brand2`; teks tautan `--accent-tx` |
| Teks di atas tombol primer | `--on-brand` |
| Callout hipotesis dan peringatan | batang `--warn`, judul `--warn-tx`, latar `color-mix(in oklch, var(--warn) 12%, var(--paper))` |
| Callout catatan | batang `--info`, judul `--info-tx`, latar `color-mix(in oklch, var(--info) 10%, var(--paper))` |
| Lencana lulus, gagal | `--ok` dan `--ok-tx`, `--bad` dan `--bad-tx` |
| Kepala tabel | `--head-bg` dengan teks `--on-head` |
| Huruf | `--font` isi dan antarmuka, `--display` h1 dan h2 |
| Ukuran huruf | `--fs-1` sampai `--fs-8` (11, 12, 13, 14,5, 16, 18, 21, 28 px) |
| Jarak | `--jr-1` sampai `--jr-7` (4, 8, 12, 16, 20, 24, 32 px); nilai lain lewat `calc()` kelipatan `--jr-*` |
| Sudut | `--r-xs` 6, `--r-sm` 10, `--r` 16, `--r-pill` |
| Bayangan | `--shadow`, hanya untuk panel cari melayang dan laci HP |
| Tinggi kontrol | `--h-ctl` (40 px); tinggi bilah atas Docs `calc(var(--jr-7) * 2)` (64 px) |
| Gerak | `--dur-1`, `--dur-2`, `--ease` |

Ukuran di luar skala token: h1 36 px dan h2 26 px ditulis `calc(var(--fs-8) * 1.29)` dan `calc(var(--fs-8) * .93)`; tidak membuat token.
Panjang baris dibatasi `max-width:760px`.

## 2. Tipografi

| Elemen | Ukuran | Berat | Tinggi baris | Jarak |
| --- | --- | --- | --- | --- |
| Isi (paragraf, daftar) | 16 px (`--fs-5`) | 400 | 1,7 | paragraf 16 px bawah; butir daftar 8 px |
| Pengantar di bawah h1 | 18 px (`--fs-6`) | 400, `--ink2` | 1,55 | 24 px bawah |
| h1 topik | 36 px (28 px di HP) | 800, `--display` | 1,2 | 12 px bawah |
| h2 bagian | 26 px | 800, `--display` | 1,3 | atas 56 px dengan garis `--line` 1 px di atasnya (bagian pertama tanpa garis), bawah 16 px |
| h3 | 19 px | 700, `--display` | 1,35 | atas 32 px, bawah 8 px |
| h4 | 16 px | 700 | 1,4 | atas 24 px, bawah 4 px |
| Butir bilah samping | 14,5 px (`--fs-4`) | 500, aktif 700 | 1,3 | tinggi butir 34 px |
| Judul kelompok bilah samping | 12 px (`--fs-2`) | 800, kapital, spasi huruf .08em, `--ink2` | | atas 24 px, bawah 4 px |
| Daftar isi kanan | 13 px (`--fs-3`) | 500, aktif 700 | 1,4 | |
| Kode inline | 14 px | 500, monospasi | | |
| Blok kode | 13 px (`--fs-3`) | 400 | 1,6 | |
| Tabel | 14,5 px | | 1,5 | padding sel 12 px atas bawah, 16 px kiri kanan |

Isi rata kiri, `hyphens:none`. `overflow-wrap:anywhere` hanya di sel tabel dan kode.

## 3. Element

| Element | Aturan |
| --- | --- |
| Tautan isi | `--accent-tx`, garis bawah tipis (offset 2 px) selalu tampak, menebal saat sorot |
| Kode inline | Monospasi, latar `--surface`, sudut `--r-xs`, `user-select:all` |
| Blok kode | Latar `--surface`, garis `--line`, sudut `--r-sm`, gulir datar; tombol Salin di pojok kanan atas bertulisan "Salin", berubah "Tersalin" 1,5 detik; label bahasa 12 px di kepala blok bila fence menyebutnya |
| Rujukan `berkas:baris` | Kode inline |
| Lencana | Satu jenis: "Hipotesis" (`--warn`), "Lulus" (`--ok`), "Gagal" (`--bad`), "Belum diuji" (`--ink2` pada `--surface`); sudut `--r-pill`, 12 px, berat 700; selalu bertulisan. Hanya di dalam isi dan kartu beranda, tidak pernah di bilah samping |
| Tombol primer | Latar `--brand2`, teks `--on-brand`, tinggi 40 px, sudut `--r-sm`, 14,5 px berat 600; hover `color-mix(in oklch, var(--brand2) 88%, var(--ink))`; paling banyak satu per area (beranda: "Mulai dari Peta utama") |
| Tombol sekunder | Latar `--card`, garis 1 px `--line`, teks `--ink`; hover garis `--brand2` |
| Tombol ikon | 40 x 40 px, polos tanpa garis dan latar (pemilik: ikon tanpa kotak), hover latar `--surface`; label lewat `aria-label` dan `title` |
| Tab | Teks `--ink2` 14,5 px berat 600, tinggi 40 px, garis bawah 2 px transparan; aktif teks `--ink` dan garis bawah `--brand2` |
| Kotak cari | Tinggi 40 px, latar `--card`, garis `--line`, sudut `--r-pill`, ikon kaca pembesar, di kanan petunjuk `/` dalam kotak kecil `--surface` 12 px; fokus garis `--brand2` |

Keadaan tiap kontrol: biasa, sorot, fokus (garis luar 2 px `--brand2`, offset 2 px, tidak pernah dihapus), aktif (turun 1 px lewat
`transform`), nonaktif (opacity .5, kursor tidak boleh). Transisi `--dur-1` dengan `--ease`; dimatikan oleh `prefers-reduced-motion`.

## 4. Tata letak

### 4.1 Bilah atas Docs (satu-satunya bilah)

Satu bilah `header.dk-atas`, `position:sticky; top:0`, tinggi 64 px (`calc(var(--jr-7) * 2)`), latar `--paper`, garis bawah `--line` 1 px,
`z-index` di atas isi dan di bawah panel cari dan laci. Tidak ada kepala situs navy di atasnya (K8). Gutter 24 px (16 px di HP).
Urutan kiri ke kanan: tombol Menu (hanya di bawah 900 px), logo dan nama, kotak cari lebar di tengah, tab bagian, tombol tema, tautan Ke situs.

```
| [=] (logo) Centurisk97 Docs |  [ (kaca) Cari di Docs ........................ / ]  | Panduan | Pengembang |  (tema)  Ke situs ↗ |
```

| Bagian | Aturan |
| --- | --- |
| Logo dan nama | Logo Centurisk97 (berkas logo yang dipakai kepala situs) tinggi 28 px, teks "Centurisk97" 16 px berat 700 `--display`, dan "Docs" 16 px berat 800 `--brand2` di kanannya; seluruhnya satu tautan ke `/docs` (beranda Panduan) |
| Kotak cari | Lebar fleksibel, minimum 320 px, maksimum 560 px, di tengah; tinggi 40 px, aturan §3; pintasan `/` dan `Ctrl+K`; hasil §7.3 |
| Tab bagian | Dua tab bergaris bawah (aturan Tab §3): "Panduan" ke `/docs`, "Pengembang" ke `/docs/pengembang`. Aktif ditentukan bagian halaman sekarang: teks `--ink`, garis bawah 2 px `--brand2` menempel di tepi bawah bilah; tidak aktif `--ink2`. `nav` dengan `aria-label="Bagian"` dan `aria-current="page"` pada tab aktif (bukan `tablist`, karena tautan antarhalaman) |
| Tombol tema | Tombol ikon 40 px polos; mengganti `data-theme` terang dan gelap, mengingat pilihan di kunci yang sama dengan situs |
| Ke situs | Tombol sekunder kecil "Ke situs" dengan ikon panah keluar 16 px, tautan ke `/`; di HP tinggal ikon dengan `aria-label` |
| Menu | Hanya di bawah 900 px: tombol ikon "Menu" paling kiri membuka laci bilah samping (§4.2) |

Bilah atas tidak berisi pemilih bencana, menu situs, atau tombol Keluar. Di bawah 640 px bilah menjadi dua baris (tinggi total 104 px):
baris pertama menu, logo dan nama, tema, ikon Ke situs; baris kedua kotak cari lebar penuh. Tab bagian pindah ke atas isi sebagai dua
tombol selebar setengah (wireframe 9.2). Di 640 px ke atas semuanya satu baris.

### 4.2 Kolom dan bilah samping

Grid `grid-template-columns:288px minmax(0,760px) 200px`, `justify-content:center`, jarak kolom 40 px, padding atas 32 px,
`max-width:1400px`. Bilah samping dan "Di halaman ini" `position:sticky` pada `top:calc(var(--jr-7) * 2 + var(--jr-4))`, gulir sendiri,
batang gulir tipis.

| Lebar | Perilaku |
| --- | --- |
| 1200 px ke atas | Tiga kolom penuh |
| 900 sampai 1199 px | "Di halaman ini" pindah dari kanan menjadi satu `<details>` ringkas di atas isi; bilah samping 260 px |
| 640 sampai 899 px | Satu kolom; bilah samping menjadi laci kiri 320 px (maksimum 86 vw) dari tombol Menu, penutup `--head-bg` 45 persen; gutter 24 px |
| di bawah 640 px | Satu kolom; gutter 16 px; kisi satu kolom; Sebelumnya dan Berikutnya bertumpuk; tanpa gulir datar halaman |

Hanya bagian yang sedang dibuka (Panduan atau Pengembang) tampil di bilah samping. Struktur tiga tingkat dari `peta.json`:

```
 PANTAU BAHAYA                       <- kelompok: 12 px kapital, --ink2, atas 24 px
   [ik] Peta karhutla           v     <- modul: ikon 16 px, 14,5 px berat 600, bisa dilipat
          Sekilas dan cara masuk      <- halaman: menjorok 32 px, 14 px
        | Membaca peta, status...     <- halaman aktif: batang kiri 3 px --brand2, berat 700
          Titik panas dan cluster
   [ik] Data karhutla dari...   >
```

| Tingkat | Aturan |
| --- | --- |
| Kelompok | Tidak bisa dilipat; hanya judul kecil. Kelompok khusus satu bagian ditentukan `peta.json` (`kelompok[].bagian`) |
| Modul | Satu `<details>` per modul; tinggi butir 36 px, ikon dari `IKON` di `bangun.py`, judul sampai dua baris (maksimum 40 karakter, diuji di `tests/docs`), panah kecil di kanan. HANYA modul halaman aktif yang terbuka; modul lain tertutup. Mengetuk judul modul membuka halaman depan modul (`/docs/<modul>` atau `/docs/pengembang/<modul>`); panah hanya melipat |
| Halaman | Satu sampai dua baris, tinggi butir minimum 32 px, padding kiri 32 px, 14 px; aktif: teks `--accent-tx` berat 700, latar `--surface`, batang kiri 3 px `--brand2`; hover latar `--surface`. Judul halaman maksimum 40 karakter |
| Atas daftar | Tautan "Beranda Panduan" atau "Beranda Pengembang" bila bukan beranda |

Keadaan lipatan tidak diingat antarsesi (satu aturan: yang aktif terbuka). Perpindahan halaman memakai navigasi mulus yang sudah ada
(`docs.js`): bilah samping tetap, hanya penanda aktif dan lipatan diperbarui. Gulir bilah samping memusatkan butir aktif saat dimuat.

### 4.3 Isi halaman

Urutan dari atas: remah roti, h1, satu kalimat pengantar, baris aksi, isi, kaki halaman.

| Elemen | Aturan |
| --- | --- |
| Remah roti | `Docs / <Modul> / <Halaman>` 13 px `--ink2`; "Docs" ke beranda bagian yang sedang dibuka, modul ke halaman depan modul. Di Pengembang: `Docs / Pengembang / <Modul> / <Halaman>` |
| h1 | Judul halaman (maksimum 40 karakter, awam dan spesifik) 36 px, 28 px di HP |
| Pengantar | Satu kalimat 18 px `--ink2`: kutipan blok pembuka berkas sumber halaman itu |
| Baris aksi | Kanan sejajar h1 pada layar lebar: tombol ikon "Salin tautan halaman" dan "Cetak" |
| Isi | Hanya `h2` dan `h3` (paling banyak sekitar 6 `h2`, sekitar 1.200 kata), tanpa kartu; jangkar `#` tampak saat sorot |
| Batasan | Halaman terakhir tiap modul: Batasan dan tanya jawab (Panduan) atau Batasan dan pertanyaan terbuka (Pengembang) |
| Lencana | Aturan §3; tidak ada lencana di bilah samping |

### 4.4 Halaman depan modul

`/docs/<modul>` dan `/docs/pengembang/<modul>`: remah roti, h1 judul modul, satu kalimat ringkas (`ringkas` di `peta.json`), lalu kisi
kartu halaman bernomor dalam urutan baca (2 kolom di 1440 px, 1 kolom di bawah 900 px). Kartu: latar `--card`, garis `--line`, sudut `--r`,
padding 20 px; nomor "1", "2", ... 13 px `--ink2` di atas judul, judul 16 px berat 700, SATU kalimat dua baris maksimum
(kalimat pembuka isi halaman, diambil generator), lencana "Hipotesis" kecil hanya bila halamannya memuat hipotesis. Seluruh kartu
satu tautan; hover garis `--brand2`. Di bawah kisi: tombol primer "Mulai dari halaman 1".

### 4.5 "Di halaman ini"

Judul kecil kapital, daftar HANYA `h2` (tanpa `h3`), 13 px, garis vertikal 2 px `--line` di kiri; butir yang sedang dibaca `--accent-tx`
berat 700 dan garis `--brand2` (pengamat `IntersectionObserver` di `docs.js`; tanpa skrip tetap daftar tautan). DISEMBUNYIKAN bila halaman
punya kurang dari 2 `h2` (generator tidak menulis elemennya). Karena tiap halaman paling banyak sekitar 6 `h2`, daftar tidak pernah lebih
dari sekitar 6 baris (keluhan "sampai 30 baris" selesai di sini).

### 4.6 Kaki halaman

Dua tombol selebar setengah, berbingkai (`--line`, sudut `--r`): kiri "Sebelumnya", kanan "Berikutnya", masing-masing label kecil di atas
judul halaman tujuan dan panah. Urutan mengikuti urutan baca SELURUH bagian: halaman-halaman modul berurutan, lalu halaman pertama modul
berikutnya (menurut urutan kelompok dan modul di bilah samping); label tujuan memuat nama modul bila beda ("Banjir: Sekilas dan peta
banjir"). Halaman pertama bagian tanpa Sebelumnya, terakhir tanpa Berikutnya. Di bawahnya satu baris "Dibangun 24 November 2026" dan tautan
"Docs". Tombol penilaian tidak dibuat (Q11). Pindah bagian bukan lewat Sebelumnya atau Berikutnya.

## 5. Navigasi: struktur dari `peta.json`

Tidak ada lagi kamus `LABEL_NAV` atau daftar slug di `bangun.py` atau di dokumen ini: kelompok, modul, halaman, judul, ikon, dan ringkasan
HANYA ada di `docs/centurisk97/peta.json`. Per 24 Nov 2026 (kondisi, bukan konstanta; uji tidak mengeraskan angka): 14 modul, Panduan 129
halaman (rata-rata sekitar 550 kata per halaman, terbesar sekitar 1.030), Pengembang 178 halaman (rata-rata sekitar 700 kata, terbesar
sekitar 1.300).

| Kelompok Panduan | Modul |
| --- | --- |
| Mulai | arsitektur |
| Pantau bahaya | peta-karhutla, data-karhutla, banjir, gempa-gunungapi, cuaca-udara |
| Prediksi dan model | model-sebaran, prediksi |
| Kerja lapangan | lapor, siklus, operasi, kampus-sippa |
| Ruang staf dan akun | ruang-bnpb, akses |

| Kelompok Pengembang | Modul |
| --- | --- |
| Mulai dan arsitektur | arsitektur |
| Karhutla dan udara | peta-karhutla, data-karhutla, cuaca-udara, model-sebaran, operasi |
| Bencana lain dan prediksi | banjir, gempa-gunungapi, prediksi |
| Aplikasi dan akses | lapor, siklus, ruang-bnpb, akses |
| Kemitraan dan air | kampus-sippa |

Halaman pertama tiap modul adalah `sekilas` (Panduan) atau `ikhtisar` (Pengembang); halaman terakhir adalah `batasan`. Aturan pemecahan:
satu metode satu halaman; halaman layar boleh menggabung dua sampai tiga fitur kecil; paling banyak sekitar 6 `h2` dan sekitar 1.200 kata per
halaman; judul awam dan spesifik, paling banyak 40 karakter.

## 6. Bagian isi dan callout

### 6.1 Bagian

Berkas sumber halaman (bukan berkas modul lama berlima bagian) berisi `h2` dan `h3` biasa dengan nama apa adanya, tanpa lima bagian baku
(Ringkasan, Panduan pengguna, Metode, Referensi teknis, Batasan) sebagai pembungkus; isi halaman Panduan memakai bahasa awam dan halaman
Pengembang memuat referensi teknis. Ikon bagian, pil kategori, dan kartu dihapus. Callout Hipotesis tampil di awal bagian metode halaman yang memuat model hipotesis.

### 6.2 Callout

Satu gaya: kotak sudut `--r-sm`, batang kiri 3 px, padding 12 px 16 px, ikon 18 px di kiri, judul pendek tebal satu baris lalu isi 15 px.
Tiga jenis, ditulis di Markdown sebagai kutipan blok yang diawali penanda `Catatan:`, `Peringatan:`, atau `Hipotesis:`; generator
mengubahnya. Kutipan blok lain tetap kutipan biasa (garis kiri `--line`, teks `--ink2`).

| Jenis | Batang | Latar | Dipakai untuk |
| --- | --- | --- | --- |
| Catatan | `--info` | campuran `--info` 10 persen | Penjelasan tambahan |
| Peringatan | `--warn` | campuran `--warn` 12 persen | Batas data, cara yang keliru |
| Hipotesis | `--warn` | campuran `--warn` 12 persen, lencana "Hipotesis" di judul | Model belum lulus uji balik. SATU per topik, di awal bagian Metode, merinci model apa yang masih hipotesis dan rujukan vonisnya |

Generator menurunkan callout Hipotesis dari pil hipotesis yang sudah ada di sumber (D6), lalu tidak lagi menampilkan pil di bilah samping.
Pil di sel tabel tetap sebagai lencana bertulisan.

## 7. Beranda per bagian

Ada dua beranda: `/docs` (Panduan) dan `/docs/pengembang` (Pengembang). Susunannya sama, isinya beda. Tidak ada beranda gabungan dan tidak ada
tombol untuk menggabungkan keduanya.

### 7.1 Beranda Panduan, dari atas

1. Hero pendek tanpa gambar: h1 "Panduan Centurisk97" 36 px, satu kalimat 18 px (cara memakai tiap halaman dan cara tiap angka dihitung,
   dalam bahasa awam), kotak cari BESAR (tinggi 52 px, selebar kolom, petunjuk `/`) yang mencari di seluruh Docs, dan satu tombol sekunder
   "Panduan untuk pengembang" ke `/docs/pengembang`.
2. "Mulai dari sini": satu baris kartu polos per peran dari `mulai.panduan` di `peta.json` (warga atau pelapor, petugas BPBD, staf BNPB, mitra
   kampus). Tiap kartu berisi judul peran, satu kalimat, dan tiga sampai empat tautan halaman. Empat kolom di 1440 px, dua di tablet, satu di HP.
3. "Telusuri per kelompok": tiap kelompok satu `h2` kecil, lalu kisi kartu modul: ikon 20 px `--brand2`, judul modul, `ringkas` (satu kalimat
   awam, maksimum dua baris), dan jumlah halaman ("9 halaman"). 3 kolom di 1440 px, 2 di tablet, 1 di HP, jarak 16 px. Seluruh kartu tautan
   ke halaman depan modul.
4. Di bawah: cakupan dan cara membaca dari `README.md` (satu `h2` pendek, bukan kartu).

### 7.2 Beranda Pengembang

Sama dengan 7.1: h1 "Docs untuk pengembang", kotak cari besar, tombol sekunder "Kembali ke panduan", "Mulai dari sini" dari `mulai.pengembang`
(pengembang baru, pemakai API dan data, peneliti model, operator sistem), lalu kisi modul per kelompok Pengembang dengan `ringkas.pengembang`.

### 7.3 Hasil cari

Panel melayang di bawah kotak cari, selebar kotak (minimum 360 px), sudut `--r`, `--shadow`, tinggi maksimum 60 vh, dikelompokkan per modul
(judul kelompok kecil kapital berisi nama modul dan tanda bagian "Panduan" atau "Pengembang", lalu baris: judul halaman tebal 14,5 px,
cuplikan 13 px dua baris dengan `mark` dari token). Hasil dari bagian yang sedang dibuka tampil lebih dulu. Papan kunci: panah atas bawah,
Enter membuka, Esc menutup dan mengembalikan fokus. Tanpa hasil: kalimat "Tidak ada hasil, coba kata lain" dan tautan ke beranda bagian.

## 8. Tabel dan kode

| Aturan | Nilai |
| --- | --- |
| Pembungkus | `.tabel-gulir`: gulir datar di dalam pembungkus, garis `--line`, sudut `--r-sm`, jarak bawah 24 px, tidak pernah melebihi kolom isi |
| Kepala | `--head-bg`, teks `--on-head`, rata kiri, berat 700, 14 px, maksimum dua baris |
| Sel | 14,5 px, padding 12 px 16 px, garis atas `--line`, `vertical-align:top`; baris belang `--surface` |
| Kolom pertama | Tidak membungkus hanya bila pendek (kurang dari 24 karakter), selain itu boleh membungkus |
| Lebar minimum | Tabel lebih dari 4 kolom diberi `min-width:640px`; gulir datar muncul di HP dengan bayangan tepi sebagai petunjuk |
| Jumlah kolom | Lebih dari 6 kolom diberi peringatan oleh generator; penulis memecah atau mengubahnya menjadi daftar definisi |

## 9. Wireframe

### 9.1 Halaman, 1440 px

```
+---------------------------------------------------------------------------------------------------------+
| (logo) Centurisk97 Docs  [ (kaca) Cari di Docs ................ / ]  Panduan|Pengembang  (tema) Ke situs ↗  |
+---------------------------------------------------------------------------------------------------------+
|  PANTAU BAHAYA        |  Docs / Banjir, rob, dan penurunan tanah / Status banjir   | DI HALAMAN INI    |
|  [ik] Banjir       v  |                                                            |  Status per kec   |
|        Sekilas...     |  Status banjir per kecamatan dihitung        [salin][cetak] |  Dari hujan       |
|      | Status banjir  |  Satu kalimat pengantar 18 px abu...                        |  Cara mengubah    |
|        Hujan lebat... |  -----------------------------------------------           |  Contoh           |
|        Skor kejadian  |  Status per kecamatan                                       |                   |
|        Rob            |  Paragraf 16 px, baris maks 75 karakter...                  |                   |
|  [ik] Gempa, gunung > |  -----------------------------------------------           |                   |
|  [ik] Cuaca, udara  > |  Cara mengubah angka jadi status                            |                   |
|  PREDIKSI DAN MODEL   |  [! Hipotesis] ... tabel lega (kepala navy tua)              |                   |
|  [ik] Prediksi      > |                                                            |                   |
|  KERJA LAPANGAN       |  [< Sebelumnya: Sekilas]        [Berikutnya: Hujan lebat >]  |                   |
|  ...                  |  Dibangun 24 November 2026       Docs                       |                   |
+---------------------------------------------------------------------------------------------------------+
```

### 9.2 Halaman, 390 px

```
+--------------------------------+
| [=] (logo) Docs   (tema) (↗)   |
| [ (kaca) Cari di Docs ...   ]  |
+--------------------------------+
| [Panduan      ][Pengembang   ] |
| Docs / Banjir / Status banjir  |
| Status banjir per kecamatan... |
| Satu kalimat pengantar         |
| [Salin tautan] [Cetak]         |
| > Di halaman ini (lipat)       |
|--------------------------------|
| Status per kecamatan           |
| paragraf 16 px, gutter 16      |
|--------------------------------|
| Cara mengubah angka jadi...    |
| [tabel dalam gulir datar ->]   |
|--------------------------------|
| [< Sebelumnya      ]           |
| [      Berikutnya >]           |
+--------------------------------+
Laci (tombol [=]): panel kiri 86 vw berisi kelompok, modul, halaman bagian yang dibuka.
```

### 9.3 Beranda Panduan, 1440 px

```
| (logo) Centurisk97 Docs   [ Cari ............... / ]   Panduan|Pengembang   (tema) Ke situs ↗       |
|                                                                                                       |
|                      Panduan Centurisk97                                                              |
|                      Cara memakai tiap halaman dan cara tiap angka dihitung.                         |
|                      [ (kaca)  Cari di Docs ...................................... / ]              |
|                      [Panduan untuk pengembang]                                                      |
|                                                                                                       |
|                      MULAI DARI SINI                                                                  |
|                      +-----------+ +-----------+ +-----------+ +-----------+                          |
|                      | Warga     | | Petugas   | | Staf BNPB | | Mitra     |                          |
|                      +-----------+ +-----------+ +-----------+ +-----------+                          |
|                      PANTAU BAHAYA                                                                    |
|                      +-------------+ +-------------+ +-------------+                                  |
|                      | (ik) Peta   | | (ik) Data   | | (ik) Banjir |   kisi 3 kolom                   |
|                      | karhutla    | | karhutla    | | ...         |   9 halaman                      |
|                      +-------------+ +-------------+ +-------------+                                  |
```

Di 390 px beranda satu kolom: bilah atas dua baris, hero, kotak cari, tombol, kartu peran bertumpuk, kisi modul satu kolom; bilah samping jadi laci.
Beranda tidak memakai bilah samping (isi di tengah, lebar maksimum 1040 px); bilah samping muncul mulai halaman depan modul.

## 10. Aksesibilitas, cetak, performa

Kontras teks lolos AA 4,5 banding 1 (token `*-tx`). `nav` berlabel; `aria-current="page"` pada halaman aktif dan tab bagian aktif.
Tautan "Lompat ke isi" paling awal di `body`. Area ketuk 44 px di HP. Lencana tidak hanya warna. Cetak: kepala, bilah samping, daftar isi,
tab bagian, kotak cari, dan tombol aksi disembunyikan; semua bagian terbuka; tabel tidak terpotong di tengah baris; tautan menampilkan
alamatnya; huruf 11 pt. Tidak ada animasi selain transisi fokus dan laci. `docs.css` di bawah plafon gerbang ukuran (24 KB; gaya gambar di `gambar.css`); tanpa gambar hero.

## 11. Yang dihapus dari tampilan sekarang

1. Kepala situs navy bersama (`header.top` dari `kepala.css`), `kepala.js`, pemilih bencana, menu situs, dan tombol Keluar di halaman Docs (K8).
2. Baris kedua "Kepala Docs" di bawah kepala situs (revisi 2); keduanya digantikan SATU bilah atas Docs.
3. Pemilih sudut Pengguna, Pengembang, Semua, `sudut.js`, dan atribut `data-sudut` (K6); diganti dua tab bagian.
4. Satu halaman berisi seluruh modul dengan lima bagian baku (Ringkasan, Panduan pengguna, Metode, Referensi teknis, Batasan); diganti
   modul berisi halaman pendek (K7). Referensi teknis menjadi halaman bagian Pengembang.
5. "Di halaman ini" yang memuat `h3` dan bisa sampai 30 baris.
6. Daftar 14 topik datar dan kamus `LABEL_NAV`; diganti struktur tiga tingkat dari `peta.json`.
7. Yang sudah dihapus di revisi 2 tetap hilang: kartu `.ex.ex-std` per bagian, pil `.ex-ey`, pil hipotesis di bilah samping, teks rata
   kanan-kiri, kotak cari di bilah samping.

## 12. Usulan token baru (tidak dibuat tanpa persetujuan)

Tidak ada token baru yang wajib; `color-mix()` dan `calc()` atas token yang ada menutup kebutuhan. Bila pemilik mau menyeragamkan,
usulan untuk `tema.css`: `--tint-info`, `--tint-warn` (latar callout), `--hover-brand` (hover tombol primer), `--fs-h1` (36 px), `--fs-h2` (26 px).

## 13. Yang tidak dibuat

Palet sendiri, gradien baru, hero bergambar, tema selain terang dan gelap, huruf baru di luar yang dimuat tema situs, bilah gelap per bagian, kartu dengan kalimat kesimpulan, kaki Sumber, skrip inline, tombol penilaian yang mengirim data (Q11), terjemahan Inggris (Q4), pemilih bencana atau menu situs di Docs (K8), pemilih sudut (K6), beranda gabungan Panduan dan Pengembang.
