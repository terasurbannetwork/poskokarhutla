# ALUR: dari teknik di satu bencana ke semua bencana

## Alur kerja satu tiket

1. Pengerja membaca baris matriks dan baris inventaris asal di `riset/R*`: berkas, vonis, catatan.
2. Pengerja memeriksa apakah mesin inti sudah ada (`scripts/umum/**`, `public/inti/**`). Bila ada, mesin itu dipakai. Bila belum, mesin dibuat di inti dengan dua pemakai di tiket yang sama (D1 e).
3. Untuk model atau uji baru: tulis kriteria, kunci dengan `scripts/umum/sidik.py`, latih atau hitung, lalu buka uji sekali.
4. Entri gerbang ditulis (`scripts/umum/gerbang.py`), dan layar membaca `public/inti/gerbang.js`. Keluaran yang belum lolos tampil berpil hipotesis.
5. Bukti siap dijalankan. Pemeriksa konteks bersih membaca sinyal nyatanya (uji hijau, JSON vonis), bukan klaim.
6. Status tiket diperbarui di `TIKET.md`, dan sel matriks diperbarui di KI-71.

## Alur sebuah peringatan (sesudah F4)

1. Sumber resmi (BMKG, PVMBG, InaTEWS) atau keluaran kita masuk penilai `src/ews.js`.
2. Keluaran kita dicek ke gerbang. Bila `boleh_tampil=false` atau `sumber_jenis = hipotesis`, keluaran itu hanya tampil di layar.
3. Sumber resmi diteruskan apa adanya dengan label lembaga ke layar alarm, CAP, email, dan push.
4. Peringatan berantai dan daerah senyap hanya masuk ke layar Pusdalops (Q5).

## Alur sebuah angka dampak

1. Bahaya fisik: guncangan, kedalaman, jalur abu, atau zona status.
2. Kerapuhan atau model empiris, dikalibrasi satu pengali.
3. Galat leave-one-out.
4. Hasilnya tampil sebagai pita P10 sampai P90 bila lebarnya masih di rentang tervalidasi (KI-14). Bila di luar rentang itu, yang tampil hanya angka paparan.
