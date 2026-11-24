# BAB 1 Lingkup Sistem

## 1.1 Tujuan

Sistem menarik kabar kebencanaan dari media sosial dan portal berita, mengolahnya menjadi sinyal kejadian per kabupaten, menampilkannya di dashboard pemantauan, dan mengirim notifikasi WhatsApp kepada piket Pusdalops untuk kandidat kejadian baru.

## 1.2 Di dalam dan di luar lingkup

Tabel 1.1. Lingkup sistem

| Di dalam lingkup | Di luar lingkup |
| --- | --- |
| Kabar publik dari Instagram dan Reels, X, TikTok, Threads, portal berita, Google News, dan GDELT | Grup tertutup, pesan pribadi, akun privat, dan apa pun yang memerlukan login |
| Semua jenis bencana di registri bencana sistem | Analisis sentimen atau opini publik terhadap lembaga |
| Sinyal kejadian per kabupaten dan dashboard untuk staf | Halaman publik berisi kabar warga |
| Notifikasi WhatsApp kepada piket Pusdalops | Notifikasi langsung kepada BPBD, pimpinan, atau publik dari sinyal yang belum diperiksa |
| Kabar pendukung untuk kejadian di Buku Besar Kejadian | Membuat, mengubah fase, atau menutup kejadian secara otomatis |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

## 1.3 Pengguna dan hak akses

Tabel 1.2. Pengguna sistem

| Pengguna | Yang dapat dilakukan |
| --- | --- |
| Piket Pusdalops | Melihat dashboard, membaca rincian sinyal dan kabar asli, memutuskan benar, salah, atau ganda, menerima notifikasi |
| Staf Pusdatinkom | Semua hak piket, ditambah mengelola daftar tagar dan kueri, melihat rapor sumber dan biaya |
| Admin sistem | Mengelola kunci akses, batas belanja, dan penarik |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB. Hak akses mengikuti sesi staf yang sudah ada.

# BAB 2 Arsitektur

## 2.1 Susunan komponen

Sistem terdiri atas empat lapis: sumber, tarik dan simpan, olah, serta periksa dan pakai.

![Gambar 2.1. Arsitektur sistem](gbr/arsitektur.png)

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

Tabel 2.1. Komponen dan tempatnya

| Komponen | Teknologi | Tempat berjalan | Status |
| --- | --- | --- | --- |
| Penarik berita (RSS, Google News, GDELT) | Python 3.12 pustaka standar | GitHub Actions terjadwal | Ada untuk karhutla, diperluas ke semua bencana |
| Penarik Threads, Instagram, X | Python 3.12 pustaka standar, panggilan HTTP ke API resmi | GitHub Actions terjadwal | Baru |
| Penarik TikTok | Node dengan browser lokal tanpa login | Server virtual | Ada untuk karhutla, diperluas |
| Penyimpanan mentah | Cloudflare R2, privat | Cloudflare | Baru (awalan jalur baru) |
| Pengolah dan pengelompok sinyal | Python 3.12, memakai penentu wilayah dan penyaring dari pipeline berita | GitHub Actions terjadwal | Sebagian ada |
| Klasifikasi dan ringkasan | Claude API: Claude Haiku 5.5 dan Claude Sonnet 5.5 | Dipanggil dari pengolah | Baru |
| Pencocok kejadian | Pencocok kejadian yang sudah ada | GitHub Actions | Ada, ditambah sumber baru |
| Basis data olahan | Cloudflare D1 | Cloudflare | Baru (lima tabel) |
| Rute dashboard dan keputusan | Cloudflare Worker | Cloudflare | Baru |
| Notifikasi | Antrean kirim bot WhatsApp yang sudah ada | Gateway bot WhatsApp | Ada, jenis pesan baru |

Sumber: telaah repositori sistem Centurisk97.

## 2.2 Proses satu siklus

Gambar 2.2 menunjukkan satu siklus, dari pemicu terjadwal sampai keputusan piket, menurut komponen yang mengerjakannya.

![Gambar 2.2. Proses teknis satu siklus](gbr/proses.png)

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

# BAB 3 Sumber dan Penarik

## 3.1 Spesifikasi penarik

Tabel 3.1. Penarik per sumber

| Sumber | Jalur | Selang | Batas yang harus dijaga | Bila gagal |
| --- | --- | --- | --- | --- |
| RSS portal | RSS resmi tiap portal | 15 menit | Satu permintaan per portal per siklus | Dilewati, dicatat |
| Google News RSS | Kueri per jenis bencana dan per wilayah aktif | 15 menit | Jumlah kueri tetap per siklus | Dilewati, dicatat |
| GDELT DOC 2.0 | Kueri per jenis bencana, negara sumber Indonesia | 15 menit | Satu kueri per jenis bencana | Dilewati, dicatat |
| Threads | Pencarian kata kunci Threads API | 15 menit | Kuota kueri per 7 hari | Berhenti sampai kuota pulih |
| Instagram dan Reels | Media terbaru per tagar, Instagram Graph API | 15 menit | 30 tagar unik per 7 hari | Tagar baru ditolak sampai jatah pulih |
| X | Pencarian post terbaru X API | 5 menit | Batas belanja bulanan di akun X | Berhenti sampai bulan berikutnya |
| TikTok | Halaman tagar publik lewat browser lokal | 30 menit | Tanpa login, tanpa mengakali verifikasi | Tagar dilewati, dicatat |

Sumber: dokumentasi platform; jadwal pipeline yang sudah berjalan.

Setiap penarik menyimpan waktu tarik terakhir per sumber dan hanya meminta kabar sesudah waktu itu. Setiap penarik juga menulis satu baris status per siklus ke tabel status sumber: berhasil atau gagal, jumlah kabar, dan pesan galat singkat.

## 3.2 Daftar tagar dan kueri

Karena Instagram dibatasi 30 tagar unik per 7 hari, jatah tagar dibagi dua. Lima belas tagar tetap per jenis bencana dipakai sepanjang waktu, misalnya banjir, banjirbandang, tanahlongsor, gempa, gempabumi, erupsi, karhutla, kebakaranhutan, kabutasap, putingbeliung, cuacaekstrem, rob, tsunami, kekeringan, dan abrasi. Lima belas tagar sisanya dipakai untuk wilayah yang sedang punya kejadian aktif atau sinyal kuat, misalnya nama kabupaten digabung jenis bencana. Daftar tagar dan kueri dikelola staf Pusdatinkom dari dashboard, bukan ditulis tetap di kode.

# BAB 4 Bentuk Data

## 4.1 Kabar mentah

Kabar mentah disimpan apa adanya di R2 privat, satu berkas JSON per sumber per jam, dengan jalur `kabar/mentah/<sumber>/<tanggal>/<jam>.json`. Berkas dihapus otomatis sesudah 30 hari. Kabar mentah tidak pernah disalin ke `public/` dan tidak pernah dibaca dashboard secara langsung.

## 4.2 Bentuk kabar seragam

Sebelum diolah, semua kabar diubah ke satu bentuk.

Tabel 4.1. Bentuk kabar seragam

| Kolom | Isi |
| --- | --- |
| id | Sidik dari sumber dan id asli kabar, untuk membuang duplikat |
| sumber | Salah satu dari rss, gnews, gdelt, threads, instagram, x, tiktok |
| waktu | Waktu terbit kabar dalam UTC |
| teks | Judul dan cuplikan berita, atau keterangan post; paling panjang 1.000 huruf |
| tautan | Alamat kabar asli |
| media | Ada tidaknya foto atau video |
| jenis_sumber | Media berita, instansi, atau akun umum |
| akun_sidik | Sidik satu arah dari nama akun, untuk menghitung sumber yang berbeda tanpa menyimpan nama akun |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

## 4.3 Tabel D1

Lima tabel baru diusulkan dengan awalan `pmk_` (pemantauan kabar). Gambar 4.1 menunjukkan hubungannya.

![Gambar 4.1. Model data](gbr/model-data.png)

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

Tabel 4.2. Tabel D1 yang diusulkan

| Tabel | Isi | Aturan |
| --- | --- | --- |
| `pmk_kabar` | Kabar bersih hasil olah: kolom bentuk seragam tanpa nama akun, hasil klasifikasi, kabupaten, dan id sinyal | Dihapus sesudah 90 hari kecuali terkait sinyal yang dikonfirmasi |
| `pmk_sinyal` | Satu baris per sinyal: jenis bencana, kabupaten, waktu kabar pertama dan terakhir, jumlah sumber, skor, status, id kejadian bila cocok | Status berubah hanya lewat aturan di Bab 6 |
| `pmk_keputusan` | Keputusan piket: id sinyal, keputusan, catatan, staf, waktu | Hanya menambah, tidak pernah diubah atau dihapus |
| `pmk_notif` | Notifikasi yang dikirim: id sinyal, jenis (baru atau pembaruan korban), waktu, id baris antrean WhatsApp | Satu baris per pengiriman |
| `pmk_sumber` | Status penarik per siklus: sumber, waktu, berhasil atau gagal, jumlah kabar, galat | Dipangkas sesudah 30 hari |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB. Migrasi ditulis idempoten dan diperiksa sebelum dijalankan di produksi.

# BAB 5 Pengolahan dan Klasifikasi

## 5.1 Langkah pengolahan

Tabel 5.1. Langkah pengolahan

| Langkah | Isi | Asal kode |
| --- | --- | --- |
| Buang duplikat | Kabar dengan id sama, atau judul sama dari portal berbeda, dihitung sekali | Kunci judul dari pipeline berita |
| Bahasa dan teks gaul | Mengenali bahasa Indonesia, Inggris, dan Melayu; menormalkan singkatan dan tagar | Pengolah media sosial yang ada |
| Wilayah | Mencari provinsi, kabupaten, dan kecamatan dari teks dan tagar | Penentu wilayah pipeline berita |
| Saring kata | Membuang kabar tanpa kata bencana sebelum dikirim ke model bahasa | Leksikon per bencana, diperluas |
| Klasifikasi | Model bahasa menggolongkan kabar | Baru |
| Kelompokkan | Kabar dengan jenis bencana dan kabupaten sama dalam 3 jam menjadi satu sinyal | Baru |
| Cocokkan | Sinyal dicocokkan dengan Buku Besar Kejadian | Pencocok kejadian yang ada, sumber baru |

Sumber: telaah kode pipeline berita dan media sosial.

## 5.2 Klasifikasi oleh model bahasa

Klasifikasi memakai Claude Haiku 5.5 dengan keluaran JSON terstruktur, sehingga setiap kabar menghasilkan kolom yang sama. Petunjuk tetap untuk model ditaruh di awal permintaan dan disimpan dalam *prompt cache*, sehingga hanya teks kabar yang ditagih penuh. Kabar dikirim berkelompok sampai 20 kabar per permintaan.

Tabel 5.2. Keluaran klasifikasi per kabar

| Kolom | Nilai |
| --- | --- |
| relevan | Ya atau tidak menyangkut kejadian bencana nyata |
| jenis_bencana | Kode jenis bencana dari registri bencana sistem, atau kosong |
| laporan_langsung | Ya bila kabar berasal dari orang di lokasi; tidak bila kabar ulang, doa, atau komentar |
| kejadian_baru | Ya, tidak, atau tidak jelas, berdasarkan petunjuk waktu di teks |
| wilayah_teks | Nama tempat yang disebut, untuk membantu penentu wilayah |
| korban_disebut | Ya bila menyebut korban jiwa, hilang, atau luka |
| pengungsian_disebut | Ya bila menyebut pengungsian |
| kebutuhan | Daftar kebutuhan yang disebut, misalnya makanan, air bersih, perahu, atau tenda |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

Ringkasan untuk piket ditulis Claude Sonnet 5.5 tiap 30 menit dari sinyal yang perlu dicek. Ringkasan hanya merangkum kabar yang ada di sinyal itu dan tidak menambah angka dari luar.

# BAB 6 Sinyal Kejadian

## 6.1 Aturan pengelompokan dan skor

Satu sinyal adalah kumpulan kabar dengan jenis bencana dan kabupaten yang sama dalam jendela 3 jam. Kabar baru yang masuk jendela itu menambah sinyal yang ada; kabar sesudah jendela berakhir membuka sinyal baru, kecuali sinyal lama masih berstatus menunggu piket.

Sumber yang berdiri sendiri dihitung dari sidik akun yang berbeda. Kabar yang hanya membagikan ulang atau mengutip kabar lain dihitung satu sumber bersama kabar aslinya.

Sinyal berstatus "perlu dicek segera" bila memenuhi salah satu syarat:

1. sedikitnya tiga sumber yang berdiri sendiri; atau
2. sedikitnya satu media berita ditambah data alam yang cocok, yaitu gempa BMKG dalam radius 100 kilometer, *hotspot* satelit di kabupaten itu, atau hujan lebat menurut BMKG.

Ambang ini adalah titik awal dan diperbaiki dari keputusan piket serta uji balik berita arsip terhadap logbook Pusdalops.

## 6.2 Siklus status

![Gambar 6.1. Siklus status sinyal](gbr/status-sinyal.png)

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

Tabel 6.1. Status sinyal

| Status | Artinya | Berpindah ke |
| --- | --- | --- |
| Pantau | Sinyal belum memenuhi ambang | Perlu dicek segera, bila ambang terpenuhi |
| Pendukung | Sinyal cocok dengan kejadian di Buku Besar Kejadian | Tetap; dapat memicu notifikasi pembaruan korban |
| Perlu dicek segera | Ambang terpenuhi dan belum cocok dengan kejadian tercatat; notifikasi dikirim | Benar, Salah, atau Ganda, oleh piket |
| Benar | Piket menilai sinyal masuk akal dan menghubungi BPBD | Terkonfirmasi, bila BPBD mengonfirmasi |
| Salah atau Ganda | Piket menilai sinyal keliru atau sama dengan sinyal lain | Selesai; menjadi bahan perbaikan ambang |
| Terkonfirmasi | BPBD atau sumber resmi mengonfirmasi; piket mencatat kejadian di Buku Besar | Selesai |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

# BAB 7 Dashboard

## 7.1 Susunan layar

![Gambar 7.1. Sketsa layar dashboard](gbr/sketsa-dashboard.png)

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB. Tampilan akhir mengikuti token dan komponen sistem desain Centurisk97.

Tabel 7.1. Bagian dashboard

| Bagian | Isi | Sumber data |
| --- | --- | --- |
| Pemilih | Jenis bencana, status, dan rentang waktu | Registri bencana |
| Angka ringkas | Sinyal hari ini, kandidat kejadian baru yang menunggu, sinyal terkonfirmasi, jeda rata-rata sampai diperiksa | `pmk_sinyal`, `pmk_keputusan` |
| Peta | Titik per kabupaten berwarna menurut status | `pmk_sinyal` |
| Antrean periksa | Sinyal yang perlu diputuskan, kandidat kejadian baru di atas | `pmk_sinyal` |
| Rincian sinyal | Ringkasan, kabar asli dengan tautan, data alam, tombol keputusan | `pmk_kabar`, data alam yang ada |
| Rapor sumber | Kabar per sumber, sumber yang gagal, persen sinyal benar per sumber | `pmk_sumber`, `pmk_keputusan` |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

## 7.2 Rute Worker

Tabel 7.2. Rute yang diusulkan

| Rute | Gunanya | Hak |
| --- | --- | --- |
| `GET /api/pmk/sinyal` | Daftar sinyal dengan pemilih | Sesi staf |
| `GET /api/pmk/sinyal/:id` | Rincian satu sinyal dan kabarnya | Sesi staf |
| `POST /api/pmk/sinyal/:id/keputusan` | Menyimpan keputusan piket | Sesi staf piket |
| `GET /api/pmk/sumber` | Rapor sumber | Sesi staf |
| `POST /api/pmk/ingest` | Menerima kabar bersih dan sinyal dari pengolah | Kunci pipeline |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB. Semua rute ditinjau keamanannya sebelum terbit.

# BAB 8 Notifikasi

## 8.1 Aturan kirim

Tabel 8.1. Aturan kirim notifikasi

| Aturan | Isi |
| --- | --- |
| Kapan dikirim | Sinyal berpindah ke status "perlu dicek segera" |
| Pengecualian | Sinyal "pendukung" yang menyebut korban jiwa atau pengungsian yang belum ada di Buku Besar, paling banyak sekali per 6 jam per kejadian |
| Penerima | Piket Pusdalops yang sedang bertugas, dari daftar piket yang dikelola staf |
| Sekali per kejadian | Kandidat yang sama tidak dikirim ulang; kabar baru hanya menambah isi dashboard |
| Batas | Paling banyak 10 notifikasi per jam; sisanya digabung menjadi satu ringkasan |
| Pengingat | Notifikasi yang belum diputuskan dalam 30 menit diingatkan sekali |
| Isi | Jenis bencana, kabupaten, jumlah sumber, waktu kabar pertama, data alam, dan tautan ke rincian sinyal; tanpa nama akun dan tanpa isi kabar asli |
| Jalur | Baris baru di antrean kirim bot WhatsApp yang sudah ada, jenis pesan baru untuk pemantauan kabar |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

## 8.2 Contoh pesan

> Kandidat kejadian baru: banjir, Kabupaten Bekasi, Jawa Barat. Empat sumber berdiri sendiri sejak 14.20 WIB, dua di antaranya video dari lokasi. Data alam: hujan lebat menurut BMKG. Belum ada di Buku Besar Kejadian. Periksa di dashboard: tautan rincian sinyal.

> Pembaruan kejadian tercatat: gempa, Kabupaten Nias Selatan. Kabar dari tiga sumber menyebut korban jiwa yang belum tercatat di Buku Besar Kejadian. Periksa di dashboard: tautan rincian sinyal.

# BAB 9 Keamanan, Privasi, dan Biaya Operasi

## 9.1 Keamanan dan privasi

1. Kunci API Meta, X, dan Claude disimpan sebagai rahasia GitHub Actions dan Worker, tidak pernah ditulis di berkas yang dilacak git.
2. Kabar mentah hanya di R2 privat dan dihapus sesudah 30 hari.
3. Tabel olahan menyimpan sidik akun satu arah, bukan nama akun. Dashboard menampilkan tautan ke kabar asli, bukan salinan nama atau foto akun.
4. Tidak ada data kabar warga di `public/`. Rekap yang keluar dari sistem hanya berisi angka per kabupaten.
5. Penarik halaman publik tidak login, tidak mengakali verifikasi, dan berhenti bila diminta login.

## 9.2 Pengendalian biaya

1. Batas belanja bulanan di akun X; penarik X berhenti bila batas tercapai.
2. Penyaring kata membuang kabar tak relevan sebelum klasifikasi, sehingga hanya sebagian kabar yang ditagih.
3. *Prompt cache* untuk petunjuk tetap model, dan pengiriman berkelompok sampai 20 kabar per permintaan.
4. Ringkasan rekap harian, yang tidak mendesak, dikirim lewat Message Batches dengan potongan 50 persen.
5. Dashboard menampilkan perkiraan biaya bulan berjalan per layanan untuk staf Pusdatinkom.

Biaya layanan Paket Mulai sekitar Rp8,8 juta per bulan dan Paket Lengkap sekitar Rp59,2 juta per bulan. Rinciannya ada di Whitepaper Pemantauan Kabar Kebencanaan.

# BAB 10 Ukuran Keberhasilan

Tabel 10.1. Ukuran keberhasilan

| Ukuran | Cara menghitung | Sumber data |
| --- | --- | --- |
| Persen sinyal benar | Keputusan benar dibagi semua keputusan, per sumber dan per jenis bencana | `pmk_keputusan` |
| Kejadian yang tertangkap | Kejadian di logbook Pusdalops yang muncul sebagai sinyal | Uji balik terhadap logbook |
| Jam lebih awal | Selisih waktu kabar pertama dan waktu kejadian masuk logbook | `pmk_sinyal`, logbook |
| Jeda sampai diperiksa | Selisih waktu notifikasi dan keputusan piket | `pmk_notif`, `pmk_keputusan` |
| Beban notifikasi | Jumlah notifikasi per hari | `pmk_notif` |
| Kesehatan sumber | Persen siklus berhasil per sumber | `pmk_sumber` |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

Ukuran ini tampil di rapor sumber dan dipakai untuk memperbaiki ambang sinyal, daftar tagar, dan petunjuk klasifikasi.
