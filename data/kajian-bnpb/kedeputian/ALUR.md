# ALUR: Ruang Unit BNPB

Versi 1, 5 November 2026. Alur ujung ke ujung: data tiap mesin bersama, kerja pengguna tiap sistem F1 dan F2, status isian, dan perilaku saat sumber basi atau gagal. Otoritas di atas berkas ini: `KEPUTUSAN-AWAL.md` > `PRD.md` > `DESIGN-SYSTEM.md` > `DESAIN-TEKNIS.md` > `RENCANA-UJI.md`. Berkas ini tidak mengulang rumus, skema, atau rute; rujukannya ditulis singkat: "DT §4.2" (DESAIN-TEKNIS), "PRD §6.3", "DS §8.4" (DESIGN-SYSTEM), "RU §7.3" (RENCANA-UJI), "KA §5" (KEPUTUSAN-AWAL).

Nama berkas, tabel, dan rute di bawah mengikuti DT, karena DT satu-satunya dokumen yang memberi nama konkret. Di beberapa tempat PRD memakai nama lain; selisihnya dirangkum di bagian 5.

Lambang di diagram: `->` aliran data, `=>` ketukan manusia, `[R2]` berkas di R2 `unit/`, `[D1]` tabel D1, `[repo]` berkas di git.

---

## 0. Alur umum

### 0.1 Satu putaran harian

```
21.20 WIB  GitHub Actions data.yml (cron "20 14 * * *"), sesudah langkah IKU BNPB
   |
   |  1. pulihkan cache data/raw/unit/ (actions/cache)
   |  2. python3 scripts/bnpb/unit/jalan.py --cek        <- semua self-check tanpa jaringan
   |  3. python3 scripts/bnpb/unit/jalan.py harian [--mingguan bila Senin UTC] [--bulanan bila tanggal 1]
   |        tiap langkah: baca [repo] public/data/**, sumber luar (MB-3, MB-8), D1 lewat satu wrangler d1 execute
   |        tulis /tmp/unit/<nama>.json (atomik, .tmp lalu os.replace); langkah gagal = tidak menulis
   |        tulis /tmp/unit/indeks.json (ok/galat per berkas)
   |  4. wrangler r2 object put poskokarhutla-foto/unit/<nama>.json   (per berkas; satu gagal tidak menghentikan lain)
   |  5. simpan cache data/raw/unit/
   v
[R2] unit/*.json
   |
   |  staf membuka /bnpb/unit/<kode>  -> Worker: stafOK(P_UNIT_BACA)  -> cangkang unit.html
   |  kartu: GET /api/unit/indeks, GET /api/unit/data/<nama>          -> badan R2 apa adanya
   v
Layar kartu .ex-std  => staf mengetuk terima / tolak / koreksi / status / tanggal
   |
   v
[D1] unit_ketuk, akses_status, hibah_bast, diklat_angkatan, pengungsian_*, meja_catatan
   |
   +-> dibaca putaran berikutnya (langkah 3) sebagai masukan "isian"
```

Rujukan: DT §1.1, §2.3, §4.9, §9.4. Tidak ada cron Worker baru (DT §1.2 butir 7).

### 0.2 Jadwal yang dipakai

| Frekuensi | Penanda di `jalan.py` | Contoh sistem | `basi_jam` (DT §9.4) |
| --- | --- | --- | --- |
| Harian | `harian` | PUS-1, RRX-1, HUK-1, KPOD-1, WIL-1, OJL-3, RRP-1, RRI-1, PUS-2, PD-1 | 48 |
| Mingguan (Senin UTC) | `--mingguan` | MB-3, PSPB-1, KS-1 (KA §8), OSM jalan untuk RRI-1 | 240 |
| Bulanan (tanggal 1 UTC) | `--bulanan` | PERB-1, PLP-1, KS-4, MT-2, REN-2, SDU-1, DIK-1 | 1.080 |
| Tahunan | `--bulanan` di bulan Januari | `ikk.py` (RRP-3) | 1.080 |
| Statis | berubah lewat commit | MB-2 Jam Aturan, MT-1 katalog | tidak basi |
| Di luar Actions | Mac mini atau mesin pemilik | KPOD-3 (Mac mini), `hukum.py urai`, KEU-1, IRT-1, PLP-3 impor | sesuai berkas |

### 0.3 Masuk dan hak

1. Staf membuka `/bnpb/unit` atau `/bnpb/unit/<kode>` di `centurisk97.id`.
2. Tamu tanpa sesi: 303 ke layar masuk staf dengan `ke=<jalur>`; sesudah masuk, kembali ke jalur itu (DT §1.4 butir 2).
3. Sesi sah tanpa peran Ruang Unit: 403 halaman polos, tanpa pengalihan (DT §1.4 butir 3).
4. Peran `P_UNIT_BACA` membaca semua kartu; `P_UNIT_TULIS` boleh mengetuk; `operator_cc` baca saja; WIL-2 juga menerima tulis dari akun instansi BPBD aktif (DT §1.4).
5. Kode unit di luar 22 kode `KODE_UNIT`: 404. Nama berkas di luar `DATA_UNIT`: 404 tanpa menyentuh R2 (DT §4.9).

---

## 1. Alur data mesin bersama MB-1 sampai MB-8

Kolom "Siapa mengetuk" berarti isian manusia yang kembali ke mesin. "Tanpa" berarti mesin murni hitungan.

| Mesin | Sumber | Jadwal | Olah | Simpan | Tampil | Siapa mengetuk |
| --- | --- | --- | --- | --- | --- | --- |
| MB-1 Status peraturan | `data/raw/hukum/teks/*.json` (lokal pemilik), `public/data/bnpb/hukum/katalog.json` | `hukum.py urai` lokal saat korpus dipanen; ringkasan harian oleh `huk1.py` | `cabut_daftar()`, `konflik_status()` (DT §3.1) | [repo] `katalog.json` kunci `konflik`, `data/hukum/seed.sql`; [R2] `status_peraturan.json` | `/bnpb/hukum` pil "dicabut menurut teks"; `/bnpb/unit/huk` | pemilik menerapkan seed ke D1; HUK-2 menandai amanat lewat `unit_ketuk` |
| MB-2 Jam Aturan | pasal BERLAKU di korpus JDIH, ditulis tangan per kunci | statis, berubah lewat commit | `tenggat(kunci, mulai)`, `nilai()`, `kebutuhanDasar()` (DT §4.2, §4.5) | [repo] `public/inti/jam_aturan.json` (data) + `public/inti/jam_aturan.js` (fungsi) (KA §8) | KPOD-2, semua kartu tenggat, Meja Kerja, pengingat | tanpa (perubahan lewat commit, dijaga gerbang) |
| MB-3 Pemanen JDIH daerah | JDIHN, situs JDIH provinsi (`jdih_situs.json`) | mingguan (KA §8), cache 30 hari per pemda, jeda 1 detik | `cari()`, `kenali()`, `periode()`, `cocok_pemda()` (DT §4.3) | [R2] `jdih_daerah.json` | lewat PSPB-1 dan KS-1 | koreksi status lewat `unit_ketuk` di PSPB-1, KS-1 |
| MB-4 Skor prioritas daerah | jiwa terpapar kelas tinggi (`terpapar.json`), `ikd.json`, kejadian `dibi_kab_tahun.json`, celah layanan dari sistem pemakai | ikut jadwal pemakai | persentil, rata-rata geometrik berbobot (ALGORITMA §5.2, DT §4.4) | tidak menulis sendiri; di berkas pemakai beserta `bobot` dan `rinci` | Bentuk A daftar peringkat (DS §7.3) | tanpa |
| MB-5 Neraca kebutuhan | standar `std_*`, `stok_*` dari MB-2; jiwa dan ketersediaan dari sistem pemakai | ikut jadwal pemakai; WIL-2 juga di peramban | `kebutuhan()`, `neraca()`; `ada` kosong = `belum_dilaporkan` (DT §4.5) | di berkas pemakai | Bentuk B neraca (DS §7.4) | ketersediaan diisi manusia: stok meja `gudang`, angka pengungsian WIL-2 |
| MB-6 Rapor dari data | berkas sistem pemakai | ikut jadwal pemakai | `rapor.py kartu()`, `berkas()` (DT §4.6) | kunci `kartu` di berkas R2 pemakai | `public/bnpb/unit/rapor.js` `render()` kartu `.ex-std` | tanpa |
| MB-7 Penerima dokumen | PDF Laphar (WA), berita, JDIH daerah, layer ArcGIS | usulan dibangkitkan harian oleh pemakai | `usulan()` id stabil sha1, `gabung()` usulan + keputusan (DT §4.7) | [R2] `usulan_<berkas>.json`; [D1] `unit_ketuk` | `public/bnpb/unit/ketuk.js` Bentuk E (DS §7.7) | staf `P_UNIT_TULIS`: terima, tolak, koreksi |
| MB-8 Panen sumber resmi terbuka | CKAN data.bnpb.go.id, ArcGIS gis.bnpb.go.id (agregat kab), INALOGPAL, SIRUP, SPSE | harian (CKAN, ArcGIS, INALOGPAL), bulanan (SIRUP, SPSE) | `ambil_json()` coba ulang 3 kali, daftar `DILARANG`, `outFields` daftar putih (DT §4.8, §8) | cache `data/raw/unit/<sumber>/` (actions/cache); keluaran di berkas pemakai | lewat pemakai | tanpa |

### 1.1 MB-1 rinci

```
pemilik (lokal): python3 scripts/bnpb/hukum.py urai
   data/raw/hukum/teks/*.json -> relasi_dari() + cabut_daftar() -> konflik_status()
   -> [repo] katalog.json (status JDIH tetap, + status_teks, dicabut_oleh, konflik)
   -> [repo] data/hukum/seed.sql (relasi mencabut tambahan)
   => pemilik menerapkan seed.sql ke D1 (DELETE lalu INSERT)
Actions harian: huk1.py membaca katalog.json -> [R2] status_peraturan.json
Layar: /bnpb/hukum (src/hukum.js membaca hukum_relasi -> dicabut_oleh) dan /bnpb/unit/huk
```

Status JDIH tidak pernah ditimpa; dua status tampil berdampingan (PRD MB-1 aturan e). Gerbang MB-2 membaca `konflik` dan menolak entri Jam Aturan yang acuannya berkonflik (DT §4.2 butir 1).

### 1.2 MB-2 rinci

```
penulis entri (inti-layar) -> public/inti/jam_aturan.json  (kunci, jenis, nilai, satuan, sejak, acuan, letak, kutipan, asumsi, catatan)
   public/inti/jam_aturan.js   -> fungsi tenggat(), nilai(), aturan(), standar(), kebutuhanDasar() atas JSON itu
   gerbang tests/agen/gerbang-jam-aturan.test.mjs: acuan BERLAKU, tidak konflik, kutipan ada di seed.sql
pemakai:
   src/meja_spek.js (AMBANG)       -> tanda bahaya Meja Kerja, src/pengingat.js
   public/inti/status_pedoman.js   -> masa status (asumsi)
   scripts/bnpb/unit/aturan.py     -> Python membaca JSON yang sama
   public/bnpb/unit/*.js           -> kartu tenggat, title pasal
```

### 1.3 MB-3 rinci

```
--mingguan: untuk tiap pemda (552): cache data/raw/unit/jdih/<kode>.json segar (< 30 hari)? pakai : ambil
   urutan sumber: JDIHN -> situs JDIH provinsi -> catat "diblokir"
   kenali(judul) -> rpbd / renkon / rpkb / rencana_aksi / None ; periode(judul) ; cocok_pemda(nama)
   -> [R2] jdih_daerah.json  (cakupan: diperiksa, diblokir)
   -> PSPB-1 (rpbd) dan KS-1 (renkon, rpkb, rencana_aksi)
```

Langkah pertama tiket MB-3 adalah probe JDIHN (DT §4.3). Hanya metadata judul dan tanggal; tidak ada teks penuh.

### 1.4 MB-7 rinci

```
sistem pemakai (harian) -> usulan(jenis, baris, sumber) -> id = sha1(jenis + sumber_url + kunci_baris)[:16]
   wrangler d1 execute: SELECT berkas, usulan_id, keputusan, koreksi, waktu FROM unit_ketuk WHERE dummy = 0
   gabung(usulan, keputusan) -> baris menunggu / diterima / ditolak / dikoreksi
   -> [R2] usulan_<berkas>.json
staf: /bnpb/unit/<kode> -> ketuk.js -> GET /api/unit/ketuk?berkas=  (keputusan terbaru per usulan_id)
   => POST /api/unit/ketuk {berkas, usulan_id, keputusan, koreksi?, catatan?}
   -> [D1] unit_ketuk (hanya tambah) ; baris hilang dari daftar di klien
putaran berikutnya: keputusan ikut digabung; angka yang diterima atau dikoreksi masuk hitungan pemakai
```

Usulan tidak masuk angka sebelum diterima, kecuali Laphar (`resmi` + `pola_tetap`) yang tampil berpil "belum dikonfirmasi" (DT §4.7).

### 1.5 MB-8 rinci

```
ambil_json(url): cek DILARANG -> cache data/raw/unit/<sumber>/<sha1 url>.json masih segar? kembalikan : urlopen
   gagal: coba ulang setelah 2, 4, 8 detik -> gagal keras (URL + kode HTTP) -> langkah pemakai gagal
   sukses: tulis cache + .meta (waktu ambil, status HTTP)
keluaran pemakai membawa sumber: [{nama, url, diambil, lisensi}]
```

Pola yang dilarang dan alasannya: DT §8 tabel "Dilarang dipanen".

---

## 2. Alur kerja pengguna per unit (F1 dan F2)

Tiap sistem: baris kepala menyebut berkas R2, jadwal, dan rujukan DT; lalu langkah bernomor. Kecuali disebut lain, langkah 1 selalu "pipeline menulis berkas R2" dan staf membuka `/bnpb/unit/<kode>`. Sistem tanpa isian berakhir di keputusan staf di luar sistem (rapat, surat, telaah); sistem itu tidak menyimpan apa-apa.

### 2.1 PERB: Dit. Pemetaan dan Evaluasi Risiko Bencana

**PERB-1 Pemilih daerah pendampingan IKD (F1).** `unit/pendampingan_ikd.json`, bulanan, DT §5.1.
1. Tanggal 1 tiap bulan `perb1.py` menghitung manfaat IRB per kab dan urutan manfaat per jarak.
2. Fungsional analis membuka `/bnpb/unit/perb`, kartu "25 kab/kota dengan manfaat IRB terbesar per rupiah" berpil `proksi` dan "bukan IRB resmi".
3. Analis membaca kolom `c_label` (kapasitas raster, bukan IKD resmi) dan `naik_iku2`.
4. Keputusan: daftar dampingan IKD tahun depan dibawa ke rapat direktorat. Tidak ada ketukan; daftar diunduh CSV.
5. Bila nilai IKD resmi per kab diserahkan (U10), kapasitas proksi diganti dan pil berubah ke `resmi`.

**PERB-2 Perkiraan berjalan kerugian ekonomi langsung (F2).** `unit/kerugian.json`, bulanan, DT §6.1.
1. `perb2.py` menghitung kerugian rumah per kab dan proporsi terhadap PDB.
2. Gerbang jujur: tahun 2025 dibandingkan dengan Rp51,3 triliun LAKIP; selisih lebih dari 30% membuat kartu "belum layak" tanpa angka rupiah.
3. Direktur membuka kartu "Kerugian rumah tahun berjalan" berlabel batas bawah.
4. Keputusan: bahan rekomendasi kerugian ekonomi. Tanpa ketukan.

### 2.2 PSPB: Dit. Pengembangan Strategi PB

**PSPB-1 Register status RPBD 552 pemda (F2).** `unit/rpbd.json`, `unit/usulan_rpbd.json`, bulanan, DT §6.2.
1. MB-3 menulis `jdih_daerah.json`; `pspb1.py` memberi status per pemda: `berlaku`, `habis`, `tidak_ditemukan`, `sesuai_3_2026`.
2. Fungsional membuka `/bnpb/unit/pspb`, kartu "N dari 552 pemda punya RPBD berlaku menurut JDIH", dipisah 38 provinsi dan 514 kab/kota.
3. Pemda bertanda `diduga` (periode tidak di judul) dan `tidak_ditemukan` muncul di daftar koreksi Bentuk E.
4. Staf yang tahu status sebenarnya mengetuk "koreksi" dan mengisi `status`, `periode`, `url` (DT §6.2), atau "terima".
5. Putaran bulan berikutnya memakai koreksi itu; `tidak_ditemukan` tetap berlabel "tidak terbit di JDIH, belum tentu tidak punya".

**PSPB-3 Rapor indikator Sendai dan SDGs 11.b (F2).** `unit/sendai.json`, bulanan, DT §6.3.
1. `pspb3.py` menghitung A-1, B-1 dari DIBI dan penduduk; C-1 dari PERB-2; E-1/E-2 dari PSPB-1.
2. Fungsional membuka kartu rapor; C-1 kosong bila PERB-2 "belum layak".
3. Keputusan: angka isian laporan SDGs dan Sendai, dengan catatan definisi "terdampak" di `title`. Tanpa ketukan.

### 2.3 SPB: Dit. Sistem PB

**SPB-1 Peta NSPK per fase dan jenis bencana (F2).** `unit/peta_nspk.json`, harian, DT §6.4.
1. `spb1.py` membaca katalog (MB-1) dan target Renstra yang diketik sekali.
2. Fungsional membuka matriks fase x jenis; dokumen di `konflik` dihitung tidak berlaku.
3. Daftar target Renstra yang lewat tahun tampil di bawah matriks.
4. Pemetaan fase atau jenis yang salah dikoreksi staf lewat `unit_ketuk` berkas `usulan_nspk`.
5. Keputusan: NSPK yang diprioritaskan untuk disusun atau direvisi.

### 2.4 PUS: Pusdatinkom

**PUS-1 Rapor walidata Satu Data Bencana (F1).** `unit/satu_data.json`, harian, DT §5.2.
1. `pus1.py` membaca CKAN lewat MB-8 sampai halaman habis.
2. Verifikator data membuka `/bnpb/unit/pus`: per organisasi jumlah dataset, umur median, persen metadata, paket basi; 37 data prioritas LAKIP.
3. Organisasi dengan 0 dataset tampil bernilai kosong, bukan 0.
4. Keputusan: produsen data mana yang disurati. Tanpa ketukan.

**PUS-2 Usulan KIB 16 digit dan pencocok logbook ke DIBI (F2).** `unit/kib_cocok.json`, harian, DT §6.5.
1. `pus2.py` membaca logbook dari D1 (satu kueri, kolom terpilih) dan DIBI; menghitung KIB usulan.
2. Verifikator membuka kartu "N kejadian logbook memenuhi ambang tetapi belum ada di DIBI sesudah 7 hari".
3. Tiga daftar: cocok, logbook tanpa DIBI, DIBI tanpa logbook. Semua berlabel "KIB usulan".
4. Keputusan: kejadian mana yang diverifikasi dan dimasukkan ke DIBI (di DIBI, bukan di sini). Unduhan CSV kolom Juknis 7/2023.

### 2.5 PD: Dit. Peringatan Dini

**PD-3 Penyusun pesan peringatan berstandar (F1).** Tanpa berkas R2, fungsi murni, DT §5.3.
1. Staf membuka `/bnpb/unit/pd`, memilih peringatan aktif dari `GET /api/peringatan/aktif`.
2. `pesanStandar()` menyusun enam baris sesuai Perban 2/2024 Pasal 20; unsur tanpa data ditulis "belum ada data".
3. Staf menyalin pesan WA atau mengunduh kartu PNG.
4. Keputusan kirim ke warga tetap di Kepala BNPB atau Kepala Daerah; sistem tidak mengirim.

**PD-1 Rapor peringatan dini, laporan 4-bulanan (F2).** `unit/rapor_peringatan.json`, harian, DT §6.6.
1. `rapor_peringatan.py` membaca tabel D1 `peringatan` sekali sehari dan kejadian dari logbook dan DIBI.
2. Direktur membuka kartu per jenis x tingkat: POD, FAR, hit, palsu, terlewat; keterbatasan "palsu" ditulis di `title`.
3. Pada akhir April, Agustus, Desember staf mengunduh teks templat laporan 4-bulanan (MB-2 `ews_evaluasi`).
4. Umpan balik BPBD tidak ada sampai U11; tidak ada ketukan.

**PD-2 Peta cakupan layanan peringatan dini (F2).** `unit/cakupan_ews.json`, bulanan, DT §6.7.
1. `pd2.py` menghitung desa terlayani dari titik sirine OSM dan alat sensor.
2. Direktur membuka peta desa terlayani/tidak dan daftar usulan lokasi paket, berlabel "batas bawah dari OSM".
3. Keputusan: lokasi paket instrumen berikutnya. Tanpa ketukan.

### 2.6 KS: Dit. Kesiapsiagaan

**KS-4 Kalender gladi pra-musim (F1).** `unit/kalender_gladi.json`, bulanan, DT §5.4.
1. `ks4.py` mencari kab yang masuk musim bahaya utama dalam 1-2 bulan.
2. Direktur membuka `/bnpb/unit/ks`, kartu "N kab/kota masuk musim bahaya utama dalam 2 bulan".
3. Staf mengunduh kerangka skenario per kab (bahaya teratas, kejadian terburuk DIBI).
4. Keputusan: kab mana didorong menggelar Gladi Ruang atau Gladi Lapang (Juklak 4/2026). Tanpa ketukan.

**KS-1 Pemantau dokumen kesiapsiagaan daerah (F2).** `unit/dokumen_siaga.json`, `unit/usulan_dokumen_siaga.json`, bulanan, DT §6.8.
1. MB-3 menemukan renkon, RPKB, rencana aksi; `ks1.py` memberi status `berlaku`, `segera_habis`, `kedaluwarsa`, `perlu_reviu`, dan RPKB `perlu_mutakhir`.
2. Direktur membuka kartu "N daerah punya renkon berlaku menurut JDIH" dengan pembanding IKK 4,27%.
3. Staf mengoreksi usulan yang salah kenali lewat `unit_ketuk`.
4. Bila staf ingin mengikuti satu renkon di Meja Kerja, tombol "salin ke Meja Kerja" membuka isian meja `renkon` terisi; simpan membuat catatan meja `tercatat`.
5. Keputusan: daerah mana diasistensi memutakhirkan dokumen.

**KS-3 Kesenjangan lokasi evakuasi (F2).** `unit/evakuasi.json`, bulanan, DT §6.9.
1. `ks3.py` mengukur jarak desa terpapar tinggi ke kandidat bangunan di luar zona bahaya.
2. Direktur membuka daftar desa `kurang` dan kandidat terdekat; cakupan OSM per kab tampil.
3. Kandidat tidak pernah disebut "lokasi evakuasi resmi". Keputusan: desa yang dibahas bersama BPBD. Tanpa ketukan.

### 2.7 MT: Dit. Mitigasi Bencana

**MT-1 Penyusun dan pra-telaah usulan Dana Bersama prabencana (F2*).** `unit/dana_bersama_katalog.json`, statis, DT §6.10.
1. Katalog kode kegiatan 02.01.01-02.01.11, kelas ESMS, dan standar biaya dibangun sekali.
2. Tim telaah membuka `/bnpb/unit/mt` (`mt1.js`), memilih kab dan kegiatan, mengisi volume.
3. Peramban menghitung skor prioritas, kelas ESMS, RAB, dan menandai komponen di atas standar; usulan dengan lebih dari satu keluaran ditolak.
4. Staf mengekspor PDF atau Excel. Tidak ada yang tersimpan di server; ini alat bantu, bukan kanal pengajuan.

**MT-2 Daerah prioritas mitigasi dan paket kegiatan (F2).** `unit/mitigasi_prioritas.json`, bulanan, DT §6.11.
1. `mt2.py` memilih kab kuartil atas risiko dan kapasitas rendah (MB-4), lalu memetakan bahaya ke kode kegiatan.
2. Direktur membuka daftar kab dengan 1-3 kegiatan, berlabel "usulan analis, bukan rekomendasi resmi".
3. Keputusan: daerah yang difasilitasi mitigasi. Tanpa ketukan.

**MT-3 Kalender kampanye dan sasaran edukasi per kab (F2).** `unit/kampanye.json`, bulanan, DT §6.12.
1. `mt3.py` memilih kab yang masuk musim bahaya dalam 1-2 bulan dan 10 desa terpapar terbesar.
2. Direktur membuka paket per kab: pesan tindakan, desa sasaran, saran saluran dari porsi rentan.
3. Keputusan: jadwal kampanye bulan itu. Tanpa ketukan.

### 2.8 KPOD: Dit. Koordinasi Pengendalian Operasi Darurat

**KPOD-2 Jam Aturan (F1).** `public/inti/jam_aturan.json` (bukan R2), DT §5.5.
1. Staf Koordalops membuka `/bnpb/unit/kpod`, kartu "Jam Aturan: N tenggat berpasal, M asumsi".
2. Tiap baris menaut ke dokumen dan pasal di `/bnpb/hukum`.
3. Bila staf menemukan angka yang salah, ia melapor ke pemilik program; perubahan lewat commit dan gerbang, bukan ketukan.

**KPOD-3 Laporan harian terurai otomatis dari PDF di WA (F1).** `public/data/laphar_riwayat.json` + `unit/usulan_laphar.json`, harian, DT §5.6.
1. PDF "Laporan Harian Dit. Koordalops" tiba di gateway WA; `src/wa_jenis.js` mengenalinya sebagai `laphar_pdf`.
2. Di Mac mini, `scripts/wa/otomatis.mjs` menjalankan entri `arsip_laphar`: unduh PDF, `pdftotext -layout`, `laphar_arsip.mjs --hari`, `laphar_arsip.py`.
3. `laphar_riwayat.json` ditulis ulang dan di-commit lewat jalur commit yang sudah dipakai `otomatis.mjs`; baris ragu masuk `usulan_laphar.json`.
4. Staf membuka kartu "Laphar terurai sampai <tanggal>, N hari bolong".
5. Baris ragu diketuk terima, tolak, atau koreksi.

**KPOD-1 Rapor intervensi status darurat (F2).** `unit/rapor_darurat.json`, harian, DT §6.13.
1. `kpod1.py` menjodohkan SK status dengan episode Laphar dan kelas pendampingan.
2. Gerbang jujur: bila kurang dari 80% SK berpasangan episode, kartu "penjodohan wilayah belum cukup" menggantikan angka IKU.
3. Direktur membuka kartu IKU Program 3 per bulan, per direktorat wilayah, per jenis, berdampingan dengan angka resmi LAKIP.
4. Keputusan: SK mana yang ditanyakan ke direktorat wilayah. Tanpa ketukan.

### 2.9 WIL: Dit. Penanganan Darurat Wilayah I, II, III

**WIL-1 Meja Wilayah (F2).** `unit/meja_wilayah.json`, harian, DT §6.14.
1. `wil1.py` menyusun tiga antrean (wil1, wil2, wil3) dari `dit_wilayah.json`, SK, saran status, Laphar, `/prediksi`.
2. Staf wilayah membuka `/bnpb/unit/wil`; pemilih direktorat bawaan mengikuti `staf.wilayah`.
3. Antrean urut lima tingkat (DT §6.14); tiap butir membawa alasan satu kalimat dan sumbernya.
4. Staf menindaklanjuti di luar sistem (telepon BPBD, nota dinas) atau lewat layar lain (Meja Kerja, Dalops).
5. Butir hilang dari antrean pada putaran berikutnya bila sebabnya hilang (SK terbit, pendampingan tercatat di Laphar).

**WIL-2 Pengungsi terpilah per tempat pengungsian (F2*).** `unit/pengungsian.json`, harian, D1 `pengungsian_*`, DT §6.15.
1. Operator BPBD (akun instansi) atau staf wilayah membuka isian tempat dan mencatat tempat baru: nama, jenis, wilayah, tanggal buka (`POST /api/pengungsian/tempat`).
2. Tiap hari operator mengisi 11+ angka terpilah per tempat (`POST /api/pengungsian/harian`). Kirim ulang di hari yang sama menimpa baris hari itu.
3. Jalur WA `#pengungsian` hanya aktif bila U11 dijawab; pesan yang tidak cocok pola masuk antrean periksa.
4. Peramban dan `wil2.py` menghitung kebutuhan dasar per tempat (MB-5).
5. Staf wilayah membuka tab pengungsian: rekap kab dari tempat berdata 2 hari terakhir, panel selisih pusat (Laphar) lawan daerah; selisih lebih dari 25% merah.
6. Keputusan: pengiriman bantuan dan klarifikasi angka ke BPBD. Sistem tidak memilih angka yang benar.
7. Tempat ditutup dengan mengisi `tutup`; sesudahnya isian harian untuk tanggal sesudah tutup ditolak D1.

**WIL-3 Kaji cepat dua tahap yang drafnya terisi sendiri (F2).** Tanpa berkas R2, rute `GET /api/meja/kaji_cepat/draf`, DT §6.16.
1. TRC atau staf membuka isian meja `kaji_cepat` dan menekan "draf kaji cepat".
2. Rute membaca JSON statis saja dan mengembalikan draf: cakupan wilayah, penduduk terpapar, saran status, perkiraan masa.
3. Staf memeriksa dan menyimpan catatan meja (`dilaporkan`), mengisi `tgl_awal` lalu `tgl_lanjutan`.
4. Tanda bahaya muncul bila laporan awal lewat 24 jam atau lanjutan lewat 72 jam (MB-2).
5. Ekspor PDF Format-4. Penetapan status tetap oleh kepala daerah.

### 2.10 PLP: Dit. Pengelolaan Logistik dan Peralatan

**PLP-1 Neraca stok penyangga 514 kab/kota (F1).** `unit/stok_penyangga.json`, bulanan, DT §5.7.
1. `plp1.py` menghitung kebutuhan 72 jam tiga skenario PR per kab; stok dari INALOGPAL dan meja `gudang` bila ada.
2. Perencana membuka `/bnpb/unit/plp`, kartu "N kab/kota belum punya data stok untuk 72 jam pertama".
3. Kab tanpa stok berstatus `belum_dilaporkan`, tidak pernah 0.
4. Stok diisi lewat meja `gudang` di Meja Kerja (bukan di kartu ini); putaran berikutnya membacanya.
5. Keputusan: kab mana diisi stok penyangga.

**PLP-2 Daftar pendek penerima hibah logpal (F2).** `unit/hibah_prioritas.json`, bulanan, DT §6.17.
1. `plp2.py` menskor kab atas kriteria terukur Juklak 3/2024 (MB-4).
2. Direktur membuka daftar pendek; dua kriteria tak terskor tampil sebagai kolom kosong untuk rapat.
3. Keputusan di rapat penetapan penerima. Tanpa ketukan.

**PLP-3 Pengingat kewajiban pasca-hibah dan kedaluwarsa (F2).** `unit/pasca_hibah.json`, harian, D1 `hibah_bast`, DT §6.18.
1. Pemilik menyerahkan daftar BAST (lampiran Keputusan Deputi); `plp3_impor.py` menulis berkas SQL; pemilik menerapkannya ke D1.
2. `plp3.py` membaca `hibah_bast` sekali sehari dan memberi status hijau, kuning, merah.
3. Staf membuka daftar penerima belum lapor dan barang mendekati kedaluwarsa.
4. Saat laporan penggunaan diterima, staf menekan "lapor" dan mengisi tanggal (`POST /api/unit/hibah/:id/lapor`).
5. Tanpa daftar BAST, kartu kosong dengan kalimat "Menunggu data dari Dit. PLP" (DS §8.2). WA tidak dikirim sampai U11.

### 2.11 OJL: Dit. Optimasi Jaringan Logistik dan Peralatan

**OJL-2 Penempatan stok musiman dan menjelang kejadian (F2).** `unit/prepositioning.json`, harian sesudah prediksi, DT §6.19.
1. `ojl2.py` menghitung target stok musiman per gudang dan saran "kirim paket 72 jam untuk N jiwa" saat `/prediksi` tinggi.
2. Direktur membuka daftar saran berlabel "tanpa graf jalan"; tiap saran mencatat pemicunya.
3. Keputusan pengiriman di luar sistem. Tanpa ketukan.

**OJL-3 Rapor Klaster Logistik dari API INALOGPAL (F2).** `unit/klaster_logistik.json`, harian, DT §6.20.
1. `ojl3.py` membaca tiga API INALOGPAL lewat MB-8.
2. Sekretariat klaster membuka kartu "N provinsi ber-SK klaster"; provinsi merah bila beban tinggi dan capaian rendah atau tanpa SK.
3. Staf mengunduh draf Format-5 triwulan (teks templat).
4. Keputusan: provinsi yang didorong membentuk atau memutakhirkan klaster.

### 2.12 RRX: Deputi RR lintas direktorat

**RRX-1 Jam pascabencana per kab (F1).** `unit/jam_pascabencana.json`, harian, DT §5.8.
1. `rrx1.py` menetapkan hari-0 dari SK tanggap darurat pertama, menghitung sisa dari 90 hari R3P, kelas hijau/kuning/merah, dan beban stimulan kasar.
2. Deputi dan direktur membuka `/bnpb/unit/rrx`: kejadian merah di atas.
3. Staf yang tahu R3P sudah disusun menekan "catat R3P": isian meja `rehab` terbuka dengan `kejadian_ref` dan wilayah terisi.
4. Staf mengisi `tgl_r3p` dan menyimpan; catatan meja `rehab` dibuat berstatus `jitupasna` tanpa kaji cepat induk (sesudah F0-3).
5. Putaran berikutnya membaca meja `rehab` dan kejadian itu tidak lagi merah.

### 2.13 RRP: Dit. RR Perumahan

**RRP-3 Kalkulator Jitupasna permukiman (F1).** Tanpa simpan server, `unit/ikk.json` tahunan, DT §5.9.
1. Staf membuka `/bnpb/unit/rrp` (`rrp3.js`); unit RB, RS, RR terisi dari RRP-1 bila ada, selain itu diketik.
2. Peramban menghitung kerusakan, kebutuhan dengan IKK BPS kab, dan tanda ganda huntap + stimulan.
3. Staf mengunduh CSV kolom formulir lampiran 7 Perka 15/2011. Tidak ada yang tersimpan.

**RRP-1 Neraca rumah rusak per kab (F2).** `unit/neraca_rumah.json`, harian, DT §6.21.
1. `rrp1.py` membaca DIBI (lapor), layer verifikasi ArcGIS agregat kab (verifikasi), bangunan per kec, dan tersalur dari RRP-2 dan meja `rehab`.
2. Direktur membuka neraca lapor, verifikasi, tersalur per kab; kec dengan lapor lebih dari 0,8 x bangunan bertanda "periksa".
3. Keputusan: angka yang dipakai untuk beban stimulan (dua kolom: lapor, verifikasi). Tanpa ketukan.

**RRP-2 Panen angka pemulihan dari rilis resmi (F2).** `unit/usulan_pemulihan.json`, harian, DT §6.22.
1. Leksikon berita mengekstrak angka huntara, huntap, KK, rekening per kab menjadi usulan berlabel `sekunder` dengan URL.
2. Staf membuka daftar usulan di `/bnpb/unit/rrp` dan mengetuk terima, tolak, atau koreksi.
3. Baris diterima diteruskan ke tracker `pemulihan` lewat `POST /api/pusdalops/pemulihan/terima` dengan `catatan` = URL sumber.
4. Tracker pemulihan di `/bnpb/operasi` menampilkan progresnya; RRP-1 membaca angka tersalur.

### 2.14 RRI: Dit. RR Infrastruktur

**RRI-1 Daftar akses putus sampai pulih (F2).** `unit/akses_putus.json`, harian (OSM mingguan), D1 `akses_status`, DT §6.23.
1. `rri1.py` menyatukan titik putus dari layer PU, DIBI, OSM; tiap titik ber-id stabil; status bawaan `putus`.
2. Tim penilai membuka `/bnpb/unit/rri`: tabel umur putus dan peta titik; aset desa bertanda tidak bisa hibah RR.
3. Saat kabar akses dibuka datang, staf memilih status `darurat` atau `pulih` dan tanggalnya (`POST /api/unit/akses`).
4. Laporan WA "jembatan dibuka" menjadi usulan `unit_ketuk`, bukan tulis langsung, sampai U11.
5. Putaran berikutnya memakai status terbaru per titik; umur putus berhenti dihitung saat `pulih`.

### 2.15 RRS: Dit. RR Sosial, Ekonomi, dan Lingkungan Hidup

**RRS-3 Daftar fasilitas sosial rusak (F1).** `unit/fasilitas_sosial.json`, harian, DT §5.10.
1. `rrs3.py` mencari sekolah, puskesmas, RS, klinik, rumah ibadah OSM di dalam jejak bahaya aktif.
2. Direktur membuka kartu per kejadian, berlabel "cakupan OSM, batas bawah"; selisih dengan `f_pendidikan` DIBI tampil sebagai tanda pendataan.
3. Keputusan: bahan bab sosial R3P. Tanpa ketukan.

**RRS-1 Taksiran cepat kerugian pertanian per kab (F2).** `unit/rugi_tani.json`, harian selama banjir aktif, DT §6.24.
1. `rrs1.py` menghitung sawah tergenang dan, bila kalibrasi lolos kriteria terkunci, kerugian rupiah.
2. Bila kalibrasi gagal, kartu hanya menampilkan luas tergenang.
3. Direktur membaca kartu; keputusan bahan Jitupasna sektor ekonomi. Tanpa ketukan.

### 2.16 REN: Biro Perencanaan

**REN-1 Rapor Reformasi Birokrasi (F1).** `unit/rb.json`, harian (berkas sumber statis), DT §5.11.
1. `ren1.py` mengurai 22 komponen nilai RB 2024 dari catatan LAKIP.
2. Kepala Biro membuka kartu "Poin RB yang hilang: X dari 100", urut prioritas berlabel "penilaian analis".
3. Keputusan: komponen yang dikejar tahun ini. Tanpa ketukan.

**REN-3 Kalender monev dan tenggat pelaporan (F1).** `unit/kalender_monev.json`, bulanan, DT §5.12.
1. `ren3.py` membentangkan entri MB-2 berulang menjadi kalender 12 bulan.
2. Kepala Biro membuka kalender kartu; tenggat yang bergantung peristiwa (TLHP) tampil sebagai aturan, bukan tanggal.
3. Pengingat WA hanya bila U11. Tanpa ketukan.

**REN-2 Peta belanja lawan peta risiko dari SIRUP (F2).** `unit/belanja_risiko.json`, bulanan, DT §6.25.
1. `ren2.py` membaca SIRUP lewat `docs/pendanaan/sirup_tarik.py`.
2. Kepala Biro membuka rasio pangsa belanja lawan pangsa kebutuhan; kab "kurang dilayani" disorot; label "RUP adalah rencana".
3. Keputusan: bahan penyusunan RKA. Tanpa ketukan.

### 2.17 KEU: Biro Keuangan

**KEU-1 Penguji konsistensi angka LAKIP dan LK (F1).** Skrip lokal, DT §5.13.
1. Pemilik menjalankan `python3 -I scripts/bnpb/unit/keu1.py <draf.pdf>` di mesinnya; keluaran markdown di luar repo.
2. Pemilik meneruskan daftar selisih ke Biro Keuangan.
3. Kartu `/bnpb/unit/keu` hanya berpil "Dijalankan lokal" dan cara pakai (DS §8.6).

### 2.18 SDU: Biro SDM dan Umum termasuk Bagian PBJ

**SDU-1 Rapor tata kelola pengadaan (F2).** `unit/pengadaan.json`, bulanan, DT §6.26.
1. `sdu1.py` membaca SIRUP dan SPSE; keluaran agregat tanpa nama penyedia.
2. Kepala Bagian PBJ membuka porsi triwulan 1, e-Purchasing, PDN, UMK, PenL, dan "kandidat konsolidasi".
3. Keputusan: paket yang dikonsolidasikan atau dipindah ke e-Purchasing. Tanpa ketukan.

### 2.19 HUK: Biro Hukum, Organisasi, dan Kerja Sama

**HUK-1 Pemeriksa status peraturan (F1).** `unit/status_peraturan.json`, harian, DT §5.14.
1. MB-1 membangun `konflik`; `huk1.py` meringkasnya.
2. Pengelola JDIH membuka kartu "13 peraturan tertulis BERLAKU di JDIH padahal dicabut menurut teksnya" dan tautan ke `/bnpb/hukum`.
3. Pemilik mengunduh CSV dan meneruskannya ke pengelola JDIH (U7).
4. Bila JDIH resmi mengubah status, panen korpus berikutnya membuat dokumen itu keluar dari `konflik`.

**HUK-2 Pelacak amanat pengaturan turunan (F2).** `unit/amanat.json`, harian, DT §6.27.
1. `huk2.py` mencari kalimat delegasi per pasal dan menilai terpenuhi atau terbuka.
2. Pengelola membuka daftar amanat terbuka dengan usianya.
3. Amanat yang sudah dipenuhi dokumen yang tidak terdeteksi ditandai "terpenuhi" lewat `unit_ketuk` berkas `usulan_amanat`.
4. Keputusan: bahan Indeks Reformasi Hukum dan rencana penyusunan regulasi.

### 2.20 IRT: Inspektorat I, II, III

**IRT-1 Papan umur rekomendasi TLHP per unit (F2).** Skrip lokal (U9), DT §6.28.
1. Pemilik menerima ekspor SIPTL/SIMHPNAS atau rekap Excel dari Bagian TU Itama tiap triwulan.
2. Pemilik menjalankan `irt1.py`; keluaran HTML kartu `.ex-std` mandiri di luar repo.
3. Pemilik menyerahkan berkas ke Inspektur. Kartu di situs hanya "Dijalankan lokal".

### 2.21 DIK: Pusdiklat PB

**DIK-1 Peta sasaran diklat berbasis risiko (F2).** `unit/diklat_sasaran.json`, bulanan, D1 `diklat_angkatan`, DT §6.29.
1. Perancang program mengunggah CSV angkatan pelatihan (agregat per kab, tanpa nama peserta) lewat `POST /api/unit/diklat/unggah`.
2. Bila satu baris gagal, tidak ada yang tersimpan; layar menampilkan nomor baris yang gagal.
3. `dik1.py` membaca angkatan dari D1 sekali sebulan dan menghitung skor MB-4 per kab dengan cakupan alumni sebagai celah layanan (ALGORITMA §5.5).
4. Kepala Pusat membuka peta sasaran; tanpa unggahan, komponen celah layanan tidak ada dan kartu menulis "cakupan belum ada data".
5. Keputusan: kab sasaran diklat tahun depan sampai target Renstra.

**DIK-4 Bank tenaga pengajar dari direktori pakar (F2).** `unit/pengajar.json`, bulanan, DT §6.30.
1. `dik4.py` mencocokkan mata pelatihan dengan pakar `/akademisi` dan `/direktori` (BM25 `scripts/kemitraan/**`), dengan daftar pengecualian `/direktori`.
2. Perancang membuka 5 calon per mata pelatihan dengan tautan profil.
3. Keputusan: undangan pengajar, di luar sistem. Tanpa ketukan.

### 2.22 JF: Pusat Pembinaan JF Kebencanaan

**JF-1 Kamus kompetensi terstruktur (F1).** `unit/kompetensi.json`, harian, DT §5.15.
1. `jf1.py` mengurai PB.01-PB.58 dari segmen Perban 5/2024.
2. Staf membuka `/bnpb/unit/jf` (`jf1.js`), mencari kompetensi, melihat level 1-5 dan jenjang minimum (bawaan berlabel).
3. Kartu tambahan: kewajiban 20 JP per tahun. Tanpa ketukan.

**JF-2 Hitung kebutuhan formasi JF per instansi (F2).** `unit/formasi_jf.json`, bulanan, DT §6.31.
1. `jf2.py` menghitung kebutuhan per jenjang dari volume kegiatan proksi dan norma waktu bawaan.
2. Kepala Pusat membuka `jf2.js`, mengubah norma waktu di peramban; hitung ulang di klien, tidak tersimpan.
3. Staf mengekspor CSV berlabel "usulan metode" sebagai bahan rekomendasi formasi.

---

## 3. Status dan transisi isian

Semua tabel di bawah menolak perubahan yang tidak sah di D1 sendiri (CHECK dan trigger), bukan hanya di rute. Skema lengkap: DT §2.2 dan §6.15.

### 3.1 `unit_ketuk` (MB-7)

```
usulan di R2 (menunggu)
   => terima   -> baris unit_ketuk keputusan='terima'
   => tolak    -> baris unit_ketuk keputusan='tolak'
   => koreksi  -> baris unit_ketuk keputusan='koreksi', koreksi={medan daftar putih berkas itu}
keputusan baru atas usulan yang sama = baris baru (yang terbaru berlaku)
```

| Hal | Aturan |
| --- | --- |
| Status tampil di `gabung()` | `menunggu` (tanpa baris), `diterima`, `ditolak`, `dikoreksi` |
| Ubah | ditolak trigger `unit_ketuk_beku` |
| Hapus | ditolak trigger `unit_ketuk_tahan`, kecuali baris `dummy = 1` |
| `koreksi` | wajib ada bila dan hanya bila `keputusan = 'koreksi'` (CHECK) |
| Usulan hilang dari sumber | keputusannya tetap tersimpan; `gabung()` tidak menampilkannya karena barisnya tidak ada lagi |

### 3.2 `akses_status` (RRI-1)

```
(tanpa baris) = putus bawaan
   putus -> darurat -> pulih
   putus -> pulih
   pulih -> putus   (putus lagi)
```

Hanya ditambah; status terbaru per `titik_id` menurut `tgl` yang berlaku. Satu status per titik per tanggal (indeks unik `akses_status_satu`). D1 tidak membatasi urutan status; urutan di atas adalah bacaan layar, bukan aturan basis data. `sumber` = `wa` atau `isian`.

### 3.3 `hibah_bast` (PLP-3)

```
impor (kepdep / inalogpal / isian) -> baris, tgl_lapor kosong
   status turunan per hari (plp3.py):
      hijau  : tgl_lapor terisi, atau tenggat 12 bulan sesudah BAST masih jauh
      kuning : tenggat lapor atau kedaluwarsa dekat (90 dan 30 hari, internal)
      merah  : lewat 12 bulan tanpa tgl_lapor, atau barang lewat kedaluwarsa
   => staf mengisi tgl_lapor (>= tgl_bast, <= hari ini) -> hijau
```

Sesudah impor hanya `tgl_lapor` (dan `kedaluwarsa`, `diubah`, `oleh`, `satuan`) yang boleh berubah; medan pokok dijaga trigger `hibah_bast_ubah`. Batas 12 bulan berlabel asumsi (MB-2 `hibah_logpal_lapor`). Pembagian kuning dan merah di atas adalah bacaan dokumen ini atas DT §6.18; DT hanya menyebut "hijau, kuning, merah" (bagian 5).

### 3.4 `diklat_angkatan` (DIK-1)

Tidak punya status. Satu baris = satu angkatan per program per tanggal mulai per wilayah (indeks unik `diklat_angkatan_unik`); unggah ulang baris yang sama dihitung `ulang`, tidak menggandakan. `n_lulus` tidak boleh melebihi `n_peserta`; `tgl_selesai` tidak sebelum `tgl_mulai`.

### 3.5 Pengungsian (WIL-2)

```
pengungsian_tempat:   buka (tutup kosong)  --isi tutup-->  tutup
pengungsian_harian:   satu baris per (tempat, tanggal); kirim ulang = timpa (ON CONFLICT DO UPDATE)
   ditolak D1 bila tanggal < buka atau > tutup (trigger pengungsian_harian_sah)
rekap kab (wil2.py):
   segar : data <= 2 hari  -> dijumlah
   basi  : data  > 2 hari  -> ditandai, tidak dijumlah
   tempat < 10 jiwa        -> tidak ditampilkan per tempat
```

### 3.6 Meja Kerja (`meja_catatan`, sesudah migrasi 0110)

Transisi dijaga trigger `meja_catatan_ubah` (disalin dari `migrations/0026_meja.sql:68-77`).

```
kaji_cepat : dilaporkan -> diverifikasi -> masuk_jitupasna
logistik   : diminta -> disetujui -> dikirim -> diterima
dsp        : diajukan -> disetujui -> cair -> spj -> selesai
             diajukan -> ditolak
rehab      : jitupasna -> usulan -> disetujui -> cair -> dibangun -> selesai
             usulan -> ditolak
renkon, destana, gudang : tercatat (status tetap; yang berubah status turunan)
```

| Meja | Status turunan dan tanda bahaya sesudah F0-2 | Dasar |
| --- | --- | --- |
| `kaji_cepat` | tanda `belum_diverifikasi` bila `dilaporkan` lebih dari 24 jam | MB-2 `kaji_awal`, DT §3.2 |
| `dsp` | tanda `laporan_terlambat` (lewat tanggal 5 bulan sesudah cair atau laporan terakhir), `spj_terlambat` (lewat 3 bulan sesudah status berakhir) | MB-2 `dsp_laporan_perkembangan`, `dsp_spj` |
| `renkon` | turunan `berlaku`, `segera_habis` (90 hari, internal), `kedaluwarsa` (3 tahun), `perlu_reviu` (6 bulan) | MB-2 `renkon_berlaku`, `renkon_reviu` |
| `destana` | turunan `aktif`, `pasif` (12 bulan, internal); tanda `penilaian_kedaluwarsa` (3 tahun) | MB-2 `destana_penilaian` |
| `gudang` | turunan `cukup`, `menipis` (tidak diubah F0-2) | `src/meja_spek.js:136` |
| `rehab` | tanda macet 60 hari (internal, tidak diubah) | `src/meja_spek.js` `AMBANG.rehab_macet_hari` |

Perubahan F0-3: catatan `rehab` boleh dibuat tanpa `kaji_id`; tanpa induk ia wajib unik per (prov, kab, `kejadian_ref`). Dengan `kaji_id`, induk wajib `kaji_cepat` berstatus `masuk_jitupasna` di kab yang sama (trigger `meja_rehab_tautan`). Meja, wilayah, dan `kaji_id` tidak bisa diubah sesudah dibuat.

---

## 4. Saat sumber basi atau gagal

Prinsip yang dipakai semua jalur: berkas lama dipertahankan, tanggalnya terlihat, angka tidak disembunyikan, dan kegagalan satu sistem tidak menjatuhkan yang lain (DT §2.3, §9.4; DS §8.3, §8.4).

### 4.1 Di pipeline

| Kejadian | Yang terjadi | Yang terlihat |
| --- | --- | --- |
| `jalan.py --cek` gagal | baris `run` berhenti sebelum `harian`; tidak ada berkas diunggah; langkah ditandai gagal tetapi `continue-on-error` menjaga sisa `data.yml` | semua kartu memakai berkas kemarin; besoknya tetap kemarin sampai diperbaiki; basi sesudah `basi_jam` |
| Satu langkah sistem melempar galat | `try` per langkah; berkas sistem itu tidak ditulis; `indeks.json` mencatat `ok: false` dan galat satu baris | kartu sistem itu memakai versi kemarin; kartu lain segar |
| Sumber luar tidak menjawab (CKAN, ArcGIS, INALOGPAL, SIRUP, JDIHN) | MB-8 coba ulang 2, 4, 8 detik; cache yang masih segar dipakai tanpa jaringan; bila cache tidak segar dan sumber tetap gagal, langkah pemakai gagal | spanduk "Sumber ‹nama› tidak menjawab sejak ‹tanggal›" (DS §8.3) |
| Bentuk respons sumber berubah | skrip gagal keras (tidak menebak kolom); R2 mempertahankan versi terakhir (OJL-3, DT §6.20) | sama dengan baris di atas; perbaikan lewat kamus kolom (`kamus_layer.json` untuk ArcGIS) |
| Situs JDIH daerah menolak | pemda dicatat `diblokir` di `cakupan`; status pemda itu `tidak_ditemukan` berlabel | angka "diblokir" tampil di kartu PSPB-1, KS-1; tiket `scraper-antibot` terpisah |
| Pola URL masuk `DILARANG` | permintaan tidak pernah dikirim; `cek()` membuktikan | tidak ada |
| `wrangler d1 execute` gagal (MB-7, RRX-1, PD-1, PUS-2, PLP-3, DIK-1) | langkah pemakai gagal dan tidak menulis berkas, sehingga keputusan staf yang sudah ada di berkas kemarin tidak hilang dari tampilan (asumsi dokumen ini, bagian 5) | kartu berkas kemarin |
| Unggah R2 satu berkas gagal | `::warning` per berkas, berkas lain tetap diunggah, langkah keluar 1 | indeks R2 masih menunjuk berkas lama; `GET /api/unit/indeks` membaca tanggal unggah sebenarnya lewat `MEDIA.head` |
| Masukan repo tertinggal (Laphar tidak tiba, `status_darurat.json` tidak diperbarui) | sistem hilir (KPOD-1, WIL-1, RRX-1) tetap jalan dan `dibuat` segar, padahal masukannya lama | KPOD-3 menampilkan "N hari bolong"; sistem hilir tidak menurunkan umur masukan (bagian 5) |
| `BPS_KEY` belum jadi secret | RRP-3 memakai IKK terakhir di cache; PERB-2, RRS-1 tidak bisa menarik PDRB atau GKP | pil tanggal IKK; PERB-2 dan RRS-1 menunggu |
| Korpus hukum tidak dipanen ulang | `katalog.json` tetap; `status_peraturan.json` tetap dibangun harian dari katalog yang sama | `basi_jam` 720 untuk berkas MB-1 |

### 4.2 Di Worker dan layar

| Kejadian | Yang terjadi | Yang terlihat |
| --- | --- | --- |
| Berkas R2 belum pernah ada | `GET /api/unit/data/:nama` 404 `belum_ada` | "Belum ada sistem yang tayang" atau kalimat kosong DS §8.2 |
| Berkas lebih dari 8 MB | 500 | kartu galat dengan tombol "Muat ulang" (DS §8.3) |
| Umur berkas lebih dari `basi_jam` | `GET /api/unit/indeks` mengembalikan `basi: true` | pil `.un-per` merah "basi sejak ‹tanggal›" dan spanduk; angka tetap tampil (DS §8.4) |
| Muat kartu lebih dari 9 detik | `AbortSignal.timeout(9000)` | kartu galat; kartu lain tidak terpengaruh |
| Isian manusia belum ada | `ada` kosong dibaca `belum_dilaporkan`, tidak pernah 0 | "Belum ada yang dilaporkan. Angka di atas dihitung tanpa data ini." |
| Gerbang jujur tidak lolos | PERB-2 (selisih > 30%), KPOD-1 (pasangan < 80%), RRS-1 (kalibrasi kalah), RRP-1 (pembanding < 3) | kalimat pengganti, bukan angka |
| Kuota D1 habis | rute tulis gagal; `stafOK` juga membaca D1 (sesi), sehingga halaman staf ikut tidak bisa dibuka meskipun data kartu ada di R2 | layar masuk atau galat; inilah alasan batas kueri DT §9.3 |
| Ruang Unit basi | tidak masuk `/api/status`, jadi situs publik tidak melapor 503 karena data staf | hanya di layar staf dan `$GITHUB_STEP_SUMMARY` |

### 4.3 Di jalur di luar Actions

| Jalur | Gagal | Akibat |
| --- | --- | --- |
| Mac mini (KPOD-3) mati atau gateway WA putus | PDF Laphar tidak diurai; `laphar_riwayat.json` tidak di-commit | `cakupan.sampai` tertinggal; ukuran berhasil KPOD-3 (tertinggal paling lama 1 hari) gagal dan terlihat di kartu |
| Pengurai Laphar meleset | baris ragu masuk `usulan_laphar.json`, bukan langsung ke angka | antrean ketuk bertambah |
| WA ke BPBD (U11) belum diizinkan | PD-1 tanpa umpan, PLP-3 tanpa pesan, WIL-2 tanpa jalur `#pengungsian`, RRI-1 tanpa kabar WA | sistem tetap jalan dengan isian layar saja |
| Skrip lokal pemilik (KEU-1, IRT-1, impor PLP-3, `hukum.py urai`) tidak dijalankan | tidak ada keluaran baru | kartu "Dijalankan lokal" tidak berubah; PLP-3 kosong |
| Repo di iCloud Documents | skrip lokal bisa membaca berkas yang tertahan | skrip lokal menulis di luar folder iCloud (PRD §9 R14) |

---

## 5. Catatan untuk sesi induk

**Celah yang ditemukan saat menulis alur**

1. DT tidak menyebut apa yang terjadi bila `wrangler d1 execute` gagal di tengah langkah MB-7. Berkas ini mengasumsikan langkah gagal dan berkas kemarin dipertahankan (bagian 4.1). Perlu ditulis di `terima.py` sebagai perilaku yang diuji, karena alternatifnya (menulis usulan tanpa keputusan) akan memunculkan lagi baris yang sudah diketuk.
2. Sistem hilir tidak membawa umur masukannya. KPOD-1, WIL-1, RRX-1 akan tampil segar walau `laphar_riwayat.json` atau `status_darurat.json` tertinggal. Usul: kepala berkas memuat `masukan: [{berkas, dibuat}]` dan kartu memakai umur tertua.
3. Status kuning dan merah PLP-3 hanya disebut "hijau, kuning, merah" di DT §6.18; pembagian di bagian 3.3 adalah bacaan dokumen ini.
4. `akses_status` tidak membatasi urutan status di D1; `pulih -> putus` sah. Bila pemilik ingin "putus lagi" dicatat sebagai titik baru, perlu aturan.
5. Penutupan tempat pengungsian (`tutup`) disebut di skema, tetapi rute `src/pengungsian.js` di DT §6.15 hanya mendaftar `POST /tempat`, `POST /harian`, `GET /kab`. Belum jelas lewat rute apa `tutup` diisi; tanpa itu langkah 7 WIL-2 tidak bisa dijalankan.
6. Komentar `0112_unit.sql` di DT §2.2 menulis "hanya tgl_lapor yang boleh berubah sesudah impor", tetapi trigger `hibah_bast_ubah` tidak menjaga `satuan`, `kedaluwarsa`, `diubah`, `oleh`. Komentar atau trigger perlu diselaraskan; uji skema RU sebaiknya menegaskan pilihan yang diambil.
7. KPOD-3 berjalan di Mac mini dan meng-commit `laphar_riwayat.json`; memori `gas-menyapu` mencatat commit GitHub Desktop pemilik menyapu perubahan semua sesi. Jalur commit otomatis ini perlu dipastikan tidak bertabrakan dengannya.
