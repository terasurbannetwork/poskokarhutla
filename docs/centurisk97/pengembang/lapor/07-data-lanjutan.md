# Data lanjutan BPBD: spek dan rekap

Halaman ini menjelaskan spek objek, rumus rekap, penanda objek, kondisi akhir, dan pertanyaan harian pada data lanjutan BPBD.

## Data lanjutan BPBD: spek, rekap, kondisi akhir

Berkas: `src/lapor_lanjut_spek.js` (fungsi murni), `src/lapor_lanjut.js` (rute), `src/lapor_lanjut_mesin.js` (percakapan WhatsApp), `src/lapor_lanjut_meja.js` (rekap ke meja). Tingkat kerusakan rumah dan prasarana memakai kriteria modul Siklus (keputusan pemilik 20 November 2026): rusak berat (rb) lebih dari 70 persen, rusak sedang (rs) 30 sampai 70 persen, rusak ringan (rr) kurang dari 30 persen.

Rekap dihitung ulang penuh dari daftar tiap kali objek ditulis, dibatalkan, atau ditandai nihil (`dorongRekap`, galatnya ditelan agar tidak menggagalkan tulis objek):

```
nilai(m) = jumlah objek himpunan S(m)   bila jumlah > 0
         = 0                            bila m ditandai nihil, atau objeknya ada tetapi semua sudah selesai
         = null ("belum didata")         selain itu
S(rumah_rb) = rumah tingkat rb  (rs, rr serupa);  S(rumah_terendam) = rumah terendam ya
S(meninggal) = korban meninggal atau hilang yang ditemukan meninggal
S(hilang)    = korban hilang dengan status pencarian dicari
S(luka)      = korban luka berat atau luka ringan
S(mengungsi, t) = jiwa dengan tanggal masuk <= t dan (keluar kosong atau keluar > t)
jalan_km     = jumlah panjang rusak prasarana jalan / 1000
```

Mengisi objek untuk metrik yang bertanda nihil mencabut tanda nihilnya dan dicatat di jejak. Metrik "mengungsi" wajib bertanggal; tanpa tanggal nilainya null. Rekap ditulis ke meja `dampak` dan `pengungsi`; bila kolom ketikan petugas untuk metrik yang sama berisi nilai lain, keduanya disimpan dan meja menandai `beda_sumber`; mesin tidak memilih. Catatan berstatus diverifikasi atau masuk_logbook hanya mendapat penanda `rekap_baru` dan isinya tidak berubah sampai petugas menerima. Prasarana sampai ke Lifeline lewat kolom prasarana meja `dampak`.

Penanda objek (`AMBANG`, `src/lapor_lanjut_spek.js:19`, HIPOTESIS rancangan yang dapat diubah tanpa migrasi): `foto_jauh` bila foto bertitik lebih dari 500 m dari titik objek; `foto_lama` bila waktu ambil foto lebih dari 72 jam sebelum waktu kejadian; `dobel_titik` bila objek rumah atau prasarana lain berjarak 10 m atau kurang; `nik_ganda` bila NIK sama pada dua objek sejenis di berkas yang sama (tidak lintas jenis dan tidak lintas berkas); `tanpa_titik` dan `luar_kab`. Penanda ditampilkan dan tidak menolak simpan.

Titik objek: titik isian manual, kalau tidak titik foto pertama berlencana GPS, kalau tidak titik foto pertama berlencana EXIF, kalau tidak kosong.

Kondisi akhir saat penutupan (`kondisiAkhir`, `src/lapor_lanjut_spek.js:243`):

```
sisa_hilang = nilai(hilang); sisa_ungsi = nilai(mengungsi, hari penutupan); sisa_putus = nilai(prasarana putus)
status = selesai           bila ketiganya bernilai 0 (bukan null)
       = selesai_catatan   selain itu, dengan alasan per butir ("belum didata" bila null)
```

Versi beku memuat berkas tanpa data pribadi, rekap, kondisi akhir, dan daftar objek diwakili sidik SHA-256 dari data; versi tidak pernah ditimpa. Sidik isian pribadi di jejak memakai HMAC berkunci rahasia Worker, bukan hash polos, supaya nomor HP dan NIK tidak bisa ditebak dari sidiknya.

Pertanyaan harian: cron menjalankan `tanyaHarian` pukul 16.00 WIB (09.00 UTC) pada menit 0 dan 30 (menit 30 sebagai ulangan); satu baris `lj_tanya` per berkas per tanggal dan satu pesan per ketua (daftar bernomor bila beberapa berkas) yang hanya berisi jumlah per bagian, tanpa nama, HP, atau NIK. Antrean `lj_kabar` memuat token tautan mentah hanya sampai terkirim; sesudah itu teksnya diganti `-`.
