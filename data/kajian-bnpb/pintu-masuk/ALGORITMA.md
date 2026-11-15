# ALGORITMA: Satu Pintu Masuk

Semua angka di sini adalah ambang rancangan agent (bisa diubah pemilik); letaknya satu tempat, `src/masuk_konst.js`.

## 1. Nomor

`nomor = normalWA(isian)` (`src/nomor.js`). `null` berarti ditolak dengan pesan "nomor WhatsApp tidak sah (contoh 0812xxxxxxx)". Kunci nomor untuk batas laju dan kode adalah `nomor_sha = HMAC-SHA256(MASUK_KUNCI, "wa|" + nomor)`; nomor terang hanya disimpan di `mk_akun.wa` dan `mk_undang.wa`.

## 2. Kode sekali pakai

### 2.1 Minta kode

Urutan pemeriksaan; gagal di satu langkah berhenti di situ.

1. `MASUK_KUNCI` (paling sedikit 32 karakter), `TURNSTILE_SECRET`, dan `TURNSTILE_SITEKEY` terisi; bila tidak, 503. Rute ini tidak ikut perilaku lolos `turnstileOK` saat rahasia kosong (`src/worker.js:224-225`).
2. Header `x-pb: 1` ada dan `Origin` sama situs.
3. Alamat pemanggil terbaca (`cf-connecting-ip`); bila tidak, ditolak.
4. Batas laju per IP, lalu Turnstile sah (supaya token ngawur tidak memicu panggilan keluar tanpa hitungan).
5. Batas laju, urut: jeda kirim ulang, per nomor, global (jeda lebih dulu supaya klik ganda tidak memakan jatah nomor):

| Kunci | Batas |
| --- | --- |
| per nomor | 3 kode per 15 menit, 8 per hari |
| per IP | 30 permintaan per jam (jaringan seluler berbagi alamat) |
| global | 300 kode per jam, 2.000 per hari |
| jeda kirim ulang | 60 detik sejak kode terakhir untuk nomor itu |

6. Kode lama nomor itu **tidak** dihanguskan (KEPUTUSAN D18); semua kode yang belum dipakai dan belum habis tetap sah, paling banyak tiga karena batas laju.
7. `kode` = enam angka dari `crypto.getRandomValues` dengan penolakan bias.
8. Simpan `mk_kode`: `nomor_sha`, `kode_sha = HMAC-SHA256(MASUK_KUNCI, nomor + "|" + kode)`, `habis = kini + 5 menit`, `coba = 0`, `saluran`.
9. Antre pesan ke `wa_antre` dengan `jenis = 'otp'`, `rujukan = id mk_kode`.
10. Jawaban selalu sama, baik nomor dikenal maupun tidak: `{ok: true, tunggu: 60}`.

Batas global tercapai: 429 "sedang ramai, coba beberapa menit lagi". Batas ini melindungi nomor gerbang dari pemblokiran.

### 2.2 Periksa kode

1. Header `x-pb: 1`, `Origin` sama situs, batas laju per IP 60 percobaan per jam.
2. Ambil semua `mk_kode` nomor itu yang belum dipakai dan belum habis. Tidak ada: "kode salah atau kedaluwarsa".
3. `coba = coba + 1` ditulis dulu pada semua baris itu (satu `UPDATE ... RETURNING`), baru dibandingkan. Baris dengan `coba > 5` ditandai habis.
4. Bandingkan HMAC tiap baris dengan perbandingan waktu tetap, tanpa berhenti di tengah.
5. Cocok: tandai dipakai dalam `UPDATE ... WHERE dipakai IS NULL` dan periksa satu baris berubah (dua permintaan serentak hanya satu yang menang). Kode aktif lain nomor itu ikut dihanguskan dan baris pesannya dihapus.

Pesan galat untuk kode salah, habis waktu, habis coba, dan nomor tanpa kode sama persis.

### 2.3 Pesan kode di antrean

- Gerbang hanya menarik baris `otp` yang berumur di bawah 5 menit; baris `otp` yang gagal dicoba ulang tiap 20 detik selama masih di bawah 5 menit. Aturan umum (ulang tiap 10 menit, tiga percobaan, `src/lapangan_wa.js:16`) tidak dipakai untuk `otp`.
- Saat gerbang melapor terkirim, baris `otp` dihapus. Saat kode sah dipakai, baris `otp`-nya dihapus.
- Pembersihan berkala (`src/lapangan_panel.js:494`, jalan sejam sekali) menghapus baris `otp` berumur lebih dari 5 menit. Jadi isi pesan yang tidak pernah terkirim bisa tinggal paling lama sekitar satu jam, tetapi kodenya sudah hangus sesudah 5 menit dan tidak pernah ditarik lagi.

### 2.4 Kode lewat email (cadangan)

Layar menawarkan email kepada semua orang dan meminta alamatnya diketik. Jawaban selalu sama. Email hanya benar-benar dikirim bila alamat itu sama persis dengan kolom `email` sebuah akun peran aktif yang `wa`-nya sama dengan nomor yang diketik. Aturan kode sama dengan 2.1 dan 2.2.

Kode dari email diikat ke akun yang alamatnya cocok (`mk_kode_akun`). Saat kode itu sah, hanya sesi akun tersebut yang terbit: tanpa akun umum, tanpa `sesi_masuk`, tanpa pemrosesan undangan atau bukti ulang (KEPUTUSAN D21). Staf lewat email tidak mendapat sesi dan diarahkan ke pintu sandi.

## 3. Menentukan akun yang boleh dimasuki

Masukan: `nomor` yang kodenya sah. Keluaran: daftar `{tabel, akun_id, ruang, butuh_sandi}`. Aturan tunggal: **akun tujuan harus terikat langsung ke nomor yang baru dibuktikan**. Tidak ada pemetaan tidak langsung; `orang_akun` tidak dipakai untuk menerbitkan sesi.

| Sumber | Syarat | Ruang bawaan | Sesi |
| --- | --- | --- | --- |
| `instansi_akun` | `wa = nomor` dan `status = 'aktif'` | `/instansi` | `sesi_instansi` |
| `mk_anggota` ke `instansi_akun` | anggota `status = 'aktif'`, `mk_akun.wa = nomor`, akun tujuan `status = 'aktif'` | `/instansi` | `sesi_instansi` |
| `pdt_akun` | `wa = nomor` dan `status = 'aktif'` | `/pendataan` | `sesi_pendataan` |
| `km_akun` | `wa = nomor` dan `status = 'aktif'` | `/kemitraan` | `sesi_kemitraan` |
| `staf` | `wa = nomor` dan `status = 'aktif'` | `/admin/pantau` | `sesi_staf`, hanya sesudah sandi (`butuh_sandi`) |
| `pemirsa` lewat `mk_pemirsa_wa` | `wa = nomor`, pemirsa `status = 'aktif'` dan belum diputus | tab pertama yang diizinkan (`arahPemirsa`) | `sesi_pemirsa` |
| `relawan` | `wa` cocok, `anonim = 0`, status ada di `STATUS_RELAWAN_SAH` (`src/lapangan.js:21`), **tepat satu baris** | `/relawan/saya` | tanpa cookie baru, lihat DESAIN-TEKNIS 4.3 |
| `orang` | `wa` cocok, `status = 'aktif'`, **tepat satu baris** | `/petugas` | sama |

Catatan:

- `relawan.wa` dan `orang.wa` tidak dijamin berawalan 62 (`migrations/0023_relawan.sql:47`, `0095:14`). Pencocokan memakai dua bentuk: `nomor` dan `"0" + nomor.slice(2)`.
- Lebih dari satu baris `relawan` atau `orang` untuk satu nomor: tidak ada yang dibuka; orang diminta memakai tautan kodenya.
- Dua akun bercookie dengan nomor sama di satu tabel: keduanya tampil di pemilih ruang, tidak ada sesi otomatis untuk jenis itu, dan sesi baru terbit saat orang memilih satu.
- Akun bertanda contoh (`dummy = 1`) tidak pernah dicocokkan.
- Undangan yang masih berlaku untuk nomor itu diproses dulu (bagian 5), lalu pencarian dijalankan.
- Akun rahasia tidak punya nomor dan tidak pernah dicari. Rute `/api/masuk/*` tidak pernah menerbitkan `sesi_admin`.

## 4. Aktif otomatis sebagai anggota

Hanya berlaku untuk masuk ke akun lembaga yang **sudah aktif**. Aktivasi pertama sebuah akun instansi tetap lewat verifikasi yang ada (KEPUTUSAN D16).

Permohonan `{mk_id, tabel, akun_id}` aktif tanpa peninjau bila salah satu benar, diperiksa berurutan:

| Jalur | Syarat | Bukti dicatat |
| --- | --- | --- |
| Undangan | ada `mk_undang` berstatus terkirim untuk nomor itu, belum 14 hari, menunjuk akun yang sama | `undang:<id>` |
| Kontak | ada `kontak_pemangku` dengan `wa = nomor`, `status = 'aktif'`, kategori cocok dengan jenis akun, `prov` dan `kab` sama dengan akun | `kontak:<id>` |
| Email terpetakan | kode sekali pakai sah ke email yang domainnya ada di `mk_domain` untuk akun itu; pencocokan akhiran berbatas titik | `email:<domain>` |

`status = 'aktif'` pada kontak berarti dibuat atau disetujui admin; pendaftaran kontak sendiri berstatus menunggu. Kontak dengan `ajudan_wa = nomor` tidak mengaktifkan.

Peta kategori kontak:

| Kategori kontak | Boleh aktif sebagai |
| --- | --- |
| `bpbd`, `kepala_daerah`, `pemda` | anggota akun instansi pemda atau BPBD wilayah itu |
| `tni`, `polri` | anggota akun instansi TNI atau Polri wilayah itu |
| `bnpb` | tidak aktif otomatis; hanya tanda "cocok kontak" di antrean tinjau pendataan (KEPUTUSAN D19) |
| lainnya | tidak aktif otomatis |

Tidak ada jalur yang cocok: permohonan berstatus `menunggu` di antrean tinjau. Permohonan aktivasi pertama akun instansi yang nomornya cocok kontak diberi tanda "cocok kontak" dan diurutkan paling atas.

Kampus: akun `km_akun` tetap dibuat lewat alur yang ada (surat tugas, persetujuan staf). Pintu ini hanya memasukkan akun kampus yang sudah aktif.

## 5. Undangan berantai

Pengundang `P` adalah anggota aktif sebuah akun instansi, pemilik nomor akun itu, atau staf. Undangan untuk nomor `n` ke akun `A` sah bila:

1. `A` adalah akun `P` sendiri; staf boleh menunjuk akun instansi mana pun dalam wilayah hak stafnya, atau mengundang ke pendataan.
2. `A` berstatus aktif.
3. `P` belum melewati 20 undangan per hari dan 100 undangan terbuka.
4. `n` bukan nomor `P` sendiri dan belum menjadi anggota `A`.

Undangan tidak pernah menunjuk tabel `staf` dan tidak pernah membuat akun lembaga. Satu nomor menerima paling banyak tiga undangan per 24 jam dari semua pengundang. Undangan hanya sah selama pengundangnya masih berhak; mencabut anggota ikut mencabut undangan yang ia kirim. Undangan ke pendataan hanya memberi tanda "diundang staf" di antrean tinjau, tidak mengaktifkan. Isi pesan undangan adalah templat tetap; satu-satunya bagian yang berubah adalah nama lembaga dari basis data. Nama yang diketik pengundang tidak masuk pesan.

Anggota yang diaktifkan undangan mencatat `oleh` pengundangnya. Mencabut pengundang tidak mencabut yang diundang; pemilik nomor akun dan admin bisa mencabut anggota mana pun.

## 6. Sesi

| Sesi | Umur | Diterbitkan oleh |
| --- | --- | --- |
| Akun umum `sesi_masuk` | 30 hari (Q6) | pintu ini |
| Instansi, pendataan | 30 hari | pembuat sesi modul masing-masing |
| Kampus | 12 jam | pembuat sesi kemitraan |
| Staf | 30 hari | `cobaMasukStaf` sesudah sandi |

"Baru masuk dengan kode" = `mk_sesi.kode_pada` dalam 15 menit terakhir; syarat untuk atur sandi. Atur sandi berlaku untuk `instansi_akun` (hanya pemilik nomor akun, bukan anggota; sandinya dibuat acak oleh server dan tampil sekali), `pdt_akun`, dan `km_akun` (sandi pilihan sendiri); tidak untuk `staf`. Hanya akun aktif. Mengatur sandi mencabut semua sesi akun itu.

## 7. Bukti ulang

Anggota atau akun peran yang tidak masuk 180 hari: saat masuk lagi, jalur bukti bagian 4 diperiksa ulang. Tidak lolos: status anggota menjadi `menunggu`.

## 8. Papan aktivasi

Per kab/kota (514 baris dari daftar wilayah yang sudah dipakai `/instansi`):

- `akun_aktif` = jumlah `instansi_akun` aktif dengan `kab` itu; `anggota` = jumlah `mk_anggota` aktifnya.
- `terakhir_masuk` = terbesar dari `mk_masuk_log.waktu` untuk akun wilayah itu.
- `undangan` = jumlah `mk_undang` terkirim dan diterima untuk akun wilayah itu.
- `kontak_belum` = jumlah `kontak_pemangku` aktif di wilayah itu yang nomornya belum menjadi anggota.

Status baris: "belum ada akun aktif", "diundang", "aktif", "aktif, lama tidak masuk" (lebih dari 30 hari). Angka dihitung dengan kueri berkelompok dan disimpan di cache tepi 5 menit; tidak dihitung per baris.

## 9. Uji kejujuran

- Jawaban minta kode (WA maupun email) tidak boleh berbeda isi atau status antara nomor dikenal dan tidak dikenal.
- Kode tidak boleh muncul di log atau di jawaban API.
- Tidak ada jalur yang menerbitkan sesi peran tanpa kode sah, dan tidak ada jalur yang menerbitkan sesi staf tanpa sandi sah.
- Tidak ada sesi yang terbit untuk akun yang nomornya berbeda dari nomor yang dibuktikan.
