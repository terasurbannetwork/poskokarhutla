# Ilmu ai-internal

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/ai-internal.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca ai-internal`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus ai-internal "..."`.

## Peta berkas & tabel

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `docs/ai-internal/PETA-FITUR.md` | peta fitur dan arsitektur platform agen AI pembanding, urutan bangun 5 langkah | ai-internal |
| `.claude/cadangan-akun/artefak/usulan-sistem-satu-pintu-bnpb/usulan.md` | usulan induk Sistem Satu Pintu + AI internal (model open-weight di PDN, biaya, regulasi) | orkestrator |
| `public/ai/index.html`, `public/ai/ai.js`, `public/ai/ai.css` | layar `/ai`: riwayat percakapan, daftar agen, ruang obrol, formulir agen | ai-internal |
| `tests/ai/**` | uji klien tanpa DB (render, format, validasi formulir) | ai-internal |
| `src/ai.js` | rute `/api/ai/*`, gerbang model `env.AI.run`, putaran alat ke MCP kita | warga-api |
| `src/mcp.js` | server MCP `/mcp`; alat publiknya dipakai agen sebagai sumber angka | warga-api |
| `migrations/0107_ai_agen.sql` | tabel `ai_agen`, `ai_percakapan`, `ai_pesan` | warga-api |

Tabel D1 (langkah 1): `ai_agen` (agen buatan staf: nama, avatar, suhu, instruksi, deskripsi, visibilitas, alat yang diizinkan, sakelar),
`ai_percakapan` (per staf per agen), `ai_pesan` (peran user/assistant/tool, isi, sumber, model).

## Aturan & invarian

- Arah pemilik 5 Nov 2026: tiru SEMUA fitur dan arsitektur platform pembanding, lalu sambungkan ke sistem kita. Urutan bangun mengikuti §4 PETA-FITUR.md; fitur di luar peta tidak dibuat tanpa tanya pemilik.
- Prototipe memakai Workers AI (binding `AI`, sudah ada di `wrangler.jsonc`). Sasaran akhir: vLLM lokal di PDN lewat gerbang OpenAI-compatible; jadi semua panggilan model lewat SATU fungsi gerbang, tidak `env.AI.run` tersebar.
- AI tidak mengarang angka: angka hanya dari hasil alat (MCP kita), tiap jawaban menyebut sumber dan tanggal data. Mode penalaran menampilkan alat yang dipanggil dan hasilnya.
- Semua `/api/ai/*` dan layar `/ai` butuh sesi staf. Visibilitas agen: pribadi (pembuat), unit (unit sama), semua staf.
- Platform pembanding bertanda rahasia (NDA) dan instansi yang ditelusuri milik pelanggan: jangan salin teks panduan, nama agen pelanggan, email, atau isi dokumennya ke repo publik ini.
- Gaya: kepala situs navy bersama, token Centurisk97, tombol ikon polos tanpa kotak, tanpa titik tengah sebagai pemisah, tanpa kata "Pantau Bencana", bahasa Indonesia lugas.

## Ranjau yang pernah meledak

- Repo publik + kebiasaan commit "gas" pemilik menyapu semua ubahan belum commit lalu push: jangan pernah menaruh bahan rahasia pembanding di pohon kerja, walau sementara.
- Ekstensi Chrome untuk menelusuri pembanding sering putus; detail menu Settings dan layar chat diambil dari panduan PDF, belum dicek langsung.
- Model Workers AI berbeda dukungan tool calling-nya; cek dokumentasi Cloudflare sebelum menambah model ke daftar pilihan.

## Gerbang yang menghakimi

- `npm run uji:agen`: tiap berkas punya tepat satu pemilik, ilmu terisi.
- `npm run uji:warga`: rute `/api/ai/*` diuji dengan memanggil handler (bukan mock klien), termasuk penolakan tanpa sesi staf.
- `tests/ai/**` (node:test): klien layar `/ai` tanpa DB.
- Pemeriksa: `guard-api` + `security-reviewer` untuk rute, `migrasi-idempoten` untuk migrasi, `inp-reviewer` + `selera-angka` untuk layar.

## Kasus
- 2026-11-05 · 5 Nov 2026 langkah 1 /ai: kirim pesan hanya append balon (INP), konfirmasi lewat dialog tanya(), 401 dialihkan sekali per sesi lalu 403 = pesan; label pembaca layar pakai aria-label karena .sr salinan ditolak gerbang-inti
