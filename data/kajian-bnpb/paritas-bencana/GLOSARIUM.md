# GLOSARIUM: Paritas Bencana

Istilah di paket `data/kajian-bnpb/paritas-bencana/`. Bila istilah bertentangan dengan `KEPUTUSAN-PARITAS.md`, keputusan menang. Kode D, K, Q merujuk berkas itu.

## 1. Istilah paket

| Istilah | Arti di paket ini |
| ------- | ----------------- |
| Paritas | Keadaan ketika sebuah bencana punya komponen sebanyak karhutla dan banjir. Diukur dengan hitungan ADA, SEBAGIAN, BELUM atas 113 komponen PAKET-FITUR ditambah G01 sampai G11, bukan dengan penilaian tangan |
| ADA | Komponen sudah berjalan dan menyebut sedikitnya satu berkas bukti yang benar-benar ada di repo |
| SEBAGIAN | Komponen ada tetapi tidak lengkap, atau bukti menunjuk berkas yang tidak ada (skrip paritas menurunkan ADA ke SEBAGIAN) |
| BELUM | Komponen berlaku untuk bencana itu dan belum dibangun |
| TIDAK BERLAKU | Komponen tidak relevan untuk bencana itu; tidak masuk jumlah berlaku. Setelah K5, G02, G03, G10 tidak boleh lagi bernilai ini di gempa, cuaca, udara |
| Jumlah berlaku | ADA + SEBAGIAN + BELUM, dasar "target ADA" di PRD bagian 3 |
| Target ADA akhir F2 | ADA sekarang + BELUM sekarang; batas bawah, bukan janji |
| Hitung ulang paritas | Keluaran skrip `scripts/agents/paritas.mjs` (PB-01) atas `docs/multi-bencana/bencana/<id>.md`, ditulis ke `public/data/paritas.json` (Q12) |
| Hitungan acuan | Hitungan terakhir yang dibekukan sebagai pembanding; skrip gagal bila ADA karhutla atau banjir turun dari acuan |
| Generik | Dibangun sekali di `src/`, `scripts/umum/`, `public/inti/` lalu dinyalakan per bencana lewat registri (D1); lawan dari salinan per bencana |
| Registri kemampuan | Kunci `kemampuan` di tiap entri `public/bencana.json` (operasi, renlap, dokumen, ews, dasbor, ekonomi, pencegahan, prioritas); ditegakkan `scripts/umum/bencana.py` |
| Menyalakan | Menambah kunci di registri sehingga satu kemampuan generik berlaku untuk satu bencana; tidak ada percabangan per bencana di kode layar |
| Fase F1, F2, F3 | F1 fondasi generik W1 sampai W4 dengan karhutla dan banjir sebagai pemakai pertama; F2 menyalakan per bencana berurut D5; F3 W5, W6, W7 lanjutan (D4) |
| W1 sampai W7 | Tujuh alur kerja D3: operasi dan renlap, pembuat dokumen, peringatan dan tangga tindakan, dashboard pimpinan dan papan SK, keputusan ekonomi dan prioritas, bukti model, data publik dan mesin mutu |
| F-1 sampai F-33 | Kode fitur di PRD bagian 4 |
| PB-NN | Kode tiket di `TIKET.md` |
| Urutan D5 | longsor, pesisir, udara, kekeringan, cuaca, gempa dan tsunami, gunung api, banjir |
| Pemakai pertama | Karhutla dan banjir yang membuktikan bahwa generik tidak memundurkan modul matang (D4) |

## 2. Operasi, renlap, dokumen

| Istilah | Arti |
| ------- | ---- |
| Operasi | Kegiatan penanganan lapangan untuk satu wilayah dan satu jenis bencana, tercatat sebagai tugas (`tugas_api`) di `/operasi`. Tidak pernah dibuka oleh peringatan sendiri |
| Renlap | Rencana lapangan: daftar target, sumber daya, rute, dan masa berlaku untuk satu wilayah dan tanggal. Berversi, tersimpan di R2, tidak pernah ditimpa setelah terbit |
| Renops | Rencana operasi, kerangka Perka BNPB 24/2010 (isi lampiran bertanda perlu cek) |
| Sitrep | Laporan situasi per periode; angka dari sistem, kalimat kebijakan ditulis staf |
| KIB | Kode identitas bencana 16 digit (migrasi 0094); laporan per KIB menyusun kronologi satu kejadian |
| Laporan berkala | Laporan Kepala BNPB kepada Presiden (harian, mingguan, bulanan, tahunan). Perakitnya milik paket `laporan-berkala` (D9); paket ini hanya menyediakan angka (F-13) |
| Dokumen beku | Dokumen berstatus `beku` di `pb_dokumen`; berkas R2 ditulis sekali dan tidak ditimpa; koreksi berupa versi baru |
| Versi | Nomor urut 1 sampai 99 per (bencana, wilayah, tanggal atau periode); versi baru = `max + 1` dalam satu `INSERT ... SELECT` |
| Status renlap | `diminta`, `draf`, `terbit`, `selesai`, `gagal`, `dibatalkan` |
| Masa berlaku | `berlaku_sampai` = terbit + 14 hari (bawaan Q26), dihitung saat baca, tanpa cron |
| Callback mesin | `POST /api/pb/renlap/selesai`, ditandatangani HMAC-SHA256 memakai `RENLAP_KUNCI`, selisih waktu paling lama 300 detik |
| Sarana | Alat, kendaraan, tenda, pompa yang dimiliki atau ditempatkan (`pb_titik.golongan = sarana`); satuan unit, bukan nama orang |
| Fasilitas sasaran | Tempat yang sudah ada di lapangan: tempat evakuasi, faskes, sekolah, gudang, helipad, sumber air, barak (`golongan = fasilitas`) |
| Hasil tindakan | Isian per target renlap: didatangi atau tidak, alasan, hasil (`pb_renlap_hasil`) |
| Kepatuhan | Persen target renlap yang didatangi, dilaporkan per bencana, wilayah, dan jenis alasan; tidak pernah per pengisi |
| Isian manual | Catatan operasi yang diisi staf berperan atau akun instansi wilayahnya karena sumber otomatis tidak ada (F-4) |
| Pemirsa | Sesi staf bertab pusdalops yang hanya boleh GET pada rute di `IZIN_PEMIRSA_PUSDALOPS`; tidak boleh membuka berkas renlap atau dokumen (Q31) |
| Akun gerbang | `AKUN_SITUS*` yang dipakai pimpinan sebagai pembaca; lolos `adminOK` tetapi tidak pernah menulis di paket ini |
| `modOK` | Penjaga tulis pemegang `ADMIN_TOKEN` (moderator); tulis paket ini memakainya, bukan `adminOK` |

## 3. Peringatan dan status darurat

| Istilah | Arti |
| ------- | ---- |
| Tingkat | 1 Waspada, 2 Siaga, 3 Awas (`TINGKAT` di `public/ews_tindakan.js`); 0 = tidak ada peringatan. Label resmi sumber tetap tampil di samping |
| EWS | Sistem peringatan dini `src/ews.js` yang menilai berkas data dan menulis baris `peringatan` |
| CAP | Common Alerting Protocol 1.2, keluaran peringatan terpadu (`bentukCap`); waktu berformat `+00:00` |
| Peringatan terpadu | Baris `peringatan` lintas jenis (`src/peringatan.js`); jenis lamanya dibatasi CHECK; jenis baru ada di tabel samping `peringatan_x` (D13) |
| D13 | Rancangan tabel samping `peringatan_x` (migrasi `CREATE TABLE IF NOT EXISTS`, aman diulang) untuk jenis gunungapi, udara, kekeringan, pesisir, longsor, rob; tabel `peringatan` lama tidak disentuh dan pembaca memakai UNION ALL (DESAIN-TEKNIS 3.4) |
| Kunci dedupe | `jenis:wilayah_atau_objek:tingkat`; satu pengiriman per kunci, kenaikan tingkat membuat kunci baru, turun tingkat tidak mengirim |
| Tangga tindakan | Daftar tindakan per tingkat peringatan per bencana (`BENCANA` di `public/ews_tindakan.js`) dengan pelaksana dan batas waktu; menyala otomatis saat tingkat berubah |
| Butir | Satu tindakan di tangga; pelaksanaannya dicatat di `pb_tindakan` |
| Telat | Butir yang lewat batas waktu (target sistem, Q20, bukan ketentuan hukum); sumber basi mengubahnya menjadi "menunggu data" |
| Hipotesis | Keluaran model yang belum lolos uji balik; tampil dengan pil "hipotesis", tidak dikirim lewat email, push, atau CAP (Q17), tidak dipakai untuk keputusan ekonomi atau prioritas (D6) |
| Prospektif | Penilaian prakiraan yang dibekukan sebelum kejadian (append-only) lawan pengamatan, dengan baseline persistensi dan klimatologi (`scripts/prediksi/`) |
| Uji balik | Penilaian model atas data lampau dengan pembagian waktu kronologis; vonis "mengalahkan baseline" hanya bila n paling sedikit 30 |
| SK status darurat | Surat keputusan siaga darurat, tanggap darurat, atau transisi pemulihan dari kepala daerah, diisi staf ke `logbook_sk` (Q5) |
| Papan status darurat | Tampilan SK per wilayah dengan sisa hari dan sinyal `akan_berakhir` (7 hari, Q27); hanya membaca `logbook_sk` |
| Saran status | Keluaran `saran_status.py`; saran, bukan penetapan |
| Kesegaran (segar, basi, mati) | Umur berkas dibanding batas: sampai 1x batas segar, sampai 3x basi, lebih dari 3x mati (ALGORITMA bagian 7) |
| Kejadian besar | Kejadian yang memicu laporan per KIB dan kasus historis; ambang aktivasi Pusdalops di logbook (Q23) |

## 4. Layar dan desain

| Istilah | Arti |
| ------- | ---- |
| Model A | Bentuk dashboard `/operasi`: kepala halaman L1 gelap, panel seksi kiri, isi kanan dengan kartu terang, kaki "Pembaruan data". Wajib untuk layar dashboard (K4); ditegakkan `gerbang-dasbor` |
| L1, L2, L3, L4 | Tingkat wadah: L1 kepala halaman (satu-satunya latar gelap selain kepala tabel), L2 kepala bagian dan kartu terang, L3 blok per wilayah, L4 kartu entitas |
| `DasborA` | Cangkang model A di `public/inti/dasbor.js`; pegangan tarik panel kiri ditambahkan PB-02 (D12) |
| Kartu standar | `.ex.ex-std` dari `public/inti/kartu.css`; kepala nama seksi, tanpa kalimat kesimpulan, tanpa kaki sumber (AGENTS.md 3.5) |
| Pil | Label berikon dan teks; status memakai warna, ikon, dan teks sekaligus |
| Saringan jenis | Deret pil saring selebar penuh, pilihan jamak (Q14); mengubah atribut `hidden`, tanpa panggilan jaringan per klik |
| Keadaan layar | Memuat, kosong, galat, luring, basi; tanpa angka contoh, tanpa data dummy |
| Baru, Sebagian, Dipakai (data publik) | Status baris di `docs/multi-bencana/DATA-PUBLIK.md`: Baru belum dipasang, Sebagian dipakai satu bencana tetapi belum bencana lain, Dipakai terpasang dengan skrip, uji, jadwal |
| Tinjau lokal | `http://localhost:8800/<jalur>`: kode dari folder kerja, data dan login dari produksi; tulisan lewat server ini mengenai produksi |
| INP | Interaction to Next Paint; klik tidak boleh membekukan layar, kontrol urgent, isi berat ditunda |
| Adaptor layar | Berkas kecil `public/<id>/<fitur>.js` yang memasok angka dan teks dari data halaman ke mesin inti W8 (pola `Bagikan.tema`); tidak menggambar dan tidak memuat pustaka sendiri (D15) |
| Pilot gempa | Laman `/gempa` sebagai pemakai pertama mesin W8; tiga bencana lain dinyalakan sesudah pemilik menyetujuinya di PB-78 (K12) |
| Brief pimpinan | Dua halaman A4 berisi angka halaman bencana pada saat dicetak, tanpa kalimat kebijakan buatan mesin (F-35) |

## 5. Data dan mesin

| Istilah | Arti |
| ------- | ---- |
| Ringkas | `public/data/ringkas/<id>.json`, muatan ringkas publik per bencana (paling besar 100 KB) tanpa data operasi |
| Blok `laporan_berkala` | Kumpulan angka bernama stabil di tiap berkas ringkas yang diminta perakit laporan berkala |
| Koefisien bersumber | Nilai dengan tiga isian wajib (nilai, satuan, sumber); tanpa sumber, angka rupiah bernilai `null` (Q6) |
| Prioritas wilayah | Peringkat rata-rata persentil bahaya, paparan, kerentanan, tren peringatan; bobot 0,4 0,3 0,2 0,1 berlabel hipotesis (Q21) |
| Skrip panen | Skrip stdlib di `scripts/umum/<nama>.py` dengan subperintah `uji`; satu data satu skrip satu langkah workflow |
| Gagal lunak | Skrip panen yang gagal tidak menghapus berkas lama dan keluar 0; tiga kegagalan berturut-turut membuat sumber berstatus mati |
| Tabel samping | `tugas_bencana_x`, tabel 1:1 untuk jenis tugas longsor dan pesisir karena CHECK `tugas_bencana` (0047) tidak dapat diubah |
| `tanpaTabelPb` | Penangkap galat `no such table` agar tayang dan migrasi tidak saling menunggu; tulis menjawab 503, baca menjawab daftar kosong dengan `tersedia: false` |
| Hapus lunak | Kolom `dihapus` terisi, baris tidak dihapus; riwayat tetap di `pb_log` |
| `pb_log` | Jejak audit sebelum dan sesudah, sekaligus dasar batas laju (60 tulis per 10 menit per pengisi) |
| Migrasi beku | Daftar hash migrasi yang sudah diterapkan di `tests/warga/migrasi_beku.json`; migrasi yang sudah jalan tidak disunting |
| Golden | Uji yang membandingkan keluaran dengan string yang dibekukan sebelum refaktor (`pb_karhutla_tetap.test.mjs`) |
| Miniflare | Runtime workerd lokal dengan D1 sungguhan, dipakai uji rute (`tests/warga/_bnpb.mjs`) |
| `EXPLAIN QUERY PLAN` | Pemeriksaan bahwa kueri memakai SEARCH lewat indeks, bukan SCAN, demi kuota baca D1 (5 juta baris per hari) |
| Plafon ratchet | Berkas fixture (`tests/agen/fixtures/d1-sisa.json`, `d1-pindai.json`) yang hanya boleh menyusut |
| Kru | Orang atau regu pelaksana; namanya tidak pernah disimpan di data operasi (D8) |
