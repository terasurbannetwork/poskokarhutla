#!/usr/bin/env python3
"""SIPPA SP-102: bahan peringkat prioritas mingguan per kompleks (keputusan 61). Layar menimbang zona dan memutuskan jalan atau tunda.

Masukan : data/sippa/keluaran/{kelayakan_kompleks,akses_kompleks}.json, public/data/{titik24,fwi}.json, public/data/titik_hari/<7 hari terakhir>.json
Keluaran: data/sippa/keluaran/prioritas.json (hanya kompleks yang punya titik panas dalam 7 hari)
Pakai   : python3 prioritas.py [--keluar DIR]   |   python3 prioritas.py uji
Python 3.12 stdlib. Titik panas dihitung dalam radius 2 km dari titik kompleks (garis lurus); bukan luas terbakar.
"""
import glob, json, math, os, sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import kepala, tulis_json

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PUB = os.path.join(AKAR, "public", "data")
KEL = os.path.join(AKAR, "data", "sippa", "keluaran")
RADIUS_KM, HARI = 2.0, 7
AMBANG = {"radius_km": {"nilai": RADIUS_KM, "keyakinan": "asumsi-kebijakan"}, "jendela_hari": {"nilai": HARI, "keyakinan": "asumsi-kebijakan"}}


def baca(p):
    with open(p) as h:
        return json.load(h)


def km(a, b, c, d):
    r = math.radians
    x = math.sin(r(c - a) / 2) ** 2 + math.cos(r(a)) * math.cos(r(c)) * math.sin(r(d - b) / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def hitung_dekat(kompleks, titik):
    """{id: jumlah titik dalam RADIUS_KM}. titik = [(lat, lon)]. Kisi 0,05 derajat supaya tidak membandingkan semua pasangan."""
    kisi = {}
    for la, lo in titik:
        kisi.setdefault((round(la / 0.05), round(lo / 0.05)), []).append((la, lo))
    n = {}
    for k in kompleks:
        gi, gj = round(k["lat"] / 0.05), round(k["lon"] / 0.05)
        c = sum(1 for di in (-1, 0, 1) for dj in (-1, 0, 1) for la, lo in kisi.get((gi + di, gj + dj), ()) if km(k["lat"], k["lon"], la, lo) <= RADIUS_KM)
        if c:
            n[k["id"]] = c
    return n


def cuaca_besok(kompleks, fwi):
    """{id: {tgl, hujan_mm, angin_kmj}} dari sel fwi.json (0,5 derajat) terdekat, hari sesudah hari_ini; tanpa hari itu = kosong."""
    besok = str(date.fromisoformat(fwi["hari_ini"]) + timedelta(days=1))
    out = {}
    for k in kompleks:
        g = min(fwi["grid"], key=lambda c: (c["lat"] - k["lat"]) ** 2 + (c["lon"] - k["lon"]) ** 2)
        h = next((x for x in g["hari"] if x["tgl"] == besok), None)
        if h:
            out[k["id"]] = {"tgl": besok, "hujan_mm": h["hujan"], "angin_kmj": h["ws"]}
    return out


def bangun(kompleks, akses, titik24, titik7, per, sumber, cuaca=None):
    n24, n7 = hitung_dekat(kompleks, titik24), hitung_dekat(kompleks, titik7)
    a = {x["id"]: x for x in akses}
    baris = []
    for k in kompleks:
        if k["id"] not in n7 and k["id"] not in n24:
            continue
        s = a.get(k["id"], {})
        darat = None if not s else not (s.get("tak_terjangkau") or s.get("kaki_tak_realistis")) and s.get("total_menit") is not None   # None = akses belum dihitung (akses_sippa.py baru Kalteng)
        baris.append({"id": k["id"], "n24": n24.get(k["id"], 0), "n7": max(n7.get(k["id"], 0), n24.get(k["id"], 0)), "menit": s.get("total_menit"), "darat": darat,
                      "dari": (s.get("dari") or {}).get("nama"), "ujung": s.get("ujung"), "besok": (cuaca or {}).get(k["id"])})
    doc = kepala(per, AMBANG, sumber, "Jumlah titik panas unik per hari (VIIRS dan MODIS) dalam 2 km garis lurus dari titik kompleks. Waktu tempuh dari akses_kompleks.json "
                 "(estimasi-model, bukan navigasi). darat=false bila jalan kaki di atas 5 km atau tak terjangkau; null bila akses provinsi itu belum dihitung. besok = prakiraan Open-Meteo sel 0,5 derajat lewat fwi.json. Bobot dan putusan jalan atau tunda dihitung di layar.", "sippa_prioritas/1")
    doc["kompleks"] = sorted(baris, key=lambda b: (-b["n7"], b["id"]))
    return doc


def titik_harian(sampai, prov):
    """titik 7 hari terakhir (sampai inklusif) dari arsip titik_hari, hanya provinsi prov."""
    out, hari = [], []
    for i in range(HARI):
        p = os.path.join(PUB, "titik_hari", f"{sampai - timedelta(days=i)}.json")
        if not os.path.exists(p):
            continue
        d = baca(p)
        ok = [str(w).split("|")[0] == prov for w in d["wilayah"]]
        iw = d["kolom"].index("wilayah")
        out += [(r[0], r[1]) for r in d["baris"] if ok[r[iw]]]
        hari.append(d["hari"])
    return out, hari


def main(keluar):
    kel, aks = baca(os.path.join(KEL, "kelayakan_kompleks.json")), baca(os.path.join(KEL, "akses_kompleks.json"))
    t24 = baca(os.path.join(PUB, "titik24.json"))
    arsip = sorted(glob.glob(os.path.join(PUB, "titik_hari", "20*.json")))
    sampai = date.fromisoformat(os.path.basename(arsip[-1])[:10])
    sumber = [{"nama": "NASA FIRMS lewat titik_hari dan titik24.json", "lisensi": "NASA open data", "tarik": str(sampai)},
              {"nama": "kelayakan_kompleks.json dan akses_kompleks.json", "lisensi": "repo ini", "tarik": kel["per"]}]
    fwi = baca(os.path.join(PUB, "fwi.json"))
    sumber.append({"nama": "Open-Meteo lewat fwi.json", "lisensi": "CC BY 4.0", "tarik": fwi["hari_ini"]})
    baris, hari = [], []
    for prov in sorted({k["prov"] for k in kel["kompleks"]}):   # tiap provinsi di kelayakan (SP-109)
        kompleks = [k for k in kel["kompleks"] if k["prov"] == prov]
        t7, hari = titik_harian(sampai, prov)
        lo = min(k["lon"] for k in kompleks) - 0.1, max(k["lon"] for k in kompleks) + 0.1
        la = min(k["lat"] for k in kompleks) - 0.1, max(k["lat"] for k in kompleks) + 0.1
        t24p = [(r[0], r[1]) for r in t24["titik"] if la[0] <= r[0] <= la[1] and lo[0] <= r[1] <= lo[1]]
        grid = {**fwi, "grid": [g for g in fwi["grid"] if g["prov"] == prov] or fwi["grid"]}
        baris += bangun(kompleks, aks["kompleks"], t24p, t7, str(sampai), sumber, cuaca_besok(kompleks, grid))["kompleks"]
    doc = bangun([], [], [], [], str(sampai), sumber)
    doc["kompleks"] = sorted(baris, key=lambda b: (-b["n7"], b["id"]))
    doc["hari"] = hari
    doc["titik24_acuan"] = t24.get("acuan")
    n = tulis_json(os.path.join(keluar, "prioritas.json"), doc)
    print(f"prioritas: {len(doc['kompleks'])} kompleks bertitik panas 7 hari, {n} byte")


def uji():
    k = [{"id": "A", "lat": -2.0, "lon": 114.0}, {"id": "B", "lat": -2.5, "lon": 114.0}, {"id": "C", "lat": -3.0, "lon": 114.0}]
    akses = [{"id": "A", "total_menit": 60, "dari": {"nama": "Posko A"}}, {"id": "B", "total_menit": 300, "kaki_tak_realistis": True}]
    t24 = [(-2.0, 114.01)]                      # 1,1 km dari A
    t7 = [(-2.0, 114.01), (-2.005, 114.0), (-2.5, 114.03), (-2.0, 114.05)]   # A dapat 2 (114,05 = 5,6 km, di luar); B dapat 0 (3,3 km)
    d = bangun(k, akses, t24, t7, "2026-10-26", [{"nama": "uji", "lisensi": "x", "tarik": "x"}])
    ids = {b["id"]: b for b in d["kompleks"]}
    assert set(ids) == {"A"}, ids                # B 3,3 km dari titiknya: di luar 2 km; C tanpa titik
    assert ids["A"]["n24"] == 1 and ids["A"]["n7"] == 2 and ids["A"]["darat"] and ids["A"]["menit"] == 60, ids["A"]
    d2 = bangun(k, akses, [], [(-2.5, 114.01)], "x", [{"nama": "uji", "lisensi": "x", "tarik": "x"}])
    assert d2["kompleks"][0]["id"] == "B" and d2["kompleks"][0]["darat"] is False, d2["kompleks"]   # jalan kaki tak realistis
    d3 = bangun(k, [], [], [(-3.0, 114.0)], "x", [{"nama": "uji", "lisensi": "x", "tarik": "x"}])
    assert d3["kompleks"][0]["darat"] is None and d3["kompleks"][0]["menit"] is None, d3["kompleks"]   # akses belum dihitung, bukan tak terjangkau
    assert abs(km(-2, 114, -2, 114.01) - 1.11) < 0.01
    c = cuaca_besok(k[:1], {"hari_ini": "2026-10-27", "grid": [{"lat": -2.0, "lon": 114.0, "hari": [{"tgl": "2026-10-28", "hujan": 12.5, "ws": 9.0}]}, {"lat": -9, "lon": 100, "hari": []}]})
    assert c == {"A": {"tgl": "2026-10-28", "hujan_mm": 12.5, "angin_kmj": 9.0}}, c
    print("uji prioritas: OK")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    else:
        main(sys.argv[sys.argv.index("--keluar") + 1] if "--keluar" in sys.argv else KEL)
