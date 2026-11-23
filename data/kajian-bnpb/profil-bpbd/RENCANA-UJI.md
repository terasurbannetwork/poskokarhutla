# RENCANA-UJI: Akun BPBD dengan profil PIC

Semua perilaku di sini tinggal di luar TypeScript (D1, trigger, rute, kuki, batas laju, R2), jadi buktinya uji integrasi yang benar-benar menjalankan Worker, D1, dan R2 lokal lewat Miniflare dengan pola `tests/warga/instansi.test.mjs` dan `tests/warga/_bantu.mjs` (migrasi apa adanya, tanpa tiruan klien DB). Uji bermock tidak dihitung sebagai bukti (`~/.claude/TEST.md`, `AGENTS.md` 3.4). Perintah bukti: `npm run uji:warga` dan `npm run uji:agen`.

Berkas uji baru: `tests/warga/profil.test.mjs` (masuk, PIN, sesi, kirim, setuju), `tests/warga/profil_meja.test.mjs` (meja dan `/masuk`), `tests/warga/profil_log.test.mjs` (log, trigger, pembersihan). Perubahan uji lama: `tests/warga/instansi.test.mjs` (buat massal tersaring, verifikasi lama), `tests/warga/masuk*.test.mjs` (akun pemda tidak lagi lewat kode WA). Peta registri `tests/warga/cakupan.json` ditambah entri rute baru.

Uji yang membutuhkan profil aktif (PF-04, UP-3, UP-19, UP-21) menyiapkannya lewat sisipan D1 langsung (akun `aktif`, profil `aktif` ber-PIN, sesi), tanpa melewati alur kirim dan setuju PF-02 dan PF-06.

Lingkungan uji: `PROFIL_KUNCI` 40 karakter, `ADMIN_TOKEN`, `SESI_KUNCI`, `IP_SALT`, `MEDIA` R2, aset `pusat_kec.json` asli dari `public/banjir/data`.

## 1. Uji integrasi

| No | Kriteria terima | Tiket |
| --- | --- | --- |
| UP-1 | Buat massal hanya membuat jenis `pemprov`, `pemkab`, `pemkot`; jumlah akhir sama dengan 38 ditambah pasangan kab/kota unik di `pusat_kec.json`; tidak ada `polda`, `polres`, `kodam`, `kodim`; dijalankan dua kali: kedua kali tidak ada baris ganda dan `dibuat` kosong | PF-05 |
| UP-2 | Masuk dengan username dan sandi benar pada akun pemda membawa `profil_mode: true`; log `masuk` tertulis tanpa profil | PF-02 |
| UP-3 | Akun aktif dengan sesi akun tetapi tanpa sesi profil ditolak (401 `profil_perlu`) di sedikitnya lima rute kerja berbeda (`tugas`, `kontak`, inventaris, `media`, `push`); `saya`, `profil`, `gantisandi`, `keluar` tetap terbuka | PF-04 |
| UP-4 | `GET /profil` hanya memuat profil akun itu; tidak memuat NIP, email, HP; akun lain tidak bisa membaca atau mengubah profil yang bukan miliknya (403 satu pesan yang sama dengan profil tak ada) | PF-02 |
| UP-5 | Sesi profil milik akun B yang dipasang bersama sesi akun A ditolak; `x-akun` yang beda ditolak 401 | PF-04 |
| UP-6 | PIN benar menerbitkan sesi profil: tiga baris `Set-Cookie` `sesi_profil` berjalur `/instansi`, `/api/instansi`, `/api/lapor`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Max-Age=43200`; PIN salah 401; profil milik akun lain 403; jawaban tidak memuat PIN atau hash | PF-02 |
| UP-7 | Lima PIN salah dalam 15 menit dari satu IP: percobaan keenam dari IP itu dengan PIN benar ditolak 423 dengan waktu buka; dari IP lain PIN benar diterima; sesudah jam uji dimajukan 15 menit PIN benar dari IP pertama diterima | PF-02 |
| UP-8 | Dua puluh PIN salah serentak (`Promise.all`) menghasilkan paling banyak 5 baris log `pin_salah` dan sisanya 423; PIN benar sesudahnya ditolak selama terkunci | PF-02 |
| UP-9 | Sepuluh salah dalam satu hari kalender WIB (jendela 15 menit dilewati dengan menyisipkan baris laju berumur tua) memasang `kunci_admin`; PIN benar ditolak sampai admin `buka_kunci`; hari berikutnya hitungan harian kembali 0 | PF-02 | PIN benar pada percobaan ke-10 tidak memasang `kunci_admin` dan `salah_hari` kembali ke 9.
| UP-10 | Profil `dicabut`: masuk dengan sandi lembaga dan PIN benar ditolak; sesi profil yang sedang berjalan gagal pada permintaan berikutnya; profil lain di akun yang sama tetap bisa masuk | PF-02 |
| UP-11 | Profil kelima ditolak: lewat rute 409; lewat sisipan langsung ke D1 trigger `instansi_profil_maks` menolak; profil `dicabut` tidak dihitung; sisipan profil ke akun `polda` ditolak trigger `instansi_profil_jenis` | PF-01, PF-02 |
| UP-12 | Foto: PNG atau PDF ditolak 400; JPEG berisi EXIF tersimpan tanpa EXIF (cek byte di R2); lebih dari 2 MB ditolak; laju 21 unggah per jam ditolak; akun lain tidak bisa mengambil foto; berkas disajikan dengan `content-security-policy: sandbox` dan `cache-control: private, no-store` | PF-02 |
| UP-13 | Kirim ditolak 409 dan akun tetap `belum_klaim` bila: kurang dari 3 profil lengkap; salah satu dari tiga tanpa foto atau tanpa PIN; `surat` atau `kartu` belum ada. Pesan menyebut kekurangannya | PF-02 |
| UP-14 | PIN pertama bisa diatur sekali pada profil tanpa PIN; permintaan kedua pada profil yang sudah ber-PIN lewat rute yang sama ditolak 409 dan PIN lama tetap berlaku; PIN trivial (`123456`, `000000`, enam angka terakhir HP) ditolak | PF-02 |
| UP-15 | Kirim sukses (3 lengkap + surat + kartu): akun `menunggu`, `dikirim` terisi, kolom `nama`, `nip`, `jabatan`, `email`, `wa` sama dengan PIC pertama, `unit` sama dengan `wilayah` (CHECK tabel lolos); profil lengkap `menunggu`; sebelum disetujui PIN benar tidak menerbitkan sesi profil; setuju admin: akun `aktif` dan tiga profil `aktif`; tolak: akun `ditolak` dengan alasan, profil kembali `draf`, kirim ulang berhasil | PF-02, PF-06 |
| UP-16 | Atur ulang PIN admin: jawaban memuat PIN sementara 6 angka sekali; PIN lama gagal; PIN sementara berhasil tetapi sesi profil hanya boleh ke rute ganti PIN sampai PIN baru diatur; PIC lain (sesi profil) menerima 403 pada rute admin; log `reset_pin` memuat id admin; PIN sementara tidak ada di log, D1, atau jawaban lain Selama `pin_wajib_ganti = 1` sesi profil mendapat 403 `pin_wajib_ganti` di rute kerja instansi dan di `/api/lapor/meja` (`hakMeja`); hanya `gantipin`, `keluar`, dan `GET /profil` lolos; sesudah PIN baru semua rute terbuka | PF-04, PF-06 |
| UP-17 | Semua POST profil tanpa `x-pb: 1` ditolak 403; dengan `Origin` situs lain ditolak 403; `Origin` kosong tanpa `sec-fetch-site: same-origin` ditolak saat ada kuki `sesi_profil` | PF-02 |
| UP-18 | Staf verifikator wilayah lain menolak 403 pada setuju profil dan akun; staf wilayah sendiri boleh `setuju`, tidak boleh `reset_pin` atau `cabut` | PF-06 |
| UP-19 | Satu skenario penuh menulis baris log dengan `profil_id` yang benar untuk `pin_ok`, `pin_salah`, `kerja` (konfirmasi tugas), `meja` (balas laporan), `keluar`, `ganti_profil`; rute `kerja` mencatat pola rute dan id objek, bukan badan; pindai seluruh `instansi_profil_log` untuk PIN uji dan sandi uji: tidak ada | PF-04 |
| UP-20 | `UPDATE instansi_profil_log` ditolak trigger; `DELETE` baris berumur kurang dari 730 hari ditolak; `DELETE` baris berumur tiga tahun berhasil; `bersihkanInstansi` menghapus yang tua dan membiarkan yang muda Karena trigger memakai jam asli D1, uji menyisipkan baris log berumur tua langsung ke D1, bukan memajukan `kini` | PF-01, PF-04 |
| UP-21 | Meja: dengan sesi profil akun `pemprov` Sumatera Barat, daftar laporan hanya mencakup provinsi itu dan `pelaku` memuat "BPBD Provinsi Sumatera Barat" dan nama profil; akun `pemkab` hanya kabupatennya; tanpa sesi profil 403; sesi `/masuk` dengan nomor yang sama dengan `instansi_akun.wa` pemda tidak membuka meja; staf BNPB tetap penuh; `x-pb` wajib untuk non-GET | PF-04 |
| UP-22 | `/masuk`: nomor yang cocok dengan akun pemda tidak menghasilkan ruang instansi dan tidak ada sesi instansi; akun `polda` dengan nomor cocok tetap menghasilkan ruang (tidak ada regresi); anggota `mk_anggota` pemda yang sudah ada tidak membuka meja; undangan baru ke akun pemda ditolak | PF-04 |
| UP-23 | `PROFIL_KUNCI` kosong atau 31 karakter: rute PIN 503 dan tidak ada baris ditulis; `pin_sha` di D1 tidak memuat PIN dan berbeda untuk dua profil ber-PIN sama; mengganti `PROFIL_KUNCI` membuat PIN lama tidak cocok lagi | PF-02 |
| UP-24 | `gantiSandi`, `ubahAkun` aksi `reset` dan `cabut` menghapus seluruh `instansi_sesi_profil` akun itu; permintaan berikutnya dengan kuki lama 401 | PF-02 |
| UP-25 | Keluar profil menghapus baris sesi dan mengirim `Set-Cookie` penghapus di ketiga Path; sesi akun tetap; pilih profil lagi wajib PIN; keluar penuh mencabut keduanya | PF-02 |
| UP-26 | Migrasi dijalankan dua kali tanpa galat; tabel profil belum ada (migrasi dilewati di instans uji kedua): rute profil 503 berpesan migrasi, `masuk`, `saya`, dan rute kerja akun non-pemda tetap berjalan | PF-01 |
| UP-27 | `POST /verifikasi` untuk akun pemda 409; akun non-pemda tidak berubah: verifikasi lama, `akunAktif` tanpa sesi profil | PF-02 |
| UP-28 | Pembersihan menghapus sesi profil kedaluwarsa dan foto R2 profil `dicabut` yang lebih tua dari 30 hari, dan membiarkan yang lebih muda Baris sesi dan log berumur tua disisipkan langsung ke D1 (jam trigger asli) | PF-04 |
| UP-29 | Satu NIP atau satu email ganda di akun yang sama ditolak untuk profil tak dicabut; NIP yang sama di akun lain boleh; NIP milik profil `dicabut` boleh dipakai lagi | PF-02 |
| UP-30 | Profil keempat: akun `aktif` tiga profil, profil keempat dibuat lengkap, diajukan, tidak bisa dipakai masuk sebelum admin `setuju`; sesudah setuju bisa masuk | PF-02, PF-06 |
| UP-31 | Pengunci: satu IP menebak 5 salah pada profil A; IP kedua tetap bisa masuk dengan PIN benar pada profil A; profil lain di akun yang sama tidak terpengaruh; sepuluh salah dari IP berbeda dalam satu hari memasang `kunci_admin` (batas harian tetap per profil) dan hanya admin yang membukanya | PF-02 |
| UP-32 | Tiap rute POST `/api/instansi/*` non-admin yang terdaftar di `RUTE_ASLI` (termasuk rute profil) lewat `RUTE_INSTANSI`: tanpa `x-pb` ditolak 403 dan POST sukses di rute kerja menulis log `kerja`; sesi profil dengan `pin_wajib_ganti` ditolak di semua rute kecuali tiga pengecualian | PF-04 |
| UP-33 | Papan: jumlah PIC per baris sama dengan isi tabel uji (profil bukan `dicabut`, 0 sampai 4); status akun benar untuk tiap keadaan (`belum_ada`, `belum_klaim`, `menunggu`, `aktif_kurang`, `aktif`, `lama`, `ditolak`); `menunggu` benar bila akun atau satu profil menunggu; `terakhir_masuk` = maksimum profil; 38 baris provinsi ada di samping baris kab/kota; tamu dan non-staf 403; staf wilayah lain tidak melihat baris di luar wilayahnya; jawaban papan dan rincian tidak memuat NIP, email, atau HP penuh | PF-07 |
| UP-34 | Kirim ulang: menulis tepat satu baris `wa_antre` jenis `undang_pf` dengan `tujuan` dari `kontak_pemangku` kategori `bpbd` yang cocok wilayah akun; `kontak_id` dari wilayah lain 400; badan yang memuat nomor tidak dipakai; `pesan` tidak memuat sandi dan memuat username serta tautan `/instansi`; kirim kedua dalam satu jam 429; akun `dicabut` 409; staf wilayah lain 403; tanpa kontak berwa: jawaban `teks_salin` tanpa baris `wa_antre` | PF-07 |
| UP-35 | Ambil: profil BPBD wilayah laporan mengambil: satu baris `lapor_ambil`, satu baris riwayat "Diambil oleh ..." dengan `dari = ke`, status tiket tidak berubah, log `meja`; label "Ditangani: <nama>, <jabatan> BPBD <wilayah>" ada di daftar dan rincian; ulang oleh profil sama 200 tanpa riwayat ganda; profil lain 409 dengan label pertama; staf BNPB 403; laporan di luar wilayah 404; tiket `selesai` atau `tidak_valid` 409; pengambil `dicabut`: profil lain bisa mengambil; tanpa sesi profil 403; label tidak ada di jawaban lacak publik | PF-08 |
| UP-36 | Respons: untuk satu BPBD dengan enam laporan dan stempel yang disiapkan, median dan p90 dilihat dan ditangani sama dengan hitungan tangan (peringkat terdekat); laporan belum diambil masuk `belum_diambil`, bukan nol menit; BPBD dengan empat laporan: tanpa median dan p90, tulisan "belum cukup data"; laporan `tidak_valid` dan di luar 30 hari tidak ikut; BPBD dan tamu 403; jawaban tanpa nama PIC, nomor, dan peringkat | PF-08 |
| UP-37 | PIC di meja: hanya `hakMeja` jenis `bnpb`; BPBD 403; urutan menurut terakhir aktif di meja lalu kab sebelum provinsi; profil `menunggu`, `draf`, `dicabut`, dan akun non-pemda tidak muncul; nomor tersamar; `POST` mengembalikan nomor penuh dan menulis satu baris `lapor_akses` atas nama staf; kab tanpa PIC aktif mengembalikan `kontak_situs` bertanda "situs resmi"; profil di luar daftar PIC wilayah itu 404 | PF-09 |
| UP-38 | Buku kontak: `GET /api/kontak/admin/pic` hanya admin, nomor tersamar; jawaban pelapor (`src/lapor_kontak.js`, `src/lapor_info.js`) tidak berubah dan tidak memuat nomor PIC walau PIC aktif ada; pindai berkas `public/**` tidak menemukan nomor PIC uji | PF-09 |

## 2. Gerbang (`tests/agen/gerbang-profil.test.mjs`)

Tiap gerbang punya uji mode gagal (contoh pelanggaran harus tertangkap).

| No | Yang dijaga |
| --- | --- |
| GP-1 | Tidak ada `console.log` atau `console.error` yang memuat variabel `pin`, `sandi`, `token` di `src/profil*.js` |
| GP-2 | `src/profil*.js` tidak mengimpor `src/wa.js` dan tidak mengirim pesan WA |
| GP-3 | Migrasi profil hanya `CREATE ... IF NOT EXISTS`, tanpa `ALTER TABLE` pada tabel lain dan tanpa `DROP` |
| GP-4 | Akses D1 hanya di `src/hak.js` (gerbang `gerbang-d1` yang ada tetap hijau dan `src/profil*.js` tidak ada di daftar sisanya); kueri baru hanya lewat fungsi `pf*` di `src/hak.js`, dan `tests/agen/fixtures/d1-sisa.json` serta `d1-pindai.json` tidak naik |
| GP-5 | Tiap rute `/api/instansi/profil*` dan `/api/instansi/admin/profil*` di `RUTE_ASLI` dipanggil dari penangan yang memeriksa `akunMasuk`, `sesiProfilDari`, `modOK`, atau `modAtauStaf` |
| GP-6 | `public/instansi_profil.js` dan `public/admin/instansi_profil.js` tidak memakai `localStorage`, `sessionStorage`, atau `document.cookie` untuk PIN dan tidak menyalin nilai PIN ke atribut DOM atau URL |
| GP-7 | `public/instansi_profil.css` tanpa literal warna (`#...`, `rgb(`, `oklch(` di luar `var(`) dan tanpa `text-transform: uppercase` (gerbang token yang ada) |
| GP-8 | Teks undangan di `public/admin/instansi.js` tidak memuat "tugas api" dan "Pantau Bencana" dan memuat tiga langkah daftar PIC |
| GP-9 | `buatMassal` menyaring jenis pemda sebelum `slice` |
| GP-10 | `sesi_profil` ada di regex `tolakOrigin` di `src/worker.js` |
| GP-11 | `src/lapor_ai.js` `hakMeja` memanggil `sesiProfilDari` sebelum `sesiMasuk` |
| GP-12 | Tidak ada rute `POST /api/instansi/*` di `src/worker.js` atau `src/profil.js` yang didaftarkan di luar `RUTE_ASLI` (semua lewat pembungkus `RUTE_INSTANSI`, supaya log `kerja` dan `x-pb` berlaku) |
| GP-13 | `akunAktif`, `hakMeja`, dan pembungkus rute memeriksa `pin_wajib_ganti` dari hasil `sesiProfilDari` (pindai kode; mode gagal: pemeriksaan dihapus) |
| GP-14 | `src/lapor_kontak.js` dan `src/lapor_info.js` tidak mengimpor fungsi PIC (`pfPic*`); tidak ada nomor PIC di `public/data/**`; `public/lapor/meja.js` hanya memuat nomor PIC dari jawaban rute staf |
| GP-15 | Kode `undang-ulang` tidak memakai variabel sandi dan tidak menulis sandi ke `wa_antre`; `wa_antre` jenis `undang_pf` hanya ditulis lewat fungsi di `src/hak.js` |
| GP-16 | `/api/lapor/respons` dan `/api/lapor/meja/:nomor/pic` memanggil `hakMeja` dan menolak jenis selain `bnpb` |

## 3. Uji lokal oleh pemilik (L)

Server tinjau `http://localhost:8800` memakai kode dari folder kerja dan data, API, serta login dari produksi (`AGENTS.md` 3.8); tulisan lewat server ini mengenai produksi. Pemilik mengetik login sendiri.

| No | Cara | Tiket |
| --- | --- | --- |
| L-1 | Buka `http://localhost:8800/instansi`: masuk sebagai akun BPBD Sumatera Barat, buat sandi baru, daftarkan tiga PIC, atur PIN tiap PIC, kirim | PF-03 |
| L-2 | Sesudah setuju di `http://localhost:8800/admin/instansi`: ulang masuk, layar pilih profil tampil seperti layar tontonan, klik foto, isi PIN | PF-03, PF-06 |
| L-3 | Buka `http://localhost:8800/lapor/meja` dengan profil aktif: meja menampilkan laporan Sumatera Barat saja | PF-04 |
| L-4 | Layar admin: log menampilkan tindakan L-1 sampai L-3 atas nama profil | PF-06 |
| L-6 | `http://localhost:8800/admin/aktivasi`: baris provinsi, kolom PIC dan status akun, rincian profil, tombol kirim ulang (teks salin bila tanpa WA) | PF-07 |
| L-7 | `http://localhost:8800/lapor/meja`: ambil laporan, label penangan, bagian PIC BPBD bertombol tampilkan | PF-08, PF-09 |
| L-8 | `http://localhost:8800/admin/pimpinan`: kartu respons laporan warga; `http://localhost:8800/admin/kontak`: kolom PIC aktif | PF-08, PF-09 |
| L-5 | Lebar ponsel 375 px: kisi profil dan dialog PIN terbaca, tombol cukup besar, tidak ada gulir mendatar | PF-03 |

## 4. Uji produksi (P), dijalankan pemilik sesudah migrasi diterapkan

| No | Kriteria |
| --- | --- |
| P-1 | Migrasi profil diterapkan di D1 produksi dan `PROFIL_KUNCI` terisi; rute profil menjawab 401, bukan 503 |
| P-2 | Buat massal selesai: jumlah akun pemda sesuai bagian Masalah di `KEPUTUSAN-PROFIL.md` |
| P-3 | Satu akun uji dari awal sampai meja `/lapor/meja` jalan di produksi |
| P-4 | Tanda `pin_salah` dan kunci terlihat di log layar admin |
