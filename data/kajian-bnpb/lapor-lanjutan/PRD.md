# PRD: Data lanjutan BPBD

## Tujuan

Sesudah laporan awal, BPBD mendata dampak per objek (rumah, prasarana, pengungsi, korban, usaha, kebutuhan) dengan foto bergeotag, dari WA atau web, bersama timnya, lalu menutup kejadian dengan kondisi akhir yang jujur. Angka rekap untuk meja `dampak`, meja `pengungsi`, Lifeline, dan Jitupasna dihitung dari daftar, tidak diketik ulang.

## Peran

| Peran | Bisa | Tidak bisa |
| --- | --- | --- |
| Ketua berkas (pelapor tahap 1, tingkat `bpbd`) | Semua isian berkas, menambah dan mencabut anggota, menjawab pertanyaan harian, menutup | Melihat berkas kab lain |
| Anggota tim (`bpbd_tim`) | Menambah dan mengubah objek di berkasnya | Menutup berkas, mengubah tim |
| Staf BNPB Pusdalops | Membaca semua berkas, menerima rekap ke meja, menerima penutupan, mencabut anggota | Mengubah isian objek BPBD |
| Warga, `bpbd_klaim` | Tidak ada tahap 2 | Semua di atas |

## Fitur

| No | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Pembukaan tahap 2 otomatis sesudah laporan awal BPBD terkirim, dengan tautan web | D1, D2 |
| F-2 | Data rumah per rumah: penghuni, pemilik, alamat, titik, tingkat rusak, status huni, jumlah jiwa, foto 2 wajib, video opsional | K2, D3, Q1, Q9 |
| F-3 | Data prasarana: jenis, nama, titik, tingkat rusak, fungsi, panjang rusak, jalur alternatif, kendaraan yang bisa lewat, foto 2 wajib | K2, D7 |
| F-4 | Tempat pengungsian: nama, titik, jenis, kapasitas, air, MCK, dapur umum, listrik, foto 1 wajib | D6 |
| F-5 | Pengungsi per jiwa berinduk KK: nama, umur, L/P, desa asal, nomor HP (satu per KK), foto wajah (anak tidak wajib), rentan, kebutuhan khusus, tanggal masuk dan keluar | K2, K4, Q10 |
| F-6 | Korban per orang: meninggal, hilang, luka; kontak keluarga; untuk hilang: lokasi dan waktu terakhir terlihat, ciri, status pencarian | K2, Q8 |
| F-7 | Usaha: sawah, kebun, tambak (ha), ternak (ekor), kios (unit), foto | D3, D8 |
| F-8 | Kebutuhan dan bantuan masuk per titik | D3 |
| F-9 | Status penanganan berkas: status darurat, nomor dan tanggal SK, posko, upaya, personel | D3 |
| F-10 | Tim: tambah dan cabut anggota | K6, D11 |
| F-11 | Rekap otomatis ke meja `dampak` dan meja `pengungsi`, isyarat ke Lifeline, bahan Jitupasna lewat Terima staf | D5 sampai D8 |
| F-12 | Pertanyaan harian "masih berlangsung?" ke ketua | K3, D12 |
| F-13 | Penutupan: isian akhir, kondisi akhir mesin, selesai atau selesai dengan catatan, versi beku | D13, D14 |
| F-14 | Luring: isian dan foto antre lalu terkirim saat ada sinyal | K5 |
| F-15 | Rincian berkas di `/lapor/meja` untuk staf: daftar objek per jenis, peta, rekap, riwayat | D17 |

## Larangan

- Tidak ada versi publik dan tidak ada angka tahap 2 di layar warga (D17).
- Tidak ada pencocokan orang (K8, D16).
- Tidak ada buku kejadian kedua; fase Buku Besar hanya berubah lewat penerimaan staf (D14).
- BPBD tidak menaksir rupiah per objek (D8).
- Kosong tidak pernah jadi nol (D9, D15).
- Tidak menulis "aman".

## Di luar lingkup

Pencocokan lintas kab, penyaluran bantuan per KK, kartu pengungsi cetak, integrasi Dukcapil.
