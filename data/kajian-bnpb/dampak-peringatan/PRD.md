# PRD: Dampak peringatan dini per desa dan status prakiraan

## Tujuan

Untuk tiap peringatan dini BMKG yang aktif, tampilkan berapa penduduk dan fasilitas berada di dalamnya, di desa mana, dipecah menurut kelas bahaya InaRISK, lalu beri tiap kab/kota satu status prakiraan empat tingkat per bahaya. Semuanya berlabel keterpaparan, bukan korban (K2, K4, D9).

## Pengguna

| Pengguna | Kebutuhan | Tempat |
| --- | --- | --- |
| Publik dan warga | tahu status kab mereka dan peringatan yang aktif, dengan bahasa polos | `/prediksi` tab Besok, Alun-alun `/lapor` (tampilan Peringatan), notifikasi |
| Staf Dalops dan BPBD | tahu desa mana, fasilitas mana, berapa orang | `/bnpb/dalops` |
| Pimpinan | satu angka ringkas dan tautan ke rincian | Layar Pimpinan |

## Fitur

| ID | Fitur | Terima bila | Dasar |
| --- | --- | --- | --- |
| F-1 | Daftar peringatan BMKG aktif (poligon, jenis, tingkat, berlaku sampai, wilayah) | daftar kosong tertulis "tidak ada peringatan aktif", bukan angka 0 | D2, D4 |
| F-2 | Keterpaparan penduduk per desa, kecamatan, kab/kota, provinsi, nasional dalam poligon aktif | tiap tingkat berlabel sumber jiwa; angka dibulatkan; tiga sumber tidak dijumlah | D5, D8 |
| F-3 | Penduduk per kelas bahaya InaRISK (rendah, sedang, tinggi, tak terliput) untuk banjir dan longsor | tak terliput tampil sebagai kelasnya sendiri, tidak masuk rendah | D6 |
| F-4 | Kelompok rentan (balita dan lansia) dan laki-laki dan perempuan per desa | dari Dukcapil (kolom umur, `pria`, `wanita`); laki-laki dan perempuan berlabel perkiraan; null bila sumber kosong | D5, D29 |
| F-5 | Fasilitas dalam poligon: sekolah, madrasah, kesehatan (jumlah di kab/kota ke atas; nama dan titik hanya staf) | kab tanpa sumber "belum terukur" | D7, D18 |
| F-6 | Status prakiraan per kab per bahaya (banjir, longsor, cuaca ekstrem, dan karhutla dengan nama tingkat registri karhutla): Normal, Waspada, Siaga, Awas, abu "belum terukur", pil hipotesis | tabel status terkunci diuji; hijau hanya bila semua sumber masuk | D10 sampai D15 |
| F-7 | Tooltip dan teks hijau Normal sesuai D13 | teks tepat; kata yang menjanjikan keselamatan tidak ada | K5 |
| F-8 | Notifikasi Web Push saat status kab naik ke Waspada atau lebih | lewat langganan yang ada; wilayah dengan nama; tanpa angka | K6, D16 |
| F-9 | Tampilan Peringatan di peta Alun-alun dengan saklar dua arah Kejadian dan Peringatan | bawaan Kejadian; kartu tidak bercampur | K10, D22, D23 |
| F-10 | Rincian staf di Dalops: peta status dengan poligon BMKG, tabel per desa, fasilitas bernama, unduh CSV | angka CSV dibulatkan sama dengan layar | K9 |
| F-11 | Kartu ringkas Layar Pimpinan: jumlah kab Siaga dan Awas, penduduk terpapar total dibulatkan, tautan ke Dalops | tidak ada angka bila sumber basi | K9 |
| F-12 | Uji balik status lawan DIBI dan logbook lewat gerbang bersama; arsip harian append-only | pil hipotesis hilang hanya bila `boleh_tampil` | D12, D17 |
| F-14 | Lapisan status dan peringatan di peta tiap bencana yang menyala (karhutla, banjir termasuk tab Longsor, cuaca), disaring ke bahaya halaman itu, dari satu modul bersama | modul `public/inti/dampak_peringatan.js` satu-satunya; halaman tanpa kunci `kemampuan` tidak berubah | K11, D25 sampai D28 |
| F-13 | Halaman metode di `/docs` tentang cara menghitung dan batasnya | rujukan berkas:baris | AGENTS 2.50 |

## Penempatan (K9, K10)

| No | Tempat | Isi | Pengerja berkas |
| --- | --- | --- | --- |
| 1 | `/prediksi` tab Besok (publik) | status per kab per bahaya, penduduk terpapar per kab dibulatkan, jumlah fasilitas per kab; tanpa tabel per desa | `prediksi` |
| 2 | Alun-alun `/lapor`, tampilan Peringatan | status per kab di peta, poligon BMKG, kartu kab; kartu kejadian boleh memuat satu baris tautan | `layar-peta` |
| 3 | Notifikasi `/lapor` (bagian dari Alun-alun sebagai satu pintu warga) | Web Push lewat langganan kecamatan | `warga-api` |
| 4 | `/bnpb/dalops` (staf) | rumah operasional: peta, tabel per desa, fasilitas bernama, CSV, di samping seksi "Prakiraan dan kejadian" | `ruang-bnpb` |
| 5 | Layar Pimpinan (`public/admin/pimpinan.js`) | satu kartu ringkas | `ruang-bnpb` |
| 6 | Peta tiap bencana yang menyala (K11) | lapisan status per kab dan poligon BMKG yang cocok bahaya halaman; karhutla `index.html` (`layar-peta`), `/banjir` peta utama dan tab Longsor (`banjir`), `/cuaca` (`cuaca-udara`); `/longsor` bukan halaman; modul bersama `inti-layar` | `inti-layar` |

Tempat berarti: Alun-alun `/lapor` (satu tempat: saklar dan baris kecil di kartu kejadian, ditambah notifikasi), `/prediksi` tab Besok, `/bnpb/dalops`, Layar Pimpinan, dan peta tiap bencana. Tidak ditempatkan: Laporan Berkala (Q14).

## Larangan

- Tidak menulis kata yang menjanjikan keselamatan, "bebas", "padam", atau "terdampak" sebagai fakta; tidak menulis "korban".
- Tidak menjumlah atau merata-rata angka antarsumber jiwa, dan tidak menjumlah penduduk antarbahaya (orang yang sama bisa terpapar dua bahaya).
- Tidak menyatukan status prakiraan dengan peringatan BMKG atau status darurat kepala daerah di tampilan. Status ikut sinyal Tangga hanya sebagai masukan terpisah berpil hipotesis (K14, DP-28); tidak digabung menjadi satu skor.
- Penduduk di area peringatan BMKG tidak dijumlah dengan, dan tidak menggantikan, `jiwa` total kab maupun "jiwa terpapar" aturan dampak di tab Besok (D31).
- Tidak membuat kanal notifikasi baru; tidak mengirim angka penduduk lewat push.
- Tidak menampilkan angka berpresisi palsu; tidak menampilkan 0 untuk "belum terukur" atau "tidak ada peringatan".
- Tidak menyimpan atau menampilkan data pribadi; nama fasilitas hanya di layar staf.
- Tidak menarik umpan Lapor Kejadian InaRISK; tidak menyalin angka mereka.
- Tidak memasukkan kartu prakiraan ke daftar kartu kejadian Alun-alun (D23).

## Di luar cakupan, kandidat paket berikutnya

Kartu ONI dan IOD; debit sungai GloFAS; rekomendasi per audiens (Q7); status untuk asap, gelombang, rob, dan banjir bandang; sumber poligon ArcGIS kedua (Q11); Laporan Berkala (Q14).

## Pertanyaan terbuka (dari KEPUTUSAN, tidak dijawab di sini)

Q1 sampai Q7, Q11 sampai Q18 ada di `KEPUTUSAN-DAMPAK.md`; Q8 terjawab K14, Q9 terjawab K9 dan K10, Q10 terjawab K13.
