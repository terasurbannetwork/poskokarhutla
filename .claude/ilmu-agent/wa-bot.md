# Ilmu wa-bot

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/wa-bot.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca wa-bot`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus wa-bot "..."`.

## Peta berkas & tabel

- `scripts/wa/gateway/index.js` (CJS, Baileys): MASUK = `messages.upsert` dari nomor `WA_IZIN` -> tulis ke `~/.wa-bot/outbox/<id>.json` (+ `.bin` untuk dokumen/foto, maks 20 MB) -> `flushOutbox` POST multipart ke `${WORKER_URL}/api/wa/gateway (header x-wa-kunci)` (field dari, nama, teks, waktu, berkas); 5 percobaan backoff, 4xx (selain 408/429) dipindah ke `outbox-rusak/` + kabar PEMILIK; sukses -> `picuOtomatis` (debounce 2 menit, `import('../otomatis.mjs').jalankan`). KELUAR = Express di 127.0.0.1:PORT, header `Authorization: GATEWAY_TOKEN`: `POST /send {target,message}`, `POST /send-file {target,path,filename,caption,mimetype}` (path wajib berkas biasa di bawah `~/.wa-bot/keluaran`, realpath, lewat `aman.cjs`), `GET /` health, `GET /stats`.
- `scripts/wa/gateway/limiter.js`: salinan `pangantara/wa-gateway/limiter.js` (jeda acak 15-20 dtk serial, 3/menit, 60/jam, 300/hari, 8 per tujuan/hari, pemanasan 7 hari). Hanya `STATE_FILE` diubah ke `~/.wa-bot/limit-state.json`. 429 = ditahan, bukan gagal.
- `scripts/wa/aman.cjs`: murni, diuji `tests/wa/aman.test.mjs` (samaAman konstan-waktu, idAman/idSah id outbox, jalurKeluaran, mimeBoleh, ukuranBerkas). Outbox: id disanitasi, JSON rusak ke `outbox-rusak/` (+ .bin), sapu 14 hari, tolak simpan bila >500 MB, lampiran hanya MIME dokumen/gambar. QR hanya bila TTY. ~/.wa-bot 0700, file 0600.
- `scripts/wa/umum.cjs`: muat `.env`, `normalWa`, `daftar`, `RUMAH`. `scripts/wa/.env.contoh` (committed), `.env` dan `node_modules` gitignored.
- `scripts/wa/otomatis.mjs` (ESM): `jalankan({tanggal,kering,now,env,dep,kenali,rumah})`. Alur: kunci `~/.wa-bot/otomatis.lock` -> GET `/api/wa/masuk?tanggal=` (Bearer `WA_MESIN`) -> `pilihTerbaru` (kenali dari `src/wa_jenis.js`) -> per laporan `cekSiap` -> hash bahan -> `python3 <generator>` cwd `data/laporan-bnpb/generator` -> cek `.pdf` dan `.pptx` -> `/send-file` ke tiap PENERIMA. State `~/.wa-bot/state.json` = `{laporan:{"harian:D":{hash,revisi,terkirim[],selesai}}, gagal:{...}}`.
- Dua laporan: harian = `harian.py --tanggal D --koordalops <rekap_koordalops_24> --bmkg <bmkg_pagi> --jam 12:00 --out ~/.wa-bot/keluaran/D`, siap bila kedua bahan ada dan jam WIB >= 12; penanganan = `penanganan.py --tanggal D --jam 17:00 --bmkg <bmkg_pagi> --operasi <satgas> --out ...`, siap sesudah 17.00. Nama keluaran: `Laporan Kejadian Bencana Harian DDMMYY` dan `Laporan Penanganan Pengendalian Karhutla DDMMYY` (.pptx + .pdf).
- `scripts/wa/launchd/*.plist`: templat (`__REPO__`, `__NODE__`, `__HOME__`); gateway KeepAlive, otomatis StartInterval 600. `scripts/wa/README.md`: langkah pasang.
- Uji: `tests/wa/otomatis.test.mjs` (`node --test tests/wa/*.test.mjs`), semua dependensi luar disuntik lewat `dep`.

## Aturan & invarian

- Tanpa LLM di jalur ini; angka laporan hanya dari generator. Galat generator/keluaran hilang/gateway mati dikabarkan SATU kali per galat yang sama (`state.gagal`) ke PEMILIK lewat `/send`, tidak pernah ke PENERIMA.
- Kirim sekali per (laporan, tanggal, hash bahan). Bahan berubah -> bangun ulang, caption berawalan `Revisi: `. Kirim sebagian: `terkirim[]` mencatat penerima yang sudah, sisanya dilanjutkan.
- `--kering` / `kering:true`: generator jalan, tetapi tidak ada panggilan gateway sama sekali dan state tidak ditulis.
- Caption tanpa `·` dan em dash. Tanpa `--tanggal`, jalan hanya 06.00-23.00 WIB.
- Aturan jam mengikuti README generator (harian 12.00, penanganan 17.00 WIB); hari lampau dianggap sudah lewat cut-off.
- Rahasia (`WA_KUNCI`, `WA_MESIN`, `GATEWAY_TOKEN`) hanya di `scripts/wa/.env`; sesi Baileys di `~/.wa-bot/auth`.

- Unggah ke `/pelaporan`: `dep.unggah` POST `${WORKER_URL}/api/wa/hasil` (Bearer WA_MESIN; tanggal, laporan, revisi, pptx, pdf) SEBELUM kirim WA; status `diunggah` terpisah dari `selesai`; `rev` 0 lalu naik tiap revisi; gagal = kabar PEMILIK sekali, WA tetap jalan, diulang jalan berikut tanpa membangun ulang (keluaran bahan sama dipakai lagi). `--kering` tidak mengunggah.

## Ranjau yang pernah meledak

- Limiter 3 kiriman per menit dengan jeda 15-20 dtk: kiriman ke-4 dalam semenit dapat 429. `depBawaan.pos` mengulang sampai 6 kali (25 dtk) pada 429/503; jangan menaikkan kecepatan, itu pemicu blokir.
- JID peserta bisa `@lid` (bukan nomor): gateway membaca `senderPn`/`participantPn` lebih dulu. Bila nomor izin tak cocok, periksa field itu di log.
- `generator/harian.py` menolak Koordalops yang `sampai` bukan hari laporan dan butuh templat `cache/templat/harian-221026.pptx`; pesan galat generator diteruskan apa adanya ke PEMILIK.
- `python3` sistem bisa 3.9 (SyntaxError f-string); penanganan.py memanggil `python3` telanjang, jadi `otomatis.mjs` memasang `WA_PY_BIN` (bawaan `~/.wa-bot/py/bin`, venv uv 3.13 + pillow) paling depan di PATH anak proses. Symlink interpreter keluar venv kehilangan paketnya.
- Fonnte yang masih tersambung ikut menyimpan pesan yang sama: putuskan saat gateway hidup.
- Route worker `/api/wa/gateway`, `/api/wa/masuk`, `/api/wa/berkas` milik warga-api; kontrak diasumsikan dari tugas, belum diuji ke worker sungguhan.

## Gerbang yang menghakimi

- `node --test tests/wa/*.test.mjs`: kesiapan (cut-off, dua jenis), pesan terbaru, dedupe + revisi, galat hanya ke PEMILIK, `--kering` tanpa kirim, kunci proses, keluaran hilang.
- `npm run uji:agen`: tiap berkas kode satu pemilik, ilmu terisi. Belum ada uji untuk `gateway/index.js` (butuh WhatsApp sungguhan); diperiksa `node --check` saja.

## Kasus
- 2026-10-29 · Jalur WA otomatis dibangun 29 Okt 2026: gateway Baileys + otomatis.mjs memanggil generator harian/penanganan; kunci keandalan = state per hash bahan (kirim sekali, revisi bertanda) dan galat hanya ke PEMILIK. Tahu rusak dari tests/wa.
- 2026-10-29 · Drive (29 Okt): drive.cjs buat({env,fetch,rumah}) agar diuji tanpa jaringan; id outbox dari Drive diturunkan dari id+modifiedTime supaya idempoten, id diproses dicatat ke drive-diproses.json SEBELUM berkas dipindah ke Sudah. Perintah 'cari ' dicegat sebelum outbox.
- 2026-10-29 · 29 Okt: pesan saat gateway mati datang sebagai messages.upsert type append (bukan notify) dan dulu dibuang; kini diproses bila <=24 jam dan id belum di ~/.wa-bot/terlihat.json. Kiriman ulang laporan lama tersimpan bertanggal hari ini; otomatis.mjs kini mensyaratkan tanggalIsi==D per bahan (tanpa tanggalIsi di wa_jenis.js semua bahan ditolak). Tahu dari log [susulan]/[pesan] dan 'bahan bertanggal X'.
- 2026-10-29 · Banjir (29 Okt): penanganan_banjir.py tanpa bahan WA (butuh []), tidak diunggah karena worker LAPORAN_HASIL hanya harian/penanganan; data banjir di repo bisa basi (peluang.json lokal 19 Okt), jadi peringatan membaca situs dan hanya kirim bila dibuat hari itu. Tahu dari dry-run --kering.
- 2026-10-29 · Perintah WA (29 Okt): perintah.mjs murni parse/cegat + tangani; cegat hanya dari PEMILIK, teks <=60 char satu baris tanpa lampiran supaya bahan berawalan 'Status' tidak ditelan. Logika bahan/generator diekstrak dari jalankan() ke ambilBahan/siapkanKeluaran/jalankanGenerator (otomatis.mjs) dan dipakai bersama; perintah buat tidak menulis state/unggah/kirim PENERIMA. Tahu dari tests/wa/perintah.test.mjs.
- 2026-11-01 · Panduan resmi Pusdalops (1 Nov 2026) ada di scripts/wa/panduan_resmi.json; parser menambah resmi/menonjol/masuk_laphar di luar isian supaya kontrak POST /api/logbook/kejadian (JENIS internal di src/logbook.js) tak berubah. Kriteria menonjol dibaca dari JSON, jangan hardcode. Tahu dari npm run uji:wa.
- 2026-11-01 · Mode --cutoff (1 Nov): penanganan.py bisa jalan tanpa --bmkg/--operasi, harian.py tidak (Koordalops wajib, tanggal harus cocok). 1 Nov penanganan gagal: provinsi 19 (Babel) tak punya baris/logo di templat (ADA_BARIS, generator milik pipa-data); Playwright headless shell tidak terpasang, pakai CHROMIUM_SHELL=Google Chrome. Tahu dari otomatis.mjs --cutoff --kering.
- 2026-11-02 · G5 (2 Nov): src/logbook.js dan worker.js saling impor, impor worker.js DULU baru logbook.js di Node. Rute /api/logbook/* hanya stafOK (cookie sesi_staf), tak ada Bearer mesin: bot login /api/staf/masuk dengan LOGBOOK_USER/LOGBOOK_SANDI. Nama tanpa gelar lolos saringan; staf melihat catatan di ringkasan. Tahu dari tests/wa/logbook_wa.test.mjs.
- 2026-11-02 · 2026-11-02 LP-021: lapangan_tarik.mjs dipasang di gateway lewat mulaiLapangan() saat WA open; kirim lewat sendPaced yang sama, 429/5xx/WA putus = tunda tanpa lapor, set dilapor mencegah kirim ulang. Tahu dari tests/wa/lapangan_tarik.test.mjs (srv.closeAllConnections wajib agar uji tidak menggantung).
- 2026-11-02 · 2026-11-02 Renlap: tick launchd 10 menit hidup 24 jam (penjaga 06-23 ada di dalam jalankan), jadi 05.30 tidak butuh plist baru; renlap dipanggil sebelum penjaga dan hanya ia yang jalan di luar jendela. Tahu dari tests/wa/renlap_jam.test.mjs.
- 2026-11-04 · 2026-11-04 OCR tempelan foto grup operasi pindah ke Mac mini: Workers AI LLaVA 0 dari 31 foto berkoordinat dan mengarang; Vision macOS membaca 12 dari 31. ocr.cjs mengompilasi ocr/stempel.swift ke ~/.wa-bot/bin/stempel (cache hash sumber), dua lintasan (penuh + pojok kanan-bawah 45x40% diperbesar 3x karena tempelan kecil luput di lintasan penuh), gagal = null; stempel dikirim sebagai field form stempel (maks 4000). Video grup operasi: 1 frame/3 dtk lewat ffmpeg, frame pertama berkoordinat dikirim sebagai foto. Panggilan pertama sesudah kompilasi lambat (>14 dtk, model Vision dingin), berikutnya 0,2-0,4 dtk. ffmpeg Homebrew tanpa drawtext: uji video dibuat dari foto contoh. Node 24: node --test butuh glob tests/wa/*.test.mjs.
