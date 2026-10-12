"""Pembaruan harian: hotspot 7 hari, kompleks kebakaran (DBSCAN), FWI, data BNPB -> public/data/*.json

Pakai:  python3 scripts/data/harian.py
Butuh FIRMS_MAP_KEY (env atau .env). Open-Meteo dan BNPB tidak butuh kunci.
"""
import csv, datetime as dt, io, json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))
import fwi as F
from wilayah import AKAR, BNPB, PRIORITAS, PROVINSI, Wilayah

KELUAR = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
BBOX = "94,-11.5,141.5,6.5"
SENSOR = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "MODIS_NRT"]
HARI = 7

# DBSCAN: radius 1 km (resolusi VIIRS 375 m, titik satu front api berjarak < 1 km), minimal 5 titik dalam 72 jam
EPS_KM, MIN_PTS, JENDELA_JAM = 1.0, 5, 72
R_BUMI = 6371.0088

STATUS = ["Pencegahan rutin", "Patroli terpadu", "Siaga pemadaman awal", "Tanggap darurat"]


def kunci():
    if os.environ.get("FIRMS_MAP_KEY"):
        return os.environ["FIRMS_MAP_KEY"]
    for b in open(os.path.join(AKAR, ".env")):
        if b.startswith("FIRMS_MAP_KEY="):
            return b.split("=", 1)[1].strip()
    sys.exit("FIRMS_MAP_KEY tidak ada")


def ambil(url, coba=4, json_=False):
    for i in range(coba):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "poskokarhutla/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                teks = r.read().decode()
            return json.loads(teks) if json_ else teks
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{url.split('?')[0]}: {e}")
            time.sleep(10 * (i + 1))


# ---------------------------------------------------------------- hotspot
def hotspot(k, w):
    hari_ini = dt.datetime.now(dt.timezone.utc).date()
    tugas = []
    for s in SENSOR:  # API NRT maksimal 5 hari per panggilan
        tugas.append((s, f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{k}/{s}/{BBOX}/5/{hari_ini}"))
        tugas.append((s, f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{k}/{s}/{BBOX}/5/{hari_ini - dt.timedelta(days=5)}"))
    with ThreadPoolExecutor(4) as ex:
        teks = list(ex.map(lambda t: (t[0], ambil(t[1])), tugas))
    batas = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=HARI)
    titik, lihat = [], set()
    for sensor, isi in teks:
        for r in csv.DictReader(io.StringIO(isi)):
            conf = r.get("confidence", "")
            if sensor.startswith("MODIS"):
                if not conf.isdigit() or int(conf) < 30:
                    continue
            elif conf == "l":
                continue
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}:00+00:00")
            if t < batas:
                continue
            lat, lon = round(float(r["latitude"]), 4), round(float(r["longitude"]), 4)
            if (lat, lon, t, sensor) in lihat:
                continue
            lihat.add((lat, lon, t, sensor))
            adm = w.cari(lon, lat)
            if not adm:
                continue  # laut atau negara tetangga
            titik.append({
                "lat": lat, "lon": lon, "t": t, "s": {"VIIRS_SNPP_NRT": "N", "VIIRS_NOAA20_NRT": "N20",
                                                      "VIIRS_NOAA21_NRT": "N21", "MODIS_NRT": "M"}[sensor],
                "frp": round(float(r.get("frp") or 0), 1), "c": conf, "adm": adm,
            })
    titik.sort(key=lambda p: p["t"])
    return titik


# ---------------------------------------------------------------- DBSCAN Haversine
def haversine(a, b):
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp, dl = p2 - p1, math.radians(b["lon"] - a["lon"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R_BUMI * math.asin(math.sqrt(h))


def dbscan(pts, eps=EPS_KM, min_pts=MIN_PTS):
    """Label per titik: -1 noise, 0..n kluster. Indeks sel ~eps supaya tetangga cukup dicari di 3x3 sel."""
    sel = eps / 111.0
    grid = {}
    for i, p in enumerate(pts):
        grid.setdefault((math.floor(p["lon"] / sel), math.floor(p["lat"] / sel)), []).append(i)

    def tetangga(i):
        p = pts[i]
        gx, gy = math.floor(p["lon"] / sel), math.floor(p["lat"] / sel)
        return [j for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                for j in grid.get((gx + dx, gy + dy), ()) if haversine(p, pts[j]) <= eps]

    label, inti, k = [None] * len(pts), [False] * len(pts), -1
    for i in range(len(pts)):
        if label[i] is not None:
            continue
        nb = tetangga(i)
        if len(nb) < min_pts:
            label[i] = -1
            continue
        k += 1
        label[i], inti[i] = k, True
        antre = [j for j in nb if j != i]
        while antre:
            j = antre.pop()
            if label[j] == -1:
                label[j] = k  # titik tepi
            if label[j] is not None:
                continue
            label[j] = k
            nb2 = tetangga(j)
            if len(nb2) >= min_pts:
                inti[j] = True
                antre.extend(nb2)
    return label, inti


def lambung(xy):
    """Convex hull monotone chain."""
    xy = sorted(set(xy))
    if len(xy) < 3:
        return xy

    def silang(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    bawah, atas = [], []
    for p in xy:
        while len(bawah) >= 2 and silang(bawah[-2], bawah[-1], p) <= 0:
            bawah.pop()
        bawah.append(p)
    for p in reversed(xy):
        while len(atas) >= 2 and silang(atas[-2], atas[-1], p) <= 0:
            atas.pop()
        atas.append(p)
    return bawah[:-1] + atas[:-1]


def luas_km2(ring, lat0):
    kx, ky = 111.32 * math.cos(math.radians(lat0)), 110.57
    s = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        s += (x1 * kx) * (y2 * ky) - (x2 * kx) * (y1 * ky)
    return abs(s) / 2


# ---------------------------------------------------------------- FWI grid
def grid_darat(w, sel=0.5):
    titik = []
    lat = -11.25
    while lat <= 6.25:
        lon = 94.75
        while lon <= 141.25:
            adm = w.cari(lon, lat)
            if adm:
                titik.append((round(lat, 2), round(lon, 2), adm[0]))
            lon += sel
        lat += sel
    return titik


def cuaca_fwi(grid):
    """FWI harian per sel. Spin-up 92 hari lalu + 3 hari prakiraan; nilai jam 12 waktu setempat."""
    hasil = []
    for a in range(0, len(grid), 80):
        bagian = grid[a:a + 80]
        url = ("https://api.open-meteo.com/v1/forecast?latitude=" + ",".join(str(g[0]) for g in bagian)
               + "&longitude=" + ",".join(str(g[1]) for g in bagian)
               + "&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation"
               + "&past_days=92&forecast_days=4&timezone=auto")
        data = ambil(url, json_=True)
        data = data if isinstance(data, list) else [data]
        for g, d in zip(bagian, data):
            h = d["hourly"]
            hari = []
            for i, waktu in enumerate(h["time"]):
                if not waktu.endswith("T12:00") or i < 23:
                    continue
                hujan = sum(x or 0 for x in h["precipitation"][i - 23:i + 1])
                hari.append((waktu[:10], h["temperature_2m"][i], h["relative_humidity_2m"][i],
                             h["wind_speed_10m"][i], hujan, h["wind_direction_10m"][i]))
            hari = [x for x in hari if None not in x]
            seri = F.deret([(t, rh, ws, r) for _, t, rh, ws, r, _ in hari])
            hasil.append({"lat": g[0], "lon": g[1], "prov": g[2], "hari": [
                {"tgl": x[0], "t": x[1], "rh": x[2], "ws": x[3], "wd": x[5], "hujan": round(x[4], 1),
                 **{k: round(v, 1) for k, v in s.items()}}
                for x, s in zip(hari, seri)]})
        time.sleep(1)
    return hasil


def terdekat(grid, lat, lon):
    return min(grid, key=lambda g: (g["lat"] - lat) ** 2 + (g["lon"] - lon) ** 2)


# ---------------------------------------------------------------- utama
def main():
    os.makedirs(KELUAR, exist_ok=True)
    w = Wilayah()
    sekarang = dt.datetime.now(WIB)
    hari_ini = sekarang.date().isoformat()

    print("hotspot...", file=sys.stderr)
    titik = hotspot(kunci(), w)

    print("FWI...", file=sys.stderr)
    grid = cuaca_fwi(grid_darat(w))

    def fwi_hari(g, tgl):
        return next((h for h in g["hari"] if h["tgl"] == tgl), g["hari"][-1] if g["hari"] else None)

    print("DBSCAN...", file=sys.stderr)
    akhir = max((p["t"] for p in titik), default=dt.datetime.now(dt.timezone.utc))
    baru = [p for p in titik if p["t"] >= akhir - dt.timedelta(hours=JENDELA_JAM)]
    label, inti = dbscan(baru)
    kluster = {}
    for p, l, c in zip(baru, label, inti):
        if l >= 0:
            kluster.setdefault(l, []).append((p, c))

    fitur = []
    for l, isi in kluster.items():
        pts = [p for p, _ in isi]
        lat0 = sum(p["lat"] for p in pts) / len(pts)
        lon0 = sum(p["lon"] for p in pts) / len(pts)
        ring = lambung([(p["lon"], p["lat"]) for p in pts])
        n_inti = sum(1 for _, c in isi if c)
        g = terdekat(grid, lat0, lon0)
        h = fwi_hari(g, hari_ini) or {}
        nilai = h.get("fwi", 0)
        kf = F.kelas(nilai)
        ks = 1 if n_inti < 10 else 2 if n_inti < 50 else 3
        level = max(1, math.ceil((kf + ks) / 2))
        t24 = akhir - dt.timedelta(hours=24)
        n24 = sum(1 for p in pts if p["t"] >= t24)
        adm = w.cari(lon0, lat0) or max(((p["adm"]) for p in pts), key=[p["adm"] for p in pts].count)
        fitur.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [[list(map(lambda v: round(v, 4), x)) for x in ring + ring[:1]]]}
            if len(ring) >= 3 else {"type": "Point", "coordinates": [round(lon0, 4), round(lat0, 4)]},
            "properties": {
                "id": f"K{l + 1:03d}", "lat": round(lat0, 4), "lon": round(lon0, 4), "n": len(pts), "inti": n_inti,
                "n24": n24, "frp": round(sum(p["frp"] for p in pts), 1),
                "awal": min(p["t"] for p in pts).isoformat(), "akhir": max(p["t"] for p in pts).isoformat(),
                "luas": round(luas_km2(ring, lat0) * 100, 1) if len(ring) >= 3 else 0,  # hektare
                "prov": adm[0], "kab": adm[1], "kec": adm[2],
                "fwi": nilai, "dc": h.get("dc", 0), "isi": h.get("isi", 0), "bui": h.get("bui", 0),
                "ws": h.get("ws", 0), "wd": h.get("wd", 0), "rh": h.get("rh", 0), "t": h.get("t", 0),
                "level": level, "status": STATUS[level],
            }})
    fitur.sort(key=lambda f: (-f["properties"]["level"], -f["properties"]["n"]))
    for i, f in enumerate(fitur):
        f["properties"]["id"] = f"K{i + 1:03d}"

    # ringkasan per wilayah
    t24 = akhir - dt.timedelta(hours=24)
    rek = {}
    for p in titik:
        for kunci_ in (p["adm"][0], f"{p['adm'][0]}|{p['adm'][1]}", "|".join(p["adm"])):
            r = rek.setdefault(kunci_, {"h7": 0, "h24": 0, "frp": 0.0, "harian": {}})
            r["h7"] += 1
            r["frp"] += p["frp"]
            if p["t"] >= t24:
                r["h24"] += 1
            tgl = p["t"].astimezone(WIB).date().isoformat()
            r["harian"][tgl] = r["harian"].get(tgl, 0) + 1
    for f in fitur:
        q = f["properties"]
        for kunci_ in (q["prov"], f"{q['prov']}|{q['kab']}", f"{q['prov']}|{q['kab']}|{q['kec']}"):
            r = rek.setdefault(kunci_, {"h7": 0, "h24": 0, "frp": 0.0, "harian": {}})
            r["kluster"] = r.get("kluster", 0) + 1
            r["level"] = max(r.get("level", 0), q["level"])
    for kode in PROVINSI:
        sel = [g for g in grid if g["prov"] == kode]
        hh = [fwi_hari(g, hari_ini) for g in sel]
        hh = [h for h in hh if h]
        r = rek.setdefault(kode, {"h7": 0, "h24": 0, "frp": 0.0, "harian": {}})
        if hh:
            r["fwi_maks"] = max(h["fwi"] for h in hh)
            r["fwi_rata"] = round(sum(h["fwi"] for h in hh) / len(hh), 1)
            r["dc_maks"] = max(h["dc"] for h in hh)
    for r in rek.values():
        r["frp"] = round(r["frp"], 1)

    # BNPB
    try:
        bnpb = ambil(f"https://gis.bnpb.go.id/karhutla2026/karhutla-api.php?t={int(time.time())}", json_=True)
    except Exception as e:
        print("BNPB gagal:", e, file=sys.stderr)
        lama = os.path.join(KELUAR, "bnpb.json")
        bnpb = json.load(open(lama)) if os.path.exists(lama) else {"rows": [], "gagal": str(e)}

    # tulis
    def simpan(nama, isi):
        with open(os.path.join(KELUAR, nama), "w") as f:
            json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))

    simpan("hotspot.json", {
        "kolom": ["lat", "lon", "jam", "sensor", "frp", "prov", "kab", "kec"],
        "acuan": akhir.isoformat(),
        "baris": [[p["lat"], p["lon"], round((p["t"] - akhir).total_seconds() / 3600, 2), p["s"], p["frp"], *p["adm"]]
                  for p in titik]})
    simpan("kluster.json", {"type": "FeatureCollection", "features": fitur})
    simpan("fwi.json", {"sel": 0.5, "hari_ini": hari_ini, "grid": [
        {"lat": g["lat"], "lon": g["lon"], "prov": g["prov"], "hari": g["hari"][-8:]} for g in grid]})
    simpan("wilayah.json", rek)
    simpan("bnpb.json", bnpb)
    simpan("meta.json", {
        "dibuat": sekarang.isoformat(timespec="minutes"), "data_terakhir": akhir.isoformat(),
        "jumlah_titik": len(titik), "jumlah_kluster": len(fitur), "provinsi": PROVINSI, "prioritas": PRIORITAS,
        "bnpb": BNPB, "status": STATUS, "dbscan": {"eps_km": EPS_KM, "min_pts": MIN_PTS, "jendela_jam": JENDELA_JAM}})
    print(f"{len(titik)} titik, {len(fitur)} kluster, {len(grid)} sel FWI", file=sys.stderr)


if __name__ == "__main__":
    main()
