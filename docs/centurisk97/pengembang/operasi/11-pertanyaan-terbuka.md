# Pertanyaan pemilik yang terbuka

Halaman ini mendaftar pertanyaan pemilik yang belum diputuskan beserta bawaan sementaranya.

## Pertanyaan pemilik yang belum diputuskan

Semuanya dipakai dengan bawaan sementara dan harus tampil berlabel "sementara" atau "perkiraan", bukan angka pasti.

**Operasi Udara (`KEPUTUSAN-UDARA.md`):**

- Q1: batas telat laporan gelar armada. Belum diputuskan (bawaan sementara: 07.30 waktu setempat base, sekali sehari).
- Q2: definisi "tidak siap berulang". Belum diputuskan (bawaan sementara: tidak siap 3 hari atau lebih dalam 7 hari).
- Q3: sumber jam terbang dan jadwal inspeksi. Belum diputuskan (bawaan sementara: tidak ada; kartu menulis "belum ada data perawatan").
- Q4: batas jam kerja kru. Belum diputuskan (bawaan sementara: 8 jam terbang per hari per pesawat sebagai penanda kuning, tanpa klaim aturan).
- Q5: laporan insiden dan nyaris celaka. Belum diputuskan (bawaan sementara: tidak dibangun).
- Q6: sumber NOTAM. Belum diputuskan (bawaan sementara: tidak dibangun).
- Q7: harga kontrak dan siapa boleh melihat biaya. Belum diputuskan (bawaan sementara: biaya tidak ditampilkan).
- Q8: liter per jatuhan. Belum diputuskan (bawaan sementara: kapasitas bucket kali jumlah jatuhan, berlabel perkiraan).
- Q9: sumber titik air. Belum diputuskan (bawaan sementara: badan air terdekat dari data repositori, berlabel perkiraan).
- Q10: definisi waktu respons. Belum diputuskan (bawaan sementara: titik panas pertama cluster sampai aksi armada pertama dalam 2 km, maksimal 72 jam).
- Q11: luas terbakar sebelum dan sesudah. Belum diputuskan (bawaan sementara: luas cluster sistem Centurisk97).
- Q12: hak baca PDF renlap dan apakah JSON dan teks renlap tetap publik. Belum diputuskan (bawaan sementara: sama dengan hak baca peta; JSON dan teks tetap seperti sekarang). Catatan: berkas `public/data/operasi/renlap_*.json` memang di folder publik repositori.
- Q13: kartu keadaan untuk periode lebih dari satu hari. Belum diputuskan (bawaan sementara: hari terakhir periode, berlabel "per <tanggal>").
- Q14 dan Q15: seksi dan ekspor. Belum diputuskan (bawaan sementara: enam seksi seperti di layar; ekspor hanya seksi yang tampil). Catatan: tombol salin teks WhatsApp dan cetak di kepala layar disembunyikan atas permintaan pemilik (11 November 2026), dan ekspor Excel dan PDF belum ada.
- Q22 sampai Q25 (badan air serok): belum diputuskan (bawaan sementara: angka syarat tipe dari laporan K21 berlabel "dari laporan, belum dicek ke pabrikan"; kata "kandidat"; panjang dari kotak batas OSM; enam tipe sebagai bahan kajian).
- Pertanyaan Q16 sampai Q21 sudah dijawab pemilik (K14 sampai K19), antara lain: hanya peran `pusdalops` (plus moderator) boleh mengisi, isian manual menang atas bot, personel darat sebagai angka akumulasi per provinsi per unsur, hapus lunak dengan alasan, foto unggahan wajib berkoordinat dari data foto sendiri, kontrak tanpa harga.

**Misi Udara (`KEPUTUSAN-MISI.md`):** Q1 (enam jenis misi pas), Q2 (tipe helikopter dan sumber angka), Q3 (cadangan bahan bakar 30 menit), Q4 (penyangga gunung api 5 km), Q5 (Level I tanpa radius dicetak sebagai perhatian), Q6 (standar lapangan pendaratan: NWCG PMS 510 sebagai daftar periksa), Q7 (ambang cuaca sama dengan Operasi Udara), Q8 (titik darat di kabupaten berperingatan tsunami ditolak), Q9 (flight plan kunjungan tidak di repositori publik; berkas 15 November sudah telanjur ter-commit di `data/laporan-bnpb/paparan/flight-plan-banjir-2026-11-15/`), Q10 (siapa boleh membuat dan membaca flight plan: bawaan `pusdalops`), Q11 (tautan pendek hanya dibuka di perintah baris dan bot, tidak di Worker), Q12 (base selain sembilan base: dari `public/data/udara.json` atau diketik), Q13 (pola SAR dua jenis dengan jarak lintasan diketik), Q14 (zona manual per kejadian), Q15 (misi malam tidak ditolak), Q16 dan Q17 (jarak periksa dan angka kerja mesin tanpa sumber resmi), Q18 (raster InaRISK hanya sebagai catatan perhatian, bawaan: tidak dipakai). Semuanya belum diputuskan dan bertahan pada bawaan sementara masing-masing.

**Paritas bencana (`KEPUTUSAN-PARITAS.md`):** sejumlah Q (Q1 sampai Q9 dan seterusnya) masih memakai bawaan sementara, antara lain longsor tetap tab di `/banjir` (Q1), satu dasbor lintas bencana (Q2), pengisi renlap non-karhutla staf Pusdalops dan akun instansi wilayahnya (Q3), aset udara gempa dan cuaca lewat isian manual (Q4), papan status darurat dari SK isian staf (Q5), koefisien rupiah dari BPS dan Panel Harga Pangan (Q6), video tidak dikerjakan (Q7), bahasa Inggris menyusul (Q8), ambang praktik bertanda "perlu cek" tidak dipakai (Q9). Sebagian Q lain dijawab pemilik (K11 sampai K16) pada 15 dan 16 November 2026.

**Tindakan lapangan (`KEPUTUSAN-TINDAKAN.md`):** Q1 (kebakaran permukiman belum punya entri bencana; bawaan: tidak dibangun), Q2 (tindakan kualitas udara: pembagian masker dan imbauan), Q3 (OMC banjir hanya dicatat sebagai tindakan yang sudah dilakukan, tanpa zona usulan), Q4 (tindakan cukup dicentang, jumlah di catatan). Semuanya belum diputuskan.

Semua rute `/api/pb/*` menjawab 404 untuk bencana yang `kemampuan.operasi`-nya belum true (`src/pb_isian.js:31-37`). Env `PB_REGISTRI` (JSON) dapat menimpa `kemampuan` per bencana, sehingga saklar bisa berbeda dari `public/bencana.json` (`src/pb_isian.js:33`).
