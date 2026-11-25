# Referensi: workflow, keluaran, uji

Halaman ini mendaftar workflow, berkas keluaran, dan uji.

## Workflow dan jadwal

| Workflow | Jadwal (UTC) | Langkah terkait modul ini |
| --- | --- | --- |
| `banjir.yml` | 00.20 harian | `dalops_banjir.py --kabar --unggah` |
| `lintas.yml` | 02.10 harian | `risiko.py`, `prioritas.py`, `ujibalik_risiko.py`, `kebutuhan.py`, `pb_ringkas.py`, `rapor_sumber.py`, `beda_sumber.py`, `tsunami_zona.py`, `beruntun.py` |
| `titik.yml` | 40 menit tiap 3 jam, 09.10, dan 22.55 | `risiko.py`, `prioritas.py` |
| `data.yml` | 14.20 harian | `siaga.py`, `iku.py`, `rs_kapasitas.py` |
| `inarisk.yml` | Selasa 04.45 | cermin InaRISK, commit bila berubah |
| `siklus.yml` | 03.50 harian, 05.50 Minggu, 04.40 tanggal 5, tiap 3 jam | rekap alun-alun direncanakan di sini |

`perencanaan.py`, `kebakaran.py`, `hukum.py`, `risiko_hvc.py`, `terpapar.py`, `kerentanan.py`, `rekonsiliasi_dalops_dibi.py` dijalankan lokal; hasilnya di-commit.

## Berkas keluaran public/data

`public/data/bnpb/`: `kab_prioritas`, `kalender_operasi`, `stok_prapemusim`, `siaga`, `iku`, `ikd`, `terpapar`, `kerentanan`, `risiko_hvc`, `dibi_kab_tahun`, `inarisk_vs_kejadian`, `rekonsiliasi_dalops_dibi`, `rapor_sumber`, `beda_sumber`, `rs_kapasitas`, `puso`, `hukum/katalog`, serta arsip `rapor_sumber_arsip/` dan `beda_sumber_arsip/` (jsonl bulanan, append-only). `public/data/inarisk/`: `irbi`, `jiwa`, `ikd`, `tautan`, `spab`, `uji_dibi`, `perubahan`, `kab.geojson`. `public/banjir/data/`: `risiko_kecamatan`, `risiko_prioritas`, `risiko_ujibalik`, `kebutuhan_musim`. `public/bnpb/data/`: `kebakaran_31`, `kebakaran_geo_31`. `public/data/ringkas/<bencana>.json`. `public/data/kalender_ancaman.json` dan `public/gempa/data/beruntun.json`.

## Uji dan gerbang

- `npm run uji:layar` menjalankan `tests/bnpb/*.test.mjs` (Dalops, hukum, inarisk_hitung, inarisk_spab, silang, perencanaan, bahan, operasi, dokumen, iku, hvc, rekon_tiga, unit_kembar, dan lainnya).
- `npm run uji:warga` menjalankan `tests/warga/*.test.mjs` (`dalops_tindak`, `alun`, `inarisk_proksi`, `pemirsa_pusdalops`, dan lainnya).
- `npm run uji:agen` menjalankan gerbang `tests/agen/gerbang-silang.test.mjs`, `gerbang-alun-terpadu.test.mjs`, dan gerbang kartu standar, token warna, serta pemilik berkas.
- Self-check tiap skrip: `python3 -I scripts/bnpb/<x>.py --cek` (atau `uji`), `python3 -I scripts/data/dalops_banjir.py --uji`, `python3 -I scripts/data/dalops_kabar.py --uji`, `python3 -I scripts/bnpb/silang/rapor_sumber.py uji`, `python3 -I scripts/bnpb/silang/beda_sumber.py uji`, `python3 -I scripts/bnpb/unit/jalan.py --cek`.
