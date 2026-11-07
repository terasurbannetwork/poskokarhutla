# Laporan provinsi prediksi banjir (gaya FFGS BMKG) di `/prediksi`

Dirancang 4 Nov 2026 bersama pemilik. Acuan bentuk: laporan FFGS BMKG (`ffgs.bmkg.go.id/report`), yaitu satu laporan per provinsi berisi panel peta lengas tanah, hujan teramati, prakiraan hujan, hujan pemicu banjir, hujan lewat ambang, dan risiko banjir, plus unduh PDF.

## Keputusan pemilik

| Pertanyaan | Keputusan |
| --- | --- |
| Pembaca | Staf BNPB/BPBD yang login. Bukan untuk publik, sama seperti FFGS ("Not for Dissemination to the Public"). |
| Jadwal | Harian, sekali pagi, ikut `prediksi.yml` 08.50 WIB. Tidak ada workflow atau cron baru. |
| PDF | Cetak dari peramban (`window.print()` + gaya cetak A4). Tanpa pustaka baru. |
| Pendekatan | Tab baru di `/prediksi`, memakai ulang login, daftar kab, dan `prediksi.json`. |
| Panel | Enam panel di bawah, tanpa panel IFFT terpisah. |
| Ambang | Kab di luar 40 kab sampel `ambang_persentil` memakai ambang nasional, bertanda "nasional". |

## Panel

Satu laporan = satu provinsi x satu tanggal terbit. Tiap panel = peta kab provinsi itu.

| # | Panel | Padanan FFGS | Sumber | Pil status |
| --- | --- | --- | --- | --- |
| 1 | Hujan teramati kemarin (mm) | MAP | `public/prediksi/data/amatan/HJN.json`, hari terakhir, kolom pertama; status `sementara`/`final` ikut tampil | sementara / final |
| 2 | Lengas tanah (fraksi volume 3 sampai 27 cm) | ASM | `public/prediksi/data/lengas.json` (baru, lihat Data) | sumber Open-Meteo |
| 3 | Prakiraan hujan besok (mm, p50 dan peluang 50 mm atau lebih) | FMAP | `prediksi.json` `HJN` tenggang 1, kolom `tot` dan `p50` | vonis rapor dari `kode.HJN.vonis` |
| 4 | Ambang hujan pemicu banjir (mm/hari) | FFG | `public/banjir/data/ambang_persentil.json` `ambang_mm[<prov>|<kab>].waspada`; bila tidak ada, `nasional_mm.waspada` | **hipotesis** |
| 5 | Prakiraan hujan lewat ambang (mm) | FFFT | panel 3 `tot` dikurangi panel 4; nilai 0 atau kurang = tidak lewat | **hipotesis** |
| 6 | Peluang banjir +1, +2, +3 hari | FFR+12/+24 | `prediksi.json` `BNJ` (level, peluang) per tenggang; pemilih kecil +1/+2/+3 di kartu | vonis rapor dari `kode.BNJ.vonis` |

FAR uji 2024-2025 ambang Waspada (`uji_2024_2025.persentil.waspada.far`, saat ini 0,973) tertulis di `title` kepala kartu panel 4 dan 5. Ambang baru boleh kehilangan pil hipotesis bila `ambang_persentil.json` `pakai` berubah `true`; halaman membaca `pakai`, tidak memakai angka tetap.

## Tampilan

- **Letak:** tab keempat `Laporan provinsi` di `public/prediksi/index.html`, sesudah Besok, Rapor, Dampak. `pilihTab()` di `prediksi.js` menangani `laporan` seperti tab lain. Login ikut aturan `/prediksi` yang ada di `src/worker.js`; tidak ada rute baru.
- **Kendali:** satu deretan pemilih selebar wadah: Provinsi (38, nama dari `pn` di `prediksi.json`), Tanggal terbit (hari ini; arsip hanya bila berkasnya ada), tombol ikon Unduh PDF tanpa garis luar. Keadaan di URL: `#laporan/<kode prov>`.
- **Kepala:** judul kalimat temuan dengan angka `.hl`, misalnya "**4 dari 23** kab Aceh berpeluang banjir Waspada atau lebih besok". Di bawahnya kotak keterangan berisi `prediksi.json` `batasan`.
- **Panel:** enam kartu `.ex.ex-std` (`public/inti/kartu.css`) dalam kisi 3 x 2; satu kolom di layar sempit. Isi kartu: pil kategori `.ex-ey`, judul, peta SVG, legenda kelas. Tanpa kaki sumber; sumber dan definisi di `title`.
- **Peta:** SVG dari `public/geo/kabupaten/<prov>.json`, proyeksi ekuirektangular dengan koreksi cos(lintang tengah). Pencocokan nama: `Kab. X` jadi `X`, `Kota X` tetap `Kota X`. Kab tanpa nilai berwarna abu-abu. Hover atau sentuh kab memunculkan tip berisi nama dan angka (`/inti/tip.js`).
- **Tabel:** kab dengan level `BNJ` Waspada atau lebih pada tenggang mana pun. Kolom: kab, hujan kemarin, lengas, prakiraan besok, ambang, lebihan, peluang +1, +2, +3. Kepala tabel rata tengah.
- **Cetak:** `@media print`: A4 lanskap, kepala halaman berisi provinsi dan tanggal terbit, dua baris panel per halaman, tabel di halaman berikut, pemilih dan tab disembunyikan.
- Format angka Indonesia (`/inti/format.js`): koma desimal, titik ribuan; hujan tanpa desimal, lengas dua desimal.

## Data

- **Baru:** `scripts/prediksi/terbit.py` menulis `public/prediksi/data/lengas.json` = `{"dibuat", "hari", "sumber", "kab": {"<id>": <sm>}}`. `sm` adalah kolom `sm` `HJN` tenggang 1 dari entri arsip terakhir (sudah dihitung `catat.py` dari Open-Meteo `soil_moisture_3_to_9cm` dan `soil_moisture_9_to_27cm`). Kab tanpa nilai tidak ditulis.
- **Tidak berubah:** `prediksi.json`, `amatan/HJN.json`, `ambang_persentil.json`, berkas geo.
- **Ukuran:** satu provinsi memuat paling banyak `prediksi.json` (170 KB, sudah dimuat tab lain), `amatan/HJN.json` (66 KB), `ambang_persentil.json` (15 KB), `lengas.json` (sekitar 10 KB), satu berkas geo (13 sampai 290 KB). Semua dimuat saat tab Laporan pertama dibuka, bukan saat halaman dibuka.

## Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `public/prediksi/laporan_prov.js` | fungsi murni (cocok nama, kelas warna, lebihan, kalimat judul, baris tabel) + gambar tab | `prediksi` |
| `public/prediksi/index.html` | tab dan section `p-laporan`, muat skrip | `prediksi` |
| `public/prediksi/prediksi.js` | `pilihTab` mengenal `laporan` | `prediksi` |
| `public/prediksi/prediksi.css` | kisi panel, gaya cetak | `prediksi` |
| `scripts/prediksi/terbit.py` | tulis `lengas.json` + self-check | `prediksi` |
| `tests/prediksi/laporan_prov.test.mjs` | uji fungsi murni + cakupan poligon | `prediksi` |
| `tests/agen/gerbang-kartu-std.test.mjs` | tambah layar ke `LAYAR` | `penulis-gerbang` |

## Uji (bukti siap)

1. `node --test tests/prediksi/` hijau, termasuk:
   - tiap kab di `prediksi.json` `kab` ketemu poligon di `geo/kabupaten/<prov>.json`; yang gagal disebut namanya di pesan gagal;
   - lebihan = prakiraan dikurangi ambang, dan kab tanpa ambang sampel memakai nasional dengan tanda `nasional`;
   - kab tanpa data menghasilkan kelas "tanpa data", bukan 0.
2. `python3 scripts/prediksi/terbit.py` self-check: `lengas.json` ada, minimal 90% kab terisi, semua nilai 0 sampai 1. Gagal menyebut jumlah dan kab yang menyimpang.
3. `npm run uji:agen` hijau dengan layar baru di `LAYAR`.
4. Pemeriksa konteks bersih: `selera-angka` (angka, satuan, pil hipotesis), `inp-reviewer` (pemilih provinsi, hover peta).
5. Bukti di peramban: tab Laporan provinsi untuk Aceh dan DKI Jakarta tampil tanpa galat konsol, dan pratinjau cetak A4 lanskap rapi.

## Di luar lingkup

- Laporan per 6 jam dan hujan teramati per jam GSMaP (butuh akun JAXA; `nowcast_bandang.py` masih draf).
- Satuan sub-DAS seperti FFGS (HydroBASINS baru ada untuk Jawa).
- Pilihan nasional dan laporan per kab.
- PDF buatan pipeline atau kiriman WA.
- Mengubah ambang atau model; halaman hanya menampilkan apa yang ada beserta statusnya.
