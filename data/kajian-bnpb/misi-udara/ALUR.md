# ALUR: Misi Udara

Otoritas: `KEPUTUSAN-MISI.md`. Alur ini mengikuti tahap di DESAIN-TEKNIS: tahap 1 perintah baris, tahap 2 bot WA dan penyimpanan, tahap 3 layar.
Label [SEMENTARA] menunggu jawaban Q yang disebut.

## 1. Alur utama (tahap 1, staf Pusdalops)

1. Koordinasi lapangan menghasilkan titik: base, titik tujuan berurutan, titik akhir. Titik datang sebagai koordinat desimal, DMS, tautan Google Maps, atau plus code (D8, K5). Nama tempat tanpa koordinat ditolak.
2. Staf memilih bencana dan jenis misi (`dropping`, `pantau`, `evakuasi`, `angkut`, `cari`, `kunjungan`).
3. Staf mengisi base awal, daftar titik, base akhir (bawaan sama dengan base awal), kecepatan atau tipe helikopter, dan waktu di titik bila misinya mewajibkan (ALGORITMA bagian 5).
4. Mesin membaca tiap titik. Tautan pendek dibuka hanya oleh perintah baris atau bot WA (Q11). Titik di luar lintang -11,5 sampai 6,5 atau bujur 94,5 sampai 141,5 ditolak dengan pesan.
5. Mesin menyusun leg dalam urutan yang diketik (K1): haluan sejati, km, NM, menit.
6. Mesin membentuk zona semua bencana dan memeriksa tiap titik darat dan tiap leg (ALGORITMA bagian 3 dan 4).
7. Mesin menghitung daya tahan (bila tipe dipilih dan datanya ada), kelayakan terbang di base dan titik darat, dan pola pencarian bila misinya `cari`.
8. Mesin menulis PDF tiga halaman, KML, GPX, teks WA, dan JSON ke folder di luar repo (D7). Status flight plan tercetak di halaman 1.
9. Staf membaca halaman 3 (yang perlu diputuskan, baris "tidak diperiksa", label sementara), lalu mengirim ke pilot dan komando.

## 2. Peran setelah PDF terkirim

| Pemakai | Menerima | Yang dilakukan | Yang bukan wewenang sistem |
| ------- | -------- | -------------- | -------------------------- |
| Staf Pusdalops | semua keluaran | menyusun, membuat ulang versi, memutuskan butir "perlu diputuskan orang", mengirim | menyatakan rute layak terbang |
| Pilot dan operator | halaman 2, KML, GPX | memeriksa leg, memuat KML atau GPX ke GPS, membaca catatan zona | rute, ketinggian, dan izin wilayah udara ditetapkan pilot (PIC) dan komando |
| Komando | halaman 1 dan 3, teks WA | membaca ringkasan, menjawab butir yang perlu diputuskan, menyetujui | menggantikan keputusan PIC |
| Tim darat | daftar periksa lapangan di halaman 3 | menyiapkan lapangan pendaratan atau zona dropping (angka PMS 510, Q6) | dinilai mesin dari citra |

## 3. Titik "menyusul" dan buat ulang versi (F-3)

1. Titik yang belum pasti diisi titik sementara dan ditandai `menyusul`.
2. Flight plan tetap dibuat; titik itu bertanda "titik menyusul" di peta, tabel leg, dan teks WA. Angka leg yang menyentuh titik itu berlabel sementara.
3. Saat koordinat pasti masuk, staf menjalankan perintah yang sama dengan titik pengganti. Mesin membuat versi bertambah (versi 2, 3, dan seterusnya); versi lama tidak ditimpa.
4. Perubahan titik mengulang seluruh pemeriksaan zona, daya tahan, dan kelayakan terbang. Keluaran versi baru memuat jam pembuatan baru.

## 4. Status flight plan dan peralihannya

Status berasal dari pemeriksaan zona (ALGORITMA bagian 4). Tidak ada status "aman".

| Status | Arti | Peralihan berikutnya |
| ------ | ---- | -------------------- |
| tidak memotong zona yang diketahui | tidak ada leg atau titik darat yang memotong zona larangan per jam data yang tercetak | titik berubah atau data zona berubah: buat ulang, versi bertambah |
| dibelokkan | mesin menyisipkan titik belokan `BL` menghindari lingkaran larangan | sama; staf dan pilot menilai belokan |
| perlu diputuskan orang | leg memotong poligon larangan, belokan gagal, atau gunung Level II ke atas tanpa radius dalam 30 km [SEMENTARA] | komando atau staf mengubah titik, menambah zona manual (Q14), atau menyetujui; lalu buat ulang |
| ditolak | titik darat di dalam zona larangan; flight plan tidak dibuat | staf mengganti titik, lalu menjalankan ulang |

Status ini juga nilai `status_zona` di `pb_misi` (tahap 2): `tidak_memotong`, `dibelokkan`, `perlu_diputuskan`, `ditolak`.

## 5. Alur "perlu diputuskan orang" dan "ditolak"

1. PDF halaman 3 memuat daftar butir yang perlu diputuskan, tiap butir menyebut zona, sumber, dan jam data.
2. Staf membawa butir ke komando. Keputusan yang mungkin: mengganti titik, memberi leg tambahan lewat titik antara yang diketik, memasukkan zona manual dengan alasan dan sumber, atau menerima rute dengan tanggung jawab PIC.
3. Hasil keputusan dimasukkan sebagai masukan baru (titik atau zona manual) dan flight plan dibuat ulang.
4. Pada `ditolak`, pesan menyebut zona, sumber, dan jarak titik ke tepi zona. Tidak ada berkas PDF.

## 6. Tahap 2: bot WA dan penyimpanan

1. Staf mengirim pesan berformat ke grup yang berhak (Q10, Q11). Pengurai di `scripts/wa/misi_udara.mjs` membaca bencana, misi, base, dan titik.
2. Bot menjalankan mesin yang sama dengan perintah baris dan membalas PDF di grup itu.
3. Flight plan disimpan di tabel `pb_misi` (versi dari rencana yang sama disatukan kolom `rencana`); berkas ditulis sekali ke R2 `operasi/misi/` per versi. Worker tidak menghitung rute.

## 7. Tahap 3: layar di `/operasi`

1. Staf `pusdalops` membuka seksi Misi udara, memilih jenis misi, mengisi formulir, dan melihat pratinjau peta dengan zona.
2. Permintaan masuk lewat `POST /api/pb/misi` (koordinat saja, bukan tautan); workflow menjalankan mesin; hasil tampil di daftar flight plan per bencana dan tanggal.
3. Staf mengunduh PDF, KML, GPX.
4. Setelah misi, staf mencatat hasil (F-15): terlaksana atau batal beserta alasannya, muatan terkirim, jumlah orang terangkut tanpa nama.

## 8. Kasus 15 Nov 2026 sebagai alur contoh

Lanud Soewondo, titik darat Lapangan Bola Jambi di Kec. Sultan Daulat (2.7949, 97.8966), titik Pandan (menyusul), kembali ke Lanud Soewondo, kecepatan 200 km/jam: tiga leg 121, 162, 208 km, total 491 km dan 147 menit. Bila koordinat Pandan diganti, staf membuat versi 2 dan mesin menghitung ulang semua angka.
