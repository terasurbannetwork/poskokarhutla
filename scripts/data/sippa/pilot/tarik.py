"""Tarik OSM (Overpass), PRIMS, Open-Meteo (cuaca + elevasi), ubin citra Esri per situs."""
import json, math, os, sys, time
from kumpul import curl, OUT

PRIMS = ["feg", "khg", "gwl", "infrastruktur_pembasahan_3r", "rencana_sumur_bor", "jaringan_kanal", "adm_desa", "sungai"]


def overpass(b, f):
    s, w, n, e = b
    q = f"""[out:json][timeout:120];(
way["highway"]({s},{w},{n},{e});
way["waterway"]({s},{w},{n},{e});
way["natural"="water"]({s},{w},{n},{e});
way["landuse"]({s},{w},{n},{e});
node["place"]({s-0.05},{w-0.05},{n+0.05},{e+0.05});
way["building"]({s},{w},{n},{e});
);out geom;"""
    for host in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]:
        curl(host, f, data=q, t=200)
        try:
            json.load(open(f)); return
        except Exception:
            time.sleep(5)
    print("overpass gagal", f, file=sys.stderr)


def prims(b, lap, f):
    s, w, n, e = b
    u = (f"https://prims.brgm.go.id/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=prims:{lap}"
         f"&outputFormat=application/json&bbox={w},{s},{e},{n}")
    curl(u, f, t=200)


def ubin(z, b, d):
    s, w, n, e = b
    def xy(la, lo):
        x = (lo + 180) / 360 * 2 ** z
        y = (1 - math.asinh(math.tan(math.radians(la))) / math.pi) / 2 * 2 ** z
        return x, y
    x0, y0 = xy(n, w); x1, y1 = xy(s, e)
    os.makedirs(d, exist_ok=True)
    n_ = 0
    for x in range(int(x0), int(x1) + 1):
        for y in range(int(y0), int(y1) + 1):
            p = f"{d}/{z}_{x}_{y}.jpg"
            if not os.path.exists(p) or os.path.getsize(p) < 500:
                curl(f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", p, t=60)
            n_ += 1
    return n_


def main():
    situs = json.load(open(f"{OUT}/situs.json"))
    for s in situs:
        k = s["id"]; d = f"{OUT}/raw/{k}"; os.makedirs(d, exist_ok=True)
        bd, br = s["bbox_detail"], s["bbox_rute"]
        if os.environ.get("OSM") and not os.path.exists(f"{d}/osm_detail.json"):
            overpass(bd, f"{d}/osm_detail.json"); time.sleep(20)
        if False:
            # rute: hanya jalan & sungai besar supaya ringan
            s_, w, n, e = br
            q = f"""[out:json][timeout:120];(way["highway"~"primary|secondary|tertiary|trunk|unclassified|residential|track"]({s_},{w},{n},{e});
way["waterway"~"river|canal"]({s_},{w},{n},{e});node["place"~"village|town|hamlet|city"]({s_},{w},{n},{e}););out geom;"""
            curl("https://overpass-api.de/api/interpreter", f"{d}/osm_rute.json", data=q, t=200)
        big = [min(bd[0], br[0]), min(bd[1], br[1]), max(bd[2], br[2]), max(bd[3], br[3])]
        for lap in PRIMS:
            f = f"{d}/prims_{lap}.json"
            if not os.path.exists(f) or os.path.getsize(f) < 50:
                prims(big if lap in ("gwl", "rencana_sumur_bor", "infrastruktur_pembasahan_3r", "adm_desa") else bd, lap, f)
        g = f"{OUT}/g_{k}.json"            # peta gambut 1:250.000 di sekitar kompleks (dibaca analisis.py)
        if not os.path.exists(g) or os.path.getsize(g) < 50:
            prims(big, "gambut_250k", g)
        la, lo = s["kel"]["lat"], s["kel"]["lon"]
        curl(f"https://api.open-meteo.com/v1/forecast?latitude={la}&longitude={lo}&daily=precipitation_sum,precipitation_probability_max,"
             f"wind_speed_10m_max,wind_direction_10m_dominant,temperature_2m_max,relative_humidity_2m_min&timezone=Asia%2FJakarta&forecast_days=7",
             f"{d}/cuaca.json")
        n1 = ubin(16, bd, f"{OUT}/ubin")
        n2 = ubin(13, br, f"{OUT}/ubin")
        print(k, "ubin", n1, n2, file=sys.stderr)


if __name__ == "__main__":
    main()
