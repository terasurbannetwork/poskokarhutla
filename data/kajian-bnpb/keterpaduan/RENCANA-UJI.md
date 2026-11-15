# RENCANA-UJI: Keterpaduan

Uji integrasi menjalankan D1 sungguhan lewat miniflare seperti `tests/warga/*` (`~/.claude/TEST.md`); tidak ada mock D1.

| Kode | Kriteria terima | Perintah bukti |
| --- | --- | --- |
| T1 | Rute ingest modul menolak tanpa Bearer (401), menolak jendela lebih dari 120 hari, hanya mengembalikan baris dalam jendela, paling banyak 500, dan `lanjut` tidak melewatkan dua baris bermilidetik sama. | `node --test tests/warga/kejadian_tautan.test.mjs` |
| T2 | Rute ingest modul tidak mengembalikan kolom nama, WA, atau isi laporan. | sama |
| T3 | Pasang: `tugas_api` kab nama "Kab. Ogan Komering Ilir" + kejadian karhutla di kab4 yang sama selisih 2 hari menjadi tambah; selisih 4 hari menjadi baru. | `python3 scripts/siklus/pasang.py uji` |
| T4 | Tautan instansi kab A tidak menampilkan kejadian kab B. | `tests/warga/kejadian_tautan.test.mjs` |
| T5 | Antrean: 503 menunda dengan jeda sesuai rumus; 422 menahan butir dengan alasan; 413 membelah batch. | `node --test tests/inti/antre.test.mjs` |
| T6 | Antrean: dua kali kirim dengan `klien_id` sama menghasilkan satu baris di server. | uji per modul yang dipindah |
| T7 | Pemindahan: butir di basis data lama terkirim lewat saluran baru dan basis data lama terhapus hanya sesudahnya. | `tests/inti/antre.test.mjs` |
| T8 | Vektor wajah tidak pernah tertulis ke localStorage. | `tests/lapangan/*` |
| T9 | Spek: validator Worker dan peramban memberi galat sama untuk 20 isian contoh per formulir. | `node --test tests/inti/spek.test.mjs` |
| T10 | Spek meja lama lewat adapter memberi hasil sama dengan `validasi` lama untuk semua contoh di `tests/bnpb`. | sama |
| T11 | Titik pengungsian: dua titik dalam 150 m memicu pertanyaan; 250 m tidak. | `tests/warga/pengungsian_titik.test.mjs` |
| T12 | Isian ganda (titik, tanggal) ditolak 409; catatan tanpa titik tetap memakai indeks lama. | sama |
| T13 | Pencocok orang: NIP baku sama jadi pasangan; NIP ke A dan WA ke B jadi tinjau; NIP 7 karakter jadi tinjau "NIP tidak baku"; nama sama tanpa NIP dan WA tidak dipasangkan. | `node --test tests/agen/cocok_orang.test.mjs` |
| T14 | `normalWA`: `0812-3`, `+62 812 3`, `812 3` (bentuk kontak) memberi `628123`. | `tests/warga/*` |
| T16 | Logbook berjenis `gempabumi` terkirim sebagai `gempa`; SIPPA `latihan` tidak terkirim. | `python3 scripts/siklus/pasang.py uji` |
| T15 | Gerbang: tabel baru bernama `*_kejadian` atau `*_tugas` tanpa sumber pencocok ditolak; `indexedDB.open` di luar `public/inti/antre.js` ditolak setelah daftar utang kosong. | `npm run uji:agen` |

Layar ditinjau pemilik di `http://localhost:8800` per tiket layar.
