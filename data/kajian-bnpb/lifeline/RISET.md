# RISET: Status Lifeline

## 1. Benchmark

| Sistem | Yang ditiru | Pelajaran |
| --- | --- | --- |
| FEMA Community Lifelines | Tujuh sampai delapan layanan dasar per wilayah terdampak; tiap layanan diberi warna dan pernyataan dampak bertanggal; satu dashboard untuk pimpinan. | Bahasa sederhana, satu warna per sel, linimasa pulih. Versi 2.1 (2023) mengalihkan arti warna ke dampak pada warga, bukan kemajuan target. |
| DHS S&T Community Lifeline Status System (CLSS) | Pelaporan lifeline berbasis bukti. | Dibangun karena negara bagian bisa memilih status tanpa indikator atau bukti: bukti wajib menempel. |
| NASA Black Marble | Lampu malam harian untuk pemadaman listrik dan pemulihan (Puerto Rico pasca-Maria, Ida, Uri). | Menangkap genset yang tidak dipantau PLN; lemah saat awan dan kondisi ekstrem. |

Sumber: fema.gov/lifelines, dhs.gov fakta CLSS (2023), disasters.nasa.gov Black Marble, Román dkk. 2019.

## 2. Isyarat yang sudah ada di repo (diukur 15 Nov 2026)

| Layanan | Isyarat | Berkas | Satuan |
| --- | --- | --- | --- |
| Listrik | Lapor Warga listrik padam/genset/hidup, durasi padam | `public/informasi_jenis.js:31`, `public/informasi.js:228` | titik + nama kab di `laporan_wilayah`, ringkas per kab di `informasi.js:349` |
| Listrik | Logbook kendala `listrik`, WA BPBD "Kendala:" | `src/logbook.js:16`, `scripts/wa/urai_laporan.py:24` | nama kab |
| Listrik | Meja dampak `listrik_unit` rusak | `src/meja_spek.js:69` | nama kab |
| Listrik | Lampu malam per kecamatan (BELUM LAYAK) | `scripts/umum/lampu_malam.py` | kecamatan |
| Sinyal | Lapor Warga sinyal tidak_ada/lemah/lancar | `public/informasi_jenis.js:33` | titik |
| Sinyal | Logbook kendala `sinyal`; meja dampak `telekom_unit` | `src/logbook.js:16`, `src/meja_spek.js:69` | nama kab |
| Sinyal | IODA padam internet | `scripts/umum/internet_padam.py` | provinsi saja |
| Air bersih | Meja pengungsi keb_air; meja dampak `air_unit`; logbook kebutuhan air_bersih | `src/meja_spek.js:41,69`, `src/logbook.js:17` | titik, kab |
| Jalan dan akses | Lapor Warga akses (putus, tertimbun, tergenang); logbook kendala akses; meja dampak jalan_km, jembatan | `public/informasi_jenis.js:112`, `src/meja_spek.js:90` | titik, kab |
| BBM | Lapor Warga bbm dan elpiji tersedia/terbatas/habis; meja dampak `spbu_unit` | `public/informasi_jenis.js:35` | titik, kab |
| Faskes | Lapor Warga faskes_penuh; meja dampak layanan faskes rusak; kaji cepat | `public/informasi_jenis.js:50`, `src/meja_spek.js:70,122` | titik, kab |
| Pangan | Meja pengungsi keb_pangan; logistik diminta/dikirim/diterima | `src/meja_spek.js:41,139` | titik, kab |
| Pengungsian | Titik pengungsian TP- + rekap putaran | `src/pengungsian_titik.js` | titik |

Yang tidak ada: kategori sektor di Cek Kabar (`scripts/data/dalops_kabar.py` hanya masih/mungkin selesai), dampak dan kondisi di laporan WA Koordalops (`src/dalops_laporan.js` membuangnya), bab lifeline di Laporan Berkala.
