# RENCANA-UJI

Jalankan:

```
node --test tests/warga/meja.test.mjs tests/warga/migrasi_beku.test.mjs tests/warga/gerbang.test.mjs tests/agen/gerbang-d1.test.mjs tests/agen/gerbang-paket-modul.test.mjs
npm run uji:warga
```

Kriteria terima (uji integrasi Miniflare, D1 sungguhan, tanpa mock, di `tests/warga/meja.test.mjs`):

| Kriteria | Nama uji (awalan) |
| --- | --- |
| Kolom opsional kaji cepat, baris lama tetap terbaca dan bisa diubah | juklak kaji cepat |
| Pengungsi agregat, turunan server, satu per tempat per hari, rekap terbaru per tempat, batas 6000 huruf | juklak pengungsi |
| Alur pengaduan, tolak lompat tahap, tenggat, petugas ditolak | juklak pengaduan: alur |
| Identitas pelapor tidak bocor; akses hanya Irtama/ULP; pembukaan tercatat | juklak pengaduan: identitas |
| Klaster, aturan triwulan, tanpa stok | juklak klaster |
| Risiko, level residu, Format 2/3/4 CSV | juklak risiko |
| Migrasi 0118 atas data lama, FK utuh, trigger aktif, idempoten | migrasi 0118 |
| Dummy mengisi semua meja baru dan hapus bersih | dummy: hanya Super Admin |
