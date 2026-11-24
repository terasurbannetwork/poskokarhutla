# ALUR

## Petugas Pusdalops, siang hari musim peralihan

1. Buka `/cuaca`. Kartu "Awan tumbuh cepat" menyala untuk Kab. Bandung: puncak awan mendingin 9 K dalam 30 menit, kini −52 °C.
2. Kartu "Jam rawan hujan" untuk kabupaten itu: ±71% hujan setahun turun 13.00-20.00, puncak ±17.00.
3. Peringatan dini BMKG (sudah ada) dibaca bersamaan. Kartu pengamatan tidak menggantikan peringatan BMKG.
4. Bila bandara terdekat mencatat "Embusan awan badai terekam", kartu menunjukkan waktu, turunnya suhu, dan naiknya tekanan.
5. Petugas meneruskan ke BPBD lewat jalur yang sudah ada. Sistem tidak mengirim pesan sendiri.

## Analis lab

1. Faktor harian (orografi, MJO, surut, bahan angin) terarsip otomatis.
2. Analis membaca PRAREG, menjalankan uji yang dibekukan, menulis vonis. Tanpa vonis, faktor tidak tayang.

## Audit sesudah kejadian

1. `python3 scripts/cuaca/kronologi.py <kab> <mulai> <akhir>`.
2. Hasilnya tabel waktu: tanda pertama tiap sumber, peringatan pertama, laporan pertama, kerusakan.
3. Disimpan sebagai `AUDIT-*.md` di folder ini.
