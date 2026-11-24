# PRD: Insiden Kaya

Memperkaya pop-up insiden api dengan dua hal: bagaimana api berjalan (PKH-06) dan bangunan apa saja yang berada dekat api (PKH-07). Keputusan di `KEPUTUSAN-INSIDEN.md`.

## 1. Masalah

- Insiden api kita hari ini menunjukkan luas piksel, tren 24 jam, front terbaru, dan titik masuk, tetapi tidak menjawab "sudah sejauh mana api berjalan, dan secepat apa".
- Pengambil keputusan di Pos komando bertanya "ada permukiman di dekat api ini?". Jawabannya sekarang hanya lewat paparan 1/3/5 km di balik sesi, dari poligon kompleks, dengan grid kasar.
- Pembanding publik (pantaukarhutla.com) sudah menampilkan keduanya per insiden.

## 2. Pengguna

| Peran | Kebutuhan |
| ----- | --------- |
| Pimpinan dan Pos komando | melihat arah dan kecepatan api, dan apakah ada permukiman dekat api, dalam satu pop-up |
| Satgas dan BPBD (bukan staf login) | angka bangunan dekat api per insiden untuk menentukan prioritas, K2 membolehkan publik |
| Publik dan media | membaca perkembangan api dengan label jujur (perkiraan, bukan luas terbakar) |
| Tim model | uji tahan metode waktu tiba pada data sendiri |

## 3. Fitur

| ID | Fitur | Isi | Tiket |
| -- | ----- | --- | ----- |
| F-1 | Arsip deteksi per insiden | petak unik per insiden aktif ditarik mundur dari `titik_hari` sejak 1 Jul 2026 dan ditambah tiap putaran (kode `arsip_insiden.py` sudah ada); sisa: pemangkasan, tutup ukuran, tidak terbit | IK-01 |
| F-2 | Waktu tiba per sel | `t_tiba` 375 m dari deteksi pertama dikurangi setengah jeda, diisi median 5 sel | IK-02 |
| F-3 | Garis depan harian | isokron 14.00 WIB, luas dijangkau dan baru per hari | IK-02 |
| F-4 | Laju p90 | km per hari per langkah, `resolved:false` bila di bawah satu sel | IK-04 |
| F-5 | Lompatan | sel pertama-terdeteksi 2 sampai 10 km dari yang sudah tercapai, dengan asal dan arah geometri | IK-04 |
| F-6 | Perkiraan titik awal | lingkaran galat, penanda "sudah besar saat pertama terlihat" | IK-04 |
| F-7 | Uji tahan | MAE dan persen dalam ±12/±24 jam pada 10 insiden 2019 dan 2023, dicatat sebelum angka tampil | IK-03 |
| F-8 | Bangunan dalam 500 m | jumlah bangunan Open Buildings ≥ 0,70 dalam 500 m dari pusat petak, per insiden, `kumulatif` dan `kini` | IK-06, IK-07 |
| F-9 | Keterliputan | provinsi tanpa grid tampil "belum tercakup", bukan 0 | IK-07 |
| F-10 | Kartu "Perkembangan api" di pop-up insiden | slider hari, isokron di peta, tabel per hari | IK-09 |
| F-11 | Kartu "Bangunan dekat api" di pop-up insiden | dua angka, lingkaran 500 m di peta (petak aktif), keterbatasan di `title` | IK-10 |
| F-12 | Perluasan grid bangunan | semua provinsi (Q5 dijawab: unduh semua), grid halus tersedia di job harian | IK-08 |
| F-13 | Gerbang | uji yang menolak koordinat bangunan di keluaran publik, ambang tak seragam, 0 palsu | IK-11 |

## 4. Di luar cakupan

- Panah arah sebar, profil elevasi, prakiraan garis depan, cuaca di garis depan (D17).
- Nama desa insiden (PKH-08), tingkat bukti insiden (PKH-10), riwayat petak (PKH-09): kuncinya sudah ada di `insiden.py`, tidak diubah dan tidak wajib tampil di kartu baru.
- Jumlah jiwa terpapar (bangunan bukan jiwa; paparan jiwa ada di `siklus/paparan.py`, tidak dicampur).
- Peringatan dan notifikasi dari angka bangunan.
- Bangunan OSM, atau penjumlahan dua sumber bangunan.
- Mengubah aturan pencocokan insiden `insiden.py`.
- Atribusi sebab, pelaku, atau konsesi pada titik awal.

## 5. Larangan

- Tidak menulis "padam" untuk insiden `tak_terdeteksi`.
- Tidak menulis "aman" bila bangunan 0 atau luas laju kecil.
- Tidak menampilkan koordinat bangunan, koordinat sel halus, atau daftar sel di berkas publik atau lewat rute Worker.
- Tidak menampilkan laju 0 untuk langkah di bawah satu sel; tampil "belum terukur".
- Tidak menampilkan bangunan 0 untuk provinsi tanpa grid.
- Tidak menyebut luas dijangkau sebagai luas terbakar.
- Tidak menampilkan angka perkembangan tanpa pil hipotesis sebelum uji tahan punya vonis (D9).

## 6. Kriteria terima

1. 10 insiden 2019 dan 2023: MAE waktu tiba dan persen ±12/±24 jam tercatat di berkas uji, bersama pembanding tetangga terdekat.
2. Insiden dengan < 20 piksel unik tidak punya isokron, tampil "terlalu kecil untuk dilacak".
3. `resolved:false` tidak pernah dirender sebagai 0.
4. Tiga insiden di provinsi bergrid diperiksa manual pada citra dan hasilnya dicatat (RENCANA-UJI §3).
5. Berkas publik lolos gerbang: tanpa kunci `lat`/`lon` per bangunan atau sel halus, ambang bangunan = 0,70, radius = 500.
6. Pop-up memakai kartu standar tanpa kalimat kesimpulan; pemilik meninjau di `http://localhost:8800/`.
