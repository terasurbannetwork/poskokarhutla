# ALGORITMA

## GEL
Untuk tiap titik pesisir: `wave_height_max` harian H+1..H+3 (m). Kab = poligon yang memuat titik; bila tak ada, poligon provinsi sama dengan jarak titik ke simpul terdekat <= 25 km (haversine); selain itu titik dibuang. `hs` kab = maksimum titik kab, dibulatkan 0,01 m (resolusi Open-Meteo; layar yang membulatkan untuk tampilan). `lv` = 0 bila hs < 1,25; 1 bila < 2,5; 2 bila < 4,0; 3 selainnya. Kab tanpa titik tidak dicatat (tampil "–"). Sumber kategori: BMKG, kategori tinggi gelombang (Sedang 1,25–2,5 m, Tinggi 2,5–4,0 m, Sangat tinggi 4,0–6,0 m) dan peringatan dini bahwa gelombang di atas 1,25 m berisiko bagi perahu nelayan; rujukan lengkap di `RISET.md`. Teks kelas di pop-up: "di bawah 1,25 m", "1,25 sampai di bawah 2,5 m", "2,5 sampai di bawah 4 m", "4 m ke atas"; `hs` ditampilkan 0,1 m.

## CEX
`emb` = maksimum `wind_gusts_10m` per jam pada tanggal WIB (km/jam, dibulatkan), butuh >= 20 jam terisi. `lv` = 0 bila < 46; 1 bila < 63; 2 bila < 89; 3 selainnya.

## Level sel tabel (tampilan)
- Hujan: tot < 20 = 0, < 50 = 1, < 100 = 2, selainnya 3.
- Titik panas: p < 0,2 = 0, < 0,5 = 1, < 0,8 = 2, selainnya 3.
- Banjir, longsor, gelombang, angin: `lv`.
- Asap: `kat` (0..3).
- Rob: lewat = 2, tidak = 0.
- Level baris = maksimum level sel. Urutan bawaan: level baris menurun, lalu jiwa menurun.

## Pil bencana
Angka pil = jumlah kab (sesudah saring provinsi dan cari) dengan level sel bencana itu >= 2.

## Tangga kering kita
- Sepekan: hitung mundur hari berturut dengan total < 1 mm dari H+3 (prakiraan HJN tot) ke belakang lewat riwayat; berhenti di hari hujan atau hari tanpa data. Teks memakai kelas HTH BMKG. Riwayat kurang dari jumlah yang dihitung = ditulis "sekurang-kurangnya N hari".
- Bulan: `p_model_t1` kab, dibulatkan 5%, dengan bulan sasaran `bulan_t1`; dilewati bila basi (bulan sasaran sudah lewat).

Sumber kelas HTH: BMKG, klasifikasi hari tanpa hujan berturut (hari hujan = curah >= 1 mm); rujukan dan kutipan kelas ada di `RISET.md`.
