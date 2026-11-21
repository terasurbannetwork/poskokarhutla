# RISET: Kejadian dari Laporan Warga

Dibaca dari kode dan dokumen repo pada 21 Nov 2026. Rujukan berupa berkas dan baris; baris bisa bergeser,
cek ulang sebelum dipakai. Bagian praktik luar ditandai bila belum diperiksa sumbernya.

## 1. Yang sudah ada

### 1.1 Pengelompokan laporan: tiga mesin, satu tujuan

| Mesin | Satuan | Aturan | Letak |
| --- | --- | --- | --- |
| Gugus A9 (`GL-DDMMYY-NN`) | laporan terkirim berjenis sama | jarak radius 3 km (banjir, longsor, kebakaran gedung) atau 5 km (cuaca, karhutla), jendela 6 jam (karhutla 12 jam); jenis luas (gempa, erupsi, tsunami) satu kab dalam 12 jam; wajib 2 nomor pelapor berbeda; label `gugus` atau `gugus kuat` | `src/lapor_gugus.js:6-12` (tabel), `:19-45` (hitung), `lapor-ai/ALGORITMA.md:95-117` (A9), `KEPUTUSAN-LAPOR-AI.md:126-130` (D27-D30) |
| Kejadian K66 (`KJ-ddmmyy-NN`) | pelapor mengonfirmasi "kejadian yang sama" saat melapor | kecamatan sama, jendela jenis (jenis tanpa aturan 72 jam), paling banyak 3 kandidat | `src/lapor_gugus.js:46-57` (`kandidatKejadian`), `migrations/0160_lapor_kelompok.sql`, `KEPUTUSAN-LAPOR-AI.md:443` (K66), `:455` (D107) |
| Gabung meja (D119) | baris daftar meja | jenis sama, kab/kota sama, berantai selama jeda paling lama 72 jam; hanya tampilan | `KEPUTUSAN-LAPOR-AI.md:516` (D119), `:522-523` (Q62, Q63) |

Aturan satu desa sebagian sudah ada tersirat: pada fungsi `dekat` (`src/lapor_gugus.js:22-27`), dua laporan
berjenis sama yang kode desanya sama tersambung walau tanpa titik, tetapi hanya di dalam jendela jenis
(6 atau 12 jam). `ALGORITMA.md` A9 langkah 2 hanya menyebut kasus "perkiraan tingkat desa". Jadi dokumen dan kode
sedikit berbeda; paket ini merapikannya (lihat `ALGORITMA.md` A1).

### 1.2 Tampilan jumlah pelapor

- Alun-alun menghitung `nWarga` = `n_pelapor` gugus bila 2 atau lebih: `src/lapor_ai.js:937` dan `src/lapor_tampil.js:129-135` (`barisAlun`).
- Kartu publik menulis "N warga melapor kejadian ini": `public/lapor/lapor.js:1291`; daftar dan peta dari `GET /api/lapor/alun` (`public/lapor/lapor.js:1354`, rute `src/lapor_ai.js:1004`).
- Meja menampilkan gugus dan kepala gabungan (`scripts/lapor/lokal.mjs:537-573`, D107, D119); jumlah warga hanya bila semua nomor pelapor terlihat.
- Angka dampak tidak dijumlah, ditampilkan rentang atau tertinggi (D28, D85, D107).

### 1.3 Verifikasi BPBD

- K69 (halaman pengecekan), K74 (aksi verifikasi di kanan): `KEPUTUSAN-LAPOR-AI.md:466`, `:497`.
- Hasil: Valid, Sebagian benar, Tidak valid (`src/lapor_periksa.js:7`), catatan wajib minimal 5 huruf, riwayat append-only di tabel `lapor_periksa` (`migrations/0162_lapor_periksa.sql`: `id, nomor, hasil, catatan, perubahan, oleh, waktu`).
- Valid dan Sebagian benar tidak mengubah status tiket; Tidak valid memindah ke `tidak_valid` (D109, `:476`; `src/lapor_periksa.js:71`). Revisi hanya angka (`ISIAN_REVISI`, `:10`) dan menulis versi baru (D110).
- Status tiket D20: `baru, ditelaah, diteruskan, ditindaklanjuti, selesai, tidak_valid` (`:66`), plus penanda "dilihat" (Q39). Hak BPBD: D94 sampai D98 (`:396-400`).
- Kolom Status meja menampilkan hasil cek terakhir (D121, tiket LA-75).
- `lapor_periksa.oleh` adalah teks bebas ("BPBD <kab>", "staf:<id>", "admin:<awalan>", lihat `pelakuLabel` di `src/lapor_tampil.js`). Jenis akun pemeriksa tidak disimpan sebagai kolom; syarat D4 butir 2 perlu dasar yang bisa diperiksa (lihat `DESAIN-TEKNIS.md` bagian 4).

### 1.4 Halaman publik yang sudah ada

- `/lapor` publik (K14 `keputusan-masuk`), terdaftar di `PUBLIK_TANPA_SESI` (`src/worker.js:751` dan baris `/lapor`, `/lapor/lacak` di daftar itu) dan di `halamanTerkunci` (`src/worker.js` sekitar baris 765-772). Halaman tidak memuat data; data dari `/api/lapor/*`.
- Alun-alun `/lapor` (tab): K30 `:44`; Q14 `:89` (hanya status `ditindaklanjuti` atau `selesai`, tanpa nama, WA, foto, kronologi; lokasi sampai desa); `TAMPIL_ALUN` di `src/lapor_tampil.js:21`; pembentuk `alunBuat` di `src/lapor_ai.js:915-940` (cache tepi 60 detik, batas laju 120 per jam per IP, titik pusat desa dibulatkan 4 desimal, id kartu disidik hash 10 karakter); bukti foto publik hanya yang ditandai staf (`src/lapor_ai.js:903`, D88, Q47).
- Fakta penting: Alun-alun TIDAK memeriksa pengecekan BPBD. Tiket `ditindaklanjuti` tanpa pengecekan sudah tampil publik. K86 meminta syarat yang lebih ketat ("terverifikasi"), jadi dua halaman publik akan berbeda syarat (Q10).
- Dua halaman lain yang tidak boleh ditiru karena beda hal: `/bnpb/alun-alun` dan `/alun-alun` adalah forum alun-alun (paket `alun-terpadu`, `PUBLIK_TANPA_SESI` baris `/alun-alun`), bukan laporan bencana; `/siklus/kejadian/KJ-...` adalah ringkasan resmi publik satu kejadian di Buku Besar (`siklus/KEPUTUSAN-AWAL.md:100`, U3).

### 1.5 Buku Besar Kejadian dan pencocok

- Buku Besar: `data/kajian-bnpb/siklus/` (`KEPUTUSAN-AWAL.md`: U3 halaman publik ringkasan resmi saja, U16 status tidak naik terverifikasi otomatis, `:100`, `:112`).
- Pencocok satu: `scripts/siklus/pasang.py`. `PRIORITAS_MASUK` (`:17`) dan `SUMBER_MODUL` (`:345`) belum memuat `lapor_ai`. Logika `bertahap` (`:262-310`): satu kandidat menempel (`tambah`), nol kandidat mendirikan (`baru`), lebih dari satu masuk antrean (`ambigu`), tanpa wilayah (`tanpa_wilayah`). ID resmi `id_kj` (`:43-47`).
- Rencana sumber `lapor_ai`: `lapor-ai/ALGORITMA.md:119` dan D29 (`:128`): hanya menempel, tidak pernah `baru`. Tiket LA-25 belum dikerjakan (`TIKET.md:52`).
- Antrean tinjau: `src/siklus_kejadian.js:295` (`antreanPutus`), rute `:469-470` (izin `PDKO`); keputusan `pilih` = ID kandidat, `"baru"`, atau tolak.
- Rute ingest modul yang direncanakan `keterpaduan` D3 (`GET /api/siklus/ingest/modul`) belum ada di kode (pencarian `ingest/modul` pada `src` dan `scripts` kosong). Ini dependensi LK-10.
- Aturan keterpaduan yang mengikat: satu nomor kejadian untuk semua modul, pencocok tetap satu, tidak ada buku kejadian kedua, tanpa router WA bersama (`keterpaduan/KEPUTUSAN-KETERPADUAN.md:19-20`, `:33`; AGENTS 2.15).
- Kadensi pencocok: `siklus.yml` jalan tiap 3 jam (`.github/workflows/siklus.yml:16`) dan tiga jadwal lain.

## 2. Celah

| Celah | Akibat | Ditangani |
| --- | --- | --- |
| Jendela satu desa 6 jam terlalu pendek untuk banjir yang dilaporkan sepanjang hari | Laporan desa yang sama pecah jadi beberapa gugus | D2, Q1 (24 jam) |
| Tidak ada definisi tunggal "terverifikasi" | Meja, halaman publik, dan usulan bisa memakai arti berbeda | D4 |
| Dua halaman publik beda syarat | Wartawan melihat dua sinyal | Q10 |
| Tidak ada jalan dari tiket ke Buku Besar selain pencocok otomatis yang melarang `baru` | Kejadian yang hanya dilaporkan warga dan sudah dicek BPBD tidak pernah jadi kejadian resmi | K87, D9 |
| Awalan `KJ-` ganda | Salah baca kode | Q14 |

## 3. Praktik luar (belum diperiksa sumbernya di sesi ini; periksa sebelum dikutip di buku atau paparan)

- Platform peta laporan warga untuk bencana di Indonesia dan dunia umumnya memisahkan laporan masuk (tidak publik) dari laporan yang sudah dimoderasi (publik), dan menempelkan penanda sumber. Nama dan perilaku tepatnya perlu diverifikasi.
- Perangkat lunak pemetaan krisis umum memakai status "terverifikasi" per laporan dengan moderator manusia; mesin hanya mengelompokkan.
- Untuk data kependudukan dan lokasi, prinsip minimisasi data dan pembatasan tujuan UU 27/2022 tentang Pelindungan Data Pribadi berlaku pada nomor WA, nama, dan koordinat pelapor. Pasal rinci perlu dikaji staf hukum, tidak dikutip di sini.
- Kewenangan menyatakan kejadian bencana resmi dan data korban ada pada BNPB dan BPBD; laporan warga tidak menggantikannya. Rujukan peraturan perlu diisi staf (tidak dikarang di sini).

## 4. Yang tidak diteliti

Tidak ada pengujian pada data produksi. Tidak ada pengukuran seberapa sering laporan satu desa jatuh di luar jendela 6 jam; angka itu menunggu data F0 (Q1).
