# ALUR: Lapor Bencana BNPB

## 1. Status sesi laporan

```
baru -> identitas -> bercerita -> melengkapi -> ringkasan -> terkirim -> (perkembangan)*
                                        \-> batal          \-> kedaluwarsa (24 jam tanpa pesan)
```

- `identitas` (D18): nomor baru ditanya berurutan: "Melapor sebagai: 1 Warga, 2 Petugas BPBD", lalu nama, lalu (BPBD) kab/kota dan jabatan. Nomor yang sudah dikenal cukup konfirmasi satu langkah. Cerita kejadian yang terlanjur dikirim di pesan pertama disimpan dan diurai sesudah identitas.

- `bercerita`: pesan pertama sudah diurai; kode memilih isian berikutnya.
- `melengkapi`: bot menanyakan isian satu per satu. Tiga kelompok wajib dulu (jenis dan subjenis, waktu, lokasi), lalu kelompok lain berurutan menurut spek.
- `ringkasan`: semua wajib terisi dan kelompok lain sudah ditanyakan sekali (dijawab, "tidak ada", atau "belum tahu"). Bot mengirim ringkasan dan menu `1 Kirim, 2 Ubah, 3 Batal` (Tambah foto masuk menu saat LA-05 selesai).
- Kedaluwarsa dihitung malas saat pesan masuk atau sesi dibaca (24 jam sejak `diubah`), tanpa cron baru.
- `terkirim`: laporan beku versi 1; nomor `LA-DDMMYY-NN` terbit; diteruskan sesuai fase.
- `perkembangan`: `update LA-...` membuka putaran baru atas laporan yang sama; tiap kiriman membuat versi baru, versi lama tidak ditimpa.

Satu nomor paling banyak memegang satu sesi berstatus `bercerita` sampai `ringkasan` sekaligus. Pesan dari pintu mana pun masuk ke sesi itu.

## 2. Pintu WA (F0)

1. Pelapor uji mengirim cerita atau `lapor`. Gateway mengenali nomor ada di daftar izin lapor (tabel `lapor_izin`, salinan gateway disegarkan tiap 5 menit) dan meneruskan ke `POST /api/lapor/pesan` (kunci `WA_MESIN`), bukan ke jalur bot laporan.
2. Worker menjalankan satu putaran (ALGORITMA A1) dan menjawab teks balasan. Gateway mengirimnya lewat limiter sebagai balasan percakapan.
3. Pesan "Bagikan lokasi" diteruskan sebagai lintang dan bujur. Foto yang dikirim di chat diunduh gateway dan diteruskan ke `POST /api/lapor/foto` bersama jam pesan; Worker menempelkan lokasi WA terdekat di sesi (D16) dan bot membalas "Foto diterima: waktu dan lokasi WA terekam" atau meminta Bagikan lokasi bila belum ada.
4. Untuk lencana GPS perangkat, balasan kelompok foto juga memuat tautan `https://centurisk97.id/lapor/foto?t=<token>` (opsional).
5. Saat terkirim: tiket `LA-...` berstatus `baru` terbit (D20), PDF dibuat (D21), pelapor menerima teks laporan baku dan PDF-nya; PEMILIK menerima salinan berjudul `*Laporan baru LA-...*` dengan tautan monitoring.
6. Saat staf memindah tiket ke `ditindaklanjuti` atau `selesai`, pelapor menerima kabar singkat bertemplat lewat WA.

Pembuatan PDF: Worker menaruh permintaan di antrean D1 (`lapor_pdf`, status `antre`); mesin bot menarik antrean itu tiap menit (dan segera bila gateway yang meneruskan kiriman), mencetak `/lapor/l/<nomor>?cetak=1` dengan Playwright memakai token cetak berumur pendek, mengunggah PDF ke Worker (R2 `lapor/pdf/`), lalu gateway mengirimnya ke pelapor. Pintu web tetap menampilkan halaman laporan dan tombol Cetak peramban selama PDF belum ada.

Nomor di luar izin lapor tetap mengikuti perilaku gateway sekarang (bot laporan, atau "Nomor belum terdaftar").

Pemisahan dengan bot laporan: untuk nomor yang terdaftar di keduanya, kata `lapor` atau sesi lapor yang hidup mengarah ke mesin lapor; `buat ...`, `final`, angka menu proyek, dan bahan berlabel Diteruskan tetap ke bot laporan. Aturan arah ada di `scripts/wa/arah.cjs`.

## 3. Pintu web (F0)

1. Pelapor membuka `/lapor`. Tanpa sesi, halaman meminta masuk lewat `/masuk` (kode sekali pakai ke WA); sesudah masuk kembali ke `/lapor`.
2. Nomor akun di luar izin uji melihat "Layanan ini masih uji coba terbatas."
3. Sesi lapor yang hidup dari WA tampil lengkap dengan riwayat chatnya; pelapor melanjutkan.
4. Tombol di atas kotak ketik: lokasi (GPS perangkat), kamera atau galeri (aturan foto D11), "belum tahu". Pilihan jenis tampil sebagai tombol.
5. Ringkasan tampil sebagai kartu isian yang bisa diketuk untuk diubah. Tombol Kirim.
6. Sesudah terkirim, halaman menampilkan laporan baku dan tombol Cetak dan Salin teks.

## 4. Monitoring dan dashboard `/lapor/meja` (F0, K7, K9, D22)

1. Staf bersesi (Q12) membuka `/lapor/meja`. Tab bawaan Peta: titik tiap laporan di lokasi kejadian, warna = status tiket, bentuk ikon = jenis; filter jenis, tingkat sumber, status, kab, rentang waktu; ringkasan angka di panel samping (laporan hari ini, belum ditelaah, per jenis).
2. Tab Daftar: tabel waktu, tiket, nama pelapor, nomor WA, peran, jenis dan subjenis, kab, persen lengkap, foto, status. Urut terbaru; cari nomor tiket, nama, atau nomor WA.
3. Klik titik atau baris membuka rincian di panel: identitas pelapor, isian per kelompok dengan asal tiap isian (kutipan, GPS, lokasi WA, sistem), foto berlencana, transkrip, tombol PDF, riwayat tiket, dan aksi: ubah status dengan catatan, konfirmasi peran BPBD.
4. Tab Foto: galeri seperti galeri foto publik, hanya foto laporan; pop-up menautkan ke laporannya.
5. Data diperbarui saat tab dibuka dan tiap 60 detik selama layar terlihat (tanpa cron baru; kueri berindeks waktu, lihat kuota D1).

## 5. Verifikasi dua arah (F1, menunggu Q5 dan Q8)

1. Staf BNPB membuka laporan warga di `/lapor/meja`, mengetuk Minta verifikasi.
2. Sistem mengirim pesan ke kontak BPBD kab/kota laporan itu, berisi ringkasan dan tautan bertoken.
3. Petugas BPBD membuka tautan, memilih Benar, Sebagian benar (dengan koreksi), atau Tidak ditemukan, lalu bisa melanjutkan pengisian lewat chatbot sebagai `bpbd`.
4. Hasil kembali ke laporan dan ke staf peminta. Riwayat verifikasi append-only.

## 6. Galat dan batas

- AI gagal atau tanpa kunci: putaran memakai pertanyaan templat untuk isian berikutnya; pelapor tidak melihat galat teknis.
- Lewat batas harian (Q9): "Batas laporan hari ini sudah tercapai. Untuk keadaan darurat hubungi 112 atau BPBD setempat."
- Mesin WA mati: pintu web tetap jalan. Pesan WA selama mati tidak diproses (mengikuti K11 bot laporan); sesudah menyala pelapor diberi tahu sekali.

---

## Lanjutan 19 Nov 2026

Bagian 5 di atas (verifikasi dua arah, rancangan awal) digantikan bagian 7. Bagian 7 sampai 12 menjelaskan enam fitur pertama, bagian 13 sampai 18 enam fitur berikutnya.

## 7. Verifikasi dua arah ke BPBD (F-18 sampai F-20)

1. Staf (Q8) membuka rincian laporan di `/lapor/meja`, kartu Tiket, mengetuk Minta verifikasi. Tombol nonaktif bila kab laporan tidak punya kontak terdaftar (Q16), dengan alasan terbaca.
2. Layar menampilkan pratinjau: penerima (nama kontak, nomor tersamar), teks pesan baku, masa berlaku (Q17). Staf mengetuk Kirim. F0: tautan hanya dikirim ke PEMILIK.
3. Worker menulis `lapor_verif` (token acak, sha256 disimpan) dan gateway mengirim pesan ke kontak: ringkasan laporan (jenis, desa dan kecamatan, waktu kejadian, kronologi tersaring) dan tautan `https://centurisk97.id/lapor/v/<token>`. Nama dan nomor pelapor tidak ikut.
4. Petugas BPBD membuka tautan, memilih Benar, Sebagian benar (wajib mengisi koreksi), atau Tidak ditemukan, mengisi nama dan jabatan, lalu Kirim jawaban. Jawaban boleh diganti selama tautan berlaku; setiap jawaban tersimpan.
5. Hasil tampil di rincian laporan, kolom Verifikasi di Daftar, dan PDF versi berikutnya. Staf peminta menerima kabar di WA (F1). Status tiket tidak berubah sendiri; staf yang memindahkannya (A8).
6. Tautan berumur 48 jam (Q17); pengingat sekali pada jam ke-24; sesudah kedaluwarsa staf bisa meminta ulang (token baru, baris `lapor_verif` baru).
7. Jawaban "Benar" atau "Sebagian benar" membuka pilihan Buat draf LogPal (bagian 18) dan menjadi syarat laporan warga masuk Buku Besar pada F1 bila pemilik menjawab Q19 demikian.

## 8. Gugus laporan (F-21 sampai F-23)

1. Sesudah laporan terkirim (batch kirim berhasil), Worker menjalankan A9 atas laporan itu. Gagal menghitung tidak menggagalkan kirim; meja menghitung malas saat dibuka.
2. Hasilnya salah satu: laporan tunggal (tanpa gugus), bergabung ke gugus yang ada, mendirikan gugus baru dengan satu laporan lain, atau menggabungkan dua gugus.
3. Meja menampilkan gugus sebagai lingkaran di peta (jari-jari mengikuti sebaran anggota) dan sebagai baris di Daftar yang bisa dibuka menjadi daftar laporan anggota.
4. Pada F1, gugus yang punya paling sedikit dua nomor pelapor berbeda dikirim ke Buku Besar sebagai satu rekaman `lapor_ai` oleh `scripts/siklus/pasang.py` dan hanya menempel ke gugus kejadian yang sudah ada.
5. Laporan yang bukan anggota gugus tidak dikirim ke Buku Besar.

## 9. Kabar balik ke pelapor sekitar (F-24 sampai F-26)

1. Persetujuan: sesudah pesan Laporan terkirim yang pertama dari satu nomor, bot bertanya "Mau dikabari bila ada peringatan BMKG atau banyak laporan di sekitar lokasi ini?" dengan pilihan Ya, Tidak (bawaan tidak). Jawaban dan jam tersimpan. Pelapor mengetik `berhenti kabar` kapan saja untuk mencabut.
2. Lokasi langganan: titik laporan terakhir dibulatkan 0,01 derajat, kode kab dan kecamatan dari `cariWilayah`.
3. Pemicu BMKG (otomatis, F1): timer gateway menarik feed nowcast BMKG, mencocokkan tiap peringatan aktif dengan langganan (A10), dan mengirim satu pesan bertemplat ke tiap nomor yang cocok, dalam batas kirim D33.
4. Pemicu gugus (disetujui staf, F1): staf melihat tombol Kabari sekitar pada gugus yang melewati ambang Q22, mengetuknya, melihat jumlah penerima dan teks, lalu mengonfirmasi. Teks hanya menyebut jumlah laporan, jenis, dan desa, ditambah kalimat tetap tentang BPBD dan 112.
5. Penerima yang mengetik `berhenti kabar` tidak dikirimi lagi; kabar yang sudah terkirim dicatat di `lapor_kabar_tujuan`.

## 10. Mode Tanya (F-27)

1. Pelapor membuka tab Tanya di web, atau di WA mengetik `tanya` atau sebuah pertanyaan sesudah memilih menu Edukasi.
2. Pertanyaan diperiksa kode: darurat jiwa memunculkan templat darurat; pertanyaan keadaan sekarang atau lokasi diarahkan ke Info daerah dan Prediksi (D35); permintaan melapor dialihkan ke alur lapor.
3. Sisanya dicari di butir `edukasi.json` (A11). Bila ada kandidat lolos ambang, jawaban disusun dari butir aslinya, paling banyak 6 butir, dengan nama lembaga dan tautan sumber. Bila tidak: "Belum ada panduan resmi untuk pertanyaan ini" disertai tiga topik terdekat sebagai pilihan.
4. Pelapor bisa memberi nilai 1 sampai 5 (rute `/api/lapor/nilai` yang sudah ada). Pertanyaan tidak disimpan (Q24).
5. Sesi lapor yang sedang berjalan tidak terganggu: tanya di tengah laporan dijawab lalu bot kembali ke pertanyaan terakhir.

## 11. Laporan susulan (F-28)

1. Sesudah `terkirim` dan selama jendela susulan (Q26), pesan baru dari nomor yang sama yang tampak seperti kabar kejadian memicu pertanyaan "Tambah ke LA-... atau laporan baru?" dengan pilihan 1 Tambah, 2 Laporan baru. Pesan yang menyebut nomor tiket langsung jadi susulan. Di web tombol Tambah kabar ada di halaman laporan.
2. Mesin menjalankan A1 hanya atas isian yang berlaku dan menerapkan aturan A12: isian baru dan koreksi dengan kutipan, jenis dan lokasi tidak berubah.
3. Pelapor melihat ringkasan perubahan ("Meninggal: 0 menjadi 2; Mengungsi: belum didata menjadi 30") dan menjawab 1 Kirim, 2 Ubah, 3 Batal.
4. Saat Kirim: `lapor_versi` versi berikutnya, baris riwayat tiket bertanda susulan (status tidak berubah), antrean PDF versi baru, penanda "ada susulan" di meja, dan gugus dihitung ulang.
5. Pelapor menerima PDF versi baru di WA. PDF lama tetap.

## 12. Suara dan foto saja (F-29)

1. Pesan suara: gateway mengenali `audioMessage`, mengunduh, dan memeriksa durasi (paling lama 90 detik). Lebih panjang dibalas "Pesan suara terlalu panjang. Kirim yang lebih pendek atau tulis."
2. Mac mini mengubah ke wav 16 kHz mono dengan `ffmpeg`, menjalankan transkripsi lokal (Q25), menghapus audio, dan mengirim transkrip ke Worker.
3. Bot membalas "Saya dengar: ... 1 Benar, 2 Ulangi" (WA) atau kartu dengan tombol (web). Hanya sesudah Benar, teks masuk A1 sebagai pesan pelapor (asal isian `suara`). Pelapor boleh membetulkan teks dengan mengetik.
4. Foto tanpa teks dari nomor berizin: bila sesi belum ada, sesi dibuat (nomor baru lewat identitas dulu, foto ditahan), foto disimpan dengan lencana apa adanya (D16), bot membalas "Foto diterima. Ceritakan kejadiannya dan bagikan lokasi."
5. Foto yang datang di tengah sesi menempel ke sesi itu (perilaku sekarang, tidak berubah).

## 13. Mode luring (F-30, F-31)

1. Halaman `/lapor` terbuka (cangkangnya sudah di-cache service worker saat kunjungan sebelumnya). Peramban melaporkan tidak ada sinyal atau pengiriman gagal 0 atau 5xx.
2. Pita muncul: "Tidak ada sinyal. Laporan akan disimpan di HP dan dikirim otomatis." Chat bot dinonaktifkan; yang tersedia Laporan cepat: pilih jenis (tombol), waktu kejadian (Baru saja, 1 jam lalu, atau pilih jam), lokasi (GPS perangkat; tidak butuh sinyal data), kronologi singkat, foto (kamera). Simpan menolak bila jenis, waktu, atau lokasi kosong.
3. Simpan menaruh butir di saluran `lapor` dengan `klien_id` dan `waktu_klien`; foto di store blob. Layar menampilkan "Tersimpan di HP, belum terkirim" dan pita antre.js.
4. Sinyal pulih: antre.js mengirim butir terlama dulu ke `POST /api/lapor/luring`. Sesi tanpa login sah (401): antrean berhenti, butir tetap, halaman meminta masuk lewat `/masuk` lalu melanjutkan.
5. Server menerbitkan laporan terkirim versi 1 (A13), tiket, dan PDF; bot menawarkan melengkapi lewat susulan. Halaman menampilkan nomor tiket di tempat pita tadi.
6. Hasil 409 berkeadaan atau 4xx lain ditahan dengan alasan dan terlihat di daftar antre.js; pelapor bisa membuang atau menyalin kronologinya.

## 14. Penilaian foto (F-32, F-33)

1. Foto diterima rute foto (aturan D11, D16, D44 tidak berubah) dan satu baris antre masuk `lapor_foto_nilai_antre`.
2. Mac mini mengambil antrean tiap menit (klaim atomik seperti PDF), menghitung buram, umur, dan dHash (A14), membandingkan dHash dengan foto sesi lain, dan menulis hasil.
3. Galeri meja dan rincian laporan menampilkan lencana tambahan bila ada (Buram, Lama, Mirip foto di LA-...). Mengetuk "Mirip" membuka foto pembandingnya berdampingan.
4. Staf menilai sendiri; tidak ada foto yang hilang atau ditolak karena penilaian ini.
5. (F2, Q29) Relevansi: satu panggilan model penglihatan per foto, hasilnya satu lencana "Kurang sesuai jenis" hanya bila tidak sesuai.

## 15. Ringkasan harian (F-34)

1. Pukul 06.05 WIB (Q30) timer gateway memanggil `POST /api/lapor/ringkasan/buat`. Worker menjalankan satu kueri atas laporan terkirim dalam jendela 24 jam dan menyusun A15.
2. Hasil disimpan sebagai `lapor_ringkasan` versi 1 untuk tanggal itu; pemanggilan ulang pada tanggal yang sama menjawab yang ada (idempoten). Staf yang menekan Buat ulang membuat versi berikutnya.
3. PEMILIK menerima teks ringkasan di WA (F0). Staf membuka tab Ringkasan di meja: kartu per provinsi, di dalamnya baris per jenis, tombol Salin teks dan Unduh tabel.
4. Staf menempel ke Laporan Harian BNPB (deck atau dokumen) secara manual; sistem tidak menulis ke dokumen itu.

## 16. Penugasan tiket (F-35, F-36)

1. Staf di rincian laporan mengetuk Tugaskan: pilih penerima (staf atau kontak BPBD), tenggat (1 jam, 3 jam, 24 jam, atau waktu), catatan.
2. Tugas tersimpan; penerima staf melihatnya di tab Tugas saya; penerima BPBD menerima tautan bertoken (F1) dengan tombol Diterima, Sedang ditangani, Selesai, dan kotak catatan.
3. Pengingat WA satu jam sebelum tenggat dan saat lewat tenggat.
4. Tindakan (D53) mengisi `tindakan_terakhir`. Tugas selesai ditutup oleh penerima atau pembuat.
5. Tugas terbuka dengan tenggat lewat dan tanpa tindakan sesudah penugasan tampil merah di Daftar dan Peta (tepi titik merah) dan di filter Lewat tenggat.

## 17. Sinyal awal dan pembanding prediksi (F-37, F-38)

1. Staf yang masuk membuka peta utama; skrip peta menguji rute `meja/sinyal`. 200 menawarkan lapisan "Laporan warga (sinyal awal)" (mati secara bawaan); 403 tidak menampilkan apa pun.
2. Lapisan menampilkan gugus dan laporan 48 jam terakhir berlabel "belum terverifikasi", tanpa nama atau nomor. Mengetuk titik membuka laporan di meja.
3. Di `/prediksi` tab Rapor, staf melihat bagian "Laporan warga lawan prediksi": tabel hitung per jenis untuk 14 hari terakhir (A19). Di bawah ambang pasangan, tabel menulis "terlalu sedikit untuk dinilai" tanpa persentase.

## 18. Kebutuhan ke LogPal (F-39)

1. Staf membuka laporan yang memenuhi D58 dan mengetuk Buat draf permintaan LogPal.
2. Layar menampilkan pratinjau: kab, barang hasil pemetaan A20 (yang tidak berpadanan tertulis "perlu dipilih"), jiwa usulan dari isian mengungsi, dan peringatan "jumlah diisi oleh BPBD".
3. Staf mengonfirmasi; draf tersimpan di `lapor_logpal_draf`. Akun BPBD kab itu dan staf melihat "Draf dari Lapor Bencana" di `/instansi/logpal` tab Permintaan, mengubah barang, mengisi jumlah, status darurat, dan SK, lalu mengajukan lewat alur yang ada. Draf yang diajukan ditandai `dipakai` beserta nomor permintaan.
4. Draf yang tidak dipakai 14 hari ditandai `kedaluwarsa` (hitung malas).

## 19. Meja lanjutan (F-40 sampai F-48)

1. Staf membuka `/lapor/meja`. Bilah saringan (jenis berikon dan angka, periode, status, kab) berlaku serentak untuk peta, panel, linimasa, dan tabel.
2. Peta menampilkan kelompok titik. Pil lapisan di atas peta menyalakan peringatan BMKG, titik panas, prediksi banjir dan longsor besok, batas kab/kota; legenda hanya memuat lapisan yang menyala.
3. Panel "Kab/kota terbanyak": mengetuk baris menerbangkan peta ke kab itu dan menambah chip saringan Kab.
4. Penggeser linimasa di dasar peta: geser ke jam tertentu atau Putar; titik muncul kumulatif. Mengetuk Jeda atau menggeser manual menghentikan putaran.
5. Daftar default urutan Perhatian: laporan dengan penanda terbanyak di atas; chip penanda terlihat; kolom Lama dibuka, Lama tindak, Tenggat (merah bila lewat tanpa tindakan). Centang beberapa baris memunculkan bilah aksi massal.
6. Pindah status massal: pilih status tujuan dan catatan; layar menampilkan hasil per laporan (berhasil atau alasan ditolak). Teruskan ke BPBD (F1): pratinjau kontak, daftar tiket, dan teks; konfirmasi mengirim satu pesan dan membuat tugas. Tandai ganda: pilih laporan induk, konfirmasi.
7. Unduh di bilah ekspor: Excel, CSV, atau PDF ringkas dari baris tersaring.
8. Layar besar: tombol "Layar besar" meminta layar penuh; tampilan berganti ke angka besar, peta, dan sepuluh teratas; segar sendiri tiap 30 detik; tekan Esc atau tombol Tutup untuk kembali.

## Lanjutan 23 Nov 2026

## 20. Darurat sekali ketuk (F-49, F-50)

1. Pelapor mengetuk Darurat sekali ketuk di beranda. Layar seketika menampilkan tiga tombol telepon (112, 117, BPBD wilayah bila sudah diketahui, selain itu menyusul) dan tulisan "Mengirim lokasi Anda ke petugas".
2. Peramban meminta izin lokasi. Diizinkan: titik terbaik dalam 15 detik dikirim. Ditolak atau gagal: laporan dikirim tanpa titik.
3. Tanpa sinyal: titik masuk antrean, pita "Belum terkirim, dikirim otomatis saat ada sinyal". Tombol telepon tetap ada.
4. Terkirim: nomor tiket tampil, tombol BPBD diperbarui dari titik, lalu percakapan K68 terbuka dengan pertanyaan pertama "Apa yang terjadi?". Pelapor boleh menutupnya; laporan tetap ada.
5. Meja: pita merah, nada, dan notifikasi seperti K68, chip "Sekali ketuk", dan "Pelapor belum dikenal" bila belum ada identitas.

## 21. Kabar selamat dan orang dicari (F-51 sampai F-53)

Menandai selamat:
1. Pengguna membuka Kabar selamat (menu, atau kartu ajakan bila ada kejadian aktif, Q68).
2. Mengisi nama panggilan dan nomor WA, menerima kode enam angka lewat WA (mesin `/masuk`), memasukkan kode.
3. Memilih "Selamat" atau "Selamat, butuh bantuan". Pilihan kedua membuka percakapan lapor dengan lokasi terisi.
4. Mendapat tautan dan tombol Bagikan ke WA. Bisa mencabut atau memperbarui tanda dari perangkat yang sama selama 7 hari.

Keluarga membuka tautan: melihat nama panggilan, status, waktu, kab/kota. Tautan kedaluwarsa atau dicabut: "Tautan ini sudah tidak berlaku."

Orang dicari:
1. Pelapor mengisi formulir orang dicari, membuktikan nomornya dengan kode, lalu mengirim.
2. Meja BNPB dan BPBD wilayah melihat chip "Orang dicari". Bila nomor orang itu pernah menandai selamat, meja melihat "Ada kabar selamat dari nomor ini".
3. Petugas mengabari pencari lewat jalur kabar yang ada, lalu menutup laporan (ditemukan selamat, ditemukan meninggal, diserahkan ke tim SAR, atau tidak bisa dilanjutkan).

## 22. Poster QR desa (F-54, F-55)

1. Petugas BNPB atau BPBD membuka Poster QR di meja, memilih kab/kota, lalu kecamatan atau desa, lalu Cetak.
2. Poster ditempel. Warga memindai, `/lapor/?d=<kode>` terbuka, dan kartu lokasi menampilkan "Desa X, Kec. Y (dari poster). Benar?".
3. GPS di luar desa itu: "Lokasi HP Anda di Desa Z. Kejadiannya di mana?" dengan dua pilihan.
4. Laporan terkirim membawa lencana "Lokasi dari poster desa" di meja.
