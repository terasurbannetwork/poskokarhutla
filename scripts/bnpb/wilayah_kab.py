#!/usr/bin/env python3
"""Pecah public/data/desa_cari.json (3,6 MB) jadi satu berkas kecil per kab/kota supaya formulir logbook tidak mengunduh seluruh Indonesia.

Keluaran: public/data/bnpb/wilayah.json  {"kab":[{"kode":"3301","prov":"33","nama":"Cilacap","berkas":"33_cilacap"}]}
          public/data/bnpb/desa/<prov>_<slug>.json  {"kec":{"Kroya":["Pesahangan",...]}}
Jalankan: python3 scripts/bnpb/wilayah_kab.py   |   python3 scripts/bnpb/wilayah_kab.py --cek
"""
import json, os, re, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
SUMBER = "public/data/desa_cari.json"
DIR = "public/data/bnpb/desa"
INDEKS = "public/data/bnpb/wilayah.json"


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def pecah(d):
    """desa_cari -> (indeks, {berkas: {"kec": {kec: [desa]}}}). Nama berkas unik: prov_slug, bila bentrok ditambah kode kab."""
    per = {k: {} for k in d["kab"]}
    for kd, desa, kec in d["baris"]:
        per[kd[:5]].setdefault(kec, []).append(desa)
    indeks, isi, pakai = [], {}, set()
    for k, nama in sorted(d["kab"].items(), key=lambda x: x[1].lower()):
        b = f"{k[:2]}_{slug(nama)}"
        if b in pakai:
            b += "_" + k[3:]
        pakai.add(b)
        indeks.append({"kode": k.replace(".", ""), "prov": k[:2], "nama": nama, "berkas": b})
        isi[b] = {"kec": {c: sorted(set(v), key=str.lower) for c, v in sorted(per[k].items(), key=lambda x: x[0].lower())}}
    return {"kab": indeks}, isi


def main():
    d = json.load(open(os.path.join(AKAR, SUMBER)))
    indeks, isi = pecah(d)
    os.makedirs(os.path.join(AKAR, DIR), exist_ok=True)
    for b, v in isi.items():
        json.dump(v, open(os.path.join(AKAR, DIR, b + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(indeks, open(os.path.join(AKAR, INDEKS), "w"), ensure_ascii=False, separators=(",", ":"))
    print("wilayah_kab.py: %d kab" % len(isi))


def cek():
    d = {"kab": {"33.01": "Cilacap", "33.71": "Cilacap"}, "baris": [["33.01.01.2001", "B", "Kroya"], ["33.01.01.2002", "a", "Kroya"], ["33.71.01.1001", "C", "Sidareja"]]}
    i, isi = pecah(d)
    assert [x["berkas"] for x in i["kab"]] == ["33_cilacap", "33_cilacap_71"], i
    assert isi["33_cilacap"] == {"kec": {"Kroya": ["a", "B"]}}
    assert sum(len(x) for v in isi.values() for x in v["kec"].values()) == 3
    print("wilayah_kab.py --cek hijau")


if __name__ == "__main__":
    cek() if "--cek" in sys.argv else main()
