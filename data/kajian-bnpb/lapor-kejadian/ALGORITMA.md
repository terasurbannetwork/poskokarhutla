# ALGORITMA: Kejadian dari Laporan Warga

Semua ambang baru adalah HIPOTESIS (tanpa sumber, menunggu data F0), ditandai dan bisa diubah satu konstanta.
Semuanya fungsi murni tanpa D1 supaya bisa diuji tanpa basis data.

## A1. Aturan satu desa (K85, D2, D3)

Tambahan atas A9 (`lapor-ai/ALGORITMA.md:95-117`, `src/lapor_gugus.js`). Tidak ada ambang lama yang dihapus.

Konstanta baru (HIPOTESIS, Q1, Q2, Q3):

| Konstanta | Bawaan | Arti |
| --- | --- | --- |
| `JENDELA_DESA_JAM` | 24 | selisih waktu kejadian terbesar antara dua laporan satu desa yang masih disambung |
| `RANTAI_MAKS_JAM` | 72 | jarak waktu kejadian pertama sampai terakhir dalam satu kejadian laporan |
| jenis ikut | banjir, longsor, kebakaran_gedung, cuaca, karhutla | jenis mode lokal; mode luas dan jenis tanpa aturan tidak berubah |

Dua laporan a dan b disambung bila jenis induk sama dan SALAH SATU benar:

1. Aturan lama: selisih waktu paling lama jendela jenis (6 atau 12 jam) dan jarak haversine paling jauh radius jenis; atau mode luas dan kab sama (`src/lapor_gugus.js:22-26`).
2. Aturan satu desa (baru): kode desa sama dan tidak kosong pada keduanya, dan selisih waktu paling lama `JENDELA_DESA_JAM`.

Catatan perilaku sekarang: kode sudah menyambung dua laporan satu desa di dalam jendela jenis (`:26`). Aturan baru hanya memperluas jendela untuk kasus desa sama dari 6 atau 12 jam menjadi 24 jam. Laporan beda desa tetap hanya disambung oleh aturan radius.

Setelah penyambungan (union-find seperti kode sekarang):

3. Rantai: bila `akhir - mulai` komponen melebihi `RANTAI_MAKS_JAM`, komponen dipotong di celah waktu terbesar; potongan berikut menjadi kejadian laporan sendiri (Q2).
4. Pendirian: komponen menjadi gugus bila berisi paling sedikit 2 nomor pelapor berbeda (D27 tidak berubah). Satu nomor yang melapor berulang di desa yang sama tidak mendirikan gugus dan dihitung satu.
5. `n_pelapor` = nomor berbeda; `n_laporan` = laporan. Tampil "N pelapor" bila `n_pelapor` paling sedikit 2.
6. Label `gugus` atau `gugus kuat` tidak berubah (A9 langkah 6). Kata "terverifikasi" tidak dipakai pada label gugus; verifikasi hanya dari D4.
7. Laporan `tidak_valid` dikeluarkan sebelum penyambungan (kode sekarang `:20`).
8. Kejadian laporan tunggal (laporan terverifikasi yang bukan anggota gugus) tetap kejadian laporan beranggota satu dengan kode laporan; halaman publik tidak menulis jumlah pelapor untuk satu pelapor.

Penomoran `GL-DDMMYY-NN` dan penggabungan ke gugus tertua tidak berubah (A9, D30). Gugus yang terpotong rantai (butir 3) mendapat nomor baru; nomor lama tetap.

Dampak: tetap tidak dijumlah; tampil rentang terkecil sampai terbesar antarlaporan anggota (D28).

Uji emas wajib: semua keluaran `hitungGugus` lama untuk masukan yang tidak melibatkan desa sama di luar jendela lama TIDAK berubah (kasus uji LK-01).

## A2. Kejadian laporan untuk tampilan

Kejadian laporan K untuk halaman publik dan usulan = gugus bila laporan anggota gugus, atau laporan tunggal. Tiga keluarga kode tidak dicampur: `GL-` (gugus), `KJ-ddmmyy-NN` (K66, kejadian yang dikonfirmasi pelapor, Q14), dan `KJ-` Buku Besar. Kejadian K66 menyatukan laporan lewat konfirmasi pelapor; bila laporan tersambung oleh K66 tetapi tidak oleh A1, kedua pengelompokan tetap berdiri sendiri dan halaman publik memakai A1 saja (K66 untuk meja).

## A3. Terverifikasi BPBD (D4)

Fungsi `terverifikasiBpbd(laporan, pemeriksaTerakhir, versi, tarikan)` benar bila lima syarat ini semua benar:

1. Pengecekan terakhir (urut `waktu` menurun pada `lapor_periksa`, `id` menurun bila waktu sama) berhasil `valid`. `sebagian` dan `tidak_valid` salah (Q4).
2. Pemeriksa adalah akun lembaga BPBD (`pemkab`, `pemkot`, `pemprov`, `src/hak.js` hak wilayah D94, D95) yang wilayahnya mencakup kode wilayah laporan, dibaca dari kode wilayah laporan, bukan dari isian pelapor. Pemeriksa staf BNPB atau admin salah untuk halaman publik (Q4). Peran BPBD yang hanya mengaku (`bpbd_klaim`, D19) tidak pernah cukup.
3. Status tiket bukan `tidak_valid`.
4. Tidak ada versi laporan (`lapor_versi`) dengan waktu lebih baru dari pengecekan terakhir.
5. Tidak ada tarikan aktif di `lk_tarik` untuk kejadian laporan itu.

Kejadian laporan terverifikasi bila paling sedikit satu laporan anggotanya terverifikasi. Hanya laporan anggota yang terverifikasi memberi angka dan jumlah pelapor di halaman publik (butir A5 di bawah); laporan anggota lain yang belum terverifikasi tidak ikut tampil dan tidak ikut dihitung.

Waktu verifikasi kejadian laporan = waktu pengecekan Valid terbaru di antara anggota terverifikasi.

## A4. Daftar "hari ini" (Q9)

Himpunan = kejadian laporan terverifikasi (A3) dengan waktu verifikasi dalam 24 jam terakhir (bawaan, HIPOTESIS). Urut waktu verifikasi menurun. Paling banyak 100 kartu seperti Alun-alun (`src/lapor_ai.js:933`). Sumber baca: satu kueri berindeks waktu atas pengecekan Valid 24 jam lalu, digabung laporan terkirim 30 hari untuk gugus (pola `lpGugusBaris`).

## A5. Isi kartu publik

Per kejadian laporan: jenis, subjenis (bila ada dan bukan "Belum diketahui"), waktu (dibulatkan ke jam bila satu pelapor, Q19), lokasi desa, kecamatan, kab/kota, provinsi, titik pusat desa 4 desimal, jumlah pelapor terverifikasi bila 2 atau lebih (D3), lencana "Diverifikasi BPBD <kab/kota>" beserta jam verifikasi, dan angka dampak per isian sebagai rentang terkecil sampai terbesar antarlaporan terverifikasi dengan label "menurut laporan warga yang diverifikasi BPBD" (Q6). Tidak ada total antar kartu. Tidak ada jumlah pelapor yang dijumlah antar kartu (seorang pelapor bisa ada di dua kartu).

Angka dari sumber berbeda tidak pernah dijumlah dan tidak tampil berdampingan sebagai setara: halaman ini hanya satu sumber (laporan warga terverifikasi BPBD) dan tidak memuat DIBI, logbook, BMKG, titik panas, atau Buku Besar (Q15).

## A6. Usulan ke Buku Besar (K87, D9, D10)

Rekaman yang dikirim ke pencocok: `{sumber: "lapor_ai", kode: <kode usulan>, jenis: <tuple kunci pasang>, kab: [kab4 pusat], tgl: <tanggal WIB mulai>, dampak: kosong, usulan_staf: true}`.

- Kode usulan: `LU-` diikuti tanggal WIB `ddmmyy` dan nomor urut harian, unik; satu kode per kejadian laporan aktif. Bukan nomor kejadian resmi.
- `kab`: kab4 dari kode desa pusat kejadian laporan (kab tunggal; bila anggota lintas kab, usulan ditolak dengan pesan dan staf memisah dulu).
- `jenis`: pemetaan `JENIS_REGISTRI` (`src/lapor_periksa.js:14`) ke jenis kunci pasang `pasang.py`; jenis tanpa peta ditolak.
- Perubahan `pasang.py` (pemilik `siklus`): `lapor_ai` di akhir `PRIORITAS_MASUK` dan `SUMBER_MODUL` (belum ada, `:17`, `:345`). Cabang `elif not cand`: bila `usulan_staf` benar maka `aksi="baru"` (nama kejadian dari pola yang ada, `:296`), bila tidak, `aksi="tanpa_pasangan"` (D29 tetap untuk rekaman otomatis). Cabang lebih dari satu kandidat dan tanpa wilayah tidak berubah.
- Kolom dampak tidak dipetakan di `KOLOM`; angka warga tidak masuk Buku Besar.
- Uji di blok uji `pasang.py`: usulan tanpa kandidat mendirikan; rekaman otomatis tanpa `usulan_staf` tidak mendirikan; usulan dengan dua kandidat menjadi `ambigu`.

Pencocok tidak mengubah fase kejadian yang sudah ada. Fase kejadian baru `terdeteksi`; kejadian itu mulai dengan satu entri sumber `lapor_ai`. Tanda `siap_verifikasi` (butir F1.8 `pasang.py`) butuh dua nama sumber berbeda; sumber `lapor_ai` saja tidak memenuhinya.

## A7. Status usulan

Status usulan = gabungan baris `lk_usulan` dan baris `sk_kejadian_sumber` (sumber `lapor_ai`, kode usulan): tidak ada baris sumber maka "Diusulkan"; `terpasang` maka "Terpasang" dengan `kejadian_id` dan jenis aksi (menempel atau didirikan); `ambigu` atau `tanpa_wilayah` maka "Menunggu staf Siklus"; `ditolak` maka "Ditolak staf Siklus". Tidak ada status yang ditulis Worker selain baris `lk_usulan`.

## A8. Penarikan

`lk_tarik` append-only (nomor kejadian laporan, pelaku, alasan opsional, waktu, `aktif`). Kejadian laporan ditarik bila baris terakhir untuk kodenya `aktif=1`. Mencabut tarikan menulis baris baru `aktif=0` (tidak menghapus). Penarikan tidak mengubah status tiket, hasil pengecekan, atau usulan yang sudah jalan.
