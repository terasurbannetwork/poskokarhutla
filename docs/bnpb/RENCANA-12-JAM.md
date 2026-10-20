# Rencana 12 jam: Ruang BNPB di Pantau Bencana

Status: **DRAF, menunggu persetujuan pemilik.** Belum ada kode yang ditulis.
Disusun 19 Okt 2026.

## 1. Kenapa kinerja BNPB tersendat

Ringkasan dari temuan yang berulang di LHP BPK, laporan Ombudsman, evaluasi
SAKIP/IKD, dan liputan pascabencana (Palu 2018, Semeru 2021, Cianjur 2022,
Sumatra 2025). Angka spesifik belum dikutip di sini. Sebelum masuk paparan,
tiap butir dicek ulang ke dokumennya.

| # | Akar masalah | Gejalanya di lapangan | Dijawab oleh |
|---|---|---|---|
| M1 | Data kejadian terpecah dan direkap manual (BPBD ke Pusdalops lewat WA/Excel) | Sitrep terlambat, angka antar-instansi berselisih, pimpinan rapat dengan data kemarin | S1 Sitrep otomatis |
| M2 | Kaji cepat dan JITUPASNA lambat | Rumah rusak baru terdata berminggu-minggu, dana stimulan dan rehab-rekon terlambat cair | S2 Kaji cepat kerusakan |
| M3 | Logistik tidak terlacak dari permintaan sampai diterima | Bantuan menumpuk di satu titik sementara desa lain kosong. Temuan BPK soal pertanggungjawaban | S3 Logistik bantuan |
| M4 | Relawan spontan tidak terkelola | Relawan datang tanpa keahlian yang dibutuhkan, tidak ada asuransi dan penugasan, kampus mengirim tanpa koordinasi | R1 Relawan + PTN |
| M5 | Kapasitas BPBD timpang dan tidak terukur rutin | Pembinaan daerah hanya berdasar kesan. IKD dinilai tahunan, bukan operasional | S4 Rapor kinerja BPBD |
| M6 | Akuntabilitas Dana Siap Pakai | Pertanggungjawaban DSP terlambat dan jadi temuan berulang | S5 Pelacak DSP |
| M7 | Rencana kontinjensi kedaluwarsa atau tidak pernah diuji | Renkon ada di lemari dan tidak dipakai saat kejadian | S6 Registri renkon |
| M8 | Data pengungsi dan kelompok rentan tidak terpilah | Kebutuhan balita, lansia, ibu hamil, dan disabilitas terlambat dipenuhi | S7 Pengungsi terpilah |
| M9 | Risiko InaRISK tidak operasional | Peta risiko statis dan tidak dipakai untuk menentukan desa prioritas harian | R4 Indeks risiko |
| M10 | Riset kampus tidak sampai ke kebijakan | Penelitian berhenti di jurnal, data BNPB sulit diakses peneliti | R3 Kemitraan riset |
| M11 | Komunikasi publik satu arah | Warga tidak punya kanal resmi untuk bertanya dan meminta bantuan, sehingga hoaks mengisi kekosongan | R2 Alun-alun |
| M12 | Ketangguhan desa (Destana) tidak terpantau | Program desa tangguh berhenti setelah pelatihan | S8 Destana |
| M13 | Anggaran dan armada musiman ditetapkan berdasar tahun lalu | Water bombing dan logistik datang setelah api membesar | S9 Perkiraan kebutuhan |
| M14 | Penegakan hukum karhutla lemah | Konsesi yang terbakar berulang tanpa berkas bukti yang rapi | S10 Berkas Gakkum |

## 2. Urutan kerja: dampak dibanding biaya

Prinsip: **yang bahannya sudah ada di repo dikerjakan dulu**. Sistem yang
butuh data dari BPBD tetap dibangun, tapi dengan alur input dan tombol dummy
supaya bisa dinilai pada hari jadinya.

| Gelombang | Sistem | Alasan |
|---|---|---|
| 1 (jam 0–4) | R1 Relawan + PTN/MoU, S1 Sitrep otomatis, R2 Alun-alun | Diminta langsung. Sitrep 80% bahannya ada, quick win paling terlihat |
| 2 (jam 4–7) | R3 Kemitraan riset, R4 Indeks risiko, S2 Kaji cepat, S3 Logistik | Diminta langsung + akar masalah M2/M3 paling mahal |
| 3 (jam 7–10) | S4 Rapor BPBD, S5 DSP, S6 Renkon, S7 Pengungsi, S8 Destana | Memakai mesin alur yang sama, jadi murah setelah gelombang 2 |
| 4 (jam 10–12) | S9 Perkiraan kebutuhan, S10 Berkas Gakkum, verifikasi akhir, terbit | Turunan dari model dan laporan konsesi yang sudah ada |

Kalau waktu habis, yang dipotong adalah gelombang 4, bukan mutu gelombang 1–2.

## 3. Rancangan per sistem

### R1. Relawan: rekrutmen dan manajemen (+ relawan PTN lewat MoU)

Alur: **daftar → verifikasi → siap tugas → ditugaskan → bertugas → selesai → dinilai.**

- **Pendaftaran publik** `/relawan`: nama, WA, email, domisili (prov/kab), jalur
  (umum / kampus / organisasi), keahlian (medis, SAR, logistik, dapur umum,
  psikososial, GIS/data, komunikasi, pemadaman, bahasa isyarat, dll.),
  sertifikat, ketersediaan (hari dan durasi), kontak darurat, golongan darah,
  serta persetujuan UU PDP. **Tanpa NIK dan tanpa unggah KTP.**
- **Kode relawan pribadi**: tautan `/relawan/saya#k=…`, sama seperti kode regu
  Posko. Relawan cek status, terima penugasan, check-in dan check-out
  bertugas, dan lapor jam kerja. Tanpa kata sandi.
- **Kampus/PTN**: admin mencatat MoU (nomor, tanggal, masa berlaku, PIC, kuota),
  lalu sistem memberi **kode koordinator kampus**. Koordinator memverifikasi
  mahasiswanya sendiri, melihat jam kerja untuk konversi SKS/KKN tematik, dan
  mengunduh rekap. MoU yang 60 hari lagi habis diberi tanda.
- **Admin** `/admin/relawan`: antrean verifikasi, pencocokan kebutuhan
  (permintaan: lokasi, keahlian, jumlah, tanggal) dengan relawan siap tugas
  berdasar jarak, keahlian, dan ketersediaan. Status asuransi, pelatihan, dan
  sertifikasi, penilaian purna-tugas, serta daftar hitam bila ada pelanggaran.
- **Publik** hanya angka agregat: relawan siap per provinsi dan keahlian, kampus
  mitra. Tidak ada nama atau kontak.

### R2. Alun-alun: forum publik

Tidak ada fitur bernama alun-alun di repo, di repo lain, maupun di riwayat
sesi. Tafsiran ini perlu disetujui: **alun-alun = ruang publik satu pintu**
antara warga, relawan, dan BPBD/BNPB.

- Utas per wilayah dan per bencana: **Tanya**, **Butuh bantuan**, **Info
  lapangan**, **Pengumuman resmi**.
- Pengumuman resmi diberi lencana instansi (hanya admin) dan disematkan di atas.
- Upvote (bukan love), balasan satu tingkat, tandai "terjawab", dan laporkan
  konten. Pemfilteran kata kasar, tautan, dan nomor memakai `bersihTeks` yang
  sudah ada. Laju dibatasi per IP.
- Tiap "Butuh bantuan" bisa diteruskan admin ke permintaan relawan (R1) atau
  logistik (S3).
- Moderasi di `/admin/alun-alun`.

### R3. Kemitraan riset perguruan tinggi

Alur: **usulan → telaah → disetujui (PKS) → berjalan → laporan → hasil ke kebijakan.**

- Kampus mitra (sama dengan entri MoU di R1) mendapat **kode mitra riset**.
- Peneliti mengajukan usulan: judul, bencana, wilayah, metode, kebutuhan data,
  jadwal, dan luaran.
- **Katalog data** yang bisa diminta: semua JSON di `public/data` dan arsip D1
  yang aman. Permintaan data tercatat beserta lisensi dan janji sitasi.
- **Agenda riset BNPB**: daftar pertanyaan riset prioritas dari BNPB, sehingga
  kampus meneliti yang dibutuhkan BNPB, bukan sebaliknya.
- Laporan kemajuan, luaran (artikel, dataset, model), dan kolom "dipakai untuk
  kebijakan apa". Kolom itulah yang menutup M10.
- Publik: daftar riset berjalan dan selesai beserta abstrak dan luarannya.

### R4. Indeks risiko desa/kecamatan (ala InaRISK, operasional)

InaRISK memberi bahaya statis. Yang ditambahkan di sini: **bahaya hari ini ×
keterpaparan × kapasitas**, per kecamatan, diperbarui harian.

- Bahaya diambil dari modul yang ada: karhutla (FWI/peluang), banjir (peluang),
  gempa (riwayat), gunung api (KRB/level), kekeringan, cuaca.
- Keterpaparan: penduduk, faskes, dan sekolah per kecamatan dari OSM/BPS di
  pipeline Python yang sudah ada.
- Kapasitas: posko dan regu aktif (Posko), relawan siap (R1), dan status
  Destana (S8).
- Keluaran: `public/data/risiko_kecamatan.json` dan halaman `/risiko` berupa
  peta koroplet, 20 kecamatan teratas, dan rincian komponennya.
- **Diberi label "indeks komposit, belum diuji balik"** sampai ada uji
  terhadap DIBI. Aturan kejujuran model berlaku (`validasi-model`).

### S1. Sitrep otomatis harian

- Halaman `/sitrep` dan `/sitrep/<prov>`, siap cetak A4/PDF: kejadian aktif per
  bencana, tren 24 jam, wilayah yang naik status, neraca Posko, laporan warga
  terverifikasi, relawan bertugas, logistik terkirim, dan rekomendasi tingkat
  respons berdasar aturan status yang ada.
- Dibangun dari `paparan`/`laporan` dan data modul. Tidak ada input baru.
- Teks ringkas siap tempel ke WhatsApp (tombol salin). Kiriman otomatis ke
  grup WA/Telegram **tidak** dibuat dalam 12 jam ini (butuh akun API dan izin).

### S2–S8. Mesin "Meja Kerja" (satu mesin, banyak formulir)

Tujuh sistem ini bentuknya sama: formulir, status bertahap, daftar per
wilayah, dan rekap. Supaya tidak menulis tujuh modul, dibuat **satu mesin
alur** dengan spesifikasi per meja (kolom, status, siapa boleh mengisi), dan
satu tabel D1 berkolom JSON beserta riwayat perubahan statusnya.

| Meja | Isi | Status | Rekap yang tampil |
|---|---|---|---|
| S2 Kaji cepat | rumah RB/RS/RR, fasum, korban per desa, foto | dilaporkan → diverifikasi → masuk JITUPASNA | rumah rusak per kab, umur data |
| S3 Logistik | permintaan (barang, jumlah, posko), pengiriman, penerimaan | diminta → disetujui → dikirim → diterima | permintaan tertunda > 24 jam, selisih kirim vs terima |
| S4 Rapor BPBD | dihitung dari waktu respons Posko, laporan warga, sitrep, logistik | — | peringkat per kab: waktu respons, kelengkapan, keaktifan |
| S5 DSP | permohonan, SK, cair, realisasi, SPJ | diajukan → disetujui → cair → SPJ → selesai | DSP belum SPJ > 30 hari |
| S6 Renkon | dokumen per kab dan bencana, tanggal sah, uji terakhir | berlaku / segera habis / kedaluwarsa | peta kab tanpa renkon berlaku |
| S7 Pengungsi | per posko: jumlah, balita, lansia, hamil, disabilitas, kebutuhan | dibuka → berjalan → ditutup | kebutuhan rentan belum terpenuhi |
| S8 Destana | desa, kelas (pratama/madya/utama), indikator, kegiatan terakhir | aktif / pasif | desa tangguh di kecamatan berisiko tinggi (R4) |

Isian dari daerah memakai **kode petugas BPBD** (pola kode regu Posko, per
kab). Admin pusat melihat semuanya.

### S9. Perkiraan kebutuhan musim (anggaran & armada)

Dari `prospektif.json` dan model sebaran dihitung perkiraan jam terbang water
bombing, regu, dan logistik per provinsi untuk 30/60/90 hari, lalu dikonversi
ke rupiah dengan tarif yang bisa diubah admin. Dilabeli **perkiraan**,
lengkap dengan asumsinya.

### S10. Berkas Gakkum konsesi

Dari `laporan_konsesi` dibuat satu tombol "unduh berkas" per konsesi berisi
kronologi titik api, citra sebelum/sesudah, riwayat terbakar 2015, dan luas.
Hanya untuk admin. Tidak dikirim otomatis ke siapa pun.

## 4. Rumah dan navigasi

- Satu pintu **`/bnpb`** (judul tampil "Ruang Koordinasi") berisi kartu ke tiap
  sistem dan angka hidupnya. Pintunya tidak ditaruh di nav utama situs publik
  sampai pemilik setuju. Fitur disembunyikan dulu, lalu dibuka.
- Halaman admin baru masuk ke nav admin yang ada (`admin_halaman.js`).
- Gaya mengikuti kartu Insight, tabel standar, pill berikon, dan aturan
  A1–A25. Tiap layar diperiksa di 1440 dan 390.

## 5. Cara kerja dan gerbang mutu

- **Satu cabang `main`, tanpa worktree.** Agent penulis jalan bergantian, atau
  paralel hanya bila berkasnya terpisah total. Pengkabelan bersama
  (`worker.js`, `cakupan.json`, nav admin, nomor migrasi) dikerjakan sesi induk.
- Pemilik berkas: route/D1 ke `warga-api`, layar ke `layar-peta`, pipeline
  risiko ke `pipa-umum`/`pipa-data`. Agent baru dibuat lewat roster bila perlu
  (mis. `relawan`, `meja-kerja`).
- Tiap tabel dan route baru **wajib diuji integrasi di Miniflare** dengan D1
  sungguhan dan masuk `tests/warga/cakupan.json`. Tidak ada mock.
- Tiap halaman bertombol 🧪/🧹 (Super Admin), isinya menurut halaman yang
  dibuka dan lewat rantai sungguhan (DUMMY.md). Data dummy tidak pernah ikut
  di angka publik.
- Pengulas sesudah tiap gelombang: `guard-api` + `security-reviewer` (data
  pribadi relawan!), `migrasi-idempoten`, `selera-angka`, `inp-reviewer`, lalu
  satu verifier berkonteks bersih. Sesi induk membaca sendiri tiap diff.
- Karena commit "gas" menyapu working tree, **yang ada di tree harus selalu
  aman tayang**: tiap sistem dikerjakan sampai uji hijau sebelum berkas
  berikutnya dibuka. Fitur yang belum siap disembunyikan di balik admin.
- Commit per sistem dengan path eksplisit. Push hanya di akhir gelombang,
  lalu tunggu `terbit.yml` sukses, cek aset hidup dan `/api/status` (memori
  terbit-gagal). Migrasi D1 produksi ikut terbit.

## 6. Yang perlu diputuskan pemilik sebelum mulai

1. **Tafsiran alun-alun** (§R2) sudah benar? Kalau maksudnya lain, sebutkan.
2. **Relawan tanpa NIK/KTP**: cukup nama, WA, dan email + verifikasi oleh
   kampus/admin. Setuju? Mengumpulkan NIK membawa kewajiban UU PDP yang berat.
3. **Akses tanpa akun** (kode pribadi seperti regu Posko) untuk relawan,
   kampus, dan petugas BPBD. Setuju, atau mau login email?
4. **Push ke produksi tiap akhir gelombang** (situs publik ikut berubah,
   pintu `/bnpb` tidak di nav), atau commit saja dan push setelah pemilik
   melihat?
5. **Branding**: tetap "Pantau Bencana", atau ada nama/logo BNPB? Memakai logo
   BNPB tanpa izin resmi tidak akan dilakukan.

## 7. Yang sengaja TIDAK dibuat

- Kiriman otomatis WA/Telegram/email ke grup atau perusahaan (butuh akun API
  dan izin).
- Integrasi langsung API DIBI/InaRISK (butuh kredensial BNPB). Disiapkan
  sebagai ekspor JSON/CSV yang formatnya mudah dipetakan.
- Aplikasi mobile native. Semua berupa web responsif, dan `/relawan/saya`
  ramah ponsel.
