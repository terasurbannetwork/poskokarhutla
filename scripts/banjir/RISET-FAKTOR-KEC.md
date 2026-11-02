# Faktor bahaya banjir per kecamatan

`faktor_kec.py` (`ambil`, `susun`, `uji`) menulis `public/banjir/data/faktor_kec.json`: 7.270 kecamatan, kunci `"prov|kab|kec"` sama dengan `bahaya_kelas.json`. Dipakai untuk kartu "Kenapa rawan" dan kalibrasi model bahaya. Python stdlib saja; cache di `data/raw/banjir/faktor_kec/` (`elevasi.json` per titik, `status.json` hitungan panggilan per hari).

## Faktor

| Kolom | Sumber | Satuan | Cara hitung |
| --- | --- | --- | --- |
| elev_p10/p50/p90, relief | Open Topo Data SRTM 90 m (atau Open-Meteo Copernicus GLO-90) | m dpl | kisi titik di dalam poligon, kuantil interpolasi; relief = p90 - p10 |
| rendah | turunan elevasi | % titik | titik dengan elevasi < p10 kabupaten + 5 m |
| padat | `risiko_kecamatan.json` pend, `bahaya_kelas.json` km2 | jiwa/km2 | pend / km2; penduduk 0 = 0 |
| zona_tinggi, zona_sedang | InaRISK banjir (`bahaya_kelas.json`) | % luas | kelas tinggi dan sedang; tanpa kunci banjir = 0 (benar-benar tanpa zona: pengambilan ulang 31 Okt 2026 mencatat 0 gagal) |
| pesisir | `rob.json` titik | 0/1 | kecamatan punya titik rob |
| jarak_sungai | `sungai.json` titik GloFAS | km | haversine titik berat ke titik terdekat |
| kej_100rb, kej_100rb_latih | `kejadian.json` kab | per 100 ribu jiwa | banjir + bandang kabupaten / jumlah pend kecamatannya; kej_100rb 2008-2025 (tampilan), kej_100rb_latih 2008-2021 (model, di luar jendela uji 2022-2025) |
| pct_* | semua kecamatan non-null | 0-100 | % kecamatan yang nilainya LEBIH KECIL secara ketat (seri tidak dihitung) |
| pctr_elev_p50, pctr_relief, pctr_jarak_sungai | idem | 0-100 | % kecamatan yang nilainya LEBIH BESAR secara ketat, untuk kalimat "lebih rendah/dekat dari X% kecamatan" |

Kisi: n = clamp(luas km2 / 4, 4, 25) titik, kisi persegi di kotak pembatas, hanya yang jatuh di dalam poligon (paritas semua cincin, jadi lubang dan bagian jamak benar), lalu dijarangkan merata ke n. Titik dibulatkan 4 desimal (~11 m) dan dicache per titik. Nilai belum terambil = `null`, bukan 0; elevasi diisi hanya bila minimal min(jumlah titik, 3) titik terambil.

## Kuota

Temuan 31 Okt 2026: Open-Meteo menghitung kuota PER LOKASI, bukan per panggilan (100 titik = 100 unit; 429 "Minutely" muncul setelah ~7 panggilan 100 titik). Kuota 10.000/hari dipakai bersama pipeline harian, jadi batas 2.500 unit = 25 panggilan = 2.500 titik/hari; ~127.700 titik butuh ~51 hari. Karena itu `ambil` punya dua sumber:

- `--sumber topo` (default): Open Topo Data, SRTM 90 m, 100 titik/panggilan, 1 panggilan/dtk, 1.000 panggilan/hari (dipakai 900). ~1.280 panggilan: dua hari. Tidak menyentuh kuota Open-Meteo.
- `--sumber meteo`: Open-Meteo Copernicus GLO-90, 2.500 titik/hari (`--maks` dalam titik).

Cache terpisah per sumber (`elevasi_<sumber>.json`, `status_<sumber>.json`); `susun --sumber` memilih satu, tidak mencampur. SRTM mengembalikan `null` di atas air: titik itu dilewati, bukan dianggap 0. Lanjut hari berikutnya: `python3 scripts/banjir/faktor_kec.py ambil`. Berhenti bersih saat `KuotaHabis`.

## Keterbatasan

- ASUMSI: `rendah` hanya proksi dataran banjir lokal; HAND butuh GDAL dan arah aliran, tidak tersedia. Kabupaten pegunungan punya p10 tinggi sehingga "rendah" relatif terhadap kabupaten, bukan terhadap muka laut.
- Piksel 90 m dan paling banyak 25 titik: tanggul, parit, dan relief kecil tidak tertangkap; relief kecamatan luas bisa terlalu kecil.
- `pesisir = 0` artinya tidak ada titik rob di berkas, bukan terbukti tidak berpantai. Tidak ada data garis pantai di repo, jadi jarak pantai tidak tersedia.
- Jarak sungai adalah garis lurus ke titik GloFAS (192 titik, kisi 0,05 derajat), bukan alur sungai sebenarnya.
- Kejadian DIBI di tingkat kabupaten, sama bagi semua kecamatannya; DIBI mencatat satu kejadian lintas kabupaten lebih dari sekali dan 2024 tidak lengkap.
- Hujan ekstrem tidak tersedia: ERA5 harian di `data/raw/banjir/uji_balik/` hanya 104 sel, dan `riwayat_grid.json` adalah kejadian DIBI. Arsip ERA5 tidak dipanggil untuk 7.270 kecamatan.
- Faktor belum diuji balik terhadap kejadian; persentil hanya deskriptif.
- q2 GloFAS dibuang dari keluaran: hanya 14 dari 192 titik punya q2.
