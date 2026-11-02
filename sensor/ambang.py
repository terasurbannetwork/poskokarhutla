"""Penilai ambang dari sensor/ambang.json. Dipakai simulator dan uji; worker punya penilai sendiri."""
import json
import operator
import os

TINGKAT = ["normal", "waspada", "siaga", "awas"]
_OP = {">=": operator.ge, "<=": operator.le}
BERKAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ambang.json")


def muat(path=BERKAS):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def tingkat(jenis, nilai, ambang=None):
    """Tingkat tertinggi (0..3) yang dilewati salah satu aturan. Ambang null = belum dikalibrasi, dilewati."""
    ambang = ambang or muat()
    t = 0
    for a in ambang["jenis"][jenis]["aturan"]:
        if nilai.get(a["kunci"]) is None:       # tak ada / sensor rusak (None): bukan alarm
            continue
        for i, nm in enumerate(TINGKAT[1:], 1):
            batas = a.get(nm)
            if batas is not None and _OP[a["op"]](nilai[a["kunci"]], batas):
                t = max(t, i)
    return t
