# Ambang hujan longsor per kabupaten + saring kecamatan (usulan, TIDAK dipasang)

Kode: `scripts/longsor/ambang_kab.py` (`latih`, `uji2026`, `uji`). Keluaran: `ambang_kab_param.json`, `ambang_kab_hasil.json` (CI lengkap).
Tidak ada yang di `public/` atau `status.py` diubah. Pembanding = `level_longsor` berlaku (`scripts/banjir/uji_logbook_longsor.py`).

## Protokol (ditetapkan sebelum hasil dihitung)

- LATIH: kejadian DIBI "Tanah Longsor / Gerakan Tanah / Banjir dan Tanah Longsor" 2015-2025 per kab (id_kab_bps, via `kejadian.superset`).
  2024 dibuang (DIBI hanya 222 baris longsor, lubang pelaporan; hari tanpa baris bukan negatif sah). NASA GLC tidak dipakai: tidak ada salinan lokal.
- UJI: logbook BNPB 2026 (longsor + banjir_longsor, positif = mulai +-1 hari), 1 Jan-21 Okt 2026, 92 kab yang hujan ERA5-nya ada di cache
  (sampel yang sama dengan uji aturan berlaku). Tidak ada label 2026 yang dipakai untuk fit atau memilih q.
- Hujan ambang: NASA POWER PRECTOTCORR harian, satu titik per kab (rata-rata centroid kec), 2014-12 s.d. 2026-10 (Open-Meteo tidak disentuh).
  Hujan aturan berlaku: ERA5 per sel seperti uji aslinya. Dua sumber berbeda; ini keterbatasan utama (lihat vonis).
- Fitur: r = max(persentil A3, persentil A7) terhadap klimatologi latih kab itu sendiri (gaya LHASA P95, bebas satuan), dibaca di hari d+1
  (jendela d-1..d+1 = geser -1 aturan berlaku, prakiraan sempurna).
- Ambang: tau_k = (n * kuantil_q(r di hari kejadian kab k) + M * tau_regional) / (n + M), M = 5 (empirical Bayes; kab tanpa kejadian = regional).
  q dipilih dari {0,1..0,5} dengan fit <= 2020, validasi 2021-2025 (CSI): q = 0,5 (di tepi grid; CSI validasi 0,038 EB vs 0,040 ambang regional tunggal).
  tau_regional = 0,848.
- Skor: POD/FAR/CSI/ETS, CI95 bootstrap blok per kab (500). "N sama" = N kab-hari skor tertinggi global.

## Hasil kab-hari (92 kab x 294 hari = 27048 baris; berlaku = 6.303 alarm)

| Metode | alarm | POD | FAR | CSI | ETS (CI95) | dETS vs berlaku (CI95) |
| --- | --- | --- | --- | --- | --- | --- |
| berlaku (>= Waspada) | 6303 | 0,694 | 0,985 | 0,0147 | 0,0098 (0,007-0,013) | - |
| ambang regional tunggal, ambang sendiri | 5266 | 0,291 | 0,993 | 0,0073 | 0,0024 | -0,0074 (-0,012..-0,003) |
| ambang regional tunggal, N=6303 | 6303 | 0,396 | 0,992 | 0,0083 | 0,0034 | -0,0064 (-0,010..-0,003) |
| per-kab EB, ambang sendiri | 5284 | 0,321 | 0,992 | 0,0080 | 0,0031 | -0,0066 (-0,011..-0,003) |
| per-kab EB, N=6303 | 6303 | 0,388 | 0,992 | 0,0081 | 0,0033 | -0,0065 (-0,010..-0,003) |
| acak, N=6303 | 6303 | 0,216 | 0,995 | 0,0045 | -0,0003 | -0,0101 |
| hibrida: berlaku DAN EB>=tau | 2504 | 0,276 | 0,985 | 0,0142 | 0,0095 | -0,0003 (-0,005..+0,005) |
| berlaku, N=2504 (skor sendiri dipetik lebih ketat) | 2504 | 0,403 | 0,978 | 0,0209 | 0,0162 (0,010-0,024) | +0,0064 (+0,002..+0,011) vs berlaku penuh |

AUC kab-hari: berlaku 0,829 (0,78-0,87); ambang regional 0,693; per-kab EB 0,689 (0,64-0,73).

## Hasil kec-hari (baseline: berlaku per kec, 43.442 alarm, POD 0,47, FAR 0,9965, ETS 0,0026)

| Metode | alarm | POD | FAR | ETS | dETS (CI95) |
| --- | --- | --- | --- | --- | --- |
| EB kab, semua kec | 58317 | 0,47 | 0,9974 | 0,0017 | -0,0009 (-0,002..0,000) |
| EB kab + bahaya InaRISK >= median (0,33) | 30560 | 0,34 | 0,9963 | 0,0027 | +0,0001 (-0,001..+0,001) |
| EB kab + kec berriwayat logbook (hanya masa lalu) | 2642 | 0,03 | 0,9962 | 0,0025 | 0,0000 (-0,004..+0,009) |
| hibrida kab (berlaku DAN EB), kec berlaku | 16900 | 0,27 | 0,9947 | 0,0042 | +0,0017 (0,000..+0,004) |
| berlaku kec + berriwayat | 2849 | 0,08 | 0,991 | 0,0074 | +0,0048 (-0,003..+0,019) |

Catatan: tidak ada lapisan kerentanan lereng/tanah/sesar per kec di repo (modul longsor belum ada); satu-satunya adalah `bahaya.json:longsor`
(InaRISK), yang di mana-mana mendekati 1,0 sehingga penyaringnya hampir tak menyaring. Riwayat kec dari logbook 2026 hanya diuji ke depan
(kejadian >= 3 hari sebelum hari itu); riwayat DIBI per kec tidak ada (DIBI per kab). Penyaring riwayat memangkas alarm 94-95% tetapi POD ikut ke 3-8%.

## Vonis: GAGAL (ambang per-kab tidak mengurangi alarm palsu), dan jangan pasang

1. Ambang per-kab tidak lebih baik daripada ambang regional tunggal (CSI validasi hampir sama; 2026 ETS 0,0031 vs 0,0024, CI saling tumpang), dan keduanya
   JAUH di bawah aturan berlaku pada N alarm yang sama (dETS -0,0065, CI tidak melewati 0). Kejadian per kab terlalu sedikit; shrinkage menariknya ke regional.
2. Peringatan jujur: kekalahan sebagian berasal dari sumber hujan (POWER ~0,5 derajat, satu titik per kab) melawan ERA5 per sel/kec yang dipakai aturan berlaku.
   Uji ini tidak memisahkan sumber dari metode; yang bisa disimpulkan hanya "ambang persentil POWER per kab tidak menolong", bukan "ambang per-kab tak mungkin".
   Mengulang dengan hujan ERA5/IMERG multi-tahun per sel (Open-Meteo dikunci untuk agen lain) adalah langkah yang adil berikutnya.
3. Penyaring kec: bahaya InaRISK tidak membedakan; riwayat menekan FAR hanya dengan membunuh POD. Tidak ada yang lolos.
4. Satu temuan yang bisa ditindaklanjuti dan TIDAK butuh data baru: menaikkan potongan aturan berlaku (N 6303 -> 2504 alarm) membuat FAR 0,985 -> 0,978,
   ETS 0,0098 -> 0,0162 (dETS +0,006, CI +0,002..+0,011), POD 0,69 -> 0,40. Itu pilihan tukar-tambah POD vs FAR, bukan perbaikan model; FAR tetap 97,8%.
   Usulan (bukan perubahan): bila produk butuh lebih sedikit alarm, naikkan batas Waspada, lalu uji ulang di logbook 2027 yang belum dilihat.
5. FAR 98% sebagian besar artefak label (logbook hanya laporan BPBD; hari tanpa laporan dihitung negatif), sehingga FAR absolut tak bisa turun jauh pada label ini.

## Ulang

```
python3 scripts/longsor/ambang_kab.py latih     # ~45 dtk, unduh POWER (data/raw/longsor_ambang, gitignored) + DIBI
python3 scripts/longsor/ambang_kab.py uji2026   # ~35 dtk, butuh data/raw_logbook (cache ERA5 2026)
python3 scripts/longsor/ambang_kab.py uji
```
