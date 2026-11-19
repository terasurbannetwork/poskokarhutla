# RISET: Pelaporan kejadian bencana dipandu AI

## 1. Deck rujukan pemilik (18 Nov 2026)

"Digitalisasi dan Pelibatan Publik dalam Pendataan Bencana: Pelaporan kejadian bencana menggunakan Chat Bot dengan Artificial Intelligence", Tim Ahli dan Tim Sus IT BNPB, disampaikan kepada Kepala BNPB. Tujuh slide.

Kesenjangan (slide 3), kondisi aktual lawan ideal:

| Parameter | Aktual | Ideal |
| --- | --- | --- |
| Kecepatan | Laporan berjenjang, tiba di pusat beberapa hari sesudah kejadian | Laporan masuk real time ke BNPB, tidak menunggu laporan BPBD |
| Kelengkapan | Tidak lengkap, baru diketahui di pusat | AI menanyakan isian yang belum ada sebelum laporan terkirim |
| Standar | Petugas BPBD tidak punya standar analisis | AI bertanya interaktif dan menawarkan rekomendasi pilihan jawaban |
| Dua arah | Hanya BPBD ke BNPB | BNPB bisa meminta verifikasi ke BPBD untuk kejadian yang dilaporkan masyarakat |
| Partisipasi warga | Warga belum punya kanal resmi | Warga melapor lewat chatbot yang sama |
| Beban administrasi | Disusun manual, diketik ulang tiap jenjang | Laporan baku tersusun otomatis dari percakapan |
| Keputusan | Status dan bantuan dari laporan terlambat | Data utuh sesuai keadaan lapangan |

Alur (slide 4): pelapor (BPBD atau masyarakat) bercerita lewat WhatsApp dan mengirim foto bertanda lokasi; chatbot AI menanyakan data umum dan data khusus satu per satu sampai lengkap; sistem menyusun laporan baku sesuai juklak tanpa diketik ulang; basis data nasional menyajikan data untuk diverifikasi BPBD dan BNPB.

Data umum (sama untuk semua jenis; tiga pertama wajib di laporan awal): 1 identitas kejadian, 2 waktu, 3 lokasi spesifik dengan geotag, 4 korban terpilah, 5 pengungsian, 6 kerusakan rumah, fasilitas, jalan, 7 layanan dasar, 8 lahan dan ekonomi, 9 kebutuhan dan penanganan, 10 mutu data dan foto.

Data khusus per jenis: banjir (kedalaman genangan), longsor (jenis gerakan), gempa (intensitas per desa), karhutla (luas terbakar), cuaca (lintasan angin), erupsi (tebal abu), tsunami (tinggi rayapan), kekeringan (krisis air), abrasi (garis pantai), dan subjenis tiap bencana.

Contoh percakapan: "Ada banjir, air masuk rumah warga." AI: "Pilih yang paling mirip: Banjir, Banjir rob, Banjir bandang, Banjir lahar." AI: "Berapa rumah rusak dan warga mengungsi?" Pelapor: "Tiga rusak berat, dua belas orang mengungsi" plus foto, lokasi, waktu terekam. AI: "Laporan lengkap sesuai juklak, diteruskan ke BPBD dan BNPB."

Alur sesudah (slide 6): kejadian, laporan masyarakat via chatbot AI, langsung ke Pimpinan BNPB; diteruskan bersamaan ke BPBD dan ke Pusdalops serta Pimpinan Pusdalops yang saling verifikasi dan koordinasi data; arahan verifikasi dan umpan balik dua arah. Pesan penutup: fokus pendataan bergeser dari membuat laporan ke memastikan data benar dan terverifikasi.

## 2. Bagian repo yang dipakai ulang

| Kebutuhan | Yang sudah ada | Berkas |
| --- | --- | --- |
| Pintu WA, nomor terdaftar, batas kirim | Gateway Baileys, daftar nomor bersha, limiter dengan batas balasan percakapan | `scripts/wa/gateway/index.js`, `scripts/wa/daftar.cjs`, `scripts/wa/gateway/limiter.js` |
| Pemanggil Claude, penyamaran, validasi kutipan angka | Bot laporan V1 | `scripts/wa/claude.mjs` (`samarkan`, validasi kutipan) |
| Identitas web lewat nomor WA | Satu Pintu Masuk, kode sekali pakai lewat WA, akun umum | `src/masuk*.js`, `public/masuk.*` |
| Foto bergeotag dan berwaktu (K5) | Unggah foto warga: GPS perangkat saat unggah, cek EXIF jarak dan umur, GPS janggal, bersih metadata | `src/foto.js`, `src/gps.js`, `src/media_bersih.js` |
| Kode wilayah dari koordinat | `wilayah`, `cariWilayah`, pencarian desa | `src/titik.js`, `public/data/desa_cari.json` |
| Aturan kelengkapan (nilai, nihil, belum didata) | Fungsi murni kelengkapan meja `dampak` | `public/inti/kelengkapan.js`, `data/kajian-bnpb/juklak/DATA-DAMPAK.md` |
| Standar isian | Rancangan Juklak Standar Data, Lampiran I sampai III | `data/kajian-bnpb/standar-data-bencana/03-juklak-baru/naskah/` |
| Isian yang selama ini ditulis Pusdalops | Landasan formulir dari laphar | `data/kajian-bnpb/standar-data-bencana/04-landasan-formulir/isian.json` |
| Verifikasi dan Terima ke Logbook | Meja `dampak`, status `dilaporkan`, `diverifikasi`, `masuk_logbook` | `src/meja.js`, KEPUTUSAN-JUKLAK T10 sampai T13 |
| Satu buku kejadian | Pencocok antarsumber | `scripts/siklus/pasang.py` |
| Penyaring teks bebas | `teksBersih` (HP, NIK, surel, RT/RW) | `src/meja_spek.js` |
| Token tautan tanpa login | Uji pilot (tautan bertoken tanpa login) | rute `/uji-pilot` di `src/` |
| Jenis dan subjenis bencana | Registri bencana | `public/bencana.json` |

## 3. Batas teknis yang memengaruhi rancangan

- WhatsApp membuang EXIF dari foto yang dikirim sebagai gambar biasa. Karena itu D16 menandai foto chat WA dengan jam pesan dan lokasi WA terdekat (lencana "lokasi WA"), dan menawarkan tautan halaman kamera web untuk lencana GPS perangkat.
- Pesan "Bagikan lokasi" WA membawa lintang dan bujur yang dipilih pengguna (bisa digeser). Ketelitiannya dicatat "lokasi dibagikan lewat WA", bukan "titik GPS".
- Baileys tidak andal untuk tombol dan daftar interaktif WhatsApp; pilihan memakai angka.
- Limiter gateway: balasan ke orang yang menulis dalam 10 menit terakhir memakai batas percakapan terpisah (150 per tujuan per hari sejak 18 Nov 2026). Satu laporan lengkap kira-kira 8 sampai 15 balasan.
- Worker paket Free: waktu menunggu `fetch` ke API model tidak dihitung CPU; panggilan model tetap dibatasi satu per putaran (D15).
- Kuota baca D1 Free 5 juta per hari (memori `d1-kuota-baca`): sesi lapor dibaca per kunci utama, tanpa pemindaian.

## 4. Praktik lazim

- Pola "slot filling" pada asisten percakapan: daftar slot tetap, model hanya mengisi slot dan merumuskan pertanyaan, logika selesai di kode. Lebih bisa diuji daripada membiarkan model memegang alur.
- Kanal pelaporan warga di negara lain (misalnya pelaporan lewat aplikasi pesan) memisahkan laporan warga yang belum terverifikasi dari data resmi; repo ini sudah memakai pola yang sama di alun-alun dan Cek Kabar.

---

## Lanjutan 19 Nov 2026: riset enam fitur lanjutan

Catatan keterbukaan: pencarian web pada sesi ini hanya mengembalikan tautan di bagian per fitur yang bertanda "dicari". Pembanding yang tidak ada tautannya (mPING, FEMA, pengelompokan ala Waze, Whisper) ditulis dari pengetahuan umum dan belum diperiksa ulang; tinjau sebelum dikutip keluar.

### 5. Verifikasi dua arah ke BPBD (K31)

- Ushahidi: siapa pun mengirim laporan, tetapi hanya admin yang menyetujui atau menandainya terverifikasi; laporan belum terverifikasi tetap boleh dipetakan supaya admin bisa melihat apakah sumber lain menceritakan kejadian di area yang sama. Kritiknya: peninjauan manual lambat dan sulit diskalakan. Dicari: https://github.com/dssg/ushine-learning/wiki/Crowdsourced-Crisis-Reporting, https://groups.google.com/g/ushahidi-research/c/88uZyWd9sKQ, https://www.thenewhumanitarian.org/report/98569/questioning-the-crowd-data-verification-challenges-for-humanitarians.
- PetaBencana.id: laporan warga lewat chatbot (lokasi, foto, kedalaman banjir), lalu lembaga pemerintah memvalidasi dan memakainya untuk koordinasi. Dicari: https://www.itu.int/hub/?p=22162 (ringkasan; halaman proyeknya sendiri belum dibuka).
- Pelajaran yang dipakai: verifikasi adalah langkah petugas yang tercatat, bukan sifat otomatis laporan (D24); laporan belum terverifikasi tetap tampil di meja staf, tidak di publik (D7); jawaban dipisah dari isi laporan.
- Kode repo yang dipakai ulang: tautan bertoken tanpa login (`/uji-pilot`, `lapor_token` untuk kamera dan cetak), `teksBersih` di `src/meja_spek.js`, riwayat append-only tiket `lapor_tiket_riwayat`, daftar izin gateway `scripts/wa/daftar.cjs` sebagai pola daftar kontak.

### 6. Peringatan balik ke pelapor sekitar (K32)

- Data peringatan yang sudah ada di repo: `public/banjir/data/peringatan.json` (dibuat `scripts/banjir/peringatan.py`) berisi `nowcast[]` BMKG dalam bentuk CAP dengan `event`, `severity`, `urgency`, `certainty`, `mulai`, `selesai`, `aktif`, `wilayah` (nama kecamatan sebagai teks), `prov[]`, dan `polygon` (bisa null), sumber `https://www.bmkg.go.id/alerts/nowcast/id`, serta `gelombang[]` dari maritim BMKG. Lisensinya "BMKG (cantumkan sumber)". Berkas `public/banjir/data/peringatan_bmkg.json` bukan ini (itu peringatan dasarian iklim) dan tidak dipakai.
- Standar format: Common Alerting Protocol 1.2 (OASIS), dicari: https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html. Bidang `severity`, `urgency`, `certainty`, dan `area` yang dipakai BMKG berasal dari standar itu, jadi ambang kita (Q21) memakai kosakata baku, bukan karangan.
- Pembanding yang disebut pemilik atau lazim (belum diperiksa tautannya): mPING (laporan cuaca warga ke NOAA) memperlihatkan nilai laporan warga untuk validasi peringatan, tetapi arahnya laporan masuk, bukan peringatan keluar ke pelapor. FEMA dan IPAWS memakai CAP lewat kanal resmi dengan persetujuan ketat; cakupan pesan ditentukan wilayah poligon, bukan nomor. Pelajaran: peringatan keluar mengikuti poligon dan sumber resmi, bukan opini sistem.
- Batas teknis: pesan proaktif lewat Baileys ke nomor yang tidak sedang bercakap berisiko pemblokiran; limiter gateway membedakan balasan percakapan (jendela 10 menit) dari kiriman lain (`scripts/wa/gateway/limiter.js`). Tombol dan templat resmi hanya di WhatsApp Business Platform (Q7, Q13).
- Kode repo yang dipakai ulang: `GET /api/lapor/kabar` (pola antrean kabar status tiket yang diambil gateway), `scripts/wa/peringatan_banjir.mjs` (contoh pesan peringatan bertemplat tanpa LLM dengan penerima dari env), `cariWilayah` dan `desa_cari.json` untuk kode wilayah.

### 7. Gugus laporan otomatis (K33)

- Ushahidi menandai laporan belum terverifikasi lalu membandingkan sumber di area yang sama (tautan di bagian 5); gugus adalah versi otomatis dari pembandingan itu. Pengelompokan laporan berdekatan ala aplikasi lalu lintas komunitas (pembanding yang disebut pemilik) dikenal dari pengetahuan umum, tidak dicari; yang dipakai di sini hanya idenya: banyak laporan independen yang berdekatan menaikkan keyakinan bahwa kejadiannya nyata, dan satu pelapor yang mengulang tidak menambah keyakinan.
- Pola repo: pencocok Buku Besar `scripts/siklus/pasang.py` mencocokkan per jenis, kab, dan selisih hari (`JENDELA` 3 hari, `pasangkan` di `scripts/bnpb/kunci_kejadian.py`), jadi pencocok itu tidak punya jarak dan jam. Gugus laporan adalah lapis halus di bawah pencocok itu (jarak dan jam), lalu hasilnya satu rekaman bagi pencocok. Sumber yang menempel tanpa mendirikan sudah ada: `lapsus` di `PRIORITAS_MASUK` (`pasang.py` baris 17 dan 345 sampai 354, uji di baris 496 sampai 513).
- Pola alun-alun (AGENTS 2.26): kiriman warga tidak pernah membuat kejadian atau mengubah fasenya; berlaku sama di sini.

### 8. Mode Tanya (K34)

- Sumber yang ada: `public/lapor/edukasi.json` (dibuat 19 Nov 2026), 18 topik (gempa, tsunami, banjir, longsor, cuaca ekstrem, karhutla, gunung api, kekeringan, gelombang pasang, kebakaran permukiman, tas siaga, rencana keluarga, nomor darurat, peringatan resmi, kelompok rentan, kesehatan pengungsian, hoaks, cara lapor). Tiap topik punya `ringkas`, `tanda`, `sebelum`, `saat`, `sesudah`, dan `sumber[]` (lembaga, judul, url). Catatan berkas: perlu ditinjau Direktorat Kesiapsiagaan BNPB.
- `scripts/wa/panduan_resmi.json` BUKAN sumber Mode Tanya: itu ringkasan draf panduan Pusdalops (logbook, laphar, lapjol) untuk petugas, bukan panduan warga.
- Pola pemakaian jawaban bersumber (pola ChatHPT di K20): jawaban dengan sumber yang bisa dibuka. Dipilih bentuk ekstraktif (kode merakit dari butir asli) karena itu satu-satunya bentuk yang menjamin "tanpa sumber tidak dijawab".
- Pencarian: BM25 sederhana atas butir (parameter lazim k1 1,2 dan b 0,75) ditulis kecil di mesin; tanpa pustaka dan tanpa vektor. Stop word Indonesia pendek ditulis tangan. Embedding tidak dipakai karena menambah layanan luar.
- Kode repo yang dipakai ulang: `public/lapor/edukasi.json`, tampilan Edukasi di `public/lapor/lapor.js`, `daerah()` dan `sekitar()` di `scripts/lapor/lokal.mjs` (pengalihan pertanyaan lokasi), nilai percakapan `/api/lapor/nilai`.

### 9. Laporan susulan (K35)

- Sudah ada: F-12 (`update LA-...`), `lapor_versi` append-only, `lapor_pdf` per versi (D21), `lapor_tiket_riwayat` append-only. Yang baru hanya pemicu (D36), aturan gabung (A12), dan ringkasan perubahan.
- Pola repo: Laporan Berkala dan log tindak lanjut Dalops (AGENTS 2.12, 2.13): versi beku tidak ditimpa, riwayat append-only.
- Pelajaran Ushahidi dan PetaBencana: kejadian banjir berubah cepat (kedalaman naik turun); laporan susulan lebih bernilai bagi staf daripada laporan baru yang menggandakan. Itu sebabnya satu tiket memegang rangkaian versi.

### 10. Pesan suara dan foto saja (K36)

- Keadaan kode sekarang: `scripts/wa/gateway/index.js` pada jalur lapor (baris sekitar 646 sampai 663) meneruskan `c` (isi pesan) dan fungsi `unduh` ke `lapor_wa.mjs`; belum ada penanganan `audioMessage`. Tidak ada mesin transkripsi di repo (tidak ada whisper di Mac mini; `ffmpeg` ada di `/opt/homebrew/bin/ffmpeg`). Pembungkus OCR `scripts/wa/ocr.cjs` memakai Vision macOS hanya untuk stempel foto grup operasi dan tidak relevan untuk suara.
- Web sudah punya ucapan ke teks di peramban: `public/lapor/lapor.js` baris 614 memakai `SpeechRecognition` atau `webkitSpeechRecognition` (K21 "bisa memakai suara"). Itu jalur web; yang baru di sini hanya jalur WA.
- Opsi mesin transkripsi (dari pengetahuan umum, belum dicari ulang di web): (a) whisper.cpp lokal di Mac mini, gratis, audio tidak keluar mesin, mutu bahasa Indonesia bergantung ukuran model dan logat; (b) layanan transkripsi awan, mutu umumnya lebih tinggi tetapi audio keluar mesin dan berbiaya per menit. Biaya awan tidak ditulis karena tidak diperiksa. Claude API tidak dipakai untuk audio; ia hanya mengurai teks transkrip yang sudah dikonfirmasi pelapor.
- Foto saja: keadaan sekarang foto di chat diteruskan ke `POST /api/lapor/foto` dengan jam pesan dan lokasi WA terdekat (D16). Foto tanpa sesi belum punya jalur resmi; D39 menutupnya.

### 11. Mode luring di web (K37)

- Antrean luring bersama sudah ada: `public/inti/antre.js` (paket `data/kajian-bnpb/keterpaduan/`, tiket KP-09, keputusan D5 dan K3). Isinya: satu IndexedDB `pb-antre`, saluran per modul lewat `PbAntre.saluran(nama, opsi)`, `klien_id` wajib, kirim terlama dulu, mundur 60 detik dikali 2 pangkat (n-1) sampai 30 menit dengan jitter 20 persen, 401 dan 403 berhenti dan butir tetap, 409 berkeadaan "berubah", 4xx lain ditahan dengan alasan, unggah foto dua tahap, cadangan localStorage bila IndexedDB gagal, saluran `rahasia` tidak menyentuh localStorage, tolak kunci rahasia di data butir (kode akses dibaca saat kirim lewat `opsi.header()`), pita "belum terkirim" lewat `pasangPita`. Masa tahan butir 14 hari (jawaban pemilik K13 paket keterpaduan), absen wajah 36 jam. Satu-satunya berkas yang boleh memanggil `indexedDB.open` (gerbang keterpaduan).
- Cangkang halaman luring: ada dua service worker yang bisa ditiru, `public/sw-lapangan.js` dan `public/sw-instansi.js`. `public/lapor/` belum punya service worker.
- Praktik lazim (pengetahuan umum, tidak dicari ulang): pelaporan lapangan luring menyimpan lokal dengan kunci idempotensi dari klien dan mengirim ulang saat tersambung; waktu klien dipisah dari waktu terima server. Dua-duanya sudah ada di antre.js.

### 12. Penilaian foto (K38)

- Yang sudah ada di repo: pemeriksaan GPS dan EXIF (`src/gps.js` `nilaiGps`, `src/foto.js`), pembersih metadata `src/media_bersih.js`. Tidak ada kode skor buram, hash perseptual, atau pencarian balik gambar di `src/`, `scripts/`, atau `public/` (dicari 19 Nov 2026). `ffmpeg` terpasang di `/opt/homebrew/bin/ffmpeg` (dipakai `scripts/wa/ocr.cjs` untuk frame video) dan bisa menurunkan skala foto menjadi piksel abu-abu mentah tanpa pustaka npm baru.
- Teknik (pengetahuan umum, tidak dicari di web): ragam Laplacian pada citra abu-abu dipakai luas sebagai ukuran ketajaman; dHash (selisih piksel bertetangga pada citra 9 kali 8) memberi 64 bit yang tahan terhadap kompresi dan perubahan ukuran, dibandingkan dengan jarak Hamming. Ambang tidak ditulis sebagai fakta; disetel dari foto F0 (Q29).
- Batas jujur: dHash hanya menemukan foto yang sudah ada di arsip kami. Foto yang pernah beredar di internet tidak ketahuan tanpa layanan pencarian balik luar, dan mengirim foto warga ke luar mengulang pertanyaan Q4.
- Pembanding Ushahidi (bagian 5): foto dan laporan belum terverifikasi tetap ditampilkan dengan tanda, bukan dibuang.

### 13. Ringkasan harian (K39)

- Mesin laporan harian BNPB sudah ada dan terpisah: Laporan Kejadian Bencana Harian (deck, folder revisi AGENTS 3.6, dibuat generator `data/laporan-bnpb/generator/` lewat bot WA) dan Laporan Berkala Harian (dokumen A4 2 sampai 4 halaman, paket `data/kajian-bnpb/laporan-berkala/`, D12 paket itu). Paket Laporan Berkala belum punya kode: `scripts/berkala/` belum ada (tiket LB-*).
- Aturan dari paket itu yang dipakai: angka dihitung mesin dan kalimat dipilih staf (D2), angka antarsumber tidak dijumlah (D5), versi beku tidak ditimpa (D3), pilihan staf atas "baris calon" yang diusulkan mesin (Q8). Karena itu ringkasan harian dibuat sebagai blok mandiri berlabel dan arsip append-only, bukan ditulis ke dokumen orang lain.
- Pola jadwal repo: timer di mesin bot (Mac mini) alih-alih cron Worker baru (batas 5 jadwal akun Free).

### 14. Penugasan tiket (K40)

- Pola repo: log tindak lanjut Dalops (`src/dalops_tindak.js`, riwayat append-only, status tidak mengubah daftar langkah; AGENTS 2.13), alun-alun (balasan atas nama lembaga dan pemberitahuan terverifikasi, AGENTS 2.26), register orang (`orang`, `orang_akun`, paket keterpaduan D10; pencocokan hanya NIP atau WA sama persis).
- Pengingat WA: pola `scripts/wa/lapor_wa.mjs` dan antrean kabar `/api/lapor/kabar`.
- Pembanding umum: sistem tiket (misalnya SLA dengan penanda lewat tenggat) memakai warna lewat tenggat tanpa mengubah status. Yang dipakai hanya ide itu.

### 15. Sinyal awal dan pembanding prediksi (K41)

- Paket yang mengikat: `data/kajian-bnpb/prediksi-besok/` (tabel Besok, GEL dan CEX "belum teruji" sampai ada pengamatan, D8, K9 tanpa abrasi harian) dan `data/kajian-bnpb/tangga/` (K6 tanpa skor gabungan baru tanpa uji balik, tidak pernah menulis "aman", status kita dan BMKG terpisah; K7 sinyal hanya dari pernyataan BMKG, D2). Arsip prediksi harian append-only milik agent `prediksi` adalah bahan pembanding; lokasi tepatnya dibaca di LA-43 dari DESAIN-TEKNIS paket `prediksi-besok`.
- Pelajaran Ushahidi (bagian 5): laporan warga yang belum terverifikasi berguna sebagai petunjuk di mana kejadian mungkin terjadi, bukan sebagai bukti ketiadaan di tempat lain. Laporan hanya datang dari tempat yang berpenduduk, berponsel, dan berpengguna; "tidak ada laporan" tidak berarti "tidak ada kejadian".
- Peta utama (`public/index.html`) dan lapisan staf: lapisan staf yang bergantung pada sesi dibaca dari rute yang menjawab 403 bila tanpa sesi; tidak ada data laporan di berkas statis.

### 16. Kebutuhan ke LogPal (K42)

- Isian kebutuhan laporan sudah memakai nama barang LogPal: `src/lapor_spek.js` (kelompok `kebutuhan`, tipe `opsi_banyak`, komentar baris 142: kategori Perka 18/2009 dan 23/2014, "nama barang mengikuti katalog LogPal"). Opsi: makanan siap saji, paket pangan atau sembako, air bersih, paket sandang, matras dan kasur lipat, tenda atau terpal, family kit, kidsware, obat dan layanan kesehatan, masker, perahu karet, pompa air, tandon atau mobil tangki air, mesin dan selang pemadam, karung atau bronjong, alat berat, gergaji mesin, bahan atap, genset dan lampu penerangan.
- LogPal tidak punya tabel katalog; "katalog" saat ini adalah nilai `item_standar` pada `logpal_barang` (migrasi 0112) dan fungsi `klasifikasi()` di `public/logpal/logpal.js` (kategori dan `item_standar` seperti Paket makanan siap saji, Paket perlengkapan keluarga, Matras dan kasur lipat, Selimut, Paket sandang, Terpal, Paket perlengkapan balita, Paket kebersihan, Pompa banjir, Perahu evakuasi, Genset, Tenda pengungsi, Mobil tangki air, Tandon air, Chainsaw, Light tower portable, Pompa pemadam). Pemetaan daftar ke daftar ada di `ALGORITMA.md` A20 dan bertanda hipotesis.
- Permintaan LogPal: `logpal_permintaan` (jenis, bpbd, provinsi, kab, status_darurat, sk, jiwa, rekomendasi, trc, `items` JSON berisi `{barang, jumlah, satuan}` 1 sampai 40 baris, tahap) dengan `logpal_tahap` sebagai riwayat; dibuat akun instansi BPBD. KEPUTUSAN-LOGPAL: D2 (BPBD hanya mengajukan), D7 (wajib login), T12 (rute baru di berkas baru, `src/logpal.js` berplafon). Pertanyaan terbuka LogPal Q2, Q4, Q13 tidak dijawab di paket ini.

### 17. Meja lanjutan (M1 sampai M10)

- Pola layar: `public/bnpb/dalops.js` (peta MapLibre di baris 204 sampai 316 dengan legenda di dalam peta, bilah ringkasan di dasar peta, pop-up `dl-popup`; tabel dengan saringan bersama dan hanya mengganti `hidden` untuk INP, baris 613; ekspor di baris 701, 765, dan 1041) dan `public/bnpb/dalops_ekspor.js` (Excel lewat `DalopsHitung.xlsx` tanpa pustaka, PDF `/vendor/jspdf`, PPT `/vendor/pptxgenjs`, dimuat saat diklik). `public/lapor/meja.js` sudah menirunya (kepala berkas: peta dengan saring jenis berikon, panel ringkasan, legenda, rincian di `<dialog>`, `nanti()` untuk INP).
- Pengelompokan titik (M1): fitur bawaan sumber GeoJSON MapLibre (`cluster`, `clusterRadius`, `clusterMaxZoom`, `clusterProperties`); pustaka di `public/vendor/maplibre`. Terpakai di peta lain repo bila ada; tidak ada pustaka baru.
- Data lapisan (M2): `public/banjir/data/peringatan.json` (poligon nowcast BMKG), `public/data/titik24.json` (titik panas 24 jam), `public/prediksi/data/prediksi.json` dan batas `public/geo/kabupaten/<prov>.json` (paket `prediksi-besok` D12: kunci `geo`, dimuat saat tampilan peta dibuka), batas kab di `public/geo/kabupaten`.
- Linimasa (M3), kab terbanyak (M4), prioritas (M5), massal (M6), waktu tanggap (M7): murni olahan data tampilan; tidak ada pembanding eksternal yang dicari. Paket `tangga` dan `prediksi-besok` menetapkan batas kejujuran (tanpa skor gabungan, tanpa "aman").
- Layar besar (M9): pola Layar Pimpinan `public/admin/pimpinan.js` (satu layar lintas sistem, API admin yang sudah ada). Fullscreen API dan Screen Wake Lock dipakai dengan deteksi fitur; dua-duanya dirujuk ke skill `modern-web-guidance` saat tiket dikerjakan (aturan pemilik nomor 8), bukan diputuskan dari ingatan di sini.
- Ekspor (M10): penulis `.xlsx` di `public/bnpb/dalops_hitung.js` (zip tanpa kompresi dan SpreadsheetML minimal; CSP halaman staf memblokir SheetJS di cdnjs), `/vendor/jspdf`. Aturan sel berawalan `=` dari KEPUTUSAN-LOGPAL T4.
