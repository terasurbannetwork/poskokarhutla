# GLOSARIUM: Bot WA pembuat laporan

| Istilah | Arti |
| --- | --- |
| Bahan | Pesan, PDF, foto, atau Excel yang dikirim ke bot dan dipakai mengisi laporan. Bahan tidak pernah menjadi sumber angka sistem. |
| Angka sistem | Hotspot, firespot, luas terbakar, dan luas belum padam yang dihitung platform sendiri. Terkunci dari revisi. |
| Proyek | Satu laporan yang sedang dikerjakan lewat bot, dari `buat` sampai `final`, dengan kode `P-DDMMYY-NN`. |
| Pemegang proyek | Nomor yang membuka proyek. Hanya dia (dan pemilik) yang bisa merevisi dan menutupnya. |
| Isian | Medan laporan hasil urai bahan oleh Claude, tiap medan dengan kutipan asalnya. |
| Kutipan | Potongan teks bahan tempat sebuah nilai ditemukan. Nilai tanpa kutipan yang cocok ditolak. |
| Operasi ubah | Satu perubahan pada deck hasil generator (ganti teks, ganti sel, tambah baris, catatan, sembunyikan slide). Revisi = daftar operasi ubah. |
| Inventaris shape | Daftar slide, nama shape, dan teksnya dari PPTX hasil generator; dasar Claude menulis operasi ubah. |
| Manifest kunci (`<nama deck>.kunci.json`) | Daftar shape yang memuat angka sistem, ditulis generator. |
| Versi | Hasil bangun ulang ke-n: generator dari bahan ditambah operasi ubah 1..n. Tidak pernah ditimpa. |
| Draf | Versi yang sudah dikirim ke pemegang dan belum `final`. |
| Final | Versi yang dipilih pemegang lewat perintah `final`; diunggah ke Drive dan dikunci. |
| Closing | Langkah sesudah `final`: kirim PPTX dan PDF, unggah ke Drive tim IT, simpan ke `/pelaporan`, tutup proyek. |
| Pratinjau | Gambar PNG slide yang berubah, dikirim sebelum PDF. |
| Banding 7 hari | Pemeriksaan angka draf terhadap median laporan final 7 hari terakhir jenis yang sama. |
| Pola revisi | Label (jenis laporan, judul slide, jenis operasi, ringkasan) untuk revisi yang mirip. |
| Aturan tetap | Pola revisi yang disetujui pemilik dan diterapkan otomatis ke draf v1 berikutnya. |
| Mesin bot | Komputer yang menjalankan gerbang Baileys, mesin proyek, dan generator. |
| Detak | Tanda hidup mesin bot ke Worker tiap 5 menit. |
| Uji balik | Membangun ulang laporan hari-hari lalu dari bahannya lalu membandingkannya dengan deck manual untuk mengukur kemiripan. |
| Bot V1 | Bot sampai 19 Nov 2026: Claude hanya mengisi medan JSON dan operasi ubah kecil; deck selalu dari generator. |
| Bot V2 | Bot dengan agen Claude Code di mesin bot (K23): agen menyempurnakan deck generator dan menjalankan revisi apa pun kecuali angka sistem. |
| Agen | Claude Code yang dijalankan mesin lewat Claude Agent SDK, tanpa layar, untuk satu proyek. |
| Sesi agen | Percakapan agen per proyek; revisi melanjutkan sesi yang sama sehingga agen ingat langkah sebelumnya. |
| Ruang kerja | Folder `~/.wa-bot/agen/<proyek>/v<n>/` tempat bahan, deck dasar, laporan kemarin, dan hasil agen. |
| Sandbox | Kurungan sistem operasi untuk semua perintah agen: hanya boleh menulis di ruang kerja, tanpa jaringan, tanpa membaca rahasia. |
| Deck dasar | Deck hasil generator untuk proyek itu; acuan angka sistem untuk pagar angka. |
| Pagar angka | Pemeriksaan mesin atas isi PPTX lengkap sesudah agen bekerja: angka sistem harus sama dengan deck dasar. |
| Pedoman agen | Aturan cara membuat laporan untuk agen, disuling dari kerja pemilik seminggu terakhir. |
| Laporan kemarin | Final laporan jenis sama dari tanggal terdekat sebelumnya, dipakai agen sebagai acuan gaya dan urutan, bersama skrip harian kemarin. |
