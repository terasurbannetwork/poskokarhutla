# DESIGN-SYSTEM: Kemitraan Kampus

Dokumen keenam dalam urutan otoritas. Kalah dari KP, PRD, ALUR, ALG, PD; menang atas DT,
KM, RU, TIKET. Versi 1.0, 30 Okt 2026.

**Satu aturan induk: tiru `/akademisi`.** Sumber kebenaran rupa = `public/akademisi.html`,
`public/akademisi.css`, `public/akademisi.js`, `public/inti/tema.css`, `inti/gaya.css`,
`inti/kepala.css`, `inti/kepala.js`. Tidak ada token, warna, atau komponen baru kecuali
tercantum di §5. Tidak memakai `bnpb.css`/`admin.css`.

## 1. Cara memuat

`public/kemitraan.html` (dan halaman turunan) memuat persis urutan `akademisi.html`:
```html
<script src="/akademisi_tema.js"></script>           <!-- pasang tema sebelum CSS -->
<link rel="stylesheet" href="/inti/tema.css">
<link rel="stylesheet" href="/inti/gaya.css">
<link rel="stylesheet" href="/inti/kepala.css">
<link rel="stylesheet" href="/akademisi.css">       <!-- DITAUTKAN, tidak disalin -->
<link rel="stylesheet" href="/kemitraan.css">       <!-- hanya komponen §5, prefiks .km- -->
<script type="module" src="/inti/kepala.js"></script>
<script src="/kemitraan/inti.js"></script>          <!-- helper bersama §4 -->
<script src="/kemitraan/<tampilan>.js" defer></script>
```
Tanpa skrip/gaya inline, tanpa `style=` di markup (CSP). Variabel per elemen (`--w`)
diset lewat `el.style.setProperty` di JS.

## 2. Token

Semua dari `inti/tema.css` (terang/gelap otomatis). Yang dipakai modul ini:
`--paper --card --surface --ink --ink2 --line --brand --brand2 --accent --ok --warn --bad
--info --f0..--f3 --shadow --shadow-lg --r(16) --r-sm(10) --top(58px) --font --display`.

Warna rumpun/bahaya = tabel `RUMPUN` di `akademisi.js` baris 15–30 (gempa #e8590c, tsunami
#0b7285, gunung api #c92a2a, banjir #1c7ed6, longsor #8d5524, karhutla #f76707,
hidrometeorologi #4263eb, iklim #e03131, kekeringan #b8860b, pesisir #1098ad, …). Bahaya
`udara` = #9c36b5 (#495057 sudah dipakai penginderaan jauh), `multi` = #2b8a3e. `akademisi.js` berbentuk IIFE tanpa ekspor, jadi tabel `RUMPUN`
disalin ke `KM.RUMPUN` (`public/kemitraan/inti.js`) dengan komentar asal baris; uji
`gerbang-kemitraan.test.mjs` membandingkan nilainya dengan `akademisi.js` agar tidak
menyimpang.

Kelas prioritas: P1 `--bad`, P2 `--warn`, P3 `--info`. Status selesai/aktif `--ok`.
Tipografi, radius, tinggi kontrol, gradien pita: persis /akademisi (input 48, kbtn 44,
segmen 36, tombol utama 46, pil 999px, kartu 20, popup 18, tabel 14).

Ikon: SVG garis 24×24 `fill:none; stroke-width:1.9; round`. **Beda dari /akademisi:** `ikon()`
dan `--w0` di akademisi.js memakai atribut `style=` (akademisi.js:31,80) yang dilarang gerbang
modul ini. `KM.ikon(d, kunci)` menulis `class="ak-ikon km-w-<kunci>"`; `kemitraan.css` memuat
satu aturan `.km-w-<kunci>{--w:<hex>}` per rumpun/bahaya/kelas (dijaga uji sama dengan `KM.RUMPUN`).
Daftar path ikon baru di §6.

## 3. Anatomi halaman `/kemitraan`

```
header.top                      ← inti/kepala.js (sama /akademisi)
section.ak-kepala               ← pita navy: h1 "Kemitraan Kampus" + #kmAngka.ak-ringkas (4 angka)
div.ak
  #kmTampil.ak-seg.ak-tampil    ← Daerah | Masalah | Riset | Dana | Satgas | Talenta | Kampus | Dasbor
  #kmMasuk  (401)  #kmGalat  #kmMuat (6 .ak-hantu)
  section#kmv-<tampil>.ak-tampilan (dibangun malas)
     .ak-saring                 ← cari + baris pemilih + segmen + chip
     .ak-hasil > h2.ak-judulv > (daftar kartu | tabel) > nav.ak-hal
#kmLembar.ak-lembar             ← dialog detail (pola #akLembar)
#kmSheet.ak-lembar.ak-sheet     ← lembar profil daerah/kampus/aktivasi (pola #akSheet)
#kmDpBar.ak-dpbar               ← daftar pendek pakar (pola /akademisi, kunci km-dp)
#kmTip
```
Angka pita per tampilan (`#kmAngka`, 4 butir `svg + b + span`):
- Daerah: kab/kota berprofil · masalah P1 · tervalidasi · kunjungan bulan ini
- Masalah: diajukan · ditelaah · tervalidasi · diambil
- Riset: agenda terbuka · hibah berjalan · proposal diajukan · inovasi
- Dana: donor siap · panggilan buka · tenggat ≤ 30 hari · dana lolos (Rp)
- Satgas: kampus bersatgas · anggota siap · pakar piket minggu ini · aktivasi berjalan
- Talenta: magang berjalan · alumni mentor · desa binaan · kab dampingan
- Kampus: kampus mitra · simpul · menunggu persetujuan · MoU segera habis
- Dasbor: indikator tercapai /14 · kampus pasif · dana mitra per Rp1 · celah daerah

Breakpoint persis /akademisi (1100, 1000, 720, 600). URL: `?tampil=&kab=&prov=&b=&a=&q=`
lewat `history.replaceState`, tampilan diingat localStorage `km-tampil`.

## 4. Komponen pakai ulang (kelas /akademisi, markup sama)

| Kebutuhan | Pakai | Catatan |
| --- | --- | --- |
| Segmen tampilan | `.ak-seg.ak-tampil` + `aria-pressed` | ikon tiap tampilan §6 |
| Cari | `label.ak-cari` | debounce 250 ms |
| Pemilih bercari (prov, kab, kampus, donor) | `htmlPilih`/`pasangPilih` → `.ak-kampus-pilih` | maks 300 butir |
| Chip filter (bahaya, kelas, status) | `.ak-chip` + `<span>` hitungan | |
| Toggle | `.ak-tog[aria-pressed]` | "Hanya P1", "Hanya milikku" |
| Kartu daftar | grid `.ak-daftar` | kartu baru §5.1 memakai kerangka `.ak-orang` |
| Kartu pakar di masalah | **persis** `.ak-orang` + `.ak-metrik` | metrik diganti: Skor, Jarak, Karya relevan |
| Tabel | `tabelHtml(kol,baris)` → `.ak-tw > table.ak-t2` | |
| Pil | `.ak-tanda`, `.ak-pl`, `.ak-pl.ok`, `.ak-hp` | |
| Tombol | `.ak-tbl`, `.ak-tbl.alt`, `.ak-x`, `.ak-kp` | |
| Paginasi | `navHal` → `.ak-hal` | 24 kartu, 25 baris tabel |
| Dialog | `.ak-lembar > .ak-latar + article.ak-dlg` → `.ak-dkepala` navy + `.ak-dtubuh` + `details.ak-dbagian` | |
| Lembar | `bukaSheet(jenis, kepala, isiFn)` | kepala tampil seketika, isi `nanti()` |
| Batang per kategori | `.ak-bars > .ak-br` | bahaya per kab, rumpun pakar kampus |
| Grafik garis | `grafik(seri,judul,warna)` | IRBI 2015–2025, kejadian tahunan |
| Daftar pendek + ekspor | `.ak-dpbar`, `.ak-dpmenu` (xlsx/docx/pdf CDN malas) | kunci `km-dp`, nama berkas `daftar-pendek-pakar-<kab>-<tgl>` |
| Memuat/kosong/galat | `.ak-hantu`, `kosongHtml()`, `#kmGalat` | |

Helper JS: salin dari `akademisi.js` ke `public/kemitraan/inti.js` sebagai `window.KM`:
`$, esc, angka, inisial, ikon, LUAR, urlOk, emailOk, navHal, htmlPilih, pasangPilih,
tabelHtml, bukaSheet, tutupSheet, nanti, grafik, ambil(jalur)` (fetch same-origin,
401 → `#kmMasuk`). Komentar kepala menyebut asal baris. Uji §8 menjaga perilaku sama.

## 5. Komponen baru (prefiks `.km-`, di `public/kemitraan.css`, maks 400 baris)

### 5.1 Kartu daerah `.km-daerah`
**Anatomi.** Kerangka `.ak-orang` (div role=button tabindex=0, `data-kab`):
```html
<div class="ak-orang km-daerah" role="button" tabindex="0" data-kab="6211" aria-label="Buka profil Kab. Pulang Pisau">
 <span class="ak-atas"><span class="ak-nama"><h3>Kab. Pulang Pisau</h3><span class="ak-lencana"><em class="km-l-irbi t1">IRBI Tinggi</em></span></span>
  <button class="km-buku ak-x" data-buku="6211" aria-label="Buku profil">[ikon buku]</button></span>
 <span class="ak-kartu-label"><span class="ak-prodi">Kalimantan Tengah</span></span>
 <span class="ak-pil"><button class="ak-r utama" data-fk="b" data-v="karhutla">[ikon]Karhutla</button>…≤3 bahaya teratas</span>
 <div class="ak-metrik"><div><span class="ak-mlabel">Masalah P1</span><b>3</b></div><div>…Kejadian 2015–2025…</div><div>…Kapasitas…<b>2/5</b></div></div>
</div>
```
**Varian.** IRBI data hanya `k` 0/1 (1 = Tinggi): `.km-l-irbi.t1` "IRBI Tinggi" (`--bad`) dan
`.km-l-irbi.t0` "IRBI di bawah Tinggi" (`--info`). Tidak ada tiga tingkat.
**Keadaan.** hover/focus = `.ak-orang`. Kartu tanpa siluet (ringkas.json ≤ 120 KB); siluet
(≤ 1 KB) hanya di JSON daerah, tampil di kepala lembar. **A11y.** tombol Buku punya label; Enter/Spasi membuka.

### 5.2 Kartu masalah `.km-masalah`
Kerangka `.ak-orang`. Kepala: pil kelas `.km-kelas.p1|p2|p3` + pil sumber
`.km-sumber.otomatis|bpbd|unit|lapangan` + pil status `.km-status.<status>`. Judul h3.
Baris bukti: maks 3 `.km-bukti` (`<b>angka</b> teks <small>sumber, tgl</small>`).
Metrik: Skor (0–100), Pakar cocok, Donor cocok. Pil "Belum diuji" (`.km-uji`) bila
ALG §11 belum lolos.

### 5.3 Pecahan skor `.km-pecah`
Batang bertumpuk horizontal 6 segmen (Teks, Rumpun, Lokal, Mutu, Jarak, Rekam) di kartu
pakar; warna `--f0..--f3`,`--accent`,`--info`; `title` per segmen "Teks 0,38 × 0,45".
Tinggi 8px, radius 999px. Elemen `<meter>` tidak dipakai (bertumpuk).

### 5.4 Kutipan solusi `.km-kutip`
`<blockquote class="km-kutip">“…kalimat abstrak…”<cite><a …>Judul, 2023, DOI</a></cite></blockquote>`
garis kiri 3px `--accent`, latar `--surface`, radius `--r-sm`, label kecil di atas
"Kutipan abstrak, bukan rekomendasi BNPB".

### 5.5 Daftar pertanyaan `.km-tanya`
`<ol class="km-tanya">` per arah (`h4` arah + ikon), butir `li` dengan `<span class="km-isian">`
untuk angka terisi (tebal), sub-butir "Mengapa?" bertingkat `ol` dalam. Mode isi
(pendataan): tiap `li` punya segmen Ya/Sebagian/Tidak (`.ak-seg`) + `textarea` 3 baris.

### 5.6 Linimasa status `.km-alur`
Langkah status mendatar (titik + label), aktif `--brand`, selesai `--ok`, tolak `--bad`.
Pola `.bn-alur` lama TIDAK dipakai (gaya bnpb).

### 5.7 Peta SVG `.km-peta-wil`
SVG viewBox dari bbox, path kab/kec (data `public/geo/*`), kelas `.k0..k3` mengisi
`--f0..--f3`, titik kampus `.km-titik-kampus` (lingkaran 6px `--brand`), titik desa
`.km-titik-desa` (4px `--accent`), arsir celah `.km-celah` (pola `pattern` garis).
Tanpa MapLibre (CSP /bnpb dan ringan).

### 5.8 Kartu panggilan `.km-panggil` (halaman saya)
Kepala merah navy (`.ak-dkepala` kecil) berisi jenis kejadian + kab + tanggal; tombol
besar 56px **Bersedia** (`.ak-tbl`) dan **Tidak** (`.ak-tbl.alt`); setelah menjawab,
diganti pil keadaan.

### 5.9 Sertifikat `.km-sertifikat`
Halaman cetak A4 mendatar, kop teks "Kemitraan Kampus · Centurisk97", nama, peran, jam,
kejadian/periode, QR (SVG dari pustaka kecil lokal `public/kemitraan/qr.js`, tanpa CDN),
id verifikasi.

### 5.10 Halaman cetak buku `.km-buku` (`public/kemitraan/buku.css`)
`@page { size: A4; margin: 18mm 16mm 20mm }`; Roboto (Google Fonts, sama laporan);
sampul satu halaman; `h1` per bab `break-before: page`; tabel tidak terbelah baris
(`break-inside: avoid` per `tr`); kaki halaman berisi sumber lewat elemen `position:
running` tidak didukung → pakai `<footer class="km-kaki">` per bab. Layar: lebar 210mm
di tengah, tombol Cetak mengambang (`.ak-tbl`), disembunyikan saat print.

## 6. Ikon baru (path SVG garis)
| Nama | Dipakai | `d` |
| --- | --- | --- |
| buku | kartu daerah, kepala lembar | `M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM8 7h6` |
| masalah | tampilan Masalah | `M12 9v4M12 17h.01M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z` |
| dana | tampilan Dana | `M3 7h18v10H3zM12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0` |
| satgas | tampilan Satgas | `M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z` |
| talenta | tampilan Talenta | `M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5` |
| kampus | tampilan Kampus | `M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6` |
| dasbor | tampilan Dasbor | `M4 20V10M10 20V4M16 20v-7M22 20H2` |
| tanya | panduan | `M9 9a3 3 0 1 1 4 2.8c-.7.3-1 1-1 1.7V14M12 18h.01` |
| aktifkan | tombol aktivasi | `M13 2 3 14h9l-1 8 10-12h-9z` |

## 7. Kalimat antarmuka
- Sapaan "kamu"; tanpa em dash; judul tanpa angka; label kartu satu baris.
- Label tetap: "Belum diuji", "Otomatis, belum divalidasi", "Tidak ada data untuk wilayah
  ini", "Kutipan abstrak, bukan rekomendasi BNPB", "Dihitung malam ini".
- Angka: `toLocaleString("id-ID")`; persen 0 desimal kecuali < 10% (1 desimal); Rp kiri,
  angka kanan di tabel; tanggal "30 Okt 2026".
- Tombol kata kerja: Setujui, Tolak, Ambil, Validasi, Gabungkan, Aktifkan kampus,
  Siapkan panggilan, Bersedia, Tidak, Cetak, Unduh.

## 8. Lakukan dan jangan
- Lakukan: delegasi event di kontainer `data-*`; render berat `nanti()`; token basi buang
  hasil async lama (pola `tokenS`); `esc()` untuk SEMUA nilai dari data.
- Jangan: `innerHTML` dengan nilai tanpa `esc`; `toFixed(` langsung untuk tampilan
  (pakai `angka()`); pustaka peta/grafik dari CDN (kecuali ekspor daftar pendek yang
  sudah dipakai /akademisi); warna hex baru di luar §2/§5; gaya `bnpb.css`.
