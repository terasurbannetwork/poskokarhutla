# DESIGN-SYSTEM: Kaji ulang pasca-kejadian

Mengikuti kartu standar AGENTS.md 3.5: kepala kartu nama seksi berikon (tanpa kalimat temuan, tanpa kesimpulan), tanpa kaki sumber, kepala tabel navy bertulisan putih, kartu berjarak 20 px dan tidak menempel, tanpa huruf kapital semua, tanpa pemisah titik tengah, tombol ikon polos, kolom berdampingan berakhir rata. Token dari `public/inti/tema.css`: latar `--paper`, `--card`, teks `--ink`, `--ink2`, garis `--line`, status `--ok`, `--warn`, `--bad`, `--info`, kepala `--head-bg`, teks di atas pekat `--on-pekat`. Layar baru masuk daftar `LAYAR` di `tests/agen/gerbang-kartu-std.test.mjs`.

| Komponen | Isi |
| --- | --- |
| Kartu "Kaji ulang" di `/siklus/kejadian/<KJ>` | Status (belum, draf, disahkan), versi, tombol Mulai atau Sahkan, tombol Cetak. Pil kategori untuk tahap. |
| Kartu "Linimasa" | Tabel waktu, tahap, peristiwa; filter tahap sebagai deretan pilihan sama lebar. Peristiwa tanpa jam asli diberi pil "perkiraan". |
| Kartu "Durasi tahap" | Tabel tahap: n, median, persentil 90, target, dalam target. Sel kosong berisi teks "tidak ada data" dengan warna `--ink2`, tidak pernah 0. |
| Kartu "Celah data" | Daftar tegas tahap dan sumber yang tidak punya data. |
| Kartu "Layanan dasar" dan "Koordinasi" | Ringkasan Lifeline (merah ke hijau pertama per layanan) dan hitungan 3W; dua kartu terpisah, tanpa total gabungan. |
| Kartu "Catatan lapangan" | Kutipan `ops_pelajaran` per tugas, tombol ikon polos "angkat". |
| Kartu "Pelajaran" | Dua kolom pil: berjalan baik, perlu diperbaiki; tiap butir bisa merujuk peristiwa linimasa. Kolom berakhir rata, tanpa ruang kosong besar. |
| Kartu "Rekomendasi" | Tabel: nomor, rekomendasi, unit, tenggat, status (pil Belum, Dikerjakan, Selesai), tanda "lewat tenggat" dengan `--bad`. Klik baris membuka laci riwayat dan form status; selesai meminta catatan penutup. |
| Halaman "Rekomendasi terbuka" | Daftar lintas kejadian dengan hitungan terbuka, lewat tenggat, tertutup per unit (F-7). |
| Cetak A4 | Gaya `@media print`: kepala dokumen, nomor versi, tanggal pengesahan, tanpa tombol; kepala tabel tetap navy. |

Klik baris membuka laci seketika; linimasa panjang dimuat tertunda dan dibagi per tahap supaya klik tidak membekukan layar (INP). Pil status memakai ikon dan teks, bukan hanya warna. Tinjau di `http://localhost:8800/siklus/kejadian/<KJ>`.
