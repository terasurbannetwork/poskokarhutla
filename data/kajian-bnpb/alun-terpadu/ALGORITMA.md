# ALGORITMA: Alun-alun Terpadu

Semua ambang adalah usulan agent dan tinggal di satu tempat (`src/alun_konst.js` untuk Worker, kepala `scripts/siklus/alun_rekap.py` untuk pipeline, dengan uji yang memastikan keduanya sama).

## 1. Utas yang dikirim ke pencocok kejadian

Satu baris ingest per utas yang memenuhi semua syarat:

1. `jenis` utas adalah `butuh_bantuan` atau `info_lapangan`.
2. `moderasi <> 'tersembunyi'` dan `dummy = 0`.
3. `bencana` terpetakan ke jenis Buku Besar lewat `PETA` (`src/kejadian_tautan.js:13`). `umum` dan jenis yang tidak terpetakan tidak dikirim.
4. `dibuat` dalam rentang yang diminta (paling lama 120 hari, aturan rute ingest yang ada).

Bentuk baris: `{sumber: "alun", kode: <id utas>, jenis: <jenis Buku Besar>, kab4, mulai: <dibuat>, lat, lon}`.

`kab4` = `kab4Dari(prov, kab)` (`src/siklus_kab.js:60`). Hasil null (kabupaten kosong, ejaan tidak dikenal, atau nama ganda) dikirim apa adanya; pencocok memakai `lat` dan `lon` bila ada, selain itu memberi status `tanpa_wilayah`.

## 2. Keputusan pencocok

Aturan pencocok tidak diubah: jenis sama, kabupaten sama, dan `mulai` dalam jendela 3 hari dari rentang kejadian (`scripts/siklus/pasang.py:19`). Tambahan khusus sumber `alun`:

| Keadaan | Status di `sk_kejadian_sumber` | Tampil sebagai |
| --- | --- | --- |
| tepat satu kejadian cocok | terpasang | "Terkait kejadian KJ-..." |
| lebih dari satu cocok | ambigu, dengan daftar kandidat | antrean tinjau staf |
| kabupaten tidak dikenali dan tanpa koordinat | tanpa_wilayah | tidak ditampilkan ke publik |
| berwilayah jelas, tidak ada yang cocok | tidak ada baris tautan | "Belum ada di Buku Besar" (hanya staf) |

Sumber `alun` tidak pernah membuat `sk_kejadian`, tidak mengubah `fase`, dan tidak dihitung sebagai bukti untuk kenaikan keyakinan kejadian (`yakin`). Ini diuji dengan menjalankan pencocok atas utas tanpa kejadian dan memeriksa jumlah baris `sk_kejadian` tidak bertambah.

Utas yang kemudian disembunyikan moderator atau dihapus: tautannya dibuang pada putaran pencocok berikutnya.

## 3. Wilayah dan hak akun instansi

Satu utas "dalam wilayah" sebuah akun bila aturan lingkup yang sudah ada benar untuk `(prov, kab)` utas: akun tingkat kabupaten dengan `prov` dan `kab` sama, atau akun tingkat provinsi yang `cakupan`-nya memuat provinsi itu (`lingkupSql` dan `dalamLingkup`, `src/instansi.js:250`). Utas tanpa kabupaten hanya masuk kotak masuk akun tingkat provinsi.

| Tindakan | Syarat |
| --- | --- |
| Melihat kotak masuk | akun instansi aktif; utas dalam wilayah |
| Membalas sebagai lembaga | akun instansi aktif; utas dalam wilayah; utas tidak tersembunyi |
| Mengubah status bantuan | seperti di atas, dan jenis akun pemprov, pemkab, atau pemkot (Q8); utas berjenis `butuh_bantuan` |
| Membalas sebagai lembaga dari halaman alun-alun | `sesi_masuk` sah; orang itu pemilik nomor atau anggota aktif **tepat satu** akun instansi aktif; utas dalam wilayah akun itu |

Balasan lembaga disimpan sebagai `alun_balas` dengan `petugas = 1`, `nama` NULL, dan baris `alun_penulis` berlabel nama lembaga. Aturan aduan untuk balasan petugas (tidak bisa disembunyikan massa) berlaku.

Transisi status bantuan: terbuka ke ditangani, ditangani ke selesai, terbuka ke selesai, dan kembali ke terbuka oleh lembaga yang sama atau moderator. Tiap transisi menulis satu baris riwayat (`alun_riwayat`): utas, dari, ke, lembaga, waktu, catatan (wajib untuk selesai, paling banyak 280 huruf). Riwayat tidak pernah diubah atau dihapus kecuali utasnya dihapus moderator.

## 4. Ukuran rekap

Rekap dihitung dari baris ingest rekap (utas `butuh_bantuan`, `info_lapangan`, `tanya` yang tampil dan bukan contoh, 90 hari terakhir) beserta waktu balasan lembaga pertamanya.

| Ukuran | Definisi |
| --- | --- |
| Kebutuhan terbuka | jumlah utas `butuh_bantuan` dengan status terbuka saat rekap |
| Lama tak terjawab | kebutuhan terbuka yang berumur lebih dari 24 jam (Q4) dan belum punya balasan lembaga |
| Waktu respons | selisih `dibuat` utas dan waktu balasan lembaga pertama; median atas utas `butuh_bantuan` yang dibuat 7 hari terakhir dan sudah dijawab |
| Terjawab lembaga | persentase utas `butuh_bantuan` 7 hari terakhir yang punya balasan lembaga |
| Belum ada di Buku Besar | jumlah utas `info_lapangan` dan `butuh_bantuan` 7 hari terakhir yang berwilayah jelas dan tanpa tautan |
| Topik | hitungan per pasangan jenis bencana dan jenis utas |
| Terverifikasi | hitungan terpisah untuk utas yang punya baris `alun_penulis` dan yang tidak (Q6) |

Pemecahan: nasional, per provinsi, per kabupaten (sepuluh teratas menurut kebutuhan terbuka ditulis ke berkas ringkas; seluruhnya ke berkas rinci).

Aturan angka:

- Median dari kurang dari 5 utas ditulis sebagai "belum cukup data", bukan angka.
- Persentase dengan penyebut kurang dari 5 ditulis sebagai pecahan ("2 dari 3").
- Tidak ada angka gabungan, skor, atau peringkat kinerja BPBD.
- Waktu ditulis dengan `fmt.durasi` di layar ("6 jam 24 menit").

## 5. Pemberitahuan

Saat utas `butuh_bantuan` tersimpan (bukan dari moderator, bukan contoh):

1. Cari akun instansi aktif yang wilayahnya mencakup utas (aturan bagian 3).
2. Panggil `kabarkan()` dengan kunci kejadian `alun:<id utas>` supaya tidak terkirim dua kali; batas 40 penerima per kunci yang sudah ada berlaku.
3. Isi: "Kebutuhan baru di alun-alun: <judul>, <kabupaten atau provinsi>." dengan tautan ke kotak masuk. Tanpa isi utas, tanpa nama penulis.
4. Dijalankan lewat `ctx.waitUntil`, jadi kegagalan kirim tidak menggagalkan penulisan utas. Tidak ada jadwal cron baru.
5. Tidak ada penerima: dicatat sebagai "dilewati"; utas tetap masuk pengingat admin `bantuan_terbuka` yang sudah ada.

Batas banjir: paling banyak 20 pemberitahuan alun-alun per akun per jam; lebihnya digabung menjadi satu ("N kebutuhan baru di alun-alun").

## 6. Kesegaran

Berkas rekap membawa `dihitung` (waktu). Layar menandai "lama" bila lebih dari 36 jam. Tanda kejadian di utas membawa waktu keputusan pencocok terakhir.

## 7. Uji kejujuran

- Jumlah `sk_kejadian` tidak berubah oleh sumber `alun`.
- Rekap tidak memuat `mk_id`, nama penulis, nomor, atau teks isi utas; hanya judul utas publik.
- Angka rekap bisa dihitung ulang dari baris ingest yang sama (uji membandingkan dengan hitungan mandiri atas data uji).
- Tidak ada kata "aman" di teks yang dihasilkan.
- Ambang di Worker dan pipeline sama.
