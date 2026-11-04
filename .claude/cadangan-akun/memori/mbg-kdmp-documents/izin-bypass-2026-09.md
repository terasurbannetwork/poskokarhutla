---
name: izin-bypass-2026-09
description: "Pemilik mau nol dialog izin; bypassPermissions TIDAK bisa dari settings.json, cuma dari flag peluncuran --dangerously-skip-permissions"
metadata:
  node_type: memory
  type: feedback
  originSessionId: eded358a-db16-4042-abd6-cafad8ca1a51
  modified: 2026-09-06T12:40:06.329Z
---

6 Sep 2026 pemilik memutus: **nol dialog izin sama sekali**, khususnya untuk
routine `dalang-review-malam`, `pembaru-buku-pegangan`, `tingkatkan-diri`.

**KOREKSI 6 Sep 2026 19:10 WIB — `permissions.defaultMode: "bypassPermissions"`
di settings.json TIDAK PERNAH BEKERJA, di level mana pun.** Ia sudah terpasang di
`.claude/settings.json` (repo), `.claude/settings.local.json`, DAN
`~/.claude/settings.json` (user, dipasang 18:36 WIB) — dan sesi yang mulai
24 menit SESUDAH itu tetap tercatat `"permissionMode":"default"`.

Buktinya di transkrip `~/.claude/projects/<repo>/*.jsonl`: dari seluruh sesi repo
ini cuma 9 yang pernah bermode `bypassPermissions`, dan sembilan-sembilannya
headless yang diluncurkan dengan flag eksplisit — `scripts/pelunas-push.sh:369`
dan `scripts/mesin/penjaga-ci.mjs:214`, dua-duanya memakai
`--dangerously-skip-permissions`. Nol sesi interaktif, nol sesi routine.

**Why:** bypass adalah keputusan per-PELUNCURAN, bukan setelan tersimpan. CLI-nya
mengakui `bypassPermissions` cuma lewat `--permission-mode` / 
`--dangerously-skip-permissions`; `--allow-dangerously-skip-permissions` yang
membuatnya muncul sebagai pilihan di picker. Setelan di berkas sengaja tidak
dihormati supaya bypass tak bisa ikut ter-commit atau tersinkron diam-diam.
Sesi desktop app jatuh ke picker mode di kiri bawah composer (Manual = `default`,
Auto = `auto`), dan picker itu yang menang.

**How to apply:**
- Dialog muncul lagi → JANGAN tambah rule dan JANGAN sentuh `defaultMode`.
  Yang menentukan cuma cara sesinya diluncurkan.
- Terminal nol dialog: `claude --dangerously-skip-permissions`. TERBUKTI jalan
  6 Sep 2026 19:2x WIB, status bar sesinya berbunyi `bypass permissions on`.
  Mode di sesi terminal dicycle **shift+tab**, jadi tidak perlu relaunch untuk
  pindah mode; bypass baru ikut dalam siklus kalau ia diizinkan saat peluncuran.
- Desktop app: picker kiri bawah ke **Auto**. Bypass penuh tidak ditawarkan di
  sana; sisa dialognya keputusan classifier auto, bukan rule yang kurang.
- Routine terjadwal ikut jalur desktop → `auto`. Satu-satunya jalan nol dialog
  buat routine adalah memindahnya ke pemanggilan CLI berflag, persis pola
  `pelunas-push.sh`.
- **Penyebab kedua yang sering disangka izin kurang:** perintah Bash majemuk.
  Rule `Bash(x:*)` mencocokkan SATU perintah; rantai `&&`/`;`/`for`/`$(...)`
  harus cocok seluruh ruasnya, dan `printf`, `test`/`[`, serta konstruksi `for`
  tidak ada di allow list mana pun. Pecah jadi panggilan pendek satu perintah.
- Jangan tambah rule sekali-pakai ke `settings.local.json`; tambah per KELUARGA
  perintah (`Bash(grep:*)`, bukan grep berikut argumennya).
- **Agent tidak menyunting berkas izin sendiri** — patch-nya selalu diserahkan ke
  pemilik sebagai satu blok `bash`.

Terkait [[mesin-24-jam-mac-mini]].
