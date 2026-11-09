# DESAIN-TEKNIS-LOGPAL

## Berkas
| Berkas | Isi |
| --- | --- |
| `migrations/0112_logpal.sql` | 8 tabel `logpal_*` dan trigger `logpal_permintaan_alur`; idempoten |
| `src/logpal.js` | validasi murni (`cekBarang`, `rumus`), rute `RUTE_LOGPAL`, dummy |
| `src/worker.js` | impor dan spread `RUTE_LOGPAL`, pengecualian `halamanTerkunci` untuk `/instansi/logpal` (halaman menjaga dirinya, bukan daftar putih) |
| `migrations/0113_logpal_potongan.sql` | `logpal_statis_potong` (nama matriks/kecamatan/terdampak, urut 0..59, isi maks 90000 karakter); idempoten |
| `public/logpal/index.html`, `logpal.js`, `logpal.css` | layar |
| `public/data/logpal/*` | data statis publik (wilayah tanpa kolom gudang dan jam, provinsi, peta provinsi) |
| `public/vendor/d3/` | d3 7.8.5 |
| `scripts/logpal/impor.mjs` | JSON gudang ke SQL, di luar repo |
| `tests/warga/logpal.test.mjs` | uji integrasi |

## Tabel (0112)
`logpal_gudang` (pemilik BNPB atau BPBD, `akun_id` boleh kosong), `logpal_barang` (semua kolom form, CHECK baik + rusak <= jumlah), `logpal_mutasi`, `logpal_opname`, `logpal_opname_baris`, `logpal_permintaan` (items JSON), `logpal_tahap` (riwayat), `logpal_kebutuhan` (kolom `stok_a`, `stok_b` = stok dua gudang pembanding), `logpal_statis` (nama + isi CSV atau JSON: gudang, usulan, rute, jangkauan, teks; diisi impor). Tabel `gudang` dan `alat` (0031) tidak disentuh.

## Halaman
`GET` dan `HEAD /instansi/logpal` serta `/logpal/index.html` menyajikan HTML hanya bila `aktor` sah; tanpa sesi 303 ke `/instansi`, sesi sah tanpa hak 403. `/logpal/logpal.js` dan `.css` lewat Worker (`run_worker_first` `/logpal/*` di `wrangler.jsonc`) dan 401 tanpa sesi.

## Rute (semua di bawah `/api/instansi/logpal/`)
`GET data`, `GET statis?nama=gudang|usulan|rute|jangkauan|teks` (satu baris `logpal_statis`) atau `matriks|kecamatan|terdampak` (potongan `logpal_statis_potong` dirakit berurutan; urutan bolong dijawab 500, belum diimpor 404; satu pembacaan maksimal 60 baris, data sekarang 15 baris (3 matriks, 11 kecamatan, 1 terdampak), hanya saat tab Pengantaran dibuka; hasil rakitan dimemo per isolat 10 menit; tabel belum ada dijawab 503 yang menyebut migrasi 0112/0113); `POST gudang`, `barang/:id` (gudang), `ubah/:id` (barang), `mutasi/:id` (gudang), `diterima/:id` (mutasi), `opname/:id` (gudang), `permintaan`, `tahap/:id`, `dummy`. Tiap POST wajib header `x-pb: 1`. Batas laju: `logpal.tulis` 300 per jam, `logpal.minta` 20 per jam, per akun atau staf.

## Keputusan desain
- Satu panggilan `data` membawa gudang, barang, mutasi, opname, permintaan; batas baca 20 rb barang, 2 rb mutasi, 200 berita acara.
- Stok milik server: klien memuat ulang setelah tiap tulis.
- Aktor: `modAtauStaf` (staf berperan atau moderator) dulu, lalu `akunAktif` (jenis pemprov, pemkab, pemkot).
- Pembaca baris dummy: staf nyata tidak melihatnya; akun dummy dan admin melihat.
- Impor: id deterministik (sha256 kode + id asal), `INSERT OR IGNORE`, gudang BPBD dipasangkan ke akun pemprov aktif provinsinya.
- Klien: tiga bagian halaman asal digabung; lapisan `claude.use` diganti `fetch`; kerja berat lewat `nanti` (dua rAF + setTimeout 120 ms).
- Tab Pengantaran: `rencanaK` dan kawan-kawannya (blok `kirim-murni` di `logpal.js`, diuji lewat `new Function`) tidak berubah dari halaman uji; `impor.mjs` memotong isi besar di 90000 karakter (ukuran SQL terhitung setelah escape, di bawah batas 100 KB per pernyataan D1) dan menghapus potongan lama nama itu sebelum menulis yang baru.
- Tab Pengantaran, hak: kolom Gudang tercepat dan penanda gudang di peta hanya memakai gudang yang stoknya tampil untuk akun itu (ada di `/data`); `impor.mjs` menolak isi lebih dari 60 potongan sebelum DELETE.
