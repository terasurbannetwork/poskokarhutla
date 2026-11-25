# Layar Lifeline, 3W, kaji ulang

Halaman ini merinci kisi Lifeline, kartu 3W dan tawaran bantuan, serta kaji ulang pasca-kejadian.

## Status Lifeline (kisi pada halaman kejadian)

Siapa: staf dan akun BPBD (kabupaten wilayahnya) membaca. Menetapkan status oleh Pusdalops, Koordalops, Super Admin, dan akun BPBD untuk kabupaten wilayahnya. Pimpinan hanya membaca dan tidak melihat siapa yang menetapkan.

Langkah pakai:

1. Buka kartu "Layanan" pada halaman kejadian. Kisi menampilkan tiap kabupaten pada kejadian dan delapan layanan: listrik, sinyal, air, jalan dan akses, BBM, faskes, pangan, pengungsian.
2. Klik satu sel untuk membuka laci. Laci memuat status resmi, usulan mesin beserta buktinya, dan riwayat.
3. Tetapkan warna (hijau, kuning, merah, abu) dengan bukti: isyarat sistem yang dipilih atau catatan staf 20 sampai 300 karakter. Status selain abu wajib punya bukti.

Arti warna: hijau berfungsi, kuning terganggu, merah lumpuh, abu tidak diketahui. Tanpa baris status, sel berwarna abu. Layar menampilkan status resmi. Usulan mesin hanya saran, berlabel hipotesis dan berlabel "isyarat kab, tidak khusus kejadian". Status yang tidak diperbarui lebih dari 24 jam diberi tanda "lewat 24 jam" tetapi warnanya tidak berubah. Padam internet IODA hanya ditampilkan sebagai konteks provinsi dan tidak pernah menjadi usulan per kabupaten.

Yang sering disalahpahami: catatan tidak boleh memuat nomor telepon, dan sistem menolak catatan yang memuatnya.

## 3W dan tawaran bantuan (kartu pada halaman kejadian, dan `/bantu`)

Siapa: staf membaca 3W dan tawaran. Pusdalops, Koordalops, Super Admin menulis, memutuskan tawaran, dan membuat tautan token. Organisasi luar memakai `/bantu` dengan tautan bertoken dan hanya melihat baris miliknya. Tidak ada tampilan publik.

Langkah untuk staf:

1. Daftarkan organisasi di register `org` (jenis: kementerian atau lembaga, TNI, Polri, NGO nasional atau internasional, dunia usaha, kampus, PMI, lembaga PBB atau regional, lainnya).
2. Isi baris 3W: kejadian, kabupaten, klaster, organisasi, kegiatan, mulai, selesai, status (rencana, berjalan, selesai).
3. Buat tautan bertoken per organisasi per kejadian. Tautan dapat dicabut.
4. Tinjau tawaran: status masuk, dicocokkan, diterima, dialihkan, atau ditolak. Dialihkan dan ditolak wajib alasan untuk organisasi minimal 5 karakter.

Langkah untuk organisasi: buka tautan, token berada di fragmen `#t=` sehingga tidak ikut dikirim sebagai alamat, lalu isi baris 3W dan tawaran sendiri.

Arti tampilan: delapan klaster (kesehatan, pencarian dan penyelamatan, logistik, pengungsian dan perlindungan, pendidikan, sarana prasarana, ekonomi, pemulihan dini). Kabupaten terdampak tanpa organisasi berstatus berjalan pada suatu klaster ditandai celah. Kabupaten dengan lebih dari 3 organisasi berstatus berjalan pada klaster yang sama ditandai tumpang tindih. Ambang 3 adalah hipotesis. Klaster pendidikan tidak dihitung sebagai celah selama kejadian di kabupaten itu belum berumur 3 hari (`src/hak.js:1210` dan `1255-1266`).

Yang sering disalahpahami: mesin hanya mengurutkan kandidat kebutuhan untuk sebuah tawaran, staf yang memilih. Tidak ada keputusan bantuan oleh mesin dan tidak ada router WA bersama.

## Kaji ulang pasca-kejadian

Belum ada layar. Kemampuan tersedia sebagai rute API di bawah `/api/siklus/kejadian/<nomor KJ>/kaji-ulang` dan daftar lintas kejadian. Penggunaan: Pusdalops atau Koordalops memulai kaji ulang untuk satu kejadian, menulis pelajaran dan rekomendasi (dengan penanggung jawab dan tenggat), lalu Koordalops mengesahkan. Pimpinan dan akun BPBD hanya membaca. Aturan yang sudah ditegakkan di kode: akun BPBD hanya menerima kaji ulang berstatus disahkan, tanpa potret, di kabupaten wilayahnya, selain itu jawabannya 404. Pengesahan hanya boleh sesudah kejadian berfase selesai. Nama pengisi hanya terlihat oleh Pusdalops, Koordalops, dan Super Admin (`src/kaji_ulang.js:4-5`, `68-76`, `87`, `169`). Detail cara kerja ada di bagian Metode.
