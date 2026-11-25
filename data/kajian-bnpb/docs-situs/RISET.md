# Riset: apa yang sudah ada dan bisa dipakai ulang

Disusun 24 Nov 2026 dari pembacaan repo. Tujuannya satu: Docs tidak membuat mesin kedua bila mesin yang ada sudah
cukup. Setiap butir menyebut berkas dan kesimpulannya.

## 1. Pembangun Markdown yang sudah ada

| Berkas | Isi | Dipakai ulang? |
| --- | --- | --- |
| `docs/buku-pegangan/bangun.py` | Daftar buku (`BUKU`), menyalin Markdown ke satu templat, menulis `docs/buku-pegangan/terbit/<nama>.html` | Pola daftar dan satu templat dipakai. Mesin render tidak |
| `docs/buku-pegangan/templat.html` | Kepala, daftar isi lengket, kotak cari; Markdown dirender di peramban dengan `marked` dari `cdnjs.cloudflare.com` | Tidak: bergantung CDN, isi tidak ada di HTML (mesin pencari dan cetak kosong), dan artifact claude.ai bukan halaman situs |
| `docs/buku-pegangan/gabung.py` | Menggabung beberapa Markdown menjadi satu | Gagasan urutan bernomor dipakai |

Kesimpulan: pembangun lama dirancang untuk artifact tertutup. Docs butuh HTML yang sudah jadi di `public/`, jadi
generator baru ditulis, kecil, stdlib saja.

## 2. Halaman statis berkepala situs

- `public/halaman_statis.js`: memasang tema tersimpan (`pk-tema`) sebelum CSS, menu garis tiga, dan tombol tema.
  Dimuat di `<head>`, tanpa skrip inline. Dipakai ulang apa adanya oleh halaman Docs.
- `public/syarat.html` dan `public/tentang.html`: contoh halaman berkepala situs (`privasi.html` tidak memuat kepala itu). Kepala
  (`header.top`, `#burger`, `#tema`, logo `/img/logo.svg`) dan tautan `/inti/kepala.js` ditiru oleh templat Docs.
  `public/tentang.html` besar (sekitar 150 KB) dan memuat gaya sendiri; itu contoh yang tidak ditiru.
- `public/inti/tema.css`: semua token (`--paper`, `--card`, `--surface`, `--ink`, `--ink2`, `--line`, `--brand`,
  `--brand2`, `--accent`, status `--ok`, `--warn`, `--bad`, `--info`, skala huruf `--fs-1` sampai `--fs-8`, jarak
  `--jr-1` sampai `--jr-7`, radius `--r`, `--r-sm`, `--r-pill`). Mode gelap lewat `data-theme`.
- `public/inti/kepala.css` dan `kepala.js`: kepala navy bersama dan menu bencana.
- `public/inti/kartu.css`: kartu standar `.ex.ex-std` (pil `.ex-ey`, kepala `.ex-hd`, judul `h3`, tabel `.ex-tabel`).
- `public/inti/metode.css` dan `metode-kartu.css`: gaya halaman metode yang sudah ada di layar lain; dibaca dulu
  supaya kartu metode Docs tidak berbeda rupa dari kartu metode di layar.

## 3. Perutean dan akses di Worker

- `src/worker.js`: `HTML_RUTE` memetakan pola jalur ke berkas aset, misalnya `/syarat` ke `/syarat.html` dan
  `/lapor` ke `/lapor/index.html`. `wrangler.jsonc` memakai `html_handling: "none"` dan `run_worker_first:
  ["/*.html", ...]`, jadi tiap berkas `.html` lewat Worker, sedangkan JS, CSS, dan JSON dilayani aset tanpa Worker.
- `halamanTerkunci` menutup semua `.html` di host terkunci (`centurisk97.id`, `www`, dan alamat workers.dev produksi)
  kecuali jalur yang tercatat. `PUBLIK_TANPA_SESI` adalah `Map` jalur persis ke alasan; pencocokannya persis, bukan
  awalan. Untuk 14 halaman Docs, daftar persis tidak praktis: perlu aturan awalan `/docs` (tiket DC-03).
- `/lapor/index.html` dan `/lapor/lacak.html` punya pengecualian regex di `halamanTerkunci` agar alamat langsung
  berkas terbuka; pola itu ditiru untuk `/docs/*.html`.
- `public/.assetsignore` memuat berkas yang tidak diterbitkan. Docs tidak menambah isinya.

## 4. Aturan repo yang mengikat

- AGENTS.md §3.7: fitur besar lahir sebagai paket dokumen dulu. Gerbang `tests/agen/gerbang-paket-modul.test.mjs`
  menolak folder baru di `public/` atau `scripts/` tanpa bagian "baca dulu, baru bangun" yang menyebut foldernya.
  Folder `public/docs` dan `scripts/docs` baru, jadi bagian AGENTS.md wajib ada sebelum kode (tiket DC-00).
- AGENTS.md §3.5: kartu laporan standar. Kepala kartu berupa nama seksi berikon, tanpa kalimat kesimpulan, tanpa
  kaki Sumber. Kepala tabel navy tua. Gerbang `tests/agen/gerbang-kartu-std.test.mjs` menyimpan daftar layar.
- AGENTS.md §3.8: tinjau di `http://localhost:8800/docs`. Server tinjau (`scripts/agents/tinjau_lokal.mjs`) melayani
  kode dari folder kerja, jadi keluaran yang di-commit di `public/docs/` langsung terlihat.
- AGENTS.md §3.9: gerbang `tests/agen/gerbang-token-warna.test.mjs` memindai semua `.css` di `public/` dan menolak
  tambahan literal warna. `public/docs/docs.css` harus nol literal.
- `tests/agen/fixtures/modul-lama.json`: daftar folder `public/*` dan `scripts/*` yang lahir sebelum aturan paket.
  `public/docs` dan `scripts/docs` tidak masuk daftar itu karena tidak boleh dihitung sebagai utang.
- `scripts/agents/roster.json` dan `npm run agents:build`: satu-satunya jalan membuat agent. Tiap berkas kode tepat
  satu pemilik.

## 5. Pola keluaran yang di-commit

Pipeline repo sudah terbiasa menulis keluaran ke `public/` dan meng-commit-nya. `scripts/agents/build.mjs` menulis
`KATALOG.md` dan gerbang memastikan katalog segar. Docs memakai pola yang sama: generator menulis, gerbang
`bangun.py --cek` membandingkan, `terbit.yml` menjalankan uji sebelum deploy sehingga keluaran basi tidak terbit.

## 6. Alternatif yang ditimbang

| Alternatif | Alasan ditolak |
| --- | --- |
| Render Markdown di peramban dengan `marked` (seperti buku pegangan) | Bergantung CDN, halaman kosong tanpa JS, tidak bisa dicari mesin pencari, dan CSP halaman publik ketat |
| Render di Worker saat permintaan | Menambah CPU dan kode di `src/worker.js` untuk isi yang berubah hanya saat commit |
| Situs generator pihak ketiga (VitePress, Docusaurus, MkDocs) | Repo melarang build step di layar dan pip di Actions; menambah dependensi besar |
| Menulis HTML tangan per halaman | 14 halaman akan menyimpang dari kerangka; tidak bisa diperiksa mesin |
| Menaruh Docs di artifact claude.ai | Bukan bagian situs, tidak ikut gerbang dan tema, dan tidak bisa menjadi alias subdomain |

## 7. Sumber isi yang akan dirangkum

Isi 14 berkas berasal dari kode dan paket kajian modul di `data/kajian-bnpb/*/` (tiap paket punya KEPUTUSAN,
ALGORITMA, DESAIN-TEKNIS). Docs tidak menggantikan paket itu. Aturan jujurnya: bila kode dan paket berbeda, yang
ditulis adalah kode, dan perbedaannya dicatat di bagian Batasan.
