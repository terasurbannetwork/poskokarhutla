# ALUR: Kemitraan Kampus

Dokumen ketiga dalam urutan otoritas. Kalah dari KP dan PRD; menang atas ALG, PD, DS, DT,
KM, RU, TIKET. Versi 1.0, 30 Okt 2026.

Notasi: `[peran]` pelaku (ST staf, PM pimpinan, SA super admin, BP BPBD, KK koordinator
kampus, AG anggota, PL penelaah, PB publik). `→` langkah. `⟂` titik tolak (validasi gagal,
pesan baku). `◆` jejak tercatat (tabel jejak). Status ditulis `monospace`.

Semua alur: tiap tulis D1 sekaligus menulis baris jejak `km_jejak` (siapa, kapan, dari,
ke). Semua kiriman ke luar = tombol yang ditekan manusia.

## 1. Fondasi

### 1.1 Kampus bergabung
1. [PB] `/kemitraan/daftar` pilih "Kampus" → isi form (PRD F-D2) + unggah surat tugas.
   ⟂ nama kampus sudah ada berstatus aktif → "Kampus sudah terdaftar. Hubungi koordinatornya."
2. Sistem: `institusi` baru (bila belum ada; pencocokan nama ternormalisasi) + `km_kampus`
   `menunggu` + `km_akun` peran `kk` `menunggu`. ◆
3. Antrean pengingat `km_kampus_menunggu` muncul untuk ST.
4. [ST] tampilan `kampus` → filter Menunggu → lembar kampus → **Setujui** (pilih peran
   simpul/satelit/mitra) atau **Tolak** (alasan wajib). ◆
5. Setujui → status `aktif`; sistem membuat tautan atur-sandi sekali pakai (berlaku 72
   jam, hanya sha di D1). [ST] menekan "Salin tautan" / "Kirim lewat WA" (wa.me ke PIC).
6. [KK] buka tautan → atur sandi (≥ 10 huruf) → masuk `/kemitraan/masuk` → tampilan
   `kampus` milik sendiri.

### 1.2 Anggota bergabung (dosen, tendik, mahasiswa, alumni)
1. [PB] `/kemitraan/daftar` pilih "Anggota kampus" → pilih kampus (hanya `aktif`) → unsur
   → isi form → setuju PDP. ⟂ WA/email sudah terdaftar di kampus yang sama → pesan baku
   tanpa membocorkan keberadaan (pola oracle relawan).
2. Sistem: `relawan` (jalur `kampus`, status `terdaftar`) + `km_anggota`. ◆
3. [KK] daftar anggota Menunggu → **Setujui** / **Tolak** (alasan). Setujui → relawan
   `diverifikasi`; kode pribadi 26 hex dibuat, ditampilkan SEKALI di layar KK beserta
   tombol "Kirim lewat WA" (wa.me berisi tautan `/kemitraan/saya#k=<kode>`).
4. [AG] buka tautan → kode pindah ke sessionStorage, fragmen dihapus → halaman saya →
   tombol **Saya siap bertugas** (aksi relawan lama → `siap_tugas`, DT ADR-09). Sebelum
   ditekan, anggota tidak masuk calon aktivasi.
5. Kode hilang: [KK] "Terbitkan ulang kode" → kode lama mati (sha diganti). ◆

### 1.3 Arsip MoU/PKS
1. [KK atau ST] lembar kampus → "Tambah perjanjian" → jenis, nomor, pihak, mulai,
   berakhir, PDF. ⟂ berakhir < mulai; PDF > 5 MB; bukan PDF (cek magic `%PDF`).
2. Sistem simpan R2 `kemitraan/perjanjian/<id>.pdf` + `km_perjanjian`. ◆
3. Cron 00:40 UTC: detektor `km_perjanjian` → antrean pengingat (≤ 60 hari, habis ≤ 30
   hari lalu). [ST] menekan "Kirim email ringkas" (pola C2) atau wa.me ke PIC.

### 1.4 BPBD mendapat akses
1. [ST] tampilan `daerah` → lembar kab → "Terbitkan kode BPBD" → nama petugas, jabatan,
   WA, berlaku (30–365 hari).
2. Sistem: `km_bpbd_kode` (sha, kab, berlaku). Kode tampil sekali + wa.me.
3. [BP] `/kemitraan/saya#k=` → melihat profil kab, buku, masalah kabnya, pendataan.

## 2. P1 Belanja Masalah Daerah

### 2.1 Profil siap sebelum siapa pun datang
1. Harian 02.30 UTC (`kemitraan.yml`, sesudah `lintas.yml`): `kode.py` (bila sumber
   berubah) → `profil_daerah.py` → 514 + 38 JSON → commit ke `public/data/kemitraan/`.
2. Bulanan tanggal 2 (`kemitraan-pakar.yml`): `korpus.py` → `indeks_bm25.py` →
   `cocok_pakar.py` → R2 `kemitraan/korpus|indeks_bm25|cocok/`.
3. Tidak ada langkah manusia. Gagal sumber → blok `null` + catatan di `sumber[]`; gagal
   seluruhnya → berkas lama dipertahankan (pola `jaga_segar.py`).

### 2.2 Staf menyiapkan kunjungan pendataan
1. [ST] `daerah` → cari "Pulang Pisau" → lembar daerah (ringkasan + tab bab).
2. Tab Masalah: daftar masalah otomatis (pil "Otomatis") + masalah BPBD + yang sudah
   tervalidasi. Urut kelas lalu skor.
3. [ST] ikon **Buku** → `/kemitraan/buku?kab=6211` → cetak/simpan PDF (bab 1–9).
4. [ST] tab Panduan → pilih narasumber (centang) → **Susun panduan** →
   `/kemitraan/panduan?kab=6211&n=bpbd,bappeda,kades` → cetak.
5. [ST] **Rencanakan kunjungan**: tanggal, tim (staf + anggota kampus opsional),
   narasumber → `km_kunjungan` `rencana`. ◆ Tiap anggota tim non-staf mendapat baris
   `km_bpbd_kode` jenis `tim_pendataan` (kab sama, berlaku 14 hari); id baris itu disimpan di
   `km_kunjungan.tim`, jadi kode hanya bisa mengisi kunjungan itu. Kode via wa.me.

### 2.3 BPBD membelanjakan masalah
1. [BP] halaman saya → "Ajukan masalah" → form F-M4 (B dan A wajib; saran kategori dari
   kamus saat mengetik, ALG §2.3). ⟂ uraian < 50 huruf; lampiran bukan PDF/JPG/PNG.
2. `km_masalah` sumber `bpbd`, status `diajukan`. ◆ Pengingat `km_masalah_basi` bila > 14
   hari tanpa telaah.
3. [ST] `masalah` → filter Diajukan → lembar masalah → nilai U, C, R, J (0–3) →
   **Validasi** (`tervalidasi`) / **Gabungkan** (pilih induk; saran Jaccard ALG §3.5) /
   **Tolak** (alasan). ◆
4. Tervalidasi → sistem menghitung kecocokan pakar (ALG §4.6) → status `dicocokkan`.

### 2.4 Mengambil masalah otomatis
1. [ST] lembar daerah → masalah otomatis → **Ambil** → menjadi `km_masalah` sumber
   `otomatis`, status `ditelaah` (bukti disalin beku dari JSON hari itu). ◆
2. Lanjut seperti 2.3 langkah 3.

### 2.5 Pendataan lapangan
1. [ST/BP/AG-tim] `/kemitraan/saya` atau tampilan `masalah` → kunjungan `rencana` →
   **Mulai** (`berjalan`) → formulir: per narasumber, pertanyaan generator tampil satu per
   satu; jawab (teks, pilihan ya/tidak/sebagian, angka), tandai "angka profil keliru" →
   isi angka koreksi + sumber; tambah masalah baru; foto ≤ 5.
2. Luring: isian masuk antrean `antre.js`, dikirim saat sinyal ada (idempoten `klien_id`).
3. **Selesai** → `km_kunjungan` `selesai`; masalah yang dikonfirmasi ≥ 1 jawaban
   "ya/sebagian" pada pertanyaan konfirmasi → `tervalidasi` (bila masih `ditelaah`). ◆
   Koreksi → `km_koreksi` `menunggu` → [ST] terima/tolak → profil menampilkan koreksi.

### 2.6 Memilih pakar dan menindaklanjuti
1. [ST] lembar masalah → tab Pakar: 10 kartu (ALG §4.5) dengan 3 paper + kutipan solusi.
2. Centang → daftar pendek (pola `/akademisi` `.ak-dpbar`) → unduh XLSX/DOCX/PDF.
3. **Hubungi**: wa.me/mailto ke kontak publik pakar (bila ada) dengan teks baku berisi
   judul masalah + tautan ringkasan. Tercatat `km_masalah_pakar` (status `dihubungi`). ◆
4. [ST] perbarui status pakar: `bersedia` / `tidak` / `tanpa_jawaban`.
5. Masalah dengan ≥ 1 pakar bersedia → **Jadikan proposal** (alur 3.3) atau **Jadikan
   hibah** (alur 3.4) atau **Tugaskan pendampingan** (alur 5.3) → masalah `diambil`.

## 3. P2 Riset dan dana

### 3.1 Agenda riset otomatis
1. [ST] `riset` → **Susun agenda {tahun}** → sistem mengelompokkan masalah tervalidasi
   P1/P2 per kategori (ALG §3.5) → draf topik (judul baku, daerah, bukti, pertanyaan riset
   ALG §6.3, model gagal terkait).
2. [ST] sunting/hapus/gabung topik → **Terbitkan** → baris `riset_agenda` (status `buka`)
   + `km_agenda_sumber` (masalah→agenda). ◆ Agenda tampil di `/riset` publik (pola lama).

### 3.2 Donor dan panggilan
1. [ST] `dana` → tab Donor → tambah/sunting donor (PRD F-R2). Panggilan: judul, buka,
   tenggat, nilai, tautan. ◆
2. Cron: detektor `km_tenggat_donor` (≤ 30 hari, ≤ 7 hari) → antrean pengingat.
3. Lembar donor: masalah cocok (ALG §8). Lembar masalah: donor cocok.

### 3.3 Proposal bersama untuk dana luar
1. [ST atau KK] dari masalah/donor → **Mulai proposal** → `km_proposal` `ide`.
2. Tab Konsorsium: ketua kampus (wajib), anggota kampus, pakar (dari daftar pendek), mitra
   luar negeri (teks: lembaga, negara, PIC), unit BNPB, BPBD lokasi → `tim`. ⟂ ketua kampus
   bukan kampus `aktif`.
3. Unggah draf (R2) → `draf`. [ST] **Buat surat dukungan**: draf DOCX templat + nomor
   registri `KM/SD/<tahun>/<urut>` (T-G). ◆
4. **Tandai diajukan** (tanggal) → `diajukan`; **Hasil**: `lolos` (nilai disetujui, dana
   pendamping) / `ditolak` (catatan pelajaran). Lolos → `berjalan` → luaran dicatat ke
   `riset_luaran` → `selesai`. ◆

### 3.4 Hibah BNPB
1. [ST] `riset` → tab Hibah → **Buka panggilan**: agenda terkait, pagu, kuota, rubrik
   (kriteria + bobot, jumlah bobot 100), tenggat → `km_hibah_panggilan` `buka`.
2. [KK] lihat panggilan → **Ajukan** (judul, ketua, anggota, masalah, metode, anggaran,
   berkas) → `km_hibah_proposal` `diajukan`. ⟂ lewat tenggat; kuota kampus penuh.
3. Tenggat lewat → panggilan `telaah`. [ST] tugaskan ≥ 2 penelaah per proposal (pilih
   dari daftar pendek pakar; konflik kepentingan: penelaah sekampus ditolak) → kode PL
   dibuat, wa.me.
4. [PL] `/kemitraan/saya#k=` → proposal yang ditugaskan → rubrik 0–5 per kriteria +
   catatan → **Kirim** (tidak bisa diubah setelah kirim). ◆
5. Sistem: nilai = Σ bobot·rerata penelaah; bendera bila selisih penelaah > 2 di satu
   kriteria. [ST] tambah penelaah ketiga bila perlu → **Umumkan**: lolos/cadangan/tidak
   per peringkat dan pagu → `km_hibah_proposal` status akhir.
6. Lolos → sistem membuat `mitra_riset` (bila belum) + `riset_usulan` status `disetujui`
   → alur 0025 berjalan (kemajuan, laporan akhir, luaran, kebijakan). ◆

### 3.5 Inovasi
1. [KK] `riset` → tab Inovasi → tambah: nama, masalah terkait, bahaya, TKT + bukti tiap
   tingkat (teks + berkas), kontak.
2. [ST] verifikasi TKT (setuju/turunkan + alasan) → uji lapangan dijadwalkan (BPBD,
   tanggal) → hasil `lolos/gagal` + laporan → e-Katalog `proses/tayang`. ◆

## 4. P3 Satgas Kampus

### 4.1 Membentuk satgas
1. [KK] `satgas` → **Bentuk satgas**: ketua (anggota dosen/tendik), wakil unsur kampus,
   wakil mahasiswa, wakil alumni (masing-masing anggota disetujui dengan unsur yang sesuai),
   radius gerak, fasilitas kampus (posko, gudang, RS pendidikan, lab; kapasitas).
   ⟂ salah satu dari tiga unsur kosong → status `belum_lengkap`.
2. Anggota satgas = anggota kampus yang dicentang KK. Status siap dihitung: `siap` bila
   tiga unsur terisi, ≥ 10 anggota `siap_tugas`, ≥ 3 berlatih (`relawan_pelatihan`).

### 4.2 Pakar siaga
1. [ST] `satgas` → tab Piket → minggu → per rumpun pilih 2 utama + 1 cadangan dari daftar
   pendek → kode PL per pakar + wa.me konfirmasi.
2. [Pakar] halaman saya → **Bersedia minggu ini** / **Tidak** → tercatat. ◆
3. Pengingat `km_piket_kosong` bila rumpun tanpa pakar bersedia untuk minggu depan (Kamis).

### 4.3 Aktifkan kampus untuk satu kejadian
1. [ST] `satgas` → **Aktifkan kampus** → pilih kejadian: dari daftar peringatan/kejadian
   platform (karhutla Awas, banjir status, gempa M ≥ 5, gunung api naik level, DIBI baru)
   atau manual (jenis, kab, tanggal, titik). Tentukan radius (50–500 km) dan kebutuhan
   (keahlian × jumlah).
2. Sistem: `km_aktivasi` `buka` + satu `relawan_permintaan` (DT ADR-08); daftar calon: pakar piket rumpun kejadian di atas, lalu
   anggota satgas/alumni urut ALG §9; satgas kampus dalam radius; fasilitas kampus
   terdekat; kontak mitra (TNI/Polri/Basarnas/PMI/BPBD) dari `kontak_pemangku` kab/prov.
3. [ST] centang calon → **Siapkan panggilan** → `km_panggilan` per orang (`dikirim`
   saat tombol wa.me ditekan; `belum` bila belum). Tidak ada kiriman otomatis.
4. [AG] halaman saya → kartu panggilan → **Bersedia** (pilih hari tersedia) / **Tidak**.
5. [ST] lembar aktivasi: yang bersedia → **Tugaskan** (peran: kaji cepat, logistik, medis,
   psikososial, pendataan pengungsi, posko kampus) → `relawan_penugasan` (ditawarkan →
   diterima otomatis karena sudah bersedia). ◆
6. Lapangan: check-in/out `relawan_jam` (pola lama, luring). Laporan harian satgas
   (ringkas teks + angka) → `km_aktivasi_laporan`; sitrep membaca agregatnya.
7. [ST] **Tutup aktivasi** → `tutup`; penugasan berjalan → `selesai`.

### 4.4 Tim kaji cepat
1. Dalam lembar aktivasi → **Rakit tim kaji cepat**: pilih pakar + anggota berlatih kaji
   cepat → tiap orang mendapat kode Meja Kerja meja `kaji_cepat` kab kejadian (pola 0026).
   `meja_petugas` tak punya kolom berlaku: cron bersih mencabutnya saat aktivasi ditutup atau
   14 hari sejak dibuat (DT §10). ◆
2. Isian kaji cepat/Jitupasna masuk `meja_catatan` (alur lama); tautan ke aktivasi lewat
   `meja_catatan.petugas_id ∈ km_aktivasi_meja`. Lembar aktivasi menampilkan rekapnya.

### 4.5 Pascatugas
1. [KK] validasi jam anggota kampusnya (pola `/kampus` lama) atau [ST].
2. Sistem: sertifikat `km_sertifikat` (id acak 16 hex, nama, kampus, peran, jam, kejadian)
   → halaman verifikasi publik `/kemitraan/sertifikat/<id>` (tanpa kontak) + QR.
3. [Pakar ditunjuk ST] isi catatan pembelajaran (kerangka otomatis: garis waktu dari
   arsip sitrep, isian kaji cepat, jumlah anggota, jam) → `km_pelajaran`. ◆

## 5. P4 Talenta dan pendampingan

### 5.1 Magang
1. [ST atau BP] `talenta` → Magang → **Buka lowongan** (unit/BPBD, kab, kuota, keahlian,
   periode, pembimbing nama+WA) → `km_magang` `buka`.
2. [AG mahasiswa] halaman saya → lowongan cocok → **Lamar** (motivasi ≤ 1.000, CV PDF) →
   `km_magang_lamar` `diajukan`. KK kampusnya melihat. ⟂ lowongan penuh/tutup.
3. [ST/BP] seleksi → `diterima/ditolak/cadangan` → diterima: penempatan (+ kode Meja bila
   operator BPBD) → `berjalan`; jam `relawan_jam`.
4. Akhir periode: [pembimbing lewat kode PL] rubrik 6 butir 1–5 + catatan → `dinilai` →
   sertifikat + rekap SKS (jam/170 per SKS, asumsi-kebijakan) → `selesai`. ◆

### 5.2 Alumni mentor
1. [AG alumni] halaman saya → centang "Bersedia jadi mentor" + instansi + kab kerja.
2. Saat magang `diterima` di kab K: sistem menyarankan alumni mentor di kab K (atau prov)
   → [KK/ST] **Pasangkan** → `km_mentor` → wa.me perkenalan.

### 5.3 Pendampingan kab/kota
1. [ST] lembar daerah → **Tugaskan kampus pendamping**: kampus, jenis (KRB, RPB, IKD,
   renkon, Destana), mulai, tenggat, sumber dana → `km_dampingan` `berjalan`.
2. [KK] perbarui status dokumen (`disusun` → `selesai`, unggah bukti) → [ST] verifikasi.
3. Profil daerah blok kapasitas menampilkan kampus pendamping.

### 5.4 Desa binaan
1. [KK] `talenta` → Desa binaan → **Tambah**: cari desa (`desa_cari.json`), tema, angkatan
   KKN → `km_desa`.
2. Tiap kunjungan/KKN: catatan (tanggal, angkatan, kegiatan, temuan, rencana lanjut, foto
   ≤ 3) → `km_desa_catatan`; angkatan berikutnya membaca riwayat lengkap.

### 5.5 BUMN dan dunia usaha
1. [ST] daftar BUMN/perusahaan: nama, bidang TJSL, kab operasi (multi).
2. Sistem: kartu Peluang TJSL per kab = perusahaan × desa binaan × satgas di kab yang sama.
3. [ST] tandai `dijajaki/sepakat/tidak` + catatan. ◆

### 5.6 Bank modul
1. [ST] unggah modul/RPS (judul, kategori, versi, berkas ≤ 10 MB PDF/DOCX/PPTX).
2. [PB] `/kemitraan` publik ringkas → daftar modul → unduh (hitungan unduh tercatat
   agregat).

## 6. Lintas

### 6.1 Dasbor
[PM/ST] `dasbor` → 14 indikator (nilai, sasaran 2027/2029, tren triwulan), peta celah,
kampus pasif, unduh PPTX/PDF. Angka dari kueri tetap (DT §6.3), dummy dikecualikan.

### 6.2 Dummy
[SA] tombol 🧪 di kepala `/kemitraan` → `POST /api/kemitraan/dummy {aksi:"isi"}` → contoh
di semua tabel `km_*` (kampus dummy, anggota, masalah, proposal, satgas, aktivasi, magang).
🧹 menghapus anak dulu, lalu induk.
