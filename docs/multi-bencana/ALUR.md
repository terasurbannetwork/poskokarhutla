# Alur kerja per bencana

Dua belas tahap, dijalankan berurutan untuk tiap bencana. Tahap boleh dikerjakan paralel hanya
bila kolom "Butuh" sudah terpenuhi. Tiap tahap ditutup dengan bukti, bukan klaim (AGENTS.md §3.2):
pemeriksa adalah subagent baru tanpa riwayat pengerjanya.

| # | Tahap | Butuh | Pengerja | Pemeriksa | Keluaran | Bukti selesai |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Riset domain** | — | pengerja bencana | `validasi-model` | `scripts/<id>/RISET-SUMBER.md`, `RISET-STATUS.md` | Tiap sumber: URL, contoh respons tersimpan di `scripts/<id>/contoh/`, lisensi, frekuensi; tiap ambang status bersumber (peraturan/lembaga/jurnal) |
| 2 | **Spesifikasi** | 1 | pengerja | pemilik | `docs/multi-bencana/bencana/<id>.md`: daftar periksa PAKET-FITUR terisi rencana (dibuat/diadaptasi/tidak berlaku + alasan), definisi kejadian, status, lapisan, laci, insight, dampak, lapor warga, foto | **Disetujui pemilik** sebelum tahap 3 |
| 3 | **Registry dan rujukan** | 2 | `inti-layar` + `warga-api` | `migrasi-idempoten`, `guard-api` | Entri `public/bencana.json` berstatus `uji`; migrasi `00NN_<id>_rujukan.sql`; jenis laporan di `informasi_jenis.js`; roster agent | `uji:agen`, `uji:warga` hijau; `/<id>/` menjawab 200 dengan pita "versi uji" dan `noindex` |
| 4 | **Pipeline lambat** | 3 | pengerja | `validasi-model` | `scripts/<id>/*.py` untuk A01–A38 yang berlaku, semuanya dengan `uji`; workflow pemanggil `_pipa.yml` | Run workflow hijau; `public/<id>/data/meta.json` segar; `/api/status` memuat sumbernya |
| 5 | **Jalur cepat** (bila berlaku) | 3 | `warga-api` | `guard-api`, `security-reviewer` | `src/<id>.js`, tugas di pengatur cron, `GET /api/<id>/terbaru`, entri `cakupan.json` | Uji Miniflare hijau; latensi produksi kejadian baru → layar ≤ 2 menit di bawah beban `beban.mjs` |
| 6 | **Uji balik status** | 4 | pengerja | `validasi-model` | `public/<id>/data/validasi.json`, `RISET-UJI-BALIK.md` | Latih/validasi/uji per tahun; uji dibuka sekali; angka POD/FAR/CSI ditulis apa adanya walau jelek |
| 7 | **Layar inti** | 3, 4 | `inti-layar` + pengerja | `inp-reviewer`, `selera-angka` | `public/<id>/index.html` + modul: kepala, tab, peta, lapisan, panel, rentang, laci, legenda (C01–C15) | Tangkapan desktop + 375 px; tiap tab punya empat keadaan; nol galat konsol |
| 8 | **Analisis dan konten** | 6, 7 | pengerja | `selera-angka`, `validasi-model` | Insight, Tren, Berita, Dampak, Dashboard, Metode (C14–C22) | Tiap angka di layar = angka di JSON; tiap rumus punya bab Metode dengan contoh hitung dari data hari ini |
| 9 | **Respons** | 7 | pengerja | `validasi-model` | Posko, Sarana, Operasi, Keputusan, Simulasi bila berlaku (A21–A25, C19, C23) | Kesetaraan Python↔JS hijau |
| 10 | **Warga dan media** | 3, 7 | `warga-api` + pengerja | `security-reviewer`, `guard-api` | Lapor Warga, Foto (kategori + 100 dummy berlisensi domain), pop-up situasi, bagikan, OG (C24–C28) | `uji:warga` hijau; dummy 🧪/🧹 jalan; OG per rute dirender |
| 11 | **Bahasa dan kualitas** | 8–10 | pengerja | `selera-angka`, `inp-reviewer`, `higiene-repo` | `en-<id>.json`, glosarium, crawl kebocoran, `ukur_muat.mjs`, `beban.mjs` | Nol kebocoran; muatan awal ≤ anggaran; uji beban lolos |
| 12 | **Rilis** | 1–11 | sesi induk | semua pemeriksa terkait (konteks bersih) | Daftar periksa `bencana/<id>.md` 100% terisi; registry `aktif`; menu menampilkan bencana; sitemap/robots/llms.txt | `gerbang-bencana` butir 6–7 hijau; pemilik menyetujui di tangkapan layar |

## Aturan sepanjang alur

1. **Status resmi dulu.** Tahap 7 dan 8 wajib menampilkan status lembaga (BMKG/PVMBG/InaTEWS/BNPB)
   di atas indeks buatan sendiri, berlabel lembaga, dengan waktu terbitnya.
2. **Angka tanpa sumber tidak tayang.** Tiap angka di layar menyebut sumbernya di kaki kartu.
3. **Gagal terlihat.** Data basi diberi label umurnya; tidak pernah ditampilkan seolah segar.
4. **Commit kecil dengan path spesifik** (AGENTS.md §3.3). Fan-out penulis pakai worktree.
5. **Subagent tidak commit, push, atau deploy** (AGENTS.md §9). Sesi induk yang melakukannya.
6. **Pelajaran tiap bencana** ditulis ke `.claude/ilmu-agent/<pengerja>.md` lewat `ilmu.mjs kasus`
   dan, bila berlaku umum, ke `docs/multi-bencana/ALUR.md` bagian "Pelajaran" di bawah.

## Perkiraan ukuran kerja per bencana

Berdasarkan ukuran modul karhutla dan banjir. Satuan "sesi" = satu sesi kerja agent penuh.

| Tahap | Gempa | Gunung api | Cuaca | Kekeringan | Udara |
| --- | --- | --- | --- | --- | --- |
| 1–3 | 2 | 2 | 2 | 1 | 1 |
| 4–6 | 4 | 4 | 3 | 3 | 2 |
| 7–9 | 5 | 5 | 4 | 3 | 3 |
| 10–12 | 3 | 3 | 3 | 2 | 2 |
| **Jumlah** | **14** | **14** | **12** | **9** | **8** |

Fase 0 sendiri sekitar 12–16 sesi (tahap D paling besar karena strangler).

## Pelajaran

(Diisi setelah tiap bencana rilis.)
