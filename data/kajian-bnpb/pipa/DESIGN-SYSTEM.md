# DESIGN-SYSTEM SIPPA: web `/pipa`, buku, dan deck

Dokumen ketiga dalam urutan otoritas AGENTS.md §2.1. Kalah dari `KEPUTUSAN-SIPPA.md`
dan `PRD.md`; menang atas `DESAIN-TEKNIS.md`, `KERANGKA-BUKU.md`, `RENCANA-UJI.md`, dan
`TIKET.md` untuk semua hal rupa: token, komponen, tata letak layar, gaya gambar buku dan
deck, serta kalimat antarmuka. Disusun 25 Okt 2026 dari berkas yang sudah ada di repo;
tidak ada gaya baru yang dikarang. Bila sebuah layar atau gambar butuh sesuatu yang tidak
tertulis di sini, pengerja berhenti dan bertanya (AGENTS.md §2.1), tidak menambah token
sendiri.

Singkatan di dokumen ini: **W** = web `/pipa`, **D** = dokumen cetak (buku DOCX/PDF,
laporan PDF otomatis, gambar teknik), **S** = deck PPTX. Rujukan "S7" atau "L42" menunjuk
butir Selera presentasi dan Selera laporan di `docs/buku-pegangan/pantau-bencana.md`.

---

## 1. Prinsip dan sumber token

### 1.1 Prinsip

1. **Dua keluarga token, satu arti.** Web memakai token CSS Pantau Bencana (oklch dan hex
   admin, Inter dan Plus Jakarta Sans, terang dan gelap). Dokumen cetak dan deck memakai
   token `data/kajian-bnpb/tema.json` (hex, Roboto, hanya terang). Kedua keluarga tidak
   dicampur: hex tema tidak diketik di CSS `/pipa`, nilai oklch tidak diketik di generator
   DOCX, PPTX, atau jsPDF. Yang sama di kedua keluarga adalah **arti** (nama semantik di
   §2.1.3) dan **penanda bukan-warna** (huruf zona, pola isi, ikon, label).
2. **Pakai yang ada, jangan salin.** Komponen bersama dimuat dari `public/inti/` dan
   `public/admin/` (PRD §9.2). Gaya baru SIPPA hanya di satu berkas `public/pipa/pipa.css`
   dengan awalan kelas `sp-`, dan isinya hanya yang belum ada di repo.
3. **Warna tidak pernah satu-satunya pembawa makna.** Zona memakai huruf A–D dan pola isi;
   status memakai ikon dan label; vonis memakai kata (PRD §9.13, `tema.json` kategori
   `_aturan`).
4. **Angka membawa sumber, waktu, dan keyakinan.** Tiap kartu, tabel, grafik, dan peta
   punya `Sumber:`, waktu data, dan pil keyakinan (KEPUTUSAN 29, PRD §1.5).
5. **Chrome dulu, isi kemudian.** Tiap kontrol mengubah tampilannya sendiri di handler,
   kerja berat lewat `nanti()` atau Web Worker (`~/.claude/INP.md`, PRD §9.13).
6. **Satu angka, satu sumber.** Angka di web, laporan PDF, buku, dan deck dibaca dari JSON
   atau D1 yang sama lewat fungsi hitung yang sama (`public/pipa/hitung.js` dan kembar
   Pythonnya, PRD §9.3; `angka.json` kunci `pipa.*`, PRD §8.3).

### 1.2 Peta sumber token

| Kelompok | Berkas dan baris | Dipakai untuk |
| --- | --- | --- |
| Token tema web (warna, bayangan, radius, huruf, terang/gelap) | `public/inti/tema.css:2–24` | W: `--brand`, `--ok`, `--warn`, `--bad`, `--info`, `--f0`–`--f3`, `--shadow`, `--shadow-lg`, `--r`, `--r-sm`, `--top`, `--font`, `--display` |
| Dasar halaman, `.lbl`, `.toast` | `public/inti/tema.css:26–29` | W: label kapital, toast |
| Token admin (hex, navy, emas, bayangan bertingkat) | `public/admin/admin.css:4–12` | W: `--paper`, `--card`, `--surface`, `--ink`, `--ink2`, `--ink3`, `--line`, `--soft`, `--navy`, `--navy2`, `--emas`, `--c1`–`--c8`, `--gradien`, `--ring`, `--bayang` |
| Header, nav, tombol, chip, segmen, tab, tabel, kartu, grafik admin | `public/admin/admin.css:22–318` | W: `.ad-top`, `.ad-tombol`, `.ad-chip`, `.ad-seg`, `.ad-tabs`, `.ad-tabel`, `.ad-kartu`, `.ad-kpi`, `.ad-grafik`, `.ad-tip`, `.ad-spanduk`, `.ad-galat`, `.ad-hantu` |
| Segmen, PilihCantik, tooltip, paginasi | `public/inti/kartu.css:3–79` | W: `.seg`, `.pc`, `.pc-menu`, `#tip`, `.pgn` |
| Kartu Insight, pil angka `.pl` | `public/inti/insight.css:2–43` | W: `.ex`, `.ex-hd`, `.ex-ey`, `.ex-bd`, `.ex-ft`, `.hl`, `.pl` |
| Mesin kartu | `public/inti/kartu.js:9–33` | W: `Kartu.ex`, `Kartu.kartu`, `Kartu.hl`, `Kartu.seg`, `Kartu.pil` |
| Format angka dan waktu | `public/inti/format.js:5–16` | W, laporan PDF: `fmt`, `esc`, `jamWIB`, `rb`, `fmt.durasi` |
| Tunda kerja berat | `public/inti/nanti.js:3–4` | W: `nanti()` |
| Paginasi dan urut kolom | `public/inti/tabel.js` | W: `paginasi()` |
| Pemilih kustom | `public/inti/pilih.js` | W: `PilihCantik` |
| Tooltip | `public/inti/tip.js` | W: `rapikanTip`, `pasangTip` |
| Fokus, `.sr`, angka tabular | `public/inti/gaya.css:5–7` | W: nilai disalin ke `pipa.css` karena `gaya.css` tidak dimuat (§1.3) |
| Peta: panel, lembar bawah HP, legenda, layar muat | `public/inti/peta.css:8–41`, `peta.css:114–121`, `peta.css:157`, `peta.css:166–176` | W: tata letak peta dan lembar bawah |
| Ikon peta garis | `public/inti/peta/lapis.js:7–23` | W: ikon `peta`, `satelit`, `peringatan`, `bel`, `perisai`, `debit`, `jalan`, `sungai`, `orang` |
| Form lapangan (sentuh besar, satu tangan) | `public/lapangan.css:1–34` | W: `/pipa/lapangan` |
| Kerangka halaman admin, huruf, CSP | `src/admin_halaman.js:6–17`, `:19`, `:170` | W: cangkang `halamanSippa`, Google Fonts Inter + Plus Jakarta Sans |
| Huruf PDF | `public/inti/roboto.js:1–11` | laporan PDF otomatis |
| Huruf dokumen | `data/kajian-bnpb/tema.json:12–23` (`font`) | D, S: Roboto Regular/Medium/Bold |
| Warna dokumen | `tema.json:24–106` (`warna.inti`, `aksen`, `arah`, `tint`, `kategori`, `skala`, `terlarang`) | D, S |
| Validasi warna | `tema.json:107–117` (`validasi`) | D, S: ΔE dan kontras minimum |
| Halaman, objek, spasi, garis | `tema.json:143–208` | D |
| Tipografi DOCX | `tema.json:209–245` | D |
| Kepala dan kaki halaman | `tema.json:246–271` | D, laporan PDF |
| Kotak | `tema.json:272–284` | D |
| Peta cetak | `tema.json:285–322` (`peta`) | D, S |
| Grafik cetak | `tema.json:323–367` (`grafik`) | D, S |
| Ukuran slide, tipografi grafik docx/slide | `tema.json:368–416` (`visual`) | D, S |
| Registri ikon dan glif | `tema.json:417–497` (`ikon`, `glif`) | D, S |
| Kosakata (keyakinan, nada pil, istilah terlarang) | `tema.json:498–` (`kosakata`; `keyakinan` baris 517, `nada_pil` 587, `istilah` 618) | D, S, dan label W |
| Kerangka slide, judul, skala huruf, warna deck | `docs/buku-pegangan/pantau-bencana.md` bab Selera presentasi (kerangka halaman, Judul, Tipografi dan warna, Komponen, S1–S39) | S |
| Tata letak laporan, anatomi gambar dan tabel | Buku Pegangan bab Selera laporan (L1–L72) | D |
| Peta, grafik, diagram vektor, deck kajian | `data/kajian-bnpb/PEDOMAN-DESAIN.md` §B5.9, §B5.10, §B5.23, §B7.2, §C4–C6 | D, S |
| Angka dan copy situs | Buku Pegangan bab Angka & copy | W |
| Interaksi | `~/.claude/INP.md`; Buku Pegangan bab Interaksi | W |
| Data dummy | `~/.claude/DUMMY.md`; PRD §9.14 | W |

### 1.3 Urutan muat gaya di cangkang `/pipa`

Cangkang `halamanSippa(ctx)` memuat persis, dalam urutan ini:

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap
/inti/tema.css      token tema terang/gelap, .lbl, .toast
/admin/admin.css    token admin (menimpa --paper, --card, --surface, --ink, --ink2, --line), kerangka ad-*
/inti/kartu.css     .seg, .pc, #tip, .pgn
/inti/insight.css   .ex, .pl
/pipa/pipa.css      hanya kelas sp-*
```

Yang sengaja **tidak** dimuat, dengan alasannya:

| Berkas | Alasan |
| --- | --- |
| `public/inti/gaya.css` | `main{position:fixed}` dan `html,body{height:100%}` merusak halaman admin yang menggulir; tiga aturan kecilnya (`.num`, `:focus-visible`, `.sr`) disalin ke `pipa.css` dengan komentar asal baris |
| `public/inti/tabel.css` | selektor global `table`, `thead th`, `tbody td` menimpa latar gradien `.ad-tabel`; aturan `dialog.dlg` di baris 47–53 dijadikan acuan nilai `.sp-dialog` (§3.16) |
| `public/inti/peta.css` | memuat aturan halaman peta publik penuh layar; `pipa.css` memakai nilai ukurannya (panel 440 px, lembar 96 px / 46% / 72%, legenda 11,5 px) lewat kelas `sp-peta-*` |

Hasil pemetaan token setelah urutan muat ini: nilai admin menang untuk warna permukaan dan
teks (`--paper` #f5f7fb, `--card` #fff, `--ink` #0b2545, dst.), nilai tema tetap berlaku
untuk token yang hanya ada di `tema.css` (`--brand`, `--ok`, `--warn`, `--bad`, `--info`,
`--f2`, `--shadow`, `--r`). Ukuran huruf dasar badan 14px (admin.css:14 menang atas
tema.css:26).

### 1.4 Versi dan perubahan

Token baru, ikon baru, atau kelas `sp-` baru masuk lewat perubahan dokumen ini lebih dulu,
baru kode. Mengganti nilai token yang sudah dipakai layar adalah perubahan besar: dicatat di
tabel di bawah dengan daftar layar terdampak dan diulas `selera-angka` dan `inp-reviewer`.
Kelas `sp-` tidak dihapus diam-diam; yang diganti ditandai usang satu rilis lebih dulu.

| Versi | Tanggal | Isi |
| --- | --- | --- |
| 1 | 25 Okt 2026 | versi awal dari PRD §8–§9 dan token repo; validator warna dan kontras dijalankan |

---
## 2. Token

### 2.1 Warna

#### 2.1.1 Warna dasar web (nilai persis dari CSS)

Terang = bawaan; gelap = `@media (prefers-color-scheme:dark){:root:not([data-theme="light"])}`
dan `:root[data-theme="dark"]` (kedua blok wajib ada untuk setiap token gelap baru, pola
tema.css:13–24 dan admin.css:9–12).

| Token | Terang | Gelap | Sumber | Pakai |
| --- | --- | --- | --- | --- |
| `--paper` | #f5f7fb | #0b1220 | admin.css:4, :9 | latar halaman |
| `--card` | #fff | #131c30 | admin.css:4, :9 | kartu, panel, menu |
| `--surface` | #edf2f8 | #1a2540 | admin.css:4, :9 | isian, latar segmen, baris sorot |
| `--soft` | #eef1f6 | #1c2740 | admin.css:4, :9 | latar kosong batang |
| `--ink` | #0b2545 | #eef1f7 | admin.css:4, :9 | teks utama |
| `--ink2` | #5b6782 | #aab4c8 | admin.css:4, :9 | teks sekunder, label |
| `--ink3` | #8a93a8 | #7c879e | admin.css:4, :9 | teks redup, sumbu grafik (hanya ≥ 12px bold atau non-teks) |
| `--line` | #e3e7ef | #26314a | admin.css:4, :9 | garis, batas |
| `--navy` | #0b2545 | #0b2545 (tidak berubah) | admin.css:4 | latar `.ad-tip`; jangan dipakai untuk teks di kartu gelap |
| `--navy2` | #1d4e89 | sama | admin.css:4 | ujung gradien |
| `--emas` | #c9a227 | sama | admin.css:4 | cincin tab/chip aktif, garis bawah kepala tabel |
| `--gradien` | linear-gradient(135deg,#1d4e89,#0b2545) | sama | admin.css:6 | header, tombol utama, chip/tab aktif, kepala tabel |
| `--c1`–`--c8` | #c9503a, #e58a45, #e3b94e, #5a9e74, #4f8fc4, #5f6fb0, #2b8c86, #7a2b2b | sama | admin.css:5 | `.ad-galat` (c1), `.ad-spanduk` (c3), tautan (c5); tidak dipakai untuk arti baru SIPPA |
| `--brand` | oklch(25.5% .075 256) | oklch(64% .12 252) | tema.css:5, :16 | segmen aktif `.seg` |
| `--brand2` | oklch(42% .11 255) | oklch(70% .11 250) | tema.css:5, :16 | pil kategori `.ex-ey`, tautan tabel |
| `--accent` | oklch(68% .09 252) | oklch(72% .1 252) | tema.css:5, :16 | status kit `depot` |
| `--ok` | oklch(62% .16 150) | sama | tema.css:6 | zona A, vonis KONDISIONAL, G4 LULUS |
| `--warn` | oklch(76% .16 75) | sama | tema.css:6 | zona C, HOLD, SIAGA, servis |
| `--bad` | oklch(57% .21 27) | sama | tema.css:6 | zona D, NO-GO, hilang, alarm, angka sorot `.hl` |
| `--info` | oklch(66% .13 235) | sama | tema.css:6 | zona B, banjir, cincin fokus, gerbang tingkat catatan |
| `--f0`–`--f3` | oklch(72% .15 150), oklch(86% .16 98), oklch(73% .17 58), oklch(57% .21 27) | sama | tema.css:7 | `--f2` = status gelar, PRA-POSISI, keyakinan estimasi-model; ramp kekerapan sel di web (§2.1.4) |
| `--shadow` | 0 2px 14px oklch(25% .07 256 / .08) | 0 2px 14px oklch(0% 0 0 / .35) | tema.css:8, :17 | `.ex`, `.seg`, `.pc-btn` |
| `--shadow-lg` | 0 8px 28px oklch(25% .07 256 / .16) | 0 8px 28px oklch(0% 0 0 / .5) | tema.css:8, :17 | menu, toast, dialog |
| `--ring` | 0 0 0 1px rgb(11 37 69 / .06) | 0 0 0 1px rgb(255 255 255 / .07) | admin.css:7, :10 | garis tipis kartu |
| `--bayang` | ring + 0 1px 2px rgb(11 37 69 / .04) + 0 6px 16px -6px rgb(11 37 69 / .1) | ring + 0 6px 16px -6px rgb(0 0 0 / .5) | admin.css:7, :10 | `.ad-kartu`, `.ad-tombol`, `.ad-tabel-wadah` |

Catatan gelap: `--ok`, `--warn`, `--bad`, `--info`, `--f*` tidak diredefinisi di blok gelap
tema.css, jadi warna zona dan status sama di kedua tema; kontrasnya terhadap `--card` gelap
#131c30 cukup untuk penanda non-teks (≥ 3:1). Teks berwarna status selalu memakai campuran
`.pl` (insight.css:41–43): terang `color-mix(in oklch, var(--w) 72%, #000)`, gelap
`color-mix(in oklch, var(--w) 70%, #fff)`.

#### 2.1.2 Warna dokumen dan deck (nilai persis dari `tema.json`)

| Token tema | Hex | Pakai di SIPPA |
| --- | --- | --- |
| `teks` | #1A1A1A | isi |
| `teks-2` | #2E3440 | sekunder, garis penghubung diagram |
| `teks-3` | #6B7280 | Sumber, keterangan, kepala kolom lampiran |
| `navy` | #051C2C | kepala tabel, baris total, pil Resmi, nomor, status lulus |
| `garis` | #BFC5CC | garis panel 0,75 pt, garis baris 0,5 pt |
| `garis-kuat` | #1A1A1A | garis header 0,75 pt |
| `pembanding` | #DCE1E7 | batang pembanding |
| `tanpa-data` | #F1F3F6 + arsir #A9B4C2 | kompleks/sel tanpa data |
| `wilayah` | #D3DBE5 | daratan netral peta simbol |
| `batas` | #A9B4C2 | batas provinsi 0,6 pt |
| `kertas` | #FFFFFF | latar |
| `oranye` | #D9600B | naik, angka kunci judul, aksen header, karhutla |
| `biru` | #2F86D1 | turun, air, banjir |
| `merah` | #C8102E | hanya bahaya atau perlu perhatian: NO-GO, hilang, alarm |
| `slate` | #5B7A99 | pil garis Terverifikasi |
| `biru-abu` | #3F5F80 | seri kedua grafik, kumis rentang |
| `biru-lembaga` | #00499D | nama tempat di judul slide |
| `emas-teks` | #8A6A2E | teks bernada kering < 14 pt |
| `sumber` | #4A9BE0 | bilah 3 pt catatan sumber slide |
| tint `netral` | pita #E6EAF0, muda #F3F5F8 | grup kartu, pita kepala netral |
| tint `api` | #FBE7D6, #FDF4EC | pita karhutla, kotak keputusan |
| tint `bahaya` | #F8DDE0, #FCF1F2 | pil NO-GO, hilang |
| tint `basah` | #DCEBF8, #EEF5FC | pita banjir, modul banjir |
| tint `kering` | #F4ECDC, #FBF8F2 | pil servis, zona air jauh |
| tint `sorot-baris` | #FDF1E8 | baris kompleks/kabupaten fokus |
| `skala.api` | #FBE7D6, #F4C3A0, #E8894A, #D9600B, #8F3F07 | kekerapan sel 2,2 km (kelas 1–5) |
| `skala.air` | #DCEBF8, #A4CAEE, #68A8E0, #2F86D1, #1B5A93 | jarak ke air, neraca air |
| `skala.emas` | #F4ECDC, #DCC79C, #C4A262, #A07A32, #6E5424 | zona air jauh |
| `skala.netral` | #DCE3EB, #AEBBCB, #7F93AA, #4F6A88, #24384F | kapasitas, kit per provinsi |

Hex terlarang `tema.json` `warna.terlarang` (antara lain #0B2545, #C9A227, #D9650B, #2F6FB5)
tidak boleh muncul di D atau S. Akibatnya token admin web (`--navy` #0b2545, `--emas`
#c9a227) **tidak boleh** disalin ke laporan PDF otomatis; jsPDF memakai hex tema.

#### 2.1.3 Nama semantik SIPPA (satu arti, dua keluarga)

Kelas web memakai variabel `--w` (pola `.pl`, insight.css:41) sehingga satu kelas melayani
semua status. Kolom D berisi rupa pil cetak.

**Zona kelayakan A–D** (PRD §5.1, §9.4.2)

| Zona | Arti | W `--w` | W pola isi | D isi | D pola isi |
| --- | --- | --- | --- | --- | --- |
| A | air ≤ 2,5 km, jalan ≤ 5 km | `--ok` | penuh | `biru` #2F86D1 | penuh |
| B | air ≤ 2,5 km, jalan > 5 km atau null | `--info` | cincin | `biru` #2F86D1 | cincin (isi putih, garis 1,5 pt) |
| C | air > 2,5 km, jalan ≤ 5 km | `--warn` | setengah | `skala.emas.4` #A07A32 | setengah |
| D | air > 2,5 km, jalan > 5 km atau null | `--bad` | silang | `skala.emas.4` #A07A32 | silang |

Di W warna mengikuti PRD §9.4.2 (terkunci). Di D dan S warna hijau tidak ada di
`tema.json` dan merah dibatasi untuk bahaya, jadi zona digambar bivariat dari dua ramp yang
sudah ada: rona = dimensi air (biru dekat, emas jauh), pola = dimensi jalan dan identitas
zona; pola dan huruf identik dengan W. Huruf A–D selalu tertulis di legenda, di sel tabel,
dan di pop-up. Lihat butir terbuka di §8.

**Status kit** (PRD §9.4.5, CHECK `sippa_kit.status`)

| Status | Label | Ikon | W `--w` | D pil |
| --- | --- | --- | --- | --- |
| `gudang` | di gudang | `warehouse` | `--ink2` | garis `teks-3` |
| `depot` | di depot depan | `container` | `--accent` | garis `navy` |
| `gelar` | digelar | `api-pompa` (baru) | `--f2` | tint api #FBE7D6, teks #D9600B |
| `banjir` | dipakai banjir | `waves` | `--info` | tint basah #DCEBF8, teks `teks` |
| `servis` | servis | `wrench` | `--warn` | tint kering #F4ECDC, teks #8A6A2E |
| `hilang` | hilang | `triangle-alert` | `--bad` | tint bahaya #F8DDE0, teks #C8102E |
| `pensiun` | pensiun | `archive` | `--ink3`, garis putus | garis putus `teks-3` |

Gerak berstatus rencana (`rencana = 1`, `tiba` NULL) tampil dengan pil garis putus
berwarna status tujuan dan label "rencana, ETA <n> jam".

**Vonis dan gerbang** (PRD §9.3, §9.4.7, §4.4)

| Nama | Label tampil | W `--w` | D pil | Ikon |
| --- | --- | --- | --- | --- |
| `vonis-nogo` | NO-GO | `--bad` | #F8DDE0 / #C8102E | `circle-x` |
| `vonis-hold` | HOLD | `--warn` | #FBE7D6 / #D9600B, ikon titik tiga | `circle-pause` |
| `vonis-kondisional` | KONDISIONAL | `--ok` | navy isi, teks putih, ikon centang | `circle-check` |
| `gerbang-keras` | keras | `--bad` | #F8DDE0 / #C8102E | `octagon-x` |
| `gerbang-syarat` | bersyarat | `--warn` | #FBE7D6 / #D9600B | `triangle-alert` |
| `gerbang-catatan` | catatan | `--info` | garis `slate` | `info` |
| `g4-lulus` | LULUS | `--ok` | navy isi, ikon centang | `circle-check` |
| `g4-tidak` | TIDAK LULUS | `--bad` | #F8DDE0 / #C8102E | `circle-x` |
| `g4-belum` | BELUM BISA DIPUTUS | `--ink2` | garis `teks-3` | `circle-help` |
| `gerbang-g-lulus` | lulus (G0–G6) | `--ok` | navy isi | `circle-check` |
| `gerbang-g-gagal` | gagal (G0–G6) | `--bad` | #F8DDE0 / #C8102E | `circle-x` |
| `gerbang-g-belum` | belum diuji | `--ink2` | garis `teks-3` | `circle-dashed` |

Tidak ada label "GO" di mana pun (PRD §9.3, `vonis`). Tidak ada hijau di D; lulus memakai
navy bercentang seperti status "selesai" laporan harian (Buku Pegangan, Komponen, Daftar
status).

**Pemicu pra-posisi** (PRD §9.4.4)

| Tingkat | W `--w` | D pil | Ikon |
| --- | --- | --- | --- |
| NORMAL | `--ink2` | garis `teks-3` | `circle` |
| SIAGA | `--warn` | #F4ECDC / #8A6A2E | `eye` |
| PRA-POSISI | `--f2` | #FBE7D6 / #D9600B | `truck` |
| GELAR | `--bad` | #F8DDE0 / #C8102E | `api-pompa` |

**Label keyakinan** (KEPUTUSAN 29, PRD §7.4, §9.2; `tema.json` `kosakata.keyakinan`)

| Kunci | Label | W kelas `sp-yakin` | D pil (S15, PEDOMAN §C6.2) |
| --- | --- | --- | --- |
| `resmi` | Resmi | isi `--ink`, teks `--paper` | isi `navy`, teks `kertas` |
| `terverifikasi` | Terverifikasi | garis 1,5px `--info`, teks `--ink` | garis `slate`, teks `teks` |
| `estimasi-model` | Estimasi model | garis `--f2`, teks `--ink`; tambahan "belum diuji balik" atau "uji balik gagal" | garis `oranye`, teks `teks` |
| `asumsi-kebijakan` | Asumsi kebijakan | garis `--ink3`, teks `--ink` | garis `teks-3`, teks `teks` |
| `hipotesis` | Hipotesis | garis putus `--f2`, teks `--ink` | garis putus `oranye`, teks `teks` |
| `menunggu` | Menunggu | garis putus `--ink3`; nilai tampil "–" + alasan satu baris | garis putus `teks-3`; nilai "–" |
| `penilaian-pakar` | Penilaian pakar | garis `--ink3` | garis `teks-3` (sudah di tema) |

Pil tambahan berwarna `asumsi-kebijakan` dengan teks tetap: "pilot, n kecil", "n kecil",
"belum diuji balik", "lengan uji", "basi, per <tanggal>", "DSM berkanopi", "ilustrasi".
Kunci `hipotesis` dan `menunggu` belum ada di `tema.json`; lihat §8.

**Kelas medan G3** (PRD §4.4): I, II, III ditulis sebagai chip netral (`--ink2`; D tint
netral) berisi angka romawi, tidak diberi warna sendiri (L24: tipe tidak diberi warna).

**Lengan A/B** (PRD §9.4.7). Lengan dibedakan oleh **posisi dan label** (satu baris atau
satu kolom per lengan, nama lengan tertulis di sumbu), bukan oleh rona. Satu warna sorot per
grafik (S18): konvensional = pembanding (W `--soft` isi + garis `--ink2`; D `pembanding`
#DCE1E7), semua lengan perlakuan = dasar (W `--brand2`; D `navy`), lengan yang sedang dipilih
atau dibahas = sorot (W `--f2`; D `oranye`). `lance_dalam` membawa pil "lengan uji", bukan
warna sendiri. Alasan terukur: palet lima rona dari token yang ada gagal validator dataviz
(`validate_palette.js`, 25 Okt 2026: `--ink2` vs `--c6` ΔE normal 7,2, di bawah lantai 15;
`--c7` di bawah lantai kroma), jadi rona per lengan tidak dipakai.

**Telemetri mutu** (PRD §9.11): 0 baik `--ok`, 1 diragukan `--warn`, 2 di luar rentang `--bad`;
label "baik", "diragukan", "di luar rentang".

**Sinkron form lapangan** (PRD §9.9): terkirim `--ok` ikon `cloud-check`; menunggu sinyal
`--warn` ikon `cloud-off`; ditolak `--bad` ikon `circle-x`; mengirim `--info` ikon
`refresh-cw`.

#### 2.1.4 Ramp peta dan grafik

| Besaran | W | D/S |
| --- | --- | --- |
| Kekerapan sel 2,2 km (0–14 tahun aktif) | 5 kelas: 1–2, 3–4, 5–6, 7–9, 10–14 tahun; warna `color-mix(in oklch, var(--f2) 20%/40%/60%/80%, var(--card))` lalu `--f3` untuk kelas 5; sel 0 tidak digambar | `skala.api` kelas 1–5 dengan batas kelas yang sama |
| Jumlah tahun terbakar MCD64A1 (ukuran titik kompleks) | jari-jari 4 / 6 / 8 px untuk 0–2 / 3–5 / ≥ 6 tahun | `peta.simbol_r_min_pt` 1,8 sampai `simbol_r_maks_pt` 7, legenda tiga ukuran (L34) |
| Kelas GSW di titik air | permanen `--info` isi, musiman `--info` cincin, tidak terdeteksi `--ink3` cincin putus | `biru` isi, `biru` cincin, `teks-3` cincin putus |
| Tekanan sepanjang trase | garis `--ink`; batas 88% PN `--bad` putus; 2 bar `--warn` putus | `navy` 1,75 pt; batas `merah` 0,5 pt putus; 2 bar `oranye` 0,5 pt putus |
| Pita CI dan kipas Monte Carlo | pita `color-mix(in oklch, var(--info) 18%, transparent)`, median `--ink` 2px | pita `skala.air.1` #DCEBF8 (P10–P90), median `navy` 1,75 pt (G11) |

#### 2.1.5 Hasil validator warna dan kontras (diukur 25 Okt 2026)

Palet kategorikal dihitung, tidak ditaksir: skrip `validate_palette.js` dari skill `dataviz`
(OKLab ΔE x 100, simulasi buta warna) dan rumus kontras WCAG. Hasil yang mengikat desain:

| Palet / pasangan | Hasil | Akibat wajib |
| --- | --- | --- |
| Zona W `--ok` #20a04e, `--info` #259ed6, `--warn` #eba002, `--bad` #d72828 (hex setara oklch), urutan A–D bersebelahan, latar putih | lulus; ΔE CVD terburuk A–B 18,7, tritan 6,1 | pola isi + huruf wajib (tritan di pita 6–8) |
| Zona W, semua pasangan | GAGAL CVD: A–D (`--ok`↔`--bad`) ΔE 5,3 deutan | pembaca buta warna merah-hijau tidak bisa membedakan A dan D dari warna: pola (penuh vs silang) dan huruf A/D adalah pembawa makna utama, tidak boleh dihapus di zoom mana pun |
| Zona W, latar gelap #131c30 | `--warn` di luar pita terang (L 0,76) | tetap dipakai karena PRD mengunci; cincin dalam gelap (§3.6) dan huruf menjadi penanda |
| `--warn` di putih | kontras 2,2:1 | tidak pernah untuk teks; penanda C diberi cincin gelap; teks status kuning memakai campuran `.pl` |
| Zona D/S `biru` #2F86D1 vs `skala.emas.4` #A07A32 di daratan #D3DBE5 | lulus, ΔE 22,7; kontras 2,8:1 | simbol diberi garis 0,5 pt `teks-2` dan label huruf |
| Lengan A/B lima rona dari token web | GAGAL (lihat §2.1.3) | lengan dibedakan posisi + label, satu warna sorot |

| Teks / latar | Rasio | Aturan |
| --- | --- | --- |
| `--ink` di `--card` (terang / gelap) | 15,4 / 15,0 | isi |
| `--ink2` di `--card` / `--paper` / `--surface` | 5,7 / 5,3 / 5,0 | teks sekunder, boleh semua ukuran |
| `--ink2` gelap di `--card` gelap | 8,2 | |
| `--ink3` di putih | 3,1 | **bukan untuk teks** < 18,7px tebal; di `/pipa` teks grafik, `.ad-catat`, dan `.ad-kosong` dinaikkan ke `--ink2` lewat `pipa.css` |
| `--ink3` gelap di `--card` gelap | 4,7 | |
| `.hl` `--bad` di putih / di `--card` gelap | 5,0 / 3,4 | di gelap `.hl` hanya lulus sebagai teks besar; `pipa.css` memakai `color-mix(in oklch, var(--bad) 70%, #fff)` untuk `.hl` di tema gelap |
| putih di `--navy2` / `--navy` | 8,4 / 15,4 | header, kepala tabel, tooltip |
| cincin fokus `--info` di putih / gelap | 3,0 / 5,6 | lulus non-teks 3:1 |
| `.ad-galat` `--c1` di tint c1 12% | 3,8 | teks galat di `/pipa` memakai `--ink` dengan ikon `circle-x` `--c1` dan latar tint tetap |
| D `teks-3` di putih | 4,8 | Sumber dan keterangan |
| D `oranye` di putih | 3,7 | hanya angka judul ≥ 14 pt Bold |
| D `merah` di tint bahaya | 4,6 | pil boleh |
| D `oranye` di tint api / `emas-teks` di tint kering | 3,1 / 4,3 | di D dan laporan PDF teks pil HOLD, PRA-POSISI, gelar, servis memakai `teks` #1A1A1A dengan ikon berwarna; di S pola deck harian (teks D9600B) tetap berlaku karena aturan rumah deck |

### 2.2 Tipografi

#### 2.2.1 Web (Inter untuk isi, Plus Jakarta Sans untuk judul dan angka besar)

Huruf web Pantau Bencana adalah Inter dan Plus Jakarta Sans (tema.css:10, admin.css:8,
`src/admin_halaman.js:15`). Roboto tidak dipakai di layar; Roboto hanya untuk PDF dan
dokumen (§2.2.2). Skala di bawah diambil dari nilai yang sudah dipakai admin dan kartu
Insight; tidak ada ukuran lain.

| Peran | Keluarga | Ukuran / tinggi baris / bobot | Sumber |
| --- | --- | --- | --- |
| Angka utama hero | `--display` | clamp(40px,5vw,56px) / 1 / 800, tabular | admin.css:122 |
| Angka kartu angka | `--display` | 28px / 1,15 / 800, tabular (HP 21px) | admin.css:136, :276, :207 |
| Judul layar (h1) | `--display` | 22px / 1,2 / 800, letter-spacing -.02em | admin.css:78 |
| Judul kartu Insight (h3) | `--display` | 21px / 1,3 / 800 (HP clamp 17–21px) | insight.css:3, :25 |
| Judul kartu biasa (h2) | `--display` | 15px / 800 | admin.css:114 |
| Isi | `--font` | 14px / 1,5 / 400 | admin.css:14 |
| Isi tabel | `--font` | 12,5px / 400; angka 700 tabular | admin.css:183, :191 |
| Kepala tabel | `--font` | 10,5px / 800, kapital, spasi .09em | admin.css:185 |
| Label, eyebrow (`.ad-ey`, `.lbl`) | `--font` | 10,5px / 800, kapital, spasi .08em | admin.css:116, tema.css:27 |
| Tombol, chip, tab | `--font` | 12,5–13px / 700 | admin.css:89, :93, :104 |
| Segmen kartu | `--font` | 12px / 600 | kartu.css:5 |
| Pil (`.pl`, `sp-yakin`, `sp-status`) | `--font` | 11–11,5px / 700, tinggi 20px | insight.css:41, admin.css:175 |
| Kaki kartu, Sumber | `--font` | 11,5px, Sumber miring | insight.css:19–20 |
| Catatan kecil | `--font` | 12px `--ink3` | admin.css:117 |
| Teks grafik SVG | `--font` | 11px `--ink3`; nilai kuat 12px 700 `--ink` | admin.css:141, :143 |
| Tooltip | `--font` / `--display` | 12px; angka 20px 800 | kartu.css:21–37 |
| Rumus | ui-monospace | 12,5px | tabel.css:44 (nilai) |
| Form lapangan | system-ui, -apple-system, "Segoe UI", Roboto, sans-serif | 18px / 1,45; judul 22px; tombol 18–20px 700 | lapangan.css:4–17 |

Semua angka di tabel, kartu, dan tooltip memakai `font-variant-numeric: tabular-nums`.

#### 2.2.2 Dokumen dan deck (Roboto saja)

| Peran | D (DOCX/PDF A4, `tema.json tipografi_docx`) | S (deck, Buku Pegangan Tipografi) | Laporan PDF otomatis (jsPDF) |
| --- | --- | --- | --- |
| Judul sampul | 32 pt Bold `kertas` | 34 pt Bold | 24 pt Bold `navy` |
| Label bab | 9 pt Bold kapital `navy` | – | – |
| Judul bab | 20 pt Bold kapital `navy` | – | 16 pt Bold `navy` |
| Subbab / sub-subbab | 13 pt Bold `navy` / 11,5 pt Bold `teks-2` | – | 12 pt Bold / 10,5 pt Bold |
| Judul slide | – | 19–22 pt Bold, ≤ 2 baris, angka `oranye`, tempat `biru-lembaga` | – |
| Isi | 10,5 pt, spasi 1,15, 6 pt sesudah, rata kiri-kanan | 7,2–9 pt | 10 pt, spasi 1,15 |
| Isi tabel / kepala tabel | 9 pt / 8,5 pt Bold kapital `kertas` di `navy` | 7,8–8,5 pt / 6,5 pt Bold `teks-3` | 8,5 pt / 8 pt Bold putih di `navy` |
| Nilai kartu angka | 18 pt Bold | 17 pt Bold | 16 pt Bold |
| Label kartu | 8,5 pt `teks-3` | 7,5 pt `teks-2` | 8 pt `teks-3` |
| Keterangan gambar/tabel | 9 pt, label Bold `navy`, rata tengah | – | 9 pt |
| Sumber | 8,5 pt, label Bold, `teks-3` | 7,5 pt `teks-3` | 8 pt `teks-3` |
| Pil | 8 pt Bold kapital spasi 0,8 | 6–6,6 pt Bold | 7,5 pt Bold |
| Teks dalam grafik/peta | ≥ 8 pt (`visual.tipografi.docx`) | ≥ 6 pt (`visual.tipografi.slide`) | ≥ 8 pt |
| Kepala/kaki halaman | 8 pt; nomor 9 pt Bold | footer 8,5 pt | 8 pt; nomor 9 pt Bold |
| Gambar teknik | judul blok 10 pt Bold; isi blok 7 pt; dimensi 7 pt; catatan 8 pt | – | – |

Bobot yang dipakai hanya Regular dan Bold (L2); Medium hanya bila generator buku sudah
memakainya untuk angka kartu.

### 2.3 Spasi (web)

Satu skala, diambil dari nilai yang sudah dipakai admin: **4, 6, 8, 10, 12, 14, 16, 20, 24 px**.

| Token `pipa.css` | Nilai | Pakai | Asal |
| --- | --- | --- | --- |
| `--sp-1` | 4px | celah dalam segmen dan tab | admin.css:103 |
| `--sp-2` | 8px | celah antartombol, isi chip | admin.css:83 |
| `--sp-3` | 12px | celah antarkartu kecil, celah tabel HP | admin.css:133 |
| `--sp-4` | 14px | celah kisi kartu | admin.css:72 |
| `--sp-5` | 16px | padding kartu, celah antarbagian | admin.css:70, :112 |
| `--sp-6` | 20px | padding samping wadah desktop | admin.css:70 |
| `--sp-7` | 24px | padding kartu Insight | insight.css:2 |

Gutter samping: 20px desktop, 16px di ≤ 560px (admin.css:207). Spasi dokumen mengikuti
`tema.json spasi_pt` (3, 6, 12, 18, 24 pt).

### 2.4 Radius

| Token | Nilai | Pakai | Asal |
| --- | --- | --- | --- |
| `--r` | 16px | kartu, panel, tabel-wadah | tema.css:9, admin.css:112 |
| kartu Insight | 18px | `.ex` di dalam `#insight` | insight.css:15 |
| `--r-sm` | 10px | isian, tombol kecil, sel kepala tabel | tema.css:9 |
| tombol | 12px | `.ad-tombol` | admin.css:93 |
| wadah seksi | 22px | `.ad-wadah` | admin.css:288 |
| lembar bawah | 18px 18px 0 0 | HP | peta.css:169 |
| pil, chip, segmen | 999px | semua pil | admin.css:89 |
| D/S | 2 mm PNG/SVG/HTML; kotak DOCX tegak | `tema.json objek.radius_mm`; kartu angka slide ≈ 5,8 pt | |

### 2.5 Bayangan

Hanya empat: `--ring` (garis tipis), `--bayang` (kartu, tombol), `--shadow` (kartu Insight,
segmen), `--shadow-lg` (menu, toast, dialog). Tidak ada bayangan di D dan S (garis 0,75 pt
`garis` sebagai gantinya).

### 2.6 Z-index

Skala dari nilai yang sudah dipakai repo; SIPPA tidak menambah angka lain.

| Lapis | z-index | Elemen SIPPA | Asal |
| --- | --- | --- | --- |
| isi peta, kanvas 3D | 1 | `.sp-3d canvas`, lapisan label | sim_adegan.css:3 |
| header lengket | 5 | `.ad-top`, bilah konteks | admin.css:23 |
| panel peta, kontrol atas peta | 5 | `.sp-peta-panel`, `.sp-peta-bilah` | peta.css:8 |
| lembar bawah, laci | 8 | `.sp-lembar` | peta.css:41 |
| hasil cari | 10 | `.sp-cari-hasil` | peta.css (`.hasil`) |
| bilah bawah HP, rel kiri | 12 | `.sp-bawah`, `.sp-rel` | baru di antara 10 dan 20, lihat §8 |
| layar muat penuh | 20 | `.sp-muat` | peta.css:157 |
| menu `.pmulti` | 30 | | kartu.css:13 |
| toast | 50 | `.toast` | tema.css:28 |
| tooltip, menu Lainnya | 60 | `#tip`, `.sp-lainnya` | kartu.css:21, gaya.css:36 |
| menu PilihCantik | 200 | `.pc-menu` | kartu.css:57 |
| dialog modal | lapisan atas peramban | `<dialog>` `showModal()` | native |

### 2.7 Titik patah

| Lebar | Arti | Asal |
| --- | --- | --- |
| ≤ 560px | HP sempit: header membungkus, tabel jadi kartu, gutter 16px, KPI 21px | admin.css:207; tabel kartu di ≤ 640px (admin.css:194) |
| < 768px | HP: bilah bawah lima tombol, satu kolom, panel jadi lembar bawah | PRD §9.1.3 |
| 768–1279px | tablet/laptop kecil: rel ikon 64px, dua kolom bila muat | PRD §9.1.3 |
| ≤ 900px | peta: panel kanan jadi lembar bawah, kisi kartu 2 kolom | peta.css:166, admin.css:206 |
| ≥ 1280px | desktop: rel berlabel 232px, konten dua kolom 60/40 | PRD §9.1.3, §9.2 |
| ≥ 1500px | desktop lebar: lebar isi maksimum 1440px, tanpa ruang kosong di tengah | gaya.css:16 (nilai) |

Kueri media ditulis `max-width` untuk 560, 767, 900, 1279, sama dengan pola repo.
Peramban sentuh: `@media (hover:hover) and (pointer:fine)` untuk efek hover (admin.css:30).

### 2.8 Ikon

**Gaya.** Garis, viewBox 24, stroke 2, ujung dan sambungan bulat, satu warna
`currentColor` (`tema.json visual.ikon`, lapis.js:27). Di W satu berkas sprite
`public/pipa/ikon.js` mengekspor `IKON_SIPPA = {nama: '<path…>'}` dan fungsi
`ikon(nama, kelas)` yang mengembalikan `<svg aria-hidden="true">`. Ukuran 16px di tombol
dan nav, 18px di rel, 14px di pil, 24px di tombol lapangan. Di D/S ikon putih dalam
lingkaran solid atau berwarna di lingkaran tint, ikon 55–62% diameter (`tema.json
objek.ikon_rasio_lingkaran`), sumber glif `tema.json glif`.

**Emoji** hanya di dua tempat yang sudah jadi pola repo: entri nav staf `HAL.pipa =
["💧", "SIPPA"]` (`src/admin_halaman.js`, PRD §9.1.2) dan tombol dummy 🧪/🧹 Super Admin
(DUMMY.md, PRD §9.14). Di tempat lain dilarang.

**Ikon yang sudah ada dan dipakai ulang** (nama sama dengan sumbernya):

| Nama | Sumber | Pakai SIPPA |
| --- | --- | --- |
| `peta` | lapis.js:8 | nav Peta |
| `satelit` | lapis.js:12 | titik panas VIIRS |
| `peringatan` | lapis.js:14 | alarm, gerbang |
| `bel` | lapis.js:16 | alarm telemetri |
| `perisai` | lapis.js:18 | gerbang G0–G6 |
| `debit` | lapis.js:19 | grafik, log |
| `sungai` | lapis.js:10 | air terdekat |
| `jalan` | lapis.js:23 | jalan terdekat |
| `orang` | lapis.js:20 | regu, n orang |
| `droplet` | tema.json `lucide:droplet` | air, modul banjir |
| `sprout` | tema.json `lucide:sprout` | irigasi |
| `map-pin` | tema.json `lucide:map-pin` | lokasi kit |
| `landmark` | tema.json `lucide:landmark` | lembaga (RACI) |
| `database` | tema.json `lucide:database` | nav Data |
| `banknote` | tema.json `lucide:banknote` | biaya, NPV |
| `triangle-alert` | tema.json `lucide:triangle-alert` | hilang, gerbang bersyarat |
| `list-checks` | tema.json `lucide:list-checks` | ringkasan, cek komponen |
| `siren` | tema.json `lucide:siren` | pemicu |
| `shield-check` | tema.json `lucide:shield-check` | pencegahan (zona D) |
| `construction` | tema.json `lucide:construction` | servis |
| `segitiga-naik`, `segitiga-turun` | tema.json `khusus:` | arah |
| `bendungan` | tema.json `khusus:bendungan` | sekat kanal |
| `sumur` | tema.json `khusus:sumur` | sumur bor dangkal (zona C) |
| ikon deck `api`, `kalender`, `orang` | `data/laporan-bnpb/harian-2026-10-23/ikon.mjs` | S |

**Ikon baru yang harus ditambahkan** ke `public/pipa/ikon.js` dan ke `tema.json ikon/glif`
(sumber `lucide-react 1.54.0`, ISC, sama dengan glif tema yang ada, kecuali bertanda
`khusus:` yang digambar baru dengan aturan stroke 2):

| Nama | Sumber glif | Pakai |
| --- | --- | --- |
| `layout-dashboard` | lucide | nav Ringkas |
| `calculator` | lucide | nav Hitung |
| `siren` | lucide (sudah di tema) | nav Pemicu |
| `warehouse` | lucide | nav Kit, status gudang |
| `container` | lucide | status depot, gambar G-05 |
| `timer` | lucide | nav Log, stopwatch lapangan |
| `flask-conical` | lucide | nav A/B (bukan tombol dummy) |
| `sliders-horizontal` | lucide | nav Studio |
| `box` | lucide | nav 3D |
| `activity` | lucide | nav Telemetri |
| `file-text` | lucide | nav Laporan |
| `menu` | lucide | Lainnya di HP |
| `waves` | lucide | status banjir, modul banjir |
| `wrench` | lucide | status servis |
| `archive` | lucide | status pensiun |
| `truck` | lucide | pengangkut, PRA-POSISI |
| `ship` | lucide | perahu (zona B) |
| `qr-code`, `scan-line` | lucide | QR, pindai |
| `thermometer` | lucide | probe |
| `fuel` | lucide | BBM |
| `gauge` | lucide | tekanan |
| `route` | lucide | trase, gerak kit |
| `layers` | lucide | sakelar lapisan |
| `cloud-off`, `cloud-check`, `refresh-cw` | lucide | status sinkron |
| `upload`, `download`, `printer`, `copy`, `link` | lucide | unggah CSV, unduh, cetak, salin tautan |
| `circle-x`, `circle-check`, `circle-pause`, `circle-help`, `circle-dashed`, `octagon-x`, `info`, `circle` | lucide | vonis, gerbang |
| `eye` | lucide | SIAGA |
| `moon`, `sun` | lucide | tombol tema |
| `x`, `chevron-down`, `chevron-left`, `chevron-right`, `search`, `plus`, `log-out` | lucide | kontrol umum |
| `api-pompa` | khusus | status gelar, GELAR (pompa dengan nyala kecil) |
| `pompa` | khusus | pompa (3D, BOM, P&ID ringkas di deck) |
| `selang` | khusus | layflat DN100/DN65 |
| `lance` | khusus | lance injeksi |
| `manifold` | khusus | manifold DN100 ke 4 x DN65 |
| `heli` | khusus | heli (saran sarana aturan 1, pembanding biaya) |
| `drone` | khusus | drone termal (zona D) |
| `probe-gambut` | khusus | penampang probe 0,1/0,3/0,5/1,0 m |

### 2.9 Gerak

Hanya nilai yang sudah dipakai repo:

| Token | Nilai | Pakai | Asal |
| --- | --- | --- | --- |
| `--sp-cepat` | 120ms | tooltip, paginasi | kartu.css:21, :75 |
| `--sp-sedang` | 150ms ease-out | warna tombol, label isian, chevron PilihCantik | admin.css:54, kartu.css:54 |
| `--sp-lambat` | 250ms | tinggi lembar bawah, akordeon | peta.css:167, tabel.css:41 |
| tekan | `transform: scale(.97)` seketika | tombol, chip, tab | admin.css:92 |

Tidak ada animasi masuk untuk batang grafik (insight.css:47–48: animasi yang tertahan
membuat angka tak tampak). `@media (prefers-reduced-motion:reduce)` mematikan semua
transisi dan animasi (peta.css:177).

---
## 3. Komponen web

### 3.0 Aturan bersama semua komponen

**Keadaan baku** (PRD §9.2.1, satu modul `public/pipa/keadaan.js`, fungsi murni yang
mengembalikan elemen; kalimatnya hanya dari modul ini):

| Keadaan | Pemicu | Rupa | Kelas |
| --- | --- | --- | --- |
| default | data ada | komponen penuh | – |
| hover | `@media (hover:hover) and (pointer:fine)` | latar `color-mix(in srgb,var(--navy2) 7%,var(--card))` untuk tombol/chip, `var(--surface)` untuk baris dan item menu | pola admin.css:98, :190 |
| fokus | `:focus-visible` | garis 2px `--info`, offset 2px, radius 6px | gaya.css:6 (disalin) |
| aktif ditekan | `:active` | `transform: scale(.97)` | admin.css:92 |
| nonaktif | `disabled` / `aria-disabled="true"` | `opacity:.5`, `cursor:default`, alasan di `title` dan teks di dekatnya | admin.css:97 |
| memuat | permintaan berjalan > 300 ms | kerangka abu seukuran komponen (`.sp-kerangka`, latar `--surface`, tanpa animasi kilau bila `prefers-reduced-motion`); tanpa pemintal di bawah 300 ms | PRD §9.2.1 |
| kosong | 0 baris | `.ad-kosong` dalam kartu: kalimat apa yang kosong dan cara mengisinya; Super Admin melihat 🧪 di tempat tetap | PRD §9.2.1, DUMMY.md |
| galat | HTTP ≥ 400 atau jaringan | `.ad-galat` (role="alert"): pesan server, kode HTTP, tombol "Coba lagi" | admin.css:20 |
| luring | `navigator.onLine === false` atau fetch gagal jaringan | pita `.ad-spanduk` kuning di bilah konteks: "Luring. Menampilkan data terakhir per <waktu>."; tombol tulis `disabled` (kecuali form lapangan) | admin.css:110 |
| basi | `per` lebih tua dari jadwal | kartu `opacity:.6` + pil `sp-yakin asumsi-kebijakan` "basi, per <tanggal>" | PRD §9.2.1 |
| menunggu | slot angka belum ada | "–" + pil `menunggu` + alasan satu baris | PRD §9.2.1 |

**Aksesibilitas bersama** (PRD §9.13, WCAG 2.2 AA): `lang="id"`; kontras teks ≥ 4,5:1 di
terang dan gelap (`--ink3` hanya untuk teks ≥ 12px bold atau penanda non-teks); fokus
terlihat; semua kontrol dapat dipakai papan ketik; target sentuh ≥ 44px di < 768px,
≥ 56px di form lapangan; ikon dekoratif `aria-hidden="true"`, tombol ikon saja wajib
`aria-label`; pesan status memakai `aria-live="polite"`; `prefers-reduced-motion` mematikan
transisi dan animasi partikel.

**INP bersama** (`~/.claude/INP.md`, PRD §9.13): handler mengubah chrome (`aria-pressed`,
`aria-selected`, `aria-expanded`, `aria-current`, kelas aktif) secara langsung, lalu
memanggil kerja berat lewat `nanti()` (nanti.js:3) atau Web Worker. Kerja berat =
menggambar ulang grafik SVG, `setFilter`/`setLayoutProperty` peta lebih dari satu lapis,
render tabel > 50 baris, Monte Carlo, hitung ulang 3D. Gerbang `tests/sippa/gerbang-sippa.test.mjs`
butir 6 memeriksa per handler. Anggaran: < 200 ms di laptop uji, < 100 ms di form lapangan
HP kelas menengah.

**Penyisipan teks**: data selalu lewat `textContent` atau `esc()` (format.js:6); tidak ada
`innerHTML` dengan data mentah (PRD §9.8).

### 3.1 Cangkang aplikasi dan navigasi `/pipa`

**Anatomi**

```
.ad-top (header, gradien navy, lengket z5)
  .ad-logo "Pantau Bencana" | .ad-sep.staf "Staf" atau .ad-sep "Admin" | judul "SIPPA"
  [kanan] tombol tema (moon/sun) | 🧪 🧹 (Super Admin) | .ad-staf-nama | .ad-keluar
.sp-konteks (bilah konteks, lengket di bawah header)
  PilihCantik Provinsi | .ad-seg Versi zona (Konservatif | Optimistis | Terverifikasi)
  | pil batas data "Data per 23 Okt 2026, 23.59 WIB" | pita luring bila ada
.sp-rel (rel kiri, >= 768px)        main.sp-isi#app (layar aktif)
  Ringkas
  RENCANA  Peta, Hitung, Pemicu, Studio, 3D
  OPERASI  Kit, Log, A/B, Telemetri
  KELUARAN Laporan, Data
.sp-bawah (bilah bawah, < 768px): Ringkas, Peta, Kit, Log, Lainnya
.sp-lainnya (lembar bawah dari tombol Lainnya)
```

**Varian**

| Lebar | Rel | Label |
| --- | --- | --- |
| ≥ 1280px | 232px, ikon 18px + label 13px 700, kepala kelompok `.ad-ey` | tampil |
| 768–1279px | 64px, ikon saja 20px; label lewat `rapikanTip` dan `aria-label` | tersembunyi visual, ada untuk pembaca layar |
| < 768px | tidak ada; `.sp-bawah` lima tombol 56px tinggi, ikon 20px + label 11px 700 | tampil di bawah ikon |
| `/pipa/lapangan` | tanpa rel dan tanpa bilah bawah; header `.lp-kop` | – |

**Keadaan.** Item aktif: `aria-current="page"`, latar `--gradien`, teks putih, cincin
`--emas` 50% (pola `.ad-sub a[aria-current]`, admin.css:77). Hover: `var(--surface)`.
Fokus: §3.0. Layar yang sedang dimuat malas: item sudah aktif, isi `#app` menampilkan
kerangka. Peran tanpa hak tulis: item tetap tampil (semua layar bisa dibaca peran B).
Luring: pita di bilah konteks, nav tetap jalan untuk layar yang ada di simpanan.

**Mode gelap.** Header tetap gradien navy (admin.css tidak mengubahnya); rel memakai
`--card` dan `--line` gelap; item aktif tetap gradien.

**A11y.** Rel = `<nav aria-label="Menu SIPPA">` berisi `<a href>` sungguhan (History API
mencegat klik, tautan tetap bisa dibuka di tab baru). Kepala kelompok = `<h2 class="ad-ey">`
dengan `aria-labelledby` pada `<ul>`. Bilah bawah = `<nav aria-label="Menu utama">`.
Lainnya = `<button aria-expanded aria-controls>`; lembar menutup dengan Esc dan klik latar,
fokus kembali ke tombol. Lompat ke isi: tautan `.sr` "Lompat ke isi" sebagai elemen pertama.

**INP.** Kelas keempat INP.md (pill nav ber-href): handler klik menulis `aria-current` ke
item baru seketika, `history.pushState`, lalu `nanti(() => import("./layar_<nama>.js").then(render))`.
Modul layar dimuat malas sehingga Ringkas tidak memuat MapLibre atau Three.js (PRD §9.1.2).
Ganti Provinsi atau Versi zona: chrome kontrol seketika, query `?prov=&zona=` ditulis
`history.replaceState`, render ulang layar lewat `nanti()`.

**Kelas.** `.sp-cangkang`, `.sp-konteks`, `.sp-rel`, `.sp-rel-kel`, `.sp-rel a`,
`.sp-bawah`, `.sp-lainnya`, `.sp-isi`, `.sp-tema`, `.sp-dummy` (kontainer 🧪 🧹).

**Halaman 403.** Polos, tanpa pengalihan: `.ad-wrap` berisi `.ad-kartu` "Akunmu tidak punya
akses SIPPA." dan tautan "Kembali ke halaman staf" (PRD §9.1.2).

### 3.2 Kartu Insight dan kartu angka

#### 3.2.1 Kartu Insight (`Kartu.kartu`, `.ex`)

**Anatomi** (kartu.js:16–17, insight.css:16–20): `article.ex` > `header.ex-hd`
(`.ex-ey` pil kategori, `.ex-jd` berisi `h3` judul satu kalimat temuan dengan angka di
dalam `.hl`, PilihCantik opsional di kanan, `.ctl` segmen opsional) > `.ex-bd` (grafik,
tabel, atau daftar) > `footer.ex-ft` (legenda `.ex-leg` di tengah, `em` "Sumber: …" miring).

**Aturan isi.** Judul = fakta + angka + sumber implisit, angka di depan bila bisa; tanpa
subjudul, tanpa baris satuan, tanpa paragraf catatan, tanpa kotak KPI berkepala navy (Buku
Pegangan, Kartu Insight). Pil keyakinan ditaruh di kanan atas `.ex-hd` (bila ada
PilihCantik, pil di bawahnya). Kaki: "Sumber: <lembaga/sistem>, <periode>; data per <waktu
WIB>". Kategori `.ex-ey` SIPPA, daftar tertutup: Kit, Pemicu, Pilot, Zona, Hidraulika,
Time-motion, A/B, Telemetri, Biaya, Data.

**Varian.** (a) Kartu tautan Ringkas: seluruh kartu dalam `<a class="sp-kartu-tautan">`,
`.ex-bd` berisi satu grafik mini atau daftar 3 baris; (b) kartu layar: judul + kontrol +
grafik atau tabel penuh; (c) kartu vonis (§3.12).

**Keadaan.** Memuat: kerangka setinggi kartu dengan `.ex-hd` abu. Kosong: judul berganti
kalimat kosong ("Belum ada log gelar.") dan `.ex-bd` berisi `.ad-kosong` cara mengisi. Galat:
`.ex-bd` berisi `.ad-galat`; kartu lain tidak terganggu (PRD §9.4.1). Basi: `opacity:.6` +
pil basi. Hover (tautan): bayangan `--shadow-lg`, judul bergaris bawah.

**Gelap.** `.ex-hd` gradien `--surface` ke `--card` (insight.css:16) mengikuti token gelap.

**A11y.** `h3` adalah judul kartu; angka `.hl` tidak hanya merah: juga tebal 800. Kartu
tautan: satu `<a>` membungkus, `aria-label` = teks judul tanpa markup.

**INP.** Segmen di `.ctl` mengikuti §3.5.

**Kelas.** `.ex`, `.ex-hd`, `.ex-ey`, `.ex-jd`, `.ex-bd`, `.ex-ft`, `.ex-leg`, `.hl`;
pembungkus kisi `section#insight.sp-kisi` dengan pengubah `.k4` (4 kolom ≥ 1280px, 2 kolom
768–1279px, 1 kolom < 768px) dan `.k2`.

#### 3.2.2 Kartu angka (`.sp-angka`)

Dipakai di hasil kalkulator, rincian kit, Studio Ringkasan, panel 3D. Pola `.ad-kpi`
(admin.css:133–137, :275–276): kartu putih satu lapis, nada hanya di angka.

**Anatomi.** `.ad-ey` label kata benda polos ("Tekanan pompa") > `b` nilai + satuan dalam
satu baris ("6,6 bar", 28px `--display`) > `small` pembanding atau ambang ("batas 11,1 bar")
> pil keyakinan kanan atas > `small.sp-sumber` sumber satu baris.

**Varian.** `.lewat` (melewati gerbang keras): angka `--bad`, ikon `octagon-x` 14px di
depan angka; `.syarat`: angka `color-mix` `--warn` 72% hitam; `.asumsi`: pil asumsi
(mis. ID dari 0,96 x DN); `.kecil` untuk grid padat (angka 21px).

**Keadaan.** Menunggu: "–" + pil menunggu. Memuat: kerangka 96px. Galat: "–" + `title`
pesan.

**A11y.** Struktur `<dl>`: `dt` = label, `dd` = nilai; status `.lewat` juga ditulis
sebagai teks tersembunyi `.sr` "melewati batas".

**Kelas.** `.sp-angka`, `.sp-angka-kisi` (auto-fill minmax(180px,1fr), celah 12px).

### 3.3 Pil label keyakinan dan pil status

**Anatomi.** `<span class="sp-yakin <kunci>">Label</span>`, tinggi 20px, padding 0 9px,
radius 999px, 11px 700, garis 1,5px `--w` (resmi: isi). Pil status: `<span class="sp-status"
style="--w:var(--bad)">` ditulis lewat kelas pengubah, bukan gaya sebaris (CSP
`style-src 'self'`): `.sp-status.hilang`, `.sp-status.gudang`, dst., dengan ikon 14px di kiri.

**Varian.** Tujuh kunci keyakinan (§2.1.3); status kit, vonis, gerbang, pemicu, mutu,
sinkron; `.putus` untuk garis putus (rencana, hipotesis, menunggu, pensiun).

**Keadaan.** Statis; bila bisa diklik (filter), ia menjadi chip (§3.5).

**Gelap.** Isi resmi = `--ink` (terang di tema gelap) dengan teks `--paper`; pil garis
memakai teks `--ink`.

**A11y.** Teks pil selalu kata, bukan hanya warna; pil keyakinan di kartu diberi
`title` berisi arti label (Resmi: diterbitkan lembaga berwenang; dst., PEDOMAN §C6.2).

**Kelas.** `.sp-yakin.resmi|terverifikasi|estimasi-model|asumsi-kebijakan|hipotesis|menunggu|penilaian-pakar`,
`.sp-status.<status>`, `.sp-vonis.nogo|hold|kondisional`, `.sp-gerbang.keras|syarat|catatan`,
`.sp-pemicu.normal|siaga|praposisi|gelar`, `.sp-mutu.m0|m1|m2`, `.sp-sinkron.kirim|tunggu|tolak|terkirim`.

### 3.4 Tabel (desktop) dan mode kartu (HP)

**Anatomi.** `.ad-tabel-wadah` > `table.ad-tabel` (kepala gradien, `th` putih kapital
10,5px dengan garis bawah emas 2px, zebra halus, admin.css:182–193) > `thead th` dengan
`<button data-k>` untuk urut (pola `tabel.js`) > `tbody td` (`data-label` wajib per sel
untuk mode kartu) > `.pgn` dari `paginasi(hal, total, 50, satuan)`.

**Aturan isi** (Buku Pegangan Tabel): teks rata kiri, angka rata kanan tabular
(`.ad-tabel .n` diubah ke `text-align:right` di `pipa.css`), nol sel dua baris, info
sekunder jadi kolom sendiri lebih kecil, pil di kolom status, huruf zona dalam pil,
paginasi 50 baris (PRD §9.13), baris total memakai `tfoot` gradien.

**Varian.** (a) tabel daftar (kit, log, kompleks, kabupaten, perangkat); (b) tabel
ringkas tanpa paginasi (ringkasan zona 4 x 3); (c) tabel matriks Studio (kolom skenario
lengket kiri `position:sticky; left:0`, nilai terbaik per baris diberi bingkai 1,5px
`--brand2` (sorot dengan bingkai, S20), kolom NO-GO berkepala `--bad`); (d) tabel BOM
komponen dengan tombol kondisi per baris.

**Mode kartu HP** (≤ 640px, admin.css:194–204): `thead` disembunyikan, tiap baris jadi
kartu, tiap sel baris label-nilai dari `data-label`, kolom aksi rata kanan tanpa label.
Untuk tabel lebih dari 6 kolom, kartu HP hanya menampilkan kolom bertanda `data-hp`
(paling banyak 5) dan tombol "Rincian" membuka lembar bawah berisi semua kolom.

**Keadaan.** Urut aktif: panah di `<i>` kepala, `aria-sort="ascending|descending"`. Baris
klik (`tr.sp-klik`): hover `--surface`, kursor tangan, Enter membuka rincian. Kosong:
satu baris `td colspan` berisi `.ad-kosong`. Memuat: 5 baris kerangka. Galat: `.ad-galat`
di atas tabel. Luring: tabel dari simpanan + pita luring.

**Gelap.** Kepala tetap gradien; zebra `color-mix(--ink 2%)` mengikuti token.

**A11y.** `<caption class="sr">` berisi judul tabel; `scope="col"`; tombol urut ber-`aria-label`
"Urutkan menurut <kolom>"; baris klik juga punya tautan atau tombol nyata di sel pertama
(bukan hanya `tr` berhandler).

**INP.** Klik urut atau halaman: panah dan `aria-current` halaman diubah seketika, render
`tbody` lewat `nanti()`. Kotak cari: gema nilai di isian seketika, saring lewat `nanti()`
dengan jeda 150 ms.

**Kelas.** `.ad-tabel-wadah`, `.ad-tabel`, `.n`, `.w`, `.a`, `.sp-klik`, `.sp-tabel-studio`,
`.sp-terbaik`, `.sp-kol-nogo`.

### 3.5 Filter, segmen, tab, sakelar, chip, pemilih

| Kontrol | Kelas | Peran ARIA | Pakai |
| --- | --- | --- | --- |
| Segmen pilihan tunggal | `.ad-seg` (bilah konteks, bilah atas peta) atau `.seg` (di dalam kartu Insight) | `role="radiogroup"` + `button role="radio" aria-checked`; panah kiri/kanan berpindah | Versi zona, Satuan peta, rentang |
| Tab layar | `.ad-tabs` (admin.css:103–108) | `role="tablist"`, `role="tab" aria-selected aria-controls`, `role="tabpanel"` | rincian kit, tab Studio |
| Chip saring (banyak pilihan) | `.ad-chip[aria-pressed]` | `button aria-pressed` | pil zona A–D, GSW, status kit, jenis log |
| Sakelar ya/tidak | `.sp-sakelar` (input checkbox `role="switch"`, jalur 36 x 20px, `--surface` ke `--gradien`) | `role="switch" aria-checked` | "Ujung di perimeter aktif", sumber manfaat Studio, lapisan peta |
| Pemilih | `PilihCantik` atas `<select>` asli (`.pc`, `.pc-menu`) | listbox (pilih.js) | Provinsi, kabupaten, kelas pompa |
| Pemilih ganda | `.pc.pc-multi` | listbox multi | skenario tersimpan yang dibandingkan |
| Akordeon | `<details class="sp-lipat">` atau `button aria-expanded` (pola `.fold`) | `aria-expanded`, `aria-controls` | kelompok masukan kalkulator HP, 8 kelompok Studio |
| Kotak cari | `input type="search"` di `.ad-kontrol` | `role="searchbox"`, `aria-controls` hasil | cari kompleks, kit |
| Rentang tanggal | dua `input type="date"` di `.ad-kontrol` | label nyata | log, laporan |

**Keadaan.** Aktif: segmen `.ad-seg button[aria-pressed="true"]` latar `--card` + bayangan
(admin.css:258); chip aktif gradien + cincin emas (admin.css:91); tab aktif gradien
(admin.css:105). Nonaktif: `.5` dan alasan. Jumlah per chip/tab ditulis di `<b>` (pola
`.ad-tabs b`).

**INP.** Kelas ketiga INP.md (parent memegang isi): gema chrome lokal seketika, isi
lewat `nanti()`. Akordeon: kelas kedua (chevron dan `aria-expanded` seketika; isi berat
Studio dirender saat pertama dibuka lewat `nanti()`).

### 3.6 Peta

**Anatomi** (PRD §9.4.2)

```
.sp-peta (wadah, desktop 60% kiri)
  #sp-peta-kanvas (MapLibre, vendor lokal, basemap openfreemap)
  .sp-peta-bilah (atas peta, z5): .ad-seg Satuan [Per kompleks | Per sel 2,2 km]
       | .ad-chip A B C D | .ad-chip "terbakar >= 3 tahun" | .ad-chip GSW x3
       | PilihCantik kabupaten | cari | tombol "Daftar" | tombol lapisan (layers)
  .sp-peta-leg (kiri bawah, kartu putih, 11,5px): judul legenda, 4 baris zona
       (penanda berpola + huruf + arti + jumlah), ukuran titik 3 contoh, ramp sel,
       "Sumber: OSM (ODbL) …, data per …"
  kontrol zoom MapLibre (kanan bawah), skala (kiri bawah di atas legenda)
.sp-peta-panel (desktop 40% kanan; HP .sp-lembar)
```

**Penanda zona.** Lingkaran berwarna `--w` zona dengan garis luar `--card` 1,5px lalu
cincin dalam 1px `color-mix(in oklch, var(--w) 65%, #000)`, supaya zona C (`--warn`, kontras
2,2:1 terhadap putih) tetap ≥ 3:1 sebagai penanda non-teks (WCAG 1.4.11). Pola isi (penuh, cincin, setengah, silang) digambar sebagai empat gambar
SDF ikon MapLibre (`map.addImage` sekali saat `style.load`), bukan sebagai lapisan
terpisah. Huruf zona muncul di pop-up, daftar, dan legenda; di peta huruf tampil pada zoom
≥ 10 sebagai label simbol 10px bold.

**Sel 2,2 km.** Poligon kisi, isi ramp kekerapan §2.1.4 opasitas 0,75, garis tepi warna
zona 1px; sel tanpa deteksi tidak digambar.

**Sakelar kompleks vs sel.** Satu sumber GeoJSON per satuan, dibuat sekali; sakelar hanya
`setLayoutProperty(id, "visibility", …)`; pil zona dan saring hanya `setFilter`
(PRD §9.4.2). Versi zona mengganti properti warna lewat ekspresi `["get", "zona_k"|"zona_o"|"zona_v"]`
di satu `setPaintProperty`, bukan sumber baru.

**Pop-up** (klik titik atau baris daftar): kartu pola `.kartu` peta (peta.css:56–69):
pita kepala `--gradien` berisi id kompleks dan kabupaten, kisi dua kolom label-nilai 11,5px
(zona tiga versi sebagai tiga pil, jarak air, jarak jalan, beda elevasi dengan pil "DSM
berkanopi", GSW, tahun terbakar, kekerapan sel), baris saran sarana, tombol "Rincian di
panel" dan "Hitung hidraulika". Tombol tutup merah berikon putih di kanan atas (Buku Pegangan
Foto lapangan, pola pop-up). Lebar 300–340px. Di HP pop-up tidak dipakai: klik membuka
lembar bawah setinggi setengah.

**Legenda.** Wajib (L-peta, PEDOMAN §B5.9): arti tiap warna dan pola, jumlah per zona dari
`zona.json`, ukuran titik tiga contoh, ramp sel, "Belum terdata" bila ada, sumber dan
tanggal. Legenda panjang menggulir; di HP legenda dilipat ke tombol "Legenda".

**Mode gelap.** Basemap gelap lewat `setStyle(url, {diff:false})`, lalu semua sumber,
gambar SDF, dan lapisan dipasang ulang sesudah `style.load` (Buku Pegangan Peta, PRD §9.2).
Garis penanda tetap `--card` (gelap). Legenda memakai `--card` gelap.

**Keadaan.** Memuat: `.sp-muat` di atas kanvas (latar `--paper`, teks "Memuat peta
kelayakan"). Kosong (R2 belum berisi): kartu tengah peta pola `.ad-peta-kosong` "Data
kelayakan belum diunggah pipeline (data.yml)". Galat basemap: peta tetap menggambar lapisan
di atas latar `--surface` + pita "Peta dasar gagal dimuat". Luring: lapisan dari simpanan
bila ada; bila tidak, alternatif Daftar langsung dibuka. Basi (> 400 hari): pil basi di
legenda.

**A11y.** Kanvas `role="region" aria-label="Peta kelayakan kit"`; alternatif lengkap =
tombol "Daftar" yang membuka tabel kompleks (paginasi 50, urut zona lalu tahun terbakar)
yang bisa dipakai penuh dengan papan ketik (PRD §9.4.2); fokus pop-up masuk ke judul,
Esc menutup. Zona tidak hanya warna: pola + huruf.

**INP.** Klik titik: sorot titik (`setFeatureState`) seketika, isi panel lewat `nanti()`.
Sakelar dan chip: chrome seketika, `setFilter`/`setLayoutProperty` lewat `nanti()`.
Tidak ada `setData` saat menyaring.

**Kelas.** `.sp-peta`, `.sp-peta-bilah`, `.sp-peta-leg`, `.sp-peta-panel`, `.sp-pop`,
`.sp-muat`, `.sp-pola-a|b|c|d` (penanda legenda HTML berupa SVG 14px).

### 3.7 Form (desktop) dan form lapangan luring (HP)

#### 3.7.1 Form desktop

**Anatomi.** `<form class="sp-form">` > `fieldset.sp-kel` dengan `legend.ad-ey` (Trase,
Pipa/selang, Pompa, Lance, Sumber air, Lingkungan) > `.sp-isian` (label 12,5px 700 `--ink2`
di atas, `input` tinggi 36px latar `--surface` radius 10px pola `.ad-kontrol input`, satuan
sebagai `span.sp-satuan` di kanan dalam isian, teks bantuan 12px `--ink3`, pesan galat
12px `--bad` dengan ikon) > tombol di bawah (`.ad-tombol.utama` untuk simpan,
`.ad-tombol` untuk aksi lain).

**Varian.** Angka dengan slider (Studio, 3D): `input type="range"` + kotak angka berdampingan,
satuan di kanan, `accent-color: var(--navy2)`. Pilihan kecil (≤ 4): `.ad-seg`. Pilihan
banyak: `PilihCantik`. Teks panjang: `textarea` dengan penghitung "120/500".

**Validasi.** Batas sama persis dengan fungsi murni (PRD §9.4.3, §9.9). Nilai di luar
rentang: isian bergaris `--bad`, pesan "Debit 3.500 L/min di luar rentang 50–3.000 L/min",
hasil tidak dihitung ulang untuk isian itu. Kedalaman > 5 m: ditolak di masukan dengan pesan
"Injeksi lebih dari 5 m tidak termasuk SIPPA (keputusan 50)"; 3–5 m memberi pil "lengan uji".

**Keadaan.** Kirim berjalan: tombol `disabled` + teks "Menyimpan"; sukses: toast; galat
server: `.ad-galat` di atas tombol dengan pesan server. Peran baca: form tampil `disabled`
dengan pita "Akunmu hanya bisa membaca layar ini".

**A11y.** Tiap isian punya `<label for>`; galat dihubungkan `aria-describedby` dan
`aria-invalid="true"`; ringkasan galat di atas form diberi fokus saat kirim gagal.

**INP.** Kalkulator menghitung ulang di tiap `input` (fungsi murni < 1 ms); angka kartu
diganti seketika, grafik digambar ulang lewat `nanti()` (PRD §9.4.3).

#### 3.7.2 Form lapangan luring `/pipa/lapangan`

Memakai ulang pola `public/lapangan.css` (kelas `lp-*`), bukan pola admin. Satu tangan,
kontras tinggi, target ≥ 56px.

**Anatomi.**

```
.lp-kop (gradien navy): "SIPPA Lapangan" | nama regu | kit SIPPA-001
.sp-sinkron (pita lengket di bawah kop, aria-live): ikon + "3 isian menunggu sinyal"
     + tombol "Kirim sekarang"
.lp-isi (max 560px)
  .lp-blok per langkah: judul h2 16px, isian 18px tinggi >= 54px,
  pilihan .lp-pil (kotak 62px, dua kolom), stopwatch .sp-stopwatch
  .lp-tombol.utama.besar (lengket bawah, 66px) untuk aksi utama langkah itu
```

**Stopwatch enam tahap** (`.sp-stopwatch`): daftar vertikal enam tombol 66px (Tiba, Mulai
gelar, Air mengalir, Mulai injeksi, Selesai, Bongkar selesai). Tombol berikutnya baru aktif
setelah yang sebelumnya diketuk; yang sudah diketuk berubah jadi baris berisi jam "14.32"
dan tombol kecil "Koreksi" (alasan wajib). Tombol aktif berlatar `--navy`, yang belum
aktif bergaris `--line` dengan `aria-disabled`.

**Papan angka probe** (`.sp-probe`): kisi kedalaman 10/30/50/100 cm (150, 300, 400, 500 cm
hanya bila `lengan_dalam = 1`), tiap sel isian `inputmode="decimal"` 24px; nilai > 50 °C
memberi pil "belum dingin" di sel itu.

**Indikator sinkron** (`.sp-sinkron`): empat keadaan dari §2.1.3 (terkirim, menunggu sinyal,
mengirim, ditolak). Butir ditolak tampil dalam daftar dengan alasan dan tombol "Perbaiki".
Kalimat: "Semua isian terkirim, 14.32 WIB." / "3 isian menunggu sinyal. Dikirim otomatis saat
ada sinyal." / "Mengirim 3 isian." / "1 isian ditolak: panjang trase di luar 0–5.000 m."

**Keadaan.** Tanpa kode: layar masuk dengan tombol "Pindai QR" dan isian kode manual.
Kode kedaluwarsa atau dicabut: pesan "Kode penugasan ini sudah tidak berlaku. Minta kode baru
ke perencana." IndexedDB gagal: pita "Foto tidak bisa disimpan luring di peramban ini."
Selisih jam > 10 menit: pita "Jam ponsel berbeda dari jam server. Isian tetap diterima dan
ditandai." GPS ditolak: isian lokasi manual.

**Gelap.** Mengikuti `prefers-color-scheme` dengan nilai gelap admin (`--paper` #0b1220,
`--card` #131c30, `--ink` #eef1f7); tombol utama gelap `--c5` #4f8fc4 (pola admin.css:65–66).
Kontras teks ≥ 7:1 di kedua tema untuk siang terik.

**A11y.** Fokus 3px `--emas` (lapangan.css:13); tombol stopwatch berlabel lengkap
("Catat waktu tiba"); status sinkron `aria-live="polite"`; getar (`navigator.vibrate(30)`)
hanya sebagai tambahan, tidak pernah satu-satunya umpan balik.

**INP.** Ketukan stopwatch menulis jam ke tombol seketika, simpan IndexedDB lewat
`nanti()`. Tidak ada render tabel atau grafik di halaman ini. Anggaran < 100 ms.

**Kelas.** `lp-*` dari lapangan.css + `.sp-stopwatch`, `.sp-probe`, `.sp-sinkron`,
`.sp-antre` (daftar butir antrean).

### 3.8 Unggah CSV (A/B)

**Anatomi.** `.sp-unggah` kartu: zona jatuh bergaris putus 2px `--line` radius 16px, ikon
`upload` 24px, teks "Tarik berkas CSV ke sini atau pilih berkas", tombol `.ad-tombol`
"Pilih berkas" (input file tersembunyi `accept=".csv,text/csv"`), baris batas "≤ 1 MB,
≤ 2.000 baris, UTF-8, pemisah koma atau titik koma", tautan "Unduh templat CSV".

**Keadaan.**

| Keadaan | Rupa |
| --- | --- |
| default | seperti di atas |
| seret di atas | garis `--info` padat, latar `color-mix(--info 8%)` |
| membaca | nama berkas + ukuran + "Memeriksa 1.240 baris" |
| pratinjau sah | tabel 10 baris pertama + ringkasan "1.240 baris, 5 lengan, 3 AOI" + tombol utama "Unggah 1.240 baris" |
| ditolak klien | `.ad-galat`: "Berkas ditolak. 3 baris salah, tidak ada yang disimpan." + tabel galat (Baris, Kolom, Alasan), paginasi 50 |
| ditolak server 400 | sama, dari `{galat:[{baris, kolom, alasan}]}` |
| ganda 409 | `.ad-galat`: "Berkas yang sama sudah pernah diunggah (sha sama)." |
| sukses | toast "1.240 baris petak tersimpan" + ringkasan per lengan diperbarui |
| peran baca | zona jatuh tidak tampil; pita "Unggah hanya untuk perencana" |

**A11y.** Zona jatuh adalah `<label>` untuk input file, bisa dipakai papan ketik; tabel
galat berjudul `caption`.

**INP.** Pengurai CSV untuk > 500 baris berjalan di potongan 500 baris lewat `nanti()`
berantai; zona jatuh berubah ke "membaca" seketika.

**Kelas.** `.sp-unggah`, `.sp-unggah.seret`, `.sp-galat-tabel`.

### 3.9 Panel simulator: kiri pilih, kanan hasil

**Anatomi** (PRD §9.5.3): `.sp-studio` kisi `340px 1fr`. Kiri `.sp-studio-kiri`
(lengket, gulir sendiri, `--card`): kepala berisi preset (`.ad-seg` S0, S0B, S1, S2, S3),
tombol "Atur ulang", lalu 8 akordeon kelompok pemilik; tiap dimensi kategorikal sebagai
`.ad-seg` (≤ 4 pilihan) atau `PilihCantik`, tiap parameter numerik sebagai slider + kotak
angka + satuan + teks bantuan asli. Kaki kiri: "Simpan skenario", "Impor JSON",
"Ekspor JSON". Kanan `.sp-studio-kanan`: `.ad-tabs` delapan tab (Bandingkan semua,
Ringkasan, Hidraulika, Biaya & BOQ, Risiko & gerbang, Simulasi & sensitivitas, Matriks 100
pilihan, Batas alat), panel tab di bawahnya.

**Varian.** HP: kiri menjadi lembar penuh dari tombol "Atur skenario"; kanan hanya tab
Bandingkan semua (kartu skenario) dan Ringkasan; pita "Simulator dirancang untuk laptop".

**Keadaan.** Monte Carlo berjalan: kartu MC menampilkan kerangka + "Menghitung 800 sampel";
nilai lama tetap tampil redup sampai hasil baru datang. Mesin gagal dimuat: `.ad-galat` dengan
nama berkas. Web Worker tidak tersedia: pita "Simulasi lambat di peramban ini". Skenario
tersimpan tidak ada: daftar pembanding berisi kalimat kosong.

**A11y.** Slider punya label, `aria-valuetext` berisi nilai + satuan ("1.000 m"); kotak
angka dan slider saling menggemakan.

**INP.** Geser slider: kotak angka dan label nilai diperbarui seketika; `assess` dan
`compare` dijalankan lewat `nanti()` dengan peleburan (hanya keadaan terakhir dihitung);
Monte Carlo di Web Worker `studio_pekerja.js` (PRD §9.5.1). Ganti tab: tab aktif seketika,
panel lewat `nanti()`.

**Kelas.** `.sp-studio`, `.sp-studio-kiri`, `.sp-studio-kanan`, `.sp-slider`, `.sp-preset`.

### 3.10 Kartu skenario berdampingan

**Anatomi.** Tab "Bandingkan semua" desktop = tabel matriks §3.4 varian (c): kolom S0, S0B,
S1, S2, S3, U1–U6 (paling banyak 6 tambahan); kepala kolom = kode, nama, pil vonis,
hitungan hambatan keras/bersyarat/catatan (tiga angka dalam pil kecil); baris sesuai PRD
§9.5.3. Nilai terbaik per baris dibingkai, hanya di antara kolom bukan NO-GO. Kolom NO-GO
tetap tampil, kepalanya bergaris atas 3px `--bad` dan alasan keras pertama tertulis.
S3 selalu membawa pil "ditutup sampai G5". Baris manfaat yang bergantung harga heli
menampilkan "–" + pil menunggu.

**Varian HP** (`.sp-skenario`): satu kartu per skenario, lebar penuh, gulir vertikal: kepala
(kode besar, nama, pil vonis), 6 angka kunci dalam kisi 2 x 3 (CAPEX, TCO 5 tahun, NPV
manfaat 0, BCR manfaat 0, tekanan pompa, jam gelar), daftar hambatan keras, tombol
"Rincian". Kartu bisa digeser kiri-kanan dengan `scroll-snap` bila pemakai memilih tampilan
"berdampingan".

**Keadaan.** Skenario dipilih tidak ada lagi (dihapus lunak): kolom hilang + toast.

**A11y.** Tabel dengan `th scope="col"` per skenario dan `th scope="row"` per ukuran;
bingkai terbaik juga diberi `.sr` "terbaik".

**Kelas.** `.sp-tabel-studio`, `.sp-skenario`, `.sp-skenario-kepala`.

### 3.11 Grafik

Semua grafik SVG buatan tangan (tanpa pustaka grafik), di dalam `.ad-grafik` (admin.css:140–145)
dengan `.ad-plot` untuk tooltip hover (`.ad-tangkap`, `.ad-hov`, `.ad-tip`, admin.css:279–285).
Warna lewat `currentColor` dan variabel CSS, tidak tertanam (PRD §9.2). Teks 11px `--ink3`,
nilai kuat 12px 700 `--ink`. Setiap grafik punya judul (judul kartu), legenda bila > 1 seri
atau berwarna, dan kaki Sumber. Batas 3 anotasi per grafik.

| Grafik | Dipakai | Anatomi dan aturan |
| --- | --- | --- |
| Batang | Ringkas (zona), kit nasional, nyala ulang 7/30/90 hari, VIIRS per tahun di Data | ujung atas membulat (radius 0,22 x lebar), tanpa sumbu Y, nilai bold di atas tiap batang termasuk yang kecil, total di atas batang bertumpuk, garis rata-rata berpil "rata-rata", pembanding `--soft` (Buku Pegangan Kartu Insight; `tema.json grafik`) |
| Garis | tekanan sepanjang trase (per 50 m), P(FWI ≥ 14) 7 hari, telemetri 24 jam | garis seri 2px `--ink` (satu seri disorot `--f2`, sisanya `--brand2`, paling banyak 4 seri); garis acuan putus 1px berlabel di ujung kanan ("batas 11,1 bar", "2 bar", "ambang 0,5"); label seri di ujung bila ≤ 4 seri; sumbu X berlabel satuan, sumbu Y boleh untuk garis (bukan batang) |
| Titik + pita CI | A/B per lengan, time-motion per kelas medan | satu baris per lengan atau kelas (posisi + label, bukan rona); titik per petak/ulangan (r 3px, opasitas .7), garis rerata 2px, bilah CI 95% (kumis 1,5px dengan topi 6px), garis nol putus; garis ambang G3 `--warn` putus, garis hipotesis Studio `--ink3` putus berlabel "hipotesis Studio 22–27 jam" |
| Pita CI (seri) | proyeksi neraca air, Monte Carlo TCO per tahun | pita P10–P90 `color-mix(--info 18%)`, median 2px `--ink`, angka P10/P50/P90 tertulis di ujung |
| Histogram Monte Carlo | Studio tab Simulasi | 800 sampel dalam 24 kelas, batang tegak tanpa celah `--ink2` opasitas .35, garis tegak P10/P50/P90 putus `--ink` berlabel di atas, judul memuat satuan "TCO 5 tahun (Rp miliar)"; tanpa sumbu Y, frekuensi relatif di tooltip |
| Tornado | Studio tab Simulasi (kepekaan, mis. 22.700 ha/kit ±50%) | batang horizontal mengambang dari nilai dasar (garis tegak `--ink` 1,5px), sisi rendah `--info`, sisi tinggi `--f2`, diurut dari rentang terbesar, nilai ujung tertulis, label parameter kiri dengan rentang masukan ("ha per kit 11.350–34.050") |
| Batang horizontal berlabel pil | head loss per diameter, kebutuhan per kabupaten | pola `Kartu.hbar` (kartu.js:29–32): pil nilai di ujung batang |

**Keadaan.** Memuat: kerangka setinggi grafik. Kosong: grafik tidak digambar; kalimat
kosong di tengah (pola `.ad-hantu`, admin.css:293–300). n < 5: grafik digambar + pil "n kecil".

**Gelap.** Semua warna dari token, otomatis.

**A11y.** `<svg role="img" aria-labelledby>` dengan `<title>` = judul kartu dan `<desc>` =
ringkasan angka satu kalimat; tabel data tersembunyi `.sr` di bawah grafik (atau tombol
"Lihat sebagai tabel" untuk grafik > 20 titik). Tooltip juga muncul saat fokus papan ketik
pada titik (`tabindex="0"` per titik untuk grafik ≤ 50 titik).

**INP.** Gambar ulang selalu lewat `nanti()`; hover hanya memindah `.ad-hov` (transform),
tanpa render ulang.

**Kelas.** `.ad-grafik`, `.ad-plot`, `.ad-leg`, `.sp-g-batang`, `.sp-g-garis`, `.sp-g-ci`,
`.sp-g-hist`, `.sp-g-tornado`, `.sp-acuan` (garis acuan), `.sp-anot`.

### 3.12 Status gerbang

**Anatomi.** Kartu vonis `.sp-vonis-kartu` (kalkulator, Studio Ringkasan, A/B per lengan):
pita kiri 6px `--w` vonis, ikon vonis 28px, kata vonis 24px `--display` 800 ("NO-GO"),
satu kalimat alasan, lalu daftar gerbang `ul.sp-gerbang-daftar`: tiap butir = pil tingkat
(keras/bersyarat/catatan) + kode (H-TEKANAN) + pesan layar persis dari PRD §9.3. Urutan:
keras, syarat, catatan.

**Gerbang program G0–G6** (`.sp-gerbang-g`): deret tujuh langkah horizontal di desktop,
vertikal di HP; tiap langkah = lingkaran 28px berikon status (lulus, gagal, belum diuji),
kode G0–G6, nama, jendela waktu, satu baris syarat lulus.

**Keadaan.** Tanpa gerbang: kartu KONDISIONAL dengan "Tidak ada hambatan keras atau
bersyarat. KONDISIONAL tetap butuh uji lapangan (G2, G3)." HP: kartu vonis menempel di atas
layar (`position:sticky; top:0`) dalam bentuk ringkas satu baris (PRD §9.4.3).

**A11y.** Kata vonis adalah teks; daftar gerbang `role="list"`; perubahan vonis diumumkan
`aria-live="polite"` ("Vonis berubah menjadi NO-GO: tekanan melewati batas").

**Kelas.** `.sp-vonis-kartu.nogo|hold|kondisional`, `.sp-gerbang-daftar`, `.sp-gerbang-g`.

### 3.13 Lini masa kit dan lacak

**Anatomi.** `ol.sp-lini` vertikal: tiap butir = titik 12px berwarna status tujuan di garis
tegak 2px `--line`, kepala berisi status asal, ikon `chevron-right`, lalu status tujuan ("gudang", ikon, "depot"; bukan karakter
panah), pil alasan, pengangkut, waktu (`jamWIB`), ETA rencana, tiba, durasi (`fmt.durasi`),
pencatat. Gerak rencana belum tiba: titik cincin putus + tombol "Konfirmasi tiba" (W/K).
Peta jejak kecil di samping (desktop) atau di atas (HP): titik per lokasi bernomor urut,
garis gerak 30 hari `--ink2` 1,5px putus.

**Keadaan.** Kosong: "Kit ini belum pernah bergerak sejak dibuat." Antar-provinsi: pil
"antar-provinsi" di butir.

**A11y.** `<ol>` dengan `aria-label="Riwayat gerak kit SIPPA-001"`; waktu dalam `<time datetime>`.

**Kelas.** `.sp-lini`, `.sp-lini-butir`, `.sp-lini-rencana`, `.sp-jejak`.

### 3.14 QR

**Anatomi.** Tampil: `figure.sp-qr` berisi SVG QR (qrcode-generator vendor, modul hitam
di atas putih, zona tenang 4 modul, selalu latar putih juga di tema gelap), teks kode di
bawah 14px 700 tabular, tombol "Cetak label". Label cetak A6 (105 x 148 mm, `@page`
khusus): logo BNPB 12 mm kanan atas, "SIPPA" 14 pt bold, kode kit 28 pt bold, QR 60 mm,
jenis kit, pemilik asal, baris "Barang Milik Negara BNPB". Label bin 50 x 30 mm: QR 22 mm +
`SIPPA:<kit>:<kode BOM>`.

**Pindai.** `.sp-pindai`: video kamera dalam bingkai persegi berpojok 4 garis `--emas`,
teks "Arahkan kamera ke QR kit"; tanpa `BarcodeDetector`: isian kode manual.

**Kode penugasan.** QR tautan `/pipa/lapangan#k=<kode>` tampil SEKALI dalam `.sp-dialog`
dengan peringatan merah "Simpan atau kirim tautan ini sekarang; tautan tidak bisa
ditampilkan lagi." dan tombol "Salin tautan".

**A11y.** `<figure>` dengan `<figcaption>` kode; SVG `role="img" aria-label="QR kit SIPPA-001"`.

**Kelas.** `.sp-qr`, `.sp-pindai`, `.sp-label-a6`, `.sp-label-bin`.

### 3.15 Toast

`.toast` dari tema.css:28–29 (kanan bawah, z50, latar `--ink`, teks `--paper`, radius 12px).
Isi satu kalimat ≤ 80 huruf, hilang setelah 4 detik, tetap selama fokus atau hover. Satu
toast sekaligus; yang baru mengganti. Jenis galat tidak memakai toast (galat memakai
`.ad-galat` di tempatnya). Di HP toast naik di atas bilah bawah (`bottom: 72px`).
`role="status" aria-live="polite"`.

### 3.16 Dialog modal dan lembar bawah

**Dialog** (`<dialog class="sp-dialog">`, `showModal()`): nilai sama dengan `dialog.dlg`
(tabel.css:47–53): garis `--line`, radius `--r`, latar `--card`, lebar min(780px, 100vw −
24px), `::backdrop` oklch(15% .03 256 / .55), kepala `.dh` dengan judul 18px dan tombol tutup
bulat 32px, isi `.db`. Dipakai untuk: tugaskan kit, kode sekali tampil, catat cek jalan,
konfirmasi aksi tak terbalik (hapus skenario, cabut tugas, tandai hilang), rincian baris
tabel HP. Konfirmasi tak terbalik: tombol bahaya `.ad-tombol.bahaya` di kanan dengan kata
kerja persis ("Cabut tugas"), tombol batal di kiri.

**Lembar bawah** (`.sp-lembar`, < 900px): tiga tinggi `data-tinggi="intip|setengah|penuh"` =
96px / 46% / 72% (peta.css:167–175), radius 18px atas, pegangan 44 x 5px; seret pegangan atau
klik pegangan untuk berganti tinggi; isi menggulir sendiri.

**A11y.** Dialog: fokus ke judul saat buka, Esc menutup, fokus kembali ke pemicu. Lembar:
pegangan adalah `button aria-label="Ubah tinggi panel"` dengan `aria-expanded`.

**INP.** Buka dialog seketika; isi berat (tabel rincian) lewat `nanti()`. Seret lembar
memakai `transform` saja.

### 3.17 Wadah penampil 3D

**Anatomi** (PRD §9.6): `.sp-3d` kisi `1fr 320px` (desktop): kiri `.sp-3d-kanvas`
(latar dibaca dari `--paper`, label dari `--ink`) dengan segmen adegan di atas (`.ad-seg`
Susunan kit | Jalur air | Injeksi), label melayang pola `.sa-lb` (sim_adegan.css) tetapi
memakai token `--card`/`--ink`, label tetap di sudut kiri bawah "Ilustrasi, bukan model panas
terkalibrasi (model M04 belum dikalibrasi)" (adegan Injeksi), legenda skala tekanan sama
dengan grafik kalkulator; kanan `.sp-3d-panel`: kontrol (debit, DN, panjang, Δz, lance,
kedalaman 0–5 m, kompleks) dan panel teks angka yang sama (`.sp-angka-kisi`), juga sebagai
alternatif aksesibel. Kartu info komponen (klik): kode BOM, kelas kinerja, titik kerja,
kriteria terima, gambar SIPPA-G-xx.

**Varian.** HP: kanvas penuh lebar 56vh, panel di bawahnya, pita "Layar ini dirancang untuk
laptop". Tanpa WebGL: SVG 2D statis + pita "Peramban ini tidak mendukung WebGL".

**Keadaan.** Memuat Three.js: `.sp-muat` "Memuat adegan 3D". `prefers-reduced-motion`:
partikel diam, tombol "Putar animasi".

**A11y.** Kanvas `aria-hidden="true"`; panel teks adalah sumber informasi utama untuk
pembaca layar; kontrol kamera juga lewat tombol (putar kiri/kanan, perbesar, atur ulang).

**INP.** Render hanya saat ada perubahan atau animasi aktif; ganti kontrol mengubah angka
panel seketika, hitung ulang geometri lewat `nanti()`.

**Kelas.** `.sp-3d`, `.sp-3d-kanvas`, `.sp-3d-panel`, `.sp-3d-lb`, `.sp-3d-info`.

### 3.18 Tata letak laporan PDF (jsPDF)

PDF adalah dokumen, jadi memakai token D (`tema.json`), bukan token web.

| Unsur | Nilai |
| --- | --- |
| Kertas | A4 tegak; margin kiri 25 mm, kanan 20 mm, atas 25 mm, bawah 20 mm (L1, `tema.json halaman`) |
| Huruf | Roboto Regular/Bold lewat `public/inti/roboto.js`; cadangan Helvetica dengan peringatan di konsol |
| Kepala halaman | garis tegak `oranye` 2 pt x 7 mm di kiri, baris 1 judul laporan 8 pt Bold, baris 2 "BNPB \| <bulan tahun>" 8 pt, logo BNPB 8 mm di kanan, garis 0,75 pt `garis-kuat` (L3) |
| Kaki halaman | garis 0,5 pt `garis`; kalimat PRD §9.10 "Dibuat otomatis dari data SIPPA per <waktu WIB>. Bukan dokumen resmi sebelum ditandatangani pejabat berwenang." 8 pt `teks-3`; nomor 9 pt Bold kanan |
| Halaman 1 | judul laporan 16 pt Bold `navy`, baris jenis dan rentang 10 pt, pil batas data, kotak ringkasan (tint netral muda, garis kiri navy 3 pt): 3–5 temuan berangka |
| Isi | subbab 12 pt Bold `navy`; isi 10 pt spasi 1,15; tabel kepala `navy` teks putih 8 pt Bold, baris 8,5 pt, garis bawah 0,5 pt `garis`, angka rata kanan, baris total `navy` |
| Grafik | digambar vektor dari data yang sama dengan layar (tidak tangkap layar), teks ≥ 8 pt |
| Pil | keyakinan dan status sesuai kolom D §2.1.3, 7,5 pt Bold |
| Foto | lebar 80 mm, keterangan 8 pt di bawah (waktu WIB, regu, kit) |
| Tanda tangan | blok kosong kanan bawah halaman terakhir: "Mengetahui," jabatan, nama, NIP, tanggal (tanpa nama terisi) |
| Nama berkas | `sippa-<jenis>-<prov>-<YYYYMMDD>.pdf` |
| Logo | hanya logo BNPB (KEPUTUSAN 50) |

Isi per templat (pilot, kejadian, mingguan, musim, skenario) mengikuti PRD §9.10 dan disusun
fungsi murni `isiLaporan(jenis, data)`.

### 3.19 Tombol dummy (Super Admin)

Dua ikon emoji 🧪 dan 🧹 sebagai `.ad-tombol.ad-bulat` 40px di header kanan, di tempat yang
sama di tiap layar, hanya untuk Super Admin (DUMMY.md, PRD §9.14). 🧪 `aria-label="Isi data
dummy untuk layar ini"`, 🧹 `aria-label="Hapus seluruh data dummy SIPPA"` dengan dialog
konfirmasi. Sesudah keduanya: muat ulang penuh. Baris dummy di tabel diberi pil
`asumsi-kebijakan` "dummy" agar tidak tertukar dengan data nyata.

### 3.20 Lakukan dan jangan (ringkas per komponen)

| Komponen | Lakukan | Jangan |
| --- | --- | --- |
| Kartu Insight | judul satu kalimat berangka, Sumber di kaki | subjudul, baris satuan, kotak KPI berkepala navy |
| Kartu angka | satuan menempel pada angka, pembanding di bawah | angka tanpa satuan, presisi melebihi data |
| Pil | kata + ikon | warna saja, singkatan tak dikenal |
| Tabel | angka rata kanan tabular, paginasi 50, `data-label` | gulir horizontal halaman, `<select>` bawaan |
| Peta | `setFilter`/`setLayoutProperty`, legenda lengkap, tombol Daftar | membuat ulang sumber saat menyaring, zona tanpa pola |
| Grafik | satu warna sorot, label langsung ≤ 4 seri, tabel `.sr` | sumbu ganda, pai, donat, 3D, angka di tiap titik |
| Form | label di atas, galat di bawah isian dengan cara memperbaiki | placeholder sebagai label, galat hanya merah |
| Tombol | kata kerja + objek ("Simpan skenario", "Cabut tugas") | "OK", "Kirim", "Ya" |
| Dialog konfirmasi | judul berupa pertanyaan aksi ("Cabut tugas regu Pulang Pisau 1?") dan akibatnya | "Apakah kamu yakin?" |
| Toast | satu kalimat hasil ("3 komponen ditandai hilang") | galat, informasi penting yang hilang sendiri |

---
## 4. Wireframe tiap layar (PRD §9.1.1)

Kerangka bersama desktop (≥ 1280px) dipakai semua layar kecuali `/pipa/lapangan`; wireframe
di bawah hanya menggambar isi `main.sp-isi`. Nama dalam kurung siku `[ ]` adalah komponen §3.

```
+-----------------------------------------------------------------------------------------+
| [3.1 .ad-top] Pantau Bencana  STAF  SIPPA                 (tema) (🧪)(🧹)  Nama   Keluar |
+-----------------------------------------------------------------------------------------+
| [3.1 .sp-konteks] Provinsi [Kalimantan Tengah v]  Versi zona (Konservatif|Optimistis|    |
|                   Terverifikasi)   [pil Data per 23 Okt 2026, 23.59 WIB]  [pita luring] |
+--------------+--------------------------------------------------------------------------+
| [3.1 .sp-rel]| main.sp-isi                                                              |
|  Ringkas     |  h1 judul layar                                   [aksi kanan judul]     |
|  RENCANA     |  ...                                                                     |
|   Peta       |                                                                          |
|   Hitung     |                                                                          |
|   Pemicu     |                                                                          |
|   Studio     |                                                                          |
|   3D         |                                                                          |
|  OPERASI     |                                                                          |
|   Kit        |                                                                          |
|   Log        |                                                                          |
|   A/B        |                                                                          |
|   Telemetri  |                                                                          |
|  KELUARAN    |                                                                          |
|   Laporan    |                                                                          |
|   Data       |                                                                          |
+--------------+--------------------------------------------------------------------------+
```

Kerangka bersama HP (< 768px):

```
+----------------------------------+
| [.ad-top] SIPPA     (tema) Keluar|
| [.sp-konteks] [Kalteng v] [Kons v]|
+----------------------------------+
| main.sp-isi (satu kolom, 16px)   |
|                                  |
|                                  |
+----------------------------------+
| [3.1 .sp-bawah]                  |
| Ringkas  Peta  Kit  Log  Lainnya |
+----------------------------------+
```

Di HP Versi zona menjadi `PilihCantik` ringkas di bilah konteks. "Lainnya" membuka
`.sp-lainnya` (lembar bawah) berisi Hitung, Pemicu, Studio, 3D, A/B, Telemetri, Laporan, Data.

### 4.1 Ringkas `/pipa`

Desktop:

```
 h1 Ringkas
+----------------------+----------------------+----------------------+----------------------+
|[3.2.1 kartu tautan]  |[3.2.1]               |[3.2.1]               |[3.2.1]               |
|(Kit)                 |(Pemicu)              |(Pilot)  [n kecil]    |(Zona)  [Terverifikasi]|
|Kit: 3 siap di gudang,|Pemicu: 2 kabupaten di|Pilot Okt 2026: 3 sesi|Zona A Kalteng: 188   |
|1 di lapangan, 0      |level PRA-POSISI      |gelar, p50 3,4 jam    |kompleks (konservatif)|
|hilang                |                      |                      |469 (optimistis)      |
| [status per kit,     | [daftar 3 kab +      | [titik per sesi,     | [batang A B C D      |
|  3 baris pil]        |  pil tingkat]        |  garis ambang G3]    |  dua versi]          |
|Sumber: SIPPA D1, per |Sumber: BMKG/ECMWF... |Sumber: log lapangan  |Sumber: OSM (ODbL)... |
+----------------------+----------------------+----------------------+----------------------+
+-------------------------------------------------------+---------------------------------+
|[3.2.1 kartu] (Kit) 10 gerak kit terakhir              |[3.2.1] (Telemetri) Alarm aktif  |
| [3.4 tabel: waktu, kit, dari > ke, alasan, pengangkut]| [daftar alarm: pil, tag, nilai, |
|  tanpa paginasi, tautan "Lihat semua gerak"           |  sejak; kosong: "Tidak ada      |
|                                                       |  alarm aktif."]                 |
+-------------------------------------------------------+---------------------------------+
```

HP: empat kartu tautan satu kolom urut Kit, Pemicu, Pilot, Zona; lalu gerak terakhir dalam
mode kartu (5 butir) dan alarm.

```
+----------------------------------+
|[3.2.1] (Kit)                     |
|Kit: 3 siap di gudang, 1 di       |
|lapangan, 0 hilang                |
|Sumber: SIPPA D1, per 14.30 WIB   |
+----------------------------------+
|[3.2.1] (Pemicu) ...              |
+----------------------------------+
|[3.2.1] (Pilot) ...  [n kecil]    |
+----------------------------------+
|[3.2.1] (Zona) ...                |
+----------------------------------+
|Gerak terakhir [3.4 mode kartu]   |
+----------------------------------+
```

### 4.2 Peta kelayakan dan saran sarana `/pipa/peta`

Desktop (peta 60%, panel 40%):

```
+------------------------------------------------------+-----------------------------------+
|[3.6 .sp-peta-bilah] Satuan (Per kompleks|Per sel 2,2km)|[3.6 .sp-peta-panel]               |
| (A)(B)(C)(D) (terbakar>=3 th) (GSW: perm|mus|tdk)     |[3.2.1] (Zona) [Terverifikasi]     |
| [Kabupaten v] [cari kompleks___] [Daftar] [lapisan]  |188 dari 865 kompleks Kalteng di   |
|                                                      |zona A (jalan utama); 469 bila     |
|                [3.6 peta MapLibre]                   |jalan track OSM dihitung           |
|        o  @   (penanda berpola per zona)             | [3.4 tabel 4 x 3: zona x versi,   |
|     @     o      x                                   |  pil persen; tanpa jalan 16 km 44;|
|          (    x     o                                |  median air 1,02 km, jalan 2,27]  |
|                                                      |Sumber: OSM (ODbL) via Overpass    |
|+------------------+                         (+)(-)   +-----------------------------------+
||[3.6 legenda]     |                                  |Rincian kompleks KT-0412           |
|| (*) A air & jalan dekat   188                       | [3.3 pil] A kons  A opt  A terv    |
|| (o) B jalan jauh          418                       | [dl label-nilai dua kolom]        |
|| (/) C air jauh            89                        | Saran sarana: kit relay SIPPA     |
|| (x) D keduanya jauh       170                       |  alasan: air 1,4 km, jalan 3,2 km |
|| ukuran: 0-2 / 3-5 / >=6 th                          | [Hitung hidraulika] [Catat cek    |
|| Sumber, data per ...                                |  jalan] [Usulkan calon AOI]       |
|+------------------+   skala 0__5__10 km              |                                   |
+------------------------------------------------------+-----------------------------------+
```

HP (peta penuh, panel jadi lembar bawah tiga tinggi):

```
+----------------------------------+
|[bilah] (Kompleks|Sel) [Saring] [L]|
|                                  |
|        [3.6 peta penuh]          |
|     o   @     x                  |
|                       (+)(-)     |
| [Legenda]                        |
+----------------------------------+
|[3.16 .sp-lembar intip 96px]  ==  |
|188 dari 865 kompleks di zona A   |
|(jalan utama); 469 bila track OSM |
+----------------------------------+
```

"Saring" membuka lembar setengah berisi chip zona, GSW, kabupaten, cari. Klik titik membuka
lembar setengah berisi rincian kompleks dan saran sarana. "Daftar" membuka tabel mode kartu.
Pita "Layar ini dirancang untuk laptop" di atas peta.

### 4.3 Kalkulator hidraulika `/pipa/hitung`

Desktop:

```
 h1 Kalkulator hidraulika          [Salin tautan] [Simpan sebagai skenario Studio] [Ekspor acuan]
+------------------------------------+---------------------------------------------------+
|[3.7.1 form]                        |[3.12 kartu vonis] HOLD                            |
| TRASE                              | Tekanan ujung di bawah 2 bar; lance 15-40 L/min   |
|  Panjang trase [1.000] m           | butuh 2-4 bar                                     |
|  Beda elevasi  [2] m  [DSM pil]    |  [syarat] H-SISA2 ...                             |
|  Sigma K minor [5]                 |  [catatan] H-DSM ...                              |
| PIPA/SELANG                        +---------------------------------------------------+
|  Bahan (Layflat|HDPE)              |[3.2.2 kisi kartu angka]                           |
|  DN [DN100 v]  ID datasheet [  ] mm| Tekanan pompa 6,6 bar | Tekanan ujung 1,8 bar     |
|  Tekanan kerja [12] bar            | TDH 67 m | Kecepatan 1,3 m/s | Daya 33 kW         |
|  C Hazen-Williams [130]            | BBM 22 L/jam, 528 L/insiden | CO2 51 kg/jam      |
| POMPA                              | Volume isi 7,9 m3 | Air tiba 13 menit             |
|  Kelas pompa [1.500 L/min v]       +---------------------------------------------------+
|  Jumlah [1]  Efisiensi [0,65]      |[3.11 garis] Tekanan sepanjang trase, bar, per 50 m|
|  Debit [600] L/min                 |  ----batas 11,1 bar------------------------------ |
| LANCE                              |  \                                                |
|  Jumlah aktif [8]                  |   \______________                                 |
|  Kedalaman [1,5] m (0-5)           |  ----2 bar--------------------------------------- |
| SUMBER AIR                         +---------------------------------------------------+
|  Q95 [ ] L/s  Q eko [ ]  stok [ ]  |[3.11 batang horizontal] Head loss per diameter    |
| LINGKUNGAN                         |  pada 600 L/min, m per km (DN65 ... OD200)        |
|  Suhu pipa [35] C                  |Sumber: rumus Hazen-Williams; datasheet kelas pompa|
|  Ujung di perimeter aktif (sakelar)|                                                   |
+------------------------------------+---------------------------------------------------+
```

HP: kartu vonis menempel di atas dalam bentuk ringkas; masukan dalam akordeon per kelompok;
kartu angka 2 kolom; dua grafik di bawah.

```
+----------------------------------+
|[3.12 ringkas, lengket] HOLD      |
|Tekanan ujung 1,8 bar < 2 bar     |
+----------------------------------+
|[3.5 akordeon] Trase           v  |
|[3.5 akordeon] Pipa/selang     >  |
|[3.5 akordeon] Pompa           >  |
|[3.5 akordeon] Lance           >  |
|[3.5 akordeon] Sumber air      >  |
|[3.5 akordeon] Lingkungan      >  |
+----------------------------------+
|[3.2.2] 6,6 bar  |  1,8 bar       |
|        67 m     |  1,3 m/s       |
+----------------------------------+
|[3.11] Tekanan sepanjang trase    |
+----------------------------------+
```

### 4.4 Pemicu pra-posisi `/pipa/pemicu`

Desktop:

```
 h1 Pemicu pra-posisi
+-----------------------------------------------------------------------------------------+
|[3.2.1 kartu] (Pemicu) [Asumsi kebijakan] [belum diuji balik]                            |
|2 kabupaten di PRA-POSISI, 5 di SIAGA; prakiraan Kalbar-Kalteng SON 2026 -29,5% dari normal|
| [3.5 chip] (Semua)(GELAR)(PRA-POSISI)(SIAGA)(NORMAL)                                    |
| [3.4 tabel] Kabupaten | Tingkat | Anomali hujan p50 (p10-p90) | Hari P(FWI>=14)>=0,5 |   |
|             Titik panas 24 jam zona A/B | Kit terdekat (jarak) | Depot | [Buat rencana]  |
|Sumber: BMKG/ECMWF ansambel, VIIRS FIRMS; data per 25 Okt 2026, 07.00 WIB               |
+-----------------------------------------------------------------------------------------+
+-----------------------------------------------------------------------------------------+
|[3.11 garis] P(FWI >= 14) 7 hari, Pulang Pisau   ----ambang 0,5----                      |
+-----------------------------------------------------------------------------------------+
```

HP: kartu judul, chip tingkat bergulir, daftar kartu per kabupaten (pil tingkat, tiga angka,
kit terdekat, tombol "Buat rencana"), grafik di bawah kabupaten terpilih. Data ansambel basi:
kolom tingkat menulis "–, data ansambel basi" + pil basi.

```
+----------------------------------+
|[3.2.1] 2 kabupaten di PRA-POSISI |
+----------------------------------+
|(GELAR)(PRA-POSISI)(SIAGA) ->     |
+----------------------------------+
|Pulang Pisau        [PRA-POSISI]  |
|hujan -32% | 4 hari | 6 titik     |
|kit SIPPA-001, 38 km  [Buat rencana]|
+----------------------------------+
```

### 4.5 Inventaris dan lacak kit `/pipa/kit` dan `/pipa/kit/:id`

Daftar, desktop:

```
 h1 Kit SIPPA                                                   [+ Buat kit] (Admin)
+-------------------------------------------------------+---------------------------------+
|[3.2.1 kartu] (Kit)                                    |[3.6 peta kecil]                 |
|3 kit: 2 di gudang Palangka Raya, 1 di banjir Kapuas;  | titik per kit + garis gerak     |
|kehilangan komponen musim ini 1,2%                     | 30 hari                         |
|Sumber: SIPPA D1, per 14.30 WIB                        |                                 |
+-------------------------------------------------------+---------------------------------+
| [3.5 chip status] (gudang)(depot)(gelar)(banjir)(servis)(hilang)  [3.5 chip jenis]      |
| [3.4 tabel] Kode | Jenis | Status | Lokasi | Prov | Sejak | Komponen | Jam pompa | m3   |
|             banjir | Pemilik asal                       [3.4 .pgn]                      |
+-----------------------------------------------------------------------------------------+
```

Daftar, HP: kartu judul, tombol besar "Pindai QR", daftar kartu per kit (kode besar, pil
status, lokasi, sejak, komponen kurang).

```
+----------------------------------+
|[3.2.1] 3 kit: 2 di gudang ...    |
+----------------------------------+
|[3.14 Pindai QR]  (tombol 56px)   |
+----------------------------------+
|SIPPA-001          [di gudang]    |
|Palangka Raya, sejak 22 Okt       |
|komponen lengkap                  |
+----------------------------------+
```

Rincian, desktop:

```
 [< Semua kit]
+-----------------------------------------------------------------------------------------+
| SIPPA-001   [pil dipakai banjir]   Kapuas, Kalteng   BMN BNPB         [3.14 QR] [Cetak]  |
| [3.2.2] jam pompa musim 46 | m3 banjir 1.240 | BBM 310 L | komponen kurang 1            |
+-----------------------------------------------------------------------------------------+
| [3.5 .ad-tabs] Komponen | Gerak | Pemakaian | BBM | Penugasan                          |
+-----------------------------------------------------------------------------------------+
| (Gerak)                                                                                 |
| [3.13 lini masa]                                   | [3.6 peta jejak]                   |
|  o 24 Okt 08.10 gudang > banjir  [pindah_banjir]   |  1 ---- 2                          |
|    YonTP, ETA 9 jam, tiba 24 Okt 16.40 (8 jam 30)  |          \                         |
|  o 20 Okt ...                                      |           3                        |
|                     [Catat gerak] [Konfirmasi tiba]|                                    |
+-----------------------------------------------------------------------------------------+
```

Tab Komponen = tabel BOM dengan tombol "Cek komponen"; tab Penugasan = daftar kode aktif
(tanpa kode), tombol "Tugaskan" (dialog §3.16, kode sekali tampil §3.14) dan "Cabut".

Rincian, HP:

```
+----------------------------------+
|< Semua kit                       |
|SIPPA-001    [dipakai banjir]     |
|Kapuas, Kalteng                   |
|[QR] [Cetak label]                |
+----------------------------------+
|46 jam pompa | 1.240 m3 banjir    |
+----------------------------------+
|[.ad-tabs 2 baris] Komponen Gerak |
| Pemakaian BBM Penugasan          |
+----------------------------------+
|[3.13 lini masa vertikal]         |
+----------------------------------+
```

### 4.6 Rekap time-motion `/pipa/log`

Desktop:

```
 h1 Rekap time-motion                       [rentang tanggal] (Karhutla|Banjir|Latihan) [Unduh CSV]
+-----------------------------+-----------------------------+-----------------------------+
|[3.2.1] Kelas I [n kecil]    |[3.2.1] Kelas II [n kecil]   |[3.2.1] Kelas III [n kecil]  |
|p50 3,4 jam, p90 5,1 jam dari|p50 7,2 jam ... dari 3       |p50 – dari 1 ulangan         |
|6 ulangan; ambang G3 p50 <= 4|ulangan                      |                             |
+-----------------------------+-----------------------------+-----------------------------+
|[3.11 titik + ambang] Tiba sampai air mengalir per ulangan, jam                          |
|  I   . ..  .        |  ambang G3 (putus)    hipotesis Studio 22-27 jam (putus, redup)  |
|  II      .  . .     |                                                                 |
|  III            .   |                                                                 |
+-----------------------------------------------------------------------------------------+
|[3.4 tabel] Tanggal | Kit | Regu | Kelas | Jenis | Panjang | Orang | Tiba-air | Gelar |   |
|            Bongkar | Jam pompa | BBM | Air m3 | Sumber | [pil jam meleset]   [.pgn]      |
+-----------------------------------------------------------------------------------------+
```

HP: tiga kartu kelas satu kolom, grafik, daftar kartu log (tanggal, kit, kelas, tiga durasi).

```
+----------------------------------+
|[3.2.1] Kelas I: p50 3,4 jam ...  |
|[3.2.1] Kelas II ...              |
|[3.2.1] Kelas III ...             |
+----------------------------------+
|[3.11] titik per ulangan          |
+----------------------------------+
|24 Okt  SIPPA-001  Kelas I        |
|tiba-air 3 jam 10 menit           |
+----------------------------------+
```

### 4.7 Form lapangan luring `/pipa/lapangan` (HP saja)

Desktop membuka tata letak HP yang sama di tengah (max 560px). Setiap layar di bawah adalah
satu `.lp-blok` utama.

```
(a) Masuk                          (b) Tugas
+----------------------------------+----------------------------------+
|[.lp-kop] SIPPA Lapangan          |[.lp-kop] SIPPA Lapangan          |
+----------------------------------+| Regu Pulang Pisau 1, SIPPA-001   |
| Buka tautan dari perencana atau  |+----------------------------------+
| pindai QR penugasan.             ||[3.7.2 .sp-sinkron] 3 isian      |
|                                  || menunggu sinyal  [Kirim sekarang]|
| [ Pindai QR ]          (66px)    |+----------------------------------+
|                                  || Kompleks tujuan KT-0412          |
| Kode penugasan                   || Berlaku sampai 23 Nov 2026       |
| [________________________]       ||                                  |
| [ Masuk ]              (58px)    || [ Mulai sesi gelar ]     (66px)  |
|                                  || [ Catat probe ]          (58px)  |
|                                  || [ Catat BBM ]            (58px)  |
|                                  || [ Pindah kit ]           (58px)  |
|                                  || [ Pindai QR ]            (58px)  |
|                                  || Keluar dari tugas (tautan)       |
+----------------------------------++----------------------------------+

(c) Sesi gelar                     (d) Angka sesi
+----------------------------------+----------------------------------+
| Jenis [Karhutla][Banjir][Latihan]| Panjang trase [____] m           |
| Kelas medan                      | Jumlah orang  [____]             |
| [I  jalan 4x4, gambut dangkal]   | Jam pompa [6,2] jam (otomatis)   |
| [II darat + sungai, sedang  ]    | BBM [____] L                     |
| [III perahu/portage, dalam  ]    | Totalizer awal [__] akhir [__] m3|
|                                  | Catatan [__________] 0/1000      |
| [3.7.2 .sp-stopwatch]            | [ Tambah foto ]                  |
|  Tiba            08.12 [Koreksi] |                                  |
|  Mulai gelar     08.40 [Koreksi] |                                  |
|  [ Air mengalir ]  (aktif, 66px) |                                  |
|  Mulai injeksi   (nonaktif)      |                                  |
|  Selesai         (nonaktif)      |                                  |
|  Bongkar selesai (nonaktif)      | [ Simpan sesi ]  (lengket, 66px) |
+----------------------------------+----------------------------------+

(e) Probe                          (f) BBM dan (g) Pindah kit
+----------------------------------+----------------------------------+
| Petak [P-03]  Titik [T2]         | BBM: (Terima)(Keluar)(Kembali)   |
| Tahap (Sebelum)(24 jam)(72 jam)  |      (Koreksi)                   |
|       (7 h)(30 h)(90 h)          | Liter [____]  Tiket [____]       |
| [3.7.2 .sp-probe]                | [ Simpan BBM ]                   |
|  10 cm  [ 31,5 ] C               |----------------------------------|
|  30 cm  [ 64,0 ] C [belum dingin]| Pindah kit: (Gelar)(Bongkar)     |
|  50 cm  [ 48,2 ] C               |             (Kembali)            |
| 100 cm  [ 29,0 ] C               | Lokasi [GPS: -2,71; 114,10] atau |
|                                  | [ketik lokasi]                   |
| [ Simpan probe ]  (66px)         | [ Simpan gerak ]                 |
+----------------------------------+----------------------------------+
```

### 4.8 Dashboard A/B `/pipa/ab`

Desktop:

```
 h1 Dashboard A/B                         [AOI v]  [Unduh CSV]
+-----------------------------------------------------------------------------------------+
|[3.8 .sp-unggah] Tarik berkas CSV ke sini atau [Pilih berkas]  <= 1 MB, <= 2.000 baris   |
|                 Unduh templat CSV                                   (perencana saja)    |
+-----------------------------------------------------------------------------------------+
+---------------------+---------------------+---------------------+---------------------+
|[3.12] Lance         |[3.12] Lance +       |[3.12] Sekat kanal / |[3.12] Lance dalam   |
|[hipotesis]          |surfaktan [hipotesis]|rewetting [hipotesis]|[lengan uji]         |
|LULUS                |BELUM BISA DIPUTUS   |TIDAK LULUS          |BELUM BISA DIPUTUS   |
|+34% ha dingin/regu- |n 6 per lengan (< 8) |selisih +4%, CI      |n 3                  |
|hari, CI 12-56%, n 10|                     |-9 s.d. 17%          |                     |
+---------------------+---------------------+---------------------+---------------------+
|[3.11 titik + CI] Ha dingin terverifikasi 30 hari per regu-hari, per lengan              |
|  Konvensional  .. . .|..                  (pembanding)                                |
|  Lance            . .|. ..  |--o--|       (disorot)                                   |
|  ...                                                                                    |
+--------------------------------------------+--------------------------------------------+
|[3.11 batang] Nyala ulang 7/30/90 hari (%)  |[3.4 tabel] Lengan | n | Air m3/ha |         |
|  per lengan                                |  Biaya/ha (dengan/tanpa CAPEX) | Vonis     |
+--------------------------------------------+--------------------------------------------+
```

HP: unggah disembunyikan (pita "Unggah dari laptop"), kartu vonis per lengan satu kolom,
grafik titik, tabel mode kartu.

```
+----------------------------------+
|[3.12] Lance  LULUS [hipotesis]   |
|+34%, CI 12-56%, n 10             |
+----------------------------------+
|[3.12] Lance + surfaktan          |
|BELUM BISA DIPUTUS, n 6           |
+----------------------------------+
|[3.11] titik + CI per lengan      |
+----------------------------------+
```

### 4.9 Simulator keputusan `/pipa/studio`

Desktop (kiri 340px, kanan sisa):

```
+--------------------------------+--------------------------------------------------------+
|[3.9 .sp-studio-kiri]           |[3.5 .ad-tabs] Bandingkan semua | Ringkasan | Hidraulika|
| Preset (S0|S0B|S1|S2|S3)       | | Biaya & BOQ | Risiko & gerbang | Simulasi | Matriks  |
| [Atur ulang]                   | | Batas alat                                           |
| v Wilayah & kelayakan          +--------------------------------------------------------+
|   Zona [A v]  Kelas medan (I|II|| [3.10 tabel matriks]                                   |
|   III)                         |             S0       S0B      S1      S2      S3       |
|   Panjang trase  ===o==  1.000m|             [KOND]   [KOND]   [HOLD]  [NO-GO] [NO-GO]  |
| > Sumber air & hidrologi       |             0/1/2    0/1/3    0/2/2   1/2/1   2/1/1    |
| > Arsitektur                   | CAPEX       Rp..     Rp..     Rp5,2  Rp9,7   Rp19,8   |
| > Pompa & tenaga               | OPEX/th     ...                                        |
| > Pemantauan & respon          | TCO 5 th    ...     [terbaik dibingkai]                |
| > Multi-guna & ekologi         | NPV manfaat 0 ...                                      |
| > Logistik & pemeliharaan      | NPV heli    – [menunggu]                               |
| > Anggaran & horizon           | MC P10/P50/P90 ...                                     |
| Pembanding tersimpan [U1 U3 v] | ...                                                    |
| [Simpan skenario] [Impor JSON] | S3: [ditutup sampai G5]                                |
| [Ekspor JSON] [BOQ CSV] [Cetak]| Sumber: mesin Karhutla Decision Studio v1.0 + gerbang  |
|                                | SIPPA; manfaat bawaan 0 [Asumsi kebijakan]             |
+--------------------------------+--------------------------------------------------------+
```

Tab Simulasi: histogram Monte Carlo (§3.11) di kiri, tornado kepekaan di kanan. Tab Batas
alat: teks dari `public/pipa/batas.js`.

HP:

```
+----------------------------------+
|[pita] Simulator dirancang untuk  |
|laptop                            |
|[Atur skenario] (buka lembar)     |
|(Bandingkan semua | Ringkasan)    |
+----------------------------------+
|[3.10 .sp-skenario] S0  [KOND]    |
|CAPEX Rp..   TCO Rp..             |
|NPV 0 ..     BCR ..               |
|tekanan .. | jam gelar ..         |
|hambatan keras: tidak ada         |
+----------------------------------+
|[3.10] S2  [NO-GO]                |
|keras: tekanan melewati batas ... |
+----------------------------------+
```

### 4.10 Simulasi 3D `/pipa/3d`

Desktop:

```
+-------------------------------------------------------------+---------------------------+
|[3.17 .sp-3d-kanvas] (Susunan kit|Jalur air|Injeksi)         |[3.17 .sp-3d-panel]        |
|                                                             | Debit ===o== 600 L/min    |
|     [adegan Three.js]                                       | DN (65|100|150)           |
|      pompa --- filter --- selang ~~~~~~~~ manifold = lance  | Panjang ===o== 1.000 m    |
|                                                             | Beda elevasi  2 m         |
|  [label komponen .sp-3d-lb]                                 | Lance aktif 8             |
|                                                             | Kedalaman 0-5 m  1,5      |
|  skala tekanan: <2 bar | 2-4 | ... | >batas                 | Kompleks [KT-0412 v]      |
|  [putar kiri][putar kanan][perbesar][atur ulang]            |---------------------------|
| Ilustrasi, bukan model panas terkalibrasi (adegan Injeksi)  |[3.2.2] tekanan, air tiba, |
|                                                             | v, TDH (angka = kalkulator)|
+-------------------------------------------------------------+---------------------------+
```

HP:

```
+----------------------------------+
|[pita] Layar ini dirancang untuk  |
|laptop                            |
|(Susunan|Jalur air|Injeksi)       |
|[kanvas 56vh]                     |
+----------------------------------+
|[3.2.2] angka                     |
|[kontrol, akordeon]               |
+----------------------------------+
```

### 4.11 Telemetri `/pipa/telemetri`

Desktop:

```
 h1 Telemetri                                                 [+ Daftar perangkat] (Admin)
+-----------------------------------------------------------------------------------------+
|[3.4 tabel] Tag | Kit | Jenis | Terakhir terlihat | Nilai terakhir | Mutu [pil] | Aktif  |
+-----------------------------------------------+-----------------------------------------+
|[3.11 garis] PT-102, 24 jam, bar               |[3.2.1] Alarm aktif dan riwayat          |
|  ---- tekanan lebih (putus)                   | [pil] tekanan_lebih PT-102 12,1 bar     |
|  ~~~~~~~~~                                    |  sejak 09.12 [Tutup alarm]              |
+-----------------------------------------------+-----------------------------------------+
Kosong: "Belum ada perangkat terdaftar. Telemetri dipasang mulai 2027 (§6.6)."
```

HP: daftar kartu perangkat, grafik tag terpilih, daftar alarm.

```
+----------------------------------+
|PT-102  SIPPA-001     [baik]      |
|4,8 bar, 2 menit lalu             |
+----------------------------------+
|[3.11] PT-102 24 jam              |
+----------------------------------+
|Alarm aktif (1)                   |
+----------------------------------+
```

### 4.12 Laporan PDF `/pipa/laporan`

Desktop:

```
 h1 Laporan
+------------------------------------+---------------------------------------------------+
|[3.7.1 form] Buat laporan           |[3.4 tabel] Arsip                                  |
| Jenis (Pilot|Kejadian|Mingguan|    | Waktu | Jenis | Provinsi | Rentang | Ukuran |    |
|        Musim|Skenario)             | Dibuat oleh | [Unduh]                  [.pgn]   |
| Provinsi [Kalteng v]               |                                                   |
| Rentang [tgl] - [tgl]              |                                                   |
| (Kejadian: sesi/tugas [v])         |                                                   |
| (Skenario: skenario [v multi])     |                                                   |
| [Buat PDF]                         |                                                   |
|------------------------------------|                                                   |
| Pratinjau isi (blok isiLaporan):   |                                                   |
|  judul, 4 temuan berangka, daftar  |                                                   |
|  bagian, jumlah halaman perkiraan  |                                                   |
+------------------------------------+---------------------------------------------------+
| Calon AOI usulan (untuk G0): [3.4 tabel] kompleks | alasan | status | pengusul         |
+-----------------------------------------------------------------------------------------+
```

HP: form satu kolom, lalu arsip mode kartu dengan tombol Unduh.

```
+----------------------------------+
|Jenis [Mingguan v]                |
|Provinsi [Kalteng v]              |
|Rentang [__] - [__]               |
|[ Buat PDF ]                      |
+----------------------------------+
|Arsip                             |
|sippa-mingguan-62-20261027.pdf    |
|27 Okt, 1,2 MB         [Unduh]    |
+----------------------------------+
```

Halaman 1 PDF (A4 tegak, §3.18):

```
+----------------------------------------------+
| | Laporan mingguan SIPPA            [BNPB]   |
| | BNPB | Oktober 2026                        |
|----------------------------------------------|
| Laporan Mingguan SIPPA Kalimantan Tengah     |
| 21-27 Oktober 2026   [CUT OFF 27 Okt 23.59]  |
| +------------------------------------------+ |
| |# 3 kit bergerak 5 kali; 1 di banjir Kapuas| |
| |# 46 jam pompa, 1.240 m3 air banjir        | |
| |# kehilangan komponen 1,2% (ambang 5%)     | |
| +------------------------------------------+ |
| 1. Gerak kit            [tabel navy]         |
| 2. Jam pompa dan m3     [batang]             |
| ...                                          |
|----------------------------------------------|
| Dibuat otomatis dari data SIPPA per ...  1   |
+----------------------------------------------+
```

### 4.13 Data dan metode `/pipa/data`

Desktop:

```
 h1 Data dan metode
+-----------------------------------------------------------------------------------------+
|[3.5 .ad-tabs] Dataset | Rumus | Gerbang | Batas pemakaian alat                          |
+-----------------------------------------------------------------------------------------+
|(Dataset) [3.4 tabel] Nama | Berkas | Sumber dan lisensi | Ditarik | Batas data |         |
|          Keterbatasan | Keyakinan [pil]                                                 |
|(Rumus) daftar fungsi §9.3: nama, rumus dalam .sp-rumus (monospace), satuan             |
|(Gerbang) tabel kode, syarat, tingkat [pil], pesan layar                                 |
|(Batas) teks batas.js, sama dengan Lampiran K                                            |
+-----------------------------------------------------------------------------------------+
```

HP: tab jadi dua baris; tabel dataset mode kartu; rumus menggulir horizontal di dalam
kotaknya sendiri, bukan halaman.

```
+----------------------------------+
|(Dataset)(Rumus)(Gerbang)(Batas)  |
+----------------------------------+
|kendala.json        [Terverifikasi]|
|OSM, ODbL; ditarik 24-25 Okt 2026 |
+----------------------------------+
```

### 4.14 Halaman tanpa akses (403)

```
+-----------------------------------------------+     +------------------------------+
| [.ad-top] Pantau Bencana STAF                 |     | [.ad-top]                    |
|  +-----------------------------------------+  |     | Akunmu tidak punya akses     |
|  | Akunmu tidak punya akses SIPPA.         |  |     | SIPPA.                       |
|  | Minta Super Admin menambah peran        |  |     | Minta Super Admin menambah   |
|  | pusdalops, koordalops, atau pimpinan.   |  |     | peran ...                    |
|  | Kembali ke halaman staf                 |  |     | Kembali ke halaman staf      |
|  +-----------------------------------------+  |     +------------------------------+
+-----------------------------------------------+
```

---
## 5. Visual buku dan deck

Semua gambar buku dan deck dirender dari `kajian/bangun/visual/` (peta `peta.mjs`, grafik
`dasar.mjs`, gambar teknik `teknik/*.mjs` baru) dengan token `tema.json`; angka dari
`angka.json` kunci `pipa.*` (PRD §8.3–8.4). Peta dan grafik deck adalah render yang sama
dengan DOCX, label dan legenda dibangun native di PPTX (PEDOMAN §B7.2).

### 5.1 Peta

| Unsur | Aturan | Sumber |
| --- | --- | --- |
| Latar dan laut | putih (`peta.latar`, `peta.laut` = `kertas`); tidak biru | PEDOMAN §B5.9, S peta |
| Daratan | netral `wilayah` #D3DBE5 di peta simbol; batas kab putih 0,4 pt; batas provinsi `batas` #A9B4C2 0,6 pt | `tema.json garis_pt` |
| Kompleks (Gambar 4.1, RE.1, slide B1) | simbol lingkaran zona §2.1.3 kolom D (biru/emas + pola penuh/cincin/setengah/silang), garis 0,5 pt `teks-2`; jari-jari menurut tahun terbakar MCD64A1 (`simbol_r_min_pt` 1,8 sampai `simbol_r_maks_pt` 7), kecil di atas besar | §2.1.3, L34 |
| Dua versi zona | peta kecil berganda (a) Konservatif, (b) Optimistis, skala dan legenda sama, label panel 9 pt Bold; di deck slide B1 dua panel berdampingan menggantikan "sakelar" | L33, L44, PRD §8.5 |
| Sel 2,2 km (Gambar 3.2, 4.2, slide A2) | kisi berwarna kekerapan 5 kelas `skala.api` (1–2, 3–4, 5–6, 7–9, 10–14 tahun); sel tanpa deteksi tidak digambar; garis sel tidak digambar di skala provinsi (hanya di inset) | §2.1.4 |
| Peta Indonesia kit per provinsi (Gambar 4.3, slide B2) | bulatan sebanding jumlah kit (total = simbol, bukan koroplet), `navy`, legenda tiga ukuran; label pil putih bergaris abu "Kalteng 12" | L34, PEDOMAN §B5.9 |
| Calon AOI | bulatan `navy` bernomor putih, tabel nomor di bawah peta (peta indeks) | L35 |
| Label | pil putih bergaris `garis` 0,5 pt, ≥ 8 pt cetak (≥ 7,5 pt slide); tidak ada yang bertumpuk (gerbang D-8) | `tema.json peta`, S peta |
| Legenda | wajib, di kaki peta rata tengah: judul legenda Bold, empat zona dengan penanda persis + huruf + arti 2–3 kata + jumlah, ukuran simbol tiga contoh, ramp sel berlabel kelas, "Belum terdata" berarsir bila ada | PEDOMAN §B5.9 |
| Skala dan utara | skala batang (`skala_lebar_rasio` 0,16, `teks-2`) dan panah utara 9 pt (`utara_pt`) di pojok kanan bawah untuk peta provinsi dan pulau | `tema.json peta` |
| Inset | inset lokasi (`inset_lebar_rasio` 0,2) di pojok kiri atas: Pulau Kalimantan dengan Kalteng `teks-3`, bingkai `garis`; inset perbesaran untuk calon AOI Palangka Raya, Pulang Pisau, Mantangai | `tema.json peta`, L36 |
| Kaki peta | "Sumber: OSM (ODbL) via Overpass 24–25 Okt 2026; kompleks api Pantau Bencana; MODIS MCD64A1; batas BIG/Kemendagri; WGS84 geografis" + "Batas wilayah bukan rujukan resmi" bila batas bukan BIG | PEDOMAN §B5.9 |
| Pil keyakinan | satu, kanan atas: "Terverifikasi" untuk jarak OSM; zona optimistis "Terverifikasi, wajib cek lapangan" | L40 |
| Nama perusahaan konsesi | tidak pernah tampil; status lahan cukup "konsesi" | KEPUTUSAN 50 |

### 5.2 Grafik buku dan deck

Mengikuti tabel pilih grafik PEDOMAN §B5.10 dan anatomi L37–L44. Grafik SIPPA dan kodenya:

| Gambar (PRD §8.2, §8.5) | Kode G | Bentuk |
| --- | --- | --- |
| 3.1 VIIRS Kalteng per tahun; slide A1 | G1 | batang tegak 2012–2025, ujung bulat, tanpa sumbu Y, nilai di atas tiap batang, tahun El Niño (2015, 2019, 2023) pekat `oranye`, lainnya tint `skala.api.2`, garis rata-rata berpil `navy` |
| 3.3 Anomali CHIRPS Jul–Okt | G7 | batang divergen dari nol, kering `oranye` dan basah `biru` (arah), berlabel kata |
| 3.4 Histogram tahun terbakar MCD64A1 per kompleks | G1 (sebaran cacah) | batang tegak per jumlah tahun 0–25, `navy`, kelas ≥ 3 tahun pekat dan lainnya `pembanding`; alasan satu kalimat di manifest (D-28): sebaran cacah per kompleks, bukan deret waktu |
| 6.1 Head loss per diameter | G4 | batang horizontal terurut, m per km pada 10 L/s, DN100 disorot `oranye`, lainnya `navy` |
| 6.2 Profil trase SIPPA-G-08 | garis (gambar teknik ringan) | elevasi DEMNAS (area `wilayah`) + garis tekanan `navy` 1,75 pt + batas 88% PN `merah` putus + 2 bar `oranye` putus; sumbu jarak dan elevasi berlabel satuan |
| slide C2 kurva head loss + serap lance | G4 + kartu angka | kurva atau batang per diameter, kartu "17 m per km", "8 lance paling banyak 320 L/min" |
| 11.1 Garis waktu gerbang | diagram vektor | lingkaran per gerbang G0–G6 di garis waktu Des 2026–2028, ikon status (§2.1.3 kolom D) |
| 12.1 CAPEX bertingkat gerbang; slide E1 | G9 | batang bertumpuk per tingkat (pilot 2026, pilot 2027–2028, skala Kalteng, nasional 81 kit), ≤ 4 kategori + "lainnya", total di atas |
| 12.2 Kipas Monte Carlo; slide E1 | G11 | pita P10–P90 `skala.air.1`, median `navy`, angka P10/P50/P90 tertulis, pil "Estimasi model, belum diuji balik" |
| Kepekaan 22.700 ha/kit ±50% (Bab 12) | G12 | tornado = batang rentang mengambang dari nilai dasar, diurut rentang terbesar, sisi naik `oranye` dan turun `biru` (arah), nilai ujung tertulis |
| A/B (Bab 11, bila ada data pilot) | G12 | titik + kumis CI 95% per lengan, satu baris per lengan, konvensional `pembanding`, lengan dibahas `oranye`, lainnya `navy`, pil "Hipotesis" atau "pilot, n kecil" |
| Kit nasional per provinsi | G4 | batang horizontal 18 provinsi, gambut `navy`, mineral `biru-abu`, label langsung |
| 10.1 Kalender kit | diagram vektor | baris bulan Jan–Des, pita musim kemarau tint `kering` dan hujan tint `basah`, penanda kit |

Larangan G25 berlaku (pai, donat, sumbu ganda, radar, 3D). Satu warna sorot per grafik
(S18). Teks grafik ≥ 8 pt cetak, ≥ 6 pt slide. Arah ditulis dengan ikon segitiga vektor atau
kata, tidak dengan karakter segitiga atau panah teks (L43).

### 5.3 Tabel buku dan deck

| Unsur | D (DOCX/PDF) | S (deck) |
| --- | --- | --- |
| Keterangan | di atas: "Tabel 4.1" Bold `navy` + judul deskriptif besaran, tempat, periode (L38, L48) | judul slide; kepala tabel berikon |
| Kepala | `navy`, teks putih 8,5 pt Bold kapital, satuan dalam kurung "JARAK (km)" (L49) | 6,5 pt Bold `teks-3` spc80 atau pil kepala berikon untuk metrik (TITIK, LUAS) |
| Baris | 9 pt, garis bawah 0,5 pt `garis`, tanpa garis tegak, tanpa zebra (L50) | baris 17,3–21,6 pt, pemisah #EEF0F3 |
| Angka | rata kanan tabular, titik ribuan | sama |
| Total | baris `navy` teks putih | kotak navy 21 pt |
| Kolom | ≤ 8 di A4 tegak; lebih ke Lampiran B atau .xlsx (L51) | ≤ 24 baris per slide, dipecah rata |
| Status/zona | pil huruf zona dan pil status kolom D §2.1.3; legenda di baris terakhir tabel (L48) | sama, 6–6,4 pt |
| Sorot | baris kompleks/kabupaten fokus `sorot-baris` #FDF1E8; bingkai `oranye` 0,75 pt untuk sel yang dibahas (S20) | sama |
| Kolom target/proyeksi | latar #F3F5F8 (L52) | sama |
| Sumber + keyakinan | "Sumber:" 8,5 pt di bawah tabel + pil keyakinan | zona kaki S14 |

Tabel kunci: 4.1 zona per kab, 4.2 kit nasional, 6.1 skenario hidraulika (termasuk uji OD160
NO-GO dengan pil NO-GO), 7.1–7.3 BOM (kelas kinerja, merek hanya di kolom "Rujukan
datasheet", PRD §1.5), 8.1 matriks respons, 9.1 RACI (matriks lembaga x tahap, sel chip kode
peran, S22–S23), 11.1 gerbang, 12.1–12.4 anggaran.

### 5.4 Gambar teknik (Lampiran D, SIPPA-G-01 sampai G-12)

**Format.** A3 lanskap (420 x 297 mm), bingkai 10 mm dari tepi (kiri 20 mm untuk jilid
lipat), PDF vektor untuk Lampiran D dan PNG 300 dpi untuk DOCX (PRD §6.9). Satuan mm
kecuali ditulis lain; tekanan bar; debit L/min; elevasi m. Proyeksi sudut pertama (ISO 128,
lazim di Indonesia), simbolnya digambar di blok judul. Huruf Roboto saja, tegak.

**Tebal garis** (ISO 128-20, dipetakan ke token garis yang ada):

| Jenis garis | Tebal | Pakai |
| --- | --- | --- |
| Tebal kontinu | 0,7 mm (≈ 2 pt, sama dengan `garis_pt.aksen_header`) | tepi tampak, pipa utama P&ID, bingkai gambar |
| Sedang kontinu | 0,5 mm | pipa cabang, komponen |
| Tipis kontinu | 0,25 mm (≈ 0,75 pt, `garis_pt.panel`) | garis dimensi, garis bantu, arsir potongan |
| Tipis putus | 0,25 mm, garis 3 mm jeda 1,5 mm | tepi tersembunyi, sinyal listrik/instrumen di P&ID |
| Tipis titik-garis | 0,25 mm | garis sumbu, garis potong (ujung tebal) |
| Tipis putus ganda | 0,25 mm | batas paket kit, batas lingkup pemasok |

Warna: hitam `teks` saja untuk gambar konstruksi; satu warna sorot `oranye` hanya untuk
catatan revisi (awan revisi) dan blok peringatan. Tidak ada isi warna lain.

**Teks gambar.** Judul tampak 5 mm (≈ 14 pt) Bold; label komponen 3,5 mm (≈ 10 pt); dimensi
dan catatan 2,5 mm (≈ 7 pt), batas bawah 2,5 mm (= 7 pt, di atas batas cetak 8 pt bila
gambar A3 diperkecil ke A4 tidak dipakai; Lampiran D dicetak A3 lipat, DOCX memakai versi
ringkas Gambar 7.1–7.3 dengan teks ≥ 8 pt).

**Dimensi.** Panah tertutup terisi 3 mm, angka di atas garis dimensi, satuan mm tanpa
ditulis kecuali menyimpang; toleransi ditulis bila ada; diameter "DN100" untuk selang/pipa
nominal dan "Ø" untuk diameter terukur.

**Blok judul** (kanan bawah, 180 x 60 mm, garis tipis, isi Roboto):

```
+----------------------------------------------------------------------------------+
| BADAN NASIONAL PENANGGULANGAN BENCANA  [logo BNPB]  | SIPPA                       |
| Sistem Pipa Portabel Karhutla dan Banjir             | Judul: Susunan kit relay (GA)|
+------------------------+-----------------------------+------------------------------+
| No. gambar SIPPA-G-01  | Revisi A                    | Skala 1:20 (A3)              |
| Satuan mm              | Tanggal 25 Okt 2026         | Proyeksi [simbol sudut 1]    |
+------------------------+-----------------------------+------------------------------+
| Digambar: ____________ | Diperiksa: ____________     | Lembar 1 dari 1              |
+------------------------+-----------------------------+------------------------------+
| PENGESAHAN INSINYUR BERLISENSI                                                     |
| Nama: ________________  No. STRA/SKA: ______________                               |
| Tanda tangan: ________  Tanggal: ___________________                               |
+------------------------------------------------------------------------------------+
| WAJIB VERIFIKASI DAN PENGESAHAN INSINYUR BERLISENSI SEBELUM DIBANGUN               |
+------------------------------------------------------------------------------------+
```

Blok pengesahan selalu kosong (PRD §6.9). Baris peringatan berlatar tint api #FDF4EC,
teks `teks` Bold 8 pt, garis kiri `oranye` 2 pt. Tabel revisi di atas blok judul (Rev,
Tanggal, Uraian, Oleh). Daftar bahan (BOM) di atas tabel revisi: No, Kode BOM, Uraian kelas
kinerja, Jml, Satuan, Rujukan datasheet. Tidak ada logo selain BNPB.

**Simbol P&ID** (SIPPA-G-02, G-09, G-10; mengikuti ISA-5.1 / ISO 10628, tag persis PRD §9.11):

| Simbol | Bentuk | Tag / catatan |
| --- | --- | --- |
| Pompa sentrifugal portabel | lingkaran dengan segitiga keluaran | P-101, P-102 (P-201 modul banjir) |
| Saringan isap (strainer) dan foot valve | kotak berarsir di ujung pipa isap + katup cek | – |
| Filter servis dengan bypass | kotak dengan garis diagonal + jalur bypass dua katup | F-101 |
| Katup bola | dua segitiga bertemu dengan lingkaran isi di tengah | V-1xx |
| Katup gerbang | dua segitiga bertemu | V-1xx |
| Katup cek | dua segitiga dengan garis tegak | CV-1xx |
| Katup pelepas tekanan (relief) | katup sudut dengan pegas, buang ke atmosfer | PSV-101, set ≤ 88% PN |
| Manifold DN100 ke 4 x DN65 | batang tebal dengan empat cabang berkatup | M-101 |
| Lance | garis tebal tegak menembus garis tanah, ujung berlubang | L-1..L-8 |
| Pemancar tekanan | lingkaran instrumen lapangan (garis tunggal) | PT-101 (isap), PT-102 (buang), PT-201 (manifold) |
| Pemancar debit / flowmeter | lingkaran instrumen + simbol meter di pipa | FT-101 |
| Pemancar level | lingkaran instrumen di tangki/sumber | LT-101 |
| Suhu gambut (probe) | lingkaran instrumen di garis tanah, kedalaman ditulis | T-101 sampai T-108 (10/30/50/100 cm ...) |
| Muka air tanah (piezometer) | lingkaran instrumen + pipa tegak | GWT-101 |
| Sensor CO, PM2,5 | lingkaran instrumen | CO-101, PM-101 |
| Level BBM, RPM | lingkaran instrumen di pompa | BBM-101, RPM-101 |
| GPS / gateway | kotak instrumen ganda (sistem) | GPS-101, gateway |
| Interlock dry-run | belah ketupat "I" dengan garis sinyal putus ke pompa | IL-101 |
| Garis proses | kontinu tebal, panah arah aliran tertutup terisi | – |
| Garis sinyal listrik | putus tipis | – |
| Garis sinyal nirkabel | garis tipis dengan zig-zag | – |
| Selang layflat | garis proses dengan label "DN100 layflat, PN, panjang" | – |
| Batas paket kit | putus ganda | – |

Legenda simbol wajib di lembar P&ID; tag identik dengan skema telemetri dan tabel
`sippa_perangkat` (PRD §6.9 kriteria terima).

**Diagram non-konstruksi** (SIPPA-G-11 diagram zona dan alur saran sarana, Gambar 1.1, 5.1,
5.2, 8.1): diagram vektor PEDOMAN §B5.23: kotak bergaris 0,75 pt `garis`, penghubung 0,75 pt
`teks-2`, panah sebagai kepala garis vektor, label 9 pt; alur saran sarana identik dengan
enam aturan `saranSarana` (PRD §9.4.2) dan memakai penanda zona §2.1.3 kolom D.

**Diagram penampang gambut** (Gambar 2.1, slide C1): tanah gambut tint `kering` muda, muka air
tanah garis `biru` 0,75 pt putus, zona bara 0,3–0,5 m arsir `skala.api.3`, lance garis `navy`
tebal, probe 0,1/0,3/0,5/1,0 m sebagai titik `navy` berlabel; skala kedalaman di kiri; label
"Ilustrasi" bila tidak terukur.

### 5.5 Jenis slide deck (konsisten dengan S1–S39)

Deck sekitar 15 slide isi + lampiran (KEPUTUSAN 19, PRD §8.5). Kerangka halaman, margin, garis
y95 dan y507,6, logo, footer, dan nomor halaman mengikuti Buku Pegangan "Kerangka halaman".

| No | Kode | `jenis` (S35) | Judul | Tata letak (S13: 3–4 blok) |
| --- | --- | --- | --- | --- |
| 1 | sampul | – | deskriptif 2 baris | foto Commons kanan dengan fade, logo dalam lingkaran putih, nama BNPB `biru-lembaga`, pil tanggal navy, tanpa nama penyaji (PEDOMAN §B7.3) |
| 2 | navigasi | navigasi | Pesan Kunci (deskriptif) | tesis 1 baris + 5 kartu temuan A–E berkode (S1, S2) + pita 3 keputusan oranye; pil CUT OFF |
| 3 | A1 | grafik | temuan berangka | batang VIIRS (§5.2) kiri 2/3 + kolom 2 kartu angka kanan |
| 4 | A2 | peta | temuan berangka | peta sel 2,2 km kiri 2/3 + kartu 85% dan 72% kanan |
| 5 | B1 | peta | temuan berangka | dua panel peta zona (a)(b) + legenda native di bawah + pita "wajib cek lapangan jalan track" |
| 6 | B2 | tabel | temuan berangka | tabel 18 provinsi native kiri + peta kecil kit per provinsi kanan; pil "rencana bersyarat, bukan pengadaan" |
| 7 | C1 | panel | temuan berangka | diagram penampang gambut + 3 kartu angka (0,3–0,5 m, PP 57/2016 0,4 m, air per m3) |
| 8 | C2 | grafik | temuan berangka | grafik head loss + serap lance; kartu 17 m/km; pil NO-GO untuk trunk 2.000 L/min |
| 9 | C3 | matriks | deskriptif | GA ringkas SIPPA-G-01 (PNG tanpa teks, label native) + tabel BOM kelas kinerja |
| 10 | D1 | tabel | deskriptif | matriks respons FRP x luas x zona, sel berpil tingkat |
| 11 | D2 | kartu-skenario | deskriptif | tujuh kartu gerbang G0–G6 (ikon status, syarat lulus, vonis gagal) dalam kisi 4 + 3 |
| 12 | D3 | matriks | deskriptif | RACI lembaga x tahap (S22): baris BNPB, Satgas, Manggala Agni, YonTP, BPBD, BRGM; sel chip R/A/C/I |
| 13 | E1 | grafik | temuan berangka | batang CAPEX bertingkat kiri + kipas Monte Carlo kanan, pil "Estimasi model" |
| 14 | E2 | rekomendasi | deskriptif | baris LANGKAH, RINCIAN, PENANGGUNG JAWAB bernomor, pita grup horizon 100 hari, 2026–2027, 2028–2030 (S28, S29); tanpa pil CUT OFF dan tanpa kaki |
| 15 | navigasi | navigasi | Kesimpulan (deskriptif) | 8 kartu 4 x 2 + pita ARAHAN oranye berisi 3 keputusan (S32) |
| 16 | penutup | – | Terima kasih | latar GELAP #051C2C, garis #F28C28, nama BNPB, alamat (T4), tanpa nama orang |
| L1–L3 | lampiran | tabel | "L1. " + deskriptif | pembatas GELAP lalu tabel native ≤ 24 baris dipecah rata (S33) |

Aturan yang wajib dicek di tiap slide: judul ≤ 2 baris 19–22 pt (S7), angka judul muncul lagi
di badan (S8), judul grafik 10 pt memuat topik, satuan, periode (S9), kode bagian oranye di
depan judul (S10), pil keyakinan 6–6,4 pt kanan atas panel (S15), pil CUT OFF "23 Okt 2026,
23.59 WIB" di semua slide data kecuali rekomendasi (S16), 180–290 kata (S17), satu warna
sorot (S18), karhutla selalu `oranye` dan banjir selalu `biru` (S19), sorot dengan bingkai
(S20), label langsung ≤ 4 seri (S21), dua slide berurutan tidak berjenis sama (S35), tiap
slide bervisual native (S36, S37), ≤ 6 butir per daftar (S38), tanpa emoji, Roboto saja.

---

## 6. Aturan copy

### 6.1 Suara

- Bahasa Indonesia saja (KEPUTUSAN 40). Di layar sapaan "kamu"; di buku, deck, dan laporan
  PDF tidak ada sapaan ("kamu" dan "Anda" ada di `tema.json kosakata.istilah.terlarang`).
- Polos, faktual, satu baris satu temuan, angka di depan; label = kata benda polos; judul
  kartu = fakta + angka + sumber (Buku Pegangan Angka & copy).
- Tanpa em dash, tanpa titik tengah (U+00B7), en dash hanya untuk rentang dan sel
  kosong. Tanpa emoji kecuali §2.8. Tanpa personifikasi, slogan, kontras "X bukan Y",
  tiga-serangkai gaya, kalimat penutup bergaya.
- Kata yang dilarang: "terbukti" untuk SIPPA (KEPUTUSAN 50, gerbang `gerbang-sippa` butir 1),
  "GO" sebagai vonis, "titik api" (pakai "titik panas"), "perkiraan satelit" (pakai "hitungan
  satelit"), "provinsi prioritas" (pakai "provinsi yang sering mengalami karhutla"), merek
  alat di luar kolom rujukan datasheet, nama perusahaan konsesi.
- Istilah tetap (satu istilah satu benda): kit, kompleks, sel 2,2 km, zona A–D, versi
  Konservatif/Optimistis/Terverifikasi, gelar, bongkar, depot depan, gudang induk, kode
  penugasan, regu, lance, layflat, manifold, probe, tiba sampai air mengalir, ha dingin
  terverifikasi, nyala ulang, lengan, petak, gerbang, vonis.

### 6.2 Angka dan satuan

| Aturan | Contoh benar | Salah |
| --- | --- | --- |
| `fmt` id-ID: titik ribuan, koma desimal, ≤ 1 desimal | 1.240 m3; 6,6 bar | 1,240; 6.57 bar |
| "–" bila kosong | – | 0, null, NaN |
| `toFixed` mentah dilarang di teks tampil | `fmt(x)` | `x.toFixed(2)` |
| Satuan selalu tertulis, berspasi, menempel pada angka | 600 L/min; 10 L/s; 1,5 m; 35 °C; 22 L/jam | 600; 600L/min |
| Satuan baku SIPPA | m, km, mm, DN (nominal), Ø, bar, m (head), L/min, L/s, m3, m3/jam, kW, HP, L, L/jam, kg CO2, °C, cm (probe), ha, jam, menit, hari, Rp | psi, gpm, kgf/cm2 |
| Persen ≤ 1 desimal, ribuan bertitik | 21,7%; +1.244% | 21.67% |
| Rupiah besar dalam miliar atau juta, kata ditulis | Rp5,2 miliar; Rp745 juta | Rp5,2 M; 5.230.000.000 |
| "rb/jt" hanya di label sempit, berspasi | 2,6 jt | 2,6jt di kalimat |
| Peluang kasar, tidak pernah 100% | < 1%; sekitar 60%; tinggi | 100%; 63,47% |
| Estimasi model sebagai rentang atau "sekitar" | Rp12,1–16,1 miliar (P10–P90); sekitar 17 m per km | Rp14.103.552.000 |
| Hitungan persis tanpa ± | 188 kompleks; 3 sesi | ± 188 |
| n kecil disebut | p50 3,4 jam dari 6 ulangan (n kecil) | p50 3,4 jam |
| Koordinat: 5 desimal di layar staf, 2 desimal di ekspor luar | -2,71234; 114,10234 | -2.71234 |
| Kedalaman injeksi | 1,5 m; 3–5 m (lengan uji) | 6 m (ditolak) |

### 6.3 Tanggal dan waktu

- Zona WIB, jam dengan titik: "14.30 WIB" (`jamWIB`, format.js:10). Hari dan agregasi menurut
  hari kalender WIB.
- Layar, tabel, pil: bulan singkat "25 Okt 2026", "25 Okt 14.30 WIB". Judul buku dan kalimat
  dokumen: bulan penuh "25 Oktober 2026" (PEDOMAN §C5).
- Rentang dengan en dash: "21–27 Okt 2026"; periode harian 07.00–07.00 WIB bila dipakai.
- Durasi lewat `fmt.durasi`: "45 menit", "6 jam 24 menit", "1 hari 10 jam".
- Waktu relatif hanya untuk ≤ 24 jam ("2 menit lalu", "5 jam lalu"); lebih lama ditulis tanggal.
- Tanpa tanggal ISO mentah di teks tampil (ISO hanya di `datetime=` dan nama berkas
  `YYYYMMDD`).
- Batas data buku: "Data per 23 Okt 2026, 23.59 WIB"; data harian: "per <waktu WIB>"; data basi:
  "basi, per <tanggal>".

### 6.4 Pola kalimat antarmuka

| Jenis | Pola | Contoh |
| --- | --- | --- |
| Judul kartu | angka + fakta + lingkup | "3 kit: 2 di gudang Palangka Raya, 1 di banjir Kapuas" |
| Tombol | kata kerja + objek | "Simpan skenario", "Tugaskan kit", "Konfirmasi tiba", "Unggah 1.240 baris", "Buat PDF", "Catat cek jalan" |
| Label isian | kata benda + satuan di isian | "Panjang trase" [1.000] m |
| Teks bantuan | batas dan arti, satu baris | "10–5.000 m. Panjang selang dari pompa ke manifold." |
| Kosong | apa yang kosong + sebab + cara mengisi | "Belum ada log gelar. Log masuk dari form lapangan /pipa/lapangan." |
| Galat isian | apa salah + batas + cara memperbaiki | "Debit 3.500 L/min di luar rentang 50–3.000 L/min. Kurangi debit atau tambah pompa." |
| Galat server | apa terjadi + kode + tindakan | "Data kit gagal dimuat (HTTP 500). Coba lagi dalam beberapa menit." + [Coba lagi] |
| 403 | "Akunmu tidak punya akses ke data ini." | |
| 503 migrasi | "Migrasi SIPPA belum diterapkan di basis data." | |
| Luring | "Luring. Menampilkan data terakhir per 14.30 WIB." | |
| Memuat (> 300 ms) | kerangka; teks hanya untuk proses panjang | "Menghitung 800 sampel Monte Carlo." |
| Sukses (toast) | hasil, bukan pujian | "Skenario U3 tersimpan." |
| Konfirmasi tak terbalik | judul = aksi + objek sebagai pertanyaan; isi = akibat; tombol = aksi | "Cabut tugas regu Pulang Pisau 1?" / "Kode tidak bisa dipakai lagi dan operator tidak bisa mengirim isian baru." / [Batal] [Cabut tugas] |
| Peringatan sekali tampil | perintah + akibat | "Simpan atau kirim tautan ini sekarang; tautan tidak bisa ditampilkan lagi." |
| Menunggu | "–" + pil "menunggu" + alasan | "– Harga heli menunggu angka BNPB." |
| Batas alat | dari `batas.js`, tidak ditulis ulang di layar lain | |
| Pita perangkat | "Layar ini dirancang untuk laptop." | |

Pesan gerbang ditulis persis seperti PRD §9.3 (tabel gerbang), dengan angka dari hasil hitung.

### 6.5 Label tetap

Nama layar (nav dan h1): Ringkas, Peta, Hitung (h1 "Kalkulator hidraulika"), Pemicu (h1
"Pemicu pra-posisi"), Studio (h1 "Simulator keputusan"), 3D (h1 "Simulasi 3D"), Kit, Log (h1
"Rekap time-motion"), A/B (h1 "Dashboard A/B"), Telemetri, Laporan, Data (h1 "Data dan
metode"). Kelompok rel: RENCANA, OPERASI, KELUARAN. Status, vonis, tingkat, dan keyakinan
hanya dengan label §2.1.3.

---

## 7. Checklist untuk pengulas

### 7.1 `selera-angka` (kartu, pop-up, laporan PDF, buku, deck)

- [ ] Semua angka tampil lewat `fmt`/`fmt.durasi`/`jamWIB` (web) atau token `{{angka:pipa.*}}` (buku, deck); tidak ada `toFixed(` di teks tampil `public/pipa/**`.
- [ ] Titik ribuan, koma desimal, ≤ 1 desimal; persen ≤ 1 desimal; "–" untuk kosong; tidak ada "NaN", "null", "undefined", "-0".
- [ ] Satuan tertulis di tiap angka dan termasuk daftar satuan baku §6.2.
- [ ] Tiap kartu, tabel, grafik, peta punya "Sumber:" (tanpa path internal) dan waktu data WIB.
- [ ] Tiap angka membawa pil keyakinan yang benar; efikasi selalu "Hipotesis"; heli "Menunggu" dengan "–".
- [ ] Estimasi model tampil sebagai rentang atau "sekitar"; tidak ada presisi palsu; tidak ada "100%".
- [ ] n kecil diberi pil; hasil pilot berpil "pilot, n kecil" dan tidak dipakai untuk vonis G4.
- [ ] Angka sama di judul, kartu, tabel, peta, PDF, buku, deck (zona 188/418/89/170 dan 469/158/167/71 dibaca dari `zona.json`, bukan diketik).
- [ ] Tidak ada kata "terbukti", "GO", "titik api", "perkiraan satelit", "provinsi prioritas", merek di luar kolom rujukan, nama perusahaan konsesi.
- [ ] Tidak ada em dash, tidak ada titik tengah (U+00B7); en dash hanya untuk rentang.
- [ ] Tanggal: singkat di layar, penuh di judul dokumen; tidak ada ISO mentah.
- [ ] Laporan PDF: logo BNPB saja, kaki halaman sesuai PRD §9.10, nama berkas `sippa-<jenis>-<prov>-<YYYYMMDD>.pdf`.
- [ ] Deck: S7, S8, S9, S14–S21, S35–S38 lolos (§5.5).
- [ ] Peta: legenda lengkap, zona berpola + huruf, tidak ada label bertumpuk.

### 7.2 `inp-reviewer` (handler di `public/pipa/*.js`)

- [ ] Tiap handler klik/input/change/keydown mengubah chrome (`aria-pressed`, `aria-selected`, `aria-expanded`, `aria-current`, kelas aktif, nilai gema) sebelum kerja berat.
- [ ] Kerja berat (gambar ulang SVG, tabel > 50 baris, `setFilter`/`setLayoutProperty` banyak lapis, hitung ulang Studio, geometri 3D) dipanggil lewat `nanti(` atau Web Worker; diperiksa per handler, bukan per berkas.
- [ ] Peta tidak pernah `setData` atau membuat ulang sumber saat menyaring; ganti tema memakai `setStyle(..., {diff:false})` lalu pasang ulang sesudah `style.load`.
- [ ] Monte Carlo di `studio_pekerja.js`; tanpa Worker jalan lewat `nanti()` dengan pita.
- [ ] Slider melebur kejadian (hanya keadaan terakhir dihitung).
- [ ] Nav: `aria-current` seketika, `import()` layar lewat `nanti()`; Ringkas tidak memuat MapLibre/Three.js.
- [ ] Form lapangan: tidak ada render tabel/grafik; ketukan stopwatch < 100 ms; IndexedDB lewat `nanti()`.
- [ ] Tabel dipaginasi 50 baris; cari tersaring dengan jeda 150 ms.
- [ ] 3D render hanya saat berubah, `pixelRatio` ≤ 1,5, `dispose` saat pindah layar, `prefers-reduced-motion` dihormati.
- [ ] Tidak ada animasi masuk batang grafik.

### 7.3 Aksesibilitas (diperiksa bersama kedua pengulas)

- [ ] Kontras teks ≥ 4,5:1 di terang dan gelap (tabel §2.1.5); `--ink3` tidak dipakai untuk teks kecil; `.hl` gelap memakai campuran terang.
- [ ] Penanda non-teks ≥ 3:1 (penanda zona C bercincin gelap, fokus `--info`).
- [ ] Warna tidak pernah sendirian: zona berpola + huruf, status berikon + label, lengan berposisi + label.
- [ ] Papan ketik: semua kontrol bisa dicapai, urutan fokus logis, Esc menutup dialog dan lembar, fokus kembali ke pemicu, tidak ada jebakan fokus; fokus tidak tertutup header lengket (`scroll-margin-top` = tinggi header + bilah konteks).
- [ ] Peran ARIA: segmen `radiogroup`, tab `tablist`, akordeon `aria-expanded`, sakelar `switch`, status `aria-live`.
- [ ] Peta punya alternatif Daftar lengkap; 3D punya panel teks; grafik punya `<title>`, `<desc>`, dan tabel `.sr`.
- [ ] Isian berlabel, galat terhubung `aria-describedby`, `aria-invalid`.
- [ ] Target sentuh ≥ 44px (< 768px), ≥ 56px form lapangan; jarak antar target ≥ 8px.
- [ ] Perbesaran 200% dan lebar 320px: tidak ada gulir horizontal halaman (tabel menggulir di wadahnya), tidak ada teks terpotong.
- [ ] `prefers-reduced-motion` mematikan transisi dan partikel.
- [ ] Toast tidak membawa informasi penting satu-satunya; kode penugasan tidak hilang otomatis (tetap sampai dialog ditutup).

---

## 8. Butir yang belum bisa diputus dari sumber yang ada

| No | Butir | Keadaan dan usulan bawaan | Yang memutus |
| --- | --- | --- | --- |
| 1 | Warna zona di buku dan deck | PRD mengunci hijau/biru/kuning/merah untuk web; `tema.json` tidak punya hijau dan membatasi merah untuk bahaya. Bawaan dokumen ini: bivariat biru/emas + pola dan huruf identik dengan web (§2.1.3). Bila pemilik ingin warna sama persis dengan web, `tema.json` perlu token zona baru yang lolos `validasi` | pemilik |
| 2 | Kunci `hipotesis` dan `menunggu` di `tema.json kosakata.keyakinan` | belum ada; rupa diusulkan di §2.1.3 (garis putus oranye, garis putus teks-3). Penambahan oleh pemilik berkas `data/kajian-bnpb/**` (`pipa-data`) | pemilik / `pipa-data` |
| 3 | z-index 12 untuk rel dan bilah bawah | tidak ada nilai repo di antara 10 dan 20 untuk navigasi lengket bawah; diusulkan 12 | pengerja `sippa` saat membangun |
| 4 | Glif ikon `khusus:` (api-pompa, pompa, selang, lance, manifold, heli, drone, probe-gambut) | belum digambar; aturan stroke 2 viewBox 24 | pengerja `sippa` + `pipa-data` (tema) |
| 5 | Logo BNPB untuk header laporan PDF dan blok judul gambar teknik | berkas `public/img/lembaga/sumber-bnpb.png` dirujuk `tema.json header_footer`; versi vektor untuk A3 belum diperiksa | `pipa-data` |
| 6 | Skala gambar teknik per lembar | ditentukan saat gambar dibuat dari dimensi BOM; blok judul punya slot | penggambar + insinyur berlisensi |
| 7 | Tampilan teks pil berwarna di deck (D9600B di FBE7D6, 3,1:1) | aturan rumah deck dipertahankan untuk S; di D dan PDF diganti teks `teks` (§2.1.5) | pemilik bila ingin diseragamkan |
| 8 | Kontras `.ad-galat` dan `.seg` aktif gelap di kode bersama | di bawah 4,5:1 (3,8 dan sekitar 4,2); `/pipa` menimpa lewat `pipa.css`; perbaikan di sumbernya milik `layar-peta`/`warga-api` | pemilik berkas bersama |
