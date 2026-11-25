# PRD: Kemampuan Inti

## Tujuan

Tiap bencana di Centurisk97 memiliki lima bidang inti selengkap bencana terbaiknya di bidang itu: prediksi, simulasi, peringatan dini, pemodelan, dan analisa dampak (KEPUTUSAN K1 sampai K3). "Lengkap" diukur dengan matriks `RISET.md`. "Berguna" diukur dengan D1: tiap tiket menghasilkan angka yang lebih jujur, keluaran baru yang lolos uji, kanal resmi baru, bug yang mengirim informasi salah dibetulkan, atau mesin bersama yang dipakai dua bencana sekaligus.

## Pemakai

- Staf Pusdalops dan pimpinan BNPB: membaca prakiraan, peringatan, dan perkiraan dampak dengan tahu mana yang sudah teruji.
- BPBD: menerima peringatan resmi lewat kanal yang sama untuk semua jenis.
- Warga pelanggan peringatan: email dan push hanya membawa sumber resmi atau keluaran yang lolos gerbang.
- Pengulas model (`validasi-model`): satu tempat untuk vonis tiap keluaran (`public/data/gerbang/<bencana>.json`).

## Fitur

| F | Fitur | Tiket |
| --- | --- | --- |
| F-1 | Perbaikan informasi salah: email longsor, severity CAP, ambang angin dan gelombang, kinerja GMPE, pembanding naif cuaca dan udara, persentil rob | KI-01 sampai KI-06 |
| F-2 | Mesin bersama pembanding, sidik, gerbang tampil, selang, kesetaraan Python-JS, mutu label, gerbang lisensi | KI-10 sampai KI-17 |
| F-3 | Pemodelan dan prediksi per bencana: gerbang udara, model bayangan udara dan cuaca, rob prospektif, MOS udara, pesisir prospektif, pembanding LHASA NASA, uji status karhutla, eskalasi banjir, ansambel gelombang, gempa di /prediksi, peluang tahunan, prospektif risiko 7 hari | KI-20 sampai KI-34 |
| F-4 | Simulasi: mesin perlakuan inti, persistensi abu, kalibrasi laju karhutla, faktor sisi aman, invarian fisik, replay Tapanuli dan Seroja, run-out longsor | KI-40 sampai KI-46 |
| F-5 | Peringatan dini: kanal resmi lintas jenis, berantai baru, lonjakan, daerah senyap, pengamatan tidak diturunkan, saran status, tangga longsor | KI-50 sampai KI-56 |
| F-6 | Dampak: rantai kerusakan banjir, paparan longsor, dampak empiris longsor dan cuaca, paparan rentan abu, jalan putus, tanpa hitung ganda, Sphere, sektor | KI-60 sampai KI-67 |
| F-7 | Gerbang matriks dan hitung ulang | KI-70, KI-71 |

## Larangan

- Model yang belum lolos tidak tampil sebagai angka pasti dan tidak dikirim keluar (D2, D7).
- Tidak pernah menulis "aman".
- Uji yang sudah dibuka tidak dibuka ulang dengan aturan baru.
- Tidak ada mesin kedua untuk kemampuan yang sudah punya mesin inti (D4 sampai D6).
- Angka antarsumber tidak dijumlahkan.
- Tidak ada tiket yang menggandakan paket Paritas, Bekas Longsor Satelit, Kerusakan Satelit, atau Penurunan Tanah (D9).

## Ukuran selesai

Semua tiket KI berstatus SELESAI atau DITUTUP dengan alasan. Gerbang KI-70 hijau. Hitung ulang KI-71 menunjukkan jumlah sel ✗ turun, dan tiap sel yang naik disertai bukti berkas:baris.
