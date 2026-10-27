#!/usr/bin/env python3
"""SIPPA SP-141 (keputusan 61, butir 21): jalan OSM per moda. Label ASUMSI-KEBIJAKAN (aturan tag), bukan survei lapangan.

Moda tiap ruas jalan = moda TERBAIK yang dapat melaluinya: mobil > motor > jalan_kaki (mobil boleh juga dilalui motor dan pejalan).
Aturan (urut, yang pertama cocok menang):
  1. Tertutup untuk kendaraan: motor_vehicle atau (access tanpa motor_vehicle) = no|private -> motor hanya bila motorcycle=yes, kalau tidak jalan_kaki.
     motorcar=no (motorcycle tak tertutup) -> motor.
  2. highway path, footway, bridleway, cycleway, pedestrian, steps -> jalan_kaki; path dengan motorcycle|motor_vehicle=yes -> motor.
  3. highway track: surface keras (paved, asphalt, concrete, concrete:plates, concrete:lanes, paving_stones, sett, metal) atau tracktype grade1|grade2 -> mobil;
     tracktype grade3 atau tanpa tracktype -> motor; grade4|grade5 -> jalan_kaki.
  4. highway motorway..tertiary, unclassified, residential, service, living_street (+_link) -> mobil.
  5. lainnya -> None (bukan jalan).
Laju per moda (graf akses): mobil menurut kelas jalan (akses_sippa.LAJU), motor 20 km/jam, jalan_kaki 4 km/jam.
Python 3.12 stdlib. Pakai: python3 moda.py uji
"""
import sys

MODA = ("mobil", "motor", "jalan_kaki")
LAJU_MOTOR_KMJ, LAJU_KAKI_KMJ = 20.0, 4.0
KERAS = {"paved", "asphalt", "concrete", "concrete:plates", "concrete:lanes", "paving_stones", "sett", "metal"}
KAKI = {"path", "footway", "bridleway", "cycleway", "pedestrian", "steps"}
MOBIL = {"motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "service", "living_street"}
TUTUP = {"no", "private"}


def moda_ruas(t):
    """tags OSM -> 'mobil' | 'motor' | 'jalan_kaki' | None."""
    h = (t.get("highway") or "").replace("_link", "")
    if h not in MOBIL and h != "track" and h not in KAKI:
        return None
    mv = t.get("motor_vehicle")
    tutup = mv in TUTUP or (mv is None and t.get("access") in TUTUP and t.get("motorcar") not in ("yes", "permissive"))
    if tutup:
        return "motor" if t.get("motorcycle") == "yes" else "jalan_kaki"
    if h in KAKI:
        return "motor" if h == "path" and (t.get("motorcycle") == "yes" or mv == "yes") else "jalan_kaki"
    if h == "track":
        tt = t.get("tracktype")
        if t.get("surface") in KERAS or tt in ("grade1", "grade2"):
            b = "mobil"
        elif tt in ("grade4", "grade5"):
            return "jalan_kaki"
        else:
            b = "motor"
    else:
        b = "mobil"
    if b == "mobil" and (t.get("motorcar") == "no" or t.get("motorcar") in TUTUP):
        return "motor" if t.get("motorcycle") not in TUTUP else "jalan_kaki"
    return b


def uji():
    m = moda_ruas
    assert m({"highway": "primary"}) == "mobil" and m({"highway": "tertiary_link"}) == "mobil" and m({"highway": "residential"}) == "mobil"
    assert m({"highway": "track", "tracktype": "grade1"}) == "mobil" and m({"highway": "track", "tracktype": "grade2"}) == "mobil"
    assert m({"highway": "track", "surface": "asphalt", "tracktype": "grade4"}) == "mobil", "surface keras menang"
    assert m({"highway": "track", "tracktype": "grade3"}) == "motor" and m({"highway": "track"}) == "motor"
    assert m({"highway": "track", "tracktype": "grade4"}) == "jalan_kaki" and m({"highway": "track", "tracktype": "grade5"}) == "jalan_kaki"
    assert m({"highway": "track", "surface": "dirt"}) == "motor"
    assert m({"highway": "path"}) == "jalan_kaki" and m({"highway": "footway"}) == "jalan_kaki" and m({"highway": "bridleway"}) == "jalan_kaki"
    assert m({"highway": "path", "motorcycle": "yes"}) == "motor"
    assert m({"highway": "secondary", "motor_vehicle": "no"}) == "jalan_kaki"
    assert m({"highway": "secondary", "motor_vehicle": "no", "motorcycle": "yes"}) == "motor"
    assert m({"highway": "service", "access": "private"}) == "jalan_kaki"
    assert m({"highway": "service", "access": "private", "motorcar": "yes"}) == "mobil"
    assert m({"highway": "service", "access": "no", "motorcycle": "yes"}) == "motor"
    assert m({"highway": "residential", "motorcar": "no"}) == "motor"
    assert m({"highway": "residential", "motorcar": "no", "motorcycle": "no"}) == "jalan_kaki"
    assert m({"waterway": "river"}) is None and m({"highway": "proposed"}) is None and m({}) is None
    assert set(filter(None, (m({"highway": h}) for h in MOBIL | KAKI | {"track"}))) <= set(MODA)
    print("uji moda: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else sys.exit(__doc__)
