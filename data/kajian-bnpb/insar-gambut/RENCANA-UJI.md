# RENCANA-UJI: Kedalaman gambut hilang dari InSAR

Aturan AGENTS global butir 3: perilaku di luar TypeScript wajib punya uji yang menjalankannya. Di sini perilaku itu Python; ujinya menjalankan kode asli di raster kecil buatan sendiri (bukan data dummy di produk) dan menjalankan lab di data nyata.

## 1. Perintah bukti

| Perintah | Membuktikan |
| -------- | ----------- |
| `python3 -I scripts/data/insar_gambut.py --uji` | self-check fungsi murni A sampai E di raster sintetis |
| `python3 -I scripts/data/insar_gambut.py lab ...` | lab nyata (butuh keluaran LiCSBAS, tidak di CI) |
| `python3 -I scripts/banjir/subsiden.py uji` | `subsiden.py` tetap hijau (tidak diubah) |
| `python3 -I scripts/data/gambut_bara.py` | self-check lama tetap hijau |
| `node --test tests/insar-gambut/*.test.mjs` | gerbang berkas dan kata |
| `npm run uji:insar` | tiga di atas (dipasang di IG-00) |
| `npm run uji:agen` | gerbang paket modul dan ilmu agent |

## 2. Kriteria vonis (dikunci sebelum lab pertama; diubah hanya oleh pemilik)

Angka di bawah adalah tebakan perancang (Q6), bukan hasil pengukuran apa pun.

| Ukuran | Nilai |
| ------ | ----- |
| `MIN_PIKSEL` | 50 per kelompok |
| `MIN_KOHEREN_PCT` | 30 |
| `selaras` | selang `D_insar` tumpang tindih [15, 51] cm dan koherensi cukup |
| `meremehkan` | batas atas selang `D_insar` < 15 cm, koherensi cukup |
| `tak_terukur` | koherensi atau piksel kurang |

Prosedur: tulis dan commit nilai ini sebelum menjalankan `lab`; jalankan; vonis dibaca dari angka, bukan dipilih.

## 3. Uji sintetis (`--uji`)

| ID | Kasus | Hasil yang diharapkan |
| -- | ----- | --------------------- |
| T1 | raster 40 × 40: terbakar turun 3 cm lebih dari kontrol | `Δh_tambahan` = -3 cm, `D_insar` = 3 cm × `ALPHA` |
| T2 | piksel valid kurang dari `MIN_PIKSEL` | `tak_terukur`, bukan 0 |
| T3 | koherensi 10% | `tak_terukur` |
| T4 | kontrol di cincin 0 sampai 2 km berisi nilai pencilan | tidak ikut kontrol |
| T5 | |LOS| > 400 mm/thn | piksel dibuang |
| T6 | `ALPHA` = 2 | `D_insar` dua kali T1 |
| T7 | selisih tepat 15 cm batas bawah | `selaras` |
| T8 | selisih 10 cm dengan batas atas selang < 15 | `meremehkan` |

## 4. Periksa manual

`validasi-model` dengan konteks bersih membaca `hasil_lab.json` tanpa kesimpulan pengerja dan menulis ulang vonis dari angka; ketidaksamaan = tiket dibuka kembali.

## 5. Gerbang (IG-08)

`tests/insar-gambut/gerbang.test.mjs` gagal bila: (1) `D_BAWAH, D_ATAS` di `gambut_bara.py` berubah tanpa `hasil_lab.json` bervonis `selaras`; (2) ada `insar` di `public/` sebelum IG-07; (3) kata terlarang di `hasil_lab.md`; (4) `null` ditulis 0.
