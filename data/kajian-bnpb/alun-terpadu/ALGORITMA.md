# ALGORITMA: Alun-alun Terpadu

Semua ambang adalah usulan agent dan tinggal di satu tempat (`src/alun_konst.js` untuk Worker, kepala `scripts/siklus/alun_rekap.py` untuk pipeline, dengan uji yang memastikan keduanya sama).

## 1. Wilayah baku

Saat utas ditulis:

1. Provinsi wajib, kode 2 digit (seperti sekarang).
2. Kabupaten opsional. Bila diisi, klien mengirim kode kabupaten 4 digit yang dipilih dari daftar. Server memeriksa kode itu ada dan termasuk provinsi yang dipilih (satu fungsi pemeriksa di `src/siklus_kab.js`, memakai tabel nama yang sama dengan `kab4Dari`). Tidak sah: ditolak 400 "pilih kabupaten atau kota dari daftar".
3. Klien lama yang mengirim teks: server mencoba `kab4Dari(prov, teks)`; hasil null ditolak dengan pesan yang sama.
4. Server menyimpan nama baku kabupaten ke `alun_utas.kab` (supaya tampilan lama tetap jalan) dan baris `alun_wilayah (utas_id, prov, kab4)`.
5. Koordinat tetap disimpan dibulatkan seperti sekarang, tetapi tidak dipakai untuk menentukan wilayah.

Utas tanpa kabupaten tidak punya `kab4`: masuk kotak masuk akun tingkat provinsi saja, tidak dikirim ke pencocok, tidak memicu pemberitahuan, dan dihitung "tanpa kabupaten" di rekap. Utas lama tanpa baris `alun_wilayah` diperlakukan sama.

Syarat tambahan untuk AT-03: nama baku yang dikirim ke pipeline harus dipetakan pipeline (`KN.kab4(kab, prov)`) ke kode yang sama dengan kode Worker, untuk semua kabupaten dan kota. Ada uji yang membandingkan keduanya.

## 2. Utas yang dikirim ke pencocok kejadian

Satu baris ingest per utas yang memenuhi semua syarat:

1. `jenis` utas `butuh_bantuan` atau `info_lapangan`.
2. `moderasi = 'tampil'` dan `dummy = 0`.
3. Punya baris `alun_wilayah` dengan `kab4`.
4. Tidak punya tanda "tidak valid" (`alun_tanda`).
5. `bencana` adalah jenis yang diterima Buku Besar (`JENIS_SAH`, `src/siklus_kejadian.js`) sesudah pemetaan nama (`PETA`, `src/kejadian_tautan.js`, yang hanya memetakan beberapa nama; sisanya lolos bila sudah sama). `umum`, `pesisir`, `udara`, dan jenis lain yang tidak diterima tidak dikirim.
6. `dibuat` dalam rentang yang diminta (paling lama 120 hari, aturan rute ingest yang ada).

Bentuk baris mengikuti kontrak rute ingest modul yang ada: `sumber`, `kode`, `jenis`, `prov`, `kab` (nama baku), `mulai`. Koordinat tidak dikirim. Rute memakai kursor `(dibuat, id)` dan indeks baru untuk itu.

## 3. Aturan pencocok khusus sumber `alun`

Ini aturan baru di `scripts/siklus/pasang.py`, bukan aturan yang sudah ada:

| Hal | Sumber lain (sekarang) | Sumber `alun` |
| --- | --- | --- |
| Banyak baris sumber yang sama per kejadian | tidak (kejadian yang sudah punya entri sumber itu bukan kandidat) | boleh; pemeriksaan itu dilewati |
| Tanpa kandidat | membuat kejadian `baru` | tidak membuat apa pun; tidak ada baris tautan |
| Tepat satu kandidat | `tambah` | `tambah` |
| Lebih dari satu kandidat | `ambigu`, masuk antrean tinjau | `ambigu` sebagai status saja; tidak masuk antrean tinjau |
| Dihitung untuk "siap verifikasi" dan keyakinan | ya | tidak |
| Urutan prioritas masuk | sesuai `PRIORITAS_MASUK` | paling akhir |

Kandidat ditentukan seperti sekarang: jenis sama, kabupaten sama, dan `mulai` kejadian dalam 3 hari dari `mulai` utas (`JENDELA = 3`).

Penjaga kedua di Worker: `POST /api/siklus/ingest/kejadian` menolak aksi `baru` bila `sumber = 'alun'`, apa pun pengirimnya.

Hasil yang dilihat orang:

| Keadaan | Tampil sebagai |
| --- | --- |
| terpasang ke kejadian yang sudah dipublikasikan | "Terkait kejadian KJ-..." untuk semua orang |
| terpasang ke kejadian yang belum dipublikasikan | hanya untuk staf, lewat rute Siklus |
| ambigu | hanya hitungan di rekap |
| berwilayah, tidak cocok | "Belum ada di Buku Besar" (hanya staf) |

## 4. Mencabut tautan

Saat moderator menyembunyikan atau menghapus utas, atau akun instansi menandainya tidak valid, Worker menghapus baris `sk_kejadian_sumber` bersumber `alun` untuk utas itu pada saat yang sama. Utas yang ditampilkan lagi dan masih dalam rentang akan dikirim lagi pada putaran pencocok berikutnya, karena kodenya sudah tidak ada. Tidak ada aksi ingest baru.

## 5. Wilayah dan hak akun instansi

Satu utas "dalam wilayah" sebuah akun bila `alun_wilayah.kab4` termasuk daftar kode kabupaten akun (`lingkupKab4`, `src/siklus_kab.js`), atau, untuk utas tanpa kabupaten, provinsinya termasuk cakupan akun tingkat provinsi. Penyaringan dilakukan di SQL atas `alun_wilayah`, bukan dengan membandingkan teks.

| Tindakan | Syarat |
| --- | --- |
| Melihat kotak masuk | sesi instansi aktif; utas dalam wilayah |
| Membalas atas nama lembaga | seperti di atas; utas tidak tersembunyi |
| Mengubah status bantuan | seperti di atas, dan jenis akun pemprov, pemkab, atau pemkot (Q8); utas `butuh_bantuan` |
| Menandai tidak valid | sesi instansi aktif; utas dalam wilayah |

Balasan lembaga disimpan sebagai `alun_balas` biasa (`petugas = 0`, `nama` NULL dari server) dengan baris `alun_lembaga (pos_id, akun_id, lembaga)`. Nama lembaga diambil server dari akun. "Balasan resmi" berarti balasan lembaga atau balasan petugas pusat (`petugas = 1`).

Aduan atas balasan lembaga: menjadi `dilaporkan` untuk moderator, tidak pernah tersembunyi otomatis (aturan yang sama dengan balasan petugas), diterapkan lewat keberadaan baris `alun_lembaga`.

## 6. Status bantuan dan riwayat

Transisi yang sah:

| Dari | Ke | Oleh |
| --- | --- | --- |
| terbuka | ditangani | akun instansi wilayah (pemprov, pemkab, pemkot), moderator, fitur Teruskan |
| terbuka atau ditangani | selesai | akun instansi wilayah, moderator; wajib alasan baku |
| ditangani atau selesai | terbuka | akun instansi yang sama jenisnya, moderator |
| selesai | terbuka | pelapor, dalam 14 hari sejak ditutup |

Alasan baku penutupan: bantuan sudah tiba, ditangani instansi lain, tidak ditemukan di lokasi, kiriman ganda, lainnya. Catatan bebas (paling banyak 280 huruf) boleh ditambahkan dan hanya terlihat staf dan moderator.

Pelapor dikenali dari kode pemilik utas (`x-kode`, seperti penanda jawaban sekarang) atau dari `sesi_masuk` yang `mk_id`-nya sama dengan `alun_penulis` utas itu.

Tiap transisi menulis satu baris `alun_riwayat`: utas, dari, ke, pelaku (`instansi`, `admin`, `pelapor`, `teruskan`), nama lembaga bila ada, alasan, catatan staf, waktu. Yang tampil publik hanya dari, ke, pelaku atau nama lembaga, alasan, dan waktu. Riwayat tidak pernah diubah; dihapus hanya bersama utasnya.

## 7. Tanda tidak valid

Akun instansi dalam wilayah boleh menandai satu utas tidak valid dengan alasan baku (bukan kebutuhan, ganda, di luar wilayah, lainnya). Akibatnya: utas keluar dari rekap dan pencocok, tautan kejadiannya dicabut, dan utas masuk antrean moderator. Utas tetap tampil. Moderator bisa mencabut tanda. Satu akun paling banyak 30 tanda per hari.

## 8. Pemberitahuan

Saat utas `butuh_bantuan` tersimpan dan semua ini benar: penulisnya punya `sesi_masuk` sah (ada baris `alun_penulis`), utas punya `kab4`, bukan dari moderator, dan `TURNSTILE_SECRET` terisi:

1. Cari akun instansi aktif yang wilayahnya mencakup `kab4` itu.
2. Periksa batas: 3 pemberitahuan per kabupaten per jam, 20 per akun per jam. Lewat batas: tidak dikirim (utas tetap ada di kotak masuk).
3. Panggil `kabarkan()` dengan kunci `alun:<id utas>` supaya tidak ganda; batas 40 penerima per kunci yang ada berlaku.
4. Isi: "Kebutuhan baru di alun-alun, <nama kabupaten>." dan tautan ke kotak masuk. Tanpa judul, isi, atau nama.
5. Dijalankan di belakang jawaban (`waitUntil`), jadi kegagalan kirim tidak menggagalkan penulisan utas. Tidak ada jadwal cron baru.

Kiriman tamu, kiriman tanpa kabupaten, dan kiriman moderator tidak memicu pemberitahuan.

## 9. Ukuran rekap

Rekap dihitung dari baris ingest rekap: utas `butuh_bantuan`, `info_lapangan`, dan `tanya` berstatus tampil, bukan contoh, tidak ditandai tidak valid, 90 hari terakhir. Tiap baris membawa: id, jenis utas, bencana, prov, kab4, dibuat, status bantuan, waktu balasan resmi pertama dan jenisnya (lembaga atau petugas pusat), tanda terverifikasi, status tautan kejadian (terpasang, ambigu, tidak ada), jumlah "dibuka lagi". Tanpa judul, isi, nama, nomor.

| Ukuran | Definisi |
| --- | --- |
| Kebutuhan terbuka | jumlah utas `butuh_bantuan` berstatus terbuka saat rekap |
| Lama tak terjawab | kebutuhan terbuka berumur lebih dari 24 jam (Q4) tanpa balasan resmi |
| Waktu respons | selisih `dibuat` dan balasan resmi pertama; median atas utas `butuh_bantuan` 7 hari terakhir yang sudah dijawab |
| Terjawab | bagian utas `butuh_bantuan` 7 hari terakhir yang punya balasan resmi; dirinci lembaga dan petugas pusat |
| Dibuka lagi | jumlah utas yang ditutup lalu dibuka pelapor, 7 hari terakhir |
| Belum ada di Buku Besar | jumlah utas `info_lapangan` dan `butuh_bantuan` 7 hari terakhir yang berkabupaten dan tanpa tautan |
| Topik | hitungan per pasangan jenis bencana dan jenis utas |
| Tanpa kabupaten | jumlah utas tanpa `kab4` |

Angka utama tiap ukuran hanya dari kiriman terverifikasi. Kiriman tamu dihitung dengan definisi yang sama dan ditulis sebagai baris terpisah.

Pemecahan: nasional, per provinsi, per kabupaten. Berkas ringkas memuat nasional dan per provinsi; berkas rinci memuat semua kabupaten.

Aturan angka:

- Median dari kurang dari 5 utas ditulis "belum cukup data".
- Bagian dengan penyebut kurang dari 5 ditulis sebagai pecahan ("2 dari 3").
- Hitungan per kabupaten di bawah 3 pada berkas rinci tetap ditulis apa adanya; berkas itu hanya untuk staf berwenang.
- Tidak ada angka gabungan, skor, atau peringkat.

## 10. Kesegaran

Berkas rekap membawa `dihitung`. Layar menandai "lama" bila lebih dari 36 jam.

## 11. Uji kejujuran

- Jumlah `sk_kejadian`, fase, dan keyakinannya tidak berubah oleh sumber `alun`, baik lewat pencocok maupun lewat rute ingest langsung.
- Rekap tidak memuat judul, `mk_id`, nama, nomor, atau isi utas.
- Angka rekap sama dengan hitungan mandiri atas data uji.
- Tidak ada kata "aman" di teks yang dihasilkan.
- Ambang di Worker dan pipeline sama.
- Kode kabupaten Worker dan pipeline sama untuk semua kabupaten dan kota.
