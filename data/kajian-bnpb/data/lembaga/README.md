# Paket `lembaga`: matriks lembaga dan tugas per fase (nomenklatur per 23 Oktober 2026)

Bahan untuk Bab 9 Kajian Air Jawa dan Bab 12 Kajian Mitigasi ("matriks lembaga dan tugas per fase", KERANGKA prinsip 6
dan 11). Isinya: siapa lembaganya dengan nama resmi terkini, siapa pengoordinasinya, apa dasar hukumnya, peran tiap
lembaga per jenis bencana dan per fase, kewenangan per komponen air, klaster nasional, serta titik tumpang tindih dan
celah kewenangan.

**Membangun ulang:** `python3 data/kajian-bnpb/bangun/lembaga.py` (Python 3 stdlib, beberapa detik, tanpa jaringan,
tanpa berkas di luar repo). Skrip menulis semua berkas di folder ini, lalu menjalankan self-check `assert`. Bila satu
invarian rusak, skrip keluar dengan kode non-nol. Keluaran terakhir yang benar: "self-check hijau".

## 1. Aturan sel bersumber

Tiap baris di `lembaga.csv`, `peran.csv`, `matriks_air.csv`, `klaster.csv`, dan `celah.csv` membawa `sid` (kunci
sumber), `hlm`, dan `kutipan`. Skrip **menolak jalan** bila kutipan tidak ditemukan di teks sumber yang disimpan pada
halaman yang disebut. Cara mencocokkan: spasi dibuang dan huruf dikecilkan. Kutipan yang dipisah " … " berarti
beberapa potongan yang semuanya wajib ada di halaman itu. Kolom `sid2/hlm2/kutipan2` adalah bukti kedua, biasanya
pemetaan nomenklatur lama ke baru, dan ikut diverifikasi. Bila `hlm2` kosong dan kutipan2 berbunyi "PERPRES No. …",
yang dicek adalah relasi "Mencabut" di metadata BPK.

**`hlm` = indeks halaman PDF berbasis 1.** Nomor cetak di halaman bisa berbeda: UU 23/2014 hlm 322 adalah lampiran
bercetak "-9-", Perban 2/2024 hlm 5 bercetak "-6-". Saat dipindah ke naskah, kutip dari PDF resmi dan sebut nomor
pasal/huruf, bukan nomor halaman ini.

Kutipan disalin dari teks OCR apa adanya. Salah eja OCR seperti "Wilayih", "Ralryat", "4O.", "perencan€an" sengaja
tidak dibetulkan supaya tetap bisa dicocokkan.

**Gerbang yang dijalankan skrip** (fungsi `_uji_penolakan` membuktikan tiap gerbang benar-benar menolak, setiap kali
jalan):

1. Kutipan palsu dan halaman salah ditolak.
2. Teks sumber yang dikutip wajib berstatus **Berlaku** di BPK/JDIH. UU 6/2018 dan Perpres 179/2024 (tidak berlaku)
   hanya boleh muncul sebagai bukti relasi, teksnya tidak boleh dikutip.
3. **Dicabut sebagian.** Untuk sumber berelasi "Dicabut sebagian dengan" (UU 23/2014, UU 17/2019), bagian yang dicabut
   dicatat di `DICABUT_SEBAGIAN` dan kutipan yang bertumpang dengannya ditolak. Tiap UU pencabut yang tertulis di
   metadata BPK wajib punya entri. Kutipan UU 23/2014 hanya boleh dari halaman yang sudah diperiksa bebas dari pasal
   yang dicabut UU 1/2022.
4. Kolom `dikoordinasikan_oleh` wajib berkutipan (`koordinasi_sid/hlm/kutipan`). Nilai "-" wajib dibuktikan dengan
   "bertanggung jawab kepada Presiden" dari dasar hukumnya sendiri, dan dokumen itu tidak boleh memuat klausul
   koordinasi. Gerbang ini yang menangkap kesalahan versi sebelumnya untuk BIG dan Basarnas.
5. Baris yang normanya menyebut nomenklatur lama atau pelaku umum ("Pemerintah Pusat", "Menteri adalah …",
   "kementerian yang membidangi …") wajib ditandai `jenis_bukti = dipetakan penyusun` dan bercatatan.
6. Jumlah klaster (8 dan 6) dan daftar 49 kementerian Perpres 90/2025 dihitung dari teks sumber, bukan dari tabel.
   Daftar Perban 6/2018 Pasal 17 ayat (2) dicek terbaca lengkap huruf a-w.

**Label.** Peraturan dan halaman instansi pemerintah berlabel **resmi**. Satu sumber, berita media suarapemerintah.id
(dipakai hanya untuk tahun SK klaster), berlabel **terverifikasi** dan ditandai sekunder di `sumber.csv`. Paket ini
tidak memuat angka estimasi model maupun asumsi kebijakan.

**`jenis_bukti`** (kolom di `peran.csv` dan `matriks_air.csv`): `tertulis` = norma menyebut lembaga itu;
`dipetakan penyusun` = norma menyebut pelaku umum, fungsi, atau nama lama, atau penggolongan ke jenis ancaman adalah
tafsiran penyusun. Alasannya ada di kolom `catatan` ("Pemetaan penyusun: …"). Di naskah, sel pemetaan wajib diberi
tanda inferensi. Saat ini 53 dari 127 baris peran dan 8 dari 31 baris air berjenis pemetaan.

## 2. Berkas keluaran

Semua CSV memakai UTF-8, pemisah koma, dan sel kosong berarti tidak ada nilai. `lembaga.json` mencerminkan semua tabel
(`tabel.<berkas>` = `{kolom, baris}`) ditambah `meta` (kode peran, jenis bukti, daftar ancaman, aturan pencocokan).

| Berkas | Baris | Isi |
| --- | ---: | --- |
| `lembaga.csv` | 40 | Kode, nama resmi Okt 2026, singkatan, kelompok, pengoordinasi + kutipan buktinya, perpres lama yang dicabut, dasar hukum, kutipan tugas, unit terkait, status BPK |
| `peran.csv` | 127 | Satu baris = satu peran bersumber: lembaga × ancaman × fase × kode peran, dengan `jenis_bukti` |
| `matriks_bencana.csv` | 90 | Turunan `peran.csv`: lembaga × ancaman, kolom `pra/saat/pasca/lintas` berisi `kode[id]` |
| `matriks_ringkas.csv` | 34 | Lembaga × 14 ancaman, sel berisi `fase:kode` (untuk tabel naskah) |
| `matriks_air.csv` | 31 | Komponen air × tingkat (pusat, provinsi, kab/kota, operator, lintas) × lembaga × wewenang, dengan `jenis_bukti` |
| `klaster.csv` | 14 | Klaster nasional dua versi berdampingan: Kepka BNPB 173 (2014/2015; 8 klaster) dan 308/2024 (6 klaster), dengan `jenis_sumber` |
| `celah.csv` | 17 | Tumpang tindih, celah, nomenklatur usang, regulasi dicabut, masing-masing dengan bukti terverifikasi |
| `sumber.csv` | 78 | Setiap sumber yang dirujuk: judul, status, jenis sumber, relasi cabut/ubah, URL, SHA-1 PDF/HTML, tanggal akses, berkas teks, halaman disimpan |
| `lembaga.json` | – | Cermin semua tabel + meta |

**Kolom `dikoordinasikan_oleh`:** Kemenko atau menteri pengoordinasi menurut perpres organisasi; untuk BPBD dan BUMD
SPAM diisi pemerintah daerah induknya; "-" berarti berada di bawah dan bertanggung jawab langsung kepada Presiden tanpa
klausul koordinasi (atau tidak relevan untuk Presiden, Pemerintah Pusat, pemda, dan BUMN).

**Kode peran:** K = koordinator atau penanggung jawab utama; P = pelaksana atau pendukung; R = penetap status, izin,
atau norma; I = informasi dan peringatan dini. **Fase:** `pra`, `saat` (tanggap darurat), `pasca`, `lintas` (norma
berlaku untuk semua fase). **Ancaman** adalah taksonomi kajian yang berpijak pada UU 24/2007 Pasal 1 angka 2-4: alam =
gempa, tsunami, gunung api, banjir (termasuk banjir bandang dan rob), longsor, cuaca ekstrem, gelombang ekstrem dan
abrasi, kekeringan, karhutla; nonalam = epidemi, gagal teknologi dan kebakaran industri, kebakaran TPA; sosial =
konflik dan kerusuhan sosial; ditambah `semua` untuk norma lintas jenis. Karhutla, gelombang/abrasi, dan kebakaran TPA
adalah kategori kajian, bukan kategori yang disebut Pasal 1. Teror (Pasal 1 angka 4) dan likuefaksi tidak dipisah;
alasannya di §6.

## 3. Silsilah sumber

| Kelompok | Berkas mentah | Cara diperoleh | Tanggal | Label |
| --- | --- | --- | --- | --- |
| 65 peraturan pusat dengan teks (41 Perpres, 15 UU, 6 PP, 2 Inpres, 1 Permen PUPR) | `mentah/teks/<sid>.json.gz` (teks per halaman), `mentah/meta/<sid>.json` | Halaman Details `peraturan.bpk.go.id` (judul, status, relasi "Mencabut/Dicabut sebagian/Diubah dengan", URL PDF). PDF diunduh, SHA-1 dicatat, teks per halaman = `page.get_text()` pymupdf | 23 Okt 2026 | resmi |
| Metadata saja | `mentah/meta/perpres-179-2024.json` | Bukti status "Tidak Berlaku" dan relasi pencabutnya | 23 Okt 2026 | resmi |
| 9 dokumen JDIH BNPB: 7 peraturan/juklak BNPB, Perpres 17/2018, Perpres 46/2026 | `mentah/teks/jdih-<slug>.json.gz`, `mentah/meta/jdih-<slug>.json` (sid `jdih:<slug>`) | Disalin dari korpus JDIH lokal `data/raw/hukum/teks/` (gitignore; dibuat `scripts/bnpb/hukum.py teks`: pdftotext + tesseract; kontrak `docs/bnpb/HUKUM.md`). Meta menyimpan entri `indeks.json`, SHA-1 teks, SHA-1 PDF lokal, dan tanggal salin | disalin 23 Okt 2026 | resmi |
| 3 halaman web | `mentah/teks/web-*.json.gz` | HTML diambil, `<script>/<style>` dan tag dibuang, spasi dirapatkan, SHA-1 HTML dicatat: BPBD DIY (daftar 8 klaster SK 173; berita instansi, sekunder), Dinas SDA DKI (progres NCICD), suarapemerintah.id (tahun SK 173; berita media, sekunder) | 23 Okt 2026 | resmi; suarapemerintah: terverifikasi |

**Skrip ekstraksi:** `bangun/ekstrak_lembaga.py` (butuh jaringan; perintah PDF butuh pymupdf, mis. venv):

```
<python-ber-pymupdf> data/kajian-bnpb/bangun/ekstrak_lembaga.py bpk <sid> <url Details BPK> [hlm]   # sumber baru
<python-ber-pymupdf> data/kajian-bnpb/bangun/ekstrak_lembaga.py halaman <sid> <hlm>                 # tambah halaman
<python-ber-pymupdf> data/kajian-bnpb/bangun/ekstrak_lembaga.py uji <sid> <hlm>                     # ekstrak ulang, bandingkan
python3 data/kajian-bnpb/bangun/ekstrak_lembaga.py web <sid> <url>
python3 data/kajian-bnpb/bangun/ekstrak_lembaga.py jdih <slug>
```

`halaman` dan `uji` mengunduh ulang PDF dari `pdf_url` dan menolak jalan bila SHA-1-nya berbeda dari yang tercatat.
Sebagian besar teks di `mentah/` diekstrak sebelum skrip ini ada, dengan aturan yang sama. Kesamaannya diuji:
`uji pp-30-2024 1,65,66` menghasilkan teks identik dengan yang tersimpan, dan halaman 64 PP 30/2024 serta Permen PUPR
14/2015 diekstrak dengan skrip ini. HTML mentah tidak disimpan, hanya SHA-1-nya.

**Penyimpanan parsial** (hanya halaman yang dikutip atau diperiksa; lihat `sumber.csv` kolom `halaman_disimpan`):
UU 23/2014 [1, 2, 322, 323, 329, 332, 333, 361, 435, 436], UU 17/2023 [1, 10, 17, 52, 155, 156, 162], UU 6/2023
[1, 2, 365-380], PP 30/2024 [1-8, 64-66], Perpres 140/2024 [1-4], UU 6/2018 [1]. Dokumen lain disimpan utuh. Teks
lengkap dapat diunduh ulang dari URL PDF di `sumber.csv`, dengan SHA-1 sebagai pembanding.

**Nomenklatur diverifikasi tiga lapis.** (a) Tiap nama kementerian dan Kemenko di `lembaga.csv` wajib muncul verbatim di
daftar Pasal 2 Perpres 90/2025 (perubahan Perpres 140/2024), yang dihitung skrip berisi tepat 49 entri. (b) Tiap dasar
hukum organisasi wajib berstatus "Berlaku" di BPK. (c) Kolom `dasar_hukum_lama_dicabut` wajib cocok dengan relasi
"Mencabut" di metadata BPK perpres barunya.

## 4. Penjelasan matriks

### 4.1 Kerangka umum (berlaku untuk semua jenis bencana)

- **Penanggung jawab dan status.** Pemerintah dan pemda sama-sama penanggung jawab (UU 24/2007 Pasal 5). Status keadaan
  darurat ditetapkan Presiden untuk tingkat nasional, gubernur untuk provinsi, dan bupati/wali kota untuk kabupaten/kota
  (Perpres 17/2018 Pasal 2).
- **BNPB** memberi pedoman dari pencegahan sampai rekonstruksi, memegang komando dan kemudahan akses saat darurat, serta
  memakai dana siap pakai (UU 24/2007 Pasal 12, 50, 62). Sejak Perpres 46/2026, BNPB juga dapat bertindak dalam "keadaan
  tertentu" untuk faktor alam, nonalam, dan sosial setelah rapat koordinasi yang dipimpin menko pembidang PB. Perpres
  46/2026 tidak menyebut nama menko itu; penyusun memetakannya ke Kemenko PMK lewat Perpres 1/2019 Pasal 6.
- **Kemenko PMK** punya Deputi Bidang Koordinasi Penanggulangan Bencana dan Konflik Sosial (Perpres 144/2024 Pasal 24-26).
  Kemenko PMK juga dilibatkan dalam penetapan prioritas Dana Bersama (Perban 1/2026 Pasal 7).
- **Saat darurat, klaster nasional (Kepka BNPB 308/2024)** dikoordinasikan oleh: Basarnas (pencarian dan pertolongan),
  Kemensos (pengungsian dan perlindungan), BNPB (logistik), Kemenkes (kesehatan), kementerian pendidikan (pendidikan;
  di SK masih tertulis "Kementerian Pendidikan dan Kebudayaan"), dan Kemendagri (pemulihan). TNI dan Polri membantu
  lewat fungsi komando BNPB (Perpres 1/2019 Pasal 19; UU 3/2025; UU 5/2026).
- **Pasca:** Rencana rehabilitasi dan rekonstruksi skala nasional disusun BNPB, Bappenas, dan K/L terkait (Perban 5/2017
  Pasal 3). Rumah korban bencana adalah urusan perumahan: pusat (kini Kementerian PKP, pemetaan penyusun), provinsi, dan
  kab/kota sesuai skala (UU 23/2014 Lampiran).
- **Bantuan internasional** (Perban 6/2018 Pasal 17 ayat (2)) membagi peran ke **23 K/L (huruf a-w)**. Yang dimasukkan
  ke `peran.csv` hanya lembaga yang sudah ada di `lembaga.csv`: TNI (a, "Kementerian Pertahanan dan Mabes TNI"), Polri
  (b), Kemenkes (c), Kementan (d), Kemensos (e), Kemenhut dan KLH/BPLH (f, alamat KLHK), Kemenkeu (h), Kemlu (i),
  Kemendagri melalui pemda/BPBD (k), Kemenhub (l), Komdigi (m, alamat Kominfo), Kementerian PU (n, alamat PUPR), ESDM
  (o), BMKG (p), Basarnas (s), BRIN (u dan v, alamat LAPAN dan BPPT), dan BIG (w). Yang tidak dimasukkan sebagai lembaga:
  Kementerian Hukum dan HAM (g; kini dipecah, pewaris visa/izin tinggal Kementerian Imigrasi dan Pemasyarakatan, C12),
  Kemendag (j), Bapeten (q), BIN (r), dan BPOM (t). Kriterianya di §6.

### 4.2 Mandat per jenis bencana yang tertulis

| Ancaman | Pra (informasi, penetapan) | Saat | Pasca |
| --- | --- | --- | --- |
| Gempa, tsunami | BMKG: informasi gempa tektonik, peringatan dini tsunami (UU 31/2009 Pasal 32-33, pelakunya "Badan"); ESDM/Badan Geologi: KRB geologi (UU 23/2014 Lamp. CC, bagian yang masih berlaku) | kerangka umum | kerangka umum |
| Gunung api | ESDM/Badan Geologi: status dan peringatan dini (UU 23/2014 Lamp. CC kolom 3 huruf d) | kerangka umum | kerangka umum |
| Banjir, rob | Kementerian PU/pemda: kawasan daya rusak air (PP 30/2024 Pasal 97) dan **penetapan sistem peringatan dini pada setiap WS** (PP 30/2024 Pasal 96 ayat (1) huruf b; pelaku per Pasal 94 ayat (5), pemetaan penyusun); pengelolaan SDA dan pengaman pantai menurut wilayah sungai (UU 23/2014 Lamp. C huruf a); BOP Pantura Jawa: tanggul laut | PJT I/II: pengendalian banjir di wilayah kerja | kerangka umum |
| Longsor | ESDM/Badan Geologi: peringatan dini gerakan tanah; PU: kawasan daya rusak air | kerangka umum | kerangka umum |
| Cuaca ekstrem; gelombang | BMKG: peringatan dini (UU 31/2009 Pasal 33); KKP: mitigasi bencana laut; PU: pengaman pantai | kerangka umum | kerangka umum |
| Kekeringan | BMKG: iklim ekstrem, prakiraan musim; Kemenko Pangan dan Kementan: air untuk lahan pertanian (penggolongan ke kekeringan = tafsiran penyusun) | PU: SPAM bersifat khusus untuk bencana dan kekeringan (PP 122/2015) | kerangka umum |
| Karhutla (Inpres 3/2020) | BMKG (data asap/titik panas), BIG, BRIN (eks LAPAN), Kementan, ATR/BPN, Kemendes, PU (sekat kanal) | BNPB komando nasional; gubernur dan bupati sebagai komandan satgas; BPBD koordinator daerah; TNI, Polri, Basarnas; BMKG modifikasi cuaca; bantuan internasional Kemenhut/KLH-BPLH | Kemenhut (kebakaran hutan) dan KLH/BPLH (kebakaran lahan, pemulihan lingkungan) |
| Epidemi | Kemenkes: Ditjen Penanggulangan Penyakit | Menteri Kesehatan menetapkan daerah terjangkit wabah; bupati, gubernur, atau Menteri menetapkan KLB (UU 17/2023) | kerangka umum |
| Gagal teknologi, kebakaran industri | Kemendagri: standardisasi damkar (pemetaan penyusun) | Damkar kab/kota (UU 23/2014 Lamp. E); KLH/BPLH: bencana dampak B3 | kerangka umum |
| Kebakaran TPA | Kab/kota: sistem tanggap darurat pengelolaan sampah (UU 18/2008 Pasal 9); KLH: NSPK sampah (penggolongan ke kebakaran TPA = tafsiran penyusun) | damkar kab/kota | kerangka umum |
| Konflik sosial | Kemenko PMK (deputi PB dan konflik sosial) | Kepala daerah atau Presiden menetapkan status konflik (UU 7/2012 Pasal 16-20); Polri mengoordinasikan bantuan TNI; satgas nasional termasuk BNPB, kementerian koordinasi polhukam dan kesra | Pemerintah dan pemda memulihkan pascakonflik; BNPB untuk daerah pascakonflik berkapasitas fiskal rendah (Perpres 46/2026) |

### 4.3 Komponen air (UU 17/2019 jo. UU 6/2023, UU 23/2014, dan turunannya)

- **Prinsip pembagian:** wilayah sungai (WS) lintas negara, lintas provinsi, atau strategis nasional dipegang pusat;
  WS lintas kab/kota dipegang provinsi; WS dalam satu kab/kota dipegang kab/kota (UU 17/2019 Pasal 10-16). Sejak UU
  6/2023, tugas pusat dan daerah dijalankan menurut NSPK yang ditetapkan Pemerintah Pusat (Pasal 9, 12, 17, 19 diubah;
  Pasal 10, 11, dan 13-16 tidak diubah). Menteri dalam UU ini adalah menteri bidang SDA, yaitu Kementerian PU.
- **Penting: UU 23/2014 Lampiran C dan CC sebagian sudah dicabut** oleh UU 17/2019 Pasal 77 (C16): SDA kolom 3-5 huruf
  b (irigasi) dan Geologi kolom 3 huruf a (penetapan cekungan air tanah), kolom 4 huruf b (izin air tanah oleh
  provinsi), dan kolom 5. Yang masih berlaku: SDA huruf a, Geologi kolom 3 huruf b-g dan kolom 4 huruf a dan c.
- **Air baku:** pusat, provinsi, dan kab/kota menurut WS. Pengelola SDA dapat berupa UPT (BBWS) atau BUMN/BUMD
  (UU 17/2019 Pasal 19, bunyi ayat (2) sama setelah UU 6/2023): PJT I untuk Brantas dan Bengawan Solo, PJT II untuk Citarum.
- **Air minum (SPAM):** pusat menetapkan pengembangan SPAM nasional (Ditjen Cipta Karya); provinsi mengelola SPAM lintas
  kab/kota; kab/kota mengelola SPAM di wilayahnya. Penyelenggaranya BUMN/BUMD (PDAM), UPT/UPTD, kelompok masyarakat, atau
  badan usaha (PP 122/2015).
- **Irigasi:** UU 17/2019 membagi sistem irigasi menurut daerah irigasi yang menjadi kewenangan pusat, provinsi, dan
  kab/kota (Pasal 10 huruf i, 13 huruf h, 15 huruf d), dan Pemerintah Pusat menetapkan status daerah irigasi (Pasal 11
  huruf f). Ambang luasnya (pusat lebih dari 3000 ha serta DI lintas provinsi/negara/strategis; provinsi 1000-3000 ha dan
  lintas kab/kota; kab/kota kurang dari 1000 ha) kini tertulis di **Permen PUPR 14/PRT/M/2015** Pasal 8-11 (BPK:
  Berlaku). UU 23/2014 tidak lagi menjadi dasarnya. Jaringan tersier ada di Kementan. Inpres 2/2025 membuat PU mengambil
  alih percepatan, lalu menyerahkan kembali lewat alih status atau hibah. **Inpres 2/2025 menyasar 14 provinsi di luar
  Jawa; Jawa hanya tercakup lewat klausul "provinsi lain yang perlu ditingkatkan kinerja jaringan irigasi".**
- **Waduk dan bendungan:** Menteri SDA menangani keamanan bendungan, dibantu instansi teknis keamanan bendungan, dan
  memberi persetujuan desain (PP 37/2010 Pasal 1 angka 10, Pasal 24). Rencana tindak darurat (RTD) **disusun Pembangun
  bendungan dan ditetapkan Pemilik bendungan** (Pasal 52, 54); Pemilik bisa Pemerintah, pemda, atau badan usaha (Pasal 1
  angka 6). RTD dikonsultasikan ke bupati dan gubernur terdampak (Pasal 53), dengan perangkat daerah urusan PB (BPBD)
  sebagai contoh instansi teknis yang diikutsertakan (penjelasan).
- **Air tanah:** pusat (ESDM/Badan Geologi, pemetaan penyusun) menetapkan zona konservasi CAT lintas provinsi/negara;
  provinsi menetapkan zona CAT dalam provinsi (UU 23/2014 Lamp. CC kolom 3 huruf b dan kolom 4 huruf a). UU 17/2019
  merumuskan zona konservasi berdasarkan WS (C07). **Penerbit izin air tanah per Okt 2026 belum pasti**: kewenangan izin
  provinsi di UU 23/2014 sudah dicabut, sementara PP 28/2025 dan Kepmen ESDM 291.K/2023 belum dibaca. Jangan dianggap
  provinsi secara default.
- **Penurunan muka tanah:** tidak ada pemegang tunggal (C06).

## 5. Tumpang tindih dan celah (ringkas `celah.csv`)

Ada 17 temuan. Tiga dinyatakan sendiri oleh sumbernya (C01, C02, C03). Empat belas disimpulkan penyusun dengan
membandingkan teks resmi yang dikutip.

1. **C01** Renstra BNPB 2025-2029 (mengutip NAR 2023): ketidakjelasan regulasi dan pembagian kewenangan menyebabkan tumpang tindih.
2. **C02** Renas PB 2025-2029: BTT dan DSP belum sinkron, TRC PB multisektor belum punya aturan, koordinasi SKPDB lemah.
3. **C03** Renas PB 2025-2029: regulasi peringatan dini, terutama multiancaman, belum optimal. Rincian per bahaya ada di C17.
4. **C04** Inpres 3/2020 masih berlaku tetapi ditujukan ke KLHK, LAPAN, BPPT, Sekretaris Kabinet, dan lain-lain yang
   sudah tidak ada. Pengendalian kebakaran **hutan** kini di Kemenhut, kebakaran **lahan** di BPLH, dan modifikasi cuaca
   di BMKG.
5. **C05** Irigasi punya tiga tingkat kewenangan per daerah irigasi, jaringan tersier Kementan, dan pengambilalihan
   sementara oleh PU. Inpres 2/2025 memerintahkan pencegahan tumpang tindih tetapi tidak menyatakan tumpang tindih sudah
   terjadi; Inpres itu menyasar 14 provinsi luar Jawa.
6. **C06** Subsiden diatur dua rezim (PP 43/2008: menteri bidang air tanah; PP 30/2024: menteri SDA). ESDM dan BNPB tidak
   duduk di Dewan Pengarah BOP Pantura Jawa, tetapi pengoordinasi keduanya (Menko Perekonomian dan Menko PMK) duduk sebagai
   Wakil Ketua.
7. **C07** Dasar spasial kewenangan air tanah berbeda: CAT per provinsi (UU 23/2014) lawan CAT per WS (UU 17/2019).
8. **C08** Klaster berubah dari 8 (SK 173) menjadi 6 (SK 308/2024). Klaster Sarana-Prasarana (PU) dan Ekonomi (Kementan)
   hilang, dan nama koordinator pendidikan sudah usang.
9. **C09** UU 6/2018 Kekarantinaan Kesehatan sudah **dicabut** oleh UU 17/2023. KERANGKA Bab 2 dan 8 serta riset A masih
   merujuknya dan perlu dikoreksi. Untuk epidemi kini ada dua rezim status (KLB/wabah lawan darurat bencana).
10. **C10** Konflik sosial diatur dua rezim (UU 7/2012 lawan UU 24/2007 jo. Perpres 46/2026). Satgas UU 7/2012 merujuk
    fungsi koordinasi polhukam yang sudah terbelah dan fungsi koordinasi kesra (kini Kemenko PMK).
11. **C11** Perpres 140/2024 jo. 90/2025 masih mendaftar Kementerian BUMN, padahal sudah diganti BP BUMN (Perpres
    105/2025). Pengelolaan BUMN kini di Danantara (UU 16/2025).
12. **C12** Unsur Pengarah BNPB (Perpres 1/2019) dan peran 23 K/L bantuan internasional (Perban 6/2018) masih memakai nama
    lama, termasuk Kemenkumham (kini tiga kementerian), LAPAN, dan BPPT.
13. **C13** Pesisir Jakarta punya tiga pelaku tanggul: PU, Pemprov DKI, dan BOP Pantura Jawa. Data NCICD: trase DKI 20,9
    km, terbangun 9,4 km, sisa 11,5 km per 17 Jul 2025; total Fase A 39 km (PU + DKI). Data kedaluwarsa sekitar 15 bulan.
14. **C14** Kebakaran industri: K/L penanggung jawab nasional belum ditemukan di sumber yang dibaca. Rezim keselamatan sektoral (UU 1/1970, UU 3/2014, keselamatan operasi migas) belum dibaca, jadi celah ini bukan simpulan ketiadaan norma (KERANGKA M06).
15. **C15** Rantai peringatan dini dan pertolongan melintasi tiga Kemenko: BMKG dan Basarnas lewat menteri perhubungan
    (Kemenko IPK), PU (Kemenko IPK), BNPB (Kemenko PMK), Badan Geologi (Kemenko Perekonomian).
16. **C16** UU 23/2014 Lampiran C (ambang irigasi) dan CC (penetapan cekungan dan izin air tanah) sebagian dicabut UU
    17/2019 Pasal 77. KERANGKA/riset yang memakai ambang 3000/1000 ha dari UU 23/2014 (riset B §4.1, versi awal paket ini)
    perlu dikoreksi; ambang yang berlaku dikutip dari Permen PUPR 14/2015.
17. **C17** Penyedia peringatan dini per bahaya: banjir punya mandat di rezim SDA (penetapan sistem peringatan dini pada
    setiap WS, PP 30/2024 Pasal 96) tetapi tidak dihubungkan ke Perban 2/2024 dan platform BNPB, dan pelakunya di antara
    pemegang tanggung jawab Pasal 94 ayat (5) tidak ditentukan. Untuk kekeringan hidrologis tidak ditemukan penyedia yang
    ditunjuk.

**Koreksi untuk KERANGKA dan riset:**

| Tertulis | Seharusnya |
| --- | --- |
| Kemenko Polhukam | Kemenko Bidang Politik dan Keamanan (Perpres 141/2024); hukum, HAM, imigrasi, dan pemasyarakatan kini Kemenko tersendiri (Perpres 142/2024) |
| Kominfo | Kementerian Komunikasi dan Digital |
| KLHK | Kementerian Kehutanan, dan Kementerian Lingkungan Hidup/Badan Pengendalian Lingkungan Hidup |
| PUPR | Kementerian PU, dan Kementerian PKP |
| Kemenkumham | Kementerian Hukum, Kementerian HAM, Kementerian Imigrasi dan Pemasyarakatan (Perpres 90/2025 no. 14-16) |
| Kementerian BUMN | BP BUMN dan Danantara |
| "Badan Otorita Pengelolaan Pantai Utara Jawa" | Badan Otorita **Pengelola** Pantai Utara Jawa (Perpres 77/2025) |
| UU 6/2018 | dicabut UU 17/2023 |
| Ambang irigasi 3000/1000 ha "menurut UU 23/2014" | ketentuan itu dicabut UU 17/2019 Pasal 77; ambang kini dari Permen PUPR 14/PRT/M/2015 |
| Izin air tanah "oleh provinsi (UU 23/2014)" | dicabut UU 17/2019 Pasal 77; penerbit izin per Okt 2026 belum pasti |
| BIG dan Basarnas "langsung di bawah Presiden" | BIG dikoordinasikan menteri PPN (Perpres 128/2022 Pasal 5); Basarnas dikoordinasikan menteri perhubungan (Perpres 83/2016 Pasal 5) |

## 6. Keterbatasan dan data yang belum dibuka

- **Teks Kepka BNPB 308/2024 dan Kepka 173 tidak dibuka.** Versi 2024 diambil dari Juklak 16/2025. Versi lama diambil
  dari berita BPBD DIY (8 Jul 2019), yang menulis "Nomor 173 Tahun 2015"; berita suarapemerintah.id (5 Jul 2024)
  mengutip Direktur BNPB "Nomor 173 Tahun 2014". Keduanya sekunder dan disimpan berdampingan; versi diberi nama "Kepka
  BNPB 173 (2014/2015)". Belum diketahui apakah SK 308/2024 mencabut SK 173.
- **Hanya halaman yang dikutip yang disimpan** untuk enam dokumen besar (§3).
- **Belum dibaca:** PP 21/2008 dan PP 22/2008 (rincian DSP dan peran Kemenkeu); Perpres 75/2021 (Dana Bersama; peran
  Kemenkeu/BPDLH belum dikutip dari teks primer); Permendagri 101/2018 (SPM sub-urusan bencana); isi Perpres 112/2025
  (KKP) dan Perpres 16/2026 (Kemenhub); Permen PU 1/2025 (struktur BBWS 2026); **PP 28/2025 dan Kepmen ESDM 291.K/2023
  (perizinan air tanah)**, sehingga penerbit izin air tanah dibiarkan "belum pasti"; Lampiran Permen PUPR 14/2015 (daftar
  DI per kewenangan); pengganti Permen PUPR 14/2015 (tidak ditemukan).
- **Relasi "Diubah dengan"** tidak diperiksa per pasal, kecuali UU 17/2019 jo. UU 6/2023 (Pasal 9, 12, 17, 19). Yang
  dijaga mekanis hanya status Berlaku dan "Dicabut sebagian".
- **Pemilihan lembaga.** `lembaga.csv` memuat lembaga yang punya peran PB bersumber di lebih dari satu norma yang dibaca,
  atau yang relevan langsung dengan dua kajian (air Jawa, mitigasi multiancaman). Kemenperin, Kemnaker, Kemendag, Kemhan
  (di luar TNI), Kementerian Hukum/HAM/Imigrasi, Bapeten, BIN, dan BPOM tidak dimasukkan sebagai lembaga tersendiri;
  peran mereka yang tertulis di Perban 6/2018 Pasal 17 ayat (2) tercatat di §4.1 dan C12. Ini bukan bukti bahwa peran
  lain tidak ada.
- **Teror** (bencana sosial menurut UU 24/2007 Pasal 1 angka 4) tidak dimasukkan sebagai ancaman karena lingkup sosial
  kedua kajian adalah konflik dan kerusuhan sosial (KERANGKA prinsip 2), dan UU 5/2018 serta peraturan BNPT tidak dibaca.
  **Likuefaksi** tidak dipisah dari gempa karena tidak ada mandat tersendiri di sumber yang dibaca.
- **Pemetaan nomenklatur lama ke baru** di `sid2` adalah pewarisan fungsi menurut perpres organisasi yang baru, bukan
  penetapan resmi pewaris tugas Inpres atau Perban. Inpres 3/2020 dan Perban 6/2018 belum disesuaikan.
- **NCICD** per 17 Jul 2025 (sekitar 15 bulan sebelum batas data); pembaruan 2026 dari Dinas SDA DKI atau Kementerian PU
  tidak ditemukan dalam pencarian 23 Okt 2026.
- **Salinan JDIH** di `mentah/` adalah potret 23 Okt 2026 dari korpus lokal. Bila korpus lokal dibangun ulang dan isinya
  berubah, skrip mencetak PERINGATAN (tidak gagal); salin ulang dengan `ekstrak_lembaga.py jdih <slug>`.
- Matriks hanya memuat mandat yang **tertulis** atau dipetakan dengan alasan tertulis. Sel kosong berarti mandat tidak
  ditemukan di sumber yang dibaca, bukan bahwa lembaga itu tidak berperan dalam praktik.
- Invarian "514 kab/kota" dan "119 kab/kota Jawa" tidak berlaku untuk paket ini karena tidak ada data per wilayah.
  Penggantinya ada di §1 (gerbang) dan di akhir `main()`: jumlah klaster dan daftar kementerian dihitung dari teks, tiap
  jenis ancaman punya minimal satu peran K/R/I, tiap komponen air terisi, status pencabutan UU 6/2018 serta Perpres
  179/2024 masih seperti yang dicatat, dan aritmetika NCICD (20,9 - 9,4 = 11,5) konsisten.
