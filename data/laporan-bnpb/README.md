# data/laporan-bnpb

Semua laporan dan paparan BNPB yang dibangun di repo ini. Dirapikan 13 Nov 2026 (sebelumnya 70 folder di satu tingkat).
Taruh berkas baru di folder jenisnya; jangan menambah folder lepas di akar.

| Folder | Isi | Susunan |
| --- | --- | --- |
| `generator/` | mesin Laporan Kejadian Bencana Harian dan Laporan Penanganan Pengendalian Karhutla (dipakai bot WA dan sesi) | tetap |
| `harian/` | Laporan Kejadian Bencana Harian: `jalan.py`, teks WA (`wa-koordalops.txt`, `wa-bmkg.txt`, `wa-pvmbg.txt`), `kerja-DDMMYY/`, PPTX/PDF, `Revisi N/` | `harian/YYYY-MM/YYYY-MM-DD/` |
| `penanganan-karhutla/` | Laporan Penanganan Pengendalian Karhutla (dulu `satelit-*`): `jalan.py`, `bingkai.py`, `wa-satgas.txt`, salinan situs `web/`, PPTX/PDF | `penanganan-karhutla/YYYY-MM/YYYY-MM-DD/` |
| `mingguan/` | paparan situasi sepekan per bencana (banjir dan longsor, karhutla, cuaca ekstrem, kekeringan) | `mingguan/<tanggal paparan>/<bencana>/` |
| `bulanan/` | laporan bulanan | `bulanan/YYYY-MM/` |
| `insidental/` | laporan insidental per kejadian (gempa dan tsunami, erupsi gunung api); saat ini simulasi berdata contoh | `insidental/<kejadian>/` |
| `paparan/` | paparan sekali jadi: wilayah (Jambi, Lampung, Papua Selatan), rakor HGU, situasi banjir 8 Nov, armada, LogPal, bukti konsesi, narasi publik | `paparan/<topik>-<tanggal>/` |
| `kajian/` | kajian dan metode (tinggi banjir, metode lokasi) | `kajian/<topik>-<tanggal>/` |
| `kampus/` | ajuan program kampus dan PT swasta, MoU kampus | `kampus/<topik>-<tanggal>/` |
| `omc/` | operasi modifikasi cuaca: kegiatan, riset, `rekap/` | |
| `arsip/` | isian JSON lama (Okt 2026) dan kiriman skill PPT | |

## Aturan jalur untuk kode

- Folder hari selalu lewat `generator/jalur.py`: `jalur.harian(tanggal)`, `jalur.penanganan(tanggal)`,
  `jalur.berkas_hari('harian', 'wa-koordalops.txt')`. Jangan menyusun `harian-<tanggal>` sendiri.
- Glob di luar Python: `data/laporan-bnpb/harian/*/*/wa-koordalops.txt` (nama folder terdalam = tanggal `YYYY-MM-DD`).
- Workflow `laporan-harian.yml` memakai `harian/${TANGGAL:0:7}/${TANGGAL}`.
- Keluaran laporan harian dan penanganan per revisi masuk `Revisi N/` di dalam folder hari (aturan pemilik 9 Nov 2026).
