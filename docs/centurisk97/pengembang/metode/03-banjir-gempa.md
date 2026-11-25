# Metode banjir, gempa, longsor

Status uji balik tiap metode pada modul ini. Arti status ada di [ringkasan status](/docs/pengembang/metode/ikhtisar).

## 04. Banjir, rob, genangan satelit, dan penurunan tanah

| Metode | Status | Catatan |
| --- | --- | --- |
| [1. Prakiraan hujan harian (scripts/banjir/hujan.py)](/docs/pengembang/banjir) | Bukan model | Bias model dicatat. |
| [2. Peluang hujan lebat dari ansambel (ansambel_hujan.py, peluang_banjir.py)](/docs/pengembang/banjir) | Hipotesis | Belum terkalibrasi, bukan peluang banjir. |
| [3. Debit sungai besar GloFAS (scripts/banjir/sungai.py)](/docs/pengembang/banjir) | Belum diuji | Jalur sungai belum diuji balik. |
| [4. Indeks bahaya InaRISK (scripts/banjir/bahaya.py)](/docs/pengembang/banjir) | Bukan model |  |
| [5. Status banjir per kecamatan (scripts/banjir/status.py)](/docs/pengembang/banjir) | Hipotesis | Uji balik: FAR 0,92 sampai 0,97, ETS di bawah 0,03; penanda bersiaga. |
| [6. Uji balik status terhadap DIBI (scripts/banjir/uji_balik.py, validasi.json)](/docs/pengembang/banjir) | Bukan model | Alat uji. |
| [7. Catatan prospektif (prospektif.py, siaga_persentil.py, prediksi_kab2.py)](/docs/pengembang/banjir) | Bukan model | Mekanisme uji; arsip model kabupaten-hari belum teruji dan tidak tayang. |
| [8. Kejadian aktif dan skor (scripts/banjir/kejadian_aktif.py)](/docs/pengembang/banjir) | Tidak dinyatakan |  |
| [9. Dampak (dampak.py, dampak_kab.py)](/docs/pengembang/banjir) | Tidak dinyatakan |  |
| [10. Rob (rob.py, pasang_astro.py, pasut.py)](/docs/pengembang/banjir) | Tidak dinyatakan |  |
| [11. Peringatan resmi dan nowcast BMKG (peringatan.py, lapisan "Sedang hujan")](/docs/pengembang/banjir) | Bukan model | Status resmi BMKG tampil apa adanya. |
| [12. Telusur hulu dan jeda hulu ke hilir (hulu.py, jeda_hulu.py)](/docs/pengembang/banjir) | Bukan model | Keterangan deskriptif. |
| [13. Bukti DAS dan citra (bukti_das.py, citra_banjir.py)](/docs/pengembang/banjir) | Bukan model | Indikasi radar, bukan luas banjir resmi. |
| [14. Genangan satelit Copernicus GFM se-Indonesia (scripts/banjir/genangan_nasional.py)](/docs/pengembang/banjir) | Bukan model | Radar bukan bukti negatif. |
| [15. Genangan satelit per kejadian di Kaji Cepat (paket genangan-satelit, RANCANGAN, belum dikodekan)](/docs/pengembang/banjir) | Rancangan | Hanya kriteria uji GS-02 yang terkunci; ambang berstatus hipotesis. |
| [16. Penurunan tanah dari InSAR (paket penurunan-tanah, lab, belum tayang)](/docs/pengembang/banjir) | Hipotesis | Lab, belum tayang; validasi sebagian lolos. |
| [17. Proyeksi penurunan tanah 10 dan 20 tahun (scripts/banjir/proyeksi_tanah.py)](/docs/pengembang/banjir) | Hipotesis | Angka gabungan dengan rob baru boleh sesudah uji balik. |
| [18. Mesin simulasi genangan (tab Simulasi, genangan Jakarta J1 sampai J4)](/docs/pengembang/banjir) | Belum diuji | J3 berlabel tidak sah; J4 menunggu musim hujan 2026 dan 2027. |
| [19. Pos tinggi air SIHKA (src/sihka.js)](/docs/pengembang/banjir) | Tidak dinyatakan | Status resmi pengelola menang atas status persentil. |
| [20. Sensor milik sendiri (src/sensor.js, sensor/)](/docs/pengembang/banjir) | Belum diuji | Firmware belum diuji di perangkat keras. |
| [21. Panel EWS sensor dan CCTV (paket ews, RANCANGAN, belum dikodekan)](/docs/pengembang/banjir) | Rancangan | Belum ada kode. |
| [22. Keluarga model kabupaten-hari, nowcast, dan jalur lab (status uji, tanpa dipasang ke status resmi)](/docs/pengembang/banjir) | Hipotesis | Semua jalur hipotesis atau lab; tidak menggantikan status.py. |

## 05. Gempa, tsunami, gunung api, longsor, kekeringan, dan pesisir

| Metode | Status | Catatan |
| --- | --- | --- |
| [Gempa: katalog, penggabungan, dan kejadian](/docs/pengembang/gempa-gunungapi) | Bukan model |  |
| [Gempa: guncangan satu gempa (GMPE dan GMICE)](/docs/pengembang/gempa-gunungapi) | Hipotesis | Koreksi EMSC gagal dan tidak dipakai. |
| [Gempa: peluang susulan](/docs/pengembang/gempa-gunungapi) | Hipotesis | BSS terhadap pembanding hanya 0,0021. |
| [Gempa: laju 12 bulan](/docs/pengembang/gempa-gunungapi) | Gagal | Kelas yang gagal uji tidak menampilkan angka peluang. |
| [Gempa: tsunami (waktu tiba, tinggi indikatif, evakuasi)](/docs/pengembang/gempa-gunungapi) | Hipotesis | Simulasi, bukan prakiraan. |
| [Gempa: kerusakan dan perkiraan korban (simulasi)](/docs/pengembang/gempa-gunungapi) | Hipotesis | Meleset beberapa kali lipat per kejadian. |
| [Gempa: PAGER, uji prospektif guncangan, dan beruntun](/docs/pengembang/gempa-gunungapi) | Hipotesis | Perlu dicek; belum ada uji ke depan yang cukup. |
| [Gunung api: level resmi, letusan, dan kegempaan](/docs/pengembang/gempa-gunungapi) | Bukan model |  |
| [Gunung api: paparan, KRB, dan penduduk](/docs/pengembang/gempa-gunungapi) | Bukan model |  |
| [Gunung api: sebaran abu (skenario, bukan prakiraan letusan)](/docs/pengembang/gempa-gunungapi) | Hipotesis | Arah abu belum terbukti di atas acak (n = 4). |
| [Gunung api: lahar dan awan panas](/docs/pengembang/gempa-gunungapi) | Hipotesis | Tanpa kalibrasi. |
| [Gunung api: rezim letusan, uji kegempaan, dan MIROVA](/docs/pengembang/gempa-gunungapi) | Hipotesis | Peluang letusan 7 hari gagal dan tidak dibuat. |
| [Longsor: status harian per kecamatan (aturan produksi)](/docs/pengembang/gempa-gunungapi) | Tidak dinyatakan | Komentar kode menyatakan lolos 2022 sampai 2025; angkanya tidak diverifikasi ulang. |
| [Longsor: nowcast kerentanan dikali hujan (model gagal uji)](/docs/pengembang/gempa-gunungapi) | Gagal | Gagal tiga kali berturut-turut melawan klimatologi. |
| [Longsor: simulasi peluang longsor dangkal](/docs/pengembang/gempa-gunungapi) | Tidak dinyatakan |  |
| [Kekeringan: status "Deteksi Centurisk97"](/docs/pengembang/gempa-gunungapi) | Hipotesis | Ambang gagal uji balik (FAR di atas 0,9). |
| [Kekeringan: prakiraan 1 sampai 3 bulan, padi, dan model bayangan](/docs/pengembang/gempa-gunungapi) | Hipotesis | Model bayangan berdampingan dengan aturan lama. |
| [Kekeringan: simulasi neraca air dan posko](/docs/pengembang/gempa-gunungapi) | Tidak dinyatakan |  |
| [Pesisir: abrasi garis pantai (Landsat)](/docs/pengembang/gempa-gunungapi) | Tidak dinyatakan | Belum dikoreksi pasang surut. |
| [Pesisir: rob, pasang surut, dan gelombang](/docs/pengembang/gempa-gunungapi) | Tidak dinyatakan |  |
| [Genangan tsunami (rencana, belum dibangun)](/docs/pengembang/gempa-gunungapi) | Rancangan | Berlabel hipotesis sampai uji balik kelas A lulus. |
| [Bangunan di lereng terjal (rencana, sebagian pondasi sudah ada)](/docs/pengembang/gempa-gunungapi) | Rancangan | Sebagian pondasi sudah ada. |
| [Panel EWS sensor dan CCTV (rencana, belum dibangun)](/docs/pengembang/gempa-gunungapi) | Rancangan | Belum ada kode. |
