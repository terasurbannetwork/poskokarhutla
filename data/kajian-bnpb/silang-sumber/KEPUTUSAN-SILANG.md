# KEPUTUSAN-SILANG: Silang Sumber

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya; hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan.

Modul ini enam fitur yang saling memeriksa sumber: F1 Rapor Sumber, F2 Tsunami per zona, F3 Alarm beda sumber, F4 Jendela kirim bantuan, F5 Deteksi gempa beruntun, F6 Kalender ancaman daerah.

## Keputusan pemilik (10 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | Bangun enam fitur di atas. Pemilik dan Staf Ahli BNPB menyetujui pada 10 Nov 2026. |
| K2 | Status resmi tampil apa adanya, berlabel lembaga (BMKG, PVMBG, dan seterusnya). Tidak ditafsir ulang. |
| K3 | Hasil turunan berlabel "Deteksi Centurisk97" dan tidak tampil sebagai peringatan sebelum lolos uji balik, memakai pola `docs/TIKET-DATA-BMKG.md` (status resmi apa adanya, hasil turunan lolos uji balik dulu). |
| K4 | Tanpa pernyataan resmi tidak pernah ditulis "aman". Yang boleh: "tidak disebut", "belum ada data", "belum teruji". |
| K5 | Jumlah kejadian (a + c) kurang dari 30: tidak diberi persen. Tabel a, b, c, d dan n tetap tampil. |
| K6 | Arsip append-only dan dibekukan sebelum dinilai. Penilaian prospektif: tidak boleh mengisi arsip mundur dan tidak boleh menilai baris yang dibekukan sesudah periode targetnya mulai. |
| K7 | Warna peta tidak dijadikan angka. |
| K8 | Tiap bagian layar laporan memakai kartu `.ex.ex-std` (AGENTS.md 3.5). |
| K9 | Ketentuan BMKG soal akses otomatis sudah disadari pemilik pada 10 Nov 2026. API `tropicalcyclone` ber-token tidak dipakai. |
| K10 | F4 adalah tiket LG-14 di `data/kajian-bnpb/logpal/TIKET.md` apa adanya, tanpa vonis layak atau tidak layak. Dokumen ini hanya merujuk. |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Batas dengan modul Tangga Peringatan: Tangga menampilkan pernyataan sumber saat ini per kabupaten dan skala waktu (`data/kajian-bnpb/tangga/`). Silang menilai sumber lawan kejadian (F1), membandingkan sumber (F3), dan empat hal lain. Silang tidak menulis di `public/prediksi/**`, `scripts/prediksi/**`, `tests/prediksi/**`, dan tidak mengubah `tangga.json`. | Tangga dipegang agent `prediksi`; menghindari dua penulis di berkas yang sama. |
| D2 | F3 menulis `public/data/bnpb/beda_sumber.json`. Tangga boleh membacanya; menambah pembaca itu keputusan pemilik Tangga (Q5). Silang tidak mengubah Tangga. | Kontrak berbasis berkas, bukan impor kode. |
| D3 | Skor "status Centurisk97" di F1 diambil dari `cuaca_prospektif_*` (milik cuaca-udara), bukan dari `prediksi.json` (milik Tangga dan prediksi). Rapor milik modul prediksi sendiri tidak diduplikasi. | Satu sumber kebenaran per rapor. |
| D4 | F1 adalah realisasi DB-09 di `docs/TIKET-DATA-BMKG.md`. Saat SS-05 selesai, baris DB-09 diubah menjadi rujukan ke SS-02 sampai SS-05 (SS-06). | Satu daftar tiket. |
| D5 | F1 punya layar sendiri `/bnpb/rapor-sumber`. F3 ditambahkan sebagai bagian di `/bnpb/silang` yang sudah ada (kajian DIBI lawan logbook). | `/bnpb/silang` sudah berisi kajian silang sumber. |
| D6 | Unit penilaian F1: provinsi dan nasional dulu; kabupaten hanya bila a + c kabupaten itu mencapai 30. | Sampel kabupaten hampir pasti kecil. |
| D7 | F6 membaca `public/prediksi/data/kalender_risiko.json` (milik prediksi, dari logbook) sebagai masukan, tidak menggantikannya. | Berkas itu sudah ada dan punya penguji. |
| D8 | Tidak ada tabel D1 dan tidak ada rute worker baru. Semua keluaran adalah JSON statis. Karena tidak ada tulisan ke D1, tombol dummy tidak berlaku (pola Tangga D7). Isian uji ada di fixture. | Cakupan terkecil. |
| D9 | Layar bagi staf (`noindex`). F2 di `/gempa` tetap mengikuti keterbukaan halaman itu; teks peta waktu tiba memakai gambar BMKG utuh dengan sumber. | Peringatan publik adalah wewenang BMKG. |

## Pertanyaan terbuka untuk pemilik (Q)

Kolom "Menahan" menyebut tiket yang tidak boleh jalan sebelum dijawab.

| Q | Pertanyaan | Keadaan sekarang | Menahan |
| --- | --- | --- | --- |
| Q1 | F5: sumber riwayat apa untuk baseline laju gempa kecil? | **TERJAWAB 10 Nov 2026 (pemilik: "Pakai USGS M 4,5+").** Baseline = laju historis USGS M >= 4,5 sejak 2000 di lingkaran tiap gunung api (`riwayat_grid.json` terlalu kasar, sel 0,1 derajat, jadi dipakai katalog USGS `data/raw/gempa/susulan_katalog.json`; hasil dikomit di `beruntun_baseline.json`). Hitungan 7 hari memakai ambang M >= 4,5 dari BMKG plus USGS tanpa dobel (logika `src/gempa.js`). Mc 5,1 katalog BMKG dibuang; kelengkapan M 4,5 USGS dengan cek nilai-b. Keterbatasan wajib tampil: hanya M 4,5 ke atas, kawanan gempa kecil vulkanik tidak terlihat. | selesai (SS-40 sampai SS-44) |
| Q2 | F5: sasaran sekitar mana yang dipantau? Usulan: 20 km sampai 50 km dari gunung api aktif Level II ke atas (daftar MAGMA di `public/gunungapi/data/gunung.json`), dan segmen sesar utama. Daftar sesar belum ada di repo. | Gunung api ada; sesar belum. | tidak menahan SS-41 (gunung api dulu) |
| Q3 | F3: ambang "perlu dicek". Usulan awal: beda dua peringkat atau lebih pada skala 0 sampai 3, dan tinggi gelombang model dan BMKG beda lebih dari faktor 2. Angka ambang memang usulan, belum ada dasar data. | Dipakai sebagai nilai awal; diatur ulang setelah arsip cukup. | tidak menahan |
| Q4 | F1: kejadian lawan apa untuk gelombang tinggi dan angin kencang? DIBI memuat "cuaca ekstrem" dan "gelombang pasang", tetapi pemetaan ke prakiraan maritim belum diperiksa. | Dipakai: DIBI jenis terkait, dengan catatan telat lapor. | tidak menahan SS-02 |
| Q5 | F3: bolehkah Tangga Peringatan membaca `beda_sumber.json` (menampilkan tanda "perlu dicek" pada anak tangga)? Itu perubahan di modul Tangga. | Tidak dikerjakan di paket ini. | tidak menahan |
| Q6 | F2: sumber penduduk, sekolah, dan faskes per kabupaten pesisir sudah ada di repo (dicek di SS-11). Bila kabupaten tertentu tidak punya, tertulis "belum ada data". Cukup? | Dipakai. | tidak menahan |
| Q7 | F6: boleh prediksi bulanan BMKG dan laju kejadian ditampilkan berdampingan, tanpa skor gabungan, sampai ada uji balik? | Dipakai (K3, K5). | tidak menahan |
| Q8 | F1: arsip dimulai dari tanggal berapa untuk tiap sumber? Dibaca dari berkas arsip di SS-02; tidak dikarang di dokumen. | Dibaca saat SS-02. | tidak menahan |
