# PRD: Orang hilang publik, menemukan orang, mencari lewat foto

## Dasar keputusan

K110 sampai K116 di `KEPUTUSAN-ORANG-HILANG.md`: tiga jalur, setuju tayang, nama foto umur lokasi publik dan nomor kontak tidak, semua diverifikasi petugas, cabut boleh, turun otomatis, hanya yang hilang karena bencana.

## Tujuan

Keluarga yang kehilangan seseorang dalam bencana punya halaman yang bisa dibagikan, orang yang menemukan seseorang yang tampak tersesat punya tempat melapor, dan orang yang memegang foto bisa memeriksa apakah ada laporan yang mungkin cocok. Semuanya melewati petugas BNPB atau BPBD wilayah; sistem tidak pernah menyatakan siapa seseorang.

## Pengguna

| Pengguna | Kebutuhan |
| --- | --- |
| Keluarga atau kerabat yang melapor hilang | Melapor lewat obrolan, menyetujui tayang, melihat status, mencabut kapan saja, memperpanjang |
| Warga yang menemukan seseorang | Melaporkan dengan cepat, tanpa bocor ke publik, tahu laporannya diterima petugas |
| Warga yang mencari lewat foto | Mengunggah foto, mendapat petunjuk "mungkin mirip" dengan tautan ke petugas |
| Warga yang melihat profil publik | Mengenali orang di daftar, mengirim informasi tanpa kontak langsung |
| Petugas meja BNPB dan BPBD | Meninjau sebelum tayang, mencocokkan, menurunkan, menangani laporan penyalahgunaan |
| Orang yang ditemukan atau dicari | Hak menolak dihubungi, menarik persetujuan (lewat petugas) |

## Fitur

| ID | Fitur | Prioritas |
| --- | --- | --- |
| F-1 | Langkah persetujuan tayang di alur lapor orang hilang: teks bernomor versi, pilihan bidang yang boleh tampil, pilihan foto publik sampai 3, tolak menutup jalur dengan arahan Polsek dan 112 | Wajib (K111) |
| F-2 | Tabel samping `oh_publik` dengan status tayang, bidang terpilih, versi persetujuan, riwayat | Wajib |
| F-3 | Antrean tinjauan di meja: satu kartu per profil, pratinjau persis yang akan publik, tombol Tayang, Tolak (alasan), Minta perbaikan; penanda prioritas kejadian aktif | Wajib |
| F-4 | Halaman publik tab "Orang hilang" di `/lapor`: daftar kartu, saringan wilayah dan rentang umur, kartu profil, tombol Bagikan (tautan), Saya punya informasi, Laporkan profil | Wajib |
| F-5 | Tombol Cabut persetujuan di Laporan saya dan perpanjang 30 hari; wajib sesi `/masuk` terbukti atau gateway WA (D28), pelapor tanpa sesi mencabut lewat petugas | Wajib |
| F-6 | Turun otomatis saat ditemukan atau ditutup atau dicabut atau kedaluwarsa; foto publik dihapus | Wajib |
| F-7 | Profil anak lewat jalur khusus (bidang sempit, foto tidak publik, verifikasi wali oleh petugas) | Wajib |
| F-8 | Alur Lapor menemukan orang: lokasi, waktu, ciri, kondisi, ucapan orang itu, siapa bersamanya, foto bila disetujui; masuk meja | Wajib (K110) |
| F-9 | Saran kandidat cocok di meja (hilang lawan ditemukan) dari saringan terstruktur, dengan alasan tertulis; petugas mengonfirmasi atau menolak | Wajib |
| F-10 | Antrean "Saya punya informasi" di meja; petugas meneruskan ke pelapor | Wajib |
| F-11 | Cari lewat foto: unggah satu foto, tanpa simpan, hasil sampai 3 profil publik "mungkin mirip" dengan alasan, tembusan ke petugas | Wajib (K110), di belakang bendera `OH_FOTO` sampai Q13 selesai |
| F-12 | Daftar publik "Ditemukan, mencari keluarga" hanya untuk orang dewasa sadar yang setuju (Q9) | Sebaiknya |
| F-13 | Protokol penyalahgunaan: tombol laporkan, penanda "mungkin tidak ingin ditemukan" (dipasang pihak ketiga atau petugas), tombol "Saya orang ini, mohon turunkan", panduan petugas, rujukan layanan | Wajib |
| F-14 | Panduan petugas dan panduan pengguna di `/docs` (Panduan tanpa nama berkas) | Wajib |
| F-15 | Metrik petugas (antrean tinjau, umur antrean, tayang aktif, turun per alasan) dihitung dari tabel | Sebaiknya |
| F-17 | Penyaring bencana (K116): pelapor memilih kejadian dari daftar yang menyentuh kab/kota lokasi terakhir; petugas memastikan; di luar bencana pelapor diarahkan ke kepolisian | Wajib |
| F-16 | Pengingat pelapor memperpanjang atau menutup (tampil di Laporan saya; mesin tidak mengirim WA sendiri) | Sebaiknya |

## Di luar lingkup

Pencocokan wajah biometrik dengan vektor tersimpan (Q11), integrasi Polri atau Kemensos (Q19), pengumuman jenazah, pemantauan media sosial, pencarian lewat nama atau nomor HP oleh publik, kontak langsung antar warga, notifikasi dorong untuk profil baru, jalur luring, peta titik hilang, kabar selamat (sudah ada, K91; tidak diubah), pemberian status resmi jumlah hilang (angka resmi tetap dari BPBD).

## Larangan

Tidak menulis "aman", "pasti", atau "cocok" sebagai vonis. Tidak menampilkan nomor siapa pun, alamat rumah, titik GPS, hubungan pelapor, berat badan (bawaan), foto anak, atau data jenazah di halaman publik. Tidak menyimpan foto penanya. Tidak menyimpan atau menghitung vektor wajah. Tidak mencocokkan dari nama. Tidak ada berkas JSON statis berisi profil di `public/`. Tidak ada tayang tanpa tinjauan manusia. Tidak ada tombol 🧪 atau data dummy; uji memakai data uji yang dibangun di dalam uji. Tidak ada titik tengah di teks.

## Kriteria sukses

| Kriteria | Cara ukur |
| --- | --- |
| Tidak ada profil tayang tanpa persetujuan terbaru, tinjauan, dan kejadian bencana terkait | Uji rute: profil tanpa kedua syarat tidak muncul di `/api/lapor/hilang` |
| Tidak ada bidang di luar daftar putih di respons publik | Uji murni dengan baris berisi semua kolom; hanya bidang daftar putih keluar |
| Profil turun saat status berubah | Uji D1: ubah status, respons publik tidak memuatnya dalam permintaan berikutnya |
| Foto penanya tidak tersimpan | Uji: setelah pencarian, D1 dan R2 tidak berubah selain `oh_cari_foto` |
| Profil anak tidak memuat foto publik | Uji murni dan rute |
| Petugas memutuskan semua cocok | Uji: tidak ada jalur kode yang menulis status `ditemukan_*` dari pencocokan |
| Teks tanpa "aman" dan tanpa titik tengah | Gerbang `gerbang-orang-hilang` |
| Angka "tingkat keberhasilan" tidak tampil sebelum ada data | Uji gerbang: kata itu tidak ada di layar |
