# Referensi: berkas, rute, tabel

Halaman ini mendaftar berkas utama, rute inti dan haknya, tabel D1 dengan migrasi, dan prefiks R2.

## Berkas utama

| Berkas | Peran |
| --- | --- |
| `wrangler.jsonc` | Konfigurasi produksi: nama worker `centurisk97`, `main: src/worker.js`, aset `./public` (`html_handling: none`; `run_worker_first` untuk `/*.html`, `/logpal/*`, `/siklus/*`), D1 `DB` (`poskowarga`), R2 `MEDIA`, AI `AI`, cron `* * * * *`, variabel `SIHKA_CADANGAN`, `TURNSTILE_SITEKEY`, `FOTO_DUMMY_PUBLIK`, `WA_NOMOR` |
| `wrangler.warga.jsonc` | Usulan lama untuk Lapor Warga; bukan yang terbit |
| `src/worker.js` (1.093 baris) | `fetch`, `layani`, tabel `RUTE`, gerbang host, header HSTS, `scheduled`, `bersihSemua` |
| `src/api_v1.js` | API v1: data publik, riwayat, firespot, endpoint berkunci, penerbitan kunci |
| `src/mcp.js` | Server MCP: JSON-RPC 2.0, tool publik dan berkunci |
| `src/publik.js` | Statistik publik `/statistik` dan `/api/publik` (klasifikasi manusia, asisten AI, perayap) |
| `src/hak.js` | Satu-satunya pintu D1: matriks hak per tabel, pernyataan SQL bernama |
| `src/bencana.js`, `public/bencana.json` | Registri bencana dan turunannya |
| `src/jaga_jadwal.js`, `src/jaga_pipa.js`, `scripts/terbit/jaga_jadwal.mjs` | Penjaga jadwal GitHub |
| `src/wa.js`, `src/wa_proyek.js`, `src/wa_form.js`, `src/wa_jenis.js` | Sisi Worker bot WhatsApp: kotak masuk, proyek, form bahan, pengenal jenis bahan |
| `scripts/wa/**` | Gateway, generator, mesin proyek, agen, pembatas laju |
| `scripts/agents/*.mjs` | `ilmu.mjs`, `build.mjs`, `tinjau_lokal.mjs`, `dorong.sh`, `uji_ulang.mjs`, `paritas.mjs`, hook penolak |
| `.githooks/pre-push` | Uji pada klon sementara sebelum push |
| `AGENTS.md`, `.claude/agents/*.md`, `.claude/ilmu-agent/` | Aturan kerja, definisi 32 agent (`scripts/agents/roster.json`), ilmu dan jejak |

Seluruh `src/` terdiri dari 180 berkas JavaScript. Total entri rute berpola `"METODE /jalur"` di `src/*.js` sekitar 920 (hitungan baris yang diawali kunci `"METODE /jalur"` di `src/*.js`, termasuk rute modul seperti Lapor, Siklus, Kemitraan, SIPPA, dan LogPal).

## Rute inti dan hak

| Metode dan jalur | Hak | Rujukan |
| --- | --- | --- |
| `GET /api/v1`, `GET /api/v1/data/<nama>`, `/riwayat`, `/firespot` | Publik | `src/api_v1.js:160-200` |
| `GET /api/v1/rumah-rusak`, `/rumah-rusak/rekap`, `/bangunan/*`, `/konsesi`, `/laporan-bnpb` | Kunci bercakupan | `src/api_v1.js:25-34` |
| `POST /mcp` | Publik untuk tool publik; `X-API-Key` untuk tool berkunci | `src/mcp.js:284` |
| `GET /api`, `GET /api/status`, `GET /api/titik`, `/api/himawari`, `/api/awan_tumbuh`, `/api/satelit/jeda`, `/sitemap.xml` | Publik (`/api` terkunci di `centurisk97.id`) | `src/worker.js:908-940` |
| `POST /api/kunci-api/admin/buat` | Super Admin | `src/api_v1.js:196-200` |
| `GET /api/kunci-api/admin/daftar`, `POST /api/kunci-api/admin/cabut/:id` | Moderator ke atas | idem |
| `GET /admin/kunci-api`, `/admin/biaya-bot`, `/admin/kontak`, `/admin/statistik`, `/admin/pesan` | Admin | `src/worker.js:581-680` |
| `POST /api/jejak` | Publik, tanpa IP tersimpan | `src/worker.js:582` |
| `POST /api/wa/gateway`, `GET /api/wa/masuk`, `GET /api/wa/berkas`, `POST` dan `GET /api/wa/hasil`, `GET /api/wa/hasil/berkas`, `GET /api/wa/rekap` | Kunci gateway (`x-wa-kunci`) atau Bearer `WA_MESIN` atau admin, sesuai rute | `src/wa.js:236-242` |
| `POST /api/wa/proyek`, `/proyek/status`, `/proyek/versi`, `/proyek/pola`, `/daftar`, `/detak`, `/biaya`, `/biaya/rinci`; `GET /api/wa/proyek/versi`, `/proyek/pola`, `/terdaftar`, `/biaya` | Bearer `WA_MESIN` | `src/wa_proyek.js:275-288` |
| `GET /api/wa/proyek/daftar`, `GET /api/wa/biaya/ringkas` | Sesi staf (tab Pelaporan) | idem |
| `POST /api/wa/form`, `GET /api/wa/form/terakhir` | Staf Pusdalops, Koordalops, Pimpinan, atau admin | `src/wa_form.js:54-55` |

Rute modul lain (laporan warga, Lapor Bencana, Siklus, Kemitraan, SIPPA, LogPal, Meja Kerja, dan seterusnya) didaftarkan oleh spread `...RUTE_<MODUL>` di tabel `RUTE` (`src/worker.js:581-680`) dan dijelaskan di dokumen modulnya.

## Tabel D1 dan migrasi

`migrations/` memuat 174 berkas (0001 sampai 0171) yang membuat sekitar 441 nama tabel unik. Penomoran tidak mulus: 0051 tidak ada, dan empat nomor dipakai dua berkas (0023, 0024, 0040, 0062). Migrasi produksi diterapkan oleh pemilik (`wrangler d1 migrations apply`, contoh pemakaian di `scripts/bnpb/aktivasi.sh:45`).

| Kelompok | Contoh tabel | Migrasi |
| --- | --- | --- |
| Lapor Warga dan moderasi | `laporan`, `kontak`, `suara`, `jejak`, `audit_moderasi`, `foto*` | 0001, 0003, 0007, 0013, 0020, 0090 |
| Statistik dan laju | `stat_hari`, `stat_tamu`, `stat_garam`, `stat_ip`, `laju`, `laju_posko`, `laju_bnpb` | 0004, 0006, 0017, 0019, 0022 |
| Titik panas, gempa, cuaca | `titik_terbaru`, `gempa*`, `peringatan`, `cuaca_nowcast`, `sihka_*`, `gunungapi_*` | 0002, 0009, 0010, 0014, 0016, 0021, 0068 |
| Posko, instansi, staf | `regu`, `instansi_akun`, `staf`, `staf_sesi`, `pantau_tugas`, `penugasan` | 0018, 0029, 0030, 0035 |
| Laporan resmi | `lk_*` (karhutla), `lkb_*` (bencana), `laporan_bnpb`, `pb_dokumen`, `segel` | 0023, 0032, 0048, 0131, 0171 |
| API dan push | `kunci_api`, `push_langganan`, `push_banjir`, `pw_*` | 0040, 0054, 0064, 0163 |
| Operasi lapangan dan udara | `ops_*`, `op_*`, `pb_*`, `omc_*`, `lp_*`, `orang`, `wa_antre` | 0033, 0039, 0095, 0097, 0103, 0126, 0129 |
| Siklus Bencana | `sk_*` | 0120 sampai 0124 |
| SIPPA, Kemitraan, LogPal | `sippa_*`, `km_*`, `logpal_*` | 0056 sampai 0073, 0080 sampai 0084, 0112 sampai 0115 |
| Lapor Bencana | `lapor_*`, `lj_*` | 0155 sampai 0162, 0165, 0167 |
| Pintu masuk dan profil | `mk_*`, `instansi_profil*` | 0133, 0145, 0166 |
| Bot Laporan WA | `wa_masuk`, `bl_proyek`, `bl_bahan`, `bl_versi`, `bl_pola`, `bl_daftar`, `bl_biaya`, `bl_detak` | 0076, 0078, 0154 |
| Lain-lain | `hukum_*`, `sensor_*`, `logbook_*`, `ai_*`, `tw_*`, `lf_*`, `ku_*`, `pm_*`, `alun_*` | masing-masing modul |

## Prefiks R2 (bucket `poskokarhutla-foto`, binding `MEDIA`)

Prefiks yang terverifikasi dari kode: `foto/`, `rumah/`, `korban/foto/`, `inventaris/foto/`, `instansi/media|dok|profil/`, `lapangan/`, `pendataan/`, `uji-pilot/`, `sippa/`, `sippa-laporan/`, `sippa-foto/`, `wa-form/`, `sitrep/`, `lapor-otomatis/`, `lapor/dok/`, `akademisi/`, `siklus/saji/`, `operasi/semai/arsip/`, `bangunan/`, `risiko/`, `dalops/`, `ubin/` (PMTiles, publik baca-saja dengan satu Range), `bot-laporan/`, `internal/pusdalops-logbook/turunan/`, serta kunci tunggal `data/himawari.json` dan `data/awan_tumbuh.json`. Selain itu `AGENTS.md` menyebut `kemitraan/` dan `unit/`. Data peran terbatas (bangunan, risiko, dalops, unit, direktori) sengaja di R2 di balik sesi atau kunci, tidak di `public/`.
