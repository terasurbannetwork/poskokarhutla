# Kontribusi, mutu, dan tinjau lokal

Halaman ini menjelaskan cara berkontribusi, gerbang mutu, dan cara meninjau perubahan di lokal.

## Cara berkontribusi

Aturan lengkap ada di `AGENTS.md`. Ringkasan alur kerja untuk pengembang dan agent AI:

1. Kenali pemilik berkas dan ilmunya sebelum menyentuh apa pun (`AGENTS.md` §0):
   `node scripts/agents/ilmu.mjs pemilik <berkas>` lalu `node scripts/agents/ilmu.mjs baca <agent>`. Tuliskan kontrak kerja: CAKUPAN (berkas yang disentuh), DI LUAR (yang tidak), BUKTI SIAP (perintah yang membuktikan selesai).
2. Fitur atau modul besar dimulai dari paket dokumen di `data/kajian-bnpb/<modul>/` (KEPUTUSAN, RISET, PRD, ALUR, ALGORITMA, DESIGN-SYSTEM, DESAIN-TEKNIS, KEAMANAN-PRIVASI, RENCANA-UJI, TIKET, GLOSARIUM), baru kode (`AGENTS.md` §3.7). Folder baru di `public/` atau `scripts/` tanpa paket ditolak gerbang. Pertanyaan yang belum dijawab pemilik ditulis dengan bawaan sementara, tidak dikarang.
3. Kerja langsung di `main`. Tidak ada branch, worktree, atau push ke selain `main` (`AGENTS.md` §3.3; hook `scripts/agents/tolak-branch.mjs`). Beberapa sesi memakai satu checkout, jadi commit dengan path spesifik: `git commit -- <berkas>`, jangan `git add -A`.
4. Tinjau tampilan di lokal: `npm run tinjau` (server di `http://localhost:8800`, kode dari folder kerja, data dan API dari produksi, kecuali `/api/lapor/*` yang dijawab mesin lokal `scripts/lapor/lokal.mjs` dan tidak diteruskan ke produksi, `scripts/agents/tinjau_lokal.mjs:75-76`). Tulisan lewat server ini mengenai PRODUKSI, selain `/api/lapor/*`. Tutup laporan perubahan layar dengan tautan halaman yang diubah.
5. Jalankan uji sesuai permukaan yang berubah (tabel di [referensi workflow, keluaran, uji](/docs/pengembang/arsitektur/ref-workflow)). Selalu jalankan `npm run uji:agen` bila menyentuh aturan, workflow, atau struktur berkas.
6. Minta pemeriksa berkonteks bersih untuk permukaan sensitif (model, route Worker, migrasi, angka di layar, commit besar). Pemeriksa tidak pernah pengerja yang sama, dan melapor tanpa memperbaiki sendiri (`AGENTS.md` §3.2 dan §6).
7. Catat pelajaran: `node scripts/agents/ilmu.mjs catat <agent> <berkas> <vonis> "<ringkas>"` dan `ilmu.mjs kasus <agent> "<pelajaran>"`.
8. Dorong dengan `npm run dorong` (antre satu pendorong, menyusul `main`, lalu push lewat uji pre-push). Subagent tidak commit dan tidak push; sesi induk yang melakukannya. Tidak ada `wrangler deploy` dari laptop atau dari subagent; penerbitan lewat `terbit.yml`.
9. Aturan pemilik yang berulang dijadikan gerbang uji atau hook, bukan sekadar catatan (`AGENTS.md` §3.4).

Aturan teknis yang sering menjebak:

- Akses D1 hanya di `src/hak.js` (gerbang `tests/agen/gerbang-d1.test.mjs` bersifat ratchet: berkas lama yang masih menyentuh D1 tercatat dan daftarnya hanya boleh menyusut).
- Route Worker baru ditambahkan sebagai kunci `"METODE /jalur"` di tabel `RUTE` modulnya. Halaman HTML baru otomatis terkunci di `centurisk97.id`; yang boleh terbuka harus tercatat di `PUBLIK_TANPA_SESI` beserta alasannya (`src/worker.js:758`).
- Migrasi baru memakai nomor berikutnya dan harus idempoten. Migrasi produksi diterapkan oleh pemilik, jadi kode memperlakukan tabel yang belum ada sebagai "lewati" (pola `no such table`), bukan galat fatal.
- Tugas cron baru dipasang di `scheduled()` pada menit tetap, bukan jadwal baru (gerbang `gerbang-anggaran-cf`).
- Teks layar tanpa titik tengah sebagai pemisah, tanpa literal warna di luar `public/inti/tema.css`, dan kartu laporan mengikuti `public/inti/kartu.css` (gerbang `gerbang-titik-tengah`, `gerbang-token-warna`, `gerbang-kartu-std`).
- Secret tidak pernah masuk berkas yang dilacak git; repo ini publik. Gerbang pre-push menolak profil peramban (`*.prof/`).
- Berkas bernama `* 2.*` adalah salinan nyasar sinkronisasi; jangan disunting atau dipakai.

Catatan lingkungan: skrip `dorong.sh`, rantai `npm run uji`, dan beberapa perintah `uji:*` memakai sintaks `sh`, jadi di Windows jalankan lewat Git Bash. `npm run tinjau:pasang` memakai `launchctl` dan hanya untuk macOS; `npm run tinjau` berjalan dengan Node di mana pun.

## Mutu: gerbang, ratchet, dan pemeriksa

- Gerbang adalah uji `node --test` di `tests/agen/` (99 berkas) dan `tests/inti/` yang dijalankan `npm run uji:agen`. Contoh: konfigurasi produksi hanya `wrangler.jsonc` (`gerbang-wrangler`), CSP dan skrip inline (`gerbang-csp-inline`), akses D1 hanya di `hak.js` (`gerbang-d1`), satu pemilik tiap berkas kode (`gerbang-ilmu-agent`), tanpa penanda konflik git (`gerbang-konflik`), tanpa titik tengah (`gerbang-titik-tengah`), tanpa branch (`gerbang-tanpa-branch`), pesan keluar satu rumah per kanal (`gerbang-keluar`), paket dokumen modul (`gerbang-paket-modul`).
- Ratchet: daftar pengecualian berkas lama disimpan di `tests/agen/fixtures/` dan hanya boleh menyusut (misalnya `kartu_std.json`, `token-warna-sisa.json`).
- Terbit tidak terjadi bila uji merah. Sebelum push, hook pre-push menjalankan uji pada klon lokal sementara dari commit yang didorong (bukan working tree), untuk push yang menyentuh jalur pemicu terbit (`public/*` selain data, `src/*`, `wrangler.jsonc`, `migrations/*`, `tests/agen|warga|sippa/*`, `package.json`).
- Ilmu dan jejak per agent: `.claude/ilmu-agent/<nama>.md` (peta berkas, aturan, ranjau, kasus) dan `.claude/ilmu-agent/jejak/<nama>.jsonl` (berkas yang sudah diperiksa, dikunci ke blob git berkas dan hash definisi agent). `ilmu.mjs cek` menjawab `LEWATI` hanya bila blob dan aturan sama dengan vonis terakhir; berkas atau agent yang berubah diperiksa ulang. Prompt pemilik dicatat dengan penyamaran di `.claude/ilmu-agent/prompt/<bulan>.jsonl`; karena repo publik, fungsi `samarkan()` tidak boleh dilemahkan.
- Kebijakan model agent: model murah mengerjakan (`haiku` untuk pencocokan pola, `sonnet` untuk membaca dan menyimpulkan), model besar hanya merancang. Gerbangnya `gerbang-model-agent`.

## Tinjau lokal

`scripts/agents/tinjau_lokal.mjs` menyajikan kode layar dari folder kerja (HTML, JS, CSS, gambar, JSON non-data) di `http://localhost:8800`, sementara data (`/data/**`), API, dan login diteruskan ke produksi. Halaman HTML ditanyakan dulu ke produksi (supaya gerbang login dan atribut `<html>` per sesi berlaku), lalu isinya diganti berkas lokal. Atribut cookie `Secure` dan `Domain` dibuang supaya menempel di localhost. Kelemahan yang disengaja: penulisan (`POST`/`PUT`/`DELETE`) mengenai produksi. Pengecualian: `/api/lapor/*` (Lapor Bencana) dijawab mesin lokal `scripts/lapor/lokal.mjs` dan tidak diteruskan (`scripts/agents/tinjau_lokal.mjs:75-76`; `AGENTS.md` §2.30).
