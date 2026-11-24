# DESIGN-SYSTEM: Pemetaan bekas longsor dari satelit

Tidak ada token atau komponen baru. Mengikuti `public/inti/tema.css`, kartu standar `.ex.ex-std` (AGENTS 3.5, pembaruan 11 Nov 2026: kepala kartu = nama seksi berikon, tanpa kalimat kesimpulan), dan design system `/siklus` (`data/kajian-bnpb/siklus/DESIGN-SYSTEM.md`).

## Komponen yang dipakai

| Bagian | Komponen | Catatan |
| --- | --- | --- |
| Status uji | pil status inti (menunggu abu, gagal merah, lulus hijau) | pil selalu tampil, juga saat ada angka |
| Peta | lapisan poligon pada peta Siklus | bekas longsor oranye merek `--brand-accent`; tumpang tindih tebangan diarsir abu, bukan merah |
| Tabel kecamatan | `.ex-tabel` kepala navy | kolom: kecamatan, ha bekas, ha tumpang tindih tebangan, bagian terliput; kosong = "menunggu" |
| Bukti citra | sepasang gambar sebelum dan sesudah dengan tanggal | tanggal citra wajib terbaca |

## Larangan

- Tidak menulis "aman" untuk kecamatan tanpa bekas longsor; yang tidak terliput tampil abu "tidak terliput".
- Tidak ada warna merah untuk tebangan (D8).
- Tidak ada kalimat temuan di kepala kartu.

Tinjau di `http://localhost:8800/siklus` sesudah LS-07.
