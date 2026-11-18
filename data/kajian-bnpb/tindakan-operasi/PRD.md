# PRD: Tindakan lapangan per bencana di operasi generik

Tunduk pada `KEPUTUSAN-TINDAKAN.md`. Fitur yang tidak tertulis di sini tidak dibuat.

## 1. Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Staf Pusdalops berperan | melihat tindakan lazim tiap bencana, mencatat tindakan yang dilakukan di tiap target renlap |
| BPBD (akun instansi pemprov, pemkab, pemkot aktif) | sama, untuk wilayahnya sendiri (hak tulis yang sudah ada di `penulis`) |
| Pimpinan dan pemirsa Pusdalops | membaca rekap tindakan per bencana dan wilayah di kartu Kepatuhan |

## 2. Fitur

| Kode | Fitur | Keluaran |
| --- | --- | --- |
| F-1 | Katalog 23 tindakan dan daftar per bencana di registri | `public/bencana.json` kunci `tindakan` dan `kemampuan.tindakan`; `src/bencana.generated.js` |
| F-2 | Persen logbook per tindakan per bencana | `public/data/bnpb/logbook_tindakan.json` dari `scripts/data/logbook_tindakan.py` |
| F-3 | Kartu "Tindakan" di seksi Sarana dan fasilitas: tindakan bencana terpilih, urut persen logbook, bar persen | `public/inti/renlap.js` |
| F-4 | Kolom "Tindakan" di kartu Hasil tindakan: pilih beberapa tindakan per target | `public/inti/renlap.js` |
| F-5 | Simpan tindakan per target lewat `POST /api/pb/hasil` | `src/pb_isian.js`, `src/hak.js`, migrasi 0153 |
| F-6 | Rekap jumlah target per tindakan di kartu Kepatuhan | `GET /api/pb/kepatuhan` `per_tindakan` |
| F-7 | Operasi dan renlap longsor menyala | `public/bencana.json` entri longsor |

## 3. Larangan

- Tidak ada tindakan di luar daftar bencana itu; server menolak.
- Tidak ada teks logbook asli, nama orang, nomor telepon, atau angka korban di `public/`.
- Tidak ada kalimat kesimpulan di kepala atau isi kartu; tidak ada huruf kapital semua; tidak ada titik tengah sebagai pemisah.
- Tidak ada pemadaman, water bombing, atau patroli api di operasi generik (KEPUTUSAN D4).
- Kata "aman" tidak dipakai.

## 4. Ukuran berhasil

- Tujuh bencana menyala (banjir, pesisir, cuaca, gempa, udara, gunung api, kekeringan) ditambah longsor, masing-masing punya daftar tindakan yang tampil dan bisa dicatat.
- Uji `tests/warga/pb_hasil.test.mjs` membuktikan tindakan tersimpan, ditolak di luar daftar, dan kepatuhan menghitungnya.
- Karhutla tidak berubah.
