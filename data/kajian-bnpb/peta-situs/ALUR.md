# ALUR: Peta Situs

## Warga dan publik

1. Buka `/`. Kepala memuat menu bencana, Prediksi, Lapor, dan Masuk.
2. Klik Lapor untuk membuka `/lapor`. Dari sana tersedia Lacak, Kejadian hari ini, Kabar selamat, dan Alun-alun.
3. Halaman sekunder lain dibuka dari kaki situs.

## Staf BNPB

1. Klik Masuk, lalu masuk di `/masuk` dengan sandi.
2. Worker mengarahkan ke `/bnpb`, atau ke `?ke=` bila jalurnya lolos `tujuan()`. Halaman tujuan tetap menolak bila peran tidak berhak.
3. Panel kiri menampilkan delapan grup dari `/api/peta-situs`, sudah disaring menurut peran.

## BPBD dan instansi

`/masuk`, lalu `/instansi`, lalu pilih profil dan PIN (paket `profil-bpbd`), lalu menu instansi.

## Petugas lapangan

Petugas masuk di `/masuk` dengan kode WA, lalu diarahkan ke `/petugas`.

## Kampus dan mitra

Kampus dan mitra masuk di `/masuk`, lalu diarahkan ke `/kemitraan`.

## Tautan bertoken

Penerima mengklik tautan dari WA atau QR dan langsung sampai di halaman tujuannya. Halaman bertoken tidak tampil di menu (D7).

## Alamat lama

Alamat lama tetap terbuka (D9). `/admin/masuk` dan layar masuk modul lain dialihkan ke `/masuk?ke=<asal>` (D10).
