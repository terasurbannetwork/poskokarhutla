# TIKET SIPPA: daftar kerja berurutan

Versi 1, 25 Oktober 2026. Daftar lengkap tiket untuk membangun seluruh SIPPA: tugas P0 pilot, aplikasi web `/pipa`, pipeline data, buku kajian, deck, dokumen program, commit, dan deploy. Satu sesi mengambil satu tiket, mengerjakan hanya cakupannya, lalu menandai statusnya di §2.

Urutan otoritas (AGENTS.md §2.1): `KEPUTUSAN-SIPPA.md` > `PRD.md` > `DESIGN-SYSTEM.md` > `DESAIN-TEKNIS.md` > `KERANGKA-BUKU.md` > `RENCANA-UJI.md` > berkas ini. Berkas ini hanya mengatur urutan, pembagian kerja, dan bukti selesai; isi teknis tetap di dokumen di atasnya. Bila tiket bertentangan dengan dokumen di atasnya, dokumen di atasnya menang dan tiket diperbaiki lebih dulu oleh sesi induk.

Keempat dokumen saudara (`DESIGN-SYSTEM.md`, `DESAIN-TEKNIS.md`, `KERANGKA-BUKU.md`, `RENCANA-UJI.md`) ditulis paralel dengan berkas ini. Rujukan ke dokumen itu ditulis menurut nama bagian (mis. "DESAIN-TEKNIS.md bagian skema D1"), bukan nomor, sampai nomornya tetap; sesi induk menyelaraskan nomor setelah keempatnya selesai (lihat §10).

Singkatan: PRD = `PRD.md`; DS = `DESIGN-SYSTEM.md`; DT = `DESAIN-TEKNIS.md`; KB = `KERANGKA-BUKU.md`; RU = `RENCANA-UJI.md`; `kajian/` = `data/kajian-bnpb/`.

---

> **Untuk pekerja agen:** tiket dieksekusi satu per satu dengan pola superpowers:subagent-driven-development yang disesuaikan ke AGENTS.md (AGENTS.md menang bila bertentangan; lihat §1.1). Langkah memakai kotak centang (`- [ ]`).

**Tujuan:** SIPPA siap pilot 27 Okt 2026, siap dipakai operasi banjir Nov–Des 2026, web `/pipa` lengkap di produksi dan buku serta deck versi serah paling lambat 6 Des 2026.

**Arsitektur:** aplikasi staf vanilla JS tanpa build step di `public/pipa/**` (kode dan teks saja, tanpa data), dilayani Cloudflare Worker (`src/sippa.js`) di balik sesi admin/staf, data operasi di D1 (`sippa_*`, migrasi 0055–0057), data turunan dari skrip Python stdlib di `scripts/data/sippa/` lewat R2 `sippa/`; buku dibangun pipeline `data/kajian-bnpb/bangun/` dari naskah Markdown bertoken angka.

**Teknologi:** Cloudflare Worker + D1 + R2, Miniflare 3 untuk uji, `node:test`, Python 3.12 stdlib, MapLibre/jsPDF/Roboto (sudah divendor), qrcode-generator dan three 0.169.0 (divendor baru), python-docx/pptx di `.venv` kajian.

**Spesifikasi:** `KEPUTUSAN-SIPPA.md` (menang), `PRD.md`, lalu DS, DT, KB, RU di folder ini.

## 0. Batasan global (berlaku untuk setiap tiket, nilai disalin persis)

| Batasan | Nilai |
| --- | --- |
| Rute halaman / rute API | `/pipa` dan `/pipa/:layar` dengan `LAYAR_SIPPA = ["peta","hitung","pemicu","kit","log","ab","studio","3d","telemetri","laporan","data"]`; API `/api/sippa/*`; awalan `/api/pipa/*` milik `src/pipa.js` tidak disentuh |
| Akses | hanya staf BNPB: admin (`adminOK`) atau staf berperan `pusdalops`, `koordalops` (tulis) dan `pimpinan` (baca); satu-satunya pintu tanpa akun `/pipa/lapangan` dengan kode penugasan 26 heks di header `x-kode`, kedaluwarsa ≤ 30 hari, hanya sha256 disimpan |
| Data | tidak ada data SIPPA di `public/`; data turunan hanya lewat `GET /api/sippa/data/:nama` bersesi |
| Migrasi | `0055_sippa_inti.sql`, `0056_sippa_ab_skenario.sql`, `0057_sippa_telemetri.sql`; idempoten; tidak disunting setelah diterapkan; tiap tabel punya kolom `dummy` |
| Batas injeksi | kedalaman lance 0–5 m; > 5 m ditolak di semua masukan (kalkulator, Studio, 3D, form, CHECK D1 `kedalaman_cm` ≤ 500); 3–5 m berpil "lengan uji" |
| Ambang zona | air ≤ 2,5 km, jalan ≤ 5 km (keputusan 30) |
| Vonis | hanya NO-GO, HOLD, KONDISIONAL; tidak ada "GO"; skor tidak pernah meluluskan NO-GO |
| Label keyakinan | resmi, terverifikasi, estimasi-model, asumsi-kebijakan, menunggu, hipotesis; tiap angka bersumber dan berwaktu |
| Batas data buku | 23 Okt 2026 23.59 WIB |
| Bahasa dan teks | Bahasa Indonesia saja, sapaan "kamu", tanpa em dash, tanpa titik tengah U+00B7, en dash hanya rentang, "titik panas" untuk data satelit, tanpa "terbukti" untuk SIPPA, angka lewat `fmt` id-ID (tanpa `toFixed` di teks tampil) |
| Identitas | hanya nama dan logo BNPB; alat ditulis sebagai kelas kinerja "atau setara", merek hanya di kolom rujukan datasheet; tanpa nama perusahaan konsesi |
| Pustaka luar | tanpa CDN (CSP `script-src 'self'`); vendor di `public/vendor/` |
| INP dan aksesibilitas | tidak ada interaksi > 200 ms (form lapangan < 100 ms); kerja berat lewat `nanti()` atau Web Worker; WCAG 2.2 AA; target sentuh ≥ 44 px, form lapangan ≥ 56 px |
| Pipeline | Python 3.12 stdlib, self-check `__main__`, tanpa workflow baru (langkah di `data.yml`), tanpa jadwal cron baru (batas 5 jadwal akun Free) |
| Model armada | pengerja sonnet, pemindai haiku, opus hanya sesi induk |

---

## 1. Aturan yang berlaku untuk semua tiket

1. **Gerbang konteks dulu** (AGENTS.md §0): `node scripts/agents/ilmu.mjs pemilik <berkas>`, `node scripts/agents/ilmu.mjs baca <agent>`, lalu ucapkan kontrak CAKUPAN (kolom "Berkas"), DI LUAR (kolom "Di luar"), BUKTI SIAP (kolom "Bukti").
2. **Satu pengerja, satu sampai tiga pemeriksa, pemeriksa tidak pernah pengerja yang sama** (AGENTS.md §1.5, §3.2). Pemeriksa adalah subagent baru berkonteks bersih yang memeriksa sinyal nyata (perintah bukti hijau), bukan klaim. Pemeriksa melapor, tidak membetulkan (AGENTS.md §6); temuan dibetulkan pengerja tiket asal, lalu tiket asal dibuka ulang sampai bukti hijau lagi.
3. **Model** (AGENTS.md §1.3): pengerja `sonnet`; pemindaian berpola (`guard-api`, `migrasi-idempoten`, `higiene-repo`, `selera-angka`, pindai slop, salin berkas) `haiku`; `opus` hanya sesi induk (kontrak, rakitan, keputusan deploy). Tidak ada tiket subagent yang dinaikkan ke opus: tidak ada model risiko baru, dan migrasi 0055–0057 hanya menambah tabel tanpa mengubah tabel yang ada.
4. **Isolasi** (AGENTS.md §3.3): tiket yang menulis dan berjalan bersamaan dengan tiket menulis lain dikerjakan dengan `isolation: "worktree"`. Tiket baca saja (pemeriksa) dan tiket sesi induk tidak memakai worktree. Paling banyak 4–5 pengerja menulis bersamaan.
5. **Batas mati** (AGENTS.md §9): subagent tidak commit, tidak push, tidak `wrangler deploy`, tidak melonggarkan gerbang, tidak menyunting berkas `* 2.*` (mis. `migrations/0053_kontak 2.sql` yang sudah ada), tidak menaruh secret di berkas terlacak. Commit dan deploy hanya di tiket bertanda **[induk]**.
6. **Prompt subagent** memuat baris: "You are a subagent. Don't run memo. Do not commit, push, or deploy." dan menyebut berkas/glob, bukan domain.
7. **Uji mengikuti letak logika** (`~/.claude/TEST.md`): fungsi murni = unit; CHECK, trigger, PK D1 = integrasi Miniflare dengan migrasi apa adanya; rute = panggil handler worker; alur lintas-tabel = satu uji ujung ke ujung. Tiap uji membuktikan yang salah DITOLAK. Tiap rute dan tabel baru masuk `tests/warga/cakupan.json` (`diuji` atau `dikecualikan` beralasan); `antre` tidak bertambah.
8. **Larangan keputusan 50** berlaku di tiap tiket: tanpa "terbukti" untuk SIPPA, tanpa angka tanpa sumber, tanpa jaringan permanen nasional, tanpa pembelian massal sebelum G5, tanpa injeksi > 5 m, tanpa nama atau logo selain BNPB. Teks: Bahasa Indonesia, tanpa em dash, tanpa titik tengah, en dash hanya rentang.
9. **Selesai berarti**: kolom "Bukti" dijalankan dan hijau, pemeriksa tanpa temuan kritis terbuka, status di §2 diubah ke `selesai` oleh sesi induk saat commit.

### 1.1 Prosedur eksekusi standar (pola subagent-driven-development, disesuaikan ke AGENTS.md)

Penyesuaian yang mengikuti AGENTS.md karena lebih kuat dari skill: implementer TIDAK commit (commit hanya di tiket [induk], `git commit -- <berkas>`, tanpa `git add`); beberapa implementer BOLEH berjalan paralel asal masing-masing di worktree (AGENTS.md §3.3, paling banyak 4–5); pemeriksa dipilih dari agent pemeriksa repo, bukan templat umum.

Sesi induk, per tiket:

- [ ] Ambil ringkasan tiket ke berkas (tiket ini memakai judul `#### SP-NNN`, jadi skrip `task-brief` diganti satu baris): `mkdir -p .superpowers/sdd/TIKET && awk -v id=SP-NNN '/^#### SP-/{p=($2==id)} /^##+ [0-9]/{p=0} p' data/kajian-bnpb/pipa/TIKET.md > .superpowers/sdd/TIKET/SP-NNN-brief.md`
- [ ] Catat BASE (`git rev-parse HEAD` di worktree tiket) di buku besar `.superpowers/sdd/TIKET/progress.md` (baris pertama: `# SDD ledger: plan data/kajian-bnpb/pipa/TIKET.md`). Tiket bertanda `SP-NNN: complete` di buku besar tidak dikirim ulang.
- [ ] Kirim implementer (agent pengerja tiket, model tiket) dengan: satu baris posisi tiket; jalur ringkasan ("baca ini dulu; nilai di dalamnya dipakai persis"); antarmuka dari tiket hulu yang sudah selesai; putusan sesi induk atas ambiguitas; jalur laporan `.superpowers/sdd/TIKET/SP-NNN-report.md`; baris "You are a subagent. Don't run memo. Do not commit, push, or deploy. Jangan memanggil subagent lain." Riwayat tiket lain tidak ditempel.
- [ ] Implementer bekerja TDD untuk logika non-sepele: tulis uji yang gagal, jalankan dan lihat gagal karena alasan yang benar, tulis kode minimal, jalankan sampai hijau, jalankan perintah "Bukti" tiket, tulis laporan (status DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED, berkas berubah, keluaran perintah bukti, keraguan). Uji membuktikan yang salah ditolak (§1 butir 7).
- [ ] Paket tinjauan: `git -C <worktree> diff BASE --stat` dan `git -C <worktree> diff -U10 BASE` ke `.superpowers/sdd/TIKET/SP-NNN-review.md`; kirim pemeriksa tiket (konteks bersih) dengan ringkasan, laporan, paket, dan tabel §0. Vonis wajib dua: sesuai spesifikasi dan mutu.
- [ ] Putaran perbaikan paling banyak 5: putaran 1–3 implementer yang sama; 4–5 implementer baru setingkat lebih tinggi (haiku → sonnet; sonnet tetap sonnet dengan pengerja berbeda, karena opus hanya sesi induk). Tiap putaran diakhiri tinjauan ulang terbatas pada diff perbaikan. Temuan kecil dicatat `SP-NNN: minor (ditunda): ...`.
- [ ] Temuan yang bertentangan dengan dokumen otoritas atau tiket diputus sesi induk dan dicatat `Ruling: <putusan> | <alasan> | <biaya bila salah>`; bila putusan menyentuh arah produk, tanya pemilik (AGENTS.md §2.1 menang atas aturan skill "jangan berhenti").
- [ ] Selesai: `SP-NNN: complete (worktree <nama>, tinjauan bersih)` di buku besar, status di §2 jadi `tinjau`; status `selesai` diberikan tiket commit [induk].
- [ ] Akhir tiap rilis (SP-039, SP-047, SP-057, SP-080): tinjauan menyeluruh atas seluruh rentang rilis, satu gelombang perbaikan, satu tinjauan ulang; semua baris `Ruling:` dilaporkan ke pemilik.

Ukuran: **S** kurang dari setengah hari sesi, **M** sekitar satu hari, **L** lebih dari satu hari atau perlu dipecah per sub-langkah.

---

## 2. Indeks dan papan status

Urutan baris = urutan pengambilan yang disarankan. Gelombang: lihat §5. Status: `belum`, `jalan`, `tinjau`, `selesai`, `tertahan` (sebut penghambatnya).

| ID | Judul | Pengerja | Gel. | Ukuran | Status |
| --- | --- | --- | --- | --- | --- |
| SP-001 | Persetujuan PRD, jawaban T-B dan T-C | pemilik | 0 | S | belum |
| SP-002 | Kontrak dan rakitan armada | sesi induk | 0 | S | belum |
| SP-003 | Agent baru `sippa`, pemilik berkas, skrip `uji:sippa` | `mekanik-mesin` | 1 | S | belum |
| SP-004 | Mesin buku menerima kajian `sippa` | `pipa-data` | 1 | M | belum |
| SP-005 | Workflow naskah dan rakit bercabang `sippa` | `mekanik-mesin` | 2 | S | belum |
| SP-006 | Migrasi 0055 SIPPA inti dan uji skema | `warga-api` | 1 | M | belum |
| SP-007 | Daftar medan formulir lapangan | `sippa` | 2 | S | belum |
| SP-008 | Worker SIPPA P0: cangkang, gerbang host, rute kit, tugas, lapangan, log | `warga-api` | 3 | L | belum |
| SP-009 | Formulir kertas G3-lite dan probe | `pipa-data` | 3 | S | belum |
| SP-010 | Cangkang klien `/pipa`, keadaan, tema, hitung inti, layar Log | `sippa` | 3 | M | belum |
| SP-011 | Layar Lapangan luring dan antrean | `sippa` | 4 | M | belum |
| SP-012 | Layar Kit: daftar, rincian, tugaskan, QR | `sippa` | 4 | M | belum |
| SP-013 | Vendor QR dan scope `sw-lapangan.js` | `layar-peta` | 2 | S | belum |
| SP-014 | Gerbang SIPPA awal | `sippa` | 4 | S | belum |
| SP-015 | Tinjauan P0 | pemeriksa | 5 | S | belum |
| SP-016 | [induk] Commit P0 | sesi induk | 5 | S | belum |
| SP-017 | [induk] Deploy P0, uji asap, kit SIPPA-001, kode regu pilot | sesi induk | 5 | S | belum |
| SP-018 | [induk] Pilot lapangan dan entri formulir kertas | sesi induk + lapangan | 6 | M | belum |
| SP-019 | Kembar Python `hidraulika.py` dan `respons.py` | `pipa-data` | 5 | M | belum |
| SP-020 | `sel22.py` kekerapan sel 2,2 km | `pipa-data` | 1 | S | belum |
| SP-021 | `zona.py` kelayakan kompleks, sel, ringkasan zona | `pipa-data` | 2 | M | belum |
| SP-022 | `nasional.py` kit per provinsi | `pipa-data` | 4 | S | belum |
| SP-023 | `pemicu.py` tingkat pemicu harian | `pipa-data` | 3 | S | belum |
| SP-024 | Tinjauan zona, pemicu, respons | `validasi-model` | 6 | S | belum |
| SP-025 | Langkah `data.yml` dan unggah R2 `sippa/` | `mekanik-mesin` | 5 | S | belum |
| SP-026 | Uji kembar JS dan Python | `sippa` | 7 | S | belum |
| SP-027 | Matriks jarak gudang dan pelengkapan `akses.json` | `pipa-data` | 10 | M | belum |
| SP-028 | Calon AOI 2027 `aoi_calon.json` | `pipa-data` | 16 | S | belum |
| SP-029 | Rute data, ringkas, cek jalan, usul AOI | `warga-api` | 6 | M | belum |
| SP-030 | `hitung.js` lengkap dan `batas.js` | `sippa` | 6 | M | belum |
| SP-031 | Layar Ringkas dan Data | `sippa` | 7 | M | belum |
| SP-032 | Layar Peta kelayakan dan saran sarana | `sippa` | 7 | L | belum |
| SP-033 | Layar Hitung | `sippa` | 7 | M | belum |
| SP-034 | Migrasi 0056 A/B, skenario, laporan dan uji skema | `warga-api` | 6 | S | belum |
| SP-035 | Rute A/B, skenario, laporan | `warga-api` | 7 | M | belum |
| SP-036 | Layar A/B | `sippa` | 8 | M | belum |
| SP-037 | Layar Laporan dan templat Laporan pilot | `sippa` | 8 | M | belum |
| SP-038 | Tinjauan R1 | pemeriksa | 9 | S | belum |
| SP-039 | [induk] Commit dan deploy R1 | sesi induk | 9 | S | belum |
| SP-040 | Salin sumber Studio pemilik ke repo | `pipa-data` | 8 | S | belum |
| SP-041 | Mesin Studio dan `gerbangSippa` | `sippa` | 10 | M | belum |
| SP-042 | Layar Studio, Web Worker, simpan skenario | `sippa` | 11 | L | belum |
| SP-043 | Layar Pemicu dan rencana pra-posisi | `sippa` | 10 | M | belum |
| SP-044 | Templat laporan kejadian, mingguan, musim, skenario | `sippa` | 11 | M | belum |
| SP-045 | Pengingat mingguan SIPPA di Meja Pantau | `warga-api` | 12 | S | belum |
| SP-046 | Tinjauan R2 | pemeriksa | 12 | S | belum |
| SP-047 | [induk] Commit dan deploy R2 | sesi induk | 12 | S | belum |
| SP-048 | Vendor three 0.169.0 | `layar-peta` | 10 | S | belum |
| SP-049 | Layar 3D | `sippa` | 13 | L | belum |
| SP-050 | Migrasi 0057 dan rute telemetri, alarm, ringkas harian | `warga-api` | 12 | M | belum |
| SP-051 | Layar Telemetri | `sippa` | 13 | S | belum |
| SP-052 | Rantai dummy semua layar | `warga-api` | 14 | M | belum |
| SP-053 | Tombol isi dan hapus dummy di semua layar | `sippa` | 14 | S | belum |
| SP-054 | Uji alur lintas-tabel | `warga-api` | 14 | M | belum |
| SP-055 | Gerbang SIPPA lengkap, aksesibilitas, tema gelap, ponsel | `sippa` | 14 | M | belum |
| SP-056 | Tinjauan penuh rilis lengkap | pemeriksa | 15 | M | belum |
| SP-057 | [induk] Commit dan deploy R3 (rilis lengkap) | sesi induk | 15 | S | belum |
| SP-058 | Berkas bukti bab 1–5 | penulis (`general-purpose`) | 6 | M | belum |
| SP-059 | Berkas bukti bab 6–10 | penulis (`general-purpose`) | 8 | M | belum |
| SP-060 | Berkas bukti bab 11–15 | penulis (`general-purpose`) | 8 | M | belum |
| SP-061 | Pustaka dicek ke naskah asli | penulis riset (`general-purpose`) | 9 | M | belum |
| SP-062 | Tabel harga dan `sippa_keuangan.py` | `pipa-data` | 6 | M | belum |
| SP-063 | Registri angka `sippa_angka.py` | `pipa-data` | 9 | M | belum |
| SP-064 | Gambar peta dan grafik buku | `pipa-data` | 10 | M | belum |
| SP-065 | Gambar teknik SIPPA-G-01 s.d. G-06 | `pipa-data` | 5 | L | belum |
| SP-066 | Gambar teknik SIPPA-G-07 s.d. G-12 | `pipa-data` | 9 | L | belum |
| SP-067 | Surat permintaan data (Lampiran C) | penulis (`general-purpose`) | 9 | M | belum |
| SP-068 | Naskah bab 1–4 | penulis (`general-purpose`) | 11 | L | belum |
| SP-069 | Naskah bab 5–8 | penulis (`general-purpose`) | 11 | L | belum |
| SP-070 | Naskah bab 9–12 | penulis (`general-purpose`) | 11 | L | belum |
| SP-071 | Naskah bab 13–15 | penulis (`general-purpose`) | 12 | M | belum |
| SP-072 | Bab 11: hasil pilot dari D1 | penulis (`general-purpose`) | 12 | S | belum |
| SP-073 | Lampiran A, B, E–K | penulis (`general-purpose`) | 12 | L | belum |
| SP-074 | Bagian depan dan Ringkasan Eksekutif | penulis (`general-purpose`) | 13 | M | belum |
| SP-075 | Sunting substansi | penyunting (`general-purpose`) | 13 | M | belum |
| SP-076 | Sunting bahasa dan anti-slop | penyunting (`general-purpose`) | 14 | M | belum |
| SP-077 | Bangun DOCX dan PDF | `pipa-data` | 15 | M | belum |
| SP-078 | Spek deck dan bangun PPTX dan PDF | `pipa-data` | 15 | M | belum |
| SP-079 | QA lima lapis dan proofread render | pemeriksa | 15 | M | belum |
| SP-080 | [induk] Commit dan serah buku dan deck | sesi induk | 15 | S | belum |
| SP-081 | [induk] Operasi banjir Nov–Des 2026 | sesi induk + lapangan | 7–18 | M | belum |
| SP-082 | Protokol A/B pra-registrasi dan KAK pilot 2027 | penulis (`general-purpose`) | 17 | M | belum |
| SP-083 | Rekap 2026 dan errata angka | penulis (`general-purpose`) | 18 | S | belum |
| SP-084 | [induk] Penyelarasan dokumen saudara dan penutupan | sesi induk | 0 dan 18 | S | belum |

Jumlah: 84 tiket.

---

## 3. Tiket

Bentuk tiap tiket: **Tujuan**; **Berkas** (path persis; hanya ini yang boleh disentuh); **Di luar**; **Pengerja / pemeriksa**; **Model**; **Dependensi**; **Paralel dengan**; **Isolasi**; **Selesai bila**; **Bukti**; **Rujukan**; **Ukuran**.

### 3.A Fondasi (25 Okt)

#### SP-001 Persetujuan PRD, jawaban T-B dan T-C
- **Tujuan:** pemilik menyetujui PRD dan menjawab T-B (lokasi, tanggal, alat pilot) dan T-C (pemilik pompa, penanda tangan pinjam pakai). Tanpa jawaban, bawaan PRD §2.2 dipakai.
- **Berkas:** tidak ada (catatan sesi); jawaban dicatat sesi induk di `data/kajian-bnpb/pipa/KEPUTUSAN-SIPPA.md` hanya bila pemilik memintanya.
- **Di luar:** T-A, T-D sampai T-I (lihat §7).
- **Pengerja / pemeriksa:** pemilik / sesi induk.
- **Model:** tidak berlaku.
- **Dependensi:** tidak ada. **Paralel dengan:** SP-002. **Isolasi:** tidak.
- **Selesai bila:** pemilik menyatakan setuju di sesi; T-B dan T-C terjawab atau bawaan diterima.
- **Bukti:** catatan sesi.
- **Rujukan:** PRD §2.2, §4.1 minggu 43, §10.1 P0-01. **Ukuran:** S

#### SP-002 Kontrak dan rakitan armada
- **Tujuan:** sesi induk menetapkan rakitan (pengerja dan pemeriksa per tiket), memastikan keempat dokumen saudara tersedia atau menetapkan bagian mana yang boleh dikerjakan sebelum dokumen itu selesai, dan mencatat rakitan.
- **Berkas:** `.claude/ilmu-agent/orkestrator.md` (lewat `node scripts/agents/ilmu.mjs kasus orkestrator "..."`).
- **Di luar:** menulis kode.
- **Pengerja / pemeriksa:** sesi induk / pemilik (membaca rakitan).
- **Model:** opus (kontrak dan trade-off).
- **Dependensi:** SP-001 (boleh berjalan bersamaan bila pemilik belum menjawab; bawaan dipakai). **Paralel dengan:** SP-084 bagian awal. **Isolasi:** tidak.
- **Selesai bila:** rakitan P0 dan gelombang 1–5 tercatat; tiap tiket gelombang 1–5 punya pengerja dan pemeriksa bernama.
- **Bukti:** `node scripts/agents/ilmu.mjs baca orkestrator`.
- **Rujukan:** PRD §10.1 P0-02, §10.4; AGENTS.md §1.5. **Ukuran:** S

#### SP-003 Agent baru `sippa`, pemilik berkas, skrip `uji:sippa`
- **Tujuan:** memberi `public/pipa/**` dan `tests/sippa/**` satu pemilik (AGENTS.md §1.5: berkas tanpa pemilik dan kelas kerja berulang sampai 2030), memastikan `data/sippa/**` jatuh ke `pipa-data`, dan menyediakan perintah uji.
- **Berkas:** `scripts/agents/roster.json` (entri `sippa`: `kelas: "pengerja"`, `model: "sonnet"`, `milik: ["public/pipa/**", "tests/sippa/**"]`, `larangan`: tidak menyentuh `src/**`, `migrations/**`, tidak deploy, tidak commit, tidak melonggarkan gerbang; tambah `data/sippa/**` ke `milik` `pipa-data`), keluaran `npm run agents:build` (`.claude/agents/sippa.md`, `.claude/ilmu-agent/KATALOG.md`), `.claude/ilmu-agent/sippa.md` (diisi dari PRD §9, DS, DT; belum ada kode), `AGENTS.md` (baris peta modul "SIPPA `/pipa`" di §2 dan baris router "Layar `/pipa`" di §1), `package.json` (`"uji:sippa": "node --test tests/sippa/*.test.mjs"`, dirangkai ke `"uji"` dengan pola kode keluar yang sama), `.gitignore` (tambah `.superpowers/` supaya buku besar, ringkasan, dan laporan tiket §1.1 tidak pernah ter-commit).
- **Antarmuka:** Hasil: agent `sippa` (dipanggil `subagent_type: "sippa"`), perintah `npm run uji:sippa`.
- **Di luar:** isi `public/pipa/**`; `docs/sippa/**` (tidak dibuat sampai ada isinya).
- **Pengerja / pemeriksa:** `mekanik-mesin` / `higiene-repo`, `penulis-gerbang` (gerbang ilmu tidak dilonggarkan).
- **Model:** sonnet; pemeriksa haiku (`higiene-repo`) dan sonnet.
- **Dependensi:** SP-002. **Paralel dengan:** SP-004, SP-006, SP-020. **Isolasi:** worktree ya.
- **Selesai bila:** katalog segar; `ilmu.mjs pemilik public/pipa/app.js` menjawab `sippa`; `ilmu.mjs pemilik data/sippa/keluaran/zona.json` menjawab `pipa-data`; `uji:sippa` jalan (nol berkas uji = lulus atau dilewati tanpa galat).
- **Bukti:** `npm run uji:agen`; `npm run agents:check`.
- **Rujukan:** PRD §9.12.1, §10.1 P0-03; AGENTS.md §1.3, §1.5, §2. **Ukuran:** S

#### SP-004 Mesin buku menerima kajian `sippa`
- **Tujuan:** pipeline buku saat ini hanya mengenal `air` dan `mitigasi`; tiket ini membuat kontrak, pembangun, dan QA menerima `sippa` tanpa melonggarkan gerbang apa pun.
- **Berkas:** `data/kajian-bnpb/tema.json` (entri `kajian.sippa`: judul, cakupan sampul, lampiran A–K, pustaka minimum ≥ 50, tanpa batas halaman), `data/kajian-bnpb/bangun/kontrak/naskah.py` (daftar kajian sah), `data/kajian-bnpb/bangun/kontrak/tema.py` (bila memvalidasi daftar kajian), `data/kajian-bnpb/bangun/docx/bangun.py` (`choices` argumen `kajian`), `data/kajian-bnpb/qa/periksa.py` (`--kajian` `choices`), `data/kajian-bnpb/bangun/pptx/deck.py` (hanya bila `kajian` divalidasi), `data/kajian-bnpb/data/glosarium.json` (`varian_terlarang`: "terbukti efektif" tanpa rujukan), uji diri yang sudah ada di berkas tersebut.
- **Antarmuka:** Hasil: `bangun.py sippa`, `periksa.py --kajian sippa`, kunci `tema.json` `kajian.sippa`. Dipakai SP-009, SP-058 s.d. SP-080.
- **Di luar:** naskah, angka, gambar; mengubah aturan QA untuk kajian lain.
- **Pengerja / pemeriksa:** `pipa-data` / `penulis-gerbang` (tidak ada gerbang yang melemah).
- **Model:** sonnet.
- **Dependensi:** SP-002, KB (daftar bab dan lampiran). **Paralel dengan:** SP-003, SP-006, SP-020. **Isolasi:** worktree ya.
- **Selesai bila:** uji diri kontrak lolos; `bangun.py --help` menerima `sippa`; `periksa.py --kajian sippa` diterima; uji QA kajian `air` dan `mitigasi` tetap hijau.
- **Bukti:** `cd data/kajian-bnpb/bangun/kontrak && python3 tema.py && python3 naskah.py`; `cd data/kajian-bnpb && .venv/bin/python qa/uji.py && .venv/bin/python bangun/docx/uji.py`.
- **Rujukan:** PRD §8.4 langkah 1, §10.3 B-01; KB bagian struktur dan lampiran. **Ukuran:** M

#### SP-005 Workflow naskah dan rakit bercabang `sippa`
- **Tujuan:** skrip workflow `naskah-kajian.js` dan `rakit-kajian.js` hanya bercabang `air`/`mitigasi` (judul, `BAGIAN` KERANGKA, batas halaman). Tambahkan cabang `sippa`: judul PRD §8.1, otoritas `KEPUTUSAN-SIPPA.md` > PRD §8 > KB (bukan `KERANGKA.md` bagian 4/5), tanpa batas halaman (keputusan 11), tanpa bab kritik (keputusan 20), larangan keputusan 50.
- **Berkas:** `~/.claude/projects/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/6b4ae72d-ad19-4e2b-b9ca-73f12c9d80a1/workflows/scripts/naskah-kajian.js`, `.../rakit-kajian.js` (di luar repo, tidak di-commit).
- **Di luar:** skrip workflow lain; menjalankan workflow.
- **Pengerja / pemeriksa:** `mekanik-mesin` / `general-purpose` berkonteks bersih (membaca diff: cabang `air` dan `mitigasi` tidak berubah perilaku).
- **Model:** sonnet.
- **Dependensi:** SP-002, SP-004, KB. **Paralel dengan:** SP-007, SP-013, SP-021. **Isolasi:** tidak (di luar repo).
- **Selesai bila:** `args.kajian = 'sippa'` menghasilkan prompt yang merujuk PRD/KB dan tanpa batas halaman; cabang lama identik.
- **Bukti:** `node --check <berkas>` untuk kedua skrip; diff ditinjau.
- **Rujukan:** PRD §8.2, §8.4; KB. **Ukuran:** S

### 3.B P0 siap pilot (25–27 Okt)

#### SP-006 Migrasi 0055 SIPPA inti dan uji skema
- **Tujuan:** sembilan tabel P0 (`sippa_kit`, `sippa_komponen`, `sippa_gerak`, `sippa_tugas`, `sippa_log_gelar`, `sippa_probe`, `sippa_bbm`, `sippa_jalan_cek`, `sippa_aoi_usul`) dengan CHECK, indeks, dan trigger; idempoten.
- **Berkas:** `migrations/0055_sippa_inti.sql`, `tests/warga/sippa_skema.test.mjs`, `tests/warga/cakupan.json`.
- **Antarmuka:** Hasil: tabel dan kolom persis PRD §9.7.2 (0055); semua tabel punya `dummy INTEGER NOT NULL DEFAULT 0`. Dipakai SP-007 (batas CHECK), SP-008, SP-034, SP-050.
- **Di luar:** rute; 0056 dan 0057; menyunting migrasi lama atau `migrations/0053_kontak 2.sql`.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`, `penulis-gerbang` (bentuk uji: yang salah ditolak).
- **Model:** sonnet; `migrasi-idempoten` haiku.
- **Dependensi:** SP-002, DT bagian skema D1. **Paralel dengan:** SP-003, SP-004, SP-020. **Isolasi:** worktree ya.
- **Selesai bila:** migrasi dijalankan dua kali tanpa galat; CHECK menolak status kit liar, kedalaman probe 600 cm, suhu 1.000 °C, tugas > 30 hari; trigger menolak UPDATE/DELETE `sippa_gerak` dan `sippa_bbm` (kecuali dummy) dan urutan waktu log terbalik, dan `banjir_m3` pada jenis bukan banjir; semua tabel dan trigger di `cakupan.json`.
- **Bukti:** `node --test tests/warga/sippa_skema.test.mjs`; `node --test tests/warga/migrasi_beku.test.mjs`.
- **Rujukan:** PRD §9.7.2 (0055), §9.12.2 baris skema D1, §10.1 P0-04; DT bagian skema D1; RU bagian skema D1. **Ukuran:** M

#### SP-007 Daftar medan formulir lapangan
- **Tujuan:** satu sumber medan dan batas untuk form lapangan, validasi server, dan formulir kertas.
- **Berkas:** `public/pipa/formulir.js` (data medan: log gelar 6 tahap, angka sesi, probe 10/30/50/100 cm dan 150–500 cm hanya `lengan_dalam`, BBM, gerak; batas sama dengan CHECK 0055), `tests/sippa/formulir.test.mjs` (batas = CHECK; kedalaman > 500 cm tidak ada di daftar).
- **Antarmuka:** Konsumsi: CHECK `migrations/0055_sippa_inti.sql`. Hasil: modul ES `public/pipa/formulir.js` mengekspor `MEDAN` (objek per jenis butir `log`, `probe`, `bbm`, `gerak`; tiap medan `{nama, tipe, min, maks, pilihan, wajib}`) dan `KEDALAMAN_MAKS_CM = 500`. Dipakai SP-008, SP-009, SP-011.
- **Di luar:** UI form (SP-011); salinan server (SP-008).
- **Pengerja / pemeriksa:** `sippa` / `penulis-gerbang`.
- **Model:** sonnet.
- **Dependensi:** SP-003, SP-006 (batas CHECK). **Paralel dengan:** SP-005, SP-013, SP-021. **Isolasi:** worktree ya.
- **Selesai bila:** daftar medan lengkap sesuai PRD §9.9; uji memastikan tiap batas sama dengan CHECK migrasi 0055 (dibaca dari berkas SQL, bukan disalin).
- **Bukti:** `node --test tests/sippa/formulir.test.mjs`.
- **Rujukan:** PRD §9.9 (validasi klien = server), §9.12.2 baris formulir; DT bagian formulir; RU bagian formulir. **Ukuran:** S

#### SP-008 Worker SIPPA P0: cangkang, gerbang host, rute kit, tugas, lapangan, log
- **Tujuan:** semua rute yang dibutuhkan pilot, di balik sesi, dengan kode penugasan untuk operator.
- **Berkas:** `src/sippa.js` (baru: `RUTE_SIPPA` P0, `P_SIPPA_BACA`, `P_SIPPA_TULIS`, `LAYAR_SIPPA`, transisi status kit, `RANTAI_DUMMY` untuk Kit dan Log, 503 sopan tanpa migrasi), `src/sippa_formulir.js` (salinan persis data medan `public/pipa/formulir.js`, sesuai PRD §9.9; kesamaan dijaga `tests/warga/sippa.test.mjs`), `src/worker.js` (gabung `RUTE_SIPPA`; regex `halamanTerkunci` ditambah `pipa`; `/pipa/lapangan` di `PUBLIK_TANPA_SESI` dengan alasan T-H), `src/admin_halaman.js` (`halamanSippa(ctx)`, `HAL.pipa`, `HALAMAN_STAF.pipa`, `GET /admin/pipa` 303), `tests/warga/sippa.test.mjs` (bagian P0), `tests/warga/staf_halaman.test.mjs` (`HALAMAN_STAF.pipa` = `P_SIPPA_BACA`), `tests/warga/cakupan.json`.
- **Antarmuka:** Konsumsi: tabel 0055, `MEDAN` (SP-007), `stafOK`, `jejakStmt` (`src/staf.js`), `laju()` dan pola `kodeBaru` (`src/bnpb.js`), `bersihMedia`, `jenisBerkas`, `gagal`. Hasil: `RUTE_SIPPA`, `P_SIPPA_BACA = ["pusdalops","koordalops","pimpinan"]`, `P_SIPPA_TULIS = ["pusdalops","koordalops"]`, `LAYAR_SIPPA` (11 nama PRD §9.1.2), `RANTAI_DUMMY`, `halamanSippa(ctx)`; bentuk jawaban `POST /api/sippa/lapangan/kirim` = `{diterima:[id], ganda:[id], ditolak:[{id, alasan}]}`. Dipakai SP-010 s.d. SP-012, SP-029, SP-035, SP-050, SP-052.
- **Rute:** `GET /pipa`, `/pipa/:layar`, `/pipa/kit/:id`, `/pipa/lapangan`, `/admin/pipa`; `GET/POST /api/sippa/kit`, `GET/POST /api/sippa/kit/:id`, `POST .../komponen`, `POST .../gerak`, `POST .../gerak/:gid/tiba`; `POST /api/sippa/tugas`, `POST /api/sippa/tugas/:id/cabut`; `GET /api/sippa/lapangan/saya`, `POST /api/sippa/lapangan/kirim`, `POST /api/sippa/lapangan/foto`; `GET/POST /api/sippa/log`, `GET /api/sippa/log.csv`; `POST /api/sippa/dummy/isi` (layar `kit`, `log`, `lapangan`), `POST /api/sippa/dummy/hapus`.
- **Di luar:** rute data R2, A/B, skenario, laporan, telemetri (SP-029, SP-035, SP-050); `src/pipa.js` dan awalan `/api/pipa/*` (milik pipeline Python, tidak disentuh).
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Model:** sonnet; `guard-api` haiku, `security-reviewer` sonnet.
- **Dependensi:** SP-006, SP-007, DT bagian rute. **Paralel dengan:** SP-009, SP-010, SP-023. **Isolasi:** worktree ya.
- **Selesai bila:** matriks hak P0 hijau (tamu 303 di halaman, 401/403 di API; `verifikator` 403; `pimpinan` POST 403; perencana 201; kode salah 403 dan dihitung; > 300/jam 429; kode dicabut atau kedaluwarsa 403; kode hanya menggerakkan kit tugasnya dan hanya alasan gelar/bongkar/kembali); kirim lapangan dua kali = satu baris; badan 300 KB = 413; staf berwilayah 61 tidak melihat kit 62; staf nyata tidak melihat dummy; tanpa migrasi = 503 sopan; sesi tanpa peran SIPPA = 403 polos tanpa pengalihan; CSV log beraman injeksi rumus.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §3.1, §9.1.2, §9.7.3, §9.8, §9.12.2 baris rute, §10.1 P0-05; DT bagian rute dan akses; RU bagian rute dan hak. **Ukuran:** L

#### SP-009 Formulir kertas G3-lite dan probe
- **Tujuan:** cadangan wajib pilot bila web belum lolos uji: satu halaman A4 per sesi gelar dan satu per petak probe, medan identik dengan `formulir.js`.
- **Berkas:** `data/kajian-bnpb/bangun/sippa_formulir.py` (pembangkit dari medan `public/pipa/formulir.js`, dibaca sebagai teks; pola `bangun/kontrak/lembar.py`/`pdf.mjs`), `data/kajian-bnpb/pipa/formulir/G3-lite.pdf`, `data/kajian-bnpb/pipa/formulir/probe.pdf`.
- **Antarmuka:** Konsumsi: `MEDAN` (SP-007), dibaca sebagai teks. Hasil: `G3-lite.pdf`, `probe.pdf`; dipakai SP-018 dan Lampiran E (SP-073).
- **Di luar:** formulir BBM dan gerak kit (masuk Lampiran E di SP-073).
- **Pengerja / pemeriksa:** `pipa-data` / sesi induk (memeriksa cetak), `selera-angka` (satuan, tanpa titik tengah).
- **Model:** sonnet; `selera-angka` haiku.
- **Dependensi:** SP-007, SP-004. **Paralel dengan:** SP-008, SP-010, SP-023. **Isolasi:** worktree ya.
- **Selesai bila:** dua PDF tercetak; tiap medan `formulir.js` muncul; hanya logo BNPB; tidak ada medan kedalaman > 500 cm.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/sippa_formulir.py` (self-check membandingkan daftar medan PDF dengan `formulir.js`).
- **Rujukan:** PRD §4.1 minggu 44, §9.9, §10.1 P0-06; DS bagian formulir lapangan. **Ukuran:** S

#### SP-010 Cangkang klien `/pipa`, keadaan, tema, hitung inti, layar Log
- **Tujuan:** kerangka aplikasi staf: router History API dengan modul layar malas, navigasi tiga lebar, bilah konteks, enam keadaan standar, token tema terang dan gelap, ikon, fungsi hitung inti, dan layar rekap time-motion.
- **Berkas:** `public/pipa/app.js`, `public/pipa/keadaan.js`, `public/pipa/pipa.css` (satu-satunya lembar gaya layar `/pipa` selain `adegan.css`; token dari DS, memakai `public/inti/tema.css` dan `public/admin/admin.css`), `public/pipa/ikon.js`, `public/pipa/hitung.js` (subset P0: `kuantil`, `zona`, `idHdpe`, `idLayflat`, `hfHW`, `hidraulika`, `gerbangHidraulika`, `vonis`, `bbm`, `co2`), `public/pipa/layar_log.js`, `tests/sippa/hitung.test.mjs`, `tests/sippa/fixtures/acuan.json` (lima nilai acuan PRD §9.3).
- **Antarmuka:** Konsumsi: rute P0 (SP-008, kontrak di DT), `public/inti/format.js` (`fmt`), `tabel.js`, `pilih.js` (`PilihCantik`), `tip.js` (`rapikanTip`), `nanti.js` (`nanti`), `kartu.js`. Hasil: `globalThis.SippaHitung` dengan fungsi bernama persis PRD §9.3 dan konstanta `KEDALAMAN_MAKS_M = 5`; router `app.js` yang memuat `layar_<nama>.js` lewat `import()` dan memanggil `export async function pasang(akar, konteks)` dan `export function lepas()` tiap modul layar; `keadaan.js` mengekspor `memuat()`, `kosong(teks)`, `galat(status, pesan, ulang)`, `luring(per)`, `basi(per)`, `menunggu(alasan)`. Semua tiket layar berikutnya memakai kontrak `pasang`/`lepas` ini.
- **Di luar:** layar lain; fungsi hitung sisanya (SP-030); `public/inti/**` (dipakai, tidak disalin atau diubah).
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`.
- **Model:** sonnet; `selera-angka` haiku.
- **Dependensi:** SP-003, DS (token, navigasi, keadaan), DT (kontrak rute P0). **Paralel dengan:** SP-008, SP-009, SP-023. **Isolasi:** worktree ya.
- **Selesai bila:** lima nilai acuan cocok (toleransi 1%); OD160 SDR11 NO-GO, sisa < 1 bar NO-GO, kedalaman 5,1 m ditolak, zona tepat 2,5/5,0 km masuk A; `kuantil` sama dengan numpy tipe 7; layar Log menampilkan p50/p90 per kelas dengan pil "n kecil" bila n < 5; Ringkas tidak memuat MapLibre atau Three.js; mode gelap bekerja.
- **Bukti:** `node --test tests/sippa/hitung.test.mjs`.
- **Rujukan:** PRD §9.1, §9.2, §9.2.1, §9.3, §9.4.6, §10.1 P0-07; DS bagian token, navigasi, keadaan, layar Log; DT bagian fungsi hitung; RU bagian fungsi murni. **Ukuran:** M

#### SP-011 Layar Lapangan luring dan antrean
- **Tujuan:** form ponsel satu tangan yang bekerja tanpa sinyal dan mengirim saat ada sinyal, tanpa menggandakan kiriman.
- **Berkas:** `public/pipa/layar_lapangan.js`, `public/pipa/antre.js` (IndexedDB `sippa-antre`, jatuh ke `localStorage` untuk teks), `public/pipa/pipa.css` (gaya form lapangan).
- **Antarmuka:** Konsumsi: `MEDAN`, kontrak `pasang`/`lepas`, `GET /api/sippa/lapangan/saya`, `POST /api/sippa/lapangan/kirim`, `POST /api/sippa/lapangan/foto`, header `x-kode`. Hasil: `antre.js` mengekspor `tambah(butir)`, `kirimSemua()`, `jumlah()`.
- **Di luar:** `public/sw-lapangan.js` (SP-013); rute (SP-008).
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `security-reviewer` (kode di fragmen dihapus dari alamat, penyisipan teks).
- **Model:** sonnet.
- **Dependensi:** SP-007, SP-010, SP-013. **Paralel dengan:** SP-012, SP-014, SP-022. **Isolasi:** worktree ya.
- **Selesai bila:** mode pesawat, isi satu sesi gelar 6 tahap + probe + BBM, kembali daring, terkirim satu kali; butir ditolak tetap di antrean dengan alasan; selisih jam > 10 menit tertandai; tombol ≥ 56 px; status antrean `aria-live`.
- **Bukti:** `node --test tests/sippa/*.test.mjs`; uji tangan lewat `preview_start` mode ponsel (dicatat di laporan tiket).
- **Rujukan:** PRD §9.9, §9.13, §10.1 P0-07; DS bagian formulir lapangan; RU bagian luring. **Ukuran:** M

#### SP-012 Layar Kit: daftar, rincian, tugaskan, QR
- **Tujuan:** inventaris dan lacak kit (keputusan 35) untuk pilot dan pemindahan ke banjir.
- **Berkas:** `public/pipa/layar_kit.js` (daftar, rincian dengan tab Komponen, Gerak, Pemakaian, BBM, Penugasan; form tugaskan dengan kode tampil sekali; label QR A6; pindai `BarcodeDetector` atau isian manual).
- **Antarmuka:** Konsumsi: rute kit, komponen, gerak, tugas (SP-008); `globalThis.qrcode` (SP-013). Hasil: form gerak yang dipakai ulang SP-043 lewat `export function formGerak(kit, {rencana})`.
- **Di luar:** vendor QR (SP-013); peta kecil gerak boleh menyusul di SP-032 bila MapLibre belum dimuat.
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`, `security-reviewer` (kode penugasan tampil sekali, tidak disimpan klien).
- **Model:** sonnet.
- **Dependensi:** SP-010, SP-013. **Paralel dengan:** SP-011, SP-014, SP-022. **Isolasi:** worktree ya.
- **Selesai bila:** transisi status sesuai tabel PRD §9.4.5 (tombol yang tidak sah tidak ditawarkan); persen kehilangan dihitung; QR terbaca.
- **Bukti:** `node --test tests/sippa/*.test.mjs`; uji tangan `preview_start`.
- **Rujukan:** PRD §9.4.5, §10.1 P0-07; DS bagian layar Kit. **Ukuran:** M

#### SP-013 Vendor QR dan scope `sw-lapangan.js`
- **Tujuan:** pustaka QR lokal (CSP menolak CDN) dan service worker yang sama melayani `/pipa/lapangan`.
- **Berkas:** `public/vendor/qrcode/qrcode.min.js`, `public/vendor/qrcode/LICENSE`, `public/vendor/qrcode/README.md` (versi, sumber), `public/sw-lapangan.js` (`JALUR_API` dan `KUNCI_KREDENSIAL` ditambah `"/api/sippa/lapangan/saya": "x-kode"`, `HALAMAN` ditambah `/pipa/lapangan`, `VERSI` naik; POST tetap tidak disentuh).
- **Antarmuka:** Hasil: `globalThis.qrcode` (qrcode-generator, MIT); scope SW `/pipa/lapangan`.
- **Di luar:** `public/lapangan.js`.
- **Pengerja / pemeriksa:** `layar-peta` / `higiene-repo` (lisensi, ukuran), `security-reviewer`.
- **Model:** haiku (salin berkas dan tambahan tertulis); pemeriksa haiku dan sonnet.
- **Dependensi:** SP-002. **Paralel dengan:** SP-005, SP-007, SP-021. **Isolasi:** worktree ya.
- **Selesai bila:** `/lapangan` dan `/lacak` tetap bekerja; `/pipa/lapangan` tersimpan luring.
- **Bukti:** `node --test tests/warga/regu_luring.test.mjs`; `npm run uji:agen` (gerbang header).
- **Rujukan:** PRD §9.4.5 (QR), §9.9; DT bagian luring. **Ukuran:** S

#### SP-014 Gerbang SIPPA awal
- **Tujuan:** gerbang tanpa basis data yang dipasang sedini mungkin supaya semua tiket layar berikutnya tertahan olehnya.
- **Berkas:** `tests/sippa/gerbang-sippa.test.mjs` (butir 1–5 PRD §9.12.2: tanpa "terbukti", tanpa em dash dan titik tengah di teks antarmuka, batas kedalaman 5 m di satu konstanta dipakai semua pemakai, tanpa `toFixed(` di teks tampil, tanpa URL CDN di `public/pipa/**`).
- **Antarmuka:** Konsumsi: `KEDALAMAN_MAKS_M` (SP-010), `KEDALAMAN_MAKS_CM` (SP-007). Hasil: gerbang yang diperluas SP-055.
- **Di luar:** butir 6 (handler INP per handler), menyusul di SP-055.
- **Pengerja / pemeriksa:** `sippa` / `penulis-gerbang`.
- **Model:** sonnet.
- **Dependensi:** SP-010. **Paralel dengan:** SP-011, SP-012, SP-022. **Isolasi:** worktree ya.
- **Selesai bila:** gerbang hijau pada kode P0 dan merah bila disisipi pelanggaran contoh (diuji dengan fixture).
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §1.5, §9.12.2 baris gerbang SIPPA; RU bagian gerbang. **Ukuran:** S

#### SP-015 Tinjauan P0
- **Tujuan:** tinjauan paralel permukaan P0 sebelum deploy.
- **Berkas:** tidak ada (laporan pengulas).
- **Di luar:** membetulkan (pengerja tiket asal membetulkan).
- **Pengerja / pemeriksa:** `guard-api`, `migrasi-idempoten`, `selera-angka` (haiku); `security-reviewer`, `inp-reviewer` (sonnet); semuanya berkonteks bersih.
- **Model:** haiku/sonnet sesuai daftar.
- **Dependensi:** SP-006 s.d. SP-014. **Paralel dengan:** satu sama lain. **Isolasi:** tidak (baca saja).
- **Selesai bila:** nol temuan kritis terbuka; temuan tinggi dibetulkan atau dicatat sebagai tertahan oleh sesi induk.
- **Bukti:** laporan tiap pengulas; `npm run uji`; `npm run uji:sippa`.
- **Rujukan:** PRD §9.12.1, §10.1 P0-08; AGENTS.md §6. **Ukuran:** S

#### SP-016 [induk] Commit P0
- **Tujuan:** satu commit per tiket P0 dengan path spesifik.
- **Berkas:** berkas tiket SP-003, SP-004, SP-006 s.d. SP-014.
- **Di luar:** berkas sesi lain yang ada di `git status` (daftar awal sesi memuat banyak perubahan milik pekerjaan lain; tidak ikut).
- **Pengerja / pemeriksa:** sesi induk / `higiene-repo`.
- **Model:** opus (sesi induk).
- **Dependensi:** SP-015. **Paralel dengan:** tidak. **Isolasi:** tidak.
- **Selesai bila:** tiap commit `git commit -m "SIPPA SP-0NN: ..." -- <berkas>`; tanpa `git add -A`; tanpa berkas `* 2.*`.
- **Bukti:** `git log --oneline -15`; `git status`.
- **Rujukan:** PRD §10.7. **Ukuran:** S

#### SP-017 [induk] Deploy P0, uji asap, kit SIPPA-001, kode regu pilot
- **Tujuan:** `/pipa/lapangan` siap di ponsel regu pilot.
- **Berkas:** `tests/warga/migrasi_beku.json` (0055 dicatat lewat `warga-api` sesudah diterapkan, masuk commit berikutnya).
- **Langkah:** PRD §10.6 langkah 1–7: `npm run uji`; `npm run uji:sippa`; `npx --yes wrangler@4.42.0 d1 migrations apply poskowarga --remote`; `npx --yes wrangler@4.42.0 deploy`; uji asap (`/pipa` tamu 303, staf pusdalops 200, `/pipa/lapangan` 200, `GET /api/sippa/kit` tamu 401/403); buat kit `SIPPA-001` jenis `pinjam_pilot` dengan `pemilik_asal` dari T-C; buat kode penugasan regu pilot dan serahkan tautan ke pemilik; satu kiriman dummy lalu `dummy/hapus`.
- **Di luar:** rute selain P0.
- **Pengerja / pemeriksa:** sesi induk / pemilik (menerima tautan regu).
- **Model:** opus.
- **Dependensi:** SP-016, SP-001 (T-B, T-C). **Paralel dengan:** tidak. **Isolasi:** tidak.
- **Selesai bila:** semua uji asap lolos; kit dan kode ada; bila gagal, `wrangler rollback` dan pilot memakai kertas (SP-009).
- **Bukti:** log deploy; `GET /api/sippa/kit` dengan sesi staf memuat `SIPPA-001`.
- **Rujukan:** PRD §10.1 P0-09, §10.6. **Ukuran:** S

#### SP-018 [induk] Pilot lapangan dan entri formulir kertas
- **Tujuan:** 2–3 sesi gelar di AOI T-B, probe sebelum dan 24 jam, dan vonis "dapat dipakai" pada 1 Nov; vonis "lebih baik" dipisah dan hanya bila ada api dan petak berdampingan.
- **Berkas:** tidak ada di repo selain data D1; formulir kertas dipindai dan dimasukkan staf lewat `POST /api/sippa/log` bila web terlambat.
- **Di luar:** vonis G4 (pilot tidak pernah dipakai untuk G4).
- **Pengerja / pemeriksa:** Satgas, Manggala Agni, BPBD (lapangan); sesi induk mencatat / pemilik memutus.
- **Model:** tidak berlaku.
- **Dependensi:** SP-009 (wajib), SP-017 (bila siap), T-B. **Paralel dengan:** gelombang 6. **Isolasi:** tidak.
- **Selesai bila:** tiap sesi punya log 6 tahap dan probe; keputusan pemilik lanjut ke banjir atau tidak (minggu 45).
- **Bukti:** `GET /api/sippa/log`; pindaian kertas.
- **Rujukan:** PRD §1.3 U3–U4, §4.1 minggu 44–45, §10.1 P0-10. **Ukuran:** M

### 3.C Pipeline data (25 Okt–13 Des)

Semua skrip Python 3.12 stdlib dengan self-check `__main__`, keluaran di `data/sippa/keluaran/*.json` (kunci pertama `dibuat`, lalu `per`, `ambang`, `sumber`, `catatan`), batas 8 MB per berkas. Tidak ada salinan di `public/` (keputusan 32).

#### SP-019 Kembar Python `hidraulika.py` dan `respons.py`
- **Tujuan:** kembar Python fungsi hitung JS untuk pipeline dan buku: hidraulika, gerbang, BBM, CO2, neraca air, Joukowsky, `saranSarana`, `matriksRespons`.
- **Berkas:** `scripts/data/sippa/hidraulika.py`, `scripts/data/sippa/respons.py`.
- **Antarmuka:** Konsumsi: `tests/sippa/fixtures/acuan.json` (SP-010). Hasil: fungsi Python bernama sama dengan JS dalam snake_case (`hidraulika`, `gerbang_hidraulika`, `vonis`, `saran_sarana`, `matriks_respons`), dipanggil SP-026 lewat CLI `python3 -I scripts/data/sippa/hidraulika.py --json <berkas>` yang mencetak hasil JSON.
- **Di luar:** `public/pipa/hitung.js`; uji kembar (SP-026).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-010 (`acuan.json`). **Paralel dengan:** SP-025, SP-065. **Isolasi:** worktree ya.
- **Selesai bila:** self-check mereproduksi lima nilai acuan `tests/sippa/fixtures/acuan.json` (toleransi 1%) dan empat tingkat `matriksRespons`, enam aturan `saranSarana`.
- **Bukti:** `python3 scripts/data/sippa/hidraulika.py`; `python3 scripts/data/sippa/respons.py`.
- **Rujukan:** PRD §5.4, §6.4, §9.3, §9.12.2 baris skrip Python; DT bagian fungsi hitung. **Ukuran:** M

#### SP-020 `sel22.py` kekerapan sel 2,2 km
- **Tujuan:** kekerapan 2012–2025 per sel 2,2 km dari VIIRS mentah.
- **Berkas:** `scripts/data/sippa/sel22.py`, `data/sippa/keluaran/sel22.json`.
- **Antarmuka:** Hasil: `sel22.json` dengan medan PRD §9.7.1. Dipakai SP-021, SP-063.
- **Di luar:** zona.
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-002. **Paralel dengan:** SP-003, SP-004, SP-006. **Isolasi:** worktree ya.
- **Selesai bila:** porsi deteksi 2019 dan 2023 di sel berulang direproduksi (72% dan 85%, KD §1) sebagai invarian rentang, bukan potret; ringkasan ≥ 3/5/7/10 tahun.
- **Bukti:** `python3 scripts/data/sippa/sel22.py`.
- **Rujukan:** PRD §7.1, §7.2, §9.7.1. **Ukuran:** S

#### SP-021 `zona.py` kelayakan kompleks, sel, ringkasan zona
- **Tujuan:** zona A–D dua versi (konservatif, optimistis) dan kolom terverifikasi per kompleks Kalteng, kelayakan per sel 2,2 km, dan ringkasan per provinsi dan kabupaten.
- **Berkas:** `scripts/data/sippa/zona.py`, `data/sippa/keluaran/kelayakan_kompleks.json`, `data/sippa/keluaran/kelayakan_sel.json`, `data/sippa/keluaran/zona.json`.
- **Antarmuka:** Konsumsi: `sel22.json`, `kajian/pipa/data/*.csv`, `public/data/kendala.json`, `khg_prioritas.json`, `kompleks_konsesi.json`, `akses.json`. Hasil: tiga JSON dengan medan PRD §9.7.1 (`zona_k`, `zona_o`, `keyakinan{}`). Dipakai SP-023, SP-029, SP-032, SP-063, SP-064.
- **Di luar:** jalan cek staf (data D1, dibaca layar).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-020. **Paralel dengan:** SP-005, SP-007, SP-013. **Isolasi:** worktree ya.
- **Selesai bila:** invarian: jumlah zona = jumlah kompleks, tiap kompleks tepat satu zona per versi; dari data 24–25 Okt menghasilkan A188/B418/C89/D170 dan A469/B158/C167/D71 (dicek sebagai pencocokan terhadap `matriks_jarak.md`, bukan konstanta di skrip); tanpa nama perusahaan konsesi.
- **Bukti:** `python3 scripts/data/sippa/zona.py`.
- **Rujukan:** PRD §5.1, §7.2, §9.7.1, §9.12.2; DT bagian data turunan. **Ukuran:** M

#### SP-022 `nasional.py` kit per provinsi
- **Berkas:** `scripts/data/sippa/nasional.py`, `data/sippa/keluaran/kit_nasional.json`.
- **Antarmuka:** Hasil: `kit_nasional.json` (PRD §9.7.1). Dipakai SP-062, SP-063.
- **Tujuan:** 18 provinsi, kelompok gambut/mineral, kit per provinsi dengan `ha_per_kit: 22700` berlabel asumsi, berlabel "rencana bersyarat, bukan pengadaan".
- **Di luar:** RAB nasional (SP-062).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-002. **Paralel dengan:** SP-011, SP-012, SP-014. **Isolasi:** worktree ya.
- **Selesai bila:** dari `luas_resmi.json` saat ini total 81 dan gambut 56; porsi tiap provinsi ≥ 0; invarian jumlah = total.
- **Bukti:** `python3 scripts/data/sippa/nasional.py`.
- **Rujukan:** PRD §5.2, §9.7.1. **Ukuran:** S

#### SP-023 `pemicu.py` tingkat pemicu harian
- **Berkas:** `scripts/data/sippa/pemicu.py`, `data/sippa/keluaran/pemicu.json`.
- **Antarmuka:** Konsumsi: `kelayakan_kompleks.json`, `public/data/fwi_ansambel.json`, `iklim_outlook.json`, `titik24.json`. Hasil: `pemicu.json`. Dipakai SP-031, SP-043.
- **Tujuan:** tingkat NORMAL/SIAGA/PRA-POSISI/GELAR per kabupaten dari `iklim_outlook.json`, `fwi_ansambel.json`, `titik24.json`, dan kelayakan.
- **Di luar:** layar (SP-043); jadwal (SP-025).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-021. **Paralel dengan:** SP-008, SP-009, SP-010. **Isolasi:** worktree ya.
- **Selesai bila:** tingkat tidak naik ke PRA-POSISI/GELAR bila ansambel lebih tua dari 36 jam; semua ambang berlabel asumsi-kebijakan dan "belum diuji balik".
- **Bukti:** `python3 scripts/data/sippa/pemicu.py`.
- **Rujukan:** PRD §9.4.4, §9.7.1, §9.12.2. **Ukuran:** S

#### SP-024 Tinjauan zona, pemicu, respons
- **Tujuan:** kejujuran ambang dan klaim (tidak ada "diuji" tanpa uji balik; label keyakinan lengkap).
- **Berkas:** tidak ada (laporan).
- **Pengerja / pemeriksa:** pemeriksa `validasi-model` (konteks bersih); pengerja pembetul `pipa-data`.
- **Model:** sonnet.
- **Dependensi:** SP-019, SP-021, SP-022, SP-023. **Paralel dengan:** gelombang 6. **Isolasi:** tidak.
- **Selesai bila:** nol temuan kritis.
- **Bukti:** laporan; self-check keempat skrip hijau.
- **Rujukan:** PRD §10.2 W-02. **Ukuran:** S

#### SP-025 Langkah `data.yml` dan unggah R2 `sippa/`
- **Tujuan:** `pemicu.py` harian setelah `ansambel.py`/`fwi.py`; `zona.py` saat `kendala.json` berubah; unggah `data/sippa/keluaran/*.json` ke R2 `poskokarhutla-foto/sippa/` dengan pola langkah `risiko/`.
- **Berkas:** `.github/workflows/data.yml`.
- **Antarmuka:** Hasil: objek R2 `poskokarhutla-foto/sippa/<nama>.json`. Dipakai SP-029.
- **Di luar:** workflow baru (dilarang, PRD §7.3); `sel22.py` dan `nasional.py` tetap manual/tahunan.
- **Pengerja / pemeriksa:** `mekanik-mesin` / `higiene-repo`.
- **Model:** sonnet; pemeriksa haiku.
- **Dependensi:** SP-020, SP-021, SP-022, SP-023. **Paralel dengan:** SP-019, SP-065. **Isolasi:** worktree ya.
- **Selesai bila:** satu jalan manual `workflow_dispatch` (dijalankan sesi induk setelah commit) memunculkan berkas di R2; langkah gagal tidak menghentikan langkah data lain yang sudah ada.
- **Bukti:** `npm run uji:agen` (gerbang workflow bila ada); log Actions (sesi induk).
- **Rujukan:** PRD §7.2, §7.3, §10.2 W-03. **Ukuran:** S

#### SP-026 Uji kembar JS dan Python
- **Berkas:** `tests/sippa/kembar.test.mjs`.
- **Tujuan:** `hitung.js` dan `scripts/data/sippa/*.py` memberi hasil sama untuk semua kasus `acuan.json` (memanggil `python3 -I`).
- **Pengerja / pemeriksa:** `sippa` / `penulis-gerbang`.
- **Model:** sonnet.
- **Dependensi:** SP-019, SP-030. **Paralel dengan:** SP-031, SP-032, SP-033, SP-035. **Isolasi:** worktree ya.
- **Selesai bila:** toleransi 1% untuk semua kasus; kasus baru yang diekspor kalkulator otomatis ikut.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.3, §9.12.2 baris kembar; RU bagian kembar. **Ukuran:** S

#### SP-027 Matriks jarak gudang dan pelengkapan `akses.json`
- **Tujuan:** jarak kompleks ke Daops/gudang (`harus dihitung`) dan waktu tempuh posko ke kompleks Kalteng yang belum ada (`harus dilengkapi`), untuk rincian Peta dan pemicu.
- **Berkas:** `data/kajian-bnpb/pipa/data/matriks_gudang.csv` (lewat `data/kajian-bnpb/bangun/pipa_data.py` subperintah baru), `scripts/scrape/akses.py` (pembangun `public/data/akses.json`; naikkan cakupan Kalteng dari 71 kompleks tanpa melewati `MAKS_DETIK` dan `MAKS_BYTE` yang ada).
- **Di luar:** OSRM di Actions bila skrip asal tidak memakainya.
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-021. **Paralel dengan:** SP-041, SP-043, SP-048, SP-064. **Isolasi:** worktree ya.
- **Selesai bila:** semua 865 kompleks punya jarak gudang; `jam_tiba` terisi atau berlabel "belum dihitung" dengan alasan.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/pipa_data.py matriks_gudang` (self-check); `python3 scripts/scrape/akses.py` (self-check bila ada; bila tidak, invarian jumlah entri Kalteng naik dan ukuran < `MAKS_BYTE`).
- **Rujukan:** PRD §7.1 baris "harus dihitung/dilengkapi", §9.4.2 rincian. **Ukuran:** M

#### SP-028 Calon AOI 2027 `aoi_calon.json`
- **Tujuan:** tiga AOI pilot 2027 dari lapisan kelayakan dan usulan staf (`sippa_aoi_usul`), minggu 50.
- **Berkas:** `scripts/data/sippa/zona.py` (subperintah `--aoi`), `data/sippa/keluaran/aoi_calon.json`.
- **Di luar:** keputusan AOI (pemilik, G0).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-021, SP-029 (usulan staf terekspor), SP-018. **Paralel dengan:** gelombang 16. **Isolasi:** worktree ya.
- **Selesai bila:** saringan G0 (sel aktif ≥ 7 dari 14 tahun, gambut, air ≤ 2,5 km) tertulis di `ambang`; tanpa nama perusahaan.
- **Bukti:** `python3 scripts/data/sippa/zona.py --aoi`.
- **Rujukan:** PRD §4.1 minggu 50, §4.4 G0, §9.7.1. **Ukuran:** S

### 3.D Web rilis R1 (28 Okt–8 Nov): perencanaan dasar, A/B, laporan pilot

R1 menggabungkan P1 PRD (W-04, W-05) dengan W-06 dan templat Laporan pilot dari W-07, karena minggu 45 butuh `/pipa/ab` berisi hasil pilot ("n kecil") dan minggu 46 butuh Laporan pilot PDF (PRD §4.1).

#### SP-029 Rute data, ringkas, cek jalan, usul AOI
- **Berkas:** `src/sippa.js` (rute `GET /api/sippa/data/:nama` dengan hak dicek sebelum R2 dan daftar nama tetap, `GET /api/sippa/ringkas`, `GET/POST /api/sippa/jalan-cek`, `POST /api/sippa/aoi`; dummy layar `peta`, `ringkas`), `tests/warga/sippa.test.mjs`, `tests/warga/cakupan.json`.
- **Antarmuka:** Konsumsi: R2 `sippa/`, tabel 0055. Hasil: `GET /api/sippa/data/:nama` (nama ∈ `kelayakan_kompleks`, `kelayakan_sel`, `zona`, `sel22`, `kit_nasional`, `pemicu`, `aoi_calon`), `GET /api/sippa/ringkas`.
- **Tujuan:** data turunan R2 hanya lewat sesi; tamu tidak tahu berkas ada atau tidak.
- **Di luar:** layar.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Model:** sonnet; `guard-api` haiku.
- **Dependensi:** SP-008, SP-025. **Paralel dengan:** SP-030, SP-034, SP-058, SP-062. **Isolasi:** worktree ya.
- **Selesai bila:** 403 sama untuk berkas ada dan tidak ada; 404 untuk staf bila belum diunggah; batas laju 600/jam; cakupan terdaftar.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.7.1, §9.7.3, §10.2 W-04; DT bagian rute; RU bagian rute dan hak. **Ukuran:** M

#### SP-030 `hitung.js` lengkap dan `batas.js`
- **Berkas:** `public/pipa/hitung.js` (sisa fungsi PRD §9.3: `neracaAir`, `joukowsky`, `zonaTerverifikasi`, `saranSarana`, `matriksRespons`, `bandingRerata`, `bandingProporsi`, `crf`, `biayaPerHa`, `npv`, `bcr`, `impas`, gerbang H-DAYA, H-KECEPATAN, H-PANAS, H-AIR, H-DSM), `public/pipa/batas.js` (teks "Batas pemakaian alat", sumber tunggal untuk layar Data dan Lampiran K), `tests/sippa/hitung.test.mjs`, `tests/sippa/fixtures/acuan.json`.
- **Antarmuka:** Konsumsi: `SippaHitung` (SP-010). Hasil: sisa fungsi PRD §9.3 di `SippaHitung`; `batas.js` mengekspor `BATAS_ALAT` (larik paragraf), dibaca SP-031 dan SP-073.
- **Tujuan:** satu sumber rumus untuk kalkulator, peta, Studio, 3D, laporan, dan buku.
- **Di luar:** mesin Studio (SP-041).
- **Pengerja / pemeriksa:** `sippa` / `validasi-model` (rumus statistik dan biaya), `penulis-gerbang`.
- **Model:** sonnet.
- **Dependensi:** SP-010. **Paralel dengan:** SP-029, SP-034, SP-058, SP-062. **Isolasi:** worktree ya.
- **Selesai bila:** `saranSarana` enam aturan; `matriksRespons` empat tingkat; `bandingRerata` cocok hitung tangan dan n < 8 = "belum bisa diputus"; Agresti-Caffo cocok contoh; impas semi Rp3,19 M (baca-C).
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.3, §9.4.8, §9.12.2 baris fungsi murni; DT bagian fungsi hitung; RU bagian fungsi murni. **Ukuran:** M

#### SP-031 Layar Ringkas dan Data
- **Berkas:** `public/pipa/layar_ringkas.js`, `public/pipa/layar_data.js`.
- **Tujuan:** empat kartu Insight (Kit, Pemicu, Pilot, Zona) yang memuat sendiri-sendiri; daftar dataset, rumus, gerbang, dan batas alat dari `batas.js`.
- **Di luar:** angka yang dihitung ulang di klien (diambil dari JSON/rute).
- **Pengerja / pemeriksa:** `sippa` / `selera-angka`, `inp-reviewer`.
- **Model:** sonnet; `selera-angka` haiku.
- **Dependensi:** SP-029, SP-030. **Paralel dengan:** SP-026, SP-032, SP-033, SP-035. **Isolasi:** worktree ya.
- **Selesai bila:** satu kartu galat tidak menghentikan kartu lain; pil basi dan menunggu tampil; tiap angka bersumber dan berwaktu.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.4.1, §9.4.8; DS bagian layar Ringkas dan Data. **Ukuran:** M

#### SP-032 Layar Peta kelayakan dan saran sarana
- **Berkas:** `public/pipa/layar_peta.js`, `public/pipa/pipa.css` (gaya peta).
- **Tujuan:** keputusan 30 dan 44: sakelar per kompleks dan per sel 2,2 km, tiga versi zona, pil zona dengan pola untuk buta warna, rincian kompleks, saran sarana dengan alasan berangka, tautan ke Hitung, aksi cek jalan dan usul AOI, daftar alternatif berpaginasi 50, basemap gelap.
- **Di luar:** vendor MapLibre (sudah ada di `public/vendor/maplibre/`).
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`, `security-reviewer` (penyisipan teks dari data).
- **Model:** sonnet.
- **Dependensi:** SP-021, SP-029, SP-030. **Paralel dengan:** SP-026, SP-031, SP-033, SP-035. **Isolasi:** worktree ya.
- **Selesai bila:** sakelar hanya `setLayoutProperty`/`setFilter`; tidak ada interaksi > 200 ms; versi Terverifikasi berbeda dari Konservatif bila ada cek jalan lolos; kartu judul memakai angka `zona.json`.
- **Bukti:** `npm run uji:sippa`; laporan `inp-reviewer`.
- **Rujukan:** PRD §9.4.2, §9.13; DS bagian layar Peta. **Ukuran:** L

#### SP-033 Layar Hitung
- **Berkas:** `public/pipa/layar_hitung.js`.
- **Tujuan:** kalkulator hidraulika dengan masukan dan batas PRD §9.4.3, kartu vonis, kartu angka, grafik tekanan sepanjang trase dan head loss per diameter, salin tautan, simpan sebagai skenario Studio (aktif setelah SP-035), ekspor acuan (Admin).
- **Di luar:** Studio.
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`.
- **Model:** sonnet.
- **Dependensi:** SP-029 (parameter `?kompleks=`), SP-030. **Paralel dengan:** SP-026, SP-031, SP-032, SP-035. **Isolasi:** worktree ya.
- **Selesai bila:** kedalaman > 5 m ditolak di masukan dengan pesan PRD; 3–5 m berpil "lengan uji"; grafik lewat `nanti()`; ponsel memakai akordeon dengan vonis menempel.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.4.3, §6.4; DS bagian layar Hitung. **Ukuran:** M

#### SP-034 Migrasi 0056 A/B, skenario, laporan dan uji skema
- **Berkas:** `migrations/0056_sippa_ab_skenario.sql`, `tests/warga/sippa_skema.test.mjs`, `tests/warga/cakupan.json`.
- **Antarmuka:** Hasil: tabel 0056 persis PRD §9.7.2. Dipakai SP-035.
- **Tujuan:** `sippa_ab_unggah`, `sippa_petak`, `sippa_skenario`, `sippa_laporan`.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`, `penulis-gerbang`.
- **Model:** sonnet; `migrasi-idempoten` haiku.
- **Dependensi:** SP-006. **Paralel dengan:** SP-029, SP-030, SP-058, SP-062. **Isolasi:** worktree ya.
- **Selesai bila:** idempoten; CHECK menolak surfaktan > 0 di lengan bukan surfaktan, state skenario bukan JSON atau > 32 KB, tanggal bukan YYYY-MM-DD, `UNIQUE (aoi, petak_id)` ganda.
- **Bukti:** `node --test tests/warga/sippa_skema.test.mjs`.
- **Rujukan:** PRD §9.7.2 (0056), §10.2 W-06; DT bagian skema D1; RU bagian skema D1. **Ukuran:** S

#### SP-035 Rute A/B, skenario, laporan
- **Berkas:** `src/sippa.js` (`GET /api/sippa/ab`, `POST /api/sippa/ab/unggah`, `POST /api/sippa/ab/unggah/:id/status`, `GET /api/sippa/ab.csv`, `GET/POST /api/sippa/skenario`, `POST /api/sippa/skenario/:id/hapus`, `GET/POST /api/sippa/laporan`, `GET /api/sippa/laporan/:id/berkas`; dummy layar `ab`, `studio`, `laporan`), `tests/warga/sippa.test.mjs`, `tests/warga/cakupan.json`.
- **Antarmuka:** Konsumsi: tabel 0056, `SippaHitung.bandingRerata`/`bandingProporsi` hanya di klien (server tidak menghitung statistik). Hasil: rute A/B, skenario, laporan PRD §9.7.3.
- **Tujuan:** unggah CSV petak dengan tolak-semua bila satu baris salah; arsip PDF di R2 `sippa-laporan/`.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer` (unggah CSV dan PDF, injeksi rumus).
- **Model:** sonnet.
- **Dependensi:** SP-034, SP-008. **Paralel dengan:** SP-026, SP-031, SP-032, SP-033. **Isolasi:** worktree ya.
- **Selesai bila:** CSV satu baris salah = 400 dengan nomor baris dan 0 baris tersimpan; sha sama = 409; PDF tanpa `%PDF-` ditolak; hapus skenario hanya pembuat atau Admin.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.4.7, §9.7.3, §10.2 W-06; DT bagian rute; RU bagian rute dan hak. **Ukuran:** M

#### SP-036 Layar A/B
- **Berkas:** `public/pipa/layar_ab.js`.
- **Tujuan:** unggah CSV, ringkasan per lengan dibanding konvensional (Welch, Agresti-Caffo, biaya per ha dua definisi), kartu vonis G4 tiga nilai, grafik titik dan batang nyala ulang 7/30/90 hari, pil "hipotesis" dan "pilot, n kecil".
- **Pengerja / pemeriksa:** `sippa` / `validasi-model` (vonis dan CI), `selera-angka`, `inp-reviewer`.
- **Model:** sonnet.
- **Dependensi:** SP-030, SP-035. **Paralel dengan:** SP-037, SP-040, SP-059, SP-060. **Isolasi:** worktree ya.
- **Selesai bila:** hasil pilot tidak pernah memberi vonis G4; n < 8 = "belum bisa diputus"; daftar galat unggahan per baris dan kolom.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.4.7, §1.3 U4, U7; DS bagian layar A/B. **Ukuran:** M

#### SP-037 Layar Laporan dan templat Laporan pilot
- **Berkas:** `public/pipa/layar_laporan.js`, `public/pipa/laporan_isi.js` (fungsi murni `isiLaporan(jenis, data)`), `tests/sippa/laporan_isi.test.mjs`.
- **Antarmuka:** Konsumsi: `public/vendor/jspdf/`, `public/inti/roboto.js`, `POST /api/sippa/laporan`. Hasil: `laporan_isi.js` mengekspor `isiLaporan(jenis, data)` yang mengembalikan larik blok `{jenis: "judul"|"paragraf"|"tabel"|"kartu", ...}`; dipakai SP-044, SP-054.
- **Tujuan:** PDF di peramban dengan jsPDF dan Roboto yang sudah divendor (pola `public/laporan_bnpb.js`), arsip lewat `POST /api/sippa/laporan`; templat pertama: Laporan pilot (dua vonis dipisah).
- **Di luar:** templat kejadian, mingguan, musim, skenario (SP-044).
- **Pengerja / pemeriksa:** `sippa` / `selera-angka`, `security-reviewer`.
- **Model:** sonnet.
- **Dependensi:** SP-010, SP-035. **Paralel dengan:** SP-036, SP-040, SP-059, SP-060. **Isolasi:** worktree ya.
- **Selesai bila:** hanya logo BNPB; tiap angka bersumber dan berwaktu; tanpa "terbukti", em dash, titik tengah; nama berkas `sippa-pilot-<prov>-<YYYYMMDD>.pdf`; kaki "Dibuat otomatis ...".
- **Bukti:** `node --test tests/sippa/laporan_isi.test.mjs`.
- **Rujukan:** PRD §9.10, §4.1 minggu 46, §10.2 W-07; DS bagian layar Laporan; RU bagian laporan. **Ukuran:** M

#### SP-038 Tinjauan R1
- **Pengerja / pemeriksa:** `guard-api`, `migrasi-idempoten`, `selera-angka`, `higiene-repo` (haiku); `security-reviewer`, `inp-reviewer`, `validasi-model` (sonnet).
- **Berkas:** tidak ada (laporan). **Di luar:** membetulkan.
- **Tujuan:** tinjauan permukaan SP-019 s.d. SP-037 yang berubah.
- **Model:** haiku/sonnet. **Dependensi:** SP-026, SP-029 s.d. SP-037. **Paralel dengan:** satu sama lain. **Isolasi:** tidak.
- **Selesai bila:** nol temuan kritis terbuka.
- **Bukti:** laporan; `npm run uji`; `npm run uji:sippa`.
- **Rujukan:** PRD §9.12.1, §10.2. **Ukuran:** S

#### SP-039 [induk] Commit dan deploy R1
- **Tujuan:** R1 di produksi paling lambat 8 Nov; Laporan pilot bisa dibuat minggu 46.
- **Berkas:** berkas SP-019 s.d. SP-037; commit data turunan `data/sippa/keluaran/*.json` terpisah dari kode; `tests/warga/migrasi_beku.json` (0055 dari SP-017, 0056 sesudah diterapkan).
- **Langkah:** PRD §10.6 lengkap; jalankan `workflow_dispatch` `data.yml` sekali dan periksa R2 `sippa/`; uji asap `/api/sippa/data/zona` dengan sesi = 200.
- **Pengerja / pemeriksa:** sesi induk / `higiene-repo`.
- **Model:** opus. **Dependensi:** SP-038. **Paralel dengan:** tidak. **Isolasi:** tidak.
- **Selesai bila:** layar Ringkas, Peta, Hitung, Data, Kit, Log, Lapangan, A/B, Laporan (templat pilot) tersedia di produksi.
- **Bukti:** log deploy; `git log --oneline`.
- **Rujukan:** PRD §10.2 urutan rilis, §10.6, §10.7. **Ukuran:** S

### 3.E Web rilis R2 (9–22 Nov): Studio, Pemicu, laporan operasi banjir

#### SP-040 Salin sumber Studio pemilik ke repo
- **Berkas:** `data/kajian-bnpb/pipa/sumber/Karhutla_Decision_Dashboard.html` (salinan apa adanya dari `/Users/alfatehanseptianta/Downloads/Karhutla_Decision_Dashboard.html`), `data/kajian-bnpb/pipa/sumber/README.md` (asal, tanggal salin, sha256).
- **Tujuan:** sumber mesin yang dipertahankan (keputusan 34) tersedia di repo untuk port dan uji, tidak bergantung pada folder Unduhan.
- **Di luar:** mengubah isi berkas.
- **Pengerja / pemeriksa:** `pipa-data` / `higiene-repo` (ukuran, tidak ada secret).
- **Model:** haiku (salin dan hash).
- **Dependensi:** SP-002. **Paralel dengan:** SP-036, SP-037, SP-059, SP-060. **Isolasi:** worktree ya.
- **Selesai bila:** sha256 salinan = sha256 asal.
- **Bukti:** `shasum -a 256` kedua berkas.
- **Rujukan:** PRD §9.5; baca-C C1. **Ukuran:** S

#### SP-041 Mesin Studio dan `gerbangSippa`
- **Berkas:** `public/pipa/studio_mesin.js`, `tests/sippa/studio_mesin.test.mjs`.
- **Antarmuka:** Konsumsi: sumber SP-040, `SippaHitung`, `sippa.rab.*` (SP-062). Hasil: `globalThis.KarhutlaEngine` dengan `defaultState`, `getBase`, `buildBoQ`, `assess`, `compare`, `drawRiskMC` tidak berubah, ditambah `gerbangSippa(state, hasil)`. Dipakai SP-042, SP-044.
- **Tujuan:** port mesin pemilik dengan angka dan rumus tidak berubah; hanya tiga jenis perubahan bertanda `SIPPA:` (pembungkus `globalThis.KarhutlaEngine` tanpa `localStorage`; `gerbangSippa` yang hanya menambah hambatan: H-SERAP, H-DALAM, `jaringan_permanen` > 2 koridor, H-AIR 1,5x; perbaikan cacat G23 termasuk slot heli `menunggu`); preset S0 dan S0B dari BOM dan `sippa.rab` (SP-062).
- **Di luar:** UI (SP-042).
- **Pengerja / pemeriksa:** `sippa` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-030, SP-040, SP-062. **Paralel dengan:** SP-027, SP-043, SP-048, SP-064. **Isolasi:** worktree ya.
- **Selesai bila:** angka jalan-ulang baca-C C1.4 dari `defaultState` dan tiga preset cocok toleransi 0,5% (CAPEX S1/S2/S3, OPEX, TCO 5 tahun, tekanan semi 5,39 bar, impas semi, Monte Carlo P10/P50/P90); properti 200 keadaan acak berbenih: keras sesudah ≥ keras sebelum; MC deterministik; tidak ada status "GO".
- **Bukti:** `node --test tests/sippa/studio_mesin.test.mjs`.
- **Rujukan:** PRD §9.5.1, §9.5.2, §12.1 G01, G04, G10, G11, G13, G22, G23; DT bagian Studio; RU bagian Studio. **Ukuran:** M

#### SP-042 Layar Studio, Web Worker, simpan skenario
- **Berkas:** `public/pipa/layar_studio.js`, `public/pipa/studio_pekerja.js`, `public/pipa/pipa.css` (gaya Studio).
- **Tujuan:** delapan kelompok akordeon, 32 dimensi dan 36 parameter, tab Bandingkan semua (S0, S0B, S1, S2, S3 dan paling banyak 6 skenario tersimpan), tab lain sesuai PRD §9.5.3, empat sumber manfaat bawaan 0 berpil asumsi-kebijakan, simpan/impor/ekspor, cetak ke templat Skenario.
- **Di luar:** templat PDF Skenario (SP-044).
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`, `validasi-model` (manfaat dan NPV tidak menyesatkan).
- **Model:** sonnet.
- **Dependensi:** SP-041, SP-035. **Paralel dengan:** SP-044, SP-068, SP-069, SP-070. **Isolasi:** worktree ya.
- **Selesai bila:** geser slider tidak membekukan layar (MC di Web Worker; jatuh ke `nanti()` dengan pita bila tidak ada); kolom NO-GO tetap tampil dengan alasan; nilai terbaik hanya disorot di antara kolom bukan NO-GO; impor berkas `karhutla-decision-v1` berhasil.
- **Bukti:** `npm run uji:sippa`; laporan `inp-reviewer`.
- **Rujukan:** PRD §9.5, §1.3 U10; DS bagian layar Studio. **Ukuran:** L

#### SP-043 Layar Pemicu dan rencana pra-posisi
- **Berkas:** `public/pipa/layar_pemicu.js`.
- **Tujuan:** kartu judul, tabel kabupaten, grafik 7 hari P(FWI ≥ 14), aksi "Buat rencana pra-posisi" (gerak `rencana: 1`).
- **Pengerja / pemeriksa:** `sippa` / `selera-angka`, `inp-reviewer`.
- **Model:** sonnet.
- **Dependensi:** SP-012, SP-023, SP-025, SP-029. **Paralel dengan:** SP-027, SP-041, SP-048, SP-064. **Isolasi:** worktree ya.
- **Selesai bila:** ansambel basi = PRA-POSISI/GELAR tampil "–, data ansambel basi"; gerak rencana tampil di layar Kit sampai dikonfirmasi tiba.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.4.4, §10.2 W-09; DS bagian layar Pemicu. **Ukuran:** M

#### SP-044 Templat laporan kejadian, mingguan, musim, skenario
- **Berkas:** `public/pipa/laporan_isi.js`, `public/pipa/layar_laporan.js`, `tests/sippa/laporan_isi.test.mjs`.
- **Antarmuka:** Konsumsi: `isiLaporan` (SP-037). Hasil: jenis `kejadian`, `mingguan`, `musim`, `skenario`.
- **Tujuan:** empat templat sisa; laporan mingguan memuat gerak kit, jam pompa dan m3 banjir per kit dan kabupaten, BBM, kehilangan, alarm, tugas aktif (U9).
- **Pengerja / pemeriksa:** `sippa` / `selera-angka`, `security-reviewer`.
- **Model:** sonnet.
- **Dependensi:** SP-037. **Paralel dengan:** SP-042, SP-068, SP-069, SP-070. **Isolasi:** worktree ya.
- **Selesai bila:** aturan isi PRD §9.10 lolos untuk lima templat.
- **Bukti:** `node --test tests/sippa/laporan_isi.test.mjs`.
- **Rujukan:** PRD §9.10, §4.1 minggu 48–52. **Ukuran:** M

#### SP-045 Pengingat mingguan SIPPA di Meja Pantau
- **Berkas:** `src/pengingat.js` (`buatPengingat`, dipanggil cron 00.40 UTC = 07.40 WIB di `src/worker.js`; tambah sumber SIPPA yang hanya aktif hari Senin), `tests/warga/sippa.test.mjs`.
- **Tujuan:** Senin 07.40 WIB, selama ada kit berstatus `banjir` atau `gelar`, butir pengingat "Buat laporan mingguan SIPPA" masuk Meja Pantau; tanpa jadwal cron baru.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`.
- **Model:** sonnet; pemeriksa haiku.
- **Dependensi:** SP-008. **Paralel dengan:** SP-050, SP-071, SP-072, SP-073. **Isolasi:** worktree ya.
- **Selesai bila:** tanpa kit aktif tidak ada butir; dengan kit `banjir` ada satu butir per minggu.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.10. **Ukuran:** S

#### SP-046 Tinjauan R2
- **Pengerja / pemeriksa:** `guard-api`, `selera-angka`, `higiene-repo` (haiku); `security-reviewer`, `inp-reviewer`, `validasi-model` (sonnet).
- **Berkas:** tidak ada. **Tujuan:** tinjauan SP-040 s.d. SP-045. **Model:** haiku/sonnet.
- **Dependensi:** SP-041 s.d. SP-045. **Paralel dengan:** satu sama lain. **Isolasi:** tidak.
- **Selesai bila:** nol temuan kritis terbuka. **Bukti:** laporan; `npm run uji`; `npm run uji:sippa`.
- **Rujukan:** PRD §9.12.1. **Ukuran:** S

#### SP-047 [induk] Commit dan deploy R2
- **Tujuan:** Studio, Pemicu, lima templat laporan, pengingat di produksi paling lambat 22 Nov, sebelum kit dipindah ke banjir (minggu 48).
- **Berkas:** berkas SP-040 s.d. SP-045.
- **Pengerja / pemeriksa:** sesi induk / `higiene-repo`. **Model:** opus.
- **Dependensi:** SP-046. **Paralel dengan:** tidak. **Isolasi:** tidak.
- **Selesai bila:** uji asap `/pipa/studio` dan `/pipa/pemicu` 200 dengan sesi; satu laporan mingguan dummy terbit lalu dihapus.
- **Bukti:** log deploy.
- **Rujukan:** PRD §10.2, §10.6. **Ukuran:** S

### 3.F Web rilis R3 (23 Nov–6 Des): 3D, telemetri, dummy, alur, rilis lengkap

#### SP-048 Vendor three 0.169.0
- **Berkas:** `public/vendor/three/three.module.min.js`, `public/vendor/three/addons/controls/OrbitControls.js` (impor `"three"` ditulis ulang ke `../../three.module.min.js`), `public/vendor/three/LICENSE`, `public/vendor/three/README.md`.
- **Antarmuka:** Hasil: `public/vendor/three/three.module.min.js` (REVISION 169). Dipakai SP-049.
- **Tujuan:** Three.js lokal (CSP menolak CDN dan import map sebaris), versi sama dengan `public/sim_adegan.js`.
- **Pengerja / pemeriksa:** `layar-peta` / `higiene-repo`.
- **Model:** haiku (salin dan satu tulis ulang tertulis).
- **Dependensi:** SP-002. **Paralel dengan:** SP-027, SP-041, SP-043, SP-064. **Isolasi:** worktree ya.
- **Selesai bila:** `OrbitControls.js` termuat tanpa import map; README mencatat versi dan langkah.
- **Bukti:** `node -e "import('./public/vendor/three/three.module.min.js').then(m=>console.log(m.REVISION))"` mencetak `169`.
- **Rujukan:** PRD §9.6. **Ukuran:** S

#### SP-049 Layar 3D
- **Berkas:** `public/pipa/adegan.js` (atas: logika murni diekspor; bawah: runtime malas), `public/pipa/adegan.css`, `public/pipa/layar_3d.js`, `tests/sippa/adegan_logika.test.mjs`.
- **Antarmuka:** Konsumsi: `SippaHitung.hidraulika`, kompleks terpilih dari query `?kompleks=`. Hasil: `adegan.js` mengekspor logika murni `tataKit()`, `profilTekanan(p)`, `frontBasah(Q, t, h, ne)` untuk uji.
- **Tujuan:** tiga adegan (susunan kit, jalur air dengan warna tekanan dari `hidraulika()`, injeksi dengan front basah ilustratif), panel teks berangka sama, jatuh ke SVG 2D tanpa WebGL, label "Ilustrasi, bukan model panas terkalibrasi".
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`.
- **Model:** sonnet.
- **Dependensi:** SP-030, SP-032, SP-048. **Paralel dengan:** SP-051, SP-074, SP-075. **Isolasi:** worktree ya.
- **Selesai bila:** komponen tidak saling tumpuk; profil tekanan = `hidraulika()`; front basah monoton naik; kedalaman > 5 ditolak; render hanya saat berubah; `prefers-reduced-motion` dihormati; `dispose` saat pindah layar.
- **Bukti:** `node --test tests/sippa/adegan_logika.test.mjs`.
- **Rujukan:** PRD §9.6, §10.2 W-10; DS bagian layar 3D; RU bagian 3D. **Ukuran:** L

#### SP-050 Migrasi 0057 dan rute telemetri, alarm, ringkas harian
- **Berkas:** `migrations/0057_sippa_telemetri.sql`, `src/sippa.js` (`POST/GET /api/sippa/telemetri`, `GET/POST /api/sippa/perangkat`, `POST /api/sippa/perangkat/:id/cabut`, `GET /api/sippa/alarm`, `POST /api/sippa/alarm/:id/tutup`, `dariDatar()`, aturan alarm; dummy layar `telemetri`), `src/worker.js` (ringkas harian dan hapus mentah > 30 hari di tugas bersih-bersih cron menit 17 yang ada), `tests/warga/sippa_skema.test.mjs`, `tests/warga/sippa.test.mjs`, `tests/warga/cakupan.json`.
- **Antarmuka:** Konsumsi: tabel 0055, cron menit 17 yang ada. Hasil: tabel 0057 PRD §9.11; `dariDatar(pesan)`; rute telemetri PRD §9.7.3.
- **Tujuan:** kerangka telemetri siap menerima data (keputusan 38).
- **Di luar:** jadwal cron baru (batas 5 jadwal akun Free).
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`, `guard-api`, `security-reviewer` (token perangkat).
- **Model:** sonnet; haiku untuk dua pemeriksa pertama.
- **Dependensi:** SP-006, SP-008. **Paralel dengan:** SP-045, SP-071, SP-072, SP-073. **Isolasi:** worktree ya.
- **Selesai bila:** token salah 401; nilai di luar rentang tersimpan `mutu = 2`; waktu 1 jam di depan ditolak; PK menolak ganda; > 500 bacaan atau > 64 KB ditolak; token tampil sekali dan hanya sha256 tersimpan.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.7.2 (0057), §9.11, §10.2 W-11; DT bagian telemetri; RU bagian telemetri. **Ukuran:** M

#### SP-051 Layar Telemetri
- **Berkas:** `public/pipa/layar_telemetri.js`.
- **Tujuan:** tabel perangkat, grafik 24 jam per tag dengan garis ambang, alarm aktif dan riwayat; keadaan kosong "Belum ada perangkat terdaftar ...".
- **Pengerja / pemeriksa:** `sippa` / `selera-angka`, `inp-reviewer`.
- **Model:** sonnet.
- **Dependensi:** SP-050. **Paralel dengan:** SP-049, SP-074, SP-075. **Isolasi:** worktree ya.
- **Selesai bila:** daftar perangkat Admin menampilkan token sekali; tag identik dengan P&ID SIPPA-G-02.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.11; DS bagian layar Telemetri. **Ukuran:** S

#### SP-052 Rantai dummy semua layar
- **Berkas:** `src/sippa.js` (`RANTAI_DUMMY` untuk semua layar PRD §9.14), `tests/warga/sippa.test.mjs`.
- **Antarmuka:** Konsumsi: semua tabel 0055–0057. Hasil: `RANTAI_DUMMY[layar]` untuk 12 layar (11 `LAYAR_SIPPA` + `lapangan`).
- **Tujuan:** tiap layar terisi tanpa nol palsu; vonis A/B tiga nilai muncul; hapus tidak menyentuh baris nyata.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `penulis-gerbang`.
- **Model:** sonnet. Baca `~/.claude/DUMMY.md` dulu.
- **Dependensi:** SP-029, SP-035, SP-050. **Paralel dengan:** SP-053, SP-054, SP-055, SP-076. **Isolasi:** worktree ya.
- **Selesai bila:** untuk tiap layar, `dummy/isi` lalu endpoint penyuapnya: tiap kolom angka bukan nol; `dummy/hapus` lalu nol baris dummy dan baris nyata utuh.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.14, §10.2 W-12; RU bagian dummy. **Ukuran:** M

#### SP-053 Tombol isi dan hapus dummy di semua layar
- **Berkas:** `public/pipa/app.js` (dua ikon Super Admin di tempat yang sama tiap layar, muat ulang penuh sesudahnya).
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`.
- **Model:** sonnet. Baca `~/.claude/DUMMY.md` dulu.
- **Dependensi:** SP-031 s.d. SP-037, SP-042, SP-043, SP-049, SP-051 (rute dummy dari SP-008 dan SP-052). **Paralel dengan:** SP-052, SP-054, SP-055, SP-076. **Isolasi:** worktree ya.
- **Selesai bila:** hanya Super Admin melihat ikon; pemeriksaan akhir bersama SP-052 di SP-056.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.2.1 (keadaan kosong), §9.14. **Ukuran:** S

#### SP-054 Uji alur lintas-tabel
- **Berkas:** `tests/warga/sippa_alur.test.mjs`, `tests/warga/cakupan.json`.
- **Tujuan:** satu uji ujung ke ujung: Admin membuat kit, perencana menugaskan, operator kirim log 6 tahap + probe + BBM, gerak gelar lalu kembali, pindah banjir (YonTP, ETA), konfirmasi tiba, log banjir m3, kembali ke gudang, cek komponen dengan satu hilang; rekap log, kehilangan 1/n, dan `isiLaporan` mingguan cocok persis dengan tabel; tiap langkah di `pantau_jejak`.
- **Pengerja / pemeriksa:** `warga-api` / `penulis-gerbang`.
- **Model:** sonnet.
- **Dependensi:** SP-008, SP-035, SP-044. **Paralel dengan:** SP-052, SP-053, SP-055, SP-076. **Isolasi:** worktree ya.
- **Selesai bila:** uji hijau dan merah bila satu langkah dilanggar (mis. transisi tidak sah).
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.12.2 baris alur lintas-tabel, §10.2 W-13; RU bagian alur. **Ukuran:** M

#### SP-055 Gerbang SIPPA lengkap, aksesibilitas, tema gelap, ponsel
- **Berkas:** `tests/sippa/gerbang-sippa.test.mjs` (butir 6: tiap handler `click`/`input` di `public/pipa/layar_*.js` yang memanggil fungsi gambar berat terdaftar memanggilnya lewat `nanti(`), perbaikan kecil di `public/pipa/**` yang ditemukan sapuan.
- **Tujuan:** WCAG 2.2 AA (PRD §9.13), tema gelap di semua layar, tampilan ponsel, INP.
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `penulis-gerbang`. Baca `~/.claude/INP.md` dulu.
- **Model:** sonnet.
- **Dependensi:** semua tiket layar (SP-010 s.d. SP-012, SP-031 s.d. SP-033, SP-036, SP-037, SP-042, SP-043, SP-049, SP-051). **Paralel dengan:** SP-052, SP-053, SP-054, SP-076. **Isolasi:** worktree ya.
- **Selesai bila:** gerbang enam butir hijau; papan ketik menjangkau semua kontrol; kontras terang dan gelap lolos; target sentuh ≥ 44 px (lapangan ≥ 56 px).
- **Bukti:** `npm run uji:sippa`; laporan `inp-reviewer`.
- **Rujukan:** PRD §9.12.2 baris gerbang, §9.13, §1.3 U10; DS bagian aksesibilitas dan tema; RU bagian INP dan aksesibilitas. **Ukuran:** M

#### SP-056 Tinjauan penuh rilis lengkap
- **Pengerja / pemeriksa:** `guard-api`, `migrasi-idempoten`, `selera-angka`, `higiene-repo` (haiku); `security-reviewer`, `inp-reviewer`, `validasi-model` (sonnet).
- **Berkas:** tidak ada. **Tujuan:** sapuan seluruh `/pipa`, `src/sippa*.js`, migrasi 0055–0057, `scripts/data/sippa/**`. **Model:** haiku/sonnet.
- **Dependensi:** SP-048 s.d. SP-055. **Paralel dengan:** satu sama lain. **Isolasi:** tidak.
- **Selesai bila:** nol temuan kritis; daftar periksa serah PRD §12.3 bagian web tercentang.
- **Bukti:** laporan; `npm run uji`; `npm run uji:sippa`.
- **Rujukan:** PRD §10.2 W-14, §12.3. **Ukuran:** M

#### SP-057 [induk] Commit dan deploy R3 (rilis lengkap)
- **Tujuan:** semua layar PRD §9.1.1 di produksi paling lambat 6 Des (U5).
- **Berkas:** berkas SP-048 s.d. SP-055; `tests/warga/migrasi_beku.json` (0057).
- **Pengerja / pemeriksa:** sesi induk / `higiene-repo`. **Model:** opus.
- **Dependensi:** SP-056. **Paralel dengan:** SP-077, SP-078. **Isolasi:** tidak.
- **Selesai bila:** uji asap tiap rute halaman `LAYAR_SIPPA` 200 dengan sesi; satu pesan telemetri uji diterima dan ditandai di luar rentang lalu dihapus.
- **Bukti:** log deploy.
- **Rujukan:** PRD §10.2 W-15, §10.6. **Ukuran:** S

### 3.G Buku kajian dan deck (28 Okt–6 Des)

Semua berkas di `data/kajian-bnpb/**` dimiliki `pipa-data` (PRD §9.12.1). Tiket menulis naskah dikerjakan subagent penulis `general-purpose` (diturunkan ke sonnet oleh `CLAUDE_CODE_SUBAGENT_MODEL`) lewat workflow `naskah-kajian.js`/`rakit-kajian.js` cabang `sippa` (SP-005); penyunting dan pemeriksa selalu agent baru, bukan penulisnya (AGENTS.md §3.2). Nama berkas naskah mengikuti pola repo yang dibaca `bangun.py`: `kajian/naskah/sippa/00-depan.md`, `bab-NN.md`, `90-lampiran.md`, `deck.json`, `bukti/bab-NN.md`. Isi per bab mengikuti KB; PRD §8.2 sebagai kerangka. Aturan bab: front matter `kajian: sippa`, `pertanyaan`, `ringkasan-bab`; semua angka lewat `{{angka:sippa.*}}`; pustaka APA 7; tanpa bab kritik; tanpa "terbukti" untuk SIPPA.

#### SP-058 Berkas bukti bab 1–5
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bukti/bab-01.md` s.d. `bab-05.md`.
- **Tujuan:** tiap bab punya Inti, Temuan bersumber, Inferensi, Celah, dari KD, baca-A/B/C, data `kajian/pipa/data/`, dan JSON SP-020/SP-021.
- **Di luar:** naskah bab.
- **Pengerja / pemeriksa:** penulis `general-purpose` / `validasi-model` (klaim angka cocok dengan data), penyunting `general-purpose` baru (QA lapis 1).
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-005, SP-021, KB. **Paralel dengan:** SP-029, SP-030, SP-034, SP-062. **Isolasi:** worktree ya.
- **Selesai bila:** tiap temuan menyebut berkas sumber dan baris/kunci; celah ditulis, bukan ditutup dengan tebakan.
- **Bukti:** `cd data/kajian-bnpb/bangun/kontrak && python3 naskah.py ../../naskah/sippa/bukti/bab-0[1-5].md` (bila kontrak memeriksa bukti; bila tidak, QA lapis 1 tertulis di laporan).
- **Rujukan:** PRD §8.2 bab 1–5, §8.4 langkah 2, §10.3 B-02; KB bab 1–5. **Ukuran:** M

#### SP-059 Berkas bukti bab 6–10
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bukti/bab-06.md` s.d. `bab-10.md`.
- **Tujuan:** sama dengan SP-058 untuk hidraulika, komponen dan gambar, operasi dan SOP, kelembagaan dan RACI, pemakaian ganda banjir dan irigasi.
- **Pengerja / pemeriksa:** penulis `general-purpose` / `validasi-model`, penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-005, SP-019 (angka hidraulika). **Paralel dengan:** SP-036, SP-037, SP-040, SP-060. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-058; RACI satu A per baris; syarat keras anti de-watering tertulis untuk banjir dan irigasi.
- **Bukti:** seperti SP-058 untuk `bab-0[6-9].md bab-10.md`.
- **Rujukan:** PRD §3.3, §5.4–5.8, §6, §8.2 bab 6–10; KB bab 6–10. **Ukuran:** M

#### SP-060 Berkas bukti bab 11–15
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bukti/bab-11.md` s.d. `bab-15.md`.
- **Tujuan:** pilot dan program uji, anggaran dan NPV/BCR/Monte Carlo, risiko, peta jalan, keputusan yang diminta.
- **Pengerja / pemeriksa:** penulis `general-purpose` / `validasi-model`, penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-005. **Paralel dengan:** SP-036, SP-037, SP-040, SP-059. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-058; hasil pilot ditulis sebagai slot sampai SP-072; harga heli slot `menunggu` (T-A).
- **Bukti:** seperti SP-058 untuk `bab-1[1-5].md`.
- **Rujukan:** PRD §4, §8.2 bab 11–15, §11; KB bab 11–15. **Ukuran:** M

#### SP-061 Pustaka dicek ke naskah asli
- **Berkas:** `data/kajian-bnpb/pustaka.json`.
- **Tujuan:** sumber PRD §8.3 (Page 2002, Ballhorn 2009, Santoso 2021, Mulyasih UI, PP 57/2016, Permen LHK P.32/2016, datasheet, BNPB 2023, Kemenhut OMC 2026, BRGM 2021, LPDS 2016, Mongabay 2015, CHIRPS, WorldCover, FIRMS, SiPongi) dicek ke naskah asli; sumber berita ditandai; benchmark luar negeri berlabel "belum diverifikasi" sampai dikutip dari aslinya (G18).
- **Pengerja / pemeriksa:** penulis riset `general-purpose` / `general-purpose` baru (cek acak 10 rujukan ke asli).
- **Model:** sonnet.
- **Dependensi:** SP-004. **Paralel dengan:** SP-063, SP-066, SP-067. **Isolasi:** worktree ya.
- **Selesai bila:** ≥ 50 sumber, separuh resmi/primer, ≥ 8 per bab atau nilai `tema.json qa.pustaka` kajian `sippa`.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python qa/periksa.py --kajian sippa --berkas-saja --semua` (bagian pustaka).
- **Rujukan:** PRD §8.3, §10.3 B-04; KB bagian pustaka. **Ukuran:** M

#### SP-062 Tabel harga dan `sippa_keuangan.py`
- **Berkas:** `data/sippa/harga.csv`, `data/kajian-bnpb/bangun/sippa_keuangan.py`.
- **Antarmuka:** Hasil: `data/sippa/harga.csv` (kolom `kode, uraian, satuan, harga_rp, sumber, tanggal, keyakinan, rentang_rendah, rentang_tinggi, per` dengan `per` ∈ kit/lokasi/depot/program), kunci `sippa.rab.*`, `sippa.npv.*` yang dibaca `sippa_angka.py`. Dipakai SP-041 (preset S0, S0B), SP-063, SP-070.
- **Tujuan:** RAB dihitung ulang (keputusan 13) bertingkat T0/T0B, T1, T2, T3, T4; OPEX kering/basah; TCO nominal dan terdiskonto 8%; NPV/BCR tiga skenario manfaat (0, regu terhindar, heli-hari terhindar `menunggu`) dan varian + banjir, + banjir + irigasi; Monte Carlo P10/P50/P90 berbenih; kepekaan 22.700 ha/kit ±50%.
- **Di luar:** angka heli kontrak (T-A); nilai manfaat resmi (T-F).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-022. **Paralel dengan:** SP-029, SP-030, SP-034, SP-058. **Isolasi:** worktree ya.
- **Selesai bila:** self-check mereproduksi urutan besaran contoh T2 PRD §11.1 (Rp13,7–18,9 M dipinjam; Rp16,2–21,4 M dibeli) sebagai rentang; manfaat bawaan 0; manfaat irigasi 0 bila syarat keras tidak dicentang; tidak memakai Rp364 M.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/sippa_keuangan.py`.
- **Rujukan:** PRD §11.1, §9.3 (`npv`, `bcr`, `impas`), §12.1 G02, G06–G10; DT bagian keuangan. **Ukuran:** M

#### SP-063 Registri angka `sippa_angka.py`
- **Berkas:** `data/kajian-bnpb/bangun/sippa_angka.py`, `data/kajian-bnpb/data/angka.json` (kunci `sippa.*` saja).
- **Antarmuka:** Konsumsi: semua JSON `data/sippa/keluaran/`, CSV `kajian/pipa/data/`, keluaran SP-019 dan SP-062, ekspor D1 pilot (diperbarui di SP-072). Hasil: kunci `sippa.*` (dua versi zona, jarak, DEM, GSW, MCD64A1, CHIRPS, VIIRS, sel22, kit, hid, rab, npv, pilot) masing-masing berlabel keyakinan dan sumber.
- **Tujuan:** tiap angka buku dan deck punya satu kunci (U2).
- **Di luar:** kunci kajian lain di `angka.json`.
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`, `selera-angka`.
- **Model:** sonnet.
- **Dependensi:** SP-019, SP-021, SP-022, SP-023, SP-024, SP-062. **Paralel dengan:** SP-061, SP-066, SP-067. **Isolasi:** worktree ya.
- **Selesai bila:** self-check: tiap kunci berlabel dan bersumber; slot kosong berlabel `menunggu` dengan alasan; kunci kajian lain tidak berubah (dibandingkan sebelum dan sesudah).
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/sippa_angka.py`.
- **Rujukan:** PRD §7.2, §8.3, §10.3 B-03. **Ukuran:** M

#### SP-064 Gambar peta dan grafik buku
- **Berkas:** spek di `data/kajian-bnpb/bangun/visual/spek-sippa/*.json` (pola spek yang ada), keluaran `data/kajian-bnpb/gambar/sippa/*.png`.
- **Tujuan:** peta zona Kalteng dua versi, peta sel 2,2 km, peta Indonesia kit per provinsi (`peta.mjs`); grafik VIIRS per tahun, CHIRPS anomali, histogram MCD64A1, kurva head loss, serap lance, CAPEX bertingkat, kipas Monte Carlo (`dasar.mjs`).
- **Pengerja / pemeriksa:** `pipa-data` / `selera-angka`, `general-purpose` baru (D-8, D-21, D-24, D-28 lewat `periksa.py --visual`).
- **Model:** sonnet.
- **Dependensi:** SP-063. **Paralel dengan:** SP-027, SP-041, SP-043, SP-048. **Isolasi:** worktree ya.
- **Selesai bila:** PNG 300 dpi; tiap gambar punya Sumber dan legenda; warna zona disertai pola dan huruf A–D.
- **Bukti:** `cd data/kajian-bnpb && node bangun/visual/render.mjs <spek>` lalu `.venv/bin/python qa/periksa.py --visual bangun/visual/keluaran --kajian sippa --berkas-saja`.
- **Rujukan:** PRD §8.2 kolom Gambar, §8.4 langkah 4, §10.3 B-05; KB daftar gambar. **Ukuran:** M

#### SP-065 Gambar teknik SIPPA-G-01 s.d. G-06
- **Berkas:** `data/kajian-bnpb/bangun/visual/teknik/blok.mjs` (blok judul dan blok pengesahan kosong bersama), `data/kajian-bnpb/bangun/visual/teknik/g01.mjs` s.d. `g06.mjs`, keluaran `data/kajian-bnpb/gambar/sippa/teknik/SIPPA-G-0[1-6].png` dan `.pdf` (A3).
- **Tujuan:** GA kit relay, P&ID, detail lance 1,5 m dan teleskopik 3–5 m, manifold DN100 ke 4 x DN65, depot depan, gudang induk YonTP, tingkat konstruksi dengan catatan "Wajib verifikasi dan pengesahan insinyur berlisensi sebelum dibangun".
- **Di luar:** mengisi blok pengesahan.
- **Pengerja / pemeriksa:** `pipa-data` / `general-purpose` baru (daftar periksa kriteria terima PRD §6.9 per gambar).
- **Model:** sonnet.
- **Dependensi:** SP-004, DT (BOM dan tag P&ID). **Paralel dengan:** SP-019, SP-025. **Isolasi:** worktree ya.
- **Selesai bila:** kriteria terima PRD §6.9 tercentang untuk G-01 s.d. G-06; tag G-02 identik dengan daftar tag PRD §9.11.
- **Bukti:** `cd data/kajian-bnpb && node bangun/visual/teknik/g01.mjs` (dan seterusnya; tiap berkas self-check blok judul lengkap).
- **Rujukan:** PRD §6.1, §6.9, §10.3 B-06. **Ukuran:** L

#### SP-066 Gambar teknik SIPPA-G-07 s.d. G-12
- **Berkas:** `data/kajian-bnpb/bangun/visual/teknik/g07.mjs` s.d. `g12.mjs`, keluaran `data/kajian-bnpb/gambar/sippa/teknik/SIPPA-G-07..12.png` dan `.pdf`.
- **Tujuan:** rumah pompa panggung (koridor, bila dibuka), profil trase dari DEMNAS, modul banjir GA dan P&ID, skema telemetri dan daya, diagram zona dan alur keputusan sarana (identik `saranSarana`), tata letak petak A/B dan grid probe.
- **Pengerja / pemeriksa:** `pipa-data` / `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-065, SP-030 (`saranSarana`). **Paralel dengan:** SP-061, SP-063, SP-067. **Isolasi:** worktree ya.
- **Selesai bila:** kriteria PRD §6.9 tercentang; G-08 **tertahan** sampai DEMNAS AOI tersedia (kriteria "dari DEMNAS nyata, bukan sintetis"); sementara G-08 tidak dirender dan Lampiran D mencatatnya sebagai "menunggu DEMNAS" (lihat §10).
- **Bukti:** `node bangun/visual/teknik/g07.mjs` dst.
- **Rujukan:** PRD §6.9, §5.4, §9.3 `saranSarana`. **Ukuran:** L

#### SP-067 Surat permintaan data (Lampiran C)
- **Berkas:** `data/kajian-bnpb/pipa/surat/big.md`, `bws-kalimantan-ii.md`, `walidata-khg-brgm.md`, `bmkg.md`, `bpbd-kalteng.md`, `manggala-agni.md`, `badan-geologi.md`, `atr-bpn-pemda.md`, `lkpp-oem.md`, `bnpb-internal.md`.
- **Tujuan:** 10 draf kop BNPB, ID data D01–D36 pemilik dipertahankan, siap kirim minggu 47.
- **Di luar:** mengirim surat (pemilik).
- **Pengerja / pemeriksa:** penulis `general-purpose` / penyunting `general-purpose` baru (slop dan bahasa).
- **Model:** sonnet.
- **Dependensi:** SP-004. **Paralel dengan:** SP-061, SP-063, SP-066. **Isolasi:** worktree ya.
- **Selesai bila:** satu surat per instansi PRD §7.5 dengan daftar data, format, dan tenggat; tanpa nama perusahaan.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python qa/slop.py --ambang --laporan pipa/surat/*.md`.
- **Rujukan:** PRD §7.5, §4.1 minggu 47, §10.3 B-11. **Ukuran:** M

#### SP-068 Naskah bab 1–4
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-01.md` s.d. `bab-04.md`.
- **Tujuan:** Pendahuluan; Bara gambut; Pola api; Kelayakan kit per zona dan provinsi (dua versi zona, 81 kit "rencana bersyarat, bukan pengadaan").
- **Pengerja / pemeriksa:** penulis `general-purpose` / penyunting substansi `general-purpose` baru (SP-075 menjalankan per bab).
- **Model:** sonnet.
- **Dependensi:** SP-058, SP-061, SP-063, SP-064. **Paralel dengan:** SP-042, SP-044, SP-069, SP-070. **Isolasi:** worktree ya.
- **Selesai bila:** dialek NASKAH-SPEK lolos; token angka saja; slop LULUS.
- **Bukti:** `cd data/kajian-bnpb && python3 bangun/kontrak/naskah.py naskah/sippa/bab-0[1-4].md && .venv/bin/python qa/slop.py --ambang --laporan naskah/sippa/bab-0[1-4].md`.
- **Rujukan:** PRD §8.2 bab 1–4; KB bab 1–4. **Ukuran:** L

#### SP-069 Naskah bab 5–8
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-05.md` s.d. `bab-08.md`.
- **Tujuan:** Desain SIPPA (empat lapis, yang ditutup sebagai batas desain); Hidraulika dan titik kerja; Spesifikasi komponen dan gambar teknik; Operasi (6 SOP bernomor, matriks respons, K3, logistik YonTP, pelatihan 58 jam, G6).
- **Pengerja / pemeriksa:** penulis `general-purpose` / penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-058 (bab 5), SP-059, SP-063, SP-064, SP-065. **Paralel dengan:** SP-042, SP-044, SP-068, SP-070. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-068; tiap SOP punya tujuan, pelaku, prasyarat, langkah, titik berhenti, formulir, rujukan.
- **Bukti:** seperti SP-068 untuk `bab-0[5-8].md`.
- **Rujukan:** PRD §5.3–5.8, §6, §8.2 bab 5–8; KB bab 5–8. **Ukuran:** L

#### SP-070 Naskah bab 9–12
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-09.md` s.d. `bab-12.md`.
- **Tujuan:** Kelembagaan (RACI, BMN pinjam pakai, opsi konsesi); Pemakaian ganda banjir dan irigasi (BCR inti, + banjir, + banjir + irigasi); Pilot 2026 dan program uji 2027–2028 (hasil pilot sebagai slot); Anggaran, NPV, BCR, Monte Carlo.
- **Pengerja / pemeriksa:** penulis `general-purpose` / penyunting `general-purpose` baru, `validasi-model` (bab 12).
- **Model:** sonnet.
- **Dependensi:** SP-059, SP-060, SP-062, SP-063. **Paralel dengan:** SP-042, SP-044, SP-068, SP-069. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-068; tanpa bab dasar hukum TNI; heli `menunggu` dengan pembanding resmi > Rp200 juta per sorti.
- **Bukti:** seperti SP-068 untuk `bab-09.md bab-1[0-2].md`.
- **Rujukan:** PRD §3.3, §3.4, §5.6, §5.7, §8.2 bab 9–12, §11.1; KB bab 9–12. **Ukuran:** L

#### SP-071 Naskah bab 13–15
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-13.md` s.d. `bab-15.md`.
- **Tujuan:** Risiko dan mitigasi (register L x I); Peta jalan 2026–2030 dengan rekomendasi `@rek:`; Kesimpulan dan keputusan yang diminta (tiga keputusan, tanpa ulangan).
- **Pengerja / pemeriksa:** penulis `general-purpose` / penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-060, SP-063. **Paralel dengan:** SP-045, SP-050, SP-072, SP-073. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-068.
- **Bukti:** seperti SP-068 untuk `bab-1[3-5].md`.
- **Rujukan:** PRD §4, §11.2, §8.2 bab 13–15; KB bab 13–15. **Ukuran:** M

#### SP-072 Bab 11: hasil pilot dari D1
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-11.md` (bagian hasil pilot), `data/kajian-bnpb/pipa/data/pilot-2026.csv` (ekspor `GET /api/sippa/log.csv` dan probe oleh sesi induk, koordinat dibulatkan 0,01°), `data/kajian-bnpb/bangun/sippa_angka.py` (kunci `sippa.pilot.*`).
- **Tujuan:** Tabel 11.3 hasil pilot Okt; dua vonis dipisah; pil "pilot, n kecil".
- **Pengerja / pemeriksa:** penulis `general-purpose` (naskah) dan `pipa-data` (kunci angka) berurutan dalam satu worktree / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-018, SP-037, SP-070. **Paralel dengan:** SP-045, SP-050, SP-071, SP-073. **Isolasi:** worktree ya.
- **Selesai bila:** angka pilot lewat `angka.json`; tidak ada vonis G4 dari pilot.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/sippa_angka.py && python3 bangun/kontrak/naskah.py naskah/sippa/bab-11.md`.
- **Rujukan:** PRD §1.3 U3–U4, §8.2 bab 11, §10.3 B-10. **Ukuran:** S

#### SP-073 Lampiran A, B, E–K
- **Berkas:** `data/kajian-bnpb/naskah/sippa/90-lampiran.md`.
- **Tujuan:** A metode dan data (PRD §7.1, lineage, tanggal tarik, batas 23 Okt 2026 23.59 WIB); B tabel kelayakan per kompleks Kalteng dan per kabupaten 9 provinsi (`csv:` dari `kelayakan_kompleks.json`); C dirujuk dari SP-067; D dirujuk dari SP-065/SP-066; E SOP-01 s.d. SOP-06 lengkap dan formulir (G3-lite, probe, BBM, gerak kit); F BOM rinci dan kriteria terima, ukuran gudang; G protokol A/B pra-registrasi versi buku (diturunkan dari PRD §4.4 dan §9.4.7; versi KAK di SP-082); H rumus dan uji invarian hidraulika dari `acuan.json`; I benchmark luar negeri berlabel; J glosarium dan singkatan; K batas pemakaian alat `/pipa` disalin dari `public/pipa/batas.js` `BATAS_ALAT` (sumber tunggal).
- **Pengerja / pemeriksa:** penulis `general-purpose` / penyunting `general-purpose` baru, `validasi-model` (G dan H).
- **Model:** sonnet.
- **Dependensi:** SP-009, SP-021, SP-030, SP-065, SP-066, SP-067, SP-069. **Paralel dengan:** SP-045, SP-050, SP-071, SP-072. **Isolasi:** worktree ya.
- **Selesai bila:** sebelas lampiran ada; teks K identik dengan `BATAS_ALAT` (diperiksa dengan `diff` setelah ekstrak).
- **Bukti:** `cd data/kajian-bnpb && python3 bangun/kontrak/naskah.py naskah/sippa/90-lampiran.md`.
- **Rujukan:** PRD §8.2 Lampiran A–K, §9.4.8; KB lampiran. **Ukuran:** L

#### SP-074 Bagian depan dan Ringkasan Eksekutif
- **Berkas:** `data/kajian-bnpb/naskah/sippa/00-depan.md`.
- **Tujuan:** sampul, kolofon dengan batas data, Kata Pengantar Kepala BNPB (draf berpenanda periksa pemilik bila T-G belum dijawab), Ringkasan Eksekutif dua lapis (Pesan Kunci 6–8 temuan berangka + pita tiga keputusan, lalu ringkasan per bab), singkatan yang benar-benar dipakai.
- **Pengerja / pemeriksa:** penulis `general-purpose` / penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-068 s.d. SP-073. **Paralel dengan:** SP-049, SP-051, SP-075. **Isolasi:** worktree ya.
- **Selesai bila:** tidak ada angka atau klaim yang tidak ada di bab; slop LULUS.
- **Bukti:** `cd data/kajian-bnpb && python3 bangun/kontrak/naskah.py naskah/sippa/00-depan.md && .venv/bin/python qa/slop.py --ambang --laporan naskah/sippa/00-depan.md`.
- **Rujukan:** PRD §8.2 baris Depan, §2.2 T-G; KB bagian depan. **Ukuran:** M

#### SP-075 Sunting substansi
- **Berkas:** `data/kajian-bnpb/naskah/sippa/*.md`, `data/kajian-bnpb/bangun/sippa_angka.py` (hanya menambah kunci untuk angka yang ditemukan tanpa token).
- **Tujuan:** tiap angka ke `angka.json`, tiap klaim ke sumber, paragraf kosong dipotong (QA lapis 2).
- **Pengerja / pemeriksa:** penyunting `general-purpose` baru per kelompok bab (bukan penulisnya) / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-068 s.d. SP-074 (boleh per bab segera setelah bab itu selesai). **Paralel dengan:** antar kelompok bab; SP-049, SP-051, SP-074. **Isolasi:** worktree ya.
- **Selesai bila:** nol angka ketikan (D-22).
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python qa/periksa.py --kajian sippa --berkas-saja --semua` (gerbang D-22).
- **Rujukan:** PRD §8.3, §10.3 B-08. **Ukuran:** M

#### SP-076 Sunting bahasa dan anti-slop
- **Berkas:** `data/kajian-bnpb/naskah/sippa/*.md`, `data/kajian-bnpb/keluaran/qa/slop-sippa.md`.
- **Tujuan:** PUEBI, glosarium, ANTI-SLOP sampai semua bab LULUS (QA lapis 3).
- **Pengerja / pemeriksa:** penyunting bahasa `general-purpose` (sonnet untuk tulis ulang, haiku untuk pindai) / `general-purpose` baru.
- **Model:** sonnet / haiku.
- **Dependensi:** SP-075. **Paralel dengan:** SP-052 s.d. SP-055. **Isolasi:** worktree ya.
- **Selesai bila:** laporan `slop-sippa.md` LULUS semua berkas.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python qa/slop.py --ambang --laporan naskah/sippa/*.md`.
- **Rujukan:** PRD §8.4 langkah 5 dan 8, §10.3 B-09. **Ukuran:** M

#### SP-077 Bangun DOCX dan PDF
- **Berkas:** `data/kajian-bnpb/keluaran/sippa.docx`, `sippa.pdf`, `sippa.manifest.json`; perbaikan mesin di `data/kajian-bnpb/bangun/docx/bangun.py` hanya bila gerbang gagal karena mesin.
- **Tujuan:** buku A4 tegak Roboto, logo BNPB saja, foto Commons beratribusi, tanpa batas halaman.
- **Pengerja / pemeriksa:** `pipa-data` / `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-064, SP-065, SP-066, SP-073, SP-074, SP-076. **Paralel dengan:** SP-057, SP-078. **Isolasi:** worktree ya.
- **Selesai bila:** `periksa.py --ketat` nol gagal; halaman PDF = halaman DOCX.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/docx/bangun.py sippa && .venv/bin/python qa/periksa.py --docx keluaran/sippa.docx --pdf keluaran/sippa.pdf --manifest-docx keluaran/sippa.manifest.json --visual bangun/visual/keluaran --kajian sippa --ketat`.
- **Rujukan:** PRD §8.4 langkah 6, §10.3 B-12. **Ukuran:** M

#### SP-078 Spek deck dan bangun PPTX dan PDF
- **Berkas:** `data/kajian-bnpb/naskah/sippa/deck.json` (spek; pola repo, menggantikan jalur `bangun/pptx/spek/sippa-deck.json` di PRD §8.4 yang tidak ada), `data/kajian-bnpb/keluaran/sippa-deck.pptx`, `sippa-deck.pdf`, `sippa-deck.manifest.json`.
- **Tujuan:** sekitar 15 slide sesuai PRD §8.5 (16 + L1–L3), S1–S39, angka deck = angka DOCX (token sama), pil CUT OFF `23 Okt 2026, 23.59 WIB`.
- **Pengerja / pemeriksa:** `pipa-data` / `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-063, SP-064, SP-076. **Paralel dengan:** SP-057, SP-077. **Isolasi:** worktree ya.
- **Selesai bila:** `jenis_slide` berurutan tidak berulang (S35); stem berbeda dari DOCX; QA nol gagal.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/pptx/deck.py naskah/sippa/deck.json keluaran/sippa-deck.pptx --pdf && .venv/bin/python qa/periksa.py --pptx keluaran/sippa-deck.pptx --pptx-pdf keluaran/sippa-deck.pdf --manifest-pptx keluaran/sippa-deck.manifest.json --kajian sippa --ketat`.
- **Rujukan:** PRD §8.5, §10.3 B-13; KB bagian deck. **Ukuran:** M

#### SP-079 QA lima lapis dan proofread render
- **Berkas:** `data/kajian-bnpb/keluaran/qa/sippa.md` (laporan); perbaikan dikembalikan ke tiket asal.
- **Tujuan:** lima lapis (pemindai, substansi, bahasa, proofread render halaman utuh dibagi tiga pembaca, gerbang mekanis).
- **Pengerja / pemeriksa:** tiga proofreader `general-purpose` baru + pemindai haiku; pembetul `pipa-data`/penulis.
- **Model:** sonnet (proofread), haiku (pindai).
- **Dependensi:** SP-077, SP-078. **Paralel dengan:** antar pembaca. **Isolasi:** tidak (baca saja).
- **Selesai bila:** U1 dan U2 terpenuhi; daftar periksa serah PRD §12.3 bagian buku tercentang.
- **Bukti:** `keluaran/qa/sippa.md`; ulang perintah bukti SP-077 dan SP-078.
- **Rujukan:** PRD §1.3 U1–U2, §8.4 langkah 8, §10.3 B-14, §12.3. **Ukuran:** M

#### SP-080 [induk] Commit dan serah buku dan deck
- **Tujuan:** versi serah di `kajian/keluaran/` minggu 49 (paling lambat 6 Des).
- **Berkas:** semua berkas SP-058 s.d. SP-079; `data/sippa/harga.csv`.
- **Pengerja / pemeriksa:** sesi induk / `higiene-repo` (ukuran berkas, tanpa `* 2.*`).
- **Model:** opus. **Dependensi:** SP-079. **Paralel dengan:** tidak. **Isolasi:** tidak.
- **Selesai bila:** commit per tiket buku dengan path spesifik; manifest ada; pemilik menerima berkas.
- **Bukti:** `git log --oneline`; manifest.
- **Rujukan:** PRD §10.3 B-15, §10.7. **Ukuran:** S

### 3.H Program dan pasca-serah (Nov 2026–Jan 2027)

#### SP-081 [induk] Operasi banjir Nov–Des 2026
- **Tujuan:** bila pemilik memutus lanjut (minggu 45): tujuan banjir dari T-D dicatat, modul pompa banjir pinjaman BPBD dicatat sebagai komponen, kit dipindah dengan gerak `pindah_banjir` (pengangkut `yontp`), log banjir m3 tiap operasi, laporan mingguan PDF tiap Senin, kehilangan komponen dicatat (U8, U9).
- **Berkas:** tidak ada di repo (data D1, PDF di R2).
- **Pengerja / pemeriksa:** perencana staf BNPB dan BPBD/YonTP di layar; sesi induk memantau / pemilik.
- **Model:** tidak berlaku.
- **Dependensi:** SP-017, SP-018 (vonis), T-D; laporan mingguan butuh SP-047. **Paralel dengan:** gelombang 7–18. **Isolasi:** tidak.
- **Selesai bila:** tiap kit yang dipindah punya waktu pindah, lokasi, jam pompa, m3 (U9); laporan mingguan terarsip.
- **Bukti:** `GET /api/sippa/kit`, `GET /api/sippa/log?jenis=banjir`, `GET /api/sippa/laporan`.
- **Rujukan:** PRD §4.1 minggu 45–53, §5.6, §1.3 U8–U9. **Ukuran:** M

#### SP-082 Protokol A/B pra-registrasi dan KAK pilot 2027
- **Berkas:** `data/kajian-bnpb/pipa/protokol-ab.md`.
- **Tujuan:** empat lengan (konvensional, kit + lance, kit + surfaktan bebas PFAS, sekat kanal/rewetting) dan lengan uji `lance_dalam` 3–5 m; outcome, n ≥ 8 per lengan, 95% CI, titik cek 24 jam, 72 jam, 7, 30, 90 hari; KAK pilot 2027 dengan gerbang G0–G6.
- **Pengerja / pemeriksa:** penulis `general-purpose` / `validasi-model`, penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-080, SP-036 (kolom CSV identik). **Paralel dengan:** gelombang 17. **Isolasi:** worktree ya.
- **Selesai bila:** kolom data protokol identik dengan kolom CSV PRD §9.4.7; tanpa klaim efikasi.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python qa/slop.py --ambang --laporan pipa/protokol-ab.md`.
- **Rujukan:** PRD §4.1 minggu 51, §4.4, §9.4.7, §10.3 B-16. **Ukuran:** M

#### SP-083 Rekap 2026 dan errata angka
- **Berkas:** `data/kajian-bnpb/pipa/rekap-2026.md`; `data/kajian-bnpb/bangun/sippa_angka.py` dan `data/kajian-bnpb/data/angka.json` bila ada angka berubah; errata buku bila perlu.
- **Tujuan:** jam pompa, m3, kehilangan komponen, pelajaran 2026.
- **Pengerja / pemeriksa:** penulis `general-purpose` + `pipa-data` (angka) / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-081. **Paralel dengan:** SP-084 bagian akhir. **Isolasi:** worktree ya.
- **Selesai bila:** angka rekap dari D1, berlabel; errata menyebut halaman dan nilai lama/baru.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/sippa_angka.py`.
- **Rujukan:** PRD §4.1 minggu 53. **Ukuran:** S

#### SP-084 [induk] Penyelarasan dokumen saudara dan penutupan
- **Tujuan:** bagian awal (gelombang 0): setelah DS, DT, KB, RU selesai, ganti rujukan "bagian X" di berkas ini dengan nomor bagian, cek tidak ada tiket yang bertentangan dengan keempatnya, tambah tiket bila RU memuat area uji tanpa tiket. Bagian akhir (gelombang 18): semua status `selesai` atau `tertahan` beralasan; daftar `Ruling:` dari buku besar dilaporkan ke pemilik; buku besar `.superpowers/sdd/TIKET/` dihapus.
- **Berkas:** `data/kajian-bnpb/pipa/TIKET.md`.
- **Pengerja / pemeriksa:** sesi induk / pemilik.
- **Model:** opus.
- **Dependensi:** DS, DT, KB, RU (awal); semua tiket (akhir). **Paralel dengan:** SP-002. **Isolasi:** tidak.
- **Selesai bila:** §9 berkas ini tanpa baris "tanpa tiket".
- **Bukti:** `grep -n "bagian " data/kajian-bnpb/pipa/TIKET.md` hanya menyisakan rujukan bernomor.
- **Rujukan:** AGENTS.md §2.1. **Ukuran:** S

---

## 4. Grafik dependensi

Panah = "harus selesai sebelum". `[I]` = tiket sesi induk. Garis ganda `══>` = jalur kritis.

```
FONDASI DAN P0 (25-27 Okt)
SP-001 ══> SP-002 ══> SP-003 ══> SP-007 ══> SP-008 ══> SP-011 ══> SP-015 ══> SP-016[I] ══> SP-017[I] ══> SP-018[I] pilot
              │          │          ▲ │          ▲         ▲            ▲
              │          │   SP-006─┘ └> SP-009 ═╪═════════╪════════════╪══════════════════════> SP-018 (kertas, wajib)
              │          ├─> SP-010 ─────────────┴> SP-012 ┤            │
              │          │      └──> SP-014 ───────────────┘            │
              ├─> SP-013 ───────────────────────> SP-011, SP-012        │
              ├─> SP-004 ─> SP-005                                      │
              └─> SP-020 ─> SP-021 ─> SP-023                            │
                                  └─> SP-022 (SP-002)                   │
                                                                        │
PIPELINE DATA                                                            │
SP-010 ─> SP-019 ─┐                                                     │
SP-020..SP-023 ───┼─> SP-024 ─> SP-063                                  │
SP-020..SP-023 ───┴─> SP-025 ─> SP-029                                  │
SP-021 ─> SP-027;  SP-021 + SP-029 + SP-018 ─> SP-028                   │
SP-019 + SP-030 ─> SP-026                                               │
                                                                        │
WEB R1 (8 Nov)                                                           │
SP-008 + SP-025 ─> SP-029 ─┬─> SP-031 ─┐                                │
SP-010 ─> SP-030 ──────────┼─> SP-032 ─┤                                │
                           └─> SP-033 ─┤                                │
SP-006 ─> SP-034 ─> SP-035 ─┬> SP-036 ─┼─> SP-038 ─> SP-039[I]          │
                            └> SP-037 ─┘     (laporan pilot minggu 46) <┘

WEB R2 (22 Nov)
SP-002 ─> SP-040 ─┐
SP-062 ───────────┼─> SP-041 ─> SP-042 ─┐
SP-030 ───────────┘                     │
SP-012 + SP-023 + SP-025 + SP-029 ─> SP-043 ─┼─> SP-046 ─> SP-047[I]
SP-037 ─> SP-044 ───────────────────────┤
SP-008 ─> SP-045 ───────────────────────┘

WEB R3 (6 Des)
SP-002 ─> SP-048 ─> SP-049 ─┐
SP-006 + SP-008 ─> SP-050 ─> SP-051 ─┤
SP-029 + SP-035 + SP-050 ─> SP-052 ──┤
semua layar ─> SP-053, SP-055 ──────┼─> SP-056 ─> SP-057[I]
SP-008 + SP-035 + SP-044 ─> SP-054 ─┘

BUKU DAN DECK (6 Des)
SP-004 + SP-005 ─> SP-058, SP-059, SP-060, SP-061, SP-067
SP-004 + SP-022 ─> SP-062 ─> SP-063 ─> SP-064
SP-004 ─> SP-065 ─> SP-066 (G-08 tertahan DEMNAS)
SP-058 + SP-061 + SP-063 + SP-064 ─> SP-068 ─┐
SP-059 + SP-065 ─────────────────> SP-069 ───┤
SP-059 + SP-060 + SP-062 ────────> SP-070 ───┼─> SP-072 (+ SP-018, SP-037)
SP-060 ──────────────────────────> SP-071 ───┤
SP-009 + SP-030 + SP-065..067 + SP-069 ─> SP-073
SP-068..SP-073 ─> SP-074 ─> SP-075 ─> SP-076 ─┬─> SP-077 ─┬─> SP-079 ─> SP-080[I]
                                              └─> SP-078 ─┘

PROGRAM
SP-017 + SP-018 + T-D ─> SP-081[I] (laporan mingguan butuh SP-047) ─> SP-083
SP-080 + SP-036 ─> SP-082
DS, DT, KB, RU ─> SP-084[I] (awal); semua ─> SP-084[I] (akhir)
```

---

## 5. Gelombang paralel dan rencana sprint

Paling banyak 4–5 pengerja menulis bersamaan (kolom "Penulis"); pemeriksa dan tiket [induk] tidak dihitung. Kuota minggu 26 Okt–1 Nov paling banyak 60% untuk SIPPA (keputusan 48); urutan pangkas bila kuota menipis: P0 > angka (SP-019 s.d. SP-025, SP-062, SP-063) > naskah > layar perencanaan > 3D dan telemetri (PRD §10.5).

| Gel. | Tanggal | Penulis bersamaan | Pemeriksa dan [induk] |
| --- | --- | --- | --- |
| 0 | 25 Okt pagi | tidak ada | SP-001, SP-002, SP-084 (awal) |
| 1 | 25 Okt siang | SP-003, SP-004, SP-006, SP-020 | |
| 2 | 25 Okt malam | SP-005, SP-007, SP-013, SP-021 | |
| 3 | 26 Okt pagi | SP-008, SP-009, SP-010, SP-023 | |
| 4 | 26 Okt sore–27 Okt pagi | SP-011, SP-012, SP-014, SP-022 (SP-008 berlanjut) | |
| 5 | 27 Okt | SP-019, SP-025, SP-065 | SP-015, SP-016, SP-017 |
| 6 | 28 Okt–1 Nov | SP-029, SP-030, SP-034, SP-058, SP-062 | SP-018, SP-024 |
| 7 | 2–4 Nov | SP-026, SP-031, SP-032, SP-033, SP-035 | SP-081 mulai |
| 8 | 5–7 Nov | SP-036, SP-037, SP-040, SP-059, SP-060 | |
| 9 | 8 Nov | SP-061, SP-063, SP-066, SP-067 | SP-038, SP-039 |
| 10 | 9–13 Nov | SP-027, SP-041, SP-043, SP-048, SP-064 | |
| 11 | 14–18 Nov | SP-042, SP-044, SP-068, SP-069, SP-070 | |
| 12 | 18–22 Nov | SP-045, SP-050, SP-071, SP-072, SP-073 | SP-046, SP-047 |
| 13 | 23–27 Nov | SP-049, SP-051, SP-074, SP-075 | |
| 14 | 28 Nov–2 Des | SP-052, SP-053, SP-054, SP-055, SP-076 | |
| 15 | 3–6 Des | SP-077, SP-078 | SP-056, SP-057, SP-079, SP-080 |
| 16 | 7–13 Des | SP-028 | |
| 17 | 14–20 Des | SP-082 | |
| 18 | 28 Des–3 Jan | SP-083 | SP-084 (akhir) |

### Sprint 0: Siap pilot (25–27 Okt)
- **Tujuan sprint:** regu pilot memegang formulir kertas dan, bila uji lolos, tautan `/pipa/lapangan` yang tercatat di D1 produksi.
- **Kapasitas:** 3 hari x 4–5 pengerja paralel; beban direncanakan sekitar 75% supaya ada ruang putaran perbaikan tinjauan.
- **Wajib:** SP-001 s.d. SP-017, SP-020, SP-021, SP-023. **Regang (boleh pindah ke Sprint 1):** SP-019, SP-022, SP-025, SP-065, SP-005.
- **Tanggal kunci:** 25 Okt siang gelombang 1; 26 Okt pagi pemeriksaan tengah (SP-006, SP-007 hijau); 27 Okt sore tinjauan SP-015; 27 Okt malam putusan deploy atau kertas.

### Sprint 1: R1 perencanaan, A/B, laporan pilot (28 Okt–8 Nov)
- **Tujuan sprint:** perencana bisa melihat peta kelayakan, menghitung trase, melihat hasil pilot di A/B dengan label n kecil, dan membuat Laporan pilot PDF.
- **Kapasitas:** 12 hari x 5 pengerja, minggu pertama dibatasi kuota 60%. **Wajib:** SP-018, SP-024, SP-026, SP-029 s.d. SP-039, SP-058, SP-062. **Regang:** SP-040, SP-059, SP-060, SP-061, SP-063.
- **Tanggal kunci:** 1 Nov vonis "dapat dipakai"; 2–8 Nov keputusan banjir (T-D); 8 Nov deploy R1.

### Sprint 2: R2 Studio, Pemicu, laporan operasi (9–22 Nov)
- **Tujuan sprint:** sebelum kit dipindah ke banjir (minggu 48), lima templat laporan dan pengingat mingguan berjalan, Studio membandingkan semua skenario.
- **Wajib:** SP-040 s.d. SP-047, SP-063, SP-064, SP-066, SP-067, SP-068 s.d. SP-070. **Regang:** SP-027, SP-048, SP-071 s.d. SP-073.
- **Tanggal kunci:** 9–15 Nov Laporan pilot ke pimpinan; 16–22 Nov surat data terkirim (SP-067); 22 Nov deploy R2.

### Sprint 3: R3 dan buku versi serah (23 Nov–6 Des)
- **Tujuan sprint:** semua layar PRD §9.1.1 di produksi dan buku serta deck lolos QA lima lapis.
- **Wajib:** SP-049 s.d. SP-057, SP-071 s.d. SP-080. **Regang:** tidak ada; bila terlambat, 3D (SP-048, SP-049) dan telemetri (SP-050, SP-051) yang mundur, bukan buku (PRD §10.5).
- **Tanggal kunci:** 30 Nov operasi banjir pertama; 6 Des deploy R3 dan serah buku.

### Sprint 4: Pasca-serah (7 Des 2026–3 Jan 2027)
- **Tujuan sprint:** AOI 2027, protokol A/B, rekap 2026. **Wajib:** SP-028, SP-081, SP-082, SP-083, SP-084.

### Risiko sprint
| Risiko | Dampak | Penangkal |
| --- | --- | --- |
| P0 tidak lolos tinjauan 27 Okt malam | pilot tanpa web | SP-009 kertas wajib; entri staf `POST /api/sippa/log` setelah deploy; deploy tidak dipaksa (keputusan 49) |
| Beberapa sesi Claude memakai checkout utama bersamaan | konflik index, commit tercampur | worktree untuk semua penulis; commit `-- <berkas>` dari sesi induk |
| Dokumen saudara belum selesai saat gelombang 1 | tiket bekerja dari PRD saja | PRD menang atas dokumen di bawahnya; SP-084 menyelaraskan; tiket berhenti bila DT bertentangan dengan PRD |
| Kuota 60% habis sebelum P0 selesai | P0 tertunda | tiket non-P0 dipindah ke Sprint 1 (PRD §10.5) |
| DEMNAS tidak datang | G-08 dan profil trase hanya DSM | G-08 tertahan, profil 3D berlabel DSM berkanopi |
| Lisensi atau ukuran vendor | penolakan `higiene-repo` | QR dan three dicek lisensinya di SP-013, SP-048 |

### Definisi selesai (semua sprint)
- [ ] Perintah "Bukti" tiket hijau di worktree tiket.
- [ ] Pemeriksa berkonteks bersih: sesuai spesifikasi dan mutu, nol temuan kritis atau penting terbuka.
- [ ] Rute dan tabel baru di `tests/warga/cakupan.json`; `antre` tidak bertambah.
- [ ] `npm run uji` dan `npm run uji:sippa` hijau di akhir rilis.
- [ ] Commit [induk] per tiket dengan path spesifik; deploy hanya setelah commit yang sama lolos uji.

---

## 6. Jalur kritis

### 6.1 Ke pilot (siap 27 Okt 2026, pilot 28 Okt–1 Nov)

Jalur web: **SP-001 → SP-002 → SP-003 → SP-007 → SP-008 → SP-011 → SP-015 → SP-016 → SP-017 → SP-018**, dengan SP-006 (migrasi, sejajar SP-003) masuk ke SP-007 dan SP-008, serta SP-010 dan SP-013 masuk ke SP-011. Panjang: 25 Okt pagi sampai 27 Okt malam; tiket terpanjang SP-008 (L) sehingga dimulai 26 Okt pagi tanpa jeda.

Jalur kertas (wajib, cadangan): **SP-001 → SP-002 → SP-003 → SP-007 → SP-009 → SP-018**, selesai 26 Okt.

Tidak di jalur kritis pilot: semua tiket data, buku, R1–R3. Bila SP-008 terlambat, pangkas dulu `GET /api/sippa/log.csv` dan dummy, bukan validasi atau hak.

### 6.2 Ke pemakaian banjir (Nov–Des 2026)

**SP-017 (kit, gerak, log banjir di produksi) → SP-018 (vonis 1 Nov) → keputusan pemilik dan T-D (minggu 45) → SP-034 → SP-035 → SP-037 → SP-039 (Laporan pilot, minggu 46) → SP-044 + SP-045 → SP-047 (laporan mingguan dan pengingat, 22 Nov) → SP-081 (pindah kit minggu 48, operasi banjir minggu 49–52)**.

Kebutuhan banjir yang sudah dipenuhi P0: status `banjir`, alasan `pindah_banjir`, pengangkut `yontp`, `banjir_m3` di log, konfirmasi tiba oleh operator. Yang harus ada sebelum 23 Nov: laporan mingguan (SP-044) dan pengingat Senin (SP-045). Modul banjir sebagai komponen kit memakai templat BOM `banjir` di `POST /api/sippa/kit` (SP-008).

---

## 7. Penghambat dari input pemilik

| Kode | Pertanyaan | Tiket yang tertahan atau memakai bawaan | Bawaan bila belum dijawab |
| --- | --- | --- | --- |
| T-A | Harga heli BNPB | SP-041, SP-042 (slot `sippa.heli.biaya_jam` `menunggu`), SP-062, SP-063, SP-070 (bab 12), SP-078 (slide 13) | slot kosong, pembanding resmi "> Rp200 juta per sorti satu jam"; buku tetap bisa diserahkan |
| T-B | Lokasi, tanggal, alat pilot | SP-017 (kode penugasan regu), SP-018 (pilot); SP-009 (kepala formulir lokasi kosong) | AOI mudah Palangka Raya, 2 lance, 2 termometer |
| T-C | Pemilik pompa pilot, penanda tangan pinjam pakai | SP-017 (`pemilik_asal` kit SIPPA-001) | dicatat apa adanya di `pemilik_asal`, tanpa dokumen formal |
| T-D | Provinsi/kabupaten banjir penerima kit | SP-081; SP-070 (Tabel 10.1); SP-044 (isi laporan mingguan) | tujuan bebas di layar Kit; tabel buku memakai provinsi pasangan dari data |
| T-E | OPEX regu konvensional Manggala Agni | SP-062, SP-036 (garis dasar biaya), SP-070 | koefisien `bara_regu` 0,5–2,8 ha/regu/hari dari `operasi.json` |
| T-F | Nilai manfaat untuk NPV/BCR | SP-062, SP-042, SP-070 | manfaat 0 + dua skenario berlabel asumsi-kebijakan |
| T-G | Penanda tangan Kata Pengantar dan kolofon | SP-074, SP-080 | sama dengan deck BNPB 21 Okt 2026, draf berpenanda periksa pemilik |
| T-H | `/pipa` untuk akun instansi | SP-008 (hak akses) | hanya admin dan staf BNPB; operator memakai kode penugasan; bila berubah, tiket baru setelah SP-057 |
| T-I | Deep Research pemilik | tidak ada | tidak dirujuk |

Penghambat lain di luar T-A s.d. T-I:

| Penghambat | Tiket | Bawaan |
| --- | --- | --- |
| DEMNAS AOI dari BIG | SP-066 (G-08), SP-049 (profil 3D) | G-08 tertahan; 3D memakai `dem_elevasi.csv` berlabel DSM |
| Akun CDS (`CDSAPI_KEY`) untuk GloFAS | SP-063, SP-073 (Lampiran A) | dicatat "belum ditarik" |
| Balasan surat data (BWS, walidata KHG, Manggala Agni, LKPP) | SP-083, revisi buku 2027 | label keyakinan tetap; tidak memblokir serah |
| Persetujuan pemilik atas putusan arah produk dari §1.1 | tiket yang memunculkan `Ruling:` berarah produk | tiket berhenti sampai dijawab (AGENTS.md §2.1) |

---

## 8. Tiket commit dan deploy (sesi induk saja)

| Tiket | Isi | Kapan | Syarat |
| --- | --- | --- | --- |
| SP-016 | commit P0 (SP-003, SP-004, SP-006 s.d. SP-014) | 27 Okt | SP-015 bersih |
| SP-017 | migrasi 0055 remote, deploy P0, uji asap, kit SIPPA-001, kode regu | 27 Okt malam | SP-016; `npm run uji` dan `uji:sippa` hijau |
| SP-039 | commit R1 + data turunan terpisah + `migrasi_beku.json` (0055, 0056); migrasi 0056; deploy; `workflow_dispatch` `data.yml` | 8 Nov | SP-038 bersih |
| SP-047 | commit dan deploy R2 | 22 Nov | SP-046 bersih |
| SP-057 | commit R3 + `migrasi_beku.json` (0057); migrasi 0057; deploy rilis lengkap | 6 Des | SP-056 bersih |
| SP-080 | commit buku dan deck per tiket; serah | 6 Des | SP-079 bersih |
| SP-018, SP-081 | entri staf, ekspor D1, pemantauan operasi | 28 Okt–3 Jan | tidak ada commit kode |
| SP-084 | penyelarasan berkas ini; penutupan | 25 Okt dan 3 Jan | commit `data/kajian-bnpb/pipa/TIKET.md` saja |

Langkah deploy selalu PRD §10.6 butir 1–7 (`npx --yes wrangler@4.42.0 d1 migrations apply poskowarga --remote`, `npx --yes wrangler@4.42.0 deploy`, nama worker `centurisk97`, rollback bila asap gagal). Aturan commit PRD §10.7: satu commit per tiket, `git commit -m "SIPPA SP-0NN: ..." -- <berkas>`, tanpa `git add -A`, data turunan terpisah dari kode, tanpa berkas `* 2.*`. Skrip workflow di luar repo (SP-005) tidak di-commit.

---
## 9. Pemeriksaan kelengkapan

### 9.1 Fitur web PRD §9 ke tiket

| PRD | Fitur | Tiket |
| --- | --- | --- |
| §9.1.1 | peta layar 14 rute | SP-008 (cangkang), SP-010 (router) dan tiket layar di baris bawah |
| §9.1.2 | cangkang worker, gerbang host, `PUBLIK_TANPA_SESI`, `/admin/pipa` | SP-008 |
| §9.1.3 | navigasi tiga lebar, bilah konteks provinsi dan versi zona | SP-010, SP-055 |
| §9.2 | gaya Pantau Bencana, Bahasa Indonesia, angka `fmt`, pil keyakinan, mode gelap, desktop/ponsel | SP-010, SP-055; gerbang SP-014 |
| §9.2.1 | enam keadaan standar | SP-010 |
| §9.3 | fungsi hitung bersama dan gerbang kalkulator | SP-010, SP-030; kembar SP-019, SP-026 |
| §9.4.1 | Ringkas | SP-029, SP-031 |
| §9.4.2 | Peta kelayakan dan saran sarana | SP-021, SP-029, SP-032 |
| §9.4.3 | Kalkulator hidraulika | SP-033 |
| §9.4.4 | Pemicu pra-posisi | SP-023, SP-025, SP-043 |
| §9.4.5 | Inventaris dan lacak kit, QR, tugaskan, kehilangan | SP-008, SP-012, SP-013 |
| §9.4.6 | Rekap time-motion | SP-008, SP-010 |
| §9.4.7 | Dashboard A/B | SP-034, SP-035, SP-036 |
| §9.4.8 | Data dan metode, batas alat | SP-030 (`batas.js`), SP-031 |
| §9.5 | Simulator keputusan (mesin, `gerbangSippa`, semua skenario, NPV/BCR/MC) | SP-040, SP-041, SP-042, SP-062 |
| §9.6 | Simulasi 3D | SP-048, SP-049 |
| §9.7.1 | data turunan R2 | SP-019 s.d. SP-025, SP-028 |
| §9.7.2 | skema D1 0055–0057 | SP-006, SP-034, SP-050 |
| §9.7.3 | rute worker | SP-008, SP-029, SP-035, SP-045, SP-050, SP-052 |
| §9.8 | akses, peran, CSP, privasi | SP-008, SP-015, SP-038, SP-046, SP-056 |
| §9.9 | form lapangan luring | SP-007, SP-009, SP-011, SP-013 |
| §9.10 | laporan PDF lima templat, pengingat | SP-037, SP-044, SP-045 |
| §9.11 | telemetri | SP-050, SP-051 |
| §9.12.1 | pemilik berkas dan agent `sippa` | SP-003 |
| §9.12.2 | uji per lapisan | lihat §9.3 di bawah |
| §9.13 | INP dan aksesibilitas | SP-055; `inp-reviewer` di tiap tiket layar |
| §9.14 | data dummy | SP-008 (Kit, Log, Lapangan), SP-029, SP-035, SP-050, SP-052, SP-053 |

Tidak ada fitur §9 tanpa tiket.

### 9.2 Buku dan deck ke tiket

| Bagian | Bukti | Naskah | Pendukung |
| --- | --- | --- | --- |
| Depan, Kata Pengantar, Ringkasan Eksekutif | dari bab | SP-074 | T-G |
| Bab 1 Pendahuluan | SP-058 | SP-068 | SP-061 |
| Bab 2 Bara gambut | SP-058 | SP-068 | SP-061, SP-064 |
| Bab 3 Pola api | SP-058 | SP-068 | SP-020, SP-063, SP-064 |
| Bab 4 Kelayakan kit | SP-058 | SP-068 | SP-021, SP-022, SP-064 |
| Bab 5 Desain SIPPA | SP-058 | SP-069 | |
| Bab 6 Hidraulika | SP-059 | SP-069 | SP-019, SP-063, SP-064, SP-066 (G-08) |
| Bab 7 Komponen dan gambar teknik | SP-059 | SP-069 | SP-065, SP-066 |
| Bab 8 Operasi dan SOP | SP-059 | SP-069 | SP-019 (`matriksRespons`) |
| Bab 9 Kelembagaan | SP-059 | SP-070 | |
| Bab 10 Banjir dan irigasi | SP-059 | SP-070 | SP-062, T-D |
| Bab 11 Pilot dan program uji | SP-060 | SP-070, SP-072 | SP-018 |
| Bab 12 Anggaran, NPV, BCR, Monte Carlo | SP-060 | SP-070 | SP-062, T-A, T-E, T-F |
| Bab 13 Risiko | SP-060 | SP-071 | |
| Bab 14 Peta jalan | SP-060 | SP-071 | |
| Bab 15 Kesimpulan dan keputusan | SP-060 | SP-071 | |
| Lampiran A, B, E, F, G, H, I, J, K | | SP-073 | SP-009, SP-021, SP-030 |
| Lampiran C surat | | SP-067 | |
| Lampiran D gambar teknik | | SP-065, SP-066 | DEMNAS (G-08) |
| Deck sekitar 15 slide | | SP-078 | SP-063, SP-064 |
| Sunting, QA, bangun, serah | | SP-075, SP-076, SP-077, SP-079, SP-080 | SP-004, SP-005 |
| Dokumen program (formulir, surat, protokol, rekap) | | SP-009, SP-067, SP-082, SP-083 | |

Tidak ada bab atau lampiran tanpa tiket.

### 9.3 Area uji ke tiket

RU ditulis paralel; area di bawah adalah lapisan PRD §9.12.2 dan ukuran U1–U10. SP-084 menambah baris bila RU memuat area lain.

| Area uji | Berkas atau perintah | Tiket |
| --- | --- | --- |
| fungsi murni JS | `tests/sippa/hitung.test.mjs` | SP-010, SP-030 |
| mesin Studio | `tests/sippa/studio_mesin.test.mjs` | SP-041 |
| logika 3D, laporan, formulir | `adegan_logika`, `laporan_isi`, `formulir` | SP-049, SP-037, SP-044, SP-007 |
| kembar JS dan Python | `tests/sippa/kembar.test.mjs` | SP-026 |
| self-check Python | `scripts/data/sippa/*.py`, `sippa_keuangan.py`, `sippa_angka.py`, `sippa_formulir.py` | SP-019 s.d. SP-023, SP-028, SP-062, SP-063, SP-009 |
| skema D1 (CHECK, trigger, PK) | `tests/warga/sippa_skema.test.mjs` | SP-006, SP-034, SP-050 |
| rute dan hak | `tests/warga/sippa.test.mjs` | SP-008, SP-029, SP-035, SP-045, SP-050, SP-052 |
| alur lintas-tabel | `tests/warga/sippa_alur.test.mjs` | SP-054 |
| registri cakupan | `tests/warga/cakupan.json` | tiap tiket `warga-api` |
| gerbang SIPPA | `tests/sippa/gerbang-sippa.test.mjs` | SP-014, SP-055 |
| luring dan kirim ulang | uji tangan + rute | SP-011, SP-008 |
| dummy tiap layar | `tests/warga/sippa.test.mjs` | SP-052, SP-053 |
| gerbang ilmu agent dan pemilik berkas | `npm run uji:agen` | SP-003 |
| migrasi beku | `tests/warga/migrasi_beku.test.mjs` | SP-017, SP-039, SP-057 |
| uji asap produksi | PRD §10.6 butir 6 | SP-017, SP-039, SP-047, SP-057 |
| U1, U2 buku dan deck | `qa/periksa.py --ketat`, `qa/slop.py` | SP-075 s.d. SP-079 |
| U3, U4 pilot | `/pipa/log`, `/pipa/ab` | SP-018, SP-036 |
| U5 web di produksi | log deploy | SP-057 |
| U6 waktu gelar | `/pipa/log` | SP-010, SP-081 (data 2027) |
| U7 efikasi | `/pipa/ab` | SP-036, SP-082 (protokol) |
| U8, U9 aset dan banjir | `sippa_komponen`, `sippa_gerak`, laporan mingguan | SP-012, SP-044, SP-054, SP-081 |
| U10 INP | `inp-reviewer` | SP-055, SP-056 |

### 9.4 Rencana kerja PRD §10 ke tiket

| PRD | Tiket | PRD | Tiket | PRD | Tiket |
| --- | --- | --- | --- | --- | --- |
| P0-01 | SP-001 | W-01 | SP-019 s.d. SP-023 | B-01 | SP-004 |
| P0-02 | SP-002 | W-02 | SP-024 | B-02 | SP-058, SP-059, SP-060 |
| P0-03 | SP-003 | W-03 | SP-025 | B-03 | SP-063 |
| P0-04 | SP-006 | W-04 | SP-029 | B-04 | SP-061 |
| P0-05 | SP-008 | W-05 | SP-030 s.d. SP-033 | B-05 | SP-064 |
| P0-06 | SP-009 | W-06 | SP-034, SP-035 | B-06 | SP-065, SP-066 |
| P0-07 | SP-007, SP-010 s.d. SP-014 | W-07 | SP-036, SP-037, SP-044 | B-07 | SP-068 s.d. SP-071, SP-073, SP-074 |
| P0-08 | SP-015 | W-08 | SP-040, SP-041, SP-042 | B-08 | SP-075 |
| P0-09 | SP-016, SP-017 | W-09 | SP-043 | B-09 | SP-076 |
| P0-10 | SP-018 | W-10 | SP-048, SP-049 | B-10 | SP-072 |
| | | W-11 | SP-050, SP-051 | B-11 | SP-067 |
| | | W-12 | SP-052, SP-053 | B-12 | SP-077 |
| | | W-13 | SP-054, SP-055 (+ SP-014) | B-13 | SP-078 |
| | | W-14 | SP-056 | B-14 | SP-079 |
| | | W-15 | SP-057 | B-15 | SP-080 |
| | | | | B-16 | SP-082 |

Tambahan di luar §10 PRD: SP-005 (workflow `sippa`), SP-026 (kembar), SP-027 (gudang dan akses, PRD §7.1), SP-028 (AOI, PRD §4.1 minggu 50), SP-045 (pengingat, PRD §9.10), SP-062 (`sippa_keuangan.py`, PRD §11.1), SP-081 (operasi banjir, PRD §4.1), SP-083 (rekap, PRD §4.1 minggu 53), SP-084 (penyelarasan). Daftar periksa serah PRD §12.3 diperiksa di SP-056 (web) dan SP-079 (buku).

---

## 10. Hal yang belum terselesaikan

1. **Nomor bagian dokumen saudara.** DS, DT, KB, RU ditulis bersamaan; rujukan di sini memakai nama bagian. SP-084 menggantinya dengan nomor dan menambah tiket bila RU atau DT memuat sesuatu yang tidak ada di sini.
2. **Jalur buku di PRD tidak cocok dengan mesin repo.** PRD §8.4 dan §8.6 menyebut `bangun/pptx/spek/sippa-deck.json`, `deck.py sippa-deck`, `kata-pengantar.md`, `lampiran-X.md`; mesin repo memakai `deck.py <spek.json> <keluaran.pptx> --pdf` dan pola `naskah/<kajian>/00-depan.md`, `90-lampiran.md`, `deck.json`. Tiket mengikuti mesin repo (SP-073, SP-074, SP-078). PRD perlu dikoreksi pemilik atau KB menetapkan.
3. **Mesin buku hanya menerima `air` dan `mitigasi`** (`bangun.py` dan `periksa.py` `choices`); diselesaikan di SP-004, harus selesai sebelum tiket buku mana pun.
4. **Skrip workflow di luar repo** (`naskah-kajian.js`, `rakit-kajian.js`) bercabang tetap ke dua kajian dan tidak terlacak git; SP-005 mengubahnya tanpa commit.
5. **Sumber Studio pemilik ada di `~/Downloads`**, bukan di repo; SP-040 menyalinnya. Bila pemilik tidak ingin berkas itu masuk repo, port SP-041 membaca langsung dari Unduhan dan sumber tidak terlacak.
6. **SIPPA-G-08 butuh DEMNAS nyata**; tertahan sampai BIG menjawab surat (minggu 47 ke atas). Buku versi serah mungkin terbit dengan G-08 berstatus "menunggu DEMNAS".
7. **Lampiran G (protokol A/B) di buku 6 Des, sedangkan protokol pra-registrasi PRD dijadwalkan minggu 51** (SP-082). Ditangani dengan versi buku di SP-073 dan versi KAK di SP-082; pemilik perlu menerima bahwa Lampiran G adalah draf.
8. **Penulis buku jatuh berulang ke `general-purpose`.** AGENTS.md §1.5 memberi otoritas membuat agent baru (mis. `penulis-kajian`) bila kelas kerja yang sama dua kali jatuh ke `general-purpose`. Tidak dibuat di sini; sesi induk memutus di SP-002.
9. **`.superpowers/` belum diabaikan git**; SP-003 menambahkannya ke `.gitignore` sebelum buku besar §1.1 dipakai.
10. **Konflik skill dan AGENTS.md** diputus mengikuti AGENTS.md: implementer tidak commit; implementer paralel diizinkan di worktree; putusan berarah produk dibawa ke pemilik.
11. **Tanggal pilot.** Permintaan menyebut pilot 27 Okt; PRD §4.1 menjadwalkan pilot 28 Okt–1 Nov dengan web siap 27 Okt malam. Berkas ini memakai "siap 27 Okt".
12. **Pemilik gerbang SIPPA.** PRD §10.2 W-13 menyebut `penulis-gerbang` untuk bentuk; PRD §9.12.1 memberi `tests/sippa/**` ke `sippa`. Tiket mengikuti §9.12.1 (pengerja `sippa`, pemeriksa `penulis-gerbang`).
13. **R1 menarik W-06 dan sebagian W-07 lebih awal** dari P2 PRD supaya `/pipa/ab` (minggu 45) dan Laporan pilot (minggu 46) tersedia. Target rilis lain tetap.
14. **Banyak perubahan pekerjaan lain di `git status` awal sesi** (laporan BNPB, harian30, dll.); tiket commit hanya menyentuh berkas tiketnya.
15. **Jalur pembangkit formulir kertas** (`data/kajian-bnpb/bangun/sippa_formulir.py`) tidak dinamai PRD; DT boleh menggantinya, SP-084 menyelaraskan.
