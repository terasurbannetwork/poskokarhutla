"""METAR bandara rawan karhutla -> public/data/metar.json. stdlib only.
Sumber: aviationweather.gov/api/data/metar (publik, tanpa kunci; NOAA). Pembaruan ~30 menit (METAR/SPECI).
Bandara tanpa laporan 6 jam terakhir dilewati (WIJJ, WAGG, WAKK, WIKK, WIOK, WAGI/WAOI, WAOC, WIKT, WALR tak ada di feed)."""
import json, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/raw/metar"
# ICAO -> kode prov Kemendagri
P = {"WIBB":"14","WIJJ":"15","WIPP":"16","WIOO":"61","WIOK":"61","WAGG":"62","WAOI":"62","WAOC":"62","WAOO":"63",
     "WALL":"64","WALR":"65","WATT":"53","WAKK":"94","WIKK":"19","WIKT":"19","WAMM":"71","WAAA":"73","WIMM":"12",
     "WIEE":"13","WIDD":"21","WIDN":"21","WIPL":"17","WITT":"11","WAJJ":"91","WALS":"64"}
URL = "https://aviationweather.gov/api/data/metar?format=json&hours=6&ids=" + ",".join(P)

def main():
    RAW.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(URL, headers={"User-Agent": "poskokarhutla/1.0"})
    b = urllib.request.urlopen(req, timeout=30).read()
    (RAW / (time.strftime("%Y%m%dT%H%M%SZ", time.gmtime()) + ".json")).write_bytes(b)
    latest = {}
    for m in json.loads(b):  # tiap ICAO: laporan terbaru
        if m["icaoId"] not in latest or m["obsTime"] > latest[m["icaoId"]]["obsTime"]: latest[m["icaoId"]] = m
    out = []
    for k, m in sorted(latest.items()):
        v = m.get("visib")  # statute mile; "10+" bila >=10 SM
        vis = 9999 if isinstance(v, str) else (round(v * 1609.34 / 100) * 100 if v is not None else None)
        wx = m.get("wxString") or ""
        out.append({"icao": k, "nama": m["name"].split(",")[0], "lat": m["lat"], "lon": m["lon"], "prov": P[k],
                    "vis_m": vis, "wx": wx or None, "asap": any(c in wx.split() or any(t.lstrip("+-VC").startswith(c) for t in wx.split()) for c in ("FU", "HZ")),
                    "waktu": datetime.fromtimestamp(m["obsTime"], timezone.utc).isoformat().replace("+00:00", "Z"), "raw": m["rawOb"]})
    (ROOT / "public/data/metar.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(len(out), "bandara;", sum(o["asap"] for o in out), "FU/HZ;", sum((o["vis_m"] or 9999) < 5000 for o in out), "vis<5km")

if __name__ == "__main__":
    main()
