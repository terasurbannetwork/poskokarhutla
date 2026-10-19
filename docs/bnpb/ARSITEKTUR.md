# Arsitektur Ruang Koordinasi BNPB

Kontrak bersama untuk tiap agent yang membangun sistem di `docs/bnpb/RENCANA-12-JAM.md`.
Baca SEBELUM menulis kode. Pemilik keputusan: pemilik repo, disetujui 19 Okt 2026
(M8 Pengungsi DICORET; sisanya jalan).

## Keputusan pemilik yang mengikat

- Relawan **tanpa NIK, tanpa unggah KTP**. Data pribadi minimum: nama, WA, email, domisili, keahlian.
- Akses **tanpa akun**: kode pribadi 26 hex (pola kode regu Posko). Hanya sha256 kode disimpan. Kode tampil SEKALI, di fragmen `#k=`.
- Merek tetap "Pantau Bencana". Logo BNPB tidak dipakai.
- Pintu `/bnpb` TIDAK masuk nav utama situs sampai pemilik setuju.
- Data dummy tidak pernah ikut angka publik.

## Peta berkas (tiap modul hanya menyentuh berkasnya sendiri)

| Modul | Worker (warga-api) | Migrasi | Layar publik (ruang-bnpb) | Admin | Uji |
|---|---|---|---|---|---|
| Bersama | `src/bnpb.js` | `0022_bnpb_bersama.sql` | `public/bnpb/bnpb.css` (gaya bersama) | — | `tests/warga/bnpb.test.mjs`, `_bnpb.mjs` |
| Relawan + PTN | `src/relawan.js` | `0023_relawan.sql` (institusi tunggal + perjanjian) | `public/bnpb/relawan*.{html,js,css}`, `kampus.*` | `public/admin/relawan.{js,css}`, `public/admin/institusi.{js,css}` (tab bersama relawan dan riset) | `tests/warga/relawan.test.mjs` |
| Alun-alun | `src/alun.js` | `0024_alun.sql` | `public/bnpb/alun-alun.*` | `public/admin/alun.{js,css}` | `tests/warga/alun.test.mjs` |
| Riset | `src/riset.js` | `0025_riset.sql` | `public/bnpb/riset.*`, `mitra.*` | `public/admin/riset.{js,css}` | `tests/warga/riset.test.mjs` |
| Meja Kerja | `src/meja.js` | `0026_meja.sql` | `public/bnpb/meja.*` | `public/admin/meja.{js,css}` | `tests/warga/meja.test.mjs` |
| Indeks risiko | — | — | `public/bnpb/risiko.*` | — | `scripts/bnpb/risiko.py` self-check |

Berkas yang dikerjakan SESI INDUK saja (jangan disunting agent): `src/worker.js`, `src/admin_halaman.js`,
`tests/warga/cakupan.json`, `scripts/agents/roster.json`, `public/_headers`, `wrangler*.jsonc`.
Agent melaporkan entri `cakupan.json` yang dibutuhkan di laporan akhirnya.

## Pengkabelan yang sudah ada

- `src/worker.js` sudah mengimpor `RUTE_RELAWAN`, `RUTE_ALUN`, `RUTE_RISET`, `RUTE_MEJA` dan menggabungnya ke tabel `RUTE`.
  Isi objek di modulmu: kunci `"METODE /jalur"`, `:id` = 16 hex. Tanda tangan handler: `(env, req, url, kini, ctx, id)`.
- Halaman admin: `GET /admin/<k>` → `(env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("<k>"))`
  (`halamanAdmin` dari `src/statistik.js`, `halamanBnpb` dari `src/admin_halaman.js`; k = `relawan|alun|riset|meja`).
  Kerangkanya memuat `/admin/<k>.css?v=1` dan `/admin/<k>.js?v=1`, header nav, judul, slot `#aksiJudul` (tombol 🧪/🧹), isi `#app`.
- Halaman publik: daftarkan `GET /relawan` dsb. di RUTE modulmu → `halamanBnpbPublik(env, url, "relawan", {pribadi})`
  dari `src/bnpb.js` (CSP ketat: TANPA skrip/gaya inline, tanpa `onclick=`). `pribadi: true` untuk halaman berkode (no-store, noindex, no-referrer).

## Helper yang WAJIB dipakai ulang (jangan menyalin)

- `src/worker.js`: `json`, `gagal`, `sha`, `acak`, `ipHash`, `bacaBody` (JSON ≤ 4 KB default), `bacaBytes`, `cacheTepi`, `adminOK`, `bersihTeks` (teks publik: buang tautan & nomor HP, tolak kata kasar, ≤ 280 huruf).
- `src/posko.js`: `tx(v, maks)` teks bersih (null kosong, undefined lewat batas), `num(v, min, maks, bulat)`, `esc`, `wib`, `tglSah`, `RE_PROV`, `modOK` (moderator, bukan akun gerbang), `superOK` (Super Admin).
- `src/bnpb.js`: `laju(env, kunci, aksi, batas)` / `lajuIP(env, req, aksi, batas)` → Response 429 atau null; `kodeBaru()`;
  `pemegangKode(env, req, modul, cari)` (header `x-kode`); `halamanBnpbPublik`.
  `aksi` laju diawali nama modul: `relawan.daftar`, `alun.tulis`, dll.
- Wilayah: `public/data/wilayah` atau `src/titik.js` (`wilayah`, `cariWilayah`) bila butuh nama prov/kab dari koordinat.

## Aturan data

- Tabel baru: `CREATE TABLE IF NOT EXISTS`, CHECK pada tiap enum/panjang/rentang, id = 16 hex (`acak(8)`), waktu = ms epoch INTEGER,
  kolom `dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0,1))` di tiap tabel yang dibaca layar.
- Daftar tetap (enum) di JS diekspor dan diuji sama persis dengan CHECK migrasi (pola `posko.test.mjs`).
- Data pribadi (WA, email, kontak darurat) HANYA lewat rute admin/kode pemiliknya, tidak pernah di rute publik, tidak di log.
- Rute publik hanya angka agregat (dan teks yang memang publik seperti utas alun-alun).
- Tiap handler mulai dengan gerbang auth, lalu validasi, baru D1. Tidak ada rute tanpa gerbang walau sementara: working tree bisa tayang kapan saja.
- Tabel belum dimigrasi di produksi (migrasi diterapkan manual): rute membalas 503 "fitur belum diaktifkan" saat `no such table`, bukan 500.

## Tombol dummy (DUMMY.md)

- `POST /api/<modul>/dummy` `{aksi: "isi"|"hapus"}`, hanya `superOK`. 🧪 dan 🧹 di `#aksiJudul` halaman admin.
- Isi = SEMUA tab dan kartu di halaman itu berangka, tiap status minimal satu baris (status dibagi bergiliran),
  angka lahir dari rantai (mis. jam kerja relawan dari check-in/out-nya), sisi yang dibandingkan tidak pernah sama rata.
- Gerbang "sudah ada" menghitung baris dummy yang MASIH HIDUP. Halaman muat ulang penuh sesudah isi/hapus.
- Uji: panggil endpoint yang menyuapi layar sesudah isi, pastikan tiap kolom/ember bukan nol; sesudah hapus, nol dummy tersisa dan data asli utuh.

## Uji integrasi (TEST.md)

- `tests/warga/<modul>.test.mjs` memakai `tests/warga/_bnpb.mjs` (`siapkan`, `berantai`, `ADMIN`, `MOD2`, `GERBANG`).
  Worker utuh di Miniflare, D1 sungguhan, migrasi apa adanya. Tanpa mock DB.
- Wajib: migrasi idempoten (jalan dua kali), CHECK menolak isian liar langsung di D1, tiap rute: tanpa auth ditolak, masukan liar 400,
  jalur sah, batas laju 429, data pribadi tidak bocor di rute publik (cari string WA/email di respons publik), dummy isi/hapus.
- Jalankan: `node --test tests/warga/<modul>.test.mjs`. Sebelum selesai: `npm run uji:warga` dan `npm run uji:agen` hijau.

## Gaya layar (pemilik, aturan A1–A25)

- Teks minim: data + label. Label = pil berwarna berikon (ikon garis SVG). Tanpa subjudul penjelasan, tanpa kotak KPI generik.
- Kartu gaya Insight; tabel standar: kepala gelap teks putih, bisa diurutkan, sudut atas membulat, berhalaman.
- Lebar penuh, tanpa ruang kosong; satu baris per entri, kelebihan jadi kolom. Pop-up lebar. Upvote, bukan love. Bagikan = ikon.
- Pembaca disapa "kamu". Tidak ada em dash (—) di teks yang tampil. Angka format Indonesia (koma desimal, titik ribuan).
- Klik tidak membekukan layar: render daftar besar bertahap, chrome tombol langsung bereaksi.
- Periksa di 1440 dan 390. Tanpa galat konsol.
- Admin memakai `public/admin/admin.css` + pola `public/admin/posko.js` (pil, tabel, tombol `ad-tombol`).
- Halaman publik memakai `public/bnpb/bnpb.css` (dibuat agent relawan pertama; modul lain mengimpor, tidak menyalin) + font Inter/Plus Jakarta Sans.
