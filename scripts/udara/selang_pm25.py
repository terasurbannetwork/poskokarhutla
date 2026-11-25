"""Pita P10-P90 untuk prakiraan PM2,5 (KI-60, pemakai kedua scripts/umum/selang.py) -> data/raw/udara/selang_pm25.json (riset; belum ada pembaca layar selama cakupan uji belum lolos, jadi tidak di public/).

Pasangan (obs stasiun BMKG, CAMS mentah) dari data/raw/udara/koreksi_bmkg_pasangan.json (ditulis scripts/udara/koreksi_bmkg.py `kunci`; berkas ini hanya DIBACA).
Skor konformal relatif: |obs - cams| / max(cams, 10). Kalibrasi = 70% jam awal, uji = 30% jam akhir (urutan waktu, bukan acak). Pita = cams +- q*max(cams,10).
Hanya berlaku bila prakiraan.json masih CAMS mentah (koreksi.status == 'belum'); pita hanya di dalam rentang CAMS kalibrasi (gerbang lebar).
Pita per kota-hari memakai maksimum jam; kota tidak punya stasiun sendiri, jadi pita itu TIDAK divalidasi per kota (hanya di 27 stasiun).
Tidak membaca/menyentuh prakiraan.py. Pakai:  python3 -I scripts/udara/selang_pm25.py | uji
"""
import datetime as dt
import importlib.util
import json
import math
import os
import sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
ALFA, LANTAI, KAL = 0.2, 10.0, 0.7
TOL = 0.05    # cakupan uji harus 80% +- 5 poin agar pita tampil
_s = importlib.util.spec_from_file_location("selang", os.path.join(AKAR, "scripts", "umum", "selang.py"))
SEL = importlib.util.module_from_spec(_s)
_s.loader.exec_module(SEL)


def kalibrasi(baris):
    """baris: [[jam, stasiun, obs, cams]] -> dict hasil. Murni."""
    b = sorted((r for r in baris if r[2] is not None and r[3] is not None), key=lambda r: r[0])
    k = int(len(b) * KAL)
    kal, uji = b[:k], b[k:]
    skor = lambda r: abs(r[2] - r[3]) / max(r[3], LANTAI)
    q = SEL.split([skor(r) for r in kal], ALFA)
    if q is None or not uji:
        return {"q": None, "n_kal": len(kal), "n_uji": len(uji), "cakupan_uji": None, "lolos": False}
    pita = [(r[3] - q * max(r[3], LANTAI), r[3] + q * max(r[3], LANTAI)) for r in uji]
    c, n = SEL.cakupan(pita, [r[2] for r in uji])
    return {"q": q, "n_kal": len(kal), "n_uji": n, "cakupan_uji": c, "lolos": abs(c - (1 - ALFA)) <= TOL,
            "rentang_cams": [min(r[3] for r in kal), max(r[3] for r in kal)], "jam_kal_akhir": kal[-1][0], "jam_uji": [uji[0][0], uji[-1][0]]}


def pita_nilai(v, h):
    if not h.get("lolos") or not SEL.dalam_rentang(v, *h["rentang_cams"]):
        return None
    s = h["q"] * max(v, LANTAI)
    return [round(max(0, v - s)), round(v + s)]


def jalan():
    pas = json.load(open(os.path.join(AKAR, "data", "raw", "udara", "koreksi_bmkg_pasangan.json")))
    pr = json.load(open(os.path.join(AKAR, "public", "udara", "data", "prakiraan.json")))
    h = kalibrasi(pas["baris"])
    mentah = (pr.get("koreksi") or {}).get("status") == "belum"
    out = {"v": 1, "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "label": "pita P10-P90 dari galat CAMS terhadap stasiun BMKG; bukan per kota",
           "alfa": ALFA, "q_relatif": None if h["q"] is None else round(h["q"], 3), "lantai": LANTAI, "n_kalibrasi": h["n_kal"], "n_uji": h["n_uji"],
           "cakupan_uji": None if h["cakupan_uji"] is None else round(h["cakupan_uji"], 3), "target": 1 - ALFA, "toleransi": TOL, "lolos_cakupan": h["lolos"],
           "rentang_cams": h.get("rentang_cams"), "jam_uji": h.get("jam_uji"), "prakiraan_mentah": mentah,
           "catatan": "Pita hanya bila cakupan uji dalam toleransi, prakiraan masih CAMS mentah, dan nilai dalam rentang kalibrasi. Kota tidak punya stasiun sendiri: pita tidak divalidasi per kota.",
           "kota": {}}
    if h["lolos"] and mentah:
        for k in pr["kota"]:
            pm = k["pm"]
            hari = []
            for i in range(len(pr["hari"])):
                seg = [x for x in pm[i * 24:(i + 1) * 24] if x is not None]   # ponytail: potong 24 jam berurutan, bukan hari WIB; cukup untuk pita kasar
                hari.append(pita_nilai(max(seg), h) if seg else None)
            if any(hari):
                out["kota"][k["kode"]] = hari
    os.makedirs(os.path.join(AKAR, "data", "raw", "udara"), exist_ok=True)
    tmp = os.path.join(AKAR, "data", "raw", "udara", "selang_pm25.json.tmp")
    json.dump(out, open(tmp, "w"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, tmp[:-4])
    print({k: out[k] for k in ("q_relatif", "n_kalibrasi", "n_uji", "cakupan_uji", "lolos_cakupan", "prakiraan_mentah")}, "kota:", len(out["kota"]))


def uji():
    import random
    r = random.Random(3)
    def sim(n, f):
        b = []
        for i in range(n):
            c = r.uniform(5, 80)
            b.append([f"2026-10-{1 + i // 600:02d}T{i % 600:04d}", "S", max(0.1, c * f() * 1.0), c])
        return b
    h = kalibrasi(sim(6000, lambda: 1 + r.gauss(0, .3)))
    assert h["lolos"] and abs(h["cakupan_uji"] - .8) <= .05 and h["q"] > 0, h
    # galat berubah di periode uji (pergeseran): cakupan jatuh, pita ditolak
    b = sim(6000, lambda: 1 + r.gauss(0, .3))
    for x in b[int(len(b) * KAL):]:
        x[2] = x[3] * 2.5
    assert kalibrasi(b)["lolos"] is False
    assert kalibrasi(sim(3, lambda: 1))["q"] is None            # terlalu sedikit data: tanpa pita
    ok = {"lolos": True, "q": .3, "rentang_cams": [5, 80]}
    assert pita_nilai(50, ok) == [35, 65] and pita_nilai(200, ok) is None and pita_nilai(50, {**ok, "lolos": False}) is None
    print("ok")


if __name__ == "__main__":
    {"uji": uji}.get((sys.argv[1:] or [""])[0], jalan)()
