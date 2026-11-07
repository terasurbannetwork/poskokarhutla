# PRD Ruang Unit BNPB

Dokumen arah untuk sistem web per kedeputian, direktorat, pusat, biro, dan inspektorat BNPB di Centurisk97. Versi 1, 5 November 2026. Disusun dari `KEPUTUSAN-AWAL.md` (otoritas di atas berkas ini) dan enam riset di `riset/1-6`. Tiap klaim tentang kode yang sudah ada dicek ke repo pada tanggal yang sama.

Konvensi berkas ini:

- Path relatif ke akar repo. `kedeputian/...` = `data/kajian-bnpb/kedeputian/...`.
- ID sistem, mesin bersama, dan fase sama persis dengan `KEPUTUSAN-AWAL.md` §4 dan §5. PRD ini tidak menambah sistem dan tidak memindah fase.
- Label angka (prinsip §3.3): **[resmi]** angka terbitan BNPB atau K/L, **[sekunder]** dari berita, **[hitungan]** hasil rumus kita dari data resmi, **[proksi]** pengganti data yang tidak tersedia, **[asumsi]** ambang atau bobot tanpa pasal.
- "Pemilik" = pemilik repo dan program (staf ahli BNPB). "Sesi induk" = sesi Claude yang memegang kontrak, commit, dan deploy. "Kita" = BNPB dan BPBD.
- Kode unit di URL ditulis huruf kecil: `perb`, `pspb`, `spb`, `pus`, `pd`, `ks`, `mt`, `kpod`, `wil`, `plp`, `ojl`, `rrx`, `rrp`, `rri`, `rrs`, `ren`, `keu`, `sdu`, `huk`, `irt`, `dik`, `jf` (22 halaman).
- Bukti, pasal, dan sumber data tiap usulan ada di `riset/`. PRD ini menunjuk bagiannya (kolom "Riset"), tidak menyalin ulang buktinya.
- Dokumen turunan (urutan otoritas `KEPUTUSAN-AWAL.md`): `DESIGN-SYSTEM.md`, `DESAIN-TEKNIS.md`, `RENCANA-UJI.md`, `TIKET.md`. Bila PRD dan dokumen turunan berbeda, pengerja berhenti dan bertanya (AGENTS.md §2.1).

Daftar isi

1. Ringkasan, tujuan, ukuran keberhasilan, non-tujuan, larangan
2. Keputusan terkunci dan pertanyaan terbuka
3. Pengguna, peran, RACI
4. Lini masa F0 sampai F3 dan gerbang
5. Mesin bersama MB-1 sampai MB-8
6. Spesifikasi fungsional per sistem
7. Layar dan alur
8. Privasi, keamanan, kuota D1, hak akses
9. Risiko dan mitigasi
10. Catatan untuk sesi induk

---

## 1. Ringkasan, tujuan, ukuran keberhasilan, non-tujuan, larangan

### 1.1 Ringkasan

Ruang Unit adalah satu pintu staf `/bnpb/unit` dan 22 halaman unit `/bnpb/unit/<kode>`. Tiap halaman memuat kartu laporan standar `.ex.ex-std` (AGENTS.md §3.5, `public/inti/kartu.css`) untuk sistem unit itu yang sudah jadi. Sistemnya 70 usulan dan 3 perbaikan F0 (`KEPUTUSAN-AWAL.md` §5), dibangun di atas 8 mesin bersama (§5 berkas ini).

Alasan bentuknya satu: per 5 Nov 2026 hampir semua tabel isian manusia di D1 produksi 0 baris, termasuk `meja_catatan` (`migrations/0026_meja.sql`) dan `orang` (`migrations/0095_lapangan_orang.sql`), dengan sekitar 20 pengunjung per hari. Form panjang tidak akan terisi. Karena itu tiap kartu dihitung pipeline dari data yang sudah ada di repo, data publik resmi, atau dokumen dan WA yang memang sudah mengalir. Manusia hanya mengetuk setuju atau mengoreksi.

Dua IKU BNPB 2025 yang meleset ada di Deputi Sistem dan Strategi: penurunan IRB 1,03% dari target 1,2%, dan daerah berkapasitas minimal sedang 50% dari target 67% [resmi, LAKIP 2025 hal. 18, `riset/1` §0]. Sistem resmi sebagian unit belum jadi: modul WMS INALOGPAL masih "Segera Hadir" (`riset/4` §3), aplikasi JF yang diamanatkan Perban 4/2025 Pasal 52 tidak ditemukan (`riset/6` §7.3), sistem informasi Destana nasional yang diwajibkan Perban 7/2025 Pasal 20 tidak ditemukan (`riset/2` §2.3).

### 1.2 Tujuan

1. Membetulkan tiga kesalahan yang sudah terbukti di repo sebelum layar baru dibuat (F0): status katalog JDIH, ambang meja tanpa pasal, dan syarat meja `rehab`.
2. Membangun delapan mesin bersama sekali, lalu dipakai ulang oleh semua unit.
3. Memberi tiap unit sedikitnya satu kartu yang terisi sendiri dan menjawab satu keputusan kerja nyata unit itu, dengan pasal dan sumber di kartunya.
4. Melengkapi sistem resmi (InaRISK, DIBI, INALOGPAL, Sistala-DSP, E-Pelaporan RR, SIRUP/SPSE, data.bnpb.go.id, JDIH), tidak menyaingi. Kita membaca, menghitung, dan menautkan balik.
5. Menyerahkan kode dan dokumentasi tiap modul ke Unit TIK Pusdatinkom (Perban 10/2025 Pasal 24 ayat (4), bawaan U1).

### 1.3 Ukuran keberhasilan

| Kode | Ukuran | Target | Cara ukur | Kapan |
| --- | --- | --- | --- | --- |
| K1 | Perbaikan F0 selesai | 0 dokumen yang dicabut menurut teks tampil BERLAKU tanpa pil konflik; 0 ambang meja tanpa acuan pasal atau label asumsi; meja `rehab` bisa diisi tanpa catatan kaji cepat | gerbang `tests/agen/gerbang-status-hukum.test.mjs`, `tests/agen/gerbang-jam-aturan.test.mjs`, uji SQL meja `tests/warga/unit_skema.test.mjs` (§4.1) | akhir F0 |
| K2 | Kartu F1 tayang | 15 dari 15 sistem F1 tayang di halaman unitnya | daftar sistem di `public/bnpb/unit/katalog.js` lawan katalog §5.1 KEPUTUSAN | akhir F1 |
| K3 | Baris terisi otomatis | ≥ 90% baris di tiap kartu F1 dan F2 berasal dari pipeline (`sumber` bukan `isian`) | hitung kolom `sumber` di JSON keluaran MB-6 | tiap rilis |
| K4 | Kesegaran | tiap JSON keluaran berumur ≤ 2 kali periode pembaruannya; yang lebih tua tampil berlabel "basi" | kolom `dibuat` di JSON, diperiksa self-check pipeline | harian |
| K5 | Unit pemakai | ≥ 6 dari 22 unit dibuka staf unit itu sedikitnya sekali seminggu selama 4 minggu berturut, dan pemilik mencatat satu keputusan unit yang memakai angka kartu | hitungan buka per jalur `/bnpb/unit/<kode>` (rute memanggil `catatHTML` di `src/worker.js`), catatan pemilik | 3 bulan sesudah F1 selesai |
| K6 | Tenggat tertangkap | 100% kunci di Jam Aturan (MB-2) punya acuan pasal BERLAKU dan kutipan yang ditemukan di teks, atau berlabel asumsi; 0 angka tenggat tertanam di luar berkas MB-2 | gerbang `tests/agen/gerbang-jam-aturan.test.mjs` | tiap rilis |
| K7 | Tenggat terlihat sebelum jatuh tempo | tiap tenggat yang jatuh dalam 30 hari muncul di kartu unit pemiliknya; untuk F2, jumlah tenggat RRX-1, KS-1, dan PLP-3 yang tampil sebelum jatuh tempo lawan yang lewat tanpa tampil | log kartu MB-2 | bulanan mulai F2 |
| K8 | Kuota D1 | tambahan Ruang Unit ≤ 50.000 baca per hari (1% kuota Free 5 juta) dan ≤ 1.000 tulis per hari | Cloudflare D1 insights sebelum dan sesudah rilis | tiap rilis |
| K9 | Tanpa kebocoran | 0 berkas keluaran Ruang Unit di `public/` selain berkas aturan MB-2 dan katalog hukum; 0 nama, NIP, nomor telepon, atau tanggal lahir di keluaran | gerbang `tests/agen/gerbang-privasi-unit.test.mjs` (pola grep) | tiap rilis |
| K10 | INP | tidak ada interaksi > 200 ms di halaman unit pada laptop uji | `inp-reviewer` | tiap rilis |

### 1.4 Non-tujuan

- Bukan aplikasi pengajuan atau persetujuan resmi. Pengajuan DSP tetap di Sistala-DSP, hibah RR di E-Proposal dan E-Pelaporan, hibah logpal di E-Prologpal, IKD di admin InaRISK.
- Bukan angka resmi. Indeks, skor, dan rapor kita tidak pernah ditulis sebagai IRB, IKD, KIB, atau capaian IKU resmi.
- Bukan sistem kepegawaian. SIMPEG, SIASN, e-Kinerja, SRIKANDI tetap pemilik datanya (`riset/6` §3.3).
- Bukan pengganti modul Dalops. Dit. KPOD sudah dilayani `public/bnpb/dalops.*`, `logbook.*`, `perencanaan.*`, `dokumen.*`; Ruang Unit hanya menambah evaluasi, aturan, dan sambungan datanya (`riset/3` §5).
- Bukan halaman publik. Semua layar di balik sesi staf (prinsip §3.5, U2).

### 1.5 Larangan

1. Tidak menambah sistem di luar katalog `KEPUTUSAN-AWAL.md` §5.1 dan tidak mengubah ID atau fase.
2. Tidak memanen data pribadi: nama, NIP terang, nomor telepon, tanggal lahir, alamat rumah. Layer Survey123 `perangkat_penilaian_awal_final` di gis.bnpb.go.id tidak dipanen (U6).
3. Tidak menyimpan keluaran berisi angka unit di `public/`. Aset statis tidak lewat Worker (`src/worker.js`, komentar gerbang centurisk97.id), jadi berkas di `public/data/` terbaca siapa pun yang tahu alamatnya.
4. Tidak menampilkan angka hitungan tanpa label dan sumber. Tidak menampilkan ambang tanpa pasal kecuali berlabel asumsi.
5. Tidak menyebut nama orang di sistem yang menyentuh DSP, pengadaan, atau temuan audit (WIL-4, SDU-1, IRT-1, IRT-2).
6. Tidak memakai model generatif untuk mengisi angka. Pengurai dokumen (MB-7) deterministik; baris yang tidak cocok pola masuk antrean periksa.
7. Nama platform di layar dan dokumen selalu Centurisk97, tidak memakai nama lama.
8. Tidak memisah teks dengan titik tengah; pakai koma, kalimat biasa, atau baris baru.

---

## 2. Keputusan terkunci dan pertanyaan terbuka

### 2.1 Keputusan terkunci

Dari `KEPUTUSAN-AWAL.md`. Kolom kanan menunjuk tempat eksekusinya di PRD ini.

| No | Keputusan | Bagian PRD |
| --- | --- | --- |
| D-1 | OTK acuan: Perban 6/2025 jo. Perban 11/2025; 22 kode unit sesuai §1 KEPUTUSAN | §3, §6 |
| D-2 | Modul Dalops di repo melayani Dit. KPOD (Pasal 121-124 kini Pusbin JF; laporan harian diterbitkan Dit. Koordalops sejak Maret 2026) | §3.2, §6.8 |
| D-3 | Deputi PD terdiri atas Dit. KPOD dan Dit. Wilayah I, II, III; pembagian provinsi Pasal 74, 77, 79A Perban 11/2025 dipakai sebagai data, tidak ditebak dari pulau | §6.9 |
| D-4 | Fungsi Jitupasna/R3P tersebar ke tiga direktorat RR; satu sistem lintas (RRX) | §6.12 |
| D-5 | Prinsip 1: terisi sendiri dulu; isian manusia hanya konfirmasi satu ketuk atau koreksi | semua |
| D-6 | Prinsip 2: melengkapi sistem resmi | §1.4 |
| D-7 | Prinsip 3: tiap angka membawa sumber, tanggal, label | §5 MB-6 |
| D-8 | Prinsip 4: tiap aturan membawa pasal BERLAKU; tanpa pasal = asumsi | §5 MB-2 |
| D-9 | Prinsip 5: staf saja dulu; pembukaan publik diputus pemilik per layar | §7, §8 |
| D-10 | Prinsip 6: tanpa data pribadi | §8.1 |
| D-11 | Prinsip 7: hasil hitungan berkala sebagai JSON di R2; D1 hanya untuk isian manusia dan jejak | §8.3 |
| D-12 | Prinsip 8: kode terbuka untuk Unit TIK | §1.2, §4 |
| D-13 | Delapan mesin bersama MB-1 sampai MB-8 dibangun sekali | §5 |
| D-14 | Fase: F0 perbaikan, F1 ukuran S datanya ada, F2 ukuran M atau menunggu MB-3/MB-7, F3 ukuran L atau menunggu izin, T ditunda | §4, §6 |
| D-15 | Pemilik pengerja: `public/bnpb/unit/**`, `scripts/bnpb/unit/**`, `scripts/bnpb/hukum.py` dipegang `ruang-bnpb`; `public/inti/jam_aturan.*` dipegang `inti-layar` (KA §8); `src/**` dan `migrations/**` dipegang `warga-api`; pemeriksa menurut AGENTS.md §6 | §3.3 |
| D-16 | Bentuk produk: pintu `/bnpb/unit`, halaman `/bnpb/unit/<kode>`, satu sistem = satu kartu atau sub-layar, layar lama dipakai lewat tautan | §7 |

### 2.2 Pertanyaan terbuka dengan pemilik

Tidak menghalangi mulai kerja; bawaan berlaku sampai dijawab. Jawaban ditulis di `KEPUTUSAN-UNIT.md`.

| Kode | Pertanyaan | Bawaan | Sistem yang terdampak bila berubah |
| --- | --- | --- | --- |
| U1 | Centurisk97 berstatus sistem pihak eksternal yang wajib menyerahkan kode ke Unit TIK (Perban 10/2025 Pasal 24 ayat (4))? | Ya; tiap modul disertai tautan repo dan dokumentasi teknis | semua, §4 gerbang |
| U2 | Semua layar Ruang Unit hanya staf, atau ada yang boleh publik? | Staf saja; publik diputus per layar | PD-2, PD-3, KS-3, RRP-1, §7 |
| U3 | Peran staf `pusdalops` diganti nama menjadi Dit. KPOD/Koordalops? | Nama peran tetap; label layar "Dit. Koordalops" | §3.2 |
| U4 | Boleh memanen API CKAN data.bnpb.go.id, layer ArcGIS gis.bnpb.go.id (agregat kab), API publik INALOGPAL, SIRUP sekali sehari dengan atribusi? | Ya, agregat saja, tampil di layar staf sampai ada izin tertulis unit pemilik data | MB-8, PUS-1, PLP-1, OJL-3, RRP-1, RRI-1, REN-2, SDU-1 |
| U5 | Boleh memanen JDIH pemda lewat JDIHN berkala (jeda 1 detik, cache 30 hari)? | Ya, dengan atribusi | MB-3, PSPB-1, KS-1 |
| U6 | Layer Survey123 penilaian awal yang membuka data pribadi dilaporkan ke Pusdatinkom? | Ya, pemilik menyampaikan; layer itu tidak dipanen | MB-8 |
| U7 | Daftar status katalog JDIH yang salah dilaporkan resmi ke Biro Hukum atau pengelola JDIH? | Kita koreksi tampilan dengan label "menurut teks"; pemilik meneruskan daftarnya | F0-1, HUK-1 |
| U8 | WIL-4 dibangun sekarang di tengah kasus KPK DSP 2026? | Ditunda ke F3; bila dibangun, internal tanpa nama orang | WIL-4 |
| U9 | Data TLHP, SAKTI, dan sinyal pengadaan boleh masuk D1 produksi di balik login? | Tidak; skrip lokal yang menghasilkan laporan untuk pemilik | IRT-1, KEU-2, IRT-2 |
| U10 | Data yang bisa dimintakan ke direktorat: daftar Destana (KS-2), penerima sirine (PD-2), penerima hibah logpal 3 tahun (PLP-2, PLP-3), ekspor E-Pelaporan dan Mapping Aset (RRI-3), nilai IKD 2025 per kab (PERB-1) | Tidak dianggap tersedia; sistem memakai proksi berlabel atau ditunda | PERB-1, PD-2, PLP-2, PLP-3, KS-2, RRI-3 |
| U11 | Gateway WA boleh mengirim pertanyaan satu ketuk ke kontak BPBD? | Belum; menunggu akun WA OTP (OUTSTANDING E1) dan gateway hidup lagi | PD-1, PLP-3, WIL-2, OJL-3 |
| U12 | Urutan mulai | F0, lalu F1 dimulai dari MB-1, MB-2, MB-6 dan HUK-1, KPOD-2, RRX-1, PLP-1, PERB-1, PUS-1 | §4 |

### 2.3 Butir teknis yang diputus sesi induk

Butir yang muncul saat menulis PRD dan tidak perlu pemilik, kecuali sesi induk menilai lain.

| Kode | Butir | Bawaan PRD |
| --- | --- | --- |
| BT-1 | Tempat keluaran pipeline | R2 `MEDIA` kunci `unit/<nama>.json`, dibaca lewat `GET /api/unit/data/:nama` sesudah `stafOK`; berkas kelas terbatas memakai `modAtauStaf` dengan daftar `DATA_UNIT_TERBATAS` (KA §8, pola `src/dalops.js` `dalops/<jenis>.json`); diunggah Actions dengan `wrangler r2 object put` (pola yang sudah ada di `.github/workflows/data.yml`) |
| BT-2 | Peran staf untuk menulis konfirmasi di F2 | Satu peran baru `unit` di `PERAN` `src/staf.js`, trigger `staf_larik_*` dibuat ulang lewat migrasi baru (pola `migrations/0104_staf_peran_lengkap.sql`). Pembatasan tulis per unit ditunda sampai lebih dari satu unit menulis; jejak `oleh` mencatat siapa |
| BT-3 | Satu halaman HTML untuk 22 unit | `public/bnpb/unit/unit.html` + `unit.js` membaca `<kode>` dari jalur; daftar sistem per unit di `public/bnpb/unit/katalog.js` |
| BT-4 | Bentuk berkas Jam Aturan | Data di `public/inti/jam_aturan.json` (dibaca Python dengan `json.load`, diimpor Worker, diambil peramban), fungsi hitung tenggat di `public/inti/jam_aturan.js`. Worker sudah mengimpor modul dari `public/` (contoh `src/ews.js` dari `public/ews_tindakan.js`) |
| BT-5 | Perubahan skema `meja_catatan` | `migrations/0110_meja_rehab_lepas.sql` membangun ulang `meja_catatan` hanya untuk F0-3. RPBD (PSPB-1), RPKB (KS-1), tahap R3P (RRX-1), dan kaji cepat dua tahap (WIL-3) lewat `unit_ketuk` atau hitungan, tanpa bangun ulang kedua (KA §8) |

---

## 3. Pengguna, peran, RACI

### 3.1 Pengguna per unit

Keputusan per unit diambil dari `riset/1-6`. Pembaca utama selalu pejabat dan fungsional unit itu; BPBD adalah penerima turunan lewat unit.

| Kode | Unit | Pengguna utama | Keputusan yang dibantu | Riset |
| --- | --- | --- | --- | --- |
| PERB | Dit. Pemetaan dan Evaluasi Risiko Bencana | Direktur, fungsional analis | daerah dampingan IKD, bahan rekomendasi kerugian ekonomi | 1 §1 |
| PSPB | Dit. Pengembangan Strategi PB | Direktur, fungsional | status RPBD per pemda, angka SDGs 11.b dan Sendai | 1 §2 |
| SPB | Dit. Sistem PB | Direktur, fungsional | NSPK yang lewat tenggat Renstra, tumpang tindih, fase kosong | 1 §3 |
| PUS | Pusdatinkom (walidata, Unit TIK) | Kepala Pusat, verifikator data | produsen data yang belum menyetor, KIB usulan | 1 §4 |
| PD | Dit. Peringatan Dini | Direktur, Deputi Pencegahan | isi laporan evaluasi 4-bulanan, lokasi paket instrumen | 2 §1 |
| KS | Dit. Kesiapsiagaan | Direktur | daerah yang dokumennya kedaluwarsa, jadwal gladi | 2 §2 |
| MT | Dit. Mitigasi Bencana | Direktur, tim telaah pencegahan | daerah prioritas mitigasi, pra-telaah Dana Bersama | 2 §3 |
| KPOD | Dit. Koordinasi Pengendalian Operasi Darurat | Direktur, staf Koordalops | rapor intervensi status darurat, tenggat juklak | 3 §5 |
| WIL | Dit. Penanganan Darurat Wilayah I, II, III | Direktur dan staf tiap wilayah | kabupaten yang diurus hari ini, pengungsi dan kebutuhan dasar | 3 §6 |
| PLP | Dit. Pengelolaan Logistik dan Peralatan | Direktur, perencana kebutuhan | stok penyangga, daftar pendek hibah, kewajiban pasca-hibah | 4 §4.A |
| OJL | Dit. Optimasi Jaringan Logistik dan Peralatan | Direktur, sekretariat Klaster Logistik | penempatan stok, rapor klaster | 4 §4.B |
| RRX | Deputi RR (lintas direktorat) | Deputi, tiga direktur | kab yang jam R3P-nya berjalan atau lewat | 5 §4 |
| RRP | Dit. RR Perumahan | Direktur | angka rumah rusak lapor lawan verifikasi, beban stimulan | 5 §5 |
| RRI | Dit. RR Infrastruktur | Direktur, tim penilai | akses putus yang belum pulih | 5 §6 |
| RRS | Dit. RR Sosial, Ekonomi, dan Lingkungan Hidup | Direktur | kerugian pertanian, fasilitas sosial rusak | 5 §7 |
| REN | Biro Perencanaan | Kepala Biro, Sestama | komponen RB yang dikejar, sebaran belanja, kalender monev | 6 §1 |
| KEU | Biro Keuangan | Kepala Biro | dokumen layak kirim (konsistensi angka) | 6 §2 |
| SDU | Biro SDM dan Umum termasuk Bagian PBJ | Kepala Bagian PBJ, Kepala Biro | paket yang dikonsolidasikan atau dipindah ke e-Purchasing | 6 §3 |
| HUK | Biro Hukum, Organisasi, dan Kerja Sama | pengelola JDIH | status yang dikoreksi, amanat yang belum terbit | 6 §4 |
| IRT | Inspektorat I, II, III | Inspektur | rekomendasi TLHP yang dikejar | 6 §5 |
| DIK | Pusdiklat PB | Kepala Pusat, perancang program | daerah sasaran diklat, calon pengajar | 6 §6 |
| JF | Pusat Pembinaan JF Kebencanaan | Kepala Pusat | kompetensi per jenjang, rekomendasi formasi | 6 §7 |

### 3.2 Peran repo yang dipakai

Ruang Unit tidak membuat sistem akun baru. Staf masuk dengan sesi staf yang sudah ada (`src/staf.js`, tabel `staf` di `migrations/0030_staf.sql`). Daftar peran sekarang (`PERAN` di `src/staf.js` baris 20, trigger di `migrations/0104_staf_peran_lengkap.sql`): `verifikator`, `pusdalops`, `analis_konsesi`, `udara`, `tmc`, `koordalops`, `pimpinan`, `kemitraan`, `operator_cc`, `direktori`. Kolom `staf.wilayah` menyimpan larik kode provinsi BPS (kosong = nasional); kolom `staf.unit` berupa teks bebas.

| Hak di Ruang Unit | Siapa | Peran repo | Catatan |
| --- | --- | --- | --- |
| Admin | pemilik, Super Admin | sesi admin (`adminOK`) | semua, termasuk mengunggah berkas internal (KEU, IRT) |
| Baca semua halaman unit | semua staf kerja | `SEMUA_PERAN` di `src/admin_halaman.js` baris 28 (tanpa `kemitraan` dan `direktori`) | entri baru `unit: SEMUA_PERAN` di `HALAMAN_STAF` |
| Baca dan konfirmasi Dit. KPOD | staf Koordalops | `pusdalops`, `koordalops`, `pimpinan` (`PERAN_DALOPS` di `src/dalops.js` baris 9) | label layar "Dit. Koordalops" (U3) |
| Baca dan konfirmasi Dit. Wilayah | staf Dit. Wilayah | `pusdalops`, `koordalops` dengan `staf.wilayah` terisi | pemilih wilayah bawaan = provinsi di `staf.wilayah` |
| Konfirmasi satu ketuk di unit lain (F2) | fungsional unit | peran baru `unit` (BT-2) | sampai peran ini ada, kartu di luar KPOD dan WIL hanya baca |
| Baca saja | pimpinan, operator command center | `pimpinan`, `operator_cc` | `operator_cc` tidak menulis (pola `src/admin_halaman.js` `ai`) |

### 3.3 RACI

R = mengerjakan, A = memutus, C = dikonsultasikan, I = diberi tahu. Satu A per baris.

| Kegiatan | Unit pemilik | Pemilik program | Sesi induk | Pengerja (`ruang-bnpb`, `warga-api`) | Pemeriksa | Pusdatinkom (Unit TIK, walidata) | Biro Hukum |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rumus, bobot, ambang tanpa pasal | C | A | R (rancang) | R (kode) | C (`validasi-model`) | I | I |
| Ambang dan tenggat berpasal (MB-2) | C | I | A | R | C (`penulis-gerbang`) | I | C |
| Izin panen sumber resmi (U4, U5) | C (pemilik data) | A | I | I | I | C | I |
| Konfirmasi angka di kartu | A, R | I | I | I | I | I | I |
| Pembukaan layar ke publik (U2) | C | A | C | R | C (`security-reviewer`) | C | I |
| Migrasi D1 | I | I | A | R (`warga-api`) | C (`migrasi-idempoten`) | I | I |
| Rute baru | I | I | A | R (`warga-api`) | C (`guard-api`, `security-reviewer`) | I | I |
| Kartu dan angka di layar | C | I | A | R (`ruang-bnpb`) | C (`selera-angka`, `inp-reviewer`) | I | I |
| Laporan status JDIH salah (U7) | I | A | R (daftar) | R | I | I | C |
| Serah kode dan dokumentasi (U1) | I | A | R | R | I | C (penerima) | I |
| Deploy | I | I | A, R | I | I | I | I |

---

## 4. Lini masa F0 sampai F3 dan gerbang

Tanggal kerja dihitung dari 5 Nov 2026. Fase berikut mulai hanya sesudah gerbang fase sebelumnya lulus, kecuali butir yang tidak bergantung padanya.

### 4.1 F0: perbaikan (minggu 45-46, 5-15 Nov 2026)

| ID | Kerja | Berkas | Pengerja | Gerbang lulus |
| --- | --- | --- | --- | --- |
| F0-1 | Status katalog JDIH: tambah pembaca klausul pencabutan berbutir khusus kalimat "Pada saat Peraturan ... mulai berlaku ... dicabut"; penyebabnya `_konteks()` di `scripts/bnpb/hukum.py` memotong kalimat di tanda `;` dan di sitasi berikutnya, sehingga dokumen kedua dan seterusnya dalam satu daftar tidak tercatat (KA F0-1); tulis kunci `konflik` di `public/data/bnpb/hukum/katalog.json`; pil "Dicabut oleh X (menurut teks), JDIH masih BERLAKU" di `public/bnpb/hukum.js` | `scripts/bnpb/hukum.py`, `public/bnpb/hukum.js` | `ruang-bnpb` | `python3 -I scripts/bnpb/hukum.py --cek` dan gerbang `tests/agen/gerbang-status-hukum.test.mjs` (RU §3.1): `perban-6-2021` tercatat dicabut `perban-4-2025`, `perka-4-2008` dicabut `perban-3-2026`, `perka-1-2012` dicabut `perban-7-2025`, `perka-7-2015` dicabut `perban-3-2025`, `perka-4-2016` dicabut `perban-2-2025`; jumlah konflik tidak dijadikan asersi (13 terbukti per 5 Nov 2026) |
| F0-2 | Ambang meja: buat berkas Jam Aturan (MB-2, BT-4) berisi sedikitnya empat kunci yang dibetulkan, lalu `src/meja_spek.js` membaca dari sana. `renkon_uji_hari: 365` diganti berlaku 3 tahun dan reviu 6 bulan (`renkon_berlaku`, `renkon_reviu`, Perban 2/2023 Pasal 21); `INDIKATOR_DESTANA` enam butir karangan dilepas dan diganti kolom tingkat plus `tgl_penilaian` dengan tanda kedaluwarsa > 3 tahun (Perban 7/2025 Pasal 13-14); `dsp_spj_hari: 30` diganti laporan tiap tanggal 5 bulan berikut dan SPJ 3 bulan sesudah status berakhir (Perban 4/2020 Pasal 21); `kaji_verifikasi_jam: 72` dipecah 24 jam dan 72 jam (Juklak 3/2022) | `public/inti/jam_aturan.json`, `public/inti/jam_aturan.js`, `src/meja_spek.js` | `warga-api` | gerbang `tests/agen/gerbang-jam-aturan.test.mjs` hijau; `tests/warga/meja*.test.mjs` hijau |
| F0-3 | Meja `rehab` dilepas dari syarat tertaut kaji cepat: CHECK `((meja = 'rehab') = (kaji_id IS NOT NULL))` dan trigger `meja_rehab_tautan` di `migrations/0026_meja.sql`, pemeriksaan di `src/meja.js` baris 114-119 | `migrations/0110_meja_rehab_lepas.sql` (hanya F0-3, KA §8), `src/meja.js` | `warga-api` → `migrasi-idempoten` | uji SQL dalam transaksi ROLLBACK (`~/.claude/TEST.md`): rehab tanpa `kaji_id` diterima, rehab dengan `kaji_id` ke kab lain ditolak, status di luar daftar ditolak; `0028_pengingat.sql` yang merujuk `meja_catatan` tetap jalan |

Gerbang F0: ketiga baris di atas hijau di `npm run uji` dan uji SQL, dan daftar konflik JDIH diserahkan ke pemilik (U7).

### 4.2 F1: mesin dasar dan 15 sistem ukuran S (16 Nov-20 Des 2026)

Urutan bawaan U12. Mesin dulu, lalu sistem yang memakainya.

| Minggu | Kerja |
| --- | --- |
| 47 | MB-1 (dari F0-1), MB-2 lengkap (dari F0-2), MB-6 format kartu; peran `unit` (BT-2, migrasi 0111); rute `GET /api/unit/data/:nama` dan halaman `/bnpb/unit`, `/bnpb/unit/<kode>` kosong berlabel "belum ada sistem" |
| 48 | HUK-1, KPOD-2, RRX-1 |
| 49 | MB-4 (skor prioritas, KA §8), PLP-1, PERB-1, PUS-1 (dengan MB-8 versi CKAN) |
| 50 | KPOD-3 (MB-7 versi Laphar), REN-1, REN-3, JF-1 |
| 51 | PD-3, KS-4, RRP-3, RRS-3, KEU-1 |

Gerbang F1: K2, K4, K6, K8, K9, K10 lulus untuk 15 sistem; tiap pipeline punya self-check (`--cek` atau `uji`) yang jalan di CI; tiap kartu diperiksa `selera-angka`; `npm run uji:agen` termasuk `gerbang-kartu-std.test.mjs` dengan `public/bnpb/unit/unit.html` masuk daftar `LAYAR`; dokumentasi teknis per modul tertaut di halaman unit (U1).

### 4.3 F2: 31 sistem ukuran M (Januari-Maret 2027)

Dikelompokkan menurut mesin yang harus jadi lebih dulu.

| Bulan | Mesin | Sistem |
| --- | --- | --- |
| Jan 2027 | MB-5 (neraca kebutuhan), MB-8 lengkap (ArcGIS, INALOGPAL, SIRUP) | PERB-2, MT-2, PLP-2, OJL-2, OJL-3, RRP-1, RRS-1, DIK-1, REN-2, SDU-1, PSPB-3 |
| Feb 2027 | MB-3 (pemanen JDIH daerah), MB-1 tahap amanat | PSPB-1, KS-1, SPB-1, HUK-2, KPOD-1, WIL-1, WIL-3, RRI-1, PUS-2 |
| Mar 2027 | MB-7 umum (WA, rilis) | PD-1, PD-2, KS-3, MT-1, MT-3, WIL-2, PLP-3, RRP-2, IRT-1, DIK-4, JF-2 |

Gerbang F2: K3, K5, K7 terukur untuk minimal satu bulan; uji integrasi D1 untuk tiap tabel baru (`tests/warga/*.test.mjs` dan uji SQL ROLLBACK); tiap tabel isian baru punya keterangan di kartunya bila 0 baris ("belum ada isian; angka dari sumber X"), bukan kartu kosong. Sistem F2 yang bergantung pada U10 atau U11 boleh tayang dengan bagian tergantungnya berlabel "menunggu", tidak menahan gerbang.

### 4.4 F3: menunggu syarat (mulai April 2027, per sistem)

Tidak berjadwal. Tiap sistem F3 mulai saat syaratnya di §6.23 terpenuhi dan pemilik setuju. Gerbangnya sama dengan F2 ditambah persetujuan tertulis pemilik data bila sistem membaca data internal.

### 4.5 T: ditunda

Empat sistem (§6.24) tidak dibangun. Ditinjau ulang hanya bila alasan penundaannya hilang.

---

## 5. Mesin bersama MB-1 sampai MB-8

Semua mesin menulis JSON dengan kepala yang sama:

```
{"dibuat": "<ISO UTC>", "sumber": [{"nama", "url", "diambil"}], "label": "resmi|sekunder|hitungan_kita|proksi", "basi_jam": <48|240|1080>, ...}
```

`label` salah satu dari `resmi`, `sekunder`, `hitungan`, `proksi`, `asumsi`. Pipeline Python 3.12 stdlib (aturan repo), self-check `--cek` dengan assert pada contoh yang dihitung tangan, gagal keras bila sumber berubah bentuk, dan memakai berkas terakhir dengan tanggal yang terlihat.

### MB-1. Status peraturan

| Bagian | Isi |
| --- | --- |
| Perilaku | Membaca ulang klausul pencabutan dan perubahan di seluruh korpus JDIH lokal, menandai dokumen yang dicabut menurut teks tetapi BERLAKU menurut JDIH, dan mencatat amanat pengaturan turunan yang belum terbit |
| Masukan | `public/data/bnpb/hukum/katalog.json` (233 dokumen, `dok` dan `relasi`), `data/raw/hukum/teks/*.json`; tiap panen `hukum.py` |
| Keluaran | kunci `konflik` di katalog (dokumen sasaran, dokumen pencabut, pasal, kutipan); `unit/huk/amanat.json` di R2 (tahap F2, HUK-2) |
| Aturan | (a) relasi `mencabut` atau `mengganti` dari dokumen BERLAKU ke dokumen BERLAKU = konflik. (b) Klausul berbutir ("a. Peraturan ... b. Peraturan ...") sesudah "Pada saat Peraturan ... mulai berlaku" dibaca sampai kata "dicabut dan dinyatakan tidak berlaku". (c) Dokumen yang diubah tetap BERLAKU, ditautkan ke pengubahnya. (d) Amanat = kalimat delegasi (`ditetapkan oleh Kepala`, `diatur dengan Peraturan Badan`, `diatur lebih lanjut`); terpenuhi bila dokumen yang lebih baru merujuk pasal itu atau judulnya cocok topik (BM25 judul). (e) Status JDIH resmi tidak ditimpa; tampilan memakai dua status berdampingan |
| Dipakai | F0-1, HUK-1, HUK-2, SPB-1 |
| Pemilik | `ruang-bnpb` |

### MB-2. Jam Aturan

| Bagian | Isi |
| --- | --- |
| Perilaku | Satu berkas tenggat dan ambang bersitasi pasal, dibaca semua meja, kartu, dan pengingat. Fungsi hitung mengubah peristiwa (tanggal cair, tiba, status berakhir) menjadi tanggal jatuh tempo |
| Masukan | Pasal dari korpus JDIH, ditulis tangan sekali per kunci: `{kunci, nilai, satuan, acuan, kutipan, unit}` |
| Keluaran | `public/inti/jam_aturan.json` dan `public/inti/jam_aturan.js` (BT-4). Satu-satunya keluaran Ruang Unit yang boleh di `public/`, karena isinya teks peraturan publik |
| Aturan | Isi awal (nama kunci dan nilai menurut ALGORITMA §3.1): kaji cepat dilakukan 24 jam sesudah informasi diterima, laporan awal 24 jam dan lanjutan 72 jam sesudah tiba, TRC bergerak 24 jam sesudah perintah (Juklak 3/2022); laporan kejadian untuk DSP 3 hari, laporan perkembangan DSP tiap tanggal 5 bulan berikutnya, SPJ DSP 3 bulan sesudah status berakhir (Perban 4/2020 Pasal 4, 21); R3P paling lama 90 hari dan dimulai saat tanggap darurat (Perban 5/2017 Pasal 2); renkon berlaku 3 tahun, reviu paling sedikit 6 bulan (Perban 2/2023 Pasal 21); Destana dinilai mandiri paling sedikit 3 tahun sekali (Perban 7/2025 Pasal 14 ayat (5)); evaluasi sistem peringatan dini paling sedikit 1 kali per 4 bulan (Perban 2/2024 Pasal 29 ayat (1)); laporan pelatihan 7 hari kerja (Perban 2/2025 Pasal 14); tindak lanjut rekomendasi 60 hari (Pedoman 1/2025); pemutakhiran data klaster logistik tiap 3 bulan (Juklak 16/2025); laporan berkala hibah RR tiap 3 bulan, paling lambat 15 hari sesudah tahap (Juklak 9/2024); pengungsi dimutakhirkan tiap hari (Juknis 9/2023); masa status kab/kota 14 hari, provinsi 1 bulan, nasional 3 bulan (batas atas Pedoman Penetapan Status 2016, non-JDIH, `asumsi: true`). Laporan penggunaan barang hibah logpal 12 bulan sesudah BAST berlabel asumsi (Juklak 3/2024 tidak menyebut angka, `riset/4` Q4) |
| Gerbang | `tests/agen/gerbang-jam-aturan.test.mjs`: tiap kunci punya `acuan` yang ada di katalog JDIH berstatus BERLAKU dan tidak berkonflik menurut MB-1, dan `kutipan` ditemukan di teks dokumennya; kunci tanpa acuan wajib `asumsi: true` dengan `catatan`; grep menolak angka tenggat di `src/meja_spek.js`, `public/inti/status_pedoman.js`, dan `scripts/bnpb/**` yang tidak diambil dari berkas ini |
| Dipakai | F0-2, KPOD-2, RRX-1, REN-3, KS-1, KS-4, PLP-3, PD-1, WIL-1, WIL-2, WIL-3, IRT-1 |
| Pemilik | `public/inti/jam_aturan.*`: `inti-layar` (KA §8); impor di `src/meja_spek.js`: `warga-api`; gerbang: `penulis-gerbang` |

### MB-3. Pemanen JDIH daerah

| Bagian | Isi |
| --- | --- |
| Perilaku | Mencari dokumen pemda di JDIHN dan JDIH pemda, mengenali jenisnya (RPBD, renkon, RPKB, rencana aksi), dan mencatat status per pemda |
| Masukan | https://jdihn.go.id (halaman depan HTTP 200; titik API belum diuji isinya, `riset/1` §6), situs JDIH pemda; kamus wilayah `public/data/bnpb/wilayah.json`; mingguan untuk semua jenis dokumen daerah (KA §8) |
| Keluaran | `unit/jdih_daerah.json`, `unit/rpbd.json`, `unit/dokumen_siaga.json` di R2; cache mentah di `data/raw/jdih_daerah/` (di luar `public/`, tidak di-commit bila besar) |
| Aturan | Jeda 1 detik per permintaan, cache 30 hari, User-Agent menyebut Centurisk97 (U5). Pola judul per jenis: "Rencana Penanggulangan Bencana", "rencana kontinjensi", "rencana kontingensi", "rencana penanggulangan kedaruratan". Periode dari regex "Tahun AAAA-AAAA"; tanpa periode = tanggal penetapan + masa berlaku jenis itu dari MB-2, bertanda "diduga". `tidak_ditemukan` tidak pernah dibaca sebagai "tidak punya" |
| Dipakai | PSPB-1, KS-1 (dan PERB-3 di F3) |
| Pemilik | `ruang-bnpb`; bila situs menolak fetch biasa, `scraper-antibot` |

### MB-4. Skor prioritas daerah

| Bagian | Isi |
| --- | --- |
| Perilaku | Satu fungsi skor per kab/kota: risiko x celah kapasitas x celah layanan, dengan bobot yang tampil di kartu. Dipakai untuk memilih daerah dampingan, sasaran diklat, penerima hibah, prioritas mitigasi, dan penempatan stok |
| Masukan | komponen bawaan ALGORITMA §5.4: risiko = jiwa terpapar kelas tinggi `public/data/bnpb/terpapar.json` [proksi], celah kapasitas = `1 - c` dari `ikd.json` (raster kapasitas InaRISK, [proksi] untuk IKD), kejadian 5 tahun dari `dibi_kab_tahun.json`; celah layanan diberikan tiap sistem pemakai. `risiko_hvc.json` `R_total` tidak dipakai kecuali uji baliknya membuktikan lebih baik |
| Keluaran | fungsi murni `persentil()` dan `skor(komponen, bobot)` di `scripts/bnpb/unit/skor.py` (DT §4.4); tiap sistem menulis JSON-nya sendiri |
| Aturan | Rata-rata geometrik berbobot (ALGORITMA §5.2): q = maks(p, 0,01) untuk komponen persentil, q = v untuk komponen mutlak; S = Π q^(w/W) atas komponen yang punya nilai untuk kab itu. Bila jumlah bobot komponen yang ada kurang dari separuh, S = `null` dan kab ditandai "data kurang", tidak diberi nol. Bobot bawaan sama rata, disimpan di satu tempat per sistem dan tampil di kartu. Label kartu "usulan analis, bukan IRB atau IKD resmi"; kata "prioritas" hanya bila lulus uji balik ALGORITMA §5.7 |
| Gerbang | self-check `skor.py --cek` atas kasus acuan A1-A10 (ALGORITMA §5.6) |
| Dipakai | MT-2, DIK-1, PLP-2, PD-2, OJL-2; PERB-1 hanya konvensi urutan dan label (ALGORITMA §5.5) (OJL-1 di F3) |
| Pemilik | `ruang-bnpb`; pemeriksa `validasi-model` |

### MB-5. Neraca kebutuhan

| Bagian | Isi |
| --- | --- |
| Perilaku | Kebutuhan dihitung dari standar lawan ketersediaan atau realisasi per kab/kota; selisih tampil, sistem tidak memilih angka yang benar |
| Masukan | standar dari MB-2 dan tabel standar: Perka 7/2008 (beras 400 g/orang/hari, air bersih 7 l tiga hari pertama lalu 15 l, air minum 2,5 l, hunian 3 m2, 1 jamban per 20 orang, sabun 250 g/bulan), Perka 23/2014 (persediaan minimal 72 jam, rumus JP x PR x H, PR 1% atau 4%), Juknis 9/2023 (kelompok umur pengungsi), Juklak 3/2022 (kantong sampah 1 per 3 KK per 3 hari) |
| Keluaran | fungsi murni di `public/inti/kebutuhan_dasar.js` (dipakai peramban dan uji node) dan padanan Python `scripts/bnpb/unit/neraca.py` dengan uji silang angka yang sama |
| Aturan | `kebutuhan = Σ jumlah x standar`; `selisih = max(0, kebutuhan - tersedia)`; status `cukup`, `kurang`, `belum dilaporkan` (tersedia kosong tidak sama dengan nol). Selisih dua sumber angka: `|a - b| / max(a, b)`, di atas 25% merah, kedua angka tampil dengan sumber dan tanggalnya |
| Dipakai | PLP-1, WIL-2, RRP-1, RRS-1 (OJL-1 di F3) |
| Pemilik | `ruang-bnpb` (Python), `warga-api` bila dipakai rute |

### MB-6. Rapor dari data

| Bagian | Isi |
| --- | --- |
| Perilaku | Kartu `.ex.ex-std` yang indikatornya dihitung dari data dengan jejak rumus, bukan diisi tangan |
| Masukan | JSON keluaran sistem dengan kunci `indikator: [{kode, judul, nilai, satuan, rumus, pembilang, penyebut, sumber, label, pembanding}]` |
| Keluaran | renderer kartu di `public/bnpb/unit/unit.js`: pil kategori `.ex-ey`, judul berupa kalimat temuan dengan angka disorot `.hl`, tabel `.ex-tabel`; definisi kolom dan rumus di `title` kepala tabel (AGENTS.md §3.5) |
| Aturan | Tiap angka membawa label dan tanggal. Angka resmi pembanding (LAKIP, Renstra) tampil di samping angka hitungan, tidak diganti. Penyebut nol atau data kurang = "belum ada data", bukan 0%. Tanpa kaki keterangan di bawah kartu |
| Gerbang | `tests/agen/gerbang-kartu-std.test.mjs` dengan `public/bnpb/unit/unit.html` di `LAYAR` |
| Dipakai | KPOD-1, PD-1, PUS-1, REN-1, KEU-1 (laporan lokal), SDU-1, IRT-1, OJL-3, PSPB-3 |
| Pemilik | `ruang-bnpb`; pemeriksa `selera-angka` |

### MB-7. Penerima dokumen

| Bagian | Isi |
| --- | --- |
| Perilaku | Dokumen dari WA, PDF, atau rilis resmi diurai menjadi baris berlabel, lalu staf mengetuk setuju |
| Masukan | WA masuk (`wa_masuk`, `src/wa.js`, `src/wa_jenis.js`; jenis `laphar_pdf` dan `rekap_koordalops_24` sudah wajib tiba tiap hari), PDF di R2 `wa/...`, berita lewat `scripts/umum/berita.py` dan leksikon `scripts/berita/*.py` |
| Keluaran | baris usulan `{sumber_url, tanggal, kab, medan, nilai, label}`; diterima staf masuk tabel tujuan (`pemulihan`, `akses_status`, `pengungsian_harian`) atau JSON |
| Aturan | Pengurai deterministik (pola `public/laporan_urai.js`), tanpa model. Baris yang tidak cocok pola masuk antrean periksa. Angka dari berita berlabel `sekunder` dan tidak pernah masuk tanpa ketukan staf. Teks bebas yang memuat nama orang tidak disimpan; yang disimpan kelas dan angka |
| Dipakai | KPOD-3 (versi Laphar, F1), RRP-2, WIL-2, RRI-1 |
| Pemilik | `wa-bot` (`scripts/wa/**`), `warga-api` (`src/wa.js`), `ruang-bnpb` (leksikon) |

### MB-8. Panen sumber resmi terbuka

| Bagian | Isi |
| --- | --- |
| Perilaku | Satu pustaka ambil-data dengan atribusi, cache, jeda, dan pencatatan umur, untuk sumber resmi yang terbuka |
| Masukan | API CKAN data.bnpb.go.id `/api/3/action/` (`organization_list`, `package_search`, `package_show`; terbuka per 5 Nov 2026); layanan ArcGIS `gis.bnpb.go.id/server/rest/services` (agregat kab saja); API publik INALOGPAL (`Api/get_progress`, `get_count_cluster_all`, `get_count_cluster_sk_all`, `gudang_sumbar`, `get_kabupaten`); SIRUP lewat `docs/pendanaan/sirup_tarik.py` yang sudah ada |
| Keluaran | `scripts/bnpb/unit/panen.py` (fungsi `ambil(url, ttl, jeda)`), mentah di `data/raw/<sumber>/`, ringkasan per sistem ke R2 |
| Aturan | Sekali sehari per sumber (U4), User-Agent menyebut Centurisk97 dan kontak, jeda 1 detik, gagal = pakai berkas terakhir dan tulis umurnya. Hanya kolom agregat yang disimpan; layer yang memuat nama, kontak, atau tanggal lahir ditolak oleh daftar tolak kolom (U6). HTTP 403 karena penolak bot dicatat "diblokir", bukan "mati" |
| Dipakai | PUS-1, RRP-1, RRI-1, OJL-3, SDU-1, REN-2, PLP-1 (stok) |
| Pemilik | `ruang-bnpb` |

---

## 6. Spesifikasi fungsional per sistem

Format sistem F1 dan F2: **Masalah dan bukti**, **Pengguna dan keputusan**, **Masukan dan frekuensi**, **Aturan**, **Layar**, **Terima** (kriteria singkat; rincinya di `RENCANA-UJI.md`), **Bergantung**. Semua keluaran ke R2 `unit/<nama>.json` (BT-1) kecuali disebut lain. Semua kartu di halaman `/bnpb/unit/<kode>` kecuali disebut lain. F3 di §6.23, T di §6.24.

### 6.1 PERB: Dit. Pemetaan dan Evaluasi Risiko Bencana

**PERB-1. Pemilih daerah pendampingan IKD (F1, MB-4)** `riset/1` §1.5
- Masalah dan bukti: IKU 2 meleset 17 poin (50% lawan 67%); target pendampingan 25 daerah 2026 sampai 40 daerah 2029; realisasi dukungan teknis 2025 8 dari 14 pemda [resmi, LAKIP, Renstra Lampiran I].
- Pengguna dan keputusan: Direktur PERB; 25 daerah mana yang didampingi tahun 2026 agar IRB nasional dan persen daerah kelas sedang naik paling banyak.
- Masukan: `ikd.json` [proksi], `kerentanan.json`, `risiko_hvc.json`, `terpapar.json`, IKD provinsi resmi di `iku.json`. Statis tahunan, dihitung ulang bulanan.
- Aturan: R_k(C) = (H_k x V_k x (1 - C))^(1/3) (rumus RBI). Manfaat_k = n_k x [R_k(C_k) - R_k(C_k + d_k)], d_k jarak ke ambang kelas berikutnya (0,40 atau 0,80), n_k = 1/514 [asumsi, `riset/1` pertanyaan 3]. Bonus IKU 2 bila naik melewati 0,40 di provinsi yang IKD-nya di bawah 0,40. Urut manfaat dibagi biaya; biaya = jarak dari Jakarta [proksi].
- Layar: kartu "N kab paling menggeser IRB per rupiah" dengan tabel urutan, C sekarang, C sasaran, manfaat; tautan ke `/kinerja-bnpb`.
- Terima: self-check satu kab dihitung tangan; label "bukan IRB resmi" dan "kapasitas raster, bukan IKD" tampil.
- Bergantung: MB-4. Nilai IKD resmi per kab (U10) mengganti proksi bila diberikan.

**PERB-2. Perkiraan berjalan kerugian ekonomi langsung (F2, MB-5)** `riset/1` §1.5
- Masalah dan bukti: indikator tujuan Renstra 0,1370% PDB, realisasi 2025 0,217% (Rp51,3 triliun), angka keluar setahun sekali; RO rekomendasi Proporsi Kerugian Ekonomi Langsung mulai 2026 [resmi].
- Pengguna dan keputusan: Dit. PERB, Biro Perencanaan; daerah dan jenis bencana penyumbang kerugian terbesar tahun berjalan.
- Masukan: `dibi_kab_tahun.json`, `public/data/dibi_kejadian.json` (harian, memuat RB, RS, RR), PDRB dan PDB dari BPS WebAPI (`scripts/bnpb/bps.py`). Bulanan.
- Aturan: kerugian_k,t = Σ (RB x c_rb + RS x c_rs + RR x c_rr); c = tarif stimulan rumah Rp60, 30, 15 juta [sekunder, Kemenko PMK] sampai Dit. PERB menetapkan lain. Proporsi = Σ kerugian / PDB. Uji balik lawan Rp51,3 triliun 2025; meleset > 30% = kartu "belum layak", angka tidak tampil. Label "batas bawah: hanya rumah".
- Layar: kartu per provinsi dan jenis bencana, pembanding angka resmi tahun lalu.
- Terima: uji balik 2025 tercatat di JSON; tanpa lolos uji balik tidak ada rupiah di layar.
- Bergantung: MB-5, biaya satuan (pertanyaan `riset/1` §1.6 no. 2).

### 6.2 PSPB: Dit. Pengembangan Strategi PB

**PSPB-1. Register status RPBD 552 pemda (F2, MB-3)** `riset/1` §2.4
- Masalah dan bukti: Perban 3/2026 menjadikan RPBD masukan wajib IRB, IKD, SPM dan mewajibkan monev tahunan (Pasal 12, 47-48); dataset SDGs 11.b.2 di data.bnpb.go.id berupa format isian, bukan daftar status [resmi].
- Pengguna dan keputusan: Dit. PSPB; daerah mana didampingi, berapa persen pemda menerapkan strategi.
- Masukan: MB-3 (JDIHN, JDIH pemda), mingguan. Koreksi staf lewat `unit_ketuk` (MB-7).
- Aturan: status `berlaku` bila periode mencakup tahun ini; `habis`; `tidak_ditemukan`; `sesuai_3_2026` bila ditetapkan sesudah 6 Okt 2026. Persen = berlaku / 552, dipisah provinsi dan kab/kota.
- Layar: kartu "N dari 552 pemda punya RPBD berlaku menurut JDIH" dengan tabel per provinsi; tautan dokumen sumber.
- Terima: ≥ 80% pemda punya status (bukan kosong) dalam 3 bulan; label "tidak ditemukan bukan berarti tidak punya" tampil.
- Bergantung: MB-3, U5, MB-7.

**PSPB-3. Rapor indikator Sendai dan SDGs 11.b (F2, MB-6)** `riset/1` §2.4
- Masalah dan bukti: Indonesia melapor 7 target Sendai (Renas PB hal. 10-11); indikator A, B, C, E bisa dihitung ulang dari data yang ada.
- Pengguna dan keputusan: Dit. PSPB; angka mana yang dikirim dan berapa selisihnya dengan yang dilaporkan.
- Masukan: `dibi_kab_tahun.json`, penduduk Dukcapil (`terpapar.json`), PERB-2, PSPB-1. Tahunan, diperbarui bulanan.
- Aturan: A-1 = (meninggal + hilang) per 100.000 penduduk, rata-rata bergulir 10 tahun; B-1 = terdampak per 100.000; C-1 dari PERB-2; E-1 dan E-2 dari PSPB-1. Beda definisi "terdampak" DIBI lawan UNDRR tertulis di `title` kepala tabel.
- Layar: satu kartu rapor tujuh baris target, kolom "belum dihitung" untuk D, F, G.
- Terima: A-1 dan B-1 per tahun cocok dengan hitungan tangan dari `dibi_kab_tahun.json`.
- Bergantung: MB-6; C-1 menunggu PERB-2, E menunggu PSPB-1.

### 6.3 SPB: Dit. Sistem PB

**SPB-1. Peta NSPK per fase dan jenis bencana (F2, MB-1)** `riset/1` §3.4
- Masalah dan bukti: sekitar 75 regulasi bertarget di Renstra Lampiran III tanpa pelacak; "regulasi saling bertentangan" tercatat sebagai kelemahan resmi; contoh `perka-4-2008` dicabut Perban 3/2026 Pasal 50 tetapi katalog masih BERLAKU [fakta repo].
- Pengguna dan keputusan: Dit. SPB, Biro Hukum; NSPK mana lewat tenggat, mana tumpang tindih, fase mana kosong.
- Masukan: katalog JDIH dan MB-1; daftar Renstra Lampiran III diketik sekali dari PDF (tabelnya rusak di pdftotext) ke `data/kajian-bnpb/kedeputian/data/renstra_nspk.json`.
- Aturan: matriks fase (pra, darurat, pasca) x jenis bencana x jenis NSPK, isi = jumlah dokumen berlaku (status menurut teks). Target Renstra: terbit, belum, lewat tahun target.
- Layar: kartu matriks dan daftar target lewat tenggat di `/bnpb/unit/spb`; tab "Peta NSPK" di `/bnpb/hukum` hanya tautan.
- Terima: tiap target Renstra punya status; jumlah dokumen per sel cocok dengan saringan katalog.
- Bergantung: MB-1, kutipan manual Lampiran III.

### 6.4 PUS: Pusdatinkom

**PUS-1. Rapor walidata Satu Data Bencana (F1, MB-6, MB-8)** `riset/1` §4.4
- Masalah dan bukti: EPSS 2,59 di bawah target 2,6; organisasi `perb` punya 0 dataset di data.bnpb.go.id, `pspb` 1, `spb` 2, `pusdatinkom` 125 dari 515 dataset (diperiksa 5 Nov 2026); walidata wajib memastikan ketersediaan dan kemutakhiran data dan metadata (Perban 1/2023 Pasal 8 huruf b).
- Pengguna dan keputusan: Kepala Pusdatinkom, Forum Satu Data Bencana; produsen mana belum menyetor, dataset mana basi, metadata mana kosong.
- Masukan: API CKAN lewat MB-8, harian; daftar 37 data prioritas LAKIP Lampiran 9 diketik sekali.
- Aturan: per produsen: jumlah dataset, umur pembaruan median, persen dataset dengan `notes`, `license_id`, `maintainer`, `frequency` terisi, persen data prioritas terbit. Basi = umur > 2 x periode pembaruan yang dinyatakan.
- Layar: kartu "N produsen tanpa dataset" dengan tabel per organisasi; tautan ke `/pendataan`.
- Terima: jumlah dataset per organisasi sama dengan `organization_list` hari itu; layar hanya bersesi staf (pertanyaan `riset/1` §4.5 no. 1).
- Bergantung: MB-8, U4.

**PUS-2. KIB usulan dan pencocok logbook ke DIBI (F2)** `riset/1` §4.4
- Masalah dan bukti: walidata wajib menyiapkan nomor induk tiap kejadian (Perban 1/2023 Pasal 8 huruf c angka 3); KIB 16 digit diatur Juknis 7/2023; `logbook_kejadian` (`migrations/0088_logbook.sql`) menyimpan kab sebagai nama, bukan kode.
- Pengguna dan keputusan: verifikator Pusdatinkom; kejadian logbook mana memenuhi ambang tetapi belum masuk DIBI setelah 7 hari, dan sebaliknya.
- Masukan: `logbook_kejadian`, `logbook_entri` (D1), `public/data/logbook_riwayat.json`, DIBI lewat `scripts/banjir/kejadian.py`, `public/data/bnpb/wilayah.json`. Harian.
- Aturan: KIB_usulan = prov(2) + kab(2) + kode bencana(3) + tanggal mulai(8) + indeks(1); pemetaan jenis: banjir 101, longsor 102, cuaca 104, kekeringan 105, karhutla 106, gempabumi 107, gunungapi 109, kebakaran permukiman 202, konflik sosial 301; jenis tanpa kode tidak diberi KIB. Ambang kejadian Juknis 7/2023 (1 meninggal, 50 orang terdampak/luka/mengungsi, 5 rumah atau fasilitas rusak, 1 ha, permintaan bantuan nasional, atau penetapan status). Cocok DIBI bila 15 digit pertama sama, toleransi tanggal ± 2 hari. Tiga daftar: cocok, logbook tanpa DIBI, DIBI tanpa logbook.
- Layar: kartu tiga daftar dengan median jeda logbook ke DIBI; tab di `/bnpb/logbook` hanya tautan; ekspor CSV kolom Juknis.
- Terima: uji tetap contoh Bogor 19 Sep 2023 = `3201101202309191`; label "KIB usulan, bukan KIB resmi".
- Bergantung: fungsi murni `kib()` di `src/pusdalops_umum.js`, kolom `kib TEXT` di `logbook_kejadian` lewat migrasi baru, pencocok nama kab (`norm()` dan alias yang sudah ada).

### 6.5 PD: Dit. Peringatan Dini

**PD-3. Penyusun pesan peringatan berstandar Pasal 20 (F1)** `riset/2` §1.4
- Masalah dan bukti: pesan peringatan wajib memuat enam unsur (Perban 2/2024 Pasal 20 ayat (2): jenis termasuk turunannya, tingkatan, daya rusak, potensi jiwa terpapar, prakiraan waktu, sumber daya); pesan BMKG mentah tidak memuat jiwa terpapar dan sumber daya.
- Pengguna dan keputusan: staf PD dan BPBD yang meneruskan; isi pesan yang dikirim ke grup kedinasan.
- Masukan: D1 `peringatan` (`migrations/0010_peringatan.sql`, tingkat Waspada/Siaga/Awas), `public/prediksi/` keluaran harian, `terpapar.json`, `siaga.json`, `public/ews_tindakan.js`. Saat dibuka.
- Aturan: templat enam baris, satu per unsur; tingkat dan warna dari Pasal 20 ayat (4); daya rusak dari kelas bahaya InaRISK desa terdampak; unsur kosong ditulis "belum ada data".
- Layar: kartu peringatan aktif dengan tombol "salin pesan WA" dan "unduh kartu PNG" di `/bnpb/unit/pd`. Tombol di `/peringatan` dan `/prediksi` (halaman publik) menunggu U2.
- Terima: uji node `pesanStandar(peringatan, konteks)`: 100% pesan memuat enam unsur atau "belum ada data".
- Bergantung: tidak ada. Kirim otomatis ke BPBD menunggu U11; kirim ke warga tidak pernah tanpa keputusan Kepala Daerah (Perban 4/2022 Pasal 7).

**PD-1. Rapor peringatan dini dan umpan balik BPBD (F2, MB-2, MB-6)** `riset/2` §1.4
- Masalah dan bukti: Perban 2/2024 Pasal 23 dan 28-29 mewajibkan umpan balik BPBD dan evaluasi minimal tiap 4 bulan; tidak ada angka berapa peringatan terbukti.
- Pengguna dan keputusan: Direktur PD, Deputi Pencegahan; isi laporan ke Kepala, ambang mana terlalu sering palsu.
- Masukan: D1 `peringatan` (ekspor harian oleh pipeline, bukan kueri layar), arsip `/prediksi`, `public/data/logbook_riwayat.json`, `dibi_kejadian.json`. Harian, rekap 4-bulanan.
- Aturan: peringatan p di kab k; hit bila ada kejadian e di k dalam [mulai p, berlaku_hingga p + 24 jam]; palsu bila tidak ada e; terlewat bila e tanpa p dalam 72 jam sebelumnya. POD = hit / (hit + terlewat), FAR = palsu / (hit + palsu), per bahaya per tingkat. Kejadian dari logbook adalah laporan, jadi "terlewat" adalah batas bawah (label).
- Layar: kartu rapor per bahaya dan tingkat; tenggat evaluasi berikutnya dari MB-2.
- Terima: rapor 4-bulanan terbit tanpa isian; POD dan FAR cocok dengan hitungan tangan 20 pasangan contoh.
- Bergantung: MB-2, MB-6. Umpan balik WA satu ketuk ("1 gejala teramati, 2 tidak ada, 3 aksi dilakukan") dan tabel `ews_umpan` menunggu U11; sampai itu kartu memuat baris "umpan balik BPBD: menunggu".

**PD-2. Peta cakupan layanan peringatan dini lawan penduduk terpapar (F2)** `riset/2` §1.4
- Masalah dan bukti: isu Renstra "keterpenuhan sistem peringatan dini baru 6 persen" dan target 23 paket (2025) ke 170 paket (2029) tanpa peta desa yang belum terlayani.
- Pengguna dan keputusan: Dit. PD; lokasi paket instrumen tahun berikut.
- Masukan: `terpapar.json` (desa di zona bahaya), titik sirine OSM (`emergency=siren`) lewat Overpass, alat di `sensor` D1 (`migrations/0089_sensor.sql`). Bulanan.
- Aturan: desa terlayani bila jarak pusat desa ke instrumen terdekat ≤ r (bawaan 2 km [asumsi], di MB-2). Cakupan = Σ penduduk desa terpapar tinggi yang terlayani / Σ penduduk desa terpapar tinggi, per bahaya per kab. Prioritas = terpapar tak terlayani x frekuensi kejadian / kapasitas.
- Layar: kartu angka cakupan kita di samping 6% Renstra, daftar 170 lokasi usulan.
- Terima: label "batas bawah: instrumen dari OSM" tampil selama daftar penerima paket belum ada.
- Bergantung: daftar penerima instrumen (U10); tampil publik menunggu U2.

### 6.6 KS: Dit. Kesiapsiagaan

**KS-4. Kalender gladi pra-musim (F1, MB-2)** `riset/2` §2.4
- Masalah dan bukti: gladi kesiapsiagaan SPM (Juklak 4/2026) dan uji renkon (Perban 2/2023 Pasal 19) tidak terjadwal terhadap musim bahaya daerah.
- Pengguna dan keputusan: Dit. KS dan BPBD; bulan gladi dan bahaya yang dilatih.
- Masukan: `siaga.json` (kalender risiko per kab per bulan), `risiko_hvc.json`, `dibi_kab_tahun.json`. Bulanan.
- Aturan: bulan gladi = 1-2 bulan sebelum awal musim bahaya utama kab; bahaya = teratas di `risiko_hvc`; skenario strategis dari kejadian terburuk kab di DIBI (lampiran Perban 2/2023 mengizinkan sejarah kejadian terburuk).
- Layar: kartu "N kab masuk bulan gladi dalam 60 hari" dengan unduhan kerangka skenario (teks).
- Terima: tiap kab dalam daftar punya bulan musim di `siaga.json`; tanpa musim = tidak masuk daftar.
- Bergantung: perluasan `scripts/bnpb/siaga.py` (pemilik `ruang-bnpb`).

**KS-1. Pemantau dokumen kesiapsiagaan daerah (F2, MB-3)** `riset/2` §2.4
- Masalah dan bukti: renkon berlaku 3 tahun dan RPKB ditetapkan perkada (Perban 9/2025), tetapi meja `renkon` 0 baris; IKK daerah dengan dokumen rencana aksi 4,27% (Renstra).
- Pengguna dan keputusan: Dit. KS; daerah mana didorong memutakhirkan, mana diasistensi.
- Masukan: MB-3 (judul perkada dan perkab), mingguan; dokumen yang diterima BNPB (Perban 9/2025 Pasal 28 ayat (3)) lewat `/bnpb/dokumen`; kejadian berstatus dari `status_darurat.json`.
- Aturan: per (daerah, bahaya): `berlaku` bila tgl_tetap + 3 tahun > hari ini; `segera_habis` ≤ 90 hari; `kedaluwarsa`; `perlu_reviu` bila lewat 6 bulan sejak reviu terakhir (`renkon_reviu`, MB-2); RPKB `perlu_mutakhir` bila sesudah penetapan ada status darurat di daerah itu (Pasal 26 ayat (2) huruf c); tanda "renkon untuk bahaya utama belum ada".
- Layar: kartu "N daerah dengan renkon berlaku menurut JDIH" di samping IKK 4,27%.
- Terima: ≥ 100 dokumen daerah terdeteksi dalam sebulan; label "batas bawah: renkon ber-SK Kalak tidak masuk JDIH".
- Bergantung: MB-3, U5; koreksi RPKB lewat `unit_ketuk` (MB-7).

**KS-3. Kesenjangan lokasi evakuasi (F2)** `riset/2` §2.4
- Masalah dan bukti: fungsi "koordinasi penyiapan lokasi evakuasi" (Perban 6/2025 Pasal 63 huruf e) tanpa peta desa terpapar yang tidak punya titik evakuasi terjangkau.
- Pengguna dan keputusan: Dit. KS; desa mana diprioritaskan.
- Masukan: `public/data/osm_nasional/<prov>.json` (kunci `titik_kumpul`, `sekolah`, `ibadah_n`, dan lainnya), `terpapar.json`, zona bahaya InaRISK di pipeline. Bulanan.
- Aturan: jarak pusat desa terpapar tinggi ke kandidat terdekat di luar zona bahaya; `kurang` bila > d (tsunami 1 km [asumsi, perlu dicek ke pedoman TES]; banjir dan erupsi parameter terpisah di MB-2).
- Layar: kartu daftar desa `kurang` dan kandidat bangunan terdekat; cakupan OSM per kab ditandai.
- Terima: kandidat tidak pernah disebut "lokasi evakuasi resmi".
- Bergantung: U2 untuk lapisan publik di modul gempa/tsunami.

### 6.7 MT: Dit. Mitigasi Bencana

**MT-1. Penyusun dan pra-telaah usulan Dana Bersama prabencana (F2)** `riset/2` §3.4
- Masalah dan bukti: usulan harus cocok daftar kegiatan Lampiran I Juklak 4/2025 (kode 02.01.01-02.01.11), standar biaya Juklak 2/2026 (278 halaman), satu usulan satu keluaran; tim telaah pencegahan (Perban 1/2026 Pasal 27-28) menilai manual.
- Pengguna dan keputusan: tim telaah pencegahan, BPBD pengusul; lolos administrasi atau tidak, urutan prioritas.
- Masukan: tabel kegiatan dan kelas risiko diekstrak sekali dari `juklak-4-2025`, komponen biaya dari `juklak-2-2026`, `risiko_hvc.json`, `ikd.json`, `terpapar.json`, keluaran KS-1.
- Aturan: skor = 1 (sesuai RPB/RKPD, tautan dokumen) + 1 (kab di kuartil atas risiko kita, "bukan IRBI resmi") + 1 (subkegiatan SPM); kelas ESMS dari kode kegiatan; RAB = komponen x volume x harga satuan Juklak 2/2026, komponen di atas standar ditandai; tolak bila lebih dari satu keluaran.
- Layar: alat klien murni di halaman unit (isi di peramban, ekspor PDF/Excel), tanpa simpan D1.
- Terima: 10 usulan contoh dihitung sama dengan hitungan tangan; label "alat bantu, bukan kanal pengajuan".
- Bergantung: ekstraksi tabel 278 halaman; kepastian sistem telaah resmi (Perban 1/2026 Pasal 33) belum ada.

**MT-2. Daftar daerah prioritas mitigasi dan paket kegiatan (F2, MB-4)** `riset/2` §3.4
- Masalah dan bukti: IKK daerah prioritas yang difasilitasi mitigasi 6,40% ke 40,70% tanpa daftar daerah dan jenis kegiatan.
- Pengguna dan keputusan: Dit. MT; kab mana dan kegiatan apa.
- Masukan: `risiko_hvc.json`, `dibi_kab_tahun.json`, `ikd.json`, modul banjir, longsor, pesisir, kekeringan; tabel kegiatan dari MT-1. Bulanan.
- Aturan: kab prioritas = kuartil atas risiko multi-bahaya dan kapasitas rendah (MB-4); pemetaan bahaya ke kegiatan tertulis dan bisa disunting direktorat (banjir ke 02.01.09 dan 02.01.07, longsor ke 02.01.10 dan 02.01.11, abrasi ke NBS mangrove); 1-3 kegiatan per kab.
- Layar: kartu daftar kab dan kegiatan; status "difasilitasi" dari ketukan staf.
- Terima: label "usulan analis" tampil; tiap kab membawa alasan komponen skor.
- Bergantung: MB-4, MT-1 (tabel kegiatan).

**MT-3. Kalender kampanye dan sasaran edukasi per kab (F2, MB-2)** `riset/2` §3.4
- Masalah dan bukti: Juklak 7/2026 meminta kajian karakteristik sasaran dan preferensi media; kampanye belum ditautkan ke musim bahaya per kab.
- Pengguna dan keputusan: Dit. MT; kab, bulan, dan saluran kampanye.
- Masukan: `siaga.json`, `terpapar.json` (kelompok umur per desa di zona bahaya), `public/ews_tindakan.js`. Bulanan.
- Aturan: kab yang masuk musim bahaya dalam 1-2 bulan mendapat paket: pesan tindakan, desa sasaran (terpapar terbesar), porsi lansia dan balita untuk memilih saluran (ambang disetel direktorat, bawaan [asumsi]).
- Layar: kartu kalender dan unduhan kartu PNG.
- Terima: data agregat desa saja, tanpa by name by address.
- Bergantung: MB-2.

### 6.8 KPOD: Dit. Koordinasi Pengendalian Operasi Darurat

Batas: modul yang sudah ada (`public/bnpb/dalops.*`, `logbook.*`, `perencanaan.*`, `dokumen_pusdalops.js`, `sitrep.*`) tidak diusulkan ulang; halaman `/bnpb/unit/kpod` menautkannya.

**KPOD-2. Jam Aturan (F1, MB-2)** `riset/3` A2
- Masalah dan bukti: ambang di `src/meja_spek.js` baris 11 tidak sesuai aturan (`dsp_spj_hari: 30`, `kaji_verifikasi_jam: 72`); tanda bahaya yang salah lebih buruk daripada tidak ada.
- Pengguna dan keputusan: Dit. KPOD sebagai pemilik NSPK penanganan darurat; semua meja.
- Masukan: pasal korpus JDIH, ditulis tangan sekali per kunci.
- Aturan: MB-2. Tambahan dari F0-2: `trc_bergerak`, `masa_status(skala)`, `pengungsi_mutakhir`; kolom meja `dsp` ditambah `tgl_status_berakhir` (di `data` JSON). `public/inti/status_pedoman.js` berhenti menanam angka 14, 31, 92 hari dan membaca berkas ini.
- Layar: kartu "N kunci aturan, M berlabel asumsi" berisi daftar kunci, nilai, pasal, kutipan; dipakai semua halaman unit.
- Terima: gerbang `gerbang-jam-aturan.test.mjs` hijau; 0 angka tenggat tertanam di luar berkas.
- Bergantung: MB-1 (status BERLAKU).

**KPOD-3. Laporan harian terurai otomatis dari PDF di WA (F1, MB-7)** `riset/3` A3
- Masalah dan bukti: `public/data/laphar_riwayat.json` hanya diperbarui saat pemilik menjalankan skrip lokal atas arsip 1,5 GB; kunci `cakupan.tanpa_pdf` mencatat hari bolong; semua sistem Deputi PD bergantung padanya.
- Pengguna dan keputusan: Dit. KPOD, Dit. Wilayah; tidak ada keputusan langsung, ini sumber data.
- Masukan: PDF Laphar yang tiba lewat WA tiap hari (`laphar_pdf` di `src/wa_jenis.js`, R2 `wa/...`).
- Aturan: `scripts/wa/otomatis.mjs` menambah langkah: unduh PDF hari itu, `pdftotext -layout`, tahap 1 `scripts/umum/laphar_arsip.mjs` untuk satu hari, simpan `data/raw/laphar/hari/AAAA-BB-HH.json`, lalu `scripts/umum/laphar_arsip.py` menulis ulang JSON. Medan baru `pendampingan` disimpan sebagai kelas (`dsp`, `logistik`, `personel`, `udara`) dan nilai rupiah, bukan teks bebas (PDF memuat nama petugas).
- Layar: kartu kesegaran Laphar (`cakupan.sampai`, hari bolong 30 hari terakhir).
- Terima: `cakupan.sampai` tidak tertinggal lebih dari 1 hari selama 30 hari.
- Bergantung: Mac mini dan gateway WA hidup (`wa-bot`).

**KPOD-1. Rapor intervensi status darurat (F2, MB-6)** `riset/3` A1
- Masalah dan bukti: IKU Program 3 "% daerah yang menetapkan status darurat dan menerima intervensi sesuai standar" dilaporkan 100% tanpa cara hitung terbuka [resmi, LAKIP]; indikator aktivasi posko targetnya hanya 15-35%.
- Pengguna dan keputusan: Direktur KPOD, Deputi; daerah berstatus yang belum disentuh, wilayah yang tertinggal, bahan LAKIP.
- Masukan: `status_darurat.json` (harian, `scripts/umum/status_darurat.py` di `data.yml`), `laphar_riwayat.json` dengan medan `pendampingan` (KPOD-3), meja `dsp` dan `logistik` bila terisi (kosong = komponen dilewati).
- Aturan: per SK s (kab k, mulai t0): `terpantau` = ada episode Laphar di k dengan |mulai - t0| ≤ 3 hari; `didampingi` = kelas pendampingan tidak kosong; `tepat_waktu` = intervensi pertama ≤ 3 hari sesudah t0. IKU = didampingi / jumlah SK per bulan, per Dit. Wilayah, per jenis bencana, di samping angka resmi LAKIP.
- Layar: kartu rapor di `/bnpb/unit/kpod`, internal (pertanyaan `riset/3` §8 no. 6).
- Terima: ≥ 80% SK punya pasangan episode Laphar; kata kunci pendampingan diuji pada 50 entri berlabel tangan sebelum tayang.
- Bergantung: KPOD-3, `public/data/bnpb/dit_wilayah.json` (WIL-1).

### 6.9 WIL: Dit. Penanganan Darurat Wilayah I, II, III

Satu halaman `/bnpb/unit/wil` untuk tiga direktorat. Saringan provinsi dari tabel Pasal 74, 77, 79A Perban 11/2025 di `public/data/bnpb/dit_wilayah.json` (data aturan, bukan angka unit; boleh di `public/`), dijaga `tests/bnpb/unit_wil1.test.mjs`: 38 provinsi tepat di satu direktorat, IKN di Wilayah II. Pemilih direktorat berupa deretan pil penuh lebar; bawaan = provinsi di `staf.wilayah`.

**WIL-1. Meja Wilayah: siapa yang diurus hari ini (F2, MB-2)** `riset/3` W1
- Masalah dan bukti: data yang dibutuhkan direktur wilayah tersebar di lima berkas; struktur baru berumur 10 bulan dan belum ada alat yang tahu provinsi mana milik siapa.
- Pengguna dan keputusan: Direktur dan staf Dit. Wilayah; kab mana ditelepon, SK mana ditanya perpanjangan atau transisi.
- Masukan: `status_darurat.json`, `saran_status.json`, `laphar_riwayat.json`, keluaran `/prediksi`, rekap `korban` agregat lewat rute yang ada. Harian.
- Aturan: antrean urut: (1) episode berjalan dengan meninggal > 0 atau mengungsi ≥ 1.000 tanpa pendampingan; (2) SK berakhir ≤ 2 hari dan episode masih berjalan; (3) saran Tanggap Darurat tanpa SK > 3 hari; (4) SK berakhir, DSP cair, SPJ belum, sisa tenggat dari MB-2; (5) prakiraan +1..+3 level tinggi di kab berstatus siaga. Tiap butir membawa alasan satu kalimat dan sumbernya.
- Layar: tiga antrean per direktorat; teks masa SK memakai `public/semua/darurat.js` dan `public/inti/status_pedoman.js`.
- Terima: antrean terbit harian; butir tipe 1 jalan hanya bila KPOD-3 jalan, sisanya tetap jalan.
- Bergantung: KPOD-3, MB-2.

**WIL-2. Pengungsi per tempat pengungsian, kebutuhan dasar, selisih pusat-daerah (F2, MB-5, MB-7)** `riset/3` W2
- Masalah dan bukti: Juknis 9/2023 mewajibkan data per tempat diperbarui tiap hari, aplikasinya "apabila tersedia"; angka pusat dan daerah berselisih (Aceh Utara 4.385 lawan 18.908 jiwa, Maret 2026 [sekunder, NU Online]).
- Pengguna dan keputusan: Dit. Wilayah, Posko PDB, Deputi Logpal; berapa beras, air, jamban, tenda untuk besok; angka mana dibawa ke pimpinan.
- Masukan: `mengungsi_jiwa` per kab dari `laphar_riwayat.json` (otomatis); pesan WA `#pengungsian <tempat> KK ...` lewat MB-7; isian pendek 11 angka di `/instansi` untuk akun BPBD; angka pemda dari berita sebagai pembanding [sekunder].
- Aturan: kebutuhan per tempat per hari dari MB-5 (beras 0,4 kg x jiwa; air 7 liter x jiwa hari 1-3 lalu 15 liter; jamban ceil(jiwa/20); hunian 3 m2 x jiwa; kantong sampah ceil(KK/3) per 3 hari; sabun 0,25 kg x jiwa per bulan). Rekap kab = tempat dengan data ≤ 2 hari; lebih tua = basi. Selisih pusat-daerah > 25% merah.
- Layar: tab "Pengungsian" di halaman wil; rekap per kab, tempat < 10 jiwa disembunyikan dari rekap.
- Terima: kebutuhan beras dan air satu tempat contoh sama dengan hitungan tangan; angka Laphar tetap tampil walau WA kosong.
- Bergantung: MB-5, MB-7, tabel `pengungsian_tempat` dan `pengungsian_harian` (migrasi baru, tanpa nama pengungsi dan tanpa kontak koordinator), rute `src/pengungsian.js` pola `src/korban.js`, U11 untuk WA.

**WIL-3. Kaji cepat dua tahap yang drafnya terisi sendiri (F2, MB-2)** `riset/3` W3
- Masalah dan bukti: meja `kaji_cepat` satu tahap dengan ambang 72 jam; Juklak 3/2022 mengenal laporan awal 24 jam (rekomendasi status) dan lanjutan 72 jam (rencana operasi); meja 0 baris.
- Pengguna dan keputusan: TRC BNPB yang dikirim Dit. Wilayah dan TRC BPBD; status apa direkomendasikan dan berapa lama.
- Masukan: laporan warga (`src/laporan_bencana.js`), WA, `saran_status.json`, `/prediksi`, episode Laphar, `terpapar.json`, median masa SK sejenis dari `status_darurat.json`.
- Aturan: draf laporan awal terisi otomatis: cakupan wilayah, penduduk terpapar, rekomendasi status menurut aturan `scripts/umum/saran_status.py` (Siaga bila hanya sinyal, Tanggap bila ada dampak terverifikasi, gempa tidak pernah Siaga), perkiraan masa. TRC mengoreksi dan menyetujui. Lanjutan menambah kebutuhan dari WIL-2.
- Layar: draf di Meja Kerja `kaji_cepat`; ringkasan di halaman wil. Rute pra-isi `GET /api/meja/kaji_cepat/draf?kab=` membaca JSON saja.
- Terima: tenggat 24 dan 72 jam dari MB-2; label "saran", penetapan tetap oleh kepala daerah.
- Bergantung: MB-2, WIL-2; dua tahap dicatat lewat kolom data meja, tanpa status meja baru (BT-5).

### 6.10 PLP: Dit. Pengelolaan Logistik dan Peralatan

**PLP-1. Neraca stok penyangga 514 kab/kota (F1, MB-5)** `riset/4` P1
- Masalah dan bukti: Perka 23/2014 mewajibkan persediaan minimal 72 jam dengan rumus JP x PR x H (Pasal 11-14); Kalkulator SADD INALOGPAL menghitung setelah jumlah terdampak diisi tangan; WMS "Segera Hadir".
- Pengguna dan keputusan: Dit. PLP; alokasi buffer stock 10% dan prioritas hibah; BPBD tahu berapa yang disiapkan lewat APBD.
- Masukan: `terpapar.json` (JP kunci `n`, balita `b`, lansia `l`, terpapar tinggi), standar Perka 7/2008 dan 23/2014, `dibi_kab_tahun.json` (uji balik). Bulanan. Stok dari INALOGPAL `gudang_sumbar` dan meja `gudang` bila ada; selain itu "belum dilaporkan".
- Aturan: paket pangan = JP x PR x H, H = 3; sandang dan papan = JP x PR x H / 4 (bacaan harfiah Pasal 11, ditampilkan berdampingan dengan bacaan satu paket per keluarga, `riset/4` Q3). Tiga skenario PR: 1% umum, 4% khusus, PR_risiko = clamp(terpapar tinggi maks / n, 1%, 4%) [asumsi]. Turunan: beras kg = paket x 0,4; air minum liter = paket x 2,5. Uji balik DIBI 2015-2025 dengan pemangkasan persentil 99 (hasil riset: 209 dari 5.654 kab-tahun atau 3,7% melewati 1% penduduk).
- Layar: kartu "N kab/kota belum punya data stok untuk 72 jam pertama" dengan tabel per kab; tautan ke `/bnpb/perencanaan`.
- Terima: 514 kab terhitung; self-check satu kab dihitung tangan; uji balik tercatat di JSON.
- Bergantung: MB-5; stok menunggu U4 (MB-8 INALOGPAL).

**PLP-2. Daftar pendek penerima hibah logpal, tujuh kriteria Juklak 3/2024 (F2, MB-4)** `riset/4` P2
- Masalah dan bukti: Juklak 3/2024 menilai prioritas dari tujuh kriteria lalu Keputusan Deputi; sebagian besar kriteria sudah ada sebagai data, penilaiannya di rapat.
- Pengguna dan keputusan: Dit. PLP saat menyusun Keputusan Deputi.
- Masukan: risiko kecamatan (`public/banjir/data/risiko_kecamatan.json`), `dibi_kab_tahun.json`, `kab_prioritas.json`, standar peralatan Perka 17/2009 dijadikan `data/kajian-bnpb/kedeputian/data/standar_peralatan_2009.json`, `ikd.json`, kesenjangan dari PLP-1. Tahunan.
- Aturan: skor MB-4 atas kriteria terukur; "program prioritas nasional" dan "analisis strategis" tidak diskor, kolom kosong untuk rapat. Kriteria "sudah menerima 3 tahun" kosong sampai U10.
- Layar: tab "Prioritas hibah" di halaman plp; label "daftar pendek, keputusan tetap di rapat".
- Terima: tiap baris membawa alasan per kriteria; bobot tampil.
- Bergantung: MB-4, PLP-1, U10.

**PLP-3. Pengingat kewajiban pasca-hibah dan kedaluwarsa (F2, MB-2)** `riset/4` P3
- Masalah dan bukti: penerima hibah wajib mencatat dan membuat laporan penggunaan barang (Juklak 3/2024); logistik keluar FEFO (Perban 4/2018 Pasal 7).
- Pengguna dan keputusan: Dit. PLP; penerima mana belum lapor.
- Masukan: daftar BAST (lampiran Keputusan Deputi diunggah lewat `/bnpb/dokumen` lalu diimpor skrip), kedaluwarsa per batch (pola P3K di `migrations/0034_korban_p3k.sql`).
- Aturan: laporan jatuh tempo 12 bulan sesudah BAST [asumsi, MB-2]; peringatan 90 dan 30 hari sebelum kedaluwarsa; hijau, kuning, merah.
- Layar: kartu daftar penerima dan status.
- Terima: tanpa daftar BAST kartu menulis "menunggu data hibah", bukan nol.
- Bergantung: tabel `hibah_bast` (migrasi baru), U10 (daftar BAST), U11 (pengingat WA).

### 6.11 OJL: Dit. Optimasi Jaringan Logistik dan Peralatan

**OJL-2. Penempatan stok musiman dan menjelang kejadian (F2, MB-4)** `riset/4` O2
- Masalah dan bukti: Juklak 16/2025 meminta pemetaan sumber daya dan pemanfaatan peringatan dini pada prabencana; repo sudah tahu kapan dan di mana kejadian cenderung datang tetapi belum menerjemahkannya ke "geser berapa barang".
- Pengguna dan keputusan: Dit. PLP (distribusi, Pasal 96 huruf d) dan Klaster Logistik daerah.
- Masukan: PLP-1, `kalender_operasi.json`, `stok_prapemusim.json`, keluaran `/prediksi`. Bulanan dan harian.
- Aturan: musiman: target stok per kab = kebutuhan 72 jam x indikator(bulan ∈ musim kab). Jelang kejadian: bila `/prediksi` memberi tingkat tinggi, keluarkan saran paket 72 jam untuk N jiwa (N = 1% x JP atau terpapar tinggi bila lebih kecil). Selama OJL-1 (gudang terdekat dan jam tempuh) belum ada, saran tidak menyebut gudang asal. Saran, bukan perintah; tiap saran mencatat pemicunya.
- Layar: kartu saran minggu ini.
- Terima: label "prediksi masih dinilai prospektif" tampil.
- Bergantung: PLP-1, MB-4. Gudang asal menunggu OJL-1 (F3); lihat §10.

**OJL-3. Rapor Klaster Logistik dari API INALOGPAL (F2, MB-6, MB-8)** `riset/4` O3
- Masalah dan bukti: klaster daerah wajib memutakhirkan data tiap 3 bulan dan melapor triwulan (Format-5); capaian e-monev 2026 tertinggi 11,87% (Aceh), 16 provinsi dan 12 kab tercatat ber-SK (API INALOGPAL, 5 Nov 2026).
- Pengguna dan keputusan: sekretariat Klaster Logistik Nasional; provinsi mana didorong.
- Masukan: `get_progress`, `get_count_cluster_all`, `get_count_cluster_sk_all` harian lewat MB-8; beban kejadian 5 tahun dari DIBI dan logbook.
- Aturan: per provinsi: SK ada atau belum, capaian pra/darurat/pasca, hari sejak pembaruan, beban kejadian. Merah bila beban di sepertiga teratas dan capaian < 25% atau tanpa SK. Draf Format-5 triwulan dari templat teks.
- Layar: kartu rapor per provinsi; unduhan draf Format-5.
- Terima: nama dan nomor PIC anggota klaster tidak tersimpan; API berubah = berkas terakhir dengan tanggal.
- Bergantung: MB-8, U4; pengingat WA menunggu U11.

### 6.12 RRX: Deputi RR, lintas direktorat

**RRX-1. Jam pascabencana per kab (F1, MB-2)** `riset/5` D1
- Masalah dan bukti: R3P paling lama 90 hari dan dimulai saat tanggap darurat (Perban 5/2017 Pasal 2); hibah RR mensyaratkan R3P (Perban 4/2024 Pasal 9); fungsi perencanaan kini tersebar di tiga direktorat (Perban 11/2025 Pasal 82); kasus Maluku 2019 tanpa R3P sampai 2023 [sekunder].
- Pengguna dan keputusan: Deputi RR dan tiga direktur; kab mana didampingi Jitupasna minggu ini, mana lewat 90 hari.
- Masukan: `status_darurat.json`, `dibi_kejadian.json`, `dibi_kab_tahun.json`. Harian. Status R3P dan hibah: kolom data `tgl_r3p` di meja `rehab` (DT §5.8), tanpa status meja baru (BT-5).
- Aturan: hari-0 = `mulai` SK tanggap darurat pertama (kab, kejadian); SK berjarak ≤ 14 hari digabung. Sisa = 90 - (hari ini - hari-0): hijau > 30, kuning 1-30, merah ≤ 0 tanpa R3P tercatat. Layak didampingi bila RB + RS ≥ 100 [asumsi] atau jembatan ≥ 1. Urutan = RB x 60 + RS x 30 + RR x 15 juta [sekunder, tarif stimulan].
- Layar: kartu "N kab melewati 90 hari tanpa R3P tercatat" di `/bnpb/unit/rrx`, juga tampil di halaman rrp, rri, rrs.
- Terima: nomor SK sumber tampil per baris; tanpa ketukan staf, kartu menulis "R3P: belum ada catatan", bukan "belum ada R3P".
- Bergantung: MB-2; catatan R3P menunggu F0-3.

### 6.13 RRP: Dit. RR Perumahan

**RRP-3. Kalkulator Jitupasna permukiman, Perka 15/2011 (F1)** `riset/5` P3
- Masalah dan bukti: formulir Perka 15/2011 dihitung manual; kebutuhan = unit x satuan biaya x indeks biaya (hlm 47), indeks antarwilayah tidak di satu tempat.
- Pengguna dan keputusan: tim Jitupasna BPBD dan Dit. RRP saat praverifikasi.
- Masukan: unit dari isian atau dari RRP-1 bila ada; satuan biaya = tarif stimulan atau harga pemda; IKK BPS per kab (`scripts/bnpb/ikk.py`, kunci BPS di Keychain pemilik, dijalankan lokal tahunan).
- Aturan: kerusakan = Σ unit_t x harga_t, t ∈ {RB, RS, RR}; kebutuhan = Σ unit_t x satuan_t x IKK_kab / 100; IKK kab kosong = IKK provinsi berlabel. Pemeriksaan ganda (hlm 41): huntap + stimulan RB > RB terverifikasi ditandai.
- Layar: alat klien murni di halaman rrp, unduhan CSV kolom lampiran 7 Perka 15/2011.
- Terima: uji node fungsi murni di `tests/bnpb/`.
- Bergantung: IKK BPS (lokal).

**RRP-1. Neraca rumah rusak per kab: lapor, verifikasi, tersalur (F2, MB-5, MB-8)** `riset/5` P1
- Masalah dan bukti: tiga sampai empat versi angka per kejadian; layer NTT 2026 (10 kab, 3 Nov 2026): lapor RB 25.833, terverifikasi RB 6.348 [resmi, layer gis.bnpb.go.id]; beban stimulan versi lapor sekitar Rp2,93 triliun lawan versi verifikasi Rp1,34 triliun [hitungan].
- Pengguna dan keputusan: Direktur RRP, Deputi; berapa DSP stimulan realistis diajukan, kab mana verifikasinya tertinggal.
- Masukan: `dibi_kejadian.json` (lapor), layer verifikasi per kejadian di gis.bnpb.go.id (kolom `verif_*`, agregat kab) lewat MB-8, grid Open Buildings (R2 `bangunan/kec.json`), tersalur dari RRP-2. Harian.
- Aturan: per (kejadian, kab): kemajuan verifikasi = total_verif / L_total; susut RB = V_RB / L_RB; tanpa V pakai median susut kejadian sejenis bila ≥ 3 kab pembanding, selain itu "belum ada pembanding". L kec > 0,8 x bangunan kec ditandai "periksa". Beban stimulan dua kolom (lapor, verifikasi), tarif di satu konstanta.
- Layar: kartu tabel per kejadian dan kab.
- Terima: angka L dan V tampil ≤ 24 jam setelah layer berubah; tidak ada titik per rumah tersimpan.
- Bergantung: MB-8, U4, kamus kolom per kejadian.

**RRP-2. Panen angka pemulihan dari rilis resmi (F2, MB-7)** `riset/5` P2
- Masalah dan bukti: tabel `pemulihan` (`migrations/0096_pusdalops_operasi.sql`, `src/pemulihan.js`) dan meja `rehab` 0 baris; angka huntara, huntap, DTH sudah terbit di rilis dan berita.
- Pengguna dan keputusan: Direktur RRP, Dit. KPOD (pemilik tracker); realisasi lawan target per kab.
- Masukan: berita lewat `scripts/umum/berita.py` dengan leksikon baru `scripts/berita/pemulihan.py`. Harian.
- Aturan: pola "<angka> unit <huntara|huntap>" dan "<angka> (KK|rekening)" dengan nama kab dari kamus wilayah; tiap angka menjadi usulan baris berlabel sekunder; masuk tabel hanya setelah ketukan staf "benar".
- Layar: daftar usulan di halaman rrp; terima memanggil `POST /api/pusdalops/pemulihan/terima` (rute baru di `src/pemulihan.js`).
- Terima: presisi diuji pada 30 artikel berlabel tangan sebelum tayang; URL sumber wajib tampil.
- Bergantung: MB-7.

### 6.14 RRI: Dit. RR Infrastruktur

**RRI-1. Daftar akses putus sampai pulih (F2, MB-7, MB-8)** `riset/5` I1
- Masalah dan bukti: layer `Data_Jalan_Jembatan_Putus_Akses_PU` (341 titik, 24 Nov-2 Des 2025) berhenti diperbarui dan tanpa status pulih; DIBI 365 hari terakhir 911 jembatan rusak (`dibi_kejadian.json`).
- Pengguna dan keputusan: Direktur RRI, Satgas, Dit. KPOD; titik mana masih putus setelah N hari, siapa pemilik asetnya.
- Masukan: layer ArcGIS (MB-8), OSM jalan dan jembatan (`public/data/osm_nasional/<prov>.json` kunci `jembatan`), status pulih dari WA (MB-7). Mingguan.
- Aturan: titik digabung bila ≤ 200 m dan desa sama; pemilik dari tag OSM terdekat ≤ 50 m (trunk/primary atau ref nasional = nasional, secondary = provinsi, lain = kab/desa [hitungan, estimasi]); tanda "aset desa: tidak bisa hibah RR" (Perban 4/2024 Pasal 5 huruf e).
- Layar: kartu daftar titik dan median umur putus; lapisan di `/bnpb/operasi` hanya tautan.
- Terima: kelas pemilik berlabel estimasi.
- Bergantung: tabel `akses_status` (migrasi baru, CHECK status IN putus/darurat/pulih), MB-7, MB-8.

### 6.15 RRS: Dit. RR Sosial, Ekonomi, dan Lingkungan Hidup

**RRS-3. Daftar fasilitas sosial rusak untuk bab sosial R3P (F1)** `riset/5` S3
- Masalah dan bukti: fasilitas pendidikan rusak tercatat di DIBI per kab (4.187 dalam 365 hari), tetapi bab sosial R3P perlu nama fasilitas; fasilitas kesehatan dan ibadah tidak ada di DIBI.
- Pengguna dan keputusan: Dit. RRS dan BPBD penyusun R3P; fasilitas mana dicek lapangan.
- Masukan: `public/data/osm_nasional/<prov>.json` (kunci `sekolah`, `puskesmas`, `rs`, `klinik`, `ibadah_n`), jejak bahaya yang sudah ada (poligon banjir, MMI gempa ≥ VII, longsor), `dibi_kejadian.json`. Per kejadian.
- Aturan: fasilitas di dalam jejak kejadian; bandingkan jumlah dengan `f_pendidikan` DIBI kab; selisih besar = "pendataan belum lengkap".
- Layar: kartu per kejadian besar, tabel fasilitas.
- Terima: label "fasilitas dalam jejak bahaya, belum tentu rusak".
- Bergantung: tidak ada untuk versi OSM. Panen Dapodik menunggu uji izin (`riset/5` §7.4).

**RRS-1. Taksiran cepat kerugian pertanian per kab (F2, MB-5)** `riset/5` S1
- Masalah dan bukti: bab ekonomi Jitupasna butuh kerugian pertanian; data puso resmi tahunan dan bolong (`public/data/bnpb/puso.json`).
- Pengguna dan keputusan: Dit. RRS, Bappeda; besaran usulan stimulan puso (Juknis 1/2024).
- Masukan: luas genangan dari modul banjir, sawah dari lahan baku sawah atau ESA WorldCover cropland, produktivitas dan harga GKP dari BPS. Per kejadian.
- Aturan: kerugian = luas sawah tergenang x P(puso | genangan ≥ 7 hari) x produktivitas x harga; P dikalibrasi dari `puso.json`; kriteria lolos dikunci dulu (pola `scripts/data/lab_kriteria/`). Kalibrasi kalah dari rata-rata kab = hanya luas tergenang, tanpa rupiah.
- Layar: kartu per kejadian banjir.
- Terima: vonis kalibrasi tercatat sebelum rupiah tampil; pemeriksa `validasi-model`.
- Bergantung: MB-5, data sawah terbuka.

### 6.16 REN: Biro Perencanaan

**REN-1. Rapor Reformasi Birokrasi: di mana poin hilang (F1, MB-6)** `riset/6` §1.4
- Masalah dan bukti: Indeks RB adalah salah satu indikator Kepala BNPB; komponen 2024: Indeks Kualitas Kebijakan 0 dari 1,5, Indeks Reformasi Hukum 0 dari 1,5, Tata Kelola Pengadaan 0,44 dari 2, tindak lanjut LAPOR 0,6 dari 1,5 [resmi, LAKIP hal. 73-94].
- Pengguna dan keputusan: Sestama, Kepala Biro Perencanaan; komponen mana dikejar tahun ini dan siapa pemiliknya.
- Masukan: `data/kajian-bnpb/pustaka/5-lakip.md` (22 komponen), `3-renstra.md`. Tahunan.
- Aturan: poin_hilang = bobot - nilai_tertimbang; prioritas = poin_hilang x kemudahan (1 ikut pengukuran, 0,5 ubah proses, 0,25 struktural [asumsi]).
- Layar: kartu "N poin RB hilang di 3 komponen" dengan tabel komponen, bobot, nilai, poin hilang, pemilik; tautan ke `/kinerja-bnpb`.
- Terima: jumlah bobot 22 komponen sama dengan total di LAKIP.
- Bergantung: MB-6; dikerjakan sebagai blok baru di `scripts/bnpb/iku.py`.

**REN-3. Kalender monev dan tenggat pelaporan (F1, MB-2)** `riset/6` §1.4
- Masalah dan bukti: tenggat PK, laporan triwulan, LAKIP, evaluasi RB, TLHP 60 hari, laporan pelatihan 7 hari kerja tersebar di banyak peraturan.
- Pengguna dan keputusan: Biro Perencanaan; tenggat apa jatuh bulan ini dan unit mana pemiliknya.
- Masukan: MB-2 (kunci berlabel `unit: ren` dan kunci unit lain yang jatuh ke laporan Badan).
- Aturan: tampilkan tenggat 90 hari ke depan; tenggat tanpa pasal di korpus BNPB (misalnya yang diatur PermenPANRB) berlabel asumsi.
- Layar: kartu kalender di halaman ren.
- Terima: tiap baris membawa pasal atau label asumsi.
- Bergantung: MB-2. Pengingat WA menunggu U11.

**REN-2. Peta belanja lawan peta risiko dari SIRUP (F2, MB-8)** `riset/6` §1.4
- Masalah dan bukti: SS1 menuntut IRB turun 1,2% per tahun; tidak ada alat yang menunjukkan apakah belanja jatuh di kab berisiko tinggi dan berkapasitas rendah. SIRUP BNPB 2025: 1.439 paket penyedia dan 1.214 swakelola (cache `docs/pendanaan/cache/`).
- Pengguna dan keputusan: Biro Perencanaan saat Renja dan RKA; lokasi kegiatan.
- Masukan: SIRUP lewat `docs/pendanaan/sirup_tarik.py` (bulanan), `terpapar.json`, `ikd.json`.
- Aturan: pangsa_belanja = pagu_kab / pagu berlokasi; pangsa_kebutuhan = terpapar x (1 - kapasitas) / Σ; rasio < 0,5 di 20% kab berkebutuhan teratas = "kurang dilayani"; paket berlokasi kantor pusat dilaporkan terpisah. DSP tidak masuk RUP (catatan).
- Layar: kartu peta dan tabel kab kurang dilayani.
- Terima: label "RUP adalah rencana, bukan realisasi".
- Bergantung: MB-8.

### 6.17 KEU: Biro Keuangan

**KEU-1. Penguji konsistensi angka LAKIP dan LK (F1, MB-6)** `riset/6` §2.4
- Masalah dan bukti: catatan LAKIP 2025 di repo memuat 7 selisih antar-tabel, contoh persentase Biro Keuangan 72,34% padahal 137,2/143,4 = 95,69% (`5-lakip.md`).
- Pengguna dan keputusan: Biro Keuangan dan Biro Perencanaan; dokumen layak kirim atau belum.
- Masukan: draf PDF atau XLSX yang diunggah staf ke mesin lokal.
- Aturan: (a) jumlah baris sama dengan total; (b) persen dihitung ulang, toleransi 0,01; (c) angka sama di dua tabel identik; (d) basis persen disebut.
- Layar: tidak ada layar produksi. Skrip lokal `scripts/bnpb/uji_angka.py` menulis laporan markdown di luar git. Halaman keu memuat kartu cara pakai dan hasil uji atas LAKIP 2025 yang sudah publik.
- Terima: tujuh selisih LAKIP 2025 tertangkap.
- Bergantung: draf internal tidak pernah di-commit (`.gitignore`).

### 6.18 SDU: Biro SDM dan Umum termasuk Bagian PBJ

**SDU-1. Rapor tata kelola pengadaan dari SIRUP dan SPSE (F2, MB-6, MB-8)** `riset/6` §3.4
- Masalah dan bukti: Tata Kelola Pengadaan 22,02 (target Renstra 70); Bagian PBJ baru (Perban 11/2025 Pasal 36A) belum punya alat ukur; RUP 2025: 960 Pengadaan Langsung, 331 Penunjukan Langsung (Rp30,7 miliar), 74 nama paket PL/PenL berulang 3 kali atau lebih [hitungan dari cache SIRUP].
- Pengguna dan keputusan: Kepala Bagian PBJ; paket mana dikonsolidasikan, dipindah ke e-Purchasing, atau dimajukan.
- Masukan: SIRUP penyedia dan swakelola (MB-8), daftar tender publik SPSE BNPB. Bulanan.
- Aturan: porsi triwulan I, porsi e-Purchasing, porsi PDN dan UMK, porsi PenL; kandidat konsolidasi = kelompok nama paket ternormalisasi dengan ≥ 3 paket PL/PenL setahun dan jumlah pagu di atas ambang PL (ambang dicek ke Perpres PBJ yang berlaku).
- Layar: kartu rapor dan tabel kandidat konsolidasi dengan tautan SIRUP; tanpa nama penyedia.
- Terima: label "kandidat konsolidasi, bukan temuan pemecahan paket".
- Bergantung: MB-8.

### 6.19 HUK: Biro Hukum, Organisasi, dan Kerja Sama

**HUK-1. Pemeriksa status peraturan (F1, MB-1)** `riset/6` §4.4
- Masalah dan bukti: 13 dokumen tertulis BERLAKU padahal dicabut menurut teks (KA §5.0 F0-1; riset awal menyebut sedikitnya 19); per 5 Nov 2026 `perka-4-2008`, `perka-1-2012`, `perka-7-2015`, `perka-4-2016`, `perban-6-2021` masih BERLAKU di `katalog.json` [fakta repo].
- Pengguna dan keputusan: pengelola JDIH Biro Hukum; status mana dikoreksi di situs resmi.
- Masukan: MB-1 tiap panen.
- Aturan: MB-1 (a)-(c).
- Layar: pil konflik di `/bnpb/hukum` (dari F0-1); kartu "N dokumen dicabut menurut teks, masih BERLAKU di JDIH" dengan daftar dan unduhan CSV di halaman huk.
- Terima: gerbang `tests/agen/gerbang-status-hukum.test.mjs`.
- Bergantung: F0-1, U7.

**HUK-2. Pelacak amanat pengaturan turunan dan bahan Indeks Reformasi Hukum (F2, MB-1)** `riset/6` §4.4
- Masalah dan bukti: IRH dan IKK bernilai 0; Perban 4/2025 mendelegasikan tata cara uji kompetensi (Pasal 38), kurikulum (Pasal 41 ayat (2)), sistem informasi JF (Pasal 52 ayat (2)), penghitungan kebutuhan JF (Pasal 53 ayat (3)); tidak satu pun ada di korpus 233 dokumen.
- Pengguna dan keputusan: Biro Hukum; program legislasi tahunan.
- Masukan: MB-1 tahap amanat.
- Aturan: MB-1 (d); umur amanat sejak tanggal penetapan induk; tanda "terpenuhi" manual disimpan sebagai JSON di repo (tanpa form).
- Layar: kartu amanat terbuka per tahun; temuan celah lingkup Inspektorat II (Pasal 106 masih menyebut Pusdalops, Pusbin JF tidak tercakup) dicatat sebagai baris.
- Terima: empat amanat Perban 4/2025 tertangkap.
- Bergantung: MB-1.

### 6.20 IRT: Inspektorat I, II, III

**IRT-1. Papan umur rekomendasi TLHP per unit (F2, MB-6)** `riset/6` §5.4
- Masalah dan bukti: tindak lanjut hasil pengawasan APIP 46% (target naik ke 70% 2029); Pedoman 1/2025: tindak lanjut paling lambat 60 hari, rekonsiliasi triwulanan.
- Pengguna dan keputusan: Inspektur I, II, III; rekomendasi mana dikejar, mana diusulkan TPTD.
- Masukan: ekspor SIPTL, SIMHPNAS, atau rekap Excel Itama, satu berkas per triwulan.
- Aturan: umur = hari sejak LHP diterima; merah bila > 60 hari (MB-2) dan bukan "sesuai"; calon TPTD bila > 2 tahun dan cocok kriteria Pedoman 1/2025 (saran); %TL = sesuai / (total - TPTD).
- Layar: dengan bawaan U9, tidak ada layar produksi dan tidak ada tabel D1. `scripts/bnpb/tlhp.py` dijalankan lokal dan menghasilkan laporan kartu `.ex-std` dalam HTML lokal untuk pemilik.
- Terima: data tidak menyentuh repo publik, R2, atau D1.
- Bergantung: U9, izin Inspektur Utama.

### 6.21 DIK: Pusdiklat PB

**DIK-1. Peta sasaran diklat berbasis risiko (F2, MB-4)** `riset/6` §6.4
- Masalah dan bukti: target SDM daerah rawan yang difasilitasi diklat naik dari 64% (2025) ke 78% (2026) [resmi]; sertifikasi profesi 74 dari 232 orang.
- Pengguna dan keputusan: Kepala Pusdiklat; kab mana dan berapa angkatan.
- Masukan: `terpapar.json`, `ikd.json`, `dibi_kab_tahun.json`; alumni per kab dari CSV per angkatan tanpa nama (kab, instansi, jenis, tanggal, jumlah). Tahunan.
- Aturan: skor MB-4 (ALGORITMA §5.5 baris DIK-1) atas risiko, celah kapasitas, dan kejadian (persentil) ditambah celah layanan `1 - min(alumni_lulus_5thn / sdm_pb_kab, 1)` (mutlak; `sdm_pb_kab` bawaan 30 orang per BPBD [asumsi]); tanpa unggahan alumni, komponen celah layanan tidak ada dan kartu menulis "cakupan belum ada data".
- Layar: kartu peta dan tabel prioritas; tanpa unggahan, kartu hanya menampilkan kebutuhan.
- Terima: tidak ada nama peserta di D1 atau R2.
- Bergantung: MB-4; tabel `diklat_angkatan` (migrasi 0112) dan `POST /api/unit/diklat/unggah` (CSV, peran `unit`, KA §8).

**DIK-4. Bank tenaga pengajar dari direktori pakar (F2)** `riset/6` §6.4
- Masalah dan bukti: Perban 2/2025 Pasal 18 ayat (6) membolehkan pengajar dari praktisi dan dosen ber-ToT; repo sudah punya pencocok BM25 di `scripts/kemitraan/**`.
- Pengguna dan keputusan: perancang program Pusdiklat; calon pengajar per mata pelatihan.
- Masukan: mata pelatihan dari kurikulum (berkas e-Tangguh bila terjangkau, selain itu daftar diketik sekali), pakar dari `/akademisi` dan `/direktori` (R2, staf). Tahunan.
- Aturan: BM25 mata pelatihan lawan bidang pakar; 5 calon teratas per mata pelatihan; aturan `/direktori` (tanpa orang terkait kasus KPK, tanpa yang meninggal) berlaku.
- Layar: kartu daftar calon di halaman dik, tautan ke profil `/direktori`.
- Terima: tidak ada kontak pakar di keluaran; hanya tautan profil.
- Bergantung: pencocok `scripts/kemitraan/**` (pemilik `kampus`).

### 6.22 JF: Pusat Pembinaan JF Kebencanaan

**JF-1. Kamus kompetensi PB.01-PB.58 terstruktur (F1)** `riset/6` §7.4
- Masalah dan bukti: Kamus Kompetensi Teknis PB (Perban 5/2024, 116 halaman) hanya PDF; analisis kebutuhan pelatihan (Perban 4/2025 Pasal 43) butuh data terstruktur.
- Pengguna dan keputusan: Pusbin JF dan Pusdiklat; program pengembangan kompetensi 2027.
- Masukan: `data/raw/hukum/teks/perban-nomor-5-tahun-2024.json` (mutu 0,999). Sekali, ulang bila peraturan berubah.
- Aturan: pengurai kode `PB.\d\d` menghasilkan nama, definisi, jenis, level 1-5 dengan indikator; level minimum per jenjang bawaan Pertama 2, Muda 3, Madya 4, Utama 5, Pranata Pemula 1 sampai Penyelia 4 [asumsi] sampai standar PermenPANRB tersedia.
- Layar: tab "Kompetensi" di halaman jf: cari kompetensi, lihat level.
- Terima: 58 kode terurai, tiap kode 5 level.
- Bergantung: tidak ada.

**JF-2. Hitung kebutuhan formasi JF per instansi (F2)** `riset/6` §7.4
- Masalah dan bukti: Pasal 122 huruf d Perban 11/2025 (rekomendasi formasi) dan Pasal 53 Perban 4/2025 (kebutuhan 5 tahunan) butuh tata cara hitung yang belum terbit.
- Pengguna dan keputusan: Pusbin JF, BPBD; usulan formasi per jenjang.
- Masukan: `dibi_kab_tahun.json`, `terpapar.json`, `public/data/bnpb/desa`, aktivasi posko dari data Dalops; norma waktu per kegiatan bawaan di JSON.
- Aturan: kebutuhan_jenjang = Σ (volume kegiatan tahunan x norma jam) / 1.250 jam kerja efektif; volume dari proksi (kaji cepat per kejadian, penyuluhan per desa rawan, pendampingan posko per aktivasi); norma bawaan berlabel "bawaan".
- Layar: tab "Formasi" di halaman jf dengan pengubah norma di peramban; ekspor CSV.
- Terima: label "usulan metode, bukan tata cara resmi".
- Bergantung: tidak ada data pribadi; kelas BPBD tidak dipakai.

### 6.23 Sistem F3 (ringkas)

Syarat mulai harus terpenuhi dan pemilik setuju. Rinciannya di riset yang ditunjuk.

| ID | Masalah | Data | Rumus atau aturan inti | Syarat mulai |
| --- | --- | --- | --- | --- |
| PERB-3 | Bukti IKD daerah tidak sesuai ketentuan (LAKIP hal. 20, 79) | JDIHN (MB-3), PSPB-1, korpus JDIH | per indikator berbasis dokumen: ditemukan, tidak ditemukan, tidak bisa dicek; tidak pernah memberi skor | daftar 71 indikator IKD 2025 tersedia; MB-3 jalan |
| SPB-2 | Interoperabilitas aplikasi BNPB "sangat rendah" (Renstra W27) | isian `/pendataan` (`pdt_isian`, `migrations/0060_pendataan.sql`), CKAN, PUS-3 | graf sistem ke data ke sistem; celah = data diketik ulang di dua sistem | isian `/pendataan` cukup untuk ≥ 10 sistem |
| PUS-3 | Katalog Layanan TIK wajib (Perban 10/2025 Pasal 29), tanpa angka ketersediaan | probe HEAD dari Actions per 15 menit | ketersediaan = sukses / total; insiden = 2 gagal berturut; 403 = "diblokir" | persetujuan pemilik soal probe ke situs BNPB |
| PD-4 | Pokja konektivitas wajib mencatat sambungan data K/L (Perban 2/2024 Pasal 10 ayat (3)) | log penarik pipeline dan worker | putus bila umur data > 2 x periode terbit; % jam tersambung per sumber per bulan | rekap per jam di JSON, bukan tulis D1 per menit |
| KS-2 | Sistem informasi Destana wajib (Perban 7/2025 Pasal 20), tidak ditemukan | daftar Destana direktorat, `public/data/bnpb/desa/*.json`, `terpapar.json` | tingkat pratama, madya, utama; penilaian > 3 tahun = kedaluwarsa; indikator SNI 8357:2017 dikosongkan sampai teksnya ada | U10 (daftar Destana) |
| MT-4 | Rambu dan papan informasi wajib dievaluasi tahunan (Perban 3/2025) | foto bergeotag dari `/petugas` atau WA | status bersih, rusak, pindah per rambu | ada pihak lapangan yang mengisi (pola tabel 0 baris) |
| WIL-4 | DSP tanpa pemeriksaan silang dengan SK dan dampak | medan pendampingan Laphar (KPOD-3), berita, `status_darurat.json` | bendera: DSP tanpa SK ± 7 hari; nilai per jiwa di atas persentil 90 bila n ≥ 10; tenggat SPJ dari MB-2 | U8; tanpa nama orang, R2 internal |
| OJL-1 | Tidak ada alat lokasi gudang regional dan jam tempuh per kab | graf jalan OSM (`scripts/scrape/akses.py`, kini 9 provinsi), feri, kandidat gudang | p-median berkapasitas dengan cakupan ≤ 48 jam, greedy lalu tukar (Teitz-Bart); uji balik kejadian DIBI | graf diperluas ke 38 provinsi (`pipa-data`); daftar gudang (U10) |
| OJL-4 | Inventaris `/instansi` hanya kategori karhutla (`migrations/0031_inventaris.sql`) | Perka 17/2009 | kelengkapan per provinsi lawan standar | pemilik membuka `/instansi` untuk BPBD non-karhutla |
| RRI-2 | Praverifikasi hibah RR (Perban 4/2024 Pasal 15-16) manual | lembar usulan diunggah staf, jejak bahaya repo | lima tanda: SK cocok 3 tahun, titik dalam jejak ≤ 2 km, aset desa, nilai > 2 x median, kegiatan dilarang Pasal 5 | staf bersedia mengunggah; diolah di peramban saja |
| RRI-3 | Aset hasil hibah RR tidak dipantau terhadap bahaya baru | ekspor Aplikasi Mapping Aset (Format 15 Juklak 9/2024) | silang titik aset dengan paparan harian (`scripts/umum/paparan_bangunan.py`) | U10 (ekspor Mapping Aset) |
| RRS-2 | Tidak ada indikator pulih ekonomi yang murah | NASA Black Marble VNP46A3, Open Buildings | indeks = radiansi / median 12 bulan sebelum; pulih ≥ 0,95 tiga bulan; uji balik dengan plasebo, kriteria dikunci dulu | token Earthdata atas nama pemilik; lab lolos |
| KEU-2 | Realisasi unit 2025 timpang (Logpal 38,48%, Deputi RR 50,87%) | ekspor SAKTI bulanan, RPD DIPA | deviasi = |realisasi kum - RPD kum| / RPD kum; > 5% atau proyeksi < 90% ditandai | U9; skrip lokal |
| SDU-2 | Pegawai lapangan butuh bukti hadir untuk tukin (Pedoman 2/2024) | `/petugas` (`lp_absen`, `lp_logbook`, 0095-0097) | jumlah hari hadir di lokasi tugas per bulan, agregat | `/petugas` dipakai (`orang` > 0 baris) |
| SDU-3 | BMN berbasis profil risiko perlu dimutakhirkan | ekspor SIMAK-BMN, lapisan bahaya repo | skor bahaya per titik aset | pemilik menginginkan; lokasi aset staf saja |
| IRT-2 | Inspektorat III butuh sinyal untuk pengawasan tujuan tertentu | pipeline SDU-1 | skor kelompok paket dari lima sinyal (PenL non-darurat +2, berulang di atas ambang PL +2, diumumkan sesudah Oktober +1, swakelola honor besar +1, diubah berulang +1) | U9; pengecualian kode kegiatan darurat |
| IRT-3 | Register risiko wajib triwulanan (Juklak 17/2025) | target dan realisasi indikator, KEU-2 | celah = 1 - capaian / target proporsional; kemungkinan 1-5 dari celah, dampak 1-5 dari bobot indikator | kepastian SIM Manajemen Risiko resmi belum ada |
| DIK-2 | STTP elektronik (Perban 2/2025 Pasal 23) tanpa verifikasi | nomor STTP dan hash | cocok hash di klien, tanpa nama terang di D1 | keputusan Pusdiklat siapa penerbit nomor |
| DIK-3 | Evaluasi retensi dan kemanfaatan wajib (Pasal 13) | WA +3 dan +6 bulan | tiga pertanyaan, nomor di-hash | U11; persetujuan alumni di formulir |
| JF-3 | Aplikasi JF diamanatkan (Perban 4/2025 Pasal 52); tenggat nomenklatur 6 Agustus 2026 sudah lewat | rekap pejabat JF, alumni, sertifikat LSP | per pejabat: jenjang, status penyesuaian, JP tahun ini < 20 ditandai | kepastian tidak ada aplikasi resmi; data ASN di balik login, NIP di-hash |

### 6.24 Sistem T (ditunda)

| ID | Alasan ditunda |
| --- | --- |
| PSPB-2 | Siklus RPBD pertama menurut Perban 3/2026 belum berjalan dan butuh isian manusia; dibangun sesudah PSPB-1 terbukti dipakai |
| SPB-3 | Portal Literasi Sejarah Bencana resmi ada (129.000 pengguna) tetapi URL-nya tidak ditemukan untuk dibandingkan |
| PUS-4 | bnpb.go.id menolak pengambil otomatis; tanpa umpan rilis dari Pusdatinkom, ini menjadi isian manusia lagi |
| HUK-3 | MoU dan PKS tidak terbit dengan masa berlaku; cukup lewat `/kemitraan` dan `/direktori` |

---

## 7. Layar dan alur

### 7.1 Pintu `/bnpb/unit`

- Kartu per kelompok (Deputi Sistem dan Strategi, Pencegahan, Penanganan Darurat, Logistik dan Peralatan, RR, Sestama, Itama, Pusat), di dalamnya satu baris per unit: nama unit, jumlah sistem jadi lawan jumlah sistem di katalog, satu angka temuan terbaru (judul kartu teratas unit itu).
- Angka gagal dimuat = "belum ada data" (pola `public/bnpb/pintu.js`).
- Kartu pintu bukan kepala bagian sendiri; mengikuti `.ex.ex-std`.
- Masuk dari pintu `/bnpb` yang ada lewat satu kartu baru "Ruang Unit".

### 7.2 Halaman unit `/bnpb/unit/<kode>`

- Satu HTML untuk 22 unit (BT-3). `unit.js` membaca kode dari jalur, memuat daftar sistem unit dari `katalog.js`, lalu tiap kartu mengambil JSON-nya lewat `GET /api/unit/data/:nama`.
- Urutan kartu: tenggat MB-2 milik unit itu yang jatuh dalam 30 hari, lalu sistem F1, lalu F2. Sistem yang belum jadi tidak tampil kartu kosong; daftar "direncanakan" satu baris di bawah.
- Tiap kartu: pil kategori, judul kalimat temuan dengan angka `.hl`, tabel `.ex-tabel` penuh, label angka per kolom atau baris, tanggal data di pil. Tombol unduhan CSV atau pemilih bagian di kanan judul.
- Kartu yang mengizinkan konfirmasi (F2) memakai ketukan satu tombol "benar" atau "koreksi" per baris; koreksi membuka satu isian angka dan satu isian alasan.
- Halaman wil memakai pemilih direktorat (deretan pil penuh lebar, merata, berikon, label Bahasa Indonesia).
- Kerja berat (urut tabel panjang, render peta) lewat `nanti()` (`public/inti/nanti.js`) agar klik tidak membeku (K10).

### 7.3 Hubungan dengan layar yang sudah ada

Aturan: sistem yang memperbaiki data layar lama tampil di layar lama; halaman unit memuat satu kartu ringkas dengan tautan. Sistem baru tampil di halaman unit saja.

| Layar lama | Jalur | Sistem yang menyentuhnya | Di halaman unit |
| --- | --- | --- | --- |
| Pustaka hukum | `/bnpb/hukum` (`src/hukum.js`) | F0-1, HUK-1, SPB-1, HUK-2 | kartu ringkas dan tautan |
| Meja Kerja | `/meja` (`src/meja.js`, `public/bnpb/meja.js`) | F0-2, F0-3, KPOD-2, RRX-1, WIL-3, PSPB-1, KS-1 | kartu tenggat dan tautan |
| Kinerja BNPB | `/kinerja-bnpb` (`public/bnpb/kinerja.*`, `scripts/bnpb/iku.py`) | PERB-1, PERB-2, REN-1 | kartu di halaman unit, tautan ke panel IKU |
| Siaga | `/bnpb/siaga` (`scripts/bnpb/siaga.py`) | KS-4, MT-3 | kartu di halaman unit |
| Perencanaan | `/bnpb/perencanaan` | PLP-1, OJL-2 | kartu di halaman unit, tautan ke stok pra-musim |
| Dalops, logbook, dokumen | `/bnpb/dalops`, `/bnpb/logbook`, `/bnpb/dokumen` | KPOD-1, KPOD-3, PUS-2, WIL-1 | tautan dari halaman kpod dan wil |
| Pendataan | `/pendataan` | PUS-1, SPB-2 | kartu di halaman pus, tautan |
| Peringatan dan prediksi | `/peringatan`, `/prediksi` | PD-1, PD-3 | kartu di halaman pd; tombol di layar publik menunggu U2 |
| Tracker pemulihan | `/api/pusdalops/pemulihan*` di `/bnpb/operasi` | RRP-2 | daftar usulan di halaman rrp |
| Direktori | `/direktori` | DIK-4 | tautan profil |

### 7.4 Alur

1. Pipeline di Actions (`data.yml` harian atau workflow bulanan yang ada) menghitung, menjalankan self-check, mengunggah JSON ke R2 `unit/<nama>.json`.
2. Staf membuka `/bnpb/unit/<kode>`; rute memeriksa sesi staf dan `HALAMAN_STAF.unit`, mencatat buka (`catatHTML`), lalu mengirim HTML.
3. Kartu mengambil JSON lewat `GET /api/unit/data/:nama` (cache tepi pendek, sesi staf).
4. Bila kartu mengizinkan konfirmasi, ketukan staf dikirim ke rute tulis modul pemilik datanya (meja, pemulihan, akses_status), tercatat dengan `oleh` dan waktu.
5. Pipeline berikutnya membaca konfirmasi itu sebagai masukan (`sumber: isian`).

### 7.5 Gerbang halaman

Rute halaman unit menjaga dirinya sendiri: tamu dialihkan 303 ke `/admin/masuk?ke=` (pola `/pipa`, `src/sippa.js`). Alasannya: gerbang host centurisk97.id di `src/worker.js` (`halamanTerkunci` dan `stafPeran`) hanya meloloskan admin dan `operator_cc` untuk halaman terkunci di luar menu Pusdalops, sehingga staf lain akan terpental bila halaman unit mengandalkan gerbang itu. Pola `/bnpb/unit` ditambahkan ke pengecualian di `halamanTerkunci` yang sama dengan `/pipa`, dan `BNPB_BERSIH` mendapat entri `unit/unit` agar `/bnpb/unit/unit.html` dialihkan ke jalur bersih.

---

## 8. Privasi, keamanan, kuota D1, hak akses

### 8.1 Privasi

| Data | Perlakuan |
| --- | --- |
| Nama, NIP, telepon, tanggal lahir, alamat | tidak dipanen dan tidak disimpan; NIP dan nomor WA bila perlu dicocokkan disimpan sebagai hash (JF-3, DIK-3, PD-1) |
| Teks Laphar dan WA | yang disimpan kelas dan angka; teks bebas tidak di-commit (KPOD-3) |
| Tempat pengungsian kecil | rekap menyembunyikan tempat < 10 jiwa (WIL-2) |
| Layer ArcGIS per rumah | hanya agregat kab; titik per rumah tidak dipanen (RRP-1) |
| Survey123 penilaian awal | tidak dipanen; dilaporkan ke Pusdatinkom lewat pemilik (U6) |
| Draf LAKIP, LK, TLHP, SAKTI | tidak masuk repo, R2, atau D1 (U9); skrip lokal |
| Pengadaan dan DSP | tanpa nama penyedia dan nama orang; bahasa "sinyal" atau "kandidat", bukan tuduhan |

Gerbang `tests/agen/gerbang-privasi-unit.test.mjs` menolak kunci JSON keluaran bernama `nama`, `nip`, `wa`, `telepon`, `hp`, `tgl_lahir`, `alamat` di `scripts/bnpb/unit/**` dan menolak berkas keluaran Ruang Unit di `public/` selain `public/inti/jam_aturan.*` dan `public/data/bnpb/dit_wilayah.json`.

### 8.2 Keamanan

- Semua rute baru di `src/unit.js` (baca) dan rute tulis di modul pemilik datanya; tiap rute diperiksa `guard-api` (metode, sesi, validasi, laju) dan `security-reviewer`.
- `GET /api/unit/data/:nama`: `nama` dicocokkan ke daftar tetap `DATA_UNIT` di `src/unit.js`, bukan jalur bebas, supaya tidak bisa membaca kunci R2 lain.
- HTML lewat `halamanBnpbPublik(..., {pribadi: true})` (`src/bnpb.js`): CSP ketat, `no-store`, `noindex`.
- Teks dari data selalu lewat `textContent`, tanpa gaya atau skrip inline.
- Unggahan CSV DIK-1 (peran `unit`): ukuran dibatasi, diurai fungsi murni yang diuji.
- Kode sumber terbuka di repo publik; dokumentasi teknis per modul ditautkan untuk Unit TIK (U1). Secret tidak pernah masuk berkas yang dilacak git.

### 8.3 Kuota D1

Kuota Free produksi 5 juta baca per hari dan 100.000 tulis per hari, dipakai bersama seluruh situs. Pelajaran 28 Okt 2026: kueri cron yang memindai tabel memakan seluruh kuota dan menjatuhkan situs.

| Aturan | Penerapan |
| --- | --- |
| Layar tidak membaca D1 untuk angka | kartu membaca JSON R2; D1 hanya untuk konfirmasi dan jejak |
| Pipeline membaca D1 sekali sehari | ekspor kecil berindeks (contoh `peringatan`, `logbook_kejadian` untuk PD-1 dan PUS-2), bukan per kunjungan |
| Tidak ada cron baru di Worker | jadwal di Actions; Worker sudah memakai satu cron `* * * * *` (batas 5 jadwal akun) |
| Tabel baru kecil dan berindeks | `pengungsian_harian` 1 baris per tempat per hari; `akses_status`, `hibah_bast`, `diklat_angkatan` ratusan baris per tahun |
| Ukur sebelum dan sesudah | K8; D1 insights dicek tiap rilis |
| Migrasi bernomor mulai 0110 | idempoten, tidak menyunting migrasi yang sudah jalan, diperiksa `migrasi-idempoten`; migrasi produksi diterapkan pemilik |

### 8.4 Hak akses

| Jalur | Siapa | Dasar |
| --- | --- | --- |
| `GET /bnpb/unit`, `/bnpb/unit/<kode>` | admin, staf dengan peran di `SEMUA_PERAN` | `HALAMAN_STAF.unit` di `src/admin_halaman.js`, dijaga `tests/warga/unit.test.mjs` |
| `GET /api/unit/data/:nama` | sama | `stafOK`; berkas kelas terbatas `modAtauStaf` dengan daftar `DATA_UNIT_TERBATAS` (KA §8, KEAMANAN-PRIVASI §2.3) |
| Konfirmasi KPOD | `pusdalops`, `koordalops`, `pimpinan` | `PERAN_DALOPS` |
| Konfirmasi WIL | `pusdalops`, `koordalops`; provinsi dibatasi `staf.wilayah` bila terisi | `staf.wilayah` |
| Konfirmasi unit lain (F2) | `unit` (BT-2) | migrasi 0111 |
| Unggah CSV DIK-1 | peran `unit` | `modAtauStaf` (KA §8) |
| `operator_cc` | baca saja | pola `ai` di `HALAMAN_STAF` |
| Publik | tidak ada (U2) | prinsip §3.5 |

---

## 9. Risiko dan mitigasi

| No | Risiko | Dampak | Mitigasi |
| --- | --- | --- | --- |
| R1 | Kartu tidak dipakai, sama seperti meja yang 0 baris | Ruang Unit menjadi layar kosong lain | terisi sendiri dulu (D-5); K5 diukur; sistem tanpa pemakai sesudah 3 bulan tidak diperluas |
| R2 | Angka hitungan dibaca sebagai angka resmi | salah kutip di rapat atau ke K/L | label wajib per angka (MB-6), angka resmi pembanding di sampingnya, frasa "bukan IRB/IKD/KIB resmi" |
| R3 | Rapor membuat unit merasa dipermalukan | penolakan | staf saja (U2); kartu menulis temuan, bukan peringkat unit; KPOD-1 internal dulu |
| R4 | Sumber resmi berubah bentuk atau ditutup | pipeline salah diam-diam | gagal keras, pakai berkas terakhir dengan tanggal, label "basi" (K4); kamus kolom per sumber |
| R5 | Panen dianggap serangan atau melanggar syarat pakai | blokir atau teguran | sekali sehari, jeda 1 detik, User-Agent bernama, atribusi; izin tertulis diminta (U4, U5) |
| R6 | Pengurai pola meleset (pendampingan, berita, JDIH) | baris salah | uji 30-50 contoh berlabel tangan sebelum tayang; baris tak cocok ke antrean periksa; angka berita hanya lewat ketukan staf |
| R7 | Data pribadi bocor lewat berkas statis | pelanggaran PDP | keluaran di R2 bersesi (BT-1); gerbang privasi (K9); tidak ada berkas unit di `public/` |
| R8 | Kuota D1 habis | situs jatuh | §8.3; tidak ada kueri layar ke D1; K8 |
| R9 | Topik politis (DSP, pengadaan, TLHP) saat kasus KPK 2026 | risiko reputasi | WIL-4 dan IRT-2 di F3 (U8, U9), tanpa nama orang, bahasa sinyal |
| R10 | Ambang tanpa pasal dibaca sebagai aturan | keputusan salah | MB-2 memaksa label asumsi; gerbang menolak angka tertanam |
| R11 | Katalog JDIH lokal tidak lengkap (233 dokumen; beberapa juklak tanpa teks: 4/2024, 6/2024, 7/2024, 5/2024, 6/2023, 10/2023) | aturan tidak bisa dikutip | kunci tanpa teks berlabel asumsi; daftar dokumen yang dibutuhkan dimintakan lewat pemilik |
| R12 | Bangun ulang `meja_catatan` (BT-5) merusak tabel yang dirujuk `0028_pengingat.sql` | galat produksi | migrasi diuji SQL ROLLBACK dengan data dummy; produksi 0 baris sehingga salin data kecil; diterapkan pemilik |
| R13 | Model prioritas (MB-4) bias karena kapasitas raster bukan IKD | daerah salah dipilih | label proksi; bobot tampil; diganti IKD resmi bila U10 dijawab |
| R14 | Repo di iCloud Documents (berkas hidup lagi, git macet) | pipeline lokal (KEU-1, IRT-1, KPOD-3) gagal | skrip lokal menulis di luar folder iCloud; commit dengan path spesifik |

---

## 10. Catatan untuk sesi induk

Kontradiksi dan ketidakcocokan yang ditemukan:

1. **Gerbang host meloloskan hanya admin dan `operator_cc`** untuk halaman terkunci di luar menu Pusdalops (`src/worker.js`, pemanggilan `stafPeran` dengan `["operator_cc"]`). Halaman `/bnpb/unit` harus menjaga dirinya sendiri seperti `/pipa` (§7.5).
2. **Bentrok nama berkas.** `riset/3` W1 mengusulkan `public/bnpb/wilayah.{html,js,css}`, padahal `public/bnpb/wilayah.js` sudah ada sebagai pembantu daftar wilayah untuk logbook dan siaga. PRD menaruh layar WIL di `public/bnpb/unit/**` sesuai `KEPUTUSAN-AWAL.md` §6.
3. **F0-2 dan KPOD-2 tumpang tindih.** F0-2 memperbaiki ambang, KPOD-2 (F1) adalah berkas Jam Aturan. Tafsiran PRD: F0-2 membuat berkas MB-2 versi minimal berisi kunci yang dibetulkan beserta gerbangnya; KPOD-2 melengkapinya dan menambah kartu.
4. **Ukuran yang tidak cocok dengan fase.** Riset menilai MT-1 ukuran L (ekstraksi tabel 278 halaman) dan WIL-2 ukuran L (dua tabel D1, rute, pengurai WA), tetapi katalog menempatkan keduanya di F2 (ukuran M). Fase tidak diubah; perkiraan kerja di `TIKET.md` perlu memakai ukuran riset.
5. **Sistem F2 yang praktis kosong dengan bawaan.** PLP-3 bergantung pada daftar BAST (U10, bawaan tidak tersedia) dan WA (U11, bawaan belum); riset sendiri (`riset/4` Q2) membawa P3 ditunda tanpa daftar itu. IRT-1 di F2, tetapi bawaan U9 melarang D1 sehingga tidak ada layar produksi. PD-1 dan WIL-2 kehilangan komponen WA sampai U11. PRD menulis bagian yang menunggu sebagai "menunggu", tidak mengubah fase.
6. **OJL-2 (F2) bergantung pada OJL-1 (F3)** untuk gudang terdekat dan jam tempuh (`riset/4` O2). PRD menulis OJL-2 versi tanpa gudang asal.
7. **PD-3 menambah tombol ke `/peringatan` dan `/prediksi`** yang publik, padahal prinsip §3.5 staf saja. PRD menaruh tombol di halaman unit dan menunda layar publik ke U2.
8. **Jalur kinerja.** Riset menulis `/bnpb/kinerja`; rute sebenarnya `/kinerja-bnpb` (`src/bnpb.js`).
9. **Label peran.** `PERAN` di `src/staf.js` memberi label `koordalops` = "Koordinator Pusdalops"; dengan U3 bawaan, label layar Ruang Unit menulis "Dit. Koordalops" tetapi label di `/admin/akun` tetap. Perlu dipastikan apakah label `/admin/akun` ikut diganti.
10. **Jumlah sistem per fase cocok:** F1 15, F2 31, F3 20, T 4, sesuai `KEPUTUSAN-AWAL.md` §5.

Data yang tidak ditemukan atau belum diverifikasi:

- Titik API JDIHN belum diuji isinya (`riset/1` §6); MB-3 bisa berubah menjadi tugas `scraper-antibot`.
- Teks Juklak 4/2024, 6/2024, 7/2024, 5/2024, 6/2023, 10/2023, Perka 5/2012, Perka 20/2014 tidak ada di korpus lokal.
- Ambang Pengadaan Langsung menurut Perpres PBJ yang berlaku belum dicek (SDU-1).
- Format ekspor SAKTI, SIPTL, SIMHPNAS belum pernah dilihat (KEU-2, IRT-1).
- Daftar 37 data prioritas LAKIP Lampiran 9 dan Renstra Lampiran III belum diketik ke repo (PUS-1, SPB-1).
- Pengukuran "unit pemakai" (K5) mengandalkan `catatHTML` dipanggil dari rute halaman unit; sekarang `catatHTML` hanya dipanggil dari `layaniHTML` (`src/worker.js` baris 729), jadi rute unit harus memanggilnya sendiri.

Asumsi yang diambil PRD ini:

- Satu HTML untuk 22 halaman unit (BT-3).
- Target K5 (6 dari 22 unit) dan K8 (≤ 1% kuota) adalah angka PRD, bukan keputusan pemilik; sesi induk boleh mengusulkan lain ke pemilik.
- Tanggal F1 dan F2 mengikuti ritme minggu kerja; tidak ada tenggat pemilik untuk Ruang Unit di dokumen mana pun yang dibaca.
