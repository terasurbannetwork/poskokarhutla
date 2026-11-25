# Kode sekali pakai, ruang, anggota

Halaman ini menguraikan metode kode sekali pakai lewat WhatsApp, penentuan ruang yang boleh dimasuki, dan aktif otomatis sebagai anggota lembaga.

## M1. Kode sekali pakai lewat WhatsApp

Sumber data: nomor yang diketik pengguna, dinormalkan oleh `normalWA` (`src/nomor.js`). Tidak ada sumber eksternal selain gerbang WhatsApp milik sendiri.

Langkah minta kode (`mintaKode`, `src/masuk.js:67`), berhenti di langkah pertama yang gagal:

1. Rahasia `MASUK_KUNCI` (paling sedikit 32 karakter), `TURNSTILE_SECRET`, dan `TURNSTILE_SITEKEY` harus terisi, bila tidak 503. Rute ini tidak ikut perilaku Turnstile yang meloloskan bila rahasia kosong.
2. Header `x-pb: 1` dan `Origin` sama situs; alamat pemanggil terbaca.
3. Batas laju per IP (sebelum Turnstile, supaya token ngawur tidak memicu panggilan keluar tanpa hitungan), lalu Turnstile.
4. Jeda 60 detik sejak kode terakhir nomor itu, lalu batas per nomor, lalu batas global.
5. Kode enam angka dari `crypto.getRandomValues` dengan penolakan nilai bias (`kodeAcak`). Yang disimpan di `mk_kode`: HMAC nomor dan HMAC `nomor|kode` berkunci `MASUK_KUNCI`, bukan kode terang.
6. Pesan masuk antrean `wa_antre` jenis `otp`. Jawaban selalu `{ok: true, tunggu: 60}` untuk nomor dikenal maupun tidak.

Langkah periksa kode (`periksaKode`, `src/masuk.js:105`):

1. Ambil semua kode aktif nomor itu (paling banyak 5 baris). Naikkan penghitung `coba` pada semuanya lebih dulu, baru bandingkan HMAC dengan perbandingan waktu tetap.
2. Kode cocok ditandai terpakai lewat `UPDATE ... WHERE dipakai IS NULL`; dua permintaan serentak hanya satu yang menang. Kode aktif lain nomor itu ikut hangus.
3. Minta kode baru tidak menghanguskan kode lama (KEPUTUSAN-MASUK D18), supaya pihak lain tidak dapat mematikan kode yang baru diterima korban.

Ambang (`src/masuk_konst.js`):

| Besaran | Nilai |
| --- | --- |
| Panjang kode | 6 angka |
| Umur kode | 5 menit |
| Percobaan per kode | 5; yang keenam menghanguskan |
| Jeda minta ulang per nomor | 60 detik |
| Batas minta per nomor | 3 per 15 menit, 8 per hari |
| Batas minta per IP | 30 per jam |
| Batas periksa per IP | 60 per jam |
| Batas global | 300 per jam, 2.000 per hari |
| Sesi akun umum | 30 hari |
| "Baru masuk dengan kode" (syarat atur sandi dan hapus akun) | 15 menit |
| Denyut gerbang dianggap mati | lebih dari 5 menit |
| Retensi `mk_kode`, `mk_undang`, `mk_masuk_log` | 1 hari, 90 hari sesudah berlaku, 400 hari |

Pesan `otp` yang gagal terkirim ditarik ulang tiap 20 detik selama umur kode (`OTP_ULANG`); pembersihan menghapus baris `otp` berumur lebih dari 5 menit. Kode hanya ikut pembatas kirim gerbang WhatsApp yang sama dengan pesan lain (belum diputuskan pemilik, bawaan sementara Q11), sehingga kode dapat terlambat 20 detik atau lebih.

Batasan: gerbang WhatsApp memakai pustaka tidak resmi pada satu mesin. Nomor yang sama dipakai bot laporan harian (K9), sehingga blokir WhatsApp mematikan keduanya sekaligus. Cadangannya kode ke email dan pintu sandi.

## M2. Menentukan ruang yang boleh dimasuki

Aturan tunggal (`cariRuang`, `src/masuk.js:187`): akun tujuan harus terikat langsung ke nomor yang baru dibuktikan. Tidak ada pemetaan tidak langsung dan `orang_akun` tidak dipakai untuk menerbitkan sesi.

| Sumber | Syarat | Sesi |
| --- | --- | --- |
| `instansi_akun` bukan pemda | `wa` sama dan `status = aktif`, bukan dummy | `sesi_instansi` |
| `mk_anggota` ke `instansi_akun` bukan pemda | anggota aktif, akun tujuan aktif | `sesi_instansi` |
| `pdt_akun` | `wa` sama dan aktif | `sesi_pendataan` |
| `km_akun` | `wa` sama dan aktif | `sesi_kemitraan` (umur 12 jam menurut dokumen) |
| `staf` | `wa` sama dan aktif | `sesi_staf` hanya sesudah sandi |
| `pemirsa` lewat `mk_pemirsa_wa` | nomor sama, pemirsa aktif | `sesi_pemirsa` |
| `relawan` atau `orang` | nomor cocok (dua bentuk: 62 dan 0), tepat satu baris, status sah | hak terbatas, tanpa cookie baru |

Akun berstatus contoh (`dummy = 1`) tidak pernah dicocokkan. Bila ada lebih dari satu baris `relawan` atau `orang` untuk satu nomor, tidak ada yang dibuka. Akun rahasia tidak punya nomor dan tidak pernah dicari. Rute `/api/masuk/*` tidak pernah menerbitkan `sesi_admin`.

## M3. Aktif otomatis sebagai anggota lembaga

Berlaku hanya untuk akun lembaga yang sudah aktif; aktivasi pertama akun instansi tetap lewat verifikasi (surat tugas dan kartu), sesuai CHECK di migrasi `0029` dan KEPUTUSAN-MASUK K11. Permohonan aktif tanpa peninjau bila salah satu terpenuhi, diperiksa berurutan:

1. Undangan: ada `mk_undang` terkirim untuk nomor itu, belum 14 hari, menunjuk akun yang sama dan pengundangnya masih berhak.
2. Kontak: ada `kontak_pemangku` berstatus aktif dengan nomor sama, kategori cocok, provinsi dan kabupaten sama dengan akun.
3. Email terpetakan: kode sekali pakai sah ke email yang domainnya ada di `mk_domain` untuk akun itu. Akhiran umum (`go.id`, `ac.id`, dan sejenisnya, `AKHIRAN_UMUM`) dan surel gratis (`SUREL_GRATIS`) tidak pernah dipetakan; pencocokan akhiran berbatas titik.

Peta kategori kontak ke jenis akun (`PETA_KATEGORI`): pemprov, pemkab, pemkot ke bpbd, kepala_daerah, pemda; polda dan polres ke polri; kodam dan kodim ke tni. Kategori `bnpb` tidak mengaktifkan siapa pun; ia hanya menjadi tanda "cocok kontak" di antrean tinjau pendataan. Akun pendataan tidak pernah aktif otomatis (KEPUTUSAN-MASUK D19). Anggota yang 180 hari tidak masuk diperiksa ulang; bila bukti tidak lagi cocok statusnya kembali `menunggu` (`BUKTI_ULANG`).

Tidak ada jalur cocok: permohonan berstatus `menunggu` di antrean tinjau. Akun BPBD tidak memakai jalur ini; ia memakai pendaftaran PIC.
