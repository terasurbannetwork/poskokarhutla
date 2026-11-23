# Paparan Kebencanaan Sumatera Barat, 22 Nov 2026: cara bangun ulang

Deck dibangun mesin skill `ppt-konsultan` (repo `claude-mesin`, `~/.claude/skills/ppt-konsultan/bnpb`).
Folder ini menyimpan salinan masukannya supaya bisa dibangun ulang di mesin lain.

| Berkas | Isi |
| --- | --- |
| `bangun_spek_banjir_prov.py` | pembangun spek Aceh, Sumut, Sumbar (asal: `assets/proyek-wilayah/spek/`) |
| `banjir-sumbar.json` | spek deck hasil pembangun |
| `data/*.csv` | tabel turunan Sumbar (DIBI 2025, risiko gempa, karhutla) |
| `impor-situasi-banjir-sumbar.pptx` | slide situasi banjir dari generator, diimpor ke halaman 7 sampai 10 |

Teks WA Koordalops tidak disimpan di repo (repo publik). WA 20 Nov dibaca lewat `--wa <berkas di luar repo>`.

## Urutan

```bash
# 1. slide situasi banjir (generator repo ini; WA Koordalops terbaru di folder harian, tambahan lewat --wa)
cd data/laporan-bnpb/generator
~/.claude/skills/ppt-konsultan/bnpb/.venv/bin/python situasi_banjir.py --prov "Sumatera Barat" --lengkap --hari 4 \
  --tanggal 2026-11-22 --wa <wa-koordalops-20-nov.txt> --keluar <folder-sementara>
cp "<folder-sementara>/Situasi Banjir Sumatera Barat 221126.pptx" \
  ~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-wilayah/data/sumut-aceh/impor/sumbar.pptx

# 2. data nasional terbaru dari situs ke assets/proyek-wilayah/data/sumut-aceh/
#    data/peta_karhutla.json, data/peta_karhutla_kab.json, data/peta_karhutla_wil.json,
#    gempa/data/risiko.json, banjir/data/gunungapi_status.json (centurisk97.id)

# 3. spek lalu deck
cd ~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-wilayah
../../.venv/bin/python spek/bangun_spek_banjir_prov.py
cd ../..
.venv/bin/python scripts/deck.py assets/proyek-wilayah/spek/banjir-sumbar.json \
  "<repo>/data/laporan-bnpb/paparan/kebencanaan-sumatera-barat-2026-11-22/Paparan Kebencanaan Sumatera Barat 221126.pptx" \
  --pdf --akar assets/proyek-wilayah
.venv/bin/python scripts/aturan_slide.py "<pptx>"
```

## Revisi pemilik yang tertanam (22 Nov 2026)

- Subjudul rerata korban, gempa terbesar, dan peringkat karhutla dihapus; ubin rerata tahunan diganti rumah rusak terbanyak.
- Tabel situasi banjir: kolom Mulai banjir dan Surut.
- Ikon gunung api kecil di titiknya pada peta karhutla, label menempel tanpa titik dan garis tarik (`visual/peta.py`, kunci `penanda`).
- Pita gunung api: pil status berikon dan radius berikon (`deck.py` pita, kunci `pil` dan `ket`).
- Luas terbakar berlabel perkiraan dari citra satelit.
- Sampul tanpa pil kota-tanggal (`tanpa_tanggal`).
- Prakiraan satu halaman saja (status Siaga sistem kita); halaman hujan BMKG dan sungai dibuang.

Sisa temuan QA (D-17 perkiraan judul 3 baris, T-7 kartu Siaga) ada di slide impor generator, sama dengan deck Sumut 16 Nov.
