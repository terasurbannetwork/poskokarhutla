# DESIGN-SYSTEM: Desa Waspada

Halaman `/desa-waspada` tiru kerangka halaman laporan lain: kepala situs bersama (kepala-situs-wajib), token `public/inti/tema.css`, kartu `.ex.ex-std` dari `public/inti/kartu.css` (AGENTS §3.5, §3.9). Tidak ada warna literal baru di luar `tema.css` (gerbang token-warna).

## 1. Aturan selera (mengikat)

- Kepala kartu = nama seksi berikon ("Titik panas 7 hari", "Pernah terbakar berulang", "Laju terukur"), bukan kalimat temuan; tanpa kalimat kesimpulan di isi kartu (§3.5 pembaruan 11 Nov 2026).
- Tanpa kaki "Sumber"; definisi dan keterbatasan masuk `title` kepala kartu atau kepala kolom.
- Tabel `.ex-tabel` menempel penuh, kepala tabel biru tua bertulisan putih, kepala kolom di tengah.
- Kartu tidak menempel (jarak 20 px), kolom berdampingan berakhir sejajar (tanpa ruang kosong besar di bawah kolom pendek).
- Tanpa HURUF KAPITAL SEMUA dan tanpa titik tengah ("·") sebagai pemisah; pakai koma atau kolom sendiri.
- Teks Indonesia lewat `bahasa-indonesia-plain`; paragraf rata kiri-kanan bila ada.
- Grafik atau peta interaktif: ada tooltip saat disorot.
- Tombol ikon polos tanpa garis luar (memori ikon-tanpa-garis-luar); deretan pilihan penuh lebar bila lebih dari satu.

## 2. Tata letak

| Lebar | Susunan |
| ----- | ------- |
| ≥ 1024 px | dua kolom: tabel kiri (60%), peta mini kanan menempel (sticky, tinggi 70% layar); kartu laju di bawah, penuh lebar |
| 640 sampai 1023 px | satu kolom: peta mini di atas tabel, tinggi 40% layar |
| < 640 px | satu kolom; tabel jadi kartu baris (nama desa, kab, titik 7 hari, tahun terbakar); peta mini dilipat `<details>` bernama "Peta" |

Gutter 16 px di ponsel; tanpa gulir horizontal halaman (tabel boleh gulir di dalam wadahnya bila perlu).

## 3. Kartu "Titik panas 7 hari" (daftar A)

| Kolom | Isi | Catatan |
| ----- | --- | ------- |
| Desa | nama, kecamatan di baris kedua kecil | tautan ke kartu kecamatan di `preventif` bila ada (D3) |
| Kab/kota | nama | |
| Titik 7 hari | bulat, `tabular-nums` | `title`: definisi VIIRS nominal dan tinggi, petak unik per hari |
| Titik 24 jam | bulat | |
| Terakhir | "12 Nov 18.40 WIB" | tanggal tanpa tahun bila tahun berjalan |
| Tahun terbakar | "5 dari 14" atau "kurang dari 3" | "kurang dari 3" bukan 0 |
| Gambut | "40%" dibulatkan 5 atau "–" | pil "perkiraan" di kepala kolom |
| Peluang kab/kota hari 1, 2, 3 | tiga angka kecil atau "–" | pil "hipotesis" selama status belum dinilai; `title`: "peluang kabupaten/kota, bukan desa" |

Deret kontrol di kanan judul: pemilih provinsi, pemilih kabupaten (terisi sesudah provinsi), kotak cari, tombol "Unduh CSV".

## 4. Kartu "Pernah terbakar berulang" (daftar B)

Kolom sama, tanpa Titik 7 hari dan Titik 24 jam (nol, tidak informatif), tambah "Tahun terakhir terbakar" (mis. 2024). Keadaan kosong menurut ALUR §3.

## 5. Kartu "Laju terukur"

Tabel 4 baris (A, B, semua lainnya, tak pernah terbakar) kolom: Kelompok, Desa-minggu, Minggu berikutnya ada titik (%), Selang 95%. Satu baris catatan metode di `title` (musim kering 2023, VIIRS, definisi sama dengan daftar). Bila `belum`: satu baris "Laju belum terukur." dan pil "hipotesis" di kepala kartu daftar. Kolom "Peluang kab/kota" tidak disentuh oleh laju.

## 6. Kata dan istilah

| Pakai | Jangan |
| ----- | ------ |
| titik panas | titik api (PKH-32) |
| desa dengan titik panas 7 hari | desa terbakar, desa pelaku |
| pernah terbakar berulang | rawan dibakar, langganan bakar |
| peluang kab/kota | peluang desa |
| belum terukur | 0 |
| tahun terbakar (batas bawah) | luas terbakar |

## 7. Interaksi dan kinerja (INP)

- Klik baris mengubah pin dengan `requestAnimationFrame`; peta mini tidak ikut render ulang tabel.
- Tabel besar (≥ 500 baris): `content-visibility: auto` per baris atau paginasi 100 baris, dipilih lewat `modern-web-guidance` di DW-07.
- Pemilih provinsi dan kabupaten: chrome kontrol urgent, daftar desa deferred (AGENTS global butir 2).
- Target INP < 200 ms untuk ganti provinsi, urut kolom, dan klik baris (`?perf`), diperiksa `inp-reviewer`.
- Ekspor CSV memakai `Blob` dan `URL.createObjectURL`; tidak memicu navigasi.

## 8. Hubungan dengan lapisan lain

Peta mini adalah instans kecil di halaman sendiri dengan pustaka peta yang sama dengan halaman lain; tidak menambah lapisan ke peta utama. Pin tidak boleh menutup kontrol atribusi dasar peta. Lapisan api 3D (K5) tidak dimuat di halaman ini.

## 9. Aksesibilitas

- Tabel semantik `<table>` dengan `<th scope>`; kontrol berlabel; fokus terlihat.
- Pin peta punya padanan tabel (baris yang sama), jadi peta bukan satu-satunya jalan.
- Kontras token tema; status tidak hanya warna (pil teks "hipotesis", "perkiraan").
- Tooltip tersedia lewat fokus papan ketik, bukan hanya hover.
