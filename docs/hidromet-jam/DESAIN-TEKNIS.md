# DESAIN TEKNIS

## Alur data

```
NOAA S3 Himawari B13 ──► awan_himawari.py (pembaca) ──► awan_tumbuh.py ──► public/udara/data/awan_tumbuh.json
BMKG Aviation METAR 6 j ─► metar.py (+ embusan_badai) ─► jarak_pandang.json, cuaca_metar.json
R2 lab IMERG per jam ───► jam_hujan.py ───────────────► public/cuaca/data/jam_hujan.json (bulanan)
JTWC RSS + ABIO10/ABPW10 ► siklon.py (+ bibit) ───────► cuaca_siklon.json
Open-Meteo 850 hPa ─────► faktor_orografi.py ─────────► arsip faktor (lab), tidak tayang
RMM harian ─────────────► mjo.py ─────────────────────► public/data/mjo.json + arsip
terdampak.py ───────────► faktor_surut.py ────────────► arsip faktor (lab)
Open-Meteo CAPE dll ────► bahan_badai.py ─────────────► arsip faktor (lab), tidak tayang (Q2)
hulu.py + DEM ──────────► jeda_hulu.py ───────────────► arsip faktor (lab)
semua di atas + laporan ► kronologi.py ───────────────► docs/hidromet-jam/AUDIT-*.md
```

## Prinsip

- Pembaca yang sudah ada diimpor, tidak disalin (pembaca biner Himawari, `dasar.simpan`, `dasar.sekarang`).
- Berkas keluaran memuat `sumber`, `diperbarui`, `catatan` (keterbatasan) seperti berkas cuaca lain.
- Faktor model diarsip append-only dengan waktu terbit, supaya uji arsip tidak bocor.
- Tidak ada dependensi baru. Python stdlib; layar vanilla JS.

## Anggaran

| Skrip | Jadwal | Biaya jaringan per run |
| --- | --- | --- |
| awan_tumbuh.py | 30 menit | 2 pindaian × ±12 MB (segmen Indonesia) |
| metar.py | 10 menit (sudah) | tidak bertambah |
| siklon.py | harian (sudah) + 2 teks kecil | ±10 KB |
| mjo.py | harian | ±100 KB |
| faktor_orografi.py, bahan_badai.py | harian | 1-2 panggilan Open-Meteo bertumpuk per batch kab (jaga kuota 429) |
| jam_hujan.py | bulanan | baca arsip R2 ±hingga ratusan MB |
