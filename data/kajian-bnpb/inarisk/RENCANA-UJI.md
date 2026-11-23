# Rencana uji

| Kriteria | Perintah bukti |
| --- | --- |
| Pipeline self-check: 514 kab, 11 tahun, kelas 2025 = 169 Tinggi / 345 Sedang, nasional 147,95, rekomendasi terurai | `python3 scripts/bnpb/inarisk.py --cek` |
| Fungsi murni: kelas, peringkat (Langkat 39, dulu 160; Halmahera Selatan 1, dulu 13), rerata, jiwa terpapar, tingkat IKD | `node --test tests/bnpb/inarisk_hitung.test.mjs` |
| Proksi: daftar izin, saring parameter, buang nama petugas, batas badan POST, 502 saat hulu gagal | `node --test tests/warga/inarisk_proksi.test.mjs` |
| Rute dan CSP tidak merusak yang lain | `npm run uji:warga` |
| Pemilik berkas dan paket dokumen | `npm run uji:agen` |
| Token warna tidak bertambah | `node --test tests/agen/gerbang-token-warna.test.mjs` |
| Layar 1440 dan 390, konsol bersih, tiap tab terbuka, dialog detail Langkat menampilkan 231,47 | playwright di `http://localhost:8800/bnpb/inarisk` |
| Klik tab, baris, filter tidak membekukan (INP) | pengulas `inp-reviewer` |
| Angka di kartu dan pop-up format Indonesia, tanpa presisi palsu | pengulas `selera-angka` |
| Data terburuk (nama kab panjang, skor null, IKD tanpa analisa) | skill `break-ui` |

Uji yang memerlukan jaringan InaRISK (tarik nyata, proksi hidup) dijalankan tangan dan hasilnya dicatat
di jejak agent; CI hanya menjalankan uji tanpa jaringan.
