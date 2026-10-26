# Keputusan pemilik: SIPPA (24 Okt 2026)

Jawaban pemilik atas 50 pertanyaan pra-PRD. Dokumen ini menang atas KRITIK-DAN-KEPUTUSAN.md bila bertentangan.

## A. Arah
1. Nama: **SIPPA** (Sistem Pipa Portabel Karhutla dan Banjir).
2. Pemilik program: BNPB.
3. Pembaca buku: Kepala BNPB.
4. **Pilot Oktober 2026, minggu ini.** Bila berhasil, kit langsung dipakai untuk banjir November–Desember 2026.
5. Horizon 2026–2030.
6. Provinsi lain dibahas penuh, bukan hanya Kalteng.
7. Pemakaian ganda banjir (kit dipindah ke daerah banjir lain di musim hujan) masuk hitungan biaya-manfaat.
8. Irigasi pertanian masuk, dengan sumber air irigasi dari tempat lain (bukan air yang dipakai pemadaman).
9. Injeksi: 1,5 m untuk pilot; 3–5 m lengan uji kedua.
10. Surfaktan bebas PFAS sebagai lengan uji.

## B. Buku
11. Tanpa batas halaman.
12. Gambar teknik tingkat konstruksi (tetap wajib verifikasi dan pengesahan insinyur berlisensi sebelum dibangun).
13. RAB dihitung ulang oleh kajian.
14. Harga helikopter: angka BNPB, diserahkan pemilik nanti.
15. NPV, BCR, Monte Carlo masuk.
16. Matriks respons FRP dan luas masuk.
17. (gabung 16)
18. Simulasi Three.js di web (pakai simulasi karhutla yang sudah ada sebagai pola).
19. Deck paparan sekitar 15 slide.
20. Tidak ada bab kritik gagasan awal; buku langsung menulis arah desain.

## C. Kelembagaan
21. YonTP: gudang, tenaga gelar, transport antar-daerah; komando Satgas, operator inti Manggala Agni.
22. Tidak ada bagian dasar hukum TNI.
23. Aset: BMN BNPB, pinjam pakai.
24. Matriks RACI per tahap.
25. Peran swasta/konsesi sebagai opsi kebijakan.

## D. Data
26. Semua data terbuka ditarik.
27. Draf surat permintaan data resmi sebagai lampiran.
28. Batas data 23 Okt 2026 23.59 WIB.
29. Label keyakinan di semua angka.
30. Ambang zona: air 2,5 km, jalan 5 km.

## E. Aplikasi web
31. Halaman `/pipa` di Pantau Bencana.
32. **Hanya staf BNPB** (di balik login admin).
33. Fitur: peta kelayakan kit, kalkulator hidraulika, saran sarana, pemicu pra-posisi, dashboard A/B, log time-motion, inventaris dan lacak kit, simulator keputusan, simulasi Three.js.
34. Dashboard pemilik dibangun ulang dengan gaya Pantau Bencana; mesin hitung dan gerbang dipertahankan.
35. Lacak kit dan logistik antar-daerah (karhutla ke banjir).
36. Pola admin yang sudah ada di worker.
37. Form lapangan luring, kirim saat ada sinyal.
38. Telemetri sensor dibuat sekarang (kerangka siap terima data).
39. Laporan PDF otomatis.
40. Bahasa Indonesia saja.

## F. UI/UX
41. Gaya Pantau Bencana.
42. Desktop untuk perencanaan, ponsel untuk lapangan.
43. Simulator membandingkan semua skenario.
44. Peta per kompleks dan per sel 2,2 km dengan sakelar.
45. Mode gelap.

## G. Eksekusi
46. PRD dulu (pagi 25 Okt), lalu buku dan web paralel.
47. Kajian mitigasi ditunda sampai PRD dan buku pipa selesai.
48. Maksimal 60% kuota minggu ini untuk pipa, sisanya mitigasi.
49. Boleh deploy setelah lolos uji (deploy dari sesi induk, bukan subagent).
50. Tidak boleh ada: klaim "terbukti" tanpa uji, angka tanpa sumber, jaringan permanen nasional, pembelian massal sebelum pilot, injeksi > 5 m, nama/logo pihak lain selain BNPB.

## H. Keputusan tambahan (25 Okt 2026)
51. **Ambang zona memakai "<"** (air < 2,5 km, jalan < 5 km). Jarak tepat 2,50 km atau 5,00 km masuk kelas "jauh". Semua angka zona dihitung dengan aturan ini.
52. **Warna zona di buku dan deck: biru dan emas**, dengan huruf A–D dan pola arsiran yang sama dengan web. Web tetap memakai palet PRD, ditambah huruf dan pola wajib karena uji buta warna.
53. **Definisi vonis pilot "dapat dipakai"** (diputus atas wewenang yang diberikan pemilik; label `asumsi-kebijakan`). Kit dinyatakan **dapat dipakai** bila SEMUA terpenuhi:
    1. Air mengalir sampai ujung lance pada ≥ 2 sesi di ≥ 2 petak berbeda.
    2. Waktu dari tiba di lokasi sampai air mengalir ≤ 4 jam pada sesi terbaik, dan waktu tiap sesi tercatat lengkap (tiba, mulai gelar, air mengalir, selesai, bongkar).
    3. Tekanan ujung lance ≥ 2 bar bertahan ≥ 30 menit terus-menerus pada ≥ 1 sesi (gauge, atau catatan operator bila gauge tidak ada; sumbernya ditandai).
    4. Tidak ada gerbang keras kalkulator yang dilanggar untuk konfigurasi yang dipakai (tekanan ≤ 88% × PN × penurunan suhu).
    5. Data probe suhu gambut lengkap ≥ 90%: sebelum injeksi, sesudah injeksi, dan 24 jam kemudian, di semua petak.
    6. Nol kecelakaan kerja, dan tidak ada kebocoran sambungan yang menghentikan sesi > 30 menit.
    7. Kit kembali dari lapangan dengan ≥ 95% komponen lengkap dan berfungsi.

    Vonis: semua terpenuhi = **dapat dipakai**; satu butir gagal di luar butir 1 dan 6 = **dapat dipakai bersyarat** (perbaikan tertulis sebelum dipakai untuk banjir); butir 1 atau butir 6 gagal = **belum dapat dipakai**. Vonis "lebih baik dari cara konvensional" tidak diputus dari pilot ini (n < 8 per lengan).
54. **T-B dan T-C memakai bawaan PRD §2.2** (pemilik, 26 Okt 2026). Pilot lapangan 28 Okt–1 Nov 2026 di AOI mudah Palangka Raya (Bukit Batu atau Jekan Raya) atau kompleks aktif terdekat Daops Palangka Raya; alat: pompa yang sudah ada di lapangan, 2 lance pipa SS atau galvanis, 2 termometer tusuk gambut; pemilik pompa (Manggala Agni atau BPBD) dicatat di `sippa_komponen.pemilik_asal`; tanpa dokumen pinjam pakai formal untuk pilot.
55. **GD SIPPA menyerap GD Rehabilitasi dan Rekonstruksi Air dan Akses** (pemilik, 26 Okt 2026). Satu grand design saja: sistem perpipaan SIPPA (karhutla, banjir, irigasi dari sumber lain) ditambah (a) pemanfaatan akuifer/air tanah pascabencana, (b) rehabilitasi dan rekonstruksi akses (jembatan: program TNI AD, Polri "Jembatan Merah Putih Presisi", jembatan gantung PU, bailey DSP BNPB), dan (c) model pemeliharaan (maintenance) aset. Tiga grand design BNPB menjadi: Air Jawa, Mitigasi, SIPPA terintegrasi. Kajian `rehab` (data/kajian-bnpb/rehab/, naskah/rehab/) menjadi bahan bukti untuk buku SIPPA; berkas finalnya tidak dihapus tetapi tidak diserahkan sebagai GD terpisah. Keputusan Q1–Q20 di rehab/KEPUTUSAN-AWAL.md tetap berlaku untuk bagian akuifer dan akses, kecuali yang bertentangan dengan keputusan SIPPA 1–54.
56. **Akuifer, akses/jembatan, dan jadwal pemeliharaan masuk web /pipa** (pemilik, 26 Okt 2026), bukan hanya di buku. Rincian layar, data, rute, uji, dan tiket mengikuti PRD dan TIKET yang diperbarui.
57. **Peta akses per kompleks di web /pipa** (pemilik, 26 Okt 2026): tiap kompleks api menampilkan dekat jalan atau dekat air (zona A–D), rute tercepat dari posko/Daops terdekat (garis di peta), cara sampai (kendaraan, jalan kaki, perahu) dan perkiraan menit per ruas dan total, plus titik air terdekat. Dihitung pipeline dari graf jalan OSM (termasuk track, ditandai perlu cek lapangan) dan jaringan sungai/kanal; ditampilkan di layar Peta (SP-032). Angka waktu berlabel estimasi-model dengan asumsi kecepatan per kelas jalan dan moda.
