# ALGORITMA: Kemampuan Inti

## 1. Pembanding (KI-10)

- **Persistensi:** keadaan hari d dipakai sebagai prakiraan d+k. Untuk label laporan, yang dipakai tanggal pertama dicatat, supaya tidak bocor dari laporan susulan.
- **Klimatologi kab x bulan:** laju kejadian per (kab, bulan) dari periode latih saja, dengan penyusutan (k+0,5)/(n+1) seperti `susulan.py`.
- **Jumlah alarm sama:** ambang pembanding digeser sampai jumlah alarmnya sama dengan model. Baru sesudah itu POD, FAR, CSI, ETS, dan PSS dibandingkan.
- **Bootstrap blok berpasangan:** blok tahun-bulan atau pulau x minggu, B ≥ 300. Model dan pembanding memakai indeks ulang yang sama.
- **pilih_wilayah:** parameter wilayah dipakai hanya bila Brier validasi DAN log-likelihood validasi lebih baik daripada parameter nasional. Selain itu yang dipakai parameter nasional.

## 2. Sidik dan buka sekali (KI-11)

- `sidik = sha256(kode yang diimpor + berkas kriteria + daftar hash masukan)`, dipotong 16 heksa.
- `buka` membuat penanda dengan O_EXCL. Penanda yang sudah ada berarti tolak.
- Jejak `{waktu, sidik, hasil}` ditulis append-only.
- Bila `cek` menemukan sidik berbeda sesudah penanda buka ada, skrip keluar dengan kode 3.

## 3. Gerbang tampil (KI-12)

`boleh_tampil = selisih > 0 DAN batas bawah selang 95% > 0`, dengan arah metrik dicatat (tinggi atau rendah lebih baik).

- Tanpa selang hasilnya false, dengan alasan "belum ada selang".
- Keluaran prospektif juga mensyaratkan `vonis == "lolos"`.
- Pembaca di layar gagal-tertutup: berkas hilang, JSON rusak, atau entri tidak ada berarti pil hipotesis.

## 4. Selang konformal (KI-14)

- Split conformal pada residu absolut, atau CQR untuk kuantil.
- `q` = kuantil ke-⌈(n+1)(1-α)⌉/n dari skor kalibrasi. α = 0,2 memberi pita 80%.
- Cakupan dihitung di periode uji terpisah.
- Pita tidak tampil bila prakiraan berada di luar rentang masukan kalibrasi (gerbang lebar).

## 5. Mutu label (KI-16)

- **Cakupan:** sumber s mencakup (kab, bulan) bila s pernah menerbitkan apa pun untuk kab itu di bulan itu. Bila tidak ada sumber yang mencakup, kab-bulan itu "tak teramati", bukan negatif.
- **Laporan latihan:** kata kunci latihan, simulasi, atau uji coba, ditambah baris dengan pelapor berulang di koordinat sama, dibuang.
- **Kab layak:** CSI persistensi tanpa bocor tidak lebih baik daripada klimatologi plus 0,05, dan cakupan ≥ 80% bulan.

## 6. Lift peringatan berantai (KI-51)

- `lift = P(B dalam jendela | A) / P(B dalam jendela)` per kab, dihitung dari DIBI dan logbook.
- CI95 dari bootstrap blok tahun.
- Pasangan dibuka hanya bila batas bawah CI > 1.

## 7. Lonjakan (KI-52)

- Binomial negatif dengan rerata dan overdispersi dari 365 hari terakhir per sasaran.
- Ekor atas p dikali jumlah sasaran harus < 0,01, dan hitungan minimal 3.
- Tingkat menyala dihitung mundur dan ditulis di JSON.

## 8. Rantai kerusakan banjir (KI-60)

- `rusak_rumah = Σ_sel bangunan_sel x f_JRC(kedalaman_sel) x c`.
- c adalah satu pengali yang dikalibrasi ke rumah rusak DIBI.
- Galat LOO = faktor geometris median |log(model/teramati)| saat satu kejadian ditinggalkan.

## 9. Faktor sisi aman (KI-43)

- Waktu tampilan memakai median.
- Waktu sisi aman memakai persentil 10 waktu tempuh, atau kecepatan atas pada lahar.
- Invarian: waktu sisi aman ≤ waktu tampilan.
