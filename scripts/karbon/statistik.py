"""Statistik satelit per poligon, bentuk persis RANCANGAN §3.2.

Pakai:  python3 scripts/karbon/statistik.py <geojson-feature-atau-geometri>
        python3 scripts/karbon/statistik.py --uji          # offline, fixture Pangean
        python3 scripts/karbon/statistik.py --rekam         # rekam ulang fixture dari GFW (online)

Ambang tutupan adalah BIN, bukan kumulatif: baris ambang 30, 50, 75 = piksel tutupan 30–49, 50–74,
>= 75 %. Diverifikasi 22 Okt 2026 pada Pangean (hph-gfw-29245): Σ ha baris {30,50,75} =
50.195,53 ha = `SELECT SUM(area__ha) ... WHERE threshold >= 30` (50.195,53 ha). Jadi hutan = Σ
baris ambang >= 30. Piksel tutupan < 10 % tidak punya ambang (hilang dari GROUP BY), maka luas
diambil dari kueri `luas` tanpa GROUP BY.
"""
import datetime, json, os, sys

DI_SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DI_SINI)
from gfw import KONTRAK, kueri  # noqa: E402

AKAR = os.path.join(DI_SINI, "../..")
FIXTURE = os.path.join(AKAR, "tests/karbon/fixtures")
NAMA = [n for n in KONTRAK["kueri"] if n != "peringatan"]
AMBANG = KONTRAK["hutan_ambang_min"]
(TCL, TAHUN_AKHIR), = KONTRAK["tahun_data_akhir"].items()


def _ya(v):
    return v is True or v == 1 or str(v).lower() == "true"


def _ha(x):
    return round(x or 0, 2)


def _t(x):
    return round(x or 0)


def susun(r, tahun_akhir=TAHUN_AKHIR):
    """r = {nama_kueri: baris GFW} -> dict §3.2 (tanpa id)."""
    hutan = [b for b in r["tutupan"] if b["ambang"] >= AMBANG]
    tahun = [str(t) for t in range(2001, tahun_akhir + 1)]
    hilang = {t: {"ha": 0.0, "co2_t": 0.0, "ha_gambut": 0.0, "ha_primer": 0.0} for t in tahun}
    pend = {t: {} for t in tahun}
    for b in r["hilang"]:
        h = hilang.get(str(b["th"]))
        if h is None:
            continue
        h["ha"] += b["ha"] or 0
        h["co2_t"] += b["co2"] or 0
        if _ya(b["primer"]):
            h["ha_primer"] += b["ha"] or 0
    for b in r["hilang_gambut"]:
        if str(b["th"]) in hilang:
            hilang[str(b["th"])]["ha_gambut"] += b["ha"] or 0
    for b in r["hilang_pendorong"]:
        if str(b["th"]) in pend and b["pendorong"] is not None:
            p = pend[str(b["th"])].setdefault(str(b["pendorong"]), {"ha": 0.0, "co2_t": 0.0})
            p["ha"] += b["ha"] or 0
            p["co2_t"] += b["co2"] or 0
    for t, h in hilang.items():
        h.update(ha=_ha(h["ha"]), co2_t=_t(h["co2_t"]), ha_gambut=_ha(h["ha_gambut"]), ha_primer=_ha(h["ha_primer"]))
        p = {k: {"ha": _ha(v["ha"]), "co2_t": _t(v["co2_t"])} for k, v in sorted(pend[t].items()) if v["ha"] > 0}
        if p:
            h["pendorong"] = p
    api = {t: 0.0 for t in tahun}
    for b in r["hilang_api"]:
        if str(b["th"]) in api:
            api[str(b["th"])] += b["ha"] or 0

    def peta(baris, kunci):
        d = {}
        for b in baris:
            if b[kunci] is not None:
                d[str(b[kunci])] = d.get(str(b[kunci]), 0) + (b["ha"] or 0)
        return {k: _ha(v) for k, v in sorted(d.items())}

    return {
        "versi": {"tcl": TCL, "tcd": KONTRAK["kueri"]["tutupan"]["versi"]},
        "tahun_data_akhir": tahun_akhir,
        "diambil": datetime.date.today().isoformat(),
        "luas_ha": _ha(sum(b["ha"] or 0 for b in r["luas"])),
        "hutan2000_ha": _ha(sum(b["ha"] for b in hutan)),
        "primer_ha": _ha(sum(b["ha"] for b in hutan if _ya(b["primer"]))),  # primer DALAM hutan (ambang>=30)
        "gambut_ha": _ha(sum(b["ha"] for b in r["tutupan_gambut"])),
        "gambut_hutan_ha": _ha(sum(b["ha"] for b in r["tutupan_gambut"] if b["ambang"] >= AMBANG)),
        "stok_tC": {k: _t(sum(b[k] or 0 for b in hutan)) for k in ("atas", "bawah", "tanah")},
        "hilang": hilang,
        "hilang_api": {t: _ha(v) for t, v in api.items()},
        "tutupan2017": peta(r["tutupan2017"], "tutupan"),
        "kawasan": peta(r["kawasan"], "kawasan"),
        "pendorong": peta(r["pendorong"], "kategori"),
        "serapan_co2_t": _t(sum(b["serapan"] or 0 for b in r["serapan"])),
    }


def mentah(geom, tanya=kueri):
    return {n: tanya(n, geom) for n in NAMA}


def statistik(geom, tanya=kueri):
    return susun(mentah(geom, tanya))


def uji():
    r = json.load(open(os.path.join(FIXTURE, "pangean_gfw.json")))
    assert set(NAMA) <= set(r), set(NAMA) - set(r)
    s = susun(r)
    # hutan = Σ baris ambang>=30 (bin); stok juga hanya di dalam hutan
    assert s["hutan2000_ha"] == round(sum(b["ha"] for b in r["tutupan"] if b["ambang"] in (30, 50, 75)), 2)
    assert s["stok_tC"]["atas"] == round(sum(b["atas"] for b in r["tutupan"] if b["ambang"] >= 30))
    # Pangean (22 Okt 2026): luas 50.255 ha, hutan 50.196 ha, peat ±1.173 ha, AGC ±169 tC/ha
    assert 50_200 < s["luas_ha"] < 50_300 and 50_150 < s["hutan2000_ha"] < 50_250, (s["luas_ha"], s["hutan2000_ha"])
    assert 1_100 < s["gambut_ha"] < 1_250 and s["gambut_hutan_ha"] <= s["gambut_ha"]
    assert 150 < s["stok_tC"]["atas"] / s["hutan2000_ha"] < 190
    assert s["primer_ha"] <= s["hutan2000_ha"]
    # tiap tahun 2001..akhir ada, jumlah per tahun = jumlah baris mentah
    assert list(s["hilang"]) == [str(t) for t in range(2001, TAHUN_AKHIR + 1)]
    tot = sum(h["ha"] for h in s["hilang"].values())
    assert abs(tot - sum(b["ha"] for b in r["hilang"])) < 0.1 and 3_200 < tot < 3_350, tot  # 3.267,52 = direct WHERE ambang>=30 GROUP BY th (22 Okt)
    for t, h in s["hilang"].items():
        assert h["ha"] == round(sum(b["ha"] for b in r["hilang"] if str(b["th"]) == t), 2), t
        assert h["ha_primer"] <= h["ha"] + 0.01 and h["ha_gambut"] <= h["ha"] + 0.01
        assert sum(p["ha"] for p in h.get("pendorong", {}).values()) <= h["ha"] + 0.05, t
    pd = {}
    for h in s["hilang"].values():
        for k, p in h.get("pendorong", {}).items():
            pd[k] = pd.get(k, 0) + p["ha"]
    assert abs(pd["4"] - 3130.7) < 1 and abs(sum(pd.values()) - 3250) < 5, pd  # logging dominan
    assert 3_000 < s["pendorong"]["4"] < 3_200
    assert abs(sum(s["kawasan"].values()) - s["luas_ha"]) < 1 and abs(sum(s["tutupan2017"].values()) - s["luas_ha"]) < 1
    # tahun kosong diisi nol; baris tahun di luar jangkauan diabaikan
    k = {n: [] for n in NAMA}
    k["luas"] = [{"ha": 10}]
    k["hilang"] = [{"th": 2003, "primer": "true", "ha": 1.234, "co2": 99.6}, {"th": 2030, "primer": "false", "ha": 5, "co2": 1}]
    s2 = susun(k, 2005)
    assert s2["hilang"]["2001"] == {"ha": 0, "co2_t": 0, "ha_gambut": 0, "ha_primer": 0}
    assert s2["hilang"]["2003"] == {"ha": 1.23, "co2_t": 100, "ha_gambut": 0, "ha_primer": 1.23}, s2["hilang"]["2003"]
    assert list(s2["hilang"]) == ["2001", "2002", "2003", "2004", "2005"] and s2["hutan2000_ha"] == 0
    print("statistik ok")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    elif "--rekam" in sys.argv:
        f = json.load(open(os.path.join(FIXTURE, "pangean_konsesi.json")))
        with open(os.path.join(FIXTURE, "pangean_gfw.json"), "w") as o:
            json.dump(mentah(f["geometry"], lambda n, g: kueri(n, g, cache=None)), o, indent=0)
        uji()
    else:
        g = json.load(open(sys.argv[1]))
        print(json.dumps(statistik(g.get("geometry", g)), indent=1, ensure_ascii=False))
