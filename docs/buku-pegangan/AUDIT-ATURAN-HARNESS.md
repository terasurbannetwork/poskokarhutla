# Audit memory → aturan dan harness (30 Okt 2026)

Tujuan: aturan pemilik ditahan mesin (gerbang uji, hook), bukan diingat model.
Sumber: 61 berkas di memory proyek (135 KB, indeks 9,3 KB dimuat tiap sesi),
`tests/**`, `.claude/settings.json`, `~/.claude/settings.json`.
Belum ada yang diubah.

## 1. Temuan utama

1. **Aturan selera layar paling sering dilanggar dan tidak punya gerbang.**
   Hitungan di `public/**` (html/js/css, tanpa `public/**/data`):

   | Aturan memory                  | Berkas yang melanggar | Gerbang sekarang                         |
   | ------------------------------ | --------------------- | ---------------------------------------- |
   | tanpa "·" (tanpa-titik-tengah) | 154                   | cuma `tests/bnpb/kartu`, `tests/bnpb/layar` |
   | tanpa em dash (A-16 Okt)       | 67                    | cuma `tests/bnpb/*`                      |
   | tanpa `cursor:help`            | 3                     | tidak ada                                |
   | tanpa "9 provinsi prioritas"   | 3                     | tidak ada                                |
   | kepala situs wajib             | 9 dari 34 html        | tidak ada                                |
   | tabel rata tengah              | 103 aturan, 45 berkas | `gerbang-tabel-rata` (30 Okt, hijau)     |
   | paragraf justify               | belum dihitung        | tidak ada                                |

   Sebagian "·" dan em dash ada di komentar kode, jadi angkanya batas atas.
   Gerbangnya cukup memindai teks yang tampil saja.

2. **Aturan saling bertentangan, dan tidak ada yang tahu mana yang menang.**
   - Perataan tabel (**DIPUTUS 30 Okt**: header tengah, kolom label kiri, kolom
     lain termasuk angka tengah; gerbang `tests/agen/gerbang-tabel-rata.test.mjs`,
     103 aturan CSS di 45 berkas dibetulkan). Sebelumnya: `gaya-kartu-insight` (13 Okt) bilang kolom teks rata kiri,
     `aturan-berulang` (29 Okt) bilang header DAN isi rata tengah,
     `ekspor-pdf-pangantara` bilang header tengah dan angka rata kanan,
     `ppt-tabel-dan-cutoff` bilang kolom label kiri dan sisanya tengah,
     `selera-deck-malaysia` bilang kolom teks kiri. Ini harus diputus
     pemilik dulu sebelum dijadikan gerbang.
   - Worktree: `AGENTS.md §3.3` menyuruh `isolation: "worktree"`, sedangkan
     `hanya-main` melarangnya. Model membaca AGENTS.md lebih dulu (dimuat
     penuh), jadi larangannya kalah.
   - Lokasi repo: `icloud-documents` bilang kerja dari `~/Developer/poskokarhutla`,
     padahal sesi berjalan di `~/Documents/GitHub/poskokarhutla`.

3. **Aturan proses cuma ada di memory, padahal bisa dipasang sebagai hook.**
   Proyek ini cuma punya satu hook (`prompt-catat`). Hook global yang ada
   adalah rtk, block-heavy-tests, gerbang mbg, caveman/ponytail. Tidak ada
   satu pun yang menahan: `git stash`, worktree/branch, `git add -A`,
   laporan "tayang" sebelum `terbit.yml` hijau, atau suntingan berkas yang
   dikunci J4.

4. **Hampir separuh memory berisi snapshot status yang cepat basi.**
   Ada 22 berkas. Contohnya "prod di migrasi 0035" atau "migrasi 0047-0049
   pending", padahal `migrasi_beku` dan `wrangler d1 migrations list` adalah
   sumber yang benar. Model bisa mengambil keputusan dari angka lama.

5. **Selera PPT tercatat di empat tempat**: memory (10 berkas),
   `keputusan-pemilik.md`, `selera-pemilik.md`, dan buku pegangan. Padahal
   `selera-ppt-final` sendiri sudah memutuskan cuma dua tempat. Delapan
   berkas memory PPT adalah salinan yang bisa melenceng.

6. **Higiene indeks.** `bahasa-lugas.md` tidak masuk indeks. `bagian-dalam-kartu`
   tercatat dua kali. Ada tautan mati (`[[poskokarhutla-preview]]`,
   `[[ppt-navigasi-deck]]`). `fitur-disembunyikan` berukuran 17 KB, padahal
   isinya ledger repo.

7. **Ada gerbang yang bolong.** `gerbang-ilmu-agent` cuma membaca berkas
   yang sudah di-track (lihat `kendali-mutu`), jadi berkas baru lolos kalau
   uji dijalankan sebelum `git add`.

## 2. Klasifikasi per berkas

Kunci tindakan:
- **G**: jadikan gerbang uji.
- **H**: jadikan hook.
- **S**: sudah ada di skill atau referensi, hapus dari memory.
- **D**: pindah ke docs/STATUS/TIKET repo, lalu hapus dari memory.
- **B**: basi, hapus.
- **M**: tetap di memory.
- **✓**: gerbangnya sudah ada.

| Berkas | Tindakan | Catatan |
| --- | --- | --- |
| aturan-berulang | G + M | gerbang: em dash, `cursor:help`, "Anda", latar abu gelap, bagikan = ikon. Sisanya (kepadatan, ringkas) tetap M |
| tanpa-titik-tengah | G | pindai teks tampil di semua `public/**`, bukan cuma bnpb |
| tanpa-pantau-bencana | G | grep `public/**`, `docs/**`, keluaran deck. `gdo.json` label "Deteksi Pantau Bencana" ikut tampil? |
| kepala-situs-wajib | G | tiap `public/**/*.html` memuat `kepala.css` + `header.top`. Sekarang 9 html bolong |
| gaya-kartu-insight | G + M | gerbang: "9 provinsi prioritas", `<select>` native, singkatan "rb", ISO mentah. Perataan tabel menunggu keputusan |
| selera-teks-grafik | G | CSS paragraf `justify`. Grafik interaktif: uji layar hover |
| deretan-pilihan-ujung-ke-ujung | ✓ → G | `direktori-seg.test` cuma /direktori, perluas ke semua halaman |
| bagian-dalam-kartu | G + M | uji layar: section profil berada di dalam `.kartu`. Hapus entri indeks yang dobel |
| ekspor-pdf-pangantara | G + M | header PDF/XLSX rata tengah |
| direktori-tanpa-kasus-kpk | G | daftar cegah dalam bentuk hash (repo publik), uji tokoh/graf/vendor bebas daftar itu |
| direktori-semua-terhubung | ✓ | `hubung.test`. Pindah ke ilmu-agent, hapus |
| kita-bnpb | ✓ + S | `hubung.test strategis()`. Bagian deck masuk keputusan-pemilik |
| panel-bencana-direktori | G | uji: `BENCANA_VIEW` satu-satunya aturan tampil panel |
| kekeringan-hipotesis | G | uji: tiap angka turunan status kekeringan membawa pil hipotesis |
| keyakinan-rendah-drone-gambut | G + D | uji `KEYAKINAN_MIN = 0` dan luas/kluster tetap n/h |
| plug-and-play | G (sebagian ✓ `gerbang-inti`) | uji: tidak ada CSS/JS kembar lintas modul bencana |
| d1-kuota-baca | ✓? | cek apakah `gerbang-anggaran-cf` menghitung baca D1 per cron. Kalau belum, tambah |
| hanya-main | H | PreToolUse: tolak `isolation:"worktree"`, `git checkout -b`, `git switch -c`, push ke selain main. Ubah AGENTS.md §3.3 |
| autostash-bentrok | H | PreToolUse Bash: tolak `git stash` dan `pull --rebase --autostash` |
| icloud-documents | H + keputusan | tolak `git add -A` / `git add .`. Pemilik putuskan ~/Documents atau ~/Developer |
| terbit-gagal | H | Stop/PostToolUse setelah `git push`: wajib `npm run cek:tayang` (terbit.yml + aset live + /api/status) |
| genangan-jakarta-j3-j4 | H | PreToolUse Edit di berkas sidik J4: peringatan + `kunci_j4.py cek` |
| buku-pegangan-inisiatif | H | UserPromptSubmit: prompt berisi "catat/catet" memicu pengingat tulis ke buku pegangan + keputusan-pemilik |
| kendali-mutu | M + G | perbaiki `gerbang-ilmu-agent` supaya ikut baca untracked. Fakta token tanpa `workflow` tetap M |
| gas-menyapu | M | fakta perilaku pemilik, tidak bisa di-hook |
| hemat-token-model | ✓ | `gerbang-model-agent` + `HEMAT-TOKEN.md`. Hapus |
| karhutla-data-sistem | S + M | masuk gerbang provenance angka di ppt-konsultan |
| bahasa-lugas | S | sudah di `bahasa.py`. Belum masuk indeks |
| ppt-keputusan-selera, ppt-tabel-dan-cutoff, ppt-gaya-kajian-bnpb, ppt-audiens-asing, selera-deck-malaysia, ppt-format-lembaga, ppt-merek-bnpb, deck-urgen-kerjakan-di-berkas, aturan-deck-26-okt-rinci | S | sudah ada di keputusan-pemilik/periksa.py. Hapus, sisakan `selera-ppt-final` sebagai penunjuk |
| ppt-konsultan | S + M | penunjuk ke skill saja |
| selera-ppt-final | M | contoh bentuk memory yang benar: cuma penunjuk |
| dossier-lapangan | S | pindah ke README builder dossier |
| laporan-harian-bnpb, penanganan-generator-offline, buku-pegangan-rujukan, stop-hook-global | M (rujukan) | lokasi mesin dan cara jalan |
| fitur-disembunyikan | D | 17 KB, pindah ke `docs/FITUR-DISEMBUNYIKAN.md` |
| dua-worker | D + B | sudah selesai. Sisakan satu baris: "tayang dicek di centurisk97.id" |
| api-padam, program-15-jam, rencana-lanjut, multi-bencana-tugas, banjir-paritas-27-okt, sippa-program-61, ruang-bnpb, ruang-instansi, pendataan-satu-data, uji-pilot-web, panel-presiden, direktori-akademisi, direktori-data-strategis, grand-design-kampus, peluang-bisnis-data | D | status, to-do pemilik, dan backlog dipindah ke `docs/bnpb/STATUS.md` / TIKET. Keputusan pemilik yang berupa aturan disuling ke ilmu-agent |
| ruang-bnpb (bagian "grep pass/fail") | G | uji layar dinilai dari exit code, bukan grep |

Total: 61 berkas.
- G: 17 (2 di antaranya perluasan gerbang yang sudah ada)
- H: 7
- ✓/S: 16
- D: 17
- M murni: sekitar 7

## 3. Bentuk memory setelah dirapikan

Memory cuma berisi tiga hal:
1. fakta tentang pemilik dan cara kerjanya;
2. penunjuk ke rujukan (mesin deck, buku pegangan);
3. selera yang tidak bisa diukur mesin (kepadatan, nada).

Tiap aturan yang bisa dicek pindah ke gerbang, lalu memory-nya dihapus,
atau disisakan satu baris "gerbang: <berkas uji>".

Perkiraan: 61 berkas jadi sekitar 12, indeks 9,3 KB jadi sekitar 2 KB.

## 4. Urutan kerja yang disarankan

1. Pemilik memutus pertentangan: ~~perataan tabel~~ (selesai 30 Okt), lokasi repo
   (~/Documents atau ~/Developer), dan AGENTS.md §3.3 soal worktree.
2. Hook proses (H). Murah, dan langsung mencegah insiden yang paling mahal
   (stash, branch, tayang palsu).
3. Gerbang teks layar dalam satu berkas `tests/agen/gerbang-selera-layar.test.mjs`:
   "·", em dash, "Pantau Bencana", `cursor:help`, "9 provinsi prioritas",
   kepala situs. Pelanggaran yang sudah ada dibetulkan di commit yang sama,
   tanpa daftar kecualian.
4. Pindahkan snapshot status (D) ke docs, lalu pangkas memory.
5. Gerbang sisanya (KPK, hipotesis kekeringan, J4, PDF).
