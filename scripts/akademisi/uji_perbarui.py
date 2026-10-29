#!/usr/bin/env python3
"""Self-check offline perbarui.gabung (tanpa jaringan): python3 scripts/akademisi/uji_perbarui.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from perbarui import gabung

L = lambda i, t, rumpun, h=5: [i, "N" + i, "Kampus", rumpun, h, 10, 100, "", t, "foto.jpg", "123", "Geologi", "subj", "s", "logo.png"]
induk = {"diperbarui": "2026-09-01", "rumpun": ["gempa"], "orang": [L("A1", ["T1"], ["gempa"]), L("A2", ["T1"], ["gempa"]), L("A3", ["T9"], ["banjir"])]}
induk["orang"][2].append("diaspora")
s = lambda h, t: {"h": h, "karya": 20, "sitasi": 500, "nama": "Baru", "orcid": "0000", "kampus": "Univ X", "topik": t}
segar = {"A1": s(9, ["T1", "T2"]), "A3": s(5, [])}  # A2 hilang di OpenAlex
calon = [("A1", s(9, ["T1"])), ("A7", s(3, ["T1"]))]  # A1 sudah ada, A7 baru
asli = [list(o) for o in induk["orang"]]
n, lap = gabung(induk, segar, {"A1", "A2", "A3"}, calon, "2026-10", "2026-10-29")
assert induk["orang"] == asli, "input tidak boleh dimutasi"
a1, a2, a3, a7 = n["orang"]
assert a1[4:7] == [9, 20, 500] and a1[8] == ["T1", "T2"] and a1[9:15] == asli[0][9:15], "SINTA terjaga, metrik segar"
assert a2 == asli[1], "hilang tetap dan tak berubah"
assert lap["hilang_di_openalex"] == ["A2"]
assert a3[8] == ["T9"] and a3[15] == "diaspora", "topik kosong tak menimpa; kolom 16 terjaga"
assert lap["baru"] == ["A7"] and n["baru_bulan_ini"] == ["A7"] and len(n["orang"]) == 4
assert a7[9:15] == [""] * 6 and len(a7) == 15 and a7[3] == ["gempa"], "baru: SINTA kosong, rumpun dari topik"
assert lap["naik"] == [{"id": "A1", "h_lama": 5, "h_baru": 9}] and n["diperbarui"] == "2026-10-29"
print("uji_perbarui: OK")
