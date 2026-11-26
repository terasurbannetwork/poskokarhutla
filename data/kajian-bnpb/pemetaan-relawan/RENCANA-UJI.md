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

## Kriteria T10 terkunci (26 Nov 2026, HR-05, ditulis sebelum satu angka uji dihitung)

Kriteria di bawah ini tidak boleh diubah sesudah lembar periksa dibuat. Mengubahnya berarti undian baru dengan benih baru dan lembar baru. Mesinnya `scripts/pemetaan/uji_jujur.py`; sidik bagian ini (SHA-256 dari judul sampai akhir bagian) dicatat di lembar periksa.

1. **Benih undian** 20261126. Kandidat = kab di `public/data/kemitraan/kode.json` yang provinsinya punya grid `data/terkunci/bangunan/halus_<prov>.json`. Kandidat diurutkan menurut kab4 lalu diacak dengan `random.Random(20261126).shuffle`.
2. **Strata** diisi menurut urutan acak itu, paling banyak satu kab per provinsi: 4 perkotaan (nama berawalan "Kota"), 4 perdesaan (kabupaten dengan kepadatan bangunan Open Buildings di bawah 50 per km persegi, luas dari `paket.luas_km2`), 2 campuran (kabupaten lain dengan kepadatan 50 ke atas). Total 10, memenuhi minimal 3 perkotaan dan 3 perdesaan.
3. **Kelas mesin** = kelas kab dari `kelengkapan.py` (zona = seluruh poligon kab, aproksimasi yang sama dengan HR-04), ambang Q6 apa adanya (di bawah 0,6 tipis; 0,6 sampai 0,85 sedang; di atas 0,85 memadai). Kab yang rasionya null (pembanding di bawah 100 atau ohsome tidak menjawab) dilewati dan diganti kab berikutnya dalam urutan acak untuk strata yang sama; kab yang dilewati dicatat.
4. **Petak periksa** 1 km persegi per kab: ubin 0,009 derajat (9 x 9 sel grid halus 0,001 derajat). Ubin dengan minimal 20 bangunan Open Buildings diundi berbobot jumlah bangunan, memakai `random.Random(20261126 + int(kab4))`. Dua ubin cadangan diundi dari urutan yang sama.
5. **Periksa manual** oleh manusia (pemilik atau orang yang ditunjuk), bukan mesin: buka petak di citra satelit dan di peta OSM, perkirakan berapa persen bangunan yang tampak di citra sudah punya poligon OSM, tulis kelas manual dengan ambang yang sama (di bawah 60 persen tipis; 60 sampai 85 persen sedang; di atas 85 persen memadai). Pemeriksa tidak melihat kelas mesin sebelum menulis kelas manual (lembar isian memuat kolom mesin di berkas terpisah).
6. **Petak tak terbaca** (awan, citra kabur, citra lebih tua dari bangunan): ganti ke cadangan 1, lalu cadangan 2. Bila ketiganya tak terbaca, kab itu dihitung **tidak cocok**.
7. **Vonis**: cocok = kelas manual sama dengan kelas mesin. Cocok minimal 7 dari 10 = `lulus`; pil "Belum diuji" boleh dilepas sesudah pemeriksa bersih (`validasi-model`) mengulang hitungan dari lembar terisi. Di bawah 7 = `gagal`: pil tetap, ambang direvisi.
8. **Kalibrasi bila gagal**: usulan ambang baru boleh disusun dari lembar ini, tetapi tidak boleh divonis dengan lembar yang sama. Ambang baru diuji dengan undian 10 kab baru (benih 20261127) sebelum masuk `konst.py` = `konst.js`.
9. **Pelengkap, bukan penentu vonis**: rasio OSM lawan Open Buildings di dalam petak itu sendiri dicatat untuk membaca sebab beda (petak lawan kab), tetapi tidak mengubah vonis.
