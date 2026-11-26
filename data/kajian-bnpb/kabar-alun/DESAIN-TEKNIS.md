# DESAIN-TEKNIS: Kabar Alun-alun

## Berkas

| Berkas | Pemilik | Isi |
| --- | --- | --- |
| `scripts/data/alun_kabar.py` (baru, stdlib Python 3.12) | pipa-data | baca `data.json`, pasang `kab_kode` dan titik, cocokkan berita, tulis `kabar.json`; argumen `--hari`, `--kini` (jam tetap untuk uji), `--cek` |
| `public/data/alun/kabar.json` (baru, keluaran) | pipa-data | skema di ALGORITMA 7 |
| `public/lapor/alun_kabar.js` (baru) | layar-peta | fungsi murni tanpa DOM: `gabung(kabar, barisAlun, sekarang)` (menempelkan klaster warga, menandai `usang`, menyaring `selesai_lama`) dan `teksKartu(kejadian, sekarang)` (semua teks kartu); diimpor uji Node dan `lapor.js` |
| `public/lapor/lapor.js`, `lapor.css`, `index.html` | layar-peta | muat berkas, gambar titik dan kartu dari keluaran dua fungsi di atas |
| `public/.assetsignore` dan `.gitignore` | mekanik-mesin | baris `data/alun/` dihapus sesudah K5 (KA-09) |
| `tests/alun-kabar/**` (baru) | penulis-gerbang | uji murni dan uji berkas keluaran |
| `data/laporan-bnpb/harian/<bulan>/<hari>/jalan.py` | pipa-data | satu baris memanggil `alun_kabar.py` (Q3); baris ini ikut tiap salinan `jalan.py` (README generator) |

Tidak ada folder baru di `scripts/` (sudah `scripts/data/`), satu folder data baru `public/data/alun/` yang tercakup paket ini, tidak ada rute Worker, tidak ada migrasi D1 (D11).

## Alur kode

- **Berita**: `alun_kabar.py` memakai ulang pembaca `dalops_kabar.muat_bahan(jenis, h, arsip_dir)` (`scripts/data/dalops_kabar.py` sekitar baris 247). Fungsi itu menggabung arsip berita lokal (`data/raw/dalops/berita_arsip/`, 60 hari) dengan unduhan `_unduh` dari `DASAR` (`CEK_KABAR_DASAR`, bawaan `https://centurisk97.id`), lalu `cocok()` dari berkas yang sama dipakai tanpa salinan (D7). Artikel mentah memakai `sumber` untuk nama media; `alun_kabar.py` memetakan `media = sumber`. Peta jenis ke berkas: `dalops_kabar.BERKAS`.
- **Wilayah**: kunci `"<kode prov>|<nama kab>"` dan titik tengah kab dari `Geo.pusat["kab"]` (`scripts/umum/berita.py`). `Geo.hitung_pusat()` adalah `staticmethod`, jadi cukup `Geo.hitung_pusat()`; tidak perlu membuat instance `Geo(PROVINSI)` (yang membangun indeks frasa berita yang tidak dipakai di sini).
- **Jalur `data.json`**: glob `data/laporan-bnpb/harian/<YYYY-MM>/<tanggal>/kerja-*/data.json` untuk tanggal H sampai H-8; `kerja-DDMMYY` bernama tanggal hari berikutnya, folder hari yang tidak ada dilewati (ALGORITMA 1.1).
- Keluaran ditulis atomik (berkas sementara lalu ganti nama).

## Sisi klien

`tampilAlun()` tetap memuat `GET /api/lapor/alun`. Tambahan: `fetch("/data/alun/kabar.json")` yang boleh gagal (404 atau tidak ada): gagal berarti tampilan lama tanpa kartu resmi. Semua penggabungan dan teks lewat `alun_kabar.js` (`gabung`, `teksKartu`); `lapor.js` hanya menggambar. Teks data lewat `textContent`.

## Saklar terbit dan pelacakan git (Q2)

`data.json` hari itu dan deck harian sudah dilacak di repo publik ini (RISET 2), jadi berkas turunan tidak boleh diperlakukan sebagai "internal". Sampai Q2 dijawab: `public/data/alun/` masuk `.gitignore` (tidak di-commit) dan `public/.assetsignore` (tidak terbit, sebagai lapis kedua). Server tinjau `http://localhost:8800/lapor/` menyajikan berkas dari folder kerja, jadi hanya pemilik di localhost yang melihatnya. Menerbitkan berarti menghapus kedua baris sesudah pemilik menjawab (KA-09); tidak ada saklar lain.

## Kinerja

Satu berkas statis kecil (puluhan kejadian, lima berita masing-masing). Pencocokan: sekali per jalan, O(kejadian x artikel di berkas jenis itu). Klien: satu `fetch` tambahan, penempelan O(klaster x kejadian) dengan indeks kunci kab.

## Pengerja dan pemeriksa

pipa-data (pipeline), layar-peta (layar), penulis-gerbang (uji). Pemeriksa: `inp-reviewer` dan `selera-angka` untuk layar, `security-reviewer` untuk berkas. Tidak ada agent baru (D15).
