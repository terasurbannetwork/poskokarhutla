# Kejadian aktif, dampak, peringatan

Halaman ini menjelaskan metode kejadian aktif, dampak, peringatan BMKG, telusur hulu, dan bukti DAS.

## 8. Kejadian aktif dan skor (`scripts/banjir/kejadian_aktif.py`)

Kejadian adalah gugus kecamatan bersebelahan (berbagi sisi batas) yang statusnya hari ini Siaga atau lebih; kecamatan Siaga sendirian juga satu kejadian. Kode `B0001`, `B0002`, dan seterusnya stabil antar-jalan: gugus baru dicocokkan satu-satu menurut irisan anggota terbesar, gugus tanpa irisan mendapat nomor baru dan nomor tidak pernah dipakai ulang. Skor 0 sampai 100:

```
skor = tingkat 40 (Siaga 0,6; Awas 1)
     + penduduk 30 (log10(1 + jiwa) / 6,5, maksimum 1)
     + jumlah kecamatan 15 (n / 10, maksimum 1)
     + bahaya InaRISK banjir 15 (nilai maksimum)
```

Komponen yang tidak ada dibuang dan bobotnya dibagi ulang; penduduk atau bahaya yang tidak tercatat tidak diisi nol (`kejadian_aktif.py:138`, `:238`). Status hari ke-0 yang tidak sama dengan `hujan.hari_ini` membuat skrip keluar non-nol tanpa menulis.

## 9. Dampak (`dampak.py`, `dampak_kab.py`)

- `dampak.py` menjumlah penduduk (WorldPop), sekolah dan siswa, puskesmas, klinik, rumah sakit (OSM), dan panjang jalan berisiko di kecamatan Siaga atau Awas hari ke-0 sampai ke-3. Bagian tanpa data dibuang. Kejadian tahunan dan korban dari DIBI.
- `dampak_kab.py` membangun paparan statis per kabupaten (`paparan_kab.json`): penduduk kecamatan dikali porsi luas kelas bahaya banjir (tinggi, serta sedang ditambah tinggi), anggapan merata. Rumah setara dibagi 3,5 jiwa per keluarga (asumsi `PRAREG-DAMPAK.md`).
- Keluaran harian `terpapar_hujan_kab.json`: jiwa di zona bahaya dikali peluang HUJAN. Hari masuk bila `p50 >= AMBANG_P` (0,195; sekitar 10 dari 51 anggota, `dampak_kab.py:25`). Rentang `[bawah, atas]` dengan bawah = `p100` kali zona tinggi (kosong bila `p100 < 0,05`) dan atas = `p50` kali zona sedang ditambah tinggi, dua angka bermakna. Kabupaten dengan kecamatan tanpa nilai bahaya lebih dari 30 persen ditandai `paparan_terlalu_rendah`. Ini bukan perkiraan korban dan tanpa klaim akurasi.

## 11. Peringatan resmi dan nowcast BMKG (`peringatan.py`, lapisan "Sedang hujan")

`peringatan.py` membaca nowcast CAP BMKG dan peringatan gelombang maritim ke `peringatan.json`. Lapisan "Sedang hujan" membaca area peringatan yang sedang berlaku (mulai lebih kecil atau sama dengan kini dan kini lebih kecil dari selesai) langsung dari `/api/cuaca/nowcast`, yang ditarik Worker tiap 10 menit dari RSS BMKG (`src/nowcast.js`). Hover memuat hujan terukur pos terdekat dalam 25 km (hanya Jawa) dan status wilayah; tanpa pos, nilainya "–". Domain BMKG memberi 403 ke klien tanpa agen pengguna peramban; tantangan Cloudflare tidak dibobol dan `signature.bmkg.go.id` tidak dipakai.

## 12. Telusur hulu dan jeda hulu ke hilir (`hulu.py`, `jeda_hulu.py`)

`hulu.py`: dari data `bukti/<slug>.json` (sub-DAS dan irisan sel hujan 0,25 derajat) dihitung volume hujan per sub-DAS = jumlah (hujan sel kali luas irisan), persen = volume sub-DAS dibagi volume seluruh DAS, dua jendela (3 hari terakhir sampai hari ini dan 3 hari ke depan). Sel tanpa data tidak diisi dan cakupannya ditulis.

`jeda_hulu.py`: waktu tempuh Kirpich per sub-DAS ke kecamatan keluaran:

```
t_c = 0,0195 * L^0,77 * S^-0,385     menit, L meter, S = beda tinggi / L
L = jarak garis lurus titik tengah sub-DAS ke titik tengah sub-DAS keluaran, dikali SINUOSITAS (bawaan 1,0)
```

Tinggi hulu = persentil 90 titik SRTM 90 m dalam jari-jari setara luas, tinggi hilir = persentil 10 di sekitar keluaran. Keterangan operasional deskriptif, tidak mengubah fitur atau vonis apa pun. Pembanding terukur hanya satu replay (Maret 2025: pos hulu ke pos hilir 8,5 jam).

## 13. Bukti DAS dan citra (`bukti_das.py`, `citra_banjir.py`)

Batas DAS dari HydroBASINS v1c level 9 (rantai NEXT_DOWN). Hutan hilang per tahun dari Hansen GFC (dibaca per blok 32 baris lewat Range). Konsesi di hulu dari data konsesi repo. Citra: Sentinel-2 L2A warna asli "sebelum" (adegan paling bersih Juni 2019 sampai Oktober 2020) dan "sesudah" (14 bulan terakhir), Sentinel-1 RTC VV dalam dB dari Planetary Computer untuk kejadian DIBI terbesar sejak 2017 ("sesudah" = pengamatan pertama 0 sampai 12 hari sesudah tanggal, "sebelum" = pengamatan terakhir 8 sampai 45 hari sebelumnya pada orbit relatif sama). "Gelap baru" = piksel di bawah -17 dB sesudah dan -17 dB atau lebih sebelum. Ini indikasi radar, bukan luas banjir resmi (sawah berair dan bayangan ikut terhitung). Dijalankan manual lewat `workflow_dispatch` input `bukti` karena DAS dan hutan hilang berubah setahun sekali.
