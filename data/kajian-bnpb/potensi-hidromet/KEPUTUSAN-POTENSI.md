# KEPUTUSAN-POTENSI: halaman Potensi Bencana Hidromet `/potensi`

Dokumen ini menang atas semua dokumen lain di folder ini. Paket induk `data/kajian-bnpb/dampak-peringatan/` tetap berlaku untuk hal yang tidak diubah di sini. Keputusan pemilik dicatat apa adanya; hal yang belum diputuskan ada di bagian Q dengan bawaan sementara bertanda **[BAWAAN SEMENTARA]**.

## Masalah

Paket Dampak Peringatan baru mengambil tiga hal dari dashboard hidromet InaRISK (tabel dampak per poligon, rincian per desa, fasilitas). Bagian lain dashboard itu belum ada di sistem kita: analisis wilayah, prakiraan BMKG per desa, kartu ONI dan IOD, debit sungai GloFAS, status banjir bandang, kelas bahaya per desa, dan rekomendasi per pihak. Bahannya sebagian sudah ada tetapi tersebar di `/prediksi`, `/kekeringan`, `/pesisir`, `/banjir`, dan pipeline yang tidak menerbitkan apa pun.

## Keputusan pemilik (26 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | "Yang rekomendasi per pihak kayanya bukan untuk publik." Rekomendasi per pihak (Pemerintah Pusat, Provinsi, Kab/Kota, Masyarakat) hanya untuk staf. |
| K2 | "Sisanya gas": analisis wilayah, prakiraan BMKG per desa, kartu ONI dan IOD, debit GloFAS, dan status banjir bandang masuk cakupan. |
| K3 | Status banjir bandang masuk (bagian dari K2). Ini menggantikan `dampak-peringatan` D4 ("banjir bandang di luar fase pertama") dan memperluas K15 paket itu, hanya untuk banjir bandang. |
| K4 | Rancangan awal memasukkan semuanya ke mode Peringatan Alun-alun. Pemilik lalu mengubah arah: "Atau lu tiru gini deh dia ga perlu di satu halaman. Bisa di halaman lain ya. Lu tiru dari platform meti" (rujukan Foundry IDN-GRID dan layar `/jaringan` repo `platformmeti`). Jadi semuanya masuk satu halaman baru bertab, bukan Alun-alun. |
| K5 | "Lu analisa lagi mana yang bisa lu ambil dari sini" (dashboard hidromet InaRISK) dan "tetap sesuaikan dengan konteks dan kebutuhan kita". Yang diambil hanya yang kita belum punya atau yang lebih baik dari punya kita; sisanya cara kita (prinsip induk K8). Hasil analisis ulang ada di RISET bagian 1. |
| K6 | (26 Nov 2026, jawaban D23) Aturan pinjaman membuat banjir tinggi di 61 persen dan banjir bandang di 68 persen kab terukur. Pemilik memilih "Ketatkan aturannya": kelas tinggi hanya bila porsi desa kelas tinggi paling sedikit 40 persen; syarat "30 desa dan 10 persen" yang memihak kab berdesa banyak dibuang. Dikunci sesudah sebaran baru dilihat. |

### Keputusan lama yang bersinggungan

| Keputusan lama | Bunyinya | Hubungan dengan paket ini |
| --- | --- | --- |
| `dampak-peringatan` D4, K15 | bandang di luar fase pertama; bahaya berikutnya hanya kekeringan dan gelombang | Diganti K3 untuk bandang saja. Gempa dan gunung api tetap tanpa status. |
| `dampak-peringatan` D11, D12 | tabel status dikunci dan bersidik sebelum uji balik; pil hipotesis sampai gerbang lolos | Berlaku untuk BDG: sidik versi baru sebelum uji (D12). |
| `dampak-peringatan` D18, AGENTS 2.53 | rincian per desa hanya staf; publik sampai kab | Berlaku untuk keterpaparan. Kelas bahaya per desa tampil publik adalah keputusan agent, bukan pemilik; ditulis sebagai Q9 dengan bawaan sementara. |
| `dampak-peringatan` D6, `siklus` U12 | kelas bahaya dari raster InaRISK lewat `bahaya_kelas.py`, batas 0,33 dan 0,66 | Untuk kelas kab dan desa diganti berkas kelas desa BNPB (D7), karena tarikan raster kita membuat 368 kab banjir "belum terukur". `bahaya_kelas.py` tetap dipakai mesin paparan. |
| `dampak-peringatan` K10 dan D22-D24 | mode Peringatan Alun-alun | Tetap seperti sudah dibangun. Ditambah satu tautan "Buka Potensi bencana" (D18). |
| `dampak-peringatan` Q7 | rekomendasi per audiens: paket terpisah | Dijawab K1 dan paket ini: staf saja. |
| `prediksi-kejadian` D3 | kode prakiraan baru butuh pemilik | K3 adalah keputusan pemilik untuk kode BDG. |
| `inarisk` K3 | angka pengisi InaRISK tidak ditiru | Dipatuhi. Yang dipakai hanya atribut kelas dari berkas sumber BNPB; status, penduduk, dan matriks mereka tidak. |
| `tangga` D6 | pernyataan iklim lebih dari 14 hari tidak tampil di Tangga | Hanya untuk Tangga. Kartu ONI dan IOD memakai batas basi sendiri (D5). |
| Pil ENSO kepala peta utama disembunyikan 20 Nov 2026 (`public/lapisan5.js`) | | Tetap tersembunyi di peta utama. ONI dan IOD hanya di `/potensi` (Q5). |
| `banjir` PRAREG-DEBIT, PRAREG-BANDANG | debit per kab dan nowcast bandang terkunci prospektif | Tidak disentuh. Debit tampil deskriptif berpil hipotesis, tidak menjadi status (D6). |
| `peta-situs` K1-K5 | tiap halaman baru wajib punya entri registri di commit yang sama | `/potensi` masuk registri di PH-00. Alamat `/peringatan` (langganan) tidak diubah. |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Halaman baru `/potensi`, judul "Potensi bencana hidrometeorologi". Kerangka meniru `/jaringan` METI: kepala halaman, pil tab di tengah, satu peta MapLibre layar penuh dipakai bersama tab peta (ganti tab = ganti lapis dan isi panel, peta tidak dimuat ulang), panel kiri yang bisa dilipat (lembar bawah di HP), slot bawah untuk garis waktu dan legenda; tab baca membuka wadah halaman biasa. Yang ditiru pola dan metode, bukan rupa, teks, atau angka Foundry. | K4. |
| D2 | Tujuh tab. Tab peta: **Status**, **Dampak**, **Iklim**. Tab baca: **Analisis**, **Lapisan**, **Ringkasan**, **Sumber**. Tab kedelapan **Rekomendasi** hanya muncul bila sesi staf sah (diperiksa ke Worker, bukan disembunyikan dengan CSS). Tanpa kotak tanya atau obrolan (METI juga tidak memakainya). Bahasa Indonesia saja. | K1, K4; YAGNI. |
| D3 | Tab Status: kab diwarnai status tertinggi atau status bahaya terpilih, abu "belum terukur". Panel kiri: angka ringkas (Awas, Siaga, Waspada, Normal, Belum terukur), pil bahaya, daftar kab urut prioritas. Garis waktu bawah lima pilihan: Hari ini, Besok, Lusa, Hari ke-3 (membaca `hari[0..3]` di `status.json`), dan Ringkas 3 hari (maksimum keempatnya, bawaan), dengan tombol putar yang melewati empat hari. Klik kab: kartu fakta di panel (status per bahaya per hari dengan nilai pemicu, prakiraan BMKG per desa, debit, keterpaparan kab, kelas bahaya desa). | Pola Mix dan Twin Foundry. |
| D4 | Tab Dampak: poligon peringatan BMKG aktif di peta, panel berisi daftar peringatan aktif dan keterpaparan per peringatan tingkat kab (induk). Akun staf: tabel per desa, fasilitas bernama, CSV (rute induk `/desa`). | Pola Flow; satu mesin paparan. |
| D5 | Tab Iklim: kartu ONI dan IOD (`public/data/iklim.json`; IOD dari DMI NOAA, bila basi dari BoM yang sudah dibaca `iklim.py`), peta prediksi hujan bulanan BMKG per kab bila Q4 dijawab, hari tanpa hujan per kab, debit GloFAS per kab. ONI lebih tua dari 45 hari atau DMI lebih tua dari 21 hari tampil abu "basi". | Data IOD macet sejak 27 Sep 2026. |
| D6 | Debit GloFAS per kab dari `scripts/banjir/debit_glofas.py` diterbitkan ringkas (puncak hari 0 sampai 2, horizon ramalan 3 hari, dan rasio terhadap Q2). Selalu berpil hipotesis dan deskriptif, tidak menjadi status dan tidak masuk matriks, sampai PRAREG-DEBIT punya vonis. | Uji A dan B belum dibuka. |
| D7 | Kelas bahaya per desa dari berkas BNPB yang dipakai dashboard hidromet: `hidromet_kab.json` (diturunkan dari `DESA_BASELINE_PROYEKSI_BAHAYA_IKLIM`, 83.518 desa, enam bahaya, kelas baseline dan proyeksi, prioritas) dan `village_pts.json`, ditarik bulanan ke `data/raw/`, disalin ringkas ke `public/data/kelas_desa_bnpb.json`. Kelas kosong atau 0 = "belum terukur", tidak pernah rendah. Yang tampil bawaan: baseline. Proyeksi tampil berlabel "proyeksi, tahun dan skenario tidak tercantum di sumber" (catatan meta berkas sumber). | Data resmi BNPB tingkat desa; lebih baik dari sampel raster kita (K5). |
| D8 | Kelas kab untuk matriks status (K) diturunkan dari kelas desa D7 lewat aturan sebaran kelas desa yang ditulis terbuka di ALGORITMA 5 dan dikunci bersidik sebelum uji balik. `kelas_kab.py` (sampel raster) dipensiunkan dari jalur status dan tetap ada sebagai pemeriksa silang. | Menggantikan K null massal. |
| D9 | Status banjir bandang, kode `BDG`: matriks K kali E yang sama dengan BNJ, K dari kelas bandang D8, E sama dengan BNJ. Berpil hipotesis. Catatan jujur: E dari hujan harian tidak menangkap pemicu bandang yang berdurasi pendek, jadi BDG hampir selalu bergerak bersama BNJ dan hanya berbeda karena K; ia bukan sinyal mandiri. Label DIBI banjir bandang jarang, sehingga gerbang bisa tidak pernah menyatakan `boleh_tampil`; BDG lalu tetap hipotesis selamanya, dan itu diterima. | K3; tanpa model baru. |
| D10 | Prakiraan BMKG per desa diambil saat kab dipilih lewat rute Worker `GET /api/bmkg/desa?kab=`, cache 3 jam, batas laju per IP, batas panggilan ke BMKG 50 per menit. Bila Worker ditolak BMKG (403), runner harian mengambil semua desa kab Waspada ke atas ke R2 dan rute membaca R2 (Q2). | Mac ditolak 403; runner 200; Worker belum diuji. |
| D11 | Rekomendasi per pihak: struktur empat pihak kali tiga fase (Respons untuk Siaga dan Awas, Kesiapsiagaan untuk Waspada, Mitigasi untuk Normal) meniru InaRISK. Katalog di `src/rekomendasi_katalog.js` (di Worker, tidak di `public/`). Tiap butir menyebut rujukannya; kolom Masyarakat memakai butir `public/ews_tindakan.js` yang sudah bersumber. Butir pustaka InaRISK hanya disebut "generik, bukan instruksi resmi" sebagaimana sumbernya menyatakan diri (Q3). Rute `GET /api/potensi/rekomendasi` hanya `stafOK`. | K1. |
| D12 | Kriteria status ditambah `BDG` dan K dari D8 lewat amandemen kriteria dengan konvensi yang sudah ada: `.sidik` aktif ditulis ulang, sidik sebelumnya diarsipkan sebagai `.sidik.v2` (amandemen induk). Uji balik memisah label DIBI "Banjir Bandang" dari BNJ untuk BDG; BNJ memakai label lamanya supaya tidak mundur. | Induk D11, D12. |
| D22 | K baru mengubah status BNJ dan LSR secara massal (kab yang dulu null menjadi terisi). Karena itu arsip harian status mencatat `versi_kriteria`; jendela uji prospektif untuk kriteria baru dimulai dari tanggal amandemen; skor jendela lama dinilai terpisah dan tidak digabung. Arsip lama tidak ditulis ulang. | Induk D11, D12: kriteria terkunci, arsip append-only. |
| D23 | Sebelum kriteria dikunci, PH-01 melaporkan sebaran K per bahaya (jumlah kab tinggi, sedang, rendah, belum terukur) dan bedanya dengan `kelas_kab.py`. Bila kab tinggi lebih dari 60 persen atau kurang dari 5 persen kab terukur untuk satu bahaya, berhenti dan tanya pemilik sebelum sidik dikunci. Penyebut N memasukkan desa tanpa kelas seperti aturan sumber; dampaknya (porsi tinggi tertekan di kab dengan banyak desa tanpa kelas, syarat jumlah desa memihak kab besar) dicatat sebagai bias yang diketahui. | Aturan pinjaman tidak dikunci buta. |
| D13 | Tab Analisis: matriks bahaya kali status (kab K tinggi, desa kelas tinggi, sebaran status), 10 kab hujan prakiraan tertinggi, kab hari tanpa hujan terpanjang, kab pesisir gelombang tertinggi, kab debit tertinggi terhadap Q2, desa dengan bahaya tinggi terbanyak. Satu berkas `analisis.json` dibangun pipeline tiap jam. | Satu mesin, teruji `--cek`. |
| D14 | Tab Lapisan (ontologi): tumpukan enam lapis yang digambar dari objek nyata: Peringatan BMKG aktif, Bahaya, Provinsi, Kab/kota, Kecamatan, Desa. Klik lapis untuk daftar objeknya; klik objek untuk mengikuti yang terkait ke lapis bawah (jejak di atas tabel). Kecamatan dan desa publik hanya membawa kelas bahaya dan status kab induknya, tanpa paparan. | Pola Ontology Foundry, dibatasi D18 induk. |
| D15 | Tab Ringkasan: bab bernomor yang ditulis mesin dari data hari itu (keadaan hari ini, bahaya yang paling banyak naik, kab yang perlu dipantau, iklim, apa yang belum terukur, cara halaman ini dibuat). Tiap angka membawa chip status fakta D16. Kalimat dari templat, tanpa tafsir sebab. | Pola Briefing; tanpa kalimat kesimpulan di kartu (AGENTS 3.5) karena ini halaman baca, bukan kartu. |
| D16 | Status fakta, tampil sebagai chip di kartu, tabel, dan bab: **Bersumber** (sumber publik menyebutnya), **Dihitung** (hitungan dari fakta lain), **Hipotesis** (model kita yang belum lulus uji balik), **Belum terukur** (data tidak ada; tampil kosong, tidak pernah 0). Tiap fakta membawa id sumber dan tanggal data. | Pola Sources Foundry dan METI KJ. |
| D17 | Tab Sumber: arti chip, tanggal data per sumber, cara status dihitung, daftar sumber dengan atribusi (BMKG, BNPB InaRISK, NOAA CPC, BoM, Copernicus GloFAS lewat Open-Meteo, NASA). Halaman `/docs` memuat metode lengkap dan ditautkan. | AGENTS 3.5: tanpa kaki sumber di kartu. |
| D18 | Alun-alun `/lapor` mode Peringatan tetap seperti sekarang; ditambah tautan "Buka Potensi bencana" ke `/potensi`. `/prediksi`, `/bnpb/dalops`, dan peta tiap bencana tidak berubah. | Satu rumah untuk analisis mendalam. |
| D19 | Hari tanpa hujan: `scripts/kekeringan/hth.py` dijadwalkan harian; ditulis "hari tanpa hujan sampai kemarin", tidak pernah prakiraan. | HTH basi sejak 19 Okt 2026. |
| D20 | Yang sengaja tidak diambil dari InaRISK: status dari satu titik Open-Meteo per kab; penduduk dari raster InaRISKPOP tanpa pembulatan; hitung dampak di peramban; umpan Laporan terkini dan Lapor kejadian InaRISK (memuat nama, kita punya Lapor Bencana); notifikasi WA ke daftar penerima super user (kita punya Web Push langganan); unggah CSV peluang hujan oleh petugas dan simpan ke GeoServer; animasi angin; Simulasi banjir dan WebGIS (kita punya `/banjir` dan peta tiap bencana). | K5, induk K8. |
| D21 | Teks: "Awas", bukan huruf kapital semua; tidak pernah "aman"; tidak ada "·"; angka dibulatkan; kosong tidak pernah 0. | Aturan situs. |

## Pertanyaan terbuka

| No | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| Q1 | Memakai berkas kelas desa BNPB dari server dashboard hidromet InaRISK (D7) | **[BAWAAN SEMENTARA]** dipakai, dengan atribusi "BNPB InaRISK, kelas bahaya desa"; bila pemilik ingin lewat jalur resmi (permintaan data ke Direktorat terkait), diganti sumbernya tanpa mengubah layar |
| Q2 | Jalur prakiraan BMKG per desa | **[BAWAAN SEMENTARA]** rute Worker; bila 403, runner untuk kab Waspada ke atas |
| Q3 | Sumber butir rekomendasi Pusat, Provinsi, Kab/Kota | **[BAWAAN SEMENTARA]** butir dengan rujukan peraturan yang teksnya ada di repo atau JDIH BNPB; butir pustaka InaRISK boleh tampil berpil "generik, bukan instruksi resmi" |
| Q4 | Prediksi hujan bulanan BMKG (peluang) per kab | **[BAWAAN SEMENTARA]** tidak dulu; bila dijawab ya, dibaca dari rilis BMKG `bmkg.go.id/iklim/prediksi-curah-hujan`, bukan dari unggahan petugas InaRISK |
| Q5 | Kartu ONI dan IOD padahal pil ENSO peta utama disembunyikan 20 Nov | **[BAWAAN SEMENTARA]** tampil di tab Iklim `/potensi` saja |
| Q6 | Debit GloFAS menaikkan status banjir | **[BAWAAN SEMENTARA]** tidak, sampai vonis PRAREG-DEBIT |
| Q7 | Nama dan alamat halaman | **[BAWAAN SEMENTARA]** `/potensi`, "Potensi bencana hidrometeorologi" |
| Q9 | Kelas bahaya per desa tampil publik (D7, D13, D14), padahal induk D18 membatasi keluaran publik sampai kab | **[BAWAAN SEMENTARA]** ya untuk kelas bahaya saja (data kelas BNPB yang juga terbuka di dashboard hidromet, bukan paparan); keterpaparan, penduduk, dan fasilitas per desa tetap staf |
| Q10 | `/potensi` terbuka tanpa login di centurisk97.id (masuk `PUBLIK_TANPA_SESI`, KEPUTUSAN-MASUK) | **[BAWAAN SEMENTARA]** tidak; terkunci seperti `/prediksi` (gerbang halaman default tertutup). Data statusnya sendiri sudah publik lewat `/api/dampak-peringatan/status` |
| Q8 | Kelas proyeksi ditampilkan | **[BAWAAN SEMENTARA]** ya, di kartu desa dan tab Analisis sebagai kolom terpisah berlabel; tidak dipakai untuk status |
