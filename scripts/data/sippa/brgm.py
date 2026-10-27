#!/usr/bin/env python3
"""SIPPA SP-110: sekat kanal dan sumur bor BRGM dari PRIMS WFS -> data/sippa/keluaran/brgm_pembasahan.json (keputusan 61, butir 27).

Sumber  : https://prims.brgm.go.id/geoserver/ows  typeName prims:infrastruktur_pembasahan_3r (kegiatan R1.1 SBO sumur bor, R1.2 KSE sekat kanal,
          R1.3 KTI = lain) dan prims:rencana_sumur_bor (sumur bor RENCANA, bukan terbangun). Titik, kotak pembatas kompleks tiap provinsi + 0,3 derajat.
Pakai   : python3 brgm.py [prov ...]     # bawaan: provinsi yang ada di kelayakan_kompleks.json (jaringan: PRIMS)
          python3 brgm.py uji
Keluaran: kepala bersama.py, kolom ["lon","lat","jenis","status"], baris; jenis sekat_kanal|sumur_bor|lain, status terbangun|rencana.
Keyakinan "resmi" untuk letak titik menurut BRGM (belum diverifikasi lapangan; KONDISI sekat tidak diketahui). zona.py memakai hitung_3km()
untuk kolom brgm_3km per kompleks. Python 3.12 stdlib.
"""
import json, math, os, subprocess, sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import kepala, tulis_json

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
KEL = os.path.join(AKAR, "data", "sippa", "keluaran")
PUB = os.path.join(AKAR, "public", "data")
WFS = "https://prims.brgm.go.id/geoserver/ows"
JENIS = {"R1.1 SBO": "sumur_bor", "R1.2 KSE": "sekat_kanal"}   # selain itu "lain"
RADIUS_KM = 3.0
PAD = 0.3


def jenis_dari(kegiatan):
    return JENIS.get((kegiatan or "").strip(), "lain")


def wfs(lap, bbox):
    w, s, e, n = bbox
    u = (f"{WFS}?service=WFS&version=1.0.0&request=GetFeature&typeName=prims:{lap}&outputFormat=application/json"
         f"&bbox={w:.3f},{s:.3f},{e:.3f},{n:.3f}")
    # curl: urllib dengan UA bawaan ditolak PRIMS (403)
    r = subprocess.run(["curl", "-sf", "-m", "300", "--retry", "2", "-A", "poskokarhutla-sippa/1.0", u], capture_output=True, check=True)
    return json.loads(r.stdout)["features"]


def titik_dari(feat, lap):
    """feature WFS -> (gid, lon, lat, jenis, status) atau None bila bukan titik."""
    g = feat.get("geometry") or {}
    if g.get("type") != "Point":
        return None
    lon, lat = g["coordinates"][:2]
    p = feat.get("properties") or {}
    if lap == "rencana_sumur_bor":
        return (f"r{p.get('gid')}", lon, lat, "sumur_bor", "rencana")
    return (f"t{p.get('gid')}", lon, lat, jenis_dari(p.get("kegiatan")), "terbangun")


def kotak_prov(prov):
    k = json.load(open(os.path.join(PUB, "kendala.json")))["kompleks"]
    op = {x["id"]: x for x in json.load(open(os.path.join(PUB, "operasi.json")))["kompleks"]}
    p = [(op[i]["lat"], op[i]["lon"]) for i, v in k.items() if v["prov"] == prov and i in op]
    return (min(x[1] for x in p) - PAD, min(x[0] for x in p) - PAD, max(x[1] for x in p) + PAD, max(x[0] for x in p) + PAD)


def provinsi_ada():
    return sorted({k["prov"] for k in json.load(open(os.path.join(KEL, "kelayakan_kompleks.json")))["kompleks"]})


def hitung_3km(komp, titik):
    """komp = [{id,lat,lon}], titik = [(lon,lat,jenis,status)] -> {id: {sekat_kanal, sumur_bor, sumur_rencana, lain}}. Kisi 0,05 derajat, radius 3 km garis lurus."""
    kisi = {}
    for lo, la, j, st in titik:
        kisi.setdefault((math.floor(la / 0.05), math.floor(lo / 0.05)), []).append((lo, la, j, st))
    out = {}
    for k in komp:
        c = {"sekat_kanal": 0, "sumur_bor": 0, "sumur_rencana": 0, "lain": 0}
        gi, gj = math.floor(k["lat"] / 0.05), math.floor(k["lon"] / 0.05)
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                for lo, la, j, st in kisi.get((gi + di, gj + dj), ()):
                    d = 111.195 * math.hypot(la - k["lat"], (lo - k["lon"]) * math.cos(math.radians((la + k["lat"]) / 2)))
                    if d <= RADIUS_KM:
                        c["sumur_rencana" if st == "rencana" else j] += 1
        out[k["id"]] = c
    return out


def tarik(provs):
    tgl = datetime.now(timezone(timedelta(hours=7))).strftime("%Y-%m-%d")
    unik = {}
    for p in provs:
        for lap in ("infrastruktur_pembasahan_3r", "rencana_sumur_bor"):
            fs = wfs(lap, kotak_prov(p))
            print(p, lap, len(fs), flush=True)
            for f in fs:
                t = titik_dari(f, lap)
                if t:
                    unik[t[0]] = t
    baris = sorted(([round(t[1], 5), round(t[2], 5), t[3], t[4]] for t in unik.values()), key=lambda r: (r[3], r[0], r[1]))
    n = {j: sum(1 for b in baris if b[2] == j and b[3] == "terbangun") for j in ("sekat_kanal", "sumur_bor", "lain")}
    doc = {**kepala(tgl, {"radius_hitung_km": {"nilai": RADIUS_KM, "keyakinan": "asumsi-kebijakan"}},
                    [{"nama": "BRGM PRIMS WFS prims:infrastruktur_pembasahan_3r dan prims:rencana_sumur_bor", "lisensi": "data terbuka BRGM (PRIMS)", "tarik": tgl}],
                    "Letak titik menurut BRGM, belum diverifikasi lapangan; kondisi sekat dan sumur tidak diketahui. "
                    "jenis: R1.1 SBO sumur_bor, R1.2 KSE sekat_kanal, R1.3 KTI lain. status rencana = sumur bor rencana (rencana_sumur_bor), bukan terbangun. "
                    f"Kotak pembatas kompleks provinsi {', '.join(provs)} + {PAD} derajat; titik di kotak provinsi lain ikut bila bersinggungan.",
                    "brgm_pembasahan/1"),
           "keyakinan": "resmi", "provinsi": provs, "n": {**n, "sumur_rencana": sum(1 for b in baris if b[3] == "rencana")},
           "kolom": ["lon", "lat", "jenis", "status"], "baris": baris}
    print(f"brgm_pembasahan.json {tulis_json(os.path.join(KEL, 'brgm_pembasahan.json'), doc)} byte", doc["n"])


def muat():
    """Titik dari brgm_pembasahan.json untuk zona.py; None bila belum ditarik."""
    p = os.path.join(KEL, "brgm_pembasahan.json")
    if not os.path.exists(p):
        return None
    return [tuple(b) for b in json.load(open(p))["baris"]]


def uji():
    assert jenis_dari("R1.2 KSE") == "sekat_kanal" and jenis_dari("R1.1 SBO") == "sumur_bor" and jenis_dari("R1.3 KTI") == "lain" and jenis_dari(None) == "lain"
    assert titik_dari({"geometry": {"type": "Polygon"}}, "x") is None
    assert titik_dari({"geometry": {"type": "Point", "coordinates": [113.5, -2.0]}, "properties": {"gid": 7, "kegiatan": "R1.2 KSE"}}, "p") == ("t7", 113.5, -2.0, "sekat_kanal", "terbangun")
    assert titik_dari({"geometry": {"type": "Point", "coordinates": [113.5, -2.0]}, "properties": {"gid": 7}}, "rencana_sumur_bor")[3:] == ("sumur_bor", "rencana")
    # 0,02 derajat lintang = 2,22 km (masuk), 0,03 = 3,34 km (keluar)
    t = [(113.0, -2.02, "sekat_kanal", "terbangun"), (113.0, -2.03, "sekat_kanal", "terbangun"), (113.0, -2.01, "sumur_bor", "rencana"), (113.0, -2.0, "sumur_bor", "terbangun")]
    assert hitung_3km([{"id": "K", "lat": -2.0, "lon": 113.0}], t)["K"] == {"sekat_kanal": 1, "sumur_bor": 1, "sumur_rencana": 1, "lain": 0}
    assert hitung_3km([{"id": "K", "lat": 0.0, "lon": 100.0}], t)["K"] == {"sekat_kanal": 0, "sumur_bor": 0, "sumur_rencana": 0, "lain": 0}
    print("uji brgm: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tarik(sys.argv[1:] or provinsi_ada())
