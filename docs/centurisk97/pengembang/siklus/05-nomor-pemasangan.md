# Nomor kejadian dan pemasangan sumber

Halaman ini merinci pembuatan nomor KJ, pemasangan antarsumber, pembersihan Logbook, dan penanganan angka berdampingan.

## Nomor kejadian `KJ-` (F1.2)

Sumber: semua sumber kejadian yang dikenal pipeline. Sumber riwayat adalah DIBI dan Logbook Pusdalops 2011 sampai sekarang. Sumber hidup adalah USGS dan BMKG (gempa), kejadian banjir dan gunung api aktif, kluster karhutla, serta tugas lapangan, SIPPA, dan modul lain lewat rute ingest. Frekuensi: harian, kecuali sumber hidup tiga jam sekali.

Langkah dan rumus:

```
kunci_pendiri = jenis_utama + "|" + kab_utama + "|" + tgl_mulai_iso
jenis_utama   = kunci jenis rekaman pendiri, diurut naik lalu digabung "+"
kab_utama     = kode Kemendagri (kab4) terkecil dari kab rekaman pendiri
d(k)          = SHA-256(UTF-8 k); v(k) = 5 byte pertama (40 bit)
kode(k)       = 8 simbol Crockford base32 ("0123456789ABCDEFGHJKMNPQRSTVWXYZ")
ID            = "KJ-" + tahun(tgl_mulai) + "-" + kode(kunci_pendiri)    panjang 16
```

Tabrakan ditangani dengan meng-hash ulang `kunci|n` (n = 2, 3, dan seterusnya) sampai ID bebas. ID tidak pernah dipakai ulang, termasuk untuk kejadian dibatalkan atau digabung. Contoh vektor uji: `banjir|3201|2026-03-02` menjadi `KJ-2026-9A2WGN3G`.

Algoritma ID ini berada di `scripts/bnpb/kunci_kejadian.py` dan dimuat oleh `scripts/siklus/kunci.py:12-18`.

Kunci wilayah tunggal adalah `kab4`, kode Kemendagri 4 digit. Kode BPS berbeda untuk 164 pasangan kabupaten, jadi kolom `id_kab_bps` DIBI tidak pernah dipakai langsung sebagai `kab4`. Pemetaan selalu lewat nama dan provinsi.

Karhutla memakai kode sumber `sel:<i>:<j>` dengan sel 0,02 derajat dari pusat kluster, karena kode `K####` diberi ulang tiap hari. Tafsir "kompleks" karhutla (gugus sel) tidak dibuat.

Batasan: format nomor induk resmi menurut Perban 1/2023 Pasal 8 tidak ditemukan, sehingga kolom nomor induk resmi dikosongkan.

## Pemasangan antarsumber (F1.4)

Setiap rekaman baru diproses berurutan.

1. Cari pemetaan tepat `(sumber, kode_sumber)`. Bila ada, perbarui kejadian itu.
2. Hitung kandidat: kejadian aktif dengan irisan jenis dan irisan kabupaten tidak kosong, selisih hari paling banyak 3 hari (jendela 3 untuk semua jenis), dan belum punya entri dari sumber yang sama.
3. Satu kandidat: tambahkan. Nol kandidat: buat kejadian baru berfase terdeteksi. Lebih dari satu: masuk antrean, tidak ditebak.

Dua mode. Mode riwayat memasangkan DIBI lawan Logbook secara rakus satu lawan satu menurut selisih terkecil. Pada data 10 November 2026, irisan tahun 2013 sampai 2021 dan 2023 sampai 2026 terpasang 59,8 persen untuk DIBI dan 60,4 persen untuk Logbook. Mode masuk bertahap memakai hitung kandidat di atas. Kejadian yang sudah punya entri dari paling sedikit dua nama sumber berbeda ditandai `siap_verifikasi`. Kejadian berumur lebih dari 3 hari tanpa pembaruan pada fase terdeteksi ditandai basi (hanya tampilan).

Status uji: pemasangan dijaga uji vektor ID dan uji paritas, belum ada ambang akurasi resmi. Jendela khusus untuk karhutla, kekeringan, dan gunung api belum diputuskan (UA-1), nilainya dipegang di 3 hari.

## Pembersihan Logbook (F1.6)

Aturan berurutan atas `data/pusdalops/logbook_kejadian.csv` (sekitar 56.685 baris):

| Urut | Alasan | Tindakan |
| --- | --- | --- |
| 1 | tanggal mulai kosong atau tak terurai | dibuang |
| 2 | tahun sebelum 2011 atau tanggal sesudah tanggal ambil | dibuang |
| 3 | duplikat persis dengan baris sebelumnya | dibuang, simpan yang pertama (asumsi kebijakan) |
| 4 | kabupaten tidak terpetakan | ditandai, disimpan, masuk antrean |
| 5 | jenis tidak dapat dibandingkan | ditandai, disimpan, tidak dipasang |
| 6 | nilai dampak negatif atau bukan angka | nilai menjadi null, baris tetap |

Invarian: masuk sama dengan bersih ditambah dibuang. Batas 2011 adalah batas rentang data, bukan peraturan.

## Titik perkiraan dari nama desa (F1.6b)

Logbook hanya membawa nama desa, kecamatan, dan kabupaten. Nama dinormalkan (huruf kecil, tanpa awalan desa atau kelurahan, tanpa tanda baca) lalu dicocokkan hanya di kabupaten yang dikenal kejadian. Tepat satu kandidat dengan poligon menjadi `cocok_desa`. Kejadian dengan lebih dari satu desa, kecamatan, atau kabupaten menjadi `tidak_cocok` dengan alasan `banyak_desa`. Titik adalah titik pusat poligon terbesar, berlabel `estimasi-model`, dan merupakan perkiraan pusat desa, bukan titik kejadian. Pusat kabupaten atau kecamatan tidak pernah dipakai. Hasil ukur 24 November 2026: 56.685 kejadian, 19.248 `cocok_desa` (34,0 persen). Sumber alasan tidak cocok terbesar: `banyak_desa` 17.878, `tanpa_desa` 7.537, `desa_tak_ada_di_kab` 5.821.

## Angka berdampingan dan selisih (F1.7)

Untuk tiap metrik pada satu kejadian, ambil nilai tiap sumber yang melapor (bukan null).

```
n       = jumlah sumber dengan nilai
selisih = maks - min        bila n >= 2, selain itu tidak ada
persen  = selisih / maks x 100   hanya bila maks > 0
```

Tidak ada total gabungan dan tidak ada rata-rata. Nilai 0 yang dilaporkan adalah angka, sedangkan null berarti "belum ada laporan". Untuk karhutla, metrik terdampak dari sumber selain sistem Centurisk97 tidak pernah sampai ke layar. Contoh: meninggal menurut DIBI 12 dan Logbook 15 menghasilkan selisih 3 (20 persen).

## Gabung, alias, dan koreksi (F1.5)

Gabung hanya manual oleh Koordalops. Kejadian yang lebih awal bertahan, yang lain berfase `digabung` dengan penunjuk `ke`. Baris sumber berpindah dengan `asal_id` dicatat. Alias diikuti sampai fase bukan `digabung` dengan pengaman 32 langkah. Tidak ada fungsi pecah: Koordalops memindahkan satu baris sumber ke kejadian lain atau ke kejadian baru, dan perpindahan itu dicatat di jejak (`sk_jejak`).
