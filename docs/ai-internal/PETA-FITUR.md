# Peta fitur platform agen AI untuk sistem BNPB

Disusun 5 Nov 2026 dari dua bahan: panduan pengguna sebuah platform pembuat agen AI komersial, dan penelusuran langsung (hanya baca) ke satu instansinya yang sedang dipakai. Tidak ada isi dokumen, nama pengguna, atau data pelanggan yang disalin ke sini. Yang dicatat hanya fitur, isian formulir, dan bentuk arsitekturnya.

Arah pemilik: semua fitur dan arsitekturnya ditiru, lalu disambungkan ke sistem kita.

Usulan induknya ada di `.claude/cadangan-akun/artefak/usulan-sistem-satu-pintu-bnpb/usulan.md`.

## 1. Arsitektur yang teramati

| Lapisan | Yang dipakai pembanding | Padanan kita |
| --- | --- | --- |
| Layar | Next.js (Turbopack), komponen Radix, tema terang/gelap | HTML + JS polos tanpa build step, kepala situs navy bersama |
| Sesi login | NextAuth (`/api/auth/session`), login Google atau email + sandi | Sesi staf yang sudah ada (`src/staf.js`), login per orang |
| API | REST berversi `/api/v1/<sumber daya>`, token Bearer, paging `page` + `page_size` + `filters` + `ordering` | `/api/v1` + kunci mitra (`src/api_v1.js`) |
| Pengaturan sistem | `/api/system-settings`, `/api/timeout` dibaca tiap halaman | Belum ada; jadi tabel `ai_setelan` |
| Organisasi | ID organisasi UUID, semua agen dan pengetahuan bernaung di bawahnya | Kode wilayah Kemendagri + unit (BNPB, BPBD prov, BPBD kab/kota) |
| Model | Vertex AI (teks), Veo 3.1 (video), model penglihatan untuk gambar dan tabel di dokumen | Gerbang model OpenAI-compatible: vLLM lokal di PDN; selama prototipe boleh model berbayar |
| Pengindeksan | Asinkron, status per sumber (`Completed`) | Antrean pengindeksan + status per berkas |
| Basis data luar | Hanya Google BigQuery | D1 (prototipe), PostgreSQL + PostGIS + pgvector (sasaran) |

## 2. Fitur dan detail kecilnya

Kolom "Kita" menyebut yang sudah ada di repo ini. Kolom "Tiru" menyebut cara membangunnya.

### 2.1 Agen

| Fitur | Detail kecil | Kita | Tiru |
| --- | --- | --- | --- |
| Daftar agen | Kolom: nama, visibilitas, jumlah pengetahuan, deskripsi, tanggal dibuat, pembuat (nama + email), status. Paging 10 per halaman, ukuran halaman bisa diganti, cari nama | Belum | Halaman `/ai/agen`, kartu standar `.ex-std` |
| Tab repositori | "Organization Repositories" memisahkan agen milik organisasi dari milik pribadi | Belum | Tab Unit saya / Semua yang boleh saya pakai |
| Aksi per baris | Lihat, Sunting, Integrasi, WhatsApp, Hapus (hapus hanya untuk pemilik) | Belum | Tombol ikon polos tanpa kotak |
| Nama + avatar | Tiga avatar: Classic Bot, Smart Brain, AI Assistant | Belum | Tiga ikon, tanpa gambar unggahan |
| Suhu | Geser 0,0 sampai 2,0 dengan label Fokus, Seimbang, Kreatif | Belum | Sama; bawaan 0,3 untuk agen data |
| Sakelar kemampuan | Buat gambar, buat video, cari web perusahaan, alih ke manusia (hanya bila pengguna minta bicara dengan petugas) | Alih ke manusia: belum | Buat gambar = grafik dan peta kita; cari web = gerbang web DMZ; alih ke manusia = antrean ke operator Pusdalops |
| Visibilitas | Pribadi; Organisasi (akses perlu persetujuan admin); Publik (langsung pakai) | Belum | Pribadi; Unit; Semua BNPB-BPBD; Publik (warga) |
| Instruksi sistem | Wajib, minimal 10 kata, penghitung karakter, saran minimal 50 karakter | Belum | Sama |
| Buat instruksi dengan AI | Tombol menulis draf instruksi dari nama dan deskripsi | Belum | Sama |
| Pratinjau agen | Ringkasan apa yang akan dilakukan agen berdasarkan instruksinya | Belum | Sama |
| Pasang pengetahuan | Daftar semua sumber dengan cari, Pilih semua, Kosongkan, penghitung "x dari y dipilih" | Belum | Sama, tersaring hak akses wilayah |
| Detail agen | Instruksi lengkap, tanggal, status | Belum | Sama + log versi instruksi |
| Agen orkestra | Satu agen utama membagi tugas ke sub-agen (dipakai untuk estimasi biaya) | Belum | Sub-agen di gerbang agen |
| Agen pengisi templat | Mengisi XLSX/DOCX resmi dengan format, sel gabung, dan rumus utuh, lalu berhenti minta tinjauan sebelum berkas final ditulis | Mesin deck `ppt-konsultan`, `xlsx_mini.js` | Alat `isi_templat` + jeda tinjauan wajib |

### 2.2 Pengetahuan

| Fitur | Detail kecil | Kita | Tiru |
| --- | --- | --- | --- |
| Daftar pengetahuan | Kolom: nama, jumlah agen terpasang, jenis, deskripsi, dibuat, pembuat, status indeks | Belum | Halaman `/ai/pengetahuan` |
| Formulir dua langkah | 1 Informasi dasar (jenis, nama, visibilitas) lalu 2 Konfigurasi | Belum | Sama |
| Deskripsi wajib + tulis dengan AI | Deskripsi dipakai agen untuk memilih sumber | Belum | Sama |
| Unggah berkas | PDF, DOCX, XLSX, PPTX, JSON, TXT; banyak berkas; seret-lepas; dari Google Drive | Pembaca Drive di bot WA (`scripts/wa/drive.cjs`), OCR (`scripts/wa/ocr`) | Unggah ke R2, Drive tetap jalan masuk kedua |
| Ekstraksi gambar | Opsi model penglihatan untuk mendeskripsikan gambar dan tabel; lebih lambat | Belum | Docling + model penglihatan lokal, opsional per sumber |
| Basis data | Jenis basis data (hanya BigQuery), Uji Koneksi yang cuma mengambil daftar dataset | D1 | Tampilan data yang disetujui (bukan kueri bebas), Uji Koneksi |
| REST API | Metode, URL, header, parameter | `/api/v1` | Sama, kunci disimpan di brankas |
| MCP | Tanpa autentikasi (fungsi didaftar manual), akun layanan cloud (fungsi terdeteksi sendiri), standar dengan OAuth atau token | Server MCP sendiri (`src/mcp.js`) | Klien MCP di gerbang agen; server kita jadi sumber pertama |
| Mesin eksekusi luar | Jenis khusus untuk menyambung ke kerangka eksekusi agen luar | Belum | Kotak pasir kode Python |
| Alat bawaan | Cuaca, Google Search, Wikipedia | Data cuaca, BMKG, hukum JDIH | Alat bawaan kita: titik panas, status wilayah, peringatan, hukum BNPB, cuaca BMKG |

### 2.3 Percakapan

| Fitur | Detail kecil | Kita | Tiru |
| --- | --- | --- | --- |
| Riwayat percakapan | Panel kiri, cari semua percakapan, hapus per percakapan | Belum | Sama |
| Daftar agen di samping | Cari agen, klik untuk mulai | Belum | Sama |
| Lampiran | XLSX, PDF, DOCX, gambar | Belum | Sama |
| Mode penalaran | Langkah, sumber, dan alasan ditampilkan | Belum | Sama + tiap angka bersumber dan bertanggal |
| Obrolan suara | Bicara langsung | Belum | Whisper lokal |
| Pilih model | Daftar model per percakapan | Belum | Daftar dari gerbang model |
| Percakapan baru | Konfirmasi sebelum memulai | Belum | Sama |

### 2.4 Integrasi

| Fitur | Detail kecil | Kita | Tiru |
| --- | --- | --- | --- |
| Iframe | Potongan kode tempel, pratinjau widget | Halaman `/presiden` sudah bisa di-iframe | Sama |
| Gelembung chat | Widget melayang, bisa membaca konteks halaman | Belum | Satu skrip `ai-gelembung.js` |
| WhatsApp | Isi nama sesi, Buat & Mulai, pindai QR | Gateway Baileys `scripts/wa/gateway` | Satu agen per nomor WA unit |

### 2.5 Pengaturan dan tata kelola

| Fitur | Detail kecil | Kita | Tiru |
| --- | --- | --- | --- |
| Undang pengguna | Banyak email sekaligus (Enter/spasi), kirim ulang undangan | Pendaftaran mandiri `/daftar-kontak`, akun instansi | Undangan per unit |
| Peran | Pengguna, Admin, Super Admin | `PERAN` di `src/staf.js` | Tambah peran AI: pemakai, pembuat agen, admin unit |
| ACL per menu | Tiap menu (pengguna, kredensial, undangan, dasbor, agen, pengetahuan, chatbot, ACL) disetel per peran: buat, lihat, ubah, hapus | Gerbang peran per rute | Matriks peran x menu x aksi di D1 |
| Pasang agen ke pengguna | Pilih agen per pengguna | Belum | Sama |
| Verifikasi pengguna | Pengguna belum diverifikasi tidak bisa login | Verifikator akun instansi | Sama |
| Organisasi | Nama, alamat, email, telepon; hanya Super Admin | Kontak pemangku (`src/kontak.js`) | Unit = kode wilayah + jenis lembaga |
| Brankas kredensial | Akun layanan (berkas JSON), kunci cuaca, Google Search (kunci + ID mesin cari), User-Agent Wikipedia | Secret Worker | Tabel kredensial terenkripsi, tak pernah tampil ke pengguna |
| Batas waktu sesi | Lama sesi dan waktu peringatan sebelum habis bisa disetel | Belum | Sama |
| Dasbor | Sapaan, tanggal + jam WIB, status sistem, agen teratas (jumlah percakapan), aksi cepat | Command center | Kartu standar, agen teratas per unit |
| Tema | Terang/gelap | Sebagian layar | Sama |

## 3. Yang tidak dimiliki pembanding

Bagian ini tetap menjadi milik sistem kita:

1. Hak akses yang menyaring per kode wilayah, termasuk ke jawaban AI.
2. Peta dan data lokasi.
3. Status data draf dan terverifikasi.
4. Pengisian luring di lapangan.
5. Paparan dan laporan dari templat BNPB, dengan gerbang QA.
6. Tiap angka bersumber dan bertanggal.
7. Berjalan di server sendiri tanpa internet.

## 4. Urutan bangun yang diusulkan

Tiap langkah berdiri sendiri dan bisa didemokan.

1. **Gerbang model + agen + percakapan.** Tabel `ai_agen`, `ai_percakapan`, `ai_pesan`. Satu agen bawaan memakai server MCP kita sebagai alatnya.
2. **Pengetahuan berkas.** Unggah ke R2, pengindeksan asinkron, status indeks, sumber dipasang per agen.
3. **Tata kelola.** Peran AI, matriks ACL, visibilitas, brankas kredensial, batas waktu sesi.
4. **Integrasi.** Iframe, gelembung chat, agen per nomor WA.
5. **Alat lanjutan.** REST API, klien MCP luar, pengisi templat dengan jeda tinjauan, sub-agen, alih ke operator, suara.

Sebelum langkah 1 perlu satu keputusan: model apa yang dipakai selama prototipe, karena server GPU belum ada.
