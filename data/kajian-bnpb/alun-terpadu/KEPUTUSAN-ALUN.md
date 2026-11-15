# KEPUTUSAN-ALUN: Alun-alun Terpadu

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

Paket ini sudah diperiksa dua pemeriksa bersih pada 15 Nov 2026 (konsistensi terhadap kode, dan keamanan). Rancangan di bawah adalah versi sesudah temuan mereka.

## Masalah (diukur 15 Nov 2026)

Alun-alun adalah satu-satunya pintu tempat warga, relawan, dan petugas menulis kebutuhan dan kabar lapangan, tetapi isinya berhenti di forum:

- Utas tidak ditautkan ke kejadian mana pun. Enam modul sudah menjadi sumber Buku Besar Kejadian (`KT` di `src/hak.js`); alun-alun tidak.
- BPBD kabupaten tidak tahu ada utas "butuh bantuan" di wilayahnya. Tidak ada kotak masuk per akun instansi; pengingat `bantuan_terbuka` hanya untuk admin pusat (`src/pengingat.js`).
- BPBD tidak bisa menjawab sebagai BPBD. Balasan resmi hanya untuk moderator pusat, dan cookie instansi tidak terkirim ke `/api/alun/*`.
- Wilayah utas adalah teks bebas (`kab` 2 sampai 60 huruf), jadi "Bogor" dan "Kabupaten Bogor" tidak dianggap sama.
- Pimpinan hanya melihat dua angka dan dua judul di Layar Pimpinan.
- D1 produksi berisi 0 utas saat diukur dari sesi ini pada 15 Nov 2026; semua angka mulai dari nol.

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | "Gw mau semua orang bisa input." (15 Nov 2026, percakapan sesi) |
| K2 | "Gw mau sistem ini sempurna dan terintegrasi dan memberikan data tambahan kepada stakeholder dan BNPB dan kepala." (15 Nov 2026, percakapan sesi) |
| K3 | Halaman yang dibuka tanpa login: "alun alun" (KEPUTUSAN-MASUK K8). |
| K4 | Paket dokumen dulu, baru kode (AGENTS 3.7). Perintah "lanjut terus" 15 Nov 2026 sesudah Satu Pintu Masuk selesai (percakapan sesi). |
| K5 | Dari KEPUTUSAN-KETERPADUAN K1: satu Nomor Kejadian untuk semua modul. K2: tidak ada satu pintu WA masuk. K9: jejak per orang hanya untuk orangnya dan admin; pimpinan hanya angka agregat. |
| K6 | Dari OUTSTANDING F (15 Nov 2026), yang **tidak** dipilih pemilik: feed publik terkurasi, hub tukar data antarlembaga, daftar warga rentan. Paket ini tidak membangun ketiganya. |
| K7 | Tidak pernah menulis "aman"; tanpa data contoh; kepala kartu nama seksi tanpa kalimat kesimpulan (AGENTS 3.5). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Alun-alun menjadi sumber ketujuh Buku Besar Kejadian (`sumber = 'alun'`, `kode` = id utas) lewat rute ingest dan `scripts/siklus/pasang.py` yang ada, dengan **aturan khusus sumber ini** (D3). | KEPUTUSAN-KETERPADUAN D1 dan D3: satu tempat kebenaran, satu mesin pencocok. |
| D2 | Yang dikirim ke pencocok hanya utas `butuh_bantuan` dan `info_lapangan` yang berstatus `tampil` (bukan dilaporkan, bukan tersembunyi), bukan contoh, tidak ditandai tidak valid, berkabupaten baku, dan berjenis bencana yang dikenal Buku Besar. | Pertanyaan dan pengumuman bukan kejadian; kiriman yang sedang dipersoalkan tidak ditautkan. |
| D3 | Sumber `alun` **tidak pernah membuat kejadian**, tidak mengubah fase, tidak dihitung sebagai sumber untuk "siap verifikasi" atau keyakinan, dan boleh banyak utas per kejadian. Larangan membuat kejadian ditegakkan di dua tempat: pencocok dan rute ingest Worker (yang menolak aksi `baru` untuk sumber ini). | Kiriman publik tanpa verifikasi tidak boleh melahirkan atau menguatkan kejadian resmi; penjaga di pipeline saja tidak cukup karena rute Worker menerima aksi dari sumber mana pun. |
| D4 | Kabupaten utas menjadi baku: form memilih dari daftar, server menolak nama yang bukan kabupaten provinsi itu, dan kode kabupaten disimpan saat tulis di tabel samping `alun_wilayah`. Satu kode itu dipakai kotak masuk, pemberitahuan, pencocok, dan rekap. Koordinat tidak dipakai untuk menentukan wilayah. | Pemeriksa menemukan tiga pencocok nama yang berbeda; teks bebas bisa menyasarkan atau menyamarkan utas. Tabel `alun_utas` tidak diubah. |
| D5 | Kotak masuk alun-alun di `/instansi`: utas dalam wilayah akun, urut dari "butuh bantuan" terbuka paling lama. Rutenya di bawah `/api/instansi/alun` supaya cookie instansi terkirim. | Cookie instansi berpath `/instansi` dan `/api/instansi`. |
| D6 | Akun instansi (sesi `/instansi`) boleh menjawab utas di wilayahnya atas nama lembaga dan mengubah status bantuan. Balasan itu ditandai lewat tabel samping `alun_lembaga`, bukan kolom `petugas`. **Hanya lewat kotak masuk `/instansi`**; menjawab atas nama lembaga dari halaman publik dengan sesi nomor WhatsApp ditunda. | Pintu publik hanya satu faktor (nomor), dan anggota hasil undangan berantai tidak ditinjau staf. Lihat Q13. |
| D7 | Label lembaga hanya tampil pada balasan lembaga. Kiriman pribadi orang yang masuk hanya bertanda "Terverifikasi", tanpa nama lembaga. Ini mengubah perilaku PM-15 yang sekarang menempelkan label ke semua kiriman pemilik nomor akun. | Pemeriksa: label pada utas pribadi terbaca sebagai pernyataan lembaga. |
| D8 | Pemberitahuan push dan email ke akun instansi wilayah hanya untuk utas "butuh bantuan" dari orang yang **sudah masuk** dan berkabupaten baku. Kiriman tamu hanya tampil di kotak masuk. Isi pemberitahuan tanpa judul utas. Batas 3 per wilayah per jam dan 20 per akun per jam; lebihnya tidak dikirim. Tanpa WA. | Kiriman tamu tidak boleh menjadi saluran push dan email resmi; kuota email dipakai bersama kabar darurat; judul buatan publik bisa dipakai menipu. Lihat Q10. |
| D9 | Akun instansi bisa menandai utas "tidak valid" (tabel samping `alun_tanda`). Utas bertanda itu keluar dari rekap, tidak ditautkan, dan masuk antrean moderator. Tanda ini tidak menyembunyikan utas. | Tanpa ini, spam hanya bisa ditutup dengan "selesai", yang mencemari riwayat dan ukuran waktu respons. |
| D10 | Status bantuan: terbuka, ditangani, selesai. Menutup wajib memilih satu alasan baku; catatan bebas hanya terlihat staf dan moderator. Pelapor bisa menyatakan "belum selesai" dalam 14 hari, yang membuka lagi utasnya. Tiap perubahan, termasuk oleh moderator dan oleh fitur Teruskan, menulis riwayat. | Catatan publik bebas bisa memuat data pribadi; pelapor butuh suara saat kebutuhannya ditutup. |
| D11 | Riwayat status append-only lewat kode dan gerbang, tanpa trigger. Menghapus utas oleh moderator menghapus riwayat, tanda, wilayah, dan tautan kejadiannya. | `dl_tindak` yang ditiru tidak memakai trigger; trigger yang menolak akan menggagalkan penghapusan data pribadi. |
| D12 | Menyembunyikan atau menghapus utas mencabut tautan kejadiannya saat itu juga, di Worker. Utas ambigu dari sumber ini hanya berstatus ambigu dan tidak masuk antrean tinjau staf. | Kabar bohong yang sempat tertaut tidak boleh tertaut selamanya; antrean staf tidak boleh dibanjiri kiriman publik. |
| D13 | Rekap dihitung pipeline (`scripts/siklus/alun_rekap.py`) dari rute ingest dan ditulis ke gudang privat di bawah `siklus/saji/alun/`. Layar membaca berkas itu. | Kuota baca D1 sudah terpakai 63 persen; gudang hanya menerima kunci di bawah `siklus/`. |
| D14 | Isi rekap hanya hitungan per wilayah, jenis bencana, dan jenis utas. Tanpa judul utas, nama, nomor, atau jejak per orang. Angka utama hanya dari kiriman terverifikasi berstatus tampil; kiriman tamu ditampilkan sebagai baris terpisah. | K5 (KETERPADUAN K9); judul bisa memuat data pribadi; angka tidak boleh bisa digembungkan tamu. |
| D15 | "Topik" berarti pasangan jenis bencana dan jenis utas. Tidak ada pengelompokan teks otomatis, skor, atau peringkat kinerja. | Model tanpa uji balik tidak dibuat; angka harus bisa dicek. |
| D16 | Rekap tampil di Layar Pimpinan (`/admin/pimpinan`) untuk admin, dan lewat rute rekap untuk staf berperan pimpinan, koordalops, dan pusdalops (rincian tersaring wilayah staf). Tidak di rute yang juga dibuka pemirsa. | `pb_ringkas` dibuka untuk pemirsa; bawaan Q1 dan Q2 melarang pihak luar. Lihat Q11. |
| D17 | Tidak ada tabel buku kejadian kedua, tidak ada skor gabungan, tidak ada label "aman", dan status bantuan tidak pernah menutup kejadian. | AGENTS 2.9 dan 2.11; K7. |
| D18 | Nomor migrasi diambil saat tiket dikerjakan. Migrasi hanya `CREATE TABLE` dan `CREATE INDEX` berpenjaga `IF NOT EXISTS`. | Menghindari bentrok nomor; tabel produksi tidak diubah. |

## Pertanyaan terbuka

| No | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| Q1 | Rekap alun-alun boleh tampil ke publik sebagai angka per provinsi? | **[BAWAAN SEMENTARA]** tidak; pemilik menolak feed publik terkurasi (K6). |
| Q2 | Mitra berkunci API boleh menarik rekap agregat (`/api/v1`)? | **[BAWAAN SEMENTARA]** tidak. Ini yang dimaksud "stakeholder" di K2 bila pemilik menjawab ya. |
| Q3 | Pemberitahuan ke BPBD juga lewat WA keluar? | **[BAWAAN SEMENTARA]** tidak; push dan email saja. |
| Q4 | Batas "lama tak terjawab" berapa jam? | **[BAWAAN SEMENTARA]** 24 jam tanpa balasan resmi. Ini ukuran baru; `bantuan_terbuka_24j` yang ada hanya melihat umur utas terbuka. |
| Q5 | Kabar warga boleh menjadi sumber Cek Kabar Luar? | **[BAWAAN SEMENTARA]** tidak; KEPUTUSAN-CEK-KABAR Q3 menetapkan fase 1 hanya berita dan data alam. |
| Q6 | Kiriman tamu tanpa akun ikut ditautkan ke kejadian? | **[BAWAAN SEMENTARA]** ya, tetapi tidak memicu pemberitahuan dan dihitung terpisah di rekap. |
| Q7 | Siapa yang boleh menutup kebutuhan? | **[BAWAAN SEMENTARA]** akun instansi wilayah itu dan moderator; pelapor bisa membuka lagi dalam 14 hari. |
| Q8 | Akun TNI dan Polri ikut menerima kotak masuk dan boleh menjawab? | **[BAWAAN SEMENTARA]** menerima dan boleh menjawab; mengubah status bantuan hanya pemprov, pemkab, pemkot (`JENIS_BPBD`, `src/siklus.js`). |
| Q9 | Pemilik yang menerapkan migrasi dan memeriksa rahasia `PIPA_TOKEN` untuk langkah baru di `siklus.yml`? | Pemilik, seperti migrasi lain. Tanpa itu tanda kejadian dan rekap kosong; forum tetap jalan. |
| Q10 | Akun pemerintah daerah boleh menerima push dan email otomatis tentang kebutuhan warga (D8)? | **[BAWAAN SEMENTARA]** ya, hanya untuk kiriman terverifikasi. AT-08 tidak dikerjakan sebelum pemilik menjawab. |
| Q11 | Pemirsa (akun hanya-lihat, termasuk pihak luar) boleh melihat angka alun-alun di dasbor pimpinan `/bnpb/pimpinan`? | **[BAWAAN SEMENTARA]** tidak; angka hanya di Layar Pimpinan dan rute rekap staf. |
| Q12 | Angka alun-alun boleh masuk Laporan Berkala kepada Presiden? | **[BAWAAN SEMENTARA]** tidak. Paket ini tidak menyiapkan berkas untuk perakit Laporan Berkala; KEPUTUSAN-BERKALA D4, D5, dan Q22 belum menjawab sumber kiriman warga. |
| Q13 | BPBD boleh menjawab atas nama lembaga dan mengubah status kebutuhan warga (D6, D10)? Dan nanti boleh dari halaman publik dengan sesi nomor WhatsApp? | **[BAWAAN SEMENTARA]** ya lewat kotak masuk `/instansi`; tidak dari halaman publik. AT-06 dan AT-07 tidak dikerjakan sebelum pemilik menjawab bagian pertama. |

Q1, Q2, Q11, dan Q12 menentukan siapa di luar pelaksana yang melihat data ini. Q10 dan Q13 adalah kebijakan, bukan sekadar rancangan.

## Yang belum dijawab paket ini

- Utas alun-alun produksi masih 0. Paket ini membangun salurannya; isinya bergantung pada orang masuk dan menulis.
- "Data tambahan untuk stakeholder" (K2) baru terjawab untuk pimpinan internal. Untuk pihak luar dan Presiden, jawabannya menunggu Q1, Q2, Q11, dan Q12.
- BPBD yang akunnya belum aktif tidak menerima kotak masuk. Itu bergantung pada aktivasi akun di paket Satu Pintu Masuk.
- Menjawab atas nama lembaga dari halaman publik ditunda (D6).
