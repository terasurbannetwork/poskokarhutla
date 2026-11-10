# RENCANA-UJI: Tangga Peringatan

## Uji yang berjalan sekarang

| Uji | Perintah | Membuktikan |
| --- | --- | --- |
| Self-check Python | `python3.11 scripts/prediksi/tangga.py uji` (atau `uv run --no-project --python 3.12 scripts/prediksi/tangga.py uji`) | Peringkat per sumber (ALGORITMA 3), pemilihan periode, aturan `menguat` dan `belum selaras` dengan contoh yang ditulis tangan, cakupan provinsi tidak diklaim kabupaten, sumber basi dilewati, sumber hilang tidak menggagalkan, arsip tidak menimpa. |
| Uji Node | `node --test tests/prediksi/*.test.mjs` | `tangga.py uji` lulus; bila `tangga.json` ada: 514 kabupaten, tiap item punya `s`, `c`, `x`, `a`; `sumber[s].lembaga`; tidak ada kata "aman" dan tidak ada "Pantau Bencana" di keluaran dan di layar; sinyal dihitung ulang dari `r` cocok dengan `m` dan `s`; JS inti (`tangga_inti.js`) menggabungkan nasional, provinsi, kabupaten dengan benar. |
| Pratinjau | browser 1440 dan 390 px | Tidak ada galat konsol; tab terbuka; pilih provinsi dan kabupaten mengubah tangga. |

## Uji balik (direncanakan, belum boleh diklaim)

Pertanyaan: ketika sinyal "menguat" menyala untuk kabupaten K pada hari t, seberapa sering kejadian terkait tercatat dalam 7 hari berikut dibandingkan hari tanpa sinyal.

1. Data: `tangga_arsip/*.jsonl` (sinyal harian) dan label kejadian dari DIBI (banjir, longsor, karhutla) dengan margin pengisian susulan 14 hari yang sama dengan `nilai.py`.
2. Baseline: frekuensi dasar kejadian per kabupaten per bulan (klimatologi) dan persistensi (kejadian pekan lalu), seperti rapor yang ada.
3. Ukuran: tingkat kejadian bersyarat pada hari bersinyal dibandingkan baseline, dengan selang kepercayaan blok per hari.
4. Syarat klaim: paling sedikit 90 hari arsip dan 30 hari bersinyal per ancaman; di bawah itu layar menulis "belum teruji". Tidak ada klaim ketepatan, tidak ada skor gabungan.
5. Hasil dicatat di berkas terpisah; tidak mengubah kriteria terkunci model lain.
