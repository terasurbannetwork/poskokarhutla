# Layar darurat, foto, lacak, info

Halaman ini mendokumentasikan layar darurat, unggah foto dan video, laporan susulan, lacak laporan, info daerah, dan poster QR desa.

## Lapor darurat dan Darurat sekali ketuk

- Lapor darurat: formulir pendek berisi lokasi, jenis, dan ada korban atau tidak (ya, tidak, belum tahu). Petugas BNPB dan BPBD wilayahnya langsung menerima laporan sebagai pita merah di meja.
- Darurat sekali ketuk: satu ketukan mengirim titik GPS ke meja sebagai laporan darurat dengan jenis "belum diketahui". Tombol telepon 112, 117, dan BPBD setempat langsung muncul. Obrolan lanjutan menanyakan jenis, korban, dan foto. Di meja laporan ini diberi tanda Darurat serta Sekali ketuk.
- Batas: satu ketukan per 30 menit per perangkat, paling banyak 3 per hari per nomor, dan 3 per jam per alamat IP. Titik di luar Indonesia dibuang (laporan tetap dibuat tanpa titik). Titik GPS dengan akurasi lebih dari 1.000 m diberi ketelitian "perkiraan", bukan "titik GPS" (`src/lapor_mesin.js:403-404`). Penanda "lokasi kasar" di meja belum terdokumentasi di kode.
- Sistem tidak menelepon atas nama pelapor.

## Foto dan video

- Foto wajib diambil dengan kamera pada saat melapor. Di web, tangkapan layar dan gambar hasil sunting (tanpa merek dan model kamera di metadata) ditolak.
- Di web, foto membawa GPS perangkat bila ketelitian 1.000 m atau lebih baik dan dibaca paling lama 10 menit sebelumnya. Metadata EXIF dibaca dulu: foto yang diambil lebih dari 48 jam lalu ditolak, dan foto yang lokasinya lebih dari 5 km dari GPS perangkat ditolak. Aturan penolakan ini hanya berlaku di saluran web (`src/lapor_ai.js:508-526`).
- Di bot WhatsApp tidak ada penolakan tangkapan layar dan tidak ada pemeriksaan 5 km. Lokasi foto hanya dari lokasi yang dibagikan lewat WhatsApp (bila ada), dan waktu foto dari jam pesan; bila jam pesan lebih lama dari 48 jam, diganti dengan waktu unggah, bukan ditolak.
- Lencana foto di meja: Lokasi GPS perangkat, Lokasi dari data foto, Lokasi dibagikan lewat WhatsApp, atau Tanpa lokasi.
- Batas: 10 foto per laporan; foto dan video bersama paling banyak 20 berkas, video paling banyak 3. Foto web paling besar 2,5 MB, lewat bot WhatsApp 5 MB. Video paling besar 30 MB dan 60 detik, diunggah bersambung dalam bagian 5 MB; unggahan yang menggantung lebih dari 24 jam dibuang.
- Metadata foto dihapus sebelum disimpan di R2.

## Tambah kabar (laporan susulan)

Sesudah laporan terkirim, pelapor dapat menambah atau mengoreksi isian lewat tombol Tambah kabar di Laporan atau di halaman lacak.

1. Syarat: paling lama 72 jam sejak terkirim, tiket belum selesai atau tidak valid, dan versi kurang dari 10.
2. Jenis, subjenis, lokasi, waktu kejadian, dan RT/RW terkunci dan tidak berubah lewat susulan.
3. Setiap susulan membuat versi baru lengkap dengan dokumen baru dan ringkasan perubahan. Nilai versi lama tetap tersimpan.

## Lacak laporan

- Alamat: `/lapor/lacak.html?t=<token>`. Publik bagi pemegang tautan; token berasal dari nomor laporan dan kunci rahasia server, jadi tidak bisa ditebak.
- Menampilkan status bertahap, balasan petugas, foto penanganan, serta unduhan PDF dan Word. Halaman memuat ulang tiap 30 detik.
- Status tiket: Laporan diterima (baru), Sudah dilihat petugas, Sedang ditelaah, Diteruskan ke BPBD setempat, Ditindaklanjuti, Selesai ditangani, dan Tidak dapat ditindaklanjuti.
- Pelapor mendapat kabar status lewat WhatsApp melalui antrean kabar yang dikirim bot.

## Info dan prediksi, Edukasi, Nomor penting, Alun-alun

- Info dan prediksi daerah: prakiraan 3 hari (hujan, banjir, longsor, asap, angin) untuk kab/kota lokasi pelapor dan rapor bencana daerah, dibaca dari `prediksi.json`. Tingkat ditulis Normal, Waspada, Siaga, Awas; jenis yang belum teruji tampil dengan penanda belum teruji. Prakiraan ini bukan peringatan resmi BMKG atau BNPB.
- Tempat di sekitar kejadian dibaca dari OpenStreetMap lewat Overpass; yang dikirim hanya koordinat kejadian.
- Nomor penting: BPBD kab/kota, lalu BPBD provinsi, lalu daftar nomor nasional tetap (112 darurat terpadu, 113 pemadam kebakaran, 119 ambulans, 110 polisi, 115 SAR, 117 BNPB). Nomor BPBD kab dan provinsi diambil dari `public/data/bpbd_kontak.json`, dengan cadangan kolom Pusdalops di `public/data/bpbd.json` (alamat, arah, dan jarak kantor juga dari berkas itu); nomor tidak pernah dikarang. Tempat terdekat (rumah sakit, puskesmas, kantor polisi, pemadam kebakaran) dibaca dari data OpenStreetMap lokal `public/data/osm_nasional/<prov>.json` dan tidak membawa nomor telepon (`src/lapor_info.js:95-134`).
- Edukasi: butir siaga bencana dari `public/lapor/edukasi.json`.
- Alun-alun: daftar laporan warga yang statusnya Ditindaklanjuti atau Selesai, tanpa nama, nomor WA, nomor tiket, koordinat pelapor, atau kronologi bebas. Titik adalah pusat desa dibulatkan 4 desimal. Laporan satu gugus ditulis "N warga melapor"; gugus dihitung dari laporan terkirim 30 hari terakhir (`src/lapor_ai.js:1083-1090`). Foto penanganan tampil hanya bila staf menandainya boleh publik.
- Di layar Alun-alun ada peta titik pusat desa, saringan jenis kejadian, dan tombol Ikuti kejadian yang bekerja tanpa akun: id kartu dan status terakhir disimpan di peramban perangkat, dan kartu yang statusnya berubah diberi pil "Status berubah" (`public/lapor/lapor.js:1356-1406`).

## Poster QR desa

- Alamat pembuat: `/lapor/poster.html` (tautan ada di menu meja, bagian Pintu lain). Hak pembukaan tidak diperiksa di sisi klien; batas hak sebenarnya belum terdokumentasi di kode.
- Isi: tautan `/lapor/?d=<kode desa>` yang menawarkan desa itu di kartu lokasi. Pelapor tetap memilih sendiri; di meja laporan itu mendapat lencana "Lokasi dari poster desa". Poster memuat nomor BPBD dari sumber publik dan tidak memuat nama orang.
