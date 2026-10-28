# Tafsir KRITERIA-M1: n_musim

Ditetapkan pemilik 28 Oktober 2026, SEBELUM M1 dibekukan ("tafsir n_musim ikut teks harfiah
(aturan b, n=3)"). `KRITERIA-M1.md` tetap tidak diubah; berkas ini menutup satu kalimat yang
ambigu di sana dan ikut masuk sidik M1 (sha256 berkas ini ditulis di `m1_beku.json`).

Kalimat yang ditafsir: "`n_musim` bilangan bulat terkecil yang membuat proporsi kecamatan-hari
positif musim itu tidak melebihi median proporsi musim 2017/18 sampai 2022/23 menurut aturan (b)
dengan n = 3."

Tafsir:
1. Acuan = median, atas musim 2017/18 sampai 2022/23, dari proporsi kecamatan-hari dengan jumlah
   laporan PetaBencana >= 3 (aturan (b) SAJA, tanpa aturan (a)).
2. `n_musim` = bilangan bulat terkecil n >= 1 sehingga proporsi kecamatan-hari yang memenuhi
   (a) ATAU (jumlah laporan >= n) pada musim itu <= acuan.
3. Bila tidak ada n yang memenuhi karena aturan (a) sendiri sudah melebihi acuan, `n_musim` tak
   hingga: label musim itu hanya aturan (a) (laporan berkedalaman >= 10 cm). Ini dicatat per musim.
4. Tafsir yang sama berlaku untuk kalibrasi 2017-2023 dan untuk musim uji 2026/27.
