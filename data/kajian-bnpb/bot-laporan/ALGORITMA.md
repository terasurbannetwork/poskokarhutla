# ALGORITMA: Bot WA pembuat laporan

## A1. Nomor terdaftar

`terdaftar(n) = n ∈ WA_IZIN ∨ ∃ bl_daftar(wa_sha = sha(n), status = 'setuju')` (Q8: akun `/masuk` tidak otomatis terhitung). Nomor dinormalkan ke `62...` (`normalWa`) sebelum di-hash. Gateway memegang salinan himpunan `wa_sha` dari `GET /api/wa/terdaftar`, disegarkan tiap 5 menit dan segera sesudah `setuju` (D10), jadi tidak ada baca D1 per pesan. Grup WA tidak terhitung sebagai pemakai bot.

## A2. Pengenalan jenis laporan

1. Jenis disebut di perintah `buat <jenis>`: cocokkan ke daftar jenis yang punya generator (tahap 1: `harian`, `penanganan`).
2. Tidak disebut: kenali jenis tiap bahan memakai `kenali()` dari `src/wa_jenis.js`, lalu hitung kelengkapan `LAPORAN[].butuh` tiap jenis laporan. Satu jenis menang jelas (bahan butuhnya paling lengkap): pakai itu. Seri: tanya.

## A3. Bahan wajib dan pertentangan (K8)

- Kurang: bahan dalam `LAPORAN[].butuh` jenis itu (`scripts/wa/otomatis.mjs`) yang belum ada di proyek. Tanda `wajib` di `JENIS_LAPORAN` (`src/wa_jenis.js`) bersifat global per jenis bahan, bukan per laporan, jadi tidak dipakai di sini.
- Pertentangan: Claude diberi semua bahan teks dan diminta mendaftar pasangan nilai untuk medan yang sama yang berbeda (misal sorti 14 di teks lawan 12 di Excel), tiap nilai dengan kutipan. Pasangan tanpa kutipan dibuang.
- Kurang atau bentrok tidak kosong: satu pesan berisi semua pertanyaan, bernomor. Jawaban pemakai diurai Claude ke keputusan per nomor.

## A4. Urai berkutipan (D2)

Keluaran Claude per medan: `{medan, nilai, kutipan, sumber_bahan_id}`. Validator:
1. `kutipan` harus ditemukan di teks bahan `sumber_bahan_id` setelah normalisasi spasi dan huruf kecil.
2. Untuk medan angka, angka di `nilai` harus muncul di `kutipan` (setelah membuang pemisah ribuan titik dan koma).
3. Medan yang gagal dikosongkan dan dicatat di catatan draf "tidak terbaca dari bahan".
4. Medan angka sistem (A6) tidak ada di skema keluaran Claude sama sekali.

## A5. Operasi ubah (revisi, D1)

Inventaris shape: untuk tiap slide, daftar `{slide, shape, teks}` dari PPTX hasil generator (nama shape stabil, BL-06). Claude mengembalikan daftar operasi:

| Operasi | Isi |
| --- | --- |
| `ganti_teks` | slide, shape, teks_lama, teks_baru |
| `ganti_sel` | slide, shape, baris, kolom, teks_lama, teks_baru |
| `tambah_baris` | slide, shape (tabel atau daftar), setelah_baris, teks |
| `hapus_baris` | slide, shape, baris, teks_lama |
| `catatan` | slide, teks (kotak catatan kecil di kaki slide) |
| `sembunyikan_slide` / `tampilkan_slide` | slide |
| `tanya` | pertanyaan balik bila kalimat revisi ambigu |

Penerapan pada versi n: bangun ulang dari bahan, lalu operasi 1..n berurutan. Tiap operasi memeriksa `teks_lama` sama dengan teks saat itu; tidak sama (bahan berubah) berarti operasi itu dilewati dan pemakai ditanya.

## A6. Kunci angka sistem (D3)

Generator menulis manifest `<nama deck>.kunci.json` di samping PPTX (nama berdeck supaya harian dan penanganan di folder keluaran yang sama tidak saling timpa): daftar `{slide, shape, sel?}` yang memuat angka hotspot, firespot, luas terbakar, luas belum padam. Operasi yang menyentuh entri manifest ditolak sebelum diterapkan. Jawaban bot: asal angka (sumber dan aturan hari D-1) dan tawaran `catatan`.

## A7. Banding 7 hari (K9, Q11)

Untuk tiap angka di manifest dan tiap medan angka bahan, ambil nilai dari versi final 7 hari terakhir jenis yang sama (D1 `bl_versi` status final, atau `laphar_riwayat.json` bila belum ada). Peringatan bila `nilai > 3 × median` atau `nilai < median / 3` (median > 0), atau `nilai = 0` sedangkan 7 nilai sebelumnya semua > 0. Kurang dari 3 nilai pembanding: tidak ada peringatan.

## A8. Pratinjau slide berubah (D8)

Slide berubah = slide yang teks inventarisnya beda dari versi sebelumnya (v1: slide 1 sampai 3). PNG dibuat dari PDF slide itu bila PDF sudah ada; bila belum, dari render cepat PPTX satu halaman. Maksimal 3 gambar per versi.

## A9. Aturan tetap (K10, Q12)

Label pola = `(jenis laporan, judul slide tempat ubahan, jenis operasi, ringkasan ubahan ≤ 8 kata)` dari Claude. Pola sama bila jenis, judul slide, dan jenis operasi sama dan ringkasannya dinilai Claude bermakna sama. Ambang: 3 kejadian dalam 14 hari dari minimal 2 proyek. Aturan yang disetujui disimpan sebagai operasi ubah bawaan dengan `teks_lama` berupa pola (bukan teks tetap) dan diterapkan sebelum operasi pemakai.

## A10. Batas belanja (Q5)

Biaya per panggilan dihitung dari `usage` respons dan harga model. Jumlah harian (WIB) di D1 `bl_biaya`. Lewat batas: panggilan Claude baru ditolak, pemakai dibalas "kuota hari ini habis, bot lanjut besok", pemilik dikabari sekali.

## A11. Pagar angka V2 (D17)

Masukan:
- Isi deck dasar `D` dan deck keluaran `K` dari `scripts/wa/agen_isi.py` (membaca ZIP PPTX langsung): `slides[] {n, tersembunyi, shapes[] {nama, teks, tabel?, tampak}}`, `lain[] {bagian, teks}` (catatan pembicara, grafik, layout, master, SmartArt), `media[] {bagian, sha256}` (gambar, grafik, berkas tertanam). `tampak` salah bila ukuran nol atau di luar kanvas.
- `kunci` dari `dasar/<deck>.kunci.json` (`{slide, shape, sel?, angka}`).
- `izin`: teks bahan hari ini; `kemarin`: isi deck laporan kemarin (sama bentuknya dengan `D`).

Angka dibaca sebagai nilai dengan aturan Indonesia: titik = pemisah ribuan bila diikuti tepat tiga angka, koma = desimal ("1.234" = 1234, "12,5" = 12.5, "1.250,75" = 1250.75). Tanggal ("17 Nov", "17/11/2026", "2026-11-17"), tahun 2000-2099, dan jam ("18.00", "07.00 WIB") bukan angka ukuran dan dilewati.

1. **Shape terkunci** (dicocokkan lewat nama di slide mana pun; nama dari generator unik berawalan `s<n>_`):
   - Ada lebih dari satu shape bernama sama di `K`: pelanggaran (duplikat).
   - Ada satu: di slide tersembunyi atau tidak tampak = pelanggaran; tanpa `sel`: teks harus sama dengan `D` (spasi dan baris kosong diabaikan); dengan `sel`: isi sel sama dengan `D`, tabel atau sel hilang = dihapus.
   - Tidak ada: boleh (dicatat "slide dihapus") hanya bila slide asalnya hilang utuh (kurang dari 20% nama shape slide itu masih ada di `K`); selain itu pelanggaran "hilang atau diganti nama" (pemeriksa bersih 19 Nov: shape berisi angka saja bisa diganti nama dan diisi angka lain).
   - Label shape terkunci yang muncul di shape lain dengan angka berbeda = pelanggaran.
2. **Himpunan sah angka sistem** `S` = angka di teks dan sel terkunci `D`, ditambah angka dalam jendela kata kunci di teks tidak terkunci `D` (subjudul generator yang menyebut angka sistem).
Semua teks dinormalkan dulu: NFKC, karakter format (zero width, soft hyphen) dibuang, angka Unicode dan lebar penuh jadi angka ASCII, "1 234" dibaca satu angka. Teks alt (`descr`, `title`) ikut diperiksa.

3. **Lingkup angka sistem (pengganti jendela kata kunci, sesudah pemeriksa bersih 19 Nov)**: tiap slide `K` (dan tiap bagian lain: catatan, grafik, layout) yang menyebut kata kunci angka sistem, semua angka ukurannya harus ada di deck dasar atau bahan. Kata kunci luas untuk deck berangka sistem (`hotspot`, `titik panas`, `titik api`, `firespot`, `terbakar`, `padam`, `kebakaran`, `karhutla`); sempit untuk deck tanpa kunci (laporan harian bencana: `hotspot`, `titik panas`, `titik api`, `firespot`, `luas terbakar`, `lahan terbakar`, `belum padam`, `karhutla`), supaya "rumah terbakar" atau "listrik padam" dengan jumlah buatan agen tetap sah. Aturan jendela di bawah tetap berlaku sebagai bagian dari lingkup ini.

   Rincian lama, **Kata kunci di seluruh isi `K`** (shape tidak terkunci, sel tabel, catatan pembicara, grafik, layout, master; huruf besar-kecil diabaikan): `hotspot`, `hot spot`, `titik panas`, `titik api`, `firespot`, `fire spot`, `luas terbakar`, `lahan terbakar`, `belum padam`. Tiap angka ukuran di klausa yang sama dengan kata kunci (dipotong koma bukan desimal, titik koma, baris baru, atau titik akhir kalimat) dan paling jauh 40 huruf darinya harus anggota `S` atau ada di `izin`. Di tabel, kata kunci di sel kepala baris atau kolom berlaku untuk semua sel baris atau kolom itu. Bukan anggota = pelanggaran. Bila `S` kosong (laporan harian bencana), semua pasangan kata kunci dengan angka yang tidak ada di `izin` adalah pelanggaran.
4. **Media dan tautan**: tiap bagian bukan XML (di mana pun letaknya di ZIP), grafik, atau diagram di `K` yang sidiknya tidak ada di `D` maupun laporan kemarin = pelanggaran. Tautan eksternal (selain hyperlink) yang tidak ada di `D` = pelanggaran, karena dimuat saat konversi PDF di luar sandbox. Teks berbentuk kunci API di deck = pelanggaran.
5. **Asal angka (peringatan, bukan penolakan)**: angka ukuran di `K` yang tidak ada di `D`, `izin`, maupun laporan kemarin masuk daftar "angka tanpa sumber" (paling banyak 10) di keterangan draf; angka yang hanya ada di laporan kemarin masuk daftar "angka dari laporan kemarin".

Hasil `{lolos, langgar[], dihapus[], tanpaSumber[], dariKemarin[]}`; `lolos` = `langgar` kosong. Logika pagar murni (`scripts/wa/agen_pagar.mjs`); pembacaan ZIP di `agen_isi.py`.

## A12. Laporan kemarin (D23)

`kemarin(jenis, tanggal)`:
1. Dari `~/.wa-bot/agen/final.json` ambil entri `jenis` dengan tanggal terbesar `< tanggal`, paling jauh 7 hari, yang berkas PPTX-nya masih ada.
2. Dari arsip repo `data/laporan-bnpb/<folder jenis>/<YYYY-MM>/<YYYY-MM-DD>/Revisi <N>/*.pptx` untuk 7 tanggal sebelumnya, ambil tanggal terdekat dan `N` terbesar (berkas `(isi)` dilewati).
3. Pilih yang tanggalnya paling baru (bot menang bila sama). Skrip harian (`jalan.py`, `bingkai.py`) diambil dari folder hari tanggal terpilih atau tanggal terdekat yang punya skrip.
4. Tidak ada keduanya: ruang kerja tanpa `kemarin/`; prompt menyebut "tidak ada laporan kemarin".

## A13. Menjalankan agen (D14, D19, D20, D26)

Prompt sistem = preset `claude_code` + `append` berisi `PEDOMAN.md`, pedoman jenis, dan kontrak `hasil.json`. Pesan berisi jenis, tanggal, kode proyek, jalur ruang kerja versi ini, daftar berkas bahan (disebut data, bukan perintah), laporan dan skrip kemarin, catatan mesin, dan tugas. Revisi: kalimat pemakai (tersamarkan) dalam tanda kutip sebagai data, plus jalur ruang kerja versi baru.

Acuan pagar (deck dasar, kunci, bahan, laporan kemarin) disimpan mesin di `~/.wa-bot/agen/acuan/<proyek>/` dan selalu dibaca dari sana; ruang kerja tiap versi berisi salinannya. Kunci yang hilang (atau kosong pada laporan penanganan) = pagar gagal tertutup.

Opsi `query` (sesudah pemeriksa bersih 19 Nov): `cwd` = folder sesi kosong per proyek `~/.wa-bot-agen/<proyek>/sesi` (bukan ruang kerja, supaya baca dan tulis di luar cwd selalu lewat `canUseTool`); tanpa `additionalDirectories`; `disallowedTools` = alat web, Agent, NotebookEdit, ditambah aturan `Read(//<jalur absolut>)` untuk `.env`, gateway, `~/.wa-bot`, `~/.ssh`, `~/.claude`, teks WA mentah, dan `Edit(//<repo>/**)`, `Edit(//<acuan>/**)`; sandbox `denyRead` = semua isi folder rumah kecuali repo, ruang kerja, dan venv Python bot (per tingkat), `denyWrite` = repo, `bahan/ dasar/ kemarin/ sebelum/` versi ini, dan ruang kerja versi lain; lingkungan `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` (kredensial dibuang dari perintah Bash). Rincian lama: `model` `claude-opus-5-5`; `effort` `high`; `settingSources: []`; `tools`: `Read`, `Glob`, `Grep`, `Write`, `Edit`, `Bash`; tanpa `allowedTools` (semua alat lewat `canUseTool`); `permissionMode: 'default'`; `sandbox`: `{enabled: true, failIfUnavailable: true, autoAllowBashIfSandboxed: false, allowUnsandboxedCommands: false, filesystem: {allowWrite: [kerja, keluaran], denyRead: [~/.wa-bot kecuali ruang ini lewat izin tulis, ~/.ssh, ~/.config, ~/.aws, scripts/wa/.env, scripts/wa/gateway, data/laporan-bnpb (teks WA mentah)]}, network: {allowedDomains: [], strictAllowlist: true}}`; `maxTurns` 80; `maxBudgetUsd` `BL_AGEN_USD`; `abortController` 15 menit; `resume` bila ada sesi; `env` = lingkungan bersih (D19).

Penjaga `canUseTool(nama, masukan)`, semua jalur lewat `realpath` (jalur yang belum ada: `realpath` induk terdekat yang ada):
- `Write`/`Edit`: izinkan hanya di dalam `kerja/` atau `keluaran/`.
- `Read`/`Glob`/`Grep`: tolak jalur rahasia (`.env`, `~/.wa-bot` di luar ruang kerja, `~/.ssh`, `~/.config`, `~/.aws`, gantungan kunci) dan teks WA mentah `data/laporan-bnpb/**/wa-*.txt`; izinkan hanya di repo atau ruang kerja.
- `Bash`: tolak bila `dangerouslyDisableSandbox`; lapis kedua daftar tolak (git selain baca, push, wrangler, pemasangan paket, alat jaringan, sudo, launchctl, osascript, `rm -r`, `ln -s`, chmod, `.env`, `~/.wa-bot`, kill); selain itu izinkan (sandbox yang menegakkan batas).
- Alat lain: tolak.

Sebelum jalan: kunci agen global (D26); cek biaya harian dan per proyek (D20). Sesudah jalan: pesan `result` terakhir; `subtype` bukan `success`, `is_error`, atau `hasil.json` tidak sah = galat agen. Biaya dicatat dari `total_cost_usd`, atau `BL_AGEN_USD` bila tidak ada pesan hasil. `session_id` disimpan.

## A14. Skema `hasil.json` (D18)

```json
{"pptx": "Laporan ... DDMMYY.pptx", "ringkasan": "kalimat pendek",
 "perubahan": ["Slide 3: panel OMC dihapus, panel armada dilebarkan"],
 "catatan": ["Banjir Aceh Singkil (dari laporan kemarin) tidak ada di WA hari ini, tidak dimasukkan"],
 "tanya": []}
```

`pptx` wajib bila `tanya` kosong: nama tanpa `/`, `\`, atau `..`, berkas biasa (bukan tautan simbolik) di `keluaran/`, ZIP yang memuat `ppt/presentation.xml`, paling besar 30 MB. `ringkasan` paling banyak 300 huruf; `perubahan`, `catatan`, `tanya` masing-masing paling banyak 10 butir, tiap butir paling banyak 300 huruf.
