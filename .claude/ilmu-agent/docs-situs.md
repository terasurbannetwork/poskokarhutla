# Ilmu docs-situs

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/docs-situs.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca docs-situs`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus docs-situs "..."`.

## Peta berkas & tabel

Wilayah: `docs/centurisk97/**` (sumber isi, 14 berkas `NN-slug.md` + `README.md` beranda + `CELAH.md` catatan celah, ditulis 24 Nov 2026 oleh fan-out agent dan diperiksa pemeriksa bersih), `scripts/docs/**` (generator stdlib `bangun.py`, `templat.html`), `public/docs/**` (keluaran HTML, `cari.json`, `_bangun.json` di-commit; `docs.css` dan `docs.js` ditulis tangan), `tests/docs/**`.
Batas: `src/docs_rute.js` dan penyesuaian `src/worker.js` (HTML_RUTE, halamanTerkunci, PUBLIK_TANPA_SESI) milik `warga-api`; langkah di `terbit.yml` milik `mekanik-mesin`. Tanpa D1, tanpa R2, tanpa rute API.
Rancangan lengkap: `data/kajian-bnpb/docs-situs/DESAIN-TEKNIS.md` (berkas, rute, ADR A1-A6) dan `TIKET.md` (DC-00..DC-12).

## Aturan & invarian

- Lima bagian baku per berkas sumber, berurutan: Ringkasan, Panduan pengguna, Metode, Referensi teknis, Batasan dan pertanyaan terbuka.
- HTML keluaran tidak disunting tangan; `python3 -I scripts/docs/bangun.py --cek` harus lolos sesudah sumber berubah.
- Angka, ambang, rumus, jadwal, rute, hak akses hanya dari kode dengan rujukan `berkas:baris`; tidak ketemu ditulis "belum terdokumentasi di kode". Model belum lulus uji balik = HIPOTESIS. Kosong bukan nol.
- Repo publik: tanpa nama orang, nomor, surel, kunci; angka pengaman penyalahgunaan (batas laju, panjang kode) tidak ditulis nilainya (Q2).
- Tulis "Centurisk97", tidak pernah "Pantau Bencana"; tanpa pemisah titik tengah; tidak pernah "aman".
- Layar: token `public/inti/tema.css` saja (gerbang token warna), kepala situs bersama, tanpa skrip inline, `<body data-tanpa-keluar>`.

## Ranjau yang pernah meledak

- 24 Nov 2026, penulisan isi: pemeriksa bersih menemukan klaim karangan yang lolos dari penulis pertama (misal ambang "masuk 60, keluar 30" disebut ada di AGENTS.md padahal tidak; jumlah uji 237 padahal 224; status cuaca salah petakan). Tiap isi baru wajib dicek pemeriksa konteks bersih terhadap kode, bukan dipercaya dari paket dokumen.
- Rujukan `berkas:baris` cepat basi saat kode bergeser; `bangun.py --cek-sumber` memeriksa berkas ada dan baris dalam panjang berkas, bukan isinya.
- Di Windows `python3` tidak ada di PATH (gerbang agen yang memanggil `python3` gagal ENOENT); uji Node di tests/docs memanggil interpreter lewat deteksi `python3` lalu `python`.

## Gerbang yang menghakimi

- `tests/agen/gerbang-paket-modul.test.mjs` (paket `data/kajian-bnpb/docs-situs/` dan bagian AGENTS.md 2.47).
- `tests/agen/gerbang-token-warna.test.mjs` untuk `public/docs/docs.css`.
- `tests/docs/*.test.mjs` (generator, halaman, rute) lewat `npm run uji:docs` (dibuat di DC-05).

## Kasus
- 2026-11-24 · Bash tool menolak heredoc python/js berisi kutip campur (unexpected EOF); tulis skrip lewat Write ke scratchpad lalu jalankan. gaya.css membuat <main> fixed: isi Docs tetap div role=main.
- 2026-11-24 · Keadaan awal UI (sudut, lipatan, toc) diputuskan di sudut.js yang dimuat dua kali (kepala dan setelah toc) dan CSS .js, bukan di docs.js defer, supaya tanpa lompatan.
- 2026-11-24 · Python text-mode di Windows menulis CRLF bila membuka file lewat open(..,'w'); docs.css dibatasi 24 KB karakter, jadi CRLF membuat uji ukuran gagal. Gaya gambar dipisah ke gambar.css (tiap berkas di bawah plafon, plafon tidak dinaikkan); normalkan ke LF dengan newline='' atau konversi bytes. Peramban tanpa playwright: gunakan chrome.exe di ms-playwright lewat CDP WebSocket (Node 24).
- 2026-11-24 · Teks SVG di 13px lebar sekitar 7 satuan per huruf; kotak 170 muat sekitar 22 huruf. Python re.sub dengan replacement berbackslash di heredoc bisa jadi \x01; periksa hasil.
- 2026-11-24 · Pemecahan modul docs: selektor heading by-prefix lewat skrip pemeta (heading ber-nomor dan ber-backtick perlu dinormalkan); judul halaman 40 huruf cepat terlampaui, ukur dulu; bash heredoc bercampur kutip gagal, tulis lewat Write
- 2026-11-24 · Generator revisi 3 (peta.json, bilah atas tunggal): cari.json satu berkas 275 KB butuh format ringkas v2 (tabel modul + larik [u,mod,t,b,k], K_MAKS=100); bagian panduan/pengembang berawalan p sama, pakai p dan d. Heredoc Bash menelan garis miring terbalik (regex di uji JS jadi huruf d): tulis berkas uji lewat Write, bukan heredoc. Uji UI nyata: server statis jalur bersih + Chrome CDP (scratchpad), karena rute tinjau 8800 belum kenal jalur baru sampai docs_rute.js diperbarui.
- 2026-11-24 · Bash tool menelan garis miring terbalik ganda di heredoc: '\b' dalam python jadi karakter backspace (0x08) di regex; tulis backslash lewat chr(92) dan cek od -c. Pengecekan 'berkas tidak ada' dilonggarkan untuk kalimat berstatus (belum ada, rancangan, R2, keluaran)
