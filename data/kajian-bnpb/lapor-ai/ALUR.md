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
