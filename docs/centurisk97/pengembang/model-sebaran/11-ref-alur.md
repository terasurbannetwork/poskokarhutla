# Referensi: workflow, keluaran, uji

Halaman ini mendaftar workflow, berkas keluaran, serta uji dan gerbang yang menjaga modul.

## Workflow GitHub Actions

| Workflow dan jadwal | Langkah milik modul ini |
| --- | --- |
| `.github/workflows/titik.yml`, cron `40 */3 * * *`, `10 9 * * *`, `55 22 * * *`, dan `workflow_dispatch` | Pulihkan catatan uji prospektif (cache `prospektif-` dan R2), `prospektif.py` (boleh gagal, batas 10 menit), `gerbang.py uji` lalu `gerbang.py` (boleh gagal), arsip catatan ke R2 (menolak bila arsip baru menyusut), `jejak.py` (hanya putaran jam UTC 21 sampai 23 dan dispatch; batas 17 menit), simpan cache. Putaran tambahan `10 9` dan `55 22` tidak menjalankan langkah harian dan enam jam (dijaga `tests/agen/gerbang-antrean-data.test.mjs`) |
| `.github/workflows/data.yml`, cron `20 14 * * *` (21.20 WIB) | Pulihkan arsip risiko P1 (cache `risiko-p1-` dan R2), `risiko_produksi.py uji` lalu `harian` (arsip NOAA-20, nilai, ramal, keluaran), unggah `risiko/terbaru.json` dan `risiko/prospektif.json` ke R2 hanya bila pemulihan R2 berhasil, simpan cache; langkah "Pakai lapisan statis dari repo, bukan dari cache" (baris 55 sampai 67) memastikan `public/data/model_sebaran.json`, `sebaran_*.json`, `musim_awal.json`, dan `tren_karhutla.json` yang di-commit menang atas cache lama karena dibuat skrip lokal, bukan oleh workflow ini |
| `.github/workflows/terbit.yml` | Menerbitkan situs (membaca `public/data`) |

Skrip berat latih (`latih.py latih`, `lolos.py cv`, `lolos.py akhir`, `lolos.py selang`, `risiko_mingguan.py balik`) tidak dijalankan di CI: berjam-jam, memakai memori sampai 3 GB, dan menulis JSON publik. Perintah pembaruan model lengkap ada di `scripts/sebaran/SEBARAN_MODEL.md` bagian 4.

## Berkas keluaran di `public/data/`

`model_sebaran.json` (sekitar 242 KB, jangan dibaca utuh; kuncinya: `versi`, `dibuat`, `jenis`, `fitur`, `bias`, `pohon`, `tau`, `R`, `sel_m`, `ha_sel`, `lepas_sel`, `profil_lintasan`, `iklim`, `frp_bawaan`, `kal_lepas`, `geser_logit`, `pilihan_strata`, `kinerja_uji`, `catatan`, `selang`, `lolos`, `lolos_ulang`), `sebaran_kasus.json`, `sebaran_galat.json`, `sebaran_pendorong.json`, `sebaran_cerita.json`, `musim_awal.json`, `tren_karhutla.json`, `prospektif.json`, `prospektif_historis.json`, `gerbang_model.json`, `jejak_api.json`, `risiko_mingguan_uji.json`, `prioritas_uji.json`. Jangan menyunting `model_sebaran.json` dengan tangan; pembaruannya lewat `lolos.py akhir` dan `latih.py`.

## Uji dan gerbang yang menjaga modul

Dijalankan dari akar repo (semua murah dan tanpa data mentah kecuali ditandai):

```
python3 scripts/sebaran/latih.py uji
python3 scripts/sebaran/gbdt.py uji
python3 scripts/sebaran/simfisika.py uji
python3 scripts/sebaran/umum.py uji
python3 scripts/sebaran/prospektif.py uji
python3 scripts/sebaran/gerbang.py uji
python3 scripts/sebaran/lolos.py uji
python3 scripts/sebaran/fitur.py uji
python3 scripts/sebaran/kasus.py uji
python3 scripts/sebaran/galat.py uji
python3 scripts/sebaran/jejak.py uji
python3 scripts/sebaran/risiko_produksi.py uji
python3 scripts/sebaran/risiko_mingguan.py uji
python3 scripts/sebaran/uji_js.py
node public/risiko7.js
node --test --test-concurrency=1 tests/warga/risiko7.test.mjs
npm run uji:agen
python3 scripts/sebaran/splice_sebaran.py --cek
```

Catatan penting:

1. `uji_js.py` adalah gerbang utama kesetaraan Python dan JavaScript (membutuhkan node, `data/raw/sebaran`, dan `public/data/lahan`; enam kasus nyata). Gagal bila fitur membesar beda lebih dari 1e-6 atau peluang hari-1 beda lebih dari 1e-4; juga memastikan evaluator menolak lintang 20, bujur 150, waktu rusak, cuaca tanpa 30 hari masa panas, dan model kosong. Jalankan tiap kali `sebaran_model.js`, `fitur.py`, `latih.py`, atau `lolos.py` berubah.
2. `uji` pada skrip yang butuh `data/raw/` bisa gagal bila arsip tidak ada; itu bukan regresi.
3. `tests/warga/risiko7.test.mjs` menguji gerbang akses 401, 503, 500, 405, penanda `/akses`, dan identitas dua objek R2.
4. `tests/agen/gerbang-antrean-data.test.mjs` menjaga konsistensi cron dan kondisi langkah di `titik.yml`.
5. Setelah perubahan layar: buka Insight dan Simulasi di peramban pratinjau lokal (`http://localhost:8800/sim`) dan periksa kartu cocok dengan `model_sebaran.json` dan `prospektif.json`.
6. Verifikasi independen oleh `validasi-model` wajib setiap angka kinerja berubah. Tidak ada subagen yang boleh menjalankan `latih.py latih` atau `lolos.py cv`, `akhir`, `selang` tanpa diminta.
