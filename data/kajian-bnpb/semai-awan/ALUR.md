# ALUR: Peluang Semai Awan dan Prakiraan Asap

## 1. Alur data (mesin)

```
ECMWF IFS 0,1 derajat (00z, 12z)          FIRMS VIIRS (titik.yml tiap 3 jam)      kota.json, op_base, gelar armada
        |  .index -> rentang byte                  |  kluster.json                         |
        v                                          v                                       v
scripts/operasi/semai_ifs.py  ----> data/raw/semai/<putaran>/*.npz (tidak di-commit)
        |
        v
scripts/operasi/semai.py  (gerbang, faktor Q D T, zona, jendela terbang)  ----> R2 operasi/semai/semai.json
        |                                                                   ----> R2 operasi/semai/awan_<langkah>.png
        v
scripts/udara/lintasan.py (angin IFS 0,1 bila ada, bobot FRP)   ----> public/udara/data/lintasan.json (sudah ada, diperkaya)
        |                                                        ----> R2 operasi/semai/asap_<langkah>.png
        v
scripts/operasi/semai_beku.py  ----> R2 operasi/semai/arsip/<putaran>.json (append-only, tidak pernah ditimpa)
        |
        v (sesudah jam zona + 4 jam)
scripts/operasi/semai_nilai.py (GSMaP atau IMERG di titik hujan, sortie OMC) ----> public/data/operasi/semai_rapor.json
```

Workflow `semai.yml` berjalan pukul 10.00 dan 22.00 UTC (17.00 dan 05.00 WIB; putaran 0,1 derajat lengkap sekitar 9,5 jam sesudah
jam awalnya), masuk daftar
`scripts/terbit/jaga_jadwal.mjs`. Putaran gagal: berkas lama dibiarkan, layar menyebut umur data (gagal-lunak).

## 2. Alur pengguna: Pos komando, pagi hari

1. Pusdalops membuka `/operasi`, seksi **Peluang semai**. Bilah sumber menyebut putaran IFS, jumlah satelit VIIRS, dan umur data.
2. Kartu **Rekomendasi** menampilkan Zona A. Peta sudah di jam terbaik Zona A; lingkaran A dengan garis putus ke titik hujan.
3. Pengguna membaca alasan C, F, T, B. Klik koordinat menyalin "-1.400, 115.300".
4. Pengguna menggeser bilah jam atau menekan putar untuk melihat awan dan asap bergerak.
5. Klik Zona B di daftar: peta pindah ke B, bilah jam ke jam terbaik B, kartu Rekomendasi berganti B.
6. Klik **Jadikan target renlap**: dialog konfirmasi menyebut base terdekat dengan armada OMC, jendela terbang, koordinat. Simpan:
   target OMC masuk renlap base itu dengan alasan "zona semai B, skor 0,74, putaran 14 Nov 00z"; zona berlabel "sudah target".
7. Klik **Salin ringkasan**: teks Indonesia siap tempel ke grup WA.

Keadaan kosong: tidak ada zona -> kartu kosong (PRD F-8), lapisan awan dan asap tetap tampil. Data > 6 jam -> pita peringatan.
Putaran belum pernah ada -> "prakiraan belum tersedia", tanpa zona.

## 3. Alur Tinjau BMKG

1. Pilih tampilan **Tinjau BMKG**. Pita keterangan: "setiap skor menampilkan masukan dan bobotnya".
2. Geser bobot awan, hanyut ke api, jarak kota. Peringkat dan lingkaran zona dihitung ulang di peramban dari sel kandidat yang
   dikirim di `semai.json`; tidak memanggil server.
3. Saklar **seperti Nimbus**: skor dihitung dengan jumlah berbobot dan tanpa syarat awan hangat, untuk pembanding.
4. Tabel faktor 10 sel terbaik; **Salin CSV**.
5. Bobot yang digeser tidak disimpan dan tidak mengubah zona orang lain; setel ulang mengembalikan bobot bawaan.

## 4. Alur Mitra lintas batas

1. Pilih **Mitra**. Pita: "tampilan mitra: cluster teragregasi dan asap; titik api per piksel tetap di BNPB".
2. Titik api disembunyikan, diganti lingkaran cluster teragregasi; zona dibulatkan 0,5 derajat dengan "(±0,5 derajat)"; alasan dan
   titik hujan tidak tampil; tombol renlap tidak tampil.
3. Kartu Peringatan asap tampil penuh. **Salin ringkasan** menghasilkan teks Inggris.
4. Tidak ada tautan publik (Q5 bawaan).

## 5. Alur penilaian (malam berikutnya)

1. `semai_nilai.py` membaca arsip putaran yang jendela terbangnya sudah lewat lebih dari 4 jam.
2. Untuk tiap zona: hujan satelit dalam 25 km titik hujan pada 30 sampai 90 menit sesudah jam zona, lawan sel pembanding acak yang
   lolos gerbang awan di jam yang sama tetapi tidak dipilih.
3. Untuk tiap sortie OMC di `omc_sortie`: apakah dalam 25 km zona aktif di jendela terbangnya.
4. Rapor ditulis; layar menampilkan kartu Rapor dengan n, persen, dan selang kepercayaan; "data kurang" bila n < 30.

## 6. Status zona

| Status | Arti | Diubah oleh |
| ------ | ---- | ----------- |
| usulan | keluar dari putaran mesin | `semai.py` |
| target | sudah dijadikan target renlap OMC | tombol F-9 |
| disemai | ada sortie OMC dalam 25 km di jendela terbang | `semai_nilai.py` |
| dinilai | hujan satelit sudah dinilai | `semai_nilai.py` |
| kedaluwarsa | jendela terbang lewat tanpa sortie | `semai_nilai.py` |
