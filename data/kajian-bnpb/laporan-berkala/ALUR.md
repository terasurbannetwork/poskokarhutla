# ALUR: Laporan Berkala

## 1. Alur mesin (tanpa manusia)

| Kapan | Langkah | Keluaran |
| --- | --- | --- |
| Tiap hari, 03.10 UTC (10.10 WIB) | `berkala.yml` menjalankan `rakit.py --potong`: menyimpan potongan hari kemarin (karhutla per provinsi, status surut dalops banjir, status gunung api) | R2 `berkala/potong/<YYYY-MM-DD>.json` |
| Tiap hari, sesudah potongan | `rakit.py --periode harian --kode <kemarin>` (Q26) | R2 `berkala/harian/<YYYY-MM-DD>/angka/<tanggal tarik>.json` dan `.../angka/terbaru.json` |
| Senin sampai Rabu, sesudah potongan | `rakit.py --periode mingguan --kode <minggu ISO lalu>` (Q24) | R2 `berkala/mingguan/<YYYY-Www>/angka/...` |
| Tanggal 1 sampai 20, sesudah potongan | `rakit.py --periode bulanan --kode <bulan lalu>` | R2 `berkala/bulanan/<YYYY-MM>/angka/...` |
| 1 sampai 31 Januari, sesudah potongan | `rakit.py --periode tahunan --kode <tahun lalu>` (D13) | R2 `berkala/tahunan/<YYYY>/angka/...` |
| Tiap hari | `kegiatan.py` panen siaran pers (Q16) untuk minggu, bulan, dan tahun berjalan | `berkala/<periode>/<kode>/kegiatan_calon.json` |
| Di luar jendela di atas | hanya potongan harian; berkas angka periode mana pun bisa dirakit ulang lewat `workflow_dispatch` (input `periode`, `kode`) | |

Urutan dalam satu job: potongan dulu, lalu harian, mingguan, bulanan, tahunan. Satu periode yang gagal tidak menghentikan periode berikutnya.

Potongan harian ada karena `dalops/banjir.json` hanya menyimpan 30 hari dan `peta_karhutla.json` hanya tahun berjalan. Periode pertama sebelum potongan berjalan penuh (bulan pertama, tahun pertama) memakai berkas yang ada saat rakit, dan catatan metode menyebutnya.

Bila satu sumber gagal dibaca, berkas angka tetap ditulis dengan sumber itu bertanda `gagal` dan bagian yang memakainya tampil "data belum tersedia"; berkas angka hari sebelumnya tidak dihapus.

## 2. Alur staf

```
/laporan_bnpb  ->  pilih jenis "Laporan Berkala"  ->  pilih periode (Harian, Mingguan, Bulanan, Tahunan)  ->  pilih kode (tanggal, minggu, bulan, tahun)
   |
   |-- periode belum pernah dibuka: draf baru (v0) memakai angka terbaru
   |-- periode punya draf: buka draf; bila angka terbaru lebih baru dari angka draf, tampil pita "Angka baru tersedia (tarik 9 Nov)". Tombol "Pakai angka baru" mengganti angka draf; isian staf tidak tersentuh
   |-- periode sudah beku: buka versi beku terakhir, baca saja; tombol "Buat versi baru" menyalin ke draf
   |
   v
isi kolom staf per bab (kiri) | pratinjau A4 halaman demi halaman (kanan)
   |
   v
pilih temuan utama dari usulan, pilih kegiatan dan foto (yang berlaku untuk periodenya, PRD tabel empat periode)
   |
   v
Bekukan  ->  periksa kelengkapan (ALGORITMA 10, di layar lalu diulang di server)  ->  konfirmasi "Bekukan Laporan Bulanan Oktober 2026 sebagai v1?" (nama periode dan kode selalu disebut)
   |
   v
versi beku vN tersimpan  ->  Cetak PDF A4 (dialog cetak peramban; draf tercetak bertanda air)
```

## 3. Status draf dan versi

| Status | Arti | Bisa diubah | Siapa |
| --- | --- | --- | --- |
| belum ada | periode dan kode itu belum pernah dibuka | | |
| draf (`v0`) | satu per periode dan kode, ditimpa tiap Simpan | ya | penyusun |
| beku (`v1`, `v2`, ...) | salinan tetap angka dan isian | tidak pernah | dibuat penyusun lewat Bekukan |

Pita status selalu menyebut periode, kode, dan versi, contoh "Laporan Mingguan 2026-W46, beku v2". Versi baru selalu lahir dari draf. Membuka versi beku lalu "Buat versi baru" menyalin isian dan angka versi itu ke draf, lalu staf boleh menarik angka baru.

## 4. Alur beda versi (F-8)

Bila berkas angka terbaru berbeda dari angka versi beku terakhir, layar versi beku menampilkan daftar "Angka yang berubah sejak dibekukan": nama angka, nilai beku, nilai sekarang, tanggal tarik keduanya. Versi beku tidak berubah. Staf memutuskan perlu versi baru atau tidak.

## 5. Kegagalan dan pemulihan

| Kejadian | Yang terjadi |
| --- | --- |
| Rakit gagal sehari | layar memakai berkas angka terakhir dan menulis tanggal tariknya |
| DIBI gagal sepanjang jendela rakit periode itu | tombol Bekukan ditahan dengan alasan "DIBI belum pernah ditarik untuk periode ini" |
| Tangga Peringatan belum terbit (mingguan) | bagian prakiraan sepekan tampil "belum tersedia" (ALGORITMA 12) |
| Status surut tidak ada (dalops belum diunggah pemilik) | kolom kondisi semua kab "belum dilaporkan", catatan metode menyebut sebabnya |
| Dua staf menyimpan draf bersamaan | simpan memakai `diubah` lama sebagai kunci; yang kedua ditolak 409 dan diminta muat ulang (pola `/api/laporan-bnpb`); draf tidak ditahan di localStorage, jadi staf diingatkan sebelum meninggalkan halaman dengan perubahan belum disimpan |
| Bekukan ditekan dua kali | satu versi saja (nomor versi dihitung di server dalam satu `batch`, kunci unik `(periode, kode, versi)`, yang kedua 409) |
| Berkas angka versi beku di R2 berubah | sidik sha256 tidak cocok, layar menampilkan galat, tidak menampilkan angka yang berubah |
