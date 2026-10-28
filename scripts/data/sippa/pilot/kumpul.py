"""Kumpulkan data 5 lokasi pilot SIPPA Kalteng ke situs.json. Jaringan lewat curl."""
import json, math, subprocess, os, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../.."))
HERE = os.path.dirname(os.path.abspath(__file__))
# Renlap Generator (SP-140): RENLAP_OUT = folder kerja; RENLAP_KOMPLEKS = daftar kompleks. Tanpa env, perilaku pilot lama tidak berubah.
OUT = os.environ.get("RENLAP_OUT") or HERE
GENERIK = bool(os.environ.get("RENLAP_KOMPLEKS"))

SITUS = [
    dict(no=1, id="K0166", nama="Sabangau, Kota Palangka Raya", peran="PILOT UTAMA"),
    dict(no=2, id="K9321", nama="Jabiren Raya, Pulang Pisau", peran="UJI SELANG PANJANG"),
    dict(no=3, id="K7357", nama="Dadahup, Kapuas (eks-PLG)", peran="UJI AKSES PERAHU"),
    dict(no=4, id="K9037", nama="Bukit Batu, Kota Palangka Raya", peran="LATIHAN DAN CADANGAN"),
    dict(no=5, id="K2628", nama="Pulau Hanaut, Kotawaringin Timur", peran="SURVEI SAJA"),
    # selang panjang: pompa di air tepi jalan, api gambut 1,3-1,8 km masuk ke dalam (titik dipilih dari layar kandidat 26 Okt)
    dict(no=6, id="K1439", nama="", peran="SELANG PANJANG", paksa={"target": (-2.1788, 113.8156)}),
    dict(no=7, id="K0188", nama="", peran="SELANG PANJANG", paksa={"target": (-2.2751, 113.9907)}),
    dict(no=8, id="K0317", nama="", peran="SELANG PANJANG", paksa={"target": (-2.0572, 113.7789)}),
    dict(no=9, id="K1253", nama="", peran="SELANG PANJANG", paksa={"target": (-3.2962, 112.3673)}),
    dict(no=10, id="K0598", nama="", peran="SELANG PANJANG", paksa={"target": (-2.184, 113.8265)}),
]


def curl(url, out=None, data=None, t=180):
    cmd = ["curl", "-s", "-m", str(t), "--retry", "2"]
    if data:
        cmd += ["--data-urlencode", "data=" + data]
    cmd.append(url)
    r = subprocess.run(cmd, capture_output=True)
    if out:
        open(out, "wb").write(r.stdout)
    return r.stdout


def km(a, b):
    (la1, lo1), (la2, lo2) = a, b
    x = math.radians(lo2 - lo1) * math.cos(math.radians((la1 + la2) / 2))
    y = math.radians(la2 - la1)
    return 6371 * math.hypot(x, y)


def bbox(pts, pad_km):
    la = [p[0] for p in pts]; lo = [p[1] for p in pts]
    d_la = pad_km / 111.0; d_lo = pad_km / (111.0 * math.cos(math.radians(sum(la) / len(la))))
    return [min(la) - d_la, min(lo) - d_lo, max(la) + d_la, max(lo) + d_lo]


def main():
    kel = {k["id"]: k for k in json.load(open(f"{REPO}/data/sippa/keluaran/kelayakan_kompleks.json"))["kompleks"]}
    aks = {k["id"]: k for k in json.load(open(f"{REPO}/data/sippa/keluaran/akses_kompleks.json"))["kompleks"]}
    kl = json.load(open(f"{OUT}/live_kluster.json"))["features"]
    hs = json.load(open(f"{OUT}/live_hotspot72.json"))
    col = hs["kolom"]; baris = [dict(zip(col, b)) for b in hs["baris"]]
    fwi = json.load(open(f"{OUT}/live_fwi.json"))["grid"]
    hasil = []
    if GENERIK:
        import situs
        daftar = situs.bangun(situs.parse_ids(os.environ["RENLAP_KOMPLEKS"]), kel, aks)
    else:
        daftar = SITUS
    for s in daftar:
        k, a = kel[s["id"]], aks[s["id"]]
        pusat = (k["lat"], k["lon"])
        s.update(kel=k, akses=a)
        # kluster live dalam 5 km
        dekat = []
        for f in kl:
            p = f["properties"]
            d = km(pusat, (p["lat"], p["lon"]))
            if d <= 5:
                dekat.append({"d_km": round(d, 2), "geom": f["geometry"], **{x: p.get(x) for x in p if x != "api24"}, "api24": p.get("api24")})
        dekat.sort(key=lambda x: x["d_km"])
        s["kluster"] = dekat
        s["titik72"] = [dict(b, d_km=round(km(pusat, (b["lat"], b["lon"])), 2)) for b in baris if km(pusat, (b["lat"], b["lon"])) <= 5]
        s["hotspot_acuan"] = hs["acuan"]
        g = min(fwi, key=lambda c: km(pusat, (c["lat"], c["lon"])))
        s["fwi_sel"] = g
        # bbox peta detail: kompleks, air, ujung jalan, titik api 3 km
        pts = [pusat, (a["air"]["lat"], a["air"]["lon"])]
        if a.get("rute") and len(a["rute"]) >= 2:
            pts.append((a["rute"][-2][1], a["rute"][-2][0]))
        s["bbox_detail"] = bbox(pts, 1.0)
        rpts = [(y, x) for x, y in a.get("rute") or []] + [pusat]
        s["bbox_rute"] = bbox(rpts, 1.5)
        hasil.append(s)
        print(s["no"], s["id"], "kluster5km", len(dekat), "titik72", len(s["titik72"]), file=sys.stderr)
    json.dump(hasil, open(f"{OUT}/situs.json", "w"), ensure_ascii=False)


if __name__ == "__main__":
    main()
