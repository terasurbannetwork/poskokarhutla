# ALUR: Semai Redistribusi Banjir dan Penguji Efektivitas

## 1. Alur data (mesin)

```
public/prediksi/data/prediksi.json (BNJ, HJN, waspada)      op_semai_sasaran (manual, D1)      semai_bobot.json sasaran_tetap
public/banjir/data/cuaca_bmkg_kab10.json (BMKG harian)              |  GET rute staf                    |
                     \___________________________________________ |__________________________________/
                                                                   v
data/raw/semai/<putaran>/*.npz (unduhan IFS yang sama dengan karhutla, semai_ifs.py)
                                                                   |
                                                                   v
scripts/operasi/semai.py --tujuan karhutla  ---->  R2 operasi/semai/semai.json            (tidak berubah)
scripts/operasi/semai.py --tujuan banjir    ---->  R2 operasi/semai/semai_banjir.json
        |  sasaran -> lintasan mundur (lintasan.py angin_di, geser) -> sel hulu -> gerbang G1-G9 -> Q H P -> zona cegat
        v
langkah "Arsip putaran" semai.yml  ---->  R2 operasi/semai/arsip/<putaran>_banjir.json (append-only)
        |
        v (harian, sesudah hujan hari itu terbit)
scripts/omc/efek_banjir.py  (Lapis B; membaca op_semai_target tujuan banjir, omc_bmkg.json, CHIRPS, IFS)  ---->  R2 operasi/semai/rapor_banjir.json
scripts/omc/efek_banjir.py lapis-a (lokal, sekali, analisis)                                              ---->  riset/HASIL-A.md
```

`semai.yml` tetap satu workflow (10.00 dan 22.00 UTC): sesudah langkah karhutla, langkah banjir berjalan. Gagal langkah banjir tidak
menggagalkan langkah karhutla (gagal-lunak, berkas banjir lama dibiarkan, layar menyebut umur).

## 2. Alur pengguna: Pos komando tujuan banjir

1. Pusdalops membuka `/operasi`, seksi Peluang semai, menekan **Banjir** di saklar tujuan. Hash menjadi `#semai/banjir`.
2. Bilah sumber menyebut putaran IFS, terbitan prakiraan `/prediksi`, dan pernyataan BMKG yang dibaca.
3. Kolom kanan: kartu **Sasaran hari ini** (daftar kab/kota, asal tiap sasaran, pil "belum teruji" untuk prakiraan kita), lalu
   **Rekomendasi** zona A.
4. Peta: poligon sasaran, awan layak semai, angin pengarah, zona cegat dengan garis putus dari titik hujan ke tepi sasaran
   ("tiba sekitar 2 jam").
5. Pengguna membaca alasan C, H, P, B; klik zona lain di daftar.
6. **Jadikan target renlap**: dialog induk, judul "Jadikan Zona BA target renlap OMC (banjir)", alasan otomatis memuat sasaran.
   Target tersimpan di `op_semai_target` dengan `zona_id` `<putaran>-BA`.
7. **Tambah sasaran**: pilih kab/kota. Bila ada di `kandidat_sasaran`, zona dihitung ulang di peramban; bila tidak, toast
   "sasaran disimpan, dihitung di putaran berikutnya" dan baris `op_semai_sasaran` dibuat.
8. **Salin ringkasan** tujuan banjir.

Keadaan kosong sesuai ALGORITMA §7. Kembali ke **Karhutla**: layar karhutla persis seperti sebelum paket ini.

## 3. Alur penguji efektivitas

### 3.1 Lapis A (retrospektif, sekali, lokal)

1. Pra-registrasi `riset/PRAREG-A.md` ditulis dari RENCANA-UJI §6, disidik (`sha256`) dan di-commit **sebelum** hujan hasil ditarik.
2. `efek_banjir.py lapis-a tarik`: CHIRPS harian dan IFS Open-Meteo per kab untuk provinsi-hari dalam domain.
3. `efek_banjir.py lapis-a analisis`: TWFE, permutasi, plasebo, MDE; tulis `riset/HASIL-A.md` dan `hasil_a.json`.
4. Pemeriksa `validasi-model` mencocokkan kode dengan PRAREG. Pemilik membaca, baru kartu Rapor boleh menyebut Lapis A.

### 3.2 Lapis B (prospektif, harian)

1. Tiap hari, untuk target tujuan banjir yang `hari_sasaran`-nya (diambil server dari arsip, bukan `tanggal` kiriman klien) sudah lewat dan hujannya sudah terbit: catat sasaran-hari perlakuan.
2. Pilih kab-hari pembanding yang tidak jadi target, tidak di provinsi ber-OMC BMKG hari itu, dan prakiraannya setara.
3. Tulis rapor. Kartu Rapor: "data kurang (n = x dari sekitar 250 yang dibutuhkan)" sampai ambang n di RENCANA-UJI §6.

## 4. Status zona tujuan banjir

| Status | Arti | Diubah oleh |
| ------ | ---- | ----------- |
| usulan | keluar dari putaran mesin | `semai.py --tujuan banjir` |
| target | dijadikan target renlap OMC | tombol F-9 |
| periode BMKG | provinsi zona atau sasaran punya periode OMC `Pengurangan CH - Bencana` aktif di tanggal target | `efek_banjir.py` |
| dinilai | hujan sasaran hari itu sudah masuk penguji | `efek_banjir.py` |
| kedaluwarsa | jendela terbang lewat tanpa target | `efek_banjir.py` |

"Periode BMKG" bukan bukti pesawat terbang ke zona itu; hanya bukti ada operasi resmi di provinsi itu.
