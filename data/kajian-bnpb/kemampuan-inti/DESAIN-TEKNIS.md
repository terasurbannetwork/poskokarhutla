# DESAIN-TEKNIS: Kemampuan Inti

## Berkas baru

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/umum/pembanding.py` | persistensi, klimatologi, jumlah alarm sama, metrik, bootstrap blok, `pilih_wilayah` | `pipa-umum` |
| `scripts/umum/sidik.py` | `kunci`, `cek`, `buka` | `pipa-umum` |
| `scripts/umum/gerbang.py` | penulis `public/data/gerbang/<bencana>.json` | `pipa-umum` |
| `scripts/umum/selang.py` | split conformal dan CQR, cakupan, gerbang lebar | `pipa-umum` |
| `scripts/umum/setara.mjs` | pemanggil paritas Python-JS | `pipa-umum` |
| `scripts/umum/label_mutu.py` | cakupan, tak teramati, latihan, kab layak | `pipa-umum` |
| `scripts/umum/lisensi.json` | sumber dan lisensinya | `pipa-umum` |
| `scripts/umum/berantai_lift.py`, `lonjakan.py`, `senyap.py` | F4 | `pipa-umum` |
| `public/inti/gerbang.js` | pembaca gerbang gagal-tertutup + pil | `inti-layar` |
| `public/inti/perlakuan.js` | peringkat biaya-manfaat, Pareto, kestabilan | `inti-layar` |
| `scripts/banjir/kerusakan.py`, `scripts/banjir/data/kurva_jrc_asia.json` | KI-60 | `banjir` |
| `scripts/longsor/dampak.py`, `model_dampak.py`, `lhasa_nasa.py` | KI-61, KI-62, KI-26 | `longsor` |
| `scripts/data/ujibalik_status.py` | KI-27 | `pipa-data` |
| `tests/layar/ki_*.test.mjs`, `tests/agen/gerbang-kemampuan.test.mjs`, `tests/agen/gerbang-lisensi-model.test.mjs` | uji | pemilik masing-masing |

Pemilik pasti tiap berkas baru ditetapkan `node scripts/agents/ilmu.mjs pemilik <berkas>` saat tiket. Berkas baru di folder yang sudah punya pemilik ikut pemilik folder itu.

## Kontrak `public/data/gerbang/<bencana>.json`

```json
{"dibuat": "YYYY-MM-DD", "versi": 1,
 "keluaran": {"<nama>": {"metrik": "...", "arah": "tinggi|rendah", "pembanding": "...", "n": 0,
   "skor_model": 0, "skor_pembanding": 0, "selisih": 0, "selang95": [0, 0] | null,
   "vonis_prospektif": "lolos|gagal|belum_cukup_data|null", "boleh_tampil": false, "alasan": "..."}}}
```

Batas ukuran 100 KB. Karhutla tetap menulis `public/data/gerbang_model.json` (nama lama dipertahankan untuk pembaca lama) lewat mesin yang sama.

## Worker dan D1

- Tidak ada tabel D1 baru.
- KI-50 memakai tabel peringatan yang ada (`peringatan`, `peringatan_x` dari migrasi 0137 paket Paritas) dan tabel langganan yang ada (`ews_langganan`, tabel push).
- Tidak ada rute baru. Jenis baru hanya masuk daftar jenis yang sudah ada di `src/ews.js` dan `src/pw_inti.js`.

## Workflow

Skrip baru yang terjadwal masuk workflow pemilik bencananya (`data.yml`, `banjir.yml`, `lintas.yml`, `statis.yml`) dengan langkah `uji` lebih dulu. Suite yang berat tidak dijalankan tiap push (TEST.md bagian 4).
