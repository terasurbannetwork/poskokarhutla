# Centurisk97: halaman muka dokumentasi

> Pembaca: pengguna, staf, pimpinan, dan pengembang. Keadaan kode dan dokumen per 24 November 2026.

## Apa itu Centurisk97

Centurisk97 (`https://centurisk97.id`) adalah situs pemantauan dan pendukung keputusan kebencanaan untuk Badan Nasional Penanggulangan Bencana (BNPB) dan badan penanggulangan bencana daerah (BPBD). Situs ini bermula dari pemantauan kebakaran hutan dan lahan (karhutla), lalu diperluas ke banjir dan rob, gempa dan tsunami, gunung api, longsor, kekeringan, pesisir, serta cuaca dan kualitas udara. Di atas pemantauan itu ada lapisan kerja: pelaporan warga lewat chatbot (`/lapor`), buku besar satu nomor per kejadian (`/siklus`), layar kerja staf (`/bnpb`, `/operasi`), akun lembaga dan profil petugas, kemitraan kampus, dan kit pipa pemadam (SIPPA). Cara situs ini dibangun dijelaskan di bagian Pengembang.

Enam prinsip yang berlaku di semua modul, dan menentukan cara membaca tiap angka:

1. Angka dari sumber berbeda ditampilkan berdampingan dan tidak dijumlahkan atau dirata-rata. Contoh: DIBI, logbook Pusdalops, laporan warga, satelit, dan model.
2. Kosong bukan nol. Nilai yang tidak terukur, sumber yang gagal, atau wilayah tanpa lintasan satelit ditulis "belum terukur", "belum ada data", atau tanda strip. Nol hanya muncul bila sumber atau hitungan memang menghasilkan nol.
3. Model yang belum lulus uji balik tampil sebagai hipotesis, dengan pil berlabel di layar. Model yang kalah dari pembanding sederhana tidak diterbitkan sebagai prakiraan.
4. Status resmi lembaga lain (BMKG, PVMBG, Kementerian PU) tampil apa adanya dengan nama lembaga dan jam terbit. Deteksi dan prakiraan Centurisk97 dipisahkan dari pernyataan resmi itu, dan tidak ada skor gabungan di antara keduanya.
5. Layar tidak pernah menyatakan suatu wilayah bebas dari bahaya. Kalimat yang boleh dipakai hanya "tidak disebut", "belum ada data", atau "belum teruji".
6. Renlap, flight plan, dan usulan langkah adalah usulan untuk dilihat, bukan perintah. Keputusan lapangan ada pada komando dan petugas.

## Cara membaca dokumentasi

Dokumentasi dibagi dua bagian yang dipisahkan sengaja. Panduan menjelaskan cara memakai tiap halaman dan cara tiap angka dihitung, dalam bahasa sehari-hari. Pengembang memuat rujukan teknis untuk yang membangun dan memelihara situs, dengan rujukan ke baris kode.

Tiap modul punya halaman depan, lalu halaman-halamannya berurutan. Gunakan tombol Sebelumnya dan Berikutnya di bawah halaman, atau daftar di sisi kiri. Kotak cari di bilah atas mencari di kedua bagian.

Aturan baca yang berlaku untuk semua halaman:

- Bagian bertanda rancangan belum dibangun. Rancangan tidak boleh dibaca sebagai fitur yang sudah tersedia.
- Keputusan pemilik yang belum dijawab ditulis "belum diputuskan (bawaan sementara: ...)". Bawaan sementara adalah pilihan kerja, bukan keputusan.
- Model yang belum lulus uji balik tampil sebagai hipotesis.
- Bila suatu hal tidak ditemukan, halaman menulis "belum terdokumentasi di kode" dan tidak mengarang isinya.
