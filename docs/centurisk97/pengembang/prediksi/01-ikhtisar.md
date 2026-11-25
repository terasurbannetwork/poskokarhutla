# Ikhtisar prediksi dan tab Besok

Halaman ini memberi gambaran modul Prediksi dan merinci tab Prakiraan 3 hari (Besok) untuk pengembang.

## Ringkasan

Modul ini menjawab satu pertanyaan kerja staf kebencanaan: kabupaten/kota mana yang perlu bersiap dalam tiga hari ke depan, untuk bencana apa, dan seberapa jauh angka itu boleh dipercaya. Modul terdiri dari empat bagian.

1. **Prakiraan 3 hari (tab Besok).** Satu baris per kabupaten/kota (514 kab/kota), delapan kolom bencana: hujan, banjir, longsor, titik panas, asap, gelombang, rob, angin kencang. Setiap prakiraan dibekukan sebelum kejadian, lalu dinilai terhadap pengamatan. Nilainya tampil di tab Ketepatan prakiraan (rapor).
2. **Tangga peringatan (tab Tangga).** Untuk satu kabupaten/kota, pernyataan resmi BMKG dan prediksi kita ditata dari skala terjauh ke terdekat: musim, bulan, dasarian, 10 hari, sepekan, 3 hari, jam. Dua ancaman tampil berdampingan: kering (kekeringan, karhutla, asap) dan basah (banjir, longsor).
3. **Halaman pendukung.** Paparan dampak, Laporan provinsi (cetak A4), Konfirmasi lapangan (formulir regu), dan halaman ringkas tanpa tab `/prediksi/ringkas` untuk Pusdalops dan BPBD.
4. **Prakiraan lawan Kejadian (rencana).** Paket dokumen di `data/kajian-bnpb/prediksi-kejadian/` merancang perbandingan prakiraan dengan kejadian nyata di `/bnpb/dalops`. Sampai 24 November 2026 baru paket dokumennya (tiket PK-0) yang selesai; kodenya belum dibangun. Lihat bagian Metode dan Batasan.

Pengguna yang dilayani: staf Pusdalops dan Koordalops BNPB, BPBD, regu lapangan (lewat formulir konfirmasi), dan pimpinan yang membaca ringkasan. Seluruh layar `/prediksi` adalah alat bantu staf dan tidak menampilkan peringatan kepada masyarakat. Data yang sama dibaca juga oleh fitur peringatan dini warga dan chat Lapor Bencana (lihat "Pemakai data di luar /prediksi" pada Referensi teknis), sehingga perubahan format berkas data berdampak ke luar layar ini. Modul tidak pernah menyatakan sebuah wilayah bebas dari ancaman; sel tanpa pernyataan ditulis "tidak disebut" atau "belum ada data".

Prinsip yang berlaku di seluruh modul:

- Prakiraan dibekukan sebelum kejadian dan arsipnya hanya bertambah (append-only).
- Kosong bukan nol. Sel tanpa data tampil "–" dan tidak dihitung sebagai level 0; di rapor, kab tanpa pengamatan tidak masuk pasangan.
- Pernyataan resmi BMKG dan prediksi kita selalu dipisahkan. Tidak ada skor gabungan di antara keduanya.
- Model yang belum terbukti lebih baik dari pembanding (persistensi dan klimatologi) ditulis "belum teruji" atau "belum unggul", dan dalam dokumen ini diperlakukan sebagai hipotesis.

## Panduan pengguna

Semua halaman berada di `centurisk97.id` dan berstatus `noindex`. Di host produksi, halaman `/prediksi` dan `/prediksi/ringkas` berada di balik sesi (rute dan gerbangnya di `src/worker.js:748`, `src/worker.js:749`, `src/worker.js:967`): hanya admin dan staf berperan `operator_cc` (operator command center) yang dapat membukanya (`src/worker.js:748-749`, `src/worker.js:967-968`). Akun pemirsa belum punya tab prediksi (daftar tab pemirsa hanya peta, insight, berita, tren, dampak, sim, monitor, foto, dan pusdalops di `src/pemirsa.js:14`), sehingga pemirsa dialihkan ke tab pertamanya (`src/pemirsa.js:41-48`). Berkas data JSON di `/prediksi/data/*.json` disebut di komentar kode sebagai data statis publik. Masuk lewat `/admin/masuk`.

Menu `/prediksi` memuat enam tab (`public/prediksi/index.html:34`). Tab dapat dibuka langsung lewat hash alamat: `#rapor`, `#tangga` atau `#tangga/<id kab>`, `#dampak/<kode provinsi>`, `#laporan/<kode provinsi>` atau `#laporan/<kode provinsi>/<jenis>`, `#konfirmasi`. Tab Besok adalah halaman awal tanpa hash.


## Tab Prakiraan 3 hari (Besok)

Jalur: `https://centurisk97.id/prediksi`. Sumber data: `public/prediksi/data/prediksi.json`.

Langkah pakai:

1. Pilih hari sasaran pada tombol segmen: Besok, Lusa, atau H+3 (tanggal tampil di tiap tombol).
2. Saring wilayah lewat kotak "Cari kab/kota" dan pilihan provinsi.
3. Pilih jenis bencana pada pil berikon selebar layar: Semua, Hujan, Banjir, Longsor, Titik panas, Asap, Gelombang dan rob, Angin. Angka di tiap pil adalah jumlah kab/kota yang levelnya Siaga atau Awas (level 2 ke atas) untuk bencana itu pada hari terpilih.
4. Baca bagian "Perlu tindakan" di atas tabel. Tiap aturan yang terpicu menjadi satu baris lipat berisi jumlah kab/kota, jiwa terpapar, dan perkiraan mengungsi. Membukanya menampilkan tabel kab/kota beserta dampak dan kebutuhan harian (air, hunian, jamban, kalori). Semua angka ini berpil "perkiraan, belum diuji balik".
5. Baca tabel kab/kota. Satu baris satu kab/kota. Kolom: Kab/kota, Jiwa, Hujan, Banjir, Longsor, Titik panas, Asap, Gelombang, Rob, Angin. Klik kepala kolom untuk mengurutkan (klik kedua membalik arah). Bawaan: level tertinggi lintas kolom menurun, lalu jumlah jiwa menurun. Bila satu pil bencana dipilih, tabel hanya memuat kab/kota level Waspada ke atas untuk bencana itu. Tabel dirender 60 baris sekali tampil; tombol "Tampilkan lagi" menambah 60 baris.
6. Klik satu baris untuk membuka pop-up rincian kab/kota: jam mulai dan lama hujan, peluang per ambang (1, 20, 50 mm), peluang titik panas, level banjir dan longsor beserta peluang Siaga, PM2,5, tinggi gelombang, muka laut rob, embusan angin, riwayat bulan dari logbook Pusdalops, dan dampak aturan yang terpicu.
7. Pilih "Peta" pada segmen Tabel/Peta untuk melihat peta kab/kota berwarna menurut bencana terpilih. Pilih bencana lewat dropdown di dalam peta, dan saring level lewat tiga tombol Waspada, Siaga, Awas (tiap tombol menampilkan jumlah kab/kota). Arahkan kursor untuk tooltip, klik wilayah untuk membuka pop-up rincian. Batas wilayah dimuat saat tampilan peta pertama kali dibuka.

Arti warna dan label:

| Warna sel | Level | Arti |
| --- | --- | --- |
| Abu | 0 Normal | Di bawah ambang terendah, atau aturan belum terpenuhi |
| Kuning | 1 Waspada | Ambang pertama terlewati |
| Oranye | 2 Siaga | Dihitung pada angka pil bencana |
| Merah | 3 Awas | Ambang tertinggi |
| "–" | tanpa data | Kab/kota tidak punya prakiraan untuk kolom itu (mis. kab tanpa titik rob atau titik pesisir) |

Arti angka utama di sel: Hujan = jumlah hujan 24 jam dalam mm; Banjir dan Longsor = nama level; Titik panas = peluang (dibulatkan ke 5%, "<5%" dan ">95%" di ujung); Asap = PM2,5 dalam µg/m³ beserta kategori ISPU; Gelombang = tinggi maksimum dalam m; Rob = "lewat p95" atau "di bawah p95"; Angin = embusan maksimum km/jam.

Pil di kepala kolom (keadaan uji, aturan K17 dari `KEPUTUSAN-BESOK.md`):

- **teruji** (hijau): sedikitnya 30 hari sasaran berbeda sudah dinilai dan batas bawah selang kepercayaan 90% selisih Brier terhadap persistensi dan klimatologi di atas nol.
- **belum unggul** (merah): syarat hari terpenuhi tetapi selangnya memuat nol atau model kalah dari pembanding.
- **belum teruji** (abu): kurang dari 30 hari sasaran, atau belum ada sumber pengamatan (asap, rob, gelombang, angin).

Hal yang sering disalahpahami:

- Warna Titik panas dibuat dari peluang (batas 20, 50, 80%) hanya untuk tampilan. Itu bukan status resmi.
- Tidak adanya kab/kota di level tertentu bukan pernyataan tidak ada ancaman; prakiraan punya batasan (lihat Batasan).
- Peluang hujan tanpa ansambel (kolom `m` bernilai 0) berpil "skor kasar": itu skor dari jumlah hujan deterministik, bukan peluang terkalibrasi.
- Pil "teruji" hanya untuk kolom ukuran yang dinilai (hujan memakai ambang 20 mm; titik panas, banjir, dan longsor memakai kolom peluangnya), bukan seluruh bencana.
- Prakiraan di tab ini bersumber dari model global (Open-Meteo, CAMS, ECMWF), bukan dari pernyataan BMKG. Pernyataan BMKG ada di tab Tangga.
