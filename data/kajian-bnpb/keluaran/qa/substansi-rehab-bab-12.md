# QA substansi, Bab 12 kajian rehab (25 Oktober 2026)

Berkas: `naskah/rehab/bab-12.md`, dibandingkan dengan `bukti/bab-12.md`, `bab-12.angka.json`, bab-01..08 angka, dan KERANGKA rehab.

## Terverifikasi
- 81 kunci angka: semua ada di `data/angka.json` atau `bab-*.angka.json`; nilai dan label cocok dengan bukti. Semua rujukan silang (@rek, @sub, @tbl) punya target.
- Hitungan register cocok: 8 internal + 7 lintas = 15; horizon 4/10/1; usulan baru 10 dan dikembangkan 5; 5 keputusan 14 hari; 4 KD; 7 butir tidak direkomendasikan.
- Lantai skenario: tidak ada angka di bawah lantai; angka model (14.563 m3/hari, 486 sumur-setara) berlabel asumsi kebijakan dan disandingkan 128 sumur tercatat; Flores DIBI, rilis BNPB 22 Agustus, dan rilis verifikasi ditulis berdampingan; DIBI 744 lawan PU 1.181 berdampingan.
- Kewenangan: PP 21/2008, Perban 6/2017, Perban 1/2026 Pasal 25 dipakai benar; KD-R2 dan KD-R4 dirumuskan sebagai usul bersama Kemenkeu/Kemendesa/ESDM, bukan keputusan BNPB sendiri. Tidak ada klaim BNPB sebagai regulator keselamatan.
- Klaim "terbukti": naskah sudah menyatakan tidak ada program RR air/akses berbukti kuat; label lemah dijelaskan sebagai tanpa evaluasi, bukan dampak kecil.

## Disunting
1. Satuan Jepang: Kobe 1,26 juta dan Tohoku 2 juta ditulis "rumah tangga" padahal Bab 6 menetapkan satuannya tidak disebut sumber (rasio pemulihan layanan). Diperbaiki di KD-R1, R-RR-09, dan baris "unit SPAM bukan ukuran tunggal".
2. Durasi Palu IV dan huntap Sulteng dibandingkan dengan masa R3P (dihitung sejak penetapan R3P) tanpa penjelasan dasar; ditambahkan catatan bahwa durasi dari kejadian dan R3P maksimal 90 hari sejak tanggap darurat, sehingga kesimpulan tidak berubah. Ringkasan bab diberi "untuk satu jembatan" (n=1).
3. "Belum pernah dievaluasi secara independen" di ringkasan dilunakkan menjadi "tidak ditemukan evaluasi independen".
4. KD-R4 "100 hari" bertabrakan dengan R-RR-10 (2026-2027): kini penugasan 100 hari, protokol terbit 2026-2027.
5. Kalimat 12.6 "tiap celah punya pemegang data" bertentangan dengan baris terakhir tabel (pemegang "–"); dikoreksi menjadi tujuh dari delapan.
6. Meta-komentar proses dibuang: "kerangka kajian gugur", "dengan koreksi status", "usulan dari kerangka kajian".
7. Hidran Cianjur "sekitar empat bulan kemudian" diganti "pada Maret 2023" (selaras kunci).
8. Pembatasan air tanah Tokyo/Osaka/Bangkok diberi "menurut rubrik penyusun"; Gumbasa diberi keterangan irigasi agar tidak terbaca sebagai SPAM.

## Catatan tersisa (bukan untuk penyunting naskah)
- Gumbasa dan Palu IV bernilai "lemah" menurut rubrik penyusun; sudah diberi label tersebut di teks.
- Satuan `rehab.jembatan.pu.gantung_biaya_rata2_2025` di registri "per paket", sedangkan bukti menulis "per unit"; naskah memakai token sehingga mengikuti registri.
- Bab 12 jauh melebihi target 4 halaman karena memuat enam tabel dan 15 kartu rekomendasi; tidak dipotong karena tiap paragraf memuat angka, sumber, atau keputusan.
- `rehab.tesis` ada di `bab-12.angka.json` dan sudah dicek ada; penggabungan ke `data/angka.json` tetap tugas sesi induk.
