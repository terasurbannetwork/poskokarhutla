# Paket `lembaga`: matriks lembaga dan tugas per fase (nomenklatur per 23 Oktober 2026)

Bahan untuk Bab 9 Kajian Air Jawa dan Bab 12 Kajian Mitigasi ("matriks lembaga dan tugas per fase", KERANGKA prinsip 6
dan 11). Isinya: siapa lembaganya dengan nama resmi terkini, apa dasar hukumnya, peran tiap lembaga per jenis bencana dan
per fase, kewenangan per komponen air, klaster nasional, serta titik tumpang tindih dan celah kewenangan.

**Membangun ulang:** `python3 data/kajian-bnpb/bangun/lembaga.py` (Python 3 stdlib, kurang dari 2 detik, tanpa
jaringan). Skrip menulis semua berkas di folder ini, lalu menjalankan self-check `assert`. Bila satu invarian rusak,
skrip keluar dengan kode non-nol. Keluaran terakhir yang benar: "self-check hijau".

## 1. Aturan sel bersumber

Tiap baris di `lembaga.csv`, `peran.csv`, `matriks_air.csv`, `klaster.csv`, dan `celah.csv` membawa `sid` (kunci
sumber), `hlm`, dan `kutipan`. Skrip **menolak jalan** bila kutipan tidak ditemukan di teks sumber yang disimpan pada
halaman yang disebut. Cara mencocokkan: spasi dibuang dan huruf dikecilkan. Kutipan yang dipisah " … " berarti
beberapa potongan yang semuanya wajib ada di halaman itu. Kolom `sid2/hlm2/kutipan2` adalah bukti kedua, biasanya
pemetaan nomenklatur lama ke baru, dan ikut diverifikasi. Bila `hlm2` kosong dan kutipan2 berbunyi "PERPRES No. …",
yang dicek adalah relasi "Mencabut" di metadata BPK.

Kutipan disalin dari teks OCR apa adanya. Salah eja OCR seperti "Wilayih", "Ralryat", "4O." sengaja tidak dibetulkan
supaya tetap bisa dicocokkan. Saat dipindah ke naskah, kutip dari PDF resmi.

Semua baris berlabel **resmi** (peraturan perundang-undangan dan halaman instansi pemerintah). Paket ini tidak memuat
angka estimasi model maupun asumsi kebijakan.

## 2. Berkas keluaran

Semua CSV memakai UTF-8, pemisah koma, dan sel kosong berarti tidak ada nilai. `lembaga.json` mencerminkan semua tabel
(`tabel.<berkas>` = `{kolom, baris}`) ditambah `meta` (kode peran, daftar ancaman, aturan pencocokan).

| Berkas | Baris | Isi |
| --- | ---: | --- |
| `lembaga.csv` | 40 | Kode, nama resmi Okt 2026, singkatan, kelompok, Kemenko pengoordinasi, perpres lama yang dicabut, dasar hukum, kutipan tugas, unit terkait, status BPK |
| `peran.csv` | 112 | Satu baris = satu peran bersumber: lembaga × ancaman × fase × kode peran |
| `matriks_bencana.csv` | 88 | Turunan `peran.csv`: lembaga × ancaman, kolom `pra/saat/pasca/lintas` berisi `kode[id]` |
| `matriks_ringkas.csv` | 34 | Lembaga × 14 ancaman, sel berisi `fase:kode` (untuk tabel naskah) |
| `matriks_air.csv` | 30 | Komponen air × tingkat (pusat, provinsi, kab/kota, operator, lintas) × lembaga × wewenang |
| `klaster.csv` | 14 | Klaster nasional dua versi berdampingan: Kepka BNPB 173/2014 (8 klaster) dan 308/2024 (6 klaster) |
| `celah.csv` | 15 | Tumpang tindih, celah, nomenklatur usang, regulasi dicabut, masing-masing dengan bukti terverifikasi |
| `sumber.csv` | 76 | Setiap sumber yang dirujuk: judul, status BPK, relasi cabut/ubah, URL, SHA-1 PDF/HTML, tanggal akses, berkas teks |
| `lembaga.json` | – | Cermin semua tabel + meta |

**Kode peran:** K = koordinator atau penanggung jawab utama; P = pelaksana atau pendukung; R = penetap status, izin,
atau norma; I = informasi dan peringatan dini. **Fase:** `pra`, `saat` (tanggap darurat), `pasca`, `lintas` (norma
berlaku untuk semua fase). **Ancaman** (taksonomi UU 24/2007 Pasal 1): alam = gempa, tsunami, gunung api, banjir (termasuk
banjir bandang dan rob), longsor, cuaca ekstrem, gelombang ekstrem dan abrasi, kekeringan, karhutla; nonalam = epidemi,
gagal teknologi dan kebakaran industri, kebakaran TPA; sosial = konflik dan kerusuhan sosial; ditambah `semua` untuk
norma lintas jenis. Likuefaksi tidak dipisah dari gempa karena tidak ada mandat tersendiri di sumber yang dibaca.

## 3. Silsilah sumber

| Kelompok | Berkas mentah | Cara diperoleh | Tanggal | Label |
| --- | --- | --- | --- | --- |
| 64 peraturan pusat (41 Perpres, 15 UU, 6 PP, 2 Inpres) | `mentah/teks/<sid>.json.gz` (teks per halaman), `mentah/meta/<sid>.json` | Halaman Details `peraturan.bpk.go.id` (judul, status, relasi "Mencabut/Diubah dengan", URL PDF). PDF diunduh, SHA-1 dicatat, teks diekstrak dengan pymupdf `get_text()` di luar repo. Untuk 4 dokumen besar hanya halaman yang dikutip yang disimpan: UU 23/2014, UU 17/2023, UU 6/2023, PP 30/2024; untuk UU 6/2018 hanya hlm 1 (lihat `sumber.csv` kolom `halaman_disimpan`) | 23 Okt 2026 | resmi |
| Metadata saja | `mentah/meta/perpres-179-2024.json` | Bukti status "Tidak Berlaku" dan relasi pencabutnya (status UU 6/2018 juga dibaca dari metadatanya) | 23 Okt 2026 | resmi |
| 9 dokumen korpus JDIH: 7 peraturan/juklak BNPB, Perpres 17/2018, Perpres 46/2026 | `data/raw/hukum/teks/<slug>.json` + `indeks.json` (sid `jdih:<slug>`) | Korpus JDIH BNPB lokal | sesuai korpus | resmi |
| 2 halaman web instansi | `mentah/teks/web-*.json.gz` | HTML diambil dengan curl, tag dibuang, SHA-1 HTML dicatat: BPBD DIY (daftar 8 klaster SK 173), Dinas SDA DKI (NCICD) | 23 Okt 2026 | resmi |

**Nomenklatur diverifikasi tiga lapis.** (a) Tiap nama kementerian dan Kemenko di `lembaga.csv` wajib muncul verbatim di
daftar Pasal 2 Perpres 90/2025 (perubahan Perpres 140/2024, 49 kementerian). (b) Tiap dasar hukum organisasi wajib
berstatus "Berlaku" di BPK. (c) Kolom `dasar_hukum_lama_dicabut` wajib cocok dengan relasi "Mencabut" di metadata BPK
perpres barunya.

## 4. Penjelasan matriks

### 4.1 Kerangka umum (berlaku untuk semua jenis bencana)

- **Penanggung jawab dan status.** Pemerintah dan pemda sama-sama penanggung jawab (UU 24/2007 Pasal 5). Status keadaan
  darurat ditetapkan Presiden untuk tingkat nasional, gubernur untuk provinsi, dan bupati/wali kota untuk kabupaten/kota
  (Perpres 17/2018 Pasal 2).
- **BNPB** memberi pedoman dari pencegahan sampai rekonstruksi, memegang komando dan kemudahan akses saat darurat, serta
  memakai dana siap pakai (UU 24/2007 Pasal 12, 50, 62). Sejak Perpres 46/2026, BNPB juga dapat bertindak dalam "keadaan
  tertentu" untuk faktor alam, nonalam, dan sosial setelah rapat koordinasi yang dipimpin menko pembidang PB. Menurut
  Perpres 1/2019 Pasal 6, menko itu adalah Kemenko PMK.
- **Kemenko PMK** punya Deputi Bidang Koordinasi Penanggulangan Bencana dan Konflik Sosial (Perpres 144/2024 Pasal 24-26).
  Kemenko PMK juga dilibatkan dalam penetapan prioritas Dana Bersama (Perban 1/2026 Pasal 7).
- **Saat darurat, klaster nasional (Kepka BNPB 308/2024)** dikoordinasikan oleh: Basarnas (pencarian dan pertolongan),
  Kemensos (pengungsian dan perlindungan), BNPB (logistik), Kemenkes (kesehatan), kementerian pendidikan (pendidikan;
  di SK masih tertulis "Kementerian Pendidikan dan Kebudayaan"), dan Kemendagri (pemulihan). TNI dan Polri membantu
  lewat fungsi komando BNPB (Perpres 1/2019 Pasal 19; UU 3/2025; UU 5/2026).
- **Pasca:** Rencana rehabilitasi dan rekonstruksi skala nasional disusun BNPB, Bappenas, dan K/L terkait (Perban 5/2017
  Pasal 3). Rumah korban bencana adalah urusan perumahan: pusat (kini Kementerian PKP), provinsi, dan kab/kota sesuai
  skala (UU 23/2014 Lampiran).
- **Bantuan internasional** (Perban 6/2018 Pasal 17): Kemenkeu (kepabeanan), Kemlu (izin diplomatik), Kemenhub
  (transportasi), Kominfo (kini Komdigi), PUPR (kini PU dan PKP), ESDM, KLHK (kini Kemenhut dan KLH/BPLH).

### 4.2 Mandat per jenis bencana yang tertulis

| Ancaman | Pra (informasi, penetapan) | Saat | Pasca |
| --- | --- | --- | --- |
| Gempa, tsunami | BMKG: informasi gempa tektonik, peringatan dini tsunami (UU 31/2009 Pasal 32-33); ESDM/Badan Geologi: KRB geologi (UU 23/2014 Lamp. CC) | kerangka umum | kerangka umum |
| Gunung api | ESDM/Badan Geologi: status dan peringatan dini (UU 23/2014 Lamp. CC) | kerangka umum | kerangka umum |
| Banjir, rob | Kementerian PU/pemda: kawasan daya rusak air (PP 30/2024 Pasal 97); pengelolaan SDA dan pengaman pantai menurut wilayah sungai (UU 23/2014 Lamp. C); BOP Pantura Jawa: tanggul laut | PJT I/II: pengendalian banjir di wilayah kerja | kerangka umum |
| Longsor | ESDM/Badan Geologi: peringatan dini gerakan tanah; PU: kawasan daya rusak air | kerangka umum | kerangka umum |
| Cuaca ekstrem; gelombang | BMKG: peringatan dini (UU 31/2009 Pasal 33); KKP: mitigasi bencana laut; PU: pengaman pantai | kerangka umum | kerangka umum |
| Kekeringan | BMKG: iklim ekstrem, prakiraan musim; Kemenko Pangan dan Kementan: air untuk lahan pertanian | PU: SPAM bersifat khusus untuk bencana dan kekeringan (PP 122/2015) | kerangka umum |
| Karhutla (Inpres 3/2020) | BMKG (data asap/titik panas), BIG, BRIN (eks LAPAN), Kementan, ATR/BPN, Kemendes, PU (sekat kanal) | BNPB komando nasional; gubernur dan bupati sebagai komandan satgas; BPBD koordinator daerah; TNI, Polri, Basarnas; BMKG modifikasi cuaca | Kemenhut (kebakaran hutan) dan KLH/BPLH (kebakaran lahan, pemulihan lingkungan) |
| Epidemi | Kemenkes: Ditjen Penanggulangan Penyakit | Menteri Kesehatan menetapkan daerah terjangkit wabah; bupati, gubernur, atau Menteri menetapkan KLB (UU 17/2023 Pasal 353, 368) | kerangka umum |
| Gagal teknologi, kebakaran industri | Kemendagri: standardisasi damkar | Damkar kab/kota (UU 23/2014 Lamp. E); KLH/BPLH: bencana dampak B3 | kerangka umum |
| Kebakaran TPA | Kab/kota: sistem tanggap darurat pengelolaan sampah (UU 18/2008 Pasal 9); KLH: NSPK sampah | damkar kab/kota | kerangka umum |
| Konflik sosial | Kemenko PMK (deputi PB dan konflik sosial) | Kepala daerah atau Presiden menetapkan status konflik (UU 7/2012 Pasal 16-20); Polri mengoordinasikan bantuan TNI; satgas nasional termasuk BNPB | Pemerintah dan pemda memulihkan pascakonflik; BNPB untuk daerah pascakonflik berkapasitas fiskal rendah (Perpres 46/2026) |

### 4.3 Komponen air (UU 17/2019 jo. UU 6/2023, UU 23/2014, dan turunannya)

- **Prinsip pembagian:** wilayah sungai (WS) lintas negara, lintas provinsi, atau strategis nasional dipegang pusat;
  WS lintas kab/kota dipegang provinsi; WS dalam satu kab/kota dipegang kab/kota (UU 17/2019 Pasal 10-16). Sejak UU
  6/2023, tugas pusat dan daerah dijalankan menurut NSPK yang ditetapkan Pemerintah Pusat (Pasal 9 dan 12 diubah;
  Pasal 10, 11, dan 13-16 tidak diubah). Menteri dalam UU ini adalah menteri bidang SDA, yaitu Kementerian PU.
- **Air baku:** pusat, provinsi, dan kab/kota menurut WS. Pengelola SDA dapat berupa UPT (BBWS) atau BUMN/BUMD
  (UU 17/2019 Pasal 19): PJT I untuk Brantas dan Bengawan Solo, PJT II untuk Citarum.
- **Air minum (SPAM):** pusat menetapkan pengembangan SPAM nasional (Ditjen Cipta Karya); provinsi mengelola SPAM lintas
  kab/kota; kab/kota mengelola SPAM di wilayahnya. Penyelenggaranya BUMN/BUMD (PDAM), UPT/UPTD, kelompok masyarakat, atau
  badan usaha (PP 122/2015 Pasal 42).
- **Irigasi:** daerah irigasi di atas 3.000 ha dipegang pusat, 1.000-3.000 ha oleh provinsi, dan di bawah 1.000 ha oleh
  kab/kota (UU 23/2014 Lamp. C). Jaringan tersier ada di Kementan. Inpres 2/2025 membuat PU mengambil alih percepatan,
  lalu menyerahkan kembali lewat alih status atau hibah.
- **Waduk dan bendungan:** Menteri SDA membina keamanan bendungan. Rencana tindak darurat untuk gejala kegagalan bendungan
  dikonsultasikan ke bupati dan gubernur terdampak, dengan perangkat daerah urusan PB (BPBD) sebagai contoh instansi
  teknis yang diikutsertakan (PP 37/2010 Pasal 51-54 dan penjelasannya).
- **Air tanah:** pusat (ESDM/Badan Geologi) menetapkan cekungan air tanah dan zona konservasi CAT lintas provinsi;
  provinsi menetapkan zona CAT dalam provinsi dan menerbitkan izin air tanah (UU 23/2014 Lamp. CC). UU 17/2019 merumuskan
  zona konservasi berdasarkan WS (celah C07).
- **Penurunan muka tanah:** tidak ada pemegang tunggal (celah C06).

## 5. Tumpang tindih dan celah (ringkas `celah.csv`)

Ada 15 temuan. Empat dinyatakan sendiri oleh sumbernya (C01, C02, C03, C05). Sebelas disimpulkan penyusun dengan
membandingkan teks resmi yang dikutip.

1. **C01** Renstra BNPB 2025-2029 (mengutip NAR 2023): ketidakjelasan regulasi dan pembagian kewenangan menyebabkan tumpang tindih.
2. **C02** Renas PB 2025-2029: BTT dan DSP belum sinkron, TRC PB multisektor belum punya aturan, koordinasi SKPDB lemah.
3. **C03** Perban 2/2024 tidak menunjuk K/L penyedia peringatan dini per bahaya. Mandat tertulis hanya ditemukan untuk
   BMKG dan Badan Geologi. Untuk banjir dan kekeringan hidrologis tidak ada penyedia yang ditunjuk.
4. **C04** Inpres 3/2020 masih berlaku tetapi ditujukan ke KLHK, LAPAN, BPPT, Sekretaris Kabinet, dan lain-lain yang
   sudah tidak ada. Pengendalian kebakaran **hutan** kini di Kemenhut, kebakaran **lahan** di BPLH, dan modifikasi cuaca
   di BMKG.
5. **C05** Irigasi punya tiga pemegang kewenangan, ditambah pengambilalihan sementara oleh PU. Inpres 2/2025 sendiri
   mewajibkan pencegahan tumpang tindih.
6. **C06** Subsiden diatur dua rezim (PP 43/2008: menteri bidang air tanah; PP 30/2024: menteri SDA). Dewan Pengarah BOP
   Pantura Jawa tidak memuat ESDM maupun BNPB.
7. **C07** Dasar spasial kewenangan air tanah berbeda: CAT per provinsi (UU 23/2014) lawan CAT per WS (UU 17/2019).
8. **C08** Klaster berubah dari 8 menjadi 6. Klaster Sarana-Prasarana (PU) dan Ekonomi (Kementan) hilang, dan nama
   koordinator pendidikan sudah usang.
9. **C09** UU 6/2018 Kekarantinaan Kesehatan sudah **dicabut** oleh UU 17/2023. KERANGKA Bab 2 dan 8 serta riset A masih
   merujuknya dan perlu dikoreksi. Untuk epidemi kini ada dua rezim status (KLB/wabah lawan darurat bencana).
10. **C10** Konflik sosial diatur dua rezim (UU 7/2012 lawan UU 24/2007 jo. Perpres 46/2026). UU 7/2012 juga merujuk
    fungsi koordinasi politik-hukum-keamanan yang sudah terbelah.
11. **C11** Perpres 140/2024 jo. 90/2025 masih mendaftar Kementerian BUMN, padahal sudah diganti BP BUMN (Perpres
    105/2025). Pengelolaan BUMN kini di Danantara (UU 16/2025).
12. **C12** Unsur Pengarah BNPB (Perpres 1/2019) dan peran K/L bantuan internasional (Perban 6/2018) masih memakai nama lama.
13. **C13** Pesisir Jakarta punya tiga pelaku tanggul: PU, Pemprov DKI (trase 20,9 km), dan BOP Pantura Jawa.
14. **C14** Kebakaran industri tidak punya K/L penanggung jawab nasional yang tertulis.
15. **C15** Rantai peringatan dini melintasi tiga Kemenko: BMKG lewat Menhub (Kemenko IPK), BNPB (Kemenko PMK), Badan
    Geologi (Kemenko Perekonomian), dan PU (Kemenko IPK).

**Koreksi nomenklatur untuk KERANGKA dan riset:**

| Tertulis | Seharusnya |
| --- | --- |
| Kemenko Polhukam | Kemenko Bidang Politik dan Keamanan (Perpres 141/2024); hukum, HAM, imigrasi, dan pemasyarakatan kini Kemenko tersendiri (Perpres 142/2024) |
| Kominfo | Kementerian Komunikasi dan Digital |
| KLHK | Kementerian Kehutanan, dan Kementerian Lingkungan Hidup/Badan Pengendalian Lingkungan Hidup |
| PUPR | Kementerian PU, dan Kementerian PKP |
| Kementerian BUMN | BP BUMN dan Danantara |
| "Badan Otorita Pengelolaan Pantai Utara Jawa" | Badan Otorita **Pengelola** Pantai Utara Jawa (Perpres 77/2025) |
| UU 6/2018 | dicabut UU 17/2023 |

## 6. Keterbatasan dan data yang belum dibuka

- **Teks Kepka BNPB 308/2024 dan 173/2014 tidak dibuka.** Versi 2024 diambil dari Juklak 16/2025. Versi 2014 diambil dari
  halaman BPBD DIY (8 Jul 2019), yang menulis tahunnya "2015". Belum diketahui apakah SK 308/2024 mencabut SK 173/2014.
- **Hanya halaman yang dikutip yang disimpan** untuk UU 23/2014, UU 17/2023, UU 6/2023, dan PP 30/2024. Teks lengkapnya
  dapat diunduh ulang dari URL PDF di `sumber.csv`, dengan SHA-1 sebagai pembanding.
- **Belum dibaca:** PP 21/2008 dan PP 22/2008 (rincian DSP dan peran Kemenkeu); Perpres 75/2021 (Dana Bersama; peran
  Kemenkeu/BPDLH belum dikutip dari teks primer); Permendagri 101/2018 (SPM sub-urusan bencana); isi Perpres 112/2025
  (KKP) dan Perpres 16/2026 (Kemenhub); Permen PU 1/2025 (struktur BBWS 2026); PP 28/2025 (perizinan air tanah setelah
  Cipta Kerja). Karena PP 28/2025 belum dibaca, siapa penerbit izin air tanah per Okt 2026 masih bergantung pada UU
  23/2014. Riset B mencatat Kepmen ESDM 291.K/2023 (sekunder), yang mungkin mengubah gambaran ini.
- **Kemenperin, Kemnaker, dan Kemenkumham/Imigrasi tidak dimasukkan** karena peran PB-nya tidak ditemukan di teks yang
  dibaca. Ini bukan bukti bahwa peran itu tidak ada.
- **Pemetaan nomenklatur lama ke baru** di `sid2` adalah pewarisan fungsi menurut perpres organisasi yang baru, bukan
  penetapan resmi pewaris tugas Inpres atau Perban. Inpres 3/2020 dan Perban 6/2018 belum disesuaikan.
- Perpres 46/2026 tidak menyebut nama Kemenko. Pemetaannya ke Kemenko PMK memakai Perpres 1/2019 Pasal 6.
- Matriks hanya memuat mandat yang **tertulis**. Sel kosong berarti mandat tidak ditemukan di sumber yang dibaca, bukan
  bahwa lembaga itu tidak berperan dalam praktik.
- Invarian "514 kab/kota" dan "119 kab/kota Jawa" tidak berlaku untuk paket ini karena tidak ada data per wilayah.
  Penggantinya: 8 klaster (2014) dan 6 klaster (2024), 49 entri daftar kementerian Perpres 90/2025, nama tiap kementerian
  ada di daftar itu, semua dasar hukum organisasi berstatus Berlaku, tiap jenis ancaman punya minimal satu peran K/R/I,
  tiap komponen air terisi, dan status pencabutan UU 6/2018 serta Perpres 179/2024 masih seperti yang dicatat.
