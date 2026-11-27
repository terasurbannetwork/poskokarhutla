# RISET: Orang hilang publik, menemukan orang, mencari lewat foto

Catatan kejujuran: bagian 3 dan 4 ditulis dari pengetahuan umum penyusun tentang praktik lembaga dan teks peraturan, **tanpa membuka ulang sumbernya saat penulisan (27 Nov 2026)**. Tiap butir berlabel "[periksa]" harus diverifikasi (tautan dan pasal) oleh pemeriksa bersih atau tinjauan hukum pemilik sebelum dipakai sebagai dasar tayang. Butir dari kode repo (bagian 1) diperiksa langsung.

## 1. Yang sudah ada di repo

| Bagian | Berkas | Fakta |
| --- | --- | --- |
| Tabel laporan | `migrations/0173_lapor_selamat_cari.sql` | `lapor_cari` (nama dicari, ciri, lokasi, waktu, nomor dicari, hubungan, kab, status `buka`, `ditemukan_selamat`, `ditemukan_meninggal`, `ke_sar`, `tutup`), `lapor_cari_riwayat` append-only, `lapor_selamat`. |
| Foto | `0185`, `0186` | Foto pertama di `lapor_cari_foto`, foto 2 sampai 10 di `lapor_cari_foto_lain`; berkas R2 `lapor/foto/<id>.jpg` privat; dihapus cron saat laporan dianonimkan. |
| Alur | `src/lapor_mesin.js` (`tanyaCari`, status `cari_nama`, `cari_panggilan`, `cari_hubungan`, `cari_tinggi`, `cari_pakaian`, foto) | Nama, panggilan (wajib), kelamin, umur, hubungan, tinggi, berat, pakaian (wajib), lokasi, foto sampai 10. Batas 5 laporan per nomor per hari. |
| Rute | `src/lapor_selamat.js` (`cariPost`, `cariMeja`, `cariStatus`) | Meja BNPB dan BPBD melihat baris `cari` dalam wilayahnya; `cocok` dari nomor sama persis dengan tanda selamat (D130). Tidak ada rute publik untuk orang dicari. |
| Tampilan | `src/lapor_tampil.js` (`isianCari`), `public/lapor/meja_cari.js` | Panel isian orang dicari; meja daftar. |
| Model | `src/lapor_model.js` (`MODEL_BAWAAN = claude-sonnet-5-5`) | Pemanggil Claude API dari Worker; dipakai K105 untuk membaca ciri dari foto. |
| Hak | `src/hak.js` (`CARI_SIMPAN_HARI = 730`, `crAnonimkan`, pelaku `lp_pelapor`, `lp_staf`, `lp_publik`, `lp_cron`) | Tabel bertata hak per pelaku; anonim 2 tahun sesudah ditutup. |
| Token | `src/token.js` (`terbitkan`, `periksa`, `cabut`) | Tautan bertoken 32 bita, hanya sha-256 di D1; dipakai kabar selamat (7 hari). |
| Sesi | `src/masuk_sesi.js` (`sesiMasuk`) | Nomor terbukti kode sekali pakai WA; dipakai untuk tanda selamat. |
| Aturan wajah | `data/kajian-bnpb/lapangan/KEPUTUSAN-LAPANGAN.md` D2 | Pustaka Human di HP; vektor tidak keluar Worker untuk modul lapangan. Pencocokan wajah warga umum **tidak ada** di repo. |

Yang **tidak ada**: persetujuan tayang, profil publik, status tayang, laporan menemukan orang, pembanding foto, kolom umur terstruktur yang bisa disaring (umur tersimpan di isian ciri teks), titik kecamatan baku untuk lokasi terakhir (lokasi terakhir adalah teks 200 huruf dan kab 5 karakter).

### 1.1 Celah data yang harus ditutup dulu (OH-02)

| Celah | Akibat | Penutup |
| --- | --- | --- |
| Umur, kelamin, tinggi tidak terstruktur di `lapor_cari` (ada di `ciri` teks dan `sesi.cari.cr`) | Saringan kandidat dan penentuan "anak" tidak bisa dilakukan andal | Kolom terstruktur di tabel samping `oh_publik` diisi dari `sesi.cari.cr` saat kirim; laporan lama diisi petugas, tidak ditebak mesin |
| Lokasi terakhir teks bebas | Publik hanya boleh kecamatan (Q3) | Ambil dari lokasi terstruktur sesi (desa, kec, kab) yang sudah dibangun langkah lokasi, bukan dari teks |
| Foto hanya satu salinan privat | Foto publik harus turunan (D5) | Berkas turunan baru di R2 `orang-hilang/publik/` |

### 1.2 Kejadian yang bisa menjadi penyaring bencana (K116)

| Bagian | Berkas | Fakta |
| --- | --- | --- |
| Buku Besar | `sk_kejadian`, `sk_kejadian_sumber` (migrasi Siklus), `src/siklus_kejadian.js` (`gerbangIngest`, `JENIS_SAH`) | Satu buku kejadian; sumber modul ditautkan lewat pasangan sumber dan kode |
| Pencocok | `scripts/siklus/pasang.py` (satu-satunya), `src/kejadian_tautan.js` (`GET /api/siklus/kejadian/tautan`, hanya staf dan BP) | Tautan kejadian diberi ke staf, bukan publik; pelapor warga belum punya jalur baca daftar kejadian |
| Sumber lain | Dalops (`src/dalops.js`), laporan darurat terverifikasi (`lapor_darurat`), peringatan BMKG | Semuanya sudah (atau akan) masuk Buku Besar lewat pencocok; kiriman warga tidak pernah membuat kejadian (aturan alun-alun) |

Celah: daftar kejadian untuk **warga** (publik, hanya jenis, kab, tanggal) belum ada. Dibangun sebagai rute baca sempit milik paket ini (OH-03), tanpa data orang dan tanpa titik.

### 1.3 Hasil ukur OH-01 (27 Nov 2026, dibaca dari kode, tanpa data produksi)

Diukur di kode dan D1 lokal uji (Miniflare, migrasi apa adanya). Tidak ada angka dari produksi; jumlah kejadian per kab di bawah adalah bentuk kueri dan rencana indeks, bukan hitungan nyata.

**A. Umur, kelamin, tinggi, lokasi di sesi dan di `lapor_cari`**

| Bidang | Di sesi (`sesi.cari`, `src/lapor_mesin.js`) | Di `lapor_cari` (0173) | Temuan |
| --- | --- | --- | --- |
| nama | `c.nama` (667), `sesi.cari = {nama}` sesudah kirim (770) | `nama_dicari` | ada |
| panggilan | `c.panggilan` (667, null bila sama dengan nama) | tidak ada; di `lapor_cari_temu.panggilan` (0177, `ctTambah`) | tabel pribadi terpisah, bukan `lapor_cari` |
| umur, kelamin | `c.cr.umur` (integer 0 sampai 120 atau null, 667 dan 697 sampai 703), `c.cr.kelamin` ("Laki-laki", "Perempuan", atau null) | **tidak ada**; hanya terlipat dalam teks `ciri` (719 sampai 720, "23 tahun", kelamin) | terstruktur hanya selama sesi |
| tinggi, berat | `c.cr.tinggi`, `c.cr.berat` (704 sampai 710) | **tidak ada**; hanya dalam teks `ciri` | sama |
| pakaian | `c.cr.pakaian` (713) | **tidak ada**; hanya dalam teks `ciri` | sama |
| lokasi | `sesi.isian.lokasi.nilai.wilayah` (desa, kec, kab, `kabKode` "32.71"); sumber `"cari"` (416) | `lokasi_terakhir` = teks `Desa/Kel. X, Kec. Y` (769), `kab` = `kabKode` | kecamatan hanya sebagai teks bebas; tidak ada kolom kec |
| waktu | `c.waktu` | `waktu_terakhir` teks bebas (100 huruf) | bukan tanggal terstruktur |

**Celah yang ditemukan, wajib ditutup di OH-04:** pada kirim, `sesi.cari` diganti `{nama}` (lapor_mesin.js 770) sehingga `c.cr` (umur, kelamin, tinggi, pakaian) **hilang dari sesi** dan hanya selamat sebagai teks `ciri`. Penutup (bukan mengurai teks): `kirimCari` (769) menyertakan `cr`, kec, kab_nama, panggilan, dan `crStmtTambah` di `src/lapor_ai.js` 314 menulis satu baris `oh_publik` dalam batch yang sama (pola `kirimTemu`). Laporan lama tanpa baris `oh_publik` diisi petugas, tidak ditebak mesin. Tabel `oh_publik` (0188) sengaja menyalin bidang publik (nama, panggilan, umur, kelamin, tinggi, pakaian, kec, kab, kab_nama, waktu terakhir, jenis dan kab dan tanggal kejadian) supaya jalur publik tidak membaca `lapor_cari`.

**B. Daftar kejadian untuk warga**

| Hal | Hasil |
| --- | --- |
| Sumber | `sk_kejadian_kab` (`sk_kejkab_kab (kab4, mulai DESC, kejadian_id)`) digabung `sk_kejadian`. Tiap jalur pembuatan kejadian (manual, promosi, ingest, dummy; `src/siklus_kejadian.js` 197, 214, 277, 417) menulis baris `sk_kejadian_kab`, jadi kab utama dan kab tambahan sama-sama terbaca dari satu tabel |
| Fase | CHECK 0120: `terdeteksi`, `terverifikasi`, `tanggap`, `transisi`, `pemulihan`, `selesai`, `dibatalkan`, `digabung`. **Tidak ada fase `pasca`** (ALGORITMA 3 menyebut "belum pasca"). Dipakai: aktif = `terverifikasi`, `tanggap`, `transisi`, `pemulihan`; `selesai` hanya dalam jendela; `terdeteksi`, `dibatalkan`, `digabung` tidak pernah ditawarkan (`terdeteksi` belum diverifikasi) |
| Jenis | `JENIS_SAH` di `src/siklus_kejadian.js` 16 (banjir, cuaca, gelombang, gempa, gunungapi, karhutla, kebakaran_permukiman, kekeringan, longsor, tsunami) sudah semuanya bencana; kecelakaan dan kasus non-bencana tidak ada di daftar dan disaring lagi di fungsi murni |
| Kolom yang keluar | `id`, `jenis`, `kab4` + nama kab (`NAMA_KAB4`), `mulai`. Tanpa nama kejadian, titik pusat, ringkasan, sumber, `dampak` |
| Kueri | satu `SELECT ... JOIN` per kab lewat `sk_kejkab_kab`, `LIMIT 100`, diperiksa `EXPLAIN QUERY PLAN` di `tests/lapor/hilang_rute.test.mjs`; penyaringan jendela, fase, dan maksimum 8 di fungsi murni `kandidatKejadian` |
| Jumlah per kab | Bentuk: `SELECT kab4, count(*) FROM sk_kejadian_kab WHERE dummy = 0 GROUP BY kab4`; hasilnya bergantung data produksi dan **belum diukur** (pemilik menjalankan di D1 produksi bila ingin angka; batas 100 baris per kab di kueri menjaga biaya baca) |

**C. Keputusan kecil yang diambil penyusun (bawaan sementara, bukan K pemilik):** batas kategori anak (balita 0 sampai 4, anak 5 sampai 12, remaja 13 sampai 17) HIPOTESIS di `src/orang_hilang_murni.js`; `id` kejadian (`KJ-...`) ikut keluar dari rute kejadian karena pelapor memilihnya, id acak berbasis hash dan sudah dipakai di tautan publik Siklus; saringan umur di daftar publik hanya per rentang 5 tahun dan hanya dewasa supaya rentang sempit tidak membongkar umur tepat.

## 2. Fakta platform

| Hal | Fakta | Dampak |
| --- | --- | --- |
| Cloudflare Workers | Tidak ada pustaka wajah bawaan; Workers AI tidak punya model pengenalan wajah yang bisa dipakai (catatan R1 paket lapangan). Batas CPU dan memori per permintaan terbatas | Pencocokan wajah biometrik di Worker tidak layak; Claude API sebagai pembanding visual lewat HTTP |
| Claude API (gambar) | Model visual menerima gambar dan menjawab teks; kebijakan penggunaan Anthropic membatasi identifikasi orang dari wajah [periksa kebijakan pemakaian terbaru] | Permintaan harus berbentuk "bandingkan kemiripan ciri yang tampak", bukan "siapa orang ini"; hasil bisa menolak; wajib ada jalur tanpa foto |
| Ukuran gambar | Foto dikecilkan di HP sebelum unggah (sudah ada untuk foto laporan) | Biaya token dan latensi terkendali; 5 kandidat + 1 foto penanya = 6 gambar per pencarian |
| R2 | Objek privat tanpa URL publik kecuali lewat Worker | Foto publik turunan dilayani Worker dengan header `cache-control: private` dan nama berkas acak |

## 3. Pembanding praktik

| Lembaga | Yang dilakukan | Pelajaran untuk paket ini |
| --- | --- | --- |
| ICRC, Restoring Family Links dan Trace the Face (tracetheface.org) [periksa] | Foto orang yang mencari keluarga (terutama migran dan korban konflik) ditampilkan publik **hanya dengan persetujuan orang itu sendiri**, dipakai sebagai alat bantu, pencocokan dilakukan staf lewat jaringan Palang Merah | Tampil publik harus berdasar persetujuan; manusia yang mencocokkan; foto orang yang mencari tidak dibuka tanpa izinnya |
| ICRC, kebijakan perlindungan data (Handbook on Data Protection in Humanitarian Action) [periksa] | Data orang hilang adalah data sangat sensitif; minimisasi, tujuan terbatas, penghapusan setelah selesai | Dasar D4, D11, Q6 |
| NamUs (National Missing and Unidentified Persons System, AS) [periksa] | Basis data nasional dengan profil hilang dan jenazah tak dikenal; profil publik berisi bidang terbatas, kontak lewat penegak hukum, kasus ditinjau sebelum dipublikasikan | Pola tinjau sebelum tayang, kontak lewat lembaga (D6, D8), pemisahan hilang dan jenazah (D21) |
| Missing People (Inggris) [periksa] | Poster publik dibuat atas persetujuan keluarga dan kepolisian; orang yang ditemukan dan **memilih tidak dihubungi keluarga** hanya dikabarkan "selamat" tanpa lokasi | Dasar D19 dan Q15 |
| NCMEC (AS, anak hilang) [periksa] | Poster anak hanya lewat kasus yang dikonfirmasi penegak hukum; foto anak dikelola ketat | Dasar D7 dan Q5 |
| Google Person Finder (dipakai gempa Haiti 2010, Jepang 2011, Nepal 2015; ditutup 2016) [periksa] | Dua jalur: "Saya mencari seseorang" dan "Saya punya informasi tentang seseorang"; data terbuka diterbitkan sebagai PFIF | Dasar jalur menemukan (D9) dan pelajaran: data terbuka tanpa moderasi memancing spam dan penyalahgunaan, itu sebab D3 |
| Facebook Safety Check dan Person Finder serupa [periksa] | Tanda selamat berbasis jaringan sosial | Sudah dicakup K91 |
| Layanan di Indonesia: Basarnas (pencarian dan pertolongan), Polri (laporan orang hilang resmi), Kemensos (layanan anak dan identifikasi keluarga), BNPB dan BPBD (posko), PMI (Restoring Family Links, "Menghubungkan Keluarga") [periksa] | Laporan orang hilang resmi tetap lewat Polri; di bencana, data lewat posko dan PMI | Paket ini tidak menggantikan laporan resmi (Q19); tembusan ke petugas; rujuk PMI sebagai mitra bila disetujui pemilik (tidak dikarang) |

Yang tidak ditemukan: aplikasi pemerintah Indonesia dengan **pencarian orang hilang lewat foto** untuk publik (penyusun tidak menemukan; [periksa]). Tidak diklaim ada.

## 4. Hukum dan etika

Ringkasan untuk tinjauan hukum, bukan nasihat hukum. Pasal ditulis dari ingatan; [periksa] sebelum dikutip di teks yang tampil.

| Isu | Rujukan | Dampak pada rancangan |
| --- | --- | --- |
| Data pribadi spesifik meliputi data biometrik dan data anak | UU 27/2022 tentang Pelindungan Data Pribadi, Pasal 4 ayat (2) [periksa] | Foto wajah dan profil anak diperlakukan sebagai data spesifik: persetujuan eksplisit, minimisasi, tinjauan manusia |
| Dasar pemrosesan: persetujuan eksplisit, kepentingan vital, kepentingan umum, dan lain-lain | UU PDP Pasal 20 [periksa] | Persetujuan pelapor mencakup data pelapor sendiri dan data orang hilang yang ia berikan; orang hilang tidak bisa menyetujui sendiri, sehingga dasar kepentingan vital dan kemanusiaan perlu dinilai pengacara (Q18) |
| Pemrosesan data anak | UU PDP Pasal 25 [periksa] | Persetujuan orang tua atau wali (Q5) |
| Hak subjek data: akses, koreksi, penghentian pemrosesan, penghapusan, menarik persetujuan | UU PDP Pasal 5 sampai 14 [periksa] | Pencabutan dan hapus (Q6), jalur permintaan lewat petugas |
| Penilaian dampak pelindungan data untuk pemrosesan berisiko tinggi, termasuk data spesifik dan pemakaian teknologi baru | UU PDP Pasal 34 [periksa] | Wajib dikerjakan sebelum OH_FOTO menyala (OH-15) |
| Transfer data ke luar wilayah hukum Indonesia | UU PDP Pasal 56 [periksa] | Pengiriman foto ke Claude API (Q13) butuh dasar dan tinjauan |
| PP pelaksana UU PDP | belum dipastikan terbit saat penulisan [periksa] | Tinjauan hukum memastikan |
| Perlindungan anak, larangan menyebarkan identitas anak korban atau anak berhadapan hukum | UU 35/2014 jo. UU 23/2002 perlindungan anak [periksa] | Menguatkan Q5 (anak hilang bukan korban pidana per se, tetapi identitas tidak boleh disebar tanpa verifikasi) |
| Pencemaran nama, laporan palsu | KUHP dan UU ITE [periksa] | Moderasi (D6), tombol laporkan profil (D19), larangan menampilkan tuduhan |
| Penguntitan dan kekerasan dalam rumah tangga | UU 23/2004 PKDRT [periksa] | Q15, D19 |

Prinsip etika dari sektor kemanusiaan yang dipakai: **do no harm**, minimisasi, persetujuan yang bisa dicabut, dan "orang yang ditemukan berhak menolak dihubungi" (praktik Missing People dan ICRC).

## 5. Risiko spesifik fitur

| Risiko | Siapa | Jalur | Penjagaan |
| --- | --- | --- | --- |
| Penguntit memakai foto untuk menemukan korban yang melarikan diri | Penanya foto | Cari lewat foto menunjukkan profil | Profil hanya yang sudah ditinjau dan publik; hasil tanpa lokasi rinci; sesi dan batas laju; orang yang tidak ingin ditemukan lewat petugas (D14, D15, D19) |
| Pemerasan dan penipuan ("saya tahu di mana anak Anda, transfer dulu") | Penipu | Kontak publik | Tidak ada kontak publik; informasi lewat petugas (D8); peringatan di kartu profil |
| Profil palsu atas nama orang lain | Pelapor jahat | Lapor tanpa kode | Tinjauan sebelum tayang, batas laju, tombol laporkan, tandai "belum diverifikasi keluarga" |
| Foto anak tersebar | Siapa pun | Salin foto publik | Foto anak tidak tampil publik (Q5); foto lain bertanda air tipis dan non-unduh hanya mengurangi, tidak menutup |
| Orang yang sudah ditemukan masih tampil | Sistem | Lupa turun | D11 turun otomatis, kedaluwarsa 30 hari (Q4), cron pengaman |
| Salah cocok foto | Claude API | Pembanding visual | Dua tingkat saja, alasan teks, petugas memutuskan, tanpa skor (D10, D12), uji balik hipotesis (D23) |
| Bias pengenalan wajah lintas warna kulit, usia, ras | Model | Pembanding visual | Dikerjakan sebagai ketidakpastian yang diumumkan, bukan akurasi; hasil tidak pernah dipakai sendirian |
| Data pribadi bocor lewat log | Worker | `console.error`, `catat` | Aturan `samarkan` di `src/samarkan.js`; uji bahwa log tidak memuat nama, foto, nomor |

## 6. Opsi pencocokan foto dan rekomendasi

| Opsi | Cara | Kelebihan | Kekurangan | Putusan |
| --- | --- | --- | --- | --- |
| A | Vektor wajah (embedding) di HP atau Worker, jarak cosine | Cepat, murah, bisa saring ribuan profil | Biometrik, melanggar aturan lapangan, butuh DPIA dan model berlisensi (bobot InsightFace non-komersial), bias | Tidak dipakai (Q11) |
| B | Claude API membandingkan foto penanya dengan sampai 5 foto kandidat publik, menjawab "mirip tinggi, mirip rendah, tidak bisa dinilai" dengan alasan tertulis | Tanpa biometrik tersimpan, memanfaatkan jalur K105 yang ada, dua tingkat jujur | Biaya per pencarian, latensi, batas kebijakan model, tidak skalabel tanpa saringan, transfer lintas negara | Bawaan (D12) |
| C | Hanya pembacaan ciri dari foto (K105), lalu pencocokan terstruktur (umur, kelamin, rambut, pakaian) | Paling ringan dan paling jujur | Ciri umum mudah sama pada banyak orang; lemah | Dipakai sebagai saringan lapis 1 sebelum B |
| D | Tanpa foto: hanya saringan terstruktur dan telusur teks | Nol risiko biometrik | Tidak memenuhi K110 jalur "mencari lewat foto" | Jalur cadangan bila Q13 tidak lulus |

Rekomendasi: C lalu B, di belakang bendera `OH_FOTO`; D adalah kondisi saat bendera mati, dengan tombol "Cari lewat foto" disembunyikan, bukan dinonaktifkan tanpa penjelasan.

## 7. Pertanyaan riset yang belum terjawab

1. Retensi dan pelatihan data pada API Claude yang dipakai pemilik: kontrak apa, retensi berapa hari, ada opsi nol retensi? (Q13)
2. Apakah kebijakan penggunaan model menolak permintaan banding wajah dua gambar? Perlu uji dengan foto sintetis atau foto relawan yang setuju (OH-14), bukan foto warga.
3. Apakah PMI atau Basarnas mau menerima tembusan antrean untuk wilayah mereka? Keputusan pemilik di luar repo.
4. Berapa sebenarnya jumlah laporan orang dicari saat ini? Hitung dari D1 produksi oleh pemilik; agent tidak menarik data produksi (angka "belum terukur" di dokumen ini).
