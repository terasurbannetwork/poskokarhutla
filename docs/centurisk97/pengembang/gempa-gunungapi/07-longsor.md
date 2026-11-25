# Metode longsor

Halaman ini menguraikan metode longsor: status harian, nowcast, dan simulasi.

## Longsor: status harian per kecamatan (aturan produksi)

Berkas: `scripts/banjir/status.py` (milik `banjir`). Ambang H3 (hujan 3 hari) Waspada, Siaga, Awas = 50, 100, 150 mm dikali `K_LONGSOR = 0,6`, jadi 30, 60, 90 mm (`status.py:59`). Tanah jenuh bila `sm >= 0,45` dan `a7 >= 25 mm` (`SM_JENUH`, `A7_BASAH`); tanpa `sm`, jenuh bila `a7 >= 150`. Aturan (`level_longsor`, `status.py:88`):

```
Awas   : H3 >= 90 dan jenuh dan bahaya >= 0,66
Siaga  : (H3 >= 60 dan jenuh dan bahaya >= 0,66) atau (H3 >= 90 dan bahaya >= 0,33)
         atau (intensitas maks >= 20 dan bahaya >= 0,66)
Waspada: H3 >= 30 dan bahaya >= 0,33
selain itu Normal
```

![Tangga ambang hujan 3 hari (H3) untuk status longsor: Waspada mulai 30 mm, Siaga 60 mm, Awas 90 mm, masing-masing bersyarat bahaya kecamatan dan tanah jenuh. Sumber: scripts/banjir/status.py.](gambar/gempa-gunungapi-longsor-tangga-longsor.svg)

`bahaya` adalah indeks bahaya longsor per kecamatan dari modul banjir; asalnya belum terdokumentasi di dokumen ini. Komentar kode menyatakan ambang dipilih pada 2016 sampai 2021 dan lolos pada 2022 sampai 2025 (`status.py:57`); angkanya tidak diverifikasi ulang di sini.

## Longsor: nowcast kerentanan dikali hujan (model gagal uji)

Berkas: `scripts/longsor/model.py`, `rumus.py`; keluaran `kerentanan.json`, `nowcast.json`, `uji_balik.json`.

```
S = bobot_lereng x skor_lereng + bobot_tanah x skor_tanah + bobot_sesar x skor_sesar
v1: 0,6 / 0,2 / 0,2     v2 (30 Okt 2026): 0,5 (lereng) / 0,3 (zona PVMBG) / 0,2 (sesar)   (rumus.py:15-16)
skor_lereng: 0 di 5 derajat, 1 di 30 derajat (linear)
skor_tanah : (CN - 49) / (84 - 49), dipotong 0..1  (CN tanah dari tekstur USDA -> HSG -> CN2)
skor_sesar : 0 di 50 km atau lebih dari sesar (SESAR_JAUH)
t = hujan 7 hari / P95 hujan 7 hari sel (sel 0,5 derajat, tahun latih 2017 sampai 2021)
Bahaya tinggi : t >= 1 dan S >= 0,50
Bahaya sedang : (t >= 1 dan S >= 0,30) atau (t >= 0,8 dan S >= 0,50)
```

Bobot dan ambang tetap, tidak dilatih pada label. Nowcast harian memakai `a7` (hujan 7 hari teramati) dari `public/banjir/data/hujan.json` (Open-Meteo), sedangkan P95 dari ERA5: dua model hujan berbeda, jadi t bukan ukuran pasti. Sasaran uji: kabupaten-hari dengan kejadian DIBI "Tanah Longsor" atau "Gerakan Tanah"; hari "Banjir dan Tanah Longsor" murni dikeluarkan. Uji pada 2022, 2023, 2025 (2024 dibuang karena DIBI tidak lengkap). Vonis LOLOS hanya bila AUC model sama dengan atau lebih dari pembanding terbaik ditambah 0,02, AUC 0,60 atau lebih, dan POD lebih besar dari POD hujan-saja pada laju peringatan sama.

Hasil uji (`uji_balik.json`, varian v2, 3 Nov 2026): 453 kabupaten, 515 dari 948 sel hujan, 495.760 kabupaten-hari, 2.227 positif. AUC model 0,7047 (selang bootstrap blok 0,6843 sampai 0,7201), hujan-saja 0,6812, kerentanan-saja 0,5815, zona PVMBG saja 0,6556, klimatologi kabupaten kali bulan 0,7773 (selang 0,7579 sampai 0,7986). Selisih model minus pembanding terbaik -0,1039 sampai -0,0496. POD kelas sedang atau tinggi 0,1684 dengan FAR 0,9873. Vonis GAGAL tiga kali berturut-turut (29 Okt, 30 Okt, 2 Nov; versi sebelumnya model v1). Makin banyak sel, AUC model turun (170 sel 0,736; 320 sel 0,727; 515 sel 0,705) sementara klimatologi stabil. Jangan memperbaiki dengan menyetel bobot pada tahun uji. Status: HIPOTESIS.

![Perbandingan AUC uji balik nowcast longsor: model v2 0,7047 kalah dari klimatologi kabupaten dan bulan 0,7773. Sumber: uji_balik.json, 3 November 2026.](gambar/gempa-gunungapi-longsor-auc-longsor.svg)

Rencana pemulihan (`PRAREG-LHASA2.md`, draf revisi 2, belum dibekukan): resep LHASA v2 dengan lantai klimatologi sebagai offset. Hasil paling mungkin ditulis di dokumen itu sendiri: tidak meyakinkan. Sumber tambahan: `ambang_kab.py` (ambang hujan per kabupaten dengan penyusutan ke ambang regional, uji pada logbook BNPB 2026) tidak mengubah aturan produksi; zona PVMBG dari salinan sigi.pu.go.id (`pvmbg.py`; situs ESDM tidak disentuh karena `robots.txt` melarang); tanggapan MAGMA (`tanggapan_pvmbg.py`, izin pemilik 10 Nov 2026).

## Longsor: simulasi peluang longsor dangkal

`public/banjir/sim_longsor.js`: model lereng tak-hingga (`FS = [c' + (gs - m gw) z cos^2 b tan(phi)] / (gs z sin b cos b)`), `m` = tinggi muka air relatif dari model ember (hujan 7 hari dikurangi bagian yang hilang `HILANG = 0,5`, kecuali tanah jenuh menurut `status.py`). Asumsi: `gs = 19 kN/m3`, tebal tanah 1,5 m, porositas 0,45, kapasitas lapang 0,3, `c'` seragam 2 sampai 10 kPa, `phi` 26 sampai 36 derajat, lereng dipotong 45 derajat. Peluang = bagian ruang `(c', phi)` dengan `FS < 1` (tepat untuk `c'`, titik tengah 32 nilai untuk `phi`). Kohesi dan sudut gesek tidak diketahui per sel. Status: ilustrasi, tanpa uji balik.
