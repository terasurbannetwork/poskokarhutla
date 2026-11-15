# KEPUTUSAN-ALUN: Alun-alun Terpadu

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah (diukur 15 Nov 2026)

Alun-alun adalah satu-satunya pintu tempat warga, relawan, dan petugas menulis kebutuhan dan kabar lapangan, tetapi isinya berhenti di forum:

- Utas tidak ditautkan ke kejadian mana pun. Enam modul sudah menjadi sumber Buku Besar Kejadian (`KT` di `src/hak.js:487`); alun-alun tidak.
- BPBD kabupaten tidak tahu ada utas "butuh bantuan" di wilayahnya. Tidak ada kotak masuk per akun instansi; pengingat `bantuan_terbuka` hanya untuk admin pusat (`src/pengingat.js:76`).
- BPBD tidak bisa menjawab sebagai BPBD. Balasan resmi hanya untuk moderator pusat (`src/alun.js:193`), dan cookie instansi tidak terkirim ke `/api/alun/*` (`src/instansi.js:106`).
- Pimpinan hanya melihat dua angka dan dua judul di Layar Pimpinan (`public/admin/pimpinan.js:112`). Tidak ada rekap per kabupaten, waktu respons, atau kabar warga yang belum tercatat resmi.
- Produksi berisi 0 utas, jadi semua angka di paket ini mulai dari nol.

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | "Gw mau semua orang bisa input." (15 Nov 2026) |
| K2 | "Gw mau sistem ini sempurna dan terintegrasi dan memberikan data tambahan kepada stakeholder dan BNPB dan kepala." (15 Nov 2026) |
| K3 | Halaman yang dibuka tanpa login: "alun alun" (KEPUTUSAN-MASUK K8). |
| K4 | Paket dokumen dulu, baru kode (AGENTS 3.7). Perintah "lanjut terus" 15 Nov 2026 sesudah Satu Pintu Masuk selesai. |
| K5 | Dari KEPUTUSAN-KETERPADUAN K1: satu Nomor Kejadian untuk semua modul. K2: tidak ada satu pintu WA masuk. K9: jejak per orang hanya untuk orangnya dan admin; pimpinan hanya angka agregat. |
| K6 | Dari OUTSTANDING F (15 Nov 2026), yang **tidak** dipilih pemilik: feed publik terkurasi, hub tukar data antarlembaga, daftar warga rentan. Paket ini tidak membangun ketiganya. |
| K7 | Tidak pernah menulis "aman"; tanpa data contoh; kepala kartu nama seksi tanpa kalimat kesimpulan (AGENTS 3.5). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Alun-alun menjadi sumber ketujuh Buku Besar Kejadian (`sumber = 'alun'`, `kode` = id utas) lewat mesin yang sudah ada: rute ingest modul dan `scripts/siklus/pasang.py`. Tanpa pencocok baru. | KEPUTUSAN-KETERPADUAN D1 dan D3: satu tempat kebenaran, satu mesin pencocok. |
| D2 | Hanya utas `butuh_bantuan` dan `info_lapangan` yang berstatus tampil, bukan contoh, dan berjenis bencana yang dikenal Buku Besar yang dikirim ke pencocok. `tanya`, `pengumuman`, dan bencana `umum` tidak. | Pertanyaan dan pengumuman bukan kejadian. |
| D3 | Utas alun-alun **tidak pernah membuat kejadian baru** dan tidak pernah mengubah fase kejadian. Ia hanya menempel ke kejadian yang sudah ada; yang tidak cocok tercatat sebagai "belum ada di Buku Besar". | Kiriman publik tanpa verifikasi tidak boleh melahirkan kejadian resmi. |
| D4 | Kode kabupaten dihitung saat ingest dari `kab4Dari(prov, kab)` (`src/siklus_kab.js:60`); tabel `alun_utas` tidak diubah. Form tulis menawarkan daftar kabupaten per provinsi supaya ejaannya cocok. | Tanpa `ALTER` pada tabel produksi; fungsi sudah dipakai meja kerja. |
| D5 | Kotak masuk alun-alun di `/instansi`: utas dalam wilayah akun, urut dari "butuh bantuan" terbuka paling lama. Rutenya di bawah `/api/instansi/alun` supaya cookie instansi terkirim. | Tidak ada kotak masuk umum; cookie instansi berpath `/instansi`. |
| D6 | Akun instansi boleh menjawab utas di wilayahnya sebagai lembaga dan mengubah status bantuan (terbuka, ditangani, selesai). Balasan itu bertanda nama lembaga. Dua pintu, satu fungsi: dari kotak masuk `/instansi`, dan dari halaman alun-alun bagi orang yang masuk lewat nomor dan terikat ke tepat satu akun instansi yang wilayahnya mencakup utas. | Memakai `alun_penulis.label` yang sudah ada (KEPUTUSAN-MASUK D22). |
| D7 | Utas "butuh bantuan" baru memberi tahu akun instansi wilayahnya lewat `kabarkan()` yang sudah ada (push dan email), sekali per utas. Tanpa WA. | Batas dan penghapus ganda sudah ada di `src/kabar.js`; nomor gerbang WA dipakai bersama laporan dan kode masuk. |
| D8 | Rekap dihitung pipeline, bukan kueri langsung saat layar dibuka: `scripts/siklus/alun_rekap.py` membaca lewat rute ingest dan menulis berkas privat. Layar membaca berkas itu. | Kuota baca D1 sudah terpakai 63 persen; statistik admin alun-alun sekarang memindai tabel. |
| D9 | Isi rekap hanya angka agregat per wilayah, jenis bencana, dan jenis utas, ditambah daftar judul utas publik. Tanpa nama penulis, nomor, atau jejak per orang. | K5 (KETERPADUAN K9). |
| D10 | "Topik" berarti pasangan jenis bencana dan jenis utas. Tidak ada pengelompokan teks otomatis. | Model tanpa uji balik tidak dibuat; angka harus bisa dicek. |
| D11 | Rekap tampil di Layar Pimpinan (`/admin/pimpinan`) dan dasbor pimpinan (`/bnpb/pimpinan`). Untuk Laporan Berkala, paket ini hanya menyediakan berkas angkanya; pemasangan ke perakit menunggu tiket LB karena perakitnya belum ada. | `scripts/berkala/` dan `src/laporan_berkala.js` belum ada (semua tiket LB berstatus belum). |
| D12 | Tidak ada tabel buku kejadian kedua, tidak ada skor gabungan, tidak ada label "aman", dan status bantuan tidak pernah menutup kejadian. | AGENTS 2.9 dan 2.11; K7. |
| D13 | Nomor migrasi diambil saat tiket dikerjakan. Migrasi hanya `CREATE INDEX IF NOT EXISTS` dan tabel samping. | Menghindari bentrok nomor; tabel produksi tidak diubah. |

## Pertanyaan terbuka

| No | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| Q1 | Rekap alun-alun boleh tampil ke publik sebagai angka per provinsi? | **[BAWAAN SEMENTARA]** tidak; hanya staf dan pimpinan. Pemilik menolak feed publik terkurasi (K6). |
| Q2 | Mitra berkunci API boleh menarik rekap agregat (`/api/v1`)? | **[BAWAAN SEMENTARA]** tidak. Ini yang dimaksud "stakeholder" di K2 bila pemilik menjawab ya. |
| Q3 | Pemberitahuan utas "butuh bantuan" ke BPBD cukup push dan email, atau juga WA keluar? | **[BAWAAN SEMENTARA]** push dan email saja. |
| Q4 | Batas "belum dijawab" berapa jam? | **[BAWAAN SEMENTARA]** 24 jam, sama dengan `bantuan_terbuka_24j` yang sudah ada. |
| Q5 | Kabar warga boleh menjadi sumber Cek Kabar Luar? | **[BAWAAN SEMENTARA]** tidak; KEPUTUSAN-CEK-KABAR Q3 menetapkan fase 1 hanya berita dan data alam. Paket ini hanya menyediakan daftar "belum ada di Buku Besar". |
| Q6 | Kiriman dari tamu tanpa akun ikut ditautkan ke kejadian? | **[BAWAAN SEMENTARA]** ya, tetapi dihitung terpisah dari kiriman terverifikasi di rekap. |
| Q7 | Siapa yang boleh menandai bantuan selesai? | **[BAWAAN SEMENTARA]** akun instansi wilayah itu dan moderator. Penulis utas hanya menandai balasan sebagai jawaban, seperti sekarang. |
| Q8 | Akun TNI dan Polri ikut menerima kotak masuk dan boleh menjawab? | **[BAWAAN SEMENTARA]** menerima dan boleh menjawab; mengubah status bantuan hanya pemprov, pemkab, pemkot (`JENIS_BPBD`, `src/siklus.js:24`). |
| Q9 | Pemilik yang menerapkan migrasi dan memeriksa rahasia `PIPA_TOKEN` untuk langkah baru di `siklus.yml`? | Pemilik, seperti migrasi lain. Tanpa itu tanda kejadian dan rekap kosong; forum tetap jalan. |

Q1 dan Q2 menentukan siapa di luar BNPB yang melihat data ini. Tiket AT-09 tidak dikerjakan sebelum pemilik menjawab keduanya.

## Yang belum dijawab paket ini

- Utas alun-alun produksi masih 0. Paket ini membangun salurannya; isinya bergantung pada orang masuk dan menulis.
- Laporan Berkala belum punya perakit, jadi angka alun-alun belum bisa masuk laporan ke Presiden sampai tiket LB berjalan.
- BPBD yang akunnya belum aktif tidak menerima kotak masuk. Itu bergantung pada aktivasi akun di paket Satu Pintu Masuk.
