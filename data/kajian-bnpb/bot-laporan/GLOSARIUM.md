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
| Manifest kunci (`kunci.json`) | Daftar shape yang memuat angka sistem, ditulis generator. |
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
