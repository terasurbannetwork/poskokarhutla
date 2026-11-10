# RISET: isi juklak yang dipakai

Sumber: teks JDIH BNPB di `data/hukum/teks/*.txt.gz`, dan segmen `juknis-9-2023`, `juklak-3-2022` di `data/hukum/seed.sql` (`scripts/bnpb/hukum.py`). Yang berupa gambar tidak terbaca dan tercatat sebagai pertanyaan di `KEPUTUSAN-JUKLAK.md`.

| Juklak | Bagian dipakai | Masuk meja sebagai |
| --- | --- | --- |
| 9/2023 Pengungsi terpilah | Format 1 (laporan ke Posko PDB), Format 2 (formulir tempat pengungsian), Format 4 (laporan ke kepala daerah) | `pengungsi` |
| 3/2022 Kaji cepat | Format 1 (siaga) dan 2 (tanggap) butir terancam/terdampak dan rentan; Format 3/4 bagian V/VI rekomendasi status | kolom tambahan `kaji_cepat` |
| 5/2025 Pengaduan ULP | BAB III A (kanal), B (pencatatan, penelaahan, penyaluran, tindak lanjut, pelaporan), D (perlindungan), Format 1-4 | `pengaduan` |
| 16/2025 Klaster logistik | BAB III dan V, Format 1 (SK), 2 (rencana kerja), 5 (triwulan), 6 (tahunan) | `klaster` |
| 17/2025 Manajemen risiko | BAB III A (identifikasi, analisis, evaluasi), Tabel 3.1, 3.3, Lampiran I Format 2, 3, 4 | `risiko` |

Temuan yang membentuk mesin:

- Juklak 9/2023 mengisi per tempat pengungsian per pendataan; total per kabupaten adalah penjumlahan tempat yang masih buka pada data terbaru, jadi menjumlahkan semua baris keliru.
- Juklak 5/2025 BAB III B butir 5: penanganan berkadar pengawasan 20 hari kerja, tidak berkadar 15 hari kerja, melewati jangka waktu wajib penjelasan tertulis. Pelapor boleh anonim. Kerahasiaan identitas pelapor kewajiban (huruf D).
- Juklak 17/2025 Tabel 3.1 memberi enam kategori risiko. Kalimat di BAB III: pengendalian belum ada atau belum memadai, level sisa sama dengan level melekat.
- Juklak 16/2025 Format 6 meminta laporan barang masuk dan keluar; itu tetap dilayani LogPal, klaster hanya menyimpan dokumen.
