"""Versi terbit logbook Pusdalops: satu baris per kejadian, tanpa teks bebas dan tanpa nama.

Masukan : data/raw/logbook/arsip/<tahun>/kejadian.jsonl (keluaran logbook_pusdalops.py, tidak di-git)
Keluaran: data/pusdalops/logbook_kejadian.csv (di-git; aman untuk repo publik)

Yang dibuang: jenis_teks, kronologi, kondisi, dampak_teks, status, jam (teks bebas bisa memuat nama/telepon).
Pakai: python3 scripts/data/logbook_bersih.py
"""
import csv
import glob
import json
import os

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KOLOM = ["id_kejadian", "jenis", "tgl_kejadian", "pertama_dicatat", "terakhir_dicatat", "n_laporan", "hari_dilaporkan",
         "prov", "prov_kode", "kabkota", "n_kec", "n_desa", "md", "hilang", "luka", "mengungsi", "kk", "jiwa",
         "rumah", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam", "ha"]


def baris(k):
    return {c: ("; ".join(k[c]) if isinstance(k[c], list) else k[c]) for c in KOLOM}


def main():
    berkas = sorted(glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/20??/kejadian.jsonl")))
    rows = [baris(json.loads(l)) for f in berkas for l in open(f, encoding="utf-8")]
    ids = [r["id_kejadian"] for r in rows]
    assert len(ids) == len(set(ids)), "id_kejadian bentrok antar tahun"
    out = os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8") as o:
        w = csv.DictWriter(o, KOLOM)
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} kejadian dari {len(berkas)} tahun -> {os.path.relpath(out, AKAR)}")


if __name__ == "__main__":
    main()
