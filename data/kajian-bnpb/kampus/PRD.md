# PRD: Kemitraan Kampus (`/kemitraan`)

Dokumen kedua dalam urutan otoritas (AGENTS.md §2.2). Kalah dari `KEPUTUSAN-KAMPUS.md`
(disingkat KP); menang atas ALUR, ALGORITMA (ALG), PROFIL-DAERAH (PD), DESIGN-SYSTEM (DS),
DESAIN-TEKNIS (DT), KEAMANAN-PRIVASI (KM), RENCANA-UJI (RU), TIKET.
Versi 1.0, 30 Okt 2026.

**Konvensi berkas ini.** Fitur berkode `F-<pilar><nomor>` (F-D1 fondasi, F-M masalah,
F-R riset, F-S satgas, F-T talenta, F-X lintas). Ukuran keberhasilan `U1..`.
Pertanyaan terbuka mengikuti KP §H (T-A..T-G).

## 1. Ringkasan

### 1.1 Masalah
Paparan Grand Design (slide 2, 9): kepakaran kebencanaan di kampus belum tersambung baku
dengan kebutuhan BNPB dan BPBD. Akar masalahnya: belum satu agenda, belum ada jembatan
masalah↔peneliti, belum ada dana pemicu, pengakuan kontribusi belum baku.

Platform sendiri punya tiga celah yang bisa ditutup kampus: daerah belum memakai platform,
banyak model gagal uji karena label lapangan kurang, dan kampus masuk lewat tiga pintu
terpisah (`/relawan` kode koordinator, `/riset/mitra` kode mitra, `/akademisi` staf).

### 1.2 Tujuan
Satu modul yang:
1. Menyusun **profil daerah lengkap semua bencana** dan daftar masalah per daerah sebelum
   tim datang (KP 7–9).
2. Mencocokkan masalah dengan **pakar teratas + paper + solusi** dan menghasilkan
   **pertanyaan pendataan dan pertanyaan riset** (KP 10–11).
3. Mengubah masalah menjadi **proposal bersama untuk dana luar** (KP 13–15).
4. Menggerakkan **Satgas Kampus** saat bencana (KP 16–18).
5. Mengalirkan **talenta** (magang, alumni, desa binaan, dampingan) ke daerah (KP 19).
6. Menyatukan pintu kampus dengan persetujuan berjenjang (KP 20–22).

### 1.3 Ukuran keberhasilan
| Kode | Ukuran | Sasaran 2027 | Sumber hitung |
| --- | --- | --- | --- |
| U1 | Kab/kota dengan profil daerah siap cetak | 548 (semua kode IRBI) | pipeline `profil_daerah.py` |
| U2 | Masalah tervalidasi pendataan | ≥ 300 di ≥ 38 prov | `km_masalah.status='tervalidasi'` |
| U3 | Rekomendasi pakar lolos uji relevansi | nDCG@10 ≥ pembanding + 0,10 | RU §2.9 |
| U4 | Proposal bersama diajukan ke donor | ≥ 3 (slide 28) | `km_proposal` |
| U5 | Satgas kampus terdaftar siap gerak | ≥ 10 kampus simpul | `km_satgas` |
| U6 | Indikator kinerja slide 28 terhitung otomatis | 14 dari 14 | F-X1 |

### 1.4 Non-tujuan
Alur paraf/tanda tangan MoU; LMS/kelas daring; forum/jurnal; pesan WA/email otomatis ke
luar; aplikasi native; penilaian kinerja dosen individual; perintah ke TNI/Polri.

### 1.5 Larangan
- Tidak ada angka tanpa sumber dan tanggal. Indeks buatan sendiri berpil "Belum diuji".
- Data pribadi pakar, mahasiswa, alumni tidak pernah masuk `public/` atau git.
- Tidak ada kiriman otomatis; semua lewat tombol yang ditekan manusia (wa.me, salin, unduh).
- Tidak membuat tabel kembar untuk yang sudah ada (`institusi`, `relawan`, `relawan_jam`,
  `relawan_penugasan`, `riset_*`, `meja_*`, `pengingat`).

## 2. Pengguna dan peran

| Peran | Kode hak | Masuk lewat | Boleh |
| --- | --- | --- | --- |
| Staf BNPB kemitraan | ST | sesi staf (`stafOK`, peran baru `kemitraan`) | semua tampilan; menyetujui kampus; menerbitkan kode BPBD; mengaktifkan satgas; mengelola donor/hibah |
| Pimpinan | PM | sesi staf peran `pimpinan` | baca semua + dasbor; tidak menulis |
| Super Admin | SA | `superOK` | ST + tombol 🧪/🧹 |
| Petugas BPBD | BP | kode pribadi per kab (T-E), header `x-kode` | membaca profil dan buku kabnya; mengajukan dan menilai masalah kabnya; mengisi pendataan |
| Koordinator kampus | KK | akun sandi PBKDF2 (pola pendataan), disetujui ST | profil kampus, arsip MoU, setujui anggota, kelola satgas, ajukan proposal, inovasi, magang kampusnya, desa binaan |
| Anggota kampus (dosen, tendik, mahasiswa, alumni) | AG | kode pribadi (pola relawan), disetujui KK | profil dirinya, jawab panggilan satgas, lamar magang, check-in |
| Penelaah hibah | PL | kode pribadi per penugasan telaah | membaca proposal yang ditugaskan, mengisi rubrik |
| Publik | PB | tanpa masuk | halaman daftar kampus/anggota, ringkasan agregat, unduh modul/RPS |

Mitra pendukung (TNI, Polri, Basarnas, PMI, dunia usaha) **tidak punya akun** di fase 1.
Mereka tercatat sebagai kontak di `kontak_pemangku` dan muncul di lembar aktivasi.

## 3. Peta layar (`/kemitraan`, satu halaman bersegmen, pola `/akademisi`)

| Tampilan (`?tampil=`) | Isi | Hak |
| --- | --- | --- |
| `daerah` (bawaan) | daftar 548 kab/kota, kartu daerah, lembar profil, ikon Buku | ST, PM, BP (kabnya), KK (baca) |
| `masalah` | belanja masalah: daftar, kategori, prioritas, pakar, pertanyaan | ST, PM, BP, KK (baca masalah terbuka) |
| `riset` | agenda otomatis, hibah, inovasi | ST, PM, KK |
| `dana` | kalender donor, cocok donor, konsorsium, proposal | ST, PM, KK |
| `satgas` | satgas kampus, aktivasi, pakar siaga, kaji cepat | ST, PM, KK |
| `talenta` | magang, alumni mentor, desa binaan, dampingan, BUMN, modul | ST, PM, KK |
| `kampus` | direktori kampus mitra + profil + MoU | ST, PM, KK (miliknya) |
| `dasbor` | 14 indikator slide 28 + celah | ST, PM |

Halaman lain:
- `/kemitraan/buku?kab=<kode4>` cetak A4 buku profil daerah (F-M2).
- `/kemitraan/panduan?kab=<kode4>&masalah=<id>` cetak panduan wawancara (F-M6).
- `/kemitraan/daftar` pendaftaran publik: kampus baru atau anggota kampus (F-D2).
- `/kemitraan/saya` halaman berkode anggota/BPBD/penelaah (F-D3).
- `/kemitraan/masuk` masuk akun koordinator kampus.

`/akademisi` tetap halaman pakar; `/kemitraan` menautkannya (bukan menyalin).

## 4. Fondasi: Pintu Kampus

### F-D1 Profil kampus
- **Tujuan:** satu kartu per kampus mitra yang menggabungkan data yang sudah ada.
- **Isi:** nama, singkatan, jenis (ptn/pts), provinsi/kota, logo, peran (simpul/satelit/
  mitra), pusat studi bencana, prodi terkait, jumlah pakar per rumpun (dari induk
  `/akademisi`), fasilitas yang disepakati (gedung posko, gudang, RS pendidikan, lab),
  wilayah binaan (desa, kab dampingan), satgas, MoU aktif, skor keaktifan.
- **Aturan:** identitas di `institusi` (0023). Kolom tambahan di `km_kampus` (DT §3.1).
  Pakar tidak disalin; dihitung dari R2 `akademisi/induk.json` lewat nama kampus.

### F-D2 Pendaftaran berjenjang
- **Kampus baru:** form publik (nama, jenis, prov, nama/jabatan/email/WA PIC, surat
  tugas PDF ≤ 2 MB) → status `menunggu` → ST setujui → akun KK aktif, sandi diset lewat
  tautan sekali pakai (pola pendataan).
- **Anggota:** form publik pilih kampus (hanya kampus `aktif`), unsur (dosen, tendik,
  mahasiswa, alumni), keahlian (daftar tetap relawan), prodi, angkatan/tahun lulus, kab
  domisili, instansi kerja (alumni), WA/email, setuju PDP → status `terdaftar` → KK
  setujui → kode pribadi tampil sekali (`#k=`).
- **Aturan:** anggota disimpan di `relawan` (jalur `kampus`, `kampus_id`) + baris
  `km_anggota` (unsur, prodi, angkatan, instansi, mentor). Turnstile aktif bila sitekey ada.

### F-D3 Halaman saya (berkode)
Anggota: profil, panggilan satgas (Bersedia/Tidak), penugasan, check-in/out, jam sah,
lamaran magang, sertifikat, tombol **Saya siap bertugas** (DT ADR-09). BPBD: profil dan buku kabnya, masalah kabnya, pendataan.

### F-D4 Arsip MoU/PKS
- **Isi:** jenis baru di `km_perjanjian` (mou_payung, mou_kampus, pks_pendampingan,
  pks_satgas, lainnya); `mou_relawan` dan `pks_riset` tetap di `institusi_perjanjian` lama
  (DT ADR-05), lembar kampus menampilkan keduanya; nomor, pihak, mulai, berakhir, berkas PDF di R2 (≤ 5 MB), status hitung
  (belum, aktif, segera_habis ≤ 60 hari, habis).
- **Aturan:** pengingat masuk antrean C2 (`src/pengingat.js`) jenis `km_perjanjian`.
  Tidak ada tanda tangan digital (KP 21).

### F-D5 Skor keaktifan kampus
Dihitung harian dari aktivitas 365 hari: masalah diambil, proposal, satgas siap, jam sah,
magang, desa binaan, luaran. Rumus ALG §7. Simpul tanpa aktivitas 365 hari ditandai
"Pasif" (slide 12, 28).

## 5. P1 Belanja Masalah Daerah

### F-M1 Profil daerah
- **Tujuan:** profil lengkap semua bencana per kab/kota (548 kode IRBI) dan per provinsi.
- **Isi:** PD §2 (bab demi bab). Ringkasnya: gambaran wilayah, IRBI 2015–2025 per bahaya,
  InaRISK per kecamatan, riwayat kejadian 2008–2025, keluaran model platform per bahaya,
  paparan (penduduk, rentan, bangunan, sekolah, faskes), sosek BPS, kapasitas (BPBD,
  perda, RPB, renkon, relawan, kampus terdekat), masalah prioritas, pakar, panduan.
- **Tata letak:** kartu daerah di daftar; klik membuka lembar `.ak-sheet` (pola profil
  kampus /akademisi) berisi ringkasan + tab bab; ikon Buku di kepala lembar.
- **Aturan:** semua angka dari `public/data/kemitraan/daerah/<kode4>.json` (pipeline);
  tiap blok menyebut sumber + tanggal; data kosong ditulis "Tidak ada data", bukan 0.

### F-M2 Buku profil daerah (satu tekan)
- **Tujuan:** ikon Buku → `/kemitraan/buku?kab=` → halaman cetak A4 (pola `laporan.js`
  `@page`) → tombol Cetak/Simpan PDF.
- **Isi:** PD §3 (sampul, ringkasan 1 halaman, bab 1–9, lampiran sumber).
- **Aturan:** bab pakar hanya untuk ST/BP/KK (T-B). Waktu render ≤ 3 dtk di laptop
  kantor; peta SVG sendiri, tanpa pustaka peta.

### F-M3 Masalah otomatis (kategori dari data)
- **Tujuan:** tiap daerah mendapat daftar masalah kandidat dari data sebelum pendataan.
- **Isi:** kategori = bahaya × aspek (ALG §2); tiap masalah berisi judul baku, bukti
  angka (IRBI, kejadian, tren, kapasitas), skor prioritas, pil "Otomatis, belum
  divalidasi".
- **Aturan:** dihasilkan pipeline; tidak tersimpan di D1 sampai diambil ("Ambil" →
  baris `km_masalah` sumber `otomatis`).

### F-M4 Belanja masalah oleh BPBD dan unit BNPB
- **Tujuan:** BPBD/unit mengajukan masalah dan kebutuhan.
- **Form:** kab (terkunci untuk BP), bahaya (registri), aspek (ALG §2.2), judul (≤ 120),
  uraian (≤ 2.000), dampak bila tidak ditangani, kebutuhan (pilihan: kajian, data/peta,
  model/peringatan dini, teknologi tepat guna, pelatihan, pendampingan dokumen, tenaga),
  pernah dicoba apa, lampiran (≤ 3 berkas, 5 MB), kontak PIC.
- **Penilaian:** ST menilai urgensi, cakupan, kesiapan data, kecocokan kampus (0–3 tiap
  butir, ALG §3); skor gabung + skor data → prioritas P1/P2/P3.
- **Status:** `diajukan → ditelaah → (tervalidasi | digabung | ditolak) → dicocokkan →
  diambil → berjalan → selesai`. `digabung` menunjuk masalah induk (lintas daerah).

### F-M5 Rekomendasi pakar + paper + solusi
- **Tujuan:** tiap masalah tervalidasi/otomatis menampilkan 10 pakar teratas.
- **Isi per pakar:** foto/inisial, nama, kampus, jarak, skor dan pecahan skor (teks,
  kecocokan, bukti lokal, mutu, jarak, rekam jejak), 3 paper bukti (judul, tahun, terbitan,
  tautan DOI/OpenAlex), 1–2 kalimat solusi kutipan asli abstrak, tombol tambah ke daftar
  pendek (pola /akademisi), tombol "Hubungi" (wa.me/mailto, dibuka manusia).
- **Aturan:** algoritma ALG §4–§5; pil "Belum diuji" sampai RU §2.9 lolos; maks 2 pakar
  per kampus di 10 teratas; data pakar hanya dari R2, tidak pernah dari `public/`.

### F-M6 Generator pertanyaan
- **Tujuan:** panduan pendataan dan pertanyaan riset untuk satu daerah atau satu masalah.
- **Isi:** (a) pertanyaan wawancara per narasumber (BPBD, Bappeda, PU, Dinkes, Dinsos,
  camat/kades, masyarakat, dunia usaha), urut arah: konfirmasi data → akar masalah →
  kapasitas → upaya yang pernah dicoba → kebutuhan → harapan ke kampus; (b) daftar data
  yang harus diminta; (c) 3–8 pertanyaan riset berbentuk baku. Semua terisi angka profil.
- **Aturan:** templat tetap ALG §6; keluaran: lembar layar, cetak
  `/kemitraan/panduan`, dan formulir pendataan F-M7.

### F-M7 Pendataan lapangan
- **Tujuan:** tim BNPB/BPBD mengisi jawaban di lapangan, termasuk luring.
- **Isi:** kunjungan (kab, tanggal, tim, narasumber), jawaban per pertanyaan generator,
  koreksi angka profil, masalah baru, foto (≤ 5).
- **Aturan:** antrean luring `public/bnpb/antre.js`; jawaban mengubah status masalah
  otomatis → `tervalidasi` bila ≥ 1 kunjungan mengonfirmasi; koreksi angka disimpan
  terpisah (`km_koreksi`) dan tampil di profil sebagai "Koreksi lapangan, <tgl>".

## 6. P2 Riset dan Inovasi Bersama

### F-R1 Agenda riset otomatis
Tiap 1 Januari dan saat ST menekan "Susun ulang": masalah P1 tervalidasi dikelompokkan per
kategori (lintas daerah) → topik agenda (judul baku + daerah + bukti + pertanyaan riset
F-M6 + model gagal terkait dari `gerbang_model.json`/uji balik). Disimpan ke
`riset_agenda` (0025) dengan penanda `km_sumber`. ST boleh menyunting sebelum terbit.

### F-R2 Kalender donor + pengingat
Daftar donor (A2 paparan: SATREPS, SIAP SIAGA, KOICA, Wellcome, BRIN RIIM, BIMA, TJSL,
LPDP, Zurich, GFDRR, ADB, IDRC, Horizon Europe, dll.) dengan bidang, bahaya, syarat mitra,
skema dana, status kesiapan. Panggilan (judul, buka, tenggat, nilai, tautan). Pengingat
C2: tenggat ≤ 30 hari dan ≤ 7 hari.

### F-R3 Pencocokan masalah/program ↔ donor
Skor ALG §8 (bahaya, aspek, syarat negara/mitra, tenggat, nilai). Tampil di lembar
masalah ("3 donor cocok") dan di lembar donor ("12 masalah cocok").

### F-R4 Penyusun konsorsium
Dari masalah: pilih ketua kampus, anggota kampus (simpul/satelit), pakar (dari daftar
pendek), mitra luar negeri (teks), unit BNPB pendamping, BPBD lokasi. Keluaran: tabel
konsorsium + matriks peran + unduh DOCX/XLSX (pola daftar pendek).

### F-R5 Proposal bersama
Status `ide → tim → draf → diajukan → (lolos | ditolak) → berjalan → selesai`. Isi: donor,
panggilan, masalah, konsorsium, nilai diminta, dana pendamping, surat dukungan BNPB
(draf + nomor registri, T-G), berkas proposal (R2). Luaran berjalan dicatat ke
`riset_luaran`.

### F-R6 Siklus hibah BNPB (dana pemicu)
Panggilan internal (agenda, pagu, kuota, rubrik, tenggat) → proposal kampus → ST
menugaskan ≥ 2 penelaah (kode pribadi) → rubrik 0–5 per kriteria → rata-rata + selisih
penelaah > 2 ditandai → ST umumkan (lolos/cadangan/tidak) → yang lolos jadi
`riset_usulan` berstatus `disetujui` (alur 0025 berlanjut).

### F-R7 Inovasi + TKT
Registri inovasi kampus: nama, masalah yang dijawab, bahaya, TKT 1–9 (dengan bukti per
tingkat), status uji lapangan (belum, dijadwalkan, lolos, gagal), e-Katalog (belum,
proses, tayang), kontak. Ditautkan ke masalah.

## 7. P3 Satgas Kampus Tanggap Bencana

### F-S1 Satgas per kampus
Struktur: ketua, wakil unsur kampus, wakil unsur mahasiswa, wakil unsur alumni (KP 16);
anggota dari `km_anggota`; keahlian; latihan; status siap (siap, terbatas, tidak siap);
radius gerak (km); fasilitas kampus yang disepakati.

### F-S2 Aktifkan kampus
- **Pemicu:** ST memilih kejadian (dari daftar kejadian/peringatan platform atau isi manual:
  jenis, kab, tanggal, titik) dan menekan "Aktifkan kampus".
- **Daftar panggil:** satgas dan anggota (termasuk alumni) dalam radius, urut ALG §9
  (jarak, keahlian dibutuhkan, status siap, jam sah sebelumnya). ST mencentang.
- **Kirim:** tidak otomatis. Tiap panggilan membuat tautan wa.me berisi teks baku +
  tautan halaman saya; ST membuka satu per satu atau menyalin pesan grup.
- **Konfirmasi:** anggota menekan Bersedia/Tidak di halaman saya; tercatat dengan waktu.
- **Lembar aktivasi:** peta SVG lokasi + satgas, tabel siapa di mana mengerjakan apa,
  kontak mitra pendukung (TNI, Polri, Basarnas, PMI, BPBD) dari `kontak_pemangku`,
  fasilitas kampus terdekat. Cetak A4 + salin teks WA.
- **Penugasan:** yang bersedia → `relawan_penugasan` (pola lama); jam lewat `relawan_jam`.

### F-S3 Pakar siaga bergiliran
Jadwal piket mingguan per rumpun (13 rumpun /akademisi): 2 pakar utama + 1 cadangan.
Pakar diambil dari daftar pendek staf; konfirmasi kesediaan per minggu (kode pribadi
penelaah-pola). Saat aktivasi, pakar piket rumpun kejadian tampil teratas.

### F-S4 Tim kaji cepat + Jitupasna
ST merakit tim (pakar + anggota bertanda latih kaji cepat) → tiap anggota tim dapat kode
Meja Kerja meja `kaji_cepat` untuk kab itu (pola 0026) → formulir kaji cepat/Jitupasna
yang sudah ada dipakai; isian tertaut `km_aktivasi`. Rekap tim tampil di lembar aktivasi.

### F-S5 Pascatugas
Jam diverifikasi KK/ST → sertifikat ber-QR (verifikasi publik `/kemitraan/sertifikat/<id>`)
→ dihitung di skor kampus. Kerangka "catatan pembelajaran" terisi otomatis dari arsip
sitrep + isian kaji cepat; anggota pakar menulis analisis (teks ≤ 10.000).

## 8. P4 Talenta dan Pendampingan

### F-T1 Magang BNPB/BPBD
Lowongan (unit/BPBD, kab, kuota, keahlian, periode, pembimbing) → lamaran anggota
mahasiswa → seleksi (diterima/ditolak/cadangan) → penempatan (kode Meja bila operator
BPBD) → jam lewat `relawan_jam` → penilaian pembimbing (rubrik 1–5, 6 butir) →
sertifikat ber-QR + rekap SKS.

### F-T2 Alumni mentor
Anggota unsur alumni dengan instansi (BPBD, BNPB, TNI, RS, dll.) dan bendera "Bersedia jadi
mentor". Mahasiswa magang di kab yang sama dipasangkan (saran otomatis; ST/KK menyetujui).

### F-T3 Peta kampus, desa binaan, kab dampingan
Satu peta SVG: kampus (titik), desa binaan (titik), kab dampingan (poligon berwarna
status), kab rawan tanpa kampus pembina (arsir). Klik membuka lembar.

### F-T4 Desa binaan
Kode desa Kemendagri (`desa_cari.json`), kampus, angkatan KKN, tema, catatan per kunjungan
(diwariskan antarangkatan), status (aktif, pasif).

### F-T5 Kab/kota dampingan
Kab, kampus, jenis dampingan (KRB, RPB, IKD, renkon, Destana), mulai, tenggat, status
(berjalan, disusun, selesai, kedaluwarsa, batal), sumber dana (swakelola, APBD, hibah, lainnya).

### F-T6 BUMN/dunia usaha ↔ desa binaan + korps
Daftar BUMN/perusahaan: nama, bidang TJSL, kab wilayah operasi. Cocokkan dengan desa
binaan dan satgas di kab yang sama → kartu "Peluang TJSL".

### F-T7 Bank modul dan RPS
Berkas modul, RPS, kurikulum latih (PDF/DOCX ≤ 10 MB di R2), kategori, versi. Publik boleh
unduh; hanya ST mengunggah.

## 9. Lintas

### F-X1 Dasbor pimpinan
14 indikator slide 28 dihitung dari tabel (ALG §10), pembanding sasaran 2027/2029, peta
celah, daftar kampus pasif, unduh PPTX/PDF format BNPB (pola `dokumen.js`).

### F-X2 Pengingat
Tujuh detektor di `src/pengingat.js` menulis ke `km_pengingat` (DT ADR-06): `km_perjanjian`,
`km_tenggat_donor`, `km_masalah_basi`, `km_telaah_lambat`, `km_piket_kosong`,
`km_magang_nilai`, `km_kampus_menunggu`. Rincian ambang DT §6.4.

### F-X3 Dummy
`POST /api/kemitraan/dummy {aksi:"isi"|"hapus"}` SA. Isi minimal tiap tabel `km_*`;
kode/ID dummy bertanda; dummy tidak masuk angka dasbor.

## 10. Rencana kerja (ringkas, rinci di TIKET)

| Fase | Isi | Gerbang selesai |
| --- | --- | --- |
| A | Fondasi teknis: crosswalk kode, migrasi, rute dasar, cangkang layar | uji skema + uji layar cangkang hijau |
| B | P1 profil daerah + buku | 548 berkas daerah, buku tercetak 3 contoh kab |
| C | P1 masalah, pakar, pertanyaan, pendataan | uji relevansi berjalan; pendataan luring lolos |
| D | Fondasi pintu kampus | daftar → setuju → kode → halaman saya |
| E | P2 riset dan dana | siklus hibah ujung ke ujung lolos |
| F | P3 satgas | aktivasi → bersedia → penugasan → jam → sertifikat |
| G | P4 talenta | magang ujung ke ujung lolos |
| H | Dasbor, pengingat, dummy, penyelarasan | 14 KPI terhitung; RU penuh hijau |

## 11. Keterlacakan keputusan → fitur

| KP | Fitur |
| --- | --- |
| 1–5 | seluruh PRD, §1.5, §3 |
| 6 | F-M4 |
| 7–8 | F-M1, F-M2 |
| 9 | F-M3 |
| 10 | F-M5 |
| 11 | F-M6 |
| 12 | F-M7 |
| 13–15 | F-R1..F-R7 |
| 16–18 | F-S1..F-S5 |
| 19 | F-T1..F-T7 |
| 20–22 | F-D1..F-D4 |
| 23–24 | DS seluruhnya, §1.5 |
