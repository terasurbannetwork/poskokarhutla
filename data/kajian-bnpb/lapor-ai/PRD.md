# PRD: Lapor Bencana BNPB (chatbot AI, pintu WA dan web)

## Tujuan

Pelapor menceritakan kejadian dengan bahasa sehari-hari, AI menuntun sampai isian laporan awal lengkap sesuai standar, dan laporan baku tersusun tanpa diketik ulang, dengan foto bertanda lokasi dan waktu.

## Pengguna

| Peran | Fase | Bisa |
| --- | --- | --- |
| Pelapor uji | F0 | Melapor lewat WA dan web, melihat laporannya sendiri, melanjutkan draf di pintu mana pun |
| Pemilik | F0 | Menerima tiap laporan jadi, mengatur izin uji dan peran lewat perintah WA, membaca semua laporan di layar staf |
| Petugas BPBD | F1 | Seperti pelapor; laporannya bertingkat sumber `bpbd` dan bisa didorong ke meja `dampak` |
| Pusdalops dan pimpinan | F1 | Membaca laporan, meminta verifikasi ke BPBD |
| Warga umum | F2 | Seperti pelapor; laporan selalu belum terverifikasi |

## Fitur

| F | Fitur | Fase |
| --- | --- | --- |
| F-0 | Identitas di awal: Warga atau Petugas BPBD, nama, (BPBD) kab/kota dan jabatan; diingat per nomor | F0 |
| F-1 | Mulai laporan dengan cerita bebas di WA atau web; kata `lapor` juga membuka laporan baru | F0 |
| F-2 | AI mengurai cerita jadi isian berkutipan; angka tanpa kutipan ditolak | F0 |
| F-3 | Pertanyaan satu per satu untuk isian berikutnya yang dipilih kode, bahasa sehari-hari | F0 |
| F-4 | Pilihan jenis dan subjenis bernomor (WA) atau tombol (web) dari tebakan AI | F0 |
| F-5 | Lokasi: Bagikan lokasi WA, GPS perangkat di web, atau nama desa yang dicocokkan ke kode wilayah | F0 |
| F-6 | Foto lewat chat WA bertanda waktu dan lokasi WA; foto Dokumen diperiksa EXIF; tautan kamera web untuk lencana GPS perangkat (aturan foto publik, K5) | F0 |
| F-7 | Jawaban "belum tahu" dan "tidak ada" dibedakan (belum didata lawan nihil) | F0 |
| F-8 | Ringkasan sebelum kirim; pelapor bisa membetulkan dengan kalimat biasa | F0 |
| F-9 | Laporan baku: teks WA rapi, halaman laporan `/lapor/l/<nomor>`, JSON berskema; nomor `LA-DDMMYY-NN` | F0 |
| F-9a | PDF A4 langsung jadi untuk tiap laporan dan tiap versi perkembangan, dikirim ke pelapor di WA dan tersimpan (K8, D21) | F0 |
| F-9b | Tiket langsung jadi untuk tiap laporan, status dan riwayat append-only, kabar status ke pelapor (K8, D20) | F0 |
| F-10 | Penerusan laporan jadi ke PEMILIK (F0) | F0 |
| F-11 | Monitoring `/lapor/meja` tab Daftar: siapa melapor, nomor WA, peran, laporan apa, status tiket; rincian isian dengan jejak asal, transkrip, PDF (K7) | F0 |
| F-11a | Dashboard tab Peta: titik laporan per status tiket dan jenis, filter, pop-up (K9) | F0 |
| F-11b | Tab Foto: galeri meniru galeri foto publik, lencana lokasi (K10) | F0 |
| F-11c | Ubah status tiket dan catatan staf; konfirmasi peran BPBD | F0 |
| F-12 | Laporan perkembangan: `update LA-...` menambah data ke laporan yang sama | F0 |
| F-13 | Masuk Buku Besar Kejadian sebagai sumber `lapor_ai` | F1 |
| F-14 | Dorong laporan BPBD ke meja `dampak` berstatus `dilaporkan` | F1 |
| F-15 | Minta verifikasi dua arah ke BPBD | F1 |
| F-16 | Penerusan ke BPBD, Pusdalops, pimpinan | F1 |
| F-17 | Pintu publik untuk warga luas | F2 |

## Persyaratan mutu

- Laporan awal (tiga kelompok wajib) bisa selesai dalam 5 menit dan paling banyak 8 balasan pelapor untuk cerita yang wajar.
- Balasan bot di web muncul paling lama 6 detik (median 3 detik); di WA mengikuti jeda limiter percakapan.
- Tidak ada angka di laporan yang tidak bisa ditelusuri ke kutipan pesan pelapor atau ke sistem (jejak asal tiap isian).
- Halaman web nyaman di layar 360 px sampai layar lebar, bisa dipakai satu tangan, tanpa geser horizontal.
- Tetap jalan tanpa AI (Q2): pertanyaan templat, pilihan bernomor, uraian angka dengan pola sederhana.

## Larangan

- Tidak menulis "aman", tidak memberi saran keselamatan buatan AI. Bila pelapor menyebut keadaan darurat jiwa, bot memberi nomor darurat 112 dan BPBD setempat (templat tetap, bukan karangan AI), lalu melanjutkan laporan.
- Tidak membuat kejadian resmi, tidak mengubah status atau fase kejadian, tidak menutup kejadian.
- Tidak menampilkan laporan atau foto di halaman publik.
- Tidak menyimpan nama korban atau NIK. Nomor WA dan nama pelapor hanya terlihat di monitoring staf (D12).
- Tidak ada data dummy dan tidak ada tombol isi contoh (aturan pemilik 11 Nov 2026).

---

## Lanjutan 19 Nov 2026: fitur F-18 sampai F-29

| F | Fitur | Fase | Keputusan |
| --- | --- | --- | --- |
| F-18 | Tombol Minta verifikasi di rincian laporan meja; kirim tautan bertoken ke kontak BPBD terdaftar kab itu (F0: ke PEMILIK saja) | F0 uji, F1 | K31, D23, D25 |
| F-19 | Halaman `/lapor/v/<token>` untuk BPBD: ringkasan laporan tanpa data pelapor, jawaban Benar, Sebagian benar (koreksi), Tidak ditemukan, nama dan jabatan penjawab | F1 | D23, D26 |
| F-20 | Hasil verifikasi tampil di rincian laporan, daftar (kolom Verifikasi), dan PDF; riwayat append-only; tidak mengubah isi laporan atau status tiket | F1 | D24 |
| F-21 | Gugus laporan otomatis: laporan terkirim berdekatan, jenis sama, dalam jendela jam dihimpun jadi satu gugus `GL-DDMMYY-NN` | F0 | K33, D27, D30 |
| F-22 | Kartu gugus di meja: lingkaran di peta, baris di Daftar, rincian anggota dengan angka berdampingan dan rentang (tidak dijumlah) | F0 | D28 |
| F-23 | Gugus menempel ke Buku Besar sebagai rekaman `lapor_ai` (menempel saja) | F1 | D29, Q19 |
| F-24 | Persetujuan dikabari (opt-in) sesudah laporan pertama terkirim; `berhenti kabar` | F0 | K32, D32 |
| F-25 | Kabar balik dari peringatan BMKG (nowcast) ke pelapor setuju yang lokasinya di wilayah peringatan; teks tetap berisi peringatan resmi | F1 | D31, D33 |
| F-26 | Kabar balik dari gugus: staf menekan Kabari sekitar sesudah melihat penerima dan teks | F1 | D31, Q22 |
| F-27 | Mode Tanya: tanya bebas di WA dan web, jawaban dirakit dari butir `edukasi.json` dengan sumber tertaut, pengalihan untuk pertanyaan lokasi dan keadaan sekarang | F0 pengguna uji, F2 publik | K34, D34, D35 |
| F-28 | Laporan susulan: tambah kabar ke tiket yang sama, versi baru, PDF baru, ringkasan perubahan, penanda "ada susulan" di meja | F0 | K35, D36, D37 |
| F-29 | Laporan lewat pesan suara (transkripsi, konfirmasi, uraian) dan lewat foto saja (memulai sesi) | F0 foto saja, suara menurut LA-29 | K36, D38, D39 |

F-15 (minta verifikasi dua arah) digantikan F-18 sampai F-20.

### Persyaratan mutu tambahan

- Gugus dihitung paling lama 2 detik sesudah laporan terkirim dan tidak menahan balasan ke pelapor (dihitung di rute kirim sesudah batch, atau malas saat meja dibuka bila gagal).
- Kabar BMKG sampai ke pelapor paling lama 15 menit sesudah peringatan masuk ke `peringatan.json` yang dibaca gateway (angka target F1, diukur).
- Jawaban Mode Tanya paling lama 6 detik di web; 100 persen kalimat jawaban berasal dari butir `edukasi.json` dengan tautan sumber.
- Transkrip suara 90 detik selesai paling lama 60 detik di Mac mini (diukur di LA-29; bila lebih lambat, pelapor diberi tahu "sedang diproses").
- Susulan tidak pernah menghapus nilai versi sebelumnya; setiap angka yang berubah punya kutipan dan nomor versi.

### Larangan tambahan

- Kabar balik tidak memuat isi laporan warga, nama, atau nomor siapa pun; hanya jumlah laporan (pemicu gugus) atau teks peringatan resmi BMKG.
- Kabar balik dan jawaban Mode Tanya tidak menulis "aman" dan tidak memberi saran keselamatan buatan sistem; yang dikutip hanyalah teks sumber resmi.
- Verifikasi BPBD, gugus, dan susulan tidak pernah membuat atau menutup kejadian resmi, tidak mengubah fase, dan tidak membuat laporan warga tampil publik.
- Audio tidak disimpan sesudah transkripsi (bawaan Q25).

---

## Lanjutan 19 Nov 2026 (bagian 2): fitur F-30 sampai F-39

| F | Fitur | Fase | Keputusan |
| --- | --- | --- | --- |
| F-30 | Mode luring: Laporan cepat tersimpan di HP lewat `public/inti/antre.js` dan terkirim otomatis saat tersambung; pita "belum terkirim" | F0 | K37, D41 sampai D45 |
| F-31 | Foto luring membawa GPS dan waktu saat ambil, berlencana "GPS perangkat, luring" | F0 | D44 |
| F-32 | Penilaian foto otomatis: buram, lama, sama dengan foto laporan lain; lencana tambahan untuk staf; tanpa penolakan | F0 | K38, D46 sampai D48 |
| F-33 | Relevansi foto dengan jenis bencana (model penglihatan) dan pencarian balik internet | F2, hanya bila Q29 ya | D48, D49 |
| F-34 | Ringkasan harian laporan warga per provinsi dan jenis, arsip append-only, tab Ringkasan, tombol Salin teks, salinan ke PEMILIK | F0 | K39, D50, D51 |
| F-35 | Penugasan tiket ke staf atau kontak BPBD dengan tenggat, riwayat, pengingat WA | F0 staf, F1 BPBD | K40, D52 sampai D54 |
| F-36 | Penanda merah lewat tenggat tanpa tindakan di meja; filter Lewat tenggat | F0 | D53 |
| F-37 | Lapisan "Laporan warga (sinyal awal)" di peta utama bagi sesi staf | F0 | K41, D55 |
| F-38 | Pembanding laporan warga lawan prediksi di `/prediksi` bagi sesi staf, tabel hitung tanpa skor gabungan | F0 | D56 |
| F-39 | Draf permintaan LogPal dari kebutuhan mendesak laporan, tampil di `/instansi/logpal` sebagai draf bagi BPBD kab itu | F1 | K42, D57, D58 |

### Persyaratan mutu tambahan (bagian 2)

- Laporan cepat luring selesai diisi di bawah 90 detik oleh pengguna yang sudah tahu jenis dan lokasinya, dan satu laporan terkirim paling lama 60 detik sesudah sinyal pulih dengan halaman terbuka.
- Penilaian satu foto selesai di Mac mini paling lama 20 detik; laporan dan galeri tidak menunggunya (lencana tambahan muncul menyusul).
- Ringkasan harian selesai paling lama 5 menit sesudah cut off; kueri D1 tunggal berindeks.
- Merah lewat tenggat tampil paling lama 60 detik sesudah tenggat (pembaruan meja tiap 60 detik) dan dihitung di klien dari `tenggat` dan waktu sekarang.
- Lapisan sinyal awal tidak menambah unduhan layar utama bagi publik (tidak ada permintaan data bila rute `meja/sinyal` menjawab 403).

### Larangan tambahan (bagian 2)

- Penilaian foto tidak pernah menulis "asli", "palsu", atau "bukan dari internet"; hanya "buram", "diambil lebih dari 6 jam sebelum unggah", "mirip foto di LA-...", dan (bila diizinkan) "kurang sesuai dengan jenis bencana".
- Ringkasan harian, sinyal awal, dan pembanding tidak menjumlahkan laporan warga dengan DIBI, logbook, atau angka resmi, tidak menulis "aman", dan tidak menjadi sumber kejadian resmi.
- Merah lewat tenggat bukan vonis atas petugas; tidak ada penilaian kinerja orang atau BPBD dari data penugasan di paket ini.
- Draf LogPal tidak pernah diajukan oleh sistem dan tidak pernah berisi jumlah barang yang dihitung mesin.
- Kontak BPBD dan nomor WA staf tidak masuk repo.
