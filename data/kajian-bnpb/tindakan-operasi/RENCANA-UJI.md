# RENCANA-UJI: tindakan lapangan per bencana

| Kriteria terima | Perintah bukti |
| --- | --- |
| Registri sah: katalog sama dengan `TINDAKAN`, tiap `kemampuan.tindakan` di katalog, entri mati bertindakan kosong, generated segar | `python3 -I scripts/umum/bencana.py uji` dan `python3 -I scripts/umum/bencana.py cek` |
| Skrip logbook: pola mengenali contoh, pemadaman listrik tidak terhitung, keluaran hanya kunci daftar putih, daftar registri sesuai ambang 2 persen atas keluaran yang di-commit | `python3 -I scripts/data/logbook_tindakan.py uji` |
| Migrasi 0153 idempoten (jalan dua kali) | `node --test tests/warga/pb_hasil.test.mjs` (memuat migrasi lewat `_bantu.mjs`) dan pemeriksa `migrasi-idempoten` |
| Hasil bertindakan tersimpan, set diganti, absen = tidak disentuh, kosong = dihapus | `node --test tests/warga/pb_hasil.test.mjs` |
| Tindakan di luar daftar bencana, ganda, lebih dari 12, bukan daftar = 400 tanpa tulis | idem |
| Kepatuhan `per_tindakan` hanya dari versi terbaru terbit/selesai | idem |
| Tanpa tabel 0153: hasil tetap tersimpan dengan `tindakan: false`; kepatuhan tanpa `per_tindakan` | idem |
| Kueri baru SEARCH, bukan SCAN | idem (EXPLAIN) |
| Layar: kartu Tindakan, kolom Tindakan, `butirDari` membawa tindakan hanya bila disentuh | `node --test tests/layar/pb_renlap.test.mjs` |
| Gerbang repo hijau (paket, kartu standar, tanpa kesimpulan, token warna, D1) | `npm run uji:agen` |
| Karhutla tidak berubah | `node --test tests/agen/gerbang-bencana.test.mjs` |
| Tinjau pemilik | `http://localhost:8800/operasi`, seksi Sarana dan fasilitas, bencana longsor |
