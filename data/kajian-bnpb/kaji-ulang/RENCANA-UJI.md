# RENCANA-UJI: Kaji ulang pasca-kejadian

Uji integrasi dengan D1 sungguhan (harness `tests/warga`, `tests/warga/_bnpb.mjs`), tanpa mock D1. Tiap perilaku di luar TypeScript (pemicu, CHECK, FK, rentang kunci) diuji lewat Miniflare.

| Kode | Kriteria terima | Bukti |
| --- | --- | --- |
| T1 | Kejadian tanpa tugas, Lifeline, atau 3W: draf tetap terbentuk; tiap bagian kosong bertulisan "tidak ada data", tidak ada angka 0 untuk durasi. | `node --test tests/warga/kaji_ulang.test.mjs` |
| T2 | Tugas karhutla terhubung via `sk_kejadian_sumber`: linimasa memuat deteksi, konfirmasi, padam, terverifikasi berurut waktu; durasi sama dengan `durasiTahap` (`src/sla.js`). | sama |
| T3 | Deteksi tanpa jam asli diberi pil "perkiraan" dan tidak masuk median deteksi ke tugas. | sama |
| T4 | Urutan terbalik (padam sebelum konfirmasi) menghasilkan null, bukan nol atau negatif. | sama |
| T5 | Tabel `lf_*` atau `tw_*` belum ada: bagian itu "belum diaktifkan", draf tetap 200. | sama |
| T6 | `ops_pelajaran` dua tugas muncul sebagai catatan lapangan; angkat menyalin teks; hapus tugas tidak menghapus pelajaran kejadian. | sama |
| T7 | Pelajaran dan draf tidak memuat `penugasan.nama` atau `ops_pelajaran.oleh` (nama contoh ditanam di fixture lalu dicari di seluruh JSON jawaban). | sama |
| T8 | Rekomendasi baru: satu baris `ku_rekomendasi`, satu `dl_tindak` (belum), satu `dl_tindak_log` dengan `langkah` terisi, atomik; kegagalan salah satu membatalkan semua. | sama |
| T9 | Tiap kueri baca (tugas terhubung, `ops_pelajaran`, `lf_riwayat`, `tw_*`, `dl_tindak` per rentang kunci) terlayani indeks: EXPLAIN tanpa SCAN tabel besar. Hitungan kueri: kejadian dengan 200 tugas terhubung menjalankan paling banyak `MAKS_KUERI_DRAF` (14) kueri D1, dihitung lewat pembungkus yang menghitung `prepare`; 1 tugas dan 200 tugas jumlahnya sama. | sama |
| T10 | Status selesai tanpa catatan penutup 20 karakter ditolak 400; dengan catatan diterima; rekomendasi tanpa tenggat ditolak. | sama |
| T11 | Rute status dari Dalops (`POST /api/dalops/tindak`) menolak kunci `kaji\|`; rute kaji ulang menolak kunci `banjir\|`; `GET /api/dalops/tindak` tidak memuat baris `kaji\|`, termasuk saat ada lebih dari 2000 baris `kaji\|` yang lebih baru (baris banjir tetap muncul: bukti pengecualian di SQL sebelum LIMIT). | `node --test tests/warga/dalops_tindak.test.mjs tests/warga/kaji_ulang.test.mjs` |
| T12 | Sahkan: potret terisi, `ku_kaji.status` disahkan, baris `sk_jejak` ditulis; sesudahnya ubah dan hapus pelajaran atau rekomendasi ditolak pemicu, tambah baru diterima; status kembali ke draf ditolak. | sama |
| T13 | Penulis tunggal tidak bisa mengesahkan bila ada Koordalops lain (Q3); Super Admin bisa. | sama |
| T14 | BPBD kab A tidak melihat kab B; kaji ulang belum disahkan tidak terlihat BPBD; BPBD tidak bisa menulis pelajaran (403); jawabannya sama dengan kejadian tidak ada. | sama |
| T15 | `PRAGMA foreign_key_list` ketiga tabel `ku_*` menunjuk `sk_kejadian` (gerbang keterpaduan hanya mencocokkan nama, jadi diuji sendiri). | sama |
| T16 | Lewat tenggat: status tidak berubah sendiri; hitungan daftar F-7 benar pada tanggal tetap. | sama |
| T17 | Kandidat Q1: kejadian 3 kab masuk, 2 kab tanpa kriteria lain tidak; dibatalkan dan digabung tidak pernah masuk; tanggap tanpa tanggal kriteria dilewati. | sama |
| T18 | Batas laju 120 per 10 menit memberi 429 dan memakai hitungan `dl_tindak_log`. | sama |
| T20 | Potret lebih dari 100000 karakter dipangkas dengan penanda "n peristiwa tidak dimuat"; Sahkan ulang menaikkan versi, versi lama ada di `ku_potret`, butir tambahan tampil sebagai lampiran. | sama |
| T21 | Tugas yang belum bertaut ke `sk_kejadian_sumber` tidak muncul di linimasa; draf menampilkan penanda "belum bertaut" bila ada tugas serupa di kab dan tanggal kejadian tanpa tautan. | sama |
| T19 | Layar: kartu mematuhi kartu standar (tanpa kalimat kesimpulan, tanpa kaki sumber), sel kosong "tidak ada data", cetak A4 tanpa tombol. | `node --test tests/siklus/layar_kaji_ulang.test.mjs`, `npm run uji:agen` |

Layar ditinjau pemilik di `http://localhost:8800/siklus/kejadian/<KJ>`.
