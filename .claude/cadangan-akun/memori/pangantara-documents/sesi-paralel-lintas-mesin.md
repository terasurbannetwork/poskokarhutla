---
name: sesi-paralel-lintas-mesin
description: Pemilik menjalankan beberapa sesi Claude di mesin berbeda atas main yang sama; cek peer via ListAgents sebelum menyentuh fungsi DB / komponen bersama, dan perlakukan rebase sebagai kelas bug tersendiri
metadata:
  node_type: memory
  type: project
  originSessionId: 95d1473a-a530-4cc8-89c7-326dee1b620b
  modified: 2026-09-22T19:24:45.292Z
---

21 Sep 2026: tiga tabrakan dalam satu sesi dengan peer "Search bar Province display" (Remote Control, mesin lain, sama-sama kerja di `main`, sama-sama belum push):
- fungsi DB `my_sppg_scope_wilayah` diterapkan dua sesi dengan tanda tangan beda → dua overload → PostgREST PGRST203 untuk SEMUA panggilan (disatukan di migrasi 20260921140000)
- timestamp migrasi `20260921130000` dan nomor uji e2e `70-` dipakai kedua sesi
- `SppgScope.tsx`, `SppgSelect.tsx`, `SppgCyclePicker.tsx` disunting keduanya (fitur lipat grup dikerjakan dobel)

23 Sep 2026, kelas KEDUA yang muncul saat utangnya dibayar — **rebase-nya sendiri**, bukan lagi penulisan serentaknya:
- Sesi sebelumnya meninggalkan `.git/rebase-merge` HIDUP di tengah jalan (9 dari 11 commit belum di-replay). Sesi berikutnya yang langsung `git stash push` kena "needs merge". **Periksa `ls -d .git/rebase-merge` sebelum menyentuh git sama sekali.**
- Dua mesin mengekstrak panel yang SAMA jadi berkas berbeda tanpa saling tahu (`TabelPorsiHargaOps.tsx` vs `porsi-harga-ops.tsx`). Git tidak bisa melihat itu kembaran; yang melihat cuma manusia/agent yang membaca keduanya. Satu dipilih, satunya DIHAPUS.
- Auto-merge bersih ≠ benar: satu sisi mencabut `import ambilSemua`, sisi lain menambah pemakaian `ambilSemua` BARU di berkas yang sama pada baris berbeda. Nol konflik, TS2304 di gerbang push.
- Catatan tempel-belakang (`.claude/ilmu-agent/*.md`, `jejak/*.jsonl`) harus digabung UNION + urut waktu, jangan pilih-sisi — pilih-sisi membuang entri peer secara diam-diam.
- Ada proses hook yang ikut menulis `.git/index` dan meresolusi konflik sendiri sementara sesi bekerja: `git show :2:`/`:3:` bisa mendadak kosong, dan `.git/index.lock` muncul-hilang. Jangan menulis berkas berdasar hasil baca stage tanpa assert isinya tidak kosong.

**Why:** Stop hook tiap sesi commit+push `main` sendiri-sendiri; MCP Supabase menulis ke remote yang SAMA seketika, jadi DB bentrok duluan sebelum git sempat bentrok. Dan karena tiap sesi menunda push sampai gerbangnya hijau, utangnya menumpuk sampai rebase-nya sendiri jadi pekerjaan berisiko.

**How to apply:** sebelum membuat/mengubah fungsi DB, migrasi, atau komponen bersama: `ListAgents` untuk peer, lalu cek remote `supabase_migrations.schema_migrations` hari ini + `pg_proc` untuk nama yang sama. Koordinasi lewat SendMessage ke nama peer; sepakati siapa push duluan dan niat mana yang wajib bertahan saat rebase. Sebelum git apa pun: cek `.git/rebase-merge`. Sesudah rebase: JANGAN anggap selesai sebelum gerbang pre-push hijau — auto-merge yang bersih rutin melahirkan simbol yatim. Lihat juga [[mesin-24-jam-mac-mini]].
