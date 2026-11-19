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
