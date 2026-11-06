# KEAMANAN DAN PRIVASI Ruang Unit BNPB (`/bnpb/unit`)

Versi 1, 5 November 2026. Status: usulan, menunggu persetujuan sesi induk.

Urutan otoritas: `KEPUTUSAN-UNIT.md` (bila ada) > `KEPUTUSAN-AWAL.md` (KA) > `PRD.md` > `DESIGN-SYSTEM.md` (DS) > `DESAIN-TEKNIS.md` (DT) > `RENCANA-UJI.md` (RU) > berkas ini > `TIKET.md`. Berkas ini tidak menambah sistem, rute, atau tabel; ia menetapkan siapa boleh apa, data apa yang tidak boleh ada, dan apa yang diperiksa pengulas. Rujukan memakai nomor bagian (contoh "DT §4.9", "RU §7.1").

Pengulas wajib tiap perubahan yang menyentuh berkas ini: `security-reviewer` dan `guard-api` (AGENTS.md §6). Pengerja: `warga-api` untuk `src/**` dan `migrations/**`, `ruang-bnpb` untuk `public/bnpb/unit/**` dan `scripts/bnpb/unit/**`, `penulis-gerbang` untuk `tests/agen/**`, `mekanik-mesin` untuk workflow.

Semua rujukan kode diperiksa terhadap checkout 5 November 2026.

---

## 1. Pelaku dan cara masuk

| Pelaku | Bukti di Worker | Berkas | Catatan |
| --- | --- | --- | --- |
| Tamu | tanpa cookie sesi | - | tidak pernah melihat data atau tahu berkas ada |
| Akun pemirsa | cookie `sesi_pemirsa` | `src/pemirsa.js` | hanya tab yang diberikan; Ruang Unit bukan tab pemirsa |
| Staf berperan `direktori` saja | sesi staf, `hanyaDirektori()` | `src/staf.js:41` | `stafSesi` menganggapnya tidak bersesi; ditolak di semua rute kerja |
| Staf berperan `kemitraan` | sesi staf | `src/staf.js:20` | tidak masuk `P_UNIT_BACA` |
| Staf peran kerja lain (`verifikator`, `analis_konsesi`, `udara`, `tmc`) | sesi staf | `src/staf.js:20` | tidak masuk `P_UNIT_BACA` (DT §1.4). Lihat Catatan butir 1 |
| `operator_cc` | sesi staf | `src/staf.js:16-18` | baca saja |
| `unit` (peran baru, migrasi 0111) | sesi staf | DT §1.4, §2.2 | baca dan konfirmasi Ruang Unit |
| `pusdalops`, `koordalops`, `pimpinan` | sesi staf | `src/dalops.js:9` `PERAN_DALOPS` | baca dan konfirmasi |
| Staf berwilayah | `staf.wilayah` tidak kosong | `src/staf.js:66-70` | tulis yang membawa `prov` dibatasi ke wilayahnya |
| Akun instansi BPBD aktif | sesi akun instansi | `src/instansi.js` | hanya `POST/GET /api/pengungsian/*` kab miliknya (DT §6.15) |
| Akun gerbang situs | `AKUN_SITUS*` lewat `adminOK` | `src/worker.js:438-439` | lolos `stafOK`; ditolak `modOK` (`src/posko.js:44-47`). Lihat §2.3 |
| Moderator (token `ADMIN_TOKEN`, sesi admin) | `modOK` | `src/posko.js:44` | semua baca, unggah CSV DIK-1 |
| Super Admin | `superOK` + secret `SUPER_ADMIN` | `src/posko.js:48` | membuat akun staf, memberi peran |
| Mesin (GitHub Actions) | `CLOUDFLARE_API_TOKEN` | `.github/workflows/data.yml` | menulis R2 `unit/`, membaca D1 berindeks lewat `wrangler d1 execute` (DT §2.3) |
| Mesin pemilik (lokal) | - | `scripts/bnpb/unit/keu1.py`, `irt1.py` | satu-satunya tempat data internal KEU-1, IRT-1 diolah (U9) |

Masuk staf memakai sesi yang sudah ada (cookie `sesi_staf` HttpOnly Secure SameSite=Lax, hanya hash di D1, umur 30 hari, `src/staf.js:16, 77`). Kiriman bukan GET wajib header `x-pb: 1` (`src/staf.js:47`) dan lolos `tolakOrigin` (`src/worker.js:649`). Ruang Unit tidak membuat sistem akun, sandi, atau kode tautan baru.

---

## 2. Matriks hak

Singkatan: B = baca, T = tulis, `-` = ditolak. Kolom "Kerja lain" = `verifikator`, `analis_konsesi`, `udara`, `tmc`, `kemitraan`, `direktori`. Kolom "Dalops" = `pusdalops`, `koordalops`, `pimpinan`.

### 2.1 Rute

| Rute (DT §4.9, §6.15) | Tamu, pemirsa | Kerja lain | `operator_cc` | `unit` | Dalops | BPBD | Akun gerbang | Moderator |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /bnpb/unit`, `/bnpb/unit/:kode` | 303 ke layar masuk | 403 polos | B | B | B | - | B | B |
| `GET /api/unit/indeks` | 401 | 401 | B | B | B | - | B | B |
| `GET /api/unit/data/:nama` kelas S (§3) | 401 | 401 | B | B | B | - | B | B |
| `GET /api/unit/data/:nama` kelas T (§3) | 401 | 401 | B | B | B | - | **-** (§2.3) | B |
| `GET /api/unit/ketuk?berkas=` | 401 | 401 | B | B | B | - | B | B |
| `POST /api/unit/ketuk` | 401 | 401 | **-** | T | T | - | - | T |
| `POST /api/unit/akses` (RRI-1) | 401 | 401 | - | T | T | - | - | T |
| `POST /api/unit/hibah/:id/lapor` (PLP-3) | 401 | 401 | - | T wilayahnya | T wilayahnya | - | - | T |
| `POST /api/unit/diklat/unggah` (DIK-1) | 401 | 401 | - | T | T | - | - | T |
| `GET /api/unit/diklat/ringkas` | 401 | 401 | B | B | B | - | B | B |
| `POST /api/pengungsian/tempat`, `/harian` (WIL-2) | 401 | 401 | - | T wilayahnya | T wilayahnya | T kabnya | - | T |
| `GET /api/pengungsian/kab?kab=` | 401 | 401 | B | B wilayahnya | B wilayahnya | B kabnya | - | B |
| `/api/meja/*` (F0-2, F0-3) | tidak berubah dari `src/meja.js` | | | | | | | |

Aturan tetap untuk tiap baris:

1. Hak diperiksa sebelum validasi nama, sebelum R2, sebelum D1 (DT §1.2 butir 4). Tamu yang meminta nama berkas yang tidak ada mendapat jawaban yang sama dengan nama yang ada.
2. Sesi sah tanpa peran mendapat 403 polos "Akunmu tidak punya akses Ruang Unit", tanpa pengalihan (DT §1.4, dijaga `tests/warga/admin-403-pantul.test.mjs`).
3. Metode lain dijawab 405 dengan `allow`.
4. Tiap sel `-` adalah satu uji "peran salah DITOLAK" di `tests/warga/unit.test.mjs` (RU §7.4 S1-S8 ditambah `operator_cc` tulis).

### 2.2 Layar

| Layar | Isi yang terlihat | Siapa |
| --- | --- | --- |
| Pintu `/bnpb/unit` | kartu per kedeputian, pil basi (DT §9.4) | `P_UNIT_BACA` |
| `/bnpb/unit/<kode>` 22 kode | kartu F1 dan F2 unit itu (G-6 butir f menolak kartu F3 dan T) | `P_UNIT_BACA` |
| `/bnpb/unit/keu` (KEU-1) | hanya cara pakai skrip lokal; tanpa angka | `P_UNIT_BACA` |
| `/bnpb/unit/irt` (IRT-1) | hanya cara pakai skrip lokal; tanpa temuan, tanpa unit yang disebut | `P_UNIT_BACA` |
| `/bnpb/unit/sdu` (SDU-1) | rapor agregat dan "kandidat konsolidasi" (kelas T) | `P_UNIT_BACA` tanpa akun gerbang |
| `/bnpb/unit/kpod` (KPOD-1, KPOD-2, KPOD-3) | rapor intervensi (kelas T), Jam Aturan (P), antrean ragu Laphar (S) | `P_UNIT_BACA`; kartu rapor tanpa akun gerbang |
| `/bnpb/unit/wil` tab pengungsian | rekap kab; tempat < 10 jiwa tidak ditampilkan per tempat | `P_UNIT_BACA`, dibatasi wilayah staf |
| Isian pengungsian di `public/instansi_*` | 11 angka per tempat per hari | akun BPBD kabnya |
| WIL-4, IRT-2, IRT-3, KEU-2 | tidak ada layar (F3) | - |
| Publik (tanpa sesi) | tidak ada (U2) | - |

Cangkang HTML tidak memuat data (DT §10 butir 14). Data selalu datang lewat rute di §2.1.

### 2.3 Akun gerbang situs

`stafOK` = `adminOK` ATAU sesi staf berperan (`src/staf.js:64`), dan `adminOK` menerima akun gerbang `AKUN_SITUS*` (`src/worker.js:438-442`). Akun gerbang dibagikan untuk melihat situs (pola panel presiden), bukan untuk kerja internal. Akibatnya rute yang hanya memakai `stafOK` membuka data staf kepada pemegang akun gerbang. Pola ini sudah ada di `src/dalops.js:13`.

Ketetapan untuk Ruang Unit:

1. Berkas kelas S (§3) boleh dibaca akun gerbang, sama dengan Dalops hari ini.
2. Berkas kelas T dan semua rute tulis memakai `modAtauStaf(env, req, P_...)` (`src/staf.js:65`), yang menolak akun gerbang (`modOK`, `src/posko.js:44-47`). Daftar kelas T ada di konstanta `DATA_UNIT_TERBATAS` di `src/unit.js`, bersebelahan dengan `DATA_UNIT`.
3. Uji: akun gerbang meminta `unit/pengadaan.json` mendapat 401; meminta `unit/stok_penyangga.json` mendapat 200.

---

## 3. Klasifikasi data

| Kelas | Arti | Tempat yang boleh | Penjaga |
| --- | --- | --- | --- |
| P | publik: teks peraturan, agregat yang sudah publik | `public/` | gerbang G-5 butir a tetap berlaku |
| S | staf: agregat tanpa data pribadi, hitungan kita atas sumber resmi terbuka | R2 `unit/` lewat `stafOK(P_UNIT_BACA)` | DT §4.9 |
| T | terbatas: agregat yang bisa dibaca sebagai penilaian unit atau pihak, atau berisi id isian manusia | R2 `unit/` lewat `modAtauStaf`, atau D1 dengan hak wilayah | §2.3, §9 |
| L | lokal saja: data internal BNPB atau data bernama | mesin pemilik, di luar git, di luar folder iCloud; tidak R2, tidak D1 | G-5 butir c, U9 |
| X | dilarang: tidak dipanen dan tidak disimpan di mana pun | - | §4 |

### 3.1 Berkas `public/`

| Berkas | Kelas | Alasan |
| --- | --- | --- |
| `public/inti/jam_aturan.js`, `public/inti/jam_aturan.json` | P | teks dan angka pasal peraturan (DT §1.2 butir 1) |
| `public/data/bnpb/hukum/katalog.json` (kunci `konflik` baru) | P | sudah publik |
| `public/data/laphar_riwayat.json` (medan `pendampingan` sebagai kelas kata kunci) | P | sudah publik dan agregat; teks pendampingan penuh tidak masuk (DT §5.6) |
| `public/data/bnpb/dit_wilayah.json` | P | pembagian provinsi per direktorat menurut Perban 11/2025 |
| berkas lain keluaran `scripts/bnpb/unit/**` di `public/` | X | ditolak G-5 (PRD §8.1) |

### 3.2 Berkas R2 `unit/`

| Berkas | Sistem | Kelas | Catatan |
| --- | --- | --- | --- |
| `indeks.json` | semua | S | nama berkas, waktu, galat satu baris; tanpa jalur lokal atau URL bertoken |
| `status_peraturan.json` | MB-1, HUK-1 | S | |
| `jdih_daerah.json` | MB-3 | S | judul dan tanggal dokumen daerah saja |
| `pendampingan_ikd.json` | PERB-1 | S | label "bukan IRB resmi" |
| `satu_data.json` | PUS-1 | S | rapor per produsen data, lihat §9.4 |
| `kalender_gladi.json`, `kalender_monev.json`, `jam_pascabencana.json`, `kampanye.json` | KS-4, REN-3, RRX-1, MT-3 | S | |
| `stok_penyangga.json`, `prepositioning.json`, `klaster_logistik.json` | PLP-1, OJL-2, OJL-3 | S | `klaster_logistik.json` tanpa nama dan nomor PIC anggota |
| `fasilitas_sosial.json`, `evakuasi.json`, `cakupan_ews.json` | RRS-3, KS-3, PD-2 | S | atribusi OSM |
| `rb.json` | REN-1 | S | |
| `kompetensi.json`, `formasi_jf.json` | JF-1, JF-2 | S | tanpa nama pejabat JF |
| `kerugian.json`, `rugi_tani.json`, `neraca_rumah.json`, `akses_putus.json` | PERB-2, RRS-1, RRP-1, RRI-1 | S | agregat kab; `akses_putus.json` memuat titik ruas jalan atau jembatan, bukan rumah |
| `rpbd.json`, `dokumen_siaga.json`, `peta_nspk.json`, `amanat.json`, `sendai.json` | PSPB-1, KS-1, SPB-1, HUK-2, PSPB-3 | S | |
| `mitigasi_prioritas.json`, `hibah_prioritas.json`, `diklat_sasaran.json`, `dana_bersama_katalog.json` | MT-2, PLP-2, DIK-1, MT-1 | S | label "daftar pendek" untuk PLP-2 |
| `meja_wilayah.json` | WIL-1 | S | |
| `kib_cocok.json` | PUS-2 | S | agregat, tanpa teks bebas logbook |
| `rapor_peringatan.json` | PD-1 | S | |
| `belanja_risiko.json` | REN-2 | S | agregat per kab, tanpa nama penyedia |
| `usulan_laphar.json`, `usulan_rpbd.json`, `usulan_dokumen_siaga.json`, `usulan_pemulihan.json` | MB-7 | S | baris usulan dari dokumen; medan nama orang dibuang pengurai sebelum ditulis |
| `ikk.json` | RRP-3 | S | angka BPS |
| `pengajar.json` | DIK-4 | T | calon pengajar; lihat §4 butir 12 |
| `pengadaan.json` | SDU-1 | T | agregat, tanpa nama penyedia, bahasa §9.3 |
| `rapor_darurat.json` | KPOD-1 | T | penilaian intervensi per direktorat wilayah; internal dulu (PRD §9 R3) |
| `pasca_hibah.json` | PLP-3 | T | kewajiban per pemda penerima; bisa dibaca sebagai teguran |
| `pengungsian.json` | WIL-2 | T | rekap; tempat < 10 jiwa tidak per tempat (RU §7.1 butir e) |

Berkas yang ditambah ke `DATA_UNIT` kelak wajib masuk tabel ini di commit yang sama; bila tidak tercatat, kelasnya T.

### 3.3 Tabel D1 baru (DT §2.2)

| Tabel | Kelas | Data pribadi | Hak tulis | Retensi |
| --- | --- | --- | --- | --- |
| `unit_ketuk` | T | tidak; `oleh` = `staf:<id>` | `P_UNIT_TULIS` | tetap (jejak keputusan, hanya ditambah, trigger beku) |
| `akses_status` | S | tidak | `P_UNIT_TULIS` | tetap, hanya ditambah |
| `hibah_bast` | T | tidak; barang, jumlah, pemda | impor skrip pemilik; `tgl_lapor` lewat rute | tetap |
| `diklat_angkatan` | S | tidak; jumlah peserta, bukan nama | `P_UNIT_TULIS` CSV | tetap |
| `pengungsian_tempat` | T | tidak; nama tempat, desa, koordinat tempat | staf wilayah, BPBD kabnya | 2 tahun sesudah `tutup`, lalu koordinat dibulatkan 2 desimal (usulan, Catatan butir 4) |
| `pengungsian_harian` | T | tidak; angka terpilah, tanpa nama | staf wilayah, BPBD kabnya | sama |
| `staf` (peran `unit` baru, 0111) | T | ya: nama, NIP, email, WA (`src/staf.js:21`) | Super Admin | tidak berubah; tidak pernah dibaca Ruang Unit selain lewat `stafOK` |

Tidak dibuat (U9, DT §2.2): `tlhp_rek`, `anggaran_bulan`, `ews_umpan`. G-5 menolak tabel berawalan `tlhp_` (RU §9 butir 9).

### 3.4 Lokal saja (kelas L)

| Data | Skrip | Keluaran | Aturan |
| --- | --- | --- | --- |
| Draf LAKIP dan LK | `scripts/bnpb/unit/keu1.py` | markdown selisih di luar repo | `python3 -I`, keluaran di luar folder iCloud |
| Ekspor TLHP (SIPTL, SIMHPNAS, rekap Excel TU Itama) | `scripts/bnpb/unit/irt1.py` | `tlhp_<tanggal>.html` di luar repo | butuh izin Inspektur Utama (riset/6 I1) |
| Ekspor SAKTI (KEU-2, F3) | belum ada | - | U9 |
| Cache SIRUP/SPSE yang memuat nama penyedia | `docs/pendanaan/sirup_tarik.py`, `data/raw/unit/` | cache Actions dan mesin pemilik | nama penyedia tidak pernah keluar dari cache (§4 butir 6) |
| PDF Laphar dari WA | `scripts/wa/otomatis.mjs` | `data/raw/laphar/hari/*.json` (gitignored, `.gitignore:2`) | PDF memuat nama petugas; tidak di-commit |

`data/raw/*` sudah di-gitignore (`.gitignore:2`); `data/raw/hukum/teks/` juga tidak dilacak (hanya `indeks.json`).

---

## 4. Data yang dilarang dipanen atau disimpan

| No | Data | Asal | Gerbang |
| --- | --- | --- | --- |
| 1 | Layer Survey123 "perangkat penilaian awal" (nama, kontak, tanggal lahir responden, terbuka publik) | `gis.bnpb.go.id/.../survey123/perangkat_penilaian_awal_final/FeatureServer/10` (riset/5 baris 49) | `DILARANG` di `scripts/bnpb/unit/panen.py` menolak `survey123` sebelum tiap permintaan (DT §4.8 `cek()`); G-5 butir b menolak `perangkat_penilaian_awal` di skrip. Dilaporkan pemilik ke Pusdatinkom (U6) |
| 2 | Layer ArcGIS bertitik per rumah atau per orang, foto geotag | `gis.bnpb.go.id` | `arcgis_agregat` selalu `returnGeometry=false` dan `outFields` daftar putih; G-5 butir b menolak `outFields=*` |
| 3 | Nama pengungsi | Juknis 9/2023 | tidak ada kolom; G-5 butir a menolak `nama_pengungsi` |
| 4 | Kontak koordinator tempat pengungsian (diminta Juknis 9/2023 hal. 17) | isian BPBD, WA | tidak ada kolom (riset/3 pertanyaan 4, bawaan "tidak disimpan"); G-5 butir a menolak `nama_koordinator`, `hp`, `wa`, `telepon` di migrasi 0113 |
| 5 | Nama dan nomor PIC anggota Klaster Logistik | `inalogpal.bnpb.go.id/Api/get_instansi_survey` | `DILARANG` (DT §8) |
| 6 | Nama penyedia SIRUP dan SPSE di keluaran | SIRUP, SPSE | `sdu1.py` membuang kolom penyedia sebelum menulis; G-5 butir a menolak kunci `nama_penyedia` |
| 7 | Nama orang dalam konteks DSP (pejabat, petugas, penerima, rekanan) | Laphar medan pendampingan, berita | pengurai menyimpan kelas kata kunci, bukan teks (DT §5.6, §6.13); WIL-4 tidak dibangun (F3, U8) |
| 8 | Nama petugas di PDF Laphar | WA | PDF tidak masuk repo; fixture uji dibersihkan (DT §5.6) |
| 9 | Temuan audit dan nama pejabat TLHP | Itama | kelas L; G-5 butir c memeriksa pola `.gitignore` untuk masukan KEU-1 dan IRT-1 |
| 10 | NIK, NIP terang, nomor WA terang, tanggal lahir, alamat rumah, email pribadi | semua | G-5 butir a (regex kolom dan kunci, RU §7.1); butir d (WA hanya hash bergaram secret) |
| 11 | Data staf dari tabel `staf` (nama, NIP, WA) di keluaran Ruang Unit | D1 | `oleh` menyimpan id, bukan nama (DT §9.2 butir 1); kueri Actions tidak membaca `staf` |
| 12 | Nama pakar di `unit/pengajar.json` | `/akademisi`, `/direktori` | berkas menyimpan id profil dan skor; layar mengambil nama lewat rute Direktori yang sudah dijaga. Pengecualian Direktori (tanpa orang terkait kasus KPK, tanpa yang meninggal) dipakai dari daftar yang sama (DT §6.30) |
| 13 | Halaman `bnpb.go.id/berita` lewat pengambil otomatis | bnpb.go.id | 403 dihormati, tidak dihindari; `DILARANG` |
| 14 | Dapodik massal | Kemendikdasmen | belum ada izin; `DILARANG` |
| 15 | Teks bebas staf berisi data pribadi | `unit_ketuk.koreksi`, `catatan` | `koreksi` hanya kunci medan berkas itu (daftar putih per berkas), `catatan` 200 huruf (DT §9.2 butir 6) |

Penjaga mekanis ada tiga lapis, semuanya wajib:

1. **Sebelum permintaan:** `DILARANG` di `panen.py`, diuji `--cek` (DT §4.8).
2. **Sebelum terbit:** G-5 `tests/agen/gerbang-privasi-unit.test.mjs` (RU §7.1), jalan tiap push.
3. **Di skema:** CHECK tanpa kolom bebas untuk data pribadi; G-5 butir a membaca migrasi 0110 ke atas.

---

## 5. Kepatuhan UU 27/2022 tentang Pelindungan Data Pribadi

Teks UU 27/2022 tidak ada di korpus `data/raw/hukum/teks/` (korpus JDIH BNPB). Nomor pasal di bawah wajib dicek ke teks resmi sebelum dikutip di layar atau surat (Catatan butir 2).

| Kewajiban | Penerapan di Ruang Unit |
| --- | --- |
| Pemrosesan terbatas dan spesifik, sesuai tujuan (Pasal 16 ayat 2) | Ruang Unit tidak memproses data pribadi subjek luar. Satu-satunya data pribadi yang disentuh adalah identitas staf untuk sesi, dan itu milik modul akun (`src/staf.js`), bukan Ruang Unit |
| Dasar pemrosesan (Pasal 20) | sesi staf: pelaksanaan tugas dan kewenangan BNPB. Ruang Unit tidak meminta persetujuan karena tidak mengumpulkan data pribadi baru |
| Data pribadi spesifik (Pasal 4 ayat 2: kesehatan, biometrik, anak, keuangan pribadi) | tidak ada. Angka pengungsi terpilah (balita, hamil, disabilitas) disimpan sebagai jumlah per tempat, tidak terhubung ke orang |
| Minimisasi | §4; rekap pengungsian < 10 jiwa disembunyikan per tempat supaya tempat keluarga kecil tidak bisa dikenali |
| Retensi | §3.3; jejak keputusan tetap karena tidak memuat data pribadi |
| Hak subjek (akses, koreksi, hapus) | tidak berlaku untuk data agregat. Untuk staf: mengikuti modul akun |
| Kegagalan pelindungan: pemberitahuan tertulis paling lambat 3 x 24 jam (Pasal 46) | §11 langkah 4 |
| Pengendali dan prosesor | Pengendali: BNPB. Centurisk97 berjalan di Cloudflare (pihak ketiga); lihat §6 tentang Perban 10/2025 Pasal 26 |

Kebocoran pihak lain yang ditemukan saat riset (Survey123, §4 butir 1) tidak diperbaiki oleh kita dan tidak dipanen. Pemilik menyampaikan ke Pusdatinkom sebagai Unit TIK (U6). Berkas ini tidak menyimpan URL lengkap layer itu di layar mana pun.

---

## 6. Perban 10/2025 tentang Tata Kelola TIK

Teks dibaca dari `data/raw/hukum/teks/perban-nomor-10-tahun-2025.json` (halaman 13-16).

| Pasal | Isi (diringkas, kecuali kutipan) | Akibat untuk Ruang Unit |
| --- | --- | --- |
| Pasal 1 angka 4 dan 14 | Unit TIK = unit yang menyelenggarakan tata kelola TIK; Pihak Eksternal = pihak di luar BNPB yang berkaitan dengan TIK di BNPB | bawaan U1: Centurisk97 diperlakukan sebagai hasil Pihak Eksternal |
| Pasal 24 ayat (3) | hasil pengembangan berupa kode sumber dan dokumentasi | dokumen `data/kajian-bnpb/kedeputian/*.md` adalah dokumentasi resmi modul |
| Pasal 24 ayat (4) | "Dalam hal hasil pengembangan Sistem Informasi dihasilkan oleh Pihak Eksternal, Kode Sumber (source code) dan dokumentasi Sistem Informasi harus diserahkan kepada Unit TIK." | paket serah per fase: tautan repo pada commit tertentu, daftar berkas modul (`src/unit.js`, `src/pengungsian.js`, `migrations/0110-0113`, `scripts/bnpb/unit/**`, `public/bnpb/unit/**`, `tests/**` terkait), dokumen di folder ini, perintah uji (RU §1.3). Kartu tiap sistem menautkan skripnya (DT §9.1) |
| Pasal 24 ayat (5) | pengembangan wajib menjaga kerahasiaan data, informasi, dan kredensial pengguna lewat perjanjian kerahasiaan | repo publik tidak memuat data atau kredensial (§7). Perjanjian kerahasiaan antara pengembang dan BNPB adalah urusan pemilik (Catatan butir 3) |
| Pasal 24 ayat (6) dan (7) | Unit TIK memberi kredensial kepada Pihak Eksternal dan menghapusnya saat masa pengembangan berakhir | akun staf dibuat Super Admin, bukan Unit TIK. Bila U1 dijawab ya, daftar akun Super Admin dan secret Cloudflare masuk paket serah sebagai nama (bukan nilai) |
| Pasal 26 ayat (7) dan (8) | bila pusat data BNPB tidak mencukupi, Unit TIK dapat memakai pusat data pihak ketiga, dikoordinasikan Unit TIK dengan pertimbangan Komite TIK | D1 dan R2 di Cloudflare adalah pusat data pihak ketiga. Belum ada koordinasi tertulis; masuk paket serah sebagai butir terbuka |
| Pasal 28 ayat (4) dan (5) | Pengguna dan Pihak Eksternal menjalankan pengendalian keamanan informasi dari Unit TIK: hak akses, akun dan kata sandi, pengamanan aset informasi | matriks §2 adalah pengendalian hak akses modul ini; akan disesuaikan bila Unit TIK menetapkan standar |

---

## 7. Repo publik

1. **Tidak ada data staf di git.** Keluaran pipeline ditulis ke `/tmp/unit/` lalu R2, tidak di-commit (DT §1.2 butir 2). Riwayat antarhari di `actions/cache`, bukan git.
2. **Log prompt pemilik** `.claude/ilmu-agent/prompt/<bulan>.jsonl` ikut di-commit dan hanya dijaga `samarkan()` (`scripts/agents/ilmu.mjs:324`: daftar `SAMAR` untuk email, nomor, token, dan sidik kata mitra `SIDIK_MITRA`). Melemahkan `samarkan()` haram (AGENTS.md §1.5). Prompt yang menyebut temuan TLHP, nama pejabat, atau isi DSP tetap tersamar sebagian saja (nama orang tidak disamarkan otomatis), jadi bahasan tentang IRT-1, WIL-4, dan SDU-1 yang menyebut orang tidak diketik di prompt; pakai id unit atau kode kejadian.
3. **Fixture uji** dari dokumen nyata (Laphar, berita, lampiran Keputusan Deputi) dibersihkan dari nama sebelum masuk `tests/` (DT §9.2 butir 5). G-5 butir a ikut memindai `tests/bnpb/fixtures/unit_*` dan `tests/wa/fixtures/`.
4. **Secret** (`CLOUDFLARE_API_TOKEN`, `BPS_KEY`, `IP_SALT`, `ADMIN_TOKEN`, `AKUN_SITUS*`) hanya di GitHub secrets dan secret Worker. Kunci BPS pemilik ada di Keychain (`bps-webapi`), belum GitHub secret (DT §2.3).
5. **iCloud.** Repo di iCloud Documents; berkas yang dihapus bisa hidup lagi. Skrip lokal kelas L menulis keluaran di luar folder repo. Commit dengan path spesifik, bukan `git add -A` (AGENTS.md §3.3).
6. **Salinan nyasar** `* 2.*` tidak dipakai (AGENTS.md §9); `higiene-repo` memeriksanya sebelum commit besar.

---

## 8. Sumber resmi terbuka

Bawaan U4 dan U5: boleh dipanen sekali sehari (JDIHN bulanan), agregat saja, tampil di layar staf saja sampai ada izin tertulis unit pemilik data.

| Aturan | Isi | Tempat |
| --- | --- | --- |
| Identitas | User-Agent `Centurisk97/1.0 (+https://centurisk97.id; kontak: alamat EMAIL_TO di wrangler.jsonc)` | DT §8 |
| Jeda | 1 detik antarpermintaan per sumber; coba ulang 3 kali (2, 4, 8 detik), lalu gagal keras dengan URL dan kode HTTP | DT §4.8 |
| Frekuensi | harian untuk CKAN, ArcGIS, INALOGPAL; bulanan untuk SIRUP, SPSE, JDIHN | DT §8 |
| Cache | 20 jam (harian), 30 hari (bulanan); cache segar tidak memanggil jaringan | DT §4.8 |
| Atribusi | tiap keluaran memuat `sumber: [{nama, url, diambil, lisensi}]`; layar menaruhnya di `data-sumber` dan `title` (KA prinsip 3, DS §5.2.1) | G-4 butir b, c |
| Penolakan dihormati | 401, 403, 429, atau `robots.txt` yang melarang: berhenti untuk sumber itu di jalan itu, berkas lama dipertahankan dengan label basi. Tidak ada pergantian User-Agent, peramban tanpa kepala, proxy, atau pemecah CAPTCHA | `panen.py`; `security-reviewer` |
| Beban | perkiraan per hari: CKAN sekitar 5 permintaan (`package_search` 1.000 baris per halaman), ArcGIS sekitar 40 kueri agregat, INALOGPAL 4 titik; per bulan: JDIHN dan situs JDIH provinsi sekitar 552 pemda x beberapa halaman dengan jeda 1 detik (sekitar 1 jam), SIRUP lewat skrip yang ada | angka dari daftar titik DT §8; dihitung ulang di `GITHUB_STEP_SUMMARY` tiap jalan |

**Bila unit pemilik data menolak** (surat, pesan, atau balasan teknis seperti blokir IP):

1. Pemilik program mencatat penolakan dan tanggalnya di `KEPUTUSAN-UNIT.md`.
2. Pola URL sumber itu masuk `DILARANG` di `panen.py` pada hari yang sama; `--cek` menambah kasus yang membuktikan permintaan ke pola itu ditolak.
3. Berkas R2 yang hanya berasal dari sumber itu dihapus (`npx --yes wrangler@4.42.0 r2 object delete poskokarhutla-foto/unit/<nama>.json --remote`) dan dikeluarkan dari `DATA_UNIT`. Berkas campuran ditulis ulang tanpa komponen itu.
4. Kartu menampilkan "sumber dihentikan atas permintaan pemiliknya" dengan tanggal, bukan angka kosong yang tampak nol.
5. Cache di `data/raw/unit/<sumber>/` dihapus dari cache Actions pada jalan berikutnya.
6. Tidak dicari jalan lain ke data yang sama (situs cermin, ekspor pihak ketiga) tanpa izin baru.

Blokir teknis tanpa pesan (403 yang tiba-tiba) diperlakukan sama dengan penolakan sampai pemilik bertanya ke unit pemilik data. `scraper-antibot` tidak dipakai untuk sumber BNPB sendiri.

---

## 9. Sensitivitas khusus

Kasus KPK atas pengadaan berbasis DSP berjalan sejak Oktober 2026 (riset/3 baris 16 dan 74). Layar yang menyentuh DSP, pengadaan, dan pengawasan bisa dibaca sebagai tuduhan terhadap unit atau orang. Aturan di bawah berlaku untuk teks layar, nama kunci JSON, judul kartu, berkas keluaran, pesan commit, dan prompt.

### 9.1 Aturan bersama

1. Tidak ada nama orang, nama penyedia, atau nama pejabat. Satuan terkecil adalah unit kerja, kab/kota, kejadian, atau paket SIRUP lewat tautannya.
2. Hasil hitungan disebut "sinyal", "kandidat", "tanda periksa", atau "perlu dicek", tidak pernah "temuan", "pelanggaran", atau "penyimpangan".
3. Tiap sinyal membawa aturan pemicunya (pasal atau ambang berlabel asumsi) dan jalan keluar sahnya (contoh: penunjukan langsung sah untuk darurat).
4. Angka pembanding statistik hanya tampil bila n kejadian atau paket sejenis >= 10 (riset/3 W4).
5. Tidak ada peringkat unit kerja dari terburuk ke terbaik di kartu (PRD §9 R3).

### 9.2 Kalimat yang boleh dan tidak boleh

| Sistem | Boleh | Tidak boleh |
| --- | --- | --- |
| WIL-4 (F3, U8, tidak dibangun sekarang) | "DSP tanpa SK dalam rentang 7 hari: 3 kejadian, perlu dicocokkan dengan Sistala-DSP" | "DSP ilegal", "DSP tanpa dasar", "dana disalahgunakan", nama penerima atau pejabat |
| WIL-4 | "Nilai per jiwa-hari di atas persentil 90 kejadian sejenis (n = 14)" | "nilai tidak wajar", "mark-up", "kemahalan" |
| IRT-1 (lokal) | "Rekomendasi berumur lebih dari 60 hari dan belum sesuai: 12" | "unit X lalai", "pejabat yang belum menindaklanjuti", isi temuan |
| IRT-1 | "Calon TPTD (saran, penetapan oleh Inspektorat)" | "tidak dapat ditindaklanjuti" sebagai keputusan |
| IRT-2 (F3, lokal) | "Sinyal telaah: skor 4 dari 7, pemicu PenL di luar kode darurat dan paket berulang" | "indikasi korupsi", "pemecahan paket", "kolusi", "fiktif" |
| SDU-1 | "Kandidat konsolidasi: 5 paket sejenis, jumlah pagu di atas ambang PL (ambang: asumsi sampai Perpres dicek)" | "pemecahan paket", "menghindari tender", nama penyedia |
| SDU-1 | "Porsi e-Purchasing 31%" | "Bagian PBJ gagal mencapai ..." |
| KPOD-1 | "SK yang didampingi menurut Laphar: 64%; angka resmi LAKIP 100%" | "LAKIP tidak benar", "klaim LAKIP salah" |
| PUS-1 | "Dataset terakhir diperbarui 14 bulan lalu" | "produsen data tidak patuh" |

### 9.3 Gerbang

G-4 butir d (RU §6.1) diperluas dengan daftar `KATA_TUDUH` yang ditolak di `public/bnpb/unit/**`, `scripts/bnpb/unit/**` (string keluaran), dan fixture kartu: `korupsi`, `penyimpangan`, `pelanggaran`, `mark-up`, `markup`, `kemahalan`, `fiktif`, `kolusi`, `tersangka`, `pemecahan paket`, `tidak wajar`, `disalahgunakan`, `lalai`. Uji dirinya memakai satu kartu fixture berisi "indikasi korupsi". Kata ini tetap boleh di berkas dokumen `data/kajian-bnpb/**` yang membahas aturan, karena gerbang hanya membaca layar dan keluaran.

### 9.4 Fase yang dikunci

WIL-4 dan IRT-2 berfase F3 dan menunggu U8 dan U9. G-6 butir f menolak kartu keduanya. Bila U8 dijawab "bangun", WIL-4 tetap kelas T, internal R2, tanpa nama orang (bawaan U8), dan berkas ini direvisi sebelum tiket dibuka.

---

## 10. Kuota D1, batas laju, dan beban

Rincian baca dan tulis D1 ada di DT §9.3 (perkiraan <= sekitar 110.000 baris dibaca per hari, 2,2% dari 5 juta) dan uji di RU §7.2. Yang ditetapkan di sini adalah batasnya sebagai aturan keamanan (penyalahgunaan yang menghabiskan kuota menjatuhkan seluruh situs, memori `d1-kuota-baca`).

| Rute | Batas laju | Kunci | Batas ukuran |
| --- | --- | --- | --- |
| `POST /api/unit/ketuk` | 300 per jam | `staf:<id>` | `koreksi` 2.000 huruf, `catatan` 200 |
| `POST /api/unit/akses` | 120 per jam | `staf:<id>` | `catatan` 200 |
| `POST /api/unit/hibah/:id/lapor` | 120 per jam | `staf:<id>` | satu tanggal |
| `POST /api/unit/diklat/unggah` | 10 per hari | `staf:<id>` | 256 KB, 2.000 baris, semua atau tidak sama sekali |
| `POST /api/pengungsian/*` | 200 per jam | pelaku (staf atau akun instansi) | angka dalam batas CHECK |
| Masuk staf | yang sudah ada (`gagalBanyak`, `src/staf.js:80`) | IP dan akun | - |
| `GET` Ruang Unit | tanpa laju D1 | - | badan R2 > 8 MB = 500 |

1. Semua laju lewat `laju()` (`src/bnpb.js:12`, tabel `laju_bnpb`, dibersihkan `bersihkanBnpb` di cron menit 17). Laju itu sendiri membaca D1 (sampai `maks` baris per periksa); batas di atas sudah dihitung di DT §9.3.
2. `GET` data tidak menyentuh D1 selain `stafOK` (sekitar 2 baris berindeks). Rute yang menyajikan R2 saja wajib 0 baris dibaca di luar sesi (RU §7.2).
3. Tidak ada cron Worker baru (DT §1.2 butir 7); `gerbang-anggaran-cf.test.mjs` menjaga.
4. Kueri Actions memilih kolom dan memakai `WHERE` berindeks; satu kueri per kebutuhan per hari.
5. R2 baca kelas B per permintaan staf; `cache-control: private, max-age=300` mengurangi ulang muat.

---

## 11. Jejak audit

| Kejadian | Tercatat di | Bentuk | Celah |
| --- | --- | --- | --- |
| Keputusan staf atas usulan | `unit_ketuk` | hanya ditambah, trigger `unit_ketuk_beku`, `unit_ketuk_tahan` (DT §2.2) | - |
| Status titik akses | `akses_status` | hanya ditambah | - |
| Laporan penggunaan hibah | `hibah_bast.diubah`, `oleh` | nilai terakhir saja | nilai lama hilang; usulan: baris `pantau_jejak` (`jejakStmt`, `src/staf.js:82`) obyek `hibah:<id>` |
| Angka pengungsian harian | `pengungsian_harian.oleh`, `waktu` | `ON CONFLICT DO UPDATE` menimpa (DT §6.15) | angka sebelumnya hilang; usulan: `pantau_jejak` obyek `pengungsian:<tempat_id>:<tanggal>` dengan angka lama ringkas di `catatan` (300 huruf) |
| Unggah CSV diklat | `diklat_angkatan.oleh`, `dibuat` | per baris | - |
| Peran staf diberi atau dicabut | `pantau_jejak` (modul akun) | yang sudah ada | - |
| Baca berkas kelas T | log Workers (`wrangler.jsonc:21` observability aktif) | satu baris log terstruktur `{rute, nama, oleh}` tanpa isi | usulan; tanpa D1 |
| Jalan pipeline | `unit/indeks.json`, `GITHUB_STEP_SUMMARY`, log Actions | per langkah | log Actions publik untuk repo publik: tidak boleh mencetak isi berkas atau nama |
| Skrip lokal KEU-1, IRT-1 | tidak ada | - | sengaja; data tidak meninggalkan mesin pemilik |

`oleh` selalu id pelaku (`staf:<id>`, id akun instansi, atau awalan hash moderator), tidak pernah nama. Baris `dummy = 1` boleh dihapus; selain itu jejak tidak dihapus.

---

## 12. Respon insiden

| Kejadian | Hentikan | Nilai | Beri tahu | Perbaiki |
| --- | --- | --- | --- | --- |
| Data pribadi muncul di R2 `unit/` | hapus objeknya (`wrangler r2 object delete ... --remote`); keluarkan nama dari `DATA_UNIT` bila perlu | siapa yang membaca: log Workers rute itu sejak `uploaded` objek | pemilik; bila subjeknya bisa dikenali, pemberitahuan tertulis 3 x 24 jam (UU 27/2022 Pasal 46) lewat BNPB sebagai pengendali; Pusdatinkom sebagai Unit TIK (Perban 10/2025 Pasal 27 ayat 3) | perbaiki skrip, tambah kasus ke G-5 di commit yang sama (AGENTS.md §3.4) |
| Data pribadi atau internal ter-commit ke git | jangan push lagi; bila sudah di GitHub, anggap terbuka | commit mana, sejak kapan | sama | hapus berkas, tulis ulang riwayat hanya atas keputusan pemilik; rotasi apa pun yang ikut bocor; `higiene-repo` |
| Secret bocor | cabut di Cloudflare atau GitHub segera | pemakaian sejak bocor | pemilik | ganti secret; tambah pola ke pemindai `higiene-repo` |
| Sesi staf dicuri atau akun disalahgunakan | Super Admin menonaktifkan akun (`status`), sesi D1 terhapus | `pantau_jejak`, `unit_ketuk.oleh`, `pengungsian_harian.oleh` | pemilik, atasan staf | baris salah ditandai lewat keputusan baru (tidak dihapus) |
| Kuota D1 hampir habis | matikan langkah Actions yang membaca D1 (`continue-on-error` sudah ada; hapus panggilan `d1 execute` di `jalan.py`) | D1 insights | pemilik | indeks atau pemangkasan kueri; uji `EXPLAIN QUERY PLAN` |
| Sumber resmi memblokir atau menolak | §8 | - | pemilik | §8 |
| Angka salah tampil sebagai resmi | ganti pil ke "periksa" lewat rilis berkas berikutnya; atau hapus objek | sejak kapan, siapa yang mengutip | unit pengguna | kasus acuan baru di RU §2 |
| Kalimat bernada tuduhan lolos ke layar | hapus objek atau rilis cepat | layar mana | pemilik | tambah kata ke `KATA_TUDUH` |

Deploy perbaikan Worker tetap oleh sesi induk atau pemilik (AGENTS.md §9). Migrasi produksi diterapkan pemilik.

---

## 13. Daftar periksa pengulas

### 13.1 `guard-api` (tiap rute di `src/unit.js` dan `src/pengungsian.js`)

1. Metode tepat; selain itu 405 dengan `allow`.
2. Hak diperiksa pertama: `stafOK(P_UNIT_BACA)` untuk kelas S, `modAtauStaf` untuk kelas T dan semua tulis (§2.3). Tidak ada akses R2 atau D1 sebelum hak lolos.
3. `:nama` dicocokkan ke `DATA_UNIT` (daftar tetap); `:kode` ke `KODE_UNIT` (22 kode). Nama di luar daftar 404 tanpa menyentuh R2. Tidak ada penggabungan jalur dari masukan (tanpa `..`, tanpa `/`).
4. Kiriman: `x-pb: 1` lewat sesi staf, `tolakOrigin` lolos.
5. Badan: semua kunci di daftar putih (`semuaKunci`, pola `src/meja.js:97`); kunci lain 400.
6. Teks lewat `tx()` dengan batas sama dengan CHECK; angka lewat `num()` dengan batas; tanggal `tglSah` dan tidak lewat hari ini bila begitu aturannya.
7. Wilayah: rute tulis yang membawa `prov` atau `kab` memeriksa `dalamWilayahStaf` atau cakupan akun instansi; `tempat_id` milik kab pelaku.
8. Batas laju sesuai §10, dipanggil sesudah hak dan sebelum tulis.
9. Idempoten per kunci (`tempat_id+tanggal`, `program+tgl_mulai+prov+kab`); kirim ulang tidak menggandakan baris.
10. Jawaban: `cache-control: private` dan `vary: cookie` untuk data staf; `no-store` untuk HTML; `x-content-type-options: nosniff`; galat lewat `gagal()` tanpa jejak tumpukan dan tanpa nama berkas R2 untuk tamu.
11. Rute baru masuk `tests/warga/cakupan.json` daftar `diuji` dan punya uji "peran salah DITOLAK" per sel `-` di §2.1.
12. `EXPLAIN QUERY PLAN` tiap kueri baru memakai indeks (RU §7.2).

### 13.2 `security-reviewer`

1. Tidak ada keluaran Ruang Unit di `public/` selain berkas kelas P di §3.1.
2. Tidak ada kolom atau kunci yang cocok G-5 butir a; `koreksi` dibatasi daftar medan per berkas.
3. `panen.py`: `DILARANG` dicek sebelum tiap permintaan; ArcGIS `returnGeometry=false` dan `outFields` daftar putih; tidak ada penghindaran blokir (§8).
4. Layar: semua teks data lewat `esc()` atau `textContent`; tidak ada `innerHTML` dari JSON tanpa `esc()`; judul JDIH daerah, berita, dan nama paket SIRUP adalah masukan luar.
5. URL dari data (tautan SIRUP, JDIH, CKAN) hanya `https://`, lewat `urlOk`, dengan `rel="noopener noreferrer"`.
6. HTML lewat `halamanBnpbPublik(..., {pribadi: true})` (`src/bnpb.js:46`): CSP tanpa skrip dan gaya inline, `no-store`, `no-referrer`, `noindex`.
7. Kelas T tidak terbaca akun gerbang (§2.3).
8. Kalimat layar dan keluaran lolos §9 dan `KATA_TUDUH`.
9. Fixture uji tanpa nama orang; PDF contoh dibersihkan.
10. Unggahan CSV: ukuran dan jumlah baris dibatasi sebelum diurai; pengurai fungsi murni yang diuji; tanpa formula spreadsheet di keluaran CSV unduhan (sel yang diawali `=`, `+`, `-`, `@` diberi awalan `'`).
11. Log (Workers, Actions, `GITHUB_STEP_SUMMARY`) tidak mencetak isi berkas, nama, atau token.
12. Secret tidak di berkas yang dilacak git.

---

## 14. Catatan untuk sesi induk

1. **Hak baca peran kerja lain.** PRD §3.2 dan §8.4 memberi hak baca lewat `SEMUA_PERAN` (`src/admin_halaman.js:28`, yang memuat `verifikator`, `analis_konsesi`, `udara`, `tmc`); DT §1.4 `P_UNIT_BACA` tidak memuat keempatnya. Nama peran sudah diputus `unit` (KA §8); hak baca belum (TIKET P-9). Berkas ini mengikuti DT; bila PRD yang menang, kolom "Kerja lain" di §2.1 berubah menjadi B untuk empat peran itu.
2. **Teks UU 27/2022 tidak ada di korpus lokal.** Nomor Pasal 4, 16, 20, 46 diambil dari pengetahuan umum, bukan dari teks yang dicek. Sebelum dikutip di layar atau surat, cocokkan dengan teks resmi (skill `hukum-bnpb` hanya mencakup korpus JDIH BNPB).
3. **Perban 10/2025 Pasal 24 ayat (5) dan Pasal 26 ayat (7)-(8)** belum dibahas di KA atau PRD: perjanjian kerahasiaan dan koordinasi pemakaian pusat data pihak ketiga (Cloudflare) dengan Unit TIK dan Komite TIK. Usul: tambahkan ke pertanyaan U1 sebagai bagian paket serah.
4. **Retensi pengungsian dan jejak tulis-timpa** (§3.3, §11) adalah usulan berkas ini, tidak ada di DT. Koordinat tempat pengungsian bukan data pribadi, tetapi tempat keluarga (`jenis = 'keluarga'`) bisa menunjuk rumah; pembulatan sesudah 2 tahun dan jejak timpa butuh persetujuan sebelum 0113 ditulis.
5. **`unit/pengajar.json` (DIK-4)** menurut DT §6.30 memuat "5 calon dengan skor dan tautan profil". Berkas ini menetapkan id profil, bukan nama, supaya G-5 butir a tidak harus diberi pengecualian kunci `nama`. Bila layar butuh nama tanpa panggilan kedua, G-5 perlu pengecualian bernama untuk berkas ini saja.
6. **Wilayah staf di `unit_ketuk`.** `unit_ketuk` tidak menyimpan `prov`, jadi staf berwilayah bisa mengetuk usulan provinsi lain. Untuk usulan yang barisnya berprovinsi (Laphar, RPBD, dokumen siaga), rute perlu membaca `prov` baris dari R2 lalu memeriksa `dalamWilayahStaf`, seperti `POST /api/unit/akses` membaca `akses_putus.json`. Belum ada di DT §4.9.
7. **`KATA_TUDUH`** (§9.3) adalah perluasan G-4 butir d yang belum ada di RU. Pemilik pengerjanya `penulis-gerbang`.
8. **Beban JDIHN** (§8) adalah perkiraan dari jumlah pemda dan jeda, karena API JDIHN belum diuji (DT §10 butir 9).
