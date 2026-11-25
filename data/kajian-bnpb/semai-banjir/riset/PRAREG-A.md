# PRAREG-A: penguji efektivitas OMC banjir, Lapis A

Dikunci 25 Nov 2026 sebelum data hujan hasil ditarik (SB-11). Salinan persis RENCANA-UJI §6 pada commit bbf7fa6a0. Penyimpangan apa pun sesudah ini dicatat di HASIL-A, tidak dengan menyunting berkas ini.

## 6. Kriteria vonis penguji (DIKUNCI sebelum lab)

Bagian ini adalah pra-registrasi. Tiket SB-11 menyalin §6 ke `riset/PRAREG-A.md`, menghitung `sha256` atas teksnya ke `PRAREG-A.sidik`,
dan meng-commit keduanya **sebelum** `efek_banjir.py lapis-a tarik` dijalankan. Perubahan sesudah itu hanya sebagai "penyimpangan dari
PRAREG" bertanggal di HASIL.

### 6.1 Hasil dan arah

- Hasil primer kedua lapis: hujan harian kab CHIRPS (mm), rata-rata sel dalam poligon, hari UTC (Q1).
- Efek `b` dalam mm diubah ke persen terhadap rata-rata kontrafaktual kelompok perlakuan (`rata-rata y perlakuan - b`).
- Arah yang diduga: **negatif** di sasaran (hujan lebih rendah dari kontrafaktual). Lapis B sekunder zona: **positif**.

### 6.2 Ambang n

| Lapis | Vonis boleh dihitung bila |
| ----- | ------------------------- |
| A | cakupan dikunci: hanya tanggal >= 3 Feb 2024 (awal `ecmwf_ifs025` di Open-Meteo historical-forecast, KEPUTUSAN D11) sampai hari CHIRPS terakhir saat tarik; jenis persis `Pengurangan CH - Bencana`; baris bertanggal terbalik dibuang. Ambang: >= 300 provinsi-hari perlakuan sesudah pembuangan, >= 30 provinsi-periode (klaster), >= 5 provinsi. Perkiraan dari daftar periode saja: 795 provinsi-hari, 86 provinsi-periode, 13 provinsi |
| B | >= 250 sasaran-hari perlakuan, >= 30 hari kalender berbeda |

Di bawah ambang: `data_kurang (n = x)`.

### 6.3 Vonis

Dihitung dari spesifikasi primer (TWFE + kovariat IFS), inferensi permutasi (ALGORITMA §9.1 dan §9.2), alfa 0,05 dua sisi.

| Vonis | Syarat (semua harus terpenuhi) |
| ----- | ------------------------------ |
| `data_kurang` | ambang n §6.2 tidak tercapai, ATAU hasil tidak memenuhi `sejalan`/`berlawanan` dan MDE > 30% (efek sasaran yang ingin dilihat), berlabel "tidak informatif (MDE x%)" |
| `sejalan` | efek < 0; p permutasi < 0,05; plasebo waktu p >= 0,10; plasebo ruang galat tipe I <= 10%; Lapis B saja: efek sekunder zona > 0 (arah, tanpa syarat signifikan) atau sekunder `data_kurang` dicatat |
| `berlawanan` | efek > 0; p permutasi < 0,05; plasebo waktu p >= 0,10; plasebo ruang galat tipe I <= 10% |
| `tak_terbedakan` | MDE <= 30% dan bukan `sejalan`/`berlawanan`, termasuk efek bermakna dengan plasebo tidak bersih (dicatat "plasebo tidak bersih") |

### 6.4 Aturan melapor

- Selalu: efek persen, selang 90% dan 95%, p permutasi, MDE, n perlakuan dan kontrol, n hari, n provinsi, plasebo.
- Semua spesifikasi sekunder dan rincian eksploratori dilaporkan, termasuk yang nol; rincian dikoreksi Holm.
- `sejalan` ditulis "kesesuaian: hujan sasaran lebih rendah dari pembanding setara; bukan bukti sebab". `tak_terbedakan` ditulis
  "tidak terdeteksi", bukan "tidak ada efek". Tanpa kata "berhasil" atau "gagal".

### 6.5 Harapan sebelum melihat data

MDE Lapis A diperkirakan 40 sampai 100%, jadi label "tidak informatif" paling mungkin; Lapis B membutuhkan sekitar 250 sampai 3.000 sasaran-hari untuk mendeteksi pengurangan
20 sampai 30% (RISET §4). Hasil `data_kurang` atau `tak_terbedakan` adalah hasil yang paling mungkin dan tetap dilaporkan.

### 6.6 Yang tidak dinilai

Sortie, jam semai, koordinat semai, kg bahan, genangan, kejadian banjir, dan sebab-akibat (ALGORITMA §9.4).

