# Rencana Uji dan Kriteria Terima SIPPA

Versi 25 Oktober 2026, diperbarui 26 Oktober 2026 untuk keputusan 55 (buku gabungan 22 bab, gerbang D-39 dan D-40, deck 18 slide) dan 56 (layar Pemeliharaan, Air tanah, Akses, migrasi 0059). Cakupan: aplikasi web `/pipa` (worker, D1, R2, layar), pipeline data `scripts/data/sippa/`, buku kajian, deck paparan, dan data pilot Oktober 2026.

Otoritas, dari yang paling menang: `KEPUTUSAN-SIPPA.md` (keputusan pemilik 1–56), `PRD.md` (§9 web, §10 bukti tugas, §12.3 daftar periksa serah), `DESAIN-TEKNIS.md` (skema, rute, rumus, kasus acuan yang dikutip di sini), `KERANGKA-BUKU.md` (bab, gerbang buku D-33 sampai D-40), `~/.claude/TEST.md` (lapisan, registri, gerbang mekanis), `~/.claude/INP.md`, `AGENTS.md` (§3.2 pemeriksa berkonteks bersih, §6 pengulas). Dokumen ini tidak menambah fitur; ia menetapkan **perintah apa yang harus keluar 0** supaya sebuah butir boleh disebut selesai.

## 0. Aturan dasar

### 0.1 Definisi selesai

Sebuah butir selesai bila dan hanya bila tiga hal terpenuhi:

1. Perintah bukti di baris butir itu keluar dengan kode 0 di checkout bersih (keadaan yang ada di git, bukan berkas lokal yang belum dilacak).
2. Butir itu terdaftar di registri cakupan yang benar (`tests/warga/cakupan.json` untuk rute dan skema, `tests/sippa/cakupan.json` untuk logika klien dan pipeline, `data/kajian-bnpb/qa/cakupan.json` untuk gerbang buku) di daftar `diuji` atau `dikecualikan` beralasan.
3. Pengulas wajib §8 melapor tanpa temuan kritis terbuka, dan pengulas itu subagent baru tanpa riwayat pekerjanya (AGENTS.md §3.2). Laporan "sudah beres" dari pengerja tidak dihitung.

Yang tidak dihitung sebagai bukti: unit test bermock untuk perilaku di luar JS (TEST.md), tangkapan layar tanpa angka terukur, dan klaim di pesan commit.

### 0.2 Empat aturan TEST.md yang dipakai di seluruh dokumen

| Aturan | Bentuknya di SIPPA |
| --- | --- |
| Lapisan ditentukan letak logika | rumus di `public/pipa/hitung.js` diuji unit; CHECK/trigger diuji SQL sungguhan; hak rute diuji dengan memanggil handler worker; alur kit gudang ke banjir diuji ujung ke ujung |
| Uji bahwa yang salah DITOLAK | tiap CHECK punya satu sisipan yang wajib gagal; tiap rute punya kasus peran salah, masukan liar, badan terlalu besar, dan batas laju |
| Invarian, bukan potret | "jumlah zona = jumlah kompleks" dan "tiap kompleks tepat satu zona" berlaku selamanya; angka A188/B418/C89/D170 dipakai hanya sebagai reproduksi masukan beku (`kendala.json` versi tarik 24–25 Okt 2026 dan `osm_jarak.csv`), dengan sha256 masukannya dicatat di uji sehingga perubahan data memberi pesan "masukan berubah", bukan merah diam-diam |
| Pesan gagal menyebut angka dan sebab | contoh wajib: `zona lama A=189, diharapkan 188 dari osm_jarak.csv sha <sha>: 1 kompleks berjarak air tepat 2,50 km masuk A, periksa operator pembanding (angka acuan hanya keluar dengan <, lihat §4.2)` |

### 0.3 Berhenti di galat pertama

- Uji `node:test` baru memakai pola yang sudah ada di repo: `berantai()` dari `tests/warga/_bnpb.mjs` untuk uji rute, dan variabel `rusak` seperti `tests/warga/skema.test.mjs` untuk uji SQL. Sesudah satu uji gagal, uji berikutnya GAGAL dengan pesan "tidak dijalankan: … gagal lebih dulu", tidak pernah lolos diam-diam.
- Self-check Python memakai `assert` di fungsi `uji()` yang dipanggil dengan argumen `uji` (konvensi `data.yml`: `python3 scripts/data/kendala.py --uji`, `python3 scripts/data/operasi.py uji`). Satu `assert` gagal = keluar bukan 0.
- Langkah CI memakai bash bawaan GitHub Actions (`set -e`), dan langkah uji diletakkan sebelum langkah unggah atau deploy.

### 0.4 Keadaan infrastruktur per 25 Okt 2026 (diperiksa di repo)

| Hal | Keadaan | Akibat untuk rencana ini |
| --- | --- | --- |
| `tests/sippa/`, `public/pipa/`, `scripts/data/sippa/`, `data/sippa/` | belum ada | semua berkas uji di bawah ini baru |
| `migrations/0056–0058` | belum ada; migrasi terakhir `0054_kunci_api_konsesi.sql` | uji skema §3 ditulis bersamaan dengan migrasinya (P0-04) |
| Skrip `uji:sippa` di `package.json` | belum ada; yang ada `uji:agen`, `uji:warga`, `uji:banjir`, `uji:udara`, `uji:layar`, `uji` | `mekanik-mesin` menambah `"uji:sippa": "node --test --test-concurrency=1 tests/sippa/*.test.mjs"` dan merangkainya ke `uji` |
| `tests/warga/gerbang.test.mjs` | daftar modul yang dipindai (`const bn = [...]`) memuat `"pipa"` tetapi tidak `"sippa"` | tanpa menambah `"sippa"`, rute `src/sippa.js` lolos dari gerbang cakupan tanpa satu pun peringatan; ini butir pertama P0-05 (TIKET SP-008) |
| `.github/workflows/terbit.yml` | menjalankan `npm run uji:agen` dan `npm run uji:warga` sebelum `wrangler deploy` | langkah `npm run uji:sippa` ditambahkan di antara keduanya dan langkah terbit |
| `data/kajian-bnpb/qa/periksa.py` | `--kajian` hanya menerima `air`, `mitigasi` | B-01 (TIKET SP-004) menambah `sippa`; tanpa itu T-11 tidak membaca ambang pustaka SIPPA |
| `tema.json`, `bangun/kontrak/naskah.py` | belum mengenal `sippa` | B-01 (TIKET SP-004) |
| Gerbang blok pengesahan gambar teknik | tidak ada di D-1 s.d. D-32 maupun T-1 s.d. T-11 | gerbang baru T-12 (§5.4) |
| `node scripts/agents/ilmu.mjs pemilik public/pipa/index.html` | "tanpa pemilik" | agent `sippa` lahir di P0-03 sebelum berkas pertama ditulis |

---

## 1. Strategi per lapisan

### 1.1 Peta lapisan, alat, dan perintah

| No | Lapisan | Logika yang tinggal di sana | Alat (pola repo yang disalin) | Berkas uji | Perintah bukti | Kapan jalan |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | Fungsi murni JS | `public/pipa/hitung.js` (`globalThis.SippaHitung`), `formulir.js`, `keadaan.js`, logika atas `adegan.js`, `isiLaporan`, `studio_mesin.js` | `node:test` + `node:vm`, pola `tests/warga/regu_luring.test.mjs` | `tests/sippa/hitung.test.mjs`, `formulir.test.mjs`, `adegan_logika.test.mjs`, `laporan_isi.test.mjs`, `studio_mesin.test.mjs`, `keadaan.test.mjs` | `npm run uji:sippa` | tiap perubahan `public/pipa/**`; di `terbit.yml` sebelum deploy |
| L2 | Kembar JS–Python | rumus yang sama di `hitung.js` dan `scripts/data/sippa/hidraulika.py` | `node:test` memanggil `python3 -I` lewat `child_process.execFileSync` | `tests/sippa/kembar.test.mjs` + `tests/sippa/fixtures/acuan.json` | `npm run uji:sippa` | sama dengan L1 |
| L3 | Self-check Python | `zona.py`, `sel22.py`, `nasional.py`, `respons.py`, `hidraulika.py`, `pemicu.py` | `def uji()` dengan `assert`, dipanggil `python3 <skrip> uji`, pola `scripts/data/operasi.py` | di dalam skrip | `for s in bersama zona sel22 nasional respons hidraulika pemicu aoi pilot_cek; do python3 scripts/data/sippa/$s.py uji \|\| exit 1; done` | di `data.yml` sebelum skripnya menulis keluaran; lokal sebelum commit data |
| L4 | Skema D1 (CHECK, trigger, PK, UNIQUE) | `migrations/0056_sippa_inti.sql`, `0057_sippa_ab_skenario.sql`, `0058_sippa_telemetri.sql` | `node:sqlite` `DatabaseSync(":memory:")`, migrasi apa adanya lewat `migrasi()` dan `pecah()` dari `tests/warga/_bantu.mjs`, `PRAGMA foreign_keys = ON`, tiap uji dibungkus `BEGIN … ROLLBACK` oleh runner (bukan oleh uji), pola `tests/warga/skema.test.mjs` | `tests/warga/sippa_skema.test.mjs` | `node --test tests/warga/sippa_skema.test.mjs` (juga lewat `npm run uji:warga`) | tiap perubahan `migrations/**` |
| L5 | Rute dan hak | `src/sippa.js` (mengimpor `public/pipa/formulir.js`), perubahan `src/worker.js`, `src/admin_halaman.js`, `src/pantau.js` | Miniflare (workerd) dengan D1 dan R2 lokal sungguhan lewat `siapkan()` dari `tests/warga/_bnpb.mjs`, akun staf dibuat lewat rute sungguhan (`/api/staf/admin/buat`, `/api/staf/masuk`), pola `tests/warga/inventaris.test.mjs` | `tests/warga/sippa.test.mjs` | `npm run uji:warga` | tiap perubahan `src/**` |
| L6 | Alur lintas-tabel | kit → tugas → log → gerak → banjir → komponen hilang → rekap → laporan | Miniflare, satu basis data, langkah berurutan dengan `berantai()` | `tests/warga/sippa_alur.test.mjs` | `npm run uji:warga` | tiap perubahan `src/sippa.js` atau migrasi SIPPA |
| L7 | Gerbang tanpa basis data | registri cakupan, larangan teks, INP per handler, kesamaan formulir, pemilik berkas | `node:test` membaca berkas | `tests/warga/gerbang.test.mjs` (sudah ada, ditambah `"sippa"`), `tests/sippa/gerbang-cakupan.test.mjs`, `tests/sippa/gerbang-sippa.test.mjs`, `tests/agen/gerbang-ilmu-agent.test.mjs` (sudah ada) | `npm run uji:agen && npm run uji:sippa && node --test tests/warga/gerbang.test.mjs` | tiap commit yang menyentuh `public/pipa/**`, `src/**`, `migrations/**`, `scripts/data/sippa/**` |
| L8 | Peramban | INP terukur, mode gelap, ponsel, luring, QR, aksesibilitas | `preview_start` (`npm run dev:warga`, port 8787) + Claude Browser: `resize_window` mode ponsel, `javascript_tool` untuk PerformanceObserver, `read_page` untuk pohon aksesibilitas | protokol §2.6 dan §2.7, hasil ditulis ke `keluaran/qa/sippa-peramban-<tanggal>.md` di `data/kajian-bnpb/` atau lampiran laporan pengulas | tidak ada perintah tunggal; bukti = tabel angka terukur per layar | tiap rilis P0, P1, P2, P3 |
| L9 | QA buku | DOCX dan PDF | `qa/periksa.py` (D-1 s.d. D-32, T-1 s.d. T-11, T-12 baru), `qa/slop.py` (S-1 s.d. S-43, ambang per bab) | `data/kajian-bnpb/qa/uji.py` untuk uji diri gerbang | §5.1 | sebelum tiap build kirim |
| L10 | QA deck | PPTX dan PDF | `bangun/pptx/periksa.py --serah`, `qa/periksa.py --pptx --pptx-pdf`, `qa/slop.py --final` | sama | §5.2 | sebelum tiap build kirim |

### 1.2 Kenapa D1 diuji dengan `node:sqlite`, bukan hanya Miniflare

PRD §9.12.2 menulis "integrasi Miniflare dengan basis data baru per berkas". Repo memakai dua bentuk dan rencana ini memakai keduanya dengan pembagian tegas:

- **Constraint dan trigger (L4)** diuji di `node:sqlite` karena hanya bentuk ini yang memberi `BEGIN … ROLLBACK` per uji yang dibungkus runner, syarat TEST.md butir 1. D1 adalah SQLite, jadi semantik CHECK, trigger, `json_valid`, `GLOB`, dan `WITHOUT ROWID` sama.
- **Idempotensi migrasi** diuji di L4 dengan menjalankan `pecah(migrasi())` dua kali di basis data yang sama dan mengharapkan nol galat, lalu `tests/warga/migrasi_beku.test.mjs` (sudah ada) menolak migrasi SIPPA yang disunting sesudah hash-nya dicatat.
- **Rute (L5, L6)** diuji di Miniflare karena perilakunya bergantung pada `db.batch`, R2, header, dan sesi. Di sini basis data baru per berkas uji, tanpa ROLLBACK, dan uji tidak menetapkan apa pun di luar berkasnya.

### 1.3 Perintah ringkas

| Tujuan | Perintah |
| --- | --- |
| Semua uji web | `npm run uji && npm run uji:sippa` (setelah `uji:sippa` dirangkai ke `uji`, cukup `npm run uji`) |
| Hanya SIPPA cepat | `npm run uji:sippa && node --test tests/warga/sippa_skema.test.mjs tests/warga/sippa.test.mjs tests/warga/sippa_alur.test.mjs tests/warga/gerbang.test.mjs` |
| Pipeline | `for s in bersama zona sel22 nasional respons hidraulika pemicu aoi pilot_cek; do python3 scripts/data/sippa/$s.py uji \|\| exit 1; done` |
| Pemilik berkas | `npm run uji:agen` (memuat `gerbang-ilmu-agent.test.mjs`: tiap berkas kode tepat satu pemilik) |
| Buku dan deck | §5.1 dan §5.2 |
| Uji diri gerbang buku | `cd data/kajian-bnpb && python3 qa/uji.py` |

### 1.4 CI

- Tidak ada workflow baru yang jalan tiap push (TEST.md butir 4). Uji node SIPPA menumpang `terbit.yml`, yang hanya jalan saat `public/**` (kecuali data), `src/**`, `wrangler.jsonc`, atau `migrations/**` berubah, dan memang harus hijau sebelum deploy.
- Self-check Python SIPPA menumpang `data.yml` sebagai `python3 scripts/data/sippa/<skrip>.py uji && python3 scripts/data/sippa/<skrip>.py`, pola baris `kalibrasi.py` di workflow itu. Gagal self-check = keluaran lama di R2 dibiarkan dan langkah menulis `::error`, bukan `::warning`, karena keluaran SIPPA dibaca layar perencanaan.
- Buku dan deck tidak masuk CI; build kirim dijalankan sesi induk dengan `wajib_lolos` yang sudah memanggil `periksa.py --ketat --berkas-saja`.

---

## 2. Kriteria terima per fitur dan per rute

### 2.1 Kasus acuan rumus (dipakai JS dan Python)

Berkas `tests/sippa/fixtures/acuan.json` memuat masukan dan keluaran yang diharapkan. `hitung.test.mjs` mencocokkan `SippaHitung` ke nilai harapan dengan toleransi relatif 1% (PRD §9.3). `kembar.test.mjs` mencocokkan JS ke Python dengan toleransi relatif 0,1%, karena dua implementasi rumus yang sama tidak punya alasan berbeda lebih dari pembulatan; selisih di atas 0,1% berarti salah satu menyimpang, walau keduanya masih dalam 1% dari acuan.

Nilai di bawah dihitung ulang 25 Okt 2026 dengan rumus PRD §9.3 dan DESAIN-TEKNIS §5.3 (h_f Hazen-Williams 10,67 L Q^1,852 / (C^1,852 D^4,871); TDH = Δz + h_f + K v²/2g + sisa x 10,197, ditambah 3,5 m hisap bila `hisap: true`; P = ρ x g x Q x TDH/η; solar = kW x 0,25 / 0,84). Kolom "PRD lama" mencatat angka PRD versi 1; semua selisih sudah dibetulkan di PRD §6.2 dan §9.3 pada penyelarasan 25 Okt 2026. Kunci `acuan.json` mengikuti id DESAIN-TEKNIS §5.8 (K1 = H1, K2 = H2, K3 = H3, K4 = H4, K5 = H5).

| Kasus | Masukan | Diharapkan (kunci `acuan.json`) | PRD lama | Status |
| --- | --- | --- | --- | --- |
| K1 HDPE OD160 SDR11 | OD 160, SDR 11, Q 2.000 L/min, L 2.000 m, Δz +10 m, sisa 2 bar, ΣK 5, C 130, η 0,65, T 35 °C, `hisap: false` | `id_mm` 130,91; `v` 2,477 m/s; `hf` 95,45 m; `tdh` 127,41 m; `p_pompa_bar` 12,49; batas kerja 11,12 bar (0,88 x 16 x 0,79); `vonis` NO-GO; `gerbang` memuat H-TEKANAN keras | ID 130,9; h_f sekitar 96; sekitar 12,4 bar; NO-GO | cocok dalam 1% bila `hisap: false`. Dengan `hisap: true` tekanan 12,84 bar (3,5% dari 12,4): acuan wajib menulis tanda `hisap` secara eksplisit |
| K2 HDPE OD200 SDR11 | sama dengan K1, OD 200 | `id_mm` 163,64; `hf` 32,19 m; `tdh` 63,23 m (`hisap: false`) atau 66,73 m (`hisap: true`); `p_pompa_bar` 6,20 atau 6,54; tidak ada H-TEKANAN | sekitar 6,3 bar | **tidak cocok 1%** pada kedua tanda hisap (1,6% dan 3,8%). Acuan memakai angka hitung ini; teks PRD dan buku dibetulkan |
| K3 contoh G-2 paket pemilik | D 0,16 m, C 130, Q 2.000 L/min, L 2.000 m, Δz +10 m, ΣK 5, sisa 2 bar, η 0,65, `hisap: false` | `hf` 35,91 m; `tdh` 67,01 m; `p_pompa_bar` 6,57; `hp` 45,2; solar 10,03 L/jam | 35,91; 67,00; 6,57; 45,2; 10,03 | cocok |
| K4 relay DN100 | ID 100 mm, Q 10 L/s, L 1.000 m, C 130 | `hf` 19,06 m | sekitar 17 m | **tidak cocok 1%** (12%). 17 m hanya keluar pada C sekitar 140 (16,6 m). Acuan memakai 19,06 m pada C 130; slide C2 dan teks buku memakai token `{{angka:sippa.hid.dn100_10ls.hf_m_per_km}}` (KB Bab 7), bukan "17" |
| K5 volume isi DN100 | ID 100 mm, L 1.000 m, Q 10 L/s | `v_isi_m3` 7,854; `t_tiba_menit` 13,09 | 7,85 m3; 13 menit | cocok |
| K6 = H7 bawaan kalkulator | layflat DN100 ID asumsi 96 mm, Q 300 L/min, L 1.000 m, Δz +2, ΣK 5, sisa 3 bar, `hisap: true`, pompa kelas 1.500, 8 lance | `p_pompa_bar` 4,183; `p_ujung_bar` 8,817; `serap_lpm` 320; tanpa gerbang keras; `vonis` KONDISIONAL | 600 L/min (selalu NO-GO) | bawaan diputus 300 L/min (PENYELARASAN butir 6) |
| K7 = H8 kasus ajar | K6 dengan Q 600 L/min | `p_pompa_bar` 5,868; gerbang H-SERAP keras; `vonis` NO-GO | | wajib ada sebagai uji penolakan |

Kasus fungsi lain di `hitung.test.mjs` (nilai harapan dihitung tangan, dicatat di uji):

| Fungsi | Masukan | Harapan | Yang ditolak |
| --- | --- | --- | --- |
| `idLayflat(100, null)` | | `{id: 96, asumsi: true}` | |
| `kuantil([1..10], p)` | p 0,1 / 0,5 / 0,9 | 1,9 / 5,5 / 9,1 (tipe 7, sama dengan `numpy.percentile`) | n < 5 memberi label `n_kecil: true` |
| `bandingRerata(a, b)` | a = 10,12,…,24 (n 8); b = 8,9,…,15 (n 8) | selisih 5,5; se 1,936; df Welch 10,29; t kritis tabel df 10 = 2,228 (df dibulatkan ke bawah); CI95 [1,19; 9,81] | n 7 di salah satu lengan memberi `belum_bisa_diputus` |
| `bandingProporsi(2, 10, 6, 10)` | | Agresti-Caffo: selisih -0,333; CI95 [-0,705; 0,038] (memotong nol) | |
| `crf(0,08; 5)` | | 0,25046 | |
| `npv`, `bcr`, `impas` | CAPEX 5.000, O 700/th, B 2.000/th, r 8%, H 5 | AF 3,99271; NPV 190,52; BCR 1,0244; impas 1.952,28 | H 0 atau 16 ditolak (rentang 1–15) |
| `biayaPerHa` | CAPEX 5.000 juta, umur 5, r 8%, OPEX 700 juta, regu 300 juta, ha 100 | 22,52 juta/ha | ha 0 memberi `null` dan alasan, bukan Infinity |
| `neracaAir` | stok 500 m3, Q95 8 L/s, Q_eko 5, Q_api 10, evap 10 m3/hari, 3 hari | stok hari 1 = -114,8 m3; H-AIR keras "Sumber habis pada hari ke-1"; G1 syarat (8 < 15) | Q negatif ditolak |
| `joukowsky(1,5; 300)` | | 4,5 bar | |
| `bbm(kw, 'bensin', 24, 2)` | | 1.056 L; `co2` 2.439,4 kg | jenis selain bensin/solar ditolak |
| `zona` | (1,0; 3,0), (1,0; 6,0), (3,0; 3,0), (3,0; null), (2,5; 1,0), (1,0; 5,0), (1,0; null) | A, B, C, D, C, B, B | lihat §4.2 soal operator ambang |
| `zonaTerverifikasi` | kompleks dengan `jalan_km_utama` 7, `jalan_km_semua` 2, air 1 | cek `lolos` musim hujan = A; cek `gagal` atau tidak ada = B | cek musim kemarau saja tidak menaikkan zona |
| `saranSarana` | enam kompleks fixture, satu per aturan, plus satu kompleks zona D dengan `jam_tiba` 7 dan api aktif | aturan 1 sampai 6 sesuai tabel PRD §9.4.2; kompleks D berapi memberi aturan 1 (urutan dari atas menang) | tiap saran punya `alasan[]` berangka minimal satu |
| `matriksRespons` | satu kasus per tingkat §5.4, dan dua kasus tepat di batas antar-tingkat | tingkat sesuai tabel | FRP negatif ditolak |
| `gerbangHidraulika` | K1; sisa ujung 0,8 bar; 1 ≤ sisa < 2; 600 L/min dengan 8 lance (K7); daya poros > 0,85 x rating; v 3,4 m/s; HDPE di perimeter aktif; kedalaman 5,1 m | H-TEKANAN keras; H-SISA keras; H-SISA2 syarat; H-SERAP keras ("Debit 600 L/min tidak terserap 8 lance (paling banyak 320 L/min)"); H-DAYA keras; H-KECEPATAN syarat; H-PANAS keras; kedalaman 5,1 ditolak di masukan sebelum hitung | `vonis` tidak pernah mengembalikan "GO" (diuji untuk 500 masukan acak berbenih) |

### 2.2 Mesin Studio dalam 0,5% dari angka jalan-ulang baca-C

`tests/sippa/studio_mesin.test.mjs` memuat `public/pipa/studio_mesin.js` lewat `vm` dan mencocokkan `defaultState` plus tiga preset ke baca-C C1.4 dengan toleransi relatif 0,5%:

| Ukuran | S1 Portable | S2 Semi-permanen | S3 Backbone |
| --- | --- | --- | --- |
| CAPEX | Rp5,23 M | Rp9,69 M | Rp19,77 M |
| OPEX per tahun | Rp745 juta | Rp768 juta | Rp1,152 M |
| TCO 5 tahun | Rp8,96 M | Rp13,53 M | Rp25,54 M |

Ditambah: tekanan semi 5,39 bar; impas semi Rp3,19 M per tahun; Monte Carlo semi P10/P50/P90 Rp12,06/14,10/16,07 M (800 sampel, benih FNV-1a + xorshift dari hash keadaan); uji silang OD160 SDR11 2.000 L/min 2 km +10 m NO-GO tekanan dan OD200 lolos.

Invarian dan penolakan:

- **Hanya menambah hambatan.** Untuk 200 keadaan acak berbenih tetap: `keras(gerbangSippa(assess(s)))` ≥ `keras(assess(s))` dan himpunan kode keras asli adalah himpunan bagian dari himpunan sesudah. Pesan gagal mencetak benih dan kode yang hilang.
- **Deterministik.** `assess(s)` dua kali untuk keadaan sama memberi P10/P50/P90 identik bit per bit; keadaan berbeda satu medan memberi benih berbeda.
- **Angka tidak berubah.** Konstanta `G`, `BASES`, `PIPE`, `COST`, `QBASE`, `N` di berkas port sama dengan salinan beku `tests/sippa/fixtures/studio_konstanta.json` yang diekstrak sekali dari berkas pemilik. Tiap perbedaan di luar baris berkomentar `SIPPA:` gagal.
- **Larangan keputusan 50 dan 60.** Preset S2 dan S3 selalu memberi gerbang keras `jaringan_permanen`, S1 tidak; kedalaman 5,1 m memberi H-DALAM; status "GO" tidak muncul di keluaran mana pun; skor tertinggi pada kolom NO-GO tidak pernah disorot sebagai terbaik.
- **Heli menunggu.** `sippa.heli.biaya_jam` berstatus `menunggu`, tidak masuk TCO, dan nilai Rp130 juta/jam tidak ada di berkas (grep di uji).
- **Hitungan skema nyata.** Teks "30 dimensi/93 pilihan" tidak ada; jumlah dimensi dan pilihan dihitung dari skema dan sama dengan 32 dan 100.

### 2.3 Kriteria per layar (PRD §9.4 sampai §9.11)

Format: Diberikan (keadaan awal) / Ketika (aksi) / Maka (hasil terukur). Kolom Bukti menyebut uji yang membuktikannya; "peramban" berarti protokol §2.6.

#### Ringkas `/pipa`

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| R1 | dummy layar Ringkas terisi | `GET /api/sippa/ringkas` dan rute kartu | empat kartu berangka, tiap angka bukan nol dan membawa `sumber` dan `per` | `sippa.test.mjs` "dummy Ringkas: tiap kartu berangka" |
| R2 | rute log menjawab 500 | layar dimuat | kartu Pilot tampil Galat dengan kode HTTP dan tombol "Coba lagi"; tiga kartu lain tetap tampil | `keadaan.test.mjs` + peramban |
| R3 | `zona.json` belum di R2 | layar dimuat | kartu Zona tampil Kosong dengan kalimat "Data kelayakan belum diunggah pipeline (`data.yml`)" | `sippa.test.mjs` 404 + `keadaan.test.mjs` |

#### Peta `/pipa/peta`

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| P1 | `zona.json` dari keluaran pipeline | kartu judul dan ringkasan zona dirender | angka sama persis dengan `zona.json` (tidak dihitung ulang di klien): versi `kendala.json` A188, jalan utama OSM A198, semua jalan OSM A469 untuk Kalteng | uji fungsi pembentuk judul di `hitung.test.mjs` membaca `data/sippa/keluaran/zona.json` |
| P2 | satuan "Per kompleks" aktif | sakelar ke "Per sel 2,2 km" | chrome segmen (`aria-checked`) berubah di handler; peta hanya memanggil `setLayoutProperty`/`setFilter`, tidak `addSource`; interaksi ≤ 200 ms | `gerbang-sippa.test.mjs` butir INP + peramban |
| P3 | versi Terverifikasi | 10 kompleks B punya cek jalan `lolos` musim hujan (dummy Peta) | ringkasan zona versi Terverifikasi berbeda dari Konservatif tepat pada kompleks yang dicek | `sippa.test.mjs` dummy Peta + `hitung.test.mjs` `zonaTerverifikasi` |
| P4 | kompleks terpilih | panel rincian dirender | status lahan tampil `lain`/`konsesi`/`konservasi`; tidak ada nama perusahaan (string dari kolom pemegang izin tidak ada di `kelayakan_kompleks.json`) | self-check `zona.py` menolak kolom nama perusahaan; `gerbang-sippa.test.mjs` |
| P5 | pengguna papan ketik | tombol "Daftar" | tabel kompleks dipaginasi 50, bisa diurutkan, tiap baris bisa difokus dan membuka rincian dengan Enter | peramban (`read_page`) |
| P6 | zona dirender | legenda dan simbol peta | tiap zona punya warna palet PRD, pola isi (penuh, cincin, setengah, silang), dan huruf A–D (keputusan 52) | `gerbang-sippa.test.mjs` (lapisan zona memasang huruf dan pola) + peramban, tangkapan layar gelap dan terang |
| P7 | rincian kompleks | "Hitung hidraulika untuk kompleks ini" | `/pipa/hitung?kompleks=<id>` terisi L = jarak air x 1,2 dan Δz = -(beda elevasi), H-DSM catatan tampil | `hitung.test.mjs` fungsi pembentuk query |

#### Kalkulator `/pipa/hitung`

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| H1 | masukan K1 | dihitung | kartu vonis NO-GO merah dengan pesan H-TEKANAN berangka "Tekanan 12,5 bar melewati batas kerja 11,1 bar …" dalam format id-ID | `hitung.test.mjs` |
| H2 | kotak kedalaman | pengguna mengetik 5,1 | nilai ditolak dengan pesan "Injeksi lebih dari 5 m tidak termasuk SIPPA (keputusan 50)"; hasil tidak dihitung | `formulir.test.mjs` + `gerbang-sippa.test.mjs` butir (3) |
| H3 | kedalaman 3–5 m | dihitung | pil "lengan uji" tampil | `hitung.test.mjs` |
| H4 | tiap masukan tabel PRD §9.4.3 | nilai di bawah rentang, di atas rentang, bukan angka, kosong pada medan wajib | ditolak dengan pesan rentang; rentang di klien sama dengan rentang fungsi murni (satu konstanta) | `formulir.test.mjs` iterasi semua medan |
| H5 | "Salin tautan" | tautan dibuka di tab baru | semua masukan pulih identik dan hasil identik | `hitung.test.mjs` round-trip query |
| H6 | pengguna mengubah debit | ketikan | hasil berubah; grafik digambar lewat `nanti()`; interaksi ≤ 200 ms laptop, ≤ 100 ms tidak diwajibkan (bukan form lapangan) | `gerbang-sippa.test.mjs` + peramban |

#### Pemicu `/pipa/pemicu`

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| M1 | fixture `iklim_outlook` anomali -25% dan `fwi_ansambel` `ps` ≥ 0,5 pada 3 dari 7 hari | `pemicu.py` | tingkat PRA-POSISI; dengan titik panas di kompleks zona A/B terbakar ≥ 3 tahun = GELAR | self-check `pemicu.py uji` |
| M2 | `fwi_ansambel.json` lebih tua dari 36 jam | `pemicu.py` | PRA-POSISI dan GELAR tidak dihitung, tingkat tertinggi SIAGA, alasan "data ansambel basi" | self-check (uji penolakan) |
| M3 | anomali -19,9% | | NORMAL (ambang -20% tidak terlewati) | self-check (batas) |
| M4 | "Buat rencana pra-posisi" | POST gerak `rencana: 1` | gerak tampil di Kit sebagai terencana sampai `tiba` diisi | `sippa.test.mjs` |

#### Kit `/pipa/kit`, `/pipa/kit/:id`

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| T1 | tabel transisi DESAIN-TEKNIS §6.2 | tiap pasangan (dari, ke) dari 7 x 7 status, oleh W, K, dan M | 49 pasangan diuji: yang sah 201, yang tidak sah 400 dengan nama dua status; `hilang`/`pensiun`/`ditemukan`/`koreksi` oleh W = 403, oleh M = 201; K hanya `gelar`/`bongkar`/`kembali` untuk kit tugasnya | `sippa.test.mjs` "transisi kit 49 pasangan" |
| T2 | gerak sah | POST gerak | `db.batch` menulis `sippa_gerak` dan `sippa_kit.status` bersama; bila sisipan gerak gagal (CHECK), status kit tidak berubah | `sippa.test.mjs` (paksa CHECK gagal dengan `eta_jam` 721) |
| T3 | tugaskan kit | POST tugas | kode 26 heks tampil sekali; D1 hanya menyimpan sha256 (kolom `kode_sha` 64 heks, string kode tidak ada di baris mana pun) | `sippa.test.mjs` |
| T4 | satu dari 40 komponen hilang | rekap | persen kehilangan musim 2,5%; ambang 5% (U8) dan 20% (K-15) dibandingkan | `sippa_alur.test.mjs` |
| T5 | QR | label dicetak | teks `SIPPA:<kode>` dan `SIPPA:<kode>:<kode BOM>`; tidak memuat kode penugasan | `gerbang-sippa.test.mjs` grep pembangkit label |
| T6 | daftar komponen | dirender | kolom kelas kinerja; merek hanya di kolom "rujukan datasheet" | `selera-angka` + peramban |

#### Log `/pipa/log`

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| G1 | dummy Log (≥ 6 kelas I, 3 kelas II, 1 kelas III) | rekap | kelas I tampil p50/p90; kelas II dan III berpil "n kecil, belum bisa memutus G3" | `sippa.test.mjs` + `hitung.test.mjs` |
| G2 | baris dummy dan nyata | staf nyata `GET /api/sippa/log` | nol baris `dummy = 1` | `sippa.test.mjs` |
| G3 | log keliru | koreksi | baris baru dengan `koreksi_dari`; baris lama utuh; rekap memakai baris koreksi | `sippa_alur.test.mjs` |
| G4 | sel CSV diawali `=`, `+`, `-`, `@` | `GET /api/sippa/log.csv` | sel diberi awalan `'` | `sippa.test.mjs` |
| G5 | kiriman dengan `jam_kirim` 11 menit di depan jam server; kiriman lain dengan satu butir `waktu_klien` 11 menit di depan; kiriman ketiga dengan butir antre 6 jam di belakang | kirim lalu rekap | dua kasus pertama tersimpan `jam_klien_meleset = 1` dan tampil bertanda; kasus ketiga `jam_klien_meleset = 0` (DESAIN-TEKNIS §6.1.5) | `sippa.test.mjs` |
| G6 | data pilot V1, V2, V3 (DESAIN-TEKNIS §5.8) | `vonisPilot` dan kartu vonis pilot | DAPAT DIPAKAI; DAPAT DIPAKAI BERSYARAT (butir 5 gagal); BELUM DAPAT DIPAKAI (butir 6 gagal); butir data kosong tampil "data belum lengkap" dan dihitung gagal | `hitung.test.mjs` + `laporan_isi.test.mjs` (templat pilot) |

#### Form lapangan luring `/pipa/lapangan`

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| F1 | mode pesawat | operator mengisi sesi 6 tahap dengan medan vonis pilot, probe (termasuk tahap `sesudah`), BBM | butir tersimpan di IndexedDB `sippa-antre`; status "3 isian menunggu sinyal" diumumkan `aria-live="polite"` | peramban (DevTools offline) |
| F2 | sinyal kembali | peristiwa `online` | antrean terkirim satu kali; jawaban `diterima` memuat semua id; D1 berisi tepat satu baris per id | peramban + `sippa.test.mjs` "kirim lapangan dua kali = satu baris" |
| F3 | butir yang sama dikirim ulang dengan isi berbeda; butir lain melanggar CHECK | kirim | jawaban `ganda` memuat id pertama dan isi pertama dipertahankan (`ON CONFLICT(id) DO NOTHING`); butir pelanggar CHECK masuk `ditolak` dengan alasan, tidak dilaporkan ganda (DESAIN-TEKNIS ADR-08) | `sippa.test.mjs` |
| F4 | butir ditolak (mis. urutan waktu terbalik) | kirim | butir tetap di antrean dengan alasan server dan tombol "Perbaiki"; butir lain dalam kiriman yang sama tetap diterima | `sippa.test.mjs` + `formulir.test.mjs` |
| F5 | IndexedDB gagal | simpan | butir teks jatuh ke `localStorage` dalam `try/catch`; foto ditolak dengan pesan "foto tidak bisa disimpan luring di peramban ini" | `antre.test.mjs` (vm dengan IndexedDB palsu yang melempar) |
| F6 | tugas `lengan_dalam = 0` | form probe | kedalaman 150–500 cm tidak muncul; kiriman probe 300 cm dari tugas ini ditolak server | `formulir.test.mjs` + `sippa.test.mjs` |
| F7 | tombol stopwatch | ketukan | tombol berikutnya aktif hanya sesudah yang sebelumnya; interaksi < 100 ms di ponsel kelas menengah (CPU 4x lambat) | peramban |
| F8 | kode dicabut di tengah sesi | kirim berikutnya | 403; antrean tidak dihapus; pesan "Kode penugasan sudah dicabut" | `sippa.test.mjs` |

#### A/B `/pipa/ab`

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| B1 | dummy A/B (lance n 10 lebih baik, surfaktan n 6, sekat n 8 setara) | ringkasan | tiga vonis LULUS, BELUM BISA DIPUTUS, TIDAK LULUS muncul sekaligus | `sippa.test.mjs` + `hitung.test.mjs` |
| B2 | data pilot Okt 2026 | ringkasan | pil "pilot, n kecil"; tidak pernah vonis G4 | `hitung.test.mjs` |
| B3 | semua angka efikasi | `status` unggahan `draf` | pil "hipotesis" | `gerbang-sippa.test.mjs` + `selera-angka` |

#### Studio, 3D, Telemetri, Laporan, Data

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| S1 | tab "Bandingkan semua" | dimuat | kolom S0, S0B, S1, S2, S3 dan skenario tersimpan tercentang (≤ 6); nilai terbaik disorot hanya di kolom bukan NO-GO; manfaat bawaan 0 | `studio_mesin.test.mjs` fungsi matriks banding |
| S2 | slider digeser | input | Monte Carlo jalan di Web Worker; utas utama tidak punya long task > 50 ms dari handler itu | peramban (PerformanceObserver `longtask`) |
| S3 | impor JSON `karhutla-decision-v1` | impor | keadaan pulih; berkas bukan JSON atau > 32 KB ditolak dengan pesan | `studio_mesin.test.mjs` |
| D1 | adegan 3D | kedalaman 5,1 | ditolak; profil tekanan per 50 m sama dengan `hidraulika()`; front basah monoton naik; komponen tidak saling tumpuk | `adegan_logika.test.mjs` |
| D2 | peramban tanpa WebGL | dimuat | diagram SVG 2D dengan pita "Peramban ini tidak mendukung WebGL" | peramban (WebGL dimatikan) |
| D3 | pindah layar | keluar dari 3D | `dispose` geometri dan tekstur; jumlah konteks WebGL kembali 0 | peramban |
| E1 | belum ada perangkat | layar Telemetri | Kosong "Belum ada perangkat terdaftar. Telemetri dipasang mulai 2027 (§6.6)." | `keadaan.test.mjs` |
| E2 | pesan uji gateway dan bentuk datar pemilik | POST telemetri | `dariDatar()` menghasilkan baris identik dengan bentuk bersarang | `sippa.test.mjs` |
| E3 | dry-run 30 detik, debit < 20% 2 menit, tekanan > 0,88 x PN x f, suhu > 50 °C tahap 24 jam, CO > 35 ppm 15 menit, BBM < 20%, diam > 3 x interval | seri uji | tiap alarm terbuka sekali dan tertutup saat pulih | `sippa.test.mjs` (satu kasus per kode alarm) |
| L1 | lima templat | `isiLaporan(jenis, data)` | blok terstruktur memuat tiap isi minimum PRD §9.10; tiap angka punya sumber dan waktu; tanpa "terbukti", em dash, U+00B7; nama berkas `sippa-<jenis>-<prov>-<YYYYMMDD>.pdf`; kaki halaman persis | `laporan_isi.test.mjs` |
| L2 | laporan mingguan dari alur §2.5 | `isiLaporan('mingguan', …)` | jam pompa, m3 banjir, dan kehilangan sama persis dengan tabel D1 | `sippa_alur.test.mjs` |
| L3 | PDF hasil | dibuka | hanya logo BNPB (satu gambar logo, hash sama dengan `public/inti` logo BNPB) | `laporan_isi.test.mjs` daftar aset gambar |
| A1 | `/pipa/data` | dimuat | teks "Batas pemakaian alat" dibaca dari `public/pipa/batas.js`; Lampiran K buku dibangun dari berkas yang sama (hash teks sama) | `gerbang-sippa.test.mjs` |

#### Pemeliharaan `/pipa/pelihara` (keputusan 56)

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| P1 | `TEMPLAT_BOM` (gambut, mineral, banjir) | `kelasDari` tiap awalan | tiap awalan tepat satu kelas K1–K5; awalan baru tanpa kelas membuat uji merah dengan nama awalannya | `pelihara.test.mjs` |
| P2 | inspeksi terakhir 0, 166, 180, 200 hari lalu untuk interval 180 hari; satu butir tanpa inspeksi | `jadwal` | aman, segera, terlambat (tepat jatuh tempo = terlambat), terlambat, belum_pernah | `pelihara.test.mjs` |
| P3 | pompa 49,9 dan 50,0 jam sejak servis, inspeksi 10 hari lalu | `jadwal` | 49,9 jam aman; 50,0 jam terlambat (batas jam menang atas batas hari) | `pelihara.test.mjs` |
| P4 | skor 0–3 | `skorKeKondisi` | sama persis dengan enum CHECK `sippa_komponen.kondisi` yang dibaca dari `migrations/0056_sippa_inti.sql` | `pelihara.test.mjs` |
| P5 | `cekAset("sumur_bor", {zona_konservasi:"kritis"})`; sama dengan `rekomendasi_bg`; zona `aman` tanpa rekomendasi | panggil | galat medan `rekomendasi_bg`; lolos; lolos | `pelihara.test.mjs` |
| P6 | BOM kit gambut PRD §6.1 dan laju bawaan | `biayaTahun` | laju tertimbang dalam 5–8%; laju K2 diubah ke 10% membuat uji gagal dengan angka tertimbangnya; `stokMin("C-101", 20 kopling, 60)` = hitung tangan | `pelihara.test.mjs` |
| P7 | dummy Pemeliharaan | layar dimuat | empat status muncul sebagai teks (bukan warna saja); kit dengan komponen K1 skor 2 berpil "tidak laik gelar" di Pemeliharaan, Kit, dan Pemicu | `sippa.test.mjs` + peramban |
| P8 | staf menyimpan inspeksi komponen skor 2 | `POST /api/sippa/inspeksi` | `sippa_komponen.kondisi = rusak_berat` dan `dicek` = waktu inspeksi; layar Kit menampilkan kondisi sama tanpa muat ulang data lain | `sippa.test.mjs` |
| P9 | stok saldo 10, `delta` -11 | `POST /api/sippa/stok` | 409 "stok tidak cukup"; saldo tetap 10; `delta` -10 lalu saldo 0 | `sippa.test.mjs` |
| P10 | operator berkode untuk kit A | kirim butir `inspeksi` komponen kit B, dan butir jenis `tahunan` untuk kit A | keduanya `ditolak` per butir dengan alasan; butir `pasca_gelar` kit A `diterima` | `sippa.test.mjs` |

#### Air tanah `/pipa/air` dan Akses `/pipa/akses` (keputusan 56)

| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| A1 | sumur zona `rusak` tanpa `rekomendasi_bg` | `POST /api/sippa/aset` | 400 `{galat}` menyebut medan; tidak ada baris; bila rute dilewati (SQL langsung) CHECK menolak | `sippa.test.mjs` + `sippa_skema.test.mjs` |
| A2 | inspeksi `mutu_air` tanpa `e_coli_cfu`; dengan `e_coli_cfu: 3` | simpan | pertama 400; kedua 201 dan pil "tidak laik minum" di layar Air tanah | `sippa.test.mjs` |
| A3 | `cat.json` belum diunggah | layar Air tanah | keadaan Kosong "Data cekungan air tanah belum diterima dari Badan Geologi."; tabel sumur tetap tampil | `keadaan.test.mjs` + peramban |
| A4 | peta Air tanah | dimuat | tiap status zona punya label kata dan pola; tombol "Daftar" membuka tabel yang memuat semua titik | `gerbang-sippa.test.mjs` + peramban |
| K1 | `jembatan_dibi.json` | layar Akses | kartu memakai `ringkas.total_2018_2025` (3.833) dan `total_2025` (1.088); angka sama dengan `rehab.dibi.jembatan_rusak.*` | `sippa.test.mjs` |
| K2 | teks antarmuka dan templat | grep | "Jembatan Merah Putih" selalu diikuti "Presisi" atau "Polri" dalam kalimat yang sama | `gerbang-sippa.test.mjs` |
| K3 | jembatan darurat tanpa `pemilik_aset` | `POST /api/sippa/aset` | 400; tanpa `rencana_ganti` diterima tetapi berpil "tanpa jadwal ganti" dan terhitung di chip | `sippa.test.mjs` |
| K4 | baris `program_jembatan.json` tanpa `rujukan` | `jembatan.py uji` | skrip keluar bukan 0 dengan nama baris | `jembatan.py uji` |

### 2.4 Matriks rute (DESAIN-TEKNIS §4.3, ringkasan di PRD §9.7.3)

Tiap rute di tabel DESAIN-TEKNIS §4.3 wajib punya, di `tests/warga/sippa.test.mjs`, kasus **positif** (peran sah, jawaban dan bentuk badan sesuai), **peran salah**, **masukan liar**, **batas ukuran** (bila menerima badan), dan **batas laju** untuk rute tulis. Rute GET staf tidak dibatasi laju (ADR-06), jadi untuk GET diuji bahwa 700 panggilan berturut tidak pernah 429 dan tidak menulis baris `laju_bnpb`. Batas laju tulis diuji tanpa ratusan panggilan: uji mengisi `laju_bnpb (kunci, aksi, waktu)` langsung sampai batas, lalu satu panggilan berikutnya harus 429 dan panggilan dengan kunci lain tetap sukses.

Peran uji dibuat lewat rute sungguhan: admin (`x-admin-token`), admin moderator (M), Super Admin, staf `pusdalops`, `koordalops`, `pimpinan`, `verifikator`, staf `pusdalops` berwilayah 61, tamu, kode penugasan sah (header `x-kode`), kode dicabut, kode kedaluwarsa, token perangkat sah dan dicabut.

| Rute | Positif | Peran salah DITOLAK | Masukan liar DITOLAK | Ukuran | Laju |
| --- | --- | --- | --- | --- | --- |
| `GET /pipa`, `/pipa/<layar>`, `/pipa/kit/:id` | pusdalops 200, `cache-control: private, no-store`, header `CSP_SIPPA`, `x-robots-tag: noindex, nofollow` | tamu 303 ke `/admin/pantau?ke=<jalur>` (bukan `/admin/masuk`); `verifikator` 403 polos tanpa `Location` (`admin-403-pantul.test.mjs` diperluas); di host `centurisk97.id` tamu `/pipa` 303 dan `/pipa/lapangan` 200 | `<layar>` di luar `LAYAR_SIPPA` 404; `:id` 15 heks atau huruf besar 404; `/pipa/x/y` 404 | | tidak |
| `GET /pipa/lapangan` | tamu 200, `CSP_LAPANGAN`, `referrer-policy: no-referrer` | | | | tidak |
| `GET /admin/pipa` | 303 ke `/pipa` | tamu tidak melihat isi | | | tidak |
| `public/admin/pantau.js` sesudah masuk staf | `ke=/pipa/peta` dialihkan ke `/pipa/peta` | | `ke=https://jahat.example`, `ke=//jahat`, `ke=/admin` tidak dialihkan (hanya `^/pipa(/|$)`) | | |
| `GET /api/sippa/data/<nama>` | 200 aliran JSON `private, no-store`; 404 `{status:"belum_ada"}` bila belum diunggah | tamu 401 **identik** (status, badan, panjang) untuk nama yang ada dan tidak ada di R2 | nama di luar 10 kunci tetap 404 sesudah hak dicek; `../` tidak pernah sampai R2 | objek > 8 MB = 500 | tidak |
| `GET /api/sippa/ringkas`, `kit`, `kit/:id` | bentuk badan sesuai; `kit/:id` tidak memuat kode penugasan | tamu 401; staf wilayah 61 tidak melihat kit 62 (404 identik) kecuali selama gerak terbuka antar-provinsi 61–62 | filter `status`/`jenis`/`prov` di luar daftar 400 | | tidak |
| `POST /api/sippa/kit` | M 201 dengan komponen dari templat BOM | pusdalops 403; akun gerbang `AKUN_SITUS` 403 | kode `SIPPA-12`, `SIPPA-0001`, `SIPPA-901` (khusus dummy) 400; kode ganda 409; jenis liar 400; pemilik asal 81 huruf 400 | | 60 |
| `POST /api/sippa/kit/:id` | W 200 untuk lokasi/catatan | `pimpinan` 403; staf tanpa `x-pb: 1` 401 | medan `status` di badan 400 (status hanya lewat gerak) | | 600 |
| `POST /api/sippa/komponen/:id` | W 200, jejak per baris di `pantau_jejak` | `pimpinan` 403 | 101 perubahan 400; kode BOM liar 400; kondisi `hilang` tanpa catatan 400 | | 600 |
| `POST /api/sippa/gerak/:id` | W 201; K 201 untuk kit tugasnya dengan alasan `gelar`/`bongkar`/`kembali`; M 201 untuk `hilang`/`pensiun`/`ditemukan`/`koreksi` | K untuk kit lain 403; K alasan `pindah_banjir` 403; W alasan `hilang` 403 | transisi tidak sah 400; `eta_jam` 721 400; koordinat di luar kotak Indonesia 400; gerak saat rencana terbuka 409; `dari_status` basi (dua staf serentak) satu 201 satu 409 | | W 600, K 120 |
| `POST /api/sippa/tiba/:id` | W/K 200 sekali | K untuk gerak kit lain 403 | gerak `rencana = 0` 400; `tiba` sudah terisi 409 | | 120 |
| `POST /api/sippa/tugas`, `/tugas-cabut/:id` | W 201 + kode sekali dan tautan `/pipa/lapangan#k=`; cabut 200 | `pimpinan` 403 | `berlaku_hari` 31 400; nama regu 1 huruf 400; unsur liar 400 | | 60, 120 |
| `GET /api/sippa/lapangan/saya` | K 200 berisi tugas sendiri | kode salah 403 dan tercatat; > 300 tebakan salah per jam per hash IP 429; dicabut 403; kedaluwarsa 403 | kode 25 heks 403 | | tidak (hanya kegagalan dihitung) |
| `POST /api/sippa/lapangan/kirim` | K 200 `{diterima, ganda, ditolak, jam_server}` | kode tugas A tidak bisa menulis gerak kit tugas B (ditolak per butir) | id bukan UUID v4 ditolak per butir; 201 butir 400; `jam_kirim` 11 menit di depan diterima dengan `jam_klien_meleset = 1`; probe 600 cm ditolak per butir; probe 300 cm dari tugas `lengan_dalam = 0` ditolak per butir | badan 262.145 byte 413 | 120 per tugas |
| `POST /api/sippa/lapangan/foto` | K 201 `{foto_id}`, baris `sippa_foto`, kunci R2 `sippa-foto/<id16>` dari server; EXIF terbuang (byte GPS tidak ada di objek R2) | tanpa kode 403 | PNG, GIF, atau berkas `.jpg` berisi HTML 400 (`jenisBerkas` membaca byte); nama kunci dari klien diabaikan | 8.388.609 byte 413 | 60 per tugas |
| `GET /api/sippa/foto/:id` | B 200 dengan `content-type` dari baris dan `nosniff` | staf wilayah 61 untuk foto 62 404 identik | | | tidak |
| `GET /api/sippa/log`, `log.csv`, `probe.csv`; `POST /api/sippa/log` | B 200; W 201 | tamu 401; `pimpinan` POST 403 | `sejak` > `sampai` 400; urutan waktu terbalik 400 (trigger); sel CSV `= + - @` diberi `'`; koordinat CSV bawaan dibulatkan 0,01°, `presisi=penuh` hanya W | | tidak (GET), 60 (CSV), 600 (POST) |
| `GET`/`POST /api/sippa/jalan-cek`, `POST /api/sippa/aoi` | B 200; W 201 | `pimpinan` POST 403; staf wilayah 61 menulis `prov: "62"` 404 | musim/hasil liar 400; catatan 501 huruf 400; `kompleks_id` bukan `K[0-9]*` 400 | | tidak, 600, 120 |
| `GET /api/sippa/ab`, `ab.csv`; `POST /api/sippa/ab/unggah`; `POST /api/sippa/ab-status/:id` | W 201 `{unggah_id, n}`; M 200 status | pusdalops ubah status 403 | satu baris salah dari 2.000 = 400 `{galat, rincian:[{baris, kolom, alasan}]}` dan **0 baris** tersimpan; surfaktan > 0 di lengan `lance` 400; tanggal besok 400; sha sama 409; pemisah titik koma dikenali | 1.048.577 byte 413; 2.001 baris 400 | tidak, 60, 20, 20 |
| `GET`/`POST /api/sippa/skenario`, `/skenario-hapus/:id` | W 201; pembuat atau M hapus 200 (lunak) | staf W lain menghapus skenario orang lain 403 | nama 2 huruf 400; state bukan objek JSON 400 | state 32.769 byte 400 | tidak, 120, 120 |
| `GET`/`POST /api/sippa/laporan`, `/laporan-berkas/:id` | W 201; B 200 PDF `attachment`, `content-security-policy: sandbox` | tamu 401 | berkas tanpa awalan `%PDF-` 400; parameter bukan JSON 400 | parameter 8.193 byte 400; PDF 10.485.761 byte 413 | tidak, 30, tidak |
| `POST /api/sippa/telemetri` | D 202 `{diterima, ditandai, ganda}`; bentuk datar pemilik lewat `dariDatar()` sama dengan bentuk bersarang | token salah 401; token dicabut 401; > 300 token salah per jam per hash IP 429; tag milik kit lain atau tanpa padanan `tag_datar` ditandai `tag_asing` dan tidak disimpan | waktu 6 menit di depan ditolak; 31 hari lalu ditolak; satuan tidak cocok ditolak; nilai di luar `min_sah`–`maks_sah` **disimpan** dengan mutu 2; pesan sama dikirim ulang = `ganda` | 501 bacaan 400; badan 65.537 byte 413 | 120 pesan per pengirim (pesan ke-121 dalam sejam 429, dihitung dari baris `sippa_telemetri`) |
| `GET /api/sippa/telemetri`, `perangkat`, `alarm`; `POST /api/sippa/perangkat`, `/perangkat-cabut/:id`, `/alarm-tutup/:id` | B 200; M 201 + token sekali; W 200 tutup | pusdalops daftar perangkat 403 | `sejak` 31 hari lalu 400; tag `pt-101` huruf kecil 400; gateway tanpa token 400 | | tidak, tidak, tidak, 60, 60, 600 |
| `GET /api/sippa/aset`, `aset/:id`; `POST /api/sippa/aset`, `/aset/:id` (keputusan 56) | B 200; W 201/200 dengan jejak | tamu 401; `pimpinan` POST 403; staf wilayah 61 membaca aset 62 404 identik dan menulis `prov: "62"` 404 | kelas liar 400; atribut bukan objek 400; sumur zona kritis tanpa rekomendasi 400; koordinat di luar kotak 400; kode dari klien diabaikan | atribut 4.097 byte 400 | tidak, 120, 600 |
| `POST /api/sippa/inspeksi` | W 201; jejak satu baris | `pimpinan` 403; K lewat rute ini 401 (K hanya lewat `lapangan/kirim`) | skor 4 400; komponen bukan milik kit 400; `mutu_air` tanpa `e_coli_cfu` 400; `uji_tekanan` tanpa `tekanan_bar` 400 | hasil 2.049 byte 400 | 600 |
| `GET /api/sippa/pelihara`, `pelihara.csv` | B 200; CSV aman | tamu 401 | `kelas` liar 400 | | tidak, 60 |
| `GET`/`POST /api/sippa/stok` | B 200; W 201 | `pimpinan` POST 403 | delta 0 400; satuan liar 400; saldo negatif 409 | | tidak, 600 |
| `GET /pipa/aset/:id`, `/pipa/pelihara`, `/pipa/air`, `/pipa/akses` | pusdalops 200 | tamu 303; `verifikator` 403 | `:id` 15 heks 404 | | tidak |
| `POST /api/sippa/dummy/isi`, `/dummy/hapus` | SA 200 dengan hitungan per tabel; isi kedua untuk periode sama 409 | admin biasa 403 | `layar` di luar `LAYAR_SIPPA` + `ringkas`, `lapangan` 400 | | 30 |
| Semua `/api/sippa/*` tanpa tabel 0056–0059 | 503 "Migrasi SIPPA belum diterapkan di basis data"; rute lain repo (contoh `/api/titik`, `/api/pipa/lapangan`) tetap 200 | | | | |
| `/api/pipa/lapangan`, `/api/pipa/jejak` (milik `src/pipa.js`) | tidak berubah perilakunya; uji lama tetap hijau | | | | |

Invarian lintas rute (satu uji masing-masing):

- Tidak ada jawaban `/api/sippa/*` yang memuat string kode penugasan atau token perangkat selain jawaban pembuatnya yang pertama.
- Tiap jawaban galat memakai `gagal(status, pesan)` dan berbadan JSON `{galat}`; tidak ada jejak tumpukan.
- Tiap tulisan sukses menambah tepat satu baris jejak di `pantau_jejak` (atau satu per baris komponen).
- Staf nyata tidak pernah menerima baris `dummy = 1` dari rute baca mana pun (iterasi semua rute GET).
- Data SIPPA tidak muncul di `/api/v1/*` dan `llms.txt` (uji grep jawaban).

### 2.5 Alur lintas-tabel (satu uji ujung ke ujung)

`tests/warga/sippa_alur.test.mjs`, langkah berurutan dengan `berantai()`, satu basis data Miniflare:

1. Admin membuat `SIPPA-001` jenis `gambut` (komponen dari templat BOM, n komponen awal dicatat).
2. Pusdalops menugaskan kit ke regu (kode 26 heks diterima sekali).
3. Operator `POST /api/sippa/lapangan/kirim`: log gelar 6 tahap berurutan dengan medan vonis pilot, probe `sebelum`, `sesudah`, dan `24j` di 4 kedalaman, BBM `keluar`.
4. Operator `POST /api/sippa/gerak/:id` alasan `gelar` lalu `kembali`.
5. Pusdalops `POST /api/sippa/gerak/:id` alasan `pindah_banjir` (pengangkut `yontp`, ETA 48 jam, `rencana: 1`); gerak lain untuk kit itu 409 selama terbuka; operator konfirmasi `POST /api/sippa/tiba/:id`.
6. Operator log `banjir` dengan `banjir_m3` 1.200 dan `jam_pompa` 10.
7. Gerak kembali ke `gudang`; cek komponen dengan satu `hilang`.
8. Rekap: log memuat dua sesi; kehilangan musim = 1 / n_awal; `isiLaporan('mingguan')` memuat jam pompa, m3 banjir 1.200, dan kehilangan yang sama persis dengan hitungan SQL langsung.
9. Tiap langkah 1–7 punya baris `pantau_jejak`; `sippa_gerak`, `sippa_log_gelar`, dan `sippa_bbm` menolak UPDATE dan DELETE sesudahnya (kecuali `tiba` dari kosong).
10. `vonisPilot` atas data langkah 3–7 memberi vonis dan tujuh butir yang sama dengan templat Laporan pilot `isiLaporan('pilot')`.

11. (keputusan 56) Operator mengirim inspeksi `pasca_gelar` untuk komponen pompa dengan skor 2 lewat `lapangan/kirim`; `sippa_komponen.kondisi = rusak_berat`; `laikGelar` kit = tidak laik.
12. Pusdatinkom memindah kit ke `servis` (gerak `servis`); staf mencatat inspeksi `servis` skor 0 dengan jam operasi; kondisi kembali `baik` dan `jam_sejak_servis` = 0.
13. Stok: terima 10 gasket, pakai 2 untuk kit itu; saldo 8 sama dengan `SUM(delta)`; pakai 9 ditolak 409.
14. Aset: staf membuat sumur zona `rawan`, inspeksi `serah_terima`, lalu `mutu_air` E. coli 0; `GET /api/sippa/pelihara` dan `pelihara.csv` memuat butir sumur dengan jatuh tempo uji mutu 30 hari kemudian sama persis dengan `SippaPelihara.jadwal`.

Pesan gagal tiap langkah menyebut langkah, nilai harapan, nilai didapat, dan tabel asalnya.

### 2.6 INP: ambang dan cara ukur

| Permukaan | Ambang | Cara ukur |
| --- | --- | --- |
| Semua layar `/pipa` di laptop uji (U10) | tidak ada interaksi dengan durasi Event Timing > 200 ms | `preview_start` server `dev:warga`; `javascript_tool` memasang `new PerformanceObserver(l => …).observe({type: "event", buffered: true, durationThreshold: 16})`; skrip klik tiap kontrol berchrome (segmen, pil, tab, akordeon, paginasi, sort, kotak cari, `PilihCantik`) tiga kali; catat maksimum per kontrol |
| Form lapangan `/pipa/lapangan` di ponsel | < 100 ms | `resize_window` preset `mobile`, perlambatan CPU 4x lewat DevTools Protocol bila tersedia, atau ponsel nyata kelas menengah; tiap tombol stopwatch, papan angka, dan tombol kirim |
| Studio | tidak ada long task > 50 ms di utas utama yang berasal dari geser slider | PerformanceObserver `longtask` saat slider digeser 10 langkah |

Gerbang mekanis (tanpa peramban) di `tests/sippa/gerbang-sippa.test.mjs`, diperiksa **per handler**, bukan per berkas (INP.md, ranjau "gerbang yang mendaftar per berkas"):

1. Tiap `addEventListener("click"|"input"|"change"|"keydown", …)` di `public/pipa/layar_*.js` yang memanggil, langsung atau lewat fungsi bernama satu tingkat, fungsi di daftar `BERAT` (gambar grafik, `setData`, `addSource`, render tabel > 50 baris, Monte Carlo) memanggilnya di dalam `nanti(` atau lewat `postMessage` ke Web Worker.
2. Handler yang sama mengubah chrome (`aria-pressed`, `aria-selected`, `aria-checked`, `aria-expanded`, kelas aktif) **sebelum** panggilan `nanti(`.
3. Tidak ada `addSource`/`addLayer` di dalam handler sakelar peta; hanya `setLayoutProperty`/`setFilter`.
4. Pengecualian dicatat per handler (`berkas:nama_handler`) dengan alasan ≥ 15 huruf; pengecualian per berkas ditolak.

### 2.7 Aksesibilitas dan mode gelap

| Cek | Mekanis atau peramban | Perintah atau cara | Lulus bila |
| --- | --- | --- | --- |
| `lang="id"` di cangkang `/pipa` dan `/pipa/lapangan` | mekanis | `sippa.test.mjs` membaca HTML jawaban | ada |
| Kontras token terang dan gelap | mekanis | `tests/sippa/kontras.test.mjs` mengurai variabel `public/inti/tema.css` dan `public/admin/admin.css` dalam dua tema, menghitung rasio WCAG pasangan teks/latar yang dipakai `public/pipa/*.css` | teks biasa ≥ 4,5:1, teks besar dan komponen ≥ 3:1, dua tema |
| Tanpa warna tertanam | mekanis | `gerbang-sippa.test.mjs`: tidak ada `#hex`, `rgb(`, `hsl(` di `public/pipa/*.css` dan di string gaya `public/pipa/*.js` selain `var(--…)` dan `currentColor` | nol temuan |
| Peta gelap | peramban | tombol tema; peta memakai gaya gelap lewat `setStyle(…, {diff: false})`, lapisan dipasang ulang sesudah `style.load` | lapisan zona tetap tampil sesudah tiga kali ganti tema |
| Label isian | peramban + mekanis | `read_page`: tiap `input`/`select` punya nama aksesibel; `formulir.test.mjs`: tiap medan punya `label` dan id pesan galat untuk `aria-describedby` | nol isian tanpa nama |
| Pola kontrol | peramban | `read_page`: segmen `role="radiogroup"`, tab `role="tablist"`, akordeon `aria-expanded` | semua kontrol PRD §9.13 |
| Papan ketik | peramban | Tab melewati semua kontrol tiap layar; fokus terlihat; Enter/Spasi mengaktifkan | tidak ada jebakan fokus |
| Target sentuh | peramban | ukur kotak elemen interaktif di preset `mobile` | ≥ 44 px; form lapangan ≥ 56 px |
| Gerak berkurang | peramban | `prefers-reduced-motion: reduce` | partikel 3D berhenti; tidak ada animasi transisi panjang |
| Alternatif teks | peramban | peta punya Daftar lengkap; 3D punya panel teks berisi angka yang sama dengan `hidraulika()` | angka panel = angka kalkulator |
| Tema diingat | peramban | `data-theme` di `<html>` dan `localStorage` dalam `try/catch`; jendela privat dengan penyimpanan diblokir tetap merender | tidak ada galat konsol |

### 2.8 Larangan teks dan angka di layar (keputusan 50 dan PRD §9.2)

`tests/sippa/gerbang-sippa.test.mjs` menolak, di `public/pipa/**`, templat laporan, dan `src/sippa*.js`:

1. Kata "terbukti".
2. Em dash (U+2014) dan titik tengah (U+00B7) di teks antarmuka.
3. "titik api" untuk data satelit.
4. `toFixed(` di jalur teks tampil (pakai `fmt` dari `public/inti/format.js`).
5. URL CDN (`https://cdn`, `unpkg`, `jsdelivr`, `cdnjs`) dan import map sebaris.
6. Berkas data (`*.json`, `*.csv`, `*.geojson`) di bawah `public/pipa/`, karena `public/` terbit sebagai aset statis tanpa sesi.
7. `innerHTML`/`insertAdjacentHTML`/`outerHTML` yang menerima nilai di luar literal templat statis atau `esc(`.
8. Konstanta kedalaman maksimum lebih dari satu definisi: satu `KONST.dalam_maks_m = 5` di `hitung.js` (DT §5.2), dipakai kalkulator, Studio, 3D, dan formulir (grep angka `5.1`, `> 5` di luar konstanta).
9. Teks "100%" untuk probabilitas.
10. Nama perusahaan konsesi: daftar nama dari `public/data/kendala.json` atau sumber konsesi tidak muncul di `data/sippa/keluaran/*.json` maupun `public/pipa/**`.

---

## 3. D1: tiap CHECK dan trigger diuji dengan SQL yang wajib gagal

### 3.1 Bentuk uji

Berkas `tests/warga/sippa_skema.test.mjs`, pola `tests/warga/skema.test.mjs`:

- Skema dibangun dari `migrasi()` apa adanya di `node:sqlite` memori dengan `PRAGMA foreign_keys = ON`.
- Runner `uji(nama, fn)` membuka `BEGIN`, menjalankan `fn`, lalu `ROLLBACK` di blok `finally`; uji tidak pernah menulis `COMMIT`.
- Pembantu `sah(tabel, ubah = {})` menyisipkan satu baris yang lolos semua CHECK (nilai dasar per tabel di satu objek `DASAR`), dan `tolak(tabel, ubah, pola)` menyisipkan baris yang sama dengan satu medan diubah lalu mengharapkan galat yang cocok dengan `pola`. Tiap uji tolak didampingi uji kembar yang lolos, supaya CHECK yang terlalu ketat juga ketahuan.
- Trigger menulis `RAISE(ABORT, '<nama_trigger>: <alasan>')` sehingga uji mencocokkan nama trigger, bukan teks umum.
- Pesan gagal: `sippa_probe.kedalaman_cm=600 DITERIMA, diharapkan ditolak oleh CHECK (kedalaman_cm IN (10,30,50,100,150,300,400,500)); keputusan 50 melarang injeksi > 5 m`.

Uji umum (satu kali untuk semua tabel SIPPA, ditemukan dari `sqlite_master` dengan nama berawalan `sippa_`):

| Uji | Wajib |
| --- | --- |
| Idempoten | `for (const s of pecah(migrasi())) db.exec(s)` dijalankan dua kali tanpa galat |
| Kolom dummy | tiap tabel `sippa_*` (termasuk `sippa_telemetri` dan `sippa_telemetri_harian`, DESAIN-TEKNIS §3.4) punya `dummy INTEGER NOT NULL DEFAULT 0` dengan CHECK `(0,1)`; sisipan `dummy = 2` gagal |
| Waktu milidetik | sisipan waktu dalam detik (10 digit) untuk kolom `waktu`, `dibuat` tidak ditolak skema, jadi diuji di rute: `src/sippa.js` selalu menulis `Date.now()`; uji rute memeriksa nilai > 1e12 |
| Migrasi beku | `tests/warga/migrasi_beku.test.mjs` hijau sesudah hash 0056–0058 dicatat |

### 3.2 `0056_sippa_inti.sql`

| Tabel | Aturan | SQL atau sisipan yang WAJIB GAGAL | Kembar yang WAJIB LOLOS |
| --- | --- | --- | --- |
| `sippa_kit` | kode `SIPPA-###` | `kode = 'SIPPA-12'`; `'SIPPA-1234'`; `'sippa-001'`; `'SIPPA-0A1'` | `'SIPPA-001'` |
| | kode unik | dua baris `kode = 'SIPPA-001'` | kode berbeda |
| | jenis | `jenis = 'pipa'` | `'pinjam_pilot'` |
| | status | `status = 'dipinjam'` | tujuh status sah |
| | lat/lon kotak Indonesia | `lat = -12`; `lat = 7`; `lon = 94`; `lon = 142` | `lat = -2.2, lon = 113.9`; keduanya NULL |
| | prov 2 huruf | `prov = '620'` | `'62'`, NULL |
| | catatan ≤ 1.000 | 1.001 huruf | 1.000 huruf |
| | NOT NULL | `dibuat` NULL; `diubah` NULL | |
| | kode 900–999 khusus dummy | `kode = 'SIPPA-901', dummy = 0` | `'SIPPA-901', dummy = 1` |
| `sippa_komponen` | FK kit | `kit_id = 'tidakada'` | kit ada |
| | kode BOM | `kode_bom = 'pompa'`; `'P1'` | `'P-01'` |
| | jumlah > 0 | `jumlah = 0`; `-1` | `0.5` |
| | satuan | `satuan = 'kg'` | `'m'` |
| | kondisi | `kondisi = 'baru'` | `'hilang'` |
| `sippa_gerak` | FK kit | `kit_id` tidak ada | |
| | status asal dan tujuan | `ke_status = 'dipinjam'` | |
| | alasan | `alasan = 'jalan_jalan'` | sepuluh alasan sah |
| | pasangan transisi (CHECK) | `dari_status = 'pensiun', ke_status = 'gudang'`; `'servis' > 'gelar'` | 26 pasangan sah DESAIN-TEKNIS §3.2 |
| | gerak langsung wajib `tiba` | `rencana = 0, tiba = NULL` | `rencana = 1, tiba = NULL` |
| | trigger `sippa_gerak_cek` | `dari_status` tidak sama dengan status kit sekarang; gerak baru saat ada gerak `tiba IS NULL` untuk kit sama | `dari_status` = status kit, tanpa gerak terbuka |
| | trigger `sippa_gerak_terapkan`, `sippa_gerak_tiba` | | status dan lokasi kit berubah dalam transaksi yang sama (langsung, dan saat `tiba` diisi) |
| | rencana | `rencana = 2` | 0, 1 |
| | eta 0–720 | `eta_jam = -1`; `721` | `720`, NULL |
| | pengangkut | `pengangkut = 'tni'` | `'yontp'`, NULL |
| | trigger `sippa_gerak_tetap` UPDATE | `UPDATE sippa_gerak SET ke_lokasi = 'x'`; `UPDATE … SET tiba = 2 WHERE tiba = 1` (mengubah tiba yang sudah terisi) | `UPDATE … SET tiba = <ms> WHERE tiba IS NULL` |
| | trigger `sippa_gerak_hapus` DELETE | `DELETE … WHERE dummy = 0` | `DELETE … WHERE dummy = 1` |
| `sippa_tugas` | kode_sha 64 | `length(kode_sha) = 63` | 64 heks |
| | kode_sha unik | dua baris sha sama | |
| | nama regu 2–80 | 1 huruf; 81 huruf | 2 dan 80 huruf |
| | unsur | `unsur = 'tni_ad'` | `'mpa'` |
| | ≤ 30 hari dan berakhir > mulai | `berakhir = mulai`; `berakhir = mulai + 2592000001` | `mulai + 2592000000` |
| `sippa_log_gelar` | jenis | `jenis = 'patroli'` | |
| | kelas medan | `kelas_medan = 'IV'` | `'III'`, NULL |
| | panjang 0–5.000 | `5001`; `-1` | `5000` |
| | orang 1–300 | `0`; `301` | |
| | jam pompa 0–720 | `721` | |
| | bbm ≥ 0 | `-0.1` | `0` |
| | catatan ≤ 1.000 | 1.001 huruf | |
| | trigger `sippa_log_urut` urutan | tiap pasangan berurutan dibalik satu per satu: `t_mulai_gelar < t_tiba`; `t_air_mengalir < t_mulai_gelar`; `t_selesai < t_air_mengalir`; `t_bongkar_selesai < t_selesai`; dan pasangan tidak bersebelahan dengan tahap tengah NULL (`t_tiba` 10, `t_mulai_gelar` NULL, `t_air_mengalir` 5) | urutan menaik; tahap tengah NULL dengan sisanya menaik |
| | trigger `sippa_log_urut` banjir | `jenis = 'karhutla', banjir_m3 = 10` | `jenis = 'banjir', banjir_m3 = 10` |
| | trigger `sippa_log_tetap` dan `sippa_log_hapus` | `UPDATE sippa_log_gelar` apa pun; `DELETE … WHERE dummy = 0` | `DELETE … WHERE dummy = 1`; koreksi = sisipan baru dengan `koreksi_dari` |
| | medan vonis pilot | `air_sampai_lance = 2`; `p_ujung_bar = 26`; `p_ujung_menit = 1441`; `p_ujung_sumber = 'tebak'`; `kecelakaan = 2`; `konfigurasi = '{bukan json'` | NULL; nilai di dalam rentang |
| | `jam_klien_meleset` | `jam_klien_meleset = 2`; NULL | 0, 1 |
| | `oleh` | `oleh = 'x'` | `'tugas:<id>'`, `'staf:<id>'`, 12 heks admin |
| `sippa_probe` | tahap | `tahap = '48j'` | tujuh tahap sah termasuk `sesudah` |
| | kedalaman (keputusan 50) | `kedalaman_cm = 600`; `200`; `0` | delapan nilai sah termasuk `500` |
| | suhu -10 s.d. 900 | `suhu_c = 1000`; `-11` | `900`, `-10` |
| `sippa_bbm` | jenis | `jenis = 'pertalite'` | |
| | aksi | `aksi = 'hapus'` | empat aksi |
| | liter 0 < x ≤ 20.000 | `0`; `20001` | `20000` |
| | trigger `sippa_bbm_tetap` | `UPDATE sippa_bbm SET liter = 1`; `DELETE … WHERE dummy = 0` | `DELETE … WHERE dummy = 1` |
| `sippa_foto` | mime | `mime = 'image/png'` | `'image/jpeg'`, `'image/webp'` |
| | ukuran | `ukuran = 8388609`; `0` | `8388608` |
| `sippa_jalan_cek` | musim, hasil, kendaraan | `musim = 'pancaroba'`; `hasil = 'ragu'`; `kendaraan = 'heli'` | NULL kendaraan |
| `sippa_aoi_usul` | status | `status = 'disetujui'` | empat status |
| | kompleks atau sel | keduanya NULL | salah satu terisi |

### 3.3 `0057_sippa_ab_skenario.sql`

| Tabel | Aturan | WAJIB GAGAL | WAJIB LOLOS |
| --- | --- | --- | --- |
| `sippa_ab_unggah` | status | `status = 'final'` | `'ditinjau_evaluator'` |
| | sha UNIQUE | dua baris sha sama (rute menjawab 409) | sha berbeda |
| | n_baris 1–2.000 | `0`; `2001` | `2000` |
| `sippa_petak` | lengan | `lengan = 'heli'` | lima lengan |
| | tanggal | `tanggal_perlakuan = '2026-1-5'`; `'26-10-05'` | `'2026-10-05'` |
| | luas 1–100.000 | `0.5`; `100001` | `1`, `100000` |
| | surfaktan ≥ 0 | `-1` | |
| | surfaktan hanya lengan surfaktan | `lengan = 'lance', surfaktan_l = 2` | `lengan = 'lance_surfaktan', surfaktan_l = 2`; `lengan = 'lance', surfaktan_l = 0` |
| | biaya ≥ 0 | `biaya_rp = -1` | NULL |
| | biner 0/1 | `dingin_24j = 2`; tiap kolom `nyala_*` = 2 | NULL, 0, 1 |
| | sumber | `sumber = 'email'` | |
| | unik (aoi, petak_id) | dua baris sama | aoi berbeda, petak sama |
| `sippa_skenario` | nama 3–80 | 2 huruf; 81 huruf | |
| | state JSON ≤ 32.768 | `state = '{bukan json'`; JSON 32.769 byte | JSON 32.768 byte |
| | ringkas JSON | `ringkas = 'x'` | NULL |
| `sippa_laporan` | jenis | `jenis = 'harian'` | lima jenis |
| | parameter JSON | `parameter = 'x'` | |
| | ukuran ≤ 10 MB | `ukuran = 10485761` | `10485760` |
| | `ada_berkas = 1` wajib sha dan ukuran | `ada_berkas = 1, sha = NULL` | `ada_berkas = 0` tanpa sha |

### 3.4 `0058_sippa_telemetri.sql`

| Tabel | Aturan | WAJIB GAGAL | WAJIB LOLOS |
| --- | --- | --- | --- |
| `sippa_perangkat` | tag | `tag = 'pt101'`; `'PT_101'` | `'PT-101'`, `'T-108'`, `'GPS-101'` |
| | jenis | `jenis = 'angin'` | sebelas jenis termasuk `gateway` |
| | gateway wajib token | `jenis = 'gateway', token_sha = NULL` | sensor dengan `token_sha = NULL` |
| | token unik | dua baris `token_sha` sama | |
| | unik (kit, tag) | dua perangkat `PT-101` di kit sama | `PT-101` di dua kit |
| | rentang sah | `min_sah = 5, maks_sah = 5` | `maks_sah > min_sah` |
| `sippa_telemetri` (satu baris per pesan) | id 32 heks | `id` 31 huruf | 32 heks |
| | id ganda | dua baris id sama (rute menghitungnya `ganda`, `ON CONFLICT DO NOTHING`) | id berbeda |
| | bacaan larik JSON | `bacaan = '{}'`; `'x'`; larik > 65.536 byte | larik 500 bacaan |
| | n 1–500 dan `n_mutu2 ≤ n` | `n = 0`; `n = 501`; `n_mutu2 = n + 1` | `n = 500, n_mutu2 = 500` |
| | `t_akhir ≥ t_awal` | `t_akhir = t_awal - 1` | sama |
| `sippa_telemetri_harian` | PK (perangkat, hari) | dua baris sama | hari berbeda |
| | hari YYYY-MM-DD | `hari = '2026-10-5'` | `'2026-10-05'` |
| `sippa_alarm` | kode | `kode = 'gempa'` | delapan kode |
| | satu alarm terbuka per (perangkat, kode) | dua baris `ditutup IS NULL` sama | satu terbuka satu ditutup |

Ringkas harian di cron (`bersihkanSippa`) diuji di `sippa.test.mjs`: pesan 31 hari lalu diringkas ke `sippa_telemetri_harian` (n, min, maks, rerata berbobot) lalu dihapus; pesan 29 hari lalu tetap.

### 3.6 `0059_sippa_aset_pelihara.sql` (keputusan 56)

| Tabel | Aturan | WAJIB GAGAL | WAJIB LOLOS |
| --- | --- | --- | --- |
| `sippa_aset` | kelas | `kelas = 'sumur'` | tujuh kelas |
| | kode | `AS-1`; `AS-9001` dengan `dummy = 0` | `AS-0001`; `AS-9001` dengan `dummy = 1` |
| | pemilik aset | `pemilik_aset = NULL`; 2 huruf | 3–120 huruf |
| | atribut | `'[]'`; `'x'`; objek 4.097 byte | `'{}'` |
| | rehab Q10 | `sumur_bor` dengan `zona_konservasi` `kritis` atau `rusak` tanpa `rekomendasi_bg` | dengan `rekomendasi_bg`; zona `aman`; zona kosong; kelas bukan sumur dengan zona `rusak` |
| `sippa_inspeksi` | skor | `skor = 4`; `-1` | 0–3 |
| | sasaran | `sasaran_jenis = 'komponen'` dengan `kit_id = NULL`; komponen milik kit lain (trigger) | komponen milik kit yang disebut |
| | hasil uji | `jenis = 'mutu_air'` tanpa `e_coli_cfu`; `uji_tekanan` tanpa `tekanan_bar` | dengan medannya |
| | tambah-saja | `UPDATE` apa pun; `DELETE` baris `dummy = 0` | `DELETE` baris dummy |
| | trigger kondisi | | skor 2 menulis `sippa_komponen.kondisi = 'rusak_berat'` dan `dicek = waktu` |
| `sippa_stok_gerak` | delta | `delta = 0` | ±1 |
| | saldo | delta membuat saldo gudang dan kode < 0 | saldo tepat 0 |
| | tambah-saja | `UPDATE`; `DELETE` baris nyata | `DELETE` baris dummy |

Migrasi dijalankan dua kali tanpa galat. Uji asap SQL atas skema ini dijalankan 26 Okt 2026 dengan `sqlite3` Python terhadap SQL DESAIN-TEKNIS §3.2 dan §3.6 dan lolos (bukan pengganti uji Miniflare).

### 3.5 Yang tidak bisa dijaga skema dan wajib dijaga rute

Dicatat di `tests/warga/cakupan.json` `diuji` dengan nama uji rute, bukan dibiarkan:

- Siapa boleh melakukan transisi status kit (pasangan sahnya dijaga CHECK `sippa_gerak`): staf tulis, operator kit tugasnya, atau moderator (DESAIN-TEKNIS §6.2). Diuji T1 (49 pasangan, tiga jenis pelaku) dan dicocokkan dengan `ALASAN_TRANSISI` yang dibaca dari teks migrasi.
- Probe 150–500 cm hanya untuk tugas `lengan_dalam = 1`.
- Hak per provinsi (`dalamWilayahStaf`, saring `prov` di SQL).
- `kode_sha` dan `token_sha` benar-benar sha256 dari kode yang diberikan (skema hanya mengecek panjang).
- Penurunan `jam_klien_meleset` dari `jam_kirim` dan `waktu_klien` (DESAIN-TEKNIS §6.1.5).

---

## 4. Pipeline data

### 4.1 Self-check per skrip

Tiap skrip `scripts/data/sippa/*.py` punya `def uji()` yang dijalankan dengan `python3 scripts/data/sippa/<skrip>.py uji`, keluar bukan 0 pada `assert` pertama yang gagal, dan tidak menulis berkas apa pun saat mode `uji`. Fixture kecil buatan tangan dipakai untuk uji penolakan; masukan nyata beku dipakai untuk reproduksi angka.

| Skrip | Reproduksi dari masukan nyata | Invarian (berlaku untuk data apa pun) | Penolakan wajib |
| --- | --- | --- | --- |
| `zona.py` | dari `pipa/data/osm_jarak.csv` (865 baris, diperiksa 25 Okt 2026): kolom `air_km_lama` x `jalan_km_lama` = **A188 B418 C89 D170**; `air_semua_km` x `jalan_kend_km` = **A469 B158 C167 D71**; `air_semua_km` x `jalan_utama_km` = **A198 B429 C81 D157**. Ketiganya hanya keluar dengan operator ketat `<` (air < 2,5; jalan < 5), lihat §4.2 | jumlah A+B+C+D = jumlah baris masukan; tiap kompleks tepat satu zona per versi; `zona.json` per provinsi = jumlah per kabupaten; persen per versi berjumlah 100,0 ± 0,1 sesudah pembulatan; `zona_o` tidak pernah lebih jauh dari `zona_k` ke arah D bila jarak optimistis ≤ jarak konservatif (sel perpindahan B→A, D→C, D→A, D→B saja, sesuai matriks perpindahan) | baris dengan jarak negatif, `nan`, `inf`, atau teks; id ganda; kolom nama pemegang izin di keluaran |
| | median `air_semua_km` 1,02; median `jalan_kend_km` 2,27; 44 kompleks `jalan_kend_terpotong = 1`; 134 kompleks `jalan_km_lama` kosong | `terpotong = 1` jika dan hanya jika jarak = 16,0 km; jarak OSM dalam [0; 16]; `jalan_km_lama` dalam [0; 30] atau kosong (rute lama, maksimum teramati 24,92) | `terpotong = 1` dengan jarak < 16 |
| | dari `dem_elevasi.csv`: median `beda_air_minus_kompleks_m` -3,9; dari `gsw_air_terdekat.csv`: 120 permanen, 103 musiman, 642 tidak terdeteksi; dari `area_terbakar.csv`: 300 kompleks `bakar_n_tahun_2km ≥ 3` | tiap id keluaran ada di `kompleks.csv` dan sebaliknya (join tanpa kehilangan); elevasi dalam [-50; 3.000] m | id yatim di salah satu masukan |
| `sel22.py` | (dari arsip VIIRS 2012–2025) ringkasan ≥ 3/5/7/10 tahun dan angka deck A2 "85% deteksi 2023 di sel ≥ 3 tahun" | `tahun_aktif` dalam [0; 14]; panjang `deteksi_per_tahun` = 14; `tahun_aktif` = jumlah tahun dengan deteksi > 0 | tahun di luar 2012–2025 |
| `nasional.py` | dari `luas_resmi.json` saat ini: total **81 kit**, **56** di gambut, 18 provinsi | porsi tiap provinsi ≥ 0; jumlah kit = Σ kit provinsi; `ha_per_kit` 22.700 berlabel `asumsi-kebijakan`; label "rencana bersyarat, bukan pengadaan" ada di keluaran | luas negatif; provinsi ganda |
| `respons.py` | tabel matriks FRP x luas x zona §5.4 | tiap sel matriks terisi tepat satu tingkat; tingkat monoton tidak turun saat FRP atau luas naik | FRP negatif |
| `hidraulika.py` | kasus H1–H8 DESAIN-TEKNIS §5.8 (sama dengan `acuan.json`) | `tdh` naik monoton terhadap L dan Q; `vonis` ∈ {NO-GO, HOLD, KONDISIONAL} | kedalaman > 5 m menolak sebelum hitung |
| `pemicu.py` | M1–M3 §2.3 | tingkat tidak pernah naik bila `fwi_ansambel.json` lebih tua dari 36 jam; unit = kabupaten yang memuat ≥ 1 kompleks A/B versi `kendala.json` (kriteria sel ≥ 7 tahun menunggu butir teknis BT-03) | `iklim_outlook` tanpa medan `anom_pct` memberi galat berpesan, bukan NORMAL diam-diam |
| `jembatan.py` (keputusan 56) | dari `data/kajian-bnpb/data/dibi/rekap_*`: **3.833** jembatan rusak 2018–2025, **1.088** pada 2025, porsi banjir **89,2%** (sama dengan kunci `rehab.dibi.jembatan_rusak.*`) | jumlah per provinsi = jumlah nasional per tahun; tahun hanya 2018–2025 | tahun < 2018; baris program tanpa `rujukan` atau berlabel sekunder |
| `cat.py` (keputusan 56) | tidak ada angka reproduksi sampai daftar Badan Geologi dicek ulang | `zona_status` dari daftar tetap; `poligon` null tanpa data | geometri tanpa sumber; `n_cat` diisi tanpa daftar lengkap |

Pemeriksaan umum untuk semua keluaran `data/sippa/keluaran/*.json`, dijalankan oleh fungsi bersama `cek_keluaran()` yang dipanggil tiap `uji()`:

- Kunci pertama `dibuat` (syarat `/api/status`), lalu `per`, `ambang`, `sumber` (nama, lisensi, tanggal tarik), `catatan`.
- Tidak ada `NaN`, `Infinity`, atau `-Infinity` (JSON ditulis dengan `allow_nan=False`, sehingga nilai itu melempar galat, bukan tertulis).
- Ukuran ≤ 8 MB (pola `MAKS_BYTE` `src/risiko7.js`).
- Tiap angka yang diekspor membawa label keyakinan di objek `keyakinan{}` baris atau di kepala berkas.
- Tidak ada kolom yang memuat nama perusahaan konsesi.

### 4.2 Operator ambang: harus ketat

Dihitung ulang 25 Okt 2026 dari `osm_jarak.csv`:

| Versi | Operator `<` (air < 2,5 dan jalan < 5) | Operator `≤` |
| --- | --- | --- |
| lama (`air_km_lama` x `jalan_km_lama`) | A188 B418 C89 D170 | A189 B420 C89 D167 |
| semua jalan x semua air | A469 B158 C167 D71 | A471 B157 C167 D70 |
| jalan utama x semua air | A198 B429 C81 D157 | A199 B429 C81 D156 |

Empat kompleks berjarak air tepat 2,50 km dan empat berjarak jalan tepat 5,00 km (dua desimal). Semua angka acuan PRD, buku, dan `matriks_jarak.md` hanya keluar dengan `<`, yang ditetapkan pemilik sebagai keputusan 51; PRD §5.1 dan §9.12.2 sudah memakai `<`. Kasus batas `zona(2,5; 1,0) = C` serta `zona(1,0; 5,0) = B` dikunci di `hitung.test.mjs` dan `zona.py uji`.

### 4.3 Garis keturunan (lineage)

| Cek | Cara | Lulus bila |
| --- | --- | --- |
| Masukan beku tercatat | `zona.py` menulis sha256 tiap masukan (`kendala.json`, `osm_jarak.csv`, `dem_elevasi.csv`, `gsw_air_terdekat.csv`, `area_terbakar.csv`, `sel22.json`) ke `sumber[].sha256` keluaran | uji reproduksi membandingkan sha masukan dengan sha yang dicatat di `uji()`; berbeda = pesan "masukan berubah sejak reproduksi 25 Okt 2026: <berkas>; angka acuan perlu ditinjau `validasi-model`", bukan sekadar "angka salah" |
| Rantai §7.2 lengkap | `tests/sippa/garis_keturunan.test.mjs` membaca `sumber[]` tiap keluaran dan memastikan tiap masukan yang disebut ada di repo atau di daftar sumber jauh (Overpass, GLO-30, GSW, MCD64A1, CHIRPS) dengan tanggal tarik | tidak ada keluaran tanpa asal |
| Buku membaca keluaran yang sama | `kajian/bangun/sippa_angka.py` (lokasi nyata `data/kajian-bnpb/bangun/sippa_angka.py`) membaca `data/sippa/keluaran/*.json`, bukan menyalin angka | self-check `sippa_angka.py` menghitung ulang `sippa.zona.kalteng.konservatif.a.n` dari `zona.json` dan cocok dengan `angka.json` |
| Web membaca keluaran yang sama | berkas di R2 `sippa/` = berkas di `data/sippa/keluaran/` (sha sama) | langkah `data.yml` mencetak sha sesudah `r2 object put`; uji asap §8.3 membandingkan |
| Tidak ada salinan di `public/` | `gerbang-sippa.test.mjs` butir (6) | nol berkas data di `public/pipa/` dan tidak ada `zona.json`/`kelayakan_*.json` di `public/data/` |

---

## 5. Buku dan deck

Semua perintah dijalankan dari `data/kajian-bnpb/` (PRD menulis `kajian/…`; lokasi nyata repo adalah `data/kajian-bnpb/…`). `.venv` ada di `data/kajian-bnpb/.venv`.

### 5.1 Perintah gerbang buku

```sh
cd data/kajian-bnpb
.venv/bin/python bangun/sippa_angka.py uji                      # registri angka pipa.* (self-check)
.venv/bin/python bangun/docx/bangun.py sippa                     # keluaran/sippa.docx, sippa.pdf, sippa.manifest.json
python3 qa/periksa.py --docx keluaran/sippa.docx --pdf keluaran/sippa.pdf \
  --pptx keluaran/sippa-deck.pptx --pptx-pdf keluaran/sippa-deck.pdf \
  --visual <folder render bangun/visual> --kajian sippa --semua --ketat
python3 qa/slop.py --final keluaran/sippa.docx keluaran/sippa-deck.pptx
python3 qa/slop.py --ambang --laporan keluaran/qa/slop-sippa.md keluaran/sippa.docx
python3 qa/uji.py                                               # uji diri gerbang, wajib hijau sesudah T-12 dan D-33 sampai D-38 ditambah
```

`--semua` dipakai saat menyunting supaya semua gerbang gagal terlihat sekaligus; build kirim memakai `wajib_lolos` (berhenti di gagal pertama, `--ketat --berkas-saja`). `--ketat` menghitung LEWAT sebagai gagal, jadi manifest yang hilang gagal.

### 5.2 Perintah gerbang deck

```sh
cd data/kajian-bnpb
.venv/bin/python bangun/pptx/deck.py naskah/sippa/deck.json keluaran/sippa-deck.pptx --pdf   # .pptx, .pdf, .manifest.json
cd bangun/pptx && ../../.venv/bin/python periksa.py --serah ../../keluaran/sippa-deck.pptx && cd ../..
python3 qa/periksa.py --pptx keluaran/sippa-deck.pptx --pptx-pdf keluaran/sippa-deck.pdf --kajian sippa --semua --ketat
python3 qa/slop.py --final keluaran/sippa-deck.pptx
```

### 5.3 Kriteria terima buku dan deck dipetakan ke gerbang

| Kriteria | Gerbang yang membuktikan | Lulus bila |
| --- | --- | --- |
| Tiap token angka terselesaikan | T-1 (sisa sintaks naskah nol: token `{{angka:…}}`, rujukan, kutipan, catatan kaki), D-22 (angka ketikan nol), D-6 (manifest segar terhadap `data/angka.json`) | nol token tersisa di DOCX/PDF/PPTX; nol angka ketikan; tiap entri manifest ada di registri dengan nilai sama |
| Tiap angka berlabel keyakinan | D-14 (label keyakinan di tabel dan kartu), manifest `keyakinan` tiap entri | 100% entri manifest punya `keyakinan` (U2); slot kosong tampil "menunggu" dengan alasan |
| Tiap gambar dan tabel bersumber dan berlabel | D-7 (bernomor urut, berketerangan, bersumber), D-13 (nomor dari bidang SEQ), D-8, D-21, D-24, D-28 (gambar `bangun/visual`) | nol gambar atau tabel tanpa `Gambar n.m`/`Tabel n.m`, tahun, dan baris `Sumber:` |
| Jumlah halaman PDF = DOCX | T-2 | render soffice DOCX = halaman PDF kirim |
| Angka deck = angka DOCX | D-6 bagian (b): angka sama lintas berkas untuk kunci manifest yang sama; stem DOCX dan PPTX berbeda (`sippa` dan `sippa-deck`) | nol kunci dengan nilai tampil berbeda antara `sippa.manifest.json` dan `sippa-deck.manifest.json` |
| Gambar teknik berblok pengesahan | **T-12 baru** (§5.4) | 12 dari 12 gambar SIPPA-G-01 s.d. G-12 lolos |
| Tanpa em dash, titik tengah, emoji, font selain Roboto | D-1, D-2, D-3, D-4, D-23 | nol |
| Istilah terlarang, termasuk "terbukti efektif" tanpa rujukan dan "titik api" | D-10 (`data/glosarium.json` `terlarang`, `varian_terlarang`), T-9 | nol |
| Anti-slop | T-4, T-8, `slop.py --final` (gagal bila ada pola kritis/tinggi atau skor bab > 10), `slop.py --ambang` (vonis LULUS tiap bab) | semua bab dan slide LULUS (U1) |
| Pustaka | D-19, T-11 dengan `--kajian sippa` (≥ 50 sumber, separuh resmi/primer, `tema.json` `qa.pustaka.kajian_min.sippa = 50`) | lolos |
| Kepala, kaki, kerangka slide | T-5, T-6 (pil CUT OFF `23 Okt 2026, 23.59 WIB` di slide data), T-7 | lolos |
| Deck 18 slide isi (keputusan 19, T-M) | uji tambahan di `bangun/pptx/periksa.py` atau `qa/uji.py`: jumlah slide isi (tanpa sampul, penutup, lampiran) dalam 17–19; `jenis_slide` berurutan tidak berulang kecuali lampiran (S35); slide isi 1 Pesan Kunci; slide isi 2–18 ber-`judul_bentuk: temuan`; kode bagian hanya A–E (KERANGKA §11) | lolos |
| Hanya logo BNPB | T-5 (logo kepala) + cek aset gambar: tiap gambar di `word/media` dan `ppt/media` yang bukan grafik/peta/foto beratribusi D-15 adalah logo BNPB (hash sama) | nol logo lain |
| Tanpa merek alat di luar kolom sumber | D-33 baru (KERANGKA §9.4, gerbang D-33 sampai D-40): daftar merek di `glosarium.json` tidak muncul di luar Daftar Pustaka dan kolom RUJUKAN DATASHEET Lampiran D | nol merek di prosa dan judul |
| Gerbang khusus SIPPA lain | D-34 (kedalaman injeksi > 5 m), D-35 (keterangan gambar teknik), D-36 (slot `menunggu` tampil "–" dengan alasan), D-37 ("rencana bersyarat" di tabel, peta, slide kit nasional dan T3/T4), D-38 ("terbukti"/"teruji" tanpa kutipan) dengan fixture negatif di `qa/uji.py` | nol |
| Nama program jembatan (keputusan 55) | **D-39 baru** (KERANGKA §9.4): "Jembatan Merah Putih" tanpa "Presisi" atau "Polri", atau "Jembatan Garuda" tanpa "TNI AD", dalam kalimat yang sama; fixture negatif dan positif di `qa/uji.py` | nol |
| Angka sekunder hanya di rekonsiliasi | **D-40 baru**: token kunci `rehab.sekunder.*` atau `rehab.rekon.*` di luar `90-lampiran-a.md`; fixture negatif dan positif | nol |
| Kunci rehab dipakai, bukan disalin | D-6 dan D-22 menerima token `rehab.*`; uji `sippa_angka.py uji` gagal bila ada kunci `sippa.*` yang nilainya salinan kunci `rehab.*` (daftar pasangan terlarang di self-check) | nol salinan |
| Struktur buku gabungan | uji kontrak: 22 berkas `bab-NN.md`, lampiran tertulis A–Q, `tema.json` `kajian.sippa.lampiran` = `ABCDEFGHIJKLMNOPQRS`; KD-1 sampai KD-12 identik di Ringkasan Eksekutif, Bab 22, dan deck (teks keputusan sama karakter demi karakter) | lolos |
| Konstanta pemeliharaan buku = web | Lampiran Q dan Tabel 15.2 dibangun dari `data/sippa/pelihara.csv`; uji membandingkan CSV dengan `node public/pipa/pelihara.js --csv` (hash sama) | sama |
| Kajian rehab tidak rusak | `qa/uji.py` dan kontrak naskah untuk `kajian: rehab` tetap hijau (berkas sumber tetap bisa dibangun) | lolos |
| Tiga versi zona | D-6: kunci `sippa.zona.kalteng.konservatif.*`, `sippa.zona.kalteng.utama.*`, `sippa.zona.kalteng.optimistis.*` muncul di DOCX (Tabel 4.1); dua versi peta (konservatif, optimistis) di deck slide 4 | semuanya ada |
| Warna zona buku dan deck | `qa/periksa.py --visual` (D-9 hex hanya dari `tema.json`): simbol zona memakai hex biru dan emas DESIGN-SYSTEM §2.1.3, dan tiap legenda zona memuat huruf A–D (keputusan 52) | nol pelanggaran |

### 5.4 Gerbang baru T-12: gambar teknik

Pemilik `pipa-data`, ditambah ke `qa/periksa.py` dengan fixture negatif dan positif di `qa/uji.py` dan entri `qa/cakupan.json` `diuji`. Masukannya SVG keluaran `bangun/visual/teknik/*.mjs` dan manifest render.

| Sub-aturan | WAJIB GAGAL bila |
| --- | --- |
| T-12a blok judul | salah satu medan nomor gambar, revisi, skala, satuan, tanggal, digambar, diperiksa tidak ada |
| T-12b blok pengesahan | teks "Pengesahan insinyur berlisensi" beserta medan nama, nomor STRA/SKA, tanda tangan, tanggal tidak ada, **atau medannya terisi** (wajib kosong, keputusan 12) |
| T-12c catatan wajib | teks "Wajib verifikasi dan pengesahan insinyur berlisensi sebelum dibangun" tidak ada |
| T-12d nomor | himpunan nomor ≠ {SIPPA-G-01 … SIPPA-G-12} |
| T-12e konsistensi | tag di G-02 dan G-10 ≠ daftar tag `sippa_perangkat` PRD §9.11 (dibaca dari satu berkas data bersama); aturan di G-11 ≠ tabel `saranSarana` (dibaca dari ekspor `SippaHitung.ATURAN_SARANA`); G-01 tidak memuat semua kode BOM §6.1 |
| T-12f larangan | relief di G-02 > 88% PN; kedalaman lance di G-03 > 5 m; merek alat di luar kolom rujukan |

Kriteria terima PRD §6.9 yang tidak bisa dimesinkan (misalnya "tanpa baut yang tidak terdefinisi", "berat per gulungan ≤ batas angkat 2 orang" bila tidak tertulis sebagai angka) diisi pengulas di daftar periksa PRD §6.9 dan dicatat di `qa/cakupan.json` `dikecualikan` dengan alasan.

---

## 6. Data pilot Oktober 2026

### 6.1 Kelengkapan formulir (G3-lite dan web)

Pemeriksa: `scripts/data/sippa/pilot_cek.py` (pemilik `pipa-data`, self-check `uji` dengan fixture `tests/warga/fixtures/` bergaya isian pilot), membaca ekspor `GET /api/sippa/log.csv` dan `GET /api/sippa/probe.csv` (DESAIN-TEKNIS §4.3), atau isian kertas yang sudah dimasukkan staf lewat `POST /api/sippa/log`. Keluar bukan 0 bila satu syarat gagal dan mencetak id sesi dan medan yang kurang.

| No | Syarat | Lulus bila |
| --- | --- | --- |
| PL1 | jumlah sesi gelar | ≥ 2 sesi `jenis` `karhutla` atau `latihan` dalam rentang pilot 26 Okt–1 Nov 2026 (PRD §4.1 minggu 44: 2–3 sesi) |
| PL2 | stempel waktu inti | tiap sesi punya `t_tiba`, `t_mulai_gelar`, `t_air_mengalir`, `t_bongkar_selesai`, menaik (trigger sudah menjamin urutan; pemeriksa menjamin keberadaan) |
| PL3 | angka sesi | `kelas_medan`, `panjang_m`, `n_orang`, `jam_pompa`, `bbm_l` terisi; `air_m3` terisi bila totalizer ada, atau catatan "tanpa totalizer" |
| PL4 | probe | tiap petak punya tahap `sebelum`, `sesudah`, dan `24j`, masing-masing di 4 kedalaman 10/30/50/100 cm (U3, keputusan 53 butir 5: kelengkapan ≥ 90%); kedalaman > 100 cm hanya bila tugas `lengan_dalam = 1` |
| PL5 | sumber isian | tiap baris bertanda `oleh` (`tugas:` atau `staf:`); isian kertas punya pindaian yang tercatat di `foto_id` (tabel `sippa_foto`) atau `catatan` |
| PL6 | bukan dummy | nol baris `dummy = 1` di ekspor |
| PL7 | jam klien | butir `jam_klien_meleset = 1` (diturunkan server, DESAIN-TEKNIS §6.1.5) dihitung terpisah, tidak dibuang |
| PL8 | pasangan A/B (bila ada api) | ≥ 1 petak `lance` dan ≥ 1 petak `konvensional` berdampingan dengan `pasangan_id` sama; bila tidak ada api aktif (R02), pemeriksa mencetak "vonis lebih baik ditunda" dan tidak gagal |
| PL9 | medan vonis | tiap sesi punya `petak_id`, `air_sampai_lance`, `p_ujung_bar`, `p_ujung_menit`, `p_ujung_sumber`, `kecelakaan`, `bocor_henti_menit`; kit pilot punya cek komponen sesudah gerak `kembali` terakhir |

### 6.2 Kesamaan kertas dan layar

| Cek | Perintah | Lulus bila |
| --- | --- | --- |
| Formulir klien = server = skema | `tests/sippa/formulir.test.mjs` | `src/sippa.js` mengimpor `public/pipa/formulir.js` (satu berkas, ADR-03; uji teks memastikan tidak ada `src/sippa_formulir.js`); tiap batas medan sama dengan CHECK migrasi 0056 yang dibaca dari berkas SQL |
| Kertas G3-lite = formulir | `tests/sippa/formulir.test.mjs` membaca daftar medan yang dipakai pembangkit `G3-lite.pdf` (data JSON yang sama, bukan PDF) | tiap medan kertas ada di formulir dan sebaliknya; batas sama |
| PDF tercetak | sesi induk membuka `G3-lite.pdf` | satu halaman per sesi, satu halaman per petak probe (P0-06) |

### 6.3 Vonis "dapat dipakai" (keputusan 53)

Diputus pemilik sebagai keputusan 53 (KEPUTUSAN-SIPPA §H, label `asumsi-kebijakan`) dan dihitung fungsi murni `vonisPilot` (DESAIN-TEKNIS §5.5.2) yang dipakai layar, Laporan pilot, `pilot_cek.py`, dan Bab 12.3 buku:

| Butir | Lulus bila | Diuji di |
| --- | --- | --- |
| 1 | air sampai ujung lance pada ≥ 2 sesi di ≥ 2 petak berbeda | V1, V3 |
| 2 | tiba-sampai-air-mengalir ≤ 4 jam pada sesi terbaik dan lima waktu tiap sesi lengkap | V1 |
| 3 | tekanan ujung ≥ 2 bar bertahan ≥ 30 menit terus-menerus pada ≥ 1 sesi (sumber gauge atau operator ditampilkan) | V1 |
| 4 | tidak ada gerbang keras `hidraulika()` untuk `konfigurasi` yang dipakai | V1 (konfigurasi H7) |
| 5 | data probe ≥ 90% lengkap: sebelum, sesudah injeksi, 24 jam, di semua petak dan 4 kedalaman | V2 (20 dari 24 = gagal) |
| 6 | nol kecelakaan kerja dan tidak ada henti bocor > 30 menit | V3 (henti 45 menit = gagal) |
| 7 | ≥ 95% komponen kembali lengkap dan berfungsi | V1 (39 dari 40) |

Vonis: semua lulus = DAPAT DIPAKAI; satu butir di luar 1 dan 6 gagal = DAPAT DIPAKAI BERSYARAT (perbaikan tertulis sebelum dipakai untuk banjir); butir 1 atau 6 gagal = BELUM DAPAT DIPAKAI. Butir tanpa data dihitung gagal dan tampil "data belum lengkap". Kasus V1–V3 di `acuan.json` diuji JS dan Python (`kembar.test.mjs`); `pilot_cek.py uji` memakai kasus yang sama.

Vonis "lebih baik" tidak pernah diputus dari pilot (n < 8 per lengan): `bandingRerata` dan `bandingProporsi` mengembalikan "belum bisa diputus", dan laporan pilot menulis keduanya terpisah.

---

## 7. Registri cakupan dan gerbang mekanis

### 7.1 Dua registri, pembagian tegas

| Registri | Isi | Gerbang | Status |
| --- | --- | --- | --- |
| `tests/warga/cakupan.json` | tiap rute `src/sippa.js` (kunci "METODE /jalur"), tiap tabel dan trigger 0056–0058 (kunci "table x", "trigger x"), cron ringkas telemetri | `tests/warga/gerbang.test.mjs` (sudah ada; `BATAS_ANTRE = 2`, hanya boleh turun) | ada; wajib ditambah `"sippa"` ke daftar modul `bn` |
| `tests/sippa/cakupan.json` | logika klien dan pipeline yang tidak tinggal di worker atau D1 | `tests/sippa/gerbang-cakupan.test.mjs` | baru, dibuat di P0-03 sebelum berkas `public/pipa/**` pertama |
| `data/kajian-bnpb/qa/cakupan.json` | gerbang buku dan deck, termasuk T-12 | `qa/uji.py` | ada; ditambah T-12 |

### 7.2 Bentuk `tests/sippa/cakupan.json`

```json
{
  "_catatan": "Registri cakupan SIPPA di luar worker dan D1 (TEST.md). Tiap fungsi SippaHitung, tiap ekspor modul public/pipa yang berlogika, tiap layar, dan tiap skrip scripts/data/sippa WAJIB ada di 'diuji' (nilai = potongan nama uji yang benar-benar ada di tests/sippa/*.test.mjs, atau 'uji:<skrip>' untuk self-check Python) atau 'dikecualikan' (nilai = alasan >= 15 huruf). 'antre' hanya boleh menyusut.",
  "diuji": {
    "SippaHitung.hidraulika": "acuan K1 HDPE OD160 NO-GO tekanan",
    "SippaHitung.zona": "zona: ambang ketat, 2,5 km bukan A",
    "SippaHitung.saranSarana": "saranSarana: enam aturan, aturan pertama menang",
    "KarhutlaEngine.assess": "studio: angka jalan-ulang baca-C dalam 0,5%",
    "gerbangSippa": "studio: gerbangSippa hanya menambah hambatan keras",
    "isiLaporan": "laporan: lima templat, isi minimum",
    "layar:hitung": "layar hitung: masukan liar ditolak",
    "py:zona.py": "uji:zona",
    "py:pemicu.py": "uji:pemicu"
  },
  "dikecualikan": {
    "ikon.js": "sprite SVG tanpa logika; diuji tidak memuat warna tertanam oleh gerbang-sippa butir warna"
  },
  "antre": {}
}
```

### 7.3 Gerbang `tests/sippa/gerbang-cakupan.test.mjs` (tanpa basis data)

Penemuan otomatis, bukan daftar tangan:

1. Memuat `public/pipa/hitung.js` lewat `vm` dan mengambil `Object.keys(globalThis.SippaHitung)` yang bertipe fungsi; tiap kunci menjadi `SippaHitung.<nama>`.
2. Memuat `public/pipa/studio_mesin.js` dan mengambil fungsi `KarhutlaEngine` serta `gerbangSippa`.
3. Mengurai `export function` dan `globalThis.<X> = {…}` di `public/pipa/*.js` lain (`formulir`, `keadaan`, `antre`, `adegan` bagian logika, `laporan`, `batas`).
4. Mendaftar `public/pipa/layar_*.js` sebagai `layar:<nama>` dan mencocokkan dengan `LAYAR_SIPPA` + `ringkas` (layar tanpa modul atau modul tanpa layar gagal); `public/pipa/lapangan.js` (cangkang sendiri, DT §2.1) dicatat sebagai `layar:lapangan`.
5. Mendaftar `scripts/data/sippa/*.py` sebagai `py:<berkas>` dan memastikan tiap berkas punya `def uji(` dan percabangan argumen `uji`.

Asersi, masing-masing satu `test` dengan pesan berangka:

| Asersi | Pesan gagal (bentuk) |
| --- | --- |
| tiap hal yang ditemukan ada di `diuji` atau `dikecualikan` | `3 hal SIPPA belum punya uji atau alasan: SippaHitung.joukowsky, layar:pemicu, py:respons.py; tambahkan ke tests/sippa/cakupan.json` |
| tiap nilai `diuji` menunjuk nama uji yang benar-benar ada (`test("<nama>"` atau `uji("<nama>"` di `tests/sippa/*.test.mjs`), atau `uji:<skrip>` dengan skrip yang punya `def uji(` | `entri yatim: SippaHitung.zona -> "zona: ambang ketat" tidak ditemukan di tests/sippa` |
| tiap pengecualian beralasan ≥ 15 huruf, dan pengecualian dicatat per fungsi atau per handler, tidak per berkas `public/pipa/layar_*.js` | `pengecualian per berkas ditolak: layar_peta.js; catat per handler (INP.md)` |
| `antre` ≤ `BATAS_ANTRE` (ditetapkan = jumlah antre saat berkas dibuat, hanya boleh diturunkan) | `antre 4 > batas 3: utang uji hanya boleh menyusut` |
| tidak ada kunci di registri yang sudah tidak ditemukan di kode | `kunci basi: SippaHitung.lama; hapus dari cakupan.json` |

Gerbang ini sendiri punya uji penolakan: satu uji membuat salinan registri sementara di memori tanpa satu entri dan memastikan fungsi penemuan melaporkannya (gerbang yang tidak pernah bisa merah tidak dihitung).

### 7.4 RED dulu, lalu hijau (TDD)

- **Uji ditulis sebelum kode.** Untuk tiap tugas P0/W, commit uji dan registri boleh mendahului kode; jalannya pertama wajib merah dengan pesan yang menyebut hal yang belum ada (contoh: `sippa_kit tidak ada`, `SippaHitung.zona bukan fungsi`). Uji yang hijau di jalan pertama dianggap belum menguji apa pun dan ditinjau ulang.
- **Bukti merah-hijau untuk penjaga.** Tiap CHECK, trigger, gerbang hak, dan batas laju dibuktikan dengan siklus: hijau, penjaga dicabut sementara di salinan kerja (mis. CHECK kedalaman dihapus, `laju()` dilewati), uji WAJIB merah, penjaga dipulihkan, hijau. Siklus ini dijalankan pengulas `penulis-gerbang` atau `guard-api` di worktree terpisah (`isolation: "worktree"`), tidak di-commit, dan hasilnya (penjaga, perintah, keluaran merah) ditulis di laporan pengulas.
- **Perbaikan bug = uji reproduksi dulu.** Bug SIPPA yang dilaporkan dibetulkan hanya sesudah ada uji yang merah karena bug itu; uji tetap tinggal sebagai penjaga regresi.

### 7.5 Idempotensi dan determinisme

| Permukaan | Uji | Lulus bila |
| --- | --- | --- |
| Migrasi | jalankan dua kali | nol galat |
| Skrip Python | `zona.py` dijalankan dua kali pada masukan sama | keluaran identik byte per byte kecuali kunci `dibuat` |
| Kirim lapangan | kiriman sama dua kali | satu baris per id |
| Dummy | `isi` dua kali lalu `hapus` | nol baris dummy tersisa; baris nyata tidak berubah (hitung sebelum dan sesudah per tabel) |
| Monte Carlo | keadaan sama dua kali | P10/P50/P90 identik |

---

## 8. Pengulas dan penerimaan deploy

### 8.1 Matriks pengulas per jenis perubahan

Pengulas melapor, tidak membetulkan (AGENTS.md §6). Tiap pengulas adalah subagent baru tanpa riwayat pengerjanya, memeriksa sinyal nyata (perintah hijau, siklus merah-hijau §7.4), bukan klaim. Model mengikuti AGENTS.md §1.3.

| Perubahan | `guard-api` (haiku) | `security-reviewer` (sonnet) | `migrasi-idempoten` (haiku) | `inp-reviewer` (sonnet) | `selera-angka` (haiku) | `validasi-model` (sonnet) | `higiene-repo` (haiku) | Sinyal yang wajib diperiksa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rute baru atau berubah di `src/sippa.js`, `src/worker.js`, `src/admin_halaman.js` | wajib | wajib | | | | | | `npm run uji:warga` hijau; tabel §2.4 lengkap untuk rute itu; entri `tests/warga/cakupan.json` |
| Kode penugasan, token perangkat, unggah foto/CSV/PDF, CSP | wajib | wajib | | | | | | uji 413, 429, 401/403, EXIF, injeksi CSV; nol string kode di jawaban |
| Migrasi 0056–0058 atau migrasi SIPPA baru | | | wajib | | | | | `node --test tests/warga/sippa_skema.test.mjs tests/warga/migrasi_beku.test.mjs`; nomor urut; tidak menyunting migrasi yang sudah diterapkan |
| Handler klik/input/tab/geser di `public/pipa/**`, `sw-lapangan.js` | | bila menyisipkan HTML | | wajib | | | | `gerbang-sippa.test.mjs` butir INP; angka Event Timing §2.6 |
| Kartu, tabel, pop-up, laporan PDF, teks berangka | | | | | wajib | | | format id-ID, satuan, sumber dan waktu, pil keyakinan, tanpa presisi palsu, tanpa "100%" |
| `hitung.js`, `studio_mesin.js`, `scripts/data/sippa/*.py`, ambang zona, pemicu, matriks respons, vonis A/B | | | | | | wajib | | `npm run uji:sippa`; self-check Python; reproduksi §4.1; ambang berlabel `asumsi-kebijakan`; tidak ada klaim "diuji" atau "terbukti" |
| Vendor `public/vendor/three/**`, `qrcode/**` | | | | | | | wajib | lisensi ada, versi tercatat, ukuran wajar, tidak ada salinan `* 2.*` |
| Commit besar atau sebelum deploy | | | | | | | wajib | nol berkas `* 2.*` di diff, nol secret, nol berkas besar, tiap berkas baru tepat satu pemilik (`npm run uji:agen`) |
| Buku dan deck | | | | | wajib (angka di DOCX/PPTX) | wajib (klaim efikasi, zona, NPV) | | §5.1 dan §5.2 hijau; penyunting berbeda dari penulis |

Rakitan per tugas paling banyak 1 pengerja + 3 pemeriksa, 4–5 agent bersamaan (AGENTS.md §1.5). Pemeriksa tidak pernah pengerja yang sama.

### 8.2 Gerbang sebelum deploy (sesi induk saja)

Urutan, berhenti di langkah pertama yang gagal:

1. `git status` dan `git diff --stat`: berkas yang dikirim tepat yang dimaksud; tidak ada `* 2.*` (catatan: `migrations/0053_kontak 2.sql` dan `tests/warga/kontak.test 2.mjs` ada di repo per 25 Okt 2026; `migrasi()` di `_bantu.mjs` membaca semua `*.sql` termasuk salinan itu, jadi `higiene-repo` memastikan salinan nyasar tidak ikut commit SIPPA dan melapor ke pemilik untuk dibersihkan).
2. `npm run uji && npm run uji:sippa` hijau di checkout bersih (atau di CI `terbit.yml` yang sudah memuat langkah `uji:sippa`).
3. Self-check Python yang berubah: `python3 scripts/data/sippa/<skrip>.py uji`.
4. Laporan pengulas §8.1 untuk permukaan yang berubah, nol temuan kritis terbuka.
5. Migrasi baru diterapkan dulu: `npx --yes wrangler@4.42.0 d1 migrations apply poskowarga --remote`, lalu hash dicatat ke `tests/warga/migrasi_beku.json` di commit yang sama dengan migrasinya atau commit berikutnya.
6. Pratinjau di cabang `staging` (`terbit.yml` menjalankan `wrangler versions upload --preview-alias staging`), uji asap §8.3 di URL pratinjau. Staging memakai D1/R2 produksi yang sama, jadi semua tulisan uji asap memakai `dummy = 1` dan diakhiri `POST /api/sippa/dummy/hapus`.
7. Promosi dengan merge ke `main`; `terbit.yml` menjalankan uji lagi lalu `wrangler deploy` (PRD §10.6, DESAIN-TEKNIS §8.4). Merge ke `main` sama dengan tayang: `titik.yml` (tiap 3 jam), `banjir.yml` (07.20 WIB), dan `data.yml` (21.20 WIB) juga men-deploy `main`, jadi kode tayang paling lambat 21.20 WIB hari itu walau terbit.yml gagal, dan rollback wajib diikuti revert di `main`.
8. Uji asap §8.3 di produksi.

### 8.3 Uji asap sesudah deploy

Dijalankan sesi induk dengan `curl -s -o /dev/null -w "%{http_code}"` (atau Claude Browser untuk langkah bersesi), hasil dicatat di jejak deploy:

| No | Permintaan | Harapan |
| --- | --- | --- |
| A1 | `GET /pipa` tanpa sesi | 303, `Location` = `/admin/pantau?ke=%2Fpipa` |
| A2 | `GET /pipa` sesi staf `pusdalops` | 200, `cache-control` memuat `no-store`, header CSP memuat `openfreemap.org` dan tidak memuat CDN atau `unsafe-inline` |
| A3 | `GET /pipa` sesi staf `verifikator` | 403 tanpa `Location` |
| A4 | `GET /pipa/lapangan` tanpa sesi | 200 |
| A5 | `GET /pipa/tidakada` sesi staf | 404 |
| A6 | `GET /api/sippa/kit` tanpa sesi | 401 |
| A7 | `GET /api/sippa/data/zona` tanpa sesi dan `GET /api/sippa/data/tidakada` tanpa sesi | status dan panjang badan identik |
| A8 | `GET /api/sippa/data/zona` sesi staf | 200 (sha badan = sha `data/sippa/keluaran/zona.json` yang diunggah) atau 404 bila belum diunggah |
| A9 | Super Admin `POST /api/sippa/dummy/isi` `{layar: "lapangan"}`, satu kiriman lapangan dummy, `GET /api/sippa/log` sebagai staf nyata | kiriman diterima; staf nyata tidak melihat baris dummy |
| A10 | `POST /api/sippa/dummy/hapus` | `dihapus` > 0; `SELECT count(*) FROM sippa_log_gelar WHERE dummy = 1` di D1 remote = 0 |
| A11 | rute lama: `GET /api/titik`, `POST /api/pipa/lapangan` tanpa token, `/lapangan` | tetap sama dengan sebelum deploy (200, 401/403, 200) |
| A12 | sesudah migrasi baru, tanpa kode baru (urutan terbalik yang mungkin) | rute lain repo tidak terganggu; `/api/sippa/*` 503 sopan bila kode lama |
| A13 | (R4, keputusan 56) `GET /pipa/pelihara`, `/pipa/air`, `/pipa/akses` sesi staf; `GET /api/sippa/data/cat` dan `jembatan_dibi` sesi staf | 200; data 200 (sha sama dengan keluaran) atau 404 `belum_ada` |
| A14 | (R4) satu inspeksi dummy komponen lalu `dummy/hapus` | `sippa_komponen` nyata tidak berubah; nol baris `sippa_inspeksi`, `sippa_aset`, `sippa_stok_gerak` dummy tersisa |

### 8.4 Pemicu rollback

Rollback (`npx --yes wrangler@4.42.0 rollback` ke versi sebelumnya LALU revert commit di `main`, dicatat di jejak; tanpa revert, deploy terjadwal berikutnya menayangkan ulang kode rusak) dilakukan segera bila satu dari ini terjadi, tanpa menunggu diagnosis:

- A1, A3, A6, atau A7 gagal (kebocoran hak atau data SIPPA terbaca tanpa sesi);
- A11 gagal (rute lain repo rusak);
- galat 5xx pada `/api/sippa/*` atau rute lain > 1% permintaan dalam 15 menit pertama (log Cloudflare);
- `/pipa/lapangan` tidak bisa mengirim pada ponsel regu pilot saat pilot berjalan.

Migrasi tidak dibalik: tabel baru tidak dibaca rute lain, dan migrasi yang sudah diterapkan tidak pernah disunting. Bila migrasi itu sendiri yang salah, perbaikan berupa migrasi baru bernomor berikutnya. Pilot tidak bergantung pada deploy: bila P0-09 gagal atau di-rollback, regu memakai formulir kertas G3-lite dan staf memasukkan isian lewat `POST /api/sippa/log` sesudah deploy berikutnya lolos (keputusan 49, deploy tidak dipaksa demi jadwal).

---

## 9. Butir yang dulu terbuka dan penyelesaiannya

Semua butir di bawah diselesaikan pada penyelarasan 25 Okt 2026 (rincian di `PENYELARASAN.md`). Tidak ada butir uji yang masih terbuka; pertanyaan pemilik hanya T-A sampai T-K di PRD §2.2.

| No | Butir | Penyelesaian |
| --- | --- | --- |
| 1 | Ambang `≤` di PRD §5.1 dan §9.12.2 | keputusan 51: `<`; PRD dibetulkan; §4.2 |
| 2 | Label "konservatif = jalan utama" tidak cocok dengan data | tiga versi berlabel benar: versi `kendala.json` (A188), jalan utama OSM (A198), semua jalan OSM (A469); PRD §5.1, DESAIN-TEKNIS §3.1, KERANGKA Bab 4 |
| 3 | K2 dan K4 tidak cocok 1% | angka hitung dipakai di `acuan.json` dan PRD §6.2, §9.3, KERANGKA Bab 7, DESIGN-SYSTEM slide C2 |
| 4 | Tanda `hisap` tidak tertulis | ditulis eksplisit di tiap kasus (PRD §9.3, DESAIN-TEKNIS §5.8) |
| 5 | `jam_klien_meleset` tanpa kolom | kolom ada di 0056; penurunan dari `jam_kirim` dan `waktu_klien` di DESAIN-TEKNIS §6.1.5; uji G5, PL7 |
| 6 | Tidak ada rute ekspor probe | `GET /api/sippa/probe.csv` (B, 60/jam) di DESAIN-TEKNIS §4.3 dan rencana ini §2.4; TIKET SP-008 |
| 7 | "Dapat dipakai" tanpa definisi berangka | keputusan 53; §6.3; `vonisPilot` |
| 8 | Kolom `dummy` telemetri | ada di kedua tabel (DESAIN-TEKNIS §3.4); §3.1 tanpa pengecualian |
| 9 | `periksa.py`, `tema.json`, `naskah.py` belum mengenal kajian | B-01 / TIKET SP-004 dengan kode `sippa` |
| 10 | Gerbang T-12 belum ada | dibangun `pipa-data` (§5.4), TIKET SP-086 |
| 11 | `gerbang.test.mjs` tidak memindai `src/sippa.js` | TIKET SP-008 menambah `"sippa"` ke `bn` |
| 12 | `terbit.yml` belum menjalankan `uji:sippa` | TIKET SP-003 (DESAIN-TEKNIS §2.1) |
| 13 | Dua jalur deploy | satu jalur `terbit.yml` via `staging` lalu `main` (PRD §10.6, §8.2) |
| 14 | `kajian/` lawan `data/kajian-bnpb/` | konvensi PRD: `kajian/` = `data/kajian-bnpb/` |
| 15 | Salinan nyasar `migrations/0053_kontak 2.sql` | di luar cakupan SIPPA; `higiene-repo` melapor tiap commit besar (TIKET SP-016) |
| 16 | Harga heli dan sewa pompa banjir `menunggu` | bukan cacat; uji memastikan tampil "menunggu" dengan alasan (T-A) |
