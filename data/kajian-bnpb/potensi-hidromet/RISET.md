# RISET: Potensi Bencana Hidromet `/potensi`

Dipetakan 26 Nov 2026 dari kode repo. Rujukan `berkas:baris` saat dipetakan; periksa ulang sebelum dipakai.

## 1. Dashboard pembanding (dianalisis ulang 26 Nov 2026, K5)

Dashboard hidromet InaRISK (`inarisk.bnpb.go.id/dashboard-monev-bencana/dashboard-hidromet/`), aplikasi Leaflet. Bagian layar: Ringkasan, Peta, Dampak, Analisis wilayah, Rekomendasi, Definisi dan sumber, Simulasi banjir, WebGIS. Berkas yang dibaca dari peramban (diperiksa langsung):

| Berkas | Isi | Dipakai kita |
| --- | --- | --- |
| `assets/hidromet/ews-engine.js` | modul murni: 7 bahaya, matriks kelas bahaya 0-3 kali pemicu 0-4, `hazardClass(counts)` kelas kab dari sebaran kelas desa (tinggi bila porsi desa kelas 3 paling sedikit 40 persen atau paling sedikit 30 desa kelas 3 dan 10 persen; sedang bila 10 persen kelas 3 atau 10 desa kelas 3 atau 60 persen kelas 2-3) | aturan sebaran kelas desa dipinjam sebagai aturan awal, dikunci bersidik (ALGORITMA 5); pemicu tidak (pemicu kita dari prakiraan 514 kab) |
| `data/hidromet_kab.json` (0,5 MB) | 516 kab: titik sampel, desa wakil adm4, `hb` dan `hp` = jumlah desa per kelas [tanpa, rendah, sedang, tinggi] untuk 6 bahaya (baseline dan proyeksi), `pr` prioritas, `top` desa bahaya tinggi terbanyak. Meta: diturunkan dari `data/index.json` 83.518 desa; "tahun baseline, skenario, dan periode proyeksi tidak tercantum dalam atribut sumber" | ya (D7, D8) |
| `data/impact/<wilayah>.json` (38 berkas) | per desa: kode adm4, nama, kecamatan, kab, koordinat terskala, kelas baseline 6 digit, kelas proyeksi 6 digit | ya, kelas per desa (D7) |
| `data/village_pts.json` (1,5 MB) | 249.384 titik desa terskala | tidak; batas desa kita sendiri |
| `data/pch/<bulan>/kab.json` | peluang hujan bulanan BMKG per kab, hasil unggahan CSV petugas | tidak (Q4: bila ya, dari rilis BMKG) |
| `assets/hidromet/recommendations.js` | 4 pihak kali 3 fase (respons, kesiapsiagaan, mitigasi) kali 7 bahaya, ditambah butir umum dan konteks musiman. Kepala berkas: "disusun dari kerangka UU 24/2007, PP 21/2008, Perpres 87/2020, Permendagri 101/2018 ... bersifat generik ... bukan instruksi resmi". Tidak ada rujukan per butir | struktur ya; butir hanya dengan label generik (D11, Q3) |
| `assets/hidromet/live-layers.js`, `notify.js` | CAP lewat proksi PHP, laporan hari ini InaRISK, notifikasi WA ke daftar penerima super user | tidak (D20) |
| `assets/hidromet/content.js` | definisi dan daftar sumber | gagasan halaman Sumber (D17) |
| sumber luar di `app.js` | Open-Meteo forecast, marine, flood; CAP BMKG; nowcasting ArcGIS phase2; ONI CPC; API BMKG adm4; GIBS; FIRMS; ImageServer InaRISK | yang setara sudah kita punya, kecuali API BMKG adm4 per desa (D10) |

Pola tata letak diambil dari Foundry IDN-GRID (`foundry.vantis.sh/grid`) lewat tiruannya di repo `platformmeti` (`public/jaringan.html`, `public/jr_app.js`, kontrak `docs/perencanaan/KEMBARAN-JARINGAN.md`): pil tab, satu peta bersama untuk tab peta, panel lipat, lembar bawah di HP, tab baca terpisah (Ontologi, Ringkasan, Sumber), chip status fakta (Bersumber, Dihitung, Perkiraan, Menunggu data).

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
