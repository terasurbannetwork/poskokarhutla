# TIKET: Kemitraan Kampus

Dokumen terakhir dalam urutan otoritas:
`KEPUTUSAN-KAMPUS.md` > `PRD.md` > `ALUR.md` > `ALGORITMA.md` > `PROFIL-DAERAH.md` >
`DESIGN-SYSTEM.md` > `DESAIN-TEKNIS.md` > `KEAMANAN-PRIVASI.md` > `RENCANA-UJI.md` > TIKET.
Singkatan: KP, PRD, AL (ALUR), ALG, PD, DS, DT, KM, RU. Versi 1.0, 30 Okt 2026.

> **Untuk pekerja agen.** Satu sesi = satu tiket. Baca tiketmu, lalu bagian dokumen di
> "Rujukan" SAJA. Kerjakan hanya "Berkas". Yang tidak tertulis: berhenti dan tanya
> (AGENTS.md §2.2). Kamu subagent: jangan commit, jangan push, jangan deploy, jangan
> jalankan `memo`.

## 0. Batasan global (salin persis)
| Batasan | Nilai |
| --- | --- |
| Kunci kab | kode IRBI 4 digit (`kab4`) |
| Migrasi | 0080–0084, hanya `CREATE … IF NOT EXISTS`, sha256 ke `tests/warga/migrasi_beku.json` |
| Kode pribadi | `kodeBaru()` 26 hex, simpan sha saja |
| Sandi | `hashSandi` PBKDF2 100k, ≥ 10 huruf |
| JSON daerah | ≤ 60 KB; `ringkas.json` ≤ 120 KB |
| CPU worker | target ≤ 10 ms; hitung berat ke pipeline |
| Cron | tidak menambah jadwal; pakai dispatcher |
| Gaya | DS; kelas `.ak-*` + `.km-*`; token `inti/tema.css` |
| Kiriman ke luar | tidak ada otomatis; wa.me/mailto/salin |
| Bobot dan ambang | hanya di `konst.py` = `konst.js` |

## 1. Aturan semua tiket
1. Model: pengerja **sonnet**, pemindai/pengulas mekanis **haiku**, sesi induk **opus**.
2. Isolasi: tiket yang menulis → `isolation: "worktree"`; commit oleh sesi induk dengan
   `git commit -- <berkas>`.
3. Selesai = semua perintah "Bukti" keluar 0 + pengulas tanpa temuan tinggi.
4. Uji yang salah DITOLAK wajib ada (TEST.md).
5. Tiap fungsi/rute/tabel baru masuk registri cakupan (`tests/kemitraan/cakupan.json`
   atau `tests/warga/cakupan.json`).
6. Tidak menyunting migrasi lama, berkas `* 2.*`, atau dokumen KP.
7. Teks antarmuka mengikuti DS §7.
8. Ukuran: S < ½ hari, M ≈ 1 hari, L > 1 hari (pecah bila bisa).
9. Tag `[induk]` = dikerjakan sesi induk (commit, migrasi produksi, deploy, keputusan).
10. Tag `[manusia]` = butuh orang (label, isian data resmi).

## 2. Indeks dan papan status
| ID | Judul | Pengerja | Jalur (§5) | Ukuran | Status |
| --- | --- | --- | --- | --- | --- |
| KM-A01 | Agent `kampus` + AGENTS.md §2.2 [induk] | mekanik-mesin | I | S | belum |
| KM-A02 | Konstanta, kamus, kasus acuan | kampus | P | M | selesai |
| KM-A03 | Crosswalk kode wilayah `kode.py` | kampus | P | M | selesai |
| KM-A04 | Migrasi 0080 dasar | warga-api | M | M | selesai |
| KM-A05 | Migrasi 0081 masalah | warga-api | M | M | selesai |
| KM-A06 | Migrasi 0082 riset dan dana | warga-api | M | M | selesai |
| KM-A07 | Migrasi 0083 satgas | warga-api | M | M | selesai |
| KM-A08 | Migrasi 0084 talenta | warga-api | M | M | selesai |
| KM-A09 | Cangkang rute + gerbang hak + peran staf | warga-api | W | M | selesai |
| KM-A10 | Cangkang layar + helper KM | kampus | L | M | belum |
| KM-A11 | Gerbang teks + registri cakupan | penulis-gerbang | G | S | selesai |
| KM-B01 | Profil daerah: blok umum | kampus | P | L | selesai |
| KM-B02 | Profil daerah: blok per bahaya + model | kampus | P | L | belum |
| KM-B03 | Masalah otomatis `masalah.py` | kampus | P | M | belum |
| KM-B04 | Ringkas + profil provinsi | kampus | P | S | belum |
| KM-B05 | Workflow `kemitraan.yml` | mekanik-mesin | I | S | belum |
| KM-B06 | Tampilan Daerah + lembar profil | kampus | L | L | belum |
| KM-B07 | Komponen peta SVG `.km-peta-wil` | kampus | L | M | belum |
| KM-B08 | Buku profil daerah | kampus | L | L | belum |
| KM-C01 | Bank templat pertanyaan | kampus | P | L | belum |
| KM-C02 | Generator pertanyaan + halaman panduan | kampus | P + L | M | belum |
| KM-C03 | Rute masalah, kunjungan, jawaban, koreksi | warga-api | W | L | belum |
| KM-C04 | Tampilan Masalah | kampus | L | L | belum |
| KM-C05 | Formulir pendataan luring (halaman saya BP) | kampus | L | M | belum |
| KM-C06 | Korpus OpenAlex `korpus.py` | kampus | P | M | belum |
| KM-C07 | Indeks BM25 + cocok pakar + solusi | kampus | P | L | belum |
| KM-C08 | Pakar di worker + ekspor pipeline | warga-api | W | M | belum |
| KM-C09 | Label relevansi 60 masalah [manusia] | – | P (manusia) | M | belum |
| KM-C10 | Uji relevansi `uji_cocok.py` | kampus | P | S | belum |
| KM-C11 | Kartu pakar + daftar pendek di masalah | kampus | L | M | belum |
| KM-C12 | Workflow `kemitraan-pakar.yml` | mekanik-mesin | I | S | belum |
| KM-D01 | Rute daftar, masuk, atur sandi, kode anggota | warga-api | W | L | belum |
| KM-D02 | Halaman daftar + masuk | kampus | L | M | belum |
| KM-D03 | Halaman saya (anggota) | kampus | L | M | belum |
| KM-D04 | Tampilan Kampus + perjanjian | kampus | L | M | belum |
| KM-D05 | Rute kampus, perjanjian, kode BPBD | warga-api | W | M | belum |
| KM-D06 | Skor keaktifan kampus | warga-api | W | S | belum |
| KM-E01 | Rute donor + panggilan donor | warga-api | W | S | belum |
| KM-E02 | Data donor awal (A2 paparan) | kampus | P | S | belum |
| KM-E03 | Rute proposal, konsorsium, surat | warga-api | W | M | belum |
| KM-E04 | Rute hibah + telaah | warga-api | W | L | belum |
| KM-E05 | Rute agenda susun + inovasi | warga-api | W | M | belum |
| KM-E06 | Tampilan Dana | kampus | L | M | belum |
| KM-E07 | Tampilan Riset (agenda, hibah, inovasi) + layar penelaah | kampus | L | L | belum |
| KM-F01 | Rute satgas + piket | warga-api | W | M | belum |
| KM-F02 | Rute aktivasi, panggilan, tugaskan, kaji cepat, tutup | warga-api | W | L | belum |
| KM-F03 | Sertifikat + QR + verifikasi publik | warga-api + kampus | W + L | M | belum |
| KM-F04 | Catatan pembelajaran | warga-api | W | S | belum |
| KM-F05 | Tampilan Satgas + lembar aktivasi | kampus | L | L | belum |
| KM-F06 | Kartu panggilan + check-in di halaman saya | kampus | L | M | belum |
| KM-G01 | Rute magang + mentor | warga-api | W | M | belum |
| KM-G02 | Rute desa, dampingan, BUMN, modul | warga-api | W | M | belum |
| KM-G03 | Tampilan Talenta + peta binaan | kampus | L | L | belum |
| KM-H01 | Dasbor indikator + ekspor | warga-api + kampus | W + L | M | belum |
| KM-H02 | Detektor pengingat km | warga-api | W | S | belum |
| KM-H03 | Dummy isi/hapus | warga-api | W | M | belum |
| KM-H04 | Uji alur ujung ke ujung E1–E9 | penulis-gerbang | G | L | belum |
| KM-H05 | Uji layar 1440/390 | kampus | L | M | belum |
| KM-H06 | Penyelarasan konteks bersih | Explore/sonnet | G | M | belum |
| KM-H07 | Commit, migrasi produksi, terbit [induk] | sesi induk | I | S | belum |

## 3. Tiket

### 3.A Fondasi teknis

#### KM-A01 Agent `kampus` + AGENTS.md §2.2 [induk]
- **Tujuan:** agent pengerja `kampus` terdaftar; urutan dokumen modul masuk AGENTS.md.
- **Berkas:** `scripts/agents/roster.json`, `.claude/agents/kampus.md` (generate), `.claude/ilmu-agent/kampus.md`, `.claude/ilmu-agent/KATALOG.md` (generate), `AGENTS.md`.
- **Antarmuka:** entri roster persis DT §2.3 (`model: "sonnet"`). AGENTS.md: baris peta modul "Kemitraan kampus" dan §2.2 berisi daftar 10 dokumen urut otoritas + aturan berhenti (pola §2.1). Ilmu awal: ringkasan DS §1–4, ALG §1–4, PD §1–2, ranjau (kode wilayah 4 skema, data pakar privat R2).
- **Di luar:** kode modul.
- **Pengerja / pemeriksa:** sesi induk via `mekanik-mesin` / `higiene-repo`.
- **Model:** sonnet; pemeriksa haiku.
- **Dependensi:** –. **Paralel dengan:** A02, A03, A04–A08. **Isolasi:** tidak (induk).
- **Selesai bila:** `npm run agents:build` bersih; `node scripts/agents/ilmu.mjs pemilik public/kemitraan.html` → `kampus`; `pemilik src/kemitraan.js` → `warga-api`.
- **Bukti:** `npm run uji:agen`.
- **Rujukan:** DT §2.3; AGENTS.md §1.5. **Ukuran:** S

#### KM-A02 Konstanta, kamus, kasus acuan
- **Tujuan:** satu sumber bobot/ambang dan taksonomi; kerangka kasus acuan.
- **Berkas:** `scripts/kemitraan/konst.py`, `public/kemitraan/konst.js`, `scripts/kemitraan/kamus.json`, `tests/kemitraan/fixtures/acuan.json`, `tests/kemitraan/konst.test.mjs`.
- **Antarmuka:** konst berisi semua bobot ALG §3.2, §3.4, §4.3–§4.5, §7, §8, §9; ambang kelas; daftar `BAHAYA` (11), `ASPEK` (A1–A10 + label), `RUMPUN_BAHAYA` (ALG §2.1), `NARASUMBER` (8), `ARAH` (6). `kamus.json`: `{bahaya:{b:[≥8 istilah ID+EN]}, aspek:{A:[≥6]}, henti:[ID+EN ≥150], stem:[akhiran], solusi:[penanda ALG §5]}`. `acuan.json`: kunci per fungsi DT §5.1, isi kasus RU §2.1 A1–A13 (nilai keluaran dihitung tangan dan ditulis dengan alasan di `"catatan"`).
- **Di luar:** implementasi fungsi.
- **Pengerja / pemeriksa:** `kampus` / `validasi-model` (bobot = ALG persis).
- **Model:** sonnet.
- **Dependensi:** –. **Paralel dengan:** A03–A08. **Isolasi:** worktree ya.
- **Selesai bila:** uji membuktikan konst.py dan konst.js identik (parse kedua berkas, bandingkan); jumlah bobot tiap rumus = 1,00; kamus memenuhi batas minimum; uji menolak fixture yang sengaja tak identik.
- **Bukti:** `python3 -I scripts/kemitraan/konst.py --cek`; `node --test tests/kemitraan/konst.test.mjs`.
- **Rujukan:** ALG §2–§9; RU §2.1. **Ukuran:** M

#### KM-A03 Crosswalk kode wilayah `kode.py`
- **Tujuan:** `kode.json` (514 kab IRBI → prov, nama, bps, kemendagri, kunci_nama, pusat).
- **Berkas:** `scripts/kemitraan/kode.py`, `public/data/kemitraan/kode.json`, `public/data/kemitraan/kode_gagal.json`, `scripts/umum/nama_wilayah.py` (baru), `scripts/umum/profil_wilayah.py` (hanya mengimpor `nk`/`ALIAS` dari nama_wilayah; perilaku tetap).
- **Antarmuka:** impor `peta`, `nk`, `ALIAS` PINDAHKAN `nk` dan `ALIAS` (fungsi murni) dari `scripts/umum/profil_wilayah.py` ke `scripts/umum/nama_wilayah.py`; `peta()` TIDAK dipakai (bergantung DIR_SUMBER luar; skrip itu `sys.exit` tanpa argumen). Pencocokan nama di `kode.py` memakai `nk`. Sumber kode: `public/data/wilayah/indeks.json` (IRBI), `public/data/desa_cari.json` (kemendagri, 513 kab), `public/data/neraca_air/kab.json` + `public/data/kejadian/kekeringan-*.json` (bps, sebagian), `public/geo/kabupaten/<prov>.json` (properti `kab` = nama → centroid). `--cek` assert RU §2.2 D2.
- **Di luar:** blok profil.
- **Pengerja / pemeriksa:** `kampus` (kode.py) + `pipa-umum` (nama_wilayah.py, profil_wilayah.py) / `validasi-model`.
- **Model:** sonnet.
- **Dependensi:** –. **Paralel dengan:** A02, A04–A08. **Isolasi:** worktree ya.
- **Selesai bila:** 514 kode; ≥ 500 punya `kemendagri`; 514 punya `pusat`; `kode_gagal.json` berisi tiap null dengan alasan; 3171 = "Kota Administrasi Jakarta Pusat"; deterministik (dua kali jalan, byte sama).
- **Bukti:** `python3 -I scripts/kemitraan/kode.py --cek`.
- **Rujukan:** ALG §1; PD §2; DT ADR-01. **Ukuran:** M

#### KM-A04 Migrasi 0080 dasar
- **Tujuan:** tabel `km_kampus, km_akun, km_sesi, km_anggota, km_perjanjian, km_bpbd_kode, km_jejak, km_pl_kode, km_pengingat` persis DT §3.1, §3.4 (km_pl_kode), ADR-06 (km_pengingat). CHECK ditulis lengkap; CHECK tabel di AKHIR daftar kolom; UNIQUE bersyarat = `CREATE UNIQUE INDEX … WHERE`.
- **Berkas:** `migrations/0080_km_dasar.sql`, `tests/warga/kemitraan_skema.test.mjs` (bagian 0080), `tests/warga/migrasi_beku.json`, `tests/warga/cakupan.json`.
- **Di luar:** rute; migrasi lain.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`, `penulis-gerbang`.
- **Model:** sonnet; pemeriksa haiku.
- **Dependensi:** –. **Paralel dengan:** A05–A08 (nomor berkas berbeda; uji skema satu berkas → gabung berurutan, A04 membuat kerangka berkas uji). **Isolasi:** worktree ya.
- **Selesai bila:** migrasi dua kali tanpa galat; baris RU §3 untuk km_jejak, km_perjanjian, dummy hijau; tiap CHECK punya satu SQL wajib gagal.
- **Bukti:** `node --test tests/warga/kemitraan_skema.test.mjs`; `node --test tests/warga/migrasi_beku.test.mjs`.
- **Rujukan:** DT §3, §3.1; RU §3; KM §2. **Ukuran:** M

#### KM-A05 Migrasi 0081 masalah
- **Tujuan:** `km_masalah` (+trigger alur, indeks unik parsial auto_id), `km_masalah_pakar`, `km_kunjungan`, `km_jawaban`, `km_koreksi` persis DT §3.2.
- **Berkas:** `migrations/0081_km_masalah.sql`, `tests/warga/kemitraan_skema.test.mjs` (bagian 0081), `migrasi_beku.json`, `cakupan.json`.
- **Antarmuka:** daftar transisi trigger = konstanta `ALUR_MASALAH` yang nanti dipakai C03 (tulis juga di komentar migrasi).
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`.
- **Model:** sonnet.
- **Dependensi:** A04 (FK tidak, tapi berkas uji). **Paralel dengan:** A06–A08. **Isolasi:** worktree ya.
- **Selesai bila:** RU §3 baris km_masalah (alur, digabung, auto unik) hijau; `UNIQUE(kunjungan_id, klien_id)` menolak kembar.
- **Bukti:** sama A04.
- **Rujukan:** DT §3.2; ALUR §2. **Ukuran:** M

#### KM-A06 Migrasi 0082 riset dan dana
- **Tujuan:** 9 tabel DT §3.3 dengan trigger `km_proposal_alur`, `km_telaah_beku`, Σbobot rubrik.
- **Berkas:** `migrations/0082_km_riset.sql`, uji skema bagian 0082, `migrasi_beku.json`, `cakupan.json`.
- **Antarmuka:** Σbobot dijaga trigger `BEFORE INSERT/UPDATE` dengan `(SELECT SUM(json_extract(value,'$.bobot')) FROM json_each(NEW.rubrik)) <> 100` → ABORT.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`.
- **Model:** sonnet. **Dependensi:** A04, A05 (FK km_masalah). **Paralel dengan:** A07, A08. **Isolasi:** worktree ya.
- **Selesai bila:** RU §3 baris km_hibah_panggilan, km_proposal, km_telaah hijau; `surat_nomor` unik.
- **Bukti:** sama A04.
- **Rujukan:** DT §3.3; ALUR §3. **Ukuran:** M

#### KM-A07 Migrasi 0083 satgas
- **Tujuan:** 9 tabel DT §3.4 (km_pl_kode sudah di 0080), trigger unsur wakil satgas, indeks unik parsial km_satgas, kolom `km_aktivasi.permintaan_id` (ADR-08).
- **Berkas:** `migrations/0083_km_satgas.sql`, uji skema bagian 0083, `migrasi_beku.json`, `cakupan.json`.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`.
- **Model:** sonnet. **Dependensi:** A04. **Paralel dengan:** A05, A06, A08. **Isolasi:** worktree ya.
- **Selesai bila:** RU §3 baris km_satgas hijau; `km_panggilan` UNIQUE menolak panggilan ganda; `km_aktivasi_meja` FK ke `meja_petugas`.
- **Bukti:** sama A04.
- **Rujukan:** DT §3.4; ALUR §4. **Ukuran:** M

#### KM-A08 Migrasi 0084 talenta
- **Tujuan:** 8 tabel DT §3.5, trigger alur lamaran magang, indeks parsial dampingan aktif.
- **Berkas:** `migrations/0084_km_talenta.sql`, uji skema bagian 0084, `migrasi_beku.json`, `cakupan.json`.
- **Pengerja / pemeriksa:** `warga-api` / `migrasi-idempoten`.
- **Model:** sonnet. **Dependensi:** A04. **Paralel dengan:** A05–A07. **Isolasi:** worktree ya.
- **Selesai bila:** RU §3 baris km_magang_lamar hijau; `desa_kode` liar ditolak; modul > 10 MB ditolak.
- **Bukti:** sama A04.
- **Rujukan:** DT §3.5; ALUR §5. **Ukuran:** M

#### KM-A09 Cangkang rute + gerbang hak + peran staf
- **Tujuan:** `RUTE_KEMITRAAN` terpasang; fungsi gerbang `hakKm(env, req)` mengembalikan `{peran: 'ST'|'PM'|'SA'|'KK'|'AG'|'BP'|'PL'|null, ...konteks}`; halaman cangkang dilayani; 503 rapi bila tabel belum ada.
- **Berkas:** `src/kemitraan.js`, `src/worker.js`, `src/staf.js`, `migrations/0085_staf_peran_kemitraan.sql`, `tests/warga/migrasi_beku.json`, `tests/warga/kemitraan_gerbang.test.mjs`.
- **Antarmuka:** `export async function hakKm(env, req)`; `export const RUTE_KEMITRAAN`; `lindungi()` pola `src/relawan.js`. Urutan pencarian kode: relawan(+km_anggota) → km_bpbd_kode (berlaku, tidak dicabut) → km_pl_kode. `PERAN.kemitraan` + migrasi 0085 (DROP/CREATE trigger peran staf, preseden 0077). Sub-router `ruteKm(metode, jalur)` (ADR-07) + satu cabang di `rute()` worker. Gerbang situs centurisk97.id dilewati untuk awalan `/kemitraan` dan `/api/kemitraan/`; `tolakOrigin` mengenali `sesi_kemitraan`. Halaman DT §4.2 (isi HTML dari A10; sementara cangkang).
- **Di luar:** rute fitur (C03, D01, …).
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Model:** sonnet; guard-api haiku.
- **Dependensi:** A04. **Paralel dengan:** A10, A11. **Isolasi:** worktree ya.
- **Selesai bila:** tiap peran terdeteksi benar; kode dicabut/kedaluwarsa → null; staf tanpa peran kemitraan → bukan ST; staf bisa DIBERI peran `kemitraan`; `/kemitraan` tanpa sesi = layar masuk 200 di host centurisk97.id; pola `:aid` dan `:kab4` cocok, pola liar 404; POST bercookie `sesi_kemitraan` dari origin asing ditolak.
- **Bukti:** `node --test tests/warga/kemitraan_gerbang.test.mjs`; `npm run uji:warga`.
- **Rujukan:** DT §4.1–§4.2; KM §1, §3. **Ukuran:** M

#### KM-A10 Cangkang layar + helper KM
- **Tujuan:** `/kemitraan` tampil dengan kepala, pita, segmen 8 tampilan, layar masuk/galat/muat; helper `window.KM`.
- **Berkas:** `public/inti/kepala.js` (tautan menu Kemitraan), `public/kemitraan.html`, `public/kemitraan.css`, `public/kemitraan/inti.js`, `public/kemitraan/{daerah,masalah,riset,dana,satgas,talenta,kampus,dasbor}.js` (kerangka: tiap berkas mendaftar `KM.tampilan[nama] = {bangun(el), angka()}` dan menampilkan `kosongHtml()`).
- **Antarmuka:** helper DS §4 disalin dari `public/akademisi.js` dengan komentar asal baris, KECUALI `ikon()`: versi KM memakai kelas `.km-w-<kunci>` (DS §2), bukan atribut `style=`; `KM.ambil(jalur)`; `KM.RUMPUN`; pengalih `?tampil=` + localStorage `km-tampil`; tampilan yang tidak berhak disembunyikan sesuai `/api/kemitraan/saya` atau sesi.
- **Di luar:** isi tampilan.
- **Pengerja / pemeriksa:** `kampus` / `inp-reviewer`, `selera-angka`.
- **Model:** sonnet; pemeriksa haiku.
- **Dependensi:** A09 (rute halaman). **Paralel dengan:** A11, B01. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 L7, L8, L9 hijau untuk cangkang; tidak ada skrip/gaya inline.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs` (bagian cangkang).
- **Rujukan:** DS §1–§4, §8. **Ukuran:** M

#### KM-A11 Gerbang teks + registri cakupan
- **Tujuan:** gerbang RU §2.8 dan registri `tests/kemitraan/cakupan.json` (diuji, dikecualikan+alasan, antre; antre hanya boleh menyusut).
- **Berkas:** `tests/kemitraan/gerbang-kemitraan.test.mjs`, `tests/kemitraan/gerbang-cakupan.test.mjs`, `tests/kemitraan/cakupan.json`, `tests/kemitraan/fixtures/langgar/*`, `package.json` (skrip `uji:kemitraan` RU §1).
- **Antarmuka:** penemuan otomatis: fungsi ekspor `public/kemitraan/hitung.js`, `src/kemitraan_hitung.js`, skrip `scripts/kemitraan/*.py`, tampilan `public/kemitraan/*.js` → wajib tercatat.
- **Pengerja / pemeriksa:** `penulis-gerbang` / `higiene-repo`.
- **Model:** sonnet. **Dependensi:** A02. **Paralel dengan:** A09, A10. **Isolasi:** worktree ya.
- **Selesai bila:** tiap aturan punya fixture pelanggaran yang membuat uji merah; repo saat ini hijau.
- **Bukti:** `node --test tests/kemitraan/gerbang-kemitraan.test.mjs tests/kemitraan/gerbang-cakupan.test.mjs`.
- **Rujukan:** RU §2.8, §1; pola `tests/sippa/gerbang-*.test.mjs`. **Ukuran:** S

### 3.B Profil daerah dan buku

#### KM-B01 Profil daerah: blok umum
- **Tujuan:** `profil_daerah.py` membangun blok `wilayah, penduduk, sosek, irbi, inarisk_kec, kejadian, fasilitas, kapasitas, riwayat_luar, sumber` untuk 514 kab.
- **Berkas:** `scripts/kemitraan/profil_daerah.py`, `public/data/kemitraan/daerah/*.json`, `tests/kemitraan/fixtures/profil_mini/` (3 kab mini).
- **Antarmuka:** skema PD §1 v1; tiap blok `{…, sumber, tanggal, yakin}`; peta sumber PD §2; titik→kab ray casting stdlib; `--cek` = RU §2.2 D1–D5, D7; `--kab 6211` untuk satu kab.
- **Di luar:** blok per bahaya (B02), masalah (B03).
- **Pengerja / pemeriksa:** `kampus` / `selera-angka` (format), `validasi-model` (tidak ada angka karangan).
- **Model:** sonnet.
- **Dependensi:** A03. **Paralel dengan:** A10, C01, C06. **Isolasi:** worktree ya.
- **Selesai bila:** 514 berkas valid; null bukan nol; ≤ 60 KB; deterministik.
- **Bukti:** `python3 -I scripts/kemitraan/profil_daerah.py --cek`.
- **Rujukan:** PD §1, §2; ALG §1. **Ukuran:** L

#### KM-B02 Profil daerah: blok per bahaya + model
- **Tujuan:** blok `gempa, karhutla, kekeringan, gunungapi, pesisir, udara, neraca_air, model` + `kejadian.tren` (Theil–Sen) + `siluet` (path SVG ≤ 1 KB, penyederhanaan Douglas–Peucker toleransi tetap).
- **Berkas:** `scripts/kemitraan/profil_daerah.py` (fungsi blok baru), `scripts/kemitraan/geo.py` (ray casting, D-P, haversine, centroid; murni + `--cek`).
- **Antarmuka:** `model.uji` membaca `public/data/gerbang_model.json`, `public/banjir/data/risiko_ujibalik.json`, `kekeringan_ujibalik.json`: nilai `lolos|gagal|belum` per model.
- **Pengerja / pemeriksa:** `kampus` / `validasi-model`.
- **Model:** sonnet. **Dependensi:** B01. **Paralel dengan:** B07, C02. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.2 D6; gunung dalam 50 km terdeteksi untuk kab sekitar Merapi; pesisir null di luar 5 situs.
- **Bukti:** `python3 -I scripts/kemitraan/geo.py --cek`; `python3 -I scripts/kemitraan/profil_daerah.py --cek`.
- **Rujukan:** PD §1–§2; ALG §3.1. **Ukuran:** L

#### KM-B03 Masalah otomatis `masalah.py`
- **Tujuan:** isi blok `masalah` tiap kab: komponen ALG §3.1 (persentil nasional), `skor_auto`, kelas, aturan ALG §3.3, bukti angka asli.
- **Berkas:** `scripts/kemitraan/masalah.py` (dipanggil `profil_daerah.py`), `tests/kemitraan/fixtures/acuan.json` (lengkapi A1–A4).
- **Antarmuka:** `auto_id = "auto-<kab4>-<bahaya>-<aspek>"`; judul tanpa angka; `komponen_n`.
- **Pengerja / pemeriksa:** `kampus` / `validasi-model`.
- **Model:** sonnet. **Dependensi:** B02, A02. **Paralel dengan:** B04. **Isolasi:** worktree ya.
- **Selesai bila:** kasus acuan hijau; < 4 komponen → tanpa masalah; tiap masalah ≥ 2 bukti bersumber.
- **Bukti:** `python3 -I scripts/kemitraan/masalah.py --cek`.
- **Rujukan:** ALG §3; PD §1. **Ukuran:** M

#### KM-B04 Ringkas + profil provinsi
- **Tujuan:** `ringkas.json` (514 baris: kode, nama, prov, kelas IRBI 0/1, 3 bahaya teratas, n masalah per kelas, kejadian 2015–2025, kapasitas n/5; TANPA siluet) dan `prov/<NN>.json` (PD §4).
- **Berkas:** `scripts/kemitraan/profil_daerah.py` (fungsi `ringkas`, `prov`), keluaran.
- **Pengerja / pemeriksa:** `kampus` / `selera-angka`.
- **Model:** sonnet. **Dependensi:** B03. **Isolasi:** worktree ya.
- **Selesai bila:** ringkas ≤ 120 KB; jumlah kab per prov = jumlah di `kode.json`.
- **Bukti:** `python3 -I scripts/kemitraan/profil_daerah.py --cek`.
- **Rujukan:** PD §4; DT §8. **Ukuran:** S

#### KM-B05 Workflow `kemitraan.yml`
- **Tujuan:** jadwal harian DT §7.1.
- **Berkas:** `.github/workflows/kemitraan.yml`.
- **Antarmuka:** cron `30 2 * * *`, `concurrency: group: data` (antre dengan pipeline lain), `workflow_dispatch`, langkah DT §7.1, commit pola `data.yml`.
- **Pengerja / pemeriksa:** `mekanik-mesin` / `higiene-repo`.
- **Model:** sonnet. **Dependensi:** B04, C02. **Isolasi:** tidak (berkas workflow, commit lewat GitHub Desktop bila token tanpa scope workflow).
- **Selesai bila:** `workflow_dispatch` di cabang uji selesai hijau; tidak ada commit bila data sama.
- **Bukti:** tautan run hijau dicatat di tiket.
- **Rujukan:** DT §7.1. **Ukuran:** S

#### KM-B06 Tampilan Daerah + lembar profil
- **Tujuan:** tampilan `daerah`: saring (cari, prov, kelas IRBI chip, bahaya chip, toggle "Ada masalah P1"), grid kartu `.km-daerah`, paginasi 24; lembar `.ak-sheet` profil: kepala navy (nama, prov, pil IRBI, ikon Buku, metrik), tab bab PD §3 bab 1–7, 9.
- **Berkas:** `public/kemitraan/daerah.js`, `public/kemitraan.css` (§5.1), `public/kemitraan/hitung.js` (format bila perlu).
- **Antarmuka:** data `ringkas.json` lalu `daerah/<kab4>.json` saat lembar dibuka (memo); `?kab=` membuka lembar langsung; BP hanya kabnya (lembar langsung).
- **Pengerja / pemeriksa:** `kampus` / `selera-angka`, `inp-reviewer`.
- **Model:** sonnet. **Dependensi:** A10, B04. **Paralel dengan:** B07, C04. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 L1, L2.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-M1; DS §3, §5.1; PD §3. **Ukuran:** L

#### KM-B07 Komponen peta SVG `.km-peta-wil`
- **Tujuan:** fungsi `KM.peta(el, {geo, kelas, titik[], arsir[]})` menggambar kab/kec/prov SVG (pola risiko.js), dipakai lembar daerah, buku, talenta, aktivasi.
- **Berkas:** `public/kemitraan/peta.js`, `public/kemitraan.css` (§5.7), `tests/kemitraan/peta.test.mjs` (proyeksi murni).
- **Pengerja / pemeriksa:** `kampus` / `inp-reviewer`.
- **Model:** sonnet. **Dependensi:** A10. **Paralel dengan:** B06. **Isolasi:** worktree ya.
- **Selesai bila:** proyeksi equirectangular teruji (titik pojok bbox → sudut viewBox); evenodd untuk cincin; render prov 62 < 50 ms.
- **Bukti:** `node --test tests/kemitraan/peta.test.mjs`.
- **Rujukan:** DS §5.7; ilmu ruang-bnpb kasus 19 Okt (SVG sendiri). **Ukuran:** M

#### KM-B08 Buku profil daerah
- **Tujuan:** `/kemitraan/buku?kab=` dan `?prov=` halaman cetak A4 lengkap PD §3, tombol Cetak.
- **Berkas:** `public/kemitraan/buku.html`, `public/kemitraan/buku.js`, `public/kemitraan/buku.css`.
- **Antarmuka:** grafik garis/batang SVG sendiri (salin `grafik()` dari helper), peta `KM.peta`; bab 8 memanggil `/api/kemitraan/daerah/:kab4/pakar` (tampil hanya bila 200); bab 9 memakai generator C02.
- **Pengerja / pemeriksa:** `kampus` / `selera-angka`.
- **Model:** sonnet. **Dependensi:** B06, B07, C02. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 L3; render ≤ 3 dtk; PDF uji 3 kab (6211, 3171, 7271) disimpan sebagai artefak uji.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs` (bagian buku, `Page.printToPDF`).
- **Rujukan:** PRD F-M2; PD §3; DS §5.10. **Ukuran:** L

### 3.C Masalah, pakar, pertanyaan, pendataan

#### KM-C01 Bank templat pertanyaan
- **Tujuan:** `pertanyaan.json` ≥ 290 templat ALG §6.1, bahasa lugas, sapaan netral, bercelah slot.
- **Berkas:** `scripts/kemitraan/pertanyaan.json`, `scripts/kemitraan/pertanyaan.py` (`--cek`: skema, jumlah minimum per kelompok, slot hanya dari daftar slot sah, `syarat` terurai, id unik; salin ke `public/data/kemitraan/`).
- **Antarmuka:** slot sah: `wilayah, prov, bahaya, n_kejadian, periode, tren_kata, kec_teratas, dokumen_kurang, jiwa_rentan, skor_irbi, kelas_irbi, dampak_12bln, kampus_terdekat, model_status`.
- **Pengerja / pemeriksa:** `kampus` / sesi induk membaca sampel 30 butir (mutu bahasa, arah).
- **Model:** sonnet. **Dependensi:** A02. **Paralel dengan:** B01, C06. **Isolasi:** worktree ya.
- **Selesai bila:** batas minimum terpenuhi; tiap bahaya × arah ≥ 1 templat; tiap narasumber × arah ≥ 1.
- **Bukti:** `python3 -I scripts/kemitraan/pertanyaan.py --cek`.
- **Rujukan:** ALG §6.1; PRD F-M6. **Ukuran:** L

#### KM-C02 Generator pertanyaan + halaman panduan
- **Tujuan:** `susun_panduan` (Py untuk buku ringkas pipeline dan JS untuk layar) + `/kemitraan/panduan`.
- **Berkas:** `public/kemitraan/hitung.js` (`syarat`, `susunPanduan`), `scripts/kemitraan/pertanyaan.py` (`susun_panduan`), `public/kemitraan/panduan.{html,js}`, `tests/kemitraan/hitung.test.mjs`, `tests/kemitraan/paritas.test.mjs`.
- **Antarmuka:** parser `syarat` tanpa `eval`/`Function` (ALG §6.1); keluaran `{narasumber:{arah:[{id,teks,sub[]}]}, data_diminta[], riset[]}`.
- **Pengerja / pemeriksa:** `kampus` / `security-reviewer` (parser), `selera-angka`.
- **Model:** sonnet. **Dependensi:** C01, B03. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.1 A9, A10; RU §2.3 L5; paritas Py=JS untuk 20 kombinasi.
- **Bukti:** `node --test tests/kemitraan/hitung.test.mjs tests/kemitraan/paritas.test.mjs`.
- **Rujukan:** ALG §6; DS §5.5. **Ukuran:** M

#### KM-C03 Rute masalah, kunjungan, jawaban, koreksi
- **Tujuan:** API DT §4.3 baris masalah/kunjungan/jawaban/koreksi + `skor_bpbd` + Jaccard saran gabung.
- **Berkas:** `src/kemitraan_masalah.js`, `src/kemitraan_hitung.js`, `src/kemitraan.js` (daftar rute), `tests/warga/kemitraan_masalah.test.mjs`.
- **Antarmuka:** `ALUR_MASALAH` = trigger 0081; tulis `km_jejak` tiap ubah; jawaban idempoten; konfirmasi → `tervalidasi` (ALUR §2.5.3); `masalah/ambil` membekukan bukti dari `public/data/kemitraan/daerah/<kab4>.json` (dibaca lewat `env.ASSETS`).
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`.
- **Model:** sonnet. **Dependensi:** A05, A09. **Paralel dengan:** D01, D05. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.4 baris masalah; E3 sebagian (tanpa layar).
- **Bukti:** `node --test tests/warga/kemitraan_masalah.test.mjs`.
- **Rujukan:** DT §3.2, §4.3; ALUR §2; KM §1. **Ukuran:** L

#### KM-C04 Tampilan Masalah
- **Tujuan:** tampilan `masalah`: saring (kab, prov, bahaya, aspek, kelas, status, sumber), kartu `.km-masalah`, lembar masalah: ringkasan + bukti, tab Nilai (ST: U,C,R,J + Validasi/Gabungkan/Tolak), tab Pakar (C11), tab Pertanyaan (C02), tab Donor (E06), tab Jejak; tombol Ajukan masalah (ST/BP) dengan saran kategori.
- **Berkas:** `public/kemitraan/masalah.js`, `public/kemitraan.css` (§5.2, §5.6).
- **Pengerja / pemeriksa:** `kampus` / `selera-angka`, `inp-reviewer`.
- **Model:** sonnet. **Dependensi:** C03, B06. **Isolasi:** worktree ya.
- **Selesai bila:** alur ALUR §2.3–§2.4 bisa dilakukan di peramban uji; konsol bersih.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-M3, F-M4; DS §5.2. **Ukuran:** L

#### KM-C05 Formulir pendataan luring (halaman saya BP)
- **Tujuan:** BP/tim di `/kemitraan/saya`: profil kab, ajukan masalah, kunjungan aktif → pertanyaan satu per satu (DS §5.5 mode isi), koreksi angka, foto; antrean luring.
- **Berkas:** `public/kemitraan/saya.html`, `public/kemitraan/saya.js` (bagian BP), pakai `public/bnpb/antre.js`.
- **Pengerja / pemeriksa:** `kampus` / `inp-reviewer`.
- **Model:** sonnet. **Dependensi:** C03, C02. **Paralel dengan:** D03 (berkas sama → urutkan: C05 dulu membuat kerangka saya.js dengan cabang per jenis). **Isolasi:** worktree ya.
- **Selesai bila:** uji layar: matikan jaringan → isi 3 jawaban → nyalakan → terkirim 1 kali; fragmen `#k=` hilang.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-M7; ALUR §2.5. **Ukuran:** M

#### KM-C06 Korpus OpenAlex `korpus.py`
- **Tujuan:** ≤ 25 karya per pakar (judul, abstrak dari inverted index, tahun, doi, terbitan, sitasi, topik) → R2 `kemitraan/korpus/<id%64>.json`; cicil + lanjut.
- **Berkas:** `scripts/kemitraan/korpus.py`, `tests/kemitraan/fixtures/openalex/*.json`.
- **Antarmuka:** `--induk <berkas>`, `--keluar <dir>` (lokal) atau `--r2` (wrangler); laju ≤ 8 req/dtk, coba ulang 4× (eksponensial), User-Agent jujur + mailto; `--cek` dengan fixture (tanpa jaringan): pembalik inverted index benar.
- **Pengerja / pemeriksa:** `kampus` / `scraper-antibot` (sopan, tahan putus).
- **Model:** sonnet. **Dependensi:** –. **Paralel dengan:** B01, C01. **Isolasi:** worktree ya.
- **Selesai bila:** `--cek` hijau; jalan nyata 200 pakar ≤ 2 menit tanpa 429.
- **Bukti:** `python3 -I scripts/kemitraan/korpus.py --cek`.
- **Rujukan:** ALG §4.1; DT §7.2. **Ukuran:** M

#### KM-C07 Indeks BM25 + cocok pakar + solusi
- **Tujuan:** `indeks_bm25.py` (per bahaya, DT §5.2 format) dan `cocok_pakar.py` (top-10 per masalah otomatis + 3 paper + 1–2 kalimat solusi) → R2 `kemitraan/cocok/<kab4>.json`.
- **Berkas:** `scripts/kemitraan/indeks_bm25.py`, `scripts/kemitraan/cocok_pakar.py`, `scripts/kemitraan/teks.py` (token, stem, kalimat, solusi; murni), `tests/kemitraan/fixtures/acuan.json` (A5–A8).
- **Pengerja / pemeriksa:** `kampus` / `validasi-model`.
- **Model:** sonnet. **Dependensi:** C06, B03, A02. **Isolasi:** worktree ya.
- **Selesai bila:** kasus acuan hijau; tidak ada data pakar ditulis ke `public/`; satu kab ≤ 2 dtk.
- **Bukti:** `python3 -I scripts/kemitraan/teks.py --cek`; `python3 -I scripts/kemitraan/cocok_pakar.py --cek`.
- **Rujukan:** ALG §4–§5. **Ukuran:** L

#### KM-C08 Pakar di worker + ekspor pipeline
- **Tujuan:** `GET /api/kemitraan/daerah/:kab4/pakar`, hitung ringkas DT §5.2, ekspor antrean, rekam, kapasitas DT §5.3.
- **Berkas:** `src/kemitraan_masalah.js`, `src/kemitraan_hitung.js` (bm25, skor_pakar, ragam), `tests/warga/kemitraan_pakar.test.mjs`, `tests/kemitraan/paritas.test.mjs`. `src/akademisi.js` TIDAK disentuh; `induk.json` tidak pernah dimuat worker.
- **Antarmuka:** kontak pakar hanya dalam jawaban ST/PM (KM §1), dari R2 `akademisi/kontak.json` untuk 10 id hasil saja; penjaga CPU = anggaran operasi `KM_MAKS_POSTING` (DT §5.2); endpoint ekspor `rekam`/`kapasitas` DT §5.3.
- **Pengerja / pemeriksa:** `warga-api` / `security-reviewer`, `validasi-model`.
- **Model:** sonnet. **Dependensi:** C03, C07. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.4 baris pakar; paritas skor JS=Py; BP tidak menerima email.
- **Bukti:** `node --test tests/warga/kemitraan_pakar.test.mjs tests/kemitraan/paritas.test.mjs`.
- **Rujukan:** DT §5.2–§5.3; ALG §4.6; KM §1. **Ukuran:** M

#### KM-C09 Label relevansi 60 masalah [manusia]
- **Tujuan:** dua staf menilai 0/1/2 untuk gabungan 15 pakar per masalah (60 masalah, ALG §11), buta sistem.
- **Berkas:** `data/kajian-bnpb/kampus/label/cocok_<penilai>.csv` (dibuat lembar kerja oleh `uji_cocok.py --siapkan`).
- **Dependensi:** C10 tahap (a) `--siapkan`. **Ukuran:** M (manusia ± 6 jam/orang).
- **Selesai bila:** dua berkas lengkap 900 baris tiap penilai.

#### KM-C10 Uji relevansi `uji_cocok.py`
- **Tujuan:** dua tahap, dua sesi: (a) `--siapkan` lembar buta (urut acak berbenih) SEBELUM C09; (b) setelah C09, nDCG@10 + κ → `uji_cocok.json`.
- **Berkas:** `scripts/kemitraan/uji_cocok.py`, `public/data/kemitraan/uji_cocok.json`.
- **Pengerja / pemeriksa:** `kampus` / `validasi-model`.
- **Model:** sonnet. **Dependensi:** (a) C07; (b) C09. **Isolasi:** worktree ya.
- **Selesai bila:** syarat RU §2.9 dibekukan di berkas sebelum label dibaca (hash syarat dicatat); keluaran deterministik.
- **Bukti:** `python3 -I scripts/kemitraan/uji_cocok.py --cek`.
- **Rujukan:** ALG §11; RU §2.9. **Ukuran:** S

#### KM-C11 Kartu pakar + daftar pendek di masalah
- **Tujuan:** tab Pakar lembar masalah: 10 kartu `.ak-orang` + `.km-pecah` + 3 paper + `.km-kutip`; daftar pendek `km-dp` + ekspor; Hubungi (wa.me/mailto) mencatat status `dihubungi`; ubah status pakar.
- **Berkas:** `public/kemitraan/masalah.js` (bagian pakar), `public/kemitraan.css` (§5.3, §5.4).
- **Pengerja / pemeriksa:** `kampus` / `selera-angka`, `inp-reviewer`.
- **Model:** sonnet. **Dependensi:** C04, C08. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 L4.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-M5; DS §4, §5.3–§5.4; ALUR §2.6. **Ukuran:** M

#### KM-C12 Workflow `kemitraan-pakar.yml`
- **Tujuan:** jadwal bulanan DT §7.2 + `cocok_baru.py` harian (masalah antre).
- **Berkas:** `.github/workflows/kemitraan-pakar.yml`, `scripts/kemitraan/cocok_baru.py`.
- **Pengerja / pemeriksa:** `mekanik-mesin` / `higiene-repo`.
- **Model:** sonnet. **Dependensi:** C07, C08. **Isolasi:** tidak.
- **Selesai bila:** dispatch `--dry-run` hijau; secret disebut dalam `env:` saja, tidak di-echo.
- **Bukti:** tautan run hijau.
- **Rujukan:** DT §7.2. **Ukuran:** S

### 3.D Pintu kampus

#### KM-D01 Rute daftar, masuk, atur sandi, kode anggota
- **Tujuan:** `POST daftar/kampus`, `daftar/anggota`, `masuk`, `atur-sandi`, `keluar`, `GET saya`, `POST kampus/:id/anggota/:rid` (setujui/tolak/kode).
- **Berkas:** `src/kemitraan_akun.js`, `src/kemitraan.js`, `tests/warga/kemitraan_akun.test.mjs`.
- **Antarmuka:** pakai ulang `cekInstitusi`, `sisipInstitusi` (`src/relawan.js`), `hashSandi` (`src/pendataan.js:22`), `kodeBaru` (`src/bnpb.js:23`); anggota → `relawan` jalur kampus + `km_anggota`; jawaban duplikat identik; Turnstile bila sitekey; surat tugas PDF ≤ 2 MB magic `%PDF`.
- **Pengerja / pemeriksa:** `warga-api` / `security-reviewer`, `guard-api`.
- **Model:** sonnet. **Dependensi:** A04, A09. **Paralel dengan:** C03, D05. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.4 baris daftar dan anggota; RU §2.5 E1 tanpa layar; kunci 15 menit setelah 5 gagal.
- **Bukti:** `node --test tests/warga/kemitraan_akun.test.mjs`.
- **Rujukan:** PRD F-D2, F-D3; ALUR §1.1–§1.2; DT §6.1–§6.2; KM §2–§3. **Ukuran:** L

#### KM-D02 Halaman daftar + masuk
- **Tujuan:** `/kemitraan/daftar` (pilih Kampus/Anggota, form, setuju PDP teks KM §2) dan `/kemitraan/masuk` (masuk, atur sandi `?atur=`).
- **Berkas:** `public/kemitraan/daftar.{html,js}`, `public/kemitraan/masuk.{html,js}`.
- **Antarmuka:** gaya DS (form pakai input 48 px, `.ak-tbl`); dropdown kampus `htmlPilih`; tanpa skrip inline; Turnstile lewat `public/bnpb/turnstile.js`.
- **Pengerja / pemeriksa:** `kampus` / `selera-angka`.
- **Model:** sonnet. **Dependensi:** D01, A10. **Isolasi:** worktree ya.
- **Selesai bila:** uji layar daftar anggota → pesan sukses; 390 px tanpa gulir mendatar.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-D2; DS §7. **Ukuran:** M

#### KM-D03 Halaman saya (anggota)
- **Tujuan:** cabang AG di `saya.js`: profil (unsur, prodi, keahlian, bendera mentor), cabut diri (PDP), daftar tugas, jam, sertifikat, lamaran magang (G01), kartu panggilan (F06).
- **Berkas:** `public/kemitraan/saya.js` (bagian AG), `public/kemitraan.css`.
- **Pengerja / pemeriksa:** `kampus` / `inp-reviewer`.
- **Model:** sonnet. **Dependensi:** D01, C05 (kerangka). **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 L6.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-D3. **Ukuran:** M

#### KM-D04 Tampilan Kampus + perjanjian
- **Tujuan:** tampilan `kampus`: daftar kampus (filter status/peran/prov), lembar kampus (pola `profilKampus` /akademisi: kepala, bar pakar per rumpun dari `/api/akademisi/kampus`+induk untuk ST, pusat studi, fasilitas, satgas, desa, dampingan, MoU + status, skor keaktifan, isian `mk_dibuka`/`renkon_ada`), antrean menunggu (ST setujui/tolak), anggota menunggu (KK), tambah perjanjian (PDF).
- **Berkas:** `public/kemitraan/kampus.js`.
- **Pengerja / pemeriksa:** `kampus` / `selera-angka`, `inp-reviewer`.
- **Model:** sonnet. **Dependensi:** D05, A10. **Isolasi:** worktree ya.
- **Selesai bila:** alur ALUR §1.1 langkah 4–5 dan §1.3 bisa di peramban uji.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-D1, F-D4; DS §4. **Ukuran:** M

#### KM-D05 Rute kampus, perjanjian, kode BPBD
- **Tujuan:** `GET/POST kampus[/:id]` (setujui/tolak/profil), `perjanjian` (multipart R2), `bpbd-kode`.
- **Berkas:** `src/kemitraan_akun.js`, `tests/warga/kemitraan_kampus.test.mjs`.
- **Antarmuka:** `statusPerjanjian` di `kemitraan_hitung.js` (pola `statusMou`); R2 `kemitraan/perjanjian/<id>.pdf`; tautan atur sandi dibuat saat setujui.
- **Pengerja / pemeriksa:** `warga-api` / `security-reviewer`, `guard-api`.
- **Model:** sonnet. **Dependensi:** A04, A09. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.4 baris perjanjian; KK tidak dapat membaca kampus lain.
- **Bukti:** `node --test tests/warga/kemitraan_kampus.test.mjs`.
- **Rujukan:** ALUR §1.3–§1.4; DT §4.3. **Ukuran:** M

#### KM-D06 Skor keaktifan kampus
- **Tujuan:** `aktif_kampus` ALG §7 dihitung saat lembar kampus/dasbor dibaca (kueri agregat satu kali per permintaan, cache 10 menit di isolate).
- **Berkas:** `src/kemitraan_hitung.js`, `src/kemitraan_akun.js`, `tests/warga/kemitraan_kampus.test.mjs`.
- **Pengerja / pemeriksa:** `warga-api` / `validasi-model`.
- **Model:** sonnet. **Dependensi:** D05, E04, F02, G01, G02 (komponen boleh 0 bila tabel kosong). **Isolasi:** worktree ya.
- **Selesai bila:** kasus acuan ALG §7; kampus tanpa aktivitas 365 hari → `pasif`.
- **Bukti:** `node --test tests/warga/kemitraan_kampus.test.mjs tests/kemitraan/paritas.test.mjs`.
- **Rujukan:** ALG §7; PRD F-D5. **Ukuran:** S

### 3.E Riset dan dana

#### KM-E01 Rute donor + panggilan donor
- **Berkas:** `src/kemitraan_riset.js`, `tests/warga/kemitraan_riset.test.mjs`.
- **Tujuan:** CRUD `km_donor`, `km_panggilan_donor` (ST tulis; PM, KK baca); `cocok_donor` di jawaban lembar masalah/donor.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`. **Model:** sonnet.
- **Dependensi:** A06, A09. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.1 A11; KK tulis → 403.
- **Bukti:** `node --test tests/warga/kemitraan_riset.test.mjs`.
- **Rujukan:** PRD F-R2–F-R3; ALG §8. **Ukuran:** S

#### KM-E02 Data donor awal
- **Tujuan:** berkas benih 16 donor dari lampiran A2 paparan (nama, status siap/terbatas/belum, cocok untuk → bahaya+aspek, catatan) + skrip impor lewat API (ST token di lokal, bukan migrasi).
- **Berkas:** `data/kajian-bnpb/kampus/benih/donor.json`, `scripts/kemitraan/impor_benih.py`.
- **Antarmuka:** pemetaan "cocok untuk" → bahaya/aspek ditulis eksplisit per baris; tautan resmi https.
- **Pengerja / pemeriksa:** `kampus` / sesi induk (memeriksa 16 baris terhadap slide 34).
- **Model:** sonnet. **Dependensi:** E01. **Isolasi:** worktree ya.
- **Selesai bila:** `impor_benih.py --cek` (skema) hijau; tidak ada nilai dana karangan (kosong bila tak diketahui).
- **Bukti:** `python3 -I scripts/kemitraan/impor_benih.py --cek`.
- **Rujukan:** KP 14; PRD F-R2. **Ukuran:** S

#### KM-E03 Rute proposal, konsorsium, surat
- **Tujuan:** API proposal (alur trigger), konsorsium, surat dukungan: nomor `KM/SD/<tahun>/<urut 3 digit>` atomik (`INSERT … SELECT MAX+1` dalam batch), draf DOCX dari templat (`data/kajian-bnpb/kampus/templat/surat-dukungan.docx` diisi di klien lewat docx@8.5 seperti /akademisi), berkas R2.
- **Berkas:** `src/kemitraan_riset.js`, `public/kemitraan/surat.js`, `data/kajian-bnpb/kampus/templat/surat-dukungan.md` (isi teks templat; disetujui pemilik sebelum dipakai), `tests/warga/kemitraan_riset.test.mjs`.
- **Pengerja / pemeriksa:** `warga-api` / `security-reviewer`. **Model:** sonnet.
- **Dependensi:** A06, E01. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.5 E8 sampai `lolos` + dana pendamping tersimpan (angka dasbor diuji di H01); nomor surat unik di bawah konkurensi (2 permintaan serentak).
- **Bukti:** `node --test tests/warga/kemitraan_riset.test.mjs`.
- **Rujukan:** PRD F-R4–F-R5; ALUR §3.3; KP T-G. **Ukuran:** M

#### KM-E04 Rute hibah + telaah
- **Tujuan:** panggilan, ajuan KK (kuota, tenggat), penugasan penelaah (kode PL, tolak sekampus), telaah (beku setelah kirim), nilai + bendera selisih, umumkan, lolos → `mitra_riset` + `riset_usulan` `disetujui`.
- **Berkas:** `src/kemitraan_riset.js`, `tests/warga/kemitraan_hibah.test.mjs`.
- **Antarmuka:** pemetaan kolom ke `mitra_riset`/`riset_usulan` persis DT §10 (nomor PKS/SK WAJIB diisi ST saat Umumkan; metode ≤ 800); pakai fungsi sisip `src/riset.js` bila ada (ekspor tanpa ubah perilaku).
- **Pengerja / pemeriksa:** `warga-api` / `security-reviewer`, `guard-api`. **Model:** sonnet.
- **Dependensi:** A06, A07 (km_pl_kode), A09. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.5 E4; RU §2.4 baris telaah.
- **Bukti:** `node --test tests/warga/kemitraan_hibah.test.mjs`; `node --test tests/warga/riset.test.mjs` (tidak regresi).
- **Rujukan:** PRD F-R6; ALUR §3.4. **Ukuran:** L

#### KM-E05 Rute agenda susun + inovasi
- **Tujuan:** `agenda/susun` (kelompok masalah tervalidasi P1/P2 per kategori + Jaccard, pertanyaan riset, model gagal dari `gerbang_model.json`) → draf; `agenda/terbit` → `riset_agenda` + `km_agenda_sumber`; CRUD inovasi + verifikasi TKT.
- **Berkas:** `src/kemitraan_riset.js`, `tests/warga/kemitraan_riset.test.mjs`.
- **Pengerja / pemeriksa:** `warga-api` / `validasi-model`. **Model:** sonnet.
- **Dependensi:** C03, E04. **Isolasi:** worktree ya.
- **Selesai bila:** dua masalah kategori sama + Jaccard ≥ 0,5 jadi satu topik; agenda terbit tampil di `/api/riset/ringkas` lama.
- **Bukti:** `node --test tests/warga/kemitraan_riset.test.mjs`.
- **Rujukan:** PRD F-R1, F-R7; ALUR §3.1, §3.5. **Ukuran:** M

#### KM-E06 Tampilan Dana
- **Tujuan:** tampilan `dana`: tab Donor (kartu, kesiapan, bahaya), Panggilan (kalender 12 bulan + daftar tenggat), Proposal (kartu status `.km-alur`), lembar proposal (konsorsium matriks, surat, berkas), tab Donor cocok di lembar masalah.
- **Berkas:** `public/kemitraan/dana.js`.
- **Pengerja / pemeriksa:** `kampus` / `selera-angka`, `inp-reviewer`. **Model:** sonnet.
- **Dependensi:** E01, E03, A10. **Isolasi:** worktree ya.
- **Selesai bila:** alur ALUR §3.2–§3.3 di peramban uji; Rp format DS §7.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-R2–F-R5. **Ukuran:** M

#### KM-E07 Tampilan Riset + layar penelaah
- **Tujuan:** tampilan `riset`: Agenda (susun, sunting, terbit), Hibah (panggilan, proposal, penugasan penelaah, peringkat + bendera, umumkan), Inovasi (TKT tangga 1–9, uji, e-Katalog); cabang PL di `saya.js` (proposal ditugaskan + rubrik + kirim).
- **Berkas:** `public/kemitraan/riset.js`, `public/kemitraan/saya.js` (bagian PL).
- **Pengerja / pemeriksa:** `kampus` / `selera-angka`, `inp-reviewer`. **Model:** sonnet.
- **Dependensi:** E04, E05, D03. **Isolasi:** worktree ya.
- **Selesai bila:** ALUR §3.1, §3.4, §3.5 di peramban uji.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-R1, F-R6, F-R7. **Ukuran:** L

### 3.F Satgas Kampus

#### KM-F01 Rute satgas + piket
- **Tujuan:** CRUD satgas (KK miliknya), anggota satgas, status siap terhitung (ALUR §4.1.2); piket mingguan (ST) + kode PL pakar + jawab.
- **Berkas:** `src/kemitraan_satgas.js`, `tests/warga/kemitraan_satgas.test.mjs`.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`. **Model:** sonnet.
- **Dependensi:** A07, D01. **Isolasi:** worktree ya.
- **Selesai bila:** satgas tanpa wakil alumni → `belum_lengkap`; piket ganda ditolak; pakar menjawab hanya piketnya.
- **Bukti:** `node --test tests/warga/kemitraan_satgas.test.mjs`.
- **Rujukan:** PRD F-S1, F-S3; ALUR §4.1–§4.2. **Ukuran:** M

#### KM-F02 Rute aktivasi, panggilan, tugaskan, kaji cepat, tutup
- **Tujuan:** buat aktivasi (dari `sumber` peringatan/DIBI/manual) + calon (`urut_panggil` ALG §9; pakar piket di atas; satgas, fasilitas kampus, kontak mitra `kontak_pemangku` kategori tni/polri/bpbd/lainnya di prov/kab); panggil → `wa_url`; jawab; tugaskan → `relawan_penugasan`; tim kaji cepat → `meja_petugas` (meja `["kaji_cepat"]`) + `km_aktivasi_meja`; laporan harian; tutup; cron bersih mencabut kode meja.
- **Berkas:** `src/kemitraan_satgas.js`, `src/kemitraan_hitung.js`, `src/worker.js` (langkah bersih menit 17), `tests/warga/kemitraan_satgas.test.mjs`.
- **Antarmuka:** daftar kejadian sumber: `GET /api/kemitraan/aktivasi/sumber` membaca berkas peringatan publik yang sudah ada (karhutla level, banjir `status.json`, gempa terbaru, gunungapi status, `dibi_kejadian.json` 7 hari) lewat `env.ASSETS`.
- **Pengerja / pemeriksa:** `warga-api` / `security-reviewer`, `guard-api`. **Model:** sonnet.
- **Dependensi:** F01, A07. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.5 E5 sampai jam sah (sertifikat diuji di F03) dan E6; aktivasi membuat `relawan_permintaan` (ADR-08); calon hanya `siap_tugas` (ADR-09); RU §2.4 baris aktivasi dan panggilan; tidak ada fetch keluar selain ASSETS.
- **Bukti:** `node --test tests/warga/kemitraan_satgas.test.mjs`.
- **Rujukan:** PRD F-S2, F-S4; ALUR §4.3–§4.4; ALG §9. **Ukuran:** L

#### KM-F03 Sertifikat + QR + verifikasi publik
- **Tujuan:** terbit sertifikat (satgas, magang), `qr.js` lokal, halaman `/kemitraan/sertifikat/:id` (cetak A4 mendatar DS §5.9).
- **Berkas:** `src/kemitraan_satgas.js`, `public/kemitraan/qr.js`, `public/kemitraan/sertifikat.{html,js}`, `tests/kemitraan/qr.test.mjs`, `tests/warga/kemitraan_satgas.test.mjs`.
- **Antarmuka:** QR byte mode ECC M versi 1–6 (URL ≤ 100 karakter); uji: dekode QR keluaran kembali ke teks (pustaka dekode hanya di uji, devDependency yang sudah ada atau dekoder kecil di fixture).
- **Pengerja / pemeriksa:** `warga-api` (rute) + `kampus` (layar) / `security-reviewer`. **Model:** sonnet.
- **Dependensi:** F02. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.4 baris sertifikat; jawaban publik tanpa wa/email.
- **Bukti:** `node --test tests/kemitraan/qr.test.mjs tests/warga/kemitraan_satgas.test.mjs`.
- **Rujukan:** PRD F-S5; DS §5.9; KM §2. **Ukuran:** M

#### KM-F04 Catatan pembelajaran
- **Tujuan:** kerangka otomatis (garis waktu dari arsip sitrep R2 + isian kaji cepat + jumlah anggota + jam) + analisis pakar.
- **Berkas:** `src/kemitraan_satgas.js`, `tests/warga/kemitraan_satgas.test.mjs`.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`. **Model:** sonnet.
- **Dependensi:** F02. **Isolasi:** worktree ya.
- **Selesai bila:** kerangka tidak memuat teks/koordinat warga (pola arsip sitrep).
- **Bukti:** `node --test tests/warga/kemitraan_satgas.test.mjs`.
- **Rujukan:** PRD F-S5; ALUR §4.5. **Ukuran:** S

#### KM-F05 Tampilan Satgas + lembar aktivasi
- **Tujuan:** tampilan `satgas`: tab Satgas (kartu per kampus, unsur, siap), Piket (kalender minggu × rumpun), Aktivasi (daftar, tombol **Aktifkan kampus** → dialog pilih kejadian, radius, kebutuhan), lembar aktivasi (peta SVG lokasi + kampus + anggota, tabel calon tercentang, Siapkan panggilan → daftar tautan wa.me + "Salin pesan grup", status jawaban langsung, Tugaskan, Rakit tim kaji cepat, kontak mitra, fasilitas, laporan harian, Cetak A4, Tutup).
- **Berkas:** `public/kemitraan/satgas.js`, `public/kemitraan.css`.
- **Pengerja / pemeriksa:** `kampus` / `inp-reviewer`, `selera-angka`. **Model:** sonnet.
- **Dependensi:** F02, B07. **Isolasi:** worktree ya.
- **Selesai bila:** ALUR §4.3 di peramban uji; tidak ada pengiriman otomatis (uji: tidak ada `fetch` ke wa.me/whatsapp).
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-S1–F-S4; DS §5.7. **Ukuran:** L

#### KM-F06 Kartu panggilan + check-in di halaman saya
- **Tujuan:** kartu `.km-panggil`, jawab Bersedia/Tidak, tugas aktif + check-in/out (pakai rute relawan lama), luring `antre.js`.
- **Berkas:** `public/kemitraan/saya.js` (bagian AG panggilan), `public/kemitraan.css` (§5.8).
- **Pengerja / pemeriksa:** `kampus` / `inp-reviewer`. **Model:** sonnet.
- **Dependensi:** F02, D03. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.3 L6 (kartu panggilan, tombol 56 px).
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-S2; DS §5.8. **Ukuran:** M

### 3.G Talenta dan pendampingan

#### KM-G01 Rute magang + mentor
- **Tujuan:** lowongan (ST, BP kabnya), lamaran (AG mahasiswa, CV PDF), seleksi, penempatan (+ kode meja bila operator BPBD), penilaian pembimbing (kode PL), sertifikat + rekap SKS (konstanta jam per SKS di konst), saran + pasangan mentor alumni.
- **Berkas:** `src/kemitraan_talenta.js`, `tests/warga/kemitraan_talenta.test.mjs`.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`, `security-reviewer`. **Model:** sonnet.
- **Dependensi:** A08, D01, F03. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.5 E7 (tanpa layar); lamaran ke lowongan penuh 409.
- **Bukti:** `node --test tests/warga/kemitraan_talenta.test.mjs`.
- **Rujukan:** PRD F-T1–F-T2; ALUR §5.1–§5.2. **Ukuran:** M

#### KM-G02 Rute desa, dampingan, BUMN, modul
- **Tujuan:** desa binaan + catatan (foto ≤ 3), dampingan (+ bukti), BUMN + peluang TJSL per kab, modul (unggah ST ≤ 10 MB, unduh publik + hitung).
- **Berkas:** `src/kemitraan_talenta.js`, `tests/warga/kemitraan_talenta.test.mjs`.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`. **Model:** sonnet.
- **Dependensi:** A08, A09. **Isolasi:** worktree ya.
- **Selesai bila:** kode desa liar 400; modul 11 MB 413; unduh dengan `Content-Disposition: attachment`.
- **Bukti:** `node --test tests/warga/kemitraan_talenta.test.mjs`.
- **Rujukan:** PRD F-T3–F-T7; ALUR §5.3–§5.6. **Ukuran:** M

#### KM-G03 Tampilan Talenta + peta binaan
- **Tujuan:** tampilan `talenta`: Magang (lowongan, lamaran, seleksi, nilai), Alumni mentor (kartu, pasangan), Peta binaan (KM.peta nasional/prov: kampus, desa, kab dampingan, arsir kab rawan P1 tanpa pembina), Desa binaan (lembar + riwayat catatan antarangkatan), Dampingan, BUMN (kartu peluang), Modul (daftar + unggah ST).
- **Berkas:** `public/kemitraan/talenta.js`.
- **Pengerja / pemeriksa:** `kampus` / `inp-reviewer`, `selera-angka`. **Model:** sonnet.
- **Dependensi:** G01, G02, B07. **Isolasi:** worktree ya.
- **Selesai bila:** ALUR §5 di peramban uji; peta prov < 50 ms.
- **Bukti:** `node --test tests/bnpb/kemitraan_layar.test.mjs`.
- **Rujukan:** PRD F-T1–F-T7. **Ukuran:** L

### 3.H Lintas, uji, rilis

#### KM-H01 Dasbor indikator + ekspor
- **Tujuan:** `GET /api/kemitraan/dasbor` (14 kueri DT §6.3, dummy=0) + tampilan `dasbor` (kartu indikator vs sasaran 2027/2029, tren triwulan, kampus pasif, peta celah, unduh PPTX/PDF lewat pola `public/dokumen.js`).
- **Berkas:** `src/kemitraan.js` (dasbor), `public/kemitraan/dasbor.js`, `tests/warga/kemitraan_dasbor.test.mjs`.
- **Pengerja / pemeriksa:** `warga-api` + `kampus` / `validasi-model`, `selera-angka`. **Model:** sonnet.
- **Dependensi:** D06, E04, F02, G02. **Isolasi:** worktree ya.
- **Selesai bila:** 14 indikator terhitung dari data uji; indikator 3 dan 13 berpil "isian kampus, belum diverifikasi".
- **Bukti:** `node --test tests/warga/kemitraan_dasbor.test.mjs`.
- **Rujukan:** PRD F-X1; DT §6.3; ALG §10. **Ukuran:** M

#### KM-H02 Detektor pengingat km
- **Tujuan:** 7 detektor DT §6.4 di `src/pengingat.js`, menulis ke `km_pengingat` (ADR-06); `/admin/pengingat` membaca UNION `pengingat` + `km_pengingat`.
- **Berkas:** `src/pengingat.js`, `tests/warga/pengingat.test.mjs` (tambah kasus).
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`. **Model:** sonnet.
- **Dependensi:** A04–A08. **Isolasi:** worktree ya.
- **Selesai bila:** tiap detektor punya kasus muncul + kasus tidak muncul; dedup per (jenis, sumber_id, keadaan).
- **Bukti:** `node --test tests/warga/pengingat.test.mjs`.
- **Rujukan:** PRD F-X2; DT §6.4. **Ukuran:** S

#### KM-H03 Dummy isi/hapus
- **Tujuan:** `POST /api/kemitraan/dummy` + tombol 🧪/🧹 di kepala `/kemitraan` (SA saja).
- **Berkas:** `src/kemitraan.js`, `public/kemitraan/inti.js`, `tests/warga/kemitraan_dummy.test.mjs`.
- **Antarmuka:** baca `~/.claude/DUMMY.md` dulu; urutan hapus anak → induk (pola `src/relawan.js:845–860`); data dummy DT §8.
- **Pengerja / pemeriksa:** `warga-api` / `guard-api`. **Model:** sonnet.
- **Dependensi:** semua rute D–G. **Isolasi:** worktree ya.
- **Selesai bila:** RU §2.5 E9; layar terisi setelah isi (bukan sukses kosong).
- **Bukti:** `node --test tests/warga/kemitraan_dummy.test.mjs`.
- **Rujukan:** PRD F-X3; DT §8. **Ukuran:** M

#### KM-H04 Uji alur ujung ke ujung E1–E9
- **Tujuan:** satu berkas uji yang menjalankan RU §2.5 penuh di Miniflare.
- **Berkas:** `tests/warga/kemitraan_alur.test.mjs`, `tests/warga/cakupan.json`.
- **Pengerja / pemeriksa:** `penulis-gerbang` / `validasi-model`. **Model:** sonnet.
- **Dependensi:** H03 dan semua rute. **Isolasi:** worktree ya.
- **Selesai bila:** E1–E9 hijau; tiap langkah memeriksa isi D1, bukan hanya status HTTP.
- **Bukti:** `node --test tests/warga/kemitraan_alur.test.mjs`.
- **Rujukan:** RU §2.5. **Ukuran:** L

#### KM-H05 Uji layar 1440/390
- **Tujuan:** lengkapi `tests/bnpb/kemitraan_layar.test.mjs` untuk RU §2.3 L1–L9 dan semua tampilan.
- **Berkas:** `tests/bnpb/kemitraan_layar.test.mjs`.
- **Pengerja / pemeriksa:** `kampus` / `inp-reviewer`. **Model:** sonnet.
- **Dependensi:** semua tampilan. **Isolasi:** worktree ya.
- **Selesai bila:** semua L hijau di dua lebar; konsol bersih.
- **Bukti:** `npm run uji:layar`.
- **Rujukan:** RU §2.3. **Ukuran:** M

#### KM-H06 Penyelarasan konteks bersih
- **Tujuan:** subagent tanpa riwayat membandingkan kode dengan 10 dokumen; menulis `PENYELARASAN.md` (pola SIPPA: fakta diperiksa, perubahan, matriks cakupan PRD→DS→DT→RU→TIKET, pertanyaan pemilik, penyimpangan `berkas:baris`).
- **Berkas:** `data/kajian-bnpb/kampus/PENYELARASAN.md`.
- **Pengerja / pemeriksa:** `Explore` (baca) + sonnet penulis / sesi induk.
- **Dependensi:** H04, H05. **Isolasi:** tidak.
- **Selesai bila:** tiap fitur PRD punya baris matriks; penyimpangan nol atau dicatat ADR.
- **Bukti:** berkas ada; sesi induk menyetujui.
- **Rujukan:** pola `data/kajian-bnpb/pipa/PENYELARASAN.md`. **Ukuran:** M

#### KM-H07 Commit, migrasi produksi, terbit [induk]
- **Tujuan:** sesi induk meng-commit per gelombang dengan path spesifik; pemilik menerapkan migrasi 0080–0084 ke D1 produksi; secret `KM_PIPA_TOKEN`; tab "Kemitraan" untuk staf; terbit lewat `terbit.yml`.
- **Bukti:** `npm run uji:warga && npm run uji:agen && npm run uji:layar` hijau sebelum push; `npx wrangler d1 migrations apply poskowarga --remote -c wrangler.jsonc` (pemilik).
- **Ukuran:** S

## 4. Grafik dependensi (jalur kritis ══>)
```
A02 ─┬─> A11
A03 ══> B01 ══> B02 ══> B03 ══> B04 ──> B05
            └─> C01 ══> C02 ══> B08 (juga butuh B06, B07)
A04 ══> A09 ══> C03 ══> C04 ══> C11
  ├─> A05..A08        └─> C05
  └─> D01 ──> D02, D03 ;  D05 ──> D04
C06 ══> C07 ══> C08 ══> C11 ;  C07 ──> C09 [manusia] ──> C10
A06 ──> E01 ──> E02, E03 ──> E06 ;  E04 ──> E05 ──> E07
A07 ──> F01 ──> F02 ──> F03, F04, F05, F06
A08 ──> G01, G02 ──> G03
semua ──> H02, H03 ──> H04, H05 ──> H06 ──> H07 [induk]
```

## 5. Jalur kerja (menggantikan gelombang dan kolom "Paralel dengan")

Penyelarasan 30 Okt menemukan berkas bertabrakan bila tiket dijalankan per gelombang.
Aturan baru: **satu jalur = satu pekerja berurutan**; jalur yang berbeda boleh jalan
bersamaan (maks 4–5). Kolom "Paralel dengan" di tiket hanya petunjuk; yang mengikat tabel ini.
Tiket menunggu tanda panah lintas-jalur (`⇐`) sebelum mulai.

| Jalur | Pengerja | Berkas yang dipegang | Urutan tiket |
| --- | --- | --- | --- |
| I | sesi induk / mekanik-mesin | roster, workflow, AGENTS.md | A01 → B05 (⇐ B04, C02) → C12 (⇐ C07, C08) → H07 |
| M | warga-api (migrasi) | `migrations/0080–0084`, uji skema | A04 → A05 → A06 → A07 → A08 |
| W | warga-api (worker) | `src/kemitraan*.js`, `src/worker.js`, `src/staf.js`, `src/pengingat.js`, `migrations/0085` | A09 (⇐ A04) → D05 → D01 → C03 (⇐ A05) → C08 (⇐ C07) → E01 (⇐ A06) → E03 → E04 → E05 → F01 (⇐ A07) → F02 → F03-rute → F04 → G01 (⇐ A08) → G02 → H02 → D06 → H01-rute → H03 |
| P | kampus (pipeline) | `scripts/kemitraan/**`, `scripts/umum/nama_wilayah.py`, `public/data/kemitraan/**` | A02 → A03 → B01 → B02 → B03 → B04 → C01 → C02-py → C06 → C07 → C10a → (C09 manusia) → C10b → E02 (⇐ E01) |
| L | kampus (layar) | `public/kemitraan*`, `public/kemitraan/**`, `public/inti/kepala.js` | A10 (⇐ A09) → B07 → B06 (⇐ B04) → C02-js/panduan (⇐ C02-py) → C04 (⇐ C03) → C11 (⇐ C08) → C05 → D02 (⇐ D01) → D03 → D04 → B08 → E06 (⇐ E03) → E07 (⇐ E05) → F05 (⇐ F02) → F06 → F03-layar → G03 (⇐ G02) → H01-layar → H05 |
| G | penulis-gerbang | `tests/kemitraan/gerbang-*`, `cakupan.json`, `package.json` | A11 (⇐ A02) → H04 (⇐ H03) → H06 (⇐ H04, H05) |

Tiket yang dipecah antarjalur (C02, F03, H01) dikerjakan sebagai dua sesi: bagian rute/py di
jalurnya, bagian layar di jalur L. `tests/kemitraan/cakupan.json` hanya disunting jalur G;
jalur lain menitipkan entri di laporan tiketnya.

**Urutan nilai:** P dan W sampai C08 + L sampai C11 menghasilkan Belanja Masalah lengkap
(profil, buku, masalah, pakar, pertanyaan) yang bisa didemokan ke pimpinan; jalur D–G menyusul.

## 6. Penghambat dari pemilik
| Kode | Butuh | Menghambat |
| --- | --- | --- |
| T-A..T-G | jawaban KP §H (punya bawaan) | tidak menghambat |
| P1 | dua staf penilai relevansi (C09) | C10, label "Belum diuji" |
| P2 | teks templat surat dukungan disetujui | E03 (tombol surat) |
| P3 | migrasi produksi + secret `KM_PIPA_TOKEN` | H07 |
| P4 | izin memakai logo BNPB di buku/sertifikat (bawaan: tanpa logo) | B08, F03 |

## 7. Pemeriksaan kelengkapan (PRD → tiket)
| Fitur | Tiket |
| --- | --- |
| F-D1 | D04, D05 | 
| F-D2 | D01, D02 |
| F-D3 | D03, C05, E07, F06 |
| F-D4 | D04, D05, H02 |
| F-D5 | D06 |
| F-M1 | B01–B04, B06, B07 |
| F-M2 | B08 |
| F-M3 | B03 |
| F-M4 | C03, C04 |
| F-M5 | C06–C11 |
| F-M6 | C01, C02 |
| F-M7 | C03, C05 |
| F-R1 | E05, E07 |
| F-R2, F-R3 | E01, E02, E06 |
| F-R4, F-R5 | E03, E06 |
| F-R6 | E04, E07 |
| F-R7 | E05, E07 |
| F-S1, F-S3 | F01, F05 |
| F-S2, F-S4 | F02, F05, F06 |
| F-S5 | F03, F04 |
| F-T1, F-T2 | G01, G03 |
| F-T3..F-T7 | G02, G03 |
| F-X1 | H01 |
| F-X2 | H02 |
| F-X3 | H03 |
