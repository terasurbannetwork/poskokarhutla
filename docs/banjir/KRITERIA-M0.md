# Kriteria uji M0: kurva hujan pemicu genangan per kecamatan DKI

Dikunci 27 Oktober 2026 sebelum satu angka hasil pun dilihat, atas persetujuan pemilik
("Gas semua setuju", 27 Okt 2026, atas `RISET-MODEL-GENANGAN.md` §5.1 dan §8 butir 1-2).
Berkas ini tidak boleh diubah sesudah hasil latih atau validasi dilihat. Skrip M0 menulis
sha256 berkas ini ke keluarannya; bila hash berbeda, hasil uji tidak sah.

## Unit dan label
- Unit: kecamatan DKI Jakarta (44) x hari, musim hujan November sampai April.
- Positif: hari dengan laporan tergenang PetaBencana di kecamatan itu sebanyak paling sedikit
  `n_lap`, ATAU paling sedikit satu laporan berkedalaman >= 10 cm. `n_lap` dipilih dari
  {1, 2, 3, 5} memakai data latih saja.
- Negatif: semua hari musim hujan lain yang punya data hujan. Tidak dicocokkan ke positif.

## Pembagian waktu
- Latih 2017-2022, validasi 2023, uji 2024-2025.
- Uji dibuka SEKALI. Sebelum dibuka, sha256 parameter terpilih dan kode ditulis ke keluaran.
- Hasil 2024 dan 2025 dilaporkan juga terpisah. Ambang tidak dipilih memakai 2024.

## Pembanding wajib (dihitung di uji yang sama)
- (a) klimatologi per bulan per kecamatan;
- (b) satu ambang hujan harian seragam se-kota, dipilih di latih;
- (c) aturan status banjir yang berlaku sekarang (`scripts/banjir/status.py`), bila dapat diterapkan per kecamatan.

## Lulus bila, pada data uji 2024-2025
1. POD >= 0,60;
2. FAR <= 0,60;
3. batas bawah selang kepercayaan 95% bootstrap blok berpasangan (blok kecamatan x tahun,
   1.000 ulangan) dari selisih ETS (M0 dikurangi pembanding terbaik) > 0.

Gagal satu saja = keluaran tetap terbit dengan pil "Hipotesis, belum lolos uji" dan rentang,
bukan angka utama. Kinerja ditulis apa adanya, termasuk bila buruk.

## Keterbatasan yang wajib disebut di kartu
Laporan PetaBencana bias pelapor (2024 berisi laporan jauh lebih banyak); ketiadaan laporan
bukan bukti kering; hujan jam belum dikoreksi bias karena data pos hujan DSDA/BMKG belum diminta
(surat ditunda pemilik, 27 Okt 2026).
