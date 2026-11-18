# DESAIN-TEKNIS: Bot WA pembuat laporan

## Berkas dan pemilik

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `scripts/wa/proyek.mjs` (baru) | Mesin proyek: status, perintah `buat`, revisi, `final`, `batal`, `versi`, `balik`, `pptx`, `status`; antrean per proyek | `wa-bot` |
| `scripts/wa/claude.mjs` (baru) | Pemanggil Claude API (`@anthropic-ai/sdk`): urai, pertentangan, operasi ubah, label pola; skema JSON; validator kutipan; hitung biaya | `wa-bot` |
| `scripts/wa/claude/` (baru) | Prompt tetap, skema per jenis laporan, contoh arsip (tanpa nomor HP dan NIK) | `wa-bot` |
| `scripts/wa/gateway/index.js` | Saringan nomor dari salinan daftar terdaftar (ganti saringan `WA_IZIN` saja), balasan T-DAFTAR, teruskan `daftar` ke pemilik, arahkan perintah ke mesin proyek atau `perintah.mjs` (Q14), tanya ulang perintah susulan, jalur balas cepat Q1 | `wa-bot` |
| `scripts/wa/perintah.mjs` | Lepas `buat`, `status` tanpa tanggal, `bantuan` ke mesin proyek (Q14); `kirim ulang` dan `status <tanggal>` tetap | `wa-bot` |
| `scripts/wa/otomatis.mjs` | Entri `LAPORAN` menerima argumen `--isian` opsional; tanpa isian keluarannya sama persis dengan sekarang (D9) | `wa-bot` |
| `scripts/wa/gateway/limiter.js` | Batas terpisah untuk balasan percakapan (Q1) | `wa-bot` |
| `scripts/wa/drive.cjs` | `unggahLaporan()` diperluas: subfolder `Revisi N` dan nama tanpa `(revN)` (Q9) | `wa-bot` |
| `data/laporan-bnpb/generator/ubah.py` (baru) | Inventaris shape, terapkan operasi ubah, render pratinjau PNG | `pipa-data` |
| `data/laporan-bnpb/generator/harian_ringkas.py`, `penanganan_otomatis.py` | Nama shape stabil, `--isian <json>`, tulis `kunci.json` | `pipa-data` |
| `src/wa.js` | Terima pesan dari nomor `bl_daftar` setuju selain `WA_IZIN` (lewat fungsi di `src/hak.js`; `wa.js` sudah di batas ratchet `fixtures/d1-sisa.json`, jadi tanpa SQL baru di berkas ini); `POST /api/wa/hasil` menerima jenis tahap 2 (BL-16) | `warga-api` |
| `src/wa_proyek.js` (baru) | Rute `/api/wa/proyek*`, `/api/wa/terdaftar`, `/api/wa/daftar`, `/api/wa/detak` | `warga-api` |
| `src/hak.js` | Fungsi SQL bagian bot laporan (aturan repo: SQL hanya di sini) | `warga-api` |
| `migrations/<nomor berikut>_bl_proyek.sql` (baru) | Tabel `bl_*` | `warga-api` |
| `public/arsip_laporan.js` dan tab `#p-pelaporan` di `public/index.html` (`/pelaporan`) | Kartu proyek bot, detak mesin | `layar-peta` |
| `tests/wa/proyek*.test.mjs`, `tests/wa/claude*.test.mjs`, `tests/wa/ubah*.test.mjs` | Uji | `wa-bot` |
| `tests/warga/wa_proyek.test.mjs` | Uji rute | `warga-api` |

## Tabel D1 (`bl_*`)

```sql
bl_proyek  (id TEXT PK 'P-DDMMYY-NN', wa_sha TEXT, jenis TEXT, tanggal TEXT, status TEXT CHECK (status IN
            ('terbuka','bertanya','membangun','draf','final','ditutup','batal','kedaluwarsa')),
            versi INTEGER, drive_url TEXT, dibuat INTEGER, diubah INTEGER)
bl_bahan   (proyek_id TEXT, wa_id TEXT, jenis_bahan TEXT, ditambah INTEGER, PRIMARY KEY (proyek_id, wa_id))
bl_versi   (proyek_id TEXT, n INTEGER, isian_r2 TEXT, ubah_r2 TEXT, pptx_r2 TEXT, pdf_r2 TEXT, instruksi TEXT,
            peringatan TEXT, dibuat INTEGER, PRIMARY KEY (proyek_id, n))          -- append-only
bl_pola    (id TEXT PK, jenis TEXT, slide_judul TEXT, operasi TEXT, ringkas TEXT, hitung INTEGER,
            status TEXT CHECK (status IN ('mengamati','diusulkan','aturan','ditolak')), diubah INTEGER)
bl_daftar  (wa_sha TEXT PK, nama TEXT, instansi TEXT, status TEXT CHECK (status IN ('menunggu','setuju','tolak')), dibuat INTEGER)
bl_biaya   (tanggal TEXT PK, usd_mikro INTEGER)
bl_detak   (mesin TEXT PK, terakhir INTEGER)
```

Nomor disimpan hanya sebagai `wa_sha` (sha256 nomor ternormal + garam `WA_GARAM`), termasuk di `bl_daftar`. Balasan ke pendaftar memakai JID dari pesan `daftar` yang ditahan di mesin (`~/.wa-bot/daftar/`, dihapus sesudah diputus pemilik). Tanpa `ALTER` pada tabel `wa_*` yang ada; tautan ke bahan lewat `bl_bahan.wa_id`. `GET /api/wa/terdaftar` mengembalikan himpunan `wa_sha` setuju; gateway menggabungkannya dengan `WA_IZIN` dan memanggilnya tiap 5 menit (288 baca per hari, aman untuk kuota baca D1 Free).

## R2

`bot-laporan/<proyek>/v<n>/isian.json`, `ubah.json`, `<nama deck>.pptx`, `.pdf`, `pratinjau-<slide>.png`. Tidak di `public/`.

## Rute Worker (Bearer `WA_MESIN`, kecuali disebut)

| Rute | Guna |
| --- | --- |
| `POST /api/wa/proyek` | buka atau ambil proyek terbuka (wa_sha, jenis, tanggal) |
| `POST /api/wa/proyek/status` | ubah status (transisi ALUR divalidasi) |
| `POST /api/wa/proyek/versi` | tambah versi (multipart berkas); tidak bisa menimpa |
| `GET /api/wa/proyek/versi?id=&n=` | ambil isian, ubah, dan berkas versi |
| `POST /api/wa/proyek/pola` | catat label pola, kembalikan pola yang mencapai ambang |
| `POST /api/wa/detak` | detak mesin tiap 5 menit |
| `GET /api/wa/terdaftar` | himpunan `wa_sha` nomor setuju untuk salinan gateway |
| `POST /api/wa/daftar` | catat `daftar` (menunggu) atau putusan pemilik (setuju, tolak) |
| `GET /api/wa/proyek/daftar` | untuk tab Pelaporan (sesi staf, bukan Bearer) |

## Alur proses di mesin

`gateway` -> (pesan nomor terdaftar) -> `proyek.mjs tangani(pesan)` -> antrean per proyek (satu proses aktif per proyek, kunci di `~/.wa-bot/proyek/<id>.lock`) -> `claude.mjs` -> isian ditulis ke `isian.json` -> `otomatis.mjs jalankanGenerator` dengan entri `LAPORAN` yang menambah `--isian <berkas>` ke `lap.args()` (tanda tangan fungsi tidak diubah) -> `ubah.py terapkan` -> `ubah.py pratinjau` -> kirim -> PDF dan gerbang bersamaan (`Promise.all`) -> kirim -> rute versi.

## Panggilan Claude

- `client.messages.create({ model: "claude-opus-5-5", output_config: { effort, format: { type: "json_schema", schema } }, system: [bagian tetap dengan cache_control], messages })`.
- Tanpa `thinking: {type: "disabled"}` (400 di Opus 5.5) dan tanpa `tool_choice` paksa.
- Cek `stop_reason`: `refusal` atau `max_tokens` = gagal terkendali, pemakai dibalas "gagal membaca bahan, coba lagi atau kirim ulang", pemilik dikabari.
- Galat 429 dan 5xx: ulang bawaan SDK (`maxRetries: 2`, menghormati `retry-after`), tanpa loop ulang sendiri (D11).
- PDF bahan dikirim sebagai blok `document` base64; foto sebagai `image`; Excel diubah ke teks CSV per lembar oleh mesin.

## Rahasia

`ANTHROPIC_API_KEY`, `WA_GARAM` di `scripts/wa/.env` (0600). Token Drive di `~/.wa-bot/drive.json`. Tidak ada rahasia baru di Worker.
