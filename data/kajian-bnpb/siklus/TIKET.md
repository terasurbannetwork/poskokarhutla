# TIKET: Siklus Bencana

Dokumen terakhir dalam urutan otoritas: `KEPUTUSAN-AWAL.md` (KA) > `PRD.md` > `ALUR.md` > `ALGORITMA.md` (ALG) > `DESIGN-SYSTEM.md` (DS) > `DESAIN-TEKNIS.md` (DT) > `KEAMANAN-PRIVASI.md` (KP) > `RENCANA-UJI.md` (RU) > berkas ini. Berkas ini hanya mengatur urutan, pembagian kerja, dan bukti selesai; bila tiket bertentangan dengan dokumen di atasnya, dokumen itu menang dan tiket diperbaiki dulu oleh sesi induk. Versi 1.1, 10 Nov 2026 (Tinjauan 1 diterapkan).

Singkatan peran: WG tamu, BP akun instansi, PD pusdalops, KO koordalops, PM pimpinan, SA Super Admin. Kode uji `UJ-*` ada di RU. Kode butir keputusan `U1` dan seterusnya ada di KA bagian H dan ALG 10.

> **Untuk pekerja agen.** Satu sesi = satu tiket. Jalankan gerbang konteks (AGENTS.md §0), baca tiketmu, lalu hanya bagian dokumen yang disebut di langkah. Kerjakan hanya "Berkas". Yang tidak tertulis: berhenti dan tanya (AGENTS.md §2.1). Kamu subagent: jangan commit, jangan push, jangan deploy.

## 0. Batasan global (rujukan: KA B, DT)

- Berkas: halaman `/siklus*`, rute `/api/siklus/*` dan `/api/instansi/siklus/*`; `public/siklus/**` (paling banyak 40 berkas), `src/siklus*.js`, `scripts/siklus/**`, `tests/siklus/**`. Agent: `siklus`, `warga-api`, `mekanik-mesin`, `pipa-umum`, `penulis-gerbang`.
- D1: awalan `sk_`, kolom `dummy`, hanya `CREATE ... IF NOT EXISTS` dan `ON CONFLICT DO NOTHING`; nomor migrasi = kosong berikutnya SAAT TIKET (0119 sudah `meja_dampak`); sha256 ke `migrasi_beku.json`. R2 `MEDIA`, `siklus/{mentah,bersih,saji}/`, paling besar 4 GB. ID `KJ-<tahun>-<8 Crockford base32>` (16 karakter, SHA-256 kunci pendiri); kunci wilayah BPS 4 digit.
- Angka: label enam nilai, bersumber, berwaktu; tidak ada data = `null` "tidak ada" atau "menunggu", bukan 0; antarsumber berdampingan tanpa `total`; kaji cepat selalu rentang `estimasi-model`; masa depan `hipotesis`.
- Privasi: tanpa registri pengungsi per orang, NIK, KK, KTP; paparan rinci hanya di R2; titik panas, luas, terdampak karhutla hanya dari sistem kita.
- Infrastruktur Free: tanpa cron Worker baru, tanpa kueri pindai D1 di cron, Worker mem-parse paling besar 128 KB; pipeline ke D1 hanya Bearer `PIPA_TOKEN` yang sudah ada; SQL `sk_*` di `src/hak.js`; `siklus.yml` grup `siklus-kaji` dan `siklus-batch`, tidak commit, tidak terbit. Rahasia baru hanya `BPS_API_KEY` (G3, pemilik).
- Tampilan: kepala navy bersama, token Centurisk97, `.sk-*`, kartu `.ex.ex-std` tanpa kaki sumber; tanpa titik tengah dan em dash, tanpa kata merek terlarang (KA 23); `fmt` dari `/inti/format.js`; peran yang ada, tanpa peran baru (KA 27a).

## 1. Aturan semua tiket

1. **Mengikuti AGENTS.md** §0 (gerbang konteks lalu ucapkan CAKUPAN, DI LUAR, BUKTI SIAP), §3.2 (satu pengerja `sonnet`, pemeriksa bersih `haiku` yang bukan pengerja), §3.3 (hanya `main`; `git status --porcelain <berkas>` dulu, kotor oleh sesi lain berarti baca diff dan jangan timpa), §9 (tanpa `wrangler deploy`, gerbang tidak dilemahkan, berkas `* 2.*` tidak disentuh). Subagent tidak commit, tidak push, tidak deploy; tiket [induk] meng-commit dengan path spesifik (`npm run dorong`). Tiket [pemilik] (rahasia, jawaban U, unggah dari mesin pemilik, migrasi produksi) tidak memblokir; bawaan KA bagian H dipakai dan hasilnya diberi tanda.
2. **Selesai** = kolom Bukti hijau, pemeriksa tanpa temuan tinggi, status diubah `selesai` oleh sesi induk saat commit. Setelah kerja: `ilmu.mjs catat siklus <berkas> <bersih|temuan|dikerjakan> "<ringkas>"` per berkas, pelajaran lewat `ilmu.mjs kasus siklus "..."`.
3. **Kepemilikan.** Berkas di luar wilayah pengerja tidak disunting; laporkan pemiliknya (`ilmu.mjs pemilik`). Kode KA bagian E dipakai ulang, tidak disalin. `tests/warga/**` selalu `warga-api`, `tests/siklus/**` selalu `siklus`, `tests/agen/**` `penulis-gerbang`; tiket yang melanggar dipecah. Tiap berkas uji adalah Berkas tiket PERTAMA yang memakainya (baris "Uji"); tiket sesudahnya memperluas. Semua SQL `sk_*` ditulis sebagai fungsi di `src/hak.js`.
4. **Uji mengikuti letak logika** (`~/.claude/TEST.md`, RU 0). Tiket yang menambah rute, tabel, trigger, atau CHECK menambah uji yang menjalankannya dan membuktikan yang salah DITOLAK; pendaftarannya di `tests/warga/cakupan.json` dikerjakan tiket cakupan gelombangnya (`diuji`, atau `dikecualikan` beralasan; `antre` tidak bertambah).
5. **Data baru punya pemakai dan jadwal** (`gerbang-peta-data`): sumber baru masuk `sumber.json` dengan pemilik, pemakai, jadwal, lisensi sebelum ada skrip yang mengambilnya.

## 2. Ringkasan per gelombang

| Gelombang | Fitur | Tiket | Jumlah |
| --- | --- | --- | --- |
| G1 | G0 lapis gudang data, F1 Buku Besar, F2 Peta Paparan | SK-001 sampai SK-050 | 50 |
| G2 | F3 Kaji Cepat Otomatis | SK-051 sampai SK-065 | 15 |
| G3 | F4 Jitupasna ke R3P | SK-066 sampai SK-084 | 19 |
| G4 | F5 Renkon dan Gladi, F6 Masa Depan, F7 Pintu | SK-085 sampai SK-111 | 27 |

Semua status `belum`. Nomor disusun ulang karena belum ada tiket dikerjakan; tiket rahasia token lama dihapus (`PIPA_TOKEN` dipakai ulang).

| Kode | Judul |
| --- | --- |
| SK-001 | Skrip `uji:siklus` [induk] |
| SK-002 | Registri sumber |
| SK-003 | Konstanta Py dan JS |
| SK-004 | `kunci.py` |
| SK-005 | `panen.py` |
| SK-006 | `gudang.py`, manifest, dan anggaran |
| SK-007 | Ukur bucket R2 dan waktu unggah per objek [induk] |
| SK-008 | `saji.py` |
| SK-009 | `acuan.json` kasus G0 dan F1, gerbang publik |
| SK-010 | `bersih_dibi.py` |
| SK-011 | `bersih_logbook.py` |
| SK-012 | Adapter panen G1: DIBI harian, GDACS, GLIDE, USGS |
| SK-013 | `unggah_riwayat.py` dan `rollback.sql` |
| SK-014 | Unggah riwayat dari mesin pemilik [pemilik] |
| SK-015 | Migrasi G1 `sk_kejadian` |
| SK-016 | `src/siklus_hitung.js` bagian F1 |
| SK-017 | Cangkang `layaniSk`, cabang `worker.js`, dan bagian Siklus `src/hak.js` |
| SK-018 | `lingkupKab4` untuk akun BPBD |
| SK-019 | `run_worker_first`, aset berkunci, daftar putih |
| SK-020 | Rute baca kejadian |
| SK-021 | Rute tulis kejadian dan antrean |
| SK-022 | Rute ingest |
| SK-023 | `pasang.py` |
| SK-024 | `arsip_kejadian.py` |
| SK-025 | `siklus.yml` job harian, riwayat, mingguan |
| SK-026 | Cangkang layar, `inti.js`, `kamus.json`, `hitung.js` |
| SK-027 | Layar daftar kejadian |
| SK-028 | Layar detail kejadian dan antrean |
| SK-029 | Halaman publik kejadian dan `atribusi.json` |
| SK-030 | Rute dummy dan isi G1 |
| SK-031 | Tombol dummy dua ikon |
| SK-032 | `bangunan.yml` 38 provinsi, pengukuran |
| SK-033 | Bagi `bangunan.py` per pulau bila perlu |
| SK-034 | Uji kontrak bangunan lama tidak berubah |
| SK-035 | `bahaya_kelas.py` |
| SK-036 | `paparan.py` |
| SK-037 | `fasilitas.py` |
| SK-038 | Rute paparan |
| SK-039 | Layar paparan |
| SK-040 | Berkas contoh dummy paparan di R2 |
| SK-041 | Dummy layar paparan (mode contoh) |
| SK-042 | Sapuan INP dan 1440/390 layar G1 |
| SK-043 | Daftar layar G1 di gerbang kartu standar |
| SK-044 | Uji peran, XSS, rencana kueri G1 |
| SK-045 | `cakupan.json` G1 |
| SK-046 | `tests/siklus/cakupan.json` dan peta data G1 |
| SK-047 | Job mingguan dan bulanan: fasilitas dan kelas bahaya |
| SK-048 | Peta data dan registri sumber |
| SK-049 | Jawaban pertanyaan G1 [pemilik] |
| SK-050 | Rilis G1 [induk] |
| SK-051 | Migrasi G2 `sk_kaji` |
| SK-052 | Adapter panen G2: USGS ShakeMap |
| SK-053 | Rute kaji dan `ingest/kaji` |
| SK-054 | `kaji_gempa.py` |
| SK-055 | `kaji_banjir.py` |
| SK-056 | `ujibalik.py` |
| SK-057 | Layar kaji |
| SK-058 | Job `kaji` di `siklus.yml` |
| SK-059 | Dummy G2 |
| SK-060 | Uji peran kaji |
| SK-061 | Daftar layar kaji di gerbang kartu standar |
| SK-062 | `cakupan.json` G2 |
| SK-063 | `tests/siklus/cakupan.json` G2 |
| SK-064 | Jawaban pertanyaan G2 [pemilik] |
| SK-065 | Rilis G2 [induk] |
| SK-066 | Jawaban pertanyaan G3 dan `BPS_API_KEY` [pemilik] |
| SK-067 | Migrasi G3 |
| SK-068 | `src/siklus_hitung.js` bagian F4 |
| SK-069 | `hitung.js` F4 dan paritas |
| SK-070 | Ekspor baca rumah rusak dan pemulihan |
| SK-071 | Rute Jitupasna, baris, hitung, harga |
| SK-072 | Rute R3P, tanda setuju, dan syarat fase |
| SK-073 | `bps.py` IKK dan IHPB |
| SK-074 | Job `bulanan` BPS di `siklus.yml` |
| SK-075 | Layar pulih dan Jitupasna |
| SK-076 | Layar R3P dan unduh draf |
| SK-077 | Laporan Jitupasna lima bagian (PRD F4-08) |
| SK-078 | `antre.js` formulir luring |
| SK-079 | Dummy G3 |
| SK-080 | Uji alur ujung ke ujung G3 |
| SK-081 | Daftar layar pulih di gerbang kartu standar |
| SK-082 | `cakupan.json` G3 |
| SK-083 | `tests/siklus/cakupan.json` G3 |
| SK-084 | Rilis G3 [induk] |
| SK-085 | Migrasi G4 `sk_renkon`, `sk_gladi` |
| SK-086 | `src/siklus_hitung.js` bagian F5 |
| SK-087 | `hitung.js` F5 dan paritas |
| SK-088 | Rute renkon dan ekspor stok |
| SK-089 | Rute gladi dan pemutaran ulang |
| SK-090 | Jenis pengingat renkon |
| SK-091 | Layar renkon |
| SK-092 | Layar gladi |
| SK-093 | Adapter panen G4: CHIRPS, PSMSL, AR6 |
| SK-094 | `iklim_lab.py` |
| SK-095 | `ghsl_lab.py` dan saji masa depan |
| SK-096 | Rute masa depan |
| SK-097 | Layar masa depan dan `masa_depan_ringkas.json` |
| SK-098 | Rute pintu dan registri |
| SK-099 | Alat MCP ringkasan resmi |
| SK-100 | Layar pintu `/siklus` dan registri |
| SK-101 | Pembuka profil wilayah dari pintu (PRD F7-04) |
| SK-102 | Kartu Siklus di pintu BNPB dan menu |
| SK-103 | Job `bulanan` iklim dan `lab` |
| SK-104 | Dummy G4 |
| SK-105 | Uji peran lengkap |
| SK-106 | Daftar layar G4 di gerbang kartu standar |
| SK-107 | `cakupan.json` G4 |
| SK-108 | `tests/siklus/cakupan.json` G4 |
| SK-109 | Jawaban pertanyaan G4 [pemilik] |
| SK-110 | Rilis G4 [induk] |
| SK-111 | Penutupan program [induk] |

## 3. Gelombang G1: lapis gudang data, Buku Besar, Peta Paparan

### 3.1 Fondasi dan G0

#### SK-001 Skrip `uji:siklus` [induk]
Pengerja: mekanik-mesin. Bergantung: tidak ada. Uji: tidak ada.
Berkas: `package.json`. Di luar: kode Siklus; baris peta modul AGENTS.md sudah ada.
Langkah: tambah skrip `uji:siklus` persis DT 10 (semua `uji` Python di DT 10 lalu `node --test --test-concurrency=1 tests/siklus/*.test.mjs tests/warga/siklus_*.test.mjs`); sambung ke rantai `npm run uji` bila pola `uji:kemitraan` melakukannya.
Bukti: `npm run uji:agen` hijau; `node -e "console.log(require('./package.json').scripts['uji:siklus'])"` mencetak skrip. Pemeriksa: higiene-repo.

#### SK-002 Registri sumber
Pengerja: siklus. Bergantung: SK-001. Uji: dibuat `tests/siklus/gerbang_registri.test.mjs`.
Berkas: `scripts/siklus/sumber.json`, `scripts/siklus/registri.py`, `tests/siklus/gerbang_registri.test.mjs`. Di luar: skrip pengambil.
Langkah: lengkapi 42 sumber yang sudah ada di `sumber.json` (jangan membuat daftar kedua) dengan `pemilik` (agent pengambil), `pemakai` (fitur, skrip, atau layar yang membaca), dan `jeda` (detik antarpermintaan, paling sedikit 2), di samping id, endpoint, lisensi dan atribusi (teks yang belum dibaca ditandai `menunggu`), jadwal, status uji (DT 6, KP 11, R2); anggaran per lapis dan fitur (tidak melampaui 4 GB, nilai `menunggu` bila tak diukur); sumber `gagal` tidak diambil; subperintah `uji` memeriksa pemilik, pemakai, jadwal (cermin `gerbang-peta-data`).
Bukti: `python3 -I scripts/siklus/registri.py uji`; `node --test tests/siklus/gerbang_registri.test.mjs` (UJ-G0-01).
Pemeriksa: higiene-repo.

#### SK-003 Konstanta Py dan JS
Pengerja: siklus. Bergantung: SK-001. Uji: dibuat `tests/siklus/paritas.test.mjs`, `tests/siklus/fixtures/acuan.json`.
Berkas: `scripts/siklus/konst.py`, `public/siklus/konst.js`, `tests/siklus/paritas.test.mjs`, `tests/siklus/fixtures/acuan.json` (bagian konstanta). Di luar: nilai yang `menunggu`.
Langkah: konstanta bernama dari ALG: `JENDELA_JENIS` (semua 3), `BASI_HARI` 3, `PITA` 4, ambang bangunan 0,70, batas InaRISK 0,33 dan 0,66, `rehab_macet_hari` 60, `renkon_segera_hari` 90, tabel JRC, `TAG_OSM`; parameter tanpa nilai tertulis `null` dan "menunggu", tidak ditebak.
Bukti: `node --test tests/siklus/paritas.test.mjs` (konst.py sama dengan konst.js).
Pemeriksa: validasi-model.

#### SK-004 `kunci.py`
Pengerja: siklus. Bergantung: SK-001. Uji: `uji` di `kunci.py`.
Berkas: `scripts/siklus/kunci.py`. Di luar: `scripts/bnpb/kunci_kejadian.py` (dibaca, tidak diubah), tabel kunci kedua.
Langkah: bungkus `kab_kunci` dan `hvc_dasar.kab_kode`; tiga konvensi (`32|Bogor`, `3201`, `32.01`) menjadi BPS 4 digit; tak terpetakan dihitung `kab_tak_terpetakan`.
Bukti: `python3 -I scripts/siklus/kunci.py uji` (UJ-G0-06). Pemeriksa: higiene-repo.

#### SK-005 `panen.py`
Pengerja: siklus. Bergantung: SK-002. Uji: `uji` di `panen.py`.
Berkas: `scripts/siklus/panen.py`. Di luar: adapter sumber yang lisensinya `menunggu`.
Langkah: satu klien jaringan: UA proyek, jeda minimal 2 detik antarpermintaan, 3 kali coba jeda 2 detik, hormati 429 `Retry-After`, tanpa CAPTCHA; gagal total mempertahankan `saji` terakhir dan memberi `menunggu`, tidak mengisi nol; hasil ke `mentah/<sumber>/<YYYY>/<tanggal>.<ext>`; adapter dimuat dari `scripts/siklus/adapter_g*.py` (tiket adapter).
Bukti: `python3 -I scripts/siklus/panen.py uji` (server tiruan, UJ-G0-05). Pemeriksa: security-reviewer.

#### SK-006 `gudang.py`, manifest, dan anggaran
Pengerja: siklus. Bergantung: SK-002. Uji: `uji` di `gudang.py`.
Berkas: `scripts/siklus/gudang.py`. Di luar: bucket `bangunan/` (tidak dipindah), `wrangler deploy`.
Langkah: `put/get/hapus` lewat biner `wrangler@4.42.0` yang dipasang SEKALI per job (bukan `npx` per objek) atau folder `--lokal`; `ls` dibaca dari `manifest.json` (wrangler 4.42.0 tidak punya `r2 bulk` maupun daftar objek); sidik SHA-256 kanonik (ALG G0.2) dibandingkan dengan manifest, hanya berkas berubah diunggah (`xargs -P 8`, DT 6.2) dan manifest diunggah paling akhir; tulis `anggaran.json`; tolak unggah di atas anggaran dengan laporan `{lapis, berkas, u, t_L, a_L, kelebihan}`; `t_L` dari manifest, bukan pindai R2.
Bukti: `python3 -I scripts/siklus/gudang.py uji` (UJ-G0-02, 03, 04, 14). Pemeriksa: higiene-repo.

#### SK-007 Ukur bucket R2 dan waktu unggah per objek [induk]
Pengerja: mekanik-mesin. Bergantung: SK-006. Uji: tidak ada.
Berkas: tidak ada berkas kode; hasil dilaporkan dan angka anggaran `menunggu` di registri diisi tiket cakupan G1. Di luar: menulis ke bucket.
Langkah: `wrangler r2 bucket info` untuk bucket foto; catat pemakaian awal dan sisa dari batas 10 GB; unggah 40 berkas kecil uji lewat `gudang.py` dan catat detik per objek (t di DT 6.2, asumsi 3 detik); laporkan ke sesi induk.
Bukti: keluaran perintah dilampirkan di laporan. Pemeriksa: sesi induk.

#### SK-008 `saji.py`
Pengerja: siklus. Bergantung: SK-006. Uji: `uji` di `saji.py`.
Berkas: `scripts/siklus/saji.py`. Di luar: berkas `public/` selain `--public` yang dijalankan manual.
Langkah: bangun `manifest.json`, `laporan_bersih.json`, `registri.json`, `anggaran.json`; selubung bersama `{v, jenis, dibuat, sumber, yakin}`; tolak berkas lewat batas DT 5.2 dan kunci `total`, `jumlah_gabungan`, `rata`; opsi `--public` membangkitkan `atribusi.json` dan `masa_depan_ringkas.json`.
Bukti: `python3 -I scripts/siklus/saji.py uji` (UJ-G0-10, UJ-UK-03). Pemeriksa: selera-angka.

#### SK-009 `acuan.json` kasus G0 dan F1, gerbang publik
Pengerja: siklus. Bergantung: SK-003, SK-008. Uji: dibuat `tests/siklus/gerbang_publik.test.mjs`; diperluas `fixtures/acuan.json`.
Berkas: `tests/siklus/fixtures/acuan.json`, `tests/siklus/gerbang_publik.test.mjs`. Di luar: berkas `tests/agen/**`.
Langkah: kasus acuan dari ALG yang dihitung ulang (vektor ID F1.2 `KJ-2026-9A2WGN3G`, `KJ-2026-8N57ZZ0Y`, `KJ-2026-MT5Z0ZVT`, `KJ-2026-K3JQG02Y`, sidik, anggaran, selisih); gerbang `siklus_publik`: berkas `public/siklus/**` paling banyak 40, tanpa surel, telepon, koordinat lebih dari 3 desimal, `innerHTML` berdata mentah, atribut `on*`, titik tengah, em dash, dan kata merek terlarang KA 23.
Bukti: `node --test tests/siklus/paritas.test.mjs tests/siklus/gerbang_publik.test.mjs` (INV-6, INV-8, UJ-G0-11). Pemeriksa: higiene-repo.

#### SK-010 `bersih_dibi.py`
Pengerja: siklus. Bergantung: SK-004, SK-006. Uji: `uji` di `bersih_dibi.py`.
Berkas: `scripts/siklus/bersih_dibi.py`. Di luar: `public/data/dibi_*`.
Langkah: `mentah/dibi_harian/*` dan `dibi_kejadian.json` menjadi `bersih/dibi/<YYYY>.jsonl.gz` kunci BPS 4; aturan F1.6 nomor 1 sampai 3 dan 5; hitung per alasan; masuk = tersisa + dibuang.
Bukti: `python3 -I scripts/siklus/bersih_dibi.py uji` (UJ-G0-07). Pemeriksa: validasi-model.

#### SK-011 `bersih_logbook.py`
Pengerja: siklus. Bergantung: SK-004, SK-006. Uji: `uji` di `bersih_logbook.py`.
Berkas: `scripts/siklus/bersih_logbook.py`. Di luar: `data/pusdalops/logbook_kejadian.csv` (dibaca saja).
Langkah: enam aturan ALG F1.6 berurutan; hanya kolom terstruktur, teks bebas (`kendala`, `kebutuhan`, narasi) dibuang; saring teks luar KP 6.1 (NFKC, buang bidi dan kontrol, buang `<` `>`, potong); laporan jumlah baris dibuang per alasan.
Bukti: `python3 -I scripts/siklus/bersih_logbook.py uji` (UJ-G0-08, UJ-G0-09). Pemeriksa: security-reviewer.

#### SK-012 Adapter panen G1: DIBI harian, GDACS, GLIDE, USGS
Pengerja: siklus. Bergantung: SK-002, SK-005. Uji: `uji` di `adapter_g1.py`.
Berkas: `scripts/siklus/adapter_g1.py`. Di luar: ReliefWeb (U6), PetaBencana tanpa lisensi, riwayat DIBI penuh (itu lewat `unggah_riwayat.py`).
Langkah: adapter lewat `panen.py` (jeda 2 detik): DIBI harian yang ada di repo (`public/data/dibi_kejadian.json` dan sejenisnya) ke `mentah/dibi_harian/`; GDACS (GeoJSON, RSS), GLIDE, USGS FDSN dengan id disimpan sebagai pengenal luar, bukan angka (PRD F1-07); lisensi dan atribusi tiap sumber dari `sumber.json`; gagal = pertahankan `saji` terakhir dan `menunggu`. Adapter G2 (USGS ShakeMap) dan G4 (iklim) masuk di gelombangnya.
Bukti: `python3 -I scripts/siklus/adapter_g1.py uji` (server tiruan, UJ-G0-05). Pemeriksa: security-reviewer.

#### SK-013 `unggah_riwayat.py` dan `rollback.sql`
Pengerja: siklus. Bergantung: SK-006, SK-010, SK-011. Uji: `uji` di `unggah_riwayat.py` (memeriksa daftar tabel `rollback.sql`).
Berkas: `scripts/siklus/unggah_riwayat.py`, `scripts/siklus/rollback.sql`. Di luar: `migrations/`.
Langkah: unggah DIBI harian penuh (57.161 baris) ke `mentah/dibi_harian/` dari mesin pemilik, cetak hash dan jumlah baris; `rollback.sql` `DROP TABLE IF EXISTS` untuk semua tabel `sk_*` DT 3 (keempat gelombang, urut terbalik) sekaligus, sehingga tiket migrasi tidak perlu menyunting berkas siklus; `uji` memeriksa tiap tabel DT 3 ada di berkas itu.
Bukti: `python3 -I scripts/siklus/unggah_riwayat.py uji` (UJ-G0-13 bagian Py). Pemeriksa: migrasi-idempoten.

#### SK-014 Unggah riwayat dari mesin pemilik [pemilik]
Pengerja: pemilik. Bergantung: SK-013.
Berkas: tidak ada. Langkah: pemilik menjalankan `unggah_riwayat.py` di mesin yang memegang riwayat DIBI penuh; melaporkan hash dan jumlah baris. TIDAK wajib untuk rilis G1: sebelum diunggah, sasaran yang butuh riwayat tampil `menunggu`. Bukti: keluaran skrip. Pemeriksa: sesi induk.

### 3.2 F1: Buku Besar Kejadian

#### SK-015 Migrasi G1 `sk_kejadian`
Pengerja: warga-api. Bergantung: SK-001, SK-013. Uji: dibuat `tests/warga/siklus_skema.test.mjs`.
Berkas: `migrations/<n>_sk_kejadian.sql` (n = nomor kosong berikutnya saat tiket), `tests/warga/migrasi_beku.json`, `tests/warga/siklus_skema.test.mjs`. Di luar: tabel `meja_*`, migrasi yang ada, `scripts/siklus/rollback.sql`.
Langkah: `sk_kejadian` (fase termasuk `digabung`, kolom `ke`), `sk_kejadian_kab`, `sk_kejadian_alias`, `sk_kejadian_sumber` (`asal_id`, indeks `sk_ks_mulai`), `sk_jejak`, indeks parsial, trigger `sk_kejadian_fase` dan `sk_kejadian_publik` persis DT 3.1; uji tambahan: tiap tabel migrasi ada di `rollback.sql` dan skrip itu jalan di Miniflare mengosongkan skema.
Bukti: `node --test tests/warga/siklus_skema.test.mjs` (UJ-F1-01, 02, 03, UJ-G0-13); `npm run uji:warga`. Pemeriksa: migrasi-idempoten.

#### SK-016 `src/siklus_hitung.js` bagian F1
Pengerja: warga-api. Bergantung: SK-009. Uji: dibuat `tests/warga/siklus_hitung.test.mjs`.
Berkas: `src/siklus_hitung.js`, `tests/warga/siklus_hitung.test.mjs`. Di luar: bagian F4 dan F5; `tests/siklus/**` (tidak disunting; `acuan.json` dibaca).
Langkah: fungsi murni `idKejadian(kunci, n)` (SHA-256, 40 bit, Crockford base32, ALG F1.2; hasil sama persis dengan vektor di `acuan.json`), selisih antarsumber (ALG F1.7), resolusi alias (pengaman 32 langkah), `basi`; tanpa dependensi D1.
Bukti: `node --test tests/warga/siklus_hitung.test.mjs` (UJ-F1-04 bagian JS, UJ-F1-08 resolusi, UJ-F1-09). Pemeriksa: selera-angka.

#### SK-017 Cangkang `layaniSk`, cabang `worker.js`, dan bagian Siklus `src/hak.js`
Pengerja: warga-api. Bergantung: SK-015. Uji: dibuat `tests/warga/siklus_peran.test.mjs`.
Berkas: `src/siklus.js`, `src/worker.js`, `src/hak.js`, `tests/warga/siklus_peran.test.mjs` (satu cabang sebelum gerbang host, pola `layaniKm`, cabang instansi lebih dulu dari pembungkus `/api/instansi`). Di luar: logika rute fitur. Sebelum menyunting `src/hak.js`: `git status --porcelain src/hak.js`, baca diff, tambah di akhir berkas.
Langkah: bagian Siklus `src/hak.js` (DT 2.3: `MATRIKS` `sk_*` G1, `sedia`, `skBatch` yang menolak batch tanpa `sk_jejak`); `src/siklus*.js` tidak menyentuh `env.DB`. Pencocokan jalur, gerbang peran pertama, `tolakOrigin`, `x-pb`, `bacaBody`, laju, `sk_*` belum ada = 503, `env.SIKLUS_MATI === "1"` = 503, jawaban staf `private, no-store`, header halaman `halamanBnpbPublik({pribadi:true})`.
Bukti: `node --test tests/warga/siklus_peran.test.mjs` bagian cangkang (UJ-KP-01, 04, 05, 10); `node --test tests/agen/gerbang-d1.test.mjs`. Pemeriksa: guard-api, security-reviewer.

#### SK-018 `lingkupKab4` untuk akun BPBD
Pengerja: warga-api. Bergantung: SK-017. Uji: dibuat `tests/warga/siklus_kab.test.mjs`.
Berkas: `src/siklus_kab.js`, `tests/warga/siklus_kab.test.mjs`. Di luar: `src/instansi.js` (`dalamLingkup` tidak diubah).
Langkah: DT 4.1: `lingkupKab4(akun, kab4)` (provinsi = 2 digit pertama; akun `kab` dibandingkan lewat nama); konstanta `NAMA_KAB4` dibangun sekali dari kolom `kode` dan `kab` `scripts/udara/kota.json`; uji membuktikan konstanta sama dengan `kota.json`.
Bukti: `node --test tests/warga/siklus_kab.test.mjs` (akun `kab`: kabupaten sendiri lolos, tetangga dan provinsi lain ditolak; akun `prov`: provinsi sendiri lolos, provinsi lain ditolak; kab4 tak dikenal ditolak). Pemeriksa: guard-api.

#### SK-019 `run_worker_first`, aset berkunci, daftar putih
Pengerja: warga-api. Bergantung: SK-017. Uji: dibuat `tests/warga/siklus_aset.test.mjs`.
Berkas: `wrangler.jsonc`, `src/siklus.js`, `tests/warga/siklus_aset.test.mjs`. Di luar: pola LogPal yang ada.
Langkah: tambah `"/siklus/*"` ke `run_worker_first` (kini `["/*.html", "/logpal/*"]`) dan komentar alasannya; aset `private, max-age=600`; daftar putih tanpa sesi: cangkang publik, `publik.js` (mandiri), `publik.css`, `data/{atribusi,kamus,masa_depan_ringkas}.json`; `/siklus/kejadian/:id` tamu menerima `publik.html`, halaman lain tanpa sesi 303 `/admin/masuk?ke=`; catat jalur di `PUBLIK_TANPA_SESI` dengan alasan.
Bukti: `node --test tests/warga/siklus_aset.test.mjs` (UJ-KP-10); `npm run uji:warga`. Pemeriksa: guard-api.

#### SK-020 Rute baca kejadian
Pengerja: warga-api. Bergantung: SK-016 sampai SK-018. Uji: dibuat `tests/warga/siklus_kejadian.test.mjs`.
Berkas: `src/siklus_kejadian.js`, `src/hak.js` (fungsi `sk*` baca), `tests/warga/siklus_kejadian.test.mjs`. Di luar: rute tulis.
Langkah: `GET kejadian`, `kejadian/arsip` (aliran R2), `kejadian/:id` (D1 dulu, lalu R2 bila `tahun` dan `kab4` ada; kab, sumber berdampingan, `selisih[]` dihitung server, alias `{alias_ke}`); daftar tanpa fase `digabung`; BP lewat `lingkupKab4`, `publik/kejadian/:id` (404 seragam, tembolok tepi), `jejak`; indeks terpakai, rentang lebih dari 366 hari 400.
Bukti: `node --test tests/warga/siklus_kejadian.test.mjs` (UJ-F1-12 bagian baca, UJ-F1-14). Pemeriksa: guard-api.

#### SK-021 Rute tulis kejadian dan antrean
Pengerja: warga-api. Bergantung: SK-016, SK-020. Uji: dibuat `tests/warga/siklus_xss.test.mjs`; diperluas `siklus_kejadian.test.mjs`.
Berkas: `src/siklus_kejadian.js`, `src/hak.js`, `tests/warga/siklus_kejadian.test.mjs`, `tests/warga/siklus_xss.test.mjs`. Di luar: ingest.
Langkah: `POST kejadian` (id dari `idKejadian`, tabrakan hash ulang), `promosi` (body `{tahun,kab4}`; baris tanpa wilayah 400), `fase` (turun ke `terdeteksi`/`dibatalkan` menurunkan `publik` ke 0 dalam batch yang sama), `publik`, `gabung` (fase `digabung`, `ke`, `sk_kejadian_kab`), `koreksi` (pengganti pecah), `antrean`; satu batch dengan satu baris `sk_jejak`; laju per DT 4; ringkasan publik tanpa telepon atau surel (`teks()`).
Bukti: `node --test tests/warga/siklus_kejadian.test.mjs tests/warga/siklus_xss.test.mjs` (UJ-F1-08, 12, 14, bagian rute UJ-F1-15; UJ-KP-07, 08, 11). Pemeriksa: security-reviewer, guard-api.

#### SK-022 Rute ingest
Pengerja: warga-api. Bergantung: SK-016, SK-017. Uji: dibuat `tests/warga/siklus_ingest.test.mjs`.
Berkas: `src/siklus_kejadian.js`, `src/hak.js`, `tests/warga/siklus_ingest.test.mjs`. Di luar: `pasang.py`; rahasia baru (memakai `PIPA_TOKEN` yang ada).
Langkah: `ingest/jendela` dan `ingest/sumber` (baca terindeks, kolom minimal, `lanjut` untuk halaman) dan `ingest/kejadian` Bearer `PIPA_TOKEN` waktu-tetap (pola `src/pipa.js`), batch paling banyak 200, id kejadian `baru` dari `idKejadian` dengan pemeriksaan tabrakan D1, `ON CONFLICT (sumber, kode, dummy) DO NOTHING`, dummy 400, cookie sesi 400, satu batch plus jejak `sistem:ingest`; `ingest/kaji` ditunda ke tiket rute kaji.
Bukti: `node --test tests/warga/siklus_ingest.test.mjs` (UJ-F1-13, UJ-KP-06). Pemeriksa: security-reviewer.

#### SK-023 `pasang.py`
Pengerja: siklus. Bergantung: SK-003, SK-004, SK-009, SK-022. Uji: `uji` di `pasang.py`; diperluas `paritas.test.mjs`.
Berkas: `scripts/siklus/pasang.py`. Di luar: `scripts/bnpb/kunci_kejadian.py`, `rekonsiliasi_dalops_dibi.py` (dipakai ulang).
Langkah: urutan kanonik, ID `KJ-` ALG F1.2 (Crockford base32, tabrakan `kunci|n`), dua mode (kumpulan sejarah rakus; masuk bertahap hitung kandidat), multi-kabupaten, karhutla `sel:<i>:<j>`, penjaga kode dipakai ulang, fase otomatis hanya `terdeteksi` dan `siap_verifikasi`; GET `ingest/jendela` dan `ingest/sumber` (dipaginasi), hitung, POST ingest.
Bukti: `python3 -I scripts/siklus/pasang.py uji`; `node --test tests/siklus/paritas.test.mjs` (UJ-F1-04 sampai 07, 10; INV-9). Pemeriksa: validasi-model.

#### SK-024 `arsip_kejadian.py`
Pengerja: siklus. Bergantung: SK-010, SK-011, SK-023. Uji: `uji` di `arsip_kejadian.py`.
Berkas: `scripts/siklus/arsip_kejadian.py`. Di luar: D1.
Langkah: `bersih/*` menjadi `kejadian/arsip/<YYYY>/<prov>.json` dan `k<kab4>.json` beku, id sama dengan hasil `pasang.py` (ALG F1.2, tabrakan hash `kunci|n`), baris tanpa wilayah di `tanpa_wilayah`, `selisih` hanya bila dua sumber melapor, `sha256_sumber`, tanpa kunci `total`.
Bukti: `python3 -I scripts/siklus/arsip_kejadian.py uji` (UJ-F1-11). Pemeriksa: validasi-model.

#### SK-025 `siklus.yml` job harian, riwayat, mingguan
Pengerja: mekanik-mesin. Bergantung: SK-006, SK-008, SK-010 sampai SK-012, SK-023, SK-024. Uji: tidak ada.
Berkas: `.github/workflows/siklus.yml`.
Langkah: job `harian` (`50 3 * * *`, 60 menit) urutan DT 6.2; `riwayat` (dispatch `mode: riwayat`, 120 menit); `mingguan` (`50 5 * * 0`, 120 menit, tidak sama dengan menit dan jam `kaji`): panen adapter G1 (GDACS, GLIDE, USGS). Grup concurrency `siklus-batch` (grup `siklus-kaji` untuk job kaji dibuat tiket kaji); tidak commit, tidak terbit; wrangler dipasang sekali per job; secret `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PIPA_TOKEN` (sudah ada); langkah sesudah `pasang` tetap jalan bila `pasang` gagal jaringan.
Bukti: `npm run uji:agen`; `python3 scripts/agents/peta_data.py periksa`. Pemeriksa: higiene-repo.

### 3.3 Layar F1

#### SK-026 Cangkang layar, `inti.js`, `kamus.json`, `hitung.js`
Pengerja: siklus. Bergantung: SK-003, SK-016. Uji: dibuat `tests/siklus/hitung.test.mjs`.
Berkas: `public/siklus/{index.html,siklus.css,inti.js,hitung.js}`, `public/siklus/data/kamus.json`. Di luar: kepala situs bersama, `public/inti/*`.
Langkah: kepala situs navy bersama dan token `tema.css`; `inti.js` (`esc()`, fetch ber-`x-pb`, pil keyakinan enam nilai, `fmt` dari `/inti/format.js` lewat `inti.js` (tanpa formatter kedua)); `kamus.json` label, fase, jenis, singkatan; `hitung.js` cermin `siklus_hitung.js` (paritas dijaga uji); komponen `.sk-*` hanya daftar DS 2.8; empat keadaan layar.
Bukti: `node --test tests/siklus/hitung.test.mjs tests/siklus/gerbang_publik.test.mjs`. Pemeriksa: selera-angka.

#### SK-027 Layar daftar kejadian
Pengerja: siklus. Bergantung: SK-020, SK-026. Uji: dibuat `tests/siklus/layar_kejadian.test.mjs`.
Berkas: `public/siklus/kejadian.js`. Di luar: halaman detail.
Langkah: daftar Buku Besar (DS 3.2), saring jenis, wilayah, fase, rentang; kartu `.ex.ex-std`; deretan pilihan penuh lebar berikon; arsip disaring di peramban per provinsi dan tahun; baris arsip tanpa wilayah tampil "wilayah belum terpetakan, belum bisa dipromosikan".
Bukti: `node --test tests/siklus/layar_kejadian.test.mjs` (UJ-F1-16, 1440 dan 390). Pemeriksa: selera-angka, inp-reviewer.

#### SK-028 Layar detail kejadian dan antrean
Pengerja: siklus. Bergantung: SK-021, SK-027. Uji: diperluas `layar_kejadian.test.mjs`.
Berkas: `public/siklus/kejadian.js`, `public/siklus/pintu.js` hanya bila perlu, `public/siklus/antre.js` TIDAK (milik tiket formulir luring G3). Di luar: halaman publik.
Langkah: linimasa satu halaman DS 3.3: dampak per sumber berdampingan dengan selisih, tanpa kolom total; aksi fase, gabung, publikasi sesuai peran; antrean ambigu dan tanpa wilayah; tautan keluar dari templat host tetap; id alias mengarah ke penyintas; koreksi manual baris sumber (pengganti pecah); promosi arsip memakai `{tahun,kab4}`.
Bukti: `node --test tests/siklus/layar_kejadian.test.mjs` (UJ-F1-15 bagian layar, 16). Pemeriksa: inp-reviewer, security-reviewer.

#### SK-029 Halaman publik kejadian dan `atribusi.json`
Pengerja: siklus. Bergantung: SK-009, SK-019, SK-020, SK-026. Uji: diperluas `gerbang_publik.test.mjs`.
Berkas: `public/siklus/publik.html`, `publik.css`, `publik.js`, `public/siklus/data/atribusi.json`. Di luar: `inti.js` (publik.js mandiri).
Langkah: cangkang publik ringkasan resmi saja (U3 bawaan); panel "Lisensi dan atribusi" dari `atribusi.json` (bukan kaki sumber kartu); tanpa nama korban dan rincian; angka di bawah 5 "di bawah 5".
Bukti: `node --test tests/siklus/gerbang_publik.test.mjs tests/warga/siklus_aset.test.mjs` (UJ-F1-14, UJ-KP-12). Pemeriksa: security-reviewer, selera-angka.

#### SK-030 Rute dummy dan isi G1
Pengerja: warga-api. Bergantung: SK-021. Uji: dibuat `tests/warga/siklus_dummy.test.mjs`.
Berkas: `src/siklus_dummy.js`, `src/hak.js`, `tests/warga/siklus_dummy.test.mjs`. Di luar: ember fitur lain.
Langkah: `POST /api/siklus/dummy {aksi:isi|hapus,halaman,periode?,kab4?}` SA saja, isi ditentukan halaman: kejadian 7 fase, satu sumber `ambigu`, satu `tanpa_wilayah`, dua sumber dengan selisih; periode dari layar; "sudah ada N baris hidup" 409; `hapus` anak sebelum induk dalam satu batch; dummy tak masuk ingest, publik, R2.
Bukti: `node --test tests/warga/siklus_dummy.test.mjs` (UJ-KP-13, INV-5). Pemeriksa: guard-api.

#### SK-031 Tombol dummy dua ikon
Pengerja: siklus. Bergantung: SK-026, SK-027, SK-030. Uji: diperluas `layar_kejadian.test.mjs`.
Berkas: `public/siklus/dummy.js`.
Langkah: dua ikon di tiap halaman Siklus, SA saja (isi dummy untuk halaman yang dibuka, hapus semua); `window.SK.periode` didaftarkan layar; muat ulang penuh sesudahnya; tanpa tombol bagi peran lain.
Bukti: `node --test tests/siklus/layar_kejadian.test.mjs` (dummy terisi lalu terhapus). Pemeriksa: selera-angka.

### 3.4 F2: Peta Paparan per Bangunan

#### SK-032 `bangunan.yml` 38 provinsi, pengukuran
Pengerja: mekanik-mesin. Bergantung: SK-001. Uji: tidak ada.
Berkas: `.github/workflows/bangunan.yml`. Di luar: `scripts/umum/bangunan.py` (milik pipa-umum).
Langkah: dispatch `bulanan` sekali sebagai pengukuran (lama, ukuran cache, daftar `grid_*.json`); cache hanya `grid_*.json` dan `kec.json`; provinsi gagal tetap `terliput:false` dan harian tidak merah; laporkan bila lebih dari 330 menit atau disk 14 GB habis.
Bukti: laporan satu jalan dispatch (UJ-F2-10); `npm run uji:agen`. Pemeriksa: higiene-repo.

#### SK-033 Bagi `bangunan.py` per pulau bila perlu
Pengerja: pipa-umum. Bergantung: SK-032. Uji: tidak ada (uji bawaan `bangunan.py`).
Berkas: `scripts/umum/bangunan.py`. Di luar: kontrak `bangunan/*`, `terpapar.json`, rute `/api/bangunan/*`.
Langkah: bendera `--prov` per kelompok pulau; keluaran identik per provinsi.
Bukti: `python3 scripts/umum/bangunan.py uji` (atau subperintah uji yang ada); hash `grid_33.json` tidak berubah. Pemeriksa: validasi-model.

#### SK-034 Uji kontrak bangunan lama tidak berubah
Pengerja: warga-api. Bergantung: SK-001. Uji: dibuat `tests/warga/siklus_kontrak_lama.test.mjs`.
Berkas: `tests/warga/siklus_kontrak_lama.test.mjs`. Di luar: kode produksi `src/bangunan.js` (hanya dibaca).
Langkah: uji hanya membaca: hash berkas kontrak lama yang ada di repo (`public/data/bnpb/terpapar.json` dan sejenisnya), tiga rute `/api/bangunan/*` lulus uji lamanya, `bangunan/*` tidak dipindah (PRD F2-07).
Bukti: `node --test tests/warga/siklus_kontrak_lama.test.mjs` (UJ-F2-06); `npm run uji:warga`. Pemeriksa: guard-api.

#### SK-035 `bahaya_kelas.py`
Pengerja: siklus. Bergantung: SK-003, SK-006. Uji: `uji` di `bahaya_kelas.py`.
Berkas: `scripts/siklus/bahaya_kelas.py`. Di luar: `scripts/bnpb/terpapar.py`.
Langkah: sampling InaRISK ImageServer per sel halus 110 m; kelas rendah/sedang/tinggi dengan batas dari `konst`; nodata atau gagal = `null`; keluaran berlabel `estimasi-model` dengan `batas_versi` dan catatan bahwa sumber resmi batas tidak ditemukan; raster tidak disimpan.
Bukti: `python3 -I scripts/siklus/bahaya_kelas.py uji` (UJ-F2-01). Pemeriksa: validasi-model.

#### SK-036 `paparan.py`
Pengerja: siklus. Bergantung: SK-004, SK-006, SK-035. Uji: `uji` di `paparan.py`.
Berkas: `scripts/siklus/paparan.py`. Di luar: `scripts/umum/paparan_bangunan.py`, `public/data/bnpb/terpapar.json`.
Langkah: `bangunan/grid_*`, `halus_*`, `kec.json`, zona bahaya (karhutla radius 1, 3, 5 km, banjir poligon, gempa pita MMI, gunung api KRB), tiga sumber jiwa (WorldPop dan Dukcapil dari berkas yang sudah ada di repo, GHSL) berdampingan; Open Buildings utama, agregat Overture ditunda (PRD F2-03), desa lewat titik pusat terdekat; keluaran `paparan/<prov>.json`, `paparan/kab/<kab4>.json`, `paparan/rinci/<kab4>.json` (sel 110 m); tanpa grid `terliput:false`.
Bukti: `python3 -I scripts/siklus/paparan.py uji` (UJ-F2-02, 03, 04, 08). Pemeriksa: validasi-model.

#### SK-037 `fasilitas.py`
Pengerja: siklus. Bergantung: SK-004 sampai SK-006. Uji: `uji` di `fasilitas.py`.
Berkas: `scripts/siklus/fasilitas.py`. Di luar: Sekolah Kita dan SIRS (tidak dipakai).
Langkah: sekolah Dapodik (`public/data/sekolah.json`), Geofabrik OSM (`osmium`), Overpass, Overture places (lab), Wikidata (adapter lewat `panen.py`) menjadi `fasilitas/<kab4>.json`; kategori berkoordinat hanya sekolah, madrasah, kesehatan, ibadah, kantor pemerintah sipil; objek vital, bandara, pelabuhan, pembangkit, lapas, bendungan hanya hitungan; berkas gagal bila ada koordinat terlarang; tiap sumber berdampingan.
Bukti: `python3 -I scripts/siklus/fasilitas.py uji` (UJ-F2-05, UJ-KP-09). Pemeriksa: security-reviewer.

#### SK-038 Rute paparan
Pengerja: warga-api. Bergantung: SK-017, SK-018, SK-036. Uji: diperluas `siklus_peran.test.mjs`.
Berkas: `src/siklus_paparan.js` (atau bagian `src/siklus.js`), `src/hak.js` (jejak `baca_rinci`), `tests/warga/siklus_peran.test.mjs`. Di luar: `src/bangunan.js`.
Langkah: `paparan/ringkas`, `paparan/kab`, `fasilitas`, `rinci` mengalirkan R2; `rinci` dibatasi PD, KO, SA, BP wilayahnya (`lingkupKab4`), parameter `contoh=1` hanya SA dari `_dummy/`, dicatat `baca_rinci`, 300 per jam; PM `fasilitas` baca saja; 403 sebelum R2.
Bukti: `node --test tests/warga/siklus_peran.test.mjs` (UJ-F2-07, UJ-KP-02). Pemeriksa: guard-api, security-reviewer.

#### SK-039 Layar paparan
Pengerja: siklus. Bergantung: SK-026, SK-038. Uji: dibuat `tests/siklus/layar_paparan.test.mjs`.
Berkas: `public/siklus/paparan.js`. Di luar: `public/data/terpapar.json`.
Langkah: pilih wilayah, bahaya, kelas (DS 3.4); agregat per desa dan kecamatan; keterbatasan ditulis (ambang 0,70, +-0,8 km, kelas InaRISK tidak resmi); `terliput:false` tampil "tidak terliput"; tiga sumber jiwa berdampingan; panel peta bisa ditarik.
Bukti: `node --test tests/siklus/layar_paparan.test.mjs` (UJ-F2-09). Pemeriksa: selera-angka, inp-reviewer.

#### SK-040 Berkas contoh dummy paparan di R2
Pengerja: siklus. Bergantung: SK-036. Uji: `uji` di `dummy_saji.py`.
Berkas: `scripts/siklus/dummy_saji.py`. Di luar: berkas nyata `saji/`.
Langkah: `siklus/saji/_dummy/paparan/*` memakai fungsi agregat yang sama dengan `paparan.py` pada fixture kecil, selubung `"dummy":true`, tanpa koordinat nyata, di luar `manifest` produksi (DT 9 butir 6); bagian masa depan ditambah tiket `ghsl`.
Bukti: `python3 -I scripts/siklus/dummy_saji.py uji`. Pemeriksa: selera-angka.

#### SK-041 Dummy layar paparan (mode contoh)
Pengerja: warga-api. Bergantung: SK-030, SK-038, SK-040. Uji: diperluas `siklus_dummy.test.mjs`.
Berkas: `src/siklus_dummy.js`, `src/siklus_paparan.js`, `tests/warga/siklus_dummy.test.mjs`.
Langkah: halaman `paparan` tidak punya tabel D1: `POST dummy {aksi:isi,halaman:paparan}` memeriksa berkas `_dummy/` ada dan memberi `{dibuat:0,per_tabel:{},contoh:true}`; `GET paparan/*?contoh=1` hanya SA dan hanya dari `_dummy/`, tidak pernah dicampur data nyata; `hapus` mematikan mode.
Bukti: `node --test tests/warga/siklus_dummy.test.mjs` (UJ-KP-13 untuk layar tanpa tabel). Pemeriksa: guard-api.

#### SK-042 Sapuan INP dan 1440/390 layar G1
Pengerja: siklus. Bergantung: SK-028, SK-031, SK-039. Uji: diperluas `layar_kejadian.test.mjs`, `layar_paparan.test.mjs`.
Berkas: `tests/siklus/layar_kejadian.test.mjs`, `tests/siklus/layar_paparan.test.mjs` (hanya perluasan). Di luar: kode layar.
Langkah: Chrome CDP 1440 dan 390 dengan dummy terisi (muat ulang penuh); empat keadaan, tanpa 0 palsu; kartu standar; klik tab, urut, saring tidak membekukan; mode contoh paparan.
Bukti: `node --test tests/siklus/layar_*.test.mjs`. Pemeriksa: inp-reviewer.

#### SK-043 Daftar layar G1 di gerbang kartu standar
Pengerja: penulis-gerbang. Bergantung: SK-027, SK-028, SK-039. Uji: tidak ada (memperluas `gerbang-kartu-std.test.mjs`).
Berkas: `tests/agen/gerbang-kartu-std.test.mjs` (tambah entri `LAYAR`). Di luar: melonggarkan pemeriksaan.
Langkah: daftarkan `public/siklus/kejadian.js` dan `public/siklus/paparan.js` dengan `public/siklus/index.html`; entri tanpa pola `lama`.
Bukti: `node --test tests/agen/gerbang-kartu-std.test.mjs`. Pemeriksa: selera-angka.

#### SK-044 Uji peran, XSS, rencana kueri G1
Pengerja: warga-api. Bergantung: SK-019, SK-021, SK-022, SK-038. Uji: dibuat `tests/warga/siklus_rencana_kueri.test.mjs`; diperluas `siklus_peran`, `siklus_xss`.
Berkas: `tests/warga/siklus_peran.test.mjs`, `siklus_xss.test.mjs`, `siklus_rencana_kueri.test.mjs`. Di luar: kode produksi (temuan dilaporkan).
Langkah: satu uji per baris matriks KP 1 untuk rute G1 di dua awalan; fixture XSS; `EXPLAIN QUERY PLAN` tiap kueri `sk_*` tanpa `SCAN` selain tabel kecil terdaftar; 413 dan 429.
Bukti: `node --test tests/warga/siklus_peran.test.mjs tests/warga/siklus_xss.test.mjs tests/warga/siklus_rencana_kueri.test.mjs`. Pemeriksa: security-reviewer, guard-api.

#### SK-045 `cakupan.json` G1
Pengerja: warga-api. Bergantung: SK-034, SK-041, SK-044. Uji: tidak ada.
Berkas: `tests/warga/cakupan.json`, `tests/warga/migrasi_beku.json`.
Langkah: daftarkan semua tabel `sk_*`, trigger, dan rute G1 di `diuji` dengan potongan nama uji yang benar-benar ada, atau `dikecualikan` beralasan.
Bukti: `npm run uji:warga` hijau (gerbang cakupan). Pemeriksa: penulis-gerbang.

#### SK-046 `tests/siklus/cakupan.json` dan peta data G1
Pengerja: siklus. Bergantung: SK-023, SK-024, SK-035 sampai SK-037. Uji: dibuat `tests/siklus/gerbang_cakupan.test.mjs`.
Berkas: `tests/siklus/cakupan.json`, `tests/siklus/gerbang_cakupan.test.mjs`, `scripts/siklus/sumber.json`. 
Langkah: daftarkan tiap rute `/api/siklus/*` ke uji yang memanggilnya dan tiap skrip pipeline ke `uji`-nya; sumber baru ber-pemakai dan ber-jadwal.
Bukti: `npm run uji:siklus`; `python3 scripts/agents/peta_data.py periksa`. Pemeriksa: penulis-gerbang.

#### SK-047 Job mingguan dan bulanan: fasilitas dan kelas bahaya
Pengerja: mekanik-mesin. Bergantung: SK-025, SK-035, SK-037. Uji: tidak ada.
Berkas: `.github/workflows/siklus.yml`.
Langkah: `mingguan` tambah Overpass kesehatan dan Wikidata (`fasilitas.py`); `bulanan` (`40 4 5 * *`, 300 menit): Geofabrik PBF dengan `pip install osmium` (dicatat di workflow), `fasilitas.py`, `bahaya_kelas.py`, grup `siklus-batch`.
Bukti: `npm run uji:agen`; `python3 scripts/agents/peta_data.py periksa`. Pemeriksa: higiene-repo.

#### SK-048 Peta data dan registri sumber
Pengerja: mekanik-mesin. Bergantung: SK-002, SK-025, SK-047. Uji: tidak ada.
Berkas: `scripts/agents/peta_data.py` hanya bila perlu daftar baru; `docs/PETA-DATA.md` dan `docs/peta_data.json` lewat `bangun`. Di luar: menambah utang baru ke `tests/agen/fixtures/peta-data-utang.json`.
Langkah: pastikan semua keluaran dan sumber Siklus terbaca penulisnya, pemakainya, dan jadwalnya; tanpa yatim dan tanpa tanpa-jadwal baru.
Bukti: `python3 scripts/agents/peta_data.py bangun && python3 scripts/agents/peta_data.py periksa` (UJ-G0-12). Pemeriksa: penulis-gerbang.

#### SK-049 Jawaban pertanyaan G1 [pemilik]
Pengerja: pemilik. Bergantung: tidak ada (tidak memblokir).
Berkas: tidak ada. Langkah: jawab U1, U2, U3, U6, U11, U12, U14, U15, U16, U17; bila ada yang dibalik, sesi induk menulis ulang butir KA lalu menyelaraskan dokumen di bawahnya.
Bukti: catatan sesi. Pemeriksa: sesi induk.

#### SK-050 Rilis G1 [induk]
Pengerja: induk. Bergantung: SK-001 sampai SK-013, SK-015 sampai SK-032, SK-034 sampai SK-048 (tanpa SK-014 dan SK-049; riwayat belum diunggah = sasaran terkait tampil `menunggu`).
Berkas: commit berkas G1 dengan path spesifik. Di luar: `wrangler deploy` dari subagent.
Langkah: `npm run uji:siklus` dan `npm run uji:warga` hijau; `higiene-repo`, `migrasi-idempoten`, `guard-api`; sha256 ke `migrasi_beku.json`; pemilik menerapkan `wrangler d1 migrations apply poskowarga --remote`; deploy; aktifkan `siklus.yml`; ingest pertama `dry-run`; laporkan jumlah berkas aset (UJ-UK-06); tunggu `terbit.yml` hijau dan periksa aset tayang dan `/api/status`.
Bukti: `npm run uji:siklus && npm run uji:warga && npm run uji:agen`. Pemeriksa: higiene-repo.

## 4. Gelombang G2: Kaji Cepat Otomatis

#### SK-051 Migrasi G2 `sk_kaji`
Pengerja: warga-api. Bergantung: SK-015. Uji: diperluas `siklus_skema.test.mjs`.
Berkas: `migrations/<n>_sk_kaji.sql` (n = nomor kosong berikutnya saat tiket), `tests/warga/migrasi_beku.json`, `tests/warga/siklus_skema.test.mjs`. Di luar: tabel G1, `rollback.sql` (sudah memuat `sk_kaji`).
Langkah: `sk_kaji` persis DT 3.2 dengan `yakin = 'estimasi-model'` terkunci di CHECK.
Bukti: `node --test tests/warga/siklus_skema.test.mjs` (UJ-F3-01). Pemeriksa: migrasi-idempoten.

#### SK-052 Adapter panen G2: USGS ShakeMap
Pengerja: siklus. Bergantung: SK-002, SK-005. Uji: `uji` di `adapter_g2.py`.
Berkas: `scripts/siklus/adapter_g2.py`. Di luar: `lampu_malam.py`, Sentinel-1.
Langkah: ambil produk `cont_mmi.json` (31 KB, bukan `grid.xml` 32,9 MB) per gempa M5 ke atas 7 hari lewat `panen.py`; gagal ambil = `menunggu_data`, bukan nol; lisensi USGS dari `sumber.json`.
Bukti: `python3 -I scripts/siklus/adapter_g2.py uji` (server tiruan). Pemeriksa: security-reviewer.

#### SK-053 Rute kaji dan `ingest/kaji`
Pengerja: warga-api. Bergantung: SK-017, SK-018, SK-022, SK-051. Uji: dibuat `tests/warga/siklus_kaji.test.mjs`.
Berkas: `src/siklus_kaji.js`, `src/hak.js`, `tests/warga/siklus_kaji.test.mjs`. Di luar: pembacaan `meja` selain isian `kaji_cepat`.
Langkah: `GET kaji`, `kaji/:id` (baris + R2 kurang dari 100 KB + isian petugas meja berdampingan), `POST kaji/:id/status`, `ingest/kaji` versi baru tanpa menimpa; `alasan` wajib `ditarik`.
Bukti: `node --test tests/warga/siklus_kaji.test.mjs` (UJ-F3-08). Pemeriksa: guard-api.

#### SK-054 `kaji_gempa.py`
Pengerja: siklus. Bergantung: SK-003, SK-009, SK-052, SK-053. Uji: `uji` di `kaji_gempa.py`; diperluas `paritas.test.mjs`.
Berkas: `scripts/siklus/kaji_gempa.py`. Di luar: `scripts/gempa/guncangan.py`, `scripts/gempa/pager.py` (dipakai ulang), `scripts/umum/lampu_malam.py` (tidak dipakai).
Langkah: USGS M5 ke atas 7 hari, `cont_mmi.json` (lewat `adapter_g2.py`), `guncangan.mmi_kecamatan` bila grid belum terbit (`menunggu_data`); PAGER (theta 13,248768, beta 0,150846) dan ITB berdampingan sebagai rentang; kelas siaga; galat kalibrasi 3,0586 dan `faktor_loo` 5,341 tertulis; rumah rusak `menunggu`; keluaran `kaji/<KJ>.json` kurang dari 100 KB.
Bukti: `python3 -I scripts/siklus/kaji_gempa.py uji`; `node --test tests/siklus/paritas.test.mjs` (UJ-F3-02, 03). Pemeriksa: validasi-model.

#### SK-055 `kaji_banjir.py`
Pengerja: siklus. Bergantung: SK-036. Uji: `uji` di `kaji_banjir.py`.
Berkas: `scripts/siklus/kaji_banjir.py`. Di luar: Sentinel-1 (belum dipakai layar).
Langkah: `public/banjir/data/kejadian_aktif_geo.json` x paparan x `public/banjir/data/dampak.json`; rentang `[jiwa_terpapar, batas_atas_jam1]`; tanpa kedalaman "kedalaman belum tersedia"; kurva JRC hanya bila kedalaman ada, rupiah `menunggu` tanpa kurs dan faktor harga; karhutla dan gunung api hanya paparan; jenis lain "belum ada perkiraan otomatis".
Bukti: `python3 -I scripts/siklus/kaji_banjir.py uji` (UJ-F3-04, 05, 06). Pemeriksa: validasi-model.

#### SK-056 `ujibalik.py`
Pengerja: siklus. Bergantung: SK-024, SK-054, SK-055. Uji: `uji` di `ujibalik.py`.
Berkas: `scripts/siklus/ujibalik.py`. Di luar: ambang lolos (UA-4 tidak ada).
Langkah: bias, faktor, cakupan terhadap DIBI dan `rumah_rusak`, tiap sumber pengamatan terpisah, `tak_dihitung` dicatat; label tetap `estimasi-model`.
Bukti: `python3 -I scripts/siklus/ujibalik.py uji` (UJ-F3-07). Pemeriksa: validasi-model.

#### SK-057 Layar kaji
Pengerja: siklus. Bergantung: SK-026, SK-053. Uji: dibuat `tests/siklus/layar_kaji.test.mjs`.
Berkas: `public/siklus/kaji.js`. Di luar: `public/bnpb/` kaji meja.
Langkah: daftar dan kartu rentang (DS 3.5 dan 3.6): rentang, pil `estimasi-model`, sumber, waktu, galat kalibrasi, peringatan faktor 5,341 melebihi pita 4, isian petugas berdampingan.
Bukti: `node --test tests/siklus/layar_kaji.test.mjs` (UJ-F3-09). Pemeriksa: selera-angka, inp-reviewer.

#### SK-058 Job `kaji` di `siklus.yml`
Pengerja: mekanik-mesin. Bergantung: SK-025, SK-054, SK-055. Uji: tidak ada.
Berkas: `.github/workflows/siklus.yml`.
Langkah: job `kaji` `20 1-22/3 * * *`, 20 menit, grup concurrency `siklus-kaji` (terpisah dari `siklus-batch`).
Bukti: `npm run uji:agen`; `python3 scripts/agents/peta_data.py periksa`. Pemeriksa: higiene-repo.

#### SK-059 Dummy G2
Pengerja: warga-api. Bergantung: SK-030, SK-053. Uji: diperluas `siklus_dummy.test.mjs`.
Berkas: `src/siklus_dummy.js`, `src/hak.js`, `tests/warga/siklus_dummy.test.mjs`.
Langkah: isi kaji 5 status memakai fungsi rentang yang sama pada MMI contoh; terhubung ke kejadian dummy halaman kejadian.
Bukti: `node --test tests/warga/siklus_dummy.test.mjs`. Pemeriksa: guard-api.

#### SK-060 Uji peran kaji
Pengerja: warga-api. Bergantung: SK-053. Uji: diperluas `siklus_peran.test.mjs`.
Berkas: `tests/warga/siklus_peran.test.mjs`.
Langkah: baris peran kaji (BP luar lingkup 404, PM baca saja, PD ke `status` boleh, WG 403) di dua awalan.
Bukti: `node --test tests/warga/siklus_peran.test.mjs` (UJ-KP-01, 03). Pemeriksa: security-reviewer.

#### SK-061 Daftar layar kaji di gerbang kartu standar
Pengerja: penulis-gerbang. Bergantung: SK-057. Uji: tidak ada (memperluas `gerbang-kartu-std.test.mjs`).
Berkas: `tests/agen/gerbang-kartu-std.test.mjs`.
Langkah: daftarkan `public/siklus/kaji.js`.
Bukti: `node --test tests/agen/gerbang-kartu-std.test.mjs`. Pemeriksa: selera-angka.

#### SK-062 `cakupan.json` G2
Pengerja: warga-api. Bergantung: SK-051, SK-059, SK-060. Uji: tidak ada.
Berkas: `tests/warga/cakupan.json`, `tests/warga/migrasi_beku.json`.
Langkah: daftarkan `sk_kaji`, rute kaji dan `ingest/kaji`, dummy kaji di `diuji` dengan potongan nama uji yang ada.
Bukti: `npm run uji:warga` hijau. Pemeriksa: penulis-gerbang.

#### SK-063 `tests/siklus/cakupan.json` G2
Pengerja: siklus. Bergantung: SK-052, SK-054 sampai SK-056. Uji: diperluas `tests/siklus/cakupan.json`.
Berkas: `tests/siklus/cakupan.json`, `scripts/siklus/sumber.json`. 
Langkah: daftarkan skrip G2 ke `uji`-nya; sumber G2 ber-pemakai dan ber-jadwal.
Bukti: `npm run uji:siklus`; `python3 scripts/agents/peta_data.py periksa`. Pemeriksa: penulis-gerbang.

#### SK-064 Jawaban pertanyaan G2 [pemilik]
Pengerja: pemilik. Bergantung: tidak ada (tidak memblokir).
Langkah: jawab U13 (PAGER atau ITB) dan U18 (ambang uji balik). Bukti: catatan sesi. Pemeriksa: sesi induk.

#### SK-065 Rilis G2 [induk]
Pengerja: induk. Bergantung: SK-050 sampai SK-063.
Langkah: urutan DT 11 seperti SK-050: uji hijau, `migrasi-idempoten`, `validasi-model`, sha256, pemilik menerapkan migrasi, deploy, job `kaji` aktif.
Bukti: `npm run uji:siklus && npm run uji:warga`. Pemeriksa: validasi-model.

## 5. Gelombang G3: Jitupasna ke R3P

#### SK-066 Jawaban pertanyaan G3 dan `BPS_API_KEY` [pemilik]
Pengerja: pemilik. Bergantung: tidak ada (tidak memblokir).
Langkah: jawab U4, U5, U7, U8, U10; berikan teks Perban 5/2017 Pasal 8 ayat (2) bila ada untuk mencocokkan lima sektor; isi `BPS_API_KEY` ke GitHub secret (kunci tetap di Keychain, tidak di berkas). Bukti: catatan sesi. Pemeriksa: sesi induk.

#### SK-067 Migrasi G3
Pengerja: warga-api. Bergantung: SK-015. Uji: diperluas `siklus_skema.test.mjs`.
Berkas: `migrations/<n>_sk_pulih.sql` (n = nomor kosong berikutnya saat tiket), `tests/warga/migrasi_beku.json`, `tests/warga/siklus_skema.test.mjs`. Di luar: `meja_*`, `rumah_rusak`, `pemulihan`.
Langkah: `sk_harga`, `sk_jitupasna`, `sk_jitupasna_baris`, `sk_r3p`, `sk_r3p_kegiatan` (baris `rugi` memakai `komponen`, `arus_rp`, `bulan`), trigger `sk_r3p_status`, `sk_jitupasna_final`, `sk_r3p_setuju` persis DT 3.3; sektor tanpa CHECK daftar.
Bukti: `node --test tests/warga/siklus_skema.test.mjs` (UJ-F4-01, 10). Pemeriksa: migrasi-idempoten.

#### SK-068 `src/siklus_hitung.js` bagian F4
Pengerja: warga-api. Bergantung: SK-016. Uji: diperluas `siklus_hitung.test.mjs`.
Berkas: `src/siklus_hitung.js`, `tests/warga/siklus_hitung.test.mjs`.
Langkah: ALG F4.1 sampai F4.8: klasifikasi (p), harga terindeks, nilai kerusakan, kerugian dan tiga penanda, peta lima sektor, stimulan dan DTH, sisa 90 hari dan PDNA, persen realisasi dan macet; label `asumsi-kebijakan` pada harga; kosong `menunggu`.
Bukti: `node --test tests/warga/siklus_hitung.test.mjs` (UJ-F4-02 sampai 08). Pemeriksa: validasi-model.

#### SK-069 `hitung.js` F4 dan paritas
Pengerja: siklus. Bergantung: SK-026, SK-068. Uji: diperluas `hitung.test.mjs`, `fixtures/acuan.json`.
Berkas: `public/siklus/hitung.js`, `tests/siklus/hitung.test.mjs`, `tests/siklus/fixtures/acuan.json`. Di luar: `src/siklus_hitung.js`.
Langkah: cermin fungsi F4 dan kasus ALG ke `acuan.json`; uji paritas.
Bukti: `node --test tests/siklus/hitung.test.mjs tests/siklus/paritas.test.mjs`. Pemeriksa: validasi-model.

#### SK-070 Ekspor baca rumah rusak dan pemulihan
Pengerja: warga-api. Bergantung: SK-017. Uji: dibuat `tests/warga/siklus_ekspor.test.mjs`.
Berkas: `src/rumah_rusak.js`, `src/pemulihan.js` (hanya menambah ekspor), `tests/warga/siklus_ekspor.test.mjs`. Di luar: mengubah perilaku yang ada.
Langkah: ekspor `bacaRekap` per tingkat per kabupaten atau desa tanpa koordinat, foto, atau nama pelapor, dan pembaca kemajuan `pemulihan`; uji lama tetap hijau.
Bukti: `npm run uji:warga`; `node --test tests/warga/siklus_ekspor.test.mjs` (rekap tanpa koordinat, foto, nama pelapor). Pemeriksa: guard-api, security-reviewer.

#### SK-071 Rute Jitupasna, baris, hitung, harga
Pengerja: warga-api. Bergantung: SK-017, SK-018, SK-067, SK-068, SK-070. Uji: dibuat `tests/warga/siklus_pulih.test.mjs`.
Berkas: `src/siklus_pulih.js`, `src/hak.js`, `tests/warga/siklus_pulih.test.mjs`.
Langkah: `pulih` dan `pulih/:id` (rekap rumah rusak + R3P + kemajuan), `POST pulih` (kejadian `tanggap`/`transisi`), `baris` (idempoten `klien_id`, 600 per jam), `hitung`, `status`, `harga` (`dokumen` wajib); BP menulis baris wilayahnya.
Bukti: `node --test tests/warga/siklus_pulih.test.mjs` (UJ-F4-09 bagian Jitupasna). Pemeriksa: guard-api, security-reviewer.

#### SK-072 Rute R3P, tanda setuju, dan syarat fase
Pengerja: warga-api. Bergantung: SK-021, SK-071. Uji: diperluas `siklus_pulih.test.mjs`, `siklus_kejadian.test.mjs`.
Berkas: `src/siklus_pulih.js`, `src/siklus_kejadian.js` (hanya syarat fase), `src/hak.js`, `tests/warga/siklus_pulih.test.mjs`, `tests/warga/siklus_kejadian.test.mjs`. Di luar: dokumen resmi (hanya teks nomor keputusan).
Langkah: syarat `transisi->pemulihan` kini ditegakkan: R3P `diusulkan` atau lebih harus tertaut (ALUR 2.1); `POST r3p` (Jitupasna `final`), `status`, `kegiatan` dengan `tautan_*` ke `pemulihan` atau meja rehab, `GET r3p/:id` + `hari_tersisa_90`, `setuju` PM saja berlabel "tanda setuju internal".
Bukti: `node --test tests/warga/siklus_pulih.test.mjs` (UJ-F4-09, UJ-KP-07). Pemeriksa: security-reviewer.

#### SK-073 `bps.py` IKK dan IHPB
Pengerja: siklus. Bergantung: SK-005, SK-006. Uji: `uji` di `bps.py`.
Berkas: `scripts/siklus/bps.py`, `scripts/siklus/sumber.json`. Di luar: kunci di berkas.
Langkah: BPS var 2515 (IKK) dan 1018 (IHPB) ke `bersih/`; kunci dari environment (`BPS_API_KEY`, hanya dibutuhkan saat dijalankan sungguhan); seri berdasar beda ditandai `menunggu`; atribusi BPS.
Bukti: `python3 -I scripts/siklus/bps.py uji` (server tiruan). Pemeriksa: security-reviewer.

#### SK-074 Job `bulanan` BPS di `siklus.yml`
Pengerja: mekanik-mesin. Bergantung: SK-047, SK-073. Uji: tidak ada.
Berkas: `.github/workflows/siklus.yml`. Langkah: job `bulanan` `40 4 5 * *`, 300 menit, secret `BPS_API_KEY`. Bukti: `npm run uji:agen`; `python3 scripts/agents/peta_data.py periksa`. Pemeriksa: higiene-repo.

#### SK-075 Layar pulih dan Jitupasna
Pengerja: siklus. Bergantung: SK-026, SK-069, SK-071. Uji: dibuat `tests/siklus/layar_pulih.test.mjs`.
Berkas: `public/siklus/pulih.js`.
Langkah: daftar dan detail Jitupasna (DS 3.7): baris rusak dan rugi, harga bersumber dokumen, tiga penanda, angka berpil `asumsi-kebijakan`, kosong "menunggu".
Bukti: `node --test tests/siklus/layar_pulih.test.mjs` (UJ-F4-12). Pemeriksa: selera-angka, inp-reviewer.

#### SK-076 Layar R3P dan unduh draf
Pengerja: siklus. Bergantung: SK-072, SK-075. Uji: diperluas `layar_pulih.test.mjs`.
Berkas: `public/siklus/pulih.js`. Di luar: tanda tangan resmi.
Langkah: struktur Perban 5/2017, lima sektor, sisa 90 hari, PDNA; unduhan berkop bertanda "DRAF, bukan dokumen resmi" lalu "salinan data, dokumen resmi di luar sistem" setelah `ditetapkan_resmi`; ekspor sel berawal `=`, `+`, `-`, `@` diberi awalan `'`.
Bukti: `node --test tests/siklus/layar_pulih.test.mjs`. Pemeriksa: security-reviewer, selera-angka.

#### SK-077 Laporan Jitupasna lima bagian (PRD F4-08)
Pengerja: siklus. Bergantung: SK-076. Uji: diperluas `layar_pulih.test.mjs`.
Berkas: `public/siklus/pulih.js`. Di luar: tanda tangan resmi.
Langkah: unduhan staf laporan Jitupasna menurut Perka 15/2011 hal. 41: gambaran bencana, akibat dan dampak, kebutuhan R3, perkiraan biaya, penutup; angka berpil `asumsi-kebijakan`, kosong "menunggu"; berkop, bertanda draf sampai `final`; sel ekspor berawal `=`, `+`, `-`, `@` diberi awalan `'`.
Bukti: `node --test tests/siklus/layar_pulih.test.mjs` (UJ-F4-13). Pemeriksa: security-reviewer, selera-angka.

#### SK-078 `antre.js` formulir luring
Pengerja: siklus. Bergantung: SK-026, SK-071. Uji: diperluas `layar_pulih.test.mjs`.
Berkas: `public/siklus/antre.js`. Di luar: `public/pipa/antre.js` (ditiru, tidak diubah).
Langkah: IndexedDB, `klien_id` idempoten, kirim ulang bila daring; bagian untuk BP wilayahnya.
Bukti: `node --test tests/siklus/layar_pulih.test.mjs` (kirim dua kali, satu baris). Pemeriksa: inp-reviewer.

#### SK-079 Dummy G3
Pengerja: warga-api. Bergantung: SK-030, SK-072. Uji: diperluas `siklus_dummy.test.mjs`.
Berkas: `src/siklus_dummy.js`, `src/hak.js`, `tests/warga/siklus_dummy.test.mjs`.
Langkah: Jitupasna 5 status, R3P 6, kegiatan 4, `sk_harga` dummy; hitung memakai `siklus_hitung.js` yang sama dengan produksi; rantai F1 sampai F4 saling tertaut.
Bukti: `node --test tests/warga/siklus_dummy.test.mjs`. Pemeriksa: guard-api.

#### SK-080 Uji alur ujung ke ujung G3
Pengerja: warga-api. Bergantung: SK-022, SK-072, SK-079. Uji: dibuat `tests/warga/siklus_alur.test.mjs`.
Berkas: `tests/warga/siklus_alur.test.mjs`. Di luar: kode produksi (temuan dilaporkan).
Langkah: satu uji ujung ke ujung (UJ-F4-11): ingest, kejadian, fase `tanggap`, Jitupasna, baris (idempoten), hitung, `final`, R3P, `setuju` PM, `ditetapkan_resmi`, kegiatan terhubung `pemulihan`; tiap langkah satu baris jejak.
Bukti: `node --test tests/warga/siklus_alur.test.mjs`. Pemeriksa: security-reviewer.

#### SK-081 Daftar layar pulih di gerbang kartu standar
Pengerja: penulis-gerbang. Bergantung: SK-076. Uji: tidak ada (memperluas `gerbang-kartu-std.test.mjs`).
Berkas: `tests/agen/gerbang-kartu-std.test.mjs`.
Langkah: daftarkan `public/siklus/pulih.js`.
Bukti: `node --test tests/agen/gerbang-kartu-std.test.mjs`. Pemeriksa: selera-angka.

#### SK-082 `cakupan.json` G3
Pengerja: warga-api. Bergantung: SK-067, SK-070, SK-079, SK-080. Uji: tidak ada.
Berkas: `tests/warga/cakupan.json`, `tests/warga/migrasi_beku.json`.
Langkah: daftarkan tabel G3, trigger, rute pulih dan R3P di `diuji`.
Bukti: `npm run uji:warga` hijau. Pemeriksa: penulis-gerbang.

#### SK-083 `tests/siklus/cakupan.json` G3
Pengerja: siklus. Bergantung: SK-069, SK-073. Uji: diperluas `tests/siklus/cakupan.json`.
Berkas: `tests/siklus/cakupan.json`, `scripts/siklus/sumber.json`. 
Langkah: daftarkan `bps.py` dan layar G3 ke `uji`-nya; sumber BPS ber-pemakai dan ber-jadwal.
Bukti: `npm run uji:siklus`; `python3 scripts/agents/peta_data.py periksa`. Pemeriksa: penulis-gerbang.

#### SK-084 Rilis G3 [induk]
Pengerja: induk. Bergantung: SK-065, SK-067 sampai SK-083.
Langkah: urutan DT 11; pemilik menerapkan migrasi G3; `cakupan.json` G3 sudah dikerjakan tiket G3 sendiri.
Bukti: `npm run uji:siklus && npm run uji:warga`. Pemeriksa: migrasi-idempoten, guard-api.

## 6. Gelombang G4: Renkon, Gladi, Masa Depan, Pintu

#### SK-085 Migrasi G4 `sk_renkon`, `sk_gladi`
Pengerja: warga-api. Bergantung: SK-015, SK-067. Uji: diperluas `siklus_skema.test.mjs`.
Berkas: `migrations/<n>_sk_renkon.sql` (n = nomor kosong berikutnya saat tiket), `tests/warga/migrasi_beku.json`, `tests/warga/siklus_skema.test.mjs`. Di luar: `meja_*`, `pengingat` CHECK.
Langkah: DT 3.4 persis (kolom `reviu_terakhir`; `sk_gladi.kejadian_id` ber-FK ke `sk_kejadian`); `kedaluwarsa` bukan nilai `status`.
Bukti: `node --test tests/warga/siklus_skema.test.mjs` (UJ-F5-01). Pemeriksa: migrasi-idempoten.

#### SK-086 `src/siklus_hitung.js` bagian F5
Pengerja: warga-api. Bergantung: SK-068. Uji: diperluas `siklus_hitung.test.mjs`.
Berkas: `src/siklus_hitung.js`, `tests/warga/siklus_hitung.test.mjs`.
Langkah: ALG F5.1 sampai F5.5: kebutuhan dasar, kesenjangan, kesegaran, skor, pemutaran ulang; padanan barang LogPal hanya beras dan air mineral.
Bukti: `node --test tests/warga/siklus_hitung.test.mjs` (UJ-F5-02 sampai 06). Pemeriksa: validasi-model.

#### SK-087 `hitung.js` F5 dan paritas
Pengerja: siklus. Bergantung: SK-069, SK-086. Uji: diperluas `hitung.test.mjs`, `fixtures/acuan.json`.
Berkas: `public/siklus/hitung.js`, `tests/siklus/hitung.test.mjs`, `tests/siklus/fixtures/acuan.json`. Langkah: cermin F5 dan kasus ALG. Bukti: `node --test tests/siklus/hitung.test.mjs tests/siklus/paritas.test.mjs`. Pemeriksa: validasi-model.

#### SK-088 Rute renkon dan ekspor stok
Pengerja: warga-api. Bergantung: SK-017, SK-018, SK-085, SK-086. Uji: dibuat `tests/warga/siklus_renkon.test.mjs`.
Berkas: `src/siklus_renkon.js`, `src/hak.js`, `src/logpal.js` (hanya ekspor baca), `tests/warga/siklus_renkon.test.mjs`. Di luar: stok kedua, mengubah LogPal.
Langkah: `renkon`, `renkon/:id` (kedaluwarsa dan sisa dihitung saat dibaca; kesenjangan dari stok LogPal dan personel `/petugas` dibaca, tidak disalin; "stok belum tercatat"), `status` (`ditetapkan` wajib `no_penetapan`, `tgl_sah`), `asumsi`; metadata meja renkon lewat `meja_id` teks.
Bukti: `node --test tests/warga/siklus_renkon.test.mjs` (UJ-F5-03, 04, 07). Pemeriksa: guard-api.

#### SK-089 Rute gladi dan pemutaran ulang
Pengerja: warga-api. Bergantung: SK-021, SK-088. Uji: diperluas `siklus_renkon.test.mjs`.
Berkas: `src/siklus_renkon.js`, `tests/warga/siklus_renkon.test.mjs`. Di luar: simulasi genangan.
Langkah: `gladi`, `status`, `catatan` (PD); skenario disusun server dari baris D1 kejadian terpromosi (kejadian di arsip R2: 409 "promosikan dulu"); replay Maret 2025 hanya miliknya; gladi `selesai` wajib rekomendasi; pemutaran tanpa nama korban.
Bukti: `node --test tests/warga/siklus_renkon.test.mjs` (UJ-F5-06, 07). Pemeriksa: security-reviewer.

#### SK-090 Jenis pengingat renkon
Pengerja: warga-api. Bergantung: SK-088. Uji: tidak ada.
Berkas: `src/pengingat.js` dan migrasi bangun ulang CHECK `pengingat` hanya bila sesi induk menyetujui (PRD F5-06 menunda). Di luar: tabel lain.
Langkah: bila disetujui, jenis `renkon_segera_habis`; bila tidak, tiket ditutup tanpa perubahan dan kedaluwarsa tampil dari kartu pintu saja.
Bukti: `npm run uji:warga`. Pemeriksa: migrasi-idempoten.

#### SK-091 Layar renkon
Pengerja: siklus. Bergantung: SK-087, SK-088. Uji: dibuat `tests/siklus/layar_renkon.test.mjs`.
Berkas: `public/siklus/renkon.js`. Langkah: daftar dan detail (DS 3.8): lima aspek asumsi dengan usulan sistem yang diterima atau ditolak staf, kebutuhan dasar, kesenjangan, kesegaran. Bukti: `node --test tests/siklus/layar_renkon.test.mjs` (UJ-F5-08). Pemeriksa: selera-angka, inp-reviewer.

#### SK-092 Layar gladi
Pengerja: siklus. Bergantung: SK-089, SK-091. Uji: diperluas `layar_renkon.test.mjs`.
Berkas: `public/siklus/gladi.js`. Langkah: Gladi Ruang dan Lapang, replay arsip dengan pil "Model sederhana, bukan prakiraan", matriks masalah, rekomendasi tertaut renkon, skor "n dari 4 komponen". Bukti: `node --test tests/siklus/layar_renkon.test.mjs`. Pemeriksa: selera-angka.

#### SK-093 Adapter panen G4: CHIRPS, PSMSL, AR6
Pengerja: siklus. Bergantung: SK-002, SK-005. Uji: `uji` di `adapter_g4.py`.
Berkas: `scripts/siklus/adapter_g4.py`. Di luar: salinan NEX-GDDP atau Overture (dibaca di tempat, KA 29), CMEMS.
Langkah: adapter lewat `panen.py` untuk CHIRPS v3 (pembanding bias), PSMSL (stasiun muka laut), AR6 Zenodo; lisensi dan atribusi dari `sumber.json`; gagal = `menunggu`.
Bukti: `python3 -I scripts/siklus/adapter_g4.py uji` (server tiruan). Pemeriksa: security-reviewer.

#### SK-094 `iklim_lab.py`
Pengerja: siklus. Bergantung: SK-003, SK-006, SK-093. Uji: `uji` di `iklim_lab.py`.
Berkas: `scripts/siklus/iklim_lab.py`. Di luar: salinan NEX-GDDP ke R2.
Langkah: DuckDB (hanya di job lab) membaca NEX-GDDP-CMIP6 di tempat; hanya tiga indeks: Rx1day, Rx5day, CDD; dasar 1995-2014 model sendiri; median dan rentang p17 sampai p83; CHIRPS v3 pembanding bias; AR6 dan PSMSL muka laut; sebelum bbox teruji "menunggu"; semua `hipotesis`.
Bukti: `python3 -I scripts/siklus/iklim_lab.py uji` (tanpa DuckDB, fixture kecil; UJ-F6-01, 02, 04). Pemeriksa: validasi-model.

#### SK-095 `ghsl_lab.py` dan saji masa depan
Pengerja: siklus. Bergantung: SK-036, SK-040, SK-094. Uji: `uji` di `ghsl_lab.py`.
Berkas: `scripts/siklus/ghsl_lab.py`, `scripts/siklus/saji.py` (bagian masa depan), `scripts/siklus/dummy_saji.py` (bagian masa depan: `_dummy/masadepan/*`). Di luar: berkas 514 per kabupaten di `public/`.
Langkah: GHSL BUILT-S epoch 2015, 2020, 2025 model, 2030 model; CAGR dan indeks konsentrasi per zona F2; PIPPIB dan konsesi (ha); `masa_depan/<prov>.json` dan `tumbuh_<prov>.json` per provinsi di R2; label `yakin` kemitraan terpeta ke enam nilai.
Bukti: `python3 -I scripts/siklus/ghsl_lab.py uji`; `python3 -I scripts/siklus/saji.py uji` (UJ-F6-03, 05). Pemeriksa: validasi-model.

#### SK-096 Rute masa depan
Pengerja: warga-api. Bergantung: SK-017, SK-018, SK-095. Uji: diperluas `siklus_peran.test.mjs`.
Berkas: `src/siklus.js` (atau `src/siklus_masadepan.js`), `tests/warga/siklus_peran.test.mjs`. Langkah: `GET masadepan?prov=` mengalirkan R2 (404 "menunggu"); BP wilayahnya (`lingkupKab4`); `contoh=1` hanya SA dari `_dummy/`; WG hanya `masa_depan_ringkas.json`. Bukti: `node --test tests/warga/siklus_peran.test.mjs`. Pemeriksa: guard-api.

#### SK-097 Layar masa depan dan `masa_depan_ringkas.json`
Pengerja: siklus. Bergantung: SK-026, SK-096. Uji: dibuat `tests/siklus/layar_masadepan.test.mjs`.
Berkas: `public/siklus/masadepan.js`, `public/siklus/data/masa_depan_ringkas.json`. Langkah: dua horizon, skenario, selisih dasar, rentang antarmodel, pil `hipotesis` di tiap angka, kalimat "bukan ramalan kejadian"; ringkasan publik dibangkitkan `saji.py --public` dan di-commit manual setelah lab. Bukti: `node --test tests/siklus/layar_masadepan.test.mjs` (UJ-F6-06). Pemeriksa: selera-angka, validasi-model.

#### SK-098 Rute pintu dan registri
Pengerja: warga-api. Bergantung: SK-020, SK-053, SK-071, SK-088. Uji: dibuat `tests/warga/siklus_pintu.test.mjs`.
Berkas: `src/siklus.js`, `src/hak.js`, `tests/warga/siklus_pintu.test.mjs`. Langkah: `GET pintu` (peran dan fase dari ALG F7.1, urutan F7.2, indeks parsial LIMIT 50, tamu kartu publik), `GET registri` (PD, KO, PM, SA); kartu ke layar yang belum hidup tidak tampil. Bukti: `node --test tests/warga/siklus_pintu.test.mjs tests/warga/siklus_rencana_kueri.test.mjs` (yang kedua diperluas dengan kueri pintu) (UJ-F7-01 sampai 03). Pemeriksa: guard-api.

#### SK-099 Alat MCP ringkasan resmi
Pengerja: warga-api. Bergantung: SK-020, SK-098. Uji: diperluas `siklus_pintu.test.mjs`.
Berkas: `src/mcp.js` (hanya tambah alat), `tests/warga/siklus_pintu.test.mjs`. Di luar: `src/ai.js` kecuali aturan label.
Langkah: alat publik dari ringkasan resmi F1; tidak membuka paparan; jawaban asisten menyebut label alat.
Bukti: `node --test tests/warga/siklus_pintu.test.mjs` (UJ-F7-04). Pemeriksa: security-reviewer.

#### SK-100 Layar pintu `/siklus` dan registri
Pengerja: siklus. Bergantung: SK-026, SK-098. Uji: dibuat `tests/siklus/layar_pintu.test.mjs`.
Berkas: `public/siklus/pintu.js`, `public/siklus/registri.js`. Langkah: empat fase dan peran (DS 3.1), kartu menurut urutan prioritas, peringatan PDNA; layar registri sumber; tanpa tautan menu (U2 bawaan). Bukti: `node --test tests/siklus/layar_pintu.test.mjs tests/siklus/gerbang_publik.test.mjs` (UJ-F7-05). Pemeriksa: selera-angka, inp-reviewer.

#### SK-101 Pembuka profil wilayah dari pintu (PRD F7-04)
Pengerja: siklus. Bergantung: SK-100. Uji: diperluas `layar_pintu.test.mjs`.
Berkas: `public/siklus/pintu.js`. Di luar: `public/inti/profil_wilayah.js` (milik inti-layar, hanya dipakai).
Langkah: kartu wilayah di pintu membuka `ProfilWilayah.buka(kode4)` dari kepala situs bersama; tanpa kartu bila `profil_wilayah.js` tidak termuat.
Bukti: `node --test tests/siklus/layar_pintu.test.mjs` (UJ-F7-05). Pemeriksa: inp-reviewer.

#### SK-102 Kartu Siklus di pintu BNPB dan menu
Pengerja: ruang-bnpb. Bergantung: SK-100. Uji: tidak ada (uji layar milik pemilik berkas).
Berkas: `public/bnpb/pintu.js`; `public/inti/kepala.js` HANYA setelah U2 dijawab. Di luar: berkas Siklus.
Langkah: satu kartu Siklus di pintu BNPB; menu tidak diubah sebelum U2. Bukti: `node --test tests/agen/gerbang-kartu-std.test.mjs` dan uji layar pemilik berkas. Pemeriksa: selera-angka.

#### SK-103 Job `bulanan` iklim dan `lab`
Pengerja: mekanik-mesin. Bergantung: SK-047, SK-093 sampai SK-095. Uji: tidak ada.
Berkas: `.github/workflows/siklus.yml`.
Langkah: `bulanan` tambah CHIRPS dan PSMSL (`adapter_g4.py`); `lab` dispatch 350 menit (satu-satunya tempat `pip install duckdb`; agregat saja ke R2), grup `siklus-batch`. Job `mingguan` sudah dibuat di G1.
Bukti: `npm run uji:agen`; `python3 scripts/agents/peta_data.py periksa`. Pemeriksa: higiene-repo.

#### SK-104 Dummy G4
Pengerja: warga-api. Bergantung: SK-040, SK-079, SK-089, SK-096. Uji: diperluas `siklus_dummy.test.mjs`.
Berkas: `src/siklus_dummy.js`, `src/hak.js`, `tests/warga/siklus_dummy.test.mjs`. Langkah: renkon 6 status plus satu kedaluwarsa, gladi 5 status x 3 jenis, halaman renkon mengisi renkon dan gladi; pintu mengisi semua; halaman `masadepan` memakai mode contoh `_dummy/masadepan/`. Bukti: `node --test tests/warga/siklus_dummy.test.mjs` (ember terisi, hapus mengosongkan). Pemeriksa: guard-api.

#### SK-105 Uji peran lengkap
Pengerja: warga-api. Bergantung: SK-089, SK-096, SK-098. Uji: diperluas `siklus_peran.test.mjs`.
Berkas: `tests/warga/siklus_peran.test.mjs`. Di luar: kode produksi (temuan dilaporkan).
Langkah: lengkapi semua baris matriks KP 1 untuk renkon, gladi, masa depan, pintu, registri, dummy, di dua awalan.
Bukti: `node --test tests/warga/siklus_peran.test.mjs` (UJ-KP-01 sampai 14, UJ-F5-07). Pemeriksa: security-reviewer.

#### SK-106 Daftar layar G4 di gerbang kartu standar
Pengerja: penulis-gerbang. Bergantung: SK-092, SK-097, SK-100. Uji: tidak ada (memperluas `gerbang-kartu-std.test.mjs`).
Berkas: `tests/agen/gerbang-kartu-std.test.mjs`.
Langkah: daftarkan `renkon.js`, `gladi.js`, `masadepan.js`, `pintu.js`.
Bukti: `node --test tests/agen/gerbang-kartu-std.test.mjs`. Pemeriksa: selera-angka.

#### SK-107 `cakupan.json` G4
Pengerja: warga-api. Bergantung: SK-085, SK-090, SK-104, SK-105. Uji: tidak ada.
Berkas: `tests/warga/cakupan.json`, `tests/warga/migrasi_beku.json`.
Langkah: daftarkan tabel G4, trigger, rute renkon, gladi, masa depan, pintu, dummy di `diuji`.
Bukti: `npm run uji:warga`. Pemeriksa: penulis-gerbang.

#### SK-108 `tests/siklus/cakupan.json` G4
Pengerja: siklus. Bergantung: SK-093 sampai SK-095, SK-100. Uji: diperluas `tests/siklus/cakupan.json`.
Berkas: `tests/siklus/cakupan.json`, `scripts/siklus/sumber.json`. 
Langkah: daftarkan skrip dan layar G4 ke `uji`-nya; sumber G4 ber-pemakai dan ber-jadwal.
Bukti: `npm run uji:siklus`; `python3 scripts/agents/peta_data.py periksa`. Pemeriksa: penulis-gerbang.

#### SK-109 Jawaban pertanyaan G4 [pemilik]
Pengerja: pemilik. Bergantung: tidak ada (tidak memblokir).
Langkah: jawab U1, U2, U9, U19, U20 dan U18 bila belum; setiap jawaban yang membalik bawaan dicatat di KA. Bukti: catatan sesi. Pemeriksa: sesi induk.

#### SK-110 Rilis G4 [induk]
Pengerja: induk. Bergantung: SK-084 sampai SK-089, SK-091 sampai SK-108.
Langkah: urutan DT 11 untuk migrasi G4; semua job `siklus.yml` aktif; laporkan ukuran `siklus/`, jumlah berkas `public/siklus`, dan aset total. Bukti: `npm run uji:siklus && npm run uji:warga && npm run uji:agen`. Pemeriksa: higiene-repo, migrasi-idempoten.

#### SK-111 Penutupan program [induk]
Pengerja: induk. Bergantung: SK-110.
Langkah: `ilmu.mjs kasus siklus` untuk pelajaran program; perbarui `.claude/ilmu-agent/siklus.md`; sapu status tiket; laporkan ke pemilik daftar U yang masih terbuka dan semua angka `asumsi-kebijakan` yang masih dipakai. Bukti: `npm run uji:agen`. Pemeriksa: higiene-repo.

## 7. Jalur kritis dan paralel

1. Bebas satu sama lain: SK-001 sampai SK-004; panen dan gudang menyusul registri.
2. F1: jalur data (bersih, adapter G1) lalu pasang lalu arsip; jalur Worker migrasi, cangkang, rute baca, rute tulis dan ingest; bertemu di pasang. F2 data tidak menunggu F1.
3. G2 menunggu rilis G1; migrasi, hitung, ekspor G3 boleh jalan sejak G1 selesai; iklim lab paralel dengan G3.
4. Penulis tidak menyunting berkas yang sama bersamaan (`src/siklus.js`, `src/siklus_dummy.js`, `src/siklus_hitung.js`, `src/hak.js`, `tests/warga/siklus_*.test.mjs`, `siklus.yml`, `public/siklus/pulih.js`): bergiliran menurut nomor, yang sudah berurutan topologis.
