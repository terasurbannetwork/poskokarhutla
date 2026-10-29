# Routine `pembaru-buku-pegangan-pb`

Salinan prompt routine yang terbaca manusia. Prompt yang terpasang hidup di luar git
(`~/.claude/scheduled-tasks/pembaru-buku-pegangan-pb/SKILL.md`), jadi tiap kali prompt terpasang disunting,
salinan ini ikut disunting di giliran yang sama lalu diadu dengan `diff`.

- Jadwal: tiap hari 21.00 WIB (cron `0 21 * * *`, jeda acak beberapa menit), tidak menyentuh pipeline.
- Mesin: Mac ini, aplikasi Claude desktop (jalan saat aplikasi terbuka; bila tertutup, jalan saat dibuka lagi).
- Mode: Auto. Hanya buku pantau-bencana; rencana-multi-bencana disegarkan manual.
- Status: terdaftar 22 Okt 2026.

## Prompt

```
Repo: /Users/priyankaalfatehan28/Documents/GitHub/poskokarhutla (branch main saja; jangan buat branch atau worktree). Repo ini di iCloud: stage path eksplisit saja, bungkus git jaringan dengan batas waktu (perl -e 'alarm 90; exec @ARGV' git fetch).

Tugas: segarkan artifact "Buku Pegangan Pantau Bencana" bila ada keputusan atau perubahan baru. Hari sepi: berhenti tanpa menulis apa pun.

LANGKAH 0. git fetch; pastikan main lokal tidak tertinggal origin/main (git pull --ff-only bila aman). Kalau ada commit routine ini yang belum terdorong (git log origin/main..HEAD dengan pesan "Buku pegangan:"), dorong dulu, jangan menulis ulang.

LANGKAH 1. Baca docs/buku-pegangan/ARTIFACT.json, entri "pantau-bencana" (url, sumber, commit, disegarkan). Kumpulkan perubahan sejak commit itu:
- git log <commit>..HEAD --no-merges --format='%ad %h %s' --date=short (abaikan commit data otomatis dan pesan "gas"/"gsa"/"asg" kecuali isinya berarti; untuk "gas" lihat --stat)
- berkas memori pemilik yang berubah sejak tanggal "disegarkan": /Users/priyankaalfatehan28/.claude/projects/-Users-priyankaalfatehan28-Documents-GitHub-poskokarhutla/memory/*.md (sumber kutipan pemilik dan keputusan)
- AGENTS.md, scripts/agents/roster.json, tests/agen/*.test.mjs, docs/bnpb/STATUS.md, docs/multi-bencana/**, public/bencana.json, wrangler.jsonc, migrations/
Kalau tidak ada yang berarti: berhenti.

LANGKAH 2. Sunting docs/buku-pegangan/pantau-bencana.md:
- Tambah entri Riwayat bertanggal (terbaru di atas, daftar bernomor); kutipan pemilik miring, hanya kutipan yang tertulis di memori atau pesan commit. Jangan mengarang keputusan.
- Sesuaikan bab terkait: Keputusan pemilik (Diputus/Belum diputus), Stack & peta repo, Situs per alamat, Halaman & rute, Selera tampilan, Angka & copy, Fitur yang disembunyikan, Model & data, Ruang Koordinasi BNPB, Ruang Instansi, Gerbang penjaga, Insiden & pelajaran, Armada agent (hitung dari roster.json), Tugas pemilik.
- Perbarui baris "Disegarkan <tanggal>" dan "commit <sha pendek HEAD>".
- Gaya wajib: bahasa Indonesia lugas, tanpa em dash, tanpa titik tengah " · " sebagai pemisah, tanpa emoji, tanpa kalimat bergaya/slogan. Cek: grep -n '—\| · ' hanya boleh muncul di dalam kutipan aturan.

LANGKAH 3. python3 docs/buku-pegangan/bangun.py pantau-bencana

LANGKAH 4. Terbitkan ulang dengan tool Artifact: publish, file_path = docs/buku-pegangan/terbit/pantau-bencana.html (path absolut), url = url di ARTIFACT.json (https://claude.ai/artifact/XEdp3R4s42P9kG6dvyXc1Q). Bila diminta read dulu, read url itu lalu publish lagi. TIDAK PERNAH menerbitkan sebagai artifact baru tanpa url.

LANGKAH 5. Perbarui "commit" (sha sungguhan HEAD) dan "disegarkan" (YYYY-MM-DD) entri pantau-bencana di ARTIFACT.json. Commit hanya tiga berkas:
git add -- docs/buku-pegangan/pantau-bencana.md docs/buku-pegangan/terbit/pantau-bencana.html docs/buku-pegangan/ARTIFACT.json
git commit -m "Buku pegangan: segarkan sampai <tanggal> (<ringkas isi>)" -- <tiga berkas yang sama>
Lalu push dengan batas waktu: perl -e 'alarm 120; exec @ARGV' git push origin HEAD:main. Gagal push: biarkan commit lokal, laporkan.

Batas: tidak menyentuh kode app, data, workflow, migrasi, atau berkas lain. Tidak deploy, tidak wrangler. Laporan akhir: satu-dua kalimat, apa yang masuk Riwayat dan sha commit, atau "tidak ada perubahan".
```
