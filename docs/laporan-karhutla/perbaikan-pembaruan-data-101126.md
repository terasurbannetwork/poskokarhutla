![Logo KRIS](../../data/templat-dokumen/aset/logo-kris.png)

# Laporan Perbaikan Pembaruan Data Kebencanaan di centurisk97.id

**Tanggal laporan:** 10 November 2026
**Kondisi data per:** 10 November 2026 pukul 15.12 WIB
**Penyusun:** Tim Ahli dan Tim Sus IT BNPB

## Ringkasan

Dalam periode 4 sampai 10 November 2026 ditemukan dua masalah pada pembaruan otomatis data situs.

| | Masalah 1 | Masalah 2 |
| --- | --- | --- |
| **Apa yang terjadi** | Data titik panas di situs tertinggal | Data non-karhutla sempat tampil versi Oktober |
| **Sejak** | 7 November 2026 | Tercatat 4, 7, dan 9 November 2026 |
| **Yang terdampak** | Titik panas dan angka laporan karhutla | Banjir, rob, cuaca, gelombang, gunung api, berita |
| **Penyebab utama** | Jadwal otomatis GitHub banyak terlewat, dan pemicu penggantinya belum aktif | Proses kualitas udara menerbitkan seluruh situs tanpa mengambil data banjir terbaru |
| **Status** | Selesai | Perbaikan terpasang, menunggu pembuktian |

Data titik panas dan angka karhutla tidak terdampak oleh Masalah 2.

## 1. Latar belakang

Situs centurisk97.id menampilkan data kebencanaan yang menjadi informasi publik dan bahan laporan harian. Data ini diperbarui otomatis oleh serangkaian proses yang berjalan di GitHub, tanpa perlu dijalankan manual.

Setiap proses mengambil data baru dari sumbernya, lalu menerbitkan situs. Penerbitan selalu mengirim **seluruh isi situs sekaligus**, bukan hanya bagian yang berubah. Karena itu, setiap proses harus lebih dulu mengambil data terbaru milik proses lain. Kalau tidak, data lama akan ikut terbit.

Sistem juga memiliki pemeriksa kesegaran. Setiap jenis data punya batas umur, misalnya Himawari 3 jam, titik panas 8 jam, serta banjir dan cuaca 30 jam. Data yang melewati batas disebut **basi**.

## 2. Masalah 1: Data titik panas tertinggal

### Kejadian

Sejak 7 November 2026, pembaruan titik panas yang seharusnya berjalan 10 kali sehari hanya berjalan 5 kali, lalu 2 kali. Akibatnya, data titik panas di situs tertinggal dari data satelit FIRMS, sehingga angka laporan tidak selalu sesuai.

### Penyebab

Masalah ini terjadi karena empat hal yang saling berkaitan:

1. **GitHub melewatkan sebagian besar jadwal otomatis.** Hal ini di luar kendali kami, dan alasannya tidak diketahui.
2. **Pemicu pengganti belum aktif.** Pemicu yang dibuat pada 8 November 2026 membutuhkan token akses GitHub yang belum terpasang. Sistem melewatinya tanpa catatan apa pun, sehingga tidak terlihat.
3. **Pembaruan yang berhasil ditandai gagal.** Pemeriksaan akhir titik panas ikut menilai data Himawari. Saat Himawari basi, pembaruan titik panas dicatat gagal, walaupun datanya sudah terbit dengan benar.
4. **Tanda gagal menahan pemicu berikutnya.** Sesudah tiga kali gagal berturut-turut, pemicu otomatis berhenti selama 6 jam, termasuk pada jam pengumpulan data laporan.

### Kronologi

| Waktu (WIB) | Peristiwa |
| --- | --- |
| 7 November | Jadwal otomatis GitHub mulai banyak terlewat |
| 8 November, 19.26 | Pemicu pengganti dan penahan deck dengan data tertinggal dibuat |
| 9 November, 05.28 sampai 14.10 | Pembaruan titik panas tiga kali berturut-turut ditandai gagal, padahal datanya terbit |
| 9 November, 15.39 | Pemeriksaan menemukan Himawari berumur 6,7 jam dan pemicu pengganti belum pernah berjalan |
| 9 November, sore | Token akses dipasang pada situs |
| 9 November, 16.57 | Pemicu pengganti berjalan untuk pertama kali |
| 9 November, 17.36 | Perbaikan pemeriksaan akhir dan aturan penahanan diterapkan |

### Penanganan

1. Token akses dipasang, sehingga situs memicu pemeriksaan setiap jam tanpa bergantung pada jadwal GitHub.
2. Pembaruan titik panas tidak lagi ditandai gagal bila satu-satunya data yang basi adalah Himawari. Himawari tetap diperiksa setiap jam.
3. Putaran pengumpulan data untuk laporan tetap dicoba walaupun sebelumnya terjadi tiga kali gagal.

### Hasil

| Ukuran, sejak perbaikan sampai 10 November 15.12 WIB | Hasil |
| --- | --- |
| Pemicu pengganti berjalan | 23 dari 23 jam |
| Pembaruan titik panas | 8 berhasil, 1 dibatalkan antrean, 1 sedang berjalan, 0 gagal |
| Pembaruan Himawari | 23 berhasil, 0 gagal |
| Pemeriksa kesegaran situs saat laporan dibuat | Sehat, tidak ada data basi |

**Status: selesai.** Dua jalur cadangan belum pernah terpakai di kondisi nyata karena situasinya belum muncul lagi, yaitu saat hanya Himawari yang basi dan saat tiga kali gagal terjadi pada jam pengumpulan data laporan. Keduanya sudah lolos pengujian.

## 3. Masalah 2: Data non-karhutla sempat tampil versi Oktober

### Kejadian

Saat memeriksa Masalah 1, pemeriksa kesegaran mencatat 11 jenis data basi pada 9 November 2026 pukul 23.57 WIB. Data banjir di situs saat itu bertanggal 19 Oktober 2026 dan data rob bertanggal 13 Oktober 2026, padahal beberapa jam sebelumnya data banjir masih baru. Tanda yang sama tercatat pada 4 dan 7 November 2026.

Data yang terdampak adalah banjir, rob, pasang surut, cuaca, gelombang, gunung api, dan berita kebencanaan.

| Ukuran, sepekan sebelum perbaikan | Nilai |
| --- | --- |
| Penerbitan kualitas udara yang memundurkan data | 6 kali |
| Lama data lama tampil setiap kejadian | 21 sampai 237 menit, rata-rata 92 menit |
| Total lama data lama tampil | Sekitar 9 jam (perkiraan) |
| Kejadian 9 November | 23.24 sampai 00.42 WIB, selama 78 menit |

Angka ini dihitung dari waktu selesai setiap proses, jadi merupakan perkiraan. Data pulih dengan sendirinya setiap kali ada penerbitan lain.

### Penyebab

Proses pembaruan kualitas udara ikut menerbitkan seluruh situs, tetapi tidak mengambil data banjir terbaru. Situs lalu terisi salinan lama yang tersimpan di repositori, yang bertanggal Oktober. Lima proses penerbitan lainnya sudah mengambil data itu dengan benar. Citra satelit juga tidak diambil oleh proses yang sama.

Masalah ini tidak tertangkap lebih awal karena pemeriksaan sebelum terbit hanya memeriksa data karhutla, dan alarm setiap jam hanya berbunyi kalau kebetulan datang saat data lama sedang tampil.

Bukti: tanggal data rob yang tampil sama persis dengan tanggal salinan di repositori, dan urutan waktunya cocok. Pemeriksaan 22.57 WIB sehat, penerbitan kualitas udara 23.24 WIB, pemeriksaan 23.57 WIB mencatat data basi, lalu penerbitan titik panas 00.42 WIB memulihkannya.

### Penanganan

Perbaikan selesai dipasang pada 10 November 2026 pukul 15.02 WIB:

1. Proses kualitas udara kini mengambil data banjir terbaru tepat sebelum terbit. Bila data itu tidak tersedia, penerbitan dibatalkan supaya data lama tidak tampil.
2. Citra satelit dan peringatan BMKG terbaru ikut diambil, sama seperti proses lain.
3. Ditambahkan pemeriksaan otomatis yang menolak setiap proses penerbitan yang tidak mengambil data banjir dan citra terlebih dahulu.

### Hasil

Perbaikan lolos pengujian, dan pemeriksaan otomatis yang baru terbukti menolak versi lama. Situs dalam kondisi sehat saat laporan dibuat.

**Status: menunggu pembuktian.** Belum ada penerbitan kualitas udara sesudah perbaikan akhir dipasang. Perbaikan dianggap terbukti bila sesudah penerbitan berikutnya data banjir tidak mundur.

## 4. Tindak lanjut

| No | Pekerjaan | Keterangan |
| --- | --- | --- |
| 1 | Memastikan data tidak mundur pada penerbitan kualitas udara berikutnya | Menjadi bukti penutupan Masalah 2 |
| 2 | Memeriksa kesesuaian angka pada putaran data laporan pukul 16.10 WIB | Putaran sore pertama sesudah perbaikan |
| 3 | Mencatat masa berlaku token akses | Berlaku sampai [isi tanggal]. Sesudah tanggal itu pemicu pengganti berhenti |
| 4 | Memeriksa apakah ada laporan yang memakai data banjir, cuaca, atau berita pada rentang data lama tampil | Belum diperiksa |

## 5. Sumber data

- Riwayat pembaruan otomatis di GitHub Actions, repositori `terasurbannetwork/poskokarhutla`.
- Pemeriksa kesegaran situs, `centurisk97.id/api/status`, 10 November 2026 pukul 15.12 WIB.
- Catatan pemeriksaan setiap jam, termasuk kejadian 4, 7, dan 9 November 2026.
- Perubahan sistem: commit `aabc7c8d`, `faa8a12a`, `09e8e635`, `3eee5045`, dan `017b563f`.
