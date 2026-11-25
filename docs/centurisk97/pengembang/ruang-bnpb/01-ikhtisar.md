# Ikhtisar Ruang BNPB dan Pantau Dalops

Ruang BNPB adalah kumpulan layar kerja staf BNPB, dan halaman ini merangkum penggunanya, hak aksesnya, serta layar Pantau Dalops.

Ruang BNPB adalah kumpulan layar kerja staf Badan Nasional Penanggulangan Bencana di Centurisk97. Isinya menjawab masalah yang berulang di meja piket dan meja pimpinan: kejadian yang tercatat di logbook tidak punya kabar lanjutan, angka dari satu sumber tidak pernah diperiksa terhadap sumber lain, indeks risiko dihitung ulang dengan cara berbeda di tiap dokumen, dan laporan berkala disusun ulang dari nol tiap periode.

## Pengguna dan hak akses

Pengguna dan hak akses menurut kode:

- Staf Pusdalops, Koordalops, dan pimpinan: layar Pantau Dalops, Logbook, Dokumen, Bahan Laporan, Operasi, Perencanaan, Siaga, Data Bencana. Hak dibaca dari `PERAN_DALOPS = ["pusdalops", "koordalops", "pimpinan"]` (`src/dalops.js:11`).
- Pemirsa baca saja (akun yang bertab pusdalops): boleh melihat layar yang diizinkan, tombol tulis disembunyikan lewat `data-baca-saja` (`tests/warga/pemirsa_pusdalops.test.mjs`).
- Moderator dan admin: semua layar ditambah rute tulis tertentu.
- Warga dan tamu: hanya halaman yang terdaftar tanpa sesi di `PUBLIK_TANPA_SESI` (`src/worker.js:758`), dalam folder ini adalah `/alun-alun`, `/bnpb/katalog-dokumen`, `/pendataan`, `/meja`, dan `/daftar-kontak` (`src/worker.js:758-773`). Entri lain di daftar itu, misalnya `/lapor`, `/masuk`, dan `/siklus/kejadian`, bukan milik folder ini. Di domain centurisk97.id semua halaman HTML lain wajib masuk lebih dulu (`halamanTerkunci`, `src/worker.js:774`).

## Prinsip yang berlaku

Prinsip yang berlaku di seluruh modul, dan yang menentukan cara membaca angkanya:

1. Angka dihitung pipeline atau Worker, layar hanya menampilkan. Layar tidak menghitung ulang angka sumber.
2. Sumber tidak dijumlahkan. DIBI, logbook Pusdalops, laporan WA, satelit, dan prakiraan model tampil berdampingan.
3. Kosong bukan nol. Nilai yang tidak dilaporkan disimpan sebagai `null` dan tampil sebagai tanda strip, "belum ada data", atau "belum terukur". Nol hanya muncul bila sumber menulis nol atau hitungan memang nol.
4. Model buatan sendiri yang belum lulus uji balik berlabel HIPOTESIS atau "belum diuji balik".
5. Tidak ada kalimat yang menyatakan suatu wilayah bebas dari bahaya. Status resmi tampil apa adanya, berlabel lembaga; yang boleh ditulis hanya "tidak disebut", "belum ada data", atau "belum teruji".

## Pintu Ruang Koordinasi, /bnpb

Kartu ke tiap sistem dengan angka hidup dari berkas ringkas masing-masing (`public/bnpb/pintu.js`). Angka yang gagal dimuat tampil "belum ada data", bukan kartu kosong. Halaman ini tidak ada di menu utama situs (keputusan pemilik 19 Oktober 2026). Akses: perlu masuk di centurisk97.id.

## Pantau Dalops, /bnpb/dalops

Layar untuk menindaklanjuti kab/kota yang terdampak. Akses: staf Pusdalops, Koordalops, pimpinan, atau pemirsa baca saja. Data kejadian berasal dari logbook Pusdalops yang bersifat internal, jadi tidak pernah ada di `public/`; layar membacanya lewat rute `/api/dalops/<jenis>` dari R2 privat.

Langkah pakai:

1. Buka `/bnpb/dalops`. Panel kiri berisi daftar tab jenis pantauan, dikelompokkan di bawah judul "Bencana" dan "Laporan".
2. Pilih tab. Alamat berubah menjadi `#<tab>` sehingga tautan bisa dibagikan. Tab yang sudah dibuka tidak dimuat ulang.
3. Pilih periode di atas isi: Hari ini, 3 hari, Sepekan, 30 hari, atau Pilih tanggal (mulai dan akhir). Kejadian masuk periode bila rentang hidupnya (mulai sampai kabar terakhir) bersinggungan dengan jendela (`public/bnpb/dalops.js:1024`).
4. Pilih jenis bencana lewat tombol pemilih di pojok peta bila ingin pindah tab tanpa menggulir ke panel kiri.
5. Saring tabel dengan pilihan di atas tabel (status, ada pengungsi, ada korban jiwa, level peringatan), lalu ekspor lewat tombol Excel, CSV, PDF, atau PPT di tiap seksi bertabel.

Tab menurut kode (`public/bnpb/dalops.js:1081`): Data Bencana, Karhutla, Banjir, Longsor, Gunung Api, Gempa dan Tsunami, Cuaca Ekstrem, Kekeringan, Gelombang dan Abrasi, Kebakaran Permukiman, Kualitas Udara, Laporan Masuk, dan Laporan. Tab bawaan saat dibuka adalah Banjir.

Seksi di tab jenis (tiap seksi satu kartu):

- Peta Pantauan dan Kondisi terkini: peta kab/kota terdampak dan tabel bertingkat provinsi, kab/kota, kecamatan, desa. Kolom berangka yang tidak dilaporkan tampil strip.
- Penanganan dan bantuan: upaya, pihak terlibat, kebutuhan, dan kendala dari logbook.
- Kabar luar dan Kelengkapan data: gabungan semua bencana, dengan saringan Bencana, Provinsi, dan Kab/kota. Dijelaskan di bagian Metode "Cek kabar luar" dan "Perlu ditanya".
- Tren kejadian: dua grafik dari logbook, per tahun dan per periode.
- Status layanan: ringkasan Status Lifeline kejadian aktif, dimuat saat kartu dibuka. Warna hanya dari status resmi staf; abu berarti belum ada bukti.
- Laporan warga: laporan Lapor Bencana yang masih berjalan, dikelompokkan per kejadian. Belum terverifikasi, bukan data resmi, dan angka antarlaporan tidak dijumlahkan.
- Usulan langkah (tab Banjir): langkah BPBD bersama BNPB per kab/kota, dengan kolom Status yang bisa diisi staf.
- Peringatan dini: kab/kota berstatus Waspada ke atas dari prakiraan, lengkap dengan tombol pesan WA.

Arti tanda yang sering muncul:

| Tanda | Arti |
| --- | --- |
| Label Masih berlangsung | ada kabar luar sesudah laporan resmi terakhir, bukan penutupan |
| Label Kemungkinan selesai | ada berita pulih atau, untuk jenis yang punya sinyal alam, sinyal normal sesudah jumlah hari tertentu; kejadian tetap terbuka |
| Label Belum ada kabar luar | tidak ada bukti luar, bukan berarti selesai |
| Hari tanpa kabar bertanda strip | tidak diketahui, bukan nol hari |
| Pil "hipotesis" atau "belum diuji balik" | angka hasil model buatan sendiri yang belum lulus uji |

Tombol WA menyalin atau membuka pesan siap kirim. Isi pesan memakai satu dari tiga pola: permintaan pembaruan data (`pesanWA`), permintaan konfirmasi selesai (bila label Kemungkinan selesai), atau pesan peringatan dini (`pesanSiaga`). Pesan konfirmasi tidak meneruskan isi berita. Pesan gabungan per saringan dipotong pada 40 baris dan sisanya diganti catatan bahwa daftar lengkap ada di berkas Excel (`public/bnpb/dalops_hitung.js:307`).

Hal yang sering disalahpahami:

- Kabar luar tidak pernah menutup kejadian. Penutupan hanya dari laporan resmi.
- Luas karhutla dan jumlah belum padam hanya dari sistem Centurisk97 (`public/data/peta_karhutla_kab.json`), tidak dari teks WA. Luas harian bertumpuk, jadi layar menampilkan luas hari terakhir, bukan jumlah antarhari.
- Kejadian yang kabarnya lebih tua dari sepekan dikelompokkan terpisah (senyap) supaya tidak memanjangkan lama kejadian pekan ini.
- Rekap WA bertanggal T mencerminkan logbook tanggal T dikurangi satu hari, karena periode logbook 07.00 sampai 07.00 WIB.

### Tab Laporan Masuk

Memantau rekap harian WA Koordalops 07.00 WIB. Terdapat kartu Rekap harian (tujuh tanggal WIB terakhir; hari ini dilewati sebelum 07.00 WIB), Perlu ditagih (kejadian terbuka yang tidak muncul di rekap tanggal itu), Kejadian baru, Pengkinian, dan Data BPBD. Kejadian yang tidak muncul 3 hari atau lebih berwarna merah, kurang dari itu kuning, dan lebih dari 7 hari ditandai usul tutup. Bagian Data BPBD memuat catatan meja Data kejadian dan dampak berstatus diverifikasi, dengan tombol Terima ke Logbook bagi akun yang berhak (lihat bagian Meja Kerja). Tab ini tidak memuat teks dampak, luas, atau hotspot.

### Tab Gunung Api

Kartu per gunung berstatus Siaga dan Awas: diagram cincin 5, 10, 15 km, radius rekomendasi PVMBG, kipas sektor, jarak dan arah, serta penduduk dan sarana per radius lewat proksi InaRISK (`public/bnpb/dampak_radius.js`). Level adalah level resmi PVMBG apa adanya, tidak ditafsir ulang.

### Tab Data Bencana

Satu modul yang sama dengan halaman `/bnpb/data-bencana` (lihat di bawah), dengan tambahan kejadian logbook yang masih berlangsung sebagai titik di peta dan kartu Rekonsiliasi tiga sumber (DIBI, logbook, Lapor Bencana terverifikasi BPBD).
