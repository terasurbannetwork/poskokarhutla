# DESAIN-TEKNIS: Kedalaman gambut hilang dari InSAR

## 1. Berkas dan pemilik

| Berkas | Isi | Pemilik (`ilmu.mjs pemilik`) |
| ------ | --- | ---------------------------- |
| `scripts/data/insar_gambut.py` | skrip lab: baca keluaran LiCSBAS lewat fungsi `subsiden`, topeng, selisih, vonis, `--uji` | `pipa-data` |
| `scripts/banjir/subsiden.py` | **tidak diubah**; hanya diimpor (fungsi `baca_par`, `baca_raw`, `vertikal`, `kuantil`) | `banjir` |
| `scripts/data/gambut_bara.py` | tidak diubah sampai IG-07 | `pipa-data` |
| `scripts/data/kalibrasi.py` | tambah kunci kalibrasi hanya di IG-07 | `pipa-data` |
| `tests/insar-gambut/hasil_lab.json`, `hasil_lab.md` | hasil lab beku | tanpa pemilik sampai IG-00, lalu `penulis-gerbang` |
| `tests/insar-gambut/*.test.mjs` | gerbang berkas dan kata | `penulis-gerbang` |
| `package.json` skrip `uji:insar` | | `mekanik-mesin` |

Tidak ada migrasi D1, rute Worker, R2, layar, atau workflow baru. Lab jalan lokal, bukan di Actions (data besar, izin Q1).

## 2. ADR

### ADR-1: impor `subsiden`, tanpa salin (D2)

`subsiden.py` memuat `from umum import KELUAR, simpan` dan `from wilayah import AKAR, _cincin` lewat `sys.path`. `insar_gambut.py` menambahkan `scripts/banjir` ke `sys.path` dengan cara yang sama. Bila impor punya efek samping, IG-01 memindah fungsi murni ke modul kecil dengan persetujuan `banjir`; tidak ada salinan.

### ADR-2: topeng terbakar dari `luas_citra.py`

Fungsi topeng dan ambang dNBR dipakai ulang (`topeng`, `pip`, `luas`); bila fungsi itu tidak mengekspos piksel, IG-01 mencatat dan meminta perubahan kecil terpisah di `luas_citra.py` (diperiksa `validasi-model`), bukan menyalin ambang.

### ADR-3: hasil di `tests/`, bukan `public/`

Hasil lab bukan produk dan tidak terbit.

## 3. Bentuk `hasil_lab.json`

```
{ "dibuat": "...", "wilayah": "Palangka Raya", "musim": "2026-07-01..2026-09-30",
  "versi_kriteria": "RENCANA-UJI §2",
  "jendela": [ {"nama": "api", "piksel_terbakar": n, "piksel_kontrol": n, "koheren_pct": x,
                "dh_cm": x, "dh_p10": x, "dh_p90": x, "d_insar_cm": x|null, "vonis": "..."} ],
  "uji_sebab": {...}, "kepekaan": {...}, "pembanding": {"d_lit": [15,33,51], "sd_lit": 18} }
```

`null` berarti tak terukur, bukan nol.
