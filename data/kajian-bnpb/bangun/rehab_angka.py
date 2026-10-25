#!/usr/bin/env python3
"""Angka kajian rehab yang dihitung dari paket data (KERANGKA rehab §12). Luring, stdlib.

Kini: jembatan rusak DIBI per kejadian besar (Bab 3 P1, Gambar 3.2) dengan jendela, kategori, provinsi,
DAN kab yang sama persis dengan dibi/kejadian_besar.csv (dibi.baris_peristiwa dipakai ulang).
Uji diri: RB jendela = rumah_rusak_berat versi DIBI di kejadian_besar.csv, untuk TIAP kejadian berjendela.
Jalankan: python3 data/kajian-bnpb/bangun/rehab_angka.py
"""
import csv, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dibi  # noqa: E402

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def jembatan_per_kejadian():
    per = json.load(open(os.path.join(DATA, "dibi/mentah/dibi_peristiwa.json"), encoding="utf-8"))["peristiwa"]
    kb = {}
    for r in csv.DictReader(open(os.path.join(DATA, "dibi/kejadian_besar.csv"), encoding="utf-8")):
        if r["versi"] == "DIBI" and r["metrik"] in ("rumah_rusak_berat", "baris_dibi"):
            kb.setdefault(r["kode"], {})[r["metrik"]] = int(float(r["nilai"]))
    out, gagal = {}, []
    for kode, _, _, jendela, kat, prov, kabs in dibi.PERISTIWA:
        if not jendela:
            continue
        rows = dibi.baris_peristiwa(per, kode, jendela, kat, prov, kabs)
        rb = sum(r["rumah_rusak_berat"] or 0 for r in rows)
        harap = kb.get(kode, {}).get("rumah_rusak_berat", 0)   # tanpa baris RB = kejadian tanpa baris DIBI
        if rb != harap:
            gagal.append(f"{kode}: RB jendela {rb} != kejadian_besar.csv {harap}")
        out[kode] = {"rb": rb, "jembatan": sum(r["jembatan_rusak"] or 0 for r in rows), "baris": len(rows)}
    assert not gagal, "jendela tidak mereproduksi kejadian_besar.csv:\n  " + "\n  ".join(gagal)
    return out


if __name__ == "__main__":
    j = jembatan_per_kejadian()
    # nilai yang dikutip bab-03 (bukti dan registri rehab.dibi.jembatan_rusak.*); berubah = prosa basi
    dikutip = {"sumatra2025": 726, "seroja2021": 95, "jabodetabek2020": 33, "ambon2019": 10, "semeru2021": 9,
               "sulteng2018": 7, "sulbar2021": 7, "cianjur2022": 2, "demak2024": 0, "lombok2018": 0}
    beda = {k: (v, j[k]["jembatan"]) for k, v in dikutip.items() if j[k]["jembatan"] != v}
    assert not beda, f"jembatan per kejadian berubah (dikutip, hitung): {beda}"
    for k, v in sorted(j.items(), key=lambda x: -x[1]["jembatan"]):
        print(f"{k:16} jembatan {v['jembatan']:5}  RB {v['rb']:7}  baris {v['baris']}")
    print(f"uji diri lolos: RB {len(j)} kejadian = kejadian_besar.csv; 10 nilai jembatan bab-03 cocok")
