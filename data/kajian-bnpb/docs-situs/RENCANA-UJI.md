# Rencana uji: Docs

Kriteria terima dan perintah bukti. Satu tiket selesai bila perintah buktinya hijau dan, untuk layar, pemilik meninjau
di `http://localhost:8800/docs` (AGENTS.md §3.8). Bila port 8800 tidak menjawab, jalankan `npm run tinjau` di latar.

## 1. Uji generator

Perintah: `python3 -I scripts/docs/bangun.py --uji`

| Uji | Yang dipastikan |
| --- | --- |
| Kerangka benar | Markdown dengan lima bagian baku lolos |
| Kerangka salah | Bagian hilang, urutan tertukar, nama berbeda, dua `#`: tiap kasus galat dengan nomor baris |
| Escape | Teks berisi `<script>`, `&`, tanda kutip menjadi teks, bukan markup |
| Tautan | `javascript:`, `data:`, `http://` tanpa TLS ditolak; `https://`, `/jalur`, `#jangkar` diterima |
| HTML mentah | Ditolak |
| Rujukan | Berkas ada dan baris dalam rentang: lolos. Berkas tidak ada, baris 0, baris melewati panjang berkas, akhir rentang kurang dari awal: galat |
| Kata dan tanda terlarang | Nama produk lama, titik tengah, tiap kata vonis dari daftar: terdeteksi sebagai kata utuh; kata yang hanya memuatnya sebagai bagian kata lain (misalnya "keamanan") tidak salah deteksi |
| Rahasia dan pribadi | Surel, nomor telepon, token, `sk-`, `ghp_`, `AKIA`, `NAMA=nilai`: terdeteksi |
| Id judul | Diakritik dan spasi dibersihkan; id kembar diberi akhiran |
| Pil status | Kata status di tebal atau kode mendapat kelas; di luar itu tidak |
| Idempoten | Dua kali bangun berurutan: nol berkas berubah, tanggal tidak berubah |
| Indeks cari | Teks polos tanpa markup, panjang paling banyak 600, diakritik dibuang |

## 2. Uji keluaran

Perintah: `python3 -I scripts/docs/bangun.py --cek` lalu `node --test --test-concurrency=1 tests/docs/*.test.mjs`

| Uji | Yang dipastikan |
| --- | --- |
| Keluaran segar | `public/docs/` sama dengan hasil bangun dari sumber; selisih = gagal dengan daftar berkas |
| Jumlah halaman | Tiap sumber `NN-slug.md` punya `<slug>.html`; tidak ada halaman yatim |
| Kerangka HTML | Tiap halaman memuat lima `section.ex.ex-std` berid baku, tepat satu `h1`, `nav` bilah samping dengan semua slug, satu `aria-current="page"` |
| Kepala situs | Penanda struktur kepala (`header.top`, `#burger`, `#tema`) sama dengan yang ada di `public/syarat.html` |
| Tanpa skrip dan gaya inline | Tidak ada `<script>` tanpa `src`, tidak ada atribut `style=` |
| Tanpa host luar | Semua `src` dan `href` aset adalah jalur situs atau huruf yang sudah dimuat situs |
| Tabel | Tiap tabel dibungkus `div.tabel-gulir` dan berkelas `ex-tabel` |
| Kartu | Kepala kartu berisi nama seksi; tidak ada kaki Sumber (gerbang tanpa kesimpulan) |
| Ukuran | Halaman di bawah 1 MB; `cari.json` di bawah 1 MB; peringatan di atas 200 KB dan 300 KB |
| Sidik | `_bangun.json` berisi hash tiap sumber yang cocok dengan berkasnya |

## 3. Uji perilaku peramban

Berkas: `tests/docs/perilaku.test.mjs` (mengisi DOM bayangan dari HTML keluaran; bila Chrome tersedia di mesin,
variasi dengan peramban sungguhan tidak diwajibkan).

| Uji | Yang dipastikan |
| --- | --- |
| Sudut | Memilih "Pengguna" menyembunyikan bagian bertanda `pengembang` saja; "Pengembang" menyembunyikan `pengguna` saja; "Semua" menampilkan semua; tanpa JS tidak ada yang disembunyikan |
| Alamat bagian | Membuka `#teknis` pada sudut Pengguna membuka bagian itu |
| Cari | Kueri satu kata, dua kata, kata dengan diakritik, kata tak ada; skor mengikuti bobot ALGORITMA bagian 6; maksimum 20 hasil |
| Gagal muat indeks | Pesan "pencarian tidak tersedia", tidak ada galat tak tertangani |
| `localStorage` gagal | Tidak melempar; sudut kembali ke "Semua" |
| Hasil cari tidak jadi markup | Kueri berisi `<img onerror>` tidak menjadi markup |

## 4. Uji rute dan akses

Berkas: `tests/docs/rute.test.mjs` dan, untuk Worker, `tests/warga/docs_rute.test.mjs`.

| Uji | Yang dipastikan |
| --- | --- |
| Slug sama | `DOCS_SLUG` di `src/docs_rute.js` sama dengan `bangun.py --slug` |
| Rute | Tiap slug punya entri `HTML_RUTE` yang menunjuk berkas aset yang ada |
| Publik | `halamanTerkunci` mengembalikan false untuk `/docs`, `/docs/<slug>`, `/docs/<slug>.html` di host terkunci |
| Tetap tertutup | `/docs/../admin` dan jalur lain yang bukan Docs tetap terkunci (tidak ada pelebaran awalan), juga di host `docs.centurisk97.id` (`/monitor`, `/direktori`, `/admin` tetap tertutup) |
| Tanpa tombol Keluar | `<body>` templat Docs memuat `data-tanpa-keluar` |
| CSP | `public/_headers` memuat blok `/docs/*.html` tanpa `'unsafe-inline'` pada `script-src` |
| Alias | Host `docs.centurisk97.id` pada `/` menjawab isi `/docs`; `/<slug>` menjawab `/docs/<slug>` (DC-06) |
| `uji:warga` | `npm run uji:warga` hijau |

## 5. Gerbang repo

Berkas: `tests/agen/gerbang-docs.test.mjs` (`npm run uji:agen`).

1. Paket dokumen `data/kajian-bnpb/docs-situs/` lengkap (dijaga oleh `gerbang-paket-modul`).
2. `docs-situs` ada di `scripts/agents/roster.json` dan memiliki `model:` (kebijakan model).
3. `public/docs/docs.css` memuat nol literal warna (dijaga oleh `gerbang-token-warna`; dipastikan tanpa entri sisa).
4. Isi `docs/centurisk97/*.md` lolos `--cek-sumber`: tidak ada kata terlarang, tidak ada rahasia, rujukan sah.
5. Tiap `docs/centurisk97/NN-slug.md` ada di `public/docs/`.
6. Kartu Docs diperiksa oleh gerbang sendiri `tests/agen/gerbang-docs.test.mjs` atas HTML keluaran: tiap kartu berkelas `ex-std` dan `ex-ey`, kepala berupa nama seksi, tanpa kaki Sumber, tanpa kelas `hl`. Gerbang kartu standar (`tests/agen/gerbang-kartu-std.test.mjs:18-47`) tidak dipakai karena memindai berkas `.js` yang memanggil `kartu(...)` dan `WAJIB_BERSIH` hanya menerima berkas `.js` di `SCOPE` (`tests/agen/fixtures/kartu_std.mjs:54-61`), sedangkan kartu Docs dibuat generator Python.
7. `npm run uji:docs` dan `bangun.py --cek` dijalankan di pre-push dan `terbit.yml` (DC-08).

## 6. Uji manual pemilik (tinjau lokal)

Pada `http://localhost:8800/docs`: lebar 1440, 900, 390; terang dan gelap; sudut tiga pilihan; cari "model";
buka satu topik dan salin rujukan; cetak ke PDF. Pemilik memutuskan lulus.

## 7. Uji isi (tiket DC-07)

Bukan uji otomatis. Pemeriksa konteks bersih mengambil 5 klaim acak per topik dari Referensi teknis dan memeriksa
rujukannya ke kode: angka sama, rute ada, hak akses sama. Satu klaim salah = topik dikembalikan ke penulis.
Hasil dicatat di `ilmu.mjs kasus docs-situs`.

## 8. Yang belum teruji dan diakui

- Pergeseran baris rujukan yang masih di dalam rentang berkas tidak terdeteksi mesin.
- Bobot pencarian 3, 2, 1 belum diukur dengan kueri nyata.
- Tampilan pada peramban lama tidak diuji.
