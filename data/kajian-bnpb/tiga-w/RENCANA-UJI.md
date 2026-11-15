# RENCANA-UJI: 3W dan tawaran

Uji integrasi dengan D1 sungguhan (harness `tests/warga`).

| Kode | Kriteria terima | Bukti |
| --- | --- | --- |
| T1 | Organisasi internasional tanpa negara ditolak; kampus menautkan institusi_id, tidak menyalin. | `node --test tests/warga/tiga_w.test.mjs` |
| T2 | Baris 3W dengan klaster di luar delapan ditolak; kab di luar `sk_kejadian_kab` ditolak. | sama |
| T3 | Celah: kab terdampak tanpa organisasi berjalan di klaster c tampil celah; berstatus selesai tidak dihitung. | sama |
| T4 | Tumpang tindih: 4 organisasi berjalan di (kab, klaster) ditandai; 3 tidak. | sama |
| T5 | Token: hanya sha disimpan; token organisasi A tidak membaca atau menulis baris organisasi B; token tercabut 401; kejadian selesai 401. | sama |
| T6 | Tawaran NGO internasional tanpa mitra lokal ditolak (Q2). | sama |
| T7 | Dialihkan dan ditolak tanpa alasan ditolak; riwayat bertambah tiap perubahan. | sama |
| T8 | Pencocokan: tawaran tenda di kejadian K menampilkan meja logistik tenda status diminta di kab K, urut paling lama; barang lain tidak muncul. | sama |
| T9 | Tidak ada rute publik membuka 3W atau tawaran. | sama |
| T10 | `PRAGMA foreign_key_list` `tw_baris`, `tw_token`, `tw_tawaran`, `tw_tawaran_riwayat` menunjuk `sk_kejadian` (gerbang keterpaduan hanya mencocokkan nama `*_kejadian`/`*_tugas`). | sama |
| T11 | Pencocokan meja logistik terlayani indeks ekspresi barang (EXPLAIN). | sama |
| T12 | Organisasi hanya menerima `alasan_organisasi`, tidak pernah `alasan_internal`. | sama |
| T13 | `/bantu` terbuka tanpa sesi tetapi `/api/bantu` tanpa token sah 401; BPBD lewat `/api/instansi/siklus/...` hanya kab wilayahnya. | sama |

Layar ditinjau pemilik di `http://localhost:8800/siklus/kejadian/<KJ>` dan `http://localhost:8800/bantu#t=<token uji>`.
