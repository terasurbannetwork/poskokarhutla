# Batasan kemitraan, pemetaan, direktori

Bagian ini memuat perbedaan dokumen dan kode serta batasan Kemitraan Kampus, pemetaan relawan, dan direktori akademisi.

## Perbedaan dokumen dan kode yang ditemukan

- AGENTS.md menyebut iklim neraca air dari ERA5-Land. Kode dan HASIL.md memakai CHIRPS (hujan) dan NASA POWER (ET0) sejak 27 Oktober 2026. Dokumen ini mengikuti kode.
- RANCANGAN neraca air menyebut HydroBASINS level 12. Yang dipakai kode level 09 (555 sub-DAS).
- Dokumen DESAIN-TEKNIS pemetaan relawan menyebut `src/pemetaan.js`, `public/kemitraan/pemetaan.js`, dan tabel yang siap dipakai. Di kode yang ada baru migrasi `0149`, pipeline, dan uji. Rute dan layarnya belum ada.
- Kemitraan Kampus: berkas ilmu agent `.claude/ilmu-agent/kampus.md:17` menyebut "layar 8 tampilan" (dan baris 13 masih "hanya dokumen; belum ada kode"), sedangkan tampilan yang terisi baru Daerah dan Data lapor (tampilan ke-9 ditambahkan sesudah paket awal). Tujuh tampilan lain masih kerangka.
- Ilmu agent `kampus` masih menulis "Status 30 Okt: hanya dokumen; belum ada kode" di bagian peta berkas, padahal kodenya sudah luas. Kode dan catatan kasus yang menang.
- `GET /api/kemitraan/daerah/:kab4/pakar` dan `POST /api/kemitraan/masalah/:id/pakar/:aid` masih penampung 501, sehingga pencocokan pakar hanya terlihat lewat pipeline dan berkas R2, belum lewat API ke layar.
- `src/kemitraan.js` menyebut "Rute fitur (masalah, riset, satgas, ...) menyusul per tiket" tetapi rute masalah, kunjungan, dan koreksi sudah ada. Komentar itu belum diperbarui.
- Daftar tab direktori di dokumen lama menyebut Jurnal dan Pengadaan kajian. Keduanya disembunyikan (30 Oktober 2026).
- Alamat `/akademisi` kini mengalihkan ke `/direktori`, tetapi nama berkas, nama modul, dan rute API tetap memakai kata "akademisi".

## Kemitraan Kampus

Pertanyaan terbuka di `KEPUTUSAN-KAMPUS.md` bagian H, dengan bawaan sementara yang dipakai:

- T-A (pilar ketiga): belum diputuskan (bawaan sementara: Pendampingan Daerah, pemulihan pascabencana masuk pilar satgas sebagai fase pascatugas).
- T-B (siapa boleh membaca buku profil daerah): belum diputuskan (bawaan sementara: akun saja, yaitu staf, BPBD, kampus; edisi publik tanpa bab pakar menyusul). Kode memberi hak buku kepada SA, ST, PM, dan KK.
- T-C (LLM untuk meringkas solusi): belum diputuskan (bawaan sementara: tidak; solusi ekstraktif dari abstrak).
- T-D (data IKD): untuk bahan masalah sudah digantikan keputusan 24 November 2026 (data IKD InaRISK dipakai langsung). Untuk keperluan lain belum diputuskan (bawaan sementara: isi manual oleh staf atau BPBD).
- T-E (cara BPBD masuk): belum diputuskan (bawaan sementara: kode pribadi per kabupaten/kota yang diterbitkan staf, pola Meja Kerja).
- T-F (nama menu) dan T-G (surat dukungan BNPB untuk proposal): belum diputuskan (bawaan sementara: "Kemitraan Kampus" di `/kemitraan`; platform hanya membuat draf dan nomor registri, tanda tangan di luar sistem).

Batasan teknis:

- Skor prioritas otomatis dan skor pakar berstatus hipotesis. Label relevansi dari dua penilai staf belum ada, sehingga pil "Belum diuji" belum bisa dicabut.
- Persentil nasional bergantung pada 514 kabupaten/kota sekaligus. Menjalankan satu kabupaten/kota tetap membangun semuanya lebih dulu.
- Sumber sekolah dan fasilitas hanya mencakup 9 provinsi. Data inarisk per kompleks karhutla bukan per kabupaten/kota dan tidak dipakai untuk profil.
- Miskin ribu BPS dibuang dari profil karena basis penduduknya berbeda dengan IRBI. Status BPBD "Belum Terbentuk" dari atlas BNPB tidak dipakai sebagai fakta resmi (diganti `null` dan dicatat sebagai status atlas).
- Kolom `bps` pada `kode.json` kosong semua sampai daftar BPS resmi diberikan.
- Turnstile pada halaman daftar: halaman `/kemitraan/daftar` dan `/masuk` dilayani Worker dengan CSP yang berbeda. Catatan ilmu agent menyebut bahwa bila `TURNSTILE_SITEKEY` aktif di produksi, widget bisa diblokir CSP dan server menolak tanpa token. Saat ini ada penanganan CSP khusus untuk halaman daftar (`src/kemitraan.js:61`), tetapi perilaku di produksi belum terverifikasi dalam dokumen ini.
- Fitur riset dan dana (kalender donor, pencocokan donor, konsorsium, siklus hibah, inovasi), satgas, dan talenta baru ada sebagai skema D1, konstanta bobot, dan rumus tertulis; tidak ada rute atau layar.
- Uji `tests/kemitraan/*` dilaporkan merah pada 24 November 2026 karena `public/kemitraan/data.js` (gerbang XSS, entri cakupan, dan uji waktu). Hal ini perlu diperiksa ulang sebelum dianggap hijau.

## Pemetaan relawan

Pertanyaan terbuka di `KEPUTUSAN-PEMETAAN.md`:

- Q1 (pemegang akun HOT dan penyetuju proyek): belum diputuskan (bawaan sementara: pemilik memegang satu akun organisasi BNPB atau mitra HOT; staf Pusdalops menyiapkan, pemilik menyetujui). Menahan rute (HR-08).
- Q2 (menitipkan proyek ke HOT Indonesia atau komunitas OSM lokal): belum diputuskan (bawaan sementara: koordinasi ke HOT lebih dulu).
- Q3 (nama pengguna OSM mahasiswa di layar internal): belum diputuskan (bawaan sementara: tidak; hanya agregat per kampus).
- Q4 (citra yang disarankan dan siapa memastikan lisensi): belum diputuskan (bawaan sementara: hanya daftar saran, staf yang memilih dan memastikan).
- Q5 (apakah paparan boleh beralih ke OSM atau Overture bila kelengkapan memadai): belum diputuskan (bawaan sementara: tidak beralih; hanya pembanding).
- Q6 (ambang "tipis"): bawaan sementara hipotesis 0,6 dan 0,85, belum dikalibrasi dengan sampel 10 kabupaten/kota.
- Q7 (minimum peserta dan lama proyek): bawaan sementara satu kampus, 10 pemeta, 30 hari.
- Q8 (apakah kegiatan dihitung sebagai jam kegiatan mahasiswa): bawaan sementara ya, sesudah modul sertifikat Kemitraan Kampus hidup (saat ini rute sertifikat belum punya halaman).

Batasan teknis:

- Zona hitung pada run nyata adalah seluruh poligon kabupaten/kota, bukan zona bahaya Peta Paparan. Ini aproksimasi.
- Satu poligon yang mewakili bangunan majemuk, titik, dan multipoligon tidak dihitung sebagai bangunan terpisah, sehingga rasio bisa terlalu rendah.
- Hanya bangunan berpoligon yang dihitung dari OSM.
- Pembanding Open Buildings v3 punya komisi dan omisi, sehingga rasio bukan kelengkapan mutlak.
- Hasil pemetaan tidak mengubah sumber paparan.
- Pada 15 November 2026 diketahui bahwa `scripts/pemetaan` dan `public/pemetaan` tidak ada di tabel peta modul AGENTS.md bagian 2 (baris Kemitraan kampus), meski AGENTS.md bagian 2.25 dan roster `kampus` (`scripts/agents/roster.json`) sudah menyebutnya.
- Uji kejujuran 10 kabupaten/kota (HR-05), keputusan sumber data (HR-10), dan penerapan migrasi `0149` di D1 produksi (HR-12) belum selesai menurut TIKET.md.

## Direktori akademisi

- Belum ada paket dokumen KEPUTUSAN, PRD, dan ALGORITMA sendiri di `data/kajian-bnpb/` untuk direktori. Yang tertulis hanya komentar di kode dan rencana di `docs/bnpb/RENCANA-AKADEMISI.md` (belum dibaca untuk dokumen ini).
- Cache memori per isolate membuat unggahan baru terlihat paling lama 10 menit.
- Pembacaan koreksi dibatasi 200 objek terbaru dari 1000 kunci pertama. Bila antrean melewati itu, perlu pindah ke D1 atau memakai kursor.
- Penyaringan riwayat memakai satu kueri terindeks per GET dan dibatasi 200 baris, tanpa kursor.
- Ringkasan AI berisiko 502 bila OpenAlex atau Workers AI tidak menjawab; hasil gagal tidak disimpan 30 hari di cache tepi.
- Panen data (skrip `scripts/akademisi/`) tidak dibahas rinci di sini.
