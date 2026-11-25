# Glosarium teknis

Halaman ini menjelaskan istilah teknis yang berulang di dokumen pengembang. Padanan berbahasa awam ada di Panduan, halaman Istilah yang sering muncul.

## Istilah

Istilah teknis yang muncul berulang. Tanda (dok. NN) menunjuk berkas yang menjelaskannya lebih rinci. Istilah yang dipakai dengan makna berbeda antarmodul dibahas di CELAH.md, bagian C.

- **3W**: Siapa mengerjakan apa di mana: baris pekerjaan organisasi luar per kejadian dan kabupaten/kota per klaster (dok. 09).
- **Angka utama**: Hitungan titik panas Centurisk97: banyaknya pasangan (hari WIB, sel sekitar 375 m) yang berbeda dari sensor MODIS, S-NPP, NOAA-20, dan NOAA-21 dengan semua tingkat keyakinan, tanpa sumber panas tetap (dok. 02, 01).
- **Asumsi-kebijakan**: Label keyakinan untuk angka yang berasal dari keputusan atau asumsi kerja, bukan dari pengukuran atau uji (dok. 09, 13).
- **AUC, Brier, POD, FAR, CSI, ETS, BSS, IoU**: Ukuran kinerja uji balik: luas di bawah kurva ROC, skor Brier, peluang deteksi, laju alarm palsu, indeks keberhasilan kritis, skor ancaman setara, skor keahlian Brier, dan irisan terhadap gabungan.
- **Baseline atau pembanding**: Cara sederhana yang harus dikalahkan sebuah model, misalnya persistensi atau klimatologi kabupaten dan bulan, sebelum model boleh ditampilkan tanpa label hipotesis.
- **BPBD**: Badan penanggulangan bencana daerah di provinsi, kabupaten, atau kota; pemegang akun lembaga di `/instansi` (dok. 12).
- **Buku Besar Kejadian**: Satu nomor `KJ-tahun-kode` dan satu halaman untuk tiap kejadian, dari terdeteksi sampai selesai (dok. 09).
- **Cluster atau kompleks api**: Gugus titik panas yang bersambung dalam ruang dan waktu, dibentuk ST-DBSCAN dan diberi status taktis (dok. 01, 02).
- **Dalops, Pusdalops, Koordalops**: Pantau Dalops adalah layar kejadian harian staf; Pusdalops dan Koordalops adalah peran staf dan juga sumber catatan logbook dan laporan WhatsApp yang dibaca layar itu (dok. 10).
- **DIBI**: Data dan Informasi Bencana Indonesia milik BNPB; sumber riwayat kejadian dan kebenaran uji banjir dan longsor. Tercatat susulan, sehingga label uji tertunda 14 hari (dok. 07).
- **dNBR, RBR**: Selisih indeks bakar ternormalisasi dari citra Sentinel-2 sebelum dan sesudah api, dan versi relatifnya; dipakai memperkirakan luas bekas bakar (dok. 02).
- **Estimasi-model**: Label keyakinan untuk keluaran model yang bukan pengukuran dan belum lulus ambang uji (dok. 09).
- **Firespot**: Penilaian ala Kemenhut atas pola tiga hari kelas titik panas per cluster; hasilnya ya atau mungkin (dok. 02).
- **FWI, FFMC, DMC, DC, ISI, BUI**: Indeks cuaca kebakaran Kanada dan komponennya (kelembapan bahan halus, humus, lapisan dalam, penyebaran awal, akumulasi bahan bakar). Kelas FWI 0 sampai 3 dipakai di aturan tingkat (dok. 02, 03).
- **Gerbang**: Dua arti: gerbang uji otomatis di `tests/agen/**` yang menjaga aturan repo, dan gerbang model yang menyembunyikan keluaran model bila kalah dari pembanding (dok. 03, 14).
- **GFM**: Global Flood Monitoring dari Copernicus: peta genangan dari radar satelit; bukan bukti negatif bila tidak terlihat (dok. 04).
- **GLIDE**: Nomor identitas bencana global yang dimintakan staf ke ADRC (dok. 09).
- **Hipotesis**: Status model yang belum lulus uji balik; tampil sebagai pil Hipotesis atau Belum diuji di layar.
- **HTH, SPI, ZOM**: Hari tanpa hujan, indeks hujan terstandar (SPI-1, SPI-3), dan zona musim BMKG; dasar status kekeringan (dok. 05, 07).
- **IKD, IRBI, InaRISK**: Indeks ketahanan daerah, indeks risiko bencana Indonesia, dan portal risiko BNPB yang dicerminkan di `/bnpb/inarisk` (dok. 10).
- **Jitupasna, R3P**: Pengkajian kebutuhan pascabencana dan rencana rehabilitasi dan rekonstruksi; fitur F4 Siklus Bencana (dok. 09).
- **kab4**: Kode kabupaten/kota 4 digit versi Kemendagri; kunci wilayah tunggal. Kode BPS dibedakan dan tidak dipakai langsung (dok. 09).
- **KHG, gambut, konsesi, PBPH**: Kesatuan hidrologis gambut, lahan gambut, areal izin pemanfaatan hutan, dan perizinan berusaha pemanfaatan hutan yang diiriskan ke titik panas (dok. 02).
- **KIB**: Kode Identitas Bencana 16 digit menurut juknis BNPB; di repo selalu berstatus usulan (dok. 11, 10).
- **Kosong bukan nol**: Aturan tampilan: nilai tidak terukur ditulis kosong atau "belum terukur", tidak pernah 0.
- **Label keyakinan**: Enam label angka di Siklus Bencana: resmi, terverifikasi, estimasi-model, asumsi-kebijakan, hipotesis, menunggu (dok. 09).
- **Laporan LA-**: Nomor laporan warga di Lapor Bencana berbentuk `LA-DDMMYY-NN`; belum terverifikasi sampai diperiksa BPBD wilayah (dok. 08).
- **Lifeline**: Status delapan layanan dasar per kabupaten/kota untuk satu kejadian; usulan mesin, status resmi ditetapkan staf (dok. 09).
- **Logbook Pusdalops**: Catatan kejadian piket Pusdalops sejak 2011; tanpa koordinat, memuat kejadian besar saja (dok. 09, 10).
- **LogPal**: Inventori logistik dan peralatan: stok gudang BNPB dan BPBD, mutasi, opname, dan permintaan bantuan (dok. 12).
- **Meja**: Layar kerja berbasis kode atau sesi; `/lapor/meja` untuk laporan, `/meja` untuk meja kerja kabupaten/kota (dok. 08, 10).
- **MHEWS, EWS**: Sistem peringatan dini multi-bahaya milik BNPB dan panel pemantauan alat sensor dan CCTV; data vendor belum diambil sampai izin tertulis (dok. 04, 05).
- **Nowcast**: Prakiraan jangka sangat pendek; di sini terutama peringatan dini BMKG yang aktif (dok. 06, 04).
- **OMC, TMC, sortie**: Operasi modifikasi cuaca, tim teknologi modifikasi cuaca, dan satu penerbangan penaburan bahan semai (dok. 06, 11).
- **Pemirsa**: Akun baca saja yang bertab tertentu; tombol tulis disembunyikan dan rute tulis ditolak (dok. 10).
- **PIC, profil**: Penanggung jawab BPBD yang memiliki profil, foto, dan PIN sendiri di dalam satu akun lembaga (dok. 12).
- **Pil**: Label kecil di layar yang menyatakan status data, misalnya Hipotesis, Belum diuji, atau perkiraan.
- **PM2,5, CAMS**: Partikel halus berukuran 2,5 mikron dan model kualitas udara CAMS beresolusi sekitar 40 km yang menjadi dasar prakiraan (dok. 06).
- **Pra-registrasi**: Kriteria uji dan ambang lulus ditulis dan dibekukan sebelum data uji dilihat; mengubahnya sesudahnya berarti mengganti versi (dok. 03, 04).
- **Prioritas provinsi**: Daftar provinsi yang masuk atau keluar berdasarkan rata-rata titik panas harian tiga hari terhadap ambang masuk dan keluar (dok. 01, 02).
- **PWA, Web Push, VAPID**: Aplikasi web terpasang, notifikasi peramban, dan pasangan kunci yang mengesahkan pengirim notifikasi (dok. 08).
- **Renlap, Renkon, Gladi**: Rencana lapangan (usulan target terbang atau kerja), rencana kontinjensi, dan latihan dari kejadian arsip (dok. 11, 09).
- **Segel dokumen**: Kode dan QR di lembar cetak untuk memeriksa keaslian dokumen; baru migrasi, belum ada rute (dok. 12).
- **SIHKA, GloFAS**: Pos tinggi air sungai Kementerian PU yang dihitung Worker, dan prakiraan debit sungai global (dok. 04).
- **SIPPA**: Kit pipa portabel untuk pemadaman karhutla di gambut dan banjir; layar `/pipa` (dok. 13).
- **SPM**: Dua arti dalam dokumen: standar pelayanan minimal (Rapor SPM, rancangan di dok. 09) dan nama parameter kualitas udara (dok. 06).
- **Tangga peringatan**: Susunan pernyataan BMKG dan prediksi kita dari skala musim sampai jam untuk satu kabupaten/kota (dok. 07).
- **Tingkat, level, status Normal, Waspada, Siaga, Awas**: Peringkat 0 sampai 3. Maknanya bergantung modul: status banjir per kecamatan, tingkat gunung api resmi PVMBG, tingkat taktis cluster, dan tanda WASPADA model membesar (dok. 03, 04, 05, 01).
- **Uji balik, uji tertahan, uji prospektif, vonis**: Uji balik memakai data lampau; uji tertahan menyisihkan periode yang tidak dipakai menyetel; uji prospektif membekukan prakiraan sebelum kejadian; vonis ditulis sekali dan tidak dihitung ulang.
- **VIIRS, MODIS, S-NPP, NOAA-20, NOAA-21**: Sensor satelit pendeteksi titik panas lewat NASA FIRMS. S-NPP berhenti didistribusikan pada 1 November 2026 pukul 13.00 UTC (dok. 02).
- **Worker, D1, R2, Actions, MCP**: Cloudflare Worker (kode server), basis data D1, penyimpanan objek R2, GitHub Actions (alur kerja terjadwal), dan server protokol konteks model untuk asisten AI (dok. 14).
