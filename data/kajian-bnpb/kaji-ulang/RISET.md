# RISET: Kaji ulang pasca-kejadian

## 1. Benchmark

| Sistem | Yang ditiru | Pelajaran |
| --- | --- | --- |
| FEMA HSEEP, After Action Report dan Improvement Plan (AAR/IP) | Satu laporan: ringkasan, analisis per kapabilitas inti, kekuatan dan area perbaikan; lalu Rencana Perbaikan: tiap tindakan korektif punya penanggung jawab, tenggat, dan status. | Rekomendasi tanpa penanggung jawab dan tenggat tidak pernah selesai. Laporan dan rencana adalah dua bagian dari satu dokumen. |
| NIMS dan pedoman HSEEP | Siklus perbaikan: temuan menjadi tindakan, tindakan dilacak sampai diverifikasi. | Tutup butuh verifikasi, bukan hanya centang. |
| WHO After Action Review (AAR) dan Intra-Action Review (IAR) | AAR sesudah respons selesai, IAR di tengah respons; empat pertanyaan: apa yang diharapkan terjadi, apa yang terjadi, apa yang berjalan baik, apa yang bisa diperbaiki. Fasilitasi tanpa menyalahkan individu. | Pertanyaan empat langkah dipakai sebagai kerangka isian pelajaran; fokus pada sistem dan prosedur, bukan orang. IAR memberi alasan kaji ulang boleh dimulai saat fase transisi, bukan hanya sesudah selesai. |
| ICS-214 Activity Log (sudah dirujuk di paket tindak-langkah) | Catatan kegiatan berurutan waktu. | Linimasa kejadian adalah log kegiatan yang dirangkai mesin. |

Sumber: fema.gov HSEEP (AAR/IP, 2020), who.int panduan AAR dan IAR COVID-19 (2019 dan 2020), kerangka nasional NIMS. Isi ringkas ini dari pengetahuan penulis tentang dokumen-dokumen itu; tautan dan edisi persisnya diperiksa ulang saat tiket KU-01 sebelum dikutip di layar.

## 2. Fakta kode repo (diperiksa 15 Nov 2026)

| Kebutuhan | Yang sudah ada | Dipakai bagaimana |
| --- | --- | --- |
| Tahap waktu deteksi, tugas, konfirmasi, kabar, tiba, padam, terverifikasi | `TAHAP` di `src/sla.js:29`; `waktuTahap` `:76` memilih jam deteksi asli (min `himawari_awal`, `terdeteksi_awal`, `dibuat`) dan menandai `perkiraan`; `durasiTahap` `:82` memberi null bila tak ada data atau urutan terbalik; target hanya konfirmasi 6 jam dan kabar 24 jam (`:25`) | Fungsi murni diimpor; tanpa hitungan kedua |
| Kolom waktu tugas | `tugas_api`: `dibuat`, `konfirmasi_pada`, `padam_pada`, `verif_pada`, `padam_verif`, `cek_ulang_pada` (migrasi 0029); `terdeteksi_awal` (0043); `tugas_muncul` (0037) | Linimasa karhutla per tugas |
| Linimasa per tugas dan pelajaran | `linimasa()` di `src/operasi_lapangan.js:586-621` merakit peristiwa dari `tugas_isian`, `penugasan`, `ops_garis`, `ops_permintaan`, `ops_drop`, `ops_periode`, `ops_serah`, `ops_jejak`, `tugas_muncul`, `ops_pelajaran`; `buatPelajaran` `:623-634` batas 20 catatan per tugas, 5 sampai 1000 karakter | Dibaca per tugas terhubung; tidak ditiru ulang. Nama personel ada di jalur ini (`p.nama`), jadi TIDAK dipakai mentah |
| Tabel pelajaran lapangan | `ops_pelajaran(id, tugas_id FK tugas_api ON DELETE CASCADE, catatan, oleh, dibuat, dummy)` migrasi 0039 | Sumber catatan lapangan, read-only |
| Pelajaran kampus | `km_pelajaran(aktivasi_id UNIQUE, kerangka, analisis, status draf/terbit)` migrasi 0083; tidak dipakai di `src/` maupun `public/` | Hanya skema; tidak dipakai (D5) |
| Kejadian dan tautan ke tugas | `sk_kejadian` (fase, `fase_diubah`, `tanggap_mulai`, `tanggap_akhir`), `sk_kejadian_kab`, `sk_kejadian_sumber(sumber, kode, kejadian_id)`, `sk_jejak(waktu, oleh, obyek, aksi, dari, ke)` migrasi 0120; `pasang.py:345` menjadikan `tugas_api` sumber modul | Tugas terhubung = `sk_kejadian_sumber` dengan `sumber = 'tugas_api'` dan `status = 'terpasang'`; bahwa `kode` berisi id tugas diperiksa di KU-03 |
| Lifeline | `lf_riwayat` append-only dengan pemicu tolak ubah dan hapus (0141), `lf_status`, `lf_usulan` | Linimasa pulih per layanan; tabel boleh belum ada (503 pola) |
| 3W dan tawaran | `tw_baris(kejadian_id, kab4, klaster, org_id, status, mulai, selesai)`, `tw_tawaran`, `tw_tawaran_riwayat` (0143), rute `src/tiga_w.js` | Hitungan organisasi dan klaster aktif; tanpa nama kontak organisasi |
| Tindak lanjut | `dl_tindak(kunci PK, status belum/proses/selesai, catatan <= 300, oleh <= 40, waktu)` dan `dl_tindak_log(... langkah <= 400)` migrasi 0128; CHECK kunci hanya panjang 10 sampai 120, tanpa awalan; fungsi `dlStmtTindak`, `dlStmtTindakLog`, `dlTindakRiwayat`, `dlTindakLaju` di `src/hak.js:465-471` | Dipakai ulang untuk kunci `kaji\|...` |
| Pembatas kunci Dalops | `RE_KUNCI` di `src/dalops_tindak.js:11` hanya menerima `banjir\|<prov>\|<kab>\|<jenis>`; `GET /api/dalops/tindak` jendela 60 hari maks 2000 baris | Rute kaji ulang punya regex sendiri; rute Dalops harus mengecualikan awalan `kaji\|` (Q10) |
| Pola rute Siklus | `RUTE_SIKLUS` di `src/siklus.js:22` digabung dari modul; tiap rute `{izin: [...], f}`; izin `STAF`, `BP`, `PDKO`, `KO`, `PM`, `SA` (`:52`); `RUTE_LIFELINE` di `src/lifeline.js:81` | Pola persis yang diikuti |
| Migrasi terakhir | `0145_masuk_kode_akun.sql`; migrasi 0141 sampai 0143 milik Lifeline dan 3W belum tentu terapan di produksi (LF-11) | Nomor KU diambil saat tiket |

## 3. Ruang yang belum ada

Tidak ada tabel kaji ulang, tidak ada tautan `ops_pelajaran` ke kejadian (hanya ke tugas), tidak ada tenggat atau penanggung jawab pada `dl_tindak`, dan tidak ada rute baca `dl_tindak` per awalan kunci.
