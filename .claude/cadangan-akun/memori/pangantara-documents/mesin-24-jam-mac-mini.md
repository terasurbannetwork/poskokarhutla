---
name: mesin-24-jam-mac-mini
description: "Mac mini ini (user priyankaalfatehan28) adalah mesin 24 jam MBG sejak 5 Sep 2026; laptop (user alfatehanseptianta) lambat, sering mati, tapi masih dipakai dan sering lebih maju dari origin. Repo di ~/Documents (iCloud + TCC), launchd bash tidak bisa membacanya."
metadata: 
  node_type: memory
  type: project
  originSessionId: 0396dc32-3261-4d12-b060-18feb2345067
  modified: 2026-09-05T15:06:50.170Z
---

Dua mesin pemilik: **Mac mini M4 10 core 16 GB, hostname `Mac-mini-Priyanka`, user
`priyankaalfatehan28`** = mesin 24 jam (keputusan pemilik 5 Sep 2026), dan laptop
user `alfatehanseptianta` yang lambat dan boleh mati. Semua jadwal malam (5 scheduled
task: pembaru-buku-pegangan 21:07, pelunas-backlog 23:30, night-shift-mbg 02:00,
tingkatkan-diri 04:00, dalang-review-malam 05:37) + launchd (caffeinate, pelunas,
penjaga mesin 6 jam, penjaga produksi 1 jam, remote-control 5 menit) dipasang di Mac
mini lewat `npm run mesin:pasang`; task yang sama di laptop harus DIHAPUS pemilik.
Pemilik mengetik dari laptop lewat sesi Remote Control `mac-mini-mbg` (tmux `mbg`).

**Why:** dua mesin menjadwalkan satu repo = balapan `main` (insiden 27 Agt 2026).
Sebelum 5 Sep Mac mini punya NOL otomasi repo padahal ia yang hidup 24 jam.

**How to apply:**
- **Laptop masih aktif dan sering LEBIH MAJU dari origin/main** (5 Sep malam: 38
  commit + 13 migrasi remote yang berkasnya belum sampai ke Mac mini). Sebelum
  menulis migrasi untuk objek yang sudah ada, baca `list_migrations` remote dan
  cari nama yang tidak punya berkas di checkout ini; kalau ada, tunggu push
  laptop, jangan tulis versi sendiri. Sesi Mac mini pernah menghidupkan lagi
  4 kursi kabupaten yang baru dicabut pemilik sore itu (700 §7, 5 Sep (4)).
- Dua sesi Mac mini + Stop hook + pelunas berbagi satu tree: `git merge` /
  `rebase` yang berhenti di konflik bisa DIBATALKAN proses lain dalam semenit.
  Selesaikan konflik cepat, generate (kg/, snapshot brief) ambil origin lalu
  `kg:build` + `brief:sync`.
- Repo di `~/Documents/GitHub/pangantara` ada di iCloud Drive + folder TCC: launchd
  `/bin/bash` ditolak membaca (exit 126); `node` dari `~/.local/bin` BOLEH dan
  anaknya ikut boleh. Penjaga & remote-control diluncurkan lewat
  `scripts/mesin/lewat-node.mjs`; pelunas memakai rancangan STUB laptop
  (`~/.local/state/mbg-pelunas`, "launchd-diblokir", loop cadangan dari sesi).
  Yang benar tetap memindahkan repo ke `~/pangantara`; keputusan pemilik.
- Salinan penjaga di `~/.mbg-mesin/` (log di situ). `npm run mesin:status`
  menyebut lapis yang belum hidup; `pgrep -x Claude` salah baca dari sandbox sesi.
- Tangan pemilik di mesin ini yang sudah beres: gh auth login (mbgbangkabelitung),
  `.env.local` (tanpa CRON_SECRET), Login Item Claude, **auto-login macOS**
  (`autoLoginUser = priyankaalfatehan28`, FileVault OFF - diverifikasi 8 Sep 2026).
  Belum: hapus task di laptop, Full Disk Access atau pindah repo.
- **Rantai anti-tidurnya utuh dan sudah diuji (8 Sep 2026):** LaunchAgent
  `com.pinka.caffeinate` (`caffeinate -ims`, RunAtLoad + KeepAlive) - `kill -9`
  dibalas respawn dalam 1 detik. LaunchAgent jalan saat LOGIN, bukan boot, jadi
  yang menyambung reboot ke caffeinate adalah auto-login di atas. **Menyalakan
  FileVault memutus rantai itu**: auto-login mati, tidak ada yang login, nol
  LaunchAgent hidup sampai ada yang mengetik password di depan mesin.
- Layar mati / lock screen BUKAN sleep: proses tetap jalan penuh. 6 Sep 22:19 -
  8 Sep 11:52 layar mati 37 jam, `pmset -g log` nol event Sleep, uptime tak putus.
- **Suite e2e database TIDAK PERNAH jalan di mesin ini: `DATABASE_URL` kosong**
  (8 Sep 2026). `npm run test:e2e:db` berhenti di "DATABASE_URL kosong" sebelum
  satu assertion pun dieksekusi, jadi vonis `ci:e2e-database` berulang tiap push
  (6x per 8 Sep) dan menahan antrean lewat `gerbang-pelunas-belajar`. Gerbang
  unit `gerbang-test-integrasi` tetap hijau karena yang diperiksanya PENDAFTARAN
  (berkas migrasi + `tests/e2e/cakupan.json`), bukan eksekusi — itu yang bikin
  kelasnya sunyi. Sampai pemilik menempel `DATABASE_URL`, tiap objek DB baru
  diverifikasi manual ke remote lewat MCP (`do $$ ... raise exception $$` supaya
  rollback) dan alasannya ditulis di buku vonis.
- Push yang belajar (5 Sep malam): tiap vonis merah pre-push membuka berkas di
  `.claude/pelunas/vonis/`; gerbang `gerbang-pelunas-belajar` menahan push sampai
  ditutup (`npm run vonis:tutup -- <sha8> --gerbang=... | --alasan=...`). Jangan
  pernah menghapus entri untuk meloloskan push; itu sama dengan --no-verify.
- Pindah repo keluar ~/Documents: `bash scripts/mesin/pindah-repo.sh` (menolak
  jalan kalau tree kotor, utang > 0, atau ada sesi claude hidup); memori proyek
  ikut disalin ke slug path baru.
- **12 Sep 2026: repo ganti nama jadi `pangantara` di tiga lapis sekaligus** —
  folder `~/Documents/GitHub/pangantara`, remote `git@github.com:pangantara/pangantara.git`
  (repo lama ditransfer, URL lama masih redirect), dan proyek Supabase bernama
  PANGANTARA (ref `jyoguefexdumwgjttfye`, tidak berubah). Nama `mbg-kdmp` sudah
  TIDAK ADA di mesin ini. Yang jalurnya dibakar saat pasang wajib dipasang ulang
  dari jalur baru: `bash bekal/pasang.sh` lalu `npm run mesin:pasang` (keduanya
  sudah dijalankan; 8 LaunchAgent + 6 scheduled task + tmux `mbg` hijau di
  jalur baru). Memori proyek disalin ke slug `-Users-<nama>-Documents-GitHub-pangantara`.
- **Yang masih hilang di Mac mini: `rtk`** (PreToolUse `rtk hook claude` di
  `~/.claude/settings.json` no-op tanpa error, jadi penghematan token mati).
  Sumber pemasangannya tidak terdokumentasi di mana pun — tanya pemilik sebelum
  memasang biner pihak ketiga. `supabase` CLI 2.117.0 dan `cavemem` sudah
  dipasang 12 Sep 2026 (supabase lewat rilis resmi ke `~/.local/bin`, bukan brew:
  tap-nya menuntut Command Line Tools dipasang ulang dengan sudo).
- Lihat juga [[pelunas-utang-push]] dan 700-ranjau-deploy.md §6 + §7.
