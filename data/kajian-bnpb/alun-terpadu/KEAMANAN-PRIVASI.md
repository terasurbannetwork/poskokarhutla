# KEAMANAN-PRIVASI: Alun-alun Terpadu

Forum publik yang kini terhubung ke kejadian resmi, kotak masuk lembaga, dan layar pimpinan. Risiko utamanya: kiriman tak terverifikasi dianggap fakta atau dipakai membanjiri lembaga, wilayah dipalsukan, lembaga dipalsukan, dan data orang terbawa ke rekap. Dokumen ini memuat temuan dua pemeriksa bersih (15 Nov 2026).

## 1. Matriks hak

| Tindakan | Tamu | Akun umum | Akun instansi (sesi `/instansi`) | Moderator | Staf berwenang | Pemirsa |
| --- | --- | --- | --- | --- | --- | --- |
| Menulis dan membalas sebagai diri sendiri | ya | ya | lewat alun-alun seperti orang lain | ya | - | - |
| Membalas atas nama lembaga | tidak | tidak | ya, utas dalam wilayah | sebagai Petugas | - | - |
| Mengubah status bantuan | tidak | tidak | ya, pemprov, pemkab, pemkot, dalam wilayah | ya | - | - |
| Membuka lagi kebutuhan yang ditutup | pelapornya, dengan kode pemilik | pelapornya | ya | ya | - | - |
| Menandai tidak valid | tidak | tidak | ya, dalam wilayah | mencabut tanda | - | - |
| Melihat kotak masuk wilayah | tidak | tidak | ya | semua lewat `/admin/alun` | - | - |
| Melihat catatan staf pada riwayat | tidak | tidak | ya, dalam wilayah | ya | - | - |
| Melihat tautan ke kejadian yang belum dipublikasikan | tidak | tidak | tidak | lewat rute Siklus sesuai haknya | ya | tidak |
| Melihat rekap | tidak | tidak | tidak | ya | ya, rincian sebatas wilayahnya | tidak (Q11) |
| Menarik rekap lewat kunci API | tidak, menunggu Q2 | | | | | |

"Staf berwenang" untuk rekap: admin, dan staf berperan pimpinan, koordalops, pusdalops (nama peran dicocokkan dengan `src/staf.js` saat AT-09c).

## 2. Ancaman dan penangkal

| Ancaman | Penangkal | Sisa risiko |
| --- | --- | --- |
| Kiriman palsu melahirkan atau menguatkan kejadian resmi | sumber `alun` tidak pernah membuat kejadian, tidak mengubah fase, tidak dihitung untuk verifikasi; dijaga di pencocok **dan** di rute ingest Worker | kiriman palsu bisa menempel ke kejadian nyata sampai dimoderasi |
| Kabar bohong tertaut selamanya | tautan dicabut saat utas disembunyikan, dihapus, atau ditandai tidak valid; hanya utas berstatus tampil yang dikirim ke pencocok | utas yang belum diadukan tetap tertaut |
| Antrean tinjau staf dibanjiri kiriman ambigu | sumber `alun` yang ambigu hanya berstatus ambigu, tidak masuk antrean | - |
| Kiriman tamu menjadi saluran push dan email resmi | pemberitahuan hanya untuk kiriman dari orang yang sudah masuk; batas 3 per kabupaten per jam dan 20 per akun per jam; tanpa `TURNSTILE_SECRET` tidak ada pemberitahuan | orang yang sudah masuk masih bisa menyalahgunakan dalam batas itu; akunnya bisa diblokir |
| Kuota email kabar darurat termakan | batas per wilayah dan per akun; isi pendek; kiriman tamu tidak mengirim | kuota tetap bersama dengan kabar darurat |
| Judul buatan publik dipakai menipu lewat pemberitahuan resmi | isi pemberitahuan tanpa judul dan tanpa isi utas | - |
| Menyasarkan utas ke BPBD lain atau menyamarkan wilayah | kabupaten dipilih dari daftar, diperiksa server terhadap provinsi, kodenya disimpan; koordinat tidak dipakai untuk wilayah | penulis tetap bisa memilih kabupaten yang salah; BPBD menandai "luar wilayah" |
| Spam hanya bisa ditutup dengan "selesai" | tanda "tidak valid" yang mengeluarkan utas dari rekap dan pencocok tanpa mengubah status | utas tetap tampil sampai moderator memutuskan |
| Lembaga menandai tidak valid untuk membungkam keluhan | tanda tidak menyembunyikan utas; masuk antrean moderator; moderator bisa mencabut; batas 30 per akun per hari; tercatat akun penandanya | keluhan nyata keluar dari rekap sampai moderator mencabut tanda |
| Memalsukan lembaga | nama lembaga diambil server dari akun; klien tidak bisa mengirimnya; hanya sesi `/instansi` (sandi) yang bisa membalas atas nama lembaga; daftar nama resmi yang ditolak diperluas | akun instansi yang diambil alih bisa menjawab atas nama lembaga dalam wilayahnya |
| Kiriman pribadi terbaca sebagai pernyataan lembaga | label lembaga hanya pada balasan lembaga; kiriman pribadi hanya "Terverifikasi" | - |
| Lembaga menutup kebutuhan yang belum selesai | hanya pemprov, pemkab, pemkot; wajib alasan baku; riwayat publik; pelapor bisa membuka lagi 14 hari; rekap menghitung "dibuka lagi" | pelapor tamu yang kehilangan kode pemiliknya tidak bisa membuka lagi |
| Catatan penutupan memuat data pribadi | alasan publik berupa pilihan baku; catatan bebas hanya untuk staf dan moderator | catatan staf bisa memuat data pribadi; hanya terlihat yang berwenang |
| Penghapusan utas gagal karena riwayat | tanpa trigger; satu jalur kode menghapus utas lalu semua tabel sampingnya; diuji | - |
| Akun instansi bekerja di luar wilayahnya | lingkup lewat kode kabupaten dicek di server di tiap rute dan di SQL untuk daftar | utas tanpa kabupaten hanya terlihat akun provinsi |
| Tanda kejadian mengungkap kejadian yang belum dipublikasikan | tanda digabungkan hanya di jalur publik dan hanya untuk kejadian yang lolos syarat ringkasan publik; jalur moderator tidak memakai fungsi yang sama; diuji bahwa jawaban ber-cache sama untuk staf dan tamu | penarikan publikasi baru terlihat sesudah cache habis (10 detik di alun-alun, sampai 5 menit di halaman kejadian) |
| Rekap dibaca terlalu luas | hak rute rekap ditulis tepat; rincian tersaring wilayah staf; pemirsa dan akun instansi ditolak; tidak ada di `pb_ringkas`, `api_v1`, atau `public/data` | - |
| Rekap digembungkan kiriman tamu | angka utama hanya kiriman terverifikasi berstatus tampil dan tidak ditandai; kiriman tamu di baris terpisah | orang yang sudah masuk masih bisa menulis banyak kebutuhan; batas laju tulis yang ada |
| Data orang masuk rekap | tanpa judul, nama, nomor, `mk_id`, isi utas, koordinat; diuji dan dijaga gerbang | hitungan kecil per kabupaten bisa menunjuk satu kiriman; berkas rinci hanya untuk staf berwenang |
| Rekap dipakai menilai orang atau memeringkat daerah | hitungan per wilayah, tidak per orang (KETERPADUAN K9); tabel urut abjad; tanpa kata peringkat | pembaca tetap bisa membandingkan daerah |
| `PIPA_TOKEN` bocor | rute ingest baru hanya memuat kolom yang sudah publik atau hitungan; rute ingest kejadian menolak aksi `baru` untuk sumber `alun` | token bocor tetap bisa membuat kejadian lewat sumber lain; itu risiko yang sudah ada |
| Akuntabilitas balasan lembaga | riwayat dan `alun_lembaga` mencatat akun; `akun_id` tidak pernah keluar ke publik | sesi instansi tidak mencatat orang, jadi pelaku di dalam lembaga tidak teridentifikasi |
| Pemalsuan permintaan lintas situs | rute `/api/instansi/alun*` dijaga penjaga modul instansi (header `x-pb`); rute `/api/alun/*` dijaga pemeriksa Origin yang ada | - |
| Aduan massal membungkam balasan lembaga | balasan lembaga yang diadukan menjadi dilaporkan, tidak tersembunyi otomatis | lembaga yang keliru hanya bisa dikoreksi moderator |
| Kuota D1 | kotak masuk dan ingest berindeks; rekap di pipeline; tanda kejadian di dalam cache | - |

## 3. Data pribadi

| Data | Disimpan di | Guna | Disimpan sampai |
| --- | --- | --- | --- |
| Kode kabupaten utas | `alun_wilayah` | kotak masuk, pencocok, rekap | selama utas ada |
| Penanda lembaga | `alun_lembaga` (akun, nama lembaga) | tanda balasan lembaga | selama balasan ada |
| Riwayat status | `alun_riwayat` (pelaku, akun, alasan, catatan staf, waktu) | pertanggungjawaban penanganan | selama utas ada |
| Tanda tidak valid | `alun_tanda` (akun, alasan, waktu) | antrean moderator | sampai dicabut atau utas dihapus |
| Tautan kejadian | `sk_kejadian_sumber` (id utas, id kejadian) | keterpaduan | sampai utas disembunyikan atau dihapus |
| Rekap | gudang privat `siklus/saji/alun/` | layar pimpinan | ditimpa tiap jadwal; arsip tidak dibuat |
| Pemberitahuan | `kabar_terkirim` yang ada | penghapus ganda | mengikuti aturan kabar |

Menghapus utas (jalur penghapusan data pribadi) membuang semua baris di atas untuk utas itu.

## 4. Yang tidak boleh ada

- Judul utas, nama penulis, nomor, `mk_id`, isi utas, atau koordinat di berkas rekap, pemberitahuan, dan dasbor.
- `akun_id` atau catatan staf di jawaban publik.
- Kata "aman" di teks yang dihasilkan sistem.
- Rekap di `public/data`, `src/pb_ringkas.js`, `src/api_v1.js`, atau rute tanpa hak.
- Tombol atau rute yang menjadikan utas sebagai kejadian.
- Trigger pada tabel paket ini; data contoh.

## 5. Keterkaitan dengan keputusan lain

- KEPUTUSAN-KETERPADUAN K2 (tanpa pintu WA masuk), K9 (jejak per orang), D1 sampai D3 (satu mesin pencocok).
- KEPUTUSAN-MASUK D22 (nama publik hanya dari isian form) dan D4 (hak mengikuti nomor yang terbukti). D7 paket ini mengubah tampilan label lembaga yang dibangun PM-15.
- KEPUTUSAN-CEK-KABAR Q3 (laporan warga belum menjadi sumber cek kabar).
- KEPUTUSAN-BERKALA D4, D5, Q22: angka kiriman warga tidak masuk Laporan Berkala (Q12).
- OUTSTANDING F: feed publik, hub tukar data, daftar warga rentan tidak dibangun.
- Juklak J4: identitas pelapor pengaduan tidak disentuh; pengaduan bukan alun-alun.

## 6. Pemeriksa wajib sebelum tayang

`guard-api` dan `security-reviewer` untuk rute; `migrasi-idempoten` untuk migrasi; `validasi-model` untuk aturan pencocok (enam sumber lain tidak berubah) dan angka rekap; `inp-reviewer` dan `selera-angka` untuk layar. Pemeriksa tidak pernah pengerja yang sama (AGENTS 3.2).
