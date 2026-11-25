# Algoritma: pembangun Docs

Seluruhnya Python 3.12 stdlib. Tidak ada angka ambang model kebencanaan di sini; yang diatur adalah aturan
pembangunan halaman dan pemeriksaan isi.

## 1. Penamaan dan urutan

- Sumber: `docs/centurisk97/NN-slug.md`, `NN` dua digit 01 sampai 14, `slug` huruf kecil, angka, dan tanda hubung.
- Slug halaman = nama berkas tanpa awalan nomor dan tanpa `.md`. Alamat: `/docs/<slug>`.
- Urutan di bilah samping dan beranda mengikuti `NN`. Nomor tidak tampil ke pembaca.
- Berkas lain di folder itu (misal `README.md`) diabaikan; berkas bernama "* 2.*" diabaikan dan dilaporkan sebagai
  salinan nyasar.
- Dua berkas dengan slug sama: galat.

## 2. Subset Markdown yang didukung

Generator menulis penghurai kecil, bukan pustaka umum. Yang didukung, dan hanya ini:

| Unsur | Catatan |
| --- | --- |
| Judul `#` sampai `####` | `#` tepat satu per berkas; `##` hanya lima nama baku; `###` dan `####` bebas |
| Paragraf, daftar bertitik, daftar bernomor | Daftar bersarang sampai dua tingkat |
| Tabel gaya GFM | Baris pemisah `---` wajib; sel berisi inline saja |
| Blok kode berpagar tiga tanda petik balik | Bahasa opsional; isi di-escape, tidak dijalankan |
| Kode inline, tebal, miring, tautan `[teks](url)` | Tautan hanya `https://`, `/jalur`, atau `#bagian` |
| Kutipan `>` | Satu tingkat |
| Garis pemisah `---` | Di luar tabel |

Yang ditolak dengan galat: HTML mentah, gambar `![]()` dari luar, tautan `javascript:`, dan skrip. Seluruh teks
di-escape untuk HTML sebelum penanda inline diterapkan, sehingga isi tidak pernah menjadi markup.

## 3. Pemeriksaan sumber (`--cek-sumber`)

Tiap berkas diperiksa berurutan. Semua galat dikumpulkan lalu dicetak sebagai `berkas:baris: pesan`.

1. **Kerangka**: tepat satu `#`; bagian `##` tepat lima, nama dan urutan: Ringkasan, Panduan pengguna, Metode,
   Referensi teknis, Batasan. Tiap bagian tidak kosong dan lebih dari 200 byte [bawaan, dapat dilonggarkan oleh
   keputusan pemilik].
2. **Kata dan tanda terlarang**: nama produk lama; titik tengah sebagai pemisah; daftar kata vonis yang dilarang
   AGENTS.md (daftar ada di kode generator dan diuji, dicocokkan sebagai kata utuh dan tidak peka huruf besar).
   Kutipan nama kolom yang memang memuat kata terlarang tidak diizinkan; ditulis ulang.
3. **Data pribadi dan rahasia**: pola surel, nomor telepon Indonesia, token panjang (rangkaian 32 karakter atau lebih
   dari huruf, angka, garis bawah, tanda hubung tanpa spasi), awalan kunci umum (`sk-`, `ghp_`, `AKIA`), dan
   baris yang tampak seperti `NAMA=nilai` huruf besar. Cocok = galat.
4. **Rujukan kode**: pola `berkas:baris`, `berkas:baris-baris`, dan `berkas` di dalam tanda kode inline pada bagian
   Referensi teknis dan Metode. Berkas harus ada di repo (jalur relatif akar). Nomor baris dan akhir rentang tidak
   boleh melewati jumlah baris berkas. Rujukan ke berkas di `.gitignore` atau luar repo: galat.
5. **Referensi teknis tidak kosong bukti**: bagian itu harus memuat sekurang-kurangnya satu rujukan, atau frasa
   persis "belum terdokumentasi di kode".
6. **Status model**: bila bagian Metode memuat kata "hipotesis" tanpa kata "uji balik", atau memuat "lulus" tanpa
   menyebut berkas atau tanggal vonis, peringatan (bukan galat) dicetak agar pemeriksa memeriksa.
7. **Tautan dalam**: tautan `#bagian` harus menunjuk judul yang ada di berkas; tautan `/docs/<slug>` harus slug yang ada.

## 4. Render

Urutan: baca, normalkan akhir baris, pecah blok, render blok, terapkan inline pada teks yang sudah di-escape,
sisipkan templat.

- Tiap bagian `##` menjadi satu `<section class="ex ex-std" id="...">` dengan `data-untuk` sesuai sudut
  (lihat 5). `id` dari nama bagian: `ringkasan`, `panduan`, `metode`, `teknis`, `batasan`.
- Judul `###` dan `####` mendapat `id` dari teks (huruf kecil, spasi jadi tanda hubung, bersihkan diakritik), diberi
  akhiran `-2`, `-3` bila bentrok. Id inilah yang masuk daftar isi halaman.
- Kata status pada bagian Metode (HIPOTESIS, lulus, gagal, belum diuji) di dalam teks tebal atau kode inline diberi
  kelas pil (`pil-hipotesis`, `pil-lulus`, `pil-gagal`, `pil-belum`) yang warnanya dari token `--warn`, `--ok`,
  `--bad`, `--ink2`. Kata yang sama di luar tebal atau kode tidak diubah.
- Tabel dibungkus `div.tabel-gulir`; kelasnya `.ex-tabel`.

## 5. Sudut pembaca

| Bagian | `data-untuk` |
| --- | --- |
| Ringkasan | `pengguna pengembang` |
| Panduan pengguna | `pengguna` |
| Metode | `pengguna pengembang` |
| Referensi teknis | `pengembang` |
| Batasan | `pengguna pengembang` |

Aturan tampil di peramban: sudut "Semua" menampilkan semuanya. Sudut tertentu menyembunyikan bagian yang
`data-untuk`-nya tidak memuat sudut itu. Tanpa JavaScript, tidak ada yang disembunyikan.

## 6. Indeks cari

`cari.json` berisi larik objek `{u, t, b, k}`:

- `u` alamat bagian (`/docs/<slug>#<id>`), `t` judul topik, `b` nama bagian atau judul `###`, `k` teks polos tanpa
  markup, dipotong 600 karakter pertama, huruf kecil, diakritik dibuang.

Pencarian di peramban:

1. Pecah kueri menjadi kata (huruf kecil, diakritik dibuang, minimal 2 karakter).
2. Skor per entri: jumlah kata yang ada di `b` dikali 3, ditambah yang ada di `t` dikali 2, ditambah yang ada di `k`
   dikali 1. Entri yang tidak memuat semua kata diberi skor 0 dan tidak tampil.
3. Urut skor menurun, lalu urutan sumber. Tampilkan paling banyak 20, dengan sorotan kata.

Bobot 3, 2, 1 adalah pilihan rancangan awal, bukan hasil pengukuran; ditinjau setelah ada contoh kueri nyata (DC-04).

## 7. Idempoten dan sidik

Keluaran ditulis hanya bila isinya berbeda dari berkas yang ada. `_bangun.json` memuat hash SHA-256 tiap sumber,
tanggal bangun (WIB, tanggal saja), jumlah halaman. Tanggal hanya diperbarui bila ada hash yang berubah, sehingga
bangun ulang tanpa perubahan tidak menghasilkan diff. `--cek` membangun ke memori dan membandingkan dengan isi
`public/docs/`; selisih = keluar 1 dengan daftar berkas yang beda.

## 8. Uji diri generator (`--uji`)

Fixture di memori: Markdown benar, Markdown dengan tiap jenis galat (kerangka salah, kata terlarang, rujukan
melewati panjang berkas, tautan `javascript:`, HTML mentah, surel). Uji memastikan tiap galat terdeteksi dan
Markdown benar menghasilkan HTML yang lolos pemeriksaan escape (tidak ada `<script` dari isi).
