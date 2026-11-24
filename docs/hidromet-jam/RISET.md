# RISET: apa yang dipelajari dari 6 video, dan apa yang sudah ada di sistem

## 1. Bahan dari video (bacalangit.id, 9-17 Nov 2026)

| Video | Mekanisme | Data yang dipakai |
| --- | --- | --- |
| Ciwidey Part 1 (14 Nov) | Masa peralihan: angin monsun Australia melemah (±5,9 m/s di 1,5 km), angin lembah Cekungan Bandung, awan tumbuh di gunung lalu menjalar ke cekungan. Kronologi: radar 10.53, Cb 12.29, menguat 14.29-15.09, rusak ±14.30, 1.397 bangunan rusak (BPBD per 16 Nov). Hujan di hulu Lembang, S. Cikalintu meluap 16 Nov | Himawari-9 IR via NASA GIBS, radar BMKG Bandung, ECMWF 850 hPa dan CAPE (±1.990 J/kg) via Open-Meteo, SRTM |
| Ciwidey Part 2 | Dua cara angin perusak: udara jatuh (downburst, gust front) dan angin berputar (puting beliung, ≥±64 km/jam). 41% puting beliung terjadi jam 13-15 (Kiki dkk. 2025). Data angin Ciwidey tidak tersedia untuk publik | METAR/SPECI WIII 17 Nov: suhu 35 ke 27°C dalam ±1 jam, tekanan 1009 ke 1010 hPa, angin berbalik, embusan 21 kt (±39 km/jam), baru hujan |
| Siklon 92B/96S (14 Nov) | Sepasang pusaran di utara dan selatan khatulistiwa mendorong angin barat menguat (±40-50 km/jam di 1,5 km), angin basah menabrak Bukit Barisan, hujan lebat di lereng, banjir dari hulu. Pendukung: MJO fase 3, Kelvin dan Rossby ekuatorial, laut 28-30°C, puncak musim | Himawari, ECMWF via Open-Meteo, BMKG/TCWC, BPBD |
| Siklon update (17 Nov) | 92B jadi Siklon Akvan menjauh; 96S ke barat daya; dampak tidak langsung tetap (Siaga 17-19 Nov). Banjir belum surut di Subulussalam (8.381 jiwa) dan Aceh Tamiang (1.553 mengungsi). Tanah jenuh seperti spons basah. Pola hujan ekuatorial Aceh, puncak Nov-Des (ITCZ) | BMKG, TCWC Jakarta, BPBA, IMD |
| Jakarta 377 mm (1 Jan 2020) | Hujan lokal + kiriman hulu + laut pasang bersamaan, masuk lebih cepat dari keluar. Ambang ekstrem 150 mm/hari. Pos: Halim 377, TMII 335, Kembangan 265, Pulo Gadung 260, Tomang 226 | BMKG, IMERG 30 menit via GIBS |
| Siklus harian Jawa (9 Nov) | Darat cepat panas, angin laut, Cb sore. Di darat hujan paling banyak ±17.00, di laut menjelang pagi. Bandung ±71% hujan antara 13.00-20.00; Jakarta lebih merata | IMERG per jam Nov 2025-Okt 2026 (dihitung sendiri), Himawari |

## 2. Yang sudah ada di repo (inventaris 23 Nov 2026)

| Kemampuan | Status | Berkas |
| --- | --- | --- |
| Peringatan dini BMKG (RSS/CAP) | Tayang | `src/nowcast.js`, D1 `cuaca_nowcast` |
| METAR ±136 bandara, 6 jam, tiap 10 menit | Tayang (embusan, TS, jarak pandang) | `scripts/cuaca/metar.py`, `jarak_pandang.yml` |
| Himawari puncak awan dingin per kab | Tayang, uji kelayakan, tiap 3 jam | `scripts/udara/awan_himawari.py` |
| Himawari 10 menit (JAXA P-Tree) | Tayang, untuk titik api | `scripts/data/himawari.py` |
| IMERG harian per kab | Pipa, tanpa layar | `scripts/cuaca/imerg.py` |
| IMERG per jam per kab 2015-2026 | Lab (R2) | `panen-lab-banjir.yml` |
| GSMaP nowcast bandang 0-6 jam | Belum teruji, tidak tayang | `scripts/banjir/nowcast_bandang.py` |
| ECMWF IFS + ansambel 51 | Tayang | `scripts/banjir/hujan.py`, `ansambel_hujan.py` |
| Angin 850 hPa untuk hujan | Tidak ada | (hanya `scripts/gunungapi/abu.py`) |
| MJO, Kelvin, Rossby | Tidak ada | |
| JTWC + TCWC siklon | Tayang | `scripts/cuaca/siklon.py`, `siklon_bmkg.py` |
| Bibit siklon (invest) | Tidak ada | |
| Zona musim BMKG | Tidak ada sebagai lapisan | (`iklim_bmkg.py` teks saja) |
| Radar BMKG | Tidak ada | |
| Lapisan risiko angin kencang/puting beliung | Tidak ada | |
| Kontribusi sub-DAS hulu | Tayang, tanpa jeda waktu | `scripts/banjir/hulu.py`; prareg `PRAREG-HULU.md` |
| Simulasi dampak angin (HAZUS) dan genangan | Tayang sebagai simulasi | `public/cuaca/sim_dampak.js`, `public/banjir/sim.js` |

## 3. Pustaka

- Yang & Slingo 2001, MWR (siklus hujan harian tropis); Mori dkk. 2004, MWR (Sumatra); Qian 2008, JAS (Jawa, angin laut dan gunung).
- Fujita 1985 (downburst, microburst); NOAA/NWS (gust front, pressure jump).
- Wheeler & Hendon 2004 (indeks RMM untuk MJO); Wheeler & Kiladis 1999 (gelombang ekuatorial).
- Kiki dkk. 2025 (jam kejadian puting beliung Indonesia, dikutip di video; naskahnya belum diperiksa langsung).
- Doswell dkk. 1996 (ramalan berbasis bahan: kelembapan, ketidakstabilan, pengangkat).
