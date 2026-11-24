# ALUR: Kedalaman gambut hilang dari InSAR

## 1. Alur data (lab, lokal)

```
di luar repo (jalur paket penurunan-tanah, izin pemilik Q1)
  LiCSAR (naik dan turun) ─▶ LiCSBAS ─▶ vel.filt.mskd (float32, mm/thn) + EQA.dem_par
        └─ dibaca scripts/data/insar_gambut.py lewat subsiden.baca_par, baca_raw, vertikal
Sentinel-2 pra dan pasca api ─▶ dNBR (aturan luas_citra.py) ─▶ topeng terbakar
public/data/lahan/gambut.geojson ─▶ memotong topeng dan memilih kontrol (cincin 2 sampai 20 km)

insar_gambut.py
  per jendela waktu (selama api, pasca 30 sampai 90 hari):
    Δh_tambahan = median(vertikal terbakar) - median(vertikal kontrol)
    D_insar = α × Δh_tambahan
  uji koherensi, jumlah piksel, kepekaan (aliasing, dekorelasi)
        └─▶ tests/insar-gambut/hasil_lab.json dan hasil_lab.md  (di-commit, bukan produk)
                 └─ vonis: selaras | meremehkan | tak_terukur   (RENCANA-UJI §2)
                       └─ hanya selaras + Q2: kalibrasi.py ─▶ gambut_bara.pasang_kalibrasi (IG-07)
```

## 2. Alur kerja manusia

1. Pemilik menjawab Q1 (izin unduh dan komputasi).
2. `pipa-data` memeriksa data (IG-01) dan mengunci kriteria (IG-02) sebelum lab.
3. Lab jalan lokal; hasil ditulis; `validasi-model` dengan konteks bersih menilai tanpa melihat kesimpulan pengerja.
4. Pemilik menerima laporan selisih; keputusan Q2 hanya diambil sesudah vonis.

## 3. Keadaan

| Keadaan | Perilaku |
| ------- | -------- |
| Bingkai LiCSAR tidak ada | laporan menulis "tak terukur", tiket selesai dengan temuan itu |
| Koherensi kurang | vonis `tak_terukur`, bukan 0 cm |
| Vonis `meremehkan` | D literatur tetap; penjelasan ditulis; L-band jadi kandidat (Q4) |
| Vonis `selaras` | belum dipasang sebelum Q2 |
