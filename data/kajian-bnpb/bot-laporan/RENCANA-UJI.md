# RENCANA-UJI: Bot WA pembuat laporan

Semua dunia luar (Claude API, gateway, Drive, Worker, generator) disuntik lewat `dep` seperti pola `tests/wa/otomatis.test.mjs`. Tidak ada uji yang memanggil Claude API sungguhan kecuali uji balik BL-17 yang dijalankan manual dengan izin pemilik (berbayar).

## Kriteria terima

| ID | Kriteria | Perintah bukti |
| --- | --- | --- |
| T1 | Nomor tak terdaftar dibalas T-DAFTAR, bahannya tidak disimpan, Claude tidak dipanggil | `node --test tests/wa/proyek.test.mjs` |
| T2 | `buat` dengan bahan wajib kurang menghasilkan T-TANYA, status `bertanya`, generator tidak jalan | idem |
| T3 | `buat saja` membangun dengan catatan kekurangan | idem |
| T4 | Validator kutipan menolak angka yang tidak ada di bahan dan mengosongkan medannya | `node --test tests/wa/claude.test.mjs` |
| T5 | Skema keluaran urai tidak memuat medan angka sistem; keluaran palsu yang menyisipkannya ditolak | idem |
| T6 | Operasi ubah ke shape di `kunci.json` ditolak dan menghasilkan T-TOLAK-KUNCI | `node --test tests/wa/proyek.test.mjs` |
| T7 | Versi n = generator + operasi 1..n; operasi dengan `teks_lama` tidak cocok dilewati dan ditanyakan | `python -m pytest data/laporan-bnpb/generator/tests/test_ubah.py` |
| T8 | `balik v2` membuat versi baru, versi lama tidak berubah; rute menolak menimpa versi | `node --test tests/warga/wa_proyek.test.mjs` |
| T9 | Transisi status di luar ALUR ditolak rute (misal `ditutup` ke `draf`) | idem |
| T10 | `final` mengunggah ke Drive dan `/api/wa/hasil`; Drive gagal = status tetap `final`, diulang, pemilik dikabari sekali | `node --test tests/wa/proyek.test.mjs` |
| T11 | Banding 7 hari memberi peringatan pada contoh 5 kali median dan tidak pada kurang dari 3 pembanding | idem |
| T12 | Pola revisi ke-3 dalam 14 hari dari 2 proyek memicu T-ATURAN ke pemilik, bukan ke pemakai | idem |
| T13 | Batas belanja: panggilan ditolak sesudah lewat batas, pemilik dikabari sekali | `node --test tests/wa/claude.test.mjs` |
| T14 | Penyamaran: nomor HP, NIK, email di bahan tidak sampai ke `dep.claude` | idem |
| T15 | Satu proyek tidak pernah dibangun dua proses bersamaan | `node --test tests/wa/proyek.test.mjs` |
| T16 | Jalur terjadwal tidak berubah: uji lama hijau | `node --test tests/wa/*.test.mjs` |
| T17 | Migrasi bersidik dan idempoten | `node --test tests/warga/migrasi_beku.test.mjs`, pemeriksa `migrasi-idempoten` |
| T18 | SQL hanya di `src/hak.js` | `npm run uji:agen` (gerbang-d1) |
| T19 | Gerbang deck 0,8 detik tetap di bawah 5 detik per draf | log waktu di `proyek.mjs`, dicek di uji tempo |
| T20 | Draf pertama sampai paling lama 120 detik pada 9 dari 10 percobaan (draf = 2 kiriman: pratinjau dan PDF, jeda limiter 15 sampai 20 detik sudah dihitung) | uji asap manual dengan nomor uji, dicatat di BL-18 |
| T21 | Gateway: nomor `bl_daftar` setuju diteruskan (Worker memeriksa ulang dengan satu baca kunci primer per pesan bertanda `wa_sha`, supaya pencabutan langsung berlaku); nomor asing dibalas T-DAFTAR sekali per hari, dengan batas global harian, dan tidak diteruskan | `node --test tests/wa/daftar.test.mjs` |
| T22 | `buat`, `status` tanpa tanggal, `bantuan` ke mesin proyek; `kirim ulang` dan `status <tanggal>` tetap ke `perintah.mjs`; uji `perintah.test.mjs` lama yang masih berlaku tetap hijau | `node --test tests/wa/*.test.mjs` |
| T23 | Pesan susulan (`lama:true`) tidak masuk proyek, tidak memanggil Claude, perintahnya tidak jalan; T-TERLEWAT terkirim tepat sekali per nomor; jalur terjadwal lama tetap menerima susulannya | `node --test tests/wa/proyek.test.mjs` |

## Uji balik kemiripan (K5, BL-17)

1. Pilih 20 hari sejak 1 Nov 2026 yang punya deck manual final (`Revisi N` tertinggi) dan bahan WA di D1.
2. Untuk tiap hari, bangun ulang laporan dari bahan WA hari itu lewat mesin proyek tanpa revisi.
3. Bandingkan per slide dengan deck manual: angka sistem (harus sama 100 persen), medan dari bahan (persen sama), dan teks (rasio kemiripan per shape).
4. Laporkan per hari dan rata-rata; tulis daftar beda terbesar sebagai bahan aturan tetap pertama.
5. Biaya Claude dicatat; uji ini dijalankan hanya sesudah pemilik menyetujui anggarannya.

## Pemeriksa

- Kode `scripts/wa/**`: pemeriksa bersih (bukan `wa-bot`), plus `security-reviewer` untuk penyamaran dan kunci API.
- Rute dan migrasi: `guard-api`, `security-reviewer`, `migrasi-idempoten`.
- Kartu `/pelaporan`: `selera-angka`, `inp-reviewer`.

## V2: kriteria terima

| ID | Kriteria | Perintah bukti |
| --- | --- | --- |
| T24 | Penjaga `Write`/`Edit`: di luar `kerja/` dan `keluaran/` ditolak, termasuk `../` dan tautan simbolik di `kerja/` yang menunjuk ke `~/.wa-bot`; di dalamnya diizinkan | `node --test tests/wa/agen.test.mjs` |
| T25 | Penjaga `Read`/`Glob`/`Grep` menolak `scripts/wa/.env`, `~/.wa-bot/drive.json`, `~/.ssh`, `data/laporan-bnpb/**/wa-*.txt`; mengizinkan repo dan ruang kerja. Tidak ada alat di `allowedTools` | idem |
| T26 | Penjaga Bash menolak `dangerouslyDisableSandbox`, `git push`, `git commit`, `wrangler`, `curl`, `npm install`, `sudo`, `rm -rf`, `ln -s`, `cat .env`; opsi `query` memuat sandbox aktif dengan `failIfUnavailable`, tanpa jaringan, tulis hanya ruang kerja | idem |
| T27 | `hasil.json` tidak ada, rusak, `pptx` di luar `keluaran/`, tautan simbolik, bukan ZIP, atau melewati batas panjang = galat agen | idem |
| T28 | Pagar: angka terkunci diubah = gagal; shape terkunci dihapus = lolos dan tercatat; diganti nama = gagal; dipindah ke slide lain dengan angka sama = lolos; slide tersembunyi = gagal; angka hotspot baru di teks bebas, tabel (kata kunci di kepala), catatan pembicara, atau grafik = gagal; media baru = gagal; laporan harian tanpa kunci dengan "hotspot 999" = gagal; tanggal dan jam di dekat kata kunci tidak dihitung | `node --test tests/wa/agen_pagar.test.mjs` |
| T29 | Asal angka: angka tanpa sumber dan angka dari laporan kemarin masuk keterangan draf, tidak menolak | idem |
| T30 | `BL_VERSI=2` dan nomor di `BL_V2_NOMOR`: `lanjut` menjalankan generator ke `dasar/`, lalu agen dengan pedoman dan laporan kemarin di prompt; versi disimpan dengan `isian.versi_bot = 2` dan dua kiriman draf. Nomor di luar `BL_V2_NOMOR` tetap V1 | `node --test tests/wa/agen.test.mjs` |
| T31 | Revisi proyek V2 melanjutkan sesi (`resume`); resume gagal = sesi baru dengan riwayat; revisi gagal mengembalikan `draf` dengan versi terakhir tetap; `balik v1` menyalin PPTX v1; proyek V1 tetap V1 walau saklar dinyalakan | idem |
| T32 | Pertanyaan agen: saat bangun status `bertanya`, saat revisi `draf`; pesan teks berikutnya (termasuk yang panjang) diteruskan ke sesi sebagai jawaban; pesan teruskan tetap bahan; `lanjut` melanjutkan tanpa jawaban | idem |
| T33 | Biaya: lewat batas harian atau proyek = agen tidak dijalankan; jalan terputus tanpa pesan hasil dicatat `BL_AGEN_USD`; dua permintaan agen bersamaan = satu dijalankan, satu antre | idem |
| T34 | Lingkungan agen tanpa `WA_MESIN`, `WA_GARAM`, `DRIVE_*`; pedoman tanpa nomor HP dan surel; prompt menyebut bahan sebagai data | idem |
| T35 | Laporan kemarin: final bot lebih baru menang atas arsip; arsip `Revisi` terbesar; berkas `(isi)` dilewati; lebih dari 7 hari = tidak ada | idem |
| T36 | Tanpa `BL_VERSI` semua uji V1 tetap hijau (D21) | `node --test tests/wa/proyek.test.mjs` |
