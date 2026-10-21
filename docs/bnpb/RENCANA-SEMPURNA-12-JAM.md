# Rencana 12 jam kedua: menyempurnakan Ruang Koordinasi BNPB

Status: **DRAF, menunggu persetujuan pemilik.** Disusun 19 Okt 2026 sesudah gelombang pertama
(`STATUS.md`). Syarat sebelum mulai: migrasi 0022–0026 sudah diterapkan ke D1 produksi dan
commit sudah di-push. Tanpa itu tidak ada data nyata yang bisa dipakai untuk menguji.

## 1. Dasar rencana: celah yang sudah ketahuan

Ini bukan tebakan. Daftarnya diambil dari laporan pengulas, verifier, dan batas di `STATUS.md`.

| # | Celah | Akibatnya bagi BNPB |
|---|---|---|
| C1 | Sistem saling terpisah: "butuh bantuan" di alun-alun tidak bisa langsung jadi permintaan relawan atau logistik | Petugas mengetik ulang, dan permintaan bisa hilang di tengah jalan |
| C2 | Tidak ada pengingat: MoU hampir habis, logistik tertunda lebih dari 24 jam, DSP belum SPJ hanya ditandai di layar | Tanda baru terlihat kalau ada yang membuka layar |
| C3 | Kapasitas di indeks risiko masih statis (jarak kantor BPBD) | Kecamatan yang punya relawan dan Destana aktif tetap terbaca rawan |
| C4 | Indeks risiko dan kebutuhan musim belum diuji balik | Angkanya belum bisa dipakai untuk menentukan anggaran |
| C5 | Lapor Warga tidak punya provinsi/kabupaten | Sitrep provinsi dan rapor BPBD tidak memuat suara warga |
| C6 | Logika layar (sitrep, risiko, kebutuhan, gakkum, form relawan) belum punya uji otomatis | Kelas bug "layar kosong padahal API sehat" lolos |
| C7 | Kampus relawan dan mitra riset dua tabel terpisah | Satu kampus mengurus dua kode, dan MoU dicatat dua kali |
| C8 | Rapor dan ringkas Meja membaca maksimal 20.000 baris di Worker | Rapor bisa diam-diam terpotong saat bencana besar |
| C9 | Pelindung bot (Turnstile) mati | Form relawan dan alun-alun rentan spam saat viral |
| C10 | Sitrep tidak diarsipkan | Laporan kemarin tidak bisa dibuka lagi, jadi tidak ada jejak untuk audit dan rakor |

## 2. Fitur strategis baru (yang paling menaikkan kinerja)

| # | Fitur | Kenapa strategis |
|---|---|---|
| F1 | **Layar Pimpinan**: satu layar untuk Kepala BNPB berisi situasi, rapor BPBD, kebutuhan, dan tanda bahaya lintas sistem | Pimpinan memutuskan dari satu tempat, tanpa membuka tujuh halaman |
| F2 | **Peringatan dini berbasis dampak**: tiap 6 jam, kecamatan berisiko tinggi × penduduk menghasilkan daftar prioritas dan antrean kiriman ke BPBD (admin yang menekan kirim) | Mengubah "hujan lebat" jadi "123.000 jiwa di 8 kecamatan" |
| F3 | **Rehab-rekon**: kaji cepat yang terverifikasi berlanjut ke JITUPASNA, usulan dana stimulan, cair, lalu dibangun, dengan tanda yang macet | Menutup masalah M2 sampai ujungnya, bukan berhenti di pendataan |
| F4 | **Stok gudang logistik**: stok per gudang/kab; pengiriman logistik mengurangi stok; stok di bawah ambang ditandai | Logistik terkirim tidak lagi lebih besar dari stok yang ada |
| F5 | **Ekspor format DIBI/InaRISK**: kaji cepat dan kejadian diekspor CSV/JSON berkolom DIBI | Data dari daerah masuk sistem resmi tanpa diketik ulang |
| F6 | **Mode luring untuk petugas**: `/meja` dan check-in relawan menyimpan kiriman saat sinyal hilang, lalu mengirim ulang (pola `/lapangan`) | Lokasi bencana hampir selalu tanpa sinyal |

## 3. Urutan kerja

| Jam | Isi | Alasan urutan |
|---|---|---|
| 0–1 | Cek produksi: migrasi, `/api/status`, semua halaman BNPB 200 dan tidak 503; isi data contoh nyata | Tanpa ini semua langkah berikut tidak bisa diuji |
| 1–4 | **C1 integrasi lintas sistem**, **C2 pengingat** (email lewat Resend yang sudah ada, antrean disetujui admin), **C5 wilayah Lapor Warga** | Paling cepat terasa oleh petugas; fondasi untuk F1 |
| 4–7 | **F1 Layar Pimpinan**, **F2 peringatan dampak**, **C3 kapasitas dinamis** | Fitur strategis yang memakai data hasil langkah 1–4 |
| 7–9 | **F3 rehab-rekon** (tahap baru di Meja Kerja), **F4 stok gudang**, **F5 ekspor DIBI** | Menutup alur kaji cepat dan logistik sampai selesai |
| 9–11 | **C4 uji balik** indeks risiko terhadap kejadian nyata, **C6 uji layar** otomatis, **C8 tabel agregat**, **C10 arsip sitrep**, **F6 luring** | Pengerasan: angka jujur, layar teruji, tahan beban |
| 11–12 | **C7 satukan institusi**, **C9 Turnstile**, pengulas lengkap, verifier bersih, dokumen, push | Penutup |

Kalau waktu habis, yang dipotong urutan terakhir: F6, lalu C7. Mutu gelombang awal tidak dikorbankan.

## 4. Rincian singkat per butir

- **C1 integrasi:** tombol "Teruskan" di admin alun-alun membuat permintaan relawan (keahlian dan wilayah terisi) atau catatan logistik di Meja, lalu ID-nya ditautkan dua arah. Status penanganan tampil di utas.
- **C2 pengingat:** cron harian membuat antrean pengingat (MoU ≤60 hari, logistik >24 jam, DSP cair >30 hari tanpa SPJ, renkon segera habis). Admin melihat lalu menekan kirim email (pola antrean Posko). Tidak ada kiriman otomatis ke luar.
- **C5 wilayah Lapor Warga:** migrasi menambah kolom prov/kab, diisi saat laporan masuk (`cariWilayah`) dan diisi mundur bertahap untuk laporan lama. Sitrep dan rapor memakainya.
- **F1 Layar Pimpinan:** `/bnpb/pimpinan` khusus admin. Isinya kartu situasi per bencana, 10 kab terburuk di rapor, kebutuhan 30 hari, semua tanda bahaya lintas meja, dan permintaan bantuan terbuka. Ada tombol cetak satu halaman.
- **F2 peringatan dampak:** pipeline 6 jam memakai `risiko.py` dan bahaya terbaru, lalu memilih kecamatan "naik kelas" × penduduk. Hasilnya `/risiko` versi "prioritas hari ini" plus antrean kiriman ke BPBD kab (email/WA tautan, admin yang menekan).
- **C3 kapasitas dinamis:** endpoint agregat publik relawan siap, regu aktif, dan Destana aktif per kab, dipakai `risiko.py`. Bobot kapasitas tertulis dan diuji.
- **F3 rehab-rekon:** meja baru `rehab` di mesin yang sama, tertaut ke catatan kaji cepat. Statusnya jitupasna, usulan, disetujui, cair, dibangun, selesai, dengan tanda macet lebih dari 60 hari.
- **F4 stok gudang:** meja baru `gudang` (stok per barang) dan transaksi otomatis dari logistik yang dikirim/diterima. Tanda stok di bawah ambang.
- **F5 ekspor DIBI:** CSV/JSON berkolom DIBI (kejadian, waktu, lokasi, korban, kerusakan) dari kaji cepat dan kejadian berkode yang sudah ada.
- **C4 uji balik:** uji risiko kecamatan terhadap kejadian yang tercatat (DIBI/kejadian berkode) dengan POD/FAR per kelas. Hasilnya tampil jujur. Label "belum diuji balik" baru dicabut kalau lulus.
- **C6 uji layar:** Playwright/CDP headless di `tests/` untuk 8 halaman. Halaman memuat, angka tampil, klik inti berjalan, tanpa galat konsol.
- **C8 agregat:** tabel ringkasan meja per kab diperbarui saat tulis, sehingga rapor tidak lagi memindai 20.000 baris.
- **C10 arsip sitrep:** cron 07.00 WIB menyimpan potret sitrep nasional dan provinsi ke R2, lalu `/sitrep?tgl=` membuka arsipnya.
- **F6 luring:** antrean IndexedDB di `/meja` dan check-in relawan, kirim ulang saat daring (pola `public/lapangan.js`).
- **C7 institusi:** satu tabel institusi (kampus/organisasi) dengan MoU/PKS. Relawan dan riset merujuknya, kodenya satu per peran.
- **C9 Turnstile:** sitekey ke `wrangler.jsonc`. Secret dipasang pemilik.

## 5. Gerbang mutu (sama dengan gelombang pertama)

- Tiap tabel dan rute baru diuji integrasi di Miniflare dengan D1 sungguhan dan masuk `cakupan.json`.
- Tiap halaman baru punya dummy 🧪/🧹 yang mengisi semua kartu.
- Pengulas: `security-reviewer` + `guard-api` (rute baru, email), `migrasi-idempoten`, `validasi-model` (C3, C4, F2), `selera-angka`, `inp-reviewer`, lalu verifier bersih.
- Tiap layar diperiksa di 1440 dan 390.
- Hanya `main`, tanpa worktree. Commit per butir dengan path eksplisit. `uji:agen` wajib hijau sebelum tiap commit, karena gerbang itu juga dijalankan `terbit.yml`.

## 6. Yang perlu diputuskan pemilik

1. **Email pengingat dan peringatan dampak** dikirim ke siapa? Default: ke `EMAIL_TO` admin dulu, BPBD belakangan.
2. **Layar Pimpinan** cukup untuk admin, atau perlu akun khusus pimpinan? Default: admin.
3. **Format DIBI**: ada contoh berkas/kolom resmi dari BNPB? Kalau tidak ada, gw pakai kolom publik DIBI yang umum.
4. **Uji balik**: sumber kejadian pembanding. Default: kejadian berkode di repo ditambah data DIBI publik bila bisa diunduh.

## 7. Yang tetap tidak dibuat

- Kiriman otomatis ke luar (BPBD, perusahaan, WA grup) tanpa admin menekan kirim.
- Integrasi API langsung ke sistem internal BNPB (butuh kredensial resmi).
- Aplikasi native.
