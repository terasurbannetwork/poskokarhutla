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
