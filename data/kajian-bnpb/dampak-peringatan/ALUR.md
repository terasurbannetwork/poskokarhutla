# ALUR: Dampak peringatan dini ujung ke ujung

## Alur data tiap jam

1. Worker sudah menarik CAP BMKG tiap 10 menit ke D1 (`src/nowcast.js`). Tidak ada pembaca CAP baru.
2. Workflow `dampak_peringatan.yml` (menit 20 tiap jam, Q3) memanggil `python3 -I scripts/siklus/dampak_peringatan.py`.
3. Skrip membaca `GET /api/cuaca/nowcast` dari situs sendiri (alamat dasar dari variabel lingkungan, bawaan `https://centurisk97.id`). Hanya peringatan aktif. Umpan lebih tua dari 3 jam: semua keluaran bertanda "belum terukur", tidak ada angka (ALGORITMA 1).
4. Himpunan poligon aktif diberi sidik. Sama dengan jalan terakhir: hitung keterpaparan dilewati. Status selalu dihitung ulang dari prakiraan, peringatan, dan kesegaran (D3).
5. Tiap peringatan dipetakan ke bahaya (ALGORITMA 2). Kab yang tersentuh = poligon berpotongan dengan geometri batas kab (D35).
6. Untuk tiap kab tersentuh, mesin paparan (`paparan.py`) menghitung bangunan, penduduk tiga sumber, kelas bahaya, dan desa (ALGORITMA 3). Fasilitas dihitung `fasilitas.py` (ALGORITMA 3.4).
7. Status per (kab, bahaya) dihitung `scripts/prediksi/status_prakiraan.py` dari `prediksi.json`, peringatan aktif, kelas bahaya kab, dan kesegaran sumber (ALGORITMA 5).
8. Keluaran ditulis atomik ke R2 `dampak_peringatan/`: `ringkas.json` (kab ke atas, publik lewat Worker), `desa/<kab4>.json` (staf), `status.json` (publik). Sekali sehari satu baris ringkas ditambahkan ke arsip append-only di repo (D19).
9. Gagal sebagian (satu kab tanpa grid bangunan, satu sumber mati): bagian itu "belum terukur" dan `catatan` terisi; jalan tidak berhenti.

## Alur pembaca publik

1. Buka `/prediksi` tab Besok: status per kab per bahaya dan ringkasan kab (penduduk terpapar dibulatkan, jumlah fasilitas). Atau buka Alun-alun `/lapor` dan geser saklar ke Peringatan.
2. Peta Alun-alun mewarnai tiap kab menurut status; abu bila belum terukur; pil hipotesis tampil selama gerbang belum lolos. Poligon BMKG aktif digambar di atasnya.
3. Sentuh kab: kartu berisi status per bahaya, penduduk terpapar, jumlah fasilitas, dan teks peringatan BMKG beserta sumber dan waktu berlaku.
4. Saklar kembali ke Kejadian: tampilan lama kabar-alun tanpa perubahan.

## Alur warga berlangganan

1. Warga sudah berlangganan kecamatan (paket `pwa-peringatan`).
2. Cron Worker jam-jaman menit 29 (`src/worker.js:1021`, sembilan menit sesudah workflow) memeriksa `status.json` selain `prediksi.json`. Bila status kab naik ke ambang pelanggan untuk bahaya yang dipilih warga (dan lebih tinggi dari yang terakhir dikirim untuk (kab, jenis, tanggal sasaran)), satu notifikasi per perangkat dikirim, dengan batas harian satu per perangkat per kab per jenis lintas kedua pemicu (D30).
3. Isi: nama kab dan kecamatan, jenis, tingkat, label hipotesis atau "prakiraan belum teruji", tautan ke tampilan Peringatan. Tanpa angka, tanpa kode wilayah.

## Alur peta tiap bencana

1. Buka halaman peta bencana yang menyala (karhutla, banjir dengan tab Longsor, cuaca).
2. Daftar lapisan peta memuat "Status prakiraan" (bawaan mati). Nyalakan: kab diwarnai menurut status bahaya halaman itu; poligon BMKG yang cocok digambar.
3. Sentuh kab: kartu dengan status bahaya halaman itu, penduduk terpapar dibulatkan, jumlah fasilitas, teks peringatan BMKG bila ada. Karhutla: status per kab dan label saja.
4. Data dari `status.json` dan `ringkas.json` yang sama dengan Alun-alun; tidak ada pembacaan sendiri.

## Alur staf Dalops

1. Buka `/bnpb/dalops`, seksi Dampak peringatan di samping Prakiraan dan kejadian.
2. Peta menampilkan status dan poligon BMKG; tabel per desa memuat penduduk per kelas bahaya, balita dan lansia, serta fasilitas bernama. Rincian diambil lewat rute staf yang membaca R2.
3. Unduh CSV (angka dibulatkan sama dengan layar).

## Alur Layar Pimpinan

Satu kartu: jumlah kab Siaga dan Awas, penduduk terpapar total dibulatkan, waktu data. Tautan ke Dalops. Sumber basi: kartu menulis "belum terukur".

## Keadaan

```
peringatan aktif ada, sumber segar, status dihitung ---> Normal | Waspada | Siaga | Awas
peringatan aktif tidak ada, semua sumber segar        ---> kartu "tidak ada peringatan aktif"; status tetap dihitung dari prakiraan
umpan CAP basi (> 3 jam) atau prediksi.json basi (> 36 jam) ---> status "belum terukur" (abu), penduduk null
kab tanpa grid bangunan provinsi                      ---> terliput false, penduduk null
gerbang belum boleh_tampil                            ---> pil hipotesis di semua status
```
