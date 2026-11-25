# PRD: Desa Waspada

Dua daftar desa yang membantu pimpinan, BPBD, dan relawan memilih desa untuk dicek dan didukung: desa yang sedang punya titik panas, dan desa yang minggu ini belum punya titik tetapi sudah berulang kali terbakar. Keputusan di `KEPUTUSAN-DESA.md`.

## 1. Masalah

- Titik panas kita sudah tampil per kabupaten, kecamatan, dan insiden, tetapi belum ada daftar **desa** yang bisa dibawa ke rapat atau dikirim ke kepala desa dan BPBD kabupaten.
- Rencana pencegahan kita (`preventif.json`) berhenti di kecamatan. Desa yang berulang kali terbakar tetapi sedang sepi titik tidak terlihat di mana pun.
- Pembanding publik (pantaukarhutla.com) sudah punya daftar ini dan ekspor CSV-nya.
- Tidak ada ukuran apakah daftar semacam itu menunjuk desa yang benar. Pembanding mengklaim 39% dan 11,6% tetapi dari data dan poligon mereka.

## 2. Pengguna

| Peran | Kebutuhan |
| ----- | --------- |
| Pimpinan dan Pos komando | daftar desa per provinsi atau kabupaten untuk arahan patroli dan dukungan |
| BPBD dan Manggala Agni daerah | desa mana di kabupaten saya yang punya titik panas atau riwayat berulang, bisa diekspor |
| Relawan dan media | membaca daftar dengan label jujur, tanpa kesimpulan bahwa desa "pelaku" |
| Tim model | laju hindcast terukur dan terdokumentasi |

## 3. Fitur

| ID | Fitur | Isi | Tiket |
| -- | ----- | --- | ----- |
| F-1 | Daftar A, titik panas 7 hari | desa, kecamatan, kabupaten, provinsi; titik 7 hari dan 24 jam; terakhir terdeteksi (WIB); tahun terbakar; porsi gambut; peluang kab/kota 3 hari | DW-04, DW-05 |
| F-2 | Daftar B, berulang tanpa titik minggu ini | desa dengan 0 titik 7 hari dan ≥ 3 tahun terbakar dari 2012 sampai 2025; dibatasi per provinsi | DW-04, DW-05 |
| F-3 | Laju hindcast terukur | persen desa-minggu 2023 dengan titik minggu berikutnya, per kelompok, dengan selang Wilson dan jumlah desa-minggu; "belum terukur" sampai terisi | DW-03 |
| F-4 | Peluang kab/kota 3 hari | `API.p` hari ke-1 sampai ke-3 dari model prediksi, berpil hipotesis selama belum dinilai | DW-05 |
| F-5 | Porsi gambut | perkiraan per desa dari `gambut.geojson`, "–" bila tak ada data | DW-02 |
| F-6 | Ekspor CSV | satu klik, dua daftar, kolom di DESAIN-TEKNIS §4, di peramban | DW-07 |
| F-7 | Pin peta | peta mini halaman, satu pin per desa terfilter, klik baris fokus pin | DW-07 |
| F-8 | Filter dan urut | provinsi, kabupaten (daftar turun), cari nama desa, urut titik 7 hari atau tahun terbakar | DW-07 |
| F-9 | Halaman dan tautan | `/desa-waspada`, tautan di menu, kata menurut D14 | DW-07, DW-08 |
| F-10 | Gerbang | uji yang menolak laju pembanding yang disalin, 0 palsu, kata terlarang, ukuran berkas | DW-09 |

## 4. Di luar cakupan

- Peringkat gabungan baru, skor kerentanan desa, regresi atau GBDT, tingkat prioritas 1 sampai 3 (D15).
- Kanal, jalan, penduduk per desa, tutupan lahan, konsesi per desa.
- Notifikasi, langganan, atau API publik untuk desa.
- Mengubah `insiden.py` (kecuali memindah kelas `Desa` ke modul kecil, DW-01), `preventif.py`, `khg_prioritas.py`, `prioritas.js`, `prediksi`.
- Biaya, jarak posko, dan rencana pencegahan (milik `preventif.py`).
- Kartu baru di peta utama `index.html` (Q6).
- Menyebut sebab, pelaku, atau pemilik lahan.

## 5. Larangan

- Tidak menulis "aman", "bebas api", "padam", "pelaku", "penyebab", "rawan dibakar" (D14).
- Tidak menampilkan angka laju pembanding (39%, 11,6%) sebagai angka kita.
- Tidak menampilkan 0 untuk gambut yang tidak tercakup, laju yang belum terukur, atau peluang kab yang tidak ada.
- Tidak menyebut peluang kab/kota sebagai peluang desa.
- Tidak menjumlah titik daftar (VIIRS n/h) dengan angka utama atau titik MODIS.
- Tidak mengurutkan desa dalam satu kabupaten menurut peluang kab/kota (identik untuk semuanya).
- Tidak menampilkan koordinat lebih rinci dari 0,001 derajat per desa, dan tidak ada koordinat petak atau titik individual di berkas publik.

## 6. Kriteria terima (dari tiket PKH-18: "hindcast 2023 per daftar")

1. `scripts/data/desa_waspada_laju.json` memuat laju hindcast 2023 untuk empat kelompok (A, B, semua lainnya, tak pernah terbakar), dengan jumlah desa-minggu dan selang Wilson, dihitung dari data lokal dan dibekukan.
2. Hasil diulang dengan NOAA-20 2023 (Q4) dan ditulis berdampingan; selisih besar dilaporkan jujur.
3. Vonis `belum|lulus|gagal` terhadap ambang Q2 (disahkan K7) tertulis di keluaran; layar memakai pil hipotesis kecuali `lulus`.
4. Dua daftar terbit per pulau di `public/data/desa_waspada/<pulau>.json` ≤ 450 KB per berkas dan lolos gerbang.
5. Tiga desa di tiga provinsi diperiksa manual pada citra dan peta batas; hasil di `tests/desa-waspada/hasil_manual.md`.
6. Halaman memakai kartu standar tanpa kalimat kesimpulan; pemilik meninjau di `http://localhost:8800/desa-waspada`.
