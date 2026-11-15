# RENCANA-UJI: Pemetaan bangunan oleh relawan

Uji integrasi dengan D1 sungguhan (harness `tests/warga`), tanpa mock D1; pipeline Python lewat self-check `__main__`.

| Kode | Kriteria terima | Bukti |
| --- | --- | --- |
| T1 | Rasio = N_osm / N_pembanding; N_pembanding < 100 menghasilkan null, bukan nol atau tak hingga. | `python3 scripts/pemetaan/kelengkapan.py` |
| T2 | Rasio di atas 1 tampil apa adanya dengan catatan metode, tetapi skor memakai min(rasio, 1). | sama |
| T3 | Konstanta Py sama dengan JS. | `node --test tests/kemitraan/pemetaan_konst.test.mjs` |
| T4 | Staf tanpa persetujuan pemilik tidak bisa mengisi tautan; status loncat ditolak 400. | `node --test tests/warga/pemetaan.test.mjs` |
| T5 | Akun kampus A tidak melihat sumbangan atau anggota kampus B. | sama |
| T6 | Riwayat proyek bertambah tiap perubahan; tidak ada rute ubah atau hapus. | sama |
| T7 | Satu kab tidak bisa punya dua proyek aktif. | sama |
| T8 | `pemetaan_kelengkapan.json` tidak memuat nama, email, atau nama pengguna OSM. | gerbang pindai `public/data/kemitraan/**` |
| T9 | Data ohsome lewat batas segar: layar menandai basi, urutan tidak diubah diam-diam. | uji layar |
| T10 | Kuis jujur: 10 kab berstrata (minimal 3 perkotaan, 3 perdesaan) diperiksa manual; kecocokan kelas >= 7 dari 10 sebelum pil "Belum diuji" boleh dilepas. | catatan manual di TIKET HR-05 |
| T11 | Uji sambungan: kueri ohsome nyata untuk satu kab menjawab 200 dan batas laju tercatat. | HR-03 |
| T13 | Status `dikirim` ditolak 400 bila daftar penyuntingan terorganisir belum dicentang. | `node --test tests/warga/pemetaan.test.mjs` |
| T12 | Tidak ada panggilan jaringan keluar dari Worker ke HOT atau OSM. | uji pindai `src/pemetaan.js` |

Layar ditinjau pemilik di `http://localhost:8800/kemitraan`.
