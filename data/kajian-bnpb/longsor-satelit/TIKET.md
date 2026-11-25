# TIKET: Pemetaan bekas longsor dari satelit

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| LS-01 | Kunci `bekas_kriteria.json`: kejadian kalibrasi dan uji (dipilih mekanis dari DIBI sebelum citra dilihat), ambang, rancangan sampel, pembanding; sidik dan jangkar | longsor (+ validasi-model) | T1 | Q3, Q4 |
| LS-02 | Lembar buta penafsir (dibangun baru): titik sampel dari peta beku, dua penafsir, kappa, penafsir ketiga buta untuk yang tidak sepakat | longsor + pemilik (penafsir) | T3 | LS-01, Q1, Q2 |
| LS-03 | `bekas.py`: komposit, rdNDVI, saringan, poligon, agregat, penjaga sidik | longsor | T2 | LS-01 |
| LS-04 | Lapis tumpang tindih tebangan (Hansen tahun sebelum kejadian, GFW integrated alerts bertanggal) terpisah | longsor | T2 | LS-03, Q7 |
| LS-05 | Uji balik optik: kalibrasi lalu uji sekali; vonis | longsor (+ validasi-model) | T4 | LS-02, LS-03, LS-04 |
| LS-06 | `bekas_radar.py` dan uji balik radar | longsor (+ validasi-model) | T5 | LS-02 |
| LS-07 | Rute baca staf dan lapisan `/siklus`; tanpa angka bila bukan lulus | warga-api + siklus (+ guard-api, security-reviewer, selera-angka, inp-reviewer) | T6, T7, T8, tinjau lokal | LS-05, Q5, Q6 |
| LS-08 | Jalan otomatis per kejadian longsor besar | longsor + mekanik-mesin | T10 | LS-05 lulus, Q8 |
