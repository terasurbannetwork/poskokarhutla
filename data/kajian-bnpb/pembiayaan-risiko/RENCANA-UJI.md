# RENCANA-UJI: Pembiayaan risiko

Uji integrasi dengan D1 sungguhan (harness `tests/warga`), tanpa mock D1.

| Kode | Kriteria terima | Bukti |
| --- | --- | --- |
| T1 | Kejadian tanpa Jitupasna dan tanpa saldo: kartu Kerugian "belum ada angka resmi", Dana "belum diisi"; tidak ada nilai 0. | `node --test tests/warga/pembiayaan.test.mjs` |
| T2 | Sektor tanpa harga: total kerusakan null dan menunggu, tidak pernah 0. | sama |
| T3 | Saldo tanpa sumber ditolak 400; dengan sumber diterima dan masuk riwayat; tidak ada rute ubah atau hapus. | sama |
| T4 | Peminta tanpa peran berhak (BPBD, umum) dijawab sama dengan kejadian tidak ada. | sama |
| T5 | Selisih tidak dihitung bila salah satu sisi menunggu atau belum diisi, dan alasannya tertulis. | sama |
| T6 | Keyakinan selisih = terendah dari kedua sisi. | sama |
| T7 | Tanpa catatan skema, respons tidak memuat bagian parametrik; pemicu tidak pernah dibuat sistem. | sama |
| T8 | Dengan catatan skema, pemantau mengembalikan terpenuhi, belum, atau tidak dapat dinilai; bukan klaim pembayaran. | sama |
| T9 | Kueri realisasi DSP terlayani indeks (EXPLAIN tanpa SCAN tabel besar). | sama |
| T10 | `PRAGMA foreign_key_list` tabel `pb_saldo` menunjuk `sk_kejadian`. | sama |
| T11 | Tidak ada berkas di `public/` yang memuat nilai saldo atau skema (pindai kata kunci pada keluaran bangun). | gerbang `tests/agen` |
| T12 | Uji balik model: skrip self-check lulus; kartu Perkiraan awal tidak tampil bila kejadian beruji < 20 atau cakupan rentang < 70 persen. | `python3 scripts/pembiayaan/ujibalik.py` |
| T14 | Permohonan DSP tanpa tautan KJ tidak masuk realisasi kejadian mana pun dan dihitung di catatan "belum tertaut"; setelah ditautkan masuk. | sama |
| T13 | Tidak ada vonis "cukup", "kurang", "aman" di berkas layar. | gerbang pindai teks |

Layar ditinjau pemilik di `http://localhost:8800/siklus/kejadian/<KJ>`.
