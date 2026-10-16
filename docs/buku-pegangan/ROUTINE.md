# Routine `pembaru-buku-pegangan-pb`

Salinan prompt routine yang terbaca manusia. Prompt yang terpasang hidup di luar git
(`~/.claude/scheduled-tasks/`), jadi tiap kali prompt terpasang disunting, salinan ini ikut disunting di
giliran yang sama lalu diadu dengan `diff` (pelajaran Buku Pegangan MBG §21).

- Jadwal: tiap hari 21.00 WIB, sesudah keputusan hari itu selesai dan sesudah `data.yml` 21.20 WIB tidak bentrok
  karena routine ini tidak menyentuh pipeline.
- Mesin: Mac mini (satu mesin saja; dua pemicu untuk satu berkas berarti dua commit yang saling menimpa).
- Status: BELUM didaftarkan. Pendaftaran menunggu persetujuan pemilik.

## Prompt

```
Repo: poskokarhutla

LANGKAH 0. git fetch; kerja di atas origin/main terbaru. Kalau ada commit routine yang belum terdorong
(git log origin/main..HEAD), dorong dulu, jangan menulis ulang.

LANGKAH 1. Baca docs/buku-pegangan/ARTIFACT.json. Untuk tiap buku, bandingkan commit di "commit" dengan
git log sejak commit itu atas berkas sumbernya:
- pantau-bencana: AGENTS.md, .claude/ilmu-agent/*.md, memori pemilik proyek ini
  (gaya-kartu-insight, fitur-disembunyikan), docs/multi-bencana/**, git log public/ src/ scripts/
- rencana-multi-bencana: docs/multi-bencana/**
Kalau tidak ada yang berubah: berhenti tanpa menulis apa pun.

LANGKAH 2. Untuk pantau-bencana: tambahkan entri Riwayat bertanggal hari ini (kutipan pemilik kalau ada di
memori atau pesan commit), lalu sesuaikan bagian aturannya. Jangan mengarang keputusan; yang tidak punya
sumber tertulis tidak masuk.

LANGKAH 3. python3 docs/buku-pegangan/bangun.py <nama>. Untuk rencana-multi-bencana, bangun dulu
docs/multi-bencana/_gabung.md dengan python3 docs/buku-pegangan/gabung.py.

LANGKAH 4. Terbitkan ulang ke URL di ARTIFACT.json (url wajib diisi, tidak pernah artifact baru).

LANGKAH 5. Perbarui "commit" (sha sungguhan, bukan "lokal") dan "disegarkan" di ARTIFACT.json, commit
dengan path spesifik (git commit -- docs/buku-pegangan/...), lalu git push origin HEAD:main.

Batas: tidak menyentuh kode app, data, workflow, atau migrasi. Tidak deploy.
```
