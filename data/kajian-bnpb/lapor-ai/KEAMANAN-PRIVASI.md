# KEAMANAN-PRIVASI: Lapor Bencana BNPB

## Data yang disimpan

| Data | Di mana | Siapa membaca | Catatan |
| --- | --- | --- | --- |
| Nomor WA, nama, peran, kab, jabatan pelapor | D1 `lapor_pelapor` | Staf monitoring (Q12), admin | Tidak di `public/data`, tidak di log, tidak ke AI. PDF menulis nomor sebagian |
| Isian laporan | D1 `lapor_sesi`, `lapor_versi` | Pelapornya, staf, admin | Korban hanya angka; teks bebas disaring `teksBersih` |
| Transkrip | D1 `lapor_pesan` | Staf, admin, pelapornya | Disaring `teksBersih` sebelum simpan |
| Foto | R2 `lapor/` | Staf, admin, pelapornya | Metadata dibersihkan `bersihMedia`; koordinat dan jam disimpan terpisah di D1 |
| PDF | R2 `lapor/pdf/` | Pelapornya, staf, admin | Dikirim ke WA pelapor saja |
| Riwayat tiket | D1 `lapor_tiket_riwayat` | Staf, admin | Append-only |

Nomor uji pertama dan nomor mana pun tidak pernah ditulis di repo (repo publik). Perintah `lapor izin` diketik pemilik di WA.

## Ke layanan luar

- Ke Claude API (Q2): hanya teks pesan pelapor sesudah `samarkan` (HP, NIK, surel diganti) dan daftar nama isian. Tanpa identitas pelapor, tanpa foto (Q4), tanpa koordinat.
- Ke WA: balasan ke pelapor sendiri; F0 salinan ke PEMILIK. Tidak ada kiriman ke pihak lain tanpa keputusan pemilik (Q5).

## Akses

- Rute pelapor: sesi `/masuk` (nomor akun = pemilik sesi) atau gateway berkunci `WA_MESIN` yang membawa nomor pengirim. Sesi orang lain = 404, tidak membocorkan keberadaan.
- Token kamera dan token cetak: acak 32 byte, disimpan sha256, terikat satu sesi, kedaluwarsa (kamera 24 jam, cetak 10 menit), token kamera bukan sekali pakai: berlaku 24 jam untuk satu laporan, paling banyak 10 foto.
- Monitoring dan perubahan status: staf atau admin (Q12); jawaban `cache-control: private, no-store`, `x-robots-tag: noindex`.
- Semua masukan divalidasi panjang dan tipe; teks yang ditampilkan di layar disisipkan sebagai teks, bukan HTML (pemeriksa `security-reviewer`).

## Persetujuan (UU 27/2022 PDP)

Pesan L-SAPA pertama memuat satu kalimat: "Data laporan dan nomor Anda dipakai BNPB untuk penanganan bencana." Pelapor yang mengetik `hapus data` mendapat konfirmasi; identitasnya diganti "dihapus atas permintaan" dan transkripnya dikosongkan, isian kejadian tetap (bukan data pribadi). Lama simpan transkrip dan foto: menunggu pemilik; **[BAWAAN SEMENTARA]** 2 tahun.

## Penyalahgunaan

- Batas laju per nomor (DESAIN-TEKNIS). Nomor di luar izin pada F0 tidak menyentuh mesin lapor.
- Laporan warga tidak pernah membuat kejadian resmi atau tampil publik (D7), jadi laporan palsu tidak sampai ke publik.
- Foto berlencana jujur: "Lokasi WA" lebih lemah dari "GPS perangkat"; GPS janggal ditandai `nilaiGps`.
- Prompt injection: teks pelapor diperlakukan sebagai data di prompt; keluaran model hanya diterima lewat skema dan validator kutipan (D2, D3), jadi model tidak bisa mengubah alur, status tiket, atau penerima.

---

## Lanjutan 19 Nov 2026

### Data baru yang disimpan

| Data | Di mana | Siapa membaca | Catatan |
| --- | --- | --- | --- |
| Kontak BPBD (nomor WA, nama) | D1 `lapor_kontak_bpbd` | Staf Q8, admin | Tidak di repo, tidak di log, tidak di ekspor. Didaftarkan lewat perintah WA PEMILIK atau admin |
| Persetujuan dikabari dan lokasi langganan | D1 `lapor_langganan` | Gateway lewat `WA_MESIN` (hanya baris setuju), admin | Lokasi dibulatkan 0,01 derajat (sekitar 1 km); dihapus bila 90 hari tanpa laporan, saat `berhenti kabar`, atau `hapus data` |
| Jawaban verifikasi (nama dan jabatan penjawab, koreksi) | D1 `lapor_verif_jawab` | Staf, admin | Nama penjawab adalah klaim; koreksi disaring `teksBersih` |
| Transkrip suara menunggu konfirmasi | D1 `lapor_suara.teks` | Staf, admin | Audio tidak pernah disimpan; teks dikosongkan sesudah dikonfirmasi (isi pindah ke `lapor_pesan`) atau ditolak, dan paling lama 24 jam |
| Hash foto dan skor penilaian | D1 `lapor_foto_nilai`, berkas `~/.wa-bot/lapor_hash.json` di Mac mini | Staf | Hash tidak mengungkap isi foto; berkas lokal berisi hash dan id saja |
| Butir antrean luring | IndexedDB `pb-antre` di HP pelapor | Pemilik HP | Berisi lokasi, kronologi, foto; tanpa identitas, kode, token; ditahan 14 hari lalu dibuang, dihapus saat terkirim |
| Ringkasan harian | D1 `lapor_ringkasan` | Staf, PEMILIK | Tanpa nama dan nomor; angka agregat per provinsi dan jenis |
| Tugas dan riwayat | D1 `lapor_tugas*` | Staf, penerima tautan (hanya tugasnya) | Append-only |
| Draf LogPal | D1 `lapor_logpal_draf` | Staf, akun BPBD kab itu, di balik sesi LogPal | Tanpa nomor WA pelapor; tanpa nama pelapor |
| Penanda ganda | D1 `lapor_ganda` | Staf | Append-only |
| Log Mode Tanya | D1 `lapor_tanya_log` | Admin | Tanpa teks pertanyaan dan tanpa nomor (Q24) |

### Persetujuan dan hak subjek

- Dikabari: opt-in, bawaan tidak, satu kali tanya sesudah laporan pertama terkirim; bukan syarat melapor. Pencabutan `berhenti kabar` berlaku seketika dan menghapus lokasi langganan. `hapus data` (aturan bagian Persetujuan di atas) juga menghapus langganan, transkrip suara tertunda, dan butir tugas yang memuat nomornya.
- Kabar balik hanya memuat teks tetap atau teks resmi BMKG; tidak memuat isi laporan, nama, atau nomor siapa pun.
- Suara: pelapor diberi tahu pada pesan pertama suara bahwa suaranya diubah menjadi teks di mesin BNPB dan audionya dihapus; teks harus dikonfirmasi sebelum dipakai.
- Pesan proaktif lewat Baileys tanpa pelapor menulis lebih dulu berisiko diblokir dan terasa mengganggu; batas D33 dan opt-in menjaganya. Kanal resmi berbayar (Q7, Q13) harus dijawab sebelum F2.

### Tautan bertoken BPBD

- Token 32 byte acak, disimpan sha256 di `lapor_tautan`, terikat satu permintaan atau paket dan satu kontak, berlaku 48 jam (Q17), tidak bisa dipakai untuk membaca laporan lain.
- Halaman tidak menampilkan nama dan nomor pelapor, foto bergeotag penuh resolusi, atau transkrip percakapan. Foto, bila ada, ditampilkan sebagai pratinjau berukuran kecil lewat rute bertoken dengan `cache-control: private, no-store`.
- Tautan bisa diteruskan; karena itu jawaban dicatat sebagai "dijawab lewat tautan yang dikirim ke kontak X" dengan nama klaim penjawab, bukan sebagai konfirmasi identitas. Tautan tidak memberi hak apa pun atas laporan selain satu jawaban dan penanda tugas.
- Batas laju per token: 30 permintaan per jam. Token salah dijawab 404 yang sama dengan token kedaluwarsa (tidak membocorkan keberadaan).
- Header `referrer-policy: no-referrer` dan `x-robots-tag: noindex`.

### Penyalahgunaan

- Verifikasi palsu: penjawab mengaku BPBD. Pengaruhnya dibatasi: jawaban tidak mengubah isi, status, atau kejadian resmi (D24); label klaim jelas; staf memutuskan.
- Kabar balik palsu: kabar gugus selalu lewat persetujuan staf; kabar BMKG hanya dari feed resmi, jadi laporan palsu tidak dapat memicu kabar massal. Gugus bisa dipancing beberapa nomor; syarat dua nomor berbeda dan persetujuan staf menahannya, dan nomor di luar izin pada F0 tidak menyentuh mesin.
- Prompt injection di Mode Tanya: pertanyaan hanya dipakai untuk mencari butir; keluaran model hanya id yang divalidasi terhadap kandidat; jawaban dirakit dari teks berkas di repo (D34), jadi model tidak bisa memasukkan kalimat.
- Susulan: tidak bisa mengubah jenis, lokasi, waktu kejadian, atau milik pelapor lain (sesi diikat nomor).
- Foto: tanda penilaian tidak pernah menolak; tidak ada foto warga dikirim keluar tanpa jawaban Q4 dan Q29.
- Antrean luring: kiriman ganda aman karena `klien_id`; `waktu_klien` bisa dipalsukan oleh klien, jadi dibatasi (tidak di masa depan, paling lama 14 hari lalu) dan keduanya (klien dan terima) tampil ke staf.
- Ekspor dan layar besar: nama dan nomor pelapor tidak ikut (Q36, D69); ekspor mencatat siapa dan kapan; sel diawali rumus dinetralkan (injeksi CSV).
- Layar besar dibiarkan menyala di ruang bersama: tanpa data pribadi, sesi yang berakhir menghentikan pembaruan.

### Penyimpanan di perangkat

Butir antre.js tidak menyimpan kunci rahasia (aturan antre.js menolaknya). Pelapor yang meminjam HP dapat melihat butir yang belum terkirim; layar menawarkan Buang kapan saja dan masa tahan 14 hari. Service worker `sw-lapor.js` hanya menyimpan berkas statis, tidak menyimpan jawaban API.

## Lanjutan 23 Nov 2026 (K90-K92)

| Data | Tempat | Siapa melihat | Aturan |
| --- | --- | --- | --- |
| Titik sekali ketuk | D1 laporan | Meja BNPB dan BPBD wilayahnya | Sama dengan titik laporan biasa |
| Tanda selamat (nomor, nama panggilan, status, kab) | D1 `lapor_selamat` | Pemegang tautan (tanpa nomor); meja hanya lewat pencocokan nomor | Dihapus 30 hari (Q67); token sha256, 7 hari |
| Orang dicari (nama, ciri, lokasi terakhir, nomor) | D1 `lapor_cari` | Meja BNPB dan BPBD wilayahnya | Tidak publik, tidak di `public/`, tidak di ekspor layar besar |
| Lencana poster | D1 laporan | Meja | Tanpa pelacak kunjungan |

- Tanda selamat dan laporan orang dicari wajib nomor terbukti lewat kode sekali pakai (D127, D129): mencegah tanda palsu atas nama orang lain.
- Tidak ada pencarian per nomor atau per nama (D128, D130).
- Sekali ketuk tanpa identitas dijaga batas laju A29; laporan itu tidak diteruskan ke luar meja sebelum identitas lengkap (D124).
- Poster bisa dipalsukan: alamat tautan ditulis utuh supaya warga bisa memeriksa domainnya, dan isi `?d=` hanya usulan yang dikonfirmasi (D131).
