# KEPUTUSAN-MASUK: Satu Pintu Masuk (nomor WA dan kode sekali pakai)

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah (diukur 15 Nov 2026 di D1 produksi)

Sistem lengkap di kode tetapi hampir tanpa pemakai.

| Yang diukur | Jumlah |
| --- | --- |
| Akun staf | 3 |
| Akun pemirsa | 4 |
| Akun instansi, pendataan, kampus | 0 |
| Register `orang`, relawan, kontak pemangku | 0 |
| Utas alun-alun, laporan warga, catatan meja, logbook, korban, rumah rusak | 0 |
| `tugas_api` dan `sk_kejadian` (dibuat mesin) | 2.422 dan 42 |

Penyebabnya ada di pintu, bukan di fitur (rinci di `RISET.md`):

- Halaman depan `/` dan `/alun-alun` dialihkan ke `/admin/masuk`. Forum yang dirancang publik tidak bisa dibuka warga.
- Ada tujuh sistem sesi terpisah dan sekitar delapan keluarga kode tautan. Tidak ada yang menyatukannya.
- Staf dan pemirsa hanya bisa dibuat Super Admin. Instansi, pendataan, dan kampus menunggu persetujuan admin.
- Tidak ada lupa sandi, kode sekali pakai, atau cara masuk lain. Sandi staf dan instansi acak dan tampil sekali.

## Keputusan pemilik (15 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | "Gw mau semua orang bisa input." |
| K2 | "Gw mau semua orang bisa login dengan mudah." |
| K3 | "Gw mau sistem ini sempurna dan terintegrasi dan memberikan data tambahan kepada stakeholder dan BNPB dan kepala." |
| K4 | Paket dokumen Satu Pintu Masuk (login WA dan OTP) disusun dulu, baru kode: "Ya, susun paket". |
| K5 | Dari OUTSTANDING E1 (5 Nov 2026): satu akun lewat nomor WA dan OTP; tabel akun lama dipetakan ke satu identitas dan peran. |
| K6 | Dari OUTSTANDING E2 (5 Nov 2026): papan aktivasi 514 kab/kota dengan tombol undangan WA. |
| K7 | Dari KEPUTUSAN-KETERPADUAN K2: tidak ada satu pintu WA masuk. Paket ini hanya mengirim WA keluar; tidak membaca balasan. |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satu halaman `/masuk` untuk semua peran. Orang mengetik nomor WA, menerima kode enam angka, lalu masuk. | K2. Satu hal yang diingat orang: nomornya sendiri. |
| D2 | Kode yang sah menerbitkan **sesi lama** tiap akun peran yang berhak dimasuki nomor itu (`sesi_instansi`, `sesi_pendataan`, `sesi_kemitraan`; `sesi_staf` sesudah sandi). Tidak ada sistem sesi kedelapan untuk peran. | Semua penjaga hak yang ada (`src/hak.js`, penjaga tiap modul) tetap berlaku tanpa disentuh. Perubahan paling kecil yang menyelesaikan masalah. |
| D3 | Cara masuk lama (username dan sandi, kode tautan, token) tetap hidup. Paket ini menambah pintu, tidak menutup pintu. | KEPUTUSAN-KETERPADUAN D12 tidak dilanggar; orang yang sudah terbiasa tidak terganggu. |
| D4 | Akun yang boleh dimasuki harus terikat langsung ke nomor yang baru dibuktikan: kolom `wa` akun itu sama persis, atau orangnya anggota aktif akun itu (`mk_anggota`). Tidak pernah dari nama, dan tidak lewat `orang_akun`. | Pemetaan tidak langsung bisa basi dan membuka akun bernomor lain. `orang_akun` tetap milik paket keterpaduan untuk jejak per orang, bukan untuk masuk. |
| D5 | Nomor yang belum dikenal membuat **akun umum** (`mk_akun`): nama, provinsi, kabupaten atau kota. Akun umum bisa menulis di alun-alun dan melihat kirimannya sendiri. | K1 dan K2: warga dan pendaftar baru punya identitas tanpa menunggu siapa pun. |
| D6 | Orang **langsung aktif sebagai anggota** sebuah akun lembaga yang sudah aktif bila salah satu terpenuhi: (a) nomornya ada di `kontak_pemangku` berstatus aktif dengan kategori dan wilayah yang cocok; (b) diundang oleh anggota aktif akun itu atau oleh staf; (c) lolos kode sekali pakai ke email yang domainnya sudah dipetakan admin ke lembaga dan wilayah itu (`mk_domain`). Selain itu masuk antrean tinjau seperti sekarang. Akhiran umum seperti `.go.id` atau `.ac.id` saja tidak pernah cukup. | Persetujuan admin adalah hambatan terbesar; tiga jalur ini memakai bukti yang sudah dipegang sistem. NIP tidak dipakai sebagai bukti karena bisa diketik siapa pun. Domain umum ditolak karena pemilik satu kotak surel dinas mana pun bisa mengaku kabupaten mana pun. |
| D7 | Anggota aktif boleh mengundang orang lain ke akun lembaganya (undangan berantai). Undangan tidak pernah membuat akun staf dan tidak pernah membuat akun lembaga baru. | Kepala pelaksana BPBD mengisi timnya sendiri; pusat tidak jadi leher botol 514 kabupaten. Staf tetap hanya dibuat Super Admin (`src/staf.js:2`). |
| D8 | Kode sekali pakai lewat WA **tidak cukup** untuk akun staf. Semua akun `staf` wajib sandi sesudah kode, dan sandi staf tidak bisa diatur ulang lewat pintu ini. Akun rahasia (`ADMIN_TOKEN`, `AKUN_SITUS_*`, Super Admin) tidak bisa masuk lewat kode. | Gerbang WA memakai pustaka tidak resmi di satu Mac mini; nomor bisa diambil alih lewat ganti kartu. Peran staf hanya label dan hampir semuanya membaca data luas, jadi tidak ada peran staf yang aman dengan satu faktor. |
| D15 | Akun instansi tetap satu per lembaga dan wilayah (`migrations/0029_instansi.sql:37`). Banyak orang masuk ke akun yang sama lewat tabel anggota `mk_anggota`; tiap masuk dicatat per orang (`mk_masuk_log`). Akun kampus tetap dibuat lewat alur yang ada; pintu ini hanya memasukkan akun kampus yang sudah aktif. | Skema lama hanya punya satu nomor per akun; tim butuh banyak orang tanpa mengubah tabel produksi. |
| D16 | Aktivasi **pertama** sebuah akun instansi tetap memakai verifikasi yang ada (surat tugas dan kartu, CHECK `0029:39-40`). Permohonan yang nomornya cocok kontak pemangku naik ke atas antrean tinjau dengan tanda "cocok kontak". | Aktif otomatis untuk akun baru akan melanggar CHECK itu atau memaksa bukti palsu. Dikukuhkan pemilik di K11. |
| D9 | Kode dikirim lewat `wa_antre` yang sudah ada (jenis baru `otp`). Isi pesan dihapus begitu terkirim atau sesudah lima menit. | Satu jalur kirim; kode tidak tinggal di D1. |
| D10 | Cadangan saat gerbang WA mati: kode ke email lewat Resend, hanya untuk akun yang punya email. Aktif sesudah domain pengirim diverifikasi. | Gerbang WA adalah satu titik gagal. |
| D11 | Lupa sandi akun non-staf diselesaikan oleh pintu ini: masuk dengan kode, lalu atur sandi baru. Sandi staf tetap diatur ulang Super Admin. | Satu mekanisme untuk dua kebutuhan. |
| D12 | Papan aktivasi (K6) memakai data yang sama: per kab/kota tampil jumlah akun aktif, terakhir masuk, dan tombol undang dari `kontak_pemangku`. | Tanpa tabel baru selain catatan undangan. |
| D13 | Nomor migrasi diambil saat tiket dikerjakan, sesudah paket lain yang sudah memesan nomor (paritas-bencana 0130 dan 0131, keterpaduan). Dokumen ini menyebut migrasi dengan nama. | Menghindari bentrok nomor antarpaket. |
| D14 | Integrasi alun-alun (lencana terverifikasi, tautan ke nomor kejadian, antrean BPBD kabupaten, rekap untuk Kepala) **di luar paket ini** dan mendapat paketnya sendiri sesudah pintu ini jalan. | K3 butuh orang masuk dulu; satu paket satu masalah. |

## Jawaban pemilik atas Q1, Q5, Q7, Q9, Q10 (15 Nov 2026)

| No | Pertanyaan | Jawaban pemilik |
| --- | --- | --- |
| K8 (Q1) | Halaman mana yang dibuka tanpa login? | **"alun alun"**. Yang dibuka: `/alun-alun`, dan `/masuk` karena pintu itu sendiri harus bisa dibuka. Daftar relawan dan peta utama `/` tetap terkunci. |
| K9 (Q5) | Nomor WA gerbang untuk kode sama dengan nomor bot laporan? | **"Sama"**. Risiko yang diterima: bila nomor itu diblokir WhatsApp, laporan harian dan kode masuk mati bersamaan; cadangannya email dan pintu sandi. |
| K10 (Q10) | Anggota boleh aktif tanpa persetujuan admin lewat kontak pemangku dan undangan berantai? | **"Ya"**. |
| K11 (Q9) | Syarat surat tugas dan kartu untuk aktivasi pertama akun instansi boleh diganti kecocokan kontak? | **"Tidak"**. Verifikasi yang ada tetap (D16). |
| K12 (Q7) | Pemirsa ikut bisa masuk lewat kode? | **"Gas"**. Pemirsa ikut. |

Turunan rancangan dari K12 (agent, bisa dibatalkan pemilik):

| No | Keputusan | Alasan |
| --- | --- | --- |
| D17 | Nomor WA pemirsa disimpan di tabel samping `mk_pemirsa_wa (pemirsa_id, wa)` dan diisi Super Admin, yang memang membuat akun pemirsa. Kode yang sah menerbitkan `sesi_pemirsa` lewat fungsi modul pemirsa. Pemirsa cukup dengan kode, tanpa sandi. | Tabel `pemirsa` tidak punya kolom nomor dan tidak diubah. Pemirsa hanya membaca tab yang ditentukan, jadi satu faktor diterima; kalau pemilik mau sandi juga, D17 diganti. |

## Pertanyaan terbuka (masih bawaan sementara)

| No | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| Q2 | Adakah peran staf yang boleh masuk hanya dengan kode, tanpa sandi? | **[BAWAAN SEMENTARA]** tidak ada; semua staf wajib sandi sesudah kode (D8). Dikecualikan hanya sesudah pemilik menyebut perannya. |
| Q3 | Siapa yang mengisi peta domain email ke lembaga dan wilayah (`mk_domain`)? | **[BAWAAN SEMENTARA]** admin, satu per satu saat ada permohonan; tabel mulai kosong. |
| Q4 | Tulisan akun yang belum terverifikasi lembaganya tampil langsung atau ditahan? | **[BAWAAN SEMENTARA]** tampil dengan label "belum terverifikasi" di alun-alun; isian modul instansi ditahan sampai akun aktif. |
| Q6 | Berapa lama sesi dari kode berlaku? | **[BAWAAN SEMENTARA]** sama dengan sesi tiap peran sekarang (staf, instansi, pendataan 30 hari; kampus 12 jam); akun umum 30 hari. |
| Q8 | Siapa yang menerapkan migrasi dan mengisi rahasia `MASUK_KUNCI`? | Pemilik, seperti migrasi lain. Tanpa itu `/masuk` menjawab 503 dan pintu lama tetap jalan. |

Tidak ada pertanyaan terbuka yang menahan tiket. Bawaan sementara yang tersisa: Q2, Q3, Q4, Q6.

## Yang belum dijawab paket ini

- K1 ("semua orang bisa input") baru terjawab sebagian: orang bisa masuk dan menulis di alun-alun. Isian modul lembaga tetap butuh akun lembaga yang aktif.
- K3 (data tambahan untuk stakeholder, BNPB, dan Kepala) belum disentuh; itu isi paket lanjutan D14.
- Daerah yang akun instansinya belum pernah aktif tetap menunggu verifikasi pertama (D16, K11). Paket ini mempercepat anggota kedua dan seterusnya, bukan yang pertama.
