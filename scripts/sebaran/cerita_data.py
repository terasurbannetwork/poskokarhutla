"""Data ringkas untuk cerita "Dari mana mulai, ke mana menyebar" -> public/data/sebaran_cerita.json

  musim26  sel 0,05 derajat 9 provinsi + lainnya: [ix, iy, hari pertama terbakar 2026 (0 = 1 Jan), jumlah titik VIIRS]
  replay   peristiwa terbesar 2026 (12) dan contoh 2015/2019/2023: titik awal, sel baru per hari kebakaran, panah harian
  kab      kabupaten dengan peristiwa besar (>= 1.000 ha) terbanyak 2015-2026 dan titik awalnya
  angka    angka kunci dari hasil.json, pendorong.json, sebaran_kasus.json (supaya cerita tidak memuat berkas besar)

Pakai:  python3 scripts/sebaran/cerita_data.py   |  ... uji
"""
import datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import MENTAH, PUBLIK, PROVINSI, PRIORITAS, Prov, muat_viirs, pusat, T0, tgl_hari  # noqa: E402

G = 0.05
X0, Y1 = 94.0, 7.0


def gsel(lon, lat):
    return int((lon - X0) / G), int((Y1 - lat) / G)


def replay(e, prov):
    w = prov.lengkap(e["lon0"], e["lat0"])
    hari = []
    for h, baru, a, jauh, laju in e["hari"]:
        hari.append({"tgl": tgl_hari(h), "sel": baru, "arah": a, "jauh": jauh})
    return {"id": e["id"], "prov": e["prov"], "kab": w[1] if w else None, "kec": w[2] if w else None, "t0": e["t0"], "lon0": e["lon0"], "lat0": e["lat0"],
            "ha": e["ha"], "hari": hari}


def main():
    prov = Prov()
    v = muat_viirs()
    awal26 = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)
    m26 = int((awal26 - T0).total_seconds() // 60)
    sel = {}
    for t, la, lo in zip(v["t"], v["lat"], v["lon"]):
        if t < m26:
            continue
        k = gsel(lo, la)
        d = (t + lo * 4 - m26) // 1440
        s = sel.get(k)
        if s is None:
            sel[k] = [d, 1]
        else:
            s[0] = min(s[0], d)
            s[1] += 1
    musim = sorted([ix, iy, int(d), n] for (ix, iy), (d, n) in sel.items() if n >= 2)

    besar26, contoh, kab = [], {}, {}
    for l in open(os.path.join(MENTAH, "peristiwa.jsonl")):
        if '"ha":' not in l:
            continue
        e = json.loads(l)
        if e["ha"] < 1000 or e["prov"] not in PROVINSI:
            continue
        th = e["t0"][:4]
        w = prov.lengkap(e["lon0"], e["lat0"])
        if w:
            k = (e["prov"], w[1])
            b = kab.setdefault(k, {"prov": e["prov"], "kab": w[1], "n": 0, "ha": 0, "titik": []})
            b["n"] += 1
            b["ha"] += e["ha"]
            if len(b["titik"]) < 40:
                b["titik"].append([round(e["lon0"], 3), round(e["lat0"], 3), int(th), e["ha"]])
        if e["prov"] not in PRIORITAS:
            continue
        if th == "2026":
            besar26.append(e)
        elif th in ("2015", "2019", "2023") and (th not in contoh or e["ha"] > contoh[th]["ha"]):
            contoh[th] = e
    besar26.sort(key=lambda e: -e["ha"])
    pilih, prov_ada = [], set()
    for e in besar26:  # satu-dua per provinsi supaya cerita tidak didominasi satu tempat
        if sum(1 for x in pilih if x["prov"] == e["prov"]) < 2:
            pilih.append(e)
        if len(pilih) >= 12:
            break
    rp = [replay(e, prov) for e in pilih] + [replay(e, prov) for e in contoh.values()]
    kab_top = sorted(kab.values(), key=lambda b: -b["n"])[:20]

    angka = {}
    H = json.load(open(os.path.join(MENTAH, "hasil.json"))) if os.path.exists(os.path.join(MENTAH, "hasil.json")) else {}
    if H.get("uji"):
        U = H["uji"]
        angka["uji"] = {nm: {h: U["model"][nm][h]["semua"] for h in ("24", "48", "72")} for nm in U["model"] if U["model"][nm]["24"]["semua"]}
        angka["uji_tumbuh"] = {nm: {h: U["model"][nm][h]["tumbuh"] for h in ("24", "72")} for nm in U["model"] if U["model"][nm]["24"]["tumbuh"]}
        angka["arah"] = U["arah"]
        angka["lepas"] = U["lepas"]
        angka["reliabilitas"] = {nm: U["reliabilitas"][nm]["bins"] for nm in U["reliabilitas"]}
        angka["ablasi"] = H.get("ablasi")
        angka["hibrida"] = H["hibrida_grid"][0]
        angka["tau"] = H["tau"]
        angka["fitur_akhir"] = H.get("fitur_akhir")
    P = os.path.join(MENTAH, "pendorong.json")
    if os.path.exists(P):
        D = json.load(open(P))
        angka["pendorong"] = {k: D[k] for k in ("n_peristiwa", "n_lolos", "laju_dasar", "definisi_lolos", "kelas", "logistik", "gbdt", "ketergantungan_parsial", "arah")}
    json.dump({"dibuat": dt.date.today().isoformat(), "grid": {"x0": X0, "y1": Y1, "sel": G}, "musim26": musim, "replay": rp, "kab": kab_top, "angka": angka},
              open(os.path.join(PUBLIK, "sebaran_cerita.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"musim26 {len(musim)} sel, replay {len(rp)}, kab {len(kab_top)}", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert gsel(94.01, 6.99) == (0, 0) and gsel(141.0, -11.0) == (940, 360)
        print("ok")
    else:
        main()
