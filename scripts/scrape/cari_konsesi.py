"""Indeks cari ringkas -> public/data/cari.json: pabrik (pabrik_sawit.json) + konsesi bernama (lahan/konsesi.geojson).
Poligon TIDAK disalin: layar mengambilnya dari public/data/lahan/konsesi.geojson lewat properties.id (item.id sama persis).
Pabrik: id = id di pabrik_sawit.json. Item: t n g p k c[lon,lat 4dp, titik di dalam poligon] b[bbox|null] id (+ a = alias bila beda).

Pakai:  python3 scripts/scrape/cari_konsesi.py        # bangun + uji (jalankan setelah pabrik.py dan konsesi.py)
        python3 scripts/scrape/cari_konsesi.py --uji  # uji saja
"""
import datetime as dt, json, math, os, re, sys
from collections import Counter

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
PABRIK = os.path.join(AKAR, "public/data/pabrik_sawit.json")
KONSESI = os.path.join(AKAR, "public/data/lahan/konsesi.geojson")
KELUAR = os.path.join(AKAR, "public/data/cari.json")
sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))


def nrm(n):
    """Kunci pencocokan persis (bukan tampilan): buang PT/Tbk/titik, spasi rapi, huruf kecil. Tanpa fuzzy."""
    n = re.sub(r"\b(pt|tbk)\b", " ", (n or "").lower().replace(".", " ").replace(",", " "))
    return " ".join(n.split())


def persen(item):
    c, g = Counter(x["t"] for x in item), Counter(x["t"] for x in item if x["g"])
    return {t: f"{100 * g[t] // c[t]}%" for t in c}


def bangun():
    from konsesi import titik_wakil  # noqa: E402
    item = []
    pb = json.load(open(PABRIK))
    for m in pb["pabrik"]:
        a = m["perusahaan"] if m["perusahaan"] and m["perusahaan"] != m["nama"] else None
        i = {"t": "pabrik", "n": m["nama"], "g": m["grup"], "p": m["prov"], "k": m["kab"], "c": [round(m["lon"], 4), round(m["lat"], 4)], "b": None, "id": m["id"]}
        if a:
            i["a"] = a
        item.append(i)
    ko = json.load(open(KONSESI))
    for f in ko["features"]:
        p, g = f["properties"], f["geometry"]
        if not p.get("nama") or not g:
            continue
        cx, cy = titik_wakil(g)
        xs = [q[0] for po in g["coordinates"] for q in po[0]]
        ys = [q[1] for po in g["coordinates"] for q in po[0]]
        item.append({"t": p["jenis"], "n": p["nama"], "g": p.get("grup") or None, "p": p["prov"], "k": p["kab"],
                     "c": [round(cx, 4), round(cy, 4)], "b": [math.floor(min(xs) * 100) / 100, math.floor(min(ys) * 100) / 100, math.ceil(max(xs) * 100) / 100, math.ceil(max(ys) * 100) / 100], "id": p["id"]})
    print("grup terisi sebelum:", persen(item))
    # 1) perusahaan pabrik Trase yang persis sama; 2) HTI Trase sudah membawa grup. (WALHI dicabut: 4 tautan, 24 konflik, satu meragukan.)
    pabrik = {}
    for m in pb["pabrik"]:
        if m["perusahaan"] and m["grup"]:
            pabrik.setdefault(nrm(m["perusahaan"]), set()).add(m["grup"])
    for x in item:
        if x["t"] == "pabrik":
            continue
        k = nrm(x["n"])
        tr = next(iter(pabrik[k])) if len(pabrik.get(k, ())) == 1 else None
        if tr is None and x["t"] == "hti" and x["g"]:
            tr = x["g"]
        if tr:
            x["g"], x["gs"] = tr, "trase"
    print("grup terisi sesudah:", persen(item))
    sumber = {"pabrik": pb["sumber"] + " (" + pb["lisensi"] + ")", **ko["sumber"]}
    out = {"sumber": sumber, "dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "item": item}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))


def uji():
    d = json.load(open(KELUAR))
    it = d["item"]
    for x in it:
        assert x.get("t") and x.get("n") and x.get("c") and len(x["c"]) == 2, f"item tak lengkap: {x}"
        assert 94 <= x["c"][0] <= 142 and -12 <= x["c"][1] <= 7, f"pusat di luar Indonesia: {x}"
    kunci = [(x["t"], x["id"]) for x in it]
    assert len(kunci) == len(set(kunci)), "id ganda dalam satu jenis"
    n = Counter(x["t"] for x in it)
    print(f"lolos: {len(it)} item {dict(n)}, {os.path.getsize(KELUAR)//1024} KB")


if __name__ == "__main__":
    if "--uji" not in sys.argv:
        bangun()
    uji()
