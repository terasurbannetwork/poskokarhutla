# RISET: Satu Pintu Masuk

Diukur 15 Nov 2026 dari kode repo, D1 produksi, dan `https://centurisk97.id`.

## 1. Keadaan pintu sekarang

### 1.1 Halaman yang terkunci

`halamanTerkunci` (`src/worker.js:734`) mengunci tiap rute GET yang terdaftar kecuali daftar putih `PUBLIK_TANPA_SESI` (`src/worker.js:723`). Hasil di produksi:

| Jalur | Jawaban |
| --- | --- |
| `/` | 303 ke `/admin/masuk?ke=/` |
| `/alun-alun` | 303 ke `/admin/masuk?ke=/alun-alun` |
| `/bnpb` | 303 ke `/admin/masuk` |
| `/instansi`, `/petugas`, `/kemitraan` | 200 (menjaga dirinya sendiri) |

Daftar putih memuat `/lapangan`, `/petugas`, `/meja`, `/daftar-kontak`, `/renlap`, `/uji-pilot`, `/presiden`, `/instansi`, `/siklus/kejadian`, `/bnpb/katalog-dokumen`, `/pendataan`. Alun-alun tidak ada di dalamnya.

### 1.2 Sistem masuk yang ada

| Peran | Rute | Cara | Tabel | Sesi |
| --- | --- | --- | --- | --- |
| Admin, moderator, akun gerbang | `POST /admin/masuk` (`src/statistik.js:255`) | pasangan email dan sandi di rahasia `ADMIN_TOKEN` atau `AKUN_SITUS_*` | tanpa tabel | cookie HMAC `sesi_admin`, 12 jam |
| Staf BNPB | form yang sama, `cobaMasukStaf` (`src/staf.js:114`) | sandi acak 16 huruf, dibuat Super Admin | `staf`, `staf_sesi` | `sesi_staf`, 30 hari |
| Pemirsa | form yang sama | sandi dari Super Admin | `pemirsa`, `pemirsa_sesi` | 30 hari |
| Instansi dan BPBD | `/instansi` | akun dibuat admin, wakil mengisi verifikasi, admin menyetujui | `instansi_akun`, `instansi_sesi` | 30 hari |
| Pendataan | `/pendataan` | daftar sendiri, sandi pilihan (PBKDF2, `src/pendataan.js:23`), Super Admin menyetujui | `pdt_akun`, `pdt_sesi` | 30 hari |
| Koordinator kampus | `/kemitraan` | daftar dengan surat tugas, staf menyetujui, tautan atur sandi 72 jam | `km_akun`, `km_sesi` | 12 jam |
| Relawan, meja BPBD, petugas, mitra riset | tautan berkode `#k=` | kode 26 heksadesimal (`src/bnpb.js:27`) | `relawan`, `meja_petugas`, `orang`, lain-lain | tanpa sesi |

Yang tidak ada: kode sekali pakai, masuk lewat penyedia lain, lupa sandi swalayan, tabel `orang_akun`.

### 1.3 Nomor WA sudah tersimpan di hampir semua tabel akun

`staf.wa`, `instansi_akun.wa` (`migrations/0029_instansi.sql:27`), `pdt_akun.wa`, `km_akun.wa`, `orang.wa`, `relawan.wa`, `kontak_pemangku.wa`. `pemirsa` tidak punya nomor. Semua dinormalkan satu fungsi `normalWA` (`src/nomor.js:3`) ke bentuk `628...`.

## 2. Yang dipakai ulang

| Kebutuhan | Yang sudah ada | Tempat |
| --- | --- | --- |
| Kirim WA | antrean `wa_antre`, gerbang menarik dengan kunci `x-wa-kunci` | `src/lapangan_wa.js:22`, `:37` |
| Normal nomor | `normalWA` | `src/nomor.js` |
| Batas laju | `laju`, `lajuIP`, `cekLaju`, `catatGagal` | `src/bnpb.js`, `src/statistik.js` |
| Pelindung bot | `turnstileOK` | `src/worker.js` |
| Sesi staf | `cobaMasukStaf` dan pembuat cookie staf | `src/staf.js:114` |
| Sandi | `hashSandi` PBKDF2-SHA256 100.000 putaran | `src/pendataan.js:23` |
| Tujuan sesudah masuk | `tujuan(req)` menyaring `?ke=` | `src/statistik.js:251` |
| Email | Resend, `emailAktif` | `src/ews.js:54` |
| Kontak pemangku | `kontak_pemangku` berkategori dan berwilayah | `migrations/0053_kontak.sql` |
| Daftar putih halaman | `PUBLIK_TANPA_SESI` | `src/worker.js:723` |

## 3. Batas yang ditemukan

| Batas | Akibat untuk rancangan |
| --- | --- |
| Gerbang WA memakai Baileys di satu Mac mini, bukan WhatsApp Business API | Nomor bisa diblokir bila mengirim terlalu banyak ke nomor asing. Kode dibatasi per nomor, per IP, dan per jam secara global. |
| Gerbang menarik antrean tiap 60 detik (`scripts/wa/lapangan_tarik.mjs:53`, bawaan `tiapMs = 60000`); percobaan ulang tiap 10 menit (`TARIK_ULANG_MS`) | Kode bisa telat sampai satu menit. Target di bawah 30 detik butuh jeda tarik lebih pendek untuk jenis `otp` (PM-04). |
| Gerbang punya pembatas kirim sendiri: jeda acak 15 sampai 20 detik antarpesan, 3 per menit, 8 per tujuan per hari (`scripts/wa/gateway/limiter.js`) | Kode ikut antre di pembatas yang sama (Q11); sasaran 30 detik tidak dijamin saat gerbang sibuk. Batas 8 per tujuan per hari sama dengan batas 8 kode per nomor per hari. |
| `wa_antre.pesan` menyimpan isi pesan sampai dibersihkan 24 jam | Isi pesan `otp` dikosongkan saat terkirim; kode disimpan hanya sebagai HMAC. |
| Email pengirim masih `onboarding@resend.dev` (`wrangler.jsonc:22`) | Cadangan email belum bisa dipakai sampai domain diverifikasi. |
| Kuota baca D1 Free 5 juta baris per hari; pernah habis 28 Okt dan 11 Nov | Pencarian nomor memakai indeks pada kolom `wa`; tanpa pindai tabel. |
| `kontak_pemangku` produksi berisi 0 baris | Jalur aktif otomatis D6 (a) baru berguna sesudah kontak diimpor (rute impor CSV sudah ada). |
| `turnstileOK` lolos diam-diam bila `TURNSTILE_SECRET` kosong (`src/worker.js:224`) | Rute minta kode menolak bila rahasia kosong; tidak ikut perilaku lolos. |

### 3.1 Batas skema akun instansi

`instansi_akun` unik per `(jenis, kunci_wilayah)` (`migrations/0029_instansi.sql:37`) dan hanya punya satu kolom `wa`. Status menunggu atau aktif mewajibkan `nip`, `jabatan`, `unit`, `email`, `wa`, `surat = 1`, dan `kartu = 1` (`0029:39-40`). Akibatnya: satu lembaga satu akun, tidak ada "tim", dan akun tidak bisa diaktifkan tanpa bukti surat dan kartu. Staf hanya dibuat Super Admin (`src/staf.js:2`). Rancangan menjawabnya dengan tabel anggota, bukan dengan mengubah tabel itu.

## 4. Praktik yang ditiru

| Praktik | Sumber | Dipakai di |
| --- | --- | --- |
| Kode enam angka, berlaku lima menit, paling banyak lima kali coba | NIST SP 800-63B bagian autentikator di luar pita | ALGORITMA 2 |
| Jawaban sama untuk nomor dikenal dan tidak dikenal | OWASP Authentication Cheat Sheet, pencegahan pencacahan akun | ALGORITMA 2 |
| Kode lewat pesan tidak dipakai sendirian untuk akun staf | NIST SP 800-63B, autentikator terbatas | KEPUTUSAN D8 |
| Undangan berantai dengan hak tidak melebihi pengundang | pola undangan ruang kerja (Slack, Google Workspace) | ALGORITMA 5 |
| Satu nomor, banyak ruang, pilih sesudah masuk | pola pemilih ruang kerja | ALUR A3 |

## 5. Yang sengaja tidak dibuat

- Masuk lewat Google atau penyedia lain: banyak petugas daerah tidak punya akun kerja; nomor WA dimiliki semua.
- Passkey: belum ada perangkat yang seragam; bisa ditambah kelak tanpa mengubah rancangan.
- Router WA masuk: dilarang KEPUTUSAN-KETERPADUAN K2.
- Menggabung tabel akun: sesi lama dipertahankan (D2).
