# KEAMANAN-PRIVASI: Lapor tanpa sinyal

Laporan yang menunggu di HP berisi data pribadi: lokasi tepat, foto lokasi, kadang nama lewat ringkasan, dan nomor WA. Repo ini publik: tidak ada contoh data nyata di berkas ini.

## 1. Data apa, di mana, berapa lama

| Data | Tempat | Masa |
| --- | --- | --- |
| Butir (jenis, waktu, korban, ringkasan, koordinat, nomor WA) | IndexedDB `pb-antre`, store `butir` | Sampai terkirim, dibuang pengguna, atau 14 hari (Q4) |
| Foto (JPEG yang sudah dikecilkan) dan EXIF yang dibaca | store `blob` dan `data.foto[].exif` | Sama dengan butir |
| Selisih jam HP lawan server | localStorage | Sampai "Hapus semua data luring" |
| Cangkang dan nomor penting | Cache SW | Sampai versi berganti |
| Kunci rahasia, kode akses, token, kuki | Tidak pernah di butir (`DILARANG` antre.js) | |

## 2. Enkripsi di HP (batas yang jujur)

Penyimpanan peramban tidak terenkripsi aplikasi. Enkripsi dengan Web Crypto memakai kunci yang harus tersimpan di peramban yang sama; siapa pun yang dapat membuka peramban itu (HP tidak terkunci atau dipinjam) dapat memakainya. Maka enkripsi semacam itu tampak melindungi tanpa melindungi, dan tidak dipasang di v1 (DL11). Perlindungan nyata:

- Minimisasi: tanpa RT/RW, tanpa nama (hanya nomor yang sudah dikenal), ringkasan opsional, foto dikecilkan, EXIF dibaca lalu dibuang di server.
- Penghapusan: otomatis sesudah terkirim; otomatis 14 hari; tombol Hapus semua data luring; tidak ada salinan lain di HP.
- Kunci layar HP dan enkripsi disk bawaan OS adalah perlindungan yang sebenarnya; formulir tidak mengklaim lebih.
- PIN opsional ditimbang di Q6; bila dibuka, memakai PBKDF2 dan AES-GCM dan ditulis di dokumen terpisah, bukan diam-diam.

## 3. HP bersama atau dipinjam

- Pita menampilkan hanya jenis, jam, dan keadaan. Lokasi, nomor, ringkasan, dan foto hanya tampil di layar "Lihat laporan ini" yang menanyakan konfirmasi.
- Butir terkait nomor yang menyimpannya. Pengguna lain di HP yang sama bisa melihat bahwa ada laporan menunggu dan membuangnya; ini risiko yang diterima dan dinyatakan di layar Siapkan ("Laporan menunggu bisa dilihat siapa saja yang memegang HP ini"). Mode privat peramban (penyimpanan hilang saat ditutup) menyatakan dirinya: formulir menolak menyimpan bila `navigator.storage` atau IndexedDB tidak tahan lama dan memberi tahu.
- Keluar akun ("tombol keluar tidak tampil di /lapor", K22) tidak menghapus butir; tombol Hapus semua data luring ada di menu Bantuan dan di layar Siapkan.
- Butir tidak pernah dikirim sebagai nomor lain: server memakai identitas kuki perangkat dan nomor yang sama dengan sesi online; ketidakcocokan nomor lawan kuki ditolak 403 (butir tetap, label "perlu masuk").

## 4. Ancaman terhadap Worker

| Ancaman | Penjagaan |
| --- | --- |
| Banjir butir palsu | `identitasSah` sebelum membaca badan, kuota per nomor, IP, perangkat; badan paling 16 KB; `MAKS_TERKIRIM_HARI`; foto 30 per jam |
| Waktu klien dipalsukan (laporan terlihat lebih awal atau foto lama) | Batas `waktu_klien` (terima minus 14 hari sampai terima plus 5 menit); koreksi selisih jam bila ada; lencana lebih lemah dan tanda jam; foto lama lewat EXIF lawan `waktu_klien`; staf melihat kedua waktu (Q1) |
| Koordinat palsu | Wajib di Indonesia; GPS lawan EXIF 5 km; akurasi paling 1000 m; lencana "luring"; staf menilai dan verifikasi BPBD tetap berlaku |
| Foto galeri atau tangkapan layar | EXIF Make/Model wajib (klien dan Worker); `waktu` EXIF lawan `waktu_klien` |
| Pengiriman ganda | `klien_id` PRIMARY KEY, jawaban sama |
| Teks bebas berbahaya | `samarkan`, panjang paling 500, dirender sebagai teks (tidak HTML), seperti ringkasan chat |
| XSS lewat pita | `antre.js` memakai `textContent`; label dibuat dari daftar tertutup (jenis) dan jam |
| Data pribadi di cache SW | SW tidak menyimpan respons API selain nomor penting |
| Pengiriman butir kedaluwarsa memicu pita darurat basi | Aturan Q3 |

## 5. Persetujuan dan hak

Persetujuan data dicatat pada sesi online (`setuju`); butir membawa `spek` dan Worker menolak butir dari nomor tanpa persetujuan tercatat. Pelapor dapat memakai perintah hapus data yang sudah ada (A7 paket induk); `lapor_luring` dan `lapor_foto_luring` ikut terhapus. Kebijakan privasi `/lapor` ditambah satu paragraf: laporan menunggu disimpan di perangkat, cara menghapusnya, dan batas 14 hari; tinjauan bagian hukum BNPB (K23) mencakup paragraf ini sebelum publik.

## 6. Larangan

Tidak ada lokasi, nomor, atau isi laporan di URL, log klien, atau pita. Tidak ada kunci rahasia di butir. Tidak ada analitik pihak ketiga pada formulir. Tidak ada pengiriman latar yang berbagi data dengan layanan di luar asal sendiri. Tidak ada kata "aman" di pesan keadaan korban.
