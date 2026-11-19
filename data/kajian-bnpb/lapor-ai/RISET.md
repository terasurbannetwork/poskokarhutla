# RISET: Pelaporan kejadian bencana dipandu AI

## 1. Deck rujukan pemilik (18 Nov 2026)

"Digitalisasi dan Pelibatan Publik dalam Pendataan Bencana: Pelaporan kejadian bencana menggunakan Chat Bot dengan Artificial Intelligence", Tim Ahli dan Tim Sus IT BNPB, disampaikan kepada Kepala BNPB. Tujuh slide.

Kesenjangan (slide 3), kondisi aktual lawan ideal:

| Parameter | Aktual | Ideal |
| --- | --- | --- |
| Kecepatan | Laporan berjenjang, tiba di pusat beberapa hari sesudah kejadian | Laporan masuk real time ke BNPB, tidak menunggu laporan BPBD |
| Kelengkapan | Tidak lengkap, baru diketahui di pusat | AI menanyakan isian yang belum ada sebelum laporan terkirim |
| Standar | Petugas BPBD tidak punya standar analisis | AI bertanya interaktif dan menawarkan rekomendasi pilihan jawaban |
| Dua arah | Hanya BPBD ke BNPB | BNPB bisa meminta verifikasi ke BPBD untuk kejadian yang dilaporkan masyarakat |
| Partisipasi warga | Warga belum punya kanal resmi | Warga melapor lewat chatbot yang sama |
| Beban administrasi | Disusun manual, diketik ulang tiap jenjang | Laporan baku tersusun otomatis dari percakapan |
| Keputusan | Status dan bantuan dari laporan terlambat | Data utuh sesuai keadaan lapangan |

Alur (slide 4): pelapor (BPBD atau masyarakat) bercerita lewat WhatsApp dan mengirim foto bertanda lokasi; chatbot AI menanyakan data umum dan data khusus satu per satu sampai lengkap; sistem menyusun laporan baku sesuai juklak tanpa diketik ulang; basis data nasional menyajikan data untuk diverifikasi BPBD dan BNPB.

Data umum (sama untuk semua jenis; tiga pertama wajib di laporan awal): 1 identitas kejadian, 2 waktu, 3 lokasi spesifik dengan geotag, 4 korban terpilah, 5 pengungsian, 6 kerusakan rumah, fasilitas, jalan, 7 layanan dasar, 8 lahan dan ekonomi, 9 kebutuhan dan penanganan, 10 mutu data dan foto.

Data khusus per jenis: banjir (kedalaman genangan), longsor (jenis gerakan), gempa (intensitas per desa), karhutla (luas terbakar), cuaca (lintasan angin), erupsi (tebal abu), tsunami (tinggi rayapan), kekeringan (krisis air), abrasi (garis pantai), dan subjenis tiap bencana.

Contoh percakapan: "Ada banjir, air masuk rumah warga." AI: "Pilih yang paling mirip: Banjir, Banjir rob, Banjir bandang, Banjir lahar." AI: "Berapa rumah rusak dan warga mengungsi?" Pelapor: "Tiga rusak berat, dua belas orang mengungsi" plus foto, lokasi, waktu terekam. AI: "Laporan lengkap sesuai juklak, diteruskan ke BPBD dan BNPB."

Alur sesudah (slide 6): kejadian, laporan masyarakat via chatbot AI, langsung ke Pimpinan BNPB; diteruskan bersamaan ke BPBD dan ke Pusdalops serta Pimpinan Pusdalops yang saling verifikasi dan koordinasi data; arahan verifikasi dan umpan balik dua arah. Pesan penutup: fokus pendataan bergeser dari membuat laporan ke memastikan data benar dan terverifikasi.

## 2. Bagian repo yang dipakai ulang

| Kebutuhan | Yang sudah ada | Berkas |
| --- | --- | --- |
| Pintu WA, nomor terdaftar, batas kirim | Gateway Baileys, daftar nomor bersha, limiter dengan batas balasan percakapan | `scripts/wa/gateway/index.js`, `scripts/wa/daftar.cjs`, `scripts/wa/gateway/limiter.js` |
| Pemanggil Claude, penyamaran, validasi kutipan angka | Bot laporan V1 | `scripts/wa/claude.mjs` (`samarkan`, validasi kutipan) |
| Identitas web lewat nomor WA | Satu Pintu Masuk, kode sekali pakai lewat WA, akun umum | `src/masuk*.js`, `public/masuk.*` |
| Foto bergeotag dan berwaktu (K5) | Unggah foto warga: GPS perangkat saat unggah, cek EXIF jarak dan umur, GPS janggal, bersih metadata | `src/foto.js`, `src/gps.js`, `src/media_bersih.js` |
| Kode wilayah dari koordinat | `wilayah`, `cariWilayah`, pencarian desa | `src/titik.js`, `public/data/desa_cari.json` |
| Aturan kelengkapan (nilai, nihil, belum didata) | Fungsi murni kelengkapan meja `dampak` | `public/inti/kelengkapan.js`, `data/kajian-bnpb/juklak/DATA-DAMPAK.md` |
| Standar isian | Rancangan Juklak Standar Data, Lampiran I sampai III | `data/kajian-bnpb/standar-data-bencana/03-juklak-baru/naskah/` |
| Isian yang selama ini ditulis Pusdalops | Landasan formulir dari laphar | `data/kajian-bnpb/standar-data-bencana/04-landasan-formulir/isian.json` |
| Verifikasi dan Terima ke Logbook | Meja `dampak`, status `dilaporkan`, `diverifikasi`, `masuk_logbook` | `src/meja.js`, KEPUTUSAN-JUKLAK T10 sampai T13 |
| Satu buku kejadian | Pencocok antarsumber | `scripts/siklus/pasang.py` |
| Penyaring teks bebas | `teksBersih` (HP, NIK, surel, RT/RW) | `src/meja_spek.js` |
| Token tautan tanpa login | Uji pilot (tautan bertoken tanpa login) | rute `/uji-pilot` di `src/` |
| Jenis dan subjenis bencana | Registri bencana | `public/bencana.json` |

## 3. Batas teknis yang memengaruhi rancangan

- WhatsApp membuang EXIF dari foto yang dikirim sebagai gambar biasa. Karena itu D16 menandai foto chat WA dengan jam pesan dan lokasi WA terdekat (lencana "lokasi WA"), dan menawarkan tautan halaman kamera web untuk lencana GPS perangkat.
- Pesan "Bagikan lokasi" WA membawa lintang dan bujur yang dipilih pengguna (bisa digeser). Ketelitiannya dicatat "lokasi dibagikan lewat WA", bukan "titik GPS".
- Baileys tidak andal untuk tombol dan daftar interaktif WhatsApp; pilihan memakai angka.
- Limiter gateway: balasan ke orang yang menulis dalam 10 menit terakhir memakai batas percakapan terpisah (150 per tujuan per hari sejak 18 Nov 2026). Satu laporan lengkap kira-kira 8 sampai 15 balasan.
- Worker paket Free: waktu menunggu `fetch` ke API model tidak dihitung CPU; panggilan model tetap dibatasi satu per putaran (D15).
- Kuota baca D1 Free 5 juta per hari (memori `d1-kuota-baca`): sesi lapor dibaca per kunci utama, tanpa pemindaian.

## 4. Praktik lazim

- Pola "slot filling" pada asisten percakapan: daftar slot tetap, model hanya mengisi slot dan merumuskan pertanyaan, logika selesai di kode. Lebih bisa diuji daripada membiarkan model memegang alur.
- Kanal pelaporan warga di negara lain (misalnya pelaporan lewat aplikasi pesan) memisahkan laporan warga yang belum terverifikasi dari data resmi; repo ini sudah memakai pola yang sama di alun-alun dan Cek Kabar.
