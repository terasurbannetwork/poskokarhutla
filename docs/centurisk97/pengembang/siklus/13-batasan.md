# Batasan dan pertanyaan terbuka

Halaman ini mencatat perbedaan antara dokumen dan kode serta batasan dan pertanyaan terbuka Siklus Bencana.

## Batasan dan pertanyaan terbuka

Perbedaan antara dokumen dan kode (kode yang menang):

- Dokumen `lifeline/DESAIN-TEKNIS.md` menyebut putaran usulan di cron Worker menit 22. Di kode, usulan dihitung saat halaman dibuka dengan penyegaran paling sering sekali per 15 menit, dan jadwal cron Lifeline belum terdokumentasi di kode.
- Dokumen `siklus/ALGORITMA.md` menyebut model kaji `gempa`, `banjir_jam1` dan menyebut `banjir_gfm` sebagai rencana. CHECK tabel `sk_kaji` hanya mengenal `gempa` dan `banjir_jam1`, dan `banjir_gfm` belum ada di kode.
- Perilaku nol pada angka bernilai kosong mengikuti kode: layar dan unduhan memakai penanda kosong sehingga tampil "menunggu", bukan Rp0.

Hal yang belum dibangun:

- Layar kaji ulang tidak ada. Hanya rute API dan SQL yang sudah ada.
- Rantai Satu Kejadian, Kalender Kewajiban, dan Rapor SPM: tabel `rantai_tautan` dan `kw_jangkar` tidak ada di migrasi, dan halaman `/bnpb/rantai` serta `/bnpb/kalender` tidak ada. Hanya paket dokumen. Pemilik memutuskan Rantai digabung ke Buku Besar (tampilan tahap), dan Kalender serta Rapor SPM tetap di paket Rantai.
- Pembiayaan risiko: hanya migrasi 0148 dan uji skema. Rute `/api/siklus/kejadian/:id/pembiayaan` dan layar belum ada. Penautan permohonan DSP ke kejadian (PR-02b) belum dikerjakan.
- Perkiraan kerusakan satelit: belum ada vonis lulus, jadi tidak ada angka. Kebenaran uji banjir hanya DIBI per kabupaten sehingga vonis maksimal "lulus terbatas", dan perhitungan HAND naif memerlukan mesin dengan numpy dan GDAL yang belum diputuskan tempatnya (Q13).
- Peta pertumbuhan paparan pada F6 dan potongan data iklim per kabupaten penuh belum dibuat. GHSL belum diunduh.
- Kurva kerusakan niaga dan industri, kurs, dan faktor harga belum bernilai, sehingga kerusakan rupiah banjir menunggu.
- Lapisan InaRISK sebagai gambar peta di F2 (U22) belum dibangun.
- Kolom nomor induk resmi kejadian dikosongkan karena format Perban 1/2023 Pasal 8 tidak ditemukan.

Keterbatasan data dan model yang perlu diingat pengguna:

- Open Buildings mendeteksi bangunan, dengan komisi dan omisi tidak dikoreksi. Posisi paparan berpresisi sekitar 0,8 km pada sel kasar. Desa tanpa poligon dihampiri dengan titik pusat Dukcapil.
- Titik perkiraan dari nama desa hanya cocok untuk sekitar 34 persen kejadian Logbook.
- Model kaji gempa dan banjir adalah estimasi dan belum lulus uji balik. Ambang lulus belum diputuskan (U18).
- Ambang usulan Lifeline dan ambang tumpang tindih 3W adalah hipotesis dan belum dikalibrasi. Pelapor yang berbagi satu IP dihitung satu orang.
- Semua keluaran F6 adalah hipotesis, bukan ramalan.
- Padam internet IODA hanya per provinsi. Lampu malam satelit belum layak dipakai sebagai isyarat listrik.

Pertanyaan pemilik yang masih terbuka, ditulis sebagai "belum diputuskan (bawaan sementara: ...)":

- Siklus U1 sampai U22 sudah dijawab dengan mandat "lu yang putuskan" (11 November 2026), kecuali U22. U22 (lapisan InaRISK di F2): belum diputuskan (bawaan sementara: ya, lapisan opsional lewat proksi daftar izin, belum dibangun).
- Siklus UA-1 (jendela khusus jenis berdurasi panjang): belum diputuskan (bawaan sementara: 3 hari dan sel 0,02 derajat). UA-2: belum diputuskan (bawaan sementara: verifikasi tetap oleh staf).
- Lifeline Q1 sampai Q7: tidak ada pertanyaan yang menahan LF-05, tetapi Q5 masuk Laporan Berkala ke Presiden (bawaan sementara: ya, satu tabel per kejadian aktif, menunggu paket Laporan Berkala) dan Q6 perpanjangan token Earthdata untuk jalur lampu malam (bawaan sementara: ya, tiket tersendiri) belum diputuskan.
- 3W Q1 sampai Q7: belum diputuskan (bawaan sementara: tawaran diputuskan Pusdalops dan Koordalops, mitra lokal wajib untuk NGO internasional, tidak ada nilai rupiah, token berlaku paling lama 90 hari).
- Kaji ulang Q1 sampai Q13: belum diputuskan (bawaan sementara: kandidat kejadian besar menurut empat kriteria, penulis Pusdalops dan Koordalops, pengesah Koordalops dengan dua pasang mata, tenggat rekomendasi bawaan 60 hari, rekomendasi yang tidak dikerjakan ditutup `selesai` dengan alasan, bentuk keluaran cetak A4 dari layar). Q12 (nomor F6 bentrok dengan Risiko Masa Depan): belum diputuskan (bawaan sementara: dipakai nama Kaji ulang dengan kode tiket `KU-*`).
- Keterpaduan: tidak ada pertanyaan yang menahan tiket. Satu bawaan sementara tersisa, yaitu batas "kejadian besar" untuk pengingat GLIDE (kejadian dengan tanggal tanggap darurat terisi). Nomor GLIDE dimintakan staf ke ADRC.
- Kerusakan satelit Q1 sampai Q13: belum diputuskan (bawaan sementara: banjir dahulu, karhutla ditunda, gempa tetap gagal, tanpa citra berlisensi, ambang lulus di ALGORITMA bagian 3, model gagal tampil tanpa angka).
- Rantai Q1 sampai Q8 dan Q-lain: belum diputuskan (bawaan sementara pada KEPUTUSAN-RANTAI, antara lain BPBD hanya melihat kabupatennya, Kalender tidak menerima isi laporan, Rapor SPM tanpa ambang). Pemilik sudah menjawab Q5, Q6, dan Q9 pada 10 November 2026.
- Pembiayaan Q1 sampai Q8: belum diputuskan (bawaan sementara: saldo DSP dan PFB diisi staf keuangan BNPB dan hanya dibaca staf pembiayaan dan Pimpinan, model kerugian awal tidak ada dahulu, bagian parametrik mati sampai ada skema resmi, rupiah berjalan dengan tahun harga ditulis, tidak masuk Laporan Berkala).

Catatan perlindungan data: modul ini tidak menyimpan NIK, tidak membuat registri pengungsi per orang, tidak menyimpan nama personel lapangan di kaji ulang, dan tidak membuka paparan bangunan rinci atau data uang di `public/`. Data pribadi dan rincian staf tidak pernah ditulis di dokumen ini.
