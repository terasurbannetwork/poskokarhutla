# PRD: Hidromet per jam

## 1. Masalah

Kejadian hidrometeorologi yang paling merusak bergerak dalam hitungan jam. Di Ciwidey 14 Nov 2026, awan hujan pertama tertangkap
radar pukul 10.53 dan bangunan rusak sekitar 14.30. Sistem sekarang paling kuat di skala kabupaten-hari, dan lab sudah membuktikan
batasnya: FAR 0,95-0,97, bandang tidak terkalahkan klimatologi. Ada tiga celah:

1. **Pengamatan per jam yang tidak dibaca.** METAR 6 jam sudah masuk tapi pola embusan awan badai tidak dideteksi. Himawari 10 menit
   sudah dibaca tapi hanya tiap 3 jam dan tanpa laju pertumbuhan awan. Radar tidak ada.
2. **Faktor fisika yang tidak ada.** Angin menabrak gunung (Bukit Barisan, Cekungan Bandung), MJO, bibit siklon, siklus hujan harian,
   fase musim, banjir yang belum surut.
3. **Kita tidak tahu berapa menit peringatan kita lebih dulu.** Belum pernah diukur untuk satu kejadian pun.

## 2. Pengguna

| Pengguna | Butuh |
| --- | --- |
| Pusdalops BNPB dan BPBD | Tanda awal 1-4 jam sebelum hujan deras atau angin perusak, per kabupaten/kecamatan |
| Analis model (lab) | Faktor baru yang bersih bocoran untuk diuji |
| Tim konten (bacalangit) | Bahan visual yang sekarang dirakit tangan: loop awan, jam hujan, angin 850 hPa |
| Pemilik | Ukuran jujur: peringatan menyala berapa menit sebelum kejadian |

## 3. Cakupan (14 usulan pemilik, disetujui "Gas semua" 24 Nov 2026)

| ID | Usulan | Jenis | Tiket |
| --- | --- | --- | --- |
| U1 | Audit waktu peringatan 14-17 Nov (kronologi kejadian) | Pengamatan + audit | H10 |
| U2 | Pendeteksi embusan awan badai dari METAR | Pengamatan | H11 |
| U3 | Laju pendinginan puncak awan Himawari | Pengamatan | H12 |
| U4 | Jam rawan hujan per kabupaten | Klimatologi | H13 |
| U5 | Indeks angin menabrak gunung (850 hPa) | Faktor (prareg) | H20 |
| U6 | Fase MJO (RMM) | Faktor (prareg) | H21 |
| U7 | Bibit siklon JTWC + aturan dampak tidak langsung | Pengamatan + faktor | H22 |
| U8 | Penanda banjir belum surut | Faktor (prareg) | H23 |
| U9 | Fase zona musim BMKG | Faktor (prareg) | H24 (menunggu Q4) |
| U10 | Radar BMKG | Pengamatan | H30 (menunggu Q1) |
| U11 | Lapisan risiko angin kencang/puting beliung | Model (prareg) | H31 |
| U12 | Jeda waktu tempuh hulu ke hilir | Faktor (prareg yang ada) | H32 |
| U13 | Skenario sejarah untuk simulasi genangan | Simulasi | H33 |
| U14 | Kalibrasi dampak angin, kasus Ciwidey | Simulasi + studi kasus | H34 |

## 4. Di luar cakupan

- Mengubah `status.py` atau rumus resmi apa pun (K4).
- Mengklaim peningkatan skill sebelum vonis prospektif (K3).
- Mendeteksi tornado dari satelit. Tidak ada data yang bisa membedakan puting beliung dan downburst dari luar; yang diukur adalah bahannya.

## 5. Ukuran berhasil

| Jenis | Ukuran |
| --- | --- |
| Pengamatan (H11, H12) | Kasus WIII 17 Nov dan Ciwidey 14 Nov terdeteksi pada fixture; alarm palsu per stasiun-bulan dilaporkan dari arsip, bukan ditebak |
| Audit (H10) | Tabel menit-lebih-dulu per sumber untuk 4 kejadian, sumber yang tidak terarsip ditulis "tidak terarsip" |
| Faktor (H20-H24, H31, H32) | PRAREG bersidik di-commit sebelum uji; arsip hanya boleh MENOLAK; vonis prospektif paling cepat sesuai PRAREG |
| Simulasi (H33, H34) | Selisih simulasi dan kejadian nyata dilaporkan apa adanya, termasuk bila jelek |
