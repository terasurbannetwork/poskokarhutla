"""Status banjir dan longsor per kecamatan, hari ini..+3 -> public/banjir/data/status.json + public/banjir/data/meta.json

Masukan per kecamatan (titik berat): sel hujan.json terdekat, bahaya.json (InaRISK), titik sungai.json terdekat <= 25 km.
Untuk hari d (0 = hari ini): H3 = jumlah prakiraan hujan 3 hari mulai hari d (d, d+1, d+2);
RK = kelas sungai dari debit kendali tertinggi di jendela yang sama terhadap Q2/Q5/Q20 titik itu;
A7 = hujan teramati 7 hari sebelum hari ini (tetap untuk keempat hari: ponytail, tidak digeser dengan prakiraan).
Level 0 Normal, 1 Waspada, 2 Siaga, 3 Awas; aturan pertama yang terpenuhi dari atas:

BANJIR                                              LONGSOR
  Awas    RK = 3, atau H3 >= 150 dan bahaya >= 0,66   Awas    H3 >= 150, A7 >= 150, bahaya longsor >= 0,66
  Siaga   RK = 2, atau H3 >= 100 dan bahaya >= 0,33   Siaga   H3 >= 100, A7 >= 150, bahaya >= 0,66;
  Waspada RK = 1, atau H3 >= 50                               atau H3 >= 150 dan bahaya >= 0,33
  Normal  selain itu                                  Waspada H3 >= 50 dan bahaya >= 0,33
                                                      Normal  selain itu
Bahaya = indeks InaRISK tertinggi yang dicuplik di kecamatan (lihat bahaya.py). Ambang hujan mengikuti kelas BMKG
(hujan sangat lebat >= 100 mm/hari, ekstrem >= 150 mm/hari) yang di sini diterapkan pada jumlah 3 hari, jadi konservatif
untuk hujan yang menyebar dan longgar untuk hujan sehari yang sangat lebat. Belum diuji balik terhadap kejadian BNPB.

status.json: {"hari": [4 tanggal], "kec": {"prov|kab|kec": {"b": [4 level], "l": [4 level], "h3": mm terbesar dari 4 jendela,
              "a7": mm, "sg": indeks titik sungai.json atau null}}}  -- hanya kecamatan dengan level > 0.
Pakai:  python3 scripts/data/status.py        |  python3 scripts/data/status.py uji
"""
import datetime as dt, math, os, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
from bahaya import kecamatan
from umum import KELUAR, WIB, baca, simpan
from wilayah import PROVINSI

STATUS = ["Normal", "Waspada", "Siaga", "Awas"]
HARI = 4
RADIUS_SUNGAI_KM = 25


def level_banjir(h3, bahaya, rk):
    if rk == 3 or (h3 >= 150 and bahaya >= 0.66):
        return 3
    if rk == 2 or (h3 >= 100 and bahaya >= 0.33):
        return 2
    if rk == 1 or h3 >= 50:
        return 1
    return 0


def level_longsor(h3, a7, bahaya):
    if h3 >= 150 and a7 >= 150 and bahaya >= 0.66:
        return 3
    if (h3 >= 100 and a7 >= 150 and bahaya >= 0.66) or (h3 >= 150 and bahaya >= 0.33):
        return 2
    if h3 >= 50 and bahaya >= 0.33:
        return 1
    return 0


def jendela(xs, mulai, n=3):
    return round(sum(x or 0 for x in xs[mulai:mulai + n]), 1)


def kelas_sungai(q, mulai, t):
    """Kelas dari debit kendali tertinggi q[mulai:mulai+3] terhadap ambang titik t; None bila tak ada ambang/data."""
    ada = [x for x in q[mulai:mulai + 3] if x is not None]
    if not ada or not t.get("q2"):
        return None
    p = max(ada)
    return 3 if p >= t["q20"] else 2 if p >= t["q5"] else 1 if p >= t["q2"] else 0


def km(la1, lo1, la2, lo2):
    x = math.radians(lo2 - lo1) * math.cos(math.radians((la1 + la2) / 2))
    return 6371 * math.hypot(x, math.radians(la2 - la1))


def main():
    hujan, sungai, bahaya = baca(os.path.join(KELUAR, "hujan.json")), baca(os.path.join(KELUAR, "sungai.json")), baca(os.path.join(KELUAR, "bahaya.json"))
    if not hujan:
        sys.exit("hujan.json belum ada")
    sel = hujan["sel"]
    i0 = hujan["hari"].index(hujan["hari_ini"])
    hari = hujan["hari"][i0:i0 + HARI]
    petak = {(math.floor(g["lat"] / sel), math.floor(g["lon"] / sel)): g for g in hujan["grid"]}
    titik = (sungai or {}).get("titik", [])
    j0 = sungai["hari"].index(hujan["hari_ini"]) if sungai and hujan["hari_ini"] in sungai["hari"] else 3
    bh = (bahaya or {}).get("kec", {})
    if not bh:
        print("PERINGATAN: bahaya.json kosong, indeks bahaya dianggap 0", file=sys.stderr)

    def sel_terdekat(la, lo):
        gy, gx = math.floor(la / sel), math.floor(lo / sel)
        if (gy, gx) in petak:
            return petak[(gy, gx)]
        dekat = [petak[k] for k in ((gy + a, gx + b) for a in (-1, 0, 1) for b in (-1, 0, 1)) if k in petak]
        return min(dekat or hujan["grid"], key=lambda g: (g["lat"] - la) ** 2 + (g["lon"] - lo) ** 2)

    out, hitung = {}, {"banjir": [Counter() for _ in range(HARI)], "longsor": [Counter() for _ in range(HARI)]}
    for k, c in kecamatan().items():
        g = sel_terdekat(c["lat"], c["lon"])
        b = bh.get(k, {})
        sg, jarak = None, RADIUS_SUNGAI_KM
        for i, t in enumerate(titik):
            if abs(t["lat"] - c["lat"]) < 0.25 and abs(t["lon"] - c["lon"]) < 0.25:
                d = km(c["lat"], c["lon"], t["lat"], t["lon"])
                if d <= jarak:
                    sg, jarak = i, d
        h3s = [jendela(g["h"], i0 + d) for d in range(HARI)]
        a7 = g["a7"] or 0
        lb = [level_banjir(h3s[d], b.get("banjir", 0), kelas_sungai(titik[sg]["q"], j0 + d, titik[sg]) if sg is not None else None)
              for d in range(HARI)]
        ll = [level_longsor(h3s[d], a7, b.get("longsor", 0)) for d in range(HARI)]
        for d in range(HARI):
            hitung["banjir"][d][lb[d]] += 1
            hitung["longsor"][d][ll[d]] += 1
        if max(lb) or max(ll):
            out[k] = {"b": lb, "l": ll, "h3": max(h3s), "a7": a7, "sg": sg}
    simpan(os.path.join(KELUAR, "status.json"), {"hari": hari, "kec": out})
    sekarang = dt.datetime.now(WIB)
    simpan(os.path.join(KELUAR, "meta.json"), {
        "dibuat": sekarang.isoformat(timespec="minutes"), "hari_wib": hujan["hari_ini"], "hari": hari,
        "provinsi": PROVINSI, "status": STATUS,
        "hitung": {z: [v[0][3], v[0][2], v[0][1]] for z, v in hitung.items()},  # hari ini: [awas, siaga, waspada]
        "hitung_harian": {z: [[c[3], c[2], c[1]] for c in v] for z, v in hitung.items()},
        "jumlah_kec": sum(hitung["banjir"][0].values()),
        "sumber": {"hujan": "Open-Meteo forecast (best match), kisi 0,25 derajat", "sungai": "GloFAS v4 via Open-Meteo Flood API",
                   "bahaya": "InaRISK BNPB", "kejadian": "BNPB data.bnpb.go.id"},
        "titik_sungai": len(titik), "titik_sungai_berambang": sum(1 for t in titik if t.get("q2"))})
    print(f"status.json: {len(out)} kec berstatus > 0 dari {sum(hitung['banjir'][0].values())}; hari ini banjir "
          f"{dict(hitung['banjir'][0])}, longsor {dict(hitung['longsor'][0])}", file=sys.stderr)


def uji():
    assert level_banjir(0, 0, 3) == 3 and level_banjir(0, 0, 2) == 2 and level_banjir(0, 0, 1) == 1
    assert level_banjir(150, 0.66, None) == 3
    assert level_banjir(150, 0.5, 0) == 2      # hujan ekstrem, bahaya sedang -> siaga
    assert level_banjir(100, 0.2, None) == 1   # bahaya rendah -> hanya waspada
    assert level_banjir(49.9, 1, None) == 0
    assert level_longsor(150, 150, 0.7) == 3
    assert level_longsor(150, 100, 0.7) == 2   # tanah belum jenuh -> bukan awas
    assert level_longsor(100, 150, 0.7) == 2 and level_longsor(100, 149, 0.7) == 1
    assert level_longsor(200, 300, 0.2) == 0   # di luar zona bahaya longsor
    assert jendela([1, None, 2, 50], 1) == 52
    t = {"q2": 100, "q5": 150, "q20": 200}
    assert kelas_sungai([0, 0, 90, 160, 120], 2, t) == 2 and kelas_sungai([None] * 5, 0, t) is None
    assert kelas_sungai([500], 0, {"q2": None}) is None
    assert abs(km(0, 0, 0, 1) - 111.19) < 0.1
    print("ok status")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
