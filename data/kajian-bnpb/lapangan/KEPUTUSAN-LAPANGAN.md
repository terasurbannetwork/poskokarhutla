# Keputusan pemilik: Pegawai dan Relawan Lapangan (1 Nov 2026)

Dokumen pertama dalam urutan otoritas modul Lapangan (AGENTS.md §2.3). Menang atas semua dokumen lain di folder ini:

`KEPUTUSAN-LAPANGAN.md` > `RISET.md` > `PRD.md` > `ALUR.md` > `ALGORITMA.md` > `DESIGN-SYSTEM.md` >
`DESAIN-TEKNIS.md` > `KEAMANAN-PRIVASI.md` > `RENCANA-UJI.md` > `TIKET.md`

Bila dua dokumen bertentangan atau sesuatu tidak tertulis, pengerja BERHENTI dan bertanya ke pemilik.

Sumber: percakapan pemilik 1 Nov 2026 saat menyusun Paparan Kepala BNPB 011126 (slide "Big Data Lapangan") dan
permintaan sesudahnya.

## A. Diputus pemilik

| No | Keputusan | Kata pemilik |
|---|---|---|
| K1 | Satu basis data untuk **semua pegawai BNPB dan semua relawan** | *"Jadi ada collect data semua pegawai dan relawan nantinya"*; target jumlah: *"Semua"* |
| K2 | Saat tugas lapangan ada **absen harian** dan **logbook harian** | *"ketika tugas lapangan ada logbook dan absen harian"* |
| K3 | Foto absen dan logbook memuat **tanda waktu dan geotag** | *"Ada fotonya juga ada time tag dan geotag"* |
| K4 | Absen **mencocokkan wajah**; pendaftaran wajah dari **kiri, kanan, atas, bawah** (ditambah depan) | *"bisa cek muka harus daftar muka kiri kanan atas bawah"* |
| K5 | Panggilan relawan lewat **broadcast bot WA** | jawaban sesi arah no. 15: *"Bot WA"* |
| K6 | Program relawan diberi nama dari kajian; usulan kerja **Sayap BNPB, Korps Relawan Gerak Cepat** | *"program Relawan lu kaji aja Korps Gerak Cepat atau apa gitu"* |
| K7 | Disajikan sebagai **rancangan dan tahapan** (30, 60, 90 hari) | jawaban no. 12 |
| K8 | Riset dulu dari GitHub dan **reverse engineer** yang sudah ada, bukan mengarang | *"Lu cek github nya udah ada atau nggak dan reverse engineer dari situ"* |
| K9 | Dibangun lengkap: riset, desain sistem, tiket, kode | *"Lu buat tiketnya, lu buat design sistemnya, lu buat semuanya"* |
| K10 | Paket dokumen lengkap seperti SIPPA, bukan hanya tiket | *"waktu bangun sippa kayanya ga hanya tiket deh ... biar semuanya bagus"* |
| K11 | Fitur yang sudah ada di sistem digabung ke modul ini (usulan 1 sampai 12, 2 Nov 2026): regu Posko `/lapangan`, pelacakan `/lacak`, lapor foto bergeotag (Uji Pilot, Ruang Instansi), tugas api dan konfirmasi padam, Renlap Generator, permintaan dan penugasan relawan, pelatihan relawan, kit SIPPA, pengingat, konfirmasi lapangan `/prediksi` dan uji lapangan banjir, drone gambut, sitrep dan logbook Dirdalops | *"1 2 3 4 gas, 5 gas, 5 6 7 8 9 10 11 12, yes gas"* |
| K12 | Satu sistem desain: semua layar gabungan memakai desain `/petugas` (kepala situs bersama, token Centurisk97); logika dan data lama dipakai ulang, halaman lama dialihkan sesudah penggantinya siap | *"Sistem desainnya semua udah sama kan?"* (jawaban: belum; disamakan lewat modul ini) |

## B. Diputus perancang (sesi induk), boleh dibatalkan pemilik

| No | Keputusan | Alasan |
|---|---|---|
| D1 | Web seluler (PWA) di `centurisk97.id/petugas`, tanpa aplikasi toko dan tanpa build step | stack repo; regu sudah memakai tautan HP (uji pilot, `/lacak`) |
| D2 | Wajah dihitung **di HP** dengan pustaka Human (MIT); Worker hanya menyimpan vektor dan membandingkan | Workers AI tidak punya model wajah (R1); bobot InsightFace non-komersial |
| D3 | Skor wajah dan GPS adalah **penanda**, bukan vonis: yang meragukan masuk antrean tinjauan manusia, tidak ditolak otomatis | riset R1 dan R2: helm, hujan, HP murah; fake GPS tak terdeteksi peramban |
| D4 | Waktu server satu-satunya waktu resmi; waktu HP dan EXIF dicatat sebagai pembanding | R1, R2 jebakan 5 |
| D5 | Akses lewat **kode pribadi** di tautan (`#k=`), seperti relawan sekarang; pegawai berakun staf tetap bisa masuk | tidak semua pegawai punya akun staf; tanpa NIK |
| D6 | Pakai ulang yang sudah ada: `relawan`, `relawan_jam`, `staf`, `nilaiGps`, `bersihMedia`, `bacaExif`, gateway WA | R3 |
| D7 | Titik tugas per kegiatan (posko, lokasi Renlap), bukan geofence kantor | R2 jebakan 2 |
| D8 | Stempel waktu, koordinat, wilayah, nama, dan tugas **dicetak di foto** seperti aplikasi GPS Map Camera yang dipakai regu | foto regu Kalteng dan Kaltim 28 sampai 30 Okt memakai pola ini |
| D9 | Alamat modul `/petugas` dan API `/api/petugas/*`; nama modul di kode tetap "lapangan" | `/lapangan` dan `/api/lapangan/saya` sudah milik regu Posko lama (`src/posko.js`, 19 Okt 2026) |

## C. Menunggu pemilik (pengerja tidak memutus sendiri)

| No | Pertanyaan | Usulan |
|---|---|---|
| U1 | Ambang wajah final | mulai 0,60 lolos otomatis, 0,45 sampai 0,60 tinjauan; dikalibrasi dari 200 pasang pertama |
| U2 | Aplikasi Android native untuk deteksi GPS palsu sungguhan | tahap sesudah 90 hari, bila tinjauan menemukan banyak GPS curiga |
| U3 | Siapa boleh melihat foto wajah acuan | hanya Super Admin dan peninjau yang ditunjuk |
| U4 | Aturan sertifikat relawan | sertifikat per penugasan selesai + piagam lama bakti (pola SES) |
| U5 | Asuransi relawan sebelum diterjunkan | kolom sudah ada di `relawan_penugasan`; penyedia diputus pemilik |
| U6 | Nama resmi program relawan | Sayap BNPB, Korps Relawan Gerak Cepat |
| U7 | Data induk pegawai dari Biro SDM | impor CSV sekali, lalu dijaga di sistem |
| U8 | Migrasi D1 produksi | diterapkan pemilik (memori ruang-bnpb) |
