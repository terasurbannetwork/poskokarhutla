# KEPUTUSAN-PROFIL: Akun BPBD dengan profil PIC (pilih profil, lalu PIN)

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah (diukur 23 Nov 2026 di D1 produksi)

| Yang diukur | Jumlah |
| --- | --- |
| Baris `instansi_akun` (semua jenis, semua status) | 0 |
| BPBD provinsi dan kab/kota yang perlu akun (38 provinsi, 515 kab/kota di `public/banjir/data/pusat_kec.json`) | 553 |

Meja Lapor Bencana (`/lapor/meja`, KEPUTUSAN-LAPOR-AI K63, D94) hanya bisa dipakai BPBD yang punya akun lembaga aktif. Saat ini belum ada satu pun. Pemilik ingin menguji sebagai BPBD Sumatera Barat dan tidak bisa masuk.

## Keputusan pemilik (23 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | "Oke gw mau buatin untuk user dan akun seluruh BPBD satu Indonesia." Satu akun per BPBD provinsi dan per BPBD kab/kota. |
| K2 | "Misal akunnya BPBD Sumbar satu aja user dan passwordnya tapi ketika masuk dia kaya netflix gitu. Jadi dia bisa pilih profile akun masing-masing." Satu username dan sandi per lembaga; sesudah masuk tampil layar pilih profil. |
| K3 | "Ketika gw klik foto itu nanti dia harus isi pin juga buat bisa masuk." Tiap profil punya PIN sendiri. |
| K4 | Data tiap PIC: "Email, No. HP, NIP, Foto muka, Jabatan." |
| K5 | "Kemudian ada log." Tiap tindakan tercatat atas nama profil yang memakainya. |
| K6 | "Yang perlu dikumpulkan dari mereka adalah 3 kontak PIC untuk mereka bisa akunnya didaftarkan, dan sebelum bisa digunakan." Lalu: "Jadinya. 4 ya." Dicatat sebagai: akun baru bisa dipakai sesudah **3 PIC** terdaftar, paling banyak **4 profil** per akun (jawaban pilihan "Wajib 3, maks 4"). |
| K7 | Data PIC diisi BPBD sendiri, lalu admin BNPB menyetujui (jawaban pilihan "BPBD isi sendiri"). |
| K8 | Foto muka hanya foto profil di layar pilih profil, bukan pencocokan wajah (jawaban pilihan "Foto profil saja"). |
| K9 | Login lewat nomor WA dan kode sekali pakai (`/masuk`) untuk akun BPBD **diganti** dengan username, sandi, pilih profil, dan PIN (jawaban pilihan "Ganti dengan profil"). |

## Bertentangan dengan keputusan lama (wajib ditanyakan, lihat Q1)

| Keputusan lama | Isinya | Yang berbenturan |
| --- | --- | --- |
| KEPUTUSAN-MASUK K2, D6, D7, D15 | Orang masuk ke akun lembaga lewat nomor WA sebagai anggota (`mk_anggota`), termasuk undangan berantai | K9 mengganti jalan ini untuk akun BPBD |
| KEPUTUSAN-LAPOR-AI D94 dan `src/lapor_ai.js` `hakMeja` | Meja BPBD hanya membaca sesi `/masuk`; kuki `sesi_instansi` berjalur `/instansi` dan `/api/instansi` tidak sampai ke `/api/lapor` | Sesi profil harus bisa dibaca meja `/lapor` |
| KEPUTUSAN-MASUK K11, D16 | Aktivasi pertama akun instansi wajib surat tugas dan kartu pegawai | K6 dan K7 menambah 3 PIC; belum jelas apakah surat dan kartu tetap wajib |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Akun lembaga tetap baris `instansi_akun` jenis `pemprov`, `pemkab`, `pemkot` (satu per wilayah, `migrations/0029_instansi.sql`). Tidak ada jenis akun baru. Label di layar "BPBD Provinsi X" atau "BPBD Kabupaten/Kota X" seperti `src/lapor_meja_hak.js`. | Meja, siklus, logpal, dan hak wilayah sudah membaca baris ini. |
| D2 | Profil adalah tabel baru anak `instansi_akun`, paling banyak 4 baris aktif per akun (dijaga di Worker dan di D1). | K2, K6. |
| D3 | Sesi dua tingkat: username dan sandi membuka sesi **akun** yang hanya boleh melihat layar pilih profil, mengisi profil, dan memasukkan PIN. Semua rute kerja butuh sesi **profil** (sesi akun + PIN benar). | K3: tanpa PIN tidak ada akses kerja. |
| D4 | Jejak tindakan (`instansi_jejak`, riwayat meja lapor, log masuk) menulis id profil di samping id akun. Log masuk mencatat berhasil, PIN salah, dan terkunci. | K5. |
| D5 | Akun berstatus `belum_klaim` atau `menunggu` sampai 3 profil terisi lengkap dan admin BNPB menyetujui; baru `aktif`. Profil keempat boleh ditambah sesudah aktif, juga lewat persetujuan admin. | K6, K7. |
| D6 | Foto muka diambil dari kamera atau galeri, diperkecil di peramban, disimpan di R2 di balik sesi. Tidak ada vektor wajah dan tidak ada pencocokan. | K8. |
| D7 | Pembuatan akun massal memakai `POST /api/instansi/admin/buat` yang ada, diberi saringan jenis supaya hanya membuat akun pemda (553 akun). Teks undangan diganti dari "tugas api" ke langkah daftar 3 PIC. | K1; Polri dan TNI di luar paket ini (Q6). |
| D8 | Nomor migrasi diambil saat tiket dikerjakan (terakhir di repo 0163). | Menghindari bentrok antarpaket. |

## Jawaban pemilik (23 Nov 2026)

| No | Jawaban |
| --- | --- |
| K10 | "Buatkan semua." dan "Push and deploy." Semua tiket PF-00 sampai PF-06 dikerjakan dengan bawaan sementara Q1 sampai Q8 dan N1 sampai N7 (`PRD.md` bagian 5); rumusan persetujuan data pribadi disusun agent. Bawaan tetap bertanda dan bisa diubah pemilik kapan pun. |

## Pertanyaan terbuka

| No | Pertanyaan | Bawaan sementara | Tiket |
| --- | --- | --- | --- |
| Q1 | K9 "ganti" berarti pintu `/masuk` (kode WA) **ditutup** untuk akun BPBD, termasuk anggota dan undangan berantai yang sudah dirancang di paket pintu masuk? | **[BAWAAN SEMENTARA]** Untuk akun pemda: masuk hanya lewat username, sandi, profil, PIN. Kode WA tidak menerbitkan sesi akun pemda. Akun umum `/masuk` dan peran lain tidak berubah. | PF-04 |
| Q2 | PIN berapa angka, dan berapa kali salah sebelum profil terkunci? | **[BAWAAN SEMENTARA]** 6 angka, disimpan sebagai hash bergaram. Salah 5 kali: profil terkunci 15 menit; 10 kali dalam sehari: terkunci sampai admin membuka. | PF-02 |
| Q3 | Siapa yang mengatur ulang PIN yang lupa? | **[BAWAAN SEMENTARA]** Admin BNPB dari `/admin/instansi`. PIC lain di lembaga yang sama tidak bisa. | PF-06 |
| Q4 | Surat tugas dan kartu pegawai tetap wajib sebelum aktif (KEPUTUSAN-MASUK K11)? | **[BAWAAN SEMENTARA]** Tetap wajib, satu kali per akun, di samping 3 PIC. | PF-02 |
| Q5 | Sandi akun bersama dipegang siapa, dan diganti bila PIC pindah? | **[BAWAAN SEMENTARA]** Sandi lembaga dipegang semua PIC. Admin bisa reset; PIC yang dicabut tidak bisa masuk lagi karena profilnya mati, walau tahu sandinya. | PF-02 |
| Q6 | Akun Polda, Polres, Kodam, Kodim ikut dibuat dan ikut model profil? | **[BAWAAN SEMENTARA]** Tidak dibuat di paket ini. | PF-05 |
| Q7 | Log bisa dilihat siapa, dan disimpan berapa lama? | **[BAWAAN SEMENTARA]** Admin BNPB melihat semua; tiap PIC melihat log lembaganya sendiri. Disimpan 2 tahun. | PF-04 |
| Q8 | Sesi profil berlaku berapa lama, dan apakah ganti profil butuh PIN lagi? | **[BAWAAN SEMENTARA]** Sesi profil 12 jam; ganti profil selalu lewat layar pilih profil dan PIN. | PF-02 |

## Perluasan (pemilik 23 Nov 2026: "Gas ini")

| No | Keputusan pemilik |
| --- | --- |
| K11 | Papan aktivasi 553 BPBD: satu layar BNPB yang menunjukkan BPBD mana yang sudah punya 3 PIC, mana yang menunggu persetujuan, mana yang belum pernah masuk, dengan tombol kirim ulang undangan. |
| K12 | Laporan di meja `/lapor` diambil oleh satu PIC ("Ditangani: Andi, Pusdalops BPBD Padang"). Dari log per profil dihitung waktu respons tiap BPBD (laporan masuk, dilihat, ditangani) sebagai bahan Kepala BNPB tanpa diketik siapa pun. |
| K13 | Buku kontak darurat dari PIC: nomor PIC terverifikasi dipakai Pusdalops untuk menelepon atau WA PIC yang sedang jaga, menggantikan kontak BPBD hasil panen situs. |

| No | Keputusan rancangan (agent) | Alasan |
| --- | --- | --- |
| D9 | K11 memperluas papan aktivasi yang sudah ada (`public/admin/aktivasi.js`, paket pintu-masuk F-11) dengan kolom profil; tidak ada layar kedua. | Satu rumah per papan. |
| D10 | K12: pengambil laporan adalah profil (bukan akun). Waktu respons dihitung dari stempel yang sudah ada di riwayat meja dan log profil; median dan p90 per BPBD, hanya untuk staf BNPB. Laporan yang belum diambil tidak dihitung nol. | Angka dari mesin; kosong bukan nol. |
| D11 | K13: nomor PIC hanya tampil untuk staf BNPB (meja BNPB dan buku kontak staf), tidak pernah ke pelapor warga dan tidak pernah di `public/`. Pelapor tetap memakai `public/data/bpbd_kontak.json` (KEPUTUSAN-LAPOR-AI K88). Kab tanpa PIC aktif tetap memakai kontak panen. | Nomor HP PIC data pribadi (KEAMANAN-PRIVASI). |
| D12 | "PIC yang sedang jaga" belum ada (jadwal piket di luar paket ini). Bawaan sementara: urutan tampil = PIC yang terakhir aktif di meja lebih dulu. | Q9. |

| No | Pertanyaan | Bawaan sementara | Tiket |
| --- | --- | --- | --- |
| Q9 | Siapa "PIC yang sedang jaga"? | **[BAWAAN SEMENTARA]** Semua PIC aktif, urut yang terakhir aktif lebih dulu; jadwal piket menyusul bila diminta. | PF-09 |
| Q10 | Waktu respons dibandingkan antar-BPBD di layar Kepala (peringkat) atau hanya per BPBD? | **[BAWAAN SEMENTARA]** Tabel per BPBD tanpa peringkat, hanya BPBD dengan paling sedikit 5 laporan dalam 30 hari. | PF-08 |

## Jawaban pemilik (23 Nov 2026, lanjutan)

| No | Jawaban |
| --- | --- |
| K14 | Ditanya "Pemilik akun boleh melihat NIP, email, HP PIC yang masih draf, atau tetap ketik ulang?", pemilik menjawab "Boleh, untuk draf". Kisi `GET /api/instansi/profil` mengirim NIP, email, dan HP untuk profil berstatus `draf` ke sesi akun lembaga itu; profil `menunggu`, `aktif`, dan `dicabut` tetap hanya tampil penuh ke profilnya sendiri (sesudah PIN) dan admin BNPB. Gerbang: `tests/warga/profil.test.mjs` UP-4 (draf tampil) dan UP-9 (aktif tersembunyi). |

| K15 | 24 Nov 2026. Pertanyaannya: "Rapor respons boleh dibaca Pusdalops dan Koordalops, atau hanya admin BNPB?" Jawaban pemilik: "Boleh dibaca pusdalops dan koordalops". `GET /api/lapor/respons` terbuka untuk admin atau moderator dan untuk staf berperan `pusdalops` atau `koordalops`. Jalurnya `hakMeja`, cakupan BNPB. Staf berperan lain dan sesi profil BPBD tetap ditolak 403. Gerbang: `tests/warga/profil_ambil.test.mjs`, uji "rapor respons: staf Pusdalops dan Koordalops boleh membaca". |


## Jawaban pemilik 25 Nov 2026

Pemilik: "gas semua bawaan". Semua pertanyaan terbuka di berkas ini yang punya bawaan sementara kini **diputuskan sesuai bawaannya**, kecuali yang tertulis di bawah. Rekap pertanyaan: `data/kajian-bnpb/PERTANYAAN-TERBUKA.md`.

