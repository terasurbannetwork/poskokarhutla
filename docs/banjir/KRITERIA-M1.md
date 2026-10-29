# Kriteria uji M1: model tangki genangan per kecamatan DKI, uji prospektif musim 2026/27

Dikunci 28 Oktober 2026 sebelum model M1 dibangun dan sebelum satu hari pun musim uji terjadi,
atas keputusan pemilik ("Lanjut M1: kunci kriteria baru dengan uji prospektif musim 2026/27,
hujan berjam WIB, label dinormalkan per tahun", 28 Okt 2026). Belajar dari M0 (`KRITERIA-M0.md`,
vonis GAGAL, `RISET-MODEL-GENANGAN.md` §9). Berkas ini tidak boleh diubah sesudah dikunci.
Skrip M1 menulis sha256 berkas ini ke keluarannya; hash berbeda = hasil uji tidak sah.

## Uji prospektif
- Jendela uji: dari tanggal model M1 dibekukan (sidik sha256 kode + parameter + berkas ini ditulis
  ke git, append-only) sampai 30 April 2027, hanya hari November sampai April.
- Prakiraan ditulis SEBELUM hari yang diprakirakan (paling lambat 00.00 WIB hari itu, memakai
  hujan prakiraan) dan sesudahnya dengan hujan teramati (nowcast, paling lambat 23.59 WIB);
  keduanya dicatat append-only. Yang dinilai untuk lulus: versi hujan teramati. Versi prakiraan
  dilaporkan terpisah.
- Prakiraan yang ditulis sesudah label hari itu diketahui tidak dihitung.

## Unit dan label
- Unit: kecamatan DKI Jakarta daratan (42) x hari WIB.
- Hujan: GSMaP per jam (near real-time, JAXA) dijumlahkan ke jam WIB 00.00-23.59; tanpa
  pergeseran hari UTC. Hari dengan lebih dari 3 jam GSMaP hilang dikeluarkan dan dicatat.
- Label dinormalkan per musim: positif bila (a) ada laporan PetaBencana berkedalaman >= 10 cm
  di kecamatan itu pada hari itu, ATAU (b) jumlah laporannya >= `n_musim`, dengan `n_musim`
  bilangan bulat terkecil yang membuat proporsi kecamatan-hari positif musim itu tidak melebihi
  median proporsi musim 2017/18 sampai 2022/23 menurut aturan (b) dengan n = 3.
  `n_musim` musim uji dihitung sekali pada akhir jendela uji dan dicatat.
- Label pendamping (dilaporkan, tidak menentukan lulus): pos tinggi air DSDA berstatus Siaga 3
  atau lebih tinggi di kecamatan itu pada hari itu.

## Pembanding wajib (dihitung prospektif pada unit yang sama)
- (a) klimatologi bulanan per kecamatan, dibangun dari 2017-2025;
- (b) M0 beku (`public/banjir/data/kecamatan_pemicu.json`, sidik 8ad29b9c...);
- (c) aturan status banjir yang berlaku di situs pada hari itu, sebagaimana tercatat di arsip
  prospektif yang sudah ada.

## Lulus bila, pada jendela uji
0. Paling sedikit 40 kecamatan-hari positif. Kurang dari itu: vonis "belum cukup data", bukan lulus.
1. POD >= 0,50;
2. FAR <= 0,60;
3. batas bawah selang kepercayaan 95% bootstrap blok berpasangan (blok kecamatan x minggu,
   1.000 ulangan) dari selisih ETS (M1 dikurangi pembanding terbaik di antara a-c) > 0.

Gagal satu saja, atau "belum cukup data": keluaran tetap terbit dengan pil "Hipotesis, belum
lolos uji" dan rentang. Kedalaman genangan dan lama surut dari M1 SELALU berlabel hipotesis
sampai ada label kedalaman dan surut terukur; tidak ada kriteria lulus untuk keduanya di sini.

## Larangan
- Data musim 2024/25 dan 2025 (sudah dibuka pada uji M0) tidak boleh dipakai memilih
  parameter M1; kalibrasi memakai 2017-2023 saja.
- Tidak ada penyetelan apa pun sesudah pembekuan. Versi baru = sidik baru = jendela uji baru.
