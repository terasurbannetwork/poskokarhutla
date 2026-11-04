# Routine `buku-pegangan-malam`

Salinan prompt routine yang terbaca manusia. Prompt yang terpasang hidup di luar git
(`~/.claude/scheduled-tasks/buku-pegangan-malam/SKILL.md`), jadi tiap kali prompt terpasang disunting,
salinan ini ikut disunting di giliran yang sama lalu diadu dengan `diff`.

- Jadwal: tiap malam 23.00 WIB (cron `0 23 * * *`, jeda acak beberapa menit), tidak menyentuh pipeline.
- Mesin: Mac ini, aplikasi Claude desktop (jalan saat aplikasi terbuka; bila tertutup, jalan saat dibuka lagi).
- Mode: Auto. Hanya buku pantau-bencana.
- Sumber: histori chat (`.claude/ilmu-agent/prompt/*.jsonl`), memori dan selera pemilik, histori commit GitHub (terutama perbaikan). Menjaga bab "Mengenal pemilik".
- Status: dipasang ulang 4 Nov 2026 di akun baru (routine lama `pembaru-buku-pegangan-pb` 21.00 tidak ikut pindah akun).

## Prompt

```
Repo: /Users/priyankaalfatehan28/Developer/poskokarhutla (branch main saja; jangan buat branch atau worktree). Stage path eksplisit saja, jangan git add -A. Bungkus git jaringan dengan batas waktu (perl -e 'alarm 90; exec @ARGV' git fetch).

Tugas: tiap malam segarkan "Buku Pegangan Pantau Bencana" di GitHub (docs/buku-pegangan/pantau-bencana.md) dan di artifact, dari tiga sumber: histori chat pemilik, memori/selera pemilik, dan histori commit GitHub (terutama perbaikan). Tujuannya Claude makin kenal pemilik: selera, keputusan, dan pola koreksi yang berulang. Hari sepi: berhenti tanpa menulis apa pun.

LANGKAH 0. git fetch; pastikan main lokal tidak tertinggal origin/main (git pull --ff-only bila aman; kalau bentrok, berhenti dan lapor). Kalau ada commit routine ini yang belum terdorong (git log origin/main..HEAD, pesan "Buku pegangan:"), dorong dulu.

LANGKAH 1. Baca docs/buku-pegangan/ARTIFACT.json, entri "pantau-bencana" (url, commit, disegarkan). Kumpulkan sejak commit dan tanggal itu:
a) Histori chat: .claude/ilmu-agent/prompt/<YYYY-MM>.jsonl (baris dengan "t" sesudah tanggal disegarkan; abaikan berkas bernama "* 2.jsonl"). Isinya prompt pemilik yang sudah disamarkan. Buang bagian <artifact-view-context>, <system-reminder>, dan tempelan panjang; ambil kalimat pemilik yang memutus, menegur, menolak, memuji, atau berkata "catat". Cari juga cepat: node scripts/agents/ilmu.mjs prompt 'catat|jangan|selalu|harus|gak suka|ga suka|salah|ulang'
b) Memori dan selera: ~/.claude/projects/-Users-priyankaalfatehan28-Developer-poskokarhutla/memory/*.md, .claude/cadangan-akun/memori/poskokarhutla*/*.md, ~/.claude/skills/ppt-konsultan/bnpb/references/keputusan-pemilik.md (yang berubah sejak tanggal disegarkan, cek mtime atau git log).
c) Histori GitHub: git log <commit>..HEAD --no-merges --format='%ad %h %s' --date=short. Abaikan commit data otomatis (pipeline, "Data:", "Log prompt") dan pesan "gas"/"gsa"/"asg" kecuali --stat menunjukkan isi berarti. Tandai khusus commit perbaikan (perbaiki, betulkan, fix, koreksi, revert, "ditolak", "salah"): itu bahan pola koreksi pemilik.
d) Perubahan aturan: AGENTS.md, scripts/agents/roster.json, tests/agen/*.test.mjs, data/kajian-bnpb/*/KEPUTUSAN-*.md, public/bencana.json, wrangler.jsonc, migrations/.
Kalau tertinggal banyak (lebih dari 150 commit), kelompokkan per hari dan ambil yang paling berarti; jangan menyalin daftar commit mentah.
Kalau tidak ada yang berarti: berhenti.

LANGKAH 2. Sunting docs/buku-pegangan/pantau-bencana.md:
- Riwayat perubahan: entri bertanggal (terbaru di atas, daftar bernomor). Kutipan pemilik miring, HANYA kutipan yang tertulis di log prompt, memori, atau pesan commit. Jangan mengarang keputusan.
- Bab "Mengenal pemilik" (buat bila belum ada, letakkan tepat sesudah "Mulai dari sini", tambahkan ke daftar tautan di kepala): (1) cara pemilik bekerja dan berbicara, (2) pola koreksi berulang: tiap pola satu baris dengan berapa kali muncul, tanggal terakhir, contoh commit perbaikan, dan gerbang yang sekarang menahannya atau "belum bergerbang", (3) yang paling sering membuat pemilik kesal. Perbarui hitungan tiap malam, jangan menggandakan baris.
- Sesuaikan bab terkait: Keputusan pemilik, Selera tampilan, Angka & copy, Selera presentasi (PPT), Fitur yang disembunyikan, Model & data, Gerbang penjaga, Insiden & pelajaran, Armada agent (hitung dari roster.json), Tugas pemilik.
- Perbarui baris "Disegarkan <tanggal>" dan "commit <sha pendek HEAD>".
- Repo ini PUBLIK: tidak ada email, nomor HP, NIK, token, atau nama orang pribadi selain pemilik. Kutip hanya dari log prompt yang sudah disamarkan.
- Gaya wajib: bahasa Indonesia lugas, tanpa em dash, tanpa titik tengah " · " sebagai pemisah, tanpa emoji, tanpa slogan, tanpa tulisan "Pantau Bencana" di luar judul buku. Cek: grep -n '—\| · ' hanya boleh muncul di dalam kutipan.

LANGKAH 3. python3 docs/buku-pegangan/bangun.py pantau-bencana

LANGKAH 4. Terbitkan ulang dengan tool Artifact: publish, file_path = <akar repo>/docs/buku-pegangan/terbit/pantau-bencana.html, url = url di ARTIFACT.json (https://claude.ai/artifact/XEdp3R4s42P9kG6dvyXc1Q). Bila diminta read dulu, read url itu lalu publish lagi. TIDAK PERNAH menerbitkan sebagai artifact baru tanpa url.

LANGKAH 5. Perbarui "commit" (sha sungguhan HEAD) dan "disegarkan" (YYYY-MM-DD) entri pantau-bencana di ARTIFACT.json. Commit dengan path eksplisit:
git commit -m "Buku pegangan: segarkan sampai <tanggal> (<ringkas isi>)" -- docs/buku-pegangan/pantau-bencana.md docs/buku-pegangan/terbit/pantau-bencana.html docs/buku-pegangan/ARTIFACT.json
Lalu push: perl -e 'alarm 600; exec @ARGV' git push origin HEAD:main. Hook pre-push wajib lolos, JANGAN pakai --no-verify. Push gagal karena uji merah di luar tiga berkas ini: biarkan commit lokal, laporkan uji mana yang merah.

Batas: tidak menyentuh kode app, data, workflow, migrasi, atau berkas lain. Tidak deploy, tidak wrangler. Laporan akhir: dua-tiga kalimat bahasa Indonesia santai (gw/lu, jangan panggil "Pak"): apa yang masuk Riwayat, pola koreksi baru di "Mengenal pemilik", sha commit, status push. Atau "tidak ada perubahan".
```
