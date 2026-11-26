# RISET: bahan yang sudah ada untuk mode Peringatan Alun-alun

Dipetakan 26 Nov 2026 dari kode repo. Rujukan `berkas:baris` saat dipetakan; periksa ulang sebelum dipakai.

## 1. Dashboard pembanding

Dashboard hidromet InaRISK (`inarisk.bnpb.go.id/dashboard-monev-bencana/dashboard-hidromet/`), diamati 26 Nov 2026 dari tangkapan layar pemilik. Bagiannya: kepala ringkas status tertinggi dan jumlah kab per status; kartu ONI dan IOD; tujuh kartu bahaya (banjir, banjir bandang, longsor, gelombang, karhutla, kekeringan, cuaca ekstrem); peta lingkaran per kab dengan menu lapisan (InaRISK, batas, BMKG CAP dan nowcast, prediksi hujan bulanan, angin, Himawari, GPM, titik panas); daftar kab teratas; peringatan BMKG aktif; matriks cara membaca status; analisis wilayah; prakiraan BMKG tingkat desa; desa bahaya tinggi terbanyak; rekomendasi per pihak; definisi; sumber data. Status mereka dari satu titik sampel Open-Meteo per kab tanpa uji balik terlihat; angka penduduk dari raster InaRISKPOP tanpa pembulatan. Cara kita dibahas di paket induk RISET bagian 6.

## 2. ONI dan IOD

- `scripts/data/iklim.py`: ONI dan RONI dari CPC, status ENSO dari teks CPC, DMI mingguan dari NOAA OSMC. Status IOD dari rerata DMI 8 minggu (positif bila paling sedikit +0,4).
- Jadwal `.github/workflows/data.yml` tiap Senin. Keluaran `public/data/iklim.json`: `status`, `oni_terakhir`, `roni_terakhir`, `iod_status`, `dmi_8_minggu`, `dmi_umur_hari`, `dmi_basi`, deret `oni`, `roni`, `dmi`.
- DMI basi: data terakhir 27 Sep 2026, `iod_status` null. Cadangan BoM `iod_1.txt` sudah dibaca, tetapi hanya untuk `prospek_musim.json`.
- Tampil: pil di `public/kekeringan/app.js`, kartu "Outlook iklim" `public/semua/analisis.js`. Pil kepala peta utama disembunyikan pemilik 20 Nov 2026.

## 3. GloFAS

- Per titik sungai: `scripts/banjir/sungai.py` (Open-Meteo Flood API, ambang Q2, Q5, Q20 Gumbel 1997-2025), `public/banjir/data/sungai.json` 192 titik, harian di `banjir.yml`. Tampil di `/banjir`.
- Per kab: `scripts/banjir/debit_glofas.py` dengan titik `scripts/banjir/data/titik_glofas_kab.json` (514 kab), hasil hanya cache `data/raw/banjir/glofas/`, tidak ada keluaran publik.
- Validasi: PRAREG-DEBIT, Uji A dan B belum dibuka; vonis paling cepat 1 Jun 2027.

## 4. Banjir bandang

- Tidak ada kode status. Label DIBI "Banjir Bandang" digabung ke BNJ (`status_prakiraan_uji.py`, `koreksi.py`, `nilai.py`).
- Lapisan bahaya bandang InaRISK dibaca `scripts/banjir/bahaya.py` per kecamatan (`public/banjir/data/bahaya.json`, `bahaya_kelas.json`). `scripts/siklus/kelas_kab.py` hanya banjir dan longsor.
- Nowcast GSMaP `nowcast_bandang.py`: arsip saja, PRAREG-BANDANG draf, tidak dipakai di sini.

## 5. Prakiraan BMKG per desa

- `scripts/cuaca/bmkg_prakiraan.py`: `api.bmkg.go.id/publik/prakiraan-cuaca?adm4=`, satu desa wakil per kab (`scripts/cuaca/data/desa_wakil_kab.json`), 55 per menit. Dari Mac dijawab 403, dari runner 200.
- `scripts/banjir/arsip_bmkg_desa.py`: arsip mentah per 3 jam desa wakil. Catatan lisensi di kepala berkas: data terbuka BMKG, atribusi wajib, batas resmi 60 per menit per IP.
- Worker tidak punya proksi BMKG.

## 6. Analisis wilayah

- Hujan per kab hari +1 sampai +3: `public/prediksi/data/prediksi.json` kode HJN kolom `tot`.
- Gelombang: kode GEL kolom `hs`, 139 kab pesisir.
- Status per kab per bahaya per hari: `data/raw/prediksi/status.json` (`kab[k][KODE].hari[0..3]`), di R2, rute `/api/dampak-peringatan/status`.
- Hari tanpa hujan: `kekeringan_hth.json` dari `scripts/kekeringan/hth.py`, basi sejak 19 Okt 2026, tidak dijadwalkan.
- Kelas InaRISK: `public/data/kelas_bahaya_kab.json` (banjir dan longsor per kab). Per desa tidak ada. `public/data/inarisk/irbi.json` adalah indeks per kab.
- Belum ada layar matriks atau daftar teratas.

## 7. Rekomendasi

- `public/ews_tindakan.js`: katalog bersumber per bencana kali tingkat, untuk warga, rujukan Buku Saku BNPB 2012 dan 2019 berhalaman.
- `public/bencana.json` `tindakan`: catatan tindakan dari logbook, bukan anjuran.
- `public/bnpb/dalops_hitung.js` `mitigasi()`: banjir saja, kalimat tanpa sumber.
- Tidak ada katalog bersumber untuk Pusat, Provinsi, Kab/Kota.

## 8. Konvensi staf

`stafOK(env, req, peran)` di `src/staf.js`; contoh rute staf `/api/dampak-peringatan/desa` dengan `dalamWilayahStaf`. Alun-alun sendiri halaman publik; bagian staf diambil lewat rute berhak, tidak disematkan di HTML.
