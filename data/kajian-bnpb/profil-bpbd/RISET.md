# RISET: Akun BPBD dengan profil PIC

Rujukan berkas dan baris diukur 23 Nov 2026 pada pohon kerja (sebagian berkas sedang dalam perubahan sesi lain); cek ulang nomor barisnya sebelum dipakai. Keputusan pemilik ada di `KEPUTUSAN-PROFIL.md` dan menang atas dokumen ini.

## 1. Keadaan sekarang

| Fakta | Bukti |
| --- | --- |
| Belum ada satu pun baris `instansi_akun` di D1 produksi; BPBD yang perlu akun 553 (38 provinsi, 515 kab/kota) | `KEPUTUSAN-PROFIL.md` bagian Masalah |
| Satu akun lembaga = satu baris `instansi_akun` dengan `username`, `garam`, `sandi_sha`, dan satu set data wakil (nama, NIP, jabatan, unit, email, wa) | `migrations/0029_instansi.sql:10-41` |
| CHECK tabel: status selain `belum_klaim`, `dicabut`, `ditolak` mensyaratkan nama, NIP, jabatan, unit, email, wa terisi serta `surat = 1` dan `kartu = 1` | `migrations/0029_instansi.sql:39-40` |
| Jenis akun yang dibuat massal: `pemprov`, `polda`, `kodam`, `pemkab` atau `pemkot`, `polres`, `kodim` (satu definisi per wilayah) | `src/instansi.js:71-86` (`susunDefs`) |
| Sesi akun disimpan sebagai sha256 token di `instansi_sesi`, kedaluwarsa 30 hari, kuki `sesi_instansi` berjalur `/instansi` dan `/api/instansi` | `src/instansi.js:106` (`cookieSet`), `migrations/0029_instansi.sql:60-67` |
| Satu pintu kerja: `akunAktif` (sesi + status `aktif` + `wajib_ganti = 0`); dipakai sekitar 50 rute di `instansi.js`, `inventaris.js`, `penugasan.js`, `push.js`, `monitor.js`, `korban.js`, `drone.js`, `siklus.js`, `logpal.js`, `uji_banjir.js`, `pb_isian.js`, `operasi_lapangan.js`, `laporan_karhutla.js` | `src/instansi.js:120-126` dan `grep akunAktif src` |
| Masuk: sandi diperiksa dulu, sandi benar selalu masuk, batas laju hanya di jalur salah (8 per jam per username dan IP, 200 per jam per username, 30 per jam per IP) | `src/instansi.js:132-148` (`masuk`) |
| Sandi awal dari CSV diketahui admin, jadi `wajib_ganti = 1` memaksa sandi baru (acak dari server, tampil sekali) sebelum rute kerja | `src/instansi.js:120-126`, `:153-161` |
| Verifikasi satu wakil: formulir nama, NIP, pangkat, jabatan, unit, email, wa; surat tugas (PDF atau JPEG) dan foto kartu pegawai (JPEG) ke R2 `instansi/dok/<akun>/<jenis>`; admin menyetujui dengan `dikirim` sebagai kunci anti-balapan | `src/instansi.js:203-232`, `:1407-1440` (`ubahAkun`) |
| Buat massal: `POST /api/instansi/admin/buat` mengiris `defs` dari `mulai` sampai `batas` (maks 200), sandi acak hanya di jawaban; layar admin menyusun teks undangan "penanganan karhutla" dan CSV | `src/instansi.js:1367-1385`, `public/admin/instansi.js:112-114` |
| Jejak `instansi_jejak` hanya menerima aksi `setuju, tolak, cabut, reset, ganti_sandi, buat_massal, terima_usulan, tolak_usulan` dan menolak UPDATE serta DELETE lewat trigger; tidak ada kolom profil | `migrations/0029_instansi.sql:252-269` |
| Tiap POST bersesi instansi wajib `x-pb: 1`; POST dengan kuki `sesi_instansi` wajib Origin sama-situs (`tolakOrigin`); tab basi ditolak lewat `x-akun` | `src/instansi.js:1758-1762`, `:641-643`, `src/worker.js:682-690` |
| Batas laju memakai `laju_bnpb` lewat `laju(env, kunci, aksi, [[JAM, n]], kini)` dan `gagalBanyak` | `src/instansi.js:127`, `:226` |
| Foto media di R2 dibersihkan EXIF lewat `bersihMedia`; dokumen dibaca jenisnya dari byte awal (`jenisDok`), bukan `Content-Type`; berkas disajikan dengan CSP `sandbox` dan `no-store` | `src/instansi.js:225-246`, `src/media_bersih.js` |

## 2. Meja Lapor Bencana tidak membaca sesi instansi

`hakMeja` mengizinkan BNPB (admin atau staf) lalu akun pemda lewat sesi `/masuk` saja (`src/lapor_ai.js:134-143`). Akun dicari lewat `lpAkunMeja(env, wa, mkId)`: baris `instansi_akun` aktif jenis `pemkab`, `pemkot`, `pemprov` yang `wa`-nya sama dengan nomor sesi, ditambah akun yang nomor itu aktif sebagai anggota di `mk_anggota` (`src/hak.js:2011-2015`). Komentar di `src/lapor_ai.js:132` mencatat sebabnya: kuki `sesi_instansi` berjalur `/instansi` dan `/api/instansi` tidak dikirim peramban ke `/api/lapor`. Akibatnya pintu `/masuk` adalah satu-satunya jalan BPBD ke meja, dan K9 menutup jalan itu untuk akun pemda. Perancangannya ada di `DESAIN-TEKNIS.md` bagian 4: kuki sesi profil kedua berjalur `/api/lapor`.

Pemanggil `hakMeja`: `src/lapor_ai.js:746`, `:788`, `:895` dan `src/lapor_lanjut.js:60`. Karena semuanya lewat satu fungsi, mengganti sumber hak di dalam `hakMeja` sudah cukup untuk seluruh meja dan data lanjutan.

`cakupanMeja` (`src/lapor_meja_hak.js`) sudah menurunkan label "BPBD Provinsi X" atau "BPBD Kabupaten X" dari `jenis`, `tingkat`, `prov`, `kab`, `wilayah`, dan `nama` pelaku. Profil memberi `nama` itu, jadi fungsi ini tidak perlu diubah.

## 3. Pintu `/masuk` yang terkena K9

`src/masuk.js` menyusun daftar ruang dari nomor sesi: tiap akun instansi yang nomornya cocok atau yang jadi anggota muncul sebagai "Ruang instansi" dan mendapat sesi lewat `sesiUntuk` (`src/masuk.js:128`, `:189-190`; `src/instansi.js:168-171`). Paket pintu masuk juga merancang `mk_anggota`, undangan berantai, dan atur sandi sesudah kode untuk akun instansi (`data/kajian-bnpb/pintu-masuk/KEPUTUSAN-MASUK.md` K2, D6, D7, D15). Untuk akun pemda semua itu berbenturan dengan K9; bawaan sementara Q1 menutupnya. Jenis akun lain (polda, polres, kodam, kodim, pendataan, kemitraan, akun umum) tidak berubah.

## 4. Benturan skema yang harus dijawab rancangan

1. **CHECK status akun.** Akun `menunggu` atau `aktif` wajib punya data satu wakil di kolom akun. Profil memindahkan data pribadi ke tabel anak, tetapi CHECK tidak bisa dicabut tanpa membangun ulang tabel dengan belasan tabel bergantung (`tugas_isian`, `instansi_media`, `mk_anggota`, dan lain-lain). Rancangan memilih menyalin data PIC pertama yang disetujui ke kolom akun saat status naik ke `menunggu`; CHECK tetap terpenuhi dan `surat`, `kartu` tetap satu per akun (cocok dengan bawaan Q4).
2. **Enum `instansi_jejak.aksi` tertutup.** Menambah aksi butuh membangun ulang tabel berpemicu. Rancangan memakai tabel log baru khusus profil.
3. **SQLite tidak punya `ADD COLUMN IF NOT EXISTS`.** Migrasi harus idempoten (`AGENTS.md` gerbang `migrasi-idempoten`), jadi tidak ada `ALTER TABLE instansi_sesi`; sesi profil jadi tabel baru dan kuki baru.
4. **`wajib_ganti`.** Sandi awal dari CSV tetap memaksa sandi lembaga baru sebelum rute kerja. Pada model profil sandi itu dipegang semua PIC (bawaan Q5), jadi sandi baru yang tampil sekali harus disalin PIC yang mengganti ke pengelola sandi bersama; layar mengatakannya.

## 5. Praktik yang dijadikan pegangan (pengetahuan umum, bukan hasil ukur repo)

| Praktik | Dipakai sebagai |
| --- | --- |
| Layar pilih profil layanan tontonan: satu akun rumah tangga, profil berfoto, PIN opsional per profil | Bentuk layar L2 dan L3 (K2, K3). Di sini PIN wajib, bukan opsional |
| PIN pendek aman hanya bila percobaan dibatasi dan kunci penyimpan tidak ikut bocor dari basis data | PIN 6 angka disimpan sebagai HMAC dengan rahasia di env, kunci per profil, batas salah berjenjang (Q2) |
| Sesi kerja diikat ke orang, bukan ke lembaga, supaya jejak audit menunjuk orangnya | Sesi profil terpisah dari sesi akun; log tiap tindakan membawa `profil_id` (K5) |
| Cabut orang tanpa mengganti sandi bersama | Profil `dicabut` mematikan sesi profil saat itu juga, walau sandi lembaga tetap dikenal (Q5) |

## 6. Yang sengaja tidak dikerjakan

Pencocokan wajah (K8), baca WA masuk, akun Polda, Polres, Kodam, Kodim (Q6), alur pengganti PIC yang pindah selain cabut dan tambah profil (cukup dengan aksi admin), serta tautan isian lama ke profil pengisinya (isian lama tetap atas nama akun).
