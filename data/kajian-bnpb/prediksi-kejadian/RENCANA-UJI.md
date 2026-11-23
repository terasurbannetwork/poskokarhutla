# RENCANA-UJI

| Kriteria | Perintah bukti |
| --- | --- |
| `pasangkan()`: jendela ±1 hari, kejadian berlangsung tidak dihitung, laporan `tidak_valid` dibuang, kab tanpa prakiraan tidak masuk kotak, matang 3 hari | `node --test tests/bnpb/dalops_prakiraan.test.mjs` |
| Golden: level banjir dan longsor dari `prediksi.json` sama dengan dari `status.json` untuk hari terbit yang sama | `node --test tests/bnpb/dalops_prakiraan.test.mjs` |
| Rute `/api/dalops/lapor`: tanpa sesi 401, jenis asing 400, `sejak` > 14 hari ditolak, kolom pribadi tidak ada | `npm run uji:warga` (uji integrasi rute) |
| `konfirmasi.py` menerima `logbook`, `nilai.py` menulis skor per label, hari logbook kosong tidak jadi nol | `python3 scripts/prediksi/konfirmasi.py uji`, `python3 scripts/prediksi/nilai.py uji` |
| Gerbang repo hijau | `npm run uji:agen` |
| Layar tampil tanpa galat konsol, ubin, tabel, peta, pop-up | tinjau di `http://localhost:8800/bnpb/dalops` |
| Klik ubin dan tanggal tidak membekukan layar | pemeriksa `inp-reviewer` |
| Angka di layar | pemeriksa `selera-angka` |
| Skor label kedua jujur (tanpa kebocoran, tanpa rata-rata label) | pemeriksa `validasi-model` |
