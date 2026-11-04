@RTK.md

## Standar pemilik: rujukan, bukan bacaan tiap sesi

Empat berkas di bawah adalah aturan pemilik yang berlaku di SEMUA proyek.
Ketiganya sengaja **TIDAK di-@import**: isinya narasi panjang berikut insiden
yang melahirkannya, dan itu bacaan saat mengerjakan hal itu, bukan prefiks yang
dibayar ulang tiap giliran sepanjang hari.

Yang menahan aturannya bukan berkasnya termuat, melainkan **gerbang mekanisnya**
(prinsip "aturan tanpa gerbang mekanis dianggap belum jadi"). Baca berkasnya
begitu tugasnya menyentuh barisnya:

| Baca ini | Saat tugasnya | Gerbang yang menahannya |
| -------- | ------------- | ----------------------- |
| `~/.claude/DUMMY.md` | bikin/benerin tombol isi data dummy, layar kosong padahal tombolnya melapor sukses, tabel baru yang dibaca layar bertombol dummy | `gerbang-dummy`, `gerbang-dummy-layar`, `tests/e2e/05-dummy-jejak.sql` |
| `~/.claude/INP.md` | klik/tab/paginasi/sort yang membekukan layar, overlay INP muncul, kontrol berchrome baru | `gerbang-inp-transisi`, agent `inp-reviewer`, skill `inp-sweep` |
| `~/.claude/TEST.md` | trigger/constraint/RLS/fungsi SQL/route handler/alur lintas-tabel baru, atau mau menulis unit test bermock sebagai bukti | `gerbang-test-integrasi`, registri `tests/e2e/cakupan.json` |
| `~/.claude/FITUR.md` | proyek baru, modul besar, atau menilai "apa yang belum ada" | katalog fitur, bukan aturan |
| `~/.claude/WEBSITE.md` | bikin website/app/landing baru, menilai "siap rilis", atau butuh selera desain pemilik | checklist siap rilis di berkasnya; rujukan `~/.claude/referensi/` |
| `~/.claude/AGEN.md` | proyek/repo GitHub baru, atau repo yang sub-agentnya jalan di Opus | hook `armada-agent-proyek.mjs` (SessionStart), env `CLAUDE_CODE_SUBAGENT_MODEL`, `gerbang-model-agent` + `gerbang-ilmu-agent` |

**Empat kalimat yang tidak boleh hilang walau berkasnya tidak dibuka**, karena
keempatnya menentukan apakah berkasnya perlu dibuka sama sekali:

1. **Tiap website yang dibangun wajib punya tombol isi data dummy sejak awal**,
   dua ikon, Super Admin saja, isinya ditentukan HALAMAN yang sedang dibuka.
2. **Klik tidak boleh membekukan layar**, dan membungkus SELURUH setState dalam
   transition BUKAN obatnya: chrome kontrolnya urgent, subtree beratnya deferred.
3. **Tiap perilaku yang tinggal di luar TypeScript wajib punya uji integrasi
   yang benar-benar menjalankannya.** Mock meloloskan persis kelas bug yang
   paling mahal.
4. **Tiap proyek baru dipasangi armada agent sejak hari pertama**: roster,
   agent bermodel (pengerja Sonnet, pemeriksa pola Haiku), ilmu per agent,
   `AGENTS.md`. Sub-agent tanpa model tertulis diam-diam ikut Opus.

5. **Tiap website/app/landing yang dibangun mengikuti `WEBSITE.md`**: selera
   pemilik, checklist siap rilis, stack, modul, galeri. Hook
   `pengingat-website.mjs` mengingatkan saat prompt menyebutnya.

Ragu salah satu ketiganya kena? Buka berkasnya. Itu lebih murah daripada
memuat tiga-tiganya tiap sesi seharian.

# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.
