# RENCANA-UJI: Genangan satelit per kejadian

| Kode | Yang diuji | Perintah bukti | Kriteria terima |
| --- | --- | --- | --- |
| T1 | Pasangan per kejadian, cakupan sah, alasan tak sah | `python3 scripts/banjir/genangan_nasional.py uji` | kasus sintetis: tanpa lintasan, tanpa cakupan, tanpa pra (satu-satunya pra jatuh sesudah `mulai` harus ditolak), cakupan 9 persen dihitung dari diamati dikurangi mask, sinyal lemah, sah; tak sah tidak pernah bernilai 0 di keluaran tampil; mode riwayat dengan `--pra-sebelum-acuan` menolak pra sesudah tanggal DIBI; tanpa opsi, mode `luas` lama keluarannya sama |
| T2 | Lahan WorldCover | `python3 scripts/banjir/genangan_lahan.py uji` | kasus ALGORITMA 5 tepat; kelas nol tidak keluar; ubin COG sintetis deflate terbaca |
| T3 | Zona sel paparan dan golden zona poligon | `python3 -I scripts/siklus/paparan.py uji` | kasus ALGORITMA 4 lewat `hitung_kab` asli (WorldPop bawah 100, atas 400; GHSL null); keluaran zona poligon identik dengan fixture sebelum perubahan; `kisi_kasar` bila langkah > 0,001 |
| T4 | `banjir_gfm` dan golden `banjir_jam1` | `python3 -I scripts/siklus/kaji_banjir.py uji` | rentang dua ujung; kab tak sah dikeluarkan dari `jiwa_kab_sah` dan jumlahnya tercatat; tidak ada kunci `total`; `banjir_jam1` sama dengan fixture |
| T5 | Kriteria terkunci | `python3 scripts/siklus/genangan_kriteria.py prasyarat` dan `uji` | menolak jalan uji balik bila sidik kriteria tidak cocok atau jangkar commit kosong |
| T6 | Migrasi | `npm run uji:warga` (uji migrasi `sk_kaji`) | baris lama utuh; `banjir_gfm` diterima; model lain ditolak; idempoten |
| T7 | Rute dan hak | `npm run uji:warga` (`tests/warga/siklus_kaji*.test.mjs`) | tanpa sesi 401; BP kab lain 403; ingest `banjir_gfm` dengan ringkas > 1.500 byte ditolak; `hasil_r2` lama untuk gempa dan banjir_jam1 diterima; `banjir_gfm` hanya `<kj>_banjir_gfm_v<versi>.json` yang cocok dengan baris, model atau versi lain ditolak; BP pada kejadian dua kab hanya menerima kab miliknya di JSON hasil; rute berkas: nama di luar daftar izin 404, `../` 404, kab4 di luar lingkup BP 403, berkas di atas batas 413 |
| T8 | Layar murni | `node --test tests/siklus/genangan_*.test.mjs` | tabel urut, baris tak sah berteks, tanpa "aman"/"surut", format angka Indonesia, rentang dua ujung |
| T9 | Penggeser inti | `node --test tests/inti/geser.test.mjs` | `/banjir` Bukti DAS tetap jalan dengan komponen inti |
| T10 | Ujung ke ujung kejadian Sumatera 26 Nov 2025 | `python3 scripts/siklus/genangan_kaji.py jalan --kj <KJ> --kering` | selesai dalam anggaran Q7; ukuran R2 tercatat; tiap kab punya angka sah atau alasan |
| T11 | Uji balik | `python3 scripts/siklus/genangan_kaji.py vonis` | vonis tertulis sesuai ALGORITMA 7; ringkasan ke `public/banjir/data/lab/genangan_kaji_ringkas.md` tanpa data orang |
| T12 | INP dan selera | `inp-reviewer`, `selera-angka` | klik baris tabel dan segmen citra tidak membekukan; angka tanpa presisi palsu |
| T13 | Tinjau lokal | `http://localhost:8800/siklus/kaji` | pemilik melihat kartu pada kejadian uji |
| T14 | Gerbang repo | `npm run uji:agen` | paket lengkap, berkas baru punya pemilik, token warna tidak bertambah |

Kejadian uji balik dipilih dan dipisah (kalibrasi lawan uji) di GS-02 sebelum satu pun dihitung; kejadian yang sudah terlihat (Demak 2024, Aceh Tenggara Okt 2026) masuk kalibrasi.
