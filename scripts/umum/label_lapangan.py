#!/usr/bin/env python3
"""Penarik label lapangan harian (docs/panen/RENCANA-PANEN-DATA.md #43), stdlib saja.

Sumber: GET /api/pipa/label (src/label.js) dengan Bearer PIPA_TOKEN, ATAU --dari <berkas.json> (ekspor yang sama).
Keluaran DEFAULT: data/raw/label_lapangan.json (gitignored). `--terbit` menulis public/data/label_lapangan.json
dan HANYA boleh dipakai setelah pemilik menyetujui penerbitan (label = laporan lapangan, meski teranonim sampai kecamatan).

Pakai:  PIPA_TOKEN=... python3 scripts/umum/label_lapangan.py [--sejak YYYY-MM-DD] [--url https://...] [--dari berkas.json] [--terbit]
"""
import argparse, json, os, sys, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
URL = "https://centurisk97.id"
BOLEH = {"tanggal", "prov", "kab", "kec", "jenis", "status", "sumber", "n"}


def bersih(baris):
    """Buang kolom di luar skema (pertahanan berlapis: Worker sudah menjamin, pembaca tidak percaya) dan baris cacat."""
    return [{k: b.get(k) for k in sorted(BOLEH)} for b in baris
            if isinstance(b, dict) and isinstance(b.get("n"), int) and b.get("tanggal") and b.get("jenis") and b.get("sumber")]


def tarik(url, token, sejak):
    q = f"/api/pipa/label?sejak={sejak}" if sejak else "/api/pipa/label"
    req = urllib.request.Request(url.rstrip("/") + q, headers={"authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--sejak"); p.add_argument("--url", default=URL); p.add_argument("--dari"); p.add_argument("--terbit", action="store_true")
    a = p.parse_args(argv)
    if a.dari:
        with open(a.dari, encoding="utf-8") as f: d = json.load(f)
    else:
        token = os.environ.get("PIPA_TOKEN")
        if not token: sys.exit("PIPA_TOKEN kosong dan --dari tidak diberikan")
        d = tarik(a.url, token, a.sejak)
    label = bersih(d.get("label", []))
    tujuan = os.path.join(AKAR, "public/data" if a.terbit else "data/raw", "label_lapangan.json")
    os.makedirs(os.path.dirname(tujuan), exist_ok=True)
    with open(tujuan, "w", encoding="utf-8") as f:
        json.dump({"sejak": d.get("sejak"), "n": len(label), "label": label}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(label)} baris -> {os.path.relpath(tujuan, AKAR)}")


if __name__ == "__main__":
    import tempfile
    # self-check: kolom liar dibuang, baris cacat dibuang, tulis ke berkas
    kotor = [{"tanggal": "2026-01-01", "jenis": "banjir", "sumber": "warga", "status": "terjadi", "n": 2, "kec": "A", "id": "x", "lat": 1.0}, {"n": "2"}, "x"]
    assert bersih(kotor) == [{"tanggal": "2026-01-01", "prov": None, "kab": None, "kec": "A", "jenis": "banjir", "status": "terjadi", "sumber": "warga", "n": 2}]
    if len(sys.argv) == 1:
        with tempfile.TemporaryDirectory() as t:
            m = os.path.join(t, "e.json"); json.dump({"sejak": "2026-01-01", "label": kotor}, open(m, "w"))
            AKAR = t; main(["--dari", m]); d = json.load(open(os.path.join(t, "data/raw/label_lapangan.json")))
            assert d["n"] == 1 and "id" not in d["label"][0] and "lat" not in d["label"][0]
        print("self-check ok")
    else:
        main()
