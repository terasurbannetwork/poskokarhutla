# Paket `program-terbukti`: kompendium program yang terbukti, organisasi BNPB, dan tabel silang perencanaan

Bahan untuk prinsip 9 dan 11 KERANGKA (program hanya dari praktik terbukti; pemetaan ke unit BNPB dan nomenklatur
peraturan BNPB), Bab 2 dan 8 Kajian Air Jawa, serta Bab 2, 11, dan 12 Kajian Mitigasi.

**Membangun ulang:** `python3 data/kajian-bnpb/bangun/program-terbukti.py` (Python 3 stdlib, luring, kurang dari 2 detik).
Skrip menulis semua berkas di folder ini lalu menjalankan self-check `assert`; keluar non-nol bila satu invarian rusak.
Keluaran terakhir: "self-check hijau". `kompendium.md` dibangkitkan skrip; jangan disunting tangan.

**Gerbang:** `python3 data/kajian-bnpb/qa/paket.py` menjalankan skrip ini (dan paket lain yang kelak didaftarkan) dan
keluar 1 bila self-check merah. Korpus hukum tidak dilacak git, jadi gerbang ini lokal, dijalankan sebelum build kirim.
Belum dipanggil dari `qa/periksa.py` (lihat §5).

## 1. Masukan dan tanggal tarik

| Masukan | Isi | Tanggal | Label |
| --- | --- | --- | --- |
| `data/raw/hukum/teks/perban-nomor-6-tahun-2025.json` | OTK BNPB. Teks: ditetapkan 6 Okt 2025; metadata JDIH: 07 Oct 2025 (dua versi disimpan di `meta.korpus`) | teks JDIH ditarik 23 Okt 2026 | resmi |
| `data/raw/hukum/teks/perban-nomor-11-tahun-2025.json` | Perubahan OTK (30 Des 2025): Deputi PD jadi 1 direktorat koordinasi + 3 direktorat wilayah; Deputi RR jadi 3 direktorat sektor; Pusat Pengendalian Operasi diganti Pusat Pembinaan Jabatan Fungsional Kebencanaan | 23 Okt 2026 | resmi |
| `data/raw/hukum/teks/perban-nomor-5-tahun-2025.json` | Renstra BNPB 2025-2029: 7 program (hlm. 103), IKP (hlm. 130-131), target (Tabel 4.5-4.7, hlm. 132-139), isu RPJMN (hlm. 69-70), pengalihan SPAB (hlm. 20) | 23 Okt 2026 | resmi |
| `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` | Renas PB 2025-2029: kebijakan (hlm. 33-34), Tabel 2.9, Rencana Aksi Tabel 3.1 (hlm. 50-125); kutipan RIPB 2020-2044 (hlm. 13-16) | 23 Okt 2026 | resmi |
| `perban-nomor-7-tahun-2025`, `perka-nomor-1-tahun-2012`, `perka-nomor-4-tahun-2012`, `perban-nomor-2-tahun-2024`, `perban-nomor-4-tahun-2022`, `perban-nomor-6-tahun-2017`, `perban-nomor-9-tahun-2025`, `perban-nomor-2-tahun-2023` | dasar hukum Destana (baru dan lama), SPAB, SPDB, peringatan dini BNPB/BPBD, RR pascabencana, RPKB daerah, rencana kontingensi. Judul tiap peraturan yang disebut kolom `dasar` dicek mesin di halaman judulnya | 23 Okt 2026 | resmi |
| `perban-nomor-1-tahun-2026`, `perban-nomor-1-tahun-2024`, `juklak-nomor-1/3/4/6-tahun-2025`, `juklak-nomor-2-tahun-2026` | instrumen Dana Bersama PB. Perban 1/2026 Pasal 34 mencabut Perban 1/2024 (induk Juklak 4/2025). Keenam instrumen yang berlaku dicek mesin tidak memuat syarat manfaat-biaya | 23 Okt 2026 | resmi |
| `data/raw/hukum/indeks.json` | metadata JDIH (judul, tanggal penetapan, status, URL) untuk `meta.korpus` | 23 Okt 2026 | - |
| `data/kajian-bnpb/tema.json` kunci `kosakata` | kode status usulan, fase, jenis bencana, jenis aksi, keyakinan | repo | - |
| `data/kajian-bnpb/riset/B-air-jawa.md` | angka `via-riset` (Citarum, Ciliwung, model DAS Kamoning, embung, polder); kutipannya dicek mesin ke berkas ini | 23 Okt 2026 | paling tinggi `terverifikasi` |
| 40 dokumen web (`program-terbukti.json` → `meta.sumber`) | laporan, jurnal, siaran pers, berita. **Semua 40 dibuka 23 Okt 2026**: 36 langsung dari URL-nya, 4 lewat salinan web.archive.org karena URL asli menolak (DFAT PAMSIMAS, fact sheet FEMA 2018, feature Bank Dunia Phailin 2013, Info Singkat DPR BRGM); URL arsip ada di kolom `akses` | 23 Okt 2026 | per baris |

`meta.korpus` mencatat per berkas korpus: judul, judul dan tanggal penetapan menurut JDIH, status JDIH, URL, SHA-1, dan
`tanggal_tarik` (tanggal ubah berkas teks; ditarik ulang berarti tanggal dan SHA-1 baru). Teks korpus dinormalkan (spasi
dirapatkan, tanda hubung ujung baris disambung) sebelum dicocokkan.

**Tidak ada yang dikutip dari ingatan.** Tiap nama unit, program, strategi, sasaran, fokus capaian, angka resmi, dan judul
peraturan dicek ke teks korpus. Deret target Renstra wajib terikat ke baris indikatornya (deret harus mulai di dalam
rentang kata indikator atau paling jauh 6-10 token sesudahnya), dan baris Rencana Aksi Renas wajib memuat tokennya
berurutan (baseline sebelum target) di antara kodenya dan kode berikutnya. Tabel 3.1 Renas di-parse dan himpunan 44
programnya harus sama persis dengan daftar paket.

**Uji mutasi** (23 Okt 2026, 17 mutasi pada salinan skrip yang menulis ke folder sementara): semuanya membuat skrip gagal.
Yang diuji: target IKP b dan c ditukar; target IKK logistik 75% diganti 100%; baseline dan target Renas 4.5.1.a ditukar;
angka web diubah konsisten di bukti dan dampak (500.300 jadi 900.300); label baris non-pemerintah dinaikkan ke resmi;
baris ringkasan mesin pencari berlabel terverifikasi; P09 dinaikkan ke kuat dengan jenis pra-pasca; P07 laporan sendiri
berkekuatan sedang; program dalam negeri berstatus baru; BRGM di kolom K/L; keluaran simulasi berlabel terverifikasi;
juklak di kolom dasar yang tidak ada di korpus; angka di kolom syarat tanpa bukti; kutipan riset diubah; kutipan web tanpa
angkanya; riset [SEKUNDER] berlabel resmi; pemetaan unit lama ditulis di `unit_otk_berlaku`. Batasnya: kutipan web dicek
terhadap nilainya sendiri, bukan terhadap halaman web (luring), jadi pemalsuan yang mengubah nilai DAN kutipan sekaligus
tidak tertangkap.

## 2. Berkas keluaran

Semua CSV UTF-8, pemisah koma. Angka di kolom `nilai` ditulis format Indonesia (titik ribuan, koma desimal) persis seperti
di naskah; `nilai_angka` adalah padanannya dengan titik desimal (jam WIB dibaca jam + menit/60). Sel kosong = tidak ada nilai.

| Berkas | Baris | Isi | Label |
| --- | ---: | --- | --- |
| `kompendium_program.csv` | 25 | Satu baris per program: lokasi, periode, pelaksana, fase/bencana/jenis aksi (kode `tema.json`), yang dilakukan, dampak terukur, jenis evaluasi, kekuatan bukti, `kekuatan_catatan` (bila yang terbukti bukan program itu sendirian, atau syarat naik kelas), label angka, syarat keberhasilan, status di Indonesia dan dasarnya, celah, posisi, unit BNPB berlaku, K/L, kode program Renas, fokus capaian RIPB, strategi RIPB, program Renstra | campuran; lihat `keyakinan` |
| `bukti_dampak.csv` | 172 | Satu baris per angka (atau temuan kualitatif): nilai, satuan, periode, peran, sumber, penerbit, URL atau berkas, `akses` (korpus/repo/langsung/arsip + URL arsip), lokasi di dokumen, tanggal akses, label, cara verifikasi, `kutipan` (verbatim, memuat nilainya), `catatan` (penyusun), grup konflik | per baris |
| `organisasi_bnpb.csv` | 45 | Susunan organisasi BNPB per Perban 6/2025 jo. 11/2025: 38 unit berlaku = 1 Kepala + 1 Unsur Pengarah + 1 Sestama + 4 Biro + 4 Bagian + 5 Deputi + 15 Direktorat + 1 Irtama + 3 Inspektorat + 3 Pusat (susunan ini diassert), ditambah 7 unit yang diganti; halaman, kutipan pasal, wilayah provinsi tiap Direktorat Penanganan Darurat | resmi |
| `renstra_bnpb_2025_2029.csv` | 39 | 3 indikator sasaran strategis, 7 program dengan 12 IKP dan target 2025-2029, 24 sasaran kegiatan eselon II. `unit_otk_berlaku` diisi hanya bila unit Renstra ada di OTK berlaku; untuk 7 unit OTK lama kolom itu kosong dan dugaan padanannya ada di `pemetaan_penyusun` (`label_pemetaan` = penilaian-pakar, bukan dasar pasal) | resmi (kecuali `pemetaan_penyusun`) |
| `renas_pb_2025_2029.csv` | 73 | 6 kebijakan, 4 sasaran, 19 strategi, 44 program Renas dengan fokus capaian RIPB (Tabel 2.9, dicocokkan ke Tabel 3.1) | resmi |
| `renas_aksi_terkait.csv` | 17 | Baris Rencana Aksi Renas yang dipakai untuk status program (baseline 2024, target 2029, penanggung jawab, kontributor). **Pagu indikatif sengaja tidak disalin.** `kontributor` hanya memuat K/L dan lembaga pusat; kolom pihak non-K/L Tabel 3.1 (pemerintah daerah, ornop, lembaga usaha, perguruan tinggi, media, organisasi masyarakat/komunitas) tidak disalin. Nama K/L disalin verbatim; BRGM (1.2.3.d) dan Kementerian BUMN (3.1.2.c) diberi catatan pengganti | resmi |
| `ripb_2020_2044.csv` | 46 | RIPB 2020-2044 sebagaimana dikutip Renas: 5 sasaran, 6 kebijakan, 23 strategi, 12 fokus capaian 2025-2029 | resmi |
| `kompendium.md` | - | Kompendium naratif: tabel ringkas, uraian per program dengan tabel buktinya, organisasi, Renstra, Renas, RIPB, batas | turunan |
| `program-terbukti.json` | - | Cermin semua tabel (`tabel.<nama>` = `{kolom, baris}`) + `meta` (korpus, label yang dipakai, verifikasi, kekuatan dan rubriknya, posisi, kosakata peran, penerbit pemerintah, nomenklatur K/L lama, angka yang dibuang, daftar sumber) | - |

## 3. Aturan penilaian

**Label keyakinan** (per angka) mengikuti PEDOMAN §C6.2, dicek mesin:

- `resmi` = diterbitkan lembaga pemerintah berwenang. Hanya baris dari sumber dalam `meta.penerbit_pemerintah` (korpus
  JDIH, BMKG, Kemenko PMK, BRR, DJKN, DPR, Kementerian Lingkungan Jepang, Delta Programme, Pemerintah Odisha, NC DOJ, FEMA).
- `terverifikasi` = sumber primer non-resmi yang dibaca langsung. Ini juga batas atas untuk media, blog, dan riset
  bertanda [SEKUNDER] yang mengutip instansi (Kontan, CGTN, detik, Bisnis.com, Inquirer, blog UNDRR, ECHO).
- `estimasi-model` = keluaran model atau simulasi, siapa pun pembuatnya: Urzainki 2023 (muka air tanah dan emisi),
  NIBS/FEMA (rasio manfaat-biaya), Room for the River (penurunan muka air rencana), model DAS Kamoning, EIRR PAMSIMAS.
  Paket ini tidak menguji balik angka itu. Parameter masukan model (168 sekat, 22.000 ha, sampel 42 desa, vegetasi 40%)
  berperan `masukan-model` dan boleh tetap `terverifikasi`. Mesin menolak angka yang kutipan atau catatannya memuat
  model/simulasi/desain/taksiran, atau angka keluaran program berjenis evaluasi `model`, bila tidak berlabel `estimasi-model`.
- `asumsi-kebijakan` tidak dipakai.
- `belum-dibaca` bukan label keyakinan: penanda angka dari ringkasan mesin pencari yang sumber primernya tidak terbuka.
  Wajib untuk verifikasi `ringkasan-mesin-cari`, dilarang di kolom dampak. Saat ini nol baris.

**Verifikasi** (per angka): `korpus-lokal` (19 baris; kutipan dicek ke teks JDIH), `dibuka-langsung` (138 baris; kutipan
verbatim wajib memuat nilainya dalam format id, en, ribuan-spasi, "N ribu/thousand", atau kata satu sampai sepuluh),
`via-riset` (15 baris; kutipan wajib ada di berkas riset), `ringkasan-mesin-cari` (0 baris).

**Angka yang dibuang** setelah sumbernya dibuka (`meta.dibuang`): 280.000 rumah Rekompak dalam dua tahun (siaran pers Bank
Dunia 2011 yang diarsipkan tidak memuatnya; buku Rekompak menulis 300.000); 23 korban Phailin versi World Vision (dokumen
tidak teridentifikasi); 6.300 meninggal dan 1.061 hilang Haiyan versi NDRRMC lewat Inquirer (artikelnya tidak ditemukan).

**Kekuatan bukti** (per program): `kuat` = deret pra-pasca resmi atau studi bertinjauan, pola konsisten; `sedang` =
terukur tetapi satu kejadian, tanpa pembanding terkontrol, atau model terdokumentasi; `lemah` = laporan sendiri pelaksana
atau klaim pejabat; `belum-terbukti` = tidak ditemukan evaluasi dampak. Rubrik ditegakkan mesin lewat jenis evaluasi:

| Jenis evaluasi | Kekuatan yang boleh | Syarat tambahan |
| --- | --- | --- |
| `peer-review`, `evaluasi-independen`, `data-resmi-pra-pasca` | kuat, sedang | kuat: paling sedikit 2 angka dibuka. Pra-pasca: wajib ada angka `sebelum` dan `sesudah` yang dibuka. Evaluasi independen: dokumennya dibuka |
| `kejadian-tunggal` | sedang, lemah | angka terukur satu kejadian, tanpa data pra atau pembanding |
| `model` | sedang, lemah | paling sedikit satu angka `estimasi-model` |
| `laporan-sendiri`, `pendapat-ahli` | lemah | - |
| `tidak-ada-evaluasi-dampak` | belum-terbukti | - |

**Posisi**: "Program (bukti kuat)" hanya untuk kuat; "Program dengan syarat (bukti sedang)" hanya untuk sedang; "Program
berjalan, wajib evaluasi dampak" dan "Uji coba terukur" untuk sedang, lemah, atau belum terbukti; "Rujukan tata kelola" dan
"Pelajaran, bukan teladan" untuk sedang atau lemah. Program dalam negeri tidak boleh berstatus "Usulan baru" (prinsip 8).

**Peran** (kosakata, dicek): sebelum, sesudah, hasil, pembanding, klaim, target, target-resmi, status-resmi,
temuan-kualitatif, pendapat-ahli, masukan-model. Artinya di `meta.peran`.

**Konflik sumber**: versi yang bertentangan disimpan berdampingan dengan `grup_konflik` yang sama (tiap grup minimal dua
baris): korban siklon 1970 500.300 / 300.000 (kajian WMO) / 1 juta (angka pemerintah menurut kepala CPP); korban Phailin
44 (RDNA) lawan 38 (feature Bank Dunia, 72 jam setelah pendaratan); desa peserta FFVP 9 (APRIL) lawan 4 dan 18 (RAPP); klaim
ABMN Rp1,14 miliar (isi) lawan Rp114 miliar (slug URL); IKA Citarum 2018 33,43 lawan 33,34 dan 2023/2024 50,78; rumah rusak
berat Lombok 74.774 lawan 74.707 dan selesai 65.000 lawan 68.000 dalam satu rilis. CCRIF 2022 (54 pembayaran, US$245 juta,
16 anggota) dan 2023 (63, US$266,8 juta, 17) adalah deret kumulatif, bukan konflik.

**Angka naratif terkunci**: setiap angka di kolom `dampak`, `apa`, `syarat`, `dasar`, `celah`, `catatan`, dan
`kekuatan_catatan` kompendium wajib muncul sebagai `nilai` bukti terbaca untuk program yang sama. Yang dikecualikan hanya
tahun empat digit, tanggal, nomor peraturan (n/tttt), kode Renas/RIPB, dan rujukan pasal, ayat, tabel, halaman.

**Dasar hukum**: tiap Perban/Perka/Juklak yang disebut kolom `dasar` wajib ada di korpus (judulnya dicek di halaman judul)
atau ditandai "teks tidak dibuka/tidak ada di korpus". Peraturan di luar korpus (Perpres 93/2019, 120/2020, 15/2018,
75/2021; Inpres 1/2018, 3/2020; Pergub DKI 93/2021; Kepmen ESDM 291.K/2023; PMK 97/2019; Permendikbud 33/2019; SNI)
disebut sebagai rujukan sekunder.

**Nomenklatur K/L** (`meta.nama_kl_lama`): kolom `kl` dan `lembaga` kompendium tidak boleh memakai BRGM (berakhir 31 Des
2024; restorasi gambut kini Kemenhut, KLH, KKP; Info Singkat DPR Komisi IV Juni 2025) atau Kementerian BUMN (kini BP BUMN
sejak revisi UU BUMN disahkan 2 Okt 2025; Bisnis.com). Baris Renas yang memakai nama lama wajib bercatatan pengganti.

**Tanpa biaya**: tidak ada kolom pagu, anggaran, atau biaya proyek (dicek: kata "pagu", "anggaran proyek", "biaya proyek"
tidak boleh muncul di tabel bukti dan status). Premi dan klaim asuransi dicatat karena itu keluaran program, bukan belanja.

## 4. Temuan penting untuk penyusun naskah

1. **Hanya 2 program berbukti kuat, keduanya luar negeri**: pengendalian air tanah Tokyo/Bangkok dan kesiapsiagaan siklon
   Bangladesh. Untuk Bangladesh yang terbukti adalah paket intervensinya (peringatan dini CPP, shelter, tanggul,
   penyadaran); Haque dkk. menulis belum ada bukti ilmiah dampak terpisah tiap unsur. Odisha dan kode bangunan Chile
   berbukti sedang: Odisha hanya membandingkan dua badai berbeda (1999 lawan 2013), Chile hanya satu gempa tanpa pembanding
   bangunan nonkode. Program dalam negeri terbaik berbukti sedang: PAMSIMAS (evaluasi independen untuk DFAT, Januari 2023,
   yang juga menilai data MIS terlalu optimistis) dan InaTEWS hulu (kronologi satu kejadian, Palu 2018). Rekompak, BRR, dan
   Citarum Harum kini berbukti lemah karena angkanya laporan pelaksana, donor, atau narasi media tanpa sumber data.
2. **Destana dan SPAB belum punya evaluasi dampak** meski berjalan lebih dari 10 tahun. Perban 7/2025 sudah memuat tingkat
   ketangguhan (utama, madya, pratama) yang bisa jadi garis dasar evaluasi. SPAB dialihkan ke kementerian pendidikan sejak
   2023; di Renas BNPB hanya kontributor.
3. **Sekat kanal**: model terkalibrasi untuk 168 sekat di 22.000 ha menghasilkan kenaikan muka air tanah rata-rata hanya
   1,5 cm (estimasi model). Pelaksana restorasi gambut berganti: BRGM berakhir 31 Des 2024, tugasnya kini di Kemenhut,
   KLH, dan KKP.
4. **Renstra 2025-2029 memakai nama unit OTK lama** (Perban 4/2019) untuk Deputi Penanganan Darurat dan Deputi RR, sementara
   OTK berlaku sudah berubah (Perban 11/2025) tanpa pasal peralihan. Dugaan padanannya hanya penilaian penyusun.
5. **Perban 11/2025 tidak ikut mengubah Pasal 104 dan 106 Perban 6/2025**: Inspektorat II masih disebut mengawasi "Pusat
   Pengendalian Operasi" yang paragrafnya sudah diganti (dicek mesin).
6. **Penyaluran Dana Bersama prabencana tidak mensyaratkan analisis manfaat-biaya.** Perban BNPB 1/2026 (berlaku sejak
   diundangkan Maret 2026) Pasal 14 ayat (4) hanya mensyaratkan kesesuaian kegiatan dengan Renas PB dan RKP (K/L) atau RKPD,
   RPBD, dan/atau SPM (pemda); Pasal 16 ayat (3) hanya meminta KAK, RAB, reviu APIP, spesifikasi, dan dokumen
   lingkungan-sosial. Juklak 1/2025, 3/2025, 4/2025, 6/2025, dan 2/2026 juga tidak memuatnya (dicek mesin: bila kelak satu
   instrumen memuatnya, skrip gagal dan status "Usulan baru" P24 harus ditinjau). Juklak 4/2025 menginduk Perban 1/2024
   yang dicabut Perban 1/2026 Pasal 34 tanpa pasal peralihan; indeks JDIH masih mencatatnya berlaku, statusnya perlu dicek.
7. **Peringatan dini**: Renstra mencatat keterpenuhan sistem peringatan dini baru 6% dari masyarakat terpapar di kawasan
   risiko tinggi, sedangkan IKP cakupan layanan peringatan dini di daerah berisiko naik dari 6,10% ke 6,32% sampai 2029.
   Penyebut kedua angka berbeda, jadi jangan dijejerkan seolah satu deret.

## 5. Keterbatasan

- Invarian kab/kota (514 / 119 Jawa) tidak berlaku: paket ini tidak berisi data per kab/kota. Invarian wilayah yang dicek:
  38 provinsi terbagi habis ke tiga Direktorat Penanganan Darurat tanpa duplikasi, dan enam provinsi Jawa punya direktorat
  (Jateng dan DIY: Wilayah I; DKJ, Banten, Jabar: Wilayah II; Jatim: Wilayah III).
- Program dalam negeri jarang dievaluasi dengan pembanding; "belum terbukti" berarti bukti tidak ditemukan pada penelusuran
  23 Okt 2026, bukan program tidak bermanfaat.
- Kutipan web disimpan dan dicek terhadap nilainya, tetapi halaman web tidak disimpan di repo; pemeriksaan ulang ke web
  harus diulang manusia atau sesi yang punya akses jaringan.
- Hitungan 6 kebijakan, 4 sasaran, 19 strategi Renas dan 23 strategi RIPB diassert terhadap daftar paket yang tiap
  butirnya dicek ke teks, bukan dihitung ulang dari korpus; hanya 44 program Renas yang dicocokkan dua arah ke Tabel 3.1.
- Baris Renas 2.1.2.a: kolom bertumpuk di OCR, jadi urutan baseline lawan target baris itu tidak dapat dicek mesin.
- Nomenklatur K/L selain BRGM dan Kementerian BUMN mengikuti Renas PB 2025-2029 dan belum dicek satu per satu ke susunan
  kabinet Oktober 2026.
- Renstra SP6 (biro-biro Sestama) dan SP7 (Inspektorat) hanya dimuat di tingkat program, tidak per sasaran kegiatan.
- SEADRIF (ASEAN), DLNA Siklon Fani 2019 (bisa menaikkan Odisha ke kuat; unduhan PreventionWeb ditolak 23 Okt 2026), dan
  laporan akhir NDRRMC Haiyan tidak terbaca.
- RIPB diambil dari kutipan Renas PB (Tabel 1.2), bukan dari teks Perpres 87/2020 (tidak ada di korpus).
- Gerbang `qa/paket.py` belum dipanggil dari `qa/periksa.py`: berkas itu sedang disunting sesi lain saat paket ini
  diperbaiki. Pemasangannya satu langkah (jalankan `qa/paket.py` dan gagal bila keluar 1) beserta fixture dan registri
  `qa/cakupan.json`. Paket kajian lain belum didaftarkan di `PAKET`.
