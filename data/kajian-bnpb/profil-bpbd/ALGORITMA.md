# ALGORITMA: Akun BPBD dengan profil PIC

Semua ambang ada di satu berkas konstanta (`src/profil_konst.js`, `DESAIN-TEKNIS.md` bagian 1). Nilai di tabel ini adalah bawaan sementara Q2, Q7, Q8 dan berubah di satu tempat itu saja. Waktu = milidetik epoch UTC; hari kalender dihitung WIB (UTC+7).

## 1. Konstanta

| Nama | Nilai | Sumber |
| --- | --- | --- |
| `PIN_DIGIT` | 6 | Q2 |
| `PROFIL_MAKS` | 4 profil bukan `dicabut` per akun | K6, D2 |
| `PROFIL_WAJIB` | 3 profil lengkap sebelum kirim | K6 |
| `SALAH_BERUNTUN` | 5 salah, lalu kunci `KUNCI_MENIT`, dihitung per profil dan IP (N7) | Q2, N7 |
| `KUNCI_MENIT` | 15 | Q2 |
| `SALAH_HARI` | 10 salah dalam satu hari kalender WIB, lalu kunci sampai admin membuka | Q2 |
| `SESI_PROFIL_JAM` | 12 | Q8 |
| `LAJU_PIN_AKUN` | 30 percobaan per jam per akun | rancangan, mencegah menyebar ke 4 profil |
| `LAJU_PIN_IP` | 60 percobaan per jam per IP | rancangan, jaringan seluler berbagi alamat |
| `LAJU_BUAT_PROFIL` | 12 per jam per akun | rancangan |
| `FOTO_MAKS` | 2 MB (nilai `MAKS_FOTO` yang ada di `src/instansi.js:34`); peramban mengirim sekitar 100 KB | D6 |
| `LOG_RETENSI_HARI` | 730 | Q7 |

## 2. Profil lengkap

Fungsi murni `profilLengkap(p)` benar bila semua terpenuhi:

1. `nama` 2 sampai 100 karakter, `jabatan` 2 sampai 100, `nip` cocok `RE_NIP` yang ada di `src/instansi.js` dan `RE_EMAIL` yang diimpor dari `src/posko.js` (huruf, angka, titik, garis, spasi, 5 sampai 30), `email` huruf kecil cocok `RE_EMAIL`, `wa` hasil `normalWA` (62 diikuti angka, 10 sampai 15 digit).
2. `foto = 1`.
3. `pin_sha` tidak kosong.
4. `status` bukan `dicabut`.

`nip` dan `email` unik per akun di antara profil bukan `dicabut` (indeks unik parsial). Akun lain boleh memakai NIP yang sama (satu orang merangkap tidak dilarang paket ini).

## 3. PIN

### 3.1 Bentuk

(Rancangan agent D, bisa dibatalkan pemilik; Q2 hanya menetapkan 6 angka.) PIN sah bila persis 6 angka. Ditolak: semua angka sama (`000000`, `111111`), deret naik atau turun (`012345`, `123456`, `654321`), dan sama dengan 6 angka terakhir `wa` profil itu. Pesan penolakan satu kalimat, tanpa menyebut aturan mana.

### 3.2 Simpan

```
garam    = 16 karakter acak (acak(16))
pin_sha  = hex(HMAC-SHA256(kunci = env.PROFIL_KUNCI, pesan = "pin|" + profil_id + "|" + garam + "|" + pin))
```

`PROFIL_KUNCI` minimal 32 karakter (pola `kunciSah` di `src/masuk.js:30`); lebih pendek dianggap belum dikonfigurasi. Tanpa PBKDF2 karena batas CPU Worker (alasan sama dengan komentar `gantiSandi`). Bobot keamanan PIN 6 angka datang dari rahasia di env ditambah batas percobaan, bukan dari kerasnya hash: bocor D1 saja tidak cukup untuk menebak PIN; bocor D1 dan `PROFIL_KUNCI` sekaligus membuat PIN bisa ditebak offline (satu juta kemungkinan). Batas ini dicatat di `KEAMANAN-PRIVASI.md`.

### 3.3 Periksa: hitung dulu, bandingkan sesudahnya

Tujuan: tebakan serentak tidak bisa lolos dari batas. Dua batas berjalan sendiri-sendiri (N7, bawaan sementara):

| Batas | Dihitung per | Disimpan di | Akibat |
| --- | --- | --- | --- |
| 5 salah dalam 15 menit | profil dan IP (`ipHash`) | baris `laju_bnpb`, kunci `pf:<profil>:<ip>`, aksi `profil.pin_salah` (pola `gagalBanyak` dan `catatLaju` yang ada) | PIN dari IP itu ditolak 423 sampai jendela 15 menit lewat; IP lain tidak terkunci |
| 10 salah dalam satu hari kalender WIB | profil saja | kolom `salah_hari`, `hari_tgl`, `kunci_admin` | profil terkunci sampai admin membuka |

```
1. laju akun dan IP (LAJU_PIN_AKUN, LAJU_PIN_IP): bila penuh, 429.
2. reservasi, satu batch atomik:
   a. INSERT INTO laju_bnpb (kunci pf:profil:ip, aksi profil.pin_salah, waktu kini)
      SELECT ... WHERE (SELECT count(*) FROM laju_bnpb WHERE kunci = ? AND aksi = ? AND waktu > :kini - 15 menit) < :SALAH_BERUNTUN
   b. UPDATE instansi_profil
         SET salah_hari = CASE WHEN hari_tgl = :hari THEN salah_hari + 1 ELSE 1 END,
             hari_tgl = :hari,
             kunci_admin = CASE WHEN (CASE WHEN hari_tgl = :hari THEN salah_hari + 1 ELSE 1 END) >= :SALAH_HARI THEN 1 ELSE 0 END
       WHERE id = :profil AND akun_id = :akun AND status = 'aktif' AND kunci_admin = 0 AND changes() > 0
       RETURNING salah_hari, kunci_admin
   Baris a tidak tertulis (changes() = 0) atau b tanpa baris = terkunci atau bukan profil aktif milik akun ini: 423, tanpa membandingkan PIN.
3. bandingkan HMAC jawaban dengan pin_sha (sama panjang, tanpa keluar lebih awal).
4. benar: kembalikan reservasi, lalu terbitkan sesi profil:
     DELETE baris laju yang ditulis langkah 2a (id baris dipegang);
     UPDATE instansi_profil
        SET salah_hari = max(salah_hari - 1, 0),
            kunci_admin = CASE WHEN salah_hari - 1 >= :SALAH_HARI THEN 1 ELSE 0 END,
            pin_pada = :kini, terakhir_masuk = :kini
      WHERE id = :profil
   salah: biarkan reservasi; 401 "PIN salah"; bila RETURNING menunjukkan kunci_admin = 1 atau hitungan laju mencapai batas, jawab 423.
```

Karena langkah 4 mengurangi `salah_hari` dan menghitung ulang `kunci_admin` dari nilai nyata, PIN benar pada percobaan ke-10 tidak memasang kunci harian; kunci hanya bertahan bila memang ada 10 salah. Paling banyak 5 permintaan serentak lolos dari tiap IP sebelum batas 15 menit penuh, jadi penyerang paralel dari satu IP mendapat 5 tebakan per 15 menit, dan 10 per hari untuk seluruh IP.

Risiko pengunci (DoS): pemegang sandi lembaga bisa sengaja menebak salah 10 kali sehari untuk mengunci profil orang lain sampai admin membuka. Batas 15 menit per IP mencegah satu IP mengunci lama, tetapi batas harian tetap per profil (N7). Dicatat di `KEAMANAN-PRIVASI.md` dan diuji (UP-31).

### 3.4 Atur dan ganti PIN

| Situasi | Syarat | Hasil |
| --- | --- | --- |
| Profil `draf` tanpa PIN, PIN pertama (N1) | sesi akun, profil milik akun itu, `pin_sha` kosong | simpan; tanpa memerlukan PIN lama |
| Ganti PIN sendiri | sesi profil profil itu, PIN lama benar (lewat langkah 3.3 yang sama) | simpan, sesi profil lain milik profil ini dicabut |
| Atur ulang oleh admin | moderator ke atas | PIN sementara acak (lihat 3.5), `pin_wajib_ganti = 1`, `salah_hari = 0`, `kunci_admin = 0`, baris laju `pf:<profil>:*` dihapus, sesi profil dicabut, log `reset_pin` |
| Buka kunci oleh admin | moderator ke atas | `kunci_admin = 0`, `salah_hari = 0`, baris laju `pf:<profil>:*` dihapus, log `buka_kunci` |

PIN pertama pada profil yang sudah punya `pin_sha` ditolak lewat rute ini (mencegah PIC lain menimpa PIN orang). Profil yang masih kosong PIN-nya bisa diambil siapa pun yang memegang sesi akun; itu risiko yang diterima N1 dan ditutup oleh persetujuan admin yang melihat foto dan nama.

### 3.5 PIN sementara

Empat miliar dibagi rata oleh satu juta: ambil `uint32` acak, buang bila `>= 4.000.000.000`, ambil `n % 1.000.000`, isi nol di kiri sampai 6 angka. Buang hasil yang kena aturan 3.1 dan ulangi. Tampil sekali ke admin di jawaban API, tidak disimpan terbaca, tidak di log.

## 4. Sesi profil

```
token       = acak(32)                                  // 64 heks seperti sesi akun
token_sha   = sha256(token)
baris       = (token_sha, profil_id, akun_id, dibuat = kini, kedaluwarsa = kini + SESI_PROFIL_JAM)
kuki        = sesi_profil=<token>; HttpOnly; Secure; SameSite=Lax; Max-Age=43200;
              satu Set-Cookie per Path: /instansi, /api/instansi, /api/lapor
```

Baca (`sesiProfilDari`): token 64 heks dari kuki, lalu

```
SELECT p.id profil_id, p.nama, p.jabatan, a.* FROM instansi_sesi_profil s
  JOIN instansi_profil p ON p.id = s.profil_id AND p.status = 'aktif'
  JOIN instansi_akun a   ON a.id = s.akun_id   AND a.status = 'aktif'
 WHERE s.token_sha = ? AND s.kedaluwarsa > ?
```

`sesiProfilDari` ikut mengembalikan `pin_wajib_ganti`. Penegakan ada di tiga pembaca yang sama (`akunAktif`, `hakMeja`, dan pembungkus rute): bila `pin_wajib_ganti = 1`, semua rute selain `POST /profil/:id/gantipin`, `POST /profil/keluar`, dan `GET /profil` menjawab 403 `{galat: "ganti PIN dulu", pin_wajib_ganti: true}`; di `/api/lapor/*` semua rute 403 dengan jawaban yang sama.

Karena `status` profil dan akun dibaca tiap permintaan, mencabut profil atau akun berlaku seketika tanpa menghapus sesi lebih dulu; penghapusan baris sesi tetap dilakukan supaya tabel bersih.

Penerbitan satu sesi profil menghapus sesi profil lain milik profil yang sama yang kedaluwarsa, dan tidak menghapus yang masih berlaku (dua perangkat boleh sekaligus). Ganti profil di perangkat yang sama: rute keluar-profil menghapus baris sesi dari kuki itu dan menghapus kuki di ketiga Path.

## 5. `akunAktif` untuk pemda

Aturan tambahan di satu pintu kerja yang ada (`src/instansi.js:120`):

```
a = akunMasuk(...)                                   // sesi akun, x-akun, seperti sekarang
bila a.status != aktif atau a.wajib_ganti: jawaban lama
bila a.jenis tidak termasuk {pemprov, pemkab, pemkot}: kembalikan a   // jenis lain tidak berubah
p = sesiProfilDari(...)
bila p kosong atau p.akun_id != a.id: 401 "pilih profil dan isi PIN dulu" (+ profil_perlu: true)
bila p.pin_wajib_ganti: 403 pin_wajib_ganti kecuali rute gantipin, keluar, profil;
catat profil di WeakMap permintaan; kembalikan {...a, profil_id, profil_nama}
```

Rute akun-level memakai `akunMasuk`, bukan `akunAktif`, jadi tetap terbuka bagi sesi akun saja: `saya`, `gantisandi`, `keluar`, `verifikasi` (untuk pemda diganti `kirim`), `surat`, `kartu`, dan semua rute `/profil/*` yang tidak butuh profil.

## 6. Kirim untuk disetujui

Syarat: akun pemda, status `belum_klaim` atau `ditolak`, `surat = 1`, `kartu = 1`, dan paling sedikit `PROFIL_WAJIB` profil `draf` yang `profilLengkap`. Urutan "PIC pertama" = `dibuat` terkecil di antara yang lengkap.

Satu batch (semua atau tidak sama sekali):

```
UPDATE instansi_akun SET nama, nip, jabatan, unit = wilayah, email, wa  (dari PIC pertama),
       status = 'menunggu', dikirim = :kini, alasan = NULL
 WHERE id = :akun AND status IN ('belum_klaim', 'ditolak')
UPDATE instansi_profil SET status = 'menunggu', diubah = :kini
 WHERE akun_id = :akun AND status = 'draf' AND pin_sha IS NOT NULL AND foto = 1 AND changes() > 0
INSERT INTO instansi_profil_log ...  jenis = 'kirim'  WHERE changes() > 0
```

Kolom `unit` diisi dari `wilayah` supaya CHECK `0029_instansi.sql:39` terpenuhi (N2). Isi `instansi_akun.nama` dan seterusnya dipakai kode lama (antrean admin, `lpAkunKabProv`, pemberitahuan teruskan) dan tetap berarti "wakil lembaga".

## 7. Setuju dan tolak

Setuju memakai `ubahAkun` yang ada (kunci `dikirim`, `status = 'menunggu'`) dengan tambahan untuk akun pemda:

1. Pra-periksa: ada paling sedikit `PROFIL_WAJIB` profil `menunggu` yang `profilLengkap`; bila tidak, 409 "kurang dari 3 profil lengkap".
2. Dalam batch yang sama dengan pembaruan akun: `UPDATE instansi_profil SET status = 'aktif', disetujui = :kini, oleh = :admin WHERE akun_id = :akun AND status = 'menunggu' AND (SELECT status FROM instansi_akun WHERE id = :akun) = 'aktif'`.
3. Tolak: akun `ditolak`, profil `menunggu` kembali `draf`.

Profil keempat sesudah akun aktif: `POST /admin/profil/:id` aksi `setuju` mengubah satu profil `menunggu` menjadi `aktif` bila akunnya `aktif` dan jumlah profil `aktif` di akun itu kurang dari `PROFIL_MAKS`.

## 8. Cabut

Cabut profil: `status = 'dicabut'`, hapus baris sesi profil miliknya, hapus foto dari R2 sesudah 30 hari lewat pembersihan (agar bisa dipulihkan bila salah cabut), log `cabut`. Cabut akun (`ubahAkun` aksi `cabut`) dan reset sandi lembaga menghapus semua sesi profil akun itu bersama sesi akun yang ada.

Ganti sandi lembaga (`gantiSandi`, `src/instansi.js:153`) menghapus semua sesi profil akun itu sebelum membalas.

## 9. Log tindakan (K5)

Tabel `instansi_profil_log`, hanya menambah. Satu baris per kejadian:

| `jenis` | Kapan | `profil_id` |
| --- | --- | --- |
| `masuk` | sandi lembaga benar, sesi akun terbit | kosong |
| `pin_ok`, `pin_salah`, `terkunci`, `terkunci_admin` | langkah 3.3 | profil yang dipilih |
| `ganti_profil`, `keluar` | rute keluar-profil, keluar penuh | profil yang keluar |
| `profil_buat`, `profil_ubah`, `foto`, `pin_atur`, `pin_ganti`, `kirim` | rute akun-level | profil terkait, kosong untuk `kirim` |
| `setuju`, `tolak`, `cabut`, `reset_pin`, `buka_kunci` | rute admin; `oleh` memuat id admin | profil terkait |
| `kerja` | tiap POST sukses (status < 400) di rute kerja, `rute` = kunci rute seperti `POST /api/instansi/konfirmasi/:id`, `objek` = id di jalur | profil dari sesi |
| `meja` | tiap non-GET yang diizinkan `hakMeja` di rute `/api/lapor/*`, `rute` = metode dan pola jalur | profil dari sesi |

`kerja` ditulis oleh pembungkus `RUTE_INSTANSI` (`src/instansi.js:1758`) yang membaca profil dari WeakMap yang diisi `akunAktif`; satu tulis per permintaan, tanpa pembacaan tambahan. `meja` ditulis oleh `hakMeja` sebelum penangan jalan, jadi menandakan tindakan yang diizinkan, bukan jaminan berhasil; riwayat meja yang ada (`oleh` pelaku) tetap menjadi catatan hasil. Isi badan, teks pesan, dan foto tidak pernah masuk log. `ip` = 12 karakter pertama `ipHash`.

Retensi: `LOG_RETENSI_HARI`. Trigger menolak UPDATE dan menolak DELETE baris yang umurnya kurang dari 730 hari; pembersihan jam-an (`bersihkanInstansi`) menghapus yang lebih tua.

## 10. Buat massal pemda

`buatMassal` menyaring `defs` ke `jenis` dalam {`pemprov`, `pemkab`, `pemkot`} sebelum `slice(mulai, mulai + batas)`. `total` dan `berikut` mengikuti daftar tersaring (indeks dihitung ulang, jadi `mulai` dari panggilan lama yang memakai daftar penuh tidak valid; layar admin selalu mulai dari 0 dan akun yang sudah ada dilewati `ON CONFLICT DO NOTHING`). Jumlah akhir harus sama dengan 38 ditambah banyaknya pasangan kab/kota unik di `public/banjir/data/pusat_kec.json` (515 saat diukur); uji mencocokkan dengan berkas itu, bukan angka tetap.

## 11. Hak meja dari profil

`hakMeja` (urutan baru):

1. Staf BNPB seperti sekarang.
2. `sesiProfilDari`; bila `pin_wajib_ganti = 1`: 403 `pin_wajib_ganti` (meja tidak punya rute pengecualian); bila ada dan `x-pb: 1` untuk non-GET: `cakupanMeja({jenis, tingkat, prov, kab, wilayah, status: 'aktif', nama: profil_nama})`, `kunci = "pf:" + profil_id`, `oleh = c.pelaku`.
3. Jalur `/masuk` untuk akun non-pemda: `lpAkunMeja` dikurangi jenis pemda (Q1), jadi tidak ada akun yang bisa masuk meja lewat dua pintu.

`cakupanMeja` tidak berubah; `pelaku` otomatis memuat nama profil sehingga riwayat meja menunjuk orangnya.
