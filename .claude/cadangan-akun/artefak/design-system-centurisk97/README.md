# Centurisk97

Sistem desain situs Centurisk97 (centurisk97.id): peta dan analisis risiko bencana Indonesia untuk BNPB, BPBD, dan publik. Diekstrak dari `public/inti/` repo poskokarhutla, sumber gaya bersama semua halaman bencana.

## Prinsip

- **Satu rupa di semua halaman.** Tiap halaman, termasuk halaman staf, memakai Header navy yang sama dan token di sini. Tidak ada palet lokal per halaman.
- **Angka dulu.** Angka kunci di depan kalimat, disorot `f2` (jingga) atau `bad` (merah). Data menang atas hiasan.
- **Tenang dan padat.** Latar `paper` kebiruan, kartu putih bertepi `line` tipis, bayangan lembut `shadow`. Ruang kosong diisi data, bukan ornamen.
- **Interaktif.** Tiap grafik dan peta punya tooltip saat hover. Klik tidak boleh membekukan layar.

## Isi dan bahasa

- Bahasa Indonesia lugas. Tidak puitis, tidak berbau AI. Judul = fakta + angka + sumber, mis. "1.204 titik panas dalam 24 jam, 61% di lahan gambut".
- Format angka Indonesia: titik ribuan, koma desimal (3.418; 12,5%). Satuan selalu disebut, sumber selalu disebut di kaki kartu. Tanpa presisi palsu.
- Jangan memisahkan teks dengan titik tengah "·". Pakai koma, kalimat biasa, label sendiri, atau baris baru.
- Nama situs ditulis "Centurisk97". Jangan menulis "Pantau Bencana".
- Paragraf rata kiri-kanan. Label kapital kecil (`label`, kelas `.lbl`) hanya untuk label, bukan kalimat.
- Angka model yang belum lolos uji balik tetap tampil dengan pil "Hipotesis" (Pill `info`).

## Fondasi visual

### Warna

Navy adalah identitas. `brand` (navy tua) dan `brand2` (navy kedua) memegang header, segmen aktif, kepala tabel, dan tautan. `header-from` ke `header-to` adalah gradasi 135deg bilah atas.

| Peran | Token |
| --- | --- |
| Latar halaman | `paper` |
| Kartu, menu, tooltip | `card` |
| Kepala kartu, hover, isian | `surface` |
| Teks utama / sekunder | `ink` / `ink2` |
| Garis | `line` |
| Teks di atas brand | `on-brand` |
| Status | `ok`, `warn`, `bad`, `info` |
| Skala bahaya 0–3 | `f0` hijau, `f1` kuning, `f2` jingga, `f3` merah |
| Angka naik / turun | `naik`, `turun` |

Skala bahaya dibedakan juga oleh kecerahan (f1 paling terang, f3 paling gelap) dan selalu disertai label kata. `accent`, `warn`, `f1` terlalu terang untuk teks kecil di `paper`: pakai sebagai latar, titik, atau batang.

Tema gelap: latar navy sangat gelap, `brand` berubah jadi biru terang, dan teks di atasnya (`on-brand`) jadi navy gelap. Warna status dan skala bahaya sama di kedua tema.

### Huruf

- **Plus Jakarta Sans** (`display`, 600–800) untuk judul, nama situs, angka besar.
- **Inter** (`sans`, 400–700) untuk teks dan kontrol. Dasar 14.5px/1.5, tracking -0,006em.
- Angka di tabel, tooltip, dan paginasi selalu `tabular-nums` (kelas `.num`).
- Keduanya dari Google Fonts: `family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800`.

### Bentuk, jarak, bayangan

- Radius: kartu `r` 16px, kartu Insight `r-lg` 18px, menu dan tooltip `r-md` 14px, tombol ikon `r-sm` 10px, kontrol `pill` 999px.
- Kontrol (segmen, pemilih, tab) berbentuk pil, tinggi `control-h` 34px.
- Jarak: grid kartu `space-4` 14px, padding kartu `space-5` 18px, kartu Insight `space-6` 22px.
- Bayangan: `shadow` untuk kartu dan kontrol, `shadow-lg` untuk menu yang melayang. Bayangan bernuansa navy, bukan abu.
- Fokus: cincin 2px `info`, offset 2px.

### Tata letak

- Header fixed setinggi `top` (58px). Isi `.wrap` maks 1240px, kartu Insight maks 1180px.
- Grid `.g2`/`.g3`/`.g4` mulai 900px; di bawahnya satu kolom.
- Deretan pilihan di kartu penuh ujung ke ujung dan dibagi rata.
- Tiap bagian profil adalah kartunya sendiri.

## Ikonografi

Ikon garis inline SVG, viewBox 24, stroke `currentColor` 1.6–2px, ujung bulat, tanpa isi. Ukuran 16px di tab, 14px di segmen, 17–18px di menu bencana. Ikon bencana digambar oleh `/inti/kepala.js` dari `public/bencana.json`. Tidak ada emoji.

## Logo

Lencana persegi berujung bulat (rx 16 dari 64) bergradasi `logo-from` ke `logo-to` (jingga ke merah), dengan cincin radar putih dan sapuan seperempat lingkaran. Dipakai 32px di header, di atas navy. Lihat grup aset Logos.

## Hubungan dengan sistem BNPB

Deck, laporan DOCX/PDF, dan bahan paparan memakai sistem BNPB (https://claude.ai/artifact/NiHnxPKWa9YyXAGL9EcCfG): Roboto, navy #051C2C, oranye #D9600B sebagai aksen tunggal, dan 27 elemen grafis untuk halaman bingkai. Yang sama di kedua sistem:

- Aturan bahasa dan angka di bagian Isi dan bahasa.
- Angka karhutla di deck diambil dari sistem ini (tabel Real Time dan lapisan peta), tidak dari sumber lain.
- Kepala tabel teks polos rata tengah, paragraf rata kiri-kanan, skala bahaya berlabel kata, pil hipotesis.

Yang sengaja berbeda: huruf, nilai navy, warna angka kunci judul (merah `bad` di web, oranye di deck), dan arah perubahan (naik `naik` merah di web, oranye di deck). Gambar bagikan atau OG yang meniru slide tetap memakai sistem ini.

## Memakai di repo

Tautkan `/inti/tema.css` (token), `/inti/kepala.css` (header), `/inti/gaya.css` (dasar), lalu `kartu.css`, `insight.css`, `tabel.css` sesuai kebutuhan. Salin markup header dari `public/tentang.html`. Nama token di sini sama dengan variabel CSS di `tema.css` (`--paper`, `--brand`, `--f2`…), kecuali huruf: `--font` dan `--display` di repo, `--font-sans` dan `--font-display` di sistem ini.
