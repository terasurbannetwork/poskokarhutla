# TIKET SIPPA: daftar kerja berurutan

Versi 1.2, 26 Oktober 2026 (keputusan pemilik 55 dan 56: Grand Design RR Air dan Akses digabung ke SIPPA; air tanah, akses, dan jadwal pemeliharaan juga di web `/pipa`; tiket SP-087 sampai SP-098 ditambah; rincian di `PENYELARASAN.md` bagian 26 Okt 2026). Daftar lengkap tiket untuk membangun seluruh SIPPA: tugas P0 pilot, aplikasi web `/pipa`, pipeline data, buku kajian, deck, dokumen program, commit, dan deploy. Satu sesi mengambil satu tiket, mengerjakan hanya cakupannya, lalu menandai statusnya di §2.

Urutan otoritas (AGENTS.md §2.1): `KEPUTUSAN-SIPPA.md` > `PRD.md` > `DESIGN-SYSTEM.md` > `DESAIN-TEKNIS.md` > `KERANGKA-BUKU.md` > `RENCANA-UJI.md` > berkas ini. Berkas ini hanya mengatur urutan, pembagian kerja, dan bukti selesai; isi teknis tetap di dokumen di atasnya. Bila tiket bertentangan dengan dokumen di atasnya, dokumen di atasnya menang dan tiket diperbaiki lebih dulu oleh sesi induk.

Keempat dokumen saudara (`DESIGN-SYSTEM.md`, `DESAIN-TEKNIS.md`, `KERANGKA-BUKU.md`, `RENCANA-UJI.md`) sudah selesai dan diselaraskan 25 Okt 2026; rujukan ke dokumen itu ditulis dengan nomor bagian (mis. "DT §3.2"). PRD sudah memuat isi yang sama dengan DT (skema, rute, rumus) dan KB (buku, deck); nilai persis diambil dari DT dan KB.

Singkatan: PRD = `PRD.md`; DS = `DESIGN-SYSTEM.md`; DT = `DESAIN-TEKNIS.md`; KB = `KERANGKA-BUKU.md`; RU = `RENCANA-UJI.md`; `kajian/` = `data/kajian-bnpb/`.

---

> **Untuk pekerja agen:** tiket dieksekusi satu per satu dengan pola superpowers:subagent-driven-development yang disesuaikan ke AGENTS.md (AGENTS.md menang bila bertentangan; lihat §1.1). Langkah memakai kotak centang (`- [ ]`).

**Tujuan:** SIPPA siap pilot 27 Okt 2026, siap dipakai operasi banjir Nov–Des 2026, web `/pipa` lengkap di produksi dan buku Grand Design SIPPA Terintegrasi (22 bab) serta deck versi serah paling lambat 6 Des 2026; rilis web R4 (pemeliharaan, air tanah, akses) paling lambat 20 Des 2026 (PRD §2.2 T-Q).

**Arsitektur:** aplikasi staf vanilla JS tanpa build step di `public/pipa/**` (kode dan teks saja, tanpa data), dilayani Cloudflare Worker (`src/sippa.js`) di balik sesi admin/staf, data operasi di D1 (`sippa_*`, migrasi 0056–0059), data turunan dari skrip Python stdlib di `scripts/data/sippa/` lewat R2 `sippa/`; buku dibangun pipeline `data/kajian-bnpb/bangun/` dari naskah Markdown bertoken angka.

**Teknologi:** Cloudflare Worker + D1 + R2, Miniflare 3 untuk uji, `node:test`, Python 3.12 stdlib, MapLibre/jsPDF/Roboto (sudah divendor), qrcode-generator dan three 0.169.0 (divendor baru), python-docx/pptx di `.venv` kajian.

**Spesifikasi:** `KEPUTUSAN-SIPPA.md` (menang), `PRD.md`, lalu DS, DT, KB, RU di folder ini.

## 0. Batasan global (berlaku untuk setiap tiket, nilai disalin persis)

| Batasan | Nilai |
| --- | --- |
| Rute halaman / rute API | `/pipa` dan `/pipa/:layar` dengan `LAYAR_SIPPA = ["peta","hitung","pemicu","kit","log","ab","studio","3d","telemetri","laporan","data","pelihara","air","akses"]` (tiga terakhir keputusan 56, rilis R4), `/pipa/kit/:id`, `/pipa/aset/:id`, `/pipa/lapangan`; API `/api/sippa/*` dengan aksi sebelum id (`/api/sippa/gerak/:id`, DT §4.3, ADR-04); awalan `/api/pipa/*` milik `src/pipa.js` tidak disentuh |
| Akses | hanya staf BNPB: admin (`adminOK`) atau staf berperan `pusdalops`, `koordalops` (tulis) dan `pimpinan` (baca); tamu `/pipa*` 303 ke `/admin/pantau?ke=<jalur>`; satu-satunya pintu tanpa akun `/pipa/lapangan` dengan kode penugasan 26 heks di header `x-kode`, kedaluwarsa ≤ 30 hari, hanya sha256 disimpan |
| Data | tidak ada data SIPPA di `public/`; data turunan hanya lewat `GET /api/sippa/data/<nama>` bersesi (tamu 401 identik untuk ada dan tidak ada) |
| Migrasi | `0056_sippa_inti.sql`, `0057_sippa_ab_skenario.sql`, `0058_sippa_telemetri.sql`, `0059_sippa_aset_pelihara.sql` persis DT §3.2–§3.4 dan §3.6; idempoten; `ON CONFLICT(id) DO NOTHING`, tidak pernah `INSERT OR IGNORE`; tidak disunting setelah diterapkan; tiap tabel punya kolom `dummy` |
| Batas tulis D1 | batas laju hanya di rute tulis dan kegagalan autentikasi (ADR-06); telemetri satu baris per pesan (ADR-07, T-J) |
| Batas injeksi | kedalaman lance 0–5 m; > 5 m ditolak di semua masukan (kalkulator, Studio, 3D, form, CHECK D1 `kedalaman_cm` ≤ 500); angka 5 m hanya di `KONST.dalam_maks_m` (DT §5.2); 3–5 m berpil "lengan uji" |
| Ambang zona | air < 2,5 km, jalan < 5 km (keputusan 30 dan 51; tepat 2,50 atau 5,00 km = jauh); tiga versi: `kendala.json` A188/B418/C89/D170, jalan utama OSM A198/B429/C81/D157, semua jalan OSM A469/B158/C167/D71 |
| Warna zona | web: palet PRD (A `--ok`, B `--info`, C `--warn`, D `--bad`) + huruf A–D + pola wajib; buku dan deck: biru dan emas + huruf + pola yang sama (keputusan 52) |
| Kalkulator | debit bawaan 300 L/min dengan 8 lance (serapan 320 L/min); 600 L/min dengan 8 lance = kasus ajar NO-GO H-SERAP; jumlah lance dikonfirmasi bench G2 |
| Vonis | kalkulator dan Studio hanya NO-GO, HOLD, KONDISIONAL; tidak ada "GO"; skor tidak pernah meluluskan NO-GO. Vonis pilot keputusan 53: DAPAT DIPAKAI, DAPAT DIPAKAI BERSYARAT, BELUM DAPAT DIPAKAI (`vonisPilot`, DT §5.5.2) |
| Label keyakinan | resmi, terverifikasi, estimasi-model, asumsi-kebijakan, menunggu, hipotesis; tiap angka bersumber dan berwaktu |
| Kode buku | kajian `sippa`: naskah `data/kajian-bnpb/naskah/sippa/` (`00-depan-*.md`, `bab-01.md` s.d. `bab-22.md`, `90-lampiran-a.md` s.d. `90-lampiran-q.md`, `deck.json` 18 slide isi), paket `data/kajian-bnpb/data/sippa/`, kunci `sippa.*` ditambah kunci `rehab.*` dan `perka_2008.*` yang sudah ada (dipakai apa adanya, tidak disalin); kode `rehab` tetap sebagai sumber, tidak diserahkan (keputusan 55); keluaran `keluaran/sippa*.{docx,pdf,pptx}`, `--kajian sippa` |
| Batas data buku | 23 Okt 2026 23.59 WIB |
| Bahasa dan teks | Bahasa Indonesia saja, sapaan "kamu", tanpa em dash, tanpa titik tengah U+00B7, en dash hanya rentang, "titik panas" untuk data satelit, tanpa "terbukti" untuk SIPPA, angka lewat `fmt` id-ID (tanpa `toFixed` di teks tampil); huruf web Inter dan Plus Jakarta Sans, Roboto hanya untuk buku, deck, dan PDF |
| Identitas | hanya nama dan logo BNPB; alat ditulis sebagai kelas kinerja "atau setara", merek hanya di kolom rujukan datasheet; tanpa nama perusahaan konsesi |
| Pustaka luar | tanpa CDN (CSP `script-src 'self'`); vendor di `public/vendor/` |
| INP dan aksesibilitas | tidak ada interaksi > 200 ms (form lapangan < 100 ms); kerja berat lewat `nanti()` atau Web Worker; WCAG 2.2 AA; target sentuh ≥ 44 px, form lapangan ≥ 56 px |
| Pipeline | Python 3.12 stdlib, self-check `python3 <skrip>.py uji`, tanpa workflow baru (langkah di `data.yml`), tanpa jadwal cron baru (batas 5 jadwal akun Free) |
| Deploy | hanya tiket [induk]: migrasi remote, push `staging` (terbit.yml pratinjau), uji asap, merge `main` (terbit.yml deploy); merge ke `main` = tayang (titik.yml, banjir.yml, data.yml juga men-deploy `main`, paling lambat 21.20 WIB); rollback = `wrangler rollback` + revert di `main` (PRD §10.6, DT §8.4) |
| Model armada | pengerja sonnet, pemindai haiku, opus hanya sesi induk |
| Model pemeliharaan | konstanta interval, laju, stok, kelas K1–K10 hanya di `public/pipa/pelihara.js` (PRD §6.10); jadwal dihitung, tidak disimpan; skor 0–3 = enum `sippa_komponen.kondisi`; kit tidak laik gelar = peringatan, bukan blokir (T-P) |
| Air tanah dan akses | sumur zona `kritis`/`rusak` tanpa `rekomendasi_bg` ditolak (rute dan CHECK, rehab Q10); `pemilik_aset` wajib; program jembatan menurut pemiliknya; angka sekunder tidak tampil |

---

## 1. Aturan yang berlaku untuk semua tiket

1. **Gerbang konteks dulu** (AGENTS.md §0): `node scripts/agents/ilmu.mjs pemilik <berkas>`, `node scripts/agents/ilmu.mjs baca <agent>`, lalu ucapkan kontrak CAKUPAN (kolom "Berkas"), DI LUAR (kolom "Di luar"), BUKTI SIAP (kolom "Bukti").
2. **Satu pengerja, satu sampai tiga pemeriksa, pemeriksa tidak pernah pengerja yang sama** (AGENTS.md §1.5, §3.2). Pemeriksa adalah subagent baru berkonteks bersih yang memeriksa sinyal nyata (perintah bukti hijau), bukan klaim. Pemeriksa melapor, tidak membetulkan (AGENTS.md §6); temuan dibetulkan pengerja tiket asal, lalu tiket asal dibuka ulang sampai bukti hijau lagi.
3. **Model** (AGENTS.md §1.3): pengerja `sonnet`; pemindaian berpola (`guard-api`, `migrasi-idempoten`, `higiene-repo`, `selera-angka`, pindai slop, salin berkas) `haiku`; `opus` hanya sesi induk (kontrak, rakitan, keputusan deploy). Tidak ada tiket subagent yang dinaikkan ke opus: tidak ada model risiko baru, dan migrasi 0056–0059 hanya menambah tabel tanpa mengubah tabel yang ada (0059 hanya menambah trigger yang menulis `sippa_komponen.kondisi` dan `dicek`, kolom yang sudah ada).
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
| SP-006 | Migrasi 0056 SIPPA inti dan uji skema | `warga-api` | 1 | M | belum |
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
| SP-034 | Migrasi 0057 A/B, skenario, laporan dan uji skema | `warga-api` | 6 | S | belum |
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
| SP-050 | Migrasi 0058 dan rute telemetri, alarm, ringkas harian | `warga-api` | 12 | M | belum |
| SP-051 | Layar Telemetri | `sippa` | 13 | S | belum |
| SP-052 | Rantai dummy semua layar | `warga-api` | 14 | M | belum |
| SP-053 | Tombol isi dan hapus dummy di semua layar | `sippa` | 14 | S | belum |
| SP-054 | Uji alur lintas-tabel | `warga-api` | 14 | M | belum |
| SP-055 | Gerbang SIPPA lengkap, aksesibilitas, tema gelap, ponsel | `sippa` | 14 | M | belum |
| SP-056 | Tinjauan penuh rilis lengkap | pemeriksa | 15 | M | belum |
| SP-057 | [induk] Commit dan deploy R3 (rilis lengkap) | sesi induk | 15 | S | belum |
| SP-058 | Berkas bukti bab 1–3, 5–6 | `penulis-kajian` | 6 | M | belum |
| SP-059 | Berkas bukti bab 7–11 | `penulis-kajian` | 8 | M | belum |
| SP-060 | Berkas bukti bab 16–22 | `penulis-kajian` | 8 | M | belum |
| SP-061 | Pustaka dicek ke naskah asli | `penulis-kajian` (riset) | 9 | M | belum |
| SP-062 | Paket data `data/sippa/`, tabel harga, dan `sippa_keuangan.py` | `pipa-data` | 6 | M | belum |
| SP-063 | Registri angka `sippa_angka.py` | `pipa-data` | 9 | M | belum |
| SP-064 | Gambar peta dan grafik buku | `pipa-data` | 10 | M | belum |
| SP-065 | Gambar teknik SIPPA-G-01 s.d. G-06 | `pipa-data` | 5 | L | belum |
| SP-066 | Gambar teknik SIPPA-G-08 s.d. G-12 (G-07 dicabut) | `pipa-data` | 9 | L | belum |
| SP-067 | Surat permintaan data (Lampiran I, 13 surat) | `penulis-kajian` | 9 | M | belum |
| SP-068 | Naskah bab 1–3, 5–6 | `penulis-kajian` | 11 | L | belum |
| SP-069 | Naskah bab 7–10 | `penulis-kajian` | 11 | L | belum |
| SP-070 | Naskah bab 11, 16, 17, 18 | `penulis-kajian` | 11 | L | belum |
| SP-071 | Naskah bab 19–22 | `penulis-kajian` | 12 | M | belum |
| SP-072 | Bab 16.3 dan 11.4: hasil pilot dan banjir dari D1 | `penulis-kajian` + `pipa-data` | 12 | S | belum |
| SP-073 | Lampiran tertulis A–H, J, K, L | `penulis-kajian` | 12 | L | belum |
| SP-074 | Bagian depan dan Ringkasan Eksekutif | `penulis-kajian` | 13 | M | belum |
| SP-075 | Sunting substansi | penyunting (`general-purpose` baru) | 13 | M | belum |
| SP-076 | Sunting bahasa dan anti-slop | penyunting (`general-purpose` baru) | 14 | M | belum |
| SP-077 | Bangun DOCX dan PDF | `pipa-data` | 15 | M | belum |
| SP-078 | Spek deck dan bangun PPTX dan PDF | `penulis-kajian` (spek), `pipa-data` (bangun) | 15 | M | belum |
| SP-079 | QA lima lapis dan proofread render | pemeriksa | 15 | M | belum |
| SP-080 | [induk] Commit dan serah buku dan deck | sesi induk | 15 | S | belum |
| SP-081 | [induk] Operasi banjir Nov–Des 2026 | sesi induk + lapangan | 7–18 | M | belum |
| SP-082 | Protokol A/B pra-registrasi dan KAK pilot 2027 | `penulis-kajian` | 17 | M | belum |
| SP-083 | Rekap 2026 dan errata angka | `penulis-kajian` + `pipa-data` | 18 | S | belum |
| SP-084 | [induk] Penyelarasan dokumen saudara dan penutupan | sesi induk | 0 dan 18 | S | awal selesai 25 Okt (PENYELARASAN.md); akhir belum |
| SP-085 | Agent baru `penulis-kajian` | `mekanik-mesin` | 1 | S | belum |
| SP-086 | Gerbang buku SIPPA: T-12 dan D-33 s.d. D-40 | `penulis-gerbang` | 9 | M | belum |
| SP-087 | Berkas bukti bab 4, 12–15 dari bahan rehab dan PRD §6.10 | `penulis-kajian` | 8 | M | belum |
| SP-088 | Naskah bab 4, 12–15 | `penulis-kajian` | 11 | L | belum |
| SP-089 | Lampiran M–Q | `penulis-kajian` | 12 | M | belum |
| SP-090 | Pipeline `cat.py`, `jembatan.py` dan unggah R2 | `pipa-data` (+ `mekanik-mesin` langkah) | 16 | M | belum |
| SP-091 | Migrasi 0059 aset, inspeksi, stok dan uji skema | `warga-api` | 16 | M | belum |
| SP-092 | `pelihara.js` fungsi murni dan uji | `sippa` | 16 | S | belum |
| SP-093 | Rute aset, inspeksi, pelihara, stok, data baru | `warga-api` | 17 | M | belum |
| SP-094 | Layar Pemeliharaan | `sippa` | 17 | M | belum |
| SP-095 | Layar Air tanah, Akses, rincian aset | `sippa` | 17 | L | belum |
| SP-096 | Dummy tiga layar R4 dan uji alur pemeliharaan | `warga-api` | 18 | M | belum |
| SP-097 | Tinjauan R4 | pemeriksa | 18 | S | belum |
| SP-098 | [induk] Commit dan deploy R4 | sesi induk | 18 | S | belum |
| SP-099 | Akses 865 kompleks Kalteng (rute jalan/perahu, menit, air, zona) | `pipa-data` | 6 | M | selesai (berkas; menunggu pemeriksa) |

Jumlah: 99 tiket (86 semula, 12 dari keputusan 55 dan 56, 1 dari keputusan 57).

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
- **Berkas:** `scripts/agents/roster.json` (entri `sippa`: `kelas: "pengerja"`, `model: "sonnet"`, `milik: ["public/pipa/**", "tests/sippa/**"]`, `larangan`: tidak menyentuh `src/**`, `migrations/**`, tidak deploy, tidak commit, tidak melonggarkan gerbang; tambah `data/sippa/**` ke `milik` `pipa-data`), keluaran `npm run agents:build` (`.claude/agents/sippa.md`, `.claude/ilmu-agent/KATALOG.md`), `.claude/ilmu-agent/sippa.md` (diisi dari PRD §9, DS, DT; belum ada kode), `AGENTS.md` (baris peta modul "SIPPA `/pipa`" di §2 dan baris router "Layar `/pipa`" di §1), `package.json` (`"uji:sippa": "node --test --test-concurrency=1 tests/sippa/*.test.mjs"`, dirangkai ke `"uji"` dengan pola kode keluar yang sama), `.github/workflows/terbit.yml` (langkah "Uji SIPPA" `npm run uji:sippa` sesudah `uji:warga` dan sebelum terbit, RU §0.4), `tests/sippa/cakupan.json` (registri kosong berbentuk RU §7.2, dibuat sebelum berkas `public/pipa/**` pertama), `.gitignore` (tambah `.superpowers/` supaya buku besar, ringkasan, dan laporan tiket §1.1 tidak pernah ter-commit).
- **Antarmuka:** Hasil: agent `sippa` (dipanggil `subagent_type: "sippa"`), perintah `npm run uji:sippa`.
- **Di luar:** isi `public/pipa/**`; `docs/sippa/**` (tidak dibuat sampai ada isinya).
- **Pengerja / pemeriksa:** `mekanik-mesin` / `higiene-repo`, `penulis-gerbang` (gerbang ilmu tidak dilonggarkan).
- **Model:** sonnet; pemeriksa haiku (`higiene-repo`) dan sonnet.
- **Dependensi:** SP-002. **Paralel dengan:** SP-004, SP-006, SP-020. **Isolasi:** worktree ya.
- **Selesai bila:** katalog segar; `ilmu.mjs pemilik public/pipa/app.js` menjawab `sippa`; `ilmu.mjs pemilik data/sippa/keluaran/zona.json` menjawab `pipa-data`; `uji:sippa` jalan (nol berkas uji = lulus atau dilewati tanpa galat).
- **Bukti:** `npm run uji:agen`; `npm run agents:check`.
- **Rujukan:** PRD §9.12.1, §10.1 P0-03; DT §2.1, §2.2; RU §0.4, §7.2; AGENTS.md §1.3, §1.5, §2. **Ukuran:** S

#### SP-004 Mesin buku menerima kajian `sippa`
- **Tujuan:** pipeline buku saat ini hanya mengenal `air` dan `mitigasi`; tiket ini membuat kontrak, pembangun, dan QA menerima `sippa` tanpa melonggarkan gerbang apa pun.
- **Berkas:** `data/kajian-bnpb/tema.json` (entri `kajian.sippa` persis KB §1: judul T-L, subjudul, cakupan sampul, `lampiran: "ABCDEFGHIJKLMNOPQRS"`, entri `kajian.rehab` tidak dihapus, `qa.pustaka.kajian_min.sippa = 50`, tanpa batas halaman; token warna zona biru dan emas DS §2.1.3; `kosakata.keyakinan` + `menunggu`, `hipotesis`), `data/kajian-bnpb/bangun/kontrak/naskah.py` (daftar kajian sah), `data/kajian-bnpb/bangun/kontrak/tema.py` (bila memvalidasi daftar kajian), `data/kajian-bnpb/bangun/docx/bangun.py` (`choices` argumen `kajian`), `data/kajian-bnpb/qa/periksa.py` (`--kajian` `choices`), `data/kajian-bnpb/bangun/pptx/deck.py` (hanya bila `kajian` divalidasi), `data/kajian-bnpb/data/glosarium.json` (singkatan KB §3.6; `varian_terlarang` KB §8.1 M7), kontrak `angka.json` mengenali status `menunggu` (KB §8.1 M14), uji diri yang sudah ada di berkas tersebut.
- **Antarmuka:** Hasil: `bangun.py sippa`, `periksa.py --kajian sippa`, kunci `tema.json` `kajian.sippa`. Dipakai SP-009, SP-058 s.d. SP-080.
- **Di luar:** naskah, angka, gambar; mengubah aturan QA untuk kajian lain.
- **Pengerja / pemeriksa:** `pipa-data` / `penulis-gerbang` (tidak ada gerbang yang melemah).
- **Model:** sonnet.
- **Dependensi:** SP-002, KB (daftar bab dan lampiran). **Paralel dengan:** SP-003, SP-006, SP-020. **Isolasi:** worktree ya.
- **Selesai bila:** uji diri kontrak lolos; `bangun.py --help` menerima `sippa`; `periksa.py --kajian sippa` diterima; uji QA kajian `air`, `mitigasi`, dan `rehab` tetap hijau.
- **Bukti:** `cd data/kajian-bnpb/bangun/kontrak && python3 tema.py && python3 naskah.py`; `cd data/kajian-bnpb && .venv/bin/python qa/uji.py && .venv/bin/python bangun/docx/uji.py`.
- **Rujukan:** PRD §8.4, §10.3 B-01; KB §1, §8.1 M1–M5, M7, M14. **Ukuran:** M

#### SP-005 Workflow naskah dan rakit bercabang `sippa`
- **Tujuan:** skrip workflow `naskah-kajian.js` dan `rakit-kajian.js` hanya bercabang `air`/`mitigasi` (judul, `BAGIAN` KERANGKA, batas halaman). Tambahkan cabang `sippa` persis KB §8.1 M6: judul KB §1, otoritas `KEPUTUSAN-SIPPA.md` > `KEPUTUSAN.md` (KB §0.2) > Buku Pegangan > `pipa/KERANGKA-BUKU.md` (bab §4, register §6, butir terbuka §10, deck §11), KD-1 sampai KD-7, 15 slide isi, tanpa batas halaman (keputusan 11), tanpa bab kritik (keputusan 20), larangan keputusan 50; naskah ditulis sebagai satu berkas per front matter (`00-depan-kata-pengantar.md`, `00-depan-ringkasan-eksekutif.md`, `bab-NN.md`, `90-lampiran-<huruf>.md`; `bangun/docx/bangun.py:430` mengurutkan dari front matter), bukan `00-depan.md` dan `90-lampiran.md` tunggal; `agentType` penulis menjadi `penulis-kajian`, penyunting dan proofread tetap agent baru berkonteks bersih.
- **Berkas:** `~/.claude/projects/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/6b4ae72d-ad19-4e2b-b9ca-73f12c9d80a1/workflows/scripts/naskah-kajian.js`, `.../rakit-kajian.js` (di luar repo, tidak di-commit).
- **Di luar:** skrip workflow lain; menjalankan workflow.
- **Pengerja / pemeriksa:** `mekanik-mesin` / `general-purpose` berkonteks bersih (membaca diff: cabang `air` dan `mitigasi` tidak berubah perilaku).
- **Model:** sonnet.
- **Dependensi:** SP-002, SP-004, SP-085. **Paralel dengan:** SP-007, SP-013, SP-021. **Isolasi:** tidak (di luar repo).
- **Selesai bila:** `args.kajian = 'sippa'` menghasilkan prompt yang merujuk KB dan tanpa batas halaman, memakai `penulis-kajian`, dan menulis berkas naskah per front matter; cabang lama identik.
- **Bukti:** `node --check <berkas>` untuk kedua skrip; diff ditinjau.
- **Rujukan:** PRD §8.4; KB §1, §8.1 M6, §10 O3. **Ukuran:** S

#### SP-085 Agent baru `penulis-kajian`
- **Tujuan:** penulisan naskah buku kajian sudah berulang kali jatuh ke `general-purpose` (kajian air, mitigasi, SIPPA); AGENTS.md §1.5 memberi otoritas membuat agent tanpa izin per kasus. Agent ini menulis berkas bukti, naskah bab, bagian depan, lampiran tertulis, dan spek deck; penyunting tetap agent lain.
- **Berkas:** `scripts/agents/roster.json` (entri persis DT §2.3: `kelas: "pengerja"`, `model: "sonnet"`, `milik: ["data/kajian-bnpb/naskah/**"]`), keluaran `npm run agents:build` (`.claude/agents/penulis-kajian.md`, `.claude/ilmu-agent/KATALOG.md`), `.claude/ilmu-agent/penulis-kajian.md` (diisi dari naskah nyata `naskah/air/`, `bangun/NASKAH-SPEK.md`, `bangun/kontrak/naskah.py`, `ANTI-SLOP.md`, KB §2, §4, §9.3), `AGENTS.md` (baris router "Naskah buku kajian" di §1 dan peta modul §2).
- **Antarmuka:** Hasil: `subagent_type: "penulis-kajian"`, dipakai SP-005 (workflow), SP-058 s.d. SP-061, SP-067 s.d. SP-074, SP-078 (spek), SP-082, SP-083.
- **Di luar:** isi naskah; `bangun/**`, `qa/**`, `data/angka.json` (tetap `pipa-data`).
- **Pengerja / pemeriksa:** `mekanik-mesin` / `higiene-repo`, `penulis-gerbang` (gerbang ilmu tidak dilonggarkan).
- **Model:** sonnet; pemeriksa haiku dan sonnet.
- **Dependensi:** SP-002. **Paralel dengan:** SP-003, SP-004, SP-006, SP-020. **Isolasi:** worktree ya (berkas `roster.json` juga disentuh SP-003: kerjakan berurutan sesudah SP-003 di worktree yang sama, atau gabungkan dalam satu putaran `mekanik-mesin`).
- **Selesai bila:** katalog segar; `node scripts/agents/ilmu.mjs pemilik data/kajian-bnpb/naskah/sippa/bab-01.md` menjawab `penulis-kajian`; `ilmu.mjs pemilik data/kajian-bnpb/bangun/sippa_angka.py` tetap menjawab `pipa-data`; ilmu terisi (gerbang ilmu hijau); agent baru disebut di laporan akhir sesi induk.
- **Bukti:** `npm run uji:agen`; `npm run agents:check`.
- **Rujukan:** AGENTS.md §1.3, §1.5; DT §2.3; PRD §9.12.1; KB §9.2. **Ukuran:** S

### 3.B P0 siap pilot (25–27 Okt)

#### SP-006 Migrasi 0056 SIPPA inti dan uji skema
- **Tujuan:** sepuluh tabel P0 (`sippa_kit`, `sippa_komponen`, `sippa_gerak`, `sippa_tugas`, `sippa_log_gelar`, `sippa_probe`, `sippa_bbm`, `sippa_foto`, `sippa_jalan_cek`, `sippa_aoi_usul`) dengan CHECK, indeks, dan trigger persis DT §3.2; idempoten.
- **Berkas:** `migrations/0056_sippa_inti.sql`, `tests/warga/sippa_skema.test.mjs`, `tests/warga/cakupan.json`.
- **Antarmuka:** Hasil: tabel dan kolom persis DT §3.2 (termasuk medan vonis pilot keputusan 53, `jam_klien_meleset`, `prov`, tahap probe `sesudah`); semua tabel punya `dummy INTEGER NOT NULL DEFAULT 0`. Dipakai SP-007 (batas CHECK), SP-008, SP-034, SP-050.
- **Di luar:** rute; 0057 dan 0058; menyunting migrasi lama atau `migrations/0053_kontak 2.sql`.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`, `penulis-gerbang` (bentuk uji: yang salah ditolak).
- **Model:** sonnet; `migrasi-idempoten` haiku.
- **Dependensi:** SP-002, DT §3.2–§3.5. **Paralel dengan:** SP-003, SP-004, SP-020. **Isolasi:** worktree ya.
- **Selesai bila:** semua baris RU §3.1 dan §3.2 hijau: migrasi dijalankan dua kali tanpa galat; CHECK menolak status kit liar, pasangan transisi tidak sah, kode `SIPPA-9xx` bukan dummy, kedalaman probe 600 cm, suhu 1.000 °C, tugas > 30 hari, foto PNG; trigger menolak `dari_status` basi dan gerak saat rencana terbuka, UPDATE/DELETE `sippa_gerak`, `sippa_log_gelar`, `sippa_bbm` (kecuali hapus dummy dan isi `tiba` dari kosong), urutan waktu log terbalik, dan `banjir_m3` pada jenis bukan banjir; semua tabel dan trigger di `cakupan.json`.
- **Bukti:** `node --test tests/warga/sippa_skema.test.mjs`; `node --test tests/warga/migrasi_beku.test.mjs`.
- **Rujukan:** PRD §9.7.2 (0056), §9.12.2 baris skema D1, §10.1 P0-04; DT §3.2–§3.5; RU §3. **Ukuran:** M

#### SP-007 Daftar medan formulir lapangan
- **Tujuan:** satu sumber medan dan batas untuk form lapangan, validasi server, dan formulir kertas.
- **Berkas:** `public/pipa/formulir.js` (ES module tanpa DOM, diimpor langsung oleh `src/sippa.js`, ADR-03; data medan: log gelar 6 tahap, angka sesi, medan vonis pilot keputusan 53, probe tahap `sebelum`/`sesudah`/`24j`/`72j`/`7h`/`30h`/`90h` di 10/30/50/100 cm dan 150–500 cm hanya `lengan_dalam`, BBM, gerak; fungsi `cekButir(jenis, butir, {lengan_dalam})`; batas sama dengan CHECK 0056), `tests/sippa/formulir.test.mjs` (batas = CHECK; kedalaman > 500 cm tidak ada di daftar).
- **Antarmuka:** Konsumsi: CHECK `migrations/0056_sippa_inti.sql`. Hasil: modul ES `public/pipa/formulir.js` mengekspor `MEDAN` (objek per jenis butir `log`, `probe`, `bbm`, `gerak`; tiap medan `{nama, tipe, min, maks, pilihan, wajib}`), `cekButir`, dan `FORMULIR_VERSI`; batas kedalaman diturunkan dari `KONST.dalam_maks_m` (`hitung.js`), bukan konstanta kedua. Dipakai SP-008, SP-009, SP-011.
- **Di luar:** UI form (SP-011); rute (SP-008). Tidak ada salinan `src/sippa_formulir.js`.
- **Pengerja / pemeriksa:** `sippa` / `penulis-gerbang`.
- **Model:** sonnet.
- **Dependensi:** SP-003, SP-006 (batas CHECK). **Paralel dengan:** SP-005, SP-013, SP-021. **Isolasi:** worktree ya.
- **Selesai bila:** daftar medan lengkap sesuai PRD §9.9 dan DT §5.5.2; uji memastikan tiap batas sama dengan CHECK migrasi 0056 (dibaca dari berkas SQL, bukan disalin) dan berkas tidak menyentuh DOM atau global peramban.
- **Bukti:** `node --test tests/sippa/formulir.test.mjs`.
- **Rujukan:** PRD §9.9 (validasi klien = server), §9.12.2 baris formulir; DT §5.5.2, §6.1, ADR-03; RU §6.2. **Ukuran:** S

#### SP-008 Worker SIPPA P0: cangkang, gerbang host, rute kit, tugas, lapangan, log
- **Tujuan:** semua rute yang dibutuhkan pilot, di balik sesi, dengan kode penugasan untuk operator.
- **Berkas:** `src/sippa.js` (baru: `RUTE_SIPPA` P0, `bungkusSippa` 503 sopan, `P_SIPPA_BACA`, `P_SIPPA_TULIS`, `LAYAR_SIPPA`, `ALASAN_TRANSISI`, `RANTAI_DUMMY` untuk Kit, Log, Lapangan; impor `public/pipa/formulir.js`), `src/worker.js` (spread `RUTE_SIPPA` di `RUTE`; regex pengecualian `halamanTerkunci` ditambah `pipa`, DT §1.4; `PUBLIK_TANPA_SESI` tidak diubah), `src/admin_halaman.js` (`HAL.pipa`, `HALAMAN_STAF.pipa`, `halamanSippa(layar, ctx)`, `halamanSippaLapangan()`, `CSP_SIPPA`, `GET /admin/pipa` 303), `src/posko.js` (`export` pada `CSP_LAPANGAN` saja), `public/admin/pantau.js` (sesudah masuk staf, `ke` yang cocok `^/pipa(/|$)` dialihkan; ADR-05), `tests/warga/sippa.test.mjs` (bagian P0), `tests/warga/staf_halaman.test.mjs` (`HALAMAN_STAF.pipa` = `P_SIPPA_BACA`), `tests/warga/posko.test.mjs` (regex pemindai baris 647 ditambah `pipa`), `tests/warga/admin-403-pantul.test.mjs` (juga memindai `public/pipa/*.js`), `tests/warga/gerbang.test.mjs` (`"sippa"` ditambah ke daftar modul `bn`), `tests/warga/cakupan.json`.
- **Antarmuka:** Konsumsi: tabel 0056, `MEDAN` dan `cekButir` (SP-007), `stafOK`, `jejakStmt`, `dalamWilayahStaf`, `stafNyata` (`src/staf.js`), `laju()`, `kodeBaru`, `pemegangKode` (`src/bnpb.js`), `modOK`, `superOK` (`src/posko.js`), `bersihMedia`, `jenisBerkas`, `gagal`, `bacaBody`. Hasil: `RUTE_SIPPA`, `P_SIPPA_BACA = ["pusdalops","koordalops","pimpinan"]`, `P_SIPPA_TULIS = ["pusdalops","koordalops"]`, `LAYAR_SIPPA` (11 nama), `RANTAI_DUMMY`, `halamanSippa`; bentuk jawaban `POST /api/sippa/lapangan/kirim` = `{diterima:[id], ganda:[id], ditolak:[{id, alasan}], jam_server}`. Dipakai SP-010 s.d. SP-012, SP-029, SP-035, SP-050, SP-052.
- **Rute (DT §4.2, §4.3):** `GET /pipa`, `/pipa/<layar>`, `/pipa/kit/:id`, `/pipa/lapangan`, `/admin/pipa`; `GET /api/sippa/kit`, `GET /api/sippa/kit/:id`, `POST /api/sippa/kit`, `POST /api/sippa/kit/:id`, `POST /api/sippa/komponen/:id`, `POST /api/sippa/gerak/:id`, `POST /api/sippa/tiba/:id`; `POST /api/sippa/tugas`, `POST /api/sippa/tugas-cabut/:id`; `GET /api/sippa/lapangan/saya`, `POST /api/sippa/lapangan/kirim` (dengan `jam_kirim` dan penurunan `jam_klien_meleset`, DT §6.1.5), `POST /api/sippa/lapangan/foto` (tabel `sippa_foto`, JPEG/WebP), `GET /api/sippa/foto/:id`; `GET /api/sippa/log`, `GET /api/sippa/log.csv`, `GET /api/sippa/probe.csv`, `POST /api/sippa/log`; `POST /api/sippa/dummy/isi` (layar `kit`, `log`, `lapangan`), `POST /api/sippa/dummy/hapus`.
- **Di luar:** rute data R2, A/B, skenario, laporan, telemetri (SP-029, SP-035, SP-050); `src/pipa.js` dan awalan `/api/pipa/*` (milik pipeline Python, tidak disentuh).
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Model:** sonnet; `guard-api` haiku, `security-reviewer` sonnet.
- **Dependensi:** SP-006, SP-007, DT §4.3. **Paralel dengan:** SP-009, SP-010, SP-023. **Isolasi:** worktree ya.
- **Selesai bila:** baris RU §2.4 untuk rute P0 hijau (tamu 303 ke `/admin/pantau?ke=` di halaman dan 401 di API; `verifikator` 403 polos; `pimpinan` POST 403; perencana 201; moderator untuk `hilang`/`pensiun`/`ditemukan`; kode salah 403 dan dihitung; > 300/jam 429; kode dicabut atau kedaluwarsa 403; kode hanya menggerakkan kit tugasnya dan hanya alasan gelar/bongkar/kembali; GET tanpa laju); `pantau.js` tidak mengalihkan ke URL luar; kirim lapangan dua kali = satu baris dan butir pelanggar CHECK masuk `ditolak`; badan 262.145 byte = 413; staf berwilayah 61 tidak melihat kit 62; staf nyata tidak melihat dummy; tanpa migrasi = 503 sopan; sesi tanpa peran SIPPA = 403 polos tanpa pengalihan; CSV log dan probe beraman injeksi rumus; di host `centurisk97.id` `/pipa` tamu 303 dan `/pipa/lapangan` 200.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §3.1, §9.1.2, §9.7.3, §9.8, §9.12.2 baris rute, §10.1 P0-05; DT §1.3, §1.4, §4, §6.1.5, ADR-03, ADR-05, ADR-06, ADR-08, ADR-09, ADR-13; RU §2.4. **Ukuran:** L

#### SP-009 Formulir kertas G3-lite dan probe
- **Tujuan:** cadangan wajib pilot bila web belum lolos uji: satu halaman A4 per sesi gelar (termasuk medan vonis pilot keputusan 53) dan satu per petak probe (tahap sebelum, sesudah, 24 jam), medan identik dengan `formulir.js`.
- **Berkas:** `data/kajian-bnpb/bangun/sippa_formulir.py` (pembangkit dari medan `public/pipa/formulir.js`, dibaca sebagai teks; pola `bangun/kontrak/lembar.py`/`pdf.mjs`), `data/kajian-bnpb/pipa/formulir/G3-lite.pdf`, `data/kajian-bnpb/pipa/formulir/probe.pdf`.
- **Antarmuka:** Konsumsi: `MEDAN` (SP-007), dibaca sebagai teks. Hasil: `G3-lite.pdf`, `probe.pdf`; dipakai SP-018 dan Lampiran G (SP-073).
- **Di luar:** formulir BBM dan gerak kit (masuk Lampiran G di SP-073).
- **Pengerja / pemeriksa:** `pipa-data` / sesi induk (memeriksa cetak), `selera-angka` (satuan, tanpa titik tengah).
- **Model:** sonnet; `selera-angka` haiku.
- **Dependensi:** SP-007, SP-004. **Paralel dengan:** SP-008, SP-010, SP-023. **Isolasi:** worktree ya.
- **Selesai bila:** dua PDF tercetak; tiap medan `formulir.js` muncul (RU §6.2); hanya logo BNPB, huruf Roboto; tidak ada medan kedalaman > 500 cm.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/sippa_formulir.py uji && .venv/bin/python bangun/sippa_formulir.py` (self-check membandingkan daftar medan PDF dengan `formulir.js`).
- **Rujukan:** PRD §4.1 minggu 44, §9.9, §10.1 P0-06; DS §3.7.2, §4.7; RU §6.2; KEPUTUSAN-SIPPA 53. **Ukuran:** S

#### SP-010 Cangkang klien `/pipa`, keadaan, tema, hitung inti, layar Log
- **Tujuan:** kerangka aplikasi staf: router History API dengan modul layar malas, navigasi tiga lebar, bilah konteks, enam keadaan standar, token tema terang dan gelap, ikon, fungsi hitung inti, dan layar rekap time-motion.
- **Berkas:** `public/pipa/app.js`, `public/pipa/keadaan.js`, `public/pipa/pipa.css` (satu-satunya lembar gaya layar `/pipa` selain `adegan.css`; token dari DS, memakai `public/inti/tema.css` dan `public/admin/admin.css`), `public/pipa/ikon.js`, `public/pipa/hitung.js` (ES module + `globalThis.SippaHitung`; subset P0: `KONST`, `KELAS_POMPA`, `kuantil`, `nKecil`, `durasiLog`, `zona`, `idHdpe`, `idLayflat`, `hfHW`, `fSuhu`, `batasTekanan`, `pRating`, `hidraulika`, `gerbangHidraulika`, `pesanGerbang`, `vonis`, `bbmJam`, `co2`, `vonisPilot`), `public/pipa/layar_log.js`, `tests/sippa/hitung.test.mjs`, `tests/sippa/keadaan.test.mjs`, `tests/sippa/fixtures/acuan.json` (kasus H1–H8, Z1–Z5, F1–F4, Q1, V1–V3 DT §5.8).
- **Antarmuka:** Konsumsi: rute P0 (SP-008, kontrak di DT), `public/inti/format.js` (`fmt`), `tabel.js`, `pilih.js` (`PilihCantik`), `tip.js` (`rapikanTip`), `nanti.js` (`nanti`), `kartu.js`. Hasil: `globalThis.SippaHitung` dengan fungsi bernama persis DT §5 dan konstanta `KONST.dalam_maks_m = 5` (satu-satunya tempat angka 5 m, DT §5.2); router `app.js` yang memuat `layar_<nama>.js` lewat `import()` dan memanggil `export async function pasang(akar, konteks)` dan `export function lepas()` tiap modul layar; `keadaan.js` mengekspor `memuat()`, `kosong(teks)`, `galat(status, pesan, ulang)`, `luring(per)`, `basi(per)`, `menunggu(alasan)`. Semua tiket layar berikutnya memakai kontrak `pasang`/`lepas` ini.
- **Di luar:** layar lain; fungsi hitung sisanya (SP-030); `public/inti/**` (dipakai, tidak disalin atau diubah).
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`.
- **Model:** sonnet; `selera-angka` haiku.
- **Dependensi:** SP-003, DS §2, §3.0, §3.1; DT §4.3. **Paralel dengan:** SP-008, SP-009, SP-023. **Isolasi:** worktree ya.
- **Selesai bila:** kasus acuan cocok (toleransi 1%; tanda `hisap` eksplisit); OD160 SDR11 NO-GO, sisa < 1 bar NO-GO, bawaan 300 L/min KONDISIONAL dan 600 L/min dengan 8 lance NO-GO H-SERAP, kedalaman 5,1 m ditolak, zona tepat 2,5 atau 5,0 km = jauh (keputusan 51); `vonisPilot` V1–V3 memberi tiga vonis; `kuantil` sama dengan numpy tipe 7; layar Log menampilkan p50/p90 per kelas dengan pil "n kecil" bila n < 5 dan penanda `jam_klien_meleset`; Ringkas tidak memuat MapLibre atau Three.js; mode gelap bekerja.
- **Bukti:** `node --test tests/sippa/hitung.test.mjs`.
- **Rujukan:** PRD §9.1, §9.2, §9.2.1, §9.3, §9.4.6, §10.1 P0-07; DS §2, §3.0, §3.1, §4.6; DT §5, §5.8; RU §2.1. **Ukuran:** M

#### SP-011 Layar Lapangan luring dan antrean
- **Tujuan:** form ponsel satu tangan yang bekerja tanpa sinyal dan mengirim saat ada sinyal, tanpa menggandakan kiriman.
- **Berkas:** `public/pipa/lapangan.js` (layar form luring yang dimuat cangkang `halamanSippaLapangan`, bukan modul `layar_*.js` router; DT §2.1), `public/pipa/antre.js` (IndexedDB `sippa-antre`, jatuh ke `localStorage` untuk teks, DT §6.1.3), `public/pipa/pipa.css` (gaya form lapangan), `tests/sippa/antre.test.mjs`.
- **Antarmuka:** Konsumsi: `MEDAN`, kontrak `pasang`/`lepas`, `GET /api/sippa/lapangan/saya`, `POST /api/sippa/lapangan/kirim`, `POST /api/sippa/lapangan/foto`, header `x-kode`, kontrak kirim DT §6.1.4 (dengan `jam_kirim`). Hasil: `antre.js` mengekspor `tambah(butir)`, `kirimSemua()`, `jumlah()`.
- **Di luar:** `public/sw-lapangan.js` (SP-013); rute (SP-008).
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `security-reviewer` (kode di fragmen dihapus dari alamat, penyisipan teks).
- **Model:** sonnet.
- **Dependensi:** SP-007, SP-010, SP-013. **Paralel dengan:** SP-012, SP-014, SP-022. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 F1–F8 hijau: mode pesawat, isi satu sesi gelar 6 tahap dengan medan vonis pilot + probe (tahap sesudah) + BBM, kembali daring, terkirim satu kali; butir ditolak tetap di antrean dengan alasan; foto PNG ditolak dengan pesan; fragmen `#k=` dihapus dari alamat; tombol ≥ 56 px; status antrean `aria-live`.
- **Bukti:** `node --test tests/sippa/*.test.mjs`; uji tangan lewat `preview_start` mode ponsel (dicatat di laporan tiket).
- **Rujukan:** PRD §9.9, §9.13, §10.1 P0-07; DS §3.7.2, §4.7; DT §6.1; RU §2.3 (F1–F8). **Ukuran:** M

#### SP-012 Layar Kit: daftar, rincian, tugaskan, QR
- **Tujuan:** inventaris dan lacak kit (keputusan 35) untuk pilot dan pemindahan ke banjir.
- **Berkas:** `public/pipa/layar_kit.js` (daftar, rincian dengan tab Komponen, Gerak, Pemakaian, BBM, Penugasan; form tugaskan dengan kode tampil sekali; label QR A6; pindai `BarcodeDetector` atau isian manual).
- **Antarmuka:** Konsumsi: rute `GET/POST /api/sippa/kit`, `POST /api/sippa/komponen/:id`, `POST /api/sippa/gerak/:id`, `POST /api/sippa/tiba/:id`, `POST /api/sippa/tugas` (SP-008); `globalThis.qrcode` (SP-013). Hasil: form gerak yang dipakai ulang SP-043 lewat `export function formGerak(kit, {rencana})`.
- **Di luar:** vendor QR (SP-013); peta kecil gerak boleh menyusul di SP-032 bila MapLibre belum dimuat.
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`, `security-reviewer` (kode penugasan tampil sekali, tidak disimpan klien).
- **Model:** sonnet.
- **Dependensi:** SP-010, SP-013. **Paralel dengan:** SP-011, SP-014, SP-022. **Isolasi:** worktree ya.
- **Selesai bila:** transisi status sesuai DT §6.2 menurut peran (tombol yang tidak sah tidak ditawarkan; `hilang`/`pensiun`/`ditemukan` hanya tampil untuk moderator); persen kehilangan dihitung (DT §6.2); QR terbaca dan tidak memuat kode penugasan (RU T5).
- **Bukti:** `node --test tests/sippa/*.test.mjs`; uji tangan `preview_start`.
- **Rujukan:** PRD §9.4.5, §10.1 P0-07; DS §3.13, §3.14, §4.5. **Ukuran:** M

#### SP-013 Vendor QR dan scope `sw-lapangan.js`
- **Tujuan:** pustaka QR lokal (CSP menolak CDN) dan service worker yang sama melayani `/pipa/lapangan`.
- **Berkas:** `public/vendor/qrcode/qrcode.min.js`, `public/vendor/qrcode/LICENSE`, `public/vendor/qrcode/README.md` (versi, sumber), `public/sw-lapangan.js` (persis DT §6.1.1: `VERSI = 3`; `JALUR_API` dan `KUNCI_KREDENSIAL` ditambah `"/api/sippa/lapangan/saya": "x-kode"`; `HALAMAN` ditambah `/pipa/lapangan`; penentuan halaman dari scope diganti peta jalur `TAMBAHAN` supaya scope `/pipa/lapangan` tidak memasang cangkang `/lapangan`; POST tetap tidak disentuh), `tests/warga/regu_luring.test.mjs` (kasus install scope `https://x/pipa/lapangan/` mengambil `/pipa/lapangan`).
- **Antarmuka:** Hasil: `globalThis.qrcode` (qrcode-generator, MIT); scope SW `/pipa/lapangan`.
- **Di luar:** `public/lapangan.js`.
- **Pengerja / pemeriksa:** `layar-peta` / `higiene-repo` (lisensi, ukuran), `security-reviewer`.
- **Model:** haiku (salin berkas dan tambahan tertulis); pemeriksa haiku dan sonnet.
- **Dependensi:** SP-002. **Paralel dengan:** SP-005, SP-007, SP-021. **Isolasi:** worktree ya.
- **Selesai bila:** `/lapangan` dan `/lacak` tetap bekerja; `/pipa/lapangan` tersimpan luring dengan cangkangnya sendiri.
- **Bukti:** `node --test tests/warga/regu_luring.test.mjs`; `npm run uji:agen` (gerbang header).
- **Rujukan:** PRD §9.4.5 (QR), §9.9; DT §6.1. **Ukuran:** S

#### SP-014 Gerbang SIPPA awal
- **Tujuan:** gerbang tanpa basis data yang dipasang sedini mungkin supaya semua tiket layar berikutnya tertahan olehnya.
- **Berkas:** `tests/sippa/gerbang-sippa.test.mjs` (butir 1–5 PRD §9.12.2 dan RU §2.8 butir 1–6, 8: tanpa "terbukti", tanpa em dash dan titik tengah di teks antarmuka, batas kedalaman 5 m hanya di `KONST.dalam_maks_m`, tanpa `toFixed(` di teks tampil, tanpa URL CDN dan import map sebaris, tanpa berkas data di `public/pipa/`), `tests/sippa/gerbang-cakupan.test.mjs` (RU §7.3, termasuk uji penolakannya sendiri).
- **Antarmuka:** Konsumsi: `KONST.dalam_maks_m` (SP-010), `tests/sippa/cakupan.json` (SP-003). Hasil: gerbang yang diperluas SP-055.
- **Di luar:** butir 6 (handler INP per handler), menyusul di SP-055.
- **Pengerja / pemeriksa:** `sippa` / `penulis-gerbang`.
- **Model:** sonnet.
- **Dependensi:** SP-010. **Paralel dengan:** SP-011, SP-012, SP-022. **Isolasi:** worktree ya.
- **Selesai bila:** gerbang hijau pada kode P0 dan merah bila disisipi pelanggaran contoh (diuji dengan fixture).
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §1.5, §9.12.2 baris gerbang SIPPA; RU §2.8, §7.3. **Ukuran:** S

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
- **Berkas:** berkas tiket SP-003, SP-004, SP-006 s.d. SP-014, SP-085.
- **Di luar:** berkas sesi lain yang ada di `git status` (daftar awal sesi memuat banyak perubahan milik pekerjaan lain; tidak ikut).
- **Pengerja / pemeriksa:** sesi induk / `higiene-repo`.
- **Model:** opus (sesi induk).
- **Dependensi:** SP-015. **Paralel dengan:** tidak. **Isolasi:** tidak.
- **Selesai bila:** tiap commit `git commit -m "SIPPA SP-0NN: ..." -- <berkas>`; tanpa `git add -A`; tanpa berkas `* 2.*`.
- **Bukti:** `git log --oneline -15`; `git status`.
- **Rujukan:** PRD §10.7. **Ukuran:** S

#### SP-017 [induk] Deploy P0, uji asap, kit SIPPA-001, kode regu pilot
- **Tujuan:** `/pipa/lapangan` siap di ponsel regu pilot.
- **Berkas:** `tests/warga/migrasi_beku.json` (0056 dicatat lewat `warga-api` sesudah diterapkan, masuk commit berikutnya).
- **Langkah:** PRD §10.6 langkah 1–8 dan RU §8.2: `npm run uji`; `npm run uji:sippa`; `npx --yes wrangler@4.42.0 d1 migrations apply poskowarga --remote`; push ke `staging` (terbit.yml pratinjau) dan uji asap di URL pratinjau dengan baris dummy; merge ke `main` (terbit.yml `wrangler deploy`; merge = tayang); uji asap produksi RU §8.3 A1–A12 (`/pipa` tamu 303 ke `/admin/pantau?ke=%2Fpipa`, staf pusdalops 200, `/pipa/lapangan` 200, `GET /api/sippa/kit` tamu 401); buat kit `SIPPA-001` jenis `pinjam_pilot` dengan `pemilik_asal` dari T-C; buat kode penugasan regu pilot dan serahkan tautan ke pemilik; satu kiriman dummy lalu `dummy/hapus`.
- **Di luar:** rute selain P0.
- **Pengerja / pemeriksa:** sesi induk / pemilik (menerima tautan regu).
- **Model:** opus.
- **Dependensi:** SP-016, SP-001 (T-B, T-C). **Paralel dengan:** tidak. **Isolasi:** tidak.
- **Selesai bila:** semua uji asap lolos; kit dan kode ada; bila gagal, `wrangler rollback` lalu revert di `main` (RU §8.4), dan pilot memakai kertas (SP-009).
- **Bukti:** log deploy; `GET /api/sippa/kit` dengan sesi staf memuat `SIPPA-001`.
- **Rujukan:** PRD §10.1 P0-09, §10.6; DT §8.4; RU §8.2–§8.4. **Ukuran:** S

#### SP-018 [induk] Pilot lapangan dan entri formulir kertas
- **Tujuan:** 2–3 sesi gelar di AOI T-B, probe sebelum, sesudah, dan 24 jam, dan vonis "dapat dipakai" pada 1 Nov menurut tujuh butir keputusan 53 (`vonisPilot`, RU §6.3); vonis "lebih baik" dipisah dan tidak diputus dari pilot.
- **Berkas:** tidak ada di repo selain data D1; formulir kertas dipindai dan dimasukkan staf lewat `POST /api/sippa/log` bila web terlambat.
- **Di luar:** vonis G4 (pilot tidak pernah dipakai untuk G4).
- **Pengerja / pemeriksa:** Satgas, Manggala Agni, BPBD (lapangan); sesi induk mencatat / pemilik memutus.
- **Model:** tidak berlaku.
- **Dependensi:** SP-009 (wajib), SP-017 (bila siap), SP-019 (`pilot_cek.py`), T-B. **Paralel dengan:** gelombang 6. **Isolasi:** tidak.
- **Selesai bila:** `python3 scripts/data/sippa/pilot_cek.py` atas ekspor `log.csv` dan `probe.csv` keluar 0 (RU §6.1 PL1–PL9); vonis tercatat; keputusan pemilik lanjut ke banjir atau tidak (minggu 45; DAPAT DIPAKAI BERSYARAT = perbaikan tertulis sebelum banjir).
- **Bukti:** `GET /api/sippa/log.csv`, `GET /api/sippa/probe.csv`, keluaran `pilot_cek.py`; pindaian kertas.
- **Rujukan:** PRD §1.3 U3–U4, §4.1 minggu 44–45, §10.1 P0-10; KEPUTUSAN-SIPPA 53; DT §5.5.2; RU §6. **Ukuran:** M

### 3.C Pipeline data (25 Okt–13 Des)

Semua skrip Python 3.12 stdlib dengan self-check `__main__`, keluaran di `data/sippa/keluaran/*.json` (kunci pertama `dibuat`, lalu `per`, `ambang`, `sumber`, `catatan`), batas 8 MB per berkas. Tidak ada salinan di `public/` (keputusan 32).

#### SP-019 Kembar Python `hidraulika.py`, `respons.py`, `bersama.py`, dan pemeriksa pilot
- **Tujuan:** kembar Python fungsi hitung JS untuk pipeline dan buku (DT §5.1): hidraulika, gerbang, BBM, CO2, neraca air, Joukowsky, `saran_sarana`, `matriks_respons`, `tingkat_pemicu`, statistik, finansial, `vonis_pilot`; dan `pilot_cek.py` untuk pilot minggu 44.
- **Berkas:** `scripts/data/sippa/hidraulika.py`, `scripts/data/sippa/respons.py`, `scripts/data/sippa/bersama.py` (termasuk `vonis_pilot`), `scripts/data/sippa/kembar_cli.py`, `scripts/data/sippa/pilot_cek.py`.
- **Antarmuka:** Konsumsi: `tests/sippa/fixtures/acuan.json` (SP-010). Hasil: fungsi Python bernama sama dengan JS dalam snake_case (`hidraulika`, `gerbang_hidraulika`, `vonis`, `saran_sarana`, `matriks_respons`, `vonis_pilot`), dipanggil SP-026 lewat `python3 -I scripts/data/sippa/kembar_cli.py` yang membaca kasus dari stdin dan mencetak hasil JSON (DT §5.1).
- **Di luar:** `public/pipa/hitung.js`; uji kembar (SP-026).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-010 (`acuan.json`). **Paralel dengan:** SP-025, SP-065. Harus selesai sebelum sesi pilot pertama (SP-018). **Isolasi:** worktree ya.
- **Selesai bila:** self-check mereproduksi kasus `tests/sippa/fixtures/acuan.json` (H1–H8, Z1–Z5, F1–F4, Q1, W1, P1, N1, A1, T1–T4, V1–V3; toleransi 1%), empat tingkat `matriks_respons`, enam aturan `saran_sarana`; `pilot_cek.py uji` lolos fixture V1–V3 dan menolak fixture tanpa probe `sesudah`.
- **Bukti:** `for s in bersama hidraulika respons pilot_cek; do python3 scripts/data/sippa/$s.py uji || exit 1; done`.
- **Rujukan:** PRD §5.4, §6.4, §9.3, §9.12.2 baris skrip Python; DT §5, §5.8, §7.2; RU §4.1, §6.1. **Ukuran:** M

#### SP-020 `sel22.py` kekerapan sel 2,2 km
- **Tujuan:** kekerapan 2012–2025 per sel 2,2 km dari VIIRS mentah.
- **Berkas:** `scripts/data/sippa/sel22.py`, `data/sippa/keluaran/sel22.json`.
- **Antarmuka:** Hasil: `sel22.json` dengan medan DT §3.1.4. Dipakai SP-021, SP-063.
- **Di luar:** zona.
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-002. **Paralel dengan:** SP-003, SP-004, SP-006. **Isolasi:** worktree ya.
- **Selesai bila:** porsi deteksi 2019 dan 2023 di sel berulang direproduksi (72% dan 85%, KD §1) sebagai invarian rentang, bukan potret; ringkasan ≥ 3/5/7/10 tahun.
- **Bukti:** `python3 scripts/data/sippa/sel22.py uji && python3 scripts/data/sippa/sel22.py`.
- **Rujukan:** PRD §7.1, §7.2, §9.7.1. **Ukuran:** S

#### SP-021 `zona.py` kelayakan kompleks, sel, ringkasan zona
- **Tujuan:** zona A–D tiga versi (`zona_k` versi `kendala.json`, `zona_u` jalan utama OSM, `zona_o` semua jalan OSM; aturan `<`, keputusan 51) per kompleks Kalteng, kelayakan per sel 2,2 km, dan ringkasan per provinsi dan kabupaten.
- **Berkas:** `scripts/data/sippa/zona.py`, `data/sippa/keluaran/kelayakan_kompleks.json`, `data/sippa/keluaran/kelayakan_sel.json`, `data/sippa/keluaran/zona.json`.
- **Antarmuka:** Konsumsi: `sel22.json`, `kajian/pipa/data/*.csv`, `public/data/kendala.json`, `khg_prioritas.json`, `kompleks_konsesi.json`, `akses.json`. Hasil: tiga JSON dengan medan DT §3.1.1–§3.1.3 (`zona_k`, `zona_u`, `zona_o`, `kolom_keyakinan`). Dipakai SP-023, SP-029, SP-032, SP-063, SP-064.
- **Di luar:** jalan cek staf (data D1, dibaca layar).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-020. **Paralel dengan:** SP-005, SP-007, SP-013. **Isolasi:** worktree ya.
- **Selesai bila:** invarian: jumlah zona = jumlah kompleks, tiap kompleks tepat satu zona per versi; dari data 24–25 Okt menghasilkan A188/B418/C89/D170, A198/B429/C81/D157, dan A469/B158/C167/D71 (dicek sebagai pencocokan terhadap `matriks_jarak.md` dengan sha256 masukan tercatat, RU §4.1, §4.3, bukan konstanta di skrip); tanpa nama perusahaan konsesi.
- **Bukti:** `python3 scripts/data/sippa/zona.py uji && python3 scripts/data/sippa/zona.py`.
- **Rujukan:** PRD §5.1, §7.2, §9.7.1, §9.12.2; DT §3.1, §7.2. **Ukuran:** M

#### SP-022 `nasional.py` kit per provinsi
- **Berkas:** `scripts/data/sippa/nasional.py`, `data/sippa/keluaran/kit_nasional.json`.
- **Antarmuka:** Hasil: `kit_nasional.json` (DT §3.1.5). Dipakai SP-062, SP-063.
- **Tujuan:** 18 provinsi, kelompok gambut/mineral, kit per provinsi dengan `ha_per_kit: 22700` berlabel asumsi, berlabel "rencana bersyarat, bukan pengadaan".
- **Di luar:** RAB nasional (SP-062).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-002. **Paralel dengan:** SP-011, SP-012, SP-014. **Isolasi:** worktree ya.
- **Selesai bila:** dari `luas_resmi.json` saat ini total 81 dan gambut 56; porsi tiap provinsi ≥ 0; invarian jumlah = total.
- **Bukti:** `python3 scripts/data/sippa/nasional.py uji && python3 scripts/data/sippa/nasional.py`.
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
- **Bukti:** `python3 scripts/data/sippa/pemicu.py uji && python3 scripts/data/sippa/pemicu.py`.
- **Rujukan:** PRD §9.4.4, §9.7.1, §9.12.2; DT §3.1.6, §5.4, §7.2. **Ukuran:** S

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
- **Tujuan:** langkah persis DT §7.4: `pemicu.py uji` lalu `pemicu.py` harian (boleh gagal, `::error` bila swauji merah); unggah `pemicu.json` ke R2 `poskokarhutla-foto/sippa/` tiap jalan; berkas tahunan (`kelayakan_kompleks`, `kelayakan_sel`, `zona`, `sel22`, `kit_nasional`, `aoi_calon`) diunggah hanya pada `workflow_dispatch` dengan masukan `sippa_tahunan=1`; pola langkah `risiko/`.
- **Berkas:** `.github/workflows/data.yml`.
- **Antarmuka:** Hasil: objek R2 `poskokarhutla-foto/sippa/<nama>.json`. Dipakai SP-029.
- **Di luar:** workflow baru (dilarang, PRD §7.3); `sel22.py` dan `nasional.py` tetap manual/tahunan.
- **Pengerja / pemeriksa:** `mekanik-mesin` / `higiene-repo`.
- **Model:** sonnet; pemeriksa haiku.
- **Dependensi:** SP-020, SP-021, SP-022, SP-023. **Paralel dengan:** SP-019, SP-065. **Isolasi:** worktree ya.
- **Selesai bila:** satu jalan manual `workflow_dispatch` (dijalankan sesi induk setelah commit) memunculkan berkas di R2; langkah gagal tidak menghentikan langkah data lain yang sudah ada.
- **Bukti:** `npm run uji:agen` (gerbang workflow bila ada); log Actions (sesi induk) mencetak sha berkas yang diunggah (RU §4.3).
- **Rujukan:** PRD §7.2, §7.3, §10.2 W-03; DT §7.3, §7.4. **Ukuran:** S

#### SP-026 Uji kembar JS dan Python
- **Berkas:** `tests/sippa/kembar.test.mjs`.
- **Tujuan:** `hitung.js` dan `scripts/data/sippa/*.py` memberi hasil sama untuk semua kasus `acuan.json` berlabel `kembar: true` (memanggil `python3 -I scripts/data/sippa/kembar_cli.py`).
- **Pengerja / pemeriksa:** `sippa` / `penulis-gerbang`.
- **Model:** sonnet.
- **Dependensi:** SP-019, SP-030. **Paralel dengan:** SP-031, SP-032, SP-033, SP-035. **Isolasi:** worktree ya.
- **Selesai bila:** tiap bahasa dalam 1% dari nilai harapan dan JS dalam 0,1% dari Python (RU §2.1); string, kode gerbang, dan vonis sama persis; kasus baru yang diekspor kalkulator otomatis ikut.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.3, §9.12.2 baris kembar; RU §1.1 L2, §2.1. **Ukuran:** S

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
- **Berkas:** `scripts/data/sippa/aoi.py` (DT §7.2), `data/sippa/keluaran/aoi_calon.json`.
- **Di luar:** keputusan AOI (pemilik, G0).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-021, SP-029 (usulan staf terekspor), SP-018. **Paralel dengan:** gelombang 16. **Isolasi:** worktree ya.
- **Selesai bila:** saringan G0 (sel aktif ≥ 7 dari 14 tahun, gambut, air < 2,5 km) tertulis di `ambang`; ≥ 1 calon pada data uji; tanpa nama perusahaan.
- **Bukti:** `python3 scripts/data/sippa/aoi.py uji && python3 scripts/data/sippa/aoi.py`.
- **Rujukan:** PRD §4.1 minggu 50, §4.4 G0, §9.7.1. **Ukuran:** S

### 3.D Web rilis R1 (28 Okt–8 Nov): perencanaan dasar, A/B, laporan pilot

R1 menggabungkan P1 PRD (W-04, W-05) dengan W-06 dan templat Laporan pilot dari W-07, karena minggu 45 butuh `/pipa/ab` berisi hasil pilot ("n kecil") dan minggu 46 butuh Laporan pilot PDF (PRD §4.1).

#### SP-029 Rute data, ringkas, cek jalan, usul AOI
- **Berkas:** `src/sippa.js` (rute `GET /api/sippa/data/<nama>` dengan hak dicek sebelum R2 dan daftar nama tetap `DATA_SIPPA`, `GET /api/sippa/ringkas`, `GET/POST /api/sippa/jalan-cek`, `POST /api/sippa/aoi`; dummy layar `peta`, `ringkas`), `tests/warga/sippa.test.mjs`, `tests/warga/cakupan.json`.
- **Antarmuka:** Konsumsi: R2 `sippa/`, tabel 0056. Hasil: `GET /api/sippa/data/<nama>` (nama ∈ `kelayakan_kompleks`, `kelayakan_sel`, `zona`, `sel22`, `kit_nasional`, `pemicu`, `aoi_calon`), `GET /api/sippa/ringkas`.
- **Tujuan:** data turunan R2 hanya lewat sesi; tamu tidak tahu berkas ada atau tidak.
- **Di luar:** layar.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Model:** sonnet; `guard-api` haiku.
- **Dependensi:** SP-008, SP-025. **Paralel dengan:** SP-030, SP-034, SP-058, SP-062. **Isolasi:** worktree ya.
- **Selesai bila:** tamu 401 identik untuk berkas ada dan tidak ada; 404 `{status:"belum_ada"}` untuk staf bila belum diunggah; GET tanpa batas laju (ADR-06); `ringkas` memuat `pemicu_dibuat` dari `MEDIA.head` (DT §8.3); cakupan terdaftar.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.7.1, §9.7.3, §10.2 W-04; DT §4.3; RU §2.4. **Ukuran:** M

#### SP-030 `hitung.js` lengkap dan `batas.js`
- **Berkas:** `public/pipa/hitung.js` (sisa fungsi DT §5: `neracaAir`, `joukowsky`, `zonaTerverifikasi`, `saranSarana` versi `k|u|o|v`, `matriksRespons`, `tingkatPemicu`, `bandingRerata`, `bandingProporsi`, `vonisG4`, `af`, `crf`, `biayaPerHa`, `npv`, `bcr`, `impas`, gerbang H-RATING, H-DAYA, H-KECEPATAN, H-PANAS, H-AIR, H-DSM, H-UJI), `public/pipa/batas.js` (teks "Batas pemakaian alat", sumber tunggal untuk layar Data dan Lampiran L buku), `tests/sippa/hitung.test.mjs`, `tests/sippa/fixtures/acuan.json`.
- **Antarmuka:** Konsumsi: `SippaHitung` (SP-010). Hasil: sisa fungsi PRD §9.3 di `SippaHitung`; `batas.js` mengekspor `BATAS_ALAT` (larik paragraf), dibaca SP-031 dan SP-073 (Lampiran L).
- **Tujuan:** satu sumber rumus untuk kalkulator, peta, Studio, 3D, laporan, dan buku.
- **Di luar:** mesin Studio (SP-041).
- **Pengerja / pemeriksa:** `sippa` / `validasi-model` (rumus statistik dan biaya), `penulis-gerbang`.
- **Model:** sonnet.
- **Dependensi:** SP-010. **Paralel dengan:** SP-029, SP-034, SP-058, SP-062. **Isolasi:** worktree ya.
- **Selesai bila:** `saranSarana` enam aturan; `matriksRespons` empat tingkat dengan `bara_regu` dari `operasi.json`; `tingkatPemicu` T1–T4; `bandingRerata` W1 dan n < 8 = "belum bisa diputus"; Agresti-Caffo P1; finansial N1; impas semi Rp3,19 M (baca-C); `vonisG4` tiga vonis dan data pilot tidak pernah diberi vonis G4.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.3, §9.4.8, §9.12.2 baris fungsi murni; DT §5; RU §2.1. **Ukuran:** M

#### SP-031 Layar Ringkas dan Data
- **Berkas:** `public/pipa/layar_ringkas.js`, `public/pipa/layar_data.js`.
- **Tujuan:** empat kartu Insight (Kit, Pemicu, Pilot, Zona tiga versi) yang memuat sendiri-sendiri; daftar dataset, rumus, gerbang, beda angka mesin Studio lawan `hidraulika()` (DT §5.7), dan batas alat dari `batas.js`.
- **Di luar:** angka yang dihitung ulang di klien (diambil dari JSON/rute).
- **Pengerja / pemeriksa:** `sippa` / `selera-angka`, `inp-reviewer`.
- **Model:** sonnet; `selera-angka` haiku.
- **Dependensi:** SP-029, SP-030. **Paralel dengan:** SP-026, SP-032, SP-033, SP-035. **Isolasi:** worktree ya.
- **Selesai bila:** satu kartu galat tidak menghentikan kartu lain; pil basi dan menunggu tampil; tiap angka bersumber dan berwaktu.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.4.1, §9.4.8; DS §4.1, §4.13. **Ukuran:** M

#### SP-032 Layar Peta kelayakan dan saran sarana
- **Berkas:** `public/pipa/layar_peta.js`, `public/pipa/pipa.css` (gaya peta).
- **Tujuan:** keputusan 30, 44, 51, 52: sakelar per kompleks dan per sel 2,2 km, segmen versi zona (Konservatif = versi `kendala.json`, Optimistis = semua jalan OSM, Terverifikasi) dan ringkasan zona empat kolom (termasuk jalan utama OSM), simbol zona berwarna palet PRD dengan huruf A–D dan pola wajib, rincian kompleks, saran sarana dengan alasan berangka, tautan ke Hitung, aksi cek jalan dan usul AOI, daftar alternatif berpaginasi 50, basemap gelap.
- **Di luar:** vendor MapLibre (sudah ada di `public/vendor/maplibre/`).
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`, `security-reviewer` (penyisipan teks dari data).
- **Model:** sonnet.
- **Dependensi:** SP-021, SP-029, SP-030. **Paralel dengan:** SP-026, SP-031, SP-033, SP-035. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 P1–P7 hijau: sakelar hanya `setLayoutProperty`/`setFilter`; tidak ada interaksi > 200 ms; versi Terverifikasi berbeda dari Konservatif bila ada cek jalan lolos; kartu judul dan ringkasan memakai angka `zona.json` (A188, A198, A469); gerbang memastikan tiap lapisan zona memasang huruf dan pola.
- **Bukti:** `npm run uji:sippa`; laporan `inp-reviewer`.
- **Rujukan:** PRD §9.4.2, §9.13; DS §3.6, §4.2. **Ukuran:** L

#### SP-033 Layar Hitung
- **Berkas:** `public/pipa/layar_hitung.js`.
- **Tujuan:** kalkulator hidraulika dengan masukan dan batas PRD §9.4.3 (debit bawaan 300 L/min, 8 lance, debit pemakai lain 0; 600 L/min dengan 8 lance tampil NO-GO H-SERAP), kartu vonis, kartu angka, grafik tekanan sepanjang trase dan head loss per diameter, salin tautan, simpan sebagai skenario Studio (aktif setelah SP-035), ekspor acuan (Admin).
- **Di luar:** Studio.
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`.
- **Model:** sonnet.
- **Dependensi:** SP-029 (parameter `?kompleks=`), SP-030. **Paralel dengan:** SP-026, SP-031, SP-032, SP-035. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 H1–H6 hijau: kedalaman > 5 m ditolak di masukan dengan pesan PRD; 3–5 m berpil "lengan uji"; bawaan memberi KONDISIONAL; grafik lewat `nanti()`; ponsel memakai akordeon dengan vonis menempel.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.4.3, §6.4; DS §4.3. **Ukuran:** M

#### SP-034 Migrasi 0057 A/B, skenario, laporan dan uji skema
- **Berkas:** `migrations/0057_sippa_ab_skenario.sql`, `tests/warga/sippa_skema.test.mjs`, `tests/warga/cakupan.json`.
- **Antarmuka:** Hasil: tabel 0057 persis DT §3.3. Dipakai SP-035.
- **Tujuan:** `sippa_ab_unggah`, `sippa_petak`, `sippa_skenario`, `sippa_laporan`.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`, `penulis-gerbang`.
- **Model:** sonnet; `migrasi-idempoten` haiku.
- **Dependensi:** SP-006. **Paralel dengan:** SP-029, SP-030, SP-058, SP-062. **Isolasi:** worktree ya.
- **Selesai bila:** RU §3.3 hijau: idempoten; CHECK menolak surfaktan > 0 di lengan bukan surfaktan, state skenario bukan objek JSON atau > 32 KB, tanggal bukan YYYY-MM-DD, `UNIQUE (aoi, petak_id)` ganda, sha unggahan ganda, `ada_berkas = 1` tanpa sha.
- **Bukti:** `node --test tests/warga/sippa_skema.test.mjs`.
- **Rujukan:** PRD §9.7.2 (0057), §10.2 W-06; DT §3.2–§3.5; RU §3. **Ukuran:** S

#### SP-035 Rute A/B, skenario, laporan
- **Berkas:** `src/sippa.js` (`GET /api/sippa/ab`, `POST /api/sippa/ab/unggah`, `POST /api/sippa/ab-status/:id`, `GET /api/sippa/ab.csv`, `GET/POST /api/sippa/skenario`, `POST /api/sippa/skenario-hapus/:id`, `GET/POST /api/sippa/laporan`, `GET /api/sippa/laporan-berkas/:id`; dummy layar `ab`, `studio`, `laporan`), `tests/warga/sippa.test.mjs`, `tests/warga/cakupan.json`.
- **Antarmuka:** Konsumsi: tabel 0057, `SippaHitung.bandingRerata`/`bandingProporsi` hanya di klien (server tidak menghitung statistik). Hasil: rute A/B, skenario, laporan DT §4.3.
- **Tujuan:** unggah CSV petak dengan tolak-semua bila satu baris salah; arsip PDF di R2 `sippa-laporan/`.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer` (unggah CSV dan PDF, injeksi rumus).
- **Model:** sonnet.
- **Dependensi:** SP-034, SP-008. **Paralel dengan:** SP-026, SP-031, SP-032, SP-033. **Isolasi:** worktree ya.
- **Selesai bila:** baris RU §2.4 untuk rute ini hijau: CSV satu baris salah = 400 dengan nomor baris dan 0 baris tersimpan; sha sama = 409; PDF tanpa `%PDF-` ditolak dan PDF disajikan `attachment` + `content-security-policy: sandbox`; hapus skenario hanya pembuat atau moderator; status evaluator hanya moderator.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.4.7, §9.7.3, §10.2 W-06; DT §4.3; RU §2.4. **Ukuran:** M

#### SP-036 Layar A/B
- **Berkas:** `public/pipa/layar_ab.js`.
- **Tujuan:** unggah CSV, ringkasan per lengan dibanding konvensional (Welch, Agresti-Caffo, biaya per ha dua definisi), kartu vonis G4 tiga nilai, kartu vonis pilot keputusan 53 tujuh butir (DS §4.8), grafik titik dan batang nyala ulang 7/30/90 hari, pil "hipotesis" dan "pilot, n kecil".
- **Pengerja / pemeriksa:** `sippa` / `validasi-model` (vonis dan CI), `selera-angka`, `inp-reviewer`.
- **Model:** sonnet.
- **Dependensi:** SP-030, SP-035. **Paralel dengan:** SP-037, SP-040, SP-059, SP-060. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 B1–B3 dan G6 hijau: hasil pilot tidak pernah memberi vonis G4; vonis pilot tampil terpisah dengan tiga nilai; n < 8 = "belum bisa diputus"; daftar galat unggahan per baris dan kolom.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.4.7, §1.3 U4, U7; DS §3.8, §4.8. **Ukuran:** M

#### SP-037 Layar Laporan dan templat Laporan pilot
- **Berkas:** `public/pipa/layar_laporan.js`, `public/pipa/laporan_isi.js` (fungsi murni `isiLaporan(jenis, data)`), `tests/sippa/laporan_isi.test.mjs`.
- **Antarmuka:** Konsumsi: `public/vendor/jspdf/`, `public/inti/roboto.js`, `POST /api/sippa/laporan`. Hasil: `laporan_isi.js` mengekspor `isiLaporan(jenis, data, {per, prov})` yang mengembalikan `{judul, nama_berkas, blok: [{tipe: "judul"|"paragraf"|"tabel"|"angka"|"foto"|"pil", ...}], kaki}` (DT §6.4); dipakai SP-044, SP-054.
- **Tujuan:** PDF di peramban dengan jsPDF lokal `public/vendor/jspdf/` dan Roboto `public/inti/roboto.js` (pola `public/laporan_karhutla_deck.js`; `public/laporan_bnpb.js` TIDAK disalin karena memuat jsPDF dari CDN, DT §6.4), arsip lewat `POST /api/sippa/laporan`; templat pertama: Laporan pilot (tujuh butir `vonisPilot` dan vonis "lebih baik" dipisah). Uji tangan CSP jsPDF (butir teknis BT-05).
- **Di luar:** templat kejadian, mingguan, musim, skenario (SP-044).
- **Pengerja / pemeriksa:** `sippa` / `selera-angka`, `security-reviewer`.
- **Model:** sonnet.
- **Dependensi:** SP-010, SP-035. **Paralel dengan:** SP-036, SP-040, SP-059, SP-060. **Isolasi:** worktree ya.
- **Selesai bila:** hanya logo BNPB; tiap angka bersumber dan berwaktu; tanpa "terbukti", em dash, titik tengah; nama berkas `sippa-pilot-<prov>-<YYYYMMDD>.pdf`; kaki "Dibuat otomatis ...".
- **Bukti:** `node --test tests/sippa/laporan_isi.test.mjs`.
- **Rujukan:** PRD §9.10, §4.1 minggu 46, §10.2 W-07; DS §3.18, §4.12; DT §6.4, §9.2 BT-05; RU §2.3 (L1–L3, G6). **Ukuran:** M

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
- **Berkas:** berkas SP-019 s.d. SP-037; commit data turunan `data/sippa/keluaran/*.json` terpisah dari kode; `tests/warga/migrasi_beku.json` (0056 dari SP-017, 0057 sesudah diterapkan).
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
- **Tujuan:** port mesin pemilik dengan angka dan rumus tidak berubah; hanya tiga jenis perubahan bertanda `SIPPA:` (DT §5.7: pembungkus skrip klasik tanpa `localStorage`; `gerbangSippa` yang hanya menambah hambatan: H-SERAP dan H-DALAM hanya untuk keadaan ber-blok `sippa` (BT-01), `jaringan_permanen` > 2 koridor, H-AIR 1,5x; perbaikan cacat G23 termasuk slot heli `menunggu`); preset S0 dan S0B dari BOM dan `sippa.rab` (SP-062).
- **Di luar:** UI (SP-042).
- **Pengerja / pemeriksa:** `sippa` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-030, SP-040, SP-062. **Paralel dengan:** SP-027, SP-043, SP-048, SP-064. **Isolasi:** worktree ya.
- **Selesai bila:** angka jalan-ulang baca-C C1.4 dari `defaultState` dan tiga preset cocok toleransi 0,5% (CAPEX S1/S2/S3, OPEX, TCO 5 tahun, tekanan semi 5,39 bar, impas semi, Monte Carlo P10/P50/P90); properti 200 keadaan acak berbenih: keras sesudah ≥ keras sebelum; MC deterministik; tidak ada status "GO".
- **Bukti:** `node --test tests/sippa/studio_mesin.test.mjs` (termasuk `tests/sippa/fixtures/studio_konstanta.json`, RU §2.2).
- **Rujukan:** PRD §9.5.1, §9.5.2, §12.1 G01, G04, G10, G11, G13, G22, G23; DT §5.7; RU §2.2. **Ukuran:** M

#### SP-042 Layar Studio, Web Worker, simpan skenario
- **Berkas:** `public/pipa/layar_studio.js`, `public/pipa/studio_pekerja.js`, `public/pipa/pipa.css` (gaya Studio).
- **Tujuan:** delapan kelompok akordeon, 32 dimensi dan 36 parameter, tab Bandingkan semua (S0, S0B, S1, S2, S3 dan paling banyak 6 skenario tersimpan), tab lain sesuai PRD §9.5.3, empat sumber manfaat bawaan 0 berpil asumsi-kebijakan, simpan/impor/ekspor, cetak ke templat Skenario.
- **Di luar:** templat PDF Skenario (SP-044).
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`, `validasi-model` (manfaat dan NPV tidak menyesatkan).
- **Model:** sonnet.
- **Dependensi:** SP-041, SP-035. **Paralel dengan:** SP-044, SP-068, SP-069, SP-070. **Isolasi:** worktree ya.
- **Selesai bila:** geser slider tidak membekukan layar (MC di Web Worker; jatuh ke `nanti()` dengan pita bila tidak ada); kolom NO-GO tetap tampil dengan alasan; nilai terbaik hanya disorot di antara kolom bukan NO-GO; impor berkas `karhutla-decision-v1` berhasil.
- **Bukti:** `npm run uji:sippa`; laporan `inp-reviewer`.
- **Rujukan:** PRD §9.5, §1.3 U10; DS §3.9, §3.10, §4.9. **Ukuran:** L

#### SP-043 Layar Pemicu dan rencana pra-posisi
- **Berkas:** `public/pipa/layar_pemicu.js`.
- **Tujuan:** kartu judul, tabel kabupaten, grafik 7 hari P(FWI ≥ 14), aksi "Buat rencana pra-posisi" (`POST /api/sippa/gerak/:id` dengan `rencana: 1`, konfirmasi `POST /api/sippa/tiba/:id`), mode jelajah ambang lewat `tingkatPemicu` tanpa menyimpan.
- **Pengerja / pemeriksa:** `sippa` / `selera-angka`, `inp-reviewer`.
- **Model:** sonnet.
- **Dependensi:** SP-012, SP-023, SP-025, SP-029. **Paralel dengan:** SP-027, SP-041, SP-048, SP-064. **Isolasi:** worktree ya.
- **Selesai bila:** ansambel basi = PRA-POSISI/GELAR tampil "–, data ansambel basi"; gerak rencana tampil di layar Kit sampai dikonfirmasi tiba.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.4.4, §10.2 W-09; DS §4.4. **Ukuran:** M

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
- **Berkas:** `src/pantau.js` (`JENIS.sippa_mingguan`, detektor di `DETEKTOR`, `sippa_` di regex tabel-belum; ADR-11), `public/admin/pantau.js` (`JENIS` sama dengan server), `tests/warga/sippa.test.mjs`.
- **Tujuan:** butir terhitung `sippa_mingguan` di Meja Pantau: muncul Senin sejak 07.40 WIB bila ada kit berstatus `banjir` atau `gelar` dan tidak ada `sippa_laporan` jenis `mingguan` dalam 7 hari terakhir; tanpa tabel baru (tabel `pengingat` 0028 punya CHECK jenis tertutup) dan tanpa jadwal cron baru.
- **Di luar:** `src/pengingat.js` dan email ringkas (tidak dipakai, ADR-11).
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`.
- **Model:** sonnet; pemeriksa haiku.
- **Dependensi:** SP-008, SP-034 (tabel `sippa_laporan`). **Paralel dengan:** SP-050, SP-071, SP-072, SP-073. **Isolasi:** worktree ya.
- **Selesai bila:** tanpa kit aktif tidak ada butir; dengan kit `banjir` dan tanpa laporan mingguan 7 hari ada satu butir hari Senin; sesudah laporan mingguan diarsipkan butir hilang; peran `pusdalops` melihatnya.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.10; DT §6.4 butir 5, §8.3, ADR-11. **Ukuran:** S

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
- **Antarmuka:** Konsumsi: `SippaHitung.hidraulika`, kompleks terpilih dari query `?kompleks=`. Hasil: `adegan.js` mengekspor logika murni `tataKomponen()`, `profilWarna(hasil)`, `frontBasah(t_s, Q_ls, h_m, ne)`, `cekKedalaman(m)` untuk uji (DT §6.5).
- **Tujuan:** tiga adegan (susunan kit, jalur air dengan warna tekanan dari `hidraulika()`, injeksi dengan front basah ilustratif), panel teks berangka sama, jatuh ke SVG 2D tanpa WebGL, label "Ilustrasi, bukan model panas terkalibrasi".
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`.
- **Model:** sonnet.
- **Dependensi:** SP-030, SP-032, SP-048. **Paralel dengan:** SP-051, SP-074, SP-075. **Isolasi:** worktree ya.
- **Selesai bila:** komponen tidak saling tumpuk; profil tekanan = `hidraulika()`; front basah monoton naik; kedalaman > 5 ditolak; render hanya saat berubah; `prefers-reduced-motion` dihormati; `dispose` saat pindah layar.
- **Bukti:** `node --test tests/sippa/adegan_logika.test.mjs`.
- **Rujukan:** PRD §9.6, §10.2 W-10; DS §3.17, §4.10; RU §2.3 (D1–D3). **Ukuran:** L

#### SP-050 Migrasi 0058 dan rute telemetri, alarm, ringkas harian
- **Berkas:** `migrations/0058_sippa_telemetri.sql` (persis DT §3.4: satu baris per pesan, T-J), `src/sippa.js` (`POST/GET /api/sippa/telemetri`, `GET/POST /api/sippa/perangkat`, `POST /api/sippa/perangkat-cabut/:id`, `GET /api/sippa/alarm`, `POST /api/sippa/alarm-tutup/:id`, `dariDatar()` dengan `tag_datar`, `AMBANG_ALARM`, `bersihkanSippa`; dummy layar `telemetri`), `src/worker.js` (`bersihkanSippa` di `bersihSemua` cron menit 17 yang ada), `src/pantau.js` (`JENIS.sippa_alarm` dan detektornya), `public/admin/pantau.js` (`JENIS` sama), `tests/warga/sippa_skema.test.mjs`, `tests/warga/sippa.test.mjs`, `tests/warga/cakupan.json`.
- **Antarmuka:** Konsumsi: tabel 0056, cron menit 17 yang ada. Hasil: tabel 0058 DT §3.4; `dariDatar(o)`; rute telemetri DT §4.3; butir Meja Pantau `sippa_alarm`.
- **Tujuan:** kerangka telemetri siap menerima data (keputusan 38).
- **Di luar:** jadwal cron baru (batas 5 jadwal akun Free).
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`, `guard-api`, `security-reviewer` (token perangkat).
- **Model:** sonnet; haiku untuk dua pemeriksa pertama.
- **Dependensi:** SP-006, SP-008. **Paralel dengan:** SP-045, SP-071, SP-072, SP-073. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 E1–E3, §2.4 baris telemetri, dan §3.4 hijau: token salah 401; > 300 token salah per jam 429; pesan ke-121 dalam sejam 429 (dihitung dari baris tabel, tanpa tulisan tambahan); nilai di luar rentang tersimpan mutu 2; waktu 6 menit di depan ditolak; pesan sama dikirim ulang = `ganda`; > 500 bacaan atau > 65.536 byte ditolak; token tampil sekali dan hanya sha256 tersimpan; tiap kode alarm terbuka sekali dan tertutup saat pulih; ringkas harian dan hapus > 30 hari jalan di cron yang ada.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.7.2 (0058), §9.11, §10.2 W-11; DT §3.4, §6.3, ADR-07; RU §2.4, §3.4; PRD §2.2 T-J, T-K. **Ukuran:** M

#### SP-051 Layar Telemetri
- **Berkas:** `public/pipa/layar_telemetri.js`.
- **Tujuan:** tabel perangkat, grafik 24 jam per tag dengan garis ambang, alarm aktif dan riwayat; keadaan kosong "Belum ada perangkat terdaftar ...".
- **Pengerja / pemeriksa:** `sippa` / `selera-angka`, `inp-reviewer`.
- **Model:** sonnet.
- **Dependensi:** SP-050. **Paralel dengan:** SP-049, SP-074, SP-075. **Isolasi:** worktree ya.
- **Selesai bila:** daftar perangkat moderator menampilkan token sekali; tag identik dengan P&ID SIPPA-G-02; seri 24 jam dari `json_each` per pesan.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.11; DS §4.11. **Ukuran:** S

#### SP-052 Rantai dummy semua layar
- **Berkas:** `src/sippa.js` (`RANTAI_DUMMY` untuk semua layar persis DT §8.5: kit `SIPPA-901` s.d. `SIPPA-907` satu per status, periode dari layar, A/B tiga vonis, satu log `jam_klien_meleset`, alarm aktif dan tertutup), `tests/warga/sippa.test.mjs`.
- **Antarmuka:** Konsumsi: semua tabel 0056–0058. Hasil: `RANTAI_DUMMY[layar]` untuk 13 kunci (11 `LAYAR_SIPPA` R1–R3 + `ringkas` + `lapangan`); tiga kunci R4 (`pelihara`, `air`, `akses`) ditambah SP-096.
- **Tujuan:** tiap layar terisi tanpa nol palsu; vonis A/B tiga nilai muncul; hapus tidak menyentuh baris nyata.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `penulis-gerbang`.
- **Model:** sonnet. Baca `~/.claude/DUMMY.md` dulu.
- **Dependensi:** SP-029, SP-035, SP-050. **Paralel dengan:** SP-053, SP-054, SP-055, SP-076. **Isolasi:** worktree ya.
- **Selesai bila:** untuk tiap layar, `dummy/isi` lalu endpoint penyuapnya: tiap kolom angka bukan nol; isi kedua untuk periode sama 409; pengisi hilir tanpa hulu melapor 0 baris; `dummy/hapus` lalu nol baris dummy (termasuk objek R2 dummy) dan baris nyata utuh (RU §7.5).
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.14, §10.2 W-12; RU §7.5; DT §8.5. **Ukuran:** M

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
- **Rujukan:** PRD §9.12.2 baris alur lintas-tabel, §10.2 W-13; RU §2.5. **Ukuran:** M

#### SP-055 Gerbang SIPPA lengkap, aksesibilitas, tema gelap, ponsel
- **Berkas:** `tests/sippa/gerbang-sippa.test.mjs` (RU §2.6 empat butir INP per handler, §2.8 butir 7, 9, 10: `innerHTML` hanya dengan `esc(`, tanpa "100%" probabilitas, tanpa nama perusahaan; lapisan zona `layar_peta.js` memasang huruf dan pola (DT §8.2); tanpa warna tertanam di `public/pipa/*.css` dan string gaya), `tests/sippa/kontras.test.mjs` (RU §2.7), perbaikan kecil di `public/pipa/**` yang ditemukan sapuan.
- **Tujuan:** WCAG 2.2 AA (PRD §9.13), tema gelap di semua layar, tampilan ponsel, INP.
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `penulis-gerbang`. Baca `~/.claude/INP.md` dulu.
- **Model:** sonnet.
- **Dependensi:** semua tiket layar (SP-010 s.d. SP-012, SP-031 s.d. SP-033, SP-036, SP-037, SP-042, SP-043, SP-049, SP-051). **Paralel dengan:** SP-052, SP-053, SP-054, SP-076. **Isolasi:** worktree ya.
- **Selesai bila:** semua butir gerbang hijau dan merah bila disisipi pelanggaran contoh; RU §2.7 hijau (papan ketik menjangkau semua kontrol; kontras terang dan gelap lolos; target sentuh ≥ 44 px, lapangan ≥ 56 px); angka INP terukur RU §2.6 di laporan.
- **Bukti:** `npm run uji:sippa`; laporan `inp-reviewer`.
- **Rujukan:** PRD §9.12.2 baris gerbang, §9.13, §1.3 U10; DS §2.1.5, §3.0, §7.3; RU §2.6, §2.7. **Ukuran:** M

#### SP-056 Tinjauan penuh rilis lengkap
- **Pengerja / pemeriksa:** `guard-api`, `migrasi-idempoten`, `selera-angka`, `higiene-repo` (haiku); `security-reviewer`, `inp-reviewer`, `validasi-model` (sonnet).
- **Berkas:** tidak ada. **Tujuan:** sapuan seluruh `/pipa`, `src/sippa*.js`, migrasi 0056–0058, `scripts/data/sippa/**`. **Model:** haiku/sonnet.
- **Dependensi:** SP-048 s.d. SP-055. **Paralel dengan:** satu sama lain. **Isolasi:** tidak.
- **Selesai bila:** nol temuan kritis; daftar periksa serah PRD §12.3 bagian web tercentang.
- **Bukti:** laporan; `npm run uji`; `npm run uji:sippa`.
- **Rujukan:** PRD §10.2 W-14, §12.3. **Ukuran:** M

#### SP-057 [induk] Commit dan deploy R3 (rilis lengkap)
- **Tujuan:** semua layar PRD §9.1.1 di produksi paling lambat 6 Des (U5).
- **Berkas:** berkas SP-048 s.d. SP-055; `tests/warga/migrasi_beku.json` (0058).
- **Pengerja / pemeriksa:** sesi induk / `higiene-repo`. **Model:** opus.
- **Dependensi:** SP-056. **Paralel dengan:** SP-077, SP-078. **Isolasi:** tidak.
- **Selesai bila:** jalur PRD §10.6 (staging lalu `main`); uji asap RU §8.3 dan tiap rute halaman `LAYAR_SIPPA` 200 dengan sesi; satu pesan telemetri uji diterima dan ditandai di luar rentang lalu dihapus.
- **Bukti:** log deploy.
- **Rujukan:** PRD §10.2 W-15, §10.6. **Ukuran:** S

### 3.G Buku kajian dan deck (28 Okt–6 Des)

Semua berkas di `data/kajian-bnpb/**` dimiliki `pipa-data`, kecuali `data/kajian-bnpb/naskah/**` yang dimiliki `penulis-kajian` (SP-085; glob paling spesifik menang). Naskah ditulis `penulis-kajian` lewat workflow `naskah-kajian.js`/`rakit-kajian.js` cabang `sippa` (SP-005); penyunting dan pemeriksa selalu agent baru, bukan penulisnya (AGENTS.md §3.2). Isi per bab mengikuti KB §4 (22 bab, peta bahan rehab KB §4.0) dan KB §5 (Lampiran A–S); PRD §8 hanya ringkasan. Nama berkas mengikuti pembangun repo (`bangun/docx/bangun.py:430` mengurutkan satu front matter per berkas): `data/kajian-bnpb/naskah/sippa/00-depan-kata-pengantar.md`, `00-depan-ringkasan-eksekutif.md`, `bab-01.md` s.d. `bab-22.md`, `90-lampiran-a.md` s.d. `90-lampiran-q.md` (R dan S dibangkitkan), `deck.json`, `bukti/bab-NN.md` (+ `.angka.json`, `.pustaka.json`). Aturan bab: front matter `kajian: sippa`, `bab`, `pertanyaan`; pembuka `::: ringkasan-bab`; semua angka lewat `{{angka:sippa.*}}` atau kunci `rehab.*` dan `perka_2008.*` yang sudah ada; pustaka APA 7; tanpa bab kritik; tanpa "terbukti" untuk SIPPA; zona biru dan emas berhuruf dan berpola (keputusan 52).

Perintah bersama (dari `data/kajian-bnpb/`): kontrak `python3 bangun/kontrak/naskah.py <berkas>`; slop `.venv/bin/python qa/slop.py --ambang --laporan keluaran/qa/slop-sippa.md <berkas>`; QA `.venv/bin/python qa/periksa.py --kajian sippa --berkas-saja --semua`.

#### SP-058 Berkas bukti bab 1–5
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bukti/bab-01.md` s.d. `bab-03.md`, `bab-05.md`, `bab-06.md` (+ `.angka.json`, `.pustaka.json`); Bab 1 memakai ulang bukti rehab `bab-01`, `bab-02` (KB §4.0).
- **Tujuan:** tiap bab punya Inti, Temuan bersumber, Inferensi, Celah (L56, L57) dari KD, baca-A/B/C, data `kajian/pipa/data/`, dan JSON SP-020/SP-021/SP-022; nilai acuan KB §4 BAB 1–3, 5–6 dicocokkan (nomor bab versi 2).
- **Di luar:** naskah bab.
- **Pengerja / pemeriksa:** `penulis-kajian` / `validasi-model` (klaim angka cocok dengan data, tiga versi zona), penyunting `general-purpose` baru (QA lapis a).
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-005, SP-021, SP-022, SP-085. **Paralel dengan:** SP-029, SP-030, SP-034, SP-062. **Isolasi:** worktree ya.
- **Selesai bila:** tiap temuan menyebut berkas sumber dan baris/kunci; celah ditulis, bukan ditutup dengan tebakan; kunci angka memakai nama KB §4.
- **Bukti:** `cd data/kajian-bnpb && python3 bangun/kontrak/naskah.py naskah/sippa/bukti/bab-0[12356].md` (bila kontrak memeriksa bukti; bila tidak, QA lapis a tertulis di laporan).
- **Rujukan:** PRD §8.2, §10.3 B-02; KB §4 BAB 1–5, §9.2 S5. **Ukuran:** M

#### SP-059 Berkas bukti bab 6–11
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bukti/bab-07.md` s.d. `bab-11.md` (Bab 7.7 memakai ulang bukti rehab `bab-02`, `bab-10`).
- **Tujuan:** sama dengan SP-058 untuk desain, hidraulika (debit kerja 300 L/min, kasus ajar 600 L/min, angka acuan DT §5.8), komponen dan gambar, operasi dan SOP, kelembagaan dan RACI, pemakaian ganda banjir dan irigasi.
- **Pengerja / pemeriksa:** `penulis-kajian` / `validasi-model`, penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-005, SP-019 (angka hidraulika), SP-085. **Paralel dengan:** SP-036, SP-037, SP-040, SP-060. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-058; RACI satu A per baris; syarat keras anti de-watering tertulis untuk banjir dan irigasi.
- **Bukti:** seperti SP-058 untuk `bab-0[7-9].md bab-1[01].md`.
- **Rujukan:** PRD §3.3, §5.4–§5.8, §6; KB §4 BAB 6–11. **Ukuran:** M

#### SP-060 Berkas bukti bab 12–17
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bukti/bab-16.md` s.d. `bab-22.md` (tambahan rehab per KB §4.0: bukti rehab `bab-09`, `bab-10`, `bab-11`, `bab-12`).
- **Tujuan:** pilot dan program uji (vonis keputusan 53, agenda bukti air dan akses), kelembagaan (RACI, mandat air dan akses), anggaran, pembiayaan, NPV/BCR/Monte Carlo, risiko (R21–R26), sistem data dan pemantauan (web `/pipa` termasuk tiga layar keputusan 56), peta jalan, kesimpulan dan keputusan yang diminta (KD-1 sampai KD-12).
- **Pengerja / pemeriksa:** `penulis-kajian` / `validasi-model`, penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-005, SP-085. **Paralel dengan:** SP-036, SP-037, SP-040, SP-059. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-058; hasil pilot ditulis sebagai slot `menunggu` sampai SP-072; harga heli slot `menunggu` (T-A).
- **Bukti:** seperti SP-058 untuk `bab-1[6-9].md bab-2[0-2].md`.
- **Rujukan:** PRD §4, §9, §11; KB §4 BAB 12–17, §3.5. **Ukuran:** M

#### SP-061 Pustaka dicek ke naskah asli
- **Berkas:** `data/kajian-bnpb/pustaka.json`, `data/kajian-bnpb/kandidat-foto-commons.csv` (baris `kajian=sippa`, KB §7.1).
- **Tujuan:** sumber KB §8.1 M8 dicek ke naskah asli; sumber berita ditandai; benchmark luar negeri berlabel "belum diverifikasi" sampai dikutip dari aslinya (G18); foto Commons F1–F9 berlisensi CC BY, CC BY-SA, CC0, atau PD.
- **Pengerja / pemeriksa:** `penulis-kajian` (riset) / `general-purpose` baru (cek acak 10 rujukan ke asli).
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-085. **Paralel dengan:** SP-063, SP-066, SP-067. **Isolasi:** worktree ya.
- **Selesai bila:** ≥ 50 sumber, separuh resmi/primer, ≥ 8 per bab (`tema.json` `qa.pustaka.kajian_min.sippa`).
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python qa/periksa.py --kajian sippa --berkas-saja --semua` (bagian pustaka, T-11, D-19, D-15).
- **Rujukan:** PRD §8.3, §10.3 B-04; KB §7.1, §8.1 M8, M9. **Ukuran:** M

#### SP-062 Paket data `data/sippa/`, tabel harga, dan `sippa_keuangan.py`
- **Berkas:** `data/kajian-bnpb/bangun/pipa_data.py` (langkah baru `paket`, KB §8.2 M11), paket `data/kajian-bnpb/data/sippa/` (KB §8.2 M10, termasuk `README.md`, `harga.csv`, `parameter.csv`, `zona_versi.csv`, `kelayakan_kompleks.csv`), `data/kajian-bnpb/bangun/sippa_keuangan.py` (KB §8.2 M13).
- **Antarmuka:** Hasil: `data/kajian-bnpb/data/sippa/harga.csv` (kolom `kode, uraian, satuan, harga_rp, sumber, tanggal, keyakinan, rentang_rendah, rentang_tinggi, per` dengan `per` ∈ kit/lokasi/depot/program), `keuangan*.csv/json`, kunci `sippa.rab.*`, `sippa.npv.*` yang dibaca `sippa_angka.py`. Dipakai SP-041 (preset S0, S0B), SP-063, SP-070.
- **Tujuan:** paket data beku per batas data (salinan `pipa/data/*.csv` dan keluaran `data/sippa/keluaran/*.json`); RAB dihitung ulang (keputusan 13) bertingkat T0/T0B, T1, T2, T3, T4; OPEX kering/basah; TCO nominal dan terdiskonto 8%; NPV/BCR tiga skenario manfaat (0, regu terhindar, heli-hari terhindar `menunggu`) dan varian + banjir, + banjir + irigasi; Monte Carlo 800 sampel berbenih; kepekaan 22.700 ha/kit ±50%; biaya pemeliharaan per kelas PRD §6.10.7 masuk OPEX (KB §8.2 M22) dan `data/sippa/pelihara.csv`, `pelihara_biaya.csv` dibangkitkan dari `public/pipa/pelihara.js` (SP-092).
- **Di luar:** angka heli kontrak (T-A); nilai manfaat resmi (T-F); RAB, NPV, BCR untuk air tanah dan akses (T-N: biaya satuan saja).
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-021, SP-022; SP-092 untuk bagian pemeliharaan (boleh menyusul dalam tiket yang sama). **Paralel dengan:** SP-029, SP-030, SP-034, SP-058. **Isolasi:** worktree ya.
- **Selesai bila:** self-check `pipa_data.py paket` mereproduksi A188/B418/C89/D170 dan jumlah 865; `sippa_keuangan.py uji` mereproduksi urutan besaran contoh T2 PRD §11.1 (Rp13,7–18,9 M dipinjam; Rp16,2–21,4 M dibeli) sebagai rentang, menolak item di dua satuan alokasi dan kontingensi ganda; manfaat bawaan 0; manfaat irigasi 0 bila syarat keras tidak dicentang; tidak memakai Rp364 M; laju pemeliharaan tertimbang kit gambut dalam 5–8% (gagal bila di luar).
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/pipa_data.py paket && .venv/bin/python bangun/sippa_keuangan.py uji && .venv/bin/python bangun/sippa_keuangan.py`.
- **Rujukan:** PRD §11.1, §9.3; KB §8.2 M10, M11, M13; DT §5.6. **Ukuran:** M

#### SP-063 Registri angka `sippa_angka.py`
- **Berkas:** `data/kajian-bnpb/bangun/sippa_angka.py` (KB §8.2 M12), `data/kajian-bnpb/data/angka.json` (kunci `sippa.*` saja).
- **Antarmuka:** Konsumsi: paket `data/kajian-bnpb/data/sippa/` (SP-062), keluaran SP-019, ekspor D1 pilot (diperbarui di SP-072). Hasil: kunci `sippa.*` KB §4 dan §11 (tiga versi zona, jarak, DEM, GSW, MCD64A1, CHIRPS, VIIRS, sel22, kit, hid, rab, npv, pilot, rek, dan dari KB §8.2 M21: `sippa.pelihara.*`, `sippa.irisan.*`, `sippa.air.*`, `sippa.cat.n`, `sippa.rek.*` untuk 38 rekomendasi) masing-masing berlabel keyakinan dan sumber, `berkas` relatif ke `data/`; kunci `rehab.*` tidak disalin.
- **Tujuan:** tiap angka buku dan deck punya satu kunci (U2).
- **Di luar:** kunci kajian lain di `angka.json`.
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`, `selera-angka`.
- **Model:** sonnet.
- **Dependensi:** SP-019, SP-021, SP-022, SP-023, SP-024, SP-062. **Paralel dengan:** SP-061, SP-066, SP-067. **Isolasi:** worktree ya.
- **Selesai bila:** self-check: tiap kunci berlabel dan bersumber; `sippa.zona.kalteng.konservatif.a.n` dihitung ulang dari `zona.json` (RU §4.3); slot kosong berlabel `menunggu` dengan alasan; kunci kajian lain tidak berubah (dibandingkan sebelum dan sesudah).
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/sippa_angka.py uji && .venv/bin/python bangun/sippa_angka.py`.
- **Rujukan:** PRD §7.2, §8.3, §10.3 B-03; KB §4 (angka wajib tiap bab), §8.2 M12, M14, §11. **Ukuran:** M

#### SP-064 Gambar peta dan grafik buku
- **Berkas:** `data/kajian-bnpb/bangun/visual/data_sippa.py`, spek `data/kajian-bnpb/bangun/visual/spek-sippa/sippa-01.json` s.d. `sippa-30.json` dan `sippa-p-<kode>.json` (KB §7.2; `sippa-19` s.d. `sippa-30` disalin dari `spek-rehab` oleh `bangun/visual/spek_sippa.py`, KB §8.3 M20), perubahan `bangun/visual/peta.mjs` dan `grafik.mjs` (KB §8.3 M16–M18), keluaran `data/kajian-bnpb/gambar/sippa/*.png`.
- **Tujuan:** peta zona Kalteng dua panel (versi `kendala.json`, semua jalan OSM), peta sel 2,2 km, peta Indonesia kit per provinsi, 18 peta provinsi; grafik VIIRS, CHIRPS, MCD64A1, jarak, beda elevasi, head loss, waktu gelar, CAPEX bertingkat, kipas Monte Carlo, tornado, matriks risiko, matriks respons.
- **Pengerja / pemeriksa:** `pipa-data` / `selera-angka`, `general-purpose` baru (D-8, D-21, D-24, D-28 lewat `periksa.py --visual`).
- **Model:** sonnet.
- **Dependensi:** SP-063. **Paralel dengan:** SP-027, SP-041, SP-043, SP-048. **Isolasi:** worktree ya.
- **Selesai bila:** PNG 300 dpi; tiap gambar punya Sumber, legenda, dan label keyakinan; zona biru dan emas dengan huruf A–D dan pola (keputusan 52, DS §2.1.3); validator palet `dataviz` terang dan gelap tercatat; render dilihat (lembar bukti).
- **Bukti:** `cd data/kajian-bnpb && node bangun/visual/render.mjs --lembar <spek>` lalu `.venv/bin/python qa/periksa.py --visual bangun/visual/keluaran --kajian sippa --berkas-saja`.
- **Rujukan:** PRD §8.2, §10.3 B-05; KB §7.2, §8.3; DS §5.1–§5.3. **Ukuran:** M

#### SP-065 Gambar teknik SIPPA-G-01 s.d. G-06
- **Berkas:** `data/kajian-bnpb/bangun/visual/teknik/blok_judul.mjs` (blok judul dan blok pengesahan kosong bersama), `kit_ga.mjs` (G-01), `pid.mjs` (G-02), `lance.mjs` (G-03), `manifold.mjs` (G-04), `depot.mjs` (G-05), `gudang.mjs` (G-06), `uji.mjs`; keluaran `data/kajian-bnpb/gambar/sippa/teknik/SIPPA-G-0[1-6].png` dan `.pdf` (A3).
- **Tujuan:** GA kit relay, P&ID, detail lance 1,5 m dan teleskopik 3–5 m, manifold DN100 ke 4 x DN65, depot depan, gudang induk YonTP, tingkat konstruksi dengan catatan "Wajib verifikasi dan pengesahan insinyur berlisensi sebelum dibangun" (KB §7.3, DS §5.4).
- **Di luar:** mengisi blok pengesahan.
- **Pengerja / pemeriksa:** `pipa-data` / `general-purpose` baru (daftar periksa kriteria terima PRD §6.9 per gambar).
- **Model:** sonnet.
- **Dependensi:** SP-004, PRD §6.1, DT §6.3 (BOM dan tag P&ID). **Paralel dengan:** SP-019, SP-025. **Isolasi:** worktree ya.
- **Selesai bila:** kriteria terima PRD §6.9 tercentang untuk G-01 s.d. G-06; tag G-02 identik dengan daftar tag PRD §9.11; T-12 (SP-086) hijau untuk enam lembar ini.
- **Bukti:** `cd data/kajian-bnpb && node bangun/visual/teknik/uji.mjs` (blok judul lengkap, blok pengesahan kosong, satuan dimensi).
- **Rujukan:** PRD §6.1, §6.9, §10.3 B-06; KB §7.3, §8.3 M19; DS §5.4; RU §5.4. **Ukuran:** L

#### SP-066 Gambar teknik SIPPA-G-07 s.d. G-12 dan diagram buku
- **Berkas:** `data/kajian-bnpb/bangun/visual/teknik/rumah_pompa.mjs` (G-07), `profil.mjs` (G-08), `pid.mjs` (G-09, G-10), `zona.mjs` (G-11, membaca aturan `saranSarana` dari `public/pipa/hitung.js`), `petak.mjs` (G-12), diagram buku `lapis.mjs`, `siklus.mjs`, `penampang.mjs`, `alur.mjs`, `lembaga.mjs`, `gerbang.mjs`, `alur_data.mjs`; keluaran `data/kajian-bnpb/gambar/sippa/teknik/SIPPA-G-07..12.png` dan `.pdf`.
- **Tujuan:** G-07 dicabut (keputusan 60); profil trase, modul banjir GA dan P&ID, skema telemetri dan daya, diagram zona dan alur keputusan sarana (identik `saranSarana`), tata letak petak A/B dan grid probe; diagram bab KB §4.
- **Pengerja / pemeriksa:** `pipa-data` / `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-065, SP-030 (`saranSarana`). **Paralel dengan:** SP-061, SP-063, SP-067. **Isolasi:** worktree ya.
- **Selesai bila:** kriteria PRD §6.9 tercentang; G-08 memakai DEMNAS AOI bila sudah diterima, bila belum memakai data nyata Copernicus GLO-30 berlabel "terverifikasi; DSM berkanopi" (bukan sintetis; KB §7.3, O7) dan diganti saat DEMNAS tiba; T-12 hijau untuk enam lembar ini.
- **Bukti:** `cd data/kajian-bnpb && node bangun/visual/teknik/uji.mjs`.
- **Rujukan:** PRD §6.9, §5.4, §9.3 `saranSarana`; KB §7.3, §10 O7; DS §5.4. **Ukuran:** L

#### SP-067 Surat permintaan data (Lampiran I)
- **Berkas:** `data/kajian-bnpb/pipa/surat/big.md`, `bws-kalimantan-ii.md`, `walidata-khg-brgm.md`, `bmkg.md`, `bpbd-kalteng.md`, `manggala-agni.md`, `badan-geologi.md`, `atr-bpn-pemda.md`, `lkpp-oem.md`, `bnpb-internal.md`, ditambah `kementerian-pu.md`, `tni-ad.md`, `polri.md` (keputusan 55; permintaan data rehab Lampiran L menjadi surat karena keputusan 27 mencabut rehab Q15); `badan-geologi.md` dan `bnpb-internal.md` diperluas (CAT, zona, sumur 2019–2026; kolom DIBI, stok bailey); `data/kajian-bnpb/naskah/sippa/90-lampiran-i.md`.
- **Tujuan:** 13 draf kop BNPB, ID data D01–D36 pemilik dipertahankan, siap kirim minggu 47; Lampiran I memuat kesepuluhnya.
- **Di luar:** mengirim surat (pemilik).
- **Pengerja / pemeriksa:** `penulis-kajian` / penyunting `general-purpose` baru (slop dan bahasa).
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-085. **Paralel dengan:** SP-061, SP-063, SP-066. **Isolasi:** worktree ya.
- **Selesai bila:** satu surat per instansi PRD §7.5 dengan daftar data, format, dan tenggat; tanpa nama perusahaan.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python qa/slop.py --ambang --laporan keluaran/qa/slop-sippa-surat.md pipa/surat/*.md && python3 bangun/kontrak/naskah.py naskah/sippa/90-lampiran-i.md`.
- **Rujukan:** PRD §7.5, §4.1 minggu 47, §10.3 B-11; KB §5 Lampiran I. **Ukuran:** M

#### SP-068 Naskah bab 1–5
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-01.md` s.d. `bab-03.md`, `bab-05.md`, `bab-06.md`.
- **Tujuan:** Pendahuluan (dengan tambahan air dan akses, KB §4 BAB 1); Bara Gambut; Pola Api; Kelayakan Kit di Kalteng (tiga versi zona, aturan `<`); Kebutuhan Kit 18 Provinsi (81 kit "rencana bersyarat, bukan pengadaan", 18 profil bertemplat).
- **Pengerja / pemeriksa:** `penulis-kajian` / penyunting substansi `general-purpose` baru (SP-075 menjalankan per bab).
- **Model:** sonnet.
- **Dependensi:** SP-058, SP-061, SP-063, SP-064. **Paralel dengan:** SP-042, SP-044, SP-069, SP-070. **Isolasi:** worktree ya.
- **Selesai bila:** pertanyaan kunci KB §4 terjawab berurutan; komponen bernomor KB ada; dialek NASKAH-SPEK lolos; token angka saja; slop LULUS.
- **Bukti:** `cd data/kajian-bnpb && python3 bangun/kontrak/naskah.py naskah/sippa/bab-0[12356].md && .venv/bin/python qa/slop.py --ambang --laporan keluaran/qa/slop-sippa.md naskah/sippa/bab-0[12356].md`.
- **Rujukan:** PRD §8.2; KB §4 BAB 1–3, 5–6. **Ukuran:** L

#### SP-069 Naskah bab 6–9
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-07.md` s.d. `bab-10.md`.
- **Tujuan:** Desain SIPPA Terintegrasi (empat lapis, Bab 7.7 aset pascabencana, batas desain termasuk debit kerja 300 L/min); Hidraulika dan Titik Kerja (angka acuan DT §5.8, neraca debit Tabel 7.3); Spesifikasi Komponen dan Gambar Teknik (interval pemeliharaan pindah ke Bab 15); Operasi (pemicu, matriks respons, 6 SOP bernomor, K3, logistik YonTP, pelatihan 58 jam, G6).
- **Pengerja / pemeriksa:** `penulis-kajian` / penyunting `general-purpose` baru, `validasi-model` (bab 7).
- **Model:** sonnet.
- **Dependensi:** SP-058, SP-059, SP-063, SP-064, SP-065. **Paralel dengan:** SP-042, SP-044, SP-068, SP-070. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-068; tiap SOP punya tujuan, pelaku, prasyarat, langkah, titik berhenti, formulir, rujukan.
- **Bukti:** seperti SP-068 untuk `bab-0[7-9].md bab-10.md`.
- **Rujukan:** PRD §5.3–§5.8, §6; KB §4 BAB 7–10. **Ukuran:** L

#### SP-070 Naskah bab 10–13
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-11.md`, `bab-16.md`, `bab-17.md`, `bab-18.md`.
- **Tujuan:** Pemakaian Ganda Banjir dan Irigasi (BCR inti, + banjir, + banjir + irigasi); Pilot 2026 dan Program Uji 2027–2028 (dua vonis, keputusan 53, hasil pilot sebagai slot sampai SP-072, agenda bukti air dan akses 16.8); Kelembagaan dan Tata Kelola Aset (RACI, BMN pinjam pakai, opsi konsesi, mandat air dan akses 17.6–17.10); Anggaran, Pembiayaan, NPV, BCR, Monte Carlo (pembiayaan per lapis 18.9, biaya satuan air dan akses tanpa total 18.10, biaya pemeliharaan 18.11).
- **Pengerja / pemeriksa:** `penulis-kajian` / penyunting `general-purpose` baru, `validasi-model` (bab 12 dan 13).
- **Model:** sonnet.
- **Dependensi:** SP-059, SP-060, SP-062, SP-063, SP-087. **Paralel dengan:** SP-042, SP-044, SP-068, SP-069. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-068; tanpa bab dasar hukum TNI; heli `menunggu` dengan pembanding resmi > Rp200 juta per sorti.
- **Bukti:** seperti SP-068 untuk `bab-1[1678].md`.
- **Rujukan:** PRD §3.3, §3.4, §5.6, §5.7, §11.1; KB §4 BAB 11, 16, 17, 18. **Ukuran:** L

#### SP-071 Naskah bab 14–17
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-19.md` s.d. `bab-22.md`.
- **Tujuan:** Risiko dan Mitigasi (register L x I dengan R21–R26); Sistem Data dan Pemantauan (web `/pipa` termasuk Pemeliharaan, Air tanah, Akses; telemetri; data pemulihan yang belum ada); Peta Jalan 2026–2030 dengan rekomendasi `::: rek` SR-01 s.d. SR-38 (KB §6); Kesimpulan dan Keputusan yang Diminta (KD-1 sampai KD-12, tanpa ulangan).
- **Pengerja / pemeriksa:** `penulis-kajian` / penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-060, SP-063. **Paralel dengan:** SP-045, SP-050, SP-072, SP-073. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-068; tiap SR tampil sekali di bab asal sebagai rujukan dan lengkap hanya di Bab 16 dan 17.
- **Bukti:** seperti SP-068 untuk `bab-19.md bab-2[0-2].md`.
- **Rujukan:** PRD §4, §11.2; KB §4 BAB 19–22, §3.5, §6. **Ukuran:** M

#### SP-072 Bab 16.3 dan 11.4: hasil pilot dan operasi banjir dari D1
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-16.md` (bagian 16.3), `bab-11.md` (bagian 11.4), `data/kajian-bnpb/bangun/sippa_pilot.py` (KB §8.2 M15), `data/kajian-bnpb/data/sippa/pilot_2026.csv` (ekspor `GET /api/sippa/log.csv` dan `GET /api/sippa/probe.csv` oleh sesi induk, koordinat dibulatkan 0,01°), `data/kajian-bnpb/bangun/sippa_angka.py` (kunci `sippa.pilot.*`).
- **Tujuan:** Tabel 12.3 hasil pilot Okt; vonis keputusan 53 tujuh butir dari fungsi yang sama dengan web; vonis "lebih baik" tidak diputus; pil "pilot, n kecil".
- **Pengerja / pemeriksa:** `penulis-kajian` (naskah) dan `pipa-data` (kunci angka) berurutan dalam satu worktree / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-018, SP-037, SP-070. **Paralel dengan:** SP-045, SP-050, SP-071, SP-073. **Isolasi:** worktree ya.
- **Selesai bila:** angka pilot lewat `angka.json`; vonis sama dengan keluaran `pilot_cek.py`; tidak ada vonis G4 dari pilot.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/sippa_pilot.py uji && .venv/bin/python bangun/sippa_angka.py && python3 bangun/kontrak/naskah.py naskah/sippa/bab-11.md naskah/sippa/bab-16.md`.
- **Rujukan:** PRD §1.3 U3–U4, §10.3 B-10; KB §4 BAB 11, BAB 12, §8.2 M15; RU §6.3. **Ukuran:** S

#### SP-073 Lampiran tertulis A–H, J, K, L
- **Berkas:** `data/kajian-bnpb/naskah/sippa/90-lampiran-a.md`, `-b.md`, `-c.md`, `-d.md`, `-e.md`, `-f.md`, `-g.md`, `-h.md`, `-j.md`, `-k.md`, `-l.md`.
- **Tujuan:** isi persis KB §5: A Metode, Data, dan Rekonsiliasi (termasuk rekonsiliasi tiga versi zona dan aturan `<`); B Kelayakan per Kompleks (`csv:`); C Dasbor 18 Provinsi; D Daftar Bahan sampai Baut dan Kriteria Terima; E RAB Rinci; F pengantar dan daftar gambar teknik (lembar disisipkan); G SOP-01 s.d. SOP-06 dan formulir (G3-lite, probe, BBM, gerak kit, survei trase); H Protokol Pilot dan Uji A/B (versi buku; KAK di SP-082); J Rumus dan Uji Invarian Hidraulika (nilai acuan DT §5.8); K Rujukan Praktik Luar Negeri; L Batas Pemakaian Alat `/pipa` disalin dari `public/pipa/batas.js` `BATAS_ALAT`. Lampiran I dari SP-067; M dan N dibangkitkan pembangun.
- **Pengerja / pemeriksa:** `penulis-kajian` / penyunting `general-purpose` baru, `validasi-model` (H dan J).
- **Model:** sonnet.
- **Dependensi:** SP-009, SP-021, SP-030, SP-062, SP-065, SP-066, SP-067, SP-069. **Paralel dengan:** SP-045, SP-050, SP-071, SP-072. **Isolasi:** worktree ya.
- **Selesai bila:** sebelas berkas ada; teks L identik dengan `BATAS_ALAT` (RU §2.3 A1, diperiksa hash teks); tiap lampiran data memuat pernyataan produsen.
- **Bukti:** `cd data/kajian-bnpb && python3 bangun/kontrak/naskah.py naskah/sippa/90-lampiran-*.md`.
- **Rujukan:** PRD §8.2; KB §5; RU §2.3 A1. **Ukuran:** L

#### SP-074 Bagian depan dan Ringkasan Eksekutif
- **Berkas:** `data/kajian-bnpb/naskah/sippa/00-depan-kata-pengantar.md`, `00-depan-ringkasan-eksekutif.md`.
- **Tujuan:** Kata Pengantar Kepala BNPB (draf berpenanda periksa pemilik bila T-G belum dijawab, KB §3.3); Ringkasan Eksekutif dua lapis (Pesan Kunci dengan tesis terintegrasi dan delapan temuan KB §3.4, pita KD-1, KD-2, KD-3, KD-8, lalu lapis rincian); sampul, kolofon, daftar, singkatan dibangkitkan pembangun.
- **Pengerja / pemeriksa:** `penulis-kajian` / penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-068 s.d. SP-073, SP-088, SP-089. **Paralel dengan:** SP-049, SP-051, SP-075. **Isolasi:** worktree ya.
- **Selesai bila:** tidak ada angka atau klaim yang tidak ada di bab; temuan hidraulika di lapis rincian memakai angka acuan (19,06 m per km, 320 L/min, 300 L/min); slop LULUS.
- **Bukti:** `cd data/kajian-bnpb && python3 bangun/kontrak/naskah.py naskah/sippa/00-depan-*.md && .venv/bin/python qa/slop.py --ambang --laporan keluaran/qa/slop-sippa.md naskah/sippa/00-depan-*.md`.
- **Rujukan:** PRD §2.2 T-G, §8.1; KB §3. **Ukuran:** M

#### SP-075 Sunting substansi
- **Berkas:** `data/kajian-bnpb/naskah/sippa/*.md`, `data/kajian-bnpb/bangun/sippa_angka.py` (hanya menambah kunci untuk angka yang ditemukan tanpa token), `data/kajian-bnpb/keluaran/qa/substansi-sippa-bab-NN.md`.
- **Tujuan:** tiap angka ke `angka.json`, tiap klaim ke sumber, paragraf kosong dipotong (QA lapis b, KB §9.3).
- **Pengerja / pemeriksa:** penyunting `general-purpose` baru per kelompok bab (bukan penulisnya) / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-068 s.d. SP-074 (boleh per bab segera setelah bab itu selesai). **Paralel dengan:** antar kelompok bab; SP-049, SP-051, SP-074. **Isolasi:** worktree ya.
- **Selesai bila:** nol angka ketikan (D-22).
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python qa/periksa.py --kajian sippa --berkas-saja --semua` (gerbang D-22).
- **Rujukan:** PRD §8.3, §10.3 B-08; KB §9.3. **Ukuran:** M

#### SP-076 Sunting bahasa dan anti-slop
- **Berkas:** `data/kajian-bnpb/naskah/sippa/*.md`, `data/kajian-bnpb/keluaran/qa/slop-sippa.md`.
- **Tujuan:** PUEBI, glosarium, ANTI-SLOP sampai semua bab LULUS, ditambah enam cek pendamping `anti-ai-checker` (QA lapis c, KB §9.3).
- **Pengerja / pemeriksa:** penyunting bahasa `general-purpose` baru (sonnet untuk tulis ulang, haiku untuk pindai) / `general-purpose` baru.
- **Model:** sonnet / haiku.
- **Dependensi:** SP-075. **Paralel dengan:** SP-052 s.d. SP-055. **Isolasi:** worktree ya.
- **Selesai bila:** laporan `slop-sippa.md` LULUS semua berkas.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python qa/slop.py --ambang --laporan keluaran/qa/slop-sippa.md naskah/sippa/*.md`.
- **Rujukan:** PRD §8.4, §10.3 B-09; KB §9.3. **Ukuran:** M

#### SP-077 Bangun DOCX dan PDF
- **Berkas:** `data/kajian-bnpb/keluaran/sippa.docx`, `sippa.pdf`, `sippa.manifest.json`; perbaikan mesin di `data/kajian-bnpb/bangun/docx/bangun.py` hanya bila gerbang gagal karena mesin (termasuk penyisipan A3 Lampiran F, KB §10 O6).
- **Tujuan:** buku A4 tegak Roboto, logo BNPB saja, foto Commons beratribusi, tanpa batas halaman.
- **Pengerja / pemeriksa:** `pipa-data` / `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-064, SP-065, SP-066, SP-073, SP-074, SP-076, SP-086, SP-089. **Paralel dengan:** SP-057, SP-078. **Isolasi:** worktree ya.
- **Selesai bila:** `periksa.py --ketat` nol gagal (D-1 s.d. D-40, T-1 s.d. T-12); halaman PDF = halaman DOCX.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/docx/bangun.py sippa && .venv/bin/python qa/periksa.py --docx keluaran/sippa.docx --pdf keluaran/sippa.pdf --visual bangun/visual/keluaran --kajian sippa --ketat`.
- **Rujukan:** PRD §8.4, §10.3 B-12; KB §9.2 S11, §9.3; RU §5.1. **Ukuran:** M

#### SP-078 Spek deck dan bangun PPTX dan PDF
- **Berkas:** `data/kajian-bnpb/naskah/sippa/deck.json` (spek, `penulis-kajian`), `data/kajian-bnpb/keluaran/sippa-deck.pptx`, `sippa-deck.pdf`, `sippa-deck.manifest.json` (`pipa-data`).
- **Tujuan:** 18 slide isi persis KB §11 (slide 1 Pesan Kunci deskriptif; slide 2–18 judul temuan berangka; T-M), sampul, penutup, L1–L7; S1–S39; angka deck = angka DOCX (token sama); pil CUT OFF `23 Okt 2026, 23.59 WIB`; zona biru dan emas berhuruf dan berpola; tata letak DS §5.5.
- **Pengerja / pemeriksa:** `penulis-kajian` (spek) lalu `pipa-data` (bangun) / `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-063, SP-064, SP-071, SP-076, SP-086, SP-088. **Paralel dengan:** SP-057, SP-077. **Isolasi:** worktree ya.
- **Selesai bila:** `jenis_slide` berurutan tidak berulang (S35); jumlah slide isi 18; stem berbeda dari DOCX; QA nol gagal.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/pptx/deck.py naskah/sippa/deck.json keluaran/sippa-deck.pptx --pdf && (cd bangun/pptx && ../../.venv/bin/python periksa.py --serah ../../keluaran/sippa-deck.pptx) && .venv/bin/python qa/periksa.py --pptx keluaran/sippa-deck.pptx --pptx-pdf keluaran/sippa-deck.pdf --kajian sippa --ketat`.
- **Rujukan:** PRD §8.5, §10.3 B-13; KB §11; DS §5.5; RU §5.2. **Ukuran:** M

#### SP-079 QA lima lapis dan proofread render
- **Berkas:** `data/kajian-bnpb/keluaran/qa/sippa.md`, `sippa-deck.md` (laporan); perbaikan dikembalikan ke tiket asal.
- **Tujuan:** lima lapis KB §9.3 (penulis, substansi, bahasa, proofread render halaman utuh dibagi tiga pembaca, gerbang mekanis).
- **Pengerja / pemeriksa:** tiga proofreader `general-purpose` baru + pemindai haiku; pembetul `pipa-data`/`penulis-kajian`.
- **Model:** sonnet (proofread), haiku (pindai).
- **Dependensi:** SP-077, SP-078. **Paralel dengan:** antar pembaca. **Isolasi:** tidak (baca saja).
- **Selesai bila:** U1 dan U2 terpenuhi; RU §5.3 tiap baris lulus; daftar periksa serah PRD §12.3 bagian buku tercentang.
- **Bukti:** `keluaran/qa/sippa.md`, `keluaran/qa/sippa-deck.md`; ulang perintah bukti SP-077 dan SP-078.
- **Rujukan:** PRD §1.3 U1–U2, §10.3 B-14, §12.3; KB §9.3; RU §5. **Ukuran:** M

#### SP-080 [induk] Commit dan serah buku dan deck
- **Tujuan:** versi serah di `data/kajian-bnpb/keluaran/` minggu 49 (paling lambat 6 Des), dengan salinan bernama "Kajian SIPPA {DDMMYY}" (KB §1).
- **Berkas:** semua berkas SP-058 s.d. SP-079, SP-086 s.d. SP-089; paket `data/kajian-bnpb/data/sippa/`.
- **Pengerja / pemeriksa:** sesi induk / `higiene-repo` (ukuran berkas, tanpa `* 2.*`).
- **Model:** opus. **Dependensi:** SP-079. **Paralel dengan:** tidak. **Isolasi:** tidak.
- **Selesai bila:** commit per tiket buku dengan path spesifik; manifest ada; pemilik menerima berkas.
- **Bukti:** `git log --oneline`; manifest.
- **Rujukan:** PRD §10.3 B-15, §10.7. **Ukuran:** S

#### SP-086 Gerbang buku SIPPA: T-12 dan D-33 s.d. D-40
- **Berkas:** `data/kajian-bnpb/qa/periksa.py` (T-12 RU §5.4; D-33 merek dan perusahaan, D-34 kedalaman > 5 m, D-35 keterangan gambar teknik, D-36 slot `menunggu`, D-37 "rencana bersyarat", D-38 "terbukti" tanpa kutipan, D-39 nama program jembatan tanpa pemilik, D-40 kunci `rehab.sekunder.*`/`rehab.rekon.*` di luar Lampiran A, KB §9.4), `data/kajian-bnpb/qa/uji.py` (fixture negatif dan positif tiap gerbang), `data/kajian-bnpb/qa/cakupan.json` (`diuji`), `data/kajian-bnpb/bangun/pptx/periksa.py` (jumlah slide isi 17–19, slide 2–18 `judul_bentuk: temuan`, RU §5.3).
- **Tujuan:** tiap bab dan deck diperiksa mesin untuk larangan keputusan 50, blok pengesahan gambar teknik, dan bentuk deck, tanpa melonggarkan gerbang kajian lain.
- **Pengerja / pemeriksa:** `penulis-gerbang` / `pipa-data` (pemilik berkas, membaca diff), `higiene-repo`.
- **Model:** sonnet.
- **Dependensi:** SP-004. **Paralel dengan:** SP-029, SP-030, SP-034, SP-058, SP-062. **Isolasi:** worktree ya.
- **Selesai bila:** tiap gerbang merah pada fixture negatif dan hijau pada fixture positif; uji QA kajian `air`, `mitigasi`, dan `rehab` tetap hijau; siklus merah-hijau RU §7.4 tercatat.
- **Bukti:** `cd data/kajian-bnpb && python3 qa/uji.py`.
- **Rujukan:** KB §9.4; RU §5.3, §5.4, §7.4. **Ukuran:** M

#### SP-087 Berkas bukti bab 4, 12–15 dari bahan rehab dan PRD §6.10
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bukti/bab-04.md`, `bab-12.md`, `bab-13.md`, `bab-14.md`, `bab-15.md` (+ `.angka.json`, `.pustaka.json`).
- **Tujuan:** bukti lima bab baru (keputusan 55) dengan memakai ulang `naskah/rehab/bukti/bab-03`, `-04`, `-05`, `-06`, `-07`, `-08`, `-09`, `-10`, `-11` lewat rujukan baris (KB §4.0), bukan riset ulang; Bab 15 dari PRD §6.10 dan rehab 9.4, 11.5; temuan baru hanya kaitan ke kit (irisan provinsi kit-banjir, peran kit di lapis darurat air, bailey di gudang YonTP) dan model pemeliharaan.
- **Di luar:** naskah bab; mengubah naskah atau bukti rehab.
- **Pengerja / pemeriksa:** `penulis-kajian` / `validasi-model` (angka jembatan, CAT, laju pemeliharaan), penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-004, SP-085. **Paralel dengan:** SP-059, SP-060, SP-036, SP-037. **Isolasi:** worktree ya.
- **Selesai bila:** tiap kunci `rehab.*` yang dirujuk ada di `data/angka.json` dengan nilai acuan KB §4; porsi banjir 89,2% (bukan 91%); tidak ada kunci `rehab.sekunder.*` di luar catatan untuk Lampiran A; tiap temuan baru bersumber.
- **Bukti:** `cd data/kajian-bnpb && python3 bangun/kontrak/naskah.py naskah/sippa/bukti/bab-04.md naskah/sippa/bukti/bab-1[2-5].md` (bila kontrak memeriksa bukti; bila tidak, QA lapis a tertulis di laporan).
- **Rujukan:** PRD §6.10, §8.2; KB §4.0, §4 BAB 4, 12–15. **Ukuran:** M

#### SP-088 Naskah bab 4, 12–15
- **Berkas:** `data/kajian-bnpb/naskah/sippa/bab-04.md`, `bab-12.md`, `bab-13.md`, `bab-14.md`, `bab-15.md`.
- **Tujuan:** Beban Pascabencana; Air Pascabencana (kit untuk air baku, bukan air minum); Air Tanah dalam Batas Badan Geologi; Akses menurut Pemilik Program (D-39); Model Pemeliharaan Aset Terpadu. Prosa diadaptasi dari naskah final rehab (bukan disalin mentah): kotak SIPPA rehab diganti integrasi, kode program A/W/G/H/D menjadi PA/PW/PG/PH/PD, rekomendasi R-RR menjadi SR-21 s.d. SR-35.
- **Pengerja / pemeriksa:** `penulis-kajian` / penyunting substansi `general-purpose` baru, `validasi-model` (bab 13 dan 15).
- **Model:** sonnet.
- **Dependensi:** SP-087, SP-061, SP-063, SP-064. **Paralel dengan:** SP-068, SP-069, SP-070. **Isolasi:** worktree ya.
- **Selesai bila:** seperti SP-068; tiap program jembatan bersama pemiliknya; biaya satuan air dan akses tanpa total, NPV, atau BCR (T-N); kata "kajian rehab" tidak muncul.
- **Bukti:** `cd data/kajian-bnpb && python3 bangun/kontrak/naskah.py naskah/sippa/bab-04.md naskah/sippa/bab-1[2-5].md && .venv/bin/python qa/slop.py --ambang --laporan keluaran/qa/slop-sippa.md naskah/sippa/bab-04.md naskah/sippa/bab-1[2-5].md`.
- **Rujukan:** KB §4 BAB 4, 12–15, §2 butir 18–22. **Ukuran:** L

#### SP-089 Lampiran M–Q
- **Berkas:** `data/kajian-bnpb/naskah/sippa/90-lampiran-m.md`, `-n.md`, `-o.md`, `-p.md`, `-q.md`; perluasan `90-lampiran-a.md` (rekonsiliasi rehab) dan `90-lampiran-k.md` (katalog program) dikerjakan SP-073.
- **Tujuan:** isi persis KB §5: M dari rehab lampiran A–C; N dari F–G; O dari H; P dari E, K, J (irisan register dengan GD Mitigasi dan tabel padanan R-RR ke SR); Q jadwal pemeliharaan rinci dan kartu inspeksi dari `data/sippa/pelihara.csv`.
- **Pengerja / pemeriksa:** `penulis-kajian` / penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-087, SP-062 (bagian `pelihara.csv`). **Paralel dengan:** SP-071, SP-072, SP-073. **Isolasi:** worktree ya.
- **Selesai bila:** lima berkas lolos kontrak; Lampiran Q identik dengan konstanta `pelihara.js` (dibangkitkan dari CSV yang sama); pernyataan produsen di tiap lampiran data.
- **Bukti:** `cd data/kajian-bnpb && python3 bangun/kontrak/naskah.py naskah/sippa/90-lampiran-[m-q].md`.
- **Rujukan:** KB §5; PRD §6.10. **Ukuran:** M

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
- **Pengerja / pemeriksa:** `penulis-kajian` / `validasi-model`, penyunting `general-purpose` baru.
- **Model:** sonnet.
- **Dependensi:** SP-080, SP-036 (kolom CSV identik), SP-073 (Lampiran H versi buku). **Paralel dengan:** gelombang 17. **Isolasi:** worktree ya.
- **Selesai bila:** kolom data protokol identik dengan kolom CSV PRD §9.4.7; tanpa klaim efikasi.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python qa/slop.py --ambang --laporan pipa/protokol-ab.md`.
- **Rujukan:** PRD §4.1 minggu 51, §4.4, §9.4.7, §10.3 B-16. **Ukuran:** M

#### SP-083 Rekap 2026 dan errata angka
- **Berkas:** `data/kajian-bnpb/pipa/rekap-2026.md`; `data/kajian-bnpb/bangun/sippa_angka.py` dan `data/kajian-bnpb/data/angka.json` bila ada angka berubah; errata buku bila perlu.
- **Tujuan:** jam pompa, m3, kehilangan komponen, pelajaran 2026.
- **Pengerja / pemeriksa:** `penulis-kajian` + `pipa-data` (angka) / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** SP-081. **Paralel dengan:** SP-084 bagian akhir. **Isolasi:** worktree ya.
- **Selesai bila:** angka rekap dari D1, berlabel; errata menyebut halaman dan nilai lama/baru.
- **Bukti:** `cd data/kajian-bnpb && .venv/bin/python bangun/sippa_angka.py uji && .venv/bin/python bangun/sippa_angka.py`.
- **Rujukan:** PRD §4.1 minggu 53. **Ukuran:** S

#### SP-084 [induk] Penyelarasan dokumen saudara dan penutupan
- **Tujuan:** bagian awal (gelombang 0, **selesai 25 Okt 2026** lewat `PENYELARASAN.md`): rujukan "bagian X" diganti nomor bagian, tiket diselaraskan dengan DS, DT, KB, RU, tiket SP-085 dan SP-086 ditambah untuk area tanpa tiket. Bagian akhir (gelombang 18): semua status `selesai` atau `tertahan` beralasan; daftar `Ruling:` dari buku besar dilaporkan ke pemilik; buku besar `.superpowers/sdd/TIKET/` dihapus.
- **Berkas:** `data/kajian-bnpb/pipa/TIKET.md`.
- **Pengerja / pemeriksa:** sesi induk / pemilik.
- **Model:** opus.
- **Dependensi:** DS, DT, KB, RU (awal); semua tiket (akhir). **Paralel dengan:** SP-002. **Isolasi:** tidak.
- **Selesai bila:** §9 berkas ini tanpa baris "tanpa tiket"; semua status `selesai` atau `tertahan` beralasan.
- **Bukti:** `grep -nE "(DT|RU|DS|KB) bagian" data/kajian-bnpb/pipa/TIKET.md` kosong; matriks cakupan `PENYELARASAN.md` §2 tanpa celah.
- **Rujukan:** AGENTS.md §2.1. **Ukuran:** S

### 3.I Web rilis R4 (7–20 Des 2026): pemeliharaan, air tanah, akses (keputusan 56)

#### SP-090 Pipeline `cat.py`, `jembatan.py` dan unggah R2
- **Berkas:** `scripts/data/sippa/cat.py`, `scripts/data/sippa/jembatan.py` (stdlib, self-check `uji`), `data/sippa/keluaran/cat.json`, `jembatan_dibi.json`, `program_jembatan.json`; langkah unggah di `.github/workflows/data.yml` yang ada (bagian `mekanik-mesin`, tanpa jadwal baru).
- **Tujuan:** tiga berkas turunan DT §3.1.8–§3.1.10 dibaca lewat `GET /api/sippa/data/<nama>`.
- **Di luar:** menarik data baru dari Badan Geologi, TNI AD, Polri (menunggu surat SP-067); `cat.json` boleh berisi daftar provinsi dengan `zona_status: belum_ditetapkan` sampai data tiba.
- **Pengerja / pemeriksa:** `pipa-data` (+ `mekanik-mesin` untuk langkah) / `validasi-model`, `higiene-repo`.
- **Model:** sonnet; haiku untuk `higiene-repo`.
- **Dependensi:** SP-025. **Paralel dengan:** SP-091, SP-092, SP-028. **Isolasi:** worktree ya.
- **Selesai bila:** `jembatan.py uji` mereproduksi 3.833 (2018–2025) dan 1.088 (2025) dari `data/kajian-bnpb/data/dibi/rekap_*` dan sama dengan `rehab.dibi.jembatan_rusak.*`; `program_jembatan.json` hanya baris dengan `keyakinan` resmi atau terverifikasi dan `rujukan`; tanpa NaN; ukuran ≤ 8 MB; tidak ada salinan di `public/`.
- **Bukti:** `python3 scripts/data/sippa/cat.py uji && python3 scripts/data/sippa/jembatan.py uji`.
- **Rujukan:** PRD §9.7.1; DT §3.1.8–§3.1.10, §7.2; RU §4.1. **Ukuran:** M

#### SP-091 Migrasi 0059 aset, inspeksi, stok dan uji skema
- **Berkas:** `migrations/0059_sippa_aset_pelihara.sql` (persis DT §3.6), `tests/warga/sippa_skema.test.mjs`, `tests/warga/cakupan.json`.
- **Tujuan:** tabel `sippa_aset`, `sippa_inspeksi`, `sippa_stok_gerak` dengan CHECK dan trigger yang menolak yang salah.
- **Di luar:** rute.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten` (haiku), `penulis-gerbang`.
- **Model:** sonnet.
- **Dependensi:** SP-006 (0056 diterapkan), SP-050 (0058, nomor urut). **Paralel dengan:** SP-090, SP-092. **Isolasi:** worktree ya.
- **Selesai bila:** RU §3.6 tiap baris WAJIB GAGAL gagal dan WAJIB LOLOS lolos; migrasi dua kali tanpa galat; trigger inspeksi komponen mengisi `sippa_komponen.kondisi` dan `dicek`.
- **Bukti:** `node --test tests/warga/sippa_skema.test.mjs`.
- **Rujukan:** PRD §9.7.2; DT §3.6, §3.5; RU §3.6. **Ukuran:** M

#### SP-092 `pelihara.js` fungsi murni dan uji
- **Berkas:** `public/pipa/pelihara.js` (DT §5.10), `tests/sippa/pelihara.test.mjs`, `tests/sippa/cakupan.json`, `data/kajian-bnpb/data/sippa/pelihara.csv` dibangkitkan lewat `node public/pipa/pelihara.js --csv` (satu sumber untuk buku).
- **Tujuan:** kelas K1–K10, `KELAS_BOM`, interval, skor, stok minimum, biaya per tahun, `cekAset`, `jadwal`, `laikGelar` (PRD §6.10, §9.3).
- **Pengerja / pemeriksa:** `sippa` / `penulis-gerbang`, `validasi-model` (laju dan rentang 5–8%).
- **Model:** sonnet.
- **Dependensi:** SP-010. **Paralel dengan:** SP-090, SP-091. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 Pemeliharaan P1–P6 hijau; uji merah bila satu awalan BOM tanpa kelas atau bila enum skor berbeda dengan CHECK 0056.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §6.10, §9.3; DT §5.10; RU §2.3. **Ukuran:** S

#### SP-093 Rute aset, inspeksi, pelihara, stok, data baru
- **Berkas:** `src/sippa.js` (rute DT §4.3 baris keputusan 56; `LAYAR_SIPPA` + 3; `GET /pipa/aset/:id`; butir `inspeksi` di `lapangan/kirim`; `RUTE_SIPPA` tiga nama data baru), `src/admin_halaman.js` (cangkang tidak berubah kecuali daftar layar), `tests/warga/sippa.test.mjs`, `tests/warga/cakupan.json`.
- **Tujuan:** baca dan tulis aset, inspeksi, stok; jadwal mentah untuk layar; CSV pemeliharaan.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api` (haiku), `security-reviewer`.
- **Model:** sonnet.
- **Dependensi:** SP-091, SP-092, SP-029. **Paralel dengan:** SP-094 (dengan kontrak rute disepakati). **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.4 baris keputusan 56 hijau (hak, wilayah, masukan liar, ukuran, laju); sumur zona `kritis` tanpa `rekomendasi_bg` 400 dengan nama medan; operator hanya bisa inspeksi pra/pasca-gelar komponen kit tugasnya; staf nyata tidak melihat dummy.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.7.3; DT §4.2, §4.3, §6.6; RU §2.4. **Ukuran:** M

#### SP-094 Layar Pemeliharaan
- **Berkas:** `public/pipa/layar_pelihara.js`, `public/pipa/app.js` (rel dan Lainnya), `public/pipa/pipa.css` (bila perlu), `public/pipa/lapangan.js` (dialog inspeksi pra/pasca-gelar).
- **Tujuan:** PRD §9.4.9 dan DS §4.15.
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`.
- **Model:** sonnet. Baca `~/.claude/INP.md` dulu.
- **Dependensi:** SP-092, SP-093. **Paralel dengan:** SP-095. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 Pemeliharaan P7–P10 hijau; empat status jadwal tampil dengan teks, bukan warna saja; biaya berpil asumsi-kebijakan; interaksi < 200 ms; form inspeksi lapangan < 100 ms.
- **Bukti:** `npm run uji:sippa`; laporan `inp-reviewer`.
- **Rujukan:** PRD §9.4.9; DS §4.15. **Ukuran:** M

#### SP-095 Layar Air tanah, Akses, rincian aset
- **Berkas:** `public/pipa/layar_air.js`, `public/pipa/layar_akses.js`, `public/pipa/layar_aset.js`.
- **Tujuan:** PRD §9.4.10–§9.4.12 dan DS §4.16–§4.18.
- **Pengerja / pemeriksa:** `sippa` / `inp-reviewer`, `selera-angka`, `security-reviewer` (penyisipan teks rujukan).
- **Model:** sonnet.
- **Dependensi:** SP-090, SP-093. **Paralel dengan:** SP-094. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 Air tanah A1–A4 dan Akses K1–K4 hijau; "Jembatan Merah Putih" selalu bersama pemiliknya; peta punya daftar alternatif; tanpa angka sekunder.
- **Bukti:** `npm run uji:sippa`.
- **Rujukan:** PRD §9.4.10–§9.4.12; DS §4.16–§4.18. **Ukuran:** L

#### SP-096 Dummy tiga layar R4 dan uji alur pemeliharaan
- **Berkas:** `src/sippa.js` (`RANTAI_DUMMY` kunci `pelihara`, `air`, `akses`, PRD §9.14), `tests/warga/sippa.test.mjs`, `tests/warga/sippa_alur.test.mjs` (langkah 11–14 RU §2.5).
- **Tujuan:** layar terisi tanpa nol palsu; alur kit sampai servis dan stok tercatat ujung ke ujung.
- **Pengerja / pemeriksa:** `warga-api` / `penulis-gerbang`, `guard-api`.
- **Model:** sonnet. Baca `~/.claude/DUMMY.md` dulu.
- **Dependensi:** SP-093, SP-052. **Paralel dengan:** SP-094, SP-095. **Isolasi:** worktree ya.
- **Selesai bila:** RU §7.5 untuk tiga layar baru; RU §2.5 langkah 11–14 hijau dan merah bila satu langkah dilanggar.
- **Bukti:** `npm run uji:warga`.
- **Rujukan:** PRD §9.14; RU §2.5, §7.5. **Ukuran:** M

#### SP-097 Tinjauan R4
- **Pengerja / pemeriksa:** `guard-api`, `migrasi-idempoten`, `selera-angka`, `higiene-repo` (haiku); `security-reviewer`, `inp-reviewer`, `validasi-model` (sonnet).
- **Berkas:** tidak ada. **Tujuan:** sapuan berkas SP-090 s.d. SP-096. **Model:** haiku/sonnet.
- **Dependensi:** SP-090 s.d. SP-096. **Paralel dengan:** satu sama lain. **Isolasi:** tidak.
- **Selesai bila:** nol temuan kritis.
- **Bukti:** laporan; `npm run uji`; `npm run uji:sippa`.
- **Rujukan:** PRD §10.2 W-21. **Ukuran:** S

#### SP-098 [induk] Commit dan deploy R4
- **Tujuan:** tiga layar keputusan 56 di produksi paling lambat 20 Des 2026 (T-Q).
- **Berkas:** berkas SP-090 s.d. SP-096; `tests/warga/migrasi_beku.json` (0059).
- **Pengerja / pemeriksa:** sesi induk / `higiene-repo`. **Model:** opus.
- **Dependensi:** SP-097. **Paralel dengan:** SP-082. **Isolasi:** tidak.
- **Selesai bila:** migrasi 0059 remote; jalur PRD §10.6; uji asap RU §8.3 ditambah `/pipa/pelihara`, `/pipa/air`, `/pipa/akses` 200 dengan sesi dan `GET /api/sippa/data/cat` 200 atau 404 `belum_ada`.
- **Bukti:** log deploy.
- **Rujukan:** PRD §10.2 W-21, §10.6. **Ukuran:** S

#### SP-099 Akses 865 kompleks Kalteng: posko/Daops terdekat, rute, menit, air, zona
- **Berkas:** `scripts/data/sippa/akses_sippa.py` (baru), `data/sippa/keluaran/akses_kompleks.json` (keluaran), DT §3.1.11.
- **Tujuan:** keputusan pemilik 57. Per kompleks api prov 62 (865, koordinat `operasi.json`): posko/Daops terdekat menurut waktu tempuh lewat graf OSM (termasuk `track`), menit per kelas jalan dengan laju yang dinyatakan, ruas ujung (jalan kaki di gambut atau perahu di sungai/kanal bila lebih cepat), polyline Douglas-Peucker <= 40 titik, titik air terdekat dengan kelas JRC GSW, zona A-D tiga versi (`<` ketat, keputusan 51), `track_perlu_cek`, `kaki_tak_realistis` (jalan kaki > 5 km: batas atas, tak ikut median). Laju selaras `akses.py`. Semua berlabel `estimasi-model`; asumsi dan sumbernya ada di berkas keluaran.
- **Pengerja / pemeriksa:** `pipa-data` / `validasi-model`, `selera-angka` (angka menit yang tampil).
- **Model:** sonnet.
- **Dependensi:** `data/kajian-bnpb/pipa/data/*.csv` (`pipa_data.py`); mentah `data/raw/pipa/osm/` (gitignore, env `SIPPA_OSM`). **Paralel dengan:** SP-023. **Isolasi:** worktree ya.
- **Selesai bila:** `python3 scripts/data/sippa/akses_sippa.py uji` hijau (865 kompleks, total = jumlah ruas, tanpa NaN, zona A188/B418/C89/D170, A198/B429/C81/D157, A469/B158/C167/D71); SP-029 mendaftarkan `akses_kompleks` ke `DATA_SIPPA` dan SP-032 memakainya (rute, menit, `track_perlu_cek`).
- **Bukti:** keluaran perintah `uji`; blok `ringkas` di berkas keluaran.
- **Rujukan:** keputusan 51, 57; DT §3.1.11. **Ukuran:** M

---

## 4. Grafik dependensi

Panah = "harus selesai sebelum". `[I]` = tiket sesi induk. Garis ganda `══>` = jalur kritis.

```
FONDASI DAN P0 (25-27 Okt)
SP-001 ══> SP-002 ══> SP-003 ══> SP-007 ══> SP-008 ══> SP-011 ══> SP-015 ══> SP-016[I] ══> SP-017[I] ══> SP-018[I] pilot
(SP-010 ─> SP-019 pilot_cek.py ─> SP-018)
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
SP-002 ─> SP-085 (agent penulis-kajian) ─> SP-005
SP-004 + SP-005 + SP-085 ─> SP-058, SP-059, SP-060, SP-061, SP-067
SP-004 + SP-021 + SP-022 ─> SP-062 ─> SP-063 ─> SP-064
SP-004 ─> SP-086 (gerbang buku) ─> SP-077, SP-078
SP-004 ─> SP-065 ─> SP-066 (G-08 DSM sampai DEMNAS tiba)
SP-058 + SP-061 + SP-063 + SP-064 ─> SP-068 (bab 1–5) ─┐
SP-059 + SP-065 ─────────────────> SP-069 (bab 6–9) ───┤
SP-059 + SP-060 + SP-062 ────────> SP-070 (bab 10–13) ─┼─> SP-072 (+ SP-018, SP-037)
SP-060 ──────────────────────────> SP-071 (bab 14–17) ─┤
SP-009 + SP-030 + SP-062 + SP-065..067 + SP-069 ─> SP-073
SP-068..SP-073 ─> SP-074 ─> SP-075 ─> SP-076 ─┬─> SP-077 ─┬─> SP-079 ─> SP-080[I]
                                              └─> SP-078 ─┘

PROGRAM
SP-017 + SP-018 + T-D ─> SP-081[I] (laporan mingguan butuh SP-047) ─> SP-083
SP-080 + SP-036 ─> SP-082
DS, DT, KB, RU ─> SP-084[I] (awal, selesai 25 Okt); semua ─> SP-084[I] (akhir)

GABUNGAN GD RR DAN PEMELIHARAAN (keputusan 55, buku)
SP-004 + SP-085 ─> SP-087 (bukti bab 4, 12–15) ─> SP-088 (naskah) ─> SP-074
SP-087 + SP-062 ─> SP-089 (Lampiran M–Q) ─> SP-077
SP-087 ─> SP-070;  SP-088 ─> SP-078;  SP-092 ─> SP-062 (pelihara.csv)

WEB R4 (keputusan 56, 20 Des)
SP-025 ─> SP-090 ─────────────────────┐
SP-006 + SP-050 ─> SP-091 ─┐           │
SP-010 ─> SP-092 ──────────┼─> SP-093 ─┼─> SP-094, SP-095 ─┐
SP-029 ────────────────────┘           │                    ├─> SP-097 ─> SP-098[I]
SP-052 + SP-093 ─> SP-096 ─────────────┴────────────────────┘
```

---

## 5. Gelombang paralel dan rencana sprint

Paling banyak 4–5 pengerja menulis bersamaan (kolom "Penulis"); pemeriksa dan tiket [induk] tidak dihitung. Kuota minggu 26 Okt–1 Nov paling banyak 60% untuk SIPPA (keputusan 48); urutan pangkas bila kuota menipis: P0 > angka (SP-019 s.d. SP-025, SP-062, SP-063) > naskah > layar perencanaan > 3D dan telemetri (PRD §10.5).

| Gel. | Tanggal | Penulis bersamaan | Pemeriksa dan [induk] |
| --- | --- | --- | --- |
| 0 | 25 Okt pagi | tidak ada | SP-001, SP-002, SP-084 (awal, selesai) |
| 1 | 25 Okt siang | SP-003, SP-004, SP-006, SP-020, SP-085 (sesudah SP-003, worktree sama) | |
| 2 | 25 Okt malam | SP-005, SP-007, SP-013, SP-021 | |
| 3 | 26 Okt pagi | SP-008, SP-009, SP-010, SP-023 | |
| 4 | 26 Okt sore–27 Okt pagi | SP-011, SP-012, SP-014, SP-022 (SP-008 berlanjut) | |
| 5 | 27 Okt | SP-019, SP-025, SP-065 | SP-015, SP-016, SP-017 |
| 6 | 28 Okt–1 Nov | SP-029, SP-030, SP-034, SP-058, SP-062 | SP-018, SP-024 |
| 7 | 2–4 Nov | SP-026, SP-031, SP-032, SP-033, SP-035 | SP-081 mulai |
| 8 | 5–7 Nov | SP-036, SP-037, SP-040, SP-059, SP-060, SP-087 (penulis kelima; geser ke gel. 9 bila kuota penuh) | |
| 9 | 8 Nov | SP-061, SP-063, SP-066, SP-067, SP-086 | SP-038, SP-039 |
| 10 | 9–13 Nov | SP-027, SP-041, SP-043, SP-048, SP-064 | |
| 11 | 14–18 Nov | SP-042, SP-044, SP-068, SP-069, SP-070, SP-088 (penulis kelima) | |
| 12 | 18–22 Nov | SP-045, SP-050, SP-071, SP-072, SP-073, SP-089 | SP-046, SP-047 |
| 13 | 23–27 Nov | SP-049, SP-051, SP-074, SP-075 | |
| 14 | 28 Nov–2 Des | SP-052, SP-053, SP-054, SP-055, SP-076 | |
| 15 | 3–6 Des | SP-077, SP-078 | SP-056, SP-057, SP-079, SP-080 |
| 16 | 7–13 Des | SP-028, SP-090, SP-091, SP-092 | |
| 17 | 14–18 Des | SP-082, SP-093, SP-094, SP-095 | |
| 18 | 18–20 Des; 28 Des–3 Jan | SP-096; SP-083 | SP-097, SP-098 (20 Des); SP-084 (akhir) |

### Sprint 0: Siap pilot (25–27 Okt)
- **Tujuan sprint:** regu pilot memegang formulir kertas dan, bila uji lolos, tautan `/pipa/lapangan` yang tercatat di D1 produksi.
- **Kapasitas:** 3 hari x 4–5 pengerja paralel; beban direncanakan sekitar 75% supaya ada ruang putaran perbaikan tinjauan.
- **Wajib:** SP-001 s.d. SP-017, SP-019 (`pilot_cek.py` untuk pilot), SP-020, SP-021, SP-023, SP-085. **Regang (boleh pindah ke Sprint 1):** SP-022, SP-025, SP-065, SP-005.
- **Tanggal kunci:** 25 Okt siang gelombang 1; 26 Okt pagi pemeriksaan tengah (SP-006, SP-007 hijau); 27 Okt sore tinjauan SP-015; 27 Okt malam putusan deploy atau kertas.

### Sprint 1: R1 perencanaan, A/B, laporan pilot (28 Okt–8 Nov)
- **Tujuan sprint:** perencana bisa melihat peta kelayakan, menghitung trase, melihat hasil pilot di A/B dengan label n kecil, dan membuat Laporan pilot PDF.
- **Kapasitas:** 12 hari x 5 pengerja, minggu pertama dibatasi kuota 60%. **Wajib:** SP-018, SP-024, SP-026, SP-029 s.d. SP-039, SP-058, SP-062. **Regang:** SP-040, SP-059, SP-060, SP-061, SP-063.
- **Tanggal kunci:** 1 Nov vonis "dapat dipakai"; 2–8 Nov keputusan banjir (T-D); 8 Nov deploy R1.

### Sprint 2: R2 Studio, Pemicu, laporan operasi (9–22 Nov)
- **Tujuan sprint:** sebelum kit dipindah ke banjir (minggu 48), lima templat laporan dan pengingat mingguan berjalan, Studio membandingkan semua skenario.
- **Wajib:** SP-040 s.d. SP-047, SP-063, SP-064, SP-066, SP-067, SP-068 s.d. SP-070, SP-086. **Regang:** SP-027, SP-048, SP-071 s.d. SP-073.
- **Tanggal kunci:** 9–15 Nov Laporan pilot ke pimpinan; 16–22 Nov surat data terkirim (SP-067); 22 Nov deploy R2.

### Sprint 3: R3 dan buku versi serah (23 Nov–6 Des)
- **Tujuan sprint:** semua layar PRD §9.1.1 di produksi dan buku serta deck lolos QA lima lapis.
- **Wajib:** SP-049 s.d. SP-057, SP-071 s.d. SP-080, SP-088, SP-089. **Regang:** tidak ada; bila terlambat, 3D (SP-048, SP-049) dan telemetri (SP-050, SP-051) yang mundur, bukan buku (PRD §10.5).
- **Tanggal kunci:** 30 Nov operasi banjir pertama; 6 Des deploy R3 dan serah buku.

### Sprint 4: Pasca-serah dan R4 (7 Des 2026–3 Jan 2027)
- **Tujuan sprint:** AOI 2027, protokol A/B, rekap 2026, dan rilis web R4 pemeliharaan, air tanah, akses (keputusan 56, T-Q). **Wajib:** SP-028, SP-081, SP-082, SP-083, SP-084, SP-090 s.d. SP-098.
- **Tanggal kunci:** 13 Des 0059 dan `pelihara.js` hijau; 18 Des layar hijau; 20 Des deploy R4.

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
| T-A | Harga heli BNPB | SP-041, SP-042 (slot `sippa.heli.biaya_jam` `menunggu`), SP-062, SP-063, SP-070 (bab 13), SP-078 (slide 13) | slot kosong, pembanding resmi "> Rp200 juta per sorti satu jam"; buku tetap bisa diserahkan |
| T-B | Lokasi, tanggal, alat pilot | SP-017 (kode penugasan regu), SP-018 (pilot); SP-009 (kepala formulir lokasi kosong) | AOI mudah Palangka Raya, 2 lance, 2 termometer |
| T-C | Pemilik pompa pilot, penanda tangan pinjam pakai | SP-017 (`pemilik_asal` kit SIPPA-001) | dicatat apa adanya di `pemilik_asal`, tanpa dokumen formal |
| T-D | Provinsi/kabupaten banjir penerima kit | SP-081; SP-070 (Bab 11); SP-044 (isi laporan mingguan) | tujuan bebas di layar Kit; tabel buku memakai provinsi pasangan dari data |
| T-E | OPEX regu konvensional Manggala Agni | SP-062, SP-036 (garis dasar biaya), SP-070 | koefisien `bara_regu` 0,5–2,8 ha/regu/hari dari `operasi.json` |
| T-F | Nilai manfaat untuk NPV/BCR | SP-062, SP-042, SP-070 | manfaat 0 + dua skenario berlabel asumsi-kebijakan |
| T-G | Penanda tangan Kata Pengantar dan kolofon | SP-074, SP-080 | sama dengan deck BNPB 21 Okt 2026, draf berpenanda periksa pemilik |
| T-H | `/pipa` untuk akun instansi | SP-008 (hak akses) | hanya admin dan staf BNPB; operator memakai kode penugasan; bila berubah, tiket baru setelah SP-057 |
| T-I | Deep Research pemilik | tidak ada | tidak dirujuk |
| T-J | Telemetri satu baris per pesan | SP-050 (skema 0058) | satu baris per pesan, interval 60 detik (DT ADR-07) |
| T-K | Paket D1 berbayar sebelum telemetri > 30 kit | tidak ada tiket 2026 (kerangka saja); keputusan 2027 | interval 60 detik sampai 30 kit |

Penghambat lain di luar T-A s.d. T-K:

| Penghambat | Tiket | Bawaan |
| --- | --- | --- |
| DEMNAS AOI dari BIG | SP-066 (G-08), SP-049 (profil 3D) | G-08 dan 3D memakai GLO-30 (`dem_elevasi.csv`) berlabel DSM berkanopi sampai DEMNAS tiba |
| Akun CDS (`CDSAPI_KEY`) untuk GloFAS | SP-063, SP-073 (Lampiran A) | dicatat "belum ditarik" |
| Balasan surat data (BWS, walidata KHG, Manggala Agni, LKPP) | SP-083, revisi buku 2027 | label keyakinan tetap; tidak memblokir serah |
| Persetujuan pemilik atas putusan arah produk dari §1.1 | tiket yang memunculkan `Ruling:` berarah produk | tiket berhenti sampai dijawab (AGENTS.md §2.1) |

---

## 8. Tiket commit dan deploy (sesi induk saja)

| Tiket | Isi | Kapan | Syarat |
| --- | --- | --- | --- |
| SP-016 | commit P0 (SP-003, SP-004, SP-006 s.d. SP-014, SP-085) | 27 Okt | SP-015 bersih |
| SP-017 | migrasi 0056 remote, deploy P0, uji asap, kit SIPPA-001, kode regu | 27 Okt malam | SP-016; `npm run uji` dan `uji:sippa` hijau |
| SP-039 | commit R1 + data turunan terpisah + `migrasi_beku.json` (0056, 0057); migrasi 0057; deploy; `workflow_dispatch` `data.yml` | 8 Nov | SP-038 bersih |
| SP-047 | commit dan deploy R2 | 22 Nov | SP-046 bersih |
| SP-057 | commit R3 + `migrasi_beku.json` (0058); migrasi 0058; deploy rilis lengkap | 6 Des | SP-056 bersih |
| SP-080 | commit buku dan deck per tiket; serah | 6 Des | SP-079 bersih |
| SP-018, SP-081 | entri staf, ekspor D1, pemantauan operasi | 28 Okt–3 Jan | tidak ada commit kode |
| SP-084 | penyelarasan berkas ini; penutupan | 25 Okt dan 3 Jan | commit `data/kajian-bnpb/pipa/TIKET.md` saja |

Langkah deploy selalu PRD §10.6 butir 1–8 (DT §8.4, RU §8.2): migrasi remote `npx --yes wrangler@4.42.0 d1 migrations apply poskowarga --remote`; push ke `staging` (terbit.yml menguji lalu `wrangler versions upload --preview-alias staging`); uji asap di URL pratinjau dengan baris dummy; merge ke `main` (terbit.yml menguji lalu `wrangler deploy`, worker `centurisk97`). Merge ke `main` sama dengan tayang: `titik.yml`, `banjir.yml`, dan `data.yml` juga men-deploy `main`, paling lambat 21.20 WIB hari itu. Rollback = `npx --yes wrangler@4.42.0 rollback` lalu revert di `main`. Aturan commit PRD §10.7: satu commit per tiket, `git commit -m "SIPPA SP-0NN: ..." -- <berkas>`, tanpa `git add -A`, data turunan terpisah dari kode, tanpa berkas `* 2.*`. Skrip workflow di luar repo (SP-005) tidak di-commit.

---
## 9. Pemeriksaan kelengkapan

Matriks lintas dokumen (fitur dan bab terhadap PRD, DS, DT, KB, RU, TIKET) ada di `PENYELARASAN.md` §2; tabel di bawah adalah sisi tiket.

### 9.1 Fitur web PRD §9 ke tiket

| PRD | Fitur | Tiket |
| --- | --- | --- |
| §9.1.1 | peta layar 18 rute (14 semula + 4 keputusan 56) | SP-008 (cangkang), SP-010 (router) dan tiket layar di baris bawah |
| §9.1.2 | cangkang worker, gerbang host, tamu ke `/admin/pantau?ke=`, `/admin/pipa` | SP-008 |
| §9.1.3 | navigasi tiga lebar, bilah konteks provinsi dan versi zona | SP-010, SP-055 |
| §9.2 | gaya Pantau Bencana, Bahasa Indonesia, angka `fmt`, pil keyakinan, mode gelap, desktop/ponsel | SP-010, SP-055; gerbang SP-014 |
| §9.2.1 | enam keadaan standar | SP-010 |
| §9.3 | fungsi hitung bersama, gerbang kalkulator, `vonisPilot` | SP-010, SP-030; kembar SP-019, SP-026 |
| §9.4.1 | Ringkas | SP-029, SP-031 |
| §9.4.2 | Peta kelayakan, tiga versi zona, saran sarana | SP-021, SP-029, SP-032 |
| §9.4.3 | Kalkulator hidraulika (bawaan 300 L/min) | SP-033 |
| §9.4.4 | Pemicu pra-posisi | SP-023, SP-025, SP-043 |
| §9.4.5 | Inventaris dan lacak kit, QR, tugaskan, kehilangan | SP-008, SP-012, SP-013 |
| §9.4.6 | Rekap time-motion | SP-008, SP-010 |
| §9.4.7 | Dashboard A/B dan kartu vonis pilot | SP-034, SP-035, SP-036 |
| §9.4.8 | Data dan metode, batas alat | SP-030 (`batas.js`), SP-031 |
| §9.5 | Simulator keputusan (mesin, `gerbangSippa`, semua skenario, NPV/BCR/MC) | SP-040, SP-041, SP-042, SP-062 |
| §9.6 | Simulasi 3D | SP-048, SP-049 |
| §9.7.1 | data turunan R2 | SP-019 s.d. SP-025, SP-028, SP-090 |
| §9.7.2 | skema D1 0056–0059 | SP-006, SP-034, SP-050, SP-091 |
| §9.7.3 | rute worker (termasuk `probe.csv`, `foto/:id`) | SP-008, SP-029, SP-035, SP-050, SP-052 |
| §9.8 | akses, peran, CSP, privasi | SP-008, SP-015, SP-038, SP-046, SP-056 |
| §9.9 | form lapangan luring, `jam_klien_meleset`, medan vonis pilot | SP-007, SP-008, SP-009, SP-011, SP-013 |
| §9.10 | laporan PDF lima templat, pengingat mingguan Meja Pantau | SP-037, SP-044, SP-045 |
| §9.11 | telemetri, alarm Meja Pantau | SP-050, SP-051 |
| §9.12.1 | pemilik berkas, agent `sippa` dan `penulis-kajian` | SP-003, SP-085 |
| §9.12.2 | uji per lapisan | lihat §9.3 di bawah |
| §9.13 | INP dan aksesibilitas | SP-055; `inp-reviewer` di tiap tiket layar |
| §9.14 | data dummy | SP-008 (Kit, Log, Lapangan), SP-029, SP-035, SP-050, SP-052, SP-053, SP-096 (Pemeliharaan, Air tanah, Akses) |
| §6.10, §9.3 | model pemeliharaan, `pelihara.js` | SP-092, SP-062 |
| §9.4.9 | Pemeliharaan | SP-093, SP-094 |
| §9.4.10, §9.4.11, §9.4.12 | Air tanah, Akses, rincian aset | SP-090, SP-093, SP-095 |

Tidak ada fitur §9 tanpa tiket.

### 9.2 Buku dan deck ke tiket (KB §4, §5, §11)

| Bagian | Bukti | Naskah | Pendukung |
| --- | --- | --- | --- |
| Depan: Kata Pengantar, Ringkasan Eksekutif | dari bab | SP-074 | T-G |
| Bab 1 Pendahuluan | SP-058 | SP-068 | SP-061; bukti rehab bab-01, bab-02 |
| Bab 2 Bara Gambut | SP-058 | SP-068 | SP-061, SP-064, SP-066 (penampang) |
| Bab 3 Pola Api | SP-058 | SP-068 | SP-020, SP-063, SP-064 |
| Bab 4 Beban Pascabencana (baru) | SP-087 | SP-088 | SP-063 (`sippa.irisan.*`), SP-064 (`sippa-19` s.d. `sippa-24`) |
| Bab 5 Kelayakan Kit Kalteng | SP-058 | SP-068 | SP-021, SP-062, SP-064 |
| Bab 6 Kebutuhan Kit 18 Provinsi | SP-058 | SP-068 | SP-022, SP-064 |
| Bab 7 Desain SIPPA Terintegrasi | SP-059 | SP-069 | SP-066 (lapis, siklus, G-11) |
| Bab 8 Hidraulika | SP-059 | SP-069 | SP-019, SP-063, SP-064, SP-066 (G-08) |
| Bab 9 Komponen dan Gambar Teknik | SP-059 | SP-069 | SP-065, SP-066 |
| Bab 10 Operasi | SP-059 | SP-069 | SP-019 (`matriks_respons`) |
| Bab 11 Pemakaian Ganda | SP-059 | SP-070, SP-072 (11.4) | SP-062, SP-081, T-D |
| Bab 12 Air Pascabencana (baru) | SP-087 | SP-088 | SP-064 (`sippa-25` s.d. `sippa-27`) |
| Bab 13 Air Tanah (baru) | SP-087 | SP-088 | SP-090 (`cat.json`), SP-064 (`sippa-28`, `sippa-29`) |
| Bab 14 Akses (baru) | SP-087 | SP-088 | SP-064 (`sippa-30`), SP-086 (D-39) |
| Bab 15 Model Pemeliharaan (baru) | SP-087 | SP-088 | SP-092 (`pelihara.js`, `pelihara.csv`), SP-062 (biaya), SP-066 (siklus mode aset) |
| Bab 16 Pilot dan Program Uji | SP-060 | SP-070, SP-072 (16.3) | SP-018, SP-066 (gerbang, G-12) |
| Bab 17 Kelembagaan | SP-060 | SP-070 | SP-066 (lembaga) |
| Bab 18 Anggaran, Pembiayaan, NPV, BCR, Monte Carlo | SP-060 | SP-070 | SP-062, T-A, T-E, T-F, T-N |
| Bab 19 Risiko | SP-060 | SP-071 | SP-064 (matriks risiko) |
| Bab 20 Sistem Data dan Pemantauan | SP-060 | SP-071 | SP-066 (alur_data), web R1–R4 |
| Bab 21 Peta Jalan | SP-060 | SP-071 | register SR KB §6 |
| Bab 22 Kesimpulan dan Keputusan | SP-060 | SP-071 | KD-1 s.d. KD-12 |
| Lampiran A, B, C, D, E, F (pengantar), G, H, J, K, L | | SP-073 | SP-009, SP-021, SP-030, SP-062, SP-065, SP-066 |
| Lampiran I surat | | SP-067 | |
| Lampiran F lembar A3 | | SP-065, SP-066 | SP-077 (penyisipan) |
| Lampiran M, N, O, P, Q (bahan rehab dan pemeliharaan) | | SP-089 | SP-087, SP-062 |
| Lampiran R glosarium, S atribusi foto | | dibangkitkan SP-077 | SP-004 (glosarium), SP-061 (foto) |
| Deck 18 slide isi | | SP-078 | SP-063, SP-064, SP-088 |
| Gerbang buku (T-12, D-33 s.d. D-40) | | SP-086 | SP-004 |
| Sunting, QA, bangun, serah | | SP-075, SP-076, SP-077, SP-079, SP-080 | SP-004, SP-005, SP-085 |
| Dokumen program (formulir, surat, protokol, rekap) | | SP-009, SP-067, SP-082, SP-083 | |

Tidak ada bab atau lampiran tanpa tiket.

### 9.3 Area uji ke tiket (RU)

| Area uji | Berkas atau perintah | Tiket |
| --- | --- | --- |
| fungsi murni JS (RU §2.1) | `tests/sippa/hitung.test.mjs`, `keadaan.test.mjs` | SP-010, SP-030 |
| mesin Studio (RU §2.2) | `tests/sippa/studio_mesin.test.mjs`, `fixtures/studio_konstanta.json` | SP-041 |
| logika 3D, laporan, formulir, antrean | `adegan_logika`, `laporan_isi`, `formulir`, `antre` | SP-049, SP-037, SP-044, SP-007, SP-011 |
| kembar JS dan Python (RU §1.1 L2) | `tests/sippa/kembar.test.mjs` | SP-026 |
| self-check Python (RU §4.1) | `scripts/data/sippa/*.py uji`, `sippa_keuangan.py`, `sippa_angka.py`, `sippa_formulir.py`, `sippa_pilot.py` | SP-019 s.d. SP-023, SP-028, SP-062, SP-063, SP-009, SP-072 |
| garis keturunan (RU §4.3) | `tests/sippa/garis_keturunan.test.mjs` | SP-021, SP-025, SP-063 |
| skema D1 (RU §3) | `tests/warga/sippa_skema.test.mjs` | SP-006, SP-034, SP-050, SP-091 |
| fungsi pemeliharaan (RU §2.3 Pemeliharaan) | `tests/sippa/pelihara.test.mjs` | SP-092 |
| rute dan hak (RU §2.4) | `tests/warga/sippa.test.mjs` | SP-008, SP-029, SP-035, SP-045, SP-050, SP-052 |
| alur lintas-tabel (RU §2.5) | `tests/warga/sippa_alur.test.mjs` | SP-054, SP-096 (langkah 11–14) |
| registri cakupan (RU §7) | `tests/warga/cakupan.json`, `tests/sippa/cakupan.json`, `gerbang-cakupan.test.mjs` | tiap tiket `warga-api` dan `sippa`; SP-003, SP-014 |
| gerbang SIPPA (RU §2.6, §2.8) | `tests/sippa/gerbang-sippa.test.mjs` | SP-014, SP-055 |
| aksesibilitas dan kontras (RU §2.7) | `tests/sippa/kontras.test.mjs`, peramban | SP-055 |
| luring dan kirim ulang (RU §2.3 F1–F8) | `antre.test.mjs` + rute + peramban | SP-011, SP-008 |
| dummy tiap layar (RU §7.5) | `tests/warga/sippa.test.mjs` | SP-052, SP-053 |
| gerbang ilmu agent dan pemilik berkas | `npm run uji:agen` | SP-003, SP-085 |
| migrasi beku | `tests/warga/migrasi_beku.test.mjs` | SP-017, SP-039, SP-057 |
| uji asap produksi (RU §8.3) | PRD §10.6 langkah 7 | SP-017, SP-039, SP-047, SP-057 |
| data pilot (RU §6) | `pilot_cek.py`, `vonisPilot` | SP-019, SP-018, SP-036, SP-072 |
| U1, U2 buku dan deck (RU §5) | `qa/periksa.py --ketat`, `qa/slop.py`, `qa/uji.py` | SP-075 s.d. SP-079, SP-086 |
| U3, U4 pilot | `/pipa/log`, `/pipa/ab` | SP-018, SP-036 |
| U5 web di produksi | log deploy | SP-057 |
| U6 waktu gelar | `/pipa/log` | SP-010, SP-081 (data 2027) |
| U7 efikasi | `/pipa/ab` | SP-036, SP-082 (protokol) |
| U8, U9 aset dan banjir | `sippa_komponen`, `sippa_gerak`, laporan mingguan | SP-012, SP-044, SP-054, SP-081 |
| U10 INP (RU §2.6) | `inp-reviewer`, angka terukur | SP-055, SP-056, SP-097 |
| U11, U12 pemeliharaan | `/pipa/pelihara`, `sippa_inspeksi` | SP-094, SP-081 (data 2027) |

### 9.4 Rencana kerja PRD §10 ke tiket

| PRD | Tiket | PRD | Tiket | PRD | Tiket |
| --- | --- | --- | --- | --- | --- |
| P0-01 | SP-001 | W-01 | SP-019 s.d. SP-023 | B-00 | SP-085 |
| P0-02 | SP-002 | W-02 | SP-024 | B-01 | SP-004 |
| P0-03 | SP-003 | W-03 | SP-025 | B-02 | SP-058, SP-059, SP-060 |
| P0-04 | SP-006 | W-04 | SP-029 | B-03 | SP-062, SP-063 |
| P0-05 | SP-008 | W-05 | SP-030 s.d. SP-033 | B-04 | SP-061 |
| P0-06 | SP-009 | W-06 | SP-034, SP-035 | B-05 | SP-064 |
| P0-07 | SP-007, SP-010 s.d. SP-014 | W-07 | SP-036, SP-037, SP-044 | B-06 | SP-065, SP-066 |
| P0-08 | SP-015 | W-08 | SP-040, SP-041, SP-042 | B-07 | SP-068 s.d. SP-071, SP-073, SP-074 |
| P0-09 | SP-016, SP-017 | W-09 | SP-043 | B-08 | SP-075 |
| P0-10 | SP-018 | W-10 | SP-048, SP-049 | B-09 | SP-076 |
| | | W-11 | SP-050, SP-051 | B-10 | SP-072 |
| | | W-12 | SP-052, SP-053 | B-11 | SP-067 |
| | | W-13 | SP-054, SP-055 (+ SP-014) | B-12 | SP-077 |
| | | W-14 | SP-056 | B-13 | SP-078 |
| | | W-15 | SP-057 | B-14 | SP-079 |
| | | W-16 | SP-090 | B-02 (bab 4, 12–15) | SP-087 |
| | | W-17 | SP-091 | B-07 (bab 4, 12–15, Lampiran M–Q) | SP-088, SP-089 |
| | | W-18 | SP-092 | | |
| | | W-19 | SP-093, SP-096 | | |
| | | W-20 | SP-094, SP-095 | | |
| | | W-21 | SP-097, SP-098 | | |
| | | | | B-15 | SP-080 |
| | | | | B-16 | SP-082 |

Tambahan di luar §10 PRD: SP-005 (workflow `sippa`), SP-026 (kembar), SP-027 (gudang dan akses, PRD §7.1), SP-028 (AOI, PRD §4.1 minggu 50), SP-045 (pengingat, PRD §9.10), SP-081 (operasi banjir, PRD §4.1), SP-083 (rekap, PRD §4.1 minggu 53), SP-084 (penyelarasan), SP-086 (gerbang buku, KB §9.4, RU §5.4). Daftar periksa serah PRD §12.3 diperiksa di SP-056 (web) dan SP-079 (buku).

---

## 10. Hal yang sudah diselesaikan dan yang tersisa

Diselesaikan pada penyelarasan 25 Okt 2026 (`PENYELARASAN.md`):

1. Rujukan menurut nama bagian diganti nomor bagian (DS, DT, KB, RU).
2. Jalur buku: kode `sippa`, naskah satu front matter per berkas (`00-depan-*.md`, `bab-NN.md`, `90-lampiran-<huruf>.md`), `deck.py <spek.json> <keluaran.pptx> --pdf` (SP-005, SP-073, SP-074, SP-078).
3. Penulis buku: agent `penulis-kajian` dibuat (SP-085) dengan otoritas AGENTS.md §1.5.
4. Formulir kertas: pembangkit `data/kajian-bnpb/bangun/sippa_formulir.py` (KB §8 menamai `sippa_*`).
5. Bab 17 dan Lampiran A–N mengikuti KB (PRD §8 diselaraskan).
6. G-08 tidak lagi tertahan: GLO-30 berlabel DSM sampai DEMNAS tiba (KB §7.3).
7. Pengingat mingguan = butir Meja Pantau (SP-045, ADR-11); rute mengikuti DT §4.3; deploy lewat terbit.yml staging lalu `main`.

Tersisa (tidak menghalangi eksekusi; bawaan tertulis):

1. **Mesin buku hanya menerima `air` dan `mitigasi`** (`bangun.py` dan `periksa.py` `choices`); SP-004 wajib selesai sebelum tiket buku mana pun.
2. **Skrip workflow di luar repo** (`naskah-kajian.js`, `rakit-kajian.js`) tidak terlacak git; SP-005 mengubahnya tanpa commit; sampai selesai, workflow tidak dijalankan untuk `sippa` (KB §10 O3).
3. **Sumber Studio pemilik ada di `~/Downloads`**; SP-040 menyalinnya. Bila pemilik tidak ingin berkas itu masuk repo, port SP-041 membaca langsung dari Unduhan dan sumber tidak terlacak.
4. **Lampiran H (protokol A/B) di buku 6 Des adalah versi buku**; KAK pra-registrasi minggu 51 (SP-082).
5. **`.superpowers/` belum diabaikan git**; SP-003 menambahkannya ke `.gitignore` sebelum buku besar §1.1 dipakai.
6. **Konflik skill dan AGENTS.md** diputus mengikuti AGENTS.md: implementer tidak commit; implementer paralel diizinkan di worktree; putusan berarah produk dibawa ke pemilik.
7. **Tanggal pilot.** PRD §4.1 menjadwalkan pilot 28 Okt–1 Nov dengan web siap 27 Okt malam; berkas ini memakai "siap 27 Okt".
8. **Pemilik gerbang SIPPA web**: pengerja `sippa`, pemeriksa `penulis-gerbang` (PRD §9.12.1). Gerbang buku SP-086 dikerjakan `penulis-gerbang` di berkas milik `pipa-data` dengan pemilik berkas sebagai pemeriksa.
9. **R1 menarik W-06 dan sebagian W-07 lebih awal** dari P2 PRD supaya `/pipa/ab` (minggu 45) dan Laporan pilot (minggu 46) tersedia.
10. **Banyak perubahan pekerjaan lain di `git status` awal sesi**; tiket commit hanya menyentuh berkas tiketnya.

---

## 11. Program 27 Okt 2026 (keputusan 61)

Fase 1 memakai data yang sudah ada di repo atau worker; fase 2 butuh form lapangan di HP; fase 3 butuh data baru, infrastruktur, atau data musim pilot. Nomor dalam kurung = nomor rekomendasi.

| Tiket | Butir | Fase | Pengerja | Catatan |
| --- | --- | --- | --- | --- |
| SP-100 | Kartu "Keputusan hari ini" di Ringkas: kit ke mana, berangkat jam berapa, alasan satu kalimat (1) | 1 | `sippa` | dari SP-101 dan SP-102 |
| SP-101 | "Jalan atau tunda" H-1 per lokasi dari titik panas 24 jam, hujan, angin (2) | 1 | `sippa` | aturan tertulis, label asumsi-kebijakan |
| SP-102 | Peringkat kompleks prioritas mingguan: titik panas aktif x zona x waktu tempuh (3) | 1 | `pipa-data` | akses_kompleks.json + /api/titik |
| SP-103 | Alarm titik panas baru dalam 2 km dari kompleks zona A atau B (4) | 1 | `warga-api` | cron FIRMS 3 jam, butir Meja Pantau |
| SP-104 | Angka "kit siap gelar" per depot: laik, lengkap, BBM cukup (5) | 1 | `sippa` | sippa_kit, sippa_komponen, stok |
| SP-105 | Peta kit terdekat per titik panas dengan waktu sampai (6) | 1 | `sippa` | graf akses SP-099 |
| SP-106 | Ringkasan WhatsApp satu layar untuk pimpinan (7) | 1 | `sippa` | teks salin, tanpa kirim otomatis |
| SP-107 | Lampu per titik panas: hijau siap, kuning kurang alat, merah tidak terjangkau (8) | 1 | `sippa` | |
| SP-108 | Laut dan air payau berlabel "air asin, darurat saja" (23); danau besar multipoligon OSM ikut sumber air (22) | 1 | `pipa-data` | zona dihitung ulang, angka buku ikut |
| SP-109 | Provinsi gambut lain: Sumsel, Riau, Jambi, Kalbar, Kalsel, Papua Selatan (24) | 1 | `pipa-data` | osm_jarak, kelayakan, akses per provinsi |
| SP-110 | Lapisan sekat kanal dan sumur bor BRGM dari PRIMS (27) | 1 | `pipa-data` | WFS `prims:infrastruktur_pembasahan_3r`, `prims:rencana_sumur_bor` |
| SP-111 | Citra Sentinel-2 SWIR terbaru per kompleks satu klik, untuk konfirmasi api (29) | 1 | `pipa-data` | `scripts/data/citra.py`, pola citra_pilot.py |
| SP-112 | Riwayat kompleks: tahun terbakar, gelar SIPPA sebelumnya, hasilnya (30) | 1 | `sippa` | MCD64A1 + sippa_log |
| SP-113 | Katalog alat berfoto dan kelas kinerja dari lampiran renlap (31) | 1 | `sippa` | foto Wikimedia berkredit dari pilot/lampiran.py |
| SP-114 | p50/p90 tiba sampai air mengalir per kelas medan dari log (45); ekspor CSV evaluator satu tombol (44) | 1 | `sippa` | |
| SP-115 | Log keputusan dan perubahan angka: siapa, kapan, alasan (49) | 1 | `warga-api` | pola pantau_jejak |
| SP-120 | Daftar periksa gelar di HP, centang per langkah, jam otomatis (12) | 2 | `sippa` | /pipa/lapangan |
| SP-121 | Foto bukti per tahap ber-GPS untuk semua gelar (13) | 2 | `warga-api` | pola /uji-pilot, src/gps.js, src/foto.js |
| SP-122 | Mode luring penuh: ubin peta dan rute disimpan sebelum berangkat (14) | 2 | `sippa` | service worker lapangan |
| SP-123 | Tombol SOS dan titik kumpul di layar lapangan (15) | 2 | `sippa` | |
| SP-124 | Suhu tanah per petak: 5 titik x 4 kedalaman, sebelum, sesudah, besok, jadi grafik (16) | 2 | `sippa` | termometer tusuk; probe digital 2027 |
| SP-125 | Tekanan lance tiap 10 menit dengan pengingat dan peringatan < 2 bar (17) | 2 | `sippa` | manometer dibaca regu; PT-101 telemetri 2027 |
| SP-126 | Rute jalan kaki dari jejak GPS regu (18) | 2 | `sippa` | |
| SP-127 | Laporan selesai gelar otomatis ke Posko: foto, jam, alat kembali (20) | 2 | `warga-api` | |
| SP-128 | Kedalaman gambut per petak dari bor regu, dikembalikan ke peta (25) | 2 | `warga-api` | lihat catatan sumber di bawah |
| SP-129 | Debit kanal kemarau dari ukur lapangan (26) | 2 | `sippa` | metode pelampung atau ember-stopwatch |
| SP-130 | Pinjam-pakai alat dengan berita acara digital (36) | 2 | `warga-api` | |
| SP-131 | Kehilangan komponen per musim per depot (37); alat rusak menunggu suku cadang dengan umurnya (39) | 2 | `sippa` | |
| SP-140 | Renlap Generator dari kompleks mana pun (PDF + versi HP) (11) | 3 | `pipa-data` + `mekanik-mesin` | arah mesin belum diputus pemilik |
| SP-141 | Jalan per moda mobil, motor, jalan kaki dari tag OSM `tracktype`, `surface`, `highway=path` (21) | 3 | `pipa-data` | tarik ulang Overpass dengan tag |
| SP-142 | Lapisan izin konsesi untuk izin pemegang hak sebelum gelar (28) | 3 | `pipa-data` | nama perusahaan tidak ditulis (keputusan 50) |
| SP-143 | Stok minimum per depot dengan peringatan beli ulang (32); servis pompa dari jam pakai (33); BBM per gelar jadi permintaan logistik (35) | 3 | `sippa` | pelihara.js |
| SP-144 | Lini masa kit karhutla dan banjir (34); pindah otomatis ke modul banjir November dengan daftar tujuan (40) | 3 | `sippa` | |
| SP-145 | A/B terisi dari data lapangan (41); gerbang G0–G5 dihitung ulang tiap data masuk (42); kartu terbukti dan belum (43); laporan mingguan PDF tiap Jumat (46); selang pendek lawan panjang (47); akses per provinsi BPBD (48); anggaran T0–T4 terkunci gerbang dengan sisa dana (50) | 3 | `sippa` + `warga-api` | butuh data musim pilot |

**Sumber kedalaman gambut (SP-128).** Peta gambut PRIMS BRGM 1:250.000 tidak memuat kedalaman. Peta lahan gambut BBSDLP Kementan memuat kelas ketebalan (dangkal, sedang, dalam, sangat dalam) pada skala 1:250.000; dipakai sebagai perkiraan awal berlabel. Angka yang mengikat hanya hasil bor regu per petak (kolom baru di form lapangan, disimpan di D1, tampil di peta dan Rincian kompleks).

