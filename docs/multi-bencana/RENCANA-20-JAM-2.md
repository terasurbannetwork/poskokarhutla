# Rencana 20 jam kedua: menyempurnakan semua bencana

Disusun 19 Okt 2026 atas perintah pemilik: *"buatkan lah plannya untuk jalan 20 jam untuk menyempurnakan semua bencananya"*.

Dasarnya tiga audit hanya-baca yang dijalankan hari ini. Tiap audit mengisi 113 komponen `PAKET-FITUR.md` untuk dua bencana, berbukti `berkas:baris`, dan memeriksa data live. Rencana pertama (`RENCANA-20-JAM.md`, 16 Okt) sudah membangun halamannya. Rencana ini membuat isinya setara karhutla, jujur, dan tidak basi.

## 1. Kondisi awal (audit 19 Okt)

| Bencana | ADA | SEBAGIAN | BELUM | Tidak berlaku | Paling lemah |
| --- | ---: | ---: | ---: | ---: | --- |
| Banjir | 76 | 28 | 6 | 3 | Alarm palsu Waspada (FAR 0,964); kejadian aktif tak digambar; prospektif tak terbit |
| Gempa | 50 | 27 | 23 | 13 | Peluang M7+ 74% padahal uji baliknya gagal; riwayat beku 13 Okt; tak ada tab kejadian |
| Gunung api | 44 | 29 | 28 | 12 | Separuh rantai tak terjadwal; arah abu setara acak (n=4); tanpa kode gunung dan laci |
| Cuaca | 44 | 34 | 28 | 7 | Arsip CAP dihapus 6 jam, uji balik n=0; Lapor Warga ditolak 400 |
| Udara | 42 | 33 | 28 | 10 | Dua jalur data beda angka; tanpa stasiun ukur; `/udara/simulasi` 404 |
| Kekeringan | 38 | 43 | 24 | 8 | 9 skrip turunan hanya jalan lokal; statistik hilang (CHECK D1); uji balik mengira katalog tak ada |

Karhutla tetap rujukan dan tidak diubah, kecuali yang memang dibetulkan.

**Target akhir 20 jam:** tiap bencana ADA ≥ 70. Selain itu `bencana/<id>.md` terisi untuk 113 baris dengan nilai dibuat / diadaptasi / tidak berlaku (gerbang butir 7). Tak ada sumber basi di `/api/status`, dan tak ada angka model di layar yang bertentangan dengan uji baliknya sendiri.

## 2. Aturan kerja

- **Aturan A1–A25** di `RENCANA-20-JAM.md` §1 tetap berlaku. Arahnya mengurangi dan menyeragamkan.
- **Plug and play** (`MODUL-PLUG-AND-PLAY.md`). Tiru kode karhutla. Konteks khas bencana boleh ditambah kalau karhutla tak punya padanannya, dengan alasan tertulis. Tidak ada CSS/JS salinan antar modul; yang dipakai bersama tinggal di `public/inti/` dan `scripts/umum/`.
- **Model tanpa uji balik tidak tampil.** Fitur yang disembunyikan di karhutla (Posko, Lapor Warga, Ringkasan, Metode) dibuat di kode lalu ikut disembunyikan lewat `tab_sembunyi`.
- **Hanya `main`, tanpa worktree.** Agen yang menulis jalan paralel hanya kalau himpunan berkasnya terpisah dan disebut di brief.
- **Working tree = publik dalam hitungan menit.** Commit "gas" dari GitHub Desktop menyapu semua perubahan yang belum di-commit. Jangan meninggalkan suntingan setengah jadi di tree; yang belum aman disimpan di scratchpad.
- **Workflow (`.github/workflows/**`) hanya bisa di-push pemilik** lewat GitHub Desktop, karena token CLI tanpa scope `workflow`. Sesi induk menyiapkan diff-nya, pemilik mendorong. Agen tidak menyunting workflow.
- **Tiap push dicek sampai tayang.** `terbit.yml` harus sukses, satu aset berubah harus terlihat di live, dan `/api/status` tanpa `basi`.
- **Penulis bukan pengulas.** Tiap blok diperiksa verifier berkonteks bersih (`AGENTS.md` §3.2). Diff agen dibaca sendiri baris demi baris sebelum commit (memori `kendali-mutu`).
- **Ada sesi lain yang sedang mengerjakan `RENCANA-PELUANG.md`** (berkas `peluang_*.py`, `inti/peluang.js`, `outlook12.py`, `iklim_outlook.py`). Rencana ini tidak menyentuh berkas itu. Peluang hanya disambungkan ke layar di Insight setelah sesi itu selesai.

## 3. Urutan kerja

Jam adalah anggaran, bukan janji. Yang tidak selesai pindah ke blok berikut dan dicatat terbuka.

### B0 · Lantai dan kejujuran angka (jam 0–2)

Ini dulu, karena semua blok berikut bergantung pada gerbang yang hijau.

| Butir | Berkas | Pengerja → pemeriksa |
| --- | --- | --- |
| `api.test.mjs` merah 21/22. Akar: `src/worker.js:453` membalik penggantian merek (0dfa96d, bb924cb), sehingga `/peta` bukan `index.html`. Juga `foto.test` 15 gagal, `foto_bencana.test` 4 gagal, `peluang-inti.test` mengunci literal "74%" dari data yang ditulis ulang | `src/worker.js`, `tests/warga/*`, `tests/agen/peluang-inti.test.mjs` | `warga-api` → `guard-api` |
| `uji:warga` dirangkai `&&`, jadi satu merah menyembunyikan sisanya. Masukkan juga `foto_bencana.test` dan `tests/banjir` ke npm | `package.json` | `mekanik-mesin` |
| Statistik 5 bencana baru hilang diam-diam: CHECK `stat_hari.hal` di migrasi 0006 hanya mengenal karhutla/banjir | migrasi 0016 baru | `warga-api` → `migrasi-idempoten` |
| **Gempa:** "peluang M7+ dangkal 12 bulan 74%" terbit padahal uji balik `laju.json` meleset (harapan 15,8, teramati 8, di luar selang). Model susulan "disesuaikan" lebih buruk dari generik di semua t1 | `scripts/gempa/peluang_gempa.py`, `susulan.py`, layar gempa | `gempa` → `validasi-model` |
| Registry ≠ halaman: tab simulasi udara/cuaca/gunung api tak terdaftar (404), simulasi gempa tersembunyi tapi tampil, jalur `berita.leksikon`, `workflow`, `cron_worker`, `lapisan` yang tak digambar | `public/bencana.json`, `npm run bencana:js` | `inti-layar` |
| Higiene: `src/himawari 2.js`, `tests/warga/himawari.test 2.mjs`, 30 folder yatim `.claude/worktrees` (2,3 GB) | — | sesi induk, **izin pemilik** |

**Bukti siap:** `uji:warga`, `uji:agen`, dan `tests/banjir` hijau semua. Layar gempa tidak memuat angka yang ditolak uji baliknya sendiri.

### B1 · Jadwal dan kesegaran (jam 2–4)

Akar data basi 17–19 Okt: `banjir.yml` terbunuh di menit 50, karena `posko.py` merantai 5 modul. Timeout sudah dinaikkan ke 120 (19 Okt), tapi rantainya tetap rapuh.

- **Workflow baru `lintas.yml` harian**, sesudah `banjir.yml` dalam grup konkurensi `data`. Pulihkan cache `banjir-`/`data-`, jalankan, lalu simpan lagi. Isinya:
  - cuaca, `cuaca.py` (8 langkah);
  - gunung api lengkap: `magma` → `abu` → `paparan` → `laporan` → `citra` → `peluang_abu`;
  - kekeringan, 9 turunan. Rantai ini kini di `data.yml` lewat `tanah.py`, dan menurut log 18 Okt hanya `status.py` yang benar-benar jalan; 9 berkas turunan di live hasil jalan lokal;
  - berita + dampak 5 modul.

  Rantai yang sama dicabut dari `posko.py` dan `tanah.py`.
- **`statis.yml`:** gempa `riwayat`, `bahaya`, `bukti`, `sesar` (bulanan); cuaca `sarana`; udara `pltu`/`kota`; kekeringan `embung`.
- **`gempa.yml`:** jalankan 11 `uji`, bukan 4.
- **Uji node pertama di CI:** `npm run uji:agen` dan `uji:warga` di `terbit.yml` sebelum deploy.
- **`/api/status`** juga memantau `udara/prakiraan.json` dan berkas peluang begitu terbit.

**Bukti siap:** dua putaran jadwal berturut-turut sukses, dan semua `dibuat` di `/api/status` di bawah ambang. Diff disiapkan sesi induk, **di-push pemilik**.

### B2 · Mesin bersama yang membuka paritas lima modul sekaligus (jam 4–7)

Satu kerja di inti menutup baris yang sama di 5 bencana.

| Butir | Kode PAKET | Berkas |
| --- | --- | --- |
| **Lapor Warga multi-bahaya** (disembunyikan seperti karhutla). `BAHAYA` dari registry, CHECK `laporan.bahaya` lewat migrasi, jenis per bencana (guncang/tsunami, abu/lahar, pohon tumbang/hujan es, asap/sesak, sumur kering/gagal panen) | C24 D05 E03 | `public/informasi_jenis.js`, `src/worker.js`, migrasi, `cakupan.json` |
| **Tombol dummy per halaman + foto dummy per bencana** (aturan pemilik no. 1). `ASET_DUMMY` kini 100 foto karhutla untuk semua; foto Wikimedia berlisensi per bencana | C25 C36 D09 | `src/foto.js`, `public/admin/*`, `public/img/dummy/<id>` (gerbang `gerbang-dummy`) |
| **Kejadian berkode + laci + `/k/<awalan>0001` generik.** Pola `scripts/banjir/kejadian_aktif.py` dipindah ke `scripts/umum/kejadian.py`; laci 9 bagian di `public/inti` | A04 A07 C10 C12 C28 | `scripts/umum/`, `public/inti/laci.js`, `src/og_meta.js` |
| **Lapisan konteks dari registry** (penduduk, sekolah, fasilitas, jalan) digambar oleh inti, bukan per modul | C08 C38 | `public/inti/peta*.js` |
| **Gerbang:** `gerbang-inti.test.mjs`, crawl i18n `kumpul.mjs` dan `beban.mjs` untuk semua bencana | E05 E07 E08 C29 | `tests/agen`, `tests/beban` |
| **Kredit dan riset:** `kredit.json` per bencana, kerangka `RISET-*.md` dari pola banjir | F03 F04 B10 | `public/<id>/kredit.json`, `scripts/<id>/RISET-*.md` |

**Bukti siap:** satu laporan warga per bencana tersimpan di D1 lokal, dummy mengisi tiap halaman, dan `/gempa/k/G0001` membuka laci.

### B3 · Per bencana (jam 7–17)

Dua bencana jalan bersamaan, berkasnya terpisah. Tiap blok berakhir dengan audit ulang 113 baris (`bencana/<id>.md`) dan verifier bersih di 1440 dan 390.

| Jam | Bencana | Isi |
| --- | --- | --- |
| 7–9 | **Gempa** | Tab Kejadian + `/gempa/k/G…` + Google Maps. Lapisan isoseismal MMI, susulan, RS/sekolah. Uji balik MMI vs USGS DYFI, dan prospektif mulai terisi dari arsip D1. Indeks risiko riwayat tampil (`risiko.json` kini tak dibaca). Kontak BPBD/Basarnas dari `bpbd.json`. `factsheet_gempa.json`. Galeri gempa merusak (B04). |
| 7–9 | **Kekeringan** | Uji balik ambang terhadap 288 kejadian kering DIBI di `kejadian.json` (`ujibalik.py` keliru mengira katalog tak ada). Dampak sekolah + fasilitas (`sekolah.json` 65.551 baris sudah ada). Posko air bersih + kebutuhan tangki 15 L/orang/hari (disembunyikan). Lapisan embung, gambut, sekolah. Kalender musim dan risiko riwayat dari cache hujan 1991–2025. Tentang menyebut kekeringan. |
| 9–11 | **Gunung api** | Kode `V` + nomor GVP, laci `/gunungapi/k/V…`, OG per gunung. Paparan diperluas dari 30 ke 69 gunung. Catatan harian level tanpa bolong. Kontak pos PVMBG. Pemantauan hampir waktu nyata: poll MAGMA ≤ 30 menit di cron worker + `/api/gunungapi/terbaru` + alarm naik level (`ews.js`). |
| 9–11 | **Cuaca** | **Arsip CAP permanen**: migrasi + `src/nowcast.js`, tidak dihapus 6 jam. Ini bahan uji balik. Kejadian `C…` dari CAP + kecamatan Siaga. Musim peralihan + ENSO di Tren dari `iklim.json` dan DIBI. Unit respons/kontak. Ambang CAPE/LI dan embusan ansambel hanya disiapkan; tampil setelah ada arsip CAP cukup untuk uji balik. |
| 11–13 | **Udara** | Satukan jalur data: Peta, Insight, Dampak, dan Tren membaca `prakiraan.json` + `rentan.json`; `kualitas.py` dan `dampak_udara.py` dipensiunkan. Episode `U…` + laci + saran kesehatan resmi per kategori. Peringatan dini udara di `ews.js`. Kalender musim asap + ENSO + korelasi titik panas vs PM2,5. Arsip prakiraan harian append-only untuk uji balik 1–3 hari. Stasiun terukur menyala begitu token ada. |
| 11–13 | **Banjir** | Kejadian aktif digambar di peta + `/banjir/k/B…`. `prospektif.json` terbit. Unit respons (Basarnas, pos SAR, perahu) dari OSM + kurasi bersumber. Lapisan sekolah/faskes/jalan/InaRISK. Kerugian rupiah bila ada sumber BNPB. |
| 13–17 | **Model yang butuh rancangan Opus** (sesi induk merancang, pengerja mengerjakan, `validasi-model` memeriksa, tampil hanya bila lolos) | (a) **Banjir:** ambang per DAS/kabupaten untuk memangkas alarm palsu Waspada (POD 0,565, FAR 0,964), dilatih 2016–21 dan diuji 2022–25 terhadap DIBI. (b) **Cuaca:** uji balik ambang angin/gelombang/hujan terhadap DIBI + arsip CAP, lalu ambang dikunci. (c) **Gempa:** tingkat Pantau per kabupaten dari MMI + susulan (aturan `gempa.md` §4 masih hipotesis), disembunyikan sampai teruji. (d) **Gunung api:** uji arah abu diperluas melampaui 4 kasus VONA; bila tetap setara acak, layar menulisnya terus terang. |

### B4 · Lintas bencana (jam 17–18)

- `/semua`: kejadian aktif lintas bencana dari `scripts/umum/kejadian.py` (B2). Outlook 12 bulan dipasang hanya kalau sesi peluang sudah menerbitkannya.
- `tentang.html` menyebut ketujuh bencana dengan gambarnya.
- Cerita per bencana (C16), pola `cerita` karhutla, dari kejadian besar DIBI atau katalog.

### B5 · Sapuan dan laporan (jam 18–20)

- Verifier bersih per halaman: `inp-reviewer`, `selera-angka`, `security-reviewer`, `guard-api`, `higiene-repo`.
- `PARITAS-*.md` ditulis ulang dari audit segar; keenamnya kini usang (masih menulis "SIAP AKTIF: BELUM", Foto BEDA, tak ada simulasi).
- `bencana/<id>.md`: 113 baris terisi; `gerbang-bencana` butir 7 benar-benar menjaganya.
- Memori diperbarui (`fitur-disembunyikan` untuk yang baru disembunyikan).
- Laporan ke pemilik: apa yang live, apa yang menunggu, dan ADA per bencana sebelum vs sesudah.

## 4. Yang menunggu pemilik

| Butuh | Untuk | Tanpa itu |
| --- | --- | --- |
| Push berkas workflow lewat GitHub Desktop (B1) | `lintas.yml`, `statis.yml`, `gempa.yml`, `terbit.yml` | Rantai tetap di `posko.py`/`tanah.py` dengan risiko timeout |
| Izin menghapus 30 folder `.claude/worktrees` (2,3 GB, disk 86%) | higiene | dibiarkan |
| `WAQI_TOKEN` atau kunci OpenAQ v3 | koreksi bias udara, bobot P3, uji balik | udara tetap "perkiraan model CAMS, belum dikoreksi" |
| Akses telemetri pos duga SIHKA/PUPR | pengamatan banjir hampir waktu nyata | banjir harian saja |
| Persetujuan foto dummy dari Wikimedia Commons | dummy per bencana | dummy foto karhutla di semua bencana |
| Pelabel manusia ≥ 200 berita per bencana | sentimen teruji | sentimen tetap berlabel "belum teruji" |
| Kuota YouTube per bencana | video (A34) | tanpa video |

## 5. Yang sengaja tidak dikerjakan

- Model atau indeks baru yang tampil tanpa uji balik.
- Tab "Rangkaian" emisi.app dan hiasan visual lain yang tidak membantu posko.
- Membuka fitur yang disembunyikan pemilik. Itu keputusan pemilik per bencana.
- Menyunting berkas milik sesi peluang (`RENCANA-PELUANG.md`).
